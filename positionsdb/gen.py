"""Erzeugt aus den Datendateien (daten/lb_*.py) die Migration mit den Katalogdaten der Positionsdatenbank
und eine CSV-Datei zum Durchsehen.

    python3 positionsdb/gen.py            # schreibt shared/bpcore/migrationen/0025_positionsdb_daten.sql + positionsdb/positionsdb.csv

Preisbildung (netto, ohne MwSt., Preisstand siehe STAND):
    EP mittel = Zeitansatz [h/E] × Verrechnungslohn des Gewerks [€/h] + (Stoff + Gerät) [€/E] × (1 + STOFFZUSCHLAG)
    EP von / bis = EP mittel × Faktor der Genauigkeitsklasse (A, B, C)
Der Verrechnungslohn enthält Lohn, Lohnzusatz-/Lohnnebenkosten, Gemeinkosten, Wagnis und Gewinn.
"""
import csv
import glob
import importlib.util
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)

STAND = "2026-11"
INDEX = 141.7            # Baupreisindex Wohngebäude Deutschland, August 2026 (2021 = 100), Destatis PM 360 vom 09.10.2026
STOFFZUSCHLAG = 0.12     # Zuschlag auf Stoff- und Gerätekosten (Gemeinkosten, Wagnis, Gewinn)

# Verrechnungslöhne netto €/h, Preisstand 11/2026 (Ecklohn Bau ab 01.04.2026: 24,60 €; Handwerksbetriebe 2026 üblich 45–80 €/h)
LOEHNE = {
    "baustelle": ("Baustelleneinrichtung", 66), "geruest": ("Gerüstbau", 56), "erdbau": ("Erdbau / Tiefbau", 70),
    "kanal": ("Kanal- und Leitungsbau", 70), "spezialtiefbau": ("Spezialtiefbau", 78), "rohbau": ("Rohbau (Maurer, Beton)", 68),
    "naturstein": ("Naturwerkstein", 62), "zimmerer": ("Zimmerer / Holzbau", 66), "stahlbau": ("Stahlbau", 70),
    "abdichtung": ("Bauwerksabdichtung", 64), "dach": ("Dachdecker", 64), "klempner": ("Klempner", 66),
    "putz": ("Putz / WDVS", 60), "fliesen": ("Fliesenleger", 58), "estrich": ("Estrichleger", 60),
    "fenster": ("Fensterbau", 64), "tischler": ("Tischler", 62), "parkett": ("Parkettleger", 58),
    "beschlag": ("Beschläge", 62), "rollladen": ("Rollladen / Sonnenschutz", 62), "metallbau": ("Metallbau / Schlosser", 66),
    "glas": ("Glaser", 64), "reinigung": ("Baureinigung", 42), "maler": ("Maler / Lackierer", 55),
    "boden": ("Bodenleger", 56), "fassade": ("Fassadenbau (VHF)", 64), "trockenbau": ("Trockenbau", 60),
    "heizung": ("Heizungsbau", 72), "sanitaer": ("Sanitär", 72), "daemmtga": ("Technische Dämmung", 62),
    "elektro": ("Elektro", 70), "msr": ("Gebäudeautomation / MSR", 80), "lueftung": ("Lüftung / Klima", 72),
    "aufzug": ("Aufzugsbau", 82), "aussen": ("Außenanlagen / Pflaster", 60), "abbruch": ("Abbruch / Rückbau", 58),
    "brandschutz": ("Brandschutz / Löschanlagen", 70),
}

# Genauigkeitsklasse: (Faktor von, Faktor bis, Beschreibung)
GENAUIGKEIT = {
    "A": (0.85, 1.20, "Standardleistung, gut vergleichbar, etwa −15 % / +20 %"),
    "B": (0.78, 1.30, "übliche Leistung mit Produkt- oder Mengeneinfluss, etwa −22 % / +30 %"),
    "C": (0.68, 1.50, "stark produkt-, mengen- oder ortsabhängig, etwa −32 % / +50 %"),
}

