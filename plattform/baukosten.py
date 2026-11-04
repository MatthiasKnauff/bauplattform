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
import io, json, re, time
from datetime import date, datetime, timedelta

from flask import Response, g, jsonify, redirect, request

from bpcore import ai, db, platform, sso, versionen
import common as C

app = C.make_app(__name__)
app.config["MAX_CONTENT_LENGTH"] = 60 * 1024 * 1024

from bpcore import kosten   # Raumtypen des Büros mit Kennwerten (⚙ Einstellungen in dieser App)
STUFEN = ("rahmen", "schaetzung", "berechnung", "voranschlag", "anschlag", "feststellung")   # DIN 276:2018-12, 3.4
STUFE_NAME = {"rahmen": "Kostenrahmen", "schaetzung": "Kostenschätzung", "berechnung": "Kostenberechnung", "voranschlag": "Kostenvoranschlag",
              "anschlag": "Kostenanschlag", "feststellung": "Kostenfeststellung"}
STUFE_EBENE = {"rahmen": 1, "schaetzung": 2, "berechnung": 3, "voranschlag": 3, "anschlag": 3, "feststellung": 3}   # Mindest-Gliederungstiefe
# DIN 276 (2018), 1. und 2. Ebene
DIN = {
    "100": "Grundstück", "200": "Vorbereitende Maßnahmen", "210": "Herrichten", "220": "Öffentliche Erschließung", "230": "Nichtöffentliche Erschließung",
    "240": "Ausgleichsmaßnahmen und -abgaben", "250": "Übergangsmaßnahmen",
    "300": "Bauwerk – Baukonstruktionen", "310": "Baugrube / Erdbau", "320": "Gründung, Unterbau", "330": "Außenwände / Vertikale Baukonstruktionen, außen",
    "340": "Innenwände / Vertikale Baukonstruktionen, innen", "350": "Decken / Horizontale Baukonstruktionen", "360": "Dächer", "370": "Infrastrukturanlagen",
    "380": "Baukonstruktive Einbauten", "390": "Sonstige Maßnahmen für Baukonstruktionen",
    "400": "Bauwerk – Technische Anlagen", "410": "Abwasser-, Wasser-, Gasanlagen", "420": "Wärmeversorgungsanlagen", "430": "Raumlufttechnische Anlagen",
    "440": "Elektrische Anlagen", "450": "Kommunikations-, sicherheits- und informationstechnische Anlagen", "460": "Förderanlagen",
    "470": "Nutzungsspezifische und verfahrenstechnische Anlagen", "480": "Gebäude- und Anlagenautomation", "490": "Sonstige Maßnahmen für technische Anlagen",
    "500": "Außenanlagen und Freiflächen", "600": "Ausstattung und Kunstwerke", "700": "Baunebenkosten", "800": "Finanzierung",
}
KG2 = [k for k in DIN if k[0] in "34" and k[1:] != "00"]   # 310 … 490: Aufteilung der Raumtyp-Kosten
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
    """Raumtypen des Büros: {key: {label, kw, beispiel}} – beispiel = vorgegebener Wert (None bei eigenen Typen)."""
    return {t["key"]: {"label": t["label"], "kw": t["kw"], "beispiel": t["beispiel"]} for t in kosten.catalog(c)}


def guess_type(name, c):
    return kosten.guess(name, kosten.catalog(c))


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
    for k, o in list(src.items())[:60]:   # Raumtypen nur dieses Projekts (oder inzwischen aus der Büroliste entfernt)
        if k not in types and isinstance(o, dict) and re.fullmatch(r"[a-z0-9_]{1,40}", str(k)) and _s(o.get("label"), 60):
            types[k] = {"label": _s(o.get("label"), 60), "kw": _num(o.get("kw"), 1300, 0, 50000), "eigen": True}
    rooms = []
    for r in (d.get("rooms") if isinstance(d.get("rooms"), list) else [])[:2000]:
        if not isinstance(r, dict):
            continue
        rooms.append({"id": _s(r.get("id"), 40) or f"r{len(rooms) + 1}", "nr": _s(r.get("nr"), 20), "name": _s(r.get("name"), 200),
                      "area": round(_num(r.get("area"), 0, 0, 1e6), 2), "typ": r.get("typ") if r.get("typ") in types else "sonst",
                      "ok": bool(r.get("ok")), "src": _s(r.get("src"), 40), "floor": _s(r.get("floor"), 40),
                      "pos": r.get("pos") if isinstance(r.get("pos"), list) and len(r["pos"]) == 2 else None,
                      "h": round(_num(r.get("h"), 0, 0, 20), 2) or None})
    kg = d.get("kg") if isinstance(d.get("kg"), dict) else {}
    k300 = _num(kg.get("300"), 70, 0, 100)
    items = []
    for it in (d.get("items") if isinstance(d.get("items"), list) else base["items"])[:200]:
        if not isinstance(it, dict):
            continue
        amt = it.get("amount")
        x = {"kg": _s(it.get("kg"), 10), "name": _s(it.get("name"), 200),
             "amount": None if amt in (None, "") else round(_num(amt, 0, 0, 1e10), 2)}
        e = it.get("est")
        if isinstance(e, dict) and x["amount"] is not None:   # Betrag ist eine Schätzung (mit Spanne und Quelle)
            x["est"] = {"src": _s(e.get("src"), 40), "low": round(_num(e.get("low"), 0, 0, 1e10), 2), "high": round(_num(e.get("high"), 0, 0, 1e10), 2),
                        "basis": _s(e.get("basis"), 300)}
        items.append(x)
    k2 = d.get("kg2") if isinstance(d.get("kg2"), dict) else {}
    kg2 = {k: _num(k2.get(k), 0, 0, 100) for k in KG2 if k2.get(k) not in (None, "")}
    shares = {str(k): _num(v, 0, 0, 1e6) for k, v in list((d.get("shares") if isinstance(d.get("shares"), dict) else {}).items())[:5000] if re.fullmatch(r"\d{1,9}", str(k))}
    return {"rooms": rooms, "types": types, "kg": {"300": k300, "400": round(100 - k300, 2)},
            "nk": _num(d.get("nk"), 20, 0, 60), "rate": _num(d.get("rate"), 3, 0, 20), "items": items, "shares": shares,
            "kg2": kg2, "notes": _s(d.get("notes"), 8000),
            "kostenstand": d["kostenstand"] if re.fullmatch(r"20\d\d-(0[1-9]|1[0-2])", str(d.get("kostenstand") or "")) else datetime.now().strftime("%Y-%m"),
            "risiko": _num(d.get("risiko"), 0, 0, 50), "risiko_text": _s(d.get("risiko_text"), 500),
            "bauteile": _clean_bt(d.get("bauteile")),
            "justage": _clean_ju(d.get("justage")),
            "hoehe_std": round(_num(d.get("hoehe_std"), 0, 0, 20), 2) or None,   # erste eingetragene Raumhöhe gilt für alle ohne eigene
            "hoehen": {str(k)[:8]: round(_num(v, 0, 0, 20), 2) for k, v in list((d.get("hoehen") if isinstance(d.get("hoehen"), dict) else {}).items())[:20] if _num(v, 0, 0, 20)}}


def _clean_ju(v):
    """Justage der Kennwerte: Regionalfaktor, Preisstand und wie Gruppen ohne Bauteile neben Bauteilen gerechnet werden."""
    v = v if isinstance(v, dict) else {}
    rest = v.get("rest") if v.get("rest") in ("kw", "angl", "eigen") else "kw"
    return {"region": round(_num(v.get("region"), 100, 30, 300), 1), "preis": round(_num(v.get("preis"), 100, 30, 400), 1),
            "rest": rest, "f": round(_num(v.get("f"), 1, 0.2, 5), 3)}


def _bt_betrag(b):
    return round((b.get("menge") or 0) * (b.get("ep") or 0), 2)


def _clean_bt(v):
    out = []
    for b in (v if isinstance(v, list) else [])[:1500]:
        if not isinstance(b, dict):
            continue
        out.append({"id": _s(b.get("id"), 40) or f"b{len(out) + 1}", "kg": re.sub(r"\D", "", str(b.get("kg") or ""))[:3], "name": _s(b.get("name"), 200),
                    "mat": _s(b.get("mat"), 200), "formel": _s(b.get("formel"), 200), "menge": round(_num(b.get("menge"), 0, 0, 1e7), 3),
                    "einheit": _s(b.get("einheit"), 10) or "m²", "ep": round(_num(b.get("ep"), 0, 0, 1e7), 2), "notiz": _s(b.get("notiz"), 500),
                    "src": _s(b.get("src"), 40), "geschoss": _s(b.get("geschoss"), 40)})
    return out


def calc(d):
    """Kosten aus Raumbuch und Kennwerten (alle Beträge netto).
    Justage: Kennwerte × Regionalfaktor × Preisstand.
    Gibt es Bauteile mit Menge und Einheitspreis (Kostenberechnung), ersetzen sie in ihrer Kostengruppe der 2. Ebene
    (z. B. 350 Decken) den Kennwert-Anteil. Die übrigen Gruppen bleiben beim Kennwert-Anteil – oder werden auf Wunsch
    mit dem Verhältnis Bauteile ÷ Kennwert-Anteil der bepreisten Gruppen angeglichen (bzw. mit einem eigenen Faktor)."""
    ju = d.get("justage") or _clean_ju(None)
    jf = ju["region"] / 100 * ju["preis"] / 100
    by = {}
    for r in d["rooms"]:
        t = by.setdefault(r["typ"], {"area": 0.0, "n": 0})
        t["area"] += r["area"]; t["n"] += 1
    rows, raw = [], 0.0
    for k, t in d["types"].items():
        a = by.get(k, {"area": 0.0, "n": 0})
        s = a["area"] * t["kw"]; raw += s
        rows.append({"typ": k, "label": t["label"], "n": a["n"], "area": round(a["area"], 2), "kw": t["kw"], "sum": round(s, 2)})
    bau = bau_kw = raw * jf
    k300, k400 = bau * d["kg"]["300"] / 100, bau * d["kg"]["400"] / 100
    kg2 = {}
    J = {"region": ju["region"], "preis": ju["preis"], "faktor": round(jf, 4), "rest": ju["rest"], "rest_f": 1.0, "k": None,
         "bt_wert": 0.0, "bt_kw": 0.0, "rest_kw": 0.0, "rest_wert": 0.0}
    bts = [b for b in d.get("bauteile") or [] if len(b.get("kg") or "") == 3 and b["kg"][0] in "34"]
    if bts:
        sums = {}
        for b in bts:
            k = b["kg"][:2] + "0"
            x = sums.setdefault(k, {"wert": 0.0, "n": 0}); x["wert"] += _bt_betrag(b); x["n"] += 1
        anteil = {}
        for main, base in (("3", k300), ("4", k400)):
            src = {k: v for k, v in (d["kg2"] or KG2_FAUST).items() if k[0] == main} or {k: v for k, v in KG2_FAUST.items() if k[0] == main}
            ssum = sum(src.values()) or 1
            for k in sorted(set(src) | {k for k in sums if k[0] == main}):
                anteil[k] = base * src.get(k, 0) / ssum
        J["bt_wert"] = sum(v["wert"] for v in sums.values())
        J["bt_kw"] = sum(anteil.get(k, 0) for k in sums)
        kk = J["bt_wert"] / J["bt_kw"] if J["bt_kw"] else None
        J["k"] = round(kk, 3) if kk else None
        J["rest_f"] = (kk or 1.0) if ju["rest"] == "angl" else ju["f"] if ju["rest"] == "eigen" else 1.0
        tot = {"3": 0.0, "4": 0.0}
        for k in sorted(anteil):
            if k in sums:
                kg2[k] = {"wert": round(sums[k]["wert"], 2), "quelle": "bauteile", "n": sums[k]["n"], "kennwert": round(anteil[k], 2)}
            else:
                kg2[k] = {"wert": round(anteil[k] * J["rest_f"], 2), "quelle": "kennwerte", "n": 0, "kennwert": round(anteil[k], 2)}
                J["rest_kw"] += anteil[k]; J["rest_wert"] += kg2[k]["wert"]
            tot[k[0]] += kg2[k]["wert"]
        k300, k400 = tot["3"], tot["4"]
        bau = k300 + k400
    J["rest_f"] = round(J["rest_f"], 4)
    for x in ("bt_wert", "bt_kw", "rest_kw", "rest_wert"):
        J[x] = round(J[x], 2)
    extra = sum(i["amount"] or 0 for i in d["items"] if i["kg"] not in ("700",))
    nk = (bau + extra) * d["nk"] / 100
    risk = (bau + extra + nk) * (d.get("risiko") or 0) / 100   # DIN 276: Kostenrisiken gesondert ausweisen
    area = sum(r["area"] for r in d["rooms"])
    return {"types": rows, "kw_summe": round(raw, 2), "bauwerk": round(bau, 2), "bauwerk_kw": round(bau_kw, 2), "kg300": round(k300, 2), "kg400": round(k400, 2),
            "kg2": kg2, "justage": J, "extra": round(extra, 2), "nk": round(nk, 2), "risiko": round(risk, 2), "total": round(bau + extra + nk + risk, 2), "area": round(area, 2),
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
        o["acc"] = genauigkeit(c, r, d, o["calc"], [f["meta"].get("kind", "") for f in o["files"]])
        o["quellen"] = quellen(c, r, d, o["calc"])
        o["kg2_std"] = KG2_FAUST
        o["mat"] = {k: {"name": n, "einheit": e, "opts": [{"n": a, "ep": b} for a, b in opts]} for k, (n, e, opts) in MAT.items()}
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
                      (name, pid, gid, b.get("stufe") if b.get("stufe") in STUFEN else "schaetzung", json.dumps(default_data(c)), now, now, g.user["name"])).fetchone()
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
            versionen.vor(c, f"bkp:{i}")
            c.execute(f"UPDATE bk_projects SET {', '.join(sets)}, rev=rev+1, updated=?, updated_by=? WHERE id=?", (*args, _now(), g.user["name"], i))
            versionen.nach(c, f"bkp:{i}", g.user["name"])
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


@app.get("/api/folders")
def folders():
    """Ordner auf dem Server (Ablage des Bautagebuchs), die zur Eingabe passen und noch kein Projekt sind."""
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify([])
    try:
        from urllib.parse import quote
        r = C.bt_api("GET", "/api/store/folders?q=" + quote(q))
        return jsonify(r if isinstance(r, list) else [])
    except RuntimeError:
        return jsonify([])   # Bautagebuch ohne Ablage oder ohne Recht: einfach keine Vorschläge


@app.post("/api/bautagebuch-projekt")
def bt_project():
    """Projekt im Bautagebuch anlegen (z. B. aus einem Ordner auf dem Server)."""
    name = " ".join(str((request.get_json(silent=True) or {}).get("name") or "").split())[:200]
    if not name:
        return jsonify(error="Name fehlt"), 400
    try:
        r = C.bt_api("POST", "/api/projects", {"name": name})
    except RuntimeError as e:
        return jsonify(error="Projekt im Bautagebuch konnte nicht angelegt werden: " + str(e)), 502
    C.audit(g.user["name"], "baukosten", "Bautagebuch-Projekt angelegt", name)
    return jsonify(id=r.get("id"), name=name)


