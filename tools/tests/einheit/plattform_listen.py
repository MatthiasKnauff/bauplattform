"""Auswahl + frei (GO 17.11.2026): Vorschlagslisten = feste Werte aus stammdaten.py + was das Büro schon eingetragen hat (häufigste zuerst, ohne Doppelte).
Projektdaten „Nutzung“ (projekt_felder), Konto/Verwaltung Beruf, Kammer, Funktion und Nachtragsgrund (listen, /api/bp/listen)."""
import json
import sqlite3

from lib import gleich, pruefe

from bpcore import stammdaten


def _db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE bp_store(key TEXT, data TEXT)")
    c.execute("CREATE TABLE settings(key TEXT, value TEXT)")
    return c


def test_listen_fest_und_eigene():
    c = _db()
    for i, d in enumerate([{"beruf": "Architekt:in", "kammer": "AK NRW"}, {"kammer": "AK NRW"}, {"kammer": "Kammer X", "funktion": "Bauleitung"}]):
        c.execute("INSERT INTO bp_store VALUES(?, ?)", (f"konto:{i}", json.dumps(d)))
    c.execute("INSERT INTO settings VALUES('co_bv_kammer', 'architektenkammer nordrhein-westfalen')")
    L = stammdaten.listen(c, ["beruf", "kammer", "funktion", "nachtrag", "gibtsnicht"])
    gleich(sorted(L), ["beruf", "funktion", "kammer", "nachtrag"], "nur bekannte Listen")
    gleich(L["beruf"], stammdaten.BERUFE, "eigener Wert, den es fest schon gibt, nicht doppelt")
    gleich(L["kammer"][len(stammdaten.KAMMERN):], ["AK NRW", "Kammer X"], "eigene Werte hinten, häufigste zuerst; Groß/klein wie fest = schon da")
    gleich(L["funktion"], stammdaten.FUNKTIONEN, "Bauleitung steht schon fest drin")
    gleich(L["nachtrag"], stammdaten.NACHTRAGSGRUENDE, "Nachtragsgrund nur fest")


def test_nutzung_auswahl_mit_buero_werten():
    c = _db()
    for i, n in enumerate(["Tierheim", "Tierheim", "Wohnen", "Feuerwache"]):
        c.execute("INSERT INTO bp_store VALUES(?, ?)", (f"projektdaten:{i}", json.dumps({"nutzung": n})))
    f = next(f for g in stammdaten.projekt_felder(c) for f in g["felder"] if f["k"] == "nutzung")
    gleich(f["typ"], "auswahl", "Nutzung ist Auswahl + frei")
    gleich(f["opt"][len(stammdaten.NUTZUNGEN):], ["Tierheim", "Feuerwache"], "Werte anderer Projekte dazu, häufigste zuerst")
    pruefe("Nutzung" in [x["l"] for g in stammdaten.felder(stammdaten.PROJEKT) for x in g["felder"]], "feste Felder unverändert")
