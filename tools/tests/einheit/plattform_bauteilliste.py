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


def test_neubau_ohne_erneuern():
    """Neubau (Bauart im Assistenten): alles „neu“, keine Bestandsantworten, keine Schadstoff-Frage; im Bestand bleibt die Auswahl."""
    c = db()
    gleich((B.bauart({"assistent": {"type": "k:ef:nb::"}}), B.bauart({"assistent": {"type": "k:ef:nb.um:da:"}}), B.bauart({"assistent": {"type": "k:wo:ws::"}}),
            B.bauart({"assistent": {"type": "neubau_efh"}}), B.bauart({})), ("neubau", "gemischt", "bestand", "neubau", ""), "Bauart aus dem Typ")
    ohne = IFC.replace(b"#21=IFCPROPERTYSINGLEVALUE('Status',$,IFCTEXT('Bestand'),$);", b"#21=IFCPROPERTYSINGLEVALUE('Name',$,IFCTEXT('x'),$);")
    R = cadimport.ifc_lesen(ohne, bestand=True)
    L = B.sauber(B.zeilen_aus_ifc(c, R, None, "neubau"))
    pruefe(all(z["erlaubt"] == ["neu"] for z in L["zeilen"] if z["bereich"] != "hand"), f"Neubau: nur „neu“ – {[(z['name'], z['erlaubt']) for z in L['zeilen']]}")
    pruefe(all(z["status"] == "neu" for z in L["zeilen"]), "Neubau: alles gleich „neu“, nichts offen")
    pruefe(not any(z["id"] == "frage:schadstoffe" for z in L["zeilen"]), "Neubau: keine Schadstoff-Frage")
    w = next(z for z in L["zeilen"] if z["art"] == "Wand")
    B.setzen(c, L, w["id"], {"status": "erneuern"})
    gleich(w["status"], "neu", "„erneuern“ geht im Neubau nicht")
    LB = B.sauber(B.zeilen_aus_ifc(c, R, None, "bestand"))
    wb = next(z for z in LB["zeilen"] if z["art"] == "Wand")
    gleich((wb["status"], wb["erlaubt"]), ("offen", ["bleibt", "instandsetzen", "erneuern", "neu", "abbruch"]), "Bestand ohne Kennzeichen im IFC: fragen")
    L2 = B.sauber(B.zeilen_aus_ifc(c, R, LB, "neubau"))
    gleich(next(z for z in L2["zeilen"] if z["art"] == "Wand")["status"], "neu", "Bauart geändert auf Neubau: Wand ist neu")


def test_ifc_ausgeben_allplan():
    """Rückweg nach Allplan (16.11.2026): Allplan schreibt Pset_WallCommon und „AllplanAttributes“ (Schicht mit Material und Status) selbst –
    die Ausgabe ändert diese Werte, statt ein zweites Pset_WallCommon anzuhängen; das gewählte Element des Allplan-Katalogs der Bauplattform
    wird Material (= Eintrag im Kundenkatalog); an eine Öffnung kommt kein Pset_WindowCommon (früher: unbekannte Angaben in Allplan)."""
    import re
    roh = IFC.replace(b"#21=IFCPROPERTYSINGLEVALUE('Status',$,IFCTEXT('Bestand'),$);", b"#21=IFCPROPERTYENUMERATEDVALUE('Status',$,(IFCLABEL('EXISTING')),$);").replace(
        b"#61=", b"#62=IFCPROPERTYSINGLEVALUE('Material',$,IFCTEXT('Kalksandstein'),$);\n#63=IFCPROPERTYSINGLEVALUE('Status',$,IFCTEXT('Bestand'),$);\n"
               b"#64=IFCCOMPLEXPROPERTY('Object Layer Attributes #1','Layer #1','Layer #1',(#62,#63));\n"
               b"#65=IFCPROPERTYSET('0mmmmmmmmmmmmmmmmmmmmm',$,'AllplanAttributes',$,(#64));\n#66=IFCRELDEFINESBYPROPERTIES('0nnnnnnnnnnnnnnnnnnnnn',$,$,$,(#10),#65);\n#61=")
    c = db()
    L = B.sauber(B.zeilen_aus_ifc(c, cadimport.ifc_lesen(roh, bestand=True)))
    w = next(z for z in L["zeilen"] if z["art"] == "Wand")
    w.update(status="erneuern", code="331.02.004")
    f = next(z for z in L["zeilen"] if z["art"] == "Fensteröffnung")
    f["status"] = "neu"
    out = B.ausgeben(roh, L).decode("latin-1")
    gleich(len(re.findall(r"IFCPROPERTYSET\('[^']*',[^,]*,'Pset_WallCommon'", out)), 1, "kein zweites Pset_WallCommon")
    pruefe("#21=IFCPROPERTYENUMERATEDVALUE('Status',$,(IFCLABEL('NEW')),$)" in out, "vorhandenes Status geändert")
    pruefe("#63=IFCPROPERTYSINGLEVALUE('Status',$,IFCTEXT('Neubau'),$)" in out, "Allplan-Status der Schicht als Text")
    pruefe("#55=IFCMATERIAL('331.02.004'" in out and "#62=IFCPROPERTYSINGLEVALUE('Material',$,IFCTEXT('331.02.004'),$)" in out, "Element als Material (Kundenkatalog)")
    pruefe("Pset_WindowCommon" not in out, "an eine Öffnung kommt kein Fenster-Pset")
    pruefe(cadimport.ifc_lesen(out.encode("latin-1"), bestand=True)["raeume"], "wieder lesbar")


