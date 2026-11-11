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
            except Exception:   # dirs() liefert bei Fehlern schon [] – hier nur Absicherung
                continue
            for d in ds:
                if test(d):
                    return rel + [d]
                neu.append(rel + [d])
        ebene = neu[:400]
    return None


# Wo welche Art hingehört: Suchbegriffe für den Hauptordner (der Reihe nach), Name, wenn keiner da ist, ob ein Firmenordner darunter kommt
ARTEN = {
    "rechnung": (["rechnungspr", "rechnung"], "Rechnungsprüfung", "firma"),
    "aufmass": (["rechnungspr", "aufmass", "abrechnung", "rechnung"], "Rechnungsprüfung", "firma"),
    "angebot": (["angebot", "vergabe", "ausschreib"], "Angebote", "gewerk"),
    "lv": (["leistungsverz", "ausschreib", "vergabe"], "Ausschreibung", "gewerk"),
    "buergschaft": (["bürgschaft", "buergschaft", "sicherheit", "vertr"], "Bürgschaften", "firma"),
    "abnahme": (["abnahme", "maengel", "mängel"], "Abnahmen + Mängel", ""),   # Vorlage: „4. Durchführung / Abnahmen + Mängel“
}


def _passend(t, pfad, text):
    """Unterordner, der zur Firma / zum Gewerk passt (Wortvergleich ohne GmbH & Co.)."""
    worte = [w for w in _fold(FIRMA_WEG.sub(" ", text or "")).split() if len(w) >= 4]
    if not worte:
        return None
    try:
        for d in sorted(t.dirs(pfad)):
            f = _fold(d)
            if all(w in f for w in worte[:2]) or worte[0] in f:
                return d
    except Exception:   # dirs() liefert bei Fehlern schon [] – hier nur Absicherung
        pass
    return None


def _vorschlag(t, base, p, art, firma, gewerk):
    """[(Ordnername, vorhanden?)] vom Projektordner aus."""
    such, neu_name, unter = ARTEN.get(art, ARTEN["rechnung"])
    code = sync.code_of(p)
    rp = None
    for w in such:
        rp = _suche(t, base, 3, lambda d, w=w: w in _fold(d))
        if rp:
            break
    teile = [(x, True) for x in rp] if rp else [(remote.clean(f"{code} {neu_name}"), False)]
    if unter == "firma":
        fp = _passend(t, base + [x for x, _ in teile], firma) if rp else None
        teile.append((fp, True) if fp else (remote.clean(f"{code} {firma or 'Firma'}"), False))
    elif unter == "gewerk" and gewerk and rp:
        gp = _passend(t, base + [x for x, _ in teile], gewerk)
        if gp:
            teile.append((gp, True))
    return teile


def _projekt(pid):
    t, base, err = _ziel(pid)
    if err:
        return None, None, None, err
    with db.tx() as c:
        p = c.execute("SELECT id, name, folder FROM projects WHERE id=?", (pid,)).fetchone()
    return t, base, p, ""


@bp.get("/api/ablage/vorschlag")
def ablage_vorschlag():
    """Vorgeschlagener Ordner für eine Datei der AVA (Rechnung, Aufmaß, Angebot, LV) – zum Anzeigen und Ändern vor dem Ablegen."""
    pid = request.args.get("project_id", type=int)
    t, base, p, err = _projekt(pid) if pid else (None, None, None, "Projekt fehlt")
    if err:
        return jsonify(ok=False, error=err)
    try:
        teile = _vorschlag(t, base, p, request.args.get("art") or "rechnung", request.args.get("firma") or "", request.args.get("gewerk") or "")
    except Exception as e:
        return jsonify(ok=False, error=f"Ablage nicht erreichbar: {sync._msg(e)}")
    return jsonify(ok=True, projekt="/".join(base), ordner=[x for x, _ in teile], neu=[not v for _, v in teile])


