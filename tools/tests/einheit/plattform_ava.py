"""Rechentests der Ausschreibung & Abrechnung (AVA) – rufen die echten Rechenfunktionen aus ava.py direkt auf.

Alle Sollwerte sind von Hand nach der fachlichen Regel gerechnet (Menge × Einheitspreis, Nachlass, Einbehalt, Umsatzsteuer …),
nicht mit dem Programm selbst. Läuft im Container der AVA (siehe tools/tests/einheit/run.py), braucht keine Datenbank.
"""
import io

import ava
from bpcore import gaeb
from lib import gleich, pruefe


# ---------------------------------------------------------------- kleine Hilfen
def _pos(i, menge, einheit="m²", ep_s=None, art="N", **kw):
    return {"id": i, "typ": "pos", "oz": "", "kurz": f"Position {i}", "lang": "", "menge": menge, "einheit": einheit, "art": art, "ep_s": ep_s, **kw}


def _lv(items, vergabe=None):
    return {"data": {"items": items}, "vergabe": vergabe or {}}


def _re(i, nr, art="abschlag", status="offen", data=None, gefordert=0, eingang=""):
    return {"id": i, "nr": nr, "art": art, "status": status, "data": data or {}, "gefordert": gefordert, "eingang": eingang}


def _rc(K, rid):
    x = next((r for r in K["rechnungen"] if r["id"] == rid), None)
    pruefe(x, f"Rechnung {rid} fehlt im Ergebnis")
    return x


# Rohbau-LV für die Abrechnungsbeispiele: Mauerwerk 120 m² × 48,20 €, Innenputz 300 m² × 18,75 €
ROHBAU = [{"id": "t1", "typ": "titel", "lvl": 1, "oz": "01", "kurz": "Mauerarbeiten"},
          _pos("p1", 120, ep_s=48.20), _pos("p2", 300, ep_s=18.75)]
AUFTRAG = {"p1": 48.20, "p2": 18.75}


# ---------------------------------------------------------------- Massenermittlung
def test_formel_rechenweg():
    """Rechenweg im Aufmaß: Komma, ×, Tausenderpunkt, Klammern und Abzüge werden richtig gerechnet."""
    gleich(ava.formel("12,5"), 12.5, "einfache Zahl mit Komma")
    gleich(ava.formel("2 × 3,50 × 2,75"), 19.25, "Wandfläche 2 × 3,50 × 2,75")
    # Wand 2 × 3,50 m × 2,75 m abzüglich Tür 0,885 × 2,135 = 19,25 − 1,889475 = 17,360525 → 17,3605
    gleich(ava.formel("2 × 3,50 × 2,75 – 0,885 × 2,135"), 17.3605, "Wand abzüglich Türöffnung", 0.00005)
    gleich(ava.formel("(12,40 + 8,10) × 2 × 2,75"), 112.75, "Umfang × Höhe mit Klammer")
    gleich(ava.formel("1.250,5 + 4,5"), 1255.0, "Tausenderpunkt")
    gleich(ava.formel("2x3"), 6.0, "x als Malzeichen")
    gleich(ava.formel("10 : 4"), 2.5, "Doppelpunkt als Geteiltzeichen")
    gleich(ava.formel("3 · 1,5"), 4.5, "Malpunkt")
    pruefe(ava.formel("2 m × 3") is None, "Buchstaben im Rechenweg müssen abgelehnt werden (None)")
    pruefe(ava.formel("") is None, "leerer Rechenweg ergibt None")
    pruefe(ava.formel("__import__('os')") is None, "Programmcode im Rechenweg muss abgelehnt werden")


# ---------------------------------------------------------------- LV-Inhalt
def test_nummerieren_titel_und_positionen():
    """Ordnungszahlen: Titel 01, 02, Untertitel 01.01, Positionen 0010, 0020 je Titel, Hinweistexte ohne OZ."""
    items = [{"id": "a", "typ": "titel", "lvl": 1, "kurz": "Erdarbeiten"},
             _pos("b", 85), _pos("c", 40),
             {"id": "d", "typ": "titel", "lvl": 2, "kurz": "Baugrube"},
             _pos("e", 120, "m³"), _pos("f", 0, "", art="T"),
             {"id": "g", "typ": "titel", "lvl": 1, "kurz": "Mauerarbeiten"},
             _pos("h", 120)]
    ava.nummerieren(items)
    gleich([x["oz"] for x in items], ["01", "01.0010", "01.0020", "01.01", "01.01.0010", "", "02", "02.0010"], "Ordnungszahlen")
    ohne_titel = ava.nummerieren([_pos("x", 1), _pos("y", 2)])
    gleich([x["oz"] for x in ohne_titel], ["0010", "0020"], "Positionen ohne Titel")


