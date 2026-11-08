"""Baudaten: gemeinsamer Zugriff auf die Positionsdatenbank (Tabellen pdb_*, Migration 0023/0024 im Bautagebuch).

Genutzt von der App „Baudaten“ (plattform/baudaten.py) und von Ausschreibung/Vergabe und Baukosten
(„Position aus Baudaten einfügen“). Alle Apps lesen dieselbe Datenbank – deshalb direkt per SQL, ohne Umweg über HTTP.

Preise: Katalogpreis zum Preisstand des Katalogs × Index_aktuell / Index_basis × Faktor (Region/Projekt).
"""
import json
import re
import threading
import time

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


# ---------------------------------------------------------------- Suchtabelle (Cache für die Volltextsuche)
# pdb_such(id, such): Kurz-, Lang-, Grundtext und Titel jeder Position (eigene, Baudaten, Kataloge der Ausschreibung) in einer
# Spalte, mit Trigramm-Index (pg_trgm) – „Fliese 60x60“ sucht dann in einer Tabelle statt über Ansicht, Union und Grundtexte.
# Neu aufgebaut im Hintergrund, sobald sich Positionen oder Kataloge ändern (Stand alle 30 s geprüft); bis dahin sucht die alte Abfrage.
_SUCH = {"stand": None, "geprueft": 0.0, "laeuft": False}


def _such_stand(c):
    r = c.execute("""SELECT (SELECT count(*) || '/' || COALESCE(max(updated), '') FROM pdb_position) || '|' ||
                            (SELECT count(*) || '/' || COALESCE(max(id), 0) FROM ava_katalog) || '|' ||
                            (SELECT count(*) FROM pdb_grundtext) AS s""").fetchone()
    return r["s"] if r else ""


