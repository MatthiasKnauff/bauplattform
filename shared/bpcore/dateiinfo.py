"""Angaben aus einer Datei für „Alle Dateien“ → Details: EXIF der Fotos (Aufnahme, Kamera, Belichtung, Ort), Seiten und Format der PDFs,
Titel/Autor/Seiten der Office-Dateien. Gemerkt in bp_dateiinfo (je Stand der Datei), gelesen beim ersten Ansehen.
lesen(daten, pfad) → {"gruppen": [[titel, [[bezeichnung, wert], …]], …], "gps": [lat, lon] | None}
"""
import io
import json
import math
import re

from . import vorschau as V

FORMATE = [("A0", 841, 1189), ("A1", 594, 841), ("A2", 420, 594), ("A3", 297, 420), ("A4", 210, 297), ("A5", 148, 210)]


def papier(w_pt, h_pt):
    """Seitengröße in Punkt → „A1 quer“, sonst Maße in mm."""
    w, h = w_pt * 25.4 / 72, h_pt * 25.4 / 72
    a, b = sorted((w, h))
    for n, x, y in FORMATE:
        if abs(a - x) <= 6 and abs(b - y) <= 6:
            return f"{n} {'quer' if w > h else 'hoch'}"
    return f"{round(w)} × {round(h)} mm"


def _zahl(v, nach=1):
    try:
        f = float(v)
    except (TypeError, ValueError, ZeroDivisionError):
        return ""
    return (f"{f:.{nach}f}".rstrip("0").rstrip(".") if nach else str(round(f))).replace(".", ",")


def _datum(s):
    m = re.match(r"(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2})", str(s or ""))
    return f"{m[3]}.{m[2]}.{m[1]}, {m[4]}:{m[5]}" if m else ""


def _foto(daten, pfad):
    from PIL import Image
    if V.endung(pfad) in ("heic", "heif"):
        import pillow_heif
        pillow_heif.register_heif_opener()
    im = Image.open(io.BytesIO(daten))
    ex = im.getexif()
    sub = ex.get_ifd(0x8769) if ex else {}
    gps = ex.get_ifd(0x8825) if ex else {}
    w, h = im.size
    if ex.get(274) in (5, 6, 7, 8):   # gedreht gespeichert
        w, h = h, w
    A = [["Aufgenommen", _datum(sub.get(36867) or ex.get(306))],
         ["Kamera", " ".join(x for x in (str(ex.get(271) or "").strip(), str(ex.get(272) or "").strip()) if x and not str(ex.get(272) or "").startswith(str(ex.get(271) or "#")))
          or str(ex.get(272) or "").strip()],
         ["Objektiv", str(sub.get(42036) or "").strip()],
         ["Brennweite", (f"{_zahl(sub.get(37386))} mm" if sub.get(37386) else "") + (f" (KB {_zahl(sub.get(41989), 0)} mm)" if sub.get(41989) else "")],
         ["Belichtung", " · ".join(x for x in (f"f/{_zahl(sub.get(33437))}" if sub.get(33437) else "",
                                              (f"1/{round(1 / float(sub[33434]))} s" if float(sub[33434]) < 1 else f"{_zahl(sub[33434])} s") if sub.get(33434) else "",
                                              f"ISO {sub.get(34855)}" if sub.get(34855) else "") if x)],
         ["Bildgröße", f"{w} × {h} Pixel ({_zahl(w * h / 1e6)} MP)"],
         ["Ausrichtung", "quer" if w > h else "hoch" if h > w else "quadratisch"]]
    lage = None
    try:
        def grad(t, ref):
            d, m, s = (float(x) for x in t)
            v = d + m / 60 + s / 3600
            return -v if ref in ("S", "W") else v
        if gps.get(2) and gps.get(4):
            lage = [round(grad(gps[2], gps.get(1)), 6), round(grad(gps[4], gps.get(3)), 6)]
    except (TypeError, ValueError, ZeroDivisionError):
        lage = None
    return [["Aufnahme", [x for x in A if x[1]]]], lage


