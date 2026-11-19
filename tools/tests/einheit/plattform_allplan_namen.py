"""Allplan-Namen bleiben überall (19.11.2026, Mock „Allplan-Namen überall“: A1 B1 C1 D1): Name des Bauteils aus dem Plan, unsere Einordnung
klein dazu, außen/innen laut Plan, Schichtnamen aus dem Plan auf den Schichten des gewählten Aufbaus. Testmodell erfunden."""
from bpcore import bauteilliste as B, cadimport, din276, huelle
from lib import gleich, pruefe

import importlib.util as _iu
import os as _os

_sp = _iu.spec_from_file_location("_bauteilliste_test", _os.path.join(_os.path.dirname(__file__), "plattform_bauteilliste.py"))
T = _iu.module_from_spec(_sp)
_sp.loader.exec_module(T)


def _ifc(name):
    return T.IFC.replace(b"#10=IFCWALL('0ccccccccccccccccccccc',$,' ',", b"#10=IFCWALL('0ccccccccccccccccccccc',$,'" + name + b"',")


def test_name_aus_dem_plan():
    c = T.db()
    R = cadimport.ifc_lesen(_ifc(b"AW KS 24 WDVS"), bestand=True)
    L = B.sauber(B.zeilen_aus_ifc(c, R))
    w = next(z for z in L["zeilen"] if z["art"] == "Wand")
    gleich(w["name"], "AW KS 24 WDVS", "Allplan-Name ist der Name")
    pruefe(w.get("einordnung", "").startswith("Wand außen"), f"Einordnung klein dazu: {w.get('einordnung')}")
    gleich(w.get("aussen"), True, "außen laut Plan")
    L2 = B.sauber(B.zeilen_aus_ifc(c, R, L))
    gleich(next(z for z in L2["zeilen"] if z["id"] == w["id"])["name"], "AW KS 24 WDVS", "erneut eingelesen: Name bleibt")


def test_allgemeiner_name_bleibt_einordnung():
    c = T.db()
    L = B.sauber(B.zeilen_aus_ifc(c, cadimport.ifc_lesen(_ifc(b"Wand"), bestand=True)))
    w = next(z for z in L["zeilen"] if z["art"] == "Wand")
    pruefe(w["name"].startswith("Wand außen") and not w.get("einordnung"), f"„Wand“ ist kein Allplan-Name: {w['name']}")


def test_schichtnamen_aus_dem_plan():
    A = [["Putz", 0.015, "kalkzementputz", {}], ["Kalksandstein", 0.175, "ks_1800", {}], ["EPS", 0.16, "eps_035", {}]]
    P = [["EPS 035 WDVS", 0.16], ["KS 2.0 Allplan", 0.175], ["Kalkzementputz", 0.015]]   # im Plan außen → innen
    N = huelle.namen_aus_plan(A, P)
    gleich([x[0] for x in N], ["Kalkzementputz", "KS 2.0 Allplan", "EPS 035 WDVS"], "gleiche Zahl: Reihenfolge nach der Dicke gedreht")
    gleich([x[2] for x in N], ["kalkzementputz", "ks_1800", "eps_035"], "Baustoff bleibt der des Aufbaus")
    pruefe(all(x[4] is True for x in N), "als Name aus dem Plan markiert")
    N = huelle.namen_aus_plan(A, [["KS 2.0", 0.175]])
    gleich([x[0] for x in N], ["Putz", "KS 2.0", "EPS"], "andere Zahl: nur passende Dicke")
    gleich(huelle.namen_aus_plan(A, []), A, "ohne Plan unverändert")


def test_sonstiges_je_kg():
    gleich(din276.NAMEN.get("359"), "Sonstiges zur KG 350", "Block 359 hat einen Namen")
