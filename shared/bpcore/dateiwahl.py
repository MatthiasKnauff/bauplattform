"""Dateien aus dem Projektordner wählen – für alle Apps (Baustein /bp/dateiwahl.js, besprochen am 13.11.2026 beim LV-Versand).

Zwei Wege: „Pläne & Dateien“ (die Pläne des Projekts, je Plan der neueste PDF-Stand, dazu die übrigen PDFs) und „Fileserver“
(Ordner zum Durchklicken). Ergebnis sind nur Verweise {quelle, pfad, name, groesse, sub} – gelesen wird die Datei erst, wenn sie
gebraucht wird (z. B. beim Senden), über das Bautagebuch und mit den Rechten der Person.

GET /api/bp/dateiwahl/plaene?project_id=…          → {plaene: [{pfad, name, groesse, sub}], sonstige: [...]}
GET /api/bp/dateiwahl/ordner?project_id=…&pfad=…   → {pfad: [...], ordner: [...], dateien: [{name, groesse}]}
"""
import json
import urllib.parse


def _store(c, key):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (key,)).fetchone()
    try:
        return json.loads(r["data"]) if r and r["data"] else {}
    except (TypeError, ValueError):
        return {}


def plaene_liste(dateien, conf, zuordnung):
    """Planliste → je Plan der neueste PDF-Stand (Nummer, Index, Titel), dazu die übrigen PDFs."""
    from . import planname
    pl, sonst = planname.ordnen(dateien, conf, zuordnung)
    out = []
    for x in pl:
        st = next((y for y in x["staende"] if y.get("pdf")), None)
        if not st:
            continue
        f = st["pdf"]
        out.append({"quelle": "plan", "pfad": f["pfad"], "name": f["name"], "groesse": f.get("groesse") or 0,
                    "sub": " · ".join(v for v in (f"Index {st['index']}" if st.get("index") else "", x.get("titel") or "", x.get("gewerk") or "") if v)})
    rest = [{"quelle": "datei", "pfad": f["pfad"], "name": f["name"], "groesse": f.get("groesse") or 0, "sub": f.get("ordner") or ""} for f in sonst]
    return out, rest


def routen(bp, _uid):
    from flask import jsonify, request
    from . import db, planname, rechte
    from .ablage import bt_json

    def _pruefen():
        u, _ = _uid()
        if not u:
            return None, (jsonify(error="Nicht angemeldet"), 401)
        pid = request.args.get("project_id", type=int)
        if not pid:
            return None, (jsonify(error="Projekt fehlt"), 400)
        with db.tx() as c:
            if not rechte.can_see(c, u, pid):
                return None, (jsonify(error="Projekt nicht gefunden"), 404)
        return pid, None

    @bp.get("/api/bp/dateiwahl/plaene")
    def bp_dateiwahl_plaene():
        pid, f = _pruefen()
        if f:
            return f
        with db.tx() as c:
            conf, _d = planname.konfig(c)
            m = _store(c, f"plaene:{pid}")
        q = {"project_id": pid}
        if m.get("aus") is not None:
            q["aus"] = json.dumps(m["aus"])
        try:
            d = bt_json("GET", "/api/plaene/dateien?" + urllib.parse.urlencode(q))
        except RuntimeError as e:
            return jsonify(error=str(e)), 502
        pl, rest = plaene_liste(d.get("dateien") or [], conf, m.get("zuordnung") or {})
        return jsonify(plaene=pl, sonstige=rest, stand=d.get("stand") or "")

    @bp.get("/api/bp/dateiwahl/ordner")
    def bp_dateiwahl_ordner():
        pid, f = _pruefen()
        if f:
            return f
        try:
            d = bt_json("GET", "/api/ablage/ordner?" + urllib.parse.urlencode({"project_id": pid, "pfad": request.args.get("pfad") or "", "dateien": "1"}))
        except RuntimeError as e:
            return jsonify(error=str(e)), 502
        if not d.get("ok"):
            return jsonify(error=d.get("error") or "Projektordner nicht erreichbar"), 400
        return jsonify(pfad=d.get("pfad") or [], ordner=d.get("ordner") or [], dateien=d.get("dateien") or [])
