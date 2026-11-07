"""Rechentests Baukosten und Baudaten – echter Programmcode im Container (/app: baukosten.py, bpcore/baudaten.py, bpcore/kosten.py).

Alle erwarteten Zahlen sind von Hand aus der Rechenregel ermittelt (Rechenweg jeweils im Kommentar), nicht mit demselben Code.
Beträge netto, sofern nicht anders genannt. Die Tests lesen höchstens aus der Datenbank (Raumtypen des Büros), sie schreiben nichts.
"""
import io

import baukosten as BK
from bpcore import baudaten as BD, db, kosten
from lib import gleich, pruefe


# ---------------------------------------------------------------- Hilfen
def _daten(raeume, typen, items=(), kg300=70, nk=20, kg2=None, bauteile=(), justage=None, risiko=0):
    """Daten einer Kostenermittlung wie nach clean_data() – eigene Raumtypen (Schlüssel rt_…), damit die Kennwerte des Büros nicht stören."""
    rooms = []
    for i, r in enumerate(raeume):
        x = {"id": f"r{i}", "nr": f"0.{i + 1:02d}", "name": f"Raum {i + 1}", "area": 0.0, "typ": "rt_a", "ok": True, "src": "",
             "floor": "Erdgeschoss", "pos": None, "h": None, "std": "", "mass": "", "notiz": ""}
        x.update(r)
        rooms.append(x)
    return {"rooms": rooms, "types": {k: {"label": l, "kw": kw} for k, (l, kw) in typen.items()},
            "kg": {"300": kg300, "400": 100 - kg300}, "nk": nk, "rate": 3, "items": [dict(i) for i in items], "shares": {},
            "kg2": dict(kg2 or {}), "notes": "", "kostenstand": "2026-11", "risiko": risiko, "risiko_text": "",
            "bauteile": [dict({"id": f"b{i}", "mat": "", "formel": "", "einheit": "m²", "notiz": "", "src": "", "geschoss": ""}, **b) for i, b in enumerate(bauteile)],
            "justage": dict({"region": 100.0, "preis": 100.0, "rest": "kw", "f": 1.0}, **(justage or {})), "hoehe_std": None, "hoehen": {}}


def _ebene(rows, lvl):
    return [(kg, v) for l, kg, _, v, _ in rows if l == lvl]


def _kinder(rows, kg1):
    """Zeilen der 2. Ebene unter einer Kostengruppe der 1. Ebene."""
    out, drin = [], False
    for l, kg, name, v, _ in rows:
        if l == 1:
            drin = kg == kg1
        elif l == 2 and drin:
            out.append((kg, name, v))
    return out


def _r(stufe):
    return {"id": -1, "stufe": stufe, "gantt_id": None}


BT_330 = [{"kg": "331", "name": "Tragende Außenwände", "mat": "Kalksandstein 17,5 cm", "menge": 100, "ep": 300},   # 30.000 €
          {"kg": "334", "name": "Fenster", "mat": "Kunststoff", "menge": 10, "ep": 500}]                           #  5.000 €


# ---------------------------------------------------------------- Kennwerte × Fläche
def test_flaeche_mal_kennwert():
    """Bauwerk = Σ Fläche × Kennwert je Raumtyp; Aufteilung KG 300/400; weitere KG und KG 700 als Prozentsatz."""
    d = _daten([{"area": 100}, {"area": 50}, {"area": 30, "typ": "rt_b"}], {"rt_a": ("Büro", 1500), "rt_b": ("Flur", 1000)},
               items=[{"kg": "200", "name": "Vorbereitende Maßnahmen", "amount": 10000}, {"kg": "500", "name": "Außenanlagen", "amount": 20000}])
    k = BK.calc(d)
    # 150 m² × 1.500 = 225.000; 30 m² × 1.000 = 30.000 → 255.000 €
    gleich(k["kw_summe"], 255000, "Summe Kennwerte")
    gleich(k["bauwerk"], 255000, "Bauwerk")
    a = {t["typ"]: t for t in k["types"]}
    gleich((a["rt_a"]["n"], a["rt_a"]["area"], a["rt_a"]["sum"]), (2, 150, 225000), "Raumtyp Büro")
    gleich((a["rt_b"]["n"], a["rt_b"]["area"], a["rt_b"]["sum"]), (1, 30, 30000), "Raumtyp Flur")
    gleich(k["kg300"], 178500, "KG 300 = 70 %"); gleich(k["kg400"], 76500, "KG 400 = 30 %")
    gleich(k["extra"], 30000, "weitere Kostengruppen")
    gleich(k["nk"], 57000, "KG 700 = 20 % von 285.000")
    gleich(k["total"], 342000, "Gesamt = 255.000 + 30.000 + 57.000")
    gleich(k["area"], 180, "Fläche")
    gleich(k["kw"], 1416.67, "Kennwert je m² = 255.000 ÷ 180")


