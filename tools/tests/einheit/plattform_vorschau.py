"""Rechentests „Alle Dateien“: Dateiart nach Endung, Vorschaubild aus PDF (erste Seite) und Foto (gedreht nach EXIF, 320 px)."""
import io

from lib import gleich, pruefe

from bpcore import vorschau as V


def test_arten():
    gleich([V.art(p) for p in ("a/Plan.PDF", "IMG_1.HEIC", "x.dwg", "LV.x83", "Mail.msg", "ohne")], ["pdf", "foto", "cad", "office", "mail", "andere"], "Arten")
    pruefe(V.mit_vorschau("a.jpg") and not V.mit_vorschau("a.dwg"), "Vorschau für PDF, Bilder und Office – nicht für CAD")
    pruefe(V.aktuell((100, 5.0, True, ""), 100, 5.4) and not V.aktuell((100, 5.0, True, ""), 101, 5.0), "veraltet bei anderer Größe")


def test_vorschau_bilder():
    from PIL import Image
    from reportlab.pdfgen import canvas
    buf = io.BytesIO(); cv = canvas.Canvas(buf, pagesize=(842, 595)); cv.drawString(100, 300, "Grundriss EG"); cv.showPage(); cv.save()
    b = V.bild_machen(buf.getvalue(), "Grundriss.pdf")
    w, h = Image.open(io.BytesIO(b)).size
    pruefe(w == 320 and 220 <= h <= 230, f"PDF quer: 320 px breit ({w} × {h})")
    im = Image.new("RGB", (4000, 3000), (90, 120, 160)); o = io.BytesIO(); im.save(o, "JPEG")
    b = V.bild_machen(o.getvalue(), "IMG_4711.jpg")
    pruefe(Image.open(io.BytesIO(b)).size == (320, 240) and len(b) < 20000, "Foto: 320 × 240, wenige KB")


def test_office_vorschau():
    """Office: Vorschau aus dem Inhalt (Excel als Raster, CSV, Text); alte Binärformate bleiben beim Symbol."""
    import io
    import openpyxl
    from bpcore import vorschau as V
    pruefe(V.mit_vorschau("Kosten.xlsx") and V.mit_vorschau("Bericht.docx") and not V.mit_vorschau("alt.doc"), "Office mit Vorschau, .doc ohne")
    wb = openpyxl.Workbook()
    wb.active.append(["Pos", "Menge"]); wb.active.append(["01.01", 12])
    b = io.BytesIO(); wb.save(b)
    for daten, name in ((b.getvalue(), "Kosten.xlsx"), ("a;b\n1;2\n".encode(), "Liste.csv"), ("Notiz".encode(), "Notiz.txt")):
        pruefe(V.bild_machen(daten, name)[:2] == b"\xff\xd8", f"JPEG für {name}")
