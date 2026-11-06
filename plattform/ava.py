"""Ausschreibung & Abrechnung (AVA): Leistungsverzeichnisse, Angebote mit Preisspiegel, Vergabe, Aufmaß, Nachträge, Rechnungsprüfung.

Daten: Tabellen ava_lv, ava_angebot, ava_aufmass, ava_rechnung (pg_migrations/0013_ava.sql im Bautagebuch).
Ein LV gehört zu einem Projekt des Bautagebuchs. Positionen stehen als JSON-Liste in ava_lv.data (Titel und Positionen,
Reihenfolge = Liste). Austausch mit Firmen über GAEB DA XML (bpcore/gaeb.py: X83 Angebotsaufforderung, X84 Angebot,
X86 Auftrag) oder Excel.

Rechnen (rechne): Angebots- und Auftragssumme aus Menge × Einheitspreis der Normal- und Pauschalpositionen (Bedarfs- und
Wahlpositionen ohne Gesamtbetrag), Nachlass in Prozent. Abrechnung kumuliert: Leistungsstand = Aufmaß × Auftrags-EP,
- Nachlass - Abzüge - Sicherheitseinbehalt = anerkannt; Zahlbetrag = anerkannt - bisher anerkannt (vorige Rechnungen).
"""
import ast, io, json, operator, os, re, uuid
from collections import Counter
from datetime import date, datetime

from flask import Response, g, jsonify, redirect, request

from bpcore import ai, baudaten, db, gaeb, papierkorb, platform, schrift, sso, versionen
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


