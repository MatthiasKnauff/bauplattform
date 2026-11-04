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
/api/bp/kontakt    POST {name, email, trade, contact_person}  Kontakt schnell anlegen (nach Versand an eine neue Adresse)
/api/bp/kontakt/<id>/verlauf  Benachrichtigungsverlauf (Planversand, Rügen …)
/api/bp/projekt  GET/PUT {id}  aktuelles Projekt des Benutzers – beim Wechsel der App bleibt man im selben Projekt
/api/bp/ki   GET  Auswahl des Benutzers und welche Anbieter eingerichtet sind
             PUT  {"ki": "intern"|"ollama"|"claude"|"gemini"|"chatgpt"} – gilt in allen Apps und auf allen Geräten
"""
import json, os, urllib.error, urllib.request
from datetime import datetime
from urllib.parse import quote

from flask import Blueprint, Response, jsonify, request, send_from_directory

from . import ai, benachrichtigung, briefbogen, db, konto, sso, versionen, vorlagen

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
        return jsonify(choice=ai.choice_of(u), providers=prov)

    @bp.put("/api/bp/ki")
    def ki_put():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        k = str((request.get_json(silent=True) or {}).get("ki") or "").strip().lower()
        if k not in ai.KEYS:
            return jsonify(error="Unbekannte KI."), 400
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
                return jsonify(vorhanden=bool(data), groesse=len(data or b""))
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
        return jsonify(ok=True, vorhanden=True, groesse=len(data))

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
            except Exception:
                folders = []
        return jsonify(projects=out[:20], folders=folders)

    return bp
