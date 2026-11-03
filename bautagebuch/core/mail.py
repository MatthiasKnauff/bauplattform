"""E-Mail-Versand über Gmail oder Office 365 (SMTP mit STARTTLS, Port 587)."""
import smtplib, ssl
from email.message import EmailMessage

PROVIDERS = {"gmail": ("smtp.gmail.com", 587), "o365": ("smtp.office365.com", 587)}


class MailError(Exception):
    pass


def configured(conf):
    return bool(conf.get("mail_user") and conf.get("mail_pass"))


def send(conf, to, subject, body):
    if not configured(conf):
        raise MailError("Der E-Mail-Versand ist nicht eingerichtet (Einstellungen → E-Mail).")
    prov = conf.get("mail_provider") or "gmail"
    host, port = PROVIDERS.get(prov, PROVIDERS["gmail"])
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = f"Bautagebuch <{conf['mail_user']}>", to, subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(host, port, timeout=15) as s:
            s.ehlo(); s.starttls(context=ssl.create_default_context()); s.ehlo()
            s.login(conf["mail_user"], conf["mail_pass"])
            s.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        hint = ("Bei Gmail ist ein „App-Passwort“ nötig (Google-Konto mit Bestätigung in zwei Schritten), nicht das normale Kennwort."
                if prov == "gmail" else
                "Bei Office 365 muss „Authentifizierter SMTP-Versand“ für das Postfach erlaubt sein (Exchange-Admin), und ggf. ein App-Kennwort verwenden.")
        raise MailError("Anmeldung am Mailserver abgelehnt. " + hint)
    except (OSError, smtplib.SMTPException) as e:
        raise MailError(f"Mailserver nicht erreichbar oder Fehler: {e}"[:300])
