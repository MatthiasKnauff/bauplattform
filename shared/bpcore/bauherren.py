"""Bauherrenportal – die Seite des Büros (beschlossen am 15.11.2026, Entwurf „Bauherrenportal: Aufbau“).

Das Portal (App „bauherren“) läuft auf einem eigenen Server (Google Cloud) und erreicht das Büro NIE. Der Kern:
  freigeben()   eine App gibt etwas für Bauherr:innen frei → Paket in bh_freigabe (Baustein head/freigeben.js: BPHead.bauherrFreigeben)
  abgleich()    der Dienst (bautagebuch/core/bauherren_dienst.py) schiebt neue Pakete und Konten hinaus und holt den Eingangskorb ab:
                Nachrichten → bh_eingang (To-do „Bauherrenportal“), Mail-Aufträge (Anmeldelinks) → mit dem Mailzugang des Büros verschicken
Einstellungen in bp_store „bauherren:einst“ {an, url, takt}; der Schlüssel liegt für sich in „bauherren:schluessel“ und geht nie an den Browser.
"""
import json, os, ssl, time, urllib.request
from datetime import datetime

from . import rechte

ARTEN = {"tagesbericht": "Bautagebuch", "termine": "Termine", "rechnung": "Rechnungen", "kosten": "Kosten", "maengel": "Mängel", "plan": "Pläne",
         "foto": "Fotos", "info": "Informationen"}
TAKT = 60   # Sekunden – Vorgabe, in der Verwaltung einstellbar (15 … 3600)


def _jetzt():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def _t(v, n):
    return str(v if v is not None else "").strip()[:n]


def _store(c, k, v=None):
    if v is None:
        r = c.execute("SELECT data FROM bp_store WHERE key=?", (k,)).fetchone()
        try:
            return json.loads(r["data"]) if r else None
        except ValueError:
            return None
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,'bauherren') ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated=excluded.updated",
              (k, json.dumps(v, ensure_ascii=False), _jetzt()))


def einst(c):
    E = _store(c, "bauherren:einst") or {}
    return {"an": bool(E.get("an")), "url": _t(E.get("url"), 300), "takt": max(15, min(3600, int(E.get("takt") or TAKT))),
            "schluessel": bool(_store(c, "bauherren:schluessel")), "stand": _store(c, "bauherren:stand") or {},
            "testmails": (_store(c, "bauherren:testmails") or [])[::-1] if os.environ.get("TESTSERVER") == "1" else None}


def einst_setzen(c, b):
    E = _store(c, "bauherren:einst") or {}
    if "an" in b:
        E["an"] = bool(b["an"])
    if "url" in b:
        u = _t(b["url"], 300).rstrip("/")
        if u and not u.startswith("https://") and not u.startswith("http://"):
            raise ValueError("Bitte die Adresse mit https:// angeben.")
        E["url"] = u
    if "takt" in b:
        E["takt"] = max(15, min(3600, int(b.get("takt") or TAKT)))
    _store(c, "bauherren:einst", E)
    if _t(b.get("schluessel"), 200):   # nur setzen, nie zurückgeben
        if len(b["schluessel"].strip()) < 32:
            raise ValueError("Der Schlüssel muss mindestens 32 Zeichen lang sein.")
        _store(c, "bauherren:schluessel", b["schluessel"].strip())
    return einst(c)


def darf(u):
    return rechte.hat(u, "bauherren") or rechte.hat(u, "verwaltung")


def freigeben(c, u, b):
    """{pid, art, schluessel, titel, stand, daten} → Paket; derselbe Schlüssel ersetzt das alte (z. B. „termine“ je Projekt nur einmal)."""
    pid = int(b.get("pid") or 0)
    if not pid or not c.execute("SELECT 1 FROM projects WHERE id=?", (pid,)).fetchone():
        raise ValueError("Projekt fehlt.")
    art = _t(b.get("art"), 40) or "info"
    sk = f"{pid}:{art}:{_t(b.get('schluessel'), 80) or _t(b.get('titel'), 80)}"
    daten = b.get("daten") if isinstance(b.get("daten"), (dict, list)) else {"text": _t(b.get("text"), 20000)}
    roh = json.dumps(daten, ensure_ascii=False)
    if len(roh) > 15_000_000:
        raise ValueError("Zu groß für das Portal (höchstens 15 MB je Freigabe).")
    j = _jetzt()
    c.execute("INSERT INTO bh_freigabe(schluessel, project_id, art, titel, stand, daten, von, created, updated) VALUES(?,?,?,?,?,?,?,?,?) "
              "ON CONFLICT(schluessel) DO UPDATE SET titel=excluded.titel, stand=excluded.stand, daten=excluded.daten, von=excluded.von, updated=excluded.updated, gesendet='', geloescht=''",
              (sk, pid, art, _t(b.get("titel"), 300) or ARTEN.get(art, art), _t(b.get("stand"), 40) or j[:10], roh, (u or {}).get("name", ""), j, j))
    return {"ok": True, "schluessel": sk}


