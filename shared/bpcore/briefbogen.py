"""Briefbogen des Büros (PDF, eine Seite) – wird unter Briefe der Plattform gelegt (Mängel- und Terminrüge, Planversandliste).

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
