"""Honorar: Honoraraufträge je Projekt (HOAI 2021 Gebäude, nach Aufwand oder pauschal), Abgleich mit der Zeiterfassung,
Honorarangebot als PDF. Nur für Administratoren (Stundensätze, Honorare). Rechnung: bpcore/honorar.py.
Abschlags- und Schlussrechnungen: honorar_rechnung.py. Später: Freischaltung für einzelne Benutzer."""
import io
import json
import time

from flask import Response, g, jsonify, redirect, request

from bpcore import db, honorar as H, honorar_fremd as HF, papierkorb, platform, sso, zeiten as Z
import common as C

app = C.make_app(__name__)
KEY = "honorar"
FELDER = ("name", "art", "status", "kosten", "kosten_info", "zone", "satz", "umbau", "lph", "nk", "einheit", "satz_h", "pauschal", "auftraggeber", "notiz", "datum")
STATUS = {"anfrage": "Anfrage", "angebot": "Angebot", "beauftragt": "Auftrag", "vertrag": "Vertrag", "abrechnung": "Abrechnung",
          "abgeschlossen": "Abgeschlossen", "abgelehnt": "abgelehnt"}   # Stufen des Ablaufs, in dieser Reihenfolge
ABLAUF = {"anfrage": ("von", "datum", "weg", "leistung", "notiz"), "angebot": ("gesendet", "bindefrist", "nachfassen"),
          "auftrag": ("datum", "durch", "umfang"), "vertrag": ("datum", "bh", "buero", "ablage", "termine", "besonderes", "widerruf", "ort", "vorzeitig", "gesendet", "gesendet_an", "gesendet_mit"), "abrechnung": ("notiz",), "abgelehnt": ("datum", "grund")}


def _ablauf(alt, neu):
    """Angaben je Stufe zusammenführen; nur bekannte Felder, Text gekürzt; None löscht ein Feld."""
    try:
        a = json.loads(alt) if isinstance(alt, str) else (alt or {})
    except ValueError:
        a = {}
    for st, felder in ABLAUF.items():
        x = (neu or {}).get(st)
        if isinstance(x, dict):
            z = dict(a.get(st) or {})
            for k, v in x.items():
                if k in felder:
                    if v is None or v == "":
                        z.pop(k, None)
                    else:
                        z[k] = v if isinstance(v, bool) else str(v)[:1000]
            a[st] = z
    return a


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
    a["ablauf"] = _ablauf(a.get("ablauf"), None)
    nk_auf = c.execute("SELECT COALESCE(SUM(betrag), 0) AS s FROM honorar_nk WHERE auftrag_id=?", (a["id"],)).fetchone()["s"] or 0
    z = H.zeiten_projekt(c, a["project_id"], a["einheit"], a["satz_h"])
    return a, H.rechne(a, z, nk_auf), z


@app.get("/api/auftraege")
def liste():
    with db.tx() as c:
        P = {r["id"]: dict(r) for r in c.execute("SELECT id, name, archived FROM projects ORDER BY name").fetchall()}
        out = []
        NV = {r["auftrag_id"]: r["n"] for r in c.execute("SELECT auftrag_id, count(*) AS n FROM honorar_version WHERE auftrag_id IS NOT NULL GROUP BY auftrag_id")}
        for r in c.execute("SELECT * FROM honorar_auftrag ORDER BY geaendert DESC").fetchall():
            a, k, _ = _zeile(c, r)
            out.append({"id": a["id"], "project_id": a["project_id"], "projekt": (P.get(a["project_id"]) or {}).get("name", ""), "name": a["name"],
                        "art": a["art"], "status": a["status"], "ablauf": a["ablauf"], "versionen": NV.get(a["id"], 0), "datum": a.get("datum") or "",
                        "geaendert": a.get("geaendert") or "", "netto": k["netto"], "ist_kosten": k["ist_kosten"], "warnung": bool(k["warnungen"])})
        n_ue = c.execute("SELECT count(*) AS n FROM honorar_ueberschlag").fetchone()["n"]   # abgelegte Überschläge: Frage und Zahl in der Navigation
    return jsonify(auftraege=out, ueberschlaege=n_ue, projekte=[{"id": p["id"], "name": p["name"]} for p in P.values() if not p["archived"]],
                   lph=H.LPH, zonen=H.ZONEN, status=STATUS, mwst=H.MWST, arten=Z.ARTEN)


