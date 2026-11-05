"""Ablage von Fotos und PDFs auf dem Server – über eine Warteschlange.

Ein Upload der App scheitert nie am Server: Dateien werden lokal gespeichert, ein Auftrag
(sync_jobs) wird angelegt und im Hintergrund übertragen. Ist der Server nicht erreichbar,
wird mit wachsendem Abstand erneut versucht.
"""
import json, os, re, threading, time
from . import audit, db, remote, scheme, settings

DEFAULT_PHOTOS = "{projekt}/{kuerzel} 8. Fotos + Bautagebuch/{kuerzel} Fotos/{datum}"
DEFAULT_PDF = "{projekt}/{kuerzel} 8. Fotos + Bautagebuch/{kuerzel} Bautagebuch"
EXPORTS = os.path.join(db.DATA, "exports")
_wake = threading.Event()
_started = False


def enabled(conf):
    return conf.get("store_mode", "off") in ("smb", "folder")


def code_of(proj):
    first = remote.clean((proj["name"].split() or [""])[0])
    return remote.code_prefix(first) or first


def render(tpl, proj, date, late=False, label=None):
    """Pfad aus der Vorlage. late=True lässt {projekt} stehen, wenn kein Ordnername eingetragen ist:
    der Ordner wird erst beim Übertragen auf dem Server gesucht (Kürzel) – siehe run_once."""
    y, m = (date or "0000-00").split("-")[:2]
    name = "/".join(remote.clean_path(proj["folder"] or ""))   # eigener Ordner darf Unterordner enthalten: „A450 Haupt/A450.22 Unter“
    if not name and not late:
        name = remote.clean(proj["name"]) or "Projekt"
    s = (tpl or "").replace("{projekt}", name or "{projekt}").replace("{kuerzel}", code_of(proj) or "Projekt") \
        .replace("{datum}", remote.clean(label) if label else (date or "")).replace("{jahr}", y).replace("{monat}", m)
    return "/".join(remote.clean_path(s) if "{projekt}" not in s else
                    [p if p == "{projekt}" else remote.clean(p) for p in s.replace("\\", "/").split("/") if p.strip()])


def _extra(proj):
    return json.dumps({"code": code_of(proj), "name": remote.clean(proj["name"]) or "Projekt"}) if not proj["folder"] else "{}"


def enqueue(con, conf, kind, local, rel_dir, filename, extra="{}"):
    """Auftrag anlegen (oder einen offenen für dasselbe Ziel aktualisieren). Gibt True zurück, wenn aktiv."""
    if not enabled(conf):
        return False
    rem = "/".join([p for p in (rel_dir, remote.clean(filename)) if p])
    row = con.execute("SELECT id FROM sync_jobs WHERE remote=? AND kind=? AND status='pending'", (rem, kind)).fetchone()
    if row:
        con.execute("UPDATE sync_jobs SET local=?, extra=?, retry_at=0, updated=datetime('now') WHERE id=?", (local, extra, row["id"]))
    else:
        con.execute("INSERT INTO sync_jobs(kind, local, remote, extra) VALUES(?,?,?,?)", (kind, local, rem, extra))
    return True


def _image_name(con, r):
    """Dateiname auf dem Server: die Fotobeschreibung (bei Doppelten mit „ (2)“), sonst Datum_Nummer."""
    ext = os.path.splitext(r["file"])[1].lower() or ".jpg"
    cap = remote.clean(r["caption"] or "")[:100].rstrip(". ")
    if not cap:
        return f"{r['date']}_{r['id']:04d}{ext}"
    same = [x["id"] for x in con.execute(
        """SELECT i.id, i.caption FROM images i JOIN reports rr ON rr.id=i.report_id
           WHERE rr.project_id=? AND rr.date=? AND i.id<?  ORDER BY i.id""", (r["project_id"], r["date"], r["id"]))
        if remote.clean(x["caption"] or "")[:100].rstrip(". ").lower() == cap.lower()]
    return f"{cap}{' (%d)' % (len(same) + 1) if same else ''}{ext}"


