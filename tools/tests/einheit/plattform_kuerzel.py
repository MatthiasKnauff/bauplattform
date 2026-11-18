"""Kürzel aus dem Plan (GO 18.11.2026, bpcore/kuerzel.py, cadimport, bauteilliste): „gleiche Bauteile, gleicher Name“ – Text im Namen oder in einer
Schicht, Tippfehler, Seiten außen/innen, Vorschlag aus dem Baukasten mit Dickenprobe, „bitte bestätigen“, Gelerntes; dazu Raumausbau aus dem Plan
(Boden-, Deckenfläche, Leiste je Raum), doppelte Räume, Bodenplatte vermutet. Ohne Datenbank-Server (sqlite)."""
import json
import os
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # Testmodell der Nachbartests
from bpcore import bauteilliste as B   # noqa: E402
from bpcore import cadimport, kuerzel as K   # noqa: E402
from lib import gleich, pruefe   # noqa: E402
from plattform_bauteilliste import IFC   # noqa: E402

AW = {"schichten": [{"name": "Tragschicht", "optionen": [{"k": "KS 17,5", "t": "Kalksand d = 17,5 cm", "std": True}, {"k": "PP2 36,5", "t": "Porenbeton-Plansteine d = 36,5 cm"},
                                                        {"k": "PP2 42,5", "t": "Porenbeton-Plansteine d = 42,5 cm"}]},
                    {"name": "Außenputz", "optionen": [{"k": "LP", "t": "Leichtputz mit Anstrich", "std": True}, {"k": "KZ", "t": "Kalkzementputz"}]},
                    {"name": "Innenseite", "optionen": [{"k": "Gipsputz", "t": "Gipsputz, Anstrich", "std": True}, {"k": "", "t": "ohne Innenbekleidung (gesondert erfasst)"}]}]}
BODEN = {"schichten": [{"name": "Belag", "optionen": [{"k": "Parkett", "t": "Estrich + Parkett", "std": True}]}]}


def db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE pdb_vorlage(id, kg, name, einheit, daten, tags, sort)")
    c.execute("CREATE TABLE pdb_position(katalog, code, hinweis)")
    c.execute("CREATE TABLE bp_store(key PRIMARY KEY, data, updated, updated_by)")
    c.execute("INSERT INTO pdb_vorlage VALUES('331.02','331','AW monolithisch, verputzt','m²',?,'neubau',1)", (json.dumps(AW),))
    c.execute("INSERT INTO pdb_vorlage VALUES('353.02','353','Estrich + Parkett','m²',?,'neubau',2)", (json.dumps(BODEN),))
    return c


def test_zerlegen():
    z = K.zerlegen("AW pp putz antrich gibsputz flies antrisch")
    gleich((z["lage"], z["kern"], z["aussen_s"], z["innen_s"]), ("aw", "pp", ["putz", "anstrich"], ["gipsputz", "fliese", "anstrich"]), "Lage, Kern, außen bis Gipsputz, danach innen")
    gleich(sorted(z["korrigiert"].items()), [("antrich", "anstrich"), ("antrisch", "anstrich"), ("gibsputz", "gipsputz")], "Tippfehler erkannt")
    gleich(K.stufe(z), "bestaetigen", "fast alles erkannt")
    z = K.zerlegen("putz pp putz flies antrich", "Wand", True)
    gleich((z["aussen_s"], z["innen_s"]), (["putz"], ["putz", "fliese", "anstrich"]), "vor dem Kern außen – danach alles innen")
    gleich(K.zerlegen("ks putz anstrich", "Wand", False)["beide_s"], ["putz", "anstrich"], "Innenwand: beidseitig")
    gleich((K.stufe(K.zerlegen("AW1")), K.zerlegen("AW1")["nummer"]), ("offen", "1"), "AW1: nur die Lage, Nummer zur Unterscheidung")
    gleich(K.normal("AW-KS"), K.normal("aw  ks"), "Schreibweise egal")
    gleich(K.zerlegen("WTW KS 30")["dicke"], 30.0, "Dicke im Kürzel")
    pruefe(K.zerlegen("BW")["frage"], "BW: nachfragen (Brandwand oder Bestand)")
    pruefe(K.zerlegen("estrich fbh pakett", "Bekleidung")["waerme"], "Fußbodenheizung erkannt (KG 423)")


def test_vorschlag_dickenprobe_lernen():
    c = db()
    vid, wahl, h = K.vorschlag(c, K.zerlegen("pp putz", "Wand", True), "331", 0.365)
    gleich((vid, wahl, h), ("331.02", [1, 0, 1], ""), "Porenbeton 36,5 aus der Zeichnung, Innenseite gesondert (Räume da)")
    vid, wahl, h = K.vorschlag(c, K.zerlegen("pp putz", "Wand", True), "331", 0.175, innen_mit=True)
    pruefe(wahl[0] == 1 and wahl[2] == 0 and "17,5" in h and "36,5" in h, f"Plan 17,5 passt nicht – Hinweis statt still: {h}")
    K.lernen(c, "aw 1", "331.02", [0, 0, 0])
    gleich(K.gelernt(c, "aw 1"), {"vorlage": "331.02", "wahl": [0, 0, 0], "n": 1}, "Gelerntes je Kürzel")


