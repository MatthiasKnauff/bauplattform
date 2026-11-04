"""Gemeinsam auf einem Plan skizzieren (Ansicht für PDFs in allen Apps, siehe head.js → H.ansehen).

Einer öffnet einen Plan und startet „Markieren“: Der Plan (PDF) wird in die Sitzung kopiert (Tabelle skizze), damit auch
Kollegen in einer anderen App ihn sehen. Eingeladen wird über die Benutzerliste (Hinweis erscheint in jeder App) oder per Link
(#skizze=<id>). Striche liegen in skizze_strich; jede Änderung erhöht skizze.seq, die Teilnehmer holen alle ~0,7 s nur das Neue
(seq > zuletzt gesehen). Wo die anderen gerade zeigen, steht in skizze_cursor (Laserpointer, nur die letzten Sekunden).
Koordinaten sind relativ zur Seite (0…1) – unabhängig von Zoom und Bildschirm.
"""
import json, re, secrets, time
from datetime import datetime

FARBEN = ["#e5484d", "#2f7fe0", "#1f9d55", "#e08a00", "#8e4ec6", "#0e9aa7"]
ARTEN = ("stift", "marker", "text", "pfeil", "rechteck")
MAX_PDF = 60 * 1024 * 1024


def _now():
    return datetime.now().isoformat(timespec="seconds")


def name_von(u):
    k = set(u.keys()) if hasattr(u, "keys") else set()
    vn, nn = (u["vorname"] if "vorname" in k else "") or "", (u["nachname"] if "nachname" in k else "") or ""
    return f"{vn} {nn}".strip() or u["name"]


def _teil(r):
    try:
        return json.loads(r["teilnehmer"] or "[]")
    except ValueError:
        return []


def darf(c, sid, u):
    """Sitzung, wenn der Benutzer Besitzer oder Teilnehmer ist (oder per Link beitritt: beitreten())."""
    r = c.execute("SELECT id, name, owner, owner_name, seq, teilnehmer, created FROM skizze WHERE id=?", (sid,)).fetchone()
    if not r:
        return None
    return r if (r["owner"] == u["id"] or u["id"] in _teil(r) or u["is_admin"]) else None


def neu(c, u, name, pdf):
    if not pdf or not pdf[:5] == b"%PDF-":
        raise ValueError("Bitte einen Plan als PDF öffnen.")
    if len(pdf) > MAX_PDF:
        raise ValueError("Der Plan ist zu groß (höchstens 60 MB).")
    sid = secrets.token_urlsafe(9)
    c.execute("INSERT INTO skizze(id, name, owner, owner_name, datei, seq, teilnehmer, created, updated) VALUES(?,?,?,?,?,0,?,?,?)",
              (sid, (name or "Plan.pdf")[:200], u["id"], name_von(u), pdf, json.dumps([u["id"]]), _now(), _now()))
    return sid


def beitreten(c, sid, u):
    r = c.execute("SELECT id, teilnehmer FROM skizze WHERE id=?", (sid,)).fetchone()
    if not r:
        return False
    t = _teil(r)
    if u["id"] not in t:
        t.append(u["id"])
        c.execute("UPDATE skizze SET teilnehmer=? WHERE id=?", (json.dumps(t), sid))
    c.execute("UPDATE skizze_einladung SET erledigt=1 WHERE skizze_id=? AND an=?", (sid, u["id"]))
    return True


def farbe_von(r, uid):
    t = _teil(r)
    return FARBEN[(t.index(uid) if uid in t else len(t)) % len(FARBEN)]


def _sauber(d):
    art = d.get("art") if d.get("art") in ARTEN else "stift"
    pts = []
    for p in (d.get("pts") or [])[:3000]:
        try:
            x, y = float(p[0]), float(p[1])
        except (TypeError, ValueError, IndexError):
            continue
        pts.append([round(min(1.2, max(-0.2, x)), 5), round(min(1.2, max(-0.2, y)), 5)])
    if not pts:
        raise ValueError("leerer Strich")
    farbe = d.get("farbe") if re.fullmatch(r"#[0-9a-fA-F]{6}", str(d.get("farbe") or "")) else "#e5484d"
    try:
        breite = round(min(0.05, max(0.0005, float(d.get("breite") or 0.003))), 5)
    except (TypeError, ValueError):
        breite = 0.003
    try:
        seite = max(1, min(9999, int(d.get("seite") or 1)))
    except (TypeError, ValueError):
        seite = 1
    out = {"seite": seite, "art": art, "farbe": farbe, "breite": breite, "pts": pts}
    if art == "text":
        out["text"] = str(d.get("text") or "")[:300]
    return out


