"""Honorar – Architektenvertrag aus dem beauftragten Stand, gespeicherte (unterschriebene) Fassungen, Einstellungen der Abrechnung.

GET  /api/auftraege/<aid>/vertrag.pdf     Vertrag als PDF (Stand der als „gilt“ markierten Version, sonst der jetzige) – in der gemeinsamen
                                          Vorschau mit ✍ Unterschreiben (auch am Handy, mit dem Finger)
POST /api/auftraege/<aid>/vertrag         Fassung speichern (multipart datei = unterschriebenes PDF; ohne Datei: das erzeugte) und im
                                          Projektordner ablegen (Ordner „… Honorar + Vertrag“)
GET  /api/vertraege/<id>.pdf · DELETE /api/vertraege/<id> (Papierkorb)
GET/PUT /api/einstellungen                Muster der Rechnungsnummer, Text unter dem Rechnungsbetrag, Zahlungsziel, Vertragsbedingungen
Der Vertragstext ist ein Vorschlag des Büros (Einstellung „Weitere Vereinbarungen“) – vor der ersten Verwendung prüfen.
"""
import base64
import io
import re
import time

from flask import Response, g, jsonify, request

from bpcore import db, honorar as H, papierkorb
import common as C
from honorar import KEY, _detail, _detail_version, _eur, app
import honorar_rechnung as HR

EINST = {
    "honorar_re_nummer": ("{jahr}-{lfd:03}", 40),
    "honorar_re_text": (HR.TEXT_VORGABE, 2000),
    "honorar_zahlungsziel": (str(HR.ZIEL_VORGABE), 3),
    "honorar_bank": ("", 300),
    "honorar_fremd_zuschlag": ("0", 6),   # Vorgabe Zuschlag auf Fachplaner-Rechnungen (%) für neue Fachplaner
    "honorar_vertrag_text": ("Änderungen und Ergänzungen dieses Vertrags bedürfen der Textform.\n"
                             "Soweit dieser Vertrag nichts anderes regelt, gelten die §§ 650p ff. BGB und die HOAI 2021.\n"
                             "Sollte eine Bestimmung dieses Vertrags unwirksam sein, bleibt der Vertrag im Übrigen wirksam.", 6000),
}


