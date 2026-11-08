"""Ausschreibung & Abrechnung (AVA): Leistungsverzeichnisse, Angebote mit Preisspiegel, Vergabe, Aufmaß, Nachträge, Rechnungsprüfung.

Daten: Tabellen ava_lv, ava_angebot, ava_aufmass, ava_rechnung (pg_migrations/0013_ava.sql im Bautagebuch).
Ein LV gehört zu einem Projekt des Bautagebuchs. Positionen stehen als JSON-Liste in ava_lv.data (Titel und Positionen,
Reihenfolge = Liste). Austausch mit Firmen über GAEB DA XML (bpcore/gaeb.py: X83 Angebotsaufforderung, X84 Angebot,
X86 Auftrag) oder Excel.

Rechnen (rechne): Angebots- und Auftragssumme aus Menge × Einheitspreis der Normal- und Pauschalpositionen (Bedarfs- und
Wahlpositionen ohne Gesamtbetrag), Nachlass in Prozent. Abrechnung kumuliert: Leistungsstand = Aufmaß × Auftrags-EP,
- Nachlass - Abzüge - Sicherheitseinbehalt = anerkannt; Zahlbetrag = anerkannt - bisher anerkannt (vorige Rechnungen).
"""
import ast, hashlib, io, json, operator, os, re, uuid
from collections import Counter
from datetime import date, datetime

from flask import Response, g, jsonify, redirect, request

from bpcore import ai, baudaten, db, fehler, gaeb, layout, papierkorb, platform, schrift, sso, stammdaten, versionen
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
    if key == "VB":
        return "Vorbemerkungen"
    return "Altbau / Sanierung" if key.startswith("A") or (key.isdigit() and int(key) >= 300) else "Neubau"


_MEMO = {}


def _memo(key, ttl, fn):
    """Kleiner Zwischenspeicher je Prozess für große, selten geänderte Daten (Kataloge, Baudaten) – Kopierquelle öffnet schneller."""
    import time
    jetzt = time.time()
    x = _MEMO.get(key)
    if x and x[0] > jetzt:
        return x[1]
    v = fn()
    if len(_MEMO) > 80:
        for k in sorted(_MEMO, key=lambda k: _MEMO[k][0])[:20]:
            _MEMO.pop(k, None)
    _MEMO[key] = (jetzt + ttl, v)
    return v


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
        def lesen():
            n = {r["gewerk"]: r["n"] for r in c.execute("SELECT gewerk, COUNT(*) AS n FROM ava_katalog WHERE katalog_id=? AND typ='pos' AND (art<>'T' OR ?) GROUP BY gewerk",
                                                        (kid, info.get("art") == "vorbemerkungen")).fetchall()}
            return [{"gewerk": r["gewerk"], "oz": r["oz"], "kurz": r["kurz"], "n": n.get(r["gewerk"], 0)}
                    for r in c.execute("SELECT gewerk, oz, kurz FROM ava_katalog WHERE katalog_id=? AND typ='gewerk' ORDER BY nr", (kid,)).fetchall()]
        gw = _memo(("katgw", kid, info.get("importiert")), 3600, lesen)
    sir = (info.get("quelle") or "").lower().startswith("sirados")
    return jsonify(info=info, gewerke=[{"id": f"kat:{kid}:{x['gewerk']}", "nr": x["oz"], "name": x["kurz"], "n_pos": x["n"], "gewerk": "", "status": "entwurf",
                                        "archived": False, "bereich": _kat_bereich(x["gewerk"]) if sir else (info.get("name") or "")} for x in gw])


@app.get("/api/katalog/<int:kid>/gewerk/<oz>")
def katalog_gewerk(kid, oz):
    with db.tx() as c:
        info = _kat_info(c, kid)
        if not info:
            return jsonify(error="Gewerk nicht im Katalog"), 404

        def lesen():
            g_ = c.execute("SELECT * FROM ava_katalog WHERE katalog_id=? AND typ='gewerk' AND gewerk=?", (kid, oz)).fetchone()
            if not g_:
                return None
            zeilen = c.execute("SELECT * FROM ava_katalog WHERE katalog_id=? AND gewerk=? AND typ<>'gewerk' ORDER BY nr", (kid, oz)).fetchall()
            out = _kat_lv(g_["kurz"], oz, info, zeilen)
            out["nr"] = g_["oz"]
            if (info.get("quelle") or "").lower().startswith("sirados"):
                out["bereich"] = _kat_bereich(oz)
            return out
        out = _memo(("katgwl", kid, oz, info.get("importiert")), 3600, lesen)
        if out is None:
            return jsonify(error="Gewerk nicht im Katalog"), 404
        r = jsonify(out)
        r.headers["Cache-Control"] = "private, max-age=3600"   # Katalog ändert sich nur beim Neu-Einlesen (dann neue Adresse mit ?v=)
        return r


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
        def lesen():
            n = {r["katalog"]: r["n"] for r in c.execute("SELECT katalog, COUNT(*) AS n FROM pdb_position WHERE aktiv=1 GROUP BY katalog").fetchall()}
            return [{"key": r["key"], "name": r["name"], "n": n.get(r["key"], 0)} for r in c.execute("SELECT key, name FROM pdb_katalog ORDER BY sort, name").fetchall()]
        rows = _memo(("bdkat",), 300, lesen)
        n_korb = len(baudaten.korb(c, g.user["id"]))
    return jsonify([{"id": "bd-korb", "name": "Baudaten-Korb", "quelle": "baudaten", "n_pos": n_korb}]
                   + [{"id": "bd-" + x["key"], "name": "Baudaten: " + x["name"], "quelle": "baudaten", "n_pos": x["n"]} for x in rows if x["n"]])


def _bd_elemente(c, rows):
    """Standardelemente (Bauteil-Baukasten, Katalog gk3e) in der Kopierquelle: je Element ein Titel, darunter seine Positionen
    mit der Menge je 1 Einheit des Elements (Faktor) – beim Herüberkopieren nur noch mit der Bauteilmenge multiplizieren."""
    codes = [r["code"] for r in rows]
    T = {}
    for k in range(0, len(codes), 1000):
        for x in c.execute("SELECT element_code, position_code, faktor FROM pdb_element_teil WHERE element_code = ANY(?) ORDER BY element_code, nr", (codes[k:k + 1000],)).fetchall():
            T.setdefault(x["element_code"], []).append((x["position_code"], x["faktor"]))
    pc = sorted({p for v in T.values() for p, _ in v})
    P = {}
    for k in range(0, len(pc), 1000):
        for r in c.execute(f"{SQL_BD} WHERE katalog='gk3' AND code = ANY(?)", (pc[k:k + 1000],)).fetchall():
            P[r["code"]] = r
    fertig = {p["oz"]: p for p in _bd_items(c, list(P.values()), "gk3")}
    f = baudaten.umrechnung(c, "gk3e")
    out = []
    for r in rows:
        teile = T.get(r["code"]) or []
        summe = sum((fertig[x]["ep_s"] or 0) * fk for x, fk in teile if x in fertig)
        out.append({"id": f"e{r['id']}", "typ": "titel", "lvl": 2, "oz": r["code"],
                    "kurz": f"{r['bez'] or r['kurz']} – je 1 {r['einheit']}: " + f"{round(summe or (r['ep_mittel'] or 0) * f, 2):.2f} €".replace(".", ",")})
        for k, (x, fk) in enumerate(teile):
            if x in fertig:
                out.append({**fertig[x], "id": f"e{r['id']}_{k}", "menge": fk, "quelle": f"Baudaten {x} · Bauteil {r['code']}: Menge je 1 {r['einheit']}"})
    return out


