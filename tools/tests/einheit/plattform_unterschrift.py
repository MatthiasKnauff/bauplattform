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
