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
