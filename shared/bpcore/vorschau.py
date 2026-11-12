"""Alle Dateien eines Projektordners: Dateiart, Vorschaubilder (JPEG, längste Seite 320 px) und der Hintergrund-Erzeuger.

Die Dateiliste liest das Bautagebuch (Zugang zum Dateiserver) – bautagebuch/modules/alle_dateien.py, gespeichert in bp_store
„allescan:<Projekt>“: {zeit, res: {basis, dateien: [[pfad, groesse, mtime], …], abgebrochen}}. Hier liegt, was Seite und Dienste
gemeinsam brauchen: Art einer Datei, Vorschau aus PDF (erste Seite, pypdfium2) oder Bild (auch HEIC), Tabelle bp_vorschau.
Originale werden nie kopiert – nur beim Erzeugen der Vorschau einmal gelesen.
"""
import io
import json

ARTEN = {
    "pdf": {"pdf"},
    "foto": {"jpg", "jpeg", "png", "heic", "heif", "tif", "tiff", "gif", "bmp", "webp"},
    "cad": {"dwg", "dxf", "dwf", "dwfx", "pln", "pla", "plt", "ifc", "skp", "3dm", "rvt", "vwx"},
    "office": {"doc", "docx", "xls", "xlsx", "xlsm", "ppt", "pptx", "odt", "ods", "odp", "rtf", "txt", "csv", "x81", "x83", "x84", "x86",
               "d81", "d83", "d84", "d86", "p81", "p83", "p84", "p86"},
    "mail": {"msg", "eml"},
}
VORSCHAU_ARTEN = ("pdf", "foto", "office")
OFFICE_MIT = {"docx", "xlsx", "xlsm", "pptx", "odt", "ods", "odp", "txt", "csv"}   # alte Binärformate (.doc, .xls …) bleiben beim Symbol
GROESSE = 320          # längste Seite der Vorschau in Pixel
MAX_LESEN = 80 * 1024 * 1024   # größere Dateien bekommen keine Vorschau (Symbol)


def endung(pfad):
    n = str(pfad or "").rsplit("/", 1)[-1]
    return n.rsplit(".", 1)[-1].lower() if "." in n else ""


def art(pfad):
    e = endung(pfad)
    for k, s in ARTEN.items():
        if e in s:
            return k
    return "andere"


import threading
PDFIUM_SPERRE = threading.Lock()   # pdfium ist nicht threadsicher – gleichzeitige Seiten (mehrere Threads je Prozess) nur nacheinander rendern


def mit_vorschau(pfad):
    a = art(pfad)
    return a in ("pdf", "foto") or (a == "office" and endung(pfad) in OFFICE_MIT)


def bild_machen(daten, pfad):
    """Vorschau als JPEG-Bytes (längste Seite GROESSE). Fehler → Exception (der Aufrufer merkt sich den Text)."""
    from PIL import Image, ImageOps
    if art(pfad) == "office":
        im = office_bild(daten, pfad)
    elif art(pfad) == "pdf":
        import pypdfium2 as pdfium
        with PDFIUM_SPERRE:
            pdf = pdfium.PdfDocument(daten)
            try:
                seite = pdf[0]
                w, h = seite.get_size()
                im = seite.render(scale=min(4.0, GROESSE * 2 / max(w, h, 1))).to_pil()
                seite.close()
            finally:
                pdf.close()
    else:
        if endung(pfad) in ("heic", "heif"):
            try:
                import pillow_heif
                pillow_heif.register_heif_opener()
            except ImportError:
                raise ValueError("HEIC nicht lesbar")
        im = Image.open(io.BytesIO(daten))
        im.draft("RGB", (GROESSE * 2, GROESSE * 2))   # JPEG: gleich verkleinert dekodieren (schnell, wenig Speicher)
        im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        weiss = Image.new("RGB", im.size, (255, 255, 255))
        weiss.paste(im, mask=im.split()[-1])
        im = weiss
    im = im.convert("RGB")
    im.thumbnail((GROESSE, GROESSE))
    out = io.BytesIO()
    im.save(out, "JPEG", quality=72, optimize=True)
    return out.getvalue()


def scan_laden(c, pid):
    """Gespeicherte Dateiliste eines Projekts → {zeit, res} oder None."""
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"allescan:{pid}",)).fetchone()
    try:
        return json.loads(r["data"]) if r else None
    except ValueError:
        return None


def vorhanden(c, pid):
    """{pfad: (groesse, mtime, hat_bild, fehler)} der Vorschauen eines Projekts."""
    return {r["pfad"]: (r["groesse"], r["mtime"], r["hat"], r["fehler"]) for r in c.execute(
        "SELECT pfad, groesse, mtime, bild IS NOT NULL AS hat, fehler FROM bp_vorschau WHERE project_id=?", (pid,)).fetchall()}


def aktuell(v, groesse, mtime):
    """Passt die gespeicherte Vorschau (oder ihr Fehler) zum Stand der Datei?"""
    return bool(v) and int(v[0]) == int(groesse) and abs(float(v[1]) - float(mtime)) < 2 and (v[2] or v[3])


