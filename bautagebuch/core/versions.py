"""Versionsverlauf der Tagesberichte.

Eine Version ist eine Momentaufnahme (Bericht + Einträge + Foto-Verweise als JSON). Sie entsteht
 - automatisch, wenn ein Bericht verändert wurde und eine Minute Ruhe herrscht (nur bei echter Änderung),
 - bei jedem PDF-Export (mit PDF-Dateiname) und
 - vor einer Wiederherstellung (Sicherheitsstand).
Der Exportstatus ergibt sich aus dem Vergleich des aktuellen Stands mit der letzten Export-Version.
"""
import hashlib, json, re, threading, time
from . import db
from bpcore import fehler   # stille Fehler für die Verwaltung festhalten

IDLE = 60            # Sekunden Ruhe, bevor automatisch eine Version angelegt wird
KEEP_AUTO = 80       # so viele automatische Versionen je Bericht bleiben erhalten (Exporte nie gelöscht)
_dirty, _lock, _started = {}, threading.Lock(), False


def _clean(d):
    return {k: v for k, v in d.items() if k not in ("created", "updated")}


def capture(c, rid):
    rep = c.execute("SELECT * FROM reports WHERE id=?", (rid,)).fetchone()
    if not rep:
        return None
    return {"report": _clean(db.to_dict(rep)),
            "items": [_clean(db.to_dict(r)) for r in c.execute("SELECT * FROM items WHERE report_id=? ORDER BY id", (rid,))],
            "images": [{k: r[k] for k in ("id", "file", "caption", "item_id")}
                       for r in c.execute("SELECT * FROM images WHERE report_id=? ORDER BY id", (rid,))]}


def digest(data):
    return hashlib.sha1(json.dumps(data, sort_keys=True, default=str, ensure_ascii=False).encode()).hexdigest()


def snapshot(c, rid, reason="auto", user="", pdf_name=""):
    data = capture(c, rid)
    if data is None:
        return None
    h = digest(data)
    last = c.execute("SELECT id, hash, reason, pdf_name FROM report_versions WHERE report_id=? ORDER BY id DESC LIMIT 1", (rid,)).fetchone()
    if reason == "auto" and last and last["hash"] == h:
        return None
    if reason == "export" and last and last["hash"] == h and last["reason"] == "auto":
        c.execute("UPDATE report_versions SET reason='export', pdf_name=?, user_name=?, created=? WHERE id=?",
                  (pdf_name, user, db.now(), last["id"]))   # unveränderter Stand: die letzte Version wird zur Export-Version
        return last["id"]
    vid = c.execute("INSERT INTO report_versions(report_id, created, user_name, reason, pdf_name, hash, data) VALUES(?,?,?,?,?,?,?)",
                    (rid, db.now(), user, reason, pdf_name, h, json.dumps(data, default=str, ensure_ascii=False))).lastrowid
    c.execute("""DELETE FROM report_versions WHERE report_id=? AND reason IN ('auto','before_restore') AND id NOT IN
                 (SELECT id FROM report_versions WHERE report_id=? AND reason IN ('auto','before_restore') ORDER BY id DESC LIMIT ?)""",
              (rid, rid, KEEP_AUTO))
    return vid


def status(c, rid):
    """'never' (nie exportiert) | 'exported' (aktueller Stand = letzter Export) | 'changed' (seit dem Export geändert)"""
    ex = c.execute("SELECT id, created, pdf_name, hash, user_name FROM report_versions WHERE report_id=? AND reason='export' ORDER BY id DESC LIMIT 1", (rid,)).fetchone()
    if not ex:
        return "never", None
    data = capture(c, rid)
    st = "exported" if data is not None and digest(data) == ex["hash"] else "changed"
    return st, {"id": ex["id"], "created": ex["created"], "pdf_name": ex["pdf_name"], "user_name": ex["user_name"]}


def report_of(c, method, path, body):
    """Welcher Bericht wird durch diese Anfrage verändert? (None = keiner / unbekannt)"""
    if method in ("GET", "HEAD", "OPTIONS") or "/versions" in path:
        return None
    m = re.match(r"^/api/reports/(\d+)", path)
    if m:
        return int(m.group(1)) if method != "DELETE" or path.count("/") > 3 else None
    m = re.match(r"^/api/(items|images)/(\d+)", path)
    if m:
        r = c.execute(f"SELECT report_id FROM {m.group(1)} WHERE id=?", (int(m.group(2)),)).fetchone()
        return r["report_id"] if r else None
    if path == "/api/items/restore" and isinstance(body, dict):
        try:
            return int(body.get("report_id"))
        except (TypeError, ValueError):
            return None
    return None


def touch(rid, user):
    with _lock:
        _dirty[rid] = (time.time(), user)


def _sweep():
    now = time.time()
    with _lock:
        due = [(r, u) for r, (t, u) in _dirty.items() if now - t >= IDLE]
        for r, _ in due:
            _dirty.pop(r, None)
    for rid, user in due:
        try:
            with db.tx() as c:
                snapshot(c, rid, "auto", user)
        except Exception as e:
            fehler.still("bautagebuch", "Automatische Berichtsversion speichern", e)
            pass


def start():
    global _started
    if _started:
        return
    _started = True

    def loop():
        while True:
            time.sleep(20)
            _sweep()
    threading.Thread(target=loop, daemon=True).start()


def restore(c, vid, user):
    """Bericht (Kopfdaten + Einträge) auf eine Version zurücksetzen. Fotos bleiben, wie sie sind. Vorher Sicherheitsstand."""
    v = c.execute("SELECT * FROM report_versions WHERE id=?", (vid,)).fetchone()
    if not v:
        return None
    rid, snap = v["report_id"], json.loads(v["data"])
    snapshot(c, rid, "before_restore", user)
    rep = {k: x for k, x in snap["report"].items() if k not in ("id", "project_id", "number")}
    db.update(c, "reports", rid, rep)
    have = set(db.cols(c, "items"))
    keep = {i["id"] for i in snap["items"]}
    for r in c.execute("SELECT id FROM items WHERE report_id=?", (rid,)).fetchall():
        if r["id"] not in keep:
            c.execute("DELETE FROM items WHERE id=?", (r["id"],))
    for it in snap["items"]:
        vals = {k: (json.dumps(x) if isinstance(x, (dict, list)) else x) for k, x in it.items() if k in have}
        if vals.get("contact_id") and not c.execute("SELECT 1 FROM contacts WHERE id=?", (vals["contact_id"],)).fetchone():
            vals["contact_id"] = None
        vals["report_id"] = rid
        if c.execute("SELECT 1 FROM items WHERE id=? AND report_id=?", (it["id"], rid)).fetchone():
            c.execute(f"UPDATE items SET {','.join(k + '=?' for k in vals)} WHERE id=?", list(vals.values()) + [it["id"]])
        elif not c.execute("SELECT 1 FROM items WHERE id=?", (it["id"],)).fetchone():
            vals.pop("id", None)   # id kommt gleich ausdrücklich dazu (sonst doppelt → Fehler beim Wiederherstellen)
            c.execute(f"INSERT INTO items({','.join(vals)}, id) VALUES({','.join('?' * (len(vals) + 1))})", list(vals.values()) + [it["id"]])
    for im in snap["images"]:   # Foto-Zuordnung zu Einträgen wiederherstellen (soweit Foto und Eintrag noch existieren)
        if im.get("item_id") and c.execute("SELECT 1 FROM items WHERE id=?", (im["item_id"],)).fetchone():
            c.execute("UPDATE images SET item_id=? WHERE id=? AND report_id=?", (im["item_id"], im["id"], rid))
    return rid
