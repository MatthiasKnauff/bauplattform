"""Kosten der Bauplattform – Kosten = Bauteile × Preis (Entwurf „Kosten aus Bauteilen“, entschieden am 16.11.2026).

Grundlage ist die Bauteil-Checkliste im Projektmodell (Kern: bpcore/bauteilliste.py): jede Zeile mit „wird berechnet“ ist eine Kostenzeile,
Menge aus dem Modell × Preis aus dem Bauteil-Baukasten (von – mittel – bis, Preisstand und Faktor der Baudaten). Die Kostengruppen nach
DIN 276 entstehen daraus als Zusammenfassung. Dazu nur Zuschläge: Unvorhergesehenes (%), Baunebenkosten KG 700 (% oder fest), Umsatzsteuer.
Kein Kennwert, kein Mischen, keine Kostendatenbanken, kein Plan-Lesen in dieser App – Räume und Mengen kommen aus dem Projektmodell.

Eine Kostenermittlung hält einen Stand der Bauteile fest (data.bauteile, mit dem Änderungszähler des Projektmodells). Hat sich das
Modell seitdem geändert, zeigt die App das an; „Aus dem Projektmodell übernehmen“ schreibt den neuen Stand (Linie „mit Übernahme“).
Andere Apps (Honorar, Ausschreibung, Bauantrag, Startseite, Wärmeschutz) lesen weiter calc() bzw. data.bauteile.

Genauigkeit nur aus den Bauteilen (genau()): Preis-Spanne je Zeile (unabhängig, quadratisch addiert) + gemeinsamer Marktanteil +
Mengen-Spielraum je Herkunft + was offen ist (nur nach oben). Ziel-Band je Stufe nach der Rechtsprechung (ZIEL).
"""
import json
import math
import re
from datetime import date, datetime, timedelta

from flask import g, jsonify, redirect, request

from bpcore import baudaten, bauteilliste, db, modell, papierkorb, sso, versionen
from bpcore.jsonwert import lies as _j
import common as C

app = C.make_app(__name__)
baudaten.register(app)

STUFEN = ("rahmen", "schaetzung", "berechnung", "voranschlag", "anschlag", "feststellung")   # DIN 276:2018-12, 3.4
STUFE_NAME = {"rahmen": "Kostenrahmen", "schaetzung": "Kostenschätzung", "berechnung": "Kostenberechnung", "voranschlag": "Kostenvoranschlag",
              "anschlag": "Kostenanschlag", "feststellung": "Kostenfeststellung"}
# Ziel-Band je Stufe (± %, von – bis): OLG Hamm, Beschluss vom 17.09.2020 – 17 U 75/19 (Kostenschätzung 30–40 %, Kostenberechnung 20–25 %,
# Kostenanschlag 10–15 %, jeweils bezogen auf die Kostenfeststellung). Kostenrahmen und -voranschlag dort nicht genannt: wie Schätzung bzw.
# zwischen Berechnung und Anschlag angenommen. Keine starren Grenzen – bei vereinbarter Kostenobergrenze gilt keine Toleranz;
# vgl. OLG Naumburg, Urteil vom 28.02.2018 – 3 U 36/17 (21 % im Einzelfall kein Planungsfehler; Ursache der Erhöhung entscheidet).
ZIEL = {"rahmen": (30, 40), "schaetzung": (30, 40), "berechnung": (20, 25), "voranschlag": (15, 20), "anschlag": (10, 15), "feststellung": (0, 0)}
ZIEL_QUELLE = "OLG Hamm, Beschluss vom 17.09.2020 – 17 U 75/19; keine starren Grenzen, bei vereinbarter Kostenobergrenze keine Toleranz"
MARKT = 0.05   # gemeinsamer Anteil (Markt, Index, Region), trifft alle Zeilen gleich
MENGE = {"allplan": 0.04, "ifc": 0.05, "raum": 0.08, "hand": 0.10, "frage": 0.30}   # Spielraum der Menge je Herkunft (relativ)
DIN = {
    "100": "Grundstück", "200": "Vorbereitende Maßnahmen", "300": "Bauwerk – Baukonstruktionen", "310": "Baugrube / Erdbau", "320": "Gründung, Unterbau",
    "330": "Außenwände / Vertikale Baukonstruktionen, außen", "340": "Innenwände / Vertikale Baukonstruktionen, innen", "350": "Decken / Horizontale Baukonstruktionen",
    "360": "Dächer", "370": "Infrastrukturanlagen", "380": "Baukonstruktive Einbauten", "390": "Sonstige Maßnahmen für Baukonstruktionen",
    "400": "Bauwerk – Technische Anlagen", "410": "Abwasser-, Wasser-, Gasanlagen", "420": "Wärmeversorgungsanlagen", "430": "Raumlufttechnische Anlagen",
    "440": "Elektrische Anlagen", "450": "Kommunikations-, sicherheits- und informationstechnische Anlagen", "460": "Förderanlagen",
    "470": "Nutzungsspezifische und verfahrenstechnische Anlagen", "480": "Gebäude- und Anlagenautomation", "490": "Sonstige Maßnahmen für technische Anlagen",
    "500": "Außenanlagen und Freiflächen", "600": "Ausstattung und Kunstwerke", "700": "Baunebenkosten", "800": "Finanzierung",
}


