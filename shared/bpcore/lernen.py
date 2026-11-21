"""Der Planungsassistent lernt (GO 16.11.2026, Entwurf „Gebäudemodell als Mitte“, Punkt 6).

Ergänzt jemand in einem Projekt den Assistenten – eine eigene Leistung (assistent.custom), eine Ergänzung zu einem Abschnitt
(assistent.notiz) oder eine von Hand geänderte Dauer (assistent.dur, Name in assistent.durN) –, merkt sich das Büro sie mit dem Profil des Gebäudes (Gebäude, Maßnahmen, Größe). Plant später jemand ein ähnliches
Gebäude, schlägt der Assistent sie vor – mit Herkunft und Häufigkeit („1× in Projekt X“), übernommen wird nur auf Klick.
Gelernt wird nur aus den eigenen Ergänzungen des Büros (keine Katalogtexte), ohne externe KI: Ähnlichkeit über das Profil.

merken(c, pid, modell, wer)      nach dem Speichern des Modells: Ergänzungen des Projekts in pm_lernen nachführen
vorschlaege(c, pid, modell)      passende Ergänzungen aus anderen Projekten
alle(c) · vergessen(c, schluessel)   Liste „Gelerntes“ (bearbeiten heißt: vergessen – im Projekt bleibt die Ergänzung)
"""
import json
import re
from datetime import datetime


from .wert import kurz as _s