def test_positionen_saeubern():
    """Eingaben einer Position werden bereinigt: Komma-Zahlen, keine negativen Mengen, unbekannte Art → Normalposition."""
    out = ava.clean_items([
        {"id": "p1", "typ": "pos", "kurz": " Mauerwerk KS 17,5 cm ", "menge": "12,5", "einheit": "m²", "ep_s": "48,20", "kg": "KG 331a"},
        {"id": "p1", "typ": "pos", "kurz": "doppelte ID", "menge": -3, "art": "X", "ep_s": ""},
        {"typ": "titel", "lvl": 7, "kurz": "zu tief"},
        "keine Position",
    ])
    gleich(len(out), 3, "Anzahl Zeilen (Text ohne Objekt fällt weg)")
    a, b, t = out
    gleich(a["kurz"], "Mauerwerk KS 17,5 cm", "Kurztext ohne Leerzeichen am Rand")
    gleich(a["menge"], 12.5, "Menge aus „12,5“")
    gleich(a["ep_s"], 48.2, "Schätzpreis aus „48,20“")
    gleich(a["kg"], "331", "Kostengruppe nur Ziffern")
    pruefe(b["id"] != "p1", "doppelte Positions-ID muss neu vergeben werden")
    gleich(b["menge"], 0, "negative Menge wird 0")
    gleich(b["art"], "N", "unbekannte Art wird Normalposition")
    pruefe(b["ep_s"] is None, "leerer Schätzpreis bleibt leer (None)")
    gleich(t["lvl"], 4, "Titelebene höchstens 4")


def test_zaehlt_positionsarten():
    """In die Summe zählen Normal-, Pauschal- und Bedarfspositionen mit GB – nicht Wahl-, Bedarfs- ohne GB, entfallene, Nachträge."""
    gleich(bool(ava.zaehlt(_pos("a", 1))), True, "Normalposition")
    gleich(bool(ava.zaehlt(_pos("a", 1, art="P"))), True, "Pauschalposition")
    gleich(bool(ava.zaehlt(_pos("a", 1, art="E", gb=True))), True, "Bedarfsposition mit Gesamtbetrag")
    gleich(bool(ava.zaehlt(_pos("a", 1, art="E"))), False, "Bedarfsposition ohne Gesamtbetrag")
    gleich(bool(ava.zaehlt(_pos("a", 1, art="A"))), False, "Wahlposition")
    gleich(bool(ava.zaehlt(_pos("a", 1, entf=True))), False, "entfallene Position")
    gleich(bool(ava.zaehlt(_pos("a", 1, nt="NT01"))), False, "Nachtragsposition")


# ---------------------------------------------------------------- Kostenschätzung, Angebote, Auftrag
SCHAETZ_LV = [
    _pos("p1", 12.5, ep_s=48.20),                      # Mauerwerk 12,5 m² × 48,20 = 602,50
    _pos("p2", 85.4, ep_s=18.75),                      # Innenputz 85,4 m² × 18,75 = 1.601,25
    _pos("p3", 10, "m", ep_s=30.0, art="E"),           # Bedarfsposition ohne GB – zählt nicht
    _pos("p4", 5, "St", ep_s=100.0, art="A"),          # Wahlposition – zählt nicht
    _pos("p5", 1, "psch", ep_s=1500.0, art="P"),       # Baustelleneinrichtung pauschal 1.500,00
    _pos("p6", 4, "h", ep_s=52.50, art="E", gb=True),  # Bedarfsposition mit GB 4 h × 52,50 = 210,00
    _pos("p7", 2, "St"),                               # ohne Schätzpreis
    _pos("p8", 3, ep_s=99.0, entf=True),               # entfällt – zählt nicht
    _pos("hx", 0, "", art="T"),                        # Hinweistext
]


def test_kostenschaetzung_summe():
    """Kostenschätzung = Σ Menge × Schätzpreis der zählenden Positionen (602,50 + 1.601,25 + 1.500,00 + 210,00 = 3.913,75 €)."""
    K = ava.rechne(_lv(SCHAETZ_LV), [], [], [])
    gleich(K["schaetzung"], 3913.75, "Kostenschätzung")
    gleich(K["ohne_schaetzung"], 1, "Positionen ohne Schätzpreis")
    gleich(K["auftrag"], 0, "ohne Vergabe kein Auftrag")


