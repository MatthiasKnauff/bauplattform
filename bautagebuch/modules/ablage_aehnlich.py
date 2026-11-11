"""Ablegen: ähnliche Ordner erkennen und zusammenführen (nur am PC gefragt – Baustein head/ablegen.js).

GET  /api/ablage/aehnlich?project_id=&ordner=a/b&tiefe=1..3   Kandidaten: der Ordner laut Projektvorlage (Vorschlag, auch wenn er
                                                               fehlt), der gewählte Ordner und ähnlich heißende Ordner bis zur Tiefe
POST /api/ablage/zusammenfuehren {project_id, ziel, quellen, leere_loeschen}   Inhalt der Quellen in den Zielordner verschieben
POST /api/ablage/zurueck {project_id, schritte}                Verschiebung zurückdrehen (Rückgängig)
Ähnlich = gleicher Name ohne Kürzel und Gliederungsnummer, Umlaute und Schreibweise egal, feste Synonyme (Fotos/Bilder …),
sonst sehr ähnliche Schreibweise. Verschoben wird nur innerhalb des Projektordners; gleichnamige Dateien bekommen „(2)“, inhaltlich
gleiche bleiben im alten Ordner (nichts wird gelöscht). Leere Ordner werden nur auf Wunsch entfernt. Testserver: nichts wird geändert.
"""
import difflib
import hashlib
import re
import time

from flask import Blueprint, g, jsonify, request

from core import audit, db, ordnerschema as osch, remote, sync
from modules.ablage import _projekt

bp = Blueprint("ablage_aehnlich", __name__)

SYNONYME = [("fotos", "bilder", "photos", "fotodokumentation"), ("plaene", "zeichnungen", "planung", "plan"),
            ("schriftverkehr", "korrespondenz", "post", "briefe", "schreiben"), ("rechnungen", "re", "rechnung", "abrechnung", "rechnungspruefung"),
            ("angebote", "angebot", "submission"), ("vertraege", "vertrag", "auftraege", "auftrag"), ("protokolle", "protokoll", "besprechungen"),
            ("maengel", "abnahmen", "abnahme"), ("gutachten", "nachweise"), ("lv", "leistungsverzeichnis", "ausschreibung")]
SYN = {w: g[0] for g in SYNONYME for w in g}


def schluessel(name):
    """Vergleichsform: ohne Kürzel und Gliederungsnummer („A481 05_Schriftverkehr“ → „schriftverkehr“), Synonyme vereinheitlicht."""
    s = osch.stamm(name).lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    s = re.sub(r"^\s*[\d.]+[\s._)-]*", "", s)
    worte = [SYN.get(w, w) for w in re.findall(r"[a-z0-9]+", s)]
    return " ".join(worte)


def aehnlich(a, b):
    if not a or not b:
        return False
    if a == b or set(a.split()) == set(b.split()):
        return True
    return len(a) >= 5 and difflib.SequenceMatcher(None, a, b).ratio() >= 0.86


def _zaehlen(t, pfad, grenze=400, sek=3.0):
    """(Dateien, letzte Änderung) unter pfad – begrenzt, damit große Ordner nicht bremsen."""
    n, zuletzt, t0, offen = 0, 0.0, time.time(), [pfad]
    while offen and n < grenze and time.time() - t0 < sek:
        p = offen.pop()
        for e in t.listdir(p):
            if e["dir"]:
                offen.append(f"{p}/{e['name']}")
            elif not osch.unwichtig(e["name"]):
                n += 1
                zuletzt = max(zuletzt, e.get("mtime") or 0)
    return n, zuletzt, bool(offen) or n >= grenze