EINHEITEN = {"m²", "m³", "m", "St", "kg", "t", "psch", "h", "Wo", "StWo", "mWo", "m²Wo", "m³Wo", "Tag", "Mon", "l", "kW", "kWp"}


# Kopf der Daten-Migration: Schema-Ergänzungen seit 0023 und Austausch des Katalogs 'gk3' (eigene und importierte Positionen bleiben)
KOPF = """-- Kurztext höchstens 70 Zeichen, ausführliche Bezeichnung in bez
ALTER TABLE pdb_position ADD COLUMN IF NOT EXISTS bez TEXT NOT NULL DEFAULT '';
DROP INDEX IF EXISTS pdb_position_suche;
CREATE INDEX pdb_position_suche ON pdb_position USING gin (to_tsvector('german', kurz || ' ' || bez || ' ' || lang));
DROP VIEW IF EXISTS pdb_position_ansicht;
DROP VIEW IF EXISTS pdb_alle;
CREATE VIEW pdb_alle AS
  SELECT id, katalog, code, grund_id, lb_nr, gruppe, titel, kurz, bez, lang, einheit, kg, gewerk, h, stoff, geraet, ep_von, ep_mittel, ep_bis,
         genauigkeit, tags, hinweis, quelle, preisstand, aktiv, favorit, created, updated, updated_by
  FROM pdb_position
  UNION ALL
  SELECT -k.id, 'ava' || k.katalog_id, k.oz, NULL, k.gewerk, k.gewerk, COALESCE(gw.kurz, ''), k.kurz, '', k.lang, k.einheit, k.kg, '', 0, 0, 0,
         k.ep_von, k.ep, k.ep_bis, 'B', '', '', 'import', COALESCE(substr(kk.stand, 1, 7), ''), 1, 0, NULL, NULL, ''
  FROM ava_katalog k
  JOIN ava_kataloge kk ON kk.id = k.katalog_id
  LEFT JOIN ava_katalog gw ON gw.katalog_id = k.katalog_id AND gw.typ = 'gewerk' AND gw.gewerk = k.gewerk
  WHERE k.typ = 'pos' AND k.art <> 'T';
CREATE VIEW pdb_position_ansicht AS
  SELECT p.*, k.name AS katalog_name, k.art AS katalog_art, btrim(COALESCE(gt.text, '') || ' ' || p.lang) AS lang_voll, l.name AS lb_name, gr.name AS gruppe_name, lo.verrechnungslohn,
         (SELECT COUNT(*) FROM pdb_preis x WHERE x.position_id = p.id) AS n_preise,
         (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY x.ep) FROM pdb_preis x WHERE x.position_id = p.id) AS ep_eigen_median
  FROM pdb_alle p
  JOIN pdb_kataloge k ON k.key = p.katalog
  LEFT JOIN pdb_leistungsbereich l ON l.nr = p.lb_nr
  LEFT JOIN pdb_gruppe gr ON gr.nr = p.gruppe
  LEFT JOIN pdb_lohn lo ON lo.gewerk = p.gewerk
  LEFT JOIN pdb_grundtext gt ON gt.id = p.grund_id;

-- Katalog 'gk3' neu einspielen (Favoriten und Ausblendungen der alten Fassung gehen dabei verloren; eigene Preise bleiben nur an eigenen Positionen)
DELETE FROM pdb_position WHERE katalog = 'gk3';
DELETE FROM pdb_grundtext;
DELETE FROM pdb_gruppe;
DELETE FROM pdb_leistungsbereich;
"""


def lade_lbs():
    out = []
    for f in sorted(glob.glob(os.path.join(HIER, "daten", "lb_*.py"))):
        spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        out.extend(m.LBS)
    return out


def rund(x):
    """Preise wie in der Praxis: unter 10 € auf 0,05, unter 100 € auf 0,10, darüber auf 1 €."""
    if x < 10:
        return round(round(x * 20) / 20, 2)
    if x < 100:
        return round(x, 1)
    if x < 1000:
        return float(round(x))
    return float(round(x / 5) * 5)


