"""Änderungen an den Bauteilen des Gebäudemodells (GO 20.11.2026, Mock „Gebäudemodell – neue Seite Bauteile“, A–F in den Einstellungen).

Jede Speicherung des Modells (modell.schreiben) vergleicht die Bauteilliste vorher und nachher und merkt je Zeile und Feld vorher → nachher,
wer, wann und mit welcher App (Umgebung APP des Containers) – Tabelle pm_aenderung. Daraus zeichnet das Gebäudemodell die Färbung
„Änderungen“ und den Zeitschieber („graues Gebäude, zurückziehen zeigt, was sich geändert hat“).

art:  bauteil   Antwort, Aufbau, Ausführung, Dicke, Menge … einer Zeile
      plan      dasselbe, aber mit einem neuen Planstand (IFC eingelesen / gelten lassen) – auch neue und entfallene Zeilen
      raum      Räume geändert            assistent  Angaben des Planungsassistenten geändert
Einstellungen (bp_store „gm:einst“, Verwaltung → Einstellungen → Gebäudemodell): A was zählt · B Farbe · C Zurücknehmen · D Material ·
E Liste · F Wände spreizen. Der Kern liefert alles; welche Arten gezeigt werden (A), filtert die Oberfläche.

merken(c, pid, alt, neu, wer)   aus modell.schreiben · liste(c, pid) · zurueck(c, pid, aid, wer, lesen, schreiben)
einst(c) / einst_setzen(c, werte, wer) · routen(bp, mit, _uid, lesen, schreiben)
"""
import json
import os
from datetime import datetime

from .jsonwert import lies as _j

EINST = {"a": "a1", "b": "b1", "c": "c2", "d": "d2", "e": "e1", "f": "f1"}   # sinnvolle Vorgabe (20.11.2026): Bauteile · je App · mit Zurücknehmen · Material wählen · Liste nach Färbung · alle Wände
ERLAUBT = {"a": ("a1", "a2", "a3"), "b": ("b1", "b2", "b3"), "c": ("c1", "c2"), "d": ("d1", "d2"), "e": ("e1", "e2"), "f": ("f1", "f2")}
FELDER = {"kg": "Art", "status": "Maßnahme", "vorlage": "Aufbau", "wahl": "Ausführung", "dicken": "Schichtdicke", "ausf": "Ausführung", "menge": "Menge", "name": "Name", "uw": "Uw"}
ZURUECK = ("kg", "status", "vorlage", "wahl", "dicken", "ausf", "menge", "name", "uw")   # Felder, die sich zurücknehmen lassen (C2)
MASS = {"offen": "noch offen", "neu": "neu", "erneuern": "erneuern", "instandsetzen": "instandsetzen", "bleibt": "bleibt", "abbruch": "Abbruch", "pruefen": "prüfen"}
HOECHSTENS = 400   # Zeilen je Speicherung – ein großes IFC soll die Liste nicht fluten


def _jetzt():
    return datetime.now().isoformat(timespec="seconds")


def _wert(z, f):
    v = z.get(f)
    if f == "menge":
        return round(float(v or 0), 2)
    if f in ("wahl",):
        return list(v or [])
    if f in ("dicken", "ausf"):
        return dict(v or {})
    return v if v not in (None, "") else ""


def _text(z, f, v):
    """Lesbarer Wert für die Liste (nicht zum Zurücknehmen – dafür steht der Rohwert in vorher)."""
    if f == "status":
        return MASS.get(v, v or "–")
    if f == "kg":
        from .bauteilliste import ARTEN
        return ARTEN.get(str(v), str(v or "–"))
    if f == "vorlage":
        return (z.get("kurz") or v or "–")[:120]
    if f == "dicken":
        return ", ".join(f"Schicht {k}: {d} cm" for k, d in sorted(v.items())) or "wie die Vorlage"
    if f == "menge":
        return f"{v:g} {z.get('einheit') or ''}".strip()
    if f in ("wahl", "ausf"):
        return "geändert" if v else "wie die Vorlage"
    return str(v or "–")[:120]