def test_standard_und_massnahme_gewichten_flaeche():
    """Standard (einfach/gehoben) und Maßnahme (Umbau/Sanierung/Bestand) wirken als Faktor auf die Fläche."""
    d = _daten([{"area": 100, "std": "gehoben", "mass": "umbau"},      # 100 × 1,20 × 0,80 = 96 m²
                {"area": 50, "mass": "bestand"},                       # bleibt unverändert: 0 m²
                {"area": 20, "std": "einfach", "mass": "sanierung"}],  # 20 × 0,85 × 0,60 = 10,2 m²
               {"rt_a": ("Büro", 2000)}, nk=0)
    k = BK.calc(d)
    t = k["types"][0]
    gleich(t["area"], 170, "Fläche ungewichtet"); gleich(t["gew"], 106.2, "Fläche gewichtet")
    gleich(k["bauwerk"], 212400, "106,2 m² × 2.000 €/m²")
    gleich(k["kw"], 1249.41, "Kennwert je m² Raumfläche = 212.400 ÷ 170")


def test_justage_regionalfaktor_und_preisstand():
    """Justage: Kennwerte × Regionalfaktor × Preisstand (110 % × 120 % = 1,32)."""
    d = _daten([{"area": 100}], {"rt_a": ("Büro", 1000)}, nk=0, justage={"region": 110, "preis": 120})
    k = BK.calc(d)
    gleich(k["justage"]["faktor"], 1.32, "Faktor")
    gleich(k["kw_summe"], 100000, "Kennwerte vor Justage")
    gleich(k["bauwerk"], 132000, "Bauwerk nach Justage"); gleich(k["bauwerk_kw"], 132000, "Bauwerk aus Kennwerten")
    gleich(k["total"], 132000, "Gesamt ohne Nebenkosten")


def test_nebenkosten_und_kostenrisiko():
    """KG 700 = Prozentsatz auf Bauwerk + Positionen; Kostenrisiko gesondert auf alles; offene Positionen zählen 0."""
    d = _daten([{"area": 100}], {"rt_a": ("Büro", 2000)}, nk=15, risiko=10,
               items=[{"kg": "200", "name": "Herrichten", "amount": 30000}, {"kg": "500", "name": "Außenanlagen", "amount": 20000},
                      {"kg": "394", "name": "Rückbau", "amount": None}])
    k = BK.calc(d)
    gleich(k["extra"], 50000, "Positionen")
    gleich(k["nk"], 37500, "KG 700 = 15 % von 250.000")
    gleich(k["risiko"], 28750, "Risiko = 10 % von 287.500")
    gleich(k["total"], 316250, "Gesamt = 200.000 + 50.000 + 37.500 + 28.750")


# ---------------------------------------------------------------- Bauteile (Kostenberechnung, 3. Ebene)
def test_bauteile_ersetzen_kennwert_anteil():
    """Bauteile (Menge × EP) ersetzen in ihrer Gruppe der 2. Ebene den Kennwert-Anteil; übrige Gruppen bleiben beim Kennwert."""
    d = _daten([{"area": 100}], {"rt_a": ("Büro", 2000)}, nk=0, bauteile=BT_330)
    k = BK.calc(d)
    # Kennwert: 200.000 €, KG 300 = 140.000, KG 400 = 60.000; Faustanteil 330 = 30 % von 140.000 = 42.000
    g = k["kg2"]
    gleich((g["330"]["wert"], g["330"]["quelle"], g["330"]["n"], g["330"]["kennwert"]), (35000, "bauteile", 2, 42000), "KG 330 aus Bauteilen")
    gleich((g["310"]["wert"], g["310"]["quelle"]), (1400, "kennwerte"), "KG 310 = 1 % von 140.000")
    gleich(g["440"]["wert"], 18000, "KG 440 = 30 % von 60.000")
    gleich(k["kg300"], 133000, "KG 300 = 140.000 − 42.000 + 35.000")
    gleich(k["kg400"], 60000, "KG 400 unverändert")
    gleich(k["bauwerk"], 193000, "Bauwerk"); gleich(k["bauwerk_kw"], 200000, "Bauwerk nur aus Kennwerten")
    J = k["justage"]
    gleich((J["bt_wert"], J["bt_kw"], J["k"]), (35000, 42000, 0.833), "Verhältnis Bauteile ÷ Kennwert-Anteil = 35.000 ÷ 42.000")
    gleich((J["rest_kw"], J["rest_wert"], J["rest_f"]), (158000, 158000, 1), "übrige Gruppen beim Kennwert")


