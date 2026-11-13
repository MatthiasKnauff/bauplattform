"""Bauantrag – Antragspaket (bpcore/bauantrag_paket.py): Vordrucke wählen, eigene Unterlagen, Platzieren, Paket-PDF.

PUT  /api/antraege/<aid>/paket          {key, an} | {reihe: [keys]} | {key, nutzung: ausfuellen|beilegen}
POST /api/antraege/<aid>/unterlagen     Dateien (PDF, JPG, PNG, HEIC, TIFF – Fotos werden zu PDF-Seiten)
DELETE /api/unterlagen/<uid>            in den Papierkorb
GET  /api/antraege/<aid>/stueck/<key>.pdf   ein Stück ausgefüllt · GET /api/antraege/<aid>/paket.pdf  alles mit Inhaltsverzeichnis
GET  /api/antraege/<aid>/platzierung/<key>  Seiten und gemerkte Platzierung · GET …/seite/<n>.png · PUT …  speichern (je Datei-Inhalt)
"""
import base64
import hashlib
import json
import re
import time
import urllib.parse

from flask import Response, g, jsonify, request

from bpcore import bauantrag_anlagen as BAN, bauantrag_paket as BP, db, papierkorb
import common as C
from bpcore import bauantrag_formulare as BF
from bauantrag import KEY, _antrag, _detail, _felder_setzen, _j, app
from bpcore import bauantrag as _BA
BA_VERF = _BA.VERFAHREN

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
        if isinstance(b.get("trenner"), dict):   # {nr: 1–5, titel}
            T = BP.trenner(P)
            i = int(b["trenner"].get("nr") or 0) - 1
            if 0 <= i < 5:
                T[i]["titel"] = str(b["trenner"].get("titel") or "").strip()[:60] or BP.TRENNER[i]
            P["trenner"] = T
        if isinstance(b.get("deckblatt"), dict):   # {an} | {punkt, an} | {neu: text} | {weg: text}
            Dk = P.get("deckblatt") or {}
            x = b["deckblatt"]
            ein, aus, eig = set(Dk.get("ein") or []), set(Dk.get("aus") or []), list(Dk.get("eigene") or [])
            if "punkt" in x:
                t = str(x["punkt"])[:200]
                (ein.add if x.get("an") else ein.discard)(t)
                (aus.discard if x.get("an") else aus.add)(t)
            elif "an" in x:
                Dk["an"] = bool(x["an"])
            if x.get("neu") and str(x["neu"]).strip() and str(x["neu"]).strip()[:200] not in eig:
                eig.append(str(x["neu"]).strip()[:200])
            if x.get("weg") in eig:
                eig.remove(x["weg"])
            Dk.update(ein=sorted(ein), aus=sorted(aus), eigene=eig[:60])
            P["deckblatt"] = Dk
        if isinstance(b.get("anschreiben"), dict):
            A = P.get("anschreiben") or {}
            for f, n in (("empfaenger", 600), ("ansprechpartner", 200), ("aktenzeichen", 80), ("text", 6000), ("betreff", 400)):
                if f in b["anschreiben"]:
                    A[f] = str(b["anschreiben"][f] or "").strip()[:n]
            if "an" in b["anschreiben"]:
                A["an"] = bool(b["anschreiben"]["an"])
            if b["anschreiben"].get("anlagen") in ("liste", "verweis"):
                A["anlagen"] = b["anschreiben"]["anlagen"]
            if "ausfertigungen" in b["anschreiben"]:
                try:
                    A["ausfertigungen"] = max(1, min(9, int(b["anschreiben"]["ausfertigungen"])))
                except (TypeError, ValueError):
                    pass
            if "behoerde_id" in b["anschreiben"]:   # Behörde aus den Adressen: Anschrift und Ansprechpartner:in übernehmen
                bid = b["anschreiben"]["behoerde_id"]
                r = c.execute("SELECT id, name, contact_person, street, zip, city FROM contacts WHERE id=?", (bid,)).fetchone() if bid else None
                A["behoerde_id"] = r["id"] if r else None
                if r:
                    A["empfaenger"] = "\n".join(x for x in (r["name"], r["street"], f"{r['zip']} {r['city']}".strip()) if x)
                    if r["contact_person"] and not A.get("ansprechpartner"):
                        A["ansprechpartner"] = r["contact_person"]
            P["anschreiben"] = A
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
        pfad, fehl = C.projektordner_ablegen({"project_id": a["project_id"], "art": "bauantrag", "name": name, "datei": base64.b64encode(pdf).decode()})
        if pfad is None:   # Dokumente gehören auf den Dateiserver – ohne Projektordner nichts speichern
            fehler.append(f"{name}: nicht gespeichert – {fehl}"); continue
        with db.tx() as c:
            neu.append(c.execute("INSERT INTO bauantrag_unterlage(antrag_id, name, daten, pfad, sha256, art, von) VALUES(?,?,?,?,?,?,?) RETURNING id",
                                 (aid, name, pdf if fehl == "testserver" else None, pfad, sha, art, g.user["name"])).fetchone()["id"])   # Testserver: nur zum Ausprobieren in der Datenbank
    with db.tx() as c:
        d = _detail(c, _antrag(c, aid))
    if neu:
        C.audit(g.user["name"], KEY, "Bauantrag: Unterlagen hinzugefügt", f"{len(neu)} Datei(en)")
    return jsonify({**d, "neu": neu, "fehler": fehler})


