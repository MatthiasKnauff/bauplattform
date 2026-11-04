"""Ausschreibung & Abrechnung (AVA): Leistungsverzeichnisse, Angebote mit Preisspiegel, Vergabe, Aufmaß, Nachträge, Rechnungsprüfung.

Daten: Tabellen ava_lv, ava_angebot, ava_aufmass, ava_rechnung (pg_migrations/0013_ava.sql im Bautagebuch).
Ein LV gehört zu einem Projekt des Bautagebuchs. Positionen stehen als JSON-Liste in ava_lv.data (Titel und Positionen,
Reihenfolge = Liste). Austausch mit Firmen über GAEB DA XML (bpcore/gaeb.py: X83 Angebotsaufforderung, X84 Angebot,
X86 Auftrag) oder Excel.

Rechnen (rechne): Angebots- und Auftragssumme aus Menge × Einheitspreis der Normal- und Pauschalpositionen (Bedarfs- und
Wahlpositionen ohne Gesamtbetrag), Nachlass in Prozent. Abrechnung kumuliert: Leistungsstand = Aufmaß × Auftrags-EP,
- Nachlass - Abzüge - Sicherheitseinbehalt = anerkannt; Zahlbetrag = anerkannt - bisher anerkannt (vorige Rechnungen).
"""
import ast, io, json, operator, re, uuid
from datetime import date, datetime

from flask import Response, g, jsonify, redirect, request

from bpcore import ai, db, gaeb, platform, schrift, sso, versionen
import common as C

app = C.make_app(__name__)
MWST = 19.0
ARTEN = {"N": "Normalposition", "E": "Bedarfsposition (ohne GB)", "A": "Wahlposition (ohne GB)", "P": "Pauschal", "T": "Hinweistext"}
STATUS = ("entwurf", "versendet", "vergeben", "abgerechnet")


@app.before_request
def guard():
    p = request.path
    if p.startswith(("/static/", "/bp/")) or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base("ava") + "/")), 401
        return redirect(C.login_url(request.url))
    if not sso.has_app(u, "ava"):
        msg = "Für „Ausschreibung & Abrechnung“ ist dein Konto nicht freigeschaltet."
        if p.startswith("/api/"):
            return jsonify(error=msg), 403
        return (f'{msg} <a href="{C.app_base("portal")}/">Zur Startseite</a>', 403, {"Content-Type": "text/html; charset=utf-8"})
    g.user = u


@app.get("/")
def index():
    return C.page("ava.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


# ---------------------------------------------------------------- Hilfen
def _j(v, d):
    try:
        x = json.loads(v) if isinstance(v, str) else v
        return x if x is not None else d
    except (TypeError, ValueError):
        return d

def _latin(t):
    """Formularfelder (Entwurf) können nur Latin-1 – der Editor arbeitet ohnehin mit den Originaltexten."""
    t = str(t or "").translate({0x2013: "-", 0x2014: "-", 0x201E: '"', 0x201C: '"', 0x201D: '"', 0x2018: "'", 0x2019: "'", 0x2026: "...", 0x20AC: "EUR"})
    return t.encode("latin-1", "replace").decode("latin-1")



def _now():
    return datetime.now().isoformat(timespec="seconds")


def _s(v, n=200):
    return str(v or "").strip()[:n]


def _f(v, d=0.0, lo=-1e12, hi=1e12):
    try:
        x = float(str(v).replace(",", ".")) if isinstance(v, str) else float(v)
        return max(lo, min(hi, x)) if x == x else d
    except (TypeError, ValueError):
        return d


def _fn(v):
    """Zahl oder None (leeres Feld)."""
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    x = _f(v, None)
    return None if x is None else round(x, 4)


def _sees(c, pid):
    r = c.execute("SELECT id, name, street, zip, city, client, leaders, archived FROM projects WHERE id=?", (pid,)).fetchone()
    if not r:
        return None
    lead = _j(r["leaders"], []) or []
    return r if g.user["is_admin"] or not lead or g.user["id"] in lead else None


def _lv(c, i):
    r = c.execute("SELECT * FROM ava_lv WHERE id=?", (i,)).fetchone()
    if not r or (r["project_id"] and not _sees(c, r["project_id"])):
        return None
    return r


_OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv, ast.USub: operator.neg, ast.UAdd: operator.pos}


def formel(s):
    """Rechenweg der Massenermittlung, z. B. „2 × 3,50 × 2,75 – 0,885 × 2,135“. Gibt die Zahl oder None zurück."""
    t = str(s or "").strip()
    if not t:
        return None
    t = t.replace("×", "*").replace("·", "*").replace("x", "*").replace("X", "*").replace("÷", "/").replace("–", "-").replace("−", "-").replace(":", "/")
    t = re.sub(r"(?<=\d)\.(?=\d{3}(\D|$))", "", t)   # Tausenderpunkt
    t = t.replace(",", ".")
    if not re.fullmatch(r"[\d\s.+\-*/()]+", t):
        return None
    try:
        node = ast.parse(t, mode="eval").body

        def ev(n):
            if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)):
                return float(n.value)
            if isinstance(n, ast.BinOp) and type(n.op) in _OPS:
                return _OPS[type(n.op)](ev(n.left), ev(n.right))
            if isinstance(n, ast.UnaryOp) and type(n.op) in _OPS:
                return _OPS[type(n.op)](ev(n.operand))
            raise ValueError
        return round(ev(node), 4)
    except Exception:
        return None


# ---------------------------------------------------------------- LV-Inhalt säubern und nummerieren
def clean_items(v):
    out, seen = [], set()
    for x in (v if isinstance(v, list) else [])[:3000]:
        if not isinstance(x, dict):
            continue
        i = _s(x.get("id"), 40) or uuid.uuid4().hex[:10]
        while i in seen:
            i = uuid.uuid4().hex[:10]
        seen.add(i)
        if x.get("typ") == "titel":
            out.append({"id": i, "typ": "titel", "lvl": max(1, min(4, int(_f(x.get("lvl"), 1)))), "oz": _s(x.get("oz"), 40), "kurz": _s(x.get("kurz"), 300)})
            continue
        art = x.get("art") if x.get("art") in ARTEN else "N"
        p = {"id": i, "typ": "pos", "oz": _s(x.get("oz"), 40), "kurz": _s(x.get("kurz"), 500), "lang": _s(x.get("lang"), 20000),
             "menge": round(_f(x.get("menge"), 0, 0, 1e9), 3), "einheit": _s(x.get("einheit"), 12), "art": art,
             "kg": re.sub(r"\D", "", str(x.get("kg") or ""))[:3], "ep_s": _fn(x.get("ep_s"))}
        # weitere Eigenschaften (Dialog „Eigenschaften“): nur speichern, was gesetzt ist
        for k, n in (("kg81", 3), ("lb", 80), ("bezug", 40), ("quelle", 200), ("mf", 500)):
            v = re.sub(r"\D", "", str(x.get(k) or ""))[:3] if k == "kg81" else _s(x.get(k), n)
            if v:
                p[k] = v
        for k in ("gb", "entf", "sp", "np_vor", "np_nach"):
            if x.get(k):
                p[k] = True
        if x.get("nt"):   # Nachtrag
            p["nt"] = _s(x.get("nt"), 20)
            p["nt_status"] = x.get("nt_status") if x.get("nt_status") in ("angemeldet", "beauftragt", "abgelehnt") else "angemeldet"
            p["nt_grund"] = _s(x.get("nt_grund"), 1000)
        out.append(p)
    return out


def nummerieren(items, schritt=10):
    """Ordnungszahlen neu vergeben: Titel 01, 02 … (Untertitel 01.01), Positionen 0010, 0020 … je Titel."""
    stack, cnt, top = [], {}, 0
    for x in items:
        if x["typ"] == "titel":
            lvl = x.get("lvl") or 1
            while stack and stack[-1][0] >= lvl:
                stack.pop()
            par = stack[-1][1] if stack else ""
            cnt[par] = cnt.get(par, 0) + 1
            x["oz"] = (par + "." if par else "") + str(cnt[par]).zfill(2)
            stack.append((lvl, x["oz"]))
            cnt[x["oz"] + "#p"] = 0
        elif x.get("art") == "T":
            x["oz"] = ""
        else:
            par = stack[-1][1] if stack else ""
            k = par + "#p"
            cnt[k] = cnt.get(k, 0) + schritt
            x["oz"] = (par + "." if par else "") + str(cnt[k]).zfill(4)
    return items


# ---------------------------------------------------------------- Rechnen
def _gp(p, ep):
    return round((p.get("menge") or 0) * ep, 2) if ep is not None else 0.0


def zaehlt(p):
    """Gehört die Position in die Summe? Normal- und Pauschalpositionen, Bedarfspositionen „mit Gesamtpreis“;
    nicht: Wahlpositionen, Bedarfspositionen ohne Gesamtpreis, entfallene Positionen, Nachträge (die zählen extra)."""
    return p["typ"] == "pos" and (p.get("art") in ("N", "P") or (p.get("art") == "E" and p.get("gb"))) and not p.get("nt") and not p.get("entf")


def rechne(lv, angebote, aufmass, rechnungen):
    d = _j(lv["data"], {}) or {}
    items = d.get("items") or []
    pos = [p for p in items if p["typ"] == "pos" and p.get("art") != "T"]
    V = _j(lv["vergabe"], {}) or {}
    VP = V.get("preise") or {}
    nl = (V.get("nachlass") or 0) / 100
    schaetz = sum(_gp(p, p.get("ep_s")) for p in pos if zaehlt(p) and p.get("ep_s") is not None)
    ohne_s = sum(1 for p in pos if zaehlt(p) and p.get("ep_s") is None)
    # Angebote
    A = []
    for a in angebote:
        pr = _j(a["preise"], {}) or {}
        brutto = sum(_gp(p, _fn(pr.get(p["id"]))) for p in pos if zaehlt(p))
        fehlt = sum(1 for p in pos if zaehlt(p) and _fn(pr.get(p["id"])) is None)
        netto = brutto * (1 - (a["nachlass"] or 0) / 100)
        A.append({"id": a["id"], "summe": round(brutto, 2), "netto": round(netto, 2), "fehlt": fehlt})
    for k, x in enumerate(sorted([x for x in A if x["summe"]], key=lambda x: x["netto"])):
        x["rang"] = k + 1
    # Auftrag und Nachträge
    auftrag = sum(_gp(p, _fn(VP.get(p["id"]))) for p in pos if zaehlt(p)) * (1 - nl) if VP else 0.0
    nt = {"angemeldet": 0.0, "beauftragt": 0.0, "abgelehnt": 0.0}
    for p in pos:
        if p.get("nt") and not p.get("entf") and _fn(VP.get(p["id"])) is not None:
            nt[p.get("nt_status") or "angemeldet"] += _gp(p, _fn(VP.get(p["id"]))) * (1 - nl)
    # Aufmaß je Position
    am = {}
    for r in aufmass:
        am[r["pos_id"]] = am.get(r["pos_id"], 0.0) + (r["menge"] or 0)

    def stand_wert(stand):
        """Leistungsstand: Menge × Auftrags-EP (abgelehnte Nachträge zählen nicht)."""
        s = 0.0
        for p in pos:
            m = stand.get(p["id"])
            if not m or (p.get("nt") and p.get("nt_status") == "abgelehnt"):
                continue
            ep = _fn(VP.get(p["id"]))
            if ep is not None:
                s += round(m * ep, 2)
        return s
    R, vorher = [], 0.0
    for r in sorted(rechnungen, key=lambda r: r["nr"]):
        rd = _j(r["data"], {}) or {}
        stand = rd.get("stand") if r["status"] == "geprueft" and isinstance(rd.get("stand"), dict) else am
        L = stand_wert(stand)
        N = L * nl
        L1 = L - N
        abz = 0.0
        for z in rd.get("abzuege") or []:
            abz += L1 * (_f(z.get("pct")) / 100) if z.get("pct") not in (None, "") else _f(z.get("betrag"))
        L2 = L1 - abz
        eb_pct = _f(rd.get("einbehalt"), _f(V.get("einbehalt"), 5.0)) if rd.get("einbehalt") not in (None, "") else _f(V.get("einbehalt"), 5.0)
        E = L2 * eb_pct / 100
        L3 = L2 - E
        Z = L3 - vorher
        R.append({"id": r["id"], "leistung": round(L, 2), "nachlass": round(N, 2), "abzuege": round(abz, 2), "einbehalt_pct": eb_pct, "einbehalt": round(E, 2),
                  "anerkannt": round(L3, 2), "vorher": round(vorher, 2), "zahlung": round(Z, 2), "mwst": round(Z * MWST / 100, 2),
                  "brutto": round(Z * (1 + MWST / 100), 2), "differenz": round((r["gefordert"] or 0) - L1, 2) if r["gefordert"] else None,
                  "live": r["status"] != "geprueft"})
        if r["status"] == "geprueft":
            vorher = L3
    leistung = stand_wert(am)
    return {"schaetzung": round(schaetz, 2), "ohne_schaetzung": ohne_s, "angebote": A, "auftrag": round(auftrag, 2),
            "nachtraege": {k: round(v, 2) for k, v in nt.items()}, "aufmass": {k: round(v, 4) for k, v in am.items()},
            "leistung": round(leistung * (1 - nl), 2), "rechnungen": R,
            "abgerechnet": max([x["anerkannt"] for x in R if not x["live"]] or [0])}