def fuelle(t, v):
    try:
        return t.format(**v)
    except KeyError as e:
        raise SystemExit(f"Platzhalter {e} fehlt in Variante {v} für Text: {t[:80]}")


KURZ_MAX = 70   # GAEB: Kurztext höchstens 70 Zeichen – der vollständige Inhalt steht im Lang- bzw. Folgetext
ABK = [(r"\beinschließlich\b", "inkl."), (r"\bEinschließlich\b", "inkl."), (r" bzw\. ", "/"), (r"\bbis (?=\d)", "≤"), (r"\bbis zu (?=\d)", "≤"),
       (r"\büber (?=\d)", ">"), (r"\bab (?=\d)", "≥"), (r"\s×\s", "×"), (r"\bDurchmesser\b", "Ø"), (r"\bTeilflächen\b", "TF"),
       (r"\bim Bestand\b", "Bestand"), (r"\bHöhe\b", "H"), (r"\bDicke\b", "d"), (r"\bBreite\b", "B"), (r"\bLänge\b", "L"),
       (r"Wärmedämmverbundsystem", "WDVS"), (r"Fußbodenheizung", "FBH"), (r"\bGipskarton", "GK"), (r"\bMineralwolle\b", "MW"),
       (r"\bStahlbeton", "StB"), (r"Brettschichtholz", "BSH"), (r"Konstruktionsvollholz", "KVH"), (r"Kalksand-", "KS-"),
       (r"\bliefern und montieren\b", "liefern+mont."), (r"\bmontieren\b", "mont."), (r"\bherstellen\b", "herst."),
       (r"\bAußenwand", "AW-"), (r"\bInnenwand", "IW-"), (r"\bnichttragend", "n.tr."), (r"\bAnschluss\b", "Anschl."),
       (r"\bDämmung\b", "Dämm."), (r"\bAbrechnung\b", "Abr."), (r"\bFestigkeitsklasse\b", "FK"), (r"\bRohdichteklasse\b", "RDK"),
       (r"\s+,", ","), (r"\s{2,}", " ")]


def _abk(x):
    for rx, rep in ABK:
        x = re.sub(rx, rep, x)
    return x.replace("AW- ", "AW ").replace("IW- ", "IW ").strip()


def kurz70(teile, zusaetze):
    """Kurztext ≤ KURZ_MAX. teile: [(Text, variabel)] der Grundbezeichnung (variabel = mit Platzhaltern, z. B. „d = 24 cm“).
    Reihenfolge: Abkürzungen → feste Nebenangaben weglassen → Hauptbegriff kürzen → Zusätze kürzen.
    Variable Angaben und Ausführungszusätze bleiben, damit die Positionen unterscheidbar bleiben."""
    voll = lambda T, Z: ", ".join([t for t, _ in T if t] + list(Z))
    t = voll(teile, zusaetze)
    if len(t) <= KURZ_MAX:
        return t
    T = [(_abk(x), v) for x, v in teile]
    Z = [_abk(z) for z in zusaetze]
    for i in range(len(T) - 1, 0, -1):   # feste Nebenangaben (ohne Platzhalter) von hinten weglassen
        if len(voll(T, Z)) <= KURZ_MAX:
            break
        if not T[i][1]:
            T[i] = ("", False)
    t = voll(T, Z)
    if len(t) > KURZ_MAX:   # Hauptbegriff kürzen (mindestens 14 Zeichen)
        h = T[0][0]
        platz = max(14, len(h) - (len(t) - KURZ_MAX))
        if platz < len(h):
            T[0] = (h[:platz - 1].rsplit(" ", 1)[0].rstrip(",;-/ ") + "…", T[0][1])
        t = voll(T, Z)
    k = len(Z) - 1
    while len(t) > KURZ_MAX and k >= 0:   # Zusätze von hinten kürzen
        z = Z[k]
        if len(z) > 8:
            Z[k] = z[:max(6, len(z) - (len(t) - KURZ_MAX)) - 1].rstrip(" ,/") + "."
        k -= 1
        t = voll(T, Z)
    return t[:KURZ_MAX]