def _vorlage_pfad(t, code, k):
    """Pfad (relativ zum Projektordner) des Ordners laut Projektvorlage, dessen Name zum Schlüssel passt – oder None."""
    try:
        from modules.ordner import _ziel as ziel_conf, muster
        t2, conf = ziel_conf()
        _, _, baum = muster(t2, conf)
    except Exception:   # noqa: BLE001 – keine Vorlage auf dem Server: dann gibt es keinen Vorlagen-Vorschlag
        return None
    mk = osch.muster_kuerzel(baum)
    beste = None

    def lauf(knoten, pfad):
        nonlocal beste
        for name, n in knoten.items():
            if not n.get("dir"):
                continue
            p = pfad + [osch.soll_name(name, mk, code)]
            if aehnlich(schluessel(name), k) and (beste is None or len(p) < len(beste)):
                beste = p
            lauf(n.get("kinder") or {}, p)
    lauf(baum, [])
    return beste


@bp.get("/api/ablage/aehnlich")
def api_aehnlich():
    pid = request.args.get("project_id", type=int)
    t, base, p, err = _projekt(pid) if pid else (None, None, None, "Projekt fehlt")
    if err:
        return jsonify(ok=False, error=err)
    gewaehlt = [remote.clean(x) for x in (request.args.get("ordner") or "").split("/") if x.strip()]
    tiefe = max(1, min(3, request.args.get("tiefe", default=2, type=int)))
    if not gewaehlt:
        return jsonify(ok=True, kandidaten=[], schluessel="")
    k = schluessel(gewaehlt[-1])
    code = sync.code_of(p) if p else ""
    try:
        gefunden, ebene = [], [[]]
        for _ in range(tiefe):
            neu = []
            for rel in ebene:
                for d in sorted(t.dirs(base + rel), key=str.lower):
                    if d.startswith((".", "~", "$")):
                        continue
                    if aehnlich(schluessel(d), k):
                        gefunden.append(rel + [d])
                    neu.append(rel + [d])
            ebene = neu[:600]
        vp = _vorlage_pfad(t, code, k)
        kand, gesehen = [], set()

        def dazu(pf, vorlage=False):
            s = "/".join(pf)
            if s in gesehen:
                if vorlage:
                    next(x for x in kand if x["pfad"] == s)["vorlage"] = True
                return
            gesehen.add(s)
            da = t.exists("/".join(base + pf))
            n, zuletzt, mehr = _zaehlen(t, "/".join(base + pf)) if da else (0, 0, False)
            kand.append({"pfad": s, "vorlage": vorlage, "vorhanden": da, "dateien": n, "mehr": mehr, "zuletzt": time.strftime("%d.%m.%Y", time.localtime(zuletzt)) if zuletzt else ""})
        if vp:
            dazu(vp, True)
        dazu(gewaehlt)
        for pf in gefunden[:8]:
            dazu(pf)
    except Exception as e:   # noqa: BLE001
        return jsonify(ok=False, error=f"Ablage nicht erreichbar: {sync._msg(e)}")
    return jsonify(ok=True, kandidaten=kand, schluessel=k, tiefe=tiefe, testserver=remote.NUR_LESEN)


def _innen(base, pfad):
    teile = [remote.clean(x) for x in str(pfad or "").split("/") if x.strip() and x not in (".", "..")]
    return teile


def _gleich(t, a, b):
    try:
        return hashlib.sha256(t.read(a)).digest() == hashlib.sha256(t.read(b)).digest()
    except Exception:   # noqa: BLE001 – nicht lesbar: lieber als verschieden behandeln
        return False


def _verschieben(t, von, nach, log, gleich):
    """Inhalt von „von“ nach „nach“: gleichnamige Ordner zusammenführen, gleichnamige Dateien → „(2)“, gleicher Inhalt → bleibt liegen."""
    da = {e["name"]: e for e in t.listdir(nach)}
    for e in t.listdir(von):
        if osch.unwichtig(e["name"]):
            continue
        quelle = f"{von}/{e['name']}"
        x = da.get(e["name"])
        if e["dir"] and x and x["dir"]:
            _verschieben(t, quelle, f"{nach}/{e['name']}", log, gleich)
            continue
        if not e["dir"] and x and not x["dir"] and x.get("size") == e.get("size") and _gleich(t, quelle, f"{nach}/{e['name']}"):
            gleich.append(quelle)
            continue
        z = osch.frei(e["name"], set(da)); da[z] = e
        t.rename(quelle, f"{nach}/{z}")
        log.append([quelle, f"{nach}/{z}"])