def _payload(c, r):
    ang = c.execute("SELECT * FROM ava_angebot WHERE lv_id=? ORDER BY id", (r["id"],)).fetchall()
    am = c.execute("SELECT * FROM ava_aufmass WHERE lv_id=? ORDER BY pos_id, datum, id", (r["id"],)).fetchall()
    re_ = c.execute("SELECT * FROM ava_rechnung WHERE lv_id=? ORDER BY nr", (r["id"],)).fetchall()
    p = _sees(c, r["project_id"]) if r["project_id"] else None
    return {"id": r["id"], "project_id": r["project_id"], "projekt": p["name"] if p else "", "bk_id": r["bk_id"], "nr": r["nr"], "name": r["name"],
            "gewerk": r["gewerk"], "status": r["status"], "archived": bool(r["archived"]), "rev": r["rev"], "updated": r["updated"], "updated_by": r["updated_by"],
            "data": _j(r["data"], {}) or {}, "vergabe": _j(r["vergabe"], {}) or {},
            "angebote": [{"id": a["id"], "contact_id": a["contact_id"], "bieter": a["bieter"], "eingang": a["eingang"], "preise": _j(a["preise"], {}),
                          "nachlass": a["nachlass"], "skonto": a["skonto"], "notiz": a["notiz"], "quelle": a["quelle"]} for a in ang],
            "aufmass": [{"id": x["id"], "pos_id": x["pos_id"], "datum": x["datum"], "ort": x["ort"], "formel": x["formel"], "menge": x["menge"], "quelle": x["quelle"],
                         "user": x["user_name"]} for x in am],
            "rechnungen": [{"id": x["id"], "nr": x["nr"], "art": x["art"], "datum": x["datum"], "eingang": x["eingang"], "re_nr": x["re_nr"], "gefordert": x["gefordert"],
                            "data": _j(x["data"], {}), "status": x["status"], "notiz": x["notiz"], "updated": x["updated"], "updated_by": x["updated_by"]} for x in re_],
            "calc": rechne(r, ang, am, re_), "bilder": _bilder(c, r["id"])}


def _bilder(c, i):
    """Fotos je Position: {pos_id: [{id, name, w, h}]}"""
    out = {}
    for b in c.execute("SELECT id, pos_id, name, w, h FROM ava_bild WHERE lv_id=? ORDER BY id", (i,)).fetchall():
        out.setdefault(b["pos_id"], []).append({"id": b["id"], "name": b["name"], "w": b["w"], "h": b["h"]})
    return out


def _bild_aufbereiten(raw):
    """Beliebiges Foto (auch Handy-Hochformat mit EXIF-Drehung, PNG mit Transparenz) → (jpeg, vorschau, w, h)."""
    from PIL import Image, ImageOps
    im = Image.open(io.BytesIO(raw))
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255)); bg.paste(im, mask=im.split()[-1]); im = bg
    else:
        im = im.convert("RGB")
    im.thumbnail((1600, 1600))
    a = io.BytesIO(); im.save(a, "JPEG", quality=84, optimize=True)
    k = im.copy(); k.thumbnail((360, 360))
    b = io.BytesIO(); k.save(b, "JPEG", quality=80)
    return a.getvalue(), b.getvalue(), im.width, im.height


def _antwort(c, i):
    r = c.execute("SELECT * FROM ava_lv WHERE id=?", (i,)).fetchone()
    return jsonify(_payload(c, r))


def _touch(c, i):
    c.execute("UPDATE ava_lv SET rev=rev+1, updated=?, updated_by=? WHERE id=?", (_now(), g.user["name"], i))


# ---------------------------------------------------------------- Projekte, LV-Liste
@app.get("/api/projekte")
def projekte():
    with db.tx() as c:
        out = []
        for r in c.execute("SELECT id, name, leaders, archived FROM projects ORDER BY archived, name"):
            lead = _j(r["leaders"], []) or []
            if g.user["is_admin"] or not lead or g.user["id"] in lead:
                out.append({"id": r["id"], "name": r["name"], "archived": bool(r["archived"])})
    return jsonify(out)


@app.get("/api/kontakte")
def kontakte():
    """Firmen für die Bieterliste (Gewerk aus den Adressen, damit passende Firmen oben stehen)."""
    with db.tx() as c:
        return jsonify([{"id": r["id"], "name": r["name"], "trade": r["trade"] or "", "email": r["email"] or ""}
                        for r in c.execute("SELECT id, name, trade, email FROM contacts WHERE coalesce(trade,'') NOT IN ('Bauherr','Baustelle') ORDER BY name")])


@app.get("/api/lv")
def lv_liste():
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        if pid and not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        rows = c.execute("SELECT * FROM ava_lv WHERE " + ("project_id=?" if pid else "1=1") + " ORDER BY archived, nr, id", (pid,) if pid else ()).fetchall()
        out = []
        for r in rows:
            if r["project_id"] and not _sees(c, r["project_id"]):
                continue
            ang = c.execute("SELECT * FROM ava_angebot WHERE lv_id=?", (r["id"],)).fetchall()
            am = c.execute("SELECT pos_id, menge FROM ava_aufmass WHERE lv_id=?", (r["id"],)).fetchall()
            re_ = c.execute("SELECT * FROM ava_rechnung WHERE lv_id=?", (r["id"],)).fetchall()
            k = rechne(r, ang, am, re_)
            V = _j(r["vergabe"], {}) or {}
            d = _j(r["data"], {}) or {}
            out.append({"id": r["id"], "project_id": r["project_id"], "nr": r["nr"], "name": r["name"], "gewerk": r["gewerk"], "status": r["status"],
                        "archived": bool(r["archived"]), "updated": r["updated"], "n_pos": sum(1 for x in d.get("items") or [] if x["typ"] == "pos" and x.get("art") != "T"),
                        "n_angebote": len(ang), "auftragnehmer": V.get("bieter") or "", "schaetzung": k["schaetzung"], "auftrag": k["auftrag"],
                        "nachtraege": k["nachtraege"]["beauftragt"], "nt_angemeldet": k["nachtraege"]["angemeldet"],
                        "n_nt": sum(1 for x in d.get("items") or [] if x.get("nt")), "leistung": k["leistung"],
                        # Prognose wie in der AVA üblich: Auftrag + beauftragte und angemeldete Nachträge; ohne Auftrag die Schätzung
                        "prognose": round((k["auftrag"] + k["nachtraege"]["beauftragt"] + k["nachtraege"]["angemeldet"]) if V.get("preise") else k["schaetzung"], 2),
                        "abgerechnet": k["abgerechnet"], "min_angebot": min([a["netto"] for a in k["angebote"] if a["summe"]] or [0])})
    return jsonify(out)


@app.post("/api/lv")
def lv_neu():
    b = request.get_json(silent=True) or {}
    pid = b.get("project_id") if isinstance(b.get("project_id"), int) else None
    with db.tx() as c:
        if pid and not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        items, bk = [], None
        src = b.get("kopie_von")
        if isinstance(src, int):   # aus einem anderen LV (auch eines anderen Projekts) – nur Texte und Mengen, keine Preise
            q = _lv(c, src)
            if not q:
                return jsonify(error="Vorlage nicht gefunden"), 404
            neu_id = {}   # alte → neue Positions-id (für die Fotos)
            items = [{**x, "id": neu_id.setdefault(x.get("id"), uuid.uuid4().hex[:10])} for x in (_j(q["data"], {}) or {}).get("items") or [] if not x.get("nt")]
            if not b.get("mengen", True):
                for x in items:
                    if x["typ"] == "pos":
                        x["menge"] = 0
        nr = _s(b.get("nr"), 20)
        if not nr:
            n = c.execute("SELECT COUNT(*) AS n FROM ava_lv WHERE project_id IS NOT DISTINCT FROM ?", (pid,)).fetchone()["n"]
            nr = str(n + 1).zfill(2)
        name = _s(b.get("name"), 200) or _s(b.get("gewerk"), 120) or "Leistungsverzeichnis"
        now = _now()
        i = c.execute("INSERT INTO ava_lv(project_id, bk_id, nr, name, gewerk, data, created, updated, updated_by) VALUES(?,?,?,?,?,?,?,?,?) RETURNING id",
                      (pid, bk, nr, name, _s(b.get("gewerk"), 120), json.dumps({"items": clean_items(items)}, ensure_ascii=False), now, now, g.user["name"])).fetchone()["id"]
        if isinstance(src, int) and b.get("bilder", True):
            for x in c.execute("SELECT pos_id, name, w, h, data, klein FROM ava_bild WHERE lv_id=? ORDER BY id", (src,)).fetchall():
                if x["pos_id"] in neu_id:
                    c.execute("INSERT INTO ava_bild(lv_id, pos_id, name, w, h, data, klein, created, user_name) VALUES(?,?,?,?,?,?,?,?,?)",
                              (i, neu_id[x["pos_id"]], x["name"], x["w"], x["h"], x["data"], x["klein"], now, g.user["name"]))
        versionen.nach(c, f"avalv:{i}", g.user["name"])
        C.audit(g.user["name"], "ava", "LV angelegt", f"{nr} {name}")
        return _antwort(c, i)


