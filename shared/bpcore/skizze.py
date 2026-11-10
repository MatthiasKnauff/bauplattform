"""Gemeinsam auf einem Plan skizzieren (Ansicht für PDFs in allen Apps, siehe head.js → H.ansehen).

Einer öffnet einen Plan und startet „Markieren“: Der Plan (PDF) wird in die Sitzung kopiert (Tabelle skizze), damit auch
Kollegen in einer anderen App ihn sehen. Eingeladen wird über die Benutzerliste (Hinweis erscheint in jeder App) oder per Link
(#skizze=<id>). Striche liegen in skizze_strich; jede Änderung erhöht skizze.seq, die Teilnehmer holen alle ~0,7 s nur das Neue
(seq > zuletzt gesehen). Wo die anderen gerade zeigen, steht in skizze_cursor (Laserpointer, nur die letzten Sekunden).
Koordinaten sind relativ zur Seite (0…1) – unabhängig von Zoom und Bildschirm.
"""
import hashlib, json, re, secrets, time
from datetime import datetime

FARBEN = ["#e5484d", "#2f7fe0", "#1f9d55", "#e08a00", "#8e4ec6", "#0e9aa7"]
ARTEN = ("stift", "marker", "text", "pfeil", "rechteck", "haken", "kreuz")
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
    r = c.execute("SELECT id, name, owner, owner_name, seq, teilnehmer, created, dauerhaft FROM skizze WHERE id=?", (sid,)).fetchone()
    if not r:
        return None
    return r if (r["dauerhaft"] or r["owner"] == u["id"] or u["id"] in _teil(r) or u["is_admin"]) else None


def neu(c, u, name, pdf):
    if not pdf or not pdf[:5] == b"%PDF-":
        raise ValueError("Bitte einen Plan als PDF öffnen.")
    if len(pdf) > MAX_PDF:
        raise ValueError("Der Plan ist zu groß (höchstens 60 MB).")
    sid = secrets.token_urlsafe(9)
    c.execute("INSERT INTO skizze(id, name, owner, owner_name, datei, seq, teilnehmer, created, updated, hash, groesse) VALUES(?,?,?,?,?,0,?,?,?,?,?)",
              (sid, (name or "Plan.pdf")[:200], u["id"], name_von(u), pdf, json.dumps([u["id"]]), _now(), _now(), hashlib.sha256(pdf).hexdigest(), len(pdf)))
    return sid


def dauerhaft_fuer(c, h="", name="", groesse=0):
    """Dauerhafte Skizze zu einem Plan – über den Inhalt (SHA-256), sonst über Name + Größe."""
    r = None
    if h:
        r = c.execute("SELECT id FROM skizze WHERE dauerhaft=1 AND hash=? ORDER BY updated DESC LIMIT 1", (h,)).fetchone()
    if not r and name and groesse:
        r = c.execute("SELECT id FROM skizze WHERE dauerhaft=1 AND name=? AND groesse=? ORDER BY updated DESC LIMIT 1", (name[:200], int(groesse))).fetchone()
    return r["id"] if r else None


def dauerhaft_setzen(c, sid, an):
    c.execute("UPDATE skizze SET dauerhaft=?, updated=? WHERE id=?", (1 if an else 0, _now(), sid))
    _seq(c, sid)


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
    if uid < 0:   # Gast
        return FARBEN[(-uid) % len(FARBEN)]
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
        if ids and not (r and r["owner"] == u["id"]):   # einzelne Striche: nur eigene (der Besitzer darf alle)
            ids = [x["id"] for x in c.execute("SELECT id FROM skizze_strich WHERE id=? AND skizze_id=? AND uid=?", (ids[0], sid, u["id"]))]
    if not ids:
        return 0
    seq = _seq(c, sid)
    for i in ids:
        c.execute("UPDATE skizze_strich SET geloescht=1, seq=? WHERE id=? AND skizze_id=?", (seq, i, sid))
    return len(ids)


def stand(c, sid, u, seit=0):
    """Was sich seit `seit` geändert hat + wer da ist (mit Zeiger)."""
    r = c.execute("SELECT seq, teilnehmer, owner, owner_name, name, dauerhaft FROM skizze WHERE id=?", (sid,)).fetchone()
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
            "dauerhaft": bool(r["dauerhaft"]), "farbe": farbe_von(r, u["id"])}


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


