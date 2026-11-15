"""Planung – die kleine App zum Projektmodell (Etappe 4, Entwurf „Planung – Verknüpfungen“, entschieden am 15.11.2026).
Links die Bereiche (bpNav): Verknüpfungen (Karte: je App eine Linie zum Projektmodell), Assistent (Angaben zum Projekt), Stände.
Die App hat keine eigenen Daten und keine eigenen Regeln: Modell, Stände, Linien, Verlauf und Hinweise gehören dem Kern
(bpcore/modell.py, /api/bp/modell/<pid> – über die gemeinsame Kopfleiste in jeder App erreichbar); die Oberfläche sind die
Bausteine bp/karte.js und bp/assistent.js, dieselben wie im Bereich rechts der anderen Apps.
"""
from flask import g, jsonify, redirect, request

from bpcore import platform, sso
import common as C

app = C.make_app(__name__)
KEY = "planung"


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
        return C.gesperrt(KEY, "Für „Planung“ ist dein Konto nicht freigeschaltet.")
    g.user = u


@app.get("/")
def index():
    return C.page("planung.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))

