"""Bautagebuch per Sprache (besprochen am 13.11.2026): frei erzählen (Diktierfunktion des iPhones), die KI verteilt den Text auf die
Bereiche des Berichts von heute – Wetter, Anwesende (mit „fehlt“), Arbeitsfortschritt, Mängel, Notizen, Zu erledigen, Weisungen.

Bis zur Freigabe ist das Ergebnis ein Entwurf (reports.extra.diktate) und steht nicht im Bericht. Freigegeben wird – je nach Einstellung
der Person (Bautagebuch → Einstellungen → Diktieren) – sofort am Handy oder später am Rechner (Hinweis im Bautagebuch und To-do auf
der Startseite). Übernommen wird über die vorhandenen Wege (Einträge, Anwesende, Fortschritt) – hier wird nur ausgewertet und gemerkt.
Kein Ton wird gespeichert, nur der erkannte Text.

POST   /api/reports/<r>/diktat            {text, ki?}  → Entwurf {id, text, vorschlag, …}
GET    /api/diktate                       offene Entwürfe der angemeldeten Person (alle Projekte)
PUT    /api/reports/<r>/diktat/<did>      {status: "uebernommen" | "verworfen" | "offen"}
"""
import json
import re
import uuid

from flask import Blueprint, g, jsonify, request

from core import db
from bpcore import ai, plan

bp = Blueprint("diktat", __name__)
BEREICHE = ("notizen", "maengel", "zu_erledigen", "weisungen")

SYSTEM = """Du bist Bauleiter:in-Assistenz und sortierst einen frei diktierten Baustellenbericht (Spracherkennung, Fehler möglich) in die Bereiche eines Bautagesberichts.
Antworte nur mit JSON in genau dieser Form:
{"wetter": {"weather": "", "temp": ""},
 "anwesend": [{"firma": "", "kopf": 0, "taetigkeit": ""}],
 "fehlt": [""],
 "fortschritt": [{"nr": 0, "pct": 0}],
 "notizen": [""], "maengel": [""], "zu_erledigen": [""], "weisungen": [""],
 "unsicher": [""]}
Regeln:
- Firmen: nimm den Namen aus der Liste FIRMEN, wenn gemeint (auch bei Hörfehlern, z. B. „Wilmi“ → „Björn Wilhelmi Elektrotechnik“). Sonst den gesagten Namen und zusätzlich in „unsicher“.
- „kopf“ = Anzahl Personen (Zahl, 0 wenn nicht gesagt). „taetigkeit“ kurz, ohne Firmennamen.
- „fehlt“: Firmen, die laut Text nicht da waren.
- „fortschritt“: nur Vorgänge aus der Liste VORGAENGE (nr), pct 0–100 („zur Hälfte“ = 50, „fertig“ = 100).
- wetter.weather ein Wort wie sonnig, bewölkt, Regen, Schnee, Nebel; wetter.temp nur die Zahl in °C als Text. Leer lassen, wenn nicht gesagt.
- Mängel als vollständiger kurzer Satz (was, wo). Was jemand tun soll → „zu_erledigen“; Anordnungen an Firmen → „weisungen“; alles Übrige → „notizen“.
- Nichts erfinden. Leere Listen weglassen ist erlaubt."""


def _rep(c, r):
    return c.execute("SELECT * FROM reports WHERE id=?", (r,)).fetchone()


def _extra(rep):
    try:
        return json.loads(rep["extra"] or "{}") or {}
    except ValueError:
        return {}


def _kontext(c, rep):
    """Firmen (erwartet laut Plan, Beteiligte, Firmen aus dem Bauzeitenplan) und Vorgänge des Tages für die KI."""
    firmen, vg = [], []
    try:
        with c.savepoint():
            firmen = [x["firma"] for x in plan.soll_ist(c, rep["id"], rep["project_id"], rep["date"])]
    except Exception:   # ohne Bauzeitenplan
        pass
    try:
        with c.savepoint():
            from modules.soll import _fs_liste
            vg = [{"nr": k + 1, "vorgang": x["vorgang"], "firma": x["firma"], "gantt_id": x["gantt_id"], "uid": x["uid"], "ist": x.get("ist")}
                  for k, x in enumerate(_fs_liste(c, rep)[0])]
    except Exception:   # ohne Bauzeitenplan
        pass
    for x in c.execute("SELECT DISTINCT text FROM items WHERE kind='anwesende' AND report_id IN (SELECT id FROM reports WHERE project_id=?) LIMIT 200",
                       (rep["project_id"],)).fetchall():
        t = (x["text"] or "").strip()
        if t and t not in firmen:
            firmen.append(t)
    return firmen[:150], vg[:120]


