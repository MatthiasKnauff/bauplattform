import json
from datetime import datetime
from flask import Blueprint, Response, g, jsonify, request
from core import audit, db, geo, settings
from bpcore import contacts as shared_contacts

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
    """Vorschläge zur Ergänzung eines Kontakts aus dem Netz (OpenStreetMap). ?q=Name&pid=&ort= – gesucht wird zuerst um das Projekt
    (sonst ums Büro) bzw. im eingetragenen Ort; lat/lon geht vor."""
    lat, lon = request.args.get("lat", type=float), request.args.get("lon", type=float)
    return jsonify(items=geo.vorschlaege(request.args.get("q", ""), request.args.get("pid", type=int), request.args.get("ort", ""),
                                         (lat, lon) if lat is not None and lon is not None else None))


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
    """Löschen nur, wenn der Kontakt nirgends verwendet wird (Bautagebuch, Baustellenadresse, Bauzeitenplan) –
    gleiche Regel in allen Apps der Bauplattform (bpcore/contacts.py)."""
    from bpcore import contacts as shared
    with db.tx() as c:
        row = c.execute("SELECT name FROM contacts WHERE id=?", (i,)).fetchone()
        if not row:
            return jsonify(ok=True)
        why = shared.usage(c, i)
        if why:
            return jsonify(error=shared.blocked_message(row["name"], why), orte=shared.orte(c, i)), 409
        from bpcore import papierkorb, versionen
        versionen.vor(c, f"kontakt:{i}")   # im Verlauf als „gelöscht“
        pk = papierkorb.ablegen(c, "contacts", i, "Kontakt", row["name"], g.user["name"], "", "adressen")
        versionen.nach(c, f"kontakt:{i}", g.user["name"])
    return jsonify(ok=True, papierkorb=pk)


# ---------- Export der Adressdatenbank: Excel und Druck (PDF) ----------
COLS = shared_contacts.EXPORT_COLS   # Excel- und PDF-Export: ein Baustein in bpcore/contacts.py (auch für die App Adressen)


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
    rows = _rows()
    _log("Excel", len(rows))
    name = f"Adressen_{datetime.now():%Y-%m-%d}.xlsx"
    return Response(shared_contacts.export_xlsx(rows), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


@bp.get("/api/contacts/export.pdf")
def export_pdf():
    rows = _rows()
    with db.tx() as c:
        office = settings.all(c).get("office_name") or ""
    pdf = shared_contacts.export_pdf(rows, _label(), kopf=office, fuss="Bautagebuch – Adressverzeichnis")
    _log("PDF", len(rows))
    return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="Adressen_{datetime.now():%Y-%m-%d}.pdf"'})
