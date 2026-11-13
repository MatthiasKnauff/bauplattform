"""Angebotsanfrage-Mail (13.11.2026): Bauvorhaben ohne doppelte Adresse, kein doppelter Gruß vor einer Signatur mit Gruß,
MIME für Microsoft 365 mit CRLF (sonst zerfällt quoted-printable: „G=üßen“)."""
import email
from email import policy
from email.message import EmailMessage

from lib import gleich, pruefe


def test_bauvorhaben():
    from bpcore import vorlagen
    P = lambda n, s, z, c: {"name": n, "street": s, "zip": z, "city": c}
    gleich(vorlagen.bauvorhaben(P("Wohnhaus Merziger Aue 1, 45307 Essen", "Merziger Aue 1", "45307", "Essen")), "Wohnhaus Merziger Aue 1, 45307 Essen", "Adresse im Namen")
    gleich(vorlagen.bauvorhaben(P("Wohnhaus Müller", "Merziger Aue 1", "45307", "Essen")), "Wohnhaus Müller, Merziger Aue 1, 45307 Essen", "Adresse angehängt")
    gleich(vorlagen.bauvorhaben(P("Kita Essen", "Merziger Aue 1", "45307", "Essen")), "Kita Essen, Merziger Aue 1", "Ort schon im Namen")
    gleich(vorlagen.bauvorhaben(None), "", "ohne Projekt")


def test_gruss_einmal():
    from bpcore import konto
    vor = "Sehr geehrte Damen und Herren,\n\nText.\n\nMit freundlichen Grüßen\n\n"
    gleich(konto.GRUSS_ENDE.sub("\n\n", vor).rstrip(), "Sehr geehrte Damen und Herren,\n\nText.", "Gruß der Vorlage fällt weg")
    pruefe(konto.GRUSS.match("Mit freundlichen Grüßen\nM. Muster"), "Signatur mit Gruß erkannt")
    pruefe(konto.GRUSS.match("Viele Grüße"), "Viele Grüße erkannt")
    pruefe(not konto.GRUSS.match("M. Muster\nBauleitung"), "Signatur ohne Gruß")


def test_graph_crlf():
    from bpcore import mail
    gesendet = {}

    class R:
        def __enter__(s): return s
        def __exit__(s, *a): return False
        def read(s): return b""
    import base64, urllib.request
    from bpcore import posteingang
    alt_u, alt_t = urllib.request.urlopen, posteingang._token
    urllib.request.urlopen = lambda req, timeout=0: (gesendet.update(roh=base64.b64decode(req.data)), R())[1]
    posteingang._token = lambda m: "x"
    try:
        m = EmailMessage()
        m.set_content("Mit freundlichen Grüßen " * 10)
        m.add_alternative("<p>" + "Leistungsverzeichnis Grüßen – " * 20 + "</p>", subtype="html")
        mail._graph_senden({}, "a@b.de", m)
    finally:
        urllib.request.urlopen, posteingang._token = alt_u, alt_t
    roh = gesendet["roh"]
    gleich(roh.count(b"\n"), roh.count(b"\r\n"), "nur CRLF")
    h = email.message_from_bytes(roh, policy=policy.default).get_body(("html",)).get_content()
    pruefe("Leistungsverzeichnis Grüßen – " * 20 in h, "HTML unversehrt")
