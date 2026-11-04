"""E-Mail-Versand für die Plattform-Apps – mit dem Postfach aus Verwaltung → Einstellungen → Mailserver (gleiche Daten wie im Bautagebuch)."""
import smtplib, ssl
from email.message import EmailMessage

PROVIDERS = {"gmail": ("smtp.gmail.com", 587), "o365": ("smtp.office365.com", 587)}


class MailError(Exception):
    pass


def conf(c):
    return {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings WHERE key LIKE 'mail_%' OR key IN ('app_url','office_name')")}


def configured(cf):
    return bool(cf.get("mail_user") and cf.get("mail_pass"))


def send(cf, to, subject, body, sender="Bauplattform", attachments=None, cc=None, reply_to=None, ical=None):
    """to/cc: Adresse oder Liste. attachments: [(Dateiname, bytes, "maintype/subtype")].
    ical: Text einer iCalendar-Einladung (METHOD:REQUEST) – erscheint in Outlook & Co. als Termin mit Annehmen/Ablehnen."""
    if not configured(cf):
        raise MailError("Der E-Mail-Versand ist nicht eingerichtet (Verwaltung → Einstellungen → Mailserver).")
    prov = cf.get("mail_provider") or "gmail"
    host, port = PROVIDERS.get(prov, PROVIDERS["gmail"])
    lst = lambda v: [x for x in ([v] if isinstance(v, str) else (v or [])) if x]
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = f"{sender} <{cf['mail_user']}>", ", ".join(lst(to)), subject
    if lst(cc):
        msg["Cc"] = ", ".join(lst(cc))
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body)
    if ical:
        msg.add_alternative(ical, subtype="calendar", params={"method": "REQUEST"})
    for name, data, mime in attachments or []:
        mt, st = (mime or "application/octet-stream").split("/", 1)
        msg.add_attachment(data, maintype=mt, subtype=st, filename=name)
    if ical:
        msg.add_attachment(ical.encode("utf-8"), maintype="text", subtype="calendar", filename="termin.ics")
    try:
        with smtplib.SMTP(host, port, timeout=20) as s:
            s.ehlo(); s.starttls(context=ssl.create_default_context()); s.ehlo()
            s.login(cf["mail_user"], cf["mail_pass"])
            s.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        raise MailError("Anmeldung am Mailserver abgelehnt – Zugangsdaten unter Verwaltung → Einstellungen → Mailserver prüfen.")
    except (OSError, smtplib.SMTPException) as e:
        raise MailError(f"Mailserver nicht erreichbar oder Fehler: {e}"[:300])
