import importlib, os, pkgutil
from datetime import timedelta
from flask import Flask, g, jsonify, request, send_from_directory, session
from werkzeug.middleware.proxy_fix import ProxyFix

import modules
from core import access, audit, auth, backups, db, extern, reminders, storage, sync, versions
from bpcore import head, platform, sso   # gemeinsame Anmeldung der Bauplattform (shared/bpcore)
from bpcore import fehler   # stille Fehler für die Verwaltung festhalten

OPEN = ("/api/login", "/api/me", "/api/forgot", "/api/reset", "/api/favicon", "/api/platform")   # favicon: auch auf der Anmeldeseite
NO_SSO = ("/api/login", "/api/forgot", "/api/reset", "/api/favicon", "/api/platform", "/api/logout")   # hier keine Sitzung übernehmen/anlegen
MUST_CHANGE_OK = ("/api/me", "/api/logout", "/api/password")


def admin_only(path, method):
    """Bereiche, die nur der Administrator sehen/ändern darf."""
    return (path.startswith(("/api/users", "/api/mail", "/api/export", "/api/audit", "/api/backups"))
            or (path.startswith("/api/store/") and path not in ("/api/store/folders", "/api/store/path", "/api/store/names", "/api/store/rename-check", "/api/store/rename-apply"))
            or (path == "/api/settings" and method != "GET")
            or (path == "/api/logo" and method != "GET"))


