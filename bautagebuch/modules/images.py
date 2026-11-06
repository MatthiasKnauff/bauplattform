import json
from flask import Blueprint, g, jsonify, request, send_file, send_from_directory
from core import db, settings, storage, sync

bp = Blueprint("images", __name__)


@bp.get("/uploads/<path:f>")
def serve(f):
    return send_from_directory(storage.UP, f)


@bp.get("/api/thumb/<int:size>/<path:f>")
def thumb(size, f):
    p = storage.thumb(f, size if size in (96, 240) else 240)
    return send_file(p, mimetype="image/jpeg", max_age=86400) if p else ("", 404)


def _default_caption(c, report_id, item_id):
    """Foto an einem Eintrag heißt zunächst wie der Eintrag: „Mangel 1“, „Mangel 2“ …, weitere Fotos „Mangel 1 (2)“."""
    if not item_id:
        return ""
    it = c.execute("SELECT i.kind, s.extra FROM items i LEFT JOIN sections s ON s.key=i.kind WHERE i.id=?", (item_id,)).fetchone()
    label = json.loads(it["extra"] or "{}").get("photo_label") if it and it["extra"] else None
    if not label:
        return ""
    n = c.execute("SELECT COUNT(*) FROM items WHERE report_id=? AND kind=? AND id<=?", (report_id, it["kind"], item_id)).fetchone()[0]
    more = c.execute("SELECT COUNT(*) FROM images WHERE item_id=?", (item_id,)).fetchone()[0]
    return f"{label} {n}" + (f" ({more + 1})" if more else "")


@bp.post("/api/reports/<int:r>/images")
def upload(r):
    rejected, queued = [], False
    with db.tx() as c:
        conf = settings.all(c)
        item = request.form.get("item_id", type=int)   # Foto gehört zu einem Mangel/einer Notiz dieses Berichts
        if item and not c.execute("SELECT 1 FROM items WHERE id=? AND report_id=?", (item, r)).fetchone():
            item = None
        for f in request.files.getlist("files"):
            name = storage.save(f)
            if name:
                i = db.insert(c, "images", {"caption": _default_caption(c, r, item)}, forced={"report_id": r, "file": name, "item_id": item})
                queued |= sync.enqueue_image(c, conf, i)
            else:
                rejected.append(f.filename or "?")
    if queued:
        sync.wake()
    return jsonify(ok=True, rejected=rejected)


@bp.put("/api/images/<int:i>")
def update_image(i):
    d = request.json or {}
    if "caption" in d:
        d["caption"] = " ".join(str(d["caption"] or "").split())[:120]
    queued = False
    with db.tx() as c:
        old = c.execute("SELECT caption FROM images WHERE id=?", (i,)).fetchone()
        db.update(c, "images", i, d, protected=("report_id", "file", "sent_remote"))
        if "caption" in d and old and (old["caption"] or "") != d["caption"]:   # Beschreibung = Dateiname auf dem Server
            queued = sync.rename_image(c, settings.all(c), i)
    if queued:
        sync.wake()
    return jsonify(ok=True)


@bp.delete("/api/images/<int:i>")
def delete_image(i):
    """Foto in den Papierkorb (Datei bleibt liegen, bis der Papierkorb geleert wird) – „Rückgängig“ holt es zurück."""
    from bpcore import papierkorb
    with db.tx() as c:
        r = c.execute("SELECT i.*, p.name AS projekt FROM images i LEFT JOIN reports rp ON rp.id = i.report_id LEFT JOIN projects p ON p.id = rp.project_id WHERE i.id=?", (i,)).fetchone()
        if not r:
            return jsonify(ok=True)
        files = db.image_files(c, "id=?", (i,))
        pk = papierkorb.ablegen(c, "images", i, "Foto", (r["caption"] if "caption" in r.keys() else "") or "Foto", g.user["name"] if getattr(g, "user", None) else "",
                                r["projekt"] or "", "bautagebuch", dateien=files)
    return jsonify(ok=True, papierkorb=pk)