def _day_label_iso(con, conf, rid, date):
    """Name des Fotoordners eines Tages: Datum + Gewerke der anwesenden Firmen (sonst erstes Wort der Tätigkeit) + die ersten drei Fotonamen.
    Beispiel: „2026-11-02 Elektro, Trockenbau - Riss Fassade, Fenster links, Dach“. Abschaltbar (Einstellung store_folder_desc = 0)."""
    if (conf.get("store_folder_desc") or "1") == "0" or not rid:
        return date
    parts, seen = [], set()
    for f in con.execute("""SELECT i.activity, c.trade FROM items i JOIN sections s ON s.key=i.kind AND (s.extra::json ->> 'link_contacts') = 'true'
                            LEFT JOIN contacts c ON c.id=i.contact_id WHERE i.report_id=? ORDER BY i.id""", (rid,)):
        w = (f["trade"] or "").strip() or (re.split(r"[\s,;/]+", (f["activity"] or "").strip())[0] if (f["activity"] or "").strip() else "")
        w = remote.clean(w)
        if w and w.lower() not in seen:
            seen.add(w.lower()); parts.append(w)
    pics = []
    for im in con.execute("SELECT caption FROM images WHERE report_id=? AND TRIM(COALESCE(caption,''))!='' ORDER BY id LIMIT 3", (rid,)):
        c = remote.clean(im["caption"])[:40].rstrip(". ")
        if c and c not in pics:
            pics.append(c)
    label = date + (" " + ", ".join(parts) if parts else "") + ((" - " if parts else " ") + ", ".join(pics) if pics else "")
    return remote.clean(label)[:120].rstrip(". ")


def day_label(con, conf, rid, date):
    """Tagesordner-Name; nach Rückfrage in der App im Namensschema des Projekts (siehe core/scheme.py)."""
    lab = _day_label_iso(con, conf, rid, date)
    if not rid:
        return lab
    r = con.execute("SELECT p.id, p.name FROM reports r JOIN projects p ON p.id=r.project_id WHERE r.id=?", (rid,)).fetchone()
    return scheme.dir_label(conf, r["id"], code_of(r), date, lab) if r else lab


def refresh_day(con, conf, rid):
    """Fotoordner-Name hat sich geändert (Firma/Gewerk/Foto-Beschreibung)? Dann die schon abgelegten Fotos dieses Tages in den neuen Ordner verschieben."""
    if not enabled(conf):
        return 0
    rep = con.execute("SELECT date FROM reports WHERE id=?", (rid,)).fetchone()
    if not rep:
        return 0
    lab, n = day_label(con, conf, rid, rep["date"]), 0
    for im in con.execute("SELECT id, sent_remote FROM images WHERE report_id=? AND sent_remote!=''", (rid,)).fetchall():
        cur = (im["sent_remote"] or "").replace("\\", "/").rsplit("/", 2)
        if len(cur) >= 3 and cur[1] != lab:
            n += bool(rename_image(con, conf, im["id"]))
    for j in con.execute("SELECT json_extract(extra,'$.image_id') AS iid FROM sync_jobs WHERE kind='image' AND status='pending' AND json_extract(extra,'$.image_id') IN (SELECT id FROM images WHERE report_id=?)", (rid,)).fetchall():
        n += bool(enqueue_image(con, conf, j["iid"]))   # noch nicht übertragene Fotos: Ziel neu berechnen
    return n


def image_target(con, conf, image_id):
    r = con.execute("""SELECT i.id, i.file, i.caption, i.report_id AS rid, r.date, p.id AS project_id, p.name, p.folder FROM images i
                       JOIN reports r ON r.id=i.report_id JOIN projects p ON p.id=r.project_id WHERE i.id=?""",
                    (image_id,)).fetchone()
    if not r:
        return None
    d = render(conf.get("store_tpl_photos") or DEFAULT_PHOTOS, r, r["date"], late=True, label=day_label(con, conf, r["rid"], r["date"]))
    extra = json.dumps({**json.loads(_extra(r)), "image_id": r["id"]})
    return os.path.join(db.DATA, "uploads", r["file"]), d, _image_name(con, r), extra


def enqueue_image(con, conf, image_id):
    t = image_target(con, conf, image_id)
    if not t:
        return False
    con.execute("DELETE FROM sync_jobs WHERE kind IN ('image','rename') AND status='pending' AND json_extract(extra,'$.image_id')=?", (image_id,))
    return enqueue(con, conf, "image", t[0], t[1], t[2], t[3])


def rename_image(con, conf, image_id):
    """Beschreibung geändert: das schon abgelegte Foto auf dem Server umbenennen (oder, noch nicht übertragen, neu einreihen)."""
    t = image_target(con, conf, image_id)
    if not t or not enabled(conf):
        return False
    old = con.execute("SELECT sent_remote FROM images WHERE id=?", (image_id,)).fetchone()["sent_remote"]
    pending = con.execute("SELECT 1 FROM sync_jobs WHERE kind='image' AND status='pending' AND json_extract(extra,'$.image_id')=?", (image_id,)).fetchone()
    if pending or not old:
        return enqueue_image(con, conf, image_id)
    con.execute("DELETE FROM sync_jobs WHERE kind='rename' AND status='pending' AND json_extract(extra,'$.image_id')=?", (image_id,))
    extra = json.dumps({**json.loads(t[3]), "old": old})
    return enqueue(con, conf, "rename", t[0], t[1], t[2], extra)


