"""Bautagebuch-PDF (Layout nach Vorlage): Formularseite + Fotodokumentation."""
import io, os
from xml.sax.saxutils import escape

from PIL import Image as PILImage, ImageDraw, ImageOps
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import (BaseDocTemplate, Flowable, Frame, Image, KeepTogether, PageBreak, PageTemplate,
                                Paragraph, Spacer, Table, TableStyle)

LM, RM, TM, BM = 25 * mm, 12 * mm, 14 * mm, 16 * mm   # links 25 mm Lochrand (DIN 5008) zum Abheften
W = A4[0] - LM - RM
GREY = colors.HexColor("#6b7177")
INK = colors.HexColor("#1f2326")
LINE = colors.HexColor("#4a5056")      # Rahmenlinien
SOFT = colors.HexColor("#eef0f2")      # Beschriftungsfelder
ZEBRA = colors.HexColor("#f6f7f8")
RAD = 3                                # leicht gerundete Ecken


def plain(s):  # nur Zeichen, die die Standard-PDF-Schrift darstellen kann
    return str(s or "").encode("cp1252", "replace").decode("cp1252")


def safe(s):
    return escape(plain(s)).replace("\n", "<br/>")


def de_date(iso):
    try:
        y, m, d = str(iso).split("-")
        return f"{int(d):02d}.{int(m):02d}.{y}"
    except ValueError:
        return plain(iso)


def P(text, size=10, bold=False, align=0, color=colors.black, leading=None):
    return Paragraph(text, ParagraphStyle("p", fontName="Helvetica-Bold" if bold else "Helvetica", fontSize=size,
                                          leading=leading or size * 1.28, alignment=align, textColor=color))


class Check(Flowable):
    def __init__(self, on, size=6.5 * mm):
        super().__init__()
        self.on, self.s, self.hAlign = on, size, "LEFT"

    def wrap(self, aw, ah):
        return self.s, self.s

    def draw(self):
        c, s = self.canv, self.s
        c.setLineWidth(0.8)
        c.setStrokeColor(INK)
        c.roundRect(0, 0, s, s, 1.2 * mm)
        if self.on:
            c.setLineWidth(1.7)
            p = c.beginPath()
            p.moveTo(.18 * s, .52 * s); p.lineTo(.42 * s, .2 * s); p.lineTo(.85 * s, .84 * s)
            c.drawPath(p, stroke=1, fill=0)


class NumberedCanvas(canvas.Canvas):
    FOOT = ""
    FOOT2 = ""   # Firmendaten

    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self._saved = []

    def showPage(self):
        self._saved.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        n = len(self._saved)
        for st in self._saved:
            self.__dict__.update(st)
            self.setStrokeColor(colors.HexColor("#c9cdd1")); self.setLineWidth(.5)
            self.line(LM, 12.5 * mm, A4[0] - RM, 12.5 * mm)
            self.setFont("Helvetica", 7.5)
            self.setFillColor(GREY)
            self.drawString(LM, 9 * mm, self.FOOT)
            if self.FOOT2:
                self.setFont("Helvetica", 6.8)
                self.drawString(LM, 5.2 * mm, self.FOOT2)
            self.drawRightString(A4[0] - RM, 9 * mm, f"Seite {self._pageNumber} von {n}")
            super().showPage()
        super().save()


def header(logo, office):
    right = P(f"<b>{safe(office)}</b>", 12, align=2) if office else ""
    if logo:
        try:
            w, h = ImageReader(logo).getSize()
            sc = min(55 * mm / w, 20 * mm / h)
            right = Image(logo, w * sc, h * sc, hAlign="RIGHT", mask="auto")
        except Exception:   # ohne Logo drucken – kein Grund abzubrechen
            pass
    t = Table([[P("<b>BAUTAGEBUCH</b>", 20, color=INK), right]], colWidths=[W * .55, W * .45])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm), ("LINEBELOW", (0, 0), (-1, 0), 1.6, INK)]))
    return t


