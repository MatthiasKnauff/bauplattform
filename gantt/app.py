"""Bauzeitenplan (Gantt-App) – Server der Bauplattform.

Früher ein Node-Server mit JSON-Dateien; jetzt Python/Flask mit der gemeinsamen PostgreSQL-Datenbank der Plattform.
Die HTTP-Schnittstelle (/api/...) ist unverändert, damit die Oberfläche (public/) gleich bleibt. Neu:
- Anmeldung über die gemeinsame Anmeldung (SSO, Cookie bp_sso); ohne Anmeldung → Startseite der Plattform.
- Mehrere Benutzer: Jeder Plan hat einen Änderungszähler (_rev). Wer auf einem veralteten Stand speichert, bekommt 409
  und die Oberfläche fragt nach. „Wer arbeitet gerade im Plan“ über /api/projects/<id>/presence.
- Firmen-Adressbuch = Kontakte des Bautagebuchs (Tabelle contacts).
- Pläne lassen sich mit einem Bautagebuch-Projekt verknüpfen (Sichtbarkeit richtet sich dann nach den Bauleitern).
- Alte Daten (Docker-Volume der Gantt-App, eingebunden unter /legacy) werden beim ersten Start übernommen.
"""
import json, math, os, re, secrets, time, urllib.error, urllib.request
from datetime import date, datetime
from urllib.parse import quote, urlsplit

from flask import Flask, g, jsonify, redirect, request, send_from_directory

from bpcore import SCHEMA, ai as bpai, db, head, papierkorb, platform, rechte, sso, tempo, versionen
from bpcore import contacts as shared_contacts
from bpcore import logo as bplogo

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, "public")
SAMPLES = os.path.join(HERE, "samples")
LEGACY = os.environ.get("LEGACY_DIR", "/legacy")
DAY = 86400000
ID_OK = re.compile(r"^[a-z0-9-]{1,64}$")
PRESENCE_TTL = 45   # Sekunden ohne Herzschlag → gilt als nicht mehr im Plan

app = Flask(__name__, static_folder=None)
tempo.einrichten(app, "gantt")   # zuerst: packen, versionieren, langsame Anfragen melden (bpcore/tempo.py)
app.register_blueprint(head.blueprint(lambda: g.get("user")))   # gemeinsame Kopfleiste (/bp/head.js, /api/bp/ki)
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024
app.json.sort_keys = False   # Reihenfolge der Schlüssel erhalten (z. B. Gewerke in P.trades)
from werkzeug.middleware.proxy_fix import ProxyFix
if os.environ.get("TRUST_PROXY") == "1":   # hinter einem Reverse Proxy: X-Forwarded-* übernehmen
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
else:   # nur den Pfad vom Verteiler (/bauzeitenplan) übernehmen
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=0, x_proto=0, x_host=0, x_prefix=1)


# ---------------------------------------------------------------- JS-ähnliche Hilfen (für sanitize wie im alten Server)
def is_int(x):
    return (isinstance(x, int) and not isinstance(x, bool)) or (isinstance(x, float) and x.is_integer())


def num(x):
    """JavaScript `+x` (NaN → None)."""
    if isinstance(x, bool):
        return 1.0 if x else 0.0
    if isinstance(x, (int, float)):
        return float(x) if not (isinstance(x, float) and math.isnan(x)) else None
    if x is None:
        return 0.0
    if isinstance(x, str):
        s = x.strip()
        if s == "":
            return 0.0
        try:
            return float(s)
        except ValueError:
            return None
    if isinstance(x, list):
        return 0.0 if not x else (num(x[0]) if len(x) == 1 else None)
    return None


def jround(x):
    return int(math.floor(x + 0.5))


def rnum(x, default=0):
    """Math.round(+x || default)"""
    v = num(x)
    return jround(v) if v else default


def jstr(x):
    if x is None:
        return ""
    if isinstance(x, bool):
        return "true" if x else "false"
    if isinstance(x, float):
        return str(int(x)) if x.is_integer() else repr(x)
    if isinstance(x, dict):
        return "[object Object]"
    if isinstance(x, list):
        return ",".join(jstr(v) for v in x)
    return str(x)


def truthy(x):
    if isinstance(x, (dict, list)):
        return True
    return bool(x)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def now_iso():
    return db.now_iso()


def new_id():
    return secrets.token_hex(6)


def monday_of_this_week():
    d = date.today()
    n = (date(d.year, d.month, d.day) - date(1970, 1, 1)).days
    return n - d.weekday()


# ---------------------------------------------------------------- Plan bereinigen (wie sanitize() im alten Server)
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def _pred(p):
    l = {"uid": int(p["uid"]), "type": p.get("type") if p.get("type") in ("FS", "SS", "FF", "SF") else "FS", "lag": rnum(p.get("lag"))}
    if is_int(p.get("ps")) and p["ps"] >= 0:
        l["ps"] = int(p["ps"])
    if is_int(p.get("ss")) and p["ss"] >= 0:
        l["ss"] = int(p["ss"])
    return l


def sanitize(inp, pid):
    inp = inp if isinstance(inp, dict) else {}
    tasks = inp.get("tasks") if isinstance(inp.get("tasks"), list) else []
    max_uid = 0
    clean = []
    for t in tasks:
        t = t if isinstance(t, dict) else {}
        if is_int(t.get("uid")):
            uid = int(t["uid"])
        else:
            max_uid += 1
            uid = max_uid
        max_uid = max(max_uid, uid)
        segs = None
        if isinstance(t.get("segs"), list) and len(t["segs"]) > 1:
            segs = [{"d": max(1, rnum(x.get("d"), 1)), "gap": max(0, rnum(x.get("gap")))} for x in (y if isinstance(y, dict) else {} for y in t["segs"][:50])]
        clean.append({
            "uid": uid, "name": jstr(t.get("name"))[:500], "dur": max(0, rnum(t.get("dur"))),
            "cons": int(t["cons"]) if is_int(t.get("cons")) else None, "pct": clamp(rnum(t.get("pct")), 0, 100),
            "res": jstr(t.get("res"))[:500], "gw": jstr(t.get("gw"))[:100],
            "color": t["color"] if isinstance(t.get("color"), str) and HEX.match(t["color"]) else "",
            "cat": jstr(t.get("cat"))[:40], "blk": int(t["blk"]) if is_int(t.get("blk")) else -1, "ph": jstr(t.get("ph"))[:20],
            "notes": jstr(t.get("notes"))[:5000],
            "lvl": clamp(rnum(t.get("lvl")), 0, 20), "collapsed": truthy(t.get("collapsed")),
            "preds": [_pred(p) for p in (t.get("preds") if isinstance(t.get("preds"), list) else []) if isinstance(p, dict) and is_int(p.get("uid"))],
            "segs": segs,
        })
    cal = None
    c = inp.get("cal")
    if isinstance(c, (dict, list)):   # JS: input.cal && typeof === 'object'
        c = c if isinstance(c, dict) else {}
        wk = num(c.get("week"))
        st = jstr(c.get("state") if c.get("state") is not None else "DE")
        cal = {
            "week": int(wk) if wk in (5, 6, 7) else 5,
            "state": st if re.fullmatch(r"[A-Z]{0,2}", st) else "DE",
            "free": [{"from": jstr(f.get("from") or "")[:10], "to": jstr(f.get("to") or f.get("from") or "")[:10],
                      "name": jstr(f.get("name") or "")[:100], "yearly": truthy(f.get("yearly"))}
                     for f in (c.get("free") if isinstance(c.get("free"), list) else [])[:500] if isinstance(f, dict)],
        }
    trades = {}
    tr = inp.get("trades")
    if isinstance(tr, dict):
        for k, v in list(tr.items())[:300]:
            v = v if isinstance(v, dict) else {}
            trades[jstr(k)[:100]] = {"firm": jstr(v.get("firm") or "")[:40], "din": jstr(v.get("din") or "")[:40],
                                     "craft": jstr(v.get("craft") or "")[:100], "status": jstr(v.get("status") or "")[:20],
                                     "note": jstr(v.get("note") or "")[:2000], "extra": truthy(v.get("extra"))}
    assist = inp.get("assist")
    assist = assist if isinstance(assist, dict) and len(json.dumps(assist)) < 300000 else None
    gwc = inp.get("gwColors") if isinstance(inp.get("gwColors"), dict) else {}
    gw_colors = dict([(k, v) for k, v in gwc.items() if isinstance(k, str) and HEX.match(jstr(v))][:200])
    nu = max(num(inp.get("nextUid")) or 1, max_uid + 1)
    return {
        "id": pid, "name": jstr(inp.get("name") or "Unbenanntes Projekt")[:200],
        "start": int(inp["start"]) if is_int(inp.get("start")) else monday_of_this_week(),
        "nextUid": int(nu) if float(nu).is_integer() else nu,
        "tasks": clean, "cal": cal, "trades": trades, "assist": assist, "gwColors": gw_colors,
        "sched": _sched(inp.get("sched"), {t["uid"] for t in clean}),
        "archived": truthy(inp.get("archived")),   # archiviert: bleibt erhalten, steht in den Listen unten
    }


