"""Am PC unterschreiben lassen, auf dem Handy zeichnen: QR-Code vom PC → Handy öffnet /bp/hu/<token> (ohne Anmeldung, der
Token ist der Schlüssel), zeichnet und schickt die Unterschrift; der PC holt sie ab und setzt sie ins PDF.

POST /api/bp/handy-us            (angemeldet) → {token}
GET  /api/bp/handy-us/<token>    (angemeldet, nur wer ihn angelegt hat) → {fertig}; mit ?png=1 die Unterschrift (danach gelöscht)
GET  /bp/hu/<token>              Seite für das Handy (Zeichenfläche aus head/unterschrift.js)
POST /bp/hu/<token>              Unterschrift vom Handy (PNG, höchstens 2 MB, nur einmal)
GET  /api/bp/qr?text=…           QR-Code als SVG (angemeldet) – für Links, die man mit dem Handy öffnen soll
Gilt 10 Minuten. Gespeichert kurz in bp_store „handyus:<token>“.
"""
import base64, json, secrets, time
from datetime import datetime

GUELTIG = 600


def qr_svg(text, px=240):
    """QR-Code als SVG mit reportlab (ohne weiteres Paket)."""
    from reportlab.graphics import renderSVG
    from reportlab.graphics.barcode.qr import QrCodeWidget
    from reportlab.graphics.shapes import Drawing
    w = QrCodeWidget(text, barLevel="M")
    b = w.getBounds()
    bw, bh = b[2] - b[0], b[3] - b[1]
    d = Drawing(px, px, transform=[px / bw, 0, 0, px / bh, 0, 0])
    d.add(w)
    return renderSVG.drawToString(d)


SEITE = """<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Unterschreiben</title><style>body{margin:0;font:16px system-ui,sans-serif;background:#f3f2ef;color:#222}.m{padding:2rem 1.2rem;text-align:center}
.bpu-b{border:1px solid #ccc;background:#fff;border-radius:10px;padding:.5rem 1rem;font:inherit}.pri{background:#2b4a7a;color:#fff;border-color:#2b4a7a}.bpu-pad [data-p="meine"]{display:none}</style>
<script>window.BPHead = window.BPHead || {};</script><script src="../unterschrift.js"></script></head><body>
<div class="m" id="m"><p><b>Unterschrift für den PC</b></p><p>Gleich öffnet sich die Zeichenfläche – am besten das Handy quer halten.</p>
<button type="button" class="bpu-b pri" id="los">Unterschreiben</button></div>
<script>
const m = document.getElementById('m');
async function los() {
  const w = await window.bpUnterschrift.pad();
  if (!w || !w.blob) { m.innerHTML = '<p>Abgebrochen.</p><button type="button" class="bpu-b pri" id="los">Noch einmal</button>'; document.getElementById('los').onclick = los; return; }
  const fd = new FormData(); fd.append('png', await w.blob, 'unterschrift.png');
  const r = await fetch(location.pathname, { method: 'POST', body: fd }), j = await r.json().catch(() => ({}));
  m.innerHTML = r.ok ? '<p style="font-size:2rem">✓</p><p><b>Übertragen.</b><br>Am PC erscheint die Unterschrift gleich im Dokument. Diese Seite kann zu.</p>'
    : '<p><b>' + (j.error || 'Fehler') + '</b></p>';
}
document.getElementById('los').onclick = los;
</script></body></html>"""


def routen(bp, user):
    from flask import Response, jsonify, request
    from . import db

    def lies(c, tok):
        r = c.execute("SELECT data FROM bp_store WHERE key=?", ("handyus:" + tok,)).fetchone()
        try:
            x = json.loads(r["data"]) if r else None
        except ValueError:
            x = None
        if x and time.time() - x.get("t", 0) > GUELTIG:
            c.execute("DELETE FROM bp_store WHERE key=?", ("handyus:" + tok,))
            return None
        return x

    def schreib(c, tok, x):
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated",
                  ("handyus:" + tok, json.dumps(x), datetime.now().isoformat(timespec="seconds"), "handy"))

    def gut(tok):
        return isinstance(tok, str) and 20 <= len(tok) <= 60 and all(ch.isalnum() or ch in "-_" for ch in tok)

    @bp.post("/api/bp/handy-us")
    def handyus_neu():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        tok = secrets.token_urlsafe(24)
        with db.tx() as c:
            c.execute("DELETE FROM bp_store WHERE key LIKE 'handyus:%' AND updated < ?",
                      (datetime.fromtimestamp(time.time() - GUELTIG).isoformat(timespec="seconds"),))   # Abgelaufene wegräumen
            schreib(c, tok, {"uid": u["id"], "t": time.time(), "png": None})
        return jsonify(token=tok, gueltig=GUELTIG)

    @bp.get("/api/bp/handy-us/<tok>")
    def handyus_stand(tok):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            x = lies(c, tok) if gut(tok) else None
            if not x or x.get("uid") != u["id"]:
                return jsonify(error="Abgelaufen – bitte neu anfangen."), 404
            if request.args.get("png") and x.get("png"):
                c.execute("DELETE FROM bp_store WHERE key=?", ("handyus:" + tok,))   # nur einmal abholbar
                return Response(base64.b64decode(x["png"]), mimetype="image/png", headers={"Cache-Control": "no-store"})
        return jsonify(fertig=bool(x.get("png")))

    @bp.get("/bp/hu/<tok>")
    def handyus_seite(tok):
        return Response(SEITE, mimetype="text/html", headers={"Cache-Control": "no-store", "X-Robots-Tag": "noindex"})

    @bp.post("/bp/hu/<tok>")
    def handyus_senden(tok):
        f = request.files.get("png")
        roh = f.read(2 * 1024 * 1024 + 1) if f else b""
        if not roh or len(roh) > 2 * 1024 * 1024 or not roh.startswith(b"\x89PNG"):
            return jsonify(error="Keine gültige Unterschrift."), 400
        with db.tx() as c:
            x = lies(c, tok) if gut(tok) else None
            if not x:
                return jsonify(error="Der Code ist abgelaufen – am PC neu anfangen."), 404
            if x.get("png"):
                return jsonify(error="Schon übertragen."), 409
            x["png"] = base64.b64encode(roh).decode()
            schreib(c, tok, x)
        return jsonify(ok=True)

    @bp.get("/api/bp/qr")
    def qr():
        if not user():
            return jsonify(error="Nicht angemeldet"), 401
        t = (request.args.get("text") or "")[:600]
        if not t:
            return jsonify(error="Text fehlt"), 400
        return Response(qr_svg(t), mimetype="image/svg+xml", headers={"Cache-Control": "no-store"})
