"""Bauantrag – Anlagen (bpcore/bauantrag_anlagen.py): Pläne aus der Planliste, Dateien aus dem Projektordner, freie Zeilen;
nennen oder als PDF beilegen; Stand und Abschnitt; Abgabe auf Papier (Packliste) oder digital (ZIP je Anlage).

GET    /api/antraege/<aid>/projektdateien   Planliste und sonstige PDFs des Projektordners (über das Bautagebuch)
POST   /api/antraege/<aid>/anlage           {neu: [{art: plan|datei|frei, text, pfad, nr, index, plan, abschnitt?, beilegen?}]}
PUT    /api/antraege/<aid>/anlage           {id, an | stand | abschnitt | beilegen | text | index + pfad}
DELETE /api/antraege/<aid>/anlage           {id}
PUT    /api/antraege/<aid>/abgabe           {abgabe: papier|digital} – Pläne werden genannt bzw. als PDF beigelegt
GET    /api/antraege/<aid>/paket.zip        digitale Abgabe: Anschreiben, Gesamt-PDF und je Anlage eine Datei
"""
import io
import json
import re
import secrets
import time
import urllib.parse
import zipfile

from flask import Response, g, jsonify, request

from bpcore import bauantrag_anlagen as BAN, bauantrag_paket as BP, db, planname
import common as C
from bauantrag import _antrag, _detail, _j, app
from bauantrag_paket import _gesperrt, _paket_bauen, _w, anschreiben_pdf

MAX = 40 * 1024 * 1024


def _abschnitt_vorgabe(art, name):
    n = BAN._fold(name)
    if art == "plan":
        return 2 if "lageplan" in n else 3
    if art == "datei":
        return 2 if re.search(r"lageplan|liegenschaft|flurkarte|kataster", n) else 4 if re.search(r"baubeschreibung|berechnung|flaeche", n) else 5
    return 5


def _holen(pid, pfad):
    d = C.bt_api("GET", "/api/plaene/datei?" + urllib.parse.urlencode({"project_id": pid, "pfad": pfad}), roh=True)
    if not d or len(d) > MAX or not bytes(d[:5]).startswith(b"%PDF"):
        raise ValueError(f"„{pfad.rsplit('/', 1)[-1]}“ ist kein PDF bis 40 MB.")
    return bytes(d)


def _speichern(c, aid, daten, P):
    daten["_paket"] = P
    c.execute("UPDATE bauantrag SET daten=?, geaendert=? WHERE id=?", (json.dumps(daten), time.strftime("%Y-%m-%d %H:%M:%S"), aid))


def _einreihen(reihe, key, abschnitt):
    """Neue Unterlage ans Ende ihres Abschnitts (hinter Trennblatt t<abschnitt>) setzen."""
    if key in reihe:
        reihe.remove(key)
    t = f"t{abschnitt}"
    if t not in reihe:
        reihe.append(key)
        return
    i = reihe.index(t) + 1
    while i < len(reihe) and not reihe[i].startswith("t"):
        i += 1
    reihe.insert(i, key)


def _beilegen(c, a, x, pdf, reihe):
    name = (x.get("text") or "Anlage")[:140] + ".pdf"
    if x.get("ukey"):
        c.execute("UPDATE bauantrag_unterlage SET daten=?, sha256=?, name=? WHERE id=? AND antrag_id=?", (pdf, BP.sha(pdf), name, int(x["ukey"][1:]), a["id"]))
    else:
        uid = c.execute("INSERT INTO bauantrag_unterlage(antrag_id, name, daten, sha256, art, von) VALUES(?,?,?,?,?,?) RETURNING id",
                        (a["id"], name, pdf, BP.sha(pdf), "beilegen", g.user["name"])).fetchone()["id"]
        x["ukey"] = f"u{uid}"
    x["beilegen"] = True
    _einreihen(reihe, x["ukey"], x.get("abschnitt") or 5)


def _loesen(c, a, x, reihe):
    """Beigelegtes PDF wieder herausnehmen – die Anlage bleibt genannt."""
    if x.get("ukey"):
        c.execute("DELETE FROM bauantrag_unterlage WHERE id=? AND antrag_id=?", (int(x["ukey"][1:]), a["id"]))
        if x["ukey"] in reihe:
            reihe.remove(x["ukey"])
    x["ukey"], x["beilegen"] = "", False


def _laden(aid):
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return None, None, None, (jsonify(error="Antrag nicht gefunden."), 404)
        if _gesperrt(a):
            return None, None, None, (jsonify(error="Der Antrag ist eingereicht – zum Ändern erst wieder auf „Entwurf“ stellen."), 409)
        d = _detail(c, a)
    return a, d, _j(a["daten"], {}), None


