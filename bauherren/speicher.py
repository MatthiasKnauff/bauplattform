"""Datenbank des Bauherrenportals: SQLite unter /data (BH_DB). Nur freigegebene Kopien aus dem Büro und die Konten der Bauherr:innen.

Pakete kommen vom Kern (sync) und werden ersetzt, nie hier bearbeitet. Geht etwas verloren, schickt der Kern alles neu.
"""
import json, os, sqlite3, time
from contextlib import contextmanager

PFAD = os.environ.get("BH_DB") or os.path.join(os.environ.get("DATA_DIR", "/data"), "bauherren.db")


@contextmanager
def tx():
    os.makedirs(os.path.dirname(PFAD) or ".", exist_ok=True)
    c = sqlite3.connect(PFAD, timeout=20, isolation_level=None)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA foreign_keys=ON")
    c.execute("BEGIN IMMEDIATE")
    try:
        yield c
        c.execute("COMMIT")
    except BaseException:
        c.execute("ROLLBACK")
        raise
    finally:
        c.close()


def einrichten(c):
    for sql in """
    CREATE TABLE IF NOT EXISTS konto (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL DEFAULT '', pw TEXT NOT NULL DEFAULT '',
        totp TEXT NOT NULL DEFAULT '', totp_neu TEXT NOT NULL DEFAULT '', aktiv INTEGER NOT NULL DEFAULT 1, erstellt REAL NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS konto_projekt (konto INTEGER NOT NULL REFERENCES konto(id) ON DELETE CASCADE, pid TEXT NOT NULL, PRIMARY KEY (konto, pid));
    CREATE TABLE IF NOT EXISTS sitzung (hash TEXT PRIMARY KEY, konto INTEGER NOT NULL REFERENCES konto(id) ON DELETE CASCADE, ablauf REAL NOT NULL,
        geraet TEXT NOT NULL DEFAULT '', offen_code INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS einmal (hash TEXT PRIMARY KEY, konto INTEGER, zweck TEXT NOT NULL, ablauf REAL NOT NULL, geheim TEXT NOT NULL DEFAULT '',
        erlaubt INTEGER);
    CREATE TABLE IF NOT EXISTS projekt (pid TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS paket (id TEXT PRIMARY KEY, pid TEXT NOT NULL, art TEXT NOT NULL DEFAULT '', titel TEXT NOT NULL DEFAULT '',
        stand TEXT NOT NULL DEFAULT '', daten TEXT NOT NULL DEFAULT '{}', erhalten REAL NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS paket_pid ON paket (pid);
    CREATE TABLE IF NOT EXISTS eingang (id INTEGER PRIMARY KEY, art TEXT NOT NULL, pid TEXT NOT NULL DEFAULT '', daten TEXT NOT NULL DEFAULT '{}',
        konto INTEGER, zeit REAL NOT NULL, abgeholt REAL);
    """.split(";"):   # einzeln – executescript würde die laufende Transaktion beenden
        if sql.strip():
            c.execute(sql)


def _t(v, n):
    return str(v if v is not None else "").strip()[:n]


