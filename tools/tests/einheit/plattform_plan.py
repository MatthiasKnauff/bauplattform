"""Rückfluss ins Bauzeitenplan-Datenmodell (bpcore/plan.py): Firma für ein Gewerk aus dem Bautagebuch eintragen und zurücknehmen."""
import json
import sqlite3

from bpcore import plan
from lib import gleich, pruefe


def _db(data):
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE gantt_projects(id INTEGER PRIMARY KEY, data TEXT, rev INTEGER DEFAULT 0, updated TEXT, updated_by TEXT)")
    c.execute("INSERT INTO gantt_projects(id, data) VALUES(1, ?)", (json.dumps(data),))
    return c


def _daten():
    return {"tasks": [{"uid": 1, "name": "Baugrube ausheben", "gw": "Erdbau", "dur": 3, "res": ""}, {"uid": 2, "name": "Aufräumen", "gw": "", "dur": 1, "res": ""}],
            "sched": [{"uid": 1, "s": "2026-11-12", "f": "2026-11-14"}, {"uid": 2, "s": "2026-11-12", "f": "2026-11-12"}], "trades": {}}


def test_firma_fuer_gewerk():
    c = _db(_daten())
    alt = plan.firma_setzen(c, 1, "2026-11-12", "Erdbau", "Erdbau Müller", "c7", "rt")
    d = json.loads(c.execute("SELECT data FROM gantt_projects").fetchone()["data"])
    gleich((d["trades"]["Erdbau"]["firm"], alt), ("c7", {"trade": None, "res": {}}), "Kontakt unter Gewerke & Firmen")
    firms = {"c7": ("Erdbau Müller", 7)}
    ohne = {}
    E = plan.expected([("P", d)], firms, "2026-11-12", ohne)
    gleich(([e["firma"] for e in E], list(ohne)), (["Erdbau Müller"], ["ohne Gewerk"]), "jetzt erwartet, nur noch der Vorgang ohne Gewerk offen")
    plan.firma_zurueck(c, 1, "Erdbau", alt, "rt")
    d = json.loads(c.execute("SELECT data FROM gantt_projects").fetchone()["data"])
    gleich(d["trades"], {}, "Rückgängig: Gewerk wieder ohne Firma")


def test_firma_ohne_kontakt_als_unternehmer():
    c = _db(_daten())
    alt = plan.firma_setzen(c, 1, "2026-11-12", "", "Hausmeister Kurz", None, "rt")
    d = json.loads(c.execute("SELECT data FROM gantt_projects").fetchone()["data"])
    gleich(([t["res"] for t in d["tasks"]], alt["res"]), (["", "Hausmeister Kurz"], {2: ""}), "Unternehmer am Vorgang ohne Gewerk")
    pruefe(c.execute("SELECT rev FROM gantt_projects").fetchone()["rev"] == 1, "Änderungszähler steigt")
    plan.firma_zurueck(c, 1, "", json.loads(json.dumps(alt)), "rt")
    d = json.loads(c.execute("SELECT data FROM gantt_projects").fetchone()["data"])
    gleich([t["res"] for t in d["tasks"]], ["", ""], "Rückgängig")
