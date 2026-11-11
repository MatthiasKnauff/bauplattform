"""Bauantrag – Antragspaket: welche Vordrucke ein Antrag nutzt, eigene Unterlagen (PDF, Scan, Foto), Werte auf Vordrucke ohne
Formularfelder setzen („Platzieren“) und alles zu einem PDF mit Inhaltsverzeichnis zusammenfügen.

Stücke eines Antrags: „f<id>“ = amtlicher Vordruck (bauantrag_formular), „u<id>“ = eigene Unterlage (bauantrag_unterlage).
Platzierungen gelten je Datei-Inhalt (sha256): [{feld, seite, x, y, w, h, groesse, text?}] mit x/y/w/h als Anteil der Seite (0–1),
y von oben. feld = Schlüssel eines Antragsfelds, „datum“, „kreuz“ (✗) oder „frei“ (fester Text).
"""
import hashlib
import io
import json
import re
from datetime import datetime

from . import bauantrag_formulare as BF

# Vorschläge: Vordruck (an Titel erkannt) → passt, wenn … (W = Werte des Antrags)
VORSCHLAEGE = [
    (("baubeschreibung",), lambda W, v: True),
    (("betriebsbeschreibung",), lambda W, v: bool(re.search(r"gewerb|betrieb|werkstatt|lager|produktion|gastst|hotel", (W.get("nutzung") or "").lower()))),
    (("statistik", "erhebungsbogen"), lambda W, v: (W.get("art") or "") in ("Errichtung", "Erweiterung", "Änderung", "Nutzungsänderung") and v != "vorbescheid"),
    (("abbruch", "beseitigung"), lambda W, v: (W.get("art") or "") == "Abbruch"),
    (("werbeanlage",), lambda W, v: "werb" in (W.get("bezeichnung") or "").lower()),
    (("vorbescheid",), lambda W, v: v == "vorbescheid"),
]
_FELDZAHL = {}


def feldzahl(daten, sha):
    """Anzahl Formularfelder eines PDFs (je Inhalt gemerkt)."""
    if sha not in _FELDZAHL:
        try:
            _FELDZAHL[sha] = len(BF.felder(daten))
        except Exception:   # noqa: BLE001 – kaputtes/verschlüsseltes PDF: wie ohne Felder
            _FELDZAHL[sha] = 0
    return _FELDZAHL[sha]


def sha(daten):
    return hashlib.sha256(bytes(daten)).hexdigest()


def _plaetze(c, shas):
    if not shas:
        return {}
    return {r["sha256"]: json.loads(r["felder"] or "[]") for r in c.execute("SELECT sha256, felder FROM bauantrag_platzierung WHERE sha256 = ANY(?)", (list(shas),)).fetchall()}


def stuecke(c, a, W, land="NW"):
    """Alle möglichen Stücke eines Antrags mit Wahl und Reihenfolge. → (liste, gewählte Schlüssel in Reihenfolge)"""
    P = json.loads(a["daten"] or "{}").get("_paket") or {}
    haupt, nr = BF.formular_fuer(c, a["verfahren"], W, land)
    F = [dict(r) for r in c.execute("SELECT id, nr, titel, fassung, sha256, daten FROM bauantrag_formular WHERE land=? AND status<>'entfallen' "
                                    "AND daten IS NOT NULL ORDER BY nr='' , nr, titel", (land,)).fetchall()]
    U = [dict(r) for r in c.execute("SELECT id, name, art, sha256, daten FROM bauantrag_unterlage WHERE antrag_id=? ORDER BY id", (a["id"],)).fetchall()]
    PL = _plaetze(c, {x["sha256"] for x in F + U if x["sha256"]})
    out = []
    for f in F:
        t = BF.fold(f["titel"])
        grund = "passt zum Verfahren" if haupt and f["id"] == haupt["id"] else \
            ("vorgeschlagen" if any(any(w in t for w in ws) and fn(W, a["verfahren"]) for ws, fn in VORSCHLAEGE) else "")
        k = f"f{f['id']}"
        an = k in (P.get("an") or []) or (bool(grund) and k not in (P.get("aus") or []))
        out.append({"key": k, "art": "vordruck", "nr": f["nr"], "titel": f["titel"], "fassung": f["fassung"], "felder": feldzahl(f["daten"], f["sha256"]),
                    "platziert": len(PL.get(f["sha256"]) or []), "vorschlag": grund, "an": an, "haupt": bool(haupt and f["id"] == haupt["id"])})
    for u in U:
        k = f"u{u['id']}"
        out.append({"key": k, "art": "unterlage", "titel": u["name"], "nutzung": u["art"], "felder": feldzahl(u["daten"], u["sha256"]),
                    "platziert": len(PL.get(u["sha256"]) or []), "an": k not in (P.get("aus") or []), "vorschlag": ""})
    reihe = [k for k in (P.get("reihe") or []) if any(x["key"] == k for x in out)]
    an = [x["key"] for x in out if x["an"]]
    gewaehlt = [k for k in reihe if k in an] + [k for k in an if k not in reihe]
    pos = {k: i for i, k in enumerate(gewaehlt)}
    out.sort(key=lambda x: (0, pos[x["key"]]) if x["key"] in pos else (1, x["art"] != "vordruck", x.get("nr") or "~", x["titel"]))
    return out, gewaehlt, nr


