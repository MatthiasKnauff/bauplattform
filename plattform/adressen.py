"""Adressen der Bauplattform (eigener Container, eigener Port – läuft auch ohne Nginx).

Dieselben Daten wie die Kontakte im Bautagebuch und das Firmen-Adressbuch im Bauzeitenplan (Tabelle contacts).
Änderungen hier sind sofort in beiden Apps sichtbar und umgekehrt.

/                 Liste mit Suche und Filter (Firmen, Bauherren, Baustellen), Bearbeiten, Anrufen/E-Mail
/api/contacts     Liste (GET), neu (POST)
/api/contacts/<id>  ändern (PUT), löschen (DELETE – nur wenn im Bautagebuch nicht verwendet)
/api/contacts/export.pdf  Drucken (Adressverzeichnis, wie im Bautagebuch)
/api/contacts/export.xlsx Export für Excel
/api/contacts/<id>.vcf  Visitenkarte (ins Handy übernehmen)
"""
import io, json, re
from datetime import datetime

from flask import Response, g, jsonify, redirect, request

from bpcore import db, platform, sso, versionen
from bpcore import contacts as shared_contacts
import common as C

app = C.make_app(__name__)

FIELDS = {   # Feld → (höchste Länge, Bezeichnung für das Protokoll)
    "name": (200, "Name"), "trade": (300, "Gewerk"), "contact_person": (200, "Ansprechpartner"), "role": (200, "Funktion"),
    "phone": (100, "Telefon"), "mobile": (100, "Mobil"), "email": (200, "E-Mail"), "website": (300, "Internet"),
    "street": (200, "Straße"), "zip": (20, "PLZ"), "city": (200, "Ort"), "notes": (5000, "Notizen"),
}
DUP = "Einen Kontakt mit diesem Namen gibt es schon."


@app.before_request
def guard():
    p = request.path
    if p.startswith("/static/") or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base("adressen") + "/")), 401
        return redirect(C.login_url(request.url))
    if not sso.has_app(u, "adressen"):
        msg = "Für die Adressen ist dein Konto nicht freigeschaltet."
        if p.startswith("/api/"):
            return jsonify(error=msg), 403
        return (f'{msg} <a href="{C.app_base("portal")}/">Zur Startseite</a>', 403, {"Content-Type": "text/html; charset=utf-8"})
    g.user = u


