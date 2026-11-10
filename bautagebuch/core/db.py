"""Datenbank des Bautagebuchs: die gemeinsame Hülle des Kerns (bpcore.db) plus die Helfer, die nur das Bautagebuch braucht.

Verbindungen und Transaktionen kommen aus bpcore.db, Schema und Migrationen aus bpcore.schema – hier bleiben nur die
generischen Helfer für die Tabellen des Bautagebuchs (insert/update mit „extra“, Spaltenliste).
Der Rest der App nutzt weiter `with db.tx() as c: c.execute(sql, params)` mit „?“-Platzhaltern.
"""
import json
from datetime import datetime

from bpcore.db import DSN, IntegrityError, Row, Cur, Con, connect, tx   # noqa: F401 – eine Hülle für alle Apps
from bpcore.schema import DATA, dump, known_versions, migrate, schema_version, warte_auf_schema   # noqa: F401 – durchgereicht

PROTECTED = ("id", "created", "updated")


def now():
    return datetime.now().isoformat(timespec="seconds")


# ---------- Generische Helfer: neue Spalten werden automatisch unterstützt ----------
_cols = {}


def cols(con, table):
    if table not in _cols:
        _cols[table] = [r[0] for r in con.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=? ORDER BY ordinal_position", (table,))]
    return _cols[table]


def to_dict(row):
    d = dict(zip(row.keys(), row)) if isinstance(row, Row) else dict(row)
    if "extra" in d:
        try:
            d["extra"] = json.loads(d["extra"] or "{}")
        except ValueError:
            d["extra"] = {}
    return d


def _filter(con, table, data, protected):
    allowed = set(cols(con, table)) - set(protected) - set(PROTECTED)
    out = {}
    for k, v in (data or {}).items():
        if k in allowed:
            out[k] = json.dumps(v) if isinstance(v, (dict, list)) and k != "extra" else v
    return out


def insert(con, table, data, forced=None, protected=()):
    forced = forced or {}
    vals = _filter(con, table, data, tuple(protected) + tuple(forced))
    if "extra" in vals:
        vals["extra"] = json.dumps(vals["extra"] if isinstance(vals["extra"], dict) else {})
    vals.update(forced)
    if "created" in cols(con, table):
        vals["created"] = now()
    if not vals:
        return con.execute(f"INSERT INTO {table} DEFAULT VALUES RETURNING id").fetchone()[0]
    return con.execute(f"INSERT INTO {table}({','.join(vals)}) VALUES({','.join('?' * len(vals))}) RETURNING id",
                       list(vals.values())).fetchone()[0]


def update(con, table, row_id, data, protected=()):
    vals = _filter(con, table, data, protected)
    if "extra" in vals:  # Zusatzdaten werden zusammengeführt, null löscht einen Schlüssel
        old = con.execute(f"SELECT extra FROM {table} WHERE id=?", (row_id,)).fetchone()
        merged = json.loads(old[0] or "{}") if old else {}
        merged.update(vals["extra"] if isinstance(vals["extra"], dict) else {})
        vals["extra"] = json.dumps({k: v for k, v in merged.items() if v is not None})
    if not vals:
        return
    if "updated" in cols(con, table):
        vals["updated"] = now()
    con.execute(f"UPDATE {table} SET {','.join(k + '=?' for k in vals)} WHERE id=?", list(vals.values()) + [row_id])


def image_files(con, where, args=()):
    return [r["file"] for r in con.execute(f"SELECT file FROM images WHERE {where}", args)]