# ---------------------------------------------------------------- Volltextsuche
def _fold(t):
    import unicodedata
    t = str(t or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return "".join(ch for ch in unicodedata.normalize("NFKD", t) if not unicodedata.combining(ch))


def _schnipsel(text, worte, n=70):
    """Ausschnitt um den ersten Treffer (Originaltext, eine Zeile)."""
    t = " ".join(str(text or "").split())
    f = _fold(t)
    pos = min([f.find(w) for w in worte if f.find(w) >= 0] or [0])
    a = max(0, pos - n // 2)
    return ("… " if a else "") + t[a:a + n * 2] + (" …" if a + n * 2 < len(t) else "")


# ---------------------------------------------------------------- Kataloge (z. B. sirAdos Positionen, sirAdos Elemente) – beliebig viele
def _kat_bereich(key):
    """sirAdos Positionen: Gewerke 000–299 Neubau, ab 300 dieselben Gewerke für Altbau/Sanierung (Abbruch, Arbeiten im Bestand).
    sirAdos Elemente: Kostengruppen, die ein zweites Mal vorkommen (Schlüssel „A…“), sind die für Altbau/Sanierung."""
    return "Altbau / Sanierung" if key.startswith("A") or (key.isdigit() and int(key) >= 300) else "Neubau"


def _kat_info(c, kid):
    r = c.execute("SELECT * FROM ava_kataloge WHERE id=?", (kid,)).fetchone()
    return {k: r[k] for k in r.keys()} if r else None


def _kat_pos(x):
    p = {"id": f"k{x['id']}", "typ": "pos", "oz": x["oz"], "kurz": x["kurz"], "lang": x["lang"], "menge": 0, "einheit": x["einheit"],
         "art": "T" if x["art"] == "T" else "N", "kg": x["kg"], "ep_s": round(x["ep"], 2) if x["ep"] else None}
    if x["ep_von"] or x["ep_bis"]:
        p["spanne"] = [round(x["ep_von"] or 0, 2), round(x["ep_bis"] or 0, 2)]
    return p


def _kat_lv(name, nr, info, zeilen):
    """Katalogausschnitt im Format eines LV (für die Kopierquelle)."""
    items = []
    for x in zeilen:
        if x["typ"] == "titel":
            items.append({"id": f"k{x['id']}", "typ": "titel", "lvl": max(1, min(4, x["ebene"])), "oz": x["oz"], "kurz": x["kurz"]})
        elif x["typ"] == "pos":
            items.append(_kat_pos(x))
    kid = (info or {}).get("id")
    st = (info or {}).get("stand") or ""
    return {"id": f"kat:{kid}:{nr}", "nr": nr if nr != "suche" else "", "name": name,
            "projekt": ((info or {}).get("name") or "Katalog") + (f", Preisstand {st[5:7]}/{st[:4]}" if len(st) >= 7 else ""),
            "katalog": True, "data": {"items": items}, "vergabe": {}}


def _kat_liste(c):
    return [{k: r[k] for k in r.keys()} for r in c.execute("SELECT * FROM ava_kataloge ORDER BY name, id").fetchall()]


@app.get("/api/katalog")
def katalog_api():
    """Alle eingelesenen Kataloge."""
    with db.tx() as c:
        return jsonify(kataloge=_kat_liste(c))


@app.route("/api/katalog/<int:kid>", methods=["GET", "PUT", "DELETE"])
def katalog_eins(kid):
    """GET: Gewerke (bzw. Kostengruppen) des Katalogs. PUT {name}: umbenennen. DELETE: entfernen (nur Verwaltung)."""
    with db.tx() as c:
        info = _kat_info(c, kid)
        if not info:
            return jsonify(error="Katalog nicht gefunden"), 404
        if request.method in ("PUT", "DELETE") and not g.user["is_admin"]:
            return jsonify(error="Kataloge verwaltet die Verwaltung."), 403
        if request.method == "DELETE":
            c.execute("DELETE FROM ava_kataloge WHERE id=?", (kid,))
            C.audit(g.user["name"], "ava", "Katalog entfernt", info["name"])
            return jsonify(kataloge=_kat_liste(c))
        if request.method == "PUT":
            name = _s((request.get_json(silent=True) or {}).get("name"), 120)
            if name:
                c.execute("UPDATE ava_kataloge SET name=? WHERE id=?", (name, kid))
            return jsonify(kataloge=_kat_liste(c))
        gw = c.execute("""SELECT g.gewerk, g.oz, g.kurz, (SELECT COUNT(*) FROM ava_katalog p WHERE p.katalog_id=g.katalog_id AND p.gewerk=g.gewerk AND p.typ='pos' AND p.art<>'T') AS n
                          FROM ava_katalog g WHERE g.katalog_id=? AND g.typ='gewerk' ORDER BY g.nr""", (kid,)).fetchall()
    sir = (info.get("quelle") or "").lower().startswith("sirados")
    return jsonify(info=info, gewerke=[{"id": f"kat:{kid}:{x['gewerk']}", "nr": x["oz"], "name": x["kurz"], "n_pos": x["n"], "gewerk": "", "status": "entwurf",
                                        "archived": False, "bereich": _kat_bereich(x["gewerk"]) if sir else (info.get("name") or "")} for x in gw])


@app.get("/api/katalog/<int:kid>/gewerk/<oz>")
def katalog_gewerk(kid, oz):
    with db.tx() as c:
        info = _kat_info(c, kid)
        g_ = c.execute("SELECT * FROM ava_katalog WHERE katalog_id=? AND typ='gewerk' AND gewerk=?", (kid, oz)).fetchone()
        if not info or not g_:
            return jsonify(error="Gewerk nicht im Katalog"), 404
        zeilen = c.execute("SELECT * FROM ava_katalog WHERE katalog_id=? AND gewerk=? AND typ<>'gewerk' ORDER BY nr", (kid, oz)).fetchall()
        out = _kat_lv(g_["kurz"], oz, info, zeilen)
        out["nr"] = g_["oz"]
        if (info.get("quelle") or "").lower().startswith("sirados"):
            out["bereich"] = _kat_bereich(oz)
        return jsonify(out)


@app.get("/api/katalog/<int:kid>/suche")
def katalog_suche(kid):
    """Volltext im Katalog (Kurz- und Langtext, OZ) – alle Wörter müssen vorkommen; Ergebnis als LV mit den Gewerken als Titel."""
    q = (request.args.get("q") or "").strip()
    worte = [w for w in _fold(q).split() if w]
    with db.tx() as c:
        info = _kat_info(c, kid)
        if not info:
            return jsonify(error="Katalog nicht gefunden"), 404
        if not worte:
            return jsonify(_kat_lv("Suche", "suche", info, []))
        sir = (info.get("quelle") or "").lower().startswith("sirados")
        gn = {x["gewerk"]: x["kurz"] for x in c.execute("SELECT gewerk, kurz FROM ava_katalog WHERE katalog_id=? AND typ='gewerk'", (kid,)).fetchall()}
        cond = " AND ".join(["lower(kurz || ' ' || lang || ' ' || oz) LIKE ?"] * len(worte))
        extra, args = "", []
        if request.args.get("gewerk"):   # nur in einem Gewerk / einer Kostengruppe suchen
            extra += " AND gewerk=?"
            args.append(request.args.get("gewerk"))
        alt = "(gewerk LIKE 'A%' OR (gewerk ~ '^[0-9]+$' AND gewerk::int >= 300))"
        if request.args.get("bereich") == "altbau":
            extra += " AND " + alt
        elif request.args.get("bereich") == "neubau":
            extra += " AND NOT " + alt
        roh = c.execute(f"SELECT * FROM ava_katalog WHERE katalog_id=? AND typ='pos'{extra} AND {cond} ORDER BY nr LIMIT 2000",
                        [kid] + args + ["%" + w.lower() + "%" for w in q.split()]).fetchall()
        treffer = [x for x in roh if all(w in _fold(f"{x['kurz']} {x['lang']} {x['oz']}") for w in worte)][:300]
        zeilen, akt = [], None
        for x in treffer:
            if x["gewerk"] != akt:
                akt = x["gewerk"]
                zeilen.append({"id": f"g{akt}", "typ": "titel", "ebene": 1, "oz": akt.lstrip("A"), "kurz": gn.get(akt, "") + (f" ({_kat_bereich(akt)})" if sir else "")})
            zeilen.append(x)
        out = _kat_lv(f"Suche „{q}“", "suche", info, zeilen)
        out["mehr"] = len(roh) >= 2000 or len(treffer) >= 300
        return jsonify(out)


# ---------------------------------------------------------------- Baudaten in der Kopierquelle (Kataloge „bd-gk3“, „bd-eigen“, importierte)
BD_MAX = 2000   # Positionen je Gruppe bzw. Suche in der Kopierquelle


@app.get("/api/baudaten/kataloge")
def bd_kataloge():
    """Kataloge der Baudaten für die Kopierquelle – ohne die der Ausschreibung (die stehen schon unter „Kataloge“)."""
    with db.tx() as c:
        rows = c.execute("""SELECT k.key, k.name, (SELECT COUNT(*) FROM pdb_position p WHERE p.katalog = k.key AND p.aktiv = 1) AS n
                            FROM pdb_katalog k ORDER BY k.sort, k.name""").fetchall()
    return jsonify([{"id": "bd-" + x["key"], "name": "Baudaten: " + x["name"], "quelle": "baudaten", "n_pos": x["n"]} for x in rows if x["n"]])


def _bd_items(c, rows, katalog):
    """Positionen der Baudaten → Zeilen der Kopierquelle (Langtext = Grund- + Folgetext, Preis auf heute umgerechnet)."""
    f = baudaten.umrechnung(c, katalog)
    gt = {}
    ids = sorted({r["grund_id"] for r in rows if r["grund_id"]})
    for k in range(0, len(ids), 1000):
        for x in c.execute("SELECT id, text FROM pdb_grundtext WHERE id = ANY(?)", (ids[k:k + 1000],)).fetchall():
            gt[x["id"]] = x["text"]
    out, grund = [], None
    for r in rows:
        if r["grund_id"] and r["grund_id"] != grund and katalog == "gk3":   # Grundposition als Zwischentitel
            grund = r["grund_id"]
        rd = lambda v: round(v * f, 2) if v is not None else None
        p = {"id": f"b{r['id']}", "typ": "pos", "oz": r["code"], "kurz": r["kurz"], "bez": r["bez"] or "",
             "lang": (gt.get(r["grund_id"], "") + " " + (r["lang"] or "")).strip(), "menge": 0, "einheit": r["einheit"], "art": "N",
             "kg": r["kg"], "ep_s": rd(r["ep_mittel"]), "quelle": f"Baudaten {r['code']}"}
        if r["ep_von"] is not None and r["ep_bis"] is not None:
            p["spanne"] = [rd(r["ep_von"]), rd(r["ep_bis"])]
        out.append(p)
    return out


@app.get("/api/katalog/bd-<key>")
def bd_gruppen(key):
    """Gruppen eines Baudaten-Katalogs wie die Gewerke eines Katalogs (Auswahl in der Kopierquelle)."""
    with db.tx() as c:
        if key == "gk3":
            rows = c.execute("""SELECT g.nr, g.name, l.nr AS lb, l.name AS lb_name, (SELECT COUNT(*) FROM pdb_position p WHERE p.katalog='gk3' AND p.gruppe=g.nr AND p.aktiv=1) AS n
                                FROM pdb_gruppe g JOIN pdb_leistungsbereich l ON l.nr = g.lb_nr ORDER BY g.nr""").fetchall()
            gw = [{"id": f"kat:bd-gk3:{x['nr']}", "nr": x["nr"], "name": x["name"], "n_pos": x["n"], "gewerk": "", "status": "entwurf", "archived": False,
                   "bereich": f"{x['lb']} {x['lb_name']}"} for x in rows if x["n"]]
        else:
            rows = c.execute("""SELECT gruppe, MIN(titel) AS titel, COUNT(*) AS n FROM pdb_position WHERE katalog=? AND aktiv=1 GROUP BY gruppe ORDER BY gruppe""", (key,)).fetchall()
            gw = [{"id": f"kat:bd-{key}:{x['gruppe'] or '-'}", "nr": x["gruppe"], "name": x["titel"] or x["gruppe"] or "Alle", "n_pos": x["n"], "gewerk": "",
                   "status": "entwurf", "archived": False, "bereich": "Baudaten"} for x in rows]
    return jsonify(info={"id": "bd-" + key, "name": "Baudaten"}, gewerke=gw)


SQL_BD = "SELECT id, code, grund_id, kurz, bez, lang, einheit, kg, ep_von, ep_mittel, ep_bis FROM pdb_position"


@app.get("/api/katalog/bd-<key>/gewerk/<gr>")
def bd_gruppe(key, gr):
    with db.tx() as c:
        rows = c.execute(f"{SQL_BD} WHERE katalog=? AND gruppe=? AND aktiv=1 ORDER BY code LIMIT ?", (key, "" if gr == "-" else gr, BD_MAX + 1)).fetchall()
        name = (c.execute("SELECT name FROM pdb_gruppe WHERE nr=?", (gr,)).fetchone() or {"name": gr}) if key == "gk3" else {"name": gr}
        items = _bd_items(c, rows[:BD_MAX], key)
    return jsonify({"id": f"kat:bd-{key}:{gr}", "nr": gr, "name": name["name"], "projekt": "Baudaten", "katalog": True, "mehr": len(rows) > BD_MAX,
                    "data": {"items": items}, "vergabe": {}})


@app.get("/api/katalog/bd-<key>/suche")
def bd_suche(key):
    q = (request.args.get("q") or "").strip()
    a = {"katalog": key, "q": q}
    if request.args.get("gewerk"):
        a["gruppe"] = request.args.get("gewerk")
    with db.tx() as c:
        if not q:
            return jsonify({"id": f"kat:bd-{key}:suche", "nr": "", "name": "Suche", "projekt": "Baudaten", "katalog": True, "data": {"items": []}, "vergabe": {}})
        treffer, gesamt = baudaten.suche(c, a, 300, 0)
        ids = [x["id"] for x in treffer]
        rows = c.execute(f"{SQL_BD} WHERE id = ANY(?) ORDER BY code", (ids,)).fetchall() if ids else []
        gn = {x["nr"]: x["name"] for x in c.execute("SELECT nr, name FROM pdb_gruppe").fetchall()}
        items, akt = [], None
        for p in _bd_items(c, rows, key):
            g_ = ".".join(p["oz"].split(".")[:2])
            if g_ != akt:
                akt = g_
                items.append({"id": f"g{g_}", "typ": "titel", "lvl": 1, "oz": g_, "kurz": gn.get(g_, g_)})
            items.append(p)
    return jsonify({"id": f"kat:bd-{key}:suche", "nr": "", "name": f"Suche „{q}“", "projekt": "Baudaten", "katalog": True, "mehr": gesamt > 300,
                    "data": {"items": items}, "vergabe": {}})


@app.post("/api/katalog/teil")
def katalog_teil():
    """Katalog in Teilen hochladen (gzip, je unter 1 MB – passt durch jeden Proxy). Der letzte Teil startet das Einlesen.
    Ein Katalog aus derselben Datei ersetzt den bisherigen, sonst kommt ein weiterer dazu."""
    if not g.user["is_admin"]:
        return jsonify(error="Kataloge kann nur die Verwaltung einlesen."), 403
    import gzip, shutil, tempfile
    a = request.args
    uid, i, n = a.get("id", ""), a.get("i", type=int), a.get("n", type=int)
    if not re.fullmatch(r"[0-9a-f]{8,40}", uid) or i is None or not n or not (0 <= i < n <= 2000):
        return jsonify(error="Ungültiger Teil"), 400
    d = os.path.join(tempfile.gettempdir(), "bpkat-" + uid)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, f"{i:05d}"), "wb") as fh:
        fh.write(request.get_data())
    da = sorted(x for x in os.listdir(d) if x.isdigit())
    if len(da) < n:
        return jsonify(ok=True, fehlt=n - len(da))
    ziel = os.path.join(d, "katalog.ava")
    kid = None
    try:
        with open(os.path.join(d, "alles.gz"), "wb") as out:
            for x in da:
                with open(os.path.join(d, x), "rb") as fh:
                    shutil.copyfileobj(fh, out)
        with gzip.open(os.path.join(d, "alles.gz"), "rb") as src, open(ziel, "wb") as out:
            shutil.copyfileobj(src, out)
        fehler, kid = _kat_einlesen(ziel, _s(a.get("name"), 200))
    except OSError as e:
        fehler = f"Die Datei kam nicht vollständig an ({e})."
    finally:
        shutil.rmtree(d, ignore_errors=True)
    if fehler:
        return jsonify(error=fehler), 400
    with db.tx() as c:
        return jsonify(kataloge=_kat_liste(c), neu=kid)


