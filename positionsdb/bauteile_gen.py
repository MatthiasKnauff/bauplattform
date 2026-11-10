"""Bauteil-Baukasten: Vorlagen nach DIN 276 (3. Ebene) mit Schichten zur Auswahl. Jede Option einer Schicht hängt an
Positionen der Positionsdatenbank (Katalog 'gk3') mit einem Mengenfaktor – Menge der Position je Einheit des Bauteils.

    python3 positionsdb/bauteile_gen.py            # prüft alles und schreibt die Migration + positionsdb/bauteile.csv
    python3 positionsdb/bauteile_gen.py --pruefen  # nur prüfen und Übersicht ausgeben
    python3 positionsdb/bauteile_gen.py --pruefen kg_330.py   # nur eine Datendatei prüfen

Aus den Vorlagen entstehen
  1. der Baukasten (Tabelle pdb_vorlage): in den Baukosten je Bauteil einen Aufbau wählen, Preis live aus den Positionen,
  2. Standardelemente (Katalog 'gk3e' in pdb_position, Bestandteile in pdb_element_teil): übliche Kombinationen zum
     schnellen Auswählen und Durchsuchen – in Baudaten, Baukosten und als Kopierquelle in der AVA (dort in Positionen aufgelöst).

Preis eines Aufbaus = Σ Faktor × EP der Position (von, mittel, bis getrennt) – also immer passend zu den Positionspreisen.

Format der Datendateien positionsdb/bauteile/kg_*.py – je Datei eine Liste VORLAGEN:
    {"id": "331.01",                  # eindeutig: KG 3. Ebene + laufende Nummer
     "kg": "331", "name": "Außenwand Mauerwerk, verputzt", "einheit": "m²",
     "lang": "Beschreibung des Bauteils (eigener Text) …",
     "bezug": "Wie die Menge ermittelt wird, z. B. Wandfläche brutto, Öffnungen > 2,5 m² abgezogen",
     "fest": [["012.01.001.02001", 0.36]],        # optional: immer enthaltene Teile
     "schichten": [
        {"name": "Tragschicht", "optionen": [
            {"k": "KS 17,5", "t": "Kalksand-Plansteine, d = 17,5 cm", "teile": [["012.02.004.01001", 1.0]], "std": True},
            …]},
        {"name": "Innenseite", "optionen": [
            {"k": "", "t": "", "teile": []},          # „ohne“ ist erlaubt (k leer)
            …]}],
     "tags": ["neubau"]}
"std": True markiert die Optionen, aus denen Standardelemente gebildet werden (fehlt es in einer Schicht, zählen alle Optionen).
"""
import csv
import glob
import importlib.util
import itertools
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import gen  # noqa: E402  (Preisstand, Index, Rundung, Kurztext)

MIGRATION = "0032_bauteile.sql"
MAX_STD = 96   # höchstens so viele Standardelemente je Vorlage

KG2 = {"310": "Baugrube/Erdbau", "320": "Gründung, Unterbau", "330": "Außenwände/vertikale Baukonstruktionen, außen",
       "340": "Innenwände/vertikale Baukonstruktionen, innen", "350": "Decken/horizontale Baukonstruktionen", "360": "Dächer",
       "370": "Infrastrukturanlagen", "380": "Baukonstruktive Einbauten", "390": "Sonstige Maßnahmen für Baukonstruktionen",
       "410": "Abwasser-, Wasser-, Gasanlagen", "420": "Wärmeversorgungsanlagen", "430": "Raumlufttechnische Anlagen",
       "440": "Elektrische Anlagen", "450": "Kommunikations-, sicherheits- und informationstechnische Anlagen", "460": "Förderanlagen",
       "470": "Nutzungsspezifische und verfahrenstechnische Anlagen", "480": "Gebäude- und Anlagenautomation",
       "490": "Sonstige Maßnahmen für technische Anlagen", "510": "Erdbau", "520": "Gründung, Unterbau", "530": "Oberbau, Deckschichten",
       "540": "Baukonstruktionen", "550": "Technische Anlagen", "560": "Einbauten in Außenanlagen und Freiflächen"}
