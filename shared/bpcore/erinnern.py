"""Wie Erinnerungen verschickt werden – eine Einstellung je Benutzer (⚙ → Für mich → Erinnerungen), die für alle Apps gilt,
die erinnern: Bautagebuch (Mängel, Zu erledigen, Weisungen mit Datum), eigene Erinnerungen, Erinnerungen aus Mails – und künftige.

art  „mail“    einfache Mail am Erinnerungstag (wie bisher)
     „termin“  sofort eine Kalendereinladung (Outlook & Co.: „Annehmen“ trägt den Termin ein); die Mail am Tag entfällt
an   „ich“       nur an mich
     „bauleiter“ an alle Bauleiter des Projekts (und mich)

Neue Apps rufen empfaenger() für die Liste der Empfänger und – bei art „termin“ – termine_senden() auf.
"""
import json
from datetime import datetime

from . import konto

ARTEN = ("mail", "termin")
AN = ("ich", "bauleiter")


def einstellung(c, uid):
    p = konto.prefs(c, uid)
    art = p.get("erinnerung_art") if p.get("erinnerung_art") in ARTEN else ("termin" if p.get("kalender") else "mail")
    an = p.get("erinnerung_an") if p.get("erinnerung_an") in AN else "ich"
    return {"art": art, "an": an}


def bauleiter(c, pid):
    r = c.execute("SELECT leaders FROM projects WHERE id=?", (pid,)).fetchone() if pid else None
    try:
        return [int(x) for x in json.loads(r["leaders"] or "[]")] if r else []
    except (ValueError, TypeError):
        return []


def empfaenger(c, uid, pid):
    """Benutzer-IDs, die eine Erinnerung von uid zum Projekt pid bekommen (je nach Einstellung von uid)."""
    ids = [uid]
    if einstellung(c, uid)["an"] == "bauleiter":
        ids += [x for x in bauleiter(c, pid) if x != uid]
    aktiv = {r["id"] for r in c.execute("SELECT id FROM users WHERE active=1").fetchall()}
    return [x for x in dict.fromkeys(ids) if x in aktiv]


def termine_senden(c, schluessel, datum, uhrzeit, titel, text, pid, empf_ids, absender=""):
    """Kalendereinladung an alle Empfänger. Derselbe schluessel behält seine UID – verschoben = aktualisiert.
    Gibt (Anzahl verschickt, Fehlertext) zurück."""
    from . import ical, mail
    cf = mail.conf(c)
    if not mail.configured(cf):
        return 0, "Mailversand ist nicht eingerichtet."
    p = c.execute("SELECT name, street, zip, city FROM projects WHERE id=?", (pid,)).fetchone() if pid else None
    ort = ", ".join(x for x in (p["street"], " ".join(y for y in (p["zip"], p["city"]) if y)) if x) if p else ""
    host = (cf.get("app_url") or "bauplattform").split("//")[-1].split("/")[0] or "bauplattform"
    buero = cf.get("office_name") or "Bauplattform"
    key = f"ical:termin:{schluessel}"
    alt = c.execute("SELECT data FROM bp_store WHERE key=?", (key,)).fetchone()
    seq = (json.loads(alt["data"]).get("seq", 0) + 1) if alt else 0
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated",
              (key, json.dumps({"seq": seq, "termin": datum}), datetime.now().isoformat(timespec="seconds"), absender))
    body = "\n".join(x for x in (titel, (p["name"] if p else ""), "", text or "") if x is not None).strip()
    n, fehl = 0, []
    for u in c.execute("SELECT id, name, email FROM users WHERE active=1").fetchall():
        if u["id"] not in empf_ids or not (u["email"] or "").strip():
            continue
        inv = ical.einladung(f"{schluessel}-{u['id']}@{host}", datum, uhrzeit or "08:00", 30, titel, body, ort, cf.get("mail_user") or u["email"],
                             buero, u["email"], u["name"] or "", seq=seq)
        try:
            mail.send(cf, u["email"], titel, body + "\n\nIm Anhang als Termin – „Annehmen“ trägt ihn in deinen Kalender ein (termin.ics öffnen: Kalender selbst wählen).",
                      sender=absender or buero, ical=inv)
            n += 1
        except Exception as e:
            fehl.append(f"{u['name']}: {e}")
    return n, "; ".join(fehl)[:300]
