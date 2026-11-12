"""Wärmeschutz: Bauteilnachweise je Projekt – Ablauf Grundlagen → Bauteile → Prüfung → Nachweis → Eingereicht (wie Honorar/Bauantrag).
Gerechnet wird im Browser (static/ws-physik.js: U-Wert DIN EN ISO 6946, Glaser DIN 4108-3, ISO 13786); hier liegen nur die Daten:
der Nachweis mit seinen Bauteilen (JSON) und der Bauteilkatalog des Büros. Die Grundlagen kommen aus dem Bauantrag des Projekts
(Art des Vorhabens, Gebäudeklasse, Nutzung, Datum der Einreichung – das entscheidet über die geltende Fassung, § 111 Abs. 2 GModG)."""
import json
import time
import uuid

from flask import g, jsonify, redirect, request

from bpcore import bauantrag as BA, db, papierkorb, platform, sso
import common as C

app = C.make_app(__name__)
KEY = "waermeschutz"
STUFEN = ("grundlagen", "bauteile", "pruefung", "nachweis", "eingereicht")
TYPEN = ("wand", "steildach", "flachdach", "ogd", "kellerdecke", "bodenplatte", "erdwand", "decke_aussen", "innenwand", "fenster", "tuer")
G_FELDER = ("vorhaben", "nutzung", "gebaeudeklasse", "baujahr", "antrag_datum", "zone", "flaeche_aw", "notiz", "eingereicht", "pruef_notiz")


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
        return C.gesperrt(KEY, "Für „Wärmeschutz“ ist dein Konto nicht freigeschaltet.")
    g.user = u


@app.get("/")
def index():
    return C.page("waermeschutz.html")


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
    r = c.execute("SELECT id, name, leaders FROM projects WHERE id=?", (pid,)).fetchone()
    if not r:
        return None
    lead = _j(r["leaders"], []) or []
    return r if g.user["is_admin"] or not lead or g.user["id"] in lead else None


def _nachweis(c, nid):
    r = c.execute("SELECT * FROM ws_nachweis WHERE id=?", (nid,)).fetchone()
    return dict(r) if r and _sees(c, r["project_id"]) else None


def _txt(v, n=200):
    return str(v if v is not None else "").strip()[:n]


def _zahl(v, lo=0.0, hi=1e6):
    try:
        x = float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return None
    return x if lo <= x <= hi else None


def _schichten(L):
    """Schichten säubern: m = Baustoff-Schlüssel (oder 'eigen'), d in cm, optional λ/μ/sd von Hand, Gefach m2 mit Breite/Abstand in cm."""
    out = []
    for s in (L if isinstance(L, list) else [])[:40]:
        if not isinstance(s, dict):
            continue
        x = {"m": _txt(s.get("m"), 60), "d": _zahl(s.get("d"), 0, 500) or 0}
        for k, lo, hi in (("lam", 0.001, 500), ("mu", 0, 1e7), ("sd", 0, 1e5), ("breite", 0, 500), ("abstand", 0, 1000)):
            v = _zahl(s.get(k), lo, hi)
            if v is not None:
                x[k] = v
        for k in ("m2", "name"):
            if s.get(k):
                x[k] = _txt(s[k], 80)
        out.append(x)
    return out


def _bauteil(b, alt=None):
    x = dict(alt or {})
    x["id"] = _txt(b.get("id") or x.get("id") or uuid.uuid4().hex[:10], 20)
    for k, n in (("kurz", 12), ("name", 120), ("massnahme", 10), ("notiz", 2000)):
        if k in b:
            x[k] = _txt(b[k], n)
    if b.get("typ") in TYPEN:
        x["typ"] = b["typ"]
    if b.get("zone") in ("19", "12"):
        x["zone"] = b["zone"]
    if "flaeche" in b:
        x["flaeche"] = _zahl(b["flaeche"], 0, 1e6)
    if "uw" in b:   # Fenster/Türen: U-Wert aus dem Datenblatt
        x["uw"] = _zahl(b["uw"], 0, 10)
    if "schichten" in b:
        x["schichten"] = _schichten(b["schichten"])
    x.setdefault("typ", "wand")
    x.setdefault("schichten", [])
    return x


