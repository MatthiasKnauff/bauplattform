"""Gemeinsame Kopfleiste aller Apps der Bauplattform.

Jede App bindet sie mit `app.register_blueprint(head.blueprint())` ein und lädt im Browser /bp/head.css und /bp/head.js.
Die Kopfleiste zeigt: Bauportal / App · aktuelles Projekt · KI-Auswahl · Benutzer mit App-Umschalter und Abmelden.

/bp/head.js, /bp/head.css   Oberfläche (für alle Apps gleich)
/api/bp/projektnamen?q=   Vorschläge für Projektnamen: Projekte im Bautagebuch und Ordner auf dem Server (Ablage)
/api/bp/konto       GET/PUT  persönliche Einstellungen (Versand von Rügen, Kalendertermine) – alle Apps
/api/bp/signatur    POST Foto hochladen (wird freigestellt) · GET PNG · DELETE
/api/bp/mailvorlagen GET alle Vorlagen · PUT (nur Administrator)
/api/bp/versionen?bereich=…   Stände eines Bereichs · POST {bereich, name} jetzigen Stand benennen
/api/bp/versionen/<id>/vergleich  was sich beim Wiederherstellen ändern würde · …/wiederherstellen (POST) · PATCH {name}
/api/bp/versionen/alle   Änderungsverlauf aller Bereiche, die der Benutzer sehen darf
/api/bp/versionen/conf   GET/PUT Aufbewahrung (nur Administrator) mit Speicherbedarf
/api/bp/post        GET Mail-Übersicht zu meinen Projekten (?auto=1 einmal am Tag abrufen, ?neu=1 jetzt) · POST erledigt
/api/bp/postfaecher GET/PUT meine Postfächer (Microsoft 365 an/aus, eigene IMAP-Konten) · POST …/test
/api/bp/kacheln GET/PUT Reihenfolge der App-Kacheln auf der Startseite (je Benutzer)
/api/bp/kontakt    POST {name, email, trade, contact_person}  Kontakt schnell anlegen (nach Versand an eine neue Adresse)
/api/bp/kontakt/<id>/verlauf  Benachrichtigungsverlauf (Planversand, Rügen …)
/api/bp/kontakte    GET ?q= / ?ids=  Kontakte suchen · POST, PUT /<id>  anlegen/ändern (Kontaktfelder der Stammdaten-Masken)
/api/bp/projekt  GET/PUT {id}  aktuelles Projekt des Benutzers – beim Wechsel der App bleibt man im selben Projekt
/api/bp/ki   GET  Auswahl des Benutzers und welche Anbieter eingerichtet sind
             PUT  {"ki": "intern"|"ollama"|"claude"|"gemini"|"chatgpt"} – gilt in allen Apps und auf allen Geräten
"""
import json, os, urllib.error, urllib.request
from datetime import datetime
from urllib.parse import quote

from flask import Blueprint, Response, jsonify, request, send_from_directory

from . import ai, benachrichtigung, briefbogen, contacts, db, fehler, konto, mail, papierkorb, posteingang, skizze, sso, stammdaten, todo, versionen, vorlagen, vorort

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "head")


