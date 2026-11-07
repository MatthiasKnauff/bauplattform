"""E-Mail-Versand für die Plattform-Apps – mit dem Postfach aus Verwaltung → Einstellungen → Mailserver (gleiche Daten wie im Bautagebuch)."""
import re, smtplib, ssl, time
from datetime import datetime
from email.message import EmailMessage

# Postausgang: bekannte Anbieter (wie die Postfächer unter ⚙ → Für mich), „andere“ mit eigenem Server (mail_host / mail_port)
PROVIDERS = {"o365": ("smtp.office365.com", 587), "gmail": ("smtp.gmail.com", 587), "outlook": ("smtp-mail.outlook.com", 587),
             "webde": ("smtp.web.de", 587), "gmx": ("mail.gmx.net", 587), "tonline": ("securesmtp.t-online.de", 465),
             "ionos": ("smtp.ionos.de", 587), "strato": ("smtp.strato.de", 465)}
HINWEIS = {"gmail": "Bei Gmail ist ein „App-Passwort“ nötig (Google-Konto mit Bestätigung in zwei Schritten).",
           "o365": "Bei Office 365 muss „Authentifizierter SMTP-Versand“ für das Postfach erlaubt sein.",
           "webde": "Bei WEB.DE muss in den Einstellungen des Postfachs „POP3/IMAP/SMTP“ erlaubt sein.",
           "gmx": "Bei GMX muss in den Einstellungen des Postfachs „POP3/IMAP/SMTP“ erlaubt sein.",
           "tonline": "Bei T-Online ist ein eigenes „E-Mail-Passwort“ nötig (Kundencenter → E-Mail-Passwort)."}


def server(cf):
    """(Host, Port) des Postausgangs."""
    prov = cf.get("mail_provider") or "gmail"
    if prov == "andere":
        try:
            port = int(cf.get("mail_port") or 587)
        except ValueError:
            port = 587
        return (cf.get("mail_host") or "").strip(), port
    return PROVIDERS.get(prov, PROVIDERS["gmail"])
ADRESSE = re.compile(r"^[^@\s<>,;]+@[^@\s<>,;]+\.[A-Za-z]{2,}$")
PAUSE_S = 2 * 3600                 # nach einer Sperre durch den Mailserver so lange nichts mehr versuchen
_pause = {"bis": 0.0}


class MailError(Exception):
    """dauerhaft: Empfänger ungültig – nicht erneut versuchen. gesperrt: Mailserver hat das Postfach gedrosselt – vorerst gar nichts senden."""
    def __init__(self, msg, dauerhaft=False, gesperrt=False):
        super().__init__(msg)
        self.dauerhaft, self.gesperrt = dauerhaft, gesperrt


def pause_aufheben():
    """Testmail: trotz eigener Pause wirklich versuchen (falls Microsoft die Sperre schon aufgehoben hat)."""
    _pause["bis"] = 0.0


def pause_text():
    return (f"Der Mailserver hat das Postfach vorübergehend gesperrt, weil zu viele Mails an ungültige Adressen gingen "
            f"(Microsoft 365: „Sender throttled“). Die Plattform versucht es ab {datetime.fromtimestamp(_pause['bis']).strftime('%H:%M')} Uhr wieder; "
            "Microsoft hebt die Sperre meist nach einigen Stunden, spätestens nach 24 Stunden auf. "
            "Bitte die E-Mail-Adressen der Benutzer prüfen (Verwaltung → Benutzer & Rechte) – die abgelehnten stehen im Protokoll.")


def smtp_senden(cf, msg, absender, empfaenger):
    """Mail verschicken; gescheiterte Mails stehen unter Verwaltung → System → Fehlermeldungen."""
    try:
        return _smtp_senden(cf, msg, absender, empfaenger)
    except MailError as e:
        _melden(e, empfaenger, msg.get("Subject", ""))
        raise


