"""Mängel & Erinnerungen – Mängelverfolgung aus den Bautagesberichten und zentrale Erinnerungen.

Mängel (und „Zu erledigen“, Weisungen) kommen aus den Einträgen des Bautagebuchs (Tabelle items). Erledigt-Haken, Frist und
Firma werden über das Bautagebuch gespeichert (gleiche Rechte, gleiche Erinnerungs-Mail des Bautagebuchs am Fälligkeitstag).

Erinnerungen:
  - aus dem Bautagebuch: Einträge mit Erledigungsdatum (verschickt das Bautagebuch selbst)
  - aus den Bauzeitenplänen: „Firma X kommt (wieder) zur Baustelle“ – Vorlauf einstellbar, Standard 7 Tage (Tabelle erinnerungen)
  - eigene: von Hand angelegt (Tabelle erinnerungen)
Diese App gleicht die Pläne regelmäßig ab und verschickt die Erinnerungen per E-Mail.

/api/maengel                 Liste (scope=mine|all), PUT /api/maengel/<id> {done, due, due_time, company}
/api/maengel.pdf             Mängelliste zum Weitergeben (gefiltert)
/api/erinnerungen            alle Erinnerungen (scope), POST eigene; PUT /api/erinnerungen/<id> {termin, uhrzeit, status}
/api/einstellungen           Vorlauf, Lücke, E-Mail an/aus
/api/bild/<size>/<file>      Foto-Vorschau aus dem Bautagebuch
"""
import io, json, re, threading, time, urllib.error, urllib.parse, urllib.request
from datetime import date, datetime, timedelta

from flask import Response, g, jsonify, redirect, request

from bpcore import db, mail, platform, sso
import common as C

app = C.make_app(__name__)
KINDS = {"maengel": "Mangel", "zu_erledigen": "Zu erledigen", "weisungen": "Weisung"}
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
DEF = {"vorlauf": 7, "luecke": 10, "mail_plan": True, "uhrzeit": "08:00"}


@app.before_request
def guard():
    p = request.path
    if p.startswith(("/static/", "/bp/")) or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base("aufgaben") + "/")), 401
        return redirect(C.login_url(request.url))
    if not sso.has_app(u, "aufgaben"):
        msg = "Für „Mängel & Erinnerungen“ ist dein Konto nicht freigeschaltet."
        if p.startswith("/api/"):
            return jsonify(error=msg), 403
        return (f'{msg} <a href="{C.app_base("portal")}/">Zur Startseite</a>', 403, {"Content-Type": "text/html; charset=utf-8"})
    g.user = u


