"""Benutzerverwaltung (nur Administrator), eigenes Konto, Kennwort ändern/vergessen."""
import json
import re, secrets
from flask import Blueprint, g, jsonify, request, session
from core import auth, db, mail, settings

bp = Blueprint("users", __name__)
NAME_MAX = 40


def _clean_name(n):
    return " ".join(str(n or "").split())[:NAME_MAX]


@bp.get("/api/users")
def list_users():
    with db.tx() as c:
        return jsonify([auth.public(u) for u in c.execute("SELECT * FROM users ORDER BY is_admin DESC, name")])


@bp.get("/api/people")
def people():
    """Namen aller Benutzer (für Vorschläge bei „Bauleitung vor Ort“) – für alle Angemeldeten."""
    with db.tx() as c:
        return jsonify([r["name"] for r in c.execute("SELECT name FROM users WHERE lower(name)!='admin' ORDER BY name")])


@bp.get("/api/leaders")
def leaders():
    """Auswahl für „Zuständige Bauleiter“: alle Benutzer außer dem Administrator-Konto – für alle Angemeldeten."""
    with db.tx() as c:
        return jsonify([{"id": r["id"], "name": r["name"]} for r in c.execute("SELECT id, name FROM users WHERE lower(name)!='admin' ORDER BY name")])


_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # ohne l, I, 1, O, 0


def _gen_pw():
    return "".join(secrets.choice(_ALPHABET) for _ in range(12))


def _access_mail(conf, to, name, pw):
    base = (conf.get("app_url") or request.url_root).rstrip("/")
    mail.send(conf, to, "Bautagebuch – deine Zugangsdaten",
              f"Hallo {name},\n\nhier sind deine Zugangsdaten für das Bautagebuch:\n\nAdresse:  {base}\nName:     {name}\nKennwort: {pw}\n\n"
              "Beim ersten Anmelden vergibst du ein eigenes Kennwort. Bitte lösche diese E-Mail danach.\n")


@bp.post("/api/users")
def create_user():
    """Benutzer anlegen: Das Startkennwort erzeugt der Server zufällig und schickt es per E-Mail (muss beim ersten Anmelden geändert werden)."""
    d = request.json or {}
    name, email = _clean_name(d.get("name")), str(d.get("email") or "").strip()
    if len(name) < 2:
        return jsonify(error="Bitte einen Namen mit mindestens 2 Zeichen eingeben."), 400
    if not email or not auth.valid_email(email):
        return jsonify(error="Bitte eine gültige E-Mail-Adresse eingeben – dorthin wird das Startkennwort geschickt."), 400
    pw = _gen_pw()
    with db.tx() as c:
        conf = settings.all(c)
        if not mail.configured(conf):
            return jsonify(error="Der Mailserver ist noch nicht eingerichtet (Einstellungen → E-Mail). Ohne ihn kann das Startkennwort nicht verschickt werden."), 400
        if c.execute("SELECT 1 FROM users WHERE name=?", (name,)).fetchone():
            return jsonify(error="Diesen Namen gibt es schon."), 409
        uid = c.execute("INSERT INTO users(name,email,pass_hash,must_change) VALUES(?,?,'',1) RETURNING id", (name, email)).fetchone()[0]
        auth.set_password(c, uid, pw, must_change=True)
    try:
        _access_mail(conf, email, name, pw)
    except mail.MailError as e:
        with db.tx() as c:   # ohne zugestelltes Kennwort wäre das Konto unbrauchbar
            c.execute("DELETE FROM users WHERE id=?", (uid,))
        return jsonify(error="Die E-Mail konnte nicht gesendet werden, der Benutzer wurde nicht angelegt: " + str(e)), 502
    return jsonify(id=uid, to=email)