def kombis(achsen):
    """Kartesisches Produkt der Ausführungsachsen; je Kombination eine Liste der gewählten Optionen."""
    out = [[]]
    for ax in achsen or []:
        out = [k + [o] for k in out for o in ax]
    # unvereinbare Optionen: "ohne": [Kurztext-Zusätze anderer Achsen], z. B. Tunable White nicht mit fester Lichtfarbe
    return [k for k in out if not any(x.get("k") in o.get("ohne", ()) for o in k for x in k if x is not o)]


def positionen(lbs):
    """Je Grundposition (pi) → Variante (vi, Platzhalter im Grundtext) → Kombination der Achsen (ai, Folgetext).
    Code: LB.GG.PPP.VVAAA – die ersten vier Teile (LB.GG.PPP.VV) bezeichnen den Grundtext."""
    rows, grund, codes = [], {}, set()
    for lb in lbs:
        if lb["lohn"] not in LOEHNE:
            raise SystemExit(f"LB {lb['nr']}: unbekanntes Gewerk {lb['lohn']}")
        for gi, gr in enumerate(lb["gruppen"], 1):
            for pi, p in enumerate(gr["positionen"], 1):
                if pi > 999:
                    raise SystemExit(f"LB {lb['nr']}.{gi:02d}: mehr als 999 Grundpositionen")
                varianten = p.get("varianten") or [{}]
                if len(varianten) > 99:
                    raise SystemExit(f"LB {lb['nr']}.{gi:02d}.{pi:03d}: mehr als 99 Varianten")
                for vi, v in enumerate(varianten, 1):
                    w = {**p, **v}
                    gid = f"{lb['nr']}.{gi:02d}.{pi:03d}.{vi:02d}"
                    gtext = fuelle(w["lang"], w).strip()
                    basis_kurz = fuelle(w["kurz"], w)
                    teile = [[fuelle(ch, w), "{" in ch] for ch in w["kurz"].split(", ")]
                    # Achsen, die eine Angabe selbst festlegen (z. B. Lichtfarbe, Rutschhemmung), entfernen sie aus Grund- und Kurztext:
                    # Option bzw. Achse mit "ersetze": [[Regex, Ersatz], …] – sonst widersprächen sich Grund- und Folgetext
                    for ax in w.get("achsen") or []:
                        for o in ax:
                            for rx, rep in o.get("ersetze", []):
                                gtext = re.sub(rx, rep, gtext)
                                basis_kurz = re.sub(rx, rep, basis_kurz)
                                for tl in teile:
                                    tl[0] = re.sub(rx, rep, tl[0])
                    gtext = re.sub(r"\s+([,.])", r"\1", re.sub(r",\s*,", ",", re.sub(r"\s{2,}", " ", gtext))).strip()
                    basis_kurz = re.sub(r",\s*,", ",", re.sub(r"\s{2,}", " ", basis_kurz)).strip(" ,")
                    teile = [(re.sub(r"\s{2,}", " ", x).strip(" ,"), v) for x, v in teile if x.strip(" ,")] or [(basis_kurz, False)]
                    ks = kombis(w.get("achsen"))
                    if len(ks) > 999:
                        raise SystemExit(f"{gid}: mehr als 999 Achsen-Kombinationen ({len(ks)})")
                    for ai, k in enumerate(ks, 1):
                        code = f"{gid}{ai:03d}"
                        if code in codes:
                            raise SystemExit(f"doppelter Code {code}")
                        codes.add(code)
                        lohn = w.get("lohn", lb["lohn"])
                        h, stoff, geraet = float(w.get("h", 0)), float(w.get("mat", 0)), float(w.get("geraet", 0))
                        gen, kg, einheit, tags = w.get("gen", "B"), str(w.get("kg") or lb.get("kg") or ""), w["einheit"], list(w.get("tags", []))
                        zus, folge = [], []
                        for o in k:   # Faktoren zuerst, dann Zu-/Abschläge
                            h *= o.get("fh", 1); stoff *= o.get("fm", 1); geraet *= o.get("fg", 1)
                        for o in k:
                            h += o.get("h", 0); stoff += o.get("mat", 0); geraet += o.get("geraet", 0)
                            if o.get("gen") and o["gen"] > gen:
                                gen = o["gen"]
                            kg = str(o.get("kg") or kg); einheit = o.get("einheit") or einheit; lohn = o.get("lohn") or lohn
                            tags += o.get("tags", [])
                            if o.get("k"):
                                zus.append(o["k"])
                            if o.get("t"):
                                folge.append(o["t"])
                        kurz = kurz70(teile, zus)
                        if lohn not in LOEHNE:
                            raise SystemExit(f"{code}: unbekanntes Gewerk {lohn}")
                        if einheit not in EINHEITEN:
                            raise SystemExit(f"{code}: unbekannte Einheit {einheit}")
                        if not re.fullmatch(r"[1-7]\d\d", kg):
                            raise SystemExit(f"{code}: DIN-276-Kostengruppe fehlt oder ungültig ({kg})")
                        ep = h * LOEHNE[lohn][1] + (stoff + geraet) * (1 + STOFFZUSCHLAG)
                        if ep <= 0:
                            raise SystemExit(f"{code}: kein Preis")
                        fv, fb, _ = GENAUIGKEIT[gen]
                        grund[gid] = gtext
                        rows.append({
                            "code": code, "grund_id": gid, "lb_nr": lb["nr"], "gruppe": f"{lb['nr']}.{gi:02d}", "gruppe_name": gr["name"],
                            "kurz": kurz, "bez": ", ".join([t for t, _ in teile] + zus) if len(", ".join([t for t, _ in teile] + zus)) > len(kurz) else "", "lang": " ".join(folge), "einheit": einheit, "kg": kg,
                            "gewerk": lohn, "h": round(h, 3), "stoff": round(stoff, 2), "geraet": round(geraet, 2),
                            "ep_von": rund(ep * fv), "ep_mittel": rund(ep), "ep_bis": rund(ep * fb), "genauigkeit": gen,
                            "tags": ",".join(dict.fromkeys(tags)), "hinweis": fuelle(w.get("hinweis", ""), w),
                        })
    return rows, grund


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def main():
    lbs = lade_lbs()
    lbs.sort(key=lambda x: x["nr"])
    nrs = [x["nr"] for x in lbs]
    if len(nrs) != len(set(nrs)):
        raise SystemExit("Leistungsbereich doppelt: " + ", ".join(sorted({x for x in nrs if nrs.count(x) > 1})))
    rows, grund = positionen(lbs)
    if "--pruefen" in sys.argv:   # nur prüfen und Übersicht ausgeben, nichts schreiben
        nur = [a for a in sys.argv[1:] if a.isdigit()]
        for r in rows:
            if not nur or r["lb_nr"] in nur:
                print(f"{r['code']}  {r['einheit']:5} {r['ep_von']:>9} {r['ep_mittel']:>9} {r['ep_bis']:>9}  {r['genauigkeit']}  {r['kurz'][:80]}")
        print(f"OK: {len(lbs)} Leistungsbereiche, {len(rows)} Positionen")
        return
    sql = [
        "-- Bauplattform Positionsdatenbank: Katalogdaten (erzeugt mit positionsdb/gen.py – nicht von Hand ändern)",
        f"-- {len(lbs)} Leistungsbereiche, {len(rows)} Positionen, Preisstand {STAND}, Baupreisindex {INDEX} (2021 = 100).",
        "-- Eigene Texte und eigene Kalkulation; keine Übernahme aus kommerziellen Datenbanken.",
        "",
        KOPF,
    ]
    sql.append(f"UPDATE pdb_katalog SET preisstand = {q(STAND)}, index_basis = {INDEX} WHERE key = 'gk3';")
    sql.append("INSERT INTO pdb_meta(key, value) VALUES " + ", ".join(
        f"({q(k)}, {q(v)})" for k, v in [("preisstand", STAND), ("index_basis", str(INDEX)), ("index_name", "Baupreisindex Wohngebäude (Destatis, 2021 = 100)"),
                                          ("stoffzuschlag", str(STOFFZUSCHLAG)), ("genauigkeit", json.dumps({k: list(v) for k, v in GENAUIGKEIT.items()}, ensure_ascii=False)),
                                          ("katalog_version", f"{STAND}.1")])
               + " ON CONFLICT(key) DO UPDATE SET value = excluded.value;")
    sql.append("INSERT INTO pdb_lohn(gewerk, name, verrechnungslohn, stand) VALUES\n" + ",\n".join(
        f"  ({q(k)}, {q(n)}, {v}, {q(STAND)})" for k, (n, v) in LOEHNE.items()) + "\nON CONFLICT(gewerk) DO NOTHING;")
    sql.append("INSERT INTO pdb_leistungsbereich(nr, name, atv, gewerk, sort) VALUES\n" + ",\n".join(
        f"  ({q(x['nr'])}, {q(x['name'])}, {q(x.get('atv', ''))}, {q(x['lohn'])}, {int(x['nr'])})" for x in lbs) + "\nON CONFLICT(nr) DO UPDATE SET name = excluded.name, atv = excluded.atv, gewerk = excluded.gewerk;")
    grp = {}
    for r in rows:
        grp.setdefault(r["gruppe"], (r["lb_nr"], r["gruppe_name"]))
    sql.append("INSERT INTO pdb_gruppe(nr, lb_nr, name) VALUES\n" + ",\n".join(
        f"  ({q(k)}, {q(lb)}, {q(n)})" for k, (lb, n) in grp.items()) + "\nON CONFLICT(nr) DO NOTHING;")
    gl = list(grund.items())
    for i in range(0, len(gl), 500):
        sql.append("INSERT INTO pdb_grundtext(id, text) VALUES\n" + ",\n".join(f"  ({q(k)}, {q(t)})" for k, t in gl[i:i + 500]) + "\nON CONFLICT(id) DO NOTHING;")
    cols = ["code", "grund_id", "lb_nr", "gruppe", "kurz", "bez", "lang", "einheit", "kg", "gewerk", "h", "stoff", "geraet", "ep_von", "ep_mittel", "ep_bis", "genauigkeit", "tags", "hinweis"]
    for i in range(0, len(rows), 500):
        part = rows[i:i + 500]
        sql.append(f"INSERT INTO pdb_position(katalog, {', '.join(cols)}, quelle, preisstand) VALUES\n" + ",\n".join(
            "  ('gk3', " + ", ".join(q(r[c]) if isinstance(r[c], str) else str(r[c]) for c in cols) + f", 'katalog', {q(STAND)})" for r in part)
            + "\nON CONFLICT(katalog, code) DO NOTHING;")
    ziel = os.path.join(REPO, "shared", "bpcore", "migrationen", "0025_positionsdb_daten.sql")
    with open(ziel, "w", encoding="utf-8") as f:
        f.write("\n".join(sql) + "\n")
    with open(os.path.join(HIER, "positionsdb.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["code", "grund_id", "lb_nr", "gruppe", "gruppe_name", "kurz", "bez", "lang", "einheit", "kg", "gewerk", "h", "stoff", "geraet",
                                          "ep_von", "ep_mittel", "ep_bis", "genauigkeit", "tags", "hinweis"], delimiter=";")
        w.writeheader()
        w.writerows({**r, "lang": (grund[r["grund_id"]] + " " + r["lang"]).strip()} for r in rows)
    print(f"{len(lbs)} Leistungsbereiche, {len(rows)} Positionen → {os.path.relpath(ziel, REPO)}")
    per = {}
    for r in rows:
        per[r["lb_nr"]] = per.get(r["lb_nr"], 0) + 1
    print("  " + "  ".join(f"{k}:{v}" for k, v in sorted(per.items())))


if __name__ == "__main__":
    sys.exit(main())