@bp.get("/api/ablage/projektordner")
def ablage_projektordner():
    """Welcher Ordner auf dem Server gehört zum Projekt (eingetragen oder automatisch über das Kürzel gefunden)?"""
    pid = request.args.get("project_id", type=int)
    if not pid:
        return jsonify(ok=False, error="Projekt fehlt")
    t, base, p, err = _projekt(pid)
    if err:
        return jsonify(ok=False, error=err)
    return jsonify(ok=True, projekt="/".join(base), eingetragen=bool((p["folder"] or "").strip()) if p else False)


@bp.get("/api/ablage/ordner")
def ablage_ordner():
    """Unterordner zum Durchklicken (Pfad relativ zum Projektordner, Teile mit / getrennt)."""
    pid = request.args.get("project_id", type=int)
    t, base, p, err = _projekt(pid) if pid else (None, None, None, "Projekt fehlt")
    if err:
        return jsonify(ok=False, error=err)
    rel = [remote.clean(x) for x in (request.args.get("pfad") or "").split("/") if x.strip()]
    try:
        ds = sorted(t.dirs(base + rel)) if t.exists("/".join(base + rel)) or not rel else []
    except Exception as e:
        return jsonify(ok=False, error=f"Ablage nicht erreichbar: {sync._msg(e)}")
    return jsonify(ok=True, projekt="/".join(base), pfad=rel, ordner=ds)


@bp.post("/api/ablage/datei")
def datei_ablegen():
    """{project_id, art, firma, gewerk, name, datei (Base64), ordner (optional: Teile relativ zum Projektordner, sonst Vorschlag)}"""
    return _ablegen(request.get_json(silent=True) or {})


def _ablegen(b):
    pid = b.get("project_id")
    if not isinstance(pid, int):
        return jsonify(error="Projekt fehlt"), 400
    try:
        daten = base64.b64decode(b.get("datei") or "")
    except Exception:
        return jsonify(error="Datei nicht lesbar"), 400
    if not daten or len(daten) > 80 * 1024 * 1024:
        return jsonify(error="Datei leer oder zu groß"), 400
    t, base, p, err = _projekt(pid)
    if err:
        return jsonify(error=err), 400
    art = b.get("art") or "rechnung"
    if isinstance(b.get("ordner"), list) and b["ordner"]:
        ordner = [remote.clean(str(x)) for x in b["ordner"] if str(x).strip()]
    else:
        ordner = [x for x, _ in _vorschlag(t, base, p, art, b.get("firma") or "", b.get("gewerk") or "")]
    name = remote.clean(b.get("name") or "Dokument.pdf")
    stamm, punkt, endung = name.rpartition(".")
    if not punkt:
        stamm, endung = name, "pdf"
    try:
        n, ziel = 1, name if punkt else f"{name}.pdf"
        while t.exists("/".join(base + ordner + [ziel])) and n < 50:   # gleicher Name schon da: nicht überschreiben
            n += 1
            ziel = f"{stamm} ({n}).{endung}"
        t.put_bytes(daten, "/".join(base + ordner + [ziel]))
    except Exception as e:
        return jsonify(error=f"Ablage nicht erreichbar: {sync._msg(e)}"), 502
    pfad = "/".join(ordner + [ziel])
    with db.tx() as c:
        audit.log(c, g.user["name"], "export", {"rechnung": "Rechnung abgelegt", "aufmass": "Aufmaß abgelegt", "angebot": "Angebot abgelegt", "lv": "LV abgelegt", "buergschaft": "Bürgschaft abgelegt", "abnahme": "Abnahme abgelegt"}.get(art, "Datei abgelegt"), pfad, p["id"], p["name"], "")
    return jsonify(ok=True, pfad=pfad)


@bp.post("/api/ablage/rechnung")
def rechnung_ablegen():   # ältere Aufrufe: wie /api/ablage/datei mit Art „rechnung“
    b = request.get_json(silent=True) or {}
    b.setdefault("art", "rechnung")
    return _ablegen(b)
