from flask import Blueprint, Response, g, jsonify, request
from core import access, db, geo, staticmap, storage
from bpcore import fehler   # stille Fehler für die Verwaltung festhalten

bp = Blueprint("projects", __name__)
ADDR = ("street", "zip", "city")


def with_coords(d, current=None):
    """Hat sich die Adresse geändert, werden die Koordinaten neu bestimmt (außerhalb der DB-Transaktion).
    Gibt True/False zurück, ob etwas gefunden wurde, oder None, wenn die Adresse nicht betroffen ist."""
    if not any(k in d for k in ADDR) or "lat" in d or "lon" in d:
        return None
    cur = {k: str((current or {}).get(k) or "").strip() for k in ADDR}
    cur.update({k: str(d[k] or "").strip() for k in ADDR if k in d})
    if not any(cur.values()):
        d["lat"] = d["lon"] = None
        return None
    hit = geo.search(", ".join(x for x in (cur["street"], f"{cur['zip']} {cur['city']}".strip()) if x))
    d["lat"], d["lon"] = (hit["lat"], hit["lon"]) if hit else (None, None)
    return bool(hit)


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
    d = request.json or {}
    d.setdefault("name", "Neues Projekt")
    explicit = "lat" in d or "lon" in d
    found, auto = with_coords(d), False
    if found is None and not any(str(d.get(k) or "").strip() for k in ADDR) and not explicit:
        d.pop("lat", None); d.pop("lon", None)
        hit = geo.search(d["name"], from_name=True)   # keine Adresse angegeben: aus dem Projektnamen ermitteln
        d["extra"] = {"addr_tried": True}
        if hit:
            d.update({k: hit[k] for k in (*ADDR, "lat", "lon")})
            d["extra"]["addr_auto"] = auto = True
    with db.tx() as c:
        d["leaders"] = access.clean(d.get("leaders"), c)
        return jsonify(id=db.insert(c, "projects", d), geocoded=found, auto_address=auto)


@bp.put("/api/projects/<int:i>")
def update_project(i):
    d = request.json or {}
    if "name" in d and not str(d["name"]).strip():
        return jsonify(error="Der Name darf nicht leer sein."), 400
    with db.tx() as c:
        row = c.execute("SELECT street, zip, city FROM projects WHERE id=?", (i,)).fetchone()
    found = with_coords(d, dict(row) if row else {})
    if any(k in d for k in ADDR) and "extra" not in d:
        d["extra"] = {"addr_auto": None}      # von Hand geändert: nicht mehr "automatisch ermittelt"
    with db.tx() as c:
        if "leaders" in d:   # Bauleiter dürfen weitere Bauleiter eintragen oder ändern (Zugriff auf das Projekt prüft der Server vorab)
            d["leaders"] = access.clean(d["leaders"], c)
        db.update(c, "projects", i, d)
        if any(k in d for k in ADDR):   # Baustellenadresse steht auch in den Kontakten: dort mitführen
            pr = db.to_dict(c.execute("SELECT street, zip, city, extra FROM projects WHERE id=?", (i,)).fetchone())
            cid = (pr.get("extra") or {}).get("contact_id")
            if cid:
                db.update(c, "contacts", cid, {k: pr[k] for k in ADDR})
    return jsonify(ok=True, geocoded=found)


@bp.get("/api/projects/<int:i>/map.jpg")
def project_map(i):
    """Dieselbe abgeflachte Karte wie in der PDF-Kopfzeile (für die Anzeige im Bericht)."""
    with db.tx() as c:
        row = c.execute("SELECT lat, lon FROM projects WHERE id=?", (i,)).fetchone()
    img = staticmap.image(dict(row)) if row else None
    if not img:
        return Response(status=404)
    return Response(img, mimetype="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})


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
        pk = papierkorb.ablegen(c, "projects", i, "Bautagebuch-Projekt", r["name"], getattr(g, "user", None) and g.user["name"] or "", r["name"],
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
