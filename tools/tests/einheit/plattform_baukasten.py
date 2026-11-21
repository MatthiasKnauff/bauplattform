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
    # … dazu die Giebel (gehören zur Wand ihrer Seite) und Front + Wangen der Gaube (21.11.2026)
    k2, D2 = bk["koerper"][1], bk["dach"]["k2"]
    gb = sum(a for L in BK.giebel(k2, D2, bk["koerper"]).values() for _, a in L)
    gw = BK.gauben_wand(bk["gauben"][0], k2, D2, bk["koerper"])
    pruefe(25 < gb < 40 and 2 < gw < 12, f"Giebel {gb:.1f} m², Gaubenwände {gw:.1f} m²")
    pruefe(abs(W["331.02"]["menge"] - (2 * 21 * 2.9 - 6 * 2.9 + (21 + 9) * 2.8 + gb + gw - 1.26 * 1.38 * 108 / 150 * (W["331.02"]["menge"] and 1))) < 3, f"Wandfläche gemessen: {W['331.02']['menge']}")
    pruefe(BK.ID0 + 1 * 20 + 6 + 2 in W["331.02"]["ids"] and BK.GID + 3 in W["331.02"]["ids"], "Giebel und Gaubenwangen hängen an der Wand-Zeile")
    pruefe(all(g["teil"] for g in R) and any(g["kg"] == "322" for g in R) and any(g["kg"] == "351" for g in R) and any(g["kg"] == "363" for g in R), "Bodenplatte, Decke, Dach je Teil")
    D = next(g for g in R if g["kg"] == "363" and g["teil"] == "Hauptgebäude")   # Name des Teils, nicht der Schlüssel (21.11.2026)
    pruefe(D["menge"] > 12.8 * 9.8 and D["vorlage"] == "363.04", f"Satteldach geneigt größer als der Grundriss, Aufbau aus dem Korb: {D['menge']}")
    fv = BK.fenster_vorgabe(bk)
    gleich((fv["rahmen"], fv["uw"], fv["anzahl"]), ("Holz-Alu", 0.85, 2), "Fenster-Vorgabe D2 (Fenster + Gaube)")
    # Netz rechnet der Baustein (21.11.2026) – der Kern prüft nur: gültig durch, Unsinn nicht
    N = BK.netz_pruefen({"e": [{"i": BK.ID0, "t": "w", "g": 0, "c": "#e8dfd2", "v": [0, 0, 0, 100, 0, 0, 100, 0, 290]}, {"i": BK.ID0 + 900000, "t": "f", "g": 0, "h": BK.ID0, "v": [0] * 9}],
                         "geschosse": [{"n": "Erdgeschoss", "z": 0}]})
    gleich((len(N["e"]), N["e"][1]["h"], N["dreiecke"]), (2, BK.ID0, 2), "Netz aus dem Baustein: Elemente, Fenster an der Wand")
    pruefe(BK.netz_pruefen({"e": [{"i": 1, "t": "w", "v": [1, 2]}]}) is None, "Netz mit kaputtem Dreieck abgelehnt")
    pruefe(BK.netz_pruefen({"e": [{"i": 1, "t": "<b>", "v": [0] * 9}]}) is None, "Netz mit fremder Art abgelehnt")
    pruefe(BK.netz_pruefen({"e": [{"i": 1, "t": "w", "v": [10 ** 7] * 9}]}) is None, "Netz außerhalb eines Gebäudes abgelehnt")
    pruefe(BK.netz_pruefen("x") is None and BK.netz_pruefen(None) is None, "kein Netz")


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
    pruefe(all(z.get("korb") in KORB and "|k:" + z["korb"] + "|" in z["id"] for z in W), f"Zeile kennt ihren Korb-Eintrag, Kennung bleibt bei anderem Aufbau: {[(z['id'], z.get('korb')) for z in W]}")


def test_dachflaechen_einzeln():
    """Eine Dachfläche mit eigenem Aufbau (20.11.2026): eigene Zeile, Flächen zusammen = ganzes Dach; Index außerhalb der Dachflächen fällt weg."""
    bk = BK.sauber({"koerper": [{"id": "k1", "teil": "h", "x": 0, "y": 0, "z": 0, "w": 12, "d": 9, "h": 2.9, "wand": "A1", "boden": "A2"}],
                    "dach": {"k1": {"form": "sattel", "aufbau": "A4", "fl": {"1": "A5", "3": "A5", "0": "A4"}}}})
    gleich(bk["dach"]["k1"].get("fl"), {"1": "A5"}, "nur echte Dachflächen mit abweichendem Aufbau")
    K = dict(KORB, A5={"art": "dach", "vorlage": "363.05", "name": "Aufsparren"})
    D = [g for g in BK.rohbau(bk, K) if g["art"] == "Dach"]
    gleich(sorted(g["vorlage"] for g in D), ["363.04", "363.05"], "zwei Dach-Zeilen")
    ges = BK.dach_flaeche(bk["koerper"][0], "sattel")
    pruefe(abs(sum(g["menge"] for g in D) - ges) < 0.05 and abs(D[0]["menge"] - D[1]["menge"]) < 0.05, f"Flächen: {[g['menge'] for g in D]} / {ges}")


