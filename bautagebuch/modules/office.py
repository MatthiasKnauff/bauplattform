"""Office im Browser – Dateien für den Editor (Collabora Online im Container „office“) bereitstellen und speichern (17.11.2026, P1 Q1 R1).

WOPI – vom Editor im Docker-Netz aufgerufen, ohne Anmeldung, nur mit dem Schlüssel aus bpcore/office.py (eine Datei, eine Person, Zeit):
  GET  /wopi/files/<fid>             Angaben zur Datei (Name, Größe, Stand, darf schreiben)
  GET  /wopi/files/<fid>/contents    die Datei
  POST /wopi/files/<fid>/contents    speichern (X-WOPI-Override: PUT) – beim ersten Speichern einer Sitzung kommt die vorige Fassung
                                     nach „<Ordner>/_Fassungen/<Name>/<Zeit> <Person>.<Endung>“ (R1, zurückholbar)
Mit Anmeldung (Pläne & Dateien über bpcore.ablage.bt_json):
  POST /api/office/neu {project_id, ordner, name, art: docx|xlsx, vorlage}   leere Datei oder Kopie einer Büro-Vorlage anlegen (nie überschreiben)
  GET  /api/office/vorlagen          Büro-Vorlagen (Ordner aus den Einstellungen von Pläne & Dateien, Vorgabe „Büro/Vorlagen“)
  GET  /api/office/fassungen?project_id=&pfad=        frühere Fassungen
  POST /api/office/zurueckholen {project_id, pfad, fassung}   Fassung zurückholen (der Stand davor wird selbst eine Fassung)
Testserver (remote.NUR_LESEN): nur ansehen – der Editor bekommt „darf nicht schreiben“.
"""
import json
from datetime import datetime, timedelta, timezone

from flask import Blueprint, Response, g, jsonify, request

from core import audit, db, remote, settings, sync
from bpcore import ablage_einst, office as O
from modules.plaene import _ziel, _ziel_conf

bp = Blueprint("office", __name__)
FASS = "_Fassungen"
MAX = 300 * 1024 * 1024