def such_neu():
    """Suchtabelle neu aufbauen (eigene Verbindung, im Hintergrund) und am Ende austauschen."""
    from bpcore import db
    try:
        with db.tx() as c:
            # nur ein Neuaufbau gleichzeitig über alle Container (Baudaten, Baukosten, AVA …) – sonst stoßen sie beim Anlegen zusammen
            if not c.execute("SELECT pg_try_advisory_xact_lock(727401) AS ok").fetchone()["ok"]:
                return
            stand = _such_stand(c)
            try:
                with c.savepoint():
                    c.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
            except Exception:
                pass   # ohne Erweiterung: Tabelle ohne Trigramm-Index (immer noch schneller als die Ansicht)
            c.execute("DROP TABLE IF EXISTS pdb_such_neu")
            c.execute("""CREATE TABLE pdb_such_neu AS SELECT p.id, lower(p.kurz || ' ' || p.bez || ' ' || p.lang || ' ' || p.titel || ' ' || COALESCE(gt.text, '')) AS such
                         FROM pdb_alle p LEFT JOIN pdb_grundtext gt ON gt.id = p.grund_id""")
            c.execute("ALTER TABLE pdb_such_neu ADD PRIMARY KEY (id)")
            try:
                with c.savepoint():
                    c.execute("CREATE INDEX ON pdb_such_neu USING gin (such gin_trgm_ops)")
            except Exception:   # ohne pg_trgm kein Trigramm-Index – Suche geht trotzdem
                pass
        with db.tx() as c:   # kurz austauschen
            c.execute("DROP TABLE IF EXISTS pdb_such")
            c.execute("ALTER TABLE pdb_such_neu RENAME TO pdb_such")
            c.execute("INSERT INTO pdb_meta(key, value) VALUES('such_stand', ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (stand,))
        _SUCH["stand"] = stand
    except Exception as e:
        from bpcore import fehler
        fehler.still(None, "Baudaten: Suchtabelle neu aufbauen", e)
        _SUCH["stand"] = None
    finally:
        _SUCH["laeuft"] = False


def _such_bereit(c):
    """Ist die Suchtabelle aktuell? Sonst Neuaufbau anstoßen und (diesmal) die alte Abfrage nehmen."""
    jetzt = time.time()
    if _SUCH["stand"] is not None and jetzt - _SUCH["geprueft"] < 30:
        return True
    _SUCH["geprueft"] = jetzt
    try:
        with c.savepoint():
            akt = _such_stand(c)
            m = c.execute("SELECT value FROM pdb_meta WHERE key='such_stand'").fetchone()
            da = c.execute("SELECT to_regclass('pdb_such') IS NOT NULL AS da").fetchone()["da"]
    except Exception:   # Stand nicht lesbar (z. B. Baudaten noch nicht eingespielt): alte Abfrage nehmen
        return False
    if da and m and m["value"] == akt:
        _SUCH["stand"] = akt
        return True
    _SUCH["stand"] = None
    if not _SUCH["laeuft"]:
        _SUCH["laeuft"] = True
        threading.Thread(target=such_neu, daemon=True).start()
    return bool(da)   # alte Tabelle darf weiter genutzt werden, bis die neue fertig ist (geänderte Texte evtl. noch nicht gefunden)


def _wo(a, such=False):
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
        elif such:   # schnell über die Suchtabelle
            ts = q.lower().split()[:8]
            w.append("p.id IN (SELECT id FROM pdb_such WHERE " + " AND ".join(["such LIKE ?"] * len(ts)) + ")")
            p += ["%" + t + "%" for t in ts]
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
    w, p = _wo(a, such=bool(a.get("q")) and _such_bereit(c))
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
    grenze = _vor_jahren(5)   # ältere Preise bleiben gespeichert, zählen aber nicht mehr (Median, Vorschlag)
    for x in d["preise"]:
        x["alt"] = (x.get("datum") or "") < grenze
        x["auto"] = str(x.get("user_name") or "").startswith("ava:")
    v = sorted(x["ep"] for x in d["preise"] if not x["alt"] and x["ep"] is not None)
    d["ep_eigen_median"] = (v[len(v) // 2] if len(v) % 2 else (v[len(v) // 2 - 1] + v[len(v) // 2]) / 2) if v else None
    d["n_preise"] = len(v)
    d["ep_eigen_median_akt"] = _rund(d["ep_eigen_median"]) if d["ep_eigen_median"] is not None else None
    if d["katalog"] == "gk3e":   # Standardelement: Bestandteile und Preis aus den heutigen Positionspreisen
        d["teile"] = element_teile(c, d["code"])
        if d["teile"]:
            for k in ("ep_von", "ep_mittel", "ep_bis"):
                d[k + "_akt"] = _rund(sum((t[k] or 0) * t["faktor"] for t in d["teile"]))
    return d


# ---------------------------------------------------------------- Bauteil-Baukasten (Vorlagen mit Schichten) und Standardelemente (Katalog gk3e)
# Menge einer Position im Aufbau = Faktor × Menge des Bauteils; Preis = Σ Faktor × EP (heutiger Preis, also mit Index und Faktor).
def _pos_preise(c, codes):
    codes = sorted({x for x in codes if x})
    if not codes:
        return {}
    f = umrechnung(c, "gk3")
    out = {}
    for r in c.execute(f"SELECT id, code, kurz, bez, einheit, kg, ep_von, ep_mittel, ep_bis, lb_nr FROM pdb_position WHERE katalog='gk3' AND code IN ({','.join('?' * len(codes))})", codes).fetchall():
        d = r.dict()
        for k in ("ep_von", "ep_mittel", "ep_bis"):
            d[k] = (d[k] or 0) * f
        out[d["code"]] = d
    return out


def _summe(teile, P):
    s = {"ep_von": 0.0, "ep_mittel": 0.0, "ep_bis": 0.0}
    for code, fk in teile:
        p = P.get(code)
        if p:
            for k in s:
                s[k] += p[k] * fk
    return {k: _rund(v) for k, v in s.items()}


def element_teile(c, code):
    """Bestandteile eines Standardelements: [{code, kurz, einheit, kg, faktor, ep_*}] (Preise heute)."""
    T = [(r["position_code"], r["faktor"]) for r in c.execute("SELECT position_code, faktor FROM pdb_element_teil WHERE element_code=? ORDER BY nr", (code,)).fetchall()]
    P = _pos_preise(c, [t[0] for t in T])
    return [{**{k: P[x][k] for k in ("id", "code", "kurz", "bez", "einheit", "kg", "lb_nr")}, "faktor": f,
             "ep_mittel": _rund(P[x]["ep_mittel"]), "ep_von": _rund(P[x]["ep_von"]), "ep_bis": _rund(P[x]["ep_bis"]),
             "anteil": _rund(P[x]["ep_mittel"] * f)} for x, f in T if x in P]


def vorlagen(c, kg=None, q=""):
    """Vorlagen des Baukastens (optional je KG der 2. oder 3. Ebene) mit dem Preis jeder Option (EP mittel je Einheit des Bauteils)."""
    w, p = ["1=1"], []
    if kg:
        k = re.sub(r"\D", "", str(kg))[:3]
        w.append("kg LIKE ?"); p.append(k.rstrip("0") + "%" if len(k) == 3 and k.endswith("0") else k + "%")
    if q:
        w.append("(lower(name) LIKE ? OR lower(lang) LIKE ? OR lower(daten) LIKE ?)"); p += ["%" + q.lower() + "%"] * 3
    rows = [r.dict() for r in c.execute(f"SELECT id, kg, name, einheit, lang, bezug, daten, tags FROM pdb_vorlage WHERE {' AND '.join(w)} ORDER BY sort, id", p).fetchall()]
    codes = []
    for r in rows:
        r["daten"] = json.loads(r["daten"] or "{}")
        codes += [t[0] for t in r["daten"].get("fest") or []]
        for s in r["daten"].get("schichten") or []:
            for o in s.get("optionen") or []:
                codes += [t[0] for t in o.get("teile") or []]
    P = _pos_preise(c, codes)
    out = []
    for r in rows:
        D = r.pop("daten")
        r["fest"] = _summe(D.get("fest") or [], P)["ep_mittel"]
        r["schichten"] = [{"name": s["name"], "optionen": [{"k": o.get("k", ""), "t": o.get("t", ""), "std": bool(o.get("std")),
                                                            "ep": _summe(o.get("teile") or [], P)["ep_mittel"], "n": len(o.get("teile") or [])}
                                                           for o in s["optionen"]]} for s in D.get("schichten") or []]
        out.append(r)
    return out


def aufbau(c, vid, wahl):
    """Gewählter Aufbau einer Vorlage → Bauteil mit Texten, Preisspanne (heute) und Bestandteilen."""
    r = c.execute("SELECT * FROM pdb_vorlage WHERE id=?", (str(vid),)).fetchone()
    if not r:
        return None
    D = json.loads(r["daten"] or "{}")
    S = D.get("schichten") or []
    wahl = [int(x) if str(x).lstrip("-").isdigit() else 0 for x in (wahl or [])][:len(S)] + [0] * max(0, len(S) - len(wahl or []))
    teile, ks, ts = [tuple(t) for t in D.get("fest") or []], [], []
    for s, i in zip(S, wahl):
        o = s["optionen"][max(0, min(i, len(s["optionen"]) - 1))]
        teile += [tuple(t) for t in o.get("teile") or []]
        if o.get("k"):
            ks.append(o["k"])
        if o.get("t"):
            ts.append(f"{s['name']}: {o['t']}")
    P = _pos_preise(c, [t[0] for t in teile])
    su = _summe(teile, P)
    bez = ", ".join([r["name"]] + ks)
    return {"vorlage": r["id"], "wahl": wahl, "kg": r["kg"], "einheit": r["einheit"], "name": r["name"], "kurz": bez[:200], "bez": bez,
            "lang": (r["lang"] + ("\n" + "\n".join(ts) if ts else "") + (f"\nMenge: {r['bezug']}" if r["bezug"] else "")).strip(),
            **su, "teile": [{**{k: P[x][k] for k in ("id", "code", "kurz", "einheit", "kg")}, "faktor": f, "ep_mittel": _rund(P[x]["ep_mittel"]),
                             "anteil": _rund(P[x]["ep_mittel"] * f)} for x, f in teile if x in P]}


_SYN = [(r"kalksand\w*", "ks"), (r"hochlochziegel|planziegel|ziegel\w*", "ziegel"), (r"mineralwolle|steinwolle|glaswolle", "mw"),
        (r"polystyrol\w*|styropor", "eps"), (r"holzfaser\w*", "hf"), (r"stahlbeton|ortbeton|\bstb\b", "stahlbeton"), (r"porenbeton|gasbeton|ytong", "porenbeton"),
        (r"gipskarton\w*|gk-?platte|\bgkb\b|\bgkf\b", "gk"), (r"wärmedämmverbund\w*", "wdvs"), (r"brettsperrholz|clt", "bsp"),
        (r"kunststoff|pvc-?fenster", "kunststoff"), (r"alu\w*", "alu"), (r"keramik\w*|feinsteinzeug|fliese\w*", "fliese"), (r"parkett\w*", "parkett"),
        (r"linoleum", "linoleum"), (r"vinyl|design ?belag", "vinyl"), (r"teppich\w*|textil\w*", "textil"), (r"zementestrich|\bct\b", "estrich"),
        (r"dispersion\w*", "anstrich"), (r"metallständer|\bcw\b", "metallständer")]


def _tok(t):
    t = str(t or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")
    for rx, rep in _SYN:
        t = re.sub(rx.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue"), " " + rep + " ", t)
    W = set(re.findall(r"[a-z]{2,}", t))
    for w in list(W):   # zusammengesetzte Wörter: „Innentür“ trifft auch „Tür“, „Außenwand“ auch „Wand“
        for kopf in ("tuer", "fenster", "wand", "decke", "dach", "platte", "belag", "putz", "estrich", "heizung", "leitung", "stuetze", "treppe", "gelaender"):
            if w.endswith(kopf) and w != kopf:
                W.add(kopf)
    W |= {x.replace(".", ",") for x in re.findall(r"\d+(?:[.,]\d+)?", t)}
    return W - {"cm", "mm", "mit", "und", "aus", "der", "die", "das", "je", "fuer", "ohne", "0", "0,0", "1"}


def aufbau_vorschlag(c, kg, text, V=None):
    """Passenden Aufbau aus dem Baukasten zu einer Beschreibung (z. B. IFC-Material „Kalksandstein 17,5 cm, WDVS EPS 16 cm“, KG 331).
    Gibt (vorlage, wahl, punkte) oder None zurück. Je Schicht die Option mit den meisten gemeinsamen Begriffen, sonst die Standardoption."""
    k = re.sub(r"\D", "", str(kg or ""))[:3]
    if not k:
        return None
    if V is None:
        V = [r.dict() for r in c.execute("SELECT id, kg, name, lang, daten FROM pdb_vorlage WHERE kg = ? OR kg LIKE ? ORDER BY sort", (k, k[:2] + "%")).fetchall()]
    W = _tok(text)
    best = None
    for v in V:
        if v["kg"] != k and best and best[3]:   # gleiche KG bevorzugen
            continue
        D = v["daten"] if isinstance(v["daten"], dict) else json.loads(v["daten"] or "{}")
        im_namen = W & _tok(v["name"])
        treffer, wahl = set(im_namen), []
        for s_ in D.get("schichten") or []:   # je Schicht die Option mit den meisten Begriffen; jeder Begriff zählt nur einmal
            sc = [W & _tok((o.get("k") or "") + " " + (o.get("t") or "")) for o in s_["optionen"]]
            sc = [x if any(not t[0].isdigit() for t in x - treffer) else set() for x in sc]   # Zahlen zählen nur zusammen mit einem neuen passenden Begriff
            n = [len(x - treffer) * 10 + len(x) for x in sc]
            m = max(n) if n else 0
            if m:
                j = n.index(m)
                wahl.append(j)
                treffer |= sc[j]
            else:
                wahl.append(next((j for j, o in enumerate(s_["optionen"]) if o.get("std")), 0))
        pk = len(treffer) + 0.5 * len(im_namen)
        gleich = v["kg"] == k
        if best is None or (gleich, pk) > (best[3], best[2]):
            best = (v["id"], wahl, pk, gleich)
    return best[:3] if best and best[3] else None


def aufloesen(c, teile, menge, titel=""):
    """Bestandteile → LV-Positionen (Menge = Faktor × Menge des Bauteils), Langtext und KG aus der Positionsdatenbank."""
    out = []
    for t in teile:
        d = position(c, t["id"])
        if not d:
            continue
        x = als_lv_position(d)
        m = round((menge or 0) * t["faktor"], 3)
        out.append({"typ": "pos", "art": "N", "kurz": x["kurz"], "lang": x["lang"], "menge": m, "einheit": x["einheit"], "kg": x["kg"],
                    "ep_s": x["ep"], "ep_von": d.get("ep_von_akt"), "ep_bis": d.get("ep_bis_akt"), "code": d["code"],
                    "quelle": (f"aus {titel} – " if titel else "") + f"Faktor {str(t['faktor']).replace('.', ',')}"})
    return out


def vorbemerkungen(c, key=None):
    if key:
        r = c.execute("SELECT key, titel, text FROM pdb_vorbemerkung WHERE key=?", (key,)).fetchone()
        return r.dict() if r else None
    return [r.dict() for r in c.execute("SELECT key, titel, length(text) AS laenge FROM pdb_vorbemerkung ORDER BY sort, key").fetchall()]


def _vor_jahren(n):
    from datetime import date
    t = date.today()
    try:
        return t.replace(year=t.year - n).isoformat()
    except ValueError:
        return t.replace(year=t.year - n, day=28).isoformat()


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

    @app.get("/api/baudaten/vorlagen")
    def baudaten_vorlagen():
        """Bauteil-Baukasten: Vorlagen (optional ?kg=330 bzw. 331, ?q=) mit Schichten und dem Preis je Option."""
        with db.tx() as c:
            return jsonify(vorlagen(c, request.args.get("kg"), (request.args.get("q") or "").strip()[:80]))

    @app.post("/api/baudaten/aufbau")
    def baudaten_aufbau():
        """{vorlage, wahl: [Index je Schicht]} → Bauteil mit Preisspanne und Bestandteilen. Mit menge: auch als LV-Positionen (aufgeloest)."""
        b = request.get_json(silent=True) or {}
        with db.tx() as c:
            if b.get("code"):   # Standardelement
                r = c.execute("SELECT hinweis FROM pdb_position WHERE katalog='gk3e' AND code=?", (str(b["code"]),)).fetchone()
                m = re.match(r"Aufbau ([\d.]+):([\d.]*)", r["hinweis"] if r else "")
                if not m:
                    return jsonify(error="Element nicht gefunden"), 404
                b["vorlage"], b["wahl"] = m.group(1), [int(x) for x in m.group(2).split(".") if x != ""]
            d = aufbau(c, b.get("vorlage"), b.get("wahl"))
            if not d:
                return jsonify(error="Vorlage nicht gefunden"), 404
            if b.get("menge") is not None:
                d["positionen"] = aufloesen(c, d["teile"], _f(b.get("menge"), 0) or 0, d["name"])
        return jsonify(d)

    @app.get("/api/baudaten/vorbemerkungen")
    def baudaten_vorbemerkungen():
        with db.tx() as c:
            k = request.args.get("key")
            d = vorbemerkungen(c, k) if k else vorbemerkungen(c)
        return jsonify(d) if d is not None else (jsonify(error="Keine Vorbemerkung"), 404)

    @app.get("/api/baudaten/position/<int:i>")
    def baudaten_position(i):
        """Eine Position mit Langtext, Preisspanne, Kalkulation und eigenen Preisen (Detailfenster beim Doppelklick)."""
        with db.tx() as c:
            d = position(c, i)
        return jsonify(d) if d else (jsonify(error="Position nicht gefunden"), 404)

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
                                "code": d.get("code"), "eigene": [{"ep": p["ep"], "firma": p["firma"] or "", "datum": p["datum"] or ""} for p in d["preise"] if not p["alt"]][:12],
                                "ep_median": d.get("ep_eigen_median")})
                    m = re.match(r"Aufbau ([\d.]+?):([\d.]*)$", d.get("hinweis") or "") if d["katalog"] == "gk3e" else None
                    if m:   # Standardelement: Aufbau merken (Baukosten: Schichten änderbar, Ausschreibung: auflösen)
                        out[-1]["aufbau"] = {"v": m.group(1), "w": [int(x) for x in m.group(2).split(".") if x != ""]}
        return jsonify(out)
