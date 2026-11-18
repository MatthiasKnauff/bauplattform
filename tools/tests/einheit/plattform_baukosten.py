"""Rechentests Kosten (plattform/baukosten.py, Entwurf „Kosten aus Bauteilen“ vom 16.11.2026): Kosten = Bauteile × Preis,
Zuschläge, DIN-276-Zusammenfassung, Genauigkeit nur aus den Bauteilen (Spannen, Markt, Mengen, Offenes) – ohne Datenbank."""
import baukosten as BK
from lib import gleich, pruefe


def _d(*zeilen, **mehr):
    d = BK.clean_data({"bauteile": list(zeilen), **mehr})
    return d


Z1 = {"id": "a", "bereich": "oeffnung", "kg": "334", "name": "Fenster", "menge": 9, "einheit": "St", "ep": 1000, "ep_von": 800, "ep_bis": 1250, "quelle": "ifc"}
Z2 = {"id": "b", "bereich": "raum", "kg": "353", "name": "Parkett", "menge": 100, "einheit": "m²", "ep": 90, "ep_von": 75, "ep_bis": 110, "quelle": "raum"}
Z3 = {"id": "c", "bereich": "ausbau", "kg": "412", "name": "Bad", "menge": 1, "einheit": "St", "ep": 9000, "ep_von": 7500, "ep_bis": 11000, "quelle": "raum"}
Z4 = {"id": "d", "bereich": "hand", "kg": "500", "name": "Außenanlage", "menge": 1, "einheit": "psch", "ep": 2000, "quelle": "hand"}


def test_summen():
    k = BK.calc(_d(Z1, Z2, Z3, Z4))
    gleich((k["kg300"], k["kg400"], k["extra"], k["bauwerk"]), (18000, 9000, 2000, 27000), "KG 300 = Fenster + Parkett, KG 400 = Bad, KG 500 extra")
    gleich(k["kg2"], {"330": {"wert": 9000, "quelle": "bauteile", "n": 1}, "350": {"wert": 9000, "quelle": "bauteile", "n": 1},
                      "410": {"wert": 9000, "quelle": "bauteile", "n": 1}}, "2. Ebene")
    gleich(k["risiko"], 2900, "Unvorhergesehenes 10 % von 29.000")
    gleich(k["nk"], 6380, "Baunebenkosten 20 % von 31.900")
    gleich((k["total"], k["mwst"], k["brutto"]), (38280, 7273.2, 45553.2), "Summe netto, Umsatzsteuer, brutto")
    k2 = BK.calc(_d(Z1, preise={"a": 500}, nk_fest=1000, risiko=0))
    gleich((k2["zeilen"][0]["ep"], k2["zeilen"][0]["hand"], k2["bauwerk"], k2["nk"], k2["total"]), (500, True, 4500, 1000, 5500), "Preis von Hand, KG 700 fest")


def test_genauigkeit():
    k = BK.calc(_d(Z1, Z2, Z3), stufe="berechnung")
    G = k["genau"]
    s = k["bauwerk"]
    pruefe(G["unten"] < s < G["oben"] and abs((s - G["unten"]) - (G["oben"] - s)) < 1, f"ohne Offenes symmetrisch: {G}")
    gleich((G["ziel"], G["ampel"]), ([20, 25], "gruen"), "Kostenberechnung im Ziel")
    pruefe(G["teile"]["markt"] == round(1.645 * 5, 1), f"Marktanteil 5 % × 1,645: {G['teile']}")
    # mehr gleich große Zeilen → Preisanteil relativ kleiner (unabhängig, quadratisch)
    viele = [dict(Z2, id=f"x{i}", menge=10) for i in range(10)]
    pruefe(BK.calc(_d(*viele))["genau"]["teile"]["preise"] < BK.calc(_d(dict(Z2, menge=100)))["genau"]["teile"]["preise"], "zehn Zeilen genauer als eine")
    # Offenes nur nach oben; „besser“ nennt es zuerst
    G2 = BK.calc(_d(Z1, Z2, Z3), offen=[{"id": "frage:elektro", "name": "Elektroinstallation", "moeglich": 15000}], stufe="anschlag")["genau"]
    pruefe(G2["oben"] - s > s - G2["unten"] + 14000 and G2["ampel"] == "rot", f"offen nach oben, Kostenanschlag rot: {G2}")
    pruefe(G2["besser"] and "Elektroinstallation" in G2["besser"][0], f"besser: {G2['besser']}")
    pruefe(BK.calc(_d())["genau"] is None, "ohne Bauteile keine Genauigkeit")


