from datetime import date
from flask import Blueprint, jsonify, Response
import json
from core import db

bp = Blueprint("meta", __name__)
APP_VERSION = "1.0.0"
EXPORT_TABLES = ("projects", "reports", "items", "images", "contacts", "sections", "settings")


@bp.get("/api/meta")
def meta():
    with db.tx() as c:
        secs = [db.to_dict(r) for r in c.execute("SELECT * FROM sections WHERE enabled=1 ORDER BY position, key")]
        return jsonify(app_version=APP_VERSION, schema_version=db.schema_version(c), sections=secs)


@bp.get("/api/export")
def export():
    """Vollständiger, versionierter JSON-Export (Bilder: nur Dateinamen, Dateien liegen in data/uploads)."""
    with db.tx() as c:
        out = {"format": 1, "app_version": APP_VERSION, "schema_version": db.schema_version(c),
               "tables": {t: [db.to_dict(r) for r in c.execute(f"SELECT * FROM {t}")] for t in EXPORT_TABLES}}
    return Response(json.dumps(out, ensure_ascii=False, indent=1), mimetype="application/json",
                    headers={"Content-Disposition": f"attachment; filename=bautagebuch-{date.today()}.json"})