def test_bauteile_uebrige_gruppen_angleichen():
    """Übrige Gruppen mit dem Verhältnis der bepreisten Gruppen angleichen (×5/6) bzw. mit eigenem Faktor (×1,10)."""
    k = BK.calc(_daten([{"area": 100}], {"rt_a": ("Büro", 2000)}, nk=0, bauteile=BT_330, justage={"rest": "angl"}))
    # Faktor 35.000 ÷ 42.000 = 5/6 auf alle übrigen Gruppen: KG 300 übrig 98.000 × 5/6 = 81.666,67; KG 400 60.000 × 5/6 = 50.000
    gleich(k["justage"]["rest_f"], 0.8333, "Angleichungsfaktor")
    gleich(k["kg2"]["340"]["wert"], 25666.67, "KG 340 = 30.800 × 5/6")
    gleich(k["kg300"], 116666.67, "KG 300 = 35.000 + 81.666,67")
    gleich(k["kg400"], 50000, "KG 400 angeglichen")
    gleich(k["bauwerk"], 166666.67, "Bauwerk")
    k2 = BK.calc(_daten([{"area": 100}], {"rt_a": ("Büro", 2000)}, nk=0, bauteile=BT_330, justage={"rest": "eigen", "f": 1.1}))
    gleich(k2["kg300"], 142800, "KG 300 = 35.000 + 98.000 × 1,10")
    gleich(k2["kg400"], 66000, "KG 400 = 60.000 × 1,10")
    gleich(k2["bauwerk"], 208800, "Bauwerk mit eigenem Faktor")


# ---------------------------------------------------------------- DIN 276: Gliederungsebenen (PDF-Tabelle)
def _hierarchie():
    d = _daten([{"area": 100}], {"rt_a": ("Büro", 2000)}, kg2={"330": 40, "340": 30},
               items=[{"kg": "210", "name": "Herrichten", "amount": 6000}, {"kg": "230", "name": "Erschließung", "amount": 4000},
                      {"kg": "500", "name": "Außenanlagen", "amount": 20000}, {"kg": "394", "name": "Rückbau", "amount": None}])
    return d, BK.calc(d)


def test_din276_erste_ebene_summen():
    """1. Ebene: 200 = 210 + 230, 300 = KG 300 aus Kennwerten (+ offene 394), 700 = Nebenkosten; Summe = Gesamt."""
    d, k = _hierarchie()
    # Bauwerk 200.000 (KG 300 140.000 / KG 400 60.000); Positionen 30.000; KG 700 = 20 % von 230.000 = 46.000; Gesamt 276.000
    gleich(k["total"], 276000, "Gesamt")
    rows = BK.kg_rows(d, k, 1)
    gleich([r[0] for r in rows], [1, 1, 1, 1, 1], "nur 1. Ebene")
    gleich(_ebene(rows, 1), [("200", 10000), ("300", 140000), ("400", 60000), ("500", 20000), ("700", 46000)], "Kostengruppen 1. Ebene")
    gleich(sum(v for _, v in _ebene(rows, 1)), k["total"], "Summe der 1. Ebene = Gesamt")
    offen = {kg: o for l, kg, _, _, o in rows}
    pruefe(offen["300"] and not offen["200"], "KG 300 teilweise offen (Rückbau ohne Betrag), KG 200 vollständig")


