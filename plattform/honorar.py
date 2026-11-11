"""Honorar: Honoraraufträge je Projekt (HOAI 2021 Gebäude, nach Aufwand oder pauschal), Abgleich mit der Zeiterfassung,
Honorarangebot als PDF. Nur für Administratoren (Stundensätze, Honorare). Rechnung: bpcore/honorar.py.
Später: Rechnungen (Abschlag/Schluss) aus dem erbrachten Anteil, Freischaltung für einzelne Benutzer."""
import io
import json
import time

from flask import Response, g, jsonify, redirect, request

from bpcore import db, honorar as H, papierkorb, platform, sso, zeiten as Z
import common as C

app = C.make_app(__name__)
KEY = "honorar"
FELDER = ("name", "art", "status", "kosten", "kosten_info", "zone", "satz", "umbau", "lph", "nk", "einheit", "satz_h", "pauschal", "auftraggeber", "notiz", "datum")
STATUS = {"angebot": "Angebot", "beauftragt": "beauftragt", "abgeschlossen": "abgeschlossen"}


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
    if not u["is_admin"] or KEY in sso.apps_aus():
        if KEY in sso.apps_aus():
            return C.gesperrt(KEY, "")
        msg = "„Honorar“ ist nur für die Verwaltung (Administratoren)."
        if p.startswith("/api/"):
            return jsonify(error=msg), 403
        return (f'{msg} <a href="{C.app_base("portal")}/">Zur Startseite</a>', 403, {"Content-Type": "text/html; charset=utf-8"})
    g.user = u


