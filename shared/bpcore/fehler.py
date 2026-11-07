"""Systemfehlermeldungen aller Apps (Server-Ausnahmen und Fehler im Browser) – für die Verwaltung (System → Fehlermeldungen).

Gleiche Fehler werden zusammengefasst (Anzahl, zuerst/zuletzt), höchstens 2000 Einträge. Die Tabelle legt sich selbst an.
"""
import hashlib
import json
import re
import traceback
from datetime import datetime

_ok = {"tabelle": False}


def _tabelle(c):
    if _ok["tabelle"]:
        return
    c.execute("""CREATE TABLE IF NOT EXISTS bp_fehler(id SERIAL PRIMARY KEY, schluessel TEXT UNIQUE NOT NULL, app TEXT NOT NULL DEFAULT '',
                 art TEXT NOT NULL DEFAULT 'server', meldung TEXT NOT NULL DEFAULT '', stack TEXT NOT NULL DEFAULT '', pfad TEXT NOT NULL DEFAULT '',
                 user_name TEXT NOT NULL DEFAULT '', browser TEXT NOT NULL DEFAULT '', anzahl INTEGER NOT NULL DEFAULT 1,
                 zuerst TEXT NOT NULL DEFAULT '', zuletzt TEXT NOT NULL DEFAULT '', gelesen INTEGER NOT NULL DEFAULT 0)""")
    _ok["tabelle"] = True


def _jetzt():
    return datetime.now().isoformat(timespec="seconds")


def melden(app, art, meldung, stack="", pfad="", user_name="", browser=""):
    """Einen Fehler festhalten – darf selbst nie scheitern."""
    try:
        from . import db
        meldung = str(meldung or "")[:1000]
        stack = str(stack or "")[:8000]
        kern = re.sub(r"\d+", "#", meldung)[:300] + "|" + "|".join(re.findall(r'File "[^"]+", line \d+|at [^\n]{0,120}', stack)[-2:])
        key = hashlib.sha1(f"{app}|{art}|{kern}".encode()).hexdigest()
        jetzt = _jetzt()
        with db.tx() as c:
            _tabelle(c)
            c.execute("""INSERT INTO bp_fehler(schluessel, app, art, meldung, stack, pfad, user_name, browser, zuerst, zuletzt)
                         VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT (schluessel) DO UPDATE SET anzahl=bp_fehler.anzahl+1, zuletzt=EXCLUDED.zuletzt, meldung=EXCLUDED.meldung,
                         pfad=EXCLUDED.pfad, user_name=EXCLUDED.user_name, stack=EXCLUDED.stack, browser=EXCLUDED.browser, gelesen=0""",
                      (key, str(app or "")[:40], art, meldung, stack, str(pfad or "")[:300], str(user_name or "")[:120], str(browser or "")[:300], jetzt, jetzt))
            c.execute("DELETE FROM bp_fehler WHERE id IN (SELECT id FROM bp_fehler ORDER BY zuletzt DESC OFFSET 2000)")
    except Exception:
        pass


def ausnahme(app, e, pfad="", user_name=""):
    melden(app, "server", f"{type(e).__name__}: {e}", "".join(traceback.format_exception(type(e), e, e.__traceback__)), pfad, user_name)


def liste(c, n=500):
    _tabelle(c)
    return [r.dict() for r in c.execute("SELECT * FROM bp_fehler ORDER BY zuletzt DESC LIMIT ?", (int(n),)).fetchall()]


def ungelesen(c):
    _tabelle(c)
    r = c.execute("SELECT COUNT(*) AS n FROM bp_fehler WHERE gelesen=0").fetchone()
    return r["n"] if r else 0


def aktion(c, b):
    _tabelle(c)
    if b.get("leeren"):
        c.execute("DELETE FROM bp_fehler")
    elif b.get("gelesen"):
        c.execute("UPDATE bp_fehler SET gelesen=1")
    elif isinstance(b.get("weg"), int):
        c.execute("DELETE FROM bp_fehler WHERE id=?", (b["weg"],))
    return json.dumps({"ok": True})
