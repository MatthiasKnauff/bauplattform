"""Gemeinsame Anmeldung (Single Sign-on) für alle Apps der Bauplattform.

Prinzip: Nach dem Anmelden (Startseite oder Bautagebuch) bekommt der Browser ein Cookie `bp_sso` mit einem zufälligen
Schlüssel. In der Datenbank (Tabelle sso_sessions) steht nur dessen SHA-256-Hash mit Benutzer und Ablaufdatum. Jede App
prüft das Cookie gegen diese Tabelle. Cookies gelten je Rechnername, nicht je Port – deshalb sehen alle Apps auf demselben
Server (z. B. :8080, :8082, :8090) dasselbe Cookie. Bei eigenen Subdomains (bautagebuch.firma.de, plan.firma.de …)
SSO_COOKIE_DOMAIN=firma.de setzen.

Abmelden in einer App löscht die Sitzung in der Datenbank und meldet damit überall ab. Die Verwaltung kann Sitzungen
einzelner Benutzer beenden.
"""
import hashlib, json, os, secrets, time

COOKIE = os.environ.get("SSO_COOKIE_NAME", "bp_sso")
DOMAIN = os.environ.get("SSO_COOKIE_DOMAIN", "").strip() or None
SECURE = os.environ.get("COOKIE_SECURE") == "1"
DAYS = int(os.environ.get("SSO_DAYS", "30") or 30)
APPS = (("bautagebuch", "Bautagebuch"), ("gantt", "Bauzeitenplan"), ("adressen", "Adressen"), ("baukosten", "Baukosten"), ("aufgaben", "Aufgaben & Mängel"), ("plaene", "Pläne & Dateien"), ("ava", "Ausschreibung & Abrechnung"), ("kommunikation", "Kommunikation"), ("baudaten", "Baudaten"), ("zeiten", "Zeiten"), ("bauantrag", "Bauantrag"))   # Apps mit Zugriffsrecht je Benutzer
_TOUCH = 300   # „zuletzt gesehen“ höchstens alle 5 Minuten schreiben


def _h(tok):
    return hashlib.sha256((tok or "").encode()).hexdigest()


def create(con, uid, ip="", agent="", app=""):
    """Neue Sitzung anlegen – gibt den Schlüssel für das Cookie zurück."""
    tok = secrets.token_urlsafe(32)
    now = int(time.time())
    con.execute("DELETE FROM sso_sessions WHERE expires < ?", (now,))
    con.execute("INSERT INTO sso_sessions(token_hash, user_id, expires, seen, ip, agent, app) VALUES(?,?,?,?,?,?,?)",
                (_h(tok), uid, now + DAYS * 86400, now, (ip or "")[:64], (agent or "")[:200], app[:20]))
    return tok


def lookup(con, tok):
    """Benutzer zur Sitzung oder None (abgelaufen, beendet, Benutzer gesperrt/gelöscht)."""
    if not tok or len(tok) > 100:
        return None
    now = int(time.time())
    r = con.execute("SELECT s.token_hash, s.seen, u.* FROM sso_sessions s JOIN users u ON u.id = s.user_id "
                    "WHERE s.token_hash=? AND s.expires>=? AND u.active=1", (_h(tok), now)).fetchone()
    if r and now - (r["seen"] or 0) > _TOUCH:
        con.execute("UPDATE sso_sessions SET seen=?, expires=? WHERE token_hash=?", (now, now + DAYS * 86400, r["token_hash"]))
    return r


def revoke(con, tok):
    if tok:
        con.execute("DELETE FROM sso_sessions WHERE token_hash=?", (_h(tok),))


def revoke_user(con, uid):
    con.execute("DELETE FROM sso_sessions WHERE user_id=?", (uid,))


# ---- Cookie im Browser
# Ein Browser kann mehrere Cookies „bp_sso“ haben: eines für die ganze Domain (SSO_COOKIE_DOMAIN) und ein älteres nur für
# einen Rechnernamen (vor Einführung der Domain gesetzt). Dann sieht die Startseite eine gültige Sitzung, die App aber nicht –
# und beide leiten sich gegenseitig weiter (Anmeldung „flackert“, vor allem auf Handys). Deshalb werden immer ALLE
# mitgeschickten Schlüssel geprüft, und beim Anmelden/Abmelden wird das alte Cookie mit gelöscht.

def tokens(req):
    """Alle mitgeschickten SSO-Schlüssel (ohne Doppelte)."""
    out = []
    for t in req.cookies.getlist(COOKIE):
        if t and t not in out:
            out.append(t)
    return out


def current(con, req):
    """Benutzer zur ersten gültigen Sitzung unter allen mitgeschickten Schlüsseln (oder None)."""
    for t in tokens(req):
        u = lookup(con, t)
        if u:
            return u
    return None


def current_token(req, con):
    for t in tokens(req):
        if lookup(con, t):
            return t
    return None


def revoke_req(con, req):
    """Alle Sitzungen dieses Browsers beenden."""
    for t in tokens(req):
        revoke(con, t)


def _domain_for(req):
    """SSO_COOKIE_DOMAIN nur verwenden, wenn die Seite auch unter dieser Domain aufgerufen wurde.
    Aufruf über IP-Adresse oder Rechnername mit Port (ohne Reverse Proxy) → Cookie nur für diesen Rechner."""
    if not DOMAIN or req is None:
        return DOMAIN
    host = (req.host or "").split(":")[0].lower()
    d = DOMAIN.lstrip(".").lower()
    return DOMAIN if host == d or host.endswith("." + d) else None


