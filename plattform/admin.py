"""Verwaltung der Bauplattform (eigener Container, nur für Administratoren).

Benutzer und ihre App-Rechte, Sperren, Kennwort zurücksetzen, angemeldete Sitzungen, Zustand der Dienste und der
Datenbank, Protokoll. Die Benutzer sind dieselben wie im Bautagebuch (gemeinsame Tabelle users).
"""
import json, os, re, secrets, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime

from flask import Response, g, jsonify, redirect, request

from bpcore import db, platform, sso
import common as C

app = C.make_app(__name__)
NAME_MAX = 40
_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
SERVICES = [  # interne Adressen im Docker-Netz
    ("bauportal", "Verteiler (eine Adresse für alle Apps)", os.environ.get("ROUTER_INTERNAL", "http://bauportal:8090") + "/_verteiler/health"),
    ("bautagebuch", "Bautagebuch", os.environ.get("BAUTAGEBUCH_INTERNAL", "http://bautagebuch:8000") + "/api/platform"),
    ("gantt", "Bauzeitenplan", os.environ.get("GANTT_INTERNAL", "http://gantt:8082") + "/api/health"),
    ("portal", "Startseite / Anmeldung", os.environ.get("PORTAL_INTERNAL", "http://portal:8090") + "/api/health"),
    ("adressen", "Adressen", os.environ.get("ADRESSEN_INTERNAL", "http://adressen:8093") + "/api/health"),
    ("baukosten", "Baukosten", os.environ.get("BAUKOSTEN_INTERNAL", "http://baukosten:8094") + "/api/health"),
]
if os.environ.get("OLLAMA_URL"):   # eigene KI im Büro
    SERVICES.append(("ollama", "KI im Büro (Ollama)", os.environ["OLLAMA_URL"].rstrip("/") + "/api/version"))


@app.before_request
def guard():
    p = request.path
    if p.startswith("/static/") or p == "/api/health":
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base("admin") + "/")), 401
        return redirect(C.login_url(request.url))
    if not u["is_admin"]:
        if p.startswith("/api/"):
            return jsonify(error="Nur für Administratoren."), 403
        return ("Die Verwaltung ist nur für Administratoren. <a href=\"" + C.app_base("portal") + "/\">Zur Startseite</a>",
                403, {"Content-Type": "text/html; charset=utf-8"})
    g.user = u


