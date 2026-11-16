"""Anweisungen an das Gebäudemodell und Elemente einzeln (bpcore/anweisung.py, elemente.py – GO 16.11.2026): Auswahl nach Geschoss, Raumart
und Brüstung, Treffer nur aus dem Katalog (sonst Rückfrage), Zeilen aufteilen, zurücknehmen, Regel ohne KI, Türliste aus dem Modell.
Testdaten erfunden."""
import json
import sqlite3

from bpcore import anweisung as A, bauteilliste as B, elemente as EL
from lib import gleich, pruefe


def db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE pdb_vorlage(id, kg, name, einheit, daten, tags, sort)")
    c.execute("CREATE TABLE pdb_position(katalog, code, hinweis)")
    o = lambda k, t, std=False: {"k": k, "t": t, "std": std}   # noqa: E731
    V = [("353.02", "353", "Estrich + Parkett", "m²", [{"name": "Estrich", "optionen": [o("ZE", "Zementestrich", True)]},
                                                     {"name": "Parkett", "optionen": [o("FP", "Fertigparkett", True), o("Mosaikparkett", "Eiche Mosaikparkett 8 mm, versiegelt")]}]),
         ("353.04", "353", "Estrich + Textilbelag", "m²", [{"name": "Belag", "optionen": [o("Teppich Bahn", "Tufting-Schlinge, Bahnenware", True), o("Nadelvlies", "Nadelvlies-Belag")]}]),
         ("353.01", "353", "Estrich + Fliesen", "m²", [{"name": "Fliesen", "optionen": [o("Feinsteinzeug", "Bodenfliesen Feinsteinzeug 30 × 60", True)]}]),
         ("334.10", "334", "Fenster Kunststoff je m²", "m²", [{"name": "Fenster", "optionen": [o("Kunststoff", "Kunststofffenster", True)]},
                                                             {"name": "Fensterbank innen", "optionen": [o("FBi Holzwerkst.", "Innenfensterbank Holzwerkstoff", True),
                                                                                                         o("FBi Agglo", "Innenfensterbank Quarzkomposit 2 cm")]}])]
    for i, (vid, kg, n, eh, sch) in enumerate(V):
        c.execute("INSERT INTO pdb_vorlage VALUES(?,?,?,?,?,?,?)", (vid, kg, n, eh, json.dumps({"schichten": sch}), "", i))
    return c


R = {"raeume": [{"id": 101, "nr": "0.01", "name": "Wohnen", "flaeche": 30, "umfang": 22, "hoehe": 2.5, "geschoss": "EG"},
                {"id": 102, "nr": "0.02", "name": "Bad", "flaeche": 6, "umfang": 10, "hoehe": 2.5, "geschoss": "EG"},
                {"id": 103, "nr": "0.03", "name": "Küche", "flaeche": 10, "umfang": 13, "hoehe": 2.5, "geschoss": "EG"},
                {"id": 201, "nr": "1.01", "name": "Schlafen", "flaeche": 16, "umfang": 16, "hoehe": 2.5, "geschoss": "OG"},
                {"id": 301, "nr": "-1.01", "name": "Kellerraum", "flaeche": 20, "umfang": 18, "hoehe": 2.2, "geschoss": "KG"}],
     "bauteile": [{"kg": "334", "art": "Fenster", "name": "Fenster", "material": "", "dicke": 0, "einheit": "m²", "menge": 6.4, "anzahl": 3, "aussen": True,
                   "zustand": "bestand", "ids": [11, 12, 13], "flaeche": 6.4}],
     "elemente": [{"id": 11, "art": "Fenster", "b": 1.26, "h": 1.38, "geschoss": "EG", "aussen": True, "bruestung": 0.9, "raeume": [101]},
                  {"id": 12, "art": "Fenster", "b": 1.01, "h": 2.13, "geschoss": "EG", "aussen": True, "bruestung": 0.0, "raeume": [101]},
                  {"id": 13, "art": "Fenster", "b": 0.76, "h": 0.88, "geschoss": "OG", "aussen": True, "bruestung": 1.4, "raeume": [201]}],
     "info": {}}


def liste(c):
    L = B.sauber(B.zeilen_aus_ifc(c, R, None, "bestand"))
    f = next(z for z in L["zeilen"] if z["bereich"] == "oeffnung")
    B.setzen(c, L, f["id"], {"status": "erneuern", "vorlage": "334.10"})
    return L


