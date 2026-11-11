"""Alle Dateien des Projektordners (für „Pläne & Dateien“ → „Alle Dateien“) und die Vorschaubilder im Hintergrund.

GET /api/dateien/alle?project_id=     ganzen Projektordner einlesen (alle Dateiarten) → gespeichert in bp_store „allescan:<id>“
GET /api/dateien/datei?project_id=&pfad=   eine Datei (Original direkt vom Dateiserver, zum Ansehen oder Herunterladen)
Hintergrund (Container „dienste“, start()): nachts alle laufenden Projekte einlesen; laufend Vorschaubilder erzeugen – gewünschte
(gerade angesehene Kacheln) sofort, die übrigen nur, wenn wenig los ist (nachts, Wochenende, tagsüber bei geringer Last).
Gelesen wird nur; geschrieben wird nichts auf den Dateiserver (auch nicht auf dem Testserver).
"""
import io, json, mimetypes, os, threading, time
from datetime import datetime

from flask import Blueprint, g, jsonify, request, send_file

from core import access, db, remote, sync
from bpcore import fehler, vorschau as V
from modules.plaene import _ziel, _ziel_conf

bp = Blueprint("alle_dateien", __name__)
MAX_FILES, MAX_SEC = 50000, 240
SKIP = ("$recycle", "#recycle", "@eadir", ".snapshot", "papierkorb")


def scan(t, base):
    """Ganzen Projektordner durchgehen → {basis, dateien: [[pfad, groesse, mtime]], abgebrochen}."""
    if not t.exists("/".join(base)):
        return {"error": f"Projektordner „{'/'.join(base)}“ nicht gefunden – im Bautagebuch beim Projekt den Ordner eintragen.", "status": 404}
    out, t0, stapel = [], time.time(), [[]]
    abgebrochen = False
    while stapel:
        rel = stapel.pop()
        if len(out) >= MAX_FILES or time.time() - t0 > MAX_SEC:
            abgebrochen = True
            break
        for e in t.listdir("/".join(base + rel)):
            n = e["name"]
            if n.startswith((".", "~", "$")) or n.lower() in ("thumbs.db", "desktop.ini"):
                continue
            if e["dir"]:
                if n.lower() not in SKIP:
                    stapel.append(rel + [n])
            else:
                out.append(["/".join(rel + [n]), int(e["size"] or 0), round(float(e["mtime"] or 0), 1)])
    return {"basis": "/".join(base), "dateien": out, "abgebrochen": abgebrochen}


def speichern(pid, res):
    z = datetime.now().isoformat(timespec="seconds")
    with db.tx() as c:
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated",
                  (f"allescan:{pid}", json.dumps({"zeit": z, "res": res}, ensure_ascii=False), z, "alle_dateien"))
        if not res["abgebrochen"]:
            V.aufraeumen(c, pid, [d[0] for d in res["dateien"]])
    return z


@bp.get("/api/dateien/alle")
def alle():
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        if not access.can_see(c, g.user, pid):
            return jsonify(error="Kein Zugriff auf dieses Projekt."), 400
    t, base, err = _ziel(pid)
    if err:
        return jsonify(error=err), 400
    try:
        res = scan(t, base)
    except Exception as e:
        return jsonify(error=sync._msg(e)), 502
    if res.get("error"):
        return jsonify(error=res["error"]), res.get("status", 400)
    return jsonify(**res, stand=speichern(pid, res))


@bp.get("/api/dateien/datei")
def datei():
    pid = request.args.get("project_id", type=int)
    rel = remote.clean_path(request.args.get("pfad") or "")
    if not rel:
        return jsonify(error="Ungültige Datei"), 400
    t, base, err = _ziel(pid)
    if err:
        return jsonify(error=err), 400
    try:
        data = t.read("/".join(base + rel), 300 * 1024 * 1024)
    except Exception as e:
        return jsonify(error="Datei nicht lesbar: " + sync._msg(e)), 404
    mt = mimetypes.guess_type(rel[-1])[0] or "application/octet-stream"
    return send_file(io.BytesIO(data), mimetype=mt, download_name=rel[-1], as_attachment=request.args.get("dl") == "1")


# ---------------------------------------------------------------- Hintergrund (nur im Container „dienste“)
def ruhig():
    """Wenig los? Nachts (20–6 Uhr) und am Wochenende immer; sonst nur bei geringer Last und wenigen Änderungen in den letzten 5 Minuten."""
    jetzt = datetime.now()
    if jetzt.hour >= 20 or jetzt.hour < 6 or jetzt.weekday() >= 5:
        return True
    try:
        if os.getloadavg()[0] > 0.5 * (os.cpu_count() or 1):
            return False
        with db.tx() as c:
            n = c.execute("SELECT count(*) AS n FROM bp_aenderung WHERE zeit > now() - interval '5 minutes'").fetchone()["n"]
        return n < 15
    except Exception:   # noqa: BLE001 – im Zweifel: nicht ruhig
        return False


