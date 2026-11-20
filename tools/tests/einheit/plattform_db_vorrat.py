"""Verbindungsvorrat der Datenbank (bpcore/db.py, 20.11.2026): je Prozess wenige freie Verbindungen, lange unbenutzte werden geschlossen,
und ist die Datenbank gerade voll („too many clients“), wartet die App kurz statt mit Fehler 500 zu antworten."""
from bpcore import db
from lib import gleich, pruefe


class _C:
    closed = broken = False


class _Con:
    def __init__(self):
        self._c = _C()


def test_vorrat_begrenzt_und_altes_geht():
    alt = list(db._pool)
    db._pool[:] = []
    try:
        a, b, c, d = _Con(), _Con(), _Con(), _Con()
        gleich([db._zurueck(x, 1000.0) for x in (a, b, c)], [[], [], []], "bis zum Vorrat bleiben die Verbindungen frei liegen")
        gleich((db._zurueck(d, 1001.0), len(db._pool)), ([d], db.VORRAT), "Vorrat voll: die Verbindung wird geschlossen")
        zu = db._zurueck(d, 1000.0 + db.RUHE + 5)
        pruefe(set(map(id, zu)) == {id(a), id(b), id(c)} and db._pool == [d], "lange Unbenutzte werden geschlossen, die frische bleibt")
        e = _Con()
        e._c.broken = True
        gleich((db._zurueck(e, 1000.0 + db.RUHE + 6), db._pool), ([e], [d]), "kaputte Verbindung kommt nicht in den Vorrat")
    finally:
        db._pool[:] = alt


def test_volle_datenbank_wartet_kurz():
    class Voll(Exception):   # steht für psycopg.OperationalError (in dieser Prüfung ausgetauscht – läuft so auch ohne Datenbanktreiber)
        pass
    rufe, pausen = [], []
    alt = (db.psycopg.connect, db.time.sleep, db.psycopg.OperationalError, db.Con)
    db.psycopg.OperationalError, db.Con = Voll, (lambda x: x)

    def connect(dsn):
        rufe.append(1)
        if len(rufe) < 3:
            raise Voll("connection failed: FATAL:  sorry, too many clients already")
        return _C()
    db.psycopg.connect, db.time.sleep = connect, pausen.append
    try:
        con = db._neu()
        pruefe(con is not None and len(rufe) == 3 and len(pausen) == 2, f"zwei Mal gewartet, dann verbunden ({len(rufe)} Versuche)")
        rufe.clear()

        def weg(dsn):
            rufe.append(1)
            raise Voll("connection refused")
        db.psycopg.connect = weg
        try:
            db._neu()
            ok = False
        except Voll:
            ok = True
        pruefe(ok and len(rufe) == 1, "anderer Fehler (Datenbank nicht erreichbar): sofort weiterreichen")
    finally:
        db.psycopg.connect, db.time.sleep, db.psycopg.OperationalError, db.Con = alt
