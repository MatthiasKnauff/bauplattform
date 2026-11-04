"""Persönliche Einstellungen je Benutzer (alle Apps): Unterschrift, Versand von Rügen, Kalendertermine.

Gespeichert in bp_store: „konto:<id>“ (JSON) und „signatur:<id>“ (PNG, base64).
"""
import base64, io, json

STANDARD = {"versand": "pdf",        # Mängel-/Terminrüge: pdf | mich (an mich zum Weiterleiten) | firma (direkt an die Firma)
            "kopie": True,           # bei „direkt an die Firma“: Kopie an mich
            "kalender": False}       # eigene und verschobene Erinnerungen automatisch als Kalendertermin an mich


def _get(c, key):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (key,)).fetchone()
    return r["data"] if r else None


def _put(c, key, data, by=""):
    from datetime import datetime
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (key, data, datetime.now().isoformat(timespec="seconds"), by))


def prefs(c, uid):
    try:
        v = json.loads(_get(c, f"konto:{uid}") or "{}")
    except ValueError:
        v = {}
    return {**STANDARD, **{k: v[k] for k in STANDARD if k in v}}


def set_prefs(c, uid, d, by=""):
    p = prefs(c, uid)
    if d.get("versand") in ("pdf", "mich", "firma"):
        p["versand"] = d["versand"]
    for k in ("kopie", "kalender"):
        if k in d:
            p[k] = bool(d[k])
    _put(c, f"konto:{uid}", json.dumps(p), by)
    return p


def signatur(c, uid):
    v = _get(c, f"signatur:{uid}")
    return base64.b64decode(v) if v else None


def set_signatur(c, uid, png, by=""):
    if png is None:
        c.execute("DELETE FROM bp_store WHERE key=?", (f"signatur:{uid}",))
    else:
        _put(c, f"signatur:{uid}", base64.b64encode(png).decode(), by)


def aufbereiten(raw):
    """Handyfoto einer Unterschrift → freigestellte PNG (transparenter Hintergrund, dunkelblaue Tinte, zugeschnitten).
    Gleicht ungleichmäßiges Licht aus (Hintergrund wird geschätzt und abgezogen) und dreht nach EXIF."""
    from PIL import Image, ImageChops, ImageFilter, ImageOps
    try:
        import pillow_heif   # iPhone-Fotos (HEIC), wenn vorhanden
        pillow_heif.register_heif_opener()
    except Exception:
        pass
    try:
        im = Image.open(io.BytesIO(raw))
        im = ImageOps.exif_transpose(im)
    except Exception:
        raise ValueError("Das Bild konnte nicht gelesen werden (JPG, PNG oder HEIC).")
    im.thumbnail((1800, 1800))
    g = ImageOps.grayscale(im.convert("RGB"))
    bg = g.filter(ImageFilter.GaussianBlur(max(8, min(g.size) // 25)))   # Papier/Licht
    diff = ImageChops.subtract(bg, g)                                      # Tinte = dunkler als die Umgebung
    hist = diff.histogram()
    total = sum(hist)
    # Schwelle nach Otsu, mindestens etwas über dem Rauschen
    sumall = sum(i * h for i, h in enumerate(hist)); sb = wb = 0; best = (0, 20)
    for t in range(256):
        wb += hist[t]
        if not wb or wb == total:
            continue
        sb += t * hist[t]
        mb, mf = sb / wb, (sumall - sb) / (total - wb)
        var = wb * (total - wb) * (mb - mf) ** 2
        if var > best[0]:
            best = (var, t)
    t = max(18, best[1])
    mask = diff.point(lambda v: 255 if v > t else 0).filter(ImageFilter.MedianFilter(3))
    box = mask.getbbox()
    if not box:
        raise ValueError("Auf dem Foto wurde keine Unterschrift erkannt – bitte mit dunklem Stift auf weißem Papier und gut ausgeleuchtet fotografieren.")
    m = max(6, (box[3] - box[1]) // 12)
    box = (max(0, box[0] - m), max(0, box[1] - m), min(diff.width, box[2] + m), min(diff.height, box[3] + m))
    lo = t * 0.6
    alpha = diff.crop(box).point(lambda v: 0 if v < lo else min(255, int((v - lo) * 255 / max(1, (t * 1.6 - lo)))))
    out = Image.new("RGBA", alpha.size, (20, 34, 90, 0))
    out.putalpha(alpha)
    h = 200
    if out.height > h:
        out = out.resize((max(1, round(out.width * h / out.height)), h), Image.LANCZOS)
    if out.width > 900:
        out = out.resize((900, max(1, round(out.height * 900 / out.width))), Image.LANCZOS)
    buf = io.BytesIO(); out.save(buf, "PNG", optimize=True)
    return buf.getvalue()
