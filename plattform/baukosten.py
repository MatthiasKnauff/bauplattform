"""Baukosten der Bauplattform (eigener Container wie die Adressen, Port 8094).

Kostenermittlung nach DIN 276 aus Plänen (PDF) und dem Bauzeitenplan:
- Pläne hochladen → Raumstempel (Nummer, Name, m²) werden aus Vektor-PDFs exakt gelesen, Raumtyp wird vorgeschlagen
- Kosten = Fläche × Kennwert je Raumtyp, verteilt auf KG 300/400, dazu eigene Positionen (KG 200, 394, 500 …) und KG 700
- Mittelabfluss: Kosten über die Termine des verknüpften Bauzeitenplans verteilt, mit Baupreisindex
- Prüfung: feste Regeln (Intern) und – je nach KI-Auswahl in der Kopfleiste – Hinweise der KI

/api/bk                     Liste (GET), neu (POST)
/api/bk/<id>                lesen, speichern (PUT, mit Änderungszähler), löschen
/api/bk/<id>/files          Plan hochladen (POST, PDF) · /<fid> Datei · /<fid>/preview.png Vorschau · DELETE
/api/bk/<id>/flow           Mittelabfluss aus dem Bauzeitenplan
/api/bk/<id>/check          Plausibilitätsprüfung
/api/kennwerte              eigene Kennwerte je Raumtyp (für neue Kostenermittlungen)
"""
import io, json, re
from datetime import date, datetime, timedelta

from flask import Response, g, jsonify, redirect, request

from bpcore import ai, db, platform, sso
import common as C

app = C.make_app(__name__)
app.config["MAX_CONTENT_LENGTH"] = 60 * 1024 * 1024

# Raumtypen mit Beispiel-Kennwerten (€/m² Raumfläche, KG 300 + 400, netto). Beispielwerte – durch eigene ersetzen.
TYPES = [
    ("buero", "Büro / Besprechung", 1450, r"büro|buero|besprech|leitung|vorstand|buchhalt|sekretar|lehrer|empfang|schulung|seminar"),
    ("sanitaer", "Sanitär / Umkleiden", 2600, r"\bwc\b|^wc|bad\b|dusch|umkleide|sanitär|sanitaer|toilette"),
    ("aufenthalt", "Eingang / Aufenthalt", 1350, r"eingang|foyer|pause|aufenthalt|multifunk|caf[eé]|küche|kueche|teeküche|halle|warte"),
    ("verkehr", "Flur / Windfang / Treppe", 950, r"flur|windfang|treppe|^th$|diele|\bgang\b|aufzug|vorraum"),
    ("neben", "Lager / Technik / Archiv", 800, r"lager|putz|server|technik|archiv|material|abstell|hausanschluss|heizung|müll|muell"),
    ("tier", "Tierbereich", 3200, r"katze|hund|\btier|zwinger|quarant|auslauf|kleintier|stall|voliere"),
    ("sonst", "Sonstige Räume", 1300, r""),
]
STUFEN = ("rahmen", "schaetzung", "berechnung", "anschlag", "feststellung")
NUM = re.compile(r"^\d{1,2}\.\d{2}$")
AREA = re.compile(r"^(\d{1,4}[.,]\d{1,2})\s*m(?:²|2)$")


@app.before_request
def guard():
    p = request.path
    if p.startswith(("/static/", "/bp/")) or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base("baukosten") + "/")), 401
        return redirect(C.login_url(request.url))
    if not sso.has_app(u, "baukosten"):
        msg = "Für die Baukosten ist dein Konto nicht freigeschaltet."
        if p.startswith("/api/"):
            return jsonify(error=msg), 403
        return (f'{msg} <a href="{C.app_base("portal")}/">Zur Startseite</a>', 403, {"Content-Type": "text/html; charset=utf-8"})
    g.user = u


