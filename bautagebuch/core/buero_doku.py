"""ToDo-Liste der Bauplattform als PDF in „Pläne & Dateien“ → Projekt „Büro“ → Ordner „Bauplattform“.

Quelle: shared/bpcore/buero/todo.md (im Repo, wird bei jedem Push nachgeführt). Die Dienste legen sie beim Start ab –
nur wenn sich der Text geändert hat (Prüfsumme in bp_store „buero:todo“) und die Ablage eingerichtet ist.
Testserver (TESTSERVER=1): die Ablage wird nur gelesen – dort wird nichts geschrieben.
"""
import hashlib, json, os, time
from bpcore import md_pdf

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


def ablegen():
    """Beim Start der Dienste: ToDo-Liste ablegen, wenn neu. Rückgabe: Text für das Protokoll."""
    text = _quelle()
    if not text.strip():
        return "keine ToDo-Liste im Image"
    return pdf_ablegen("buero:todo", text, ORDNER, DATEI, "Bauplattform – ToDo", "ToDo-Liste")


def pdf_ablegen(key, text, ordner, datei, titel, was):
    """Markdown als PDF in „Pläne & Dateien“ → Projekt „Büro“ → ordner/datei – nur wenn sich der Text geändert hat (Prüfsumme in
    bp_store unter key). Auch für das Wiki (core/wiki_dienst.py). Testserver: nichts schreiben."""
    if remote.NUR_LESEN:
        return f"Testserver: Ablage nur lesend – {was} nicht abgelegt"
    summe = hashlib.sha256(text.encode()).hexdigest()
    with db.tx() as c:
        conf = settings.all(c)
        if not sync.enabled(conf):
            return "Ablage nicht eingerichtet"
        r = c.execute("SELECT data FROM bp_store WHERE key=?", (key,)).fetchone()
        if r and (json.loads(r["data"] or "{}").get("summe") == summe):
            return f"{was} unverändert"
        p = c.execute("SELECT id, name, folder FROM projects WHERE name=? ORDER BY id LIMIT 1", (PROJEKT,)).fetchone()
        if not p:   # Projekt „Büro“ anlegen – ohne Bauleitung, also für alle sichtbar
            jetzt = time.strftime("%Y-%m-%dT%H:%M:%S")
            c.execute("INSERT INTO projects(name, client, extra, leaders, updated) VALUES(?,?,?,?,?)",
                      (PROJEKT, "", json.dumps({"quelle": "Bauplattform"}), "[]", jetzt))
            p = c.execute("SELECT id, name, folder FROM projects WHERE name=? ORDER BY id LIMIT 1", (PROJEKT,)).fetchone()
    t = remote.open_target(conf)
    teile = remote.clean_path(p["folder"] or "") or remote.find_project_path(t, sync.code_of(p), remote.clean(p["name"]) or PROJEKT)
    t.put_bytes(md_pdf.pdf(text, titel), "/".join(teile + [ordner, datei]))
    with db.tx() as c:
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?, ?, ?, 'dienste') "
                  "ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated=excluded.updated, updated_by=excluded.updated_by",
                  (key, json.dumps({"summe": summe}), time.strftime("%Y-%m-%dT%H:%M:%S")))
    return f"{was} abgelegt"
