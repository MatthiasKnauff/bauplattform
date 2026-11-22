"""Ergänzen neben dem Plan (bpcore/modell_plus.py, GO 20.11.2026, Mock „Gebäudemodell ergänzen“ A1 B1): ergänzte Räume, Fenster und Türen
stehen gekennzeichnet neben denen aus dem Plan, Antworten bleiben, der nächste Planstand nimmt sie mit und der Abgleich fragt, wenn der
Plan sie jetzt selbst enthält. Dazu B1: Zeile von Hand mit gewählter Einheit – der Aufbau ändert sie nicht."""
import importlib.util
import os

from bpcore import bauteilliste as B, modell_hand as H, modell_plus as M, planstand as P
from lib import gleich, pruefe


def _db():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plattform_bauteilliste.py")
    s = importlib.util.spec_from_file_location("_btl", p); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
    return m.db()


def _plan(c, fenster=2):
    """Ein „Plan“: zwei Räume und Fenster – als Liste wie nach dem Einlesen (Art ifc)."""
    RA, EA = H.sauber({"raeume": [{"nr": "0.01", "name": "Wohnen", "geschoss": "EG", "flaeche": 30}, {"nr": "0.02", "name": "Küche", "geschoss": "EG", "flaeche": 12}],
                       "elemente": [{"nr": f"F {k + 1:02d}", "art": "Fenster", "geschoss": "EG", "raum": "0.01", "b": 1.26, "h": 1.38, "bruestung": 0.9} for k in range(fenster)]})
    L = B.zeilen_aus_ifc(c, H.R_aus(RA, EA, schaetzen=False), None, "")
    L.update(quelle={"art": "ifc", "planstand": 1}, anweisungen=[], raumbuch={})
    return B.sauber(L)


def test_ergaenzen_neben_dem_plan():
    c = _db()
    L = _plan(c)
    n_z, n_r, n_e = len(L["zeilen"]), len(L["raeume"]), len(L["elemente"])
    L["plus"] = {"raeume": [{"nr": "0.04", "name": "Bad", "geschoss": "EG", "flaeche": 6, "hoehe": 2.5}],
                 "elemente": [{"art": "Fenster", "geschoss": "EG", "raum": "0.04", "b": 0.76, "h": 0.76, "bruestung": 1.5}]}
    M.anwenden(c, L)
    L = B.sauber(L)
    erg = [z for z in L["zeilen"] if z.get("ergaenzt")]
    pruefe(erg and all(z["id"].endswith("|+") for z in erg), f"ergänzte Zeilen gekennzeichnet: {[z['id'] for z in erg]}")
    pruefe(len(L["zeilen"]) == n_z + len(erg) and {z["bereich"] for z in erg} == {"oeffnung", "raum"}, "Zeilen aus dem Plan bleiben; ergänzt nur Öffnungen und Räume")
    gleich((len(L["raeume"]), len(L["elemente"])), (n_r + 1, n_e + 1), "Raum und Fenster stehen daneben")
    e = next(x for x in L["elemente"] if x["quelle"] == "plus")
    gleich((e["nr"], e["raeume"]), ("F 03", ["0.04"]), "nächste freie Nummer, Raum der Ergänzung")
    pruefe(next(r for r in L["raeume"] if r["nr"] == "0.04").get("ergaenzt"), "Raum gekennzeichnet")
    f = next(z for z in erg if z["bereich"] == "oeffnung")
    pruefe("Ergänzt" in f["hinweis"] and f["nummern"] == ["F 03"], f"Hinweis und Nummer an der Zeile: {f}")
    # Antwort bleibt, wenn die Ergänzung geändert wird (gleiche Zeile)
    B.setzen(c, L, f["id"], {"status": "erneuern"})
    L["plus"]["raeume"][0]["flaeche"] = 7
    M.anwenden(c, L)
    gleich(next(z for z in L["zeilen"] if z["id"] == f["id"])["status"], "erneuern", "Antwort der ergänzten Zeile bleibt")
    # Fenster in einem Raum aus dem Plan
    L["plus"]["elemente"].append({"art": "Innentür", "geschoss": "EG", "raum": "0.02", "b": 0.885, "h": 2.01})
    M.anwenden(c, L)
    t = next(x for x in L["elemente"] if x["quelle"] == "plus" and x["art"] == "Tür")
    gleich((t["nr"], t["raeume"]), ("T 01", ["0.02"]), "Tür im Raum aus dem Plan")
    # alles wieder weg
    L["plus"] = {"raeume": [], "elemente": []}
    M.anwenden(c, L)
    pruefe("plus" not in L and len(L["zeilen"]) == n_z and len(L["raeume"]) == n_r and len(L["elemente"]) == n_e, "ohne Ergänzungen wie der Plan")


