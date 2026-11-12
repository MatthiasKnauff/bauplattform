"""E-Mail-Versand für die Plattform-Apps – mit dem Postfach aus Verwaltung → Einstellungen → Mailserver (gleiche Daten wie im Bautagebuch)."""
import os, re, smtplib, ssl, time
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
    """Testmail: trotz eigener Pause wirklich versuchen (falls Microsoft die Sperre schon aufgehoben hat) – auch Graph erneut probieren."""
    _pause["bis"] = 0.0
    _graph.update(aus_bis=0.0, grund="")


def pause_text():
    return (f"Der Mailserver hat das Postfach vorübergehend gesperrt, weil zu viele Mails an ungültige Adressen gingen "
            f"(Microsoft 365: „Sender throttled“). Die Plattform versucht es ab {datetime.fromtimestamp(_pause['bis']).strftime('%H:%M')} Uhr wieder; "
            "Microsoft hebt die Sperre meist nach einigen Stunden, spätestens nach 24 Stunden auf. "
            "Bitte die E-Mail-Adressen die Benutzer:in prüfen (Verwaltung → Benutzer:in & Rechte) – die abgelehnten stehen im Protokoll.")


def smtp_senden(cf, msg, absender, empfaenger):
    """Mail verschicken; gescheiterte Mails stehen unter Verwaltung → System → Fehlermeldungen."""
    try:
        return _smtp_senden(cf, msg, absender, empfaenger)
    except MailError as e:
        _melden(e, empfaenger, msg.get("Subject", ""))
        raise


def _smtp_senden(cf, msg, absender, empfaenger):
    """Mail über den eingetragenen Server verschicken. Fehler als MailError (dauerhaft / gesperrt, siehe oben)."""
    if os.environ.get("TESTSERVER") == "1":   # Testserver: nichts verschicken (Kopie mit echten Adressen)
        print(f"Testserver: Mail nicht verschickt – an {', '.join(empfaenger)[:200]} · „{msg.get('Subject', '')}“", flush=True)
        return None
    m = _m365(cf)
    if m and time.time() >= _graph["aus_bis"] and len(msg.as_bytes()) * 4 // 3 < GRAPH_MAX:   # große Mails gleich per SMTP
        falsch = [a for a in empfaenger if not ADRESSE.match(a.strip())]
        if falsch:
            raise MailError("Ungültige E-Mail-Adresse: " + ", ".join(falsch), dauerhaft=True)
        try:
            _graph_senden(m, absender, msg)
            _graph["zuletzt"] = "m365"
            return "m365"
        except Exception as e:   # noqa: BLE001 – dann wie bisher per SMTP
            _graph.update(aus_bis=time.time() + 3600, grund=str(e)[:300])
            print("Mail über Microsoft 365 nicht möglich, nehme SMTP:", e, flush=True)
            if not (cf.get("mail_user") and cf.get("mail_pass")):
                raise MailError(f"Versand über Microsoft 365 nicht möglich: {e}"[:300])
    if not (cf.get("mail_user") and cf.get("mail_pass")):
        raise MailError("Versand über Microsoft 365 gerade nicht möglich und kein SMTP eingerichtet: " + (_graph["grund"] or "unbekannt"))
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
            _graph["zuletzt"] = "smtp"
            return "smtp"
        else:             # STARTTLS (Port 587)
            with smtplib.SMTP(host, port, timeout=20) as s:
                s.ehlo(); s.starttls(context=ssl.create_default_context()); s.ehlo()
                s.login(cf["mail_user"], cf["mail_pass"])
                s.send_message(msg, to_addrs=empfaenger)
            _graph["zuletzt"] = "smtp"
            return "smtp"
    except smtplib.SMTPAuthenticationError:
        hint = HINWEIS.get(prov, "Bei vielen Anbietern ist ein „App-Passwort“ nötig oder SMTP muss im Postfach erlaubt werden.")
        raise MailError("Anmeldung am Mailserver abgelehnt – Zugangsdaten unter ⚙ → Büro → Mailserver prüfen. " + hint)
    except smtplib.SMTPRecipientsRefused as e:
        raise MailError("Empfänger:in vom Mailserver abgelehnt: " + ", ".join(e.recipients), dauerhaft=True)
    except smtplib.SMTPResponseException as e:
        txt = (e.smtp_error.decode("utf-8", "replace") if isinstance(e.smtp_error, bytes) else str(e.smtp_error))
        if "5.2.254" in txt or "throttl" in txt.lower():
            _pause["bis"] = time.time() + PAUSE_S * (3 if "invalid" in txt.lower() else 1)   # jeder weitere Versuch verlängert die Sperre bei Microsoft
            raise MailError(pause_text() + f" – Antwort des Servers: {e.smtp_code} {txt[:240]}", gesperrt=True)
        if isinstance(e, smtplib.SMTPSenderRefused):
            raise MailError(f"Der Mailserver lässt {absender} nicht als Absender zu – im Postfach „Senden als“ erlauben "
                            "oder unter ⚙ → Für mich die Absender:in auf das Büro stellen.")
        if e.smtp_code >= 500 and re.search(r"5\.1\.\d|recipient|mailbox unavailable|not found", txt, re.I):
            raise MailError(f"Empfänger:in abgelehnt ({e.smtp_code} {txt[:160]})", dauerhaft=True)
        raise MailError(f"Mailserver-Fehler {e.smtp_code}: {txt}"[:300])
    except (OSError, smtplib.SMTPException) as e:
        raise MailError(f"Mailserver nicht erreichbar oder Fehler: {e}"[:300])


