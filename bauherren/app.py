"""Bauherrenportal (beschlossen am 15.11.2026, Entwurf „Bauherrenportal: Aufbau“): läuft auf einem eigenen Server (Google Cloud,
Frankfurt; Test auf eigenem Server im Büro) und erreicht das Büro NIE. Der Kern der Bauplattform schiebt freigegebene Pakete hierher
und holt den Eingangskorb ab (bpcore/bauherren.py, Dienst bautagebuch/core/bauherren_dienst.py).

Eigene kleine Datenbank (SQLite unter /data), nur freigegebene Kopien und die Konten der Bauherr:innen. Kein Zugang zur Büro-Datenbank,
keine Zugangsdaten des Büros – auch keine Mail-Zugänge: Anmeldelinks gehen als Auftrag „mail“ in den Eingangskorb, der Kern verschickt sie.

Kern (Schlüssel in BH_SCHLUESSEL, Kopf „Authorization: Bearer …“):
  POST /api/kern/sync      {pakete: [{id, pid, projekt, art, titel, stand, daten}], loeschen: [id], konten: [{email, name, projekte, aktiv}]}
  GET  /api/kern/eingang   was Bauherr:innen geschickt haben (und Mail-Aufträge) · POST /api/kern/eingang/quittung {ids}
Bauherr:innen: Anmeldelink per Mail, Kennwort + zweiter Faktor (Authenticator-App), QR-Code wie bei Nextcloud (bauherren/anmeldung.py).
"""
import os, sys

from urllib.parse import quote

from flask import Flask, Response, abort, g, jsonify, request, send_from_directory

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import anmeldung as A   # noqa: E402
import speicher as S   # noqa: E402

HIER = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 80 * 1024 * 1024   # Häppchen des Kerns (Pläne als PDF, bis 20 MB + base64) und Dateien der Bauherr:innen (bis 50 MB)


@app.after_request
def _kopf(r):
    r.headers["X-Content-Type-Options"] = "nosniff"
    r.headers["Referrer-Policy"] = "no-referrer"
    r.headers["X-Frame-Options"] = "DENY"
    r.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    if request.path.startswith("/api/") and not (request.path.startswith("/api/datei/") and r.status_code == 200):   # Dateien: eigene Angabe (Adresse mit ?v=)
        r.headers["Cache-Control"] = "no-store"
    return r


def _fehler(text, code=400):
    return jsonify({"error": text}), code


# ---------- Kern ----------
def _kern():
    if not A.kern_ok(request.headers.get("Authorization", "")):
        abort(401)


@app.post("/api/kern/sync")
def kern_sync():
    _kern()
    b = request.get_json(silent=True) or {}
    with S.tx() as c:
        n = S.sync(c, b)
        z = S.zuletzt(c)
    return jsonify({"ok": True, **n, "zuletzt": z})


@app.get("/api/kern/eingang")
def kern_eingang():
    _kern()
    with S.tx() as c:
        return jsonify(S.eingang_offen(c))


@app.get("/api/kern/eingang/<int:eid>/datei")
def kern_eingang_datei(eid):
    _kern()
    with S.tx() as c:
        data = S.eingang_inhalt(c, eid)
    if data is None:
        return _fehler("Nicht gefunden.", 404)
    return Response(data, mimetype="application/octet-stream")


@app.post("/api/kern/eingang/quittung")
def kern_quittung():
    _kern()
    ids = [int(x) for x in ((request.get_json(silent=True) or {}).get("ids") or []) if str(x).isdigit()][:2000]
    with S.tx() as c:
        S.eingang_quittung(c, ids)
    return jsonify({"ok": True})


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "app": "bauherren"})


# ---------- Anmeldung ----------
def _ich(pflicht=True):
    with S.tx() as c:
        k = A.sitzung(c, request.cookies.get(A.KEKS, ""))
    if pflicht and (not k or k["offen_code"]):   # nach dem Anmeldelink fehlt noch der zweite Faktor
        abort(401)
    g.ich = k
    return k


def _post_ok():   # gegen fremde Formulare: eigene Kopfzeile nötig (geht nur aus unserem Skript)
    if request.headers.get("X-BH") != "1":
        abort(403)