def test_naechster_planstand_fragt_und_nimmt_mit():
    c = _db()
    alt = _plan(c)
    alt["plus"] = {"raeume": [{"nr": "0.04", "name": "Bad", "geschoss": "EG", "flaeche": 6}],
                   "elemente": [{"nr": "F 03", "art": "Fenster", "geschoss": "EG", "raum": "0.01", "b": 1.26, "h": 1.38, "bruestung": 0.9},
                                {"nr": "T 09", "art": "Innentür", "geschoss": "EG", "raum": "0.04", "b": 0.885, "h": 2.01}]}
    M.anwenden(c, alt)
    alt = B.sauber(alt)
    f = next(z for z in alt["zeilen"] if z.get("ergaenzt") and z["bereich"] == "oeffnung" and "Tür" in z["art"])
    B.setzen(c, alt, f["id"], {"status": "erneuern"})
    neu = _plan(c, fenster=3)   # der Zeichner hat das dritte Fenster nachgetragen
    A = P.abgleich(alt, neu)
    gleich([(x["art"], x["k"]) for x in A["ergaenzt"]], [("elemente", 0)], "nur das Fenster ist jetzt im Plan – Bad und Tür nicht")
    pruefe("F 03" in A["ergaenzt"][0]["text"], A["ergaenzt"][0]["text"])
    pruefe(not [x for x in A["entfaellt"] if x["id"].endswith("|+")], "Ergänztes ist nie „entfällt“")
    L = P.uebernehmen(alt, neu, {})
    M.entfernen(L, {"elemente": [0]})
    M.anwenden(c, L, "", alt)
    L = B.sauber(L)
    gleich((len(L["plus"]["raeume"]), [e["nr"] for e in L["plus"]["elemente"]]), (1, ["T 09"]), "Bad und Tür gehen mit, das Fenster ist entfernt")
    gleich(len([e for e in L["elemente"] if e["art"] == "Fenster"]), 3, "kein doppeltes Fenster")
    t = next(z for z in L["zeilen"] if z.get("ergaenzt") and z["bereich"] == "oeffnung")
    gleich(t["status"], "erneuern", "Antwort der ergänzten Tür bleibt über den Planstand")
    hand = dict(neu, quelle={"art": "hand"})
    pruefe("plus" not in P.uebernehmen(alt, hand, {}) and not M.treffer(alt, hand), "Planstand von Hand: dort steht alles direkt in der Liste")


def test_einheit_von_hand():
    c = _db()
    L = B.leer()
    z = B.hand_neu(L, "Sockelleiste", "352", "m")
    gleich((z["einheit"], z.get("einheit_hand")), ("m", True), "Einheit beim Anlegen gewählt")
    B.setzen(c, L, z["id"], {"vorlage": "334.15"})
    gleich(z["einheit"], "m", "der Aufbau (St) ändert die gewählte Einheit nicht")
    B.setzen(c, L, z["id"], {"einheit": "St"})
    gleich(B.sauber(L)["zeilen"][0]["einheit"], "St", "Einheit ändern, bleibt beim Speichern")
    B.setzen(c, L, z["id"], {"einheit": "Kiste"})
    gleich(z["einheit"], "St", "nur m², m, St, psch")
    o = B.hand_neu(L, "ohne Wahl")
    B.setzen(c, L, o["id"], {"vorlage": "334.15"})
    gleich(o["einheit"], "St", "ohne gewählte Einheit kommt sie weiter vom Aufbau")


def test_ermittelte_flaeche_kein_raum():
    """Grundriss (22.11.2026): eine aus den Wänden ermittelte Fläche ist kein Raum oder ein Schacht – sie fällt aus Räumen und Zeilen und bleibt
    draußen, auch wenn der Plan neu eingelesen wird (Punkt in der Fläche, je Geschoss). Räume aus dem Plan selbst bleiben."""
    c = _db()
    RA, EA = H.sauber({"raeume": [{"nr": "0.01", "name": "Wohnen", "geschoss": "EG", "flaeche": 30}, {"nr": "0.02", "name": "Raum", "geschoss": "EG", "flaeche": 0.8}],
                       "elemente": []})
    R = H.R_aus(RA, EA, schaetzen=False)
    R["raeume"][1].update(ermittelt=True, umriss=[[10, 0], [11, 0], [11, 0.8], [10, 0.8]], z=0)
    voll = B.zeilen_aus_ifc(c, R, None, "")
    W = M.raumweg_sauber([{"g": "EG", "p": [10.5, 0.4], "art": "schacht"}, {"g": "EG", "p": "x", "art": "kein"}, {"g": "EG", "p": [1, 1], "art": "quatsch"}])
    gleich(W, [{"g": "EG", "p": [10.5, 0.4], "art": "schacht"}], "nur gültige Angaben")
    pruefe(M.ist_weg(R["raeume"][1], W) and not M.ist_weg(R["raeume"][0], W), "Punkt trifft nur die ermittelte Fläche")
    pruefe(not M.ist_weg(dict(R["raeume"][1], geschoss="OG"), W), "anderes Geschoss: nicht getroffen")
    L = B.zeilen_aus_ifc(c, R, {"raumweg": W}, "")
    gleich([r["nr"] for r in L["raeume"]], ["0.01"], "Schacht fällt aus den Räumen")
    boden = lambda X: next(z for z in X["zeilen"] if z["id"].startswith("raum:boden"))
    pruefe(boden(L)["menge"] < boden(voll)["menge"], f"Bodenfläche ohne den Schacht: {boden(L)['menge']} < {boden(voll)['menge']}")
    gleich(B.sauber(L).get("raumweg"), W, "bleibt in der Liste")
    L2 = B.zeilen_aus_ifc(c, R, B.sauber(L), "")   # neu eingelesen
    gleich(([r["nr"] for r in L2["raeume"]], L2.get("raumweg")), (["0.01"], W), "auch beim nächsten Einlesen")
    gleich(P.uebernehmen(L, L2).get("raumweg"), W, "über das Übernehmen eines Planstands hinweg")