def test_angebote_wertung_und_rang():
    """Angebotssummen, Nachlass in % und €, fehlende Preise und Rangfolge nach der Wertungssumme."""
    a1 = {"id": 1, "preise": {"p1": 50.0, "p2": 19.0, "p3": 25.0, "p5": 1400.0, "p6": 50.0, "p7": 20.0}, "nachlass": 3.0, "nachlass_eur": 0}
    a2 = {"id": 2, "preise": {"p1": 47.0, "p2": 18.5, "p5": 1600.0, "p6": 55.0}, "nachlass": 0, "nachlass_eur": 150.0}
    a3 = {"id": 3, "preise": {}, "nachlass": 0, "nachlass_eur": 0}
    K = ava.rechne(_lv(SCHAETZ_LV), [a1, a2, a3], [], [])
    A = {x["id"]: x for x in K["angebote"]}
    # Bieter 1: 625,00 + 1.622,60 + 1.400,00 + 200,00 + 40,00 = 3.887,60; −3 % = 3.770,972
    gleich(A[1]["summe"], 3887.60, "Angebotssumme Bieter 1")
    gleich(A[1]["netto"], 3770.97, "Wertungssumme Bieter 1 (−3 %)")
    gleich(A[1]["fehlt"], 0, "fehlende Preise Bieter 1")
    # Bieter 2: 587,50 + 1.579,90 + 1.600,00 + 220,00 = 3.987,40; −150 € = 3.837,40; Position p7 ohne Preis
    gleich(A[2]["summe"], 3987.40, "Angebotssumme Bieter 2")
    gleich(A[2]["netto"], 3837.40, "Wertungssumme Bieter 2 (−150 €)")
    gleich(A[2]["fehlt"], 1, "fehlende Preise Bieter 2")
    gleich(A[1].get("rang"), 1, "Rang Bieter 1")
    gleich(A[2].get("rang"), 2, "Rang Bieter 2")
    pruefe("rang" not in A[3], "leeres Angebot bekommt keinen Rang")


def test_auftragssumme_nachlass_und_nachtraege():
    """Auftrag = Σ Menge × Auftrags-EP − Nachlass (3 % und 100 €); Nachträge je Status getrennt, mit Nachlass."""
    items = SCHAETZ_LV + [_pos("n1", 6, nt="NT01", nt_status="beauftragt"), _pos("n2", 2, "St", nt="NT02", nt_status="angemeldet"),
                          _pos("n3", 1, "psch", nt="NT03", nt_status="abgelehnt")]
    VP = {"p1": 50.0, "p2": 19.0, "p3": 25.0, "p5": 1400.0, "p6": 50.0, "p7": 20.0, "n1": 45.0, "n2": 120.0, "n3": 500.0}
    K = ava.rechne(_lv(items, {"preise": VP, "nachlass": 3}), [], [], [])
    gleich(K["auftrag"], 3770.97, "Auftragssumme 3.887,60 × 0,97")
    gleich(K["nachtraege"]["beauftragt"], 261.90, "beauftragter Nachtrag 6 × 45 × 0,97")
    gleich(K["nachtraege"]["angemeldet"], 232.80, "angemeldeter Nachtrag 2 × 120 × 0,97")
    gleich(K["nachtraege"]["abgelehnt"], 485.00, "abgelehnter Nachtrag 500 × 0,97")
    # zusätzlich 100 € fester Nachlass: 3.887,60 × 0,97 − 100 = 3.670,97
    K = ava.rechne(_lv(items, {"preise": VP, "nachlass": 3, "nachlass_eur": 100}), [], [], [])
    gleich(K["auftrag"], 3670.97, "Auftragssumme mit 3 % und 100 € Nachlass")


def test_nachlass_satz():
    """Nachlass als Anteil: 5 % plus 50 € auf 1.000 € Auftrag = 10 %; höchstens 99 %."""
    pos = [_pos("p1", 10)]
    gleich(ava.nachlass_satz({"preise": {"p1": 100.0}, "nachlass": 5, "nachlass_eur": 50}, pos), 0.10, "5 % + 50 € auf 1.000 €", 1e-9)
    gleich(ava.nachlass_satz({"preise": {"p1": 100.0}, "nachlass": 0}, pos), 0.0, "ohne Nachlass", 1e-9)
    gleich(ava.nachlass_satz({"preise": {"p1": 100.0}, "nachlass": 100}, pos), 0.99, "Obergrenze 99 %", 1e-9)