def _smtp_senden(cf, msg, absender, empfaenger):
    """Mail über den eingetragenen Server verschicken. Fehler als MailError (dauerhaft / gesperrt, siehe oben)."""
    if time.time() < _pause["bis"]:
        raise MailError(pause_text(), gesperrt=True)
    falsch = [a for a in empfaenger if not ADRESSE.match(a.strip())]
    if falsch:
        raise MailError("Ungültige E-Mail-Adresse: " + ", ".join(falsch), dauerhaft=True)
    prov = cf.get("mail_provider") or "gmail"
    host, port = server(cf)
    if not host:
        raise MailError("Für den Postausgang ist kein SMTP-Server eingetragen (⚙ → Büro → Mailserver).")
    try:
        if port == 465:   # SSL von Anfang an (z. B. T-Online, Strato)
            with smtplib.SMTP_SSL(host, port, timeout=20, context=ssl.create_default_context()) as s:
                s.login(cf["mail_user"], cf["mail_pass"])
                s.send_message(msg, to_addrs=empfaenger)
        else:             # STARTTLS (Port 587)
            with smtplib.SMTP(host, port, timeout=20) as s:
                s.ehlo(); s.starttls(context=ssl.create_default_context()); s.ehlo()
                s.login(cf["mail_user"], cf["mail_pass"])
                s.send_message(msg, to_addrs=empfaenger)
    except smtplib.SMTPAuthenticationError:
        hint = HINWEIS.get(prov, "Bei vielen Anbietern ist ein „App-Passwort“ nötig oder SMTP muss im Postfach erlaubt werden.")
        raise MailError("Anmeldung am Mailserver abgelehnt – Zugangsdaten unter ⚙ → Büro → Mailserver prüfen. " + hint)
    except smtplib.SMTPRecipientsRefused as e:
        raise MailError("Empfänger vom Mailserver abgelehnt: " + ", ".join(e.recipients), dauerhaft=True)
    except smtplib.SMTPResponseException as e:
        txt = (e.smtp_error.decode("utf-8", "replace") if isinstance(e.smtp_error, bytes) else str(e.smtp_error))
        if "5.2.254" in txt or "throttl" in txt.lower():
            _pause["bis"] = time.time() + PAUSE_S * (3 if "invalid" in txt.lower() else 1)   # jeder weitere Versuch verlängert die Sperre bei Microsoft
            raise MailError(pause_text() + f" – Antwort des Servers: {e.smtp_code} {txt[:240]}", gesperrt=True)
        if isinstance(e, smtplib.SMTPSenderRefused):
            raise MailError(f"Der Mailserver lässt {absender} nicht als Absender zu – im Postfach „Senden als“ erlauben "
                            "oder unter ⚙ → Für mich den Absender auf das Büro stellen.")
        if e.smtp_code >= 500 and re.search(r"5\.1\.\d|recipient|mailbox unavailable|not found", txt, re.I):
            raise MailError(f"Empfänger abgelehnt ({e.smtp_code} {txt[:160]})", dauerhaft=True)
        raise MailError(f"Mailserver-Fehler {e.smtp_code}: {txt}"[:300])
    except (OSError, smtplib.SMTPException) as e:
        raise MailError(f"Mailserver nicht erreichbar oder Fehler: {e}"[:300])