def _ba_grundlagen(c, pid):
    """Werte aus dem Bauantrag des Projekts (Hauptantrag, sonst der zuletzt geänderte)."""
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"bauantrag:haupt:{pid}",)).fetchone()
    hid = int((_j(r["data"], {}) or {}).get("id") or 0) if r else 0
    a = c.execute("SELECT * FROM bauantrag WHERE id=? AND project_id=?", (hid, pid)).fetchone() if hid else None
    a = a or c.execute("SELECT * FROM bauantrag WHERE project_id=? ORDER BY geaendert DESC LIMIT 1", (pid,)).fetchone()
    if not a:
        return None
    daten = _j(a["daten"], {})
    try:
        W = {x["key"]: str(x.get("wert") or "") for x in BA.werte(c, pid, {"id": g.user["id"], "name": g.user["name"], "email": g.user["email"] or "",
                                                                          "is_admin": bool(g.user["is_admin"]), "vorname": "", "nachname": ""}, daten)}
    except Exception:   # noqa: BLE001 – der Nachweis geht auch ohne Bauantrag
        W = {k: str(v) for k, v in daten.items() if isinstance(v, (str, int, float))}
    return {"id": a["id"], "name": a["name"], "status": a["status"], "art": W.get("art", ""), "gebaeudeklasse": W.get("gebaeudeklasse", ""),
            "nutzung": W.get("nutzung", ""), "eingereicht": daten.get("_eingereicht") or "", "bezeichnung": W.get("bezeichnung", "")[:200]}


def _detail(c, n):
    d = _j(n["data"], {})
    p = c.execute("SELECT name FROM projects WHERE id=?", (n["project_id"],)).fetchone()
    return {"nachweis": {k: n[k] for k in ("id", "project_id", "name", "status", "erstellt", "geaendert", "von")},
            "projekt": p["name"] if p else "", "grundlagen": d.get("grundlagen") or {}, "bauteile": d.get("bauteile") or [],
            "bauantrag": _ba_grundlagen(c, n["project_id"])}


@app.get("/api/nachweise")
def liste():
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        R = c.execute("SELECT id, project_id, name, status, geaendert, data FROM ws_nachweis" + (" WHERE project_id=?" if pid else "") + " ORDER BY geaendert DESC",
                      (pid,) if pid else ()).fetchall()
        out = []
        for r in R:
            if not _sees(c, r["project_id"]):
                continue
            bt = (_j(r["data"], {}) or {}).get("bauteile") or []
            out.append({"id": r["id"], "project_id": r["project_id"], "name": r["name"], "status": r["status"], "geaendert": r["geaendert"], "bauteile": len(bt)})
    return jsonify(nachweise=out, stufen=STUFEN)


@app.post("/api/nachweise")
def neu():
    b = request.get_json(silent=True) or {}
    pid = b.get("project_id")
    with db.tx() as c:
        if not isinstance(pid, int) or not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden."), 404
        ba = _ba_grundlagen(c, pid) or {}
        gr = {"vorhaben": "neubau" if ba.get("art") == "Errichtung" else "aenderung", "zone": "19", "nutzung": ba.get("nutzung", ""),
              "gebaeudeklasse": ba.get("gebaeudeklasse", "")}
        data = {"grundlagen": gr, "bauteile": [_bauteil(x) for x in (b.get("bauteile") or [])[:60] if isinstance(x, dict)]}
        nid = c.execute("INSERT INTO ws_nachweis(project_id, name, data, von) VALUES (?,?,?,?) RETURNING id",
                        (pid, _txt(b.get("name")) or "Wärmeschutznachweis", json.dumps(data), g.user["name"])).fetchone()["id"]
        d = _detail(c, _nachweis(c, nid))
    C.audit(g.user["name"], KEY, "Nachweis angelegt", d["nachweis"]["name"])
    return jsonify(d)


@app.get("/api/nachweise/<int:nid>")
def detail(nid):
    with db.tx() as c:
        n = _nachweis(c, nid)
        if not n:
            return jsonify(error="Nachweis nicht gefunden."), 404
        return jsonify(_detail(c, n))


