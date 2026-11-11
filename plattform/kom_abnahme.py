"""Kommunikation – Abnahme mit Niederschrift, Mängelblatt und Unterschriften (Logik und PDF: bpcore/abnahme.py).

Ablauf: Entwurf anlegen → Angaben, Mängel (mit Fotos), Erklärungen → drei Unterschriften am Gerät → „Abschließen“:
gesperrt, PDF in die Plattform und in den Projektordner („Abnahmen + Mängel“), Folgen (AVA, Aufgabe, Erinnerung).
Die Mail an die Firma geht nur auf Knopfdruck. Ergänzungen nach dem Unterschreiben: Nachtrag (eigener Vorgang, bezug).
"""
import base64, json
from datetime import datetime

from flask import Response, g, jsonify, request

from bpcore import abnahme as AB, benachrichtigung, db, papierkorb, vorgang
import common as C
from kommunikation import KEY, _empfaenger, _projekt, _schicken, app


def _laden(c, vid):
    x = c.execute("SELECT * FROM kom_vorgang WHERE id=? AND art='abnahme'", (vid,)).fetchone()
    if not x or not vorgang.sieht(c, g.user, x["project_id"]):
        return None, None
    try:
        d = json.loads(x["daten"] or "{}")
    except ValueError:
        d = {}
    out = AB.sauber(d, AB.sauber(d))
    for k in ("pruefsumme", "unterschrieben"):   # beim Abschließen gesetzt – nicht vom Browser änderbar
        if d.get(k):
            out[k] = str(d[k])[:80]
    return x, out


def _antwort(c, x, d):
    F = c.execute("SELECT id, name, mime, groesse FROM kom_datei WHERE vorgang_id=? ORDER BY id", (x["id"],)).fetchall()
    b = c.execute("SELECT id, zeit, daten FROM kom_vorgang WHERE id=?", (x["bezug"],)).fetchone() if x["bezug"] else None
    beg, ende = AB.gewaehrleistung(d)
    return {"id": x["id"], "project_id": x["project_id"], "status": x["status"], "bezug": x["bezug"], "zeit": x["zeit"], "von": x["erstellt_name"],
            "gesendet": x["gesendet"], "daten": d, "fehlt": AB.fehlt_noch(d), "gw_beginn": beg, "gw_ende": ende,
            "bezug_datum": (json.loads(b["daten"] or "{}").get("abnahme_am") if b else ""),
            "fotos": [{"id": f["id"], "name": f["name"], "mime": f["mime"]} for f in F if f["mime"].startswith("image/")],
            "pdf": next((f["id"] for f in F if f["mime"] == "application/pdf"), None),
            "erkl": [{"key": k, "text": t} for k, t in AB.ERKL], "frist_satz": AB.FRIST_SATZ,
            "personen": AB.personen(c, x["project_id"], C.full_name(g.user)) if x["status"] != "unterschrieben" else {}}


