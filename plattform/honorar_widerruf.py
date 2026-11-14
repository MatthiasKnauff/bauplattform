"""Honorar – Widerrufsbelehrung zum Architektenvertrag und Versand des Vertrags per Mail (besprochen am 14.11.2026).

Bei Verbraucher:innen besteht ein Widerrufsrecht, wenn der Vertrag außerhalb der Geschäftsräume oder nur per Mail/Post (Fernabsatz)
geschlossen wird (§§ 312b, 312c, 312g, 355 BGB). Ohne Belehrung verlängert sich die Frist auf 12 Monate + 14 Tage (§ 356 Abs. 3 BGB),
und für bis dahin Erbrachtes gibt es kein Honorar (§ 357a Abs. 2 BGB; BGH, Urteil vom 30.08.2018 – VII ZR 243/17).
Die Belehrung ist das gesetzliche Muster (Anlage 1 zu Art. 246a § 1 Abs. 2 Satz 2 EGBGB), das Formular Anlage 2 – nur die Platzhalter
werden gefüllt, damit die Gesetzlichkeitsfiktion (Art. 246a § 1 Abs. 2 Satz 2 EGBGB) gilt. Eine eigene Datei, nicht im Vertrag.

GET  /api/auftraege/<aid>/widerruf.pdf      Widerrufsbelehrung, Muster-Widerrufsformular, Erklärung „vorzeitiger Beginn“ + Empfangsbestätigung
GET  /api/auftraege/<aid>/vertrag/mail       Vorschlag: Empfänger:innen (Adressen der Auftraggeber:in), Absender (wählbar), Betreff, Text
POST /api/auftraege/<aid>/vertrag/mail       {an, von: eigen|buero, betreff, text, widerruf} – sendet nur auf Knopfdruck (nie automatisch),
                                             hält Datum und Empfänger:in im Ablauf fest und legt die Belehrung im Projektordner ab
"""
import base64
import io
import json
import re
import time
from datetime import date

from flask import Response, g, jsonify, request

from bpcore import contacts, db, mail
import common as C
from honorar import _ablauf, _detail, app
import honorar_vertrag as HV

BELEHRUNG = [   # Anlage 1 zu Art. 246a § 1 Abs. 2 Satz 2 EGBGB – Dienstleistung, Frist ab Vertragsschluss (Gestaltungshinweise 1 a, 6)
    ("h", "Widerrufsrecht"),
    ("p", "Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen."),
    ("p", "Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses."),
    ("p", "Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ({buero}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief "
          "oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular "
          "verwenden, das jedoch nicht vorgeschrieben ist."),
    ("p", "Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden."),
    ("h", "Folgen des Widerrufs"),
    ("p", "Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten "
          "(mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste "
          "Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren "
          "Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen "
          "Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser "
          "Rückzahlung Entgelte berechnet."),
    ("p", "Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen sollen, so haben Sie uns einen angemessenen Betrag zu zahlen, "
          "der dem Anteil der bis zu dem Zeitpunkt, zu dem Sie uns von der Ausübung des Widerrufsrechts hinsichtlich dieses Vertrags unterrichten, bereits "
          "erbrachten Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht."),
]
FORMULAR = [   # Anlage 2 zu Art. 246a § 1 Abs. 2 Satz 1 Nr. 1 EGBGB
    "(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)",
    "– An {buero_kurz}:",
    "– Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)",
    "– Bestellt am (*)/erhalten am (*)",
    "– Name des/der Verbraucher(s)",
    "– Anschrift des/der Verbraucher(s)",
    "– Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)",
    "– Datum",
    "(*) Unzutreffendes streichen.",
]
ORT = {"buero": "in unseren Geschäftsräumen", "ausserhalb": "außerhalb unserer Geschäftsräume", "fern": "per Mail / Post (Fernabsatz)"}


def _buero(c):
    S = {r["key"]: r["value"] or "" for r in c.execute("SELECT key, value FROM settings WHERE key LIKE 'co\\_%' OR key='office_name'")}
    S["co_email"] = S.get("co_email") or mail.von(mail.conf(c)) or ""   # das Muster verlangt Telefon und E-Mail – ohne eigene Büro-Mail die Absenderadresse
    ort = " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x)
    teile = [S.get("office_name"), S.get("co_street"), ort]
    lang = ", ".join(x for x in teile + [("Telefon " + S["co_phone"]) if S.get("co_phone") else "", ("E-Mail " + S["co_email"]) if S.get("co_email") else ""] if x)
    kurz = ", ".join(x for x in teile + [S.get("co_email")] if x)
    return S, lang, kurz


