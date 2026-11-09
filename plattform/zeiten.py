"""Zeiten: Arbeitszeit (Kommen/Gehen, Pause, Urlaub/Krank) und Projektzeiten je Leistungsphase.

Jede:r sieht und bearbeitet nur die eigenen Tage. Vorschläge kommen aus der Arbeit in der Plattform (Puls der Kopfleiste)
und aus „vor Ort“; gezählt wird erst, was bestätigt ist. Administratoren sehen Summen je Projekt und Leistungsphase
und die Arbeitszeitkonten (Soll, Ist, Saldo, Urlaub) – keine Tagesabläufe der anderen. Logik: bpcore/zeiten.py.
"""
import csv, io, json
from datetime import date, timedelta

from flask import Response, g, jsonify, redirect, request

from bpcore import db, platform, sso, zeiten as Z
import common as C

app = C.make_app(__name__)
KEY = "zeiten"


@app.before_request
def guard():
    p = request.path
    if p.startswith(("/static/", "/bp/")) or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base(KEY) + "/")), 401
        return redirect(C.login_url(request.url))
    if not sso.has_app(u, KEY):
        msg = "Für „Zeiten“ ist dein Konto nicht freigeschaltet."
        if p.startswith("/api/"):
            return jsonify(error=msg), 403
        return (f'{msg} <a href="{C.app_base("portal")}/">Zur Startseite</a>', 403, {"Content-Type": "text/html; charset=utf-8"})
    g.user = u


def _admin():
    return bool(g.user["is_admin"])


def _nur_admin():
    if not _admin():
        return jsonify(error="Nur für Administratoren."), 403
    return None


def _tag(v=None):
    t = str(v or request.args.get("d") or Z.heute())[:10]
    return t if Z._tag_ok(t) else Z.heute()


def _zeit(v):
    m = Z.h2m(v)
    return Z.m2h(m) if m is not None else None


