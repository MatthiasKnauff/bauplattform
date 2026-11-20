"""Jede Schicht gleich: Material · Stärke · Ausführung (bpcore/schicht.py, GO 18.11.2026 MA-A1 B1 C1): Optionen zerlegt, nicht
unterscheidbare bleiben eigene Knöpfe, Dämmposition statt Unterkonstruktion, eigene Stärke/Ausführung in der Bauteilzeile – nachgebildete Datenbank."""
import json
import sqlite3

from bpcore import bauteilliste as B, schicht as S
from lib import gleich, pruefe

POS = {"012.02.004.01001": "Außenwand Kalksand-Plansteine KS RDK 2,0, d = 17,5 cm, SFK 12", "012.02.004.02001": "Außenwand Kalksand-Plansteine KS RDK 2,0, d = 24 cm, SFK 12",
       "012.01.001.02001": "Kimmschicht aus Mauermörtel, Wanddicke 17,5 cm", "012.02.003.03001": "Außenwand Porenbeton-Plansteine PP4-0,55, d = 24 cm",
       "013.04.001.06001": "Decke Stahlbeton C25/30, d = 20–22 cm, XC1, Kübel", "023.04.001.03001": "WDVS EPS 032, 16 cm",
       "023.04.004.01001": "Brandriegel Mineralwolle im EPS-WDVS, Höhe 20 cm", "038.01.001.01001": "Alu-Unterkonstruktion bis 160 mm",
       "038.01.003.01001": "Mineralwolle 035 120 mm", "023.02.001.01001": "Innenputz Wand Gipsputz, 10 mm, Q2", "034.01.001.01001": "Dispersionsanstrich, Nassabrieb Kl. 3"}
SCH = [{"name": "Tragschicht", "optionen": [{"k": "KS 17,5", "teile": [["012.02.004.01001", 1], ["012.01.001.02001", 1]], "std": True},
                                            {"k": "KS 24", "teile": [["012.02.004.02001", 1]]}, {"k": "PP4 24", "teile": [["012.02.003.03001", 1]]}]},
       {"name": "Wärmedämmung außen", "optionen": [{"k": "WDVS EPS 16", "teile": [["023.04.001.03001", 1], ["023.04.004.01001", 0.36]], "std": True}]},
       {"name": "Unterkonstruktion + Dämmung", "optionen": [{"k": "UK Alu + MW 12", "teile": [["038.01.001.01001", 1], ["038.01.003.01001", 1]], "std": True}]},
       {"name": "Innenseite", "optionen": [{"k": "Gipsputz", "teile": [["023.02.001.01001", 1], ["034.01.001.01001", 1]], "std": True},
                                           {"k": "Gipsputz/Fliesen", "teile": [["023.02.001.01001", 1]]}, {"k": "innen roh", "teile": []}]},
       {"name": "Beton", "optionen": [{"k": "StB 20 C25", "teile": [["013.04.001.06001", 1]], "std": True}, {"k": "StB 22 C25", "teile": [["013.04.001.06001", 1]]}]}]


def db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE pdb_position(katalog, code, kurz, hinweis)")
    c.executemany("INSERT INTO pdb_position VALUES('gk3', ?, ?, '')", list(POS.items()))
    c.execute("CREATE TABLE pdb_vorlage(id, kg, name, einheit, daten, tags, sort)")
    c.execute("INSERT INTO pdb_vorlage VALUES('331.01','331','AW Mauerwerk + WDVS','m²',?,'neubau',1)", (json.dumps({"schichten": SCH}),))
    return c


def test_zerlegen():
    O = S.optionen(db(), SCH)
    t = {oi: (x["mat"], x["dicke"], x["ausf"]) for oi, x in O[0]["o"].items()}
    gleich(t, {0: ("Kalksandstein", 17.5, "RDK 2,0"), 1: ("Kalksandstein", 24.0, "RDK 2,0"), 2: ("Porenbeton", 24.0, "PP4-0,55")}, "Tragschicht: Material, Stärke, Ausführung")
    gleich(O[0]["o"][0]["codes"], ["012.02.004.01001", "012.01.001.02001"], "Stärke steht in Stein und Kimmschicht – beide werden umgerechnet")
    gleich((O[0]["mats"]["Kalksandstein"]["ausf"], "RDK 1,8" in O[0]["mats"]["Kalksandstein"]["werte"]), ("Rohdichte", True), "Ausführung je Material mit fester Liste")
    gleich((O[1]["o"][0]["mat"], O[1]["o"][0]["dicke"], O[1]["o"][0]["ausf"], O[1]["o"][0]["codes"]), ("EPS", 16.0, "032", ["023.04.001.03001"]), "Dämmung: WLS, nicht der Brandriegel")
    gleich((O[2]["o"][0]["dicke"], O[2]["o"][0]["codes"]), (12.0, ["038.01.003.01001"]), "Dicke der Dämmung, nicht „bis 160 mm“ der Unterkonstruktion")
    gleich(sorted(O[3]["o"]), [0], "Innenseite: „Gipsputz/Fliesen“ ist nicht unterscheidbar, „innen roh“ hat nichts – beide bleiben Knöpfe")
    gleich([(x["dicke"], x["ausf"]) for x in O[4]["o"].values()], [(20.0, "C25/30"), (22.0, "C25/30")], "Spanne „20–22 cm“: Stärke der Option")


