"""Bauzeitenplan – Links zum Ansehen (schreibgeschützt) für Externe, ohne Anmeldung über einen geheimen Schlüssel.

Gespeichert im gemeinsamen Teilen-Baustein des Kerns (bpcore/teilen.py, Tabelle bp_teilen, app „gantt“, objekt = Plan-ID);
das Fenster in der Oberfläche ist /bp/teilen.js (BPHead.teilen), hier nur noch der Teil des Bauzeitenplans.

Verwaltung (angemeldet): GET/POST /api/projects/<id>/links, PUT/DELETE /api/links/<schlüssel>
Ansicht (ohne Anmeldung): GET /api/ansicht/<schlüssel> (Daten), GET /ansicht/<schlüssel> (Seite ansicht.html)
„mit“ = mitlaufend: aktueller Stand des eingestellten Plans (Version jederzeit wechselbar, nur innerhalb desselben Projekts);
„fest“ = Stand beim Erstellen. Optionen: fortschritt, meilensteine, gewerk (nur dieses Gewerk – Firma sieht ihre Leistungen
und die Meilensteine). Ausgeliefert werden nur Bezeichnung, Ebene, Termine, Gewerk/Farbe, Firma, ggf. Fortschritt.
"""
import json
from datetime import date, datetime

from flask import jsonify, request, send_from_directory

from bpcore import db, teilen


