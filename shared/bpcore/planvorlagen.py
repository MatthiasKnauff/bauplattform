"""Eigene Vorlagen des Planungsassistenten (GO 18.11.2026, Mock „Leistungen in der Planung“: LP-A1 B1 C1).

Bis 16.11.2026 hatte der Bauzeitenplan „Meine Vorlagen“ (gantt_store „presets“). Seit es nur noch den gemeinsamen Assistenten gibt
(bp/assistent.js), liegen sie im Kern – für alle Apps gleich. Beim ersten Lesen werden die früheren Vorlagen übernommen.

Vorlage: {id, name, scope: "all" | "phases", phases, data: {cfg: {...Angaben}, sel} bzw. {sel, dur, custom, choice}, created, by}

GET    /api/bp/planvorlagen          Liste
POST   /api/bp/planvorlagen          {name, data} → Vorlage (ganze Planung)
DELETE /api/bp/planvorlagen/<id>
"""
import json
import uuid
from datetime import datetime

KEY = "plan:vorlagen"


def _lesen(c):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (KEY,)).fetchone()
    if r:
        try:
            v = json.loads(r["data"] or "[]")
            return v if isinstance(v, list) else []
        except ValueError:
            return []
    alt = []
    t = c.execute("SELECT to_regclass('gantt_store') AS t").fetchone()   # einmal: die früheren Vorlagen des Bauzeitenplans übernehmen
    if t and t["t"]:
        a = c.execute("SELECT data FROM gantt_store WHERE key='presets'").fetchone()
        try:
            alt = json.loads(a["data"] or "[]") if a else []
        except ValueError:
            alt = []
    return [x for x in alt if isinstance(x, dict) and x.get("id")] if isinstance(alt, list) else []


def _schreiben(c, L, wer):
    from . import konto
    konto._put(c, KEY, json.dumps(L, ensure_ascii=False), wer)


def neu(c, name, data, wer):
    L = _lesen(c)
    v = {"id": uuid.uuid4().hex[:12], "name": " ".join(str(name or "Vorlage").split())[:120] or "Vorlage", "scope": "all", "phases": [],
         "data": data if isinstance(data, dict) else {}, "created": datetime.now().isoformat(timespec="seconds"), "by": str(wer or "")[:120]}
    L.append(v)
    _schreiben(c, L, wer)
    return v


def loeschen(c, vid, wer):
    L = _lesen(c)
    n = [x for x in L if x.get("id") != vid]
    if len(n) == len(L):
        return False
    _schreiben(c, n, wer)
    return True


def routen(bp, _uid):
    from flask import jsonify, request
    from . import db

    @bp.route("/api/bp/planvorlagen", methods=["GET", "POST"])
    def bp_planvorlagen():
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            c.execute("SELECT pg_advisory_xact_lock(hashtext('plan:vorlagen'))")
            if request.method == "GET":
                return jsonify(_lesen(c))
            b = request.get_json(silent=True) or {}
            if not isinstance(b.get("data"), dict) or len(json.dumps(b["data"])) > 300000:
                return jsonify(error="Ungültige Vorlage"), 400
            return jsonify(neu(c, b.get("name"), b["data"], u.get("name") or "")), 201

    @bp.delete("/api/bp/planvorlagen/<vid>")
    def bp_planvorlage_weg(vid):
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            c.execute("SELECT pg_advisory_xact_lock(hashtext('plan:vorlagen'))")
            return jsonify(ok=True) if loeschen(c, str(vid)[:40], u.get("name") or "") else (jsonify(error="Vorlage nicht gefunden"), 404)