# ---------------------------------------------------------------- Rechnungsprüfung
def test_abschlag_und_schlussrechnung_kumuliert():
    """Teilrechnung geprüft, Schlussrechnung kumuliert: Leistungsstand, Abzug 0,3 %, Einbehalt 5 %, bisher anerkannt, USt 19 %."""
    V = {"preise": AUFTRAG, "einbehalt": 5}
    aufmass = [{"pos_id": "p1", "menge": 120}, {"pos_id": "p2", "menge": 300}]
    r1 = _re(11, 1, status="geprueft", data={"stand": {"p1": 60, "p2": 100}, "einbehalt": 5}, gefordert=4800)
    r2 = _re(12, 2, art="schluss", data={"abzuege": [{"text": "Bauwesenversicherung", "pct": 0.3}]}, gefordert=11500)
    K = ava.rechne(_lv(ROHBAU, V), [], aufmass, [r1, r2])
    a = _rc(K, 11)
    # 1. Teilrechnung: 60 × 48,20 + 100 × 18,75 = 2.892,00 + 1.875,00 = 4.767,00; Einbehalt 5 % = 238,35
    gleich(a["leistung"], 4767.00, "1. TR Leistungsstand")
    gleich(a["einbehalt"], 238.35, "1. TR Einbehalt 5 %")
    gleich(a["anerkannt"], 4528.65, "1. TR anerkannt")
    gleich(a["zahlung"], 4528.65, "1. TR Zahlbetrag netto")
    gleich(a["mwst"], 860.44, "1. TR Umsatzsteuer 19 %")
    gleich(a["brutto"], 5389.09, "1. TR Zahlbetrag brutto")
    gleich(a["differenz"], 33.00, "1. TR gefordert 4.800 − geprüft 4.767")
    b = _rc(K, 12)
    # Schluss: 120 × 48,20 + 300 × 18,75 = 5.784,00 + 5.625,00 = 11.409,00; Abzug 0,3 % = 34,227 → 11.374,773
    # Einbehalt 5 % = 568,739 → anerkannt 10.806,034; abzüglich 4.528,65 → 6.277,384
    gleich(b["leistung"], 11409.00, "SR Leistungsstand")
    gleich(b["abzuege"], 34.23, "SR Abzug Bauwesenversicherung 0,3 %")
    gleich(b["einbehalt"], 568.74, "SR Einbehalt 5 %")
    gleich(b["anerkannt"], 10806.03, "SR anerkannt (kumuliert)")
    gleich(b["vorher"], 4528.65, "SR bisher anerkannt")
    gleich(b["zahlung"], 6277.38, "SR Zahlbetrag netto")
    gleich(b["mwst"], 1192.70, "SR Umsatzsteuer")
    gleich(b["brutto"], 7470.09, "SR Zahlbetrag brutto")
    gleich(b["differenz"], 91.00, "SR gefordert 11.500 − 11.409")
    gleich(K["abgerechnet"], 4528.65, "abgerechnet = nur geprüfte Rechnungen")
    gleich(K["sicherheit"]["einbehalten"], 238.35, "Einbehalt der letzten geprüften Rechnung")
    gleich(K["leistung"], 11409.00, "Leistungsstand laut Aufmaß")


def test_zahlbetrag_von_hand_festgesetzt():
    """Freigabe netto von Hand: zählt statt des rechnerischen Betrags; die nächste kumulierte Rechnung holt den Rückhalt nach."""
    V = {"preise": AUFTRAG, "einbehalt": 5}
    aufmass = [{"pos_id": "p1", "menge": 120}, {"pos_id": "p2", "menge": 300}]
    r1 = _re(11, 1, status="geprueft", data={"stand": {"p1": 60, "p2": 100}, "einbehalt": 5, "hand": {"betrag": 4000, "grund": "Achse 3 nicht abgenommen"}})
    r2 = _re(12, 2, art="schluss", data={"abzuege": [{"text": "Bauwesenversicherung", "pct": 0.3}]})
    K = ava.rechne(_lv(ROHBAU, V), [], aufmass, [r1, r2])
    a = _rc(K, 11)
    # rechnerisch 4.528,65 (wie oben), von Hand 4.000,00 → Abweichung −528,65
    gleich(a["zahlung"], 4000.00, "1. TR Zahlbetrag von Hand")
    gleich(a["hand"]["rechnerisch"], 4528.65, "1. TR rechnerisch")
    gleich(a["hand"]["abweichung"], -528.65, "1. TR Abweichung")
    gleich(a["mwst"], 760.00, "1. TR USt auf den festgesetzten Betrag")
    gleich(a["anerkannt"], 4528.65, "anerkannt bleibt rechnerisch (Anzeige)")
    b = _rc(K, 12)
    # Schluss: anerkannt 10.806,03; bisher tatsächlich freigegeben 4.000,00 → 6.806,03 (= 6.277,38 + nachgeholte 528,65)
    gleich(b["vorher"], 4000.00, "SR bisher anerkannt = tatsächlich freigegeben")
    gleich(b["zahlung"], 6806.03, "SR holt den Rückhalt nach")
    gleich(K["abgerechnet"], 4000.00, "abgerechnet = tatsächlich freigegeben")


def test_schlussrechnung_eigener_satz_maengel():
    """Schlussrechnung mit eigenem Einbehalt für Mängelansprüche (3 %) statt 5 % Vertragserfüllung."""
    V = {"preise": AUFTRAG, "einbehalt": 5, "sicherheit": {"ma": {"form": "einbehalt", "pct": 3}}}
    aufmass = [{"pos_id": "p1", "menge": 120}, {"pos_id": "p2", "menge": 300}]
    r1 = _re(21, 1, status="geprueft", data={"stand": {"p1": 60, "p2": 100}, "einbehalt": 5})
    r2 = _re(22, 2, art="schluss")
    K = ava.rechne(_lv(ROHBAU, V), [], aufmass, [r1, r2])
    b = _rc(K, 22)
    # 11.409,00 × 3 % = 342,27 → anerkannt 11.066,73; abzüglich 4.528,65 = 6.538,08
    gleich(b["einbehalt_pct"], 3.0, "Satz Mängelansprüche")
    gleich(b["einbehalt"], 342.27, "Einbehalt 3 %")
    gleich(b["anerkannt"], 11066.73, "anerkannt")
    gleich(b["zahlung"], 6538.08, "Zahlbetrag netto")


