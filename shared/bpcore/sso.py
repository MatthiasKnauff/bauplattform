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
APPS = (("bautagebuch", "Bautagebuch"), ("gantt", "Bauzeitenplan"))   # Apps mit Zugriffsrecht je Benutzer
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


def cookie_args():
    return dict(max_age=DAYS * 86400, httponly=True, samesite="Lax", secure=SECURE, domain=DOMAIN, path="/")


def set_cookie(resp, tok):
    resp.set_cookie(COOKIE, tok, **cookie_args())
    return resp


def clear_cookie(resp):
    resp.delete_cookie(COOKIE, domain=DOMAIN, path="/")
    return resp


def apps_of(user):
    """Liste der App-Schlüssel, die der Benutzer nutzen darf. Leeres Feld = alle Apps (Standard)."""
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
    return [k for k, _ in APPS if k in v]


def has_app(user, app):
    return app in apps_of(user)
