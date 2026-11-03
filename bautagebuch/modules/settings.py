import os, re
from flask import Blueprint, g, jsonify, request, send_file
from core import db, settings, storage

bp = Blueprint("settings", __name__)
KEY = re.compile(r"^[a-z][a-z0-9_]{0,39}$")
SECRETS = ("store_pass", "mail_pass")


@bp.get("/api/settings")
def get_settings():
    with db.tx() as c:
        conf = settings.all(c)
    for k in SECRETS:                      # Kennwörter verlassen den Server nie
        conf[k + "_set"] = bool(conf.pop(k, ""))
    if not g.user["is_admin"]:             # normale Benutzer sehen nur die Firmendaten
        conf = {k: v for k, v in conf.items() if k == "office_name" or k.startswith("co_")}
    return jsonify(**conf, has_logo=bool(storage.logo_path()))


@bp.put("/api/settings")
def put_settings():
    with db.tx() as c:
        for k, v in (request.json or {}).items():
            if k.endswith("_clear") and k[:-6] in SECRETS:
                settings.put(c, k[:-6], "")
            elif k.endswith("_set") or not (KEY.match(k) and isinstance(v, str)):
                continue
            elif k in SECRETS and not v:
                continue  # leeres Feld = Kennwort unverändert lassen
            else:
                settings.put(c, k, v[:500])
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
    return jsonify(ok=True)


@bp.delete("/api/logo")
def delete_logo():
    storage.drop_logo()
    return jsonify(ok=True)
