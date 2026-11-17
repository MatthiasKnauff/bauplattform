"""Raumbuch (bpcore/raumbuch.py, GO 17.11.2026 H1 I1 J1): je Raum Boden/Wand/Decke, gleiche Aufbauten werden eine Zeile,
Fliesen bis 1,20 m lassen den Rest der Wand in der Grundzeile, Vorschlag nach Raumart – mit nachgebildeter Datenbank."""
import json

from bpcore import anweisung, raumbuch
from lib import gleich, pruefe

V = {"353.01": "Estrich + Fliesen", "353.02": "Estrich + Parkett", "353.09": "Bodenbelag Nassraum", "345.01": "Innenputz mit Anstrich",
     "345.02": "Wandfliesen Nassbereich", "354.01": "Deckenputz mit Anstrich", "353.06": "Nutzestrich"}


class _Db:
    def execute(self, sql, p=()):
        class Q(list):
            def fetchone(s): return s[0] if s else None
            def fetchall(s): return list(s)
        if "FROM pdb_vorlage WHERE id=?" in sql and p[0] in V:
            return Q([{"id": p[0], "kg": p[0][:3], "name": V[p[0]], "einheit": "m²", "daten": json.dumps({"schichten": [{"name": "A", "optionen": [{"k": "x", "std": True}]}]})}])
        return Q()


def _liste():
    R = [{"id": 1, "nr": "1.01", "name": "Wohnen", "flaeche": 30.0, "umfang": 22.0, "hoehe": 2.5, "geschoss": "EG"},
         {"id": 2, "nr": "1.02", "name": "Schlafen", "flaeche": 20.0, "umfang": 18.0, "hoehe": 2.5, "geschoss": "EG"},
         {"id": 3, "nr": "1.03", "name": "Bad", "flaeche": 8.0, "umfang": 12.0, "hoehe": 2.5, "geschoss": "EG"}]
    z = lambda teil, nass, M, m: {"id": f"raum:{teil}:{'nass' if nass else 'trocken'}", "bereich": "raum", "art": {"boden": "Böden", "wand": "Wände", "decke": "Decken"}[teil],  # noqa: E731
                                  "kg": {"boden": "353", "wand": "345", "decke": "354"}[teil], "name": "x", "menge": m, "einheit": "m²", "anzahl": len(M), "zustand": "neu",
                                  "status": "neu", "berechnen": True, "vorlage": "", "wahl": [], "code": "", "kurz": "", "quelle": "raum", "ids": [], "nummern": [],
                                  "mitglieder": M, "abgeleitet": "", "anweisung": "", "verteilt": 0}
    return {"raeume": R, "zeilen": [z("boden", False, ["1.01", "1.02"], 50.0), z("wand", False, ["1.01", "1.02"], 100.0), z("boden", True, ["1.03"], 8.0),
                                    z("wand", True, ["1.03"], 30.0)], "anweisungen": [], "raumbuch": {}, "elemente": []}


def test_gleiche_aufbauten_eine_zeile():
    L = _liste()
    raumbuch.setzen(L, ["1.01", "1.02"], "boden", "353.02")
    anweisung.ableiten(_Db(), L)
    Z = {z["id"]: z for z in L["zeilen"]}
    d = [z for z in L["zeilen"] if z.get("abgeleitet") == "raum:boden:trocken"]
    gleich((len(d), d[0]["menge"], d[0]["mitglieder"], d[0]["vorlage"], d[0]["status"]), (1, 50.0, ["1.01", "1.02"], "353.02", "neu"), "zwei Räume Parkett = eine Zeile")
    gleich((Z["raum:boden:trocken"]["menge"], Z["raum:boden:trocken"]["anzahl"]), (0.0, 0), "Grundzeile leer")
    raumbuch.setzen(L, ["1.02"], "boden", "353.01")
    anweisung.ableiten(_Db(), L)
    gleich(sorted(z["menge"] for z in L["zeilen"] if z.get("abgeleitet") == "raum:boden:trocken"), [20.0, 30.0], "verschiedene Aufbauten = zwei Zeilen")


def test_fliesen_bis_120():
    L = _liste()
    raumbuch.setzen(L, ["1.03"], "wand", "345.02", fliesen="120")
    anweisung.ableiten(_Db(), L)
    d = next(z for z in L["zeilen"] if z.get("abgeleitet") == "raum:wand:nass")
    g = next(z for z in L["zeilen"] if z["id"] == "raum:wand:nass")
    gleich((d["menge"], g["menge"], g["anzahl"]), (14.4, 15.6, 1), "Fliesen 1,20/2,50 der Wand, der Rest bleibt in der Grundzeile mit dem Raum")
    pruefe(d["hinweis"] == "Aus dem Raumbuch.", "Hinweis „Aus dem Raumbuch“")


def test_vorschlag_nach_raumart():
    L = _liste()
    V = raumbuch.vorschlag(L)
    gleich((V["1.01"]["boden"]["vorlage"], V["1.03"]["boden"]["vorlage"], V["1.03"]["wand"]["fliesen"]), ("353.02", "353.09", "raumhoch"), "Wohnen Parkett, Bad Nassraum + Fliesen raumhoch")
    n = raumbuch.uebernehmen(L, ["1.03"])
    gleich((n, sorted(L["raumbuch"]), raumbuch.vorschlag(L).get("1.03")), (3, ["1.03"], None), "nur die gewählten Räume übernommen")
    raumbuch.zuruecksetzen(L, "boden", {"1.03": None})
    pruefe("boden" not in L["raumbuch"]["1.03"], "Rückgängig nimmt den Teil wieder heraus")
    gleich(raumbuch.sauber({"x": {"boden": {"vorlage": "boese"}}, "1": {"wand": {"vorlage": "345.02", "fliesen": "quatsch"}}}),
           {"1": {"wand": {"vorlage": "345.02", "wahl": [], "fliesen": "raumhoch"}}}, "sauber: nur gültige Vorlagen und Fliesenhöhen")