@app.post("/api/antraege/<int:aid>/bauvorlage/<key>")
def bauvorlage_hoch(aid, key):
    """Datei vom Rechner zu einer Bauvorlage („＋ Datei“ / Hochladebereich in der Zeile): in den Projektordner, an der Bauvorlage nur der Verweis."""
    if not any(key == x[0] for x in _BA.BAUVORLAGEN):
        return jsonify(error="Unbekannte Bauvorlage."), 400
    dateien = request.files.getlist("datei")
    if not dateien:
        return jsonify(error="Keine Datei."), 400
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        if _gesperrt(a):
            return jsonify(error="Der Antrag ist eingereicht – zum Ändern erst wieder auf „Entwurf“ stellen."), 409
    neu, fehler = [], []
    for f in dateien[:20]:
        name = (f.filename or "Bauvorlage").rsplit("/", 1)[-1][:150]
        roh = f.read(40 * 1024 * 1024 + 1)
        if len(roh) > 40 * 1024 * 1024 or not ERLAUBT.search(name):
            fehler.append(f"{name}: nur PDF oder Bild bis 40 MB"); continue
        try:
            pdf = roh if roh.startswith(b"%PDF") else BP.bild_zu_pdf(roh)
        except Exception:   # noqa: BLE001 – Bild nicht lesbar
            fehler.append(f"{name}: nicht lesbar"); continue
        if not name.lower().endswith(".pdf"):
            name = name.rsplit(".", 1)[0] + ".pdf"
        pfad, fehl = C.projektordner_ablegen({"project_id": a["project_id"], "art": "bauantrag", "name": name, "datei": base64.b64encode(pdf).decode()})
        if not pfad:   # Dokumente gehören auf den Dateiserver – der Testserver legt nichts ab
            fehler.append(f"{name}: nicht gespeichert – {'der Testserver legt nichts im Projektordner ab' if fehl == 'testserver' else fehl}"); continue
        neu.append({"name": name, "pfad": pfad})
    with db.tx() as c:
        a = _antrag(c, aid)
        bv = _j(a["bauvorlagen"], {})
        g_ = bv.get(key) or {}
        g_["extra"] = _BA.extra_sauber((g_.get("extra") or []) + neu)
        bv[key] = g_
        c.execute("UPDATE bauantrag SET bauvorlagen=?, geaendert=? WHERE id=?", (json.dumps(bv, ensure_ascii=False), time.strftime("%Y-%m-%d %H:%M:%S"), aid))
        d = _detail(c, _antrag(c, aid))
    if neu:
        C.audit(g.user["name"], KEY, "Bauantrag: Bauvorlage hochgeladen", f"{key}: {len(neu)} Datei(en)")
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
        r = c.execute("SELECT daten, pfad, sha256 FROM bauantrag_unterlage WHERE id=? AND antrag_id=?", (int(key[1:]), a["id"])).fetchone()
        if not r:
            return None, None
        d = BP.unterlage_daten(dict(r), a["project_id"])   # Projektordner (ältere: Datenbank)
        return (d, r["sha256"] or BP.sha(d)) if d else (None, None)
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
        if a and re.fullmatch(r"t[1-5]", key):   # Trennblatt ansehen
            d = _detail(c, a)
            i = d["gewaehlt"].index(key) if key in d["gewaehlt"] else -1
            folgend = []
            for k in (d["gewaehlt"][i + 1:] if i >= 0 else []):
                if k.startswith("t"):
                    break
                folgend.append(next((x["titel"] for x in d["paket"] if x["key"] == k), k))
            t = next(x["titel"] for x in d["paket"] if x["key"] == key)
            return _pdf_antwort(BP.trennblatt_pdf(int(key[1]), t, folgend), f"Trennblatt {key[1]}.pdf")
        if not a or not re.fullmatch(r"[fu]\d{1,9}", key):
            return jsonify(error="Nicht gefunden."), 404
        if key[0] == "u" and not c.execute("SELECT 1 FROM bauantrag_unterlage WHERE id=? AND antrag_id=?", (int(key[1:]), aid)).fetchone():
            return jsonify(error="Nicht gefunden."), 404
        W, _ = _w(c, a)
        x = BP.stueck_pdf(c, key, W, _j(a["daten"], {}).get("_pdf"))
    if not x:
        return jsonify(error="Nicht gefunden."), 404
    return _pdf_antwort(x[0], re.sub(r'[\\/:*?"<>|]+', "_", x[1])[:140] + ".pdf", request.args.get("dl"))


