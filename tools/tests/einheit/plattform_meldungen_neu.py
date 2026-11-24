"""Alle Benachrichtigungen auf einmal löschen (bpcore/meldungen.neu_beginnen, 24.11.2026): eigene Erinnerungen weg, die aus dem
Bauzeitenplan erledigt (sonst entstünden sie neu), Bautagebuch-Erinnerung aus (Frist bleibt), Glocke an Aufgaben weg, Kalendereinladungen
vergessen (ohne Absage-Mail), „Neu für dich“ weg – und ein Rückgängig bringt alles zurück."""
import sqlite3

from bpcore import meldungen
from lib import gleich, pruefe


def _db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.executescript("""CREATE TABLE bp_store(key TEXT PRIMARY KEY, data TEXT, updated TEXT, updated_by TEXT);
        CREATE TABLE erinnerungen(id INTEGER PRIMARY KEY, quelle TEXT, titel TEXT, termin TEXT, status TEXT, gesendet TEXT DEFAULT '', geaendert TEXT DEFAULT '');
        INSERT INTO erinnerungen(id, quelle, titel, termin, status) VALUES (1,'eigen','Statik nachfragen','2026-12-01','offen'), (2,'mail','Angebot','2026-11-02','erledigt'),
          (3,'plan','Firma kommt','2026-12-10','offen'), (4,'plan','alt','2026-10-01','erledigt');
        CREATE TABLE items(id INTEGER PRIMARY KEY, due TEXT, reminded TEXT, done INTEGER);
        INSERT INTO items VALUES (10,'2026-12-03','',0), (11,'2026-11-01','2026-11-01',0), (12,'',''  ,0), (13,'2026-12-05','',1);
        CREATE TABLE todo(id INTEGER PRIMARY KEY, erinnerung TEXT);
        INSERT INTO todo VALUES (20,'1t'), (21,'');
        INSERT INTO bp_store VALUES ('ical:termin:x1','{"termin":"2026-12-01"}','',''), ('ical:5:e7','{"seq":1}','',''), ('mail:aus','{}','','');
        CREATE TABLE zeit_abw_meldung(id INTEGER PRIMARY KEY, user_id INTEGER, ts TEXT, titel TEXT, text TEXT, von TEXT);
        INSERT INTO zeit_abw_meldung VALUES (30, 1, '2026-11-20', 'Urlaub', '', 'Anna');""")
    return c


def _stand(c):
    return ([tuple(r) for r in c.execute("SELECT id, status FROM erinnerungen ORDER BY id")], [tuple(r) for r in c.execute("SELECT id, reminded, due FROM items ORDER BY id")],
            [tuple(r) for r in c.execute("SELECT * FROM todo ORDER BY id")], [r["key"] for r in c.execute("SELECT key FROM bp_store WHERE key NOT LIKE 'meldungen:%' ORDER BY key")],
            c.execute("SELECT COUNT(*) FROM zeit_abw_meldung").fetchone()[0])


def test_neu_beginnen():
    alt = meldungen.darf_alle
    meldungen.darf_alle = lambda u: bool(u.get("admin"))
    try:
        c, chef = _db(), {"id": 1, "name": "Chef", "admin": True}
        try:
            meldungen.neu_beginnen(c, {"id": 2, "name": "Anna"})
            pruefe(False, "ohne Recht abgelehnt")
        except PermissionError:
            pass
        vorher = _stand(c)
        v = meldungen.neu_beginnen(c, chef, vorschau=True)["zahlen"]
        gleich((v["erinnerung"], v["plan"], v["bautagebuch"], v["aufgabe"], v["kalender"], v["neu_fuer_dich"]), (2, 1, 2, 1, 2, 1), "Vorschau zählt")
        gleich(_stand(c), vorher, "Vorschau ändert nichts")
        r = meldungen.neu_beginnen(c, chef)
        er, it, td, st, nf = _stand(c)
        gleich(er, [(3, "erledigt"), (4, "erledigt")], "eigene/aus Mails gelöscht, Bauzeitenplan erledigt")
        gleich(it, [(10, "aus", "2026-12-03"), (11, "aus", "2026-11-01"), (12, "", ""), (13, "", "2026-12-05")], "Bautagebuch: Erinnerung aus, Frist bleibt")
        gleich(td, [(20, ""), (21, "")], "Glocke an Aufgaben weg")
        gleich(st, ["mail:aus"], "Kalendereinladungen vergessen")
        gleich(nf, 0, "„Neu für dich“ weg")
        meldungen.neu_zurueck(c, chef, r["key"])
        gleich(_stand(c), vorher, "Rückgängig: alles wie vorher")
        pruefe(not c.execute("SELECT 1 FROM bp_store WHERE key LIKE 'meldungen:neu:%'").fetchone(), "alter Stand danach weg")
    finally:
        meldungen.darf_alle = alt
