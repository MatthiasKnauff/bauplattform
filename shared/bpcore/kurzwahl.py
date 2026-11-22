"""Kurzwahl der Aufbauten je Büro (Konzept „Gebäudemodell neu“ GN-B, F6-A, Etappe 3 – 22.11.2026).

Im Eigenschaften-Fenster eines Bauteils (bzw. Typs) stehen oben die üblichen Aufbauten des Büros als Knöpfe – ein Klick setzt
Vorlage, Option je Schicht, Dicken und Ausführung. Gruppiert nach der Vorsilbe des Typs (AW, IW, DA, DE, BP, FE, TA …, typen.vorsilbe).

Woher die Knöpfe kommen:
- hat das Büro für eine Gruppe eine Liste gepflegt (bp_store „gm:kurzwahl“, Verwaltung → Einstellungen → Gebäudemodell
  bzw. „＋ in die Kurzwahl“ im Fenster), gilt sie;
- sonst die meistbenutzten Aufbauten aller Projekte (automatisch, `MAX` Stück, gezählt nach Bauteilen mit bauender Antwort).

liste(c)                  {Gruppe: {eintraege: [{vorlage, wahl, dicken, ausf, kurz, n?}], quelle: buero|auto, name}}
setzen(c, gruppe, E, wer) Liste des Büros für eine Gruppe (leer = wieder automatisch)
"""
import json
import time
from datetime import datetime

from . import typen
from .jsonwert import lies as _j

MAX = 6
SCHLUESSEL = "gm:kurzwahl"
_CACHE = {"t": 0, "auto": None}
CACHE_S = 600


def _eintrag(x):
    """Ein Aufbau in der Form der Zeile – gesäubert wie ein Typ (typen.sauber)."""
    if not isinstance(x, dict) or not x.get("vorlage"):
        return None
    t = typen.sauber({"XX-01": x})["XX-01"]
    return {"vorlage": t["vorlage"], "wahl": t["wahl"], "dicken": t["dicken"], "ausf": t["ausf"], "kurz": t["kurz"]}


def schluessel(e):
    return json.dumps([e.get("vorlage"), e.get("wahl") or [], e.get("dicken") or {}, e.get("ausf") or {}], sort_keys=True)


def auto(c):
    """Meistbenutzte Aufbauten aller Projekte je Gruppe – zehn Minuten gemerkt (liest alle Modelle)."""
    if _CACHE["auto"] is not None and time.time() - _CACHE["t"] < CACHE_S:
        return _CACHE["auto"]
    zahl, beisp = {}, {}
    for r in c.execute("SELECT data FROM pm_modell").fetchall():
        L = (_j(r["data"], {}) or {}).get("bauteilliste") or {}
        for z in L.get("zeilen") or []:
            if z.get("entfaellt") or z.get("bereich") not in typen.BEREICH or z.get("status") not in typen.BAUEND or not z.get("vorlage"):
                continue
            e = _eintrag(z)
            if not e:
                continue
            g, k = typen.vorsilbe(z), schluessel(e)
            zahl.setdefault(g, {})
            zahl[g][k] = zahl[g].get(k, 0) + 1
            beisp.setdefault(k, e)
    A = {g: [{**beisp[k], "n": n} for k, n in sorted(Z.items(), key=lambda kv: -kv[1])[:MAX]] for g, Z in zahl.items()}
    _CACHE.update(t=time.time(), auto=A)
    return A


def buero(c):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (SCHLUESSEL,)).fetchone()
    d = _j(r["data"], {}) if r else {}
    return {g: [e for e in (_eintrag(x) for x in (E or [])[:20]) if e] for g, E in (d.items() if isinstance(d, dict) else []) if g in typen.NAME}


def liste(c):
    A, B = auto(c), buero(c)
    out = {}
    for g in sorted(set(A) | set(B)):
        out[g] = {"name": typen.NAME.get(g, g), "quelle": "buero" if B.get(g) else "auto", "eintraege": B.get(g) or A.get(g) or [],
                  **({"auto": A.get(g) or []} if B.get(g) else {})}
    return out


def setzen(c, gruppe, eintraege, wer):
    if gruppe not in typen.NAME:
        return None
    B = buero(c)
    E, seen = [], set()
    for x in (eintraege or [])[:20]:
        e = _eintrag(x)
        if e and schluessel(e) not in seen:
            seen.add(schluessel(e))
            E.append(e)
    if E:
        B[gruppe] = E
    else:
        B.pop(gruppe, None)
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by",
              (SCHLUESSEL, json.dumps(B, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), (wer or "")[:80]))
    return liste(c)


def routen(bp, _uid):
    from flask import jsonify, request

    from . import db, rechte

    @bp.route("/api/bp/modell/kurzwahl", methods=["GET", "PUT"])
    def modell_kurzwahl():
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":
                if rechte.stufe(u, "buero") != "aendern":
                    return jsonify(error="Die Kurzwahl des Büros ändern darf nur, wer in der Verwaltung „Büro & Standort“ ändern darf."), 403
                d = request.get_json(silent=True) or {}
                r = setzen(c, str(d.get("gruppe") or ""), d.get("eintraege"), u.get("username") or "")
                return (jsonify(r), 200) if r is not None else (jsonify(error="Unbekannte Gruppe."), 400)
            return jsonify(liste(c))
