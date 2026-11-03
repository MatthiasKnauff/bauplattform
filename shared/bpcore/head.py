"""Gemeinsame Kopfleiste aller Apps der Bauplattform.

Jede App bindet sie mit `app.register_blueprint(head.blueprint())` ein und lädt im Browser /bp/head.css und /bp/head.js.
Die Kopfleiste zeigt: Bauportal / App · aktuelles Projekt · KI-Auswahl · Benutzer mit App-Umschalter und Abmelden.

/bp/head.js, /bp/head.css   Oberfläche (für alle Apps gleich)
/api/bp/ki   GET  Auswahl des Benutzers und welche Anbieter eingerichtet sind
             PUT  {"ki": "intern"|"ollama"|"claude"|"gemini"|"chatgpt"} – gilt in allen Apps und auf allen Geräten
"""
import os

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

    return bp