@app.route("/api/kennwerte", methods=["GET", "PUT"])
def kennwerte_api():
    with db.tx() as c:
        if request.method == "PUT":
            b = request.get_json(silent=True) or {}
            if isinstance(b.get("raumtypen"), list):   # ganze Liste aus ⚙ Einstellungen
                cat = kosten.clean_catalog(b["raumtypen"])
                note = f"{len(cat)} Raumtypen"
            else:                                      # nur Kennwerte (Kosten → „als eigene Kennwerte speichern“)
                cat = [dict(t, kw=_num(b.get(t["key"]), t["kw"], 0, 50000)) for t in kosten.catalog(c)]
                note = "Kennwerte"
            versionen.vor(c, "bk:raumtypen")
            c.execute("INSERT INTO bk_store(key, data, updated, updated_by) VALUES('raumtypen',?,?,?) "
                      "ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated=excluded.updated, updated_by=excluded.updated_by",
                      (json.dumps([{k: t[k] for k in ("key", "label", "kw", "worte")} for t in cat], ensure_ascii=False), _now(), g.user["name"]))
            versionen.nach(c, "bk:raumtypen", g.user["name"])
            C.audit(g.user["name"], "baukosten", "Raumtypen gespeichert", note)
        return jsonify(raumtypen=kosten.catalog(c), standard=[{"key": k, "label": l, "kw": kw, "worte": w} for k, l, kw, w in kosten.TYPES])


# ---------------------------------------------------------------- Eigene Vergleichsobjekte und importierte Kennwerte
# Abgerechnete Projekte des Büros (am besten Kostenfeststellung) und Kennwerte aus Kostendatenbanken (BKI, sirAdos, DBD … als
# Excel/CSV-Export) bilden eine Vergleichsbasis: Mittelwert, Spanne und Anzahl je Raumtyp. So wird die App mit jedem Projekt genauer.
def _vg(c):
    r = c.execute("SELECT data FROM bk_store WHERE key='vergleich'").fetchone()
    v = _j(r["data"], []) if r else []
    return v if isinstance(v, list) else []


def _vg_put(c, lst):
    with versionen.aenderung(c, "bk:vergleich", g.user["name"]):
        c.execute("INSERT INTO bk_store(key, data, updated, updated_by) VALUES('vergleich',?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data, "
                  "updated=excluded.updated, updated_by=excluded.updated_by", (json.dumps(lst, ensure_ascii=False), _now(), g.user["name"]))


def _norm(s):
    return re.sub(r"[^a-z0-9äöüß]+", " ", (s or "").lower()).strip()


def vergleich_auswertung(lst):
    """Je Raumtyp (nach Bezeichnung): Mittelwert, kleinster und größter Wert, Anzahl Objekte (€/m² Raumfläche, KG 300+400 netto)."""
    by = {}
    for o in lst:
        for lab, kw in (o.get("types") or {}).items():
            if kw:
                by.setdefault(_norm(lab), {"label": lab, "werte": []})["werte"].append({"kw": kw, "obj": o.get("name"), "stand": o.get("kostenstand"), "art": o.get("art")})
    out = {}
    for k, x in by.items():
        w = [y["kw"] for y in x["werte"]]
        out[k] = {"label": x["label"], "n": len(w), "mittel": round(sum(w) / len(w), 2), "min": min(w), "max": max(w), "werte": x["werte"]}
    return out


@app.get("/api/vergleich")
def vergleich_list():
    with db.tx() as c:
        lst = _vg(c)
    return jsonify(objekte=lst, auswertung=vergleich_auswertung(lst))


@app.post("/api/bk/<int:i>/vergleich")
def vergleich_add(i):
    """Diese Kostenermittlung als Vergleichsobjekt speichern (Kennwerte nach Justage, Aufteilung auf die 2. Ebene)."""
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        d = clean_data(_j(r["data"], {}), c)
        cal = calc(d)
        if not cal["area"] or not cal["bauwerk"]:
            return jsonify(error="Es gibt noch keine Flächen und Kosten – erst das Raumbuch und die Kennwerte vervollständigen."), 400
        jf = cal["justage"]["faktor"]
        k = cal["bauwerk"] / (cal["bauwerk_kw"] or cal["bauwerk"]) if cal["bauwerk_kw"] else 1   # Bauteile haben die Kennwerte verändert
        types = {t["label"]: round(t["kw"] * jf * k, 2) for t in cal["types"] if t["area"]}
        kg2 = {kk: round(v["wert"] / cal["area"], 2) for kk, v in (cal["kg2"] or {}).items()}
        o = {"id": f"bk{i}", "art": "eigen", "name": r["name"], "stufe": STUFE_NAME.get(r["stufe"], r["stufe"]), "kostenstand": d.get("kostenstand"),
             "flaeche": cal["area"], "bauwerk": cal["bauwerk"], "kw": cal["kw"], "types": types, "kg2_m2": kg2, "region": cal["justage"]["region"],
             "am": _now(), "von": g.user["name"]}
        lst = [x for x in _vg(c) if x.get("id") != o["id"]] + [o]
        _vg_put(c, lst)
        C.audit(g.user["name"], "baukosten", "Vergleichsobjekt gespeichert", r["name"])
    return jsonify(objekte=lst, auswertung=vergleich_auswertung(lst), hinweis="" if r["stufe"] in ("anschlag", "feststellung") else
                   "Hinweis: Am aussagekräftigsten sind Kostenfeststellungen (abgerechnete Kosten). Später mit der Kostenfeststellung erneut speichern – der Eintrag wird dann ersetzt.")


@app.delete("/api/vergleich/<oid>")
def vergleich_del(oid):
    with db.tx() as c:
        lst = [x for x in _vg(c) if x.get("id") != oid]
        _vg_put(c, lst)
    return jsonify(objekte=lst, auswertung=vergleich_auswertung(lst))


@app.post("/api/vergleich/import")
def vergleich_import():
    """Kennwerte aus einer Kostendatenbank (Export als Excel oder CSV): Spalten Bezeichnung/Raumtyp und €/m² (weitere Spalten werden ignoriert)."""
    f = request.files.get("file")
    quelle = _s(request.form.get("quelle"), 80) or "Import"
    stand = request.form.get("stand") if re.fullmatch(r"20\d\d-(0[1-9]|1[0-2])", request.form.get("stand") or "") else datetime.now().strftime("%Y-%m")
    if not f:
        return jsonify(error="Bitte eine Excel- oder CSV-Datei wählen."), 400
    raw, rows = f.read(), []
    try:
        if f.filename.lower().endswith((".xlsx", ".xlsm")):
            import openpyxl
            ws = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True).active
            rows = [[("" if v is None else v) for v in r] for r in ws.iter_rows(values_only=True)]
        else:
            import csv
            txt = raw.decode("utf-8-sig", errors="replace")
            rows = list(csv.reader(io.StringIO(txt), delimiter=";" if txt.count(";") >= txt.count(",") else ","))
    except Exception as e:
        return jsonify(error=f"Datei nicht lesbar: {e}"), 400
    types = {}
    for r in rows:
        lab = next((str(x).strip() for x in r if isinstance(x, str) and re.search(r"[A-Za-zÄÖÜäöü]{2}", str(x))), "")
        nums = [x if isinstance(x, (int, float)) else _num(str(x).replace("€", "").replace(".", "").replace(" ", ""), None) for x in r
                if (isinstance(x, (int, float)) or re.fullmatch(r"\s*[\d. ]+(,\d+)?\s*€?\s*", str(x)))]
        nums = [n for n in nums if n and 100 <= n <= 20000]
        if lab and nums and len(lab) <= 80:
            types[lab] = round(float(nums[0]), 2)
    if not types:
        return jsonify(error="Keine Kennwerte gefunden. Erwartet: je Zeile eine Bezeichnung (z. B. „Büro“, „Wohnen“) und ein Kennwert in € je m² (100–20.000)."), 400
    with db.tx() as c:
        o = {"id": "imp" + datetime.now().strftime("%Y%m%d%H%M%S"), "art": "import", "name": quelle, "stufe": "Kostendatenbank", "kostenstand": stand,
             "types": types, "am": _now(), "von": g.user["name"]}
        lst = _vg(c) + [o]
        _vg_put(c, lst)
    return jsonify(objekte=lst, auswertung=vergleich_auswertung(lst), n=len(types))


# Kostenpflichtige Kostendatenbanken: Zugangsdaten (nur Administrator). Eine direkte Abfrage bieten die Anbieter nur Software-Partnern
# an; bis dahin werden die Kennwerte als Excel/CSV-Export importiert (siehe oben).
DIENSTE = [
    {"key": "bki", "name": "BKI Baukosteninformationszentrum", "info": "BKI Kostenplaner bzw. BKI KoRa (webbasiert, Jahresabo) und BKI Baukosten (Bücher/Datenbank)", "url": "https://www.bki.de"},
    {"key": "sirados", "name": "sirAdos Baudaten", "info": "Kostenplanung mit Baupreisen nach DIN 276 (Abo)", "url": "https://www.sirados.de"},
    {"key": "dbd", "name": "DBD KostenElemente (Dynamische BauDaten)", "info": "Kostenelemente nach DIN 276 mit regionalen Baupreisen (Lizenz)", "url": "https://www.dbd.de"},
]


@app.route("/api/dienste", methods=["GET", "PUT"])
def dienste():
    with db.tx() as c:
        r = c.execute("SELECT data FROM bk_store WHERE key='dienste'").fetchone()
        cur = _j(r["data"], {}) if r else {}
        if request.method == "PUT":
            if not g.user["is_admin"]:
                return jsonify(error="Die Zugänge trägt der Administrator ein."), 403
            b = request.get_json(silent=True) or {}
            for d_ in DIENSTE:
                x = b.get(d_["key"]) if isinstance(b.get(d_["key"]), dict) else None
                if x is None:
                    continue
                e = dict(cur.get(d_["key"]) or {})
                e["user"] = _s(x.get("user"), 120)
                for k in ("pass", "key"):
                    if x.get(k + "_clear"):
                        e.pop(k, None)
                    elif isinstance(x.get(k), str) and x[k].strip():
                        e[k] = x[k].strip()[:300]
                e["an"] = bool(x.get("an"))
                cur[d_["key"]] = e
            with versionen.aenderung(c, "bk:dienste", g.user["name"]):
                c.execute("INSERT INTO bk_store(key, data, updated, updated_by) VALUES('dienste',?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data, "
                          "updated=excluded.updated, updated_by=excluded.updated_by", (json.dumps(cur), _now(), g.user["name"]))
    return jsonify(admin=bool(g.user["is_admin"]), dienste=[{**d_, "user": (cur.get(d_["key"]) or {}).get("user", ""), "an": (cur.get(d_["key"]) or {}).get("an", False),
                                                          "pass_set": bool((cur.get(d_["key"]) or {}).get("pass")), "key_set": bool((cur.get(d_["key"]) or {}).get("key"))} for d_ in DIENSTE])


# ---------------------------------------------------------------- Pläne (PDF)
def read_plan(data):
    """Raumstempel (Nummer, Name, Fläche) aus einem Vektor-PDF lesen, dazu Maßstab, Blattgröße und Planart."""
    import pdfplumber
    out = {"pages": [], "rooms": [], "scale": None, "kind": "", "vector": False, "niveaus": []}
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
                                         "pos": [round(n["x0"] / pg.width, 4), round(n["top"] / pg.height, 4)], "_y": n["top"], "_x": n["x0"]})
            out["niveaus"] += _niveaus(W)
            _rooms_ohne_nummer(W, pg, pi, out["rooms"])
            _geschosse(W, [r for r in out["rooms"] if r["page"] == pi])
    for r in out["rooms"]:
        r.pop("_y", None); r.pop("_x", None)
    out["hoehen"] = geschosshoehen(out["niveaus"])
    if not out["niveaus"]:
        out.pop("niveaus")
    return out


def _hnote(meta):
    h = meta.get("hoehen") or {}
    if h:
        return " · Geschosshöhen: " + ", ".join(f"{k} {str(v).replace('.', ',')} m" for k, v in h.items())
    return " · keine Höhenkoten (z. B. „OKFF EG = +0,70“) gefunden" if meta.get("kind") == "Schnitt" else ""


# ---------------------------------------------------------------- Höhen aus Schnitten (Höhenkoten)
KOTE = re.compile(r"\b(OK\s?FF?B?|OKFF|OKRF|OK\s?RF|FFB|FOK|RFB|OKF|OKG|OKT|OKRD)\s*([A-Za-z]{1,3}|\d\.?\s?OG)?\s*[=:]\s*([+\-±]?\s?\d{1,2}[.,]\d{1,3})", re.I)
FLOORS = ["UG", "KG", "EG", "OG", "1.OG", "2.OG", "3.OG", "4.OG", "DG", "SG", "SB"]


def floor_key(name):
    """Geschoss-Kurzname aus einer Bezeichnung (Raumbuch: „Erdgeschoss“, Dateiname „KG+EG_40“, Kote „OKFF EG“)."""
    n = (name or "").lower()
    for k, rx in (("SB", r"spitzboden|\bsb\b"), ("DG", r"dach|\bdg\b"), ("SG", r"staffel|\bsg\b"), ("2.OG", r"2\.?\s*(og|ober)"), ("3.OG", r"3\.?\s*(og|ober)"),
                  ("OG", r"ober|\bog\b|1\.?\s*og"), ("EG", r"erd|\beg\b"), ("KG", r"keller|\bkg\b"), ("UG", r"unter|\bug\b|souterrain")):
        if re.search(rx, n):
            return k
    return ""


def _niveaus(W):
    """Höhenkoten wie „OKFF EG = +0.70“ aus den Wörtern einer Seite (Zeile für Zeile)."""
    lines = {}
    for w in W:
        lines.setdefault(round(w["top"] / 3), []).append(w)
    out = []
    for ws in lines.values():
        t = " ".join(w["text"] for w in sorted(ws, key=lambda w: w["x0"]))
        for m in KOTE.finditer(t):
            z = float(m.group(3).replace("±", "").replace(" ", "").replace(",", "."))
            out.append({"art": re.sub(r"\s", "", m.group(1)).upper(), "geschoss": (m.group(2) or "").upper().replace(" ", ""), "z": round(z, 3)})
    return out


def geschosshoehen(niv):
    """Geschosshöhe je Geschoss = Abstand der Fertigfußböden (OKFF) übereinander. {„EG“: 3.05, …}"""
    ff = {}
    for n in niv:
        if n["art"] in ("OKG", "OKT") or not n["geschoss"]:
            continue
        if "R" in n["art"] and any("R" not in x["art"] for x in niv if x["geschoss"]):
            continue   # Rohfußboden nur, wenn kein Fertigfußboden angegeben ist
        ff.setdefault(n["z"], n["geschoss"])
    lv = sorted(ff.items())
    names = []
    for z, g_ in reversed(lv):   # von oben nach unten: gleiche Bezeichnung zweimal (Tippfehler im Plan) → die untere ist das Geschoss darunter
        k = floor_key(g_) or g_
        if k in names and k in FLOORS and FLOORS.index(k) > 0:
            k = "KG" if k == "EG" else FLOORS[FLOORS.index(k) - 1]
        names.append(k)
    names.reverse()
    return {names[i]: round(lv[i + 1][0] - lv[i][0], 2) for i in range(len(lv) - 1) if 1.8 <= lv[i + 1][0] - lv[i][0] <= 8}