def _pdf(daten):
    from pypdf import PdfReader
    r = PdfReader(io.BytesIO(daten))
    n = len(r.pages)
    fm = []
    for p in r.pages[:60]:
        b = p.mediabox
        w, h = float(b.width), float(b.height)
        if (p.get("/Rotate") or 0) % 180:
            w, h = h, w
        f = papier(w, h)
        if f not in fm:
            fm.append(f)
    m = r.metadata or {}
    A = [["Seiten", str(n)], ["Format", ", ".join(fm[:4]) + (" …" if len(fm) > 4 else "")], ["Titel", str(m.get("/Title") or "").strip()],
         ["Verfasser", re.sub(r"^\(?anonymous\)?$", "", str(m.get("/Author") or "").strip())], ["Erstellt mit", re.sub(r"^\(?(anonymous|unspecified)\)?$", "", str(m.get("/Creator") or m.get("/Producer") or "").strip())[:80]],
         ["Erstellt am", _datum(re.sub(r"^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2}).*", r"\1-\2-\3 \4:\5", str(m.get("/CreationDate") or "")))],
         ["Geschützt", "ja" if r.is_encrypted else ""]]
    return [["PDF", [x for x in A if x[1]]]], None


def _office(daten, pfad):
    import zipfile
    z = zipfile.ZipFile(io.BytesIO(daten))
    namen = set(z.namelist())
    lies = lambda n: z.open(n).read(2 * 1024 * 1024).decode("utf-8", "replace") if n in namen else ""
    tag = lambda xml, t: (re.search(rf"<{t}[^>]*>(.*?)</{t}>", xml, re.S) or [None, ""])[1].strip()
    core, app, meta = lies("docProps/core.xml"), lies("docProps/app.xml"), lies("meta.xml")
    e = V.endung(pfad)
    blaetter = len(re.findall(r"<sheet ", lies("xl/workbook.xml"))) if e in ("xlsx", "xlsm") else 0
    A = [["Titel", tag(core, "dc:title") or tag(meta, "dc:title")], ["Verfasser", tag(core, "dc:creator") or tag(meta, "meta:initial-creator")],
         ["Zuletzt geändert von", tag(core, "cp:lastModifiedBy") or tag(meta, "dc:creator")],
         ["Geändert am", _datum(tag(core, "dcterms:modified") or tag(meta, "dc:date"))],
         ["Seiten", tag(app, "Pages")], ["Folien", tag(app, "Slides")], ["Tabellenblätter", str(blaetter) if blaetter else ""],
         ["Programm", tag(app, "Application") or tag(meta, "meta:generator")[:60]]]
    return [["Dokument", [x for x in A if x[1]]]], None


def lesen(daten, pfad):
    a = V.art(pfad)
    try:
        if a == "foto":
            G, lage = _foto(daten, pfad)
        elif a == "pdf":
            G, lage = _pdf(daten)
        elif a == "office" and V.endung(pfad) in ("docx", "xlsx", "xlsm", "pptx", "odt", "ods", "odp"):
            G, lage = _office(daten, pfad)
        else:
            return {"gruppen": [], "gps": None}
    except Exception as e:   # noqa: BLE001 – Datei nicht lesbar: nur die Grundangaben
        return {"gruppen": [], "gps": None, "fehler": (str(e) or e.__class__.__name__)[:120]}
    return {"gruppen": [g for g in G if g[1]], "gps": lage}


def lesbar(pfad):
    return V.art(pfad) in ("foto", "pdf") or (V.art(pfad) == "office" and V.endung(pfad) in ("docx", "xlsx", "xlsm", "pptx", "odt", "ods", "odp"))


def gemerkt(c, pid, pfad, groesse, mtime):
    r = c.execute("SELECT groesse, mtime, meta FROM bp_dateiinfo WHERE project_id=? AND pfad=?", (pid, pfad)).fetchone()
    if r and int(r["groesse"]) == int(groesse) and abs(float(r["mtime"]) - float(mtime)) < 2:
        try:
            return json.loads(r["meta"] or "{}")
        except ValueError:
            return None
    return None


def merken(c, pid, pfad, groesse, mtime, info):
    c.execute("""INSERT INTO bp_dateiinfo(project_id, pfad, groesse, mtime, meta) VALUES(?,?,?,?,?)
                 ON CONFLICT (project_id, pfad) DO UPDATE SET groesse=EXCLUDED.groesse, mtime=EXCLUDED.mtime, meta=EXCLUDED.meta""",
              (pid, pfad[:1000], int(groesse), float(mtime), json.dumps(info, ensure_ascii=False)))


def entfernung(a, b):
    """Luftlinie in Metern zwischen [lat, lon]-Paaren."""
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    d = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(b[1] - a[1]) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(d))