def map_field(jpg, w_pt, h_pt):
    """Kartenbild füllt ein eigenes Feld vollständig: auf das Seitenverhältnis zugeschnitten, Ecken und Rahmenlinie wie die übrigen Felder."""
    im = PILImage.open(io.BytesIO(jpg)).convert("RGB")
    ratio = w_pt / h_pt
    cw, ch = (im.width, int(im.width / ratio)) if im.width / im.height < ratio else (int(im.height * ratio), im.height)
    im = im.crop(((im.width - cw) // 2, (im.height - ch) // 2, (im.width - cw) // 2 + cw, (im.height - ch) // 2 + ch))
    W_PX = 1000
    im = im.resize((W_PX, int(W_PX / ratio)), PILImage.LANCZOS)
    k = W_PX / w_pt                                  # Pixel je Punkt: Radius und Linienstärke wie bei den Tabellenfeldern
    r, lw = int(RAD * k), max(2, int(.8 * k))
    mask = PILImage.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], r, fill=255)
    out = PILImage.new("RGB", im.size, "white"); out.paste(im, (0, 0), mask)
    ImageDraw.Draw(out).rounded_rectangle([0, 0, im.width - 1, im.height - 1], r, outline="#4a5056", width=lw)
    b = io.BytesIO(); out.save(b, "JPEG", quality=85); b.seek(0)
    return b


def info_tables(proj, rep):
    adr = ", ".join(x for x in (proj.get("street"), " ".join(y for y in (proj.get("zip"), proj.get("city")) if y)) if x)
    name = P(f"<font size=7.5 color='#6b7177'><b>BAUVORHABEN</b></font><br/><font size=15><b>{safe(proj['name'])}</b></font>"
             + (f"<br/><font size=8 color='#6b7177'>{safe(adr)}</font>" if adr else ""), 15, leading=19)
    mp = None
    try:
        from . import staticmap
        mp = staticmap.image(proj)       # dekorative, stark abgeflachte Karte; ohne Standort/Netz None
    except Exception:   # Karte ist nur Schmuck (ohne Standort/Netz keine) – PDF trotzdem erstellen
        mp = None
    if mp:
        mw, gap, hh = 56 * mm, 4 * mm, 22 * mm
        left = Table([[name]], colWidths=[W - mw - gap], rowHeights=[hh], cornerRadii=[RAD] * 4)
        left.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), .8, LINE), ("BACKGROUND", (0, 0), (-1, -1), SOFT), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                  ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
        att = Paragraph("<font size=5 color='#9a9fa6'>© OpenStreetMap-Mitwirkende</font>", ParagraphStyle("o", alignment=2, leading=6))
        t1 = Table([[left, "", Image(map_field(mp, mw, hh), mw, hh)], ["", "", att]], colWidths=[W - mw - gap, gap, mw], rowHeights=[hh, 3.4 * mm])
        t1.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 0),
                                ("BOTTOMPADDING", (0, 0), (-1, -1), 0), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    else:
        t1 = Table([[name]], colWidths=[W], rowHeights=[17 * mm if not adr else 19 * mm], cornerRadii=[RAD] * 4)
        t1.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), .8, LINE), ("BACKGROUND", (0, 0), (-1, -1), SOFT), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
    temp = f"{safe(rep['temp'])}&nbsp;°C" if rep["temp"] else ""
    sky = " ".join(x for x in (temp, safe(rep["weather"])) if x)
    wx = sky + (f" / {safe(rep['precip'])}" if rep["precip"] else "")
    extra = [f"Luftfeuchtigkeit {safe(rep['humidity'])} %" if rep["humidity"] else "",
             f"Wind {safe(rep['wind'])} km/h" if rep["wind"] else ""]
    extra = " · ".join(x for x in extra if x)
    if extra:
        wx += f"<br/><font size=7 color='#666666'>{extra}</font>"
    hdr = lambda s: P(f"<b>{s}</b>", 8.5, align=1, color=GREY)
    val = lambda s, a=0: P(s, 11, align=a)
    time = safe(rep["time"]) if rep["time"] else ""
    cw = [W * .22, W * .164, W * .349, W * .267]
    t2 = Table([[P(f"<font size=7.5 color='#6b7177'><b>BAUHERRSCHAFT</b></font>&nbsp;&nbsp;&nbsp;{safe(proj['client'])}", 11), "", "", ""],
                [hdr("Datum"), hdr("Uhrzeit"), hdr("Wetter (°C / Bewölkung /Regen)"), hdr("Bauleitung vor Ort")],
                [val(de_date(rep["date"])), val(time, 1), val(wx), val(safe(rep["site_manager"]))]],
               colWidths=cw, rowHeights=[9.5 * mm, 8 * mm, 11.5 * mm], cornerRadii=[RAD] * 4)
    t2.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), .6, LINE), ("BOX", (0, 0), (-1, -1), .8, LINE), ("SPAN", (0, 0), (-1, 0)),
                            ("BACKGROUND", (0, 1), (-1, 1), SOFT), ("BACKGROUND", (0, 0), (-1, 0), ZEBRA),
                            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 6)]))
    return [t1, Spacer(1, 7 * mm), t2]


