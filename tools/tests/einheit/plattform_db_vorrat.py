"""Verbindungsvorrat der Datenbank (bpcore/db.py, 20.11.2026): je Prozess wenige freie Verbindungen, lange unbenutzte werden geschlossen,
Platz für alle gleichzeitig hat die Datenbank über max_connections in den Stack-Dateien."""
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