def _detail(c, aid):
    r = c.execute("SELECT * FROM honorar_auftrag WHERE id=?", (aid,)).fetchone()
    if not r:
        return None
    a, k, z = _zeile(c, r)
    p = c.execute("SELECT name FROM projects WHERE id=?", (a["project_id"],)).fetchone()
    nk = [dict(x) for x in c.execute("SELECT * FROM honorar_nk WHERE auftrag_id=? ORDER BY datum, id", (aid,)).fetchall()]
    import honorar_rechnung as HR
    import honorar_vertrag as HV
    return {"auftrag": a, "rechnung": k, "zeiten": z, "nk_liste": nk, "projekt": p["name"] if p else "", "buero_satz": Z.buero_satz(c),
            "tafel": H.tafel(a["kosten"], a["zone"]), "rechnungen": HR.liste(c, a, k), "vertraege": HV.vertraege(c, aid), "fremd": HF.liste(c, aid)}


@app.get("/api/auftraege/<int:aid>")
def detail(aid):
    with db.tx() as c:
        d = _detail(c, aid)
    return jsonify(d) if d else (jsonify(error="Auftrag nicht gefunden."), 404)


def anlegen(c, pid, name, art="hoai", status="angebot", ablauf=None, nk=5, **werte):
    """Neuer Honorarauftrag – Baustein des Kerns (bpcore.honorar.auftrag_anlegen), auch für die Akquise."""
    return H.auftrag_anlegen(c, pid, name, g.user["name"], art, status, ablauf, nk, **werte)


@app.post("/api/auftraege")
def neu():
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        p = c.execute("SELECT id, name FROM projects WHERE id=?", (b.get("project_id"),)).fetchone()
        if not p:
            return jsonify(error="Bitte ein Projekt wählen."), 400
        art = b.get("art") if b.get("art") in ("hoai", "stunden", "pauschal") else "hoai"
        name = (b.get("name") or "").strip() or {"hoai": "Architektenleistungen LPh 1–9", "stunden": "Leistungen nach Aufwand", "pauschal": "Pauschalauftrag"}[art]
        st = b.get("status") if b.get("status") in ("anfrage", "angebot") else "angebot"
        ab = _ablauf("{}", b.get("ablauf") if isinstance(b.get("ablauf"), dict) else None)
        aid = anlegen(c, p["id"], name, art, st, ab)
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
        a["status"] = b["status"] if b.get("status") in STATUS else r["status"]   # unbekannte Stufe: bleibt, wie sie ist
        if isinstance(b.get("ablauf"), dict):
            c.execute("UPDATE honorar_auftrag SET ablauf=? WHERE id=?", (json.dumps(_ablauf(r["ablauf"], b["ablauf"])), aid))
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


@app.post("/api/ueberschlag")
def ueberschlag():
    """Honorar überschlagen (ohne Auftrag, speichert nichts): {kosten, zone, satz, umbau, nk} → Honorar je Leistungsphase, Spanne bis oberer Satz.
    Mit project_id ohne Kosten: Vorschlag aus der gültigen Kostenermittlung des Projekts."""
    b = request.get_json(silent=True) or {}
    vorschlag = None
    if isinstance(b.get("project_id"), int) and not H._f(b.get("kosten")):
        with db.tx() as c:
            betrag, info = H.kosten_aus_kostenermittlung(c, b["project_id"])
        if betrag is not None:
            vorschlag, b["kosten"] = {"betrag": betrag, "info": info}, betrag
    a = {"art": "hoai", "kosten": b.get("kosten"), "zone": b.get("zone"), "satz": b.get("satz"), "umbau": b.get("umbau"),
         "nk": {"art": "pauschal", "p": b.get("nk", 5)}}
    k, oben = H.rechne(a), H.rechne({**a, "satz": 100})
    return jsonify(**k, oben=oben["summe_lph"], kosten=H.sauber(a)["kosten"], vorschlag=vorschlag)


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