@app.get("/api/antraege/<int:aid>/projektdateien")
def projektdateien(aid):
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        cf, _ = planname.konfig(c)
        r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"plaene:{a['project_id']}",)).fetchone()
        zu = (_j(r["data"], {}) if r else {}).get("zuordnung") or {}
    try:
        d = C.bt_api("GET", "/api/plaene/dateien?" + urllib.parse.urlencode({"project_id": a["project_id"]}))
    except RuntimeError as e:
        return jsonify(error=str(e)), 502
    pl, sonst = planname.ordnen((d or {}).get("dateien") or [], cf, zu)
    plaene = []
    for x in pl:
        st = next((s for s in x["staende"] if s.get("pdf")), None)
        if not st:
            continue
        plaene.append({"plan": x["key"], "nr": x.get("nr") or "", "titel": x.get("titel") or st["pdf"]["name"], "index": st.get("index") or "",
                       "pfad": st["pdf"]["pfad"], "gruppe": x.get("planart_name") or x.get("kennung_name") or "Pläne", "datum": st["pdf"].get("mtime")})
    sonstige = [{"pfad": f["pfad"], "name": f["name"], "ordner": f.get("ordner") or ""} for f in sonst if f["name"].lower().endswith(".pdf")][:800]
    return jsonify(plaene=plaene, sonstige=sonstige)


@app.post("/api/antraege/<int:aid>/anlage")
def anlage_neu(aid):
    b = request.get_json(silent=True) or {}
    a, d, daten, err = _laden(aid)
    if err:
        return err
    P = daten.get("_paket") or {}
    digital = P.get("abgabe") == "digital"
    neu, fehler = [], []
    for y in (b.get("neu") or [])[:80]:
        if not isinstance(y, dict) or y.get("art") not in ("plan", "datei", "frei"):
            continue
        x = {"id": secrets.token_hex(4), "art": y["art"], "text": str(y.get("text") or "").strip()[:200], "an": True, "stand": "bei",
             "pfad": str(y.get("pfad") or "")[:600], "nr": str(y.get("nr") or "")[:40], "index": str(y.get("index") or "")[:12], "plan": str(y.get("plan") or "")[:200]}
        if not x["text"]:
            continue
        x["abschnitt"] = int(y["abschnitt"]) if str(y.get("abschnitt") or "") in "12345" and y.get("abschnitt") else _abschnitt_vorgabe(x["art"], x["text"])
        beilegen = y.get("beilegen") if "beilegen" in y else (x["art"] != "frei" and (digital or x["art"] == "datei"))
        pdf = None
        if beilegen and x["pfad"]:
            try:
                pdf = _holen(a["project_id"], x["pfad"])
            except (ValueError, RuntimeError) as e:
                fehler.append(str(e))
        neu.append((x, pdf))
    with db.tx() as c:
        reihe = list(d["gewaehlt"])
        for x, pdf in neu:
            if pdf:
                _beilegen(c, a, x, pdf, reihe)
        P["anlagen"] = (P.get("anlagen") or []) + [x for x, _ in neu]
        P["reihe"] = reihe
        _speichern(c, aid, daten, P)
        out = _detail(c, _antrag(c, aid))
    return jsonify({**out, "neu": [x["id"] for x, _ in neu], "fehler": fehler})


