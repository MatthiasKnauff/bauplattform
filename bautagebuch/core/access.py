"""Sichtbarkeit von Projekten im Bautagebuch: welcher Aufruf zu welchem Projekt gehört. Die Regel selbst (Bauleiter-Liste,
Administratoren sehen alles) liegt im Kern: bpcore.rechte."""
import re

_PATHS = (
    (re.compile(r"^/api/projects/(\d+)(?:/|$)"), "SELECT id FROM projects WHERE id=?"),
    (re.compile(r"^/api/reports/(\d+)(?:/|$)"), "SELECT project_id FROM reports WHERE id=?"),
    (re.compile(r"^/api/items/(\d+)(?:/|$)"), "SELECT r.project_id FROM items i JOIN reports r ON r.id=i.report_id WHERE i.id=?"),
    (re.compile(r"^/api/images/(\d+)(?:/|$)"), "SELECT r.project_id FROM images i JOIN reports r ON r.id=i.report_id WHERE i.id=?"),
    (re.compile(r"^/api/versions/(\d+)(?:/|$)"), "SELECT r.project_id FROM report_versions v JOIN reports r ON r.id=v.report_id WHERE v.id=?"),
)


from bpcore.rechte import allowed, can_see, clean, ids_of, visible_ids   # noqa: F401,E402 – die Regel selbst liegt im Kern


def project_of(c, path):
    for rx, sql in _PATHS:
        m = rx.match(path)
        if m:
            row = c.execute(sql, (int(m.group(1)),)).fetchone()
            return row[0] if row else None
    return None
