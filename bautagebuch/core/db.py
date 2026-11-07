"""Datenbank-Kern (PostgreSQL): Verbindungen, Migrationen, generische Helfer.

Regeln (siehe ARCHITECTURE.md): Migrationen sind nur additiv und werden nach dem Ausliefern nie mehr geändert.
Vor jeder Migration wird automatisch gesichert (pg_dump). Der Rest der App nutzt weiter `with db.tx() as c: c.execute(sql, params)`
mit „?“-Platzhaltern; die kleine Hülle unten übersetzt das für PostgreSQL.
"""
import glob, json, os, re, subprocess, threading, time
from contextlib import contextmanager
from datetime import datetime

import psycopg

DATA = os.environ.get("DATA_DIR", "data")
DSN = os.environ.get("DATABASE_URL", "postgresql://bautagebuch:bautagebuch@bautagebuch_db:5432/bautagebuch")
MIGRATIONS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pg_migrations")
PROTECTED = ("id", "created", "updated")
IntegrityError = psycopg.IntegrityError
LOCK_ID = 727274


def now():
    return datetime.now().isoformat(timespec="seconds")


# ---------- Hülle: sqlite-ähnliche Schnittstelle über psycopg ----------
class Row:
    """Zeile mit Zugriff über Name oder Position (wie sqlite3.Row)."""
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


_NOW = "to_char(timezone('UTC', now()), 'YYYY-MM-DD HH24:MI:SS')"
_SUBS = [
    (re.compile(r"datetime\('now'\s*,\s*'(-?\d+) days'\)"), lambda m: f"to_char(timezone('UTC', now()) + interval '{m.group(1)} days', 'YYYY-MM-DD HH24:MI:SS')"),
    (re.compile(r"datetime\('now'\)"), lambda m: _NOW),
    (re.compile(r"json_extract\(\s*([\w.]+)\s*,\s*'\$\.(\w+)'\s*\)"),
     lambda m: f"(({m.group(1)})::json ->> '{m.group(2)}')" + ("::bigint" if m.group(2).endswith("_id") else "")),
    (re.compile(r"\s+COLLATE\s+NOCASE", re.I), lambda m: ""),   # Namen sind in der Datenbank vom Typ citext (Groß-/Kleinschreibung egal)
]


def _sql(sql, has_params):
    for rx, fn in _SUBS:
        sql = rx.sub(fn, sql)
    if has_params:
        return sql.replace("%", "%%").replace("?", "%s")
    return sql


class Cur:
    def __init__(self, cur, con):
        self._c, self._con = cur, con

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

    @property
    def lastrowid(self):   # ID des zuletzt eingefügten Datensatzes (Sequenz dieser Sitzung)
        return self._con._c.execute("SELECT lastval()").fetchone()[0]


class Con:
    def __init__(self, raw):
        self._c = raw

    def execute(self, sql, params=()):
        cur = self._c.cursor()
        cur.execute(_sql(sql, bool(params)), tuple(params) if params else None)
        return Cur(cur, self)

    @contextmanager
    def savepoint(self):
        """Fehler (z. B. doppelter Name) machen nur diesen Teil rückgängig, nicht die ganze Transaktion."""
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


def _open():
    raw = psycopg.connect(DSN)
    return Con(raw)


def connect():
    """Neue, nicht gepoolte Verbindung (der Aufrufer schließt sie)."""
    return _open()


_pool, _plock = [], threading.Lock()


@contextmanager
def tx():
    """Eine Transaktion: bei Erfolg commit, bei Fehler rollback. Verbindungen werden wiederverwendet."""
    with _plock:
        con = _pool.pop() if _pool else None
    if con is not None and not con._c.closed and time.time() - getattr(con, "_used", 0) > 20:
        try:   # länger unbenutzt: prüfen, ob die Verbindung noch lebt (z. B. nach Neustart der Datenbank)
            con._c.execute("SELECT 1"); con._c.rollback()
        except Exception:
            try:
                con.close()
            except Exception:
                pass
            con = None
    if con is None or con._c.closed or getattr(con._c, "broken", False):
        con = _open()
    try:
        yield con
        con.commit()
    except Exception:
        try:
            con.rollback()
        except Exception:
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
                try: con.close()
                except Exception: pass


