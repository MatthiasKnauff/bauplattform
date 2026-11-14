"""Geprüfte Rechnung im Projektordner ablegen (14.11.2026).

Nach „Prüfung abschließen“ öffnet sich die Druckseite der Rechnungsfreigabe (derselbe Dialog wie „🖨 Drucken“, Teile wie dort gewählt);
„📁 GEPRÜFT ablegen“ schickt das PDF hierher. Abgelegt wird neben der Rechnung der Firma (Ordner ihrer ersten PDF) unter demselben Namen
mit dem Zusatz „GEPRÜFT“ – nach einer erneuten Prüfung „GEPRÜFT NEU“ (die frühere Datei bleibt liegen). In der Plattform steht nur der Verweis
(Rechnung data.geprueft_ablage), nie das PDF. Der Testserver schreibt nicht in die Ablage.
"""
import base64
import json

from flask import g, jsonify, request

from bpcore import db
import common as C
from ava import _ablage_name, _beleg_tabelle, _j, _lv, _now, _touch, app, re_titel


def name_geprueft(orig, neu=False):
    """„A484 1.AR Fa. Blank.pdf“ → „A484 1.AR Fa. Blank GEPRÜFT.pdf“ (bzw. „… GEPRÜFT NEU.pdf“)."""
    stamm = orig.rsplit("/", 1)[-1]
    if stamm.lower().endswith(".pdf"):
        stamm = stamm[:-4]
    for alt in (" GEPRÜFT NEU", " GEPRÜFT"):   # schon einmal abgelegt: Zusatz nicht doppelt
        if stamm.endswith(alt):
            stamm = stamm[: -len(alt)]
    return f"{stamm.strip() or 'Rechnung'} GEPRÜFT{' NEU' if neu else ''}.pdf"


@app.post("/api/rechnungen/<int:k>/geprueft_ablegen")
def geprueft_ablegen(k):
    f = request.files.get("datei")
    roh = f.read(80 * 1024 * 1024 + 1) if f else b""
    if not roh.startswith(b"%PDF") or len(roh) > 80 * 1024 * 1024:
        return jsonify(error="Kein PDF (oder zu groß)."), 400
    with db.tx() as c:
        x = c.execute("SELECT * FROM ava_rechnung WHERE id=?", (k,)).fetchone()
        r = _lv(c, x["lv_id"]) if x else None
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        if x["status"] != "geprueft":
            return jsonify(error="Erst „Prüfung abschließen“ – abgelegt wird die geprüfte Rechnung."), 400
        _beleg_tabelle(c)
        b = c.execute("SELECT name, ablage FROM ava_beleg WHERE rechnung_id=? ORDER BY id LIMIT 1", (k,)).fetchone()
        D = _j(x["data"], {}) or {}
    V = _j(r["vergabe"], {}) or {}
    if not r["project_id"]:
        return jsonify(error="Das LV gehört zu keinem Projekt – kein Projektordner."), 400
    frueher = D.get("geprueft_ablagen") or []
    neu = bool(frueher)
    if b and b["ablage"]:   # neben die Rechnung der Firma, Name wie ihre erste PDF
        teile = b["ablage"].split("/")
        ordner, name = teile[:-1] or None, name_geprueft(teile[-1], neu)
    else:
        ordner = None
        name = name_geprueft(b["name"] if b else _ablage_name(re_titel(x["nr"], x["art"]), V.get("bieter") or "", "", x["re_nr"] or "", x["datum"] or x["eingang"] or "", "x.pdf"), neu)
    try:
        a = C.bt_api("POST", "/api/ablage/datei", {"project_id": r["project_id"], "art": "rechnung", "firma": V.get("bieter") or "", "gewerk": r["gewerk"] or r["name"] or "",
                                                  "name": name, "ordner": ordner, "datei": base64.b64encode(roh).decode()}) or {}
    except Exception as e:
        return jsonify(error=f"Nicht abgelegt: {e}"), 502
    pfad = a.get("pfad") or ""
    eintrag = {"pfad": pfad, "am": _now(), "von": C.full_name(g.user), "testserver": bool(a.get("testserver"))}
    with db.tx() as c:
        x = c.execute("SELECT data FROM ava_rechnung WHERE id=?", (k,)).fetchone()
        D = _j(x["data"], {}) or {}
        D["geprueft_ablage"] = eintrag
        D["geprueft_ablagen"] = (D.get("geprueft_ablagen") or [])[-19:] + [eintrag]
        c.execute("UPDATE ava_rechnung SET data=? WHERE id=?", (json.dumps(D), k))
        _touch(c, r["id"])
    C.audit(g.user["name"], "ava", "Geprüfte Rechnung abgelegt", f"LV {r['nr']} {r['name']}: {pfad}")
    return jsonify(ok=True, **eintrag)
