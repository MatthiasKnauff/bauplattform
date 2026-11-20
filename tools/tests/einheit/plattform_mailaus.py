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
        mailaus._MERK.update(bis=0.0, adr=frozenset())


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
        mailaus.gesperrt = lambda: frozenset({"anna@buero.de"})
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
    import os
    R = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    a = open(os.path.join(R, "plattform", "aufgaben.py"), encoding="utf-8").read()
    b = open(os.path.join(R, "bautagebuch", "core", "reminders.py"), encoding="utf-8").read()
    pruefe("termin>=?" in a and "mailaus.grenze(now)" in a, "Erinnerungen (Aufgaben): Grenze fehlt")
    pruefe("i.due >= ?" in b and "mailaus.grenze(now)" in b, "Bautagebuch (fällige Punkte): Grenze fehlt")
