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


def test_dateiinfo():
    """Details: Papierformat aus der Seitengröße, EXIF eines Fotos mit Ort, Entfernung."""
    import io
    from PIL import Image
    from bpcore import dateiinfo as DI
    gleich((DI.papier(2384, 1684), DI.papier(595, 842), DI.papier(500, 500)), ("A1 quer", "A4 hoch", "176 × 176 mm"), "Papierformate")
    ex = Image.Exif(); ex[271] = "Apple"; ex[272] = "iPhone 15 Pro"
    ex.get_ifd(0x8769).update({36867: "2026:11:10 11:48:00", 33437: 1.8, 33434: 1 / 120, 34855: 80})
    ex.get_ifd(0x8825).update({1: "N", 2: (51.0, 27.0, 20.0), 3: "E", 4: (6.0, 58.0, 59.5)})
    b = io.BytesIO(); Image.new("RGB", (40, 30)).save(b, "JPEG", exif=ex)
    I = DI.lesen(b.getvalue(), "IMG_1.jpg")
    A = dict(I["gruppen"][0][1])
    gleich((A["Aufgenommen"], A["Kamera"], A["Belichtung"]), ("10.11.2026, 11:48", "Apple iPhone 15 Pro", "f/1,8 · 1/120 s · ISO 80"), "EXIF")
    gleich(I["gps"], [51.455556, 6.983194], "Ort")
    pruefe(abs(DI.entfernung([51.4556, 6.9832], [51.4559, 6.9840]) - 65) < 5, "Entfernung in Metern")


def test_office_vorschau_linear():
    """13.11.2026: Eine Excel-Tabelle mit vielen leeren, formatierten Zellen (<c r="A1" s="1"/>) hielt die Dienste minutenlang an
    (Suche je Zelle bis zum Dateiende). Jetzt linear – und der Inhalt stimmt weiterhin (xlsx, ods)."""
    import io, time, zipfile
    from bpcore import vorschau as V

    def z(files):
        b = io.BytesIO()
        with zipfile.ZipFile(b, "w") as Z:
            for n, t in files.items():
                Z.writestr(n, t)
        return b.getvalue()
    leer = "".join(f'<c r="A{i}" s="1"/><c r="B{i}" s="1"/>' for i in range(2, 60000))
    sheet = '<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>42</v></c><c r="C1" s="2"/></row>' + leer + "</sheetData>"
    got, alt = {}, V._raster
    V._raster = lambda e, R: got.setdefault(e, R)
    try:
        t = time.time()
        V.office_bild(z({"xl/workbook.xml": "<w/>", "xl/sharedStrings.xml": "<sst><si><t>Hallo</t></si></sst>", "xl/worksheets/sheet1.xml": sheet}), "a.xlsx")
        pruefe(time.time() - t < 3, f"xlsx mit 120.000 leeren Zellen in {time.time() - t:.1f} s")
        gleich(got["xlsx"][0][:2], ["Hallo", "42"], "Zellinhalt xlsx")
        zellen = '<table:table-cell table:style-name="x"/>' * 30000
        ods = ('<table:table-row><table:table-cell><text:p>Eins</text:p></table:table-cell><table:table-cell/><table:table-cell><text:p>Drei</text:p>'
               '</table:table-cell></table:table-row>' + ("<table:table-row>" + zellen + "</table:table-row>") * 10)
        t = time.time()
        V.office_bild(z({"content.xml": ods}), "a.ods")
        pruefe(time.time() - t < 3, f"ods in {time.time() - t:.1f} s")
        gleich(got["ods"][0], ["Eins", "", "Drei"], "Zellinhalt ods")
    finally:
        V._raster = alt
