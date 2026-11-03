"""Namensschema auf dem Server: Werden von der App abgelegte PDFs oder Fotoordner von Hand umbenannt
(z. B. „2026-11-02 Grundierung“ → „A489 2026.11.02 Grundierung“), erkennt die App das Schema der vorhandenen
Namen. Nach Rückfrage benennt sie die noch App-benannten Dateien um und benennt künftig selbst so.

Schema (je Projekt, Einstellung `scheme_<Projekt-ID>` als JSON):
  {"state": "on" | "off", "pdf": "{kuerzel} {nr}_{datum:TT.MM.JJJJ} Bautagebuch", "dir": "{kuerzel} {datum:JJJJ.MM.TT}{rest}"}
Platzhalter: {kuerzel} Projektkürzel (A489) · {nr} Berichtsnummer · {datum:FORMAT} · {rest} Beschreibung des Fotoordners.
"""
import json, os, re
from collections import Counter
from . import audit, db, remote, settings

DATES = [("TT.MM.JJJJ", r"\d{2}\.\d{2}\.\d{4}"), ("JJJJ.MM.TT", r"\d{4}\.\d{2}\.\d{2}"), ("JJJJ-MM-TT", r"\d{4}-\d{2}-\d{2}"),
         ("TT-MM-JJJJ", r"\d{2}-\d{2}-\d{4}"), ("JJJJMMTT", r"(?<!\d)\d{8}(?!\d)"), ("TT.MM.JJ", r"(?<!\d)\d{2}\.\d{2}\.\d{2}(?!\d)")]
MARK = "ZZLABELZZ"


def fmt_date(iso, f):
    y, m, d = (iso or "0000-00-00").split("-")[:3]
    return f.replace("JJJJ", y).replace("JJ", y[2:]).replace("MM", m).replace("TT", d)


def _parse(text, f, rx):
    """Datum eines Textes (ISO) oder None."""
    m = re.search(rx, text)
    if not m:
        return None
    s = m.group(0)
    digits = re.sub(r"\D", "", s)
    if f.startswith("JJJJ"):
        y, mo, d = digits[:4], digits[4:6], digits[6:8]
    elif f.endswith("JJJJ"):
        d, mo, y = digits[:2], digits[2:4], digits[4:8]
    else:
        d, mo, y = digits[:2], digits[2:4], "20" + digits[4:6]
    return f"{y}-{mo}-{d}" if 1 <= int(mo) <= 12 and 1 <= int(d) <= 31 else None


def code_of(proj):
    return re.sub(r"[^A-Za-z0-9._-]", "", (proj["name"].split() or ["Projekt"])[0]) or "Projekt"


def load(conf, pid):
    try:
        s = json.loads(conf.get(f"scheme_{pid}") or "{}")
        return s if isinstance(s, dict) else {}
    except ValueError:
        return {}


def active(conf, pid, key):
    s = load(conf, pid)
    return s.get(key) if s.get("state") == "on" else None


def fill(tpl, code, iso, nr=None, rest=""):
    def dt(m):
        return fmt_date(iso, m.group(1))
    s = re.sub(r"\{datum:([^}]+)\}", dt, tpl).replace("{kuerzel}", code).replace("{nr}", str(nr if nr is not None else "")).replace("{rest}", rest)
    return remote.clean(s)


def pdf_name(conf, proj, rep, default):
    t = active(conf, proj["id"], "pdf")
    return (fill(t, code_of(proj), rep["date"], rep["number"]).rstrip(". ") + ".pdf") if t else default


def dir_label(conf, pid, code, iso, label_iso):
    """Fotoordner-Name nach Schema aus dem App-Namen „JJJJ-MM-TT Beschreibung“."""
    t = active(conf, pid, "dir")
    if not t:
        return label_iso
    return fill(t, code, iso, rest=label_iso[len(iso):])[:120].rstrip(". ")


def _tpl(name, code, kind):
    """Schema-Vorlage eines vorhandenen Namens oder None."""
    stem = os.path.splitext(name)[0] if kind == "pdf" else name
    if re.search(r"_old\d+$", stem):
        return None
    best = None
    for f, rx in DATES:
        m = re.search(rx, stem)
        if m and _parse(stem, f, rx) and (best is None or m.start() < best[1].start()):
            best = (f, m)
    if not best:
        return None
    f, m = best
    before, after = stem[:m.start()], stem[m.end():]
    if before.startswith(code):
        before = "{kuerzel}" + before[len(code):]
    if kind == "pdf":
        before = re.sub(r"(?<=[ _-])\d{1,4}(?=[ _-]?$)", "{nr}", before)
        return before + "{datum:%s}" % f + after
    return before + "{datum:%s}{rest}" % f


def is_default(name, code, kind):
    if kind == "pdf":
        return re.match(r"^" + re.escape(code) + r"_BT_\d{4}-\d{2}-\d{2}\.pdf$", name) is not None
    return re.match(r"^\d{4}-\d{2}-\d{2}(?![\d])", name) is not None and not re.search(r"_old\d+$", name)


