from flask import Blueprint, g, jsonify, request
from core import access, db, search

bp = Blueprint("search", __name__)


@bp.get("/api/search")
def do_search():
    q = request.args.get("q", "")[:200]
    pid = request.args.get("project_id", "")
    res = search.run(q, int(pid) if pid.isdigit() else None)
    with db.tx() as c:
        vis = access.visible_ids(c, g.user)
    if vis is not None:   # nur Projekte, die der Benutzer sehen darf
        res = [r for r in res if r.get("project_id") is None or r["project_id"] in vis]
    return jsonify(results=res, tokens=search.tokens(q), truncated=len(res) >= 150)
