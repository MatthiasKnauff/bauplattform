"""Änderungen je Bauteil im Gebäudemodell (bpcore/modell_aenderung.py, GO 20.11.2026): vorher → nachher je Feld, mit App und Person;
erstes Füllen zählt nicht, ein neuer Planstand heißt „plan“, Zurücknehmen (C2) setzt den Wert von vorher; Einstellungen A–F mit Vorgabe."""
import json
import os
import sqlite3

from bpcore import modell_aenderung as A
from lib import gleich, pruefe


def _db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE pm_aenderung(id INTEGER PRIMARY KEY, project_id, zeile, ids, art, feld, vorher, nachher, text, wann, wer, app, zurueck DEFAULT 0)")
    c.execute("CREATE TABLE bp_store(key PRIMARY KEY, data, updated, updated_by)")
    return c


def _z(zid, **k):
    z = {"id": zid, "name": zid, "status": "offen", "vorlage": "", "wahl": [], "kurz": "", "menge": 10.0, "einheit": "m²", "ids": [7], "bereich": "rohbau", "quelle": "ifc"}
    z.update(k)
    return z


def test_aenderungen_merken():
    c = _db()
    os.environ["APP"] = "waermeschutz"
    neu = {"bauteilliste": {"quelle": {"planstand": 1}, "zeilen": [_z("w1")]}}
    gleich(A.merken(c, 5, {}, neu, "anna"), 0, "erstes Füllen zählt nicht")
    alt, neu = neu, json.loads(json.dumps(neu))
    neu["bauteilliste"]["zeilen"][0].update(status="erneuern", dicken={"2": 18})
    neu["bauteilliste"]["zeilen"].append(_z("w2", ids=[8]))
    A.merken(c, 5, alt, neu, "anna")
    L = A.liste(c, 5)
    gleich(sorted(x["feld"] for x in L), ["dicken", "neu", "status"], "Felder")
    s = next(x for x in L if x["feld"] == "status")
    gleich((s["app"], s["wer"], s["ids"], s["art"], s["kann"]), ("waermeschutz", "anna", [7], "bauteil", True), "mit App, Person und Nummern im Plan")
    pruefe("noch offen → erneuern" in s["text"], s["text"])
    pruefe(not next(x for x in L if x["feld"] == "neu")["kann"], "neue Zeile lässt sich nicht zurücknehmen")
    neu2 = json.loads(json.dumps(neu)); neu2["bauteilliste"]["quelle"] = {"planstand": 2, "name": "IFC 2"}; neu2["bauteilliste"]["zeilen"] = neu2["bauteilliste"]["zeilen"][:1]
    A.merken(c, 5, neu, neu2, "bernd")
    L = A.liste(c, 5)
    gleich({x["feld"] for x in L if x["art"] == "plan"}, {"planstand", "weg"}, "neuer Planstand: art plan, entfallene Zeile")


def test_zurueck_und_einst():
    c = _db()
    M = {"modell": {"bauteilliste": {"quelle": {"planstand": 1}, "zeilen": [_z("w1", status="erneuern")]}}}
    c.execute("INSERT INTO pm_aenderung(project_id, zeile, ids, art, feld, vorher, nachher, text, wann, wer, app) VALUES(5,'w1','[7]','bauteil','status',?,?,'','2026-11-20','a','')",
              (json.dumps("neu"), json.dumps("erneuern")))
    gesp = []
    import bpcore.bauteilliste as B
    alt = B.erlaubt
    B.erlaubt = lambda z: ["neu", "erneuern", "bleibt", "offen"]
    B_vor = B.vorschlag
    B.vorschlag = lambda z, s: ""
    B_auf = B.aufbau_setzen
    B.aufbau_setzen = lambda *a, **k: None
    try:
        ok = A.zurueck(c, 5, 1, "anna", lambda c_, p: M, lambda c_, p, m, w: gesp.append(m))
    finally:
        B.erlaubt, B.vorschlag, B.aufbau_setzen = alt, B_vor, B_auf
    pruefe(ok and gesp and gesp[0]["bauteilliste"]["zeilen"][0]["status"] == "neu", f"zurückgenommen: {gesp}")
    pruefe(A.liste(c, 5)[0]["zurueck"] and not A.liste(c, 5)[0]["kann"], "nicht zweimal")
    gleich(A.einst(c), A.EINST, "Vorgabe A1 B1 C2 E1 F1")
    gleich(A.einst_setzen(c, {"b": "b3", "x": 1, "c": "zz"}, "admin")["b"], "b3", "setzen")
    gleich((A.einst(c)["b"], A.einst(c)["c"]), ("b3", "c2"), "Unbekanntes bleibt bei der Vorgabe")
