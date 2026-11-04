"""Gemeinsamer Datenbankzugriff der Plattform-Dienste (Portal, Verwaltung, Bauzeitenplan).

Gleiche Schnittstelle wie im Bautagebuch (core/db.py): `with db.tx() as c: c.execute(sql, params)` mit „?“-Platzhaltern.
Das Schema gehört dem Bautagebuch – es führt alle Migrationen aus (pg_migrations/), die anderen Dienste warten
beim Start, bis die benötigte Schemaversion vorhanden ist.
"""
import os, re, threading, time
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
_SUBS = [(re.compile(r"datetime\('now'\)"), lambda m: _NOW)]


def _sql(sql, has_params):
    for rx, fn in _SUBS:
        sql = rx.sub(fn, sql)
    return sql.replace("%", "%%").replace("?", "%s") if has_params else sql


class Cur:
    def __init__(self, cur):
        self._c = cur

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
        return Cur(cur)

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
        con = Con(psycopg.connect(DSN))
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
                try:
                    con.close()
                except Exception:
                    pass


def wait_for_schema(min_version, seconds=300, log=print):
    """Warten, bis die Datenbank erreichbar ist und das Bautagebuch die Migrationen bis `min_version` ausgeführt hat."""
    end, said = time.time() + seconds, False
    while True:
        try:
            with tx() as c:
                v = c.execute("SELECT COALESCE(MAX(version),0) FROM schema_migrations").fetchone()[0]
            if v >= min_version:
                return v
            msg = f"Warte auf Datenbankschema {min_version} (vorhanden: {v}) – das Bautagebuch richtet es ein …"
        except Exception as e:   # Datenbank noch nicht bereit oder Tabelle fehlt
            msg = f"Warte auf die Datenbank … ({str(e).splitlines()[0][:120]})"
        if not said:
            log(msg)
            said = True
        if time.time() > end:
            raise RuntimeError(msg)
        time.sleep(2)