def _kat_einlesen(pfad, dateiname):
    """Katalog aus der Datei in die Datenbank. Gibt (Fehlermeldung oder None, Katalog-ID) zurück."""
    try:
        import katalog
        quelle, stand, Z, art = katalog.lesen(pfad, dateiname)
    except Exception as e:
        return f"Die Datei ließ sich nicht als Katalog lesen: {str(e)[:200]}", None
    gew, zeilen = "", []
    for k, x in enumerate(Z):
        if x["typ"] == "gewerk":
            gew = x.get("key") or x["oz"]
        if not gew:   # Hinweise vor dem ersten Gewerk
            continue
        zeilen.append([k, gew, x["typ"], int(x.get("ebene") or 0), x["oz"][:40], x["kurz"][:500], x.get("lang", "")[:20000], x.get("art", "N"),
                       x.get("einheit", "")[:12], x.get("kg", ""), x.get("ep_von"), x.get("ep"), x.get("ep_bis")])
    st = f" {stand[5:7]}/{stand[:4]}" if len(stand or "") >= 7 else ""
    name = f"{quelle} {'Elemente' if art == 'elemente' else 'Positionen'}{st}".strip()
    n_pos = sum(1 for z in zeilen if z[2] == "pos" and z[7] != "T")
    n_gew = sum(1 for z in zeilen if z[2] == "gewerk")
    try:
        with db.tx() as c:
            alt = c.execute("SELECT id, name FROM ava_kataloge WHERE datei=?", (_s(dateiname, 200),)).fetchone() if dateiname else None
            if alt:   # dieselbe Datei noch einmal: ersetzen, Namen behalten
                kid, name = alt["id"], alt["name"]
                c.execute("DELETE FROM ava_katalog WHERE katalog_id=?", (kid,))
                c.execute("UPDATE ava_kataloge SET quelle=?, stand=?, art=?, n_pos=?, n_gewerke=?, importiert=?, von=? WHERE id=?",
                          (quelle, stand, art, n_pos, n_gew, _now(), g.user["name"], kid))
            else:
                kid = c.execute("""INSERT INTO ava_kataloge(name, quelle, stand, art, datei, n_pos, n_gewerke, importiert, von)
                                   VALUES(?,?,?,?,?,?,?,?,?) RETURNING id""",
                                (name, quelle, stand, art, _s(dateiname, 200), n_pos, n_gew, _now(), g.user["name"])).fetchone()["id"]
            c.copy_rows("ava_katalog", ("nr", "gewerk", "typ", "ebene", "oz", "kurz", "lang", "art", "einheit", "kg", "ep_von", "ep", "ep_bis", "katalog_id"),
                        [z + [kid] for z in zeilen])
    except Exception as e:   # Klartext statt Fehler 500
        app.logger.exception("Katalog speichern")
        return f"Der Katalog ließ sich nicht speichern: {type(e).__name__}: {str(e)[:200]}", None
    C.audit(g.user["name"], "ava", "Katalog eingelesen", f"{name} · {n_pos} Positionen")
    return None, kid


# Versionen: je Projekt gilt die aktive Version (die zuletzt geöffnete) – LVs anderer Versionen bleiben unberührt
AKTIV = "(version_id IS NULL OR version_id IN (SELECT id FROM ava_version WHERE aktiv=1))"