def test_din276_zweite_und_dritte_ebene():
    """2. Ebene: Unterzeilen summieren sich zur 1. Ebene; 3. Ebene zeigt Einzelpositionen (394 unter 390), offen = None."""
    d, k = _hierarchie()
    r2 = BK.kg_rows(d, k, 2)
    gleich([(kg, v) for kg, _, v in _kinder(r2, "200")], [("210", 6000), ("230", 4000)], "KG 200 → 210, 230")
    k300 = _kinder(r2, "300")
    gleich([(kg, v) for kg, _, v in k300], [("330", 56000), ("340", 42000), ("390", None), ("", 42000)],
           "KG 300 → 330 (40 %), 340 (30 %), 390 offen, nicht zugeordneter Rest 30 %")
    gleich(k300[0][1], "Außenwände / Vertikale Baukonstruktionen, außen", "Bezeichnung nach DIN 276")
    gleich(k300[3][1], "nicht zugeordneter Rest", "Rest der Aufteilung")
    gleich(sum(v or 0 for _, _, v in k300), 140000, "Unterzeilen = KG 300")
    gleich(_kinder(r2, "400"), [], "KG 400 ohne Aufteilung: keine Unterzeilen")
    pruefe(not _ebene(r2, 3), "Tiefe 2 ohne 3. Ebene")
    r3 = BK.kg_rows(d, k, 3)
    gleich(_ebene(r3, 3), [("394", None)], "3. Ebene: Rückbau unter 390, noch offen")
    gleich(_ebene(r3, 1), _ebene(BK.kg_rows(d, k, 1), 1), "1. Ebene unabhängig von der Tiefe")


def test_din276_dritte_ebene_aus_bauteilen():
    """Mit Bauteilen: 3. Ebene 331 + 334 = 2. Ebene 330; alle Gruppen der 2. Ebene zusammen = KG 300."""
    d = _daten([{"area": 100}], {"rt_a": ("Büro", 2000)}, nk=0, bauteile=BT_330)
    k = BK.calc(d)
    rows = BK.kg_rows(d, k, 3)
    gleich(dict(_ebene(rows, 1))["300"], 133000, "KG 300 mit Bauteilen")
    zwei = {kg: v for kg, _, v in _kinder(rows, "300")}
    gleich(zwei["330"], 35000, "KG 330 aus Bauteilen")
    gleich(sum(zwei.values()), 133000, "Gruppen der 2. Ebene = KG 300")
    gleich([(kg, v) for kg, v in _ebene(rows, 3)], [("331", 30000), ("334", 5000)], "Einzelpositionen 3. Ebene")
    n = next(name for l, kg, name, _, _ in rows if l == 3 and kg == "331")
    pruefe(n.startswith("Tragende Außenwände – Kalksandstein 17,5 cm (100"), f"Bezeichnung mit Material und Menge: {n!r}")


def test_din276_summe_gleich_gesamt_auch_ohne_kostengruppe():
    """Eine Position ohne gültige Kostengruppe (z. B. „+ Position“ ohne KG) darf in der PDF-Tabelle nicht fehlen: Summe der 1. Ebene = Gesamt."""
    d = _daten([{"area": 100}], {"rt_a": ("Büro", 1000)}, nk=0,
               items=[{"kg": "", "name": "Sonstiges", "amount": 5000}, {"kg": "500", "name": "Außenanlagen", "amount": 10000}])
    k = BK.calc(d)
    gleich(k["total"], 115000, "Gesamt = 100.000 + 5.000 + 10.000")
    gleich(sum(v or 0 for _, v in _ebene(BK.kg_rows(d, k, 1), 1)), k["total"], "Summe der Tabelle muss die Gesamtsumme ergeben")


