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


def test_menge_je_bauteil():
    """Einzelne Wände im Baum (22.11.2026): je Bauteil die Menge (je) – bleibt in der Liste (sauber)."""
    c = db()
    R = cadimport.ifc_lesen(IFC, bestand=True)
    w = next(g for g in R["bauteile"] if 10 in g.get("ids", []))
    pruefe(set(w.get("je", {})) == {str(i) for i in w["ids"]} and abs(sum(w["je"].values()) - w["menge"]) < 0.01, f"Menge je Bauteil: {w.get('je')} · {w['menge']}")
    z = next(z for z in B.sauber(B.zeilen_aus_ifc(c, R))["zeilen"] if 10 in z.get("ids", []))
    gleich(z.get("je"), w["je"], "steht an der Zeile")


def test_zwei_stufen():
    """„Art ändern dauert sehr lange“ (22.11.2026): die Datei wird einmal gelesen (ifc_einlesen, gespeichert beim Planstand), eine Art-Änderung
    ordnet nur neu (ifc_ordnen) – gleiches Ergebnis wie ifc_lesen, auch nach dem Speichern als JSON."""
    import json
    S = json.loads(json.dumps(cadimport.ifc_einlesen(IFC, bestand=True)))
    for aj in (None, {"#10": "341"}, {GID: "342"}):
        A, N = cadimport.ifc_lesen(IFC, bestand=True, art_je=aj), cadimport.ifc_ordnen(S, aj)
        gleich(json.dumps(N, sort_keys=True, default=sorted), json.dumps(A, sort_keys=True, default=sorted), f"ordnen aus dem gespeicherten Stand = lesen ({aj})")


def test_aenderung_geht_vor_dem_gemerkten():
    """Rückgängig (22.11.2026): die Art aus der Änderung gerade („#Nummer“) geht vor der gemerkten (GlobalId)."""
    R = cadimport.ifc_lesen(IFC, bestand=True, art_je={GID: "342", "#10": "331"})
    gleich(next(g for g in R["bauteile"] if 10 in g.get("ids", []))["kg"], "331", "zurück auf Außenwand")
