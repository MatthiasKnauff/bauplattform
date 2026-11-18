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


def test_aussenlage():
    """Außenwand aus der Lage (Klärung E, 16.11.2026) – nur wenn das IFC nichts sagt: Raum nur auf einer Seite der Wand = außen. Die 24-cm-Wand
    des Testmodells wäre nach der alten Regel (erst ab 30 cm außen) eine Innenwand gewesen."""
    from bpcore import cadimport as CI
    gleich(N.aussenlage(IFC), {10: True}, "Raum nur auf einer Seite")
    ohne = IFC.replace(b"#20=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.T.),$);", b"#20=IFCPROPERTYSINGLEVALUE('Kommentar',$,IFCTEXT(''),$);")
    w = next(b for b in CI.ifc_lesen(ohne, bestand=True)["bauteile"] if b["art"] == "Wand")
    gleich(w["kg"][:2], "33", "ohne IsExternal: Außenwand aus der Lage statt Innenwand nach Dicke")
    innen = IFC.replace(b"#20=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.T.),$);", b"#20=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.F.),$);")
    gleich(next(b for b in CI.ifc_lesen(innen, bestand=True)["bauteile"] if b["art"] == "Wand")["kg"][:2], "34", "sagt das IFC innen, gilt das")


def test_aussenlage_raum_fehlt_nebenan():
    """18.11.2026 (Allplan-Datei mit nicht gezeichnetem Wohnzimmer): Raum nur auf einer Seite heißt nur dann außen, wenn die Wand am Umriss
    des Geschosses liegt – mitten im Haus fehlt drüben bloß ein Raum, die Wand bleibt Innenwand."""
    ohne = IFC.replace(b"#20=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.T.),$);", b"#20=IFCPROPERTYSINGLEVALUE('Kommentar',$,IFCTEXT(''),$);")
    gleich(N.aussenlage(ohne).get(10), True, "allein am Umriss: außen")
    weitere = b"".join(b"#%d=IFCWALL('0w%020d',$,' ',$,$,#11,#%d,$,$);#%d=IFCPRODUCTDEFINITIONSHAPE($,$,(#%d));#%d=IFCSHAPEREPRESENTATION(#4,'Body','SweptSolid',(#%d));"
                       b"#%d=IFCEXTRUDEDAREASOLID(#%d,#5,#17,2.5);#%d=IFCRECTANGLEPROFILEDEF(.AREA.,$,#%d,10.,0.24);#%d=IFCAXIS2PLACEMENT2D(#%d,$);#%d=IFCCARTESIANPOINT((5.,%s));\n"
                       % (n, n, n + 1, n + 1, n + 2, n + 2, n + 3, n + 3, n + 4, n + 4, n + 5, n + 5, n + 6, n + 6, y) for n, y in ((100, b"-6."), (110, b"8.")))
    k = ohne.rindex(b"ENDSEC;")   # vor das Ende der Daten
    mitte = ohne[:k] + weitere + ohne[k:]
    L = N.aussenlage(mitte)
    gleich((L.get(10), L.get(100), L.get(110)), (False, True, True), "Wand mitten im Haus mit Raum nur auf einer Seite: innen; die Umrisswände außen")