# ---------------------------------------------------------------- Genauigkeit und Datenlage
def test_genauigkeit_spanne_je_stufe():
    """Spanne der Kosten: Grundwert je Stufe, Zuschläge für unbestätigte Flächen, offene Positionen, Rückbau, fehlendes Raumbuch."""
    zwei = [{"area": 60, "floor": "Erdgeschoss"}, {"area": 40, "floor": "Obergeschoss", "nr": "1.01"}]
    d = _daten(zwei, {"rt_a": ("Büro", 1000)}, items=[{"kg": "500", "name": "Außenanlagen", "amount": 10000}])
    k = BK.calc(d)
    gleich(k["total"], 132000, "Gesamt = (100.000 + 10.000) × 1,20")
    with db.tx() as c:
        a = BK.genauigkeit(c, _r("berechnung"), d, k, [])
        # Kostenberechnung ± 15 %, sonst nichts offen
        gleich((a["lo_pct"], a["hi_pct"]), (15, 15), "Kostenberechnung")
        gleich((a["low"], a["high"]), (112200, 151800), "132.000 × 0,85 und × 1,15")
        gleich(a["urteil"], "gut belastbar", "Urteil")
        gleich(a["faktoren"][0]["text"], "Kostenberechnung: üblich ± 15 %", "erster Faktor")

        d2 =_daten([{"area": 80}, {"area": 20, "ok": False, "floor": "Obergeschoss", "nr": "1.01"}], {"rt_a": ("Büro", 1000)},
                    items=[{"kg": "200", "name": "Herrichten", "amount": 1000}, {"kg": "394", "name": "Rückbau", "amount": None}])
        k2 = BK.calc(d2)
        gleich(k2["total"], 121200, "Gesamt = (100.000 + 1.000) × 1,20")
        a2 = BK.genauigkeit(c, _r("schaetzung"), d2, k2, [])
        # Kostenschätzung ± 25; 20 % unbestätigt: 5 × 0,2 = +1 (beide Seiten); 1 Kostengruppe offen: +4 oben; Rückbau (KG 39x): +5 oben
        gleich((a2["lo_pct"], a2["hi_pct"]), (26, 35), "Zu- und Abschläge")
        gleich((a2["low"], a2["high"]), (89688, 163620), "121.200 × 0,74 und × 1,35")
        gleich(a2["urteil"], "grobe Größenordnung", "Urteil")

        d3 = _daten([], {"rt_a": ("Büro", 1000)})
        a3 = BK.genauigkeit(c, _r("rahmen"), d3, BK.calc(d3), [])
        # Kostenrahmen ± 35, ohne Räume +20 unten / +40 oben
        gleich((a3["lo_pct"], a3["hi_pct"]), (55, 75), "ohne Raumbuch")
        gleich(a3["urteil"], "noch sehr unsicher", "Urteil")


def test_datenlage_reicht_fuer_stufe():
    """„Wofür reichen die Daten?“: ohne 2. Ebene nur Kostenrahmen, mit 2. Ebene Kostenschätzung, doppelte Raumnummer blockiert alles."""
    items = [{"kg": "200", "name": "Herrichten", "amount": 1000}]
    d = _daten([{"area": 100}], {"rt_a": ("Büro", 1000)}, items=items)
    R = BK.reife(None, _r("berechnung"), d, BK.calc(d), [])
    gleich(R["reicht"], "rahmen", "nur Kostenrahmen")
    st = {s["key"]: s for s in R["stufen"]}
    gleich([f["text"] for f in st["schaetzung"]["fehlt"]], ["DIN 276: Kostenschätzung mindestens bis zur 2. Ebene"], "fehlt für die Kostenschätzung")
    pruefe("DIN 276: Kostenberechnung bis zur 3. Ebene" in [f["text"] for f in st["berechnung"]["fehlt"]], "3. Ebene fehlt für die Kostenberechnung")

    d2 = _daten([{"area": 100}], {"rt_a": ("Büro", 1000)}, items=items, kg2={"330": 50, "440": 40})
    gleich(BK.reife(None, _r("berechnung"), d2, BK.calc(d2), [])["reicht"], "schaetzung", "mit 2. Ebene")
    d3 = _daten([{"area": 100}], {"rt_a": ("Büro", 1000)}, items=items, kg2={"330": 50}, bauteile=BT_330)
    R3 = BK.reife(None, _r("berechnung"), d3, BK.calc(d3), [])
    pruefe({s["key"]: s for s in R3["stufen"]}["berechnung"]["ok"], f"mit Bauteilen reicht es für die Kostenberechnung: {R3}")

    d4 = _daten([{"area": 50, "nr": "0.01"}, {"area": 50, "nr": "0.01"}], {"rt_a": ("Büro", 1000)}, items=items)
    R4 = BK.reife(None, _r("rahmen"), d4, BK.calc(d4), [])
    gleich(R4["reicht"], None, "doppelte Raumnummer: für keine Stufe")
    pruefe("Raumnummer 0.01 mehrfach vergeben" in [f["text"] for f in R4["stufen"][0]["fehlt"]], "Hinweis doppelte Raumnummer")
    H = BK.rules(None, _r("rahmen"), d4, BK.calc(d4), [])
    pruefe(any(h["title"] == "Kein Bauzeitenplan verknüpft" for h in H), "Hinweis Bauzeitenplan")


