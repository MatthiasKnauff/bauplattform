"""Gemeinsame Bausteine von Startseite (portal.py) und Verwaltung (admin.py)."""
import io, json, os, threading, time, urllib.error, urllib.request
from urllib.parse import quote, urlsplit

from flask import Flask, jsonify, request, send_from_directory
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
    from werkzeug.middleware.proxy_fix import ProxyFix
    if os.environ.get("TRUST_PROXY") == "1":   # hinter einem Reverse Proxy: X-Forwarded-* übernehmen
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    else:   # nur den Pfad vom Verteiler (/baukosten …) übernehmen
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=0, x_proto=0, x_host=0, x_prefix=1)

    @app.before_request
    def csrf():
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            o = request.headers.get("Origin")
            if o and urlsplit(o).netloc != request.host:
                return jsonify(error="Anfrage von fremder Seite abgelehnt"), 403

    @app.after_request
    def headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        if request.args.get("einbetten") and resp.mimetype == "text/html":   # Verwaltung im Einstellungsfenster (⚙ → Büro) der anderen Apps
            host = request.host.split(":")[0]
            resp.headers["Content-Security-Policy"] = f"frame-ancestors 'self' http://{host}:* https://{host}:* https://{host}"
        else:
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
_llock = threading.RLock()


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


_plogo = {"t": 0, "data": None}


def print_logo():
    """Das Büro-Logo in voller Größe für Ausdrucke (Kopfzeile jeder PDF-Seite). Ohne Logo: None."""
    with _llock:
        if time.time() - _plogo["t"] > 300:
            data = None
            try:
                req = urllib.request.Request(BT_INTERNAL + "/api/logo", headers={"Cookie": f"{sso.COOKIE}={request.cookies.get(sso.COOKIE, '')}"})
                with urllib.request.urlopen(req, timeout=3) as r:
                    data = r.read() if r.status == 200 else None
                if data:   # einheitlich als PNG (WEBP, CMYK-JPG, riesige Dateien machen reportlab sonst Probleme)
                    from PIL import Image
                    im = Image.open(io.BytesIO(data)); im.load()
                    im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
                    im.thumbnail((900, 900))
                    out = io.BytesIO(); im.save(out, "PNG"); data = out.getvalue()
            except Exception:
                data = None
            _plogo["data"] = data
            _plogo["t"] = time.time() if data else time.time() - 240   # ohne Logo bald erneut versuchen
        data = _plogo["data"]
    return data or _logo_bytes()   # außerhalb der Sperre: _logo_bytes() sperrt selbst


def draw_logo(cv, right, top, h, max_w):
    """Logo rechtsbündig in die Kopfzeile einer PDF-Seite setzen (reportlab-Canvas). right/top in Punkt."""
    data = print_logo()
    if not data:
        return False
    try:
        from reportlab.lib.utils import ImageReader
        img = ImageReader(io.BytesIO(data))
        iw, ih = img.getSize()
        w = min(max_w, h * iw / ih); hh = w * ih / iw
        cv.drawImage(img, right - w, top - hh, w, hh, mask="auto")
        return True
    except Exception:
        return False


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


def _col(u, k):
    try:
        return (u[k] or "").strip()
    except (KeyError, IndexError):
        return ""


def full_name(u):
    """„Vorname Nachname“ für die Anzeige – sonst der Anmeldename (der bleibt z. B. im Bautagebuch-PDF)."""
    return " ".join(x for x in (_col(u, "vorname"), _col(u, "nachname")) if x) or u["name"]


def public(u):
    return {"id": u["id"], "name": u["name"], "email": u["email"], "is_admin": bool(u["is_admin"]), "must_change": bool(u["must_change"]),
            "accent": u["accent"] or "", "theme": sso.theme_of(u) or "dunkel", "apps": sso.apps_of(u),
            "vorname": _col(u, "vorname"), "nachname": _col(u, "nachname"), "full": full_name(u)}


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


def _addr(r):
    return ", ".join(x for x in (r["street"], " ".join(y for y in (r["zip"], r["city"]) if y)) if x)


