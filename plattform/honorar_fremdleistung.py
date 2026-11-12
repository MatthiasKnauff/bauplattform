"""Honorar – Fachplaner über unser Büro (Fremdleistungen): anlegen, ändern, löschen; ihre Rechnungen an uns erfassen (mit PDF),
prüfen → freigeben → bezahlt; „weiter“ = in unsere nächste Rechnung übernehmen. Rechenkern und Liste: bpcore/honorar_fremd.py."""
import base64
import re
import urllib.parse

from flask import Response, g, jsonify, request

from bpcore import db, honorar_fremd as HF, papierkorb
import common as C
from honorar import KEY, _detail, app

MAX_PDF = 15 * 1024 * 1024


def _fremd(c, fid):
    r = c.execute("SELECT f.*, a.name AS auftrag, a.project_id FROM honorar_fremd f JOIN honorar_auftrag a ON a.id=f.auftrag_id WHERE f.id=?", (fid,)).fetchone()
    return dict(r) if r else None


def _re(c, rid):
    r = c.execute("SELECT r.id, r.fremd_id, r.nr, r.datum, r.netto, r.status, r.weiter, r.re_id, r.notiz, f.auftrag_id FROM honorar_fremd_re r "
                  "JOIN honorar_fremd f ON f.id=r.fremd_id WHERE r.id=?", (rid,)).fetchone()
    return dict(r) if r else None


@app.post("/api/auftraege/<int:aid>/fremd")
def fremd_neu(aid):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        if not c.execute("SELECT 1 FROM honorar_auftrag WHERE id=?", (aid,)).fetchone():
            return jsonify(error="Auftrag nicht gefunden."), 404
        x = HF.sauber(b, {"firma": "", "leistung": "", "beauftragt": "buero", "vertrag": "", "auftrag_netto": None, "weiter": "zuschlag",
                          "zuschlag_p": float((c.execute("SELECT value FROM settings WHERE key='honorar_fremd_zuschlag'").fetchone() or {"value": 0})["value"] or 0),
                          "notiz": "", "contact_id": None})
        if not x["firma"] and x["contact_id"]:
            k = c.execute("SELECT name FROM contacts WHERE id=?", (x["contact_id"],)).fetchone()
            x["firma"] = k["name"] if k else ""
        fid = c.execute("""INSERT INTO honorar_fremd(auftrag_id, contact_id, firma, leistung, beauftragt, vertrag, auftrag_netto, weiter, zuschlag_p, notiz, von)
                           VALUES(?,?,?,?,?,?,?,?,?,?,?) RETURNING id""",
                        (aid, x["contact_id"], x["firma"], x["leistung"], x["beauftragt"], x["vertrag"], x["auftrag_netto"], x["weiter"], x["zuschlag_p"],
                         x["notiz"], g.user["name"])).fetchone()["id"]
        d = _detail(c, aid)
    return jsonify({**d, "neu": fid})


@app.put("/api/fremd/<int:fid>")
def fremd_aendern(fid):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        f = _fremd(c, fid)
        if not f:
            return jsonify(error="Fachplaner nicht gefunden."), 404
        x = HF.sauber(b, f)
        if "contact_id" in b and x["contact_id"] and "firma" not in b:
            k = c.execute("SELECT name FROM contacts WHERE id=?", (x["contact_id"],)).fetchone()
            if k:
                x["firma"] = k["name"]
        c.execute("UPDATE honorar_fremd SET contact_id=?, firma=?, leistung=?, beauftragt=?, vertrag=?, auftrag_netto=?, weiter=?, zuschlag_p=?, notiz=? WHERE id=?",
                  (x["contact_id"], x["firma"], x["leistung"], x["beauftragt"], x["vertrag"], x["auftrag_netto"], x["weiter"], x["zuschlag_p"], x["notiz"], fid))
        d = _detail(c, f["auftrag_id"])
    return jsonify(d)


@app.delete("/api/fremd/<int:fid>")
def fremd_loeschen(fid):
    with db.tx() as c:
        f = _fremd(c, fid)
        if not f:
            return jsonify(error="Fachplaner nicht gefunden."), 404
        if c.execute("SELECT 1 FROM honorar_fremd_re WHERE fremd_id=? AND re_id IS NOT NULL", (fid,)).fetchone():
            return jsonify(error="Rechnungen dieses Fachplaners sind schon weiterberechnet – erst die betreffende Rechnung stornieren."), 409
        p = c.execute("SELECT name FROM projects WHERE id=?", (f["project_id"],)).fetchone()
        pk = papierkorb.ablegen(c, "honorar_fremd", fid, "Fachplaner (Honorar)", f"{f['leistung']} · {f['firma']}".strip(" ·"), g.user["name"], p["name"] if p else "", KEY)
        d = _detail(c, f["auftrag_id"])
    return jsonify({**d, "papierkorb": pk})