@app.get("/")
def index():
    return C.page("admin.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


# ---------------------------------------------------------------- Benutzer
def _user_out(r, seen):
    return {"id": r["id"], "name": r["name"], "vorname": C._col(r, "vorname"), "nachname": C._col(r, "nachname"), "full": C.full_name(r), "email": r["email"], "is_admin": bool(r["is_admin"]), "active": bool(r["active"]),
            "must_change": bool(r["must_change"]), "apps": sso.apps_of(r), "apps_all": not (r["apps"] or "").strip(),
            "last_seen": seen.get(r["id"], (0, 0))[0], "sessions": seen.get(r["id"], (0, 0))[1], "created": r["created"]}


def _seen(c):
    return {r["user_id"]: (r["seen"], r["n"]) for r in c.execute(
        "SELECT user_id, MAX(seen) AS seen, COUNT(*) AS n FROM sso_sessions WHERE expires>=? GROUP BY user_id", (int(time.time()),))}


def _apps_value(d):
    """Liste der Apps → Feld users.apps. Alle Apps angehakt = '' (dann gelten auch künftige Apps)."""
    keys = [k for k, _ in sso.APPS]
    want = [k for k in keys if k in (d.get("apps") or [])]
    return "" if set(want) == set(keys) else json.dumps(want)


def _clean_name(n):
    return " ".join(str(n or "").split())[:NAME_MAX]


def _gen_pw():
    return "".join(secrets.choice(_ALPHABET) for _ in range(12))


def _admins_left(c, without_id):
    return c.execute("SELECT COUNT(*) FROM users WHERE is_admin=1 AND active=1 AND id!=?", (without_id,)).fetchone()[0]


@app.get("/api/users")
def users():
    with db.tx() as c:
        seen = _seen(c)
        return jsonify(users=[_user_out(r, seen) for r in c.execute("SELECT * FROM users ORDER BY is_admin DESC, name")],
                       apps=[{"key": k, "name": n} for k, n in sso.APPS])


@app.post("/api/users")
def create_user():
    d = request.get_json(silent=True) or {}
    name, email = _clean_name(d.get("name")), str(d.get("email") or "").strip()
    if len(name) < 2:
        return jsonify(error="Bitte einen Namen mit mindestens 2 Zeichen eingeben."), 400
    if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify(error="Die E-Mail-Adresse ist ungültig."), 400
    pw = _gen_pw()
    try:
        with db.tx() as c:
            uid = c.execute("INSERT INTO users(name, vorname, nachname, email, pass_hash, is_admin, must_change, apps) VALUES(?,?,?,?,?,?,1,?) RETURNING id",
                            (name, _clean_name(d.get("vorname") or "")[:60], _clean_name(d.get("nachname") or "")[:60], email, C.hash_pw(pw),
                             1 if d.get("is_admin") else 0, _apps_value(d))).fetchone()[0]
    except db.IntegrityError:
        return jsonify(error=f"Den Namen „{name}“ gibt es schon."), 400
    C.audit(g.user["name"], "verwaltung", "Benutzer angelegt", name)
    return jsonify(ok=True, id=uid, password=pw)


@app.put("/api/users/<int:uid>")
def update_user(uid):
    d = request.get_json(silent=True) or {}
    with db.tx() as c:
        u = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
        if not u:
            return jsonify(error="Benutzer nicht gefunden"), 404
        sets, notes = {}, []
        if "name" in d:
            n = _clean_name(d["name"])
            if len(n) < 2:
                return jsonify(error="Bitte einen Namen mit mindestens 2 Zeichen eingeben."), 400
            if n != u["name"]:
                if u["name"].lower() == "admin":
                    return jsonify(error="Der Benutzer „admin“ kann nicht umbenannt werden."), 400
                sets["name"] = n
                notes.append(f"Name → {n}")
        for k in ("vorname", "nachname"):
            if k in d:
                v = _clean_name(d[k] or "")[:60]
                if v != C._col(u, k):
                    sets[k] = v
                    notes.append(f"{'Vorname' if k == 'vorname' else 'Nachname'} → {v or '–'}")
        if "email" in d:
            e = str(d["email"] or "").strip()
            if e and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", e):
                return jsonify(error="Die E-Mail-Adresse ist ungültig."), 400
            sets["email"] = e
        if "is_admin" in d:
            v = 1 if d["is_admin"] else 0
            if not v and u["is_admin"] and uid == g.user["id"]:
                return jsonify(error="Du kannst dir die Administratorrechte nicht selbst entziehen."), 400
            if not v and u["is_admin"] and not _admins_left(c, uid):
                return jsonify(error="Es muss mindestens einen aktiven Administrator geben."), 400
            if v != u["is_admin"]:
                sets["is_admin"] = v
                notes.append("Administrator" if v else "kein Administrator")
        if "apps" in d:
            sets["apps"] = _apps_value(d)
            notes.append("Apps: " + (", ".join(n for k, n in sso.APPS if k in (d.get("apps") or [])) or "keine"))
        if "active" in d:
            v = 1 if d["active"] else 0
            if not v and uid == g.user["id"]:
                return jsonify(error="Du kannst dich nicht selbst sperren."), 400
            if not v and u["is_admin"] and not _admins_left(c, uid):
                return jsonify(error="Es muss mindestens einen aktiven Administrator geben."), 400
            if v != u["active"]:
                sets["active"] = v
                notes.append("entsperrt" if v else "gesperrt")
                if not v:
                    sso.revoke_user(c, uid)
        if sets:
            try:
                with c.savepoint():
                    c.execute(f"UPDATE users SET {', '.join(k + '=?' for k in sets)}, updated=datetime('now') WHERE id=?", list(sets.values()) + [uid])
            except db.IntegrityError:
                return jsonify(error="Diesen Namen gibt es schon."), 400
    if notes:
        C.audit(g.user["name"], "verwaltung", "Benutzer geändert", f"{u['name']}: {', '.join(notes)}")
    return jsonify(ok=True)


@app.post("/api/users/<int:uid>/password")
def reset_password(uid):
    """Neues Startkennwort (einmal angezeigt), muss beim nächsten Anmelden geändert werden; alle Sitzungen enden."""
    pw = _gen_pw()
    with db.tx() as c:
        u = c.execute("SELECT name FROM users WHERE id=?", (uid,)).fetchone()
        if not u:
            return jsonify(error="Benutzer nicht gefunden"), 404
        c.execute("UPDATE users SET pass_hash=?, must_change=1, updated=datetime('now') WHERE id=?", (C.hash_pw(pw), uid))
        c.execute("DELETE FROM password_resets WHERE user_id=?", (uid,))
        if uid != g.user["id"]:
            sso.revoke_user(c, uid)
    C.audit(g.user["name"], "verwaltung", "Kennwort zurückgesetzt", u["name"])
    return jsonify(ok=True, password=pw)


@app.delete("/api/users/<int:uid>")
def delete_user(uid):
    with db.tx() as c:
        u = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
        if not u:
            return jsonify(ok=True)
        if uid == g.user["id"]:
            return jsonify(error="Du kannst dich nicht selbst löschen."), 400
        if u["name"].lower() == "admin":
            return jsonify(error="Der Benutzer „admin“ kann nicht gelöscht werden."), 400
        if u["is_admin"] and not _admins_left(c, uid):
            return jsonify(error="Es muss mindestens einen aktiven Administrator geben."), 400
        c.execute("DELETE FROM users WHERE id=?", (uid,))
    C.audit(g.user["name"], "verwaltung", "Benutzer gelöscht", u["name"])
    return jsonify(ok=True)


# ---------------------------------------------------------------- Sitzungen
@app.get("/api/sessions")
def sessions():
    with db.tx() as c:
        mine = sso._h(sso.current_token(request, c) or "")
        rows = c.execute("SELECT s.token_hash, s.created, s.seen, s.expires, s.ip, s.agent, s.app, u.name FROM sso_sessions s "
                         "JOIN users u ON u.id=s.user_id WHERE s.expires>=? ORDER BY s.seen DESC", (int(time.time()),)).fetchall()
    return jsonify([{"id": r["token_hash"][:16], "name": r["name"], "created": r["created"], "seen": r["seen"], "ip": r["ip"],
                     "agent": _agent(r["agent"]), "app": r["app"], "mine": r["token_hash"] == mine} for r in rows])


def _agent(a):
    a = a or ""
    dev = "iPhone" if "iPhone" in a else "iPad" if "iPad" in a else "Android" if "Android" in a else "Windows" if "Windows" in a else "Mac" if "Mac OS" in a else "Linux" if "Linux" in a else ""
    br = "Edge" if "Edg/" in a else "Chrome" if "Chrome/" in a else "Firefox" if "Firefox/" in a else "Safari" if "Safari/" in a else ""
    return " · ".join(x for x in (br, dev) if x) or (a[:40] if a else "unbekannt")


@app.delete("/api/sessions/<sid>")
def end_session(sid):
    if not re.fullmatch(r"[0-9a-f]{16}", sid):
        return jsonify(error="Ungültig"), 400
    with db.tx() as c:
        r = c.execute("SELECT s.token_hash, u.name FROM sso_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash LIKE ?", (sid + "%",)).fetchone()
        if r:
            c.execute("DELETE FROM sso_sessions WHERE token_hash=?", (r["token_hash"],))
    if r:
        C.audit(g.user["name"], "verwaltung", "Sitzung beendet", r["name"])
    return jsonify(ok=True)


@app.post("/api/users/<int:uid>/logout")
def logout_user(uid):
    with db.tx() as c:
        u = c.execute("SELECT name FROM users WHERE id=?", (uid,)).fetchone()
        sso.revoke_user(c, uid)
    if u:
        C.audit(g.user["name"], "verwaltung", "Überall abgemeldet", u["name"])
    return jsonify(ok=True)


# ---------------------------------------------------------------- Zustand
def _probe(url):
    t = time.time()
    try:
        with urllib.request.urlopen(url, timeout=3) as r:
            body = json.loads(r.read().decode() or "{}")
            return {"ok": r.status == 200, "ms": int((time.time() - t) * 1000), "version": body.get("version", "")}
    except Exception as e:
        return {"ok": False, "ms": int((time.time() - t) * 1000), "error": str(e)[:160]}


@app.get("/api/status")
def status():
    svc = [{"key": k, "name": n, **_probe(u)} for k, n, u in SERVICES]
    svc.append({"key": "admin", "name": "Verwaltung", "ok": True, "ms": 0, "version": platform.version()})
    for x in svc:
        if x["key"] == "ollama" and x["ok"]:   # läuft – aber ist das Modell schon geladen?
            from bpcore import ai
            st = ai.ollama_state()
            x["version"] = (x["version"] + " · " if x["version"] else "") + st["hint"]
            x["ok"] = st["ok"]
            if not st["ok"]:
                x["error"] = st["hint"]
    with db.tx() as c:
        dbinfo = {
            "schema": c.execute("SELECT COALESCE(MAX(version),0) FROM schema_migrations").fetchone()[0],
            "size": c.execute("SELECT pg_size_pretty(pg_database_size(current_database()))").fetchone()[0],
            "server": c.execute("SHOW server_version").fetchone()[0].split(" ")[0],
        }
        counts = {}
        for label, sql in (("Benutzer", "SELECT COUNT(*) FROM users"), ("Bautagebuch-Projekte", "SELECT COUNT(*) FROM projects"),
                           ("Tagesberichte", "SELECT COUNT(*) FROM reports"), ("Fotos", "SELECT COUNT(*) FROM images"),
                           ("Kontakte / Firmen", "SELECT COUNT(*) FROM contacts"), ("Bauzeitenpläne", "SELECT COUNT(*) FROM gantt_projects"),
                           ("davon mit Projekt verknüpft", "SELECT COUNT(*) FROM gantt_projects WHERE project_id IS NOT NULL"),
                           ("Angemeldete Sitzungen", f"SELECT COUNT(*) FROM sso_sessions WHERE expires>={int(time.time())}")):
            counts[label] = c.execute(sql).fetchone()[0]
        init = c.execute("SELECT data FROM gantt_store WHERE key='_init'").fetchone()
    return jsonify(version=platform.version(), services=svc, db=dbinfo, counts=counts,
                   gantt_init=json.loads(init["data"]) if init else None, time=datetime.now().isoformat(timespec="seconds"))


@app.get("/api/audit")
def audit_log():
    cat = request.args.get("cat", "")
    with db.tx() as c:
        q = "SELECT ts, user_name, cat, action, detail, project FROM audit_log"
        args = ()
        if cat in ("konto", "verwaltung"):
            q += " WHERE cat=?"
            args = (cat,)
        rows = c.execute(q + " ORDER BY id DESC LIMIT 300", args).fetchall()
    return jsonify([r.dict() for r in rows])


# ---------------------------------------------------------------- Projekte (über alle Apps)
_bt = C.bt_api   # Bautagebuch mit der Anmeldung des Administrators aufrufen (siehe common.py)


def _addr(r):
    return ", ".join(x for x in (r["street"], " ".join(y for y in (r["zip"], r["city"]) if y)) if x)


@app.get("/api/projects")
def projects_all():
    """Projekte über alle Apps (siehe common.projects_overview)."""
    with db.tx() as c:
        return jsonify(C.projects_overview(c))


@app.get("/api/folders")
def folders():
    """Ordnernamen auf dem Server (Ablage des Bautagebuchs) als Vorschlag für den Projektnamen."""
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify([])
    try:
        from urllib.parse import quote
        r = _bt("GET", "/api/store/folders?q=" + quote(q))
        return jsonify(r if isinstance(r, list) else [])
    except RuntimeError:
        return jsonify([])


@app.get("/api/leaders")
def leaders():
    """Benutzer, für die ein Projekt freigegeben werden kann (wie „Zuständige Bauleiter“ im Bautagebuch)."""
    with db.tx() as c:
        rows = c.execute("SELECT * FROM users WHERE lower(name)!='admin' ORDER BY name").fetchall()
    return jsonify([{"id": r["id"], "name": C.full_name(r), "login": r["name"], "active": bool(r["active"]), "bt": sso.has_app(r, "bautagebuch"), "admin": bool(r["is_admin"])} for r in rows])


PFIELDS = ("name", "client", "street", "zip", "city", "folder")


def _pbody(b):
    d = {k: " ".join(str(b.get(k) or "").split())[:300] for k in PFIELDS if k in b}
    if "leaders" in b and isinstance(b["leaders"], list):
        d["leaders"] = [int(x) for x in b["leaders"] if str(x).isdigit()][:200]
    if "archived" in b:
        d["archived"] = 1 if b["archived"] else 0
    return d


@app.post("/api/projects/neu")
def project_new():
    """Projekt im Bautagebuch anlegen (das Bautagebuch ermittelt dabei Standort und Adresse wie gewohnt)."""
    d = _pbody(request.get_json(silent=True) or {})
    if not d.get("name"):
        return jsonify(error="Bitte einen Namen für das Bauvorhaben eingeben."), 400
    try:
        r = _bt("POST", "/api/projects", d)
    except RuntimeError as e:
        return jsonify(error=str(e)), 502
    C.audit(g.user["name"], "verwaltung", "Projekt angelegt", d["name"])
    return jsonify(ok=True, id=r.get("id"), auto_address=r.get("auto_address"))


@app.put("/api/projects/<int:pid>")
def project_edit(pid):
    """Projekt ändern: Name, Bauherr, Adresse, freigegebene Benutzer, archivieren – über das Bautagebuch."""
    d = _pbody(request.get_json(silent=True) or {})
    if "name" in d and not d["name"]:
        return jsonify(error="Der Name darf nicht leer sein."), 400
    with db.tx() as c:
        r = c.execute("SELECT name FROM projects WHERE id=?", (pid,)).fetchone()
    if not r:
        return jsonify(error="Projekt nicht gefunden"), 404
    try:
        _bt("PUT", f"/api/projects/{pid}", d)
    except RuntimeError as e:
        return jsonify(error=str(e)), 502
    what = "archiviert" if d.get("archived") == 1 else "aus dem Archiv geholt" if d.get("archived") == 0 and len(d) == 1 else "geändert"
    C.audit(g.user["name"], "verwaltung", f"Projekt {what}", d.get("name") or r["name"])
    return jsonify(ok=True)


@app.post("/api/projects/bautagebuch")
def project_create_bt():
    """Für einen Bauzeitenplan / eine Kostenermittlung ohne Bautagebuch das Projekt im Bautagebuch anlegen und verknüpfen."""
    b = request.get_json(silent=True) or {}
    name = " ".join(str(b.get("name") or "").split())[:200]
    if not name:
        return jsonify(error="Bitte einen Projektnamen eingeben."), 400
    plans = [str(x)[:80] for x in (b.get("plans") or [])][:50]
    bks = [int(x) for x in (b.get("bks") or []) if isinstance(x, int)][:200]
    try:
        r = _bt("POST", "/api/projects", {"name": name})
    except RuntimeError as e:
        return jsonify(error=str(e)), 502
    pid = r.get("id")
    with db.tx() as c:
        for x in plans:
            c.execute("UPDATE gantt_projects SET project_id=? WHERE id=?", (pid, x))
        for x in bks:
            c.execute("UPDATE bk_projects SET project_id=? WHERE id=?", (pid, x))
    C.audit(g.user["name"], "verwaltung", "Bautagebuch-Projekt angelegt", f"{name} · verknüpft: {len(plans)} Pläne, {len(bks)} Kostenermittlungen")
    return jsonify(ok=True, id=pid)


@app.post("/api/projects/delete")
def project_delete():
    """Teile eines Projekts löschen – je App getrennt wählbar."""
    b = request.get_json(silent=True) or {}
    done, errors = [], []
    with db.tx() as c:
        for x in [str(v)[:80] for v in (b.get("plans") or [])][:50]:
            r = c.execute("SELECT name FROM gantt_projects WHERE id=?", (x,)).fetchone()
            if r:
                c.execute("DELETE FROM gantt_presence WHERE gantt_id=?", (x,))
                c.execute("DELETE FROM gantt_projects WHERE id=?", (x,))   # Versionen werden mitgelöscht
                done.append(f"Bauzeitenplan „{r['name']}“")
        for x in [int(v) for v in (b.get("bks") or []) if isinstance(v, int)][:200]:
            r = c.execute("SELECT name FROM bk_projects WHERE id=?", (x,)).fetchone()
            if r:
                c.execute("DELETE FROM bk_projects WHERE id=?", (x,))   # Pläne (PDF) werden mitgelöscht
                done.append(f"Kostenermittlung „{r['name']}“")
    bt = b.get("bt")
    if isinstance(bt, int):
        with db.tx() as c:
            r = c.execute("SELECT name FROM projects WHERE id=?", (bt,)).fetchone()
        if r:
            try:
                _bt("DELETE", f"/api/projects/{bt}")
                done.append(f"Bautagebuch-Projekt „{r['name']}“ mit Berichten und Fotos")
            except RuntimeError as e:
                errors.append(str(e))
    for d in done:
        C.audit(g.user["name"], "verwaltung", "Gelöscht", d)
    if errors and not done:
        return jsonify(error="; ".join(errors)), 502
    return jsonify(ok=True, done=done, errors=errors)


# ---------------------------------------------------------------- Einstellungen (zentral für alle Apps)
def _put_store(c, key, val):
    c.execute("INSERT INTO gantt_store(key, data, updated, updated_by) VALUES(?,?,?,?) "
              "ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by",
              (key, json.dumps(val, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), g.user["name"]))


def _hint(k):
    return ("…" + k[-4:]) if k else ""


def _einst(c):
    from bpcore import ai
    st = ai.store(c, "settings").get("ai") or {}
    cl = ai.claude_conf(c)
    gm, oa = ai.ext_conf(c, "gemini"), ai.ext_conf(c, "chatgpt")
    oll = ai.ollama_state()
    return {
        "ki": {
            "vorschlag": st.get("mode") if st.get("mode") in ("off", "builtin", "ai") else "builtin",
            "claude": {"hasKey": bool(cl["key"]), "hint": _hint(cl["key"]), "fromEnv": not st.get("key") and bool(os.environ.get("ANTHROPIC_API_KEY")),
                       "model": cl["model"], "models": ai.CLAUDE_MODELS},
            "gemini": {"hasKey": bool(gm["key"]), "hint": _hint(gm["key"]), "fromEnv": gm["fromEnv"], "model": gm["model"]},
            "chatgpt": {"hasKey": bool(oa["key"]), "hint": _hint(oa["key"]), "fromEnv": oa["fromEnv"], "model": oa["model"]},
            "ollama": {"url": bool(ai.ollama_url()), "model": ai.ollama_model(), "ok": oll["ok"], "hint": oll["hint"], "models": oll["models"]},
        },
    }


@app.route("/api/einstellungen", methods=["GET", "PUT"])
def einstellungen():
    with db.tx() as c:
        if request.method == "PUT":
            from bpcore import ai
            b = request.get_json(silent=True) or {}
            ki = b.get("ki") if isinstance(b.get("ki"), dict) else None
            changed = []
            if ki:
                st = ai.store(c, "settings")
                a = dict(st.get("ai") or {})
                if ki.get("vorschlag") in ("off", "builtin", "ai"):
                    a["mode"] = ki["vorschlag"]
                cl = ki.get("claude") if isinstance(ki.get("claude"), dict) else {}
                if cl.get("model") in ai.CLAUDE_MODELS:
                    a["model"] = cl["model"]
                if cl.get("clearKey"):
                    a.pop("key", None); changed.append("Claude-Schlüssel entfernt")
                elif isinstance(cl.get("key"), str) and cl["key"].strip():
                    a["key"] = cl["key"].strip()[:300]; changed.append("Claude-Schlüssel")
                st["ai"] = a
                _put_store(c, "settings", st)
                pl = ai.store(c, "plattform")
                pk = dict(pl.get("ki") or {})
                for prov in ("gemini", "chatgpt"):
                    x = ki.get(prov) if isinstance(ki.get(prov), dict) else {}
                    cur = dict(pk.get(prov) or {})
                    if isinstance(x.get("model"), str) and x["model"].strip():
                        cur["model"] = x["model"].strip()[:80]
                    if x.get("clearKey"):
                        cur.pop("key", None); changed.append(f"{prov}-Schlüssel entfernt")
                    elif isinstance(x.get("key"), str) and x["key"].strip():
                        cur["key"] = x["key"].strip()[:300]; changed.append(f"{prov}-Schlüssel")
                    pk[prov] = cur
                pl["ki"] = pk
                _put_store(c, "plattform", pl)
            C.audit(g.user["name"], "verwaltung", "Einstellungen geändert", ", ".join(changed) or "KI")
        return jsonify(_einst(c))


@app.post("/api/einstellungen/ki-test")
def ki_test():
    from bpcore import ai
    prov = str((request.get_json(silent=True) or {}).get("provider") or "")
    if prov not in ("claude", "gemini", "chatgpt", "ollama"):
        return jsonify(error="Unbekannter Anbieter"), 400
    try:
        with db.tx() as c:
            t = ai.ask(prov, "Antworte nur mit dem Wort OK.", "Test", 20, c)
        return jsonify(ok=True, answer=(t or "").strip()[:40])
    except ai.AIError as e:
        return jsonify(error=str(e)), 502


# ---------------------------------------------------------------- Allgemeine Einstellungen des Bautagebuchs
# Firma & Logo, Ablage, Mailserver und Datensicherung gehören dem Bautagebuch (es verschickt die Mails, legt die Fotos ab und
# sichert die Datenbank). Die Verwaltung zeigt dieselben Einstellungen und reicht die Aufrufe mit der Anmeldung des Benutzers
# an das Bautagebuch weiter – beide Stellen bearbeiten also dieselben Daten.
BT_PASS = re.compile(r"^(settings|logo|mail/test|store/(test|run|backfill|status)|backups(/[^/]+(/(download|restore))?)?)$")


@app.route("/api/bt/<path:p>", methods=["GET", "POST", "PUT", "DELETE"])
def bt_pass(p):
    if not BT_PASS.match(p):
        return jsonify(error="Nicht vorgesehen"), 404
    with db.tx() as c:
        tok = sso.current_token(request, c)
    data = request.get_data() if request.method in ("POST", "PUT") else None
    h = {"Cookie": f"{sso.COOKIE}={tok}"}
    if request.content_type:
        h["Content-Type"] = request.content_type
    q = request.query_string.decode()
    req = urllib.request.Request(C.BT_INTERNAL + "/api/" + urllib.parse.quote(p) + ("?" + q if q else ""), method=request.method, data=data, headers=h)
    try:
        r = urllib.request.urlopen(req, timeout=300)
        code = r.status
    except urllib.error.HTTPError as e:
        r, code = e, e.code
    except Exception as e:
        return jsonify(error="Bautagebuch nicht erreichbar: " + str(e)[:120]), 502
    body = r.read()
    keep = {k: v for k, v in r.headers.items() if k.lower() in ("content-type", "content-disposition")}
    if request.method != "GET" and code < 400:
        C.audit(g.user["name"], "verwaltung", "Bautagebuch-Einstellung", f"{request.method} {p.split('/')[0]}")
    return Response(body, status=code, headers=keep)


C.wait_schema()
