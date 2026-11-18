"""Rechentests der Rechenleiter (Abzüge netto – Umsatzsteuer – brutto, besprochen am 14.11.2026) – echte Funktionen aus ava.py und
ava_abzuege.py, Sollwerte von Hand gerechnet. Läuft im Container der AVA (tools/tests/einheit/run.py), ohne Datenbank."""
from datetime import date

import ava
import ava_abzuege as AB
from lib import gleich, pruefe

ITEMS = [{"id": "p1", "typ": "pos", "oz": "", "kurz": "Mauerwerk", "lang": "", "menge": 100, "einheit": "m²", "art": "N", "ep_s": 100.0}]


def _lv(V):
    return {"data": {"items": ITEMS}, "vergabe": V}


def _re(i, nr, art, status="offen", data=None, datum=""):
    return {"id": i, "nr": nr, "art": art, "status": status, "data": data or {}, "gefordert": 0, "eingang": "", "datum": datum}


def test_leiter_netto_und_brutto():
    """Umlage 0,5 % netto vom Stand nach Nachlass; Einbehalt brutto = netto × 1,19 (gleicher Zahlbetrag); Vertragsstrafe und Bauabzugsteuer nach der Steuer."""
    V = {"preise": {"p1": 100.0}, "einbehalt": 5, "nachlass": 2, "auftrag": {"vertragsstrafe": 0.2, "vertragsstrafe_max": 5, "ende": "2026-10-01"},
         "sicherheit": {"abnahme": "2026-10-10"}, "abzug": {"bauabzug": True},
         "leiter": {"eigen": [{"id": "ab12", "name": "Umlage Bauwasser", "seite": "netto", "typ": "pct", "wert": 0.5, "an": True}]}}
    K = ava.rechne(_lv(V), [], [{"pos_id": "p1", "menge": 100}], [_re(1, 1, "schluss", data={"strafe": 100.0})])
    c = K["rechnungen"][0]
    # 100 × 100 = 10.000; Nachlass 2 % = 200 → 9.800; Umlage 0,5 % = 49 → 9.751; Einbehalt 5 % = 487,55 → 9.263,45 netto
    gleich(c["leistung"], 10000.0, "Leistungsstand")
    gleich(c["netto_zeilen"][0]["betrag"], -49.0, "Umlage 0,5 % vom Stand nach Nachlass")
    gleich(c["zahlung"], 9263.45, "Zahlbetrag netto")
    gleich(c["brutto"], 11023.51, "brutto = 9.263,45 × 1,19")
    # Vertragsstrafe 100 € ohne USt → 10.923,51; Bauabzugsteuer 15 % = 1.638,53 → 9.284,98
    gleich([z["k"] for z in c["brutto_zeilen"]], ["strafe", "bauabzug"], "Abzüge nach der Steuer")
    gleich(c["bauabzug"], 1638.53, "Bauabzugsteuer 15 %")
    gleich(c["auszahlung"], 9284.98, "Zahlbetrag an die Firma")
    # Vorschlag: 01.10. → 10.10.2026 = 8 Werktage (Mo–Sa) × 0,2 % × 9.751 = 156,02 (unter 5 % = 487,55)
    gleich(c["strafe_vorschlag"]["tage"], 8, "Werktage Verzug")
    gleich(c["strafe_vorschlag"]["betrag"], 156.02, "Vorschlag Vertragsstrafe")


def test_bauabzug_mit_freistellung_und_schalter():
    """Gültige Freistellungsbescheinigung → keine Bauabzugsteuer; je Rechnung abschaltbar."""
    V = {"abzug": {"bauabzug": True}, "leiter": {"bauabzug": {"frei_bis": "2027-12-31"}}}
    pruefe(not AB.bauabzug_gilt(V, {}, "2026-11-14"), "Freistellung gilt noch")
    pruefe(AB.bauabzug_gilt(V, {}, "2028-01-02"), "Freistellung abgelaufen")
    pruefe(not AB.bauabzug_gilt({"abzug": {"bauabzug": True}}, {"abzug": {"bauabzug": False}}, "2026-11-14"), "in der Rechnung abgeschaltet")
    pruefe(not AB.bauabzug_gilt({}, {}, "2026-11-14"), "ohne Einstellung aus")


