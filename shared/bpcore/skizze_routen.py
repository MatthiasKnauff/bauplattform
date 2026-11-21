"""Routen fürs gemeinsame Markieren und Unterschreiben auf Plänen (PDF-Ansicht aller Apps, head.js → H.ansehen) – aus head.py ausgelagert
(17.11.2026, Spielraum dort aufgebraucht). Die Logik steht in skizze.py; Unterschriften als Ebene (art „bild“) siehe dort und markwahl.js.

Eingehängt in head.blueprint():  skizze_routen.routen(bp, user, _stempel_felder)
"""
from flask import Response, jsonify, request

from . import dateien, db, konto, mail, skizze, stempel


def routen(bp, user, _stempel_felder):
    # ---- Gemeinsam skizzieren (Ansicht für PDFs, siehe skizze.py)
    @bp.post("/api/bp/skizze")
    def skizze_neu():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        f = request.files.get("datei")
        try:
            with db.tx() as c:
                sid = skizze.neu(c, u, request.form.get("name") or (f.filename if f else ""), f.read() if f else b"")
        except ValueError as e:
            return jsonify(error=str(e)), 400
        return jsonify(id=sid)

    @bp.route("/api/bp/skizze/<sid>", methods=["GET", "POST"])
    def skizze_stand(sid):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "POST" or request.args.get("beitreten") or not skizze.darf(c, sid, u):   # per Einladung oder Link – der Link genügt
                if not skizze.beitreten(c, sid, u):
                    return jsonify(error="Diese gemeinsame Skizze gibt es nicht (mehr)."), 404
            return jsonify(skizze.stand(c, sid, u, request.args.get("seit", type=int) or 0))

    @bp.get("/api/bp/skizze-dauerhaft")
    def skizze_dauerhaft_fuer():
        """Gibt es zu diesem Plan dauerhafte Markierungen? (Ansicht fragt beim Öffnen jedes PDFs)"""
        if not user():
            return jsonify(error="Nicht angemeldet"), 401
        a = request.args
        with db.tx() as c:
            return jsonify(id=skizze.dauerhaft_fuer(c, a.get("hash") or "", a.get("name") or "", a.get("groesse", type=int) or 0))

    @bp.post("/api/bp/skizze/<sid>/dauerhaft")
    def skizze_dauerhaft(sid):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if not skizze.darf(c, sid, u):
                return jsonify(error="Keine Einladung zu dieser Skizze."), 403
            skizze.dauerhaft_setzen(c, sid, bool((request.get_json(silent=True) or {}).get("an")))
        return jsonify(ok=True)

    @bp.get("/api/bp/skizze/<sid>/datei")
    def skizze_datei(sid):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if not skizze.darf(c, sid, u) and not skizze.beitreten(c, sid, u):   # wer den Link hat, ist dabei – keine Einladung nötig
                return jsonify(error="Diese gemeinsame Skizze gibt es nicht (mehr)."), 404
            roh = dateien.inhalt(c, c.execute("SELECT datei, datei_ref FROM skizze WHERE id=?", (sid,)).fetchone(), "datei")
        return Response(roh, mimetype="application/pdf", headers={"Cache-Control": "private, max-age=3600"})

    @bp.get("/api/bp/skizze/<sid>/pdf")
    def skizze_pdf(sid):
        from urllib.parse import quote as q
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if not skizze.darf(c, sid, u):
                return jsonify(error="Keine Einladung zu dieser Skizze."), 403
            try:
                name, pdf = skizze.pdf_mit_markierungen(c, sid)
                us = skizze.hat_unterschrift(c, sid)
            except ImportError:
                return jsonify(error="PDF mit Markierungen ist in dieser App nicht verfügbar."), 501
        n = name.rsplit(".", 1)[0] + (" (unterschrieben).pdf" if us else " (markiert).pdf")
        return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f"attachment; filename*=UTF-8''{q(n)}"})

    @bp.post("/api/bp/skizze/<sid>/strich")
    def skizze_strich(sid):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if not skizze.darf(c, sid, u):
                return jsonify(error="Keine Einladung zu dieser Skizze."), 403
            d = request.get_json(silent=True) or {}
            if d.get("art") == "bild":   # Unterschrift/Stempel als Ebene: das Bild holt der Kern selbst („meine“, Stempel des Büros) – bleibt immer am Plan
                import base64
                q = str(d.get("quelle") or "")
                png = konto.signatur(c, u["id"]) if q == "meine" else stempel.holen(c, q[8:]) if q.startswith("stempel:") else None
                if q == "meine" and not png:
                    return jsonify(error="Noch keine Unterschrift hinterlegt – unter „Mein Konto“ ein Foto hochladen oder hier zeichnen."), 400
                if q.startswith("stempel:") and not png:
                    return jsonify(error="Dieser Stempel ist noch nicht hinterlegt (Verwaltung → Büro-Einstellungen → Firma & Logo)."), 400
                if png:   # „meine“ und Stempel: Bild und Felder vom Kern; sonst (gezeichnet, verschoben) wie geschickt
                    d["png"] = base64.b64encode(png).decode()
                    d["stempel"] = q[8:] if q.startswith("stempel:") else ""
                    d["felder"] = [list(f) for f in _stempel_felder(d["stempel"], u)] if d["stempel"] and d.get("eintragen") else []
            try:
                r = skizze.strich(c, sid, u, d)
                if d.get("art") == "bild":
                    skizze.dauerhaft_setzen(c, sid, True)
                return jsonify(r)
            except ValueError as e:
                return jsonify(error=str(e)), 400

    @bp.post("/api/bp/skizze/<sid>/loeschen")
    def skizze_loeschen(sid):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if not skizze.darf(c, sid, u):
                return jsonify(error="Keine Einladung zu dieser Skizze."), 403
            return jsonify(n=skizze.loeschen(c, sid, u, (request.get_json(silent=True) or {}).get("was")))

    @bp.post("/api/bp/skizze/<sid>/zeiger")
    def skizze_zeiger(sid):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if not skizze.darf(c, sid, u):
                return jsonify(error="Keine Einladung"), 403
            skizze.zeiger(c, sid, u, request.get_json(silent=True) or {})
        return jsonify(ok=True)

    @bp.post("/api/bp/skizze/<sid>/einladen")
    def skizze_einladen(sid):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {}
        an = [int(x) for x in b.get("an") or [] if str(x).isdigit()][:20]
        with db.tx() as c:
            if not skizze.darf(c, sid, u):
                return jsonify(error="Keine Einladung"), 403
            skizze.einladen(c, sid, u, an)
            empf = [r for r in c.execute("SELECT id, name, email FROM users WHERE active=1").fetchall() if r["id"] in an and (r["email"] or "").strip()] if b.get("mail") else []
            sk = c.execute("SELECT name FROM skizze WHERE id=?", (sid,)).fetchone()
            cf = mail.conf(c)
            von, absname = konto.absender(c, u, cf) if empf else ("", "")
        gesendet, fehl = [], []
        if empf:   # zusätzlich per E-Mail – mit dem Link, der direkt in die gemeinsame Markierung führt
            link = str(b.get("link") or "")[:500]
            plan = (sk["name"] if sk else "") or "einen Plan"
            for r in empf:
                try:
                    mail.app("plaene", cf, r["email"], f"Gemeinsam markieren: {plan}",
                              f"Hallo {r['name'] or ''},\n\n{u['name']} lädt dich ein, gemeinsam auf „{plan}“ zu markieren.\n\n"
                              f"Öffnen: {link}\n\nStriche und Zeiger erscheinen bei allen gleichzeitig.", sender=absname or "Bauplattform", from_addr=von or None)
                    gesendet.append(r["name"])
                except Exception as e:
                    fehl.append(f"{r['name']}: {str(e)[:120]}")
        return jsonify(ok=True, mails=gesendet, fehler=fehl)

    # ---- Externe Gäste (ohne Anmeldung) – siehe skizze.py „Externe Gäste“
    @bp.route("/api/bp/skizze/<sid>/gastlinks", methods=["GET", "POST", "DELETE"])
    def skizze_gastlinks(sid):
        """GET: gültige Gast-Links; POST {tage}: neuer Link (Geheimnis nur jetzt im Klartext); DELETE {id}: widerrufen (ohne id: alle)."""
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            r = skizze.darf(c, sid, u)
            if not r:
                return jsonify(error="Keine Einladung zu dieser Skizze."), 403
            if request.method == "POST":
                tage = (request.get_json(silent=True) or {}).get("tage")
                token, ab = skizze.gast_link(c, sid, u, tage if isinstance(tage, int) else 7)
                return jsonify(token=token, ablauf=ab, links=skizze.gast_links(c, sid))
            if request.method == "DELETE":
                kurz = str((request.get_json(silent=True) or {}).get("id") or "")[:12] or None
                skizze.gast_widerrufen(c, sid, kurz)
            return jsonify(links=skizze.gast_links(c, sid))

    @bp.post("/api/bp/skizze/<sid>/gastmail")
    def skizze_gastmail(sid):
        """{an: [E-Mail-Adressen], tage}: je Empfänger ein eigener Gast-Link (einzeln zurückziehbar), per E-Mail verschickt."""
        import re as _re
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {}
        an = []
        for x in (b.get("an") or [])[:10]:
            x = str(x or "").strip()[:200]
            if x and _re.fullmatch(r"[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+", x) and x.lower() not in [y.lower() for y in an]:
                an.append(x)
        if not an:
            return jsonify(error="Bitte mindestens eine gültige E-Mail-Adresse angeben."), 400
        basis = str(b.get("basis") or "").strip()[:200]
        if not _re.fullmatch(r"https?://[\w.:-]+", basis):
            return jsonify(error="Ungültige Adresse"), 400
        with db.tx() as c:
            r = skizze.darf(c, sid, u)
            if not r:
                return jsonify(error="Keine Einladung zu dieser Skizze."), 403
            cf = mail.conf(c)
            if not mail.configured(cf):
                return jsonify(error="Der Mailserver ist noch nicht eingerichtet (Verwaltung → Einstellungen → Mailserver)."), 400
            von, absname = konto.absender(c, u, cf)
            tage = b.get("tage") if isinstance(b.get("tage"), int) else 7
            links = [(m, *skizze.gast_link(c, sid, u, tage)) for m in an]
        plan = r["name"] or "einen Plan"
        gesendet, fehl = [], []
        for m, token, ab in links:
            try:
                mail.direkt(cf, m, f"Plan gemeinsam markieren: {plan}",
                          f"Guten Tag,\n\n{u['name']} lädt Sie ein, den Plan „{plan}“ gemeinsam anzusehen und darin zu markieren.\n\n"
                          f"Öffnen (ohne Anmeldung): {basis}/gast/{token}\n\nDer Link gilt nur für Sie und bis zum {ab[8:10]}.{ab[5:7]}.{ab[:4]}. "
                          "Bitte nicht weitergeben.", sender=absname or "Bauplattform", from_addr=von or None, reply_to=u["email"] or None)
                gesendet.append(m)
            except Exception as e:
                fehl.append(f"{m}: {str(e)[:120]}")
        if fehl:   # nicht zugestellte Links gleich wieder zurückziehen
            with db.tx() as c:
                for m, token, _ in links:
                    if m not in gesendet:
                        skizze.gast_widerrufen_token(c, token)
        with db.tx() as c:
            L = skizze.gast_links(c, sid)
        return jsonify(ok=True, gesendet=gesendet, fehler=fehl, links=L)

    def _gast(token, schreiben=False):
        """(Skizze-ID, Gast, Fehlerantwort) – prüft Link, Kennung und Anfragetakt."""
        with db.tx() as c:
            sid, h = skizze.gast_pruefen(c, token)
        if not sid:
            return None, None, (jsonify(error="Dieser Link ist nicht (mehr) gültig – bitte bei der Absender:in einen neuen anfordern."), 404)
        try:
            from urllib.parse import unquote
            g_ = skizze.gast_user(h, request.headers.get("X-Gast-Id", ""), unquote(request.headers.get("X-Gast-Name", ""))[:80])
        except ValueError as e:
            return None, None, (jsonify(error=str(e)), 400)
        if skizze.gast_takt(h, g_["id"], 60 if not schreiben else 25, 10):
            return None, None, (jsonify(error="Zu viele Anfragen – bitte kurz warten."), 429)
        g_["_h"] = h
        return sid, g_, None

    @bp.get("/gast/<token>")
    def gast_seite(token):
        """Eigenständige Seite für Externe: nur dieser eine Plan, ohne Anmeldung."""
        with db.tx() as c:
            sid, _ = skizze.gast_pruefen(c, token)
        import secrets as _sec
        nonce = _sec.token_urlsafe(16)
        html = GAST_HTML.replace("__OK__", "1" if sid else "0").replace("__NONCE__", nonce)
        resp = Response(html, mimetype="text/html")
        resp.headers["Referrer-Policy"] = "no-referrer"   # das Geheimnis im Pfad nicht an andere Seiten weitergeben
        resp.headers["Cache-Control"] = "no-store"
        resp.headers["X-Robots-Tag"] = "noindex, nofollow"
        resp.headers["Content-Security-Policy"] = ("default-src 'self'; script-src 'self' 'nonce-" + nonce + "'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
                                                   "worker-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'")
        return resp

    @bp.route("/api/bp/gast/<token>/stand", methods=["GET", "POST"])
    def gast_stand(token):
        sid, g_, err = _gast(token)
        if err:
            return err
        with db.tx() as c:
            r = skizze.stand(c, sid, g_, request.args.get("seit", type=int) or 0)
        r.pop("owner", None)
        return jsonify({**r, "ich": g_["id"], "gast": True})

    @bp.get("/api/bp/gast/<token>/datei")
    def gast_datei(token):
        with db.tx() as c:
            sid, _ = skizze.gast_pruefen(c, token)
            if not sid:
                return jsonify(error="Dieser Link ist nicht (mehr) gültig."), 404
            roh = dateien.inhalt(c, c.execute("SELECT datei, datei_ref FROM skizze WHERE id=?", (sid,)).fetchone(), "datei")
        return Response(roh, mimetype="application/pdf", headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})

    @bp.post("/api/bp/gast/<token>/strich")
    def gast_strich(token):
        if (request.content_length or 0) > 200_000:
            return jsonify(error="Zu groß"), 413
        sid, g_, err = _gast(token, True)
        if err:
            return err
        with db.tx() as c:
            if skizze.gast_striche_voll(c, sid, g_["_h"]):
                return jsonify(error="Für Gäste ist die Zahl der Markierungen auf diesem Plan erreicht."), 429
            try:
                d = request.get_json(silent=True) or {}
                if d.get("art") == "bild":   # Gäste markieren nur – unterschreiben nicht
                    return jsonify(error="Unterschreiben geht nur angemeldet."), 403
                return jsonify(skizze.strich(c, sid, g_, d))
            except ValueError as e:
                return jsonify(error=str(e)), 400

    @bp.post("/api/bp/gast/<token>/loeschen")
    def gast_loeschen(token):
        sid, g_, err = _gast(token, True)
        if err:
            return err
        with db.tx() as c:
            try:
                return jsonify(n=skizze.gast_loeschen(c, sid, g_, (request.get_json(silent=True) or {}).get("was")))
            except ValueError as e:
                return jsonify(error=str(e)), 403

    @bp.post("/api/bp/gast/<token>/zeiger")
    def gast_zeiger(token):
        sid, g_, err = _gast(token)
        if err:
            return err
        with db.tx() as c:
            skizze.zeiger(c, sid, g_, request.get_json(silent=True) or {})
        return jsonify(ok=True)

    @bp.route("/api/bp/skizze-einladungen", methods=["GET", "POST"])
    def skizze_einladungen():
        u = user()
        if not u:
            return jsonify([])
        with db.tx() as c:
            if request.method == "POST":   # „Später“ – Einladung ausblenden
                c.execute("UPDATE skizze_einladung SET erledigt=1 WHERE id=? AND an=?", ((request.get_json(silent=True) or {}).get("id"), u["id"]))
            try:
                return jsonify(skizze.einladungen(c, u))
            except Exception:   # Schema noch nicht da
                return jsonify([])

    @bp.get("/api/bp/kollegen")
    def kollegen():
        """Wen man einladen kann: aktive Benutzer (ohne sich selbst), mit Hinweis, wer gerade angemeldet ist."""
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        import time as _t
        with db.tx() as c:
            on = {r["user_id"] for r in c.execute("SELECT DISTINCT user_id FROM sso_sessions WHERE seen>?", (int(_t.time()) - 900,))}
            out = [{"id": r["id"], "name": skizze.name_von(r), "online": r["id"] in on}
                   for r in c.execute("SELECT * FROM users WHERE active=1 AND id<>? AND lower(name)<>'admin' ORDER BY name", (u["id"],))]
        out.sort(key=lambda x: (not x["online"], x["name"].lower()))
        return jsonify(out)


