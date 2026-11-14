"""Akquise – die App (besprochen am 14.11.2026, Entwurf „Akquise-App“, GO 09:45).

Anfragen ohne Projekt: links die Akquisen (bpNav) mit dem Dateibaum der gewählten, in der Mitte die Daten (Bauherr:in, Stand, Wiedervorlage,
Honorar), rechts Datei-Vorschau und „Umwandeln“ (seite.js). Daten und Regeln: bpcore/akquise.py; Dateien im Projektpfad unter „Akquise/“
gehen über das Bautagebuch (bautagebuch/modules/akquise.py). Sehen und bearbeiten: Recht „akquise“ (ab Werk Geschäftsführung) oder Verwaltung.

GET/POST /api/akquisen · PUT/DELETE /api/akquisen/<id> · POST /api/akquisen/<id>/archiv {an}
GET /api/akquisen/<id>/baum · GET/POST /api/akquisen/<id>/datei · POST …/ordner · POST …/umbenennen
GET /api/akquisen/<id>/umwandeln (Nummer, Ordner, Vorschläge) · POST /api/akquisen/<id>/umwandeln {nummer, name, zuordnung, honorar, kontakt}
Löschen legt in den Papierkorb (Rückgängig: /api/bp/papierkorb/<id>/zurueck).
"""
import base64
import time
import urllib.parse

from flask import Response, g, jsonify, redirect, request

from bpcore import akquise as AQ, db, honorar as H, papierkorb, platform, projekte, rechte
import common as C

app = C.make_app(__name__)
KEY = "akquise"


@app.before_request
def guard():
    p = request.path
    if p.startswith(("/static/", "/bp/")) or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base(KEY) + "/")), 401
        return redirect(C.login_url(request.url))
    if not (rechte.hat(u, "akquise") or rechte.hat(u, "verwaltung")):
        return C.gesperrt(KEY, "Die Akquise ist nur mit dem Recht „Akquise“ (ab Werk Geschäftsführung).")
    g.user = u


