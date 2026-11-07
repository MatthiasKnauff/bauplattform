"""Auditprotokoll: jede ändernde Anfrage wird mit Benutzer, Zeit, Aktion und Bezug (Projekt/Bericht) festgehalten.
Kennwörter und Zugangsdaten werden nie protokolliert (bei Einstellungen/Benutzern nur die Feldnamen)."""
import re
from . import db
from bpcore import fehler   # stille Fehler für die Verwaltung festhalten

KEEP = 100000
LABEL = {"weather": "Wetter", "precip": "Niederschlag", "temp": "Temperatur", "humidity": "Luftfeuchte", "wind": "Wind",
         "plz": "PLZ", "date": "Datum", "time": "Uhrzeit", "site_manager": "Bauleitung", "number": "Nummer", "text": "Text",
         "activity": "Tätigkeit", "headcount": "Anzahl", "done": "erledigt", "due": "Erinnerung", "due_time": "Erinnerungszeit",
         "caption": "Beschreibung", "name": "Name", "client": "Bauherrschaft", "street": "Straße", "zip": "PLZ", "city": "Ort",
         "folder": "Projektordner", "archived": "Archiv", "lat": "Standort", "lon": "Standort", "contact_id": "Kontakt",
         "email": "E-Mail", "accent": "Farbe", "extra": ""}
SECRET = re.compile(r"pass|pw|kenn|token", re.I)


def _short(v, n=60):
    s = " ".join(str(v if v is not None else "").split())
    return s if len(s) <= n else s[:n - 1] + "…"


def _one(c, sql, *a):
    r = c.execute(sql, a).fetchone()
    return dict(r) if r else None


def _proj(c, pid):
    r = _one(c, "SELECT id, name FROM projects WHERE id=?", pid)
    return (r["id"], r["name"]) if r else (None, "")


def _rep(c, rid):
    r = _one(c, "SELECT r.id, r.number, r.date, r.project_id FROM reports r WHERE r.id=?", rid)
    if not r:
        return None, "", None, ""
    pid, pn = _proj(c, r["project_id"])
    d = r["date"] or ""
    d = f"{d[8:10]}.{d[5:7]}.{d[:4]}" if len(d) == 10 else d
    return r["id"], f"Nr. {r['number']} · {d}", pid, pn


def pre(c, method, path):
    """Bezug einer Anfrage VOR der Ausführung ermitteln (danach sind gelöschte Zeilen weg)."""
    ctx = {"pid": None, "project": "", "report": "", "old": {}, "what": ""}
    if method in ("GET", "HEAD", "OPTIONS"):
        return ctx
    try:
        m = re.match(r"^/api/projects/(\d+)", path)
        if m:
            ctx["pid"], ctx["project"] = _proj(c, int(m.group(1)))
        m = re.match(r"^/api/reports/(\d+)", path)
        if m:
            _, ctx["report"], ctx["pid"], ctx["project"] = _rep(c, int(m.group(1)))
        m = re.match(r"^/api/(items|images)/(\d+)", path)
        if m:
            t = m.group(1)
            row = _one(c, f"SELECT * FROM {t} WHERE id=?", int(m.group(2)))
            if row:
                _, ctx["report"], ctx["pid"], ctx["project"] = _rep(c, row["report_id"])
                ctx["old"] = row
        m = re.match(r"^/api/(contacts|users)/(\d+)", path)
        if m:
            row = _one(c, f"SELECT * FROM {m.group(1)} WHERE id=?", int(m.group(2)))
            ctx["what"] = row["name"] if row else ""
    except Exception:   # nur Zusatzangaben fürs Protokoll – die Anfrage selbst läuft trotzdem
        pass
    return ctx


def _keys(body, skip=()):
    ks = [k for k in (body or {}) if k not in skip]
    out = []
    for k in ks:
        lab = LABEL.get(k, k)
        if lab and lab not in out:
            out.append(lab)
    return ", ".join(out)


