"""Bauantrag – Angaben der Vordrucke (Kern: bpcore/bauantrag_angaben.py, entschieden am 16.11.2026).

GET /api/antraege/<aid>/angaben   alle Felder aller gewählten Vordrucke, je Angabe einmal: aus dem Antrag (mit Quelle) oder Angabe des Projekts
PUT /api/antraege/<aid>/angaben   {werte: {Schlüssel: Wert|null}} – gilt in allen Vordrucken und für jeden weiteren Antrag des Projekts
Antragsfelder („f:<feld>“) ändert die Seite wie bisher über PUT /api/antraege/<aid> (felder) – mit Rückschreiben in ihre Quelle.
"""
import json
import time

from flask import g, jsonify, request

from bpcore import bauantrag_angaben as BAA, bauantrag_paket as BP, db
from bauantrag import _antrag, _j, app
from bauantrag_paket import _gesperrt, _quelle, _w


def vordrucke(c, a, d):
    """Gewählte Vordrucke und eigene Unterlagen mit Feldern (keine Beilagen): [{key, titel, sha, F, P}]."""
    out = []
    for x in d["paket"]:
        if x["key"] not in d["gewaehlt"] or x["art"] not in ("vordruck", "unterlage") or x.get("nutzung") == "beilegen":
            continue
        daten, sha = _quelle(c, a, x["key"])
        if not daten:
            continue
        out.append({"key": x["key"], "titel": ((x.get("nr") or "") + " " + x["titel"]).strip() if x["art"] == "vordruck" and str(x.get("nr") or "").startswith("I") else x["titel"],
                    "sha": sha, "F": BAA.felder(daten, sha)})
    P = BP._plaetze(c, {v["sha"] for v in out})
    for v in out:
        v["P"] = P.get(v["sha"]) or []
    return out


def _liste(c, a):
    W, d = _w(c, a)
    VD = vordrucke(c, a, d)
    L = BAA.liste(VD, W, d["felder"], W.get("_angaben") or {}, _j(a["daten"], {}).get("_pdf") or {})
    L["vordrucke"] = [{"key": v["key"], "titel": v["titel"], "felder": len(v["F"]), "platziert": len(v["P"])} for v in VD]
    return L, VD


@app.get("/api/antraege/<int:aid>/angaben")
def angaben(aid):
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        L, _ = _liste(c, a)
    return jsonify(L)


@app.put("/api/antraege/<int:aid>/angaben")
def angaben_setzen(aid):
    b = request.get_json(silent=True) or {}
    werte = {str(k): v for k, v in (b.get("werte") or {}).items() if str(k)[:2] in ("a:", "v:")}
    if not werte:
        return jsonify(error="Keine Angabe."), 400
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        if _gesperrt(a):
            return jsonify(error="Der Antrag ist eingereicht – zum Ändern erst wieder auf „Entwurf“ stellen."), 409
        alt = BAA.lesen(c, a["project_id"])
        BAA.schreiben(c, a["project_id"], werte, g.user["name"])
        if _j(a["daten"], {}).get("_pdf"):
            vordrucke(c, a, _w(c, a)[1])   # Felder der Vordrucke gelesen (je Inhalt gemerkt) – für _alt_loesen
            _alt_loesen(c, a, werte)
        L, _ = _liste(c, _antrag(c, aid))
    return jsonify({**L, "alt": {k: alt.get(k) for k in werte}})


def _alt_loesen(c, a, werte):
    """Früher nur in einem Vordruck eingetragene Werte derselben Angaben entfernen – sonst gingen sie der Angabe vor."""
    daten = _j(a["daten"], {})
    E = daten.get("_pdf") or {}
    if not E:
        return
    weg = False
    for sha, felder in E.items():
        F = BAA._FELDER.get(sha)
        if F is None:
            continue
        for f in F:
            if f["name"] in felder and BAA.schluessel(f, sha) in werte:
                felder.pop(f["name"], None)
                weg = True
    if weg:
        c.execute("UPDATE bauantrag SET daten=?, geaendert=? WHERE id=?", (json.dumps(daten), time.strftime("%Y-%m-%d %H:%M:%S"), a["id"]))
