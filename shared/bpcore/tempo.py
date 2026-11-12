"""Schneller laden – für alle Apps (Flask), eingehängt gleich nach dem Anlegen der App:  tempo.einrichten(app, "baukosten")

1. Packen: Text, Skripte, Stile, JSON und SVG gehen gepackt (gzip) an den Browser, wenn er es kann. Feste Dateien (static/, bp/) werden
   gepackt im Speicher gehalten (je Datei und Stand), damit sie nicht bei jedem Aufruf neu gepackt werden.
2. Merken: In jeder ausgelieferten Seite (HTML) bekommen die Verweise auf Skripte und Stile aus static/ und bp/ den Stand angehängt
   („?v=…“). Solche Abrufe darf der Browser ein Jahr behalten – nach einem neuen Stand heißen die Adressen anders und werden neu geladen.
   Ohne „?v=“ bleibt es bei „no-cache“ (nachfragen, ob sich etwas geändert hat).
3. Langsame Anfragen (über 1 s) landen als Hinweis in den Fehlermeldungen der Verwaltung (Art „langsam“, je Pfad höchstens alle 10 Minuten).

Muss als ERSTES after_request angemeldet werden: Flask ruft sie in umgekehrter Reihenfolge auf, so packt dieses zuletzt – nach allen Kopfzeilen.
"""
import gzip
import hashlib
import os
import re
import threading
import time

from flask import g, request

ARTEN = ("text/", "application/javascript", "application/json", "image/svg+xml", "application/manifest+json", "application/xml")
MIN, MAX = 1400, 6 * 1024 * 1024
LANGSAM = float(os.environ.get("BP_LANGSAM", "1.0"))
_ZIP, _ZIP_MAX = {}, 300            # (Pfad, ETag) → gepackte Bytes
_lock = threading.Lock()
_gemeldet = {}                       # Pfad → Zeitpunkt der letzten Meldung „langsam“
_VERWEIS = re.compile(r'''((?:src|href)=["'])((?:\.\./|/)?(?:[\w-]+/)?(?:static|bp)/[^"'?#]+\.(?:js|css))(["'])''')


def stand():
    """Kennung des Stands für „?v=“ – aus der Versionsdatei des Images (ändert sich mit jedem Build), sonst aus dem Startzeitpunkt."""
    try:
        from .platform import version
        v = version()
    except Exception:   # noqa: BLE001
        v = ""
    if not v or v == "dev":
        v = str(_START)
    return hashlib.sha1(v.encode()).hexdigest()[:10]


_START = time.time()


def _fest(pfad):
    return "/static/" in pfad or pfad.startswith("/static/") or "/bp/" in pfad or pfad.startswith("/bp/")


def _packbar(resp):
    if resp.status_code != 200 or resp.headers.get("Content-Encoding") or not any((resp.mimetype or "").startswith(a) for a in ARTEN):
        return False
    if (resp.mimetype or "") == "text/event-stream":
        return False
    if "gzip" not in (request.headers.get("Accept-Encoding") or "").lower():
        return False
    if request.headers.get("Range"):
        return False
    n = resp.content_length if resp.direct_passthrough else resp.calculate_content_length()
    if n is not None and (n < MIN or n > MAX):
        return False
    return not resp.is_streamed or (resp.direct_passthrough and _fest(request.path))


def _packen(resp):
    fest = _fest(request.path)
    etag = resp.headers.get("ETag", "")
    key = (request.path, etag) if fest and etag else None
    with _lock:
        z = _ZIP.get(key) if key else None
    if z is None:
        resp.direct_passthrough = False
        roh = resp.get_data()
        if len(roh) < MIN or len(roh) > MAX:
            return resp
        z = gzip.compress(roh, compresslevel=6)
        if len(z) >= len(roh):
            return resp
        if key:
            with _lock:
                if len(_ZIP) >= _ZIP_MAX:
                    _ZIP.pop(next(iter(_ZIP)))
                _ZIP[key] = z
    else:
        resp.direct_passthrough = False
    resp.set_data(z)
    resp.headers["Content-Encoding"] = "gzip"
    resp.headers["Content-Length"] = str(len(z))
    resp.headers.add("Vary", "Accept-Encoding")
    if etag and not etag.startswith("W/"):
        resp.headers["ETag"] = "W/" + etag
    return resp


def _seite(resp):
    """Verweise auf Skripte und Stile in einer Seite mit dem Stand versehen."""
    resp.direct_passthrough = False
    html = resp.get_data(as_text=True)
    v = stand()
    neu = _VERWEIS.sub(lambda m: f"{m[1]}{m[2]}?v={v}{m[3]}", html)
    if neu != html:
        resp.set_data(neu)
    return resp


def _melden(app_name, dauer):
    pfad = request.path
    if pfad.endswith(("/live", "/api/bp/live")) or "/stream" in pfad:
        return
    jetzt = time.time()
    with _lock:
        if jetzt - _gemeldet.get(pfad, 0) < 600:
            return
        _gemeldet[pfad] = jetzt
    try:
        from . import fehler
        u = getattr(g, "user", None)
        name = (u.get("name") if hasattr(u, "get") else (u["name"] if u else "")) if u else ""
        fehler.melden(app_name, "langsam", f"{request.method} {re.sub(r'/[0-9]+(?=/|$)', '/#', pfad)} brauchte {dauer:.1f} s",
                      pfad=pfad, user_name=name or "", browser=(request.headers.get("User-Agent") or "")[:300])
    except Exception:   # noqa: BLE001 – Messung darf nie stören
        pass


def einrichten(app, name=""):
    @app.before_request
    def _tempo_start():
        g._tempo = time.monotonic()

    @app.after_request
    def _tempo_ende(resp):
        try:
            if request.args.get("v") and _fest(request.path) and resp.status_code in (200, 304):
                resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            if resp.status_code == 200 and resp.mimetype == "text/html" and (not resp.is_streamed or resp.direct_passthrough):
                resp = _seite(resp)
            if _packbar(resp):
                resp = _packen(resp)
            t0 = getattr(g, "_tempo", None)
            if t0 is not None and time.monotonic() - t0 > LANGSAM:
                _melden(name or app.name, time.monotonic() - t0)
        except Exception:   # noqa: BLE001 – lieber ungepackt als gar nicht
            pass
        return resp