NUMW = re.compile(r"^(\d{1,4}[.,]\d{1,2})(?:\s*m(?:²|2)?)?$")
UNIT = re.compile(r"^(m²|m2|qm|m)$")
NRW = re.compile(r"^([A-Z]{0,2}\d{1,2}[.\-]?\d{0,3}|\d\.\d{2})$")
NOISE = re.compile(r"^(f|nf|ngf|wf|bgf|fläche|flaeche|a)[:=]?$|^[=:]$|^ca\.?$", re.I)
GESCHOSS = re.compile(r"^(keller|unter|erd|ober|dach|souterrain|spitzboden|\d\.?\s*ober|staffel)", re.I)


def _rooms_ohne_nummer(W, pg, pi, rooms):
    """Zweiter Durchgang für Pläne ohne Raumnummer: jede Flächenangabe (z. B. „10,70 m²“) mit dem Raumnamen darüber oder davor.
    Bereits über Raumstempel gelesene Räume werden nicht doppelt aufgenommen."""
    def h_of(w):
        return max(3.0, w["bottom"] - w["top"])

    def same_line(w, ws):
        h = h_of(w)
        return [x for x in ws if abs((x["top"] + x["bottom"]) / 2 - (w["top"] + w["bottom"]) / 2) < h * 0.6]

    for w in W:
        m = NUMW.match(w["text"])
        if not m:
            continue
        h = h_of(w)
        line = sorted(same_line(w, W), key=lambda x: x["x0"])
        has_unit = w["text"].lower().endswith(("m²", "m2"))
        if not has_unit:   # Einheit als eigenes Wort direkt dahinter („10,70“ „m²“, auch „m“ „2“ hochgestellt)
            nxt = [x for x in W if 0 <= x["x0"] - w["x1"] < h * 1.6 and abs(x["top"] - w["top"]) < h * 0.9 and UNIT.match(x["text"].lower())]
            has_unit = bool(nxt)
        if not has_unit:
            continue
        area = float(m.group(1).replace(",", "."))
        if not (0.5 <= area <= 5000):
            continue
        if any(abs(r.get("area", 0) - area) < 0.005 and abs(r.get("_y", -1e9) - w["top"]) < h * 6 and abs(r.get("_x", -1e9) - w["x0"]) < h * 12 for r in rooms):
            continue   # schon als Raumstempel mit Nummer erkannt
        # 1) Name in derselben Zeile davor („Küche 12,46 m²“)
        left, x1 = [], w["x0"]
        for x in reversed([x for x in line if x["x1"] <= w["x0"] + 0.5]):
            if x1 - x["x1"] > h * 1.8:
                break
            left.insert(0, x); x1 = x["x0"]
        name = " ".join(x["text"] for x in left if not NOISE.match(x["text"]))
        anchor = left[0] if left else w
        # 2) sonst die Zeile direkt darüber, die waagerecht über der Fläche liegt
        if not re.search(r"[A-Za-zÄÖÜäöüß]{2}", name):
            cx = (w["x0"] + w["x1"]) / 2
            cands = [x for x in W if x is not w and 0 <= w["top"] - x["bottom"] < h * 2.4 and x["x0"] < w["x1"] + h * 4 and x["x1"] > w["x0"] - h * 4
                     and re.search(r"[A-Za-zÄÖÜäöüß]", x["text"])]
            if not cands:
                continue
            best = min(cands, key=lambda x: (round((w["top"] - x["bottom"]) / (h * 0.8)), abs((x["x0"] + x["x1"]) / 2 - cx)))
            row = sorted(same_line(best, W), key=lambda x: x["x0"])
            i = row.index(best)
            a, b = i, i   # zusammenhängende Wörter um das gefundene Wort
            while a > 0 and row[a]["x0"] - row[a - 1]["x1"] < h * 1.2:
                a -= 1
            while b < len(row) - 1 and row[b + 1]["x0"] - row[b]["x1"] < h * 1.2:
                b += 1
            words = [x for x in row[a:b + 1] if not NOISE.match(x["text"])]
            name = " ".join(x["text"] for x in words)
            anchor = words[0] if words else best
            if not re.search(r"[A-Za-zÄÖÜäöüß]{2}", name) or GESCHOSS.match(name):
                continue
        name = name.strip(" :-–")
        if not name or len(name) > 60:
            continue
        # Raumnummer darüber (optional)
        nr = ""
        above = [x for x in W if 0 <= anchor["top"] - x["bottom"] < h * 1.6 and abs(x["x0"] - anchor["x0"]) < h * 1.5 and NRW.match(x["text"])]
        if above:
            nr = above[0]["text"]
        rooms.append({"nr": nr, "name": name, "area": area, "page": pi,
                      "pos": [round(anchor["x0"] / pg.width, 4), round(anchor["top"] / pg.height, 4)], "_y": anchor["top"], "_x": anchor["x0"]})


def _geschosse(W, rooms):
    """Geschoss je Raum aus den Planüberschriften („Kellergeschoss“, „Erdgeschoss“ …): die nächstgelegene Überschrift."""
    heads = []
    for w in W:
        t = w["text"]
        if re.match(r"^(keller|unter|erd|ober|dach|staffel)geschoss$|^spitzboden$|^souterrain$", t, re.I):
            pre = [x for x in W if abs(x["top"] - w["top"]) < 2 and 0 < w["x0"] - x["x1"] < 8 and re.match(r"^\d+\.?$", x["text"])]
            heads.append(((w["x0"] + w["x1"]) / 2, (w["top"] + w["bottom"]) / 2, (pre[0]["text"] + " " if pre else "") + t))
    if len(heads) < 1:
        return
    for r in rooms:
        if r.get("floor"):
            continue
        x, y = r["_x"], r["_y"]
        r["floor"] = min(heads, key=lambda hd: abs(hd[0] - x) + 0.3 * abs(hd[1] - y))[2]


