"""3D-Netz je Planstand (bpcore/netz.py, GO 16.11.2026): Körper → Dreiecke in cm, Geschosse, Öffnungen aus Wandseiten geschnitten,
Ohrenschneiden für L-Umrisse, DXF als Bodenplatten und Wandscheiben – ohne Datenbank."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # Testmodelle der Nachbartests
from bpcore import netz as N   # noqa: E402
from lib import gleich, pruefe   # noqa: E402
from plattform_bauteilliste import IFC   # noqa: E402
from plattform_plan2d import _dxf   # noqa: E402


def test_ifc_netz_mit_oeffnung():
    n = N.netz_ifc(IFC)
    w = next((e for e in n["e"] if e["i"] == 10), None)
    pruefe(w and w["t"] == "w" and len(w["v"]) % 9 == 0, f"Wand als Dreiecke: {n['e'][:1]}")
    voll = len(N.netz_ifc(IFC.replace(b"#38=IFCRELVOIDSELEMENT", b"#38=IFCRELNICHTS"))["e"][0]["v"])
    pruefe(len(w["v"]) > voll, "Öffnung zerlegt die Wandseiten in mehr Flächen")
    gleich([g["n"] for g in n["geschosse"]], ["EG"], "Geschoss")
    pruefe(N.auspacken(N.packen(n)) == n, "packen/auspacken")


def test_ohrenschneiden_l_form():
    L = [[0, 0, 0], [4, 0, 0], [4, 1, 0], [1, 1, 0], [1, 3, 0], [0, 3, 0]]
    D = N._dreiecke(L)
    fl = sum(abs((d[1][0] - d[0][0]) * (d[2][1] - d[0][1]) - (d[2][0] - d[0][0]) * (d[1][1] - d[0][1])) / 2 for d in D)
    gleich((len(D), round(fl, 6)), (4, 6.0), "L-Form: 4 Dreiecke, Fläche 6 m² (kein Fächer über die Ecke)")


def test_dxf_netz():
    n = N.netz_dxf(_dxf(), {})
    gleich(sorted({e["t"] for e in n["e"]}), ["s", "w"], "Räume als Platten, Wände als Scheiben")