def _seq(c, sid):
    return c.execute("UPDATE skizze SET seq=seq+1, updated=? WHERE id=? RETURNING seq", (_now(), sid)).fetchone()["seq"]


def strich(c, sid, u, d):
    s = _sauber(d)
    c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", ("skizze:" + sid,))
    seq = _seq(c, sid)
    i = c.execute("INSERT INTO skizze_strich(skizze_id, seq, uid, name, data, created) VALUES(?,?,?,?,?,?) RETURNING id",
                  (sid, seq, u["id"], name_von(u), json.dumps(s), _now())).fetchone()["id"]
    return {"id": i, "seq": seq}


def loeschen(c, sid, u, was):
    """was: Strich-id, „letzter“ (eigener letzter Strich) oder „alle“ (nur Besitzer: alles, sonst alle eigenen)."""
    c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", ("skizze:" + sid,))
    r = c.execute("SELECT owner FROM skizze WHERE id=?", (sid,)).fetchone()
    if was == "letzter":
        x = c.execute("SELECT id FROM skizze_strich WHERE skizze_id=? AND uid=? AND geloescht=0 ORDER BY id DESC LIMIT 1", (sid, u["id"])).fetchone()
        ids = [x["id"]] if x else []
    elif was == "alle":
        q = "SELECT id FROM skizze_strich WHERE skizze_id=? AND geloescht=0" + ("" if r and r["owner"] == u["id"] else " AND uid=?")
        ids = [x["id"] for x in c.execute(q, (sid,) if r and r["owner"] == u["id"] else (sid, u["id"]))]
    else:
        try:
            ids = [int(was)]
        except (TypeError, ValueError):
            ids = []
    if not ids:
        return 0
    seq = _seq(c, sid)
    for i in ids:
        c.execute("UPDATE skizze_strich SET geloescht=1, seq=? WHERE id=? AND skizze_id=?", (seq, i, sid))
    return len(ids)


def stand(c, sid, u, seit=0):
    """Was sich seit `seit` geändert hat + wer da ist (mit Zeiger)."""
    r = c.execute("SELECT seq, teilnehmer, owner, owner_name, name FROM skizze WHERE id=?", (sid,)).fetchone()
    rows = c.execute("SELECT id, uid, name, data, geloescht FROM skizze_strich WHERE skizze_id=? AND seq>? ORDER BY id", (sid, seit)).fetchall()
    neu, weg = [], []
    for x in rows:
        if x["geloescht"]:
            weg.append(x["id"])
        else:
            try:
                d = json.loads(x["data"])
            except ValueError:
                continue
            neu.append({"id": x["id"], "uid": x["uid"], "name": x["name"], **d})
    jetzt = int(time.time() * 1000)
    leute = [{"uid": x["uid"], "name": x["name"], "farbe": x["farbe"], "seite": x["seite"], "x": x["x"], "y": x["y"], "aktiv": jetzt - x["zeit"] < 4000}
             for x in c.execute("SELECT uid, name, farbe, seite, x, y, t AS zeit FROM skizze_cursor WHERE skizze_id=? AND t>?", (sid, jetzt - 60000))]
    return {"seq": r["seq"], "striche": neu, "geloescht": weg, "leute": leute, "owner": r["owner"], "owner_name": r["owner_name"], "name": r["name"],
            "farbe": farbe_von(r, u["id"])}


def zeiger(c, sid, u, d):
    r = c.execute("SELECT teilnehmer FROM skizze WHERE id=?", (sid,)).fetchone()
    try:
        seite, x, y = int(d.get("seite") or 0), d.get("x"), d.get("y")
        x = None if x is None else round(float(x), 4)
        y = None if y is None else round(float(y), 4)
    except (TypeError, ValueError):
        seite, x, y = 0, None, None
    c.execute("INSERT INTO skizze_cursor(skizze_id, uid, name, farbe, seite, x, y, t) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT (skizze_id, uid) DO UPDATE SET "
              "name=EXCLUDED.name, farbe=EXCLUDED.farbe, seite=EXCLUDED.seite, x=EXCLUDED.x, y=EXCLUDED.y, t=EXCLUDED.t",
              (sid, u["id"], name_von(u), farbe_von(r, u["id"]), seite, x, y, int(time.time() * 1000)))