@app.route("/api/lv/<int:i>", methods=["GET", "PUT", "DELETE"])
def lv_eins(i):
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        if request.method == "GET":
            return jsonify(_payload(c, r))
        if request.method == "DELETE":
            c.execute("DELETE FROM ava_lv WHERE id=?", (i,))
            C.audit(g.user["name"], "ava", "LV gelöscht", f"{r['nr']} {r['name']}")
            return jsonify(ok=True)
        b = request.get_json(silent=True) or {}
        c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", (f"avalv:{i}",))
        r = _lv(c, i)
        if isinstance(b.get("rev"), int) and b["rev"] != r["rev"] and not b.get("force"):
            return jsonify(error=f"Inzwischen von {r['updated_by'] or 'jemand anderem'} geändert.", conflict=True, rev=r["rev"]), 409
        sets, args = [], []
        for k, n in (("name", 200), ("nr", 20), ("gewerk", 120)):
            if k in b:
                sets.append(f"{k}=?"); args.append(_s(b[k], n))
        if b.get("status") in STATUS:
            sets.append("status=?"); args.append(b["status"])
        if "archived" in b:
            sets.append("archived=?"); args.append(1 if b["archived"] else 0)
        if "project_id" in b:
            pid = b["project_id"] if isinstance(b["project_id"], int) and _sees(c, b["project_id"]) else None
            sets.append("project_id=?"); args.append(pid)
        if isinstance(b.get("data"), dict):
            d = {"items": clean_items(b["data"].get("items")), "vorbem": _s(b["data"].get("vorbem"), 20000)}
            if b.get("nummerieren"):
                nummerieren(d["items"])
            sets.append("data=?"); args.append(json.dumps(d, ensure_ascii=False))
        if isinstance(b.get("vergabe"), dict):
            V = _j(r["vergabe"], {}) or {}
            for k in ("nachlass", "skonto", "einbehalt"):
                if k in b["vergabe"]:
                    V[k] = round(_f(b["vergabe"][k], 0, 0, 100), 3)
            if isinstance(b["vergabe"].get("preise"), dict):   # Preise des Auftrags (z. B. Nachtrags-EP)
                P = V.get("preise") or {}
                for k, v in list(b["vergabe"]["preise"].items())[:3000]:
                    x = _fn(v)
                    if x is None:
                        P.pop(str(k), None)
                    else:
                        P[str(k)] = x
                V["preise"] = P
            sets.append("vergabe=?"); args.append(json.dumps(V, ensure_ascii=False))
        if sets:
            versionen.vor(c, f"avalv:{i}")
            c.execute(f"UPDATE ava_lv SET {', '.join(sets)}, rev=rev+1, updated=?, updated_by=? WHERE id=?", (*args, _now(), g.user["name"], i))
            versionen.nach(c, f"avalv:{i}", g.user["name"])
        return _antwort(c, i)


# ---------------------------------------------------------------- Übernahme aus den Baukosten
@app.get("/api/baukosten")
def baukosten_liste():
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        out = []
        for r in c.execute("SELECT id, name, stufe, data, project_id FROM bk_projects WHERE archived=0 ORDER BY (project_id IS NOT DISTINCT FROM ?) DESC, updated DESC", (pid,)):
            d = _j(r["data"], {}) or {}
            bts = [b for b in d.get("bauteile") or [] if b.get("name") or b.get("kg")]
            kgs = sorted({(b.get("kg") or "")[:3] for b in bts if b.get("kg")})
            out.append({"id": r["id"], "name": r["name"], "stufe": r["stufe"], "eigenes": r["project_id"] == pid, "n": len(bts), "kgs": kgs,
                        "raeume": len(d.get("rooms") or [])})
        return jsonify(out)


KG_NAMEN = {"310": "Baugrube / Erdbau", "320": "Gründung, Unterbau", "330": "Außenwände", "340": "Innenwände", "350": "Decken", "360": "Dächer",
            "370": "Infrastrukturanlagen", "380": "Baukonstruktive Einbauten", "390": "Sonstige Maßnahmen für Baukonstruktionen", "410": "Abwasser, Wasser, Gas",
            "420": "Wärmeversorgung", "430": "Raumlufttechnik", "440": "Elektrische Anlagen", "450": "Kommunikation, Sicherheit", "460": "Förderanlagen",
            "470": "Nutzungsspezifische Anlagen", "480": "Gebäudeautomation", "490": "Sonstige Maßnahmen für technische Anlagen"}


