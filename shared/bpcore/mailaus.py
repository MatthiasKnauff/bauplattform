"""Alle Benachrichtigungs-Mails abschalten (20.11.2026): EIN Haken je Person („Keine Mails an mich“) und einer der Verwaltung („für alle“).

Gilt ohne Ausnahme für jede Mail, die die Plattform von sich aus an Benutzer:innen schickt – Erinnerungen, fällige Punkte, Aufgaben,
Termin-Einladungen und -Absagen, Abwesenheiten, Tagesbericht fehlt, Einladungen zum gemeinsamen Markieren … Geprüft wird an der EINEN
Stelle, durch die jede Mail geht (`mail.smtp_senden`): Adressen von Benutzer:innen mit Haken fallen aus den Empfängern; bleibt niemand,
geht nichts hinaus. Neue Benachrichtigungen sind damit von selbst erfasst.

Nicht betroffen (im Aufruf mit `direkt=True` gekennzeichnet): was jemand selbst und ausdrücklich abschickt bzw. anfordert – Unterlagen,
LVs, Pläne, Rügen (auch „Kopie an mich“), Zugangsdaten, Kennwort zurücksetzen, Testmail. Empfänger außerhalb des Büros sind nie betroffen.

Dazu wie bei einem Newsletter: jede Benachrichtigung trägt unten einen persönlichen Link (und die Kopfzeile List-Unsubscribe). Die Seite
dahinter (/bp/mail/<Schlüssel>, ohne Anmeldung) bietet: alles aus · alles aus bis … · nach Apps. Der Schlüssel im Link ist eine Signatur
über die Benutzer-Nummer (Geheimnis in bp_store) und erlaubt nur genau das.

bp_store „mail:aus“ = {"alle": bool, "uids": [..], "bis": {uid: Tag}, "apps": {uid: [Gruppen]}}
"""
import json
import time

KEY = "mail:aus"
_MERK = {"bis": 0.0}
# Gruppen „nach Apps“: (Schlüssel, Name, was dazugehört) – jede Benachrichtigung nennt ihre Gruppe beim Senden (mail.send(…, app=…)), sonst „sonst“
GRUPPEN = (("aufgaben", "Aufgaben & Mängel", "Erinnerungen und Fristen"), ("bautagebuch", "Bautagebuch", "fällige Punkte, „Tagesbericht fehlt“"),
           ("todo", "Startseite · Zu tun", "Aufgaben, die dir jemand zuweist, und ihre Erinnerungen"), ("kalender", "Kalender", "Termin-Einladungen und -Absagen"),
           ("zeiten", "Zeiten & Personal", "Abwesenheiten"), ("plaene", "Pläne & Dateien", "Einladungen zum gemeinsamen Markieren"),
           ("hilfe", "Hilfe", "Hilfe-Anfragen von Kolleg:innen"), ("sonst", "Sonstiges", "alles Übrige"))
GRUPPEN_KEYS = {k for k, _, _ in GRUPPEN}
STAU_TAGE = 3   # Erinnerungen, deren Termin länger zurückliegt, werden nie nachträglich gemailt (Mailserver war aus, Adresse fehlte, Mails waren abgeschaltet)
DAUER = 20   # Sekunden, die das Ergebnis gilt – andere Container (Dienste) folgen spätestens danach


def grenze(jetzt=None):
    """Ältester Termin (ISO-Datum), für den noch eine Erinnerungs-Mail hinausgeht."""
    from datetime import datetime, timedelta
    return ((jetzt or datetime.now()).date() - timedelta(days=STAU_TAGE)).isoformat()


def stau(c, jetzt=None):
    """Was aufgestaut ist und deshalb nicht mehr gemailt wird – für die Verwaltung (nur Zahlen)."""
    g = grenze(jetzt)
    n = lambda sql: c.execute(sql, (g,)).fetchone()["n"]   # noqa: E731
    out = {"grenze": g, "tage": STAU_TAGE}
    try:
        out["erinnerungen"] = n("SELECT COUNT(*) AS n FROM erinnerungen WHERE status='offen' AND gesendet='' AND termin!='' AND termin<?")
        out["bautagebuch"] = n("SELECT COUNT(*) AS n FROM items WHERE due!='' AND due<? AND reminded='' AND done=0 AND remind_user IS NOT NULL")
    except Exception:   # Tabellen einer App fehlen (Tests): keine Zahl
        pass
    return out


def lesen(c):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (KEY,)).fetchone()
    try:
        d = json.loads(r["data"]) if r and r["data"] else {}
    except (TypeError, ValueError):
        d = {}
    d = d if isinstance(d, dict) else {}
    zahl = lambda k: str(k).isdigit()   # noqa: E731
    return {"alle": bool(d.get("alle")), "uids": sorted({int(i) for i in d.get("uids") or [] if zahl(i)}),
            "bis": {str(int(k)): str(v)[:10] for k, v in (d.get("bis") or {}).items() if zahl(k) and v},                       # aus bis einschließlich diesem Tag
            "apps": {str(int(k)): sorted({a for a in v if a in GRUPPEN_KEYS}) for k, v in (d.get("apps") or {}).items() if zahl(k) and v}}   # je Person abgeschaltete Gruppen


