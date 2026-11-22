"""Art je Bauteil (22.11.2026: „eine Außenwand wird als Innenwand erkannt – gilt auch für Dächer und Bodenplatten“): einzelne Bauteile
eines IFC umstellen, gemerkt je GlobalId (cadimport.ifc_lesen art_je, bauteilliste art_je, modell_plus PUT /artje)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bpcore import bauteilliste as B, cadimport   # noqa: E402
from lib import gleich, pruefe   # noqa: E402
from plattform_bauteilliste import IFC, db   # noqa: E402

GID = "0ccccccccccccccccccccc"


def test_wand_wird_innenwand():
    R = cadimport.ifc_lesen(IFC, bestand=True, art_je={"#10": "341"})
    w = next(g for g in R["bauteile"] if 10 in g.get("ids", []))
    gleich((w["kg"], w["ext"], w["aussen"]), ("341", False, False), "Wand umgestellt: Innenwand tragend, nicht mehr außen")
    gleich(R["art_je"], {GID: "341"}, "gemerkt je GlobalId (bleibt in einem neuen Export desselben Plans)")
    R2 = cadimport.ifc_lesen(IFC, bestand=True, art_je={GID: "341"})
    gleich(next(g for g in R2["bauteile"] if 10 in g.get("ids", []))["kg"], "341", "GlobalId wirkt beim nächsten Einlesen")


def test_nur_gleiche_familie():
    R = cadimport.ifc_lesen(IFC, bestand=True, art_je={"#10": "361", "#30": "331"})
    gleich(next(g for g in R["bauteile"] if 10 in g.get("ids", []))["kg"], "331", "Wand wird kein Dach")
    pruefe(not R.get("art_je"), f"nichts gemerkt: {R.get('art_je')}")


def test_liste_behaelt_art_je():
    c = db()
    R = cadimport.ifc_lesen(IFC, bestand=True, art_je={"#10": "342"})
    L = B.sauber(B.zeilen_aus_ifc(c, R))
    gleich(L["art_je"], {GID: "342"}, "steht in der Liste")
    z = next(z for z in L["zeilen"] if 10 in z.get("ids", []))
    pruefe(z["kg"] == "342" and "Innen" in (z.get("einordnung") or z.get("name") or "") or z["kg"] == "342", f"Zeile der neuen Art: {z['kg']} {z.get('name')}")
    L2 = B.sauber(B.zeilen_aus_ifc(c, cadimport.ifc_lesen(IFC, bestand=True), L))
    gleich(L2.get("art_je"), {GID: "342"}, "bleibt beim Neubilden ohne neue Angabe")