@app.put("/api/nachweise/<int:nid>")
def aendern(nid):
    """Name, Stufe, Grundlagen; ein Bauteil anlegen/ändern (bauteil: {...}), löschen (bauteil_weg: id), Reihenfolge (reihenfolge: [ids]).
    Antwort: der Nachweis und „vorher“ (ganzer alter Stand) für Rückgängig; zurück mit {stand: vorher}."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        n = _nachweis(c, nid)
        if not n:
            return jsonify(error="Nachweis nicht gefunden."), 404
        vorher = {"name": n["name"], "status": n["status"], "data": _j(n["data"], {})}
        if isinstance(b.get("stand"), dict):   # Rückgängig: alten Stand wiederherstellen
            s = b["stand"]
            name, status = _txt(s.get("name")) or n["name"], s.get("status") if s.get("status") in STUFEN else n["status"]
            sd = s.get("data") if isinstance(s.get("data"), dict) else {}
            data = {"grundlagen": {k: _txt(v, 2000) for k, v in (sd.get("grundlagen") or {}).items() if k in G_FELDER},
                    "bauteile": [_bauteil(x) for x in (sd.get("bauteile") or [])[:60] if isinstance(x, dict)]}
        else:
            data = _j(n["data"], {})
            data.setdefault("grundlagen", {})
            data.setdefault("bauteile", [])
            name = _txt(b["name"]) or n["name"] if "name" in b else n["name"]
            status = b["status"] if b.get("status") in STUFEN else n["status"]
            for k, v in (b.get("grundlagen") or {}).items():
                if k in G_FELDER:
                    data["grundlagen"][k] = _txt(v, 2000)
            if isinstance(b.get("bauteil"), dict):
                bt = b["bauteil"]
                i = next((i for i, x in enumerate(data["bauteile"]) if x.get("id") == bt.get("id")), None)
                if i is None:
                    if len(data["bauteile"]) >= 60:
                        return jsonify(error="Höchstens 60 Bauteile je Nachweis."), 400
                    data["bauteile"].append(_bauteil(bt))
                else:
                    data["bauteile"][i] = _bauteil(bt, data["bauteile"][i])
            if b.get("bauteil_weg"):
                data["bauteile"] = [x for x in data["bauteile"] if x.get("id") != b["bauteil_weg"]]
            if isinstance(b.get("reihenfolge"), list):
                pos = {str(k): i for i, k in enumerate(b["reihenfolge"])}
                data["bauteile"].sort(key=lambda x: pos.get(x.get("id"), 999))
        c.execute("UPDATE ws_nachweis SET name=?, status=?, data=?, geaendert=? WHERE id=?",
                  (name, status, json.dumps(data), time.strftime("%Y-%m-%d %H:%M:%S"), nid))
        d = _detail(c, _nachweis(c, nid))
    d["vorher"] = vorher
    return jsonify(d)


@app.delete("/api/nachweise/<int:nid>")
def loeschen(nid):
    with db.tx() as c:
        n = _nachweis(c, nid)
        if not n:
            return jsonify(error="Nachweis nicht gefunden."), 404
        p = c.execute("SELECT name FROM projects WHERE id=?", (n["project_id"],)).fetchone()
        pk = papierkorb.ablegen(c, "ws_nachweis", nid, "Wärmeschutznachweis", n["name"], g.user["name"], p["name"] if p else "", KEY)
    C.audit(g.user["name"], KEY, "Nachweis gelöscht", n["name"])
    return jsonify(ok=True, papierkorb=pk)


# ---------- Bauteilkatalog des Büros ----------
@app.get("/api/katalog")
def katalog():
    with db.tx() as c:
        R = c.execute("SELECT id, name, typ, schichten, von, erstellt FROM ws_katalog ORDER BY name").fetchall()
    return jsonify(katalog=[{**dict(r), "schichten": _j(r["schichten"], [])} for r in R])


@app.post("/api/katalog")
def katalog_neu():
    b = request.get_json(silent=True) or {}
    name = _txt(b.get("name"))
    if not name:
        return jsonify(error="Name fehlt."), 400
    typ = b.get("typ") if b.get("typ") in TYPEN else "wand"
    with db.tx() as c:
        kid = c.execute("INSERT INTO ws_katalog(name, typ, schichten, von) VALUES (?,?,?,?) RETURNING id",
                        (name, typ, json.dumps(_schichten(b.get("schichten"))), g.user["name"])).fetchone()["id"]
    return jsonify(ok=True, id=kid)


@app.delete("/api/katalog/<int:kid>")
def katalog_weg(kid):
    with db.tx() as c:
        r = c.execute("SELECT name FROM ws_katalog WHERE id=?", (kid,)).fetchone()
        if not r:
            return jsonify(error="Nicht gefunden."), 404
        pk = papierkorb.ablegen(c, "ws_katalog", kid, "Bauteil im Katalog", r["name"], g.user["name"], "", KEY)
    return jsonify(ok=True, papierkorb=pk)