def _bd_items(c, rows, katalog):
    """Positionen der Baudaten → Zeilen der Kopierquelle (Langtext = Grund- + Folgetext, Preis auf heute umgerechnet)."""
    if katalog == "gk3e":
        return _bd_elemente(c, rows)
    fk = {}   # Umrechnungsfaktor je Katalog (der Korb mischt Kataloge)
    gt = {}
    ids = sorted({r["grund_id"] for r in rows if r["grund_id"]})
    for k in range(0, len(ids), 1000):
        for x in c.execute("SELECT id, text FROM pdb_grundtext WHERE id = ANY(?)", (ids[k:k + 1000],)).fetchall():
            gt[x["id"]] = x["text"]
    eig = {}   # eigene Preise (Baudaten → Eigene Preise), neueste zuerst
    pids = [r["id"] for r in rows if r["id"] > 0]
    if pids:
        for x in c.execute("SELECT position_id, ep, firma, datum FROM pdb_preis WHERE position_id = ANY(?) AND datum >= ? ORDER BY datum DESC, id DESC",
                           (pids, baudaten._vor_jahren(5))).fetchall():
            eig.setdefault(x["position_id"], []).append({"ep": x["ep"], "firma": x["firma"] or "", "datum": x["datum"] or ""})
    out, grund = [], None
    for r in rows:
        if r["grund_id"] and r["grund_id"] != grund and katalog == "gk3":   # Grundposition als Zwischentitel
            grund = r["grund_id"]
        kk = r["katalog"] if katalog == "korb" else katalog
        f = fk[kk] if kk in fk else fk.setdefault(kk, baudaten.umrechnung(c, kk))
        rd = lambda v: round(v * f, 2) if v is not None else None   # noqa: E731
        p = {"id": f"b{r['id']}", "typ": "pos", "oz": r["code"], "kurz": r["kurz"], "bez": r["bez"] or "",
             "lang": (gt.get(r["grund_id"], "") + " " + (r["lang"] or "")).strip(), "menge": 0, "einheit": r["einheit"], "art": "N",
             "kg": r["kg"], "ep_s": rd(r["ep_mittel"]), "quelle": f"Baudaten {r['code']}"}
        if r["ep_von"] is not None and r["ep_bis"] is not None:
            p["spanne"] = [rd(r["ep_von"]), rd(r["ep_bis"])]
        if eig.get(r["id"]):
            e = eig[r["id"]][:12]
            v = sorted(x["ep"] for x in eig[r["id"]] if x["ep"] is not None)
            p["eigene"] = e
            p["ep_median"] = round((v[len(v) // 2] if len(v) % 2 else (v[len(v) // 2 - 1] + v[len(v) // 2]) / 2), 2) if v else None
        out.append(p)
    return out


@app.get("/api/katalog/bd-<key>")
def bd_gruppen(key):
    """Gruppen eines Baudaten-Katalogs wie die Gewerke eines Katalogs (Auswahl in der Kopierquelle)."""
    if key == "korb":
        with db.tx() as c:
            n = len(baudaten.korb(c, g.user["id"]))
        return jsonify(info={"id": "bd-korb", "name": "Baudaten-Korb"}, gewerke=[{"id": "kat:bd-korb:alle", "nr": "", "name": "Korb – in den Baudaten gesammelt", "n_pos": n,
                                                                             "gewerk": "", "status": "entwurf", "archived": False, "bereich": "Baudaten"}])
    with db.tx() as c:
        if key == "gk3":
            def lesen():
                n = {r["gruppe"]: r["n"] for r in c.execute("SELECT gruppe, COUNT(*) AS n FROM pdb_position WHERE katalog='gk3' AND aktiv=1 GROUP BY gruppe").fetchall()}
                return [{"nr": r["nr"], "name": r["name"], "lb": r["lb"], "lb_name": r["lb_name"], "n": n.get(r["nr"], 0)}
                        for r in c.execute("SELECT g.nr, g.name, l.nr AS lb, l.name AS lb_name FROM pdb_gruppe g JOIN pdb_leistungsbereich l ON l.nr = g.lb_nr ORDER BY g.nr").fetchall()]
            rows = _memo(("bdgk3",), 300, lesen)
            gw = [{"id": f"kat:bd-gk3:{x['nr']}", "nr": x["nr"], "name": x["name"], "n_pos": x["n"], "gewerk": "", "status": "entwurf", "archived": False,
                   "bereich": f"{x['lb']} {x['lb_name']}"} for x in rows if x["n"]]
        else:
            rows = _memo(("bdgr", key), 300, lambda: [dict(gruppe=r["gruppe"], titel=r["titel"], n=r["n"]) for r in c.execute(
                """SELECT gruppe, MIN(titel) AS titel, COUNT(*) AS n FROM pdb_position WHERE katalog=? AND aktiv=1 GROUP BY gruppe ORDER BY gruppe""", (key,)).fetchall()])
            gw = [{"id": f"kat:bd-{key}:{x['gruppe'] or '-'}", "nr": x["gruppe"], "name": x["titel"] or x["gruppe"] or "Alle", "n_pos": x["n"], "gewerk": "",
                   "status": "entwurf", "archived": False, "bereich": "Baudaten"} for x in rows]
    return jsonify(info={"id": "bd-" + key, "name": "Baudaten"}, gewerke=gw)


SQL_BD = "SELECT id, katalog, code, grund_id, kurz, bez, lang, einheit, kg, ep_von, ep_mittel, ep_bis FROM pdb_position"


def _bd_korb(c, q=""):
    """Der Korb des Benutzers (in den Baudaten gesammelt) als Kopierquelle – auch Positionen aus Katalogen der Ausschreibung."""
    ids = baudaten.korb(c, g.user["id"])
    rows = {r["id"]: r for r in c.execute("SELECT id, katalog, code, grund_id, kurz, bez, lang, einheit, kg, ep_von, ep_mittel, ep_bis FROM pdb_alle WHERE id = ANY(?)",
                                         (ids,)).fetchall()} if ids else {}
    q = q.lower()
    return _bd_items(c, [rows[i] for i in ids if i in rows and (not q or q in f"{rows[i]['code']} {rows[i]['kurz']} {rows[i]['bez']}".lower())], "korb")


@app.get("/api/katalog/bd-<key>/gewerk/<gr>")
def bd_gruppe(key, gr):
    if key == "korb":
        with db.tx() as c:
            items = _bd_korb(c)
        return jsonify({"id": "kat:bd-korb:alle", "nr": "", "name": "Korb", "projekt": "Baudaten-Korb", "katalog": True, "mehr": False,
                        "data": {"items": items}, "vergabe": {}})
    with db.tx() as c:
        def lesen():
            rows = c.execute(f"{SQL_BD} WHERE katalog=? AND gruppe=? AND aktiv=1 ORDER BY code LIMIT ?", (key, "" if gr == "-" else gr, BD_MAX + 1)).fetchall()
            name = (c.execute("SELECT name FROM pdb_gruppe WHERE nr=?", (gr,)).fetchone() or {"name": gr}) if key == "gk3" else {"name": gr}
            return {"id": f"kat:bd-{key}:{gr}", "nr": gr, "name": name["name"], "projekt": "Baudaten", "katalog": True, "mehr": len(rows) > BD_MAX,
                    "data": {"items": _bd_items(c, rows[:BD_MAX], key)}, "vergabe": {}}
        out = _memo(("bdgrl", key, gr), 120, lesen)
    return jsonify(out)


@app.get("/api/katalog/bd-<key>/suche")
def bd_suche(key):
    q = (request.args.get("q") or "").strip()
    if key == "korb":
        with db.tx() as c:
            items = _bd_korb(c, q)
        return jsonify({"id": "kat:bd-korb:suche", "nr": "", "name": f"Suche „{q}“" if q else "Korb", "projekt": "Baudaten-Korb", "katalog": True,
                        "data": {"items": items}, "vergabe": {}})
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
            if key == "gk3e":
                items.append(p)
                continue
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
        zeilen.append([k, gew, x["typ"], int(x.get("ebene") or 0), x["oz"][:40], x["kurz"][:500], x.get("lang", "")[:200000 if art == "vorbemerkungen" else 20000], x.get("art", "N"),
                       x.get("einheit", "")[:12], x.get("kg", ""), x.get("ep_von"), x.get("ep"), x.get("ep_bis")])
    st = f" {stand[5:7]}/{stand[:4]}" if len(stand or "") >= 7 else ""
    name = f"{quelle} {'Elemente' if art == 'elemente' else 'Vorbemerkungen' if art == 'vorbemerkungen' else 'Positionen'}{st}".strip()
    n_pos = sum(1 for z in zeilen if z[2] == "pos" and (z[7] != "T" or art == "vorbemerkungen"))
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
            if isinstance(b.get("von"), int):   # Kopie der gerade angesehenen (nicht gültigen) Version
                q_ = c.execute("SELECT id FROM ava_version WHERE id=? AND project_id=?", (b["von"], pid)).fetchone()
                if q_:
                    alt = q_
            vid = c.execute("INSERT INTO ava_version(project_id, name, aktiv, von, created, updated, updated_by) VALUES(?,?,0,?,?,?,?) RETURNING id",
                            (pid, name, alt["id"], now, now, wer)).fetchone()["id"]
            for r in c.execute("SELECT * FROM ava_lv WHERE version_id=? ORDER BY id", (alt["id"],)).fetchall():
                n = c.execute("""INSERT INTO ava_lv(project_id, bk_id, nr, name, gewerk, status, data, vergabe, archived, rev, created, updated, updated_by, version_id)
                                 VALUES(?,?,?,?,?,?,?,?,?,0,?,?,?,?) RETURNING id""",
                              (r["project_id"], r["bk_id"], r["nr"], r["name"], r["gewerk"], r["status"], r["data"], r["vergabe"], r["archived"],
                               now, now, wer, vid)).fetchone()["id"]
                amap = {}
                for a in c.execute("SELECT * FROM ava_angebot WHERE lv_id=? ORDER BY id", (r["id"],)).fetchall():
                    amap[a["id"]] = c.execute("""INSERT INTO ava_angebot(lv_id, contact_id, bieter, eingang, preise, nachlass, nachlass_eur, skonto, skonto_tage, notiz, quelle, created, updated)
                                                 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id""",
                                              (n, a["contact_id"], a["bieter"], a["eingang"], a["preise"], a["nachlass"], a["nachlass_eur"] or 0, a["skonto"], a["skonto_tage"] or 0, a["notiz"], a["quelle"],
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
            einzige = c.execute("SELECT COUNT(*) AS n FROM ava_version WHERE project_id=?", (v["project_id"],)).fetchone()["n"] < 2
            pr = c.execute("SELECT name FROM projects WHERE id=?", (v["project_id"],)).fetchone()
            pk = papierkorb.ablegen(c, "ava_version", vid, "AVA-Version", v["name"], g.user["name"], pr["name"] if pr else "", "ava")
            if einzige:   # die einzige Version: eine leere „Startversion“ übernimmt, damit das Projekt weiter eine hat
                c.execute("INSERT INTO ava_version(project_id, name, aktiv, created, updated, updated_by) VALUES(?,?,1,?,?,?)",
                          (v["project_id"], "Startversion", _now(), _now(), g.user["name"]))
            elif v["aktiv"]:
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
        pids = [pid] if pid else sorted({int(x["key"].split(":")[1]) for x in c.execute("SELECT key FROM bp_store WHERE key LIKE 'tueren:%'").fetchall()
                                         if x["key"].split(":")[1].isdigit()})
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
    except Exception:   # Formel nicht auswertbar: kein Wert ist die gewollte Antwort
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
            t_ = {"id": i, "typ": "titel", "lvl": max(1, min(4, int(_f(x.get("lvl"), 1)))), "oz": _s(x.get("oz"), 40), "kurz": _s(x.get("kurz"), 300)}
            if x.get("tl"):   # Herkunft aus einer Fenster- & Türliste (für „LV aktualisieren“)
                t_["tl"] = _s(x.get("tl"), 60)
            out.append(t_)
            continue
        art = x.get("art") if x.get("art") in ARTEN else "N"
        p = {"id": i, "typ": "pos", "oz": _s(x.get("oz"), 40), "kurz": _s(x.get("kurz"), 500), "lang": _s(x.get("lang"), 20000),
             "menge": round(_f(x.get("menge"), 0, 0, 1e9), 3), "einheit": _s(x.get("einheit"), 12), "art": art,
             "kg": re.sub(r"\D", "", str(x.get("kg") or ""))[:3], "ep_s": _fn(x.get("ep_s"))}
        # weitere Eigenschaften (Dialog „Eigenschaften“): nur speichern, was gesetzt ist
        for k, n in (("kg81", 3), ("lb", 80), ("bezug", 40), ("quelle", 200), ("mf", 500), ("tl", 60)):
            v = re.sub(r"\D", "", str(x.get(k) or ""))[:3] if k == "kg81" else _s(x.get(k), n)
            if v:
                p[k] = v
        for k in ("gb", "entf", "sp", "np_vor", "np_nach"):
            if x.get(k):
                p[k] = True
        if isinstance(x.get("pdb"), int) and x["pdb"] > 0:   # Herkunft: Position der Baudaten (für Auftrags-/Angebotspreise)
            p["pdb"] = x["pdb"]
        if x.get("nt"):   # Nachtrag
            p["nt"] = _s(x.get("nt"), 20)
            p["nt_status"] = x.get("nt_status") if x.get("nt_status") in ("angemeldet", "beauftragt", "abgelehnt") else "angemeldet"
            p["nt_grund"] = _s(x.get("nt_grund"), 1000)
        out.append(p)
    return out


def oz_maske(m):
    """Nummerierungsschema (GAEB-OZ-Maske): Stellen je Titelstufe, Stellen der Position, Schrittweite."""
    m = m if isinstance(m, dict) else {}
    t = [min(4, max(1, int(_f(x, 2)))) for x in (m.get("t") if isinstance(m.get("t"), list) else [2, 2, 2, 2])[:4]] or [2]
    return {"t": t, "p": min(6, max(1, int(_f(m.get("p"), 4)))), "s": min(1000, max(1, int(_f(m.get("s"), 10))))}


def nummerieren(items, schritt=10, maske=None):
    """Ordnungszahlen neu vergeben: Titel 01, 02 … (Untertitel 01.01), Positionen 0010, 0020 … je Titel – oder nach der OZ-Maske des LV."""
    M = oz_maske(maske) if maske else {"t": [2, 2, 2, 2], "p": 4, "s": schritt}
    stack, cnt = [], {}
    for x in items:
        if x["typ"] == "titel":
            lvl = x.get("lvl") or 1
            while stack and stack[-1][0] >= lvl:
                stack.pop()
            par = stack[-1][1] if stack else ""
            cnt[par] = cnt.get(par, 0) + 1
            x["oz"] = (par + "." if par else "") + str(cnt[par]).zfill(M["t"][min(len(stack), len(M["t"]) - 1)])
            stack.append((lvl, x["oz"]))
            cnt[x["oz"] + "#p"] = 0
        elif x.get("art") == "T":
            x["oz"] = ""
        else:
            par = stack[-1][1] if stack else ""
            k = par + "#p"
            cnt[k] = cnt.get(k, 0) + M["s"]
            x["oz"] = (par + "." if par else "") + str(cnt[k]).zfill(M["p"])
    return items


# ---------------------------------------------------------------- Rechnen
def _gp(p, ep):
    return round((p.get("menge") or 0) * ep, 2) if ep is not None else 0.0


def zaehlt(p):
    """Gehört die Position in die Summe? Normal- und Pauschalpositionen, Bedarfspositionen „mit Gesamtpreis“;
    nicht: Wahlpositionen, Bedarfspositionen ohne Gesamtpreis, entfallene Positionen, Nachträge (die zählen extra)."""
    return p["typ"] == "pos" and (p.get("art") in ("N", "P") or (p.get("art") == "E" and p.get("gb"))) and not p.get("nt") and not p.get("entf")


def _ak(a, k):
    """Spalte eines Angebots, die es in alten Datenbanken noch nicht gibt."""
    try:
        return a[k]
    except (KeyError, IndexError):
        return None


def nachlass_satz(V, pos):
    """Nachlass als Anteil: Prozent plus fester Betrag (umgelegt auf die Auftragssumme vor Nachlass – so mindert er jede
    Abschlagsrechnung anteilig und ist mit der Schlussrechnung vollständig abgezogen)."""
    nl = _f(V.get("nachlass"), 0) / 100
    eur_ = _f(V.get("nachlass_eur"), 0)
    if eur_ > 0:
        VP = V.get("preise") or {}
        basis = sum(_gp(p, _fn(VP.get(p["id"]))) for p in pos if zaehlt(p)) if VP else 0.0
        if V.get("frei"):
            basis += _f(V.get("summe"), 0)
        if basis > 0:
            nl += eur_ / basis
    return min(nl, 0.99)


def nachlass_text(V):
    p, e = _f(V.get("nachlass"), 0), _f(V.get("nachlass_eur"), 0)
    return " + ".join(x for x in ((f"{num(p, 2)} %" if p else ""), (eur(e) if e else "")) if x) or "0 %"


def _skonto(V, rd, r, brutto):
    """Skonto je Rechnung: Satz und Frist aus dem Auftrag, in der Rechnung änderbar. Frist ab Rechnungseingang."""
    pct = _fn(rd.get("skonto")) if rd.get("skonto") not in (None, "") else _f(V.get("skonto"), 0)
    tage = int(_f(rd.get("skonto_tage"), 0)) if rd.get("skonto_tage") not in (None, "") else int(_f(V.get("skonto_tage"), 0))
    if not pct or pct <= 0 or brutto <= 0:
        return {"skonto_pct": pct or 0, "skonto_tage": tage, "skonto": 0.0, "skonto_bis": "", "brutto_skonto": round(brutto, 2), "bezahlt": rd.get("bezahlt") or ""}
    bis = ""
    try:
        from datetime import timedelta
        if r["eingang"] and tage:
            bis = (date.fromisoformat(r["eingang"]) + timedelta(days=tage)).isoformat()
    except (TypeError, ValueError, KeyError, IndexError):
        bis = ""
    sk = round(brutto * pct / 100, 2)
    return {"skonto_pct": pct, "skonto_tage": tage, "skonto": sk, "skonto_bis": bis, "brutto_skonto": round(brutto - sk, 2), "bezahlt": rd.get("bezahlt") or ""}


ABZUG_ARTEN = ("nachlass", "abzuege", "einbehalt", "vorher")   # was bei der Prüfung abgezogen wird – je Auftrag, je Rechnung änderbar


def abzug_wahl(V, rd):
    """Welche Abzüge gelten: Rechnung (gesetzt) vor Auftrag vor „alle an“."""
    a = {k: True for k in ABZUG_ARTEN}
    for q in ((V or {}).get("abzug") or {}, (rd or {}).get("abzug") or {}):
        for k in ABZUG_ARTEN:
            if isinstance(q.get(k), bool):
                a[k] = q[k]
    return a


def _abzug_clean(x):
    return {k: bool(x[k]) for k in ABZUG_ARTEN if isinstance(x, dict) and k in x and x[k] is not None}


_NTM = {"t": 0.0, "v": False}


def nt_nur_beauftragt():
    """Büro-Einstellung: zählen in der Rechnungsprüfung nur beauftragte Nachträge (sonst auch angemeldete)? – kurz zwischengespeichert."""
    import time
    if time.time() - _NTM["t"] > 3:
        try:
            with db.tx() as c:
                r = c.execute("SELECT value FROM settings WHERE key='ava_nt_nur_beauftragt'").fetchone()
            _NTM["v"] = bool(r and r["value"] == "1")
        except Exception:
            pass
        _NTM["t"] = time.time()
    return _NTM["v"]


@app.route("/api/einstellungen/abrechnung", methods=["GET", "PUT"])
def einst_abrechnung():
    if request.method == "PUT":
        if not g.user["is_admin"]:
            return jsonify(error="Nur die Verwaltung kann das ändern."), 403
        b = request.get_json(silent=True) or {}
        with db.tx() as c:
            c.execute("INSERT INTO settings(key, value) VALUES(?,?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
                      ("ava_nt_nur_beauftragt", "1" if b.get("nt_nur_beauftragt") else "0"))
        _NTM["t"] = 0.0
    return jsonify(nt_nur_beauftragt=nt_nur_beauftragt(), admin=bool(g.user["is_admin"]))


def rechne(lv, angebote, aufmass, rechnungen):
    d = _j(lv["data"], {}) or {}
    items = d.get("items") or []
    pos = [p for p in items if p["typ"] == "pos" and p.get("art") != "T"]
    V = _j(lv["vergabe"], {}) or {}
    VP = V.get("preise") or {}
    nl = nachlass_satz(V, pos)
    schaetz = sum(_gp(p, p.get("ep_s")) for p in pos if zaehlt(p) and p.get("ep_s") is not None)
    ohne_s = sum(1 for p in pos if zaehlt(p) and p.get("ep_s") is None)
    # Angebote
    A = []
    for a in angebote:
        pr = _j(a["preise"], {}) or {}
        brutto = sum(_gp(p, _fn(pr.get(p["id"]))) for p in pos if zaehlt(p))
        fehlt = sum(1 for p in pos if zaehlt(p) and _fn(pr.get(p["id"])) is None)
        netto = brutto * (1 - (a["nachlass"] or 0) / 100) - (_ak(a, "nachlass_eur") or 0)
        A.append({"id": a["id"], "summe": round(brutto, 2), "netto": round(netto, 2), "fehlt": fehlt})
    for k, x in enumerate(sorted([x for x in A if x["summe"]], key=lambda x: x["netto"])):
        x["rang"] = k + 1
    # Auftrag und Nachträge
    auftrag = sum(_gp(p, _fn(VP.get(p["id"]))) for p in pos if zaehlt(p)) * (1 - nl) if VP else 0.0
    if V.get("frei"):   # Auftrag ohne LV / ohne Angebot: Summe frei eingetragen
        auftrag += _f(V.get("summe"), 0)
    nt = {"angemeldet": 0.0, "beauftragt": 0.0, "abgelehnt": 0.0}
    for p in pos:
        if p.get("nt") and not p.get("entf") and _fn(VP.get(p["id"])) is not None:
            nt[p.get("nt_status") or "angemeldet"] += _gp(p, _fn(VP.get(p["id"]))) * (1 - nl)
    # Aufmaß je Position
    am = {}
    for r in aufmass:
        am[r["pos_id"]] = am.get(r["pos_id"], 0.0) + (r["menge"] or 0)

    def stand_wert(stand):
        """Leistungsstand: Menge × Auftrags-EP (abgelehnte Nachträge zählen nicht, je nach Einstellung auch angemeldete nicht)."""
        s = 0.0
        for p in pos:
            m = stand.get(p["id"])
            if not m or (p.get("nt") and (p.get("nt_status") == "abgelehnt" or (NTB and (p.get("nt_status") or "angemeldet") == "angemeldet"))):
                continue
            ep = _fn(VP.get(p["id"]))
            if ep is not None:
                s += round(m * ep, 2)
        return s
    # Rechnungen: Teil-/Schlussrechnungen kumuliert (Hauptauftrag), Nachtragsrechnungen kumuliert nur über Nachtragspositionen
    # (dann zählen die Nachträge nicht mehr im Hauptauftrag), Regierechnungen einzeln (Stundenlohnzettel), Freigabe der Sicherheit
    ist_nt = {p["id"] for p in pos if p.get("nt")}
    NTB = nt_nur_beauftragt()
    nt_kette = any(r["art"] == "nachtrag" for r in rechnungen)
    S = sicherheit_conf(V)
    vorher = {"haupt": 0.0, "nachtrag": 0.0}
    eb_stand = {"haupt": 0.0, "nachtrag": 0.0}   # Einbehalt der letzten geprüften Rechnung je Kette (kumuliert)
    eb_regie, frei, frei_summe = 0.0, 0.0, 0.0
    R = []
    for r in sorted(rechnungen, key=lambda r: r["nr"]):
        rd = _j(r["data"], {}) or {}
        art = r["art"] if r["art"] in RE_ARTEN else "abschlag"
        g_ = r["status"] == "geprueft"
        if art == "sicherheit":
            B = round(_f(rd.get("betrag"), 0, 0), 2)
            R.append({"id": r["id"], "art": art, "leistung": 0.0, "nachlass": 0.0, "abzuege": 0.0, "einbehalt_pct": 0.0, "einbehalt": round(-B, 2), "anerkannt": B,
                      "vorher": 0.0, "zahlung": B, "mwst": round(B * MWST / 100, 2), "brutto": round(B * (1 + MWST / 100), 2), "differenz": None, "live": not g_})
            if g_:
                frei += B
            continue
        frei_ = rd.get("frei") is not None and art != "regie"   # ohne Aufmaß: geprüfter Betrag frei eingetragen (einzeln, wie Regie)
        einzeln = art == "regie" or frei_
        AW = abzug_wahl(V, rd)
        if art == "regie":
            L = sum(round(_f(z.get("menge")) * _f(z.get("ep")), 2) for z in rd.get("zeilen") or [])
            N = 0.0
        elif frei_:   # Positionen von Hand eingetragen: deren Summe, sonst der frei eingetragene Betrag
            zs_ = [z for z in rd.get("zeilen") or [] if isinstance(z, dict)]
            L = round(sum(round(_f(z.get("menge")) * _f(z.get("ep")), 2) for z in zs_), 2) if zs_ else round(_f(rd.get("frei"), 0), 2)
            N = 0.0
        else:
            stand = rd.get("stand") if g_ and isinstance(rd.get("stand"), dict) else am
            nur = (lambda k: k in ist_nt) if art == "nachtrag" else (lambda k: k not in ist_nt) if nt_kette else None
            L = stand_wert({k: v for k, v in stand.items() if nur is None or nur(k)})
            N = L * nl if AW["nachlass"] else 0.0
        L1 = L - N
        abz = 0.0
        for z in (rd.get("abzuege") or []) if AW["abzuege"] else []:
            abz += L1 * (_f(z.get("pct")) / 100) if z.get("pct") not in (None, "") else _f(z.get("betrag"))
        L2 = L1 - abz
        std = S["pct_schluss"] if art == "schluss" else S["pct_abschlag"]
        if g_ and rd.get("einbehalt") in (None, ""):   # früher geprüft, Satz nicht festgehalten: wie damals gerechnet
            std = _f(V.get("einbehalt"), 5.0)
        eb_pct = _f(rd.get("einbehalt"), std) if rd.get("einbehalt") not in (None, "") else std
        if not AW["einbehalt"]:
            eb_pct = 0.0
        E = L2 * eb_pct / 100
        L3 = L2 - E
        kette = "nachtrag" if art == "nachtrag" else "haupt"
        vh = 0.0 if einzeln or not AW["vorher"] else vorher[kette]
        Z = L3 - vh
        R.append({"id": r["id"], "art": art, "leistung": round(L, 2), "nachlass": round(N, 2), "abzuege": round(abz, 2), "einbehalt_pct": eb_pct, "einbehalt": round(E, 2),
                  "anerkannt": round(L3, 2), "vorher": round(vh, 2), "zahlung": round(Z, 2), "mwst": round(Z * MWST / 100, 2),
                  "brutto": round(Z * (1 + MWST / 100), 2), "differenz": round((r["gefordert"] or 0) - L1, 2) if r["gefordert"] else None,
                  "live": not g_, "frei": frei_, "einzeln": einzeln, "abzug": AW, **_skonto(V, rd, r, Z * (1 + MWST / 100))})
        if frei_:
            frei_summe += L
        if g_:
            if einzeln:
                eb_regie += E
            else:
                vorher[kette] = L3
                eb_stand[kette] = E
    einbehalten = eb_stand["haupt"] + eb_stand["nachtrag"] + eb_regie
    leistung = stand_wert(am) + frei_summe / (1 - nl if nl < 1 else 1)
    return {"schaetzung": round(schaetz, 2), "ohne_schaetzung": ohne_s, "angebote": A, "auftrag": round(auftrag, 2),
            "nachtraege": {k: round(v, 2) for k, v in nt.items()}, "aufmass": {k: round(v, 4) for k, v in am.items()},
            "leistung": round(leistung * (1 - nl), 2), "rechnungen": R,
            "abgerechnet": round(vorher["haupt"] + vorher["nachtrag"] + sum(x["anerkannt"] for x in R if not x["live"] and x.get("einzeln")), 2),
            "sicherheit": {"einbehalten": round(einbehalten, 2), "freigegeben": round(frei, 2), "offen": round(einbehalten - frei, 2), **S}}


RE_ARTEN = ("abschlag", "schluss", "regie", "nachtrag", "sicherheit")
RE_NAME = {"abschlag": "Teilrechnung", "schluss": "Schlussrechnung", "regie": "Regierechnung", "nachtrag": "Nachtragsrechnung", "sicherheit": "Freigabe der Sicherheit"}


def re_titel(nr, art):
    return f"{nr}. Teilrechnung" if art == "abschlag" else f"{nr}. {RE_NAME.get(art, 'Rechnung')}"


def sicherheit_conf(V):
    """Sicherheiten des Auftrags (VOB/B § 17): Vertragserfüllung (Einbehalt in Teil-/Nachtrags-/Regierechnungen oder Bürgschaft)
    und Mängelansprüche (Einbehalt in der Schlussrechnung oder Bürgschaft), Abnahme und Ende der Verjährungsfrist für Mängelansprüche."""
    S = V.get("sicherheit") or {}
    ve = {"form": "einbehalt", "pct": _f(V.get("einbehalt"), 5.0), **(S.get("ve") or {})}
    ve["pct"] = _f(V.get("einbehalt"), 5.0)
    ma = {"form": "einbehalt", **(S.get("ma") or {})}
    if ma.get("pct") is None:   # ohne eigene Angabe wie bisher: derselbe Satz wie für die Vertragserfüllung
        ma["pct"] = ve["pct"]
    jahre = int(_f(S.get("gw_jahre"), 4, 0, 30))
    ende = S.get("gw_ende") or ""
    if not ende and S.get("abnahme"):
        try:
            a = date.fromisoformat(S["abnahme"])
            try:
                ende = a.replace(year=a.year + jahre).isoformat()
            except ValueError:
                ende = a.replace(year=a.year + jahre, day=28).isoformat()
        except ValueError:
            ende = ""
    abgeloest = lambda x: x.get("form") == "buergschaft" and bool(x.get("eingang"))   # noqa: E731
    return {"ve": ve, "ma": ma, "abnahme": S.get("abnahme") or "", "gw_jahre": jahre, "gw_ende": ende,
            "pct_abschlag": 0.0 if abgeloest(ve) else ve["pct"], "pct_schluss": 0.0 if abgeloest(ma) else _f(ma.get("pct"), ve["pct"])}


def _sicherheit_clean(b, alt):
    """Eingaben zu den Sicherheiten übernehmen (nur bekannte Felder)."""
    S = dict(alt or {})
    for k in ("ve", "ma"):
        if isinstance(b.get(k), dict):
            x = dict(S.get(k) or {})
            for f, n in (("form", 20), ("buerge", 200), ("nr", 80), ("eingang", 10), ("rueckgabe", 10), ("notiz", 500)):
                if f in b[k]:
                    x[f] = _s(b[k][f], n)
            if x.get("form") not in ("einbehalt", "buergschaft"):
                x["form"] = "einbehalt"
            for f in ("betrag", "pct"):
                if f in b[k]:
                    x[f] = _fn(b[k][f])
            S[k] = x
    for f in ("abnahme", "gw_ende"):
        if f in b:
            S[f] = _s(b[f], 10)
    if "gw_jahre" in b:
        S["gw_jahre"] = int(_f(b["gw_jahre"], 4, 0, 30))
    return S


def _payload(c, r):
    ang = c.execute("SELECT * FROM ava_angebot WHERE lv_id=? ORDER BY id", (r["id"],)).fetchall()
    am = c.execute("SELECT * FROM ava_aufmass WHERE lv_id=? ORDER BY pos_id, datum, id", (r["id"],)).fetchall()
    re_ = c.execute("SELECT * FROM ava_rechnung WHERE lv_id=? ORDER BY nr", (r["id"],)).fetchall()
    belege = {}
    if re_:
        _beleg_tabelle(c)
        for b in c.execute("SELECT id, rechnung_id, name, ablage, created, user_name, auslese FROM ava_beleg WHERE rechnung_id = ANY(?) ORDER BY id", ([x["id"] for x in re_],)).fetchall():
            belege.setdefault(b["rechnung_id"], []).append({"id": b["id"], "name": b["name"], "ablage": b["ablage"], "created": b["created"], "user": b["user_name"],
                                                            "auslese": _j(b["auslese"], None)})
    p = _sees(c, r["project_id"]) if r["project_id"] else None
    return {"id": r["id"], "project_id": r["project_id"], "projekt": p["name"] if p else "", "bk_id": r["bk_id"], "nr": r["nr"], "name": r["name"],
            "gewerk": r["gewerk"], "status": r["status"], "archived": bool(r["archived"]), "rev": r["rev"], "updated": r["updated"], "updated_by": r["updated_by"],
            "data": _j(r["data"], {}) or {}, "vergabe": _j(r["vergabe"], {}) or {},
            "angebote": [{"id": a["id"], "contact_id": a["contact_id"], "bieter": a["bieter"], "eingang": a["eingang"], "preise": _j(a["preise"], {}),
                          "nachlass": a["nachlass"], "nachlass_eur": _ak(a, "nachlass_eur") or 0, "skonto": a["skonto"], "skonto_tage": _ak(a, "skonto_tage") or 0, "notiz": a["notiz"], "quelle": a["quelle"]} for a in ang],
            "aufmass": [{"id": x["id"], "pos_id": x["pos_id"], "datum": x["datum"], "ort": x["ort"], "formel": x["formel"], "menge": x["menge"], "quelle": x["quelle"],
                         "user": x["user_name"]} for x in am],
            "rechnungen": [{"id": x["id"], "nr": x["nr"], "art": x["art"], "datum": x["datum"], "eingang": x["eingang"], "re_nr": x["re_nr"], "gefordert": x["gefordert"],
                            "data": _j(x["data"], {}), "status": x["status"], "notiz": x["notiz"], "updated": x["updated"], "updated_by": x["updated_by"],
                            "belege": belege.get(x["id"], [])} for x in re_],
            "calc": rechne(r, ang, am, re_), "bilder": _bilder(c, r["id"]), "dokumente": _lvdoks(c, r["id"])}


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
                        "prognose": round(max(k["auftrag"] + k["nachtraege"]["beauftragt"] + k["nachtraege"]["angemeldet"], k["abgerechnet"] if V.get("frei") else 0)
                                          if (V.get("preise") or V.get("frei")) else k["schaetzung"], 2),
                        "abgerechnet": k["abgerechnet"], "min_angebot": min([a["netto"] for a in k["angebote"] if a["summe"]] or [0]),
                        # für die Projektbäume in Angebote / Aufmaßprüfung / Rechnungen
                        "vergeben": bool(V.get("preise") or V.get("frei")), "frei": bool(V.get("frei")), "angebot_id": V.get("angebot_id"),
                        "angebote": [{"id": a["id"], "bieter": a["bieter"], **{f: x[f] for f in ("netto", "rang", "fehlt") if f in x}}
                                     for a in ang for x in k["angebote"] if x["id"] == a["id"]],
                        "rechnungen": [{"id": x["id"], "nr": x["nr"], "art": x["art"], "status": x["status"], "re_nr": x["re_nr"],
                                        "anerkannt": rc["anerkannt"], "zahlung": rc["zahlung"]}
                                       for x in sorted(re_, key=lambda y: y["nr"]) for rc in k["rechnungen"] if rc["id"] == x["id"]]})
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
        if isinstance(b.get("version_id"), int) and pid and c.execute("SELECT 1 FROM ava_version WHERE id=? AND project_id=?", (b["version_id"], pid)).fetchone():
            c.execute("UPDATE ava_lv SET version_id=? WHERE id=?", (b["version_id"], i))   # in der gerade angesehenen Version anlegen
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
            alt_meta = (_j(r["data"], {}) or {}).get("meta")
            if alt_meta:
                d["meta"] = alt_meta   # Angaben zur Ausschreibung bleiben (eigene Maske)
            alt_ozm = b["data"].get("ozm") if isinstance(b["data"].get("ozm"), dict) else (_j(r["data"], {}) or {}).get("ozm")
            if alt_ozm:
                d["ozm"] = oz_maske(alt_ozm)   # Nummerierungsschema des LV
            if b.get("nummerieren"):
                nummerieren(d["items"], maske=d.get("ozm"))
            sets.append("data=?"); args.append(json.dumps(d, ensure_ascii=False))
        if isinstance(b.get("vergabe"), dict):
            V = _j(r["vergabe"], {}) or {}
            for k in ("nachlass", "skonto", "einbehalt"):
                if k in b["vergabe"]:
                    V[k] = round(_f(b["vergabe"][k], 0, 0, 100), 3)
            if "nachlass_eur" in b["vergabe"]:
                V["nachlass_eur"] = round(_f(b["vergabe"]["nachlass_eur"], 0, 0), 2)
            if "skonto_tage" in b["vergabe"]:
                V["skonto_tage"] = int(_f(b["vergabe"]["skonto_tage"], 0, 0, 365))
            if V.get("frei"):
                if "summe" in b["vergabe"]:
                    V["summe"] = round(_f(b["vergabe"]["summe"], 0, 0), 2)
                if b["vergabe"].get("bieter"):
                    V["bieter"] = _s(b["vergabe"]["bieter"], 200)
            if isinstance(b["vergabe"].get("abzug"), dict):   # welche Abzüge bei der Prüfung gelten (Voreinstellung für die Rechnungen)
                V["abzug"] = {**(V.get("abzug") or {}), **_abzug_clean(b["vergabe"]["abzug"])}
            if isinstance(b["vergabe"].get("sicherheit"), dict):   # Sicherheiten, Abnahme, Mängelfrist
                V["sicherheit"] = _sicherheit_clean(b["vergabe"]["sicherheit"], V.get("sicherheit"))
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


# ---------------------------------------------------------------- Stammdaten: LV (Ausschreibung), Auftrag, Angebot
@app.route("/api/lv/<int:i>/daten", methods=["GET", "PUT"])
def lv_daten(i):
    """Angaben zur Ausschreibung (data.meta) und zum Auftrag (vergabe.auftrag) – Maske wie die Projektdaten."""
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        D, V = _j(r["data"], {}) or {}, _j(r["vergabe"], {}) or {}
        if request.method == "PUT":
            b = request.get_json(silent=True) or {}
            c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", (f"avalv:{i}",))
            r = _lv(c, i); D, V = _j(r["data"], {}) or {}, _j(r["vergabe"], {}) or {}
            versionen.vor(c, f"avalv:{i}")
            if isinstance(b.get("lv"), dict):
                D["meta"] = stammdaten.bereinigen(stammdaten.LV, b["lv"], D.get("meta"))
            if isinstance(b.get("auftrag"), dict) and V.get("bieter"):
                V["auftrag"] = stammdaten.bereinigen(stammdaten.AUFTRAG, b["auftrag"], V.get("auftrag"))
            c.execute("UPDATE ava_lv SET data=?, vergabe=?, updated=?, updated_by=? WHERE id=?",   # rev bleibt: offene LV-Bearbeitung nicht stören
                      (json.dumps(D, ensure_ascii=False), json.dumps(V, ensure_ascii=False), _now(), g.user["name"], i))
            versionen.nach(c, f"avalv:{i}", g.user["name"])
        A = V.get("auftrag") or {}
        if V.get("bieter") and not A.get("auftragsdatum") and V.get("datum"):
            A = {**A, "auftragsdatum": V["datum"]}
        return jsonify(lv=D.get("meta") or {}, auftrag=A, vergeben=bool(V.get("bieter")), bieter=V.get("bieter") or "",
                       felder_lv=stammdaten.felder(stammdaten.LV), felder_auftrag=stammdaten.felder(stammdaten.AUFTRAG),
                       plan=stammdaten.plan_termine(c, r["project_id"], r["gewerk"] or None, r["name"] or None) if r["project_id"] else {"start": "", "ende": "", "plaene": []},
                       titel=f"LV {r['nr']} {r['name']}".strip())


@app.route("/api/angebote/<int:a>/daten", methods=["GET", "PUT"])
def angebot_daten(a):
    with db.tx() as c:
        x = c.execute("SELECT * FROM ava_angebot WHERE id=?", (a,)).fetchone()
        if not x or not _lv(c, x["lv_id"]):
            return jsonify(error="Angebot nicht gefunden"), 404
        alt = _j(_ak(x, "daten"), {}) or {}
        if request.method == "PUT":
            d = stammdaten.bereinigen(stammdaten.ANGEBOT, (request.get_json(silent=True) or {}).get("werte") or {}, alt)
            c.execute("UPDATE ava_angebot SET daten=?, updated=? WHERE id=?", (json.dumps(d, ensure_ascii=False), _now(), a))
            alt = d
        return jsonify(werte=alt, felder=stammdaten.felder(stammdaten.ANGEBOT), titel=f"Angebot {x['bieter']}")


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
                a = x.get("aufbau") if b.get("aufloesen", True) else None
                A = (baudaten.aufbau(c, a.get("v"), a.get("w")) if isinstance(a, dict) and a.get("v")
                     else baudaten.teile_aufbau(c, a["t"]) if isinstance(a, dict) and a.get("t") else None)
                if A and A["teile"]:   # Aufbau aus dem Bauteil-Baukasten: Einzelpositionen mit Menge = Faktor × Bauteilmenge
                    items.append({"id": uuid.uuid4().hex[:10], "typ": "titel", "lvl": 2, "kurz": kurz[:200]})
                    for y in baudaten.aufloesen(c, A["teile"], x.get("menge") or 0, kurz):
                        items.append({"id": uuid.uuid4().hex[:10], "typ": "pos", "kurz": y["kurz"], "lang": y["lang"], "menge": y["menge"],
                                      "einheit": y["einheit"], "art": "N", "kg": y["kg"] or x.get("kg") or "", "ep_s": y["ep_s"]})
                    continue
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


# Mehrere Listen je Projekt: „tueren:<projekt>“ ist Liste „1“ (wie bisher), weitere „tueren:<projekt>:<liste>“.
# Name und Reihenfolge stehen in der Liste selbst – so bringt der Papierkorb eine gelöschte Liste vollständig zurück.
def _tl_key(pid, liste="1"):
    liste = str(liste or "1")
    return f"tueren:{pid}" if liste == "1" else f"tueren:{pid}:{liste}"


def _tueren_laden(c, pid, liste="1"):
    from bpcore import konto
    d = _j(konto._get(c, _tl_key(pid, liste)), {}) or {}
    return {"tueren": d.get("tueren") or [], "rev": d.get("rev") or 0, "updated_by": d.get("updated_by") or "", "name": d.get("name") or "",
            "liste": str(liste or "1")}


def _tuerlisten(c, pid):
    """Alle Listen des Projekts [{id, name, n, updated}] – die erste heißt ohne eigenen Namen „Fenster- & Türliste“."""
    out = []
    for r in c.execute("SELECT key, data, updated FROM bp_store WHERE key=? OR key LIKE ?", (f"tueren:{pid}", f"tueren:{pid}:%")).fetchall():
        lid = r["key"].split(":")[2] if r["key"].count(":") == 2 else "1"
        d = _j(r["data"], {}) or {}
        out.append({"id": lid, "name": d.get("name") or ("Fenster- & Türliste" if lid == "1" else "Liste"), "n": len(d.get("tueren") or []),
                    "erstellt": d.get("erstellt") or "", "updated": r["updated"] or ""})
    out.sort(key=lambda x: (x["id"] != "1", x["erstellt"], x["name"].lower()))
    return out


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


def tueren_zu_positionen(tueren, form="merkmale", din_trennen=True, liste="1"):
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
            items.append({"id": uuid.uuid4().hex[:10], "typ": "titel", "lvl": 1, "kurz": gruppe, "tl": f"{liste}|{gruppe}"})
            items.append({"id": uuid.uuid4().hex[:10], "typ": "pos", "art": "T", "kurz": f"Systembeschreibung {gruppe}", "lang": _system_text(gruppe, gemeinsam), "menge": 0, "einheit": "",
                          "tl": f"{liste}|{gruppe}|sys"})
        for gk, zeilen in gruppen.items():
            tl = f"{liste}|{gruppe}|{hashlib.sha1(gk.encode()).hexdigest()[:10]}"
            liste_ = zeilen
            t = liste_[0]
            n = sum(max(1, int(_f(x.get("anzahl"), 1, 1, 999))) for x in liste_)
            if form == "merkmale":
                kurz = f"{t.get('art') or ('Fenster' if gruppe == 'Fenster' else 'Tür')} gemäß vorangegangener Systembeschreibung"
                lang = _positionen_merkmale(liste_, gemeinsam, gruppe)
            else:
                kurz, lang = _tuer_kurz(t), _tuer_lang(t, liste_)
            items.append({"id": uuid.uuid4().hex[:10], "typ": "pos", "art": "N", "kurz": kurz[:500], "lang": lang, "menge": n, "einheit": "St",
                          "kg": "334" if gruppe in ("Fenster", "Außentüren") or (t.get("art") or "").startswith(("Außen", "Tor")) else "344",
                          "bezug": "Türliste", "quelle": "Türliste: " + ", ".join(x.get("nr") or "?" for x in liste_), "tl": tl})
        out.extend(items)
    return out


def _tl_id(v):
    v = str(v or "1")
    return v if v == "1" or re.fullmatch(r"[a-z0-9]{6,12}", v) else "1"


@app.route("/api/projekt/<int:pid>/tueren", methods=["GET", "PUT"])
def tueren(pid):
    from bpcore import konto
    liste = _tl_id(request.args.get("liste"))
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        if request.method == "GET":
            return jsonify({**_tueren_laden(c, pid, liste), "listen": _tuerlisten(c, pid)})
        b = request.get_json(silent=True) or {}
        c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", (_tl_key(pid, liste),))
        alt_roh = _j(konto._get(c, _tl_key(pid, liste)), {}) or {}
        alt = _tueren_laden(c, pid, liste)
        if liste != "1" and not alt_roh:
            return jsonify(error="Diese Liste gibt es nicht mehr (gelöscht?).", conflict=True), 409
        if isinstance(b.get("rev"), int) and b["rev"] != alt["rev"] and not b.get("force"):
            return jsonify(error=f"Die Türliste wurde inzwischen von {alt['updated_by'] or 'jemand anderem'} geändert.", conflict=True), 409
        neu = {**alt_roh, "tueren": _tuer_clean(b.get("tueren")), "rev": alt["rev"] + 1, "updated_by": g.user["name"]}
        konto._put(c, _tl_key(pid, liste), json.dumps(neu, ensure_ascii=False), g.user["name"])
        return jsonify({**neu, "liste": liste})


@app.route("/api/projekt/<int:pid>/tuerlisten", methods=["GET", "POST"])
def tuerlisten(pid):
    """Listen des Projekts; POST {name, kopie_von?} legt eine neue an."""
    from bpcore import konto
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        if request.method == "GET":
            return jsonify(_tuerlisten(c, pid))
        b = request.get_json(silent=True) or {}
        name = _s(b.get("name"), 120) or "Neue Liste"
        if not konto._get(c, _tl_key(pid, "1")) and not _tuerlisten(c, pid):   # noch gar keine Liste: die erste anlegen
            lid = "1"
        else:
            lid = uuid.uuid4().hex[:8]
        T = []
        if b.get("kopie_von"):
            T = [{**t, "id": uuid.uuid4().hex[:10]} for t in _tueren_laden(c, pid, _tl_id(b["kopie_von"]))["tueren"]]
        konto._put(c, _tl_key(pid, lid), json.dumps({"tueren": T, "rev": 1, "updated_by": g.user["name"], "name": name,
                                                     "erstellt": _now()}, ensure_ascii=False), g.user["name"])
        C.audit(g.user["name"], "ava", "Türliste angelegt", name)
        return jsonify(liste=lid, listen=_tuerlisten(c, pid))


@app.route("/api/projekt/<int:pid>/tuerlisten/<liste>", methods=["PUT", "DELETE"])
def tuerliste(pid, liste):
    """PUT {name} benennt um; DELETE legt die Liste in den Papierkorb."""
    from bpcore import konto
    liste = _tl_id(liste)
    with db.tx() as c:
        pr = _sees(c, pid)
        if not pr:
            return jsonify(error="Projekt nicht gefunden"), 404
        key = _tl_key(pid, liste)
        roh = _j(konto._get(c, key), {}) or {}
        if request.method == "PUT":
            b = request.get_json(silent=True) or {}
            roh["name"] = _s(b.get("name"), 120) or roh.get("name") or ""
            roh.setdefault("tueren", []); roh.setdefault("rev", 0)
            konto._put(c, key, json.dumps(roh, ensure_ascii=False), g.user["name"])
            return jsonify(listen=_tuerlisten(c, pid))
        if not c.execute("SELECT 1 FROM bp_store WHERE key=?", (key,)).fetchone():
            return jsonify(error="Liste nicht gefunden"), 404
        name = roh.get("name") or ("Fenster- & Türliste" if liste == "1" else "Türliste")
        pk = papierkorb.ablegen(c, "bp_store", key, "Fenster- & Türliste", f"{name} ({len(roh.get('tueren') or [])} Zeilen)", g.user["name"], pr["name"], "ava")
        C.audit(g.user["name"], "ava", "Türliste in den Papierkorb", name)
        return jsonify(ok=True, papierkorb=pk, listen=_tuerlisten(c, pid))


@app.post("/api/tabelle/lesen")
def tabelle_lesen():
    """Beliebige Tabelle (Excel .xlsx/.xlsm oder CSV) roh lesen – alle Blätter, Werte wie angezeigt. Die Zuordnung der Spalten
    (z. B. für den Import in die Fenster- und Türliste) macht der Browser, damit man sie dort prüfen und ändern kann."""
    f = request.files.get("datei")
    if not f:
        return jsonify(error="Keine Datei."), 400
    name = (f.filename or "").lower()
    roh = f.read(25 * 1024 * 1024 + 1)
    if len(roh) > 25 * 1024 * 1024:
        return jsonify(error="Die Datei ist größer als 25 MB."), 400

    def zelle(v):
        if v is None:
            return ""
        if isinstance(v, float):
            return round(v, 6)
        if isinstance(v, (int, bool)):
            return v
        return str(v).strip()[:500]
    blaetter = []
    if name.endswith((".csv", ".txt")):
        import csv
        text = roh.decode("utf-8-sig", "replace")
        try:
            dia = csv.Sniffer().sniff(text[:5000], delimiters=";,\t")
        except csv.Error:
            dia = csv.excel
        rows = [[zelle(x) for x in r[:80]] for r in list(csv.reader(io.StringIO(text), dia))[:5000]]
        blaetter.append({"name": f.filename or "CSV", "zeilen": rows})
    elif name.endswith((".xlsx", ".xlsm")):
        import openpyxl
        try:
            wb = openpyxl.load_workbook(io.BytesIO(roh), data_only=True, read_only=True)
        except Exception as e:
            return jsonify(error=f"Die Excel-Datei lässt sich nicht lesen ({str(e)[:120]})."), 400
        for ws in wb.worksheets[:20]:
            rows = []
            for r in ws.iter_rows(max_row=5000, max_col=80, values_only=True):
                rows.append([zelle(x) for x in r])
            while rows and not any(x != "" for x in rows[-1]):
                rows.pop()
            blaetter.append({"name": ws.title, "zeilen": rows})
    elif name.endswith(".xls"):
        return jsonify(error="Alte Excel-Dateien (.xls) bitte in Excel als .xlsx speichern."), 400
    else:
        return jsonify(error="Bitte eine Excel-Datei (.xlsx) oder CSV wählen."), 400
    return jsonify(blaetter=blaetter, datei=f.filename or "")


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
    und an ein LV anhängen (unter einem Titel „Türen“) oder ein neues LV anlegen.
    aktualisieren: true (mit lv) – das LV enthält schon Positionen aus dieser Liste: Mengen und Texte werden angepasst,
    neue Ausführungen kommen dazu, weggefallene bekommen Menge 0 (OZ, Preise und Vergabe bleiben)."""
    b = request.get_json(silent=True) or {}
    liste = _tl_id(b.get("liste"))
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        T = _tueren_laden(c, pid, liste)["tueren"]
        ids = set(b.get("ids") or [])
        if ids and not b.get("aktualisieren"):
            T = [t for t in T if t["id"] in ids]
        if not T:
            return jsonify(error="Keine Türen in der Liste."), 400
        form = "lang" if b.get("form") == "lang" else "merkmale"
        pos = tueren_zu_positionen(T, form, b.get("din_trennen", True) is not False, liste)
        titel = _s(b.get("titel"), 300)
        neu = ([{"id": uuid.uuid4().hex[:10], "typ": "titel", "lvl": 1, "kurz": titel or "Türen", "tl": liste}] if form == "lang" or titel else []) + pos
        if form == "merkmale" and titel:   # Obertitel: Gruppen werden Untertitel
            for x in neu[1:]:
                if x["typ"] == "titel":
                    x["lvl"] = 2
        now = _now()
        stat = None
        if isinstance(b.get("lv"), int):
            r = _lv(c, b["lv"])
            if not r or r["project_id"] != pid:
                return jsonify(error="LV nicht gefunden"), 404
            i = r["id"]
            d = _j(r["data"], {}) or {}
            I = d.get("items") or []
            if b.get("aktualisieren"):
                I, stat = _tl_abgleich(I, neu, liste)
            else:
                I = I + neu
            d["items"] = clean_items(I)
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
        C.audit(g.user["name"], "ava", "Türliste ins LV" + (" (aktualisiert)" if stat else ""), f"{len(T)} Türen/Fenster")
        return jsonify(ok=True, lv=i, positionen=sum(1 for x in pos if x["typ"] == "pos" and x["art"] != "T"), tueren=len(T), abgleich=stat)


@app.get("/api/projekt/<int:pid>/tueren/lv")
def tueren_lv_verknuepft(pid):
    """LVs, in denen schon Positionen aus dieser Liste stehen (für „LV aktualisieren“)."""
    liste = _tl_id(request.args.get("liste"))
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        out = []
        for r in c.execute("SELECT id, data FROM ava_lv WHERE project_id=? AND " + AKTIV, (pid,)).fetchall():
            I = (_j(r["data"], {}) or {}).get("items") or []
            n = sum(1 for x in I if x.get("typ") == "pos" and x.get("art") != "T" and (x.get("tl") or "").startswith(liste + "|"))
            if n:
                out.append({"lv": r["id"], "positionen": n})
    return jsonify(out)


def _tl_abgleich(I, neu, liste):
    """Positionen aus der Türliste im LV auf den Stand der Liste bringen (siehe tueren_ins_lv). Gibt (Items, Zähler) zurück."""
    vorh = {x["tl"]: x for x in I if x.get("tl") and (x["tl"] == liste or x["tl"].startswith(liste + "|"))}
    stat = {"angepasst": 0, "neu": 0, "null": 0, "gleich": 0}
    neu_tl = {x["tl"] for x in neu if x.get("tl")}
    I = list(I)
    for x in neu:
        tl = x.get("tl")
        alt = vorh.get(tl)
        if alt is not None:
            if x["typ"] == "pos":
                vorher = (alt.get("menge"), alt.get("lang"))
                alt["menge"], alt["lang"], alt["quelle"] = x["menge"], x["lang"], x.get("quelle", alt.get("quelle"))
                alt.pop("entf", None)
                if x["art"] != "T":
                    stat["angepasst" if vorher != (alt["menge"], alt["lang"]) else "gleich"] += 1
            continue
        # neu: hinter das letzte Element derselben Gruppe (oder der Liste) einfügen
        grp = "|".join(tl.split("|")[:2]) if tl else liste
        idx = [k for k, y in enumerate(I) if y.get("tl") and (y["tl"] == grp or y["tl"].startswith(grp + "|"))]
        if not idx:
            idx = [k for k, y in enumerate(I) if y.get("tl") and (y["tl"] == liste or y["tl"].startswith(liste + "|"))]
        at = (idx[-1] + 1) if idx else len(I)
        if x["typ"] == "titel" and idx:   # neue Gruppe: nach allem aus der Liste
            at = idx[-1] + 1
        I.insert(at, dict(x))
        vorh[tl] = I[at]
        if x["typ"] == "pos" and x["art"] != "T":
            stat["neu"] += 1
    for tl, alt in list(vorh.items()):
        if alt.get("typ") == "pos" and alt.get("art") != "T" and tl not in neu_tl and alt.get("menge"):
            alt["menge"] = 0
            stat["null"] += 1
    return I, stat


@app.get("/api/projekt/<int:pid>/tueren.xlsx")
def tueren_excel(pid):
    import openpyxl
    from openpyxl.styles import Alignment, Font, PatternFill
    with db.tx() as c:
        p = _sees(c, pid)
        if not p:
            return jsonify(error="Projekt nicht gefunden"), 404
        T = _tueren_laden(c, pid, _tl_id(request.args.get("liste")))["tueren"]
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

    def col(*names, genau=False):
        for n in names:   # zuerst genaue Treffer („ME“ ist nicht „Einheitspreis“), dann Anfänge („Menge (m²)“)
            for j, x in enumerate(h):
                if x == n:
                    return j
        if genau:
            return None
        for n in names:
            for j, x in enumerate(h):
                if x.startswith(n) and not (n == "me" and x.startswith("menge")):
                    return j
        return None
    cz, ck, cl, cm, ce, cp = col("oz", "pos"), col("kurztext", "bezeichnung", "text"), col("langtext"), col("menge"), col("einheit", "me"), col("ep", "einheitspreis")
    ca = col("art", genau=True)
    if ce is not None and ce == cp:   # „Einheit“ und „EP“ dürfen nicht dieselbe Spalte sein
        ce = None
    items = []
    for row in rows[k0 + 1:]:
        g_ = lambda j: row[j] if j is not None and j < len(row) else None
        oz, kurz = str(g_(cz) or "").strip(), str(g_(ck) or "").strip()
        if not oz and not kurz:
            continue
        menge = _fn(g_(cm))
        if menge is None and not g_(ce):
            if not oz and re.match(r"(?i)^(summe|gesamt|zwischensumme|übertrag|uebertrag)\b", kurz):   # Summenzeilen (z. B. aus dem eigenen Export)
                continue
            if not oz:   # Zeile ohne OZ, Menge und Einheit: Hinweistext
                items.append({"typ": "pos", "oz": "", "kurz": kurz, "lang": str(g_(cl) or "").strip(), "menge": 0, "einheit": "", "art": "T", "ep": None})
            else:        # mit OZ: Titel
                items.append({"typ": "titel", "lvl": max(1, oz.count(".") + 1), "oz": oz, "kurz": kurz})
        else:
            art = str(g_(ca) or "").strip().upper()
            items.append({"typ": "pos", "oz": oz, "kurz": kurz, "lang": str(g_(cl) or "").strip(), "menge": menge or 0, "einheit": str(g_(ce) or "").strip(),
                          "art": art if art in ARTEN and art != "T" else "N", "ep": _fn(g_(cp))})
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


# ---------------------------------------------------------------- LV als PDF (auch Scan): daneben anzeigen, Zeilen anklicken, Positionen vorschlagen
_LVDOK = {"ok": False}
_EINHEITEN = r"(m2|m²|qm|m3|m³|cbm|m|lfm|lfdm|st|stk|stck|stück|psch|pausch|pschl|h|std|kg|t|to|wo|woche|mt|monat|tag|l|ltr|satz|stg)\.?"


def _lvdok_tabelle(c):
    if _LVDOK["ok"]:
        return
    c.execute("""CREATE TABLE IF NOT EXISTS ava_lvdok(id SERIAL PRIMARY KEY, lv_id INTEGER NOT NULL, name TEXT NOT NULL DEFAULT '', data BYTEA,
                 auslese TEXT, created TEXT NOT NULL DEFAULT '', user_name TEXT NOT NULL DEFAULT '')""")
    _LVDOK["ok"] = True


def _lv_lesen(data, fortschritt=None):
    """Zeilen mit Stelle (zum Anklicken) und ein Vorschlag für Titel/Positionen – über Positionsblöcke (ava_lesen):
    OZ in der OZ-Spalte, Menge/Einheit/Preise irgendwo im Block (erste Zeile, letzte Zeile des Langtexts, Spalten)."""
    import ava_lesen as AL
    S = AL.seiten(data, max_seiten=80, ocr_seiten=40, fortschritt=fortschritt)
    zeilen, ocr = {}, False
    for n, W_, H_, ws, o in S:
        ocr = ocr or o
        zl = zeilen.setdefault(str(n), [])
        for z in AL.zeilen(ws):
            t = z["t"].strip()
            if t:
                zl.append([round(min(float(w["x0"]) for w in z["w"]) / W_, 4), round(z["top"] / H_, 4),
                           round(max(float(w["x1"]) for w in z["w"]) / W_, 4), round(z["bottom"] / H_, 4), t[:400]])
    X = AL.bloecke(S)
    B = X["bloecke"]
    vor = []
    for x in B:
        if x["titel"]:
            vor.append({"typ": "titel", "oz": x["oz"], "kurz": x["kurz"][:200], "lvl": max(1, min(4, len(AL.ozn(x["oz"])))), "seite": x["seite"]})
        elif x["kurz"] or x["menge"] is not None:
            y = {"typ": "pos", "art": "N", "oz": x["oz"], "kurz": (x["kurz"] or x["lang"][:80])[:250], "lang": x["lang"], "menge": x["menge"] or 0,
                 "einheit": x["einheit"] or "", "seite": x["seite"]}
            if x.get("ep") is not None:
                y["ep_s"] = x["ep"]
            vor.append(y)
    return {"zeilen": zeilen, "vorschlag": vor[:3000], "ocr": ocr, "kopf": sorted(X["kopf"] or {})}


def _lvdoks(c, i):
    _lvdok_tabelle(c)
    out = []
    for d in c.execute("SELECT id, name, auslese, created FROM ava_lvdok WHERE lv_id=? ORDER BY id", (i,)).fetchall():
        A = _j(d["auslese"], {}) or {}
        out.append({"id": d["id"], "name": d["name"], "created": d["created"], "ocr": bool(A.get("ocr")), "laeuft": bool(A.get("laeuft")), "fehler": A.get("fehler") or "",
                    "ki": A.get("ki") or "", "ki_stand": A.get("ki_stand") or "", "n_ep": sum(1 for x in A.get("vorschlag") or [] if x.get("ep_s")),
                    "lauf_art": A.get("lauf_art") or "", "lauf_seit": A.get("lauf_seit") or "", "stand_n": A.get("stand_n") or 0, "stand_N": A.get("stand_N") or 0,
                    "abgebrochen": bool(A.get("abgebrochen")), "leer": not A.get("zeilen"),
                    "n_pos": sum(1 for x in A.get("vorschlag") or [] if x["typ"] == "pos"), "n_titel": sum(1 for x in A.get("vorschlag") or [] if x["typ"] == "titel")})
    return out


@app.post("/api/lv/<int:i>/dok")
def lvdok_neu(i):
    f = request.files.get("datei")
    if not f:
        return jsonify(error="Keine Datei"), 400
    data = f.read(80 * 1024 * 1024 + 1)
    if len(data) > 80 * 1024 * 1024:
        return jsonify(error="Die Datei ist zu groß (höchstens 80 MB)."), 400
    try:
        data, dname = _als_pdf(data, f.filename or "")
    except ValueError as e:
        return jsonify(error=str(e)), 400
    scan = _ist_scan(data)
    A = {"zeilen": {}, "vorschlag": [], "ocr": True, "laeuft": True} if scan else None
    if not scan:
        try:
            A = _lv_lesen(data)
        except Exception as e:
            A = {"zeilen": {}, "vorschlag": [], "ocr": False, "fehler": str(e)[:200]}
    with db.tx() as c:
        if not _lv(c, i):
            return jsonify(error="Nicht gefunden"), 404
        _lvdok_tabelle(c)
        d = c.execute("INSERT INTO ava_lvdok(lv_id, name, data, auslese, created, user_name) VALUES(?,?,?,?,?,?) RETURNING id",
                      (i, _s(dname, 200) or "LV.pdf", data, json.dumps(A, ensure_ascii=False), _now(), g.user["name"])).fetchone()["id"]
        _touch(c, i)
        antwort = _antwort(c, i)
    if scan:   # Texterkennung dauert je Seite einige Sekunden – im Hintergrund, die Seite fragt nach (sonst bricht der Webserver nach 60 s ab)
        import threading
        with db.tx() as c:
            tok = _lvdok_start(c, d, "ocr")
            antwort = _antwort(c, i)
        threading.Thread(target=_mit_user(lambda: _lvdok_ocr(d, tok, data)), daemon=True).start()
    return antwort


# ---- Dokumente in beliebiger Form für LV und Angebot: Fotos/Scans, Word, Text werden zu einer PDF (rechts daneben anzeigen,
#      Zeilen anklicken, Texterkennung) – GAEB und Excel gehen weiter über den Import
_BILD = (".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp", ".gif")


def _text_pdf(zeilen, titel=""):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    import textwrap
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    if titel:
        cv.setTitle(titel)
    W_, H_ = A4
    y = H_ - 50
    cv.setFont("Helvetica", 9)
    for z in zeilen:
        for t in (textwrap.wrap(z, 120, break_long_words=True) or [""]):
            if y < 45:
                cv.showPage(); cv.setFont("Helvetica", 9); y = H_ - 50
            try:
                cv.drawString(42, y, t.encode("cp1252", "replace").decode("cp1252"))
            except Exception:   # Zeichen nicht in cp1252: ersatzweise ASCII schreiben
                cv.drawString(42, y, t.encode("ascii", "replace").decode())
            y -= 12
    cv.save()
    return buf.getvalue()


def _docx_zeilen(data):
    import zipfile
    import xml.etree.ElementTree as ET
    ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    try:
        x = zipfile.ZipFile(io.BytesIO(data)).read("word/document.xml")
    except Exception:
        raise ValueError("Die Word-Datei lässt sich nicht öffnen.")
    body = ET.fromstring(x).find(ns + "body")
    out = []
    txt = lambda el: "".join(t.text or "" for t in el.iter(ns + "t")).strip()
    for el in list(body if body is not None else []):
        if el.tag == ns + "p":
            out.append(txt(el))
        elif el.tag == ns + "tbl":
            for tr in el.iter(ns + "tr"):
                zellen = [txt(tc) for tc in tr.findall(ns + "tc")]
                if any(zellen):
                    out.append("   ".join(z for z in zellen if z))
    return out


def _als_pdf(data, name):
    """(PDF-Bytes, Dateiname) – PDF bleibt, Bild/Foto/Scan, Word (.docx) und Text (.txt/.csv) werden umgewandelt.
    ValueError mit Hinweis bei Formaten, die nicht gehen."""
    nl = (name or "").lower()
    stamm = re.sub(r"\.[^.]+$", "", name or "Dokument") or "Dokument"
    if data.startswith(b"%PDF"):
        return data, name or "Dokument.pdf"
    if nl.endswith(_BILD) or data[:3] == b"\xff\xd8\xff" or data[:8] == b"\x89PNG\r\n\x1a\n":
        from PIL import Image, ImageOps, ImageSequence
        try:
            im = Image.open(io.BytesIO(data))
            seiten = [ImageOps.exif_transpose(f.copy()).convert("RGB") for f in ImageSequence.Iterator(im)][:60]
        except Exception:
            raise ValueError("Das Bild lässt sich nicht öffnen (am iPhone ggf. als JPG statt HEIC teilen).")
        buf = io.BytesIO()
        seiten[0].save(buf, "PDF", resolution=200, save_all=True, append_images=seiten[1:])
        return buf.getvalue(), stamm + ".pdf"
    if nl.endswith(".heic"):
        raise ValueError("HEIC-Fotos bitte als JPG teilen (iPhone: Einstellungen → Kamera → Formate → „Maximale Kompatibilität“).")
    if nl.endswith(".docx"):
        return _text_pdf(_docx_zeilen(data), stamm), stamm + ".pdf"
    if nl.endswith(".doc"):
        raise ValueError("Alte Word-Dateien (.doc) bitte in Word als .docx oder PDF speichern.")
    if nl.endswith((".txt", ".csv")) or ("." not in nl.rsplit("/", 1)[-1] and b"\x00" not in data[:4000]):
        for enc in ("utf-8", "cp1252"):
            try:
                t = data.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        return _text_pdf([z.replace(";", "   ").replace("\t", "   ") for z in t.splitlines()], stamm), stamm + ".pdf"
    raise ValueError("Dieses Format geht nicht – bitte PDF, Foto/Scan, Word (.docx), Excel oder GAEB.")



def _ist_scan(data):
    """Hat die PDF auf den ersten Seiten keinen Text (eingescannt)?"""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            return not any((pg.extract_text() or "").strip() for pg in pdf.pages[:3])
    except Exception:   # PDF nicht lesbar: nicht als Scan behandeln, Auslesen meldet den Fehler selbst
        return False


_KI_LV = """Du liest ein Leistungsverzeichnis, ein Angebot oder eine Leistungsliste (deutsches Bauwesen) und überträgst es in ein LV.
Antworte nur mit JSON: {"items": [ ... ]} in der Reihenfolge des Dokuments. Einträge:
{"typ": "titel", "oz": "01", "kurz": "Erdarbeiten"}  – Titel/Abschnitt
{"typ": "pos", "oz": "01.0010", "kurz": "Kurztext, höchstens 120 Zeichen", "lang": "vollständiger Langtext", "menge": 12.5, "einheit": "m2", "ep": 45.0}
Regeln: nur übernehmen, was im Text steht – nichts erfinden. Fehlt die Ordnungszahl, "oz": "". Fehlt die Menge, "menge": 0.
"ep" nur bei einem Einheitspreis im Dokument (Angebot), sonst null. Zahlen als JSON-Zahl mit Punkt (12,50 → 12.5).
Kopf- und Fußzeilen, Seitenzahlen, Überträge, Summen, Anschreiben und Vertragsbedingungen weglassen."""


def _ki_items(d):
    out = []
    for x in (d or {}).get("items") or []:
        if not isinstance(x, dict):
            continue
        typ = "titel" if x.get("typ") == "titel" else "pos"
        oz = _s(x.get("oz"), 40).rstrip(".")
        kurz = _s(x.get("kurz"), 250).strip()
        if not kurz:
            continue
        if typ == "titel":
            out.append({"typ": "titel", "oz": oz, "kurz": kurz, "lvl": min(3, oz.count(".") + 1) if oz else 1})
            continue
        num = lambda v: v if isinstance(v, (int, float)) else _zahl(str(v)) if v not in (None, "") else None
        y = {"typ": "pos", "art": "N", "oz": oz, "kurz": kurz, "lang": _s(x.get("lang"), 8000), "menge": num(x.get("menge")) or 0,
             "einheit": _s(x.get("einheit"), 12)}
        if num(x.get("ep")):
            y["ep_s"] = num(x.get("ep"))
        out.append(y)
    return out


class _Abbruch(Exception):
    """Lauf wurde abgebrochen (oder neu gestartet) – Ergebnis verwerfen."""


def _lvdok_start(c, d, art):
    """Neuen Lauf (Texterkennung „ocr“ oder „ki“) am Dokument vermerken → Kennung; ein laufender wird damit ungültig."""
    import uuid as _u
    tok = _u.uuid4().hex[:12]
    r = c.execute("SELECT auslese FROM ava_lvdok WHERE id=?", (d,)).fetchone()
    A = _j(r["auslese"], {}) or {}
    A.update(laeuft=True, lauf=tok, lauf_art=art, lauf_seit=datetime.now().isoformat(timespec="seconds"), fehler="", abgebrochen=False,
             ki_stand="startet …", stand_n=0, stand_N=0)
    c.execute("UPDATE ava_lvdok SET auslese=? WHERE id=?", (json.dumps(A, ensure_ascii=False), d))
    return tok


def _lvdok_setzen(d, tok, **kw):
    """Stand/Ergebnis eines Laufs schreiben – nur, solange er noch der aktuelle ist (sonst _Abbruch)."""
    with db.tx() as c:
        r = c.execute("SELECT auslese FROM ava_lvdok WHERE id=?", (d,)).fetchone()
        A = (_j(r["auslese"], {}) or {}) if r else {}
        if not r or A.get("lauf") != tok:
            raise _Abbruch()
        A.update(kw)
        if kw.get("laeuft") is False:
            A["lauf"] = None
        c.execute("UPDATE ava_lvdok SET auslese=? WHERE id=?", (json.dumps(A, ensure_ascii=False), d))


def _lvdok_ocr(d, tok, data):
    """Hintergrund: Dokument lesen (Scans per Texterkennung), Stand je Seite, abbrechbar."""
    try:
        B = _lv_lesen(data, lambda n, N: _lvdok_setzen(d, tok, ki_stand=f"Texterkennung Seite {n} von {N}", stand_n=n - 1, stand_N=N))
        _lvdok_setzen(d, tok, **B, laeuft=False, ki="", ki_stand="", stand_n=0, stand_N=0, fehler="")
    except _Abbruch:
        return
    except Exception as e:
        fehler.still("ava", "LV-Dokument lesen", e)
        try:
            _lvdok_setzen(d, tok, laeuft=False, ki_stand="", fehler=str(e)[:200])
        except _Abbruch:
            pass


def _lvdok_ki(d, ki, tok):
    """Hintergrund: Text (oder bei Scans ohne Text die Seitenbilder) an die KI, Ergebnis als Vorschlag im Dokument."""
    def setzen(**kw):
        _lvdok_setzen(d, tok, **kw)
    try:
        with db.tx() as c:
            x = c.execute("SELECT data, auslese FROM ava_lvdok WHERE id=?", (d,)).fetchone()
            A = _j(x["auslese"], {}) or {}
            data = bytes(x["data"])
            Z = [z[4] for n in sorted((A.get("zeilen") or {}), key=lambda k: int(k)) for z in A["zeilen"][n]]
            # Stücke von etwa 7000 Zeichen (lokale Modelle haben wenig Kontext), Grenze an einer Zeile mit Ordnungszahl
            teile, akt = [], []
            for t in Z:
                if sum(len(y) for y in akt) > 7000 and re.match(r"^\d{1,4}(\.\d{1,4})+\.?\s", t):
                    teile.append(akt); akt = []
                akt.append(t)
            if akt:
                teile.append(akt)
            items = []
            if teile:
                for k, tl in enumerate(teile, 1):
                    setzen(ki_stand=f"Teil {k} von {len(teile)}", stand_n=k - 1, stand_N=len(teile))
                    items += _ki_items(ai.ask_json(ki, _KI_LV, "Text des Dokuments (Teil %d von %d):\n\n%s" % (k, len(teile), "\n".join(tl)), 8000, c))
            elif ai.sieht(ki):   # Scan ohne erkannten Text: Seitenbilder
                import pdfplumber
                with pdfplumber.open(io.BytesIO(data)) as pdf:
                    S = pdf.pages[:25]
                    for k, pg in enumerate(S, 1):
                        setzen(ki_stand=f"Seite {k} von {len(S)}", stand_n=k - 1, stand_N=len(S))
                        buf = io.BytesIO()
                        pg.to_image(resolution=110).original.convert("RGB").save(buf, "PNG")
                        items += [dict(y, seite=k) for y in _ki_items(ai.parse_json(ai.ask_image(ki, _KI_LV, f"Seite {k} des Dokuments.", buf.getvalue(), 6000, c)))]
            else:
                raise ai.AIError("Im Dokument ist kein Text erkannt – für Scans ohne Texterkennung eine KI wählen, die Bilder liest (Claude, Gemini, ChatGPT oder Ollama mit Bildmodell).")
        # über Teilgrenzen doppelt gelesene Positionen zusammenführen
        V = []
        for y in items:
            if V and y.get("oz") and V[-1].get("oz") == y["oz"] and V[-1]["typ"] == y["typ"]:
                if y["typ"] == "pos" and len(y.get("lang") or "") > len(V[-1].get("lang") or ""):
                    V[-1] = y
                continue
            V.append(y)
        label = next((l for k_, l, _ in ai.PROVIDERS if k_ == ki), ki)
        setzen(laeuft=False, ki=label, ki_stand="", stand_n=0, stand_N=0, fehler="", vorschlag_regel=A.get("vorschlag_regel", A.get("vorschlag") or []), vorschlag=V[:3000])
    except _Abbruch:
        return
    except Exception as e:
        if not isinstance(e, ai.AIError):
            fehler.still("ava", "LV-Dokument per KI lesen", e)
        try:
            setzen(laeuft=False, ki_stand="", fehler=("KI: " + str(e))[:300])
        except _Abbruch:
            pass


@app.post("/api/lvdok/<int:d>/ki")
def lvdok_ki(d):
    """Auf Nachfrage: Dokument mit der gewählten KI auslesen (läuft im Hintergrund, die Seite fragt nach)."""
    ki = (request.get_json(silent=True) or {}).get("ki") or ""
    with db.tx() as c:
        _lvdok_tabelle(c)
        x = c.execute("SELECT lv_id, auslese FROM ava_lvdok WHERE id=?", (d,)).fetchone()
        if not x or not _lv(c, x["lv_id"]):
            return jsonify(error="Nicht gefunden"), 404
        if ki not in ai.KEYS or ki == "intern":
            return jsonify(error="Bitte eine KI wählen."), 400
        if ki in ai.abgeschaltet(c):
            return jsonify(error="Diese KI ist in der Verwaltung abgeschaltet."), 400
        tok = _lvdok_start(c, d, "ki")   # läuft schon etwas, gilt nur noch dieser Lauf (= neu starten)
        lv_id = x["lv_id"]
    import threading
    threading.Thread(target=_mit_user(lambda: _lvdok_ki(d, ki, tok)), daemon=True).start()
    with db.tx() as c:
        return _antwort(c, lv_id)


@app.post("/api/lvdok/<int:d>/abbrechen")
def lvdok_abbrechen(d):
    """Laufende Texterkennung oder KI abbrechen – ihr Ergebnis wird verworfen, der bisherige Vorschlag bleibt."""
    with db.tx() as c:
        _lvdok_tabelle(c)
        x = c.execute("SELECT lv_id, auslese FROM ava_lvdok WHERE id=?", (d,)).fetchone()
        if not x or not _lv(c, x["lv_id"]):
            return jsonify(error="Nicht gefunden"), 404
        A = _j(x["auslese"], {}) or {}
        A.update(laeuft=False, lauf=None, ki_stand="", stand_n=0, stand_N=0, abgebrochen=True)
        c.execute("UPDATE ava_lvdok SET auslese=? WHERE id=?", (json.dumps(A, ensure_ascii=False), d))
        return _antwort(c, x["lv_id"])


@app.post("/api/lvdok/<int:d>/lesen")
def lvdok_lesen(d):
    """Dokument neu lesen (Texterkennung) – z. B. nach einem Abbruch."""
    with db.tx() as c:
        _lvdok_tabelle(c)
        x = c.execute("SELECT lv_id, data FROM ava_lvdok WHERE id=?", (d,)).fetchone()
        if not x or not _lv(c, x["lv_id"]):
            return jsonify(error="Nicht gefunden"), 404
        tok = _lvdok_start(c, d, "ocr")
        data, lv_id = bytes(x["data"]), x["lv_id"]
    import threading
    threading.Thread(target=_mit_user(lambda: _lvdok_ocr(d, tok, data)), daemon=True).start()
    with db.tx() as c:
        return _antwort(c, lv_id)


@app.route("/api/lvdok/<int:d>", methods=["GET", "DELETE"])
def lvdok(d):
    with db.tx() as c:
        _lvdok_tabelle(c)
        x = c.execute("SELECT * FROM ava_lvdok WHERE id=?", (d,)).fetchone()
        if not x or not _lv(c, x["lv_id"]):
            return jsonify(error="Nicht gefunden"), 404
        if request.method == "DELETE":
            c.execute("DELETE FROM ava_lvdok WHERE id=?", (d,))
            _touch(c, x["lv_id"])
            return _antwort(c, x["lv_id"])
    if request.args.get("auslese"):
        return jsonify(_j(x["auslese"], {}) or {})
    return Response(bytes(x["data"]), mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{urllib_quote(x['name'])}"})


# ---------------------------------------------------------------- Eingangsordner auf dem Server (Scans vom Kopierer …)
@app.get("/api/eingang")
def eingang():
    """Dateien im Eingangsordner (das Bautagebuch kennt den Server), neueste oben."""
    try:
        return jsonify(C.bt_api("GET", "/api/eingang") or {"ok": False, "dateien": []})
    except RuntimeError as e:
        return jsonify(ok=False, error=str(e), dateien=[])


@app.get("/api/eingang/datei")
def eingang_datei():
    import base64
    import urllib.parse
    try:
        d = C.bt_api("GET", "/api/eingang/datei?" + urllib.parse.urlencode({"name": request.args.get("name") or ""}))
    except RuntimeError as e:
        return jsonify(error=str(e)), 502
    roh = base64.b64decode(d.get("datei") or "")
    n = d.get("name") or "Dokument"
    mt = {"pdf": "application/pdf", "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "tif": "image/tiff", "tiff": "image/tiff"}.get(n.rsplit(".", 1)[-1].lower(), "application/octet-stream")
    return Response(roh, mimetype=mt, headers={"Content-Disposition": f"inline; filename*=UTF-8''{urllib_quote(n)}"})


@app.post("/api/eingang/erledigt")
def eingang_erledigt():
    try:
        return jsonify(C.bt_api("POST", "/api/eingang/erledigt", {"name": (request.get_json(silent=True) or {}).get("name") or ""}))
    except RuntimeError as e:
        return jsonify(error=str(e)), 502


@app.get("/api/ablage/vorschlag")
def ablage_vorschlag():
    """Ordnervorschlag im Projektordner (vom Bautagebuch, das die Ablage kennt)."""
    import urllib.parse
    q = {k: request.args.get(k) or "" for k in ("project_id", "art", "firma", "gewerk")}
    try:
        return jsonify(C.bt_api("GET", "/api/ablage/vorschlag?" + urllib.parse.urlencode(q)))
    except RuntimeError as e:
        return jsonify(ok=False, error=str(e))


@app.get("/api/ablage/ordner")
def ablage_ordner():
    import urllib.parse
    q = {k: request.args.get(k) or "" for k in ("project_id", "pfad")}
    try:
        return jsonify(C.bt_api("GET", "/api/ablage/ordner?" + urllib.parse.urlencode(q)))
    except RuntimeError as e:
        return jsonify(ok=False, error=str(e))


@app.post("/api/ablage")
def ablage_datei():
    """Angebot oder Muster-LV (oder anderes) im Projektordner ablegen – Ordner wie vorgeschlagen oder von Hand gewählt."""
    import base64
    f = request.files.get("datei")
    pid = request.form.get("project_id", type=int)
    if not f or not pid:
        return jsonify(error="Datei oder Projekt fehlt"), 400
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
    try:
        ordner = json.loads(request.form.get("ordner") or "null")
    except ValueError:
        ordner = None
    roh = f.read(80 * 1024 * 1024)
    try:
        a = C.bt_api("POST", "/api/ablage/datei", {"project_id": pid, "art": request.form.get("art") or "", "firma": request.form.get("firma") or "",
                                                  "gewerk": request.form.get("gewerk") or "", "name": f.filename or "Dokument.pdf",
                                                  "datei": base64.b64encode(roh).decode(), "ordner": ordner if isinstance(ordner, list) else None})
    except RuntimeError as e:
        return jsonify(error=str(e)), 502
    return jsonify(ok=True, pfad=(a or {}).get("pfad") or "")


def _angebot_eintragen(c, i, A, bieter, cid, ki=False):
    """Erkannte Einheitspreise als Angebot des Bieters eintragen → Hinweistext (ValueError, wenn nichts passt)."""
    r = _lv(c, i)
    items = (_j(r["data"], {}) or {}).get("items") or []
    ki_fehler = ""
    if ki and A.get("zeilen"):
        try:
            _ki_zuordnen(c, A, items)
        except Exception as e:   # KI nicht erreichbar: mit dem weiter, was sicher erkannt ist – Grund steht im Hinweis
            ki_fehler = str(e)[:200]
            if not isinstance(e, ai.AIError):   # KI aus/nicht eingerichtet ist kein Programmfehler
                fehler.still("ava", "Angebot aus PDF: KI-Zuordnung", e)
    preise = {pid: t["ep"] for pid, t in (A.get("pos") or {}).items() if t.get("ep") is not None}
    if not preise:
        raise ValueError("In der PDF keine Preise zu den Positionen dieses LV gefunden (Zuordnung über die OZ oder den Kurztext)."
                         + (" Handschriftlich eingetragene Preise kann nur eine KI lesen – „Mit KI lesen“." if A.get("ocr") else ""))
    a = c.execute("SELECT id, preise FROM ava_angebot WHERE lv_id=? AND (contact_id=? OR lower(bieter)=lower(?))", (i, cid, bieter)).fetchone()
    if a:
        P = {**(_j(a["preise"], {}) or {}), **preise}
        c.execute("UPDATE ava_angebot SET preise=?, quelle='pdf', updated=? WHERE id=?", (json.dumps(P), _now(), a["id"]))
    else:
        c.execute("INSERT INTO ava_angebot(lv_id, contact_id, bieter, eingang, preise, quelle, created, updated) VALUES(?,?,?,?,?,?,?,?)",
                  (i, cid, bieter, date.today().isoformat(), json.dumps(preise), "pdf", _now(), _now()))
    _touch(c, i)
    n_lv = sum(1 for x in items if x.get("typ") == "pos" and x.get("art") != "T")
    return (f"{len(preise)} von {n_lv} Preisen von „{bieter}“ aus der PDF übernommen" + (" (Scan, per Texterkennung – bitte prüfen)" if A.get("ocr") else "")
            + (f", davon {A['ki']['sicher']} per KI zugeordnet" if A.get("ki", {}).get("sicher") else "") + "."
            + (f" KI-Zuordnung nicht möglich: {ki_fehler}" if ki_fehler else ""))


def _mit_user(fn):
    """Für Threads: Anwendungskontext und angemeldeter Benutzer wie in der Anfrage (Rechteprüfung in _lv usw.)."""
    u = g.get("user")

    def lauf():
        with app.app_context():
            g.user = u
            fn()
    return lauf


def _job(c, jid, **kw):
    """Hintergrundarbeit (Texterkennung von Scans dauert länger, als der Webserver auf eine Antwort wartet)."""
    if kw:
        r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"avajob:{jid}",)).fetchone()
        d = {**((_j(r["data"], {}) or {}) if r else {}), **kw}
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated",
                  (f"avajob:{jid}", json.dumps(d, ensure_ascii=False), _now(), "ava"))
        return d
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"avajob:{jid}",)).fetchone()
    return (_j(r["data"], {}) or {}) if r else None


def _im_hintergrund(fn, lv_id, art):
    """fn(fortschritt) → Hinweistext; läuft in einem Thread, Stand unter /api/avajob/<id>."""
    import threading
    import uuid as _u
    jid = _u.uuid4().hex[:16]
    with db.tx() as c:
        _job(c, jid, status="laeuft", lv_id=lv_id, art=art, stand="startet …", n=0, N=0, seit=datetime.now().isoformat(timespec="seconds"))

    def lauf():
        def fortschritt(n, N, was="Texterkennung Seite"):
            with db.tx() as c2:
                if (_job(c2, jid) or {}).get("status") != "laeuft":
                    raise _Abbruch()   # abgebrochen: nichts mehr eintragen
                _job(c2, jid, stand=f"{was} {n} von {N}" if N else was, n=max(0, n - 1), N=N)
        try:
            h = fn(fortschritt)
            with db.tx() as c2:
                if (_job(c2, jid) or {}).get("status") == "laeuft":
                    _job(c2, jid, status="fertig", hinweis=h or "", stand="")
        except _Abbruch:
            return
        except Exception as e:
            if not isinstance(e, (ValueError, ai.AIError)):   # erwartbare Meldungen (nichts gefunden, KI aus) sind keine Programmfehler
                fehler.still("ava", f"Hintergrundarbeit {art}", e)
            with db.tx() as c2:
                _job(c2, jid, status="fehler", fehler=str(e)[:400], stand="")
    threading.Thread(target=_mit_user(lauf), daemon=True).start()
    return jid


_KI_PREISE = """Du siehst eine Seite eines Angebots oder eines vom Bieter ausgefüllten Leistungsverzeichnisses (deutsches Bauwesen).
Die Preise können gedruckt oder HANDSCHRIFTLICH eingetragen sein (z. B. „EP 12,25“ und „GP 2.408,25“ auf punktierten Linien).
Lies für jede Position auf dieser Seite den Einheitspreis (EP) und den Gesamtpreis (GP) in Euro.
Antworte nur mit JSON: {"preise": [{"oz": "04.1", "ep": 12.25, "gp": 2408.25}]}
Regeln: nur Positionen, die auf der Seite stehen; Zahlen mit Punkt als Dezimaltrennzeichen; fehlt ein Wert oder ist er gestrichen, null.
Nichts erfinden – lieber null als raten."""


def _ki_preise(data, items, A, ki, fortschritt=None):
    """Preise per Bild-KI lesen (auf Nachfrage, z. B. handschriftlich ausgefüllte LV-Formulare): je Seite das Bild und
    die dort erwarteten Positionen; übernommen wird ein Preis, wenn Menge (laut LV) × EP = GP aufgeht."""
    import pdfplumber
    P = [x for x in items if x.get("typ") == "pos" and x.get("art") != "T"]
    idx = {x["id"]: k for k, x in enumerate(P)}
    seiten = {}
    for pid, t in (A.get("pos") or {}).items():
        if pid in idx:
            seiten.setdefault(t["seite"], []).append(idx[pid])
    if not seiten:
        raise ValueError("Keine Positionen des LV im Dokument gefunden – die KI braucht wenigstens die Ordnungszahlen.")
    S = sorted(seiten)
    erg, sicher, unsicher = {}, 0, 0
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for k, n in enumerate(S, 1):
            if fortschritt:
                fortschritt(k, len(S))
            lo, hi = max(0, min(seiten[n]) - 2), min(len(P), max(seiten[n]) + 3)
            erwartet = "\n".join(f"{x.get('oz')} | {(x.get('kurz') or '')[:60]} | {x.get('menge')} {x.get('einheit') or ''}" for x in P[lo:hi])
            buf = io.BytesIO()
            pdf.pages[n - 1].to_image(resolution=130).original.convert("RGB").save(buf, "PNG")
            with db.tx() as c:
                d = ai.parse_json(ai.ask_image(ki, _KI_PREISE, f"Positionen, die auf dieser Seite stehen können (OZ | Kurztext | Menge Einheit):\n{erwartet}",
                                               buf.getvalue(), 2000, c)) or {}
            for y in d.get("preise") or []:
                if not isinstance(y, dict):
                    continue
                T = _ozn(str(y.get("oz") or ""))
                x = next((x for x in P[lo:hi] if _ozn(x.get("oz")) == T), None)
                ep = y.get("ep") if isinstance(y.get("ep"), (int, float)) else _zahl(str(y.get("ep") or ""))
                gp = y.get("gp") if isinstance(y.get("gp"), (int, float)) else _zahl(str(y.get("gp") or ""))
                if not x or not ep:
                    continue
                m = x.get("menge") or 0
                if gp and m and abs(m * ep - gp) <= max(0.05, abs(gp) * 0.002):
                    erg[x["id"]] = {"ep": round(float(ep), 2), "sicher": True}
                elif x["id"] not in erg:
                    erg[x["id"]] = {"ep": round(float(ep), 2), "sicher": False}
    sicher = sum(1 for y in erg.values() if y["sicher"])
    return erg, sicher, len(erg) - sicher


@app.post("/api/avajob/<jid>/abbrechen")
def avajob_abbrechen(jid):
    with db.tx() as c:
        jid = re.sub(r"\W", "", jid)[:16]
        d = _job(c, jid)
        if not d or not _lv(c, d.get("lv_id") or 0):
            return jsonify(error="Nicht gefunden"), 404
        if d.get("status") == "laeuft":
            d = _job(c, jid, status="abgebrochen", stand="")
        return jsonify(d)


@app.get("/api/avajob/<jid>")
def avajob(jid):
    with db.tx() as c:
        d = _job(c, re.sub(r"\W", "", jid)[:16])
        if not d or not _lv(c, d.get("lv_id") or 0):
            return jsonify(error="Nicht gefunden"), 404
        return jsonify(d)


@app.post("/api/lv/<int:i>/angebot-pdf")
def angebot_pdf(i):
    """Angebot als PDF, Scan, Foto oder Word: Einheitspreise je LV-Position erkennen und als Angebot des Bieters eintragen.
    Scans laufen im Hintergrund (Antwort {job}), sonst sofort."""
    f = request.files.get("datei")
    if not f:
        return jsonify(error="Keine Datei"), 400
    data = f.read(80 * 1024 * 1024)
    try:
        data, _ = _als_pdf(data, f.filename or "")
    except ValueError as e:
        return jsonify(error=str(e)), 400
    bieter = _s(request.form.get("bieter"), 200) or _s(f.filename, 200)
    cid = request.form.get("contact_id", type=int)
    ki = request.form.get("ki") == "1"
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        items = (_j(r["data"], {}) or {}).get("items") or []
    ki_bild = request.form.get("ki_bild") or ""
    if ki_bild:   # auf Nachfrage: Preise (auch handschriftliche) per Bild-KI
        if ki_bild not in ai.KEYS or ki_bild == "intern":
            return jsonify(error="Bitte eine KI wählen."), 400

        def arbeit_ki(fortschritt):
            A = _auslesen(data, items, fortschritt)
            erg, sicher, unsicher = _ki_preise(data, items, A, ki_bild, lambda k, N: fortschritt(k, N, "KI liest Seite"))
            for pid, y in erg.items():
                A.setdefault("pos", {}).setdefault(pid, {})["ep"] = y["ep"]
            fortschritt(0, 0, "trägt ein …")
            with db.tx() as c2:
                h = _angebot_eintragen(c2, i, A, bieter, cid)
            return h + f" KI: {sicher} Preise geprüft (Menge × EP = GP){f', {unsicher} ohne passenden Gesamtpreis – bitte prüfen' if unsicher else ''}."
        return jsonify(job=_im_hintergrund(arbeit_ki, i, "angebot"))
    if _ist_scan(data):
        def arbeit(fortschritt):
            A = _auslesen(data, items, fortschritt)
            fortschritt(0, 0, "trägt ein …")
            with db.tx() as c2:
                h = _angebot_eintragen(c2, i, A, bieter, cid, ki)
            n_ohne = sum(1 for t in (A.get("pos") or {}).values() if t.get("ep") is None)
            return h + (f" {n_ohne} Positionen ohne lesbaren Preis (z. B. handschriftlich)." if n_ohne else "")
        return jsonify(job=_im_hintergrund(arbeit, i, "angebot"))
    try:
        A = _auslesen(data, items)
    except Exception as e:
        return jsonify(error=f"PDF lässt sich nicht lesen: {e}"), 400
    with db.tx() as c:
        try:
            h = _angebot_eintragen(c, i, A, bieter, cid, ki)
        except ValueError as e:
            return jsonify(error=str(e)), 400
        out = _payload(c, c.execute("SELECT * FROM ava_lv WHERE id=?", (i,)).fetchone())
        out["hinweis"] = h
        return jsonify(out)


@app.route("/api/angebote/<int:a>", methods=["PUT", "DELETE"])
def angebot(a):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        x = c.execute("SELECT * FROM ava_angebot WHERE id=?", (a,)).fetchone()
        if not x or not _lv(c, x["lv_id"]):
            return jsonify(error="Nicht gefunden"), 404
        if request.method == "DELETE":   # in den Papierkorb (mit Preisen) – wiederherstellbar
            lv_ = _lv(c, x["lv_id"]); pr = c.execute("SELECT name FROM projects WHERE id=?", (lv_["project_id"],)).fetchone() if lv_ and lv_["project_id"] else None
            pk = papierkorb.ablegen(c, "ava_angebot", a, "Angebot", f"{x['bieter']} · LV {lv_['nr']} {lv_['name']}".strip() if lv_ else x["bieter"], g.user["name"], pr["name"] if pr else "", "ava")
            _touch(c, x["lv_id"])
            d_ = _antwort(c, x["lv_id"]).get_json(); d_["papierkorb"] = pk
            return jsonify(d_)
        else:
            sets, args = [], []
            for k, n in (("bieter", 200), ("eingang", 10), ("notiz", 2000)):
                if k in b:
                    sets.append(f"{k}=?"); args.append(_s(b[k], n))
            for k in ("nachlass", "skonto"):
                if k in b:
                    sets.append(f"{k}=?"); args.append(round(_f(b[k], 0, 0, 100), 3))
            if "nachlass_eur" in b:
                sets.append("nachlass_eur=?"); args.append(round(_f(b["nachlass_eur"], 0, 0), 2))
            if "skonto_tage" in b:
                sets.append("skonto_tage=?"); args.append(int(_f(b["skonto_tage"], 0, 0, 365)))
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
            c.execute("DELETE FROM pdb_preis WHERE user_name IN (?, ?)", (f"ava:{i}:auftrag", f"ava:{i}:median"))
        elif b.get("frei"):   # Zettelwirtschaft: Auftrag ohne LV und Angebot – Firma und Summe frei eintragen
            bieter = _s(b.get("bieter"), 200)
            if not bieter:
                return jsonify(error="Bitte die Firma angeben."), 400
            alt = _j(r["vergabe"], {}) or {}
            cid = b.get("contact_id") if isinstance(b.get("contact_id"), int) else None
            V = {**alt, "frei": True, "contact_id": cid, "bieter": bieter, "datum": _s(b.get("datum"), 10) or date.today().isoformat(),
                 "summe": round(_f(b.get("summe"), 0, 0), 2), "nachlass": alt.get("nachlass", 0), "nachlass_eur": alt.get("nachlass_eur", 0),
                 "skonto": _f(b.get("skonto"), alt.get("skonto", 0), 0, 100), "skonto_tage": int(_f(b.get("skonto_tage"), alt.get("skonto_tage", 0), 0, 365)),
                 "einbehalt": round(_f(b.get("einbehalt"), alt.get("einbehalt", 0.0), 0, 30), 2), "preise": alt.get("preise") or {}}
            c.execute("UPDATE ava_lv SET vergabe=?, status='vergeben', rev=rev+1, updated=?, updated_by=? WHERE id=?",
                      (json.dumps(V, ensure_ascii=False), _now(), g.user["name"], i))
            C.audit(g.user["name"], "ava", "Vergabe (frei)", f"LV {r['nr']} {r['name']} an {bieter}")
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
                 "nachlass": a["nachlass"] or 0, "nachlass_eur": _ak(a, "nachlass_eur") or 0, "skonto": a["skonto"] or 0, "skonto_tage": _ak(a, "skonto_tage") or 0, "einbehalt": round(_f(b.get("einbehalt"), alt.get("einbehalt", 5.0), 0, 30), 2), "preise": P}
            if isinstance(alt.get("sicherheit"), dict):   # schon eingetragene Sicherheiten, Abnahme, Mängelfrist behalten
                V["sicherheit"] = alt["sicherheit"]
            c.execute("UPDATE ava_lv SET vergabe=?, status='vergeben', rev=rev+1, updated=?, updated_by=? WHERE id=?",
                      (json.dumps(V, ensure_ascii=False), _now(), g.user["name"], i))
            C.audit(g.user["name"], "ava", "Vergabe", f"LV {r['nr']} {r['name']} an {a['bieter']}")
            try:
                with c.savepoint():
                    _preise_in_baudaten(c, i)
            except Exception as e:
                fehler.still("ava", "Vergabe: Erfahrungspreise in die Baudaten schreiben", e)
                pass   # Erfahrungspreise sind ein Zusatz – die Vergabe darf daran nicht scheitern
        versionen.nach(c, f"avalv:{i}", g.user["name"])
        return _antwort(c, i)


RX_BD_CODE = re.compile(r"Baudaten\b.*?\b(\d{3}\.\d{2}\.\d{3}\.\d{5})")


def _preise_in_baudaten(c, i):
    """Nach der Vergabe: Auftragspreis und Median aller Angebote als eigene Preise in die Baudaten (nur Positionen, die aus den
    Baudaten stammen). Je Projekt nur der letzte Stand; Ausreißer (unter 30 % / über 300 % des Katalogpreises) bleiben draußen."""
    r = _lv(c, i)
    V = _j(r["vergabe"], {}) or {}
    if not V.get("angebot_id"):
        return 0
    I = [x for x in (_j(r["data"], {}) or {}).get("items") or [] if x.get("typ") == "pos" and x.get("art") != "T"]
    codes = {}
    for x in I:
        if not x.get("pdb"):
            m = RX_BD_CODE.search(x.get("quelle") or "")
            if m:
                codes[x["id"]] = m.group(1)
    if codes:
        nach_code = {row["code"]: row["id"] for row in c.execute("SELECT id, code FROM pdb_position WHERE code = ANY(?)", (sorted(set(codes.values())),)).fetchall()}
        for x in I:
            if x["id"] in codes and codes[x["id"]] in nach_code:
                x["pdb"] = nach_code[codes[x["id"]]]
    I = [x for x in I if x.get("pdb")]
    if not I:
        return 0
    ang = c.execute("SELECT id, bieter, preise, nachlass FROM ava_angebot WHERE lv_id=?", (i,)).fetchall()
    netto = {a["id"]: {k: v * (1 - (a["nachlass"] or 0) / 100) for k, v in (_j(a["preise"], {}) or {}).items() if isinstance(v, (int, float)) and v > 0} for a in ang}
    auf = netto.get(V["angebot_id"], {})
    kat = {row["id"]: row for row in c.execute("SELECT id, katalog, ep_mittel FROM pdb_position WHERE id = ANY(?)", (sorted({x["pdb"] for x in I}),)).fetchall()}
    fk = {}
    datum = V.get("datum") or date.today().isoformat()
    pid = r["project_id"]
    n = 0
    for x in I:
        k = kat.get(x["pdb"])
        if not k:
            continue
        f = fk.setdefault(k["katalog"], baudaten.umrechnung(c, k["katalog"]))
        ref = (k["ep_mittel"] or 0) * f
        ok = (lambda ep: ep and (not ref or 0.3 * ref <= ep <= 3 * ref))
        c.execute("DELETE FROM pdb_preis WHERE position_id=? AND ((project_id IS NOT DISTINCT FROM ? AND user_name LIKE 'ava:%') OR user_name IN (?, ?))",
                  (x["pdb"], pid, f"ava:{i}:auftrag", f"ava:{i}:median"))
        menge = _fn(x.get("menge"))
        ep = auf.get(x["id"])
        if ok(ep):
            c.execute("INSERT INTO pdb_preis(position_id, ep, datum, project_id, firma, menge, notiz, created, user_name) VALUES(?,?,?,?,?,?,?,?,?)",
                      (x["pdb"], round(ep, 2), datum, pid, V.get("bieter") or "Auftrag", menge, f"Auftrag · LV {r['nr']} {r['name']}"[:500], _now(), f"ava:{i}:auftrag"))
            n += 1
        alle = sorted(v[x["id"]] for v in netto.values() if ok(v.get(x["id"])))
        if len(alle) >= 2:
            med = alle[len(alle) // 2] if len(alle) % 2 else (alle[len(alle) // 2 - 1] + alle[len(alle) // 2]) / 2
            c.execute("INSERT INTO pdb_preis(position_id, ep, datum, project_id, firma, menge, notiz, created, user_name) VALUES(?,?,?,?,?,?,?,?,?)",
                      (x["pdb"], round(med, 2), datum, pid, f"Median {len(alle)} Angebote", menge, f"Angebote · LV {r['nr']} {r['name']}"[:500], _now(), f"ava:{i}:median"))
            n += 1
    return n


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
                      (i, z["pos_id"], _s(z.get("datum"), 40) or date.today().isoformat(), _s(z.get("ort"), 200), _s(z.get("formel"), 500), menge,
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
                      (_s(b.get("datum", x["datum"]), 40), _s(b.get("ort", x["ort"]), 200), fo, menge, a))
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
        W = b.get("wiederherstellen")
        if isinstance(W, dict) and isinstance(W.get("nr"), int):   # Rückgängig nach dem Löschen: wie sie war, mit derselben Nummer und den PDFs
            if c.execute("SELECT 1 FROM ava_rechnung WHERE lv_id=? AND nr=?", (i, W["nr"])).fetchone():
                return jsonify(error="Die Nummer ist inzwischen vergeben."), 400
            art = W.get("art") if W.get("art") in RE_ARTEN else "abschlag"
            neu = c.execute("INSERT INTO ava_rechnung(lv_id, nr, art, status, datum, eingang, re_nr, gefordert, data, created, updated, updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id",
                            (i, W["nr"], art, "geprueft" if W.get("status") == "geprueft" else "offen", _s(W.get("datum"), 10), _s(W.get("eingang"), 10),
                             _s(W.get("re_nr"), 60), round(_f(W.get("gefordert"), 0, 0), 2), json.dumps(W.get("data") if isinstance(W.get("data"), dict) else {}),
                             _now(), _now(), g.user["name"])).fetchone()["id"]
            if isinstance(W.get("id"), int):
                _beleg_tabelle(c)
                c.execute("UPDATE ava_beleg SET rechnung_id=? WHERE rechnung_id=?", (neu, W["id"]))
            _touch(c, i)
            return _antwort(c, i)
        V0 = _j(r["vergabe"], {}) or {}
        if not (V0.get("preise") or V0.get("frei")):
            return jsonify(error="Erst vergeben – oder ohne LV „Auftrag frei eintragen“ (Firma und Summe)."), 400
        art = b.get("art") if b.get("art") in RE_ARTEN else "abschlag"
        # Nur die eigene kumulierte Kette muss geprüft sein (Teil-/Schlussrechnungen bzw. Nachtragsrechnungen);
        # Regierechnungen und Rechnungen ohne Aufmaß zählen einzeln, die Freigabe der Sicherheit braucht alle geprüft
        for o in c.execute("SELECT nr, art, data FROM ava_rechnung WHERE lv_id=? AND status<>'geprueft'", (i,)).fetchall():
            einzeln_ = o["art"] in ("regie", "sicherheit") or (_j(o["data"], {}) or {}).get("frei") is not None
            kette_ = "nachtrag" if o["art"] == "nachtrag" else "haupt"
            if art == "sicherheit" or (not einzeln_ and art in ("abschlag", "schluss", "nachtrag") and kette_ == ("nachtrag" if art == "nachtrag" else "haupt")):
                return jsonify(error=f"{re_titel(o['nr'], o['art'])} ist noch in Prüfung – bitte erst diese abschließen."), 400
        if art in ("abschlag", "schluss", "nachtrag") and c.execute("SELECT 1 FROM ava_rechnung WHERE lv_id=? AND art='schluss'", (i,)).fetchone():
            return jsonify(error="Die Schlussrechnung ist schon erfasst – danach nur noch Regierechnung oder Freigabe der Sicherheit."), 400
        nr = (c.execute("SELECT MAX(nr) AS n FROM ava_rechnung WHERE lv_id=?", (i,)).fetchone()["n"] or 0) + 1
        data = {"abzuege": []}
        if art == "regie":
            data["zeilen"] = []
        if art == "sicherheit":
            data["betrag"] = round(_f(b.get("betrag"), 0, 0), 2)
        if art not in ("regie", "sicherheit") and (b.get("frei") is not None or (V0.get("frei") and not V0.get("preise"))):
            data["frei"] = round(_f(b.get("frei"), 0), 2)
        if b.get("einbehalt") is not None:
            data["einbehalt"] = _fn(b.get("einbehalt"))
        c.execute("INSERT INTO ava_rechnung(lv_id, nr, art, datum, eingang, re_nr, gefordert, data, created, updated, updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                  (i, nr, art, _s(b.get("datum"), 10), _s(b.get("eingang"), 10) or date.today().isoformat(), _s(b.get("re_nr"), 60),
                   round(_f(b.get("gefordert"), 0, 0), 2), json.dumps(data), _now(), _now(), g.user["name"]))
        _touch(c, i)
        return _antwort(c, i)


_BELEG = {"ok": False}


def _beleg_tabelle(c):
    if _BELEG["ok"]:
        return
    c.execute("""CREATE TABLE IF NOT EXISTS ava_beleg(id SERIAL PRIMARY KEY, rechnung_id INTEGER NOT NULL REFERENCES ava_rechnung(id) ON DELETE CASCADE,
                 name TEXT NOT NULL DEFAULT '', data BYTEA, ablage TEXT NOT NULL DEFAULT '', created TEXT NOT NULL DEFAULT '', user_name TEXT NOT NULL DEFAULT '')""")
    c.execute("ALTER TABLE ava_beleg ADD COLUMN IF NOT EXISTS auslese TEXT")
    _BELEG["ok"] = True


_ZAHL = re.compile(r"^[-−]?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$")


def _zahl(t):
    t = t.strip().rstrip("€").rstrip("%").strip().replace("−", "-")
    if not t or not _ZAHL.match(t):
        return None
    try:
        return float(t.replace(".", "").replace(",", "."))
    except ValueError:
        return None


def _ozn(t):
    return tuple(p.lstrip("0") or "0" for p in re.split(r"\D+", t or "") if p)


def _auslesen(data, items, fortschritt=None):
    """Rechnung, Aufmaß oder Angebot der Firma (PDF mit Textebene oder Scan) lesen: je LV-Position Seite, Stelle,
    Menge (bei kumulierten Rechnungen die Gesamtmenge), Einheitspreis und Betrag; dazu Rechnungsnummer, Datum,
    Netto, Summenzeilen und Zeilen ohne LV-Position (Regie, Material …)."""
    import ava_lesen as AL
    S = AL.seiten(data, max_seiten=60, ocr_seiten=40, fortschritt=fortschritt)
    X = AL.bloecke(S)
    zu = AL.zuordnen(X["bloecke"], items)
    treffer = {}
    LVM = {x["id"]: x.get("menge") for x in items if x.get("typ") == "pos"}
    for pid, b in zu.items():
        if b.get("unsicher"):   # Scan, Menge × EP ≠ GP: mit der Menge des LV noch einmal prüfen, sonst Preise verwerfen
            m_ = LVM.get(pid)
            if not (m_ and b.get("ep") and b.get("gp") and abs(m_ * b["ep"] - b["gp"]) <= max(0.05, abs(b["gp"]) * 0.002)):
                b = {**b, "ep": None, "gp": None}
        t = {"seite": b["seite"], "box": b.get("box")}
        if b.get("menge") is not None:
            t["menge"] = b["menge"]
        if b.get("ep") is not None:
            t["ep"] = b["ep"]
        if b.get("gp") is not None:
            t["gp"] = b["gp"]
        if b.get("mengen"):
            t["mengen"] = b["mengen"]
        if b.get("einheit"):
            t["einheit"] = b["einheit"]
        treffer[pid] = t
    belegt = {}
    for b in X["bloecke"]:   # Zeilen in Positionsblöcken (auch ohne Zuordnung) sind keine „freien“ Zeilen
        for sn, bx in (b.get("boxen") or {}).items():
            belegt.setdefault(sn, []).append(bx)
    kopf, text1, rzeilen, zahlen, summen = {}, "", [], {}, []
    ocr = any(o for *_, o in S)
    for n, W_, H_, ws, _ in S:
        Z = [z["w"] for z in AL.zeilen(ws)]
        if n <= 2:
            text1 += "\n".join(" ".join(w["text"] for w in z) for z in Z) + "\n"
        zl = zahlen.setdefault(n, [])
        for w in ws:   # alle Zahlen mit Stelle – in der Ansicht anklickbar (in den Rechenweg übernehmen)
            v = _zahl(w["text"])
            if v is not None and len(zl) < 1500:
                zl.append([round(float(w["x0"]) / W_, 4), round(float(w["top"]) / H_, 4), round(float(w["x1"]) / W_, 4), round(float(w["bottom"]) / H_, 4), v])
        box_von = lambda ws_: [round(v, 4) for v in (min(float(w["x0"]) for w in ws_) / W_, min(float(w["top"]) for w in ws_) / H_,   # noqa: E731
                                                     max(float(w["x1"]) for w in ws_) / W_, max(float(w["bottom"]) for w in ws_) / H_)]
        for z in Z:   # Summenzeilen: Netto, Umsatzsteuer, Brutto/Endsumme – mit Stelle des Betrags
            tx = " ".join(w["text"] for w in z).lower()
            geld = [w for w in z if _zahl(w["text"]) is not None and "," in w["text"]]
            if not geld or len(tx) > 90:
                continue
            art = ("mwst" if re.search(r"mwst|mehrwertsteuer|umsatzsteuer|\bust\b", tx) else
                   "netto" if re.search(r"netto", tx) else
                   "brutto" if re.search(r"endsumme|brutto|gesamtbetrag|zahlbetrag|rechnungsbetrag|zu zahlen|gesamtsumme", tx) else
                   "netto" if re.search(r"\bsumme\b|zwischensumme", tx) else None)
            if art and not any(x_["art"] == art for x_ in summen):
                w = geld[-1]
                summen.append({"art": art, "wert": _zahl(w["text"]), "seite": n, "box": box_von([w])})
        for z in Z:   # Zeilen ohne LV-Position, in denen Menge × Preis = Betrag aufgeht (Regie, Material …)
            y0, y1 = min(float(w["top"]) for w in z) / H_, max(float(w["bottom"]) for w in z) / H_
            if any(bx[1] - 0.003 <= y0 and y1 <= bx[3] + 0.003 for bx in belegt.get(n, [])):
                continue
            nums = [(i, w, _zahl(w["text"])) for i, w in enumerate(z)]
            nums = [(i, w, v) for i, w, v in nums if v is not None]
            best = _tripel([(w, v) for _, w, v in nums])
            if not best or nums[best[2]][2] == 0:
                continue
            ia, ib = nums[best[0]][0], nums[best[1]][0]
            mitte = [w["text"] for w in z[ia + 1:ib] if _zahl(w["text"]) is None and w["text"].strip() not in ("€", "EUR", "x", "×")]
            vorn = [w["text"] for w in z[:ia] if _zahl(w["text"]) is None]
            eh = mitte[0] if mitte and AL.RX_EH.match(mitte[0]) else ""
            txt = " ".join(vorn + (mitte[1:] if eh else mitte)).strip()
            if not txt or re.match(r"^(summe|netto|brutto|mwst|ust|zwischensumme|übertrag)", txt, re.I):
                continue
            rzeilen.append({"seite": n, "box": box_von(z), "text": txt[:300], "einheit": eh, "menge": nums[best[0]][2], "ep": nums[best[1]][2], "gp": nums[best[2]][2]})
    if re.search(r"schlussrechnung", text1, re.I):
        kopf["schluss"] = True
    if not treffer and rzeilen and re.search(r"regie|stundenlohn|stundenzettel", text1, re.I):
        kopf["regie"] = True
    m = re.search(r"Rechnung(?:s)?[ \-]?(?:nummer|nr\.?|no\.?)\s*[:.#]?\s*([A-Z0-9][\w\-/]{1,30}(?: [\w\-/]*\d[\w\-/]*)?)", text1, re.I)
    if m:
        kopf["re_nr"] = m.group(1).strip()
    m = re.search(r"(?:Rechnungsdatum|Datum|\bvom)\s*[:.]?\s*(\d{1,2})\.(\d{1,2})\.(\d{2,4})", text1)
    if m:
        y = int(m.group(3)); y = y + 2000 if y < 100 else y
        kopf["datum"] = f"{y:04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    gp = [t["gp"] for t in treffer.values() if t.get("gp") is not None] or [z["gp"] for z in rzeilen]
    gedruckt = next((x_["wert"] for x_ in summen if x_["art"] == "netto"), None)
    if gp:   # Summe der Positionen; steht eine passende Nettosumme in der Rechnung, gilt die (Rundung)
        kopf["netto"] = gedruckt if gedruckt and abs(gedruckt - sum(gp)) <= max(1.0, abs(sum(gp)) * 0.02) else round(sum(gp), 2)
    else:
        m = re.search(r"(?:Summe\s+netto|Nettobetrag|Netto(?:summe|betrag)?|Gesamt\s+netto|Zwischensumme)\s*(?:EUR|€)?\s*:?\s*(-?[\d.]+,\d{2})", text1, re.I)
        if m and _zahl(m.group(1)) is not None:
            kopf["netto"] = _zahl(m.group(1))
    kopf["summen"] = summen
    return {"pos": treffer, "kopf": kopf, "text": bool(text1.strip()), "ocr": ocr, "zeilen": rzeilen[:300],
            "zahlen": {str(k): v for k, v in zahlen.items() if v}, "spalten": sorted(X["kopf"] or {})}


def _tripel(nums):
    """Erste Dreiergruppe a, b, c (in dieser Reihenfolge) mit a × b = c – Menge, Einheitspreis, Betrag."""
    for c_ in range(len(nums)):
        for b_ in range(c_):
            for a_ in range(b_):
                a, b, cc = nums[a_][1], nums[b_][1], nums[c_][1]
                if cc and a and b and abs(a * b - cc) <= max(0.05, abs(cc) * 0.002):
                    return (a_, b_, c_)
    return None


def _ocr_woerter(pg, dpi=300, timeout=90):
    import ava_lesen as AL
    return AL.ocr_woerter(pg, dpi, timeout)


def _auslese_anwenden(c, bid, rid, lv, A=None):
    """PDF lesen (oder fertiges Ergebnis A), am Beleg merken und leere Felder der Rechnung (Nr., Datum, gefordert) füllen."""
    x = c.execute("SELECT data, name FROM ava_beleg WHERE id=?", (bid,)).fetchone()
    if A is None:
        try:
            A = _auslesen(bytes(x["data"]), (_j(lv["data"], {}) or {}).get("items") or [])
        except Exception as e:
            A = {"pos": {}, "kopf": {}, "text": False, "fehler": str(e)[:200]}
    c.execute("UPDATE ava_beleg SET auslese=? WHERE id=?", (json.dumps(A), bid))
    R = c.execute("SELECT * FROM ava_rechnung WHERE id=?", (rid,)).fetchone()
    K = A["kopf"]
    if R and R["status"] != "geprueft":
        if K.get("re_nr") and not R["re_nr"]:
            c.execute("UPDATE ava_rechnung SET re_nr=? WHERE id=?", (_s(K["re_nr"], 60), rid))
        if K.get("datum") and not R["datum"]:
            c.execute("UPDATE ava_rechnung SET datum=? WHERE id=?", (K["datum"], rid))
        if K.get("netto") and not R["gefordert"]:
            c.execute("UPDATE ava_rechnung SET gefordert=? WHERE id=?", (K["netto"], rid))
        rd = _j(R["data"], {}) or {}
        if K.get("netto") and rd.get("frei") == 0:   # Rechnung ohne Aufmaß: gefundenen Nettobetrag als Vorschlag eintragen
            rd["frei"] = K["netto"]
            c.execute("UPDATE ava_rechnung SET data=? WHERE id=?", (json.dumps(rd, ensure_ascii=False), rid))
        regie = (K.get("regie") or (re.search(r"regie|stundenlohn", x["name"] or "", re.I) and A.get("zeilen") and not A.get("pos")))
        if regie and R["art"] == "abschlag" and not rd.get("frei"):   # Regierechnung erkannt: Art umstellen
            c.execute("UPDATE ava_rechnung SET art='regie' WHERE id=?", (rid,))
            R = c.execute("SELECT * FROM ava_rechnung WHERE id=?", (rid,)).fetchone()
        if R["art"] == "regie" and A.get("zeilen") and not rd.get("zeilen"):   # Stundenlohn-/Materialzeilen eintragen
            rd["zeilen"] = [{"text": z["text"], "menge": z["menge"], "einheit": z.get("einheit") or "", "ep": z["ep"]} for z in A["zeilen"][:200]]
            c.execute("UPDATE ava_rechnung SET data=? WHERE id=?", (json.dumps(rd, ensure_ascii=False), rid))
        if K.get("schluss") and R["art"] == "abschlag" and not c.execute("SELECT 1 FROM ava_rechnung WHERE lv_id=? AND art='schluss'", (R["lv_id"],)).fetchone():
            c.execute("UPDATE ava_rechnung SET art='schluss' WHERE id=?", (rid,))
    return A


def _pdf_text(data, seiten=10, ocr_seiten=2, ocr_budget=35):
    """Text einer PDF (bei Scans per Texterkennung) – zeilenweise, für die Erkennung von Art, Firma und Projekt.
    Für das Erkennen reicht der Anfang: höchstens ocr_seiten Seiten per Texterkennung, zusammen höchstens ocr_budget
    Sekunden (sonst bricht der Webserver nach 60 s mit einer Fehlerseite ab)."""
    import time
    import pdfplumber
    out, ocr, t0 = [], False, time.time()
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for n, pg in enumerate(pdf.pages[:seiten], 1):
            ws = pg.extract_words(keep_blank_chars=False, use_text_flow=False)
            rest = ocr_budget - (time.time() - t0)
            if not ws and n <= ocr_seiten and rest > 5:
                ws = _ocr_woerter(pg, dpi=200, timeout=max(5, int(rest)))
                ocr = ocr or bool(ws)
            ws.sort(key=lambda w: (round(float(w["top"]) / 4), float(w["x0"])))
            zeile, y = [], None
            for w in ws:
                if y is not None and abs(float(w["top"]) - y) > 4:
                    out.append(" ".join(zeile)); zeile = []
                y = float(w["top"]); zeile.append(w["text"])
            if zeile:
                out.append(" ".join(zeile))
    return "\n".join(out), ocr


_DOKARTEN = {
    "rechnung": r"(abschlags|schluss|teil|regie|stundenlohn|nachtrags)?rechnung\b|rechnungs(nummer|nr|datum|betrag)|zahlbar (bis|sofort|innerhalb)",
    "angebot": r"\b(nachtrags)?angebot\b|angebots(nummer|nr|datum|summe)|bindefrist|gültig bis|wir bieten",
    "aufmass": r"aufma(ß|ss)|mengenermittlung|massenermittlung|abrechnungszeichnung",
    "lv": r"leistungsverzeichnis|leistungsbeschreibung|angebotsaufforderung|ausschreibung",
}


@app.post("/api/ava/erkennen")
def ava_erkennen():
    """Eine beliebige Datei für die AVA: Art (Angebot, LV, Aufmaß, Rechnung), Firma, Projekt und passendes LV erkennen –
    die Seite fragt dann nach und legt sie an der richtigen Stelle ab."""
    f = request.files.get("datei")
    if not f:
        return jsonify(error="Keine Datei"), 400
    data, name = f.read(80 * 1024 * 1024 + 1), (f.filename or "")
    if len(data) > 80 * 1024 * 1024:
        return jsonify(error="Datei zu groß (höchstens 80 MB)."), 400
    nl, out = name.lower(), {"name": name}
    text, items_d = "", []
    if re.search(r"\.(x|d|p)8[1-6]$|\.x3[1-2]$", nl) or data[:400].lstrip().startswith(b"<?xml") and b"GAEB" in data[:4000]:
        try:
            G = gaeb.lesen(data)
        except ValueError as e:
            return jsonify(error=str(e)), 400
        dp = int(G.get("dp") or 0)
        out.update(format="gaeb", dp=dp, dok={84: "angebot", 85: "angebot", 31: "aufmass"}.get(dp, "lv"), sicher=True,
                   firma=G.get("bieter") or "", lv_name=G.get("lv_name") or "", n_pos=sum(1 for x in G["items"] if x["typ"] == "pos"))
        text = " ".join(filter(None, [G.get("projekt") or "", G.get("lv_name") or "", G.get("bieter") or ""]))
        items_d = G["items"]
    elif nl.endswith((".xlsx", ".xlsm")):
        try:
            G = _excel_lesen(data)
        except ValueError as e:
            return jsonify(error=str(e)), 400
        mit = sum(1 for x in G["items"] if x["typ"] == "pos" and x.get("ep") is not None)
        out.update(format="excel", dok="angebot" if mit else "lv", sicher=False, firma="", lv_name=G.get("lv_name") or "",
                   n_pos=sum(1 for x in G["items"] if x["typ"] == "pos"))
        items_d = G["items"]
        text = name
    else:
        try:
            data, _ = _als_pdf(data, name)
        except ValueError as e:
            return jsonify(error=str(e)), 400
        out["umgewandelt"] = not nl.endswith(".pdf")
        try:
            text, ocr = _pdf_text(data)
        except Exception as e:
            return jsonify(error=f"PDF lässt sich nicht lesen: {e}"), 400
        kopf = "\n".join(text.splitlines()[:40]).lower()
        punkte = {k: len(re.findall(rx, kopf, re.I)) * 3 + len(re.findall(rx, text.lower() + " " + nl, re.I)) for k, rx in _DOKARTEN.items()}
        if re.search(r"rechnung", nl):
            punkte["rechnung"] += 5
        if re.search(r"angebot", nl):
            punkte["angebot"] += 5
        if re.search(r"aufma", nl):
            punkte["aufmass"] += 5
        best = sorted(punkte.items(), key=lambda kv: -kv[1])
        out.update(format="pdf", ocr=ocr, dok=best[0][0] if best[0][1] else "", sicher=bool(best[0][1] and best[0][1] >= 2 * max(1, best[1][1])),
                   punkte=punkte, nachtrag=bool(re.search(r"nachtrag", kopf)), regie=bool(re.search(r"regie|stundenlohn", kopf + nl)),
                   schluss=bool(re.search(r"schlussrechnung", kopf)), text=bool(text.strip()))
        if not text.strip():
            out["hinweis"] = "Kein lesbarer Text – bitte Art, Projekt und LV wählen."
    tl = text.lower()
    with db.tx() as c:
        # Firma: bekannte Adresse, deren Name im Text steht (die längste gewinnt); sonst die erste Zeile (Briefkopf)
        if not out.get("firma"):
            best = None
            for k in c.execute("SELECT id, name FROM contacts WHERE coalesce(trade,'') NOT IN ('Bauherr','Baustelle') AND length(name) >= 4").fetchall():
                kn = k["name"].lower()
                if kn in tl and (not best or len(kn) > len(best["name"])):
                    best = k
            if best:
                out.update(firma=best["name"], contact_id=best["id"])
            elif out.get("format") == "pdf":
                erste = next((z.strip() for z in text.splitlines() if len(z.strip()) > 3 and not re.match(r"^(rechnung|angebot|seite)\b", z.strip(), re.I)), "")
                out["firma"] = re.split(r"\s[·|–-]\s", erste)[0][:120]
        # Projekt: Projektnummer (z. B. A497), Straße oder Name im Text
        P = []
        for p in c.execute("SELECT id, name, street, city, leaders, archived FROM projects").fetchall():
            lead = _j(p["leaders"], []) or []
            if not (g.user["is_admin"] or not lead or g.user["id"] in lead):
                continue
            sc = 0
            m = re.match(r"^\s*([A-Z]\d{3,4})\b", p["name"] or "")
            if m and re.search(r"\b" + re.escape(m.group(1).lower()) + r"\b", tl):
                sc += 10
            for w in re.findall(r"[a-zäöüß]{5,}", ((p["street"] or "") + " " + (p["name"] or "")).lower()):
                if w not in ("straße", "strasse", "essen", "projekt") and w in tl:
                    sc += 3
            if p["city"] and p["city"].lower() in tl:
                sc += 1
            if sc:
                P.append({"id": p["id"], "name": p["name"], "punkte": sc - (2 if p["archived"] else 0)})
        P.sort(key=lambda x: -x["punkte"])
        out["projekte"] = P[:5]
        if not P:   # Vorschlag für ein neues Projekt: Zeile mit „Bauvorhaben / BV / Projekt“
            m = re.search(r"(?:bauvorhaben|\bbv\b|projekt|baustelle|objekt)\s*[:.]?\s*(.{6,80})", text, re.I)
            out["projekt_vorschlag"] = m.group(1).strip(" :,-") if m else ""
        # LVs der Kandidaten: wie viele OZ der Datei passen, Firma = Auftragnehmer/Bieter, Gewerk im Text
        toks = set(re.findall(r"\b\d+(?:[.\-/]\d+)+\b|\b\d{3,}\b", text))
        oz_d = {_ozn(x.get("oz")) for x in items_d if x.get("typ") == "pos" and x.get("oz")}
        tn = {_ozn(t) for t in toks} | oz_d
        fl = (out.get("firma") or "").lower()
        lvs = []
        for pr in (P[:3] or ([{"id": request.form.get("project_id", type=int)}] if request.form.get("project_id") else [])):
            for r in c.execute("SELECT * FROM ava_lv WHERE project_id=? AND " + AKTIV + " AND archived=0 ORDER BY nr, id", (pr["id"],)).fetchall():
                I = [x for x in (_j(r["data"], {}) or {}).get("items") or [] if x.get("typ") == "pos" and x.get("oz")]
                tr = sum(1 for x in I if _ozn(x["oz"]) in tn or any(len(t) > len(_ozn(x["oz"])) and t[-len(_ozn(x["oz"])):] == _ozn(x["oz"]) for t in tn if len(_ozn(x["oz"])) >= 2))
                V = _j(r["vergabe"], {}) or {}
                bieter = [a["bieter"] for a in c.execute("SELECT bieter FROM ava_angebot WHERE lv_id=?", (r["id"],)).fetchall()]
                firma_ok = bool(fl) and any(b_ and (b_.lower() in fl or fl in b_.lower()) for b_ in [V.get("bieter") or ""] + bieter)
                gw = bool(r["gewerk"]) and r["gewerk"].lower() in tl or bool(r["name"]) and r["name"].lower() in tl
                sc = tr + (20 if firma_ok else 0) + (5 if gw else 0)
                lvs.append({"id": r["id"], "project_id": r["project_id"], "nr": r["nr"], "name": r["name"], "treffer": tr, "firma": firma_ok,
                            "vergeben": bool(V.get("preise") or V.get("frei")), "bieter": V.get("bieter") or "", "punkte": sc})
        lvs.sort(key=lambda x: -x["punkte"])
        out["lvs"] = lvs[:12]
    return jsonify(out)


def _ki_zuordnen(c, A, items, ki=None):
    """Zeilen ohne erkannte Ordnungszahl (Scan, eigene Texte der Firma) per KI den LV-Positionen zuordnen – lokal mit Ollama oder
    mit der oben gewählten KI. Sichere Treffer (≥ 80 %) werden übernommen, unsichere als Vorschlag zum Bestätigen."""
    Z = A.get("zeilen") or []
    offen = [(k, z) for k, z in enumerate(Z) if not z.get("pos")]
    P = [x for x in items if x.get("typ") == "pos" and x.get("art") != "T" and x["id"] not in (A.get("pos") or {})]
    if not offen or not P:
        return 0, 0
    ki = ki or ai.choice_of(g.user, c)
    if ki == "intern":
        raise ai.AIError("Für den Abgleich eine KI wählen (⚙ → Für mich → KI) – am besten Ollama, bleibt im Büro.")
    sys_ = ("Du ordnest Zeilen aus einer Rechnung oder einem Angebot einer Baufirma den Positionen eines Leistungsverzeichnisses (LV) zu. "
            "Die Zeilen können aus einer Texterkennung stammen und Lesefehler enthalten (z. B. „mm?“ statt „mm²“, O statt 0). "
            "Vergleiche Bedeutung, Material, Maße und Einheit – nicht nur Wörter. Jede LV-Position höchstens einmal. "
            "Antworte nur mit JSON: {\"zuordnung\": [{\"z\": Zeilennummer, \"pos\": \"LV-ID oder null\", \"p\": Wahrscheinlichkeit 0 bis 1, \"grund\": \"kurz\"}]}")
    lv = "\n".join(f"{x['id']} | {x.get('oz') or ''} | {(x.get('kurz') or '')[:90]} | {x.get('einheit') or ''}" for x in P[:400])
    zl = "\n".join(f"{k} | {z['text'][:120]} | {z.get('menge')} {z.get('einheit') or ''} | EP {z.get('ep')}" for k, z in offen[:60])
    d = ai.ask_json(ki, sys_, f"LV-Positionen (ID | OZ | Kurztext | Einheit):\n{lv}\n\nZeilen der Firma (Nr | Text | Menge | Einheitspreis):\n{zl}", 2500, c) or {}
    ids, sicher, vorschlag, belegt = {x["id"] for x in P}, 0, 0, set()
    for r in sorted(d.get("zuordnung") or [], key=lambda r: -_f(r.get("p"), 0) if isinstance(r, dict) else 0):
        if not isinstance(r, dict):
            continue
        k, pid, p_ = r.get("z"), r.get("pos"), max(0.0, min(1.0, _f(r.get("p"), 0)))
        if not isinstance(k, int) or not (0 <= k < len(Z)) or pid not in ids or pid in belegt or Z[k].get("pos"):
            continue
        z = Z[k]
        if p_ >= 0.8:
            A.setdefault("pos", {})[pid] = {"seite": z["seite"], "box": z["box"], "menge": z.get("menge"), "ep": z.get("ep"), "gp": z.get("gp"), "ki": round(p_, 2)}
            z["pos"], z["p"] = pid, round(p_, 2)
            belegt.add(pid); sicher += 1
        elif p_ >= 0.35:
            z["vorschlag"] = {"pos": pid, "p": round(p_, 2), "grund": _s(r.get("grund"), 120)}
            vorschlag += 1
    A["ki"] = {"anbieter": ki, "sicher": sicher, "vorschlag": vorschlag}
    return sicher, vorschlag


@app.post("/api/belege/<int:b>/ki")
def beleg_ki(b):
    """KI-Abgleich für die Zeilen einer Rechnung/eines Aufmaßes ohne erkannte LV-Position; {z, pos} bestätigt bzw. verwirft (pos null) einen Vorschlag."""
    body = request.get_json(silent=True) or {}
    with db.tx() as c:
        _beleg_tabelle(c)
        x = c.execute("SELECT b.id, b.auslese, r.lv_id FROM ava_beleg b JOIN ava_rechnung r ON r.id = b.rechnung_id WHERE b.id=?", (b,)).fetchone()
        lv = _lv(c, x["lv_id"]) if x else None
        if not lv:
            return jsonify(error="Nicht gefunden"), 404
        A = _j(x["auslese"], {}) or {}
    hinweis = ""
    if "z" in body:   # Vorschlag bestätigen oder verwerfen
        Z = A.get("zeilen") or []
        k = body.get("z")
        if not isinstance(k, int) or not (0 <= k < len(Z)):
            return jsonify(error="Zeile nicht gefunden"), 400
        z = Z[k]
        pid = body.get("pos")
        if pid:
            A.setdefault("pos", {})[pid] = {"seite": z["seite"], "box": z["box"], "menge": z.get("menge"), "ep": z.get("ep"), "gp": z.get("gp"), "ki": 1.0}
            z["pos"], z["p"] = pid, 1.0
        z.pop("vorschlag", None)
    else:
        items = (_j(lv["data"], {}) or {}).get("items") or []
        try:
            with db.tx() as c:
                s_, v_ = _ki_zuordnen(c, A, items)
        except ai.AIError as e:
            return jsonify(error=str(e)), 400
        hinweis = f"KI: {s_} Zeilen sicher zugeordnet" + (f", {v_} Vorschläge zum Bestätigen (orange)" if v_ else "") + "."
    with db.tx() as c:
        c.execute("UPDATE ava_beleg SET auslese=? WHERE id=?", (json.dumps(A, ensure_ascii=False), b))
        _touch(c, x["lv_id"])
        out = _antwort(c, x["lv_id"])
    if hinweis:
        d = out.get_json(); d["hinweis"] = hinweis
        return jsonify(d)
    return out


@app.post("/api/belege/<int:b>/auslesen")
def beleg_auslesen(b):
    with db.tx() as c:
        _beleg_tabelle(c)
        x = c.execute("SELECT b.id, b.rechnung_id, r.lv_id FROM ava_beleg b JOIN ava_rechnung r ON r.id = b.rechnung_id WHERE b.id=?", (b,)).fetchone()
        lv = _lv(c, x["lv_id"]) if x else None
        if not lv:
            return jsonify(error="Nicht gefunden"), 404
        roh = bytes(c.execute("SELECT data FROM ava_beleg WHERE id=?", (b,)).fetchone()["data"])
        if _ist_scan(roh):   # Scan: Texterkennung (noch einmal) im Hintergrund – die Seite fragt nach
            import threading
            c.execute("UPDATE ava_beleg SET auslese=? WHERE id=?", (json.dumps({"zeilen": {}, "vorschlag": [], "ocr": True, "laeuft": True}), b))
            lv_id, rid, items = x["lv_id"], x["rechnung_id"], (_j(lv["data"], {}) or {}).get("items") or []

            def lesen():
                try:
                    A = _auslesen(roh, items)
                except Exception as e:
                    fehler.still("ava", "Rechnung (Scan) neu auslesen", e)
                    A = {"pos": {}, "kopf": {}, "text": False, "ocr": True, "fehler": str(e)[:200]}
                with db.tx() as c2:
                    _auslese_anwenden(c2, b, rid, _lv(c2, lv_id), A)
                    _touch(c2, lv_id)
            threading.Thread(target=_mit_user(lesen), daemon=True).start()
        else:
            _auslese_anwenden(c, b, x["rechnung_id"], lv)
        _touch(c, x["lv_id"])
        return _antwort(c, x["lv_id"])


@app.post("/api/rechnungen/<int:k>/beleg")
def beleg_neu(k):
    """Rechnung der Firma als PDF: in der Plattform speichern und im Projektordner ablegen (… Rechnungsprüfung / … <Firma>)."""
    import base64
    f = request.files.get("datei")
    if not f:
        return jsonify(error="Keine Datei."), 400
    roh = f.read(60 * 1024 * 1024 + 1)
    if len(roh) > 60 * 1024 * 1024:
        return jsonify(error="Die Datei ist zu groß (höchstens 60 MB)."), 400
    if not roh.startswith(b"%PDF") and not re.search(r"\.(jpe?g|png|tiff?|webp|bmp|gif|heic|docx?)$", (f.filename or "").lower()):
        return jsonify(error="Bitte die Rechnung als PDF, Scan oder Foto wählen."), 400
    try:
        roh, fname = _als_pdf(roh, f.filename or "")   # auch Foto/Scan der Rechnung, Word
    except ValueError as e:
        return jsonify(error=str(e)), 400
    scan = _ist_scan(roh)
    with db.tx() as c:
        x = c.execute("SELECT * FROM ava_rechnung WHERE id=?", (k,)).fetchone()
        r = _lv(c, x["lv_id"]) if x else None
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        V = _j(r["vergabe"], {}) or {}
        _beleg_tabelle(c)
        bid = c.execute("INSERT INTO ava_beleg(rechnung_id, name, data, created, user_name) VALUES(?,?,?,?,?) RETURNING id",
                        (k, _s(fname, 200) or "Rechnung.pdf", roh, _now(), g.user["name"])).fetchone()["id"]
        if scan:   # Texterkennung dauert – im Hintergrund, die Seite fragt nach
            c.execute("UPDATE ava_beleg SET auslese=? WHERE id=?", (json.dumps({"pos": {}, "kopf": {}, "laeuft": True, "ocr": True}), bid))
        else:
            _auslese_anwenden(c, bid, k, r)
        x = c.execute("SELECT * FROM ava_rechnung WHERE id=?", (k,)).fetchone()
        pid = r["project_id"]
        name = " ".join(v for v in (re_titel(x["nr"], x["art"]), V.get("bieter") or "", ("Nr. " + x["re_nr"]) if x["re_nr"] else "", x["datum"] or x["eingang"] or "") if v) + ".pdf"
    hinweis, pfad = "", ""
    if pid:
        try:
            ordner = None
            try:
                ordner = json.loads(request.form.get("ordner") or "null")
            except ValueError:
                pass
            if ordner == "nein":   # bewusst nicht im Projektordner ablegen
                raise StopIteration
            a = C.bt_api("POST", "/api/ablage/datei", {"project_id": pid, "firma": V.get("bieter") or "", "name": name, "datei": base64.b64encode(roh).decode(),
                                                      "art": "aufmass" if request.form.get("art") == "aufmass" else "rechnung", "gewerk": r["gewerk"] or r["name"] or "",
                                                      "ordner": ordner if isinstance(ordner, list) else None})
            pfad = (a or {}).get("pfad") or ""
        except StopIteration:
            pass
        except Exception as e:   # Grund geht als Hinweis an den Benutzer
            hinweis = f"In der Plattform gespeichert, aber nicht im Projektordner: {e}"
    if scan:
        import threading
        lv_id, items = x["lv_id"], (_j(r["data"], {}) or {}).get("items") or []

        def lesen():
            try:
                A = _auslesen(roh, items)
            except Exception as e:
                fehler.still("ava", "Rechnung (Scan) auslesen", e)
                A = {"pos": {}, "kopf": {}, "text": False, "ocr": True, "fehler": str(e)[:200]}
            with db.tx() as c2:
                _auslese_anwenden(c2, bid, k, _lv(c2, lv_id), A)
                _touch(c2, lv_id)
        threading.Thread(target=_mit_user(lesen), daemon=True).start()
    with db.tx() as c:
        c.execute("UPDATE ava_beleg SET ablage=? WHERE id=?", (pfad, bid))
        _touch(c, x["lv_id"])
        out = _antwort(c, x["lv_id"])
    if hinweis or pfad:
        d = out.get_json()
        d["hinweis"] = hinweis or f"Abgelegt im Projektordner: {pfad}"
        return jsonify(d)
    return out


@app.route("/api/belege/<int:b>", methods=["GET", "DELETE"])
def beleg(b):
    with db.tx() as c:
        _beleg_tabelle(c)
        x = c.execute("SELECT b.*, r.lv_id FROM ava_beleg b JOIN ava_rechnung r ON r.id = b.rechnung_id WHERE b.id=?", (b,)).fetchone()
        if not x or not _lv(c, x["lv_id"]):
            return jsonify(error="Nicht gefunden"), 404
        if request.method == "DELETE":
            c.execute("DELETE FROM ava_beleg WHERE id=?", (b,))
            _touch(c, x["lv_id"])
            return _antwort(c, x["lv_id"])
    return Response(bytes(x["data"]), mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{urllib_quote(x['name'])}"})


def _beleg_markiert(c, data):
    """Rechnung der Firma mit meinen Prüfzeichen (Haken/Kreuze, Notizen aus „prüfen“), sonst unverändert."""
    from bpcore import skizze
    h = hashlib.sha256(data).hexdigest()
    sk = c.execute("""SELECT s.id FROM skizze s WHERE s.hash=? AND EXISTS (SELECT 1 FROM skizze_strich x WHERE x.skizze_id=s.id AND x.geloescht=0)
                      ORDER BY s.updated DESC LIMIT 1""", (h,)).fetchone()
    if not sk:
        return data
    try:
        return skizze.pdf_mit_markierungen(c, sk["id"])[1]
    except Exception as e:
        fehler.still("ava", "Rechnung mit Prüfzeichen erzeugen", e)
        return data


_GELD = re.compile(r"^-?\d{1,3}(?:\.\d{3})*,\d{2}$|^-?\d+,\d{2}$")


@app.post("/api/belege/<int:b>/pruefen")
def beleg_pruefen(b):
    """Rechnung der Firma zum Abhaken öffnen: Markier-Sitzung zur PDF (bleibt am Beleg). Beim ersten Mal setzt die Plattform
    selbst Zeichen: geforderte Summe ✔ (stimmt mit dem geprüften Leistungsstand) bzw. ✘ mit dem geprüften Betrag daneben,
    Rechnungsbetrag ✔/✘ gegen den geprüften Zahlbetrag brutto. Danach von Hand ergänzen, streichen, wieder löschen."""
    from bpcore import skizze
    with db.tx() as c:
        _beleg_tabelle(c)
        x = c.execute("SELECT b.*, r.lv_id, r.gefordert, r.id AS rid FROM ava_beleg b JOIN ava_rechnung r ON r.id = b.rechnung_id WHERE b.id=?", (b,)).fetchone()
        lv = _lv(c, x["lv_id"]) if x else None
        if not lv:
            return jsonify(error="Nicht gefunden"), 404
        data = bytes(x["data"])
        h = hashlib.sha256(data).hexdigest()
        alt = c.execute("SELECT id FROM skizze WHERE hash=? ORDER BY updated DESC LIMIT 1", (h,)).fetchone()
        if alt:
            if not skizze.darf(c, alt["id"], g.user):
                skizze.beitreten(c, alt["id"], g.user)
            return jsonify(skizze=alt["id"], name=x["name"])
        sid = skizze.neu(c, g.user, x["name"], data)
        skizze.dauerhaft_setzen(c, sid, True)   # bleibt am Beleg – auch beim normalen Ansehen sichtbar
        ang = c.execute("SELECT * FROM ava_angebot WHERE lv_id=? ORDER BY id", (lv["id"],)).fetchall()
        am = c.execute("SELECT * FROM ava_aufmass WHERE lv_id=? ORDER BY pos_id, datum, id", (lv["id"],)).fetchall()
        re_ = c.execute("SELECT * FROM ava_rechnung WHERE lv_id=? ORDER BY nr", (lv["id"],)).fetchall()
        K = rechne(lv, ang, am, re_)
        RC = next((y for y in K["rechnungen"] if y["id"] == x["rid"]), None)
        gef = x["gefordert"] or 0
        A = _j(x["auslese"], None) if "auslese" in x.keys() else None
        if not A or "zahlen" not in A:
            A = _auslese_anwenden(c, b, x["rid"], lv)
        R0 = c.execute("SELECT * FROM ava_rechnung WHERE id=?", (x["rid"],)).fetchone()
        VP = (_j(lv["vergabe"], {}) or {}).get("preise") or {}
    zeichen = _pruefzeichen(A, K, RC, R0, VP)
    if zeichen:
        with db.tx() as c:
            for n, art, pos, txt in zeichen:
                skizze.strich(c, sid, g.user, {"seite": n, "art": art, "farbe": "#1f9d4c" if art == "haken" else "#e02424", "breite": 0.004, "pts": [pos]})
                if txt:
                    skizze.strich(c, sid, g.user, {"seite": n, "art": "text", "farbe": "#e02424", "breite": 0.0035, "pts": [[max(0.03, pos[0] - 0.32), min(0.99, pos[1] + 0.024)]], "text": txt})
        return jsonify(skizze=sid, name=x["name"], automatisch=len(zeichen))
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            seiten = pdf.pages[:30]
            for n, pg in enumerate(seiten, 1):
                W_, H_ = float(pg.width), float(pg.height)
                for w in pg.extract_words(keep_blank_chars=False):
                    t = w["text"].strip().rstrip("€").strip()
                    if not _GELD.match(t):
                        continue
                    v = float(t.replace(".", "").replace(",", "."))
                    pos = [min(1.0, (float(w["x1"]) + 8) / W_), (float(w["top"]) + float(w["bottom"])) / 2 / H_]
                    if RC and gef and abs(v - gef) < 0.01:
                        ok = abs(gef - (RC["leistung"] - RC["nachlass"])) <= 1
                        zeichen.append((n, "haken" if ok else "kreuz", pos, None if ok else f"geprüft {_eur(RC['leistung'] - RC['nachlass'])}"))
                    zeichen.append((n, "_geld", pos, v))
        if RC and zeichen:   # Rechnungsbetrag: der unterste Betrag auf der letzten Seite mit Beträgen (Endbetrag)
            letzte = max(z[0] for z in zeichen if z[1] == "_geld")
            gross = max((z for z in zeichen if z[1] == "_geld" and z[0] == letzte), key=lambda z: z[2][1])
            if not (gef and abs(gross[3] - gef) < 0.01):
                ok = abs(gross[3] - RC["brutto"]) <= 1
                zeichen.append((gross[0], "haken" if ok else "kreuz", gross[2], None if ok else f"Zahlung lt. Prüfung {_eur(RC['brutto'])} brutto"))
    except Exception:   # Beträge nicht erkennbar (Scan, eigenes Layout): ohne automatische Prüfzeichen
        zeichen = []
    with db.tx() as c:
        for n, art, pos, txt in zeichen:
            if art == "_geld":
                continue
            skizze.strich(c, sid, g.user, {"seite": n, "art": art, "farbe": "#1f9d4c" if art == "haken" else "#e02424", "breite": 0.004, "pts": [pos]})
            if txt:
                skizze.strich(c, sid, g.user, {"seite": n, "art": "text", "farbe": "#e02424", "breite": 0.0035, "pts": [[max(0.03, pos[0] - 0.32), min(0.99, pos[1] + 0.024)]], "text": txt})
    return jsonify(skizze=sid, name=x["name"], automatisch=sum(1 for z in zeichen if z[1] != "_geld"))


def _pruefzeichen(A, K, RC, R, VP):
    """✔/✘ je erkannter Position (Menge lt. Firma = Aufmaß, EP = Auftrags-EP), je Regiezeile und je Summe (Netto, Brutto)."""
    if not A or not RC:
        return []
    out, am = [], K.get("aufmass") or {}
    rd = (_j(R["data"], {}) or {}) if R else {}
    stand = rd.get("stand") if R and R["status"] == "geprueft" and isinstance(rd.get("stand"), dict) else am
    num = lambda v: f"{v:,.3f}".rstrip("0").rstrip(",.").replace(",", "X").replace(".", ",").replace("X", ".")   # noqa: E731
    mitte = lambda t: [min(0.985, t["box"][2] + 0.012), (t["box"][1] + t["box"][3]) / 2]   # noqa: E731
    for pid, t in (A.get("pos") or {}).items():
        if t.get("menge") is None:
            continue
        m, ep = stand.get(pid, 0) or 0, _fn(VP.get(pid))
        ok_m, ok_ep = abs(t["menge"] - m) < 1e-6, ep is None or t.get("ep") is None or abs(t["ep"] - ep) < 0.005
        txt = None if ok_m and ok_ep else " · ".join(v for v in ((f"Menge {num(m)}" if not ok_m else ""), (f"EP {_eur(ep)}" if not ok_ep else "")) if v)
        out.append((t["seite"], "haken" if not txt else "kreuz", mitte(t), txt))
    if R and R["art"] == "regie":
        Z = rd.get("zeilen") or []
        for t in A.get("zeilen") or []:
            z = next((z for z in Z if (z.get("text") or "").strip().lower() == t["text"].strip().lower()), None)
            if not z:
                out.append((t["seite"], "kreuz", mitte(t), "nicht anerkannt"))
                continue
            ok = abs(_f(z.get("menge")) - t["menge"]) < 1e-6 and abs(_f(z.get("ep")) - t["ep"]) < 0.005
            out.append((t["seite"], "haken" if ok else "kreuz", mitte(t), None if ok else f"{num(_f(z.get('menge')))} × {_eur(_f(z.get('ep')))}"))
    netto_g = RC["leistung"] - RC["nachlass"]
    for su in (A.get("kopf") or {}).get("summen") or []:
        if su["art"] == "netto":
            ok, txt = abs(su["wert"] - netto_g) <= 1, f"geprüft {_eur(netto_g)}"
        elif su["art"] == "brutto":
            ok = abs(su["wert"] - RC["brutto"]) <= 1 or abs(su["wert"] - netto_g * (1 + MWST / 100)) <= 1
            txt = f"Zahlung lt. Prüfung {_eur(RC['brutto'])}"
        else:
            ok, txt = abs(su["wert"] - netto_g * MWST / 100) <= 1 or abs(su["wert"] - RC["mwst"]) <= 1, f"geprüft {_eur(RC['mwst'])}"
        out.append((su["seite"], "haken" if ok else "kreuz", mitte(su), None if ok else txt))
    return out


def _eur(v):
    return f"{v:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")


def urllib_quote(s):
    import urllib.parse
    return urllib.parse.quote(s or "Rechnung.pdf")


def _re_kette(x):
    """Kette, in der Rechnungen aufeinander aufbauen (kumuliert): Haupt (Abschlag/Schluss) bzw. Nachträge; Regie, frei geprüfte
    und Freigabe der Sicherheit stehen für sich."""
    d = _j(x["data"], {}) or {}
    if x["art"] in ("regie", "sicherheit") or d.get("frei") is not None:
        return None
    return "nachtrag" if x["art"] == "nachtrag" else "haupt"


def _re_nachfolger(c, x):
    k = _re_kette(x)
    if not k:
        return False
    return any(_re_kette(y) == k for y in c.execute("SELECT art, data FROM ava_rechnung WHERE lv_id=? AND nr>?", (x["lv_id"], x["nr"])).fetchall())


@app.route("/api/rechnungen/<int:k>", methods=["PUT", "DELETE"])
def rechnung(k):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        x = c.execute("SELECT * FROM ava_rechnung WHERE id=?", (k,)).fetchone()
        r = _lv(c, x["lv_id"]) if x else None
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        if request.method == "DELETE":
            if _re_nachfolger(c, x):
                return jsonify(error="Auf dieser Rechnung bauen spätere Abschlags-/Schlussrechnungen auf – erst die späteren löschen."), 400
            pr = c.execute("SELECT name FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
            pk = papierkorb.ablegen(c, "ava_rechnung", k, "Rechnung", f"{x['nr']}. Rechnung{' Nr. ' + x['re_nr'] if x['re_nr'] else ''} · LV {r['nr']} {r['name']}", g.user["name"], pr["name"] if pr else "", "ava")
            _touch(c, x["lv_id"])
            d_ = _antwort(c, x["lv_id"]).get_json(); d_["papierkorb"] = pk
            return jsonify(d_)
        d = _j(x["data"], {}) or {}
        status = x["status"]
        if b.get("status") == "offen" and status == "geprueft":   # Prüfung zurücknehmen (nur die letzte)
            if _re_nachfolger(c, x):
                return jsonify(error="Auf dieser Rechnung bauen spätere Rechnungen auf – erst deren Prüfung zurücknehmen."), 400
            status = "offen"; d.pop("stand", None); d.pop("geprueft_am", None); d.pop("geprueft_von", None)
        elif status == "geprueft" and any(k_ in b for k_ in ("abzuege", "einbehalt", "gefordert", "zeilen", "betrag", "frei", "abzug")):
            return jsonify(error="Die Rechnung ist geprüft – erst „Prüfung zurücknehmen“."), 400
        if isinstance(b.get("abzuege"), list):
            d["abzuege"] = [{"text": _s(z.get("text"), 200), "pct": _fn(z.get("pct")), "betrag": _fn(z.get("betrag"))} for z in b["abzuege"][:20] if isinstance(z, dict)]
        if "einbehalt" in b:
            d["einbehalt"] = _fn(b["einbehalt"])
        if isinstance(b.get("abzug"), dict):   # Abzüge dieser Rechnung an/aus (null = wie im Auftrag)
            A_ = {**(d.get("abzug") or {}), **{k: v for k, v in b["abzug"].items() if k in ABZUG_ARTEN}}
            d["abzug"] = {k: bool(v) for k, v in A_.items() if v is not None}
            if not d["abzug"]:
                d.pop("abzug")
        if isinstance(b.get("zeilen"), list):   # Regierechnung: Stundenlohnzettel / Zeilen
            d["zeilen"] = [{"text": _s(z.get("text"), 300), "menge": _fn(z.get("menge")), "einheit": _s(z.get("einheit"), 12) if "einheit" in z else "h", "ep": _fn(z.get("ep")),
                            **({"pos": _s(z.get("pos"), 40)} if z.get("pos") else {})}
                           for z in b["zeilen"][:200] if isinstance(z, dict)]
        if "frei" in b:   # Betrag ohne Aufmaß frei geprüft (None: zurück zur Prüfung über das Aufmaß)
            if b["frei"] is None or b["frei"] == "":
                d.pop("frei", None)
            else:
                d["frei"] = round(_f(b["frei"], 0), 2)
        for k_ in ("skonto", "skonto_tage"):   # Skonto dieser Rechnung (leer: wie im Auftrag)
            if k_ in b:
                if b[k_] in (None, ""):
                    d.pop(k_, None)
                else:
                    d[k_] = round(_f(b[k_], 0, 0, 100), 3) if k_ == "skonto" else int(_f(b[k_], 0, 0, 365))
        if "bezahlt" in b:   # Zahlung angewiesen/erfolgt am – danach keine Skonto-Erinnerung mehr
            if b["bezahlt"]:
                d["bezahlt"] = _s(b["bezahlt"], 10)
            else:
                d.pop("bezahlt", None)
        if "betrag" in b:   # Freigabe der Sicherheit
            d["betrag"] = round(_f(b["betrag"], 0, 0), 2)
        if b.get("status") == "geprueft" and status != "geprueft":   # Prüfung abschließen: Aufmaßstand festhalten
            am = {}
            for z in c.execute("SELECT pos_id, menge FROM ava_aufmass WHERE lv_id=?", (x["lv_id"],)):
                am[z["pos_id"]] = round(am.get(z["pos_id"], 0.0) + (z["menge"] or 0), 4)
            d["stand"] = am
            if d.get("einbehalt") is None and x["art"] != "sicherheit":   # Satz festhalten – spätere Änderungen an den Sicherheiten ändern geprüfte Rechnungen nicht
                S_ = sicherheit_conf(_j(r["vergabe"], {}) or {})
                d["einbehalt"] = S_["pct_schluss"] if x["art"] == "schluss" else S_["pct_abschlag"]
            d["abzug"] = abzug_wahl(_j(r["vergabe"], {}) or {}, d)   # Wahl festhalten – spätere Änderungen am Auftrag ändern geprüfte Rechnungen nicht
            d["geprueft_am"] = date.today().isoformat()
            d["geprueft_von"] = C.full_name(g.user)
            status = "geprueft"
        sets, args = ["data=?", "status=?"], [json.dumps(d, ensure_ascii=False), status]
        for k_, n in (("datum", 10), ("eingang", 10), ("re_nr", 60), ("notiz", 2000)):
            if k_ in b:
                sets.append(f"{k_}=?"); args.append(_s(b[k_], n))
        if "gefordert" in b:
            sets.append("gefordert=?"); args.append(round(_f(b["gefordert"], 0, 0), 2))
        if b.get("art") in RE_ARTEN:
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
        return jsonify(error="Für Textvorschläge eine KI wählen (⚙ → Für mich → KI), z. B. Ollama."), 400
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
def _druck_lw():
    """Beim Ausdruck eingegebene Werte eigener Felder (?lw=JSON)."""
    try:
        d = json.loads(request.args.get("lw") or "{}")
        return {str(k)[:40]: str(v)[:500] for k, v in d.items()} if isinstance(d, dict) else {}
    except (TypeError, ValueError):
        return {}


def _druck_werte(c, r, titel="", sub="", extra=None):
    """Variablen der AVA-Layouts für ein LV (Projekt, Büro, Auftragnehmer …) plus eigene Felder."""
    p = _sees(c, r["project_id"]) if r["project_id"] else None
    S = {x["key"]: x["value"] for x in c.execute("SELECT key, value FROM settings WHERE key='office_name' OR key LIKE 'co\\_%'").fetchall()}
    V = _j(r["vergabe"], {}) or {}
    adr = ", ".join(v for v in ((p["street"] or "") if p else "", " ".join(x for x in ((p["zip"] or "") if p else "", (p["city"] or "") if p else "") if x)) if v)
    kurz = S.get("co_short") or S.get("office_name") or ""
    W = {"buero": S.get("office_name") or kurz, "datum": date.today().strftime("%d.%m.%Y"), "bearbeiter": C.full_name(g.user) if getattr(g, "user", None) else "",
         "fusszeile": " · ".join(v for v in (kurz, S.get("co_street"), " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x), S.get("co_phone"), S.get("co_email"), S.get("co_web")) if v),
         "projekt": p["name"] if p else "", "bauvorhaben": ", ".join(v for v in ((p["name"] if p else ""), adr if adr and p and adr not in p["name"] else "") if v),
         "bauherr": (p["client"] or "") if p and "client" in p.keys() else "", "dokument": titel, "untertitel": sub,
         "lv": f"LV {r['nr']} {r['name']}".strip(), "gewerk": r["gewerk"] or "", "auftragnehmer": V.get("bieter") or ""}
    W.update(extra or {})
    W.update({k: v for k, v in layout.eigene_werte(c, r["project_id"], _druck_lw()).items() if v or k not in W})
    return W


def _pdf(r, titel, sub, story_fn, quer=False, bereich=None, werte=None):
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
        LAY = layout.aktiv(c, bereich) if bereich and not quer else None
        LW = _druck_werte(c, r, titel, sub, werte) if LAY else None
    if LAY:   # nach dem Druck-Layout (⚙ → Büro → Druck-Layouts): feste Elemente je Seite, Inhalt im Inhaltsbereich
        from reportlab.platypus import BaseDocTemplate
        doc = BaseDocTemplate(buf, pagesize=A4, title=titel, author=office or "Bauplattform")
        tpl, W = layout.platypus_seiten(LAY, LW, {"n": "Helvetica", "b": "Helvetica-Bold"},
                                        logo_fn=lambda cv_, r_, t_, h_, w_: C.draw_logo(cv_, r_, t_, h_, w_))
        doc.addPageTemplates(tpl)
        story = []
        story_fn(story, S, X, table, W, mm, p)
        doc.build(story or [Spacer(1, 1)])
        return buf.getvalue()
    story = []
    logo = C.print_logo()
    kopf = [[Paragraph(X(titel), S["h1"]), ""], [Paragraph(X(sub), S["sub"]), ""]]
    if logo:
        try:
            from reportlab.lib.utils import ImageReader
            ImageReader(io.BytesIO(logo)).getSize()
            kopf[0][1] = Image(io.BytesIO(logo), width=22 * mm, height=22 * mm, kind="proportional", hAlign="RIGHT")
        except Exception:   # ohne Logo drucken – kein Grund abzubrechen
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
    LAY = layout.aktiv(c, "lv")
    LW = _druck_werte(c, r, F["Titel"], F["Untertitel"], {"datum": F["Datum"]})
    ps = A4; W = layout.rahmen(LAY)[3] * mm   # Breite des Inhalts laut Druck-Layout (Vorgabe 170 mm: 25 mm Heftrand links, 15 mm rechts)
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
            except Exception:   # Foto nicht lesbar: ohne dieses Foto drucken
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
        rows.append(["", Paragraph("<b>Summe netto</b>", S["p"]), "", "", "", eur(gesamt * ((1 - nachlass_satz(V, items)) if preis == "auftrag" else 1))])   # Nachlass in % und € (wie in der Abrechnung)
        band.append(len(rows) - 1)
    tabelle_schliessen()
    if lay["zusammenstellung"] and titel:
        z = [["OZ", "Titel", "Betrag netto"]]
        for t_ in titel:
            z.append([t_.get("oz") or "", t_["kurz"], eur(tsum.get(t_["id"])) if preis != "leer" else "........................"])
        sn = gesamt * ((1 - nachlass_satz(V, items)) if preis == "auftrag" else 1)
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
            except Exception:   # ohne Logo drucken – kein Grund abzubrechen
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

    def seite(cv, doc):   # nur noch das Deckblatt – die übrigen Seiten zeichnet das Druck-Layout
        cv.saveState()
        if lay["deckblatt"] and doc.page == 1:
            deckblatt(cv)
        elif False:
            cv.setFont(FN["n"], 7.5); cv.setFillColor(MUTE)
            cv.drawString(25 * mm, ps[1] - 10 * mm, f"LV {r['nr']} {r['name']}"[:90])
            cv.drawRightString(ps[0] - 15 * mm, ps[1] - 10 * mm, (P["projekt"] or "")[:80])
            cv.drawString(25 * mm, 10 * mm, f"{kurz + ' · ' if kurz else ''}{F['Datum']}"[:120])
            cv.drawRightString(ps[0] - 15 * mm, 10 * mm, f"Seite {doc.page - (1 if lay['deckblatt'] else 0)}")
        cv.restoreState()
    if not story:
        story.append(Spacer(1, 1))
    buf = io.BytesIO()
    # Seiten nach dem Deckblatt nach dem Druck-Layout „Leistungsverzeichnis“ (Kopf-/Fußzeile, Inhaltsbereich)
    from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate
    tpl, _w = layout.platypus_seiten(LAY, LW, FN, logo_fn=lambda cv_, r_, t_, h_, w_: C.draw_logo(cv_, r_, t_, h_, w_), erste_seite=2 if lay["deckblatt"] else 1)
    if lay["deckblatt"]:
        tpl = [PageTemplate(id="deck", frames=[Frame(25 * mm, 18 * mm, ps[0] - 40 * mm, ps[1] - 34 * mm, id="d")], onPage=seite, autoNextPageTemplate="erste")] + tpl
    doc = BaseDocTemplate(buf, pagesize=ps, title=f"{F['Titel']} {r['nr']} – {r['name']}", author=kurz or "Bauplattform")
    doc.addPageTemplates(tpl)
    doc.build(story)
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



@app.route("/api/lv/<int:i>/druckfelder", methods=["GET", "POST"])
def druckfelder(i):
    """Eigene Felder vor dem Ausdruck: GET ?bereich= → [{key, name, quelle, wert, fehlt}] (nur im Layout benutzte);
    POST {bereich, werte} speichert Projektwerte (und die zuletzt eingegebenen Ausdruckswerte als Vorschlag)."""
    b = request.values.get("bereich") or (request.get_json(silent=True) or {}).get("bereich") or ""
    if b not in layout.BEREICHE:
        return jsonify(error="Unbekannter Ausdruck"), 404
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        pid = r["project_id"]
        if request.method == "POST" and pid:
            werte = (request.get_json(silent=True) or {}).get("werte") or {}
            E = {x["key"]: x for x in layout.eigene(c)}
            layout.werte_projekt_setzen(c, pid, {(k if E[k]["quelle"] == "projekt" else "_zuletzt_" + k): v for k, v in werte.items() if k in E}, g.user["name"])
        return jsonify(layout.abfrage(c, b, pid))


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

    def _am_pdf():   # Massenermittlung (auch als Anlage der Rechnungsfreigabe)
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
        return _pdf(r, f"Massenermittlung – LV {r['nr']} {r['name']}", f"{P['projekt']}{' · Auftragnehmer: ' + V['bieter'] if V.get('bieter') else ''}", st, bereich="aufmass")

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
        pdf = _am_pdf()
        fn = "Massenermittlung"
    elif art == "rechnung":
        rid = request.args.get("rid", type=int)
        R = next((x for x in P["rechnungen"] if x["id"] == rid), None)
        RC = next((x for x in K["rechnungen"] if x["id"] == rid), None)
        if not R:
            return jsonify(error="Rechnung nicht gefunden"), 404
        stand = R["data"].get("stand") if R["status"] == "geprueft" else K["aufmass"]
        freigabe = request.args.get("freigabe") == "1"   # Rechnungsfreigabe für den Bauherrn: Deckblatt + Prüfung + Rechnung der Firma
        # Was ins PDF-Paket kommt (Druckdialog): Freigabe, Prüfblatt, Massenermittlung, Rechnung der Firma (PDF/Scan)
        teile = {t for t in (request.args.get("teile") or "").split(",") if t in ("freigabe", "pruef", "aufmass", "rechnung")} or \
            ({"freigabe", "pruef", "rechnung"} if freigabe else {"pruef"})
        if not freigabe:
            teile.discard("freigabe")
        ANL = [n for k, n in (("pruef", "Prüfblatt"), ("aufmass", "Massenermittlung"), ("rechnung", "Rechnung des Auftragnehmers")) if k in teile]

        def st(story, S, X, table, W, mm, p):
            if "freigabe" in teile:
                from reportlab.platypus import PageBreak
                try:
                    from datetime import timedelta
                    ein = date.fromisoformat(R["eingang"])
                    frist = (ein + timedelta(days=30 if R["art"] == "schluss" else 21)).strftime("%d.%m.%Y")
                except (TypeError, ValueError):
                    frist = ""
                with db.tx() as c2:
                    pr = c2.execute("SELECT client FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
                SK = K.get("sicherheit") or {}
                story += [Paragraph("Rechnungsfreigabe", S["h2"]), Spacer(1, 2 * mm), table([
                    ["Bauherr", (pr["client"] if pr and pr["client"] else "—")], ["Projekt", P["projekt"] or "—"], ["Leistung", f"LV {r['nr']} {r['name']}"],
                    ["Auftragnehmer", V.get("bieter") or "—"],
                    ["Rechnung", re_titel(R["nr"], R["art"]) + (f" · Nr. {R['re_nr']}" if R["re_nr"] else "") + (f" vom {_de(R['datum'])}" if R["datum"] else "")],
                    ["Eingang", _de(R["eingang"]) + (f" · Zahlung fällig bis {frist} (VOB/B § 16)" if frist else "")]], [38 * mm, W - 38 * mm], head=False), Spacer(1, 5 * mm)]
                z = []
                if R["gefordert"]:
                    z.append(["gefordert netto" + ("" if R["art"] == "sicherheit" or RC.get("einzeln") else " (kumuliert)"), eur(R["gefordert"])])
                if R["art"] != "sicherheit":
                    z.append(["geprüft und anerkannt netto" + ("" if RC.get("einzeln") else " (kumuliert)"), eur(RC["anerkannt"])])
                    if not RC.get("einzeln"):
                        z.append(["abzüglich bereits anerkannt", eur(-RC["vorher"])])
                z += [["zur Zahlung freigegeben netto", eur(RC["zahlung"])], [f"zuzüglich Umsatzsteuer {num(MWST, 0)} %", eur(RC["mwst"])],
                      ["zur Zahlung freigegeben brutto", eur(RC["brutto"])]]
                if RC.get("skonto"):
                    z += [[f"bei Zahlung bis {_de(RC['skonto_bis'])} abzüglich {num(RC['skonto_pct'], 2)} % Skonto" if RC.get("skonto_bis") else f"abzüglich {num(RC['skonto_pct'], 2)} % Skonto", eur(-RC["skonto"])],
                          ["Zahlbetrag brutto mit Skonto", eur(RC["brutto_skonto"])]]
                story.append(table(z, [W - 50 * mm, 50 * mm], num=(1,), head=False, bold=(len(z) - 1,) if not RC.get("skonto") else (len(z) - 3, len(z) - 1)))
                story += [Spacer(1, 3 * mm), Paragraph(f"Sicherheiten: einbehalten {eur(SK.get('einbehalten', 0))}, freigegeben {eur(SK.get('freigegeben', 0))}, "
                                                       f"noch einbehalten {eur(SK.get('offen', 0))}.", S["l"]), Spacer(1, 6 * mm),
                          Paragraph(("Die Rechnung wurde sachlich und rechnerisch geprüft" + (f" am {_de(R['data'].get('geprueft_am'))}" if R["status"] == "geprueft" else "")
                                     + (f". Wir empfehlen die Zahlung von <b>{eur(RC['brutto_skonto'])}</b> brutto unter Abzug von Skonto bis zum <b>{_de(RC['skonto_bis'])}</b>"
                                        f" (danach {eur(RC['brutto'])}" + (f" bis zum {frist}" if frist else "") + ")" if RC.get("skonto") and RC.get("skonto_bis") else
                                        f". Wir empfehlen die Zahlung von <b>{eur(RC['brutto'])}</b> brutto" + (f" bis zum {frist}" if frist else "")) + "."
                                     + ("" if R["status"] == "geprueft" else " <i>(Entwurf – Prüfung noch nicht abgeschlossen)</i>")), S["p"]),
                          Spacer(1, 18 * mm), table([["Ort, Datum", "Bauleitung / Objektüberwachung", "zur Zahlung angewiesen (Bauherr)"]], [W / 3] * 3, head=False),
                          *([Paragraph("Anlagen: " + ", ".join(ANL), S["l"])] if ANL else [])] + ([PageBreak()] if "pruef" in teile else [])
                if "pruef" not in teile:
                    return
            info = [["Auftragnehmer", V.get("bieter") or "—"], ["Rechnung", re_titel(R['nr'], R['art'])
                     + (f" · Nr. {R['re_nr']}" if R["re_nr"] else "") + (f" vom {_de(R['datum'])}" if R["datum"] else "")],
                    ["Eingang", _de(R["eingang"])], ["Auftragssumme", eur(K["auftrag"]) + (f" · Nachträge beauftragt {eur(K['nachtraege']['beauftragt'])}" if K["nachtraege"]["beauftragt"] else "")]]
            t = table(info, [38 * mm, W - 38 * mm], head=False)
            art_ = R["art"]
            nt_kette = any(x_["art"] == "nachtrag" for x_ in K["rechnungen"])
            if art_ == "regie":
                story += [t, Spacer(1, 5 * mm), Paragraph("Stundenlohnarbeiten", S["h2"])]
                rows = [["Leistung", "Menge", "EH", "Satz", "Betrag"]]
                for z_ in R["data"].get("zeilen") or []:
                    rows.append([Paragraph(X(z_.get("text") or ""), S["p"]), num(z_.get("menge") or 0), z_.get("einheit") or "h", ep2(z_.get("ep")) if z_.get("ep") is not None else "—",
                                 eur(round((z_.get("menge") or 0) * (z_.get("ep") or 0), 2))])
                story.append(table(rows, [W - 96 * mm, 20 * mm, 12 * mm, 24 * mm, 40 * mm], num=(1, 3, 4)))
            elif RC.get("frei"):
                story += [t, Spacer(1, 4 * mm), Paragraph("Rechnung ohne Aufmaß – der Betrag wurde anhand der Rechnung des Auftragnehmers geprüft.", S["p"])]
            elif art_ != "sicherheit":
                story += [t, Spacer(1, 5 * mm), Paragraph("Leistungsstand (kumuliert)" + (" – Nachtragspositionen" if art_ == "nachtrag" else ""), S["h2"])]
            else:
                story += [t]
            rows = [["OZ", "Kurztext", "Menge", "EH", "EP", "Betrag"]]
            for x in items if art_ not in ("regie", "sicherheit") and not RC.get("frei") else []:
                if x["typ"] != "pos" or x.get("art") == "T":
                    continue
                if nt_kette and bool(x.get("nt")) != (art_ == "nachtrag"):
                    continue
                m = (stand or {}).get(x["id"])
                ep = _fn(VP.get(x["id"]))
                if not m:
                    continue
                rows.append([x["oz"] + (f" {x['nt']}" if x.get("nt") else ""), Paragraph(X(x["kurz"]), S["p"]), num(m), x["einheit"], ep2(ep) if ep is not None else "—",
                             eur(round(m * ep, 2)) if ep is not None and not (x.get("nt") and x.get("nt_status") == "abgelehnt") else "—"])
            if art_ not in ("regie", "sicherheit") and not RC.get("frei"):
                story.append(table(rows, [20 * mm, W - 20 * mm - 96 * mm, 20 * mm, 12 * mm, 24 * mm, 40 * mm], num=(2, 4, 5)))
            story += [Spacer(1, 5 * mm), Paragraph("Prüfung", S["h2"])]
            z = [["Freigabe der Sicherheit netto" if art_ == "sicherheit" else "Summe Stundenlohnarbeiten" if art_ == "regie" else "geprüfter Betrag netto" if RC.get("frei") else "Leistungsstand netto",
                  eur(RC["zahlung"] if art_ == "sicherheit" else RC["leistung"])]]
            if RC["nachlass"]:
                z.append([f"- Nachlass {nachlass_text(V)}", eur(-RC["nachlass"])])
            L1 = RC["leistung"] - RC["nachlass"]
            for a in R["data"].get("abzuege") or []:
                w = L1 * a["pct"] / 100 if a.get("pct") is not None else (a.get("betrag") or 0)
                z.append([f"- {a.get('text') or 'Abzug'}" + (f" ({num(a['pct'], 2)} %)" if a.get("pct") is not None else ""), eur(-w)])
            if art_ != "sicherheit":
                z.append([f"- {'Sicherheit für Mängelansprüche' if art_ == 'schluss' else 'Sicherheitseinbehalt'} {num(RC['einbehalt_pct'], 2)} %", eur(-RC["einbehalt"])])
                z.append(["= anerkannt" + ("" if RC.get("einzeln") else " (kumuliert)"), eur(RC["anerkannt"])])
                if not RC.get("einzeln"):
                    z.append(["- bisher anerkannt", eur(-RC["vorher"])])
            z.append(["= Zahlbetrag netto", eur(RC["zahlung"])])
            z.append([f"+ Umsatzsteuer {num(MWST, 0)} %", eur(RC["mwst"])])
            z.append(["= Zahlbetrag brutto", eur(RC["brutto"])])
            if RC.get("skonto"):
                z.append([f"- Skonto {num(RC['skonto_pct'], 2)} %" + (f" bei Zahlung bis {_de(RC['skonto_bis'])}" if RC.get("skonto_bis") else ""), eur(-RC["skonto"])])
                z.append(["= Zahlbetrag brutto mit Skonto", eur(RC["brutto_skonto"])])
            if R["gefordert"]:
                z.append([f"zum Vergleich: gefordert ({'netto' if RC.get('einzeln') else 'kumuliert netto'}) {eur(R['gefordert'])}", f"Differenz {eur(RC['differenz'])}"])
            story.append(table(z, [W - 50 * mm, 50 * mm], num=(1,), head=False, bold=(len(z) - (2 if R["gefordert"] else 1),)))
            story += [Spacer(1, 10 * mm), Paragraph(
                ("Sachlich und rechnerisch geprüft" + (f" am {_de(R['data'].get('geprueft_am'))} von {X(R['data'].get('geprueft_von'))}" if R["status"] == "geprueft" else " – Entwurf, Prüfung noch nicht abgeschlossen")) +
                (f"<br/>Bemerkung: {X(R['notiz'])}" if R["notiz"] else ""), S["p"])]
        pdf = None if not teile & {"freigabe", "pruef"} else _pdf(r, f"{'Rechnungsfreigabe' if 'freigabe' in teile else 'Rechnungsprüfung'} – {re_titel(R['nr'], R['art'])}", f"{P['projekt']} · LV {r['nr']} {r['name']}", st,
                   bereich="rechnungsfreigabe" if "freigabe" in teile else "rechnungspruefung",
                   werte={"rechnung": re_titel(R["nr"], R["art"]), "re_nr": R["re_nr"] or "", "re_datum": _de(R["datum"]), "eingang": _de(R["eingang"])})
        fn = f"{'Rechnungsfreigabe' if freigabe else 'Pruefung'} Rechnung {R['nr']}"
        if teile & {"aufmass", "rechnung"}:   # Anlagen: Massenermittlung, Rechnung(en) der Firma
            try:
                from pypdf import PdfReader, PdfWriter
                bl = []
                if "rechnung" in teile:
                    with db.tx() as c2:
                        _beleg_tabelle(c2)
                        bl = [_beleg_markiert(c2, bytes(b["data"])) for b in c2.execute("SELECT data FROM ava_beleg WHERE rechnung_id=? ORDER BY id", (rid,)).fetchall()]
                am_ = [_am_pdf()] if "aufmass" in teile and P["aufmass"] else []
                teile_ = [x for x in [pdf] + am_ + bl if x]
                if len(teile_) > 1 or (teile_ and not pdf):
                    w = PdfWriter()
                    for part in teile_:
                        for pg in PdfReader(io.BytesIO(part)).pages:
                            w.add_page(pg)
                    buf = io.BytesIO(); w.write(buf); pdf = buf.getvalue()
            except Exception as e:
                fehler.still("ava", "Rechnungsfreigabe: Rechnungen der Firma anhängen", e)
                pass
        if not pdf:
            return jsonify(error="Nichts zu drucken – bitte mindestens einen Teil wählen (die Massenermittlung braucht ein Aufmaß, die Rechnung der Firma eine PDF)."), 400
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
                except Exception:   # Foto nicht lesbar: ohne dieses Foto drucken
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
