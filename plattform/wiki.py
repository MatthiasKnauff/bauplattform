"""Wiki des Büros – die App (besprochen am 13.11.2026, Mock „Wiki – Entwurf“).

Links die Kapitel mit ihren Einträgen (bpNav), in der Mitte der Eintrag, rechts Prüfung, Verlauf und Dateien (seite.js), darüber die
Befehlsleiste. Die Regeln (Status, Prüfrecht, KI) stehen in bpcore/wiki.py; Dateien liegen auf der Freigabe „Bauportal“ in „02 Wiki“
und gehen über das Bautagebuch (bautagebuch/modules/wiki.py). Festhalten aus anderen Apps: /api/bp/wiki (bpcore/wiki.py, Baustein wiki.js).
"""
import urllib.parse

from flask import Response, g, jsonify, redirect, request

from bpcore import ai, db, md_pdf, platform, sso, wiki as W
import common as C

app = C.make_app(__name__)
KEY = "wiki"


@app.before_request
def guard():
    p = request.path
    if p.startswith(("/static/", "/bp/")) or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base(KEY) + "/")), 401
        return redirect(C.login_url(request.url))
    if not sso.has_app(u, KEY):
        return C.gesperrt(KEY, "Für das Wiki ist dein Konto nicht freigeschaltet.")
    g.user = u


@app.get("/")
def index():
    return C.page("wiki.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


def _fehler(e):
    if isinstance(e, PermissionError):
        return jsonify(error=str(e)), 403
    if isinstance(e, LookupError):
        return jsonify(error=str(e)), 404
    return jsonify(error=str(e)), 400


@app.get("/api/eintraege")
def eintraege():
    with db.tx() as c:
        V = W.woche_offen(c)
        n = {s: c.execute("SELECT count(*) AS n FROM wiki_eintrag WHERE deleted='' AND status=?", (s,)).fetchone()["n"] for s in W.STATUS}
        return jsonify(eintraege=W.liste(c, request.args.get("q") or "", request.args.get("status") or ""), kapitel=W.kapitel(c), zahl=n,
                       darf_pruefen=W.darf_pruefen(g.user), woche=len(V["eintraege"]) if V else 0, ki=W.ki_von(c, g.user))


@app.post("/api/eintraege")
def neu():
    try:
        with db.tx() as c:
            eid = W.anlegen(c, g.user, request.get_json(silent=True) or {})
            return jsonify(W.eintrag(c, eid))
    except ValueError as e:
        return _fehler(e)


@app.get("/api/eintraege/<int:eid>")
def lesen(eid):
    with db.tx() as c:
        d = W.eintrag(c, eid)
    return jsonify(d) if d and not d["deleted"] else (jsonify(error="Eintrag nicht gefunden"), 404)


@app.put("/api/eintraege/<int:eid>")
def aendern(eid):
    """Felder oder Status ändern → Eintrag mit „vorher“ (für Rückgängig: dieselbe Anfrage mit den alten Werten)."""
    try:
        with db.tx() as c:
            d, vorher = W.aendern(c, g.user, eid, request.get_json(silent=True) or {})
    except (ValueError, LookupError, PermissionError) as e:
        return _fehler(e)
    return jsonify({**d, "vorher": vorher})


@app.delete("/api/eintraege/<int:eid>")
def loeschen(eid):
    with db.tx() as c:
        W.loeschen(c, eid)
    return jsonify(ok=True)


@app.post("/api/eintraege/<int:eid>/zurueck")
def zurueck(eid):
    with db.tx() as c:
        W.loeschen(c, eid, zurueck=True)
    return jsonify(ok=True)


@app.post("/api/eintraege/<int:eid>/lektorat")
def lektorat(eid):
    try:
        with db.tx() as c:
            return jsonify(W.lektorat(c, g.user, eid))
    except ai.AIError as e:
        return jsonify(error=f"Die KI konnte den Text nicht durchsehen: {e}"), 502
    except LookupError as e:
        return _fehler(e)


# ---------- Wochenzusammenfassung ----------
@app.get("/api/woche")
def woche():
    with db.tx() as c:
        return jsonify(W.woche_offen(c) or {})


@app.post("/api/woche")
def woche_neu():
    try:
        with db.tx() as c:
            return jsonify(W.woche_vorschlag(c, W.ki_von(c, g.user)))
    except ai.AIError as e:
        return jsonify(error=f"Die KI konnte nicht zusammenfassen: {e}"), 502
    except ValueError as e:
        return _fehler(e)


@app.post("/api/woche/uebernehmen")
def woche_uebernehmen():
    b = request.get_json(silent=True) or {}
    nr = b.get("nummern")
    try:
        with db.tx() as c:
            n = W.woche_uebernehmen(c, g.user, [int(x) for x in nr] if isinstance(nr, list) else None)
    except ValueError as e:
        return _fehler(e)
    return jsonify(ok=True, uebernommen=n)


@app.delete("/api/woche")
def woche_verwerfen():
    with db.tx() as c:
        c.execute("DELETE FROM bp_store WHERE key='wiki:woche'")
    return jsonify(ok=True)


# ---------- Dateien (auf der Freigabe „Bauportal“, über das Bautagebuch) ----------
@app.post("/api/eintraege/<int:eid>/datei")
def datei_neu(eid):
    try:
        return jsonify(C.bt_api("POST", f"/api/wiki/{eid}/datei", request.get_json(silent=True) or {}))
    except RuntimeError as e:
        return jsonify(error=str(e)), 502


@app.get("/api/datei/<int:did>")
def datei(did):
    with db.tx() as c:
        d = c.execute("SELECT name, mime FROM wiki_datei WHERE id=? AND deleted=''", (did,)).fetchone()
    if not d:
        return jsonify(error="Datei nicht gefunden"), 404
    try:
        roh = C.bt_api("GET", f"/api/wiki/datei/{did}", roh=True)
    except RuntimeError as e:
        return jsonify(error=str(e)), 502
    return Response(roh, mimetype=d["mime"] or "application/octet-stream",
                    headers={"Cache-Control": "private, max-age=600", "Content-Disposition": "inline; filename*=UTF-8''" + urllib.parse.quote(d["name"])})


@app.get("/api/datei/<int:did>/bild")
def datei_bild(did):
    with db.tx() as c:
        r = c.execute("SELECT vorschau FROM wiki_datei WHERE id=?", (did,)).fetchone()
    if not r or not r["vorschau"]:
        return jsonify(error="Kein Vorschaubild"), 404
    return Response(bytes(r["vorschau"]), mimetype="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})


@app.delete("/api/datei/<int:did>")
def datei_weg(did):
    """Nur den Verweis entfernen – die Datei bleibt auf der Freigabe (Rückgängig: …/zurueck)."""
    with db.tx() as c:
        c.execute("UPDATE wiki_datei SET deleted=? WHERE id=?", (W._jetzt(), did))
    return jsonify(ok=True)


@app.post("/api/datei/<int:did>/zurueck")
def datei_zurueck(did):
    with db.tx() as c:
        c.execute("UPDATE wiki_datei SET deleted='' WHERE id=?", (did,))
    return jsonify(ok=True)


@app.get("/api/pdf")
def pdf():
    """Das ganze Wiki als PDF (dasselbe legen die Dienste jede Woche in „Pläne & Dateien“ → „Büro“ → „Wiki“ ab)."""
    with db.tx() as c:
        daten = md_pdf.pdf(W.markdown(c), "Wiki des Büros")
    return Response(daten, mimetype="application/pdf", headers={"Content-Disposition": "inline; filename=Wiki.pdf", "Cache-Control": "no-store"})