def enqueue_pdf(con, conf, proj, date, filename, data, report_id=None):
    os.makedirs(EXPORTS, exist_ok=True)
    local = os.path.join(EXPORTS, f"{proj['id']}_{date}_{remote.clean(filename)}")
    with open(local, "wb") as f:
        f.write(data)
    return enqueue(con, conf, "pdf", local, render(conf.get("store_tpl_pdf") or DEFAULT_PDF, proj, date, late=True), filename,
                   json.dumps({**json.loads(_extra(proj)), "report_id": report_id}))


def run_once(limit_s=25):
    """Offene Aufträge übertragen. Gibt (übertragen, offen, letzter Fehler) zurück."""
    t0, sent, err = time.time(), 0, ""
    with db.tx() as c:
        conf = settings.all(c)
    if enabled(conf):
        try:
            target = remote.open_target(conf)
        except Exception as e:
            target, err = None, _msg(e)
        found = {}
        while target and time.time() - t0 < limit_s:
            now = int(time.time())
            with db.tx() as c:
                job = c.execute("SELECT * FROM sync_jobs WHERE status='pending' AND retry_at<=? ORDER BY id LIMIT 1", (now,)).fetchone()
                if not job or c.execute("UPDATE sync_jobs SET retry_at=? WHERE id=? AND retry_at<=?",
                                        (now + 300, job["id"], now)).rowcount != 1:
                    if not job:
                        break
                    continue  # ein anderer Worker war schneller
            if not os.path.exists(job["local"]):
                _set(job["id"], status="skipped", error="Datei existiert nicht mehr")
                continue
            try:
                dst = _resolve(target, job, found)
                ex = json.loads(job["extra"] or "{}")
                if job["kind"] == "pdf":
                    _rotate_old(target, conf, job, dst, found)
                if job["kind"] == "rename" and ex.get("old") and target.exists(ex["old"]):
                    if ex["old"] != dst:
                        target.rename(ex["old"], dst)
                        if ex["old"].rsplit("/", 1)[0] != dst.rsplit("/", 1)[0]:
                            target.rmdir_if_empty(ex["old"].rsplit("/", 1)[0])   # alter Tagesordner leer → entfernen
                else:
                    target.put(job["local"], dst)
                if job["kind"] in ("image", "rename") and ex.get("image_id"):
                    with db.tx() as c:
                        c.execute("UPDATE images SET sent_remote=? WHERE id=?", (dst, ex["image_id"]))
                _set(job["id"], status="done", error="")
                sent += 1
                audit.record("System", "export", {"pdf": "PDF auf Server abgelegt", "image": "Foto auf Server abgelegt", "rename": "Foto auf Server umbenannt"}.get(job["kind"], "Datei auf Server abgelegt"), dst)
            except Exception as e:
                err = _msg(e)
                _set(job["id"], tries=job["tries"] + 1, retry_at=int(time.time()) + min(60 * 2 ** job["tries"], 3600), error=err)
                if _is_connection(e):
                    break  # Server nicht erreichbar: nicht jeden Auftrag einzeln in den Timeout laufen lassen
    with db.tx() as c:
        c.execute("DELETE FROM sync_jobs WHERE status IN ('done','skipped') AND updated < datetime('now','-7 days')")
        open_ = c.execute("SELECT COUNT(*) FROM sync_jobs WHERE status='pending'").fetchone()[0]
        if not err:
            row = c.execute("SELECT error FROM sync_jobs WHERE status='pending' AND error!='' ORDER BY id DESC LIMIT 1").fetchone()
            err = row["error"] if row else ""
    return sent, open_, err


_dirs = {"t": 0, "key": None, "val": []}


def list_dirs(conf):
    """Ordnernamen im Basisordner der Ablage (für die Vorschläge beim Anlegen eines Projekts). 60 s im Speicher."""
    key = tuple(conf.get(k, "") for k in ("store_mode", "store_server", "store_share", "store_path", "store_dir", "store_user"))
    if _dirs["key"] == key and time.time() - _dirs["t"] < 60:
        return _dirs["val"]
    val = []
    if enabled(conf):
        try:
            val = sorted(remote.open_target(conf).dirs(), key=str.lower)
        except Exception:
            val = []
    _dirs.update(t=time.time(), key=key, val=val)
    return val


_subs = {}