def _sched(v, uids):
    """Berechnete Termine je Leistung (vom Browser beim Speichern mitgeschickt) – für den Mittelabfluss der Baukosten."""
    if not isinstance(v, list):
        return None
    out = []
    for x in v[:5000]:
        if not isinstance(x, dict) or not is_int(x.get("uid")) or int(x["uid"]) not in uids:
            continue
        s_, f_ = jstr(x.get("s"))[:10], jstr(x.get("f"))[:10]
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s_) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", f_):
            out.append({"uid": int(x["uid"]), "s": s_, "f": f_, "g": 1 if x.get("g") else 0})
    return out or None


# ---------------------------------------------------------------- Anmeldung, Rechte, Schutz vor fremden Seiten
OPEN_API = ("/api/health", "/api/platform")


def _portal_login_url(next_url):
    a = next(x for x in platform.apps() if x["key"] == "portal")
    base = a["url"]
    if not base:
        u = urlsplit(request.host_url)
        base = f"{u.scheme}://{u.hostname}:{a['port']}"
    return f"{base}/login?next={quote(next_url, safe='')}"


@app.before_request
def guard():
    p = request.path
    if request.method not in ("GET", "HEAD", "OPTIONS"):   # Schreibzugriffe nur von der eigenen Seite (CSRF-Schutz)
        o = request.headers.get("Origin")
        if o and urlsplit(o).netloc != request.host:
            return jsonify(error="Anfrage von fremder Seite abgelehnt"), 403
    is_api = p.startswith("/api/")
    is_page = p in ("/", "/index.html", "/assistent.html")
    if (is_api and (p in OPEN_API or p.startswith("/api/ansicht/"))) or not (is_api or is_page):   # Links zum Ansehen: ohne Anmeldung (geheimer Schlüssel)
        return
    with db.tx() as c:
        u = sso.current(c, request)
    if not u:
        if is_page:
            return redirect(_portal_login_url(request.url))
        return jsonify(error="Nicht angemeldet", login=_portal_login_url(request.referrer or request.url_root)), 401
    if u["must_change"]:
        if is_page:
            return redirect(_portal_login_url(request.url))
        return jsonify(error="Bitte zuerst auf der Startseite ein neues Kennwort vergeben.", must_change=True), 403
    if not sso.has_app(u, "gantt"):
        msg = "Für den Bauzeitenplan ist dein Konto nicht freigeschaltet."
        return (msg, 403, {"Content-Type": "text/plain; charset=utf-8"}) if is_page else (jsonify(error=msg), 403)
    g.user = u


@app.after_request
def headers(resp):
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    resp.headers.setdefault("Referrer-Policy", "same-origin")
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


@app.errorhandler(Exception)
def oops(e):
    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        return jsonify(error=e.description), e.code
    app.logger.exception(e)
    try:
        from bpcore import fehler
        fehler.ausnahme("gantt", e, f"{request.method} {request.path}", uname())
    except Exception:   # Fehler beim Festhalten des Fehlers – die 500-Antwort geht trotzdem raus
        pass
    return jsonify(error=str(e)), 500


def uname():
    return g.user["name"] if getattr(g, "user", None) else ""


def body():
    try:
        return json.loads(request.get_data(as_text=True) or "{}")
    except ValueError:
        from werkzeug.exceptions import BadRequest
        raise BadRequest("Ungültige Daten")


# ---------------------------------------------------------------- Sichtbarkeit über verknüpfte Bautagebuch-Projekte
def _leaders(raw):
    try:
        v = json.loads(raw or "[]")
    except ValueError:
        return []
    return [int(x) for x in v if str(x).isdigit()] if isinstance(v, list) else []


def visible_bt(c, user):
    """None = alles sichtbar, sonst Menge sichtbarer Bautagebuch-Projekt-IDs (gleiche Regel wie im Bautagebuch)."""
    if user["is_admin"]:
        return None
    out = set()
    for r in c.execute("SELECT id, leaders FROM projects"):
        ls = _leaders(r["leaders"])
        if not ls or user["id"] in ls:
            out.add(r["id"])
    return out


def can_see(c, row):
    vis = visible_bt(c, g.user)
    return vis is None or row["project_id"] is None or row["project_id"] in vis


# ---------------------------------------------------------------- Pläne
def row_of(c, pid):
    return c.execute("SELECT * FROM gantt_projects WHERE id=?", (pid,)).fetchone()


def out_project(c, r):
    p = json.loads(r["data"])
    p["updated"] = r["updated"]
    p["_rev"] = r["rev"]
    p["_by"] = r["updated_by"]
    p["_bt"] = None
    if r["project_id"]:
        b = c.execute("SELECT id, name, street, zip, city FROM projects WHERE id=?", (r["project_id"],)).fetchone()
        if b:
            p["_bt"] = {"id": b["id"], "name": b["name"], "address": ", ".join(x for x in (b["street"], f"{b['zip']} {b['city']}".strip()) if x)}
    return p