@app.get("/api/abnahme/vorlage")
def abnahme_vorlage():
    pid = request.args.get("pid", type=int)
    with db.tx() as c:
        if not _projekt(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        k = c.execute("SELECT value FROM settings WHERE key='co_short'").fetchone()
        return jsonify(AB.vorlage(c, pid, C.full_name(g.user), (k["value"] if k else "") or ""))


@app.post("/api/abnahme")
def abnahme_neu():
    """Neue Abnahme (Entwurf) – mit Vorgaben aus der Vorlage, die der Browser mitschickt (Firma, Auftrag, Teilnehmer)."""
    b = request.get_json(silent=True) or {}
    pid = b.get("pid") if isinstance(b.get("pid"), int) else None
    bezug = b.get("nachtrag_zu") if isinstance(b.get("nachtrag_zu"), int) else None
    jetzt = datetime.now().isoformat(timespec="seconds")
    with db.tx() as c:
        p = _projekt(c, pid)
        if not p:
            return jsonify(error="Projekt nicht gefunden"), 404
        d = AB.sauber(b.get("daten") or {})
        titel = ""
        if bezug:
            alt, ad = _laden(c, bezug)
            if not alt or alt["status"] != "unterschrieben" or alt["project_id"] != pid:
                return jsonify(error="Ein Nachtrag geht nur zu einer unterschriebenen Abnahme."), 400
            d = AB.sauber({k: ad.get(k) for k in ("firma", "contact_id", "firma_adresse", "lv_id", "arbeiten", "auftrag_vom", "teilnehmer", "gw_jahre", "frist")})
            d["erkl"] = {"keine": False, "liste": True, "abgenommen": False, "verweigert": False, "vorbehalt": True}
            titel = "Nachtrag"
        vid = c.execute("""INSERT INTO kom_vorgang(project_id, art, titel, text, zeit, daten, status, bezug, erstellt, erstellt_von, erstellt_name)
                           VALUES(?, 'abnahme', ?, '', ?, ?, 'entwurf', ?, ?, ?, ?) RETURNING id""",
                        (pid, titel or f"Abnahme {d.get('firma') or ''}".strip(), jetzt[:16], json.dumps(d, ensure_ascii=False), bezug, jetzt,
                         g.user["id"], C.full_name(g.user))).fetchone()["id"]
        x, d = _laden(c, vid)
        return jsonify(_antwort(c, x, d))


@app.get("/api/abnahme/<int:vid>")
def abnahme_holen(vid):
    with db.tx() as c:
        x, d = _laden(c, vid)
        if not x:
            return jsonify(error="Nicht gefunden"), 404
        return jsonify(_antwort(c, x, d))


@app.put("/api/abnahme/<int:vid>")
def abnahme_speichern(vid):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        x, d = _laden(c, vid)
        if not x:
            return jsonify(error="Nicht gefunden"), 404
        if x["status"] == "unterschrieben":
            return jsonify(error="Die Abnahme ist unterschrieben und gesperrt – Ergänzungen bitte als Nachtrag."), 409
        neu = AB.sauber(b.get("daten") or {}, d)
        ids = {r["id"] for r in c.execute("SELECT id FROM kom_datei WHERE vorgang_id=?", (vid,))}
        for m in neu["maengel"]:   # nur Fotos dieser Abnahme
            m["fotos"] = [f for f in m["fotos"] if f in ids]
        titel = ("Nachtrag " if x["bezug"] else "Abnahme ") + (neu.get("firma") or "")
        c.execute("UPDATE kom_vorgang SET daten=?, titel=?, zeit=? WHERE id=?",
                  (json.dumps(neu, ensure_ascii=False), titel.strip()[:200], (neu.get("abnahme_am") or x["zeit"][:10]) + x["zeit"][10:16], vid))
        x, d = _laden(c, vid)
        return jsonify(_antwort(c, x, d))


@app.post("/api/abnahme/<int:vid>/foto")
def abnahme_foto(vid):
    anh, err = vorgang.dateien_pruefen(request.files.getlist("dateien"))
    if err:
        return jsonify(error=err), 400
    anh = [a for a in anh if a[1].startswith("image/")]
    if not anh:
        return jsonify(error="Bitte ein Foto wählen."), 400
    jetzt = datetime.now().isoformat(timespec="seconds")
    with db.tx() as c:
        x, _ = _laden(c, vid)
        if not x:
            return jsonify(error="Nicht gefunden"), 404
        if x["status"] == "unterschrieben":
            return jsonify(error="Die Abnahme ist unterschrieben und gesperrt."), 409
        if c.execute("SELECT COUNT(*) AS n FROM kom_datei WHERE vorgang_id=?", (vid,)).fetchone()["n"] + len(anh) > 120:
            return jsonify(error="Höchstens 120 Fotos je Abnahme."), 400
        ids = [c.execute("INSERT INTO kom_datei(vorgang_id, name, mime, groesse, data, erstellt, erstellt_name) VALUES(?,?,?,?,?,?,?) RETURNING id",
                         (vid, n, m, len(d), d, jetzt, C.full_name(g.user))).fetchone()["id"] for n, m, d in anh]
    return jsonify(ok=True, ids=ids)


@app.delete("/api/abnahme/<int:vid>")
def abnahme_loeschen(vid):
    """Nur Entwürfe – in den Papierkorb (mit Fotos), zurückholbar."""
    with db.tx() as c:
        x, d = _laden(c, vid)
        if not x:
            return jsonify(error="Nicht gefunden"), 404
        if x["status"] == "unterschrieben":
            return jsonify(error="Eine unterschriebene Abnahme bleibt erhalten."), 409
        p = _projekt(c, x["project_id"])
        pk = papierkorb.ablegen(c, "kom_vorgang", vid, "Abnahme (Entwurf)", x["titel"] or "Abnahme", g.user["name"], p["name"] if p else "", KEY)
    return jsonify(ok=True, papierkorb=pk)


def _fotos(c, vid):
    return {r["id"]: (r["name"], r["mime"], bytes(r["data"] or b"")) for r in c.execute("SELECT id, name, mime, data FROM kom_datei WHERE vorgang_id=? AND mime LIKE 'image/%'", (vid,))}


def abnahme_pdf(c, x):
    """PDF für /api/vorgang/<id>.pdf: unterschrieben = das gespeicherte, sonst ein Entwurf (mit Wasserzeichen)."""
    if x["status"] == "unterschrieben":
        r = c.execute("SELECT data FROM kom_datei WHERE vorgang_id=? AND mime='application/pdf' ORDER BY id DESC LIMIT 1", (x["id"],)).fetchone()
        if r:
            return bytes(r["data"])
    _, d = _laden(c, x["id"])
    p = c.execute("SELECT name FROM projects WHERE id=?", (x["project_id"],)).fetchone()
    v = dict(x)
    if x["bezug"]:
        b = c.execute("SELECT daten FROM kom_vorgang WHERE id=?", (x["bezug"],)).fetchone()
        d["bezug_datum"] = json.loads(b["daten"] or "{}").get("abnahme_am", "") if b else ""
    return AB.pdf(c, v, d, p["name"] if p else "", _fotos(c, x["id"]), entwurf=True)


@app.post("/api/abnahme/<int:vid>/abschliessen")
def abnahme_abschliessen(vid):
    """Alle drei Unterschriften (oder „nicht anwesend“) da → sperren, PDF speichern, im Projektordner ablegen, Folgen eintragen."""
    jetzt = datetime.now().isoformat(timespec="seconds")
    with db.tx() as c:
        x, d = _laden(c, vid)
        if not x:
            return jsonify(error="Nicht gefunden"), 404
        if x["status"] == "unterschrieben":
            return jsonify(error="Schon unterschrieben."), 409
        f = AB.fehlt_noch(d)
        if f:
            return jsonify(error="Es fehlt noch: " + ", ".join(f)), 400
        if not AB.unterschrieben_alle(d):
            return jsonify(error="Bitte alle drei unterschreiben lassen – oder „nicht anwesend“ wählen (mindestens eine Unterschrift)."), 400
        p = _projekt(c, x["project_id"])
        v = dict(x)
        v["unterschrieben"] = jetzt
        v["pruefsumme"] = AB.pruefsumme(d)
        if x["bezug"]:
            b = c.execute("SELECT daten FROM kom_vorgang WHERE id=?", (x["bezug"],)).fetchone()
            d["bezug_datum"] = json.loads(b["daten"] or "{}").get("abnahme_am", "") if b else ""
        pdfb = AB.pdf(c, v, d, p["name"] if p else "", _fotos(c, vid))
        name = AB.dateiname(d, p["name"] if p else "")
        if x["bezug"]:
            name = name.replace(" Abnahme ", " Nachtrag Abnahme ", 1)
        d.pop("bezug_datum", None)
        d["pruefsumme"], d["unterschrieben"] = v["pruefsumme"], jetzt
        c.execute("UPDATE kom_vorgang SET status='unterschrieben', daten=? WHERE id=?", (json.dumps(d, ensure_ascii=False), vid))
        c.execute("INSERT INTO kom_datei(vorgang_id, name, mime, groesse, data, erstellt, erstellt_name) VALUES(?,?,?,?,?,?,?)",
                  (vid, name, "application/pdf", len(pdfb), pdfb, jetzt, C.full_name(g.user)))
        folgen = AB.folgen(c, g.user, x, d)
    pfad, ablage_fehler = "", ""
    try:   # Projektordner auf dem Server – über das Bautagebuch, das die Ablage kennt (Testserver: nur lesen → Meldung)
        a = C.bt_api("POST", "/api/ablage/datei", {"project_id": x["project_id"], "art": "abnahme", "firma": d.get("firma") or "", "name": name,
                                                  "datei": base64.b64encode(pdfb).decode()})
        pfad = (a or {}).get("pfad") or ""
    except RuntimeError as e:
        ablage_fehler = str(e)
    C.audit(g.user["name"], "kommunikation", "Abnahme unterschrieben", f"{d.get('firma')} · {AB.datum_de(d.get('abnahme_am'))}")
    return jsonify(ok=True, pfad=pfad, ablage_fehler=ablage_fehler, folgen=folgen, name=name)


@app.post("/api/abnahme/<int:vid>/senden")
def abnahme_senden(vid):
    """Das unterschriebene PDF per Mail – nur auf Knopfdruck, nie automatisch."""
    b = request.get_json(silent=True) or {}
    an, err = _empfaenger(json.dumps(b.get("an") or []))
    if err or not an:
        return jsonify(error=err or "Bitte mindestens einen Empfänger wählen."), 400
    with db.tx() as c:
        x, d = _laden(c, vid)
        if not x or x["status"] != "unterschrieben":
            return jsonify(error="Erst unterschreiben, dann senden."), 400
        r = c.execute("SELECT name, data FROM kom_datei WHERE vorgang_id=? AND mime='application/pdf' ORDER BY id DESC LIMIT 1", (vid,)).fetchone()
        p = _projekt(c, x["project_id"])
        art = "Nachtrag zur Abnahme" if x["bezug"] else "Abnahme"
        betreff = vorgang.betreff_mit_kuerzel(f"{art} {d.get('firma') or ''} vom {AB.datum_de(d.get('abnahme_am'))}", p["name"] if p else "")
        text = (b.get("text") or "").strip()[:5000] or f"Sehr geehrte Damen und Herren,\n\nanbei die unterschriebene Niederschrift ({art.lower()}) zum Bauvorhaben {p['name'] if p else ''}.\n\nMit freundlichen Grüßen"
        weg, err = _schicken(c, p, an, betreff, text, [(r["name"], "application/pdf", bytes(r["data"]))], bool(b.get("kopie")))
    with db.tx() as c:
        benachrichtigung.protokoll(c, "vorgang", an, project_id=x["project_id"], projekt=p["name"] if p else "", betreff=betreff, inhalt=text, von=C.full_name(g.user),
                                   weg="mail", status="fehler" if err else "gesendet", fehler=err or "", link=f"kommunikation:#v={vid}")
        if not err:
            c.execute("UPDATE kom_vorgang SET gesendet=? WHERE id=?", (datetime.now().isoformat(timespec="seconds"), vid))
    if err:
        return jsonify(error=err), 502
    return jsonify(ok=True, betreff=betreff)