def conf(c):
    """Mailserver-Einstellungen (nur für den Server – enthält Kennwörter, nie an den Browser geben)."""
    return {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings WHERE key LIKE 'mail_%' OR key IN ('app_url','office_name','m365_tenant','m365_client','m365_secret')")}


def configured(cf):
    return bool(cf.get("mail_user") and cf.get("mail_pass")) or bool(_m365(cf) and von(cf))


# ---------------------------------------------------------------- Versand über Microsoft 365 (Graph „sendMail“, Recht Mail.Send)
# Ist Microsoft 365 eingerichtet (dieselbe App wie für den Posteingang), geht jede Mail zuerst über Graph: sie steht dann im Postfach
# des Absenders unter „Gesendete Elemente“. Fehlt das Recht (403) oder klappt es aus anderem Grund nicht, nimmt die Plattform SMTP –
# und versucht Graph erst nach einer Stunde wieder. Ausschalten: Einstellung mail_m365 = "0".
GRAPH_MAX = 3_500_000                     # Graph nimmt höchstens 4 MB je Anfrage (Base64 eingerechnet) – größere Mails per SMTP
_graph = {"aus_bis": 0.0, "grund": "", "zuletzt": ""}


def _m365(cf):
    t, cl, se = ((cf.get(k) or "").strip() for k in ("m365_tenant", "m365_client", "m365_secret"))
    return {"tenant": t, "client": cl, "secret": se} if t and cl and se and cf.get("mail_m365", "1") != "0" else None


def graph_aktiv(cf):
    """Geht die nächste Mail voraussichtlich über Microsoft 365? (dann können Einladungen als echte Besprechungsanfrage in der Mail stecken)"""
    return bool(_m365(cf)) and time.time() >= _graph["aus_bis"]


def graph_status():
    """Für die Verwaltung: wie die letzte Mail rausging und ob Graph gerade pausiert."""
    return {"weg": _graph["zuletzt"], "pause_bis": datetime.fromtimestamp(_graph["aus_bis"]).strftime("%H:%M") if time.time() < _graph["aus_bis"] else "",
            "grund": _graph["grund"] if time.time() < _graph["aus_bis"] else ""}


def _graph_senden(m, absender, msg):
    import base64, urllib.error, urllib.parse, urllib.request
    from .posteingang import _token
    roh = base64.b64encode(msg.as_bytes())
    if len(roh) > GRAPH_MAX:
        raise RuntimeError("Mail zu groß für Microsoft 365 (über 3,5 MB) – per SMTP verschickt")
    req = urllib.request.Request(f"https://graph.microsoft.com/v1.0/users/{urllib.parse.quote(absender)}/sendMail", data=roh, method="POST",
                                 headers={"Authorization": "Bearer " + _token(m), "Content-Type": "text/plain"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            r.read()
    except urllib.error.HTTPError as e:
        txt = e.read().decode("utf-8", "replace")[:300]
        if e.code == 403:
            raise RuntimeError(f"Microsoft 365 erlaubt das Senden aus {absender} nicht (Mail.Send fehlt oder Zugriffsrichtlinie) – {txt}")
        raise RuntimeError(f"Microsoft 365 hat die Mail abgelehnt ({e.code}): {txt}")


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
    return smtp_senden(cf, msg, from_addr or von(cf), lst(to) + lst(cc))
