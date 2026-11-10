"""Datenbankzugriff aller Apps – die eine Hülle über PostgreSQL (auch das Bautagebuch benutzt sie, core/db.py reicht sie durch).

`with db.tx() as c: c.execute(sql, params)` mit „?“-Platzhaltern. Das Schema gehört dem Kern (bpcore/migrationen/, eingerichtet vom
Container „dienste“ über bpcore.schema.migrate); die Apps warten beim Start, bis die benötigte Schemaversion vorhanden ist.
"""
import json, os, re, threading, time
from contextlib import contextmanager
from datetime import datetime, timezone

import psycopg

DSN = os.environ.get("DATABASE_URL", "postgresql://bautagebuch:bautagebuch@bautagebuch_db:5432/bautagebuch")
IntegrityError = psycopg.IntegrityError


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class Row:
    __slots__ = ("_k", "_v")

    def __init__(self, keys, values):
        self._k, self._v = keys, values

    def __getitem__(self, i):
        return self._v[i] if isinstance(i, (int, slice)) else self._v[self._k.index(i)]

    def keys(self):
        return list(self._k)

    def __iter__(self):
        return iter(self._v)

    def __len__(self):
        return len(self._v)

    def get(self, k, default=None):
        return self._v[self._k.index(k)] if k in self._k else default

    def dict(self):
        return dict(zip(self._k, self._v))


_NOW = "to_char(timezone('UTC', now()), 'YYYY-MM-DD HH24:MI:SS')"
_SUBS = [   # ein paar Schreibweisen aus der SQLite-Zeit des Bautagebuchs, für PostgreSQL übersetzt
    (re.compile(r"datetime\('now'\s*,\s*'(-?\d+) days'\)"), lambda m: f"to_char(timezone('UTC', now()) + interval '{m.group(1)} days', 'YYYY-MM-DD HH24:MI:SS')"),
    (re.compile(r"datetime\('now'\)"), lambda m: _NOW),
    (re.compile(r"json_extract\(\s*([\w.]+)\s*,\s*'\$\.(\w+)'\s*\)"),
     lambda m: f"(({m.group(1)})::json ->> '{m.group(2)}')" + ("::bigint" if m.group(2).endswith("_id") else "")),
    (re.compile(r"\s+COLLATE\s+NOCASE", re.I), lambda m: ""),   # Namen sind in der Datenbank vom Typ citext (Groß-/Kleinschreibung egal)
]


def _sql(sql, has_params):
    for rx, fn in _SUBS:
        sql = rx.sub(fn, sql)
    return sql.replace("%", "%%").replace("?", "%s") if has_params else sql


class Cur:
    def __init__(self, cur, con=None):
        self._c, self._con = cur, con

    @property
    def lastrowid(self):   # ID des zuletzt eingefügten Datensatzes (Sequenz dieser Sitzung)
        return self._con._c.execute("SELECT lastval()").fetchone()[0]

    def _row(self, v):
        return Row([d.name for d in self._c.description], v) if v is not None else None

    def fetchone(self):
        return self._row(self._c.fetchone()) if self._c.description else None

    def fetchall(self):
        if not self._c.description:
            return []
        keys = [d.name for d in self._c.description]
        return [Row(keys, v) for v in self._c.fetchall()]

    def __iter__(self):
        return iter(self.fetchall())

    @property
    def rowcount(self):
        return self._c.rowcount


class Con:
    def __init__(self, raw):
        self._c = raw

    def execute(self, sql, params=()):
        cur = self._c.cursor()
        cur.execute(_sql(sql, bool(params)), tuple(params) if params else None)
        return Cur(cur, self)

    def copy_rows(self, table, cols, rows):
        """Viele Zeilen auf einmal (COPY – um ein Vielfaches schneller als einzelne INSERTs)."""
        with self._c.cursor() as cur:
            with cur.copy(f"COPY {table} ({', '.join(cols)}) FROM STDIN") as cp:
                for r in rows:
                    cp.write_row(tuple(r))

    @contextmanager
    def savepoint(self):
        self._c.execute("SAVEPOINT sp")
        try:
            yield
            self._c.execute("RELEASE SAVEPOINT sp")
        except Exception:
            self._c.execute("ROLLBACK TO SAVEPOINT sp")
            raise

    def commit(self):
        self._c.commit()

    def rollback(self):
        self._c.rollback()

    def close(self):
        self._c.close()


def connect():
    """Neue, nicht gepoolte Verbindung (der Aufrufer schließt sie)."""
    return Con(psycopg.connect(DSN))


_pool, _plock = [], threading.Lock()


@contextmanager
def tx():
    """Eine Transaktion: bei Erfolg commit, bei Fehler rollback. Verbindungen werden wiederverwendet."""
    with _plock:
        con = _pool.pop() if _pool else None
    if con is not None and not con._c.closed and time.time() - getattr(con, "_used", 0) > 20:
        try:   # länger unbenutzt: prüfen, ob die Verbindung noch lebt (z. B. nach Neustart der Datenbank)
            con._c.execute("SELECT 1"); con._c.rollback()
        except Exception:   # Verbindung tot (z. B. Datenbank neu gestartet): schließen und neu verbinden
            try:
                con.close()
            except Exception:   # Schließen einer toten Verbindung – nichts mehr zu retten
                pass
            con = None
    if con is None or con._c.closed or getattr(con._c, "broken", False):
        con = Con(psycopg.connect(DSN))
    try:
        yield con
        con.commit()
    except Exception:
        try:
            con.rollback()
        except Exception:   # Rollback scheitert bei kaputter Verbindung – der eigentliche Fehler wird unten weitergereicht
            pass
        raise
    finally:
        try:
            if not con._c.closed:
                with _plock:
                    if len(_pool) < 8 and not getattr(con._c, "broken", False):
                        con._used = time.time()
                        _pool.append(con)
                        con = None
        finally:
            if con is not None:
                try:
                    con.close()
                except Exception:   # Aufräumen: Verbindung schließen – nichts mehr zu retten
                    pass


def wait_for_schema(min_version, seconds=300, log=print):
    """Warten, bis die Datenbank erreichbar ist und die Dienste die Migrationen bis `min_version` ausgeführt haben."""
    end, said = time.time() + seconds, False
    while True:
        try:
            with tx() as c:
                v = c.execute("SELECT COALESCE(MAX(version),0) FROM schema_migrations").fetchone()[0]
            if v >= min_version:
                return v
            msg = f"Warte auf Datenbankschema {min_version} (vorhanden: {v}) – der Container „dienste“ richtet es ein …"
        except Exception as e:   # Datenbank noch nicht bereit oder Tabelle fehlt
            msg = f"Warte auf die Datenbank … ({str(e).splitlines()[0][:120]})"
        if not said:
            log(msg)
            said = True
        if time.time() > end:
            raise RuntimeError(msg)
        time.sleep(2)


PROTECTED = ("id", "created", "updated")


def now():
    """Ortszeit ohne Zeitzone (so stehen created/updated in den Tabellen, die das Bautagebuch angelegt hat)."""
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
