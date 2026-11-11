"""Bauantrag – Antragspaket (bpcore/bauantrag_paket.py): Vordrucke wählen, eigene Unterlagen, Platzieren, Paket-PDF.

PUT  /api/antraege/<aid>/paket          {key, an} | {reihe: [keys]} | {key, nutzung: ausfuellen|beilegen}
POST /api/antraege/<aid>/unterlagen     Dateien (PDF, JPG, PNG, HEIC, TIFF – Fotos werden zu PDF-Seiten)
DELETE /api/unterlagen/<uid>            in den Papierkorb
GET  /api/antraege/<aid>/stueck/<key>.pdf   ein Stück ausgefüllt · GET /api/antraege/<aid>/paket.pdf  alles mit Inhaltsverzeichnis
GET  /api/antraege/<aid>/platzierung/<key>  Seiten und gemerkte Platzierung · GET …/seite/<n>.png · PUT …  speichern (je Datei-Inhalt)
"""
import json
import re
import time
import urllib.parse

from flask import Response, g, jsonify, request

from bpcore import bauantrag_paket as BP, db, papierkorb
import common as C
from bpcore import bauantrag_formulare as BF
from bauantrag import KEY, _antrag, _detail, _felder_setzen, _j, app

ERLAUBT = re.compile(r"\.(pdf|jpe?g|png|heic|heif|tiff?)$", re.I)


def _w(c, a):
    """Werte des Antrags für die Vordrucke (+ _bv: vorliegende Bauvorlagen, für die Kästchen „Unterlage …“)."""
    d = _detail(c, a)
    W = {x["key"]: str(x["wert"] or "") for x in d["felder"]}
    W["_bv"] = [b["key"] for b in d["bauvorlagen"] if b.get("status") in ("da", "beigefuegt")]
    return W, d


def _gesperrt(a):
    return a["status"] == "eingereicht"


@app.put("/api/antraege/<int:aid>/paket")
def paket_setzen(aid):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        if _gesperrt(a):
            return jsonify(error="Der Antrag ist eingereicht – zum Ändern erst wieder auf „Entwurf“ stellen."), 409
        daten = _j(a["daten"], {})
        P = daten.get("_paket") or {}
        an, aus = set(P.get("an") or []), set(P.get("aus") or [])
        k = str(b.get("key") or "")
        if k and "an" in b:
            (an.add if b["an"] else an.discard)(k)
            (aus.discard if b["an"] else aus.add)(k)
        if isinstance(b.get("reihe"), list):
            P["reihe"] = [str(x)[:12] for x in b["reihe"]][:200]
        if k.startswith("u") and b.get("nutzung") in ("ausfuellen", "beilegen"):
            c.execute("UPDATE bauantrag_unterlage SET art=? WHERE id=? AND antrag_id=?", (b["nutzung"], int(k[1:]), aid))
        P["an"], P["aus"] = sorted(an), sorted(aus)
        daten["_paket"] = P
        c.execute("UPDATE bauantrag SET daten=?, geaendert=? WHERE id=?", (json.dumps(daten), time.strftime("%Y-%m-%d %H:%M:%S"), aid))
        d = _detail(c, _antrag(c, aid))
    return jsonify(d)


@app.post("/api/antraege/<int:aid>/unterlagen")
def unterlagen_neu(aid):
    dateien = request.files.getlist("datei")
    if not dateien:
        return jsonify(error="Keine Datei."), 400
    neu, fehler = [], []
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        if _gesperrt(a):
            return jsonify(error="Der Antrag ist eingereicht – zum Ändern erst wieder auf „Entwurf“ stellen."), 409
    for f in dateien[:20]:
        name = (f.filename or "Unterlage").rsplit("/", 1)[-1][:150]
        roh = f.read(40 * 1024 * 1024 + 1)
        if len(roh) > 40 * 1024 * 1024 or not ERLAUBT.search(name):
            fehler.append(f"{name}: nur PDF oder Bild bis 40 MB"); continue
        try:
            pdf = roh if roh.startswith(b"%PDF") else BP.bild_zu_pdf(roh)
        except Exception:   # noqa: BLE001 – Bild nicht lesbar
            fehler.append(f"{name}: nicht lesbar"); continue
        if not name.lower().endswith(".pdf"):
            name = name.rsplit(".", 1)[0] + ".pdf"
        sha = BP.sha(pdf)
        art = "ausfuellen" if BP.feldzahl(pdf, sha) else "beilegen"
        with db.tx() as c:
            neu.append(c.execute("INSERT INTO bauantrag_unterlage(antrag_id, name, daten, sha256, art, von) VALUES(?,?,?,?,?,?) RETURNING id",
                                 (aid, name, pdf, sha, art, g.user["name"])).fetchone()["id"])
    with db.tx() as c:
        d = _detail(c, _antrag(c, aid))
    if neu:
        C.audit(g.user["name"], KEY, "Bauantrag: Unterlagen hinzugefügt", f"{len(neu)} Datei(en)")
    return jsonify({**d, "neu": neu, "fehler": fehler})


