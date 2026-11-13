"""Ausschreibung → Details rechts, wenn das Projekt oder ein LV markiert ist: was es nicht schon in der LV-Liste gibt.

GET /api/projekt/<pid>/details → {bauherr, adresse, budget: {name, wert, gesamt} | null, budget_grund, lvs: {lv_id: {abgabe, eingeladen, ohne_rueck}}}
Budget = gültige Kostenermittlung der App Baukosten (über den Kern), KG 200–600 ohne Baunebenkosten (KG 700) und Risiko –
das, was über LVs vergeben wird. Abgabe und Rückmeldungen aus dem Versand (ava_versand). Wird erst beim Markieren geholt.
"""
from flask import jsonify, request

from bpcore import db, kosten
from ava import AKTIV, _sees, app
from ava_versand import _lesen


@app.get("/api/projekt/<int:pid>/details")
def projekt_details(pid):
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        p = c.execute("SELECT client, street, zip, city FROM projects WHERE id=?", (pid,)).fetchone()
        bk, k = kosten.kostenermittlung(c, pid)
        budget = {"name": bk["name"], "wert": round((k.get("bauwerk") or 0) + (k.get("extra") or 0), 2), "gesamt": k.get("total") or 0} if bk else None
        vid = request.args.get("version_id", type=int)
        lvs = (c.execute("SELECT id FROM ava_lv WHERE project_id=? AND version_id=?", (pid, vid)) if vid
               else c.execute(f"SELECT id FROM ava_lv WHERE project_id=? AND {AKTIV}", (pid,))).fetchall()
        out = {}
        for r in lvs:
            d = _lesen(c, r["id"])
            ang = {a["contact_id"] for a in c.execute("SELECT contact_id FROM ava_angebot WHERE lv_id=?", (r["id"],)).fetchall() if a["contact_id"]}
            ein = [cid for cid, b in d["bieter"].items() if b.get("versendet") and not b.get("weg")]
            if d.get("abgabe") or ein:
                out[r["id"]] = {"abgabe": d.get("abgabe") or "", "eingeladen": len(ein),
                                "ohne_rueck": sum(1 for cid in ein if not d["bieter"][cid].get("rueck") and not (str(cid).isdigit() and int(cid) in ang))}
    adr = ", ".join(x for x in ((p["street"] or "") if p else "", " ".join(y for y in ((p["zip"] or "") if p else "", (p["city"] or "") if p else "") if y)) if x)
    return jsonify(bauherr=(p["client"] or "") if p else "", adresse=adr, budget=budget, budget_grund=None if bk else k, lvs=out)
