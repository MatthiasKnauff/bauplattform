"""Belege (z. B. Rechnungen aus „Ausschreibung & Abrechnung“) im Projektordner auf dem Server ablegen.

POST /api/ablage/rechnung {project_id, firma, name, datei (Base64)}
Der Ordner wird wie bei Plänen und Bautagebuch selbst gesucht: im Projektordner (bis drei Ebenen tief) der Ordner
„… Rechnungsprüfung“ (sonst „… Rechnung…“), darin der Ordner der Firma („A481 Assenmacher“). Fehlt einer, wird er angelegt
(„<Kürzel> Rechnungsprüfung“ im Projektordner, „<Kürzel> <Firma>“ darin).
"""
import base64, json, re
from datetime import datetime
from flask import Blueprint, g, jsonify, request
from core import audit, db, remote, sync
from bpcore import dateiname
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
    "honorar": (["honorar", "architektenvertr", "vertr"], "Honorar + Vertrag", ""),
    "vertrag": (["auftr", "bauvertr", "vertr", "vergabe", "angebot"], "Aufträge + Verträge", "gewerk"),
    "bauantrag": (["bauantrag", "genehmig", "leistungsphasen 1-4"], "Bauantrag", ""),   # eigene Unterlagen des Bauantrags   # Bauverträge / Auftragsschreiben je Gewerk   # Honorarrechnungen und Architektenvertrag des Büros
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


# ---- Dateiname wie im Zielordner (bpcore.dateiname); von Hand getippte Namen werden je Ordner als Muster gemerkt
def _schluessel(base, ordner):
    return re.sub(r"\s+", " ", "/".join(base + ordner)).lower()[:400]


def _gemerkt(c):
    r = c.execute("SELECT data FROM bp_store WHERE key='ablagenamen'").fetchone()
    try:
        d = json.loads(r["data"]) if r else {}
    except (TypeError, ValueError):
        d = {}
    return d if isinstance(d, dict) else {}


def _werte(p, b):
    return {"projektnr": sync.code_of(p), "firma": (b.get("firma") or "").strip(), "datum": (b.get("datum") or "")[:10], "nr": (b.get("nr") or "").strip()}


def name_vorschlag(t, base, ordner, p, b):
    """(Name, Quelle): gemerktes Muster des Ordners → wie die Dateien im Ordner → Vorgabe der App (b.name)."""
    standard = remote.clean(b.get("name") or "Dokument.pdf")
    endung = standard.rpartition(".")[2].lower() if "." in standard else "pdf"
    w = _werte(p, b)
    try:
        dateien = t.listdir("/".join(base + ordner))
    except Exception:
        dateien = []
    with db.tx() as c:
        m = _gemerkt(c).get(_schluessel(base, ordner))
    if m:
        n = dateiname.fuellen(m, w, [x["name"] for x in dateien], endung)
        if n:
            return remote.clean(n), "gemerkt"
    m, n = dateiname.aus_ordner(dateien, w, endung)
    if n:
        return remote.clean(n), "ordner"
    return standard, "standard"


def name_merken(base, ordner, p, b, name):
    """Von Hand vergebenen Namen als Muster für diesen Ordner merken (nur, wenn etwas Veränderliches darin steckt)."""
    m = dateiname.muster(name, _werte(p, b))
    if not m:
        return
    z = datetime.now().isoformat(timespec="seconds")
    with db.tx() as c:
        d = _gemerkt(c)
        d[_schluessel(base, ordner)] = m
        if len(d) > 2000:
            d = dict(list(d.items())[-2000:])
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated",
                  ("ablagenamen", json.dumps(d, ensure_ascii=False), z, g.user["name"] if getattr(g, "user", None) else "ablage"))


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
        try:
            hand = json.loads(request.args.get("ordner") or "null")
        except ValueError:
            hand = None
        if isinstance(hand, list) and hand:   # Ordner von Hand gewählt: nur den Namen dazu
            teile = [(remote.clean(str(x)), True) for x in hand if str(x).strip()]
        else:
            teile = _vorschlag(t, base, p, request.args.get("art") or "rechnung", request.args.get("firma") or "", request.args.get("gewerk") or "")
        name, quelle = name_vorschlag(t, base, [x for x, _ in teile], p, request.args) if request.args.get("name") else ("", "")
    except Exception as e:
        return jsonify(ok=False, error=f"Ablage nicht erreichbar: {sync._msg(e)}")
    return jsonify(ok=True, projekt="/".join(base), ordner=[x for x, _ in teile], neu=[not v for _, v in teile], name=name, name_quelle=quelle)


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
    """Unterordner zum Durchklicken (Pfad relativ zum Projektordner, Teile mit / getrennt); dateien=1: dazu die Dateien des Ordners."""
    pid = request.args.get("project_id", type=int)
    t, base, p, err = _projekt(pid) if pid else (None, None, None, "Projekt fehlt")
    if err:
        return jsonify(ok=False, error=err)
    rel = [remote.clean(x) for x in (request.args.get("pfad") or "").split("/") if x.strip()]
    try:
        ds = sorted(t.dirs(base + rel)) if t.exists("/".join(base + rel)) or not rel else []
    except Exception as e:
        return jsonify(ok=False, error=f"Ablage nicht erreichbar: {sync._msg(e)}")
    if request.args.get("dateien") == "1":
        try:
            fs = sorted(({"name": e["name"], "groesse": e["size"], "mtime": e["mtime"]} for e in t.listdir("/".join(base + rel))
                         if not e["dir"] and not e["name"].startswith((".", "~", "$"))), key=lambda e: e["name"].lower())
        except Exception as e:
            return jsonify(ok=False, error=f"Ablage nicht erreichbar: {sync._msg(e)}")
        return jsonify(ok=True, projekt="/".join(base), pfad=rel, ordner=[d for d in ds if not d.startswith((".", "~", "$"))], dateien=fs[:500])
    return jsonify(ok=True, projekt="/".join(base), pfad=rel, ordner=ds)