KG3 = {"311": "Herstellung", "312": "Umschließung", "313": "Wasserhaltung", "314": "Vortrieb", "319": "Sonstiges zur KG 310",
       "321": "Baugrundverbesserung", "322": "Flachgründungen und Bodenplatten", "323": "Tiefgründungen", "324": "Gründungsbeläge",
       "325": "Abdichtungen und Bekleidungen", "326": "Dränagen", "329": "Sonstiges zur KG 320",
       "331": "Tragende Außenwände", "332": "Nichttragende Außenwände", "333": "Außenstützen", "334": "Außenwandöffnungen",
       "335": "Außenwandbekleidungen, außen", "336": "Außenwandbekleidungen, innen", "337": "Elementierte Außenwandkonstruktionen",
       "338": "Lichtschutz zur KG 330", "339": "Sonstiges zur KG 330",
       "341": "Tragende Innenwände", "342": "Nichttragende Innenwände", "343": "Innenstützen", "344": "Innenwandöffnungen",
       "345": "Innenwandbekleidungen", "346": "Elementierte Innenwandkonstruktionen", "347": "Lichtschutz zur KG 340", "349": "Sonstiges zur KG 340",
       "351": "Deckenkonstruktionen", "352": "Deckenöffnungen", "353": "Deckenbeläge", "354": "Deckenbekleidungen",
       "355": "Elementierte Deckenkonstruktionen", "359": "Sonstiges zur KG 350",
       "361": "Dachkonstruktionen", "362": "Dachöffnungen", "363": "Dachbeläge", "364": "Dachbekleidungen",
       "365": "Elementierte Dachkonstruktionen", "366": "Lichtschutz zur KG 360", "369": "Sonstiges zur KG 360",
       "371": "Anlagen und Anlagenteile", "381": "Allgemeine Einbauten", "382": "Besondere Einbauten",
       "391": "Baustelleneinrichtung", "392": "Gerüste", "393": "Sicherungsmaßnahmen", "394": "Abbruchmaßnahmen",
       "395": "Instandsetzungen", "396": "Materialentsorgung", "397": "Zusätzliche Maßnahmen", "398": "Provisorische Baukonstruktionen",
       "411": "Abwasseranlagen", "412": "Wasseranlagen", "413": "Gasanlagen", "419": "Sonstiges zur KG 410",
       "421": "Wärmeerzeugungsanlagen", "422": "Wärmeverteilnetze", "423": "Raumheizflächen", "424": "Verkehrsheizflächen", "429": "Sonstiges zur KG 420",
       "431": "Lüftungsanlagen", "432": "Teilklimaanlagen", "433": "Klimaanlagen", "434": "Kälteanlagen", "439": "Sonstiges zur KG 430",
       "441": "Hoch- und Mittelspannungsanlagen", "442": "Eigenstromversorgungsanlagen", "443": "Niederspannungsschaltanlagen",
       "444": "Niederspannungsinstallationsanlagen", "445": "Beleuchtungsanlagen", "446": "Blitzschutz- und Erdungsanlagen", "449": "Sonstiges zur KG 440",
       "451": "Telekommunikationsanlagen", "452": "Such- und Signalanlagen", "453": "Zeitdienstanlagen", "454": "Elektroakustische Anlagen",
       "455": "Audiovisuelle Medien- und Antennenanlagen", "456": "Gefahrenmelde- und Alarmanlagen", "457": "Datenübertragungsnetze", "459": "Sonstiges zur KG 450",
       "461": "Aufzugsanlagen", "462": "Fahrtreppen, Fahrsteige", "463": "Befahranlagen", "464": "Transportanlagen", "469": "Sonstiges zur KG 460",
       "471": "Küchentechnische Anlagen", "473": "Medienversorgungsanlagen", "474": "Feuerlöschanlagen", "479": "Sonstiges zur KG 470",
       "481": "Automationseinrichtungen", "482": "Schaltschränke, Automationsschwerpunkte", "483": "Automationsmanagement", "485": "Datenübertragungsnetze",
       "491": "Baustelleneinrichtung", "492": "Gerüste", "494": "Abbruchmaßnahmen", "495": "Instandsetzungen", "497": "Zusätzliche Maßnahmen"}

EINHEITEN = {"m²", "m³", "m", "St", "psch"}


def lade_positionen():
    P = {}
    with open(os.path.join(HIER, "positionsdb.csv"), encoding="utf-8-sig") as f:
        for r in csv.DictReader(f, delimiter=";"):
            for k in ("h", "stoff", "geraet", "ep_von", "ep_mittel", "ep_bis"):
                r[k] = float(r[k] or 0)
            P[r["code"]] = r
    return P


