"""Innenwände, Treppen und Räume im Gebäude-Baukasten (Etappe 5 „Gebäudemodell neu“, 22.11.2026): Räume aus den Wänden, Zeilen und Deckenloch."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bpcore import baukasten as BK, baukasten_innen as BI   # noqa: E402
from lib import gleich, pruefe   # noqa: E402


def _bk(**mehr):
    return BK.sauber({"koerper": [{"id": "eg", "teil": "h", "x": 0, "y": 0, "z": 0, "w": 10, "d": 8, "h": 2.75},
                                  {"id": "og", "teil": "h", "x": 0, "y": 0, "z": 2.75, "w": 10, "d": 8, "h": 2.75}],
                      "dach": {"og": {"form": "sattel"}}, **mehr})


def test_raeume_aus_den_wanden():
    bk = _bk()
    R = [r for r in BI.raeume(bk) if r["k"] == "eg"]
    gleich(len(R), 1, "ohne Innenwand: ein Raum je Geschoss")
    pruefe(abs(R[0]["flaeche"] - (10 - 0.73) * (8 - 0.73)) < 0.5, f"Fläche innerhalb der Außenwände: {R[0]['flaeche']}")
    bk = _bk(innen=[{"id": "w1", "k": "eg", "a": [4, 0.365], "b": [4, 7.635]}, {"id": "w2", "k": "eg", "a": [4, 4], "b": [9.635, 4]}],
             rnamen=[{"k": "eg", "p": [2, 2], "name": "Wohnen"}, {"k": "eg", "p": [7, 6], "name": "Küche", "offen": True}, {"k": "xx", "p": [1, 1], "name": "weg"}])
    R = sorted([r for r in BI.raeume(bk) if r["k"] == "eg"], key=lambda r: -r["flaeche"])
    gleich(len(R), 3, f"zwei Innenwände: drei Räume – {[(r['name'], r['flaeche']) for r in R]}")
    gleich((R[0]["name"], R[0]["nr"], R[0]["geschoss"]), ("Wohnen", R[0]["nr"], "EG"), "Name am Punkt")
    pruefe(any(r["name"] == "Küche" and r.get("offen") for r in R) and len(bk["rnamen"]) == 2, "offen bis unters Dach; Name in fremdem Körper fällt weg")
    pruefe(all(len(r["umriss"]) >= 4 and r["umfang"] > 0 for r in R), "Umriss und Umfang")
    pruefe(abs(sum(r["flaeche"] for r in R) - (9.27 * 7.27 - (7.27 + 5.635) * 0.115)) < 1.0, f"Summe ≈ Innenfläche minus Wände: {sum(r['flaeche'] for r in R)}")


def test_zeilen_treppe_und_deckenloch():
    bk = _bk(innen=[{"id": "w1", "k": "eg", "a": [4, 0.365], "b": [4, 7.635]}],
             treppen=[{"id": "t1", "k": "eg", "x": 1, "y": 1, "w": 1.0, "l": 4.2, "r": "xp", "form": "gerade", "mat": "holz"}])
    Z = BK.rohbau(bk, {})
    iw = [g for g in Z if g["kg"] == "341"]
    pruefe(len(iw) == 1 and abs(iw[0]["menge"] - 7.27 * 2.75) < 0.05 and iw[0]["ids"] == [BI.IWID], f"Innenwand: Länge × Höhe – {iw}")
    tr = [g for g in Z if g["art"] == "Treppe"]
    pruefe(len(tr) == 1 and tr[0]["einheit"] == "St" and tr[0]["menge"] == 1 and "Holz" in tr[0]["name"] and "17 Steigungen" in tr[0]["name"], f"Treppe: {tr}")
    de = next(g for g in Z if g["art"] == "Decke")
    gleich(de["menge"], round(80 - 4.2, 2), "Decke über der Treppe hat ein Loch")
    s, a, sm = BI.schrittmass(bk["koerper"][0], bk["treppen"][0])
    pruefe(17 < s < 18.5 and 59 <= sm <= 65, f"Schrittmaß aus Geschosshöhe und Lauflänge: {s}/{a}/{sm}")
