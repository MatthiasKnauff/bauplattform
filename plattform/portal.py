"""Startseite der Bauplattform: gemeinsame Anmeldung (SSO) und Übersicht der Apps.

/login     Anmeldeseite (auch Kennwortwechsel beim ersten Anmelden); ?next=<Adresse> führt danach zurück zur App.
/          Übersicht: Bautagebuch, Bauzeitenplan, Verwaltung (je nach Rechten).
"""
import re

from flask import g, jsonify, redirect, request

from bpcore import db, platform, sso
import common as C

app = C.make_app(__name__)


@app.get("/")
def index():
    u = C.current_user()
    if not u:
        return redirect("/login")
    if u["must_change"]:
        return redirect("/login")
    return C.page("portal.html")


@app.get("/login")
def login_page():
    return C.page("login.html")


@app.get("/api/me")
def me():
    u = C.current_user()
    return jsonify(ok=True, **C.public(u)) if u else jsonify(ok=False)


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(C.current_user()))


@app.post("/api/login")
def login():
    d = request.get_json(silent=True) or {}
    name = " ".join(str(d.get("name") or "").split())
    key = ("login", request.remote_addr, name.lower())
    if C.too_many(key):
        return jsonify(error="Zu viele Fehlversuche. Bitte in ein paar Minuten erneut versuchen."), 429
    with db.tx() as c:
        u = c.execute("SELECT * FROM users WHERE name=?", (name,)).fetchone()
    if not (u and C.check_pw(u, d.get("password"))):
        C.check_pw(None, d.get("password"))   # gleiche Rechenzeit, egal ob der Name existiert
        C.fail(key)
        C.audit(name[:60], "konto", "Anmeldung fehlgeschlagen", f"Startseite · {request.remote_addr or ''}")
        return jsonify(error="Name oder Kennwort ist falsch."), 401
    C.clear(key)
    if not u["active"]:
        return jsonify(error="Dieses Konto ist gesperrt. Bitte an die Verwaltung wenden."), 403
    with db.tx() as c:
        sso.revoke(c, request.cookies.get(sso.COOKIE))
        tok = sso.create(c, u["id"], request.remote_addr or "", request.user_agent.string, "portal")
    C.audit(u["name"], "konto", "Angemeldet", f"Startseite · {request.remote_addr or ''}")
    return sso.set_cookie(jsonify(ok=True, **C.public(u), next=C.safe_next(d.get("next"))), tok)


@app.post("/api/password")
def password():
    """Eigenes Kennwort ändern (Pflicht beim ersten Anmelden)."""
    u = C.current_user()
    if not u:
        return jsonify(error="Nicht angemeldet"), 401
    d = request.get_json(silent=True) or {}
    if not C.check_pw(u, d.get("old")):
        return jsonify(error="Das bisherige Kennwort stimmt nicht."), 400
    err = C.check_new(d.get("new"), u["name"], d.get("old"))
    if err:
        return jsonify(error=err), 400
    email = str(d.get("email") or "").strip()
    if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify(error="Die E-Mail-Adresse ist ungültig."), 400
    with db.tx() as c:
        if email:
            c.execute("UPDATE users SET email=? WHERE id=?", (email, u["id"]))
        c.execute("UPDATE users SET pass_hash=?, must_change=0, updated=datetime('now') WHERE id=?", (C.hash_pw(d["new"]), u["id"]))
        c.execute("DELETE FROM password_resets WHERE user_id=?", (u["id"],))
    C.audit(u["name"], "konto", "Kennwort geändert", "Startseite")
    return jsonify(ok=True)


@app.get("/api/links")
def links():
    """Für die Anmeldeseite: Adresse von „Kennwort vergessen“ (im Bautagebuch)."""
    return jsonify(forgot=C.app_base("bautagebuch") + "/#forgot")


C.wait_schema()
