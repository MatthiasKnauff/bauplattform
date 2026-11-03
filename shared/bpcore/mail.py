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


def send(cf, to, subject, body, sender="Bauplattform"):
    if not configured(cf):
        raise MailError("Der E-Mail-Versand ist nicht eingerichtet (Verwaltung → Einstellungen → Mailserver).")
    prov = cf.get("mail_provider") or "gmail"
    host, port = PROVIDERS.get(prov, PROVIDERS["gmail"])
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = f"{sender} <{cf['mail_user']}>", to, subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(host, port, timeout=15) as s:
            s.ehlo(); s.starttls(context=ssl.create_default_context()); s.ehlo()
            s.login(cf["mail_user"], cf["mail_pass"])
            s.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        raise MailError("Anmeldung am Mailserver abgelehnt – Zugangsdaten unter Verwaltung → Einstellungen → Mailserver prüfen.")
    except (OSError, smtplib.SMTPException) as e:
        raise MailError(f"Mailserver nicht erreichbar oder Fehler: {e}"[:300])
