"""Das Datenbankschema der Plattform: nummerierte Migrationen (migrationen/0001_….sql) und ihr Einspielen.

Regeln: Migrationen sind nur additiv und werden nach dem Ausliefern nie mehr geändert. Vor jeder Migration wird automatisch
gesichert (pg_dump). Eingespielt wird vom Container „dienste“ (migrate); die Apps warten nur (warte_auf_schema bzw.
bpcore.db.wait_for_schema). Bis Schritt 5 des Umbaus lag das im Bautagebuch (core/db.py, pg_migrations/).
"""
import glob, os, subprocess, time
from datetime import datetime

import psycopg

from . import db

DSN = db.DSN
DATA = os.environ.get("DATA_DIR", "data")
MIGRATIONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "migrationen")
LOCK_ID = 727274


def wait_for_db(seconds=90):
    end = time.time() + seconds
    while True:
        try:
            db.connect().close()
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


def dump_tabellen(path, muster):
    """Nur einzelne Tabellen sichern (z. B. das Wiki: muster „wiki_*“) – wiederherstellbar mit pg_restore in jede Datenbank."""
    r = subprocess.run(["pg_dump", "-Fc", "--no-owner", "-t", muster, "-f", path, DSN], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError("pg_dump: " + (r.stderr or "").strip()[:300])


def _backup(tag):
    d = os.path.join(DATA, "backups")
    os.makedirs(d, exist_ok=True)
    dump(os.path.join(d, f"bau-{datetime.now():%Y%m%d-%H%M%S}-vor-{tag}.dump"))
    for old in sorted(glob.glob(os.path.join(d, "bau-*-vor-*.dump")))[:-10]:  # die letzten 10 Sicherungen vor Migrationen behalten
        os.remove(old)


def known_versions():
    return {int(os.path.basename(f)[:4]): f for f in glob.glob(os.path.join(MIGRATIONS, "[0-9][0-9][0-9][0-9]_*.sql"))}


def warte_auf_schema(seconds=180):
    """Für Apps, die die Datenbank nicht selbst einrichten (das macht der Container „dienste“): warten, bis das Schema
    mindestens so neu ist, wie diese App es braucht."""
    wait_for_db()
    soll, ende = max(known_versions(), default=0), time.time() + seconds
    while True:
        try:
            with psycopg.connect(DSN, autocommit=True) as raw:
                ist = raw.execute("SELECT COALESCE(MAX(version), 0) FROM schema_migrations").fetchone()[0]
        except psycopg.Error:
            ist = -1   # Tabelle gibt es noch nicht – die Dienste sind noch nicht so weit
        if ist >= soll:
            return
        if time.time() > ende:
            raise RuntimeError(f"Die Datenbank ist nicht eingerichtet (Schema {ist}, gebraucht wird {soll}) – läuft der Container „dienste“?")
        time.sleep(2)


def migrate():
    os.makedirs(DATA, exist_ok=True)
    wait_for_db()
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
        except Exception:   # Sperre endet ohnehin mit dem Schließen der Verbindung
            pass
        raw.close()


def _now_utc():
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


def schema_version(con):
    return con.execute("SELECT COALESCE(MAX(version),0) FROM schema_migrations").fetchone()[0]
