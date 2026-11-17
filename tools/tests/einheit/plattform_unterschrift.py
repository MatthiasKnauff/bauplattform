"""Unterschrift ins PDF einsetzen (gemeinsame PDF-Vorschau): richtige Seite, Inhalt bleibt, Bild ist drin."""
import io

from bpcore import unterschrift
from lib import gleich, pruefe


def _pdf():
    from reportlab.pdfgen import canvas
    b = io.BytesIO(); c = canvas.Canvas(b); c.drawString(100, 700, "Seite eins"); c.showPage(); c.drawString(100, 700, "Seite zwei"); c.save()
    return b.getvalue()


def _png():
    from PIL import Image, ImageDraw
    im = Image.new("RGBA", (300, 90), (0, 0, 0, 0)); ImageDraw.Draw(im).line([(5, 80), (150, 10), (295, 70)], fill=(20, 40, 140, 255), width=5)
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()


def test_unterschrift_auf_seite_zwei():
    from pypdf import PdfReader
    neu = unterschrift.stempeln(_pdf(), _png(), 2, 0.1, 0.75, 0.3, 0.08, "Test · 11.11.2026")
    rd = PdfReader(io.BytesIO(neu))
    gleich(len(rd.pages), 2, "Seitenzahl bleibt")
    pruefe("Seite zwei" in rd.pages[1].extract_text() and "Test · 11.11.2026" in rd.pages[1].extract_text(), "Inhalt und Name/Datum auf Seite 2")
    pruefe("Test" not in rd.pages[0].extract_text(), "Seite 1 unverändert")
    pruefe(len(rd.pages[1]["/Resources"]["/XObject"]) >= 1, "Bild der Unterschrift eingebettet")


def test_qr_code_fuer_das_handy():
    from bpcore import handyus
    s = handyus.qr_svg("https://bauportal.example/bp/hu/abcdefghijklmnopqrstuvwx")
    pruefe(s.lstrip().startswith("<?xml") and "<svg" in s and len(s) > 2000, "QR-Code als SVG")


def test_unterschrift_als_ebene():
    """Unterschrift als Markierung (GO 17.11.2026): liegt als „bild“ in der Skizze, eingesetzt erst in pdf_mit_markierungen – Striche daneben bleiben."""
    import base64, json
    from pypdf import PdfReader
    from bpcore import skizze
    png = base64.b64encode(_png()).decode()
    d = skizze._sauber({"art": "bild", "seite": 2, "pts": [[0.1, 0.75], [0.4, 0.83]], "png": png, "text": "Test · 17.11.2026", "drehung": 40})
    gleich((d["art"], d["drehung"], len(d["pts"])), ("bild", 15.0, 2), "Unterschrift sauber übernommen (Drehung begrenzt)")
    for falsch in ({"png": ""}, {"png": "x" * (skizze.MAX_BILD + 1)}, {"png": "<script>"}, {"pts": [[0.1, 0.1]]}):
        try:
            skizze._sauber({"art": "bild", "seite": 1, "pts": [[0.1, 0.1], [0.2, 0.2]], "png": png, **falsch}); pruefe(False, f"ungültige Unterschrift angenommen: {list(falsch)}")
        except ValueError:
            pass
    strich = {"seite": 1, "art": "stift", "farbe": "#e5484d", "breite": 0.003, "pts": [[0.1, 0.1], [0.5, 0.5]]}

    class R(dict):
        pass

    class C:   # nachgebildete Datenbank: eine Skizze mit einem Strich und einer Unterschrift
        def execute(self, sql, p=()):
            class Q:
                def __init__(s, rows): s.rows = rows
                def fetchone(s): return s.rows[0] if s.rows else None
                def __iter__(s): return iter(s.rows)
            if "FROM skizze WHERE" in sql:
                return Q([R(name="Plan.pdf", datei=_pdf())])
            return Q([R(data=json.dumps(strich)), R(data=json.dumps(d))])
    name, neu = skizze.pdf_mit_markierungen(C(), "s1")
    rd = PdfReader(io.BytesIO(neu))
    pruefe("Test · 17.11.2026" in rd.pages[1].extract_text() and "Test" not in rd.pages[0].extract_text(), "Unterschrift auf Seite 2 eingesetzt, Seite 1 nur mit dem Strich")
    pruefe(skizze.pdf_zeichnen(_pdf(), [d]) is not None, "pdf_zeichnen übergeht Unterschriften (kein Fehler)")