def test_raumstempel_ohne_nummer():
    """Raumstempel ohne ausgefüllte Nummer (16.11.2026): Name „Raum Nr.“ mit Bezeichnung (LongName) ist keine Nummer – die Räume werden
    durchnummeriert; bei vielen Räumen steht in der Zeile nur die Zahl, nicht 40 Nummern hintereinander."""
    stempel = IFC.replace(b"IFCSPACE('0hhhhhhhhhhhhhhhhhhhhh',$,'',$,$,#41,#42,$,.ELEMENT.,$,$)", b"IFCSPACE('0hhhhhhhhhhhhhhhhhhhhh',$,'Raum Nr.',$,$,#41,#42,'Wohnen',.ELEMENT.,$,$)")
    pruefe(stempel != IFC, "Testmodell angepasst")
    R = cadimport.ifc_lesen(stempel, bestand=True)
    w = next(r for r in R["raeume"] if r["name"] == "Wohnen")
    gleich(w["nr"], "", "„Raum Nr.“ ist keine Nummer")
    c = db()
    alt = {**R, "raeume": [{**r, "nr": "Raum Nr."} for r in R["raeume"]] * 10}   # alter Planstand: Beschriftung als Nummer gespeichert
    L = B.sauber(B.zeilen_aus_ifc(c, alt))
    pruefe(all("Raum Nr." not in r["nr"] for r in L["raeume"]), f"alte Planstände: durchnummeriert {[r['nr'] for r in L['raeume']]}")
    z = next(z for z in L["zeilen"] if z["id"] == "raum:boden:trocken")
    gleich(z["name"], "Böden (10 Räume)", "viele Räume: nur die Zahl")


def test_neu_ueberall_im_bestand():
    """16.11.2026 „neu fehlte oft“: im Bestand bietet jede Bauteil-Zeile auch „neu“ an; im Neubau weiter nur „neu“."""
    for b in ("rohbau", "oeffnung", "raum", "ausbau", "frage"):
        pruefe("neu" in B.erlaubt({"bereich": b, "zustand": "bestand"}), f"{b}: „neu“ fehlt")
    gleich(B.erlaubt({"bereich": "raum", "zustand": "neu"}), ["neu"], "Neubau nur neu")


def test_vorlagen_mit_block_und_bestand():
    """Vorlagen in Blöcken (18.11.2026, BL-A1 B1 C1): die Auswahl bekommt den Namen der 3. Ebene der DIN 276 und das Kennzeichen „nur Bestand“."""
    c = db()
    c.execute("INSERT INTO pdb_vorlage VALUES('334.01','334','Fenster Kunststoff je m²','m²','{}','neubau,altbau',2)")
    V = {v["id"]: v for v in B.vorlagen(c, "334")}
    gleich((V["334.15"]["block"], V["334.15"]["bestand"], V["334.01"]["bestand"]), ("Außenwandöffnungen (Fenster, Türen)", True, False), "Block und Bestand aus KG und Tags")


def test_antwort_behaelt_den_aufbau():
    """21.11.2026: eine neue Antwort ohne eigenen Vorschlag (Wand „neu“/„erneuern“) löscht einen schon gewählten Aufbau nicht –
    nur „bleibt“/„offen“ nehmen ihn weg, und der Abbruch-Aufbau weicht."""
    c = db()
    R = cadimport.ifc_lesen(IFC, bestand=True)
    L = B.sauber(B.zeilen_aus_ifc(c, R))
    w = next(z for z in L["zeilen"] if z["art"] == "Wand")
    w.update(vorlage="334.15", status="erneuern", quelle="schaetzung")   # Aufbau gesetzt (wie aus dem Baukasten)
    pruefe(B.vorschlag(w, "neu") == "", "Voraussetzung: zu „neu“ gibt es für die Wand keinen Vorschlag")
    z = B.setzen(c, L, w["id"], {"status": "neu"}) if "neu" in B.erlaubt(w) else B.setzen(c, L, w["id"], {"status": "instandsetzen"})
    pruefe(z["vorlage"] not in ("", None), f"Aufbau bleibt bei neuer Antwort: {z['status']} / {z['vorlage']!r}")
    z = B.setzen(c, L, w["id"], {"status": "bleibt"})
    gleich(z["vorlage"], "", "„bleibt“ nimmt den Aufbau weg")
