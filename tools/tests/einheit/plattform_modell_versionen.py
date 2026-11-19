"""Versionen der Apps in den Kisten der Verknüpfungs-Karte (bpcore/modell_versionen.py, GO 19.11.2026): Liste wie im Versionsmenü (★ gilt,
ohne Archiviertes) und „übernehmen“ = diese Version wird die gültige. Nachgebildete Datenbank (SQLite)."""
import sqlite3

from bpcore import modell_versionen as MV
from lib import gleich


def db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    for t in ("CREATE TABLE bp_store(key TEXT PRIMARY KEY, data TEXT, updated TEXT, updated_by TEXT)",
              "CREATE TABLE gantt_projects(id TEXT, name TEXT, created TEXT, updated TEXT, data TEXT, project_id INTEGER)",
              "CREATE TABLE bk_projects(id INTEGER, name TEXT, created TEXT, updated TEXT, archived INTEGER, project_id INTEGER)",
              "CREATE TABLE ava_version(id INTEGER, name TEXT, created TEXT, updated TEXT, aktiv INTEGER, archived INTEGER, project_id INTEGER)",
              "CREATE TABLE honorar_version(id INTEGER, name TEXT, erstellt TEXT, gilt BOOLEAN, auftrag_id INTEGER, project_id INTEGER)",
              "CREATE TABLE bauantrag(id INTEGER, name TEXT, erstellt TEXT, geaendert TEXT, project_id INTEGER)",
              "CREATE TABLE ws_nachweis(id INTEGER, name TEXT, erstellt TEXT, geaendert TEXT, project_id INTEGER)"):
        c.execute(t)
    c.executemany("INSERT INTO gantt_projects VALUES(?,?,?,?,?,7)", [("g1", "Startversion", "2026-11-01", "2026-11-01", "{}"), ("g2", "test", "2026-11-10", "2026-11-12", "{}"),
                                                                    ("g3", "alt", "2026-10-01", "2026-10-01", '{"archived": true}')])
    c.executemany("INSERT INTO ava_version VALUES(?,?,?,?,?,0,7)", [(1, "Ausschreibung", "a", "a", 1), (2, "nach Gespräch", "b", "b", 0)])
    c.execute("INSERT INTO bk_projects VALUES(5, 'Kostenschätzung', '2026-11-01', '2026-11-02', 0, 7)")
    return c


def test_versionen_wie_im_versionsmenue():
    c = db()
    S = MV.staende(c, 7)
    gleich([(x["name"], x["gilt"]) for x in S["termine"]], [("test", True), ("Startversion", False)], "Bauzeitenplan: neueste oben, ★ = neueste ohne Festlegung, ohne Archiviertes")
    gleich([(x["ref"], x["gilt"]) for x in S["ausschreibung"]], [("ava:2", False), ("ava:1", True)], "Ausschreibung: ★ = aktiv")
    gleich("bauantrag" in S, False, "ohne Anträge keine Kiste mit Versionen")


def test_uebernehmen_macht_gueltig():
    c = db()
    gleich(MV.gilt_setzen(c, 7, "gplan:g1"), True, "Plan aus dem Projekt")
    gleich([x["name"] for x in MV.staende(c, 7)["termine"] if x["gilt"]], ["Startversion"], "Startversion gilt jetzt")
    MV.gilt_setzen(c, 7, "ava:2")
    gleich([x["ref"] for x in MV.staende(c, 7)["ausschreibung"] if x["gilt"]], ["ava:2"], "Ausschreibung: nur eine aktiv")
    gleich((MV.gilt_setzen(c, 8, "gplan:g1"), MV.gilt_setzen(c, 7, "gantt:v3"), MV.gilt_setzen(c, 7, "bk:99")), (False, False, False), "fremdes Projekt, alte Kennung, unbekannt")
