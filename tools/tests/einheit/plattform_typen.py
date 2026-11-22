"""Bauteiltypen (Gebäudemodell neu, GN-A, Etappe 1 – 22.11.2026): der Aufbau steht einmal am Typ und gilt für alle seine Bauteile;
Maßnahme je Bauteil (F1-A); Typ aus dem IFC = Plan-Name + Dicke (F2-A)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bpcore import bauteilliste as B, cadimport, typen   # noqa: E402
from lib import gleich, pruefe   # noqa: E402
from plattform_bauteilliste import IFC, db   # noqa: E402


def _z(zid, name, status="erneuern", teil="", kg="334", art="Fenster"):
    return {"id": zid + (f"|t:{teil}" if teil else ""), "bereich": "oeffnung" if kg == "334" else "rohbau", "art": art, "kg": kg, "name": name, "status": status,
            "menge": 1, "einheit": "St", "teil": teil, "ids": [1]}


def _liste(c):
    Z = [_z("334|Fenster||0|St||bestand", "FE Holz", teil="a"), _z("334|Fenster||0|St||bestand", "FE Holz", teil="b"),
         _z("334|Fenster||0|St||bestand", "FE Holz", status="bleibt", teil="c"), _z("334|Fenster||0.4|St||bestand", "FE Holz", teil="d"),
         _z("331|Wand|KS|0.24|m²||bestand", "AW 24", kg="331", art="Wand")]
    for z in Z[:2] + Z[3:4]:
        B.aufbau_setzen(c, z, "334.15")
    return B.sauber({"zeilen": Z})


def test_typen_ableiten():
    c = db()
    L = _liste(c)
    t = [z.get("typ") for z in L["zeilen"]]
    gleich(t[0], t[1], "gleicher Plan-Name, anderer Gebäudeteil: ein Typ")
    gleich(t[0], t[2], "Maßnahme je Bauteil (F1-A): „bleibt“ gehört zum selben Typ")
    pruefe(t[3] != t[0], f"gleicher Name, andere Dicke: eigener Typ (F2-A) – {t}")
    pruefe(t[0].startswith("FE-") and t[4].startswith("AW-"), f"Kürzel je Bauteilart: {t}")
    gleich(L["typen"][t[0]]["vorlage"], "334.15", "Aufbau steht am Typ")
    gleich(B.sauber(L)["typen"], L["typen"], "bleibt beim nächsten Speichern gleich")


def test_aufbau_gilt_fuer_den_typ():
    c = db()
    L = _liste(c)
    a, b, bl, d = L["zeilen"][:4]
    B.setzen(c, L, a["id"], {"wahl": [0, 1]})
    gleich(b["wahl"], [0, 1], "andere Zeile desselben Typs folgt")
    gleich(L["typen"][a["typ"]]["wahl"], [0, 1], "Typ hat den neuen Aufbau")
    gleich(bl["vorlage"], "", "„bleibt“ behält keinen Aufbau")
    pruefe(d["wahl"] != [0, 1], "anderer Typ bleibt, wie er ist")
    B.setzen(c, L, bl["id"], {"status": "erneuern"})
    gleich((bl["vorlage"], bl["wahl"]), ("334.15", [0, 1]), "neue bauende Antwort: Aufbau des Typs statt eines neuen Vorschlags")


def test_neuer_typ_aus_diesem_und_zusammenlegen():
    c = db()
    L = _liste(c)
    a, b = L["zeilen"][:2]
    k = a["typ"]
    nk = typen.neu_aus(L, k, [b["id"]])
    pruefe(nk and nk != k and b["typ"] == nk and a["typ"] == k, f"nur die gewählte Zeile hängt um: {nk}")
    B.setzen(c, L, b["id"], {"wahl": [0, 1]})
    pruefe(a["wahl"] != [0, 1], "der alte Typ ändert sich nicht mit")
    L = B.sauber(L)
    pruefe(nk in L["typen"], "eigener Typ bleibt beim Speichern")
    n = typen.zusammen(L, nk, k)
    pruefe(n == 1 and L["zeilen"][1]["typ"] == k and L["zeilen"][1]["wahl"] == L["typen"][k]["wahl"] and nk not in L["typen"], "zusammengelegt: Typ und Aufbau des Ziels")
    k2 = typen.neu(L, "331", "")
    pruefe(k2.startswith("AW-") and L["typen"][k2]["name"] == "Außenwand" and k2 in B.sauber(L)["typen"], f"＋ Typ ohne Bauteile bleibt: {k2}")


def test_typ_bleibt_beim_neu_einlesen():
    c = db()
    R = cadimport.ifc_lesen(IFC, bestand=True)
    L = B.sauber(B.zeilen_aus_ifc(c, R))
    f = next(z for z in L["zeilen"] if z["art"] == "Fensteröffnung")
    B.setzen(c, L, f["id"], {"status": "erneuern"})
    nk = typen.neu_aus(L, f["typ"], [f["id"]], "Sonderfenster")
    L2 = B.sauber(B.zeilen_aus_ifc(c, R, B.sauber(L)))
    f2 = next(z for z in L2["zeilen"] if z["id"] == f["id"])
    gleich((f2["typ"], L2["typen"][nk]["name"]), (nk, "Sonderfenster"), "Typ und Name bleiben beim nächsten Einlesen")


def test_stand_zurueck():
    """Rückgängig einer Typ-Aktion (Oberfläche, Etappe 2): Aktion „stand“ setzt Typen und Zuordnung samt Aufbau wie vorher."""
    c = db()
    L = _liste(c)
    a, b = L["zeilen"][:2]
    k = a["typ"]
    vor = {"typen": {x: dict(t) for x, t in L["typen"].items()}, "zeilen": {z["id"]: {"typ": z["typ"], **typen.aufbau(z)} for z in L["zeilen"] if z.get("typ") == k}}
    nk = typen.neu_aus(L, k, [b["id"]])
    B.setzen(c, L, b["id"], {"wahl": [0, 1]})
    pruefe(typen.stand_setzen(L, vor), "Stand gesetzt")
    gleich((b["typ"], b["wahl"]), (k, a["wahl"]), "Zeile wieder im alten Typ mit dessen Aufbau")
    pruefe(nk not in L["typen"], "neuer Typ wieder weg")
    pruefe(not typen.stand_setzen(L, "kaputt"), "unsinniger Stand ändert nichts")