def _sauber(v, vg):
    """KI-Antwort auf das erwartete Format bringen (nichts übernehmen, was nicht passt)."""
    s = lambda x, n=300: " ".join(str(x or "").split())[:n]   # noqa: E731
    w = v.get("wetter") if isinstance(v.get("wetter"), dict) else {}
    out = {"wetter": {"weather": s(w.get("weather"), 40), "temp": (re.search(r"-?\d+(?:[.,]\d+)?", s(w.get("temp"), 20)) or [""])[0]},
           "anwesend": [], "fehlt": [s(x, 200) for x in (v.get("fehlt") or []) if s(x)][:40],
           "fortschritt": [], "unsicher": [s(x, 200) for x in (v.get("unsicher") or []) if s(x)][:20]}
    for a in (v.get("anwesend") or [])[:60]:
        if isinstance(a, dict) and s(a.get("firma")):
            k = a.get("kopf")
            out["anwesend"].append({"firma": s(a.get("firma"), 200), "kopf": int(k) if isinstance(k, (int, float)) and 0 < k < 500 else None,
                                    "taetigkeit": s(a.get("taetigkeit"), 300)})
    for f in (v.get("fortschritt") or [])[:60]:
        if isinstance(f, dict) and isinstance(f.get("nr"), int) and 1 <= f["nr"] <= len(vg) and isinstance(f.get("pct"), (int, float)):
            x = vg[f["nr"] - 1]
            out["fortschritt"].append({"gantt_id": x["gantt_id"], "uid": x["uid"], "vorgang": x["vorgang"], "firma": x["firma"], "pct": max(0, min(100, int(round(f["pct"]))))})
    for k in BEREICHE:
        out[k] = [s(x, 1000) for x in (v.get(k) or []) if isinstance(x, str) and s(x)][:40]
    return out


@bp.post("/api/reports/<int:r>/diktat")
def auswerten(r):
    b = request.get_json(silent=True) or {}
    text = str(b.get("text") or "").strip()[:8000]
    if len(text) < 3:
        return jsonify(error="Bitte erst etwas diktieren."), 400
    with db.tx() as c:
        rep = _rep(c, r)
        if not rep:
            return jsonify(error="Bericht nicht gefunden"), 404
        firmen, vg = _kontext(c, rep)
        ki = ai.choice_of(g.user, c)
        if b.get("ki") == "intern" or ki == "intern":   # „intern“ (Regeln ohne KI) kann nicht sortieren → die interne KI im Büro
            ki = "ollama"
    frage = (f"FIRMEN: {json.dumps(firmen, ensure_ascii=False)}\nVORGAENGE: {json.dumps([{k: x[k] for k in ('nr', 'vorgang', 'firma', 'ist')} for x in vg], ensure_ascii=False)}\n"
             f"DIKTAT ({rep['date']}):\n{text}")
    try:
        v = ai.ask_json(ki, SYSTEM, frage, max_tokens=1800)
    except ai.AIError as e:
        return jsonify(error=f"Die KI ({ki}) konnte das Diktat nicht auswerten: {e}"), 502
    E = {"id": uuid.uuid4().hex[:10], "text": text, "vorschlag": _sauber(v or {}, vg), "ki": ki, "von": g.user["name"], "uid": g.user["id"],
         "wann": db.now(), "status": "offen"}
    with db.tx() as c:
        rep = _rep(c, r)
        ex = _extra(rep)
        ex["diktate"] = [x for x in ex.get("diktate") or [] if x.get("status") == "offen"][-19:] + [E]
        c.execute("UPDATE reports SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), r))
    return jsonify(E)


@bp.put("/api/reports/<int:r>/diktat/<did>")
def status(r, did):
    st = (request.get_json(silent=True) or {}).get("status")
    if st not in ("uebernommen", "verworfen", "offen"):
        return jsonify(error="Ungültige Angabe"), 400
    with db.tx() as c:
        rep = _rep(c, r)
        if not rep:
            return jsonify(error="Bericht nicht gefunden"), 404
        ex = _extra(rep)
        x = next((y for y in ex.get("diktate") or [] if y.get("id") == did), None)
        if not x:
            return jsonify(error="Diesen Entwurf gibt es nicht mehr."), 404
        x["status"] = st
        if st != "offen":
            x["erledigt"] = {"von": g.user["name"], "wann": db.now()}
        c.execute("UPDATE reports SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), r))
    return jsonify(ok=True)


def offene(c, uid):
    """Offene Diktat-Entwürfe einer Person – für den Hinweis im Bautagebuch und das To-do auf der Startseite."""
    out = []
    for rep in c.execute("SELECT r.id, r.project_id, r.date, r.extra, p.name AS projekt FROM reports r JOIN projects p ON p.id=r.project_id "
                         "WHERE r.extra LIKE '%\"diktate\"%' ORDER BY r.date DESC LIMIT 200").fetchall():
        for x in _extra(rep).get("diktate") or []:
            if x.get("status") == "offen" and x.get("uid") == uid:
                out.append({"rid": rep["id"], "pid": rep["project_id"], "datum": rep["date"], "projekt": rep["projekt"], **{k: x.get(k) for k in ("id", "wann", "text", "vorschlag", "von")}})
    return out


@bp.get("/api/diktate")
def liste():
    with db.tx() as c:
        return jsonify(offene(c, g.user["id"]))
