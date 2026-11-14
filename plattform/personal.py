"""Personal – die App (besprochen am 14.11.2026, Mock „App Personal“): Mitarbeiter:innen und Personalakte in einer App.
Links die Personen (bpNav), in der Mitte die Person mit den Reitern Daten · Abwesenheit · Akte, rechts der Abwesenheitskalender.
Regeln: bpcore/personal.py; Urlaub und Abwesenheit aus bpcore/zeiten.py (Anträge mit Genehmigung durch die Vorgesetzten, To-do);
die Akte liegt auf dem Dateiserver unter „Büro/Personal/<Name>“ (über das Bautagebuch, bautagebuch/modules/personal.py).
GET /api/personen[?aus=1] · GET/PUT /api/personen/<id> · GET /api/abwesenheiten?monat= · POST /api/antraege · PUT /api/antraege/<id>
PUT /api/abwesenheit {uid, von, bis, art} · GET/POST /api/personen/<id>/akte · GET /api/personen/<id>/akte/datei?rel= · GET/PUT /api/einstellungen
"""
import urllib.parse
from datetime import date, timedelta

from flask import Response, g, jsonify, redirect, request

from bpcore import db, personal as PE, platform, rechte, sso, zeiten as Z
import common as C

app = C.make_app(__name__)
KEY = "personal"


@app.before_request
def guard():
    p = request.path
    if p.startswith(("/static/", "/bp/")) or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base(KEY) + "/")), 401
        return redirect(C.login_url(request.url))
    if not sso.has_app(u, KEY):
        return C.gesperrt(KEY, "Für „Personal“ ist dein Konto nicht freigeschaltet.")
    g.user = u


