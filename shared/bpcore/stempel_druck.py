"""Stempel und Unterschrift auf jeder Druckseite (Baukasten druck.js, beschlossen am 15.11.2026, Mock „Stempeln überall“, Variante A).

Die Druckseite holt das PDF der App wie immer und schickt es hierher: mit „info“ kommt die Lage zurück (Vorschlag oder die gemerkte, die der
Browser mitschickt), sonst das gestempelte PDF. Gemerkt wird nur die Lage – im Browser, je Art des Ausdrucks; das PDF bleibt nirgends liegen.
Stempel: Bürostempel, Prüfstempel (Datum und Name), „Zahlbetrag siehe Anlage“, die eigene Unterschrift (rot) – dieselben wie in der Rechnungsfreigabe.
"""
import json

from . import db, konto, stempel
from . import stempel_paket as SP

TEIL = "doc"   # ein Ausdruck = ein Teil (stempellage.js kennt Teile wie im Paket der Rechnungsfreigabe)


def vorschlag(n):
    """Vorgesehene Stellen: letzte Seite unten – Bürostempel links, Unterschrift rechts daneben."""
    s = max(0, n - 1)
    return [SP._ob("doc-buero", "buero", TEIL, s, 0.08, 0.84, 0.3), SP._ob("doc-sig", "sig", TEIL, s, 0.55, 0.86, 0.22)]


def zusammen(pdfs):
    """Mehrere PDFs hintereinander (Anlagen an einen Ausdruck, z. B. die Türliste)."""
    import io
    from pypdf import PdfReader, PdfWriter
    w = PdfWriter()
    for b in pdfs:
        for pg in PdfReader(io.BytesIO(b)).pages:
            w.add_page(pg)
    out = io.BytesIO(); w.write(out); return out.getvalue()


def routen(bp, uid, felder):
    """POST /api/bp/pdf/zusammen – pdf (mehrere Dateien) → ein PDF, in der Reihenfolge (Anlagen der Druckseite).
    POST /api/bp/stempeln – pdf (Datei), lage (JSON, sonst Vorschlag), info=1 → {teile, lage, vorhanden}, sonst das gestempelte PDF."""
    from flask import Response, jsonify, request

    @bp.post("/api/bp/pdf/zusammen")
    def bp_pdf_zusammen():
        u, _i = uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        L = [f.read(60 * 1024 * 1024) for f in request.files.getlist("pdf")[:12]]
        if not L or not all(b.startswith(b"%PDF") for b in L):
            return jsonify(error="Kein PDF."), 400
        try:
            return Response(zusammen(L), mimetype="application/pdf", headers={"Cache-Control": "no-store"})
        except Exception:
            return jsonify(error="Die PDFs ließen sich nicht zusammenfügen."), 400

    @bp.post("/api/bp/stempeln")
    def bp_stempeln():
        u, i = uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        f = request.files.get("pdf")
        pdf = f.read(60 * 1024 * 1024) if f else b""
        if not pdf.startswith(b"%PDF"):
            return jsonify(error="Kein PDF."), 400
        try:
            n = SP.seiten(pdf)
        except Exception:
            return jsonify(error="Das PDF ließ sich nicht lesen."), 400
        try:
            gem = SP.bereinigen(json.loads(request.form.get("lage") or "null"))
        except ValueError:
            gem = []
        lage = [{**o, "teil": TEIL} for o in gem] or vorschlag(n)
        with db.tx() as c:
            if request.form.get("info"):
                da = {x["art"]: x["vorhanden"] for x in stempel.liste(c)}
                da["sig"] = bool(konto.signatur(c, i))
                return jsonify(teile=[{"teil": TEIL, "von": 0, "n": n}], lage=lage, vorhanden=da)
            bilder = {a: stempel.holen(c, a) for a in ("buero", "pruef", "zahlbetrag")}
            bilder["sig"] = konto.signatur(c, i)
        out = SP.anwenden(pdf, lage, {TEIL: 0}, bilder.get, felder("pruef", u))
        return Response(out, mimetype="application/pdf", headers={"Cache-Control": "no-store"})