@app.get("/")
def index():
    return C.page("zeiten.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


@app.get("/api/grund")
def grund():
    """Was die Oberfläche braucht: Tätigkeiten, Abwesenheiten, sichtbare Projekte, eigene Einstellungen."""
    uid = g.user["id"]
    with db.tx() as c:
        pj = []
        for r in c.execute("SELECT id, name, archived, leaders FROM projects ORDER BY name").fetchall():
            try:
                L = json.loads(r["leaders"] or "[]")
            except ValueError:
                L = []
            if r["archived"] or (L and uid not in L and not _admin()):
                continue
            pj.append({"id": r["id"], "name": r["name"]})
        P = Z.person(c, uid)
        lauf = c.execute("SELECT * FROM zeit_lauf WHERE user_id=?", (uid,)).fetchone()
        Z.aufraeumen(c)
    return jsonify(arten=Z.ARTEN, abw=Z.ABW, projekte=pj, person=P, admin=_admin(), heute=Z.heute(), lauf=dict(lauf) if lauf else None)


@app.get("/api/tag")
def tag_get():
    t = _tag()
    with db.tx() as c:
        d = Z.tag_daten(c, g.user["id"], t)
        d["konto"] = Z.konto(c, g.user["id"])
    return jsonify(d)


@app.put("/api/tag")
def tag_put():
    b = request.get_json(silent=True) or {}
    t, uid = _tag(b.get("d")), g.user["id"]
    f = {}
    for k in ("kommen", "gehen"):
        if k in b:
            f[k] = _zeit(b[k]) or ""
    if "pause" in b:
        try:
            f["pause"] = None if b["pause"] in (None, "") else max(0, min(600, int(b["pause"])))
        except (TypeError, ValueError):
            pass
    if "abw" in b:
        f["abw"] = b["abw"] if b["abw"] in Z.ABW else ""
    if "notiz" in b:
        f["notiz"] = str(b["notiz"] or "")[:500]
    with db.tx() as c:
        Z.zt_setzen(c, uid, t, **f)
        d = Z.tag_daten(c, uid, t)
        d["konto"] = Z.konto(c, uid)
    return jsonify(d)


@app.post("/api/tag/bestaetigen")
def tag_ok():
    b = request.get_json(silent=True) or {}
    t, uid = _tag(b.get("d")), g.user["id"]
    if t > Z.heute():
        return jsonify(error="Zukünftige Tage lassen sich nicht bestätigen."), 400
    with db.tx() as c:
        d = Z.bestaetigen(c, uid, t, g.user["name"])
        d["konto"] = Z.konto(c, uid)
    return jsonify(d)


@app.post("/api/tag/oeffnen")
def tag_auf():
    b = request.get_json(silent=True) or {}
    t, uid = _tag(b.get("d")), g.user["id"]
    with db.tx() as c:
        Z.zt_setzen(c, uid, t, bestaetigt="")
        d = Z.tag_daten(c, uid, t)
        d["konto"] = Z.konto(c, uid)
    return jsonify(d)


def _eintrag_daten(b):
    v, z = _zeit(b.get("von")), _zeit(b.get("bis"))
    if not v or not z or Z.h2m(z) <= Z.h2m(v):
        return None, "Bitte Beginn und Ende angeben (Ende nach dem Beginn)."
    try:
        pid = int(b["project_id"]) if b.get("project_id") not in (None, "", 0, "0") else None
    except (TypeError, ValueError):
        pid = None
    art = b.get("art") if b.get("art") in Z.ART_NAME else ("buero" if not pid else "sonst")
    q = b.get("quelle") if b.get("quelle") in ("hand", "puls", "vorort", "fahrt", "stoppuhr") else "hand"
    return {"von": v, "bis": z, "project_id": pid, "art": art, "notiz": str(b.get("notiz") or "")[:300], "quelle": q}, None


@app.post("/api/eintrag")
def eintrag_neu():
    b = request.get_json(silent=True) or {}
    t, uid = _tag(b.get("d")), g.user["id"]
    e, err = _eintrag_daten(b)
    if err:
        return jsonify(error=err), 400
    with db.tx() as c:
        c.execute("INSERT INTO zeit_eintrag(user_id, tag, von, bis, project_id, art, notiz, quelle) VALUES(?,?,?,?,?,?,?,?)",
                  (uid, t, e["von"], e["bis"], e["project_id"], e["art"], e["notiz"], e["quelle"]))
        d = Z.tag_daten(c, uid, t)
        d["konto"] = Z.konto(c, uid)
    return jsonify(d)


@app.route("/api/eintrag/<int:eid>", methods=["PUT", "DELETE"])
def eintrag(eid):
    uid = g.user["id"]
    with db.tx() as c:
        r = c.execute("SELECT * FROM zeit_eintrag WHERE id=? AND user_id=?", (eid, uid)).fetchone()
        if not r:
            return jsonify(error="Eintrag nicht gefunden."), 404
        if request.method == "DELETE":
            c.execute("DELETE FROM zeit_eintrag WHERE id=?", (eid,))
            alt = dict(r)
        else:
            b = {**dict(r), **(request.get_json(silent=True) or {})}
            e, err = _eintrag_daten(b)
            if err:
                return jsonify(error=err), 400
            c.execute("UPDATE zeit_eintrag SET von=?, bis=?, project_id=?, art=?, notiz=?, updated=to_char(timezone('UTC', now()), 'YYYY-MM-DD HH24:MI:SS') WHERE id=?",
                      (e["von"], e["bis"], e["project_id"], e["art"], e["notiz"], eid))
            alt = None
        d = Z.tag_daten(c, uid, r["tag"])
        d["konto"] = Z.konto(c, uid)
    return jsonify({**d, "geloescht": alt})


@app.post("/api/verwerfen")
def verwerfen():
    """Vorschlag nicht übernehmen (z. B. privat am Rechner) – dieser Zeitraum wird nicht mehr vorgeschlagen."""
    b = request.get_json(silent=True) or {}
    t, uid = _tag(b.get("d")), g.user["id"]
    a, z = Z.h2m(b.get("von")), Z.h2m(b.get("bis"))
    if a is None or z is None or z <= a:
        return jsonify(error="Zeitraum fehlt."), 400
    with db.tx() as c:
        T = Z.zt(c, uid, t)
        ig = Z._j(T["ignor"], [])
        if b.get("zurueck"):
            ig = [x for x in ig if x != [a, z]]
        else:
            ig.append([a, z])
        Z.zt_setzen(c, uid, t, ignor=json.dumps(ig[-200:]))
        d = Z.tag_daten(c, uid, t)
        d["konto"] = Z.konto(c, uid)
    return jsonify(d)


@app.get("/api/woche")
def woche():
    t = _tag()
    with db.tx() as c:
        return jsonify(tage=Z.woche(c, g.user["id"], t), konto=Z.konto(c, g.user["id"]))


@app.get("/api/monat")
def monat():
    m = str(request.args.get("m") or Z.heute()[:7])[:7]
    try:
        j, mo = int(m[:4]), int(m[5:7])
        erster = date(j, mo, 1)
    except ValueError:
        return jsonify(error="Monat?"), 400
    uid = g.user["id"]
    out = []
    with db.tx() as c:
        P = Z.person(c, uid)
        letzter = (date(j + (mo == 12), mo % 12 + 1, 1) - timedelta(days=1))
        L = Z.lade(c, uid, erster.isoformat(), letzter.isoformat())
        t = erster
        while t.month == mo:
            d = Z.tag_daten(c, uid, t.isoformat(), P, L)
            out.append({k: d[k] for k in ("tag", "feiertag", "soll", "ist", "arbeit", "abw", "bestaetigt")} | {"offen": len(d["vorschlaege"])})
            t += timedelta(days=1)
        k = Z.konto(c, uid, P=P)
    return jsonify(tage=out, konto=k, person=P)


@app.put("/api/abwesenheit")
def abwesenheit():
    """Urlaub, Krank usw. für einen Zeitraum (nur Arbeitstage); leere Art nimmt sie wieder weg."""
    b = request.get_json(silent=True) or {}
    von, bis, art = _tag(b.get("von")), _tag(b.get("bis") or b.get("von")), b.get("art") or ""
    if art and art not in Z.ABW:
        return jsonify(error="Unbekannte Abwesenheit."), 400
    if bis < von or (date.fromisoformat(bis) - date.fromisoformat(von)).days > 120:
        return jsonify(error="Zeitraum prüfen (höchstens 120 Tage)."), 400
    uid, n = g.user["id"], 0
    with db.tx() as c:
        P = Z.person(c, uid)
        t = date.fromisoformat(von)
        while t.isoformat() <= bis:
            if Z.soll_min(P, t.isoformat()) or not art:
                Z.zt_setzen(c, uid, t.isoformat(), abw=art)
                n += 1
            t += timedelta(days=1)
        k = Z.konto(c, uid, P=P)
    return jsonify(ok=True, tage=n, konto=k)


@app.route("/api/lauf", methods=["GET", "POST", "DELETE"])
def lauf():
    """Stoppuhr: starten (POST), anhalten und als Zeit eintragen (DELETE ?speichern=1) oder verwerfen (DELETE)."""
    uid = g.user["id"]
    with db.tx() as c:
        r = c.execute("SELECT * FROM zeit_lauf WHERE user_id=?", (uid,)).fetchone()
        if request.method == "GET":
            return jsonify(lauf=dict(r) if r else None)
        if request.method == "POST":
            b = request.get_json(silent=True) or {}
            try:
                pid = int(b["project_id"]) if b.get("project_id") not in (None, "", 0, "0") else None
            except (TypeError, ValueError):
                pid = None
            art = b.get("art") if b.get("art") in Z.ART_NAME else ("buero" if not pid else "sonst")
            c.execute("INSERT INTO zeit_lauf(user_id, start, project_id, art, notiz) VALUES(?,?,?,?,?) ON CONFLICT (user_id) DO UPDATE SET "
                      "start=EXCLUDED.start, project_id=EXCLUDED.project_id, art=EXCLUDED.art, notiz=EXCLUDED.notiz",
                      (uid, Z.jetzt().strftime("%Y-%m-%d %H:%M"), pid, art, str(b.get("notiz") or "")[:300]))
            return jsonify(lauf=dict(c.execute("SELECT * FROM zeit_lauf WHERE user_id=?", (uid,)).fetchone()))
        c.execute("DELETE FROM zeit_lauf WHERE user_id=?", (uid,))
        if r and request.args.get("speichern"):
            t, v = r["start"][:10], r["start"][11:16]
            n = Z.jetzt()
            bis = n.strftime("%H:%M") if n.strftime("%Y-%m-%d") == t else "23:59"
            if Z.h2m(bis) > Z.h2m(v):
                c.execute("INSERT INTO zeit_eintrag(user_id, tag, von, bis, project_id, art, notiz, quelle) VALUES(?,?,?,?,?,?,?,?)",
                          (uid, t, v, bis, r["project_id"], r["art"], r["notiz"], "stoppuhr"))
    return jsonify(lauf=None)


@app.get("/api/offen")
def offen():
    """Für die Startseite: noch nicht bestätigte Tage und der Stand heute."""
    uid = g.user["id"]
    with db.tx() as c:
        o = Z.offene_tage(c, uid)
        h = Z.tag_daten(c, uid, Z.heute())
    return jsonify(offen=o, heute={k: h[k] for k in ("tag", "kommen", "arbeit", "soll", "abw")})


# ------------------------------------------------------------------ Administratoren
@app.get("/api/auswertung")
def auswertung():
    x = _nur_admin()
    if x:
        return x
    try:
        pid = int(request.args.get("pid") or 0) or None
    except ValueError:
        pid = None
    with db.tx() as c:
        return jsonify(projekte=Z.auswertung(c, pid), buero_satz=Z.buero_satz(c), arten=Z.ARTEN)


@app.route("/api/projekt/<int:pid>", methods=["GET", "PUT"])
def projekt(pid):
    x = _nur_admin()
    if x:
        return x
    with db.tx() as c:
        if request.method == "PUT":
            Z.projekt_einst_setzen(c, pid, request.get_json(silent=True) or {})
        return jsonify(Z.projekt_einst(c, pid))


@app.get("/api/konten")
def konten():
    x = _nur_admin()
    if x:
        return x
    with db.tx() as c:
        return jsonify(konten=Z.konten(c), buero_satz=Z.buero_satz(c))


@app.route("/api/person/<int:uid>", methods=["GET", "PUT"])
def person(uid):
    x = _nur_admin()
    if x:
        return x
    with db.tx() as c:
        if request.method == "PUT":
            Z.person_setzen(c, uid, request.get_json(silent=True) or {})
        return jsonify(Z.person(c, uid))


@app.put("/api/buero_satz")
def buero_satz():
    x = _nur_admin()
    if x:
        return x
    v = str((request.get_json(silent=True) or {}).get("satz") or "").replace(",", ".").strip()
    try:
        v = str(float(v)) if v else ""
    except ValueError:
        return jsonify(error="Bitte eine Zahl eingeben."), 400
    with db.tx() as c:
        c.execute("INSERT INTO settings(key, value) VALUES('zeit_satz', ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (v,))
        return jsonify(buero_satz=Z.buero_satz(c))


@app.get("/api/export.csv")
def export():
    """Arbeitszeitnachweis eines Monats für alle (Lohn/Steuerbüro) – Excel öffnet die Datei direkt."""
    x = _nur_admin()
    if x:
        return x
    m = str(request.args.get("m") or Z.heute()[:7])[:7]
    with db.tx() as c:
        rows = Z.export_zeilen(c, m)
    buf = io.StringIO()
    wr = csv.writer(buf, delimiter=";")
    wr.writerow(["Mitarbeiter:in", "Datum", "Tag", "Kommen", "Gehen", "Pause", "Arbeitszeit", "Soll", "Abwesenheit / Feiertag", "bestätigt"])
    wr.writerows(rows)
    return Response("﻿" + buf.getvalue(), mimetype="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f"attachment; filename=Arbeitszeit_{m}.csv"})


@app.get("/api/export_projekte.csv")
def export_projekte():
    x = _nur_admin()
    if x:
        return x
    with db.tx() as c:
        P = Z.auswertung(c)
    buf = io.StringIO()
    wr = csv.writer(buf, delimiter=";")
    wr.writerow(["Projekt", "Leistungsphase", "Stunden", "Soll-Stunden"])
    for p in P:
        for k, n in Z.ARTEN:
            if p["arten"].get(k) or p["soll"].get(k):
                wr.writerow([p["name"], n, f"{p['arten'].get(k, 0) / 60:.2f}".replace(".", ","), str(p["soll"].get(k, "")).replace(".", ",")])
    return Response("﻿" + buf.getvalue(), mimetype="text/csv; charset=utf-8",
                    headers={"Content-Disposition": "attachment; filename=Projektzeiten.csv"})

