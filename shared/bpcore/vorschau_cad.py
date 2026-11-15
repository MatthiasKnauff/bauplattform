"""Vorschaubilder für CAD-Dateien (Teil von bpcore/vorschau.py) – ohne Zusatzbibliothek.

  · DXF (Textformat): Linien, Polylinien, Kreise, Bögen und Blöcke (INSERT, verschachtelt) selbst gezeichnet – schwarz auf weiß.
  · DWG: das Vorschaubild, das AutoCAD, Allplan, Archicad & Co. beim Speichern einbetten (Kopf → Bildbereich: BMP oder PNG).
  · DWFX/DWF (ZIP): das mitgelieferte Vorschaubild im Paket.
  · SketchUp, Revit, Rhino, Archicad, Vectorworks …: das größte eingebettete PNG/JPEG in der Datei.
cad_bild(daten, pfad) → PIL.Image; kein Bild gefunden → ValueError (der Aufrufer merkt sich den Text und zeigt das Symbol).
"""
import io
import math
import re
import struct
import zipfile

CAD_MIT = {"dxf", "dwg", "dwf", "dwfx", "skp", "rvt", "3dm", "pln", "pla", "vwx"}   # IFC und PLT haben kein Bild eingebettet
DWG_SENTINEL = bytes.fromhex("1F256D07D43628289D57CA3F9D44102B")


def cad_bild(daten, pfad):
    e = str(pfad or "").rsplit(".", 1)[-1].lower()
    if e == "dxf":
        return dxf_bild(daten)
    if e == "dwg":
        im = dwg_vorschau(daten)
        if im is not None:
            return im
    if daten[:2] == b"PK":
        im = zip_vorschau(daten)
        if im is not None:
            return im
    im = eingebettet(daten)
    if im is None:
        raise ValueError("kein Vorschaubild in der CAD-Datei")
    return im


# ---------------------------------------------------------------- eingebettete Bilder
def _oeffnen(b):
    from PIL import Image
    im = Image.open(io.BytesIO(b))
    im.load()
    return im if min(im.size) >= 32 else None


def dwg_vorschau(d):
    """DWG ab R13: Adresse des Bildbereichs bei 0x0D; danach Wächter, Größe, Anzahl und je Bild (Art, Anfang, Länge) – 2 BMP, 6 PNG."""
    if not d.startswith(b"AC10") or len(d) < 0x20:
        return None
    try:
        pos = struct.unpack_from("<I", d, 0x0D)[0]
        if d[pos:pos + 16] != DWG_SENTINEL:
            return None
        n = d[pos + 20]
        teile = [struct.unpack_from("<BII", d, pos + 21 + 9 * k) for k in range(min(n, 8))]
    except (struct.error, IndexError):
        return None
    for art, anf, lang in sorted(teile, key=lambda t: {6: 0, 2: 1}.get(t[0], 9)):
        b = d[anf:anf + lang]
        if len(b) != lang or not lang:
            continue
        try:
            if art == 6:
                im = _oeffnen(b)
            elif art == 2:   # DIB ohne Dateikopf: BITMAPFILEHEADER davor (Farbtabelle aus Kopf und Bitzahl)
                kopf, bits, farben = struct.unpack_from("<I", b, 0)[0], struct.unpack_from("<H", b, 14)[0], struct.unpack_from("<I", b, 32)[0]
                tab = (farben or (1 << bits if bits <= 8 else 0)) * 4
                im = _oeffnen(b"BM" + struct.pack("<IHHI", 14 + len(b), 0, 0, 14 + kopf + tab) + b)
            else:
                continue
        except Exception:   # noqa: BLE001 – kaputtes Bild: nächstes versuchen
            continue
        if im is not None:
            return im
    return None