@app.delete("/api/unterlagen/<int:uid>")
def unterlage_weg(uid):
    with db.tx() as c:
        r = c.execute("SELECT antrag_id, name FROM bauantrag_unterlage WHERE id=?", (uid,)).fetchone()
        a = _antrag(c, r["antrag_id"]) if r else None
        if not a:
            return jsonify(error="Nicht gefunden."), 404
        p = c.execute("SELECT name FROM projects WHERE id=?", (a["project_id"],)).fetchone()
        pk = papierkorb.ablegen(c, "bauantrag_unterlage", uid, "Bauantrag-Unterlage", r["name"], g.user["name"], p["name"] if p else "", KEY)
        d = _detail(c, _antrag(c, a["id"]))
    return jsonify({**d, "papierkorb": pk})


def _quelle(c, a, key):
    """Datei eines Stücks (roh, ohne Ausfüllen) → (bytes, sha) oder (None, None)."""
    if not re.fullmatch(r"[fu]\d{1,9}", key or ""):
        return None, None
    if key[0] == "f":
        r = c.execute("SELECT daten, sha256 FROM bauantrag_formular WHERE id=?", (int(key[1:]),)).fetchone()
    else:
        r = c.execute("SELECT daten, sha256 FROM bauantrag_unterlage WHERE id=? AND antrag_id=?", (int(key[1:]), a["id"])).fetchone()
    if not r or r["daten"] is None:
        return None, None
    return bytes(r["daten"]), r["sha256"] or BP.sha(r["daten"])


def _pdf_antwort(data, name, dl=False):
    return Response(data, mimetype="application/pdf", headers={"Content-Disposition": f"{'attachment' if dl else 'inline'}; filename*=UTF-8''{urllib.parse.quote(name)}",
                                                                "Cache-Control": "no-store"})


@app.get("/api/antraege/<int:aid>/stueck/<key>.pdf")
def stueck(aid, key):
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a or not re.fullmatch(r"[fu]\d{1,9}", key):
            return jsonify(error="Nicht gefunden."), 404
        if key[0] == "u" and not c.execute("SELECT 1 FROM bauantrag_unterlage WHERE id=? AND antrag_id=?", (int(key[1:]), aid)).fetchone():
            return jsonify(error="Nicht gefunden."), 404
        W, _ = _w(c, a)
        x = BP.stueck_pdf(c, key, W, _j(a["daten"], {}).get("_pdf"))
    if not x:
        return jsonify(error="Nicht gefunden."), 404
    return _pdf_antwort(x[0], re.sub(r'[\\/:*?"<>|]+', "_", x[1])[:140] + ".pdf", request.args.get("dl"))


@app.get("/api/antraege/<int:aid>/paket.pdf")
def paket(aid):
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        W, d = _w(c, a)
        L, gew, _ = BP.stuecke(c, a, W)
        if not gew:
            return jsonify(error="Noch kein Vordruck und keine Unterlage gewählt – in Schritt 1 anhaken."), 409
        teile = []
        for k in gew:
            x = BP.stueck_pdf(c, k, W, _j(a["daten"], {}).get("_pdf"))
            if x:
                teile.append((x[1], x[0]))
    adr = W.get("gs_strasse", "") + (", " + W.get("gs_ort", "") if W.get("gs_ort") else "")
    kopf = [x for x in (W.get("bezeichnung") or d["projekt"], adr, f"Bauherr: {W.get('bauherr_name')}" if W.get("bauherr_name") else "",
                        f"Entwurfsverfasser: {W.get('ev_name')}" if W.get("ev_name") else "", time.strftime("Stand %d.%m.%Y")) if x]
    data = BP.paket_pdf(teile, kopf, entwurf=a["status"] == "entwurf")
    k = (re.match(r"^[A-Za-z]{1,4}\d{2,6}", (d["projekt"] or "").strip()) or [""])[0]
    return _pdf_antwort(data, f"{k + ' ' if k else ''}{a['name']} – Antragsunterlagen.pdf"[:150], request.args.get("dl"))


