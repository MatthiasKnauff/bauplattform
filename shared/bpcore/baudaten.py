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
    if d["katalog"] in ("gk3e", "eigen"):   # Standardelement (auch eigene Kopie): Bestandteile aus den heutigen Positionspreisen
        d["teile"] = element_teile(c, d["code"]) or None
        if d["teile"] and d["katalog"] == "gk3e":   # Katalog: Preis = Summe der Teile; eigene Kopie behält ihren Preis
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
    if W & {"ks", "ziegel", "hlz", "porenbeton", "pp", "pp2", "pp4", "hbl", "kalksandstein", "lehmstein"}:
        W.add("mauerwerk")
    W |= {x.replace(".", ",") for x in re.findall(r"\d+(?:[.,]\d+)?", t)}
    return W - {"cm", "mm", "mit", "und", "aus", "der", "die", "das", "je", "fuer", "ohne", "0", "0,0", "1"}


def aufbau_vorschlag(c, kg, text, V=None):
    """Passenden Aufbau aus dem Baukasten zu einer Beschreibung (z. B. IFC-Material „Kalksandstein 17,5 cm, WDVS EPS 16 cm“, KG 331).
    Gibt (vorlage, wahl, punkte) oder None zurück. Je Schicht die Option mit den meisten gemeinsamen Begriffen, sonst die Standardoption."""
    k = re.sub(r"\D", "", str(kg or ""))[:3]
    if not k:
        return None
    if V is None:
        V = [r.dict() for r in c.execute("SELECT id, kg, name, lang, daten, tags FROM pdb_vorlage WHERE kg = ? OR kg LIKE ? ORDER BY sort", (k, k[:2] + "%")).fetchall()]
    W = _tok(text)
    best = None
    for v in V:
        if v["kg"] != k and best and best[3]:   # gleiche KG bevorzugen
            continue
        D = v["daten"] if isinstance(v["daten"], dict) else json.loads(v["daten"] or "{}")
        im_namen = W & _tok(v["name"])
        treffer, wahl = set(im_namen), []
        for nr_s, s_ in enumerate(D.get("schichten") or []):   # je Schicht die Option mit den meisten Begriffen; jeder Begriff zählt nur einmal
            sc = [W & _tok((o.get("k") or "") + " " + (o.get("t") or "")) for o in s_["optionen"]]
            if nr_s:   # Zahlen (Dicken) entscheiden nur in der ersten Schicht (Tragschicht) allein, sonst nur mit einem neuen passenden Begriff
                sc = [x if any(not t[0].isdigit() for t in x - treffer) else set() for x in sc]
            n = [len(x - treffer) * 10 + len(x) for x in sc]
            m = max(n) if n else 0
            if m:
                j = n.index(m)
                wahl.append(j)
                treffer |= sc[j]
            else:
                wahl.append(next((j for j, o in enumerate(s_["optionen"]) if o.get("std")), 0))
        pk = len(treffer) + 0.5 * len(im_namen)
        tags = (v.get("tags") or "").lower()
        nur_bestand = "altbau" in tags and "neubau" not in tags
        for wort in ("keller", "bestand", "instand", "sanier", "erneuer", "tausch"):   # Sonderfälle nur, wenn danach gefragt ist
            if (wort in v["name"].lower() or (nur_bestand and wort == "bestand")) and not any(wort in w for w in W):
                pk -= 2
                break
        gleich = v["kg"] == k
        if best is None or (gleich, pk) > (best[3], best[2]):
            best = (v["id"], wahl, pk, gleich)
    return best[:3] if best and best[3] else None


# ------------------------------------------------ Schichtmaterialien (Allplan: mehrschichtige Bauteile, je Schicht ein Material)
# Aus den Optionen der Baukasten-Vorlagen: „WDVS EPS 12/16/20“ → ein Schichtmaterial „WDVS EPS“, die Dicke kommt aus der Allplan-Schicht.
_SCH_PHYS = re.compile(r"tragschicht|^wand$|innenschale|vormauer|schale$|dämm|putz|bekleidung|beplankung|belag|estrich|abdichtung|^beton|platte$|deckung|"
                       r"dampfsperre|trennlage|fliesen|parkett|anstrich|oberfläche|untergrund|innenseite|außenseite|fassade|klinker|riemchen|lattung|^kies|"
                       r"begrünung|ständerwerk|unterkonstruktion|wandbaustoff|tapete|dielen|aufbeton|luftdicht|installationsebene|sparren|balkenlage", re.I)
_SCH_NICHT = re.compile(r"fuge|sockel|kopf|rand|leibung|anschluss|durch|zulage|einbau|schalung|bewehrung", re.I)
_SCH_ZAHL = re.compile(r"(?<![\w,])(\d+(?:,\d+)?)(?![\w,])")
SCHICHT_GRUPPEN = [("Tragschicht", r"trag|wand|schale|beton|platte|ständer|holz|sparren|balken"), ("Dämmung", r"dämm"), ("Putz", r"putz"),
                   ("Bekleidung, Fassade", r"bekleid|fassade|vormauer|klinker|riemchen|beplank|außen|unterkonstr|lattung"),
                   ("Abdichtung, Folien", r"abdicht|dampf|trenn|luftdicht"), ("Estrich, Belag", r"estrich|belag|fliesen|parkett|dielen|untergrund"),
                   ("Dachdeckung", r"deckung|kies|begrün"), ("Oberfläche innen", r".")]
_SCH_GRUPPE_TEXT = [("Dachdeckung", r"eindeckung|deckung|stehfalz|dachbahn|begrünung|kiesschütt|sandwich|trapezblech|unterdeck"),
                    ("Putz", r"putz(?!träger)|spachtelung q|dünnlagen"), ("Dämmung", r"dämm|wdvs"), ("Abdichtung, Folien", r"abdicht|sperre|bremse|folie|trennlage"),
                    ("Estrich, Belag", r"estrich|belag|parkett|bodenfliesen|dielen|laminat|teppich|vinyl|linoleum|kautschuk|kork|naturfaser|terrazzo|mosaik"),
                    ("Oberfläche innen", r"anstrich|tapete|lasur|farbe|vlies|beschichtung|ölen|spachteltechnik|wandfliesen"),
                    ("Bekleidung, Fassade", r"bekleid|fassade|riemchen|klinker|vorsatzschale|akustik|unterkonstruktion")]
