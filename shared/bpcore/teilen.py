"""Teilen ohne Anmeldung – ein Baustein für alle Apps (besprochen am 14.11.2026, Mock „Plan teilen“).

Links (Tabelle bp_teilen): eine App legt Links zu ihren Dingen an (app, objekt) – mit Kontakt aus den Adressen, Art (mitlaufend/fest),
Optionen der App (z. B. Fortschritt, nur Gewerk der Firma) und Ablaufdatum. Ob jemand das Ding sehen darf, prüft die App vorher.
Voreinstellungen (bp_teilen_vorlage): eigene je Benutzer:in und die des Büros (uid NULL) – Büro-Vorlagen ändert nur, wer den
Block „Bauzeitenplan: Kataloge …“ bzw. die Verwaltung hat; alle anderen sehen sie schreibgeschützt.
Kopf der Ansichtsseite: Büroname, Büro-Farbe (Verwaltung → Firma & Logo, co_farbe) und Logo – kopf(c).

Oberfläche: /bp/teilen.js (BPHead.teilen) – Fenster mit Bürologo, Voreinstellungen, „Für wen?“, Art, Gültigkeit, sichtbaren Teilen
und den vorhandenen Links (kopieren, senden, öffnen, zurückziehen).
"""
import base64, io, json, re, secrets
from datetime import date, datetime

from flask import jsonify, request

from . import db, logo as bplogo, rechte

TOKEN_OK = re.compile(r"^[A-Za-z0-9_-]{16,64}$")
FARBE = re.compile(r"^#[0-9a-fA-F]{6}$")
DATUM = re.compile(r"^\d{4}-\d{2}-\d{2}$")
STANDARD_FARBE = "#2f5fb3"


def _jetzt():
    return datetime.now().isoformat(timespec="seconds")


def _json(raw, leer):
    try:
        v = json.loads(raw or "")
        return v if isinstance(v, type(leer)) else leer
    except (ValueError, TypeError):
        return leer


def _optionen(v):
    """Optionen einer App: nur einfache Werte (wahr/falsch, Zahl, kurzer Text) – nichts Geschachteltes."""
    out = {}
    for k, x in (v or {}).items() if isinstance(v, dict) else ():
        if isinstance(k, str) and re.fullmatch(r"[a-z][a-z0-9_]{0,30}", k) and isinstance(x, (bool, int, float, str)):
            out[k] = x[:200] if isinstance(x, str) else x
    return out


# ---------------------------------------------------------------- Kopf der Ansichtsseite (ohne Anmeldung)
def _logo_kopf(c):
    """Logo als kleines PNG (höchstens 360 × 110 Pixel) für den Kopf der Ansichtsseite – als data-URL, damit die Seite ohne Anmeldung auskommt."""
    def bauen(roh):
        from PIL import Image
        im = Image.open(io.BytesIO(roh)); im.load()
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        im.thumbnail((360, 110))
        b = io.BytesIO(); im.save(b, "PNG")
        return b.getvalue()
    png = bplogo._abgeleitet(c, ("teilen",), bauen)   # unlesbares Bild = kein Logo (fängt _abgeleitet selbst ab)
    return "data:image/png;base64," + base64.b64encode(png).decode() if png else ""


def kopf(c):
    """{buero, farbe, logo} – Büroname und Büro-Farbe aus den Einstellungen, Logo als data-URL ('' = keines)."""
    S = {r[0]: r[1] or "" for r in c.execute("SELECT key, value FROM settings WHERE key IN ('office_name', 'co_short', 'co_farbe')")}
    f = S.get("co_farbe") or ""
    return {"buero": S.get("office_name") or S.get("co_short") or "", "farbe": f if FARBE.match(f) else STANDARD_FARBE, "logo": _logo_kopf(c)}


# ---------------------------------------------------------------- Links
def aus(r, kontakte=None):
    """Zeile → Browser (ohne gespeicherten Stand)."""
    k = (kontakte or {}).get(r["contact_id"]) if r["contact_id"] else None
    return {"token": r["token"], "app": r["app"], "objekt": r["objekt"], "name": r["name"], "art": r["art"], "optionen": _json(r["optionen"], {}),
            "stand_name": r["stand_name"], "ablauf": r["ablauf"], "aktiv": bool(r["aktiv"]), "erstellt": r["erstellt"], "von": r["von"],
            "zuletzt": r["zuletzt"], "aufrufe": r["aufrufe"], "contact_id": r["contact_id"],
            "kontakt": {"id": k["id"], "name": k["name"], "email": k["email"] or ""} if k else None}