def test_rechnung_nachlass_und_skonto():
    """Teilrechnung mit 2 % Nachlass und 3 % Skonto (14 Tage ab Eingang 02.11.2026 → bis 16.11.2026)."""
    V = {"preise": {"p1": 48.20}, "nachlass": 2, "einbehalt": 5, "skonto": 3, "skonto_tage": 14}
    lv = _lv([_pos("p1", 50)], V)
    r = _re(31, 1, eingang="2026-11-02")
    K = ava.rechne(lv, [], [{"pos_id": "p1", "menge": 50}], [r])
    x = _rc(K, 31)
    # 50 × 48,20 = 2.410,00; Nachlass 2 % = 48,20 → 2.361,80; Einbehalt 5 % = 118,09 → 2.243,71
    # brutto 2.243,71 × 1,19 = 2.670,0149; Skonto 3 % = 80,10 → 2.589,91
    gleich(x["leistung"], 2410.00, "Leistungsstand")
    gleich(x["nachlass"], 48.20, "Nachlass 2 %")
    gleich(x["einbehalt"], 118.09, "Einbehalt 5 %")
    gleich(x["zahlung"], 2243.71, "Zahlbetrag netto")
    gleich(x["brutto"], 2670.01, "Zahlbetrag brutto")
    gleich(x["skonto"], 80.10, "Skonto 3 %")
    gleich(x["brutto_skonto"], 2589.91, "Zahlbetrag mit Skonto")
    gleich(x["skonto_bis"], "2026-11-16", "Skontofrist")
    gleich(K["auftrag"], 2361.80, "Auftrag 2.410,00 − 2 %")
    gleich(K["leistung"], 2361.80, "Leistungsstand nach Nachlass")
    # in der Rechnung geändert: 2 % in 10 Tagen → 53,40 € bis 12.11.2026
    r["data"] = {"skonto": 2, "skonto_tage": 10}
    x = _rc(ava.rechne(lv, [], [{"pos_id": "p1", "menge": 50}], [r]), 31)
    gleich(x["skonto"], 53.40, "Skonto 2 % (in der Rechnung geändert)")
    gleich(x["brutto_skonto"], 2616.61, "Zahlbetrag mit 2 % Skonto")
    gleich(x["skonto_bis"], "2026-11-12", "Skontofrist 10 Tage")


def test_regie_frei_und_freigabe_sicherheit():
    """Regierechnung (Stundenlohn), Rechnung ohne Aufmaß und Freigabe der Sicherheit stehen jeweils für sich."""
    V = {"frei": True, "summe": 5000, "einbehalt": 5}
    regie = _re(41, 1, art="regie", status="geprueft", data={"einbehalt": 5, "zeilen": [
        {"text": "Facharbeiter", "menge": 8, "einheit": "h", "ep": 52.50},   # 420,00
        {"text": "Helfer", "menge": 8, "einheit": "h", "ep": 41.00},         # 328,00
        {"text": "Bauschutt entsorgen", "menge": 2, "einheit": "t", "ep": 85.00}]})   # 170,00
    frei = _re(42, 2, status="geprueft", data={"frei": 2000, "einbehalt": 5})
    sich = _re(43, 3, art="sicherheit", data={"betrag": 145.90})
    K = ava.rechne(_lv([], V), [], [], [regie, frei, sich])
    gleich(K["auftrag"], 5000.00, "frei eingetragener Auftrag")
    a = _rc(K, 41)
    # 420 + 328 + 170 = 918,00; Einbehalt 5 % = 45,90 → 872,10; brutto 1.037,80
    gleich(a["leistung"], 918.00, "Summe Stundenlohnarbeiten")
    gleich(a["einbehalt"], 45.90, "Einbehalt Regie")
    gleich(a["zahlung"], 872.10, "Zahlbetrag Regie netto")
    gleich(a["brutto"], 1037.80, "Zahlbetrag Regie brutto")
    b = _rc(K, 42)
    gleich(b["vorher"], 0, "Rechnung ohne Aufmaß zieht nichts ab")
    gleich(b["zahlung"], 1900.00, "2.000 − 5 % Einbehalt")
    c = _rc(K, 43)
    gleich(c["zahlung"], 145.90, "Freigabe der Sicherheit")
    gleich(c["brutto"], 173.62, "Freigabe brutto 145,90 × 1,19")
    gleich(K["sicherheit"]["einbehalten"], 145.90, "einbehalten 45,90 + 100,00")
    gleich(K["sicherheit"]["freigegeben"], 0, "noch nicht geprüfte Freigabe zählt nicht")
    gleich(K["abgerechnet"], 2772.10, "abgerechnet 872,10 + 1.900,00")
    sich["status"] = "geprueft"
    K = ava.rechne(_lv([], V), [], [], [regie, frei, sich])
    gleich(K["sicherheit"]["freigegeben"], 145.90, "freigegeben")
    gleich(K["sicherheit"]["offen"], 0, "nichts mehr einbehalten")


