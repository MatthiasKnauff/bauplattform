"""E-Mail-Erinnerungen für Einträge mit Erledigungsdatum (Mängel, Weisungen, Zu erledigen).

Am Fälligkeitstag zur gewählten Uhrzeit (Standard 9:00 Uhr Serverzeit, Zeitzone über die Umgebungsvariable TZ) bekommt der Benutzer, der das
Datum gesetzt hat, eine Sammel-Mail. Bereits erledigte Einträge werden übersprungen. Pro Eintrag wird nur einmal
erinnert; nachgeholt wird auch, wenn der Server am Tag selbst nicht lief.
"""
import threading, time
from datetime import datetime
from . import db, mail, settings
from bpcore import fehler   # stille Fehler für die Verwaltung festhalten

_started = False


def _de(d):
    y, m, t = d.split("-")
    return f"{int(t)}.{int(m)}.{y}"


def run_once(now=None):
    """Gibt die Zahl der verschickten Mails zurück."""
    now = now or datetime.now()
    today, hhmm = now.date().isoformat(), now.strftime("%H:%M")
    with db.tx() as c:
        conf = settings.all(c)
        if not mail.configured(conf):
            return 0
        rows = c.execute("""SELECT i.id, i.text, i.due, i.due_time, i.remind_user, s.title AS sec, p.name AS proj, p.id AS pid, r.date AS rdate
            FROM items i JOIN reports r ON r.id=i.report_id JOIN projects p ON p.id=r.project_id
            LEFT JOIN sections s ON s.key=i.kind
            WHERE i.due != '' AND i.due <= ? AND i.reminded = '' AND i.done = 0 AND i.remind_user IS NOT NULL
            ORDER BY i.due, i.id""", (today,)).fetchall()
        rows = [r for r in rows if r["due"] < today or (r["due_time"] or "09:00") <= hhmm]   # Uhrzeit am Fälligkeitstag abwarten
        # Empfänger nach der Einstellung dessen, der das Datum gesetzt hat: nur er oder alle Bauleiter des Projekts (⚙ → Für mich → Erinnerungen)
        try:
            from bpcore import erinnern
            emp = {r["id"]: erinnern.empfaenger(c, r["remind_user"], r["pid"]) for r in rows}
        except Exception as e:
            fehler.still("bautagebuch", "Erinnerungen: Empfänger ermitteln", e)
            emp = {r["id"]: [r["remind_user"]] for r in rows}
        alle = {x for v in emp.values() for x in v}
        users = {x: c.execute("SELECT name, email FROM users WHERE id=?", (x,)).fetchone() for x in alle}
    by_user = {}
    for r in rows:
        for x in emp.get(r["id"]) or [r["remind_user"]]:
            by_user.setdefault(x, []).append(r)
    reserviert = {}   # Eintrag → Tag, an dem er (für alle Empfänger) verschickt wird
    sent = 0
    for uid, items in by_user.items():
        u = users.get(uid)
        if not u or not u["email"]:
            continue   # ohne E-Mail-Adresse keine Erinnerung; sie wird nachgeholt, sobald eine eingetragen ist
        with db.tx() as c:   # Einträge „reservieren“, damit zwei Worker nicht doppelt senden (je Eintrag einmal, gilt für alle seine Empfänger)
            mine = []
            for i in items:
                if i["id"] not in reserviert:
                    reserviert[i["id"]] = c.execute("UPDATE items SET reminded=? WHERE id=? AND reminded=''", (today, i["id"])).rowcount == 1
                if reserviert[i["id"]]:
                    mine.append(i)
        if not mine:
            continue
        from bpcore import platform
        lk = lambda i: platform.link("aufgaben", f"#mangel-{i['id']}", conf)   # direkt zum Eintrag in „Aufgaben & Mängel“
        lines = [f"• {i['proj']} – {i['sec'] or 'Eintrag'}: {i['text'].strip().splitlines()[0]}  (fällig {_de(i['due'])} {i['due_time'] or '09:00'}, Bericht vom {_de(i['rdate'])})"
                 + (f"\n  {lk(i)}" if lk(i) else "") for i in mine]
        body = (f"Hallo {u['name']},\n\nfolgende Punkte aus dem Bautagebuch sind heute fällig bzw. überfällig:\n\n" + "\n".join(lines) + "\n")
        try:
            mail.send(conf, u["email"], f"Bautagebuch – {len(mine)} Punkt{'e' if len(mine) != 1 else ''} fällig", body)
            sent += 1
        except mail.MailError as e:
            # vorübergehend: beim nächsten Durchlauf erneut; ungültige Adresse: nicht mehr (sonst sperrt Microsoft 365 das Postfach)
            with db.tx() as c:
                c.executemany("UPDATE items SET reminded=? WHERE id=?", [("fehler" if e.dauerhaft else "", i["id"]) for i in mine])
            if e.dauerhaft:
                try:
                    from . import audit
                    audit.record("System", "mail", "Erinnerung nicht zustellbar", f"{u['name']} <{u['email']}>: {e}"[:300])
                except Exception:   # audit.record meldet eigene Fehler selbst – hier nur Absicherung
                    pass
            if e.gesperrt:
                break
    return sent


def start():
    global _started
    if _started:
        return
    _started = True

    def loop():
        while True:
            try:
                run_once()
            except Exception as e:
                fehler.still("bautagebuch", "Erinnerungen (Hintergrund)", e)
                pass
            time.sleep(600)
    threading.Thread(target=loop, daemon=True, name="bt-reminders").start()