@bp.post("/api/ablage/datei")
def datei_ablegen():
    """{project_id, art, firma, gewerk, name, datei (Base64), ordner (optional: Teile relativ zum Projektordner, sonst Vorschlag),
    wie_ordner (Name wie die Dateien im Ordner; datum, nr dazu), name_hand (von Hand – wird je Ordner als Muster gemerkt)}"""
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
    if isinstance(b.get("unter"), list):   # Unterordner im vorgeschlagenen Ordner (z. B. „Versand 2026-11-13/Anlagen“ beim LV-Versand)
        ordner = ordner + [remote.clean(str(x)) for x in b["unter"][:3] if str(x).strip() and str(x).strip() not in (".", "..")]
    if (b.get("name_hand") or "").strip():   # von Hand vergeben: so ablegen und fürs nächste Mal merken
        name = remote.clean(b["name_hand"].strip())
        if "." not in name[-6:] and "." in (b.get("name") or ""):
            name += "." + b["name"].rpartition(".")[2]
        try:
            name_merken(base, ordner, p, b, name)
        except Exception:
            pass
    elif b.get("wie_ordner"):   # Belege der AVA: Name wie die Dateien im Ordner (sonst der Name der App)
        try:
            name, _q = name_vorschlag(t, base, ordner, p, b)
        except Exception:
            name = remote.clean(b.get("name") or "Dokument.pdf")
    else:
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
        audit.log(c, g.user["name"], "export", {"rechnung": "Rechnung abgelegt", "aufmass": "Aufmaß abgelegt", "angebot": "Angebot abgelegt", "lv": "LV abgelegt", "buergschaft": "Bürgschaft abgelegt", "abnahme": "Abnahme abgelegt", "honorar": "Honorar/Vertrag abgelegt", "vertrag": "Bauvertrag abgelegt", "bauantrag": "Bauantrag-Unterlage abgelegt"}.get(art, "Datei abgelegt"), pfad, p["id"], p["name"], "")
    return jsonify(ok=True, pfad=pfad, testserver=remote.NUR_LESEN)   # Testserver: nichts geschrieben – Aufrufer, die nur den Verweis merken, wissen es so


@bp.post("/api/ablage/rechnung")
def rechnung_ablegen():   # ältere Aufrufe: wie /api/ablage/datei mit Art „rechnung“
    b = request.get_json(silent=True) or {}
    b.setdefault("art", "rechnung")
    return _ablegen(b)


_BAUM = {}   # Ordnerbaum je Projekt: {pid: (Zeit, Ergebnis)} – kurz zwischengespeichert, beim Ablegen mehrerer Dateien nur einmal lesen


@bp.get("/api/ablage/ordnerbaum")
def ablage_ordnerbaum():
    """Alle Ordner des Projektordners (bis 6 Ebenen, höchstens 3000, ca. 10 s) – für „Datei ablegen“ in allen Apps."""
    import time
    pid = request.args.get("project_id", type=int)
    t, base, p, err = _projekt(pid) if pid else (None, None, None, "Projekt fehlt")
    if err:
        return jsonify(ok=False, error=err)
    alt = _BAUM.get(pid)
    if alt and time.time() - alt[0] < 300 and not request.args.get("neu"):
        return jsonify(alt[1])
    out, t0, ebene = [], time.time(), [[]]
    try:
        for _ in range(6):
            neu = []
            for rel in ebene:
                for d in sorted(t.dirs(base + rel), key=str.lower):
                    if d.startswith((".", "~", "$")):
                        continue
                    out.append("/".join(rel + [d])); neu.append(rel + [d])
                if len(out) >= 3000 or time.time() - t0 > 10:
                    break
            ebene = neu
            if not ebene or len(out) >= 3000 or time.time() - t0 > 10:
                break
    except Exception as e:
        return jsonify(ok=False, error=f"Ablage nicht erreichbar: {sync._msg(e)}")
    res = {"ok": True, "basis": "/".join(base), "kuerzel": sync.code_of(p) if p else "", "ordner": sorted(out, key=str.lower)}
    _BAUM[pid] = (time.time(), res)
    return jsonify(res)