@app.post("/api/anmelden/link")
def anmelden_link():
    _post_ok()
    mail = str((request.get_json(silent=True) or {}).get("email") or "").strip().lower()[:200]
    if not A.drossel("link:" + request.remote_addr, 10, 600) or not A.drossel("link:" + mail, 3, 600):
        return _fehler("Zu viele Versuche – bitte in ein paar Minuten noch einmal.", 429)
    with S.tx() as c:
        A.link_senden(c, mail, request.host_url)
    return jsonify({"ok": True, "text": "Wenn die Adresse bei uns eingetragen ist, kommt gleich eine Mail mit dem Anmeldelink (gilt 15 Minuten)."})


@app.get("/l/<token>")
def link_einloesen(token):
    with S.tx() as c:
        r = A.link_einloesen(c, token, request.headers.get("User-Agent", ""))
    if not r:
        return _seite("Der Link ist abgelaufen oder wurde schon benutzt. Bitte einen neuen anfordern.")
    resp = app.redirect("/" if not r.get("zweiter") else "/#code")
    return A.keks_setzen(resp, r)


@app.post("/api/anmelden/kennwort")
def anmelden_kennwort():
    _post_ok()
    b = request.get_json(silent=True) or {}
    mail = str(b.get("email") or "").strip().lower()[:200]
    if not A.drossel("pw:" + request.remote_addr, 20, 600) or not A.drossel("pw:" + mail, 8, 600):
        return _fehler("Zu viele Versuche – bitte in ein paar Minuten noch einmal.", 429)
    with S.tx() as c:
        r = A.kennwort_pruefen(c, mail, str(b.get("kennwort") or ""), str(b.get("code") or ""), request.headers.get("User-Agent", ""))
    if r == "code":
        return jsonify({"code": True})
    if not r:
        return _fehler("Adresse, Kennwort oder Code stimmen nicht.", 401)
    return A.keks_setzen(jsonify({"ok": True}), r)


@app.post("/api/anmelden/code")   # zweiter Faktor nach dem Anmeldelink
def anmelden_code():
    _post_ok()
    if not A.drossel("code:" + request.remote_addr, 10, 600):
        return _fehler("Zu viele Versuche.", 429)
    with S.tx() as c:
        r = A.code_nachreichen(c, request.cookies.get(A.KEKS, ""), str((request.get_json(silent=True) or {}).get("code") or ""))
    return jsonify({"ok": True}) if r else _fehler("Der Code stimmt nicht.", 401)


@app.post("/api/qr/neu")   # PC ohne Anmeldung: QR-Code zeigen, das angemeldete Handy erlaubt
def qr_neu():
    _post_ok()
    if not A.drossel("qr:" + request.remote_addr, 20, 600):
        return _fehler("Zu viele Versuche.", 429)
    with S.tx() as c:
        t, geheim = A.qr_neu(c)
    resp = jsonify({"token": t, "svg": A.qr_svg(request.host_url.rstrip("/") + "/q/" + t)})
    resp.set_cookie("bh_qr", geheim, max_age=A.QR_GUELTIG, httponly=True, secure=A.SICHER, samesite="Strict")
    return resp


@app.get("/api/qr/<token>")   # PC fragt nach: erlaubt? (nur mit dem Geheimnis, das nur dieser Browser hat)
def qr_stand(token):
    with S.tx() as c:
        r = A.qr_abholen(c, token, request.cookies.get("bh_qr", ""), request.headers.get("User-Agent", ""))
    if r is None:
        return jsonify({"fertig": False})
    if r is False:
        return _fehler("Der Code ist abgelaufen.", 410)
    return A.keks_setzen(jsonify({"fertig": True}), r)


@app.get("/q/<token>")   # Handy hat den Code gescannt
def qr_handy(token):
    return send_from_directory(os.path.join(HIER, "static"), "index.html")


@app.post("/api/qr/<token>/erlauben")
def qr_erlauben(token):
    _post_ok()
    k = _ich()
    with S.tx() as c:
        ok = A.qr_erlauben(c, token, k["id"])
    return jsonify({"ok": True}) if ok else _fehler("Der Code ist abgelaufen – bitte am PC neu anzeigen lassen.", 410)