def einladen(c, sid, u, an):
    r = c.execute("SELECT teilnehmer FROM skizze WHERE id=?", (sid,)).fetchone()
    t = _teil(r)
    for uid in an:
        if uid not in t:
            t.append(uid)
        c.execute("UPDATE skizze_einladung SET erledigt=1 WHERE skizze_id=? AND an=?", (sid, uid))
        c.execute("INSERT INTO skizze_einladung(skizze_id, an, von, created) VALUES(?,?,?,?)", (sid, uid, name_von(u), _now()))
    c.execute("UPDATE skizze SET teilnehmer=? WHERE id=?", (json.dumps(t), sid))


def einladungen(c, u):
    """Offene Einladungen der letzten 12 Stunden."""
    from datetime import timedelta
    grenze = (datetime.now() - timedelta(hours=12)).isoformat(timespec="seconds")
    return [{"id": x["id"], "skizze": x["skizze_id"], "von": x["von"], "name": x["name"]} for x in c.execute(
        "SELECT e.id, e.skizze_id, e.von, s.name FROM skizze_einladung e JOIN skizze s ON s.id=e.skizze_id "
        "WHERE e.an=? AND e.erledigt=0 AND e.created>? ORDER BY e.id DESC LIMIT 5", (u["id"], grenze))]


def pdf_mit_markierungen(c, sid):
    """Plan mit allen Strichen als PDF (zum Speichern oder Weiterschicken)."""
    import io
    from pypdf import PdfReader, PdfWriter
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas
    r = c.execute("SELECT name, datei FROM skizze WHERE id=?", (sid,)).fetchone()
    rd = PdfReader(io.BytesIO(bytes(r["datei"])))
    striche = {}
    for x in c.execute("SELECT data FROM skizze_strich WHERE skizze_id=? AND geloescht=0 ORDER BY id", (sid,)):
        d = json.loads(x["data"])
        striche.setdefault(d["seite"], []).append(d)
    wr = PdfWriter()
    for n, pg in enumerate(rd.pages, 1):
        if striche.get(n):
            box = pg.cropbox
            w, h = float(box.width), float(box.height)
            x0, y0 = float(box.left), float(box.bottom)
            rot = (pg.get("/Rotate") or 0) % 360
            vw, vh = (h, w) if rot in (90, 270) else (w, h)   # angezeigte Größe (wie pdf.js)
            buf = io.BytesIO()
            cv = canvas.Canvas(buf, pagesize=(w + x0, h + y0))

            def P(px, py):   # 0…1 der angezeigten Seite → PDF-Koordinaten (Drehung beachten)
                X, Y = px * vw, py * vh
                if rot == 90:
                    return x0 + Y, y0 + X
                if rot == 180:
                    return x0 + w - X, y0 + Y
                if rot == 270:
                    return x0 + w - Y, y0 + h - X
                return x0 + X, y0 + h - Y
            for d in striche[n]:
                col = HexColor(d["farbe"])
                if d["art"] == "text":
                    x, y = P(*d["pts"][0])
                    cv.setFillColor(col)
                    cv.setFont("Helvetica-Bold", max(8, d["breite"] * vw * 4))
                    cv.drawString(x, y, d.get("text", ""))
                    continue
                cv.setStrokeColor(col)
                cv.setLineWidth(max(0.4, d["breite"] * vw * (3 if d["art"] == "marker" else 1)))
                cv.setLineCap(1); cv.setLineJoin(1)
                if d["art"] == "marker":
                    cv.setStrokeAlpha(0.35)
                pts = [P(*p) for p in d["pts"]]
                if d["art"] == "rechteck" and len(pts) >= 2:
                    (ax, ay), (bx, by) = pts[0], pts[-1]
                    cv.rect(min(ax, bx), min(ay, by), abs(bx - ax), abs(by - ay))
                else:
                    pth = cv.beginPath(); pth.moveTo(*pts[0])
                    for p in pts[1:]:
                        pth.lineTo(*p)
                    cv.drawPath(pth, stroke=1, fill=0)
                    if d["art"] == "pfeil" and len(pts) >= 2:
                        import math
                        (ax, ay), (bx, by) = pts[-2], pts[-1]
                        a = math.atan2(by - ay, bx - ax); L = max(6, d["breite"] * vw * 5)
                        for da in (2.6, -2.6):
                            cv.line(bx, by, bx + L * math.cos(a + da), by + L * math.sin(a + da))
                cv.setStrokeAlpha(1)
            cv.save()
            pg.merge_page(PdfReader(io.BytesIO(buf.getvalue())).pages[0])
        wr.add_page(pg)
    out = io.BytesIO()
    wr.write(out)
    return r["name"], out.getvalue()