@app.get("/")
def index():
    return C.page("aufgaben.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


# ---------------------------------------------------------------- Hilfen
def _now():
    return datetime.now().isoformat(timespec="seconds")


def _j(v, d):
    try:
        x = json.loads(v) if isinstance(v, str) else v
        return x if x is not None else d
    except (TypeError, ValueError):
        return d


def _ids(v):
    try:
        return [int(x) for x in _j(v, [])]
    except (TypeError, ValueError):
        return []


def conf(c):
    r = c.execute("SELECT data FROM bp_store WHERE key='aufgaben'").fetchone()
    d = _j(r["data"], {}) if r else {}
    out = dict(DEF)
    if isinstance(d, dict):
        out["vorlauf"] = int(min(60, max(0, d.get("vorlauf", 7) or 0)))
        out["luecke"] = int(min(90, max(1, d.get("luecke", 10) or 10)))
        out["mail_plan"] = bool(d.get("mail_plan", True))
        out["uhrzeit"] = d.get("uhrzeit") if TIME.match(str(d.get("uhrzeit") or "")) else "08:00"
    return out


def _projects(c):
    """Bautagebuch-Projekte: id → {name, leaders, archived}."""
    return {r["id"]: {"name": r["name"], "leaders": _ids(r["leaders"]), "archived": bool(r["archived"])}
            for r in c.execute("SELECT id, name, leaders, archived FROM projects")}


def _sees(u, p):
    """Darf der Benutzer das Projekt sehen? (wie im Bautagebuch: Administrator, keine Zuständigen eingetragen oder selbst zuständig)"""
    return bool(u["is_admin"]) or not p["leaders"] or u["id"] in p["leaders"]


def _mine(u, p):
    return u["id"] in p["leaders"]


def _scope():
    return "all" if request.args.get("scope") == "all" else "mine"


# ---------------------------------------------------------------- Mängel
@app.get("/api/maengel")
def maengel(scope=None):
    scope = scope or _scope()
    with db.tx() as c:
        P = _projects(c)
        rows = c.execute(f"""SELECT i.id, i.kind, i.text, i.done, i.due, i.due_time, i.company, i.created, i.updated, i.contact_id,
                   r.id AS rid, r.date AS rdate, r.project_id AS pid, ct.name AS contact,
                   (SELECT COUNT(*) FROM images m WHERE m.item_id=i.id) AS nimg,
                   (SELECT m.file FROM images m WHERE m.item_id=i.id ORDER BY m.id LIMIT 1) AS img
            FROM items i JOIN reports r ON r.id=i.report_id LEFT JOIN contacts ct ON ct.id=i.contact_id
            WHERE i.kind IN ({','.join('?' * len(KINDS))}) ORDER BY r.date DESC, i.id""", tuple(KINDS)).fetchall()
    today = date.today().isoformat()
    out = []
    for x in rows:
        p = P.get(x["pid"])
        if not p or not _sees(g.user, p) or (scope == "mine" and not _mine(g.user, p)):
            continue
        st = "erledigt" if x["done"] else "ueberfaellig" if x["due"] and x["due"] < today else "offen"
        out.append({"id": x["id"], "art": x["kind"], "art_n": KINDS[x["kind"]], "text": x["text"] or "", "done": bool(x["done"]), "status": st,
                    "frist": x["due"] or "", "uhrzeit": x["due_time"] or "09:00", "firma": x["company"] or x["contact"] or "",
                    "datum": x["rdate"] or "", "rid": x["rid"], "pid": x["pid"], "projekt": p["name"], "archiviert": p["archived"],
                    "fotos": x["nimg"], "bild": x["img"] or "", "geaendert": x["updated"] or x["created"] or ""})
    return jsonify(out)


@app.put("/api/maengel/<int:i>")
def mangel_edit(i):
    b = request.get_json(silent=True) or {}
    body = {}
    if "done" in b:
        body["done"] = 1 if b["done"] else 0
    if "frist" in b:
        f = str(b["frist"] or "").strip()
        if f and not DATE.match(f):
            return jsonify(error="Das Datum ist ungültig."), 400
        body["due"] = f
    if "uhrzeit" in b and TIME.match(str(b["uhrzeit"] or "")):
        body["due_time"] = b["uhrzeit"]
    if "firma" in b:
        body["company"] = str(b["firma"] or "").strip()[:200]
    if not body:
        return jsonify(ok=True)
    with db.tx() as c:   # Zugriff prüfen wie im Bautagebuch
        r = c.execute("SELECT p.leaders, p.name FROM items i JOIN reports r ON r.id=i.report_id JOIN projects p ON p.id=r.project_id WHERE i.id=?", (i,)).fetchone()
    if not r or not _sees(g.user, {"leaders": _ids(r["leaders"])}):
        return jsonify(error="Nicht gefunden"), 404
    try:
        C.bt_api("PUT", f"/api/items/{i}", body)   # das Bautagebuch speichert (Erinnerung, Protokoll, Rechte)
    except RuntimeError as e:
        return jsonify(error=str(e)), 502
    C.audit(g.user["name"], "inhalt", "Mangel bearbeitet (Mängelliste)", f"{r['name']}: " + ", ".join(f"{k}={v}" for k, v in body.items()))
    return jsonify(ok=True)


@app.get("/api/bild/<int:size>/<path:f>")
def bild(size, f):
    """Foto-Vorschau aus dem Bautagebuch (mit der Anmeldung des Benutzers)."""
    with db.tx() as c:
        tok = sso.current_token(request, c)
    path = f"/api/thumb/{240 if size not in (96, 240) else size}/{urllib.parse.quote(f)}" if size else "/uploads/" + urllib.parse.quote(f)
    req = urllib.request.Request(C.BT_INTERNAL + path, headers={"Cookie": f"{sso.COOKIE}={tok}"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return Response(r.read(), mimetype=r.headers.get("Content-Type", "image/jpeg"), headers={"Cache-Control": "private, max-age=3600"})
    except Exception:
        return "", 404


@app.get("/api/maengel.pdf")
def maengel_pdf():
    """Mängelliste als PDF – z. B. je Firma zum Weitergeben. Gleiche Filter wie in der App (ids=…)."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Spacer, TableStyle
    from xml.sax.saxutils import escape as X
    want = {int(x) for x in (request.args.get("ids") or "").split(",") if x.isdigit()}
    data = [m for m in maengel_all() if not want or m["id"] in want]
    title = (request.args.get("titel") or "Mängelliste").strip()[:120]
    buf = io.BytesIO()
    with db.tx() as c:
        office = (c.execute("SELECT value FROM settings WHERE key='office_name'").fetchone() or {"value": ""})["value"]
    st = ParagraphStyle("c", fontName="Helvetica", fontSize=8.5, leading=11)
    sb = ParagraphStyle("b", parent=st, fontName="Helvetica-Bold")
    sh = ParagraphStyle("h", parent=st, fontName="Helvetica-Bold", textColor=colors.white)
    de = lambda d: f"{d[8:10]}.{d[5:7]}.{d[:4]}" if d and len(d) >= 10 else ""
    story = [Paragraph(X(title), ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=15, leading=19)),
             Paragraph(f"{X(office) + ' · ' if office else ''}Stand {datetime.now():%d.%m.%Y} · {len(data)} Einträge · {sum(1 for m in data if not m['done'])} offen",
                       ParagraphStyle("s", parent=st, textColor=colors.HexColor("#6b6f76"))), Spacer(1, 5 * mm)]
    by = {}
    for m in data:
        by.setdefault(m["projekt"], []).append(m)
    W = A4[0] - 30 * mm
    for proj, ms in by.items():
        rows = [[Paragraph(h, sh) for h in ("Nr.", "Mangel / Aufgabe", "Firma", "festgestellt", "Frist", "Status")]]
        for n, m in enumerate(ms, 1):
            stt = {"erledigt": "erledigt", "ueberfaellig": "überfällig", "offen": "offen"}[m["status"]]
            rows.append([Paragraph(str(n), st), Paragraph(X(m["text"]).replace("\n", "<br/>") + (f"<br/><font color='#6b6f76' size='7'>{X(m['art_n'])}{' · ' + str(m['fotos']) + ' Foto(s)' if m['fotos'] else ''}</font>"), st),
                         Paragraph(X(m["firma"]), st), Paragraph(de(m["datum"]), st), Paragraph(de(m["frist"]), sb if m["status"] == "ueberfaellig" else st), Paragraph(stt, st)])
        t = LongTable(rows, colWidths=[W * .06, W * .44, W * .18, W * .11, W * .11, W * .10], repeatRows=1)
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3a3a38")), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
                               ("LINEBELOW", (0, 0), (-1, -1), .25, colors.HexColor("#d9dbe0")), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
        story += [Paragraph(X(proj), ParagraphStyle("p", fontName="Helvetica-Bold", fontSize=11, leading=14, spaceBefore=4, spaceAfter=3)), t, Spacer(1, 6 * mm)]

    def frame(cv, d):
        cv.saveState()
        C.draw_logo(cv, A4[0] - 15 * mm, A4[1] - 6 * mm, 11 * mm, 45 * mm)
        cv.setFont("Helvetica", 7.5); cv.setFillColor(colors.HexColor("#6b6f76"))
        cv.drawString(15 * mm, 9 * mm, title); cv.drawRightString(A4[0] - 15 * mm, 9 * mm, f"Seite {d.page}")
        cv.restoreState()
    SimpleDocTemplate(buf, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=22 * mm, bottomMargin=16 * mm, title=title, author=office or "Bauplattform").build(story, onFirstPage=frame, onLaterPages=frame)
    C.audit(g.user["name"], "export", "Mängelliste als PDF", f"{len(data)} Einträge")
    fn = urllib.parse.quote(re.sub(r"[\\/:*?\"<>|]+", "_", title) + f" {date.today():%Y-%m-%d}.pdf")
    return Response(buf.getvalue(), mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{fn}"})


def maengel_all():
    return maengel("all").get_json()   # Auswahl kommt als ids; sichtbar ist trotzdem nur, was der Benutzer sehen darf


# ---------------------------------------------------------------- Bauzeitenpläne → „Firma kommt zur Baustelle“
def _firm_names(c):
    out = {}
    for r in c.execute("SELECT id, name, extra FROM contacts"):
        gid = (_j(r["extra"], {}) or {}).get("gid")
        out[gid or f"c{r['id']}"] = r["name"]
    return out


def einsaetze(data, firms, luecke):
    """Einsätze je Firma aus einem Plan: zusammenhängende Arbeiten (Lücke ≤ luecke Tage) → [{firma, start, ende, leistungen}]."""
    tasks = {t.get("uid"): t for t in (data.get("tasks") or []) if isinstance(t, dict)}
    trades = data.get("trades") or {}
    by = {}
    for s in data.get("sched") or []:
        t = tasks.get(s.get("uid"))
        if not t or s.get("g") or not t.get("dur") or not s.get("s"):
            continue
        gw = (t.get("gw") or "").strip()
        tr = trades.get(gw) or {}
        firm = firms.get(tr.get("firm") or "") or ""
        res = (t.get("res") or "").strip()
        if not firm and res and res != (tr.get("craft") or "").strip():
            firm = res
        if not firm and not gw:
            continue
        key = firm or "gw:" + gw
        by.setdefault(key, {"firma": firm, "gw": gw, "list": []})["list"].append((s["s"], s["f"], t.get("name") or ""))
    out = []
    for key, v in by.items():
        cur = None
        for s, f, n in sorted(v["list"]):
            if cur and s <= (date.fromisoformat(cur["ende"]) + timedelta(days=luecke)).isoformat():
                cur["ende"] = max(cur["ende"], f); cur["leistungen"].append(n)
            else:
                cur = {"key": key, "firma": v["firma"], "gw": v["gw"], "start": s, "ende": f, "leistungen": [n]}
                out.append(cur)
    for e in out:
        e["nr"] = sum(1 for x in out if x["key"] == e["key"] and x["start"] < e["start"]) + 1
    return out


def _wd(d):
    return ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][date.fromisoformat(d).weekday()] + " " + f"{d[8:10]}.{d[5:7]}.{d[:4]}"


def sync_plans(c):
    """Erinnerungen aus allen Bauzeitenplänen anlegen/nachführen. Vergangene Einsätze werden nicht angelegt; entfallene markiert."""
    cf = conf(c)
    firms = _firm_names(c)
    users = {r["name"].lower(): r["id"] for r in c.execute("SELECT id, name FROM users WHERE active=1")}
    admins = [r["id"] for r in c.execute("SELECT id FROM users WHERE is_admin=1 AND active=1")]
    P = _projects(c)
    today = date.today().isoformat()
    seen = set()
    for g_ in c.execute("SELECT id, name, project_id, data, updated_by FROM gantt_projects").fetchall():
        data = _j(g_["data"], {})
        if not isinstance(data, dict) or not data.get("sched"):
            continue
        p = P.get(g_["project_id"]) if g_["project_id"] else None
        if p and p["archived"]:
            continue
        rec = (p["leaders"] if p and p["leaders"] else []) or ([users[g_["updated_by"].lower()]] if (g_["updated_by"] or "").lower() in users else []) or admins
        for e in einsaetze(data, firms, cf["luecke"]):
            if e["start"] < today:
                continue
            key = f"plan:{g_['id']}:{e['key']}:{e['nr']}"
            seen.add(key)
            wer = e["firma"] or f"Gewerk {e['gw']} (Firma noch offen)"
            titel = f"{wer} kommt {'zum ersten Mal' if e['nr'] == 1 else 'wieder'} auf die Baustelle – {_wd(e['start'])}"
            text = (f"{g_['name']}: {', '.join(dict.fromkeys(e['leistungen']))[:600]}\nZeitraum {_wd(e['start'])} bis {_wd(e['ende'])}."
                    + ("" if e["firma"] else "\nFür dieses Gewerk ist im Bauzeitenplan noch keine Firma eingetragen."))
            termin = (date.fromisoformat(e["start"]) - timedelta(days=cf["vorlauf"])).isoformat()
            old = c.execute("SELECT * FROM erinnerungen WHERE schluessel=?", (key,)).fetchone()
            daten = json.dumps({"firma": e["firma"], "gw": e["gw"], "start": e["start"], "ende": e["ende"], "nr": e["nr"], "plan": g_["name"]}, ensure_ascii=False)
            if not old:
                c.execute("""INSERT INTO erinnerungen(quelle, schluessel, project_id, gantt_id, titel, text, termin, uhrzeit, ereignis, empfaenger, daten, erstellt, erstellt_von)
                             VALUES('plan',?,?,?,?,?,?,?,?,?,?,?,?)""",
                          (key, g_["project_id"], g_["id"], titel, text, max(termin, today), cf["uhrzeit"], e["start"], json.dumps(rec), daten, _now(), "Bauzeitenplan"))
            else:
                upd = {"titel": titel, "text": text, "ereignis": e["start"], "daten": daten, "empfaenger": json.dumps(rec)}
                if old["status"] == "entfallen":
                    upd["status"] = "offen"
                if not old["manuell"] and old["status"] != "erledigt" and old["termin"] != termin and old["ereignis"] != e["start"]:
                    upd["termin"] = max(termin, today); upd["gesendet"] = ""   # Termin im Plan verschoben → neu erinnern
                if any(str(old[k]) != str(v) for k, v in upd.items()):
                    c.execute(f"UPDATE erinnerungen SET {', '.join(k + '=?' for k in upd)}, geaendert=? WHERE id=?", (*upd.values(), _now(), old["id"]))
    for r in c.execute("SELECT id, schluessel, ereignis FROM erinnerungen WHERE quelle='plan' AND status='offen'").fetchall():
        if r["schluessel"] not in seen and (r["ereignis"] or "") >= today:
            c.execute("UPDATE erinnerungen SET status='entfallen', geaendert=? WHERE id=?", (_now(), r["id"]))   # im Plan nicht mehr vorhanden


def send_due(now=None):
    """Fällige Erinnerungen (Plan und eigene) per E-Mail verschicken. Gibt die Zahl der Mails zurück."""
    now = now or datetime.now()
    today, hhmm = now.date().isoformat(), now.strftime("%H:%M")
    with db.tx() as c:
        cf, mc = conf(c), mail.conf(c)
        if not mail.configured(mc):
            return 0
        rows = [r for r in c.execute("SELECT * FROM erinnerungen WHERE status='offen' AND gesendet='' AND termin!='' AND termin<=?", (today,)).fetchall()
                if (r["termin"] < today or (r["uhrzeit"] or "08:00") <= hhmm) and (r["quelle"] != "plan" or cf["mail_plan"])]
        users = {r["id"]: r for r in c.execute("SELECT id, name, vorname, email FROM users WHERE active=1")}
    link = (mc.get("app_url") or "").rstrip("/")
    link = re.sub(r"/bautagebuch$", "", link) + "/maengel/" if link else ""
    by = {}
    for r in rows:
        for uid in _ids(r["empfaenger"]):
            by.setdefault(uid, []).append(r)
    sent = 0
    for uid, rs in by.items():
        u = users.get(uid)
        if not u or not u["email"]:
            continue
        with db.tx() as c:   # „reservieren“, damit zwei Prozesse nicht doppelt senden
            mine = [r for r in rs if c.execute("UPDATE erinnerungen SET gesendet=? WHERE id=? AND (gesendet='' OR gesendet=?)", (today, r["id"], today)).rowcount == 1]
        if not mine:
            continue
        lines = [f"• {r['titel']}\n  {r['text'].replace(chr(10), chr(10) + '  ')}" for r in mine]
        body = (f"Hallo {u['vorname'] or u['name']},\n\nErinnerung aus der Bauplattform:\n\n" + "\n\n".join(lines)
                + ("\n\nAlle Erinnerungen und zum Neu-Terminieren: " + link if link else "") + "\n")
        try:
            mail.send(mc, u["email"], f"Erinnerung: {mine[0]['titel']}" if len(mine) == 1 else f"Bauplattform – {len(mine)} Erinnerungen", body)
            sent += 1
        except mail.MailError:
            with db.tx() as c:
                c.executemany("UPDATE erinnerungen SET gesendet='' WHERE id=?", [(r["id"],) for r in mine])
    return sent


_loop = {"started": False, "last": "", "error": ""}


def start_loop():
    if _loop["started"]:
        return
    _loop["started"] = True

    def run():
        time.sleep(20)
        while True:
            try:
                with db.tx() as c:
                    c.execute("SELECT pg_advisory_xact_lock(hashtext('aufgaben:sync'))")
                    sync_plans(c)
                send_due()
                _loop["last"], _loop["error"] = _now(), ""
            except Exception as e:   # nie den Prozess beenden – beim nächsten Durchlauf erneut
                _loop["error"] = str(e)[:300]
            time.sleep(300)
    threading.Thread(target=run, daemon=True, name="aufgaben-erinnerungen").start()


# ---------------------------------------------------------------- Erinnerungen (alle Quellen)
@app.get("/api/erinnerungen")
def erinnerungen():
    scope = _scope()
    with db.tx() as c:
        if request.args.get("abgleich") == "1":   # Seite geöffnet: Pläne sofort abgleichen
            c.execute("SELECT pg_advisory_xact_lock(hashtext('aufgaben:sync'))")
            sync_plans(c)
        P = _projects(c)
        names = {r["id"]: C.full_name(r) for r in c.execute("SELECT * FROM users")}
        plans = {r["id"]: r for r in c.execute("SELECT id, name, project_id, updated_by FROM gantt_projects")}
        own = c.execute("SELECT * FROM erinnerungen WHERE status IN ('offen','erledigt') ORDER BY termin, id").fetchall()
        bt = c.execute(f"""SELECT i.id, i.kind, i.text, i.due, i.due_time, i.reminded, i.remind_user, r.id AS rid, r.project_id AS pid
            FROM items i JOIN reports r ON r.id=i.report_id WHERE i.due!='' AND i.done=0 ORDER BY i.due""").fetchall()
        secs = {r["key"]: r["title"] for r in c.execute("SELECT key, title FROM sections")}
    today = date.today().isoformat()
    me = g.user["id"]
    out = []
    for r in own:
        rec = _ids(r["empfaenger"])
        p = P.get(r["project_id"]) if r["project_id"] else None
        if p and not _sees(g.user, p):
            continue
        if not p and r["quelle"] == "plan":
            pl = plans.get(r["gantt_id"])
            if not pl:
                continue
        if scope == "mine" and me not in rec and r["erstellt_von"] != g.user["name"] and not (p and _mine(g.user, p)):
            continue
        d = _j(r["daten"], {})
        out.append({"id": f"r{r['id']}", "quelle": r["quelle"], "titel": r["titel"], "text": r["text"], "termin": r["termin"], "uhrzeit": r["uhrzeit"],
                    "ereignis": r["ereignis"], "status": r["status"], "gesendet": r["gesendet"], "manuell": bool(r["manuell"]),
                    "projekt": p["name"] if p else (d.get("plan") or ""), "pid": r["project_id"], "gantt_id": r["gantt_id"],
                    "an": [names.get(x, "?") for x in rec], "an_ids": rec, "von": r["erstellt_von"]})
    for x in bt:
        p = P.get(x["pid"])
        if not p or not _sees(g.user, p) or (scope == "mine" and x["remind_user"] != me and not _mine(g.user, p)):
            continue
        out.append({"id": f"b{x['id']}", "quelle": "bautagebuch", "titel": f"{secs.get(x['kind'], 'Eintrag')}: {(x['text'] or '').strip().splitlines()[0][:140] if (x['text'] or '').strip() else ''}",
                    "text": x["text"] or "", "termin": x["due"], "uhrzeit": x["due_time"] or "09:00", "ereignis": "", "status": "offen",
                    "gesendet": x["reminded"] or "", "manuell": False, "projekt": p["name"], "pid": x["pid"], "rid": x["rid"],
                    "an": [names.get(x["remind_user"], "?")] if x["remind_user"] else [], "an_ids": [x["remind_user"]] if x["remind_user"] else [], "von": ""})
    for o in out:
        o["lage"] = ("erledigt" if o["status"] == "erledigt" else "ueberfaellig" if o["termin"] < today and not o["gesendet"] and o["quelle"] != "bautagebuch"
                     else "abgelaufen" if o["termin"] < today else "heute" if o["termin"] == today else "bald" if o["termin"] <= (date.today() + timedelta(days=7)).isoformat() else "spaeter")
    out.sort(key=lambda o: (o["status"] == "erledigt", o["termin"], o["titel"]))
    return jsonify(items=out, mail=_mail_ok(), loop=_loop)


def _mail_ok():
    with db.tx() as c:
        return mail.configured(mail.conf(c))


@app.post("/api/erinnerungen")
def erinnerung_neu():
    b = request.get_json(silent=True) or {}
    titel = str(b.get("titel") or "").strip()[:200]
    termin = str(b.get("termin") or "").strip()
    if not titel or not DATE.match(termin):
        return jsonify(error="Bitte Text und Datum angeben."), 400
    uz = b.get("uhrzeit") if TIME.match(str(b.get("uhrzeit") or "")) else "08:00"
    rec = [int(x) for x in (b.get("an") or [g.user["id"]]) if str(x).isdigit()] or [g.user["id"]]
    pid = b.get("pid") if isinstance(b.get("pid"), int) else None
    with db.tx() as c:
        if pid and not c.execute("SELECT 1 FROM projects WHERE id=?", (pid,)).fetchone():
            pid = None
        i = c.execute("""INSERT INTO erinnerungen(quelle, project_id, titel, text, termin, uhrzeit, empfaenger, erstellt, erstellt_von, geaendert, geaendert_von)
                         VALUES('eigen',?,?,?,?,?,?,?,?,?,?) RETURNING id""",
                      (pid, titel, str(b.get("text") or "")[:2000], termin, uz, json.dumps(rec), _now(), g.user["name"], _now(), g.user["name"])).fetchone()[0]
    C.audit(g.user["name"], "inhalt", "Erinnerung angelegt", titel)
    return jsonify(ok=True, id=f"r{i}")


@app.put("/api/erinnerungen/<rid>")
def erinnerung_edit(rid):
    b = request.get_json(silent=True) or {}
    termin = str(b.get("termin") or "").strip() if "termin" in b else None
    if termin is not None and not DATE.match(termin):
        return jsonify(error="Das Datum ist ungültig."), 400
    uz = b.get("uhrzeit") if TIME.match(str(b.get("uhrzeit") or "")) else None
    if rid.startswith("b") and rid[1:].isdigit():   # Bautagebuch-Eintrag: dort neu terminieren / erledigen
        body = {}
        if termin is not None:
            body["due"] = termin
        if uz:
            body["due_time"] = uz
        if b.get("status") in ("erledigt", "offen"):
            body["done"] = 1 if b["status"] == "erledigt" else 0
        try:
            C.bt_api("PUT", f"/api/items/{int(rid[1:])}", body)
        except RuntimeError as e:
            return jsonify(error=str(e)), 502
        return jsonify(ok=True)
    if not (rid.startswith("r") and rid[1:].isdigit()):
        return jsonify(error="Nicht gefunden"), 404
    with db.tx() as c:
        r = c.execute("SELECT * FROM erinnerungen WHERE id=?", (int(rid[1:]),)).fetchone()
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        sets = {}
        if termin is not None:
            sets.update(termin=termin, gesendet="", manuell=1 if r["quelle"] == "plan" else r["manuell"])
        if uz:
            sets.update(uhrzeit=uz, gesendet="")
        if b.get("status") in ("offen", "erledigt"):
            sets["status"] = b["status"]
        if "titel" in b and r["quelle"] == "eigen":
            sets["titel"] = str(b["titel"] or "").strip()[:200] or r["titel"]
        if "text" in b and r["quelle"] == "eigen":
            sets["text"] = str(b["text"] or "")[:2000]
        if isinstance(b.get("an"), list):
            sets["empfaenger"] = json.dumps([int(x) for x in b["an"] if str(x).isdigit()] or [g.user["id"]])
        if sets:
            c.execute(f"UPDATE erinnerungen SET {', '.join(k + '=?' for k in sets)}, geaendert=?, geaendert_von=? WHERE id=?", (*sets.values(), _now(), g.user["name"], r["id"]))
    C.audit(g.user["name"], "inhalt", "Erinnerung geändert", f"{r['titel']}: " + ", ".join(f"{k}={v}" for k, v in sets.items() if k != "gesendet"))
    return jsonify(ok=True)


@app.delete("/api/erinnerungen/<rid>")
def erinnerung_del(rid):
    if not (rid.startswith("r") and rid[1:].isdigit()):
        return jsonify(error="Nur eigene Erinnerungen lassen sich löschen."), 400
    with db.tx() as c:
        r = c.execute("SELECT * FROM erinnerungen WHERE id=?", (int(rid[1:]),)).fetchone()
        if not r or r["quelle"] != "eigen":
            return jsonify(error="Erinnerungen aus Bauzeitenplänen werden mit „Erledigt“ abgehakt."), 400
        c.execute("DELETE FROM erinnerungen WHERE id=?", (r["id"],))
    return jsonify(ok=True, item={k: r[k] for k in r.keys()})


@app.post("/api/erinnerungen/wiederherstellen")
def erinnerung_restore():
    """Gelöschte eigene Erinnerung zurückholen (Rückgängig)."""
    d = request.get_json(silent=True) or {}
    cols = ("id", "quelle", "project_id", "titel", "text", "termin", "uhrzeit", "empfaenger", "status", "gesendet", "erstellt", "erstellt_von")
    if d.get("quelle") != "eigen" or not isinstance(d.get("id"), int):
        return jsonify(error="Nicht möglich"), 400
    with db.tx() as c:
        if c.execute("SELECT 1 FROM erinnerungen WHERE id=?", (d["id"],)).fetchone():
            return jsonify(ok=True)
        c.execute(f"INSERT INTO erinnerungen({','.join(cols)}) VALUES({','.join('?' * len(cols))})", tuple(d.get(k) for k in cols))
    return jsonify(ok=True)


@app.post("/api/erinnerungen/test")
def erinnerung_test():
    """Testmail an den angemeldeten Benutzer."""
    with db.tx() as c:
        mc = mail.conf(c)
    if not g.user["email"]:
        return jsonify(error="Unter Benutzer ist für dich keine E-Mail-Adresse eingetragen."), 400
    try:
        mail.send(mc, g.user["email"], "Bauplattform – Test der Erinnerungen", f"Hallo {C.public(g.user)['vorname'] or g.user['name']},\n\nso kommen Erinnerungen aus „Mängel & Erinnerungen“ an.\n")
    except mail.MailError as e:
        return jsonify(error=str(e)), 502
    return jsonify(ok=True, to=g.user["email"])


@app.get("/api/projekte")
def projekte():
    with db.tx() as c:
        P = _projects(c)
    return jsonify([{"id": k, "name": v["name"], "mine": _mine(g.user, v)} for k, v in sorted(P.items(), key=lambda x: x[1]["name"]) if not v["archived"] and _sees(g.user, v)])


@app.get("/api/benutzer")
def benutzer():
    with db.tx() as c:
        return jsonify([{"id": r["id"], "name": C.full_name(r)} for r in c.execute("SELECT * FROM users WHERE active=1 AND lower(name)!='admin' ORDER BY name")])


@app.route("/api/einstellungen", methods=["GET", "PUT"])
def einstellungen():
    with db.tx() as c:
        if request.method == "PUT":
            b = request.get_json(silent=True) or {}
            cur = conf(c)
            for k in ("vorlauf", "luecke"):
                if k in b:
                    try:
                        cur[k] = int(b[k])
                    except (TypeError, ValueError):
                        pass
            if "mail_plan" in b:
                cur["mail_plan"] = bool(b["mail_plan"])
            if TIME.match(str(b.get("uhrzeit") or "")):
                cur["uhrzeit"] = b["uhrzeit"]
            c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES('aufgaben',?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated=excluded.updated, updated_by=excluded.updated_by",
                      (json.dumps(cur), _now(), g.user["name"]))
            # neuer Vorlauf: noch nicht verschickte, nicht von Hand verschobene Plan-Erinnerungen neu berechnen
            for r in c.execute("SELECT id, ereignis FROM erinnerungen WHERE quelle='plan' AND status='offen' AND gesendet='' AND manuell=0").fetchall():
                if r["ereignis"]:
                    t = max((date.fromisoformat(r["ereignis"]) - timedelta(days=conf(c)["vorlauf"])).isoformat(), date.today().isoformat())
                    c.execute("UPDATE erinnerungen SET termin=?, uhrzeit=? WHERE id=?", (t, conf(c)["uhrzeit"], r["id"]))
            C.audit(g.user["name"], "verwaltung", "Erinnerungen eingestellt", f"Vorlauf {cur['vorlauf']} Tage, Lücke {cur['luecke']} Tage, Mail {'an' if cur['mail_plan'] else 'aus'}")
        return jsonify(conf(c))


C.wait_schema()
start_loop()