def sync(c, b):
    """Pakete ersetzen/löschen, Konten anlegen/ändern/sperren – vom Kern."""
    n = {"pakete": 0, "geloescht": 0, "konten": 0}
    jetzt = time.time()
    for p in (b.get("pakete") or [])[:500]:
        if not isinstance(p, dict) or not _t(p.get("id"), 120) or not _t(p.get("pid"), 40):
            continue
        pid = _t(p["pid"], 40)
        if p.get("projekt"):
            c.execute("INSERT INTO projekt(pid, name) VALUES(?,?) ON CONFLICT(pid) DO UPDATE SET name=excluded.name", (pid, _t(p["projekt"], 200)))
        daten = json.dumps(p.get("daten") if isinstance(p.get("daten"), (dict, list)) else {}, ensure_ascii=False)
        if len(daten) > 20_000_000:
            continue
        c.execute("INSERT INTO paket(id, pid, art, titel, stand, daten, erhalten) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET "
                  "pid=excluded.pid, art=excluded.art, titel=excluded.titel, stand=excluded.stand, daten=excluded.daten, erhalten=excluded.erhalten",
                  (_t(p["id"], 120), pid, _t(p.get("art"), 40), _t(p.get("titel"), 300), _t(p.get("stand"), 40), daten, jetzt))
        n["pakete"] += 1
    for i in (b.get("loeschen") or [])[:2000]:
        n["geloescht"] += c.execute("DELETE FROM paket WHERE id=?", (_t(i, 120),)).rowcount
    for k in (b.get("konten") or [])[:500]:
        mail = _t((k or {}).get("email"), 200).lower()
        if "@" not in mail:
            continue
        c.execute("INSERT INTO konto(email, name, aktiv, erstellt) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name, aktiv=excluded.aktiv",
                  (mail, _t(k.get("name"), 200), 1 if k.get("aktiv", True) else 0, jetzt))
        kid = c.execute("SELECT id FROM konto WHERE email=?", (mail,)).fetchone()["id"]
        c.execute("DELETE FROM konto_projekt WHERE konto=?", (kid,))
        for pid in (k.get("projekte") or [])[:200]:
            c.execute("INSERT OR IGNORE INTO konto_projekt(konto, pid) VALUES(?,?)", (kid, _t(pid, 40)))
        if not k.get("aktiv", True):
            c.execute("DELETE FROM sitzung WHERE konto=?", (kid,))   # gesperrt: sofort abgemeldet
        n["konten"] += 1
    return n


def eingang_neu(c, art, pid, daten, konto=None):
    c.execute("INSERT INTO eingang(art, pid, daten, konto, zeit) VALUES(?,?,?,?,?)", (art, pid or "", json.dumps(daten, ensure_ascii=False), konto, time.time()))


def eingang_offen(c):
    return [{"id": r["id"], "art": r["art"], "pid": r["pid"], "zeit": r["zeit"], "daten": json.loads(r["daten"] or "{}")}
            for r in c.execute("SELECT * FROM eingang WHERE abgeholt IS NULL ORDER BY id LIMIT 500").fetchall()]


def eingang_quittung(c, ids):
    jetzt = time.time()
    for i in ids:
        c.execute("UPDATE eingang SET abgeholt=? WHERE id=?", (jetzt, i))
    c.execute("DELETE FROM eingang WHERE abgeholt IS NOT NULL AND abgeholt<?", (jetzt - 30 * 86400,))   # nach 30 Tagen weg


def darf(c, kid, pid):
    return bool(c.execute("SELECT 1 FROM konto_projekt WHERE konto=? AND pid=?", (kid, pid)).fetchone())


def projekte(c, kid):
    out = []
    for r in c.execute("SELECT kp.pid, COALESCE(p.name,'') AS name FROM konto_projekt kp LEFT JOIN projekt p ON p.pid=kp.pid WHERE kp.konto=? ORDER BY p.name", (kid,)).fetchall():
        P = [{"id": x["id"], "art": x["art"], "titel": x["titel"], "stand": x["stand"]}
             for x in c.execute("SELECT id, art, titel, stand FROM paket WHERE pid=? ORDER BY stand DESC, titel", (r["pid"],)).fetchall()]
        out.append({"pid": r["pid"], "name": r["name"] or "Projekt", "pakete": P})
    return out


def paket(c, kid, pid, pk):
    if not darf(c, kid, pid):
        return None
    r = c.execute("SELECT * FROM paket WHERE id=? AND pid=?", (pk, pid)).fetchone()
    return {"id": r["id"], "art": r["art"], "titel": r["titel"], "stand": r["stand"], "daten": json.loads(r["daten"] or "{}")} if r else None