@app.get("/")
def index():
    return C.page("baukosten.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


# ---------------------------------------------------------------- Hilfen
def _now():
    return datetime.now().isoformat(timespec="seconds")


def _j(v, d):
    try:
        return json.loads(v) if isinstance(v, str) else (v if v is not None else d)
    except ValueError:
        return d


def _num(v, d=0.0, lo=None, hi=None):
    try:
        x = float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return d
    if x != x:   # NaN
        return d
    if lo is not None:
        x = max(lo, x)
    if hi is not None:
        x = min(hi, x)
    return x


def _s(v, n):
    return str(v if v is not None else "").strip()[:n]


def kennwerte(c):
    """Kennwerte je Raumtyp: eigene (Tabelle bk_store) vor den Beispielwerten."""
    r = c.execute("SELECT data FROM bk_store WHERE key='kennwerte'").fetchone()
    own = _j(r["data"], {}) if r else {}
    own = own if isinstance(own, dict) else {}
    return {k: {"label": lab, "kw": _num(own.get(k), kw, 0, 50000), "own": k in own} for k, lab, kw, _ in TYPES}


def guess_type(name):
    n = (name or "").lower().strip()
    for k, _, _, rx in TYPES:
        if rx and re.search(rx, n):
            return k
    return "sonst"


def default_data(c):
    kw = kennwerte(c)
    return {"rooms": [], "types": {k: {"label": v["label"], "kw": v["kw"]} for k, v in kw.items()},
            "kg": {"300": 70, "400": 30}, "nk": 20, "rate": 3,
            "items": [{"kg": "200", "name": "Vorbereitende Maßnahmen", "amount": None},
                      {"kg": "394", "name": "Rückbau (Abbruch im Bestand)", "amount": None},
                      {"kg": "500", "name": "Außenanlagen", "amount": None}],
            "shares": {}}


def clean_data(d, c):
    d = d if isinstance(d, dict) else {}
    base = default_data(c)
    types = {}
    src = d.get("types") if isinstance(d.get("types"), dict) else {}
    for k, v in base["types"].items():
        o = src.get(k) if isinstance(src.get(k), dict) else {}
        types[k] = {"label": v["label"], "kw": _num(o.get("kw"), v["kw"], 0, 50000)}
    rooms = []
    for r in (d.get("rooms") if isinstance(d.get("rooms"), list) else [])[:2000]:
        if not isinstance(r, dict):
            continue
        rooms.append({"id": _s(r.get("id"), 40) or f"r{len(rooms) + 1}", "nr": _s(r.get("nr"), 20), "name": _s(r.get("name"), 200),
                      "area": round(_num(r.get("area"), 0, 0, 1e6), 2), "typ": r.get("typ") if r.get("typ") in types else "sonst",
                      "ok": bool(r.get("ok")), "src": _s(r.get("src"), 40), "floor": _s(r.get("floor"), 40),
                      "pos": r.get("pos") if isinstance(r.get("pos"), list) and len(r["pos"]) == 2 else None})
    kg = d.get("kg") if isinstance(d.get("kg"), dict) else {}
    k300 = _num(kg.get("300"), 70, 0, 100)
    items = []
    for it in (d.get("items") if isinstance(d.get("items"), list) else base["items"])[:200]:
        if not isinstance(it, dict):
            continue
        amt = it.get("amount")
        items.append({"kg": _s(it.get("kg"), 10), "name": _s(it.get("name"), 200),
                      "amount": None if amt in (None, "") else round(_num(amt, 0, 0, 1e10), 2)})
    shares = {str(k): _num(v, 0, 0, 1e6) for k, v in list((d.get("shares") if isinstance(d.get("shares"), dict) else {}).items())[:5000] if re.fullmatch(r"\d{1,9}", str(k))}
    return {"rooms": rooms, "types": types, "kg": {"300": k300, "400": round(100 - k300, 2)},
            "nk": _num(d.get("nk"), 20, 0, 60), "rate": _num(d.get("rate"), 3, 0, 20), "items": items, "shares": shares}


def calc(d):
    """Kosten aus Raumbuch und Kennwerten (alle Beträge netto)."""
    by = {}
    for r in d["rooms"]:
        t = by.setdefault(r["typ"], {"area": 0.0, "n": 0})
        t["area"] += r["area"]; t["n"] += 1
    rows, bau = [], 0.0
    for k, t in d["types"].items():
        a = by.get(k, {"area": 0.0, "n": 0})
        s = a["area"] * t["kw"]; bau += s
        rows.append({"typ": k, "label": t["label"], "n": a["n"], "area": round(a["area"], 2), "kw": t["kw"], "sum": round(s, 2)})
    extra = sum(i["amount"] or 0 for i in d["items"] if i["kg"] not in ("700",))
    nk = (bau + extra) * d["nk"] / 100
    area = sum(r["area"] for r in d["rooms"])
    return {"types": rows, "bauwerk": round(bau, 2), "kg300": round(bau * d["kg"]["300"] / 100, 2), "kg400": round(bau * d["kg"]["400"] / 100, 2),
            "extra": round(extra, 2), "nk": round(nk, 2), "total": round(bau + extra + nk, 2), "area": round(area, 2),
            "kw": round(bau / area, 2) if area else 0}


def _row(c, i):
    return c.execute("SELECT * FROM bk_projects WHERE id=?", (i,)).fetchone()


def _out(c, r, full=True):
    o = {"id": r["id"], "name": r["name"], "project_id": r["project_id"], "gantt_id": r["gantt_id"], "stufe": r["stufe"],
         "rev": r["rev"], "updated": r["updated"], "updated_by": r["updated_by"], "archived": bool(r["archived"])}
    if r["project_id"]:
        p = c.execute("SELECT name, client, street, zip, city FROM projects WHERE id=?", (r["project_id"],)).fetchone()
        o["project"] = {"name": p["name"], "client": p["client"], "address": _addr(p)} if p else None
    if r["gantt_id"]:
        p = c.execute("SELECT name FROM gantt_projects WHERE id=?", (r["gantt_id"],)).fetchone()
        o["gantt"] = {"name": p["name"]} if p else None
    if full:
        d = clean_data(_j(r["data"], {}), c)
        o["data"] = d
        o["calc"] = calc(d)
        o["files"] = [{"id": f["id"], "name": f["name"], "size": f["size"], "created": f["created"], "meta": _j(f["meta"], {})}
                      for f in c.execute("SELECT id, name, size, created, meta FROM bk_files WHERE bk_id=? ORDER BY id", (r["id"],))]
    else:
        o["total"] = calc(clean_data(_j(r["data"], {}), c))["total"]
    return o


# ---------------------------------------------------------------- Kostenermittlungen
@app.get("/api/bk")
def bk_list():
    with db.tx() as c:
        return jsonify([_out(c, r, False) for r in c.execute("SELECT * FROM bk_projects ORDER BY archived, updated DESC, id DESC")])


@app.post("/api/bk")
def bk_new():
    b = request.get_json(silent=True) or {}
    name = _s(b.get("name"), 200)
    with db.tx() as c:
        pid = b.get("project_id") if isinstance(b.get("project_id"), int) else None
        if pid and not c.execute("SELECT 1 FROM projects WHERE id=?", (pid,)).fetchone():
            pid = None
        gid = _s(b.get("gantt_id"), 80) or None
        if gid and not c.execute("SELECT 1 FROM gantt_projects WHERE id=?", (gid,)).fetchone():
            gid = None
        if not name and pid:
            name = c.execute("SELECT name FROM projects WHERE id=?", (pid,)).fetchone()["name"]
        if not name:
            return jsonify(error="Bitte einen Namen eingeben."), 400
        now = _now()
        r = c.execute("INSERT INTO bk_projects(name, project_id, gantt_id, stufe, data, created, updated, updated_by) VALUES(?,?,?,?,?,?,?,?) RETURNING id",
                      (name, pid, gid, "schaetzung", json.dumps(default_data(c)), now, now, g.user["name"])).fetchone()
        out = _out(c, _row(c, r["id"]))
    C.audit(g.user["name"], "baukosten", "Kostenermittlung angelegt", name)
    return jsonify(out)


@app.route("/api/bk/<int:i>", methods=["GET", "PUT", "DELETE"])
def bk_one(i):
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        if request.method == "GET":
            return jsonify(_out(c, r))
        if request.method == "DELETE":
            c.execute("DELETE FROM bk_projects WHERE id=?", (i,))
            C.audit(g.user["name"], "baukosten", "Kostenermittlung gelöscht", r["name"])
            return jsonify(ok=True)
        b = request.get_json(silent=True) or {}
        c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", (f"bk:{i}",))
        r = _row(c, i)
        if isinstance(b.get("rev"), int) and b["rev"] != r["rev"] and not b.get("force"):
            return jsonify(error=f"Inzwischen von {r['updated_by'] or 'jemand anderem'} geändert.", conflict=True, by=r["updated_by"], rev=r["rev"]), 409
        sets, args = [], []
        if "name" in b and _s(b["name"], 200):
            sets.append("name=?"); args.append(_s(b["name"], 200))
        if "stufe" in b and b["stufe"] in STUFEN:
            sets.append("stufe=?"); args.append(b["stufe"])
        if "project_id" in b:
            pid = b["project_id"] if isinstance(b["project_id"], int) and c.execute("SELECT 1 FROM projects WHERE id=?", (b["project_id"],)).fetchone() else None
            sets.append("project_id=?"); args.append(pid)
        if "gantt_id" in b:
            gid = _s(b["gantt_id"], 80) or None
            if gid and not c.execute("SELECT 1 FROM gantt_projects WHERE id=?", (gid,)).fetchone():
                gid = None
            sets.append("gantt_id=?"); args.append(gid)
        if "archived" in b:
            sets.append("archived=?"); args.append(1 if b["archived"] else 0)
        if "data" in b:
            sets.append("data=?"); args.append(json.dumps(clean_data(b["data"], c)))
        if sets:
            c.execute(f"UPDATE bk_projects SET {', '.join(sets)}, rev=rev+1, updated=?, updated_by=? WHERE id=?", (*args, _now(), g.user["name"], i))
        return jsonify(_out(c, _row(c, i)))


def _addr(p):
    return ", ".join(x for x in (p["street"], " ".join(y for y in (p["zip"], p["city"]) if y)) if x)


@app.get("/api/sources")
def sources():
    """Projekte des Bautagebuchs und Bauzeitenpläne zum Verknüpfen."""
    with db.tx() as c:
        pr = [{"id": r["id"], "name": r["name"], "client": r["client"], "address": _addr(r), "archived": bool(r["archived"])}
              for r in c.execute("SELECT id, name, client, street, zip, city, archived FROM projects ORDER BY archived, name")]
        gp = [{"id": r["id"], "name": r["name"], "project_id": r["project_id"], "updated": r["updated"]}
              for r in c.execute("SELECT id, name, project_id, updated FROM gantt_projects ORDER BY updated DESC")]
    return jsonify(projects=pr, plans=gp)


@app.route("/api/kennwerte", methods=["GET", "PUT"])
def kennwerte_api():
    with db.tx() as c:
        if request.method == "PUT":
            b = request.get_json(silent=True) or {}
            own = {k: _num(b.get(k), 0, 0, 50000) for k, _, _, _ in TYPES if b.get(k) not in (None, "")}
            c.execute("INSERT INTO bk_store(key, data, updated, updated_by) VALUES('kennwerte',?,?,?) "
                      "ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated=excluded.updated, updated_by=excluded.updated_by",
                      (json.dumps(own), _now(), g.user["name"]))
            C.audit(g.user["name"], "baukosten", "Eigene Kennwerte gespeichert", f"{len(own)} Raumtypen")
        return jsonify(kennwerte(c))


# ---------------------------------------------------------------- Pläne (PDF)
def read_plan(data):
    """Raumstempel (Nummer, Name, Fläche) aus einem Vektor-PDF lesen, dazu Maßstab, Blattgröße und Planart."""
    import pdfplumber
    out = {"pages": [], "rooms": [], "scale": None, "kind": "", "vector": False}
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for pi, pg in enumerate(pdf.pages[:20]):
            W = pg.extract_words(x_tolerance=1.5, y_tolerance=2)
            text = " ".join(w["text"] for w in W)
            out["vector"] = out["vector"] or bool(W)
            m = re.search(r"M\s*1\s*:\s*(\d{1,4})", text)
            if m and not out["scale"]:
                out["scale"] = int(m.group(1))
            low = text.lower()
            kind = "Ansicht" if "ansicht" in low or re.search(r"\b(nord|süd|sued|ost|west)\b", low) and "grundriss" not in low else \
                   "Schnitt" if "schnitt" in low and "grundriss" not in low else "Grundriss" if "grundriss" in low else ""
            out["kind"] = out["kind"] or kind
            out["pages"].append({"w": round(pg.width, 1), "h": round(pg.height, 1), "mm": [round(pg.width * 25.4 / 72), round(pg.height * 25.4 / 72)], "kind": kind})

            def line_from(w0, h):
                same = sorted([w for w in W if abs(w["top"] - w0["top"]) < h * 0.35 and w["x0"] >= w0["x0"] - 0.5], key=lambda w: w["x0"])
                res, x1 = [], None
                for w in same:
                    if x1 is None:
                        if w is not w0:
                            continue
                    elif w["x0"] - x1 > h * 1.1:
                        break
                    res.append(w); x1 = w["x1"]
                return " ".join(w["text"] for w in res)

            for n in W:   # Raumstempel: Nummer, darunter linksbündig Name (1–2 Zeilen) und Fläche
                if not NUM.match(n["text"]):
                    continue
                h = max(4.0, n["bottom"] - n["top"])
                below = sorted([w for w in W if w is not n and abs(w["x0"] - n["x0"]) < max(2.5, h * 0.6) and 0 < w["top"] - n["bottom"] < h * 4.5],
                               key=lambda w: w["top"])
                name, area = [], None
                for w in below:
                    t = line_from(w, h)
                    a = AREA.match(t)
                    if a:
                        area = float(a.group(1).replace(",", "."))
                        break
                    if NUM.match(w["text"]) or len(name) >= 2:
                        break
                    name.append(t)
                if area is not None and name:
                    out["rooms"].append({"nr": n["text"], "name": " ".join(name), "area": area, "page": pi,
                                         "pos": [round(n["x0"] / pg.width, 4), round(n["top"] / pg.height, 4)]})
    return out


def preview_png(data, page=0, width=1400):
    import pdfplumber
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        pg = pdf.pages[min(page, len(pdf.pages) - 1)]
        img = pg.to_image(resolution=max(20, min(150, int(width / (pg.width / 72)))))
        buf = io.BytesIO()
        img.original.convert("RGB").save(buf, "PNG", optimize=True)
        return buf.getvalue()


@app.post("/api/bk/<int:i>/files")
def file_add(i):
    f = request.files.get("file")
    if not f:
        return jsonify(error="Keine Datei"), 400
    data = f.read()
    name = _s(f.filename, 200) or "Plan.pdf"
    if not data.startswith(b"%PDF"):
        return jsonify(error="Bitte eine PDF-Datei wählen (Plan aus dem CAD als PDF)."), 400
    try:
        meta = read_plan(data)
    except Exception as e:
        return jsonify(error="Die PDF-Datei konnte nicht gelesen werden: " + str(e).splitlines()[0][:150]), 400
    found = meta.pop("rooms")
    meta["found"] = len(found)
    meta["note"] = ("Vektor-PDF · " if meta["vector"] else "Kein Text im PDF (eingescannt?) – Räume bitte von Hand eintragen · ") + \
                   (f"Maßstab 1:{meta['scale']} erkannt" if meta["scale"] else "kein Maßstab erkannt") + \
                   (f" · {len(found)} Raumstempel gelesen" if found else " · keine Raumstempel (Ansicht/Schnitt?)")
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        fid = c.execute("INSERT INTO bk_files(bk_id, name, mime, size, data, meta, created, user_name) VALUES(?,?,?,?,?,?,?,?) RETURNING id",
                        (i, name, "application/pdf", len(data), data, json.dumps(meta), _now(), g.user["name"])).fetchone()["id"]
        d = clean_data(_j(r["data"], {}), c)
        have = {(x["nr"], x["name"]) for x in d["rooms"]}
        added = 0
        floor = re.sub(r"\.pdf$", "", name, flags=re.I)[:40]
        for k, x in enumerate(found):
            if (x["nr"], x["name"]) in have:
                continue
            d["rooms"].append({"id": f"f{fid}-{k}", "nr": x["nr"], "name": x["name"], "area": x["area"], "typ": guess_type(x["name"]),
                               "ok": False, "src": f"pdf:{fid}", "floor": floor, "pos": x["pos"]})
            added += 1
        c.execute("UPDATE bk_projects SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(clean_data(d, c)), _now(), g.user["name"], i))
        out = _out(c, _row(c, i))
    C.audit(g.user["name"], "baukosten", "Plan hochgeladen", f"{name} · {added} Räume übernommen · {r['name']}")
    return jsonify(added=added, found=len(found), note=meta["note"], bk=out)


@app.get("/api/bk/<int:i>/files/<int:fid>")
def file_get(i, fid):
    with db.tx() as c:
        f = c.execute("SELECT name, data FROM bk_files WHERE id=? AND bk_id=?", (fid, i)).fetchone()
    if not f:
        return jsonify(error="Nicht gefunden"), 404
    from urllib.parse import quote
    return Response(bytes(f["data"]), mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(f['name'])}"})


_prev = {}


@app.get("/api/bk/<int:i>/files/<int:fid>/preview.png")
def file_preview(i, fid):
    key = (i, fid)
    if key not in _prev:
        with db.tx() as c:
            f = c.execute("SELECT data FROM bk_files WHERE id=? AND bk_id=?", (fid, i)).fetchone()
        if not f:
            return jsonify(error="Nicht gefunden"), 404
        try:
            png = preview_png(bytes(f["data"]))
        except Exception as e:
            return jsonify(error="Vorschau nicht möglich: " + str(e)[:120]), 500
        if len(_prev) > 30:
            _prev.clear()
        _prev[key] = png
    return Response(_prev[key], mimetype="image/png", headers={"Cache-Control": "private, max-age=600"})


@app.delete("/api/bk/<int:i>/files/<int:fid>")
def file_del(i, fid):
    with db.tx() as c:
        f = c.execute("SELECT name FROM bk_files WHERE id=? AND bk_id=?", (fid, i)).fetchone()
        if not f:
            return jsonify(error="Nicht gefunden"), 404
        c.execute("DELETE FROM bk_files WHERE id=?", (fid,))
        r = _row(c, i)
        d = clean_data(_j(r["data"], {}), c)
        keep = request.args.get("keep") == "1"   # Räume aus dem Plan behalten?
        if not keep:
            d["rooms"] = [x for x in d["rooms"] if x["src"] != f"pdf:{fid}"]
        c.execute("UPDATE bk_projects SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(d), _now(), g.user["name"], i))
        out = _out(c, _row(c, i))
    _prev.pop((i, fid), None)
    C.audit(g.user["name"], "baukosten", "Plan entfernt", f["name"])
    return jsonify(out)


# ---------------------------------------------------------------- Mittelabfluss
def _d(s):
    return date.fromisoformat(s)


def flow(c, r, d, cal):
    """Kosten (KG 300+400 + eigene Positionen) über die Leistungen des Bauzeitenplans verteilen.
    Gewicht je Leistung: eigener Anteil (shares) oder ihre Dauer in Kalendertagen; je Monat anteilig nach Tagen."""
    if not r["gantt_id"]:
        return {"ok": False, "why": "Kein Bauzeitenplan verknüpft."}
    gp = c.execute("SELECT name, data FROM gantt_projects WHERE id=?", (r["gantt_id"],)).fetchone()
    if not gp:
        return {"ok": False, "why": "Der verknüpfte Bauzeitenplan wurde gelöscht."}
    pd = _j(gp["data"], {})
    sched = {x["uid"]: x for x in (pd.get("sched") or []) if isinstance(x, dict)}
    if not sched:
        return {"ok": False, "why": f"Für „{gp['name']}“ liegen noch keine berechneten Termine vor. Den Plan einmal im Bauzeitenplan öffnen und speichern."}
    tasks = []
    for t in pd.get("tasks") or []:
        s = sched.get(t.get("uid"))
        if not s or s.get("g") or not (t.get("dur") or 0) > 0:
            continue   # Gruppen und Meilensteine tragen keine Kosten
        try:
            a, b = _d(s["s"]), _d(s["f"])
        except ValueError:
            continue
        days = (b - a).days + 1
        w = d["shares"].get(str(t["uid"]))
        tasks.append({"uid": t["uid"], "name": t.get("name") or "", "gw": t.get("gw") or "", "s": s["s"], "f": s["f"], "days": days,
                      "w": w if w is not None else float(days), "own": w is not None})
    if not tasks:
        return {"ok": False, "why": "Der Bauzeitenplan hat noch keine Leistungen mit Dauer."}
    base = cal["bauwerk"] + cal["extra"]
    tw = sum(t["w"] for t in tasks) or 1
    start = min(_d(t["s"]) for t in tasks)
    months = {}
    for t in tasks:
        amt = base * t["w"] / tw
        t["amount"] = round(amt, 2); t["pct"] = round(t["w"] / tw * 100, 2)
        a, b = _d(t["s"]), _d(t["f"])
        per = amt / t["days"]
        x = a
        while x <= b:   # tageweise auf Monate verteilen
            nxt = (x.replace(day=1) + timedelta(days=32)).replace(day=1)
            end = min(b, nxt - timedelta(days=1))
            n = (end - x).days + 1
            ym = x.strftime("%Y-%m")
            months[ym] = months.get(ym, 0.0) + per * n
            x = end + timedelta(days=1)
    rate = d["rate"] / 100
    out, cum, cum_i = [], 0.0, 0.0
    for ym in sorted(months):
        v = months[ym]
        y, m = map(int, ym.split("-"))
        mid = date(y, m, 15)
        yrs = max(0.0, (mid - date.today()).days / 365.25)   # Preissteigerung ab heute bis zur Mitte des Monats
        vi = v * (1 + rate) ** yrs
        cum += v; cum_i += vi
        out.append({"ym": ym, "amount": round(v, 2), "idx": round(vi, 2), "cum": round(cum, 2), "cum_idx": round(cum_i, 2)})
    return {"ok": True, "plan": gp["name"], "start": start.isoformat(), "end": max(_d(t["f"]) for t in tasks).isoformat(), "base": round(base, 2),
            "months": out, "total_idx": round(cum_i, 2), "tasks": sorted(tasks, key=lambda t: t["s"])}


@app.get("/api/bk/<int:i>/flow")
def flow_api(i):
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        d = clean_data(_j(r["data"], {}), c)
        return jsonify(flow(c, r, d, calc(d)))


# ---------------------------------------------------------------- Prüfung
def rules(c, r, d, cal, files):
    H = []
    add = lambda lvl, title, text, src="Intern": H.append({"lvl": lvl, "title": title, "text": text, "src": src})
    seen = {}
    for x in d["rooms"]:
        if x["nr"]:
            seen.setdefault((x["floor"], x["nr"]), []).append(x)
    for (fl, nr), xs in seen.items():
        if len(xs) > 1:
            add("hoch", f"Raumnummer {nr} mehrfach vergeben", " und ".join(f"{x['name']} ({x['area']:.2f} m²)".replace(".", ",") for x in xs)
                + " tragen dieselbe Nummer. Bitte im Plan klären.")
    zero = [x for x in d["rooms"] if not x["area"]]
    if zero:
        add("hoch", f"{len(zero)} Räume ohne Fläche", ", ".join(x["name"] or x["nr"] for x in zero[:6]) + " – Fläche fehlt in der Summe.")
    open_ = [x for x in d["rooms"] if not x["ok"]]
    if open_:
        add("mittel", f"{len(open_)} Räume noch nicht bestätigt", "Aus dem Plan gelesene Räume bitte unter „Pläne & Mengen“ prüfen und bestätigen.")
    if not d["rooms"]:
        add("hoch", "Noch kein Raumbuch", "Grundriss als PDF hochladen oder Räume von Hand anlegen.")
    for t in cal["types"]:
        if t["area"] and not (300 <= t["kw"] <= 6000):
            add("mittel", f"Kennwert {t['label']} ungewöhnlich", f"{t['kw']:,.0f} €/m² liegt außerhalb von 300–6.000 €/m². Tippfehler?".replace(",", "."))
    for it in d["items"]:
        if it["amount"] is None:
            add("mittel" if it["kg"] == "394" else "info", f"KG {it['kg']} {it['name']} offen", "Noch kein Betrag eingetragen – die Summe ist dafür zu niedrig.")
    floors = {x["nr"].split(".")[0] for x in d["rooms"] if x["nr"]}
    if len(floors) == 1 and d["rooms"]:
        f = next(iter(floors))
        add("mittel", "Nur ein Geschoss im Raumbuch", f"Alle Raumnummern beginnen mit {f}. – fehlen Grundrisse weiterer Geschosse (OG, KG)?")
    kinds = {(_j(f["meta"], {}) or {}).get("kind") for f in files}
    if "Ansicht" in kinds:
        add("info", "Fassade aus Ansichten noch nicht bewertet", "Die Ansichten sind hochgeladen. Fassaden-, Fenster- und Dachflächen bitte als eigene Positionen ergänzen; Höhen stehen in Ansichten meist nicht als Zahl.")
    if not r["gantt_id"]:
        add("info", "Kein Bauzeitenplan verknüpft", "Ohne Bauzeitenplan kann der Mittelabfluss nicht berechnet werden.")
    if cal["area"] and cal["kw"] and not (800 <= cal["kw"] <= 4500):
        add("mittel", "Durchschnittlicher Kennwert auffällig", f"{cal['kw']:,.0f} € je m² Raumfläche (KG 300+400) – bitte mit Vergleichsprojekten abgleichen.".replace(",", "."))
    return H


CHECK_SYS = """Du bist erfahrener Kostenplaner (DIN 276) für Hochbau, Umbau und Sanierung in Deutschland.
Du prüfst eine Kostenermittlung auf Plausibilität: fehlende Kostengruppen, unpassende Kennwerte für die Raumnutzung,
Besonderheiten der Nutzung (z. B. Tierbereiche: Hygiene, Bodenabläufe, Lüftung), Risiken bei Umbau im Bestand.
Antworte ausschließlich mit einem JSON-Objekt: {"hinweise":[{"titel":"…","text":"…","stufe":"hoch|mittel|info"}]}
Höchstens 6 Hinweise, jeder Text höchstens 40 Wörter, sachlich, auf Deutsch. Wiederhole keine bereits genannten Hinweise."""


@app.post("/api/bk/<int:i>/check")
def check(i):
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        d = clean_data(_j(r["data"], {}), c)
        cal = calc(d)
        files = c.execute("SELECT name, meta FROM bk_files WHERE bk_id=?", (i,)).fetchall()
        H = rules(c, r, d, cal, files)
        ki = ai.choice_of(g.user)
        prov = {p["key"]: p for p in ai.providers(c)}
        note = ""
        if ki != "intern" and prov.get(ki, {}).get("ok"):
            summary = {
                "projekt": r["name"], "stufe": r["stufe"],
                "raumtypen": [{"typ": t["label"], "fläche_m2": t["area"], "kennwert_eur_m2": t["kw"], "summe": t["sum"]} for t in cal["types"] if t["area"]],
                "räume": [f"{x['nr']} {x['name']} {x['area']} m²" for x in d["rooms"][:120]],
                "positionen": [{"kg": it["kg"], "name": it["name"], "betrag": it["amount"]} for it in d["items"]],
                "kg_aufteilung_300_400": d["kg"], "nebenkosten_prozent": d["nk"],
                "pläne": [f["name"] for f in files], "bauzeitenplan_verknüpft": bool(r["gantt_id"]),
                "bereits_genannt": [h["title"] for h in H],
            }
            try:
                out = ai.ask_json(ki, CHECK_SYS, json.dumps(summary, ensure_ascii=False), 900, c)
                for h in (out.get("hinweise") or [])[:6]:
                    if isinstance(h, dict) and h.get("titel"):
                        lvl = h.get("stufe") if h.get("stufe") in ("hoch", "mittel", "info") else "info"
                        H.append({"lvl": lvl, "title": _s(h["titel"], 120), "text": _s(h.get("text"), 400), "src": "KI · " + prov[ki]["label"]})
            except ai.AIError as e:
                note = f"{prov[ki]['label']}: {e}"
        elif ki != "intern":
            note = f"{prov.get(ki, {}).get('label', ki)} ist nicht eingerichtet – geprüft wurde nur mit den festen Regeln."
    order = {"hoch": 0, "mittel": 1, "info": 2}
    H.sort(key=lambda h: order.get(h["lvl"], 3))
    return jsonify(hinweise=H, ki=ki, note=note)


C.wait_schema()
