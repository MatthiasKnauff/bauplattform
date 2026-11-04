"""Pläne im Projektordner auf dem Server (für die App „Planstand & Versand“ der Bauplattform).

GET /api/plaene/dateien?project_id=&aus=[…]   Plan- und CAD-Dateien im ganzen Projektordner (rekursiv) und der Verzeichnisbaum
GET /api/plaene/datei?project_id=&pfad=       eine Datei (zum Ansehen und als Mail-Anhang)
Pfade sind relativ zum Projektordner; „..“ und Laufwerksangaben werden verworfen.
"""
import io, mimetypes, re, time
from flask import Blueprint, g, jsonify, request, send_file
from core import access, db, remote, settings, sync

bp = Blueprint("plaene", __name__)
EXT = {".pdf", ".dwg", ".dxf", ".dwf", ".pln", ".plt", ".ifc"}
PLAN_DIR = re.compile(r"plan|pläne|plaene|zeichnung|cad|dwg|werkpl|entwurf|genehmigung|ausf", re.I)
TOP_PLAN = re.compile(r"pl(ä|ae)ne|zeichnungen|\bcad\b", re.I)
SKIP_DIR = re.compile(r"foto|photo|bautagebuch|papierkorb|\$recycle", re.I)
MAX_FILES, MAX_SEC = 8000, 90


def _ziel(pid):
    with db.tx() as c:
        if not access.can_see(c, g.user, pid):
            return None, None, "Kein Zugriff auf dieses Projekt."
        conf = settings.all(c)
        p = c.execute("SELECT id, name, folder FROM projects WHERE id=?", (pid,)).fetchone()
    if not p:
        return None, None, "Projekt nicht gefunden."
    if not sync.enabled(conf):
        return None, None, "Die Ablage auf dem Server ist nicht eingerichtet (Verwaltung → Einstellungen → Ablage)."
    try:
        t = remote.open_target(conf)
    except ImportError:
        return None, None, "Das Paket für Windows-Freigaben (smbprotocol) fehlt im Container."
    except Exception as e:
        return None, None, sync._msg(e)
    parts = remote.clean_path(p["folder"] or "") or remote.find_project_path(t, sync.code_of(p), remote.clean(p["name"]) or "Projekt")
    return t, parts, ""


def _walk(t, base, rel, depth, out, dirs, aus, t0):
    """Alle Unterordner durchgehen (außer ausgeschlossenen); dirs sammelt den Verzeichnisbaum mit Zahl der Plan-/CAD-Dateien."""
    key = "/".join(rel)
    if rel:
        dirs[key] = {"pfad": key, "n": 0, "aus": key in aus}
        if key in aus:
            return
    if depth < 0 or len(out) >= MAX_FILES or time.time() - t0 > MAX_SEC:
        if rel:
            dirs[key]["abgebrochen"] = True
        return
    for e in sorted(t.listdir("/".join(base + rel)), key=lambda x: x["name"].lower()):
        if e["dir"]:
            if not e["name"].startswith((".", "~", "$")):
                _walk(t, base, rel + [e["name"]], depth - 1, out, dirs, aus, t0)
        else:
            n = e["name"]
            ext = ("." + n.rsplit(".", 1)[-1].lower()) if "." in n else ""
            if ext in EXT and not n.startswith("~$"):
                out.append({"pfad": "/".join(rel + [n]), "name": n, "ordner": key, "groesse": e["size"], "mtime": e["mtime"]})
                if rel:
                    dirs[key]["n"] += 1


@bp.get("/api/plaene/dateien")
def dateien():
    """Ganzen Projektordner durchsuchen. aus = JSON-Liste ausgeschlossener Ordner (relativ); fehlt sie, bleiben Foto- und
    Bautagebuch-Ordner außen vor (lassen sich im Verzeichnisbaum einschließen)."""
    import json
    pid = request.args.get("project_id", type=int)
    t, base, err = _ziel(pid)
    if err:
        return jsonify(error=err), 400
    if not t.exists("/".join(base)):
        return jsonify(error=f"Projektordner „{'/'.join(base)}“ nicht gefunden – im Bautagebuch beim Projekt den Ordner eintragen."), 404
    try:
        aus = json.loads(request.args.get("aus")) if request.args.get("aus") else None
    except ValueError:
        aus = None
    standard = aus is None
    aus = {"/".join(remote.clean_path(x)) for x in (aus or []) if isinstance(x, str)}
    out, dirs, t0 = [], {}, time.time()
    if standard:   # Vorgabe: nur der Planordner („A497 9. Pläne“) – gibt es keinen, alles außer Foto-/Bautagebuch-Ordnern
        top = [e["name"] for e in t.listdir("/".join(base)) if e["dir"]]
        plan = [d for d in top if TOP_PLAN.search(d)]
        aus |= {d for d in top if d not in plan} if plan else {d for d in top if SKIP_DIR.search(d)}
    try:
        _walk(t, base, [], 9, out, dirs, aus, t0)
    except Exception as e:
        return jsonify(error=sync._msg(e)), 502
    return jsonify(basis="/".join(base), aus=sorted(aus), standard=standard, ordner=list(dirs.values()), dateien=out,
                   abgebrochen=len(out) >= MAX_FILES or time.time() - t0 > MAX_SEC)


@bp.get("/api/plaene/datei")
def datei():
    pid = request.args.get("project_id", type=int)
    rel = remote.clean_path(request.args.get("pfad") or "")
    if not rel or ("." + rel[-1].rsplit(".", 1)[-1].lower()) not in EXT:
        return jsonify(error="Ungültige Datei"), 400
    t, base, err = _ziel(pid)
    if err:
        return jsonify(error=err), 400
    try:
        data = t.read("/".join(base + rel), 200 * 1024 * 1024)
    except Exception as e:
        return jsonify(error="Datei nicht lesbar: " + sync._msg(e)), 404
    mt = mimetypes.guess_type(rel[-1])[0] or "application/octet-stream"
    return send_file(io.BytesIO(data), mimetype=mt, download_name=rel[-1], as_attachment=request.args.get("dl") == "1")
