"""KI-Schieber: ohne KI · KI im Büro · externe KI (GO 18.11.2026, Mock „KI-Schieber“: KS-A1 B1 C1 D1, auch Wiki, Erklärung beim ersten Umschalten).

Drei Ebenen: Verwaltung (Obergrenze fürs Büro: Schieber „Höchste Stufe im Büro“ = ki.stufe, dazu muss die KI eingerichtet und nicht abgeschaltet sein) →
Projekt (Planung → letzter Schritt, modell.ki – Obergrenze für alle Stellen im Projekt) → Stelle (der Schieber, Baustein bp/kischieber.js).
„Ohne KI“ heißt: die eingebaute Regel-Logik arbeitet. Die Wahl, welche KI („Mistral im Büro“, „Claude“ …), bleibt in ⚙ → Persönlich → KI.

GET /api/bp/ki/stufen?pid=  → {buero, extern, grund: {buero, extern}}
stufe(c, pid, gewuenscht)  → die erlaubte Stufe (bei Verbot eine Stufe tiefer) – jede Stelle prüft so auf dem Server.
"""
STUFEN = ("aus", "buero", "extern")
NAME = {"aus": "ohne KI", "buero": "KI im Büro", "extern": "externe KI"}


def hoechste(c):
    """Obergrenze des Büros (Verwaltung → Einstellungen → KI, Schieber „Höchste Stufe im Büro“, 19.11.2026) – gespeichert als ki.stufe;
    ältere Stände ohne Angabe: „Externe KI erlauben“ an → extern, sonst KI im Büro."""
    from . import ai
    k = ai.store(c, "plattform").get("ki") or {}
    s = k.get("stufe")
    return s if s in STUFEN else ("extern" if k.get("zusatz") else "buero")


def erlaubt(c, pid=None):
    from . import ai, ki_fragen
    aus, h = ai.abgeschaltet(c), hoechste(c)
    buero = h != "aus" and bool(ai.ollama_url()) and "ollama" not in aus
    ext_admin = h == "extern" and any(p["paid"] and p["ok"] and p["key"] not in aus for p in ai.providers(c))
    g = {"buero": "" if buero else ("In der Verwaltung ist „ohne KI“ eingestellt (Verwaltung → Einstellungen → KI)." if h == "aus"
                                    else "Die KI im Büro ist nicht eingerichtet oder in der Verwaltung ausgeschaltet."),
         "extern": "" if ext_admin else ("Externe KI ist in der Verwaltung nicht erlaubt (Verwaltung → Einstellungen → KI → Höchste Stufe im Büro)." if h != "extern"
                                         else "Keine externe KI eingerichtet (Verwaltung → Einstellungen → KI).")}
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


def anbieter(c, st, u=None):
    """Welche KI bei der (schon geprüften) Stufe arbeitet: aus → None, buero → ollama (falls bereit), extern → die externe KI aus
    ⚙ → Persönlich → KI, sonst die erste eingerichtete und nicht abgeschaltete."""
    from . import ai
    if st == "buero":
        return "ollama" if ai.ollama_url() and "ollama" not in ai.abgeschaltet(c) and ai.ollama_state()["ok"] else None
    if st == "extern":
        aus = ai.abgeschaltet(c)
        frei = [p["key"] for p in ai.providers(c) if p["paid"] and p["ok"] and p["key"] not in aus]
        mein = ai.choice_of(u, c) if u is not None else None
        return mein if mein in frei else (frei[0] if frei else None)
    return None


def schalter(st):
    """Stufe → Schalter wie projekt_ki ({buero, extern}) für ältere Funktionen: genau die gewählte Stufe arbeitet."""
    return {"buero": st == "buero", "extern": st == "extern"}


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
