"""Pläne im Projektordner auf dem Server (für die App „Planstand & Versand“ der Bauplattform).

GET /api/plaene/dateien?project_id=&ordner=   Plan- und CAD-Dateien im Projektordner (rekursiv), Vorschläge für den Planordner
GET /api/plaene/datei?project_id=&pfad=       eine Datei (zum Ansehen und als Mail-Anhang)
Pfade sind relativ zum Projektordner; „..“ und Laufwerksangaben werden verworfen.
"""
import io, mimetypes, re, time
from flask import Blueprint, g, jsonify, request, send_file
from core import access, db, remote, settings, sync

bp = Blueprint("plaene", __name__)
EXT = {".pdf", ".dwg", ".dxf", ".dwf", ".pln", ".plt", ".ifc"}
PLAN_DIR = re.compile(r"plan|pläne|plaene|zeichnung|cad|dwg|werkpl|entwurf|genehmigung|ausf", re.I)
SKIP_DIR = re.compile(r"foto|photo|bild|bautagebuch|_old|papierkorb|\$recycle|^\.|^~", re.I)
MAX_FILES, MAX_SEC = 5000, 40


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


def _walk(t, base, rel, depth, out, t0, skip=True):
    if depth < 0 or len(out) >= MAX_FILES or time.time() - t0 > MAX_SEC:
        return
    for e in sorted(t.listdir("/".join(base + rel)), key=lambda x: x["name"].lower()):
        if e["dir"]:
            if not (skip and SKIP_DIR.search(e["name"])):
                _walk(t, base, rel + [e["name"]], depth - 1, out, t0, skip)
        else:
            n = e["name"]
            ext = ("." + n.rsplit(".", 1)[-1].lower()) if "." in n else ""
            if ext in EXT and not n.startswith("~$"):
                out.append({"pfad": "/".join(rel + [n]), "name": n, "ordner": "/".join(rel), "groesse": e["size"], "mtime": e["mtime"]})


@bp.get("/api/plaene/dateien")
def dateien():
    pid = request.args.get("project_id", type=int)
    t, base, err = _ziel(pid)
    if err:
        return jsonify(error=err), 400
    try:
        top = sorted(e["name"] for e in t.listdir("/".join(base)) if e["dir"])
    except Exception as e:
        return jsonify(error=sync._msg(e)), 502
    if not top and not t.exists("/".join(base)):
        return jsonify(error=f"Projektordner „{'/'.join(base)}“ nicht gefunden – im Bautagebuch beim Projekt den Ordner eintragen."), 404
    want = remote.clean_path(request.args.get("ordner") or "")
    out, t0 = [], time.time()
    try:
        if want:
            _walk(t, base, want, 7, out, t0, skip=False)
        else:
            plan_dirs = [d for d in top if PLAN_DIR.search(d) and not SKIP_DIR.search(d)]
            if plan_dirs:
                for d in plan_dirs:
                    _walk(t, base, [d], 7, out, t0)
            else:
                _walk(t, base, [], 5, out, t0)
    except Exception as e:
        return jsonify(error=sync._msg(e)), 502
    return jsonify(basis="/".join(base), ordner="/".join(want), oberordner=top, dateien=out,
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
