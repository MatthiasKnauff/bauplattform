"""Pläne im Projektordner auf dem Server (für die App „Pläne & Dateien“ der Bauplattform).

GET /api/plaene/dateien?project_id=&aus=[…]   Plan- und CAD-Dateien im ganzen Projektordner (rekursiv) und der Verzeichnisbaum
GET /api/plaene/datei?project_id=&pfad=       eine Datei (zum Ansehen und als Mail-Anhang)
Pfade sind relativ zum Projektordner; „..“ und Laufwerksangaben werden verworfen.
"""
import io, mimetypes, re, time
from flask import Blueprint, g, jsonify, request, send_file
from core import access, db, remote, settings, sync
from bpcore import fehler   # stille Fehler für die Verwaltung festhalten

bp = Blueprint("plaene", __name__)
EXT = {".pdf", ".dwg", ".dxf", ".dwf", ".pln", ".plt", ".ifc"}
PLAN_DIR = re.compile(r"plan|pläne|plaene|zeichnung|cad|dwg|werkpl|entwurf|genehmigung|ausf", re.I)
TOP_PLAN = re.compile(r"pl(ä|ae)ne|zeichnungen|\bcad\b", re.I)
SKIP_DIR = re.compile(r"foto|photo|bautagebuch|papierkorb|\$recycle", re.I)
MAX_FILES, MAX_SEC = 8000, 90


def _ziel(pid):
    with db.tx() as c:
        if not access.can_see(c, g.user, pid):
            return None, None, "Kein Zugriff auf dieses Projekt."
        conf = settings.all(c)
        p = c.execute("SELECT id, name, folder FROM projects WHERE id=?", (pid,)).fetchone()
    if not p:
        return None, None, "Projekt nicht gefunden."
    if not sync.enabled(conf):
        return None, None, "Die Ablage auf dem Server ist nicht eingerichtet (Verwaltung → Einstellungen → Ablage)."
    try:
        t = remote.open_target(conf)
    except ImportError:
        return None, None, "Das Paket für Windows-Freigaben (smbprotocol) fehlt im Container."
    except Exception as e:   # Meldung geht an den Aufrufer und wird angezeigt
        return None, None, sync._msg(e)
    parts = remote.clean_path(p["folder"] or "") or remote.find_project_path(t, sync.code_of(p), remote.clean(p["name"]) or "Projekt")
    return t, parts, ""


def _walk(t, base, rel, depth, out, dirs, aus, t0):
    """Alle Unterordner durchgehen (außer ausgeschlossenen); dirs sammelt den Verzeichnisbaum mit Zahl der Plan-/CAD-Dateien."""
    key = "/".join(rel)
    if rel:
        dirs[key] = {"pfad": key, "n": 0, "aus": key in aus}
        if key in aus:
            return
    if depth < 0 or len(out) >= MAX_FILES or time.time() - t0 > MAX_SEC:
        if rel:
            dirs[key]["abgebrochen"] = True
        return
    for e in sorted(t.listdir("/".join(base + rel)), key=lambda x: x["name"].lower()):
        if e["dir"]:
            if not e["name"].startswith((".", "~", "$")):
                _walk(t, base, rel + [e["name"]], depth - 1, out, dirs, aus, t0)
        else:
            n = e["name"]
            ext = ("." + n.rsplit(".", 1)[-1].lower()) if "." in n else ""
            if ext in EXT and not n.startswith("~$"):
                out.append({"pfad": "/".join(rel + [n]), "name": n, "ordner": key, "groesse": e["size"], "mtime": e["mtime"]})
                if rel:
                    dirs[key]["n"] += 1


def _ziel_conf(pid):
    """Wie _ziel, aber ohne Benutzer (für das nächtliche Vorab-Einlesen)."""
    with db.tx() as c:
        conf = settings.all(c)
        p = c.execute("SELECT id, name, folder FROM projects WHERE id=?", (pid,)).fetchone()
    if not p or not sync.enabled(conf):
        return None, None
    t = remote.open_target(conf)
    parts = remote.clean_path(p["folder"] or "") or remote.find_project_path(t, sync.code_of(p), remote.clean(p["name"]) or "Projekt")
    return t, parts


def scan(t, base, aus_in):
    """Projektordner durchsuchen. aus_in: Liste ausgeschlossener Ordner oder None (= Vorgabe: nur der Planordner)."""
    if not t.exists("/".join(base)):
        return {"error": f"Projektordner „{'/'.join(base)}“ nicht gefunden – im Bautagebuch beim Projekt den Ordner eintragen.", "status": 404}
    standard = aus_in is None
    aus = {"/".join(remote.clean_path(x)) for x in (aus_in or []) if isinstance(x, str)}
    out, dirs, t0 = [], {}, time.time()
    if standard:   # Vorgabe: nur der Planordner („A497 9. Pläne“) – gibt es keinen, alles außer Foto-/Bautagebuch-Ordnern
        top = [e["name"] for e in t.listdir("/".join(base)) if e["dir"]]
        plan = [d for d in top if TOP_PLAN.search(d)]
        aus |= {d for d in top if d not in plan} if plan else {d for d in top if SKIP_DIR.search(d)}
    _walk(t, base, [], 9, out, dirs, aus, t0)
    return {"basis": "/".join(base), "aus": sorted(aus), "standard": standard, "ordner": list(dirs.values()), "dateien": out,
            "abgebrochen": len(out) >= MAX_FILES or time.time() - t0 > MAX_SEC}