def _paket_bauen(c, a, mit=("anschreiben", "deckblatt", "stuecke"), nur=None, wd=None):
    """Das ganze Antragspaket: Anschreiben, Deckblatt mit Inhaltsverzeichnis, Trennblätter und Stücke. nur: Auswahl aus der Druckseite
    (Schlüssel der Stücke/Trennblätter, „anschreiben“, „deckblatt“). wd: schon berechnetes (W, d). → (PDF, Fehlertext)"""
    W, d = wd or _w(c, a)
    gew = d["gewaehlt"]
    if nur is not None:
        gew = [k for k in gew if k in nur]
        mit = tuple(x for x in ("anschreiben", "deckblatt") if x in nur) + ("stuecke",)
        if not gew and not any(x in nur for x in ("anschreiben", "deckblatt")):
            return None, "Bitte mindestens einen Teil ankreuzen."
    if not [k for k in gew if not k.startswith("t")] and "stuecke" in mit and nur is None:
        return None, "Noch kein Vordruck und keine Unterlage gewählt – in Schritt 1 anhaken."
    teile = []
    papier = d["abgabe"] != "digital"
    G = BAN.gliederung(d["paket"], gew, d["anlagen"]) if "stuecke" in mit else []   # Abschnitte mit Anlagen-Nummern
    for s in G:
        if s["tnr"]:
            teile.append(("trenner", s["titel"], None))
        for e in s["eintraege"]:
            if e["art"] == "nennen":   # liegt nicht im PDF: im Inhaltsverzeichnis mit Stand statt Seitenzahl
                teile.append(("nennen", f"{e['nr']}  {e['titel']}", "liegt gefaltet bei" if e.get("plan") and papier and e["stand"] == "bei" else BAN.STAND[e["stand"]]))
                continue
            x = BP.stueck_pdf(c, e["key"], W, _j(a["daten"], {}).get("_pdf"))
            if x:
                teile.append(("stueck", f"{e['nr']}  {e['titel']}", x[0]))
    while teile and teile[-1][0] == "trenner":   # Trennblatt ohne Inhalt am Ende weglassen
        teile.pop()
    teile = [t for i, t in enumerate(teile) if not (t[0] == "trenner" and i + 1 < len(teile) and teile[i + 1][0] == "trenner")]
    adr = ", ".join(x for x in (W.get("gs_strasse"), W.get("gs_ort")) if x)
    VS = d.get("version") or {}   # Änderung/Ergänzung: Kopf des Deckblatts nennt den Bezug
    titel = BA_VERF.get(a["verfahren"], "")
    if VS:
        titel = ("Ergänzung zum " if VS["art"] == "ergaenzung" else "Änderungsantrag zum ") + (titel or "Bauantrag") + (f" · Az. {d['anschreiben']['aktenzeichen']}" if d["anschreiben"].get("aktenzeichen") else "")
    kopf = [x for x in (titel, W.get("bezeichnung") or d["projekt"], adr, f"Bauherrschaft: {W.get('bauherr_name')}" if W.get("bauherr_name") else "",
                        f"Entwurfsverfassende: {W.get('ev_name')}" if W.get("ev_name") else "", time.strftime("Stand %d.%m.%Y")) if x]
    A = d["anschreiben"]
    vorn = anschreiben_pdf(c, a, W, A, d["projekt"], d["gliederung"]) if (A["an"] or nur is not None) and "anschreiben" in mit else None
    Dk = d["deckblatt"]
    if "stuecke" not in mit and "deckblatt" not in mit:
        return vorn, ""
    if not teile and "deckblatt" not in mit:   # nur das Anschreiben
        return vorn, ""
    R = BAN.packliste(G, d["abgabe"]) if (nur is None or "packliste" in nur) else []
    hinten = BAN.packliste_pdf(R, A["ausfertigungen"], kopf) if R else None   # Papier: was noch dazugelegt wird
    data = BP.paket_pdf(teile, kopf, entwurf=a["status"] == "entwurf", deckblatt_an=(Dk["an"] or nur is not None) and "deckblatt" in mit, vorn=vorn, hinten=hinten)
    return data, ""