def learn(names, code, kind):
    c = Counter(t for t in (_tpl(n, code, kind) for n in names if not is_default(n, code, kind)) if t)
    if not c:
        return None
    t, n = c.most_common(1)[0]
    return t if n >= 2 and (kind == "dir" or "{datum" in t) else None


def _dirs(target, conf, proj):
    """(PDF-Ordner, Eltern-Ordner der Tagesordner) auf dem Server oder None."""
    from . import sync
    code = sync.code_of(proj)
    def res(tpl, label=None):
        d = sync.render(tpl, proj, "2000-01-01", late=True, label=label)
        if "{projekt}" in d:
            d = d.replace("{projekt}", "/".join(remote.find_project_path(target, code, remote.clean(proj["name"]) or "Projekt")))
        return d
    pdf = res(conf.get("store_tpl_pdf") or sync.DEFAULT_PDF)
    ph = res(conf.get("store_tpl_photos") or sync.DEFAULT_PHOTOS, MARK)
    if not ph.endswith("/" + MARK) and ph != MARK:
        return None
    return pdf, ph[: -len(MARK)].rstrip("/")


def check(pid):
    """Rückfrage-Angebot für ein Projekt oder None."""
    from . import sync
    with db.tx() as c:
        conf = settings.all(c)
        proj = c.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
        reps = {r["date"]: r["number"] for r in reversed(c.execute("SELECT date, number FROM reports WHERE project_id=? ORDER BY id", (pid,)).fetchall())}
    if not proj or not sync.enabled(conf):
        return None
    st = load(conf, pid)
    if st.get("state") == "off":
        return None
    target = remote.open_target(conf)
    paths = _dirs(target, conf, proj)
    if not paths:
        return None
    pdf_dir, ph_dir = paths
    code = code_of(proj)
    pdfs = [e["name"] for e in target.listdir(pdf_dir) if not e["dir"] and e["name"].lower().endswith(".pdf")]
    dirs = [e["name"] for e in target.listdir(ph_dir) if e["dir"]]
    tp = st.get("pdf") if st.get("state") == "on" else None
    td = st.get("dir") if st.get("state") == "on" else None
    tp, td = tp or learn(pdfs, code, "pdf"), td or learn(dirs, sync.code_of(proj), "dir")
    if not tp and not td:
        return None
    items, have = [], {n.lower() for n in pdfs} | {n.lower() for n in dirs}
    for n in sorted(pdfs):
        m = re.match(r"^" + re.escape(code) + r"_BT_(\d{4}-\d{2}-\d{2})\.pdf$", n)
        if tp and m and m.group(1) in reps:
            new = fill(tp, code, m.group(1), reps[m.group(1)]).rstrip(". ") + ".pdf"
            if new.lower() not in have:
                items.append({"kind": "pdf", "dir": pdf_dir, "from": n, "to": new})
    for n in sorted(dirs):
        m = re.match(r"^(\d{4}-\d{2}-\d{2})(?!\d)(.*)$", n)
        if td and m and not re.search(r"_old\d+$", n):
            new = fill(td, sync.code_of(proj), m.group(1), rest=m.group(2))[:120].rstrip(". ")
            if new and new.lower() not in have:
                items.append({"kind": "dir", "dir": ph_dir, "from": n, "to": new})
    if not items:
        return None
    return {"pdf": tp, "dir": td, "items": items, "example_pdf": fill(tp, code, "2026-11-02", 41) + ".pdf" if tp else "",
            "example_dir": fill(td, code, "2026-11-02", rest=" Grundierung") if td else ""}


def apply(pid, accept):
    """Ja: umbenennen und das Schema für künftige Namen merken. Nein: nicht mehr fragen."""
    with db.tx() as c:
        conf = settings.all(c)
    if not accept:
        with db.tx() as c:
            s = load(conf, pid); s["state"] = "off"; settings.put(c, f"scheme_{pid}", json.dumps(s))
        return 0
    offer = check(pid)
    if not offer:
        return 0
    target, n = remote.open_target(conf), 0
    for it in offer["items"]:
        old, new = f"{it['dir']}/{it['from']}", f"{it['dir']}/{it['to']}"
        try:
            target.rename(old, new)
        except Exception:
            continue
        n += 1
        if it["kind"] == "dir":
            with db.tx() as c:
                for r in c.execute("SELECT id, sent_remote FROM images WHERE sent_remote!=''").fetchall():
                    p = (r["sent_remote"] or "").replace("\\", "/")
                    if p.startswith(old + "/"):
                        c.execute("UPDATE images SET sent_remote=? WHERE id=?", (new + p[len(old):], r["id"]))
        audit.record("System", "export", "Auf dem Server nach erkanntem Schema umbenannt", f"{it['from']} → {it['to']}")
    with db.tx() as c:
        settings.put(c, f"scheme_{pid}", json.dumps({"state": "on", "pdf": offer["pdf"], "dir": offer["dir"]}))
    return n
