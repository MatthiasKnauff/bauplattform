"""Gültige Version je Projekt und Modul („★ gilt“).

Bauzeitenplan und Baukosten führen Versionen als eigene Pläne bzw. Kostenermittlungen desselben Projekts.
Welche davon gilt – für Bautagebuch (Soll-Anwesenheit), Erinnerungen, To-dos, Kostenkontrolle –, steht hier
(bp_store „gueltig:<modul>:<projekt>“). Wechselt nur ausdrücklich („Als gültig setzen“), nicht beim Öffnen.
Ohne Festlegung gilt die neueste nicht archivierte Version. (Die AVA hat dafür ava_version.aktiv.)
"""
import json
from datetime import datetime

MODULE = ("gantt", "bk")


def _key(modul, pid):
    return f"gueltig:{modul}:{pid}"


def lesen(c, modul, pid):
    if pid is None:
        return None
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (_key(modul, pid),)).fetchone()
    if not r:
        return None
    try:
        v = json.loads(r["data"]) if isinstance(r["data"], str) else r["data"]
    except ValueError:
        return None
    return (v or {}).get("id") if isinstance(v, dict) else v


def setzen(c, modul, pid, vid, by=""):
    c.execute("""INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?)
                 ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by""",
              (_key(modul, pid), json.dumps({"id": vid}), datetime.now().isoformat(timespec="seconds"), by))


def waehlen(kandidaten, gid):
    """kandidaten: [(id, erstellt, archiviert)] → id der gültigen Version (festgelegt, sonst die neueste nicht archivierte)."""
    offen = [k for k in kandidaten if not k[2]]
    if not offen:
        return None
    for k in offen:
        if str(k[0]) == str(gid):
            return k[0]
    return max(offen, key=lambda k: (str(k[1] or ""), str(k[0])))[0]