def _schreiben(c, d, wer):
    from datetime import datetime
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (KEY, json.dumps(d), datetime.now().isoformat(timespec="seconds"), wer or ""))
    _MERK["bis"] = 0.0


def _darf_alle(u):
    from . import meldungen
    return bool(u) and meldungen.darf_alle(u)


def _heute():
    from datetime import date
    return date.today().isoformat()


def person(c, uid, d=None):
    """Was die Person für sich gewählt hat: alles aus · aus bis · je App."""
    d = d or lesen(c)
    bis = d["bis"].get(str(int(uid)), "")
    return {"aus": int(uid) in d["uids"], "bis": bis if bis >= _heute() else "", "apps": d["apps"].get(str(int(uid)), []), "alle": d["alle"]}


def person_setzen(c, uid, wer, aus=None, bis=None, apps=None):
    """aus: alles aus (bool) · bis: „JJJJ-MM-TT“ oder "" (Pause beenden) · apps: Liste der abgeschalteten Gruppen. → Stand vorher."""
    from datetime import date
    d, k = lesen(c), str(int(uid))
    alt = person(c, uid, d)
    if aus is not None:
        s = set(d["uids"])
        (s.add if aus else s.discard)(int(uid))
        d["uids"] = sorted(s)
    if bis is not None:
        try:
            tag = date.fromisoformat(str(bis)[:10]).isoformat() if bis else ""
        except ValueError:
            raise ValueError("Das Datum bitte als Tag angeben.")
        if tag and tag >= _heute():
            d["bis"][k] = tag
        else:
            d["bis"].pop(k, None)
    if apps is not None:
        a = sorted({x for x in apps if x in GRUPPEN_KEYS})
        if a:
            d["apps"][k] = a
        else:
            d["apps"].pop(k, None)
    _schreiben(c, d, wer)
    return alt


def stand(c, u):
    d = lesen(c)
    p = person(c, u["id"], d)
    return {"ich": p["aus"], "bis": p["bis"], "apps": p["apps"], "alle": d["alle"], "darf_alle": _darf_alle(u), "seite": "/bp/mail/" + token(c, u["id"]),
            "gruppen": [{"key": k, "name": n} for k, n, _ in GRUPPEN], **({"stau": stau(c)} if _darf_alle(u) else {})}


def setzen(c, u, ich=None, alle=None):
    """Haken setzen – „ich“ darf jede:r für sich, „alle“ nur mit dem Recht „Benachrichtigungen aller“. → Stand vorher (für Rückgängig)."""
    alt = stand(c, u)
    if alle is not None:
        if not _darf_alle(u):
            raise PermissionError("Für alle abschalten geht nur mit dem Recht „Benachrichtigungen aller“.")
        d = lesen(c)
        d["alle"] = bool(alle)
        _schreiben(c, d, u["name"])
    if ich is not None:
        person_setzen(c, u["id"], u["name"], aus=bool(ich))
    return alt


# ---------------------------------------------------------------- Link in der Mail (wie bei einem Newsletter)
def schluessel(c):
    """Geheimnis für die Links – liegt nur in der Datenbank, nie im Browser."""
    import secrets
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (KEY + ":schluessel",)).fetchone()
    if r and r["data"]:
        return r["data"].encode()
    k = secrets.token_urlsafe(32)
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO NOTHING", (KEY + ":schluessel", k, "", "mailaus"))
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (KEY + ":schluessel",)).fetchone()
    return (r["data"] if r else k).encode()


def _sig(key, uid):
    import base64, hashlib, hmac
    return base64.urlsafe_b64encode(hmac.new(key, f"mailaus:{int(uid)}".encode(), hashlib.sha256).digest()).decode().rstrip("=")[:32]


def token(c, uid, key=None):
    return f"{int(uid)}.{_sig(key or schluessel(c), uid)}"


def token_uid(c, tok):
    """Benutzer-Nummer aus dem Link oder None. Der Link erlaubt nur, die eigenen Mail-Benachrichtigungen zu schalten – sonst nichts."""
    import hmac
    u, _, s = str(tok or "").partition(".")
    if not u.isdigit() or not s or not hmac.compare_digest(s, _sig(schluessel(c), u)):
        return None
    return int(u)


def _karte(c):
    d = lesen(c)
    return {"alle": d["alle"], "uids": set(d["uids"]), "bis": d["bis"], "apps": {k: set(v) for k, v in d["apps"].items()},
            "adr": {(r["email"] or "").strip().lower(): r["id"] for r in c.execute("SELECT id, email FROM users").fetchall() if (r["email"] or "").strip()},
            "key": schluessel(c)}


