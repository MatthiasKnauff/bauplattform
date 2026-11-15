"""Bauteil-Checkliste (bpcore/bauteilliste.py, Entwurf vom 16.11.2026): IFC lesen mit Bestand und leeren Öffnungen, Zeilen je Gruppe,
Antworten behalten, Aufbau aus dem Baukasten (Element, wenn es die Kombination gibt), IFC mit Maßnahmen ausgeben. Testmodell erfunden."""
import sqlite3

from bpcore import bauteilliste as B, cadimport
from lib import gleich, pruefe

IFC = b"""ISO-10303-21;
HEADER;FILE_DESCRIPTION((''),'2;1');FILE_NAME('test.ifc','2026-11-16',(''),(''),'','','');FILE_SCHEMA(('IFC4'));ENDSEC;
DATA;
#1=IFCPROJECT('0aaaaaaaaaaaaaaaaaaaaa',$,'Test',$,$,$,$,(#4),#2);
#2=IFCUNITASSIGNMENT((#3));
#3=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#4=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#5,$);
#5=IFCAXIS2PLACEMENT3D(#6,$,$);
#6=IFCCARTESIANPOINT((0.,0.,0.));
#7=IFCBUILDINGSTOREY('0bbbbbbbbbbbbbbbbbbbbb',$,'EG',$,$,#8,$,$,.ELEMENT.,0.);
#8=IFCLOCALPLACEMENT($,#5);
#10=IFCWALL('0ccccccccccccccccccccc',$,' ',$,$,#11,#12,$,$);
#11=IFCLOCALPLACEMENT(#8,#5);
#12=IFCPRODUCTDEFINITIONSHAPE($,$,(#13));
#13=IFCSHAPEREPRESENTATION(#4,'Body','SweptSolid',(#14));
#14=IFCEXTRUDEDAREASOLID(#15,#5,#17,2.5);
#15=IFCRECTANGLEPROFILEDEF(.AREA.,$,#16,10.,0.24);
#16=IFCAXIS2PLACEMENT2D(#18,$);
#17=IFCDIRECTION((0.,0.,1.));
#18=IFCCARTESIANPOINT((5.,0.12));
#20=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.T.),$);
#21=IFCPROPERTYSINGLEVALUE('Status',$,IFCTEXT('Bestand'),$);
#22=IFCPROPERTYSET('0ddddddddddddddddddddd',$,'Pset_WallCommon',$,(#20,#21));
#23=IFCRELDEFINESBYPROPERTIES('0eeeeeeeeeeeeeeeeeeeee',$,$,$,(#10),#22);
#30=IFCOPENINGELEMENT('0fffffffffffffffffffff',$,'Fenster\\X\\F6ffnung',$,$,#31,#32,$,$);
#31=IFCLOCALPLACEMENT(#11,#5);
#32=IFCPRODUCTDEFINITIONSHAPE($,$,(#33));
#33=IFCSHAPEREPRESENTATION(#4,'Body','SweptSolid',(#34));
#34=IFCEXTRUDEDAREASOLID(#35,#5,#17,0.24);
#35=IFCRECTANGLEPROFILEDEF(.AREA.,$,#36,1.5,1.2);
#36=IFCAXIS2PLACEMENT2D(#37,$);
#37=IFCCARTESIANPOINT((0.75,0.6));
#38=IFCRELVOIDSELEMENT('0ggggggggggggggggggggg',$,$,$,#10,#30);
#40=IFCSPACE('0hhhhhhhhhhhhhhhhhhhhh',$,'',$,$,#41,#42,$,.ELEMENT.,$,$);
#41=IFCLOCALPLACEMENT(#8,#5);
#42=IFCPRODUCTDEFINITIONSHAPE($,$,(#43));
#43=IFCSHAPEREPRESENTATION(#4,'Body','SweptSolid',(#44));
#44=IFCEXTRUDEDAREASOLID(#45,#5,#17,2.5);
#45=IFCRECTANGLEPROFILEDEF(.AREA.,$,#46,5.,4.);
#46=IFCAXIS2PLACEMENT2D(#47,$);
#47=IFCCARTESIANPOINT((2.5,2.));
#48=IFCSPACE('0iiiiiiiiiiiiiiiiiiiii',$,'Bad',$,$,#41,#49,$,.ELEMENT.,$,$);
#49=IFCPRODUCTDEFINITIONSHAPE($,$,(#50));
#50=IFCSHAPEREPRESENTATION(#4,'Body','SweptSolid',(#51));
#51=IFCEXTRUDEDAREASOLID(#52,#5,#17,2.5);
#52=IFCRECTANGLEPROFILEDEF(.AREA.,$,#53,2.,2.);
#53=IFCAXIS2PLACEMENT2D(#54,$);
#54=IFCCARTESIANPOINT((6.,1.));
#55=IFCMATERIAL('Kalksandstein',$,$);
#56=IFCMATERIALLAYER(#55,0.24,$,$,$,$,$);
#57=IFCMATERIALLAYERSET((#56),$,$);
#58=IFCMATERIALLAYERSETUSAGE(#57,.AXIS2.,.POSITIVE.,0.,$);
#59=IFCRELASSOCIATESMATERIAL('0lllllllllllllllllllll',$,$,$,(#10),#58);
#60=IFCRELCONTAINEDINSPATIALSTRUCTURE('0jjjjjjjjjjjjjjjjjjjjj',$,$,$,(#10),#7);
#61=IFCRELAGGREGATES('0kkkkkkkkkkkkkkkkkkkkk',$,$,$,#7,(#40,#48));
ENDSEC;
END-ISO-10303-21;
"""


