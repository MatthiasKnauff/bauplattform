"""„Mein Ordner“ – das eigene Verzeichnis auf dem Dateiserver (GO 19.11.2026, Mock „Mein Ordner“: A1 B1 C1).

A1  Die Verwaltung legt den Wurzelordner fest (Einstellung „ordner_benutzer“ unter Ablage & Server, Vorgabe „Mitarbeiter“ auf der
    Freigabe der Ablage); jede Person wählt in Mein Konto nur einen Unterordner darin (users.extra["mein_ordner"]) – kein freier Pfad,
    also kommt niemand per Pfad in fremde Ordner (Personalakten, Projekte anderer).
B1  Sehen und ändern nur die Person selbst – auch Administrator:innen nicht.
C1  Ohne Eintrag ist der Menüpunkt ausgegraut („In Mein Konto festlegen“); im Konto vorgeschlagen: der Ordner mit dem Namen der Person,
    wenn es ihn in der Wurzel schon gibt (Liste über das Bautagebuch, /api/dateien/benutzerordner).

In „Pläne & Dateien“ → „Alle Dateien“ steht der Ordner wie ein Projekt mit der Nummer −Benutzer-ID (`pid(uid)`): Liste, Datei, Aktionen
(Kopieren, Verschieben – auch in ein Projekt –, Papierkorb) und Bauportal Office laufen über dieselben Wege und prüfen `darf(user, pid)`.
Vorschaubilder gibt es dort nicht (bp_vorschau hängt an Projekten) – die Seite zeigt Symbole. Testserver: liest nur (remote.NUR_LESEN).

GET /api/bp/meinordner[?liste=1]   {wurzel, ordner, pid, name, liste?}   ·   PUT /api/bp/meinordner {ordner}
"""
import json
import re

SETTING, VORGABE, FELD = "ordner_benutzer", "Mitarbeiter", "mein_ordner"
_BOESE = re.compile(r'[<>:"|?*\x00-\x1f]')


def name_ok(s):
    """Ein Ordnername (kein Pfad): Windows-taugliche Zeichen, kein „..“, höchstens 120 Zeichen – sonst „“."""
    s = re.sub(r"\s+", " ", _BOESE.sub(" ", str(s or "")).replace("/", " ").replace("\\", " ")).strip(". ")
    return "" if s in ("", ".", "..") else s[:120]


def teile_von(text):
    return [t for t in (name_ok(x) for x in re.split(r"[\\/]+", str(text or ""))) if t]


def pid(uid):
    return -int(uid)


def ist(p):
    return isinstance(p, int) and not isinstance(p, bool) and p < 0


def darf(user, p):
    """B1: nur die Person selbst."""
    try:
        return ist(p) and bool(user) and int(user.get("id") or 0) == -p
    except (TypeError, ValueError, AttributeError):
        return False


def _extra(c, uid):
    r = c.execute("SELECT extra FROM users WHERE id=?", (uid,)).fetchone()
    try:
        return json.loads((r and r["extra"]) or "{}") or {}
    except (ValueError, TypeError):
        return {}


def wurzel(c):
    r = c.execute("SELECT value FROM settings WHERE key=?", (SETTING,)).fetchone()
    return teile_von(r["value"] if r else "") or [VORGABE]


def ordner(c, uid):
    return name_ok(_extra(c, uid).get(FELD))


def teile(c, uid):
    """Pfad des eigenen Ordners in der Ablage (Liste der Ordner) oder None, solange keiner gewählt ist."""
    o = ordner(c, uid)
    return wurzel(c) + [o] if o else None


def setzen(c, uid, name):
    ex = _extra(c, uid)
    n = name_ok(name)
    if n:
        ex[FELD] = n
    else:
        ex.pop(FELD, None)
    c.execute("UPDATE users SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), uid))
    return n


def stand(c, uid):
    o = ordner(c, uid)
    return {"wurzel": "/".join(wurzel(c)), "ordner": o, "pid": pid(uid)}


def vorschlag(liste, namen):
    """C1: vorhandener Ordner, der wie die Person heißt (voller Name, Vorname, Anmeldename – ohne Groß/Klein)."""
    L = {str(x).casefold(): x for x in liste or []}
    for n in namen:
        n = name_ok(n).casefold()
        if n and n in L:
            return L[n]
    return ""


def routen(bp, _uid):
    from flask import jsonify, request
    from . import db

    @bp.route("/api/bp/meinordner", methods=["GET", "PUT"])
    def bp_meinordner():
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":
                b = request.get_json(silent=True) or {}
                if b.get("ordner") and not name_ok(b.get("ordner")):
                    return jsonify(error="Bitte einen Ordnernamen ohne Sonderzeichen wählen."), 400
                setzen(c, uid, b.get("ordner"))
            s = stand(c, uid)
        if request.args.get("liste") == "1":
            from .ablage import bt_json
            try:
                L = (bt_json("GET", "/api/dateien/benutzerordner") or {}).get("ordner") or []
            except RuntimeError as e:
                L, s["fehler"] = [], str(e)
            U = dict(u) if u else {}
            full = " ".join(str(U.get(k) or "") for k in ("vorname", "nachname")).strip()
            login = str(U.get("name") or "")
            s.update(liste=L, vorschlag=vorschlag(L, [full, full.split(" ")[0] if full else "", login]))
        return jsonify(s)