def _aus(K, heute, app=""):
    def weg(uid):
        k = str(uid)
        return K["alle"] or uid in K["uids"] or K["bis"].get(k, "") >= heute or (app or "sonst") in K["apps"].get(k, ())
    return frozenset(a for a, uid in K["adr"].items() if weg(uid))


def adressen(c, app=""):
    """Adressen (klein geschrieben), an die keine Benachrichtigungs-Mail (dieser App) geht."""
    return _aus(_karte(c), _heute(), app)


def _merk():
    """Stand kurz gemerkt. Ist die Datenbank nicht erreichbar, gilt der letzte bekannte Stand."""
    if time.time() >= _MERK["bis"]:
        try:
            from . import db
            with db.tx() as c:
                _MERK["k"] = _karte(c)
        except Exception:   # Mailversand darf an dieser Prüfung nicht scheitern
            pass
        _MERK["bis"] = time.time() + DAUER
    return _MERK.get("k")


def gesperrt(app=""):
    """Für mail.smtp_senden: an wen diese Benachrichtigung nicht geht."""
    K = _merk()
    return _aus(K, _heute(), app) if K else frozenset()


def link(cf, adresse):
    """Persönlicher Link „Benachrichtigungen einstellen“ für die Mail an diese Adresse – leer, wenn sie keiner Benutzer:in gehört."""
    K = _merk()
    uid = K and K["adr"].get((adresse or "").strip().lower())
    if not uid:
        return ""
    from . import platform
    return platform.link("portal", "bp/mail/" + token(None, uid, K["key"]), cf)


def fuss(cf, empfaenger):
    """(Text, Link) für das Ende einer Benachrichtigung an genau eine Benutzer:in, sonst ("", "")."""
    if len(empfaenger) != 1:
        return "", ""
    lk = link(cf, empfaenger[0])
    return (f"\n\n--\nKeine Mails mehr von der Bauplattform? Abschalten, pausieren oder nach Apps auswählen:\n{lk}\n", lk) if lk else ("", "")


def filtern(msg, empfaenger, aus):
    """Empfänger ohne die Abgeschalteten; die Kopfzeilen An/Cc der Mail werden mitgeführt (Microsoft 365 sendet nach den Kopfzeilen)."""
    from email.utils import formataddr, getaddresses
    ok = lambda a: (a or "").strip().lower() not in aus   # noqa: E731
    bleibt = [e for e in empfaenger if ok(e)]
    if len(bleibt) == len(empfaenger):
        return empfaenger
    for h in ("To", "Cc"):
        if msg.get(h):
            rest = [(n, a) for n, a in getaddresses(msg.get_all(h)) if ok(a)]
            del msg[h]
            if rest:
                msg[h] = ", ".join(formataddr(x) for x in rest)
    return bleibt


def routen(bp, user):
    from flask import Response, jsonify, request
    from . import db

    @bp.route("/api/bp/mailaus", methods=["GET", "PUT"])
    def mailaus_api():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        try:
            with db.tx() as c:
                alt = None
                if request.method == "PUT":
                    b = request.get_json(silent=True) or {}
                    alt = setzen(c, u, b["ich"] if isinstance(b.get("ich"), bool) else None, b["alle"] if isinstance(b.get("alle"), bool) else None)
                return jsonify(**stand(c, u), vorher=alt)
        except PermissionError as e:
            return jsonify(error=str(e)), 403

    @bp.get("/bp/mail/<tok>")
    def mailaus_seite(tok):
        """Seite hinter dem Link in der Mail – ohne Anmeldung, nur für die eigenen Mail-Benachrichtigungen."""
        from .mailaus_seite import SEITE
        return Response(SEITE, mimetype="text/html", headers={"Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer"})

    @bp.post("/bp/mail/<tok>")
    def mailaus_schalten(tok):
        b = request.get_json(silent=True) or {}
        try:
            with db.tx() as c:
                uid = token_uid(c, tok)
                r = c.execute("SELECT name FROM users WHERE id=?", (uid,)).fetchone() if uid else None
                if not r:
                    return jsonify(error="Dieser Link gilt nicht (mehr)."), 404
                if any(k in b for k in ("aus", "bis", "apps")):
                    person_setzen(c, uid, f"{r['name']} (Link in der Mail)", aus=b["aus"] if isinstance(b.get("aus"), bool) else None,
                                  bis=b["bis"] if isinstance(b.get("bis"), str) else None, apps=b["apps"] if isinstance(b.get("apps"), list) else None)
                p = person(c, uid)
                return jsonify(name=r["name"], **p, gruppen=[{"key": k, "name": n, "text": t} for k, n, t in GRUPPEN])
        except ValueError as e:
            return jsonify(error=str(e)), 400