@app.get("/api/antraege/<int:aid>/platzierung/<key>")
def platz_holen(aid, key):
    from pypdf import PdfReader
    import io
    with db.tx() as c:
        a = _antrag(c, aid)
        daten, sha = _quelle(c, a, key) if a else (None, None)
        if not daten:
            return jsonify(error="Nicht gefunden."), 404
        r = c.execute("SELECT felder FROM bauantrag_platzierung WHERE sha256=?", (sha,)).fetchone()
        W, d = _w(c, a)
    seiten = []
    for pg in PdfReader(io.BytesIO(daten)).pages[:40]:
        w, h = float(pg.mediabox.width), float(pg.mediabox.height)
        if int(pg.get("/Rotate") or 0) % 180:
            w, h = h, w
        seiten.append(round(w / h, 4))
    pal = [{"feld": x["key"], "label": x["label"], "wert": str(x["wert"] or "")} for x in d["felder"] if x["key"] not in ("ev_wahl",)]
    pal += [{"feld": "datum", "label": "Datum", "wert": time.strftime("%d.%m.%Y")}, {"feld": "kreuz", "label": "Kreuz ✗", "wert": "✗"},
            {"feld": "frei", "label": "Freier Text", "wert": ""}]
    return jsonify(seiten=seiten, felder=json.loads(r["felder"]) if r else [], palette=pal, formularfelder=BP.feldzahl(daten, sha))


@app.get("/api/antraege/<int:aid>/platzierung/<key>/seite/<int:n>.png")
def platz_seite(aid, key, n):
    with db.tx() as c:
        a = _antrag(c, aid)
        daten, _ = _quelle(c, a, key) if a else (None, None)
    if not daten:
        return jsonify(error="Nicht gefunden."), 404
    png, _, _ = BP.seite_png(daten, n, 1100)
    return Response(png, mimetype="image/png", headers={"Cache-Control": "private, max-age=3600"})


@app.put("/api/antraege/<int:aid>/platzierung/<key>")
def platz_setzen(aid, key):
    b = request.get_json(silent=True) or {}
    F = []
    for p in (b.get("felder") or [])[:300]:
        try:
            F.append({"feld": str(p["feld"])[:40], "seite": int(p.get("seite") or 0), "x": round(min(1, max(0, float(p["x"]))), 4),
                      "y": round(min(1, max(0, float(p["y"]))), 4), "w": round(min(1, max(0.01, float(p["w"]))), 4), "h": round(min(1, max(0.005, float(p["h"]))), 4),
                      "groesse": round(min(24, max(5, float(p.get("groesse") or 9))), 1), **({"text": str(p.get("text") or "")[:300]} if p.get("feld") == "frei" else {})})
        except (KeyError, TypeError, ValueError):
            continue
    with db.tx() as c:
        a = _antrag(c, aid)
        daten, sha = _quelle(c, a, key) if a else (None, None)
        if not daten:
            return jsonify(error="Nicht gefunden."), 404
        c.execute("INSERT INTO bauantrag_platzierung(sha256, felder, geaendert, von) VALUES(?,?,?,?) ON CONFLICT (sha256) DO UPDATE SET felder=EXCLUDED.felder, "
                  "geaendert=EXCLUDED.geaendert, von=EXCLUDED.von", (sha, json.dumps(F, ensure_ascii=False), time.strftime("%Y-%m-%d %H:%M:%S"), g.user["name"]))
        d = _detail(c, a)
    return jsonify({**d, "gespeichert": len(F)})


