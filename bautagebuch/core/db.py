"""Datenbank des Bautagebuchs: die gemeinsame Hülle des Kerns (bpcore.db) plus die Helfer, die nur das Bautagebuch braucht.

Verbindungen, Transaktionen und die Tabellen-Helfer (insert/update mit „extra“, Spaltenliste) kommen aus bpcore.db, Schema und
Migrationen aus bpcore.schema – alles nur durchgereicht, damit der Code des Bautagebuchs seine gewohnten Namen behält.
Der Rest der App nutzt weiter `with db.tx() as c: c.execute(sql, params)` mit „?“-Platzhaltern.
"""
from bpcore.db import DSN, IntegrityError, PROTECTED, Row, Cur, Con, _cols, cols, connect, insert, now, to_dict, tx, update   # noqa: F401 – eine Hülle für alle Apps
from bpcore.schema import DATA, dump, known_versions, migrate, schema_version, warte_auf_schema   # noqa: F401 – durchgereicht

def image_files(con, where, args=()):
    return [r["file"] for r in con.execute(f"SELECT file FROM images WHERE {where}", args)]
