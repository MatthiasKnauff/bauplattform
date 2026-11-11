"""Pläne & Dateien → „Alle Dateien“: Dateiliste des Projektordners mit Vorschaubildern (bpcore/vorschau.py).

GET  /api/alle?project_id=&neu=1   Liste (aus dem nächtlichen bzw. letzten Einlesen; neu=1 liest jetzt über das Bautagebuch neu ein)
GET  /api/alle/bild?project_id=&pfad=   Vorschaubild (JPEG) aus der Datenbank – 404, solange es noch keins gibt
POST /api/alle/wunsch {project_id, pfade}   gerade angesehene Kacheln ohne Vorschau: die erzeugen die Dienste zuerst
GET  /api/alle/datei?project_id=&pfad=&dl=1   Original direkt vom Dateiserver (über das Bautagebuch), nichts wird kopiert
GET  /api/alle/info?project_id=&pfad=   Details: Angaben aus der Datei (EXIF, PDF-Seiten und Format, Office-Titel) – beim ersten Mal gelesen, dann gemerkt
"""
import urllib.parse

from flask import Response, jsonify, request

from bpcore import dateiinfo as DI, db, vorschau as V
from plaene import _bt, _sees, app


@app.get("/api/alle")
def alle_liste():
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        s = None if request.args.get("neu") == "1" else V.scan_laden(c, pid)
    if not s:
        try:
            d = _bt("/api/dateien/alle?" + urllib.parse.urlencode({"project_id": pid}))
        except ValueError as e:
            return jsonify(error=str(e)), 400
        s = {"zeit": d.get("stand"), "res": d}
    res = s.get("res") or {}
    with db.tx() as c:
        VH = V.vorhanden(c, pid)
    out = []
    for pfad, groesse, mtime in res.get("dateien") or []:
        v = VH.get(pfad)
        out.append([pfad, groesse, mtime, 1 if v and v[2] and V.aktuell(v, groesse, mtime) else (2 if (v and v[3]) or not V.mit_vorschau(pfad) else 0)])   # 1 Vorschau da, 2 keine möglich (auch .doc, .xls …)
    return jsonify(basis=res.get("basis", ""), dateien=out, abgebrochen=bool(res.get("abgebrochen")), stand=s.get("zeit") or "",
                   arten={k: sorted(x) for k, x in V.ARTEN.items()}, vorschau=list(V.VORSCHAU_ARTEN))


@app.get("/api/alle/bild")
def alle_bild():
    pid = request.args.get("project_id", type=int)
    pfad = request.args.get("pfad") or ""
    with db.tx() as c:
        if not _sees(c, pid):
            return Response(status=404)
        r = c.execute("SELECT bild, groesse, mtime FROM bp_vorschau WHERE project_id=? AND pfad=? AND bild IS NOT NULL", (pid, pfad)).fetchone()
    if not r:
        return Response(status=404, headers={"Cache-Control": "no-store"})
    etag = f'"{r["groesse"]}-{int(r["mtime"])}"'
    if request.headers.get("If-None-Match") == etag:
        return Response(status=304, headers={"ETag": etag})
    return Response(bytes(r["bild"]), mimetype="image/jpeg", headers={"ETag": etag, "Cache-Control": "private, max-age=86400"})


@app.post("/api/alle/wunsch")
def alle_wunsch():
    b = request.get_json(silent=True) or {}
    pid = b.get("project_id")
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        n = V.wuenschen(c, pid, b.get("pfade") if isinstance(b.get("pfade"), list) else [])
    return jsonify(ok=True, n=n)


@app.get("/api/alle/datei")
def alle_datei():
    pid = request.args.get("project_id", type=int)
    pfad = request.args.get("pfad") or ""
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
    try:
        data = _bt("/api/dateien/datei?" + urllib.parse.urlencode({"project_id": pid, "pfad": pfad}), raw=True)
    except ValueError as e:
        return jsonify(error=str(e)), 404
    import mimetypes
    name = pfad.rsplit("/", 1)[-1]
    mt = mimetypes.guess_type(name)[0] or "application/octet-stream"
    inline = request.args.get("dl") != "1" and (mt == "application/pdf" or mt.startswith("image/"))
    return Response(data, mimetype=mt, headers={"Content-Disposition": f"{'inline' if inline else 'attachment'}; filename*=UTF-8''{urllib.parse.quote(name)}",
                                                "Cache-Control": "private, max-age=300"})


@app.get("/api/alle/info")
def alle_info():
    pid = request.args.get("project_id", type=int)
    pfad = request.args.get("pfad") or ""
    with db.tx() as c:
        p = _sees(c, pid)
        if not p:
            return jsonify(error="Projekt nicht gefunden"), 404
        s = V.scan_laden(c, pid) or {}
        d = next((x for x in ((s.get("res") or {}).get("dateien") or []) if x[0] == pfad), None)
        if not d:   # Liste gerade neu gelesen (noch nicht gespeichert): Stand der Datei aus der Seite
            d = [pfad, request.args.get("g", 0, type=int), request.args.get("m", 0.0, type=float)]
        info = DI.gemerkt(c, pid, pfad, d[1], d[2])
        orte = [dict(r) for r in c.execute("SELECT id, name, lat, lon FROM projects WHERE lat IS NOT NULL AND lon IS NOT NULL AND archived=0").fetchall()]
    if info is None:
        info = {"gruppen": [], "gps": None}
        if DI.lesbar(pfad) and d[1] <= V.MAX_LESEN:
            try:
                info = DI.lesen(_bt("/api/dateien/datei?" + urllib.parse.urlencode({"project_id": pid, "pfad": pfad}), raw=True), pfad)
            except ValueError as e:
                return jsonify(error=str(e)), 404
        with db.tx() as c:
            DI.merken(c, pid, pfad, d[1], d[2], info)
    if info.get("gps") and orte:   # nächste Baustelle zum Aufnahmeort
        n = min(orte, key=lambda o: DI.entfernung(info["gps"], [o["lat"], o["lon"]]))
        m = DI.entfernung(info["gps"], [n["lat"], n["lon"]])
        info["naehe"] = {"projekt": n["name"], "meter": round(m), "eigenes": n["id"] == pid}
    return jsonify(info)