def _norm(t):
    t = str(t or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def profil(a):
    """Profil aus den Angaben des Assistenten: Gebäude (ef, mf …), Maßnahmen (nb, um …), Fläche."""
    t = str((a or {}).get("type") or "")
    geb, mass = "", []
    if t.startswith("k:"):
        teile = t.split(":")
        geb = teile[1] if len(teile) > 1 else ""
        mass = [x for x in (teile[2] if len(teile) > 2 else "").split(".") if x]
    elif t:
        geb = "mf" if "mfh" in t else "ef"
        mass = ["nb"] if t.startswith("neubau") else ["um"]
    return {"geb": geb, "mass": mass, "area": float((a or {}).get("area") or 0)}


def eintraege(a):
    """Ergänzungen eines Projekts: eigene Leistungen und Ergänzungen zu Abschnitten → [(art, abschnitt, text, daten)]."""
    out = []
    for x in (a or {}).get("custom") or []:
        if isinstance(x, dict) and _s(x.get("n"), 200):
            out.append(("leistung", _s(x.get("ph"), 40), _s(x.get("n"), 200), {k: x.get(k) for k in ("gw", "d", "sc", "ms", "a", "din") if x.get(k) not in (None, "", [])}))
    N = (a or {}).get("durN") or {}
    for k, v in ((a or {}).get("dur") or {}).items():   # von Hand geänderte Dauer einer Leistung (LP-C1, 18.11.2026) – Abschnitt = Kennung der Leistung
        try:
            d = max(1, min(999, int(round(float(v)))))
        except (TypeError, ValueError):
            continue
        out.append(("dauer", _s(k, 40), _s(N.get(k) or k, 200), {"d": d}))
    for ab, L in ((a or {}).get("notiz") or {}).items():
        for t in L if isinstance(L, list) else []:
            if _s(t, 300):
                out.append(("notiz", _s(ab, 20), _s(t, 300), {}))
    return out


def schluessel(art, abschnitt, text):
    return f"{art}|{abschnitt}|{_norm(text)}"[:400]


def merken(c, pid, m, wer=""):
    a = (m or {}).get("assistent") or {}
    E = eintraege(a)
    alt = {r["schluessel"]: r for r in c.execute("SELECT id, schluessel FROM pm_lernen WHERE project_id=?", (pid,)).fetchall()}
    neu = {schluessel(art, ab, t): (art, ab, t, d) for art, ab, t, d in E}
    for k, r in alt.items():
        if k not in neu:
            c.execute("DELETE FROM pm_lernen WHERE id=?", (r["id"],))
    pr = json.dumps(profil(a), ensure_ascii=False)
    jetzt = datetime.now().isoformat(timespec="seconds")
    for k, (art, ab, t, d) in neu.items():
        if k in alt:
            c.execute("UPDATE pm_lernen SET profil=?, daten=? WHERE id=?", (pr, json.dumps(d, ensure_ascii=False), alt[k]["id"]))
        else:
            c.execute("INSERT INTO pm_lernen(project_id, art, abschnitt, schluessel, text, daten, profil, wer, wann) VALUES(?,?,?,?,?,?,?,?,?)",
                      (pid, art, ab, k, t, json.dumps(d, ensure_ascii=False), pr, _s(wer, 120), jetzt))


def aehnlich(p, q):
    """Gleiches Gebäude; Maßnahmen überschneiden sich (wenn beide welche haben); Fläche höchstens doppelt/halb so groß (wenn beide eine haben)."""
    if not p["geb"] or p["geb"] != q.get("geb"):
        return False
    if p["mass"] and q.get("mass") and not set(p["mass"]) & set(q["mass"]):
        return False
    a, b = p["area"], float(q.get("area") or 0)
    return not (a and b and not 0.5 <= a / b <= 2)


def vorschlaege(c, pid, m):
    a = (m or {}).get("assistent") or {}
    p = profil(a)
    if not p["geb"]:
        return []
    schon = {schluessel(art, ab, t) for art, ab, t, _ in eintraege(a)} | set(a.get("abgelehnt") or [])
    G = {}
    for r in c.execute("SELECT l.*, p.name AS pname FROM pm_lernen l LEFT JOIN projects p ON p.id = l.project_id WHERE l.project_id<>? ORDER BY l.wann DESC", (pid,)).fetchall():
        if r["schluessel"] in schon:
            continue
        try:
            q = json.loads(r["profil"] or "{}")
        except ValueError:
            continue
        if not aehnlich(p, q):
            continue
        g = G.setdefault(r["schluessel"], {"schluessel": r["schluessel"], "art": r["art"], "abschnitt": r["abschnitt"], "text": r["text"],
                                           "daten": json.loads(r["daten"] or "{}"), "projekte": [], "wer": r["wer"], "wann": r["wann"]})
        if r["pname"] and r["pname"] not in g["projekte"]:
            g["projekte"].append(r["pname"])
    out = list(G.values())
    for g in out:
        g["n"] = max(1, len(g["projekte"]))
        g["projekte"] = g["projekte"][:3]
    return sorted(out, key=lambda g: (-g["n"], g["text"]))[:60]


def alle(c):
    G = {}
    for r in c.execute("SELECT l.schluessel, l.art, l.abschnitt, l.text, l.wer, l.wann, p.name AS pname FROM pm_lernen l LEFT JOIN projects p ON p.id = l.project_id ORDER BY l.wann DESC").fetchall():
        g = G.setdefault(r["schluessel"], {"schluessel": r["schluessel"], "art": r["art"], "abschnitt": r["abschnitt"], "text": r["text"], "projekte": [], "wer": r["wer"], "wann": r["wann"]})
        if r["pname"] and r["pname"] not in g["projekte"]:
            g["projekte"].append(r["pname"])
    return sorted(G.values(), key=lambda g: (g["abschnitt"], g["text"]))


def vergessen(c, s):
    c.execute("DELETE FROM pm_lernen WHERE schluessel=?", (_s(s, 400),))


def routen(bp, mit, lesen_modell, _uid=None):
    from flask import jsonify, request

    from . import db, rechte

    @bp.route("/api/bp/gelernt", methods=["GET", "POST"])
    def lernen_buero():
        """Gelerntes ohne Projekt (GO 20.11.2026, Mock „Gebäudemodell schlank“ D1: Verwaltung → Einstellungen → Gebäudemodell). Ansehen alle
        Angemeldeten, vergessen nur, wer „Büro & Standort“ ändern darf."""
        u, _ = _uid() if _uid else (None, None)
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "POST":
                if rechte.stufe(u, "buero") != "aendern":
                    return jsonify(error="Vergessen darf nur, wer in der Verwaltung „Büro & Standort“ ändern darf."), 403
                vergessen(c, (request.get_json(silent=True) or {}).get("schluessel"))
            return jsonify(alle(c))

    @bp.get("/api/bp/modell/<int:pid>/lernen")
    def lernen_vorschlaege(pid):
        return mit(pid, lambda c, wer: jsonify(vorschlaege(c, pid, lesen_modell(c, pid)["modell"])))

    @bp.get("/api/bp/modell/<int:pid>/gelernt")
    def lernen_alle(pid):
        return mit(pid, lambda c, wer: jsonify(alle(c)))

    @bp.post("/api/bp/modell/<int:pid>/gelernt/vergessen")
    def lernen_vergessen(pid):
        s = (request.get_json(silent=True) or {}).get("schluessel")

        def tun(c, wer):
            vergessen(c, s)
            return jsonify(alle(c))
        return mit(pid, tun)
