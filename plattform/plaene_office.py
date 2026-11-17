"""Pläne & Dateien → Office im Browser (17.11.2026, „Nextcloud Office“ = Collabora Online; Kern bpcore/office.py, Dateien beim
Bautagebuch bautagebuch/modules/office.py).

GET  /api/alle/office?project_id=&pfad=         Schlüssel und Adresse für den Editor (nur Projekte, die man sieht; „nur lesen“ → ansehen)
GET  /api/alle/office/vorlagen                   Büro-Vorlagen
POST /api/alle/office/neu {project_id, ordner, name, art, vorlage}   neue Datei (leer oder aus Vorlage) – „Nur lesen“ sperrt nurlesen.py
GET  /api/alle/office/fassungen?project_id=&pfad=   frühere Fassungen (R1)
POST /api/alle/office/zurueckholen {project_id, pfad, fassung}
"""
import urllib.parse

from flask import g, jsonify, request

from bpcore import db, office as O, rechte
from bpcore.ablage import bt_json
from plaene import _sees, app


def _bt(m, pfad, body=None):
    try:
        return jsonify(bt_json(m, pfad, body)), 200
    except RuntimeError as e:
        return jsonify(error=str(e)), 400


@app.get("/api/alle/office")
def office_oeffnen():   # GET: ändert nichts – auch bei „nur lesen“ (dann zum Ansehen)
    pid, pfad = request.args.get("project_id", type=int), str(request.args.get("pfad") or "")
    if not O.an():
        return jsonify(error="Office im Browser ist nicht eingerichtet (OFFICE_URL im Stack)."), 400
    if not O.bearbeitbar(pfad):
        return jsonify(error="Diese Datei kann Office im Browser nicht öffnen."), 400
    schreiben = rechte.app_stufe(g.user, "plaene") == "an" and not pfad.startswith("_Papierkorb/")
    with db.tx() as c:
        if not isinstance(pid, int) or not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        tok, bis = O.token(c, g.user, pid, pfad, schreiben, request.headers.get("Origin") or request.host_url.rstrip("/"))
    try:
        url = O.editor_url(pid, pfad, schreiben)
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except OSError as e:
        return jsonify(error="Office im Browser antwortet nicht: " + str(e)[:120]), 502
    return jsonify(url=url, token=tok, ttl=bis, schreiben=schreiben, herkunft=urllib.parse.urlsplit(url)._replace(path="", query="", fragment="").geturl())


@app.get("/api/alle/office/vorlagen")
def office_vorlagen():
    return _bt("GET", "/api/office/vorlagen")


@app.post("/api/alle/office/neu")
def office_neu():
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        if not isinstance(b.get("project_id"), int) or not _sees(c, b["project_id"]):
            return jsonify(error="Projekt nicht gefunden"), 404
    return _bt("POST", "/api/office/neu", {k: b.get(k) for k in ("project_id", "ordner", "name", "art", "vorlage")})


@app.get("/api/alle/office/fassungen")
def office_fassungen():
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
    return _bt("GET", "/api/office/fassungen?" + urllib.parse.urlencode({"project_id": pid, "pfad": request.args.get("pfad") or ""}))


@app.post("/api/alle/office/zurueckholen")
def office_zurueckholen():
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        if not isinstance(b.get("project_id"), int) or not _sees(c, b["project_id"]):
            return jsonify(error="Projekt nicht gefunden"), 404
    return _bt("POST", "/api/office/zurueckholen", {k: b.get(k) for k in ("project_id", "pfad", "fassung")})
