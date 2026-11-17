"""Rechnung prüfen im Dokument (ava_dokument.py, GO 17.11.2026 K1 L1 N1): Zahl der Firma finden, geprüfte Werte an Ort und Stelle,
Summen und Zahlbetrag, Zeilenhöhe der Prüfzeichen (mehrzeilige Position), Notizen bereinigen."""
import json

import ava_dokument as AD
from lib import gleich, pruefe

A = {"zahlen": {"1": [[0.02, 0.10, 0.03, 0.11, 2], [0.08, 0.10, 0.10, 0.11, 90], [0.70, 0.10, 0.75, 0.11, 75], [0.85, 0.10, 0.93, 0.11, 6750],
                      [0.85, 0.60, 0.93, 0.61, 15276.83], [0.85, 0.63, 0.93, 0.64, 2902.6], [0.85, 0.66, 0.93, 0.67, 18179.43]]},
     "pos": {"p2": {"seite": 1, "box": [0.02, 0.10, 0.93, 0.55], "menge": 90, "ep": 75, "gp": 6750}},   # Block reicht bis weit nach unten (letzte Position)
     "kopf": {"summen": [{"art": "netto", "wert": 15276.83, "seite": 1, "box": [0.85, 0.60, 0.93, 0.61]},
                         {"art": "mwst", "wert": 2902.6, "seite": 1, "box": [0.85, 0.63, 0.93, 0.64]},
                         {"art": "brutto", "wert": 18179.43, "seite": 1, "box": [0.85, 0.66, 0.93, 0.67]}]}}


def test_zahl_und_zeile():
    gleich(AD.zahlbox(A, 1, A["pos"]["p2"]["box"], 90), [0.08, 0.10, 0.10, 0.11], "Menge der Firma in der Zeile gefunden")
    gleich(round(AD.zeile_y(A, A["pos"]["p2"]), 3), 0.105, "Prüfzeichen auf der Zeile mit den Zahlen, nicht in der Mitte des langen Blocks")


def test_korrekturen():
    R = {"art": "abschlag", "status": "offen", "data": json.dumps({})}
    K = {"aufmass": {"p2": 70}}
    RC = {"leistung": 13126.83, "nachlass": 0, "mwst": 2494.10, "brutto": 15620.93, "zahlung": 13126.83, "auszahlung": 15620.93}
    X = AD.korrekturen(A, K, RC, R, {"p2": 75})
    T = [x[2] for x in X]
    pruefe("70" in T and "5.250,00 €" in T, f"Menge und neuer Gesamtpreis über den Zahlen der Firma: {T}")
    pruefe(any(t.startswith("Zahlbetrag lt. Prüfung") for t in T) and "15.620,93 €" in T, f"Summen überschrieben und Zahlbetrag darunter: {T}")
    S = AD.korrektur_striche(A, K, RC, R, {"p2": 75})
    pruefe(any(s["art"] == "stift" for s in S) and all(s.get("rechts") for s in S if s["art"] == "text"), "durchgestrichen, Wert rechtsbündig")


def test_notizen():
    N = AD.notizen_sauber([{"bid": 3, "seite": 1, "box": [0.1, 0.2, 0.5, 0.3], "text": " Länge prüfen ", "intern": 1}, {"bid": 3, "seite": 1, "box": [0.5, 0.2, 0.1, 0.3], "text": "x"},
                           {"bid": 3, "seite": 1, "box": [0.1, 0.1, 0.2, 0.2], "text": ""}])
    gleich((len(N), N[0]["text"], N[0]["intern"]), (1, "Länge prüfen", True), "leere und verdrehte Rahmen fallen weg")
    gleich(AD.notiz_striche({"notizen": N}, 3), [], "„nur intern“ nicht in der Prüf-PDF")
    N[0]["intern"] = False
    gleich([s["art"] for s in AD.notiz_striche({"notizen": N}, 3)], ["rechteck", "notiz"], "Rahmen und Notiz in der Prüf-PDF")
