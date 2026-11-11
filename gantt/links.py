"""Bauzeitenplan – Links zum Ansehen (schreibgeschützt) für Externe, ohne Anmeldung über einen geheimen Schlüssel.

Verwaltung (angemeldet): GET/POST /api/projects/<id>/links, PUT/DELETE /api/links/<schlüssel>
Ansicht (ohne Anmeldung): GET /api/ansicht/<schlüssel> (Daten), GET /ansicht/<schlüssel> (Seite ansicht.html)
„mit“ = mitlaufend: aktueller Stand des eingestellten Plans (Version jederzeit wechselbar, nur innerhalb desselben Projekts);
„fest“ = Stand beim Erstellen. Ausgeliefert werden nur Bezeichnung, Ebene, Termine, Gewerk/Farbe, Firma, ggf. Fortschritt.
"""
import json, re, secrets
from datetime import date, datetime

from flask import jsonify, request, send_from_directory

from bpcore import db


def einbinden(app, *, row_of, project_or_error, can_see, body, jstr, truthy, now_iso, uname, pub):
    _project_or_error, PUB = project_or_error, pub

    TOKEN_OK = re.compile(r"^[A-Za-z0-9_-]{16,64}$")


    def _link_out(c, r):
        p = row_of(c, r["gantt_id"])
        return {"token": r["token"], "gantt_id": r["gantt_id"], "plan": p["name"] if p else "", "art": r["art"], "fortschritt": bool(r["fortschritt"]),
                "name": r["name"], "stand_name": r["stand_name"], "ablauf": r["ablauf"], "aktiv": bool(r["aktiv"]), "erstellt": r["erstellt"],
                "von": r["von"], "zuletzt": r["zuletzt"], "aufrufe": r["aufrufe"]}


    def _familie(c, r):
        """Alle Pläne (Versionen) desselben Projekts – ohne Projekt nur der Plan selbst."""
        if r["project_id"] is None:
            return [r["id"]]
        return [x["id"] for x in c.execute("SELECT id FROM gantt_projects WHERE project_id=?", (r["project_id"],))]


    @app.route("/api/projects/<pid>/links", methods=["GET", "POST"])
    def plan_links(pid):
        with db.tx() as c:
            r, err = _project_or_error(c, pid)
            if err:
                return err
            fam = _familie(c, r)
            if request.method == "GET":
                L = [x for x in c.execute("SELECT * FROM gantt_links ORDER BY erstellt DESC") if x["gantt_id"] in fam]
                return jsonify([_link_out(c, x) for x in L])
            b = body()
            art = "fest" if b.get("art") == "fest" else "mit"
            ablauf = jstr(b.get("ablauf") or "")[:10]
            if ablauf and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", ablauf):
                return jsonify(error="Ablaufdatum ungültig"), 400
            tok = secrets.token_urlsafe(18)
            stand = r["data"] if art == "fest" else None   # fest: genau dieser Stand
            stand_name = f"{r['name']} · Stand {datetime.now().strftime('%d.%m.%Y %H:%M')}" if art == "fest" else ""
            c.execute("INSERT INTO gantt_links(token, gantt_id, art, fortschritt, name, stand, stand_name, ablauf, aktiv, erstellt, von) VALUES(?,?,?,?,?,?,?,?,1,?,?)",
                      (tok, pid, art, 1 if truthy(b.get("fortschritt", True)) else 0, jstr(b.get("name") or "")[:120], stand, stand_name, ablauf, now_iso(), uname()))
            return jsonify(_link_out(c, c.execute("SELECT * FROM gantt_links WHERE token=?", (tok,)).fetchone())), 201


    @app.route("/api/links/<tok>", methods=["PUT", "DELETE"])
    def plan_link(tok):
        if not TOKEN_OK.match(tok):
            return jsonify(error="Ungültiger Link"), 400
        with db.tx() as c:
            x = c.execute("SELECT * FROM gantt_links WHERE token=?", (tok,)).fetchone()
            r = row_of(c, x["gantt_id"]) if x else None
            if not x or not r or not can_see(c, r):
                return jsonify(error="Link nicht gefunden"), 404
            if request.method == "DELETE":
                c.execute("DELETE FROM gantt_links WHERE token=?", (tok,))
                return jsonify(ok=True)
            b = body()
            if b.get("gantt_id") and x["art"] == "mit":   # mitlaufend: anderen Plan/andere Version zeigen – nur aus demselben Projekt
                if b["gantt_id"] not in _familie(c, r):
                    return jsonify(error="Dieser Plan gehört nicht zum Projekt"), 400
                c.execute("UPDATE gantt_links SET gantt_id=? WHERE token=?", (b["gantt_id"], tok))
            if "fortschritt" in b:
                c.execute("UPDATE gantt_links SET fortschritt=? WHERE token=?", (1 if truthy(b["fortschritt"]) else 0, tok))
            if "aktiv" in b:
                c.execute("UPDATE gantt_links SET aktiv=? WHERE token=?", (1 if truthy(b["aktiv"]) else 0, tok))
            if "name" in b:
                c.execute("UPDATE gantt_links SET name=? WHERE token=?", (jstr(b["name"])[:120], tok))
            if "ablauf" in b:
                a = jstr(b["ablauf"] or "")[:10]
                if a and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", a):
                    return jsonify(error="Ablaufdatum ungültig"), 400
                c.execute("UPDATE gantt_links SET ablauf=? WHERE token=?", (a, tok))
            return jsonify(_link_out(c, c.execute("SELECT * FROM gantt_links WHERE token=?", (tok,)).fetchone()))


    def _ansicht_zeilen(d, fortschritt):
        """Zeilen für die Ansicht: nur Bezeichnung, Ebene, Termine, Gewerk/Farbe, Firma, ggf. Fortschritt – keine Notizen, keine Namen von Bearbeitern."""
        sched = {s["uid"]: s for s in (d.get("sched") or []) if isinstance(s, dict)}
        cols = d.get("gwColors") or {}
        T = d.get("tasks") or []
        rows = []
        for t in T:
            s = sched.get(t.get("uid"))
            if not s:
                continue
            rows.append({"n": t.get("name") or "", "l": int(t.get("lvl") or 0), "s": s["s"], "f": s["f"], "g": 1 if s.get("g") else 0,
                         "m": 1 if not s.get("g") and not t.get("dur") else 0, "gw": t.get("gw") or "", "c": cols.get(t.get("gw") or "", ""),
                         "r": t.get("res") or "", "_p": float(t.get("pct") or 0), "_d": float(t.get("dur") or 0)})
        if fortschritt:   # Gruppen: Fortschritt gewichtet nach Dauer ihrer Leistungen
            for i, x in enumerate(rows):
                if x["g"]:
                    kids, j = [], i + 1
                    while j < len(rows) and rows[j]["l"] > x["l"]:
                        if not rows[j]["g"]:
                            kids.append(rows[j])
                        j += 1
                    w = sum(max(k["_d"], 1) for k in kids)
                    x["p"] = round(sum(k["_p"] * max(k["_d"], 1) for k in kids) / w) if w else 0
                else:
                    x["p"] = round(x["_p"])
        for x in rows:
            x.pop("_p"); x.pop("_d")
        return rows


    @app.get("/api/ansicht/<tok>")
    def ansicht_daten(tok):
        if not TOKEN_OK.match(tok):
            return jsonify(error="Dieser Link ist ungültig."), 404
        with db.tx() as c:
            x = c.execute("SELECT * FROM gantt_links WHERE token=?", (tok,)).fetchone()
            if not x or not x["aktiv"]:
                return jsonify(error="Dieser Link wurde zurückgezogen oder gibt es nicht."), 404
            if x["ablauf"] and x["ablauf"] < date.today().isoformat():
                return jsonify(error="Dieser Link ist abgelaufen."), 410
            r = row_of(c, x["gantt_id"])
            if not r:
                return jsonify(error="Den Plan gibt es nicht mehr."), 404
            d = json.loads(x["stand"] if x["art"] == "fest" and x["stand"] else r["data"])
            bt = c.execute("SELECT name, street, zip, city FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
            c.execute("UPDATE gantt_links SET zuletzt=?, aufrufe=aufrufe+1 WHERE token=?", (now_iso(), tok))
            stand = x["stand_name"] if x["art"] == "fest" else f"{r['name']} · aktueller Stand"
        return jsonify(projekt=bt["name"] if bt else d.get("name", ""), adresse=", ".join(v for v in ((bt["street"] or "") if bt else "", f"{bt['zip'] or ''} {bt['city'] or ''}".strip() if bt else "") if v),
                       plan=d.get("name", ""), stand=stand, art=x["art"], fortschritt=bool(x["fortschritt"]), titel=x["name"],
                       heute=date.today().isoformat(), zeilen=_ansicht_zeilen(d, bool(x["fortschritt"])))


    @app.get("/ansicht/<tok>")
    def ansicht_seite(tok):
        resp = send_from_directory(PUB, "ansicht.html", max_age=0)
        resp.headers["Cache-Control"] = "no-store"
        resp.headers["Referrer-Policy"] = "no-referrer"   # der Schlüssel im Link geht nicht an fremde Seiten weiter
        resp.headers["X-Robots-Tag"] = "noindex, nofollow"
        return resp