def test_faustwerte_auf_hundert_euro_gerundet():
    """Schätzung ohne KI: Faustwerte in % der Bauwerkskosten, auf 100 € gerundet; vorhandene Beträge werden nicht geschätzt."""
    d = _daten([{"area": 100}], {"rt_a": ("Büro", 1234.56)}, nk=0, kg2={"330": 30},
               items=[{"kg": "200", "name": "Herrichten", "amount": 5000}, {"kg": "394", "name": "Rückbau", "amount": None},
                      {"kg": "600", "name": "Ausstattung", "amount": None}])
    k = BK.calc(d)
    gleich(k["bauwerk"], 123456, "Bauwerk")
    vs, kg2 = BK.schaetzen_intern(d, k)
    v = {x["kg"]: (x["value"], x["low"], x["high"]) for x in vs}
    gleich(sorted(v), ["394", "500", "600"], "KG 200 hat schon einen Betrag, KG 500 fehlt ganz, KG 600 ist angelegt")
    gleich(v["394"], (6200, 3700, 11100), "KG 394: 5 % = 6.172,80 · 3 % = 3.703,68 · 9 % = 11.111,04")
    gleich(v["500"], (4900, 2500, 9900), "KG 500: 4 % = 4.938,24 · 2 % = 2.469,12 · 8 % = 9.876,48")
    gleich(v["600"], (2500, 0, 6200), "KG 600: 2 % = 2.469,12 · 0 % · 5 % = 6.172,80")
    gleich(kg2, None, "eigene Aufteilung der 2. Ebene vorhanden: kein Faustvorschlag")


# ---------------------------------------------------------------- PDF: netto / brutto, Rundung, Tiefe
def _pdf_text(d, **opt):
    import pdfplumber
    o = {"teile": ["zusammenfassung"], "tiefe": 2, "brutto": False, "mwst": 19.0, "runden": 0, "vorl": False}
    o.update(opt)
    r = {"id": -1, "name": "Rechentest", "project_id": None, "gantt_id": None, "stufe": "berechnung", "rev": 1,
         "updated": "", "updated_by": "", "archived": 0, "data": d}
    with BK.app.test_request_context("/"):
        with db.tx() as c:
            pdf = BK.build_report(c, r, o)
    pruefe(pdf[:5] == b"%PDF-", "keine PDF-Datei")
    with pdfplumber.open(io.BytesIO(pdf)) as p:
        return "\n".join((pg.extract_text() or "") for pg in p.pages)


def _zeile(text, anfang):
    z = next((z for z in text.splitlines() if z.strip().startswith(anfang)), None)
    pruefe(z is not None, f"Zeile „{anfang}“ fehlt im PDF:\n{text[:1500]}")
    return z


def _pdf_daten(**kw):
    # 50 m² × 1.600 €/m² = 80.000 € Bauwerk + 20.000 € Außenanlagen, ohne Nebenkosten → 100.000 € netto
    return _daten([{"area": 50, "typ": "rt_mwst"}], {"rt_mwst": ("RT Mehrwertsteuer", 1600)}, nk=0,
                  items=[{"kg": "500", "name": "Außenanlagen", "amount": 20000}], **kw)


def test_pdf_netto_brutto_mehrwertsteuer():
    """PDF-Zusammenfassung: netto, brutto mit 19 % bzw. 7 % MwSt., Rundung auf 1.000 €, Kennwert je m² ungerundet."""
    t = _pdf_text(_pdf_daten(), brutto=True, mwst=19)
    pruefe("119.000" in _zeile(t, "Gesamt brutto"), "Gesamt brutto = 100.000 × 1,19")
    pruefe("100.000" in _zeile(t, "Gesamt netto"), "Gesamt netto")
    pruefe("19.000" in _zeile(t, "MwSt. 19 %"), "MwSt. 19 %")
    pruefe("95.200" in _zeile(t, "Bauwerk (KG 300 + 400)"), "Bauwerk brutto = 80.000 × 1,19")

    t = _pdf_text(_pdf_daten(), brutto=False)
    pruefe("100.000" in _zeile(t, "Gesamt netto"), "Gesamt netto")
    pruefe("80.000" in _zeile(t, "Bauwerk (KG 300 + 400)"), "Bauwerk netto")
    pruefe("Gesamt brutto" not in t and "MwSt. 19 %" not in t, "netto ohne MwSt.-Zeilen")
    pruefe("1.600" in _zeile(t, "Raumfläche"), "Kennwert 1.600 €/m² netto")

    t = _pdf_text(_pdf_daten(), brutto=True, mwst=7, runden=1000)
    pruefe("107.000" in _zeile(t, "Gesamt brutto"), "100.000 × 1,07")
    pruefe("86.000" in _zeile(t, "Bauwerk (KG 300 + 400)"), "80.000 × 1,07 = 85.600 → auf 1.000 € gerundet 86.000")
    pruefe("1.712" in _zeile(t, "Raumfläche"), "Kennwert 1.600 × 1,07 = 1.712 €/m² wird nicht gerundet")