def striche_von(c, sid):
    """Alle (nicht gelöschten) Striche einer Skizze als Liste."""
    return [json.loads(x["data"]) for x in c.execute("SELECT data FROM skizze_strich WHERE skizze_id=? AND geloescht=0 ORDER BY id", (sid,))]


def pdf_mit_markierungen(c, sid):
    """Plan mit allen Strichen als PDF (zum Speichern oder Weiterschicken)."""
    r = c.execute("SELECT name, datei FROM skizze WHERE id=?", (sid,)).fetchone()
    return r["name"], pdf_zeichnen(bytes(r["datei"]), striche_von(c, sid))


def pdf_zeichnen(datei, liste):
    """Striche und Prüfzeichen in eine PDF zeichnen. liste: [{seite, art, farbe, breite, pts, text?}] – Lage 0…1 der angezeigten Seite.
    Auch ohne Skizzen-Sitzung nutzbar (z. B. Haken aus der Rechnungsprüfung der AVA)."""
    import io
    from pypdf import PdfReader, PdfWriter
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas
    rd = PdfReader(io.BytesIO(datei))
    striche = {}
    for d in liste:
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
                if d["art"] in ("haken", "kreuz"):   # Prüfzeichen: grüner Haken / rotes Kreuz
                    x, y = P(*d["pts"][0])
                    g_ = max(6, d["breite"] * vw * 4)
                    cv.setStrokeColor(col); cv.setLineWidth(max(1.1, g_ / (9 if d["art"] == "haken" else 6))); cv.setLineCap(1); cv.setLineJoin(1)
                    pth = cv.beginPath()
                    if d["art"] == "haken":
                        # wie mit dem Stift gezogen: kurzer Abstrich, langer geschwungener Aufstrich, je nach Lage etwas anders geneigt
                        import math
                        a_ = math.radians(((d["pts"][0][0] * 131 + d["pts"][0][1] * 977) * 9301 + 49297) % 233280 / 233280 * 16 - 8)
                        Q = lambda u, v: (x + g_ * (u * math.cos(a_) - v * math.sin(a_)), y + g_ * (u * math.sin(a_) + v * math.cos(a_)))
                        pth.moveTo(*Q(-.42, 0)); pth.curveTo(*Q(-.32, -.08), *Q(-.22, -.2), *Q(-.15, -.36)); pth.curveTo(*Q(0, 0), *Q(.3, .42), *Q(.66, .63))
                    else:
                        pth.moveTo(x - g_ * .45, y + g_ * .45); pth.lineTo(x + g_ * .45, y - g_ * .45); pth.moveTo(x - g_ * .45, y - g_ * .45); pth.lineTo(x + g_ * .45, y + g_ * .45)
                    cv.drawPath(pth, stroke=1, fill=0)
                    continue
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
    return out.getvalue()


# ---------------------------------------------------------------- Externe Gäste ohne Anmeldung
# Sicherheit: Der Gast-Link enthält ein zufälliges Geheimnis (256 Bit); gespeichert wird nur dessen SHA-256 (bp_store
# „skgast:<hash>“). Ein Link gilt für GENAU eine Skizze, läuft ab (höchstens 30 Tage) und lässt sich jederzeit widerrufen.
# Gäste sehen nur diesen einen Plan und dürfen zeichnen, zeigen und ihre EIGENEN Striche löschen – sonst nichts
# (kein Einladen, kein „dauerhaft“, kein Export, keine anderen Daten). Begrenzt sind Größe, Zahl und Takt der Anfragen.
GAST_TAGE = (1, 7, 30)
GAST_MAX_STRICHE = 3000          # je Link insgesamt
_TAKT = {}                       # (Linkhash, Gast) → [Zeitpunkte] – grobe Bremse je Prozess


def _gh(token):
    return hashlib.sha256(str(token or "").encode()).hexdigest()


def gast_link(c, sid, u, tage):
    from datetime import timedelta
    tage = tage if tage in GAST_TAGE else 7
    token = secrets.token_urlsafe(32)
    ab = (datetime.now() + timedelta(days=tage)).isoformat(timespec="seconds")
    d = {"sid": sid, "ablauf": ab, "von": u["id"], "von_name": name_von(u), "created": _now(), "widerrufen": False}
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?)", ("skgast:" + _gh(token), json.dumps(d), _now(), u["name"]))
    return token, ab


