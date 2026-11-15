"""Projektmodell (bpcore/modell.py): die Regeln der Linien und das Zusammenführen vorhandener Angaben – ohne Datenbank."""
from lib import gleich, pruefe

from bpcore import modell as M


def test_standard_und_pruefen():
    for app, _, richtung, zustand in M.APPS:
        w = M.link_wirksam(app)
        pruefe(w["richtung"] == richtung and w["zustand"] == zustand and w["uebernahme"] == "uebernahme" and not w["abweichend"], f"Standard {app}: {w}")
    w = M.link_wirksam("kosten")
    n = M.link_pruefen("kosten", w, {"uebernahme": "auto"})
    gleich(M.link_text("kosten", w, n), "Kosten: automatisch", "Text für den Verlauf")
    pruefe(M.link_wirksam("kosten", n)["abweichend"], "verstellte Linie ist abweichend")
    for falsch in ({"zustand": "fest"}, {"richtung": "quer"}, {"uebernahme": "nie"}):
        try:
            M.link_pruefen("kosten", w, falsch)
            pruefe(False, f"müsste abgelehnt werden: {falsch}")
        except M.Ungueltig:
            pass
    f = M.link_pruefen("ausschreibung", M.link_wirksam("ausschreibung"), {"zustand": "fest", "stand_name": "12.11. versendet", "modell_stand": 7})
    pruefe(f["zustand"] == "fest" and f["modell_stand"] == 7, f"fest: {f}")
    gleich(M.link_text("ausschreibung", M.link_wirksam("ausschreibung"), f), "Ausschreibung: fest (Stand 12.11. versendet)", "Text fest")
    z = M.link_pruefen("ausschreibung", M.link_wirksam("ausschreibung", f), {"zustand": "lebendig"})
    pruefe(z["stand_name"] == "" and z["modell_stand"] is None, "zurück auf lebendig: Stand der App entfällt")


def test_sauber():
    d = M.sauber({"einheiten": "3", "flaeche": "120,5", "geschosse": [{"name": "EG", "hoehe": 2.75}, "quatsch"], "ki": {"extern": 1}, "hand": {"raeume.r1.flaeche": True, "x": 0}, "fremd": 1})
    pruefe(d["einheiten"] == 3 and d["flaeche"] == 120.5 and len(d["geschosse"]) == 1 and d["geschosse"][0]["id"] == "g1", f"bereinigt: {d}")
    gleich(d["ki"], {"buero": True, "extern": True}, "KI: Büro im Standard an")
    pruefe(d["hand"] == {"raeume.r1.flaeche": True} and "fremd" not in d, "Handänderungen bleiben, Fremdes fällt weg")
    gleich(M.sauber(None), M.leer(), "leere Eingabe")


def test_assistent():
    a = M.assistent_sauber({"type": "neubau_mfh", "area": "640", "units": 0, "floors": 99, "dg": "staffel", "choice": {"dachform": "flach", "": "x", "leer": ""},
                            "flTw": {"EG": "massiv"}, "sel": ["a", "", 5], "start": 123, "fremd": {"x": 1}})
    gleich((a["type"], a["area"], a["units"], a["floors"], a["dg"]), ("neubau_mfh", 640, 1, 30, "staffel"), "Grenzen der Angaben")
    gleich((a["choice"], a["flTw"], a["sel"]), ({"dachform": "flach"}, {"EG": "massiv"}, ["a", "5"]), "Auswahl, Bauweise je Geschoss, Leistungen")
    pruefe("start" not in a and "fremd" not in a, "unbekannte Schlüssel fallen weg")
    gleich(M.assistent_sauber({"area": 5}), {}, "ohne Gebäudetyp keine Angaben")
    d = M.sauber({"assistent": a, "baubeginn": "2027-03-01"})
    gleich((d["assistent"]["type"], d["baubeginn"]), ("neubau_mfh", "2027-03-01"), "Assistent und Baubeginn im Modell")
    gleich(M.sauber({"baubeginn": "morgen"})["baubeginn"], "", "Baubeginn nur als Datum")
    gleich(M.sauber(M.sauber({"assistent": a})), M.sauber({"assistent": a}), "zweimal säubern ändert nichts")


def test_zusammenfuehren():
    z = M.zusammenfuehren({"type": "efh", "floors": 2, "units": 1, "area": 140}, {"rooms": [{"area": 60, "floor": "EG"}, {"area": 70, "floor": "OG"}], "hoehe_std": 2.6},
                          {"geschosse": "2", "we": "2", "bgf": "190"})
    F = {x["feld"]: x for x in z["felder"]}
    pruefe(not F["geschosse"]["abweichung"] and len(F["geschosse"]["werte"]) == 3, f"Geschosse einig aus drei Quellen: {F['geschosse']}")
    pruefe(F["einheiten"]["abweichung"] and F["flaeche"]["abweichung"], "Einheiten und Fläche widersprechen sich")
    gleich(F["flaeche"]["vorschlag"], 140.0, "Vorschlag = erste Quelle mit Wert")
    gleich((z["abweichungen"], z["leer"], z["geschosse"]), (2, False, ["EG", "OG"]), "Zusammenfassung")
    pruefe(M.zusammenfuehren(None, None, None)["leer"], "nichts vorhanden")