SCHICHT_KATEGORIEN = [   # Reihenfolge = Ordner im Katalog, erster Treffer zählt
    ("Mauerwerk", r"mauerwerk|kalksand|\bKS\b|ziegel(?!.*eindeck)|\bHlz\b|\bMz\b|porenbeton|\bPP\d?\b|hohlblock|\bHbl\b|planstein|lehmstein|ausmauerung|glasbaustein"),
    ("Beton", r"beton|\bStB\b|elementwand|elementdecke|filigran|bodenplatte|\bWU\b"),
    ("Trockenbau", r"metallständer|montagewand|\bCW\b|wandbauplatte|\bGWP\b|vorsatzschale|installationswand|installationsschacht|schachtwand|trockenputz|gipsfaser|feuchtraumwand"),
    ("Holzbau", r"brettsperr|\bCLT\b|\bBSP\b|\bKVH\b|holzständer|sparren|balken|dachschalung|rauspund|sichtschalung"),
    ("Dämmung", r"dämm|\bWDVS\b|\bEPS\b|\bXPS\b|\bPIR\b|mineralwolle|holzfaser|schaumglas"),
    ("Putz", r"putz(?!träger)|spachtelung q|dünnlagen"),
    ("Estrich", r"estrich"),
    ("Belag", r"belag|parkett|bodenfliesen|dielen?\b|laminat|teppich|vinyl|linoleum|kautschuk|kork|naturfaser|terrazzo|mosaik|granit|kalkstein|solnhofer|betonwerkstein"),
    ("Fliesen", r"fliesen|feinsteinzeug|dünnplatte"),
    ("Abdichtung", r"abdicht|sperre|bremse|folie|trennlage|\bKMB\b|\bMDS\b|\bFPO\b|\bEPDM\b|\bPVC\b|bitumen|dichtschlämme"),
    ("Dach", r"eindeckung|deckung|dachlattung|stehfalz|dachbahn|begrünung|kiesschütt|sandwich|trapez|unterdeck|dachziegel|schiefer|pfanne|biber|wellplatte"),
    ("Fassade", r"fassade|holzschalung|vorgehängt|\bVHF\b|riemchen|klinker|unterkonstruktion|faserzement|\bHPL\b|kassette|lochblech|streckmetall"),
    ("Bekleidung", r"bekleid|akustik|gipskarton|\bGK[BF]?\b|holzwolle|\bOSB\b|dreischicht|furnier|profilbrett|lamellen|prallwand|rasterdecke|siebdruck|spanplatte"),
    ("Anstrich", r"anstrich|tapete|lasur|farbe|vlies|beschichtung|versiegel|ölen|geölt|spachteltechnik|dispersion|silikat|silikon|reinacrylat|glasgewebe"),
]
_KAT_VORRANG = [("Anstrich", r"lasier|lasur|\bölen\b|pigmentiert"), ("Dämmung", r"dämm"), ("Abdichtung", r"abdicht|sperre"), ("Putz", r"putz(?!träger)"),
               ("Estrich", r"estrich"), ("Fassade", r"fassade|stülpschalung"), ("Bekleidung", r"bekleidung")]
_SCH_GAENGIG = [   # im Büro gängig: kommen in ihrem Ordner nach oben (sonst zählt, in wie vielen Vorlagen das Material vorkommt)
    r"Mauerwerk KS", r"Mauerwerk Hlz", r"Mauerwerk PP4", r"Beton StB", r"Beton StB C25", r"Beton WU", r"Trockenbau CW", r"Trockenbau Vorsat.*",
    r"Dämmung WDVS EPS", r"Dämmung WDVS MW", r"Dämmung XPS", r"Dämmung EPS-T", r"Putz Gips", r"Putz Kalkzement", r"Putz LP \+ Scheibe",
    r"Estrich ZE", r"Estrich CA", r"Belag Fliesen", r"Belag Linoleum", r"Belag Vinyl LVT", r"Anstrich Dispersi.*", r"Anstrich Malervli.*"]
_KAT_WORT = {"Mauerwerk": ["Mauerwerk"], "Beton": ["Beton"], "Trockenbau": ["Trockenbau"], "Holzbau": ["Holzbau"], "Dämmung": ["Dämmung"], "Putz": ["Putz"],
             "Estrich": ["Estrich"], "Belag": ["Belag"], "Fliesen": ["Fliesen"], "Abdichtung": ["Abdichtung"], "Dach": ["Dach"], "Fassade": ["Fassade"],
             "Bekleidung": ["Bekleidung"], "Anstrich": ["Anstrich"]}
_SCH = {"stand": None, "F": None}


def _sch_familie(k):
    """„WDVS EPS 16“ → („WDVS EPS“, 16.0, mm?) – Familie ohne Dickenangabe, Dicke in der Einheit der Option."""
    d = _SCH_ZAHL.search(k)
    f = re.sub(r"\s+", " ", _SCH_ZAHL.sub("", k.replace(" mm", " ").replace(" cm", " "))).strip(" ,+-×")
    return f, (float(d.group(1).replace(",", ".")) if d else None), " mm" in f" {k} " or "mm" in k.split()


def schicht_schluessel(name):
    return "S-" + re.sub(r"[^A-Za-z0-9ÄÖÜäöüß+]+", "-", re.sub(r"\s*\+\s*", "+", name)).strip("-")[:15].rstrip("-")   # 17 Zeichen: eine Leerstelle vor dem Kurztext


# Kürzel der Baukasten-Optionen → verständliche Namen (Allplan zeigt im Katalogbaum nur die 18 Zeichen der Materialbezeichnung)
_SCH_ABK = [(r"\bKS\b", "Kalksandstein"), (r"\bHlz\b", "Hochlochziegel"), (r"\bMz\b", "Vollziegel"), (r"\bHbl\b", "Hohlblock"), (r"\bPP\d?\b", "Porenbeton"),
            (r"\bStB\b", "Stahlbeton"), (r"\bWU\b", "WU-Beton"), (r"\bCW\b", "Metallständer"), (r"\bGWP\b", "Gipswandbauplatte"), (r"\bGF\b", "Gipsfaser"),
            (r"\bGKB\b", "Gipskarton"), (r"\bGKF\b", "Gipskarton Brandschutz"), (r"\bGK\b", "Gipskarton"), (r"\bBSP\b|\bCLT\b", "Brettsperrholz"),
            (r"\bMW\b", "Mineralwolle"), (r"\bHF\b", "Holzfaser"), (r"\bEPS\b", "EPS"), (r"\bXPS\b", "XPS"), (r"\bPIR\b", "PIR"), (r"\bKZ\b", "Kalkzement"),
            (r"\bLP\b", "Leichtputz"), (r"\bZE\b", "Zementestrich"), (r"\bCA\b", "Anhydritestrich"), (r"\bKD\b", "Kerndämmung"), (r"\bID\b", "Innendämmung"),
            (r"\bFZ\b", "Faserzement"), (r"\bVHF\b", "vorgehängt"), (r"\bNSi\b", "Nichtsicht"), (r"\bWSi\b", "Sichtqualität"), (r"\bOSB\b", "OSB"),
            (r"\bHPL\b", "HPL-Platte"), (r"\bKMB\b", "Bitumendickbesch."), (r"\bMDS\b", "Dichtschlämme"), (r"\bDS\b", "Dampfsperre"), (r"\bTSD\b", "Trittschalldämmung"),
            (r"\bSFB\b", "Stahlfaserbeton"), (r"\bEP\b", "Epoxid"), (r"\bPU\b", "PU"), (r"\bBit\b", "Bitumen")]