@app.route("/api/versionen", methods=["GET", "POST"])
def versionen_liste():
    """Versionen der AVA eines Projekts. POST {project_id, name}: Kopie der aktiven Version (alle LVs mit Angeboten, Aufmaß,
    Rechnungen und Fotos) – die neue wird aktiv, die alte bleibt, wie sie ist."""
    b = request.get_json(silent=True) or {} if request.method == "POST" else {}
    pid = b.get("project_id") if request.method == "POST" else request.args.get("project_id", type=int)
    if not isinstance(pid, int):
        return jsonify(error="Projekt fehlt"), 400
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        if request.method == "POST":
            name = _s(b.get("name"), 200)
            if not name:
                return jsonify(error="Bitte einen Namen für die Version eingeben."), 400
            c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", (f"avaver:{pid}",))
            now, wer = _now(), g.user["name"]
            alt = c.execute("SELECT id FROM ava_version WHERE project_id=? AND aktiv=1 ORDER BY id DESC LIMIT 1", (pid,)).fetchone()
            if not alt:   # noch keine Version: die bisherigen LVs werden zur „Startversion“
                alt = c.execute("INSERT INTO ava_version(project_id, name, aktiv, created, updated, updated_by) VALUES(?,?,1,?,?,?) RETURNING id",
                                (pid, "Startversion", now, now, wer)).fetchone()
                c.execute("UPDATE ava_lv SET version_id=? WHERE project_id=? AND version_id IS NULL", (alt["id"], pid))
            vid = c.execute("INSERT INTO ava_version(project_id, name, aktiv, von, created, updated, updated_by) VALUES(?,?,0,?,?,?,?) RETURNING id",
                            (pid, name, alt["id"], now, now, wer)).fetchone()["id"]
            for r in c.execute("SELECT * FROM ava_lv WHERE version_id=? ORDER BY id", (alt["id"],)).fetchall():
                n = c.execute("""INSERT INTO ava_lv(project_id, bk_id, nr, name, gewerk, status, data, vergabe, archived, rev, created, updated, updated_by, version_id)
                                 VALUES(?,?,?,?,?,?,?,?,?,0,?,?,?,?) RETURNING id""",
                              (r["project_id"], r["bk_id"], r["nr"], r["name"], r["gewerk"], r["status"], r["data"], r["vergabe"], r["archived"],
                               now, now, wer, vid)).fetchone()["id"]
                amap = {}
                for a in c.execute("SELECT * FROM ava_angebot WHERE lv_id=? ORDER BY id", (r["id"],)).fetchall():
                    amap[a["id"]] = c.execute("""INSERT INTO ava_angebot(lv_id, contact_id, bieter, eingang, preise, nachlass, skonto, notiz, quelle, created, updated)
                                                 VALUES(?,?,?,?,?,?,?,?,?,?,?) RETURNING id""",
                                              (n, a["contact_id"], a["bieter"], a["eingang"], a["preise"], a["nachlass"], a["skonto"], a["notiz"], a["quelle"],
                                               a["created"], a["updated"])).fetchone()["id"]
                V = _j(r["vergabe"], {}) or {}
                if V.get("angebot_id") in amap:   # Vergabe zeigt auf das kopierte Angebot
                    V["angebot_id"] = amap[V["angebot_id"]]
                    c.execute("UPDATE ava_lv SET vergabe=? WHERE id=?", (json.dumps(V, ensure_ascii=False), n))
                c.execute("""INSERT INTO ava_aufmass(lv_id, pos_id, datum, ort, formel, menge, quelle, created, user_name)
                             SELECT ?, pos_id, datum, ort, formel, menge, quelle, created, user_name FROM ava_aufmass WHERE lv_id=? ORDER BY id""", (n, r["id"]))
                c.execute("""INSERT INTO ava_rechnung(lv_id, nr, art, datum, eingang, re_nr, gefordert, data, status, notiz, created, updated, updated_by)
                             SELECT ?, nr, art, datum, eingang, re_nr, gefordert, data, status, notiz, created, updated, updated_by FROM ava_rechnung WHERE lv_id=? ORDER BY id""",
                          (n, r["id"]))
                c.execute("""INSERT INTO ava_bild(lv_id, pos_id, name, w, h, data, klein, created, user_name)
                             SELECT ?, pos_id, name, w, h, data, klein, created, user_name FROM ava_bild WHERE lv_id=? ORDER BY id""", (n, r["id"]))
            c.execute("UPDATE ava_version SET aktiv=CASE WHEN id=? THEN 1 ELSE 0 END WHERE project_id=?", (vid, pid))
            C.audit(wer, "ava", "Neue Version", name)
        rows = c.execute("""SELECT v.*, (SELECT COUNT(*) FROM ava_lv l WHERE l.version_id=v.id) AS n_lv FROM ava_version v
                            WHERE v.project_id=? ORDER BY v.id""", (pid,)).fetchall()
        return jsonify([{"id": v["id"], "name": v["name"], "aktiv": bool(v["aktiv"]), "archived": bool(v["archived"]), "n_lv": v["n_lv"],
                         "created": v["created"], "updated": v["updated"], "updated_by": v["updated_by"]} for v in rows])


@app.route("/api/versionen/<int:vid>", methods=["PUT", "DELETE"])
def version_eins(vid):
    """PUT {aktiv: true} öffnet die Version (gilt für alle), {name}, {archived}. DELETE löscht sie mit allen LVs."""
    with db.tx() as c:
        v = c.execute("SELECT * FROM ava_version WHERE id=?", (vid,)).fetchone()
        if not v or not _sees(c, v["project_id"]):
            return jsonify(error="Version nicht gefunden"), 404
        if request.method == "DELETE":
            if c.execute("SELECT COUNT(*) AS n FROM ava_version WHERE project_id=?", (v["project_id"],)).fetchone()["n"] < 2:
                return jsonify(error="Die einzige Version lässt sich nicht löschen."), 400
            pr = c.execute("SELECT name FROM projects WHERE id=?", (v["project_id"],)).fetchone()
            pk = papierkorb.ablegen(c, "ava_version", vid, "AVA-Version", v["name"], g.user["name"], pr["name"] if pr else "", "ava")
            if v["aktiv"]:
                c.execute("""UPDATE ava_version SET aktiv=1 WHERE id=(SELECT id FROM ava_version WHERE project_id=?
                             ORDER BY archived, updated DESC NULLS LAST, id DESC LIMIT 1)""", (v["project_id"],))
            C.audit(g.user["name"], "ava", "Version gelöscht", v["name"])
            return jsonify(ok=True, papierkorb=pk)   # Papierkorb-ID für „Rückgängig“
        b = request.get_json(silent=True) or {}
        if _s(b.get("name"), 200):
            c.execute("UPDATE ava_version SET name=?, updated=?, updated_by=? WHERE id=?", (_s(b["name"], 200), _now(), g.user["name"], vid))
        if "archived" in b:
            c.execute("UPDATE ava_version SET archived=? WHERE id=?", (1 if b["archived"] else 0, vid))
        if b.get("aktiv"):
            c.execute("UPDATE ava_version SET aktiv=CASE WHEN id=? THEN 1 ELSE 0 END WHERE project_id=?", (vid, v["project_id"]))
        return jsonify(ok=True)


