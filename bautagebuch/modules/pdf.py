import io
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
    if request.args.get("vorschau") == "1":   # Vorschau im Bereich rechts: nur ansehen – keine Version, kein Export, nichts in die Ablage
        return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="{name}"', "Cache-Control": "no-store"})
    with db.tx() as c:   # unverändert seit dem letzten Export unter demselben Namen: nur ansehen – keine neue Version, kein „_old“ auf dem Server
        st, ex = versions.status(c, i)
        unveraendert = st == "exported" and ex and ex["pdf_name"] == name and request.args.get("save") != "1"
    if unveraendert:
        return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="{name}"', "X-Bt-Unveraendert": "1"})
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


@bp.get("/api/projects/<int:pid>/berichte.pdf")
def berichte_pdf(pid):
    """Mehrere Tagesberichte in einem PDF (Drucken → Zeitraum, im Kalender markiert, alle). Nur zum Ansehen/Drucken:
    keine Version, keine Ablage. ?von=JJJJ-MM-TT&bis=… oder ?ids=1,2,3; fotos=0 lässt die Fotos weg."""
    from pypdf import PdfWriter
    von, bis = request.args.get("von") or "0000", request.args.get("bis") or "9999"
    ids = [int(x) for x in re.findall(r"\d+", request.args.get("ids", ""))]
    fotos = request.args.get("fotos") != "0"
    with db.tx() as c:
        proj = c.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
        if not proj:
            return jsonify(error="Projekt nicht gefunden"), 404
        reps = [dict(r) for r in c.execute("SELECT * FROM reports WHERE project_id=? ORDER BY date, time, number", (pid,))]
        reps = [r for r in reps if (r["id"] in ids if ids else von <= (r["date"] or "") <= bis)]
        if not reps:
            return jsonify(error="Im gewählten Zeitraum gibt es keinen Tagesbericht."), 404
        if len(reps) > 200:
            return jsonify(error=f"{len(reps)} Berichte sind zu viele für ein PDF – bitte höchstens 200 wählen."), 400
        sections = [db.to_dict(r) for r in c.execute("SELECT * FROM sections WHERE enabled=1 ORDER BY position, key")]
        conf = settings.all(c)
        daten = [(r, [db.to_dict(x) for x in c.execute("SELECT * FROM items WHERE report_id=? ORDER BY id", (r["id"],))],
                  [db.to_dict(x) for x in c.execute("SELECT * FROM images WHERE report_id=? ORDER BY id", (r["id"],))] if fotos else [])
                 for r in reps]
    w = PdfWriter()
    for rep, items, images in daten:
        w.append(io.BytesIO(bt_pdf.build(dict(proj), rep, items, images, sections, conf, storage.logo_path(), storage.UP)))
    out = io.BytesIO(); w.write(out)
    code = re.sub(r"[^A-Za-z0-9._-]", "", (proj["name"].split() or ["Projekt"])[0]) or "Projekt"
    a, b = reps[0]["date"] or "", reps[-1]["date"] or ""
    name = f"{code}_BT_{a}" + (f"_bis_{b}" if b != a else "") + ".pdf"
    return Response(out.getvalue(), mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="{name}"', "Cache-Control": "no-store"})
