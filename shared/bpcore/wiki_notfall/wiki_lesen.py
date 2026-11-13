"""Wiki-Notfallleser der Bauplattform – liest das Wiki ohne Bauplattform und ohne Datenbank.

Braucht nur Python 3 (keine weiteren Pakete). Liest:
  <Bauportal>/06 Sicherung/Wiki/wiki.json   die Einträge (Text, Kapitel, Vorschaubilder)
  <Bauportal>/02 Wiki/…                     die Dateien zu den Einträgen (Bilder, PDFs …)

Aufruf:  python wiki_lesen.py "Z:\\"          (Laufwerk oder Ordner der Freigabe Bauportal)
         dann im Browser http://localhost:8080 öffnen.
Mit Docker siehe LIESMICH.txt.
"""
import html, json, mimetypes, os, sys, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

WURZEL = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.environ.get("BAUPORTAL", "/bauportal"))
PORT = int(os.environ.get("PORT", "8080"))
HOST = os.environ.get("HOST", "127.0.0.1")   # nur dieser Rechner; im Docker-Container 0.0.0.0 (Port dort nur an 127.0.0.1 binden)


def laden():
    for p in (os.path.join(WURZEL, "06 Sicherung", "Wiki", "wiki.json"), os.path.join(WURZEL, "wiki.json")):
        if os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                return json.load(f)
    return {"stand": "", "eintraege": []}


STIL = """<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;color:#1f2633;background:#f6f7f9}
header{background:#3d5a99;color:#fff;padding:10px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
header a{color:#fff;text-decoration:none;font-weight:700}form{margin-left:auto}input{font:inherit;padding:4px 8px;border-radius:6px;border:0;width:16rem;max-width:60vw}
main{display:grid;grid-template-columns:minmax(12rem,18rem) 1fr;gap:16px;padding:16px;max-width:1200px;margin:auto}
nav a{display:block;color:#3d5a99;text-decoration:none;padding:2px 0}nav b{display:block;margin-top:8px}
article{background:#fff;border:1px solid #e1e4ea;border-radius:10px;padding:12px 16px;margin-bottom:12px}
.mute{color:#6b7280;font-size:.85rem}.dat{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
.dat a{display:grid;gap:4px;width:9rem;font-size:.8rem;color:#3d5a99;text-decoration:none}.dat img{max-width:9rem;border:1px solid #e1e4ea;border-radius:6px}
pre{white-space:pre-wrap;font:inherit;margin:.4rem 0}@media(max-width:700px){main{grid-template-columns:1fr}}</style>"""


def seite(daten, q="", kap=""):
    e = daten.get("eintraege", [])
    kapitel = sorted({x.get("kapitel") or "Ohne Kapitel" for x in e})
    ql = q.lower()
    treffer = [x for x in e if (not kap or (x.get("kapitel") or "Ohne Kapitel") == kap)
               and (not ql or ql in " ".join(str(x.get(k, "")) for k in ("titel", "text", "stichworte", "kapitel")).lower())]
    h = html.escape
    nav = "".join(f'<a href="/?k={urllib.parse.quote(k)}">{h(k)}</a>' for k in kapitel)
    art = ""
    for x in treffer:
        dat = "".join(
            f'<a href="/datei?p={urllib.parse.quote(d.get("pfad", ""))}" target="_blank">'
            + (f'<img src="{d["vorschau"]}" alt="">' if d.get("vorschau", "").startswith("data:image/") else "📄")
            + f'{h(d.get("name", ""))}</a>' for d in x.get("dateien", []))
        art += (f'<article><div class="mute">{h(x.get("kapitel") or "")} · {h((x.get("updated") or x.get("created") or "")[:10])}</div>'
                f'<h3 style="margin:.2rem 0">{h(x.get("titel") or "")}</h3><pre>{h(x.get("text") or "")}</pre>'
                + (f'<div class="mute">Stichworte: {h(x["stichworte"])}</div>' if x.get("stichworte") else "")
                + (f'<div class="dat">{dat}</div>' if dat else "") + "</article>")
    return (f'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wiki (Notfall)</title>{STIL}'
            f'<header><a href="/">Wiki des Büros</a><span class="mute" style="color:#dfe6f5">Notfallleser · Stand {h(daten.get("stand", "")[:16].replace("T", " "))} · {len(e)} Einträge</span>'
            f'<form><input name="q" value="{h(q)}" placeholder="Suchen …"></form></header>'
            f'<main><nav><b>Kapitel</b>{nav or "<span class=mute>keine</span>"}</nav><section>'
            f'{art or "<p class=mute>Keine Einträge gefunden.</p>"}</section></main>')


class H(BaseHTTPRequestHandler):
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        a = urllib.parse.parse_qs(u.query)
        if u.path == "/datei":
            rel = (a.get("p") or [""])[0]
            basis = os.path.realpath(os.path.join(WURZEL, "02 Wiki"))
            p = os.path.realpath(os.path.join(basis, *[t for t in rel.replace("\\", "/").split("/") if t not in ("", ".", "..")]))
            if not p.startswith(basis + os.sep) or not os.path.isfile(p):
                return self.antwort(404, b"Datei nicht gefunden", "text/plain; charset=utf-8")
            with open(p, "rb") as f:
                return self.antwort(200, f.read(), mimetypes.guess_type(p)[0] or "application/octet-stream")
        body = seite(laden(), (a.get("q") or [""])[0], (a.get("k") or [""])[0]).encode("utf-8")
        self.antwort(200, body, "text/html; charset=utf-8")

    def antwort(self, code, body, typ):
        self.send_response(code)
        self.send_header("Content-Type", typ)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print(f"Wiki-Notfallleser: {WURZEL} → http://localhost:{PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), H).serve_forever()
