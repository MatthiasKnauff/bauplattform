"""Alle Benachrichtigungs-Mails abschalten (20.11.2026): EIN Haken je Person („Keine Mails an mich“) und einer der Verwaltung („für alle“).

Gilt ohne Ausnahme für jede Mail, die die Plattform von sich aus an Benutzer:innen schickt – Erinnerungen, fällige Punkte, Aufgaben,
Termin-Einladungen und -Absagen, Abwesenheiten, Tagesbericht fehlt, Einladungen zum gemeinsamen Markieren … Geprüft wird an der EINEN
Stelle, durch die jede Mail geht (`mail.smtp_senden`): Adressen von Benutzer:innen mit Haken fallen aus den Empfängern; bleibt niemand,
geht nichts hinaus. Neue Benachrichtigungen sind damit von selbst erfasst.

Nicht betroffen (im Aufruf mit `direkt=True` gekennzeichnet): was jemand selbst und ausdrücklich abschickt bzw. anfordert – Unterlagen,
LVs, Pläne, Rügen (auch „Kopie an mich“), Zugangsdaten, Kennwort zurücksetzen, Testmail. Empfänger außerhalb des Büros sind nie betroffen.

bp_store „mail:aus“ = {"alle": bool, "uids": [..]}
"""
import json
import time

KEY = "mail:aus"
_MERK = {"bis": 0.0, "adr": frozenset()}
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
    return {"alle": bool(d.get("alle")), "uids": sorted({int(i) for i in d.get("uids") or [] if str(i).isdigit()})}


def _darf_alle(u):
    from . import meldungen
    return bool(u) and meldungen.darf_alle(u)


def stand(c, u):
    d = lesen(c)
    return {"ich": int(u["id"]) in d["uids"], "alle": d["alle"], "darf_alle": _darf_alle(u), **({"stau": stau(c)} if _darf_alle(u) else {})}


def setzen(c, u, ich=None, alle=None):
    """Haken setzen – „ich“ darf jede:r für sich, „alle“ nur mit dem Recht „Benachrichtigungen aller“. → Stand vorher (für Rückgängig)."""
    from datetime import datetime
    d, alt = lesen(c), stand(c, u)
    if alle is not None:
        if not _darf_alle(u):
            raise PermissionError("Für alle abschalten geht nur mit dem Recht „Benachrichtigungen aller“.")
        d["alle"] = bool(alle)
    if ich is not None:
        s = set(d["uids"])
        (s.add if ich else s.discard)(int(u["id"]))
        d["uids"] = sorted(s)
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (KEY, json.dumps(d), datetime.now().isoformat(timespec="seconds"), u["name"] or ""))
    _MERK["bis"] = 0.0
    return alt


def adressen(c):
    """Adressen (klein geschrieben), an die keine Benachrichtigungs-Mail geht."""
    d = lesen(c)
    if not d["alle"] and not d["uids"]:
        return frozenset()
    aus = set(d["uids"])
    return frozenset((r["email"] or "").strip().lower() for r in c.execute("SELECT id, email FROM users").fetchall()
                     if (r["email"] or "").strip() and (d["alle"] or r["id"] in aus))


def gesperrt():
    """Für mail.smtp_senden: dieselbe Menge, kurz gemerkt. Ist die Datenbank nicht erreichbar, gilt der letzte bekannte Stand."""
    if time.time() < _MERK["bis"]:
        return _MERK["adr"]
    try:
        from . import db
        with db.tx() as c:
            _MERK["adr"] = adressen(c)
    except Exception:   # Mailversand darf an dieser Prüfung nicht scheitern
        pass
    _MERK["bis"] = time.time() + DAUER
    return _MERK["adr"]


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
    from flask import jsonify, request
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