def lade_vorlagen():
    V = []
    nur = [a for a in sys.argv[1:] if a.endswith(".py")]   # z. B. kg_330.py: nur diese Datei prüfen
    for p in sorted(glob.glob(os.path.join(HIER, "bauteile", "kg_*.py"))):
        if nur and os.path.basename(p) not in nur:
            continue
        spec = importlib.util.spec_from_file_location(os.path.basename(p)[:-3], p)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        for v in m.VORLAGEN:
            v["_datei"] = os.path.basename(p)
            V.append(v)
    return V


def pruefen(V, P):
    fehler, ids = [], set()
    for v in V:
        w = f"{v.get('_datei')}: {v.get('id')}"
        for k in ("id", "kg", "name", "einheit", "lang", "schichten"):
            if not v.get(k):
                fehler.append(f"{w}: Feld „{k}“ fehlt")
        if v.get("id") in ids:
            fehler.append(f"{w}: id doppelt")
        ids.add(v.get("id"))
        if not re.fullmatch(r"\d{3}\.\d{2}", v.get("id") or "") or not (v.get("id") or "").startswith(v.get("kg") or "-"):
            fehler.append(f"{w}: id muss „KG.nn“ sein (z. B. 331.01) und mit der KG beginnen")
        if v.get("kg") not in KG3:
            fehler.append(f"{w}: KG {v.get('kg')} unbekannt")
        if v.get("einheit") not in EINHEITEN:
            fehler.append(f"{w}: Einheit {v.get('einheit')} – erlaubt {sorted(EINHEITEN)}")
        teile = list(v.get("fest") or [])
        for s in v.get("schichten") or []:
            if not s.get("name") or not s.get("optionen"):
                fehler.append(f"{w}: Schicht ohne Namen oder Optionen")
            for o in s.get("optionen") or []:
                teile += o.get("teile") or []
                if o.get("teile") and not o.get("k") and not o.get("t"):
                    fehler.append(f"{w}/{s.get('name')}: Option mit Teilen braucht k oder t")
        for t in teile:
            if not (isinstance(t, (list, tuple)) and len(t) == 2):
                fehler.append(f"{w}: Teil {t} – Format [Code, Faktor]")
                continue
            if t[0] not in P:
                fehler.append(f"{w}: Position {t[0]} gibt es nicht")
            if not isinstance(t[1], (int, float)) or not 0 < t[1] <= 500:
                fehler.append(f"{w}: Faktor {t[1]} für {t[0]} unplausibel")
    return fehler


def kombis(v):
    """Standardelemente: Kombinationen der mit std markierten Optionen (je Schicht alle, wenn keine markiert)."""
    L = []
    for s in v["schichten"]:
        o = [i for i, x in enumerate(s["optionen"]) if x.get("std")]
        L.append(o or list(range(len(s["optionen"]))))
    out = list(itertools.product(*L))
    if len(out) > MAX_STD:   # gleichmäßig ausdünnen, erste und letzte bleiben
        schritt = len(out) / MAX_STD
        out = [out[int(i * schritt)] for i in range(MAX_STD)]
    return out


