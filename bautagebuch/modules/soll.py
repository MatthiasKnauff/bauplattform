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
        ohne = {}
        plan.expected(pl, plan.firm_map(c), rep["date"], ohne)
        return jsonify(firmen=plan.soll_ist(c, r, rep["project_id"], rep["date"], plan_list=pl), plaene=[n for n, _ in pl],
                       ohne_firma=[{"gewerk": k, "leistungen": sorted(x for x in v if x)} for k, v in sorted(ohne.items())])


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


@bp.get("/api/reports/<int:r>/taetigkeit")
def taetigkeit(r):
    """Vorschlag „Art der Tätigkeit“ für eine Firma: Leistungen laut Bauzeitenplan, sonst naheliegend nach Gewerk."""
    firma = " ".join(str(request.args.get("firma") or "").split())[:200]
    with db.tx() as c:
        rep = c.execute("SELECT project_id, date FROM reports WHERE id=?", (r,)).fetchone()
        if not rep or not firma:
            return jsonify(taetigkeit="")
        k = c.execute("SELECT id, name FROM contacts WHERE lower(name)=lower(?)", (firma,)).fetchone()
        try:
            with c.savepoint():
                t = plan.taetigkeit(c, rep["project_id"], rep["date"], k["id"] if k else None, k["name"] if k else firma)
        except Exception:
            t = ""
    return jsonify(taetigkeit=t)


# ---------------------------------------------------------------- Arbeitsfortschritt laut Bauzeitenplan
AMPEL = ("", "plan", "hinterher", "fertig")


def _fs_liste(c, rep):
    """Vorgänge des Berichtstags mit Soll/Ist/Verzug und dem, was in diesem Bericht gemeldet wurde."""
    pl = plan.plans_mit_id(c, rep["project_id"])
    if not pl:
        return [], 5
    try:
        from bpcore import todo
        sw = todo.schwelle(c, rep["project_id"])
    except Exception:
        sw = 5
    L = plan.fortschritt(pl, plan.firm_map(c), rep["date"])
    gem = {(r["gantt_id"], r["uid"]): r for r in c.execute("SELECT * FROM bt_fortschritt WHERE report_id=?", (rep["id"],))}
    da = {(x["gantt_id"], x["uid"]) for x in L}
    for x in L:
        m = gem.get((x["gantt_id"], x["uid"]))
        x["ampel"] = m["ampel"] if m else ""
        x["gemeldet"] = bool(m)
        x["pct_bericht"] = m["pct"] if m else None
    for (gid, uid), m in gem.items():   # im Bericht gemeldet, laut heutigem Plan aber nicht mehr dran (z. B. inzwischen fertig)
        if (gid, uid) not in da:
            L.append({"gantt_id": gid, "uid": uid, "vorgang": m["vorgang"], "firma": m["firma"], "key": m["firma"].lower(), "soll": m["soll"],
                      "ist": m["pct"], "pct_bericht": m["pct"], "verzug": m["verzug"] or 0, "ampel": m["ampel"], "gemeldet": True, "plan": "", "s": "", "f": ""})
    return L, sw


@bp.get("/api/reports/<int:r>/fortschritt")
def fortschritt(r):
    with db.tx() as c:
        rep = c.execute("SELECT id, project_id, date FROM reports WHERE id=?", (r,)).fetchone()
        if not rep:
            return jsonify(error="Bericht nicht gefunden"), 404
        try:
            with c.savepoint():
                L, sw = _fs_liste(c, rep)
        except Exception:   # ohne Bauplattform (keine Bauzeitenpläne)
            L, sw = [], 5
    return jsonify(vorgaenge=L, schwelle=sw)


@bp.post("/api/reports/<int:r>/fortschritt")
def fortschritt_set(r):
    """Fortschritt melden: pct (0–100) und/oder ampel. „fertig“ = 100 %, „im Plan“ = Soll-Fortschritt.
    Der Wert geht in den Bauzeitenplan – außer ein späterer Bericht hat für den Vorgang schon etwas gemeldet."""
    d = request.json or {}
    gid, uid, ampel = str(d.get("gantt_id") or ""), d.get("uid"), d.get("ampel") or ""
    pct = d.get("pct")
    if not gid or not isinstance(uid, int) or ampel not in AMPEL or (pct is not None and not (isinstance(pct, (int, float)) and 0 <= pct <= 100)):
        return jsonify(error="Ungültige Angabe"), 400
    with db.tx() as c:
        rep = c.execute("SELECT id, project_id, date FROM reports WHERE id=?", (r,)).fetchone()
        if not rep:
            return jsonify(error="Bericht nicht gefunden"), 404
        L, _ = _fs_liste(c, rep)
        x = next((y for y in L if y["gantt_id"] == gid and y["uid"] == uid), None)
        if not x:
            return jsonify(error="Den Vorgang gibt es im Bauzeitenplan nicht mehr."), 404
        if ampel == "fertig":
            pct = 100
        elif ampel == "plan" and pct is None:
            pct = max(x["ist"] or 0, x["soll"] or 0)
        if pct is None:
            pct = x["ist"]
        pct = int(round(pct))
        if pct < 100 and ampel == "fertig":
            ampel = ""
        c.execute("DELETE FROM bt_fortschritt WHERE report_id=? AND gantt_id=? AND uid=?", (r, gid, uid))
        dauer = x.get("dauer") or 1
        vz = max(0.0, (x["soll"] - pct) / 100 * dauer) if x.get("f") and rep["date"] <= x["f"] else (x["verzug"] if pct == x["ist"] else max(0.0, x["verzug"] - (pct - (x["ist"] or 0)) / 100 * dauer))
        c.execute("""INSERT INTO bt_fortschritt(report_id, gantt_id, uid, vorgang, firma, pct, soll, ampel, verzug, geaendert, geaendert_von)
                     VALUES(?,?,?,?,?,?,?,?,?,?,?)""", (r, gid, uid, x["vorgang"], x["firma"], pct, x["soll"], ampel, round(vz, 1), db.now(), g.user["name"]))
        neuer = c.execute("""SELECT 1 FROM bt_fortschritt f JOIN reports r ON r.id=f.report_id WHERE f.gantt_id=? AND f.uid=? AND r.date>?""",
                          (gid, uid, rep["date"])).fetchone()
        im_plan = False
        if not neuer:
            with c.savepoint():
                im_plan = plan.fortschritt_setzen(c, gid, uid, pct, g.user["name"])
        L, sw = _fs_liste(c, rep)
    return jsonify(vorgaenge=L, schwelle=sw, im_plan=im_plan)