def zurueckziehen(c, schluessel):
    c.execute("UPDATE bh_freigabe SET geloescht=?, gesendet='' WHERE schluessel=?", (_jetzt(), schluessel))


def freigaben(c, pid):
    return [dict(r) for r in c.execute("SELECT schluessel, art, titel, stand, von, updated, gesendet, geloescht FROM bh_freigabe WHERE project_id=? ORDER BY updated DESC", (pid,)).fetchall()]


def konten(c, pid):
    return [dict(r) for r in c.execute("SELECT id, email, name, aktiv, gesendet, updated FROM bh_konto WHERE project_id=? ORDER BY name, email", (pid,)).fetchall()]


def konto_setzen(c, pid, b):
    mail = _t(b.get("email"), 200).lower()
    if "@" not in mail or "." not in mail.split("@")[-1]:
        raise ValueError("Bitte eine gültige E-Mail-Adresse angeben.")
    j = _jetzt()
    c.execute("INSERT INTO bh_konto(project_id, email, name, aktiv, created, updated) VALUES(?,?,?,?,?,?) ON CONFLICT(project_id, email) "
              "DO UPDATE SET name=excluded.name, aktiv=excluded.aktiv, updated=excluded.updated, gesendet=''",
              (pid, mail, _t(b.get("name"), 200), 0 if b.get("aktiv") is False else 1, j, j))
    return konten(c, pid)


# ---------- Abgleich mit dem Portal (Dienst) ----------
def _ruf(E, schluessel, methode, pfad, body=None, timeout=60):
    rq = urllib.request.Request(E["url"] + pfad, method=methode, data=json.dumps(body).encode() if body is not None else None,
                                headers={"Authorization": "Bearer " + schluessel, "Content-Type": "application/json", "User-Agent": "Bauplattform-Kern"})
    with urllib.request.urlopen(rq, timeout=timeout, context=ssl.create_default_context()) as r:
        return json.loads(r.read() or b"{}")


def _konten_alle(c, mails):
    """Je E-Mail alle Projekte, in denen das Konto aktiv ist (das Portal kennt Konten, nicht Einladungen je Projekt)."""
    out = []
    for m in mails:
        R = c.execute("SELECT project_id, name, aktiv FROM bh_konto WHERE email=?", (m,)).fetchall()
        pro = [str(r["project_id"]) for r in R if r["aktiv"]]
        out.append({"email": m, "name": next((r["name"] for r in R if r["name"]), ""), "projekte": pro, "aktiv": bool(pro)})
    return out