def blueprint(get_user=None):
    bp = Blueprint("bphead", __name__)

    def user():
        if get_user is not None:
            u = get_user()
            if u is not None:
                return u
        with db.tx() as c:
            return sso.current(c, request)

    @bp.app_errorhandler(Exception)
    def _fehler_server(e):   # unerwartete Fehler aller Apps festhalten (Verwaltung → System → Fehlermeldungen)
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            return e
        from flask import current_app
        try:
            u = user()
        except Exception:   # Anmeldung nicht lesbar: Fehler trotzdem melden, nur ohne Benutzer
            u = None
        try:
            wer = u["name"] if u else ""
        except Exception:   # Benutzername nur Beiwerk der Meldung
            wer = ""
        fehler.ausnahme(current_app.import_name, e, f"{request.method} {request.path}", wer)
        current_app.logger.exception(e)
        if request.path.startswith("/api/"):
            return jsonify(error="Interner Fehler – die Verwaltung ist informiert (System → Fehlermeldungen)."), 500
        return "Interner Fehler – die Verwaltung ist informiert.", 500

    @bp.after_app_request
    def _fehler_antwort(resp):   # behandelte Fehler mit 5xx (Dienst nicht erreichbar, Mailserver …) ebenfalls festhalten
        try:
            from flask import current_app, g as g_
            if resp.status_code >= 502 and not getattr(g_, "bp_fehler_gemeldet", False) and resp.is_json:
                d = resp.get_json(silent=True) or {}
                if d.get("error"):
                    try:
                        u = user()
                        wer = u["name"] if u else ""
                    except Exception:   # Benutzername nur Beiwerk der Meldung
                        wer = ""
                    fehler.melden(current_app.import_name, "server", f"{resp.status_code}: {d['error']}", "", f"{request.method} {request.path}", wer)
        except Exception:   # Melden darf die Antwort nie verhindern (und meldet sich nicht selbst – sonst Schleife)
            pass
        return resp

    @bp.post("/api/bp/fehler")
    def fehler_browser():
        """Fehler aus dem Browser (head.js meldet window.onerror / unbehandelte Promises)."""
        u = user()
        if not u:
            return jsonify(ok=False), 401
        b = request.get_json(silent=True) or {}
        fehler.melden(str(b.get("app") or "")[:40], "browser", b.get("meldung"), b.get("stack"), b.get("pfad"), u["name"], request.headers.get("User-Agent", ""))
        return jsonify(ok=True)

    @bp.route("/api/bp/fehler", methods=["GET", "PUT"])
    def fehler_liste():
        u = user()
        if not u or not u["is_admin"]:
            return jsonify(error="Nur für die Verwaltung."), 403
        with db.tx() as c:
            if request.method == "PUT":
                fehler.aktion(c, request.get_json(silent=True) or {})
            return jsonify(fehler=fehler.liste(c), ungelesen=fehler.ungelesen(c))

    @bp.get("/bp/<name>")
    def asset(name):
        if name not in ("head.js", "head.css"):
            return "Nicht gefunden", 404
        r = send_from_directory(ASSETS, name, max_age=0)
        r.headers["Cache-Control"] = "no-cache"
        return r

    @bp.get("/api/bp/ki")
    def ki_get():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            prov = ai.providers(c)
            ch = ai.choice_of(u, c)
        return jsonify(choice=ch, providers=prov, aus=sorted(ai.abgeschaltet()))

    @bp.put("/api/bp/ki")
    def ki_put():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        k = str((request.get_json(silent=True) or {}).get("ki") or "").strip().lower()
        if k not in ai.KEYS:
            return jsonify(error="Unbekannte KI."), 400
        if k in ai.abgeschaltet():
            return jsonify(error=ai.AUS_TEXT), 400
        with db.tx() as c, versionen.aenderung(c, f"konto:{u['id']}", u["name"]):
            c.execute("UPDATE users SET ai=? WHERE id=?", ("" if k == "intern" else k, u["id"]))
            prov = ai.providers(c)
        return jsonify(choice=k, providers=prov)

    @bp.put("/api/bp/darstellung")
    def darstellung():
        """Farbschema und Akzentfarbe des angemeldeten Benutzers (gilt in allen Apps)."""
        import re
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        d = request.get_json(silent=True) or {}
        sets, args = [], []
        if "theme" in d:
            t = str(d.get("theme") or "").strip().lower()
            t = "" if t == "dunkel" else t
            if t not in sso.THEMES:
                return jsonify(error="Unbekanntes Farbschema."), 400
            sets.append("theme=?"); args.append(t)
        if "accent" in d:
            a = str(d.get("accent") or "").strip().lower()
            if a and not re.fullmatch(r"#[0-9a-f]{6}", a):
                return jsonify(error="Ungültige Farbe."), 400
            sets.append("accent=?"); args.append(a)
        with db.tx() as c:
            if sets:
                with versionen.aenderung(c, f"konto:{u['id']}", u["name"]):
                    c.execute(f"UPDATE users SET {', '.join(sets)} WHERE id=?", (*args, u["id"]))
            r = c.execute("SELECT * FROM users WHERE id=?", (u["id"],)).fetchone()
        return jsonify(ok=True, theme=sso.theme_of(r) or "dunkel", accent=r["accent"] or "")

    # ---- aktuelles Projekt des Benutzers (Projekt des Bautagebuchs; gilt in allen Apps)
    @bp.route("/api/bp/projekt", methods=["GET", "PUT"])
    def projekt_api():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        key = f"aktprojekt:{u['id']}"
        with db.tx() as c:
            if request.method == "PUT":
                pid = (request.get_json(silent=True) or {}).get("id")
                pid = pid if isinstance(pid, int) and c.execute("SELECT 1 FROM projects WHERE id=?", (pid,)).fetchone() else None
                if pid:
                    konto._put(c, key, json.dumps({"id": pid}), u["name"])
                else:
                    c.execute("DELETE FROM bp_store WHERE key=?", (key,))
            try:
                pid = json.loads(konto._get(c, key) or "{}").get("id")
            except ValueError:
                pid = None
            r = c.execute("SELECT id, name, client, street, zip, city FROM projects WHERE id=?", (pid,)).fetchone() if pid else None
        if not r:
            return jsonify(id=None)
        adr = ", ".join(x for x in (r["street"], " ".join(y for y in (r["zip"], r["city"]) if y)) if x)
        return jsonify(id=r["id"], name=r["name"], client=r["client"] or "", adresse=adr)

    @bp.get("/api/bp/projekte")
    def projekte_api():
        """Projektauswahl (gleiche Maske in allen Apps): eigene Projekte, Archiv, fremde Projekte (nur Administratoren)."""
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            namen = {r["id"]: r["name"] for r in c.execute("SELECT id, name FROM users")}
            out = []
            for r in c.execute("SELECT id, name, client, street, zip, city, lat, lon, archived, leaders FROM projects ORDER BY id DESC"):
                try:
                    lead = json.loads(r["leaders"] or "[]") or []
                except ValueError:
                    lead = []
                eigen = not lead or u["id"] in lead
                if not eigen and not u["is_admin"]:
                    continue
                out.append({"id": r["id"], "name": r["name"], "client": r["client"] or "", "street": r["street"] or "", "zip": r["zip"] or "",
                            "city": r["city"] or "", "lat": r["lat"], "lon": r["lon"], "archived": bool(r["archived"]), "eigen": eigen, "mein": u["id"] in lead,
                            "bauleiter": ", ".join(namen.get(i, "") for i in lead if namen.get(i))})
        return jsonify(out)

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
            r = c.execute("SELECT name, datei FROM skizze WHERE id=?", (sid,)).fetchone()
        return Response(bytes(r["datei"]), mimetype="application/pdf", headers={"Cache-Control": "private, max-age=3600"})

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
            except ImportError:
                return jsonify(error="PDF mit Markierungen ist in dieser App nicht verfügbar."), 501
        n = name.rsplit(".", 1)[0] + " (markiert).pdf"
        return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f"attachment; filename*=UTF-8''{q(n)}"})

    @bp.post("/api/bp/skizze/<sid>/strich")
    def skizze_strich(sid):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if not skizze.darf(c, sid, u):
                return jsonify(error="Keine Einladung zu dieser Skizze."), 403
            try:
                return jsonify(skizze.strich(c, sid, u, request.get_json(silent=True) or {}))
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
                    mail.send(cf, r["email"], f"Gemeinsam markieren: {plan}",
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
                mail.send(cf, m, f"Plan gemeinsam markieren: {plan}",
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
            return None, None, (jsonify(error="Dieser Link ist nicht (mehr) gültig – bitte beim Absender einen neuen anfordern."), 404)
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
            r = c.execute("SELECT name, datei FROM skizze WHERE id=?", (sid,)).fetchone()
        return Response(bytes(r["datei"]), mimetype="application/pdf", headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})

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
                return jsonify(skizze.strich(c, sid, g_, request.get_json(silent=True) or {}))
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

    # ---- Projekt bearbeiten/anlegen (dieselbe Maske in allen Apps) – das Bautagebuch erledigt es, mit der Anmeldung des Benutzers
    import re as _re
    _BT_ERLAUBT = [("GET", r"projects"), ("POST", r"projects"), ("PUT", r"projects/\d+"), ("GET", r"leaders"), ("GET", r"geocode"), ("GET", r"geo"),
                   ("GET", r"store/folders"), ("POST", r"projects/\d+/contact"), ("GET", r"logo"),
                   ("GET", r"contacts/suggest"), ("GET", r"contacts/suggest/detail")]

    @bp.route("/api/bp/bt/<path:pfad>", methods=["GET", "POST", "PUT"])
    def bt_proxy(pfad):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        if not any(m == request.method and _re.fullmatch(x, pfad) for m, x in _BT_ERLAUBT):
            return jsonify(error="Nicht erlaubt"), 403
        with db.tx() as c:
            tok = sso.current_token(request, c)
        base = os.environ.get("BAUTAGEBUCH_INTERNAL", "http://bautagebuch:8000").rstrip("/")
        qs = request.query_string.decode()
        body = request.get_data() if request.method in ("POST", "PUT") else None
        req = urllib.request.Request(base + "/api/" + pfad + ("?" + qs if qs else ""), method=request.method, data=body,
                                     headers={"Cookie": f"{sso.COOKIE}={tok}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return Response(r.read(), status=r.status, mimetype=r.headers.get_content_type() or "application/json")
        except urllib.error.HTTPError as e:
            return Response(e.read(), status=e.code, mimetype="application/json")
        except Exception as e:
            return jsonify(error="Bautagebuch nicht erreichbar: " + str(e)[:120]), 502

    # ---- Kontakt schnell anlegen (nach einer Sendung an eine Adresse, zu der es noch keinen Kontakt gibt)
    @bp.post("/api/bp/kontakt")
    def kontakt_neu():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {}
        f = {k: str(b.get(k) or "").strip()[:n] for k, n in (("name", 200), ("email", 200), ("trade", 300), ("contact_person", 200), ("phone", 100))}
        if not f["email"] or "@" not in f["email"]:
            return jsonify(error="Bitte eine gültige E-Mail-Adresse angeben."), 400
        f["name"] = f["name"] or f["contact_person"] or f["email"]
        ts = datetime.now().isoformat(timespec="seconds")
        try:
            with db.tx() as c:
                r = c.execute("SELECT id FROM contacts WHERE lower(email)=?", (f["email"].lower(),)).fetchone()
                if r:
                    return jsonify(ok=True, id=r["id"], vorhanden=True)
                with c.savepoint():
                    cid = c.execute("""INSERT INTO contacts(name, email, trade, contact_person, phone, extra, created, updated)
                                       VALUES(?,?,?,?,?,?,?,?) RETURNING id""",
                                    (f["name"], f["email"], f["trade"], f["contact_person"], f["phone"], "{}", ts, ts)).fetchone()[0]
                versionen.nach(c, f"kontakt:{cid}", u["name"])
                benachrichtigung.zuordnen(c, cid, f["email"])
        except db.IntegrityError:
            return jsonify(error=f"Einen Kontakt „{f['name']}“ gibt es schon – bitte einen anderen Namen wählen oder die Adresse dort in Adressen eintragen."), 409
        return jsonify(ok=True, id=cid)

    # ---- Kontaktfelder in den Stammdaten-Masken: suchen, anlegen und ändern mit der gewohnten Kontaktmaske
    @bp.get("/api/bp/mailadressen")
    def mailadressen():
        """?q=Text → [{name, email}] aus den Adressen (auch weitere E-Mails und Ansprechpartner) – für Mail-Felder mit Vorschlägen."""
        if not user():
            return jsonify(error="Nicht angemeldet"), 401
        q = " ".join(str(request.args.get("q") or "").split())[:100].lower()
        if len(q) < 2:
            return jsonify([])
        like = f"%{q}%"
        out = []
        with db.tx() as c:
            for r in c.execute("""SELECT name, contact_person, email, extra FROM contacts WHERE lower(name) LIKE ? OR lower(email) LIKE ?
                                  OR lower(contact_person) LIKE ? OR lower(extra) LIKE ? ORDER BY name LIMIT 60""", (like, like, like, like)).fetchall():
                if r["email"]:
                    out.append({"name": " – ".join(x for x in (r["name"], r["contact_person"]) if x), "email": r["email"]})
                try:
                    W = (json.loads(r["extra"] or "{}") or {}).get("weitere") or []
                except (ValueError, TypeError):
                    W = []
                for x in W:
                    m = x.get("wert") if x.get("typ") == "mail" else x.get("mail") if x.get("typ") == "person" else ""
                    if m:
                        out.append({"name": f"{r['name']} – {x.get('wert') if x.get('typ') == 'person' else x.get('bez') or ''}".strip(" –"), "email": m})
        return jsonify([x for x in out if q in (x["name"] + " " + x["email"]).lower()][:15])

    @bp.get("/api/bp/kontakte")
    def kontakte_suchen():
        """?q=Text[&rolle=Bauherr] Treffer zur Eingabe · ?ids=1,2 die Kontakte zu diesen IDs"""
        if not user():
            return jsonify(error="Nicht angemeldet"), 401
        ids = [int(x) for x in request.args.get("ids", "").split(",") if x.strip().isdigit()][:60]
        with db.tx() as c:
            if ids:
                rows = c.execute(f"SELECT * FROM contacts WHERE id IN ({','.join('?' * len(ids))})", ids).fetchall()
                return jsonify([contacts.aus(r) for r in rows])
            return jsonify(contacts.suchen(c, request.args.get("q", ""), request.args.get("rolle", "")))

    @bp.post("/api/bp/kontakte")
    @bp.put("/api/bp/kontakte/<int:cid>")
    def kontakt_speichern(cid=None):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        try:
            d = contacts.bereinigen(request.get_json(silent=True) or {}, partial=cid is not None)
        except ValueError as e:
            return jsonify(error=str(e)), 400
        if not d.get("name", "x"):
            return jsonify(error="Bitte einen Namen eingeben."), 400
        ts = datetime.now().isoformat(timespec="seconds")
        try:
            with db.tx() as c:
                if cid is None:
                    with c.savepoint():
                        cols = list(d) + ["extra", "created", "updated"]
                        cid = c.execute(f"INSERT INTO contacts({', '.join(cols)}) VALUES({', '.join('?' * len(cols))}) RETURNING id",
                                        (*d.values(), "{}", ts, ts)).fetchone()[0]
                else:
                    if not c.execute("SELECT id FROM contacts WHERE id=?", (cid,)).fetchone():
                        return jsonify(error="Diesen Kontakt gibt es nicht mehr."), 404
                    versionen.vor(c, f"kontakt:{cid}")
                    with c.savepoint():
                        if d:
                            c.execute(f"UPDATE contacts SET {', '.join(k + '=?' for k in d)}, updated=? WHERE id=?", (*d.values(), ts, cid))
                versionen.nach(c, f"kontakt:{cid}", u["name"])
                if d.get("email"):
                    benachrichtigung.zuordnen(c, cid, d["email"])
                r = c.execute("SELECT * FROM contacts WHERE id=?", (cid,)).fetchone()
        except db.IntegrityError:
            return jsonify(error=f"Einen Kontakt „{d.get('name')}“ gibt es schon – bitte in der Suche auswählen oder einen anderen Namen wählen."), 409
        return jsonify(ok=True, kontakt=contacts.aus(r))

    @bp.get("/api/bp/kontakt/<int:cid>/verlauf")
    def kontakt_verlauf(cid):
        if not user():
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            return jsonify(benachrichtigung.verlauf(c, cid))

    # ---- Mein Konto: Unterschrift, Versand, Kalender (gilt in allen Apps)
    def _uid():
        u = user()
        return u, (u["id"] if u else None)

    @bp.route("/api/bp/konto", methods=["GET", "PUT"])
    def konto_api():
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":
                with versionen.aenderung(c, f"konto:{uid}", u["name"]):
                    p = konto.set_prefs(c, uid, request.get_json(silent=True) or {}, u["name"])
            else:
                p = konto.prefs(c, uid)
            sig = konto.signatur(c, uid) is not None
            mail_ok = bool(c.execute("SELECT 1 FROM settings WHERE key='mail_pass' AND value<>''").fetchone())
            vorschau = konto.signatur_text(c, u)
            vorschau_html = konto.signatur_html(c, u)
            mc = {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings WHERE key IN ('mail_from', 'mail_user')")}
        return jsonify(**p, sig_standard=konto.SIG_STANDARD, sig_platz=konto.SIG_PLATZ, sig_vorschau=vorschau, sig_vorschau_html=vorschau_html, absender_buero=(mc.get("mail_from") or "").strip() or mc.get("mail_user", ""), uid=uid, signatur=sig, email=u["email"] or "", mail=mail_ok, admin=bool(u["is_admin"]))

    @bp.post("/api/bp/kennwort")
    def kennwort_api():
        """Eigenes Kennwort ändern (⚙ → Für mich) – die Benutzerverwaltung selbst liegt nur in der Verwaltung."""
        from werkzeug.security import check_password_hash, generate_password_hash
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        d = request.get_json(silent=True) or {}
        alt, neu = d.get("alt") or "", d.get("neu") or ""
        with db.tx() as c:
            r = c.execute("SELECT pass_hash FROM users WHERE id=?", (uid,)).fetchone()
            if not r or not check_password_hash(r["pass_hash"], alt):
                return jsonify(error="Das bisherige Kennwort stimmt nicht."), 400
            if len(neu) < 8:
                return jsonify(error="Das neue Kennwort braucht mindestens 8 Zeichen."), 400
            if neu == alt or neu.lower() in (u["name"].lower(), "admin", "passwort", "password"):
                return jsonify(error="Dieses Kennwort ist zu einfach oder unverändert."), 400
            c.execute("UPDATE users SET pass_hash=?, must_change=0 WHERE id=?", (generate_password_hash(neu), uid))
            c.execute("DELETE FROM password_resets WHERE user_id=?", (uid,))
        try:
            with db.tx() as c:
                c.execute("INSERT INTO audit_log(ts, user_name, cat, action, detail) VALUES(?,?,?,?,?)",
                          (datetime.now().isoformat(timespec="seconds").replace("T", " "), u["name"], "konto", "Kennwort geändert", "⚙ Für mich"))
        except Exception as e:
            fehler.still(None, "Kennwort geändert: Eintrag im Protokoll", e)
            pass
        return jsonify(ok=True)

    @bp.route("/api/bp/signatur", methods=["GET", "POST", "DELETE"])
    def signatur_api():
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        if request.method == "GET":
            with db.tx() as c:
                png = konto.signatur(c, uid)
            return Response(png, mimetype="image/png", headers={"Cache-Control": "no-store"}) if png else ("", 404)
        if request.method == "DELETE":
            with db.tx() as c, versionen.aenderung(c, f"konto:{uid}", u["name"]):
                konto.set_signatur(c, uid, None)
            return jsonify(ok=True)
        f = request.files.get("file")
        raw = f.read() if f else b""
        if not raw or len(raw) > 25 * 1024 * 1024:
            return jsonify(error="Bitte ein Foto der Unterschrift wählen (höchstens 25 MB)."), 400
        try:
            png = konto.aufbereiten(raw)
        except ImportError:
            return jsonify(error="Bildbearbeitung ist in dieser App nicht verfügbar – bitte in der Verwaltung hochladen."), 500
        except ValueError as e:
            return jsonify(error=str(e)), 400
        with db.tx() as c, versionen.aenderung(c, f"konto:{uid}", u["name"]):
            konto.set_signatur(c, uid, png, u["name"])
        return jsonify(ok=True)

    @bp.route("/api/bp/mailvorlagen", methods=["GET", "PUT"])
    def mailvorlagen_api():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":
                if not u["is_admin"]:
                    return jsonify(error="Nur der Administrator darf die Vorlagen ändern."), 403
                d = request.get_json(silent=True) or {}
                with versionen.aenderung(c, "einst:vorlagen", u["name"]):
                    for k, v in d.items():
                        if k in vorlagen.DEF and isinstance(v, dict):
                            vorlagen.setzen(c, k, v.get("betreff"), v.get("text"))
            return jsonify(vorlagen=vorlagen.alle(c), erkl=vorlagen.ERKL, admin=bool(u["is_admin"]))

    # ---- Versionen (Änderungsverlauf) aller Einstellungen und Stammdaten
    @bp.route("/api/bp/versionen", methods=["GET", "POST"])
    def versionen_api():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {} if request.method == "POST" else {}
        bereich = str(request.args.get("bereich") or b.get("bereich") or "")
        with db.tx() as c:
            q = versionen.quelle(c, bereich)
            if not q:
                return jsonify(error="Unbekannter Bereich"), 404
            if not versionen.darf(u, q):
                return jsonify(error="Diese Stände darf nur der Administrator sehen."), 403
            if request.method == "POST":
                name = " ".join(str(b.get("name") or "").split())[:120]
                if not name:
                    return jsonify(error="Bitte einen Namen eingeben."), 400
                versionen.benennen(c, bereich, name, u["name"])
            versionen.vorher(c, bereich)
            return jsonify(bereich=bereich, titel=q.titel, versionen=versionen.liste(c, bereich))

    def _version(c, u, vid):
        r = c.execute("SELECT bereich FROM versionen WHERE id=?", (vid,)).fetchone()
        q = versionen.quelle(c, r["bereich"]) if r else None
        return (q, r["bereich"]) if q and versionen.darf(u, q) else (None, None)

    @bp.route("/api/bp/versionen/<int:vid>", methods=["PATCH"])
    def version_name(vid):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            q, _ = _version(c, u, vid)
            if not q:
                return jsonify(error="Nicht gefunden"), 404
            versionen.umbenennen(c, vid, " ".join(str((request.get_json(silent=True) or {}).get("name") or "").split())[:120])
        return jsonify(ok=True)

    @bp.get("/api/bp/versionen/<int:vid>/vergleich")
    def version_vergleich(vid):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            q, _ = _version(c, u, vid)
            if not q:
                return jsonify(error="Nicht gefunden"), 404
            return jsonify(aenderungen=versionen.vergleich(c, vid))

    @bp.post("/api/bp/versionen/<int:vid>/wiederherstellen")
    def version_zurueck(vid):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            q, bereich = _version(c, u, vid)
            if not q:
                return jsonify(error="Nicht gefunden"), 404
            versionen.wiederherstellen(c, vid, u["name"])
            return jsonify(ok=True, bereich=bereich, versionen=versionen.liste(c, bereich))

    @bp.get("/api/bp/versionen/alle")
    def versionen_alle():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        a = request.args
        with db.tx() as c:
            rows = versionen.uebersicht(c, u, a.get("teil") or "", a.get("wer") or "", a.get("q") or "")
            wer = sorted({r["wer"] for r in c.execute("SELECT DISTINCT wer FROM versionen WHERE wer<>''")}, key=str.lower)
        return jsonify(versionen=rows, teile=versionen.TEILE, wer=wer, admin=bool(u["is_admin"]))

    @bp.route("/api/bp/versionen/conf", methods=["GET", "PUT"])
    def versionen_conf():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        if not u["is_admin"]:
            return jsonify(error="Nur der Administrator."), 403
        with db.tx() as c:
            weg = None
            if request.method == "PUT":
                d = request.get_json(silent=True) or {}
                cur = versionen.conf(c)
                for k in cur:
                    if k in d:
                        try:
                            cur[k] = max(0, min(3650, int(d[k])))
                        except (TypeError, ValueError):
                            return jsonify(error="Bitte ganze Tage eingeben."), 400
                if not cur["alle_tage"]:
                    cur["alle_tage"] = 1
                with versionen.aenderung(c, "bp:versionen_conf", u["name"]):
                    konto._put(c, "versionen_conf", json.dumps(cur), u["name"])
                weg = versionen.aufraeumen(c)
            return jsonify(**versionen.conf(c), statistik=versionen.statistik(c), entfernt=weg)

    @bp.route("/api/bp/briefbogen", methods=["GET", "POST", "DELETE"])
    def briefbogen_api():
        """Briefbogen des Büros (PDF): GET Datei (?info=1 nur ob vorhanden) · POST hochladen · DELETE (nur Administrator)."""
        import base64
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        if request.method == "GET":
            with db.tx() as c:
                data = briefbogen.holen(c)
            if request.args.get("info"):
                return jsonify(vorhanden=bool(data), groesse=len(data or b""), satzspiegel=_satz(data))
            return Response(data, mimetype="application/pdf", headers={"Content-Disposition": "inline; filename=Briefbogen.pdf"}) if data else ("", 404)
        if not u["is_admin"]:
            return jsonify(error="Den Briefbogen hinterlegt der Administrator."), 403
        with db.tx() as c:
            if request.method == "DELETE":
                c.execute("DELETE FROM bp_store WHERE key='briefbogen'")
                return jsonify(ok=True, vorhanden=False)
            f = request.files.get("file")
            data = f.read() if f else b""
            if not data or len(data) > 10 * 1024 * 1024:
                return jsonify(error="Bitte den Briefbogen als PDF wählen (höchstens 10 MB)."), 400
            err = briefbogen.pruefen(data)
            if err:
                return jsonify(error=err), 400
            konto._put(c, "briefbogen", base64.b64encode(data).decode(), u["name"])
        return jsonify(ok=True, vorhanden=True, groesse=len(data), satzspiegel=_satz(data))

    def _satz(data):
        """Vom Briefbogen abgelesener Satzspiegel in mm (Anzeige in den Einstellungen)."""
        r = briefbogen.raender(data) if data else None
        return {k: round(v / 72 * 25.4) for k, v in r.items()} if r else None

    # ---- Posteingang: Mails zu meinen Projekten (Microsoft 365 zentral, eigene IMAP-Postfächer unter „Mein Konto“)
    @bp.route("/api/bp/post", methods=["GET", "POST"])
    def post_api():
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "POST":   # Vorschlag erledigt (Erinnerung angelegt oder verworfen)
                b = request.get_json(silent=True) or {}
                d = posteingang.lesen(c, uid)
                mid = str(b.get("id") or "")[:200]
                if b.get("wie") in ("aus", "ein"):   # Mail nur hier ausblenden / wieder einblenden – die Mail selbst bleibt unberührt
                    aus = set(json.loads(konto._get(c, f"post:aus:{uid}") or "[]"))
                    (aus.add if b["wie"] == "aus" else aus.discard)(mid)
                    konto._put(c, f"post:aus:{uid}", json.dumps(sorted(aus)[-2000:]), "posteingang")
                    return jsonify(ok=True)
                if b.get("wie") == "zurueck":   # Verwerfen rückgängig: Vorschlag wieder an die Mail
                    d.setdefault("erledigt", {}).pop(mid, None)
                    v = b.get("vorschlag") if isinstance(b.get("vorschlag"), dict) else {}
                    for m in d.get("mails") or []:
                        if m.get("id") == mid and v.get("titel"):
                            m["vorschlag"] = {"titel": str(v.get("titel"))[:200], "termin": str(v.get("termin") or "")[:10], "text": str(v.get("text") or "")[:1000]}
                    konto._put(c, f"post:{uid}", json.dumps(d, ensure_ascii=False), "posteingang")
                    return jsonify(ok=True)
                d.setdefault("erledigt", {})[mid] = str(b.get("wie") or "ja")[:40]
                for m in d.get("mails") or []:
                    if m.get("id") == mid:
                        m.pop("vorschlag", None)
                konto._put(c, f"post:{uid}", json.dumps(d, ensure_ascii=False), "posteingang")
                return jsonify(ok=True)
            ein = posteingang.eingerichtet(c, u)
            d = posteingang.lesen(c, uid)
            if ein and (request.args.get("neu") or (request.args.get("auto") and posteingang.faellig(c, uid))):
                d = posteingang.abrufen(c, u)
            if d.get("mails"):   # „eigene Kopien ausblenden“ und „einen Tag sichtbar“ gelten sofort, auch für schon gelesene Mails
                d["mails"] = posteingang.sichtbar(c, uid, posteingang.eigene_filtern(c, u, d["mails"]))
                aus = set(json.loads(konto._get(c, f"post:aus:{uid}") or "[]"))
                d["mails"] = [{**m, "aus": True} if m.get("id") in aus else m for m in d["mails"]]
            abruf = posteingang.postfaecher(c, uid)["abruf"]
        return jsonify(**d, eingerichtet=ein, abruf=abruf)

    @bp.post("/api/bp/post/erinnerung")
    def post_erinnerung():
        """Vorschlag aus der Mail-Übersicht als Erinnerung anlegen (wie in „Aufgaben & Mängel“, an mich)."""
        import re as _re
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {}
        titel, termin = str(b.get("titel") or "").strip()[:200], str(b.get("termin") or "")
        if not titel or not _re.fullmatch(r"\d{4}-\d{2}-\d{2}", termin):
            return jsonify(error="Bitte Text und Datum angeben."), 400
        jetzt = datetime.now().isoformat(timespec="seconds")
        with db.tx() as c:
            pid = b.get("pid") if isinstance(b.get("pid"), int) and c.execute("SELECT 1 FROM projects WHERE id=?", (b.get("pid"),)).fetchone() else None
            d = posteingang.lesen(c, uid)
            mail = next((m for m in d.get("mails") or [] if m.get("id") == str(b.get("id") or "")), {})   # Link zur Mail (Outlook) für „öffnen“
            from . import erinnern
            emp = erinnern.empfaenger(c, uid, pid)   # nach Einstellung: ich / alle Bauleiter des Projekts
            neu = c.execute("""INSERT INTO erinnerungen(quelle, project_id, titel, text, termin, uhrzeit, empfaenger, daten, erstellt, erstellt_von, geaendert, geaendert_von)
                         VALUES('eigen',?,?,?,?,'08:00',?,?,?,?,?,?) RETURNING id""", (pid, titel, str(b.get("text") or "")[:2000], termin, json.dumps(emp),
                                                                           json.dumps({"aus_mail": str(b.get("id") or "")[:200], "link": str(mail.get("link") or "")[:1000]}),
                                                                           jetzt, u["name"], jetzt, u["name"])).fetchone()
            hinweis = ""
            if erinnern.einstellung(c, uid)["art"] == "termin":   # sofort als Termin zum Annehmen statt Mail am Tag
                with c.savepoint():
                    n, f = erinnern.termine_senden(c, f"r{neu['id']}", termin, "08:00", titel, str(b.get("text") or ""), pid, emp, skizze.name_von(u))
                    if n:
                        c.execute("UPDATE erinnerungen SET gesendet='termin' WHERE id=?", (neu["id"],))
                    hinweis = f"Als Termin verschickt ({n} Empfänger)." if n else f
            d.setdefault("erledigt", {})[str(b.get("id") or "")[:200]] = "angelegt"
            for m in d.get("mails") or []:
                if m.get("id") == b.get("id"):
                    m.pop("vorschlag", None)
            konto._put(c, f"post:{uid}", json.dumps(d, ensure_ascii=False), "posteingang")
        return jsonify(ok=True, hinweis=hinweis)

    @bp.route("/api/bp/post/zuweisung", methods=["GET", "PUT", "POST"])
    def post_zuweisung():
        """Administrator: Microsoft-365-Postfächer (auch freigegebene wie mail@ oder rechnungen@) den Benutzern zuweisen.
        GET Liste und Zuordnung · PUT speichern · POST alle Postfächer aus Microsoft 365 holen."""
        u, uid = _uid()
        if not u or not u["is_admin"]:
            return jsonify(error="Nur für Administratoren"), 403
        with db.tx() as c:
            if request.method == "POST":
                try:
                    return jsonify(postfaecher=posteingang.m365_alle(c))
                except Exception as e:
                    return jsonify(error=str(e)[:300]), 400
            if request.method == "PUT":
                d = posteingang.zuweisung_setzen(c, request.get_json(silent=True) or {}, u["name"])
            else:
                d = posteingang.zuweisung(c)
            users = [{"id": r["id"], "name": r["name"], "email": r["email"] or ""} for r in c.execute("SELECT id, name, email FROM users ORDER BY name").fetchall()]
            ok = posteingang.m365_ok(c)
        return jsonify(**d, benutzer=users, m365=ok)

    # ------------------------------------------------------------ To-do-Liste der Startseite
    @bp.get("/api/bp/todo")
    def todo_liste():
        """Automatische Aufgaben (aus den Daten der Apps) + manuelle Aufgaben (angelegt oder beteiligt)."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            auto, fehler = todo.automatisch(c, u)
            man = todo.manuell(c, u)
        return jsonify(auto=auto, manuell=man, fehler=fehler, heute=datetime.now().date().isoformat())

    def _todo_mail(c, u, x, neu_ids, ich=False):
        """Beteiligte über eine neue oder ihnen neu zugewiesene Aufgabe informieren – mit ich=True auch mich selbst (mit Fälligkeit als Termin)."""
        from . import mail as M, platform as PF
        cf = M.conf(c)
        if not M.configured(cf):
            return "Mailversand ist nicht eingerichtet – Beteiligte wurden nicht benachrichtigt."
        pr = c.execute("SELECT name FROM projects WHERE id=?", (x["project_id"],)).fetchone() if x["project_id"] else None
        wer, fehl = skizze.name_von(u), []
        # Mit Fälligkeit: Termin möglichst direkt in Outlook (Microsoft 365) – eigene Aufgabe steht sofort im Kalender,
        # Zugewiesene bekommen von Exchange eine echte Besprechungsanfrage mit „Annehmen“. Sonst wie bisher termin.ics.
        im_kalender = False
        if x["faellig"]:
            from . import kalender365
            empf = [(y["email"].strip(), skizze.name_von(y)) for y in c.execute("SELECT * FROM users WHERE active=1").fetchall()
                    if (y["email"] or "").strip() and y["id"] in neu_ids and y["id"] != u["id"]]
            if (u["email"] or "").strip() and (ich or empf):
                im_kalender = bool(kalender365.termin(
                    c, u["email"].strip(), f"Aufgabe: {x['titel'][:120]}", f"{x['titel']}" + (f"\nProjekt: {pr['name']}" if pr else "") + (f"\n\n{x['notiz']}" if x["notiz"] else ""),
                    x["faellig"], empf, ganztags=True, erinnerung_min=(lambda v: None if v is None else max(0, v))(todo.ERINNERUNG.get(x.get("erinnerung") or "", (None, ""))[0]),
                    schluessel=f"todo-{x.get('id') or x['titel'][:20]}-{x['faellig']}-{len(empf)}"))
        for r in c.execute("SELECT * FROM users WHERE active=1").fetchall():
            selbst = r["id"] == u["id"]
            if not (r["email"] or "").strip() or not ((selbst and ich) or (r["id"] in neu_ids and not selbst)):
                continue
            andere = [skizze.name_von(y) for y in c.execute("SELECT * FROM users WHERE active=1").fetchall() if y["id"] in set(x["personen"]) and y["id"] != r["id"]]
            txt = (f"Hallo {skizze.name_von(r)},\n\n" + ("du hast eine Aufgabe angelegt:" if selbst else f"{wer} hat dir eine Aufgabe zugewiesen:") + f"\n\n    {x['titel']}\n\n"
                   + (f"Beteiligt: {', '.join(andere)}\n" if andere else "")
                   + (f"Projekt: {pr['name']}\n" if pr else "") + (f"Fällig: {datetime.fromisoformat(x['faellig']).strftime('%d.%m.%Y')}\n" if x["faellig"] else "")
                   + (f"Erinnerung: {todo.ERINNERUNG[x['erinnerung']][1]}\n" if x.get("faellig") and x.get("erinnerung") in todo.ERINNERUNG else "")
                   + (f"\n{x['notiz']}\n" if x["notiz"] else "") + (f"\nZur Startseite: {PF.link('portal', '', cf)}\n" if PF.link("portal", "", cf) else ""))
            anh = None
            if x["faellig"] and im_kalender:
                txt += ("\nDer Termin steht schon in deinem Outlook-Kalender.\n" if selbst else "\nDie Einladung zum Termin kommt als eigene Besprechungsanfrage von Outlook – dort „Annehmen“.\n")
            elif x["faellig"]:   # mit Fälligkeit: ganztägiger Termin zum Annehmen (Outlook, Gmail, Apple & Co.)
                from . import ical
                # Die Einladung hängt als Datei an (termin.ics, method=REQUEST) und steckt nicht als Kalender-Teil in der Mail:
                # einen eingebetteten Kalender-Teil verarbeitet Microsoft 365 beim Senden selbst als Besprechung und hat die Mail
                # abgewiesen (InvalidRecipientsException); eine angehängte Datei schickt es unverändert weiter wie die Pläne.
                # Organisator = das Postfach, über das gesendet wird (wie bei den Erinnerungen). Bin ich das selbst, nur zum Eintragen.
                host = (cf.get("app_url") or "bauplattform").split("//")[-1].split("/")[0] or "bauplattform"
                org = (cf.get("mail_user") or M.von(cf) or "").strip()
                einl = r["email"].strip().lower() != org.lower()
                ics = ical.einladung(f"todo-{x.get('id') or x['titel'][:20]}-{r['id']}@{host}", x["faellig"], None, 0, f"Aufgabe: {x['titel'][:120]}",
                                     txt, "", org, cf.get("office_name") or wer, r["email"], skizze.name_von(r),
                                     alarm_min=todo.ERINNERUNG.get(x.get("erinnerung") or "", (0, ""))[0], ganztags=True, einladung_=einl)
                anh = [("termin.ics", ics.encode("utf-8"), "text/calendar; method=REQUEST" if einl else "text/calendar; method=PUBLISH")]
                txt += ("\nIm Anhang als Termin (termin.ics) – „Annehmen“ trägt die Fälligkeit in deinen Kalender ein.\n" if einl
                        else "\nIm Anhang als Termin (termin.ics) – öffnen trägt die Fälligkeit in deinen Kalender ein.\n")
            try:
                M.send(cf, r["email"], f"Aufgabe: {x['titel'][:80]}", txt, sender=wer, reply_to=u["email"] or None, attachments=anh)
            except Exception as e:
                if not getattr(e, "gemeldet", False):   # Mailfehler meldet mail.send schon selbst
                    fehler.still(None, "Aufgabe: Benachrichtigung per Mail", e)
                fehl.append(f"{skizze.name_von(r)}: {e}")
        return "; ".join(fehl)

    def _todo_body(b, alt=None):
        alt = alt or {}
        f = (b.get("faellig") if "faellig" in b else alt.get("faellig")) or ""
        return {"titel": str(b.get("titel", alt.get("titel")) or "").strip()[:300], "notiz": str(b.get("notiz", alt.get("notiz")) or "")[:4000],
                "project_id": b.get("pid") if "pid" in b else alt.get("project_id"),
                "faellig": f if len(f) == 10 and f[4] == "-" else "", "prio": 1 if b.get("prio", alt.get("prio")) else 0,
                "personen": [int(i) for i in (b.get("personen") if "personen" in b else todo._ids(alt.get("personen"))) or [] if str(i).isdigit()][:30],
                "mail": 1 if b.get("mail", alt.get("mail")) else 0,
                "erinnerung": (lambda e: e if e in todo.ERINNERUNG else "")(str(b.get("erinnerung") if "erinnerung" in b else alt.get("erinnerung") or ""))}

    @bp.post("/api/bp/todo")
    def todo_neu():
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        x = _todo_body(request.get_json(silent=True) or {})
        if not x["titel"]:
            return jsonify(error="Bitte einen Titel eingeben."), 400
        jetzt = datetime.now().isoformat(timespec="seconds")
        with db.tx() as c:
            r = c.execute("""INSERT INTO todo(titel, notiz, project_id, faellig, prio, personen, mail, erinnerung, status, erstellt, erstellt_von, erstellt_name, geaendert)
                             VALUES(?,?,?,?,?,?,?,?,'offen',?,?,?,?) RETURNING id""",
                          (x["titel"], x["notiz"], x["project_id"], x["faellig"], x["prio"], json.dumps(x["personen"]), x["mail"], x["erinnerung"], jetzt, uid, skizze.name_von(u), jetzt)).fetchone()
            hinweis = _todo_mail(c, u, {**x, "id": r["id"]}, set(x["personen"]), ich=True) if x["mail"] else ""
            row = todo.darf(c, u, r["id"])
            return jsonify(aufgabe=todo._zeile(row, todo.benutzer(c), todo.dateien(c, [row['id']])), hinweis=hinweis)

    @bp.route("/api/bp/todo/<int:tid>", methods=["PUT", "DELETE"])
    def todo_aendern(tid):
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            alt = todo.darf(c, u, tid)
            if not alt:
                return jsonify(error="Aufgabe nicht gefunden."), 404
            if request.method == "DELETE":
                if alt["erstellt_von"] != uid and not u["is_admin"]:
                    return jsonify(error="Löschen kann nur, wer die Aufgabe angelegt hat."), 403
                pr = c.execute("SELECT name FROM projects WHERE id=?", (alt["project_id"],)).fetchone() if alt["project_id"] else None
                papierkorb.ablegen(c, "todo", tid, "To-do", alt["titel"], u["name"], pr["name"] if pr else "", "aufgaben")
                return jsonify(ok=True)
            b = request.get_json(silent=True) or {}
            jetzt = datetime.now().isoformat(timespec="seconds")
            if "erledigt" in b:
                c.execute("UPDATE todo SET status=?, erledigt=?, erledigt_name=?, geaendert=? WHERE id=?",
                          ("erledigt" if b["erledigt"] else "offen", jetzt if b["erledigt"] else "", skizze.name_von(u) if b["erledigt"] else "", jetzt, tid))
            x = _todo_body(b, dict(alt))
            if any(k in b for k in ("titel", "notiz", "pid", "faellig", "prio", "personen", "mail", "erinnerung")):
                if not x["titel"]:
                    return jsonify(error="Bitte einen Titel eingeben."), 400
                c.execute("UPDATE todo SET titel=?, notiz=?, project_id=?, faellig=?, prio=?, personen=?, mail=?, erinnerung=?, geaendert=? WHERE id=?",
                          (x["titel"], x["notiz"], x["project_id"], x["faellig"], x["prio"], json.dumps(x["personen"]), x["mail"], x["erinnerung"], jetzt, tid))
                if x["faellig"] != (alt["faellig"] or "") or x["erinnerung"] != (dict(alt).get("erinnerung") or ""):
                    c.execute("DELETE FROM bp_store WHERE key=?", (f"todo:erinnert:{tid}",))   # neue Fälligkeit/Erinnerung: wieder erinnern
            neu = set(x["personen"]) - set(todo._ids(alt["personen"]))
            jetzt_an = x["mail"] and not alt["mail"]   # Häkchen gerade gesetzt: mich und alle Beteiligten benachrichtigen
            hinweis = (_todo_mail(c, u, {**x, "id": tid}, set(x["personen"]), ich=True) if jetzt_an
                       else _todo_mail(c, u, {**x, "id": tid}, neu) if x["mail"] and neu else "")
            return jsonify(aufgabe=todo._zeile(todo.darf(c, u, tid) or alt, todo.benutzer(c), todo.dateien(c, [tid])), hinweis=hinweis)

    @bp.post("/api/bp/todo/<int:tid>/datei")
    def todo_datei_neu(tid):
        """Anhänge und Fotos hochladen (mehrere auf einmal, je höchstens 25 MB)."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        fs = request.files.getlist("datei")
        if not fs:
            return jsonify(error="Keine Datei."), 400
        jetzt = datetime.now().isoformat(timespec="seconds")
        with db.tx() as c:
            if not todo.darf(c, u, tid):
                return jsonify(error="Aufgabe nicht gefunden."), 404
            for f in fs[:20]:
                data = f.read()
                if len(data) > 25 * 1024 * 1024:
                    return jsonify(error=f"„{f.filename}“ ist größer als 25 MB."), 400
                c.execute("INSERT INTO todo_datei(todo_id, name, mime, groesse, data, erstellt, erstellt_name) VALUES(?,?,?,?,?,?,?)",
                          (tid, (f.filename or "Datei")[:200], (f.mimetype or "application/octet-stream")[:100], len(data), data, jetzt, skizze.name_von(u)))
            return jsonify(dateien=todo.dateien(c, [tid]).get(tid, []))

    @bp.route("/api/bp/todo/<int:tid>/datei/<int:did>", methods=["GET", "DELETE"])
    def todo_datei(tid, did):
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if not todo.darf(c, u, tid):
                return jsonify(error="Aufgabe nicht gefunden."), 404
            if request.method == "DELETE":
                c.execute("DELETE FROM todo_datei WHERE id=? AND todo_id=?", (did, tid))
                return jsonify(dateien=todo.dateien(c, [tid]).get(tid, []))
            r = c.execute("SELECT name, mime, data FROM todo_datei WHERE id=? AND todo_id=?", (did, tid)).fetchone()
        if not r:
            return jsonify(error="Datei nicht gefunden."), 404
        from urllib.parse import quote as q
        art = "attachment" if request.args.get("laden") else "inline"
        return Response(bytes(r["data"]), mimetype=r["mime"], headers={"Content-Disposition": f"{art}; filename*=UTF-8''{q(r['name'])}", "Cache-Control": "private, max-age=3600"})

    @bp.post("/api/bp/todo-zustand")
    def todo_zustand():
        """Automatische Aufgabe zurückstellen (bis), ausblenden (aus) oder wieder zeigen."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {}
        with db.tx() as c:
            todo.zustand_setzen(c, uid, str(b.get("key") or "")[:200], bis=(b.get("bis") or None), aus=bool(b.get("aus")), wer=u["name"])
        return jsonify(ok=True)

    # ---- Vor Ort erkennen (iPhone-Kurzbefehl meldet den Standort; ohne Anmeldung, mit persönlichem Schlüssel)
    @bp.route("/api/bp/vorort", methods=["GET", "POST"])
    def vorort_melden():
        b = request.get_json(silent=True) or {}
        v = lambda k: request.values.get(k) or b.get(k)
        with db.tx() as c:
            code, txt = vorort.melden(c, str(v("k") or "")[:60], v("lat"), v("lon"))
        return Response(txt, status=code, mimetype="text/plain")

    @bp.route("/api/bp/vorort/einst", methods=["GET", "PUT"])
    def vorort_einst():
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":
                b = request.get_json(silent=True) or {}
                if b.get("neuer_schluessel"):
                    vorort.schluessel(c, uid, neu=True)
                vorort.einst_setzen(c, uid, b, u["name"])
            return jsonify(einst=vorort.einst(c, uid), schluessel=vorort.schluessel(c, uid), besuche=vorort.besuche(c, uid, 21))

    @bp.route("/api/bp/projekt/<int:pid>/daten", methods=["GET", "PUT"])
    def projekt_daten(pid):
        """Projekt- und Bauherrendaten für alle Apps (dieselbe Maske in Verwaltung, AVA, Baukosten).
        PUT {werte, in_plan}: in_plan=true schreibt den Baubeginn als Projektanfang in die Bauzeitenpläne."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            p = c.execute("SELECT id, name FROM projects WHERE id=?", (pid,)).fetchone()
            if not p:
                return jsonify(error="Projekt nicht gefunden"), 404
            hinweis = ""
            if request.method == "PUT":
                b = request.get_json(silent=True) or {}
                with versionen.aenderung(c, f"bp:projektdaten:{pid}", u["name"]):
                    d = stammdaten.projekt_schreiben(c, pid, b.get("werte") or {}, u["name"])
                if b.get("in_plan") and d.get("baubeginn"):
                    n = stammdaten.baubeginn_in_plan(c, pid, d["baubeginn"])
                    hinweis = f"Baubeginn in {n} Bauzeitenplan{'' if n == 1 else 'en'} als Projektanfang eingetragen." if n else "Kein Bauzeitenplan zu diesem Projekt gefunden."
            else:
                d = stammdaten.projekt_lesen(c, pid)
            return jsonify(projekt=p["name"], felder=stammdaten.felder(stammdaten.PROJEKT), werte=d, plan=stammdaten.plan_termine(c, pid), hinweis=hinweis)

    @bp.post("/api/bp/projekt/<int:pid>/kataster")
    def projekt_kataster(pid):
        """Gemarkung, Flur, Flurstück(e) und Geländehöhe über NHN zur Baustelle – aus den offenen Diensten von Geobasis NRW
        (ALKIS wie in TIM-online, DGM1). Speichert nichts: die Maske übernimmt die Werte, gespeichert wird mit „Speichern“."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            p = c.execute("SELECT id, name, street, zip, city, lat, lon FROM projects WHERE id=?", (pid,)).fetchone()
        if not p:
            return jsonify(error="Projekt nicht gefunden"), 404
        b = request.get_json(silent=True) or {}
        adr = {k: str(b[k]).strip() for k in ("strasse", "plz", "ort") if k in b}
        if adr and (adr.get("strasse"), adr.get("plz"), adr.get("ort")) != (p["street"] or "", p["zip"] or "", p["city"] or ""):
            b.setdefault("lat", None); b.setdefault("lon", None)   # Adresse in der Maske geändert: neu suchen statt alter Koordinaten
        return _kataster_antwort(b.get("lat", p["lat"]), b.get("lon", p["lon"]), adr.get("strasse", p["street"] or ""),
                                 adr.get("plz", p["zip"] or ""), adr.get("ort", p["city"] or ""))

    def _kataster_antwort(lat, lon, strasse, plz, ort):
        from . import kataster
        try:
            r = kataster.ermitteln(lat if isinstance(lat, (int, float)) else None, lon if isinstance(lon, (int, float)) else None, strasse, plz, ort)
        except kataster.Fehler as e:
            return jsonify(error=str(e)), 502
        if not r["flurstuecke"]:
            return jsonify(error="An dieser Adresse wurde kein Flurstück gefunden – stimmt die Adresse?", **r), 404
        return jsonify(r)

    @bp.post("/api/bp/kataster")
    def kataster_adresse():
        """Wie oben, aber ohne Projekt: {strasse, plz, ort} oder {lat, lon} – z. B. für eine Baustelle in Adressen."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {}
        return _kataster_antwort(b.get("lat"), b.get("lon"), str(b.get("strasse") or ""), str(b.get("plz") or ""), str(b.get("ort") or ""))

    @bp.route("/api/bp/kontakt/<int:kid>/grundstueck", methods=["GET", "PUT"])
    def kontakt_grundstueck(kid):
        """Grundstück einer Baustelle (Kontakt): ist sie Baustellenadresse eines Projekts, gelten dessen Projektdaten,
        sonst ein eigener Eintrag – den übernimmt ein Projekt, sobald die Baustelle ihm zugeordnet wird."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        G = ("gemarkung", "flur", "flurstueck", "hoehe_nhn")
        with db.tx() as c:
            k = c.execute("SELECT id, name FROM contacts WHERE id=?", (kid,)).fetchone()
            if not k:
                return jsonify(error="Diesen Kontakt gibt es nicht mehr."), 404
            pids = [r["id"] for r in c.execute("SELECT id, extra FROM projects ORDER BY id DESC") if str(stammdaten._j(r["extra"], {}).get("contact_id") or "") == str(kid)]
            if request.method == "PUT":
                w = {x: str((request.get_json(silent=True) or {}).get("werte", {}).get(x) or "").strip()[:200] for x in G}
                for pid in pids:
                    with versionen.aenderung(c, f"bp:projektdaten:{pid}", u["name"]):
                        stammdaten.projekt_schreiben(c, pid, w, u["name"])
                if not pids:
                    stammdaten.grundstueck_kontakt_schreiben(c, kid, w, u["name"])
            if pids:
                P = stammdaten.projekt_lesen(c, pids[0])
                werte = {x: P.get(x) or "" for x in G}
            else:
                werte = stammdaten.grundstueck_kontakt(c, kid)
            namen = [r["name"] for r in c.execute("SELECT id, name FROM projects") if r["id"] in pids]
        return jsonify(werte=werte, projekte=namen)

    @bp.route("/api/bp/todo-regeln", methods=["GET", "PUT"])
    def todo_regeln():
        """Einstellungen der automatischen Aufgaben – gelten für alle Benutzer (wer sie sieht, steht je Regel)."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":   # mit Stand im Verlauf (⚙ → Verlauf)
                versionen.vor(c, "bp:todo:regeln")
                R = todo.regeln_setzen(c, request.get_json(silent=True) or {}, u["name"])
                versionen.nach(c, "bp:todo:regeln", u["name"])
            else:
                R = todo.regeln(c)
            P = [{"id": r["id"], "name": r["name"]} for r in c.execute("SELECT id, name FROM projects WHERE archived=0 ORDER BY name").fetchall()]
            U = [{"id": r["id"], "name": skizze.name_von(r)} for r in c.execute("SELECT * FROM users WHERE active=1 AND lower(name)<>'admin' ORDER BY name").fetchall()]
            try:
                from . import posteingang
                meine = [r["id"] for r in posteingang.meine_projekte(c, uid)]
            except Exception as e:
                fehler.still(None, "Aufgabenregeln: eigene Projekte ermitteln", e)
                meine = []
        return jsonify(regeln=list(R.values()), projekte=P, benutzer=U, ich=uid, meine=meine, erinnerung=[[k, v[1]] for k, v in todo.ERINNERUNG.items()])

    # ---- Papierkorb (alle Apps): ansehen, wiederherstellen, endgültig löschen, Aufbewahrungsdauer
    @bp.get("/api/bp/papierkorb")
    def papierkorb_liste():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:   # jeder sieht nur, was er selbst gelöscht hat; die Verwaltung alles (nach Benutzer filterbar)
            L = papierkorb.liste(c)
            if not u["is_admin"]:
                L = [x for x in L if (x["von"] or "") == u["name"]]
            return jsonify(eintraege=L, einst=papierkorb.einstellungen(c), admin=bool(u["is_admin"]), ich=u["name"])

    @bp.post("/api/bp/papierkorb/<int:pid>/zurueck")
    def papierkorb_zurueck(pid):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        try:
            with db.tx() as c:
                e = c.execute("SELECT von FROM bp_papierkorb WHERE id=?", (pid,)).fetchone()
                if e and not u["is_admin"] and (e["von"] or "") != u["name"]:
                    return jsonify(error="Das hat jemand anderes gelöscht – wiederherstellen kann es die Verwaltung."), 403
                r = papierkorb.wiederherstellen(c, pid)
        except ValueError as e:
            return jsonify(error=str(e)), 409
        return jsonify(ok=True, **r)

    @bp.post("/api/bp/papierkorb/loeschen")
    def papierkorb_loeschen():
        """{ids: [...]} oder {alle: true} – endgültig (nur Verwaltung)."""
        u = user()
        if not u or not u["is_admin"]:
            return jsonify(error="Endgültig löschen kann nur die Verwaltung."), 403
        b = request.get_json(silent=True) or {}
        with db.tx() as c:
            ids = [r["id"] for r in c.execute("SELECT id FROM bp_papierkorb").fetchall()] if b.get("alle") else \
                [int(x) for x in (b.get("ids") or []) if isinstance(x, int)]
            n = papierkorb.endgueltig(c, ids)
        return jsonify(ok=True, n=n)

    @bp.put("/api/bp/papierkorb/einst")
    def papierkorb_einst():
        u = user()
        if not u or not u["is_admin"]:
            return jsonify(error="Nur die Verwaltung."), 403
        t = (request.get_json(silent=True) or {}).get("tage")
        if not isinstance(t, int) or not 0 <= t <= 3650:
            return jsonify(error="Bitte eine Zahl von 0 bis 3650 Tagen."), 400
        with db.tx() as c:
            papierkorb.einstellungen_setzen(c, t, u["name"])
            papierkorb.aufraeumen(c)
            return jsonify(einst=papierkorb.einstellungen(c))

    @bp.route("/api/bp/kacheln", methods=["GET", "PUT"])
    def kacheln_api():
        """Reihenfolge der App-Kacheln auf der Startseite (je Benutzer, auf allen Geräten gleich)."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":
                r = [str(x)[:40] for x in ((request.get_json(silent=True) or {}).get("reihenfolge") or [])[:120] if isinstance(x, str)]   # '' = leeres Feld
                konto._put(c, f"kacheln:{uid}", json.dumps(r), u["name"])
                return jsonify(reihenfolge=r)
            try:
                r = json.loads(konto._get(c, f"kacheln:{uid}") or "[]")
            except ValueError:
                r = []
        return jsonify(reihenfolge=r if isinstance(r, list) else [])

    @bp.route("/api/bp/postfaecher", methods=["GET", "PUT"])
    def postfaecher_api():
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":
                d = posteingang.postfaecher_setzen(c, uid, request.get_json(silent=True) or {}, u["name"])
            else:
                d = posteingang.postfaecher_oeffentlich(c, uid)
            m = posteingang.m365_ok(c)
            zug = posteingang.zuweisung(c)["zuordnung"].get(str(uid), [])
        return jsonify(**d, m365_zentral=m, email=u["email"] or "", zugewiesen=zug)

    @bp.post("/api/bp/postfaecher/test")
    def postfaecher_test():
        """Ein Postfach probeweise lesen: {konto:{…}} (IMAP, Kennwort leer = gespeichertes) oder {m365:true} (eigenes Postfach)."""
        from datetime import timedelta, timezone
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {}
        with db.tx() as c:
            try:
                if b.get("m365"):
                    return jsonify(ok=True, text=posteingang.m365_test(c, (b.get("adresse") if u["is_admin"] and b.get("adresse") else u["email"]) or ""))
                k = dict(b.get("konto") or {})
                if not k.get("pass"):
                    k["pass"] = next((x.get("pass") for x in posteingang.postfaecher(c, uid)["konten"] if x.get("id") == k.get("id")), "")
                k.setdefault("id", "test")
                n = len(posteingang.imap_lesen(k, datetime.now(timezone.utc) - timedelta(days=1)))
                return jsonify(ok=True, text=f"Verbindung klappt – {n} Mails seit gestern im Ordner {k.get('ordner') or 'INBOX'}.")
            except Exception as e:
                return jsonify(ok=False, error=str(e)[:300])

    @bp.get("/api/bp/projektnamen")
    def projektnamen():
        """Namensvorschläge für jedes Eingabefeld „Projektname“ in allen Apps."""
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        q = " ".join((request.args.get("q") or "").split()).lower()
        if len(q) < 2:
            return jsonify(projects=[], folders=[])
        words = q.split()
        out = []
        with db.tx() as c:
            for r in c.execute("SELECT id, name, street, zip, city, archived, leaders FROM projects ORDER BY archived, name"):
                try:
                    lead = json.loads(r["leaders"] or "[]")
                except ValueError:
                    lead = []
                if lead and not u["is_admin"] and u["id"] not in lead:
                    continue   # Projekt nur für die eingetragenen Bauleiter sichtbar (wie im Bautagebuch)
                text = f"{r['name']} {r['street']} {r['city']}".lower()
                if all(w in text for w in words):
                    out.append({"id": r["id"], "name": r["name"], "archived": bool(r["archived"]),
                                "address": ", ".join(x for x in (r["street"], " ".join(y for y in (r["zip"], r["city"]) if y)) if x)})
            tok = sso.current_token(request, c)
        folders = []
        if tok:   # Ordner auf dem Server kennt nur das Bautagebuch (Laufwerk der Ablage) – mit der Anmeldung des Benutzers fragen
            base = os.environ.get("BAUTAGEBUCH_INTERNAL", "http://bautagebuch:8000").rstrip("/")
            req = urllib.request.Request(base + "/api/store/folders?q=" + quote(q), headers={"Cookie": f"{sso.COOKIE}={tok}"})
            try:
                with urllib.request.urlopen(req, timeout=8) as r:
                    v = json.loads(r.read().decode() or "[]")
                    folders = [str(x) for x in v][:30] if isinstance(v, list) else []
            except Exception as e:
                fehler.still(None, "Projektnamen: Ordnervorschläge vom Bautagebuch", e)
                folders = []
        return jsonify(projects=out[:20], folders=folders)

    return bp


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