# ---------------------------------------------------------------- im PDF ausfüllen: Felder liegen über der Seite, Änderung → Antrag → alle Vordrucke
@app.get("/api/antraege/<int:aid>/stueck/<key>/felder")
def stueck_felder(aid, key):
    """Eingabefelder für „Im PDF ausfüllen“: Formularfelder (mit Zuordnung zum Antrag) und platzierte Werte, je Seite mit Lage."""
    with db.tx() as c:
        a = _antrag(c, aid)
        daten, sha = _quelle(c, a, key) if a else (None, None)
        if not daten:
            return jsonify(error="Nicht gefunden."), 404
        W, d = _w(c, a)
        r = c.execute("SELECT felder FROM bauantrag_platzierung WHERE sha256=?", (sha,)).fetchone()
        eigen = ((_j(a["daten"], {}).get("_pdf") or {}).get(sha) or {})
    from pypdf import PdfReader
    import io
    seiten = []
    for pg in PdfReader(io.BytesIO(daten)).pages[:40]:
        w, h = float(pg.mediabox.width), float(pg.mediabox.height)
        if int(pg.get("/Rotate") or 0) % 180:
            w, h = h, w
        seiten.append(round(w / h, 4))
    F = BF.felder(daten)
    V = BF.werte_v(W)
    Z = BF.zuordnung(F, V, alle=True)
    K = BF.kreuze_von(F, W)
    labels = {x["key"]: x["label"] for x in d["felder"]}
    out = []
    for x in BF.widgets(daten):
        k = Z.get(x["name"])
        if x["typ"] == "kreuz":
            st = eigen[x["name"]] if x["name"] in eigen else K.get(x["name"])
            wert = (st == x["an"]) if isinstance(st, str) else bool(st)
        else:
            wert = str(V.get(k) or "") if k else str(eigen.get(x["name"], ""))
        out.append({**x, "key": k or "", "wert": wert, "eigen": not k, "label": labels.get((BF.zurueck(k, "x", W) or {None: 0}).popitem()[0], "") if k else ""})
    for i, p in enumerate(json.loads(r["felder"]) if r else []):
        if p.get("feld") in ("datum", "kreuz", "frei"):
            continue
        out.append({"name": f"platz:{i}", "typ": "text", "seite": p["seite"], "x": p["x"], "y": p["y"], "w": p["w"], "h": p["h"], "key": "", "feld": p["feld"],
                    "wert": BP.wert(p["feld"], W), "eigen": False, "label": labels.get(p["feld"], p["feld"]), "platz": True})
    return jsonify(seiten=seiten, felder=out)


@app.put("/api/antraege/<int:aid>/stueck/<key>/feld")
def stueck_feld(aid, key):
    """Ein Wert im PDF geändert: gehört er zu einem Antragsfeld, wird er dort (und in dessen Quelle) gespeichert – und steht damit in der
    Maske und in allen Vordrucken. Sonst bleibt er bei diesem Vordruck (daten._pdf[Datei][Feldname])."""
    b = request.get_json(silent=True) or {}
    name, wert = str(b.get("name") or "")[:300], b.get("wert")
    with db.tx() as c:
        a = _antrag(c, aid)
        daten_pdf, sha = _quelle(c, a, key) if a else (None, None)
        if not daten_pdf:
            return jsonify(error="Nicht gefunden."), 404
        if _gesperrt(a):
            return jsonify(error="Der Antrag ist eingereicht – zum Ändern erst wieder auf „Entwurf“ stellen."), 409
        W, _ = _w(c, a)
        daten = _j(a["daten"], {})
        if b.get("feld"):   # platzierter Wert: direkt das Antragsfeld
            daten = _felder_setzen(c, a, daten, {str(b["feld"]): str(wert or "")})
        else:
            FF = BF.felder(daten_pdf)
            f = next((x for x in FF if x["name"] == name), None)
            k = BF.zuordnung(FF, BF.werte_v(W), alle=True).get(name)
            zur = BF.kreuz_zurueck(f, wert) if f and f["typ"] == "kreuz" and isinstance(wert, str) else {}
            if zur:   # Gebäudeklasse, Antragsart: gehört zum Antrag
                daten = _felder_setzen(c, a, daten, zur)
                (daten.get("_pdf") or {}).get(sha, {}).pop(name, None)
            elif k:
                daten = _felder_setzen(c, a, daten, BF.zurueck(k, wert, W))
            else:
                P = daten.setdefault("_pdf", {}).setdefault(sha, {})
                if wert in (None, "", False):
                    P.pop(name, None)
                else:
                    P[name] = wert if isinstance(wert, bool) else str(wert)[:2000]
        c.execute("UPDATE bauantrag SET daten=?, geaendert=? WHERE id=?", (json.dumps(daten), time.strftime("%Y-%m-%d %H:%M:%S"), aid))
        d = _detail(c, _antrag(c, aid))
    return jsonify(d)
