"""Gemeinsame Kopfleiste aller Apps der Bauplattform.

Jede App bindet sie mit `app.register_blueprint(head.blueprint())` ein und lädt im Browser /bp/head.css und /bp/head.js.
Die Kopfleiste zeigt: Bauportal / App · aktuelles Projekt · KI-Auswahl · Benutzer mit App-Umschalter und Abmelden.

/bp/head.js, /bp/head.css   Oberfläche (für alle Apps gleich)
/api/bp/projektnamen?q=   Vorschläge für Projektnamen: Projekte im Bautagebuch und Ordner auf dem Server (Ablage)
/api/bp/konto       GET/PUT  persönliche Einstellungen (Versand von Rügen, Kalendertermine) – alle Apps
/api/bp/signatur    POST Foto hochladen (wird freigestellt) · GET PNG · DELETE
/api/bp/mailvorlagen GET alle Vorlagen · PUT (nur Administrator)
/api/bp/ki   GET  Auswahl des Benutzers und welche Anbieter eingerichtet sind
             PUT  {"ki": "intern"|"ollama"|"claude"|"gemini"|"chatgpt"} – gilt in allen Apps und auf allen Geräten
"""
import json, os, urllib.error, urllib.request
from urllib.parse import quote

from flask import Blueprint, Response, jsonify, request, send_from_directory

from . import ai, db, konto, sso, vorlagen

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
        with db.tx() as c:
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
                c.execute(f"UPDATE users SET {', '.join(sets)} WHERE id=?", (*args, u["id"]))
            r = c.execute("SELECT * FROM users WHERE id=?", (u["id"],)).fetchone()
        return jsonify(ok=True, theme=sso.theme_of(r) or "dunkel", accent=r["accent"] or "")

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
            p = konto.set_prefs(c, uid, request.get_json(silent=True) or {}, u["name"]) if request.method == "PUT" else konto.prefs(c, uid)
            sig = konto.signatur(c, uid) is not None
            mail_ok = bool(c.execute("SELECT 1 FROM settings WHERE key='mail_pass' AND value<>''").fetchone())
        return jsonify(**p, signatur=sig, email=u["email"] or "", mail=mail_ok, admin=bool(u["is_admin"]))

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
            with db.tx() as c:
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
        with db.tx() as c:
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
                for k, v in d.items():
                    if k in vorlagen.DEF and isinstance(v, dict):
                        vorlagen.setzen(c, k, v.get("betreff"), v.get("text"))
            return jsonify(vorlagen=vorlagen.alle(c), erkl=vorlagen.ERKL, admin=bool(u["is_admin"]))

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