_SCH_KG = re.compile(r"^(322|324|325|33[1-35-7]|34[1-35]|35[1345]|36[134])$")   # Bauteile, die man in Schichten zeichnet
_SCH_MUELL = re.compile(r"mess|injekt|demont|kantteil|kofferung|zulage|anschluss|freileg|rückbau|abbruch|ausbau|ausbesser|sockel|aufzug|pumpensumpf|"
                        r"bestand|beids|blower|höhe|verglast|fuge|durchdring|nach zeichnung|×$|vorbereit|vorbehandel|abschlag|aufpreis|abwasch|aufnehmen|"
                        r"entfern|kugelstrahl|fräsen|treppenstufe|trittstufe|armierungsgewebe|risssanier|lüftungshaube|attika|gesims|haftbrücke|"
                        r"grundierung|spritzbewurf|schleifen|stelzlager|balkonbelag|warnmark|lasurtechnik|wischtechnik|egalis|\bab$|-ab\b|wieder", re.I)


def _sch_lesbar(name):
    t = name
    for rx, rep in _SCH_ABK:
        t = re.sub(rx, rep, t)
    return re.sub(r"\s+", " ", t).strip()


def _sch_text(kurz):
    """Positionskurztext ohne Dicken- und Mengenangaben: „Innenputz Wand Gipsputz, 15 mm, Q2“ → „Innenputz Wand Gipsputz, Q2“."""
    t = re.sub(r"(d\s*=\s*)?\d+(?:[.,]\d+)?\s*(?:[×x/–-]\s*\d+(?:[.,]\d+)?\s*)?(mm|cm|m)\b", "", str(kurz or ""))
    t = re.sub(r"[<>≤≥]\s*\d+\S*|\.\.\.|…", "", t)
    t = re.sub(r"\s+", " ", t).replace(" ,", ",").replace("( ", "(").replace(" )", ")").replace("()", "")
    t = re.sub(r",\s*(,\s*)+", ", ", t)
    return re.sub(r"(\s+(bis|ca\.|i\. M\.|≤|–|-|d =))+\s*$|[,/–\s]+$", "", t).strip(" ,")


def schicht_familien(c):
    """{Schlüssel: {name, text, gruppe, kgs, opts: [(vorlage, kg, schicht_nr, option_nr, dicke_cm, teile)]}} – je Vorlagenstand einmal berechnet."""
    st = c.execute("SELECT COUNT(*) AS n, MAX(id) AS m FROM pdb_vorlage").fetchone()
    stand = (st["n"], st["m"])
    if _SCH["stand"] == stand:
        return _SCH["F"]
    F, erste = {}, {}
    for v in c.execute("SELECT id, kg, daten FROM pdb_vorlage WHERE kg LIKE '3%' ORDER BY sort, id").fetchall():
        if not _SCH_KG.match(v["kg"] or ""):
            continue
        for sn, s in enumerate(json.loads(v["daten"] or "{}").get("schichten") or []):
            if not _SCH_PHYS.search(s["name"]) or _SCH_NICHT.search(s["name"]):
                continue
            for on, o in enumerate(s["optionen"]):
                if not (o.get("k") or "").strip() or not o.get("teile"):
                    continue
                name, dk, mm = _sch_familie(o["k"])
                if len(name) < 2 or not re.search(r"[A-Za-zÄÖÜäöü]{2}", name) or re.search(r"m³|^d =", name) or _SCH_MUELL.search(name):
                    continue
                if dk is not None and (mm or dk >= 50):
                    dk = dk / 10   # Millimeter (Dämmung 80, CLT 100 …) → cm
                alt_key = schicht_schluessel(name)   # Kürzel-Schlüssel der ersten Fassung (S-KS …) – beim Import weiter gültig
                name = _sch_lesbar(name)
                key = schicht_schluessel(name)
                x = F.setdefault(key, {"name": name, "roh": _sch_familie(o["k"])[0], "gruppe": next(g for g, rx in SCHICHT_GRUPPEN if re.search(rx, s["name"], re.I)), "kgs": set(), "opts": []})
                x["kgs"].add(v["kg"])
                x["opts"].append((v["id"], v["kg"], sn, on, dk, [tuple(t) for t in o["teile"]]))
                if alt_key != key and alt_key not in x.setdefault("auch", []):
                    x["auch"].append(alt_key)
                erste.setdefault(key, o["teile"])
    P = _pos_preise(c, [t[0] for T in erste.values() for t in T])
    texte = {}
    def rang(key):   # beim Zusammenlegen bleibt der Name, der im Positionstext vorkommt (S-Gipsputz vor S-Gips-Q2), sonst der kürzere
        T = [t for t in erste[key] if t[0] in P]
        h = max(T, key=lambda t: (P[t[0]]["ep_mittel"] or 0) * t[1]) if T else None
        txt = (P[h[0]]["kurz"] if h else "").lower()
        n_ = F[key]["name"].lower()
        return (n_ not in txt, -len(n_) if n_ in txt else len(n_))
    for key in sorted(F, key=rang):
        T = [t for t in erste[key] if t[0] in P]
        haupt = max(T, key=lambda t: (P[t[0]]["ep_mittel"] or 0) * t[1]) if T else None   # Text der teuersten Position = das eigentliche Material
        kurz = P[haupt[0]]["kurz"] if haupt else ""
        if _SCH_MUELL.search(kurz):
            del F[key]
            continue
        F[key]["text"] = _sch_text(kurz) or F[key]["name"]
        F[key]["gruppe"] = next((g for g, rx in _SCH_GRUPPE_TEXT if re.search(rx, f"{F[key]['name']} {kurz}", re.I)), F[key]["gruppe"])
        if F[key]["text"] in texte:   # gleiche Position unter anderem Kürzel – zusammenlegen, kürzester Name bleibt
            ziel = F[texte[F[key]["text"]]]
            ziel["kgs"] |= F[key]["kgs"]
            ziel["opts"] += F[key]["opts"]
            ziel.setdefault("auch", []).extend([key] + F[key].get("auch", []))
            del F[key]
        else:
            texte[F[key]["text"]] = key
    # Verständliche Materialbezeichnung „Kategorie Material“ (Mauerwerk KS, Putz Gips, Dämmung WDVS EPS …) – ohne „S-“, Kategorie = Ordner
    G = {}
    for key, x in F.items():
        such = f"{x['text']} {x['name']}"
        treffer = [(m.start(), n_, k) for n_, (k, rx) in enumerate(SCHICHT_KATEGORIEN) for m in [re.search(rx, such, re.I)] if m]
        kat = min(treffer)[2] if treffer else "Sonstiges"   # das Wort, mit dem der Positionstext anfängt, entscheidet
        w1 = such.split()[0] if such.split() else ""
        for k_vor, rx_vor in _KAT_VORRANG:   # z. B. „Aufsparrendämmung“ ist Dämmung, nicht Holzbau; „… lasieren“ ist Anstrich
            if re.search(rx_vor, w1 if k_vor != "Anstrich" else such, re.I):
                kat = k_vor
                break
        roh = x.get("roh") or x["name"]
        kw = "|".join(re.escape(w) for w in _KAT_WORT.get(kat, [kat]))
        kurz = re.sub(r"(?i)\b(" + kw + r")\b", "", roh)
        if kat in ("Putz", "Estrich"):
            kurz = re.sub(r"(?i)(\w{3,})(" + kw + r")\b", r"\1", kurz)   # Gipsputz → Gips, Schnellestrich → Schnell
        kurz = re.sub(r"\s+", " ", kurz).strip(" ,+-/") or roh
        neu = (f"{kat} {kurz}".strip())[:17].rstrip(" ,+-")
        n_ = 2
        while neu in G:   # gleich nach dem Kürzen: Nummer anhängen
            neu = f"{neu[:15].rstrip()} {n_}"
            n_ += 1
        x["gruppe"] = kat
        x["auch"] = list(dict.fromkeys([key] + x.get("auch", [])))   # alte Schlüssel (S-…) bleiben beim Import gültig
        x["haeufig"] = len({o[0] for o in x["opts"]}) + next((1000 - 10 * j for j, rx in enumerate(_SCH_GAENGIG) if re.fullmatch(rx, neu, re.I)), 0)
        G[neu] = x
    _SCH.update(stand=stand, F=G)
    return G


