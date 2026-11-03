"""Dekorative Karte des Bauvorhabens für die PDF-Kopfzeile: OpenStreetMap-Kacheln, stark entsättigt und aufgehellt
(„abgeflachte“ Farben), kleine dezente Markierung. Kacheln werden je Projektstandort einmal geladen und als fertiges Bild
zwischengespeichert (data/maptiles). Ohne Standort/Netz: None (die PDF erscheint dann ohne Karte)."""
import io, math, os, time, urllib.request
from PIL import Image, ImageDraw
from . import db

TILE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
UA = "Bautagebuch-App/1.0 (self-hosted; PDF-Kopfzeile)"
ZOOM, COLS, ROWS = 17, 3, 2             # 3 × 2 Kacheln, davon wird ein Streifen um den Standort ausgeschnitten
OUT = (900, 300)                        # Seitenverhältnis 3:1
_fail = {}                              # Standort -> Zeitpunkt des letzten Fehlversuchs (10 Minuten Pause)


def _xy(lat, lon, z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def _fetch(z, x, y):
    req = urllib.request.Request(TILE.format(z=z, x=x, y=y), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=5) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGB")


def flatten(im, strength=.3):
    """Farben leicht abflachen (kräftig genug zum Erkennen, aber ruhig): etwas entsättigen, leicht zum Papierton hin aufhellen."""
    grey = im.convert("L").convert("RGB")
    flat = Image.blend(im, grey, .3)
    return Image.blend(flat, Image.new("RGB", im.size, (240, 241, 243)), strength * .62)


def image(proj):
    """JPEG-Bytes der Karte oder None."""
    try:
        lat, lon = float(proj["lat"]), float(proj["lon"])
    except (KeyError, TypeError, ValueError):
        return None
    key = f"{lat:.4f}_{lon:.4f}_z{ZOOM}c2"
    folder = os.path.join(db.DATA, "maptiles"); os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, key + ".jpg")
    if os.path.exists(path):
        with open(path, "rb") as f:
            return f.read()
    if time.time() - _fail.get(key, 0) < 600:
        return None
    try:
        fx, fy = _xy(lat, lon, ZOOM)
        x0, y0 = int(fx) - COLS // 2, int(fy) - ROWS // 2     # linke obere Kachel des Blocks
        canvas = Image.new("RGB", (256 * COLS, 256 * ROWS))
        for i in range(COLS):
            for j in range(ROWS):
                canvas.paste(_fetch(ZOOM, x0 + i, y0 + j), (256 * i, 256 * j))
        px, py = (fx - x0) * 256, (fy - y0) * 256            # Standort im Block (Pixel)
        w, h = 768, 256
        box = (int(px - w / 2), int(py - h / 2), int(px + w / 2), int(py + h / 2))
        box = (max(0, min(box[0], canvas.width - w)), max(0, min(box[1], canvas.height - h)))
        strip = canvas.crop((box[0], box[1], box[0] + w, box[1] + h))
        # Standort liegt evtl. nicht exakt mittig (Randbegrenzung): Markierung dort zeichnen, wo er ist
        mx, my = px - box[0], py - box[1]
        strip = flatten(strip).resize(OUT, Image.LANCZOS)
        s = OUT[0] / w
        shifted = Image.new("RGB", OUT); shifted.paste(strip)
        d = ImageDraw.Draw(shifted, "RGBA"); cx, cy, r = mx * s, my * s, 19
        d.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], fill=(255, 255, 255, 235))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(190, 120, 150, 255))
        d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=(255, 255, 255, 255))
        buf = io.BytesIO(); shifted.save(buf, "JPEG", quality=82, optimize=True)
        with open(path, "wb") as f:
            f.write(buf.getvalue())
        return buf.getvalue()
    except Exception:
        _fail[key] = time.time()
        return None
