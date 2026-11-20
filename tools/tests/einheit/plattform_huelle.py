"""Gebäudehülle im Projektmodell (bpcore/huelle.py): Bauteile aus den Baukosten, Vorschläge aus dem Assistenten, Abgleich mit einer App – ohne Datenbank."""
from lib import gleich, pruefe

from bpcore import huelle as H

BK = {"bauteile": [
    {"id": "b1", "kg": "331", "name": "Außenwand KS", "menge": 212, "einheit": "m²", "lagen": [["Kalksandstein", 0.175], ["WDVS EPS", 0.16], ["leer", 0]], "src": "ifc"},
    {"id": "b2", "kg": "331", "name": "Kellerwand WU", "menge": 80, "einheit": "m²"},
    {"id": "b3", "kg": "334", "name": "Fenster Kunststoff", "menge": 12, "einheit": "St", "uw": 0.9},
    {"id": "b4", "kg": "363", "name": "Flachdach Warmdach", "menge": 186, "einheit": "m²"},
    {"id": "b5", "kg": "351", "name": "Decke über EG", "menge": 90, "einheit": "m²"},
    {"id": "b6", "kg": "341", "name": "Innenwand", "menge": 300, "einheit": "m²"},
    {"id": "b7", "kg": "331", "name": "Sockel", "menge": 30, "einheit": "m"}, "quatsch"]}


def test_aus_kosten():
    B = {b["ref"]: b for b in H.aus_kosten(BK, 7, "KB")}
    gleich(sorted(B), ["bk:7:b1", "bk:7:b2", "bk:7:b3", "bk:7:b4", "bk:7:b5"], "nur Hülle, nur Flächen (Fenster auch nach Stück)")
    gleich([B[f"bk:7:b{i}"]["art"] for i in range(1, 6)], ["wand", "erdwand", "fenster", "flachdach", ""], "Art aus Kostengruppe und Name")
    gleich((B["bk:7:b1"]["flaeche"], len(B["bk:7:b1"]["lagen"]), B["bk:7:b1"]["ifc"]), (212.0, 3, True), "Fläche, Schichten, IFC")
    gleich((B["bk:7:b3"]["flaeche"], B["bk:7:b3"]["uw"], B["bk:7:b3"]["lagen"]), (None, 0.9, []), "Fenster: U-Wert, keine Schichten")
    gleich(H.aus_kosten(None, 1, "x"), [], "leer")


def test_aus_assistent():
    gleich(H.aus_assistent({}), [], "ohne Angaben nichts")
    V = {v["art"]: v for v in H.aus_assistent({"assistent": {"type": "neubau_efh", "dg": "aus", "choice": {"keller": "wu", "dachform": "sattel"}}})}
    gleich(sorted(V), ["bodenplatte", "erdwand", "fenster", "steildach", "wand"], "Neubau mit Keller und Satteldach")
    pruefe(all(v["vorschlag"] and v["flaeche"] is None and v["ref"] == "as:" + k for k, v in V.items()), "Vorschläge ohne Fläche")
    V = [v["art"] for v in H.aus_assistent({"assistent": {"type": "san_mfh", "choice": {"keller": "none", "dachform": "flach"}}})]
    gleich(V, ["flachdach"], "Sanierung, Flachdach, kein Keller")


def test_abgleich():
    B = H.aus_kosten(BK, 7, "KB") + [v for v in H.aus_assistent({"assistent": {"type": "neubau_efh", "choice": {"keller": "wu", "dachform": "flach"}}})]
    da = [{"id": "x1", "ref": "bk:7:b1", "typ": "wand", "flaeche": 200, "kurz": "AW1"}, {"id": "x2", "ref": "bk:7:b4", "typ": "flachdach", "flaeche": 186.02},
          {"id": "x3", "typ": "bodenplatte", "flaeche": 90}]
    A = {h["schluessel"]: h for h in H.abgleich(da, B)}
    gleich(A["bk:7:b1|flaeche|212.0"]["titel"], "AW1: Fläche 200 → 212 m²", "geänderte Fläche")
    gleich(A["bk:7:b1|flaeche|212.0"]["da"], "x1", "trifft das vorhandene Bauteil")
    pruefe(not any(k.startswith("bk:7:b4") for k in A), "gleiche Fläche: kein Hinweis")
    pruefe("bk:7:b2|neu|80.0" in A and A["bk:7:b3|neu|None"]["art"] == "neu", "fehlende Bauteile")
    pruefe("Art bitte wählen" in A["bk:7:b5|neu|90.0"]["text"], "Decke: Art wählen")
    V = sorted(k for k in A if k.startswith("as:"))
    gleich(V, ["as:erdwand", "as:fenster"], "Vorschläge: Art fehlt im Nachweis (Wand, Dach, Bodenplatte sind da)")
    gleich(H.abgleich([{"id": "y", "ref": "as:erdwand", "typ": "wand"}], H.aus_assistent({"assistent": {"type": "bad", "choice": {"keller": "wu"}}})), [], "angelegter Vorschlag meldet sich nicht wieder")


