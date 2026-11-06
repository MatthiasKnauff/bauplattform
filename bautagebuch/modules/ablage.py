"""Belege (z. B. Rechnungen aus „Ausschreibung & Abrechnung“) im Projektordner auf dem Server ablegen.

POST /api/ablage/rechnung {project_id, firma, name, datei (Base64)}
Der Ordner wird wie bei Plänen und Bautagebuch selbst gesucht: im Projektordner (bis drei Ebenen tief) der Ordner
„… Rechnungsprüfung“ (sonst „… Rechnung…“), darin der Ordner der Firma („A481 Assenmacher“). Fehlt einer, wird er angelegt
(„<Kürzel> Rechnungsprüfung“ im Projektordner, „<Kürzel> <Firma>“ darin).
"""
import base64, re
from flask import Blueprint, g, jsonify, request
from core import audit, db, remote, sync
from modules.plaene import _ziel

bp = Blueprint("ablage", __name__)
FIRMA_WEG = re.compile(r"\b(gmbh|co|kg|ag|ug|mbh|gbr|ohg|e\.?\s?k|inh|und|haftungsbeschränkt|bau|bauunternehmung|firma|fa)\b\.?|&|\(.*?\)", re.I)


def _fold(s):
    s = (s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r"[^a-z0-9 ]+", " ", s)


def _suche(t, base, depth, test):
    """Breitensuche nach einem Unterordner, der test(name) erfüllt – höchstens depth Ebenen tief."""
    ebene = [[]]
    for _ in range(depth):
        neu = []
        for rel in ebene:
            try:
                ds = sorted(t.dirs(base + rel))
            except Exception:
                continue
            for d in ds:
                if test(d):
                    return rel + [d]
                neu.append(rel + [d])
        ebene = neu[:400]
    return None


@bp.post("/api/ablage/rechnung")
def rechnung_ablegen():
    b = request.get_json(silent=True) or {}
    pid = b.get("project_id")
    if not isinstance(pid, int):
        return jsonify(error="Projekt fehlt"), 400
    try:
        daten = base64.b64decode(b.get("datei") or "")
    except Exception:
        return jsonify(error="Datei nicht lesbar"), 400
    if not daten or len(daten) > 60 * 1024 * 1024:
        return jsonify(error="Datei leer oder zu groß"), 400
    t, base, err = _ziel(pid)
    if err:
        return jsonify(error=err), 400
    with db.tx() as c:
        p = c.execute("SELECT id, name, folder FROM projects WHERE id=?", (pid,)).fetchone()
    code = sync.code_of(p)
    rp = _suche(t, base, 3, lambda d: "rechnungspr" in _fold(d)) or _suche(t, base, 3, lambda d: "rechnung" in _fold(d))
    if not rp:
        rp = [remote.clean(f"{code} Rechnungsprüfung")]
    firma = remote.clean(b.get("firma") or "") or "Firma"
    worte = [w for w in _fold(FIRMA_WEG.sub(" ", firma)).split() if len(w) >= 4]
    fp = None
    if worte:
        try:
            for d in sorted(t.dirs(base + rp)):
                f = _fold(d)
                if all(w in f for w in worte[:2]) or (len(worte) >= 1 and worte[0] in f):
                    fp = d
                    break
        except Exception:
            pass
    ordner = rp + [fp or remote.clean(f"{code} {firma}")]
    name = remote.clean(b.get("name") or "Rechnung.pdf")
    if not name.lower().endswith(".pdf"):
        name += ".pdf"
    try:
        if t.exists("/".join(base + ordner + [name])):   # gleicher Name schon da: nicht überschreiben
            stamm = name[:-4]
            n = 2
            while t.exists("/".join(base + ordner + [f"{stamm} ({n}).pdf"])) and n < 50:
                n += 1
            name = f"{stamm} ({n}).pdf"
        t.put_bytes(daten, "/".join(base + ordner + [name]))
    except Exception as e:
        return jsonify(error=f"Ablage nicht erreichbar: {sync._msg(e)}"), 502
    pfad = "/".join(ordner + [name])
    with db.tx() as c:
        audit.log(c, g.user["name"], "export", "Rechnung abgelegt", pfad, p["id"], p["name"], "")
    return jsonify(ok=True, pfad=pfad)