@app.before_request
def guard():
    p = request.path
    if p.startswith(("/static/", "/bp/")) or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base("baukosten") + "/")), 401
        return redirect(C.login_url(request.url))
    if not sso.has_app(u, "baukosten"):
        return C.gesperrt("baukosten", "Für die Kosten ist dein Konto nicht freigeschaltet.")
    g.user = u


@app.get("/")
def index():
    return C.page("baukosten.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    from bpcore import platform
    return jsonify(platform.config(g.user))


def _now():
    return datetime.now().isoformat(timespec="seconds")


def _num(v, d=0.0, lo=None, hi=None):
    try:
        x = float(str(v).replace(",", "."))
        if math.isnan(x) or math.isinf(x):
            raise ValueError
    except (TypeError, ValueError):
        return d
    if lo is not None:
        x = max(lo, x)
    if hi is not None:
        x = min(hi, x)
    return x


def _s(v, n):
    return str(v if v is not None else "").strip()[:n]


# ---------------------------------------------------------------- Daten einer Kostenermittlung
def default_data(c=None):
    return {"bauteile": [], "rooms": [], "modell_rev": 0, "preise": {}, "nk": 20.0, "nk_fest": None, "risiko": 10.0, "mwst": 19.0, "rate": 3.0,
            "shares": {}, "notes": "", "kostenstand": datetime.now().strftime("%Y-%m")}


def _zeile_sauber(b):
    a = b.get("aufbau")
    z = {"id": _s(b.get("id"), 200), "bereich": _s(b.get("bereich"), 12), "kg": re.sub(r"\D", "", str(b.get("kg") or ""))[:3], "name": _s(b.get("name"), 200),
         "mat": _s(b.get("mat"), 300), "menge": round(_num(b.get("menge"), 0, 0, 1e8), 3), "einheit": _s(b.get("einheit"), 10) or "m²",
         "ep": round(_num(b.get("ep"), 0, 0, 1e8), 2), "ep_von": round(_num(b.get("ep_von"), 0, 0, 1e8), 2), "ep_bis": round(_num(b.get("ep_bis"), 0, 0, 1e8), 2),
         "hand": bool(b.get("hand")), "code": _s(b.get("code"), 20), "status": _s(b.get("status"), 16), "quelle": _s(b.get("quelle"), 12),
         "src": "modell", "formel": _s(b.get("formel"), 200), "notiz": _s(b.get("notiz"), 300)}
    if isinstance(a, dict) and re.fullmatch(r"\d{3}\.\d{2}", str(a.get("v") or "")):
        z["aufbau"] = {"v": a["v"], "w": [int(x) for x in (a.get("w") or [])[:12] if isinstance(x, (int, float))]}
    return z


def clean_data(d, c=None):
    d = d if isinstance(d, dict) else {}
    o = default_data()
    o["bauteile"] = [_zeile_sauber(b) for b in (d.get("bauteile") if isinstance(d.get("bauteile"), list) else [])[:1500] if isinstance(b, dict) and (b.get("id") or b.get("name"))]
    o["rooms"] = [{"nr": _s(r.get("nr"), 20), "name": _s(r.get("name"), 200), "area": round(_num(r.get("area"), 0, 0, 1e6), 2)}
                  for r in (d.get("rooms") if isinstance(d.get("rooms"), list) else [])[:2000] if isinstance(r, dict)]
    o["modell_rev"] = int(_num(d.get("modell_rev"), 0, 0, 1e9))
    o["preise"] = {_s(k, 200): round(_num(v, 0, 0, 1e8), 2) for k, v in list((d.get("preise") if isinstance(d.get("preise"), dict) else {}).items())[:1500] if v not in (None, "")}
    o["nk"] = round(_num(d.get("nk"), 20, 0, 60), 2)
    o["nk_fest"] = None if d.get("nk_fest") in (None, "") else round(_num(d.get("nk_fest"), 0, 0, 1e10), 2)
    o["risiko"] = round(_num(d.get("risiko"), 10, 0, 50), 2)
    o["mwst"] = round(_num(d.get("mwst"), 19, 0, 30), 2)
    o["rate"] = round(_num(d.get("rate"), 3, 0, 20), 2)
    o["shares"] = {str(k): _num(v, 0, 0, 1e6) for k, v in list((d.get("shares") if isinstance(d.get("shares"), dict) else {}).items())[:5000] if re.fullmatch(r"\d{1,9}", str(k))}
    o["notes"] = _s(d.get("notes"), 8000)
    if re.fullmatch(r"20\d\d-(0[1-9]|1[0-2])", str(d.get("kostenstand") or "")):
        o["kostenstand"] = d["kostenstand"]
    return o


# ---------------------------------------------------------------- Bauteile aus dem Projektmodell
def aus_modell(c, pid):
    """Stand der Bauteile aus der Checkliste des Projektmodells: (Zeilen, Räume, rev, offene Zeilen mit möglichem Betrag)."""
    if not pid:
        return [], [], 0, []
    M = modell.lesen(c, pid)
    L = M["modell"].get("bauteilliste") or bauteilliste.leer()
    Z, offen = [], []
    for z in L["zeilen"]:
        if z["status"] == "offen" or (z["bereich"] == "frage" and z["status"] == "offen"):
            vid = bauteilliste.vorschlag(z, "instandsetzen" if z["bereich"] == "rohbau" else "erneuern")
            A = baudaten.aufbau(c, vid, bauteilliste.aufbau_setzen(c, dict(z), vid)["wahl"]) if vid else None
            offen.append({"id": z["id"], "name": z["name"], "moeglich": round((A["ep_mittel"] if A else 0) * z["menge"], 2), "vorlage": A["name"] if A else ""})
            continue
        if not z["berechnen"]:
            continue
        A = baudaten.aufbau(c, z["vorlage"], z["wahl"]) if z["vorlage"] else None
        Z.append(_zeile_sauber({"id": z["id"], "bereich": z["bereich"], "kg": (A or {}).get("kg") or z["kg"], "name": z["name"], "mat": z["kurz"],
                                "menge": z["menge"], "einheit": (A or {}).get("einheit") or z["einheit"], "ep": (A or {}).get("ep_mittel") or 0,
                                "ep_von": (A or {}).get("ep_von") or 0, "ep_bis": (A or {}).get("ep_bis") or 0, "code": z["code"], "status": z["status"],
                                "quelle": z["quelle"], "formel": f"Projektmodell: {z['anzahl']} Objekte" if z["anzahl"] else "Projektmodell",
                                "aufbau": {"v": z["vorlage"], "w": z["wahl"]} if z["vorlage"] else None}))
    R = [{"nr": r["nr"], "name": r["name"], "area": r["flaeche"]} for r in L.get("raeume") or []] or \
        [{"nr": r.get("nr", ""), "name": r.get("name", ""), "area": r.get("flaeche", 0)} for r in M["modell"].get("raeume") or []]
    return Z, R, M["rev"], offen


# ---------------------------------------------------------------- Rechnen
def _betrag(b, preise=None):
    ep = (preise or {}).get(b["id"], b["ep"])
    return round((b.get("menge") or 0) * (ep or 0), 2), ep


def calc(d, offen=(), stufe="berechnung"):
    """Kosten aus den Bauteilen (netto). Rückgabe wie bisher für Honorar, Ausschreibung, Bauantrag, Startseite (kg300, kg400, bauwerk,
    extra, nk, risiko, total, area, kg2) und neu: zeilen (mit Betrag) und genau (Band)."""
    P = d.get("preise") or {}
    zeilen, kg2, k3, k4, extra = [], {}, 0.0, 0.0, 0.0
    for b in d.get("bauteile") or []:
        betrag, ep = _betrag(b, P)
        zeilen.append(dict(b, ep=ep, hand=b["id"] in P, betrag=betrag))
        k = b["kg"]
        if len(k) == 3 and k[0] in "34":
            x = kg2.setdefault(k[:2] + "0", {"wert": 0.0, "quelle": "bauteile", "n": 0})
            x["wert"] += betrag; x["n"] += 1
            if k[0] == "3":
                k3 += betrag
            else:
                k4 += betrag
        else:
            extra += betrag
    for x in kg2.values():
        x["wert"] = round(x["wert"], 2)
    bau = k3 + k4
    risk = (bau + extra) * d.get("risiko", 0) / 100
    nk = d["nk_fest"] if d.get("nk_fest") is not None else (bau + extra + risk) * d.get("nk", 0) / 100
    total = bau + extra + risk + nk
    area = sum(r["area"] for r in d.get("rooms") or [])
    return {"zeilen": zeilen, "kg2": dict(sorted(kg2.items())), "kg300": round(k3, 2), "kg400": round(k4, 2), "bauwerk": round(bau, 2), "extra": round(extra, 2),
            "risiko": round(risk, 2), "nk": round(nk, 2), "total": round(total, 2), "mwst": round(total * d.get("mwst", 19) / 100, 2),
            "brutto": round(total * (1 + d.get("mwst", 19) / 100), 2), "area": round(area, 2), "kw": round(bau / area, 2) if area else 0,
            "types": [], "genau": genau(zeilen, offen, stufe, bau + extra)}


def genau(zeilen, offen, stufe, summe):
    """Band um die Summe der Bauteile (90 %): Preise je Zeile unabhängig (Spanne von–bis ≈ 90 %-Band), dazu der gemeinsame Marktanteil,
    Mengen je Herkunft; offene Zeilen gehen mit ihrem möglichen Betrag nur nach oben. Was das Band am meisten verkleinert, steht in „besser“."""
    if summe <= 0 and not offen:
        return None
    var_p = var_m = 0.0
    beitrag = []
    for z in zeilen:
        a = z["betrag"]
        if a <= 0:
            continue
        ep = z["ep"] or 1
        sp = ((z.get("ep_bis") or 0) - (z.get("ep_von") or 0)) / 3.29 / ep if z.get("ep_bis") and z.get("ep_von") and not z.get("hand") else (0.05 if z.get("hand") else 0.15)
        sm = MENGE.get(z.get("quelle") or "", 0.10)
        vp, vm = (a * sp) ** 2, (a * sm) ** 2
        var_p += vp; var_m += vm
        beitrag.append((vp + vm, z["name"]))
    var_markt = (summe * MARKT) ** 2
    s = math.sqrt(var_p + var_m + var_markt)
    oben_offen = sum(o["moeglich"] for o in offen)
    unten, oben = summe - 1.645 * s, summe + 1.645 * s + oben_offen
    pz = lambda v: round(100 * v / summe, 1) if summe else None   # noqa: E731
    z_lo, z_hi = ZIEL.get(stufe, (20, 25))
    weit = max(pz(summe - unten) or 0, pz(oben - summe) or 0)
    ampel = "gruen" if weit <= z_lo else "gelb" if weit <= z_hi else "rot"
    besser = [f"„{o['name']}“ beantworten (bis {round(o['moeglich']):,} €)".replace(",", ".") for o in sorted(offen, key=lambda o: -o["moeglich"]) if o["moeglich"]][:3]
    for v, n in sorted(beitrag, reverse=True)[:max(0, 3 - len(besser))]:
        besser.append(f"„{n}“ genauer fassen (Menge prüfen, Preis anfragen)")
    return {"unten": round(unten, 2), "oben": round(oben, 2), "minus": pz(summe - unten), "plus": pz(oben - summe), "ampel": ampel,
            "ziel": [z_lo, z_hi], "ziel_quelle": ZIEL_QUELLE, "teile": {"preise": pz(1.645 * math.sqrt(var_p)), "markt": pz(1.645 * math.sqrt(var_markt)),
                                                                         "mengen": pz(1.645 * math.sqrt(var_m)), "offen": pz(oben_offen)},
            "offen": len(offen), "besser": besser}


# ---------------------------------------------------------------- Kostenermittlungen
def _row(c, i):
    return c.execute("SELECT * FROM bk_projects WHERE id=?", (i,)).fetchone()


def _addr(p):
    return ", ".join(x for x in (p["street"], " ".join(y for y in (p["zip"], p["city"]) if y)) if x)


def _out(c, r, full=True):
    o = {"id": r["id"], "name": r["name"], "project_id": r["project_id"], "gantt_id": r["gantt_id"], "stufe": r["stufe"],
         "rev": r["rev"], "updated": r["updated"], "updated_by": r["updated_by"], "archived": bool(r["archived"])}
    if r["project_id"]:
        p = c.execute("SELECT name, client, street, zip, city FROM projects WHERE id=?", (r["project_id"],)).fetchone()
        o["project"] = {"name": p["name"], "client": p["client"], "address": _addr(p)} if p else None
    if r["gantt_id"]:
        p = c.execute("SELECT name FROM gantt_projects WHERE id=?", (r["gantt_id"],)).fetchone()
        o["gantt"] = {"name": p["name"]} if p else None
    d = clean_data(_j(r["data"], {}))
    if full:
        Z, R, rev, offen = aus_modell(c, r["project_id"])
        o["data"] = d
        o["calc"] = calc(d, offen, r["stufe"])
        o["modell"] = {"rev": rev, "neu": rev != d["modell_rev"] and bool(Z or d["bauteile"] or offen), "zeilen": len(Z), "offen": offen}
        o["stufen"] = [{"key": k, "name": STUFE_NAME[k]} for k in STUFEN]
        o["din"] = DIN
    else:
        o["total"] = calc(d)["total"]
    return o


@app.get("/api/bk")
def bk_list():
    with db.tx() as c:
        rows = c.execute("SELECT * FROM bk_projects ORDER BY archived, updated DESC, id DESC").fetchall()
        out = [_out(c, r, False) for r in rows]
        from bpcore import gueltig
        erst = {r["id"]: r["created"] for r in rows}
        for pid in {x["project_id"] for x in out if x["project_id"]}:
            V = [x for x in out if x["project_id"] == pid]
            gid = gueltig.waehlen([(x["id"], erst.get(x["id"]), x["archived"]) for x in V], gueltig.lesen(c, "bk", pid))
            for x in V:
                x["gueltig"] = x["id"] == gid
        return jsonify(out)


@app.put("/api/bk/<int:i>/gueltig")
def bk_gueltig(i):
    from bpcore import gueltig
    with db.tx() as c:
        r = c.execute("SELECT id, project_id FROM bk_projects WHERE id=?", (i,)).fetchone()
        if not r:
            return jsonify(error="Kostenermittlung nicht gefunden"), 404
        if not r["project_id"]:
            return jsonify(error="Die Kostenermittlung ist keinem Projekt zugeordnet."), 400
        gueltig.setzen(c, "bk", r["project_id"], i, g.user["name"])
        return jsonify(ok=True)


def _speichern(c, i, sets, args):
    versionen.vor(c, f"bkp:{i}")
    c.execute(f"UPDATE bk_projects SET {', '.join(sets)}, rev=rev+1, updated=?, updated_by=? WHERE id=?", (*args, _now(), g.user["name"], i))
    versionen.nach(c, f"bkp:{i}", g.user["name"])


@app.post("/api/bk")
def bk_new():
    b = request.get_json(silent=True) or {}
    name = _s(b.get("name"), 200)
    with db.tx() as c:
        pid = b.get("project_id") if isinstance(b.get("project_id"), int) else None
        if pid and not c.execute("SELECT 1 FROM projects WHERE id=?", (pid,)).fetchone():
            pid = None
        name = name or ("Startversion" if pid else "")
        if not name:
            return jsonify(error="Bitte einen Namen eingeben."), 400
        d = default_data()
        Z, R, rev, _ = aus_modell(c, pid)
        d.update(bauteile=Z, rooms=R, modell_rev=rev)
        now = _now()
        r = c.execute("INSERT INTO bk_projects(name, project_id, gantt_id, stufe, data, created, updated, updated_by) VALUES(?,?,?,?,?,?,?,?) RETURNING id",
                      (name, pid, None, b.get("stufe") if b.get("stufe") in STUFEN else "berechnung", json.dumps(d), now, now, g.user["name"])).fetchone()
        out = _out(c, _row(c, r["id"]))
    C.audit(g.user["name"], "baukosten", "Kostenermittlung angelegt", name)
    return jsonify(out)


@app.route("/api/bk/<int:i>", methods=["GET", "PUT", "DELETE"])
def bk_one(i):
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        if request.method == "GET":
            return jsonify(_out(c, r))
        if request.method == "DELETE":
            pr = c.execute("SELECT name FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
            pk = papierkorb.ablegen(c, "bk_projects", i, "Kostenermittlung", r["name"], g.user["name"], pr["name"] if pr else "", "baukosten")
            C.audit(g.user["name"], "baukosten", "Kostenermittlung in den Papierkorb", r["name"])
            return jsonify(ok=True, papierkorb=pk)
        b = request.get_json(silent=True) or {}
        c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", (f"bk:{i}",))
        r = _row(c, i)
        if isinstance(b.get("rev"), int) and b["rev"] != r["rev"] and not b.get("force"):
            return jsonify(error=f"Inzwischen von {r['updated_by'] or 'jemand anderem'} geändert.", conflict=True, by=r["updated_by"], rev=r["rev"]), 409
        sets, args = [], []
        if "name" in b and _s(b["name"], 200):
            sets.append("name=?"); args.append(_s(b["name"], 200))
        if "stufe" in b and b["stufe"] in STUFEN:
            sets.append("stufe=?"); args.append(b["stufe"])
        if "gantt_id" in b:
            gid = _s(b["gantt_id"], 80) or None
            if gid and not c.execute("SELECT 1 FROM gantt_projects WHERE id=?", (gid,)).fetchone():
                gid = None
            sets.append("gantt_id=?"); args.append(gid)
        if "archived" in b:
            sets.append("archived=?"); args.append(1 if b["archived"] else 0)
        if isinstance(b.get("data"), dict):   # nur Preise, Zuschläge, Notizen – die Bauteile kommen aus dem Projektmodell
            d = clean_data(_j(r["data"], {}))
            neu = clean_data({**d, **{k: v for k, v in b["data"].items() if k in ("preise", "nk", "nk_fest", "risiko", "mwst", "rate", "shares", "notes", "kostenstand")}})
            sets.append("data=?"); args.append(json.dumps(neu))
        if sets:
            _speichern(c, i, sets, args)
        return jsonify(_out(c, _row(c, i)))


@app.post("/api/bk/<int:i>/uebernehmen")
def bk_uebernehmen(i):
    """Stand der Bauteile aus dem Projektmodell übernehmen (Preise von Hand bleiben, solange es die Zeile gibt)."""
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        if not r["project_id"]:
            return jsonify(error="Die Kostenermittlung gehört zu keinem Projekt."), 400
        d = clean_data(_j(r["data"], {}))
        Z, R, rev, _ = aus_modell(c, r["project_id"])
        d.update(bauteile=Z, rooms=R, modell_rev=rev, preise={k: v for k, v in d["preise"].items() if any(z["id"] == k for z in Z)})
        _speichern(c, i, ["data=?"], [json.dumps(d)])
        out = _out(c, _row(c, i))
    C.audit(g.user["name"], "baukosten", "Bauteile aus dem Projektmodell übernommen", r["name"])
    return jsonify(out)


@app.post("/api/bk/<int:i>/kopie")
def bk_kopie(i):
    """Neue Version: Kopie dieser Kostenermittlung unter einem neuen Namen – die alte bleibt, wie sie ist."""
    name = _s((request.get_json(silent=True) or {}).get("name"), 200)
    if not name:
        return jsonify(error="Bitte einen Namen für die Version eingeben."), 400
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        now = _now()
        n = c.execute("INSERT INTO bk_projects(name, project_id, gantt_id, stufe, data, created, updated, updated_by) VALUES(?,?,?,?,?,?,?,?) RETURNING id",
                      (name, r["project_id"], r["gantt_id"], r["stufe"], r["data"], now, now, g.user["name"])).fetchone()["id"]
        out = _out(c, _row(c, n))
    C.audit(g.user["name"], "baukosten", "Neue Version angelegt", f"{name} (aus {r['name']})")
    return jsonify(out)


@app.get("/api/sources")
def sources():
    """Bauzeitenpläne zum Verknüpfen (Mittelabfluss)."""
    with db.tx() as c:
        gp = [{"id": r["id"], "name": r["name"], "project_id": r["project_id"], "updated": r["updated"]}
              for r in c.execute("SELECT id, name, project_id, updated FROM gantt_projects ORDER BY updated DESC")]
    return jsonify(plans=gp)


# ---------------------------------------------------------------- Mittelabfluss (Bauzeitenplan)
def _d(s):
    return date.fromisoformat(s)


def flow(c, r, d, cal):
    """Kosten (Bauteile + Unvorhergesehenes) über die Leistungen des Bauzeitenplans verteilen.
    Gewicht je Leistung: eigener Anteil (shares) oder ihre Dauer in Kalendertagen; je Monat anteilig nach Tagen."""
    gid = r["gantt_id"]
    if not gid and r["project_id"]:
        x = c.execute("SELECT id FROM gantt_projects WHERE project_id=? ORDER BY updated DESC LIMIT 1", (r["project_id"],)).fetchone()
        gid = x["id"] if x else None
    if not gid:
        return {"ok": False, "why": "Für das Projekt gibt es keinen Bauzeitenplan."}
    gp = c.execute("SELECT name, data FROM gantt_projects WHERE id=?", (gid,)).fetchone()
    if not gp:
        return {"ok": False, "why": "Der verknüpfte Bauzeitenplan wurde gelöscht."}
    pd = _j(gp["data"], {})
    sched = {x["uid"]: x for x in (pd.get("sched") or []) if isinstance(x, dict)}
    if not sched:
        return {"ok": False, "why": f"Für „{gp['name']}“ liegen noch keine berechneten Termine vor. Den Plan einmal im Bauzeitenplan öffnen und speichern."}
    tasks = []
    for t in pd.get("tasks") or []:
        s = sched.get(t.get("uid"))
        if not s or s.get("g") or not (t.get("dur") or 0) > 0:
            continue
        try:
            a, b = _d(s["s"]), _d(s["f"])
        except ValueError:
            continue
        days = (b - a).days + 1
        w = d["shares"].get(str(t["uid"]))
        tasks.append({"uid": t["uid"], "name": t.get("name") or "", "gw": t.get("gw") or "", "s": s["s"], "f": s["f"], "days": days,
                      "w": w if w is not None else float(days), "own": w is not None})
    if not tasks:
        return {"ok": False, "why": "Der Bauzeitenplan hat noch keine Leistungen mit Dauer."}
    base = cal["bauwerk"] + cal["extra"] + cal["risiko"]
    tw = sum(t["w"] for t in tasks) or 1
    months = {}
    for t in tasks:
        amt = base * t["w"] / tw
        t["amount"] = round(amt, 2); t["pct"] = round(t["w"] / tw * 100, 2)
        a, b = _d(t["s"]), _d(t["f"])
        per, x = amt / t["days"], a
        while x <= b:
            nxt = (x.replace(day=1) + timedelta(days=32)).replace(day=1)
            end = min(b, nxt - timedelta(days=1))
            months[x.strftime("%Y-%m")] = months.get(x.strftime("%Y-%m"), 0.0) + per * ((end - x).days + 1)
            x = end + timedelta(days=1)
    rate, out, cum, cum_i = d["rate"] / 100, [], 0.0, 0.0
    for ym in sorted(months):
        v = months[ym]
        y, m = map(int, ym.split("-"))
        vi = v * (1 + rate) ** max(0.0, (date(y, m, 15) - date.today()).days / 365.25)
        cum += v; cum_i += vi
        out.append({"ym": ym, "amount": round(v, 2), "idx": round(vi, 2), "cum": round(cum, 2), "cum_idx": round(cum_i, 2)})
    return {"ok": True, "plan": gp["name"], "start": min(t["s"] for t in tasks), "end": max(t["f"] for t in tasks), "base": round(base, 2),
            "months": out, "total_idx": round(cum_i, 2), "tasks": sorted(tasks, key=lambda t: t["s"])}


@app.get("/api/bk/<int:i>/flow")
def flow_api(i):
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        d = clean_data(_j(r["data"], {}))
        return jsonify(flow(c, r, d, calc(d)))


C.wait_schema()
