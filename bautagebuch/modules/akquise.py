"""Dateien der Akquise im Projektpfad unter „Akquise/<Ordner>“ – das Bautagebuch kennt die Ablage (App „Akquise“ ruft hier auf).

GET  /api/akquise/baum?pfad=Akquise/X               Dateien und Ordner darunter (bis 5 Ebenen)
GET  /api/akquise/datei?pfad=…&rel=…                eine Datei lesen
POST /api/akquise/datei {pfad, ordner, name, datei} ablegen (gleicher Name → „(2)“, nie überschreiben)
POST /api/akquise/ordner {pfad, rel}                Unterordner anlegen
POST /api/akquise/umbenennen {pfad, rel, neu}       Datei oder Ordner umbenennen (im selben Ordner)
POST /api/akquise/verschieben {von, nach}           ganzen Akquise-Ordner verschieben (Archiv ↔ offen)
GET  /api/akquise/vorlage?pfad=&code=&name=          beim Umwandeln: Ordner der Projektvorlage (mit dem Kürzel), Vorschläge zum Einsortieren,
                                                    Ordner im Basisordner (für die nächste freie Nummer)
POST /api/akquise/umwandeln {pfad, project_id, zuordnung:[{rel, ziel}]}
                                                    Projektordner nach der Vorlage anlegen, Dateien einsortieren (Rest → „… Leistungsphase 0“)
Nur mit dem Recht „akquise“ (oder Verwaltung). Testserver: die Ablage wird nur gelesen.
"""
import base64
import mimetypes
import re

from flask import Blueprint, Response, g, jsonify, request

from core import audit, db, ordnerschema as osch, remote, settings, sync
from bpcore import ablage as bpablage, rechte

bp = Blueprint("akquise", __name__)
MAX = 80 * 1024 * 1024
LPH0 = re.compile(r"leistungsphasen?\s*0\b|lph\s*0\b|\b0\.\s*leistungsph", re.I)


@bp.before_request
def _recht():
    if not (rechte.hat(g.get("user"), "akquise") or rechte.hat(g.get("user"), "verwaltung")):
        return jsonify(error="Nur mit dem Recht „Akquise“."), 403


def _ziel():
    with db.tx() as c:
        conf = settings.all(c)
    if not sync.enabled(conf):
        raise ValueError("Die Ablage auf dem Dateiserver ist nicht eingerichtet (Verwaltung → Einstellungen → Ablage).")
    return remote.open_target(conf), conf


def _pfad(x):
    """Nur unterhalb von „Akquise/“ – nie woanders hin."""
    p = remote.clean_path(x if isinstance(x, str) else "/".join(x or []))
    if len(p) < 2 or p[0] != "Akquise":
        raise ValueError("Ungültiger Ordner.")
    return p


def _fehler(e):
    if isinstance(e, ValueError):
        return jsonify(error=str(e)), 400
    return jsonify(error=sync._msg(e)), 502


def _baum(t, teile, rel=(), tiefe=5, out=None, ordner=None):
    out = [] if out is None else out
    ordner = [] if ordner is None else ordner
    for e in sorted(t.listdir("/".join(teile + list(rel))), key=lambda x: (not x["dir"], x["name"].lower())):
        if e["name"].startswith((".", "~$")) or osch.unwichtig(e["name"]):
            continue
        r = list(rel) + [e["name"]]
        if e["dir"]:
            ordner.append("/".join(r))
            if tiefe > 1 and len(out) < 2000:
                _baum(t, teile, r, tiefe - 1, out, ordner)
        else:
            out.append({"rel": "/".join(r), "name": e["name"], "ordner": "/".join(rel), "groesse": e["size"], "mtime": e["mtime"]})
    return out, ordner


@bp.get("/api/akquise/baum")
def baum():
    try:
        t, _ = _ziel()
        teile = _pfad(request.args.get("pfad"))
        if not t.exists("/".join(teile)):
            return jsonify(dateien=[], ordner=[], da=False)
        d, o = _baum(t, teile)
    except Exception as e:   # noqa: BLE001
        return _fehler(e)
    return jsonify(dateien=d, ordner=o, da=True, testserver=remote.NUR_LESEN)


@bp.get("/api/akquise/datei")
def datei_lesen():
    try:
        t, _ = _ziel()
        teile = _pfad(request.args.get("pfad")) + remote.clean_path(request.args.get("rel") or "")
        daten = t.read("/".join(teile), MAX)
    except Exception as e:   # noqa: BLE001
        return _fehler(e)
    name = teile[-1]
    return Response(daten, mimetype=mimetypes.guess_type(name)[0] or "application/octet-stream",
                    headers={"Content-Disposition": f"inline; filename*=UTF-8''{__import__('urllib.parse').parse.quote(name)}", "Cache-Control": "no-store"})


