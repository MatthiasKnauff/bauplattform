"""Teile eines Projekts über die Apps löschen – derselbe Ablauf in der Verwaltung und im Dialog „Projekt bearbeiten“ jeder App.

teile(c, pid)            was zum Bautagebuch-Projekt pid gehört: Bautagebuch (Berichte, Fotos), Bauzeitenpläne, Kostenermittlungen
loeschen(...)            die angekreuzten Teile in den Papierkorb (Bauzeitenpläne/Kostenermittlungen direkt, das Bautagebuch-Projekt
                         über das Bautagebuch selbst – mit der Anmeldung des Benutzers, damit es seine Dateien mitnimmt)
"""
import json
import os
import urllib.error
import urllib.request
from datetime import datetime

from . import papierkorb, sso

BT_INTERNAL = os.environ.get("BAUTAGEBUCH_INTERNAL", "http://bautagebuch:8000").rstrip("/")


def teile(c, pid):
    p = c.execute("""SELECT p.id, p.name,
                            (SELECT COUNT(*) FROM reports r WHERE r.project_id=p.id) AS reports,
                            (SELECT COUNT(*) FROM images i JOIN reports r ON r.id=i.report_id WHERE r.project_id=p.id) AS images
                     FROM projects p WHERE p.id=?""", (pid,)).fetchone()
    if not p:
        return None
    plans = c.execute("SELECT id, name, (SELECT COUNT(*) FROM gantt_versions v WHERE v.gantt_id=g.id) AS versions FROM gantt_projects g WHERE project_id=? ORDER BY name", (pid,)).fetchall()
    gids = [x["id"] for x in plans]
    q = "SELECT id, name, (SELECT COUNT(*) FROM bk_files f WHERE f.bk_id=b.id) AS files FROM bk_projects b WHERE project_id=?"
    args = [pid]
    if gids:
        q += f" OR (project_id IS NULL AND gantt_id IN ({','.join('?' * len(gids))}))"
        args += gids
    bks = c.execute(q + " ORDER BY name", tuple(args)).fetchall()
    lvs = 0   # LVs der AVA (Tabelle gibt es erst, wenn die AVA einmal gelaufen ist)
    if c.execute("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_name='ava_lv'").fetchone()["n"]:
        lvs = c.execute("SELECT COUNT(*) AS n FROM ava_lv WHERE project_id=? AND archived=0", (pid,)).fetchone()["n"]
    return {"name": p["name"], "bt": {"id": p["id"], "reports": p["reports"], "images": p["images"], "lvs": lvs},
            "plans": [{"id": x["id"], "name": x["name"], "versions": x["versions"]} for x in plans],
            "bks": [{"id": x["id"], "name": x["name"], "files": x["files"]} for x in bks]}


def _bt_loeschen(req, bt):
    from . import db
    with db.tx() as c:
        tok = sso.current_token(req, c)
    r = urllib.request.Request(f"{BT_INTERNAL}/api/projects/{bt}", method="DELETE", headers={"Cookie": f"{sso.COOKIE}={tok}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=60) as x:
            x.read()
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read().decode() or "{}").get("error")
        except ValueError:
            msg = None
        raise RuntimeError(msg or f"Bautagebuch antwortet mit Fehler {e.code}")
    except Exception as e:
        raise RuntimeError("Bautagebuch nicht erreichbar: " + str(e)[:120])


def loeschen(req, wer, plans=(), bks=(), bt=None):
    """Gibt (erledigt, fehler) zurück – je eine Liste lesbarer Texte."""
    from . import db
    done, errors = [], []
    with db.tx() as c:
        for x in [str(v)[:80] for v in (plans or [])][:50]:
            r = c.execute("SELECT name FROM gantt_projects WHERE id=?", (x,)).fetchone()
            if r:
                c.execute("DELETE FROM gantt_presence WHERE gantt_id=?", (x,))
                papierkorb.ablegen(c, "gantt_projects", x, "Bauzeitenplan", r["name"], wer, "", "gantt")   # mit Verlauf
                done.append(f"Bauzeitenplan „{r['name']}“")
        for x in [int(v) for v in (bks or []) if isinstance(v, int)][:200]:
            r = c.execute("SELECT name FROM bk_projects WHERE id=?", (x,)).fetchone()
            if r:
                papierkorb.ablegen(c, "bk_projects", x, "Kostenermittlung", r["name"], wer, "", "baukosten")   # mit Plänen (PDF)
                done.append(f"Kostenermittlung „{r['name']}“")
    if isinstance(bt, int):
        with db.tx() as c:
            r = c.execute("SELECT name FROM projects WHERE id=?", (bt,)).fetchone()
        if r:
            try:
                _bt_loeschen(req, bt)
                done.append(f"Bautagebuch-Projekt „{r['name']}“ mit Berichten und Fotos")
            except RuntimeError as e:
                errors.append(str(e))
    try:
        with db.tx() as c:
            for d in done:
                c.execute("INSERT INTO audit_log(ts, user_name, cat, action, detail) VALUES(?,?,?,?,?)",
                          (datetime.now().isoformat(timespec="seconds").replace("T", " "), wer or "", "verwaltung", "Gelöscht", d))
    except Exception:   # noqa: BLE001 – Protokoll ist Nebensache
        pass
    return done, errors
