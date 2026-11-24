"""Projektordner beim Anlegen eines Projekts (24.11.2026): gibt es den Ordner auf dem Dateiserver noch nicht oder ist er leer,
wird er nach der Projektvorlage des Büros angelegt; liegen dort schon lose Dateien, werden sie – nach Rückfrage – in die
Ordner der Vorlage einsortiert. Angelegt wird erst, wenn die Person im Fenster zustimmt (bp/projektordner.js).

GET  /api/projektordner?project_id=          Zustand: neu (Ordner fehlt) · leer · dateien (nur lose Dateien) · fertig (hat schon
                                              Unterordner – bleibt unangetastet) · aus (Ablage nicht eingerichtet) · ohne (kein Kürzel)
                                              · keine_vorlage; dazu die Ordner der Vorlage und je Datei ein Vorschlag
POST /api/projektordner {project_id, zuordnung: [{rel, ziel}]}
                                              Prüft neu, legt die Vorlage an und verschiebt nur Dateien, die dabei wieder lose im
                                              Projektordner liegen, nur in Ordner der Vorlage (nie ein frei übergebener Pfad).
Testserver: die Ablage wird nur gelesen (remote.NUR_LESEN).
"""
from flask import Blueprint, g, jsonify, request

from core import audit, db, ordnerschema as osch, remote, settings, sync
from modules import ordner as om
from modules.plaene import _ziel

bp = Blueprint("projektordner", __name__)


def stand(pid):
    """→ (Antwort, t, Pfadteile, Schritte, Pfadteile der Vorlage)"""
    t, base, err = _ziel(pid)
    if err:
        return {"zustand": "aus", "meldung": err}, None, None, None, None
    with db.tx() as c:
        p = c.execute("SELECT id, name, folder FROM projects WHERE id=?", (pid,)).fetchone()
        conf = settings.all(c)
    code = sync.code_of(p)
    out = {"pfad": "/".join(base), "testserver": remote.NUR_LESEN, "ordner": [], "dateien": []}
    if not remote.code_prefix(p["name"]):
        return {**out, "zustand": "ohne"}, t, base, None, None
    da = t.exists("/".join(base))
    eintraege = [e for e in t.listdir("/".join(base)) if not osch.unwichtig(e["name"]) and not e["name"].startswith((".", "~$"))] if da else []
    if any(e["dir"] for e in eintraege):
        return {**out, "zustand": "fertig"}, t, base, None, None
    try:
        schritte, m_teile = om.vorlage(t, conf, code)
    except ValueError as e:
        return {**out, "zustand": "keine_vorlage", "meldung": str(e)}, t, base, None, None
    ordner = ["/".join(s["pfad"]) for s in schritte if s["art"] == "anlegen"]
    dateien = [{"rel": e["name"], "name": e["name"], "groesse": e.get("size", 0)} for e in sorted(eintraege, key=lambda x: x["name"].lower())]
    om.einsortieren(t, base, dateien, ordner)
    zustand = "neu" if not da else "dateien" if dateien else "leer"
    return {**out, "zustand": zustand, "ordner": ordner, "dateien": dateien}, t, base, schritte, m_teile


@bp.get("/api/projektordner")
def lesen():
    try:
        res = stand(request.args.get("project_id", type=int) or 0)[0]
    except Exception as e:   # noqa: BLE001 – Dateiserver nicht erreichbar: Meldung an die Oberfläche
        return jsonify(zustand="aus", meldung=sync._msg(e))
    return jsonify(res)


@bp.post("/api/projektordner")
def anlegen():
    b = request.get_json(silent=True) or {}
    pid = int(b.get("project_id") or 0)
    try:
        res, t, base, schritte, m_teile = stand(pid)
        if res["zustand"] not in ("neu", "leer", "dateien"):
            return jsonify(error=res.get("meldung") or "Der Projektordner ist schon eingerichtet – es wurde nichts geändert."), 409
        t.mkdir("/".join(base))
        ordner, fehler = om.vorlage_anlegen(t, base, schritte, m_teile)
        erlaubt = set(res["ordner"])
        lose = {f["rel"] for f in res["dateien"]}
        n = 0
        for x in b.get("zuordnung") or []:
            rel, ziel = str((x or {}).get("rel") or ""), str((x or {}).get("ziel") or "")
            if rel not in lose or ziel not in erlaubt:
                continue
            zt = remote.clean_path(ziel)
            try:
                da = {e["name"] for e in t.listdir("/".join(base + zt))}
                t.rename("/".join(base + [rel]), "/".join(base + zt + [osch.frei(rel, da)]))
                n += 1
            except Exception as e:   # noqa: BLE001 – Datei bleibt liegen, die übrigen laufen weiter
                fehler.append(f"{rel}: {e}"[:200])
        if not remote.NUR_LESEN:
            with db.tx() as c:
                p = c.execute("SELECT name FROM projects WHERE id=?", (pid,)).fetchone()
            audit.record(g.user["name"], "export", "Projektordner angelegt", f"{res['pfad']}: {len(ordner)} Ordner, {n} Dateien einsortiert", pid, p["name"] if p else "")
    except Exception as e:   # noqa: BLE001
        return jsonify(error=sync._msg(e)), 502
    return jsonify(ok=True, pfad=res["pfad"], ordner=len(ordner), dateien=n, fehler=fehler, testserver=remote.NUR_LESEN)