def test_sicherheiten_und_gewaehrleistung():
    """Sicherheiten: Bürgschaft löst den Einbehalt ab; Ende der Mängelfrist = Abnahme + Jahre (auch 29. Februar)."""
    S = ava.sicherheit_conf({"einbehalt": 5, "sicherheit": {"abnahme": "2026-03-15", "gw_jahre": 5}})
    gleich(S["gw_ende"], "2031-03-15", "Abnahme 15.03.2026 + 5 Jahre")
    gleich(S["pct_abschlag"], 5.0, "Einbehalt Teilrechnungen")
    gleich(S["pct_schluss"], 5.0, "Einbehalt Schlussrechnung wie Vertragserfüllung")
    S = ava.sicherheit_conf({"einbehalt": 5, "sicherheit": {"abnahme": "2024-02-29", "gw_jahre": 5}})
    gleich(S["gw_ende"], "2029-02-28", "Abnahme am 29.02. → 28.02. im Nicht-Schaltjahr")
    S = ava.sicherheit_conf({"sicherheit": {"abnahme": "2025-06-30"}})
    gleich(S["gw_jahre"], 4, "Vorgabe 4 Jahre (VOB/B)")
    gleich(S["gw_ende"], "2029-06-30", "Abnahme 30.06.2025 + 4 Jahre")
    S = ava.sicherheit_conf({"einbehalt": 5, "sicherheit": {"ve": {"form": "buergschaft", "eingang": "2026-05-04"},
                                                             "ma": {"form": "buergschaft"}}})
    gleich(S["pct_abschlag"], 0.0, "Bürgschaft eingegangen → kein Einbehalt in Teilrechnungen")
    gleich(S["pct_schluss"], 5.0, "Bürgschaft für Mängel noch nicht eingegangen → Einbehalt bleibt")


# ---------------------------------------------------------------- Austausch und Einlesen
def test_gaeb_hin_und_zurueck():
    """GAEB X84 schreiben und wieder lesen: Titel, OZ, Mengen, Einheiten, Positionsarten und Einheitspreise bleiben erhalten."""
    items = [{"id": "t1", "typ": "titel", "lvl": 1, "oz": "01", "kurz": "Mauerarbeiten"},
             {"id": "h1", "typ": "pos", "art": "T", "oz": "", "kurz": "Hinweis Mauerwerk", "lang": "Alle Wände nach DIN EN 1996.", "menge": 0, "einheit": ""},
             {"id": "p1", "typ": "pos", "art": "N", "oz": "01.0010", "kurz": "Mauerwerk KS 17,5 cm", "lang": "Kalksandstein\nMörtelgruppe IIa", "menge": 12.5, "einheit": "m²"},
             {"id": "t2", "typ": "titel", "lvl": 2, "oz": "01.01", "kurz": "Zulagen"},
             {"id": "p2", "typ": "pos", "art": "E", "gb": True, "oz": "01.01.0010", "kurz": "Stundenlohn Facharbeiter", "menge": 4, "einheit": "h"},
             {"id": "p3", "typ": "pos", "art": "A", "oz": "01.01.0020", "kurz": "Alternativ Porenbeton", "menge": 12.5, "einheit": "m²"},
             {"id": "p4", "typ": "pos", "art": "P", "oz": "01.01.0030", "kurz": "Baustelleneinrichtung", "menge": 1, "einheit": "psch"}]
    x = gaeb.schreiben({"nr": "03", "name": "Rohbau", "items": items}, "84", {"p1": 48.20, "p2": 52.5, "p4": 1500}, "T101 Neubau EFH", "Rohbau Schulte & Söhne", 2.5)
    d = gaeb.lesen(x)
    gleich(d["dp"], "84", "Datenart")
    gleich(d["lv_name"], "Rohbau", "LV-Bezeichnung")
    gleich(d["bieter"], "Rohbau Schulte & Söhne", "Bieter")
    gleich([(y["typ"], y["oz"]) for y in d["items"]],
           [("titel", "01"), ("pos", ""), ("pos", "01.0010"), ("titel", "01.01"), ("pos", "01.01.0010"), ("pos", "01.01.0020"), ("pos", "01.01.0030")],
           "Gliederung und OZ")
    P = {y["oz"]: y for y in d["items"] if y["typ"] == "pos" and y["oz"]}
    gleich(P["01.0010"]["menge"], 12.5, "Menge")
    gleich(P["01.0010"]["einheit"], "m2", "Einheit (GAEB-Form: m² → m2)")
    gleich(P["01.0010"]["ep"], 48.2, "Einheitspreis")
    gleich(P["01.0010"]["lang"], "Kalksandstein\nMörtelgruppe IIa", "Langtext mit Zeilenumbruch")
    gleich(P["01.01.0010"]["art"], "E", "Bedarfsposition")
    gleich(P["01.01.0010"].get("gb"), True, "Bedarfsposition mit Gesamtbetrag")
    gleich(P["01.01.0020"]["art"], "A", "Wahlposition")
    gleich(P["01.01.0030"]["art"], "P", "Pauschalposition")
    pruefe(P["01.01.0020"]["ep"] is None, "Position ohne Preis bleibt ohne Preis")
    h = d["items"][1]
    gleich((h["art"], h["kurz"], h["lang"]), ("T", "Hinweis Mauerwerk", "Alle Wände nach DIN EN 1996."), "Hinweistext")
    pruefe(b"<UP>" not in gaeb.schreiben({"nr": "03", "name": "Rohbau", "items": items}, "83", {"p1": 48.2}), "X83 (Angebotsaufforderung) ohne Preise")


