"""Art einer Zeile aus dem Plan berichtigen (bpcore/bauteilliste.art_wahl/_art_anwenden, 20.11.2026): vermutete Bodenplatte → Decke,
Wand außen ⇄ innen; der Aufbau folgt der neuen Art, der Hinweis „bitte prüfen“ verschwindet, beim nächsten Einlesen bleibt die Wahl."""
import importlib.util
import os

from bpcore import bauteilliste as B
from lib import gleich, pruefe


def _db():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plattform_bauteilliste.py")
    s = importlib.util.spec_from_file_location("_btl", p); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
    return m.db()


def _R():
    return {"bauteile": [{"kg": "322", "art": "Bodenplatte", "name": "Bodenplatte 25 cm", "material": "", "dicke": 0.25, "einheit": "m²", "menge": 80.0, "anzahl": 1,
                          "aussen": False, "hinweis": "Unterste Platte ohne Kennung „Bodenplatte“ – als Bodenplatte angenommen, bitte prüfen.", "zustand": "neu"},
                         {"kg": "331", "art": "Wand", "name": "Wand außen 24 cm", "material": "", "dicke": 0.24, "einheit": "m²", "menge": 120.0, "anzahl": 4,
                          "aussen": True, "zustand": "neu"}], "raeume": [], "elemente": []}


def test_art_berichtigen():
    c = _db()
    L = B.zeilen_aus_ifc(c, _R(), None, "neubau")
    bp = next(z for z in L["zeilen"] if z["kg"] == "322")
    gleich([k for k, _ in bp["art_wahl"]], ["322", "351", "361"], "Platte: Bodenplatte, Decke, Dach")
    B.setzen(c, L, bp["id"], {"kg": "351"})
    gleich((bp["kg"], bp["art"], bp["name"], bp["hinweis"], bp["kg_plan"]), ("351", "Decke", "Decke 25 cm", "", "322"), "Bodenplatte → Decke")
    pruefe(not bp["vorlage"] or c.execute("SELECT kg FROM pdb_vorlage WHERE id=?", (bp["vorlage"],)).fetchone()["kg"].startswith("35"), "Aufbau folgt der neuen Art")
    w = next(z for z in L["zeilen"] if z["kg"] == "331")
    B.setzen(c, L, w["id"], {"kg": "341"})
    gleich((w["name"], w["aussen"]), ("Wand 24 cm", False), "Wand außen → innen")
    L2 = B.zeilen_aus_ifc(c, _R(), L, "neubau")
    bp2 = next(z for z in L2["zeilen"] if z["id"] == bp["id"])
    gleich((bp2["kg"], bp2["hinweis"]), ("351", ""), "nach erneutem Einlesen bleibt die Decke")
    pruefe(B.setzen(c, L2, bp2["id"], {"kg": "331"}) and bp2["kg"] == "351", "Wand-Art an einer Platte wird nicht angenommen")
    c2 = _db(); L3 = B.zeilen_aus_ifc(c2, _R(), None, "neubau"); b3 = next(z for z in L3["zeilen"] if z["kg"] == "322")
    B.setzen(c2, L3, b3["id"], {"kg": "322"})
    gleich((b3["kg"], b3["hinweis"], b3.get("kg_hand")), ("322", "", True), "gleiche Art = bestätigt, Hinweis weg")