def _kontakte(c, ids):
    ids = sorted({i for i in ids if i})
    if not ids:
        return {}
    return {r["id"]: r for r in c.execute(f"SELECT id, name, email FROM contacts WHERE id IN ({','.join('?' * len(ids))})", ids)}


def liste(c, app, objekte):
    objekte = [str(o) for o in objekte]
    if not objekte:
        return []
    R = c.execute(f"SELECT * FROM bp_teilen WHERE app=? AND objekt IN ({','.join('?' * len(objekte))}) ORDER BY erstellt DESC", [app, *objekte]).fetchall()
    K = _kontakte(c, [r["contact_id"] for r in R])
    return [aus(r, K) for r in R]


def lies(c, tok):
    """Link zum Token (auch zurückgezogene) oder None."""
    if not TOKEN_OK.match(tok or ""):
        return None
    return c.execute("SELECT * FROM bp_teilen WHERE token=?", (tok,)).fetchone()


def ein(c, tok):
    r = lies(c, tok)
    return aus(r, _kontakte(c, [r["contact_id"]])) if r else None


def pruefe_daten(b):
    """Gemeinsame Felder aus dem Browser prüfen → (werte, fehler)."""
    w = {}
    if "name" in b:
        w["name"] = str(b.get("name") or "")[:120]
    if "ablauf" in b:
        a = str(b.get("ablauf") or "")[:10]
        if a and not DATUM.match(a):
            return None, "Ablaufdatum ungültig"
        w["ablauf"] = a
    if "contact_id" in b:
        try:
            w["contact_id"] = int(b["contact_id"]) if b.get("contact_id") else None
        except (TypeError, ValueError):
            return None, "Kontakt ungültig"
    if "optionen" in b:
        w["optionen"] = _optionen(b.get("optionen"))
    if "aktiv" in b:
        w["aktiv"] = 1 if b.get("aktiv") not in (False, 0, "0", "false", "") else 0
    return w, None


def neu(c, app, objekt, *, project_id=None, art="mit", stand=None, stand_name="", von="", werte=None):
    w = werte or {}
    tok = secrets.token_urlsafe(18)
    c.execute("INSERT INTO bp_teilen(token, app, objekt, project_id, contact_id, name, art, optionen, stand, stand_name, ablauf, aktiv, erstellt, von)"
              " VALUES(?,?,?,?,?,?,?,?,?,?,?,1,?,?)",
              (tok, app, str(objekt), project_id, w.get("contact_id"), w.get("name", ""), "fest" if art == "fest" else "mit",
               json.dumps(w.get("optionen") or {}), stand, stand_name, w.get("ablauf", ""), _jetzt(), von))
    return tok


def aendern(c, tok, werte, objekt=None):
    sets, args = [], []
    for k in ("name", "ablauf", "contact_id", "aktiv"):
        if k in werte:
            sets.append(f"{k}=?"); args.append(werte[k])
    if "optionen" in werte:   # zusammenführen: nur die mitgeschickten Optionen ändern sich
        alt = _json((lies(c, tok) or {"optionen": "{}"})["optionen"], {})
        sets.append("optionen=?"); args.append(json.dumps({**alt, **werte["optionen"]}))
    if objekt is not None:
        sets.append("objekt=?"); args.append(str(objekt))
    if sets:
        c.execute(f"UPDATE bp_teilen SET {', '.join(sets)} WHERE token=?", (*args, tok))


def loeschen(c, tok):
    c.execute("DELETE FROM bp_teilen WHERE token=?", (tok,))


def oeffnen(c, tok):
    """Für die Ansicht ohne Anmeldung: (zeile, None) oder (None, (fehlertext, status)); zählt den Abruf."""
    r = lies(c, tok)
    if not r or not r["aktiv"]:
        return None, ("Dieser Link wurde zurückgezogen oder gibt es nicht.", 404)
    if r["ablauf"] and r["ablauf"] < date.today().isoformat():
        return None, ("Dieser Link ist abgelaufen.", 410)
    c.execute("UPDATE bp_teilen SET zuletzt=?, aufrufe=aufrufe+1 WHERE token=?", (_jetzt(), tok))
    return r, None


