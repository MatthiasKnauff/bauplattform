"""Rechentests bpcore.tempo – Packen (gzip), Stand an den Verweisen der Seite („?v=“), langes Merken nur mit Stand."""
import gzip
import os
import tempfile

from flask import Flask, send_from_directory
from lib import gleich, pruefe

from bpcore import tempo


_DIR = [""]


def _app():
    d = tempfile.mkdtemp()
    _DIR[:] = [d]
    os.makedirs(os.path.join(d, "static"))
    open(os.path.join(d, "static", "x.js"), "w").write("const a = 1;\n" * 400)
    app = Flask("tempo_test", static_folder=None)
    tempo.einrichten(app, "test", [os.path.join(d, "static")])

    @app.get("/")
    def seite():
        return '<link rel="stylesheet" href="bp/head.css"><script src="static/x.js"></script><script src="https://cdn.example/y.js"></script>'

    @app.get("/static/<path:f>")
    def statisch(f):
        r = send_from_directory(os.path.join(d, "static"), f, max_age=0)
        r.headers["Cache-Control"] = "no-cache"
        return r
    return app.test_client()


def test_tempo_seite_stand():
    """Die Seite bekommt an eigenen Skripten und Stilen „?v=…“, fremde Adressen bleiben."""
    import hashlib
    from bpcore.head import ASSETS
    html = _app().get("/").get_data(as_text=True)
    k = lambda f: hashlib.sha1(open(f, "rb").read()).hexdigest()[:10]   # noqa: E731
    pruefe(f'href="bp/head.css?v={k(os.path.join(ASSETS, "head.css"))}"' in html, "Baukasten-Stil: Kennung seines Inhalts – " + html[:120])
    pruefe('src="static/x.js?v=' + hashlib.sha1(("const a = 1;\n" * 400).encode()).hexdigest()[:10] + '"' in html, "eigene Datei: Kennung ihres Inhalts")
    pruefe('src="https://cdn.example/y.js"' in html, "fremde Adresse unverändert")


def test_tempo_kennung_je_datei():
    """Ändert sich eine Datei, ändert sich nur ihre Kennung – die anderen bleiben (der Browser lädt nach einer Freigabe nur Geändertes)."""
    import re as _re
    c = _app()
    kenn = lambda: dict(_re.findall(r'(?:src|href)="([^"?]+)\?v=(\w+)"', c.get("/").get_data(as_text=True)))   # noqa: E731
    vor = kenn()
    open(_DIR[0] + "/static/x.js", "a").write("const b = 2;\n")
    nach = kenn()
    pruefe(vor["static/x.js"] != nach["static/x.js"], "geänderte Datei: neue Kennung")
    gleich(vor["bp/head.css"], nach["bp/head.css"], "unveränderte Datei: Kennung bleibt")


def test_tempo_packen_und_merken():
    """Gepackt nur, wenn der Browser es kann; mit Stand ein Jahr merken, ohne Stand nachfragen."""
    c = _app()
    r = c.get("/static/x.js?v=abc", headers={"Accept-Encoding": "gzip, br"})
    gleich(r.headers.get("Content-Encoding"), "gzip", "gepackt")
    gleich(gzip.decompress(r.get_data()).decode(), "const a = 1;\n" * 400, "Inhalt unverändert")
    pruefe("immutable" in r.headers.get("Cache-Control", ""), "mit Stand: lange merken")
    r2 = c.get("/static/x.js")
    gleich(r2.headers.get("Content-Encoding"), None, "ohne Accept-Encoding ungepackt")
    gleich(r2.headers.get("Cache-Control"), "no-cache", "ohne Stand: nachfragen")
    r3 = c.get("/static/x.js?v=abc", headers={"Accept-Encoding": "gzip"})
    gleich(r3.get_data(), r.get_data(), "aus dem Zwischenspeicher dasselbe")
