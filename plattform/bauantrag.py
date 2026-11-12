"""Bauantrag: Anträge je Projekt (Baugenehmigung, Vorbescheid, Freistellung) – Schritt für Schritt, mit Werten aus Projektdaten,
Adressen, Baukosten, Büro und Mein Konto. Je Feld sieht man die Quelle und kann auf sie zurücksetzen. Bauvorlagen als Checkliste
mit Erkennung aus dem Projektordner. Ausgabe: das amtliche Formular, ausgefüllt (bpcore/bauantrag_formulare.py). Felder und Quellen: bpcore/bauantrag.py."""
import json
import re
import time
import urllib.parse

from flask import Response, g, jsonify, redirect, request

from bpcore import bauantrag as BA, bauantrag_anlagen as BAN, bauantrag_formulare as BF, bauantrag_paket as BP, bueroinfo as buero, db, papierkorb, platform, sso
import common as C

app = C.make_app(__name__)
KEY = "bauantrag"


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
        return C.gesperrt(KEY, "Für „Bauantrag“ ist dein Konto nicht freigeschaltet.")
    g.user = u


@app.get("/")
def index():
    return C.page("bauantrag.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


def _j(v, d):
    try:
        x = json.loads(v) if isinstance(v, str) else v
        return d if x is None else x
    except ValueError:
        return d


def _sees(c, pid):
    r = c.execute("SELECT id, name, leaders, archived FROM projects WHERE id=?", (pid,)).fetchone()
    if not r:
        return None
    lead = _j(r["leaders"], []) or []
    return r if g.user["is_admin"] or not lead or g.user["id"] in lead else None


def _antrag(c, aid):
    r = c.execute("SELECT * FROM bauantrag WHERE id=?", (aid,)).fetchone()
    return dict(r) if r and _sees(c, r["project_id"]) else None


def _user():
    return {"id": g.user["id"], "name": g.user["name"], "email": g.user["email"] or "", "is_admin": bool(g.user["is_admin"]),
            "vorname": C._col(g.user, "vorname") or "", "nachname": C._col(g.user, "nachname") or ""}


_DATEIEN = {}


def _dateien(pid, neu=False):
    """Dateien des Projektordners (wie in „Pläne & Dateien“) – für die Erkennung der Bauvorlagen; 10 Minuten gemerkt, ohne Ordner leer."""
    v = _DATEIEN.get(pid)
    if v and not neu and time.time() - v[0] < 600:
        return v[1]
    try:
        d = C.bt_api("GET", "/api/plaene/dateien?" + urllib.parse.urlencode({"project_id": pid, **({"neu": "1"} if neu else {})}))
        out = [{"name": f.get("name") or "", "pfad": f.get("pfad") or ""} for f in (d or {}).get("dateien") or []]
    except Exception:   # noqa: BLE001 – Laufwerk nicht erreichbar: Checkliste ohne Erkennung
        out = []
    _DATEIEN[pid] = (time.time(), out)
    return out


def _detail(c, a, dateien=None):
    daten = _j(a["daten"], {})
    F = BA.werte(c, a["project_id"], _user(), daten)
    B = BA.bauvorlagen(dateien if dateien is not None else _dateien(a["project_id"]), _j(a["bauvorlagen"], {}))
    ff, fb = BA.fehlt(F, B)
    p = c.execute("SELECT name FROM projects WHERE id=?", (a["project_id"],)).fetchone()
    W = {x["key"]: str(x["wert"] or "") for x in F}
    S, gew, haupt = BP.stuecke(c, a, W, a.get("land") or "NW")   # Vordrucke, eigene Unterlagen, Trennblätter (Schritt 1)
    P = daten.get("_paket") or {}
    AN = BAN.liste(P, B)   # Anlagen: Bauvorlagen, Pläne, Dateien, freie Zeilen
    G = BAN.gliederung(S, gew, AN)
    return {"antrag": {k: a[k] for k in ("id", "project_id", "name", "verfahren", "land", "status", "erstellt", "geaendert", "von")},
            "projekt": p["name"] if p else "", "felder": F, "bauvorlagen": B, "fehlt": {"felder": ff, "bauvorlagen": fb},
            "schritte": BA.SCHRITTE, "paket": S, "gewaehlt": gew, "haupt_nr": haupt,
            "deckblatt": BP.deckblatt(P, B), "anschreiben": BP.anschreiben(P, W, BA.VERFAHREN.get(a["verfahren"])),
            "anlagen": AN, "gliederung": G, "abgabe": P.get("abgabe") or "papier", "packliste": len(BAN.packliste(G, P.get("abgabe"))), "stand_namen": BAN.STAND}


@app.get("/api/antraege")
def liste():
    with db.tx() as c:
        P = {r["id"]: dict(r) for r in c.execute("SELECT id, name, leaders, archived FROM projects ORDER BY name").fetchall()}
        sicht = {pid for pid in P if _sees(c, pid)}
        out = [{"id": r["id"], "project_id": r["project_id"], "projekt": P[r["project_id"]]["name"], "name": r["name"], "verfahren": r["verfahren"],
                "status": r["status"], "geaendert": r["geaendert"]}
               for r in c.execute("SELECT id, project_id, name, verfahren, status, geaendert FROM bauantrag ORDER BY geaendert DESC").fetchall()
               if r["project_id"] in sicht]
    return jsonify(antraege=out, projekte=[{"id": p["id"], "name": p["name"]} for pid, p in P.items() if pid in sicht and not p["archived"]],
                   verfahren=BA.VERFAHREN)


@app.post("/api/antraege")
def neu():
    b = request.get_json(silent=True) or {}
    try:
        pid = int(b.get("project_id") or 0)
    except (TypeError, ValueError):
        pid = 0
    verf = b.get("verfahren") if b.get("verfahren") in BA.VERFAHREN else "baugenehmigung"
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden."), 404
        name = str(b.get("name") or "").strip()[:200] or BA.VERFAHREN[verf]
        aid = c.execute("INSERT INTO bauantrag(project_id, name, verfahren, land, daten, von) VALUES(?,?,?,?,?,?) RETURNING id",   # Land: Büroinfos
                        (pid, name, verf, buero.land_oder(c), json.dumps({"verfahren": verf}), g.user["name"])).fetchone()["id"]
        d = _detail(c, _antrag(c, aid))
    C.audit(g.user["name"], KEY, "Bauantrag angelegt", name)
    return jsonify(d)


@app.get("/api/antraege/<int:aid>")
def holen(aid):
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        return jsonify(_detail(c, a, _dateien(a["project_id"], request.args.get("neu") == "1")))


def _felder_setzen(c, a, daten, felder):
    """Felder in den Antrag übernehmen: was eine Quelle hat (Projektdaten, Adressen, Projekt, Mein Konto, Büro), wird dort gespeichert –
    nicht nur im Antrag; der Rest steht in daten. → daten (ohne Speichern)."""
    F = {k: v for k, v in felder.items() if k in BA.FK}
    if F:
        wahl = F.get("ev_wahl") or daten.get("ev_wahl") or (BA.quellen(c, a["project_id"], _user()).get("ev_wahl") or ("buero",))[0]
        for k in BA.zurueckschreiben(c, a["project_id"], _user(), F, wahl, g.user["name"]):
            daten.pop(k, None)
            F.pop(k)
    for k, v in F.items():
        if v is None:
            daten.pop(k, None)
        else:
            daten.update(BA.sauber({k: v}))
    return daten


@app.put("/api/antraege/<int:aid>")
def aendern(aid):
    """b.felder: {feld: wert | null} – null = zurück auf die Quelle; b.bauvorlagen: {key: {status, notiz} | null}; b.name, b.status."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        if a["status"] == "eingereicht" and b.get("status") != "entwurf" and (b.get("felder") or b.get("bauvorlagen")):
            return jsonify(error="Der Antrag ist eingereicht – zum Ändern erst wieder auf „Entwurf“ stellen."), 409
        daten = _felder_setzen(c, a, _j(a["daten"], {}), b.get("felder") or {})
        bv = _j(a["bauvorlagen"], {})
        for k, v in (b.get("bauvorlagen") or {}).items():
            if any(k == x[0] for x in BA.BAUVORLAGEN):
                if v is None:
                    bv.pop(k, None)
                else:
                    bv[k] = {"status": v.get("status") if v.get("status") in ("da", "offen", "entfaellt", "beigefuegt") else "",
                             "notiz": str(v.get("notiz") or "")[:300]}
        name = str(b["name"]).strip()[:200] if b.get("name") else a["name"]
        status = b["status"] if b.get("status") in ("entwurf", "eingereicht", "genehmigt") else a["status"]
        verf = daten.get("verfahren") if daten.get("verfahren") in BA.VERFAHREN else a["verfahren"]
        c.execute("UPDATE bauantrag SET name=?, status=?, verfahren=?, daten=?, bauvorlagen=?, geaendert=? WHERE id=?",
                  (name, status, verf, json.dumps(daten), json.dumps(bv), time.strftime("%Y-%m-%d %H:%M:%S"), aid))
        d = _detail(c, _antrag(c, aid))
    return jsonify(d)


@app.delete("/api/antraege/<int:aid>")
def loeschen(aid):
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        p = c.execute("SELECT name FROM projects WHERE id=?", (a["project_id"],)).fetchone()
        pk = papierkorb.ablegen(c, "bauantrag", aid, "Bauantrag", a["name"], g.user["name"], p["name"] if p else "", KEY)
    C.audit(g.user["name"], KEY, "Bauantrag gelöscht", a["name"])
    return jsonify(ok=True, papierkorb=pk)


def _formular(aid):
    """Antrag + amtliches Formular dazu, ausgefüllt. → (Antrag, Info, PDF-Bytes) oder (None, Fehler, Status)."""
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return None, "Antrag nicht gefunden.", 404
        d = _detail(c, a, [])
        W = {x["key"]: str(x["wert"] or "") for x in d["felder"]}
        f, nr = BF.formular_fuer(c, a["verfahren"], W)
    if not f or f.get("daten") is None:
        return None, f"Das amtliche Formular (NRW, Anlage {nr}) ist noch nicht geladen – unter „Formulare“ einmal „↻ Jetzt prüfen“.", 409
    data, gefuellt, n = BF.ausfuellen(f["daten"], W, (_j(a["daten"], {}).get("_pdf") or {}).get(f["sha256"]))
    return a, {"nr": f["nr"], "titel": f["titel"], "fassung": f["fassung"], "felder": n, "gefuellt": gefuellt, "projekt": d["projekt"]}, data


@app.get("/api/antraege/<int:aid>/formular")
def formular_info(aid):
    a, info, _ = _formular(aid)
    return jsonify(info) if a else (jsonify(error=info), _)


@app.get("/api/antraege/<int:aid>/antrag.pdf")
def pdf(aid):
    """Das amtliche Formular des Landes, mit den Angaben des Antrags ausgefüllt (kein eigenes Layout)."""
    a, info, data = _formular(aid)
    if not a:
        return jsonify(error=info), data
    k = (re.match(r"^[A-Za-z]{1,4}\d{2,6}", (info["projekt"] or "").strip()) or [""])[0]
    fn = f"{k + ' ' if k else ''}Anlage {info['nr'].replace('/', '-')} {info['titel']}"[:150].strip() + ".pdf"
    disp = "attachment" if request.args.get("dl") else "inline"
    return Response(data, mimetype="application/pdf", headers={"Content-Disposition": f"{disp}; filename*=UTF-8''{urllib.parse.quote(fn)}", "Cache-Control": "no-store"})


# ---------------------------------------------------------------- amtliche Formulare (bpcore/bauantrag_formulare.py)
@app.get("/api/formulare")
def formulare():
    with db.tx() as c:
        land = request.args.get("land") if request.args.get("land") in BF.LAENDER else buero.land_oder(c)   # ohne Angabe: Land des Büros
        nie = BF.quelle(c, land) and not BF.stand(c, land).get("geprueft")
    if nie:   # Land zum ersten Mal geöffnet: Portal gleich lesen und die Vordrucke zwischenspeichern
        BF.pruefen(db.tx, land, g.user["name"])
    with db.tx() as c:
        return jsonify(land=land, laender=BF.LAENDER, quelle=BF.quelle(c, land), vorhalten=land in BF.VORHALTEN,
                       stand=BF.stand(c, land), formulare=BF.liste(c, land), buero=buero.land_oder(c), admin=bool(g.user["is_admin"]))


@app.post("/api/formulare/pruefen")
def formulare_pruefen():
    b = request.get_json(silent=True) or {}
    if b.get("land") in BF.LAENDER:
        land = b.get("land")
    else:
        with db.tx() as c:
            land = buero.land_oder(c)
    erg = BF.pruefen(db.tx, land, g.user["name"])
    with db.tx() as c:
        return jsonify(ergebnis=erg, land=land, laender=BF.LAENDER, quelle=BF.quelle(c, land), vorhalten=land in BF.VORHALTEN,
                       stand=BF.stand(c, land), formulare=BF.liste(c, land), buero=buero.land_oder(c), admin=bool(g.user["is_admin"]))


@app.put("/api/formulare/quelle")
def formulare_quelle():
    """Seite mit den Vordrucken eines Landes eintragen – nur Verwaltung (der Server ruft sie ab). NRW: leer = Seite der Architektenkammer."""
    if not g.user["is_admin"]:
        return jsonify(error="Nur für die Verwaltung."), 403
    b = request.get_json(silent=True) or {}
    land = b.get("land")
    if land not in BF.LAENDER:
        return jsonify(error="Unbekanntes Land."), 400
    try:
        with db.tx() as c:
            BF.quelle_setzen(c, land, str(b.get("url") or "").strip()[:500], g.user["name"])
    except (ValueError, OSError) as e:
        return jsonify(error=str(e)), 400
    return formulare_pruefen()


@app.post("/api/formulare/hochladen")
def formular_hochladen():
    """Formular selbst hochladen (Portal nicht mehr lesbar oder Vordruck fehlt): multipart land, nr, titel, id (ersetzen), datei."""
    f = request.files.get("datei")
    land = request.form.get("land") if request.form.get("land") in BF.LAENDER else "NW"
    if not f:
        return jsonify(error="Bitte eine PDF-Datei wählen."), 400
    try:
        with db.tx() as c:
            BF.hochladen(c, land, request.form.get("nr"), request.form.get("titel") or (f.filename or "").rsplit(".", 1)[0], f.read(BF.MAX_PDF + 1),
                         g.user["name"], request.form.get("id", type=int), f.filename or "")
    except ValueError as e:
        return jsonify(error=str(e)), 400
    C.audit(g.user["name"], KEY, "Formular hochgeladen", f"{land} {request.form.get('nr') or ''} {request.form.get('titel') or ''}")
    with db.tx() as c:
        return jsonify(land=land, laender=BF.LAENDER, quelle=BF.quelle(c, land), vorhalten=True, stand=BF.stand(c, land), formulare=BF.liste(c, land), buero=buero.land_oder(c),
                       admin=bool(g.user["is_admin"]))


@app.post("/api/formulare/<int:fid>/gesehen")
def formular_gesehen(fid):
    with db.tx() as c:
        c.execute("UPDATE bauantrag_formular SET status='aktuell' WHERE id=? AND status IN ('neu','geaendert')", (fid,))
    return jsonify(ok=True)


@app.delete("/api/formulare/<int:fid>")
def formular_loeschen(fid):
    """Selbst hochgeladenes Formular (ohne Adresse im Portal) in den Papierkorb – Vordrucke vom Portal bleiben, sie kämen beim Prüfen ohnehin wieder."""
    with db.tx() as c:
        r = c.execute("SELECT land, nr, titel, url FROM bauantrag_formular WHERE id=?", (fid,)).fetchone()
        if not r:
            return jsonify(error="Formular nicht gefunden."), 404
        if r["url"]:
            return jsonify(error="Vordrucke vom Portal lassen sich nicht löschen – nur selbst hochgeladene."), 400
        pk = papierkorb.ablegen(c, "bauantrag_formular", fid, "Formular", f"{r['nr'] or ''} {r['titel']}".strip(), g.user["name"], "", KEY)
        out = dict(land=r["land"], laender=BF.LAENDER, quelle=BF.quelle(c, r["land"]), vorhalten=True, stand=BF.stand(c, r["land"]),
                   formulare=BF.liste(c, r["land"]), admin=bool(g.user["is_admin"]), papierkorb=pk)
    C.audit(g.user["name"], KEY, "Formular gelöscht", f"{r['land']} {r['nr'] or ''} {r['titel']}")
    return jsonify(out)


@app.get("/api/formulare/<int:fid>/datei")
def formular_datei(fid):
    with db.tx() as c:
        r = c.execute("SELECT nr, titel, url, daten FROM bauantrag_formular WHERE id=?", (fid,)).fetchone()
    if not r:
        return jsonify(error="Formular nicht gefunden."), 404
    if r["daten"] is None:
        return redirect(r["url"])
    fn = f"Anlage {r['nr'].replace('/', '-')} {r['titel']}"[:120].strip() + ".pdf"
    return Response(bytes(r["daten"]), mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{urllib.parse.quote(fn)}"})


import bauantrag_paket   # noqa: E402,F401 – Antragspaket: Vordrucke wählen, eigene Unterlagen, Platzieren (Routen /api/…/paket, /unterlagen, /platzierung)
import bauantrag_anlagen   # noqa: E402,F401 – Anlagen: Pläne, Dateien, frei; Abgabe Papier/digital (Routen /api/…/anlage, /abgabe, /paket.zip)