@bp.put("/api/users/<int:i>")
def update_user(i):
    d = request.json or {}
    with db.tx() as c:
        u = auth.get_any(c, i)
        if not u:
            return jsonify(error="Benutzer nicht gefunden"), 404
        if "assistent" in d:   # Schritt-für-Schritt-Assistent im Bericht: anbieten, automatisch starten, welche Schritte
            v = d["assistent"] if isinstance(d["assistent"], dict) else {}
            st = v.get("steps") if isinstance(v.get("steps"), dict) else {}
            a_ = {"on": v.get("on") is not False, "auto": bool(v.get("auto")),
                  "steps": {str(k)[:40]: bool(x) for k, x in list(st.items())[:40]}}
            u = c.execute("SELECT extra FROM users WHERE id=?", (g.user["id"],)).fetchone()
            try:
                ex = json.loads(u["extra"] or "{}")
            except ValueError:
                ex = {}
            ex["bt_assistent"] = a_
            c.execute("UPDATE users SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), g.user["id"]))
        if "email" in d:
            email = str(d["email"] or "").strip()
            if email and not auth.valid_email(email):
                return jsonify(error="Die E-Mail-Adresse ist ungültig."), 400
            c.execute("UPDATE users SET email=?, updated=datetime('now') WHERE id=?", (email, i))
        if "is_admin" in d:
            if i == g.user["id"] and not d["is_admin"]:
                return jsonify(error="Du kannst dir die Administrator-Rechte nicht selbst entziehen."), 400
            c.execute("UPDATE users SET is_admin=?, updated=datetime('now') WHERE id=?", (int(bool(d["is_admin"])), i))
        if "name" in d and u["name"].lower() != "admin":
            name = _clean_name(d["name"])
            if len(name) < 2:
                return jsonify(error="Der Name braucht mindestens 2 Zeichen."), 400
            if c.execute("SELECT 1 FROM users WHERE name=? AND id!=?", (name, i)).fetchone():
                return jsonify(error="Diesen Namen gibt es schon."), 409
            c.execute("UPDATE users SET name=?, updated=datetime('now') WHERE id=?", (name, i))
        if d.get("password"):
            if len(d["password"]) < auth.MIN_LEN:
                return jsonify(error=f"Das Kennwort braucht mindestens {auth.MIN_LEN} Zeichen."), 400
            auth.set_password(c, i, d["password"], must_change=True)
    return jsonify(ok=True)


@bp.post("/api/users/<int:i>/access")
def send_access(i):
    """Neues Startkennwort erzeugen und dem Benutzer per E-Mail schicken (er ändert es beim nächsten Anmelden).
    Das bisherige Kennwort lässt sich nicht erneut senden: Es wird nur als Hash gespeichert und ist nicht umkehrbar."""
    with db.tx() as c:
        u = auth.get_any(c, i)
        conf = settings.all(c)
        if not u:
            return jsonify(error="Benutzer nicht gefunden"), 404
        if not u["email"]:
            return jsonify(error="Für diesen Benutzer ist keine E-Mail-Adresse hinterlegt."), 400
        if not mail.configured(conf):
            return jsonify(error="Der Mailserver ist noch nicht eingerichtet (Einstellungen → E-Mail)."), 400
        pw = _gen_pw()
        to, name = u["email"], u["name"]
        auth.set_password(c, i, pw, must_change=True)
    try:
        _access_mail(conf, to, name, pw)
    except mail.MailError as e:
        return jsonify(error="Die E-Mail konnte nicht gesendet werden: " + str(e)), 502
    return jsonify(ok=True, to=to)


@bp.delete("/api/users/<int:i>")
def delete_user(i):
    with db.tx() as c:
        u = auth.get_any(c, i)
        if not u:
            return jsonify(ok=True)
        if i == g.user["id"]:
            return jsonify(error="Du kannst dich nicht selbst löschen."), 400
        if u["name"].lower() == "admin":
            return jsonify(error="Der Benutzer „admin“ kann nicht gelöscht werden."), 400
        c.execute("DELETE FROM users WHERE id=?", (i,))
    return jsonify(ok=True)


# ---- eigenes Konto
@bp.post("/api/password")
def change_password():
    d = request.json or {}
    with db.tx() as c:
        u = auth.get(c, g.user["id"])
        if u["must_change"] and not auth.check(u, d.get("old")):   # nur beim erzwungenen ersten Wechsel
            return jsonify(error="Das bisherige Kennwort stimmt nicht."), 400
        err = auth.check_new(d.get("new"), u, d.get("old"))
        if err:
            return jsonify(error=err), 400
        email = str(d.get("email") or "").strip()
        if email:
            if not auth.valid_email(email):
                return jsonify(error="Die E-Mail-Adresse ist ungültig."), 400
            c.execute("UPDATE users SET email=? WHERE id=?", (email, u["id"]))
        auth.set_password(c, u["id"], d["new"])
    return jsonify(ok=True)


@bp.put("/api/account")
def update_account():
    d = request.json or {}
    with db.tx() as c:
        if "accent" in d:   # Farbe der Oberfläche: „#rrggbb“ oder leer (Standard)
            a = str(d["accent"] or "").strip()
            if a and not re.fullmatch(r"#[0-9a-fA-F]{6}", a):
                return jsonify(error="Die Farbe ist ungültig."), 400
            c.execute("UPDATE users SET accent=?, updated=datetime('now') WHERE id=?", (a.lower(), g.user["id"]))
        if "assistent" in d:   # Schritt-für-Schritt-Assistent im Bericht: anbieten, automatisch starten, welche Schritte
            v = d["assistent"] if isinstance(d["assistent"], dict) else {}
            st = v.get("steps") if isinstance(v.get("steps"), dict) else {}
            a_ = {"on": v.get("on") is not False, "auto": bool(v.get("auto")),
                  "steps": {str(k)[:40]: bool(x) for k, x in list(st.items())[:40]}}
            u = c.execute("SELECT extra FROM users WHERE id=?", (g.user["id"],)).fetchone()
            try:
                ex = json.loads(u["extra"] or "{}")
            except ValueError:
                ex = {}
            ex["bt_assistent"] = a_
            c.execute("UPDATE users SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), g.user["id"]))
        if "email" in d:
            email = str(d["email"] or "").strip()
            if email and not auth.valid_email(email):
                return jsonify(error="Die E-Mail-Adresse ist ungültig."), 400
            c.execute("UPDATE users SET email=?, updated=datetime('now') WHERE id=?", (email, g.user["id"]))
    return jsonify(ok=True)


# ---- Kennwort vergessen (ohne Anmeldung)
@bp.post("/api/forgot")
def forgot():
    ident = str((request.json or {}).get("ident") or "").strip()
    key = ("forgot", request.remote_addr)
    if auth.too_many(key):
        return jsonify(error="Zu viele Anfragen. Bitte in ein paar Minuten erneut versuchen."), 429
    auth.fail(key)
    generic = jsonify(ok=True, message="Wenn es dazu ein Konto mit E-Mail-Adresse gibt, wurde ein Link zum Zurücksetzen gesendet.")
    if not ident:
        return generic
    with db.tx() as c:
        conf = settings.all(c)
        users = c.execute("SELECT * FROM users WHERE (name=? OR lower(email)=lower(?)) AND email!=''", (ident, ident)).fetchall()
        base = (conf.get("app_url") or request.url_root).rstrip("/")
        jobs = [(u["email"], u["name"], auth.new_token(c, u["id"])) for u in users]
    for to, name, tok in jobs:
        try:
            mail.send(conf, to, "Bautagebuch – Kennwort zurücksetzen",
                      f"Hallo {name},\n\nüber diesen Link kannst du ein neues Kennwort vergeben (eine Stunde gültig):\n\n"
                      f"{base}/#reset={tok}\n\nWenn du das nicht angefordert hast, ignoriere diese E-Mail.\n")
        except mail.MailError:
            pass   # Fehler nicht nach außen melden (verrät sonst, ob das Konto existiert); der Admin sieht sie im Mailtest
    return generic


@bp.post("/api/reset")
def reset():
    d = request.json or {}
    with db.tx() as c:
        u = auth.user_for_token(c, d.get("token"))
        if not u:
            return jsonify(error="Der Link ist ungültig oder abgelaufen. Bitte „Kennwort vergessen“ erneut nutzen."), 400
        err = auth.check_new(d.get("password"), u)
        if err:
            return jsonify(error=err), 400
        auth.set_password(c, u["id"], d["password"])
    return jsonify(ok=True)


# ---- Mailtest (Administrator)
@bp.post("/api/mail/test")
def mail_test():
    with db.tx() as c:
        conf = settings.all(c)
        me = auth.get(c, g.user["id"])
    if not me["email"]:
        return jsonify(ok=False, error="Trage zuerst unter Einstellungen → Benutzer deine E-Mail-Adresse ein; dorthin geht die Testmail."), 400
    try:
        mail.send(conf, me["email"], "Bautagebuch – Testmail", "Der E-Mail-Versand funktioniert.")
    except mail.MailError as e:
        return jsonify(ok=False, error=str(e)), 502
    return jsonify(ok=True, to=me["email"])