@app.post("/api/fremd/<int:fid>/rechnungen")
def re_neu(fid):
    """Rechnung des Fachplaners an uns: multipart nr, datum, netto, notiz, datei (PDF, optional)."""
    fd = request.files.get("datei")
    daten = fd.read(MAX_PDF + 1) if fd else None
    if daten is not None and (not daten.startswith(b"%PDF") or len(daten) > MAX_PDF):
        return jsonify(error="Bitte eine PDF-Datei bis 15 MB wählen."), 400
    datum = str(request.form.get("datum") or "")[:10]
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", datum):
        datum = ""
    with db.tx() as c:
        f = _fremd(c, fid)
    if not f:
        return jsonify(error="Fachplaner nicht gefunden."), 404
    nr = str(request.form.get("nr") or "")[:60]
    ablage, in_db = "", None
    if daten:   # Dokumente gehören auf den Dateiserver: im Projektordner ablegen, hier nur den Verweis merken
        ablage, fehl = C.projektordner_ablegen({"project_id": f["project_id"], "art": "honorar", "firma": f["firma"], "wie_ordner": True, "datum": datum, "nr": nr,
                                                "name": f"{datum or 'Rechnung'} Rechnung {f['firma']}{' Nr. ' + nr if nr else ''}.pdf", "datei": base64.b64encode(daten).decode()})
        if ablage is None:
            return jsonify(error=f"Nicht gespeichert – {fehl}."), 502
        if fehl == "testserver":   # nur zum Ausprobieren: in der Datenbank
            in_db = daten
    with db.tx() as c:
        rid = c.execute("""INSERT INTO honorar_fremd_re(fremd_id, nr, datum, netto, notiz, datei, dateiname, ablage, von) VALUES(?,?,?,?,?,?,?,?,?) RETURNING id""",
                        (fid, nr, datum, round(HF._f(request.form.get("netto")), 2),
                         str(request.form.get("notiz") or "")[:1000], in_db, (fd.filename or "")[:200] if fd else "", ablage, g.user["name"])).fetchone()["id"]
        d = _detail(c, f["auftrag_id"])
    C.audit(g.user["name"], KEY, "Fachplaner-Rechnung erfasst", f"{f['firma']} {request.form.get('nr') or ''}")
    return jsonify({**d, "neu": rid})


@app.put("/api/fremd-re/<int:rid>")
def re_aendern(rid):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = _re(c, rid)
        if not r:
            return jsonify(error="Rechnung nicht gefunden."), 404
        if r["re_id"] and ("netto" in b or "weiter" in b or b.get("status") not in (None, "freigegeben", "bezahlt")):   # nur noch bezahlt / nicht bezahlt
            return jsonify(error="Schon in unserer Rechnung weiterberechnet – Betrag und Weiterberechnung erst nach Storno dieser Rechnung änderbar."), 409
        for f, n in (("nr", 60), ("notiz", 1000)):
            if f in b:
                r[f] = str(b[f] or "").strip()[:n]
        if "datum" in b:
            r["datum"] = str(b["datum"] or "")[:10] if re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(b["datum"] or "")) else ""
        if "netto" in b:
            r["netto"] = round(HF._f(b["netto"]), 2)
        if "weiter" in b:
            r["weiter"] = bool(b["weiter"])
        if b.get("status") in HF.STATUS:
            r["status"] = b["status"]
        c.execute("UPDATE honorar_fremd_re SET nr=?, datum=?, netto=?, status=?, weiter=?, notiz=? WHERE id=?",
                  (r["nr"], r["datum"], r["netto"], r["status"], r["weiter"], r["notiz"], rid))
        d = _detail(c, r["auftrag_id"])
    return jsonify(d)


@app.delete("/api/fremd-re/<int:rid>")
def re_loeschen(rid):
    with db.tx() as c:
        r = _re(c, rid)
        if not r:
            return jsonify(error="Rechnung nicht gefunden."), 404
        if r["re_id"]:
            return jsonify(error="Schon in unserer Rechnung weiterberechnet – erst die betreffende Rechnung stornieren."), 409
        pk = papierkorb.ablegen(c, "honorar_fremd_re", rid, "Fachplaner-Rechnung", f"Nr. {r['nr'] or '–'}", g.user["name"], "", KEY)
        d = _detail(c, r["auftrag_id"])
    return jsonify({**d, "papierkorb": pk})


@app.get("/api/fremd-re/<int:rid>/datei")
def re_datei(rid):
    with db.tx() as c:
        r = c.execute("SELECT r.datei, r.dateiname, r.ablage, a.project_id FROM honorar_fremd_re r JOIN honorar_fremd f ON f.id=r.fremd_id "
                      "JOIN honorar_auftrag a ON a.id=f.auftrag_id WHERE r.id=?", (rid,)).fetchone()
    if not r or not (r["datei"] or r["ablage"]):
        return jsonify(error="Keine Datei."), 404
    if r["datei"]:   # ältere Rechnung: PDF noch in der Datenbank
        daten = bytes(r["datei"])
    else:   # im Projektordner – gelesen über das Bautagebuch, das die Ablage kennt
        try:
            daten = C.bt_api("GET", "/api/dateien/datei?" + urllib.parse.urlencode({"project_id": r["project_id"], "pfad": r["ablage"]}), roh=True)
        except RuntimeError as e:
            return jsonify(error=f"Rechnung im Projektordner nicht lesbar: {e}"), 502
    name = (r["dateiname"] or r["ablage"].rsplit("/", 1)[-1] or f"Rechnung_{rid}.pdf").encode("latin-1", "ignore").decode("latin-1").replace('"', "")
    return Response(daten, mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="{name}"', "Cache-Control": "private, max-age=86400"})
