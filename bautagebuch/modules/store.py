"""Ablage auf dem Server: Verbindungstest, Status, manuelles Senden, nachträgliche Übertragung."""
from flask import Blueprint, g, jsonify, request
from core import access, db, remote, scheme, settings, sync

bp = Blueprint("store", __name__)


@bp.get("/api/store/status")
def status():
    pid, date = request.args.get("project_id", type=int), request.args.get("date", "")
    out = sync.status()
    with db.tx() as c:
        conf = settings.all(c)
        p = c.execute("SELECT id, name, folder FROM projects WHERE id=?", (pid,)).fetchone() if pid else None
        if p and not access.can_see(c, g.user, p["id"]):   # fremde Projekte: wie nicht vorhanden
            p = None
    out["enabled"] = sync.enabled(conf)
    if p and date:
        shown = f"[Ordner „{sync.code_of(p)} …“]"
        out["photos"] = sync.render(conf.get("store_tpl_photos") or sync.DEFAULT_PHOTOS, p, date, late=True).replace("{projekt}", shown)
        out["pdf"] = sync.render(conf.get("store_tpl_pdf") or sync.DEFAULT_PDF, p, date, late=True).replace("{projekt}", shown)
    return jsonify(out)


@bp.get("/api/store/names")
def names():
    """Im Projekt geltende Namenskonventionen (Beispiele für PDF-Datei, PDF-Ordner, Fototag-Ordner) – braucht keine Serververbindung."""
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        conf = settings.all(c)
        p = c.execute("SELECT id, name, folder FROM projects WHERE id=?", (pid,)).fetchone() if pid else None
        if p and not access.can_see(c, g.user, p["id"]):   # fremde Projekte: wie nicht vorhanden
            p = None
        rep = c.execute("SELECT date, number FROM reports WHERE project_id=? ORDER BY date DESC, number DESC LIMIT 1", (pid,)).fetchone() if p else None
    if not p:
        return jsonify({})
    date, nr = (rep["date"], rep["number"]) if rep else (db.now()[:10], 1)
    code = sync.code_of(p)
    sch = scheme.load(conf, pid)
    on = sch.get("state") == "on"
    shown = f"[Projektordner „{code} …“]" if not p["folder"] else p["folder"]
    pdf_name = scheme.pdf_name(conf, dict(p), {"date": date, "number": nr}, f"{code}_BT_{date}.pdf")
    photo_dir = scheme.dir_label(conf, pid, scheme.code_of(p), date, f"{date} Gewerke - Fotobeschreibung")
    return jsonify(
        scheme=on, pdf_name=pdf_name, photo_name=photo_dir,
        pdf_dir=sync.render(conf.get("store_tpl_pdf") or sync.DEFAULT_PDF, p, date, late=True).replace("{projekt}", shown),
        photo_dir=sync.render(conf.get("store_tpl_photos") or sync.DEFAULT_PHOTOS, p, date, late=True, label="{Tagesordner}").replace("{projekt}", shown),
        pdf_tpl=sch.get("pdf") if on else "", dir_tpl=sch.get("dir") if on else "", date=date)


@bp.get("/api/store/folders")
def folders():
    """Vorschläge für den Projektnamen: Ordner auf dem Server, die zur Eingabe passen und noch kein Projekt sind."""
    q = request.args.get("q", "").strip().lower()
    with db.tx() as c:
        conf = settings.all(c)
        used = {r[0].lower() for r in c.execute("SELECT name FROM projects")}
    if not q or not sync.enabled(conf):
        return jsonify([])
    names = [d for d in sync.suggest_projects(conf, q) if d.lower() not in used]
    words = q.split()   # jedes Wort muss irgendwo im Ordnernamen vorkommen: „a450.22 auf dem holte“
    match = [d for d in names if all(w in d.lower() for w in words)]
    hits = [d for d in match if d.lower().startswith(q)] + [d for d in match if not d.lower().startswith(q)]
    if request.args.get("pfad"):   # für das Feld „Projektordner“: Unterprojekte mit Hauptordner („A450 Haupt/A450.22 Unter“)
        return jsonify([sync.pfad(d) for d in hits[:30]])
    return jsonify(hits[:30])