def zip_vorschau(d):
    """DWFX/DWF und andere Pakete: Bild mit „thumb“/„preview“ im Namen, sonst das größte Bild im Paket."""
    try:
        z = zipfile.ZipFile(io.BytesIO(d))
    except zipfile.BadZipFile:
        return None
    L = [i for i in z.infolist() if re.search(r"\.(png|jpe?g|bmp)$", i.filename, re.I) and i.file_size < 20 * 1048576]
    L.sort(key=lambda i: (not re.search(r"thumb|preview|vorschau", i.filename, re.I), -i.file_size))
    for i in L[:5]:
        try:
            im = _oeffnen(z.read(i))
        except Exception:   # noqa: BLE001
            continue
        if im is not None:
            return im
    return None


def eingebettet(d):
    """Größtes lesbares PNG oder JPEG irgendwo in der Datei (SketchUp, Revit, Rhino, Archicad, Vectorworks speichern so ihr Vorschaubild)."""
    kand = []
    for m in re.finditer(rb"\x89PNG\r\n\x1a\n", d):
        e = d.find(b"IEND", m.start())
        if e > 0:
            kand.append((m.start(), e + 8))
        if len(kand) > 40:
            break
    for m in re.finditer(rb"\xff\xd8\xff[\xe0\xe1\xdb]", d):
        e = d.find(b"\xff\xd9", m.start() + 4)
        if e > 0:
            kand.append((m.start(), e + 2))
        if len(kand) > 80:
            break
    best = None
    for a, e in sorted(kand, key=lambda t: t[0] - t[1])[:12]:   # größte zuerst
        try:
            im = _oeffnen(d[a:e])
        except Exception:   # noqa: BLE001 – Bruchstück (z. B. über Sektoren verteilt)
            continue
        if im is not None and (best is None or im.size[0] * im.size[1] > best.size[0] * best.size[1]):
            best = im
    return best


# ---------------------------------------------------------------- DXF zeichnen
def _paare(text):
    z = text.splitlines()
    for i in range(0, len(z) - 1, 2):
        try:
            yield int(z[i].strip()), z[i + 1].strip()
        except ValueError:
            continue


def _objekte(paare):
    """Abschnitte ENTITIES und BLOCKS → (Objekte, Blöcke {name: Objekte}); ein Objekt = (Art, {Code: [Werte]})."""
    objs, bloecke, akt, ziel, abschnitt, block = [], {}, None, None, "", None
    neu_abschnitt = False
    for code, wert in paare:
        if code == 0:
            if akt is not None and ziel is not None:
                ziel.append(akt)
            akt = None
            if wert == "SECTION":
                neu_abschnitt = True
                continue
            if wert == "ENDSEC":
                abschnitt, ziel = "", None
                continue
            if abschnitt == "BLOCKS" and wert == "BLOCK":
                block = []
                akt, ziel = ("BLOCK", {}), None
                continue
            if abschnitt == "BLOCKS" and wert == "ENDBLK":
                block, ziel = None, None
                continue
            if abschnitt == "ENTITIES" or (abschnitt == "BLOCKS" and block is not None):
                akt = (wert, {})
                ziel = objs if abschnitt == "ENTITIES" else block
            continue
        if neu_abschnitt and code == 2:
            abschnitt, neu_abschnitt = wert, False
            continue
        if akt is not None:
            if akt[0] == "BLOCK" and code == 2 and block is not None:
                bloecke[wert] = block
                ziel = block
                akt = None
                continue
            akt[1].setdefault(code, []).append(wert)
    if akt is not None and ziel is not None:
        ziel.append(akt)
    return objs, bloecke


def _f(o, code, i=0, std=0.0):
    try:
        return float(o.get(code, [])[i])
    except (IndexError, ValueError):
        return std