@app.get("/api/suche")
def suche():
    """Volltext über alle LVs (Kurz- und Langtexte, OZ, Titel, Hinweistexte, Nachträge), Bieter, Aufmaß und Türliste.
    pid = nur dieses Projekt; alle Wörter müssen vorkommen (Umlaute egal)."""
    q = (request.args.get("q") or "").strip()
    worte = [w for w in _fold(q).split() if w]
    if not worte or len(q) < 2:
        return jsonify(treffer=[], mehr=False)
    pid = request.args.get("pid", type=int)
    passt = lambda *xs: all(w in _fold(" ".join(str(x or "") for x in xs)) for w in worte)
    out, LIMIT = [], 300
    with db.tx() as c:
        projekte = {}
        for r in c.execute("SELECT * FROM ava_lv WHERE " + ("project_id=?" if pid else "1=1") + " AND " + AKTIV + " ORDER BY archived, nr, id", (pid,) if pid else ()).fetchall():
            if r["project_id"] not in projekte:
                projekte[r["project_id"]] = _sees(c, r["project_id"]) if r["project_id"] else True
            pr = projekte[r["project_id"]]
            if not pr:
                continue
            pname = pr["name"] if pr is not True else ""
            basis = {"lv_id": r["id"], "lv": f"{r['nr']} {r['name']}".strip(), "pid": r["project_id"], "projekt": pname, "archiviert": bool(r["archived"])}
            if passt(r["nr"], r["name"], r["gewerk"]):
                out.append({**basis, "art": "lv", "titel": f"LV {r['nr']} {r['name']}", "text": r["gewerk"] or ""})
            items = (_j(r["data"], {}) or {}).get("items") or []
            for x in items:
                if not passt(x.get("oz"), x.get("kurz"), x.get("lang"), x.get("einheit"), x.get("nt")):
                    continue
                art = "titel" if x.get("typ") == "titel" else "text" if x.get("art") == "T" else "nachtrag" if x.get("nt") else "pos"
                lang = x.get("lang") or ""
                txt = _schnipsel(lang, worte) if lang and lang != x.get("kurz") and any(w in _fold(lang) for w in worte) else ""
                out.append({**basis, "art": art, "pos_id": x.get("id"), "oz": x.get("oz") or "", "titel": x.get("kurz") or "", "text": txt,
                            "nt": x.get("nt") or "", "entf": bool(x.get("entf"))})
                if len(out) >= LIMIT:
                    break
            for a in c.execute("SELECT id, bieter FROM ava_angebot WHERE lv_id=?", (r["id"],)).fetchall():
                if passt(a["bieter"]):
                    out.append({**basis, "art": "angebot", "titel": a["bieter"], "text": "Angebot", "angebot": a["id"]})
            pos = {x.get("id"): x for x in items}
            for a in c.execute("SELECT id, pos_id, ort, formel FROM ava_aufmass WHERE lv_id=?", (r["id"],)).fetchall():
                if passt(a["ort"], a["formel"]):
                    x = pos.get(a["pos_id"]) or {}
                    out.append({**basis, "art": "aufmass", "pos_id": a["pos_id"], "oz": x.get("oz") or "", "titel": x.get("kurz") or "", "text": f"{a['ort']} · {a['formel']}"})
            for a in c.execute("SELECT nr, re_nr, notiz FROM ava_rechnung WHERE lv_id=?", (r["id"],)).fetchall():
                if passt(a["re_nr"], a["notiz"]):
                    out.append({**basis, "art": "rechnung", "titel": f"{a['nr']}. Rechnung" + (f" ({a['re_nr']})" if a["re_nr"] else ""), "text": _schnipsel(a["notiz"], worte)})
            if len(out) >= LIMIT:
                break
        # Türlisten der Projekte
        pids = [pid] if pid else [int(x["key"].split(":")[1]) for x in c.execute("SELECT key FROM bp_store WHERE key LIKE 'tueren:%'").fetchall()
                                  if x["key"].split(":")[1].isdigit()]
        for p_ in pids:
            if len(out) >= LIMIT:
                break
            d = _tueren_laden(c, p_)
            if not d["tueren"]:
                continue
            pr = _sees(c, p_)
            if not pr:
                continue
            for t in d["tueren"]:
                if isinstance(t, dict) and passt(*[v for v in t.values() if isinstance(v, (str, int, float))]):
                    out.append({"art": "tuer", "pid": p_, "projekt": pr["name"], "lv_id": None, "lv": "Türliste", "tuer": t.get("id"),
                                "titel": f"Tür {t.get('nr') or ''}".strip(), "text": " · ".join(str(t.get(k)) for k in ("raum", "typ", "breite", "hoehe") if t.get(k))})
    return jsonify(treffer=out[:LIMIT], mehr=len(out) >= LIMIT)


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
    stack, cnt = [], {}
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
        vid = request.args.get("version_id", type=int)   # Kopierquelle: auch eine andere als die aktive Version
        if pid and vid:
            rows = c.execute("SELECT * FROM ava_lv WHERE project_id=? AND version_id=? ORDER BY archived, nr, id", (pid, vid)).fetchall()
        else:
            rows = c.execute("SELECT * FROM ava_lv WHERE " + ("project_id=?" if pid else "1=1") + " AND " + AKTIV + " ORDER BY archived, nr, id", (pid,) if pid else ()).fetchall()
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
            n = c.execute("SELECT COUNT(*) AS n FROM ava_lv WHERE project_id IS NOT DISTINCT FROM ? AND " + AKTIV, (pid,)).fetchone()["n"]
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
            pr = c.execute("SELECT name FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
            pk = papierkorb.ablegen(c, "ava_lv", i, "Leistungsverzeichnis", f"LV {r['nr']} {r['name']}".strip(), g.user["name"], pr["name"] if pr else "", "ava")
            C.audit(g.user["name"], "ava", "LV in den Papierkorb", f"{r['nr']} {r['name']}")
            return jsonify(ok=True, papierkorb=pk)   # Papierkorb-ID für „Rückgängig“
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


# Positionen aus den Baudaten (Positionsdatenbank, importierte Kataloge): /api/baudaten/suche und /api/baudaten/positionen
baudaten.register(app)


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


# ---------------------------------------------------------------- Türliste (je Projekt) → Positionen im LV
# Gespeichert in bp_store „tueren:<projekt>“ als {"tueren": [...], "rev": n}. Jede Tür ist ein flaches Objekt mit Text- und Ja/Nein-Feldern.
TUER_TEXT = {"nr": 30, "geschoss": 30, "raum": 30, "raumname": 80, "zu": 80, "typ": 30, "art": 60, "flg": 30, "din": 10, "b": 10, "h": 10, "wand": 10,
             "zarge": 60, "blatt": 60, "oberfl": 60, "farbe": 60, "brand": 20, "schall": 20, "rc": 10, "klima": 10, "schloss": 40, "beschlag": 60,
             "glas": 60, "bem": 500, "anzahl": 6, "oeffnung": 40, "bruestung": 20, "fb_innen": 60, "fb_aussen": 60, "rollo": 60}
TUER_JA = {"otsch": "Obentürschließer mit Gleitschiene", "frl": "Feststellanlage (Rauchmelder, Magnet)", "licht": "Lichtausschnitt",
           "oberlicht": "Oberlicht", "seitenteil": "Seitenteil", "bodend": "absenkbare Bodendichtung", "schwelle": "schwellenlos (barrierefrei)",
           "bf": "barrierefrei nach DIN 18040 (lichte Breite ≥ 90 cm, Bedienkräfte)", "panik": "Panikbeschlag nach DIN EN 1125",
           "notaus": "Notausgangsverschluss nach DIN EN 179", "eoeff": "Elektro-Türöffner", "antrieb": "Drehflügelantrieb mit Tastern",
           "zk": "Vorrüstung Zutrittskontrolle", "lueft": "Lüftungsöffnung (Überströmöffnung)", "stopper": "Türstopper",
           "kanten": "Kantenschutz", "umfz": "Umfassungszarge", "nass": "für Feuchträume (Klimaklasse III)", "sa": "Profilzylinder in Schließanlage", "rm": "Riegelkontakt / Öffnungsmelder"}


def _tuer_clean(v):
    out, seen = [], set()
    for x in (v if isinstance(v, list) else [])[:2000]:
        if not isinstance(x, dict):
            continue
        t = {"id": _s(x.get("id"), 20) or uuid.uuid4().hex[:10]}
        while t["id"] in seen:
            t["id"] = uuid.uuid4().hex[:10]
        seen.add(t["id"])
        for k, n in TUER_TEXT.items():
            val = _s(x.get(k), n)
            if val:
                t[k] = val
        for k in TUER_JA:
            if x.get(k):
                t[k] = True
        out.append(t)
    return out


def _tueren_laden(c, pid):
    from bpcore import konto
    d = _j(konto._get(c, f"tueren:{pid}"), {}) or {}
    return {"tueren": d.get("tueren") or [], "rev": d.get("rev") or 0, "updated_by": d.get("updated_by") or ""}


_GRUPPE_OHNE = {"id", "nr", "geschoss", "raum", "raumname", "zu", "din", "bem", "anzahl"}


def _meter(v):
    """Maß wie in der Türliste eingegeben (m oder mm) → Meter: „1010“ und „1,01“ → 1.01."""
    try:
        x = float(str(v).replace(" ", "").replace(",", "."))
    except ValueError:
        return None
    return x / 1000 if x >= 10 else x


def _m(v):
    x = _meter(v)
    return str(v) if x is None else (f"{x:.3f}".rstrip("0").rstrip(".") if x % 1 else f"{x:.2f}").replace(".", ",")


def _mm(v):
    x = _meter(v)
    return str(v) if x is None else f"{round(x * 1000):,}".replace(",", ".")


def _tuer_kurz(t):
    teile = [t.get("art") or "Tür", t.get("flg") or ""]
    if t.get("b") and t.get("h"):
        teile.append(f"{_mm(t['b'])} × {_mm(t['h'])} mm")
    for k in ("brand", "schall", "rc"):
        if t.get(k):
            teile.append(t[k])
    return ((f"Typ {t['typ']}: " if t.get("typ") else "") + ", ".join(x for x in teile if x))[:300]


def _tuer_lang(t, liste):
    z = []
    kopf = (t.get("art") or "Tür") + (", " + {"1-flg.": "einflügelig", "2-flg.": "zweiflügelig", "2-flg. ungleich": "zweiflügelig, ungleich geteilt"}.get(t.get("flg"), t.get("flg") or "") if t.get("flg") else "")
    z.append(kopf + ", liefern und fachgerecht einbauen, einschließlich aller Befestigungs- und Abdichtungsarbeiten.")
    if t.get("b") or t.get("h"):
        z.append(f"Baurichtmaß (B × H): {_mm(t.get('b') or '…')} × {_mm(t.get('h') or '…')} mm" + (f", Wanddicke {_mm(t['wand'])} mm" if t.get("wand") else ""))
    elif t.get("wand"):
        z.append(f"Wanddicke {_mm(t['wand'])} mm")
    for k, lab in (("zarge", "Zarge"), ("blatt", "Türblatt"), ("oberfl", "Oberfläche"), ("farbe", "Farbe"), ("glas", "Verglasung"), ("schloss", "Schloss"), ("beschlag", "Beschlag"), ("klima", "Klimaklasse")):
        if t.get(k):
            z.append(f"{lab}: {t[k]}")
    if t.get("brand"):
        b = t["brand"]
        txt = []
        if b.startswith("T30"): txt.append("Feuerschutzabschluss T30 (EI2 30-C5) nach DIN 4102-5 / DIN EN 1634-1, mit allgemeiner bauaufsichtlicher Zulassung bzw. Bauartgenehmigung, selbstschließend")
        elif b.startswith("T90"): txt.append("Feuerschutzabschluss T90 (EI2 90-C5) nach DIN 4102-5 / DIN EN 1634-1, mit allgemeiner bauaufsichtlicher Zulassung bzw. Bauartgenehmigung, selbstschließend")
        elif b.startswith("EI"): txt.append(f"Feuerschutzabschluss {b} nach DIN EN 1634-1, selbstschließend")
        if "RS" in b: txt.append("Rauchschutz (RS / Sa) nach DIN 18095 / DIN EN 1634-3, selbstschließend")
        z.extend(txt or [f"Brandschutz: {b}"])
    if t.get("schall"):
        z.append(f"Schallschutz: bewertetes Schalldämm-Maß Rw,P ≥ {t['schall'].replace('dB', '').strip()} dB (eingebaut)")
    if t.get("rc"):
        z.append(f"Einbruchhemmung: {t['rc']} nach DIN EN 1627")
    aus = [TUER_JA[k] for k in TUER_JA if t.get(k)]
    if aus:
        z.append("Ausstattung: " + "; ".join(aus))
    # welche Türen gehören dazu (aus der Türliste)
    din = Counter(x.get("din") for x in liste for _ in range(max(1, int(_f(x.get("anzahl"), 1, 1, 999)))) if x.get("din"))
    if din:
        z.append("Anschlag: " + ", ".join(f"{n} × {d}" for d, n in sorted(din.items())))
    nrn = [((x.get("nr") or "?") + (f" ({x['raum']}{' ' + x['raumname'] if x.get('raumname') else ''})" if x.get("raum") or x.get("raumname") else "")) for x in liste]
    z.append("Türen laut Türliste: " + ", ".join(nrn))
    bem = sorted({x["bem"] for x in liste if x.get("bem")})
    if bem:
        z.append("Hinweise: " + " / ".join(bem))
    return "\n".join(z)[:20000]


def _tuer_gruppe(t):
    """Titel im LV: Fenster, Außentüren, Innentüren (wie in den bisherigen LVs des Büros)."""
    a = (t.get("art") or "").lower()
    if a.startswith("fenster") or "fenster" in a:
        return "Fenster"
    if a.startswith(("außen", "aussen", "nebeneingang", "haus", "tor")):
        return "Außentüren"
    return "Innentüren"


_FENSTERART = ("Fenster", )
_ORT = {"id", "nr", "geschoss", "raum", "raumname", "zu", "bem", "anzahl"}
# Merkmale in der Reihenfolge der LV-Texte: (Schlüssel, Bezeichnung)
_MERKMALE = [("art", "Typ"), ("flg", "Flügel"), ("din", "Öffnungsrichtung"), ("oeffnung", "Öffnungsart"), ("bruestung", "Brüstungshöhe"),
             ("fb_innen", "Innenfensterbank"), ("fb_aussen", "Außenfensterbank"), ("rollo", "Rollo"), ("wand", "Wanddicke"),
             ("zarge", "Zarge"), ("blatt", "Türblatt"), ("oberfl", "Oberfläche"), ("farbe", "Farbe"), ("glas", "Verglasung"),
             ("brand", "Ausführung"), ("schall", "Schallschutz"), ("rc", "Einbruchhemmung"), ("klima", "Klimaklasse"),
             ("schloss", "Schloss"), ("beschlag", "Beschlag")]
# immer mit ja/nein nennen (wie bisher im LV), sonst nur, wenn angehakt
_JA_NEIN = {"Innentüren": ("licht", "umfz", "lueft"), "Außentüren": (), "Fenster": ()}


def _merkmal_zeile(k, lab, v):
    if k == "din":
        v = {"DIN L": "L", "DIN R": "R"}.get(v, v)
    elif k == "bruestung":
        v = _m(v)
    elif k == "brand":
        v = v.replace("-", "")
    return f"{lab}: {v}"


def _positionen_merkmale(liste, gemeinsam, gruppe):
    t = liste[0]
    z = ["Einbauposition: " + ", ".join(x.get("nr") or "?" for x in liste)]
    raeume = [x.get("raumname") or x.get("raum") or "" for x in liste]
    if any(raeume):
        z.append("Raum: " + ", ".join(r for r in raeume if r))
    for k, lab in _MERKMALE[:1]:
        z.append(_merkmal_zeile(k, lab, t.get(k) or ""))
    if t.get("b") or t.get("h"):
        z.append(f"Maße (bxh): {_m(t.get('b') or '?')}x{_m(t.get('h') or '?')}")
    for k, lab in _MERKMALE[1:]:
        if t.get(k) and (k in ("din", "brand") or k not in gemeinsam):
            z.append(_merkmal_zeile(k, lab, t[k]))
    jn = _JA_NEIN.get(gruppe, ())
    for k in jn:
        z.append(f"{TUER_JA[k].split(' (')[0].split(' /')[0]}: {'ja' if t.get(k) else 'nein'}")
    for k, lab in TUER_JA.items():
        if t.get(k) and k not in jn and k not in gemeinsam:
            z.append(lab)
    bem = sorted({x["bem"] for x in liste if x.get("bem")})
    z.extend(bem)
    return "\n".join(z)[:20000]


def _system_text(gruppe, gemeinsam):
    z = []
    for k, lab in _MERKMALE[1:]:
        if k in gemeinsam and k not in ("din", "brand", "art"):
            z.append(_merkmal_zeile(k, lab, gemeinsam[k]))
    for k, lab in TUER_JA.items():
        if gemeinsam.get(k) and k not in _JA_NEIN.get(gruppe, ()):
            z.append(lab)
    return ("\n".join(z) if z else "(Hersteller/System, Profile, Oberfläche, Beschläge, Anschlüsse – bitte ergänzen oder aus einem alten LV über die Kopierquelle übernehmen)")


def tueren_zu_positionen(tueren, form="merkmale", din_trennen=True):
    """Türen/Fenster zu LV-Positionen: gleiche Ausführung = eine Position (Menge = Stückzahl).
    form „merkmale“ (wie in den bisherigen LVs des Büros): je Gruppe (Fenster, Außentüren, Innentüren) ein Titel mit
    Systembeschreibung (Hinweistext mit allem, was für alle gleich ist), darunter Positionen „… gemäß vorangegangener
    Systembeschreibung“ mit Einbauposition, Raum, Typ, Maße, Öffnungsrichtung usw.
    form „lang“: ein ausführlicher Langtext je Position (ohne Titel je Gruppe)."""
    ohne = _ORT | (set() if din_trennen else {"din"})
    nach_gruppe = {}
    for t in tueren:
        nach_gruppe.setdefault(_tuer_gruppe(t) if form == "merkmale" else "", []).append(t)
    out = []
    for gruppe in [g for g in ("Fenster", "Außentüren", "Innentüren", "") if g in nach_gruppe]:
        T = nach_gruppe[gruppe]
        gruppen = {}
        for t in T:
            k = json.dumps({a: b for a, b in t.items() if a not in ohne}, sort_keys=True)
            gruppen.setdefault(k, []).append(t)
        items = []
        if form == "merkmale":
            keys = set().union(*[set(t) for t in T]) - _ORT - {"din", "b", "h", "art", "typ"}
            gemeinsam = {k: T[0][k] for k in keys if all(t.get(k) == T[0].get(k) for t in T)} if len(gruppen) > 1 else {}
            items.append({"id": uuid.uuid4().hex[:10], "typ": "titel", "lvl": 1, "kurz": gruppe})
            items.append({"id": uuid.uuid4().hex[:10], "typ": "pos", "art": "T", "kurz": f"Systembeschreibung {gruppe}", "lang": _system_text(gruppe, gemeinsam), "menge": 0, "einheit": ""})
        for liste in gruppen.values():
            t = liste[0]
            n = sum(max(1, int(_f(x.get("anzahl"), 1, 1, 999))) for x in liste)
            if form == "merkmale":
                kurz = f"{t.get('art') or ('Fenster' if gruppe == 'Fenster' else 'Tür')} gemäß vorangegangener Systembeschreibung"
                lang = _positionen_merkmale(liste, gemeinsam, gruppe)
            else:
                kurz, lang = _tuer_kurz(t), _tuer_lang(t, liste)
            items.append({"id": uuid.uuid4().hex[:10], "typ": "pos", "art": "N", "kurz": kurz[:500], "lang": lang, "menge": n, "einheit": "St",
                          "kg": "334" if gruppe in ("Fenster", "Außentüren") or (t.get("art") or "").startswith(("Außen", "Tor")) else "344",
                          "bezug": "Türliste", "quelle": "Türliste: " + ", ".join(x.get("nr") or "?" for x in liste)})
        out.extend(items)
    return out


@app.route("/api/projekt/<int:pid>/tueren", methods=["GET", "PUT"])
def tueren(pid):
    from bpcore import konto
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        if request.method == "GET":
            return jsonify(_tueren_laden(c, pid))
        b = request.get_json(silent=True) or {}
        c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", (f"tueren:{pid}",))
        alt = _tueren_laden(c, pid)
        if isinstance(b.get("rev"), int) and b["rev"] != alt["rev"] and not b.get("force"):
            return jsonify(error=f"Die Türliste wurde inzwischen von {alt['updated_by'] or 'jemand anderem'} geändert.", conflict=True), 409
        neu = {"tueren": _tuer_clean(b.get("tueren")), "rev": alt["rev"] + 1, "updated_by": g.user["name"]}
        konto._put(c, f"tueren:{pid}", json.dumps(neu, ensure_ascii=False), g.user["name"])
        return jsonify(neu)


@app.get("/api/projekt/<int:pid>/raeume")
def projekt_raeume(pid):
    """Räume aus dem Raumbuch der Kostenermittlung des Projekts (für die Türliste)."""
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        bk = c.execute("SELECT id, name, data FROM bk_projects WHERE project_id=? AND archived=0 ORDER BY updated DESC LIMIT 1", (pid,)).fetchone()
        if not bk:
            return jsonify(bk=None, raeume=[])
        d = _j(bk["data"], {}) or {}
        return jsonify(bk={"id": bk["id"], "name": bk["name"]},
                       raeume=[{"nr": x.get("nr") or "", "name": x.get("name") or "", "geschoss": x.get("floor") or ""} for x in d.get("rooms") or []])


@app.post("/api/projekt/<int:pid>/tueren/lv")
def tueren_ins_lv(pid):
    """Türen (alle oder ausgewählte) zu Positionen zusammenfassen – gleiche Ausführung = eine Position, Menge = Anzahl –
    und an ein LV anhängen (unter einem Titel „Türen“) oder ein neues LV anlegen."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        T = _tueren_laden(c, pid)["tueren"]
        ids = set(b.get("ids") or [])
        if ids:
            T = [t for t in T if t["id"] in ids]
        if not T:
            return jsonify(error="Keine Türen in der Liste."), 400
        form = "lang" if b.get("form") == "lang" else "merkmale"
        pos = tueren_zu_positionen(T, form, b.get("din_trennen", True) is not False)
        titel = _s(b.get("titel"), 300)
        neu = ([{"id": uuid.uuid4().hex[:10], "typ": "titel", "lvl": 1, "kurz": titel or "Türen"}] if form == "lang" or titel else []) + pos
        if form == "merkmale" and titel:   # Obertitel: Gruppen werden Untertitel
            for x in neu[1:]:
                if x["typ"] == "titel":
                    x["lvl"] = 2
        now = _now()
        if isinstance(b.get("lv"), int):
            r = _lv(c, b["lv"])
            if not r or r["project_id"] != pid:
                return jsonify(error="LV nicht gefunden"), 404
            i = r["id"]
            d = _j(r["data"], {}) or {}
            d["items"] = clean_items((d.get("items") or []) + neu)
            nummerieren(d["items"])
            versionen.vor(c, f"avalv:{i}")
            c.execute("UPDATE ava_lv SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(d, ensure_ascii=False), now, g.user["name"], i))
        else:
            n = c.execute("SELECT COUNT(*) AS n FROM ava_lv WHERE project_id=? AND " + AKTIV, (pid,)).fetchone()["n"]
            items = nummerieren(clean_items(neu))
            i = c.execute("INSERT INTO ava_lv(project_id, nr, name, gewerk, data, created, updated, updated_by) VALUES(?,?,?,?,?,?,?,?) RETURNING id",
                          (pid, str(n + 1).zfill(2), _s(b.get("name"), 200) or "Türen", _s(b.get("gewerk"), 120) or "Türen",
                           json.dumps({"items": items}, ensure_ascii=False), now, now, g.user["name"])).fetchone()["id"]
        versionen.nach(c, f"avalv:{i}", g.user["name"])
        C.audit(g.user["name"], "ava", "Türliste ins LV", f"{len(T)} Türen/Fenster")
        return jsonify(ok=True, lv=i, positionen=sum(1 for x in pos if x["typ"] == "pos" and x["art"] != "T"), tueren=len(T))


@app.get("/api/projekt/<int:pid>/tueren.xlsx")
def tueren_excel(pid):
    import openpyxl
    from openpyxl.styles import Alignment, Font, PatternFill
    with db.tx() as c:
        p = _sees(c, pid)
        if not p:
            return jsonify(error="Projekt nicht gefunden"), 404
        T = _tueren_laden(c, pid)["tueren"]
    sp = [("nr", "Tür-Nr."), ("geschoss", "Geschoss"), ("raum", "Raum-Nr."), ("raumname", "Raum"), ("zu", "zu Raum"), ("typ", "Typ"), ("anzahl", "Anz."), ("art", "Art"),
          ("flg", "Flügel"), ("din", "Öffnungsrichtung"), ("b", "Breite"), ("h", "Höhe"), ("wand", "Wand"), ("bruestung", "Brüstung"),
          ("oeffnung", "Öffnungsart"), ("fb_innen", "Innenfensterbank"), ("fb_aussen", "Außenfensterbank"), ("rollo", "Rollo"), ("zarge", "Zarge"), ("blatt", "Türblatt"),
          ("oberfl", "Oberfläche"), ("farbe", "Farbe"), ("glas", "Verglasung"), ("brand", "Brandschutz"), ("schall", "Schall"), ("rc", "RC"),
          ("klima", "Klima"), ("schloss", "Schloss"), ("beschlag", "Beschlag")] + [(k, v.split(" (")[0].split(" nach")[0]) for k, v in TUER_JA.items()] + [("bem", "Bemerkung")]
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Türliste"
    ws.append([f"Türliste – {p['name']}"])
    ws["A1"].font = Font(bold=True, size=13)
    ws.append([])
    ws.append([l for _, l in sp])
    kopf = PatternFill("solid", fgColor="E8E6E1")
    for cell in ws[3]:
        cell.font = Font(bold=True)
        cell.fill = kopf
        cell.alignment = Alignment(wrap_text=True, vertical="bottom", text_rotation=90 if sp[cell.column - 1][0] in TUER_JA else 0)
    for t in T:
        ws.append([("x" if t.get(k) else "") if k in TUER_JA else t.get(k, "") for k, _ in sp])
    for i, (k, _) in enumerate(sp, 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = 4 if k in TUER_JA else 40 if k == "bem" else 13
    ws.row_dimensions[3].height = 120
    ws.freeze_panes = "B4"
    buf = io.BytesIO()
    wb.save(buf)
    return _datei(buf.getvalue(), re.sub(r"[\\/:*?\"<>|]+", "_", f"Türliste {p['name']}") + ".xlsx",
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


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
        t = Table(data, colWidths=widths, repeatRows=1 if head else 0, splitInRow=1)   # lange Langtexte dürfen über die Seite laufen
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

    class EditPara(Paragraph):
        """Im Entwurf: unsichtbarer Link über dem ganzen Absatz – der Druck-Editor macht daraus ein bearbeitbares Feld (Position + Feld)."""
        def __init__(self, text, style, ziel=None, **kw):
            super().__init__(text, style, **kw)
            self._ziel = ziel

        def split(self, aW, aH):   # über den Seitenrand geteilt: beide Teile bleiben bearbeitbar
            teile = super().split(aW, aH)
            for t in teile:
                t._ziel = self._ziel
            return teile

        def drawOn(self, canv, x, y, _sW=0):
            super().drawOn(canv, x, y, _sW)
            if self._ziel:
                canv.linkURL("https://bauplattform.invalid/edit/" + self._ziel, (x, y, x + self.width, y + self.height), relative=1, thickness=0)

    def PE(text, style, pid, feld):   # Paragraph, im Entwurf bearbeitbar
        return EditPara(text, style, f"{pid}/{feld}") if entwurf and pid else Paragraph(text, style)
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
        reihen = []   # je zwei Fotos eine eigene Tabellenzeile – so dürfen viele Fotos über mehrere Seiten laufen
        for k in range(0, len(out), 2):
            t = Table([out[k:k + 2] + [""] * (2 - len(out[k:k + 2]))], colWidths=[sp + 1.5 * mm] * 2, hAlign="LEFT")
            t.setStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 3)])
            reihen.append(t)
        return reihen

    def stuecke_von(text):   # Text in Abschnitte zu höchstens 10 Zeilen bzw. 1000 Zeichen – lange Texte laufen so über mehrere Seiten
        zeilen_, st, cur_, n_ = [], [], [], 0
        for z in str(text or "").split("\n"):
            while len(z) > 1000:
                cut = z.rfind(" ", 0, 1000)
                cut = cut if cut > 200 else 1000
                zeilen_.append(z[:cut]); z = z[cut:].lstrip()
            zeilen_.append(z)
        for z in zeilen_:
            if cur_ and (len(cur_) >= 10 or n_ + len(z) > 1000):
                st.append("\n".join(cur_)); cur_, n_ = [], 0
            cur_.append(z); n_ += len(z)
        if cur_:
            st.append("\n".join(cur_))
        return st or [""]

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
                 ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                 ("FONT", (0, 0), (-1, 0), FN["b"], fs - 0.5), ("TEXTCOLOR", (0, 0), (-1, 0), MUTE), ("LINEBELOW", (0, 0), (-1, 0), 0.8, INK)] + \
                [("ALIGN", (ci, 0), (ci, -1), "RIGHT") for ci in (2, 4, 5)]

    weiter = set()   # Zeilen, an die eine Fortsetzung des Langtexts anschließt (dort keine Trennlinie)

    def tabelle_schliessen():
        nonlocal rows, band, weiter
        if len(rows) > 1:
            # lange Langtexte stehen in Fortsetzungszeilen – die Tabelle bricht dann zwischen den Zeilen um
            t = Table(rows, colWidths=[17 * mm, wl, 17 * mm, 11 * mm, 20 * mm, 25 * mm], repeatRows=1)
            t.setStyle(TableStyle(hdr_style + [("BACKGROUND", (0, ri), (-1, ri), BAND) for ri in band]
                                  + [("LINEBELOW", (0, ri), (-1, ri), 0.3, LINE) for ri in range(1, len(rows)) if ri not in weiter]
                                  + [("BOTTOMPADDING", (0, ri), (-1, ri), 0) for ri in weiter] + [("TOPPADDING", (0, ri + 1), (-1, ri + 1), 0) for ri in weiter]))
            story.append(t)
        rows, band, weiter = [head], [], set()
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
            rows.append([x.get("oz") or "", PE(f"<b>{X(x['kurz'])}</b>", S["pb"], x.get("id"), "kurz"), "", "", "", ""]); band.append(len(rows) - 1)
            continue
        if x.get("art") == "T":   # Hinweistext (z. B. lange Vorbemerkung aus GAEB) – ebenfalls in Abschnitten
            for k_, st_ in enumerate(stuecke_von(x.get("lang") or x["kurz"])):
                if k_:
                    weiter.add(len(rows) - 1)
                rows.append(["", PE(f"<font name='{FN['i']}'>{X(st_)}</font>", S["lang"], x.get("id"), "lang" if x.get("lang") else "kurz"), "", "", "", ""])
            continue
        if x.get("np_vor") and len(rows) > 1:   # Druckoption „Neue Seite vorher“
            tabelle_schliessen(); story.append(PageBreak())
        kz = f"<b>{X(x['kurz'])}</b>" + (" <font size='7'>[S]</font>" if x.get("sp") else "")
        zelle = [PE(f"<strike>{kz}</strike> – entfällt" if x.get("entf") else kz, S["p"], x.get("id"), "kurz")]
        stuecke = []
        if lay["langtext"] and x.get("lang") and x["lang"] != x["kurz"]:
            stuecke = stuecke_von(x["lang"])
            zelle.append(PE(X(stuecke.pop(0)), S["lang"], x.get("id"), "lang"))
        if x.get("art") in ("E", "A", "P"):
            zelle.append(Paragraph("Bedarfsposition (mit GB)" if x["art"] == "E" and x.get("gb") else ARTEN[x["art"]], S["mu"]))
        if x.get("bezug"):
            bz = next((y for y in items if y.get("id") == x["bezug"]), None)
            if bz:
                zelle.append(Paragraph(f"Bezug: Pos. {X(bz.get('oz') or '')} {X(bz.get('kurz') or '')}", S["mu"]))
        bilder = fotos(x["id"], wl - 5 * mm)
        ep = ep_of(x)
        gp = _gp(x, ep) if ep is not None and zaehlt({**x, "nt": None}) else None
        if gp is not None:
            gesamt += gp
            for _, tid in cur:
                tsum[tid] += gp
        rows.append([x.get("oz") or "", zelle, num(x.get("menge")), x.get("einheit") or "",
                     ep2(ep) if ep is not None else ("" if preis != "leer" else "............"),
                     "entfällt" if x.get("entf") else eur(gp) if gp is not None else ("(ohne GB)" if ep is not None else ("" if preis != "leer" else "................"))])
        for st_ in stuecke:   # Fortsetzung des Langtexts
            weiter.add(len(rows) - 1)
            rows.append(["", PE(X(st_), S["lang"], x.get("id"), "lang"), "", "", "", ""])
        for bt_ in bilder:   # Fotos, je zwei in einer Zeile
            weiter.add(len(rows) - 1)
            rows.append(["", bt_, "", "", "", ""])
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
        t.setStyle(TableStyle(hdr_style[:7] + [("LINEBELOW", (0, 0), (-1, -1), 0.3, LINE), ("LINEBELOW", (0, 0), (-1, 0), 0.8, INK), ("ALIGN", (2, 0), (2, -1), "RIGHT"), ("FONT", (0, len(z) - 3), (-1, -1), FN["b"], fs),
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
        try:
            pdf, F = _lv_druck(c, r, P, lay, entwurf=b.get("schritt") == "entwurf")
        except Exception as e:   # verständliche Meldung statt „Internal Server Error“
            import traceback
            traceback.print_exc()
            return jsonify(error=f"Der Ausdruck konnte nicht erstellt werden ({type(e).__name__}: {str(e)[:200]})."), 500
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