def checks(rep):
    spec = [("Baustelle aufgeräumt", "chk_tidy"), ("Maßkontrolle", "chk_measure"),
            ("Fotodokumentation", "chk_photos"), ("Alle Firmen angesprochen", "chk_firms")]
    t = Table([[[P(f"<b>{l}</b>", 7.5, color=GREY), Spacer(1, 1.5 * mm), Check(bool(rep[k]))] for l, k in spec]],
              colWidths=[W * .218, W * .152, W * .288, W * .342])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
                           ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return t


def entry(i, bold_prefix="", pics=()):
    text = safe(i["text"])
    if i.get("done"):
        text = f"<strike><font color='#777777'>{text}</font></strike> (erledigt)"
    if i.get("due") and not i.get("done"):
        y, m, t = i["due"].split("-")
        text += f" <font color='#777777'>(bis {int(t)}.{int(m)}.{y})</font>"
    if i.get("company"):   # Weisung an eine Firma: „Anweisung an Fa. X: …“
        bold_prefix = (bold_prefix.replace(":</b>", "") + f" an {safe(i['company'])}:</b> ") if bold_prefix.endswith(":</b> ") else f"<b>{safe(i['company'])}:</b> " + bold_prefix
    para = P(f"{bold_prefix}{text}", 10.5, leading=14)
    from core import storage
    cells = []
    for im in pics:   # kleine Vorschaubilder in einer eigenen Zeile unter dem Text (das große Foto steht in der Fotodokumentation)
        t = storage.thumb(im["file"], 160, square=False)
        if t:
            w, h = PILImage.open(t).size
            sc = min(12 * mm / h, 18 * mm / w)
            cells.append(Image(t, w * sc, h * sc))
    if not cells:
        return para
    row = Table([cells], colWidths=[c.drawWidth + 3 * mm for c in cells], hAlign="LEFT")
    row.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                             ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    t = Table([[para], [row]], colWidths=[W - 14], hAlign="LEFT")
    t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                           ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (0, 0), 2), ("BOTTOMPADDING", (0, 1), (0, 1), 1)]))
    return t


def box(label, paras, height=0):
    """Beschrifteter Kasten. `height` = gewünschte Gesamthöhe (wird nur aufgefüllt, nie unterschritten)."""
    lab = 8 * mm

    def make(fill):
        data = [[P(f"<b>{label}</b>", 7.5, color=GREY)]] + [[p] for p in paras] + [[""]]
        t = Table(data, colWidths=[W], rowHeights=[lab] + [None] * len(paras) + [fill], cornerRadii=[RAD] * 4)
        t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), .8, LINE), ("LINEBELOW", (0, 0), (-1, 0), .6, LINE), ("BACKGROUND", (0, 0), (-1, 0), SOFT),
                               ("VALIGN", (0, 0), (-1, 0), "MIDDLE"), ("VALIGN", (0, 1), (-1, -1), "TOP"),
                               ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                               ("TOPPADDING", (0, 1), (-1, -2), 2), ("BOTTOMPADDING", (0, 1), (-1, -2), 2),
                               ("TOPPADDING", (0, -1), (-1, -1), 0), ("BOTTOMPADDING", (0, -1), (-1, -1), 0)]))
        return t

    t = make(1)
    h0 = t.wrap(W, 10000)[1]
    return make(1 + height - h0) if height > h0 else t


