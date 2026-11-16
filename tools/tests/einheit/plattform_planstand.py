"""Planstände des Gebäudemodells (bpcore/planstand.py, GO 16.11.2026): Abgleich alt ↔ neu, Übernehmen mit Zuordnung per Klick,
entfallene Zeilen mit Antwort bleiben bis „Aufräumen“, Zeilen von Hand bleiben immer – ohne Datenbank."""
from bpcore import bauteilliste as B, planstand as P
from lib import gleich, pruefe


def Z(i, b="oeffnung", status="offen", menge=1.0, **k):
    z = B._zeile(id=i, bereich=b, art="Fenster" if b == "oeffnung" else "Wand", name=i, menge=menge, einheit="St", status=status, **k)
    z["erlaubt"] = B.erlaubt(z)
    return z


def test_abgleich():
    alt = {"zeilen": [Z("f1", status="erneuern"), Z("f2"), Z("w1", "rohbau", menge=10), Z("h", "hand", "neu"), Z("raum:boden:trocken", "raum", menge=50)]}
    neu = {"zeilen": [Z("f1"), Z("f3"), Z("w1", "rohbau", menge=12), Z("raum:boden:trocken", "raum", menge=50)]}
    A = P.abgleich(alt, neu)
    gleich([x["id"] for x in A["neu"]], ["f3"], "neu")
    gleich([x["id"] for x in A["geaendert"]], ["w1"], "geändert (Menge)")
    gleich([x["id"] for x in A["entfaellt"]], ["f2"], "entfällt – Zeilen von Hand nie")
    gleich(A["gleich"], 2, "unverändert")


def test_uebernehmen_zuordnung_und_aufraeumen():
    alt = {"zeilen": [Z("f1", status="erneuern", vorlage="334.15", kurz="Fenstertausch"), Z("f2"), Z("w1", "rohbau", status="bleibt"), Z("h", "hand", "neu")]}
    neu = {"zeilen": [Z("f9")], "raeume": [], "quelle": {"datei": "neu.ifc"}}
    L = P.uebernehmen(alt, neu, {"f1": "f9"})
    f9 = next(z for z in L["zeilen"] if z["id"] == "f9")
    gleich((f9["status"], f9["vorlage"], f9["kurz"]), ("erneuern", "334.15", "Fenstertausch"), "Zuordnung: Antwort wandert mit")
    pruefe("Zugeordnet" in f9["hinweis"], "Hinweis auf die Zuordnung")
    ids = {z["id"]: z for z in L["zeilen"]}
    pruefe("f2" not in ids, "entfällt ohne Antwort: fällt weg")
    pruefe(ids["w1"]["entfaellt"] and not ids["w1"]["berechnen"], "entfällt mit Antwort: bleibt, wird nicht berechnet")
    pruefe("h" in ids, "Zeile von Hand bleibt")
    gleich(L["quelle"]["datei"], "neu.ifc", "Quelle vom neuen Plan")
    L2, n = P.aufraeumen(L)
    gleich((n, sorted(z["id"] for z in L2["zeilen"])), (1, ["f9", "h"]), "Aufräumen entfernt die entfallenen")
    neubau = {"zeilen": [Z("f9", zustand="neu", status="neu")]}
    f = next(z for z in P.uebernehmen(alt, neubau, {"f1": "f9"})["zeilen"] if z["id"] == "f9")
    gleich(f["status"], "neu", "Zuordnung übernimmt keine Antwort, die zur neuen Zeile nicht passt (Neubau: nur „neu“)")


def test_dateiart():
    try:
        P.lesen_datei("plan.dwg", b"AC1032")
        pruefe(False, "DWG wird abgelehnt")
    except ValueError as e:
        pruefe("IFC, DXF oder PDF" in str(e), str(e))
