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


# Pfade der Apps unter der gemeinsamen Adresse (Verteiler-Container „bauportal“, plattform/router.py)
PATHS = {"portal": "", "bautagebuch": "bautagebuch", "gantt": "bauzeitenplan", "adressen": "adressen", "baukosten": "baukosten", "aufgaben": "maengel", "plaene": "plaene", "ava": "ava", "kommunikation": "kommunikation", "baudaten": "baudaten", "admin": "verwaltung"}


def apps():
    """Apps mit Port und (optional) eigener Adresse hinter dem Reverse Proxy.
    Hat eine App keine eigene Adresse (z. B. die Adressen-App, solange im Nginx Proxy Manager noch nichts eingetragen ist),
    aber SERVER_HOST ist gesetzt (IP oder Name des Docker-Servers), wird sie direkt über http://SERVER_HOST:Port verlinkt
    („auto“). Ohne SERVER_HOST setzt der Browser die Adresse aus dem aktuellen Rechnernamen und dem Port zusammen."""
    e = os.environ.get
    host = e("SERVER_HOST", "").strip()
    base = e("BAUPORTAL_URL", "").strip().rstrip("/")   # alle Apps unter einer Adresse: https://bauportal.firma.de/bautagebuch …
    out = []
    for key, name, port_var, port_def, url_var, extra in (
            ("portal", "Startseite", "PORTAL_PORT", "8090", "PORTAL_URL", {}),
            ("bautagebuch", "Bautagebuch", "BAUTAGEBUCH_PORT", "8080", "BAUTAGEBUCH_URL", {}),
            ("gantt", "Bauzeitenplan", "GANTT_PORT", "8082", "GANTT_URL", {}),
            ("adressen", "Adressen", "ADRESSEN_PORT", "8093", "ADRESSEN_URL", {}),
            ("baukosten", "Baukosten", "BAUKOSTEN_PORT", "8094", "BAUKOSTEN_URL", {}),
            ("aufgaben", "Aufgaben & Mängel", "AUFGABEN_PORT", "8095", "AUFGABEN_URL", {}),
            ("plaene", "Pläne & Dateien", "PLAENE_PORT", "8096", "PLAENE_URL", {}),
            ("ava", "Ausschreibung & Abrechnung", "AVA_PORT", "8097", "AVA_URL", {}),
            ("kommunikation", "Kommunikation", "KOMMUNIKATION_PORT", "8098", "KOMMUNIKATION_URL", {}),
            ("baudaten", "Baudaten", "BAUDATEN_PORT", "8099", "BAUDATEN_URL", {}),
            ("admin", "Verwaltung", "ADMIN_PORT", "8091", "ADMIN_URL", {"admin": True})):
        port, url = int(e(port_var, port_def)), e(url_var, "").strip().rstrip("/")
        a = {"key": key, "name": name, "port": port, "url": url, "path": PATHS[key], **extra}
        if not url and base:
            a["url"] = base + ("/" + PATHS[key] if PATHS[key] else "")
        if not a["url"] and host:
            a["url"], a["auto"] = f"http://{host}:{port}", True
        out.append(a)
    return out


def proxied_hosts():
    """Rechnernamen, unter denen die Apps über den Reverse Proxy (eigene Adressen) laufen."""
    from urllib.parse import urlsplit
    return sorted({urlsplit(a["url"]).hostname for a in apps() if a["url"] and not a.get("auto")} - {None})


def is_proxied(host):
    """Aufruf über den Reverse Proxy? (eingetragene App-Adresse oder Rechnername unter SSO_COOKIE_DOMAIN)"""
    host = (host or "").lower()
    dom = os.environ.get("SSO_COOKIE_DOMAIN", "").strip().lstrip(".").lower()
    return host in proxied_hosts() or bool(dom and (host == dom or host.endswith("." + dom)))


def config(user=None):
    from . import sso
    allowed = set(sso.apps_of(user)) | {"portal"} if user is not None else None
    out = []
    for a in apps():
        a = dict(a)
        if user is not None:
            a["allowed"] = a["key"] in allowed or (a["key"] == "admin" and bool(user["is_admin"]))
        out.append(a)
    return {"version": version(), "apps": out, "proxied": proxied_hosts(),
            "domain": os.environ.get("SSO_COOKIE_DOMAIN", "").strip().lstrip(".").lower()}


def link(app, frag="", conf=None):
    """Adresse für Links in E-Mails: immer über die gemeinsame Adresse (BAUPORTAL_URL, z. B. https://bauportal.gk3-architektur.de/maengel/#mangel-12).
    Ohne BAUPORTAL_URL: die in den Einstellungen eingetragene Adresse (app_url) ohne App-Pfad, sonst leer."""
    base = os.environ.get("BAUPORTAL_URL", "").strip().rstrip("/")
    if not base and conf:
        base = (conf.get("app_url") or "").strip().rstrip("/")
        for p in PATHS.values():
            if p and base.endswith("/" + p):
                base = base[: -len(p) - 1]
                break
    if not base:
        return ""
    path = PATHS.get(app, "")
    return base + ("/" + path if path else "") + "/" + (frag or "")
