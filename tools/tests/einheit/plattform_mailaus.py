"""Alle Benachrichtigungs-Mails abschalten (bpcore/mailaus.py, 20.11.2026): ein Haken je Person, einer „für alle“ (nur mit Recht).
Geprüft wird an der einen Stelle, durch die jede Mail geht (mail.smtp_senden) – wer abgeschaltet hat, fällt aus den Empfängern, bleibt
niemand, geht nichts hinaus. Was jemand selbst abschickt oder anfordert (direkt), geht weiter. Aufgestaute Erinnerungen (Termin älter als
STAU_TAGE) werden nie nachträglich gemailt."""
import sqlite3
from datetime import datetime
from email.message import EmailMessage

from bpcore import mail, mailaus, meldungen
from lib import gleich, pruefe


def _db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.executescript("""CREATE TABLE bp_store(key TEXT PRIMARY KEY, data TEXT, updated TEXT, updated_by TEXT);
        CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, email TEXT);
        INSERT INTO users VALUES (1, 'Anna', 'Anna@buero.de'), (2, 'Ben', 'ben@buero.de'), (3, 'Cem', '');
        CREATE TABLE erinnerungen(id INTEGER PRIMARY KEY, status TEXT, gesendet TEXT, termin TEXT);
        CREATE TABLE items(id INTEGER PRIMARY KEY, due TEXT, reminded TEXT, done INTEGER, remind_user INTEGER);""")
    return c


def _mit(fn):
    alt = meldungen.darf_alle
    meldungen.darf_alle = lambda u: bool(u.get("admin"))
    try:
        return fn()
    finally:
        meldungen.darf_alle = alt
        mailaus._MERK.update(bis=0.0)
        mailaus._MERK.pop("k", None)


def test_haken_je_person_und_fuer_alle():
    def f():
        c = _db()
        anna, ben = {"id": 1, "name": "Anna"}, {"id": 2, "name": "Ben", "admin": True}
        gleich(mailaus.adressen(c), frozenset(), "ohne Haken geht alles")
        mailaus.setzen(c, anna, ich=True)
        gleich((mailaus.stand(c, anna)["ich"], mailaus.stand(c, ben)["ich"]), (True, False), "Haken gilt nur für die Person")
        gleich(mailaus.adressen(c), frozenset({"anna@buero.de"}), "Adresse klein geschrieben")
        try:
            mailaus.setzen(c, anna, alle=True)
            pruefe(False, "„für alle“ ohne Recht muss abgewiesen werden")
        except PermissionError:
            pass
        alt = mailaus.setzen(c, ben, alle=True)
        gleich(alt["alle"], False, "Stand vorher für Rückgängig")
        gleich(mailaus.adressen(c), frozenset({"anna@buero.de", "ben@buero.de"}), "für alle: jede Adresse einer Benutzer:in, leere nicht")
        mailaus.setzen(c, ben, alle=False)
        mailaus.setzen(c, anna, ich=False)
        gleich(mailaus.adressen(c), frozenset(), "wieder an")
    _mit(f)


def _msg(to, cc=""):
    m = EmailMessage()
    m["From"], m["To"], m["Subject"] = "Bauplattform <b@buero.de>", to, "Erinnerung"
    if cc:
        m["Cc"] = cc
    m.set_content("x")
    return m


def test_die_eine_stelle_filtert():
    def f():
        raus = []
        alt = (mail._smtp_senden, mailaus.gesperrt)
        mail._smtp_senden = lambda cf, msg, absender, emp: raus.append((list(emp), msg.get("To"), msg.get("Cc"))) or "smtp"
        mailaus.gesperrt = lambda app="": frozenset({"anna@buero.de"})
        try:
            gleich(mail.smtp_senden({}, _msg("Anna@buero.de"), "b@buero.de", ["Anna@buero.de"]), "aus", "Benachrichtigung an Abgeschaltete: nichts geht hinaus")
            gleich(raus, [], "wirklich nichts verschickt")
            mail.smtp_senden({}, _msg("Anna <anna@buero.de>, ben@buero.de", "firma@extern.de"), "b@buero.de", ["anna@buero.de", "ben@buero.de", "firma@extern.de"])
            gleich(raus[-1][0], ["ben@buero.de", "firma@extern.de"], "die anderen Empfänger bekommen die Mail")
            pruefe("anna" not in (raus[-1][1] or "").lower() and raus[-1][2] == "firma@extern.de", f"Kopfzeilen mitgeführt (Microsoft 365 sendet danach): {raus[-1]}")
            mail.smtp_senden({}, _msg("anna@buero.de"), "b@buero.de", ["anna@buero.de"], direkt=True)
            gleich(raus[-1][0], ["anna@buero.de"], "direkt (selbst abgeschickt/angefordert): geht trotzdem")
            pruefe("direkt=True" in open(mail.__file__, encoding="utf-8").read().split("def direkt(")[1].split("def ")[0], "mail.direkt kennzeichnet")
        finally:
            mail._smtp_senden, mailaus.gesperrt = alt
    _mit(f)