def test_setzen_und_reihe():
    """Leiter speichern: Werte in die vorhandenen Felder (ein Eintrag je Sache), Reihenfolge, eigene Zeilen brutto."""
    V = AB.setzen({"bieter": "Firma"}, {"reihe": ["vorher", "ve"], "eigen": [{"id": "zz99", "name": "Gegenforderung", "seite": "brutto", "typ": "eur", "wert": 250}],
                                      "an": {"ve": False, "skonto": False},
                                      "werte": {"nachlass": {"pct": 3}, "skonto": {"pct": 2, "tage": 14, "art": "wt"}, "ve": {"pct": 4},
                                                "ma": {"pct": 3, "jahre": 5}, "strafe": {"pct": 0.2, "max": 5, "art": "kt"}}}, ava._sicherheit_clean)
    gleich((V["nachlass"], V["skonto"], V["skonto_tage"], V["skonto_art"], V["einbehalt"]), (3.0, 2.0, 14, "wt", 4.0), "Werte im Auftrag")
    gleich((V["sicherheit"]["ma"]["pct"], V["sicherheit"]["gw_jahre"]), (3.0, 5), "Mängelansprüche")
    gleich((V["auftrag"]["vertragsstrafe"], V["auftrag"]["vertragsstrafe_max"], V["auftrag"]["vertragsstrafe_art"]), (0.2, 5.0, "kt"), "Vertragsstrafe")
    gleich((V["abzug"]["einbehalt"], V["abzug"]["skonto"]), (False, False), "an/aus")
    n, b = AB.reihe(V)
    gleich(b[:2], ["vorher", "ve"], "Reihenfolge brutto wie gespeichert")
    pruefe("e:zz99" in b and "e:zz99" not in n, "eigene Zeile auf der Brutto-Seite")
    T = AB.vb_text(V)
    gleich(T["vertragsstrafe"], "0,2 % der Abrechnungssumme netto je Kalendertag Verzug, höchstens 5 %", "Text Vertragsstrafe")
    gleich(T["gewaehrleistung"], "5 Jahre ab Abnahme", "Text Gewährleistung")


def test_werktage():
    gleich(AB.werktage(date(2026, 10, 1), date(2026, 10, 10)), 8, "Do 01.10. → Sa 10.10.: 02.–10. ohne Sonntag 04.")
    gleich(AB.werktage(date(2026, 10, 1), date(2026, 10, 10), "kt"), 9, "Kalendertage: 02.–10.")
    gleich(AB.werktage(date(2026, 10, 1), date(2026, 10, 10), "at"), 6, "Arbeitstage Mo–Fr: ohne Sa 03., So 04., Sa 10.")
    gleich(AB.werktage(date(2026, 10, 10), date(2026, 10, 1)), 0, "vor der Frist fertig: kein Verzug")


def test_vorangegangene_zahlungen():
    """AZ-A1 B1 C1 (18.11.2026, ava_zahlungen.py): Zahlungen ohne Rechnung in der Plattform zählen als „bisherige Zahlungen“, bis eine geprüfte
    kumulierte Rechnung sie aufnimmt (Zahlung bis zu ihrem Rechnungsdatum); spätere Zahlungen gehen in die nächste Rechnung; in „abgerechnet“ mit."""
    V = {"preise": {"p1": 100.0}, "einbehalt": 5, "zahlungen": [{"id": "a", "datum": "2026-09-20", "netto": 1000.0, "brutto": 1190.0},
                                                                {"id": "b", "datum": "2026-10-15", "netto": 4000.0, "brutto": 4760.0}]}
    am = [{"pos_id": "p1", "menge": 100}]
    K = ava.rechne(_lv(V), [], am, [_re(1, 1, "abschlag")])
    c = K["rechnungen"][0]
    # 10.000 − 5 % = 9.500; bisherige Zahlungen 5.000 (beide ohne Rechnung hier) → 4.500
    gleich((c["vorher"], c.get("vorher_frei"), c["zahlung"], K["abgerechnet"]), (5000.0, 5000.0, 4500.0, 5000.0), "erste Rechnung in der Plattform")
    r1 = _re(1, 1, "abschlag", status="geprueft", data={"stand": {"p1": 50}, "einbehalt": 5}, datum="2026-10-01")
    K = ava.rechne(_lv(V), [], am, [r1, _re(2, 2, "abschlag")])
    a, b = K["rechnungen"]
    # 1. Rechnung (01.10.): 5.000 − 5 % = 4.750 − 1.000 (Zahlung vom 20.09.) = 3.750; 2.: 9.500 − (4.750 + 4.000 vom 15.10.) = 750
    gleich((a["vorher"], a["zahlung"], b["vorher"], b.get("vorher_frei"), b["zahlung"]), (1000.0, 3750.0, 8750.0, 4000.0, 750.0), "Zahlung danach geht in die nächste Rechnung")
    gleich((K["abgerechnet"], K["zahlungen_frei"]), (8750.0, {"summe": 5000.0, "offen": 4000.0, "n": 2}), "abgerechnet mit der noch offenen Zahlung")
