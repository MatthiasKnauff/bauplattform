from datetime import date
from flask import Blueprint, g, jsonify, request
from core import access, db, storage

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


UNDO_MIN = 15   # so lange lässt sich ein gelöschter Bericht wiederherstellen; danach werden seine Fotos gelöscht
TABLES = ("items", "images", "soll_anwesend")


def _raw(c, sql, args):
    return [dict(zip(r.keys(), r)) for r in c.execute(sql, args).fetchall()]


def _purge(force_id=None):
    """Abgelaufene gelöschte Berichte endgültig entfernen (Fotos vom Datenträger)."""
    import json, time
    files = []
    with db.tx() as c:
        for r in c.execute("SELECT key, data FROM bp_store WHERE key LIKE 'papierkorb:bericht:%'").fetchall():
            try:
                d = json.loads(r["data"])
            except ValueError:
                d = {}
            if force_id is not None and r["key"] != f"papierkorb:bericht:{force_id}" and d.get("bis", 0) > time.time():
                continue
            if d.get("bis", 0) <= time.time() or r["key"] == f"papierkorb:bericht:{force_id}":
                files += [x["file"] for x in d.get("images", []) if x.get("file")]
                c.execute("DELETE FROM bp_store WHERE key=?", (r["key"],))
    storage.drop(files)


@bp.delete("/api/reports/<int:i>")
def delete_report(i):
    """Bericht löschen – mit „Rückgängig“: Bericht, Einträge und Fotos bleiben 15 Minuten im Papierkorb."""
    import json, threading, time
    with db.tx() as c:
        rep = _raw(c, "SELECT * FROM reports WHERE id=?", (i,))
        if not rep:
            return jsonify(ok=True)
        snap = {"report": rep[0], "bis": time.time() + UNDO_MIN * 60, "von": g.user["name"]}
        for t in TABLES:
            try:
                with c.savepoint():
                    snap[t] = _raw(c, f"SELECT * FROM {t} WHERE report_id=? ORDER BY 1", (i,))
            except Exception:
                snap[t] = []
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET data=EXCLUDED.data",
                  (f"papierkorb:bericht:{i}", json.dumps(snap, ensure_ascii=False, default=str), db.now(), g.user["name"]))
        c.execute("DELETE FROM reports WHERE id=?", (i,))
    t = threading.Timer(UNDO_MIN * 60 + 5, _purge)
    t.daemon = True
    t.start()
    try:
        _purge(-1)   # ältere, abgelaufene aufräumen
    except Exception:
        pass
    return jsonify(ok=True, undo=i, minuten=UNDO_MIN)


@bp.post("/api/reports/<int:i>/restore")
def restore_report(i):
    """Gerade gelöschten Bericht mit allen Einträgen, Fotos und Entscheidungen zur Anwesenheit wiederherstellen."""
    import json
    with db.tx() as c:
        r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"papierkorb:bericht:{i}",)).fetchone()
        if not r:
            return jsonify(error="Der Bericht lässt sich nicht mehr wiederherstellen."), 404
        snap = json.loads(r["data"])
        if c.execute("SELECT 1 FROM reports WHERE id=?", (i,)).fetchone():
            return jsonify(error="Der Bericht ist schon wieder da."), 409
        if not c.execute("SELECT 1 FROM projects WHERE id=?", (snap["report"]["project_id"],)).fetchone() \
                or not access.can_see(c, g.user, snap["report"]["project_id"]):
            return jsonify(error="Das Projekt gibt es nicht mehr."), 404
        for t, rows in (("reports", [snap["report"]]), *((t, snap.get(t) or []) for t in TABLES)):
            have = set(db.cols(c, t))
            for row in rows:
                vals = {k: v for k, v in row.items() if k in have}
                if t == "items" and vals.get("contact_id") and not c.execute("SELECT 1 FROM contacts WHERE id=?", (vals["contact_id"],)).fetchone():
                    vals["contact_id"] = None
                c.execute(f"INSERT INTO {t}({','.join(vals)}) VALUES({','.join('?' * len(vals))})", list(vals.values()))
        c.execute("DELETE FROM bp_store WHERE key=?", (f"papierkorb:bericht:{i}",))
    return jsonify(ok=True, id=i, project_id=snap["report"]["project_id"])
