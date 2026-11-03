"""Gemeinsame Kopfleiste aller Apps der Bauplattform.

Jede App bindet sie mit `app.register_blueprint(head.blueprint())` ein und lädt im Browser /bp/head.css und /bp/head.js.
Die Kopfleiste zeigt: Bauportal / App · aktuelles Projekt · KI-Auswahl · Benutzer mit App-Umschalter und Abmelden.

/bp/head.js, /bp/head.css   Oberfläche (für alle Apps gleich)
/api/bp/projektnamen?q=   Vorschläge für Projektnamen: Projekte im Bautagebuch und Ordner auf dem Server (Ablage)
/api/bp/ki   GET  Auswahl des Benutzers und welche Anbieter eingerichtet sind
             PUT  {"ki": "intern"|"ollama"|"claude"|"gemini"|"chatgpt"} – gilt in allen Apps und auf allen Geräten
"""
import json, os, urllib.error, urllib.request
from urllib.parse import quote

from flask import Blueprint, jsonify, request, send_from_directory

from . import ai, db, sso

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
