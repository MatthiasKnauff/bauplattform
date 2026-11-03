"""Adressen der Apps (für Startseite, App-Umschalter und Weiterleitung zur Anmeldung).

Standard: alle Apps laufen auf demselben Server, unterschieden nur durch den Port. Dann muss nichts eingetragen werden –
der Browser setzt die Adresse aus dem aktuellen Rechnernamen und dem Port zusammen. Hinter einem Reverse Proxy mit eigenen
Adressen je App die *_URL-Variablen setzen (z. B. BAUTAGEBUCH_URL=https://bautagebuch.firma.de).
"""
import os

VERSION_FILE = os.environ.get("BP_VERSION_FILE", "/app/VERSION")


def version():
    try:
        return open(VERSION_FILE, encoding="utf-8").read().strip()
    except OSError:
        return os.environ.get("BP_VERSION", "dev")


def apps():
    e = os.environ.get
    return [
        {"key": "portal", "name": "Startseite", "port": int(e("PORTAL_PORT", "8090")), "url": e("PORTAL_URL", "").rstrip("/")},
        {"key": "bautagebuch", "name": "Bautagebuch", "port": int(e("BAUTAGEBUCH_PORT", "8080")), "url": e("BAUTAGEBUCH_URL", "").rstrip("/")},
        {"key": "gantt", "name": "Bauzeitenplan", "port": int(e("GANTT_PORT", "8082")), "url": e("GANTT_URL", "").rstrip("/")},
        {"key": "admin", "name": "Verwaltung", "port": int(e("ADMIN_PORT", "8091")), "url": e("ADMIN_URL", "").rstrip("/"), "admin": True},
    ]


def config(user=None):
    from . import sso
    allowed = set(sso.apps_of(user)) | {"portal"} if user is not None else None
    out = []
    for a in apps():
        a = dict(a)
        if user is not None:
            a["allowed"] = a["key"] in allowed or (a["key"] == "admin" and bool(user["is_admin"]))
        out.append(a)
    return {"version": version(), "apps": out}
