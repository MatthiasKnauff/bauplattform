"""ToDo-Liste der Bauplattform als PDF in „Pläne & Dateien“ → Projekt „Büro“ → Ordner „Bauplattform“.

Quelle: shared/bpcore/buero/todo.md (im Repo, wird bei jedem Push nachgeführt). Die Dienste legen sie beim Start ab –
nur wenn sich der Text geändert hat (Prüfsumme in bp_store „buero:todo“) und die Ablage eingerichtet ist.
Testserver (TESTSERVER=1): die Ablage wird nur gelesen – dort wird nichts geschrieben.
"""
import hashlib, io, json, os, re, time
from . import db, remote, settings, sync

PROJEKT = "Büro"
ORDNER = "Bauplattform"
DATEI = "Bauplattform - ToDo.pdf"


def _quelle():
    try:
        import bpcore
        p = os.path.join(os.path.dirname(bpcore.__file__), "buero", "todo.md")
        with open(p, encoding="utf-8") as f:
            return f.read()
    except OSError:
        return ""


def _pdf(text):
    """Einfaches Markdown (#, ##, -, 1., Einrückung) als PDF."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    st = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=st["Heading1"], fontSize=16, spaceAfter=6)
    h2 = ParagraphStyle("h2", parent=st["Heading2"], fontSize=12.5, spaceBefore=10, spaceAfter=4)
    p = ParagraphStyle("p", parent=st["BodyText"], fontSize=9.5, leading=12.5)
    li = ParagraphStyle("li", parent=p, leftIndent=12, bulletIndent=2, spaceAfter=2)
    li2 = ParagraphStyle("li2", parent=li, leftIndent=26, bulletIndent=16)
    esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    fett = lambda s: re.sub(r"~~(.+?)~~", r"<strike><font color='#777777'>\1</font></strike>", re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", esc(s)))   # **fett**, ~~erledigt~~
    out = []
    for z in text.splitlines():
        if not z.strip():
            continue
        tief = len(z) - len(z.lstrip(" "))
        s = z.strip()
        if s.startswith("## "):
            out.append(Paragraph(fett(s[3:]), h2))
        elif s.startswith("# "):
            out.append(Paragraph(fett(s[2:]), h1))
        elif s.startswith("- "):
            out.append(Paragraph(fett(s[2:]), li2 if tief else li, bulletText="•"))
        elif re.match(r"^\d+[a-z]?\.\s", s):
            n, rest = s.split(" ", 1)
            out.append(Paragraph(fett(rest), li2 if tief else li, bulletText=n))
        else:
            out.append(Paragraph(fett(s), p))
    buf = io.BytesIO()
    SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
                      title="Bauplattform – ToDo", author="Bauplattform").build(out or [Spacer(1, 1)])
    return buf.getvalue()


def ablegen():
    """Beim Start der Dienste: ToDo-Liste ablegen, wenn neu. Rückgabe: Text für das Protokoll."""
    text = _quelle()
    if not text.strip():
        return "keine ToDo-Liste im Image"
    if remote.NUR_LESEN:
        return "Testserver: Ablage nur lesend – ToDo-Liste nicht abgelegt"
    summe = hashlib.sha256(text.encode()).hexdigest()
    with db.tx() as c:
        conf = settings.all(c)
        if not sync.enabled(conf):
            return "Ablage nicht eingerichtet"
        r = c.execute("SELECT data FROM bp_store WHERE key='buero:todo'").fetchone()
        if r and (json.loads(r["data"] or "{}").get("summe") == summe):
            return "ToDo-Liste unverändert"
        p = c.execute("SELECT id, name, folder FROM projects WHERE name=? ORDER BY id LIMIT 1", (PROJEKT,)).fetchone()
        if not p:   # Projekt „Büro“ anlegen – ohne Bauleitung, also für alle sichtbar
            jetzt = time.strftime("%Y-%m-%dT%H:%M:%S")
            c.execute("INSERT INTO projects(name, client, extra, leaders, updated) VALUES(?,?,?,?,?)",
                      (PROJEKT, "", json.dumps({"quelle": "Bauplattform"}), "[]", jetzt))
            p = c.execute("SELECT id, name, folder FROM projects WHERE name=? ORDER BY id LIMIT 1", (PROJEKT,)).fetchone()
    t = remote.open_target(conf)
    teile = remote.clean_path(p["folder"] or "") or remote.find_project_path(t, sync.code_of(p), remote.clean(p["name"]) or PROJEKT)
    t.put_bytes(_pdf(text), "/".join(teile + [ORDNER, DATEI]))
    with db.tx() as c:
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES('buero:todo', ?, ?, 'dienste') "
                  "ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated=excluded.updated, updated_by=excluded.updated_by",
                  (json.dumps({"summe": summe}), time.strftime("%Y-%m-%dT%H:%M:%S")))
    return "ToDo-Liste abgelegt"
