import json
from flask import Blueprint, g, jsonify
from core import db, versions

bp = Blueprint("versions", __name__)


@bp.get("/api/reports/<int:i>/versions")
def list_versions(i):
    with db.tx() as c:
        if not c.execute("SELECT 1 FROM reports WHERE id=?", (i,)).fetchone():
            return jsonify(error="Bericht nicht gefunden"), 404
        st, ex = versions.status(c, i)
        rows = [dict(r) for r in c.execute(
            "SELECT id, created, user_name, reason, pdf_name FROM report_versions WHERE report_id=? ORDER BY id DESC LIMIT 200", (i,))]
    return jsonify(status=st, last_export=ex, versions=rows)


@bp.get("/api/versions/<int:v>")
def get_version(v):
    with db.tx() as c:
        r = c.execute("SELECT id, report_id, created, user_name, reason, pdf_name, data FROM report_versions WHERE id=?", (v,)).fetchone()
    if not r:
        return jsonify(error="Version nicht gefunden"), 404
    d = dict(r)
    d["data"] = json.loads(d["data"])
    return jsonify(d)


@bp.post("/api/versions/<int:v>/restore")
def restore(v):
    with db.tx() as c:
        rid = versions.restore(c, v, g.user["name"])
    if rid is None:
        return jsonify(error="Version nicht gefunden"), 404
    return jsonify(ok=True, report_id=rid)
