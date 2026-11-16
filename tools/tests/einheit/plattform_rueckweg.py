"""Rückweg ins Gebäudemodell (bpcore/rueckweg.py, GO 16.11.2026): Bauphase je Bauteil, doppelte Zeilen am Text, Bauphasen und Leistungen
von Hand aus dem Bauzeitenplan, Ergebnisse sauber – ohne Datenbank."""
from bpcore import rueckweg as R
from lib import gleich, pruefe


def test_phase_von():
    gleich([R.phase_von(z) for z in ({"kg": "331"}, {"kg": "334"}, {"kg": "352"}, {"kg": "422"}, {"kg": "331", "status": "abbruch"}, {"kg": "331", "phase": "huelle"}, {"kg": ""})],
           ["rohbau", "huelle", "ausbau", "tga_roh", "abbruch", "huelle", ""], "Kostengruppe → Bauphase, Abbruch, eigene Phase vor KG")


def test_doppelt():
    L = [{"id": "a", "name": "Außenwand Mauerwerk 36,5 cm"}, {"id": "b", "name": "Baustelleneinrichtung"}]
    gleich(R.doppelt("Baustelleneinrichtung", L), "b", "gleicher Text")
    gleich(R.doppelt("außenwand mauerwerk", L), "a", "Wörter des kürzeren im längeren")
    gleich(R.doppelt("Gerüst", L), "", "kein Treffer")


def test_bauzeitenplan():
    plan = {"id": "p1", "name": "Plan", "data": {"tasks": [
        {"uid": 1, "name": "Rohbau", "cat": "_grp", "ph": "rohbau", "lvl": 0},
        {"uid": 2, "name": "Mauerwerk", "cat": "mauer", "lvl": 1, "dur": 10},
        {"uid": 3, "name": "Kran stellen", "cat": "", "lvl": 1, "dur": 2, "gw": "Rohbau"},
        {"uid": 4, "name": "Hülle", "cat": "_grp", "ph": "huelle", "lvl": 0},
        {"uid": 5, "name": "Fenster", "cat": "fenster", "lvl": 1, "dur": 5}],
        "sched": [{"uid": 2, "s": "2027-03-01", "f": "2027-03-12"}, {"uid": 3, "s": "2027-02-25", "f": "2027-02-26"}, {"uid": 5, "s": "2027-04-01", "f": "2027-04-07"}]}}
    gleich(R.phasen_aus_plan(plan), {"rohbau": {"von": "2027-02-25", "bis": "2027-03-12"}, "huelle": {"von": "2027-04-01", "bis": "2027-04-07"}}, "Bauphasen aus den Gruppen")
    gleich(R.termine_zeilen(plan), [{"name": "Kran stellen", "phase": "rohbau", "gewerk": "Rohbau"}], "nur Leistungen von Hand")


def test_ergebnisse_sauber():
    k = R.kosten_sauber({"name": "Berechnung", "total": 1000.5, "kg": {"300": 700, "x": 1}, "geheim": 1})
    pruefe(k["name"] == "Berechnung" and k["kg"] == {"300": 700.0} and "geheim" not in k, f"Kosten: {k}")
    gleich(R.kosten_sauber({}), {}, "leer bleibt leer")
    gleich(R.termine_sauber({"phasen": {"rohbau": {"von": "2027-01-04", "bis": "2027-02-01"}, "quatsch": {"von": "2027-01-01"}}})["phasen"],
           {"rohbau": {"von": "2027-01-04", "bis": "2027-02-01"}}, "nur bekannte Phasen mit Datum")
    gleich(R.schalter({"rueckweg": {"kosten": False}}), {"kosten": False, "termine": True}, "Schalter „ins Modell“: Standard an")