@bp.post("/api/akquise/datei")
def datei_ablegen():
    b = request.get_json(silent=True) or {}
    try:
        t, _ = _ziel()
        teile = _pfad(b.get("pfad")) + remote.clean_path(b.get("ordner") or "")
        daten = base64.b64decode(b.get("datei") or "")
        if not daten or len(daten) > MAX:
            raise ValueError("Datei leer oder zu groß (höchstens 80 MB).")
        name = remote.clean(str(b.get("name") or "Datei"))[:150] or "Datei"
        da = {e["name"] for e in t.listdir("/".join(teile))}
        name = osch.frei(name, da)
        t.put_bytes(daten, "/".join(teile + [name]))
    except Exception as e:   # noqa: BLE001
        return _fehler(e)
    return jsonify(ok=True, name=name, testserver=remote.NUR_LESEN)


@bp.post("/api/akquise/ordner")
def ordner_anlegen():
    b = request.get_json(silent=True) or {}
    try:
        t, _ = _ziel()
        teile = _pfad(b.get("pfad")) + remote.clean_path(b.get("rel") or "")
        t.mkdir("/".join(teile))
    except Exception as e:   # noqa: BLE001
        return _fehler(e)
    return jsonify(ok=True)


@bp.post("/api/akquise/umbenennen")
def umbenennen():
    b = request.get_json(silent=True) or {}
    try:
        t, _ = _ziel()
        basis = _pfad(b.get("pfad"))
        rel = remote.clean_path(b.get("rel") or "")
        neu = remote.clean(str(b.get("neu") or ""))[:150]
        if not rel or not neu:
            raise ValueError("Name fehlt.")
        if t.exists("/".join(basis + rel[:-1] + [neu])):
            raise ValueError(f"„{neu}“ gibt es dort schon.")
        t.rename("/".join(basis + rel), "/".join(basis + rel[:-1] + [neu]))
    except Exception as e:   # noqa: BLE001
        return _fehler(e)
    return jsonify(ok=True, rel="/".join(rel[:-1] + [neu]))


@bp.post("/api/akquise/verschieben")
def verschieben():
    """Ganzen Ordner verschieben (Archivieren/Zurückholen) – gibt es ihn noch nicht, ist nichts zu tun."""
    b = request.get_json(silent=True) or {}
    try:
        t, _ = _ziel()
        von, nach = _pfad(b.get("von")), _pfad(b.get("nach"))
        if t.exists("/".join(von)):
            if t.exists("/".join(nach)):
                raise ValueError(f"„{'/'.join(nach)}“ gibt es schon.")
            t.rename("/".join(von), "/".join(nach))
    except Exception as e:   # noqa: BLE001
        return _fehler(e)
    return jsonify(ok=True)


def _vorlage(t, conf, code):
    """Schritte zum Anlegen eines leeren Projektordners nach der Projektvorlage (Kürzel der Vorlage → code)."""
    from modules import ordner as om
    _, m_teile, m_baum = om.muster(t, conf)
    return osch.reihenfolge(osch.vergleichen(m_baum, {}, code)), m_teile, osch.muster_kuerzel(m_baum)


def _lph0(ordner, code):
    hit = next((o for o in ordner if LPH0.search(o.rsplit("/", 1)[-1])), None)
    return hit or f"{code} 0. Leistungsphasen 0"   # wie die Vorlage des Büros („A000 1. Leistungsphasen 1-4“)


