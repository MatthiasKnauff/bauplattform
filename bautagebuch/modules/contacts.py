import json, io, re
from datetime import datetime
from flask import Blueprint, Response, g, jsonify, request
from core import audit, db, geo, settings

bp = Blueprint("contacts", __name__)
DUP = "Ein Kontakt mit diesem Namen existiert bereits."


def _projects_of(c):
    """Kontakt-ID -> Projekt-IDs: wo ein Kontakt in Berichten (Anwesende usw.) vorkommt, plus die Baustellenadresse des Projekts."""
    out = {}
    for r in c.execute("SELECT DISTINCT i.contact_id AS cid, r.project_id AS pid FROM items i JOIN reports r ON r.id=i.report_id WHERE i.contact_id IS NOT NULL"):
        out.setdefault(r["cid"], set()).add(r["pid"])
    for r in c.execute("SELECT id, extra FROM projects"):
        try:
            ex = r["extra"] if isinstance(r["extra"], dict) else json.loads(r["extra"] or "{}")
            if ex.get("contact_id"):
                out.setdefault(int(ex["contact_id"]), set()).add(r["id"])
        except (ValueError, TypeError):
            pass
    return out


@bp.get("/api/contacts")
def list_contacts():
    with db.tx() as c:
        rows = [db.to_dict(r) for r in c.execute("""SELECT c.*, (SELECT COUNT(*) FROM items i WHERE i.contact_id=c.id) AS used
                            FROM contacts c ORDER BY c.name""")]
        pm = _projects_of(c)
    for r in rows:
        r["projects"] = sorted(pm.get(r["id"], ()))
    return jsonify(rows)


@bp.get("/api/contacts/suggest")
def suggest():
    """Vorschläge zur Ergänzung eines Kontakts aus dem Netz (OpenStreetMap). ?q=Name&lat=&lon= (Umkreis, optional)."""
    lat, lon = request.args.get("lat", type=float), request.args.get("lon", type=float)
    return jsonify(items=geo.companies(request.args.get("q", ""), (lat, lon) if lat is not None and lon is not None else None))


@bp.get("/api/contacts/suggest/detail")
def suggest_detail():
    """Telefon/E-Mail/Internet zu einem angetippten Vorschlag."""
    return jsonify(geo.company_detail(request.args.get("type", ""), request.args.get("id", "")))


@bp.post("/api/contacts")
def create_contact():
    d = request.json or {}
    d["name"] = " ".join(str(d.get("name", "")).split())
    if not d["name"]:
        return jsonify(error="Name fehlt"), 400
    with db.tx() as c:
        try:
            with c.savepoint():
                return jsonify(id=db.insert(c, "contacts", d))
        except db.IntegrityError:
            row = c.execute("SELECT id FROM contacts WHERE name=?", (d["name"],)).fetchone()
            return jsonify(error=DUP, id=row["id"]), 409


@bp.put("/api/contacts/<int:i>")
def update_contact(i):
    d = request.json or {}
    if "name" in d:
        d["name"] = " ".join(str(d["name"]).split())
        if not d["name"]:
            return jsonify(error="Der Name darf nicht leer sein."), 400
    try:
        with db.tx() as c:
            db.update(c, "contacts", i, d)
    except db.IntegrityError:
        return jsonify(error=DUP), 409
    return jsonify(ok=True)


@bp.delete("/api/contacts/<int:i>")
def delete_contact(i):
    with db.tx() as c:  # items.contact_id wird per ON DELETE SET NULL automatisch gelöst
        c.execute("DELETE FROM contacts WHERE id=?", (i,))
    return jsonify(ok=True)


# ---------- Export der Adressdatenbank: Excel und Druck (PDF) ----------
COLS = [("Firma / Name", "name", 34), ("Gewerk", "trade", 18), ("Ansprechpartner", "contact_person", 22), ("Funktion", "role", 16),
        ("Telefon", "phone", 17), ("Mobil", "mobile", 17), ("E-Mail", "email", 28), ("Internet", "website", 26),
        ("Straße", "street", 26), ("PLZ", "zip", 8), ("Ort", "city", 18), ("Notizen", "notes", 40)]


def _rows():
    """Kontakte gefiltert wie in der Liste: ?q= (Name, Gewerk, Ansprechpartner, Ort) und ?trade= (genaues Gewerk), ?project= (Projekt-ID: Kontakte, die im Projekt vorkommen)."""
    q, trade = request.args.get("q", "").strip().lower(), request.args.get("trade", "").strip().lower()
    proj = request.args.get("project", type=int)
    with db.tx() as c:
        rows = [db.to_dict(r) for r in c.execute("""SELECT c.*, (SELECT COUNT(*) FROM items i WHERE i.contact_id=c.id) AS used FROM contacts c ORDER BY c.name""")]
        pm = _projects_of(c) if proj else {}
    keep = []
    for r in rows:
        if proj and proj not in pm.get(r["id"], ()):
            continue
        if trade and (r["trade"] or "").strip().lower() != trade:
            continue
        if q and q not in " ".join(str(r.get(k) or "") for k in ("name", "trade", "contact_person", "city")).lower():
            continue
        keep.append(r)
    return keep