def _sch_dicken(x):
    return sorted({o[4] for o in x["opts"] if o[4]})


def _sch_teile(c, opt, d_m):
    """Teile einer Option, Mengen in m³ (Beton, Dämmung als Volumen) auf die Allplan-Dicke umgerechnet."""
    teile = list(opt[5])
    if not d_m or not opt[4]:
        return teile
    P = _pos_preise(c, [t[0] for t in teile])
    f = d_m * 100 / opt[4]
    return [(code, round(fk * f, 4) if (P.get(code) or {}).get("einheit") == "m³" else fk) for code, fk in teile]


def aus_schichten(c, kg, lagen):
    """Allplan-Schichten [(Materialname, Dicke in m)] → passender Aufbau aus dem Baukasten. Materialname = Bezeichnung aus dem Katalog
    (z. B. „Mauerwerk KS“), dessen Kurztext oder ein früherer Schlüssel; Schichten ohne Material zählen nicht.
    Gibt {"vorlage", "wahl", "text"} zurück, wenn eine Vorlage alle Schichten abdeckt, sonst {"teile", "text"} (frei zusammengesetzt) oder None."""
    F = schicht_familien(c)
    such = {}   # Materialname der Schicht → Schlüssel: Bezeichnung, Kurztext, frühere Schlüssel (S-…) – ohne Groß-/Kleinschreibung
    for k, x in F.items():
        for a in [k, x["text"], *x.get("auch", [])]:
            such.setdefault(re.sub(r"\s+", " ", a).strip().lower(), k)
    L = []
    for nm, d in lagen:
        n_ = re.sub(r"\s+", " ", str(nm or "")).strip().lower()
        if not n_:
            continue
        k = such.get(n_) or such.get(n_[:17].rstrip())
        if k is None:   # eine Schicht mit fremdem Material: nicht aus dem Katalog – dann lieber gar nicht zusammensetzen
            return None
        L.append((k, d))
    if not L:
        return None
    dk = lambda d: f"{round(d * 100, 1):g} cm".replace(".", ",") if d else ""   # noqa: E731
    text = " + ".join(f"{F[k]['name']} {dk(d)}".strip() for k, d in L)
    k3 = re.sub(r"\D", "", str(kg or ""))[:3]
    # 1. Vorlage, in der jede Schicht ein eigenes Baukasten-Feld trifft – gleiche KG zuerst, dann wenigste Abweichung
    kand = {}
    for k, d in L:
        for vid, vkg, sn, on, odk, _ in F[k]["opts"]:
            kand.setdefault(vid, {"kg": vkg})
    best = None
    for vid, info in kand.items():
        r = c.execute("SELECT daten FROM pdb_vorlage WHERE id=?", (vid,)).fetchone()
        S = json.loads(r["daten"] or "{}").get("schichten") or []
        wahl, belegt, abw = [None] * len(S), set(), 0.0
        ok = True
        for k, d in L:
            opts = [o for o in F[k]["opts"] if o[0] == vid and o[2] not in belegt]
            if not opts:
                ok = False
                break
            o = min(opts, key=lambda o: abs((o[4] or 0) - d * 100) if d and o[4] else 0)
            abw += abs((o[4] or 0) - d * 100) if d and o[4] else 0
            wahl[o[2]] = o[3]
            belegt.add(o[2])
        if not ok:
            continue
        for sn, s in enumerate(S):   # übrige Felder: Standard („“-Option bzw. ohne Teile), sonst die erste
            if wahl[sn] is None:
                O = s["optionen"]
                wahl[sn] = next((j for j, o in enumerate(O) if not (o.get("k") or "").strip() and o.get("teile")), None)
                if wahl[sn] is None:
                    wahl[sn] = next((j for j, o in enumerate(O) if not o.get("teile")), next((j for j, o in enumerate(O) if o.get("std")), 0))
        rang = (info["kg"] != k3, info["kg"][:2] != k3[:2], len(S) - len(belegt), abw)
        if best is None or rang < best[0]:
            best = (rang, vid, wahl)
    if best and best[0][1] is False:
        return {"vorlage": best[1], "wahl": best[2], "text": text}
    # 2. frei: je Schicht die Option mit passender KG und der nächsten Dicke
    teile = []
    for k, d in L:
        O = F[k]["opts"]
        o = min(O, key=lambda o: (o[1] != k3, o[1][:2] != k3[:2], abs((o[4] or 0) - d * 100) if d and o[4] else 0))
        teile += _sch_teile(c, o, d)
    return {"teile": [[a, b] for a, b in teile], "text": text}