def faellig(c, pid, dateien):
    """Dateien, deren Vorschau fehlt oder veraltet ist (nur PDF und Bilder) – neueste zuerst."""
    V = vorhanden(c, pid)
    L = [d for d in dateien if mit_vorschau(d[0]) and not aktuell(V.get(d[0]), d[1], d[2])]
    return sorted(L, key=lambda d: -float(d[2] or 0))


def aufraeumen(c, pid, pfade):
    """Vorschauen von Dateien löschen, die es im Projektordner nicht mehr gibt."""
    pf = set(pfade)
    weg = [p for p in vorhanden(c, pid) if p not in pf]
    for i in range(0, len(weg), 500):
        c.execute("DELETE FROM bp_vorschau WHERE project_id=? AND pfad = ANY(?)", (pid, weg[i:i + 500]))
    return len(weg)


def speichern(c, pid, pfad, groesse, mtime, bild=None, fehler=""):
    c.execute("""INSERT INTO bp_vorschau(project_id, pfad, groesse, mtime, bild, fehler, wunsch, erstellt) VALUES(?,?,?,?,?,?,NULL,now())
                 ON CONFLICT (project_id, pfad) DO UPDATE SET groesse=EXCLUDED.groesse, mtime=EXCLUDED.mtime, bild=EXCLUDED.bild,
                 fehler=EXCLUDED.fehler, wunsch=NULL, erstellt=now()""", (pid, pfad, int(groesse), float(mtime), bild, str(fehler)[:200]))


def wuenschen(c, pid, pfade):
    """Kacheln, die gerade angesehen werden und noch keine Vorschau haben: zuerst erzeugen."""
    n = 0
    for p in pfade[:300]:
        if isinstance(p, str) and p and mit_vorschau(p):
            c.execute("""INSERT INTO bp_vorschau(project_id, pfad, wunsch) VALUES(?,?,now())
                         ON CONFLICT (project_id, pfad) DO UPDATE SET wunsch=now() WHERE bp_vorschau.bild IS NULL AND bp_vorschau.fehler=''""", (pid, p[:1000]))
            n += 1
    return n


# ------------------------------------------------------------------ Office: eingebettetes Vorschaubild oder erste Seite aus dem Inhalt
_FARBE = {"docx": (43, 87, 154), "odt": (43, 87, 154), "xlsx": (33, 115, 70), "xlsm": (33, 115, 70), "ods": (33, 115, 70), "csv": (33, 115, 70),
          "pptx": (196, 75, 39), "odp": (196, 75, 39), "txt": (110, 110, 110)}


def _xml_text(x):
    import html
    import re
    return html.unescape(re.sub(r"<[^>]+>", "", x))


def _absaetze(xml, absatz, lauf):
    """Absätze aus Office-XML ohne XML-Parser (keine Entitäten, nichts wird nachgeladen): Text der Läufe je Absatz."""
    import re
    out = []
    for p in re.split(absatz, xml)[:400]:
        t = "".join(_xml_text(m) for m in re.findall(lauf, p)).strip()
        if t:
            out.append(t)
    return out


def _schrift(n, fett=False):
    from PIL import ImageFont
    for f in (("DejaVuSans-Bold.ttf" if fett else "DejaVuSans.ttf"), "/usr/share/fonts/truetype/dejavu/" + ("DejaVuSans-Bold.ttf" if fett else "DejaVuSans.ttf")):
        try:
            return ImageFont.truetype(f, n)
        except OSError:
            continue
    return ImageFont.load_default()


def _blatt(e, quer=False):
    from PIL import Image, ImageDraw
    w, h = (640, 360) if quer else (452, 640)
    im = Image.new("RGB", (w, h), (255, 255, 255))
    d = ImageDraw.Draw(im)
    f = _FARBE.get(e, (110, 110, 110))
    d.rectangle([0, 0, w, 7], fill=f)
    d.rounded_rectangle([w - 74, 16, w - 14, 40], 5, fill=f)
    d.text((w - 44, 28), e.upper()[:4], fill=(255, 255, 255), font=_schrift(13, True), anchor="mm")
    return im, d


def _text_seite(e, zeilen, titel=None):
    im, d = _blatt(e)
    y, fs = 54, _schrift(15)
    if titel:
        d.text((34, y), titel[:40], fill=(30, 30, 30), font=_schrift(22, True)); y += 40
    import textwrap
    for z in zeilen:
        for t in (textwrap.wrap(z, 52) or [""])[:6]:
            if y > 610:
                return im
            d.text((34, y), t, fill=(60, 60, 60), font=fs); y += 21
        y += 7
    return im


def _raster(e, R):
    im, d = _blatt(e, quer=False)
    fs, x0, y0, cw, rh = _schrift(12), 20, 52, 69, 22
    spalten = min(6, max((len(r) for r in R), default=1))
    for i, r in enumerate(R[:26]):
        y = y0 + i * rh
        if i == 0:
            d.rectangle([x0, y, x0 + spalten * cw, y + rh], fill=(232, 240, 234))
        for j in range(spalten):
            x = x0 + j * cw
            d.rectangle([x, y, x + cw, y + rh], outline=(205, 210, 205))
            v = str(r[j]) if j < len(r) and r[j] is not None else ""
            d.text((x + 4, y + 4), v[:10], fill=(40, 40, 40), font=fs)
    return im