def test_pdf_gliederungstiefe():
    """PDF-Kostentabelle: 1. Ebene ohne, 2. Ebene mit Gruppe 330 Außenwände."""
    d = _pdf_daten(kg2={"330": 50})
    t1 = _pdf_text(d, teile=["kosten"], tiefe=1)
    t2 = _pdf_text(d, teile=["kosten"], tiefe=2)
    pruefe("1. Gliederungsebene" in t1 and "2. Gliederungsebene" in t2, "Überschrift mit der Tiefe")
    pruefe("Außenwände" not in t1, "1. Ebene ohne Unterzeilen")
    pruefe("Außenwände" in t2, "2. Ebene mit KG 330")
    pruefe("100.000" in _zeile(t1, "Gesamt"), "Gesamt in der Kostentabelle")


# ---------------------------------------------------------------- Baudaten: Index, Umrechnung, Rundung, Filter
def test_baupreisindex_und_umrechnung():
    """Baupreisindex zum Preisstand (Monat, sonst Jahresmittel), Umrechnung Index × Regionalfaktor, Rundung der Preise."""
    gleich(BD.index_fuer("2019-07"), 90.2, "07/2019 → Jahresmittel 2019")
    gleich(BD.index_fuer("2024-05"), 129.4, "Berichtsmonat 05/2024")
    gleich(BD.index_fuer("2021"), 100.0, "Basisjahr 2021 = 100")
    gleich(BD.index_fuer("2026-11"), 141.7, "2026 ohne Jahresmittel: neuester Wert")
    gleich(BD.index_fuer("1999-01"), None, "unbekannt")
    gleich(BD.index_fuer(""), None, "leer")
    E = {"index_basis": 141.7, "index_aktuell": 148.785, "faktor": 1.08}
    gleich(BD.umrechnung(None, "gk3", E), 1.134, "148,785 ÷ 141,7 = 1,05 × 1,08", toleranz=1e-9)
    gleich(BD.umrechnung(None, None, {"index_basis": 141.7, "index_aktuell": 141.7, "faktor": None}), 1.0, "ohne Faktor", toleranz=1e-9)
    gleich(BD._rund(12.3449), 12.34, "unter 100 €: Cent")
    gleich(BD._rund(123.456), 123.5, "unter 1.000 €: 10 Cent")
    gleich(BD._rund(1234.6), 1235, "ab 1.000 €: volle Euro")
    gleich(BD._rund(None), None, "kein Preis")
    x = BD.als_lv_position({"id": 7, "katalog": "gk3", "code": "1", "kurz": "K", "lang": "L", "lang_voll": "G L", "einheit": "m", "kg": "331",
                            "ep_mittel": 10.2, "ep_mittel_akt": 10.71})
    gleich((x["lang"], x["ep"], x["pdb"]), ("G L", 10.71, {"id": 7, "katalog": "gk3", "code": "1"}), "Übernahme mit Preis heute")


def test_baudaten_suchfilter():
    """Suchfilter: Kostengruppe als Präfix (nur Ziffern), Code-Suche bei Zahlen, jedes Wort muss vorkommen, ausgeblendete nur mit „alle“."""
    w, p = BD._wo({"katalog": "gk3", "kg": "KG 33x", "q": "012.01"})
    gleich(p, ["gk3", "33%", "012.01%"], "Parameter")
    pruefe("p.aktiv=1" in w and "p.code LIKE ?" in w and "p.kg LIKE ?" in w, w)
    w, p = BD._wo({"q": "Kalksand  Planstein", "alle": "1"})
    pruefe("p.aktiv=1" not in w, "mit „alle“ auch ausgeblendete")
    gleich(p, ["%kalksand%"] * 5 + ["%planstein%"] * 5, "je Wort fünf Textfelder, klein geschrieben")
    w, p = BD._wo({"q": "fliese 60x60"}, such=True)
    gleich(p, ["%fliese%", "%60x60%"], "Suchtabelle")