def _leer(t, pfad):
    for e in t.listdir(pfad):
        if e["dir"]:
            if not _leer(t, f"{pfad}/{e['name']}"):
                return False
        elif not osch.unwichtig(e["name"]):
            return False
    return True


@bp.post("/api/ablage/zusammenfuehren")
def api_zusammenfuehren():
    b = request.get_json(silent=True) or {}
    pid = b.get("project_id")
    t, base, p, err = _projekt(pid) if isinstance(pid, int) else (None, None, None, "Projekt fehlt")
    if err:
        return jsonify(error=err), 400
    if remote.NUR_LESEN:
        return jsonify(error="Testserver: auf dem Dateiserver wird nichts verschoben."), 409
    ziel = _innen(base, b.get("ziel"))
    quellen = [q for q in (_innen(base, x) for x in (b.get("quellen") or [])[:10]) if q and q != ziel and ziel[:len(q)] != q]
    if not ziel or not quellen:
        return jsonify(error="Ziel oder Quellen fehlen."), 400
    k = schluessel(ziel[-1])
    if any(not aehnlich(schluessel(q[-1]), k) for q in quellen):   # nur ähnlich heißende Ordner – nichts frei Übergebenes
        return jsonify(error="Nur ähnliche Ordner lassen sich zusammenführen."), 400
    log, gleich, weg = [], [], []
    zb = "/".join(base + ziel)
    try:
        t.mkdir(zb)
        for q in quellen:
            qb = "/".join(base + q)
            if not t.exists(qb):
                continue
            _verschieben(t, qb, zb, log, gleich)
            if b.get("leere_loeschen") and _leer(t, qb):
                for e in t.listdir(qb):   # nur Systemdateien (Thumbs.db …) übrig
                    t.delete(f"{qb}/{e['name']}", e["dir"])
                t.rmdir_if_empty(qb)
                if not t.exists(qb):
                    weg.append("/".join(q))
    except Exception as e:   # noqa: BLE001
        return jsonify(error=f"Abgebrochen: {sync._msg(e)} – bis dahin verschoben: {len(log)} Dateien", schritte=_rel(base, log)), 502
    with db.tx() as c:
        audit.log(c, g.user["name"], "export", "Ordner zusammengeführt", f"{len(log)} Dateien → {'/'.join(ziel)}" + (f", {len(weg)} leere Ordner gelöscht" if weg else ""))
    return jsonify(ok=True, verschoben=len(log), schritte=_rel(base, log), gleich=[x[len('/'.join(base)) + 1:] for x in gleich], geloescht=weg)


def _rel(base, log):
    n = len("/".join(base)) + 1
    return [[a[n:], z[n:]] for a, z in log]


@bp.post("/api/ablage/zurueck")
def api_zurueck():
    """Rückgängig: jede verschobene Datei an ihren alten Platz (nur, wenn dort nichts Neues liegt)."""
    b = request.get_json(silent=True) or {}
    pid = b.get("project_id")
    t, base, p, err = _projekt(pid) if isinstance(pid, int) else (None, None, None, "Projekt fehlt")
    if err:
        return jsonify(error=err), 400
    n = 0
    try:
        for a, z in reversed((b.get("schritte") or [])[:5000]):
            qa, qz = "/".join(base + _innen(base, a)), "/".join(base + _innen(base, z))
            if t.exists(qz) and not t.exists(qa):
                t.rename(qz, qa)
                n += 1
    except Exception as e:   # noqa: BLE001
        return jsonify(error=f"Zurückholen abgebrochen: {sync._msg(e)} ({n} zurück)"), 502
    return jsonify(ok=True, zurueck=n)