# ---------------------------------------------------------------- Versionen (je Auftrag oder je Projekt, jederzeit umstellbar)
VFELDER = tuple(f for f in FELDER if f != "status")   # Stufe gehört zum Ablauf, nicht zur Version; was eine Version vom Auftrag festhält – dazu die Nebenkosten nach Aufwand


def _modus(c, pid):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"honorar:modus:{pid}",)).fetchone()
    return r["data"] if r and r["data"] in ("auftrag", "projekt") else "auftrag"


def _stand(c, aid):
    """Ein Auftrag als Teil einer Version: alle Felder und die Nebenkosten-Liste."""
    r = c.execute("SELECT * FROM honorar_auftrag WHERE id=?", (aid,)).fetchone()
    if not r:
        return None
    x = {k: r[k] for k in VFELDER}
    x["id"] = r["id"]
    x["nk_liste"] = [{k: n[k] for k in ("datum", "art", "text", "betrag")} for n in c.execute("SELECT * FROM honorar_nk WHERE auftrag_id=? ORDER BY datum, id", (aid,))]
    return x


def _v_liste(c, pid, aid):
    m = _modus(c, pid)
    q = ("SELECT * FROM honorar_version WHERE project_id=? AND auftrag_id IS NULL ORDER BY id DESC", (pid,)) if m == "projekt" \
        else ("SELECT * FROM honorar_version WHERE auftrag_id=? ORDER BY id DESC", (aid,))
    V = [{"id": v["id"], "name": v["name"], "gilt": bool(v["gilt"]), "erstellt": v["erstellt"], "von": v["von"], "auftraege": len(json.loads(v["daten"] or "[]"))}
         for v in c.execute(*q)]
    andere = c.execute("SELECT COUNT(*) AS n FROM honorar_version WHERE project_id=? AND " + ("auftrag_id IS NOT NULL" if m == "projekt" else "auftrag_id IS NULL"), (pid,)).fetchone()["n"]
    return {"modus": m, "versionen": V, "andere": andere}


@app.get("/api/auftraege/<int:aid>/versionen")
def versionen(aid):
    with db.tx() as c:
        r = c.execute("SELECT project_id FROM honorar_auftrag WHERE id=?", (aid,)).fetchone()
        return jsonify(_v_liste(c, r["project_id"], aid)) if r else (jsonify(error="Auftrag nicht gefunden."), 404)


@app.put("/api/auftraege/<int:aid>/versionen/modus")
def versionen_modus(aid):
    m = (request.get_json(silent=True) or {}).get("modus")
    if m not in ("auftrag", "projekt"):
        return jsonify(error="je Auftrag oder je Projekt"), 400
    with db.tx() as c:
        r = c.execute("SELECT project_id FROM honorar_auftrag WHERE id=?", (aid,)).fetchone()
        if not r:
            return jsonify(error="Auftrag nicht gefunden."), 404
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by",
                  (f"honorar:modus:{r['project_id']}", m, time.strftime("%Y-%m-%d %H:%M:%S"), g.user["name"]))
        return jsonify(_v_liste(c, r["project_id"], aid))


