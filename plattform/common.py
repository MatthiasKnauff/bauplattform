"""Gemeinsame Bausteine von Startseite (portal.py) und Verwaltung (admin.py)."""
import json, os, threading, time, urllib.error, urllib.request
from urllib.parse import quote, urlsplit

from flask import Flask, g, jsonify, request, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash

from bpcore import SCHEMA, db, head, platform, sso

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(HERE, "static")
MIN_LEN = 8
_fails = {}
_DUMMY = generate_password_hash("kein-benutzer")


def make_app(name):
    app = Flask(name, static_folder=None)
    app.json.sort_keys = False
    app.register_blueprint(head.blueprint())   # gemeinsame Kopfleiste (/bp/head.js, /api/bp/ki)
    if os.environ.get("TRUST_PROXY") == "1":   # hinter einem Reverse Proxy: X-Forwarded-* übernehmen
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    @app.before_request
    def csrf():
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            o = request.headers.get("Origin")
            if o and urlsplit(o).netloc != request.host:
                return jsonify(error="Anfrage von fremder Seite abgelehnt"), 403

    @app.after_request
    def headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "same-origin")
        if request.path.startswith("/api/") or resp.mimetype == "text/html":
            resp.headers["Cache-Control"] = "no-store"
        return resp

    @app.get("/static/<path:f>")
    def static_file(f):
        r = send_from_directory(STATIC, f, max_age=0)
        r.headers["Cache-Control"] = "no-cache"
        return r

    @app.get("/api/health")
    def health():
        return jsonify(ok=True, version=platform.version())

    @app.get("/api/brand")
    def brand():
        """Büroname aus den Einstellungen des Bautagebuchs (Anmeldeseite, Kopfzeile)."""
        try:
            with db.tx() as c:
                r = c.execute("SELECT value FROM settings WHERE key='office_name'").fetchone()
            name = (r["value"] if r else "") or ""
        except Exception:
            name = ""
        return jsonify(office=name, version=platform.version())

    @app.get("/logo.png")
    def logo():
        """Büro-Logo des Bautagebuchs (dort unter „Mein Profil“ hochgeladen) – 5 Minuten zwischengespeichert."""
        data = _logo_bytes()
        if not data:
            return "", 404
        return data, 200, {"Content-Type": "image/png", "Cache-Control": "max-age=300"}

    @app.post("/api/logout")
    def logout():
        """Abmelden – gilt für alle Apps (gemeinsame Sitzung)."""
        u = current_user()
        with db.tx() as c:
            sso.revoke_req(c, request)
        if u:
            audit(u["name"], "konto", "Abgemeldet", {"portal": "Startseite", "admin": "Verwaltung"}.get(name, name))
        return sso.clear_cookie(jsonify(ok=True, login=login_url()))

    return app


BT_INTERNAL = os.environ.get("BAUTAGEBUCH_INTERNAL", "http://bautagebuch:8000").rstrip("/")
_logo = {"t": 0, "data": None}
_llock = threading.Lock()


def _logo_bytes():
    with _llock:
        if time.time() - _logo["t"] > 300:
            try:
                with urllib.request.urlopen(BT_INTERNAL + "/api/favicon?s=192", timeout=3) as r:
                    _logo["data"] = r.read() if r.status == 200 else None
            except Exception:
                _logo["data"] = None
            _logo["t"] = time.time()
        return _logo["data"]


def bt_api(method, path, body=None):
    """Bautagebuch im Docker-Netz aufrufen – mit der Anmeldung des aktuellen Benutzers (gemeinsame Sitzung, Cookie bp_sso).
    So gelten dort dieselben Rechte, und das Bautagebuch erledigt Anlegen/Löschen selbst (inkl. Dateien im eigenen Laufwerk)."""
    with db.tx() as c:
        tok = sso.current_token(request, c)
    req = urllib.request.Request(BT_INTERNAL + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Cookie": f"{sso.COOKIE}={tok}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode() or "null")
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read().decode() or "{}").get("error")
        except ValueError:
            msg = None
        raise RuntimeError(msg or f"Bautagebuch antwortet mit Fehler {e.code}")
    except Exception as e:
        raise RuntimeError("Bautagebuch nicht erreichbar: " + str(e)[:120])


def current_user():
    with db.tx() as c:
        return sso.current(c, request)


def page(name):
    return send_from_directory(STATIC, name, max_age=0)


def public(u):
    return {"id": u["id"], "name": u["name"], "email": u["email"], "is_admin": bool(u["is_admin"]), "must_change": bool(u["must_change"]),
            "accent": u["accent"] or "", "theme": sso.theme_of(u) or "dunkel", "apps": sso.apps_of(u)}


# ---- Kennwörter (gleiches Verfahren wie im Bautagebuch: werkzeug-Hash)
def check_pw(user, pw):
    return check_password_hash(user["pass_hash"] if user else _DUMMY, pw or "") and bool(user)


def check_new(pw, name="", old=None):
    if len(pw or "") < MIN_LEN:
        return f"Das neue Kennwort braucht mindestens {MIN_LEN} Zeichen."
    if pw == old:
        return "Das neue Kennwort muss sich vom alten unterscheiden."
    if pw.lower() in (name.lower(), "admin", "passwort", "password"):
        return "Dieses Kennwort ist zu einfach."
    return None


def hash_pw(pw):
    return generate_password_hash(pw)


# ---- Anmelde-Bremse (je Prozess)
def too_many(key, limit=5, window=600):
    now = time.time()
    _fails[key] = [t for t in _fails.get(key, []) if now - t < window]
    return len(_fails[key]) >= limit


def fail(key):
    _fails.setdefault(key, []).append(time.time())


def clear(key):
    _fails.pop(key, None)


def audit(user, cat, action, detail=""):
    """In das Protokoll des Bautagebuchs schreiben (Tabelle audit_log)."""
    from datetime import datetime
    try:
        with db.tx() as c:
            c.execute("INSERT INTO audit_log(ts, user_name, cat, action, detail) VALUES(?,?,?,?,?)",
                      (datetime.now().isoformat(timespec="seconds").replace("T", " "), user or "", cat, action, detail or ""))
    except Exception:
        pass


def app_base(key):
    """Adresse einer App für Weiterleitungen.
    - Seite über eine Proxy-Adresse aufgerufen (z. B. https://bauportal.firma.de) → eingetragene Adresse der App.
    - Seite direkt über IP/Rechnername und Port aufgerufen (ohne Nginx) → gleicher Rechnername, Port der App.
      So bleibt die Anmeldung auf demselben Rechner (Cookies gelten je Rechnername), sonst käme man nie an."""
    a = next(x for x in platform.apps() if x["key"] == key)
    u = urlsplit(request.host_url)
    if a["url"] and platform.is_proxied(u.hostname):
        return a["url"]
    return f"{u.scheme}://{u.hostname}:{a['port']}"


def safe_next(nxt):
    """Nur Ziele auf demselben Rechner oder bei einer der eingetragenen App-Adressen (kein offener Weiterleiter)."""
    if not nxt:
        return ""
    try:
        u = urlsplit(nxt)
    except ValueError:
        return ""
    if u.scheme not in ("http", "https") or not u.hostname:
        return ""
    allowed = {urlsplit(request.host_url).hostname} | {urlsplit(a["url"]).hostname for a in platform.apps() if a["url"]}
    return nxt if u.hostname in allowed else ""


def login_url(nxt=""):
    return app_base("portal") + "/login" + (f"?next={quote(nxt, safe='')}" if nxt else "")


def wait_schema():
    db.wait_for_schema(SCHEMA, log=lambda m: print(m, flush=True))
