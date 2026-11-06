"""Benutzer, Kennwörter, Anmelde-Bremse. Kennwörter werden nur als Hash gespeichert."""
import json
import hashlib, re, secrets, sys, time
from werkzeug.security import check_password_hash, generate_password_hash
from . import db

MIN_LEN = 8
_fails = {}   # (Schlüssel) -> Zeitstempel der Fehlversuche, nur im Speicher
_DUMMY = generate_password_hash("kein-benutzer")


def ensure_admin():
    """Beim ersten Start: Benutzer „admin“ mit Kennwort „admin“, das sofort geändert werden muss."""
    with db.tx() as c:
        if not c.execute("SELECT 1 FROM users").fetchone():
            # ON CONFLICT: gunicorn startet mehrere Prozesse gleichzeitig – nur einer legt den Benutzer an
            c.execute("INSERT INTO users(name, pass_hash, is_admin, must_change) VALUES('admin',?,1,1) ON CONFLICT (name) DO NOTHING",
                      (generate_password_hash("admin"),))


def get(con, uid):
    """Angemeldeter Benutzer – gesperrte Konten (Verwaltung der Bauplattform) gelten als abgemeldet."""
    return con.execute("SELECT * FROM users WHERE id=? AND active=1", (uid,)).fetchone() if uid else None


def get_any(con, uid):
    """Benutzer unabhängig von der Sperre (Benutzerverwaltung)."""
    return con.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone() if uid else None


def check(user, pw):
    return check_password_hash(user["pass_hash"] if user else _DUMMY, pw or "") and bool(user)


def check_new(pw, user=None, old=None):
    """Gibt eine Fehlermeldung zurück oder None."""
    if len(pw or "") < MIN_LEN:
        return f"Das neue Kennwort braucht mindestens {MIN_LEN} Zeichen."
    if pw == old:
        return "Das neue Kennwort muss sich vom alten unterscheiden."
    if user and pw.lower() in (user["name"].lower(), "admin", "passwort", "password"):
        return "Dieses Kennwort ist zu einfach."
    return None


def set_password(con, uid, pw, must_change=False):
    con.execute("UPDATE users SET pass_hash=?, must_change=?, updated=datetime('now') WHERE id=?",
                (generate_password_hash(pw), int(must_change), uid))
    con.execute("DELETE FROM password_resets WHERE user_id=?", (uid,))


def public(u):
    return {"id": u["id"], "name": u["name"], "email": u["email"], "is_admin": bool(u["is_admin"]),
            "must_change": bool(u["must_change"]), "accent": u["accent"],
            "theme": (u["theme"] if "theme" in u.keys() else "") or "dunkel",
            "active": bool(u["active"]) if "active" in u.keys() else True,
            "assistent": _extra(u).get("bt_assistent") or {}}


def _extra(u):
    try:
        v = json.loads(u["extra"] or "{}") if "extra" in u.keys() else {}
        return v if isinstance(v, dict) else {}
    except ValueError:
        return {}


def valid_email(e):
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", e or ""))


def too_many(key, limit=5, window=600):
    now = time.time()
    _fails[key] = [t for t in _fails.get(key, []) if now - t < window]
    return len(_fails[key]) >= limit


def fail(key):
    _fails.setdefault(key, []).append(time.time())


def clear(key):
    _fails.pop(key, None)


def new_token(con, uid, hours=1):
    tok = secrets.token_urlsafe(32)
    con.execute("DELETE FROM password_resets WHERE user_id=? OR expires<?", (uid, int(time.time())))
    con.execute("INSERT INTO password_resets(user_id, token_hash, expires) VALUES(?,?,?)",
                (uid, hashlib.sha256(tok.encode()).hexdigest(), int(time.time() + hours * 3600)))
    return tok


def user_for_token(con, tok):
    r = con.execute("SELECT user_id FROM password_resets WHERE token_hash=? AND expires>=?",
                    (hashlib.sha256((tok or "").encode()).hexdigest(), int(time.time()))).fetchone()
    return get(con, r["user_id"]) if r else None


if __name__ == "__main__":   # Notfall: docker compose exec bautagebuch python -m core.auth reset-admin
    if sys.argv[1:] == ["reset-admin"]:
        db.migrate(); ensure_admin()
        with db.tx() as c:
            a = c.execute("SELECT id FROM users WHERE is_admin=1 ORDER BY id LIMIT 1").fetchone()
            set_password(c, a["id"], "admin", must_change=True)
            c.execute("UPDATE users SET active=1 WHERE id=?", (a["id"],))
        print("Der Administrator hat wieder das Kennwort „admin“ und muss es beim nächsten Login ändern.")
    else:
        print("Aufruf: python -m core.auth reset-admin")