def _secure_for(req):
    """Secure-Cookie nur über HTTPS – über http://server:port würde der Browser es sonst verwerfen."""
    if not SECURE:
        return False
    return True if req is None else req.scheme == "https"


def cookie_args(req=None):
    return dict(max_age=DAYS * 86400, httponly=True, samesite="Lax", secure=_secure_for(req), domain=_domain_for(req), path="/")


def _clear_old(resp, req):
    if _domain_for(req):   # Cookie nur für diesen Rechnernamen (alter Stand) entfernen
        resp.delete_cookie(COOKIE, path="/")


def set_cookie(resp, tok, req=None):
    if req is None:
        from flask import request as req
    _clear_old(resp, req)
    resp.set_cookie(COOKIE, tok, **cookie_args(req))
    return resp


def clear_cookie(resp, req=None):
    if req is None:
        from flask import request as req
    _clear_old(resp, req)
    resp.delete_cookie(COOKIE, domain=_domain_for(req), path="/")
    return resp


THEMES = ("", "hell", "auto", "klassisch")   # '' = Dunkel (Standard)


def theme_of(user):
    """Farbschema des Benutzers (zentral auf der Startseite eingestellt)."""
    t = (user["theme"] if user is not None and "theme" in user.keys() else "") or ""
    return t if t in THEMES else ""


# Apps fürs ganze Büro abschalten (Verwaltung → ⚙ Büro-Einstellungen → Apps): Einstellung „apps_aus“ (JSON-Liste).
# Gilt für alle, auch Administratoren; 3 Sekunden zwischengespeichert, damit nicht jeder Aufruf die Datenbank fragt.
_AUS = {"t": 0.0, "v": frozenset()}


def apps_aus(frisch=False):
    if not frisch and time.time() - _AUS["t"] < 3:
        return _AUS["v"]
    v = frozenset()
    try:
        from . import db
        with db.tx() as c:
            r = c.execute("SELECT value FROM settings WHERE key='apps_aus'").fetchone()
        x = json.loads(r["value"]) if r and r["value"] else []
        v = frozenset(str(k) for k in x if isinstance(k, str))
    except Exception:   # noqa: BLE001 – ohne Datenbank (Rechentests) oder Einstellung: nichts abgeschaltet
        v = frozenset()
    _AUS.update(t=time.time(), v=v)
    return v


def apps_aus_setzen(c, keys):
    keys = sorted({k for k in keys if k in {a for a, _ in APPS} | {"honorar"}})
    c.execute("INSERT INTO settings(key, value) VALUES('apps_aus', ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (json.dumps(keys),))
    _AUS.update(t=0.0)
    return keys


def apps_of(user):
    """Liste der App-Schlüssel, die der Benutzer nutzen darf. Leeres Feld = alle Apps (Standard). Im Büro abgeschaltete Apps fehlen."""
    aus = apps_aus()
    return [k for k in _apps_of(user) if k not in aus]


def _apps_of(user):
    if user is None:
        return []
    if user["is_admin"]:
        return [k for k, _ in APPS]
    raw = (user["apps"] if "apps" in user.keys() else "") or ""
    if not raw.strip():
        return [k for k, _ in APPS]
    try:
        v = json.loads(raw)
    except ValueError:
        return [k for k, _ in APPS]
    if isinstance(v, list) and "aufgaben" not in v and "-aufgaben" not in v and ("bautagebuch" in v or "gantt" in v):
        v = v + ["aufgaben"]   # neue App: wer Bautagebuch oder Bauzeitenplan nutzt, bekommt sie, bis sie in der Verwaltung abgewählt wird
    if isinstance(v, list) and "plaene" not in v and "-plaene" not in v and ("bautagebuch" in v or "gantt" in v):
        v = v + ["plaene"]
    if isinstance(v, list) and "ava" not in v and "-ava" not in v and ("baukosten" in v or "gantt" in v):
        v = v + ["ava"]   # neue App: wer Baukosten oder Bauzeitenplan nutzt, bekommt sie, bis sie abgewählt wird
    if isinstance(v, list) and "kommunikation" not in v and "-kommunikation" not in v and any(a in v for a in ("bautagebuch", "gantt", "plaene", "aufgaben")):
        v = v + ["kommunikation"]   # neue App: wer Pläne oder Rügen verschicken kann, bekommt sie, bis sie abgewählt wird
    if isinstance(v, list) and "baudaten" not in v and "-baudaten" not in v and any(a in v for a in ("baukosten", "ava")):
        v = v + ["baudaten"]   # neue App: wer Baukosten oder Ausschreibung nutzt, bekommt sie, bis sie abgewählt wird
    if isinstance(v, list) and "zeiten" not in v and "-zeiten" not in v:
        v = v + ["zeiten"]   # Zeiterfassung: alle, bis sie in der Verwaltung abgewählt wird
    if isinstance(v, list) and "bauantrag" not in v and "-bauantrag" not in v and any(a in v for a in ("bautagebuch", "baukosten", "plaene")):
        v = v + ["bauantrag"]   # neue App: wer Bautagebuch, Baukosten oder Pläne nutzt, bekommt sie, bis sie abgewählt wird
    return [k for k, _ in APPS if k in v]


def has_app(user, app):
    return app in apps_of(user)
