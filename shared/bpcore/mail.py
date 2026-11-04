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


def von(cf):
    """Absenderadresse aller Mails: Einstellung „Absender“ beim Mailserver, sonst das Postfach selbst."""
    return (cf.get("mail_from") or "").strip() or cf.get("mail_user", "")


def send(cf, to, subject, body, sender="Bauplattform", attachments=None, cc=None, reply_to=None, ical=None, html=None, from_addr=None):
    """to/cc: Adresse oder Liste. attachments: [(Dateiname, bytes, "maintype/subtype")].
    ical: Text einer iCalendar-Einladung (METHOD:REQUEST) – erscheint in Outlook & Co. als Termin mit Annehmen/Ablehnen."""
    if not configured(cf):
        raise MailError("Der E-Mail-Versand ist nicht eingerichtet (Verwaltung → Einstellungen → Mailserver).")
    prov = cf.get("mail_provider") or "gmail"
    host, port = PROVIDERS.get(prov, PROVIDERS["gmail"])
    lst = lambda v: [x for x in ([v] if isinstance(v, str) else (v or [])) if x]
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = f"{sender} <{from_addr or von(cf)}>", ", ".join(lst(to)), subject
    if lst(cc):
        msg["Cc"] = ", ".join(lst(cc))
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body)
    if html:   # dieselbe Mail als HTML (Rich-Signatur); eingebettete Bilder (data:) als Inline-Anhang (cid:), das zeigen alle Mailprogramme
        import base64, re
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
    except smtplib.SMTPSenderRefused:
        raise MailError(f"Der Mailserver lässt {from_addr or von(cf)} nicht als Absender zu – im Postfach „Senden als“ erlauben "
                        "oder unter ⚙ → Für mich den Absender auf das Büro stellen.")
    except (OSError, smtplib.SMTPException) as e:
        raise MailError(f"Mailserver nicht erreichbar oder Fehler: {e}"[:300])
