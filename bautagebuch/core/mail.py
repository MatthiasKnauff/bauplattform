"""E-Mail-Versand des Bautagebuchs – Server und Fehlerbehandlung wie in der ganzen Plattform (bpcore.mail)."""
from email.message import EmailMessage


from bpcore.mail import MailError, smtp_senden   # gemeinsame Fehlerbehandlung (ungültige Empfänger, Sperre durch den Server)


def configured(conf):
    return bool(conf.get("mail_user") and conf.get("mail_pass"))


def send(conf, to, subject, body, direkt=False, app="bautagebuch"):
    if not configured(conf):
        raise MailError("Der E-Mail-Versand ist nicht eingerichtet (Einstellungen → E-Mail).")
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = f"Bautagebuch <{(conf.get('mail_from') or '').strip() or conf['mail_user']}>", to, subject
    if not direkt:   # Benachrichtigung: persönlicher Link zum Abschalten (bpcore/mailaus.py)
        try:
            from bpcore import mailaus
            ft, lk = mailaus.fuss(conf, [to])
            if lk:
                body, msg["List-Unsubscribe"] = body.rstrip("\n") + ft, f"<{lk}>"
        except Exception:
            pass
    msg.set_content(body)
    return smtp_senden(conf, msg, (conf.get("mail_from") or "").strip() or conf["mail_user"], [to], direkt=direkt, app=app)   # „m365“ oder „smtp“; ohne direkt = Benachrichtigung (bpcore/mailaus.py)