def einbinden(app, *, row_of, project_or_error, can_see, body, jstr, truthy, now_iso, uname, pub):
    _project_or_error, PUB = project_or_error, pub

    def _link_out(c, x):
        p = row_of(c, x["objekt"])
        o = x["optionen"]
        return {**x, "gantt_id": x["objekt"], "plan": p["name"] if p else "", "fortschritt": bool(o.get("fortschritt", True))}

    def _familie(c, r):
        """Alle Pläne (Versionen) desselben Projekts – ohne Projekt nur der Plan selbst."""
        if r["project_id"] is None:
            return [r["id"]]
        return [x["id"] for x in c.execute("SELECT id FROM gantt_projects WHERE project_id=?", (r["project_id"],))]

    def _werte(b):
        b = dict(b)
        if "fortschritt" in b:   # ältere Form: fortschritt direkt im Link
            b["optionen"] = {**(b.get("optionen") if isinstance(b.get("optionen"), dict) else {}), "fortschritt": truthy(b.pop("fortschritt"))}
        return teilen.pruefe_daten(b)

    @app.route("/api/projects/<pid>/links", methods=["GET", "POST"])
    def plan_links(pid):
        with db.tx() as c:
            r, err = _project_or_error(c, pid)
            if err:
                return err
            fam = _familie(c, r)
            if request.method == "GET":
                return jsonify([_link_out(c, x) for x in teilen.liste(c, "gantt", fam)])
            b = body()
            w, fehler = _werte({"optionen": {"fortschritt": True}, **b})
            if fehler:
                return jsonify(error=fehler), 400
            art = "fest" if b.get("art") == "fest" else "mit"
            stand = r["data"] if art == "fest" else None   # fest: genau dieser Stand
            stand_name = f"{r['name']} · Stand {datetime.now().strftime('%d.%m.%Y %H:%M')}" if art == "fest" else ""
            tok = teilen.neu(c, "gantt", pid, project_id=r["project_id"], art=art, stand=stand, stand_name=stand_name, von=uname(), werte=w)
            return jsonify(_link_out(c, teilen.ein(c, tok))), 201

    @app.route("/api/links/<tok>", methods=["PUT", "DELETE"])
    def plan_link(tok):
        with db.tx() as c:
            x = teilen.lies(c, tok)
            r = row_of(c, x["objekt"]) if x and x["app"] == "gantt" else None
            if not x or not r or not can_see(c, r):
                return jsonify(error="Link nicht gefunden"), 404
            if request.method == "DELETE":
                teilen.loeschen(c, tok)
                return jsonify(ok=True)
            b = body()
            neu_plan = None
            if b.get("gantt_id") and x["art"] == "mit":   # mitlaufend: anderen Plan/andere Version zeigen – nur aus demselben Projekt
                if b["gantt_id"] not in _familie(c, r):
                    return jsonify(error="Dieser Plan gehört nicht zum Projekt"), 400
                neu_plan = b["gantt_id"]
            w, fehler = _werte({k: v for k, v in b.items() if k != "gantt_id"})
            if fehler:
                return jsonify(error=fehler), 400
            teilen.aendern(c, tok, w, objekt=neu_plan)
            return jsonify(_link_out(c, teilen.ein(c, tok)))

    def _ansicht_zeilen(d, o):
        """Zeilen für die Ansicht: nur Bezeichnung, Ebene, Termine, Gewerk/Farbe, Firma, ggf. Fortschritt – keine Notizen, keine Namen von Bearbeitern.
        o.gewerk: nur Leistungen dieses Gewerks, dazu die Meilensteine und die Gruppen, in denen sie stehen. o.meilensteine False: ohne Meilensteine."""
        fortschritt, gw_nur, ms = bool(o.get("fortschritt", True)), str(o.get("gewerk") or ""), o.get("meilensteine", True) is not False
        sched = {s["uid"]: s for s in (d.get("sched") or []) if isinstance(s, dict)}
        cols = d.get("gwColors") or {}
        rows = []
        for t in d.get("tasks") or []:
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
        if gw_nur or not ms:   # Auswahl: Leistungen (des Gewerks) und Meilensteine – Gruppen nur, wenn darunter etwas bleibt
            bleibt = [(not x["g"]) and ((x["m"] and ms) or (not x["m"] and (not gw_nur or x["gw"] == gw_nur))) for x in rows]
            for i in range(len(rows) - 1, -1, -1):
                if rows[i]["g"]:
                    j = i + 1
                    while j < len(rows) and rows[j]["l"] > rows[i]["l"]:
                        if bleibt[j]:
                            bleibt[i] = True
                            break
                        j += 1
            rows = [x for x, b in zip(rows, bleibt) if b]
        for x in rows:
            x.pop("_p"); x.pop("_d")
        return rows

    @app.get("/api/ansicht/<tok>")
    def ansicht_daten(tok):
        with db.tx() as c:
            x, fehler = teilen.oeffnen(c, tok)
            if fehler or x["app"] != "gantt":
                return jsonify(error=(fehler or ("Dieser Link ist ungültig.",))[0]), (fehler or (0, 404))[1]
            r = row_of(c, x["objekt"])
            if not r:
                return jsonify(error="Den Plan gibt es nicht mehr."), 404
            d = json.loads(x["stand"] if x["art"] == "fest" and x["stand"] else r["data"])
            bt = c.execute("SELECT name, street, zip, city FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
            k = c.execute("SELECT name FROM contacts WHERE id=?", (x["contact_id"],)).fetchone() if x["contact_id"] else None
            stand = x["stand_name"] if x["art"] == "fest" else f"{r['name']} · aktueller Stand"
            o = json.loads(x["optionen"] or "{}")
            kopf = teilen.kopf(c)
        return jsonify(projekt=bt["name"] if bt else d.get("name", ""), adresse=", ".join(v for v in ((bt["street"] or "") if bt else "", f"{bt['zip'] or ''} {bt['city'] or ''}".strip() if bt else "") if v),
                       plan=d.get("name", ""), stand=stand, art=x["art"], fortschritt=bool(o.get("fortschritt", True)), titel=x["name"], fuer=k["name"] if k else x["name"],
                       gewerk=o.get("gewerk") or "", kopf=kopf, heute=date.today().isoformat(), zeilen=_ansicht_zeilen(d, o))

    @app.get("/ansicht/<tok>")
    def ansicht_seite(tok):
        resp = send_from_directory(PUB, "ansicht.html", max_age=0)
        resp.headers["Cache-Control"] = "no-store"
        resp.headers["Referrer-Policy"] = "no-referrer"   # der Schlüssel im Link geht nicht an fremde Seiten weiter
        resp.headers["X-Robots-Tag"] = "noindex, nofollow"
        return resp