def bild_zu_pdf(daten):
    """Foto/Scan (JPG, PNG, HEIC, TIFF) → PDF, je Bild eine A4-Seite (hoch oder quer nach dem Bild), nach EXIF gedreht."""
    from PIL import Image, ImageOps
    try:
        import pillow_heif
        pillow_heif.register_heif_opener()
    except ImportError:
        pass
    im = Image.open(io.BytesIO(daten))
    seiten = []
    for i in range(getattr(im, "n_frames", 1)):
        im.seek(i)
        x = ImageOps.exif_transpose(im.copy()).convert("RGB")
        x.thumbnail((2480, 2480))   # 300 dpi auf A4 reicht
        seiten.append(x)
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    cv = canvas.Canvas(buf)
    for x in seiten:
        ps = landscape(A4) if x.width > x.height else A4
        cv.setPageSize(ps)
        r = min(ps[0] / x.width, ps[1] / x.height)
        w, h = x.width * r, x.height * r
        b = io.BytesIO(); x.save(b, "JPEG", quality=82)
        cv.drawImage(ImageReader(b), (ps[0] - w) / 2, (ps[1] - h) / 2, w, h)
        cv.showPage()
    cv.save()
    return buf.getvalue()


def wert(feld, W, text=""):
    if feld == "datum":
        return datetime.now().strftime("%d.%m.%Y")
    if feld == "kreuz":
        return "✗"
    if feld == "frei":
        return text or ""
    v = W.get(feld)
    if feld in ("rohbau", "herstellung"):
        return BF._eur(v)
    return "" if v is None else str(v)


def platzieren(daten, plaetze, W):
    """Werte als Text auf die Seiten legen (für PDFs ohne Felder und Scans)."""
    if not plaetze:
        return bytes(daten)
    from pypdf import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import simpleSplit
    rd = PdfReader(io.BytesIO(bytes(daten)))
    w = PdfWriter(clone_from=rd)
    for i, pg in enumerate(w.pages):
        P = [p for p in plaetze if int(p.get("seite") or 0) == i]
        if not P:
            continue
        box = pg.mediabox
        bw, bh, bx, by = float(box.width), float(box.height), float(box.left), float(box.bottom)
        rot = int(pg.get("/Rotate") or 0) % 360
        dw, dh = (bh, bw) if rot in (90, 270) else (bw, bh)   # so wie man die Seite sieht
        buf = io.BytesIO()
        cv = canvas.Canvas(buf, pagesize=(dw, dh))
        cv.setFillColorRGB(0.05, 0.12, 0.45)
        for p in P:
            t = wert(p.get("feld"), W, p.get("text"))
            if not t:
                continue
            gr = max(5.0, min(24.0, float(p.get("groesse") or 9)))
            x, y0, ww, hh = float(p["x"]) * dw, float(p["y"]) * dh, float(p["w"]) * dw, float(p["h"]) * dh
            fn = "Helvetica-Bold" if p.get("feld") == "kreuz" else "Helvetica"
            zeilen = [z2 for z in t.split("\n") for z2 in (simpleSplit(z, fn, gr, max(10, ww)) or [""])]
            yy = dh - y0 - gr * 0.95
            for z in zeilen:
                if yy < dh - y0 - hh - gr * 0.3 and z is not zeilen[0]:
                    break
                cv.setFont(fn, gr)
                cv.drawString(x + 1, yy, z.replace("✗", "X") if fn == "Helvetica-Bold" else z)
                yy -= gr * 1.15
        cv.save()
        ov = PdfReader(io.BytesIO(buf.getvalue())).pages[0]
        if rot:   # zurück in die Koordinaten der ungedrehten Seite
            ov.add_transformation({90: (0, 1, -1, 0, bw, 0), 180: (-1, 0, 0, -1, bw, bh), 270: (0, -1, 1, 0, 0, bh)}[rot])
        if bx or by:
            ov.add_transformation((1, 0, 0, 1, bx, by))
        pg.merge_page(ov)
    out = io.BytesIO(); w.write(out)
    return out.getvalue()