def merken(c, pid, alt, neu, wer):
    """Bauteilliste alt ↔ neu vergleichen und die Unterschiede ablegen. Erstes Füllen (vorher leer) zählt nicht."""
    LA, LN = (alt or {}).get("bauteilliste") or {}, (neu or {}).get("bauteilliste") or {}
    A = {z["id"]: z for z in LA.get("zeilen") or [] if isinstance(z, dict) and z.get("id")}
    N = {z["id"]: z for z in LN.get("zeilen") or [] if isinstance(z, dict) and z.get("id")}
    app, jetzt, R = os.environ.get("APP", ""), _jetzt(), []
    plan = ((LA.get("quelle") or {}).get("planstand") != (LN.get("quelle") or {}).get("planstand")) and bool(A)
    art = "plan" if plan else "bauteil"
    if plan:
        R.append(("", [], "plan", "planstand", "", "", f"Planstand „{(LN.get('quelle') or {}).get('name') or 'neu'}“ gilt"))
    if A:
        for zid, z in N.items():
            a = A.get(zid)
            if a is None:
                R.append((zid, z.get("ids") or [], art, "neu", "", "", f"neu: {z.get('name') or zid}"))
                continue
            for f, t in FELDER.items():
                va, vn = _wert(a, f), _wert(z, f)
                if va != vn:
                    R.append((zid, z.get("ids") or [], art, f, json.dumps(va, ensure_ascii=False), json.dumps(vn, ensure_ascii=False),
                              f"{t}: {_text(a, f, va)} → {_text(z, f, vn)}"))
        for zid, a in A.items():
            if zid not in N:
                R.append((zid, a.get("ids") or [], art, "weg", "", "", f"entfällt: {a.get('name') or zid}"))
    if json.dumps(LA.get("raeume") or [], sort_keys=True) != json.dumps(LN.get("raeume") or [], sort_keys=True) and LA.get("raeume") and not plan:
        R.append(("", [], "raum", "raeume", "", "", f"Räume geändert ({len(LN.get('raeume') or [])} Räume)"))
    sa, sn = (alt or {}).get("assistent") or {}, (neu or {}).get("assistent") or {}
    if sa and sa != sn:
        k = sorted(x for x in set(sa) | set(sn) if sa.get(x) != sn.get(x))
        R.append(("", [], "assistent", "assistent", "", "", "Angaben des Assistenten geändert" + (f" ({', '.join(k[:6])})" if k else "")))
    for zid, ids, art_, f, va, vn, t in R[:HOECHSTENS]:
        c.execute("INSERT INTO pm_aenderung(project_id, zeile, ids, art, feld, vorher, nachher, text, wann, wer, app) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                  (pid, str(zid)[:200], json.dumps([i for i in ids if isinstance(i, int)][:500]), art_, f, va[:4000], vn[:4000], t[:300], jetzt, (wer or "")[:80], app[:40]))
    return len(R)


def liste(c, pid, n=600):
    R = c.execute("SELECT id, zeile, ids, art, feld, text, wann, wer, app, zurueck FROM pm_aenderung WHERE project_id=? ORDER BY id DESC LIMIT ?", (pid, n)).fetchall()
    return [{"id": r["id"], "zeile": r["zeile"], "ids": _j(r["ids"], []), "art": r["art"], "feld": r["feld"], "text": r["text"], "wann": r["wann"],
             "wer": r["wer"], "app": r["app"], "zurueck": bool(r["zurueck"]), "kann": r["feld"] in ZURUECK and not r["zurueck"]} for r in R]


def zurueck(c, pid, aid, wer, lesen, schreiben):
    """Eine Änderung zurücknehmen (C2): das Feld bekommt den Wert von vorher – selbst wieder eine Änderung (mit Rückgängig in der Seite)."""
    from . import bauteilliste
    r = c.execute("SELECT * FROM pm_aenderung WHERE id=? AND project_id=?", (aid, pid)).fetchone()
    if not r or r["feld"] not in ZURUECK or r["zurueck"]:
        return None
    m = lesen(c, pid)["modell"]
    L = m.get("bauteilliste") or {}
    v = _j(r["vorher"], None)
    neu = {r["feld"]: v}
    if r["feld"] == "vorlage":
        z = next((x for x in L.get("zeilen") or [] if x.get("id") == r["zeile"]), None)
        if z is None:
            return None
        if not v:   # vorher ohne Aufbau
            z.update(vorlage="", wahl=[], kurz="")
            neu = {}
    elif r["feld"] in ("dicken", "ausf", "wahl"):
        z = next((x for x in L.get("zeilen") or [] if x.get("id") == r["zeile"]), None)
        if z is None or not z.get("vorlage"):
            return None
    if neu and not bauteilliste.setzen(c, L, r["zeile"], neu):
        return None
    m["bauteilliste"] = L
    schreiben(c, pid, m, wer)
    c.execute("UPDATE pm_aenderung SET zurueck=1 WHERE id=?", (aid,))
    return True


def einst(c):
    r = c.execute("SELECT data FROM bp_store WHERE key='gm:einst'").fetchone()
    d = _j(r["data"], {}) if r else {}
    return {k: d.get(k) if d.get(k) in ERLAUBT[k] else v for k, v in EINST.items()}


def einst_setzen(c, werte, wer):
    E = einst(c)
    E.update({k: v for k, v in (werte or {}).items() if k in ERLAUBT and v in ERLAUBT[k]})
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES('gm:einst',?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by",
              (json.dumps(E), _jetzt(), (wer or "")[:80]))
    return E


def routen(bp, mit, _uid, lesen, schreiben):
    from flask import jsonify, request

    from . import db, rechte

    @bp.get("/api/bp/modell/<int:pid>/aenderungen")
    def modell_aenderungen(pid):
        return mit(pid, lambda c, wer: jsonify(aenderungen=liste(c, pid), einst=einst(c)))

    @bp.post("/api/bp/modell/<int:pid>/aenderungen/<int:aid>/zurueck")
    def modell_aenderung_zurueck(pid, aid):
        def tun(c, wer):
            if not zurueck(c, pid, aid, wer, lesen, schreiben):
                return jsonify(error="Diese Änderung lässt sich nicht mehr zurücknehmen (Zeile oder Aufbau gibt es nicht mehr)."), 409
            return jsonify(dict(lesen(c, pid), aenderungen=liste(c, pid)))
        return mit(pid, tun)

    @bp.route("/api/bp/modell/einst", methods=["GET", "PUT"])
    def modell_einst():
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":
                if rechte.stufe(u, "buero") != "aendern":
                    return jsonify(error="Ändern darf nur, wer in der Verwaltung „Büro & Standort“ ändern darf."), 403
                return jsonify(einst_setzen(c, (request.get_json(silent=True) or {}).get("werte"), u.get("username") or ""))
            return jsonify(einst(c))