def write_project(c, p, by="", project_id=None, insert=False):
    ts = now_iso()
    p["updated"] = ts
    data = json.dumps({k: v for k, v in p.items() if k != "updated"}, ensure_ascii=False, separators=(",", ":"))
    if insert:
        c.execute("INSERT INTO gantt_projects(id, name, data, rev, project_id, created, updated, updated_by) VALUES(?,?,?,1,?,?,?,?)",
                  (p["id"], p["name"], data, project_id, ts, ts, by))
    else:
        c.execute("UPDATE gantt_projects SET name=?, data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (p["name"], data, ts, by, p["id"]))
    return out_project(c, row_of(c, p["id"]))


def list_projects(c):
    vis = visible_bt(c, g.user) if getattr(g, "user", None) else None
    bt = {r["id"]: r["name"] for r in c.execute("SELECT id, name FROM projects")}
    out = []
    for r in c.execute("SELECT id, name, data, created, updated, updated_by, project_id FROM gantt_projects ORDER BY updated DESC"):
        if vis is not None and r["project_id"] is not None and r["project_id"] not in vis:
            continue
        try:
            p = json.loads(r["data"])
        except ValueError:
            continue
        out.append({"id": r["id"], "name": r["name"], "created": r["created"], "updated": r["updated"], "n": len(p.get("tasks") or []), "start": p.get("start"),
                    "assist": bool(isinstance(p.get("assist"), dict) and p["assist"].get("type")),
                    "by": r["updated_by"], "bt": bt.get(r["project_id"]) if r["project_id"] else None, "bt_id": r["project_id"],
                    "archived": bool(p.get("archived"))})
    # je Bautagebuch-Projekt: welche Version gilt (★) – für Bautagebuch, Erinnerungen, To-dos
    from bpcore import gueltig
    for bid in {x["bt_id"] for x in out if x["bt_id"]}:
        V = [x for x in out if x["bt_id"] == bid]
        gid = gueltig.waehlen([(x["id"], x["created"], x["archived"]) for x in V], gueltig.lesen(c, "gantt", bid))
        for x in V:
            x["gueltig"] = x["id"] == gid
    return out


@app.get("/api/logo")
def logo():
    """Büro-Logo für die Kopfzeile der Ausdrucke – aus dem Kern (bpcore.logo)."""
    with db.tx() as c:
        roh = bplogo.lies(c)
    if not roh:
        return jsonify(error="Kein Logo"), 404
    return roh[0], 200, {"Content-Type": bplogo.MIME.get(roh[1], "image/png"), "Cache-Control": "private, max-age=300"}


@app.get("/api/health")
def health():
    return jsonify(ok=True, version=platform.version())


@app.get("/api/platform")
def platform_conf():
    with db.tx() as c:
        u = sso.current(c, request)
    return jsonify(platform.config(u))


def katalog_darf():
    """Block „Bauzeitenplan: Kataloge, Phasen, Firmen“ der Verwaltung (je Rolle – / sehen / ändern)."""
    return rechte.stufe(g.user, "gantt") == "aendern"


@app.get("/api/me")
def me():
    u = g.user
    return jsonify(id=u["id"], name=u["name"], is_admin=bool(u["is_admin"]), katalog=katalog_darf(), accent=u["accent"] or "",
                   theme=sso.theme_of(u) or "dunkel", apps=sso.apps_of(u))


@app.post("/api/logout")
def logout():
    with db.tx() as c:
        sso.revoke_req(c, request)
    return sso.clear_cookie(jsonify(ok=True, login=_portal_login_url(request.url_root)))


_SVG_QUELLE = re.compile(r"""(?:href\s*=\s*["']([^"']*)["']|url\(\s*["']?([^)"']*))""", re.I)


def _svg_sicher(svg):
    """Für das Umwandeln SVG → PDF: nur eingebettete Bilder (data:image/…) und interne Verweise (#…) – nie Dateien oder
    Adressen nachladen lassen, keine DOCTYPE/ENTITY-Tricks."""
    if re.search(r"<!(DOCTYPE|ENTITY)", svg, re.I):
        return False
    for m in _SVG_QUELLE.finditer(svg):
        q = (m.group(1) or m.group(2) or "").strip()
        if q and not q.startswith("#") and not q.lower().startswith("data:image/"):
            return False
    return True


@app.post("/api/pdf")
def druck_pdf():
    """Druckseiten (dieselben SVG-Seiten wie beim Drucken, erzeugt in public/print.js) als eine PDF-Datei.
    Anfrage: {"pages": ["<svg …>", …], "name": "Dateiname ohne .pdf"} → application/pdf zum Herunterladen."""
    if request.content_length and request.content_length > 60 * 1024 * 1024:
        return jsonify(error="Druck zu groß"), 413
    b = request.get_json(silent=True) or {}
    pages = b.get("pages")
    if not isinstance(pages, list) or not pages or len(pages) > 400 or not all(isinstance(p, str) and p.lstrip().startswith("<svg") for p in pages):
        return jsonify(error="Keine Druckseiten übergeben"), 400
    if not all(_svg_sicher(p) for p in pages):
        return jsonify(error="Keine Druckseiten übergeben"), 400
    import io
    import cairosvg
    from pypdf import PdfReader, PdfWriter
    out = PdfWriter()
    try:
        for p in pages:
            teil = cairosvg.svg2pdf(bytestring=p.encode("utf-8"), unsafe=False)
            for s in PdfReader(io.BytesIO(teil)).pages:
                out.add_page(s)
    except Exception as e:
        from bpcore import fehler
        fehler.still("gantt", "Druck als PDF umwandeln", e)
        return jsonify(error="Die PDF konnte nicht erzeugt werden."), 500
    name = re.sub(r'[\\/:*?"<>|\r\n]+', " ", str(b.get("name") or "Bauzeitenplan")).strip()[:120] or "Bauzeitenplan"
    buf = io.BytesIO()
    out.write(buf)
    return app.response_class(buf.getvalue(), mimetype="application/pdf",
                              headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(name + '.pdf')}"})


@app.route("/api/projects", methods=["GET", "POST"])
def projects():
    with db.tx() as c:
        if request.method == "GET":
            return jsonify(list_projects(c))
        b = body()
        p = sanitize(b, new_id())
        link = b.get("_link") if is_int(b.get("_link")) else None
        if link is not None and not c.execute("SELECT 1 FROM projects WHERE id=?", (int(link),)).fetchone():
            link = None
        vis = visible_bt(c, g.user) if link is not None else None   # nur mit Projekten verknüpfen, die der Benutzer sehen darf
        if vis is not None and int(link) not in vis:
            return jsonify(error="Projekt nicht gefunden"), 404
        return jsonify(write_project(c, p, uname(), int(link) if link is not None else None, insert=True)), 201


def _project_or_error(c, pid):
    if not ID_OK.match(pid):
        return None, (jsonify(error="Ungültige ID"), 400)
    r = row_of(c, pid)
    if not r or not can_see(c, r):
        return None, (jsonify(error="Projekt nicht gefunden"), 404)
    return r, None


@app.route("/api/projects/<pid>", methods=["GET", "PUT", "DELETE"])
def project(pid):
    with db.tx() as c:
        r, err = _project_or_error(c, pid)
        if err:
            return err
        if request.method == "GET":
            return jsonify(out_project(c, r))
        if request.method == "DELETE":   # in den Papierkorb (mit allen Ständen im Verlauf)
            pr = c.execute("SELECT name FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
            c.execute("DELETE FROM gantt_presence WHERE gantt_id=?", (pid,))
            pk = papierkorb.ablegen(c, "gantt_projects", pid, "Bauzeitenplan", r["name"], uname(), pr["name"] if pr else "", "gantt")
            return jsonify(ok=True, papierkorb=pk)   # Papierkorb-ID für „Rückgängig“
        b = body()
        c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", ("gantt:" + pid,))   # gleichzeitige Speicherungen nacheinander
        r = row_of(c, pid)
        rev = b.get("_rev")
        if is_int(rev) and int(rev) != r["rev"] and not b.get("_force"):
            return jsonify(error=f"Der Plan wurde inzwischen von {r['updated_by'] or 'jemand anderem'} geändert.", conflict=True,
                           by=r["updated_by"], updated=r["updated"], rev=r["rev"]), 409
        return jsonify(write_project(c, sanitize(b, pid), uname()))


@app.put("/api/projects/<pid>/gueltig")
def project_gueltig(pid):
    """Diese Version des Bauzeitenplans gilt ab jetzt (für Bautagebuch, Erinnerungen, To-dos des Projekts)."""
    from bpcore import gueltig
    with db.tx() as c:
        r, err = _project_or_error(c, pid)
        if err:
            return err
        if not r["project_id"]:
            return jsonify(error="Der Plan ist mit keinem Projekt verknüpft – verknüpfen unter Projekt → Bautagebuch."), 400
        gueltig.setzen(c, "gantt", r["project_id"], pid, uname())
        return jsonify(ok=True)


@app.put("/api/projects/<pid>/archiv")
def project_archiv(pid):
    """Plan archivieren oder zurückholen ({archiviert: true|false}) – ohne ihn zu öffnen."""
    b = body()
    with db.tx() as c:
        r, err = _project_or_error(c, pid)
        if err:
            return err
        c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", ("gantt:" + pid,))
        r = row_of(c, pid)
        d = json.loads(r["data"])
        d["archived"] = truthy(b.get("archiviert"))
        d["id"], d["name"] = pid, r["name"]
        c.execute("UPDATE gantt_projects SET data=?, rev=rev+1 WHERE id=?", (json.dumps(d, ensure_ascii=False, separators=(",", ":")), pid))
        return jsonify(ok=True, archived=d["archived"], rev=row_of(c, pid)["rev"])


@app.put("/api/projects/<pid>/link")
def project_link(pid):
    """Plan mit einem Bautagebuch-Projekt verknüpfen (oder lösen: project_id null)."""
    b = body()
    with db.tx() as c:
        r, err = _project_or_error(c, pid)
        if err:
            return err
        bt = b.get("project_id")
        if bt is not None:
            if not is_int(bt) or not c.execute("SELECT 1 FROM projects WHERE id=?", (int(bt),)).fetchone():
                return jsonify(error="Projekt nicht gefunden"), 404
            vis = visible_bt(c, g.user)
            if vis is not None and int(bt) not in vis:
                return jsonify(error="Projekt nicht gefunden"), 404
            bt = int(bt)
        c.execute("UPDATE gantt_projects SET project_id=? WHERE id=?", (bt, pid))
        return jsonify(out_project(c, row_of(c, pid)))


@app.get("/api/bt-projects")
def bt_projects():
    """Projekte des Bautagebuchs zur Auswahl (nur die für den Benutzer sichtbaren)."""
    with db.tx() as c:
        vis = visible_bt(c, g.user)
        rows = c.execute("SELECT id, name, street, zip, city, archived FROM projects ORDER BY archived, name").fetchall()
        used = {r["project_id"]: r["id"] for r in c.execute("SELECT id, project_id FROM gantt_projects WHERE project_id IS NOT NULL")}
    return jsonify([{"id": r["id"], "name": r["name"], "address": ", ".join(x for x in (r["street"], f"{r['zip']} {r['city']}".strip()) if x),
                     "archived": bool(r["archived"]), "plan": used.get(r["id"])} for r in rows if vis is None or r["id"] in vis])


@app.route("/api/projects/<pid>/presence", methods=["POST", "DELETE"])
def presence(pid):
    """Herzschlag der Oberfläche: wer hat den Plan offen, und gibt es einen neueren Stand?"""
    if not ID_OK.match(pid):
        return jsonify(error="Ungültige ID"), 400
    now = int(time.time())
    with db.tx() as c:
        if request.method == "DELETE":
            c.execute("DELETE FROM gantt_presence WHERE gantt_id=? AND user_id=?", (pid, g.user["id"]))
            return jsonify(ok=True)
        r = row_of(c, pid)
        if not r or not can_see(c, r):
            return jsonify(error="Projekt nicht gefunden", gone=True), 404
        c.execute("INSERT INTO gantt_presence(gantt_id, user_id, user_name, seen) VALUES(?,?,?,?) "
                  "ON CONFLICT (gantt_id, user_id) DO UPDATE SET seen=EXCLUDED.seen, user_name=EXCLUDED.user_name",
                  (pid, g.user["id"], g.user["name"], now))
        c.execute("DELETE FROM gantt_presence WHERE seen < ?", (now - PRESENCE_TTL,))
        others = [x["user_name"] for x in c.execute("SELECT user_name FROM gantt_presence WHERE gantt_id=? AND user_id!=? ORDER BY user_name",
                                                    (pid, g.user["id"]))]
    return jsonify(rev=r["rev"], by=r["updated_by"], updated=r["updated"], others=others)


# ---------------------------------------------------------------- Versionshistorie je Plan
def _vmeta(v):
    m = json.loads(v["meta"])
    m["id"], m["created"] = v["id"], v["created"]
    if v["user_name"]:
        m["by"] = v["user_name"]
    return m


@app.route("/api/projects/<pid>/versions", methods=["GET", "POST"])
@app.route("/api/projects/<pid>/versions/<vid>", methods=["GET", "PATCH", "DELETE"])
def versions(pid, vid=None):
    with db.tx() as c:
        r, err = _project_or_error(c, pid)
        if err:
            return err
        if not vid:
            if request.method == "GET":
                return jsonify([_vmeta(v) for v in c.execute("SELECT id, meta, created, user_name FROM gantt_versions WHERE gantt_id=? ORDER BY created DESC, id DESC", (pid,))])
            b = body()
            proj = json.loads(r["data"])
            proj["updated"] = r["updated"]
            meta = {"name": jstr(b.get("name") or "")[:120], "note": jstr(b.get("note") or "")[:2000], "auto": truthy(b.get("auto")),
                    "n": len(proj.get("tasks") or []), "end": int(b["end"]) if is_int(b.get("end")) else None, "start": proj.get("start")}
            v = {"id": new_id(), "created": now_iso(), **meta}
            c.execute("INSERT INTO gantt_versions(id, gantt_id, meta, data, created, user_name) VALUES(?,?,?,?,?,?)",
                      (v["id"], pid, json.dumps(meta, ensure_ascii=False), json.dumps(proj, ensure_ascii=False), v["created"], uname()))
            # automatische Zwischenstände begrenzen (die 60 neuesten bleiben), benannte Versionen bleiben alle
            autos = [x["id"] for x in c.execute("SELECT id, meta FROM gantt_versions WHERE gantt_id=? ORDER BY created DESC, id DESC", (pid,))
                     if json.loads(x["meta"]).get("auto")]
            for old in autos[60:]:
                c.execute("DELETE FROM gantt_versions WHERE id=?", (old,))
            if uname():
                v["by"] = uname()
            return jsonify(v), 201
        if not ID_OK.match(vid):
            return jsonify(error="Ungültige ID"), 400
        v = c.execute("SELECT * FROM gantt_versions WHERE id=? AND gantt_id=?", (vid, pid)).fetchone()
        if not v:
            return jsonify(error="Version nicht gefunden"), 404
        if request.method == "GET":
            return jsonify({**_vmeta(v), "data": json.loads(v["data"])})
        if request.method == "PATCH":
            b = body()
            m = json.loads(v["meta"])
            if b.get("name") is not None:
                m["name"] = jstr(b["name"])[:120]
            if b.get("note") is not None:
                m["note"] = jstr(b["note"])[:2000]
            if b.get("name") is not None and b.get("name") != "":
                m["auto"] = False
            c.execute("UPDATE gantt_versions SET meta=? WHERE id=?", (json.dumps(m, ensure_ascii=False), vid))
            return jsonify({**m, "id": vid, "created": v["created"]})
        c.execute("DELETE FROM gantt_versions WHERE id=?", (vid,))
        return jsonify(ok=True)


# ---------------------------------------------------------------- projektübergreifende Ablage (Vorlagen, Katalog …)
def store_get(c, key, default):
    r = c.execute("SELECT data FROM gantt_store WHERE key=?", (key,)).fetchone()
    if not r:
        return default
    try:
        v = json.loads(r["data"])
    except ValueError:
        return default
    return v if v is not None else default


def store_put(c, key, val, by=""):
    if key.startswith("_") or by == "Übernahme":
        return _store_put(c, key, val, by)
    with versionen.aenderung(c, f"gs:{key}", by):
        _store_put(c, key, val, by)


def _store_put(c, key, val, by=""):
    c.execute("INSERT INTO gantt_store(key, data, updated, updated_by) VALUES(?,?,?,?) "
              "ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by",
              (key, json.dumps(val, ensure_ascii=False), now_iso(), by))


@app.route("/api/presets", methods=["GET", "POST"])
@app.route("/api/presets/<pid>", methods=["GET", "DELETE"])
def presets(pid=None):
    if pid is not None and not ID_OK.match(pid):
        return jsonify(error="Ungültige ID"), 400
    with db.tx() as c:
        c.execute("SELECT pg_advisory_xact_lock(hashtext('gantt:presets'))")
        lst = store_get(c, "presets", [])
        lst = lst if isinstance(lst, list) else []
        if pid is None:
            if request.method == "GET":
                return jsonify(lst)
            b = body()
            if not isinstance(b, dict) or len(json.dumps(b)) > 300000:
                return jsonify(error="Ungültige Vorlage"), 400
            pr = {"id": new_id(), "name": jstr(b.get("name") or "Vorlage")[:120], "scope": "phases" if b.get("scope") == "phases" else "all",
                  "phases": [jstr(x) for x in b["phases"]][:30] if isinstance(b.get("phases"), list) else [],
                  "data": b["data"] if isinstance(b.get("data"), (dict, list)) and b.get("data") is not None else {}, "created": now_iso(), "by": uname()}
            lst.append(pr)
            store_put(c, "presets", lst, uname())
            return jsonify(pr), 201
        k = next((i for i, x in enumerate(lst) if x.get("id") == pid), -1)
        if k < 0:
            return jsonify(error="Vorlage nicht gefunden"), 404
        if request.method == "DELETE":
            lst.pop(k)
            store_put(c, "presets", lst, uname())
            return jsonify(ok=True)
        return jsonify(lst[k])


# ---- Einrichtung des Planungsassistenten (Gebäudetypen, Bauweisen) – Abweichungen vom eingebauten Katalog
AKEY = re.compile(r"^[a-z0-9_]{1,40}$")
IKEY = re.compile(r"^[\w~.-]{1,60}$")


def _ids(v, n=600):
    return [x for x in (v if isinstance(v, list) else [])[:n] if isinstance(x, str) and IKEY.match(x)]


def clean_prof(x, own=False):
    if not isinstance(x, dict):
        return None
    o = {}
    for k in ("n", "ic", "desc"):
        if k in x:
            o[k] = jstr(x[k])[:{"n": 80, "ic": 8, "desc": 160}[k]]
    for k, lo, hi in (("area", 1, 100000), ("units", 1, 200), ("floors", 1, 30)):
        if k in x and num(x[k]):
            v = max(lo, min(hi, num(x[k])))
            o[k] = v if k == "area" else int(round(v))
    if x.get("dg") in ("none", "kalt", "aus", "staffel"):
        o["dg"] = x["dg"]
    if x.get("takt") in ("parallel", "versetzt"):
        o["takt"] = x["takt"]
    if x.get("naming") in ("whg", "gesch", "ge", "ba", "haus", "custom"):
        o["naming"] = x["naming"]
    if isinstance(x.get("choice"), dict):
        o["choice"] = {k: jstr(v)[:40] for k, v in list(x["choice"].items())[:60] if AKEY.match(k) and AKEY.match(jstr(v))}
    for k in ("rec", "opt"):
        if k in x:
            o[k] = _ids(x[k])
    if isinstance(x.get("ovr"), dict):
        ov = {}
        for k, v in list(x["ovr"].items())[:600]:
            if IKEY.match(k) and isinstance(v, dict):
                e = {}
                if v.get("n"):
                    e["n"] = jstr(v["n"])[:200]
                if num(v.get("d")):
                    e["d"] = max(0, min(999, num(v["d"])))
                if e:
                    ov[k] = e
        o["ovr"] = ov
    if isinstance(x.get("phase"), dict):   # Leistung in andere Gruppe (Phase)
        o["phase"] = {k: jstr(v)[:40] for k, v in list(x["phase"].items())[:600] if IKEY.match(k) and AKEY.match(jstr(v))}
    if "order" in x:   # Reihenfolge der Leistungen
        o["order"] = _ids(x["order"])
    if "hidden" in x:
        o["hidden"] = bool(x.get("hidden"))
    if "ord" in x and num(x.get("ord")) is not None:
        o["ord"] = num(x.get("ord"))
    if own:
        if not AKEY.match(jstr(x.get("k"))) or not AKEY.match(jstr(x.get("base"))):
            return None
        o["k"], o["base"] = x["k"], x["base"]
        o.setdefault("n", "Eigener Gebäudetyp")
    return o


def clean_assistcfg(b):
    if not isinstance(b, dict):
        return None
    out = {"v": 1, "profiles": {}, "own": [], "choices": {}}
    for k, v in list((b.get("profiles") or {}).items())[:60] if isinstance(b.get("profiles"), dict) else []:
        if AKEY.match(k):
            pv = clean_prof(v)
            if pv:
                out["profiles"][k] = pv
    seen = set()
    for v in (b.get("own") if isinstance(b.get("own"), list) else [])[:40]:
        pv = clean_prof(v, own=True)
        if pv and pv["k"] not in seen:
            seen.add(pv["k"]); out["own"].append(pv)
    for gk, v in list((b.get("choices") or {}).items())[:60] if isinstance(b.get("choices"), dict) else []:
        if not AKEY.match(gk) or not isinstance(v, dict):
            continue
        e = {}
        if v.get("n"):
            e["n"] = jstr(v["n"])[:80]
        opts = {}
        for ok, ov in list((v.get("opts") or {}).items())[:40] if isinstance(v.get("opts"), dict) else []:
            if AKEY.match(ok) and isinstance(ov, dict):
                x = {}
                if ov.get("n"):
                    x["n"] = jstr(ov["n"])[:120]
                if "on" in ov:
                    x["on"] = _ids(ov["on"], 80)
                if "hidden" in ov:
                    x["hidden"] = bool(ov["hidden"])
                if x:
                    opts[ok] = x
        if opts:
            e["opts"] = opts
        own = []
        for ov in (v.get("own") if isinstance(v.get("own"), list) else [])[:20]:
            if isinstance(ov, dict) and AKEY.match(jstr(ov.get("k"))):
                own.append({"k": ov["k"], "n": jstr(ov.get("n") or "Eigene Ausführung")[:120], "on": _ids(ov.get("on"), 80)})
        if own:
            e["own"] = own
        if e:
            out["choices"][gk] = e
    return out if len(json.dumps(out)) < 600000 else None


@app.route("/api/assistcfg", methods=["GET", "PUT"])
def assistcfg():
    with db.tx() as c:
        if request.method == "GET":
            v = store_get(c, "assistcfg", {})
            return jsonify(v if isinstance(v, dict) else {})
        v = clean_assistcfg(body())
        if v is None:
            return jsonify(error="Ungültige Einrichtung"), 400
        store_put(c, "assistcfg", v, uname())
        return jsonify(v)


@app.route("/api/assistcfg/vorlagen", methods=["GET", "POST"])
@app.route("/api/assistcfg/vorlagen/<pid>", methods=["DELETE"])
def assistcfg_vorlagen(pid=None):
    """Benannte Stände der Einrichtung – speichern, später wieder laden."""
    if pid is not None and not ID_OK.match(pid):
        return jsonify(error="Ungültige ID"), 400
    with db.tx() as c:
        c.execute("SELECT pg_advisory_xact_lock(hashtext('gantt:assistcfg'))")
        lst = store_get(c, "assistcfg_vorlagen", [])
        lst = lst if isinstance(lst, list) else []
        if request.method == "GET":
            return jsonify(lst)
        if request.method == "DELETE":
            lst = [x for x in lst if x.get("id") != pid]
            store_put(c, "assistcfg_vorlagen", lst, uname())
            return jsonify(ok=True)
        b = body() or {}
        data = clean_assistcfg(b.get("data"))
        if data is None:
            return jsonify(error="Ungültige Einrichtung"), 400
        name = jstr(b.get("name")).strip()[:120] or "Einrichtung"
        lst = [x for x in lst if x.get("name") != name][:49]   # gleicher Name = überschreiben
        pr = {"id": new_id(), "name": name, "data": data, "created": now_iso(), "by": uname()}
        lst.insert(0, pr)
        store_put(c, "assistcfg_vorlagen", lst, uname())
        return jsonify(pr), 201


# ---- Firmen-Adressbuch = Kontakte des Bautagebuchs
FIRM_FIELDS = ["name", "contact", "phone", "mobile", "mail", "address", "note"]
ZIPRX = re.compile(r"^(\d{4,5})\s+(.*)$")


def compose_address(street, zip_, city):
    tail = f"{zip_ or ''} {city or ''}".strip()
    return ", ".join(x for x in ((street or "").strip(), tail) if x)


def parse_address(s):
    s = (s or "").strip()
    if not s:
        return "", "", ""
    parts = [x.strip() for x in re.split(r",|\n", s) if x.strip()]
    if len(parts) >= 2:
        m = ZIPRX.match(parts[-1])
        if m:
            return ", ".join(parts[:-1]), m.group(1), m.group(2)
        return ", ".join(parts[:-1]), "", parts[-1]
    m = ZIPRX.match(parts[0])
    return ("", m.group(1), m.group(2)) if m else (parts[0], "", "")


def split_trades(t):
    return [x.strip() for x in re.split(r"[,;]", t or "") if x.strip()][:30]


def firm_of(r):
    try:
        ex = json.loads(r["extra"] or "{}")
    except ValueError:
        ex = {}
    return {"id": ex.get("gid") or f"c{r['id']}", "gewerke": split_trades(r["trade"]), "name": r["name"], "contact": r["contact_person"],
            "phone": r["phone"], "mobile": r["mobile"], "mail": r["email"], "address": compose_address(r["street"], r["zip"], r["city"]),
            "note": r["notes"], "cid": r["id"]}


def site_contact_ids(c):
    """Kontakte, die Baustellenadressen sind (im Bautagebuch beim Projekt „in die Kontakte gespeichert“, Gewerk „Baustelle“).
    Das sind keine Firmen – im Bauzeitenplan (Firmenauswahl, Adressbuch) nicht anzeigen."""
    ids = set()
    for r in c.execute("SELECT extra FROM projects"):
        try:
            ex = r["extra"] if isinstance(r["extra"], dict) else json.loads(r["extra"] or "{}")
            if ex.get("contact_id"):
                ids.add(int(ex["contact_id"]))
        except (ValueError, TypeError):
            pass
    return ids


def is_site(r, site_ids):
    return r["id"] in site_ids or any(t.lower() in ("baustelle", "bauvorhaben") for t in split_trades(r["trade"]))


def all_firms(c):
    site = site_contact_ids(c)
    return [firm_of(r) for r in c.execute("SELECT * FROM contacts ORDER BY name") if not is_site(r, site)]


def clean_firm(f):
    f = f if isinstance(f, dict) else {}
    o = {"id": f["id"] if re.fullmatch(r"[a-z0-9-]{1,40}", jstr(f.get("id"))) else new_id(),
         "gewerke": [jstr(x)[:100] for x in (f.get("gewerke") if isinstance(f.get("gewerke"), list) else [])][:30]}
    for k in FIRM_FIELDS:
        o[k] = jstr(f.get(k))[:2000 if k in ("note", "address") else 200]
    return o


def save_firm(c, f, by_id, legacy=False):
    """Firma aus der Gantt-App in die Kontakte übernehmen (neu oder ändern). Felder, die die Gantt-App nicht kennt
    (Internetadresse, Funktion …), bleiben erhalten. Gibt die Kontakt-ID zurück oder None (ohne Namen)."""
    name = " ".join(f["name"].split())
    cur = by_id.get(f["id"])
    merge = cur is None   # über den Namen gefunden → bestehenden Kontakt nur ergänzen, nie überschreiben
    if cur is None and name:
        cur = c.execute("SELECT * FROM contacts WHERE name=?", (name,)).fetchone()   # citext: Groß-/Kleinschreibung egal
        if cur is not None and json.loads(cur["extra"] or "{}").get("gid") not in (None, f["id"]):
            # gleichnamige, aber andere Firma aus der Gantt-App (z. B. zweimal „Neue Firma“) → eigener Kontakt mit Zusatz
            k = 2
            while c.execute("SELECT 1 FROM contacts WHERE name=?", (f"{name} ({k})",)).fetchone():
                k += 1
            name, cur = f"{name} ({k})", None
    if cur is None:
        if not name:
            return None
        st, z, ci = parse_address(f["address"])
        extra = {} if re.fullmatch(r"c\d+", f["id"]) else {"gid": f["id"]}
        ts = datetime.now().isoformat(timespec="seconds")
        return c.execute("INSERT INTO contacts(name, trade, contact_person, phone, mobile, email, street, zip, city, notes, extra, created, updated) "
                         "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id",
                         (name, ", ".join(f["gewerke"]), f["contact"], f["phone"], f["mobile"], f["mail"], st, z, ci, f["note"],
                          json.dumps(extra), ts, ts)).fetchone()[0]
    old = firm_of(cur)
    sets = {}
    if merge:
        gw = old["gewerke"] + [x for x in f["gewerke"] if x.lower() not in {y.lower() for y in old["gewerke"]}]
        if gw != old["gewerke"]:
            sets["trade"] = ", ".join(gw[:30])
        for k, col in (("contact", "contact_person"), ("phone", "phone"), ("mobile", "mobile"), ("mail", "email"), ("note", "notes")):
            if f[k] and not old[k]:
                sets[col] = f[k]
        if f["address"] and not old["address"]:
            sets["street"], sets["zip"], sets["city"] = parse_address(f["address"])
        if legacy and not re.fullmatch(r"c\d+", f["id"]) and not json.loads(cur["extra"] or "{}").get("gid"):   # nur bei der Übernahme: alte Verweise in den Plänen
            ex = json.loads(cur["extra"] or "{}")
            ex["gid"] = f["id"]
            sets["extra"] = json.dumps(ex)
    elif name and name != cur["name"]:
        sets["name"] = name
    if not merge and f["gewerke"] != old["gewerke"]:
        sets["trade"] = ", ".join(f["gewerke"])
    for k, col in (("contact", "contact_person"), ("phone", "phone"), ("mobile", "mobile"), ("mail", "email"), ("note", "notes")):
        if not merge and f[k] != old[k]:
            sets[col] = f[k]
    if not merge and f["address"] != old["address"]:
        sets["street"], sets["zip"], sets["city"] = parse_address(f["address"])
    if not merge and f["id"] != old["id"] and not re.fullmatch(r"c\d+", f["id"]):   # Gantt-ID merken (Verweise in den Plänen bleiben gültig)
        ex = json.loads(cur["extra"] or "{}")
        ex["gid"] = f["id"]
        sets["extra"] = json.dumps(ex)
    if sets:
        sets["updated"] = datetime.now().isoformat(timespec="seconds")
        try:
            with c.savepoint():
                c.execute(f"UPDATE contacts SET {', '.join(k + '=?' for k in sets)} WHERE id=?", list(sets.values()) + [cur["id"]])
        except db.IntegrityError:   # Name gibt es schon bei einem anderen Kontakt → Namen nicht ändern
            sets.pop("name", None)
            if len(sets) > 1:
                c.execute(f"UPDATE contacts SET {', '.join(k + '=?' for k in sets)} WHERE id=?", list(sets.values()) + [cur["id"]])
    return cur["id"]


@app.route("/api/firms", methods=["GET", "PUT"])
def firms():
    with db.tx() as c:
        if request.method == "GET":
            return jsonify(all_firms(c))
        b = body()
        lst, deleted = (b, []) if isinstance(b, list) else ((b or {}).get("firms"), (b or {}).get("deleted") or [])
        if not isinstance(lst, list) or len(lst) > 5000 or not isinstance(deleted, list):
            return jsonify(error="Ungültige Liste"), 400
        c.execute("SELECT pg_advisory_xact_lock(hashtext('gantt:firms'))")
        by_id = {firm_of(r)["id"]: r for r in c.execute("SELECT * FROM contacts")}
        for f in map(clean_firm, lst):
            cid = save_firm(c, f, by_id)
            if cid is not None:
                by_id[f["id"]] = c.execute("SELECT * FROM contacts WHERE id=?", (cid,)).fetchone()
        kept = []
        ids_in_list = {clean_firm(f)["id"] for f in lst}
        for d in deleted:   # nur ausdrücklich gelöschte Firmen entfernen – nie Kontakte, die jemand anderes gerade angelegt hat
            d = jstr(d)
            r = by_id.get(d)
            if r is None or d in ids_in_list:
                continue
            if shared_contacts.usage(c, r["id"]):
                kept.append(r["name"])   # noch verwendet (Bautagebuch, Baustelle, anderer Bauzeitenplan) → bleibt
                continue
            papierkorb.ablegen(c, "contacts", r["id"], "Kontakt", r["name"], uname(), "", "adressen")   # wiederherstellbar
        resp = jsonify(all_firms(c))
        if kept:
            resp.headers["X-Kept"] = quote(", ".join(kept))
        return resp


# ---- Leistungskatalog, Abschnitte, Firmen-Vorgaben
PHASE_KEY = re.compile(r"^[a-z0-9_]{1,40}$")


def str_arr(a, n=40):
    return [s for s in (jstr(x)[:60] for x in (a if isinstance(a, list) else [])) if s][:n]


def clean_lib(x):
    x = x if isinstance(x, dict) else {}
    o = {"id": x["id"] if re.fullmatch(r"L[a-z0-9]{1,40}", jstr(x.get("id")), re.I) else "L" + new_id()}
    o["n"] = jstr(x.get("n"))[:200] or "Leistung"
    o["ph"] = x["ph"] if PHASE_KEY.match(jstr(x.get("ph") or "")) else "ausbau"
    for k in ("gw", "din", "craft", "firm", "src", "from"):
        o[k] = jstr(x.get(k))[:200]
    o["info"] = jstr(x.get("info"))[:2000]
    o["sc"] = "bau" if x.get("sc") == "bau" else "we"
    d = num(x.get("d"))
    o["d"] = max(1, min(999, (jround(d) if d else 0) or 1))
    o["a"], o["b"], o["rec"] = str_arr(x.get("a")), str_arr(x.get("b")), str_arr(x.get("rec"), 20)
    return o


def lib_sources(c):
    """Leistungen aus allen (sichtbaren) Plänen, die nicht aus dem Standardkatalog stammen."""
    out = []
    vis = visible_bt(c, g.user)
    for r in c.execute("SELECT data, updated, project_id FROM gantt_projects"):
        if vis is not None and r["project_id"] is not None and r["project_id"] not in vis:
            continue
        try:
            p = json.loads(r["data"])
        except ValueError:
            continue
        T = p.get("tasks") or []
        cus = {x.get("id"): x for x in ((p.get("assist") or {}).get("custom") or []) if isinstance(x, dict)}
        items, ph_at = [], []
        for i, t in enumerate(T):
            lvl = t.get("lvl") or 0
            ph_at = (ph_at + [None] * (lvl + 1))[:lvl + 1]
            if t.get("cat") == "_grp":
                ph_at[lvl] = t.get("ph")
                continue
            summ = i + 1 < len(T) and (T[i + 1].get("lvl") or 0) > lvl
            if summ or (t.get("cat") and t["cat"][0] == "_"):
                continue
            cc = cus.get(t["cat"]) if t.get("cat") else None
            if t.get("cat") and not cc:
                continue
            if not ((t.get("dur") or 0) > 0):
                continue
            ph = (cc and cc.get("ph")) or next((x for x in reversed(ph_at) if x), "") or ""
            items.append({"n": t.get("name"), "gw": t.get("gw") or (cc and cc.get("gw")) or "", "din": (cc and cc.get("din")) or "",
                          "d": t.get("dur"), "ph": ph, "sc": (cc and cc.get("sc")) or "we"})
        seen, uniq = set(), []
        for x in items:
            k = f"{x['n']}|{x['gw']}"
            if k not in seen:
                seen.add(k)
                uniq.append(x)
        if uniq:
            out.append({"id": p.get("id"), "name": p.get("name"), "updated": r["updated"], "items": uniq})
    return sorted(out, key=lambda x: x["updated"] or "", reverse=True)


@app.route("/api/library", methods=["GET", "PUT"])
@app.get("/api/library/<sub>")
def library(sub=None):
    with db.tx() as c:
        if sub == "sources":
            return jsonify(lib_sources(c))
        if sub:
            return jsonify(error="Nicht gefunden"), 404
        if request.method == "GET":
            v = store_get(c, "library", [])
            return jsonify(v if isinstance(v, list) else [])
        if not katalog_darf():
            return jsonify(error="Den Leistungskatalog für alle Projekte (Leistungen, Abschnitte, Firmen- und Bezugsvorgaben) darfst du nicht ändern – das stellt die Verwaltung je Rolle ein."), 403
        b = body()
        if not isinstance(b, list) or len(b) > 5000:
            return jsonify(error="Ungültige Liste"), 400
        lst = [clean_lib(x) for x in b]
        store_put(c, "library", lst, uname())
        return jsonify(lst)


@app.route("/api/phases", methods=["GET", "PUT"])
def phases():
    with db.tx() as c:
        if request.method == "GET":
            v = store_get(c, "phases", [])
            return jsonify(v if isinstance(v, list) else [])
        if not katalog_darf():
            return jsonify(error="Den Leistungskatalog für alle Projekte (Leistungen, Abschnitte, Firmen- und Bezugsvorgaben) darfst du nicht ändern – das stellt die Verwaltung je Rolle ein."), 403
        b = body()
        if not isinstance(b, list) or len(b) > 200:
            return jsonify(error="Ungültige Liste"), 400
        seen, lst = set(), []
        for x in b:
            k = jstr((x or {}).get("k") if isinstance(x, dict) else "")
            if not PHASE_KEY.match(k) or k in seen:
                continue
            seen.add(k)
            lst.append({"k": k, "n": jstr(x.get("n") or k)[:120], "own": truthy(x.get("own"))})
        store_put(c, "phases", lst, uname())
        return jsonify(lst)


@app.route("/api/catfirms", methods=["GET", "PUT"])
def catfirms():
    with db.tx() as c:
        if request.method == "GET":
            v = store_get(c, "catfirms", {})
            return jsonify(v if isinstance(v, dict) else {})
        if not katalog_darf():
            return jsonify(error="Den Leistungskatalog für alle Projekte (Leistungen, Abschnitte, Firmen- und Bezugsvorgaben) darfst du nicht ändern – das stellt die Verwaltung je Rolle ein."), 403
        b = body()
        if not isinstance(b, dict):
            return jsonify(error="Ungültig"), 400
        o = {k: jstr(v)[:200] for k, v in list(b.items())[:5000] if re.fullmatch(r"[\w~.-]{1,60}", k) and truthy(v)}
        store_put(c, "catfirms", o, uname())
        return jsonify(o)


@app.route("/api/catscope", methods=["GET", "PUT"])
def catscope():
    """Bezug (Gebäude / je Einheit) abweichend vom Standardkatalog – Vorgabe für neue Planungen."""
    with db.tx() as c:
        if request.method == "GET":
            v = store_get(c, "catscope", {})
            return jsonify(v if isinstance(v, dict) else {})
        if not katalog_darf():
            return jsonify(error="Den Leistungskatalog für alle Projekte (Leistungen, Abschnitte, Firmen- und Bezugsvorgaben) darfst du nicht ändern – das stellt die Verwaltung je Rolle ein."), 403
        b = body()
        if not isinstance(b, dict):
            return jsonify(error="Ungültig"), 400
        o = {k: v for k, v in list(b.items())[:5000] if re.fullmatch(r"[\w~.-]{1,60}", k) and v in ("bau", "we")}
        store_put(c, "catscope", o, uname())
        return jsonify(o)


# ---- Programmeinstellungen und KI-Vorschläge
AI_MODELS = {"claude-haiku-5-5": "Claude Haiku 5.5 – schnell, günstig", "claude-sonnet-5-5": "Claude Sonnet 5.5 – genauer",
             "claude-opus-5-5": "Claude Opus 5.5 – am gründlichsten"}


def ai_conf(c):
    a = (store_get(c, "settings", {}) or {}).get("ai") or {}
    key = a.get("key") or os.environ.get("ANTHROPIC_API_KEY", "")
    return {"mode": a.get("mode") if a.get("mode") in ("off", "builtin", "ai") else "builtin",
            "model": a.get("model") if a.get("model") in AI_MODELS else "claude-haiku-5-5", "key": key,
            "fromEnv": not a.get("key") and bool(os.environ.get("ANTHROPIC_API_KEY"))}


def ai_public(c):
    k = ai_conf(c)   # der Schlüssel verlässt den Server nie
    return {"mode": k["mode"], "model": k["model"], "models": AI_MODELS, "hasKey": bool(k["key"]),
            "keyHint": "…" + k["key"][-4:] if k["key"] else "", "fromEnv": k["fromEnv"]}


@app.route("/api/settings", methods=["GET", "PUT"])
def settings():
    with db.tx() as c:
        if request.method == "GET":
            return jsonify(ai=ai_public(c))
        if not g.user["is_admin"]:
            return jsonify(error="KI-Einstellungen ändert die Verwaltung (Einstellungen → KI)."), 403
        b = body()
        st = store_get(c, "settings", {}) or {}
        a = dict(st.get("ai") or {})
        if isinstance(b.get("ai"), dict):
            x = b["ai"]
            if x.get("mode") in ("off", "builtin", "ai"):
                a["mode"] = x["mode"]
            if x.get("model") in AI_MODELS:
                a["model"] = x["model"]
            if x.get("clearKey"):
                a.pop("key", None)
            elif isinstance(x.get("key"), str) and x["key"].strip():
                a["key"] = x["key"].strip()[:300]
        st["ai"] = a
        store_put(c, "settings", st, uname())
        return jsonify(ai=ai_public(c))


class AIError(Exception):
    pass


def call_claude(k, system, user, max_tokens=700, tool=None):
    base = os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
    payload = {"model": k["model"], "max_tokens": max_tokens, "system": system, "messages": [{"role": "user", "content": user}]}
    if tool:
        payload.update(tools=[tool], tool_choice={"type": "tool", "name": tool["name"]})
    req = urllib.request.Request(base + "/v1/messages", data=json.dumps(payload).encode(), method="POST",
                                 headers={"content-type": "application/json", "x-api-key": k["key"], "anthropic-version": "2023-06-01"})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            d = json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            d = json.loads(e.read().decode() or "{}")
        except ValueError:
            d = {}
        msg = (d.get("error") or {}).get("message") or e.reason
        raise AIError("API-Schlüssel ungültig" if e.code == 401 else "Modell nicht verfügbar: " + k["model"] if e.code == 404
                      else "Zu viele Anfragen oder Guthaben aufgebraucht" if e.code == 429 else f"KI-Fehler {e.code}: {msg}")
    except TimeoutError:
        raise AIError("Zeitüberschreitung bei der KI")
    except urllib.error.URLError as e:
        raise AIError("KI nicht erreichbar: " + str(e.reason))
    if tool:
        u = next((x for x in d.get("content") or [] if x.get("type") == "tool_use"), None)
        if u and u.get("input"):
            return u["input"]
    return "".join(x.get("text", "") for x in d.get("content") or [] if x.get("type") == "text")


PLACE_SYS = """Du bist erfahrener Bauleiter und Terminplaner im deutschen Hochbau (Neubau, Sanierung, Umbau).
Du ordnest eine neue Bauleistung in einen Bauzeitenplan ein. Du erhältst die Abschnitte (Reihenfolge) und die vorhandenen Leistungen mit ID, Abschnitt, Gewerk und Bezeichnung.
Antworte ausschließlich über das Werkzeug „leistung_einordnen“.
Regeln: "a" und "b" enthalten nur IDs aus der Liste, je höchstens zwei, "b" darf leer sein. sc "we" = je Wohnung/Einheit, "bau" = einmal für das Gebäude. Begründung auf Deutsch, fachlich, höchstens 25 Wörter."""
PLACE_TOOL = {
    "name": "leistung_einordnen",
    "description": "Ordnet eine neue Bauleistung in den Bauzeitenplan ein.",
    "input_schema": {
        "type": "object",
        "properties": {
            "ph": {"type": "string", "description": "Schlüssel des Abschnitts aus der Liste"},
            "gw": {"type": "string", "description": "Gewerk, möglichst eines der vorhandenen"},
            "din": {"type": "string", "description": "ATV DIN-Nummer nach VOB/C, z. B. 18382, oder leer"},
            "sc": {"type": "string", "enum": ["we", "bau"], "description": "we = je Wohnung/Einheit, bau = einmal für das Gebäude"},
            "d": {"type": "integer", "description": "Dauer in Arbeitstagen"},
            "a": {"type": "array", "items": {"type": "string"}, "description": "IDs der Leistungen, auf die sie folgt (höchstens 2)"},
            "b": {"type": "array", "items": {"type": "string"}, "description": "IDs der Leistungen, vor denen sie fertig sein muss (höchstens 2, darf leer sein)"},
            "craft": {"type": "string", "description": "übliche Unternehmerbezeichnung, z. B. Fliesenleger"},
            "why": {"type": "string", "description": "ein kurzer Satz Begründung auf Deutsch, höchstens 25 Wörter"},
        },
        "required": ["ph", "gw", "sc", "d", "a", "b", "why"],
    },
}


@app.post("/api/ai/place")
def ai_place():
    with db.tx() as c:
        k = ai_conf(c)
        aus = bpai.abgeschaltet(c)
    b = body()
    if (jstr(b.get("provider") or "") or "claude") in aus:   # vom Administrator abgeschaltet (ohne Angabe = Claude)
        return jsonify(error=bpai.AUS_TEXT), 400
    if not k["key"] and jstr(b.get("provider") or "") not in ("ollama", "gemini", "chatgpt"):
        return jsonify(error="Kein API-Schlüssel hinterlegt (Programmeinstellungen)."), 400
    text = jstr(b.get("text") or "")[:300]
    if len(text.strip()) < 3:
        return jsonify(error="Bezeichnung fehlt"), 400
    phs = "\n".join(f"{jstr(p.get('k'))[:40]} = {jstr(p.get('n'))[:80]}" for p in (b.get("phases") if isinstance(b.get("phases"), list) else [])[:60] if isinstance(p, dict))
    its = "\n".join(" | ".join(jstr(i.get(x) or "")[:90] for x in ("id", "ph", "gw", "n")) for i in (b.get("items") if isinstance(b.get("items"), list) else [])[:400] if isinstance(i, dict))
    user = (f"Gebäudetyp: {jstr(b.get('type') or 'unbekannt')[:60]}\nAbschnitt, in dem die Nutzer:in gerade arbeitet: {jstr(b.get('ph') or '–')[:40]}\n\n"
            f"Abschnitte (Schlüssel = Name, in Bauablauf-Reihenfolge):\n{phs}\n\nVorhandene Leistungen (ID | Abschnitt | Gewerk | Bezeichnung):\n{its}\n\nNeue Leistung: \"{text}\"")
    prov = jstr(b.get("provider") or "")
    if prov in ("ollama", "gemini", "chatgpt"):   # Auswahl in der Kopfleiste: anderer Anbieter, Antwort als JSON
        sys_json = PLACE_SYS.replace("Antworte ausschließlich über das Werkzeug „leistung_einordnen“.",
                                     "Antworte ausschließlich mit einem JSON-Objekt mit den Feldern ph, gw, din, sc, d, a, b, craft, why.")
        try:
            with db.tx() as c:
                out = bpai.ask_json(prov, sys_json, user, 700, c)
            return jsonify({**out, "model": prov})
        except bpai.AIError as e:
            return jsonify(error=str(e)), 502
    try:
        out = call_claude(k, PLACE_SYS, user, 1024, PLACE_TOOL)
        if isinstance(out, str):
            m = re.search(r"\{[\s\S]*\}", out)
            try:
                out = json.loads(m.group(0)) if m else None
            except ValueError:
                out = None
            if not out:
                raise AIError("Antwort der KI nicht lesbar")
        return jsonify({**out, "model": k["model"]})
    except AIError as e:
        return jsonify(error=str(e)), 502


@app.post("/api/ai/test")
def ai_test():
    try:
        b = body()
    except Exception:   # kein/kaputter JSON-Body: mit leeren Angaben testen
        b = {}
    with db.tx() as c:
        k = dict(ai_conf(c))
    if isinstance(b.get("key"), str) and b["key"].strip():
        k["key"] = b["key"].strip()
    if b.get("model") in AI_MODELS:
        k["model"] = b["model"]
    if not k["key"]:
        return jsonify(error="Kein API-Schlüssel eingegeben."), 400
    try:
        t = call_claude(k, "Antworte nur mit dem Wort OK.", "Test", 10)
        return jsonify(ok=True, model=k["model"], answer=t.strip()[:20])
    except AIError as e:
        return jsonify(error=str(e)), 502


# ---------------------------------------------------------------- Links zum Ansehen (links.py)
import links as _links   # noqa: E402
_links.einbinden(app, row_of=row_of, project_or_error=_project_or_error, can_see=can_see, body=body, jstr=jstr, truthy=truthy,
                 now_iso=now_iso, uname=uname, pub=PUB)


# ---------------------------------------------------------------- Leistungskatalog sichern (katalog.py)
import katalog as _katalog   # noqa: E402
_katalog.einbinden(app, store_get=store_get, store_put=store_put, store_put_roh=_store_put, all_firms=all_firms, clean_firm=clean_firm, save_firm=save_firm,
                   firm_of=firm_of, uname=uname, body=body, clean_lib=clean_lib, phase_key=PHASE_KEY)


# ---------------------------------------------------------------- Oberfläche
STAMP = re.compile(r'(src|href)="([\w.-]+\.(?:js|css))"')


@app.get("/")
@app.get("/<path:rel>")
def static_files(rel="index.html"):
    if rel.startswith("api/"):
        return jsonify(error="Nicht gefunden"), 404
    full = os.path.normpath(os.path.join(PUB, rel))
    if not full.startswith(PUB + os.sep) or not os.path.isfile(full):
        return "Nicht gefunden", 404, {"Content-Type": "text/plain; charset=utf-8"}
    if full.endswith(".html"):
        # Versionsstempel an Skripte und Stylesheets: nach einem Update lädt jeder Browser die neuen Dateien
        def stamp(m):
            try:
                v = format(int(os.stat(os.path.join(os.path.dirname(full), m.group(2))).st_mtime * 1000), "x")
            except OSError:
                return m.group(0)
            return f'{m.group(1)}="{m.group(2)}?v={v}"'
        html = STAMP.sub(stamp, open(full, encoding="utf-8").read())
        return html, 200, {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store"}
    resp = send_from_directory(PUB, rel, max_age=0)
    resp.headers["Cache-Control"] = "no-cache"
    return resp


# ---------------------------------------------------------------- Start: Übernahme alter Daten / Beispiele
def _sample_project():
    start = monday_of_this_week() - 7

    def t(uid, name, dur, lvl, preds=(), res="", pct=0):
        return {"uid": uid, "name": name, "dur": dur, "lvl": lvl, "res": res, "pct": pct, "cons": None, "notes": "", "collapsed": False,
                "preds": [{"uid": p, "type": "FS", "lag": 0} if isinstance(p, int) else p for p in preds]}
    tasks = [t(1, "Projektstart", 0, 0, [], "", 100), t(2, "Konzeption", 0, 0), t(3, "Anforderungsworkshop", 2, 1, [1], "Anna", 100),
             t(4, "Zielgruppenanalyse", 3, 1, [3], "Ben", 100), t(5, "Sitemap & Wireframes", 4, 1, [4], "Clara", 40),
             t(6, "Konzept abgenommen", 0, 1, [5]), t(7, "Design", 0, 0), t(8, "Moodboard", 2, 1, [6], "Clara"),
             t(9, "Screendesign Desktop", 5, 1, [8], "Clara"), t(10, "Screendesign Mobile", 3, 1, [{"uid": 9, "type": "SS", "lag": 2}], "Clara; Ben"),
             t(11, "Design-Freigabe", 0, 1, [9, 10]), t(12, "Umsetzung", 0, 0), t(13, "CMS-Setup", 3, 1, [6], "David"),
             t(14, "Template-Entwicklung", 8, 1, [11, 13], "David; Ben"), t(15, "Content-Migration", 6, 1, [13], "Anna"),
             t(16, "Testing & QA", 4, 1, [14, 15], "Ben"), t(17, "Go-Live", 0, 0, [16])]
    return {"id": new_id(), "name": "Website-Relaunch (Beispiel)", "start": start, "nextUid": 18, "tasks": tasks}


SPECIAL = {"presets.json", "firms.json", "library.json", "catfirms.json", "phases.json", "settings.json"}


def _read_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return default


def import_legacy(c, src):
    """Daten der früheren Gantt-App (JSON-Dateien) in die Datenbank übernehmen. Die Dateien bleiben unverändert."""
    n = 0
    # Firmen zuerst: alte IDs bleiben als „gid“ am Kontakt, damit die Verweise in den Plänen gültig bleiben
    old = _read_json(os.path.join(src, "firms.json"), [])
    if isinstance(old, list):
        by_id = {firm_of(r)["id"]: r for r in c.execute("SELECT * FROM contacts")}
        for f in map(clean_firm, old):
            cid = save_firm(c, f, by_id, legacy=True)
            if cid is not None:
                by_id[f["id"]] = c.execute("SELECT * FROM contacts WHERE id=?", (cid,)).fetchone()
    for key, default in (("presets", []), ("library", []), ("catfirms", {}), ("phases", []), ("settings", {})):
        v = _read_json(os.path.join(src, key + ".json"))
        if v is not None:
            store_put(c, key, v, "Übernahme")
    for f in sorted(os.listdir(src)):
        if not f.endswith(".json") or f in SPECIAL:
            continue
        p = _read_json(os.path.join(src, f))
        if not isinstance(p, dict) or not ID_OK.match(jstr(p.get("id"))):
            continue
        if c.execute("SELECT 1 FROM gantt_projects WHERE id=?", (p["id"],)).fetchone():
            continue
        clean = sanitize(p, p["id"])
        upd = jstr(p.get("updated")) or now_iso()
        c.execute("INSERT INTO gantt_projects(id, name, data, rev, created, updated, updated_by) VALUES(?,?,?,1,?,?,?)",
                  (clean["id"], clean["name"], json.dumps(clean, ensure_ascii=False, separators=(",", ":")), upd, upd, "Übernahme"))
        n += 1
        vdir = os.path.join(src, "versions", p["id"])
        for v in _read_json(os.path.join(vdir, "index.json"), []) or []:
            if not isinstance(v, dict) or not ID_OK.match(jstr(v.get("id"))):
                continue
            data = _read_json(os.path.join(vdir, v["id"] + ".json"))
            if data is None:
                continue
            meta = {k: v.get(k) for k in ("name", "note", "auto", "n", "end", "start")}
            c.execute("INSERT INTO gantt_versions(id, gantt_id, meta, data, created, user_name) VALUES(?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING",
                      (v["id"], p["id"], json.dumps(meta, ensure_ascii=False), json.dumps(data, ensure_ascii=False), jstr(v.get("created")) or upd, ""))
    return n


def startup():
    db.wait_for_schema(SCHEMA, log=lambda m: print(m, flush=True))
    with db.tx() as c:
        c.execute("SELECT pg_advisory_xact_lock(hashtext('gantt:startup'))")   # mehrere Worker: nur einer übernimmt
        if store_get(c, "_init", None):
            return
        info = {"at": now_iso(), "imported": 0, "samples": 0}
        has_legacy = os.path.isdir(LEGACY) and any(f.endswith(".json") for f in os.listdir(LEGACY))
        if has_legacy:
            info["imported"] = import_legacy(c, LEGACY)
            print(f"Gantt: {info['imported']} Pläne aus {LEGACY} übernommen.", flush=True)
        if not c.execute("SELECT 1 FROM gantt_projects LIMIT 1").fetchone():
            sp = _sample_project()
            write_project(c, sanitize(sp, sp["id"]), "Beispiel", insert=True)
            info["samples"] += 1
            if os.path.isdir(SAMPLES):
                for f in sorted((x for x in os.listdir(SAMPLES) if x.endswith(".json")), reverse=True):
                    p = _read_json(os.path.join(SAMPLES, f))
                    if isinstance(p, dict):
                        write_project(c, sanitize(p, new_id()), "Beispiel", insert=True)
                        info["samples"] += 1
        store_put(c, "_init", info)


startup()
