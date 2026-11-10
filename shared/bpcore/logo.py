"""Das Büro-Logo – ein Baustein für alle Apps (Tabelle buero_logo, genau eine Zeile).

Hochgeladen wird es in den Einstellungen; gelesen von jeder App direkt aus der Datenbank: als Original (lies), als kleines
quadratisches Symbol für Browser-Tab und Startbildschirm (symbol) und als PNG für die Kopfzeile der Ausdrucke (druck).
Die abgeleiteten Bilder werden je Prozess gemerkt und verfallen, sobald das Logo geändert wird (Spalte geaendert).
"""
import io, threading, time

ERLAUBT = (".png", ".jpg", ".jpeg", ".webp")
MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
_merk, _sperre = {}, threading.Lock()   # abgeleitete Bilder {schlüssel: bytes} zum Stand „geaendert“
_stand = {"v": None}


def _jetzt():
    return time.strftime("%Y-%m-%dT%H:%M:%S") + f".{int(time.time() * 1000) % 1000:03d}"


def stand(c):
    """Wann das Logo zuletzt geändert wurde ('' = keines). Jedes Mal frisch gefragt (eine Zeile über den Schlüssel) –
    so sehen alle Apps ein neues oder gelöschtes Logo sofort, auch wenn es ein anderer Container geändert hat."""
    r = c.execute("SELECT geaendert FROM buero_logo WHERE id=1").fetchone()
    v = r[0] if r else ""
    with _sperre:
        if v != _stand["v"]:
            _merk.clear()
            _stand["v"] = v
    return v


def _vergessen():
    with _sperre:
        _merk.clear()
        _stand["v"] = None


def vorhanden(c):
    return bool(stand(c))


def lies(c):
    """Original: (bytes, Endung) oder None."""
    if not stand(c):
        return None
    r = c.execute("SELECT daten, ext FROM buero_logo WHERE id=1").fetchone()
    return (bytes(r[0]), r[1]) if r else None


def setzen(c, daten, ext):
    """Neues Logo speichern. ext mit Punkt (.png, .jpg, .jpeg, .webp); sonst ValueError."""
    ext = (ext or "").lower()
    if ext not in ERLAUBT or not daten:
        raise ValueError("Bitte PNG, JPG oder WEBP wählen.")
    c.execute("INSERT INTO buero_logo(id, ext, daten, geaendert) VALUES(1,?,?,?) "
              "ON CONFLICT(id) DO UPDATE SET ext=excluded.ext, daten=excluded.daten, geaendert=excluded.geaendert", (ext, bytes(daten), _jetzt()))
    _vergessen()


def loeschen(c):
    c.execute("DELETE FROM buero_logo WHERE id=1")
    _vergessen()


def _abgeleitet(c, key, bauen):
    st = stand(c)
    if not st:
        return None
    with _sperre:
        if key in _merk:
            return _merk[key]
    roh = lies(c)
    if not roh:
        return None
    try:
        data = bauen(roh[0])
    except Exception:   # nicht lesbares Bild: wie „kein Logo“ behandeln, der Ausdruck kommt dann ohne
        data = None
    with _sperre:
        if _stand["v"] == st:
            _merk[key] = data
    return data


def symbol(c, n=64):
    """Quadratisches PNG mit n Pixeln Kantenlänge (durchsichtig aufgefüllt) – für Browser-Tab und „Zum Home-Bildschirm“."""
    def bauen(roh):
        from PIL import Image
        im = Image.open(io.BytesIO(roh)).convert("RGBA")
        im.thumbnail((n, n))
        out = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        out.paste(im, ((n - im.width) // 2, (n - im.height) // 2))
        b = io.BytesIO(); out.save(b, "PNG")
        return b.getvalue()
    return _abgeleitet(c, ("symbol", n), bauen)


def druck(c):
    """Einheitlich als PNG, höchstens 900 Pixel (WEBP, CMYK-JPG und riesige Dateien machen reportlab sonst Probleme)."""
    def bauen(roh):
        from PIL import Image
        im = Image.open(io.BytesIO(roh)); im.load()
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        im.thumbnail((900, 900))
        b = io.BytesIO(); im.save(b, "PNG")
        return b.getvalue()
    return _abgeleitet(c, ("druck",), bauen)
