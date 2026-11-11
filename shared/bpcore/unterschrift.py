"""Unterschrift in ein PDF einsetzen (gemeinsame PDF-Vorschau, Knopf „✍ Unterschreiben“).

stempeln(pdf, png, seite, x, y, w, h, text) → neues PDF
  seite  1-basiert; x, y, w, h als Anteil der Seite (0…1, von links oben) – so, wie die Unterschrift in der Vorschau liegt
  text   kleine Zeile unter der Unterschrift (Name, Datum), leer = keine
  drehung  Grad im Uhrzeigersinn um die Mitte (Stempel „locker“ wie von Hand), wie in der Vorschau
  felder   [(text, rx, ry, höhe, neigung)] – Einträge im Stempel (z. B. Datum und Name im Prüfstempel), Anteile am Bild
Die Unterschrift wird als Bild auf die Seite gelegt (über dem Inhalt); alles andere bleibt unverändert.
"""
import io


def stempeln(pdf, png, seite, x, y, w, h, text="", drehung=0.0, felder=()):
    from pypdf import PdfReader, PdfWriter
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas

    rd = PdfReader(io.BytesIO(pdf))
    out = PdfWriter(clone_from=rd)
    if not out.pages:
        raise ValueError("Das PDF hat keine Seiten.")
    n = max(1, min(len(out.pages), int(seite))) - 1
    pg = out.pages[n]
    box = pg.cropbox if pg.cropbox else pg.mediabox
    bx, by, bw, bh = float(box.left), float(box.bottom), float(box.width), float(box.height)
    rot = int(pg.get("/Rotate") or 0) % 360
    if rot in (90, 270):   # gedrehte Seite: Vorschau zeigt sie aufrecht – Maße tauschen
        bw, bh = bh, bw
    x, y, w, h = (max(0.0, min(1.0, float(v))) for v in (x, y, w, h))
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=(bw, bh))
    if drehung or felder:
        ir = ImageReader(io.BytesIO(png)); iw, ih = ir.getSize()
        sw, sh = w * bw, h * bh
        f = min(sw / max(1, iw), sh / max(1, ih)); dw, dh = iw * f, ih * f   # wie preserveAspectRatio, mittig
        cx, cy = (x + w / 2) * bw, bh - (y + h / 2) * bh
        cv.saveState(); cv.translate(cx, cy); cv.rotate(-float(drehung or 0))
        cv.drawImage(ir, -dw / 2, -dh / 2, width=dw, height=dh, mask="auto")
        for t, rx, ry, rh, neig in felder or ():   # Einträge wie von Hand mit blauem Stift
            if not t:
                continue
            fs = max(5.0, rh * dh)
            cv.saveState(); cv.translate(-dw / 2 + rx * dw, dh / 2 - ry * dh); cv.rotate(-float(neig or 0))
            cv.setFont("Helvetica-Oblique", fs); cv.setFillColorRGB(0.08, 0.16, 0.5)
            mx = dw * (1 - rx) * (0.72 if neig else 0.9)   # bis kurz vor den Rand (schräg: mehr Luft)
            while t and cv.stringWidth(t, "Helvetica-Oblique", fs) > mx and fs > 5:
                fs -= 0.5; cv.setFont("Helvetica-Oblique", fs)
            cv.drawString(0, 0, t); cv.restoreState()
        cv.restoreState()
    else:
        cv.drawImage(ImageReader(io.BytesIO(png)), x * bw, bh - (y + h) * bh, width=w * bw, height=h * bh, mask="auto", preserveAspectRatio=True, anchor="sw")
    if text:
        cv.setFont("Helvetica", 7)
        cv.setFillGray(0.35)
        cv.drawString(x * bw, max(2, bh - (y + h) * bh - 9), text[:120])
    cv.save()
    stempel = PdfReader(io.BytesIO(buf.getvalue())).pages[0]
    if rot:
        stempel.add_transformation({90: (0, 1, -1, 0, bh, 0), 180: (-1, 0, 0, -1, bw, bh), 270: (0, -1, 1, 0, 0, bw)}[rot])
    if bx or by:
        stempel.add_transformation((1, 0, 0, 1, bx, by))
    pg.merge_page(stempel)
    b = io.BytesIO()
    out.write(b)
    return b.getvalue()