def teile_aufbau(c, teile):
    """Frei zusammengesetzter Aufbau [[Positionscode, Faktor]] → Preis und Bestandteile wie aufbau()."""
    T = [(str(a), float(b)) for a, b in teile if a]
    P = _pos_preise(c, [t[0] for t in T])
    return {**_summe(T, P), "teile": [{**{k: P[x][k] for k in ("id", "code", "kurz", "einheit", "kg")}, "faktor": f, "ep_mittel": _rund(P[x]["ep_mittel"]),
                                       "anteil": _rund(P[x]["ep_mittel"] * f)} for x, f in T if x in P]}


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


ALLPLAN_KATALOGE = [   # Kundenkataloge 1–5 nach Bauteilart – in Allplan je Bauteil zuordnen
    ("kukat1", "Wände", lambda k: (k[:2] in ("33", "34")) and k not in ("334", "338", "344", "347")),
    ("kukat2", "Decken, Böden, Gründung", lambda k: k[:2] in ("32", "35") and k != "352"),
    ("kukat3", "Dächer", lambda k: k[:2] == "36" and k not in ("362", "366")),
    ("kukat4", "Fenster, Türen, Öffnungen", lambda k: k in ("334", "338", "344", "347", "352", "362", "366")),
    ("kukat5", "Weitere (Baugrube, Einbauten, Technik)", lambda k: True),
]


