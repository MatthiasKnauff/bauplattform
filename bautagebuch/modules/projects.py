from flask import Blueprint, Response, g, jsonify, request, send_file
from core import access, db, geo, staticmap, storage
from bpcore import fehler   # stille Fehler für die Verwaltung festhalten
from bpcore import projekte

bp = Blueprint("projects", __name__)
ADDR = ("street", "zip", "city")


@bp.get("/api/projects")
def list_projects():
    with db.tx() as c:
        vis = access.visible_ids(c, g.user)
        out = []
        for r in c.execute("SELECT * FROM projects ORDER BY id DESC"):
            if vis is not None and r["id"] not in vis:
                continue
            d = db.to_dict(r)
            d["leaders"] = access.ids_of(d.get("leaders"))
            out.append(d)
        return jsonify(out)


@bp.post("/api/projects")
def create_project():
    pid, found, auto = projekte.anlegen(request.json)   # Baustein des Kerns – derselbe wie in der Verwaltung
    return jsonify(id=pid, geocoded=found, auto_address=auto)


@bp.put("/api/projects/<int:i>")
def update_project(i):
    d = request.json or {}
    if "name" in d and not str(d["name"]).strip():
        return jsonify(error="Der Name darf nicht leer sein."), 400
    return jsonify(ok=True, geocoded=projekte.aendern(i, d))


@bp.get("/api/projects/<int:i>/map.jpg")
def project_map(i):
    """Dieselbe abgeflachte Karte wie in der PDF-Kopfzeile (für die Anzeige im Bericht)."""
    with db.tx() as c:
        row = c.execute("SELECT lat, lon FROM projects WHERE id=?", (i,)).fetchone()
    img = staticmap.image(dict(row)) if row else None
    if not img:
        return Response(status=404)
    return Response(img, mimetype="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})


def _kopfbild(c, i):
    row = c.execute("SELECT extra FROM projects WHERE id=?", (i,)).fetchone()
    return (db.to_dict(row).get("extra") or {}).get("kopfbild") if row else None


@bp.get("/api/projects/<int:i>/kopfbild.jpg")
def kopfbild(i):
    """Foto des Bauvorhabens, das im Bericht und in der PDF-Kopfzeile statt der kleinen Karte steht."""
    with db.tx() as c:
        name = _kopfbild(c, i)
    p = storage.thumb(name, 900, square=False) if name else None
    if not p:
        return Response(status=404)
    return send_file(p, mimetype="image/jpeg", max_age=86400)


@bp.post("/api/projects/<int:i>/kopfbild")
def kopfbild_setzen(i):
    """Foto statt Karte wählen (ersetzt ein früheres Foto)."""
    f = request.files.get("file")
    name = storage.save(f) if f else None
    if not name:
        return jsonify(error="Das ist kein Foto, das sich lesen lässt (JPG, PNG, HEIC, WEBP)."), 400
    with db.tx() as c:
        if not c.execute("SELECT 1 FROM projects WHERE id=?", (i,)).fetchone():
            storage.drop([name])
            return jsonify(error="Projekt nicht gefunden"), 404
        alt = _kopfbild(c, i)
        db.update(c, "projects", i, {"extra": {"kopfbild": name}})
    if alt:
        storage.drop([alt])
    return jsonify(ok=True, kopfbild=name)


@bp.delete("/api/projects/<int:i>/kopfbild")
def kopfbild_weg(i):
    """Zurück zur Karte: das Foto wird entfernt."""
    with db.tx() as c:
        alt = _kopfbild(c, i)
        db.update(c, "projects", i, {"extra": {"kopfbild": None}})
    if alt:
        storage.drop([alt])
    return jsonify(ok=True)


@bp.post("/api/projects/<int:i>/contact")
def project_contact(i):
    """Baustellenadresse in die Adressdatenbank (Kontakte) übernehmen – unter einem Namen, den der Benutzer angibt.
    accept=false: nicht mehr fragen. Danach wird die Adresse bei Änderungen im Projekt in den Kontakt mitgeführt."""
    d = request.json or {}
    with db.tx() as c:
        row = c.execute("SELECT * FROM projects WHERE id=?", (i,)).fetchone()
        if not row:
            return jsonify(error="Projekt nicht gefunden"), 404
        if not d.get("accept"):
            db.update(c, "projects", i, {"extra": {"contact_declined": True}})
            return jsonify(ok=True)
        name = " ".join(str(d.get("name") or "").split())
        if not name:
            return jsonify(error="Bitte einen Namen für den Kontakt eingeben."), 400
        try:
            with c.savepoint():
                cid = db.insert(c, "contacts", {"name": name, "trade": "Baustelle", "street": row["street"], "zip": row["zip"], "city": row["city"]})
        except db.IntegrityError:
            return jsonify(error="Diesen Namen gibt es in den Kontakten schon – bitte einen anderen wählen."), 409
        db.update(c, "projects", i, {"extra": {"contact_id": cid, "contact_declined": None}})
    return jsonify(ok=True, id=cid)


@bp.post("/api/projects/<int:i>/autoaddress")
def auto_address(i):
    """Adresse (inkl. PLZ) aus dem Projektnamen im Internet suchen – nur, wenn noch keine Adresse hinterlegt ist."""
    with db.tx() as c:
        row = c.execute("SELECT * FROM projects WHERE id=?", (i,)).fetchone()
    if not row:
        return jsonify(error="Projekt nicht gefunden"), 404
    p = db.to_dict(row)
    if any(p[k] for k in ADDR) or p["lat"] is not None:
        return jsonify(skipped=True, found=False)
    try:
        hit = geo.search(p["name"], from_name=True, strict=True)
    except Exception:
        return jsonify(error="Adresssuche nicht erreichbar (Internetzugang des Servers prüfen)."), 502
    with db.tx() as c:   # "addr_tried" verhindert, dass jedes Mal erneut gesucht wird
        if hit:
            db.update(c, "projects", i, {**{k: hit[k] for k in (*ADDR, "lat", "lon")}, "extra": {"addr_auto": True, "addr_tried": True}})
        else:
            db.update(c, "projects", i, {"extra": {"addr_tried": True}})
    return jsonify(found=bool(hit), **(hit or {}))


@bp.delete("/api/projects/<int:i>")
def delete_project(i):
    """In den Papierkorb der Plattform – mit Berichten, Fotos und allem, was in den anderen Apps am Projekt hängt.
    Die Fotodateien bleiben liegen, bis der Papierkorb geleert wird (papierkorb_dateien)."""
    from bpcore import papierkorb
    with db.tx() as c:
        r = c.execute("SELECT name FROM projects WHERE id=?", (i,)).fetchone()
        if not r:
            return jsonify(ok=True)
        files = db.image_files(c, "report_id IN (SELECT id FROM reports WHERE project_id=?)", (i,))
        pk = papierkorb.ablegen(c, "projects", i, "Projekt", r["name"], getattr(g, "user", None) and g.user["name"] or "", r["name"],
                                "bautagebuch", dateien=list(files))
    papierkorb_dateien()
    return jsonify(ok=True, papierkorb=pk)   # Papierkorb-ID für „Rückgängig“


def papierkorb_dateien():
    """Fotos von Projekten, die im Papierkorb endgültig gelöscht wurden, vom Datenträger entfernen."""
    from bpcore import papierkorb
    try:
        with db.tx() as c:
            files = papierkorb.dateien_abholen(c, "bautagebuch")
        if files:
            storage.drop(files)
    except Exception as e:
        fehler.still("bautagebuch", "Papierkorb: Fotos endgültig löschen", e)
        pass
