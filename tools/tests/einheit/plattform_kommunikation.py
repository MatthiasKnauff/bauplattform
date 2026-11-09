"""Kommunikation: Projektkürzel im Betreff, Dateiprüfung, Versand über Microsoft 365 mit Rückfall auf SMTP (ohne Netz, Graph nachgestellt)."""
import io
from email.message import EmailMessage

from bpcore import mail, vorgang
from lib import gleich, pruefe


def test_kuerzel_betreff():
    gleich(vorgang.kuerzel("A541 Schürmannstr. 4, Bottrop"), "A541", "Kürzel")
    gleich(vorgang.kuerzel("Neubau Musterhaus"), "", "ohne Kürzel")
    gleich(vorgang.betreff_mit_kuerzel("Revisionspläne fehlen", "A541 Schürmannstr."), "[A541] Revisionspläne fehlen", "Kürzel davor")
    gleich(vorgang.betreff_mit_kuerzel("AW: [A541] Pläne", "A541 Schürmannstr."), "AW: [A541] Pläne", "nicht doppelt")
    gleich(vorgang.betreff_mit_kuerzel("  Termin \n Do. ", ""), "Termin Do.", "ohne Projekt, Leerzeichen bereinigt")


class _F:
    def __init__(s, name, mime, data):
        s.filename, s.mimetype, s._d = name, mime, data

    def read(s, n=-1):
        return s._d[:n] if n >= 0 else s._d


def test_dateien_pruefen():
    ok, err = vorgang.dateien_pruefen([_F("a.jpg", "image/jpeg", b"x" * 10), _F("b.pdf", "application/pdf", b"%PDF")])
    pruefe(err is None and len(ok) == 2, "Foto und PDF gehen")
    _, err = vorgang.dateien_pruefen([_F("x.exe", "application/x-msdownload", b"MZ")])
    pruefe(err and "Dateiart" in err, "Programme werden abgelehnt")
    _, err = vorgang.dateien_pruefen([_F("g.jpg", "image/jpeg", b"x" * (vorgang.MAX_DATEI + 1))])
    pruefe(err and "15 MB" in err, "zu große Datei")
    ok, err = vorgang.dateien_pruefen([_F("../../etc/x.jpg", "image/jpeg", b"x")])
    pruefe("/" not in ok[0][0], "Dateiname ohne Pfad")


def _msg():
    m = EmailMessage()
    m["From"], m["To"], m["Subject"] = "a@b.de", "c@d.de", "t"
    m.set_content("x")
    return m


def test_versand_m365_und_rueckfall():
    import os
    alt_g, alt_s, alt_env = mail._graph_senden, mail.smtplib.SMTP, os.environ.pop("TESTSERVER", None)
    gesendet = []

    class FakeSMTP:
        def __init__(s, *a, **k): pass
        def __enter__(s): return s
        def __exit__(s, *a): pass
        def ehlo(s): pass
        def starttls(s, **k): pass
        def login(s, u, p): pass
        def send_message(s, msg, **k): gesendet.append("smtp")
    try:
        mail.smtplib.SMTP = FakeSMTP
        mail._graph.update(aus_bis=0.0, grund="")
        cf = {"mail_user": "u@b.de", "mail_pass": "p", "mail_provider": "o365", "m365_tenant": "t", "m365_client": "c", "m365_secret": "s"}
        mail._graph_senden = lambda m, a, msg: gesendet.append("m365")
        gleich(mail._smtp_senden(cf, _msg(), "a@b.de", ["c@d.de"]), "m365", "mit Microsoft 365 über Graph")

        def kaputt(m, a, msg):
            raise RuntimeError("403")
        mail._graph_senden = kaputt
        gleich(mail._smtp_senden(cf, _msg(), "a@b.de", ["c@d.de"]), "smtp", "ohne Mail.Send: SMTP")
        pruefe(mail._graph["aus_bis"] > 0, "Graph pausiert danach")
        mail._graph_senden = lambda m, a, msg: gesendet.append("m365")
        gleich(mail._smtp_senden(cf, _msg(), "a@b.de", ["c@d.de"]), "smtp", "in der Pause gleich SMTP")
        mail._graph.update(aus_bis=0.0)
        gleich(mail._smtp_senden({**cf, "mail_m365": "0"}, _msg(), "a@b.de", ["c@d.de"]), "smtp", "abgeschaltet: SMTP")
        gleich(gesendet, ["m365", "smtp", "smtp", "smtp"], "Wege")
    finally:
        mail._graph_senden, mail.smtplib.SMTP = alt_g, alt_s
        mail._graph.update(aus_bis=0.0, grund="")
        if alt_env is not None:
            os.environ["TESTSERVER"] = alt_env