@app.post("/api/lv/<int:i>/aus-baukosten")
def aus_baukosten(i):
    """Bauteile einer Kostenermittlung (Kurztext, Menge, Einheit, KG, EP als Schätzpreis) als Positionen anhängen – je KG 2. Ebene ein Titel."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = _lv(c, i)
        bk = c.execute("SELECT id, name, data FROM bk_projects WHERE id=?", (b.get("bk_id"),)).fetchone() if isinstance(b.get("bk_id"), int) else None
        if not r or not bk:
            return jsonify(error="Nicht gefunden"), 404
        want = {str(k)[:3] for k in b.get("kgs") or []}
        d = _j(r["data"], {}) or {}
        items = d.get("items") or []
        bts = [x for x in (_j(bk["data"], {}) or {}).get("bauteile") or [] if (not want or (x.get("kg") or "")[:3] in want) and (x.get("name") or x.get("kg"))]
        if not bts:
            return jsonify(error="Keine passenden Bauteile in dieser Kostenermittlung."), 400
        by = {}
        for x in bts:
            by.setdefault((x.get("kg") or "000")[:2] + "0", []).append(x)
        for k in sorted(by):
            items.append({"id": uuid.uuid4().hex[:10], "typ": "titel", "lvl": 1, "kurz": f"{k} {KG_NAMEN.get(k, '')}".strip()})
            for x in by[k]:
                kurz = x.get("name") or ""
                if x.get("mat") and x["mat"] not in kurz:
                    kurz = f"{kurz} – {x['mat']}" if kurz else x["mat"]
                items.append({"id": uuid.uuid4().hex[:10], "typ": "pos", "kurz": kurz, "lang": x.get("notiz") or "", "menge": x.get("menge") or 0,
                              "einheit": x.get("einheit") or "", "art": "N", "kg": x.get("kg") or "", "ep_s": x.get("ep")})
        d["items"] = nummerieren(clean_items(items))
        versionen.vor(c, f"avalv:{i}")
        c.execute("UPDATE ava_lv SET data=?, bk_id=?, rev=rev+1, updated=?, updated_by=? WHERE id=?",
                  (json.dumps(d, ensure_ascii=False), bk["id"], _now(), g.user["name"], i))
        versionen.nach(c, f"avalv:{i}", g.user["name"])
        return _antwort(c, i)


@app.get("/api/lv/<int:i>/raeume")
def raeume(i):
    """Räume aus dem Raumbuch der Kostenermittlung (für die Massenermittlung: Fläche, Höhe, Umfang soweit bekannt)."""
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        bk = c.execute("SELECT id, name, data FROM bk_projects WHERE id=?", (r["bk_id"],)).fetchone() if r["bk_id"] else None
        if not bk and r["project_id"]:
            bk = c.execute("SELECT id, name, data FROM bk_projects WHERE project_id=? AND archived=0 ORDER BY updated DESC LIMIT 1", (r["project_id"],)).fetchone()
        if not bk:
            return jsonify(bk=None, raeume=[])
        d = _j(bk["data"], {}) or {}
        hstd = d.get("hoehe_std") or 0
        return jsonify(bk={"id": bk["id"], "name": bk["name"]},
                       raeume=[{"id": x.get("id"), "nr": x.get("nr") or "", "name": x.get("name") or "", "geschoss": x.get("floor") or "", "flaeche": x.get("area") or 0,
                                "hoehe": x.get("h") or hstd or 0} for x in d.get("rooms") or []])


# ---------------------------------------------------------------- Fotos zu Positionen
@app.post("/api/lv/<int:i>/bilder")
def bilder_neu(i):
    pos_id = _s(request.form.get("pos_id"), 40)
    fs = request.files.getlist("datei")
    if not pos_id or not fs:
        return jsonify(error="Keine Datei"), 400
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        if not any(x.get("id") == pos_id for x in (_j(r["data"], {}) or {}).get("items") or []):
            return jsonify(error="Position nicht gefunden – bitte erst speichern"), 404
        n, now = 0, _now()
        for f in fs[:20]:
            raw = f.read()
            if not raw or len(raw) > 40 * 1024 * 1024:
                continue
            try:
                big, small, w, h = _bild_aufbereiten(raw)
            except Exception:   # kein lesbares Bild (z. B. HEIC ohne Plugin)
                continue
            c.execute("INSERT INTO ava_bild(lv_id, pos_id, name, w, h, data, klein, created, user_name) VALUES(?,?,?,?,?,?,?,?,?)",
                      (i, pos_id, _s(f.filename, 200) or "Foto", w, h, big, small, now, g.user["name"]))
            n += 1
        if not n:
            return jsonify(error="Die Datei ist kein lesbares Bild (JPG, PNG, WEBP, GIF)."), 400
        _touch(c, i)
        return _antwort(c, i)


@app.route("/api/bild/<int:b>", methods=["GET", "DELETE"])
def bild_eins(b):
    with db.tx() as c:
        x = c.execute("SELECT id, lv_id, name, " + ("klein" if request.args.get("klein") else "data") + " AS d FROM ava_bild WHERE id=?", (b,)).fetchone()
        if not x or not _lv(c, x["lv_id"]):
            return jsonify(error="Nicht gefunden"), 404
        if request.method == "DELETE":
            c.execute("DELETE FROM ava_bild WHERE id=?", (b,))
            _touch(c, x["lv_id"])
            return _antwort(c, x["lv_id"])
        d = x["d"]
    return Response(bytes(d), mimetype="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})


# ---------------------------------------------------------------- GAEB und Excel
@app.post("/api/lv/<int:i>/import")
def lv_import(i):
    """GAEB-Datei (X81–X86) oder ausgefülltes Excel einlesen.
    ziel=lv: Positionen übernehmen (ersetzen, wenn das LV leer ist oder ersetzen=1, sonst anhängen)
    ziel=angebot: Preise als Angebot eines Bieters (Zuordnung über die OZ, sonst über den Kurztext)"""
    f = request.files.get("datei")
    if not f:
        return jsonify(error="Keine Datei"), 400
    data, name = f.read(), (f.filename or "").lower()
    ziel = request.form.get("ziel") or "lv"
    try:
        if name.endswith((".xlsx", ".xlsm")):
            g_ = _excel_lesen(data)
        else:
            g_ = gaeb.lesen(data)
    except ValueError as e:
        return jsonify(error=str(e)), 400
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        d = _j(r["data"], {}) or {}
        items = d.get("items") or []
        if ziel == "angebot":
            by_oz = {x["oz"]: x for x in items if x["typ"] == "pos" and x.get("oz")}
            by_kt = {x["kurz"].lower(): x for x in items if x["typ"] == "pos" and x.get("kurz")}
            preise, ohne = {}, 0
            for x in g_["items"]:
                if x["typ"] != "pos" or x.get("ep") is None:
                    continue
                p = by_oz.get(x.get("oz")) or by_kt.get((x.get("kurz") or "").lower())
                if p:
                    preise[p["id"]] = x["ep"]
                else:
                    ohne += 1
            if not preise:
                return jsonify(error="Keine Preise gefunden, die zu den Positionen dieses LV passen (Zuordnung über OZ oder Kurztext)."), 400
            bieter = _s(request.form.get("bieter") or g_.get("bieter") or f.filename, 200)
            cid = request.form.get("contact_id", type=int)
            a = c.execute("SELECT id FROM ava_angebot WHERE lv_id=? AND (contact_id=? OR (contact_id IS NULL AND lower(bieter)=lower(?)))", (i, cid, bieter)).fetchone()
            if a:
                c.execute("UPDATE ava_angebot SET preise=?, quelle='gaeb', updated=? WHERE id=?", (json.dumps(preise), _now(), a["id"]))
            else:
                c.execute("INSERT INTO ava_angebot(lv_id, contact_id, bieter, eingang, preise, quelle, created, updated) VALUES(?,?,?,?,?,?,?,?)",
                          (i, cid, bieter, date.today().isoformat(), json.dumps(preise), "gaeb", _now(), _now()))
            _touch(c, i)
            out = _payload(c, c.execute("SELECT * FROM ava_lv WHERE id=?", (i,)).fetchone())
            out["hinweis"] = f"{len(preise)} Preise von „{bieter}“ übernommen" + (f", {ohne} Positionen der Datei ohne Gegenstück im LV" if ohne else "") + "."
            return jsonify(out)
        neu = clean_items([{k: v for k, v in x.items() if k != "ep"} | ({"ep_s": x["ep"]} if x.get("ep") is not None else {}) for x in g_["items"]])
        ersetzen = request.form.get("ersetzen") == "1" or not any(x["typ"] == "pos" for x in items)
        d["items"] = neu if ersetzen else items + neu
        versionen.vor(c, f"avalv:{i}")
        sets = "data=?"
        args = [json.dumps(d, ensure_ascii=False)]
        if ersetzen and g_.get("lv_name") and r["name"] in ("", "Leistungsverzeichnis"):
            sets += ", name=?"; args.append(g_["lv_name"][:200])
        c.execute(f"UPDATE ava_lv SET {sets}, rev=rev+1, updated=?, updated_by=? WHERE id=?", (*args, _now(), g.user["name"], i))
        versionen.nach(c, f"avalv:{i}", g.user["name"])
        out = _payload(c, c.execute("SELECT * FROM ava_lv WHERE id=?", (i,)).fetchone())
        n = sum(1 for x in neu if x["typ"] == "pos")
        out["hinweis"] = f"{n} Positionen {'eingelesen' if ersetzen else 'angehängt'}" + (f" (GAEB X{g_['dp']})" if g_.get("dp") else "") + "."
        return jsonify(out)


def _excel_lesen(data):
    import openpyxl
    try:
        wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True, read_only=True)
    except Exception as e:
        raise ValueError(f"Die Excel-Datei konnte nicht gelesen werden ({e}).")
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    head = None
    for k, row in enumerate(rows[:30]):
        cells = [str(x or "").strip().lower() for x in row]
        if any(x in ("oz", "pos.", "pos", "position") for x in cells) and any("kurztext" in x or "bezeichnung" in x or "text" == x for x in cells):
            head = (k, cells)
            break
    if not head:
        raise ValueError("In der Excel-Datei fehlt die Kopfzeile (OZ, Kurztext, Menge, Einheit, EP).")
    k0, h = head

    def col(*names):
        for n in names:
            for j, x in enumerate(h):
                if x == n or x.startswith(n):
                    return j
        return None
    cz, ck, cl, cm, ce, cp = col("oz", "pos"), col("kurztext", "bezeichnung", "text"), col("langtext"), col("menge"), col("einheit", "me"), col("ep", "einheitspreis")
    items = []
    for row in rows[k0 + 1:]:
        g_ = lambda j: row[j] if j is not None and j < len(row) else None
        oz, kurz = str(g_(cz) or "").strip(), str(g_(ck) or "").strip()
        if not oz and not kurz:
            continue
        menge = _fn(g_(cm))
        if menge is None and not g_(ce):   # Zeile ohne Menge und Einheit: Titel
            items.append({"typ": "titel", "lvl": max(1, oz.count(".") + 1) if oz else 1, "oz": oz, "kurz": kurz})
        else:
            items.append({"typ": "pos", "oz": oz, "kurz": kurz, "lang": str(g_(cl) or "").strip(), "menge": menge or 0, "einheit": str(g_(ce) or "").strip(),
                          "art": "N", "ep": _fn(g_(cp))})
    if not any(x["typ"] == "pos" for x in items):
        raise ValueError("In der Excel-Datei wurden keine Positionen gefunden.")
    return {"dp": "", "projekt": "", "lv_name": "", "bieter": "", "items": items}


def _datei(data, fn, mime):
    from urllib.parse import quote
    return Response(data, mimetype=mime, headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(fn)}"})


def _fname(r, suffix):
    return re.sub(r"[\\/:*?\"<>|]+", "_", f"LV {r['nr']} {r['name']}".strip()) + suffix


@app.get("/api/lv/<int:i>/gaeb")
def gaeb_export(i):
    dp = request.args.get("dp", "83")
    if dp not in ("81", "83", "84", "86"):
        dp = "83"
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        p = _sees(c, r["project_id"]) if r["project_id"] else None
        d = _j(r["data"], {}) or {}
        V = _j(r["vergabe"], {}) or {}
        preise, bieter, nl = None, "", 0
        if dp == "86":
            preise, bieter, nl = V.get("preise") or {}, V.get("bieter") or "", V.get("nachlass") or 0
        elif dp == "84":
            aid = request.args.get("angebot", type=int)
            a = c.execute("SELECT * FROM ava_angebot WHERE id=? AND lv_id=?", (aid, i)).fetchone() if aid else None
            preise = _j(a["preise"], {}) if a else {x["id"]: x.get("ep_s") for x in d.get("items") or [] if x["typ"] == "pos" and x.get("ep_s") is not None}
            bieter, nl = (a["bieter"], a["nachlass"]) if a else ("", 0)
        items = [x for x in d.get("items") or [] if dp == "86" or not x.get("nt")]
        x = gaeb.schreiben({"nr": r["nr"], "name": r["name"], "items": items}, dp, preise, p["name"] if p else "", bieter, nl)
    return _datei(x, _fname(r, f".x{dp}"), "application/xml")


@app.get("/api/lv/<int:i>/excel")
def excel_export(i):
    """LV als Excel zum Ausfüllen (für Firmen ohne GAEB): OZ, Kurztext, Langtext, Menge, Einheit, EP (leer), GP (Formel)."""
    import openpyxl
    from openpyxl.styles import Alignment, Font, PatternFill
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        p = _sees(c, r["project_id"]) if r["project_id"] else None
        items = [x for x in (_j(r["data"], {}) or {}).get("items") or [] if not x.get("nt")]
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "LV"
    ws.append([f"{p['name'] if p else ''} – LV {r['nr']} {r['name']}"])
    ws["A1"].font = Font(bold=True, size=13)
    ws.append(["Bitte nur die gelben Felder (EP) ausfüllen. Bedarfs- und Wahlpositionen (Art E/A) zählen nicht zur Summe."])
    ws.append([])
    ws.append(["OZ", "Kurztext", "Langtext", "Menge", "Einheit", "Art", "EP", "GP"])
    for cell in ws[4]:
        cell.font = Font(bold=True)
    gelb = PatternFill("solid", fgColor="FFF6CC")
    first = 5
    for x in items:
        if x["typ"] == "titel":
            ws.append([x.get("oz"), x.get("kurz")])
            ws.cell(ws.max_row, 2).font = Font(bold=True)
        elif x.get("art") == "T":
            ws.append(["", x.get("kurz"), x.get("lang")])
        else:
            n = ws.max_row + 1
            ws.append([x.get("oz"), x.get("kurz"), x.get("lang"), x.get("menge"), x.get("einheit"), x.get("art"), None,
                       f'=IF(OR(F{n}="E",F{n}="A"),0,D{n}*G{n})'])
            ws.cell(n, 7).fill = gelb
            ws.cell(n, 7).number_format = "#,##0.00"
            ws.cell(n, 8).number_format = "#,##0.00"
            ws.cell(n, 3).alignment = Alignment(wrap_text=True, vertical="top")
    last = ws.max_row
    ws.append([])
    ws.append(["", "Summe netto", "", "", "", "", "", f"=SUM(H{first}:H{last})"])
    ws.cell(ws.max_row, 2).font = Font(bold=True)
    ws.cell(ws.max_row, 8).number_format = "#,##0.00"
    for col, w in zip("ABCDEFGH", (12, 46, 60, 10, 8, 5, 12, 14)):
        ws.column_dimensions[col].width = w
    buf = io.BytesIO()
    wb.save(buf)
    return _datei(buf.getvalue(), _fname(r, ".xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


# ---------------------------------------------------------------- Angebote und Vergabe
@app.post("/api/lv/<int:i>/angebote")
def angebot_neu(i):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        if not _lv(c, i):
            return jsonify(error="Nicht gefunden"), 404
        cid = b.get("contact_id") if isinstance(b.get("contact_id"), int) else None
        bieter = _s(b.get("bieter"), 200)
        if cid and not bieter:
            k = c.execute("SELECT name FROM contacts WHERE id=?", (cid,)).fetchone()
            bieter = k["name"] if k else ""
        if not bieter:
            return jsonify(error="Bitte den Bieter angeben."), 400
        c.execute("INSERT INTO ava_angebot(lv_id, contact_id, bieter, eingang, created, updated) VALUES(?,?,?,?,?,?)",
                  (i, cid, bieter, _s(b.get("eingang"), 10) or "", _now(), _now()))
        _touch(c, i)
        return _antwort(c, i)


@app.route("/api/angebote/<int:a>", methods=["PUT", "DELETE"])
def angebot(a):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        x = c.execute("SELECT * FROM ava_angebot WHERE id=?", (a,)).fetchone()
        if not x or not _lv(c, x["lv_id"]):
            return jsonify(error="Nicht gefunden"), 404
        if request.method == "DELETE":
            c.execute("DELETE FROM ava_angebot WHERE id=?", (a,))
        else:
            sets, args = [], []
            for k, n in (("bieter", 200), ("eingang", 10), ("notiz", 2000)):
                if k in b:
                    sets.append(f"{k}=?"); args.append(_s(b[k], n))
            for k in ("nachlass", "skonto"):
                if k in b:
                    sets.append(f"{k}=?"); args.append(round(_f(b[k], 0, 0, 100), 3))
            if isinstance(b.get("preise"), dict):   # nur geänderte Preise schicken – sie werden zusammengeführt
                P = _j(x["preise"], {}) or {}
                for k, v in list(b["preise"].items())[:3000]:
                    y = _fn(v)
                    if y is None:
                        P.pop(str(k), None)
                    else:
                        P[str(k)] = y
                sets.append("preise=?"); args.append(json.dumps(P))
            if sets:
                c.execute(f"UPDATE ava_angebot SET {', '.join(sets)}, updated=? WHERE id=?", (*args, _now(), a))
        _touch(c, x["lv_id"])
        return _antwort(c, x["lv_id"])


@app.route("/api/lv/<int:i>/vergabe", methods=["POST", "DELETE"])
def vergabe(i):
    """Auftrag an einen Bieter: seine Preise werden die Auftragspreise (für Nachträge und Abrechnung)."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        versionen.vor(c, f"avalv:{i}")
        if request.method == "DELETE":
            if c.execute("SELECT 1 FROM ava_rechnung WHERE lv_id=? AND status='geprueft'", (i,)).fetchone():
                return jsonify(error="Es gibt schon geprüfte Rechnungen – die Vergabe lässt sich nicht mehr aufheben."), 400
            c.execute("UPDATE ava_lv SET vergabe='{}', status='versendet', rev=rev+1, updated=?, updated_by=? WHERE id=?", (_now(), g.user["name"], i))
        else:
            a = c.execute("SELECT * FROM ava_angebot WHERE id=? AND lv_id=?", (b.get("angebot_id"), i)).fetchone()
            if not a:
                return jsonify(error="Angebot nicht gefunden"), 404
            alt = _j(r["vergabe"], {}) or {}
            P = dict(_j(a["preise"], {}) or {})
            for k, v in (alt.get("preise") or {}).items():   # schon vereinbarte Nachtragspreise behalten
                if k not in P:
                    P[k] = v
            V = {"angebot_id": a["id"], "contact_id": a["contact_id"], "bieter": a["bieter"], "datum": _s(b.get("datum"), 10) or date.today().isoformat(),
                 "nachlass": a["nachlass"] or 0, "skonto": a["skonto"] or 0, "einbehalt": round(_f(b.get("einbehalt"), alt.get("einbehalt", 5.0), 0, 30), 2), "preise": P}
            c.execute("UPDATE ava_lv SET vergabe=?, status='vergeben', rev=rev+1, updated=?, updated_by=? WHERE id=?",
                      (json.dumps(V, ensure_ascii=False), _now(), g.user["name"], i))
            C.audit(g.user["name"], "ava", "Vergabe", f"LV {r['nr']} {r['name']} an {a['bieter']}")
        versionen.nach(c, f"avalv:{i}", g.user["name"])
        return _antwort(c, i)