def test_text_und_kurz():
    gleich(S.text_ausf("Decke Stahlbeton C25/30, d = 20 cm", "C25/30", "C30/37"), "Decke Stahlbeton C30/37, d = 20 cm", "Ausführung im Text getauscht")
    gleich(S.text_ausf("Decke Stahlbeton, d = 20 cm", "", "C30/37", r"\bC\d{2}/\d{2}\b"), "Decke Stahlbeton, d = 20 cm", "nichts zu tauschen: unverändert")
    gleich(S.kurz("KS 17,5", "Kalksandstein", 20, "RDK 1,8"), "Kalksandstein 20 cm RDK 1,8", "Kurztext mit eigenen Angaben")


def test_zeile_mit_eigener_staerke_und_ausfuehrung():
    c = db()
    z = {"id": "w", "bereich": "rohbau", "name": "Außenwände"}
    B.aufbau_setzen(c, z, "331.01", [0, 0, 0, 0, 0], {"0": 20}, {"0": "RDK 1,8", "1": "032"})
    gleich((z["dicken"], z["ausf"]), ({"0": 20.0}, {"0": "RDK 1,8"}), "eigene Stärke und Ausführung gemerkt; gleiche wie die Option fällt weg")
    pruefe("Kalksandstein 20 cm RDK 1,8" in z["kurz"], "Kurztext: " + z["kurz"])
    B.aufbau_setzen(c, z, "331.01", [1, 0, 0, 0, 0], {"0": 24}, {"0": "RDK 2,0"})
    gleich((z["dicken"], z["ausf"], z["kurz"].split(", ")[1]), ({}, {}, "KS 24"), "genau die Option: keine Abweichung")


def test_daemmschicht_mit_beton_in_der_option():
    """20.11.2026: „Dämmung unter Platte – SKS + XPS 10“ – die Sauberkeitsschicht (Beton C12/15) steht vorn in der Option; Material der
    Dämmschicht ist trotzdem der Dämmstoff (XPS, WLS), nicht „Stahlbeton“ mit Betongüte. Dicke und umzurechnende Position: die Dämmung."""
    c = db()
    c.executemany("INSERT INTO pdb_position VALUES('gk3', ?, ?, '')", [("013.01.001.01001", "Sauberkeitsschicht Beton C12/15, d = 5 cm"), ("013.01.002.01001", "Perimeterdämmung XPS WLS 035, 100 mm, unter Bodenplatte"),
                                                                    ("013.01.003.01001", "Schaumglasplatten unter Bodenplatte, 120 mm"), ("013.01.004.01001", "Trennlage PE-Folie 0,2 mm")])
    SCH2 = [{"name": "Dämmung unter Platte", "optionen": [{"k": "SKS + XPS 10", "teile": [["013.01.001.01001", 1], ["013.01.002.01001", 1]], "std": True},
                                                         {"k": "Schaumglas", "teile": [["013.01.001.01001", 1], ["013.01.003.01001", 1]]}, {"k": "PE-Folie", "teile": [["013.01.004.01001", 1]]}]}]
    O = S.optionen(c, SCH2)[0]
    x = O["o"][0]
    gleich((x["mat"], x["dicke"], x["ausf"], x["codes"]), ("XPS", 10.0, "035", ["013.01.002.01001"]), "Dämmstoff, seine Dicke, seine WLS, seine Position")
    pruef = [v["mat"] for v in O["o"].values()]
    pruefe("Stahlbeton" not in pruef and "Stahlbeton" not in O["mats"], f"kein Beton als Material einer Dämmschicht: {pruef}")
    gleich(O["mats"]["XPS"]["ausf"], "WLS", "Ausführung heißt WLS, nicht Betongüte")
