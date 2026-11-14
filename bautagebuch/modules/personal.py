"""Personalakte auf dem Dateiserver unter „Büro/Personal/<Name>“ (App „Personal“ ruft hier auf, besprochen am 14.11.2026).
GET  /api/personal/akte?pfad=Büro/Personal/X        Dateien darunter
GET  /api/personal/datei?pfad=…&rel=…              eine Datei lesen
POST /api/personal/datei {pfad, name, datei}        ablegen (gleicher Name → „(2)“, nie überschreiben)
Nur mit dem Recht „personal“. Testserver: die Ablage wird nur gelesen. Gleiche Bausteine wie die Akquise (modules/akquise.py)."""
import base64
import mimetypes
import urllib.parse

from flask import Blueprint, Response, g, jsonify, request

from core import ordnerschema as osch, remote
from bpcore import rechte
from modules.akquise import MAX, _baum, _fehler, _ziel

bp = Blueprint("personal", __name__)


@bp.before_request
def _recht():
    if not rechte.hat(g.get("user"), "personal"):
        return jsonify(error="Nur mit dem Recht „Personal“."), 403


def _pfad(x):
    """Nur unterhalb von „Büro/Personal/<Name>“ – nie woanders hin."""
    p = remote.clean_path(x if isinstance(x, str) else "/".join(x or []))
    if len(p) < 3 or p[0] != "Büro" or p[1] != "Personal":
        raise ValueError("Ungültiger Ordner.")
    return p


@bp.get("/api/personal/akte")
def akte():
    try:
        t, _ = _ziel()
        teile = _pfad(request.args.get("pfad"))
        if not t.exists("/".join(teile)):
            return jsonify(dateien=[], da=False)
        d, _o = _baum(t, teile)
    except Exception as e:   # noqa: BLE001
        return _fehler(e)
    return jsonify(dateien=d, da=True, testserver=remote.NUR_LESEN)


@bp.get("/api/personal/datei")
def datei_lesen():
    try:
        t, _ = _ziel()
        teile = _pfad(request.args.get("pfad")) + remote.clean_path(request.args.get("rel") or "")
        daten = t.read("/".join(teile), MAX)
    except Exception as e:   # noqa: BLE001
        return _fehler(e)
    return Response(daten, mimetype=mimetypes.guess_type(teile[-1])[0] or "application/octet-stream",
                    headers={"Content-Disposition": f"inline; filename*=UTF-8''{urllib.parse.quote(teile[-1])}", "Cache-Control": "no-store"})


@bp.post("/api/personal/datei")
def datei_ablegen():
    b = request.get_json(silent=True) or {}
    try:
        t, _ = _ziel()
        teile = _pfad(b.get("pfad"))
        daten = base64.b64decode(b.get("datei") or "")
        if not daten or len(daten) > MAX:
            raise ValueError("Datei leer oder zu groß (höchstens 80 MB).")
        t.mkdir("/".join(teile))
        name = osch.frei(remote.clean(str(b.get("name") or "Dokument"))[:150] or "Dokument", {e["name"] for e in t.listdir("/".join(teile))})
        t.put_bytes(daten, "/".join(teile + [name]))
    except Exception as e:   # noqa: BLE001
        return _fehler(e)
    return jsonify(ok=True, name=name, testserver=remote.NUR_LESEN)