IFC2 = IFC.replace(b"#40=IFCSPACE('0hhhhhhhhhhhhhhhhhhhhh',$,'',$,$,#41,#42,$,.ELEMENT.,$,$);", b"#40=IFCSPACE('0hhhhhhhhhhhhhhhhhhhhh',$,'0.01',$,$,#41,#42,'Wohnen',.ELEMENT.,$,$);")
_ZUSATZ = (b"#70=IFCSPACE('0zzzzzzzzzzzzzzzzzzzzz',$,'',$,$,#41,#42,$,.ELEMENT.,$,$);\n"   # derselbe Raum ohne Namen noch einmal
           b"#71=IFCCOVERING('0yyyyyyyyyyyyyyyyyyyyy',$,' ',$,$,#41,#72,$,.FLOORING.);#72=IFCPRODUCTDEFINITIONSHAPE($,$,(#73));"
           b"#73=IFCSHAPEREPRESENTATION(#4,'Body','SweptSolid',(#74));#74=IFCEXTRUDEDAREASOLID(#45,#5,#17,0.03);\n"
           b"#75=IFCMATERIAL('estrich fbh pakett',$,$);#76=IFCRELASSOCIATESMATERIAL('0xxxxxxxxxxxxxxxxxxxxx',$,$,$,(#71),#75);\n"
           b"#77=IFCRELCONTAINEDINSPATIALSTRUCTURE('0wwwwwwwwwwwwwwwwwwwww',$,$,$,(#71),#40);\n"
           b"#80=IFCMATERIAL('putz pp putz flies antrich',$,$);#81=IFCMATERIALLAYER(#80,0.24,$,$,$,$,$);#82=IFCMATERIALLAYERSET((#81),$,$);"
           b"#83=IFCRELASSOCIATESMATERIAL('0vvvvvvvvvvvvvvvvvvvvv',$,$,$,(#10),#82);\n")


def _ifc2():
    k = IFC2.rindex(b"ENDSEC;")
    roh = IFC2[:k] + _ZUSATZ + IFC2[k:]
    return roh.replace(b"#59=IFCRELASSOCIATESMATERIAL('0lllllllllllllllllllll',$,$,$,(#10),#58);", b"").replace(b"(#40,#48)", b"(#40,#48,#70)")


def test_einlesen_kuerzel_raumausbau():
    R = cadimport.ifc_lesen(_ifc2(), bestand=True)
    w = next(b for b in R["bauteile"] if b["art"] == "Wand")
    gleich(w.get("kuerzel"), "putz pp putz flies antrich", "Kürzel aus dem Material der Schicht (Name leer)")
    gleich([r["name"] for r in R["raeume"]].count("Wohnen"), 1, "doppelter Raum zusammengelegt, der beschriftete bleibt")
    pruefe(not any(r["name"] == "" and r["flaeche"] == 20 for r in R["raeume"]), "der unbeschriftete Doppelte ist weg")
    pruefe(any("doppelt" in h for h in R["hinweise"]), "Hinweis auf den doppelten Raum")
    gleich([(a["teil"], a["text"]) for a in R["ausbau"]], [("boden", "estrich fbh pakett")], "Bodenfläche je Raum → Raumausbau, keine lose Zeile")
    pruefe(not any(b["art"] == "Bekleidung" for b in R["bauteile"]), "Bekleidung im Raum nicht doppelt als Zeile")
    c = db()
    L = B.sauber(B.zeilen_aus_ifc(c, R, None, "neubau"))
    z = next(x for x in L["zeilen"] if x.get("kuerzel"))
    gleich((z["status"], z["kz_vorlage"]), ("offen", "331.02"), "Bestandswand: erst die Antwort, der Vorschlag wartet")
    B.setzen(c, L, z["id"], {"status": "erneuern"})
    gleich((z["vorlage"], z["wahl"], z["bestaetigt"], z["erkannt"]["stufe"]), ("331.02", [1, 0, 1], False, "bestaetigen"), "Vorschlag aus dem Kürzel mit Wahl – bitte bestätigen")
    gleich(L["raumausbau"]["0.01"]["boden"]["vorlage"], "353.02", "Raumausbau → Vorschlag fürs Raumbuch")
    from bpcore import raumbuch
    gleich(raumbuch.vorschlag(L)["0.01"]["boden"], {"vorlage": "353.02", "plan": "estrich fbh pakett"}, "der Plan geht der Raumart vor")
    pruefe(any("Fußbodenheizung" in (x["hinweis"] or "") for x in L["zeilen"]), "Fußbodenheizung → Hinweis KG 423")
    B.setzen(c, L, z["id"], {"bestaetigt": True})
    L2 = B.sauber(B.zeilen_aus_ifc(c, R, L, "neubau"))
    gleich(next(x for x in L2["zeilen"] if x["id"] == z["id"])["bestaetigt"], True, "bestätigt bleibt beim nächsten Planstand")
    gleich(K.gelernt(c, K.normal("putz pp putz flies antrich"))["vorlage"], "331.02", "das Büro merkt es sich")


def test_klammer_aus_dem_katalog():
    """Allplan-Kürzel-Kataloge (tools/allplan-kuerzel): Bedeutung steht in Klammern dahinter und zählt nicht."""
    gleich(K.normal("AW (Außenwand)"), "aw", "Klammer überlesen")
    gleich(K.normal("GK (Gipskarton (Metallständer))"), "gk", "auch verschachtelt")
    gleich(K.stufe(K.zerlegen("AW KS WDVS putz innenputz (Außenwand KS, außen WDVS…)", "Wand")), "bestaetigen", "Beispiel aus dem Katalog")


def test_allplan_standardmaterial():
    """Allplan schreibt „Mauerwerk tragend“ ans Material: Mauerwerk ist ein Kern, tragend nur ein Hinweis – nichts „nicht erkannt“ (18.11.2026)."""
    z = K.zerlegen("Mauerwerk tragend", "Wand")
    gleich((z["kern"], z["unbekannt"], K.stufe(z)), ("mauerwerk", [], "teils"), "Mauerwerk erkannt, tragend kein Fehler")
    gleich(K.lesbar(K.zerlegen("Mauerwerk nicht tragend", "Wand"))[-1][1], "nicht tragend", "„nicht tragend“ als ein Hinweis")
