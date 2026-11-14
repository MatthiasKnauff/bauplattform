"""Stempel des Büros: Foto/Scan wird freigestellt (Farbe bleibt), schräg ins PDF gesetzt."""
import io

from bpcore import stempel, unterschrift
from lib import gleich, pruefe


def test_stempel_freistellen_und_einsetzen():
    from PIL import Image, ImageDraw
    from pypdf import PdfReader
    from reportlab.pdfgen import canvas
    im = Image.new("RGB", (400, 180), "white"); ImageDraw.Draw(im).rectangle([10, 10, 390, 170], outline=(200, 30, 40), width=8)
    b = io.BytesIO(); im.save(b, "JPEG")
    png = stempel.aufbereiten(b.getvalue())
    s = Image.open(io.BytesIO(png))
    gleich(s.mode, "RGBA", "durchsichtiger Grund")
    pruefe(s.getpixel((s.width // 2, s.height // 2))[3] == 0, "Papier in der Mitte ist ausgeblendet")
    r, g, bl, a = s.getpixel((4, s.height // 2))
    pruefe(a > 200 and r > 150 and g < 90, f"Stempelfarbe (rot) bleibt: {(r, g, bl, a)}")
    p = io.BytesIO(); c = canvas.Canvas(p); c.drawString(100, 700, "Rechnung"); c.save()
    neu = unterschrift.stempeln(p.getvalue(), png, 1, 0.5, 0.6, 0.3, 0.12, "", drehung=-4)
    rd = PdfReader(io.BytesIO(neu))
    pruefe("Rechnung" in rd.pages[0].extract_text() and len(rd.pages[0]["/Resources"]["/XObject"]) >= 1, "Inhalt bleibt, Stempel eingebettet")


def test_pruefstempel_felder():
    from pypdf import PdfReader
    from reportlab.pdfgen import canvas
    from PIL import Image
    im = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    b = io.BytesIO(); im.save(b, "PNG")
    p = io.BytesIO(); c = canvas.Canvas(p); c.drawString(100, 700, "Rechnung"); c.save()
    F = [(t.format(datum="11.11.2026", name="Test Prüfer"), *rest) for t, *rest in stempel.FELDER["pruef"]]   # Farbe, Breite je Feld
    neu = unterschrift.stempeln(p.getvalue(), b.getvalue(), 1, 0.5, 0.5, 0.2, 0.14, "", drehung=-3, felder=F)
    t = PdfReader(io.BytesIO(neu)).pages[0].extract_text()
    pruefe("11.11.2026" in t and "Prüfer" in t, f"Datum und Name im Prüfstempel: {t!r}")


def test_buerostempel_schwarz():
    """Bürostempel wird schwarz gestempelt (Farbe des Scans egal), Deckkraft bleibt."""
    from PIL import Image
    im = Image.new("RGBA", (20, 10), (0, 0, 0, 0))
    for x in range(10):
        im.putpixel((x, 5), (30, 60, 200, 200))
    b = io.BytesIO(); im.save(b, "PNG")
    neu = Image.open(io.BytesIO(stempel.einfaerben(b.getvalue(), stempel.TINTE["buero"])))
    gleich(neu.getpixel((3, 5)), (25, 25, 25, 200), "blau gescannt → schwarz, Deckkraft bleibt")
    gleich(neu.getpixel((15, 5))[3], 0, "durchsichtig bleibt durchsichtig")

