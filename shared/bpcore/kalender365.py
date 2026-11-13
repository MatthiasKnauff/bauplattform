"""Termine direkt im Outlook-Kalender (Microsoft 365, Graph) – statt einer angehängten termin.ics.

Ist Microsoft 365 verbunden (Verwaltung → Einstellungen → Posteingang: Mandant, Client-ID, Geheimnis) und hat die App die
Anwendungsberechtigung „Calendars.ReadWrite“, legt die Bauplattform den Termin im Kalender des Absenders an:
  – ohne Teilnehmer steht er dort sofort (eigene Aufgabe),
  – mit Teilnehmern verschickt Exchange selbst eine echte Besprechungsanfrage mit „Annehmen“/„Ablehnen“.
Gleiche transactionId → kein doppelter Termin, wenn dieselbe Aufgabe noch einmal gesendet wird.
Fehlt die Berechtigung oder ist M365 nicht verbunden, liefert termin() None – dann geht es wie bisher mit termin.ics.
"""
import json, urllib.error, urllib.parse, urllib.request
from datetime import date, timedelta

TZ = "W. Europe Standard Time"
_GESPERRT = {"bis": 0.0}   # nach „keine Berechtigung“ eine Weile nicht erneut versuchen


def termin(c, organisator, titel, text, datum, teilnehmer=(), ganztags=True, uhrzeit=None, minuten=30, erinnerung_min=None, schluessel=""):
    """Termin im Kalender von `organisator` (E-Mail) anlegen. teilnehmer: [(E-Mail, Name)] ohne den Organisator.
    Gibt die Event-ID zurück oder None (dann bitte termin.ics verwenden)."""
    import os, time
    if os.environ.get("TESTSERVER") == "1":   # Testserver: keine Termine in echten Kalendern
        return None
    from . import posteingang as PE
    if not organisator or time.time() < _GESPERRT["bis"] or not PE.m365_ok(c):
        return None
    try:
        tok = PE._token(PE.m365_conf(c))
    except Exception:
        return None
    if ganztags:
        d0 = date.fromisoformat(datum)
        start, ende = {"dateTime": f"{d0}T00:00:00", "timeZone": TZ}, {"dateTime": f"{d0 + timedelta(days=1)}T00:00:00", "timeZone": TZ}
    else:
        from datetime import datetime
        st = datetime.strptime(f"{datum} {uhrzeit or '08:00'}", "%Y-%m-%d %H:%M")
        start, ende = {"dateTime": st.isoformat(), "timeZone": TZ}, {"dateTime": (st + timedelta(minutes=minuten or 30)).isoformat(), "timeZone": TZ}
    ev = {"subject": titel[:250], "body": {"contentType": "text", "content": text[:20000]}, "start": start, "end": ende, "isAllDay": bool(ganztags),
          "showAs": "free" if ganztags else "busy",
          "attendees": [{"emailAddress": {"address": m, "name": n or m}, "type": "required"} for m, n in teilnehmer if m and m.lower() != organisator.lower()]}
    if erinnerung_min is not None:
        ev.update(isReminderOn=True, reminderMinutesBeforeStart=int(erinnerung_min))
    if schluessel:
        ev["transactionId"] = schluessel[:200]
    req = urllib.request.Request(f"https://graph.microsoft.com/v1.0/users/{urllib.parse.quote(organisator)}/events", data=json.dumps(ev).encode(),
                                 headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json", "Prefer": 'outlook.timezone="W. Europe Standard Time"'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode() or "{}").get("id") or "ok"
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):   # Berechtigung „Calendars.ReadWrite“ fehlt – eine Stunde lang nicht erneut fragen
            _GESPERRT["bis"] = time.time() + 3600
        from . import fehler
        try:
            fehler.still(None, f"Termin in Outlook anlegen ({e.code})", RuntimeError(e.read().decode(errors="replace")[:400]))
        except Exception:
            pass
        return None
    except Exception:
        return None
