"""Dateispeicher für Uploads. In der Datenbank steht nur der Dateiname."""
import os, uuid
from .db import DATA
from bpcore import fehler   # stille Fehler für die Verwaltung festhalten

UP = os.path.join(DATA, "uploads")
os.makedirs(UP, exist_ok=True)
ALLOWED = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif")
HEIC = (".heic", ".heif")


def to_jpg(src, dst, quality=90):
    """Beliebiges Bildformat (HEIC, PNG, WEBP, GIF, JPEG) als JPG speichern – in voller Auflösung, Drehung aus den
    Aufnahmedaten wird eingerechnet, Transparenz wird weiß hinterlegt."""
    from PIL import Image, ImageOps
    try:
        import pillow_heif
        pillow_heif.register_heif_opener()
    except Exception:   # HEIC-Unterstützung ist optional – die übrigen Formate gehen auch ohne
        pass
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            bg = Image.new("RGB", im.size, "white")
            bg.paste(im, mask=im.split()[-1])
            im = bg
        else:
            im = im.convert("RGB")
        im.save(dst, "JPEG", quality=quality, optimize=True)


heic_to_jpg = to_jpg   # alter Name


def save(f):
    """Gibt den gespeicherten Dateinamen zurück oder None. Jedes Bild wird als JPG gespeichert (HEIC, PNG, WEBP, GIF umgewandelt;
    echte JPG-Dateien bleiben unverändert, es wird nicht erneut komprimiert)."""
    ext = os.path.splitext(f.filename or "")[1].lower()
    if ext not in ALLOWED:
        return None
    base = uuid.uuid4().hex
    tmp = os.path.join(UP, base + ".tmp")
    f.save(tmp)
    try:
        from PIL import Image
        try:
            import pillow_heif
            pillow_heif.register_heif_opener()
        except Exception:   # HEIC-Unterstützung ist optional – die übrigen Formate gehen auch ohne
            pass
        with Image.open(tmp) as im:
            fmt, orient = im.format, (im.getexif().get(274) or 1)
        dst = os.path.join(UP, base + ".jpg")
        if fmt == "JPEG" and orient == 1:
            os.replace(tmp, dst)          # schon ein normales JPG: unverändert übernehmen
        else:
            to_jpg(tmp, dst)              # JPG mit Drehung oder anderes Format
        return base + ".jpg"
    except Exception as e:
        if type(e).__name__ not in ("UnidentifiedImageError", "DecompressionBombError"):   # keine/kaputte Bilddatei = Fehleingabe, wird abgelehnt
            fehler.still("bautagebuch", "Foto speichern", e)
        return None
    finally:
        try:
            os.remove(tmp)
        except OSError:
            pass


def convert_legacy(con):
    """Früher gespeicherte Nicht-JPG-Dateien (HEIC, PNG, WEBP, GIF) einmalig in JPG umwandeln. Gibt die Bild-IDs zurück."""
    done = []
    for r in con.execute("SELECT id, file FROM images WHERE lower(file) NOT LIKE '%.jpg' AND lower(file) NOT LIKE '%.jpeg'").fetchall():
        src = os.path.join(UP, r["file"])
        dst = os.path.splitext(src)[0] + ".jpg"
        try:
            to_jpg(src, dst)
        except Exception:   # Datei fehlt/unlesbar (z. B. noch nicht vom Server zurückgeholt): bleibt, wie sie ist
            continue
        con.execute("UPDATE images SET file=? WHERE id=?", (os.path.basename(dst), r["id"]))
        con.commit()
        done.append(r["id"])
        try:
            os.remove(src)
        except OSError:
            pass
    return done


THUMBS = os.path.join(DATA, "thumbs")
os.makedirs(THUMBS, exist_ok=True)


def thumb(name, size, square=True):
    """Verkleinerte Kopie (JPG) für Anzeige und PDF; wird einmal erzeugt und zwischengespeichert. None bei unlesbaren Dateien."""
    from PIL import Image, ImageOps
    src = os.path.join(UP, os.path.basename(name))
    dst = os.path.join(THUMBS, f"{size}{'s' if square else 'f'}_{os.path.splitext(os.path.basename(name))[0]}.jpg")
    if not os.path.exists(src):
        return None
    if not os.path.exists(dst):
        try:
            with Image.open(src) as im:
                im = ImageOps.exif_transpose(im).convert("RGB")
                im = ImageOps.fit(im, (size, size)) if square else (im.thumbnail((size, size)) or im)
                im.save(dst, "JPEG", quality=80)
        except Exception:   # kein Vorschaubild, wenn das Foto fehlt/unlesbar ist (pro Bild, kann oft vorkommen)
            return None
    return dst


def drop(files):
    for f in files:
        base = os.path.splitext(os.path.basename(f))[0]
        for p in [os.path.join(UP, f)] + [os.path.join(THUMBS, x) for x in os.listdir(THUMBS) if x.endswith("_" + base + ".jpg")]:
            try:
                os.remove(p)
            except OSError:
                pass


# ---- Logo für die PDF-Kopfzeile (genau eine Datei: data/branding/logo.<ext>)
BRAND = os.path.join(DATA, "branding")
os.makedirs(BRAND, exist_ok=True)
LOGO_EXT = (".png", ".jpg", ".jpeg", ".webp")


def logo_path():
    for e in LOGO_EXT:
        p = os.path.join(BRAND, "logo" + e)
        if os.path.exists(p):
            return p
    return None


def drop_logo():
    for e in LOGO_EXT:
        try:
            os.remove(os.path.join(BRAND, "logo" + e))
        except OSError:
            pass


def save_logo(f):
    ext = os.path.splitext(f.filename or "")[1].lower()
    if ext not in LOGO_EXT:
        return False
    drop_logo()
    f.save(os.path.join(BRAND, "logo" + ext))
    return True