@app.get("/")
def index():
    return C.page("honorar.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


def _zeile(c, r):
    a = H.sauber(dict(r))
    nk_auf = c.execute("SELECT COALESCE(SUM(betrag), 0) AS s FROM honorar_nk WHERE auftrag_id=?", (a["id"],)).fetchone()["s"] or 0
    z = H.zeiten_projekt(c, a["project_id"], a["einheit"], a["satz_h"])
    return a, H.rechne(a, z, nk_auf), z


@app.get("/api/auftraege")
def liste():
    with db.tx() as c:
        P = {r["id"]: dict(r) for r in c.execute("SELECT id, name, archived FROM projects ORDER BY name").fetchall()}
        out = []
        for r in c.execute("SELECT * FROM honorar_auftrag ORDER BY geaendert DESC").fetchall():
            a, k, _ = _zeile(c, r)
            out.append({"id": a["id"], "project_id": a["project_id"], "projekt": (P.get(a["project_id"]) or {}).get("name", ""), "name": a["name"],
                        "art": a["art"], "status": a["status"], "netto": k["netto"], "ist_kosten": k["ist_kosten"], "warnung": bool(k["warnungen"])})
    return jsonify(auftraege=out, projekte=[{"id": p["id"], "name": p["name"]} for p in P.values() if not p["archived"]],
                   lph=H.LPH, zonen=H.ZONEN, status=STATUS, mwst=H.MWST, arten=Z.ARTEN)


def _detail(c, aid):
    r = c.execute("SELECT * FROM honorar_auftrag WHERE id=?", (aid,)).fetchone()
    if not r:
        return None
    a, k, z = _zeile(c, r)
    p = c.execute("SELECT name FROM projects WHERE id=?", (a["project_id"],)).fetchone()
    nk = [dict(x) for x in c.execute("SELECT * FROM honorar_nk WHERE auftrag_id=? ORDER BY datum, id", (aid,)).fetchall()]
    return {"auftrag": a, "rechnung": k, "zeiten": z, "nk_liste": nk, "projekt": p["name"] if p else "", "buero_satz": Z.buero_satz(c),
            "tafel": H.tafel(a["kosten"], a["zone"])}


@app.get("/api/auftraege/<int:aid>")
def detail(aid):
    with db.tx() as c:
        d = _detail(c, aid)
    return jsonify(d) if d else (jsonify(error="Auftrag nicht gefunden."), 404)


@app.post("/api/auftraege")
def neu():
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        p = c.execute("SELECT id, name FROM projects WHERE id=?", (b.get("project_id"),)).fetchone()
        if not p:
            return jsonify(error="Bitte ein Projekt wählen."), 400
        art = b.get("art") if b.get("art") in ("hoai", "stunden", "pauschal") else "hoai"
        name = (b.get("name") or "").strip() or {"hoai": "Architektenleistungen LPh 1–9", "stunden": "Leistungen nach Aufwand", "pauschal": "Pauschalauftrag"}[art]
        aid = c.execute("INSERT INTO honorar_auftrag(project_id, name, art, lph, nk, datum, von) VALUES(?,?,?,?,?,?,?) RETURNING id",
                        (p["id"], name[:200], art, json.dumps(H.lph_vorgabe()), json.dumps({"art": "pauschal", "p": 5}), time.strftime("%Y-%m-%d"), g.user["name"])).fetchone()["id"]
        d = _detail(c, aid)
    C.audit(g.user["name"], "honorar", "Honorarauftrag angelegt", f"{p['name']}: {name}")
    return jsonify(d)


@app.put("/api/auftraege/<int:aid>")
def aendern(aid):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = c.execute("SELECT * FROM honorar_auftrag WHERE id=?", (aid,)).fetchone()
        if not r:
            return jsonify(error="Auftrag nicht gefunden."), 404
        a = H.sauber({**dict(r), **{k: v for k, v in b.items() if k in FELDER}})
        if b.get("status") and b["status"] in STATUS:
            a["status"] = b["status"]
        c.execute("""UPDATE honorar_auftrag SET name=?, art=?, status=?, kosten=?, kosten_info=?, zone=?, satz=?, umbau=?, lph=?, nk=?, einheit=?,
                     satz_h=?, pauschal=?, auftraggeber=?, notiz=?, datum=?, geaendert=? WHERE id=?""",
                  (str(a["name"] or "")[:200], a["art"], a["status"] if a["status"] in STATUS else "angebot", a["kosten"], str(a.get("kosten_info") or "")[:300],
                   a["zone"], a["satz"], a["umbau"], json.dumps(a["lph"]), json.dumps(a["nk"]), a["einheit"], a["satz_h"], a["pauschal"],
                   str(a.get("auftraggeber") or "")[:300], str(a.get("notiz") or "")[:2000], str(a.get("datum") or "")[:10],
                   time.strftime("%Y-%m-%d %H:%M:%S"), aid))
        d = _detail(c, aid)
    return jsonify(d)


@app.delete("/api/auftraege/<int:aid>")
def loeschen(aid):
    with db.tx() as c:
        r = c.execute("SELECT a.name, p.name AS projekt FROM honorar_auftrag a LEFT JOIN projects p ON p.id=a.project_id WHERE a.id=?", (aid,)).fetchone()
        if not r:
            return jsonify(error="Auftrag nicht gefunden."), 404
        pk = papierkorb.ablegen(c, "honorar_auftrag", aid, "Honorarauftrag", r["name"], g.user["name"], r["projekt"] or "", KEY)
    C.audit(g.user["name"], "honorar", "Honorarauftrag gelöscht", f"{r['projekt']}: {r['name']}")
    return jsonify(ok=True, papierkorb=pk)


@app.get("/api/auftraege/<int:aid>/kosten")
def kosten_holen(aid):
    """Anrechenbare Kosten aus der gültigen Kostenermittlung des Projekts (nur Vorschlag – übernommen wird im Browser)."""
    with db.tx() as c:
        r = c.execute("SELECT project_id FROM honorar_auftrag WHERE id=?", (aid,)).fetchone()
        if not r:
            return jsonify(error="Auftrag nicht gefunden."), 404
        betrag, info = H.kosten_aus_kostenermittlung(c, r["project_id"])
    return jsonify(betrag=betrag, info=info) if betrag is not None else (jsonify(error=info), 404)


@app.post("/api/auftraege/<int:aid>/nk")
def nk_neu(aid):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        if not c.execute("SELECT 1 FROM honorar_auftrag WHERE id=?", (aid,)).fetchone():
            return jsonify(error="Auftrag nicht gefunden."), 404
        c.execute("INSERT INTO honorar_nk(auftrag_id, datum, art, text, betrag) VALUES(?,?,?,?,?)",
                  (aid, str(b.get("datum") or time.strftime("%Y-%m-%d"))[:10], b.get("art") if b.get("art") in ("plot", "fahrt", "sonst") else "sonst",
                   str(b.get("text") or "")[:300], H._f(b.get("betrag"))))
        d = _detail(c, aid)
    return jsonify(d)


@app.delete("/api/nk/<int:nid>")
def nk_weg(nid):
    with db.tx() as c:
        r = c.execute("SELECT auftrag_id FROM honorar_nk WHERE id=?", (nid,)).fetchone()
        if not r:
            return jsonify(error="Nicht gefunden."), 404
        c.execute("DELETE FROM honorar_nk WHERE id=?", (nid,))
        d = _detail(c, r["auftrag_id"])
    return jsonify(d)


def _eur(v):
    return f"{v:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")