def _xlsx(zeilen):
    import openpyxl
    wb = openpyxl.Workbook()
    for z in zeilen:
        wb.active.append(z)
    b = io.BytesIO()
    wb.save(b)
    return b.getvalue()


def test_excel_angebot_lesen():
    """Ausgefülltes Excel einer Firma: Kopfzeile finden, Titel und Positionen mit Menge, Einheit und EP lesen."""
    d = ava._excel_lesen(_xlsx([["Angebot Rohbau Schulte & Söhne"], [], ["OZ", "Kurztext", "Langtext", "Menge", "Einheit", "EP", "GP"],
                                ["01", "Mauerarbeiten"],
                                ["01.0010", "Mauerwerk KS 17,5 cm", "Kalksandstein", 120, "m²", "47,90", 5748],
                                ["01.0020", "Innenputz", "", 300, "m²", 19.1, 5730]]))
    gleich([(x["typ"], x["oz"]) for x in d["items"]], [("titel", "01"), ("pos", "01.0010"), ("pos", "01.0020")], "Zeilen")
    p = d["items"][1]
    gleich((p["kurz"], p["lang"], p["menge"], p["einheit"]), ("Mauerwerk KS 17,5 cm", "Kalksandstein", 120.0, "m²"), "Position 01.0010")
    gleich(p["ep"], 47.90, "EP aus „47,90“")
    gleich(d["items"][2]["ep"], 19.10, "EP als Zahl")


def test_excel_kopf_einheitspreis_und_me():
    """Excel mit Kopf „Pos. | Bezeichnung | Menge | ME | Einheitspreis“: Einheit aus „ME“, Preis aus „Einheitspreis“."""
    d = ava._excel_lesen(_xlsx([["Pos.", "Bezeichnung", "Menge", "ME", "Einheitspreis"],
                                ["01.0010", "Mauerwerk KS 17,5 cm", 120, "m²", 47.9]]))
    p = next(x for x in d["items"] if x["typ"] == "pos")
    gleich(p["einheit"], "m²", "Einheit aus Spalte „ME“ (nicht aus „Einheitspreis“)")
    gleich(p["ep"], 47.90, "Einheitspreis")


def _pdf_mit_text(zeilen):
    """Einfache PDF mit Textebene (eine Seite, Helvetica) – ohne Zusatzpakete."""
    esc = lambda t: t.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")   # noqa: E731
    inhalt = ("BT /F1 10 Tf " + " ".join(f"1 0 0 1 50 {800 - 18 * k} Tm ({esc(z)}) Tj" for k, z in enumerate(zeilen)) + " ET").encode("cp1252")
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
            b"<< /Length %d >>\nstream\n" % len(inhalt) + inhalt + b"\nendstream",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]
    out, lage = bytearray(b"%PDF-1.4\n"), []
    for i, o in enumerate(objs, 1):
        lage.append(len(out))
        out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    x = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1) + b"".join(b"%010d 00000 n \n" % v for v in lage)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, x)
    return bytes(out)


