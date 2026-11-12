"""Zeiten: Arbeitszeit (Kommen/Gehen, Pause, Urlaub/Krank) und Projektzeiten je Leistungsphase.

Jede:r sieht und bearbeitet nur die eigenen Tage. Vorschläge kommen aus der Arbeit in der Plattform (Puls der Kopfleiste)
und aus „vor Ort“; gezählt wird erst, was bestätigt ist. Administratoren sehen Summen je Projekt und Leistungsphase
und die Arbeitszeitkonten (Soll, Ist, Saldo, Urlaub) – keine Tagesabläufe der anderen. Logik: bpcore/zeiten.py.
"""
import csv, io, json
from datetime import date, timedelta

from flask import Response, g, jsonify, redirect, request

from bpcore import db, platform, sso, zeiten as Z
import common as C

app = C.make_app(__name__)
KEY = "zeiten"


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
        msg = "Für „Zeiten“ ist dein Konto nicht freigeschaltet."
        return C.gesperrt(KEY, msg)   # im Büro abgeschaltet oder für das Konto nicht freigeschaltet
    g.user = u


def _admin():
    return bool(g.user["is_admin"])


def _nur_admin():
    if not _admin():
        return jsonify(error="Nur für Administratoren."), 403
    return None


def _tag(v=None):
    t = str(v or request.args.get("d") or Z.heute())[:10]
    return t if Z._tag_ok(t) else Z.heute()


def _zeit(v):
    m = Z.h2m(v)
    return Z.m2h(m) if m is not None else None