def element(v, wahl, P):
    teile = [tuple(t) for t in v.get("fest") or []]
    ks, ts = [], []
    for s, i in zip(v["schichten"], wahl):
        o = s["optionen"][i]
        teile += [tuple(t) for t in o.get("teile") or []]
        if o.get("k"):
            ks.append(o["k"])
        if o.get("t"):
            ts.append(f"{s['name']}: {o['t']}")
    summe = {k: 0.0 for k in ("h", "stoff", "geraet", "ep_von", "ep_mittel", "ep_bis")}
    for code, f in teile:
        p = P[code]
        for k in summe:
            summe[k] += p[k] * f
    bez = ", ".join([v["name"]] + ks)
    kurz = gen.kurz70([(v["name"], False)], ks)
    lang = v["lang"].strip() + ("\n" + "\n".join(ts) if ts else "") + (f"\nMenge: {v['bezug']}" if v.get("bezug") else "")
    return {"kurz": kurz, "bez": bez if bez != kurz else "", "lang": lang, "teile": teile,
            **{k: round(x, 3) for k, x in summe.items() if k in ("h", "stoff", "geraet")},
            "ep_von": gen.rund(summe["ep_von"]), "ep_mittel": gen.rund(summe["ep_mittel"]), "ep_bis": gen.rund(summe["ep_bis"])}


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def main():
    P = lade_positionen()
    V = lade_vorlagen()
    V.sort(key=lambda v: v["id"])
    fehler = pruefen(V, P)
    if fehler:
        print("\n".join(fehler[:200]))
        raise SystemExit(f"{len(fehler)} Fehler")
    E = []
    for v in V:
        for n, wahl in enumerate(kombis(v), 1):
            e = element(v, wahl, P)
            if e["ep_mittel"] <= 0:
                continue
            e.update(code=f"{v['id']}.{n:03d}", vorlage=v["id"], wahl=list(wahl), kg=v["kg"], einheit=v["einheit"], tags=",".join(v.get("tags") or []))
            E.append(e)
    kurz = {}
    for e in E:   # Kurztexte eindeutig halten (Suche, Auswahl)
        kurz.setdefault((e["vorlage"], e["kurz"]), []).append(e)
    doppelt = sum(len(x) - 1 for x in kurz.values() if len(x) > 1)
    n_opt = sum(len(s["optionen"]) for v in V for s in v["schichten"])
    moeglich = sum(eval("*".join(str(len(s["optionen"])) for s in v["schichten"]) or "1") for v in V)
    if "--pruefen" in sys.argv:
        for e in E:
            print(f"{e['code']}  {e['einheit']:4} {e['ep_von']:>9} {e['ep_mittel']:>9} {e['ep_bis']:>9}  {e['kurz']}")
    print(f"{len(V)} Vorlagen, {n_opt} Optionen, {moeglich:,} mögliche Aufbauten, {len(E)} Standardelemente"
          + (f", {doppelt} doppelte Kurztexte" if doppelt else ""))
    per = {}
    for e in E:
        per[e["kg"][:2] + "0"] = per.get(e["kg"][:2] + "0", 0) + 1
    print("  " + "  ".join(f"{k}:{n}" for k, n in sorted(per.items())))
    if "--pruefen" in sys.argv:
        return
    sql = ["-- Bauplattform: Bauteil-Baukasten (Vorlagen mit Schichten) und Standardelemente – erzeugt mit positionsdb/bauteile_gen.py, nicht von Hand ändern",
           f"-- {len(V)} Vorlagen, {len(E)} Standardelemente, Preisstand {gen.STAND}; Preise = Σ Faktor × EP der Positionen (Katalog gk3).",
           SCHEMA,
           f"INSERT INTO pdb_katalog(key, name, art, lizenz, preisstand, index_basis, sort) VALUES ('gk3e', 'Bauteile & Elemente Bauplattform', 'katalog', "
           f"'Eigene Aufbauten aus der Positionsdatenbank der Bauplattform', {q(gen.STAND)}, {gen.INDEX}, 3) "
           "ON CONFLICT(key) DO UPDATE SET name = excluded.name, preisstand = excluded.preisstand, index_basis = excluded.index_basis;",
           "DELETE FROM pdb_element_teil; DELETE FROM pdb_vorlage; DELETE FROM pdb_position WHERE katalog = 'gk3e';"]
    for i in range(0, len(V), 100):
        sql.append("INSERT INTO pdb_vorlage(id, kg, name, einheit, lang, bezug, daten, tags, sort) VALUES\n" + ",\n".join(
            f"  ({q(v['id'])}, {q(v['kg'])}, {q(v['name'])}, {q(v['einheit'])}, {q(v['lang'])}, {q(v.get('bezug', ''))}, "
            f"{q(json.dumps({'fest': v.get('fest') or [], 'schichten': v['schichten']}, ensure_ascii=False))}, {q(','.join(v.get('tags') or []))}, {k + i})"
            for k, v in enumerate(V[i:i + 100])) + ";")
    for i in range(0, len(E), 400):
        sql.append("INSERT INTO pdb_position(katalog, code, lb_nr, gruppe, titel, kurz, bez, lang, einheit, kg, gewerk, h, stoff, geraet, "
                   "ep_von, ep_mittel, ep_bis, genauigkeit, tags, hinweis, quelle, preisstand) VALUES\n" + ",\n".join(
            f"  ('gk3e', {q(e['code'])}, {q(e['kg'][:2] + '0')}, {q(e['kg'])}, {q(e['kg'][:2] + '0 ' + KG2[e['kg'][:2] + '0'] + ' › ' + e['kg'] + ' ' + KG3[e['kg']])}, "
            f"{q(e['kurz'])}, {q(e['bez'])}, {q(e['lang'])}, {q(e['einheit'])}, {q(e['kg'])}, '', {e['h']}, {e['stoff']}, {e['geraet']}, "
            f"{e['ep_von']}, {e['ep_mittel']}, {e['ep_bis']}, 'B', {q(e['tags'])}, {q('Aufbau ' + e['vorlage'] + ':' + '.'.join(map(str, e['wahl'])))}, 'katalog', {q(gen.STAND)})"
            for e in E[i:i + 400]) + "\nON CONFLICT(katalog, code) DO NOTHING;")
    T = [(e["code"], k, c, f) for e in E for k, (c, f) in enumerate(e["teile"])]
    for i in range(0, len(T), 2000):
        sql.append("INSERT INTO pdb_element_teil(element_code, nr, position_code, faktor) VALUES\n" + ",\n".join(
            f"  ({q(a)}, {k}, {q(c)}, {f})" for a, k, c, f in T[i:i + 2000]) + ";")
    vb = os.path.join(HIER, "vorbemerkungen.py")
    if os.path.exists(vb):
        spec = importlib.util.spec_from_file_location("vorbemerkungen", vb)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        sql.append("DELETE FROM pdb_vorbemerkung;")
        sql.append("INSERT INTO pdb_vorbemerkung(key, titel, text, sort) VALUES\n" + ",\n".join(
            f"  ({q(k)}, {q(x['titel'])}, {q(x['text'].strip())}, {i})" for i, (k, x) in enumerate(m.VORBEMERKUNGEN.items())) + ";")
        print(f"{len(m.VORBEMERKUNGEN)} Vorbemerkungen")
    ziel = os.path.join(REPO, "shared", "bpcore", "migrationen", MIGRATION)
    with open(ziel, "w", encoding="utf-8") as f:
        f.write("\n".join(sql) + "\n")
    with open(os.path.join(HIER, "bauteile.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["code", "kg", "kurz", "bez", "einheit", "ep_von", "ep_mittel", "ep_bis", "bestandteile", "lang"])
        for e in E:
            w.writerow([e["code"], e["kg"], e["kurz"], e["bez"], e["einheit"], e["ep_von"], e["ep_mittel"], e["ep_bis"],
                        " + ".join(f"{fk:g} × {c} {P[c]['kurz']}" for c, fk in e["teile"]), e["lang"]])
    print(f"→ {os.path.relpath(ziel, REPO)}")


SCHEMA = """CREATE TABLE IF NOT EXISTS pdb_vorlage(
  id TEXT PRIMARY KEY,                        -- z. B. '331.01'
  kg TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  einheit TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT '',
  bezug TEXT NOT NULL DEFAULT '',             -- wie die Menge ermittelt wird
  daten TEXT NOT NULL DEFAULT '{}',           -- {"fest": [[code, faktor]], "schichten": [{name, optionen: [{k, t, teile, std}]}]}
  tags TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS pdb_vorlage_kg ON pdb_vorlage(kg);
-- Bestandteile der Standardelemente (Katalog gk3e): Menge der Position = Faktor × Menge des Elements
CREATE TABLE IF NOT EXISTS pdb_element_teil(
  element_code TEXT NOT NULL,
  nr INTEGER NOT NULL DEFAULT 0,
  position_code TEXT NOT NULL,                -- Code im Katalog gk3
  faktor REAL NOT NULL DEFAULT 1,
  PRIMARY KEY (element_code, nr));
CREATE INDEX IF NOT EXISTS pdb_element_teil_pos ON pdb_element_teil(position_code);
-- Kompakte Vorbemerkungen je Leistungsbereich (key = LB-Nummer) und allgemeine Muster (key = 'bb', 'bvb' …)
CREATE TABLE IF NOT EXISTS pdb_vorbemerkung(
  key TEXT PRIMARY KEY,
  titel TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0);"""


if __name__ == "__main__":
    sys.exit(main())