@app.get("/api/antraege/<int:aid>/paket.pdf")
def paket(aid):
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        nur = set(x for x in (request.args.get("teile") or "").split(",") if x) if request.args.get("teile") is not None else None
        W, dd = _w(c, a)   # Fingerabdruck aller Angaben: gleich → dasselbe PDF (Zwischenspeicher, Browser fragt nur noch nach)
        fp = hashlib.sha1(json.dumps([W, a["daten"], a["bauvorlagen"], a["land"], a["verfahren"], sorted(nur) if nur is not None else None,
                                     {k: dd.get(k) for k in ("paket", "gewaehlt", "anlagen", "deckblatt", "anschreiben", "gliederung")}], sort_keys=True, default=str).encode()).hexdigest()
        if request.if_none_match and fp in request.if_none_match:
            return Response(status=304, headers={"ETag": f'"{fp}"', "Cache-Control": "private, no-cache"})
        data = _PAKET.get((aid, fp))
        if data is None:
            data, fehler = _paket_bauen(c, a, nur=nur, wd=(W, dd))
            if not data:
                return jsonify(error=fehler), 409
            _PAKET[(aid, fp)] = data
            while len(_PAKET) > 12:   # nur die letzten Stände behalten
                _PAKET.pop(next(iter(_PAKET)))
        p = c.execute("SELECT name FROM projects WHERE id=?", (a["project_id"],)).fetchone()
    k = (re.match(r"^[A-Za-z]{1,4}\d{2,6}", ((p["name"] if p else "") or "").strip()) or [""])[0]
    r = _pdf_antwort(data, f"{k + ' ' if k else ''}{a['name']} – Antragsunterlagen.pdf"[:150], request.args.get("dl"))
    r.headers["Cache-Control"] = "private, no-cache"
    r.headers["ETag"] = f'"{fp}"'
    return r


_PAKET = {}   # (Antrag, Fingerabdruck) → PDF – erspart das Neubauen, wenn sich nichts geändert hat


@app.get("/api/antraege/<int:aid>/anschreiben.pdf")
def anschreiben(aid):
    with db.tx() as c:
        a = _antrag(c, aid)
        if not a:
            return jsonify(error="Antrag nicht gefunden."), 404
        W, d = _w(c, a)
        data = anschreiben_pdf(c, a, W, d["anschreiben"], d["projekt"], d["gliederung"])
    return _pdf_antwort(data, f"Anschreiben {a['name']}.pdf"[:150], request.args.get("dl"))


