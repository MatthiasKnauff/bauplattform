from datetime import date
from flask import Blueprint, g, jsonify, request
from core import db, storage

bp = Blueprint("reports", __name__)
LOCKED = ("project_id",)


@bp.get("/api/projects/<int:p>/reports")
def list_reports(p):
    with db.tx() as c:
        reps = [db.to_dict(r) for r in c.execute(
            "SELECT * FROM reports WHERE project_id=? ORDER BY date DESC, number DESC", (p,))]
        by = {r["id"]: r for r in reps}
        for r in reps:
            r["items"], r["images"] = [], []
        sub = "report_id IN (SELECT id FROM reports WHERE project_id=?)"
        for t in ("items", "images"):
            for row in c.execute(f"SELECT * FROM {t} WHERE {sub} ORDER BY id", (p,)):
                by[row["report_id"]][t].append(db.to_dict(row))
        return jsonify(reps)


@bp.post("/api/projects/<int:p>/reports")
def create_report(p):
    d = request.json or {}
    with db.tx() as c:
        n = c.execute("SELECT COALESCE(MAX(number),0)+1 FROM reports WHERE project_id=?", (p,)).fetchone()[0]
        last = c.execute("SELECT site_manager, plz FROM reports WHERE project_id=? ORDER BY date DESC, number DESC LIMIT 1", (p,)).fetchone()
        if g.user["name"].lower() != "admin":   # Bauleitung = angemeldeter Benutzer (änderbar, um Personen ergänzbar)
            d.setdefault("site_manager", g.user["name"])
        if last:  # sonst und für die PLZ: vom letzten Bericht vorbelegen
            d.setdefault("site_manager", last["site_manager"])
            d.setdefault("plz", last["plz"])
        d.setdefault("number", n)
        d.setdefault("date", date.today().isoformat())
        return jsonify(id=db.insert(c, "reports", d, forced={"project_id": p}))


@bp.put("/api/reports/<int:i>")
def update_report(i):
    with db.tx() as c:
        db.update(c, "reports", i, request.json, protected=LOCKED)
    return jsonify(ok=True)


@bp.delete("/api/reports/<int:i>")
def delete_report(i):
    with db.tx() as c:
        files = db.image_files(c, "report_id=?", (i,))
        c.execute("DELETE FROM reports WHERE id=?", (i,))
    storage.drop(files)
    return jsonify(ok=True)