def db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE pdb_vorlage(id, kg, name, einheit, daten, tags, sort)")
    c.execute("CREATE TABLE pdb_position(katalog, code, hinweis)")
    c.execute("INSERT INTO pdb_vorlage VALUES('334.15','334','Fenstertausch Bestand je St','St',?,'altbau',1)",
              ('{"schichten":[{"name":"Fenster neu","optionen":[{"k":"Kunststoff","t":"Kunststofffenster","std":true},{"k":"Holz","t":"Holzfenster","std":true}]},'
               '{"name":"Rollladenkasten","optionen":[{"k":"","t":"","std":true},{"k":"Kasten dämmen","t":"Kasten dämmen"}]}]}',))
    c.execute("INSERT INTO pdb_position VALUES('gk3e','334.15.001','Aufbau 334.15:0.0')")
    return c


def test_lesen_mit_bestand():
    R = cadimport.ifc_lesen(IFC, bestand=True)
    art = {b["art"]: b for b in R["bauteile"]}
    pruefe("Wand" in art and art["Wand"]["zustand"] == "bestand" and art["Wand"]["ids"] == [10], f"Bestandswand mit Objekt: {R['bauteile']}")
    pruefe("Fensteröffnung" in art and art["Fensteröffnung"]["zustand"] == "leer" and art["Fensteröffnung"]["kg"] == "334", "leere Öffnung in der Außenwand")
    pruefe(not cadimport.ifc_lesen(IFC)["bauteile"] or all(b["art"] != "Wand" for b in cadimport.ifc_lesen(IFC)["bauteile"]), "ohne bestand=True bleibt die Baukosten-Einlesung wie bisher")


def test_zeilen_antworten_aufbau():
    c = db()
    R = cadimport.ifc_lesen(IFC, bestand=True)
    L = B.sauber(B.zeilen_aus_ifc(c, R))
    ids = [z["id"] for z in L["zeilen"]]
    pruefe(any(i.startswith("raum:boden:nass") for i in ids) and any(i.startswith("raum:boden:trocken") for i in ids), f"Nassräume getrennt: {ids}")
    pruefe(all(z["status"] == "offen" and not z["berechnen"] for z in L["zeilen"]), "ohne Allplan-Katalog: alles offen")
    gleich([r["nr"] for r in L["raeume"]], ["0.01", "0.02"], "Räume ohne Nummer werden durchnummeriert")
    gleich(B.sauber(None), B.leer(), "leere Liste bleibt leer")
    f = next(z for z in L["zeilen"] if z["art"] == "Fensteröffnung")
    gleich(f["nummern"], ["F 01"], "Fensternummer")
    z = B.setzen(c, L, f["id"], {"status": "erneuern"})
    gleich((z["vorlage"], z["code"], z["berechnen"]), ("334.15", "334.15.001", True), "erneuern → Fenstertausch, Standardelement")
    z = B.setzen(c, L, f["id"], {"wahl": [0, 1]})
    gleich((z["code"], z["kurz"]), ("", "Fenstertausch Bestand je St, Kunststoff, Kasten dämmen"), "andere Wahl: Aufbau ohne Standardelement")
    L2 = B.zeilen_aus_ifc(c, R, L)
    gleich(next(x for x in L2["zeilen"] if x["id"] == f["id"])["status"], "erneuern", "erneut eingelesen: Antwort bleibt")


def test_ifc_ausgeben():
    c = db()
    R = cadimport.ifc_lesen(IFC, bestand=True)
    L = B.sauber(B.zeilen_aus_ifc(c, R))
    f = next(z for z in L["zeilen"] if z["art"] == "Fensteröffnung")
    B.setzen(c, L, f["id"], {"status": "erneuern"})
    w = next(z for z in L["zeilen"] if z["art"] == "Wand")
    B.setzen(c, L, w["id"], {"status": "bleibt"})
    out = B.ausgeben(IFC, L, "test-massnahmen.ifc").decode("latin-1")
    pruefe("FILE_NAME('test-massnahmen.ifc'" in out and "'Bauplattform_Massnahme'" in out, "Kopf und Maßnahmen")
    pruefe("#30=IFCOPENINGELEMENT('0fffffffffffffffffffff',$,'F 01'" in out, "Fensternummer an der Öffnung")
    pruefe("IFCPROPERTYENUMERATEDVALUE('Status',$,(IFCLABEL('EXISTING')),$)" in out, "Wand bleibt → EXISTING")
    pruefe("IFCSPACE('0hhhhhhhhhhhhhhhhhhhhh',$,'0.01'" in out and "'Bad'" in out, "Raum ohne Namen bekommt die Nummer, Bad behält den Namen")
    R2 = cadimport.ifc_lesen(out.encode("latin-1"), bestand=True)
    pruefe(len(R2["raeume"]) == 2, "Ausgabe ist wieder lesbar")
    gleich(B.ausgeben(IFC, L), B.ausgeben(IFC, L), "gleiche Antworten → gleiche Datei (feste Kennungen)")
