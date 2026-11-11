"""Verteiler der Bauplattform: alle Apps unter EINER Adresse, unterschieden nur durch den Pfad.

    https://bauportal.firma.de/                → Startseite (portal)
    https://bauportal.firma.de/bautagebuch/    → Bautagebuch
    https://bauportal.firma.de/bauzeitenplan/  → Bauzeitenplan
    https://bauportal.firma.de/adressen/       → Adressen
    https://bauportal.firma.de/baukosten/      → Baukosten
    https://bauportal.firma.de/maengel/        → Aufgaben & Mängel
    https://bauportal.firma.de/baudaten/       → Baudaten (Positionsdatenbank)
    https://bauportal.firma.de/verwaltung/     → Verwaltung

Im Nginx Proxy Manager ist dafür nur ein Eintrag nötig (bauportal… → Docker-Server, Port 8090). Die Verteilung auf die
Container passiert hier im Docker-Netz. Der Pfad wird vor dem Weiterreichen entfernt und als X-Forwarded-Prefix
mitgegeben – die Apps erzeugen damit ihre Adressen selbst richtig. Alles andere (Host, HTTPS, Absender-IP vom Nginx)
wird unverändert durchgereicht.
"""
import http.client, os
from urllib.parse import urlsplit

from bpcore import platform

E = os.environ.get
UPSTREAM = {   # Pfad → interne Adresse im Docker-Netz
    "bautagebuch": E("BAUTAGEBUCH_INTERNAL", "http://bautagebuch:8000"),
    "bauzeitenplan": E("GANTT_INTERNAL", "http://gantt:8082"),
    "adressen": E("ADRESSEN_INTERNAL", "http://adressen:8093"),
    "baukosten": E("BAUKOSTEN_INTERNAL", "http://baukosten:8094"),
    "maengel": E("AUFGABEN_INTERNAL", "http://aufgaben:8095"),
    "plaene": E("PLAENE_INTERNAL", "http://plaene:8096"),
    "ava": E("AVA_INTERNAL", "http://ava:8097"),
    "kommunikation": E("KOMMUNIKATION_INTERNAL", "http://kommunikation:8098"),
    "baudaten": E("BAUDATEN_INTERNAL", "http://baudaten:8099"),
    "zeiten": E("ZEITEN_INTERNAL", "http://zeiten:8101"),
    "honorar": E("HONORAR_INTERNAL", "http://honorar:8103"),
    "bauantrag": E("BAUANTRAG_INTERNAL", "http://bauantrag:8104"),
    "verwaltung": E("ADMIN_INTERNAL", "http://admin:8091"),
}
PORTAL = E("PORTAL_INTERNAL", "http://portal:8090")
HOP = {"connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade"}
TIMEOUT = int(E("ROUTER_TIMEOUT", "300") or 300)   # KI-Prüfungen mit Ollama ohne Grafikkarte können dauern


def _target(path):
    """(Pfad-Präfix, Basisadresse, Restpfad) – Startseite für alles ohne bekanntes Präfix."""
    seg = path.lstrip("/").split("/", 1)
    if seg[0] in UPSTREAM:
        return "/" + seg[0], UPSTREAM[seg[0]], "/" + (seg[1] if len(seg) > 1 else "")
    return "", PORTAL, path or "/"


def app(environ, start_response):
    path = environ.get("PATH_INFO") or "/"
    if path == "/_verteiler/health":
        start_response("200 OK", [("Content-Type", "application/json")])
        return [b'{"ok":true,"version":"' + platform.version().encode() + b'"}']
    prefix, base, rest = _target(path)
    qs = environ.get("QUERY_STRING", "")
    if prefix and path == prefix:   # /bautagebuch → /bautagebuch/ (relative Adressen der App brauchen den Schrägstrich)
        start_response("301 Moved Permanently", [("Location", prefix + "/" + ("?" + qs if qs else "")), ("Content-Length", "0")])
        return [b""]
    u = urlsplit(base)
    headers = {}
    for k, v in environ.items():
        if k.startswith("HTTP_"):
            name = k[5:].replace("_", "-").title()
            if name.lower() not in HOP:
                headers[name] = v
    if environ.get("CONTENT_TYPE"):
        headers["Content-Type"] = environ["CONTENT_TYPE"]
    if environ.get("CONTENT_LENGTH"):
        headers["Content-Length"] = environ["CONTENT_LENGTH"]
    headers["X-Forwarded-Prefix"] = prefix
    headers.setdefault("X-Forwarded-For", environ.get("REMOTE_ADDR", ""))   # vom Nginx gesetzt: unverändert lassen
    headers.setdefault("X-Forwarded-Proto", environ.get("wsgi.url_scheme", "http"))
    headers.setdefault("X-Forwarded-Host", environ.get("HTTP_HOST", ""))
    body = environ["wsgi.input"] if environ.get("CONTENT_LENGTH") not in (None, "", "0") else None
    try:
        con = http.client.HTTPConnection(u.hostname, u.port or 80, timeout=TIMEOUT)
        con.putrequest(environ["REQUEST_METHOD"], rest + ("?" + qs if qs else ""), skip_host=True, skip_accept_encoding=True)
        for k, v in headers.items():
            con.putheader(k, v)
        con.endheaders()
        if body is not None:
            left = int(environ["CONTENT_LENGTH"])
            while left > 0:
                chunk = body.read(min(65536, left))
                if not chunk:
                    break
                con.send(chunk)
                left -= len(chunk)
        r = con.getresponse()
    except Exception as e:   # App startet gerade neu o. ä.: 502 mit Meldung an den Benutzer
        start_response("502 Bad Gateway", [("Content-Type", "text/plain; charset=utf-8")])
        name = prefix.strip("/") or "Startseite"
        return [f"{name} ist gerade nicht erreichbar ({type(e).__name__}). Bitte in einer Minute erneut versuchen.".encode()]
    out = []
    for k, v in r.getheaders():
        if k.lower() in HOP:
            continue
        if k.lower() == "location" and prefix and v.startswith("/") and not v.startswith("//") and not (v == prefix or v.startswith(prefix + "/")):
            v = prefix + v   # Weiterleitung der App auf einen eigenen Pfad ohne Präfix
        out.append((k, v))
    start_response(f"{r.status} {r.reason}", out)

    def stream():
        try:
            while True:
                chunk = r.read(65536)
                if not chunk:
                    break
                yield chunk
        finally:
            con.close()
    return stream()