# ---------------------------------------------------------------- Voreinstellungen
def darf_buero(u, app):
    """Büro-Voreinstellungen ändern: Verwaltung, Administrator oder der Block der App (Bauzeitenplan: „gantt“)."""
    return bool(u) and (bool(rechte._feld(u, "is_admin", 0)) or rechte.hat(u, "verwaltung")
                        or (app in rechte.BLOCK and rechte.stufe(u, app) == "aendern"))


def vorlagen(c, uid, app):
    R = c.execute("SELECT * FROM bp_teilen_vorlage WHERE app=? AND (uid IS NULL OR uid=?) ORDER BY (uid IS NOT NULL), sort, id", (app, uid)).fetchall()
    return [{"id": r["id"], "name": r["name"], "farbe": r["farbe"], "optionen": _json(r["optionen"], {}), "buero": r["uid"] is None} for r in R]


def _vorlage_werte(b):
    o = b.get("optionen") if isinstance(b.get("optionen"), dict) else {}
    opt = {"art": "fest" if o.get("art") == "fest" else "mit", "tage": max(0, min(3650, int(o.get("tage") or 0))) if str(o.get("tage") or "0").isdigit() else 0,
           "sicht": _optionen(o.get("sicht"))}
    f = str(b.get("farbe") or "")
    return str(b.get("name") or "").strip()[:60], f if FARBE.match(f) else "", opt


def routen(bp, _uid):
    @bp.get("/api/bp/teilen/kopf")
    def teilen_kopf():
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            return jsonify(kopf(c))

    @bp.route("/api/bp/teilen/vorlagen", methods=["GET", "POST"])
    def teilen_vorlagen():
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        app = (request.args.get("app") or (request.get_json(silent=True) or {}).get("app") or "")[:20]
        with db.tx() as c:
            if request.method == "GET":
                return jsonify(vorlagen=vorlagen(c, uid, app), buero=darf_buero(u, app))
            b = request.get_json(silent=True) or {}
            name, farbe, opt = _vorlage_werte(b)
            if not name:
                return jsonify(error="Bitte einen Namen eingeben."), 400
            buero = bool(b.get("buero"))
            if buero and not darf_buero(u, app):
                return jsonify(error="Voreinstellungen fürs Büro legt die Verwaltung an."), 403
            c.execute("INSERT INTO bp_teilen_vorlage(app, name, farbe, optionen, uid, sort, geaendert, von) VALUES(?,?,?,?,?,?,?,?)",
                      (app, name, farbe, json.dumps(opt), None if buero else uid, 999, _jetzt(), u["name"]))
            return jsonify(vorlagen=vorlagen(c, uid, app), buero=darf_buero(u, app)), 201

    @bp.route("/api/bp/teilen/vorlagen/<int:vid>", methods=["PUT", "DELETE"])
    def teilen_vorlage(vid):
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            r = c.execute("SELECT * FROM bp_teilen_vorlage WHERE id=?", (vid,)).fetchone()
            if not r or (r["uid"] is not None and r["uid"] != uid):
                return jsonify(error="Voreinstellung nicht gefunden"), 404
            if r["uid"] is None and not darf_buero(u, r["app"]):
                return jsonify(error="Diese Voreinstellung gehört dem Büro – ändern kann sie nur die Verwaltung."), 403
            if request.method == "DELETE":
                c.execute("DELETE FROM bp_teilen_vorlage WHERE id=?", (vid,))
            else:
                name, farbe, opt = _vorlage_werte({"name": r["name"], "farbe": r["farbe"], "optionen": _json(r["optionen"], {}), **(request.get_json(silent=True) or {})})
                c.execute("UPDATE bp_teilen_vorlage SET name=?, farbe=?, optionen=?, geaendert=?, von=? WHERE id=?", (name or r["name"], farbe, json.dumps(opt), _jetzt(), u["name"], vid))
            return jsonify(vorlagen=vorlagen(c, uid, r["app"]), buero=darf_buero(u, r["app"]))