def widerruf_pdf_erzeugen(aid):
    """→ (PDF-Bytes, Dateiname) oder None."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.utils import simpleSplit
    from reportlab.pdfgen import canvas
    from bpcore import briefbogen, schrift
    with db.tx() as c:
        d = _detail(c, aid)
        if not d:
            return None
        S, lang, kurz = _buero(c)
        bogen = briefbogen.holen(c)
        F = schrift.fuer(c)
    vt = ((d["auftrag"].get("ablauf") or {}).get("vertrag") or {}) if isinstance(d["auftrag"].get("ablauf"), dict) else {}
    rand = briefbogen.raender(bogen) or {}
    L, R = rand.get("links") or 25 * mm, A4[0] - (rand.get("rechts") or 20 * mm)
    oben, unten = A4[1] - (rand.get("kopf") or 45 * mm) - 8 * mm, (rand.get("fuss") or 25 * mm) + 6 * mm
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    cv.setTitle(f"Widerrufsbelehrung {d['projekt']}")
    y = [oben]

    def text(t, gr=10, fett=False, ab=5 * mm, grau=False, ein=0):
        for z in simpleSplit(t, F["b"] if fett else F["n"], gr, R - L - ein) or [""]:
            if y[0] < unten + ab:
                cv.showPage(); y[0] = A4[1] - 25 * mm
            cv.setFont(F["b"] if fett else F["n"], gr); cv.setFillGray(0.45 if grau else 0)
            cv.drawString(L + ein, y[0], z); y[0] -= ab

    def linien(*namen):
        mitte = (L + R) / 2
        y[0] -= 14 * mm
        cv.setLineWidth(0.5); cv.setStrokeGray(0.2)
        for i, n in enumerate(namen):
            x0 = L if i == 0 else mitte + 6 * mm
            cv.line(x0, y[0], x0 + (mitte - L - 6 * mm), y[0])
            cv.setFont(F["n"], 8.5); cv.setFillGray(0.4); cv.drawString(x0, y[0] - 4 * mm, n)
        y[0] -= 10 * mm

    vorhaben = f"{d['projekt']} – {d['auftrag'].get('name') or 'Architektenleistungen'}"
    text("Widerrufsbelehrung", gr=16, fett=True, ab=7 * mm)
    text(f"zum Architektenvertrag {vorhaben}", grau=True, ab=9 * mm)
    for art, t in BELEHRUNG:
        if art == "h":
            y[0] -= 2 * mm; text(t, gr=11.5, fett=True, ab=6.5 * mm)
        else:
            text(t.format(buero=lang), ab=4.8 * mm); y[0] -= 2 * mm
    y[0] -= 4 * mm
    text("Ende der Widerrufsbelehrung", grau=True, gr=9)

    cv.showPage(); y[0] = oben
    text("Muster-Widerrufsformular", gr=16, fett=True, ab=9 * mm)
    for t in FORMULAR:
        text(t.format(buero_kurz=kurz), ab=5 * mm); y[0] -= 3 * mm

    cv.showPage(); y[0] = oben
    text("Empfangsbestätigung", gr=14, fett=True, ab=8 * mm)
    text(f"Ich/wir habe(n) die Widerrufsbelehrung und das Muster-Widerrufsformular zum Architektenvertrag {vorhaben} erhalten.", ab=5 * mm)
    linien("Ort, Datum", "Unterschrift Auftraggeber:in")
    if vt.get("vorzeitig"):
        y[0] -= 6 * mm
        text("Verlangen des vorzeitigen Beginns (§ 357a Abs. 2 BGB)", gr=12, fett=True, ab=7 * mm)
        cv.setLineWidth(0.8); cv.setStrokeGray(0); cv.rect(L, y[0] - 0.6 * mm, 3.4 * mm, 3.4 * mm)   # Kästchen zum Ankreuzen (das Zeichen ☐ fehlt in manchen Schriften)
        text("Ich/wir verlange(n) ausdrücklich, dass das Architekturbüro mit den vereinbarten Leistungen schon vor Ablauf der Widerrufsfrist beginnt. "
             "Mir/uns ist bekannt, dass ich/wir bei einem Widerruf einen angemessenen Betrag für die bis dahin erbrachten Leistungen zu zahlen habe(n) "
             "und dass das Widerrufsrecht erlischt, wenn die Leistungen vollständig erbracht sind.", ab=5 * mm, ein=6 * mm)
        linien("Ort, Datum", "Unterschrift Auftraggeber:in")
    cv.setFont(F["n"], 8); cv.setFillGray(0.45)
    cv.drawRightString(R, 12 * mm, f"Widerrufsbelehrung {d['projekt'][:60]}")
    cv.save()
    pdf = briefbogen.unterlegen(buf.getvalue(), bogen, seiten=1)
    datei = re.sub(r"[^A-Za-z0-9_.-]+", "_", f"Widerrufsbelehrung_{(d['projekt'].split() or ['Projekt'])[0]}_{time.strftime('%Y-%m-%d')}") + ".pdf"
    return pdf, datei


@app.get("/api/auftraege/<int:aid>/widerruf.pdf")
def widerruf_pdf(aid):
    x = widerruf_pdf_erzeugen(aid)
    if not x:
        return jsonify(error="Auftrag nicht gefunden."), 404
    return Response(x[0], mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="{x[1]}"', "Cache-Control": "no-store"})


def _absender(cf, wahl):
    """Absender wählbar: eigene Adresse der angemeldeten Person oder die des Büros. → (Adresse oder None, Name)"""
    eigen = (g.user["email"] or "").strip() if "email" in g.user.keys() else ""
    if wahl == "eigen" and eigen:
        return eigen, C.full_name(g.user)
    return None, cf.get("office_name") or C.full_name(g.user)


def _vorschlag(c, d):
    a = d["auftrag"]
    k = c.execute("SELECT * FROM contacts WHERE name=?", ((a.get("auftraggeber") or "").strip(),)).fetchone() if a.get("auftraggeber") else None
    an = contacts.mail_adressen(k) if k else []
    cf = mail.conf(c)
    eigen = (g.user["email"] or "").strip() if "email" in g.user.keys() else ""
    buero = mail.von(cf) or ""
    von = ([{"wert": "eigen", "text": f"{C.full_name(g.user)} <{eigen}>"}] if eigen else []) + [{"wert": "buero", "text": f"{cf.get('office_name') or 'Büro'}" + (f" <{buero}>" if buero else "")}]
    if (g.user["rolle"] if "rolle" in g.user.keys() else "") != "gf":
        von.reverse()   # GF: die eigene Adresse zuerst, sonst das Büro
    vt = ((a.get("ablauf") or {}).get("vertrag") or {})
    w = bool(vt.get("widerruf"))
    text = (f"{contacts.anrede(an[0]['name'] if an else '')}\n\nanbei erhalten Sie den Architektenvertrag für {d['projekt']}"
            + (" mit Widerrufsbelehrung und Muster-Widerrufsformular" if w else "")
            + ". Bitte senden Sie uns den Vertrag unterschrieben zurück"
            + (" – ebenso die Empfangsbestätigung der Widerrufsbelehrung" if w else "") + ".\n\nMit freundlichen Grüßen\n" + C.full_name(g.user))
    return {"an": an, "von": von, "betreff": f"Architektenvertrag {d['projekt']}" + (" – mit Widerrufsbelehrung" if w else ""), "text": text,
            "widerruf": w, "konfiguriert": mail.configured(cf)}


@app.get("/api/auftraege/<int:aid>/vertrag/mail")
def vertrag_mail_vorschlag(aid):
    with db.tx() as c:
        d = _detail(c, aid)
        if not d:
            return jsonify(error="Auftrag nicht gefunden."), 404
        return jsonify(_vorschlag(c, d))


@app.post("/api/auftraege/<int:aid>/vertrag/mail")
def vertrag_mail_senden(aid):
    b = request.get_json(silent=True) or {}
    an = str(b.get("an") or "").strip()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", an):
        return jsonify(error="Bitte eine gültige E-Mail-Adresse wählen."), 400
    betreff, text = str(b.get("betreff") or "").strip()[:200], str(b.get("text") or "").strip()[:8000]
    if not betreff or not text:
        return jsonify(error="Betreff und Text fehlen."), 400
    v = HV.vertrag_pdf_erzeugen(aid)
    if not v:
        return jsonify(error="Auftrag nicht gefunden."), 404
    anh = [(v[1], v[0], "application/pdf")]
    wd = widerruf_pdf_erzeugen(aid) if b.get("widerruf") else None
    if wd:
        anh.append((wd[1], wd[0], "application/pdf"))
    with db.tx() as c:
        cf = mail.conf(c)
        von, vname = _absender(cf, b.get("von"))
        r = c.execute("SELECT project_id, name FROM honorar_auftrag WHERE id=?", (aid,)).fetchone()
    try:
        mail.send(cf, an, betreff, text, sender=vname, from_addr=von, attachments=anh)
    except mail.MailError as e:
        return jsonify(error=f"Nicht gesendet: {e}"), 502
    heute = date.today().isoformat()
    with db.tx() as c:
        alt = c.execute("SELECT ablauf FROM honorar_auftrag WHERE id=?", (aid,)).fetchone()
        c.execute("UPDATE honorar_auftrag SET ablauf=? WHERE id=?",
                  (json.dumps(_ablauf(alt["ablauf"], {"vertrag": {"gesendet": heute, "gesendet_an": an, "gesendet_mit": "widerruf" if wd else None}})), aid))
    pfad, fehl = "", ""
    if wd:   # Nachweis: die verschickte Belehrung im Projektordner (Testserver: nur lesen)
        with db.tx() as c:
            abl = HV.fuer_ablage(c, wd[0])
        try:
            x = C.bt_api("POST", "/api/ablage/datei", {"project_id": r["project_id"], "art": "honorar", "name": wd[1], "datei": base64.b64encode(abl).decode()})
            pfad = (x or {}).get("pfad") or ""
        except RuntimeError as e:
            fehl = str(e)
    C.audit(g.user["name"], "honorar", "Architektenvertrag per Mail" + (" mit Widerrufsbelehrung" if wd else ""), f"{r['name']} → {an}")
    with db.tx() as c:
        d = _detail(c, aid)
    return jsonify({**d, "ablage": pfad, "ablage_fehler": fehl})