def projects_overview(c, user=None):
    """Projekte über alle Apps: je Bautagebuch-Projekt die verknüpften Bauzeitenpläne und Kostenermittlungen,
    dazu Pläne und Kostenermittlungen ohne Bautagebuch-Projekt. Mit user: nur Bautagebuch-Projekte, die er sehen darf."""
    names = {r["id"]: full_name(r) for r in c.execute("SELECT * FROM users")}
    bt = c.execute("""SELECT p.id, p.name, p.client, p.street, p.zip, p.city, p.folder, p.archived, p.created, p.leaders,
                             (SELECT COUNT(*) FROM reports r WHERE r.project_id=p.id) AS reports,
                             (SELECT COUNT(*) FROM images i JOIN reports r ON r.id=i.report_id WHERE r.project_id=p.id) AS images
                      FROM projects p ORDER BY p.archived, p.name""").fetchall()
    plans = c.execute("SELECT id, name, project_id, updated, (SELECT COUNT(*) FROM gantt_versions v WHERE v.gantt_id=g.id) AS versions FROM gantt_projects g ORDER BY name").fetchall()
    bks = c.execute("SELECT id, name, project_id, gantt_id, stufe, archived, updated, (SELECT COUNT(*) FROM bk_files f WHERE f.bk_id=b.id) AS files FROM bk_projects b ORDER BY name").fetchall()
    P = lambda x: {"id": x["id"], "name": x["name"], "updated": x["updated"], "versions": x["versions"]}
    K = lambda x: {"id": x["id"], "name": x["name"], "stufe": x["stufe"], "archived": bool(x["archived"]), "files": x["files"]}
    out, used_p, used_k = [], set(), set()
    for p in bt:
        try:
            lead_all = [int(x) for x in json.loads(p["leaders"] or "[]")]
        except (ValueError, TypeError):
            lead_all = []
        if user is not None and not (user["is_admin"] or not lead_all or user["id"] in lead_all):
            continue   # wie im Bautagebuch: nur freigegebene Projekte
        ps = [x for x in plans if x["project_id"] == p["id"]]
        pids = {x["id"] for x in ps}
        ks = [x for x in bks if x["project_id"] == p["id"] or (x["project_id"] is None and x["gantt_id"] in pids)]
        used_p |= pids; used_k |= {x["id"] for x in ks}
        try:
            lead = [int(x) for x in json.loads(p["leaders"] or "[]") if int(x) in names]
        except (ValueError, TypeError):
            lead = []
        out.append({"key": f"bt{p['id']}", "name": p["name"], "client": p["client"], "address": _addr(p), "archived": bool(p["archived"]),
                    "street": p["street"], "zip": p["zip"], "city": p["city"], "folder": p["folder"], "leaders": lead, "leader_names": [names[x] for x in lead],
                    "bt": {"id": p["id"], "reports": p["reports"], "images": p["images"]}, "plans": [P(x) for x in ps], "bks": [K(x) for x in ks]})
    for x in plans:   # Bauzeitenpläne ohne Bautagebuch-Projekt (mit ihren Kostenermittlungen)
        if x["id"] in used_p:
            continue
        ks = [k for k in bks if k["id"] not in used_k and k["gantt_id"] == x["id"]]
        used_k |= {k["id"] for k in ks}
        out.append({"key": f"g{x['id']}", "name": x["name"], "client": "", "address": "", "archived": False, "bt": None, "plans": [P(x)], "bks": [K(k) for k in ks]})
    for k in bks:
        if k["id"] not in used_k:
            out.append({"key": f"k{k['id']}", "name": k["name"], "client": "", "address": "", "archived": bool(k["archived"]), "bt": None, "plans": [], "bks": [K(k)]})
    return out


def kurzname(c):
    """Kurzname des Büros (Einstellung „Kurzname“) – für Stellen, an denen der lange Firmenname nicht passt; sonst der Firmenname."""
    r = {x["key"]: x["value"] for x in c.execute("SELECT key, value FROM settings WHERE key IN ('office_name','co_short')").fetchall()}
    return (r.get("co_short") or "").strip() or r.get("office_name") or ""