def _allplan_auswahl(rows, ziel=320):
    """Je Vorlage nur die gängigen Aufbauten: zuerst verschiedene Tragschichten (erste Schicht), höchstens ~ziel Einträge je Katalog."""
    je = {}
    for r in rows:
        m = re.match(r"Aufbau ([\d.]+?):([\d.]*)$", r["hinweis"] or "")
        if m:
            je.setdefault(m.group(1), []).append((r, [int(x) for x in m.group(2).split(".") if x != ""]))
    if not je:
        return rows
    k = max(2, min(8, ziel // len(je)))
    out = []
    for vid in sorted(je):
        L, gesehen, wahl = je[vid], set(), []
        for r, w in L:   # erst je Tragschicht eine Variante
            if (w[:1] or [0])[0] not in gesehen:
                gesehen.add((w[:1] or [0])[0]); wahl.append(r)
        wahl += [r for r, _ in L if r not in wahl]
        out += wahl[:k]
    return out


def allplan_katalog(c, kg=""):
    """Bauteil-Elemente (Katalog gk3e) als Allplan-Kundenkataloge im Textformat des Elementkatalogs NEM_ELE:
    .KAT (REFNAM 18 Zeichen + Kurztext 60), .KTX (Langtext in Zeilen zu 40 Zeichen, um 18 eingerückt), .KTM (Attribute, leer).
    Fünf Kataloge nach Bauteilart (kukat1–5), je Vorlage nur die gängigen Aufbauten. Drei Ebenen wie im Allplan-Pflanzenkatalog:
    KUKATn.KAT beginnt mit „*“ und verweist je Zeile auf eine Datei im selben Ordner (k331.kat, wieder „*“ → k33102.kat mit „#“ und den
    Einträgen): Kostengruppe 331 → Vorlage 331.02 → Element 331.02.004.
    Der Kurztext beginnt mit dem Code; der IFC-Import der Baukosten erkennt daran den Aufbau. Gibt (ZIP-bytes, Anzahl) zurück."""
    import io
    import textwrap
    import zipfile
    w, p = ["katalog='gk3e'", "aktiv=1"], []
    if kg:
        w.append("kg LIKE ?"); p.append(re.sub(r"\D", "", kg)[:3].rstrip("0") + "%")
    rows = c.execute(f"SELECT code, kurz, bez, lang, einheit, kg, hinweis FROM pdb_position WHERE {' AND '.join(w)} ORDER BY code", p).fetchall()
    T = {}
    for r in c.execute("SELECT t.element_code, t.faktor, p.kurz, p.einheit FROM pdb_element_teil t JOIN pdb_position p ON p.katalog='gk3' AND p.code=t.position_code "
                       "ORDER BY t.element_code, t.nr").fetchall():
        T.setdefault(r["element_code"], []).append(r)
    ers = lambda t: (str(t).replace("–", "-").replace("„", '"').replace("“", '"').replace("’", "'").replace("×", "x").replace("²", "2").replace("³", "3")
                     .replace("≤", "<=").replace("≥", ">=").replace("Ø", "D"))
    enc = lambda t: ers(t).encode("cp1252", "replace")
    crlf = lambda L: b"\r\n".join(L) + b"\r\n"
    VNAMEN = {x["id"]: x["name"] for x in c.execute("SELECT id, name FROM pdb_vorlage").fetchall()}
    KG_NAMEN = {}
    for x in c.execute("SELECT DISTINCT gruppe, titel FROM pdb_position WHERE katalog='gk3e'").fetchall():
        KG_NAMEN[x["gruppe"]] = (x["titel"] or "").split(" › ")[-1].split(" ", 1)[-1]
    gruppen, rest = {}, list(rows)
    for key, _, passt in ALLPLAN_KATALOGE:
        gruppen[key] = [r for r in rest if passt(r["kg"] or "")]
        ids = {id(r) for r in gruppen[key]}
        rest = [r for r in rest if id(r) not in ids]
    buf, n_ges, uebersicht = io.BytesIO(), 0, []
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for key, titel, _ in ALLPLAN_KATALOGE:
            sel = sorted(_allplan_auswahl(gruppen[key]), key=lambda r: r["code"])
            if not sel:
                continue
            KOPF_I = [b"*", b"REFNAM            KURZT", b""]          # „*“ = Verzeichnis: jede Zeile verweist auf die Datei <REFNAM>.kat im selben Ordner
            KOPF_E = [b"#", b"REFNAM            KURZT", b""]          # „#“ = Blatt mit Einträgen
            KTM = crlf([b">", b"REFNAM             KUPD GEW ABR PRIOR SCH     DICKE LAYER BER SMF", b"", b""])
            zeile = lambda ref, t: enc(ref.ljust(18) + ers(t)[:60].ljust(60))   # erst ersetzen, dann auf 60 Zeichen
            stamm, kgs = list(KOPF_I), {}
            passt = next(p for k_, _, p in ALLPLAN_KATALOGE if k_ == key)
            fam = {k: x for k, x in schicht_familien(c).items() if key in ("kukat1", "kukat2", "kukat3") and any(passt(g) for g in x["kgs"])}
            if fam and not kg:   # Ebene 0: Schichtmaterialien für mehrschichtige Bauteile – Dicke kommt aus der Allplan-Schicht
                stamm.append(zeile("k000", "Schichtmaterialien (je Schicht wählen, Dicke aus Allplan)"))
                gr_ = list(KOPF_I)
                for gn, gname in enumerate([k_ for k_, _ in SCHICHT_KATEGORIEN] + ["Sonstiges"], 1):
                    L_ = [(k, x) for k, x in fam.items() if x["gruppe"] == gname]
                    if not L_:
                        continue
                    dn = f"k000{gn:02d}"
                    gr_.append(zeile(dn, gname))
                    kat, ktx = list(KOPF_E), [b"#", b"REFNAM            LANGT", b""]
                    for k, x in sorted(L_, key=lambda t: (-t[1]["haeufig"], t[0].lower())):   # häufig gebrauchte zuerst
                        dd = _sch_dicken(x)
                        kat.append(zeile(k, x["text"]))
                        ktx.append(enc(k.ljust(18)))
                        zeilen = textwrap.wrap(ers(f"{x['name']}: {x['text']}"), 40) + textwrap.wrap(ers("Dicke kommt aus der Allplan-Schicht."), 40)
                        if dd:
                            zeilen += textwrap.wrap(ers("Im Baukasten: " + ", ".join(f"{v:g}".replace(".", ",") for v in dd) + " cm"), 40)
                        zeilen += textwrap.wrap(ers("KG " + ", ".join(sorted(x["kgs"]))), 40)
                        ktx += [enc(" " * 18 + z_[:40]) for z_ in zeilen]
                    z.writestr(f"{key}/{dn}.kat", crlf(kat))
                    z.writestr(f"{key}/{dn}.ktx", crlf(ktx))
                z.writestr(f"{key}/k000.kat", crlf(gr_))
                n_ges += len(fam)
            for r in sel:
                kgs.setdefault(r["code"][:3], {}).setdefault(r["code"][:6], []).append(r)
            for kg3, vorlagen in kgs.items():      # Ebene 1: Kostengruppe, z. B. „331 Tragende Außenwände“ → Datei k331.kat
                stamm.append(zeile(f"k{kg3}", f"{kg3} {KG_NAMEN.get(kg3, '')}".strip()))
                zweig = list(KOPF_I)
                for vid, els in vorlagen.items():  # Ebene 2: Vorlage, z. B. „331.02 AW monolithisch“ → Datei k33102.kat
                    dn = "k" + vid.replace(".", "")
                    zweig.append(zeile(dn, f"{vid} {VNAMEN.get(vid, '')}".strip()))
                    kat, ktx = list(KOPF_E), [b"#", b"REFNAM            LANGT", b""]
                    vn = VNAMEN.get(vid, "")
                    for r in els:                  # Ebene 3: Element 331.02.004
                        ref = r["code"][:17].ljust(18)
                        txt = (r["bez"] or r["kurz"])
                        txt = txt[len(vn):].lstrip(", ") if vn and txt.startswith(vn) and len(txt) > len(vn) + 2 else r["kurz"]   # Vorlage steht eine Ebene höher
                        kat.append(zeile(ref, f"{r['code']} {txt}"))
                        ktx.append(enc(ref))
                        zeilen = []
                        for absatz in (r["bez"] or r["kurz"], *(r["lang"] or "").split("\n")):
                            zeilen += textwrap.wrap(ers(absatz), 40) or [""]
                        zeilen.append(ers(f"Einheit: {r['einheit']}, KG {r['kg']}"))
                        zeilen.append(ers("Bestandteile je " + r["einheit"] + ":"))
                        for t in T.get(r["code"], []):
                            zeilen += textwrap.wrap(ers(f"{str(round(t['faktor'], 3)).replace('.', ',')} {t['einheit']} {t['kurz']}"), 40)
                        ktx += [enc(" " * 18 + x[:40]) for x in zeilen]
                    z.writestr(f"{key}/{dn}.kat", crlf(kat))
                    z.writestr(f"{key}/{dn}.ktx", crlf(ktx))
                z.writestr(f"{key}/k{kg3}.kat", crlf(zweig))
            N = key.upper()
            z.writestr(f"{key}/{N}.KAT", crlf(stamm))
            z.writestr(f"{key}/{N}.KTX", crlf([b"#", b"REFNAM            LANGT", b""]))
            z.writestr(f"{key}/{N}.KTM", KTM)
            n_ges += len(sel)
            uebersicht.append(f"  {key}  {titel}: {len(sel)} Eintraege")
        hilfe = ("Bauteilkataloge der Bauplattform fuer Allplan\n\n" + "\n".join(uebersicht) + """

Einrichten (einmal):
1. Die Ordner kukat1 ... kukat5 in den Buerostandard kopieren (...\\Allplan\\Daten\\std\\).
   Liegen dort schon eigene Kundenkataloge, diese vorher sichern.
2. Allplan: Optionen -> Kataloge -> Katalogzuordnung:
     Wand -> Kundenkatalog 1, Decke/Bodenplatte -> 2, Dach -> 3, Fenster/Tuer/Oeffnung -> 4, Sonstiges -> 5.
3. Beim Bauteil unter Material/Qualitaet den Eintrag waehlen. Je Vorlage stehen nur die gaengigen Aufbauten
   drin; die genaue Ausfuehrung (Schichten) legt man spaeter in den Baukosten mit dem Baustein-Knopf fest.

Mehrschichtige Bauteile: Ganz oben im Katalog stehen die Schichtmaterialien (S-...). Je Schicht eins waehlen;
die Dicke nimmt die Bauplattform aus der Allplan-Schicht. Beim IFC-Import wird daraus der Aufbau zusammengesetzt.
Ein ganzes Element (z. B. 331.01.001) in einer Schicht hat Vorrang.

Rueckweg: Der Text beginnt mit dem Code (z. B. 331.02.004). Im IFC-Export steht er am Material bzw. an der
Qualitaet; die Baukosten der Bauplattform uebernehmen beim IFC-Import genau diesen Aufbau mit Preis.

Aufbau: KUKATn.KAT ist das Verzeichnis (erste Zeile "*") mit den Kostengruppen; jede Zeile verweist auf eine
Datei im selben Ordner (k331.kat -> Vorlagen, k33101.kat -> Eintraege). Immer den ganzen Ordner kopieren.
""")
        z.writestr("LIESMICH.txt", hilfe.replace("\n", "\r\n").encode("cp1252", "replace"))
    return buf.getvalue(), n_ges


_VB_KOPF = re.compile(r"^(\d{1,2}) (\S.*)$")


def vorbem_katalog(c):
    """Die Vorbemerkungen der Bauplattform als Katalogzeilen für die Kopierquelle der Ausschreibung (ziehen ins LV als Art „V“).
    Gibt (Kennung des Stands, Zeilen) zurück; Zeile = [nr, gewerk, typ, ebene, oz, kurz, lang, art, einheit, kg, ep_von, ep, ep_bis].
    „Allgemeine Vorbemerkungen“ je Abschnitt eine Zeile (einzeln ziehbar), die Muster und jeder Leistungsbereich je eine Zeile.
    Gewerke beginnen mit „VB“ – daran erkennt die Ausschreibung die Vorbemerkung (im Druck abschaltbar: Druck-Layout „Vorbemerkungen im LV“)."""
    R = [{"key": r["key"], "titel": r["titel"], "text": r["text"]} for r in c.execute("SELECT key, titel, text FROM pdb_vorbemerkung ORDER BY sort, key").fetchall()]
    import hashlib
    kennung = hashlib.sha1(json.dumps(R, ensure_ascii=False).encode()).hexdigest()[:10]
    Z = []
    def z(gew, typ, ebene, oz, kurz, lang="", art="T"):
        Z.append([len(Z), gew, typ, ebene, oz[:40], kurz[:500], lang, art if typ == "pos" else "N", "", "", None, None, None])
    allg = [r for r in R if not r["key"].isdigit()]
    lb = [r for r in R if r["key"].isdigit()]
    z("VB1", "gewerk", 0, "VB1", "Allgemeine Vorbemerkungen und Muster")
    for r in allg:
        z("VB1", "titel", 1, r["key"].upper(), r["titel"])
        if r["key"] != "avb":
            z("VB1", "pos", 2, r["key"].upper(), r["titel"], r["text"].strip())
            continue
        kopf, teil = None, []
        def weg():
            if kopf and "\n".join(teil).strip():
                z("VB1", "pos", 2, kopf[0], kopf[1], "\n".join(teil).strip())
        for zeile in r["text"].strip().splitlines()[1:]:   # erste Zeile = Überschrift
            m = _VB_KOPF.match(zeile)
            if m or zeile.startswith("Projektbezogene Angaben"):
                weg()
                kopf, teil = ((m[1], m[0]) if m else ("0", zeile)), []
            else:
                teil.append(zeile)
        weg()
    if lb:
        z("VB2", "gewerk", 0, "VB2", "Technische Vorbemerkungen je Leistungsbereich")
        for r in lb:
            z("VB2", "pos", 1, r["key"], r["titel"], r["text"].strip())
    return kennung, Z


def vorbem_fremd(c):
    """Vorbemerkungen aus eingelesenen Katalogen (z. B. sirAdos Vorbemerkungen, Ausschreibung → Kataloge) je Leistungsbereich:
    {lb: {key, titel, text, quelle}}. Der Leistungsbereich steht im Gewerk („012“) oder vorn in OZ bzw. Kurztext der Texte.
    Die Texte bleiben in der Datenbank des Büros (lizenziert) – hier nur gelesen."""
    try:
        K = c.execute("SELECT id, quelle, name FROM ava_kataloge WHERE art='vorbemerkungen' AND datei NOT LIKE 'bauplattform:%' ORDER BY id").fetchall()
    except Exception:   # noqa: BLE001 – ohne Ausschreibung keine eingelesenen Kataloge
        return {}
    out = {}
    for k in K:
        gw = {r["gewerk"]: r for r in c.execute("SELECT gewerk, oz, kurz FROM ava_katalog WHERE katalog_id=? AND typ='gewerk'", (k["id"],)).fetchall()}
        for r in c.execute("SELECT gewerk, oz, kurz, lang FROM ava_katalog WHERE katalog_id=? AND typ='pos' ORDER BY nr", (k["id"],)).fetchall():
            g = gw.get(r["gewerk"])
            m = re.match(r"(\d{3})(?!\d)", (g["oz"] or "").strip()) if g else None
            m = m or re.match(r"(\d{3})(?!\d)", (r["oz"] or "").strip()) or re.match(r"(?:LB\s*)?(\d{3})(?!\d)", (r["kurz"] or "").strip())
            if not m:
                continue
            lb = m.group(1)
            e = out.setdefault(lb, {"key": lb, "titel": (g["kurz"] if g else "") or r["kurz"] or f"Leistungsbereich {lb}", "text": "", "quelle": k["quelle"] or k["name"]})
            if e["quelle"] != (k["quelle"] or k["name"]):   # erster Katalog gilt
                continue
            lang, kurz = (r["lang"] or "").strip(), (r["kurz"] or "").strip()
            stueck = lang if kurz and lang.startswith(kurz) else "\n".join(x for x in (kurz, lang) if x)
            e["text"] = (e["text"] + "\n\n" + stueck).strip()
    return {lb: e for lb, e in out.items() if e["text"]}


def vorbemerkungen(c, key=None):
    """Vorbemerkungen der Baudaten; fehlt eine eigene, gilt die aus einem eingelesenen Katalog (z. B. sirAdos) – mit „quelle“."""
    if key:
        r = c.execute("SELECT key, titel, text FROM pdb_vorbemerkung WHERE key=?", (key,)).fetchone()
        return r.dict() if r else vorbem_fremd(c).get(key)
    eigen = [r.dict() for r in c.execute("SELECT key, titel, length(text) AS laenge FROM pdb_vorbemerkung ORDER BY sort, key").fetchall()]
    da = {x["key"] for x in eigen}
    return eigen + [{"key": lb, "titel": e["titel"], "laenge": len(e["text"]), "quelle": e["quelle"]} for lb, e in sorted(vorbem_fremd(c).items()) if lb not in da]


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


def register_preise(app):
    """Eigene Preise einer Position (Erfahrungspreise aus Vergaben): notieren, löschen, Firmenvorschläge.
    Pfade unter /api/baudaten/… (Detailfenster in Ausschreibung und Baukosten) und die alten der Baudaten-App."""
    from datetime import date

    from flask import g, jsonify, request

    from bpcore import db
    import common as C   # Plattform-App (Name, Protokoll)

    def _s(x, n=500):
        return " ".join(str(x or "").split())[:n]

    def _fn(x):
        try:
            v = float(str(x).replace(",", "."))
            return v if v == v else None
        except (TypeError, ValueError):
            return None

    def preis_neu(i):
        """Eigenen Erfahrungspreis (z. B. Auftragspreis einer Vergabe) zur Position notieren."""
        if i < 0:
            return jsonify(error="Positionen eines Katalogs der Ausschreibung (z. B. sirAdos) zuerst in den Baudaten als eigene Position übernehmen."), 400
        b = request.get_json(silent=True) or {}
        ep = _fn(b.get("ep"))
        if ep is None or ep < 0:
            return jsonify(error="Einheitspreis fehlt"), 400
        with db.tx() as c:
            if not c.execute("SELECT 1 FROM pdb_position WHERE id=?", (i,)).fetchone():
                return jsonify(error="Position nicht gefunden"), 404
            firma = _s(b.get("firma"), 200)
            if firma and b.get("neue_firma") and not c.execute("SELECT 1 FROM contacts WHERE name=?", (firma,)).fetchone():   # unbekannte Firma: in Adressen anlegen
                pos = c.execute("SELECT gewerk, lb_name FROM pdb_position_ansicht WHERE id=?", (i,)).fetchone()
                ts = db.now_iso()
                c.execute("INSERT INTO contacts(name, trade, extra, created, updated) VALUES(?,?,?,?,?) ON CONFLICT (name) DO NOTHING",
                          (firma, _s(b.get("gewerk") or (pos and (pos["gewerk"] or pos["lb_name"])) or "", 300), "{}", ts, ts))
                C.audit(C.full_name(g.user), "adressen", "Firma angelegt (Baudaten)", firma)
            c.execute("INSERT INTO pdb_preis(position_id, ep, datum, project_id, firma, menge, notiz, created, user_name) VALUES(?,?,?,?,?,?,?,?,?)",
                      (i, ep, _s(b.get("datum"), 10) or date.today().isoformat(), b.get("project_id") if isinstance(b.get("project_id"), int) else None,
                       firma, _fn(b.get("menge")), _s(b.get("notiz"), 500), db.now_iso(), C.full_name(g.user)))
            return jsonify(position(c, i))

    def firmen():
        """Firmen aus den Adressen für „Eigene Preise“ einer Position: zuerst die, die hier schon Preise haben,
        dann die mit passendem Gewerk (Leistungsbereich / Verrechnungslohn), dann alle übrigen."""
        pid = request.args.get("position", type=int)
        with db.tx() as c:
            pos = c.execute("""SELECT p.lb_nr, p.katalog, p.lb_name, p.gewerk, COALESCE(l.name, '') AS lohn FROM pdb_position_ansicht p
                               LEFT JOIN pdb_lohn l ON l.gewerk = p.gewerk WHERE p.id=?""", (pid,)).fetchone() if pid else None
            schon = set()
            if pos:
                schon = {(r["firma"] or "").lower() for r in c.execute("""SELECT DISTINCT x.firma FROM pdb_preis x JOIN pdb_position p ON p.id = x.position_id
                                                                         WHERE p.katalog=? AND p.lb_nr=?""", (pos["katalog"], pos["lb_nr"])).fetchall()}
            rows = c.execute("SELECT name, trade FROM contacts ORDER BY name").fetchall()
        w = {x[:5] for x in re.split(r"[^a-zäöüß]+", " ".join(str(pos[k] or "") for k in ("lb_name", "gewerk", "lohn")).lower() if pos else "")
             if len(x) > 3 and x not in ("arbeiten", "und", "oder", "sonstige")}
        out = []
        for r in rows:
            t = {x[:5] for x in re.split(r"[^a-zäöüß]+", (r["trade"] or "").lower()) if len(x) > 3}
            rang = 0 if r["name"].lower() in schon else 1 if w & t else 2
            out.append({"name": r["name"], "gewerk": r["trade"] or "", "rang": rang})
        out.sort(key=lambda x: (x["rang"], x["name"].lower()))
        return jsonify(out)

    def preis_weg(k):
        with db.tx() as c:
            r = c.execute("SELECT position_id, user_name FROM pdb_preis WHERE id=?", (k,)).fetchone()
            if not r:
                return jsonify(error="Nicht gefunden"), 404
            if not g.user["is_admin"] and r["user_name"] != C.full_name(g.user):
                return jsonify(error="Nur eigene Einträge löschen."), 403
            c.execute("DELETE FROM pdb_preis WHERE id=?", (k,))
            return jsonify(position(c, r["position_id"]))

    for pfx, sfx in (("/api/baudaten", ""), ("/api", "_alt")):
        app.add_url_rule(f"{pfx}/position/<int(signed=True):i>/preis", "preis_neu" + sfx, preis_neu, methods=["POST"])
        app.add_url_rule(f"{pfx}/firmen", "firmen" + sfx, firmen, methods=["GET"])
        app.add_url_rule(f"{pfx}/preis/<int:k>", "preis_weg" + sfx, preis_weg, methods=["DELETE"])


def register(app):
    """Endpunkte für den Auswahldialog (static/pdbwahl.js) in einer anderen App (Ausschreibung, Baukosten)."""
    from flask import jsonify, request
    from bpcore import db
    register_korb(app)
    register_preise(app)

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

    @app.get("/api/baudaten/position/<int(signed=True):i>")
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