@app.get("/api/auftraege/<int:aid>/angebot.pdf")
def angebot_pdf(aid):
    """Honorarangebot (bzw. -aufstellung) als PDF auf dem Briefbogen des Büros."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from bpcore import briefbogen, schrift
    with db.tx() as c:
        d = _detail(c, aid)
        if not d:
            return jsonify(error="Auftrag nicht gefunden."), 404
        bogen = briefbogen.holen(c)
        F = schrift.fuer(c)
        buero = (c.execute("SELECT value FROM settings WHERE key='office_name'").fetchone() or {"value": ""})["value"]
    a, k = d["auftrag"], d["rechnung"]
    rand = briefbogen.raender(bogen) or {}
    L, R = rand.get("links") or 25 * mm, A4[0] - (rand.get("rechts") or 20 * mm)
    oben, unten = A4[1] - (rand.get("kopf") or 45 * mm) - 8 * mm, (rand.get("fuss") or 25 * mm) + 6 * mm
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    cv.setTitle(f"Honorarangebot {d['projekt']}")
    y = oben

    def neue_seite():
        nonlocal y
        cv.showPage(); y = A4[1] - 25 * mm

    def zeile(links, rechts="", fett=False, gr=10, ab=5.2 * mm, grau=False):
        nonlocal y
        if y < unten + ab:
            neue_seite()
        cv.setFont(F["b"] if fett else F["n"], gr)
        cv.setFillGray(0.45 if grau else 0)
        cv.drawString(L, y, links)
        if rechts:
            cv.drawRightString(R, y, rechts)
        y -= ab
    titel = "Honorarangebot" if a["status"] == "angebot" else "Honoraraufstellung"
    zeile(titel, fett=True, gr=15, ab=8 * mm)
    zeile(f"Projekt: {d['projekt']}", ab=5 * mm)
    zeile(f"Leistung: {a['name']}", ab=5 * mm)
    if a.get("auftraggeber"):
        zeile(f"Auftraggeber: {a['auftraggeber']}", ab=5 * mm)
    zeile(f"Datum: {time.strftime('%d.%m.%Y')}", ab=9 * mm, grau=True)
    if a["art"] == "hoai":
        zeile("Grundlagen (HOAI 2021, Gebäude, §§ 33–35)", fett=True, ab=6 * mm)
        zeile("Anrechenbare Kosten (netto)", _eur(a["kosten"]))
        if a.get("kosten_info"):
            zeile("   " + a["kosten_info"][:110], grau=True, gr=8.5, ab=4.4 * mm)
        zeile("Honorarzone", H.ZONEN[a["zone"] - 1])
        zeile("Honorarsatz", "Basishonorarsatz" if not a["satz"] else f"{a['satz']:g} % der Spanne zwischen Basis- und oberem Honorarsatz".replace(".", ","))
        zeile("Honorar für 100 % der Leistungen", _eur(k["grund"]), ab=8 * mm)
        zeile("Leistungsphasen (§ 34)", fett=True, ab=6 * mm)
        for p in k["phasen"]:
            if p["an"]:
                zeile(f"LPh {p['key'][3:]}  {p['name']}  ({p['p']:g} %)".replace(".", ","), _eur(p["honorar"]))
        zeile("Summe Leistungsphasen", _eur(k["summe_lph"]), fett=True, ab=7 * mm)
        if k["umbau"]:
            zeile(f"Umbauzuschlag {a['umbau']:g} % (§ 36)".replace(".", ","), _eur(k["umbau"]))
    elif a["art"] == "pauschal":
        zeile("Pauschalhonorar", _eur(k["summe_lph"]), fett=True, ab=7 * mm)
    else:
        zeile("Abrechnung nach Aufwand", fett=True, ab=6 * mm)
        satz = a["satz_h"] or d["buero_satz"]
        zeile(f"Stundensatz {_eur(satz) if satz else 'je Mitarbeiter:in'} · Abrechnung je angefangene {a['einheit']} Minuten", grau=True)
        zeile("Bisheriger Aufwand", _eur(k["summe_lph"]), fett=True, ab=7 * mm)
    zeile(f"Nebenkosten {'pauschal ' + format(a['nk']['p'], 'g').replace('.', ',') + ' %' if a['nk']['art'] == 'pauschal' else 'nach Aufwand'} (§ 14)", _eur(k["nk"]), ab=8 * mm)
    cv.setLineWidth(0.6); cv.line(L, y + 5 * mm, R, y + 5 * mm)
    zeile("Honorar netto", _eur(k["netto"]), fett=True)
    zeile(f"zzgl. {H.MWST:g} % Umsatzsteuer", _eur(k["mwst"]))
    zeile("Honorar brutto", _eur(k["brutto"]), fett=True, gr=11, ab=10 * mm)
    if a.get("notiz"):
        for t in a["notiz"].splitlines()[:20]:
            zeile(t[:120], gr=9.5, ab=4.8 * mm)
    zeile("Die Honorarwerte der HOAI 2021 sind Orientierungswerte; das Honorar ist frei vereinbar.", grau=True, gr=8.5)
    if buero:
        zeile(buero, grau=True, gr=8.5)
    cv.save()
    pdf = briefbogen.unterlegen(buf.getvalue(), bogen)
    name = f"Honorar_{(d['projekt'].split() or ['Projekt'])[0]}_{time.strftime('%Y-%m-%d')}.pdf"
    return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="{name}"', "Cache-Control": "no-store"})


C.wait_schema()