# ---------------------------------------------------------------- Aufmaß (Massenermittlung)
@app.post("/api/lv/<int:i>/aufmass")
def aufmass_neu(i):
    b = request.get_json(silent=True) or {}
    zeilen = b.get("zeilen") if isinstance(b.get("zeilen"), list) else [b]
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        ids = {x["id"] for x in (_j(r["data"], {}) or {}).get("items") or [] if x["typ"] == "pos"}
        n = 0
        for z in zeilen[:500]:
            if not isinstance(z, dict) or z.get("pos_id") not in ids:
                continue
            m = formel(z.get("formel"))
            menge = m if m is not None else round(_f(z.get("menge"), 0), 4)
            c.execute("INSERT INTO ava_aufmass(lv_id, pos_id, datum, ort, formel, menge, quelle, created, user_name) VALUES(?,?,?,?,?,?,?,?,?)",
                      (i, z["pos_id"], _s(z.get("datum"), 10) or date.today().isoformat(), _s(z.get("ort"), 200), _s(z.get("formel"), 500), menge,
                       _s(z.get("quelle"), 40) or "hand", _now(), g.user["name"]))
            n += 1
        if not n:
            return jsonify(error="Keine Aufmaßzeile übernommen."), 400
        _touch(c, i)
        return _antwort(c, i)


@app.route("/api/aufmass/<int:a>", methods=["PUT", "DELETE"])
def aufmass(a):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        x = c.execute("SELECT * FROM ava_aufmass WHERE id=?", (a,)).fetchone()
        if not x or not _lv(c, x["lv_id"]):
            return jsonify(error="Nicht gefunden"), 404
        if request.method == "DELETE":
            c.execute("DELETE FROM ava_aufmass WHERE id=?", (a,))
        else:
            fo = _s(b.get("formel", x["formel"]), 500)
            m = formel(fo)
            menge = m if m is not None else round(_f(b.get("menge", x["menge"]), 0), 4)
            c.execute("UPDATE ava_aufmass SET datum=?, ort=?, formel=?, menge=? WHERE id=?",
                      (_s(b.get("datum", x["datum"]), 10), _s(b.get("ort", x["ort"]), 200), fo, menge, a))
        _touch(c, x["lv_id"])
        return _antwort(c, x["lv_id"])


@app.post("/api/formel")
def formel_api():
    return jsonify(wert=formel((request.get_json(silent=True) or {}).get("formel")))


# ---------------------------------------------------------------- Rechnungen
@app.post("/api/lv/<int:i>/rechnungen")
def rechnung_neu(i):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        if not (_j(r["vergabe"], {}) or {}).get("preise"):
            return jsonify(error="Erst vergeben: Rechnungen werden mit den Preisen des Auftrags geprüft."), 400
        if c.execute("SELECT 1 FROM ava_rechnung WHERE lv_id=? AND status<>'geprueft'", (i,)).fetchone():
            return jsonify(error="Es gibt noch eine ungeprüfte Rechnung – bitte erst diese prüfen."), 400
        if c.execute("SELECT 1 FROM ava_rechnung WHERE lv_id=? AND art='schluss'", (i,)).fetchone():
            return jsonify(error="Die Schlussrechnung ist schon erfasst."), 400
        nr = (c.execute("SELECT MAX(nr) AS n FROM ava_rechnung WHERE lv_id=?", (i,)).fetchone()["n"] or 0) + 1
        art = "schluss" if b.get("art") == "schluss" else "abschlag"
        c.execute("INSERT INTO ava_rechnung(lv_id, nr, art, datum, eingang, re_nr, gefordert, data, created, updated, updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                  (i, nr, art, _s(b.get("datum"), 10), _s(b.get("eingang"), 10) or date.today().isoformat(), _s(b.get("re_nr"), 60),
                   round(_f(b.get("gefordert"), 0, 0), 2), json.dumps({"abzuege": []}), _now(), _now(), g.user["name"]))
        _touch(c, i)
        return _antwort(c, i)


@app.route("/api/rechnungen/<int:k>", methods=["PUT", "DELETE"])
def rechnung(k):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        x = c.execute("SELECT * FROM ava_rechnung WHERE id=?", (k,)).fetchone()
        r = _lv(c, x["lv_id"]) if x else None
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        if request.method == "DELETE":
            if c.execute("SELECT 1 FROM ava_rechnung WHERE lv_id=? AND nr>?", (x["lv_id"], x["nr"])).fetchone():
                return jsonify(error="Nur die letzte Rechnung lässt sich löschen."), 400
            c.execute("DELETE FROM ava_rechnung WHERE id=?", (k,))
            _touch(c, x["lv_id"])
            return _antwort(c, x["lv_id"])
        d = _j(x["data"], {}) or {}
        status = x["status"]
        if b.get("status") == "offen" and status == "geprueft":   # Prüfung zurücknehmen (nur die letzte)
            if c.execute("SELECT 1 FROM ava_rechnung WHERE lv_id=? AND nr>?", (x["lv_id"], x["nr"])).fetchone():
                return jsonify(error="Nur die Prüfung der letzten Rechnung lässt sich zurücknehmen."), 400
            status = "offen"; d.pop("stand", None); d.pop("geprueft_am", None); d.pop("geprueft_von", None)
        elif status == "geprueft" and any(k_ in b for k_ in ("abzuege", "einbehalt", "gefordert")):
            return jsonify(error="Die Rechnung ist geprüft – erst „Prüfung zurücknehmen“."), 400
        if isinstance(b.get("abzuege"), list):
            d["abzuege"] = [{"text": _s(z.get("text"), 200), "pct": _fn(z.get("pct")), "betrag": _fn(z.get("betrag"))} for z in b["abzuege"][:20] if isinstance(z, dict)]
        if "einbehalt" in b:
            d["einbehalt"] = _fn(b["einbehalt"])
        if b.get("status") == "geprueft" and status != "geprueft":   # Prüfung abschließen: Aufmaßstand festhalten
            am = {}
            for z in c.execute("SELECT pos_id, menge FROM ava_aufmass WHERE lv_id=?", (x["lv_id"],)):
                am[z["pos_id"]] = round(am.get(z["pos_id"], 0.0) + (z["menge"] or 0), 4)
            d["stand"] = am
            d["geprueft_am"] = date.today().isoformat()
            d["geprueft_von"] = C.full_name(g.user)
            status = "geprueft"
        sets, args = ["data=?", "status=?"], [json.dumps(d, ensure_ascii=False), status]
        for k_, n in (("datum", 10), ("eingang", 10), ("re_nr", 60), ("notiz", 2000)):
            if k_ in b:
                sets.append(f"{k_}=?"); args.append(_s(b[k_], n))
        if "gefordert" in b:
            sets.append("gefordert=?"); args.append(round(_f(b["gefordert"], 0, 0), 2))
        if b.get("art") in ("abschlag", "schluss"):
            sets.append("art=?"); args.append(b["art"])
        c.execute(f"UPDATE ava_rechnung SET {', '.join(sets)}, updated=?, updated_by=? WHERE id=?", (*args, _now(), g.user["name"], k))
        if status == "geprueft" and x["art"] == "schluss" or (b.get("art") == "schluss" and status == "geprueft"):
            c.execute("UPDATE ava_lv SET status='abgerechnet' WHERE id=?", (x["lv_id"],))
        _touch(c, x["lv_id"])
        return _antwort(c, x["lv_id"])


# ---------------------------------------------------------------- Übersicht Kostenkontrolle
@app.get("/api/uebersicht")
def uebersicht():
    return lv_liste()


# ---------------------------------------------------------------- KI: Langtext vorschlagen
@app.post("/api/ki/langtext")
def ki_langtext():
    b = request.get_json(silent=True) or {}
    kurz = _s(b.get("kurz"), 300)
    if len(kurz) < 3:
        return jsonify(error="Bitte zuerst einen Kurztext eingeben."), 400
    with db.tx() as c:
        ki = ai.choice_of(g.user, c)
    if ki == "intern":
        return jsonify(error="Für Textvorschläge oben in der Kopfleiste eine KI wählen (z. B. Ollama)."), 400
    sys_ = ("Du bist Architekt in Deutschland und schreibst Langtexte für Leistungsverzeichnisse nach VOB/C (ATV DIN 18299 ff.). "
            "Schreibe einen sachlichen, ausschreibungsreifen Langtext auf Deutsch: Leistung, Material/Qualität mit Platzhaltern (z. B. „Fabrikat: ……“), "
            "Ausführung, Abrechnungseinheit. Keine Preise, keine Einleitung, keine Aufzählungszeichen-Orgie, höchstens 12 Zeilen.")
    usr = f"Gewerk: {_s(b.get('gewerk'), 120) or 'unbekannt'}\nKurztext: {kurz}\nEinheit: {_s(b.get('einheit'), 12)}\nBisheriger Langtext: {_s(b.get('lang'), 2000)}"
    try:
        with db.tx() as c:
            t = ai.ask(ki, sys_, usr, 700, c)
    except ai.AIError as e:
        return jsonify(error=str(e)), 502
    return jsonify(text=(t or "").strip())


