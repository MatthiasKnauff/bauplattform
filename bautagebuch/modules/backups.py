from flask import Blueprint, jsonify, request, send_file
from core import backups, db, extern, settings

bp = Blueprint("backups", __name__)   # nur Administrator (siehe app.admin_only)


@bp.get("/api/backups")
def list_backups():
    return jsonify(items=backups.listing())


@bp.post("/api/backups")
def make_backup():
    name = backups.create("manuell")
    extern.kopieren_bald(name)
    return jsonify(name=name)


@bp.get("/api/backups/<name>/download")
def download(name):
    p = backups.path_of(name)
    if not p:
        return jsonify(error="Version nicht gefunden."), 404
    return send_file(p, as_attachment=True, download_name=name)


@bp.post("/api/backups/<name>/restore")
def restore(name):
    if request.args.get("extern") == "1":   # zuerst vom Dateiserver holen
        try:
            extern.holen(name)
        except Exception as e:
            return jsonify(error="Sicherung nicht vom Dateiserver geholt: " + extern._msg(e)), 400
    ok, msg = backups.restore(name)
    if ok:
        extern.fotos_holen()   # fehlende Fotos aus den Projektordnern zurückholen
    return (jsonify(ok=True, message=msg) if ok else (jsonify(error=msg), 400))


@bp.delete("/api/backups/<name>")
def delete(name):
    import os
    p = backups.path_of(name)
    if not p:
        return jsonify(error="Version nicht gefunden."), 404
    os.remove(p)
    return jsonify(ok=True)


@bp.route("/api/backups/extern", methods=["GET", "POST", "PUT"])
def extern_api():
    """GET Stand (Pfad, letzte Kopie, Sicherungen auf dem Dateiserver, Fotos) · PUT {pfad} · POST jetzt kopieren."""
    if request.method == "PUT":
        pfad = str((request.get_json(silent=True) or {}).get("pfad") or "").strip()[:400]
        if pfad and not (extern._unc(pfad) or pfad.startswith("/")):
            return jsonify(error="Bitte den Pfad als \\\\Server\\Freigabe\\Ordner eintragen."), 400
        from bpcore import versionen
        with db.tx() as c, versionen.aenderung(c, "einst:bt", "Administrator"):
            settings.put(c, "backup_remote", pfad)
    if request.method == "POST":
        ok, msg = extern.kopieren()
        if not ok:
            return jsonify(error=msg), 400
    st = extern.status()
    try:
        st["liste"] = extern.liste()
    except Exception as e:
        st["liste"], st["fehler"] = [], extern._msg(e)
    return jsonify(st)


@bp.post("/api/backups/fotos")
def fotos_api():
    """Fehlende Fotos jetzt vom Dateiserver holen."""
    started = extern.fotos_holen()
    return jsonify(ok=True, gestartet=started, **extern.status())