def gast_links(c, sid):
    out = []
    for r in c.execute("SELECT key, data FROM bp_store WHERE key LIKE 'skgast:%'").fetchall():
        try:
            d = json.loads(r["data"])
        except ValueError:
            continue
        if d.get("sid") == sid and not d.get("widerrufen") and d.get("ablauf", "") > _now():
            out.append({"id": r["key"][7:19], "ablauf": d["ablauf"], "von": d.get("von_name", ""), "created": d.get("created", "")})
    return out


def gast_widerrufen(c, sid, kurz=None):
    """kurz = die ersten 12 Zeichen des Hashs (aus gast_links); ohne: alle Links dieser Skizze."""
    n = 0
    for r in c.execute("SELECT key, data FROM bp_store WHERE key LIKE 'skgast:%'").fetchall():
        try:
            d = json.loads(r["data"])
        except ValueError:
            continue
        if d.get("sid") == sid and not d.get("widerrufen") and (not kurz or r["key"][7:19] == kurz):
            d["widerrufen"] = True
            c.execute("UPDATE bp_store SET data=?, updated=? WHERE key=?", (json.dumps(d), _now(), r["key"]))
            n += 1
    return n


def gast_widerrufen_token(c, token):
    k = "skgast:" + _gh(token)
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (k,)).fetchone()
    if r:
        d = json.loads(r["data"])
        d["widerrufen"] = True
        c.execute("UPDATE bp_store SET data=?, updated=? WHERE key=?", (json.dumps(d), _now(), k))


def gast_pruefen(c, token):
    """(Skizze-ID, Linkhash) für einen gültigen Gast-Link, sonst (None, None)."""
    if not token or len(token) < 30 or len(token) > 80 or not re.fullmatch(r"[\w-]+", token):
        return None, None
    h = _gh(token)
    r = c.execute("SELECT data FROM bp_store WHERE key=?", ("skgast:" + h,)).fetchone()
    if not r:
        return None, None
    try:
        d = json.loads(r["data"])
    except ValueError:
        return None, None
    if d.get("widerrufen") or d.get("ablauf", "") <= _now():
        return None, None
    if not c.execute("SELECT 1 FROM skizze WHERE id=?", (d.get("sid"),)).fetchone():
        return None, None
    return d["sid"], h


def gast_user(h, gid, name):
    """Pseudo-Benutzer des Gasts: negative ID aus Link und Browser-Kennung (nur der eigene Browser kennt sie)."""
    if not gid or not re.fullmatch(r"[\w-]{16,64}", gid):
        raise ValueError("Ungültige Gast-Kennung")
    n = int(hashlib.sha256((h + ":" + gid).encode()).hexdigest()[:12], 16) % 2_000_000_000
    name = re.sub(r"[\x00-\x1f<>]", "", str(name or "")).strip()[:40] or "Gast"
    return {"id": -(n + 1), "name": name + " (extern)", "is_admin": 0}


def gast_takt(h, uid, max_n=40, sek=10):
    """True, wenn der Gast zu viele Anfragen schickt (mehr als max_n in sek Sekunden)."""
    k, jetzt = (h, uid), time.time()
    L = [t for t in _TAKT.get(k, []) if jetzt - t < sek]
    L.append(jetzt)
    _TAKT[k] = L
    if len(_TAKT) > 5000:
        for x in list(_TAKT)[:1000]:
            _TAKT.pop(x, None)
    return len(L) > max_n


def gast_striche_voll(c, sid, h):
    n = c.execute("SELECT COUNT(*) AS n FROM skizze_strich WHERE skizze_id=? AND uid<0", (sid,)).fetchone()["n"]
    return n >= GAST_MAX_STRICHE


def gast_loeschen(c, sid, u, was):
    """Gäste löschen nur ihre eigenen Striche (letzter oder alle eigenen)."""
    if was not in ("letzter", "alle"):
        raise ValueError("Nicht erlaubt")
    c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", ("skizze:" + sid,))
    q = "SELECT id FROM skizze_strich WHERE skizze_id=? AND uid=? AND geloescht=0 ORDER BY id DESC" + (" LIMIT 1" if was == "letzter" else "")
    ids = [x["id"] for x in c.execute(q, (sid, u["id"]))]
    if not ids:
        return 0
    seq = _seq(c, sid)
    for i in ids:
        c.execute("UPDATE skizze_strich SET geloescht=1, seq=? WHERE id=? AND skizze_id=? AND uid=?", (seq, i, sid, u["id"]))
    return len(ids)