@app.get("/")
def index():
    return C.page("personal.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user), alle=PE.alle(g.user), akte=PE.akte_darf(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


def _fehler(e):
    return jsonify(error=str(e)), (403 if isinstance(e, PermissionError) else 404 if isinstance(e, LookupError) else 400)


@app.get("/api/personen")
def personen():
    with db.tx() as c:
        L = PE.liste(c, g.user, aus=request.args.get("aus") == "1", ohne=request.args.get("ohne") == "1")
        n_aus = len(PE.liste(c, g.user, aus=True)) if PE.alle(g.user) else 0
        n_ohne = len(PE.liste(c, g.user, ohne=True)) if PE.alle(g.user) else 0
        offen = len(_zu_entscheiden(c))
    return jsonify(personen=L, aus=n_aus, ohne=n_ohne, antraege_offen=offen, ich=g.user["id"])


@app.get("/api/personen/<int:uid>")
def person(uid):
    try:
        zeigen = request.args.get("zeigen") == "1" and PE.akte_darf(g.user)
        with db.tx() as c:
            d = PE.detail(c, g.user, uid, zeigen=zeigen)
    except (PermissionError, LookupError) as e:
        return _fehler(e)
    if zeigen:
        C.audit(g.user["name"], KEY, "Steuer-ID, SV-Nummer und IBAN aufgedeckt", d["name"])
    return jsonify(d)


@app.put("/api/personen/<int:uid>")
def person_setzen(uid):
    b = request.get_json(silent=True) or {}
    try:
        with db.tx() as c:
            alt = PE.detail(c, g.user, uid)
            PE.setzen(c, g.user, uid, b)
            d = PE.detail(c, g.user, uid)
    except (PermissionError, LookupError, ValueError) as e:
        return _fehler(e)
    namen = {**{k: k for k in PE.SPALTEN}, **{k: x[1] for k, x in PE.DATEN.items()}, "zeit": "Arbeitszeit/Urlaub", "personal": "Personalstatus"}
    C.audit(g.user["name"], KEY, "Daten geändert", f"{d['name']}: {', '.join(namen[k] for k in b if k in namen)}")   # nur die Felder, nie die Werte
    vorher = {k: alt.get(k, "") for k in b if k in PE.SPALTEN or k in PE.DATEN}
    if "zeit" in b:
        vorher["zeit"] = {k: alt["zeit"].get(k) for k in (b.get("zeit") or {}) if k in alt["zeit"]}
    if "personal" in b:
        vorher["personal"] = alt["personal"]
    return jsonify({**d, "vorher": vorher})


# ---------- Fristen (Ersthelfer:in, Unterweisung …) – Erinnerung als To-do für das Recht „personal“
@app.post("/api/personen/<int:uid>/fristen")
def frist_neu(uid):
    try:
        with db.tx() as c:
            fid = PE.frist_setzen(c, g.user, uid, request.get_json(silent=True) or {})
            return jsonify(**PE.detail(c, g.user, uid), frist_id=fid)
    except (PermissionError, LookupError, ValueError) as e:
        return _fehler(e)


@app.route("/api/fristen/<int:fid>", methods=["PUT", "DELETE"])
def frist(fid):
    try:
        with db.tx() as c:
            f = c.execute("SELECT * FROM personal_frist WHERE id=?", (fid,)).fetchone()
            if not f:
                raise LookupError("Frist nicht gefunden.")
            if request.method == "DELETE":
                if not PE.alle(g.user):
                    raise PermissionError("Fristen pflegt, wer das Recht „Personal“ hat.")
                c.execute("DELETE FROM personal_frist WHERE id=?", (fid,))
                return jsonify(alt=dict(f), **PE.detail(c, g.user, f["user_id"]))
            PE.frist_setzen(c, g.user, f["user_id"], request.get_json(silent=True) or {}, fid)
            return jsonify(alt=dict(f), **PE.detail(c, g.user, f["user_id"]))
    except (PermissionError, LookupError, ValueError) as e:
        return _fehler(e)


@app.post("/api/fristen/<int:fid>/erledigt")
def frist_erledigt(fid):
    try:
        with db.tx() as c:
            f = c.execute("SELECT user_id FROM personal_frist WHERE id=?", (fid,)).fetchone()
            r = PE.frist_erledigt(c, g.user, fid)
            return jsonify(ergebnis=r, **PE.detail(c, g.user, f["user_id"]))
    except (PermissionError, LookupError, ValueError, TypeError) as e:
        return _fehler(e)


@app.get("/api/abwesenheiten")
def abwesenheiten():
    """Kalender des Monats – nur die Personen, die man sieht; Grund nur, wer Urlaub entscheidet oder alle sieht (wie in „Zeiten“)."""
    monat = (request.args.get("monat") or date.today().isoformat()[:7])[:7]
    with db.tx() as c:
        alles = PE.alle(g.user) or rechte.hat(g.user, "urlaub.freigeben")
        d = Z.abwesenheiten(c, monat, g.user["id"], alles)
        ids = {p["id"] for p in PE.liste(c, g.user)}
    if isinstance(d, dict) and isinstance(d.get("personen"), list):
        d["personen"] = [p for p in d["personen"] if p.get("id") in ids or p.get("user_id") in ids]
    return jsonify(d)


def _zu_entscheiden(c):
    if not rechte.hat(g.user, "urlaub.freigeben"):
        return []
    return [a for a in Z.antraege(c, status="offen") if g.user["id"] in Z.entscheider(c, a)]


@app.get("/api/antraege")
def antraege():
    """Urlaubsanträge des Jahres der sichtbaren Personen; „darf“ = ich entscheide darüber (die Vorgesetzte Person, sonst wer das Recht hat)."""
    jahr = (request.args.get("jahr") or date.today().isoformat())[:4]
    with db.tx() as c:
        ids = {p["id"] for p in PE.liste(c, g.user)}
        mir = {a["id"] for a in _zu_entscheiden(c)}
        A = Z.antraege(c, jahr=jahr)
        A += [a for a in Z.antraege(c, status="offen") if a["id"] not in {x["id"] for x in A}]   # offene auch aus anderen Jahren (z. B. Urlaub im Januar)
        L = [{**a, "darf": a["id"] in mir} for a in A if a["user_id"] in ids or a["id"] in mir]
        pflicht = Z.antrag_pflicht(c)
    return jsonify(antraege=L, arten=Z.ABW, antrag_arten=list(Z.ANTRAG_ARTEN), pflicht=pflicht)


@app.post("/api/antraege")
def antrag_neu():
    """Urlaub (Frei, Fortbildung) für sich selbst beantragen – entscheidet die vorgesetzte Person (To-do auf der Startseite)."""
    b = request.get_json(silent=True) or {}
    try:
        with db.tx() as c:
            aid = Z.antrag_neu(c, g.user["id"], b)
            a = Z.antrag(c, aid)
    except ValueError as e:
        return _fehler(e)
    C.audit(g.user["name"], KEY, "Urlaub beantragt", f"{a['von']} – {a['bis']}")
    return jsonify(antrag=a)


@app.put("/api/antraege/<int:aid>")
def antrag_aktion(aid):
    b = request.get_json(silent=True) or {}
    try:
        with db.tx() as c:
            return jsonify(antrag=Z.antrag_aktion(c, g.user, aid, b.get("aktion"), b.get("antwort") or ""))
    except (PermissionError, ValueError) as e:
        return _fehler(e)


@app.put("/api/abwesenheit")
def abwesenheit():
    """Abwesenheit eintragen: jede:r für sich (krank sofort; Urlaub, Frei, Fortbildung über einen Antrag, wenn so eingestellt) –
    Vorgesetzte und wer alle sieht auch für andere."""
    b = request.get_json(silent=True) or {}
    uid, art = int(b.get("uid") or g.user["id"]), b.get("art") or ""
    von, bis = str(b.get("von") or "")[:10], str(b.get("bis") or b.get("von") or "")[:10]
    try:
        v, w = date.fromisoformat(von), date.fromisoformat(bis)
    except ValueError:
        return jsonify(error="Datum prüfen."), 400
    if art and art not in Z.ABW:
        return jsonify(error="Unbekannte Abwesenheit."), 400
    if w < v or (w - v).days > 120:
        return jsonify(error="Zeitraum prüfen (höchstens 120 Tage)."), 400
    with db.tx() as c:
        if not PE.sieht(c, g.user, uid):
            return jsonify(error="Diese Person siehst du nicht."), 403
        selbst = uid == g.user["id"]
        if selbst and not PE.alle(g.user) and Z.antrag_pflicht(c) and art in Z.ANTRAG_ARTEN:
            return jsonify(error="Urlaub, Frei und Fortbildung bitte beantragen – die vorgesetzte Person genehmigt sie."), 403
        P, n, t = Z.person(c, uid), 0, v
        while t <= w:
            if Z.soll_min(P, t.isoformat()) or not art:
                Z.zt_setzen(c, uid, t.isoformat(), abw=art)
                n += 1
            t += timedelta(days=1)
    C.audit(g.user["name"], KEY, "Abwesenheit eingetragen", f"Person {uid}: {von} – {bis} {Z.ABW.get(art, 'entfernt')}")
    return jsonify(ok=True, tage=n)


# ---------- Akte (nur Recht „personal“; jedes Öffnen steht im Protokoll)
def _akte(uid):
    if not PE.akte_darf(g.user):
        raise PermissionError("Die Personalakte sieht nur, wer das Recht „Personal“ hat.")
    with db.tx() as c:
        return "/".join(PE.akte_pfad(c, uid))


@app.get("/api/personen/<int:uid>/akte")
def akte(uid):
    try:
        pfad = _akte(uid)
        d = C.bt_api("GET", "/api/personal/akte?" + urllib.parse.urlencode({"pfad": pfad}))
    except (PermissionError, LookupError) as e:
        return _fehler(e)
    except RuntimeError as e:
        return jsonify(error=str(e), dateien=[], pfad=""), 200
    C.audit(g.user["name"], KEY, "Personalakte geöffnet", pfad)
    return jsonify({**d, "pfad": pfad})


@app.get("/api/personen/<int:uid>/akte/datei")
def akte_datei(uid):
    try:
        pfad = _akte(uid)
        daten = C.bt_api("GET", "/api/personal/datei?" + urllib.parse.urlencode({"pfad": pfad, "rel": request.args.get("rel") or ""}), roh=True)
    except (PermissionError, LookupError) as e:
        return _fehler(e)
    except RuntimeError as e:
        return jsonify(error=str(e)), 502
    C.audit(g.user["name"], KEY, "Dokument der Personalakte geöffnet", f"{pfad}/{request.args.get('rel') or ''}")
    import mimetypes
    n = (request.args.get("rel") or "Dokument").rsplit("/", 1)[-1]
    return Response(daten, mimetype=mimetypes.guess_type(n)[0] or "application/octet-stream", headers={"Cache-Control": "no-store"})


@app.post("/api/personen/<int:uid>/akte")
def akte_ablegen(uid):
    b = request.get_json(silent=True) or {}
    try:
        pfad = _akte(uid)
        r = C.bt_api("POST", "/api/personal/datei", {"pfad": pfad, "ordner": str(b.get("ordner") or "")[:150], "name": b.get("name") or "Dokument", "datei": b.get("datei") or ""})
    except (PermissionError, LookupError) as e:
        return _fehler(e)
    except RuntimeError as e:
        return jsonify(error=str(e)), 502
    C.audit(g.user["name"], KEY, "Dokument in die Personalakte", f"{pfad}/{(r or {}).get('name', '')}")
    return jsonify(r)


@app.post("/api/personen/<int:uid>/akte/geloescht")
def akte_geloescht(uid):
    """Nach Ablauf der Frist: vermerken, dass die Akte auf dem Dateiserver gelöscht ist (gelöscht wird dort von Hand – nie automatisch)."""
    if not PE.akte_darf(g.user):
        return jsonify(error="Nur mit dem Recht „Personal“."), 403
    with db.tx() as c:
        c.execute("INSERT INTO personal_person(user_id) VALUES(?) ON CONFLICT (user_id) DO NOTHING", (uid,))
        c.execute("UPDATE personal_person SET akte_geloescht=? WHERE user_id=?", (date.today().isoformat(), uid))
    C.audit(g.user["name"], KEY, "Personalakte als gelöscht vermerkt", str(uid))
    return jsonify(ok=True)


@app.route("/api/einstellungen", methods=["GET", "PUT"])
def einstellungen():
    with db.tx() as c:
        if request.method == "PUT":
            if not rechte.hat(g.user, "verwaltung"):
                return jsonify(error="Nur in der Verwaltung."), 403
            try:
                return jsonify(PE.einst_setzen(c, request.get_json(silent=True) or {}))
            except ValueError:
                return jsonify(error="Bitte eine Zahl."), 400
        return jsonify(PE.einst(c))