def test_aufbau_in_den_waermeschutz():
    """Wandaufbauten in den Wärmeschutz (18.11.2026): der gewählte Aufbau (Baukasten, Wahl je Schicht, eigene Dämmdicke) liefert Schichten mit Dicke;
    ändert er sich im Modell, bekommt der Wärmeschutz einen Hinweis „Aufbau geändert“ (auch für schon übernommene Bauteile ohne Schichten)."""
    import sqlite3
    c = sqlite3.connect(":memory:"); c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE pdb_vorlage(id, daten)")
    T = ',"teile":[["x",1]]'
    c.execute("INSERT INTO pdb_vorlage VALUES('331.01', ?)", ('{"schichten":[{"name":"Innenputz","optionen":[{"k":"Gipsputz 1,5 cm"%s}]},{"name":"Mauerwerk","optionen":[{"k":"KS 17,5 cm"%s},{"k":"Porenbeton 24 cm"%s}]},'
                                                           '{"name":"Dämmung","optionen":[{"k":"WDVS EPS 14 cm"%s}]},{"name":"Anstrich","optionen":[{"k":"Silikatfarbe"%s}]}]}' % ((T,) * 5),))
    L = H.lagen_aus_aufbau(c, {"v": "331.01", "w": [0, 1, 0, 0], "d": {"2": 20}})
    assert L == [["Innenputz Gipsputz 1,5 cm", 0.015, "putz_kalkgips", {}], ["Mauerwerk Porenbeton 24 cm", 0.24, "porenbeton_500", {}],
                 ["Dämmung WDVS EPS 14 cm", 0.2, "eps_035", {}]], L   # eigene Dämmdicke 20 cm, Anstrich ohne Dicke fällt weg; Baustoff fest (uwert.py)
    x = {"ref": "bk:1:a", "art": "wand", "name": "Außenwand", "flaeche": 100, "uw": None, "lagen": L, "quelle": "Baukosten", "herkunft": "", "kg": "331", "aus_aufbau": True}
    x["sig"] = H.sig(x)
    A = H.abgleich([{"id": "b1", "ref": "bk:1:a", "typ": "wand", "flaeche": 100, "name": "AW", "sig": "alt"}], [x])
    assert [h["art"] for h in A] == ["aufbau"] and "Porenbeton" in A[0]["text"], A
    assert H.abgleich([{"id": "b1", "ref": "bk:1:a", "typ": "wand", "flaeche": 100, "name": "AW", "sig": x["sig"]}], [x]) == []
    assert [h["art"] for h in H.abgleich([{"id": "b1", "ref": "bk:1:a", "typ": "wand", "flaeche": 100, "name": "AW", "schichten": []}], [x])] == ["aufbau"]


