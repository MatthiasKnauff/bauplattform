"""Baudaten: gemeinsamer Zugriff auf die Positionsdatenbank (Tabellen pdb_*, Migration 0023/0024 im Bautagebuch).

Genutzt von der App „Baudaten“ (plattform/baudaten.py) und von Ausschreibung/Vergabe und Baukosten
(„Position aus Baudaten einfügen“). Alle Apps lesen dieselbe Datenbank – deshalb direkt per SQL, ohne Umweg über HTTP.

Preise: Katalogpreis zum Preisstand des Katalogs × Index_aktuell / Index_basis × Faktor (Region/Projekt).
"""
import json
import re

# Baupreisindex Neubau Wohngebäude Deutschland (Destatis, 2021 = 100): Jahresmittel und einzelne Berichtsmonate.
# Für die Fortschreibung von Katalogen mit anderem Preisstand (z. B. sirAdos 07/2019 → heute).
INDEX_REIHE = {"2012": 74.7, "2013": 76.2, "2014": 77.4, "2015": 78.7, "2016": 80.3, "2017": 82.8, "2018": 86.4, "2019": 90.2,
               "2020": 91.6, "2021": 100.0, "2022": 116.3, "2023": 126.1, "2024": 129.8, "2025": 133.9,
               "2024-02": 128.5, "2024-05": 129.4, "2024-08": 130.3, "2024-11": 130.8, "2025-02": 132.6, "2025-05": 133.6,
               "2026-05": 140.3, "2026-08": 141.7}


def index_fuer(stand):
    """Indexwert zum Preisstand 'JJJJ-MM' bzw. 'JJJJ' (Berichtsmonat, sonst Jahresmittel); None, wenn unbekannt."""
    st = str(stand or "")[:7]
    if st in INDEX_REIHE:
        return INDEX_REIHE[st]
    if st[:4] in INDEX_REIHE:
        return INDEX_REIHE[st[:4]]
    if st[:4].isdigit() and int(st[:4]) > 2025:
        return max((v for k, v in INDEX_REIHE.items() if k[:4] == st[:4]), default=None)
    return None


FELDER = ("id", "katalog", "code", "lb_nr", "gruppe", "titel", "kurz", "einheit", "kg", "gewerk", "ep_von", "ep_mittel", "ep_bis",
          "genauigkeit", "tags", "quelle", "preisstand", "aktiv", "favorit")