@app.route("/api/antraege/<int:aid>/anlage", methods=["PUT", "DELETE"])
def anlage(aid):
    b = request.get_json(silent=True) or {}
    i = str(b.get("id") or "")
    a, d, daten, err = _laden(aid)
    if err:
        return err
    P = daten.get("_paket") or {}
    L = P.get("anlagen") or []
    x = next((y for y in L if y.get("id") == i), None)
    pdf = None
    if request.method == "PUT" and x is not None and x.get("pfad") and (b.get("beilegen") is True or ("index" in b and x.get("ukey"))):
        try:
            pdf = _holen(a["project_id"], str(b.get("pfad") or x["pfad"]))
        except (ValueError, RuntimeError) as e:
            return jsonify(error=str(e)), 400
    with db.tx() as c:
        reihe = list(d["gewaehlt"])
        alt = dict(x) if x else None
        if i.startswith(("b:", "e:")):   # Bauvorlage der Checkliste / frühere eigene Zeile des Deckblatts
            Dk = P.get("deckblatt") or {}
            t = next((y["text"] for y in d["anlagen"] if y["id"] == i), None)
            if t is None:
                return jsonify(error="Anlage nicht gefunden."), 404
            ein, aus = set(Dk.get("ein") or []), set(Dk.get("aus") or [])
            if request.method == "DELETE":
                if i.startswith("e:"):
                    Dk["eigene"] = [e for e in (Dk.get("eigene") or []) if e != t]
            if "an" in b:
                (ein.add if b["an"] else ein.discard)(t)
                (aus.discard if b["an"] else aus.add)(t)
            if b.get("stand") in BAN.STAND:
                P.setdefault("anl_stand", {})[i] = b["stand"]
            if str(b.get("abschnitt") or "") in ("1", "2", "3", "4", "5"):
                P.setdefault("anl_abschnitt", {})[i] = int(b["abschnitt"])
            Dk.update(ein=sorted(ein), aus=sorted(aus))
            P["deckblatt"] = Dk
        else:
            if x is None:
                return jsonify(error="Anlage nicht gefunden."), 404
            if request.method == "DELETE":
                _loesen(c, a, x, reihe)
                L.remove(x)
            else:
                if "an" in b:
                    x["an"] = bool(b["an"])
                if b.get("stand") in BAN.STAND:
                    x["stand"] = b["stand"]
                if "text" in b and str(b["text"]).strip():
                    x["text"] = str(b["text"]).strip()[:200]
                if str(b.get("abschnitt") or "") in ("1", "2", "3", "4", "5"):
                    x["abschnitt"] = int(b["abschnitt"])
                    if x.get("ukey"):
                        _einreihen(reihe, x["ukey"], x["abschnitt"])
                if "index" in b:   # neuerer Stand aus der Planliste
                    x["index"] = str(b["index"] or "")[:12]
                    x["pfad"] = str(b.get("pfad") or x["pfad"])[:600]
                    if pdf and x.get("ukey"):
                        _beilegen(c, a, x, pdf, reihe)
                if b.get("beilegen") is True and pdf:
                    _beilegen(c, a, x, pdf, reihe)
                elif b.get("beilegen") is False:
                    _loesen(c, a, x, reihe)
        P["anlagen"], P["reihe"] = L, reihe
        _speichern(c, aid, daten, P)
        out = _detail(c, _antrag(c, aid))
    return jsonify({**out, "alt": alt})


@app.put("/api/antraege/<int:aid>/abgabe")
def abgabe(aid):
    """Papier: Pläne nur nennen (sie werden gefaltet dazugelegt). Digital: alle Pläne und Dateien als PDF beilegen."""
    art = (request.get_json(silent=True) or {}).get("abgabe")
    if art not in ("papier", "digital"):
        return jsonify(error="Abgabe: papier oder digital."), 400
    a, d, daten, err = _laden(aid)
    if err:
        return err
    P = daten.get("_paket") or {}
    L = P.get("anlagen") or []
    holen = {}
    if art == "digital":
        for x in L:
            if x.get("art") in ("plan", "datei") and x.get("pfad") and not x.get("ukey"):
                try:
                    holen[x["id"]] = _holen(a["project_id"], x["pfad"])
                except (ValueError, RuntimeError):
                    pass
    with db.tx() as c:
        reihe = list(d["gewaehlt"])
        for x in L:
            if art == "digital" and x["id"] in holen:
                _beilegen(c, a, x, holen[x["id"]], reihe)
            elif art == "papier" and x.get("art") == "plan" and x.get("ukey"):
                _loesen(c, a, x, reihe)
        P.update(abgabe=art, anlagen=L, reihe=reihe)
        _speichern(c, aid, daten, P)
        out = _detail(c, _antrag(c, aid))
    return jsonify(out)


@app.get("/api/antraege/<int:aid>/paket.zip")
def paket_zip(aid):
    """Digitale Abgabe: Anschreiben, Gesamt-PDF und je Anlage eine Datei (Name mit Nummer und Inhalt)."""
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        W, d = _w(c, a)
        gesamt, fehler = _paket_bauen(c, a)
        if not gesamt:
            return jsonify(error=fehler), 409
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            if d["anschreiben"]["an"]:
                z.writestr("00_Anschreiben.pdf", anschreiben_pdf(c, a, W, d["anschreiben"], d["projekt"], d["gliederung"]))
            z.writestr("00_Antragsunterlagen_gesamt.pdf", gesamt)
            for s in d["gliederung"]:
                for e in s["eintraege"]:
                    if e["art"] != "stueck":
                        continue
                    x = BP.stueck_pdf(c, e["key"], W, _j(a["daten"], {}).get("_pdf"))
                    if x:
                        z.writestr(BAN.dateiname(e["nr"], e["titel"]), x[0])
        p = c.execute("SELECT name FROM projects WHERE id=?", (a["project_id"],)).fetchone()
    k = (re.match(r"^[A-Za-z]{1,4}\d{2,6}", ((p["name"] if p else "") or "").strip()) or [""])[0]
    name = f"{k + ' ' if k else ''}{a['name']} – Bauantrag digital.zip"[:150]
    return Response(buf.getvalue(), mimetype="application/zip", headers={"Content-Disposition": f"attachment; filename*=UTF-8''{urllib.parse.quote(name)}", "Cache-Control": "no-store"})
