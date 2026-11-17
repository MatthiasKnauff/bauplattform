"""Gebäudemodell ohne Plan (bpcore/modell_hand.py, 17.11.2026): Vorschlag des Assistenten, Arbeitsmaske → dieselben Zeilen wie aus einem IFC
(Räume, Fenster/Türen je Art, Rohbau geschätzt), Elemente mit Raum und Nummer."""
import importlib.util
import os

from bpcore import bauteilliste as B, modell_hand as H


def _db():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plattform_bauteilliste.py")
    s = importlib.util.spec_from_file_location("_btl", p); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
    return m.db()


def test_vorschlag_aus_assistent():
    v = H.vorschlag({"assistent": {"area": 140, "floors": 2, "units": 1}})
    assert v["quelle"] == "assistent" and {r["geschoss"] for r in v["raeume"]} == {"EG", "OG"}, v["raeume"]
    assert abs(sum(r["flaeche"] for r in v["raeume"]) - 140) < 2, sum(r["flaeche"] for r in v["raeume"])
    arten = {e["art"] for e in v["elemente"]}
    assert {"Fenster", "Fenstertür", "Innentür", "Außentür"} <= arten, arten
    assert all(e["nr"] for e in v["elemente"]) and all(e["raum"] in {r["nr"] for r in v["raeume"]} for e in v["elemente"])


def test_arbeitsmaske_wird_liste():
    v = H.vorschlag({"assistent": {"area": 120, "floors": 2}})
    RA, EA = H.sauber(v)
    L = B.zeilen_aus_ifc(_db(), H.R_aus(RA, EA), None, "neubau")
    ids = {z["id"] for z in L["zeilen"]}
    assert {"raum:boden:trocken", "raum:boden:nass"} <= ids, ids
    roh = [z for z in L["zeilen"] if z["bereich"] == "rohbau"]
    assert {z["kg"] for z in roh} >= {"331", "341", "322", "351", "361"} and all("geschätzt" in z["hinweis"] for z in roh), roh
    oe = [z for z in L["zeilen"] if z["bereich"] == "oeffnung"]
    assert oe and sum(z["anzahl"] for z in oe) == len(EA), oe
    assert len(L["elemente"]) == len(EA) and all(e["raeume"] and e["nr"] for e in L["elemente"]), L["elemente"][:3]
    ft = [e for e in L["elemente"] if e["typ"] == "Fenstertür"]
    assert ft and all(e["bruestung"] == 0 for e in ft)
    assert len(L["raeume"]) == len(RA) and all(r["umfang"] > 0 for r in L["raeume"])


def test_sauber_und_rueckweg():
    RA, EA = H.sauber({"raeume": [{"nr": "EG.01", "name": "Wohnen", "flaeche": "28,5", "hoehe": "2,6"}, "kaputt"],
                       "elemente": [{"art": "Fenster", "raum": "EG.01", "b": "1,26", "h": 1.38}, {"art": "gibtsnicht"}]})
    assert RA[0]["flaeche"] == 28.5 and RA[0]["hoehe"] == 2.6 and len(RA) == 1
    assert EA[0]["b"] == 1.26 and EA[1]["art"] == "Fenster"
    L = B.zeilen_aus_ifc(_db(), H.R_aus(RA, EA, schaetzen=False), None, "")
    zur = H._el_zurueck(L)
    assert zur[0]["raum"] == "EG.01" and zur[0]["art"] == "Fenster", zur
    v = H.vorschlag({}, L)
    assert v["quelle"] == "planstand" and v["raeume"][0]["name"] == "Wohnen"


def _alle_vorlagen():
    import glob
    import re
    wurzel = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "positionsdb", "bauteile")
    return {m for p in glob.glob(os.path.join(wurzel, "kg_*.py")) for m in re.findall(r'\{"id": "(\d{3}\.\d{2})"', open(p, encoding="utf-8").read())}


def test_rohbau_nach_bauweise():
    """Geschätzter Rohbau bekommt den Aufbau der gewählten Bauweise (Spanne aus den Baudaten); „gemischt“ teilt je Geschoss."""
    v = H.vorschlag({"assistent": {"area": 140, "floors": 2}})
    RA, EA = H.sauber(v)
    def roh(a):
        return [g for g in H.R_aus(RA, EA, assistent=a)["bauteile"] if g.get("geschaetzt")]
    m = {g["name"]: g["vorlage"] for g in roh({"choice": {"tragwerk": "massiv", "dachform": "sattel"}})}
    assert m["Außenwände"] == "331.01" and m["Innenwände"] == "341.01" and m["Decken"] == "351.01" and m["Dachdeckung"] == "363.01", m
    h = {g["name"]: g["vorlage"] for g in roh({"choice": {"tragwerk": "holz", "dachform": "flach"}})}
    assert h["Außenwände"] == "331.07" and h["Decken"] == "351.04" and h["Dach (Konstruktion)"] == "361.03" and "Dachdeckung" not in h, h
    gm = roh({"choice": {"tragwerk": "misch"}, "flTw": {"EG": "massiv", "OG": "bsp"}})
    aw = {g["material"]: g["vorlage"] for g in gm if g["kg"] == "331"}
    assert aw == {"Mauerwerk": "331.01", "Brettsperrholz": "331.17"}, aw
    assert [g["vorlage"] for g in gm if g["kg"] == "351"] == ["351.01"], "Decke über dem EG gehört zum EG (massiv)"
    alle = _alle_vorlagen()
    benutzt = {H._aw(b, f) for b in H.WORT for f in ("", "putz", "klinker", "vhf")} | {v for d in H.AUFBAU.values() for v in d.values()} | {"322.04"}
    benutzt |= {x[2] for fl in ("flach", "sattel") for bw in H.WORT for dd in ("", "kunststoff", "schiefer", "metall") for x in H._dach({"choice": {"dachform": fl, "dachdeckung": dd}}, bw)[1]}
    assert benutzt <= alle, benutzt - alle


def test_geschaetzt_mit_aufbau_im_neubau():
    c = _db()
    c.execute("INSERT INTO pdb_vorlage VALUES('331.07','331','AW Holzrahmenbau','m²',?,'neubau',1)",
              ('{"schichten":[{"name":"Tragwerk","optionen":[{"k":"HRB 160","t":"Holzrahmen","std":true}]}]}',))
    RA, EA = H.sauber(H.vorschlag({"assistent": {"area": 120, "floors": 2}}))
    R = H.R_aus(RA, EA, assistent={"choice": {"tragwerk": "holz"}})
    L = B.zeilen_aus_ifc(c, R, None, "neubau")
    aw = next(z for z in L["zeilen"] if z["kg"] == "331")
    assert aw["vorlage"] == "331.07" and aw["quelle"] == "schaetzung" and aw["berechnen"], aw
    L2 = B.zeilen_aus_ifc(c, R, None, "bestand")
    assert next(z for z in L2["zeilen"] if z["kg"] == "331")["status"] == "offen", "im Bestand fragt die Liste weiter"
