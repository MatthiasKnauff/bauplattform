"""Gebäude-Baukasten (bpcore/baukasten.py, GO 20.11.2026, Mock „Gebäude-Baukasten“ A3 B2 C D2 E1 F G1 H1): Körper ⇄ Assistent,
Bauteile gemessen aus der Geometrie (je Teil und Aufbau im Korb), Fenster-Vorgabe (D2), 3D-Netz."""
import importlib.util
import os

from bpcore import baukasten as BK, bauteilliste as B, modell_hand as MH
from lib import gleich, pruefe


def _db():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plattform_bauteilliste.py")
    s = importlib.util.spec_from_file_location("_btl", p); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
    return m.db()


def _bk():
    return BK.sauber({"koerper": [{"id": "k1", "teil": "h", "x": 0, "y": 0, "z": 0, "w": 12, "d": 9, "h": 2.9, "wand": "A1", "boden": "A2"},
                                  {"id": "k2", "teil": "h", "x": 0, "y": 0, "z": 2.9, "w": 12, "d": 9, "h": 2.8, "wand": "A1", "seiten": {"yp": "A3"}},
                                  {"id": "k3", "teil": "t3", "x": 12, "y": 0, "z": 0, "w": 7, "d": 6, "h": 2.9, "wand": "A3"}],
                      "dach": {"k2": {"form": "sattel", "aufbau": "A4"}, "k3": {"form": "flach"}, "kX": {"form": "sattel"}},
                      "oeff": [{"id": "o1", "k": "k1", "seite": "yp", "art": "fenster", "u": 0.3, "b": 1.26, "h": 1.38, "rahmen": "Holz-Alu", "fach": 3}],
                      "gauben": [{"id": "g1", "k": "k2", "fl": 0, "u": 0.4, "b": 2.4, "form": "Satteldachgaube", "rahmen": "Holz-Alu", "fach": 3, "uw": 0.9}]})


KORB = {"A1": {"art": "wand", "vorlage": "331.02", "name": "KS + WDVS 16"}, "A2": {"art": "boden", "vorlage": "322.04", "name": "Bodenplatte"},
        "A3": {"art": "wand", "vorlage": "331.03", "name": "KS + Klinker"}, "A4": {"art": "dach", "vorlage": "363.04", "name": "Zwischensparren"}}


def test_sauber_und_assistent():
    bk = _bk()
    gleich(set(bk["dach"]), {"k2", "k3"}, "Dach nur auf vorhandenen Körpern")
    gleich(bk["teile"], {"h": "Hauptgebäude", "t3": "Anbau 1"}, "Teile mit Namen")
    a = BK.ins_assistent({"type": "neubau_efh", "floors": 1, "area": 100, "choice": {"keller": "none", "dachform": "flach"}}, bk)
    gleich((a["floors"], a["choice"]["dachform"], a["choice"]["keller"], a["area"]), (2, "sattel", "none", 173), "Baukasten → Assistent: Geschosse, Dach, Keller, Fläche")
    pruefe(BK.ins_assistent({}, bk) == {}, "ohne Gebäudetyp bleibt der Assistent leer")
    m = {"assistent": {"type": "neubau_efh", "floors": 3, "choice": {"dachform": "walm"}}, "teile": []}
    bk2 = BK.abgleich(BK.sauber(_bk()), m)
    H = sorted([k for k in bk2["koerper"] if k["teil"] == "h"], key=lambda k: k["z"])
    pruefe(len(H) == 3 and H[-1]["id"] in bk2["dach"] and bk2["dach"][H[-1]["id"]]["form"] == "walm", "Assistent → Baukasten: drittes Geschoss, Dach wandert mit, Walmdach")
    pruefe(all(g["k"] == H[-1]["id"] for g in bk2["gauben"]), "Gauben gehen mit dem Dach")
    leer = BK.aus_assistent({"assistent": {"type": "neubau_efh", "area": 140, "floors": 2, "choice": {"keller": "wu", "dachform": "pult"}}, "teile": []})
    gleich(([k["z"] for k in leer["koerper"]], list(leer["dach"].values())[0]["form"]), ([-2.6, 0.0, 2.9], "pult"), "leerer Baukasten aus den Angaben: Keller, EG, OG, Pultdach")
    pruefe(all(k["w"] % 0.5 == 0 and k["d"] % 0.5 == 0 for k in leer["koerper"]), "Maße im 0,5-m-Raster (B2)")


def test_rohbau_und_netz():
    bk = _bk()
    R = BK.rohbau(bk, KORB, [{"aussen": True, "b": 1.26, "h": 1.38}])
    W = {g["vorlage"]: g for g in R if g["kg"] == "331"}
    gleich(set(W), {"331.02", "331.03"}, "Außenwände je Aufbau im Korb")
    # Hauptteil: EG 2×(12+9)×2,9 − Anlage des Anbaus (6×2,9) · OG ohne Vorderseite (eigener Aufbau A3) …
    pruefe(abs(W["331.02"]["menge"] - (2 * 21 * 2.9 - 6 * 2.9 + (21 + 9) * 2.8 - 1.26 * 1.38 * 108 / 150 * (W["331.02"]["menge"] and 1))) < 3, f"Wandfläche gemessen: {W['331.02']['menge']}")
    pruefe(all(g["teil"] for g in R) and any(g["kg"] == "322" for g in R) and any(g["kg"] == "351" for g in R) and any(g["kg"] == "363" for g in R), "Bodenplatte, Decke, Dach je Teil")
    D = next(g for g in R if g["kg"] == "363" and g["teil"] == "h")
    pruefe(D["menge"] > 12.8 * 9.8 and D["vorlage"] == "363.04", f"Satteldach geneigt größer als der Grundriss, Aufbau aus dem Korb: {D['menge']}")
    fv = BK.fenster_vorgabe(bk)
    gleich((fv["rahmen"], fv["uw"], fv["anzahl"]), ("Holz-Alu", 0.85, 2), "Fenster-Vorgabe D2 (Fenster + Gaube)")
    N = BK.netz(bk)
    gleich(len(N["geschosse"]), 2, "Geschosse im Netz")
    ids = {e["i"] for e in N["e"]}
    pruefe(all(i in ids for g in R for i in g["ids"]), "Zeilen zeigen auf Flächen im Netz")
    pruefe(any(e["t"] == "f" and e.get("h") for e in N["e"]) and any(e["t"] == "r" for e in N["e"]), "Fenster mit Wand, Dachflächen")


def test_zeilen_aus_baukasten():
    c = _db()
    bk = _bk()
    RA, EA = MH.sauber(MH.vorschlag({"assistent": {"area": 140, "floors": 2, "units": 1}}, {}))
    R = MH.R_aus(RA, EA, schaetzen=False)
    R["bauteile"] = BK.rohbau(bk, KORB, R["elemente"]) + R["bauteile"]
    L = B.zeilen_aus_ifc(c, R, None, "neubau")
    W = [z for z in L["zeilen"] if z["kg"] == "331"]
    pruefe(len(W) == 3 and all(z["teil"] for z in W), f"je Teil und Aufbau eine Zeile: {[z['id'] for z in W]}")
    pruefe(all(z["quelle"] == "schaetzung" and "Baukasten" in z["hinweis"] for z in W), "Herkunft: aus dem Baukasten gemessen")