def list_subdirs(conf, code):
    """Unterordner der Hauptprojekt-Ordner, die mit dem Kürzel beginnen (z. B. „A450“ → Inhalt von „A450 Pürzer …“)."""
    try:
        t = remote.open_target(conf)
        out = []
        for d in sorted(t.dirs()):
            if remote.has_code(d, code):
                out += t.dirs([d])
        return out
    except Exception:
        return []


def suggest_projects(conf, q):
    """Projektordner zu einer Eingabe – auch solche, die erst in Unterordnern eines Hauptordners liegen
    (z. B. „A450 Pürzer verschiedenes“ → „A450.1. Kordts Feld, Bochum“). Es werden nur Hauptordner geöffnet,
    die zur Eingabe passen (höchstens 6); das Ergebnis bleibt 60 s im Speicher."""
    q = (q or "").strip().lower()
    if not q or not enabled(conf):
        return []
    tops = list_dirs(conf)
    indexed = _indexed(conf, tops)   # alle Unterprojekte aller Hauptordner (im Hintergrund aufgebaut, 10 min im Speicher)
    qcode = remote.code_prefix(q)
    parents = [d for d in tops if d.lower().startswith(q) or (qcode and remote.has_code(d, qcode.split(".")[0]))][:6]
    out = list(tops)
    for d in parents:
        code = remote.code_prefix(d)
        if not code:
            continue
        key = (d, tuple(conf.get(k, "") for k in ("store_mode", "store_server", "store_share", "store_path", "store_dir")))
        hit = _subs.get(key)
        if not hit or time.time() - hit[0] > 60:
            try:
                names = remote.open_target(conf).dirs([d])
            except Exception:
                names = []
            hit = _subs[key] = (time.time(), sorted((n for n in names if n.lower().startswith(code.lower() + ".")), key=_natural))
        for n in hit[1]:
            _pfad[n.lower()] = d + "/" + n
        if hit[1]:   # Hauptordner mit Unterprojekten ist selbst kein Projekt: nur die Unterordner anbieten
            out.remove(d)
            out += hit[1]
    seen = {o.lower() for o in out}
    return [o for o in out if o not in _idx["parents"]] + [n for n in indexed if n.lower() not in seen]


_idx = {"t": 0, "key": None, "names": [], "busy": False, "parents": set()}
_pfad = {}   # Unterprojekt → „Hauptordner/Unterprojekt“ (für das Feld „Projektordner“ der Projektmaske)


def pfad(name):
    """Ordnername aus suggest_projects() als Pfad ab der Ablage (Unterprojekte mit ihrem Hauptordner)."""
    return _pfad.get((name or "").lower(), name)


def _indexed(conf, tops):
    """Unterprojekte aller Hauptordner, damit man auch nach Straße oder Ort suchen kann („auf dem holte“).
    Der Aufbau läuft im Hintergrund (bei vielen Ordnern auf dem Server dauert er etwas); bis er fertig ist,
    gibt es nur die Treffer nach Kürzel."""
    key = tuple(conf.get(k, "") for k in ("store_mode", "store_server", "store_share", "store_path", "store_dir", "store_user"))
    if (_idx["key"] != key or time.time() - _idx["t"] > 600) and not _idx["busy"]:
        _idx["busy"] = True

        def build():
            names, parents = [], set()
            try:
                t = remote.open_target(conf)
                for d in tops:
                    code = remote.code_prefix(d)
                    if not code:
                        continue
                    subs = [n for n in t.dirs([d]) if n.lower().startswith(code.lower() + ".")]
                    if subs:
                        parents.add(d)
                        names += sorted(subs, key=_natural)
                        for n in subs:
                            _pfad[n.lower()] = d + "/" + n
            except Exception:
                pass
            _idx.update(t=time.time(), key=key, names=names, parents=parents, busy=False)
        threading.Thread(target=build, daemon=True, name="bt-index").start()
    return list(_idx["names"]) if _idx["key"] == key else []


def _natural(s):
    import re
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", s)]


def retry_now():
    with db.tx() as c:
        c.execute("UPDATE sync_jobs SET retry_at=0 WHERE status='pending'")


def status():
    with db.tx() as c:
        n = c.execute("SELECT COUNT(*) FROM sync_jobs WHERE status='pending'").fetchone()[0]
        d = c.execute("SELECT COUNT(*) FROM sync_jobs WHERE status='done'").fetchone()[0]
        e = c.execute("SELECT error FROM sync_jobs WHERE status='pending' AND error!='' ORDER BY updated DESC LIMIT 1").fetchone()
    return {"pending": n, "done": d, "error": e["error"] if e else ""}


