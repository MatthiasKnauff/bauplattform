"""Rechentests Honorar (HOAI 2021 Gebäude): Honorartafel mit Zwischenwerten, anrechenbare Kosten nach § 33, Leistungsphasen,
Zuschläge, Nebenkosten, Abrechnung nach Aufwand in Viertelstunden, Warnung bei zu hohem Aufwand, Eingaben im deutschen Format."""
from lib import gleich, pruefe

from bpcore import honorar as H


def test_tafel():
    """Tafelwerte § 35 genau, dazwischen linear; außerhalb der Tafel None."""
    gleich(H.tafel(1000000, 3), (115675.0, 144268.0), "1 Mio. €, Zone III")
    gleich(H.tafel(25000, 1), (3120.0, 3657.0), "unterster Wert")
    gleich(H.tafel(25000000, 5), (2806395.0, 3053358.0), "oberster Wert")
    gleich(H.tafel(400000, 3), (51440.5, 64156.5), "zwischen 300.000 und 500.000 €")
    gleich(H.tafel(20000, 3), None, "unter der Tafel")
    gleich(H.tafel(30000000, 3), None, "über der Tafel")


def test_anrechenbar():
    """§ 33 Abs. 2: KG 400 voll bis 25 % von KG 300, darüber zur Hälfte."""
    gleich(H.anrechenbar(1000000, 200000), 1200000.0, "unter der Grenze voll")
    gleich(H.anrechenbar(1000000, 450000), 1350000.0, "250.000 voll + 200.000 / 2")


def test_rechnung():
    """Leistungsphasen nach § 34, Satz in der Spanne, Umbauzuschlag, Nebenkosten pauschal, Umsatzsteuer, Warnung bei Aufwand über Honorar."""
    a = {"art": "hoai", "kosten": "1.000.000,00", "zone": 3, "satz": 50, "umbau": 20, "nk": {"art": "pauschal", "p": 5}}
    r = H.rechne(a, {"lph8": {"min": 60000, "kosten": 60000}})
    gleich(r["grund"], 129971.5, "Mitte der Spanne")
    gleich(sum(p["p"] for p in r["phasen"]), 100, "Leistungsbild 100 %")
    pruefe(abs(r["summe_lph"] - r["grund"]) < 0.1, f"alle Phasen beauftragt: {r['summe_lph']} ≈ {r['grund']}")
    gleich(r["umbau"], round(r["summe_lph"] * 0.2, 2), "Umbauzuschlag 20 %")
    gleich(r["nk"], round((r["summe_lph"] + r["umbau"]) * 0.05, 2), "Nebenkosten 5 %")
    gleich(r["brutto"], round(r["netto"] * 1.19, 2), "Umsatzsteuer")
    pruefe(any("Objektüberwachung" in w for w in r["warnungen"]), "Warnung: Aufwand LPh 8 über dem Honorar der Phase")
    b = {**a, "lph": {"lph8": {"an": False}, "lph1": {"an": True, "p": 2}}}
    gleich(len([p for p in H.rechne(b)["phasen"] if p["an"]]), 1, "nur angehakte Phasen zählen (nicht genannte gelten als nicht beauftragt)")


def test_aufwand_und_eingaben():
    """Abrechnung nach Aufwand je angefangene Viertelstunde; Zahlen im deutschen Format."""
    gleich((H.aufrunden(7, 15), H.aufrunden(15, 15), H.aufrunden(16, 15), H.aufrunden(16, 30)), (15, 15, 30, 30), "aufrunden")
    r = H.rechne({"art": "stunden", "nk": {"art": "aufwand"}}, {"lph5": {"min": 100, "kosten": 125, "abrechnung": 131.25}}, 50)
    gleich((r["summe_lph"], r["nk"], r["netto"]), (131.25, 50.0, 181.25), "Aufwand + Nebenkosten nach Aufwand")
    gleich((H._f("850.000,50"), H._f("1.250.000"), H._f("2,5"), H._f("x", 3)), (850000.5, 1250000.0, 2.5, 3), "Eingaben")
