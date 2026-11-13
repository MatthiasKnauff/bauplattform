"""Dateien des Wikis auf der Freigabe „Bauportal“ (Ordner „02 Wiki/<Kapitel>“) – das Bautagebuch kennt die Ablage.

In der Datenbank (wiki_datei) stehen nur Name, Pfad, Größe und ein kleines Vorschaubild, nie das Dokument (besprochen am 13.11.2026).
POST /api/wiki/<eintrag>/datei {name, mime, datei (Base64)} – ablegen (gleicher Name → „(2)“), Vorschau merken
GET  /api/wiki/datei/<id>                                 – Datei von der Freigabe lesen
Testserver: liest nur – dort werden keine Dateien abgelegt.
"""
import base64
import mimetypes
import urllib.parse
from datetime import datetime

from flask import Blueprint, Response, g, jsonify, request

from core import bauportal, db, remote, sync

bp = Blueprint("wiki", __name__)
ORDNER = "02 Wiki"
MAX = 40 * 1024 * 1024


@bp.post("/api/wiki/<int:eid>/datei")
def datei_ablegen(eid):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        e = c.execute("SELECT id, kapitel FROM wiki_eintrag WHERE id=? AND deleted=''", (eid,)).fetchone()
    if not e:
        return jsonify(error="Eintrag nicht gefunden"), 404
    if remote.NUR_LESEN:
        return jsonify(error="Testserver: Dateien fürs Wiki werden nur auf der Produktion abgelegt."), 400
    try:
        daten = base64.b64decode(b.get("datei") or "")
    except Exception:   # noqa: BLE001
        return jsonify(error="Datei nicht lesbar"), 400
    if not daten or len(daten) > MAX:
        return jsonify(error="Datei leer oder zu groß (höchstens 40 MB)"), 400
    try:
        t = bauportal.ziel()
    except ValueError as x:
        return jsonify(error=str(x)), 400
    if not t:
        return jsonify(error="Keine Freigabe „Bauportal“ eingetragen (Verwaltung → Ablage)."), 400
    name = remote.clean(str(b.get("name") or "Datei"))[:120] or "Datei"
    kap = remote.clean(e["kapitel"] or "Sonstiges") or "Sonstiges"
    stamm, punkt, endung = name.rpartition(".")
    ziel, n = name, 1
    try:
        while t.exists(f"{ORDNER}/{kap}/{ziel}") and n < 50:
            n += 1
            ziel = f"{stamm} ({n}).{endung}" if punkt else f"{name} ({n})"
        t.put_bytes(daten, f"{ORDNER}/{kap}/{ziel}")
    except Exception as x:   # noqa: BLE001
        return jsonify(error=f"Freigabe Bauportal nicht erreichbar: {sync._msg(x)}"), 502
    bild = None
    try:
        from bpcore import vorschau
        if vorschau.mit_vorschau(ziel):
            bild = vorschau.bild_machen(daten, ziel)
    except Exception:   # noqa: BLE001 – ohne Vorschaubild: Symbol
        bild = None
    mime = str(b.get("mime") or "")[:80] or mimetypes.guess_type(ziel)[0] or "application/octet-stream"
    with db.tx() as c:
        r = c.execute("INSERT INTO wiki_datei(eintrag, name, pfad, mime, groesse, vorschau, created) VALUES(?,?,?,?,?,?,?) RETURNING id",
                      (eid, ziel, f"{kap}/{ziel}", mime, len(daten), bild, datetime.now().strftime("%Y-%m-%dT%H:%M:%S"))).fetchone()
        c.execute("UPDATE wiki_eintrag SET updated=? WHERE id=?", (datetime.now().strftime("%Y-%m-%dT%H:%M:%S"), eid))
    return jsonify(ok=True, id=r["id"], name=ziel, pfad=f"{kap}/{ziel}", von=g.user["name"])


@bp.get("/api/wiki/datei/<int:did>")
def datei_lesen(did):
    with db.tx() as c:
        d = c.execute("SELECT name, pfad, mime FROM wiki_datei WHERE id=? AND deleted=''", (did,)).fetchone()
    if not d:
        return jsonify(error="Datei nicht gefunden"), 404
    try:
        t = bauportal.ziel()
        daten = t.read(f"{ORDNER}/{d['pfad']}", MAX + 1) if t else None
    except Exception as x:   # noqa: BLE001
        return jsonify(error=f"Freigabe Bauportal nicht erreichbar: {sync._msg(x)}"), 502
    if daten is None:
        return jsonify(error="Keine Freigabe „Bauportal“ eingetragen."), 400
    return Response(daten, mimetype=d["mime"] or "application/octet-stream",
                    headers={"Cache-Control": "private, max-age=600", "Content-Disposition": "inline; filename*=UTF-8''" + urllib.parse.quote(d["name"])})
