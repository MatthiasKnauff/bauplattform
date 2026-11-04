"""Anwesende laut Bauzeitenplan: Vorschläge im Bericht, Entscheidung des Bauleiters (war nicht da / nicht erforderlich)."""
from flask import Blueprint, g, jsonify, request
from core import db
from bpcore import plan

bp = Blueprint("soll", __name__)
STATUS = ("fehlt", "nein", "da", "offen")


@bp.get("/api/reports/<int:r>/soll")
def soll(r):
    with db.tx() as c:
        rep = c.execute("SELECT id, project_id, date FROM reports WHERE id=?", (r,)).fetchone()
        if not rep:
            return jsonify(error="Bericht nicht gefunden"), 404
        try:
            pl = plan.plans(c, rep["project_id"])
        except Exception:   # Bauzeitenplan-Tabelle fehlt (Bautagebuch ohne Bauplattform)
            return jsonify(firmen=[], plaene=[])
        if not pl:
            return jsonify(firmen=[], plaene=[])
        return jsonify(firmen=plan.soll_ist(c, r, rep["project_id"], rep["date"], plan_list=pl), plaene=[n for n, _ in pl])


@bp.post("/api/reports/<int:r>/soll")
def soll_set(r):
    d = request.json or {}
    firma, st = str(d.get("firma") or "").strip().lower()[:200], d.get("status")
    if not firma or st not in STATUS:
        return jsonify(error="Ungültige Angabe"), 400
    with db.tx() as c:
        if not c.execute("SELECT 1 FROM reports WHERE id=?", (r,)).fetchone():
            return jsonify(error="Bericht nicht gefunden"), 404
        c.execute("DELETE FROM soll_anwesend WHERE report_id=? AND firma=?", (r, firma))
        if st != "offen":
            c.execute("INSERT INTO soll_anwesend(report_id, firma, status, notiz, geaendert, geaendert_von) VALUES(?,?,?,?,?,?)",
                      (r, firma, st, str(d.get("notiz") or "")[:500], db.now(), g.user["name"]))
    return jsonify(ok=True)