def hgt(flowable):
    return flowable.wrap(W, 10000)[1]


def firms(rows, empty=1):
    n = len(rows) + empty
    data = [[P("<b>Anwesende Firmen</b>", 7.5, color=GREY), P("<b>Art der Tätigkeit</b>", 7.5, color=GREY), P("<b>Anz. Mitarb.</b>", 7.5, align=1, color=GREY)]]
    heights = [8 * mm]
    for k in range(n):
        if k < len(rows):
            r = rows[k]
            cnt = "" if r.get("headcount") is None else str(r["headcount"])
            data.append([P(safe(r["text"]), 10.5), P(safe(r.get("activity")), 10.5), P(cnt, 10.5, align=1)])
            heights.append(None)
        else:
            data.append(["", "", ""])
            heights.append(6.7 * mm)
    t = Table(data, colWidths=[W * .385, W * .50, W * .115], rowHeights=heights, repeatRows=1, cornerRadii=[RAD] * 4)
    t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), .8, LINE), ("LINEBELOW", (0, 0), (-1, 0), .6, LINE), ("BACKGROUND", (0, 0), (-1, 0), SOFT),
                           ("LINEAFTER", (0, 0), (1, -1), .6, LINE),   # nur Spaltenlinien, keine Striche zwischen den Firmen
                           *[("BACKGROUND", (0, r), (-1, r), ZEBRA) for r in range(2, len(rows) + 1, 2)],   # feine Streifen statt Linien
                           ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 1), (-1, -1), 3),
                           ("BOTTOMPADDING", (0, 1), (-1, -1), 3)]))
    return t


def prepare(path, maxpx=560, quality=64):
    """Foto für das PDF verkleinern (nur die Kopie im PDF; Original in uploads/ und auf dem Server bleibt voll aufgelöst).
    560 px auf der langen Seite reichen für eine Drittelzelle (≈ 52 mm) bei ~270 dpi; None, wenn das Format nicht lesbar ist."""
    try:
        im = ImageOps.exif_transpose(PILImage.open(path))
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            bg = PILImage.new("RGB", im.size, "white")
            bg.paste(im, mask=im.split()[-1])
            im = bg
        else:
            im = im.convert("RGB")
        im.thumbnail((maxpx, maxpx), PILImage.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=quality, optimize=True, progressive=True, subsampling=2)
        buf.seek(0)
        return buf, im.size
    except Exception:   # Foto fehlt/unlesbar: im PDF weglassen statt abzubrechen (pro Foto, kann oft vorkommen)
        return None


FOTO_SPALTEN = 3


def photos(images, upload_dir, title):
    """Fotodokumentation: drei Fotos je Zeile, bis zu vier Zeilen je Seite (12 Fotos)."""
    k = FOTO_SPALTEN
    gap = 4 * mm
    colw = (W - (k - 1) * gap) / k
    maxh = 52 * mm
    cells = []
    for n, im in enumerate(images, 1):
        prep = prepare(os.path.join(upload_dir, im["file"]))
        if prep:
            buf, (w, h) = prep
            sc = min(colw / w, maxh / h)
            pic = Image(buf, w * sc, h * sc, hAlign="LEFT")
        else:
            pic = P("(Bild kann nicht dargestellt werden)", 8, color=GREY)
        cap = f"<b>Foto {n}</b>" + (f"&nbsp;&nbsp;{safe(im.get('caption'))}" if im.get("caption") else "")
        cells.append([pic, Spacer(1, 1 * mm), P(cap, 7.5, leading=9, color=INK)])
    rows = [cells[i:i + k] for i in range(0, len(cells), k)]
    if rows:
        rows[-1] += [""] * (k - len(rows[-1]))
    t = Table(rows, colWidths=[colw + gap] * (k - 1) + [colw])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm), ("TOPPADDING", (0, 0), (-1, -1), 0)]))
    rule = Table([[""]], colWidths=[W], rowHeights=[1])
    rule.setStyle(TableStyle([("LINEABOVE", (0, 0), (-1, 0), 1.6, INK)]))
    return [PageBreak(), P("<b>Fotodokumentation</b>", 18, color=INK), Spacer(1, 1.5 * mm), P(safe(title), 9, color=GREY),
            Spacer(1, 2 * mm), rule, Spacer(1, 4 * mm), t]


