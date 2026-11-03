from flask import Blueprint, g, jsonify, request
from core import audit, cleanup, db

bp = Blueprint("audit", __name__)   # nur Administrator (siehe app.admin_only)


@bp.get("/api/audit")
def list_log():
    a = request.args
    where, args = [], []
    if a.get("cat") in ("inhalt", "export", "konto"):
        where.append("cat=?"); args.append(a["cat"])
    if a.get("project_id", "").isdigit():
        where.append("project_id=?"); args.append(int(a["project_id"]))
    if a.get("user"):
        where.append("user_name=?"); args.append(a["user"])
    if a.get("q"):
        where.append("(action||' '||detail||' '||project||' '||report||' '||user_name) ILIKE ?"); args.append("%" + a["q"].strip() + "%")
    if a.get("before", "").isdigit():
        where.append("id<?"); args.append(int(a["before"]))
    w = (" WHERE " + " AND ".join(where)) if where else ""
    with db.tx() as c:
        rows = [dict(r) for r in c.execute(f"SELECT * FROM audit_log{w} ORDER BY id DESC LIMIT 100", args)]
        users = [r[0] for r in c.execute("SELECT DISTINCT user_name FROM audit_log WHERE user_name!='' ORDER BY 1")]
    return jsonify(rows=rows, users=users, more=len(rows) == 100)


@bp.get("/api/audit/cleanup")
def scan():
    scope = request.args.get("scope", "one")
    cur = request.args.get("project_id", "")
    ids = cleanup.project_ids(scope if scope in ("one", "active", "archived", "all") else "one", int(cur) if cur.isdigit() else None)
    if not ids:
        return jsonify(error="Kein Projekt gewählt."), 400
    try:
        items, errors = cleanup.scan_many(ids)
    except ValueError as e:
        return jsonify(error=str(e)), 400
    items.sort(key=lambda i: (i["project"].lower(), i["kind"], i["path"]))
    return jsonify(items=items, projects=len(ids), errors=errors)


@bp.post("/api/audit/cleanup")
def clean():
    d = request.get_json(silent=True) or {}
    entries = [(int(e["project_id"]), e["path"]) for e in d.get("entries") or []
               if isinstance(e, dict) and str(e.get("project_id", "")).isdigit() and isinstance(e.get("path"), str)]
    if not entries:
        return jsonify(error="Nichts ausgewählt."), 400
    try:
        ok, failed = cleanup.delete(entries, g.user["name"])
    except ValueError as e:
        return jsonify(error=str(e)), 400
    return jsonify(deleted=ok, failed=failed)