@app.get("/")
def index():
    return C.page("zeiten.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


@app.get("/api/grund")
def grund():
    """Was die Oberfläche braucht: Tätigkeiten, Abwesenheiten, sichtbare Projekte, eigene Einstellungen."""
    uid = g.user["id"]
    with db.tx() as c:
        pj = []
        for r in c.execute("SELECT id, name, archived, leaders FROM projects ORDER BY name").fetchall():
            try:
                L = json.loads(r["leaders"] or "[]")
            except ValueError:
                L = []
            if r["archived"] or (L and uid not in L and not _admin()):
                continue
            pj.append({"id": r["id"], "name": r["name"], "mein": uid in L})
        pj.sort(key=lambda p: not p["mein"])   # erst die eigenen, dann die anderen
        P = Z.person(c, uid)
        lauf = c.execute("SELECT * FROM zeit_lauf WHERE user_id=?", (uid,)).fetchone()
        Z.aufraeumen(c)
        pflicht = Z.antrag_pflicht(c)
        takt, pb = Z.takt(c), Z.pause_buero(c)
        pv = Z.pause_vorgabe(P, pb)
    return jsonify(arten=Z.ARTEN, abw=Z.ABW, projekte=pj, person=P, admin=_admin(), heute=Z.heute(), lauf=dict(lauf) if lauf else None,
                   antrag_pflicht=pflicht, antrag_arten=Z.ANTRAG_ARTEN, takt=takt, pause_buero=pb, pause_dauer=(pv or {}).get("dauer") or 30)


@app.get("/api/tag")
def tag_get():
    t = _tag()
    with db.tx() as c:
        Z.zusammenfassen(c, g.user["id"], t)   # z. B. Stoppuhr oder „vor Ort“: auf den Takt bringen
        d = Z.tag_daten(c, g.user["id"], t)
        d["konto"] = Z.konto(c, g.user["id"])
    return jsonify(d)


def _antwort(c, uid, t, vorher=None):
    d = Z.tag_daten(c, uid, t)
    d["konto"] = Z.konto(c, uid)
    if vorher is not None:
        d["vorher"] = vorher   # für „Rückgängig“: so war der Tag vorher
    return d


def _offen(c, uid, t):
    if Z.zt(c, uid, t).get("bestaetigt"):
        return jsonify(error="Der Tag ist bestätigt – erst „Noch einmal bearbeiten“."), 400
    return None


@app.post("/api/tag/stand")
def tag_stand():
    """Rückgängig: den Tag auf einen früheren Stand setzen (Zeiten, Kommen/Gehen, Pause)."""
    b = request.get_json(silent=True) or {}
    t, uid = _tag(b.get("d")), g.user["id"]
    with db.tx() as c:
        vorher = Z.stand(c, uid, t)
        try:
            Z.stand_setzen(c, uid, t, b.get("stand") or {})
        except ValueError as e:
            return jsonify(error=str(e)), 400
        return jsonify(_antwort(c, uid, t, vorher))


@app.put("/api/tag")
def tag_put():
    b = request.get_json(silent=True) or {}
    t, uid = _tag(b.get("d")), g.user["id"]
    f = {}
    for k in ("kommen", "gehen"):
        if k in b:
            f[k] = _zeit(b[k]) or ""
    if "pause" in b:
        try:
            f["pause"] = None if b["pause"] in (None, "") else max(0, min(600, int(b["pause"])))
        except (TypeError, ValueError):
            pass
    if "abw" in b:
        f["abw"] = b["abw"] if b["abw"] in Z.ABW else ""
    if "notiz" in b:
        f["notiz"] = str(b["notiz"] or "")[:500]
    if "pausen" in b:   # Pause als Zeitraum aus dem Zeitstrahl; null = wieder die Vorgabe aus den Einstellungen
        f["pausen"] = None if b["pausen"] is None else json.dumps(Z.pausen_pruefen(b["pausen"]))
        f["pause"] = None
    with db.tx() as c:
        x = _offen(c, uid, t) if ("pausen" in b or "kommen" in b or "gehen" in b) else None
        if x:
            return x
        vorher = Z.stand(c, uid, t)
        tk = Z.takt(c)
        for k in ("kommen", "gehen"):
            if f.get(k):
                f[k] = Z.m2h(Z.runden(Z.h2m(f[k]), tk))
        Z.zt_setzen(c, uid, t, **f)
        if f.get("pausen"):
            Z.zusammenfassen(c, uid, t, p_vorrang=True)   # die Pause verdrängt, was darunter lag
        return jsonify(_antwort(c, uid, t, vorher))


@app.post("/api/tag/bestaetigen")
def tag_ok():
    b = request.get_json(silent=True) or {}
    t, uid = _tag(b.get("d")), g.user["id"]
    if t > Z.heute():
        return jsonify(error="Zukünftige Tage lassen sich nicht bestätigen."), 400
    with db.tx() as c:
        vor = {r["id"] for r in c.execute("SELECT id FROM zeit_eintrag WHERE user_id=? AND tag=?", (uid, t)).fetchall()}
        vorher = Z.stand(c, uid, t)
        d = Z.bestaetigen(c, uid, t, g.user["name"], aussen=b.get("aussen") is True)
        d["vorher"] = vorher
        d["konto"] = Z.konto(c, uid)
        d["uebernommen"] = [r["id"] for r in c.execute("SELECT id FROM zeit_eintrag WHERE user_id=? AND tag=?", (uid, t)).fetchall() if r["id"] not in vor]   # für „Rückgängig“
    return jsonify(d)


@app.post("/api/tag/oeffnen")
def tag_auf():
    b = request.get_json(silent=True) or {}
    t, uid = _tag(b.get("d")), g.user["id"]
    weg = [int(x) for x in (b.get("weg") or []) if str(x).isdigit()][:200]   # Rückgängig des Bestätigens: die dabei übernommenen Vorschläge wieder zu Vorschlägen machen
    with db.tx() as c:
        Z.zt_setzen(c, uid, t, bestaetigt="")
        for eid in weg:
            c.execute("DELETE FROM zeit_eintrag WHERE id=? AND user_id=? AND tag=?", (eid, uid, t))
        if isinstance(b.get("stand"), dict):   # Rückgängig des Bestätigens: genau den Stand davor zurück
            try:
                Z.stand_setzen(c, uid, t, b["stand"])
            except ValueError:
                pass
        d = Z.tag_daten(c, uid, t)
        d["konto"] = Z.konto(c, uid)
    return jsonify(d)


def _eintrag_daten(b):
    v, z = _zeit(b.get("von")), _zeit(b.get("bis"))
    if not v or not z or Z.h2m(z) <= Z.h2m(v):
        return None, "Bitte Beginn und Ende angeben (Ende nach dem Beginn)."
    try:
        pid = int(b["project_id"]) if b.get("project_id") not in (None, "", 0, "0") else None
    except (TypeError, ValueError):
        pid = None
    art = b.get("art") if b.get("art") in Z.ART_NAME else ("buero" if not pid else "sonst")
    q = b.get("quelle") if b.get("quelle") in ("hand", "puls", "vorort", "fahrt", "stoppuhr", "unterwegs") else "hand"
    return {"von": v, "bis": z, "project_id": pid, "art": art, "notiz": str(b.get("notiz") or "")[:300], "quelle": q}, None


@app.post("/api/eintrag")
def eintrag_neu():
    b = request.get_json(silent=True) or {}
    t, uid = _tag(b.get("d")), g.user["id"]
    e, err = _eintrag_daten(b)
    if err:
        return jsonify(error=err), 400
    with db.tx() as c:
        x = _offen(c, uid, t)
        if x:
            return x
        vorher = Z.stand(c, uid, t)
        ig = b.get("ignor")   # verschobener Vorschlag: sein alter Platz wird nicht wieder vorgeschlagen
        if isinstance(ig, list) and len(ig) == 2 and Z.h2m(ig[0]) is not None and Z.h2m(ig[1]) is not None:
            T = Z.zt(c, uid, t)
            Z.zt_setzen(c, uid, t, ignor=json.dumps((Z._j(T["ignor"], []) + [[Z.h2m(ig[0]), Z.h2m(ig[1])]])[-200:]))
        r = c.execute("INSERT INTO zeit_eintrag(user_id, tag, von, bis, project_id, art, notiz, quelle) VALUES(?,?,?,?,?,?,?,?) RETURNING id",
                      (uid, t, e["von"], e["bis"], e["project_id"], e["art"], e["notiz"], e["quelle"])).fetchone()
        Z.zusammenfassen(c, uid, t, vorrang=r["id"])
        return jsonify(_antwort(c, uid, t, vorher))


@app.route("/api/eintrag/<int:eid>", methods=["PUT", "DELETE"])
def eintrag(eid):
    uid = g.user["id"]
    with db.tx() as c:
        r = c.execute("SELECT * FROM zeit_eintrag WHERE id=? AND user_id=?", (eid, uid)).fetchone()
        if not r:
            return jsonify(error="Eintrag nicht gefunden."), 404
        x = _offen(c, uid, r["tag"])
        if x:
            return x
        vorher = Z.stand(c, uid, r["tag"])
        if request.method == "DELETE":
            c.execute("DELETE FROM zeit_eintrag WHERE id=?", (eid,))
            alt = dict(r)
        else:
            b = {**dict(r), **(request.get_json(silent=True) or {})}
            e, err = _eintrag_daten(b)
            if err:
                return jsonify(error=err), 400
            c.execute("UPDATE zeit_eintrag SET von=?, bis=?, project_id=?, art=?, notiz=?, updated=to_char(timezone('UTC', now()), 'YYYY-MM-DD HH24:MI:SS') WHERE id=?",
                      (e["von"], e["bis"], e["project_id"], e["art"], e["notiz"], eid))
            Z.zusammenfassen(c, uid, r["tag"], vorrang=eid)
            alt = None
        return jsonify({**_antwort(c, uid, r["tag"], vorher), "geloescht": alt})


@app.post("/api/verwerfen")
def verwerfen():
    """Vorschlag nicht übernehmen (z. B. privat am Rechner) – dieser Zeitraum wird nicht mehr vorgeschlagen."""
    b = request.get_json(silent=True) or {}
    t, uid = _tag(b.get("d")), g.user["id"]
    a, z = Z.h2m(b.get("von")), Z.h2m(b.get("bis"))
    if a is None or z is None or z <= a:
        return jsonify(error="Zeitraum fehlt."), 400
    with db.tx() as c:
        T = Z.zt(c, uid, t)
        ig = Z._j(T["ignor"], [])
        if b.get("zurueck"):
            ig = [x for x in ig if x != [a, z]]
        else:
            ig.append([a, z])
        Z.zt_setzen(c, uid, t, ignor=json.dumps(ig[-200:]))
        d = Z.tag_daten(c, uid, t)
        d["konto"] = Z.konto(c, uid)
    return jsonify(d)


@app.get("/api/woche")
def woche():
    t = _tag()
    with db.tx() as c:
        return jsonify(tage=Z.woche(c, g.user["id"], t), konto=Z.konto(c, g.user["id"]))


@app.get("/api/monat")
def monat():
    m = str(request.args.get("m") or Z.heute()[:7])[:7]
    try:
        j, mo = int(m[:4]), int(m[5:7])
        erster = date(j, mo, 1)
    except ValueError:
        return jsonify(error="Monat?"), 400
    uid = g.user["id"]
    out = []
    with db.tx() as c:
        P = Z.person(c, uid)
        letzter = (date(j + (mo == 12), mo % 12 + 1, 1) - timedelta(days=1))
        L = Z.lade(c, uid, erster.isoformat(), letzter.isoformat())
        t = erster
        while t.month == mo:
            d = Z.tag_daten(c, uid, t.isoformat(), P, L)
            out.append({k: d[k] for k in ("tag", "feiertag", "soll", "ist", "arbeit", "abw", "bestaetigt")} | {"offen": len(d["vorschlaege"])})
            t += timedelta(days=1)
        k = Z.konto(c, uid, P=P)
    return jsonify(tage=out, konto=k, person=P)


@app.put("/api/abwesenheit")
def abwesenheit():
    """Urlaub, Krank usw. für einen Zeitraum (nur Arbeitstage); leere Art nimmt sie wieder weg."""
    b = request.get_json(silent=True) or {}
    von, bis, art = _tag(b.get("von")), _tag(b.get("bis") or b.get("von")), b.get("art") or ""
    if art and art not in Z.ABW:
        return jsonify(error="Unbekannte Abwesenheit."), 400
    if bis < von or (date.fromisoformat(bis) - date.fromisoformat(von)).days > 120:
        return jsonify(error="Zeitraum prüfen (höchstens 120 Tage)."), 400
    uid, n = g.user["id"], 0
    with db.tx() as c:
        if not _admin() and Z.antrag_pflicht(c):   # Urlaub, Frei, Fortbildung: nur über einen Antrag (Krank direkt)
            alt = {r["abw"] for r in c.execute("SELECT abw FROM zeit_tag WHERE user_id=? AND tag>=? AND tag<=?", (uid, von, bis)).fetchall()}
            if art in Z.ANTRAG_ARTEN or (not art and alt & set(Z.ANTRAG_ARTEN)):
                return jsonify(error="Urlaub, Frei und Fortbildung bitte beantragen – die Verwaltung genehmigt sie."), 403
        P = Z.person(c, uid)
        t = date.fromisoformat(von)
        while t.isoformat() <= bis:
            if Z.soll_min(P, t.isoformat()) or not art:
                Z.zt_setzen(c, uid, t.isoformat(), abw=art)
                n += 1
            t += timedelta(days=1)
        k = Z.konto(c, uid, P=P)
    return jsonify(ok=True, tage=n, konto=k)


# ---------------------------------------------------------------- Urlaubsanträge
@app.get("/api/antraege")
def antraege():
    """Eigene Anträge des Jahres; Administratoren mit ?alle=1 alle offenen und die des Jahres – mit Resturlaub der Person."""
    jahr = (request.args.get("jahr") or Z.heute()[:4])[:4]
    with db.tx() as c:
        if request.args.get("alle") and _admin():
            L = [a for a in Z.antraege(c, jahr=jahr) if a["status"] != "zurueckgezogen"] + [a for a in Z.antraege(c, status="offen") if a["bis"][:4] != jahr]
            rest = {}
            for a in L:
                if a["user_id"] not in rest:
                    k = Z.konto(c, a["user_id"])
                    rest[a["user_id"]] = {"rest": k["urlaub_rest"], "beantragt": k["urlaub_beantragt"]}
                a["konto"] = rest[a["user_id"]]
            return jsonify(antraege=L)
        return jsonify(antraege=Z.antraege(c, uid=g.user["id"], jahr=jahr), pflicht=Z.antrag_pflicht(c))


@app.post("/api/antraege")
def antrag_neu():
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        try:
            aid = Z.antrag_neu(c, g.user["id"], b)
        except ValueError as e:
            return jsonify(error=str(e)), 400
        a = Z.antrag(c, aid)
    C.audit(g.user["name"], "zeiten", "Urlaub beantragt", f"{a['von']} – {a['bis']} ({Z.ABW.get(a['art'], a['art'])}, {a['tage']:g} T)")
    return jsonify(antrag=a)


@app.put("/api/antraege/<int:aid>")
def antrag_aendern(aid):
    """aktion: genehmigen / ablehnen (Administratoren) oder zurueckziehen (die Person selbst, Administratoren immer)."""
    b = request.get_json(silent=True) or {}
    akt = b.get("aktion")
    with db.tx() as c:
        try:
            if akt in ("genehmigen", "ablehnen"):
                if not _admin():
                    return jsonify(error="Nur die Verwaltung entscheidet über Anträge."), 403
                a = Z.antrag(c, aid)
                if a and a["user_id"] == g.user["id"] and c.execute("SELECT COUNT(*) AS n FROM users WHERE is_admin=1 AND active=1 AND id<>?", (g.user["id"],)).fetchone()["n"]:
                    return jsonify(error="Den eigenen Antrag entscheidet eine andere Person der Verwaltung."), 403
                a = Z.antrag_entscheiden(c, aid, akt == "genehmigen", g.user["name"], b.get("antwort") or "")
            elif akt == "zurueckziehen":
                a = Z.antrag_zurueckziehen(c, aid, g.user["id"], _admin())
            else:
                return jsonify(error="Unbekannte Aktion."), 400
        except ValueError as e:
            return jsonify(error=str(e)), 400
    C.audit(g.user["name"], "zeiten", {"genehmigen": "Urlaub genehmigt", "ablehnen": "Urlaub abgelehnt", "zurueckziehen": "Urlaubsantrag zurückgezogen"}[akt],
            f"{a['name']}: {a['von']} – {a['bis']}")
    return jsonify(antrag=a)


@app.put("/api/antrag_pflicht")
def antrag_pflicht():
    """Büro-Einstellung: Urlaub, Frei und Fortbildung nur über Antrag (Vorgabe) oder direkt eintragen."""
    if (r := _nur_admin()):
        return r
    v = "1" if (request.get_json(silent=True) or {}).get("an") else "0"
    with db.tx() as c:
        c.execute("INSERT INTO settings(key, value) VALUES('zeit_antrag', ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (v,))
    return jsonify(antrag_pflicht=v == "1")


FAHRT_RICHTUNG = {"hin": "zur Baustelle", "zurueck": "zurück ins Büro", "andere": "Fahrt"}


def _ort(o):
    """Standort vom Handy (nur wenn erlaubt): auf ~10 m gerundet."""
    try:
        lat, lng = float(o["lat"]), float(o["lng"])
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return {"lat": round(lat, 4), "lng": round(lng, 4), "acc": int(min(max(float(o.get("acc") or 0), 0), 100000))}
    except (TypeError, ValueError, KeyError):
        pass
    return None


def _km(a, b):
    """Luftlinie in km zwischen zwei Standorten."""
    import math
    if not a or not b:
        return None
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dp, dl = p2 - p1, math.radians(b["lng"] - a["lng"])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * 6371 * math.asin(math.sqrt(h)), 1)


@app.route("/api/lauf", methods=["GET", "POST", "DELETE"])
def lauf():
    """Stoppuhr: starten (POST), anhalten und als Zeit eintragen (DELETE ?speichern=1) oder verwerfen (DELETE).
    Fahrt (POST mit fahrt={richtung, ort}): Einsteigen; Aussteigen = DELETE ?speichern=1 mit {ort} – Quelle „unterwegs“, Art „Fahrt“."""
    uid = g.user["id"]
    with db.tx() as c:
        r = c.execute("SELECT * FROM zeit_lauf WHERE user_id=?", (uid,)).fetchone()
        if request.method == "GET":
            return jsonify(lauf=dict(r) if r else None)
        b = request.get_json(silent=True) or {}
        if request.method == "POST":
            try:
                pid = int(b["project_id"]) if b.get("project_id") not in (None, "", 0, "0") else None
            except (TypeError, ValueError):
                pid = None
            art = b.get("art") if b.get("art") in Z.ART_NAME else ("buero" if not pid else "sonst")
            fahrt = ""
            if isinstance(b.get("fahrt"), dict):
                ri = b["fahrt"].get("richtung") if b["fahrt"].get("richtung") in FAHRT_RICHTUNG else "andere"
                fahrt = json.dumps({"richtung": ri, "ab": _ort(b["fahrt"].get("ort") or {})})
                art = "fahrt"
            c.execute("INSERT INTO zeit_lauf(user_id, start, project_id, art, notiz, fahrt) VALUES(?,?,?,?,?,?) ON CONFLICT (user_id) DO UPDATE SET "
                      "start=EXCLUDED.start, project_id=EXCLUDED.project_id, art=EXCLUDED.art, notiz=EXCLUDED.notiz, fahrt=EXCLUDED.fahrt",
                      (uid, Z.jetzt().strftime("%Y-%m-%d %H:%M"), pid, art, str(b.get("notiz") or "")[:300], fahrt))
            return jsonify(lauf=dict(c.execute("SELECT * FROM zeit_lauf WHERE user_id=?", (uid,)).fetchone()))
        c.execute("DELETE FROM zeit_lauf WHERE user_id=?", (uid,))
        fertig = None
        if r and request.args.get("speichern"):
            t, v = r["start"][:10], r["start"][11:16]
            n = Z.jetzt()
            bis = n.strftime("%H:%M") if n.strftime("%Y-%m-%d") == t else "23:59"
            if Z.h2m(bis) <= Z.h2m(v) and r["fahrt"]:   # Fahrt unter einer Minute: trotzdem eine Minute
                bis = Z.m2h(min(Z.h2m(v) + 1, 24 * 60 - 1))
            if Z.h2m(bis) > Z.h2m(v):
                quelle, notiz, fahrt = "stoppuhr", r["notiz"], ""
                if r["fahrt"]:
                    F = json.loads(r["fahrt"] or "{}") or {}
                    F["an"] = _ort(b.get("ort") or {})
                    km = _km(F.get("ab"), F.get("an"))
                    if km is not None:
                        F["km"] = km
                    fahrt, quelle = json.dumps(F), "unterwegs"
                    notiz = notiz or FAHRT_RICHTUNG.get(F.get("richtung"), "Fahrt")
                c.execute("INSERT INTO zeit_eintrag(user_id, tag, von, bis, project_id, art, notiz, quelle, fahrt) VALUES(?,?,?,?,?,?,?,?,?)",
                          (uid, t, v, bis, r["project_id"], r["art"], notiz, quelle, fahrt))
                fertig = {"tag": t, "von": v, "bis": bis, "project_id": r["project_id"], "fahrt": json.loads(fahrt) if fahrt else None}
    return jsonify(lauf=None, fertig=fertig)


@app.get("/api/offen")
def offen():
    """Für die Startseite: noch nicht bestätigte Tage und der Stand heute."""
    uid = g.user["id"]
    with db.tx() as c:
        o = Z.offene_tage(c, uid)
        h = Z.tag_daten(c, uid, Z.heute())
    return jsonify(offen=o, heute={k: h[k] for k in ("tag", "kommen", "arbeit", "soll", "abw")})


# ------------------------------------------------------------------ Administratoren
@app.get("/api/auswertung")
def auswertung():
    x = _nur_admin()
    if x:
        return x
    try:
        pid = int(request.args.get("pid") or 0) or None
    except ValueError:
        pid = None
    with db.tx() as c:
        return jsonify(projekte=Z.auswertung(c, pid), buero_satz=Z.buero_satz(c), arten=Z.ARTEN)


@app.route("/api/projekt/<int:pid>", methods=["GET", "PUT"])
def projekt(pid):
    x = _nur_admin()
    if x:
        return x
    with db.tx() as c:
        if request.method == "PUT":
            Z.projekt_einst_setzen(c, pid, request.get_json(silent=True) or {})
        return jsonify(Z.projekt_einst(c, pid))


@app.get("/api/konten")
def konten():
    x = _nur_admin()
    if x:
        return x
    with db.tx() as c:
        return jsonify(konten=Z.konten(c), buero_satz=Z.buero_satz(c), takt=Z.takt(c), pause_buero=Z.pause_buero(c))


@app.route("/api/person/<int:uid>", methods=["GET", "PUT"])
def person(uid):
    x = _nur_admin()
    if x:
        return x
    with db.tx() as c:
        if request.method == "PUT":
            Z.person_setzen(c, uid, request.get_json(silent=True) or {})
        return jsonify(Z.person(c, uid))


@app.put("/api/zeit_einst")
def zeit_einst():
    """Zeittakt und Pausenvorgabe des Büros (nur Verwaltung)."""
    x = _nur_admin()
    if x:
        return x
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        if "takt" in b:
            try:
                tk = int(b["takt"])
            except (TypeError, ValueError):
                tk = 0
            if tk not in Z.TAKTE:
                return jsonify(error="Takt: 5, 10, 15 oder 30 Minuten."), 400
            c.execute("INSERT INTO settings(key, value) VALUES('zeit_takt', ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (str(tk),))
        if "pause" in b:
            p = Z._pause_norm({**Z.pause_buero(c), **(b["pause"] if isinstance(b["pause"], dict) else {})})
            c.execute("INSERT INTO settings(key, value) VALUES('zeit_pause', ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (json.dumps(p),))
        return jsonify(takt=Z.takt(c), pause_buero=Z.pause_buero(c))


@app.put("/api/buero_satz")
def buero_satz():
    x = _nur_admin()
    if x:
        return x
    v = str((request.get_json(silent=True) or {}).get("satz") or "").replace(",", ".").strip()
    try:
        v = str(float(v)) if v else ""
    except ValueError:
        return jsonify(error="Bitte eine Zahl eingeben."), 400
    with db.tx() as c:
        c.execute("INSERT INTO settings(key, value) VALUES('zeit_satz', ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (v,))
        return jsonify(buero_satz=Z.buero_satz(c))


@app.get("/api/export.csv")
def export():
    """Arbeitszeitnachweis eines Monats für alle (Lohn/Steuerbüro) – Excel öffnet die Datei direkt."""
    x = _nur_admin()
    if x:
        return x
    m = str(request.args.get("m") or Z.heute()[:7])[:7]
    with db.tx() as c:
        rows = Z.export_zeilen(c, m)
    buf = io.StringIO()
    wr = csv.writer(buf, delimiter=";")
    wr.writerow(["Mitarbeiter:in", "Datum", "Tag", "Kommen", "Gehen", "Pause", "Arbeitszeit", "Soll", "Abwesenheit / Feiertag", "bestätigt"])
    wr.writerows(rows)
    return Response("﻿" + buf.getvalue(), mimetype="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f"attachment; filename=Arbeitszeit_{m}.csv"})


@app.get("/api/export_projekte.csv")
def export_projekte():
    x = _nur_admin()
    if x:
        return x
    with db.tx() as c:
        P = Z.auswertung(c)
    buf = io.StringIO()
    wr = csv.writer(buf, delimiter=";")
    wr.writerow(["Projekt", "Leistungsphase", "Stunden", "Soll-Stunden"])
    for p in P:
        for k, n in Z.ARTEN:
            if p["arten"].get(k) or p["soll"].get(k):
                wr.writerow([p["name"], n, f"{p['arten'].get(k, 0) / 60:.2f}".replace(".", ","), str(p["soll"].get(k, "")).replace(".", ",")])
    return Response("﻿" + buf.getvalue(), mimetype="text/csv; charset=utf-8",
                    headers={"Content-Disposition": "attachment; filename=Projektzeiten.csv"})