@app.post("/api/koppeln")   # angemeldeter PC: QR-Code, mit dem sich das Handy einmal anmeldet
def koppeln():
    _post_ok()
    k = _ich()
    with S.tx() as c:
        t = A.link_neu(c, k["id"], "koppeln", 300)
    return jsonify({"svg": A.qr_svg(request.host_url.rstrip("/") + "/l/" + t), "gueltig": 300})


@app.post("/api/abmelden")
def abmelden():
    _post_ok()
    with S.tx() as c:
        A.sitzung_ende(c, request.cookies.get(A.KEKS, ""))
    r = jsonify({"ok": True})
    r.delete_cookie(A.KEKS)
    return r


# ---------- Konto ----------
@app.post("/api/konto/kennwort")
def konto_kennwort():
    _post_ok()
    k = _ich()
    neu = str((request.get_json(silent=True) or {}).get("neu") or "")
    if len(neu) < 10:
        return _fehler("Bitte mindestens 10 Zeichen.")
    with S.tx() as c:
        A.kennwort_setzen(c, k["id"], neu)
    return jsonify({"ok": True})


@app.post("/api/konto/2fa/start")
def zfa_start():
    _post_ok()
    k = _ich()
    with S.tx() as c:
        geheim, uri = A.totp_start(c, k["id"], k["email"])
    return jsonify({"geheim": geheim, "svg": A.qr_svg(uri)})


@app.post("/api/konto/2fa/bestaetigen")
def zfa_ok():
    _post_ok()
    k = _ich()
    with S.tx() as c:
        ok = A.totp_bestaetigen(c, k["id"], str((request.get_json(silent=True) or {}).get("code") or ""))
    return jsonify({"ok": True}) if ok else _fehler("Der Code stimmt nicht – bitte die Uhrzeit am Handy prüfen.")


@app.post("/api/konto/2fa/aus")
def zfa_aus():
    _post_ok()
    k = _ich()
    with S.tx() as c:
        ok = A.totp_aus(c, k["id"], str((request.get_json(silent=True) or {}).get("code") or ""))
    return jsonify({"ok": True}) if ok else _fehler("Der Code stimmt nicht.")


# ---------- Inhalte ----------
@app.get("/api/ich")
def ich():
    k = _ich(False)
    if not k or k["offen_code"]:
        with S.tx() as c:   # Logo und Name des Büros auch auf der Anmeldeseite (nichts Vertrauliches)
            return jsonify({"angemeldet": False, "zweiter": bool(k), "aussehen": S.aussehen(c)})
    with S.tx() as c:
        return jsonify({"angemeldet": True, "konto": {"name": k["name"], "email": k["email"], "kennwort": bool(k["pw"]), "zfa": bool(k["totp"])},
                        "projekte": S.projekte(c, k["id"]), "aussehen": S.aussehen(c)})


@app.get("/api/paket/<pid>/<path:pk>")
def paket(pid, pk):
    k = _ich()
    with S.tx() as c:
        p = S.paket(c, k["id"], pid, pk)
    return jsonify(p) if p else _fehler("Nicht gefunden.", 404)


@app.get("/api/datei/<pid>/<path:pk>/<int:nr>")
def datei(pid, pk, nr):
    """PDF/Bild an einem freigegebenen Paket (Pläne, Rechnungen, Tagesbericht)."""
    k = _ich()
    with S.tx() as c:
        r = S.datei(c, k["id"], pid, pk, nr)
    if not r:
        return _fehler("Nicht gefunden.", 404)
    mime = r["mime"] if r["mime"] in ("application/pdf", "image/jpeg", "image/png", "image/webp") else "application/octet-stream"
    return Response(bytes(r["inhalt"] or b""), mimetype=mime, headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(r['name'] or 'Datei')}",
                                                                       "Cache-Control": "private, max-age=3600"})   # Adresse trägt den Eingang (?v=) – neue Freigabe = neue Adresse