def test_elemente_einzeln():
    L = liste(db())
    E = {e["nr"]: e for e in L["elemente"]}
    gleich(sorted(E), ["F 01", "F 02", "F 03"], "jedes Fenster einzeln mit Nummer")
    gleich((E["F 02"]["typ"], E["F 01"]["typ"], E["F 01"]["raeume"]), ("Fenstertür", "Fenster", ["0.01"]), "bodentief = Fenstertür, Raum als Nummer")
    pruefe(all(e["zeile"] for e in L["elemente"]), "Zeile der Checkliste je Element")


def test_auswahl_und_katalog():
    c = db()
    L = liste(c)
    s = A._schritt({"ziel": "raum", "teil": "boden", "filter": {"geschoss": ["EG"], "raumart": ["Wohnraum"], "ohne_raumart": ["Bad/WC"]}, "material": "Mosaikparkett"})
    M = A.mitglieder(L, s)
    gleich(sorted(k for _, m in M for k in m), ["0.01"], "EG, Wohnräume, ohne Nassräume (Küche ist kein Wohnraum)")
    f = A._schritt({"ziel": "fenster", "filter": {"bruestung_min": 0.2}, "material": "Fensterbank Kunstmarmor"})
    gleich(sorted(k for _, m in A.mitglieder(L, f) for k in m), ["11", "13"], "nicht bodentief: Brüstung ≥ 0,20 m")
    v = A.vorschau(c, L, [s, f, {"ziel": "raum", "teil": "boden", "filter": {"geschoss": ["OG"]}, "material": "Teppich"}])
    gleich((v[0]["treffer"]["vorlage"], v[0]["treffer"]["setze"]), ("353.02", {"1": 1}), "Mosaikparkett: Vorlage und Option aus dem Katalog")
    pruefe("rueckfrage" in v[1] and any("fensterbank" in k["name"].lower() for k in v[1]["rueckfrage"]["kandidaten"]),
           f"Kunstmarmor nicht im Katalog → Rückfrage mit Ähnlichem: {v[1]}")
    gleich(v[2]["treffer"]["vorlage"], "353.04", "Teppich")


def test_anwenden_aufteilen_zuruecknehmen():
    c = db()
    L = liste(c)
    boden = next(z for z in L["zeilen"] if z["id"] == "raum:boden:trocken")
    vorher = boden["menge"]
    S = A.vorschau(c, L, [{"ziel": "raum", "teil": "boden", "filter": {"geschoss": ["EG"], "ohne_raumart": ["Bad/WC"]}, "material": "Mosaikparkett"},
                          {"ziel": "raum", "teil": "boden", "filter": {"geschoss": ["Keller"]}, "material": "Fliesen"}])
    L["anweisungen"] = [{"id": "a1", "text": "EG Mosaikparkett, Keller Fliesen", "schritte": [A._schritt(x) for x in S], "wann": "", "wer": "t"}]
    A.ableiten(c, L)
    D = [z for z in L["zeilen"] if z.get("abgeleitet") == "raum:boden:trocken"]
    gleich(len(D), 2, f"zwei abgeleitete Zeilen: {[z['name'] for z in D]}")
    park = next(z for z in D if z["vorlage"] == "353.02")
    gleich((sorted(park["mitglieder"]), park["menge"], park["status"]), (["0.01", "0.03"], 40.0, "erneuern"), "Parkett: Wohnen + Küche im EG")
    pruefe("Mosaikparkett" in park["kurz"], f"Aufbau mit Option: {park['kurz']}")
    b = next(z for z in L["zeilen"] if z["id"] == "raum:boden:trocken")
    gleich((b["menge"], b["verteilt"], b["menge_basis"]), (vorher - 60, 3, vorher), "Basis-Zeile behält den Rest (OG)")
    A.ableiten(c, L)
    gleich(len([z for z in L["zeilen"] if z.get("abgeleitet")]), 2, "zweimal ableiten ändert nichts")
    L["anweisungen"] = []
    A.ableiten(c, L)
    b = next(z for z in L["zeilen"] if z["id"] == "raum:boden:trocken")
    gleich((len([z for z in L["zeilen"] if z.get("abgeleitet")]), b["menge"], b.get("menge_basis")), (0, vorher, None), "zurückgenommen: wie vorher")