def test_daten_sauber():
    d = BK.clean_data({"bauteile": [{"id": "x", "kg": "33a1", "menge": "-3", "ep": "12,5"}, "quatsch"], "nk": 99, "risiko": "", "mwst": "7", "kennwerte": 1, "rooms": [{"area": "12,5"}]})
    gleich((d["bauteile"][0]["kg"], d["bauteile"][0]["menge"], d["bauteile"][0]["ep"]), ("331", 0, 12.5), "Zeile bereinigt")
    gleich((d["nk"], d["risiko"], d["mwst"], d["rooms"][0]["area"]), (60, 10, 7, 12.5), "Grenzen und Standard")
    pruefe("kennwerte" not in d and "types" not in d, "Kennwerte gibt es nicht mehr")


def test_menge_hier_geaendert():
    """Menge nur in den Kosten geändert (data.mengen, geht als Vorschlag ans Gebäudemodell): rechnet mit der neuen Menge, zeigt die aus dem Modell."""
    k = BK.calc(_d(Z1, mengen={"a": "10"}))
    z = k["zeilen"][0]
    gleich((z["menge"], z["menge_modell"], z["hand_menge"], z["betrag"]), (10.0, 9, True, 10000.0), "Menge von Hand")
    gleich(BK.calc(_d(Z1))["zeilen"][0]["betrag"], 9000.0, "ohne: Menge aus dem Modell")


def test_druck_din_zeilen():
    """Druck (16.11.2026): Kosten nach DIN 276 je Gliederungstiefe; Unvorhergesehenes eigene Zeile vor KG 700; 3. Ebene mit den Bauteilen."""
    import baukosten_druck as KD
    k = BK.calc(_d(Z1, Z2, Z3, Z4))
    e1 = KD.din_zeilen(k["zeilen"], k, 1)
    gleich([(e, kg) for e, kg, _, _ in e1], [(1, "300"), (1, "400"), (1, "500"), (1, ""), (1, "700")], "1. Ebene mit Unvorhergesehenem vor 700")
    gleich(sum(v for _, _, _, v in e1), k["total"], "Summe der 1. Ebene = Summe netto")
    e3 = KD.din_zeilen(k["zeilen"], k, 3)
    pruefe(any(e == 3 and kg == "334" and "Fenster" in n for e, kg, n, _ in e3), f"3. Ebene nennt die Bauteile: {e3}")
    pruefe(not any(e == 2 for e, _, _, _ in KD.din_zeilen(k["zeilen"], k, 1)), "Tiefe 1 ohne 2. Ebene")


def test_kosten_je_gebaeudeteil():
    """Gebäudeteile (18.11.2026, GT-C1): calc() teilt die Bauteile nach ihrem Teil auf; Zeilen ohne Teil zählen nur zur Summe."""
    d = BK.clean_data({"bauteile": [{"id": "a", "kg": "331", "name": "AW Bestand", "menge": 10, "ep": 100, "teil": "bestand"},
                                          {"id": "b", "kg": "331", "name": "AW Anbau", "menge": 5, "ep": 200, "teil": "anbau"},
                                          {"id": "c", "kg": "445", "name": "Elektro", "menge": 1, "ep": 500}]})
    c = BK.calc(d)
    assert c["teile"] == {"bestand": 1000.0, "anbau": 1000.0}, c["teile"]
    assert c["bauwerk"] == 2500.0, c["bauwerk"]