@app.get("/api/behoerden")
def behoerden():
    """Behörden aus den Adressen (Art „Behörde“, sonst Name/Gewerk mit Bauaufsicht, Bauamt, Stadt …) – für das Anschreiben."""
    with db.tx() as c:
        R = c.execute("SELECT id, name, contact_person, street, zip, city, art, trade, extra FROM contacts WHERE "
                      "lower(art) LIKE 'beh%' OR lower(trade) LIKE '%beh_rde%' OR lower(trade) LIKE '%bauaufsicht%' OR lower(name) LIKE '%bauaufsicht%' "
                      "OR lower(name) LIKE '%bauamt%' OR lower(name) LIKE '%bauordnung%' ORDER BY name").fetchall()
    out = []
    for r in R:
        pers = [r["contact_person"]] if r["contact_person"] else []
        pers += [x.get("wert") for x in (_j(r["extra"], {}).get("weitere") or []) if isinstance(x, dict) and x.get("typ") == "person" and x.get("wert")]
        out.append({"id": r["id"], "name": r["name"], "ort": " ".join(x for x in (r["zip"], r["city"]) if x), "personen": pers[:20]})
    return jsonify(behoerden=out)


def anschreiben_pdf(c, a, W, A, projekt, G=None):
    """Anschreiben an die Bauaufsicht als Brief (Druck-Layout „Bauantrag – Anschreiben“, wie die Rügen): Briefkopf, Anschrift im Fenster,
    Datum, Bearbeiter, Betreff, Text, Anlagen-Hinweis."""
    import base64
    import io
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.utils import simpleSplit
    from reportlab.pdfgen import canvas
    from bpcore import briefbogen, layout, schrift
    bogen = briefbogen.holen(c)
    F = schrift.fuer(c)
    S = {x["key"]: x["value"] or "" for x in c.execute("SELECT key, value FROM settings WHERE key LIKE 'co\\_%' OR key='office_name'")}
    LAY = layout.aktiv(c, "bauantrag_anschreiben")
    EIG = layout.eigene_werte(c, a["project_id"])
    kurz, ort = S.get("co_short") or S.get("office_name") or "", " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x)
    emp = A["empfaenger"] + (f"\nz. Hd. {A['ansprechpartner']}" if A.get("ansprechpartner") else "")
    if A.get("ansprechpartner") and "\n" in A["empfaenger"]:   # „z. Hd.“ unter den Namen der Behörde, vor die Straße
        z = A["empfaenger"].split("\n")
        emp = "\n".join([z[0], f"z. Hd. {A['ansprechpartner']}"] + z[1:])
    V = {"Empfaenger": emp, "Datum": time.strftime("%d.%m.%Y"), "Bearbeiter": C.full_name(g.user) if g else "", "Betreff": A["betreff"].replace("\n", " · ")}
    LW = {"buero": S.get("office_name", ""), "absender": ", ".join(x for x in (kurz, S.get("co_street"), ort) if x),
          "fusszeile": " · ".join(x for x in (kurz, S.get("co_street"), ort, S.get("co_phone"), S.get("co_email"), S.get("co_web")) if x),
          "datum": V["Datum"], "bearbeiter": V["Bearbeiter"], "projekt": projekt, "bauvorhaben": W.get("bezeichnung") or projekt,
          "dokument": BA_VERF.get(a["verfahren"], "Bauantrag"), "grundlage": f"Aktenzeichen: {A['aktenzeichen']}" if A.get("aktenzeichen") else "",
          "behoerde": (A["empfaenger"].split("\n") or [""])[0], **{k: v for k, v in EIG.items() if v}}
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    cv.setTitle(f"Anschreiben {a['name']}")

    def feld(nm, x, fy, w, h, size=10, multi=False, tip=""):
        cv.setFont(F["n"], size); cv.setFillGray(0)
        zs = [z2 for z in V[nm].split("\n") for z2 in (simpleSplit(z, F["n"], size, w) or [""])] if multi else [V[nm].replace("\n", " ")]
        yy = fy + h - size * 1.05 - 1 if multi else fy + (h - size) / 2 + 1.5
        for z in zs[:8]:
            cv.drawString(x, yy, z); yy -= size * 1.2
    layout.zeichnen(cv, LAY, LW, 1, A4[1], F, bogen is not None, feld_fn=feld,
                    logo_fn=lambda cv_, r_, t_, h_, w_: C.draw_logo(cv_, r_, t_, h_, w_), umbruch=layout.umbruch_std)
    IB = layout.inhalt(LAY)
    L, R = IB["x"] * mm, (IB["x"] + IB["w"]) * mm
    y = A4[1] - IB["y"] * mm
    unten = A4[1] - (IB["y"] + IB["h"]) * mm
    cv.setFont(F["n"], 10.5); cv.setFillGray(0)
    for absatz in A["text"].split("\n"):
        for t in (simpleSplit(absatz, F["n"], 10.5, R - L) or [""]):
            if y < unten + 10 * mm:
                cv.showPage(); y = A4[1] - 25 * mm; cv.setFont(F["n"], 10.5)
            cv.drawString(L, y, t); y -= 5.4 * mm
    y -= 16 * mm   # Platz für die Unterschrift
    cv.drawString(L, y, W.get("ev_name") or kurz); y -= 10 * mm
    def zeile(t, fett=False, einzug=0):
        nonlocal y
        cv.setFont(F["b" if fett else "n"], 9.5)
        for z in (simpleSplit(t, F["b" if fett else "n"], 9.5, R - L - einzug) or [""]):
            if y < unten + 4 * mm:
                cv.showPage(); y = A4[1] - 25 * mm; cv.setFont(F["b" if fett else "n"], 9.5)
            cv.drawString(L + einzug, y, z); y -= 4.6 * mm
    E = [e for s in (G or []) for e in s["eintraege"]]
    if A.get("anlagen", "liste") == "liste" and E:   # Anlagen ausgeschrieben, Nachzureichendes extra
        zeile(f"Anlagen (Bauvorlagen in {A['ausfertigungen']}-facher Ausfertigung)", True)
        for s in G:
            da = [e for e in s["eintraege"] if e["stand"] == "bei"]
            if da:
                zeile((f"{s['nr']}  {s['titel']}: " if s["nr"] else "") + "; ".join(f"{e['nr']} {re.sub(r'^Anlage [^–]+– ', '', e['titel'])}" for e in da), einzug=0)
        for st, txt in (("nach", "Wird nachgereicht"), ("pruef", "Liegt dem Prüfingenieur vor")):
            R2 = [e for e in E if e["stand"] == st]
            if R2:
                y -= 1.5 * mm
                zeile(f"{txt}: " + "; ".join(f"{e['nr']} {e['titel']}" for e in R2), True)
    else:
        zeile("Anlagen", True)
        zeile(f"Bauvorlagen in {A['ausfertigungen']}-facher Ausfertigung gemäß Inhaltsverzeichnis")
    cv.save()
    return briefbogen.unterlegen(buf.getvalue(), bogen, seiten=1) if bogen else buf.getvalue()


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
        ak = next(iter(BF.zurueck(k, "x", W) or {}), "") if k else ""   # Antragsfeld dahinter (für Herkunft und Vorschläge)
        out.append({**x, "key": k or "", "akey": ak or "", "wert": wert, "eigen": not k, "label": labels.get(ak, "") if ak else ""})
    for i, p in enumerate(json.loads(r["felder"]) if r else []):
        if p.get("feld") in ("datum", "kreuz", "frei"):
            continue
        out.append({"name": f"platz:{i}", "typ": "text", "seite": p["seite"], "x": p["x"], "y": p["y"], "w": p["w"], "h": p["h"], "key": "", "feld": p["feld"],
                    "wert": BP.wert(p["feld"], W), "eigen": False, "label": labels.get(p["feld"], p["feld"]), "platz": True, "akey": p["feld"]})
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