# ---------------------------------------------------------------- PDF: LV, Preisspiegel, Aufmaß, Rechnungsprüfung
def _pdf(r, titel, sub, story_fn, quer=False):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    INK, MUTE, LINE, BAND, ACC = colors.HexColor("#1c1c1a"), colors.HexColor("#6b6b66"), colors.HexColor("#d9d6cf"), colors.HexColor("#f2efe8"), colors.HexColor("#b7410e")
    S = {"h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=INK, spaceAfter=2),
         "sub": ParagraphStyle("sub", fontName="Helvetica", fontSize=9.5, leading=13, textColor=MUTE),
         "p": ParagraphStyle("p", fontName="Helvetica", fontSize=8.8, leading=11.5, textColor=INK),
         "pb": ParagraphStyle("pb", fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=INK),
         "l": ParagraphStyle("l", fontName="Helvetica", fontSize=8, leading=10.3, textColor=MUTE),
         "r": ParagraphStyle("r", fontName="Helvetica", fontSize=8.5, leading=10.5, textColor=INK, alignment=2),
         "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=ACC, spaceBefore=8, spaceAfter=4)}
    ps = landscape(A4) if quer else A4
    W = ps[0] - 32 * mm
    buf = io.BytesIO()

    def X(s):
        from xml.sax.saxutils import escape
        return escape(str(s or "")).replace("\n", "<br/>")

    def table(data, widths, num=(), bold=(), head=True, band=()):
        t = Table(data, colWidths=widths, repeatRows=1 if head else 0)
        st = [("FONT", (0, 0), (-1, -1), "Helvetica", 8.5), ("TEXTCOLOR", (0, 0), (-1, -1), INK), ("VALIGN", (0, 0), (-1, -1), "TOP"),
              ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3), ("LINEBELOW", (0, 0), (-1, -1), 0.3, LINE)]
        if head:
            st += [("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8), ("TEXTCOLOR", (0, 0), (-1, 0), MUTE), ("LINEBELOW", (0, 0), (-1, 0), 0.8, INK)]
        for ci in num:
            st.append(("ALIGN", (ci, 0), (ci, -1), "RIGHT"))
        for ri in bold:
            st += [("FONT", (0, ri), (-1, ri), "Helvetica-Bold", 9), ("BACKGROUND", (0, ri), (-1, ri), BAND)]
        for ri in band:
            st += [("BACKGROUND", (0, ri), (-1, ri), BAND)]
        t.setStyle(TableStyle(st))
        return t
    with db.tx() as c:
        p = _sees(c, r["project_id"]) if r["project_id"] else None
        office = C.kurzname(c)
    story = []
    logo = C.print_logo()
    kopf = [[Paragraph(X(titel), S["h1"]), ""], [Paragraph(X(sub), S["sub"]), ""]]
    if logo:
        try:
            from reportlab.lib.utils import ImageReader
            ImageReader(io.BytesIO(logo)).getSize()
            kopf[0][1] = Image(io.BytesIO(logo), width=22 * mm, height=22 * mm, kind="proportional", hAlign="RIGHT")
        except Exception:
            pass
    kt = Table(kopf, colWidths=[W - 30 * mm, 30 * mm])
    kt.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("SPAN", (1, 0), (1, 1)), ("ALIGN", (1, 0), (1, 0), "RIGHT"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    story += [kt, Spacer(1, 6 * mm)]
    story_fn(story, S, X, table, W, mm, p)

    def fuss(cv, doc):
        cv.saveState()
        cv.setFont("Helvetica", 7.5)
        cv.setFillColor(MUTE)
        cv.drawString(16 * mm, 10 * mm, f"{office + ' · ' if office else ''}{p['name'] if p else ''} · LV {r['nr']} {r['name']}"[:150])
        cv.drawRightString(ps[0] - 16 * mm, 10 * mm, f"Seite {doc.page} · {date.today().strftime('%d.%m.%Y')}")
        cv.restoreState()
    doc = SimpleDocTemplate(buf, pagesize=ps, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=14 * mm, bottomMargin=18 * mm, title=titel, author=office or "Bauplattform")
    doc.build(story, onFirstPage=fuss, onLaterPages=fuss)
    return buf.getvalue()


def eur(v):
    if v is None:
        return "–"
    v = 0.0 if abs(v) < 0.005 else v
    return f"{v:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")


def ep2(v):
    return "" if v is None else f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def num(v, n=3):
    if v is None:
        return ""
    s = f"{v:,.{n}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return s.rstrip("0").rstrip(",") if "," in s else s


def _de(iso):
    try:
        return datetime.fromisoformat(iso).strftime("%d.%m.%Y")
    except (TypeError, ValueError):
        return iso or ""


# ---------------------------------------------------------------- LV-Druck mit Layout-Editor
DRUCK_STD = {"preise": "leer", "deckblatt": True, "langtext": True, "fotos": True, "vorbem": True, "zusammenstellung": True,
             "seite_je_titel": False, "bieter": True, "schrift": 9}
DRUCK_FELDER = ("Titel", "Untertitel", "Bauvorhaben", "Bauherr", "Aufsteller", "Datum", "Hinweis", "Vorbemerkungen", "Schlusstext")
SCHLUSS_STD = "Bieter (Firma, Anschrift):\n\n\n\nOrt, Datum, Unterschrift:"


def _druck_layout(d, b=None):
    """Gespeichertes Layout des LV (data.druck) mit den Vorgaben ergänzen, dann die übergebenen Änderungen darüber."""
    lay = dict(DRUCK_STD)
    for src in ((d.get("druck") or {}) if isinstance(d.get("druck"), dict) else {}, b or {}):
        for k, v in src.items():
            if k in ("deckblatt", "langtext", "fotos", "vorbem", "zusammenstellung", "seite_je_titel", "bieter"):
                lay[k] = bool(v)
            elif k == "preise" and v in ("leer", "schaetzung", "auftrag"):
                lay[k] = v
            elif k == "schrift" and v in (8, 9, 10, "8", "9", "10"):
                lay[k] = int(v)
            elif k == "felder" and isinstance(v, dict):
                lay["felder"] = {**(lay.get("felder") or {}), **{f: str(v[f])[:20000] for f in DRUCK_FELDER if isinstance(v.get(f), str)}}
    return lay


def _druck_felder(c, r, P, lay):
    """Texte des Ausdrucks: Vorgaben aus LV, Projekt und Büro – überschrieben durch die im Editor geänderten."""
    p = _sees(c, r["project_id"]) if r["project_id"] else None
    S = {x["key"]: x["value"] for x in c.execute("SELECT key, value FROM settings WHERE key='office_name' OR key LIKE 'co\\_%'").fetchall()}
    adr = lambda a, b_, z, o: ", ".join(v for v in (a, b_, " ".join(x for x in (z, o) if x)) if v)
    F = {"Titel": "Leistungsverzeichnis", "Untertitel": f"LV {r['nr']} – {r['name']}" + (f"\nGewerk: {r['gewerk']}" if r["gewerk"] and r["gewerk"] != r["name"] else ""),
         "Bauvorhaben": (adr(p["name"], p["street"] if p["street"] and p["street"] not in p["name"] else "", p["zip"], p["city"]) if p else P["projekt"]),
         "Bauherr": (p["client"] or "") if p and "client" in p.keys() else "",
         "Aufsteller": "\n".join(v for v in (S.get("office_name") or "", S.get("co_street") or "", " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x)) if v),
         "Datum": date.today().strftime("%d.%m.%Y"), "Hinweis": "",
         "Vorbemerkungen": P["data"].get("vorbem") or "", "Schlusstext": SCHLUSS_STD}
    F.update({k: v for k, v in (lay.get("felder") or {}).items() if k in F})
    return F


def _lv_druck(c, r, P, lay, entwurf=False):
    """LV als PDF nach Layout. entwurf=True: Deckblatt-Texte als Formularfelder (für den Editor), sonst feste Schrift."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader
    from reportlab.platypus import Image as RLImage, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, CondPageBreak
    from reportlab.pdfbase.pdfmetrics import stringWidth
    from xml.sax.saxutils import escape
    F = _druck_felder(c, r, P, lay)
    FN = schrift.fuer(c)
    kurz = C.kurzname(c)
    items = P["data"].get("items") or []
    V = P["vergabe"]; VP = V.get("preise") or {}
    fs = lay["schrift"]
    INK, MUTE, LINE, BAND, ACC = colors.HexColor("#1c1c1a"), colors.HexColor("#6b6b66"), colors.HexColor("#d9d6cf"), colors.HexColor("#f2efe8"), colors.HexColor("#b7410e")
    S = {"p": ParagraphStyle("p", fontName=FN["n"], fontSize=fs, leading=fs * 1.3, textColor=INK),
         "pb": ParagraphStyle("pb", fontName=FN["b"], fontSize=fs + 0.5, leading=fs * 1.35, textColor=INK),
         "lang": ParagraphStyle("lang", fontName=FN["n"], fontSize=fs - 0.5, leading=(fs - 0.5) * 1.3, textColor=INK),
         "mu": ParagraphStyle("mu", fontName=FN["n"], fontSize=fs - 1, leading=(fs - 1) * 1.3, textColor=MUTE),
         "h2": ParagraphStyle("h2", fontName=FN["b"], fontSize=12, leading=15, textColor=ACC, spaceBefore=6, spaceAfter=4),
         "h1": ParagraphStyle("h1", fontName=FN["b"], fontSize=15, leading=19, textColor=INK)}
    X = lambda t: escape(str(t or "")).replace("\n", "<br/>")
    ps = A4; W = ps[0] - 40 * mm   # 25 mm Heftrand links, 15 mm rechts
    preis = lay["preise"]
    ep_of = (lambda x: _fn(VP.get(x["id"]))) if preis == "auftrag" else (lambda x: x.get("ep_s")) if preis == "schaetzung" else (lambda x: None)
    BILD = {}
    if lay["fotos"]:
        for b in c.execute("SELECT pos_id, data FROM ava_bild WHERE lv_id=? ORDER BY id", (r["id"],)).fetchall():
            BILD.setdefault(b["pos_id"], []).append(b)

    def fotos(pid_, breite):
        from PIL import Image as PI
        out = []
        sp = (breite - 3 * mm) / 2
        for b in BILD.get(pid_) or []:
            try:
                im = PI.open(io.BytesIO(bytes(b["data"]))); im.thumbnail((900, 900))
                o_ = io.BytesIO(); im.convert("RGB").save(o_, "JPEG", quality=80)
                w_, h_ = im.size; f = min(sp / w_, 60 * mm / h_)
                out.append(RLImage(io.BytesIO(o_.getvalue()), width=w_ * f, height=h_ * f))
            except Exception:
                continue
        if not out:
            return []
        t = Table([out[k:k + 2] + [""] * (2 - len(out[k:k + 2])) for k in range(0, len(out), 2)], colWidths=[sp + 1.5 * mm] * 2, hAlign="LEFT")
        t.setStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 3)])
        return [Spacer(1, 1.5 * mm), t]

    story = []
    if lay["deckblatt"]:
        story.append(PageBreak())
    if lay["vorbem"] and F["Vorbemerkungen"].strip():
        story += [Paragraph("Vorbemerkungen", S["h2"]), Paragraph(X(F["Vorbemerkungen"]), S["p"]), Spacer(1, 5 * mm)]
    wl = W - 90 * mm
    head = ["OZ", "Leistung", "Menge", "EH", "EP", "GP"]
    rows, band, tsum, titel = [head], [], {}, []
    cur = []   # Titel-Stapel
    hdr_style = [("FONT", (0, 0), (-1, -1), FN["n"], fs), ("TEXTCOLOR", (0, 0), (-1, -1), INK), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                 ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3), ("LINEBELOW", (0, 0), (-1, -1), 0.3, LINE),
                 ("FONT", (0, 0), (-1, 0), FN["b"], fs - 0.5), ("TEXTCOLOR", (0, 0), (-1, 0), MUTE), ("LINEBELOW", (0, 0), (-1, 0), 0.8, INK)] + \
                [("ALIGN", (ci, 0), (ci, -1), "RIGHT") for ci in (2, 4, 5)]

    def tabelle_schliessen():
        nonlocal rows, band
        if len(rows) > 1:
            t = Table(rows, colWidths=[17 * mm, wl, 17 * mm, 11 * mm, 20 * mm, 25 * mm], repeatRows=1)
            t.setStyle(TableStyle(hdr_style + [("BACKGROUND", (0, ri), (-1, ri), BAND) for ri in band]))
            story.append(t)
        rows, band = [head], []
    gesamt = 0.0
    for x in items:
        if x.get("nt"):
            continue
        if x["typ"] == "titel":
            lv_ = x.get("lvl") or 1
            if lay["seite_je_titel"] and lv_ == 1 and (len(rows) > 1 or len(story) > (1 if lay["deckblatt"] else 0)):
                tabelle_schliessen(); story.append(PageBreak())
            while cur and cur[-1][0] >= lv_:
                cur.pop()
            cur.append((lv_, x["id"]))
            tsum[x["id"]] = 0.0
            if lv_ == 1:
                titel.append(x)
            rows.append([x.get("oz") or "", Paragraph(f"<b>{X(x['kurz'])}</b>", S["pb"]), "", "", "", ""]); band.append(len(rows) - 1)
            continue
        if x.get("art") == "T":
            rows.append(["", Paragraph(f"<font name='{FN['i']}'>{X(x.get('lang') or x['kurz'])}</font>", S["lang"]), "", "", "", ""]); continue
        if x.get("np_vor") and len(rows) > 1:   # Druckoption „Neue Seite vorher“
            tabelle_schliessen(); story.append(PageBreak())
        kz = f"<b>{X(x['kurz'])}</b>" + (" <font size='7'>[S]</font>" if x.get("sp") else "")
        zelle = [Paragraph(f"<strike>{kz}</strike> – entfällt" if x.get("entf") else kz, S["p"])]
        if lay["langtext"] and x.get("lang") and x["lang"] != x["kurz"]:
            zelle.append(Paragraph(X(x["lang"]), S["lang"]))
        if x.get("art") in ("E", "A", "P"):
            zelle.append(Paragraph("Bedarfsposition (mit GB)" if x["art"] == "E" and x.get("gb") else ARTEN[x["art"]], S["mu"]))
        if x.get("bezug"):
            bz = next((y for y in items if y.get("id") == x["bezug"]), None)
            if bz:
                zelle.append(Paragraph(f"Bezug: Pos. {X(bz.get('oz') or '')} {X(bz.get('kurz') or '')}", S["mu"]))
        zelle += fotos(x["id"], wl - 5 * mm)
        ep = ep_of(x)
        gp = _gp(x, ep) if ep is not None and zaehlt({**x, "nt": None}) else None
        if gp is not None:
            gesamt += gp
            for _, tid in cur:
                tsum[tid] += gp
        rows.append([x.get("oz") or "", zelle, num(x.get("menge")), x.get("einheit") or "",
                     ep2(ep) if ep is not None else ("" if preis != "leer" else "............"),
                     "entfällt" if x.get("entf") else eur(gp) if gp is not None else ("(ohne GB)" if ep is not None else ("" if preis != "leer" else "................"))])
        if x.get("np_nach"):   # Druckoption „Neue Seite nachher“
            tabelle_schliessen(); story.append(PageBreak())
    if preis != "leer":
        rows.append(["", Paragraph("<b>Summe netto</b>", S["p"]), "", "", "", eur(gesamt * ((1 - (V.get("nachlass") or 0) / 100) if preis == "auftrag" else 1))])
        band.append(len(rows) - 1)
    tabelle_schliessen()
    if lay["zusammenstellung"] and titel:
        z = [["OZ", "Titel", "Betrag netto"]]
        for t_ in titel:
            z.append([t_.get("oz") or "", t_["kurz"], eur(tsum.get(t_["id"])) if preis != "leer" else "........................"])
        sn = gesamt * ((1 - (V.get("nachlass") or 0) / 100) if preis == "auftrag" else 1)
        for lab, val in (("Summe netto", sn), (f"zzgl. {MWST:g} % USt.", sn * MWST / 100), ("Summe brutto", sn * (1 + MWST / 100))):
            z.append(["", lab, eur(val) if preis != "leer" else "........................"])
        t = Table(z, colWidths=[20 * mm, W - 20 * mm - 45 * mm, 45 * mm])
        t.setStyle(TableStyle(hdr_style[:7] + [("ALIGN", (2, 0), (2, -1), "RIGHT"), ("FONT", (0, len(z) - 3), (-1, -1), FN["b"], fs),
                                               ("BACKGROUND", (0, len(z) - 1), (-1, len(z) - 1), BAND)]))
        story += [CondPageBreak(60 * mm), Spacer(1, 6 * mm), Paragraph("Zusammenstellung", S["h2"]), t]
    if lay["bieter"] and F["Schlusstext"].strip():
        story += [CondPageBreak(45 * mm), Spacer(1, 10 * mm)]
        for z in F["Schlusstext"].split("\n"):
            story.append(Paragraph(X(z) + (" " + "_" * 60 if z.rstrip().endswith(":") else ""), S["p"]) if z.strip() else Spacer(1, fs * 1.3))

    def deckblatt(cv):
        form = cv.acroForm
        L = 25 * mm; B = ps[0] - 50 * mm
        def feld(nm, y, h, size, bold=False, multi=False):
            if entwurf:
                form.textfield(name=nm, tooltip=nm, x=L, y=y, width=B, height=h, value=_latin(F[nm]), fontName="Helvetica-Bold" if bold else "Helvetica", fontSize=size,
                               borderWidth=0, borderColor=None, fillColor=None, textColor=INK, fieldFlags="multiline" if multi else "", maxlen=100000)
                return
            fnt = FN["b"] if bold else FN["n"]
            cv.setFont(fnt, size); cv.setFillColor(INK)
            yy = y + h - size * 1.05 - 1
            for z in F[nm].split("\n"):
                cur_ = ""
                for wd in z.split(" "):   # Umbruch
                    t_ = (cur_ + " " + wd).strip()
                    if stringWidth(t_, fnt, size) > B - 6 and cur_:
                        cv.drawString(L + 2, yy, cur_); yy -= size * 1.2; cur_ = wd
                    else:
                        cur_ = t_
                cv.drawString(L + 2, yy, cur_); yy -= size * 1.2
        logo = C.print_logo()
        if logo:
            try:
                ir = ImageReader(io.BytesIO(logo)); iw, ih = ir.getSize(); hh = 28 * mm; ww = min(70 * mm, iw * hh / ih); hh = ww * ih / iw
                cv.drawImage(ir, ps[0] - 20 * mm - ww, ps[1] - 18 * mm - hh, ww, hh, mask="auto")
            except Exception:
                pass
        lab = lambda t, y: (cv.setFont(FN["n"], 8), cv.setFillColor(MUTE), cv.drawString(L + 2, y, t))
        feld("Titel", ps[1] - 105 * mm, 14 * mm, 24, True)
        feld("Untertitel", ps[1] - 125 * mm, 18 * mm, 13, False, True)
        cv.setStrokeColor(ACC); cv.setLineWidth(1.2); cv.line(L + 2, ps[1] - 130 * mm, L + 60 * mm, ps[1] - 130 * mm)
        lab("Bauvorhaben", ps[1] - 140 * mm); feld("Bauvorhaben", ps[1] - 160 * mm, 18 * mm, 11, False, True)
        lab("Bauherr", ps[1] - 168 * mm); feld("Bauherr", ps[1] - 188 * mm, 18 * mm, 11, False, True)
        lab("Aufgestellt", ps[1] - 196 * mm); feld("Aufsteller", ps[1] - 218 * mm, 20 * mm, 11, False, True)
        lab("Datum", ps[1] - 226 * mm); feld("Datum", ps[1] - 235 * mm, 8 * mm, 11)
        feld("Hinweis", 30 * mm, 26 * mm, 10, False, True)

    def seite(cv, doc):
        cv.saveState()
        if lay["deckblatt"] and doc.page == 1:
            deckblatt(cv)
        else:
            cv.setFont(FN["n"], 7.5); cv.setFillColor(MUTE)
            cv.drawString(25 * mm, ps[1] - 10 * mm, f"LV {r['nr']} {r['name']}"[:90])
            cv.drawRightString(ps[0] - 15 * mm, ps[1] - 10 * mm, (P["projekt"] or "")[:80])
            cv.drawString(25 * mm, 10 * mm, f"{kurz + ' · ' if kurz else ''}{F['Datum']}"[:120])
            cv.drawRightString(ps[0] - 15 * mm, 10 * mm, f"Seite {doc.page - (1 if lay['deckblatt'] else 0)}")
        cv.restoreState()
    if not story:
        story.append(Spacer(1, 1))
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=ps, leftMargin=25 * mm, rightMargin=15 * mm, topMargin=16 * mm, bottomMargin=18 * mm,
                            title=f"{F['Titel']} {r['nr']} – {r['name']}", author=kurz or "Bauplattform")
    doc.build(story, onFirstPage=seite, onLaterPages=seite)
    return buf.getvalue(), F


@app.post("/api/lv/<int:i>/druck")
def lv_druck(i):
    """Layout-Editor: entwurf → JSON {pdf (Deckblatt mit Feldern), felder, layout}; sonst das fertige PDF ohne Felder.
    speichern=1 legt das Layout (und die Vorbemerkungen) beim LV ab."""
    import base64
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        d = _j(r["data"], {}) or {}
        lay = _druck_layout(d, b.get("layout") if isinstance(b.get("layout"), dict) else {})
        if lay["preise"] == "auftrag" and not (_j(r["vergabe"], {}) or {}).get("preise"):
            lay["preise"] = "schaetzung"
        rev = r["rev"]
        if b.get("speichern"):
            d["druck"] = {k: v for k, v in lay.items() if k != "felder"} | {"felder": {k: v for k, v in (lay.get("felder") or {}).items() if k not in ("Vorbemerkungen", "Datum")}}
            if isinstance((lay.get("felder") or {}).get("Vorbemerkungen"), str):
                d["vorbem"] = lay["felder"]["Vorbemerkungen"]
            c.execute("UPDATE ava_lv SET data=? WHERE id=?", (json.dumps(d, ensure_ascii=False), i))
            _touch(c, i)
            rev = c.execute("SELECT rev FROM ava_lv WHERE id=?", (i,)).fetchone()["rev"]
            r = _lv(c, i)
        P = _payload(c, r)
        pdf, F = _lv_druck(c, r, P, lay, entwurf=b.get("schritt") == "entwurf")
    name = re.sub(r"[\\/:*?\"<>|]+", "_", f"LV {r['nr']} {r['name']}") + ".pdf"
    if b.get("schritt") == "entwurf":
        return jsonify(pdf=base64.b64encode(pdf).decode(), felder=F, layout={k: v for k, v in lay.items() if k != "felder"}, rev=rev,
                       vergeben=bool((_j(r["vergabe"], {}) or {}).get("preise")), datei=name)
    from urllib.parse import quote
    return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(name)}", "X-Rev": str(rev)})



@app.get("/api/lv/<int:i>/pdf")
def lv_pdf(i):
    from reportlab.platypus import Paragraph, Spacer
    art = request.args.get("art", "lv")
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        P = _payload(c, r)
    items = P["data"].get("items") or []
    pos = {x["id"]: x for x in items if x["typ"] == "pos"}
    K = P["calc"]
    V = P["vergabe"]
    VP = V.get("preise") or {}

    if art == "preisspiegel":
        A = sorted(P["angebote"], key=lambda a: next((x.get("rang") or 99 for x in K["angebote"] if x["id"] == a["id"]), 99))[:6]

        def st(story, S, X, table, W, mm, p):
            head = ["OZ", "Kurztext", "Menge", "EH"] + [a["bieter"][:22] for a in A]
            w0 = [16 * mm, W - 40 * mm - 27 * mm * len(A), 14 * mm, 10 * mm]
            rows = [head]
            for x in items:
                if x["typ"] == "titel":
                    rows.append([x["oz"], Paragraph(f"<b>{X(x['kurz'])}</b>", S["p"]), "", ""] + [""] * len(A))
                    continue
                if x.get("art") == "T" or x.get("nt"):
                    continue
                eps = [_fn(a["preise"].get(x["id"])) for a in A]
                vals = [e for e in eps if e is not None]
                mn = min(vals) if vals else None
                mit = sum(vals) / len(vals) if vals else None
                cells = []
                for e in eps:
                    if e is None:
                        cells.append("—")
                    else:
                        t = f"{ep2(e)}<br/>{ep2(e * (x['menge'] or 0)) if x.get('art') in ('N', 'P') else '(ohne GB)'}"
                        if mit and abs(e / mit - 1) > 0.3:
                            t = "<font color='#c0392b'>! </font>" + t
                        if e == mn and len(vals) > 1:
                            t = f"<font color='#1e7a3c'><b>{t}</b></font>"
                        cells.append(Paragraph(t, S["r"]))
                rows.append([x["oz"], Paragraph(X(x["kurz"]) + (f" <font color='#6b6b66'>({ARTEN[x['art']]})</font>" if x.get("art") in ("E", "A", "P") else ""), S["p"]),
                             num(x["menge"]), x["einheit"]] + cells)
            sums = {a["id"]: a for a in K["angebote"]}
            rows.append(["", "Summe netto (ohne Bedarfs-/Wahlpositionen)", "", ""] + [eur(sums[a["id"]]["summe"]) for a in A])
            rows.append(["", "Nachlass", "", ""] + [f"{num(a['nachlass'], 2)} %" if a["nachlass"] else "–" for a in A])
            rows.append(["", "Wertung netto", "", ""] + [eur(sums[a["id"]]["netto"]) for a in A])
            rows.append(["", "Rang · fehlende Preise", "", ""] + [f"{sums[a['id']].get('rang', '–')} · {sums[a['id']]['fehlt']}" for a in A])
            n = len(rows)
            story.append(table(rows, w0 + [27 * mm] * len(A), num=tuple(range(2, 4 + len(A))), bold=(n - 2,), band=(n - 4, n - 3, n - 1)))
            story.append(Spacer(1, 4 * mm))
            story.append(Paragraph("<font color='#1e7a3c'><b>grün</b></font> = niedrigster Einheitspreis · <font color='#c0392b'>!</font> mehr als 30 % vom Mittel der Bieter entfernt · je Zelle: Einheitspreis, darunter Gesamtpreis.", S["l"]))
            if K["schaetzung"]:
                story.append(Paragraph(f"Kostenschätzung des Planers für dieses LV: {eur(K['schaetzung'])} netto.", S["l"]))
        pdf = _pdf(r, f"Preisspiegel – LV {r['nr']} {r['name']}", f"{P['projekt']} · {len(P['angebote'])} Angebote · Stand {date.today().strftime('%d.%m.%Y')}", st, quer=True)
        fn = "Preisspiegel"
    elif art == "aufmass":
        am = P["aufmass"]

        def st(story, S, X, table, W, mm, p):
            rows = [["OZ / Datum", "Kurztext / Ort", "Rechenweg", "Menge", "EH"]]
            bold = []
            for x in items:
                if x["typ"] != "pos" or x.get("art") == "T":
                    continue
                zs = [z for z in am if z["pos_id"] == x["id"]]
                if not zs:
                    continue
                rows.append([x["oz"], Paragraph(f"<b>{X(x['kurz'])}</b>", S["p"]), f"LV-Menge {num(x['menge'])}", "", x["einheit"]])
                for z in zs:
                    rows.append([_de(z["datum"]), Paragraph(X(z["ort"]), S["p"]), Paragraph(X(z["formel"]), S["p"]), num(z["menge"]), x["einheit"]])
                rows.append(["", "Summe", "", num(sum(z["menge"] for z in zs)), x["einheit"]])
                bold.append(len(rows) - 1)
            story.append(table(rows, [24 * mm, W - 24 * mm - 70 * mm - 40 * mm, 70 * mm, 24 * mm, 16 * mm], num=(3,), bold=tuple(bold)))
        pdf = _pdf(r, f"Massenermittlung – LV {r['nr']} {r['name']}", f"{P['projekt']}{' · Auftragnehmer: ' + V['bieter'] if V.get('bieter') else ''}", st)
        fn = "Massenermittlung"
    elif art == "rechnung":
        rid = request.args.get("rid", type=int)
        R = next((x for x in P["rechnungen"] if x["id"] == rid), None)
        RC = next((x for x in K["rechnungen"] if x["id"] == rid), None)
        if not R:
            return jsonify(error="Rechnung nicht gefunden"), 404
        stand = R["data"].get("stand") if R["status"] == "geprueft" else K["aufmass"]

        def st(story, S, X, table, W, mm, p):
            info = [["Auftragnehmer", V.get("bieter") or "—"], ["Rechnung", f"{R['nr']}. {'Schlussrechnung' if R['art'] == 'schluss' else 'Abschlagsrechnung'}"
                     + (f" · Nr. {R['re_nr']}" if R["re_nr"] else "") + (f" vom {_de(R['datum'])}" if R["datum"] else "")],
                    ["Eingang", _de(R["eingang"])], ["Auftragssumme", eur(K["auftrag"]) + (f" · Nachträge beauftragt {eur(K['nachtraege']['beauftragt'])}" if K["nachtraege"]["beauftragt"] else "")]]
            t = table(info, [38 * mm, W - 38 * mm], head=False)
            story += [t, Spacer(1, 5 * mm), Paragraph("Leistungsstand (kumuliert)", S["h2"])]
            rows = [["OZ", "Kurztext", "Menge", "EH", "EP", "Betrag"]]
            for x in items:
                if x["typ"] != "pos" or x.get("art") == "T":
                    continue
                m = (stand or {}).get(x["id"])
                ep = _fn(VP.get(x["id"]))
                if not m:
                    continue
                rows.append([x["oz"] + (f" {x['nt']}" if x.get("nt") else ""), Paragraph(X(x["kurz"]), S["p"]), num(m), x["einheit"], ep2(ep) if ep is not None else "—",
                             eur(round(m * ep, 2)) if ep is not None and not (x.get("nt") and x.get("nt_status") == "abgelehnt") else "—"])
            story.append(table(rows, [20 * mm, W - 20 * mm - 96 * mm, 20 * mm, 12 * mm, 24 * mm, 40 * mm], num=(2, 4, 5)))
            story += [Spacer(1, 5 * mm), Paragraph("Prüfung", S["h2"])]
            z = [["Leistungsstand netto", eur(RC["leistung"])]]
            if RC["nachlass"]:
                z.append([f"- Nachlass {num(V.get('nachlass'), 2)} %", eur(-RC["nachlass"])])
            L1 = RC["leistung"] - RC["nachlass"]
            for a in R["data"].get("abzuege") or []:
                w = L1 * a["pct"] / 100 if a.get("pct") is not None else (a.get("betrag") or 0)
                z.append([f"- {a.get('text') or 'Abzug'}" + (f" ({num(a['pct'], 2)} %)" if a.get("pct") is not None else ""), eur(-w)])
            z.append([f"- Sicherheitseinbehalt {num(RC['einbehalt_pct'], 2)} %", eur(-RC["einbehalt"])])
            z.append(["= anerkannt (kumuliert)", eur(RC["anerkannt"])])
            z.append(["- bisher anerkannt", eur(-RC["vorher"])])
            z.append(["= Zahlbetrag netto", eur(RC["zahlung"])])
            z.append([f"+ Umsatzsteuer {num(MWST, 0)} %", eur(RC["mwst"])])
            z.append(["= Zahlbetrag brutto", eur(RC["brutto"])])
            if R["gefordert"]:
                z.append([f"zum Vergleich: gefordert (kumuliert netto) {eur(R['gefordert'])}", f"Differenz {eur(RC['differenz'])}"])
            story.append(table(z, [W - 50 * mm, 50 * mm], num=(1,), head=False, bold=(len(z) - (2 if R["gefordert"] else 1),)))
            story += [Spacer(1, 10 * mm), Paragraph(
                ("Sachlich und rechnerisch geprüft" + (f" am {_de(R['data'].get('geprueft_am'))} von {X(R['data'].get('geprueft_von'))}" if R["status"] == "geprueft" else " – Entwurf, Prüfung noch nicht abgeschlossen")) +
                (f"<br/>Bemerkung: {X(R['notiz'])}" if R["notiz"] else ""), S["p"])]
        pdf = _pdf(r, f"Rechnungsprüfung – {R['nr']}. {'Schlussrechnung' if R['art'] == 'schluss' else 'Abschlagsrechnung'}", f"{P['projekt']} · LV {r['nr']} {r['name']}", st)
        fn = f"Pruefung Rechnung {R['nr']}"
    else:
        preise = request.args.get("preise") == "1"
        BILD = {}
        if request.args.get("fotos", "1") != "0":
            with db.tx() as c:
                for b in c.execute("SELECT pos_id, data, w, h FROM ava_bild WHERE lv_id=? ORDER BY id", (i,)).fetchall():
                    BILD.setdefault(b["pos_id"], []).append(b)

        def _pdf_fotos(pid_, breite, mm):
            """Fotos einer Position als kleine Tabelle (zwei nebeneinander) unter dem Langtext."""
            from reportlab.platypus import Image as RLImage, Spacer as Sp, Table as T
            from PIL import Image as PI
            bs = BILD.get(pid_) or []
            if not bs:
                return []
            zellen = []
            sp = (breite - 3 * mm) / 2
            for b in bs:
                try:
                    im = PI.open(io.BytesIO(bytes(b["data"]))); im.thumbnail((900, 900))
                    o_ = io.BytesIO(); im.save(o_, "JPEG", quality=80)
                    w_, h_ = im.size
                    f = min(sp / w_, 60 * mm / h_)
                    zellen.append(RLImage(io.BytesIO(o_.getvalue()), width=w_ * f, height=h_ * f))
                except Exception:
                    continue
            if not zellen:
                return []
            reihen = [zellen[k:k + 2] + [""] * (2 - len(zellen[k:k + 2])) for k in range(0, len(zellen), 2)]
            t = T(reihen, colWidths=[sp + 1.5 * mm, sp + 1.5 * mm], hAlign="LEFT")
            t.setStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 3)])
            return [Sp(1, 1.5 * mm), t]

        def st(story, S, X, table, W, mm, p):
            adr = " ".join(y for y in ((p["street"] or ""), (p["zip"] or ""), (p["city"] or "")) if y) if p else ""
            if p and adr and (p["street"] or "") not in p["name"]:
                story.append(Paragraph(X(adr), S["sub"]))
                story.append(Spacer(1, 4 * mm))
            if P["data"].get("vorbem"):
                story += [Paragraph("Vorbemerkungen", S["h2"]), Paragraph(X(P["data"]["vorbem"]), S["p"]), Spacer(1, 4 * mm)]
            rows = [["OZ", "Leistung", "Menge", "EH", "EP", "GP"]]
            band = []
            for x in items:
                if x.get("nt"):
                    continue
                if x["typ"] == "titel":
                    rows.append([x["oz"], Paragraph(f"<b>{X(x['kurz'])}</b>", S["p"]), "", "", "", ""])
                    band.append(len(rows) - 1)
                    continue
                if x.get("art") == "T":
                    rows.append(["", Paragraph(f"<i>{X(x['lang'] or x['kurz'])}</i>", S["p"]), "", "", "", ""])
                    continue
                txt = f"<b>{X(x['kurz'])}</b>" + (f"<br/>{X(x['lang'])}" if x.get("lang") and x["lang"] != x["kurz"] else "")
                if x.get("art") in ("E", "A", "P"):
                    txt += f"<br/><font color='#6b6b66'>{ARTEN[x['art']]}</font>"
                ep = x.get("ep_s") if preise else None
                fotos = _pdf_fotos(x["id"], W - 107 * mm, mm)
                rows.append([x["oz"], [Paragraph(txt, S["p"])] + fotos if fotos else Paragraph(txt, S["p"]), num(x["menge"]), x["einheit"], ep2(ep) if ep is not None else "..............",
                             (eur(_gp(x, ep)) if x.get("art") in ("N", "P") else "(ohne GB)") if ep is not None else ".................."])
            rows.append(["", "Summe netto", "", "", "", eur(K["schaetzung"]) if preise else ".................."])
            story.append(table(rows, [20 * mm, W - 20 * mm - 82 * mm, 18 * mm, 12 * mm, 22 * mm, 30 * mm], num=(2, 4, 5), band=tuple(band), bold=(len(rows) - 1,)))
            if not preise:
                story += [Spacer(1, 10 * mm), Paragraph("Bieter (Firma, Anschrift): ______________________________________________", S["p"]), Spacer(1, 6 * mm),
                          Paragraph("Ort, Datum, Unterschrift: ______________________________________________", S["p"])]
        pdf = _pdf(r, f"Leistungsverzeichnis {r['nr']} – {r['name']}", f"{P['projekt']}{' · Gewerk ' + r['gewerk'] if r['gewerk'] else ''}" + (" · mit Kostenschätzung" if preise else ""), st)
        fn = "LV"
    from urllib.parse import quote
    name = re.sub(r"[\\/:*?\"<>|]+", "_", f"{fn} {r['nr']} {r['name']}") + ".pdf"
    return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(name)}"})