# ---------- Migrationen ----------
def _wait_for_db(seconds=90):
    end = time.time() + seconds
    while True:
        try:
            _open().close()
            return
        except Exception:
            if time.time() > end:
                raise
            time.sleep(1.5)


def dump(path):
    """Datenbank mit pg_dump in eine Datei sichern (Custom-Format, komprimiert).
    Ohne die Suchtabelle der Baudaten (pdb_such/_neu): die wird im Hintergrund ausgetauscht – lief eine Sicherung genau dann,
    brach pg_dump ab („relation … does not exist“). Sie wird nach einer Wiederherstellung von selbst neu aufgebaut."""
    cmd = ["pg_dump", "-Fc", "--no-owner", "--exclude-table=pdb_such", "--exclude-table=pdb_such_neu", "-f", path, DSN]
    for versuch in range(3):   # zur Sicherheit: kurz warten und erneut versuchen (z. B. gleichzeitige Änderungen am Schema)
        r = subprocess.run(cmd, capture_output=True, text=True)
        if not r.returncode:
            return
        time.sleep(3)
    raise RuntimeError("pg_dump: " + (r.stderr or "").strip()[:300])


def _backup(tag):
    d = os.path.join(DATA, "backups")
    os.makedirs(d, exist_ok=True)
    dump(os.path.join(d, f"bau-{datetime.now():%Y%m%d-%H%M%S}-vor-{tag}.dump"))
    for old in sorted(glob.glob(os.path.join(d, "bau-*-vor-*.dump")))[:-10]:  # die letzten 10 Sicherungen vor Migrationen behalten
        os.remove(old)


def known_versions():
    return {int(os.path.basename(f)[:4]): f for f in glob.glob(os.path.join(MIGRATIONS, "[0-9][0-9][0-9][0-9]_*.sql"))}


def migrate():
    os.makedirs(DATA, exist_ok=True)
    _wait_for_db()
    known = known_versions()
    raw = psycopg.connect(DSN, autocommit=True)
    try:
        raw.execute("SELECT pg_advisory_lock(%s)", (LOCK_ID,))   # mehrere Worker starten nicht gleichzeitig
        raw.execute("CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, name TEXT, applied TEXT)")
        done = {r[0] for r in raw.execute("SELECT version FROM schema_migrations").fetchall()}
        if done and max(done) > max(known, default=0):
            raise RuntimeError(f"Die Datenbank (Schema {max(done)}) ist neuer als diese App "
                               f"(Schema {max(known, default=0)}). Bitte die App aktualisieren, nicht zurückstellen.")
        pending = sorted(v for v in known if v not in done)
        if not pending:
            return
        if done:
            _backup(f"v{pending[0]}")
        for v in pending:
            name = os.path.basename(known[v])
            sql = open(known[v], encoding="utf-8").read()
            raw.execute("BEGIN")   # DDL ist in PostgreSQL transaktional: ganz oder gar nicht
            try:
                raw.execute(sql)
                raw.execute("INSERT INTO schema_migrations(version,name,applied) VALUES(%s,%s,%s)", (v, name, _now_utc()))
                raw.execute("COMMIT")
            except Exception:
                raw.execute("ROLLBACK")
                raise
    finally:
        try:
            raw.execute("SELECT pg_advisory_unlock(%s)", (LOCK_ID,))
        except Exception:
            pass
        raw.close()


def _now_utc():
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


def schema_version(con):
    return con.execute("SELECT COALESCE(MAX(version),0) FROM schema_migrations").fetchone()[0]


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