@app.get("/")
def index():
    return C.page("adressen.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


# ---------------------------------------------------------------- Daten
def _extra(v):
    if isinstance(v, dict):
        return v
    try:
        return json.loads(v or "{}")
    except ValueError:
        return {}


def _usage(c):
    """Kontakt-ID → (Anzahl Einträge im Bautagebuch, Projektnamen); Kontakt-ID → Projekt, dessen Baustellenadresse er ist."""
    used = {}
    for r in c.execute("""SELECT i.contact_id AS cid, p.name AS pname, COUNT(*) AS n FROM items i
                          JOIN reports r ON r.id=i.report_id JOIN projects p ON p.id=r.project_id
                          WHERE i.contact_id IS NOT NULL GROUP BY i.contact_id, p.name"""):
        n, names = used.get(r["cid"], (0, []))
        used[r["cid"]] = (n + r["n"], names + [r["pname"]])
    site = {}
    for r in c.execute("SELECT name, extra FROM projects"):
        cid = _extra(r["extra"]).get("contact_id")
        if cid:
            try:
                site[int(cid)] = r["name"]
            except (TypeError, ValueError):
                pass
    return used, site


def _kind(r, site):
    t = [x.strip().lower() for x in re.split(r"[,;]", r["trade"] or "") if x.strip()]
    if r["id"] in site or "baustelle" in t or "bauvorhaben" in t:
        return "baustelle"
    if any(x.startswith("bauherr") for x in t):
        return "bauherr"
    return "firma"


def _out(r, used, site):
    d = {k: (r[k] if k in r.keys() else "") or "" for k in FIELDS}
    n, names = used.get(r["id"], (0, []))
    d.update(id=r["id"], kind=_kind(r, site), used=n, projects=sorted(set(names)), site_of=site.get(r["id"], ""),
             updated=r["updated"] or "")
    return d


def _clean(d, partial=False):
    out = {}
    for k, (mx, _) in FIELDS.items():
        if k in d or not partial:
            v = str(d.get(k) or "").strip()
            out[k] = " ".join(v.split())[:mx] if k != "notes" else v[:mx]
    if "email" in out and out["email"] and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", out["email"]):
        raise ValueError("Die E-Mail-Adresse ist ungültig.")
    if "website" in out and out["website"] and not re.match(r"https?://", out["website"], re.I):
        out["website"] = "https://" + out["website"]
    return out


def _now():
    return datetime.now().isoformat(timespec="seconds")


@app.get("/api/contacts")
def list_contacts():
    with db.tx() as c:
        used, site = _usage(c)
        rows = [_out(r, used, site) for r in c.execute("SELECT * FROM contacts ORDER BY name")]
    return jsonify(rows)


@app.post("/api/contacts")
def create_contact():
    try:
        d = _clean(request.get_json(silent=True) or {})
    except ValueError as e:
        return jsonify(error=str(e)), 400
    if not d["name"]:
        return jsonify(error="Bitte einen Namen eingeben."), 400
    ts = _now()
    try:
        with db.tx() as c:
            with c.savepoint():
                cols = list(d) + ["extra", "created", "updated"]
                cid = c.execute(f"INSERT INTO contacts({', '.join(cols)}) VALUES({', '.join('?' * len(cols))}) RETURNING id",
                                (*d.values(), "{}", ts, ts)).fetchone()[0]
            versionen.nach(c, f"kontakt:{cid}", g.user["name"])
    except db.IntegrityError:
        return jsonify(error=DUP), 409
    C.audit(g.user["name"], "kontakte", "Kontakt angelegt", f"{d['name']} · Adressen")
    return jsonify(ok=True, id=cid)


@app.put("/api/contacts/<int:i>")
def update_contact(i):
    try:
        d = _clean(request.get_json(silent=True) or {}, partial=True)
    except ValueError as e:
        return jsonify(error=str(e)), 400
    if "name" in d and not d["name"]:
        return jsonify(error="Der Name darf nicht leer sein."), 400
    with db.tx() as c:
        old = c.execute("SELECT * FROM contacts WHERE id=?", (i,)).fetchone()
    if not old:
        return jsonify(error="Diesen Kontakt gibt es nicht mehr."), 404
    ch = {k: v for k, v in d.items() if (old[k] or "") != v}
    if not ch:
        return jsonify(ok=True)
    try:
        with db.tx() as c:
            versionen.vor(c, f"kontakt:{i}")
            with c.savepoint():
                c.execute(f"UPDATE contacts SET {', '.join(k + '=?' for k in ch)}, updated=? WHERE id=?", (*ch.values(), _now(), i))
            versionen.nach(c, f"kontakt:{i}", g.user["name"])
    except db.IntegrityError:
        return jsonify(error=DUP), 409
    C.audit(g.user["name"], "kontakte", "Kontakt geändert", f"{ch.get('name') or old['name']} · " + ", ".join(FIELDS[k][1] for k in ch))
    return jsonify(ok=True)


@app.delete("/api/contacts/<int:i>")
def delete_contact(i):
    with db.tx() as c:
        r = c.execute("SELECT * FROM contacts WHERE id=?", (i,)).fetchone()
        if not r:
            return jsonify(ok=True)
        why = shared_contacts.usage(c, i)   # gleiche Regel wie im Bautagebuch und im Bauzeitenplan
        if why:
            return jsonify(error=shared_contacts.blocked_message(r["name"], why)), 409
        versionen.vor(c, f"kontakt:{i}")
        c.execute("DELETE FROM contacts WHERE id=?", (i,))
        versionen.nach(c, f"kontakt:{i}", g.user["name"])
    C.audit(g.user["name"], "kontakte", "Kontakt gelöscht", f"{r['name']} · Adressen")
    return jsonify(ok=True)


# ---------------------------------------------------------------- Export und Druck (wie im Bautagebuch)
# Spalten wie im Bautagebuch (modules/contacts.py): Bezeichnung, Feld, Breite in Excel
COLS = [("Firma / Name", "name", 34), ("Gewerk", "trade", 18), ("Ansprechpartner", "contact_person", 22), ("Funktion", "role", 16),
        ("Telefon", "phone", 17), ("Mobil", "mobile", 17), ("E-Mail", "email", 28), ("Internet", "website", 26),
        ("Straße", "street", 26), ("PLZ", "zip", 8), ("Ort", "city", 18), ("Notizen", "notes", 40)]


def _sel():
    """Kontakte wie in der Liste gefiltert: ?ids=1,2,3 (leer = alle); ?filter= Beschreibung des Filters für die Kopfzeile."""
    ids = {int(x) for x in request.args.get("ids", "").split(",") if x.isdigit()}
    with db.tx() as c:
        used, _ = _usage(c)
        rows = [dict(r, used=used.get(r["id"], (0, []))[0]) for r in c.execute("SELECT * FROM contacts ORDER BY name")
                if not ids or r["id"] in ids]
    return [{k: (v if v is not None else "") for k, v in r.items()} for r in rows], (request.args.get("filter") or "").strip()[:200] or "alle Kontakte"


def _office():
    try:
        with db.tx() as c:
            r = c.execute("SELECT value FROM settings WHERE key='office_name'").fetchone()
        return (r["value"] if r else "") or ""
    except Exception:
        return ""


@app.get("/api/contacts/export.xlsx")
def export_xlsx():
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter
    rows, label = _sel()
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
    C.audit(g.user["name"], "export", "Adressverzeichnis als Excel exportiert", f"{len(rows)} Kontakte · {label} · Adressen")
    name = f"Adressen_{datetime.now():%Y-%m-%d}.xlsx"
    return Response(buf.getvalue(), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


@app.get("/api/contacts/export.pdf")
def export_pdf():
    """Adressverzeichnis zum Drucken – gleiches Layout wie im Bautagebuch."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, TableStyle
    from xml.sax.saxutils import escape
    rows, label = _sel()
    office = _office()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=12 * mm, rightMargin=12 * mm, topMargin=22 * mm, bottomMargin=14 * mm,
                            title="Adressverzeichnis", author=office)
    st = ParagraphStyle("c", fontName="Helvetica", fontSize=8, leading=10)
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
             Paragraph(f"{esc(office) + ' · ' if office else ''}Stand {datetime.now():%d.%m.%Y} · {len(rows)} Kontakte · {esc(label)}", sub), t]

    def foot(cv, d):
        cv.setFont("Helvetica", 7.5); cv.setFillColor(colors.HexColor("#6b6f76"))
        cv.drawString(12 * mm, 8 * mm, "Adressen – Adressverzeichnis"); cv.drawRightString(landscape(A4)[0] - 12 * mm, 8 * mm, f"Seite {d.page}")
        C.draw_logo(cv, landscape(A4)[0] - 12 * mm, landscape(A4)[1] - 6 * mm, 12 * mm, 50 * mm)
    doc.build(story, onFirstPage=foot, onLaterPages=foot)
    C.audit(g.user["name"], "export", "Adressverzeichnis als PDF exportiert", f"{len(rows)} Kontakte · {label} · Adressen")
    return Response(buf.getvalue(), mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="Adressen_{datetime.now():%Y-%m-%d}.pdf"'})


def _vc(s):
    return str(s or "").replace("\\", "\\\\").replace("\n", "\\n").replace(",", "\\,").replace(";", "\\;")


@app.get("/api/contacts/<int:i>.vcf")
def vcard(i):
    with db.tx() as c:
        r = c.execute("SELECT * FROM contacts WHERE id=?", (i,)).fetchone()
    if not r:
        return jsonify(error="Diesen Kontakt gibt es nicht."), 404
    person = r["contact_person"] or ""
    lines = ["BEGIN:VCARD", "VERSION:3.0", f"FN:{_vc(person or r['name'])}", f"ORG:{_vc(r['name'])}"]
    if person:
        parts = person.split()
        lines.append(f"N:{_vc(parts[-1])};{_vc(' '.join(parts[:-1]))};;;")
    else:
        lines.append(f"N:;;;;")
    if r["role"]:
        lines.append(f"TITLE:{_vc(r['role'])}")
    if r["phone"]:
        lines.append(f"TEL;TYPE=WORK,VOICE:{_vc(r['phone'])}")
    if r["mobile"]:
        lines.append(f"TEL;TYPE=CELL:{_vc(r['mobile'])}")
    if r["email"]:
        lines.append(f"EMAIL;TYPE=WORK:{_vc(r['email'])}")
    if r["website"]:
        lines.append(f"URL:{_vc(r['website'])}")
    if r["street"] or r["city"]:
        lines.append(f"ADR;TYPE=WORK:;;{_vc(r['street'])};{_vc(r['city'])};;{_vc(r['zip'])};")
    if r["notes"] or r["trade"]:
        lines.append(f"NOTE:{_vc(' · '.join(x for x in (r['trade'], r['notes']) if x))}")
    lines.append("END:VCARD")
    fn = re.sub(r"[^\w\- ]+", "", r["name"]).strip() or "Kontakt"
    return Response("\r\n".join(lines) + "\r\n", mimetype="text/vcard; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{fn}.vcf"'})


C.wait_schema()