def _label():
    t, q = request.args.get("trade", "").strip(), request.args.get("q", "").strip()
    pid, pn = request.args.get("project", type=int), ""
    if pid:
        with db.tx() as c:
            r = c.execute("SELECT name FROM projects WHERE id=?", (pid,)).fetchone()
        pn = r["name"] if r else ""
    return ", ".join(x for x in (f"Projekt: {pn}" if pn else "", f"Gewerk: {t}" if t else "", f"Suche: „{q}“" if q else "") if x) or "alle Kontakte"


def _log(kind, n):
    with db.tx() as c:
        audit.log(c, g.user["name"], "export", f"Adressverzeichnis als {kind} exportiert", f"{n} Kontakte · {_label()}")


@bp.get("/api/contacts/export.xlsx")
def export_xlsx():
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter
    rows = _rows()
    wb = Workbook(); ws = wb.active; ws.title = "Adressen"
    ws.append([h for h, _, _ in COLS] + ["In Berichten verwendet"])
    for r in rows:
        ws.append([r.get(k) or "" for _, k, _ in COLS] + [r.get("used") or 0])
    head = PatternFill("solid", fgColor="E0388F")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF"); cell.fill = head; cell.alignment = Alignment(vertical="center", wrap_text=True)
    for n, (_, _, w) in enumerate(COLS, 1):
        ws.column_dimensions[get_column_letter(n)].width = w
    ws.column_dimensions[get_column_letter(len(COLS) + 1)].width = 14
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            if cell.column == 10 and cell.value:
                cell.number_format = "@"          # PLZ mit führender Null als Text
    ws.freeze_panes = "B2"
    ws.auto_filter.ref = ws.dimensions
    ws.page_setup.orientation = "landscape"; ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_title_rows = "1:1"
    buf = io.BytesIO(); wb.save(buf)
    _log("Excel", len(rows))
    name = f"Adressen_{datetime.now():%Y-%m-%d}.xlsx"
    return Response(buf.getvalue(), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


@bp.get("/api/contacts/export.pdf")
def export_pdf():
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, TableStyle
    from xml.sax.saxutils import escape
    rows = _rows()
    with db.tx() as c:
        office = settings.all(c).get("office_name") or ""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=12 * mm, rightMargin=12 * mm, topMargin=14 * mm, bottomMargin=14 * mm,
                            title="Adressverzeichnis", author=office)
    st = ParagraphStyle("c", fontName="Helvetica", fontSize=8, leading=10)
    sb = ParagraphStyle("b", parent=st, fontName="Helvetica-Bold")
    sh = ParagraphStyle("h", parent=st, fontName="Helvetica-Bold", textColor=colors.white)
    esc = lambda v: escape(str(v or ""))
    P = lambda t, s=st: Paragraph(t or "&nbsp;", s)
    data = [[P(h, sh) for h in ("Firma / Name", "Gewerk", "Telefon", "E-Mail / Internet", "Adresse")]]
    for r in rows:
        person = " · ".join(x for x in (r["contact_person"], r["role"]) if x)
        tel = "<br/>".join(x for x in (esc(r["phone"]), ("Mobil " + esc(r["mobile"])) if r["mobile"] else "") if x)
        net = "<br/>".join(x for x in (esc(r["email"]), esc(r["website"])) if x)
        adr = "<br/>".join(x for x in (esc(r["street"]), esc(" ".join(y for y in (r["zip"], r["city"]) if y))) if x)
        data.append([P(f"<b>{esc(r['name'])}</b>" + (f"<br/>{esc(person)}" if person else "")), P(esc(r["trade"])), P(tel), P(net), P(adr)])
    w = landscape(A4)[0] - 24 * mm
    t = LongTable(data, colWidths=[w * .27, w * .14, w * .17, w * .24, w * .18], repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0388f")), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
                           ("LINEBELOW", (0, 0), (-1, -1), .25, colors.HexColor("#d9dbe0")), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    stitle = ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=15, leading=19)
    sub = ParagraphStyle("s", fontName="Helvetica", fontSize=8.5, textColor=colors.HexColor("#6b6f76"), spaceAfter=6 * mm)
    story = [Paragraph("Adressverzeichnis", stitle),
             Paragraph(f"{esc(office) + ' · ' if office else ''}Stand {datetime.now():%d.%m.%Y} · {len(rows)} Kontakte · {esc(_label())}", sub), t]

    def foot(cv, d):
        cv.setFont("Helvetica", 7.5); cv.setFillColor(colors.HexColor("#6b6f76"))
        cv.drawString(12 * mm, 8 * mm, "Bautagebuch – Adressverzeichnis"); cv.drawRightString(landscape(A4)[0] - 12 * mm, 8 * mm, f"Seite {d.page}")
    doc.build(story, onFirstPage=foot, onLaterPages=foot)
    _log("PDF", len(rows))
    return Response(buf.getvalue(), mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="Adressen_{datetime.now():%Y-%m-%d}.pdf"'})