def meta(c):
    return {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM pdb_meta").fetchall()}


def _f(x, d=None):
    try:
        return float(str(x).replace(",", "."))
    except (TypeError, ValueError):
        return d


def einstellungen(c):
    """Aktueller Index, gewählter Faktor und Kataloge (mit eigener Indexbasis)."""
    m = meta(c)
    basis = _f(m.get("index_basis"), 141.7)
    akt = _f(m.get("index_aktuell"), basis)
    fak = c.execute("SELECT id, name, faktor, notiz FROM pdb_faktor ORDER BY faktor, name").fetchall()
    fid = int(_f(m.get("faktor_id"), 0) or 0)
    f = next((x for x in fak if x["id"] == fid), fak[0] if fak else None)
    return {"index_basis": basis, "index_aktuell": akt, "index_name": m.get("index_name", "Baupreisindex"),
            "preisstand": m.get("preisstand", ""), "faktor_id": f["id"] if f else None, "faktor": f["faktor"] if f else 1.0,
            "faktor_name": f["name"] if f else "", "faktoren": [dict(x.dict()) for x in fak],
            "genauigkeit": json.loads(m.get("genauigkeit") or "{}")}


def umrechnung(c, katalog=None, E=None):
    """Faktor, mit dem Katalogpreise auf heute (Index) und Region (Faktor) gebracht werden."""
    E = E or einstellungen(c)
    basis = E["index_basis"]
    if katalog and katalog != "gk3":   # andere Kataloge: eigene Indexbasis, sonst aus dem Preisstand (Destatis-Reihe), sonst nur der Faktor
        r = c.execute("SELECT index_basis, preisstand FROM pdb_kataloge WHERE key=?", (katalog,)).fetchone()
        m = c.execute("SELECT value FROM pdb_meta WHERE key=?", ("index:" + katalog,)).fetchone()
        basis = _f(m["value"]) if m else (r["index_basis"] if r and r["index_basis"] else index_fuer(r["preisstand"]) if r else None)
    return (E["index_aktuell"] / basis if basis else 1.0) * (E["faktor"] or 1.0)


def _rund(x):
    if x is None:
        return None
    return round(x, 2) if x < 100 else round(x, 1) if x < 1000 else round(x)


def _wo(a):
    """WHERE aus Filtern: katalog, lb, gruppe, kg, einheit, q (Volltext + Teilwörter), fav, alle (auch inaktive)."""
    w, p = ["1=1"], []
    if not a.get("alle"):
        w.append("p.aktiv=1")
    for k, col in (("katalog", "p.katalog"), ("lb", "p.lb_nr"), ("gruppe", "p.gruppe"), ("einheit", "p.einheit"), ("genauigkeit", "p.genauigkeit")):
        if a.get(k):
            w.append(f"{col}=?"); p.append(str(a[k]))
    if a.get("kg"):
        w.append("p.kg LIKE ?"); p.append(re.sub(r"\D", "", str(a["kg"]))[:3] + "%")
    if a.get("fav"):
        w.append("p.favorit=1")
    q = " ".join(str(a.get("q") or "").split())[:200]
    if q:
        if re.fullmatch(r"[\d.]+", q):   # Code oder Teil davon
            w.append("p.code LIKE ?"); p.append(q + "%")
        else:   # jedes Wort muss in Kurztext, Folgetext, Grundtext oder Titel vorkommen (Teilwörter: „Kalksand“ findet „Kalksand-Plansteine“)
            for t in q.lower().split()[:8]:
                w.append("(lower(p.kurz) LIKE ? OR lower(p.bez) LIKE ? OR lower(p.lang) LIKE ? OR lower(p.titel) LIKE ? OR lower(COALESCE(gt.text, '')) LIKE ?)")
                p += ["%" + t + "%"] * 5
    return " AND ".join(w), p


SQL_LISTE = """SELECT p.id, p.katalog, p.code, p.lb_nr, p.gruppe, p.titel, p.kurz, p.bez, p.einheit, p.kg, p.gewerk, p.ep_von, p.ep_mittel, p.ep_bis,
       p.genauigkeit, p.tags, p.quelle, p.preisstand, p.aktiv, p.favorit, gr.name AS gruppe_name
  FROM pdb_alle p LEFT JOIN pdb_grundtext gt ON gt.id = p.grund_id LEFT JOIN pdb_gruppe gr ON gr.nr = p.gruppe"""


def suche(c, a, n=200, offset=0):
    """Positionen nach Filtern; Preise umgerechnet (ep_*_akt). Gibt (Liste, Gesamtzahl) zurück."""
    w, p = _wo(a)
    E = einstellungen(c)
    fk = {}
    rows = c.execute(f"{SQL_LISTE} WHERE {w} ORDER BY p.favorit DESC, p.katalog, p.code LIMIT ? OFFSET ?", (*p, int(n), int(offset))).fetchall()
    gesamt = c.execute(f"SELECT COUNT(*) AS n FROM pdb_alle p LEFT JOIN pdb_grundtext gt ON gt.id = p.grund_id WHERE {w}", p).fetchone()["n"]
    out = []
    for r in rows:
        d = r.dict()
        f = fk.setdefault(d["katalog"], umrechnung(c, d["katalog"], E))
        for k in ("ep_von", "ep_mittel", "ep_bis"):
            d[k + "_akt"] = _rund(d[k] * f) if d[k] is not None else None
        out.append(d)
    return out, gesamt


def position(c, pid):
    r = c.execute("SELECT * FROM pdb_position_ansicht WHERE id=?", (pid,)).fetchone()
    if not r:
        return None
    d = r.dict()
    f = umrechnung(c, d["katalog"])
    for k in ("ep_von", "ep_mittel", "ep_bis", "ep_eigen_median"):
        d[k + "_akt"] = _rund(d[k] * f) if d.get(k) is not None else None
    d["umrechnung"] = round(f, 4)
    d["nur_lesen"] = d.get("katalog_art") == "avakatalog"
    d["preise"] = [] if pid < 0 else [x.dict() for x in c.execute("SELECT id, ep, datum, project_id, firma, menge, notiz, user_name FROM pdb_preis WHERE position_id=? ORDER BY datum DESC, id DESC", (pid,)).fetchall()]
    return d


def als_lv_position(d):
    """Position der Baudaten → Positionsfelder des LV (AVA) bzw. Bauteil der Baukosten."""
    return {"kurz": d["kurz"], "lang": d.get("lang_voll") or d.get("lang") or "", "einheit": d["einheit"], "kg": d["kg"],
            "ep": d.get("ep_mittel_akt") if d.get("ep_mittel_akt") is not None else d.get("ep_mittel"),
            "pdb": {"id": d["id"], "katalog": d["katalog"], "code": d["code"]}}


def leistungsbereiche(c, katalog="gk3"):
    if katalog == "gk3":
        rows = c.execute("""SELECT l.nr, l.name, l.atv, COUNT(p.id) AS n FROM pdb_leistungsbereich l
                            LEFT JOIN pdb_position p ON p.lb_nr = l.nr AND p.katalog = 'gk3' AND p.aktiv = 1
                            GROUP BY l.nr, l.name, l.atv, l.sort ORDER BY l.sort, l.nr""").fetchall()
        return [x.dict() for x in rows]
    rows = c.execute("""SELECT lb_nr AS nr, MIN(split_part(titel, ' › ', 1)) AS name, '' AS atv, COUNT(*) AS n FROM pdb_alle
                        WHERE katalog=? AND aktiv=1 GROUP BY lb_nr ORDER BY lb_nr""", (katalog,)).fetchall()
    return [x.dict() for x in rows]


def gruppen(c, lb, katalog="gk3"):
    if katalog == "gk3":
        rows = c.execute("""SELECT g.nr, g.name, COUNT(p.id) AS n FROM pdb_gruppe g LEFT JOIN pdb_position p ON p.gruppe = g.nr AND p.katalog='gk3' AND p.aktiv=1
                            WHERE g.lb_nr=? GROUP BY g.nr, g.name ORDER BY g.nr""", (lb,)).fetchall()
        return [x.dict() for x in rows]
    rows = c.execute("""SELECT gruppe AS nr, MIN(titel) AS name, COUNT(*) AS n FROM pdb_alle WHERE katalog=? AND lb_nr=? AND aktiv=1
                        GROUP BY gruppe ORDER BY gruppe""", (katalog, lb)).fetchall()
    return [x.dict() for x in rows]


# ---------------------------------------------------------------- Korb: Positionen in den Baudaten sammeln, später in ein LV / in die Kosten übernehmen
KORB_MAX = 500


def korb(c, uid):
    from . import konto
    try:
        ids = json.loads(konto._get(c, f"pdbkorb:{uid}") or "[]")
    except ValueError:
        ids = []
    return [i for i in ids if isinstance(i, int)]


def korb_setzen(c, uid, ids, wer=""):
    from . import konto
    ids = list(dict.fromkeys(i for i in ids if isinstance(i, int)))[-KORB_MAX:]
    konto._put(c, f"pdbkorb:{uid}", json.dumps(ids), wer)
    return ids


def korb_positionen(c, uid):
    """Positionen im Korb (Reihenfolge wie hinzugefügt), Preise auf heute umgerechnet – Felder wie suche()."""
    ids = korb(c, uid)
    if not ids:
        return []
    E, fk = einstellungen(c), {}
    rows = {r["id"]: r.dict() for r in c.execute(f"{SQL_LISTE} WHERE p.id = ANY(?)", (ids,)).fetchall()}
    out = []
    for i in ids:
        d = rows.get(i)
        if not d:
            continue
        f = fk.setdefault(d["katalog"], umrechnung(c, d["katalog"], E))
        for k in ("ep_von", "ep_mittel", "ep_bis"):
            d[k + "_akt"] = _rund(d[k] * f) if d[k] is not None else None
        out.append(d)
    return out


def register_korb(app):
    from flask import g, jsonify, request
    from bpcore import db

    @app.get("/api/baudaten/korb")
    def baudaten_korb():
        with db.tx() as c:
            return jsonify(korb_positionen(c, g.user["id"]))

    @app.post("/api/baudaten/korb")
    def baudaten_korb_aendern():
        """{dazu: [ids]} · {weg: [ids]} · {leeren: true} → {ids}"""
        b = request.get_json(silent=True) or {}
        with db.tx() as c:
            ids = [] if b.get("leeren") else korb(c, g.user["id"])
            weg = set(b.get("weg") or [])
            ids = [i for i in ids if i not in weg] + [i for i in (b.get("dazu") or []) if isinstance(i, int)]
            ids = korb_setzen(c, g.user["id"], ids, "korb")
        return jsonify(ids=ids)


def register(app):
    """Endpunkte für den Auswahldialog (static/pdbwahl.js) in einer anderen App (Ausschreibung, Baukosten)."""
    from flask import jsonify, request
    from bpcore import db
    register_korb(app)

    @app.get("/api/baudaten/suche")
    def baudaten_suche():
        a = request.args.to_dict()
        try:
            n = min(300, int(float(a.get("n") or 80)))
        except ValueError:
            n = 80
        with db.tx() as c:
            rows, gesamt = suche(c, a, n, 0)
            kats = [x.dict() for x in c.execute("SELECT key, name FROM pdb_kataloge ORDER BY sort, name").fetchall()] if a.get("kataloge") else None
        return jsonify(positionen=rows, gesamt=gesamt, kataloge=kats)

    @app.post("/api/baudaten/positionen")
    def baudaten_positionen():
        """Gewählte Positionen (ids) mit Kurz-/Langtext, Einheit, KG und EP (auf heute umgerechnet) als Schätzpreis."""
        ids = [i for i in (request.get_json(silent=True) or {}).get("ids") or [] if isinstance(i, int)][:300]
        out = []
        with db.tx() as c:
            for i in ids:
                d = position(c, i)
                if d:
                    x = als_lv_position(d)
                    out.append({"typ": "pos", "art": "N", "kurz": x["kurz"], "lang": x["lang"], "menge": 0, "einheit": x["einheit"], "kg": x["kg"],
                                "ep_s": x["ep"], "lb": (d.get("lb_name") or "")[:80], "quelle": f"Baudaten {d['katalog_name']} {d['code']}"[:200],
                                "ep_von": d.get("ep_von_akt"), "ep_bis": d.get("ep_bis_akt"), "genauigkeit": d.get("genauigkeit") or "",
                                "code": d.get("code"), "eigene": [{"ep": p["ep"], "firma": p["firma"] or "", "datum": p["datum"] or ""} for p in d["preise"][:12]],
                                "ep_median": d.get("ep_eigen_median")})
        return jsonify(out)