def office_bild(daten, pfad):
    """Vorschau einer Office-Datei als PIL-Bild: das eingebettete Vorschaubild (OpenDocument fast immer, PowerPoint oft), sonst die erste
    Seite aus dem Inhalt gezeichnet – Word: Text, Excel: Raster der ersten Zellen, PowerPoint: erste Folie, TXT/CSV: Text."""
    import csv
    import re
    import zipfile
    from PIL import Image
    e = endung(pfad)
    if e in ("txt", "csv"):
        t = daten[:200_000].decode("utf-8", "replace") if not daten[:200_000].count(b"\x00") else ""
        if e == "csv":
            try:
                R = list(csv.reader(t.splitlines()[:30], dialect=csv.Sniffer().sniff(t[:4000], delimiters=";,\t")))
            except csv.Error:
                R = [z.split(";") for z in t.splitlines()[:30]]
            return _raster(e, R)
        return _text_seite(e, t.splitlines()[:60])
    z = zipfile.ZipFile(io.BytesIO(daten))
    namen = set(z.namelist())
    lies = lambda n: z.open(n).read(6 * 1024 * 1024).decode("utf-8", "replace")
    for n in ("docProps/thumbnail.jpeg", "docProps/thumbnail.jpg", "docProps/thumbnail.png", "Thumbnails/thumbnail.png"):
        if n in namen:
            im = Image.open(io.BytesIO(z.read(n)))
            from PIL import ImageStat
            leer = max(ImageStat.Stat(im.convert("L")).stddev) < 6   # leeres Vorlagenbild (z. B. aus Programmen erzeugt): lieber selbst zeichnen
            if min(im.size) >= 120 and not leer:
                return im
    if e == "docx" and "word/document.xml" in namen:
        A = _absaetze(lies("word/document.xml"), r"</w:p>", r"<w:t[^>]*>(.*?)</w:t>")
        return _text_seite(e, A[1:], A[0] if A else None)
    if e in ("odt", "odp") and "content.xml" in namen:
        A = _absaetze(lies("content.xml"), r"</text:(?:p|h)>", r"<text:(?:p|h|span)[^>]*>(.*?)(?=<text:(?:p|h)|$)")
        return _text_seite(e, A[1:], A[0] if A else None)
    if e == "pptx":
        sl = sorted((n for n in namen if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)), key=lambda n: int(re.findall(r"\d+", n)[-1]))
        A = _absaetze(lies(sl[0]), r"</a:p>", r"<a:t>(.*?)</a:t>") if sl else []
        im, d = _blatt(e, quer=True)
        if A:
            d.text((40, 70), A[0][:34], fill=(30, 30, 30), font=_schrift(30, True))
            for i, t in enumerate(A[1:9]):
                d.text((52, 130 + i * 26), "• " + t[:52], fill=(70, 70, 70), font=_schrift(17))
        return im
    if e in ("xlsx", "xlsm") and "xl/workbook.xml" in namen:
        st = _absaetze(lies("xl/sharedStrings.xml"), r"</si>", r"<t[^>]*>(.*?)</t>") if "xl/sharedStrings.xml" in namen else []
        blatt = next((n for n in ("xl/worksheets/sheet1.xml",) if n in namen), None) or next((n for n in sorted(namen) if n.startswith("xl/worksheets/sheet")), None)
        R = {}
        for ref, typ, inhalt in re.findall(r'<c r="([A-Z]+\d+)"([^>]*)>(.*?)</c>', lies(blatt) if blatt else "")[:3000]:
            m = re.match(r"([A-Z]+)(\d+)", ref)
            col = sum((ord(ch) - 64) * 26 ** i for i, ch in enumerate(reversed(m[1]))) - 1
            row = int(m[2]) - 1
            if row >= 26 or col >= 6:
                continue
            v = re.search(r"<v>(.*?)</v>", inhalt) or re.search(r"<t[^>]*>(.*?)</t>", inhalt)
            v = _xml_text(v[1]) if v else ""
            if 't="s"' in typ and v.isdigit() and int(v) < len(st):
                v = st[int(v)]
            R.setdefault(row, {})[col] = v
        n = max(R) + 1 if R else 1
        return _raster(e, [[R.get(i, {}).get(j, "") for j in range(6)] for i in range(n)])
    if e == "ods" and "content.xml" in namen:
        xml = lies("content.xml")
        R = []
        for zeile in re.findall(r"<table:table-row[^>]*>(.*?)</table:table-row>", xml)[:26]:
            R.append([_xml_text(x) for x in re.findall(r"<table:table-cell[^>]*>(.*?)</table:table-cell>", zeile)[:6]])
        return _raster(e, R)
    raise ValueError("keine Vorschau für diese Office-Datei")
