"""Sichtbarkeit von Projekten: Ist beim Projekt eine Liste zuständiger Bauleiter eingetragen, sehen nur diese
(und alle Administratoren) das Projekt. Leere Liste = alle Benutzer. Die Prüfung läuft auf dem Server."""
import json, re

_PATHS = (
    (re.compile(r"^/api/projects/(\d+)(?:/|$)"), "SELECT id FROM projects WHERE id=?"),
    (re.compile(r"^/api/reports/(\d+)(?:/|$)"), "SELECT project_id FROM reports WHERE id=?"),
    (re.compile(r"^/api/items/(\d+)(?:/|$)"), "SELECT r.project_id FROM items i JOIN reports r ON r.id=i.report_id WHERE i.id=?"),
    (re.compile(r"^/api/images/(\d+)(?:/|$)"), "SELECT r.project_id FROM images i JOIN reports r ON r.id=i.report_id WHERE i.id=?"),
    (re.compile(r"^/api/versions/(\d+)(?:/|$)"), "SELECT r.project_id FROM report_versions v JOIN reports r ON r.id=v.report_id WHERE v.id=?"),
)


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


def project_of(c, path):
    for rx, sql in _PATHS:
        m = rx.match(path)
        if m:
            row = c.execute(sql, (int(m.group(1)),)).fetchone()
            return row[0] if row else None
    return None


def can_see(c, user, pid):
    if user["is_admin"] or pid is None:
        return True
    r = c.execute("SELECT leaders FROM projects WHERE id=?", (pid,)).fetchone()
    return True if not r else allowed(ids_of(r["leaders"]), user)
