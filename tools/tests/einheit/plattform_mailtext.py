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


def test_versand_ablage():
    """LV-Versand (13.11.2026): „Angefragte Firmen“ als PDF und Excel mit Anschrift und Telefon, Anschreiben als PDF, Unterlagen nur als Verweis."""
    import io
    import ava  # noqa: F401 – zuerst die App (ava_versand hängt sich dort an)
    import ava_versand as V
    from openpyxl import load_workbook
    K = {5: {"name": "Dach Weber GmbH", "contact_person": "Frau Weber", "street": "Ruhrallee 1", "zip": "45127", "city": "Essen", "phone": "0201 123", "mobile": ""}}
    z = V._firmenliste(K, [{"contact_id": 5, "name": "Dach Weber GmbH", "email": "w@x.de", "ok": True}, {"contact_id": None, "name": "Ohne", "email": "o@x.de", "ok": False, "fehler": "abgelehnt"}], "versand", "13.11.2026 19:40")
    gleich((z[0]["person"], z[0]["anschrift"], z[0]["telefon"], z[0]["stand"]), ("Frau Weber", "Ruhrallee 1, 45127 Essen", "0201 123", "Versand 13.11.2026 19:40"), "Adresszeile")
    pruefe(z[1]["stand"].startswith("Fehler"), "Fehler je Firma")
    ws = load_workbook(io.BytesIO(V._firmen_xlsx(z))).active
    gleich([c.value for c in ws[2]][:3], ["Dach Weber GmbH", "Frau Weber", "Ruhrallee 1, 45127 Essen"], "Excel")
    FN = {"n": "Helvetica", "b": "Helvetica-Bold"}
    pruefe(V._firmen_pdf({"nr": "01", "name": "Dach"}, "A1", z, "Betreff", "13.11.2026", "MK", FN)[:5] == b"%PDF-", "PDF Firmen")
    pruefe(V._anschreiben_pdf("Betreff", "Sehr geehrte Frau Weber,\n\n" + "langer Text " * 40, "13.11.2026", FN)[:5] == b"%PDF-", "PDF Anschreiben")
    gleich([u["pfad"] for u in V._unterlagen([{"pfad": "a/../b.pdf"}, {"pfad": "a/b.pdf"}, {"pfad": "c.pdf", "quelle": "datei"}])], ["a/b.pdf", "c.pdf"], "Verweise ohne .. und doppelte")