def preview_png(data, page=0, width=2600):   # hoch genug zum Hineinzoomen in der Planvorschau
    import pdfplumber
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        pg = pdf.pages[min(page, len(pdf.pages) - 1)]
        img = pg.to_image(resolution=max(20, min(220, int(width / (pg.width / 72)))))
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
                   (f" · {len(found)} Räume gelesen" if found else " · keine Raumbeschriftung gefunden – „Räume mit KI lesen“ probieren" if meta["kind"] == "Grundriss" else " · keine Räume (Ansicht/Schnitt)") + _hnote(meta)
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        fid = c.execute("INSERT INTO bk_files(bk_id, name, mime, size, data, meta, created, user_name) VALUES(?,?,?,?,?,?,?,?) RETURNING id",
                        (i, name, "application/pdf", len(data), data, json.dumps(meta), _now(), g.user["name"])).fetchone()["id"]
        d = clean_data(_j(r["data"], {}), c)
        d["rooms"] = [x for x in d["rooms"] if x["name"] or x["nr"] or x["area"]]   # leere Zeilen (z. B. „+ Raum“ ohne Eingabe) entfernen
        if meta.get("hoehen"):
            d["hoehen"] = {**d.get("hoehen", {}), **meta["hoehen"]}
        have = {(x["floor"], x["nr"], x["name"], round(x["area"], 2)) for x in d["rooms"]}
        added = 0
        floor0 = re.sub(r"\.pdf$", "", name, flags=re.I)[:40]
        for k, x in enumerate(found):
            fl = (x.get("floor") or floor0)[:40]
            key = (fl, x["nr"], x["name"], round(x["area"], 2))
            if key in have:
                continue
            have.add(key)
            d["rooms"].append({"id": f"f{fid}-{k}", "nr": x["nr"], "name": x["name"], "area": x["area"], "typ": guess_type(x["name"], c),
                               "ok": False, "src": f"pdf:{fid}", "floor": fl, "pos": x["pos"]})
            added += 1
        versionen.vor(c, f"bkp:{i}")
        c.execute("UPDATE bk_projects SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(clean_data(d, c)), _now(), g.user["name"], i))
        versionen.nach(c, f"bkp:{i}", g.user["name"])
        out = _out(c, _row(c, i))
    C.audit(g.user["name"], "baukosten", "Plan hochgeladen", f"{name} · {added} Räume übernommen · {r['name']}")
    return jsonify(added=added, found=len(found), note=meta["note"], bk=out)


@app.post("/api/bk/<int:i>/files/<int:fid>/neu-lesen")
def file_reread(i, fid):
    """Plan erneut auswerten (z. B. nach einer verbesserten Erkennung) – neue Räume werden ergänzt, vorhandene bleiben."""
    with db.tx() as c:
        f = c.execute("SELECT name, data, meta FROM bk_files WHERE id=? AND bk_id=?", (fid, i)).fetchone()
        if not f:
            return jsonify(error="Nicht gefunden"), 404
        meta = read_plan(bytes(f["data"]))
        found = meta.pop("rooms")
        meta["found"] = len(found)
        meta["note"] = ("Vektor-PDF · " if meta["vector"] else "Kein Text im PDF (eingescannt?) · ") + \
                       (f"Maßstab 1:{meta['scale']} erkannt" if meta["scale"] else "kein Maßstab erkannt") + \
                       (f" · {len(found)} Räume gelesen" if found else " · keine Raumbeschriftung gefunden – „Räume mit KI lesen“ probieren" if meta["kind"] == "Grundriss" else " · keine Räume (Ansicht/Schnitt)") + _hnote(meta)
        c.execute("UPDATE bk_files SET meta=? WHERE id=?", (json.dumps(meta), fid))
        r = _row(c, i)
        d = clean_data(_j(r["data"], {}), c)
        d["rooms"] = [x for x in d["rooms"] if x["name"] or x["nr"] or x["area"]]
        if meta.get("hoehen"):
            d["hoehen"] = {**d.get("hoehen", {}), **meta["hoehen"]}
        have = {(x["floor"], x["nr"], x["name"], round(x["area"], 2)) for x in d["rooms"]}
        added = 0
        for k, x in enumerate(found):
            fl = (x.get("floor") or re.sub(r"\.pdf$", "", f["name"], flags=re.I))[:40]
            key = (fl, x["nr"], x["name"], round(x["area"], 2))
            if key in have:
                continue
            have.add(key)
            d["rooms"].append({"id": f"f{fid}-r{k}", "nr": x["nr"], "name": x["name"], "area": x["area"], "typ": guess_type(x["name"], c),
                               "ok": False, "src": f"pdf:{fid}", "floor": fl, "pos": x["pos"]})
            added += 1
        versionen.vor(c, f"bkp:{i}")
        c.execute("UPDATE bk_projects SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(clean_data(d, c)), _now(), g.user["name"], i))
        versionen.nach(c, f"bkp:{i}", g.user["name"])
        out = _out(c, _row(c, i))
    return jsonify(added=added, found=len(found), note=meta["note"], bk=out)


PLAN_SYS = """Du liest Bauzeichnungen (Grundrisse) aus. Gib ausschließlich die Räume wieder, deren Bezeichnung UND Fläche im Plan
lesbar beschriftet sind – nichts schätzen, nichts erfinden. Fläche in m² wie im Plan (Dezimalpunkt). Geschoss aus der Überschrift
der jeweiligen Zeichnung (z. B. Kellergeschoss, Erdgeschoss). Antworte nur mit JSON:
{"raeume":[{"geschoss":"Erdgeschoss","nr":"","name":"Küche","flaeche":12.46}],"hinweis":"…"}"""


# Ollama im Büro: Plan lesen dauert ohne Grafikkarte Minuten → im Hintergrund; Stand in bp_store „kijob:<id>“ (mehrere Worker)
def _job_get(c, jid):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", ("kijob:" + jid,)).fetchone()
    return _j(r["data"], None) if r else None


def _job_put(c, jid, d):
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated", ("kijob:" + jid, json.dumps(d), _now(), "ki"))


@app.post("/api/bk/<int:i>/files/<int:fid>/ki-raeume")
def file_ki_rooms(i, fid):
    """Räume mit der gewählten KI aus dem Planbild lesen (für Pläne ohne lesbaren Text, z. B. Scans).
    Ollama: erste Anfrage startet das Lesen im Hintergrund ({job}); weitere Anfragen mit {job} holen das Ergebnis ({wait} solange es läuft)."""
    import threading, uuid
    ki = ai.choice_of(g.user)
    job = (request.get_json(silent=True) or {}).get("job")
    txt = None
    if job:
        with db.tx() as c:
            j = _job_get(c, str(job)[:20])
            if j and j["done"]:
                c.execute("DELETE FROM bp_store WHERE key=?", ("kijob:" + str(job)[:20],))
        if not j or j["bk"] != [i, fid]:
            return jsonify(error="Lesevorgang nicht mehr vorhanden – bitte erneut starten."), 404
        if not j["done"]:
            return jsonify(wait=True, job=job, sek=int(time.time() - j["t"]))
        if j["error"]:
            return jsonify(error=j["error"]), 502
        txt, ki = j["txt"], j["ki"]
    elif not ai.sieht(ki):
        return jsonify(error="Zum Lesen von Plänen oben in der Kopfleiste Claude, Gemini, ChatGPT oder Ollama (mit Bildmodell) wählen."), 400
    with db.tx() as c:
        f = c.execute("SELECT name, data FROM bk_files WHERE id=? AND bk_id=?", (fid, i)).fetchone()
        if not f:
            return jsonify(error="Nicht gefunden"), 404
        if txt is None and ki == "ollama":
            png = preview_png(bytes(f["data"]), width=1600)
            jid = uuid.uuid4().hex[:12]
            J = {"bk": [i, fid], "done": False, "txt": "", "error": "", "ki": ki, "t": time.time()}
            _job_put(c, jid, J)
            c.execute("DELETE FROM bp_store WHERE key LIKE 'kijob:%' AND updated < ?", ((datetime.now() - timedelta(hours=2)).isoformat(timespec="seconds"),))

            def run():
                try:
                    J["txt"] = ai.ask_image("ollama", PLAN_SYS, "Lies alle beschrifteten Räume aus diesem Plan.", png, 3000, None)
                except ai.AIError as e:
                    J["error"] = str(e)
                except Exception as e:
                    J["error"] = "Fehler beim Lesen: " + str(e)[:200]
                J["done"] = True
                with db.tx() as c2:
                    _job_put(c2, jid, J)
            threading.Thread(target=run, daemon=True).start()
            return jsonify(wait=True, job=jid, sek=0)
        if txt is None:
            try:
                png = preview_png(bytes(f["data"]), width=2200)
                txt = ai.ask_image(ki, PLAN_SYS, "Lies alle beschrifteten Räume aus diesem Plan.", png, 3000, c)
            except ai.AIError as e:
                return jsonify(error=str(e)), 502
        try:
            o = ai.parse_json(txt)
        except ai.AIError:
            o = {}
        found = []
        for x in (o.get("raeume") or o.get("_objekte") or [])[:300]:
            if not isinstance(x, dict):
                continue
            a = _num(x.get("flaeche"), -1)
            nm = _s(x.get("name"), 120)
            if nm and 0.3 <= a <= 5000:
                found.append({"nr": _s(x.get("nr"), 20), "name": nm, "area": round(a, 2), "floor": _s(x.get("geschoss"), 40), "pos": None})
        r = _row(c, i)
        d = clean_data(_j(r["data"], {}), c)
        have = {(x["floor"], x["nr"], x["name"], round(x["area"], 2)) for x in d["rooms"]}
        added = 0
        for k, x in enumerate(found):
            fl = x["floor"] or re.sub(r"\.pdf$", "", f["name"], flags=re.I)[:40]
            key = (fl, x["nr"], x["name"], x["area"])
            if key in have:
                continue
            have.add(key)
            d["rooms"].append({"id": f"k{fid}-{k}", "nr": x["nr"], "name": x["name"], "area": x["area"], "typ": guess_type(x["name"], c),
                               "ok": False, "src": f"pdf:{fid}", "floor": fl, "pos": None})
            added += 1
        versionen.vor(c, f"bkp:{i}")
        c.execute("UPDATE bk_projects SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(clean_data(d, c)), _now(), g.user["name"], i))
        versionen.nach(c, f"bkp:{i}", g.user["name"])
        out = _out(c, _row(c, i))
    C.audit(g.user["name"], "baukosten", "Räume mit KI aus dem Plan gelesen", f"{f['name']} · {added} Räume · {ki}")
    return jsonify(added=added, found=len(found), hinweis=_s(o.get("hinweis"), 300), bk=out)


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
        versionen.vor(c, f"bkp:{i}")
        c.execute("UPDATE bk_projects SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(d), _now(), g.user["name"], i))
        versionen.nach(c, f"bkp:{i}", g.user["name"])
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


# ---------------------------------------------------------------- Schätzen und Genauigkeit
# Übliche Genauigkeit je Stufe (± in % der Gesamtkosten, Erfahrungswerte aus der Kostenplanung, keine Norm)
STUFE_GENAU = {"rahmen": 35, "schaetzung": 25, "berechnung": 15, "voranschlag": 10, "anschlag": 8, "feststellung": 2}
# Faustwerte für fehlende Kostengruppen bei Umbau/Sanierung, in % der Bauwerkskosten (KG 300+400): (Wert, von, bis)
FAUST = {
    "200": ("Vorbereitende Maßnahmen", 1.0, 0.5, 2.5, "Herrichten, Baustelleneinrichtung im Bestand, Leitungsumlegungen"),
    "394": ("Rückbau (Abbruch im Bestand)", 5.0, 3.0, 9.0, "Umbau im Bestand: Abbruch von Wänden, Belägen, Installationen, Entsorgung"),
    "500": ("Außenanlagen", 4.0, 2.0, 8.0, "Wege, Zufahrt, Anpassungen am Gebäude; ohne große Neugestaltung"),
    "600": ("Ausstattung", 2.0, 0.0, 5.0, "nur wenn feste Ausstattung beauftragt wird (z. B. Küche, Möblierung)"),
}
# Faustwerte für die Aufteilung auf die 2. Ebene (Umbau eines Verwaltungs-/Sozialgebäudes), % von KG 300 bzw. 400
KG2_FAUST = {"310": 1, "320": 3, "330": 30, "340": 22, "350": 18, "360": 14, "380": 5, "390": 7,
             "410": 22, "420": 18, "430": 14, "440": 30, "450": 8, "470": 3, "480": 3, "490": 2}
KI_GUETE = {
    "intern": "Feste Faustwerte und Regeln: nachvollziehbar und immer gleich, kennt aber weder Ort noch Marktlage.",
    "ollama": "Kleines Modell im Büro: gut für Hinweise auf Lücken, bei Zahlen unsicher. Vorschläge außerhalb sinnvoller Spannen werden verworfen.",
    "claude": "Großes Modell: erkennt fehlende Kostengruppen und Risiken zuverlässiger. Zahlen bleiben Schätzwerte ohne aktuelle Marktpreise.",
    "gemini": "Großes Modell: erkennt fehlende Kostengruppen und Risiken zuverlässiger. Zahlen bleiben Schätzwerte ohne aktuelle Marktpreise.",
    "chatgpt": "Großes Modell: erkennt fehlende Kostengruppen und Risiken zuverlässiger. Zahlen bleiben Schätzwerte ohne aktuelle Marktpreise.",
}


def genauigkeit(c, r, d, cal, kinds):
    """Wie genau ist die Summe wahrscheinlich? Spanne nach Stufe plus Zuschläge für fehlende oder geschätzte Daten.
    Kosten weichen in der Praxis eher nach oben ab – offene und unsichere Punkte erweitern vor allem die obere Grenze."""
    base = STUFE_GENAU.get(r["stufe"], 25)
    lo, hi, F = float(base), float(base), []
    F.append({"text": f"{STUFE_NAME.get(r['stufe'], '')}: üblich ± {base} %", "plus": base, "tipp": ""})
    btw = sum(x["wert"] for x in (cal.get("kg2") or {}).values() if x["quelle"] == "bauteile")
    if btw and cal["bauwerk"]:
        share = btw / cal["bauwerk"]
        v = round(base * 0.45 * share, 1); lo -= v; hi -= v
        F.append({"text": f"{round(share * 100)} % des Bauwerks aus Bauteilen mit Mengen und Einheitspreisen", "plus": -v, "tipp": "Weitere Kostengruppen unter „Bauteile & Material“ erfassen."})
    own = kennwerte(c)
    used = [t for t in cal["types"] if t["area"]]
    ex = [t for t in used if t["typ"] in own and own[t["typ"]]["beispiel"] is not None and abs(t["kw"] - own[t["typ"]]["beispiel"]) < 0.5]
    if ex and (not btw or btw < cal["bauwerk"] * 0.95):
        share = sum(t["sum"] for t in ex) / (cal["kw_summe"] or cal["bauwerk"] or 1) * (1 - (btw / cal["bauwerk"] if btw and cal["bauwerk"] else 0))
        v = round(8 * share, 1); lo += v; hi += v
        F.append({"text": f"Beispiel-Kennwerte bei {len(ex)} Raumtypen", "plus": v, "tipp": "Eigene Kennwerte aus abgerechneten Projekten eintragen."})
    if d["rooms"]:
        open_share = sum(x["area"] for x in d["rooms"] if not x["ok"]) / (cal["area"] or 1)
        if open_share > 0:
            v = round(5 * open_share, 1); lo += v; hi += v
            F.append({"text": f"{round(open_share * 100)} % der Fläche nicht bestätigt", "plus": v, "tipp": "Räume unter „Pläne & Mengen“ bestätigen."})
    else:
        hi += 40; lo += 20
        F.append({"text": "Noch keine Räume", "plus": 40, "tipp": "Grundriss hochladen."})
    offen = [i for i in d["items"] if i["amount"] is None]
    if offen:
        v = min(15, 4 * len(offen)); hi += v
        F.append({"text": f"{len(offen)} Kostengruppen offen (fehlen in der Summe)", "plus": v, "tipp": "Unter „Kosten“ schätzen lassen oder Beträge eintragen.", "oben": True})
    est = [i for i in d["items"] if i.get("est")]
    if est:
        v = min(8, 2 * len(est)); lo += v / 2; hi += v
        F.append({"text": f"{len(est)} Positionen nur geschätzt", "plus": v, "tipp": "Durch Angebote oder eigene Mengen ersetzen."})
    floors = _floors(d["rooms"])
    if len(floors) == 1 and "Ansicht" in kinds:
        hi += 15
        F.append({"text": "Nur ein Geschoss im Raumbuch, Ansichten zeigen evtl. mehr", "plus": 15, "tipp": "Grundrisse aller Geschosse hochladen.", "oben": True})
    if any(re.sub(r"\D", "", i["kg"]).startswith("39") for i in d["items"]) or r["stufe"] in ("rahmen", "schaetzung") and "Ansicht" in kinds:
        hi += 5
        F.append({"text": "Umbau im Bestand: Überraschungen beim Rückbau", "plus": 5, "tipp": "Bestandsuntersuchung / Schadstoffgutachten.", "oben": True})
    lo, hi = max(1, min(lo, 60)), max(1, min(hi, 120))
    t = cal["total"]
    note = "gut belastbar" if hi <= 15 else "brauchbar für Entscheidungen" if hi <= 30 else "grobe Größenordnung" if hi <= 50 else "noch sehr unsicher"
    return {"low": round(t * (1 - lo / 100), 2), "high": round(t * (1 + hi / 100), 2), "lo_pct": round(lo, 1), "hi_pct": round(hi, 1), "urteil": note, "faktoren": F}


def schaetzen_intern(d, cal):
    out = []
    bau = cal["bauwerk"]
    have = {re.sub(r"\D", "", i["kg"])[:3]: i for i in d["items"]}
    for kg, (name, v, lo, hi, why) in FAUST.items():
        it = have.get(kg)
        if kg == "600" and not it:
            continue   # Ausstattung nur, wenn als Position angelegt
        if it is None or it["amount"] is None or it.get("est"):
            out.append({"kg": kg, "name": name, "value": round(bau * v / 100, -2), "low": round(bau * lo / 100, -2), "high": round(bau * hi / 100, -2),
                        "basis": f"{v:g} % der Bauwerkskosten (üblich {lo:g}–{hi:g} %)".replace(".", ",") + f": {why}", "src": "Intern", "sicher": "gering" if hi / max(lo, 0.1) > 2.5 else "mittel"})
    kg2 = None
    if not d["kg2"]:
        kg2 = {"werte": KG2_FAUST, "basis": "übliche Verteilung bei Umbau eines Verwaltungs-/Sozialgebäudes (Faustwerte)", "src": "Intern", "sicher": "gering"}
    return out, kg2


# ---------------------------------------------------------------- Grundlagen und Quellen (für App und PDF)
def quellen(c, r, d, cal):
    """Woher Flächen, Kennwerte, Anteile, Preise und Spannen dieser Kostenermittlung stammen – ehrlich je nach Datenlage."""
    Q = []
    eurs = lambda v: f"{v:,.0f} €".replace(",", ".")
    Q.append(("Gliederung und Stufen", "Kostengruppen und Kostenstufen nach DIN 276:2018-12 „Kosten im Bauwesen“ (Kostenrahmen, -schätzung, -berechnung, "
              "-anschlag, -feststellung); Zuordnung zu den Leistungsphasen nach HOAI 2021. Gerechnet wird netto; die Umsatzsteuer weist das PDF auf Wunsch aus."))
    kinds = [(_j(f["meta"], {}) or {}).get("kind") for f in c.execute("SELECT meta FROM bk_files WHERE bk_id=?", (r["id"],))]
    n_pdf = sum(1 for x in d["rooms"] if str(x.get("src", "")).startswith("pdf")); n_ok = sum(1 for x in d["rooms"] if x.get("ok"))
    Q.append(("Flächen", ((f"{n_pdf} von {len(d['rooms'])} Räumen aus den Raumstempeln der hochgeladenen Pläne gelesen" + (", übrige von Hand eingetragen. " if n_pdf < len(d["rooms"]) else ". ")) if d["rooms"] else "Noch keine Räume erfasst. ")
              + f"{n_ok} Räume geprüft und bestätigt. Maßgebend ist die Fläche im Raumstempel (in der Regel Netto-Raumfläche nach DIN 277:2021-08 „Grundflächen und Rauminhalte im Hochbau“); "
              "die App misst nicht selbst nach." + (" Geschosshöhen aus Höhenkoten der Schnitte." if "Schnitt" in kinds else "")))
    own = kennwerte(c)
    used = [t for t in cal["types"] if t["area"]]
    ex = [t["label"] for t in used if t["typ"] in own and own[t["typ"]]["beispiel"] is not None and abs(t["kw"] - own[t["typ"]]["beispiel"]) < 0.5]
    eig = [t["label"] for t in used if t["label"] not in ex]
    txt = "Kosten je m² Raumfläche für KG 300 + 400, je Raumtyp. "
    if ex:
        txt += (f"Beispielwerte der App bei: {', '.join(ex)}. Diese Werte sind grobe Größenordnungen für den Einstieg und stammen nicht aus einer "
                "veröffentlichten Kennwertsammlung; sie ersetzen weder eigene Werte aus abgerechneten Projekten noch eine Kennwertsammlung wie BKI Baukosten (Baukosteninformationszentrum Deutscher Architektenkammern). ")
    if eig:
        txt += f"Eigene bzw. angepasste Kennwerte bei: {', '.join(eig)}. "
    Q.append(("Kennwerte", txt.strip()))
    Q.append(("Rechenweg", "Bauwerk (KG 300 + 400) = Summe aus Raumfläche × Kennwert je Raumtyp, mal Justage-Faktor. Aufteilung auf KG 300 und 400 und – ab der "
              "Kostenberechnung – auf die Kostengruppen der 2. Ebene nach Anteilen. Wo Bauteile erfasst sind, ersetzt Menge × Einheitspreis den Anteil dieser Kostengruppe. "
              "Eigene Positionen (z. B. KG 200, 394, 500) werden addiert; Baunebenkosten KG 700 = Prozentsatz auf Bauwerk und Positionen. "
              "Preissteigerung im Mittelabfluss: Betrag × (1 + Satz) hoch Jahre ab heute bis zum Monat der Ausführung. Es sind einfache, offengelegte Rechenschritte – "
              "keine Formeln aus einer Norm; DIN 276 regelt Gliederung und Stufen, nicht die Rechenwerte."))
    J = cal.get("justage") or {}
    if J and (J.get("region") != 100 or J.get("preis") != 100):
        Q.append(("Justage der Kennwerte", f"Regionalfaktor {J['region']:g} % und Preisstand {J['preis']:g} % – zusammen Faktor {str(round(J['faktor'], 3)).replace('.', ',')} auf alle Kennwerte. "
                  "Regionalfaktoren z. B. aus den BKI-Regionalfaktoren, Preisstand als Verhältnis der Baupreisindizes des Statistischen Bundesamts (Destatis) heute zum Stand der Kennwerte. "
                  "Die Werte sind im Projekt eingetragen, nicht automatisch abgerufen."))
    Q.append(("Aufteilung", f"KG 300 / 400 im Verhältnis {d['kg']['300']:g} / {d['kg']['400']:g} % (Annahme, im Projekt änderbar). "
              + ("Kostengruppen der 2. Ebene mit eigenen Anteilen. " if d["kg2"] else "Kostengruppen der 2. Ebene nach Faustanteilen der App (Erfahrungswerte für Wohngebäude, keine Normvorgabe). " if cal.get("kg2") or r["stufe"] in ("berechnung", "anschlag", "feststellung") else "")
              + f"Baunebenkosten KG 700 pauschal {d['nk']:g} % (Annahme)."))
    bts = d.get("bauteile") or []
    if bts:
        mp = {k: {round(ep, 2) for _, ep in opts} for k, (_, _, opts) in MAT.items()}
        bsp = sum(1 for b in bts if round(b.get("ep") or 0, 2) in mp.get(b.get("kg"), set()))
        ki = sum(1 for b in bts if str(b.get("src", "")).startswith("KI"))
        frm = sum(1 for b in bts if b.get("formel"))
        Q.append(("Bauteile, Mengen, Preise", f"{len(bts)} Bauteile mit Menge × Einheitspreis. Mengen aus Raumbuch, Geschossen und Höhen abgeleitet bzw. von Hand"
                  + (f", {frm} mit nachvollziehbarer Ermittlung (Rechnung oder Beschreibung)" if frm else "") + ". "
                  + (f"{bsp} Einheitspreise sind Beispielpreise der App (grobe Marktgrößen, netto, ohne Gewähr). " if bsp else "")
                  + (f"{ki} Positionen von einer KI vorgeschlagen und zu prüfen. " if ki else "")
                  + "Für Kostenanschlag und -feststellung gelten Angebote bzw. Rechnungen."))
    est = [i for i in d["items"] if i.get("est")]
    if est:
        Q.append(("Geschätzte Positionen", "; ".join(f"KG {i['kg']} {i['name']}: {eurs(i['amount'] or 0)} ({i['est']['src']}, Spanne {eurs(i['est']['low'])} – {eurs(i['est']['high'])})" for i in est) + "."))
    Q.append(("Genauigkeit", f"Übliche Spanne je Stufe ({', '.join(f'{STUFE_NAME[k]} ± {v} %' for k, v in STUFE_GENAU.items())}) sind Erfahrungswerte aus der Praxis; "
              "DIN 276 schreibt keine Genauigkeit vor. Zu- und Abschläge je nach Datenlage (Beispielwerte, unbestätigte Flächen, Bauteile) zeigt der Abschnitt „Genauigkeit“."))
    Q.append(("Mittelabfluss und Preissteigerung", f"Kosten über die Leistungen des verknüpften Bauzeitenplans verteilt (Gewicht = Dauer, im Projekt änderbar). "
              f"Preissteigerung {d['rate']:g} % pro Jahr als Annahme; zur Orientierung dienen die Baupreisindizes des Statistischen Bundesamts (Destatis)."))
    return [{"t": t, "x": x} for t, x in Q]


# ---------------------------------------------------------------- Mengen & Material (Kostenberechnung nach Bauteilen)
# Beispiel-Einheitspreise (netto, Stand Vorlage) – in der App je Zeile änderbar
MAT = {
    "322": ("Bodenplatte / Gründung", "m²", [("Stahlbeton-Bodenplatte 25 cm mit Dämmung", 165), ("Streifenfundamente + Bodenplatte", 145), ("WU-Bodenplatte", 210)]),
    "331": ("Tragende Außenwände", "m²", [("Kalksandstein 17,5 cm", 115), ("Ziegel 36,5 cm monolithisch", 145), ("Porenbeton 36,5 cm", 130), ("Stahlbeton 25 cm", 185), ("Holzrahmenwand", 160)]),
    "334": ("Fenster und Außentüren", "m²", [("Kunststofffenster 3-fach", 650), ("Holz-Alu-Fenster 3-fach", 950), ("Aluminiumfenster", 1100), ("Hebe-Schiebe-Tür", 1300)]),
    "335": ("Außenwandbekleidung außen", "m²", [("WDVS 16 cm mit Putz", 155), ("Mineralputz auf Mauerwerk", 55), ("Klinker-Vormauerschale", 240), ("Holzfassade hinterlüftet", 210), ("Faserzementplatten hinterlüftet", 230)]),
    "336": ("Außenwandbekleidung innen", "m²", [("Innenputz + Anstrich", 38), ("Gipskarton-Vorsatzschale", 65)]),
    "338": ("Sonnenschutz", "m²", [("Rollladen elektrisch", 280), ("Raffstore elektrisch", 420)]),
    "341": ("Tragende Innenwände", "m²", [("Kalksandstein 17,5 cm", 110), ("Stahlbeton 20 cm", 170)]),
    "342": ("Nichttragende Innenwände", "m²", [("Trockenbau Metallständer 10 cm", 75), ("Kalksandstein 11,5 cm", 85), ("Porenbeton 10 cm", 80)]),
    "344": ("Innentüren", "Stk", [("Röhrenspantür mit Zarge", 650), ("Stahlzarge + Holztür", 780), ("Ganzglastür", 1100), ("Brandschutztür T30", 1600)]),
    "345": ("Innenwandbekleidung", "m²", [("Innenputz + Anstrich", 35), ("Wandfliesen", 95), ("Tapete + Anstrich", 28)]),
    "351": ("Deckenkonstruktion", "m²", [("Stahlbeton-Decke 20 cm", 175), ("Filigrandecke", 160), ("Holzbalkendecke", 140), ("Brettsperrholz-Decke", 190)]),
    "352": ("Bodenbeläge (mit Estrich)", "m²", [("Fliesen auf Zementestrich", 115), ("Parkett auf Estrich", 125), ("Designbelag / Vinyl auf Estrich", 85), ("Linoleum auf Estrich", 90), ("Beschichtung auf Estrich", 70), ("Teppich auf Estrich", 70)]),
    "353": ("Deckenbekleidung", "m²", [("Deckenputz + Anstrich", 32), ("Abgehängte Gipskartondecke", 70), ("Akustikdecke", 95)]),
    "361": ("Dachkonstruktion", "m²", [("Holzdachstuhl Sparrendach", 115), ("Stahlbeton-Flachdach", 180), ("Holzbalken-Flachdach", 140)]),
    "363": ("Dachbeläge", "m²", [("Dachziegel mit Dämmung", 165), ("Betondachstein mit Dämmung", 145), ("Flachdachabdichtung mit Dämmung", 175), ("Metalldeckung (Stehfalz)", 210), ("Gründach extensiv", 195)]),
    "364": ("Dachbekleidung innen", "m²", [("Gipskarton unter Sparren", 60)]),
    "411": ("Abwasseranlagen", "Stk", [("Anschluss je Sanitärobjekt", 650)]),
    "412": ("Wasseranlagen", "Stk", [("Sanitärobjekt inkl. Armatur", 1400)]),
    "421": ("Wärmeerzeugung", "Stk", [("Luft-Wasser-Wärmepumpe", 22000), ("Gas-Brennwerttherme", 9000), ("Pelletkessel", 26000)]),
    "422": ("Wärmeverteilung / Heizflächen", "m²", [("Fußbodenheizung", 65), ("Heizkörper", 45)]),
    "431": ("Lüftungsanlagen", "m²", [("Zentrale Lüftung mit WRG", 75), ("Dezentrale Lüfter", 35), ("Abluft Bad/WC", 15)]),
    "444": ("Niederspannungsinstallation", "m²", [("Elektro Standard", 75), ("Elektro gehoben", 110)]),
    "445": ("Beleuchtung", "m²", [("LED-Grundbeleuchtung", 30)]),
    "451": ("Telekommunikation / Netzwerk", "m²", [("Netzwerk + Telefon", 18)]),
    "461": ("Aufzugsanlagen", "Stk", [("Personenaufzug 4 Haltestellen", 85000)]),
}
BELAG = {"sanitaer": "Fliesen auf Zementestrich", "kueche": "Fliesen auf Zementestrich", "neben": "Beschichtung auf Estrich", "garage": "Beschichtung auf Estrich",
         "wohnen": "Parkett auf Estrich", "buero": "Linoleum auf Estrich", "verkehr": "Designbelag / Vinyl auf Estrich", "aufenthalt": "Linoleum auf Estrich"}


def bauteile_intern(d, cal):
    """Bauteilliste aus Raumbuch, Geschossen und Höhen – Mengen grob, Material und Preise als Startwerte."""
    G = _geo(d, cal)
    if not cal["area"]:
        return []
    A, fl, gh = cal["area"], G["geschosse"], G["geschosshoehe"]
    rooms = d["rooms"]
    wand = sum(4 * (r["area"] ** 0.5) * ((r.get("h") or 0) or gh) for r in rooms if r["area"]) / 2   # Wandflächen der Räume, je Wand zwei Räume
    innen = max(0.0, wand - G["fassade_netto"] * 0.5)
    sani = [r for r in rooms if r["typ"] == "sanitaer"]
    out, n = [], 0

    def add(kg, menge, mat=None, formel="", name=None, geschoss=""):
        nonlocal n
        nm, eh, opts = MAT[kg]
        m = next((o for o in opts if o[0] == mat), opts[0])
        n += 1
        out.append({"id": f"v{n}", "kg": kg, "name": name or nm, "mat": m[0], "formel": formel, "menge": round(menge, 1), "einheit": eh, "ep": m[1], "src": "Vorschlag", "geschoss": geschoss, "notiz": ""})
    add("322", G["grundflaeche"], formel=f"Grundfläche ≈ {G['grundflaeche']} m²")
    add("331", G["fassade_netto"], formel=f"Umfang {G['umfang']} m × {fl} Geschoss(e) × {str(gh).replace('.', ',')} m − Fenster")
    add("334", G["fenster"], formel="≈ 20 % der Fassade")
    add("335", G["fassade_netto"])
    add("336", G["fassade_netto"])
    add("342", innen * 0.7, formel="Wandflächen der Räume ÷ 2, davon 70 % nichttragend")
    add("341", innen * 0.3, formel="davon 30 % tragend")
    add("344", max(1, len([r for r in rooms if r["typ"] not in ("verkehr",)])), formel="je Raum eine Tür")
    add("345", innen * 2 - sum(4 * (r["area"] ** 0.5) * gh for r in sani) * 0.6, formel="beide Seiten der Innenwände")
    if sani:
        add("345", sum(4 * (r["area"] ** 0.5) * min(gh, 2.0) for r in sani), "Wandfliesen", name="Wandfliesen Bad/WC", formel="Umfang Sanitärräume × 2,0 m")
    add("351", A * (fl - 1) / fl if fl > 1 else 0, formel="Geschossdecken (ohne Bodenplatte)") if fl > 1 else None
    by = {}
    for r in rooms:
        by.setdefault(r["typ"], 0.0)
        by[r["typ"]] += r["area"]
    for t, a in by.items():
        if a:
            add("352", a, BELAG.get(t), name=f"Bodenbelag {d['types'].get(t, {}).get('label', t)}", formel=f"Raumfläche {str(round(a, 1)).replace('.', ',')} m²")
    add("353", A)
    add("361", G["dach"])
    add("363", G["dach"])
    if sani:
        add("411", len(sani) * 3, formel="je Sanitärraum ≈ 3 Objekte")
        add("412", len(sani) * 3, formel="je Sanitärraum ≈ 3 Objekte")
    add("421", 1)
    add("422", A)
    add("431", sum(r["area"] for r in sani) or A * 0.1, "Abluft Bad/WC", formel="Sanitärräume")
    add("444", A)
    add("445", A)
    add("451", A)
    return out


@app.post("/api/bk/<int:i>/bauteile/vorschlag")
def bauteile_vorschlag(i):
    """Bauteile vorschlagen – intern aus dem Raumbuch oder mit KI (ki=true)."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        d = clean_data(_j(r["data"], {}), c)
        cal = calc(d)
        rows = bauteile_intern(d, cal)
        if not rows:
            return jsonify(error="Erst Räume mit Flächen erfassen (Pläne & Mengen) – daraus werden die Mengen abgeleitet."), 400
        note = "Mengen grob aus Raumbuch, Geschossen und Höhen; Materialien und Preise sind Beispiele – bitte je Zeile prüfen."
        if b.get("ki"):
            ki = ai.choice_of(g.user)
            prov = {p["key"]: p for p in ai.providers(c)}
            if ki == "intern" or not prov.get(ki, {}).get("ok"):
                ki = next((k for k in ("claude", "gemini", "chatgpt", "ollama") if prov.get(k, {}).get("ok")), None)
            if not ki:
                return jsonify(error="Keine KI eingerichtet – in der Verwaltung unter Einstellungen → KI einen Schlüssel hinterlegen."), 400
            info = {"maßnahme": r["name"], "stufe": STUFE_NAME.get(r["stufe"]), "geometrie": _geo(d, cal), "raumflaeche_m2": cal["area"],
                    "raeume": [f"{x['floor']} {x['nr']} {x['name']} {x['area']} m² ({d['types'].get(x['typ'], {}).get('label', '')})" for x in d["rooms"][:150]],
                    "pläne": [f["name"] for f in c.execute("SELECT name FROM bk_files WHERE bk_id=?", (i,))],
                    "entwurf": [{k: x[k] for k in ("kg", "name", "mat", "menge", "einheit", "ep")} for x in rows]}
            try:
                o = ai.ask_json(ki, BT_SYS, json.dumps(info, ensure_ascii=False), 3500, c)
            except ai.AIError as e:
                return jsonify(error=f"{prov[ki]['label']}: {e}"), 502
            krows = []
            for k, e in enumerate((o.get("bauteile") or o.get("_objekte") or [])[:80]):
                if not isinstance(e, dict):
                    continue
                kg = re.sub(r"\D", "", str(e.get("kg") or ""))[:3]
                if len(kg) != 3 or kg[0] not in "34" or not _s(e.get("name"), 200):
                    continue
                krows.append({"id": f"k{k}", "kg": kg, "name": _s(e.get("name"), 200), "mat": _s(e.get("material"), 200), "formel": _s(e.get("ermittlung"), 200),
                              "menge": round(_num(e.get("menge"), 0, 0, 1e6), 1), "einheit": _s(e.get("einheit"), 10) or "m²", "ep": round(_num(e.get("ep"), 0, 0, 1e6), 2),
                              "src": "KI · " + prov[ki]["label"], "geschoss": "", "notiz": _s(e.get("hinweis"), 300)})
            if not krows:
                return jsonify(error="Die KI hat keine verwertbaren Bauteile geliefert."), 502
            tot = sum(_bt_betrag(x) for x in krows)
            if cal["bauwerk_kw"] and tot > cal["bauwerk_kw"] * 4:
                return jsonify(error="Die Vorschläge der KI sind unplausibel hoch und wurden verworfen."), 502
            rows, note = krows, _s(o.get("hinweis"), 400) or "Vorschlag der KI – Mengen, Materialien und Preise bitte prüfen."
    return jsonify(rows=rows, note=note)


BT_SYS = """Du bist erfahrener Kostenplaner (DIN 276, Kostenberechnung nach Bauteilen) in Deutschland.
Prüfe und verbessere den Entwurf einer Bauteilliste für die beschriebene Maßnahme: Mengen aus Raumbuch und Geometrie, passende Materialien,
realistische Einheitspreise (netto, aktuelles Preisniveau), fehlende Bauteile ergänzen. Kostengruppen dreistellig (3xx/4xx).
Antworte ausschließlich mit JSON: {"bauteile":[{"kg":"352","name":"…","material":"…","menge":0,"einheit":"m²","ep":0,"ermittlung":"wie die Menge entsteht","hinweis":"…"}],"hinweis":"…"}"""


# ---------------------------------------------------------------- Positionen vorschlagen (Klick auf einen Prüfhinweis)
# Unterpositionen je offener Kostengruppe: (KG, Bezeichnung, Einheit, Anteil am Faustwert)
SUB = {
    "200": [("210", "Herrichten (Baustelleneinrichtung im Bestand, Schutz, Sicherung)", "psch", 0.6), ("230", "Nichtöffentliche Erschließung (Leitungen umlegen, Anschlüsse)", "psch", 0.4)],
    "394": [("394", "Abbruch nichttragender Innenwände", "m²", 0.3), ("394", "Abbruch Beläge, Bekleidungen, Estrich", "m²", 0.3),
            ("394", "Rückbau Installationen (Heizung, Sanitär, Elektro)", "psch", 0.2), ("394", "Entsorgung, Container, Schadstoffe nach Gutachten", "psch", 0.2)],
    "500": [("510", "Erdbau, Geländeanpassung", "m²", 0.15), ("530", "Oberbau: Wege, Zufahrt, Stellplätze", "m²", 0.45),
            ("540", "Baukonstruktionen in Außenanlagen (Einfriedung, Mauern)", "m", 0.15), ("570", "Vegetationsflächen, Pflanzen", "m²", 0.25)],
}
EP_HUELLE = {"335": ("Fassade: Außenwandbekleidung / Putz / WDVS", "m²", 180), "334": ("Fenster und Außentüren", "m²", 750), "363": ("Dachbeläge, Dachabdichtung, Dämmung", "m²", 165)}

VOR_SYS = """Du bist erfahrener Kostenplaner (DIN 276) in Deutschland. Schlage für das genannte Thema Kostenpositionen vor:
je Position Kostengruppe (3-stellig), Bezeichnung, Menge, Einheit, Einheitspreis in Euro netto und eine kurze Begründung.
Nutze die Angaben zur Maßnahme (Flächen, Geschosse, Pläne). Antworte ausschließlich mit JSON:
{"positionen":[{"kg":"335","name":"…","menge":0,"einheit":"m²","ep":0,"begruendung":"…"}],"hinweis":"…"} – höchstens 8 Positionen."""


def _geo(d, cal):
    """Grobe Gebäudegeometrie aus dem Raumbuch: Geschosse, Grundfläche, Umfang, Fassaden- und Dachfläche."""
    fl = max(1, len(_floors(d["rooms"])) or 1)
    a = cal["area"] or 0
    foot = a / fl * 1.15 if a else 0   # Brutto-Grundfläche je Geschoss ≈ Raumfläche × 1,15
    per = 4 * (foot ** 0.5) * 1.1 if foot else 0
    hs = list((d.get("hoehen") or {}).values()) or ([d["hoehe_std"]] if d.get("hoehe_std") else [])
    gh = sum(hs) / len(hs) if hs else 2.9   # Geschosshöhe aus dem Schnitt, sonst eingetragen, sonst üblich
    fac = per * fl * gh
    return {"geschosse": fl, "geschosshoehe": round(gh, 2), "grundflaeche": round(foot), "umfang": round(per), "fassade_brutto": round(fac), "fenster": round(fac * 0.2),
            "fassade_netto": round(fac * 0.8), "dach": round(foot * 1.25)}


@app.post("/api/bk/<int:i>/vorschlag")
def vorschlag(i):
    """Positionen mit Menge und Preis vorschlagen – intern (Faustwerte, Geometrie) oder mit der gewählten KI (ki=true)."""
    b = request.get_json(silent=True) or {}
    thema, kg = b.get("thema"), re.sub(r"\D", "", str(b.get("kg") or ""))[:3]
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        d = clean_data(_j(r["data"], {}), c)
        cal = calc(d)
        G = _geo(d, cal)
        rows, note = [], ""
        if thema == "huelle":
            title = "Gebäudehülle aus den Ansichten"
            m = {"335": G["fassade_netto"], "334": G["fenster"], "363": G["dach"]}
            for k, (n, e, ep) in EP_HUELLE.items():
                rows.append({"kg": k, "name": n, "menge": m[k], "einheit": e, "ep": ep, "src": "Intern",
                             "basis": f"aus {cal['area']:.0f} m² Raumfläche, {G['geschosse']} Geschoss(e): Umfang ≈ {G['umfang']} m".replace(".", ",")})
            note = "Mengen grob aus dem Raumbuch abgeleitet – bitte mit den Ansichten abgleichen (Fassadenfläche, Fensteranteil, Dachfläche)."
        elif thema == "kg" and kg in FAUST:
            name, v, lo, hi, why = FAUST[kg]
            title = f"KG {kg} {name}"
            total = cal["bauwerk"] * v / 100
            for k, n, e, share in SUB.get(kg, [(kg, name, "psch", 1.0)]):
                amt = round(total * share, -2)
                rows.append({"kg": k, "name": n, "menge": 1 if e == "psch" else None, "einheit": e, "ep": amt if e == "psch" else None, "betrag": amt, "src": "Intern",
                             "basis": f"{v:g} % der Bauwerkskosten × Anteil {share * 100:.0f} %".replace(".", ",")})
            pz = lambda x: f"{x:g}".replace(".", ",")
            note = f"Faustwert {pz(v)} % der Bauwerkskosten (üblich {pz(lo)}–{pz(hi)} %): {why}. Mengen eintragen, wenn bekannt – der Betrag rechnet mit."
        else:
            return jsonify(error="Unbekanntes Thema"), 400
        if b.get("ki"):
            ki = ai.choice_of(g.user)
            prov = {p["key"]: p for p in ai.providers(c)}
            if ki == "intern" or not prov.get(ki, {}).get("ok"):
                ki = next((k for k in ("claude", "gemini", "chatgpt", "ollama") if prov.get(k, {}).get("ok")), None)
            if not ki:
                return jsonify(error="Keine KI eingerichtet – in der Verwaltung unter Einstellungen → KI einen Schlüssel hinterlegen."), 400
            info = {"thema": title, "maßnahme": r["name"], "stufe": STUFE_NAME.get(r["stufe"]), "raumflaeche_m2": cal["area"], "geometrie_grob": G,
                    "raumtypen": [{"typ": t["label"], "m2": t["area"]} for t in cal["types"] if t["area"]], "bauwerk_kg300_400_netto": cal["bauwerk"],
                    "pläne": [f["name"] for f in c.execute("SELECT name FROM bk_files WHERE bk_id=?", (i,))]}
            try:
                o = ai.ask_json(ki, VOR_SYS, json.dumps(info, ensure_ascii=False), 2000, c)
            except ai.AIError as e:
                return jsonify(error=f"{prov[ki]['label']}: {e}"), 502
            krows = []
            for e in (o.get("positionen") or o.get("_objekte") or [])[:8]:
                if not isinstance(e, dict):
                    continue
                k = re.sub(r"\D", "", str(e.get("kg") or ""))[:3]
                menge, ep = _num(e.get("menge"), 0, 0, 1e6), _num(e.get("ep"), 0, 0, 1e6)
                if len(k) != 3 or not _s(e.get("name"), 120):
                    continue
                krows.append({"kg": k, "name": _s(e.get("name"), 120), "menge": round(menge, 1), "einheit": _s(e.get("einheit"), 10) or "psch", "ep": round(ep, 2),
                              "src": "KI · " + prov[ki]["label"], "basis": _s(e.get("begruendung"), 300)})
            tot = sum((x["menge"] or 0) * (x["ep"] or 0) for x in krows)
            if not krows:
                return jsonify(error="Die KI hat keine verwertbaren Positionen geliefert."), 502
            if cal["bauwerk"] and tot > cal["bauwerk"] * 0.6:
                return jsonify(error="Die Vorschläge der KI sind unplausibel hoch (über 60 % der Bauwerkskosten) und wurden verworfen."), 502
            rows, note = krows, _s(o.get("hinweis"), 300) or "Vorschlag der KI – Mengen und Preise bitte prüfen."
    for x in rows:
        if x.get("betrag") is None:
            x["betrag"] = round((x.get("menge") or 0) * (x.get("ep") or 0), 2)
    return jsonify(title=title, rows=rows, note=note, geo=G)


EST_SYS = """Du bist erfahrener Kostenplaner (DIN 276) in Deutschland. Schätze fehlende Kostengruppen für die beschriebene Maßnahme.
Gib je Kostengruppe einen wahrscheinlichen Betrag in Euro netto und eine realistische Spanne an (von/bis), dazu eine kurze Begründung.
Antworte ausschließlich mit JSON: {"schaetzungen":[{"kg":"394","betrag":0,"von":0,"bis":0,"begruendung":"…","sicherheit":"hoch|mittel|gering"}],
"aufteilung_300":{"330":30,…},"aufteilung_400":{"440":30,…},"hinweis":"…"}
Die Aufteilungen sind Prozentanteile, die sich je auf 100 summieren. Nur Kostengruppen aus der Liste „offen“ schätzen."""


@app.post("/api/bk/<int:i>/schaetzen")
def schaetzen(i):
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        d = clean_data(_j(r["data"], {}), c)
        cal = calc(d)
        kinds = [(_j(f["meta"], {}) or {}).get("kind", "") for f in c.execute("SELECT meta FROM bk_files WHERE bk_id=?", (i,))]
        vs, kg2 = schaetzen_intern(d, cal)
        ki = ai.choice_of(g.user)
        prov = {p["key"]: p for p in ai.providers(c)}
        if (request.get_json(silent=True) or {}).get("ki") and (ki == "intern" or not prov.get(ki, {}).get("ok")):   # ✨-Knopf: KI auch bei „Intern“
            ki = next((k for k in ("claude", "gemini", "chatgpt", "ollama") if prov.get(k, {}).get("ok")), ki)
        note, ki_vs, ki_kg2 = "", [], None
        if ki != "intern" and prov.get(ki, {}).get("ok") and cal["bauwerk"]:
            offen = [v["kg"] + " " + v["name"] for v in vs]
            info = {"maßnahme": r["name"], "stufe": STUFE_NAME.get(r["stufe"]), "planarten": kinds,
                    "raumtypen": [{"typ": t["label"], "m2": t["area"], "eur_m2": t["kw"]} for t in cal["types"] if t["area"]],
                    "bauwerk_kg300_400_netto": cal["bauwerk"], "flaeche_m2": cal["area"], "offen": offen,
                    "vorhandene_positionen": [{"kg": x["kg"], "name": x["name"], "betrag": x["amount"]} for x in d["items"] if x["amount"] is not None and not x.get("est")]}
            try:
                o = ai.ask_json(ki, EST_SYS, json.dumps(info, ensure_ascii=False), 2000, c)
                bau = cal["bauwerk"]
                for e in (o.get("schaetzungen") or o.get("_objekte") or [])[:8]:
                    if not isinstance(e, dict):
                        continue
                    kg = re.sub(r"\D", "", str(e.get("kg") or ""))[:3]
                    v, lo, hi = _num(e.get("betrag"), -1), _num(e.get("von"), -1), _num(e.get("bis"), -1)
                    # Plausibilität: zwischen 0 und 30 % der Bauwerkskosten, Spanne geordnet – sonst verwerfen
                    if len(kg) != 3 or not (0 <= lo <= v <= hi <= bau * 0.3) or hi == 0:
                        note += f" KI-Wert für KG {kg or '?'} verworfen (außerhalb plausibler Spanne)."
                        continue
                    ki_vs.append({"kg": kg, "name": DIN.get(kg) or next((x["name"] for x in vs if x["kg"] == kg), f"KG {kg}"), "value": round(v, -2), "low": round(lo, -2), "high": round(hi, -2),
                                  "basis": _s(e.get("begruendung"), 300), "src": "KI · " + prov[ki]["label"],
                                  "sicher": e.get("sicherheit") if e.get("sicherheit") in ("hoch", "mittel", "gering") else "gering"})
                w = {}
                for key in ("aufteilung_300", "aufteilung_400"):
                    a = o.get(key) if isinstance(o.get(key), dict) else {}
                    a = {k: _num(v, 0, 0, 100) for k, v in a.items() if k in KG2 and k[0] == key[-3]}
                    if a and abs(sum(a.values()) - 100) <= 5:
                        w.update(a)
                if w:
                    ki_kg2 = {"werte": w, "basis": "Vorschlag der KI für diese Maßnahme", "src": "KI · " + prov[ki]["label"], "sicher": "gering"}
                if o.get("hinweis"):
                    note = (_s(o["hinweis"], 300) + note).strip()
            except ai.AIError as e:
                note = f"{prov[ki]['label']}: {e}"
        elif ki != "intern":
            note = f"{prov.get(ki, {}).get('label', ki)} ist nicht eingerichtet – nur Faustwerte (Intern)."
        acc = genauigkeit(c, r, d, cal, kinds)
    return jsonify(vorschlaege=vs + ki_vs, kg2=[x for x in (kg2, ki_kg2) if x], ki=ki, note=note.strip(), acc=acc,
                   guete={k: KI_GUETE[k] for k in ("intern", ki) if k in KI_GUETE})


# ---------------------------------------------------------------- Prüfung
def rules(c, r, d, cal, files):
    H = []
    # go: wohin ein Klick auf den Hinweis führt (Reiter + Feld)
    add = lambda lvl, title, text, src="Intern", go=None: H.append({"lvl": lvl, "title": title, "text": text, "src": src, "go": go or {"tab": "kosten"}})
    seen = {}
    for x in d["rooms"]:
        if x["nr"]:
            seen.setdefault((x["floor"], x["nr"]), []).append(x)
    for (fl, nr), xs in seen.items():
        if len(xs) > 1:
            add("hoch", f"Raumnummer {nr} mehrfach vergeben", " und ".join(f"{x['name']} ({x['area']:.2f} m²)".replace(".", ",") for x in xs)
                + " tragen dieselbe Nummer. Bitte im Plan klären.", go={"tab": "plaene", "room": xs[0]["id"]})
    zero = [x for x in d["rooms"] if not x["area"]]
    if zero:
        add("hoch", f"{len(zero)} Räume ohne Fläche", ", ".join(x["name"] or x["nr"] for x in zero[:6]) + " – Fläche fehlt in der Summe.", go={"tab": "plaene", "room": zero[0]["id"], "f": "area"})
    open_ = [x for x in d["rooms"] if not x["ok"]]
    spaet = r["stufe"] in ("berechnung", "voranschlag", "anschlag", "feststellung")
    if open_:
        add("hoch" if spaet else "mittel", f"{len(open_)} Räume noch nicht bestätigt", "Aus dem Plan gelesene Räume bitte unter „Pläne & Mengen“ prüfen und bestätigen.", go={"tab": "plaene", "room": open_[0]["id"]})
    J = cal.get("justage") or {}
    if J.get("k") and (J["k"] > 1.4 or J["k"] < 0.7):
        add("mittel", f"Bauteile und Kennwerte passen nicht zusammen (Faktor {J['k']:.2f})".replace(".", ","),
            f"Die Bauteile ergeben {J['bt_wert']:,.0f} €, der Kennwert-Anteil derselben Kostengruppen wäre {J['bt_kw']:,.0f} €. ".replace(",", ".")
            + ("Die übrigen Gruppen stehen noch unverändert beim Kennwert. " if J.get("rest") == "kw" else "")
            + "Mengen und Einheitspreise prüfen – oder unter „Justage“ die Kennwerte (Region, Preisstand) bzw. die übrigen Gruppen angleichen.",
            go={"tab": "bauteile", "sel": "#justage"})
    if not d["rooms"]:
        add("hoch", "Noch kein Raumbuch", "Grundriss als PDF hochladen oder Räume von Hand anlegen.", go={"tab": "plaene"})
    for t in cal["types"]:
        if t["area"] and not (300 <= t["kw"] <= 6000):
            add("mittel", f"Kennwert {t['label']} ungewöhnlich", f"{t['kw']:,.0f} €/m² liegt außerhalb von 300–6.000 €/m². Tippfehler?".replace(",", "."), go={"tab": "kosten", "sel": f'[data-kw="{t["typ"]}"]'})
    for k, it in enumerate(d["items"]):
        if it["amount"] is None:
            add("mittel" if it["kg"] == "394" else "info", f"KG {it['kg']} {it['name']} offen", "Noch kein Betrag eingetragen – die Summe ist dafür zu niedrig. Anklicken: Positionen und Kosten vorschlagen lassen.",
                go={"tab": "kosten", "sel": f'[data-it="{k}"][data-f="amount"]', "ask": {"thema": "kg", "kg": re.sub(r"\D", "", it["kg"])[:3], "item": k}})
    # DIN 276:2018-12 – Gliederungstiefe, Kostenstand, Kostenrisiken, alle Kostengruppen der 1. Ebene
    eb = STUFE_EBENE.get(r["stufe"], 1)
    if eb >= 2 and not d.get("kg2") and not cal.get("kg2") and cal["bauwerk"]:
        add("mittel", f"DIN 276: {STUFE_NAME[r['stufe']]} mindestens bis zur 2. Ebene",
            "KG 300/400 gehören in die 2. Ebene (z. B. 330 Außenwände, 440 Elektrische Anlagen). Anteile unter „Kosten“ eintragen oder schätzen lassen.",
            "DIN 276", go={"tab": "kosten", "sel": "[data-kg2]"})
    if eb >= 3 and cal["bauwerk"] and not any(len(b.get("kg") or "") == 3 and b["kg"][2] != "0" for b in d.get("bauteile") or []):
        add("mittel", f"DIN 276: {STUFE_NAME[r['stufe']]} bis zur 3. Ebene",
            "Ab der Kostenberechnung verlangt DIN 276 die 3. Ebene (z. B. 331 Tragende Außenwände, 334 Außenwandöffnungen). Unter „Bauteile & Material“ Mengen und Einheitspreise erfassen"
            + (" bzw. die bepreisten Leistungsverzeichnisse übernehmen." if r["stufe"] in ("voranschlag", "anschlag") else "."), "DIN 276", go={"tab": "bauteile"})
    erste = {re.sub(r"\D", "", i["kg"])[:1] for i in d["items"]} | {"3", "4", "7"}
    fehlt = [k for k in "12568" if k not in erste]
    if fehlt:
        add("info", "DIN 276: Kostengruppen " + ", ".join(k + "00" for k in fehlt) + " nicht aufgeführt",
            "Die Norm gliedert die Gesamtkosten in alle Kostengruppen der 1. Ebene. Was nicht zum Auftrag gehört, als Position mit 0 € aufnehmen (z. B. „KG 100 Grundstück – nicht Bestandteil“).",
            "DIN 276", go={"tab": "kosten", "sel": '[data-act="din1"]'})
    if not d.get("risiko") and r["stufe"] in ("rahmen", "schaetzung", "berechnung", "voranschlag"):
        add("info", "Kostenrisiken nicht ausgewiesen", "DIN 276 sieht vor, vorhersehbare Kostenrisiken (z. B. Bestand, Baugrund, Marktlage) gesondert auszuweisen. Unter „Kosten“ einen Zuschlag mit Begründung eintragen.",
            "DIN 276", go={"tab": "kosten", "sel": '[data-set="risiko"]'})
    if r["stufe"] in ("voranschlag", "anschlag", "feststellung"):
        quelle = {"voranschlag": "Preise aus den bepreisten Leistungsverzeichnissen", "anschlag": "Angebots- bzw. Auftragspreise"}.get(r["stufe"], "abgerechnete Beträge aus den Schlussrechnungen")
        for k, it in enumerate(d["items"]):
            if it.get("est"):
                add("mittel", f"KG {it['kg']} {it['name']} nur geschätzt", f"Für den {STUFE_NAME[r['stufe']]} hier {quelle} eintragen.",
                    go={"tab": "kosten", "sel": f'[data-it="{k}"][data-f="amount"]'})
    floors = _floors(d["rooms"])
    if len(floors) == 1 and d["rooms"]:
        add("mittel", "Nur ein Geschoss im Raumbuch", f"Alle Räume gehören zu „{next(iter(floors))}“ – fehlen Grundrisse weiterer Geschosse (OG, KG)?", go={"tab": "plaene", "sel": "#drop"})
    kinds = {(_j(f["meta"], {}) or {}).get("kind") for f in files}
    if "Ansicht" in kinds:
        add("info", "Fassade aus Ansichten noch nicht bewertet", "Die Ansichten sind hochgeladen. Fassaden-, Fenster- und Dachflächen als eigene Positionen ergänzen – anklicken: Flächen und Kosten vorschlagen lassen.", go={"tab": "kosten", "sel": '[data-act="addItem"]', "ask": {"thema": "huelle"}})
    if not r["gantt_id"]:
        add("info", "Kein Bauzeitenplan verknüpft", "Ohne Bauzeitenplan kann der Mittelabfluss nicht berechnet werden.", go={"tab": "mittel", "sel": '[data-link="gantt_id"]'})
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
        if (request.get_json(silent=True) or {}).get("ki") and (ki == "intern" or not prov.get(ki, {}).get("ok")):   # ✨-Knopf: KI auch bei „Intern“
            ki = next((k for k in ("claude", "gemini", "chatgpt", "ollama") if prov.get(k, {}).get("ok")), ki)
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
                out = ai.ask_json(ki, CHECK_SYS, json.dumps(summary, ensure_ascii=False), 2000, c)
                for h in (out.get("hinweise") or out.get("_objekte") or [])[:6]:
                    if isinstance(h, dict) and h.get("titel"):
                        lvl = h.get("stufe") if h.get("stufe") in ("hoch", "mittel", "info") else "info"
                        H.append({"lvl": lvl, "title": _s(h["titel"], 120), "text": _s(h.get("text"), 400), "src": "KI · " + prov[ki]["label"], "go": {"tab": "kosten"}})
            except ai.AIError as e:
                note = f"{prov[ki]['label']}: {e}"
        elif ki != "intern":
            note = f"{prov.get(ki, {}).get('label', ki)} ist nicht eingerichtet – geprüft wurde nur mit den festen Regeln."
    order = {"hoch": 0, "mittel": 1, "info": 2}
    H.sort(key=lambda h: order.get(h["lvl"], 3))
    return jsonify(hinweise=H, ki=ki, note=note)


# ---------------------------------------------------------------- PDF für den Bauherrn
def _floors(rooms):
    """Geschosse im Raumbuch: aus der Planüberschrift (floor) bzw. dem Vorsatz der Raumnummer („0.12“ → 0)."""
    out = set()
    for x in rooms:
        if x["floor"] and re.search(r"geschoss|boden|souterrain", x["floor"], re.I):
            out.add(x["floor"])
        elif x["nr"] and "." in x["nr"]:
            out.add("Geschoss " + x["nr"].split(".")[0])
        elif x["floor"]:
            out.add(x["floor"])
    return out


def kg_rows(d, cal, depth):
    """Kosten nach DIN 276 bis zur gewählten Gliederungstiefe (1 = 100er, 2 = 10er, 3 = Einzelpositionen).
    Ergebnis: Liste von (Ebene, KG, Bezeichnung, Betrag oder None = offen)."""
    leaves = []   # (KG dreistellig, Bezeichnung, Betrag | None)
    if cal.get("kg2"):   # Kostenberechnung mit Bauteilen: je Gruppe der 2. Ebene Bauteile oder Kennwert-Anteil
        for k, x in sorted(cal["kg2"].items()):
            if x["quelle"] == "bauteile":
                for b in d["bauteile"]:
                    if b["kg"][:2] + "0" == k:
                        leaves.append((b["kg"], b["name"] + (f" – {b['mat']}" if b["mat"] else "") + f" ({str(round(b['menge'], 2)).replace('.', ',')} {b['einheit']})", _bt_betrag(b)))
            elif x["wert"]:
                leaves.append((k, "aus Kennwerten (noch ohne Bauteile)", x["wert"]))
    for main, total in ((("300", cal["kg300"]), ("400", cal["kg400"])) if not cal.get("kg2") else ()):
        rest = 100.0
        for k in KG2:
            if k[0] == main[0] and d["kg2"].get(k):
                leaves.append((k, f"aus Kennwerten ({d['kg2'][k]:g} % von KG {main})".replace(".", ","), total * d["kg2"][k] / 100)); rest -= d["kg2"][k]
        if total and rest > 0.01:
            leaves.append((main, "nicht weiter aufgeteilt (Kennwerte je Raumtyp)" if rest > 99.99 else "nicht zugeordneter Rest", total * rest / 100))
    for it in d["items"]:
        kg = re.sub(r"\D", "", it["kg"])[:3]
        if len(kg) == 3 and kg != "700":
            leaves.append((kg, (it["name"] or DIN.get(kg, "")) + (" (geschätzt)" if it.get("est") else ""), it["amount"]))
    leaves.append(("700", "Baunebenkosten", cal["nk"]))

    def tot(xs):
        return None if xs and all(x[2] is None for x in xs) else sum(x[2] or 0 for x in xs)

    rows = []
    for g1 in sorted({k[0] + "00" for k, _, _ in leaves}):
        L1 = [x for x in leaves if x[0][0] == g1[0]]
        rows.append((1, g1, DIN.get(g1, ""), tot(L1), any(x[2] is None for x in L1)))
        if depth < 2 or (len(L1) == 1 and L1[0][0] == g1):   # nur ein Betrag für die ganze Gruppe: keine Unterzeilen
            continue
        for g2 in sorted({x[0][:2] + "0" for x in L1 if x[0] != g1}):
            L2 = [x for x in L1 if x[0][:2] == g2[:2] and x[0] != g1]
            rows.append((2, g2, DIN.get(g2, L2[0][1]), tot(L2), any(x[2] is None for x in L2)))
            if depth >= 3 and (len(L2) > 1 or L2[0][0] != g2):
                for x in L2:
                    rows.append((3, x[0] if x[0] != g2 else "", x[1], x[2], x[2] is None))
        for x in L1:   # Beträge direkt auf der 1. Ebene (z. B. KG 300 nicht weiter aufgeteilt)
            if x[0] == g1:
                rows.append((2, "", x[1], x[2], x[2] is None))
    return rows


def _office():
    try:
        with db.tx() as c:
            r = c.execute("SELECT value FROM settings WHERE key='office_name'").fetchone()
        return (r["value"] if r else "") or ""
    except Exception:
        return ""


def build_report(c, r, opt):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle)
    from reportlab.graphics.shapes import Drawing, Rect, String, Line
    from xml.sax.saxutils import escape as X

    d = clean_data(_j(r["data"], {}), c)
    cal = calc(d)
    o = _out(c, r, False)
    parts = opt["teile"]
    mw = opt["mwst"] / 100
    fac = 1 + mw if opt["brutto"] else 1
    rnd = opt["runden"]
    basis = f"brutto inkl. {opt['mwst']:g} % MwSt." if opt["brutto"] else "netto zzgl. MwSt."

    def eur(v, raw=False, kw=False):
        if v is None:
            return "offen"
        v = v * (1 if raw else fac)
        if rnd and not kw:   # Kennwerte je m² nicht runden
            v = round(v / rnd) * rnd
        return f"{v:,.0f} €".replace(",", ".")

    def m2(v):
        return f"{v:,.2f}".replace(",", "§").replace(".", ",").replace("§", ".")

    INK, MUTE, ACC, LINE, BAND = colors.HexColor("#1c1c1a"), colors.HexColor("#5e5b55"), colors.HexColor("#9c4a22"), colors.HexColor("#d9d6cf"), colors.HexColor("#f4f3ef")
    S = {
        "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=22, leading=27, textColor=INK, spaceAfter=4),
        "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13.5, leading=17, textColor=INK, spaceBefore=6, spaceAfter=8),
        "p": ParagraphStyle("p", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=INK),
        "m": ParagraphStyle("m", fontName="Helvetica", fontSize=8.5, leading=11.5, textColor=MUTE),
        "big": ParagraphStyle("big", fontName="Helvetica-Bold", fontSize=26, leading=30, textColor=INK),
        "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=9, leading=11.5, textColor=INK),
    }
    office = _office()
    proj = o.get("project") or {}
    title = r["name"]
    stufe = STUFE_NAME.get(r["stufe"], r["stufe"])
    today = date.today().strftime("%d.%m.%Y")
    W = A4[0] - 36 * mm

    def table(data, widths, num_cols=(), head=True, bold_rows=(), level=None):
        t = Table(data, colWidths=widths, repeatRows=1 if head else 0)
        st = [("FONT", (0, 0), (-1, -1), "Helvetica", 9), ("TEXTCOLOR", (0, 0), (-1, -1), INK),
              ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
              ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE)]
        if head:
            st += [("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8.5), ("TEXTCOLOR", (0, 0), (-1, 0), MUTE), ("LINEBELOW", (0, 0), (-1, 0), 0.8, INK)]
        for ci in num_cols:
            st.append(("ALIGN", (ci, 0), (ci, -1), "RIGHT"))
        for ri in bold_rows:
            st += [("FONT", (0, ri), (-1, ri), "Helvetica-Bold", 9.5), ("BACKGROUND", (0, ri), (-1, ri), BAND)]
        t.setStyle(TableStyle(st))
        return t

    story = []
    logo = C.print_logo()

    # Deckblatt
    if "deckblatt" in parts:
        if logo:
            try:
                from reportlab.lib.utils import ImageReader
                ImageReader(io.BytesIO(logo)).getSize()   # nicht lesbares Logo erst beim Bauen des PDFs zu bemerken, ließe alles scheitern
                story += [Image(io.BytesIO(logo), width=28 * mm, height=28 * mm, kind="proportional", hAlign="RIGHT"), Spacer(1, 18 * mm)]
            except Exception:
                story.append(Spacer(1, 46 * mm))
        else:
            story.append(Spacer(1, 46 * mm))
        story += [Paragraph(X(stufe) + " nach DIN 276", ParagraphStyle("k", parent=S["m"], fontSize=11, textColor=ACC)), Spacer(1, 4),
                  Paragraph(X(proj.get("name") or title), S["h1"])]
        if proj.get("address"):
            story.append(Paragraph(X(proj["address"]), S["p"]))
        story.append(Spacer(1, 22 * mm))
        ks = d.get("kostenstand") or ""
        rows = [["Bauherr", proj.get("client") or "—"], ["Stand", today], ["Kostenstand", f"{ks[5:7]}/{ks[:4]}" if ks else today], ["Kostenbasis", basis],
                ["Grundlage", "DIN 276:2018-12, Kostengliederung bis zur " + f"{STUFE_EBENE.get(r['stufe'], 1)}. Ebene"]]
        if office:
            rows.append(["Aufgestellt", office])
        t = Table(rows, colWidths=[40 * mm, W - 40 * mm])
        t.setStyle(TableStyle([("FONT", (0, 0), (0, -1), "Helvetica", 9), ("TEXTCOLOR", (0, 0), (0, -1), MUTE), ("FONT", (1, 0), (1, -1), "Helvetica-Bold", 10),
                               ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
        story += [t, Spacer(1, 14 * mm), Paragraph("Gesamtkosten", S["m"]), Paragraph(eur(cal["total"]), S["big"]),
                  Paragraph(basis + (f", gerundet auf {rnd:,} €".replace(",", ".") if rnd else ""), S["m"])]
        if "genauigkeit" in parts:
            kinds = [(_j(f["meta"], {}) or {}).get("kind", "") for f in c.execute("SELECT meta FROM bk_files WHERE bk_id=?", (r["id"],))]
            acc = genauigkeit(c, r, d, cal, kinds)
            story += [Spacer(1, 4), Paragraph(f"wahrscheinlich zwischen {eur(acc['low'])} und {eur(acc['high'])}", S["m"])]
        story.append(PageBreak())

    # Zusammenfassung
    if "zusammenfassung" in parts:
        story.append(Paragraph("Zusammenfassung", S["h2"]))
        rows = [["", "Betrag"], ["Bauwerk (KG 300 + 400)", eur(cal["bauwerk"])], ["Weitere Kostengruppen", eur(cal["extra"])],
                ["Baunebenkosten (KG 700)", eur(cal["nk"])]]
        if cal.get("risiko"):
            rows.append([f"Kostenrisiken ({d['risiko']:g} %)".replace(".", ",") + (f" – {d['risiko_text']}" if d.get("risiko_text") else ""), eur(cal["risiko"])])
        if opt["brutto"]:
            rows += [["Gesamt netto", eur(cal["total"], True)], [f"MwSt. {opt['mwst']:g} %", eur(cal["total"] * mw, True)], ["Gesamt brutto", eur(cal["total"] * (1 + mw), True)]]
        else:
            rows += [["Gesamt netto", eur(cal["total"])]]
        story.append(table(rows, [W - 50 * mm, 50 * mm], num_cols=(1,), bold_rows=(len(rows) - 1,)))
        story += [Spacer(1, 8), Paragraph(f"Raumfläche {m2(cal['area'])} m² · Kennwert Bauwerk {eur(cal['kw'], kw=True)} je m² Raumfläche ({'brutto' if opt['brutto'] else 'netto'})", S["m"]), Spacer(1, 14)]

    # Genauigkeit
    if "genauigkeit" in parts:
        kinds = [(_j(f["meta"], {}) or {}).get("kind", "") for f in c.execute("SELECT meta FROM bk_files WHERE bk_id=?", (r["id"],))]
        acc = genauigkeit(c, r, d, cal, kinds)
        rows = [["Einfluss", "Spanne"]] + [[Paragraph(X(f["text"]) + (f"<br/><font color='#5e5b55' size='8'>{X(f['tipp'])}</font>" if f["tipp"] else ""), S["cell"]),
                                            ("nur nach oben " if f.get("oben") else "± ") + f"{f['plus']:g} %"] for f in acc["faktoren"]]
        story += [KeepTogether([Paragraph("Genauigkeit der Kostenermittlung", S["h2"]),
                                Paragraph(f"Die Gesamtkosten liegen nach heutigem Stand wahrscheinlich zwischen <b>{eur(acc['low'])}</b> und <b>{eur(acc['high'])}</b> "
                                          f"(−{acc['lo_pct']:g} % / +{acc['hi_pct']:g} %, {X(acc['urteil'])}). Die Spanne ist nach oben größer, weil offene und unsichere Punkte "
                                          "die Kosten eher erhöhen als senken.", S["p"]), Spacer(1, 6),
                                table(rows, [W - 40 * mm, 40 * mm], num_cols=(1,))]), Spacer(1, 14)]

    # Kostengruppen
    if "kosten" in parts:
        depth = opt["tiefe"]
        rows = [["KG", "Bezeichnung", "Betrag"]]
        bold, styles = [], []
        for lvl, kg, name, v, open_ in kg_rows(d, cal, depth):
            ind = "    " * (lvl - 1)
            rows.append([kg, Paragraph(X(ind) + ("<b>" if lvl == 1 else "") + X(name) + ("</b>" if lvl == 1 else "") + (" <font color='#9c4a22'>(teilweise offen)</font>" if open_ and v is not None else ""), S["cell"]), eur(v)])
            if lvl == 1:
                bold.append(len(rows) - 1)
        if cal.get("risiko"):
            rows.append(["", Paragraph(X(f"Kostenrisiken, gesondert ausgewiesen ({d['risiko']:g} %)".replace(".", ",") + (f": {d['risiko_text']}" if d.get("risiko_text") else "")), S["cell"]), eur(cal["risiko"])])
        rows.append(["", Paragraph("<b>Gesamt</b>", S["cell"]), eur(cal["total"])])
        story += [Paragraph(f"Kosten nach DIN 276 – {depth}. Gliederungsebene", S["h2"]), table(rows, [16 * mm, W - 56 * mm, 40 * mm], num_cols=(2,), bold_rows=bold + [len(rows) - 1]),
                  Spacer(1, 4), Paragraph(basis + (" · gerundet" if rnd else "") + ". „offen“ = noch nicht ermittelt, in der Summe nicht enthalten.", S["m"]), Spacer(1, 14)]

    # Raumtypen / Kennwerte
    if "raumtypen" in parts:
        rows = [["Raumtyp", "Räume", "Fläche m²", "€ / m²", "Kosten"]]
        for t in cal["types"]:
            if t["n"]:
                rows.append([t["label"], str(t["n"]), m2(t["area"]), eur(t["kw"], kw=True), eur(t["sum"])])
        J = cal["justage"]
        ar = cal["area"] or 1
        rows.append(["Summe Kennwerte", str(len(d["rooms"])), m2(cal["area"]), eur(cal["kw_summe"] / ar, kw=True), eur(cal["kw_summe"])])
        if abs(J["faktor"] - 1) > 1e-6:
            rows.append([f"Justage: Regionalfaktor {J['region']:g} % × Preisstand {J['preis']:g} %".replace(".", ","), "", "", f"× {J['faktor']:.3f}".replace(".", ","), eur(cal["bauwerk_kw"])])
        if cal["kg2"]:
            rows.append(["Bauwerk mit Bauteilen (Kostenberechnung)", "", "", eur(cal["bauwerk"] / ar, kw=True), eur(cal["bauwerk"])])
        story += [KeepTogether([Paragraph("Kosten nach Nutzung (Kennwerte)", S["h2"]), table(rows, [W - 110 * mm, 18 * mm, 28 * mm, 28 * mm, 36 * mm], num_cols=(1, 2, 3, 4), bold_rows=(len(rows) - 1,))]), Spacer(1, 14)]

    # Raumbuch
    if "raumbuch" in parts and d["rooms"]:
        names = dict((k, v["label"]) for k, v in d["types"].items())
        rows = [["Nr.", "Raum", "Nutzung", "Fläche m²"]] + [[x["nr"], Paragraph(X(x["name"]), S["cell"]), names.get(x["typ"], ""), m2(x["area"])]
                                                          for x in sorted(d["rooms"], key=lambda x: (x["floor"], x["nr"]))]
        rows.append(["", "Summe", "", m2(cal["area"])])
        story += [Paragraph("Raumbuch", S["h2"]), table(rows, [16 * mm, W - 90 * mm, 50 * mm, 24 * mm], num_cols=(3,), bold_rows=(len(rows) - 1,)), Spacer(1, 14)]

    # Mittelabfluss
    if "mittelabfluss" in parts:
        fl = flow(c, r, d, cal)
        story.append(Paragraph("Mittelabfluss", S["h2"]))
        if not fl["ok"]:
            story += [Paragraph(X(fl["why"]), S["m"]), Spacer(1, 14)]
        else:
            M = fl["months"]
            dr = Drawing(W, 150)
            mx = max(m["idx"] for m in M) or 1
            bw = (W - 20) / max(1, len(M))
            for i, m in enumerate(M):
                h = m["idx"] / mx * 110
                dr.add(Rect(10 + i * bw + bw * 0.18, 24, bw * 0.64, h, fillColor=ACC, strokeColor=None))
                if len(M) <= 18 or i % 2 == 0:
                    dr.add(String(10 + i * bw + bw / 2, 10, ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][int(m["ym"][5:]) - 1] + " " + m["ym"][2:4],
                                  fontName="Helvetica", fontSize=7, fillColor=MUTE, textAnchor="middle"))
            dr.add(Line(10, 24, W - 10, 24, strokeColor=LINE, strokeWidth=0.6))
            mon = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
            rows = [["Monat", "Betrag", "kumuliert"]] + [[f"{mon[int(m['ym'][5:]) - 1]} {m['ym'][:4]}", eur(m["idx"]), eur(m["cum_idx"])] for m in M]
            rows.append(["Summe", eur(fl["total_idx"]), ""])
            story += [Paragraph(f"Verteilung über den Bauzeitenplan „{X(fl['plan'])}“ ({date.fromisoformat(fl['start']).strftime('%d.%m.%Y')} bis {date.fromisoformat(fl['end']).strftime('%d.%m.%Y')}), "
                                f"inkl. Baupreisindex {d['rate']:g} % p. a.; ohne Baunebenkosten.", S["m"]), Spacer(1, 6), dr, Spacer(1, 6),
                      table(rows, [W - 90 * mm, 45 * mm, 45 * mm], num_cols=(1, 2), bold_rows=(len(rows) - 1,)), Spacer(1, 14)]

    # Erläuterungen
    if "erlaeuterungen" in parts:
        story.append(Paragraph("Erläuterungen und Annahmen", S["h2"]))
        if d["notes"]:
            for para in d["notes"].split("\n\n"):
                story += [Paragraph(X(para).replace("\n", "<br/>"), S["p"]), Spacer(1, 5)]
        auto = [f"Kostenstufe: {stufe}. Kostenbasis: {basis}" + (f", Beträge gerundet auf {rnd:,} €".replace(",", ".") if rnd else "") + "."]
        offen = [f"KG {i['kg']} {i['name']}" for i in d["items"] if i["amount"] is None]
        if offen:
            auto.append("Noch nicht ermittelt und in der Summe nicht enthalten: " + ", ".join(offen) + ".")
        auto.append(f"Baunebenkosten pauschal mit {d['nk']:g} % angesetzt.")
        for it in d["items"]:
            if it.get("est"):
                auto.append(f"KG {it['kg']} {it['name']} geschätzt ({it['est']['src']}): Spanne {eur(it['est']['low'])} bis {eur(it['est']['high'])}. {it['est']['basis']}")
        kinds = [(_j(f["meta"], {}) or {}).get("kind") for f in c.execute("SELECT meta FROM bk_files WHERE bk_id=?", (r["id"],))]
        if "Grundriss" in kinds:
            auto.append("Flächen aus den Raumstempeln der Grundrisse (Vorentwurf) übernommen.")
        for a in auto:
            story += [Paragraph("• " + X(a), S["p"]), Spacer(1, 3)]
        story.append(Spacer(1, 14))

    if "quellen" in parts:
        story.append(Paragraph("Grundlagen und Quellen", S["h2"]))
        story += [Paragraph("Woher Flächen, Kennwerte, Anteile und Preise dieser Kostenermittlung stammen.", S["m"]), Spacer(1, 6)]
        for q in quellen(c, r, d, cal):
            story += [Paragraph(f"<b>{X(q['t'])}</b><br/>{X(q['x'])}", S["p"]), Spacer(1, 6)]
        story.append(Spacer(1, 8))

    # Pläne
    if "plaene" in parts:
        files = c.execute("SELECT id, name, data FROM bk_files WHERE bk_id=? ORDER BY id", (r["id"],)).fetchall()
        for f in files:
            try:
                png = preview_png(bytes(f["data"]), width=1800)
            except Exception:
                continue
            from PIL import Image as PI
            w, h = PI.open(io.BytesIO(png)).size
            ih = min(A4[1] - 60 * mm, W * h / w)
            story += [PageBreak(), Paragraph("Planunterlage: " + X(f["name"]), S["h2"]), Image(io.BytesIO(png), width=ih * w / h, height=ih)]

    buf = io.BytesIO()

    def frame(cv, doc):
        cv.saveState()
        cv.setFont("Helvetica", 7.5); cv.setFillColor(MUTE)
        cv.drawString(18 * mm, 10 * mm, f"{proj.get('name') or title} · {stufe} · Stand {today}")
        cv.drawRightString(A4[0] - 18 * mm, 10 * mm, (office + " · " if office else "") + f"Seite {doc.page}")
        cover = doc.page == 1 and "deckblatt" in parts
        if not cover:   # Logo in der Kopfzeile jeder Seite (das Deckblatt zeigt es groß)
            C.draw_logo(cv, A4[0] - 18 * mm, A4[1] - 6 * mm, 11 * mm, 45 * mm)
        cv.setStrokeColor(ACC); cv.setLineWidth(1.2); cv.line(18 * mm, A4[1] - 19 * mm, A4[0] - 18 * mm, A4[1] - 19 * mm)
        cv.restoreState()

    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=24 * mm, bottomMargin=18 * mm,
                            title=f"{stufe} – {proj.get('name') or title}", author=office or "Bauplattform")
    if not story:
        story = [Paragraph("Keine Inhalte gewählt.", S["p"])]
    doc.build(story, onFirstPage=frame, onLaterPages=frame)
    return buf.getvalue()


TEILE = ("deckblatt", "zusammenfassung", "genauigkeit", "kosten", "raumtypen", "raumbuch", "mittelabfluss", "erlaeuterungen", "quellen", "plaene")


@app.get("/api/bk/<int:i>/bericht.pdf")
def bericht(i):
    a = request.args
    opt = {"teile": [t for t in (a.get("teile") or ",".join(TEILE)).split(",") if t in TEILE],
           "tiefe": int(_num(a.get("tiefe"), 2, 1, 3)), "brutto": a.get("brutto") == "1", "mwst": _num(a.get("mwst"), 19, 0, 30),
           "runden": int(a.get("runden")) if a.get("runden") in ("0", "100", "1000") else 0}
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        try:
            pdf = build_report(c, r, opt)
        except Exception as e:   # Grund anzeigen statt stillem Fehler 500
            app.logger.exception("Kosten-PDF")
            return jsonify(error=f"{type(e).__name__}: {str(e)[:200]}"), 500
    C.audit(g.user["name"], "export", "Kosten-PDF erstellt", f"{r['name']} · Ebene {opt['tiefe']} · {', '.join(opt['teile'])}")
    from urllib.parse import quote
    fn = re.sub(r"[\\/:*?\"<>|]+", "_", f"{STUFE_NAME.get(r['stufe'], 'Kosten')} {r['name']}.pdf")
    return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(fn)}"})


C.wait_schema()
