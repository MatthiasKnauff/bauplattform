"""„Nur lesen“ je App (Apps je Rolle, beschlossen am 17.11.2026) – eine Sperre im Kern für alle Apps, auf dem Server.

Steht eine App für jemanden auf „nur lesen“ (rechte.app_stufe), lehnt der Server jede ändernde Anfrage (POST, PUT, PATCH, DELETE an /api/…)
mit 403 ab. Ausgenommen ist, was nur die Person selbst betrifft oder nichts ändert (Entscheidung C: Eigenes darf man anlegen):
Anmeldung und Konto, eigene Darstellung und Ansichten, Hinweise/Hilfe/Fehler melden, Neuigkeiten gesehen, Suche, Vorschau, PDF/Druck,
eigene Markierungen im PDF. Die Oberfläche zeigt „nur lesen“ in der Kopfzeile (head.js) – die Sperre selbst ist hier.

Einhängen gleich nach dem Anlegen der App:  nurlesen.einrichten(app, "baukosten")
"""
import re

from flask import jsonify, request

SCHREIBEN = {"POST", "PUT", "PATCH", "DELETE"}
# Pfadteile, die nur die Person selbst betreffen oder nichts ändern
EIGEN = re.compile(r"/api/(?:bp/)?(?:me|login|logout|kennwort|passwort|konto|darstellung|kacheln|ansicht\w*|layout\w*|look|stil|theme|neu|puls|fehler|bug|"
                   r"hilfe\w*|todo|todo-zustand|todo-regeln/ich|antraege|signatur|suche\w*|such\w*|wiki/symbole|wiki/lesen|pdf/zusammen|skizze(?!/[^/]+/(?:einladen|gastmail|gastlinks))|"
                   r"ablage/vorschlag)(?:/|$)|/(?:vorschau|druck|pdf|export|suche)(?:/|$|\?)")


def gesperrt(app_key, user):
    """True, wenn diese Anfrage für den Benutzer in dieser App gesperrt ist (nur lesen)."""
    if request.method not in SCHREIBEN or not request.path.startswith("/api/") or EIGEN.search(request.path):
        return False
    from . import rechte
    return rechte.app_stufe(user, app_key) == "lesen"


def einrichten(app, app_key):
    from . import db, sso
    from .sso import APPS
    if app_key not in {k for k, _ in APPS}:
        return

    @app.before_request
    def _nur_lesen():
        if request.method not in SCHREIBEN or not request.path.startswith("/api/") or EIGEN.search(request.path):
            return None
        try:
            with db.tx() as c:
                u = sso.current(c, request)
        except Exception:   # noqa: BLE001 – ohne Datenbank (Rechentests): nichts sperren
            return None
        if u is not None and gesperrt(app_key, u):
            name = dict(APPS).get(app_key, app_key)
            return jsonify(error=f"Nur lesen: In „{name}“ kannst du ansehen, aber nichts ändern. Das legt die Verwaltung in deiner Rolle fest.",
                           nur_lesen=True), 403
        return None
