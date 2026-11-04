"""E-Mail-Versand über Gmail oder Office 365 (SMTP mit STARTTLS, Port 587)."""
import smtplib, ssl
from email.message import EmailMessage

PROVIDERS = {"gmail": ("smtp.gmail.com", 587), "o365": ("smtp.office365.com", 587)}


from bpcore.mail import MailError, smtp_senden   # gemeinsame Fehlerbehandlung (ungültige Empfänger, Sperre durch den Server)


def configured(conf):
    return bool(conf.get("mail_user") and conf.get("mail_pass"))


def send(conf, to, subject, body):
    if not configured(conf):
        raise MailError("Der E-Mail-Versand ist nicht eingerichtet (Einstellungen → E-Mail).")
    prov = conf.get("mail_provider") or "gmail"
    host, port = PROVIDERS.get(prov, PROVIDERS["gmail"])
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = f"Bautagebuch <{(conf.get('mail_from') or '').strip() or conf['mail_user']}>", to, subject
    msg.set_content(body)
    smtp_senden(conf, msg, (conf.get("mail_from") or "").strip() or conf["mail_user"], [to])