def test_aufgestautes_wird_nicht_nachgemailt():
    def f():
        c = _db()
        jetzt = datetime(2026, 11, 20, 9, 0)
        gleich(mailaus.grenze(jetzt), "2026-11-17", "nur Termine der letzten drei Tage")
        c.executescript("""INSERT INTO erinnerungen(status, gesendet, termin) VALUES ('offen', '', '2026-10-01'), ('offen', '', '2026-11-19'), ('offen', '2026-10-02', '2026-10-01'), ('aus', '', '2026-10-01');
            INSERT INTO items(due, reminded, done, remind_user) VALUES ('2026-10-05', '', 0, 1), ('2026-10-05', '', 1, 1), ('2026-11-18', '', 0, 1), ('2026-10-05', 'aus', 0, 1);""")
        s = mailaus.stau(c, jetzt)
        gleich((s["erinnerungen"], s["bautagebuch"]), (1, 1), "aufgestaut = offen, nie gesendet, Termin vor der Grenze")
    _mit(f)


def test_laeufe_benutzen_die_grenze():
    """Die Läufe, die Erinnerungen mailen, nehmen die Grenze – geprüft an den Dateien, die in dieser Umgebung da sind (im Container liegt
    jede App für sich, im Repo beide)."""
    import os
    import sys
    def finde(*teile):
        for w in sys.path + [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", x) for x in ("plattform", "bautagebuch")]:
            f = os.path.join(w or ".", *teile)
            if os.path.isfile(f):
                return open(f, encoding="utf-8").read()
        return None
    a, b = finde("aufgaben.py"), finde("core", "reminders.py")
    pruefe(a is not None or b is not None, "weder aufgaben.py noch core/reminders.py gefunden")
    if a is not None:
        pruefe("termin>=?" in a and "mailaus.grenze(now)" in a, "Erinnerungen (Aufgaben): Grenze fehlt")
    if b is not None:
        pruefe("i.due >= ?" in b and "mailaus.grenze(now)" in b, "Bautagebuch (fällige Punkte): Grenze fehlt")


def test_pause_nach_apps_und_link():
    """Wie bei einem Newsletter: Link in der Mail → Seite ohne Anmeldung mit alles aus · alles aus bis · nach Apps."""
    def f():
        from datetime import date, timedelta
        c = _db()
        morgen, gestern = (date.today() + timedelta(days=1)).isoformat(), (date.today() - timedelta(days=1)).isoformat()
        mailaus.person_setzen(c, 1, "Anna", bis=morgen)
        gleich(mailaus.adressen(c, "aufgaben"), frozenset({"anna@buero.de"}), "Pause bis morgen: nichts geht")
        mailaus.person_setzen(c, 1, "Anna", bis=gestern)
        gleich((mailaus.adressen(c), mailaus.person(c, 1)["bis"]), (frozenset(), ""), "Pause vorbei: Mails kommen von selbst wieder")
        mailaus.person_setzen(c, 2, "Ben", apps=["kalender", "gibtsnicht"])
        gleich(mailaus.person(c, 2)["apps"], ["kalender"], "nur bekannte Gruppen")
        gleich((mailaus.adressen(c, "kalender"), mailaus.adressen(c, "aufgaben"), mailaus.adressen(c)), (frozenset({"ben@buero.de"}), frozenset(), frozenset()), "nur diese App ist aus")
        mailaus.person_setzen(c, 2, "Ben", apps=["sonst"])
        gleich(mailaus.adressen(c), frozenset({"ben@buero.de"}), "ohne Gruppe = „Sonstiges“")
        t = mailaus.token(c, 2)
        gleich((mailaus.token_uid(c, t), mailaus.token_uid(c, t[:-1] + ("a" if t[-1] != "a" else "b")), mailaus.token_uid(c, "3." + t.split(".")[1]), mailaus.token_uid(c, "")),
               (2, None, None, None), "Link gilt nur für die eigene Nummer, gefälscht gilt er nicht")
        pruefe("mail:aus:schluessel" not in mailaus.stand(c, {"id": 2, "name": "Ben"})["seite"] and c.execute("SELECT 1 FROM bp_store WHERE key='mail:aus:schluessel'").fetchone(), "Geheimnis liegt in der Datenbank, nicht im Link")
        # die Mail selbst: Fußzeile und Kopfzeile, nur bei Benachrichtigungen an genau eine Benutzer:in
        mailaus._MERK.update(bis=9e12, k=mailaus._karte(c))
        import os
        vorher = os.environ.get("BAUPORTAL_URL")
        os.environ["BAUPORTAL_URL"] = "https://bau.example"
        try:
            ft, lk = mailaus.fuss({}, ["Ben@buero.de"])
            pruefe(lk == "https://bau.example/bp/mail/" + t and lk in ft and "nach Apps" in ft, f"Link in der Mail: {lk}")
            gleich((mailaus.fuss({}, ["firma@extern.de"]), mailaus.fuss({}, ["ben@buero.de", "anna@buero.de"])), (("", ""), ("", "")), "kein Link an Fremde und bei mehreren Empfängern")
            raus = []
            alt = mail._smtp_senden, mail.configured
            mail._smtp_senden, mail.configured = (lambda cf, msg, a, e: raus.append(msg) or "smtp"), (lambda cf: True)
            try:
                mail.app("aufgaben", {"mail_user": "b@buero.de"}, "anna@buero.de", "Erinnerung", "Hallo")
                mail.direkt({"mail_user": "b@buero.de"}, "anna@buero.de", "Zugang", "Hallo")
            finally:
                mail._smtp_senden, mail.configured = alt
            pruefe("/bp/mail/1." in raus[0].get_content() and raus[0]["List-Unsubscribe"], "Benachrichtigung trägt Link und List-Unsubscribe")
            pruefe("/bp/mail/" not in raus[1].get_content() and not raus[1]["List-Unsubscribe"], "selbst Abgeschicktes trägt keinen Abmelde-Link")
        finally:
            os.environ.pop("BAUPORTAL_URL", None)
            if vorher is not None:
                os.environ["BAUPORTAL_URL"] = vorher
        from bpcore.mailaus_seite import SEITE
        pruefe(all(x in SEITE for x in ("Alle Mails abschalten", "Pause", "Nach Apps", "onclick") [:3]) and "onclick=" not in SEITE, "Seite: alles aus · Pause bis · nach Apps, ohne Inline-Handler")
    _mit(f)


def test_dieselbe_seite_fuers_ganze_buero():
    """Unter „Für alle“ steht dieselbe Seite wie für die Person – alles aus · aus bis · nach Apps, nur fürs ganze Büro und nur mit Recht."""
    def f():
        from datetime import date, timedelta
        c = _db()
        anna, ben = {"id": 1, "name": "Anna"}, {"id": 2, "name": "Ben", "admin": True}
        morgen = (date.today() + timedelta(days=1)).isoformat()
        try:
            mailaus.buero_setzen(c, anna, apps=["kalender"])
            pruefe(False, "fürs Büro schalten ohne Recht muss abgewiesen werden")
        except PermissionError:
            pass
        mailaus.buero_setzen(c, ben, apps=["kalender"])
        gleich((mailaus.adressen(c, "kalender"), mailaus.adressen(c, "aufgaben")), (frozenset({"anna@buero.de", "ben@buero.de"}), frozenset()), "eine App für alle aus")
        gleich(mailaus.person(c, 1)["buero"]["apps"], ["kalender"], "die Person sieht, was das Büro abgeschaltet hat")
        mailaus.buero_setzen(c, ben, apps=[], bis=morgen)
        gleich((mailaus.adressen(c, "aufgaben"), mailaus.buero(c)["bis"]), (frozenset({"anna@buero.de", "ben@buero.de"}), morgen), "Pause für alle")
        mailaus.buero_setzen(c, ben, bis="", aus=True)
        gleich((mailaus.buero(c), mailaus.stand(c, anna)["alle"]), ({"aus": True, "bis": "", "apps": []}, True), "alles aus für alle")
        mailaus.buero_setzen(c, ben, aus=False)
        gleich(mailaus.adressen(c), frozenset(), "wieder an")
        pruefe(mailaus.stand(c, ben)["seite_alle"] == "bp/mail/alle" and mailaus.token_uid(c, "alle") is None, "„alle“ ist kein Schlüssel im Link – die Seite fürs Büro geht nur angemeldet")
    _mit(f)