def build(proj, rep, items, images, sections, settings, logo, upload_dir):
    office = settings.get("office_name", "")
    of = lambda key: [i for i in items if i["kind"] == key]
    link = [s["key"] for s in sections if s["type"] == "list" and s["extra"].get("link_contacts")]
    remarks, todo = ("notizen", "weisungen"), "zu_erledigen"
    others = [s for s in sections if s["type"] == "list" and s["key"] not in (*remarks, todo, *link)]

    E = lambda i, pre="": entry(i, pre, [im for im in images if im.get("item_id") == i["id"]])
    rem = [E(i) for i in of("notizen")] + [E(i, "<b>Anweisung:</b> ") for i in of("weisungen")]
    kurz = (settings.get("co_short") or "").strip() or office   # Kurzname, falls hinterlegt
    todo_label = f"Zu erledigen von {safe(kurz)}:" if kurz else "Zu erledigen:"
    todo_paras = [E(i) for i in of(todo)]
    rows = [i for k in link for i in of(k)]
    extras = [(s_["title"], [E(i) for i in of(s_["key"])]) for s_ in others if of(s_["key"])]

    head = [header(logo, office), Spacer(1, 5 * mm), *info_tables(proj, rep), Spacer(1, 6 * mm), checks(rep), Spacer(1, 6 * mm)]
    extra_boxes = [box(safe(t_), paras, hgt(box(safe(t_), paras)) + 7 * mm) for t_, paras in extras]  # weitere Abschnitte (z. B. Mängel) nur mit Einträgen
    extra_flow = []
    for bx in extra_boxes:
        extra_flow += [Spacer(1, 3 * mm), KeepTogether([bx])]
    if extra_flow:
        extra_flow.append(Spacer(1, 3 * mm))

    # Kompakt: jeder Block nur so hoch wie sein Inhalt plus genau eine freie Zeile zum Nachtragen.
    line = 7 * mm
    rh = hgt(box("x", rem)) + line
    th = hgt(box("x", todo_paras)) + line
    e = 1

    story = [*head, KeepTogether([box("Bemerkungen / Anweisungen", rem, rh)]), Spacer(1, 3 * mm), KeepTogether([box(todo_label, todo_paras, th)]),
             *(extra_flow or [Spacer(1, 3 * mm)]), KeepTogether([firms(rows, e)])]
    title = f"{proj['name']} · Bautagebuch Nr. {rep['number']} · {de_date(rep['date'])}"
    if images:
        story += photos(images, upload_dir, title)

    class C(NumberedCanvas):
        FOOT = plain(title)
        FOOT2 = plain(" · ".join(x for x in (
            office, settings.get("co_street", ""), " ".join(x for x in (settings.get("co_zip", ""), settings.get("co_city", "")) if x),
            "Tel. " + settings["co_phone"] if settings.get("co_phone") else "", settings.get("co_email", ""),
            settings.get("co_web", ""), settings.get("co_extra", "")) if x))

    buf = io.BytesIO()
    doc = BaseDocTemplate(buf, pagesize=A4, leftMargin=LM, rightMargin=RM, topMargin=TM, bottomMargin=BM,
                          title=plain(f"Bautagebuch {proj['name']} {de_date(rep['date'])}"), author=plain(office) or "Bautagebuch")
    doc.addPageTemplates([PageTemplate("p", frames=[Frame(LM, BM, W, A4[1] - TM - BM, 0, 0, 0, 0)])])
    doc.build(story, canvasmaker=C)
    return buf.getvalue()