# ---- Zwischenspeicher: Ergebnis je Projekt in bp_store „planscan:<id>“; gilt bis zum nächsten Tag oder bis „Neu einlesen“
def _ckey(aus_in):
    import json
    return json.dumps(sorted(aus_in) if isinstance(aus_in, list) else None)


def cache_get(pid, aus_in):
    import json
    from datetime import date
    with db.tx() as c:
        r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"planscan:{pid}",)).fetchone()
    try:
        v = json.loads(r["data"]) if r else None
    except ValueError:
        v = None
    if v and v.get("aus") == _ckey(aus_in) and str(v.get("zeit", "")).startswith(date.today().isoformat()):
        return v
    return None


def cache_put(pid, aus_in, res):
    import json
    from datetime import datetime
    z = datetime.now().isoformat(timespec="seconds")
    with db.tx() as c:
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated",
                  (f"planscan:{pid}", json.dumps({"zeit": z, "aus": _ckey(aus_in), "res": res}), z, "planstand"))
    return z


@bp.get("/api/plaene/dateien")
def dateien():
    """Ganzen Projektordner durchsuchen. aus = JSON-Liste ausgeschlossener Ordner (relativ); fehlt sie, bleiben Foto- und
    Bautagebuch-Ordner außen vor (lassen sich im Verzeichnisbaum einschließen). Ergebnis vom selben Tag kommt aus dem
    Zwischenspeicher (nachts für alle laufenden Projekte vorab eingelesen); neu=1 liest den Ordner jetzt neu."""
    import json
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        if not access.can_see(c, g.user, pid):
            return jsonify(error="Kein Zugriff auf dieses Projekt."), 400
    try:
        aus_in = json.loads(request.args.get("aus")) if request.args.get("aus") else None
    except ValueError:
        aus_in = None
    if request.args.get("neu") != "1":
        v = cache_get(pid, aus_in)
        if v:
            return jsonify(**v["res"], stand=v["zeit"], zwischengespeichert=True)
    t, base, err = _ziel(pid)
    if err:
        return jsonify(error=err), 400
    try:
        res = scan(t, base, aus_in)
    except Exception as e:
        return jsonify(error=sync._msg(e)), 502
    if res.get("error"):
        return jsonify(error=res["error"]), res.get("status", 400)
    z = cache_put(pid, aus_in, res) if not res["abgebrochen"] else ""
    return jsonify(**res, stand=z, zwischengespeichert=False)


def vorab_einlesen():
    """Einmal am Tag (nachts): Projektordner aller laufenden Projekte vorab einlesen, damit die Planliste sofort da ist."""
    import json
    with db.tx() as c:
        if not c.execute("SELECT pg_try_advisory_xact_lock(hashtext('planscan:nacht')) AS ok").fetchone()["ok"]:
            return 0
        ids = [r["id"] for r in c.execute("SELECT id FROM projects WHERE archived=0 ORDER BY id")]
        auss = {}
        for pid in ids:
            r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"plaene:{pid}",)).fetchone()
            try:
                auss[pid] = (json.loads(r["data"]) if r else {}).get("aus")
            except ValueError:
                auss[pid] = None
    n = 0
    for pid in ids:
        if cache_get(pid, auss[pid]):
            continue
        try:
            t, base = _ziel_conf(pid)
            if not t:
                continue
            res = scan(t, base, auss[pid])
            if not res.get("error") and not res["abgebrochen"]:
                cache_put(pid, auss[pid], res); n += 1
        except Exception as e:
            fehler.still("bautagebuch", "Pläne vorab einlesen", e)
            continue
    return n


_started = False


def start(stunde=3):
    """Hintergrund: täglich ab 3 Uhr die Planordner vorab einlesen."""
    import threading
    from datetime import datetime
    global _started
    if _started:
        return
    _started = True

    def loop():
        done = ""
        while True:
            time.sleep(600)
            now = datetime.now()
            if now.hour >= stunde and done != now.date().isoformat():
                try:
                    vorab_einlesen()
                except Exception as e:
                    fehler.still("bautagebuch", "Pläne vorab einlesen (Hintergrund)", e)
                    pass
                done = now.date().isoformat()
    threading.Thread(target=loop, daemon=True, name="planscan").start()


@bp.get("/api/plaene/datei")
def datei():
    pid = request.args.get("project_id", type=int)
    rel = remote.clean_path(request.args.get("pfad") or "")
    if not rel or ("." + rel[-1].rsplit(".", 1)[-1].lower()) not in EXT:
        return jsonify(error="Ungültige Datei"), 400
    t, base, err = _ziel(pid)
    if err:
        return jsonify(error=err), 400
    try:
        data = t.read("/".join(base + rel), 200 * 1024 * 1024)
    except Exception as e:
        return jsonify(error="Datei nicht lesbar: " + sync._msg(e)), 404
    mt = mimetypes.guess_type(rel[-1])[0] or "application/octet-stream"
    return send_file(io.BytesIO(data), mimetype=mt, download_name=rel[-1], as_attachment=request.args.get("dl") == "1")