GAST_HTML = """<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><base href="/">
<title>Plan gemeinsam markieren</title><link rel="stylesheet" href="bp/head.css">
<style>body{margin:0;font:15px/1.4 system-ui,sans-serif;background:#2b2b2b;color:#eee}.g{max-width:26rem;margin:12vh auto;padding:1.4rem;background:#fff;color:#222;border-radius:14px}
.g input{width:100%;box-sizing:border-box;font:inherit;padding:.5rem .6rem;border:1px solid #bbb;border-radius:8px;margin:.6rem 0}.g button{font:inherit;padding:.5rem 1rem;border:0;border-radius:8px;background:#d9692a;color:#fff;cursor:pointer}
.g small{color:#666}</style></head><body>
<div class="g" id="g"></div>
<script nonce="__NONCE__">window.BP_GAST = { ok: __OK__ };</script><script src="bp/head.js"></script><script nonce="__NONCE__">
(function () {
  var tok = location.pathname.split('/').pop(), box = document.getElementById('g'), esc = function (s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  if (!window.BP_GAST.ok) { box.innerHTML = '<h2>Link nicht gültig</h2><p>Dieser Link ist abgelaufen oder wurde zurückgezogen. Bitte beim Absender einen neuen anfordern.</p>'; return; }
  var gid; try { gid = localStorage.getItem('bp.gast.id'); } catch (e) { gid = null; }
  if (!gid) { var a = new Uint8Array(18); crypto.getRandomValues(a); gid = Array.from(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); try { localStorage.setItem('bp.gast.id', gid); } catch (e) {} }
  var nm = ''; try { nm = localStorage.getItem('bp.gast.name') || ''; } catch (e) {}
  box.innerHTML = '<h2>Plan gemeinsam markieren</h2><p>Du wurdest eingeladen, einen Plan gemeinsam anzusehen und zu markieren. Deine Striche und dein Zeiger sind für alle Teilnehmer sichtbar.</p>'
    + '<label>Dein Name<input id="n" maxlength="40" autocomplete="name" value="' + esc(nm) + '" placeholder="z. B. Max Muster, Fa. Muster"></label><button id="los">Plan öffnen</button>'
    + '<p><small>Du siehst nur diesen einen Plan. Der Link gilt nur befristet.</small></p>';
  var go = function () {
    var n = document.getElementById('n').value.trim(); if (!n) { document.getElementById('n').focus(); return; }
    try { localStorage.setItem('bp.gast.name', n); } catch (e) {}
    box.remove();
    BPHead.gastStart({ token: tok, id: gid, name: n });
  };
  document.getElementById('los').onclick = go;
  document.getElementById('n').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
})();
</script></body></html>"""
