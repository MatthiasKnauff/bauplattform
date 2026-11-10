"""Wer ein Projekt sehen darf – eine Regel für alle Apps: Ist beim Projekt eine Liste zuständiger Bauleiter eingetragen,
sehen nur diese (und alle Administratoren) das Projekt. Leere Liste = alle Benutzer. Die Prüfung läuft auf dem Server."""
import json


def ids_of(raw):
    try:
        v = json.loads(raw or "[]")
    except ValueError:
        return []
    return [int(x) for x in v if str(x).isdigit()] if isinstance(v, list) else []


def clean(value, c):
    """Vom Browser gesendete Liste prüfen: nur vorhandene Benutzer, ohne Doppelte."""
    if not isinstance(value, list):
        return []
    known = {r["id"] for r in c.execute("SELECT id FROM users")}
    out = []
    for x in value:
        if str(x).isdigit() and int(x) in known and int(x) not in out:
            out.append(int(x))
    return out


def allowed(leaders, user):
    return bool(user["is_admin"]) or not leaders or user["id"] in leaders


def visible_ids(c, user):
    """None = alle Projekte sichtbar, sonst die Menge der sichtbaren Projekt-IDs."""
    if user["is_admin"]:
        return None
    return {r["id"] for r in c.execute("SELECT id, leaders FROM projects") if allowed(ids_of(r["leaders"]), user)}


def can_see(c, user, pid):
    if user["is_admin"] or pid is None:
        return True
    r = c.execute("SELECT leaders FROM projects WHERE id=?", (pid,)).fetchone()
    return True if not r else allowed(ids_of(r["leaders"]), user)