@app.post("/api/auftraege/<int:aid>/versionen")
def version_neu(aid):
    """Jetzigen Stand als Version speichern – je Auftrag nur dieser, je Projekt alle Aufträge des Projekts."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = c.execute("SELECT project_id FROM honorar_auftrag WHERE id=?", (aid,)).fetchone()
        if not r:
            return jsonify(error="Auftrag nicht gefunden."), 404
        pid, m = r["project_id"], _modus(c, r["project_id"])
        ids = [x["id"] for x in c.execute("SELECT id FROM honorar_auftrag WHERE project_id=? ORDER BY id", (pid,))] if m == "projekt" else [aid]
        daten = [_stand(c, i) for i in ids]
        n = c.execute("SELECT COUNT(*) AS n FROM honorar_version WHERE " + ("project_id=? AND auftrag_id IS NULL" if m == "projekt" else "auftrag_id=?"), (pid if m == "projekt" else aid,)).fetchone()["n"]
        name = str(b.get("name") or "").strip()[:120] or f"Angebot {n + 1}"
        vid = c.execute("INSERT INTO honorar_version(project_id, auftrag_id, name, daten, erstellt, von) VALUES(?,?,?,?,?,?) RETURNING id",
                        (pid, None if m == "projekt" else aid, name, json.dumps(daten, ensure_ascii=False), time.strftime("%Y-%m-%d %H:%M:%S"), g.user["name"])).fetchone()["id"]
        return jsonify({**_v_liste(c, pid, aid), "neu": vid})


def _version(c, vid):
    v = c.execute("SELECT * FROM honorar_version WHERE id=?", (vid,)).fetchone()
    return (dict(v), json.loads(v["daten"] or "[]")) if v else (None, [])


@app.put("/api/versionen/<int:vid>")
def version_aendern(vid):
    """Umbenennen oder als „gilt“ markieren (je Auftrag bzw. je Projekt nur eine)."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        v, _ = _version(c, vid)
        if not v:
            return jsonify(error="Version nicht gefunden."), 404
        if "name" in b and str(b["name"]).strip():
            c.execute("UPDATE honorar_version SET name=? WHERE id=?", (str(b["name"]).strip()[:120], vid))
        if "gilt" in b:
            if b["gilt"]:
                c.execute("UPDATE honorar_version SET gilt=FALSE WHERE project_id=? AND " + ("auftrag_id IS NULL" if v["auftrag_id"] is None else "auftrag_id=?"),
                          (v["project_id"],) if v["auftrag_id"] is None else (v["project_id"], v["auftrag_id"]))
            c.execute("UPDATE honorar_version SET gilt=? WHERE id=?", (bool(b["gilt"]), vid))
        aid = request.args.get("auftrag", type=int) or v["auftrag_id"]
        return jsonify(_v_liste(c, v["project_id"], aid))


@app.delete("/api/versionen/<int:vid>")
def version_loeschen(vid):
    with db.tx() as c:
        v, _ = _version(c, vid)
        if not v:
            return jsonify(error="Version nicht gefunden."), 404
        c.execute("DELETE FROM honorar_version WHERE id=?", (vid,))
        return jsonify(_v_liste(c, v["project_id"], request.args.get("auftrag", type=int) or v["auftrag_id"]))


@app.post("/api/versionen/<int:vid>/laden")
def version_laden(vid):
    """Version zurückholen: die Aufträge bekommen deren Stand (fehlende werden neu angelegt), Nebenkosten-Listen wie damals."""
    with db.tx() as c:
        v, D = _version(c, vid)
        if not v:
            return jsonify(error="Version nicht gefunden."), 404
        for x in D:
            if not c.execute("SELECT 1 FROM honorar_auftrag WHERE id=?", (x["id"],)).fetchone():
                x["id"] = c.execute("INSERT INTO honorar_auftrag(project_id, von) VALUES(?,?) RETURNING id", (v["project_id"], g.user["name"])).fetchone()["id"]
            c.execute("UPDATE honorar_auftrag SET " + ", ".join(f"{k}=?" for k in VFELDER) + ", geaendert=? WHERE id=?",
                      tuple(x.get(k) for k in VFELDER) + (time.strftime("%Y-%m-%d %H:%M:%S"), x["id"]))
            c.execute("DELETE FROM honorar_nk WHERE auftrag_id=?", (x["id"],))
            for n in x.get("nk_liste") or []:
                c.execute("INSERT INTO honorar_nk(auftrag_id, datum, art, text, betrag) VALUES(?,?,?,?,?)", (x["id"], n["datum"], n["art"], n["text"], n["betrag"]))
    C.audit(g.user["name"], "honorar", "Honorar-Version geladen", v["name"])
    return jsonify(ok=True, auftraege=[x["id"] for x in D])