def describe(c, method, path, body, status, ctx):
    """(cat, action, detail, project_id, project, report) oder None, wenn nichts zu protokollieren ist."""
    if method in ("GET", "HEAD", "OPTIONS") or status >= 400:
        return None
    b = body if isinstance(body, dict) else {}
    p, old = path.rstrip("/"), ctx.get("old") or {}
    R = lambda cat, act, det="": (cat, act, det, ctx["pid"], ctx["project"], ctx["report"])
    if re.fullmatch(r"/api/projects", p) and method == "POST":
        return ("inhalt", "Projekt angelegt", _short(b.get("name")), None, "", "")
    if re.fullmatch(r"/api/projects/\d+", p):
        if method == "DELETE":
            return R("inhalt", "Projekt gelöscht", ctx["project"])
        if method == "PUT":
            if "archived" in b:
                return R("inhalt", "Projekt archiviert" if b["archived"] else "Projekt aus dem Archiv geholt")
            return R("inhalt", "Projekt geändert", _keys(b, ("lat", "lon")) or "Standort")
    if re.fullmatch(r"/api/projects/\d+/reports", p) and method == "POST":
        return R("inhalt", "Bericht angelegt", _short(b.get("date")))
    if re.fullmatch(r"/api/reports/\d+", p):
        if method == "DELETE":
            return R("inhalt", "Bericht gelöscht")
        if method == "PUT":
            return R("inhalt", "Bericht geändert", _keys(b))
    if re.fullmatch(r"/api/reports/\d+/items", p) and method == "POST":
        return R("inhalt", "Eintrag hinzugefügt", f"{_kind(c, b.get('kind'))}: {_short(b.get('text'))}")
    if re.fullmatch(r"/api/items/\d+", p):
        k = _kind(c, old.get("kind"))
        if method == "DELETE":
            return R("inhalt", "Eintrag gelöscht", f"{k}: {_short(old.get('text'))}")
        if method == "PUT":
            det = _keys(b)
            if "text" in b and old.get("text") != b["text"]:
                det = f"{k}: „{_short(old.get('text'), 40)}“ → „{_short(b['text'], 40)}“"
            else:
                det = f"{k}: {_short(old.get('text'), 40)} ({det})"
            return R("inhalt", "Eintrag geändert", det)
    if p == "/api/items/restore":
        return R("inhalt", "Eintrag wiederhergestellt", _short(b.get("text")))
    if re.fullmatch(r"/api/reports/\d+/images", p) and method == "POST":
        return R("inhalt", "Foto(s) hinzugefügt")
    if re.fullmatch(r"/api/images/\d+", p):
        if method == "DELETE":
            return R("inhalt", "Foto gelöscht", _short(old.get("caption") or old.get("file")))
        if method == "PUT":
            return R("inhalt", "Foto geändert", f"„{_short(old.get('caption'), 30)}“ → „{_short(b.get('caption'), 30)}“" if "caption" in b else _keys(b))
    if re.fullmatch(r"/api/versions/\d+/restore", p):
        return R("inhalt", "Bericht auf frühere Version zurückgesetzt", f"Version {p.split('/')[3]}")
    if re.fullmatch(r"/api/contacts(/\d+)?", p):
        act = {"POST": "Kontakt angelegt", "PUT": "Kontakt geändert", "DELETE": "Kontakt gelöscht"}[method]
        return ("inhalt", act, ctx.get("what") or _short(b.get("name")) + (" (" + _keys(b) + ")" if method == "PUT" else ""), None, "", "")
    m = re.fullmatch(r"/api/users/(\d+)/access", p)
    if m:
        return ("konto", "Zugangsdaten per E-Mail gesendet", ctx.get("what") or "", None, "", "")
    if re.fullmatch(r"/api/users(/\d+)?", p):
        act = {"POST": "Benutzer angelegt", "PUT": "Benutzer geändert", "DELETE": "Benutzer gelöscht"}[method]
        return ("konto", act, (ctx.get("what") or _short(b.get("name"))) + (" (" + _keys(b) + ")" if method == "PUT" and b else ""), None, "", "")
    if p == "/api/backups" and method == "POST":
        return ("konto", "Datenbankversion angelegt", "", None, "", "")
    m = re.fullmatch(r"/api/backups/([^/]+)(/restore)?", p)
    if m:
        return ("konto", "Datenbank wiederhergestellt" if m.group(2) else "Datenbankversion gelöscht", m.group(1), None, "", "")
    if p == "/api/password":
        return ("konto", "Kennwort geändert", "", None, "", "")
    if p == "/api/account":
        return ("konto", "Konto geändert", _keys(b), None, "", "")
    if p == "/api/settings" and method == "PUT":
        return ("konto", "Einstellungen geändert", ", ".join(k for k in b if not SECRET.search(k)) or "Zugangsdaten", None, "", "")
    if p in ("/api/logo",) and method in ("POST", "DELETE"):
        return ("konto", "Logo geändert" if method == "POST" else "Logo entfernt", "", None, "", "")
    if p.startswith("/api/store/") and method == "POST":
        return ("export", {"test": "Ablage getestet", "run": "Übertragung gestartet", "backfill": "Bestand nachgetragen"}.get(p.rsplit("/", 1)[1], "Ablage"), "", None, "", "")
    return None


def _kind(c, key):
    r = c.execute("SELECT title FROM sections WHERE key=?", (key,)).fetchone() if key else None
    return r["title"] if r else (key or "")


def log(c, user, cat, action, detail="", pid=None, project="", report=""):
    c.execute("INSERT INTO audit_log(ts, user_name, cat, action, detail, project_id, project, report) VALUES(?,?,?,?,?,?,?,?)",
              (db.now().replace("T", " "), user or "", cat, action, detail or "", pid, project or "", report or ""))
    if c.execute("SELECT COUNT(*) FROM audit_log").fetchone()[0] > KEEP + 500:
        c.execute("DELETE FROM audit_log WHERE id <= (SELECT MAX(id) FROM audit_log) - ?", (KEEP,))


def record(user, cat, action, detail="", pid=None, project="", report=""):
    """Eigenständig protokollieren (z. B. aus dem Hintergrund-Thread)."""
    try:
        with db.tx() as c:
            log(c, user, cat, action, detail, pid, project, report)
    except Exception as e:
        fehler.still("bautagebuch", "Auditprotokoll schreiben (Hintergrund)", e)
        pass