def _resolve(target, job, found):
    rem = job["remote"]
    if "{projekt}" not in rem:
        return rem
    ex = json.loads(job["extra"] or "{}")
    code = ex.get("code", "")
    if code not in found:
        found[code] = "/".join(remote.find_project_path(target, code, ex.get("name") or "Projekt"))
    return rem.replace("{projekt}", found[code])


def _free(target, path, sep):
    """Nächster freier Name „…_old1“, „…_old2“ usw."""
    base, ext = os.path.splitext(path) if sep == "file" else (path, "")
    n = 1
    while target.exists(f"{base}_old{n}{ext}"):
        n += 1
    return f"{base}_old{n}{ext}"


def _keep(conf, key):
    try:
        return max(0, int(str(conf.get(key) or "0").strip()))
    except ValueError:
        return 0


def _prune_old(target, path, is_dir, keep):
    """Von „…_old1“, „…_old2“ … nur die neuesten `keep` Stück behalten (0 = alle behalten); die älteren werden gelöscht."""
    if keep <= 0:
        return
    parent, _, name = path.rpartition("/")
    stem, ext = (name, "") if is_dir else os.path.splitext(name)
    rx = re.compile("^" + re.escape(stem) + r"_old(\d+)" + re.escape(ext) + "$")
    found = sorted(((int(m.group(1)), e["name"]) for e in target.listdir(parent) if e["dir"] == is_dir and (m := rx.match(e["name"]))), reverse=True)
    for n, nm in found[keep:]:
        rel = f"{parent}/{nm}" if parent else nm
        try:
            target.delete(rel, is_dir)
            audit.record("System", "export", "Alte Version automatisch gelöscht", rel)
        except Exception:
            pass


def _rotate_old(target, conf, job, dst, found):
    """Wird ein Bericht erneut exportiert, werden das vorhandene PDF und der Fotoordner des Tages
    in „_old1“, „_old2“ … umbenannt; danach landen die aktuellen Fotos frisch im Tagesordner."""
    if not target.exists(dst):
        return
    ex = json.loads(job["extra"] or "{}")
    rid = ex.get("report_id")
    with db.tx() as c:
        r = c.execute("SELECT r.date, p.* FROM reports r JOIN projects p ON p.id=r.project_id WHERE r.id=?", (rid,)).fetchone() if rid else None
    if r:
        with db.tx() as c:
            d = render(conf.get("store_tpl_photos") or DEFAULT_PHOTOS, r, r["date"], late=True, label=day_label(c, conf, rid, r["date"]))
        if "{projekt}" in d:
            code = ex.get("code", "")
            if code not in found:
                found[code] = "/".join(remote.find_project_path(target, code, ex.get("name") or "Projekt"))
            d = d.replace("{projekt}", found[code])
        if target.exists(d):
            nd = _free(target, d, "dir"); target.rename(d, nd)
            _prune_old(target, d, True, _keep(conf, "store_keep_old_photos"))
            audit.record("System", "export", "Fotoordner der letzten Version umbenannt", f"{d} → {nd.rsplit('/', 1)[-1]}")
    nf = _free(target, dst, "file"); target.rename(dst, nf)
    _prune_old(target, dst, False, _keep(conf, "store_keep_old_pdf"))
    audit.record("System", "export", "PDF der letzten Version umbenannt", f"{dst} → {nf.rsplit('/', 1)[-1]}")
    if r:
        with db.tx() as c:
            for i in c.execute("SELECT id FROM images WHERE report_id=? ORDER BY id", (rid,)).fetchall():
                enqueue_image(c, conf, i["id"])


def _set(job_id, **kw):
    kw["updated"] = db.now().replace("T", " ")
    with db.tx() as c:
        c.execute(f"UPDATE sync_jobs SET {','.join(k + '=?' for k in kw)} WHERE id=?", (*kw.values(), job_id))


def _is_connection(e):
    n = type(e).__name__.lower()
    return ("connect" in n or "timeout" in n or
            (isinstance(e, OSError) and not isinstance(e, (FileNotFoundError, PermissionError, IsADirectoryError))))


def _msg(e):
    s = str(e).strip() or type(e).__name__
    return f"{type(e).__name__}: {s}"[:300]


def wake():
    _wake.set()


def start():
    """Hintergrund-Thread: überträgt sofort nach dem Anlegen eines Auftrags und danach alle 30 s."""
    global _started
    if _started:
        return
    _started = True

    def loop():
        while True:
            _wake.wait(30)
            _wake.clear()
            try:
                run_once()
            except Exception:
                pass
    threading.Thread(target=loop, daemon=True, name="bt-sync").start()