@bp.get("/api/akquise/vorlage")
def vorlage():
    """Für das Umwandeln: Ordner der Vorlage (mit Kürzel), je Datei ein Vorschlag, Basisordner (nächste freie Nummer)."""
    code = remote.clean(request.args.get("code") or "")
    try:
        t, conf = _ziel()
        basis = sorted(t.dirs(()))
        try:
            schritte, _, _ = _vorlage(t, conf, code or "A000")
            ordner = ["/".join(s["pfad"]) for s in schritte if s["art"] == "anlegen"]
            hinweis = ""
        except ValueError as e:   # keine Vorlage: dann nur Leistungsphase 0
            ordner, hinweis = [], str(e)
        dateien = []
        teile = _pfad(request.args.get("pfad"))
        if t.exists("/".join(teile)):
            dateien, _ = _baum(t, teile)
        with db.tx() as c:
            cf = bpablage.plan_conf(c)
        l0 = _lph0(ordner, code or "A000")
        for f in dateien:
            text = ""
            if f["name"].lower().endswith(".pdf") and f["groesse"] < 4 * 1024 * 1024:
                try:
                    text = bpablage.pdf_anfang(t.read("/".join(teile + f["rel"].split("/")), 4 * 1024 * 1024))
                except Exception:   # noqa: BLE001 – ohne Text: nur nach dem Namen
                    text = ""
            v, _ = bpablage.vorschlaege(f["name"], text, [], ordner, cf) if ordner else ([], "")
            f["ziel"], f["grund"] = (v[0]["pfad"], v[0]["grund"]) if v else (l0, "nicht zuzuordnen – Leistungsphase 0")
    except Exception as e:   # noqa: BLE001
        return _fehler(e)
    return jsonify(ordner=ordner or [l0], dateien=dateien, basis=basis, lph0=l0, hinweis=hinweis, testserver=remote.NUR_LESEN)


@bp.post("/api/akquise/umwandeln")
def umwandeln():
    """Projektordner anlegen (Vorlage), die Dateien der Akquise nach der Zuordnung hineinlegen, den leeren Akquise-Ordner entfernen."""
    b = request.get_json(silent=True) or {}
    try:
        t, conf = _ziel()
        quelle = _pfad(b.get("pfad"))
        with db.tx() as c:
            p = c.execute("SELECT id, name, folder FROM projects WHERE id=?", (b.get("project_id"),)).fetchone()
        if not p:
            raise ValueError("Projekt nicht gefunden.")
        code = sync.code_of(p)
        ziel = remote.clean_path(p["folder"] or "") or remote.find_project_path(t, code, remote.clean(p["name"]) or "Projekt")
        t.mkdir("/".join(ziel))
        fehler = []
        try:
            schritte, m_teile, _ = _vorlage(t, conf, code)
        except ValueError as e:
            schritte, m_teile = [], []
            fehler.append(str(e))
        ordner = []
        for s in schritte:
            try:
                if s["art"] == "anlegen":
                    t.mkdir("/".join(ziel + s["pfad"]))
                    ordner.append("/".join(s["pfad"]))
                elif s["art"] == "kopieren" and s.get("quelle") and not t.exists("/".join(ziel + s["pfad"])):
                    t.put_bytes(t.read("/".join(m_teile + s["quelle"])), "/".join(ziel + s["pfad"]))
            except Exception as e:   # noqa: BLE001 – Schritt überspringen
                fehler.append(f"{'/'.join(s['pfad'])}: {e}"[:200])
        l0 = _lph0(ordner, code)
        zuo = {str(x.get("rel") or ""): str(x.get("ziel") or "") for x in (b.get("zuordnung") or []) if isinstance(x, dict)}
        n = 0
        if t.exists("/".join(quelle)):
            dateien, _ = _baum(t, quelle)
            for f in dateien:
                zo = [code + x.strip()[len(osch.kuerzel(x)):] if osch.kuerzel(x) and osch.kuerzel(x) != code else x
                      for x in remote.clean_path(zuo.get(f["rel"]) or l0)]   # Vorschlag noch mit dem Kürzel der Vorlage oder einer anderen Nummer
                try:
                    t.mkdir("/".join(ziel + zo))
                    da = {e["name"] for e in t.listdir("/".join(ziel + zo))}
                    t.rename("/".join(quelle + f["rel"].split("/")), "/".join(ziel + zo + [osch.frei(f["name"], da)]))
                    n += 1
                except Exception as e:   # noqa: BLE001
                    fehler.append(f"{f['rel']}: {e}"[:200])
            for o in sorted(_baum(t, quelle)[1], key=lambda x: -x.count("/")):   # leere Unterordner, dann der Ordner selbst
                t.rmdir_if_empty("/".join(quelle + o.split("/")))
            t.rmdir_if_empty("/".join(quelle))
        if not remote.NUR_LESEN:
            audit.record(g.user["name"], "export", "Akquise umgewandelt", f"{'/'.join(quelle)} → {'/'.join(ziel)}: {n} Dateien", p["id"], p["name"])
    except Exception as e:   # noqa: BLE001
        return _fehler(e)
    return jsonify(ok=True, pfad="/".join(ziel), dateien=n, fehler=fehler, testserver=remote.NUR_LESEN)
