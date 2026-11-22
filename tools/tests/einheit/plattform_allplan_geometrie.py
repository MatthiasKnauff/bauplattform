"""Allplan-Export ohne Mengen (22.11.2026, IFC eines Benutzers: Dach und Wände blieben im 3D grau, weil sie nicht in der Bauteilliste standen):
lange Schnittketten (je Öffnung ein IfcBooleanClippingResult), Wand ohne Material und Schichten, Öffnung aus mehreren Körpern, IfcRoof mit
eigener Geometrie. Testmodell erfunden – nie die Datei eines Benutzers ins Repo."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bpcore import cadimport, netz as N   # noqa: E402
from lib import gleich, pruefe   # noqa: E402
from plattform_bauteilliste import IFC   # noqa: E402


def _kette(n):   # Wandkörper #14 hinter n Schnitten mit Halbräumen (#90… ), wie Allplan sie schreibt
    z, vor = [], 14
    for k in range(n):
        z.append(b"#%d=IFCBOOLEANCLIPPINGRESULT(.DIFFERENCE.,#%d,#89);" % (100 + k, vor))
        vor = 100 + k
    return b"\n".join(z) + b"\n#88=IFCPLANE(#5);\n#89=IFCHALFSPACESOLID(#88,.F.);\n", vor


def _modell(n=10):
    z, oben = _kette(n)
    roh = IFC.replace(b"#13=IFCSHAPEREPRESENTATION(#4,'Body','SweptSolid',(#14));", b"#13=IFCSHAPEREPRESENTATION(#4,'Body','Clipping',(#%d));" % oben)
    roh = roh.replace(b"#59=IFCRELASSOCIATESMATERIAL", b"#59=IFCRELNICHTS")   # Wand ohne Material und Schichten
    # Öffnung aus drei Körpern: die eigentliche Öffnung und zwei dünne Stücke (Laibung) mit derselben Profilfläche
    roh = roh.replace(b"#33=IFCSHAPEREPRESENTATION(#4,'Body','SweptSolid',(#34));", b"#33=IFCSHAPEREPRESENTATION(#4,'Body','SweptSolid',(#34,#80,#81));")
    dach = (b"#70=IFCROOF('0rrrrrrrrrrrrrrrrrrrrr',$,'Dach',$,$,#11,#71,$,$);\n#71=IFCPRODUCTDEFINITIONSHAPE($,$,(#72));\n"
            b"#72=IFCSHAPEREPRESENTATION(#4,'Body','SweptSolid',(#73));\n#73=IFCEXTRUDEDAREASOLID(#74,#75,#17,0.3);\n"
            b"#74=IFCRECTANGLEPROFILEDEF(.AREA.,$,#16,10.,8.);\n#75=IFCAXIS2PLACEMENT3D(#76,$,$);\n#76=IFCCARTESIANPOINT((0.,0.,2.5));\n"
            b"#77=IFCRELCONTAINEDINSPATIALSTRUCTURE('0sssssssssssssssssssss',$,$,$,(#70),#7);\n")
    teile = b"#80=IFCEXTRUDEDAREASOLID(#35,#5,#17,0.02);\n#81=IFCEXTRUDEDAREASOLID(#35,#5,#17,0.02);\n"
    return roh.replace(b"ENDSEC;\nEND-ISO", z + teile + dach + b"ENDSEC;\nEND-ISO")


def test_lange_schnittkette_wand_ohne_material():
    R = cadimport.ifc_lesen(_modell(), bestand=True)
    w = next((b for b in R["bauteile"] if 10 in b.get("ids", [])), None)
    pruefe(w is not None, f"Wand hinter zehn Schnitten bleibt: {[b['name'] for b in R['bauteile']]}")
    pruefe(w["kg"].startswith("33") or w["kg"].startswith("34"), f"als Wand eingeordnet: {w['kg']}")
    pruefe("24" in w["name"] or "23" in w["name"], f"Dicke aus der Geometrie (Volumen ÷ Seitenfläche): {w['name']}")
    # Öffnung: höchstens Volumen ÷ Wanddicke je Körper (1,8 + 0,15 + 0,15 m²), nicht dreimal die Profilfläche (5,4 m²)
    pruefe(21.5 < w["menge"] < 24.5, f"Wandfläche abzüglich einer Öffnung: {w['menge']}")


def test_dach_mit_eigener_geometrie():
    R = cadimport.ifc_lesen(_modell(), bestand=True)
    d = next((b for b in R["bauteile"] if 70 in b.get("ids", [])), None)
    pruefe(d is not None, f"IfcRoof ohne Platten darin bleibt: {[b['name'] for b in R['bauteile']]}")
    gleich((d["kg"], round(d["menge"], 1)), ("361", 80.0), "Dachfläche aus Volumen ÷ Dicke")


def test_netz_zeigt_die_wand_hinter_der_kette():
    n = N.netz_ifc(_modell(12))
    pruefe(any(e["i"] == 10 for e in n["e"]), "Wand im 3D trotz zwölf Schnitten")
    pruefe(any(e["i"] == 70 for e in n["e"]), "Dach im 3D")
    gleich(N.STAND, 3, "Fassung des Netzes erhöht – ältere Netze werden neu gerechnet")