@app.post("/api/hochladen")
def hochladen():
    """Datei an das Büro (Formular: pid, text, datei) – landet im Eingangskorb, der Kern holt sie ab."""
    _post_ok()
    k = _ich()
    if not A.drossel("hoch:%s" % k["id"], 30, 3600):
        return _fehler("Zu viele Dateien in kurzer Zeit – bitte später weiter.", 429)
    f = request.files.get("datei")
    if not f:
        return _fehler("Bitte eine Datei wählen.")
    pid = str(request.form.get("pid") or "")
    with S.tx() as c:
        err = S.hochladen(c, k["id"], pid, os.path.basename(f.filename or "Datei").strip()[:200] or "Datei", f.read(),
                          str(request.form.get("text") or "").strip(), k["name"] or k["email"], k["email"])
    return _fehler(err, 403 if "Zugang" in err else 400) if err else jsonify({"ok": True, "text": "Danke – die Datei ist angekommen. Das Büro bekommt sie in Kürze."})


@app.get("/api/hochgeladen/<pid>")
def hochgeladen(pid):
    k = _ich()
    with S.tx() as c:
        if not S.darf(c, k["id"], pid):
            abort(403)
        return jsonify(S.hochgeladen(c, k["id"], pid))


@app.post("/api/nachricht")
def nachricht():
    _post_ok()
    k = _ich()
    if not A.drossel("msg:%s" % k["id"], 30, 3600):
        return _fehler("Zu viele Nachrichten in kurzer Zeit.", 429)
    b = request.get_json(silent=True) or {}
    text = str(b.get("text") or "").strip()[:5000]
    if not text:
        return _fehler("Bitte etwas schreiben.")
    with S.tx() as c:
        if not S.darf(c, k["id"], str(b.get("pid") or "")):
            abort(403)
        if not S.bereiche(c, str(b.get("pid")))["nachricht"] or not S.rechte(c, k["id"], str(b.get("pid")))["nachricht"]:
            return _fehler("Nachrichten sind für dieses Projekt nicht eingeschaltet.", 403)
        S.eingang_neu(c, "nachricht", str(b.get("pid")), {"text": text, "von": k["name"] or k["email"], "email": k["email"]}, k["id"])
    return jsonify({"ok": True, "text": "Danke – Ihre Nachricht ist angekommen."})


# ---------- Seiten ----------
def _seite(text):
    return f"""<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/static/bh.css">
<title>Bauherrenportal</title><main class="bh-m"><p>{text}</p><p><a href="/">Zur Anmeldung</a></p></main>"""


@app.get("/")
def start():
    return send_from_directory(os.path.join(HIER, "static"), "index.html")


@app.get("/static/<path:name>")
def statisch(name):
    if name in ("ansicht3d.js", "zeitplan.js"):   # 3D-Betrachter und Bauzeitenplan aus dem Baukasten (im Image unter /app/bpcore/head, im Repo unter shared/bpcore/head)
        d = next((x for x in (os.path.join(HIER, "..", "bpcore", "head"), os.path.join(HIER, "..", "shared", "bpcore", "head")) if os.path.isfile(os.path.join(x, name))), None)
        if not d:
            abort(404)
        r = send_from_directory(d, name, max_age=0, mimetype="text/javascript")
        r.headers["Cache-Control"] = "no-cache"
        return r
    if name in ("pdfjs/pdf.mjs", "pdfjs/pdf.worker.mjs"):   # Pläne und PDFs im Portal ansehen (pdf.js aus plattform/static/vendor, im Image unter /app/plattform)
        d = next((x for x in (os.path.join(HIER, "..", "plattform", "static", "vendor", "pdfjs"),) if os.path.isfile(os.path.join(x, name[6:]))), None)
        if not d:
            abort(404)
        r = send_from_directory(d, name[6:], max_age=86400, mimetype="text/javascript")
        return r
    if name not in ("index.html", "bh.js", "bh.css"):
        abort(404)
    r = send_from_directory(os.path.join(HIER, "static"), name, max_age=0)
    r.headers["Cache-Control"] = "no-cache"
    return r


with S.tx() as _c:
    S.einrichten(_c)
