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