def abgleich(tx, mail_senden):
    """Ein Durchgang: hinausschicken, Eingangskorb abholen. tx = db.tx; mail_senden(an, betreff, text). Gibt den Stand zurück."""
    with tx() as c:
        E, sk = einst(c), _store(c, "bauherren:schluessel")
        if not E["an"] or not E["url"] or not sk:
            return {"aus": True}
        F = c.execute("SELECT f.*, p.name AS projekt FROM bh_freigabe f JOIN projects p ON p.id=f.project_id WHERE f.gesendet='' ORDER BY f.id LIMIT 50").fetchall()
        mails = sorted({r["email"] for r in c.execute("SELECT email FROM bh_konto WHERE gesendet=''").fetchall()})
        K = _konten_alle(c, mails)
    pakete = [{"id": r["schluessel"], "pid": str(r["project_id"]), "projekt": r["projekt"], "art": r["art"], "titel": r["titel"], "stand": r["stand"],
               "daten": json.loads(r["daten"] or "{}")} for r in F if not r["geloescht"]]
    weg = [r["schluessel"] for r in F if r["geloescht"]]
    n = {"gesendet": 0, "eingang": 0, "mails": 0, "konten": 0}
    if pakete or weg or K:
        _ruf(E, sk, "POST", "/api/kern/sync", {"pakete": pakete, "loeschen": weg, "konten": K})
        with tx() as c:
            j = _jetzt()
            for r in F:
                c.execute("UPDATE bh_freigabe SET gesendet=? WHERE id=? AND updated=?", (j, r["id"], r["updated"]))
            for m in mails:
                c.execute("UPDATE bh_konto SET gesendet=? WHERE email=? AND gesendet=''", (j, m))
        n["gesendet"], n["konten"] = len(pakete) + len(weg), len(K)
    L = _ruf(E, sk, "GET", "/api/kern/eingang")
    fertig, mailfehler = [], ""
    for x in L if isinstance(L, list) else []:
        if x.get("art") == "mail":   # Anmeldelink: mit dem Mailzugang des Büros verschicken
            d = x.get("daten") or {}
            try:
                mail_senden(_t(d.get("an"), 200), _t(d.get("betreff"), 200), _t(d.get("text"), 5000))
                n["mails"] += 1
            except Exception as e:   # noqa: BLE001 – bleibt im Eingangskorb, nächster Durchgang; der Grund steht in der Verwaltung
                mailfehler = f"Anmeldemail an {_t(d.get('an'), 200)} nicht verschickt: {str(e)[:200] or type(e).__name__}"
                continue
        else:
            with tx() as c:
                pid = int(x["pid"]) if str(x.get("pid") or "").isdigit() else None
                c.execute("INSERT INTO bh_eingang(fern_id, project_id, art, daten, zeit, created) VALUES(?,?,?,?,?,?) ON CONFLICT(fern_id) DO NOTHING",
                          (int(x["id"]), pid, _t(x.get("art"), 40), json.dumps(x.get("daten") or {}, ensure_ascii=False),
                           datetime.fromtimestamp(float(x.get("zeit") or time.time())).strftime("%Y-%m-%dT%H:%M:%S"), _jetzt()))
            n["eingang"] += 1
        fertig.append(x["id"])
    if fertig:
        _ruf(E, sk, "POST", "/api/kern/eingang/quittung", {"ids": fertig})
    with tx() as c:
        _store(c, "bauherren:stand", {"zeit": _jetzt(), **n, "fehler": mailfehler})
    return n


def eingang(c, pid=None, offen=True):
    q = "SELECT e.*, COALESCE(p.name,'') AS projekt FROM bh_eingang e LEFT JOIN projects p ON p.id=e.project_id WHERE 1=1"
    a = []
    if pid:
        q += " AND e.project_id=?"
        a.append(pid)
    if offen:
        q += " AND e.erledigt=''"
    return [{**dict(r), "daten": json.loads(r["daten"] or "{}")} for r in c.execute(q + " ORDER BY e.zeit DESC LIMIT 300", a).fetchall()]


def routen(bp, _uid):
    from flask import jsonify, request
    from . import db

    def _wer():
        u, _ = _uid()
        if not u:
            return None, (jsonify(error="Nicht angemeldet"), 401)
        if not darf(u):
            return None, (jsonify(error="Dafür fehlt das Recht „Bauherrenportal“."), 403)
        return u, None

    @bp.post("/api/bp/bauherren/freigeben")
    def bh_freigeben():
        u, f = _wer()
        if f:
            return f
        try:
            with db.tx() as c:
                return jsonify(freigeben(c, u, request.get_json(silent=True) or {}))
        except ValueError as e:
            return jsonify(error=str(e)), 400

    @bp.route("/api/bp/bauherren/projekt/<int:pid>", methods=["GET", "POST"])
    def bh_projekt(pid):
        u, f = _wer()
        if f:
            return f
        b = request.get_json(silent=True) or {}
        try:
            with db.tx() as c:
                if request.method == "POST" and b.get("zurueck"):
                    zurueckziehen(c, _t(b["zurueck"], 200))
                elif request.method == "POST":
                    konto_setzen(c, pid, b)
                return jsonify({"konten": konten(c, pid), "freigaben": freigaben(c, pid), "eingang": eingang(c, pid, offen=False)[:50], "an": einst(c)["an"]})
        except ValueError as e:
            return jsonify(error=str(e)), 400

    @bp.post("/api/bp/bauherren/eingang/<int:eid>/erledigt")
    def bh_erledigt(eid):
        u, f = _wer()
        if f:
            return f
        with db.tx() as c:
            c.execute("UPDATE bh_eingang SET erledigt=? WHERE id=?", (_jetzt(), eid))
        return jsonify(ok=True)

    @bp.route("/api/bp/bauherren/einst", methods=["GET", "PUT"])
    def bh_einst():
        u, _ = _uid()
        if not u or not rechte.hat(u, "verwaltung"):
            return jsonify(error="Nur für die Verwaltung."), 403
        try:
            with db.tx() as c:
                return jsonify(einst_setzen(c, request.get_json(silent=True) or {}) if request.method == "PUT" else einst(c))
        except ValueError as e:
            return jsonify(error=str(e)), 400
