"""Rechentests Bauantrag: Anlagen der NRW-Seite erkennen (zwei Links je Anlage, Titel, Nummer), Fassung aus der Adresse, nur sichere Adressen."""
from lib import gleich, pruefe

from bpcore import bauantrag_formulare as BF

SEITE = """<div id="attachments">
<a href="/system/files/2026-08/smbl_23210_20000308_a_anlage1.1.pdf">(Anlage I/1 Baugenehmigungsverfahren § 65 BauO NRW 2018)</a>
<a href="/system/files/2026-08/smbl_23210_20000308_a_anlage1.1.pdf">Anlage I/1 Baugenehmigungsverfahren § 65 BauO NRW 2018 (PDF) Barrierefrei</a>
<a href="/system/files/2026-11/2026-11-0007663.pdf">Anlage I/2 Vereinfachtes Baugenehmigungsverfahren &sect; 64 BauO NRW 2018 (PDF) Barrierefrei</a>
<a href="/system/files/BA/47790-50738-smbl_23210_20000308_a_anlageii4.pdf">Anlage II/4 Bericht Bauzustandsbesichtigung (PDF) Nicht barrierefrei</a>
<a href="/impressum">Impressum</a></div>"""


def test_anlagen_der_nrw_seite():
    """Jede Anlage einmal, mit Nummer, Titel ohne „(PDF) Barrierefrei“ und voller Adresse."""
    A = BF.anlagen_lesen(SEITE, "https://recht.nrw.de/lrmb/verwaltungsvorschrift/10112026-verwaltungsvorschrift-zur-verordnung-ueber-bautechnische")
    gleich([a["nr"] for a in A], ["I/1", "I/2", "II/4"], "drei Anlagen")
    gleich(A[1]["titel"], "Vereinfachtes Baugenehmigungsverfahren § 64 BauO NRW 2018", "Titel")
    gleich(A[0]["url"], "https://recht.nrw.de/system/files/2026-08/smbl_23210_20000308_a_anlage1.1.pdf", "volle Adresse")
    gleich(BF._fassung("https://recht.nrw.de/lrmb/verwaltungsvorschrift/10112026-verwaltungsvorschrift-zur", ""), "10.11.2026", "Fassung aus der Adresse")


def test_nur_sichere_adressen():
    """Keine http-Adressen und nichts im eigenen Netz (der Server ruft die Seite ab)."""
    for u in ("http://recht.nrw.de/x", "https://127.0.0.1/x", "https://localhost/x", "ftp://a.de/x"):
        try:
            BF._sicher(u)
            pruefe(False, f"abgelehnt: {u}")
        except (ValueError, OSError):
            pass


def test_amtliches_formular_ausfuellen():
    """Ein ausfüllbares Formular (wie die NRW-Vordrucke): Felder werden an Name/Tooltip erkannt, Gebäudeklasse angekreuzt, nichts eigenes dazu."""
    import io
    from pypdf import PdfReader
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    buf = io.BytesIO(); cv = canvas.Canvas(buf, pagesize=A4); f = cv.acroForm
    f.textfield(name="Text1", tooltip="Bauherrschaft Name, Vorname / Firma", x=50, y=700, width=300, height=18)
    f.textfield(name="Text2", tooltip="Baugrundstück Gemarkung(en)", x=50, y=650, width=300, height=18)
    f.textfield(name="Text3", tooltip="Baugrundstück Flur(e)", x=50, y=620, width=300, height=18)
    f.textfield(name="Text4", tooltip="Baugrundstück Flurstück(e)", x=50, y=590, width=300, height=18)
    f.checkbox(name="GK3", tooltip="Gebäudeklasse 3", x=50, y=550, size=12)
    f.checkbox(name="GK4", tooltip="Gebäudeklasse 4", x=80, y=550, size=12)
    cv.showPage(); cv.save()
    W = {"bauherr_name": "Tierschutzverein RT", "gemarkung": "Altenessen", "flur": "12", "flurstueck": "345", "gebaeudeklasse": "3"}
    data, gefuellt, n = BF.ausfuellen(buf.getvalue(), W)
    F = PdfReader(io.BytesIO(data)).get_fields()
    gleich((F["Text1"].get("/V"), F["Text2"].get("/V"), F["Text3"].get("/V"), F["Text4"].get("/V")), ("Tierschutzverein RT", "Altenessen", "12", "345"), "Textfelder")
    pruefe(str(F["GK3"].get("/V")) not in ("", "None", "/Off") and str(F["GK4"].get("/V")) in ("None", "/Off", ""), f"GK 3 angekreuzt: {F['GK3'].get('/V')} / {F['GK4'].get('/V')}")
    gleich((gefuellt, n), (5, 6), "5 von 6 Feldern")
