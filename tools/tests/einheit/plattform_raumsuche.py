"""Räume aus den Wänden ermitteln (bpcore/raumsuche.py, GO 16.11.2026): IFC ohne IfcSpace – zwei Räume hinter einer Innenwand mit Tür,
Flächen auf wenige Prozent, Tür beiden Räumen zugeordnet, Hinweis beim Einlesen, beim Ausgeben echte IfcSpace (wieder einlesbar)."""
import importlib.util
import os

from bpcore import bauteilliste as B, cadimport as CI, raumsuche as RS


def _db():   # kleine Datenbank des Einheitstests der Bauteilliste
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plattform_bauteilliste.py")
    s = importlib.util.spec_from_file_location("_btl", p); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
    return m.db()


def _ifc():
    """Erdgeschoss 10 × 8 m (Außenwände 24 cm, Mitte auf der Achse innen), Innenwand bei x = 6 mit Tür (Öffnung + Tür)."""
    Z = ["#1=IFCPROJECT('0aaaaaaaaaaaaaaaaaaaaa',$,'Test',$,$,$,$,(#4),#2);", "#2=IFCUNITASSIGNMENT((#3));", "#3=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);",
         "#4=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#5,$);", "#5=IFCAXIS2PLACEMENT3D(#6,$,$);", "#6=IFCCARTESIANPOINT((0.,0.,0.));",
         "#7=IFCBUILDINGSTOREY('0bbbbbbbbbbbbbbbbbbbbb',$,'EG',$,$,#8,$,$,.ELEMENT.,0.);", "#8=IFCLOCALPLACEMENT($,#5);", "#9=IFCDIRECTION((0.,0.,1.));"]
    n = [100]
    ids = []

    def kasten(typ, cx, cy, lx, ly, h, z=0.0, name=" "):
        b = n[0]; n[0] += 10
        Z.extend([f"#{b}={typ}('{('0' + str(b)).ljust(22, 'x')}',$,'{name}',$,$,#{b + 1},#{b + 2},$,$);",
                  f"#{b + 1}=IFCLOCALPLACEMENT(#8,#{b + 7});", f"#{b + 7}=IFCAXIS2PLACEMENT3D(#{b + 8},$,$);", f"#{b + 8}=IFCCARTESIANPOINT((0.,0.,{z}));",
                  f"#{b + 2}=IFCPRODUCTDEFINITIONSHAPE($,$,(#{b + 3}));", f"#{b + 3}=IFCSHAPEREPRESENTATION(#4,'Body','SweptSolid',(#{b + 4}));",
                  f"#{b + 4}=IFCEXTRUDEDAREASOLID(#{b + 5},#5,#9,{h});", f"#{b + 5}=IFCRECTANGLEPROFILEDEF(.AREA.,$,#{b + 6},{lx},{ly});",
                  f"#{b + 6}=IFCAXIS2PLACEMENT2D(#{b + 9},$);", f"#{b + 9}=IFCCARTESIANPOINT(({cx},{cy}));"])
        ids.append(b)
        return b
    kasten("IFCWALL", 5.0, 0.12, 10.0, 0.24, 2.6)
    kasten("IFCWALL", 5.0, 7.88, 10.0, 0.24, 2.6)
    kasten("IFCWALL", 0.12, 4.0, 0.24, 7.52, 2.6)
    kasten("IFCWALL", 9.88, 4.0, 0.24, 7.52, 2.6)
    w = kasten("IFCWALL", 6.0, 4.0, 0.24, 7.52, 2.6)
    o = kasten("IFCOPENINGELEMENT", 6.0, 4.0, 0.24, 1.0, 2.1)
    t = kasten("IFCDOOR", 6.0, 4.0, 0.08, 0.9, 2.05, name="T01")
    Z.append(f"#90=IFCRELVOIDSELEMENT('0vvvvvvvvvvvvvvvvvvvvv',$,$,$,#{w},#{o});")
    Z.append(f"#91=IFCRELCONTAINEDINSPATIALSTRUCTURE('0wwwwwwwwwwwwwwwwwwwww',$,$,$,({','.join('#%d' % i for i in ids if i != o)}),#7);")
    return ("ISO-10303-21;\nHEADER;FILE_DESCRIPTION((''),'2;1');FILE_NAME('raum.ifc','2026-11-16',(''),(''),'','','');FILE_SCHEMA(('IFC4'));ENDSEC;\nDATA;\n"
            + "\n".join(Z) + "\nENDSEC;\nEND-ISO-10303-21;\n").encode("latin-1"), t


def test_raeume_aus_waenden():
    raw, _ = _ifc()
    R = RS.raeume(raw)
    assert len(R) == 2, R
    fl = sorted(r["flaeche"] for r in R)
    assert abs(fl[0] - 3.64 * 7.52) / (3.64 * 7.52) < 0.04 and abs(fl[1] - 5.64 * 7.52) / (5.64 * 7.52) < 0.04, fl
    assert all(r["nr"].startswith("EG.") and r["ermittelt"] and r["geschoss"] == "EG" and 2.5 <= r["hoehe"] <= 2.7 for r in R), R
    um = sorted(r["umfang"] for r in R)
    assert abs(um[0] - 2 * (3.64 + 7.52)) < 1.0 and abs(um[1] - 2 * (5.64 + 7.52)) < 1.0, um


def test_einlesen_tuer_und_hinweis():
    raw, t = _ifc()
    r = CI.ifc_lesen(raw, bestand=True)
    assert len(r["raeume"]) == 2 and any("aus den Wänden ermittelt" in h for h in r["hinweise"]), r["hinweise"]
    tuer = next(e for e in r["elemente"] if e["id"] == t)
    assert len(tuer["raeume"]) == 2, tuer


def test_ausgeben_legt_ifcspace_an():
    raw, _ = _ifc()
    r = CI.ifc_lesen(raw, bestand=True)
    L = B.sauber({"raeume": B.zeilen_aus_ifc(_db(), r)["raeume"]})
    assert len(L["raeume"]) == 2 and all(x.get("umriss") for x in L["raeume"]), L["raeume"]
    L["raeume"][0]["name"] = "Wohnen"
    out = B.ausgeben(raw, L)
    assert out.count(b"=IFCSPACE(") == 2 and b"IFCRELAGGREGATES" in out, out[-600:]
    r2 = CI.ifc_lesen(out, bestand=True)
    assert len(r2["raeume"]) == 2 and not any("ermittelt" in h for h in r2["hinweise"]), r2
    assert sorted(round(x["flaeche"]) for x in r2["raeume"]) == sorted(round(x["flaeche"]) for x in L["raeume"]), (r2["raeume"], L["raeume"])
    assert any(x["name"] == "Wohnen" for x in r2["raeume"]), r2["raeume"]


def test_kuerzel_eindeutig():   # 23.11.2026: zweimal „1.Obergeschoss“ im IFC → je zwei Räume mit derselben Nummer, ein Klick wählte beide
    K = RS.kuerzel(["Erdgeschoss", "1.Obergeschoss", "1.Obergeschoss", "Dach"])
    assert K == ["EG", "1OG", "1OGb", "G4"], K
