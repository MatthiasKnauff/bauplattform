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


def test_abschlag_und_schluss():
    """§ 15 HOAI: Abschlag = erbrachte Leistung kumuliert (LPh × erbracht %, Umbau, Nebenkosten) − bisherige Rechnungen; Schluss zieht alle Abschläge ab."""
    a = {"art": "hoai", "kosten": 1000000, "zone": 3, "satz": 0, "umbau": 10, "nk": {"art": "pauschal", "p": 5},
         "lph": {"lph1": {"an": True, "p": 2, "erbracht": 100}, "lph2": {"an": True, "p": 7, "erbracht": 50}}}
    for k in ("lph3", "lph4", "lph5", "lph6", "lph7", "lph8", "lph9"):
        a["lph"][k] = {"an": False, "p": 0, "erbracht": 0}
    k = H.rechne(a)
    s1 = H.abrechnung(a, k)
    lph = round(115675 * 0.02, 2) + round(round(115675 * 0.07, 2) * 0.5, 2)
    gleich(s1["lph"], round(lph, 2), "LPh 1 voll + LPh 2 zur Hälfte")
    gleich(s1["umbau"], round(s1["lph"] * 0.10, 2), "Umbauzuschlag auf die erbrachte Leistung")
    gleich(s1["kum"], round(s1["lph"] + s1["umbau"] + round((s1["lph"] + s1["umbau"]) * 0.05, 2), 2), "Nebenkosten 5 %")
    gleich((s1["bisher"], s1["betrag"]), (0, s1["kum"]), "erste Rechnung: alles")
    gleich(s1["mwst"], round(s1["betrag"] * 0.19, 2), "Umsatzsteuer")
    a["lph"]["lph2"]["erbracht"] = 100
    k = H.rechne(a)
    s2 = H.abrechnung(a, k, [{"nr": "2026-001", "art": "abschlag", "datum": "2026-10-01", "betrag": s1["betrag"], "status": "bezahlt", "bezahlt": s1["brutto"]}])
    gleich(s2["bisher"], s1["betrag"], "erster Abschlag abgezogen")
    gleich(s2["betrag"], round(s2["kum"] - s1["betrag"], 2), "zweiter Abschlag = Zuwachs")
    gleich(round(s2["kum"], 2), k["netto"], "alles erbracht = vereinbartes Honorar")
    p = H.abrechnung({"art": "pauschal", "pauschal": 20000, "nk": {"art": "pauschal", "p": 0}}, H.rechne({"art": "pauschal", "pauschal": 20000, "nk": {"art": "pauschal", "p": 0}}), (), "40")
    gleich((p["anteil"], p["kum"]), (40.0, 8000.0), "Pauschal: 40 % erbracht")
    gleich(H.re_nummer("{jahr}-{lfd:03}", 2026, 7), "2026-007", "Rechnungsnummer")
    gleich(H.re_nummer("HR{jahr2}/{lfd}", 2026, 7), "HR26/7", "eigenes Muster")
    gleich(H.re_nummer("{falsch}", 2026, 7), "2026-007", "kaputtes Muster → Vorgabe")


def test_steuernummer():
    """§ 14 Abs. 4 Nr. 2 UStG: Steuernummer oder USt-IdNr. in der Zusatzzeile erkannt, sonst Warnung."""
    for t in ("Steuernummer 112/5678/9012", "USt-IdNr. DE123456789", "St.-Nr. 112/5678/9012", "DE 123456789"):
        pruefe(H.steuernummer_da(t), f"erkannt: {t}")
    for t in ("", "Amtsgericht Essen HRB 1234", "Geschäftsführer August Lustig"):
        pruefe(not H.steuernummer_da(t), f"keine Steuernummer: {t}")


def test_satz_text():
    """Honorarsatz in Worten: Basis, Mittelsatz, oberer Satz, sonst Anteil der Spanne."""
    gleich([H.satz_text(x) for x in (0, None, 50, "50", 100)], ["Basishonorarsatz", "Basishonorarsatz", "Mittelsatz", "Mittelsatz", "oberer Honorarsatz"], "feste Sätze")
    gleich(H.satz_text(37.5), "37,5 % der Spanne zwischen Basis- und oberem Honorarsatz", "Anteil der Spanne")
    gleich(H.satz_text(25, kurz=True), "25 % der Spanne", "kurz")
