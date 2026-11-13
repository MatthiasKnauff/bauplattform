"""Gemeinsame Kopfleiste aller Apps der Bauplattform.

Jede App bindet sie mit `app.register_blueprint(head.blueprint())` ein und lädt im Browser /bp/head.css und /bp/head.js.
Die Kopfleiste zeigt: Bauportal / App · aktuelles Projekt · KI-Auswahl · Benutzer mit App-Umschalter und Abmelden.

/bp/head.js, /bp/head.css   Oberfläche (für alle Apps gleich)
/bp/manifest.webmanifest, /bp/app.svg, /bp/app-192.png, /bp/app-512.png   Bauportal als App installieren (Edge/Chrome)
/bp/undo.js, /bp/seite.js, /bp/befehle.js, /bp/vorschlag.js, /bp/bp.js, /bp/bp.css   gemeinsame Bausteine: Rückgängig-Dock, Bereich rechts, Befehlsleiste, Vorschlagsliste, Grundhilfen ($, api, toast, Fenster …)
/api/bp/projektnamen?q=   Vorschläge für Projektnamen: Projekte im Bautagebuch und Ordner auf dem Server (Ablage)
/api/bp/konto       GET/PUT  persönliche Einstellungen (Versand von Rügen, Kalendertermine) – alle Apps
/api/bp/signatur    POST Foto hochladen (wird freigestellt) · GET PNG · DELETE
/api/bp/mailvorlagen GET alle Vorlagen · PUT (nur Administrator)
/api/bp/versionen?bereich=…   Stände eines Bereichs · POST {bereich, name} jetzigen Stand benennen
/api/bp/versionen/<id>/vergleich  was sich beim Wiederherstellen ändern würde · …/wiederherstellen (POST) · PATCH {name}
/api/bp/versionen/<id>/details   Unterschiede als Zeilen (gegenüber davor und jetzt) · …/teil (POST {weg, aus}) nur eine Stelle zurückholen
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

from . import live, ai, benachrichtigung, briefbogen, bugmeldung, contacts, db, fehler, geo, hilfe, konto, mail, papierkorb, projekte, projektteile, posteingang, rechte, skizze, sso, stammdaten, todo, versionen, vorlagen, vorort, zeiten
from . import logo as bplogo
from . import ablage, handyus, neuigkeiten, stempel, unterschrift

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "head")
BAUKASTEN = ("bp.js", "undo.js", "seite.js", "befehle.js", "vorschlag.js", "spalten.js", "zoom.js", "blase.js", "nav.js", "baum.js", "druck.js")   # Reihenfolge im Bündel /bp/baukasten.js


# Stil je Benutzer (⚙ → Darstellung → Stil) – erlaubte Werte, leer = wie bisher; die Regeln dazu stehen in head/head.css
STIL = {"ecken": {"rund", "dezent", "eckig"}, "schatten": {"aus"}, "sb": {"faden", "pille", "mac", "verlauf", "rinne", "glas"},
        "rahmen": {"mac", "verlauf", "strich", "kantig", "glas"}, "verlauf": {"akzent", "app", "kopf", "licht", "zwei"}, "fenster": {"mac"}, "schalter": {"an"},
        "bewegung": {"aus"}, "effekte": {"aus"}}   # für langsame Rechner: Animationen bzw. Unschärfe-Effekte aus


# Bauportal als App (Edge/Chrome „App installieren“): App-Beschreibung und Symbol – das Symbol als SVG, die PNGs daraus beim Abruf
APP_SVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#2f5d8a"/>'
           '<path d="M112 248 256 128l144 120v152a16 16 0 0 1-16 16H128a16 16 0 0 1-16-16z" fill="none" stroke="#fff" stroke-width="32" stroke-linejoin="round"/>'
           '<path d="M216 416V312h80v104" fill="none" stroke="#fff" stroke-width="32" stroke-linejoin="round"/></svg>')
APP_DATEIEN = ("manifest.webmanifest", "app.svg", "app-192.png", "app-512.png")
_APP_PNG = {}


def _app_datei(name):
    if name == "manifest.webmanifest":
        from .platform import name as _pname
        m = {"name": _pname(), "short_name": _pname()[:12], "start_url": "/", "scope": "/", "display": "standalone",
             "background_color": "#ffffff", "theme_color": "#2f5d8a", "lang": "de",
             "icons": [{"src": "app-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "app-512.png", "sizes": "512x512", "type": "image/png"},
                       {"src": "app.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any"}]}
        return Response(json.dumps(m, ensure_ascii=False), mimetype="application/manifest+json", headers={"Cache-Control": "no-cache"})
    if name == "app.svg":
        return Response(APP_SVG, mimetype="image/svg+xml", headers={"Cache-Control": "max-age=86400"})
    groesse = 192 if name == "app-192.png" else 512
    if groesse not in _APP_PNG:
        try:
            import cairosvg
            _APP_PNG[groesse] = cairosvg.svg2png(bytestring=APP_SVG.encode(), output_width=groesse, output_height=groesse)
        except Exception:   # ohne Cairo: kein PNG (die App-Beschreibung nennt dann nur das SVG)
            return "Nicht gefunden", 404
    return Response(_APP_PNG[groesse], mimetype="image/png", headers={"Cache-Control": "max-age=86400"})


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

    # ---------- Hilfe & Fehler (🐞?): Fragen an die Helfer, Live-Hilfe mit geteiltem Bildschirm ----------
    def _hilfe_mail(cf, an, betreff, text):
        """Mail an Helfer/Fragesteller – im Hintergrund, damit die Antwort nicht auf den Mailserver wartet."""
        if not an or not mail.configured(cf):
            return
        import threading

        def lauf():
            for e in an:
                try:
                    mail.send(cf, e, betreff, text)
                except Exception as er:   # noqa: BLE001 – steht unter Verwaltung → Fehlermeldungen
                    print("Hilfe-Mail:", er, flush=True)
        threading.Thread(target=lauf, daemon=True).start()

    @bp.route("/api/bp/hilfe", methods=["GET", "POST"])
    def hilfe_api():
        """GET: eigene Anfragen, bin ich Helfer, offene Anfragen für Helfer (?alle=1 Verwaltung: alle). POST: neue Anfrage."""
        u = user()
        if not u:
            return jsonify(error="Bitte anmelden."), 401
        if request.method == "POST":
            b = request.get_json(silent=True) or {}
            try:
                with db.tx() as c:
                    r = hilfe.anlegen(c, u, b, request.headers.get("User-Agent", ""))
                    an, cf = hilfe.helfer_mails(c, ohne=u["id"]), mail.conf(c)
                betreff, text = hilfe.mail_text(cf, r, r["user_name"], r["text"] or ("möchte den Bildschirm teilen." if r["art"] == "live" else ""))
                _hilfe_mail(cf, an, betreff, text)
            except ValueError as e:
                return jsonify(error=str(e)), 400
            return jsonify(ok=True, anfrage=r)
        with db.tx() as c:
            helfer = hilfe.ist_helfer(c, u)
            out = {"helfer": helfer, "meine": [] if request.args.get("kurz") else hilfe.meine(c, u)}
            if request.args.get("kurz"):
                out["neu"] = sum(x["neu"] for x in hilfe.meine(c, u))
                out["aenderungen"] = len(neuigkeiten.offen(c, u["id"], set(sso.apps_of(u)) | {"portal"}))   # gelber Rand am „?“ – ohne eigene Abfrage
                ei = c.execute("SELECT data FROM bp_store WHERE key='eingang:stand'").fetchone() if u["is_admin"] else None   # Eingang (Scans): Stand der Dienste, keine eigene Abfrage; Fenster nur für Administratoren
                out["eingang"] = json.loads(ei["data"]) if ei else None
            if helfer:
                out["offen"] = hilfe.fuer_helfer(c, u, alle=bool(request.args.get("alle")) and bool(u["is_admin"]))
            if request.args.get("alle") and u["is_admin"]:
                out["benutzer"], out["helfer_ids"] = hilfe.benutzer(c), hilfe.helfer_ids(c)
        return jsonify(**out)

    @bp.put("/api/bp/hilfe/helfer")
    def hilfe_helfer():
        u = user()
        if not u or not u["is_admin"]:
            return jsonify(error="Nur für die Verwaltung."), 403
        b = request.get_json(silent=True) or {}
        with db.tx() as c:
            hilfe.helfer_setzen(c, b.get("ids") or [], u["name"])
            return jsonify(ok=True, helfer_ids=hilfe.helfer_ids(c))

    @bp.route("/api/bp/hilfe/<int:hid>", methods=["GET", "PUT", "DELETE"])
    def hilfe_eine(hid):
        """GET ?seit=<msg-id>: Anfrage + Verlauf (ab seit) + Live-Stand. PUT {status} oder {text}. DELETE: Verwaltung."""
        u = user()
        if not u:
            return jsonify(error="Bitte anmelden."), 401
        b = request.get_json(silent=True) or {}
        try:
            with db.tx() as c:
                r = hilfe.darf(c, u, hid)
                if not r:
                    return jsonify(error="Diese Anfrage gibt es nicht oder sie ist nicht für dich."), 404
                if request.method == "DELETE":
                    if not u["is_admin"]:
                        return jsonify(error="Nur für die Verwaltung."), 403
                    hilfe.loeschen(c, hid)
                    return jsonify(ok=True)
                post = None
                if request.method == "PUT":
                    if b.get("text"):
                        hilfe.nachricht(c, u, r, b["text"])
                        cf = mail.conf(c)
                        if r["user_id"] == u["id"]:   # Fragesteller schreibt → sein Helfer, sonst alle Helfer
                            an = [x["email"] for x in hilfe.benutzer(c) if x["id"] == r["helfer_id"] and x["email"]] if r["helfer_id"] else hilfe.helfer_mails(c, ohne=u["id"])
                            post = (cf, an) + hilfe.mail_text(cf, r, r["user_name"], b["text"])
                        else:
                            an = [x["email"] for x in hilfe.benutzer(c) if x["id"] == r["user_id"] and x["email"]]
                            from .skizze import name_von
                            post = (cf, an) + hilfe.mail_text(cf, r, name_von(u), b["text"], antwort=True)
                    if b.get("status"):
                        hilfe.status(c, u, r, b["status"])
                    if b.get("zeiger") is not None or "zeiger" in b:
                        hilfe.zeiger_setzen(c, r, b.get("zeiger"))
                    r = hilfe.darf(c, u, hid)
                d = hilfe.lesen(c, u, r, request.args.get("seit") or b.get("seit") or 0)
                d["live"] = hilfe.live_stand(c, r) if r["art"] == "live" else None
                d["ich_helfer"] = hilfe.ist_helfer(c, u) and r["user_id"] != u["id"]
            if post:
                _hilfe_mail(*post)
            return jsonify(**d)
        except ValueError as e:
            return jsonify(error=str(e)), 400

    @bp.route("/api/bp/hilfe/<int:hid>/live", methods=["GET", "POST"])
    def hilfe_live(hid):
        """POST {bild}: der Hilfesuchende schickt sein aktuelles Bild, bekommt Zeiger und neue Nachrichten (?seit=) zurück.
        GET ?seq=: der Helfer holt das Bild, wenn es neuer ist."""
        u = user()
        if not u:
            return jsonify(error="Bitte anmelden."), 401
        try:
            with db.tx() as c:
                r = hilfe.darf(c, u, hid)
                if not r or r["art"] != "live":
                    return jsonify(error="Keine Live-Hilfe."), 404
                if r["status"] in ("erledigt", "beendet"):
                    return jsonify(ende=True, status=r["status"])
                if request.method == "POST":
                    if r["user_id"] != u["id"]:
                        return jsonify(error="Nur der Hilfesuchende schickt Bilder."), 403
                    b = request.get_json(silent=True) or {}
                    seq = hilfe.live_bild_setzen(c, r, b.get("bild") or "") if b.get("bild") else hilfe.live_stand(c, r)["seq"]
                    d = hilfe.lesen(c, u, r, b.get("seit") or 0)
                    return jsonify(seq=seq, status=r["status"], helfer=r["helfer_name"], live=hilfe.live_stand(c, r), nachrichten=d["nachrichten"])
                if r["user_id"] == u["id"] and not u["is_admin"]:
                    return jsonify(error="Das Bild sehen nur Helfer."), 403
                x = hilfe.live_bild(c, r, request.args.get("seq") or 0)
                return jsonify(status=r["status"], helfer=r["helfer_name"], neu=bool(x), **(x or {}))
        except ValueError as e:
            return jsonify(error=str(e)), 400

    @bp.get("/api/bp/hilfe/<int:hid>/bild")
    def hilfe_bild(hid):
        u = user()
        if not u:
            return jsonify(error="Bitte anmelden."), 401
        with db.tx() as c:
            if not hilfe.darf(c, u, hid):
                return jsonify(error="Nicht für dich."), 404
            daten, typ = hilfe.bild(c, hid)
        if not daten:
            return jsonify(error="Kein Bild"), 404
        return Response(daten, mimetype=typ, headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"})

    # ---------- Projekt löschen (Dialog „Projekt bearbeiten“ in jeder App – derselbe Ablauf wie in der Verwaltung, nur Administratoren) ----------
    @bp.get("/api/bp/projekt/<int:pid>/teile")
    def projekt_teile(pid):
        u = user()
        if not u or not u["is_admin"]:
            return jsonify(error="Projekte löschen dürfen nur Administratoren."), 403
        with db.tx() as c:
            t = projektteile.teile(c, pid)
        return jsonify(t) if t else (jsonify(error="Projekt nicht gefunden."), 404)

    @bp.post("/api/bp/projekt/<int:pid>/loeschen")
    def projekt_loeschen(pid):
        u = user()
        if not u or not u["is_admin"]:
            return jsonify(error="Projekte löschen dürfen nur Administratoren."), 403
        b = request.get_json(silent=True) or {}
        with db.tx() as c:
            t = projektteile.teile(c, pid)
        if not t:
            return jsonify(error="Projekt nicht gefunden."), 404
        erlaubt_p, erlaubt_k = {x["id"] for x in t["plans"]}, {x["id"] for x in t["bks"]}   # nur Teile dieses Projekts
        done, errors = projektteile.loeschen(request, u["name"], [x for x in (b.get("plans") or []) if x in erlaubt_p],
                                             [x for x in (b.get("bks") or []) if x in erlaubt_k], pid if b.get("bt") else None)
        if errors and not done:
            return jsonify(error="; ".join(errors)), 502
        return jsonify(ok=True, done=done, errors=errors)

    @bp.post("/api/bp/bug")
    def bug_melden():
        """Bug-Meldung aus der Kopfleiste (🐞): Text, optional Bildschirmfoto, automatisch gesammelte Angaben."""
        u = user()
        if not u:
            return jsonify(error="Bitte anmelden."), 401
        b = request.get_json(silent=True) or {}
        try:
            with db.tx() as c:
                i = bugmeldung.anlegen(c, u, b, request.headers.get("User-Agent", ""))
        except ValueError as e:
            return jsonify(error=str(e)), 400
        return jsonify(ok=True, id=i)

    @bp.route("/api/bp/bug", methods=["GET", "PUT"])
    def bug_liste():
        u = user()
        if not u or not u["is_admin"]:
            return jsonify(error="Nur für die Verwaltung."), 403
        with db.tx() as c:
            if request.method == "PUT":
                bugmeldung.aktion(c, request.get_json(silent=True) or {})
            return jsonify(meldungen=bugmeldung.liste(c), offen=bugmeldung.offen(c))

    @bp.get("/api/bp/bug/<int:i>/bild")
    def bug_bild(i):
        u = user()
        if not u or not u["is_admin"]:
            return jsonify(error="Nur für die Verwaltung."), 403
        with db.tx() as c:
            daten, typ = bugmeldung.bild(c, i)
        if not daten:
            return jsonify(error="Kein Bild"), 404
        return Response(daten, mimetype=typ, headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"})

    @bp.get("/api/bp/bug/export")
    def bug_export():
        """ZIP: bug-meldungen.md (Beschreibung + Angaben + Serverfehler um diese Zeit) und die Bilder."""
        u = user()
        if not u or not u["is_admin"]:
            return jsonify(error="Nur für die Verwaltung."), 403
        ids = [int(x) for x in (request.args.get("ids") or "").split(",") if x.strip().isdigit()][:500]
        with db.tx() as c:
            daten, n = bugmeldung.export(c, ids or None, request.args.get("alle") != "1")
        name = f"bug-meldungen-{datetime.now().strftime('%Y-%m-%d')}.zip"
        return Response(daten, mimetype="application/zip", headers={"Content-Disposition": f'attachment; filename="{name}"'})

    @bp.get("/api/bp/layouts/<b>/wahl")
    def layout_wahl(b):
        """Druckdialog: Layouts eines Ausdrucks zur Auswahl und seine Inhaltseinstellungen (je Layout gespeichert)."""
        from . import layout
        if b not in layout.BEREICHE:
            return jsonify(error="Unbekannter Ausdruck"), 404
        with db.tx() as c:
            W = layout.wahl(c, b)
            W["werte"] = {v["id"]: layout.optionen(c, b, v["id"]) for v in W["layouts"]}
        return jsonify(W)

    @bp.get("/bp/<name>")
    def asset(name):
        if name == "baukasten.js":   # der ganze Baukasten in einer Datei – jede Seite lädt ihn mit einer Zeile, in fester Reihenfolge
            import hashlib
            teile = []
            for f in BAUKASTEN:
                with open(os.path.join(ASSETS, f), encoding="utf-8") as fh:
                    teile.append(f"/* ---- {f} ---- */\n" + fh.read())
            body = "/* Bauplattform-Baukasten: " + ", ".join(BAUKASTEN) + " */\nvoid 0;\n" + "\n;\n".join(teile)
            r = Response(body, mimetype="text/javascript")
            r.set_etag(hashlib.sha1(body.encode()).hexdigest())
            r.headers["Cache-Control"] = "no-cache"
            return r.make_conditional(request)
        if name in APP_DATEIEN:   # App-Beschreibung und Symbol: Bauportal als App installieren
            return _app_datei(name)
        if name not in ("head.js", "head.css", "undo.js", "seite.js", "befehle.js", "vorschlag.js", "spalten.js", "zoom.js", "blase.js", "nav.js", "baum.js", "druck.js", "wahl.js", "datum.js", "neu.js", "hilfeseite.js", "eingang.js", "unterschrift.js", "versand.js", "antrag.js", "aufpost.js", "filter.js", "ablegen.js", "neuleiste.js", "live.js", "bp.js", "bp.css"):   # Kopfleiste und gemeinsame Bausteine aller Apps
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

    @bp.route("/api/bp/darstellung", methods=["GET", "PUT"])
    def darstellung():
        """Farbschema (Hell/Dunkel + benanntes Schema) und Akzentfarbe des angemeldeten Benutzers (gilt in allen Apps)."""
        import re
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        if request.method == "GET":
            with db.tx() as c:
                pr = konto.prefs(c, u["id"])
                return jsonify(theme=sso.theme_of(u) or "dunkel", accent=u["accent"] or "", farbschema=pr.get("farbschema", ""), modus=_modus(c, pr), ki_immer=bool(pr.get("ki_immer")),
                               schrift=pr.get("schrift", ""), schrift_g=pr.get("schrift_g", ""), stil=pr.get("stil") or {})
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
            if "farbschema" in d:
                konto.set_prefs(c, u["id"], {"farbschema": str(d.get("farbschema") or "")}, u["name"])
            if "modus" in d:
                konto.set_prefs(c, u["id"], {"modus": str(d.get("modus") or "")}, u["name"])
            if "ki_immer" in d:
                konto.set_prefs(c, u["id"], {"ki_immer": bool(d.get("ki_immer"))}, u["name"])
            from .platform import SCHRIFTEN, GROESSEN   # Schrift und Schriftgröße je Benutzer (⚙ → Persönlich → Darstellung)
            if "schrift" in d:
                k = str(d.get("schrift") or "").strip().lower()
                konto.set_prefs(c, u["id"], {"schrift": k if k in SCHRIFTEN else ""}, u["name"])
            if "schrift_g" in d:
                k = str(d.get("schrift_g") or "").strip().lower()
                konto.set_prefs(c, u["id"], {"schrift_g": k if k in GROESSEN else ""}, u["name"])
            if "stil" in d:   # Stil je Benutzer: nur bekannte Schlüssel und Werte (leer = wie bisher)
                st = d.get("stil") if isinstance(d.get("stil"), dict) else {}
                konto.set_prefs(c, u["id"], {"stil": {k: str(st[k]) for k, erlaubt in STIL.items() if str(st.get(k) or "") in erlaubt and st.get(k)}}, u["name"])
            r = c.execute("SELECT * FROM users WHERE id=?", (u["id"],)).fetchone()
            pr = konto.prefs(c, u["id"])
        return jsonify(ok=True, theme=sso.theme_of(r) or "dunkel", accent=r["accent"] or "", farbschema=pr.get("farbschema", ""), modus=_modus(c, pr), ki_immer=bool(pr.get("ki_immer")),
                       schrift=pr.get("schrift", ""), schrift_g=pr.get("schrift_g", ""), stil=pr.get("stil") or {})

    def _modus(c, pr):
        """Ansicht des Benutzers: eigene Wahl, sonst Vorgabe des Büros (Einstellung modus_standard), sonst profi."""
        if pr.get("modus") in ("einfach", "profi"):
            return pr["modus"]
        r = c.execute("SELECT value FROM settings WHERE key='modus_standard'").fetchone()
        return r["value"] if r and r["value"] in ("einfach", "profi") else "profi"

    # ---- aktuelles Projekt des Benutzers (Projekt des Bautagebuchs; gilt in allen Apps)
    @bp.route("/api/bp/neu", methods=["GET", "PUT"])
    def neu_api():
        """Neuigkeiten: GET ungesehene (?alle=1: die der letzten 60 Tage) · PUT {ids} als gesehen merken."""
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        apps = set(sso.apps_of(u)) | {"portal"}
        with db.tx() as c:
            if request.method == "PUT":
                ids = (request.get_json(silent=True) or {}).get("ids") or []
                return jsonify(ok=True, n=neuigkeiten.merken(c, u["id"], ids if isinstance(ids, list) else []))
            if request.args.get("alle") == "1":
                return jsonify(eintraege=neuigkeiten.neueste(apps))
            if request.args.get("verlauf") == "1":   # Änderungen im „?“: alles seit Beginn, mit gesehen
                return jsonify(eintraege=neuigkeiten.verlauf(c, u["id"], apps))
            z = c.execute("SELECT value FROM settings WHERE key='neuigkeiten_zeigen'").fetchone()
            z = (z["value"] if z else "") or "admin"   # Vorgabe: nur Administratoren – Kollegen sehen Neuigkeiten erst, wenn die Verwaltung „alle“ wählt
            if z == "aus" or (z == "admin" and not u["is_admin"]):
                return jsonify(eintraege=[])
            return jsonify(eintraege=neuigkeiten.offen(c, u["id"], apps))

    @bp.get("/api/bp/hilfeseite")
    def hilfeseite_api():
        """Hilfe zur App (Register „Hilfe“ im „?“): Text aus hilfe_seiten/<app>.md – erst beim Klick geladen."""
        if not user():
            return jsonify(error="Nicht angemeldet"), 401
        return jsonify(**neuigkeiten.hilfeseite(request.args.get("app", "")))

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

    # ---- Projekt bearbeiten/anlegen (dieselbe Maske in allen Apps) – direkt mit den Bausteinen des Kerns (bpcore.projekte, .rechte, .geo).
    # Für alle angemeldeten Benutzer, soweit sie das Projekt sehen dürfen (Bauleiter-Regel) – ein Projekt gehört keiner einzelnen App.
    # Die Adressen bleiben wie bisher (/api/bp/bt/…); was noch den Dateiserver braucht (Ordnersuche), reicht der Durchgriff unten weiter.
    def _protokoll(wer, aktion, detail=""):
        try:
            with db.tx() as c:
                c.execute("INSERT INTO audit_log(ts, user_name, cat, action, detail) VALUES(?,?,?,?,?)",
                          (datetime.now().isoformat(timespec="seconds").replace("T", " "), wer or "", "inhalt", aktion, str(detail or "")[:200]))
        except Exception as e:   # noqa: BLE001 – das Protokoll darf die Änderung nicht verhindern
            fehler.still(None, "Protokoll (audit_log) schreiben", e)

    @bp.route("/api/bp/bt/projects", methods=["GET", "POST"])
    def kern_projekte():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        if request.method == "POST":
            d = request.get_json(silent=True) or {}
            pid, found, auto = projekte.anlegen(d)
            _protokoll(u["name"], "Projekt angelegt", d.get("name"))
            return jsonify(id=pid, geocoded=found, auto_address=auto)
        with db.tx() as c:
            vis, out = rechte.visible_ids(c, u), []
            for r in c.execute("SELECT * FROM projects ORDER BY id DESC"):
                if vis is not None and r["id"] not in vis:
                    continue
                d = db.to_dict(r)
                d["leaders"] = rechte.ids_of(d.get("leaders"))
                out.append(d)
        return jsonify(out)

    @bp.put("/api/bp/bt/projects/<int:i>")
    def kern_projekt_aendern(i):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        d = request.get_json(silent=True) or {}
        if "name" in d and not str(d["name"]).strip():
            return jsonify(error="Der Name darf nicht leer sein."), 400
        with db.tx() as c:
            r = c.execute("SELECT name FROM projects WHERE id=?", (i,)).fetchone()
            if not r:
                return jsonify(error="Projekt nicht gefunden"), 404
            if not rechte.can_see(c, u, i):
                return jsonify(error="Du hast keinen Zugriff auf dieses Projekt."), 403
        found = projekte.aendern(i, d)
        _protokoll(u["name"], ("Projekt archiviert" if d["archived"] else "Projekt aus dem Archiv geholt") if "archived" in d else "Projekt geändert", d.get("name") or r["name"])
        return jsonify(ok=True, geocoded=found)

    @bp.get("/api/bp/bt/leaders")
    def kern_bauleiter():
        """Auswahl für „Zuständige Bauleiter“: alle Benutzer außer dem Administrator-Konto – für alle Angemeldeten."""
        if not user():
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            return jsonify([{"id": r["id"], "name": r["name"]} for r in c.execute("SELECT id, name FROM users WHERE lower(name)!='admin' ORDER BY name")])

    @bp.get("/api/bp/bt/geocode")
    def kern_adresssuche():
        if not user():
            return jsonify(error="Nicht angemeldet"), 401
        hit = geo.search(request.args.get("q", ""), from_name=request.args.get("from_name") == "1")
        return jsonify(found=bool(hit), **(hit or {}))

    @bp.get("/api/bp/bt/contacts/suggest")
    def kern_kontaktvorschlag():
        """Vorschläge zur Ergänzung eines Kontakts aus dem Netz (OpenStreetMap). ?q=Name&lat=&lon= (Umkreis, optional)."""
        if not user():
            return jsonify(error="Nicht angemeldet"), 401
        lat, lon = request.args.get("lat", type=float), request.args.get("lon", type=float)
        return jsonify(items=geo.companies(request.args.get("q", ""), (lat, lon) if lat is not None and lon is not None else None))

    @bp.get("/api/bp/bt/contacts/suggest/detail")
    def kern_kontaktvorschlag_detail():
        if not user():
            return jsonify(error="Nicht angemeldet"), 401
        return jsonify(geo.company_detail(request.args.get("type", ""), request.args.get("id", "")))

    @bp.get("/api/bp/bt/logo")
    def kern_logo():
        if not user():
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            roh = bplogo.lies(c)
        if not roh:
            return jsonify(error="Kein Logo"), 404
        return Response(roh[0], mimetype=bplogo.MIME.get(roh[1], "image/png"))

    # ---- was noch am Dateiserver des Bautagebuchs hängt (Ordnersuche, Wetter/Ort zu Koordinaten, Baustelle als Kontakt): Durchgriff
    import re as _re
    _BT_ERLAUBT = [("GET", r"geo"), ("GET", r"store/folders"), ("POST", r"projects/\d+/contact"), ("GET", r"ablage/projektordner")]

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

    ablage.routen(bp, user)   # Datei ablegen (alle Apps, Baustein head/ablegen.js) – bpcore/ablage.py
    handyus.routen(bp, user)
    live.routen(bp, user)   # Live-Aktualisierung: Änderungen anderer seit Nr. x – bpcore/live.py, Baustein BPHead.live   # am Handy unterschreiben per QR-Code vom PC – bpcore/handyus.py

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
            if request.args.get("namen"):   # alle Kontakte kurz (Name, Gewerk) – für Auswahlfelder mit Suche
                return jsonify([{"id": r["id"], "name": r["name"], "trade": r["trade"] or ""} for r in c.execute("SELECT id, name, trade FROM contacts ORDER BY lower(name) LIMIT 5000")])
            return jsonify(contacts.suchen(c, request.args.get("q", ""), request.args.get("rolle", "")))

    @bp.post("/api/bp/kontakte")
    @bp.put("/api/bp/kontakte/<int:cid>")
    def kontakt_speichern(cid=None):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {}
        try:
            d = contacts.bereinigen(b, partial=cid is not None)
            wt = contacts.weitere_bereinigen(b["weitere"]) if isinstance(b.get("weitere"), list) else None
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
                if wt is not None:   # weitere Nummern, Mails, Anschriften, Ansprechpartner – im extra-JSON, Rest bleibt
                    ex = json.loads(c.execute("SELECT extra FROM contacts WHERE id=?", (cid,)).fetchone()["extra"] or "{}") or {}
                    ex["weitere"] = wt
                    c.execute("UPDATE contacts SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), cid))
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
        """Eigenes Kennwort ändern (⚙ → Persönlich) – die Benutzerverwaltung selbst liegt nur in der Verwaltung."""
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

    @bp.route("/api/bp/stempel", methods=["GET"])
    @bp.route("/api/bp/stempel/<art>", methods=["GET", "POST", "DELETE"])
    def stempel_api(art=None):
        """Stempel des Büros: GET Liste · GET /<art> PNG · POST/DELETE /<art> (nur Administrator, Verwaltung → Firma & Logo)."""
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if art is None:
                return jsonify(stempel.liste(c))
            if art not in stempel.NAMEN:
                return jsonify(error="Unbekannter Stempel"), 404
            if request.method == "GET":
                png = stempel.holen(c, art)
                return Response(png, mimetype="image/png", headers={"Cache-Control": "no-store"}) if png else ("", 404)
            if not u["is_admin"]:
                return jsonify(error="Die Stempel hinterlegt der Administrator."), 403
            if request.method == "DELETE":
                stempel.loeschen(c, art)
                return jsonify(ok=True)
            f = request.files.get("file")
            raw = f.read() if f else b""
            if not raw or len(raw) > 15 * 1024 * 1024:
                return jsonify(error="Bitte ein Bild des Stempels wählen (höchstens 15 MB)."), 400
            try:
                png = stempel.aufbereiten(raw)
            except ValueError as e:
                return jsonify(error=str(e)), 400
            stempel.speichern(c, art, png, u["name"])
        return jsonify(ok=True)

    def _stempel_felder(art, u):
        """Prüfstempel u. Ä.: Datum und Name des Benutzers in die Felder des Stempels."""
        from datetime import date
        k = u.keys()
        name = " ".join(x for x in ((u["vorname"] if "vorname" in k else "") or "", (u["nachname"] if "nachname" in k else "") or "") if x) or u["name"]
        werte = {"datum": date.today().strftime("%d.%m.%Y"), "name": name}
        return [(t.format(**werte), rx, ry, rh, n) for t, rx, ry, rh, n in stempel.FELDER.get(art or "", ())]

    @bp.post("/api/bp/pdf/unterschreiben")
    def pdf_unterschreiben():
        """PDF aus der Vorschau + Unterschrift (PNG, gezeichnet oder „meine“) → unterschriebenes PDF; steht im Fehlerfall nie halb da."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        f, b = request.files.get("pdf"), request.form
        pdf = f.read(60 * 1024 * 1024) if f else b""
        if b.get("stempel"):
            with db.tx() as c:
                png = stempel.holen(c, b.get("stempel"))
            if not png:
                return jsonify(error="Dieser Stempel ist noch nicht hinterlegt (Verwaltung → Büro-Einstellungen → Firma & Logo)."), 400
        elif b.get("meine") == "1":
            with db.tx() as c:
                png = konto.signatur(c, uid)
            if not png:
                return jsonify(error="Noch keine Unterschrift hinterlegt – unter „Mein Konto“ ein Foto hochladen oder hier zeichnen."), 400
        else:
            g_ = request.files.get("bild")
            png = g_.read(5 * 1024 * 1024) if g_ else b""
        if not pdf.startswith(b"%PDF") or not png:
            return jsonify(error="PDF oder Unterschrift fehlt."), 400
        try:
            neu = unterschrift.stempeln(pdf, png, b.get("seite", 1), b.get("x", 0), b.get("y", 0), b.get("w", 0.3), b.get("h", 0.08), (b.get("text") or "")[:120],
                                       drehung=max(-15.0, min(15.0, float(b.get("drehung") or 0))),
                                       felder=_stempel_felder(b.get("stempel"), u) if b.get("eintragen") == "1" else ())
        except Exception as e:
            fehler.still("head", "PDF unterschreiben", e)
            return jsonify(error="Das PDF ließ sich nicht unterschreiben."), 400
        return Response(neu, mimetype="application/pdf")

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

    @bp.get("/api/bp/versionen/<int:vid>/details")
    def version_details(vid):
        """Unterschiede eines Stands als Zeilen: gegenüber dem Stand davor und gegenüber jetzt (Verlaufsfenster)."""
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            q, _ = _version(c, u, vid)
            if not q:
                return jsonify(error="Nicht gefunden"), 404
            return jsonify(versionen.details(c, vid))

    @bp.post("/api/bp/versionen/<int:vid>/teil")
    def version_teil(vid):
        """Nur eine Stelle zurückholen – {weg: [["k", Schlüssel] | ["i", Kennung] …], aus: "stand" | "davor"}."""
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        d = request.get_json(silent=True) or {}
        with db.tx() as c:
            q, bereich = _version(c, u, vid)
            if not q:
                return jsonify(error="Nicht gefunden"), 404
            try:
                versionen.teil(c, vid, d.get("weg"), "davor" if d.get("aus") == "davor" else "stand", u["name"])
            except ValueError as e:
                return jsonify(error=str(e)), 400
            return jsonify(ok=True, bereich=bereich, versionen=versionen.liste(c, bereich))

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
                for m in d["mails"]:   # To-dos zu Prüfpflichten: wer die Mail sieht, ist beteiligt (auch bei früher angelegten)
                    t = m.get("todo") or {}
                    if isinstance(t.get("id"), int):
                        r = c.execute("SELECT id, faellig, status, erstellt_von, personen FROM todo WHERE id=?", (t["id"],)).fetchone()
                        if r:
                            posteingang.todo_mit(c, uid, r)
                            m["todo"] = {"id": r["id"], "faellig": r["faellig"], "status": r["status"]}
                        else:
                            m.pop("todo", None)
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
                    hinweis = f"Als Termin verschickt ({n} Empfänger:in)." if n else f
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
        # Mit Fälligkeit: Einladung per Mail, die man in Outlook & Co. „Annehmen“ kann (nicht direkt in den Kalender eintragen).
        # Organisator = das Büro-Postfach, aus dem gesendet wird – so kommt die Einladung auch bei der eigenen Aufgabe als Anfrage an.
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
            anh, inv = None, None
            if x["faellig"]:   # mit Fälligkeit: ganztägiger Termin zum Annehmen (Outlook, Gmail, Apple & Co.)
                from . import ical
                # Die Einladung hängt als Datei an (termin.ics, method=REQUEST) und steckt nicht als Kalender-Teil in der Mail:
                # einen eingebetteten Kalender-Teil verarbeitet Microsoft 365 beim Senden selbst als Besprechung und hat die Mail
                # abgewiesen (InvalidRecipientsException); eine angehängte Datei schickt es unverändert weiter wie die Pläne.
                # Organisator = das Postfach, über das gesendet wird (wie bei den Erinnerungen). Bin ich das selbst, nur zum Eintragen.
                host = (cf.get("app_url") or "bauplattform").split("//")[-1].split("/")[0] or "bauplattform"
                org = (M.von(cf) or cf.get("mail_user") or "").strip()
                einl = r["email"].strip().lower() != org.lower()
                ics = ical.einladung(f"todo-{x.get('id') or x['titel'][:20]}-{r['id']}@{host}", x["faellig"], None, 0, f"Aufgabe: {x['titel'][:120]}",
                                     txt, "", org, cf.get("office_name") or wer, r["email"], skizze.name_von(r),
                                     alarm_min=todo.ERINNERUNG.get(x.get("erinnerung") or "", (0, ""))[0], ganztags=True, einladung_=einl)
                if einl and M.graph_aktiv(cf):   # über Microsoft 365: als echte Besprechungsanfrage in der Mail (Exchange zeigt „Annehmen“)
                    inv = ics
                else:   # per SMTP: als Datei anhängen – einen eingebetteten Kalender-Teil hat Microsoft 365 per SMTP abgewiesen
                    anh = [("termin.ics", ics.encode("utf-8"), "text/calendar; method=REQUEST" if einl else "text/calendar; method=PUBLISH")]
                txt += ("\nAls Termineinladung – „Annehmen“ trägt die Fälligkeit in deinen Kalender ein.\n" if inv else
                        "\nIm Anhang als Termin (termin.ics) – „Annehmen“ trägt die Fälligkeit in deinen Kalender ein.\n" if einl
                        else "\nIm Anhang als Termin (termin.ics) – öffnen trägt die Fälligkeit in deinen Kalender ein.\n")
            try:
                M.send(cf, r["email"], f"Aufgabe: {x['titel'][:80]}", txt, sender=wer, reply_to=u["email"] or None, attachments=anh, ical=inv)
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

    # ---- Zeiterfassung: die Kopfleiste meldet je Minute aktiver Arbeit App, Bereich und Projekt (nur für Vorschläge des Benutzers selbst)
    @bp.route("/api/bp/puls", methods=["POST"])
    def puls():
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        if not sso.has_app(u, "zeiten"):
            return jsonify(ok=False)
        b = request.get_json(silent=True) or {}
        try:
            with db.tx() as c:
                zeiten.puls(c, uid, b.get("app"), b.get("bereich"), b.get("projekt"))
        except Exception:   # noqa: BLE001 – vor dem Update der Datenbank (Tabelle fehlt) still bleiben
            return jsonify(ok=False)
        return jsonify(ok=True)

    # ---- Urlaubsanträge in jeder App (head/antrag.js): entscheiden, Rückmeldungen – Regeln in bpcore.zeiten
    @bp.route("/api/bp/antraege", methods=["GET"])
    def antraege_meldungen():
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            return jsonify(zeiten.meldungen(c, u))

    @bp.route("/api/bp/antraege/<int:aid>", methods=["POST"])
    def antrag_meldung(aid):
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {}
        with db.tx() as c:
            try:
                return jsonify(antrag=zeiten.antrag_aktion(c, u, aid, b.get("aktion"), b.get("antwort") or ""))
            except PermissionError as e:
                return jsonify(error=str(e)), 403
            except ValueError as e:
                return jsonify(error=str(e)), 400

    # ---- Vor Ort erkennen (iPhone-Kurzbefehl meldet den Standort; ohne Anmeldung, mit persönlichem Schlüssel)
    @bp.route("/api/bp/vorort", methods=["GET", "POST"])
    def vorort_melden():
        b = request.get_json(silent=True) or {}
        v = lambda k: request.values.get(k) or b.get(k)
        with db.tx() as c:
            code, txt = vorort.melden(c, str(v("k") or "")[:60], v("lat"), v("lon"), ereignis=(v("e") or "").strip().lower() or None)
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
        except kataster.Fehler as e:   # Adresse unbekannt = Hinweis an den Benutzer (kein Serverfehler); sonst Dienst nicht erreichbar
            return jsonify(error=str(e)), 422 if "nicht gefunden" in str(e) else 502
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

    @bp.get("/api/bp/widget/bauzeit")
    def widget_bauzeit():
        """Startseiten-Widget Bauzeitenplan: Vorgänge des gültigen Plans eines Projekts von vor 7 bis in 14 Tagen (wie die Handyansicht)."""
        from datetime import date, timedelta
        from . import plan as _plan
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        if not sso.has_app(u, "gantt"):
            return jsonify(error="Kein Zugriff auf den Bauzeitenplan"), 403
        try:
            pid = int(request.args.get("pid") or 0)
        except ValueError:
            pid = 0
        heute = date.today()
        von, bis = (heute - timedelta(days=7)).isoformat(), (heute + timedelta(days=14)).isoformat()
        with db.tx() as c:
            p = c.execute("SELECT id, name, leaders FROM projects WHERE id=?", (pid,)).fetchone() if pid else None
            if not p:
                return jsonify(error="Projekt nicht gefunden"), 404
            try:
                lead = json.loads(p["leaders"] or "[]")
            except ValueError:
                lead = []
            if lead and not u["is_admin"] and u["id"] not in lead:
                return jsonify(error="Projekt nicht gefunden"), 404
            plaene = []
            for gid, name, data in _plan.plans_mit_id(c, pid):
                data = data if isinstance(data, dict) else {}
                T = {t.get("uid"): t for t in (data.get("tasks") or []) if isinstance(t, dict)}
                zeilen = []
                for sc in data.get("sched") or []:
                    t = T.get(sc.get("uid"))
                    s_, f_ = sc.get("s"), sc.get("f") or sc.get("s")
                    if not t or sc.get("g") or not s_ or f_ < von or s_ > bis:
                        continue
                    pct = t.get("pct") or 0
                    zeilen.append({"name": str(t.get("name") or "Vorgang")[:80], "gw": str(t.get("gw") or "")[:60], "s": s_, "f": f_, "pct": pct,
                                   "verzug": f_ < heute.isoformat() and pct < 100, "ms": not t.get("dur")})
                zeilen.sort(key=lambda z: (z["s"], z["f"]))
                plaene.append({"id": gid, "name": name, "zeilen": zeilen[:40], "mehr": max(0, len(zeilen) - 40)})
        return jsonify(projekt={"id": p["id"], "name": p["name"]}, von=von, bis=bis, heute=heute.isoformat(), plaene=plaene)

    @bp.get("/api/bp/widget/honorar")
    def widget_honorar():
        """Startseiten-Widget Honorarstand (nur Verwaltung): je Honorarauftrag des Projekts Honorar netto, erbracht und Aufwand laut Zeiten."""
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        if not u["is_admin"] or "honorar" in sso.apps_aus():
            return jsonify(error="Nur für die Verwaltung"), 403
        try:
            pid = int(request.args.get("pid") or 0)
        except ValueError:
            pid = 0
        if not pid:
            return jsonify(error="Kein Projekt"), 400
        from . import honorar as H
        out = []
        with db.tx() as c:
            for r in c.execute("SELECT * FROM honorar_auftrag WHERE project_id=? ORDER BY id", (pid,)).fetchall():
                a = H.sauber(dict(r))
                nk = c.execute("SELECT COALESCE(SUM(betrag), 0) AS s FROM honorar_nk WHERE auftrag_id=?", (a["id"],)).fetchone()["s"] or 0
                k = H.rechne(a, H.zeiten_projekt(c, pid, a["einheit"], a["satz_h"]), nk)
                out.append({"id": a["id"], "name": a["name"], "art": a["art"], "status": a["status"], "netto": k["netto"], "erbracht": k.get("erbracht") or 0,
                            "ist_kosten": k["ist_kosten"], "ist_min": k["ist_min"], "warnung": bool(k["warnungen"])})
        return jsonify(auftraege=out)

    @bp.get("/api/bp/widget/kosten")
    def widget_kosten():
        """Startseiten-Widget Kostenstand: Summen aller LVs eines Projekts aus der AVA (mit der Anmeldung des Benutzers gefragt)."""
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        if not sso.has_app(u, "ava"):
            return jsonify(error="Kein Zugriff auf Ausschreibung & Abrechnung"), 403
        try:
            pid = int(request.args.get("pid") or 0)
        except ValueError:
            pid = 0
        if not pid:
            return jsonify(error="Kein Projekt"), 400
        with db.tx() as c:
            tok = sso.current_token(request, c)
        base = os.environ.get("AVA_INTERNAL", "http://ava:8097").rstrip("/")
        try:
            req = urllib.request.Request(f"{base}/api/lv?project_id={pid}", headers={"Cookie": f"{sso.COOKIE}={tok}"})
            with urllib.request.urlopen(req, timeout=20) as r:
                L = json.loads(r.read().decode("utf-8"))
        except (urllib.error.URLError, OSError, ValueError):
            return jsonify(error="Ausschreibung & Abrechnung nicht erreichbar"), 502
        S = {"schaetzung": 0.0, "auftrag": 0.0, "nachtraege": 0.0, "abgerechnet": 0.0, "n": 0, "n_nt": 0}
        for x in L if isinstance(L, list) else []:
            if not isinstance(x, dict) or x.get("archived"):
                continue
            S["n"] += 1
            for k in ("schaetzung", "auftrag", "nachtraege", "abgerechnet"):
                S[k] += float(x.get(k) or 0)
        S["budget"], S["budget_name"] = None, ""
        try:   # Budget: gültige Kostenermittlung der Baukosten, KG 300 + 400 (wie die Budget-Prüfung der To-dos)
            import baukosten as BK
            from . import gueltig
            with db.tx() as c:
                bks = c.execute("SELECT * FROM bk_projects WHERE project_id=? AND archived=0", (pid,)).fetchall()
                gid = gueltig.waehlen([(x["id"], x["created"], False) for x in bks], gueltig.lesen(c, "bk", pid))
                bk = next((x for x in bks if x["id"] == gid), None)
                if bk:
                    k = BK.calc(BK.clean_data(json.loads(bk["data"]) if isinstance(bk["data"], str) else (bk["data"] or {}), c))
                    S["budget"], S["budget_name"] = ((k.get("kg300") or 0) + (k.get("kg400") or 0)) or None, bk["name"] if "name" in bk.keys() else ""
        except Exception as e:   # noqa: BLE001 – ohne Baukosten nur die AVA-Zahlen
            fehler.still(None, "Widget Kostenstand: Budget", e)
        return jsonify(**S)

    def _raster_pruefen(ra):
        """Raster der Startseite prüfen: nur bekannte Felder, Zahlen im Rahmen, ids kurz und harmlos."""
        import re as _re
        ra = ra if isinstance(ra, dict) else {}
        ok = lambda i: isinstance(i, str) and _re.fullmatch(r"[a-z]:[\w.-]{1,40}", i)
        zahl = lambda v, lo, hi: max(lo, min(hi, int(v))) if isinstance(v, (int, float)) else lo
        items = []
        for it in (ra.get("items") or [])[:80]:
            if not isinstance(it, dict) or not ok(it.get("i")):
                continue
            x = {"i": it["i"], "x": zahl(it.get("x"), 0, 11), "y": zahl(it.get("y"), 0, 400), "w": zahl(it.get("w"), 1, 12), "h": zahl(it.get("h"), 1, 20)}
            o = it.get("o")
            if isinstance(o, dict) and len(json.dumps(o)) <= 300:
                x["o"] = {str(k)[:20]: v for k, v in o.items() if isinstance(v, (str, int, float, bool)) and len(str(v)) <= 80}
            items.append(x)
        weg = [i for i in (ra.get("weg") or [])[:80] if ok(i)]
        return {"v": 1, "items": items, "weg": weg, "fest": ra.get("fest") is not False}   # Startseite gesperrt (Vorgabe) oder zum Anordnen frei

    @bp.route("/api/bp/kacheln", methods=["GET", "PUT"])
    def kacheln_api():
        """Reihenfolge der App-Kacheln auf der Startseite (je Benutzer, auf allen Geräten gleich)."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":
                b = request.get_json(silent=True) or {}
                if "raster" in b:   # Startseite als Raster: [{i, x, y, w, h, o}] + ausgeblendete ids
                    ra = _raster_pruefen(b.get("raster"))
                    konto._put(c, f"raster:{uid}", json.dumps(ra), u["name"])
                    return jsonify(raster=ra)
                r = [str(x)[:40] for x in (b.get("reihenfolge") or [])[:120] if isinstance(x, str)]   # '' = leeres Feld
                konto._put(c, f"kacheln:{uid}", json.dumps(r), u["name"])
                return jsonify(reihenfolge=r)
            try:
                r = json.loads(konto._get(c, f"kacheln:{uid}") or "[]")
            except ValueError:
                r = []
            try:
                ra = json.loads(konto._get(c, f"raster:{uid}") or "null")
            except ValueError:
                ra = None
        return jsonify(reihenfolge=r if isinstance(r, list) else [], raster=ra if isinstance(ra, dict) else None)

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
                gesp = next((x for x in posteingang.postfaecher(c, uid)["konten"] if x.get("id") == k.get("id")), None)
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
