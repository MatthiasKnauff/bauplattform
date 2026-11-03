from flask import Blueprint, jsonify, send_file
from core import backups

bp = Blueprint("backups", __name__)   # nur Administrator (siehe app.admin_only)


@bp.get("/api/backups")
def list_backups():
    return jsonify(items=backups.listing())


@bp.post("/api/backups")
def make_backup():
    return jsonify(name=backups.create("manuell"))


@bp.get("/api/backups/<name>/download")
def download(name):
    p = backups.path_of(name)
    if not p:
        return jsonify(error="Version nicht gefunden."), 404
    return send_file(p, as_attachment=True, download_name=name)


@bp.post("/api/backups/<name>/restore")
def restore(name):
    ok, msg = backups.restore(name)
    return (jsonify(ok=True, message=msg) if ok else (jsonify(error=msg), 400))


@bp.delete("/api/backups/<name>")
def delete(name):
    import os
    p = backups.path_of(name)
    if not p:
        return jsonify(error="Version nicht gefunden."), 404
    os.remove(p)
    return jsonify(ok=True)
