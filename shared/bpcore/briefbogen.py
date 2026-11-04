"""Briefbogen des Büros (PDF, eine Seite) – wird unter Briefe der Plattform gelegt (Mängel- und Terminrüge).

Gespeichert in bp_store „briefbogen“ (base64). Der Administrator lädt ihn in der Verwaltung hoch (Einstellungen → Firma & Logo).
Ein Briefbogen mit Beschnittzugabe (etwas größer als A4) wird mittig auf A4 gelegt.
"""
import base64, io

A4 = (595.2756, 841.8898)


def holen(c):
    try:
        r = c.execute("SELECT data FROM bp_store WHERE key='briefbogen'").fetchone()
        return base64.b64decode(r["data"]) if r and r["data"] else None
    except Exception:
        return None


def pruefen(data):
    """Hochgeladene Datei prüfen → Fehlermeldung oder ''."""
    from pypdf import PdfReader
    try:
        rd = PdfReader(io.BytesIO(data))
        if not rd.pages:
            return "Die PDF-Datei hat keine Seite."
        w, h = float(rd.pages[0].mediabox.width), float(rd.pages[0].mediabox.height)
        if not (560 < w < 640 and 800 < h < 880):
            return f"Der Briefbogen muss DIN A4 hochkant sein (die Datei ist {w / 72 * 25.4:.0f} × {h / 72 * 25.4:.0f} mm)."
    except Exception as e:
        return f"Die PDF-Datei ist nicht lesbar ({e})."
    return ""


def unterlegen(pdf, bogen, seiten=1):
    """Briefbogen unter die ersten `seiten` Seiten legen (0 = alle). Formularfelder bleiben erhalten."""
    if not bogen:
        return pdf
    try:
        from pypdf import PdfReader, PdfWriter, Transformation
        bg = PdfReader(io.BytesIO(bogen)).pages[0]
        bw, bh = float(bg.mediabox.width), float(bg.mediabox.height)
        wr = PdfWriter(clone_from=PdfReader(io.BytesIO(pdf)))
        for i, pg in enumerate(wr.pages):
            if seiten and i >= seiten:
                break
            pw, ph = float(pg.mediabox.width), float(pg.mediabox.height)
            t = Transformation().translate(-float(bg.mediabox.left) + (pw - bw) / 2, -float(bg.mediabox.bottom) + (ph - bh) / 2)
            pg.merge_transformed_page(bg, t, over=False)
        out = io.BytesIO()
        wr.write(out)
        return out.getvalue()
    except Exception:
        return pdf


_RAND = {}


def raender(bogen):
    """Wo auf dem Briefbogen etwas steht – damit Briefe genau dazu passen (auch bei anderen Briefbögen).
    Liefert in Punkt, bezogen auf das A4-Blatt: links/rechts = Satzspiegel (Kante der Fußzeile, sonst des Kopfs),
    kopf = Unterkante des Kopfs (Logo) von oben, fuss = Oberkante der Fußzeile von unten. None, wenn nicht lesbar."""
    if not bogen:
        return None
    import hashlib
    k = hashlib.sha1(bogen).hexdigest()
    if k in _RAND:
        return _RAND[k]
    out = None
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(bogen)) as pdf:
            pg = pdf.pages[0]
            bw, bh = float(pg.width), float(pg.height)
            dx, dy = (bw - A4[0]) / 2, (bh - A4[1]) / 2   # Beschnittzugabe
            objs = [o for t in ("char", "curve", "rect", "line", "image") for o in pg.objects.get(t, [])
                    if (o["x1"] - o["x0"]) < 0.8 * bw and (o["x1"] - o["x0"]) > 0.3]   # durchlaufende Balken zählen nicht
            if objs:
                kopf = [o for o in objs if o["bottom"] < bh * 0.45]
                fuss = [o for o in objs if o["top"] > bh * 0.55]
                ref = fuss or kopf
                links = min(o["x0"] for o in ref) - dx
                rechts = A4[0] - (max(o["x1"] for o in ref) - dx)
                out = {"links": round(links, 1), "rechts": round(rechts, 1),
                       "kopf": round(max(o["bottom"] for o in kopf) - dy, 1) if kopf else 0.0,
                       "fuss": round(A4[1] - (min(o["top"] for o in fuss) - dy), 1) if fuss else 0.0}
                mm = 72 / 25.4
                # Unplausibles (z. B. Gestaltung bis an den Rand) → übliche Werte
                if not (8 * mm <= out["links"] <= 40 * mm):
                    out["links"] = 22 * mm
                if not (8 * mm <= out["rechts"] <= 40 * mm):
                    out["rechts"] = 18 * mm
                if out["fuss"] > 80 * mm:
                    out["fuss"] = 45 * mm
                if out["kopf"] > 100 * mm:
                    out["kopf"] = 45 * mm
    except Exception as e:
        print("Briefbogen nicht auswertbar:", e, flush=True)
    _RAND[k] = out
    return out
