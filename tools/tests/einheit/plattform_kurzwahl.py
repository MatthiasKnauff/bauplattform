"""Kurzwahl der Aufbauten je Büro (Gebäudemodell neu GN-B, F6-A, Etappe 3 – 22.11.2026): meistbenutzt automatisch, Liste des Büros geht vor."""
import json
import os
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bpcore import kurzwahl   # noqa: E402
from lib import gleich, pruefe   # noqa: E402


def _db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE pm_modell(project_id, data)")
    c.execute("CREATE TABLE bp_store(key PRIMARY KEY, data, updated, updated_by)")
    Z = lambda v, w, st="neu", kg="331": {"id": f"{kg}|{v}|{w}|{st}", "bereich": "rohbau", "kg": kg, "status": st, "vorlage": v, "wahl": w, "kurz": f"{v}/{w}"}   # noqa: E731
    for pid, zl in ((1, [Z("331.01", [0]), Z("331.01", [0]), Z("331.05", [0])]), (2, [Z("331.01", [0]), Z("331.05", [1], "bleibt"), Z("361.02", [0], kg="361")])):
        c.execute("INSERT INTO pm_modell VALUES(?,?)", (pid, json.dumps({"bauteilliste": {"zeilen": zl}})))
    kurzwahl._CACHE.update(t=0, auto=None)
    return c


def test_meistbenutzt_und_buero():
    c = _db()
    L = kurzwahl.liste(c)
    gleich([e["kurz"] for e in L["AW"]["eintraege"]], ["331.01/[0]", "331.05/[0]"], "meistbenutzt zuerst, „bleibt“ zählt nicht")
    gleich((L["AW"]["quelle"], L["AW"]["eintraege"][0]["n"], L["DA"]["name"]), ("auto", 3, "Dach"), "automatisch, gezählt")
    L = kurzwahl.setzen(c, "AW", [{"vorlage": "331.05", "wahl": [0], "kurz": "Holzrahmen"}, {"vorlage": "331.05", "wahl": [0]}, {"x": 1}], "mk")
    gleich((L["AW"]["quelle"], [e["kurz"] for e in L["AW"]["eintraege"]]), ("buero", ["Holzrahmen"]), "Liste des Büros geht vor, doppelt und leer fallen weg")
    pruefe(L["AW"]["auto"], "automatische Liste bleibt zum Vergleich")
    L = kurzwahl.setzen(c, "AW", [], "mk")
    gleich(L["AW"]["quelle"], "auto", "leer = wieder automatisch")
    pruefe(kurzwahl.setzen(c, "XX", [], "mk") is None, "unbekannte Gruppe")