def _secret_key():
    """SECRET_KEY aus der Umgebung – fehlt er oder ist es der Platzhalter aus der Beispieldatei, wird ein
    zufälliger Schlüssel einmalig erzeugt und im Datenordner abgelegt (sonst könnte jeder Sitzungen fälschen)."""
    k = os.environ.get("SECRET_KEY", "")
    if k and k not in ("lange-zufaellige-zeichenfolge", "dev-nur-zum-testen", "x") and len(k) >= 16:
        return k
    f = os.path.join(db.DATA, ".secret_key")
    try:
        with open(f) as fh:
            if len(fh.read().strip()) >= 32: return open(f).read().strip()
    except OSError:
        pass
    import secrets
    new = secrets.token_hex(32)
    with os.fdopen(os.open(f, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w") as fh:
        fh.write(new)
    return new


def create_app():
    db.migrate()  # Schema auf den neuesten Stand bringen (mit Sicherung)
    with db.tx() as _c:
        converted = storage.convert_legacy(_c)  # alte Nicht-JPG-Fotos (HEIC, PNG, WEBP, GIF) -> JPG
        if converted:   # schon auf dem Server abgelegte Dateien dort ebenfalls umbenennen (neue Endung .jpg)
            from core import settings as _s
            _conf = _s.all(_c)
            for _i in converted:
                sync.rename_image(_c, _conf, _i)
    auth.ensure_admin()  # erster Start: Benutzer admin / Kennwort admin (muss sofort geändert werden)
    sync.start()  # Hintergrund-Übertragung auf den Server
    reminders.start()  # E-Mail-Erinnerungen für Erledigungsdaten
    backups.start()    # tägliche Datenbankversionen
    extern.start()     # nach einem Ausfall: Fotos und Logo vom Dateiserver zurückholen
    versions.start()   # Versionsverlauf der Berichte (automatische Momentaufnahmen)
    from modules import plaene as _pl
    _pl.start()        # Planordner der laufenden Projekte nachts vorab einlesen (Pläne & Dateien)
    app = Flask(__name__, static_folder="static", static_url_path="")
    app.secret_key = _secret_key()
    app.permanent_session_lifetime = timedelta(days=30)
    app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax", MAX_CONTENT_LENGTH=30 * 1024 * 1024)
    if os.environ.get("TRUST_PROXY") == "1":   # hinter einem Reverse Proxy: X-Forwarded-Proto/-Host/-For auswerten
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    else:   # nur den Pfad vom Verteiler (/bautagebuch) übernehmen
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=0, x_proto=0, x_host=0, x_prefix=1)
    app.config["SESSION_COOKIE_SECURE"] = os.environ.get("COOKIE_SECURE") == "1"   # Cookie nur über HTTPS (Produktion)
    app.register_blueprint(head.blueprint(lambda: g.get("user")))   # gemeinsame Kopfleiste der Bauplattform (/bp/head.js, /api/bp/ki)

    def sso_adopt():
        """Gemeinsame Anmeldung: Flask-Sitzung des Bautagebuchs und SSO-Sitzung der Plattform abgleichen.
        - Anmeldung auf der Startseite (SSO-Cookie, aber noch keine Bautagebuch-Sitzung) → hier ebenfalls angemeldet.
        - Woanders abgemeldet (SSO-Sitzung weg) → hier ebenfalls abgemeldet.
        - Wer noch aus der Zeit vor der Plattform angemeldet ist, bekommt einmalig eine SSO-Sitzung – niemand muss sich neu anmelden."""
        with db.tx() as c:
            su = sso.current(c, request)
            uid = session.get("uid")
            if su:
                if uid != su["id"]:
                    session.clear()
                    if sso.has_app(su, "bautagebuch"):
                        session.permanent = True
                        session["uid"] = su["id"]
                session["sso"] = 1
            elif uid:
                if session.get("sso"):          # SSO-Sitzung beendet (abgemeldet oder von der Verwaltung beendet)
                    session.clear()
                else:                           # alte Sitzung → SSO-Sitzung nachziehen
                    u = auth.get(c, uid)
                    if u:
                        g.sso_new = sso.create(c, uid, request.remote_addr or "", request.user_agent.string, "bautagebuch")
                        session["sso"] = 1
                    else:
                        session.clear()

    @app.after_request
    def headers(resp):
        if getattr(g, "sso_new", None):
            sso.set_cookie(resp, g.sso_new)
        if getattr(g, "sso_clear", False):
            sso.clear_cookie(resp)
        if getattr(g, "vrid", None) and resp.status_code < 400:
            versions.touch(g.vrid, g.user["name"])
        if getattr(g, "vrid", None) and resp.status_code < 400 and not request.path.endswith("/pdf"):   # Fotoordner-Name nachziehen
            try:
                with db.tx() as c:
                    from core import settings as _st
                    conf = _st.all(c)
                    if sync.enabled(conf) and sync.refresh_day(c, conf, g.vrid):
                        sync.wake()
            except Exception as e:
                fehler.still("bautagebuch", "Ablage: Fotoordner-Name nachziehen", e)
                pass
        if getattr(g, "actx", None) is not None and resp.status_code < 400:   # Auditprotokoll
            try:
                with db.tx() as c:
                    e = audit.describe(c, request.method, request.path, request.get_json(silent=True), resp.status_code, g.actx)
                    if e:
                        audit.log(c, g.user["name"], *e[:3], e[3], e[4], e[5])
            except Exception as e:
                fehler.still("bautagebuch", "Auditprotokoll schreiben", e)
                pass
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")          # kein Einbetten in fremde Seiten (Clickjacking)
        resp.headers.setdefault("Referrer-Policy", "same-origin")
        if request.path.startswith("/api/"):
            resp.headers.setdefault("Cache-Control", "no-store")
        resp.headers["Permissions-Policy"] = "geolocation=(self), camera=(self)"   # GPS und Kamera für die App erlauben
        return resp

    _pk_zeit = [0.0]

    @app.before_request
    def papierkorb_dateien():   # höchstens alle 10 Minuten: Fotos endgültig gelöschter Projekte vom Datenträger
        import time
        if time.time() - _pk_zeit[0] > 600:
            _pk_zeit[0] = time.time()
            from modules.projects import papierkorb_dateien as weg
            import threading
            threading.Thread(target=weg, daemon=True).start()

    @app.before_request
    def guard():
        p = request.path
        if not p.startswith(("/api/", "/uploads/")):
            return
        if p not in NO_SSO:
            sso_adopt()
        if p in OPEN:
            return
        with db.tx() as c:
            g.user = auth.get(c, session.get("uid"))
        if not g.user:
            session.clear()
            return jsonify(error="Nicht angemeldet"), 401
        if not sso.has_app(g.user, "bautagebuch"):
            return jsonify(error="Für das Bautagebuch ist dein Konto nicht freigeschaltet."), 403
        if g.user["must_change"] and p not in MUST_CHANGE_OK:
            return jsonify(error="Bitte zuerst ein neues Kennwort vergeben.", must_change=True), 403
        if admin_only(p, request.method) and not g.user["is_admin"]:
            return jsonify(error="Nur der Administrator darf das."), 403
        if not g.user["is_admin"]:   # Projekt nur für die eingetragenen Bauleiter sichtbar
            with db.tx() as c:
                if not access.can_see(c, g.user, access.project_of(c, p)):
                    return jsonify(error="Du hast keinen Zugriff auf dieses Projekt."), 403
        if request.method not in ("GET", "HEAD", "OPTIONS"):   # welcher Bericht wird verändert? (Versionsverlauf)
            with db.tx() as c:
                g.vrid = versions.report_of(c, request.method, p, request.get_json(silent=True))
                g.actx = audit.pre(c, request.method, p)

    @app.get("/")
    def index():
        return send_from_directory("static", "index.html")

    @app.get("/manifest.webmanifest")
    def manifest():
        """Damit Chrome/Edge/Safari „App installieren“ bzw. „Zum Home-Bildschirm“ mit dem Büro-Logo als Symbol anbieten."""
        icons = [{"src": f"/api/favicon?s={n}", "sizes": f"{n}x{n}", "type": "image/png", "purpose": "any"} for n in (192, 512)] if storage.logo_path() else []
        r = jsonify(name="Bautagebuch", short_name="Bautagebuch", start_url="./", scope="./", display="standalone",
                    background_color="#26272b", theme_color="#26272b", icons=icons)
        r.mimetype = "application/manifest+json"
        r.headers["Cache-Control"] = "no-cache"
        return r

    @app.get("/api/platform")
    def platform_conf():
        """Adressen der anderen Apps (App-Umschalter, Startseite)."""
        with db.tx() as c:
            u = auth.get(c, session.get("uid"))
        return jsonify(platform.config(u))

    @app.get("/api/me")
    def me():
        with db.tx() as c:
            u = auth.get(c, session.get("uid"))
        return jsonify(ok=True, **auth.public(u)) if u else jsonify(ok=False)

    @app.post("/api/login")
    def login():
        d = request.json or {}
        name = " ".join(str(d.get("name") or "").split())
        key = ("login", request.remote_addr, name.lower())
        if auth.too_many(key):
            return jsonify(error="Zu viele Fehlversuche. Bitte in ein paar Minuten erneut versuchen."), 429
        with db.tx() as c:
            u = c.execute("SELECT * FROM users WHERE name=?", (name,)).fetchone()
        if u and auth.check(u, d.get("password")):
            auth.clear(key)
            if not u["active"]:
                return jsonify(error="Dieses Konto ist gesperrt. Bitte an die Verwaltung wenden."), 403
            if not sso.has_app(u, "bautagebuch"):
                return jsonify(error="Für das Bautagebuch ist dein Konto nicht freigeschaltet."), 403
            audit.record(u["name"], "konto", "Angemeldet", request.remote_addr or "")
            session.clear()
            session.permanent = True
            session["uid"] = u["id"]
            session["sso"] = 1
            with db.tx() as c:   # gemeinsame Anmeldung: gilt gleich auch für die anderen Apps
                sso.revoke_req(c, request)
                tok = sso.create(c, u["id"], request.remote_addr or "", request.user_agent.string, "bautagebuch")
            return sso.set_cookie(jsonify(ok=True, **auth.public(u)), tok)
        auth.check(None, d.get("password"))   # gleiche Rechenzeit, egal ob der Name existiert
        auth.fail(key)
        audit.record(name[:60], "konto", "Anmeldung fehlgeschlagen", request.remote_addr or "")
        return jsonify(error="Name oder Kennwort ist falsch."), 401

    @app.post("/api/logout")
    def logout():
        if session.get("uid"):
            with db.tx() as c:
                u = auth.get(c, session.get("uid"))
            if u: audit.record(u["name"], "konto", "Abgemeldet")
        with db.tx() as c:   # gemeinsame Anmeldung: überall abmelden
            sso.revoke_req(c, request)
        session.clear()
        return sso.clear_cookie(jsonify(ok=True))

    # Jedes Modul in modules/ mit einem Blueprint "bp" wird automatisch eingebunden.
    for m in pkgutil.iter_modules(modules.__path__):
        app.register_blueprint(importlib.import_module(f"modules.{m.name}").bp)
    return app


app = create_app()