def test_aus_dem_gebaeudemodell_ohne_kosten():
    """Hülle direkt aus der Bauteilliste (20.11.2026): Zeilen, die in keiner Kostenermittlung stehen, kommen mit „bk:0:<Zeile>“ – auch unbeantwortete.
    Dieselbe Zeile später aus den Kosten ist dasselbe Bauteil (kein zweiter Hinweis „Neu“)."""
    L = {"zeilen": [{"id": "w1", "kg": "331", "name": "Wand außen 36,5 cm", "menge": 120, "einheit": "m²", "status": "offen", "quelle": "ifc", "aussen": True, "lagen": [["Mauerwerk", 0.365]], "vorlage": "v7", "wahl": [1]},
                    {"id": "w2", "kg": "341", "name": "Wand 11,5 cm", "menge": 80, "einheit": "m²", "status": "offen"},
                    {"id": "f1", "kg": "334", "name": "Fenster", "menge": 9, "einheit": "St", "status": "neu"},
                    {"id": "d1", "kg": "361", "name": "Dach", "menge": 90, "einheit": "m²", "status": "abbruch"},
                    {"id": "b1", "kg": "331", "name": "schon in den Kosten", "menge": 5, "einheit": "m²", "status": "neu"}]}
    B = {b["ref"]: b for b in H.aus_liste(L, {"b1"})}
    gleich(sorted(B), ["bk:0:f1", "bk:0:w1"], "nur Hülle, nicht Abbruch, nicht was die Kosten schon liefern")
    gleich((B["bk:0:w1"]["art"], B["bk:0:w1"]["flaeche"], B["bk:0:w1"]["quelle"], B["bk:0:w1"]["aussen"], len(B["bk:0:w1"]["lagen"])), ("wand", 120.0, "Gebäudemodell", True, 1), "Wand mit Fläche, Schichten, außen")
    gleich(B["bk:0:w1"]["aufbau"], {"v": "v7", "w": [1]}, "gewählter Aufbau geht mit")
    gleich(H.aus_liste(None), [], "ohne Liste")
    da = [{"id": "x", "ref": "bk:0:w1", "typ": "wand", "flaeche": 120.0}]
    gleich(H.abgleich(da, H.aus_kosten({"bauteile": [{"id": "w1", "kg": "331", "name": "Wand außen 36,5 cm", "menge": 120, "einheit": "m²"}]}, 5, "KB")), [], "dieselbe Zeile aus den Kosten: kein neuer Hinweis")
    h = H.abgleich([{"id": "x", "ref": "bk:5:w1", "typ": "wand", "flaeche": 100.0}], list(B.values()))
    gleich([(x["art"], x.get("da")) for x in h], [("flaeche", "x"), ("neu", None)], "umgekehrt: Bauteil aus den Kosten, Zeile jetzt aus dem Modell – Fläche angleichen; Fenster ist neu")
    gleich(H.abgleich([{"id": "y", "ref": "bk:4:w1", "typ": "wand", "flaeche": 120.0}], H.aus_kosten({"bauteile": [{"id": "w1", "kg": "331", "name": "W", "menge": 120, "einheit": "m²"}]}, 5, "KB"))[0]["art"], "neu", "zwei Kostenermittlungen bleiben wie bisher getrennt")


def test_lange_kennung_bleibt_dasselbe_bauteil():
    """Zeilen aus dem Plan haben lange Kennungen (Art, Schichten, Dicke …). Der Wärmeschutz kürzte den Verweis früher auf 80 Zeichen –
    das Bauteil fand sich nicht wieder (3D: „nicht im Nachweis“, Hinweis kam erneut). Jetzt bleibt er ganz; alte, gekürzte gelten weiter."""
    import waermeschutz as W
    zid = "331|Wand|Kalksandstein 17,5 cm, Mineralwolle 14 cm, Luftschicht 2 cm, Klinker 11,5 cm|0.45|m²||neu"
    L = {"zeilen": [{"id": zid, "kg": "331", "name": "Außenwand KS Klinker", "menge": 88, "einheit": "m²", "aussen": True, "status": "neu"}]}
    B = H.aus_liste(L)
    pruefe(len(B) == 1 and len(B[0]["ref"]) > 80, "Kennung ist länger als 80 Zeichen")
    gleich(W._bauteil({"ref": B[0]["ref"], "typ": "wand", "name": "AW", "flaeche": 88})["ref"], B[0]["ref"], "Verweis wird nicht mehr gekürzt")
    for ref in (B[0]["ref"], B[0]["ref"][:80]):   # neu ganz · früher gekürzt gespeichert
        A = H.abgleich([{"id": "x1", "ref": ref, "typ": "wand", "flaeche": 88}], B)
        pruefe(not [h for h in A if h["art"] == "neu"], f"schon angelegt – kein Hinweis „Neu“ ({len(ref)} Zeichen)")