def test_raumtyp_erkennung_und_kennwert_eingabe():
    """Raumtyp aus dem Raumnamen (Reihenfolge = Vorrang), Kennwerte in deutscher Schreibweise, neue Raumtypen bekommen einen Schlüssel."""
    cat = [{"key": k, "worte": w} for k, _, _, w in kosten.TYPES]
    for name, soll in (("WC Damen", "sanitaer"), ("Stuhllager", "neben"), ("Küche", "kueche"), ("Flur EG", "verkehr"),
                       ("Büro Leitung", "buero"), ("Kinderzimmer", "wohnen"), ("Abstellraum Küche", "neben"), ("", "sonst"), ("Halle 2", "aufenthalt"),
                       ("Hundezwinger", "sonst")):
        gleich(kosten.guess(name, cat), soll, f"Raumtyp für „{name}“")
    gleich(kosten._num("2.800,50", None), 2800.5, "2.800,50")
    gleich(kosten._num("1.300", None), 1300, "1.300 = Tausenderpunkt")
    gleich(kosten._num("1,5", None), 1.5, "Dezimalkomma")
    gleich(kosten._num("1 450 €", None), 1450, "mit Leerzeichen und €")
    gleich(kosten._num("-5", None), 0, "nicht negativ")
    gleich(kosten._num("abc", 7), 7, "Vorgabe bei Unsinn")
    out = kosten.clean_catalog([{"label": "Labor Süd", "kw": "3.100", "worte": " Labor , Prüfraum "}, {"label": ""}, {"key": "buero", "label": "Büro", "kw": 1500}])
    gleich([x["key"] for x in out], ["labor_sued", "buero", "sonst"], "Schlüssel aus der Bezeichnung, leere Zeilen weg, „Sonstige“ ergänzt")
    gleich((out[0]["kw"], out[0]["worte"]), (3100, "labor, prüfraum"), "Kennwert und Suchwörter")
    gleich(out[2]["kw"], 1300, "Sonstige Räume mit Beispielwert")


def test_eingaben_bereinigen_und_begrenzen():
    """clean_data: Flächen und Beträge auf Cent, Prozentsätze begrenzt, KG 400 = 100 − KG 300, unbekannte Raumtypen → Sonstige."""
    with db.tx() as c:
        d = BK.clean_data({"rooms": [{"name": "A", "area": "12,345", "typ": "gibtsnicht"}, {"name": "B", "area": -4, "std": "luxus", "mass": "neu"}],
                           "types": {"rt_x": {"label": "Eigener Typ", "kw": 99999}, "Böse Taste": {"label": "x", "kw": 1}},
                           "items": [{"kg": "500", "name": "Außen", "amount": "1234,567", "est": {"src": "Intern", "low": 1000, "high": 2000}},
                                     {"kg": "600", "name": "offen", "amount": "", "est": {"src": "Intern"}}],
                           "kg": {"300": 120}, "nk": 99, "risiko": 70, "kostenstand": "2026-13",
                           "justage": {"region": 500, "preis": 10, "rest": "xyz", "f": 9}}, c)
    gleich((d["rooms"][0]["area"], d["rooms"][0]["typ"]), (12.35, "sonst"), "Fläche gerundet, unbekannter Raumtyp")
    gleich((d["rooms"][1]["area"], d["rooms"][1]["std"], d["rooms"][1]["mass"]), (0, "", "neu"), "negative Fläche, unbekannter Standard")
    gleich(d["types"]["rt_x"], {"label": "Eigener Typ", "kw": 50000, "eigen": True}, "eigener Raumtyp, Kennwert höchstens 50.000")
    pruefe("Böse Taste" not in d["types"], "ungültiger Schlüssel wird verworfen")
    gleich(d["items"][0]["amount"], 1234.57, "Betrag auf Cent")
    gleich(d["items"][0]["est"]["high"], 2000, "Schätzspanne bleibt")
    gleich((d["items"][1]["amount"], "est" in d["items"][1]), (None, False), "offene Position ohne Schätzung")
    gleich((d["kg"]["300"], d["kg"]["400"]), (100, 0), "KG 300 höchstens 100 %")
    gleich((d["nk"], d["risiko"]), (60, 50), "Nebenkosten höchstens 60 %, Risiko höchstens 50 %")
    pruefe(d["kostenstand"] != "2026-13" and len(d["kostenstand"]) == 7, f"ungültiger Kostenstand ersetzt: {d['kostenstand']}")
    gleich(d["justage"], {"region": 300, "preis": 30, "rest": "kw", "f": 5}, "Justage begrenzt")