def _zeit(m):
    return datetime.fromtimestamp(float(m or 0), timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def _datei(f):
    """Schlüssel prüfen → (Inhalt des Schlüssels, Ziel, Teile des Pfads im Projektordner) oder Fehlerantwort."""
    with db.tx() as c:
        d = O.pruefen(c, request.args.get("access_token") or "", f)
    if not d:
        return None, Response(status=401)
    pid, pfad = O.aus_fid(f)
    rel = remote.clean_path(pfad or "")
    if not pid or not rel:
        return None, Response(status=404)
    t, base = _ziel_conf(pid)
    if not t:
        return None, Response(status=404)
    return (d, t, base, rel, pid), None


def _eintrag(t, base, rel):
    return next((e for e in t.listdir("/".join(base + rel[:-1])) if e["name"] == rel[-1] and not e["dir"]), None)


@bp.get("/wopi/files/<f>")
def wopi_info(f):
    x, fehl = _datei(f)
    if fehl:
        return fehl
    d, t, base, rel, _ = x
    e = _eintrag(t, base, rel)
    if not e:
        return Response(status=404)
    w = bool(d.get("w")) and not remote.NUR_LESEN
    return jsonify(BaseFileName=rel[-1], Size=int(e["size"] or 0), Version=f"{int(e['size'] or 0)}-{e['mtime']}", OwnerId="bauplattform",
                   UserId=str(d.get("u")), UserFriendlyName=d.get("n") or "", UserCanWrite=w, ReadOnly=not w, UserCanNotWriteRelative=True,
                   UserCanRename=False, SupportsUpdate=True, SupportsLocks=False, SupportsRename=False, LastModifiedTime=_zeit(e["mtime"]),
                   PostMessageOrigin=d.get("o") or "", DisablePrint=False, HideSaveOption=False, EnableShare=False)


@bp.get("/wopi/files/<f>/contents")
def wopi_holen(f):
    x, fehl = _datei(f)
    if fehl:
        return fehl
    _, t, base, rel, _ = x
    try:
        data = t.read("/".join(base + rel), MAX)
    except Exception:   # noqa: BLE001 – Datei weg oder Dateiserver nicht erreichbar
        return Response(status=404)
    return Response(data, mimetype="application/octet-stream")


def _fassung_ziel(rel, wer, zusatz=""):
    stamm = rel[-1].rsplit(".", 1)[0] if "." in rel[-1] else rel[-1]
    return rel[:-1] + [FASS, remote.clean(stamm) or "Datei", f"{datetime.now():%Y-%m-%d %H-%M-%S} {remote.clean(wer) or 'Person'}{zusatz}.{O.endung(rel[-1]) or 'bin'}"]


@bp.post("/wopi/files/<f>/contents")
def wopi_speichern(f):
    x, fehl = _datei(f)
    if fehl:
        return fehl
    d, t, base, rel, pid = x
    if request.headers.get("X-WOPI-Override", "PUT") != "PUT":
        return Response(status=501)
    if not d.get("w") or remote.NUR_LESEN:
        return Response(status=401)
    data = request.get_data(cache=False)
    if len(data) > MAX:
        return Response(status=413)
    e = _eintrag(t, base, rel)
    stand = request.headers.get("X-COOL-WOPI-Timestamp") or request.headers.get("X-LOOL-WOPI-Timestamp")
    if e and stand and stand != _zeit(e["mtime"]):   # jemand hat die Datei inzwischen auf dem Server geändert – der Editor fragt nach
        return Response(json.dumps({"COOLStatusCode": 1010, "LOOLStatusCode": 1010}), status=409, mimetype="application/json")
    erst = False
    with db.tx() as c:   # erstes Speichern dieser Sitzung? (je Öffnen eine Fassung, nicht je automatischem Speichern)
        k = f"office:sitzung:{d.get('s')}"
        if not c.execute("SELECT 1 FROM bp_store WHERE key=?", (k,)).fetchone():
            erst = True
            jetzt = datetime.now().isoformat(timespec="seconds")
            c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO NOTHING", (k, "1", jetzt, "office"))
            c.execute("DELETE FROM bp_store WHERE key LIKE 'office:sitzung:%' AND updated < ?", ((datetime.now() - timedelta(days=3)).isoformat(timespec="seconds"),))
    try:
        if erst and e:
            t.put_bytes(t.read("/".join(base + rel), MAX), "/".join(base + _fassung_ziel(rel, d.get("n") or "")))
        t.put_bytes(data, "/".join(base + rel))
    except Exception as ex:   # noqa: BLE001
        return Response(json.dumps({"error": sync._msg(ex)}), status=500, mimetype="application/json")
    e = _eintrag(t, base, rel) or {"size": len(data), "mtime": datetime.now().timestamp()}
    with db.tx() as c:
        _liste(c, pid, "/".join(rel), int(e["size"] or 0), float(e["mtime"] or 0))
        if erst:
            p = c.execute("SELECT id, name FROM projects WHERE id=?", (pid,)).fetchone()
            audit.log(c, d.get("n") or "", "export", "Office-Datei bearbeitet", "/".join(rel), pid, p["name"] if p else "", "")
    return jsonify(LastModifiedTime=_zeit(e["mtime"]))


@bp.post("/wopi/files/<f>")
def wopi_sonst(f):   # Sperren, Umbenennen, „Speichern unter“: nicht angeboten
    return Response(status=501)


def _liste(c, pid, pfad, groesse, mtime):
    """Gespeicherte Liste „Alle Dateien“ nachführen (Größe, Stand; neue Datei dazu)."""
    from bpcore import vorschau as V
    s = V.scan_laden(c, pid)
    if not s or not isinstance(s.get("res"), dict):
        return
    L = [x for x in s["res"].get("dateien") or [] if x[0] != pfad] + [[pfad, groesse, round(mtime, 1)]]
    s["res"]["dateien"] = L
    c.execute("UPDATE bp_store SET data=? WHERE key=?", (json.dumps(s, ensure_ascii=False), f"allescan:{pid}"))


# ---------------------------------------------------------------- mit Anmeldung
def _vorlagen_ordner(conf):
    v = ablage_einst.wert(conf, "ordner_vorlagen") or "Büro/Vorlagen"
    return remote.clean_path(v)


def _vorlagen(t, conf):
    o = _vorlagen_ordner(conf)
    return o, sorted((e for e in t.listdir("/".join(o)) if not e["dir"] and O.bearbeitbar(e["name"]) and not e["name"].startswith(("~", "."))),
                     key=lambda e: e["name"].lower())


@bp.get("/api/office/vorlagen")
def vorlagen():
    with db.tx() as c:
        conf = settings.all(c)
    try:
        t = remote.open_target(conf)
        if not t:
            return jsonify(vorlagen=[], ordner="")
        o, L = _vorlagen(t, conf)
    except Exception as e:   # noqa: BLE001
        return jsonify(error="Ablage nicht erreichbar: " + sync._msg(e)), 502
    return jsonify(ordner="/".join(o), vorlagen=[{"name": e["name"], "art": O.ENDUNGEN.get(O.endung(e["name"]), "")} for e in L])


@bp.post("/api/office/neu")
def neu():
    b = request.get_json(silent=True) or {}
    pid = b.get("project_id")
    if not isinstance(pid, int):
        return jsonify(error="Projekt fehlt"), 400
    t, base, err = _ziel(pid)
    if err:
        return jsonify(error=err), 400
    ordner = remote.clean_path(b.get("ordner") or "")
    if ordner[:1] in (["_Papierkorb"], [FASS]):
        return jsonify(error="Bitte einen normalen Ordner wählen."), 400
    try:
        if b.get("vorlage"):
            with db.tx() as c:
                conf = settings.all(c)
            o, L = _vorlagen(remote.open_target(conf), conf)
            v = next((e for e in L if e["name"] == b["vorlage"]), None)
            if not v:
                return jsonify(error="Diese Vorlage gibt es nicht mehr."), 404
            data, ext = remote.open_target(conf).read("/".join(o + [v["name"]]), MAX), O.endung(v["name"])
        else:
            ext = b.get("art") if b.get("art") in O.NEU else "docx"
            data = O.leer(ext)
        name = remote.clean(b.get("name") or "") or ("Neues " + O.NEU.get(ext, "Dokument"))
        if O.endung(name) != ext:
            name += "." + ext
        stamm, n, ziel = name.rsplit(".", 1)[0], 1, name
        while _eintrag(t, base, ordner + [ziel]) and n < 100:
            n += 1
            ziel = f"{stamm} ({n}).{ext}"
        t.put_bytes(data, "/".join(base + ordner + [ziel]))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except Exception as e:   # noqa: BLE001
        return jsonify(error="Ablage nicht erreichbar: " + sync._msg(e)), 502
    pfad = "/".join(ordner + [ziel])
    if not remote.NUR_LESEN:
        with db.tx() as c:
            _liste(c, pid, pfad, len(data), datetime.now().timestamp())
            p = c.execute("SELECT id, name FROM projects WHERE id=?", (pid,)).fetchone()
            audit.log(c, g.user["name"], "export", "Office-Datei angelegt", pfad, pid, p["name"] if p else "", "")
    return jsonify(ok=True, pfad=pfad, testserver=remote.NUR_LESEN)


def _fass_ordner(rel):
    stamm = rel[-1].rsplit(".", 1)[0] if "." in rel[-1] else rel[-1]
    return rel[:-1] + [FASS, remote.clean(stamm) or "Datei"]


@bp.get("/api/office/fassungen")
def fassungen():
    pid = request.args.get("project_id", type=int)
    rel = remote.clean_path(request.args.get("pfad") or "")
    t, base, err = _ziel(pid)
    if err or not rel:
        return jsonify(error=err or "Datei fehlt"), 400
    try:
        L = [e for e in t.listdir("/".join(base + _fass_ordner(rel))) if not e["dir"] and O.endung(e["name"]) == O.endung(rel[-1])]
    except Exception as e:   # noqa: BLE001
        return jsonify(error="Ablage nicht erreichbar: " + sync._msg(e)), 502
    return jsonify(fassungen=[{"name": e["name"], "groesse": e["size"], "mtime": e["mtime"]} for e in sorted(L, key=lambda e: e["name"], reverse=True)[:50]])


@bp.post("/api/office/zurueckholen")
def zurueckholen():
    b = request.get_json(silent=True) or {}
    pid = b.get("project_id")
    rel = remote.clean_path(b.get("pfad") or "")
    t, base, err = _ziel(pid) if isinstance(pid, int) else (None, None, "Projekt fehlt")
    if err or not rel:
        return jsonify(error=err or "Datei fehlt"), 400
    q = _fass_ordner(rel) + [remote.clean(b.get("fassung") or "")]
    try:
        alt = t.read("/".join(base + q), MAX)
        if _eintrag(t, base, rel):   # der Stand davor wird selbst eine Fassung – so lässt sich auch das zurücknehmen
            t.put_bytes(t.read("/".join(base + rel), MAX), "/".join(base + _fassung_ziel(rel, g.user["name"], " vor Zurückholen")))
        t.put_bytes(alt, "/".join(base + rel))
    except Exception as e:   # noqa: BLE001
        return jsonify(error="Ablage nicht erreichbar: " + sync._msg(e)), 502
    if not remote.NUR_LESEN:
        e = _eintrag(t, base, rel) or {"size": len(alt), "mtime": datetime.now().timestamp()}
        with db.tx() as c:
            _liste(c, pid, "/".join(rel), int(e["size"] or 0), float(e["mtime"] or 0))
            p = c.execute("SELECT id, name FROM projects WHERE id=?", (pid,)).fetchone()
            audit.log(c, g.user["name"], "export", "Fassung zurückgeholt", "/".join(rel) + " ← " + q[-1], pid, p["name"] if p else "", "")
    return jsonify(ok=True, testserver=remote.NUR_LESEN)