_listen = {}


def _liste(pid):
    """Dateiliste eines Projekts {pfad: (groesse, mtime)} – im Speicher, solange sich der Stand nicht ändert."""
    with db.tx() as c:
        s = V.scan_laden(c, pid)
    if not s:
        return {}
    alt = _listen.get(pid)
    if alt and alt[0] == s.get("zeit"):
        return alt[1]
    d = {x[0]: (x[1], x[2]) for x in (s.get("res") or {}).get("dateien") or []}
    _listen[pid] = (s.get("zeit"), d)
    return d


def _erzeugen(pid, auftraege):
    """Vorschauen für [(pfad, groesse, mtime)] eines Projekts erzeugen (eine Verbindung zum Dateiserver)."""
    if not auftraege:
        return 0
    t, base = _ziel_conf(pid)
    if not t:
        return 0
    n = 0
    for pfad, groesse, mtime in auftraege:
        bild, fehl = None, ""
        try:
            if groesse > V.MAX_LESEN:
                raise ValueError("zu groß für eine Vorschau")
            bild = V.bild_machen(t.read("/".join(base + remote.clean_path(pfad)), V.MAX_LESEN + 1), pfad)
        except Exception as e:   # noqa: BLE001 – Datei bleibt beim Symbol; Grund wird gemerkt, nicht ständig neu versucht
            fehl = (str(e) or e.__class__.__name__)[:200]
        with db.tx() as c:
            V.speichern(c, pid, pfad, groesse, mtime, bild, fehl)
        n += 1
    return n


def runde():
    """Eine Runde: erst die Wünsche (angesehene Kacheln), dann – wenn ruhig – je Projekt bis zu 25 fällige Dateien."""
    with db.tx() as c:
        W = c.execute("SELECT project_id, pfad FROM bp_vorschau WHERE wunsch IS NOT NULL AND bild IS NULL AND fehler='' "
                      "AND wunsch > now() - interval '1 hour' ORDER BY wunsch DESC LIMIT 24").fetchall()
    je = {}
    for r in W:
        d = _liste(r["project_id"]).get(r["pfad"])
        if d:
            je.setdefault(r["project_id"], []).append((r["pfad"], d[0], d[1]))
        else:
            with db.tx() as c:
                c.execute("UPDATE bp_vorschau SET wunsch=NULL WHERE project_id=? AND pfad=?", (r["project_id"], r["pfad"]))
    n = sum(_erzeugen(pid, L) for pid, L in je.items())
    if n or not ruhig():
        return n
    with db.tx() as c:
        ids = [r["id"] for r in c.execute("SELECT id FROM projects WHERE archived=0 ORDER BY id").fetchall()]
    for pid in ids:
        L = _liste(pid)
        if not L:
            continue
        with db.tx() as c:
            f = V.faellig(c, pid, [[p, x[0], x[1]] for p, x in L.items()])
        if f:
            return _erzeugen(pid, [tuple(x) for x in f[:25]])
    return 0


def nachts_einlesen(nur_fehlende=False):
    """Einmal am Tag (nachts): Projektordner aller laufenden Projekte ganz einlesen, damit „Alle Dateien“ sofort da ist.
    nur_fehlende: nur Projekte, die noch nie eingelesen wurden (nach dem Start, wenn ruhig). Fehlversuche älter als 7 Tage neu versuchen."""
    with db.tx() as c:
        ids = [r["id"] for r in c.execute("SELECT id FROM projects WHERE archived=0 ORDER BY id").fetchall()]
        if nur_fehlende:
            ids = [i for i in ids if not V.scan_laden(c, i)]
        else:
            c.execute("DELETE FROM bp_vorschau WHERE bild IS NULL AND fehler<>'' AND erstellt < now() - interval '7 days'")
    for pid in ids:
        try:
            t, base = _ziel_conf(pid)
            if t:
                res = scan(t, base)
                if not res.get("error"):
                    speichern(pid, res)
        except Exception as e:   # noqa: BLE001 – nächstes Projekt
            fehler.still("dienste", "Alle Dateien einlesen", e)


_gestartet = False


def start(stunde=2):
    global _gestartet
    if _gestartet:
        return
    _gestartet = True

    def schleife():
        erledigt, erst = "", True
        while True:
            try:
                jetzt = datetime.now()
                if stunde <= jetzt.hour < 6 and erledigt != jetzt.date().isoformat():
                    erledigt = jetzt.date().isoformat()
                    nachts_einlesen()
                elif erst and ruhig():
                    erst = False
                    nachts_einlesen(nur_fehlende=True)
                n = runde()
            except Exception as e:   # noqa: BLE001 – weiter in der nächsten Runde
                fehler.still("dienste", "Vorschaubilder erzeugen", e)
                n = 0
            time.sleep(2 if n else 10)

    threading.Thread(target=schleife, daemon=True, name="vorschau").start()