def einstellungen(c):
    S = {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings WHERE key LIKE 'honorar\\_%'")}
    return {**{k: (S.get(k) or v) for k, (v, _) in EINST.items()}, "kennwort_gesetzt": bool(S.get(KW))}   # das Kennwort selbst nie an den Browser


KW = "honorar_pdf_kennwort"   # Kennwort der PDFs im Projektordner (Verträge, Rechnungen) – nur gespeichert, nie ausgegeben


def fuer_ablage(c, daten):
    """PDF für den Projektordner: mit dem Kennwort des Büros verschlüsselt (AES-256), falls eins eingetragen ist –
    so lässt es sich auch ohne Plattform öffnen, aber nur mit Kennwort."""
    r = c.execute("SELECT value FROM settings WHERE key=?", (KW,)).fetchone()
    kw = (r["value"] if r else "") or ""
    if not kw:
        return daten
    import io
    from pypdf import PdfReader, PdfWriter
    w = PdfWriter()
    w.append(PdfReader(io.BytesIO(daten)))
    w.encrypt(user_password=kw, owner_password=kw, algorithm="AES-256")
    out = io.BytesIO(); w.write(out)
    return out.getvalue()


@app.get("/api/einstellungen")
def einst_holen():
    with db.tx() as c:
        E = einstellungen(c)
    return jsonify({**E, "vorgaben": {k: v for k, (v, _) in EINST.items()}, "beispiel": H.re_nummer(E["honorar_re_nummer"], int(time.strftime("%Y")), 7)})


@app.put("/api/einstellungen")
def einst_setzen():
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        if b.get("kennwort_loeschen"):
            c.execute("DELETE FROM settings WHERE key=?", (KW,))
        elif str(b.get("kennwort") or "").strip():
            kw = str(b["kennwort"]).strip()
            if len(kw) < 8:
                return jsonify(error="Das Kennwort bitte mit mindestens 8 Zeichen."), 400
            c.execute("INSERT INTO settings(key, value) VALUES(?,?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (KW, kw[:200]))
        for k, (_, n) in EINST.items():
            if k in b:
                v = str(b[k] or "").strip()[:n]
                if k == "honorar_zahlungsziel" and v and not v.isdigit():
                    return jsonify(error="Zahlungsziel bitte in Tagen (Zahl)."), 400
                c.execute("INSERT INTO settings(key, value) VALUES(?,?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (k, v))
        out = einstellungen(c)
    C.audit(g.user["name"], "honorar", "Einstellungen Honorar geändert", ", ".join([k for k in EINST if k in b] + (["Kennwort der PDFs"] if b.get("kennwort") or b.get("kennwort_loeschen") else [])))
    return jsonify({**out, "vorgaben": {k: v for k, (v, _) in EINST.items()}, "beispiel": H.re_nummer(out["honorar_re_nummer"], int(time.strftime("%Y")), 7)})


def vertraege(c, aid):
    return [{"id": r["id"], "name": r["name"], "unterschrieben": bool(r["unterschrieben"]), "ablage": r["ablage"], "erstellt": r["erstellt"], "von": r["von"]}
            for r in c.execute("SELECT id, name, unterschrieben, ablage, erstellt, von FROM honorar_vertrag WHERE auftrag_id=? ORDER BY id DESC", (aid,)).fetchall()]


def _grundlage(c, aid):
    """Stand für den Vertrag: die als „gilt“ markierte Version (je Auftrag oder je Projekt), sonst der jetzige. → (d, Versionsname)"""
    r = c.execute("SELECT project_id FROM honorar_auftrag WHERE id=?", (aid,)).fetchone()
    if not r:
        return None, ""
    v = c.execute("SELECT id FROM honorar_version WHERE gilt AND (auftrag_id=? OR (auftrag_id IS NULL AND project_id=?)) ORDER BY auftrag_id NULLS LAST, id DESC",
                  (aid, r["project_id"])).fetchone()
    if v:
        d, name = _detail_version(c, aid, v["id"])
        if d:
            jetzt = _detail(c, aid)
            d["auftrag"]["ablauf"] = jetzt["auftrag"].get("ablauf") or {}
            return d, name
    return _detail(c, aid), ""


def vertrag_pdf_erzeugen(aid):
    """→ (PDF-Bytes, Dateiname) oder None."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.utils import simpleSplit
    from reportlab.pdfgen import canvas
    from bpcore import briefbogen, schrift
    with db.tx() as c:
        d, vname = _grundlage(c, aid)
        if not d:
            return None
        S = {r["key"]: r["value"] or "" for r in c.execute("SELECT key, value FROM settings WHERE key LIKE 'co\\_%' OR key='office_name'")}
        E = einstellungen(c)
        p = c.execute("SELECT name, street, zip, city FROM projects WHERE id=?", (d["auftrag"]["project_id"],)).fetchone()
        ag = HR._empfaenger(c, d["auftrag"])
        bogen = briefbogen.holen(c)
        F = schrift.fuer(c)
    a, k = d["auftrag"], d["rechnung"]
    ab = a.get("ablauf") if isinstance(a.get("ablauf"), dict) else {}
    vt, au = ab.get("vertrag") or {}, ab.get("auftrag") or {}
    rand = briefbogen.raender(bogen) or {}
    L, R = rand.get("links") or 25 * mm, A4[0] - (rand.get("rechts") or 20 * mm)
    oben, unten = A4[1] - (rand.get("kopf") or 45 * mm) - 8 * mm, (rand.get("fuss") or 25 * mm) + 6 * mm
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    cv.setTitle(f"Architektenvertrag {d['projekt']}")
    y, seite = oben, [1]
    pz = lambda v: f"{v:g} %".replace(".", ",")   # noqa: E731

    def neu():
        nonlocal y
        cv.setFont(F["n"], 8); cv.setFillGray(0.45)
        cv.drawRightString(R, 12 * mm, f"Architektenvertrag {d['projekt'][:60]} · Seite {seite[0]}")
        cv.showPage(); seite[0] += 1; y = A4[1] - 25 * mm

    def zeile(links, rechts="", fett=False, gr=10, ab=5.2 * mm, grau=False, x=None):
        nonlocal y
        if y < unten + ab:
            neu()
        cv.setFont(F["b"] if fett else F["n"], gr); cv.setFillGray(0.45 if grau else 0)
        cv.drawString(x or L, y, links)
        if rechts:
            cv.drawRightString(R, y, rechts)
        y -= ab

    def absatz(text, gr=10, ab=5 * mm, einzug=0, fett=False):
        for t in simpleSplit(text, F["b"] if fett else F["n"], gr, R - L - einzug):
            zeile(t, gr=gr, ab=ab, x=L + einzug, fett=fett)

    def para(nr, titel):
        nonlocal y
        if y < unten + 30 * mm:
            neu()
        y -= 2.5 * mm
        zeile(f"§ {nr}  {titel}", fett=True, gr=11, ab=6.5 * mm)

    zeile("Architektenvertrag", fett=True, gr=17, ab=7 * mm)
    zeile("Vertrag über Architektenleistungen (§§ 650p ff. BGB, HOAI 2021)", grau=True, ab=10 * mm)
    zeile("zwischen", grau=True, ab=6 * mm)
    for t in (ag or "Auftraggeber:in (bitte in den Adressen bzw. im Auftrag eintragen)").splitlines()[:6]:
        zeile(t, fett=t == (ag.splitlines() or [""])[0], ab=5 * mm)
    zeile("– nachstehend „Auftraggeber:in“ –", grau=True, gr=9, ab=7 * mm)
    zeile("und", grau=True, ab=6 * mm)
    buero = [S.get("office_name", ""), S.get("co_street", ""), f"{S.get('co_zip', '')} {S.get('co_city', '')}".strip()]
    for i, t in enumerate(x for x in buero if x):
        zeile(t, fett=i == 0, ab=5 * mm)
    zeile("– nachstehend „Architekt:in“ –", grau=True, gr=9, ab=8 * mm)

    para(1, "Gegenstand des Vertrags")
    adr = ", ".join(x for x in ((p["street"] if p else ""), f"{p['zip']} {p['city']}".strip() if p else "") if x)
    absatz(f"Bauvorhaben: {d['projekt']}{' (' + adr + ')' if adr else ''}")
    absatz(f"Leistung: {a['name']}" + (f" – {au['umfang']}" if au.get("umfang") else ""))
    if vname:
        absatz(f"Grundlage ist das Honorarangebot „{vname}“.", gr=9.5)

    para(2, "Leistungen der Architekt:in")
    if a["art"] == "hoai":
        absatz("Die Architekt:in erbringt für das Objekt die Grundleistungen des Leistungsbilds Gebäude und Innenräume (§ 34 HOAI 2021 mit Anlage 10.1) in folgenden Leistungsphasen:")
        y -= 1 * mm
        for ph in k["phasen"]:
            if ph["an"]:
                zeile(f"LPh {ph['key'][3:]}  {ph['name']}", pz(ph["p"]), ab=5 * mm, x=L + 6 * mm)
        y -= 1 * mm
        absatz("Besondere Leistungen werden nur erbracht und vergütet, wenn sie gesondert vereinbart sind.", gr=9.5)
    else:
        absatz(f"Die Architekt:in erbringt folgende Leistungen: {a['name']}.")
        if a.get("notiz"):
            absatz(a["notiz"][:1200], gr=9.5)

    para(3, "Honorar")
    if a["art"] == "hoai":
        absatz("Das Honorar richtet sich nach der HOAI 2021 (§§ 33–35). Grundlage sind die anrechenbaren Kosten nach der Kostenberechnung, "
               "solange diese nicht vorliegt nach der Kostenschätzung (§ 6 Abs. 1 HOAI).", gr=9.5)
        y -= 1 * mm
        zeile("Anrechenbare Kosten (netto, vorläufig)", _eur(a["kosten"]), x=L + 6 * mm)
        zeile("Honorarzone", H.ZONEN[a["zone"] - 1], x=L + 6 * mm)
        zeile("Honorarsatz", H.satz_text(a["satz"]), x=L + 6 * mm)
        zeile("Honorar der beauftragten Leistungsphasen", _eur(k["summe_lph"]), x=L + 6 * mm)
        if k["umbau"]:
            zeile(f"Umbauzuschlag {pz(a['umbau'])} (§ 36 HOAI)", _eur(k["umbau"]), x=L + 6 * mm)
    elif a["art"] == "pauschal":
        zeile("Pauschalhonorar (netto)", _eur(k["summe_lph"]), x=L + 6 * mm)
    else:
        satz = a["satz_h"] or d.get("buero_satz")
        absatz(f"Abrechnung nach Aufwand: {_eur(satz) + ' je Stunde' if satz else 'Stundensätze je Mitarbeiter:in nach Vereinbarung'}, "
               f"je angefangene {a['einheit']} Minuten, mit Stundennachweis.")
    zeile(f"Nebenkosten (§ 14 HOAI) {'pauschal ' + pz(a['nk']['p']) if a['nk']['art'] == 'pauschal' else 'nach Aufwand mit Nachweis'}",
          _eur(k["nk"]) if a["nk"]["art"] == "pauschal" and a["art"] != "stunden" else "", x=L + 6 * mm)
    if a["art"] != "stunden":
        zeile("Honorar netto", _eur(k["netto"]), fett=True, x=L + 6 * mm)
    absatz(f"Hinzu kommt die gesetzliche Umsatzsteuer (derzeit {pz(H.MWST)}).", gr=9.5)

    para(4, "Zahlungen")
    ziel = E["honorar_zahlungsziel"] or str(HR.ZIEL_VORGABE)
    absatz("Abschlagszahlungen können in angemessenen zeitlichen Abständen für nachgewiesene Leistungen gefordert werden (§ 15 Abs. 2 HOAI). "
           "Das Honorar wird fällig, wenn die Leistung abgenommen und eine prüffähige Schlussrechnung überreicht worden ist (§ 15 Abs. 1 HOAI). "
           f"Rechnungen sind innerhalb von {ziel} Tagen nach Zugang zu bezahlen.", gr=9.5)

    para(5, "Termine")
    absatz(vt.get("termine") or "Die Termine werden zwischen den Vertragsparteien einvernehmlich festgelegt.", gr=9.5)
    n = 6
    if S.get("co_bv_haftpflicht"):
        para(n, "Haftpflichtversicherung")
        absatz(f"Die Architekt:in unterhält eine Berufshaftpflichtversicherung: {S['co_bv_haftpflicht']}.", gr=9.5)
        n += 1
    para(n, "Weitere Vereinbarungen")
    for i, t in enumerate([x for x in (E["honorar_vertrag_text"] or "").splitlines() if x.strip()] + ([vt["besonderes"]] if vt.get("besonderes") else []), 1):
        absatz(f"{i}. {t.strip()}", gr=9.5)

    if y < unten + 42 * mm:
        neu()
    y -= 14 * mm
    mitte = (L + R) / 2
    cv.setLineWidth(0.5); cv.setStrokeGray(0.2)
    for x0 in (L, mitte + 6 * mm):
        cv.line(x0, y, x0 + (mitte - L - 6 * mm), y)
        cv.line(x0, y - 22 * mm, x0 + (mitte - L - 6 * mm), y - 22 * mm)
    cv.setFont(F["n"], 8.5); cv.setFillGray(0.4)
    cv.drawString(L, y - 4 * mm, "Ort, Datum"); cv.drawString(mitte + 6 * mm, y - 4 * mm, "Ort, Datum")
    cv.drawString(L, y - 26 * mm, "Auftraggeber:in")
    cv.drawString(mitte + 6 * mm, y - 26 * mm, "Architekt" + (f" ({S['co_bv_name']})" if S.get("co_bv_name") else ""))
    cv.setFont(F["n"], 8); cv.drawRightString(R, 12 * mm, f"Architektenvertrag {d['projekt'][:60]} · Seite {seite[0]}")
    cv.save()
    pdf = briefbogen.unterlegen(buf.getvalue(), bogen, seiten=1)
    datei = re.sub(r"[^A-Za-z0-9_.-]+", "_", f"Architektenvertrag_{(d['projekt'].split() or ['Projekt'])[0]}_{time.strftime('%Y-%m-%d')}") + ".pdf"
    return pdf, datei


@app.get("/api/auftraege/<int:aid>/vertrag.pdf")
def vertrag_pdf(aid):
    x = vertrag_pdf_erzeugen(aid)
    if not x:
        return jsonify(error="Auftrag nicht gefunden."), 404
    return Response(x[0], mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="{x[1]}"', "Cache-Control": "no-store"})


@app.post("/api/auftraege/<int:aid>/vertrag")
def vertrag_speichern(aid):
    """Fassung speichern und im Projektordner ablegen. Mit Datei (unterschriebenes PDF aus der Vorschau) oder ohne (das erzeugte)."""
    f = request.files.get("datei")
    if f:
        daten, name = f.read(30 * 1024 * 1024 + 1), re.sub(r"[^\w .()-]+", "_", f.filename or "Architektenvertrag.pdf")[:120]
        if not daten.startswith(b"%PDF") or len(daten) > 30 * 1024 * 1024:
            return jsonify(error="Bitte ein PDF (höchstens 30 MB)."), 400
        unterschrieben = request.form.get("unterschrieben") == "1"
    else:
        x = vertrag_pdf_erzeugen(aid)
        if not x:
            return jsonify(error="Auftrag nicht gefunden."), 404
        daten, name, unterschrieben = x[0], x[1], False
    if not name.lower().endswith(".pdf"):
        name += ".pdf"
    with db.tx() as c:
        r = c.execute("SELECT project_id, name FROM honorar_auftrag WHERE id=?", (aid,)).fetchone()
        if not r:
            return jsonify(error="Auftrag nicht gefunden."), 404
        vid = c.execute("INSERT INTO honorar_vertrag(auftrag_id, name, pdf, unterschrieben, von) VALUES(?,?,?,?,?) RETURNING id",
                        (aid, name, daten, unterschrieben, g.user["name"])).fetchone()["id"]
    pfad, fehl = "", ""
    with db.tx() as c:
        abl = fuer_ablage(c, daten)
    try:   # Projektordner (Testserver: nur lesen → Meldung)
        a = C.bt_api("POST", "/api/ablage/datei", {"project_id": r["project_id"], "art": "honorar", "name": name, "datei": base64.b64encode(abl).decode()})
        pfad = (a or {}).get("pfad") or ""
    except RuntimeError as e:
        fehl = str(e)
    with db.tx() as c:
        if pfad:
            c.execute("UPDATE honorar_vertrag SET ablage=? WHERE id=?", (pfad, vid))
        d = _detail(c, aid)
    C.audit(g.user["name"], "honorar", "Architektenvertrag gespeichert" + (" (unterschrieben)" if unterschrieben else ""), f"{d['projekt']}: {r['name']}")
    return jsonify({**d, "neu": vid, "ablage": pfad, "ablage_fehler": fehl})


@app.get("/api/vertraege/<int:vid>.pdf")
def vertrag_fassung(vid):
    with db.tx() as c:
        r = c.execute("SELECT name, pdf FROM honorar_vertrag WHERE id=?", (vid,)).fetchone()
    if not r or not r["pdf"]:
        return jsonify(error="Nicht gefunden."), 404
    return Response(bytes(r["pdf"]), mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="{r["name"]}"', "Cache-Control": "no-store"})


@app.delete("/api/vertraege/<int:vid>")
def vertrag_loeschen(vid):
    with db.tx() as c:
        r = c.execute("SELECT v.auftrag_id, v.name, p.name AS projekt FROM honorar_vertrag v JOIN honorar_auftrag a ON a.id=v.auftrag_id "
                      "LEFT JOIN projects p ON p.id=a.project_id WHERE v.id=?", (vid,)).fetchone()
        if not r:
            return jsonify(error="Nicht gefunden."), 404
        pk = papierkorb.ablegen(c, "honorar_vertrag", vid, "Architektenvertrag", r["name"], g.user["name"], r["projekt"] or "", KEY)
        d = _detail(c, r["auftrag_id"])
    return jsonify({**d, "papierkorb": pk})


@app.get("/api/auftraege/<int:aid>/druck.pdf")
def druck(aid):
    """Druckseite (bpDruck): Teile ?teile=aufstellung,vertrag,r12,r13 in dieser Reihenfolge zu einem PDF."""
    from pypdf import PdfReader, PdfWriter
    import honorar as HO
    T = [x for x in (request.args.get("teile") or "").split(",") if x][:40]
    w, n = PdfWriter(), 0
    for t in T:
        try:
            if t == "aufstellung":
                r = HO.angebot_pdf(aid)
                daten, titel = (r.get_data() if hasattr(r, "get_data") else None), "Honorarangebot / Aufstellung"
            elif t == "vertrag":
                x = vertrag_pdf_erzeugen(aid); daten, titel = (x[0] if x else None), "Architektenvertrag"
            elif re.fullmatch(r"r\d{1,9}", t):
                with db.tx() as c:
                    ok = c.execute("SELECT 1 FROM honorar_rechnung WHERE id=? AND auftrag_id=?", (int(t[1:]), aid)).fetchone()
                x = HR.pdf_erzeugen(int(t[1:])) if ok else None
                daten, titel = (x[0] if x else None), (x[1].rsplit(".", 1)[0] if x else "")
            else:
                continue
        except Exception as e:   # noqa: BLE001 – ein Teil kaputt: die anderen trotzdem
            from bpcore import fehler
            fehler.still(KEY, f"Honorar drucken: {t}", e)
            continue
        if daten and daten.startswith(b"%PDF"):
            w.append(PdfReader(io.BytesIO(daten)), outline_item=titel); n += 1
    if not n:
        return jsonify(error="Nichts zum Drucken gewählt."), 400
    out = io.BytesIO(); w.write(out)
    return Response(out.getvalue(), mimetype="application/pdf", headers={"Content-Disposition": 'inline; filename="Honorar.pdf"', "Cache-Control": "no-store"})
