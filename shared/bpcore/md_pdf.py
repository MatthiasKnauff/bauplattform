"""Einfaches Markdown (#, ##, ###, -, 1., Einrückung, **fett**, ~~erledigt~~) als PDF – für die ToDo-Liste und das Wiki."""
import io, re


def pdf(text, titel="Bauplattform"):
    """Einfaches Markdown (#, ##, -, 1., Einrückung) als PDF."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    st = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=st["Heading1"], fontSize=16, spaceAfter=6)
    h2 = ParagraphStyle("h2", parent=st["Heading2"], fontSize=12.5, spaceBefore=10, spaceAfter=4)
    h3 = ParagraphStyle("h3", parent=st["Heading3"], fontSize=10.5, spaceBefore=8, spaceAfter=2)
    p = ParagraphStyle("p", parent=st["BodyText"], fontSize=9.5, leading=12.5)
    li = ParagraphStyle("li", parent=p, leftIndent=12, bulletIndent=2, spaceAfter=2)
    li2 = ParagraphStyle("li2", parent=li, leftIndent=26, bulletIndent=16)
    esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    fett = lambda s: re.sub(r"~~(.+?)~~", r"<strike><font color='#777777'>\1</font></strike>", re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", esc(s)))   # **fett**, ~~erledigt~~
    out = []
    for z in text.splitlines():
        if not z.strip():
            continue
        tief = len(z) - len(z.lstrip(" "))
        s = z.strip()
        if s.startswith("### "):
            out.append(Paragraph(fett(s[4:]), h3))
        elif s.startswith("## "):
            out.append(Paragraph(fett(s[3:]), h2))
        elif s.startswith("# "):
            out.append(Paragraph(fett(s[2:]), h1))
        elif s.startswith("- "):
            out.append(Paragraph(fett(s[2:]), li2 if tief else li, bulletText="•"))
        elif re.match(r"^\d+[a-z]?\.\s", s):
            n, rest = s.split(" ", 1)
            out.append(Paragraph(fett(rest), li2 if tief else li, bulletText=n))
        else:
            out.append(Paragraph(fett(s), p))
    buf = io.BytesIO()
    SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
                      title=titel, author="Bauplattform").build(out or [Spacer(1, 1)])
    return buf.getvalue()