def _linien(objs, bloecke, tf, tiefe=0, out=None):
    """Alle Objekte als Polylinien [(x, y), …] in Weltkoordinaten; tf = (dx, dy, sx, sy, Winkel)."""
    out = [] if out is None else out
    dx, dy, sx, sy, w = tf
    cw, sw = math.cos(w), math.sin(w)
    T = lambda x, y: (dx + (x * sx) * cw - (y * sy) * sw, dy + (x * sx) * sw + (y * sy) * cw)   # noqa: E731
    poly = None
    for art, o in objs:
        if len(out) > 60000:
            break
        if art == "LINE":
            out.append([T(_f(o, 10), _f(o, 20)), T(_f(o, 11), _f(o, 21))])
        elif art == "LWPOLYLINE":
            p = [T(_f(o, 10, i), _f(o, 20, i)) for i in range(min(len(o.get(10, [])), len(o.get(20, []))))]
            if p and int(_f(o, 70)) & 1:
                p.append(p[0])
            if len(p) > 1:
                out.append(p)
        elif art == "POLYLINE":
            poly = ([], int(_f(o, 70)) & 1)
        elif art == "VERTEX" and poly is not None:
            poly[0].append(T(_f(o, 10), _f(o, 20)))
        elif art == "SEQEND" and poly is not None:
            p = poly[0] + (poly[0][:1] if poly[1] else [])
            if len(p) > 1:
                out.append(p)
            poly = None
        elif art in ("CIRCLE", "ARC"):
            cx, cy, r = _f(o, 10), _f(o, 20), _f(o, 40)
            a0, a1 = (math.radians(_f(o, 50)), math.radians(_f(o, 51))) if art == "ARC" else (0.0, 2 * math.pi)
            if a1 <= a0:
                a1 += 2 * math.pi
            n = max(8, min(64, int((a1 - a0) * 10)))
            out.append([T(cx + r * math.cos(a0 + (a1 - a0) * k / n), cy + r * math.sin(a0 + (a1 - a0) * k / n)) for k in range(n + 1)])
        elif art == "INSERT" and tiefe < 4:
            b = bloecke.get((o.get(2) or [""])[0])
            if b:
                bx, by = T(_f(o, 10), _f(o, 20))
                _linien(b, bloecke, (bx, by, sx * _f(o, 41, std=1.0), sy * _f(o, 42, std=1.0), w + math.radians(_f(o, 50))), tiefe + 1, out)
    return out


def dxf_bild(daten, groesse=640):
    from PIL import Image, ImageDraw
    if daten[:22] == b"AutoCAD Binary DXF\r\n\x1a\x00":
        raise ValueError("Binär-DXF wird nicht gezeichnet")
    try:
        text = daten.decode("utf-8")
    except UnicodeDecodeError:
        text = daten.decode("cp1252", "replace")   # ältere DXF (vor 2007) in der Windows-Codepage
    objs, bloecke = _objekte(_paare(text))
    L = _linien(objs, bloecke, (0.0, 0.0, 1.0, 1.0, 0.0))
    P = [p for li in L for p in li if math.isfinite(p[0]) and math.isfinite(p[1])]
    if len(P) < 2:
        raise ValueError("keine Zeichnung in der DXF-Datei")
    xs, ys = sorted(p[0] for p in P), sorted(p[1] for p in P)
    q = lambda s, a: s[min(len(s) - 1, max(0, int(len(s) * a)))]   # noqa: E731 – Ausreißer (weit entfernte Einzelteile) abschneiden
    x0, x1, y0, y1 = q(xs, .005), q(xs, .995), q(ys, .005), q(ys, .995)
    if x1 - x0 <= 0 or y1 - y0 <= 0:
        x0, x1, y0, y1 = xs[0], xs[-1] or 1, ys[0], ys[-1] or 1
    rand = 12
    sc = (groesse - 2 * rand) / max(x1 - x0, y1 - y0, 1e-9)
    W, H = int((x1 - x0) * sc) + 2 * rand, int((y1 - y0) * sc) + 2 * rand
    im = Image.new("RGB", (max(W, 64), max(H, 64)), (255, 255, 255))
    g = ImageDraw.Draw(im)
    for li in L:
        g.line([(rand + (x - x0) * sc, H - rand - (y - y0) * sc) for x, y in li], fill=(30, 30, 30), width=1)
    return im
