"""Gebäudemodell mit externer KI verfeinern (bpcore/verfeinern.py, GO 16.11.2026): was hinausgeht (keine Raumnamen, keine Projektdaten,
Vorlagen nur aus dem eigenen Baukasten) und was von der Antwort übrig bleibt (nur bekannte Zeilen und Vorlagen, Mengen > 0). Testdaten erfunden."""
import sqlite3

from bpcore import verfeinern as V
from lib import gleich, pruefe


def db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE pdb_vorlage(id, kg, name, einheit, daten, tags, sort)")
    c.execute("INSERT INTO pdb_vorlage VALUES('353.10','353','Bodenbelag erneuern Bestand','m²','{}','',1)")
    c.execute("INSERT INTO pdb_vorlage VALUES('353.20','353','Fliesen Bad','m²','{}','',2)")
    return c


M = {"assistent": {"type": "k:ef:an.um:da:d"},
     "bauteilliste": {"raeume": [{"nr": "0.01", "name": "Zimmer Lisa Müller", "flaeche": 14.2, "hoehe": 2.5, "geschoss": "EG"},
                                 {"nr": "0.02", "name": "Bad", "flaeche": 6, "hoehe": 2.5, "geschoss": "EG"}],
                      "zeilen": [{"id": "raum:boden:trocken", "bereich": "raum", "art": "Böden", "kg": "353", "name": "Böden (0.01)", "menge": 14.2, "einheit": "m²", "status": "erneuern", "vorlage": "", "kurz": ""},
                                 {"id": "dach:1", "bereich": "rohbau", "art": "Dach", "kg": "363", "name": "Steildach", "menge": 120, "einheit": "m²", "status": "erneuern", "vorlage": "", "kurz": ""},
                                 {"id": "alt:1", "bereich": "rohbau", "art": "Wand", "kg": "331", "name": "alt", "menge": 1, "einheit": "m²", "status": "bleibt", "entfaellt": True}]}}


def test_anfrage_ohne_namen():
    t, zid, vid = V.anfrage(db(), M, ["luecken", "aufbau"])
    pruefe("Lisa" not in t and "Müller" not in t and "Zimmer" not in t, f"Raumname geht nicht hinaus: {t}")
    pruefe("Wohnraum 1×" in t and "Bad/WC 1×" in t, "Räume nach Art")
    pruefe("Maßnahmen im Bestand" in t, "Bauart")
    gleich(sorted(zid), ["Z1", "Z2"], "entfallene Zeile fehlt")
    gleich(sorted(vid.values()), ["353.10", "353.20"], "Vorlagen nur aus dem Baukasten mit passender KG")


def test_antwort_pruefen():
    c = db()
    _, zid, vid = V.anfrage(c, M, ["luecken", "aufbau", "mengen"])
    kv = {v: k for k, v in vid.items()}
    roh = {"vorschlaege": [
        {"art": "neu", "name": "Dachentwässerung", "menge": "42", "einheit": "m", "kg": "363x", "grund": "fehlt"},
        {"art": "neu", "name": "Dachentwässerung", "menge": 40},   # doppelt
        {"art": "aufbau", "zeile": "Z1", "vorlage": kv["353.10"], "grund": "passt"},
        {"art": "aufbau", "zeile": "Z1", "vorlage": "V99"},   # erfundene Vorlage
        {"art": "aufbau", "zeile": "Z9", "vorlage": kv["353.10"]},   # erfundene Zeile
        {"art": "menge", "zeile": "Z2", "menge": 140, "grund": "Dachüberstand"},
        {"art": "menge", "zeile": "Z2", "menge": -3},
        "Unsinn"]}
    Z = V.pruefen(c, M, roh, zid, vid, ["luecken", "aufbau", "mengen"])
    gleich([e["art"] for e in Z], ["neu", "aendern", "aendern"], f"nur Gültiges bleibt: {Z}")
    gleich((Z[0]["neu"]["kg"], Z[0]["neu"]["menge"]), ("363", 42.0), "KG nur Ziffern, Menge als Zahl")
    gleich((Z[1]["id"], Z[1]["neu"]["vorlage"], Z[1]["neu"]["vorlage_name"]), ("raum:boden:trocken", "353.10", "Bodenbelag erneuern Bestand"), "Aufbau")
    gleich(Z[2]["neu"], {"menge": 140.0}, "Menge")
    pruefe(all(e.get("schluessel") for e in Z), "Schlüssel für „kommt nicht wieder“")
    gleich(V.pruefen(c, M, roh, zid, vid, ["mengen"])[0]["art"], "aendern", "nur das Erbetene")
    gleich(len(V.pruefen(c, M, roh, zid, vid, ["mengen"])), 1, "nur das Erbetene – eine Menge")
