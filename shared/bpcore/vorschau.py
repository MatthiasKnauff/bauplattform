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
VORSCHAU_ARTEN = ("pdf", "foto")
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


def mit_vorschau(pfad):
    return art(pfad) in VORSCHAU_ARTEN


def bild_machen(daten, pfad):
    """Vorschau als JPEG-Bytes (längste Seite GROESSE). Fehler → Exception (der Aufrufer merkt sich den Text)."""
    from PIL import Image, ImageOps
    if art(pfad) == "pdf":
        import pypdfium2 as pdfium
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