@bp.post("/api/store/test")
def test():
    with db.tx() as c:
        conf = settings.all(c)
    try:
        t = remote.open_target(conf)
        if not t:
            return jsonify(ok=False, error="Die Ablage ist ausgeschaltet."), 400
        t.test()
    except ImportError:
        return jsonify(ok=False, error="Das Paket für Windows-Freigaben (smbprotocol) fehlt im Container."), 500
    except Exception as e:
        return jsonify(ok=False, error=sync._msg(e)), 502
    return jsonify(ok=True)


@bp.post("/api/store/run")
def run():
    sync.retry_now()
    sent, left, err = sync.run_once()
    return jsonify(sent=sent, pending=left, error=err)


@bp.route("/api/store/alte", methods=["GET", "POST"])
def alte():
    """Alte Stände (…_old1) auf dem Server: GET zählt, POST räumt nach den Einstellungen auf."""
    with db.tx() as c:
        conf = settings.all(c)
        if not sync.enabled(conf):
            return jsonify(error="Die Ablage ist ausgeschaltet."), 400
        P = c.execute("SELECT id, name, folder FROM projects ORDER BY name").fetchall()
        D = {}
        for r in c.execute("SELECT DISTINCT project_id, date FROM reports").fetchall():
            D.setdefault(r["project_id"], []).append(r["date"])
    try:
        from core import aufraeumen
        return jsonify(**sync.alte_staende(conf, [(p, D.get(p["id"], [])) for p in P if D.get(p["id"])], request.method == "POST"),
                       nacht=aufraeumen.letzter(), nacht_an=aufraeumen.an(conf))
    except Exception as e:
        return jsonify(error=sync._msg(e)), 502


@bp.post("/api/store/backfill")
def backfill():
    """Alle bereits vorhandenen Fotos in die Warteschlange stellen (z. B. nach dem Einrichten)."""
    n = 0
    with db.tx() as c:
        conf = settings.all(c)
        if not sync.enabled(conf):
            return jsonify(error="Die Ablage ist ausgeschaltet."), 400
        for r in c.execute("SELECT id FROM images ORDER BY id").fetchall():
            n += bool(sync.enqueue_image(c, conf, r["id"]))
    sync.wake()
    return jsonify(queued=n)


@bp.get("/api/store/rename-check")
def rename_check():
    """Wurden abgelegte PDFs/Fotoordner von Hand umbenannt? Dann Angebot zum automatischen Umbenennen (Rückfrage im Bericht)."""
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        if not pid or not access.can_see(c, g.user, pid):
            return jsonify({})
    try:
        offer = scheme.check(pid)
    except Exception:
        return jsonify({})   # Server nicht erreichbar o. ä.: keine Rückfrage
    if not offer:
        return jsonify({})
    return jsonify(pdf=offer["pdf"], dir=offer["dir"], count=len(offer["items"]), example_pdf=offer["example_pdf"], example_dir=offer["example_dir"],
                   examples=[{"from": i["from"], "to": i["to"]} for i in offer["items"][:3]])


@bp.post("/api/store/rename-apply")
def rename_apply():
    d = request.json or {}
    pid = d.get("project_id")
    with db.tx() as c:
        if not isinstance(pid, int) or not access.can_see(c, g.user, pid):
            return jsonify(error="Projekt nicht gefunden."), 404
    try:
        n = scheme.apply(pid, bool(d.get("accept")))
    except Exception as e:
        return jsonify(error="Umbenennen nicht möglich: " + str(e)[:200]), 502
    return jsonify(ok=True, renamed=n)