def test_rechnung_pdf_auslesen():
    """Rechnung der Firma als PDF: je Position Menge × EP = GP erkennen, dazu Rechnungsnummer, Datum und Summen."""
    pdf = _pdf_mit_text(["Rohbau Schulte & Söhne", "1. Abschlagsrechnung", "Rechnungsnummer: AR-2026-117", "Rechnungsdatum: 03.11.2026",
                         "01.0010 Mauerwerk KS 17,5 cm 60,000 m2 48,20 2.892,00",
                         "01.0020 Innenputz Kalkgips 100,000 m2 18,75 1.875,00",
                         "Summe netto 4.767,00", "zzgl. 19 % MwSt 905,73", "Rechnungsbetrag 5.672,73"])
    items = [{"id": "p1", "typ": "pos", "oz": "01.0010", "art": "N"}, {"id": "p2", "typ": "pos", "oz": "01.0020", "art": "N"}]
    A = ava._auslesen(pdf, items)
    gleich((A["pos"]["p1"]["menge"], A["pos"]["p1"]["ep"], A["pos"]["p1"]["gp"]), (60.0, 48.2, 2892.0), "Position 01.0010")
    gleich((A["pos"]["p2"]["menge"], A["pos"]["p2"]["ep"], A["pos"]["p2"]["gp"]), (100.0, 18.75, 1875.0), "Position 01.0020")
    gleich(A["kopf"].get("re_nr"), "AR-2026-117", "Rechnungsnummer")
    gleich(A["kopf"].get("datum"), "2026-11-03", "Rechnungsdatum")
    gleich(A["kopf"].get("netto"), 4767.00, "Netto = Σ GP")
    S = {s["art"]: s["wert"] for s in A["kopf"]["summen"]}
    gleich(S.get("mwst"), 905.73, "Umsatzsteuer erkannt")
    gleich(S.get("brutto"), 5672.73, "Rechnungsbetrag erkannt")
    pruefe(not A["kopf"].get("schluss"), "Abschlagsrechnung ist keine Schlussrechnung")


def test_zahlen_und_dreier_menge_ep_gp():
    """Deutsche Zahlen lesen (1.234,56) und in einer Zeile Menge × EP = GP finden."""
    gleich(ava._zahl("1.234,56"), 1234.56, "Tausenderpunkt und Komma")
    gleich(ava._zahl("12,5"), 12.5, "Komma")
    gleich(ava._zahl("−3,00"), -3.0, "Minuszeichen")
    gleich(ava._zahl("48,20 €"), 48.2, "Eurozeichen")
    pruefe(ava._zahl("m²") is None, "Einheit ist keine Zahl")
    nums = [(None, 3.0), (None, 12.5), (None, 48.2), (None, 602.5)]   # erst eine Seitenzahl, dann Menge, EP, GP
    gleich(ava._tripel(nums), (1, 2, 3), "Menge 12,5 × EP 48,20 = GP 602,50")
    pruefe(ava._tripel([(None, 2.0), (None, 3.0), (None, 7.0)]) is None, "2 × 3 ≠ 7 → kein Treffer")


def test_tuerliste_zu_positionen():
    """Türliste → LV: gleiche Ausführung = eine Position, Menge = Stückzahl; Fenster vor Innentüren, KG 334/344."""
    tueren = [{"id": "a", "nr": "T01", "art": "Innentür", "flg": "1-flg.", "b": "885", "h": "2135", "brand": "T30", "din": "DIN L"},
              {"id": "b", "nr": "T02", "art": "Innentür", "flg": "1-flg.", "b": "885", "h": "2135", "brand": "T30", "din": "DIN R", "anzahl": "2"},
              {"id": "c", "nr": "F01", "art": "Fenster", "b": "1010", "h": "1260"}]
    P = ava.tueren_zu_positionen(tueren, "merkmale", din_trennen=False)
    gleich([(x["typ"], x.get("art"), x.get("kurz") if x["typ"] == "titel" else x.get("menge")) for x in P],
           [("titel", None, "Fenster"), ("pos", "T", 0), ("pos", "N", 1), ("titel", None, "Innentüren"), ("pos", "T", 0), ("pos", "N", 3)],
           "Gliederung (Titel, Systembeschreibung, Positionen) und Stückzahlen")
    gleich([x["kg"] for x in P if x.get("art") == "N"], ["334", "344"], "Kostengruppen Fenster / Innentüren")
    gleich({x["einheit"] for x in P if x.get("art") == "N"}, {"St"}, "Einheit Stück")
    pruefe("T01, T02" in P[-1]["quelle"], f"Herkunft nennt die Türnummern: {P[-1]['quelle']!r}")
    getrennt = ava.tueren_zu_positionen(tueren, "merkmale", din_trennen=True)
    gleich([x["menge"] for x in getrennt if x.get("art") == "N"], [1, 1, 2], "DIN links und rechts getrennt")


def test_zahlen_formatieren():
    """Beträge und Mengen deutsch formatiert: 1.234,50 €, 12,5, 3 – kein „-0,00 €“."""
    gleich(ava.eur(1234.5), "1.234,50 €", "Betrag")
    gleich(ava.eur(-0.001), "0,00 €", "kein negatives Null")
    gleich(ava.eur(None), "–", "leer")
    gleich(ava.num(12.5), "12,5", "Menge")
    gleich(ava.num(3.0), "3", "ganze Menge")
    gleich(ava.num(1250.125), "1.250,125", "Menge mit Tausenderpunkt")