def test_keine_durchdringung():
    """Keine durchdringenden Körper (21.11.2026): am Anbau endet der Dachüberstand an der Wand – Fläche kleiner, Polygone gekappt."""
    h = {"id": "k1", "teil": "h", "x": 0, "y": 0, "z": 0, "w": 10, "d": 8, "h": 2.9}
    a = {"id": "k2", "teil": "t2", "x": 10, "y": 1, "z": 0, "w": 5, "d": 6, "h": 2.9}
    gleich(BK.anliegend(a, [h, a]), ["xm"], "Anbau liegt links am Hauptgebäude an")
    gleich(BK.anliegend(h, [h, a]), ["xp"], "Hauptgebäude rechts am Anbau")
    P = BK.dach_polygone(a, "flach", None, [h, a])
    pruefe(min(p[0] for p in P[0]) >= 10 - 1e-6, f"Flachdach des Anbaus ragt nicht ins Hauptgebäude: {P[0]}")
    pruefe(BK.dach_flaeche(h, "sattel", "x", [h, a]) < BK.dach_flaeche(h, "sattel", "x") - 0.5, "Satteldach ohne Überstand über dem Anbau")
    S = BK.dach_polygone(h, "sattel", "x", [h, a])
    pruefe(all(p[0] <= 10 + 1e-6 for P in S for p in P), "kein Punkt des Satteldachs jenseits der Wand")
    gleich([len(P) for P in S][:2], [4, 4], "Dachflächen bleiben Vierecke, Nummern bleiben")
    hoch = dict(a, z=6)   # Körper weit darüber: kein Anliegen
    gleich(BK.anliegend(h, [h, hoch]), [], "nur auf Höhe der Traufe")


def test_baukasten_geht_mit_dem_letzten_planstand():
    """21.11.2026: wird der letzte Planstand gelöscht, wandert der Baukasten mit in ihn – danach steht kein altes Gebäude mehr im Modell."""
    import json
    import sqlite3
    from bpcore import planstand as P
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE pm_planstand(id INTEGER PRIMARY KEY, daten)")
    c.execute("INSERT INTO pm_planstand(id, daten) VALUES(5, ?)", (json.dumps({"zeilen": []}),))
    m = {"baukasten": _bk(), "korb": dict(KORB), "assistent": {}}
    P._baukasten_mit(c, 5, m)
    D = json.loads(c.execute("SELECT daten FROM pm_planstand WHERE id=5").fetchone()["daten"])
    pruefe("baukasten" not in m and "korb" not in m, "Baukasten und Korb sind aus dem Modell")
    gleich((len(D["_baukasten"]["koerper"]), sorted(D["_korb"])), (3, sorted(KORB)), "und stecken im gelöschten Planstand")


def test_planung_ganzes_gebaeude():
    """„Neuer Planstand – mit der Planung“ (21.11.2026): alle Teile aus dem Assistenten – Anbau daneben, Aufstockung oben drauf (Dach wandert mit),
    Geschosse lückenlos übereinander."""
    m = {"teile": [{"k": "b", "n": "Bestand", "flaeche": 160, "geschosse": 2, "keller": True, "dach": "sattel", "lage": "bestand"},
                   {"k": "a", "n": "Anbau", "flaeche": 40, "geschosse": 1, "dach": "flach", "lage": "neu"},
                   {"k": "s", "n": "Aufstockung", "flaeche": 80, "geschosse": 1, "dach": "pult", "lage": "auf", "auf": "b"}]}
    bk = BK.aus_assistent(m)
    K = {t: [k for k in bk["koerper"] if k["teil"] == t] for t in "bas"}
    gleich((len(K["b"]), len(K["a"]), len(K["s"])), (3, 1, 1), "Bestand mit Keller und 2 Geschossen, Anbau, Aufstockung")
    ob = max(K["b"], key=lambda k: k["z"])
    gleich((K["s"][0]["z"], K["s"][0]["x"], K["s"][0]["w"]), (round(ob["z"] + ob["h"], 2), ob["x"], ob["w"]), "Aufstockung steht auf dem Bestand")
    pruefe(ob["id"] not in bk["dach"] and bk["dach"][K["s"][0]["id"]]["form"] == "pult", "das Dach sitzt auf der Aufstockung")
    pruefe(K["a"][0]["x"] >= ob["x"] + ob["w"] - 0.01, "Anbau steht daneben")
    eg, og = sorted([k for k in K["b"] if k["z"] >= 0], key=lambda k: k["z"])
    gleich(og["z"], round(eg["z"] + eg["h"], 2), "Geschosse ohne Lücke")
    gleich(bk["teile"], {"b": "Bestand", "a": "Anbau", "s": "Aufstockung"}, "Namen der Teile")