def test_fensterbank_nur_bei_erneuerten_fenstern():
    c = db()
    L = liste(c)
    s = A._schritt({"ziel": "fenster", "filter": {"bruestung_min": 0.2}, "material": "Fensterbank Quarzkomposit"})
    v = A.vorschau(c, L, [s])[0]
    gleich((v["treffer"]["vorlage"], v["treffer"]["setze"]), ("334.10", {"1": 1}), "Fensterbank als Option im Fenster-Aufbau")
    L["anweisungen"] = [{"id": "a2", "text": "x", "schritte": [A._schritt(v)], "wann": "", "wer": ""}]
    A.ableiten(c, L)
    d = next(z for z in L["zeilen"] if z.get("abgeleitet"))
    gleich((sorted(d["nummern"]), d["wahl"]), (["F 01", "F 03"], [0, 1]), "nur F 01 und F 03, Fensterbank Quarzkomposit")
    gleich(round(d["menge"], 2), round(1.26 * 1.38 + 0.76 * 0.88, 2), "Menge aus den Maßen")


def test_regel_ohne_ki():
    S = A.regel("Alle Wohnräume im EG außer Nassräume Mosaikparkett geölt, im OG Teppich, im Keller Fliesen")
    gleich([(s["filter"]["geschoss"], s["material"]) for s in S], [(["EG"], "Mosaikparkett geölt"), (["OG"], "Teppich"), (["KG"], "Fliesen")], "drei Schritte")
    pruefe(S[0]["filter"]["ohne_raumart"] == ["Bad/WC"] and S[0]["filter"]["raumart"] == ["Wohnraum"], f"Filter: {S[0]}")
    F = A.regel("Füge zu allen nicht bodentiefen Fenstern Fensterbänke aus Kunstmarmor hinzu")
    gleich((F[0]["ziel"], F[0]["filter"].get("bruestung_min")), ("fenster", 0.2), "nicht bodentief")
    pruefe("Kunstmarmor" in F[0]["material"], f"Material: {F[0]}")


def test_tuerliste_aus_dem_modell():
    L = liste(db())
    T = [EL._zeile_liste(e, L["raeume"]) for e in L["elemente"]]
    gleich((T[0]["nr"], T[0]["b"], T[0]["h"], T[0]["raumname"], T[0]["bruestung"]), ("F 01", "1260", "1380", "Wohnen", "900"), "Zeile der Türliste in mm")
    gleich(T[1]["art"], "Fenstertür", "Art")


def test_tuerliste_nur_was_eingebaut_wird_und_nummer_aus_dem_plan():
    """Entscheidungen 16.11.2026: Nummer aus dem Plan vor der fortlaufenden (C); in die Liste nur „neu“ und „erneuern“ – Bestand, der bleibt,
    und Abbruch nicht (E)."""
    c = db()
    c.execute("CREATE TABLE bp_store(key, data)")
    R2 = json.loads(json.dumps(R))
    R2["elemente"][0]["nr_ifc"] = "F-EG-07"
    L = B.sauber(B.zeilen_aus_ifc(c, R2, None, "bestand"))
    gleich(sorted(e["nr"] for e in L["elemente"]), ["F 02", "F 03", "F-EG-07"], "Nummer aus dem Plan")
    f = next(z for z in L["zeilen"] if z["bereich"] == "oeffnung")
    B.setzen(c, L, f["id"], {"status": "bleibt"})
    gleich(EL.tuerliste_abgleich(c, 1, L)["neu"], 0, "Bestand, der bleibt: nicht in die Liste")
    B.setzen(c, L, f["id"], {"status": "abbruch"})
    gleich(EL.tuerliste_abgleich(c, 1, L)["neu"], 0, "Abbruch: nicht in die Liste")
    B.setzen(c, L, f["id"], {"status": "erneuern", "vorlage": "334.10"})
    gleich(EL.tuerliste_abgleich(c, 1, L)["neu"], 3, "erneuern: alle drei in die Liste")


def test_tuerliste_fenster_und_tueren_getrennt():
    """Entscheidung D: Fenster in Liste A, Türen in Liste B – „nur“ filtert, die Zielliste ist frei wählbar."""
    c = db()
    c.execute("CREATE TABLE bp_store(key, data)")
    L = liste(c)
    gleich(EL.tuerliste_abgleich(c, 1, L, "2", "tueren")["neu"], 0, "nur Türen: keine Fenster")
    gleich(EL.tuerliste_abgleich(c, 1, L, "2", "fenster")["neu"], 3, "nur Fenster")
    gleich(EL._key(1, "2"), "tueren:1:2", "Schlüssel der zweiten Liste")