@app.get("/")
def index():
    return C.page("akquise.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


def _akquise(c, aid):
    r = c.execute("SELECT * FROM akquise WHERE id=?", (aid,)).fetchone()
    if not r:
        raise LookupError("Akquise nicht gefunden.")
    return dict(r)


def _pfad(a):
    return "/".join(AQ.pfad(a))


@app.get("/api/akquisen")
def liste():
    with db.tx() as c:
        offen = AQ.liste(c)
        archiv = c.execute("SELECT count(*) AS n FROM akquise WHERE project_id IS NULL AND archiviert=1").fetchone()["n"]
        lose = [dict(r) for r in c.execute("SELECT id, wofuer, kosten, zone, satz, nk, netto, erstellt, von FROM honorar_ueberschlag WHERE akquise_id IS NULL ORDER BY erstellt DESC").fetchall()]
        A = AQ.liste(c, archiv=True) if request.args.get("archiv") == "1" else []
    return jsonify(akquisen=offen, archiv=A, archiv_zahl=archiv, staende=AQ.STAENDE, ueberschlaege=lose)


@app.post("/api/akquisen")
def neu():
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        aid = AQ.anlegen(c, str(b.get("name") or "").strip(), C.full_name(g.user), **{k: v for k, v in b.items() if k != "name"})
        u = b.get("ueberschlag")   # aus einem abgelegten Überschlag
        if isinstance(u, int):
            c.execute("UPDATE honorar_ueberschlag SET akquise_id=? WHERE id=? AND akquise_id IS NULL", (aid, u))
        a = _akquise(c, aid)
    C.audit(g.user["name"], "akquise", "Akquise angelegt", a["name"])
    return jsonify(a)


@app.put("/api/akquisen/<int:aid>")
def aendern(aid):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        try:
            _akquise(c, aid)
        except LookupError as e:
            return jsonify(error=str(e)), 404
        AQ.aendern(c, aid, b)
        if "ueberschlag_dazu" in b:   # Überschlag an diese Akquise hängen (oder mit akquise=null wieder lösen)
            c.execute("UPDATE honorar_ueberschlag SET akquise_id=? WHERE id=?", (aid, int(b["ueberschlag_dazu"] or 0)))
        if "ueberschlag_weg" in b:
            c.execute("UPDATE honorar_ueberschlag SET akquise_id=NULL WHERE id=? AND akquise_id=?", (int(b["ueberschlag_weg"] or 0), aid))
        return jsonify(_akquise(c, aid))


@app.delete("/api/akquisen/<int:aid>")
def loeschen(aid):
    """In den Papierkorb – die Dateien unter „Akquise/“ bleiben liegen (Ordner wird beim Leeren nicht angefasst)."""
    with db.tx() as c:
        try:
            a = _akquise(c, aid)
        except LookupError as e:
            return jsonify(error=str(e)), 404
        pk = papierkorb.ablegen(c, "akquise", aid, "Akquise", a["name"], g.user["name"], "", KEY)
    C.audit(g.user["name"], "akquise", "Akquise gelöscht", a["name"])
    return jsonify(ok=True, papierkorb=pk)


@app.post("/api/akquisen/<int:aid>/archiv")
def archiv(aid):
    """Archivieren: Ordner nach „Akquise/_Archiv/“ (und zurück) – aus der Liste weg, unter „Archiv“ einsehbar."""
    an = 1 if (request.get_json(silent=True) or {}).get("an") else 0
    with db.tx() as c:
        a = _akquise(c, aid)
    if a["archiviert"] == an:
        return jsonify(a)
    von, nach = AQ.pfad(a), AQ.pfad({**a, "archiviert": an})
    try:
        C.bt_api("POST", "/api/akquise/verschieben", {"von": von, "nach": nach})
    except RuntimeError as e:
        if "nicht eingerichtet" not in str(e):
            return jsonify(error=str(e)), 502
    with db.tx() as c:
        c.execute("UPDATE akquise SET archiviert=?, geaendert=? WHERE id=?", (an, time.strftime("%Y-%m-%d %H:%M:%S"), aid))
        a = _akquise(c, aid)
    C.audit(g.user["name"], "akquise", "Akquise archiviert" if an else "Akquise zurückgeholt", a["name"])
    return jsonify(a)


# ---- Dateien (über das Bautagebuch)
def _bt(method, pfad, body=None, roh=False):
    try:
        return C.bt_api(method, pfad, body, roh)
    except RuntimeError as e:
        raise ValueError(str(e))


@app.get("/api/akquisen/<int:aid>/baum")
def baum(aid):
    with db.tx() as c:
        a = _akquise(c, aid)
    try:
        return jsonify(_bt("GET", "/api/akquise/baum?" + urllib.parse.urlencode({"pfad": _pfad(a)})))
    except ValueError as e:
        return jsonify(error=str(e), dateien=[], ordner=[]), 200   # ohne Ablage: Daten gehen trotzdem


@app.get("/api/akquisen/<int:aid>/datei")
def datei(aid):
    with db.tx() as c:
        a = _akquise(c, aid)
    rel = request.args.get("rel") or ""
    try:
        daten = _bt("GET", "/api/akquise/datei?" + urllib.parse.urlencode({"pfad": _pfad(a), "rel": rel}), roh=True)
    except ValueError as e:
        return jsonify(error=str(e)), 502
    import mimetypes
    name = rel.rsplit("/", 1)[-1]
    return Response(daten, mimetype=mimetypes.guess_type(name)[0] or "application/octet-stream",
                    headers={"Content-Disposition": f"inline; filename*=UTF-8''{urllib.parse.quote(name)}", "Cache-Control": "no-store"})


@app.post("/api/akquisen/<int:aid>/datei")
def hochladen(aid):
    f = request.files.get("datei")
    if not f:
        return jsonify(error="Keine Datei."), 400
    with db.tx() as c:
        a = _akquise(c, aid)
    try:
        r = _bt("POST", "/api/akquise/datei", {"pfad": _pfad(a), "ordner": request.form.get("ordner") or "", "name": f.filename or "Datei",
                                               "datei": base64.b64encode(f.read(80 * 1024 * 1024)).decode()})
    except ValueError as e:
        return jsonify(error=str(e)), 502
    with db.tx() as c:
        c.execute("UPDATE akquise SET geaendert=? WHERE id=?", (time.strftime("%Y-%m-%d %H:%M:%S"), aid))
    return jsonify(r)


@app.post("/api/akquisen/<int:aid>/ordner")
def ordner(aid):
    with db.tx() as c:
        a = _akquise(c, aid)
    try:
        return jsonify(_bt("POST", "/api/akquise/ordner", {"pfad": _pfad(a), "rel": (request.get_json(silent=True) or {}).get("rel") or ""}))
    except ValueError as e:
        return jsonify(error=str(e)), 502


@app.post("/api/akquisen/<int:aid>/umbenennen")
def umbenennen(aid):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        a = _akquise(c, aid)
    try:
        return jsonify(_bt("POST", "/api/akquise/umbenennen", {"pfad": _pfad(a), "rel": b.get("rel") or "", "neu": b.get("neu") or ""}))
    except ValueError as e:
        return jsonify(error=str(e)), 400


# ---- Umwandeln in ein echtes Projekt
@app.get("/api/akquisen/<int:aid>/umwandeln")
def umwandeln_vorschlag(aid):
    """Vorschlag: nächste freie Projektnummer (nachgefragt), Ordner der Vorlage, je Datei der Zielordner."""
    with db.tx() as c:
        a = _akquise(c, aid)
    code = (request.args.get("nummer") or "").strip()
    if not code:   # erst die Nummer aus den Projekten, damit die Ordner gleich mit dem richtigen Kürzel heißen
        with db.tx() as c:
            code = AQ.naechste_nummer(c) or "A000"
    try:
        v = _bt("GET", "/api/akquise/vorlage?" + urllib.parse.urlencode({"pfad": _pfad(a), "code": code}))
        hinweis = v.get("hinweis") or ""
    except ValueError as e:
        v, hinweis = {"ordner": [], "dateien": [], "basis": []}, str(e)
    with db.tx() as c:
        nr = (request.args.get("nummer") or "").strip() or AQ.naechste_nummer(c, v.get("basis") or [])
    return jsonify(nummer=nr, ordner=v.get("ordner") or [], dateien=v.get("dateien") or [], lph0=v.get("lph0") or "", hinweis=hinweis,
                   testserver=bool(v.get("testserver")))


@app.post("/api/akquisen/<int:aid>/umwandeln")
def umwandeln(aid):
    """Projekt anlegen (Nummer + Name), Überschläge werden Honoraraufträge (Stand Angebot), Ordner wandert in den Projektpfad."""
    b = request.get_json(silent=True) or {}
    nummer = " ".join(str(b.get("nummer") or "").split())[:30]
    name = " ".join(str(b.get("name") or "").split())[:200]
    if not nummer or not AQ.CODE.match(nummer):
        return jsonify(error="Bitte eine Projektnummer eintragen (z. B. A562 oder A450.23)."), 400
    with db.tx() as c:
        a = _akquise(c, aid)
        if a["project_id"]:
            return jsonify(error="Schon umgewandelt."), 400
        if c.execute("SELECT 1 FROM projects WHERE split_part(name, ' ', 1) = ?", (nummer,)).fetchone():
            return jsonify(error=f"Die Nummer {nummer} gibt es schon."), 400
    teile = (a["adresse"] or "").rsplit(",", 1)
    strasse, ort = (teile[0].strip(), teile[1].strip()) if len(teile) == 2 else ("", a["adresse"] or "")
    plz = ort.split(" ", 1)[0] if ort[:5].isdigit() else ""
    pid, _, _ = projekte.anlegen({"name": f"{nummer} {name or a['name']}".strip(), "client": a["bauherr"], "street": strasse,
                                  "zip": plz, "city": ort[len(plz):].strip() if plz else ort, "leaders": [g.user["id"]] if b.get("nur_ich") else [],
                                  "extra": {"akquise_id": aid}})
    with db.tx() as c:
        n_ho = 0
        if b.get("honorar", True):
            for u in c.execute("SELECT * FROM honorar_ueberschlag WHERE akquise_id=?", (aid,)).fetchall():
                H.auftrag_anlegen(c, pid, "Architektenleistungen LPh 1–9", g.user["name"], nk=u["nk"], kosten=u["kosten"],
                                  kosten_info=f"aus dem Überschlag vom {u['erstellt'][8:10]}.{u['erstellt'][5:7]}.{u['erstellt'][:4]} ({u['von']})",
                                  zone=u["zone"], satz=u["satz"], umbau=u["umbau"])
                c.execute("DELETE FROM honorar_ueberschlag WHERE id=?", (u["id"],))
                n_ho += 1
        c.execute("UPDATE akquise SET project_id=?, stand='zusage', geaendert=? WHERE id=?", (pid, time.strftime("%Y-%m-%d %H:%M:%S"), aid))
    ablage, fehler = None, []
    try:
        ablage = _bt("POST", "/api/akquise/umwandeln", {"pfad": _pfad(a), "project_id": pid, "zuordnung": b.get("zuordnung") or []})
        fehler = ablage.get("fehler") or []
    except ValueError as e:
        fehler = [str(e)]
    C.audit(g.user["name"], "akquise", "Akquise in Projekt umgewandelt", f"{a['name']} → {nummer} {name or a['name']}")
    return jsonify(ok=True, project_id=pid, honorar=n_ho, dateien=(ablage or {}).get("dateien", 0), pfad=(ablage or {}).get("pfad", ""), fehler=fehler)