def conf(c):
    return {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings WHERE key LIKE 'mail_%' OR key IN ('app_url','office_name')")}


def configured(cf):
    return bool(cf.get("mail_user") and cf.get("mail_pass"))


def von(cf):
    """Absenderadresse aller Mails: Einstellung „Absender“ beim Mailserver, sonst das Postfach selbst."""
    return (cf.get("mail_from") or "").strip() or cf.get("mail_user", "")


def _melden(e, to, subject):
    """Gescheiterte Mail unter Verwaltung → System → Fehlermeldungen (Art „Mail“) festhalten – nur einmal je Fehler."""
    if getattr(e, "gemeldet", False):
        return
    e.gemeldet = True
    if True:
        try:
            from . import fehler
            wer = ""
            try:
                from flask import g, has_request_context
                if has_request_context():
                    g.bp_fehler_gemeldet = True
                    u = getattr(g, "user", None)
                    wer = (u["name"] if u else "") or ""
            except Exception:   # Benutzer nur Beiwerk der Meldung
                pass
            ziel = ", ".join([to] if isinstance(to, str) else list(to or []))
            fehler.melden("mail", "mail", f"Mailversand gescheitert: {e}", "", f"an {ziel[:200]} · „{str(subject)[:120]}“", wer)
        except Exception:   # Melden darf den Versandfehler nicht überdecken
            pass


def send(cf, to, subject, body, *a, **k):
    """Wie _send – gescheiterte Mails stehen zusätzlich unter Verwaltung → System → Fehlermeldungen."""
    try:
        return _send(cf, to, subject, body, *a, **k)
    except MailError as e:
        _melden(e, to, subject)
        raise


def _send(cf, to, subject, body, sender="Bauplattform", attachments=None, cc=None, reply_to=None, ical=None, html=None, from_addr=None):
    """to/cc: Adresse oder Liste. attachments: [(Dateiname, bytes, "maintype/subtype")].
    ical: Text einer iCalendar-Einladung (METHOD:REQUEST) – erscheint in Outlook & Co. als Termin mit Annehmen/Ablehnen."""
    if not configured(cf):
        raise MailError("Der E-Mail-Versand ist nicht eingerichtet (Verwaltung → Einstellungen → Mailserver).")
    lst = lambda v: [x for x in ([v] if isinstance(v, str) else (v or [])) if x]
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = f"{sender} <{from_addr or von(cf)}>", ", ".join(lst(to)), subject
    if lst(cc):
        msg["Cc"] = ", ".join(lst(cc))
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body)
    if html:   # dieselbe Mail als HTML (Rich-Signatur); eingebettete Bilder (data:) als Inline-Anhang (cid:), das zeigen alle Mailprogramme
        import base64
        from email.utils import make_msgid
        bilder = []

        def _cid(m):
            cid = make_msgid(domain="bauplattform")[1:-1]
            bilder.append((cid, m.group(1).lower().replace("jpg", "jpeg"), base64.b64decode(m.group(2))))
            return 'src="cid:' + cid + '"'
        html = re.sub(r'src="data:image/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/=\s]+)"', _cid, html)
        msg.add_alternative(html, subtype="html")
        hp = msg.get_payload()[-1]
        for cid, sub, data in bilder:
            hp.add_related(data, maintype="image", subtype=sub, cid=f"<{cid}>")
    if ical:
        # Ist der Organisator selbst Empfänger, nimmt Exchange ihn aus der Einladung heraus – bleibt niemand übrig, lehnt Microsoft 365
        # die Mail ab („InvalidRecipientsException“) und sperrt das Postfach nach mehreren solchen Fällen („Sender throttled“).
        # Dann nur als Kalenderdatei zum Eintragen (PUBLISH) mitschicken, nicht als Einladung.
        org = re.search(r"ORGANIZER[^:\r\n]*:mailto:([^\r\n]+)", ical, re.I)
        if org and org.group(1).strip().lower() in {x.strip().lower() for x in lst(to) + lst(cc)}:
            ical = re.sub(r"(?m)^(ORGANIZER|ATTENDEE)[^\r\n]*\r?\n", "", ical).replace("METHOD:REQUEST", "METHOD:PUBLISH")
            msg.add_attachment(ical.encode("utf-8"), maintype="text", subtype="calendar", filename="termin.ics")
            ical = None
    if ical:
        msg.add_alternative(ical, subtype="calendar", params={"method": "REQUEST"})
    for name, data, mime in attachments or []:   # mime auch mit Parametern, z. B. "text/calendar; method=REQUEST"
        typ, *par = [x.strip() for x in (mime or "application/octet-stream").split(";")]
        mt, st = typ.split("/", 1)
        msg.add_attachment(data, maintype=mt, subtype=st, filename=name, params=dict(x.split("=", 1) for x in par if "=" in x))
    if ical:
        msg.add_attachment(ical.encode("utf-8"), maintype="text", subtype="calendar", filename="termin.ics")
    smtp_senden(cf, msg, from_addr or von(cf), lst(to) + lst(cc))
