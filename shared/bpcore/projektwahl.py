"""Projekt wählen (GO 19.11.2026, Mock „Projekt wählen – neu“: A1 B1 C1 D1 E1) – was das Fenster über die Projektliste hinaus braucht.

A1  ★ Favoriten (von Hand) und „Zuletzt benutzt“ (die letzten 5) je Person in users.extra (projekte_fav, projekte_zuletzt);
    „zuletzt“ merkt sich der Kern, sobald jemand ein Projekt wählt (PUT /api/bp/projekt → zuletzt_merken).
B1  Zähler je Projekt wie überall – rot = fällig, grau = offen (aus der Liste „Zu tun“: todo.automatisch + todo.manuell) – und der Stand:
    Bauphase aus dem gültigen Bauzeitenplan (Modell „termine“), sonst der Schritt im Honorar. Erst beim Öffnen des Fensters, eine Abfrage.

GET /api/bp/projekte/stand → {pid: {rot, grau, stand}}   ·   PUT /api/bp/projekte/<pid>/fav {an}
Oberfläche: Baustein bp/projektwahl.js (BPHead.projektWahl), Projekte in Strg+K (bp/suche.js).
"""
import json
from datetime import date

ZULETZT_MAX = 5
HONORAR = {"anfrage": "Honorar: Anfrage", "angebot": "Honorar: Angebot", "beauftragt": "beauftragt", "vertrag": "Vertrag", "abrechnung": "in Abrechnung",
           "abgeschlossen": "abgeschlossen"}


def _extra(c, uid):
    r = c.execute("SELECT extra FROM users WHERE id=?", (uid,)).fetchone()
    try:
        return json.loads((r and r["extra"]) or "{}") or {}
    except (ValueError, TypeError):
        return {}


def _ints(L):
    return [int(x) for x in (L or []) if isinstance(x, int) or (isinstance(x, str) and x.isdigit())]


def favoriten(c, uid):
    return _ints(_extra(c, uid).get("projekte_fav"))


def zuletzt(c, uid):
    return _ints(_extra(c, uid).get("projekte_zuletzt"))[:ZULETZT_MAX]


def _schreiben(c, uid, ex):
    c.execute("UPDATE users SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), uid))


def zuletzt_merken(c, uid, pid):
    if not isinstance(pid, int):
        return
    ex = _extra(c, uid)
    L = [pid] + [x for x in _ints(ex.get("projekte_zuletzt")) if x != pid]
    ex["projekte_zuletzt"] = L[:ZULETZT_MAX]
    _schreiben(c, uid, ex)


def fav_setzen(c, uid, pid, an):
    ex = _extra(c, uid)
    L = [x for x in _ints(ex.get("projekte_fav")) if x != pid]
    if an:
        L.append(pid)
    ex["projekte_fav"] = L[:100]
    _schreiben(c, uid, ex)
    return L


def zaehler(eintraege, heute=None):
    """Einträge der Liste „Zu tun“ → {pid: [rot, grau]} (Hinweise zur Kenntnis zählen nicht, Erledigtes nicht)."""
    h = (heute or date.today()).isoformat()
    out = {}
    for e in eintraege:
        pid = e.get("pid")
        if not pid or e.get("info") or e.get("status") not in (None, "offen") or e.get("spaeter"):
            continue
        z = out.setdefault(pid, [0, 0])
        z[0 if (e.get("faellig") or "9999") <= h else 1] += 1
    return out


def stand_aus_termine(termine, heute=None):
    """Bauphase von heute (oder die nächste / zuletzt beendete) aus den Phasen des gültigen Bauzeitenplans."""
    from .rueckweg import PH
    h = (heute or date.today()).isoformat()
    P = [(k, v) for k, v in ((termine or {}).get("phasen") or {}).items() if isinstance(v, dict) and v.get("von") and v.get("bis")]
    if not P:
        return ""
    jetzt = [(k, v) for k, v in P if v["von"] <= h <= v["bis"]]
    if jetzt:
        k, v = min(jetzt, key=lambda x: x[1]["bis"])
        return f"{PH.get(k, k)} bis {v['bis'][8:10]}.{v['bis'][5:7]}."
    kommt = sorted((v["von"], k) for k, v in P if v["von"] > h)
    if kommt:
        return f"{PH.get(kommt[0][1], kommt[0][1])} ab {kommt[0][0][8:10]}.{kommt[0][0][5:7]}."
    return "Bau abgeschlossen"


def stand(c, u, pids):
    """{pid: {rot, grau, stand}} für die Projekte, die u sieht."""
    from . import todo
    try:
        auto, _ = todo.automatisch(c, u)
    except Exception:   # noqa: BLE001 – ohne Zähler weiter
        auto = []
    Z = zaehler(auto + todo.manuell(c, u, erledigte_tage=0))
    H = {}
    for r in c.execute("SELECT project_id, status FROM honorar_auftrag ORDER BY geaendert"):
        H[r["project_id"]] = r["status"]
    T = {}   # nur „termine“ aus dem Modell – nicht das ganze (große) Modell je Projekt lesen
    for r in c.execute("SELECT project_id, (data::json)->>'termine' AS t FROM pm_modell"):
        try:
            T[r["project_id"]] = json.loads(r["t"] or "{}") or {}
        except (ValueError, TypeError):
            pass
    out = {}
    for pid in pids:
        st = stand_aus_termine(T.get(pid))
        z = Z.get(pid, [0, 0])
        out[pid] = {"rot": z[0], "grau": z[1], "stand": st or HONORAR.get(H.get(pid) or "", "")}
    return out


def routen(bp, user):
    from flask import jsonify, request
    from . import db, rechte

    @bp.get("/api/bp/projekte/stand")
    def bp_projekte_stand():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            pids = [r["id"] for r in c.execute("SELECT id FROM projects WHERE archived=0") if rechte.can_see(c, u, r["id"])]
            return jsonify({str(k): v for k, v in stand(c, u, pids).items()})

    @bp.put("/api/bp/projekte/<int:pid>/fav")
    def bp_projekte_fav(pid):
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if not rechte.can_see(c, u, pid):
                return jsonify(error="Kein Zugriff auf dieses Projekt."), 403
            return jsonify(fav=fav_setzen(c, u["id"], pid, bool((request.get_json(silent=True) or {}).get("an"))))