def _detail_version(c, aid, vid):
    """Wie _detail, aber mit dem Stand einer Version (für das PDF)."""
    v, D = _version(c, vid)
    x = next((y for y in D if y.get("id") == aid), None) if v else None
    if not x:
        return None, None
    r = c.execute("SELECT * FROM honorar_auftrag WHERE id=?", (aid,)).fetchone()
    a = H.sauber({**(dict(r) if r else {}), **{k: x.get(k) for k in VFELDER}})
    z = H.zeiten_projekt(c, v["project_id"], a["einheit"], a["satz_h"])
    k = H.rechne(a, z, sum(float(n.get("betrag") or 0) for n in x.get("nk_liste") or []))
    p = c.execute("SELECT name FROM projects WHERE id=?", (v["project_id"],)).fetchone()
    return {"auftrag": a, "rechnung": k, "zeiten": z, "nk_liste": x.get("nk_liste") or [], "projekt": p["name"] if p else "", "buero_satz": Z.buero_satz(c),
            "tafel": H.tafel(a["kosten"], a["zone"])}, v["name"]


@app.get("/api/auftraege/<int:aid>/angebot.pdf")
def angebot_pdf(aid):
    """Honorarangebot (bzw. -aufstellung) als PDF auf dem Briefbogen des Büros."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from bpcore import briefbogen, schrift
    vname = ""
    with db.tx() as c:
        if request.args.get("version", type=int):   # Stand einer gespeicherten Version
            d, vname = _detail_version(c, aid, request.args.get("version", type=int))
        else:
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
    titel = "Honorarangebot" if a["status"] in ("anfrage", "angebot", "abgelehnt") else "Honoraraufstellung"
    zeile(titel, fett=True, gr=15, ab=8 * mm)
    zeile(f"Projekt: {d['projekt']}", ab=5 * mm)
    zeile(f"Leistung: {a['name']}", ab=5 * mm)
    if vname:
        zeile(f"Version: {vname}", ab=5 * mm)
    if a.get("auftraggeber"):
        zeile(f"Auftraggeber: {a['auftraggeber']}", ab=5 * mm)
    zeile(f"Datum: {time.strftime('%d.%m.%Y')}", ab=9 * mm, grau=True)
    if a["art"] == "hoai":
        zeile("Grundlagen (HOAI 2021, Gebäude, §§ 33–35)", fett=True, ab=6 * mm)
        zeile("Anrechenbare Kosten (netto)", _eur(a["kosten"]))
        if a.get("kosten_info"):
            zeile("   " + a["kosten_info"][:110], grau=True, gr=8.5, ab=4.4 * mm)
        zeile("Honorarzone", H.ZONEN[a["zone"] - 1])
        zeile("Honorarsatz", H.satz_text(a["satz"]))
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
    name = f"Honorar_{(d['projekt'].split() or ['Projekt'])[0]}{'_' + vname.encode('latin-1', 'ignore').decode('latin-1').replace(' ', '_').replace('"', '') if vname else ''}_{time.strftime('%Y-%m-%d')}.pdf"
    return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="{name}"', "Cache-Control": "no-store"})


import honorar_rechnung   # noqa: E402,F401 – Abschlags- und Schlussrechnungen (eigenes Modul, Routen /api/…/rechnungen)
import honorar_fremdleistung   # noqa: E402,F401 – Fachplaner über unser Büro (Routen /api/…/fremd)
import honorar_ueberschlag   # noqa: E402,F401 – abgelegte Überschläge (Routen /api/ueberschlaege)
import honorar_widerruf   # noqa: E402,F401 – Widerrufsbelehrung zum Architektenvertrag, Vertrag per Mail (Routen /api/…/widerruf.pdf, /api/…/vertrag/mail)
import honorar_vertrag   # noqa: E402,F401 – Architektenvertrag und Einstellungen der Abrechnung (Routen /api/…/vertrag, /api/einstellungen)

C.wait_schema()