def stueck_pdf(c, key, W):
    """Ein Stück ausgefüllt: Formularfelder + Platzierungen. → (PDF, Titel, {felder, gefuellt, platziert}) oder None."""
    if key.startswith("f"):
        r = c.execute("SELECT nr, titel, daten, sha256 FROM bauantrag_formular WHERE id=?", (int(key[1:]),)).fetchone()
        titel = f"Anlage {r['nr']} {r['titel']}".strip() if r and r["nr"] else (r["titel"] if r else "")
    else:
        r = c.execute("SELECT name AS titel, daten, sha256, art FROM bauantrag_unterlage WHERE id=?", (int(key[1:]),)).fetchone()
        titel = r["titel"] if r else ""
    if not r or r["daten"] is None:
        return None
    d = bytes(r["daten"])
    if key.startswith("u") and r["art"] == "beilegen":
        return d, titel, {"felder": 0, "gefuellt": 0, "platziert": 0}
    data, gef, n = BF.ausfuellen(d, W)
    P = _plaetze(c, {r["sha256"]}).get(r["sha256"]) or []
    if P:
        data = platzieren(data, P, W)
    return data, titel, {"felder": n, "gefuellt": gef, "platziert": len(P)}


def paket_pdf(teile, kopf, entwurf=False):
    """Stücke [(titel, pdf)] zu einem PDF: Inhaltsverzeichnis vorn, Lesezeichen je Stück."""
    from pypdf import PdfReader, PdfWriter
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    R = []
    for t, d in teile:
        try:
            R.append((t, PdfReader(io.BytesIO(d))))
        except Exception:   # noqa: BLE001 – unlesbares Stück überspringen, im Verzeichnis vermerken
            R.append((t + " (nicht lesbar)", None))
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    y = A4[1] - 30 * mm
    cv.setFont("Helvetica-Bold", 16); cv.drawString(25 * mm, y, "Antragsunterlagen"); y -= 8 * mm
    cv.setFont("Helvetica", 10)
    for z in kopf:
        cv.drawString(25 * mm, y, z[:95]); y -= 5 * mm
    y -= 6 * mm
    cv.setFont("Helvetica-Bold", 10); cv.drawString(25 * mm, y, "Inhalt"); cv.drawRightString(185 * mm, y, "Seite"); y -= 7 * mm
    cv.setFont("Helvetica", 10)
    s = 2
    for i, (t, rd) in enumerate(R, 1):
        if y < 25 * mm:
            break
        cv.drawString(25 * mm, y, f"{i}.  {t}"[:90]); cv.drawRightString(185 * mm, y, str(s) if rd else "–"); y -= 6 * mm
        s += len(rd.pages) if rd else 0
    if entwurf:
        cv.setFont("Helvetica-Bold", 9); cv.setFillColorRGB(0.75, 0.2, 0.15); cv.drawString(25 * mm, 15 * mm, "ENTWURF")
    cv.save()
    w = PdfWriter()
    w.append(PdfReader(io.BytesIO(buf.getvalue())))
    for t, rd in R:
        if rd:
            w.append(rd, outline_item=t[:120])
    out = io.BytesIO(); w.write(out)
    return out.getvalue()


def seite_png(daten, n, breite=900):
    """Seite n als PNG (für „Platzieren“) → (png, Seitenzahl, Breite/Höhe)."""
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(bytes(daten))
    try:
        anz = len(pdf)
        n = max(0, min(anz - 1, n))
        pg = pdf[n]
        w, h = pg.get_size()
        im = pg.render(scale=breite / max(w, h, 1)).to_pil()   # gedreht wie angezeigt
        pg.close()
    finally:
        pdf.close()
    b = io.BytesIO(); im.convert("RGB").save(b, "PNG", optimize=True)
    return b.getvalue(), anz, im.width / max(im.height, 1)
