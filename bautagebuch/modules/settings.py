import os, re
from flask import Blueprint, g, jsonify, request, send_file
from core import db, storage
from bpcore import einstellungen   # zentrale Einstellungen: ein Baustein für alle Apps

bp = Blueprint("settings", __name__)


@bp.get("/api/settings")
def get_settings():
    with db.tx() as c:
        conf = einstellungen.fuer_browser(c, g.user["is_admin"])   # Kennwörter verlassen den Server nie
    return jsonify(**conf, has_logo=bool(storage.logo_path()))


@bp.put("/api/settings")
def put_settings():
    with db.tx() as c:
        einstellungen.aendern(c, request.json, g.user["name"])
    return jsonify(ok=True)


@bp.get("/api/logo")
def get_logo():
    p = storage.logo_path()
    return send_file(p) if p else (jsonify(error="Kein Logo"), 404)


@bp.get("/api/favicon")
def favicon():
    """Das Büro-Logo als kleines quadratisches Symbol für den Browser-Tab (und „Zum Home-Bildschirm“)."""
    p = storage.logo_path()
    if not p:
        return "", 404
    n = int(request.args.get("s")) if request.args.get("s") in ("180", "192", "512") else 64
    cache = os.path.join(storage.BRAND, f"favicon{n}.png")
    if not os.path.exists(cache) or os.path.getmtime(cache) < os.path.getmtime(p):
        from PIL import Image
        im = Image.open(p).convert("RGBA")
        im.thumbnail((n, n))
        out = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        out.paste(im, ((n - im.width) // 2, (n - im.height) // 2))
        out.save(cache)
    r = send_file(cache, mimetype="image/png")
    r.headers["Cache-Control"] = "no-cache"
    return r


@bp.post("/api/logo")
def upload_logo():
    f = request.files.get("file")
    if not f or not storage.save_logo(f):
        return jsonify(error="Bitte PNG, JPG oder WEBP wählen."), 400
    with db.tx() as c:
        storage.logo_in_die_datenbank(c)   # die anderen Apps lesen das Logo aus der Datenbank (bpcore.logo)
    return jsonify(ok=True)


@bp.delete("/api/logo")
def delete_logo():
    storage.drop_logo()
    with db.tx() as c:
        storage.logo_in_die_datenbank(c, geloescht=True)
    return jsonify(ok=True)
