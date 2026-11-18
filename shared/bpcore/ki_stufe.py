"""KI-Schieber: ohne KI · KI im Büro · externe KI (GO 18.11.2026, Mock „KI-Schieber“: KS-A1 B1 C1 D1, auch Wiki, Erklärung beim ersten Umschalten).

Drei Ebenen: Verwaltung (Obergrenze fürs Büro: KI im Büro eingerichtet und nicht abgeschaltet, externe KI nur mit „Externe KI erlauben“) →
Projekt (Planung → letzter Schritt, modell.ki – Obergrenze für alle Stellen im Projekt) → Stelle (der Schieber, Baustein bp/kischieber.js).
„Ohne KI“ heißt: die eingebaute Regel-Logik arbeitet. Die Wahl, welche KI („Mistral im Büro“, „Claude“ …), bleibt in ⚙ → Persönlich → KI.

GET /api/bp/ki/stufen?pid=  → {buero, extern, grund: {buero, extern}}
stufe(c, pid, gewuenscht)  → die erlaubte Stufe (bei Verbot eine Stufe tiefer) – jede Stelle prüft so auf dem Server.
"""
STUFEN = ("aus", "buero", "extern")


def erlaubt(c, pid=None):
    from . import ai, ki_fragen
    aus = ai.abgeschaltet(c)
    buero = bool(ai.ollama_url()) and "ollama" not in aus
    ext_admin = ki_fragen.zusatz_an(c) and any(p["paid"] and p["ok"] and p["key"] not in aus for p in ai.providers(c))
    g = {"buero": "" if buero else "Die KI im Büro ist nicht eingerichtet oder in der Verwaltung ausgeschaltet.",
         "extern": "" if ext_admin else "Externe KI ist in der Verwaltung ausgeschaltet (Verwaltung → Einstellungen → KI)."}
    if pid:
        P = ki_fragen.projekt_ki(c, pid)
        if buero and not P["buero"]:
            buero, g["buero"] = False, "Für dieses Projekt ausgeschaltet (Planung → letzter Schritt)."
        if ext_admin and not P["extern"]:
            ext_admin, g["extern"] = False, "Für dieses Projekt ausgeschaltet (Planung → letzter Schritt)."
    return {"buero": buero, "extern": ext_admin, "grund": g}


def stufe(c, pid, gewuenscht):
    E = erlaubt(c, pid)
    s = gewuenscht if gewuenscht in STUFEN else "buero"
    if s == "extern" and not E["extern"]:
        s = "buero"
    if s == "buero" and not E["buero"]:
        s = "aus"
    return s


def routen(bp, user):
    from flask import jsonify, request
    from . import db

    @bp.get("/api/bp/ki/stufen")
    def ki_stufen():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            return jsonify(erlaubt(c, request.args.get("pid", type=int)))
