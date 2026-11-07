"""Alte Versionen auf dem Projektserver finden und löschen.

Beim erneuten Export eines Berichts benennt die App das vorhandene PDF und den Fotoordner des Tages in „…_old1“, „…_old2“
um (siehe sync._rotate_old). Diese Kopien werden hier aufgelistet. Gelöscht wird nur, was in einer frischen Suche
wieder gefunden wird und dem Namensmuster entspricht – nie ein frei übergebener Pfad.
"""
import re
from . import db, remote, settings, sync

OLD = re.compile(r"^(?P<base>.+)_old(?P<n>\d+)(?P<ext>\.[^./\\]+)?$", re.I)


def _resolve(target, proj, rel, found):
    if "{projekt}" not in rel:
        return rel
    code = sync.code_of(proj)
    if code not in found:
        found[code] = "/".join(remote.find_project_path(target, code, remote.clean(proj["name"]) or "Projekt"))
    return rel.replace("{projekt}", found[code])


def project_ids(scope, current=None):
    """Projekte je Auswahl: 'one' (aktuelles), 'active', 'archived', 'all'."""
    with db.tx() as c:
        if scope == "one":
            return [current] if current else []
        w = {"active": "WHERE archived=0", "archived": "WHERE archived=1"}.get(scope, "")
        return [r["id"] for r in c.execute(f"SELECT id FROM projects {w} ORDER BY name")]


def scan_many(ids):
    """Alte Versionen mehrerer Projekte (eine Verbindung). Projekte ohne Ordner/Treffer liefern einfach nichts."""
    items, target, errors = [], None, 0
    for pid in ids:
        try:
            found, proj, target = scan(pid, target)
        except ValueError:
            if not target:
                raise
            errors += 1; continue
        for i in found:
            i.update(project_id=proj["id"], project=proj["name"], archived=proj["archived"])
        items += found
    return items, errors


def scan(project_id, target=None):
    """Liste der alten Versionen im Projektordner. Wirft ValueError, wenn die Ablage aus ist oder nicht erreichbar."""
    with db.tx() as c:
        conf = settings.all(c)
        proj = c.execute("SELECT * FROM projects WHERE id=?", (project_id,)).fetchone()
        dates = sorted({r["date"] for r in c.execute("SELECT date FROM reports WHERE project_id=?", (project_id,)) if r["date"]})
    if not proj:
        raise ValueError("Projekt nicht gefunden.")
    if not sync.enabled(conf):
        raise ValueError("Die Ablage auf dem Server ist nicht eingeschaltet (Einstellungen → Ablage).")
    if target is None:
        try:
            target = remote.open_target(conf)
        except Exception as e:
            raise ValueError(f"Ablage nicht erreichbar: {e}")
    found, pdf_dirs, photo_parents = {}, set(), set()
    for d in dates or [""]:
        pd = _resolve(target, proj, sync.render(conf.get("store_tpl_pdf") or sync.DEFAULT_PDF, proj, d or "0000-00", late=True), found)
        ph = _resolve(target, proj, sync.render(conf.get("store_tpl_photos") or sync.DEFAULT_PHOTOS, proj, d or "0000-00", late=True), found)
        pdf_dirs.add(pd)
        photo_parents.add("/".join(ph.split("/")[:-1]))
    out = []
    try:
        for d in sorted(pdf_dirs):
            for e in target.listdir(d):
                m = OLD.match(e["name"])
                if m and not e["dir"] and (m.group("ext") or "").lower() == ".pdf":
                    out.append({"kind": "pdf", "path": f"{d}/{e['name']}", "name": e["name"], "dir": d, "size": e["size"], "files": 1, "mtime": e["mtime"]})
        for d in sorted(photo_parents):
            for e in target.listdir(d):
                m = OLD.match(e["name"])
                if m and e["dir"] and not m.group("ext"):
                    n, b = target.tree(f"{d}/{e['name']}")
                    out.append({"kind": "photos", "path": f"{d}/{e['name']}", "name": e["name"], "dir": d, "size": b, "files": n, "mtime": e["mtime"]})
    except Exception as e:
        raise ValueError(f"Ablage nicht erreichbar: {e}")
    return out, proj, target


def delete(entries, user):
    """entries: [(project_id, path), …]. Je Projekt wird frisch gesucht; gelöscht wird nur, was dort wieder gefunden wird."""
    from . import audit
    ok, failed, target = [], [], None
    for pid in sorted({p for p, _ in entries}):
        items, proj, target = scan(pid, target)
        by = {i["path"]: i for i in items}
        for p in [x for q, x in entries if q == pid]:
            i = by.get(p)
            if not i:
                failed.append({"path": p, "error": "nicht (mehr) gefunden"})
                continue
            try:
                target.delete(i["path"], i["kind"] == "photos")
                ok.append({"project_id": pid, "path": p})
                audit.record(user, "export", "Alte Version auf dem Server gelöscht",
                             f"{i['path']}" + (f" ({i['files']} Dateien)" if i["kind"] == "photos" else ""), proj["id"], proj["name"])
            except Exception as e:   # Fehler geht in „failed“ an den Aufrufer zurück und wird angezeigt
                failed.append({"path": p, "error": str(e)[:200]})
    return ok, failed
