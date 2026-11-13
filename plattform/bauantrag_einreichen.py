"""Bauantrag einreichen (besprochen am 13.11.2026, F5): Weg festhalten (Papier, Bauportal, E-Mail), Datum, Aktenzeichen, Notiz;
jede Einreichung steht im Verlauf des Antrags. Auf Wunsch liegen danach das Antragspaket und eine Begleitliste im Projektordner
(über die Ablage des Bautagebuchs – der Testserver schreibt dort nicht).

POST /api/antraege/<aid>/einreichen  {weg: papier|bauportal|email, datum, aktenzeichen, notiz, ablegen}
Gespeichert in bauantrag.daten._einreichungen (Liste) und _eingereicht (Datum für „Änderung zum Bauantrag vom …“).
"""
import base64
import io
import json
import re
import time

from flask import g, jsonify, request

from bpcore import bauantrag as BA, bauantrag_anlagen as BAN, db
import common as C
from bauantrag import KEY, _antrag, _detail, _j, app
from bauantrag_paket import _paket_bauen, _w

WEGE = {"papier": "auf Papier (Post oder persönlich)", "bauportal": "über das Bauportal", "email": "per E-Mail"}


def begleitliste_pdf(kopf, G):
    """Begleitliste der Einreichung: wann, wie, Aktenzeichen – und was eingereicht wurde (Anlagen mit Nummer und Stand)."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    y = A4[1] - 30 * mm
    cv.setFont("Helvetica-Bold", 18); cv.drawString(25 * mm, y, "Begleitliste der Einreichung"); y -= 10 * mm
    for k, v in kopf:
        if not v:
            continue
        cv.setFont("Helvetica-Bold", 10.5); cv.drawString(25 * mm, y, k)
        cv.setFont("Helvetica", 10.5); cv.drawString(65 * mm, y, str(v)[:85]); y -= 6 * mm
    y -= 5 * mm
    cv.setFont("Helvetica-Bold", 10); cv.drawString(25 * mm, y, "Nr."); cv.drawString(42 * mm, y, "Inhalt"); cv.drawRightString(185 * mm, y, "Stand"); y -= 3 * mm
    cv.setLineWidth(0.6); cv.line(25 * mm, y, 185 * mm, y); y -= 7 * mm
    for s in G:
        for e in [{"nr": str(s["nr"]), "titel": s["titel"], "kopf": True}] * bool(s.get("titel")) + s.get("eintraege", []):
            if y < 25 * mm:
                cv.showPage(); y = A4[1] - 25 * mm
            cv.setFont("Helvetica-Bold" if e.get("kopf") else "Helvetica", 10.5)
            cv.drawString(25 * mm, y, str(e.get("nr") or "")); cv.drawString(42 * mm, y, str(e.get("titel") or "")[:80])
            if not e.get("kopf"):
                cv.drawRightString(185 * mm, y, BAN.STAND.get(e.get("stand"), "im Paket") if e.get("art") == "nennen" else "im Paket")
            y -= 6.5 * mm
    cv.showPage(); cv.save()
    return buf.getvalue()


@app.post("/api/antraege/<int:aid>/einreichen")
def einreichen(aid):
    b = request.get_json(silent=True) or {}
    weg = b.get("weg") if b.get("weg") in WEGE else "papier"
    datum = b.get("datum") if re.match(r"^\d{4}-\d{2}-\d{2}$", str(b.get("datum") or "")) else time.strftime("%Y-%m-%d")
    az, notiz = str(b.get("aktenzeichen") or "").strip()[:80], str(b.get("notiz") or "").strip()[:500]
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        p = c.execute("SELECT name FROM projects WHERE id=?", (a["project_id"],)).fetchone()
        W, d = _w(c, a)
        paket, fehl = _paket_bauen(c, a, wd=(W, d)) if b.get("ablegen") else (None, "")
    ein = {"weg": weg, "datum": datum, "aktenzeichen": az, "notiz": notiz, "von": C.full_name(g.user), "wann": time.strftime("%Y-%m-%d %H:%M")}
    ablage, hinweis = [], ""
    if b.get("ablegen"):   # Antragspaket und Begleitliste in den Projektordner (Ordner der Ablage für „bauantrag“)
        kz = (re.match(r"^[A-Za-z]{1,4}\d{2,6}", ((p["name"] if p else "") or "").strip()) or [""])[0]
        vorn = f"{kz + ' ' if kz else ''}{a['name']} – eingereicht {datum}"[:120]
        kopf = [("Projekt", p["name"] if p else ""), ("Antrag", a["name"]), ("Verfahren", BA.VERFAHREN.get(a["verfahren"], "")),
                ("Eingereicht am", f"{datum[8:10]}.{datum[5:7]}.{datum[:4]}"), ("Weg", WEGE[weg]), ("Aktenzeichen", az), ("Notiz", notiz), ("Von", ein["von"])]
        teile = ([(vorn + ".pdf", paket)] if paket else []) + [(vorn + " – Begleitliste.pdf", begleitliste_pdf(kopf, d["gliederung"]))]
        for name, pdf in teile:
            pfad, f_ = C.projektordner_ablegen({"project_id": a["project_id"], "art": "bauantrag", "name": name, "datei": base64.b64encode(pdf).decode()})
            if pfad:
                ablage.append(pfad)
            elif f_ == "testserver":
                hinweis = "Testserver: nichts im Projektordner abgelegt."
            else:
                hinweis = f"Nicht abgelegt: {f_}"
        if not paket and fehl:
            hinweis = (hinweis + " " if hinweis else "") + f"Antragspaket fehlt: {fehl}"
    ein["ablage"] = ablage
    with db.tx() as c:
        a = _antrag(c, aid)
        daten = _j(a["daten"], {})
        daten["_einreichungen"] = (daten.get("_einreichungen") or [])[-49:] + [ein]
        daten.setdefault("_eingereicht", datum)   # „Änderung zum Bauantrag vom …“ bezieht sich auf die erste Einreichung
        an_ = (daten.setdefault("_paket", {}) if isinstance(daten.get("_paket", {}), dict) else {}).setdefault("anschreiben", {})
        if az and isinstance(an_, dict) and not an_.get("aktenzeichen"):   # Aktenzeichen auch fürs Anschreiben späterer Änderungen/Ergänzungen
            an_["aktenzeichen"] = az
            daten["_einreichungen"][-1]["az_gesetzt"] = True   # Rückgängig nimmt es wieder heraus
        c.execute("UPDATE bauantrag SET status='eingereicht', daten=?, geaendert=? WHERE id=?", (json.dumps(daten), time.strftime("%Y-%m-%d %H:%M:%S"), aid))
        out = _detail(c, _antrag(c, aid))
    C.audit(g.user["name"], KEY, "Bauantrag eingereicht", f"{a['name']} · {WEGE[weg]} · {datum}" + (f" · Az. {az}" if az else ""))
    return jsonify({**out, "hinweis": hinweis})


@app.delete("/api/antraege/<int:aid>/einreichen")
def einreichen_zurueck(aid):
    """Rückgängig: letzte Einreichung aus dem Verlauf, Stand wieder „Entwurf“ (abgelegte Dateien bleiben im Projektordner)."""
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        daten = _j(a["daten"], {})
        E0 = daten.get("_einreichungen") or []
        E = E0[:-1]
        daten["_einreichungen"] = E
        if E0 and E0[-1].get("az_gesetzt") and isinstance((daten.get("_paket") or {}).get("anschreiben"), dict):
            daten["_paket"]["anschreiben"].pop("aktenzeichen", None)
        if not E:
            daten.pop("_eingereicht", None)
        c.execute("UPDATE bauantrag SET status='entwurf', daten=?, geaendert=? WHERE id=?", (json.dumps(daten), time.strftime("%Y-%m-%d %H:%M:%S"), aid))
        return jsonify(_detail(c, _antrag(c, aid)))
