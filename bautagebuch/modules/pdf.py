import re
from flask import Blueprint, Response, g, jsonify, request
from core import audit, bt_pdf, db, scheme, settings, storage, sync, versions

bp = Blueprint("pdf", __name__)


@bp.get("/api/reports/<int:i>/pdf")
def report_pdf(i):
    with db.tx() as c:
        rep = c.execute("SELECT * FROM reports WHERE id=?", (i,)).fetchone()
        if not rep:
            return jsonify(error="Bericht nicht gefunden"), 404
        proj = c.execute("SELECT * FROM projects WHERE id=?", (rep["project_id"],)).fetchone()
        items = [db.to_dict(r) for r in c.execute("SELECT * FROM items WHERE report_id=? ORDER BY id", (i,))]
        images = [db.to_dict(r) for r in c.execute("SELECT * FROM images WHERE report_id=? ORDER BY id", (i,))]
        sections = [db.to_dict(r) for r in c.execute("SELECT * FROM sections WHERE enabled=1 ORDER BY position, key")]
        conf = settings.all(c)
    pdf = bt_pdf.build(dict(proj), dict(rep), items, images, sections, conf, storage.logo_path(), storage.UP)
    code = re.sub(r"[^A-Za-z0-9._-]", "", (proj["name"].split() or ["Projekt"])[0]) or "Projekt"
    name = scheme.pdf_name(conf, dict(proj), rep, f"{code}_BT_{rep['date']}.pdf")  # Standard z. B. A481_BT_2026-10-28.pdf; nach Rückfrage im Schema des Projekts
    with db.tx() as c:   # Version „exportiert“ mit PDF-Dateiname
        versions.snapshot(c, i, "export", g.user["name"], name)
        d = rep["date"] or ""
        audit.log(c, g.user["name"], "export", "PDF exportiert", name, proj["id"], proj["name"], f"Nr. {rep['number']} · {d[8:10]}.{d[5:7]}.{d[:4]}")
    if request.args.get("save") != "0":  # wird mit dem Erzeugen auch in den Ablageordner gelegt
        with db.tx() as c:
            queued = sync.enqueue_pdf(c, conf, dict(proj), rep["date"], name, pdf, i)
        if queued:
            sync.wake()
    return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="{name}"'})
