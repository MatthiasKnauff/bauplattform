"""Honorar – Abschlags- und Schlussrechnungen je Auftrag (§ 15 HOAI), mit zweitem Blatt „Erläuterung“.

Ablauf: „Abschlag anlegen“ bzw. „Schlussrechnung“ → Entwurf (rechnet laufend mit dem Leistungsstand des Auftrags: erbrachte % je LPh,
bei Pauschal der erbrachte Anteil, nach Aufwand die abgerechneten Zeiten) → „stellen“: Berechnung wird eingefroren → „bezahlt“ (Datum, Betrag)
oder „storniert“. Rechnungsbetrag = erbrachte Leistung kumuliert (inkl. Umbauzuschlag und Nebenkosten) − bisherige Rechnungen (netto).
Je Auftrag höchstens ein Entwurf; nach einer gestellten Schlussrechnung keine weitere Rechnung. Rechenkern: bpcore/honorar.abrechnung().
"""
import io
import json
import re
import time

from flask import Response, g, jsonify, request

from bpcore import db, honorar as H, papierkorb
import common as C
from honorar import KEY, _detail, _eur, app

STATUS = {"entwurf": "Entwurf", "gestellt": "gestellt", "bezahlt": "bezahlt", "storniert": "storniert"}
ZIEL_VORGABE = 14   # Zahlungsziel in Tagen (Einstellung honorar_zahlungsziel) – danach To-do „Rechnung überfällig“
TEXT_VORGABE = "Bitte überweisen Sie den Rechnungsbetrag innerhalb von 14 Tagen nach Erhalt ohne Abzug auf das unten genannte Konto."


def _einstellung(c, key, vorgabe=""):
    r = c.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return (r["value"] if r else "") or vorgabe


def _zeilen(c, aid):
    return [dict(r) for r in c.execute("SELECT * FROM honorar_rechnung WHERE auftrag_id=? ORDER BY id", (aid,)).fetchall()]


def _frueher(rows, rid):
    return [x for x in rows if x["id"] < rid and x["status"] in ("gestellt", "bezahlt")]


def _titel(rows, r):
    if r["art"] == "schluss":
        return "Schlussrechnung"
    n = sum(1 for x in rows if x["art"] == "abschlag" and x["status"] != "storniert" and x["id"] <= r["id"])
    return f"{n or 1}. Abschlagsrechnung"


def _stand(a, k, rows, r):
    """Entwurf: frisch gerechnet; gestellt/bezahlt/storniert: der eingefrorene Stand."""
    if r["status"] == "entwurf":
        return H.abrechnung(a, k, _frueher(rows, r["id"]), r["anteil"])
    try:
        return json.loads(r["stand"] or "{}")
    except ValueError:
        return {}


def steuernummer_fehlt(c):
    """§ 14 Abs. 4 Nr. 2 UStG: Steuernummer oder USt-IdNr. muss auf die Rechnung (steht im Feld co_extra der Firmendaten)."""
    r = c.execute("SELECT value FROM settings WHERE key='co_extra'").fetchone()
    return not H.steuernummer_da((r["value"] if r else "") or "")


def liste(c, a, k):
    """Rechnungen eines Auftrags für die Ansicht (in _detail eingehängt)."""
    rows = _zeilen(c, a["id"])
    out = []
    for r in rows:
        st = _stand(a, k, rows, r)
        out.append({**{f: r[f] for f in ("id", "art", "nr", "datum", "anteil", "empfaenger", "text", "status", "bezahlt_am", "bezahlt", "ablage")},
                    "titel": _titel(rows, r), "kum": st.get("kum", 0), "bisher": st.get("bisher", 0), "betrag": st.get("betrag", r["betrag"]),
                    "mwst": st.get("mwst", r["mwst"]), "brutto": st.get("brutto", r["brutto"]), "auftrags_anteil": st.get("anteil")})
    gestellt = [x for x in rows if x["status"] in ("gestellt", "bezahlt")]
    return {"liste": out, "status": STATUS, "abgerechnet": round(sum(x["betrag"] for x in gestellt), 2),
            "bezahlt": round(sum(x["bezahlt"] or 0 for x in gestellt if x["status"] == "bezahlt"), 2),
            "offen": round(sum(x["brutto"] for x in gestellt if x["status"] == "gestellt"), 2),
            "entwurf": any(x["status"] == "entwurf" for x in rows), "steuernr_fehlt": steuernummer_fehlt(c), "schluss": any(x["art"] == "schluss" and x["status"] in ("gestellt", "bezahlt") for x in rows)}


def _empfaenger(c, a):
    """Anschrift des Auftraggebers aus den Adressen (gleicher Name), sonst nur der Name."""
    name = (a.get("auftraggeber") or "").strip()
    if not name:
        return ""
    k = c.execute("SELECT name, contact_person, street, zip, city FROM contacts WHERE name=?", (name,)).fetchone()
    if not k:
        return name
    return "\n".join(x for x in (k["name"], k["contact_person"], k["street"], f"{k['zip']} {k['city']}".strip()) if x)


def _laden(c, rid):
    r = c.execute("SELECT * FROM honorar_rechnung WHERE id=?", (rid,)).fetchone()
    if not r:
        return None, None
    return dict(r), _detail(c, r["auftrag_id"])


@app.post("/api/auftraege/<int:aid>/rechnungen")
def rechnung_neu(aid):
    b = request.get_json(silent=True) or {}
    art = "schluss" if b.get("art") == "schluss" else "abschlag"
    with db.tx() as c:
        d = _detail(c, aid)
        if not d:
            return jsonify(error="Auftrag nicht gefunden."), 404
        rows = _zeilen(c, aid)
        if any(x["status"] == "entwurf" for x in rows):
            return jsonify(error="Es gibt schon einen Rechnungsentwurf – erst stellen oder löschen."), 409
        if any(x["art"] == "schluss" and x["status"] in ("gestellt", "bezahlt") for x in rows):
            return jsonify(error="Die Schlussrechnung ist schon gestellt."), 409
        a = d["auftrag"]
        anteil = None
        if a["art"] == "pauschal":   # Vorschlag: Schluss 100 %, Abschlag wie zuletzt
            vor = [x["anteil"] for x in rows if x["status"] != "storniert" and x["anteil"] is not None]
            anteil = 100.0 if art == "schluss" else (vor[-1] if vor else 0.0)
        jahr = int(time.strftime("%Y"))
        lfd = (c.execute("SELECT COALESCE(MAX(lfd), 0) AS m FROM honorar_rechnung WHERE jahr=?", (jahr,)).fetchone()["m"] or 0) + 1
        nr = H.re_nummer(_einstellung(c, "honorar_re_nummer", "{jahr}-{lfd:03}"), jahr, lfd)
        rid = c.execute("""INSERT INTO honorar_rechnung(auftrag_id, art, nr, jahr, lfd, datum, anteil, empfaenger, text, von)
                           VALUES(?,?,?,?,?,?,?,?,?,?) RETURNING id""",
                        (aid, art, nr, jahr, lfd, time.strftime("%Y-%m-%d"), anteil, _empfaenger(c, a),
                         _einstellung(c, "honorar_re_text", TEXT_VORGABE), g.user["name"])).fetchone()["id"]
        d = _detail(c, aid)
    C.audit(g.user["name"], "honorar", f"{H.RE_ART[art]} angelegt", f"{d['projekt']}: {a['name']} · Nr. {nr}")
    return jsonify({**d, "neu": rid})


@app.put("/api/rechnungen/<int:rid>")
def rechnung_aendern(rid):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r, d = _laden(c, rid)
        if not r or not d:
            return jsonify(error="Rechnung nicht gefunden."), 404
        a, k = d["auftrag"], d["rechnung"]
        rows = _zeilen(c, r["auftrag_id"])
        spaeter = [x for x in rows if x["id"] > rid and x["status"] != "storniert"]
        neu = b.get("status")
        if r["status"] == "entwurf":   # Angaben nur im Entwurf änderbar
            for f, n in (("nr", 40), ("datum", 10), ("empfaenger", 600), ("text", 2000)):
                if f in b:
                    r[f] = str(b[f] or "").strip()[:n]
            if "anteil" in b and a["art"] == "pauschal":
                r["anteil"] = H.abrechnung(a, k, (), b["anteil"])["anteil"]
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", r["datum"] or ""):
                r["datum"] = time.strftime("%Y-%m-%d")
        if neu and neu != r["status"]:
            if neu not in STATUS:
                return jsonify(error="Unbekannter Status."), 400
            if neu == "gestellt" and r["status"] == "entwurf":
                st = H.abrechnung(a, k, _frueher(rows, rid), r["anteil"])
                r.update(stand=json.dumps(st, ensure_ascii=False), betrag=st["betrag"], mwst=st["mwst"], brutto=st["brutto"])
            elif neu == "entwurf" and spaeter:
                return jsonify(error="Danach wurde schon eine weitere Rechnung angelegt – zurück zum Entwurf geht nur bei der letzten."), 409
            elif neu == "storniert" and spaeter:
                return jsonify(error="Stornieren geht nur bei der letzten Rechnung – erst die späteren stornieren."), 409
            elif neu == "storniert" and r["status"] == "entwurf":
                return jsonify(error="Einen Entwurf bitte löschen statt stornieren."), 400
            if neu == "bezahlt":
                r["bezahlt_am"] = str(b.get("bezahlt_am") or time.strftime("%Y-%m-%d"))[:10]
                r["bezahlt"] = round(float(b.get("bezahlt") if b.get("bezahlt") not in (None, "") else r["brutto"]), 2)
            elif r["status"] == "bezahlt":
                r["bezahlt_am"], r["bezahlt"] = "", None
            r["status"] = neu
        elif r["status"] == "bezahlt" and ("bezahlt_am" in b or "bezahlt" in b):
            r["bezahlt_am"] = str(b.get("bezahlt_am") or r["bezahlt_am"])[:10]
            if b.get("bezahlt") not in (None, ""):
                r["bezahlt"] = round(float(b["bezahlt"]), 2)
        c.execute("""UPDATE honorar_rechnung SET nr=?, datum=?, anteil=?, empfaenger=?, text=?, stand=?, betrag=?, mwst=?, brutto=?, status=?,
                     bezahlt_am=?, bezahlt=? WHERE id=?""",
                  (r["nr"], r["datum"], r["anteil"], r["empfaenger"], r["text"], r["stand"], r["betrag"], r["mwst"], r["brutto"], r["status"],
                   r["bezahlt_am"], r["bezahlt"], rid))
        d = _detail(c, r["auftrag_id"])
    if neu:
        C.audit(g.user["name"], "honorar", f"Rechnung {STATUS.get(neu, neu)}", f"{d['projekt']}: Nr. {r['nr']}")
    if neu == "gestellt":   # gestellt: PDF in den Projektordner
        pfad, fehl = ablegen(rid)
        return jsonify({**d, "ablage": pfad, "ablage_fehler": fehl})
    return jsonify(d)


@app.delete("/api/rechnungen/<int:rid>")
def rechnung_loeschen(rid):
    with db.tx() as c:
        r = c.execute("SELECT r.*, a.name AS auftrag, p.name AS projekt FROM honorar_rechnung r JOIN honorar_auftrag a ON a.id=r.auftrag_id "
                      "LEFT JOIN projects p ON p.id=a.project_id WHERE r.id=?", (rid,)).fetchone()
        if not r:
            return jsonify(error="Rechnung nicht gefunden."), 404
        if r["status"] != "entwurf":
            return jsonify(error="Gestellte Rechnungen werden nicht gelöscht, nur storniert."), 409
        pk = papierkorb.ablegen(c, "honorar_rechnung", rid, "Honorarrechnung (Entwurf)", f"{r['nr']} · {r['auftrag']}", g.user["name"], r["projekt"] or "", KEY)
        d = _detail(c, r["auftrag_id"])
    return jsonify({**d, "papierkorb": pk})


# ---------------------------------------------------------------- PDF: Blatt 1 Rechnung (auf dem Briefbogen), Blatt 2 Erläuterung
@app.get("/api/rechnungen/<int:rid>/rechnung.pdf")
def rechnung_pdf(rid):
    x = pdf_erzeugen(rid)
    if not x:
        return jsonify(error="Rechnung nicht gefunden."), 404
    return Response(x[0], mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="{x[1]}"', "Cache-Control": "no-store"})


def ablegen(rid):
    """Gestellte Rechnung als PDF im Projektordner ablegen (Ordner „… Honorar“, über das Bautagebuch; Testserver: nur lesen → Meldung).
    → (pfad, fehler)"""
    import base64
    x = pdf_erzeugen(rid)
    if not x:
        return "", "Rechnung nicht gefunden."
    from honorar_vertrag import fuer_ablage
    with db.tx() as c:
        pid = c.execute("SELECT a.project_id FROM honorar_rechnung r JOIN honorar_auftrag a ON a.id=r.auftrag_id WHERE r.id=?", (rid,)).fetchone()["project_id"]
        daten = fuer_ablage(c, x[0])   # mit Kennwort, falls eingetragen
    try:
        a = C.bt_api("POST", "/api/ablage/datei", {"project_id": pid, "art": "honorar", "name": x[1], "datei": base64.b64encode(daten).decode()})
    except RuntimeError as e:
        return "", str(e)
    pfad = (a or {}).get("pfad") or ""
    with db.tx() as c:
        c.execute("UPDATE honorar_rechnung SET ablage=? WHERE id=?", (pfad, rid))
    return pfad, ""


def pdf_erzeugen(rid):
    """→ (PDF-Bytes, Dateiname) oder None."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from bpcore import briefbogen, layout, schrift
    with db.tx() as c:
        r, d = _laden(c, rid)
        if not r or not d:
            return None
        rows = _zeilen(c, r["auftrag_id"])
        st = _stand(d["auftrag"], d["rechnung"], rows, r)
        titel = _titel(rows, r)
        bogen = briefbogen.holen(c)
        F = schrift.fuer(c)
        S = {x["key"]: x["value"] or "" for x in c.execute("SELECT key, value FROM settings WHERE key LIKE 'co\\_%' OR key='office_name'")}
        bank = _einstellung(c, "honorar_bank")
        LAY = layout.aktiv(c, "honorarrechnung")   # Briefkopf wie bei den Rügen (Verwaltung → Druck-Layouts → „Honorarrechnung“)
        EIG = layout.eigene_werte(c, d["auftrag"]["project_id"])
        pr = c.execute("SELECT street, zip, city FROM projects WHERE id=?", (d["auftrag"]["project_id"],)).fetchone()
    a = d["auftrag"]
    vertrag = ((a.get("ablauf") or {}).get("vertrag") or {}).get("datum") or ((a.get("ablauf") or {}).get("auftrag") or {}).get("datum") or ""
    de = lambda iso: f"{iso[8:10]}.{iso[5:7]}.{iso[:4]}" if iso and len(iso) >= 10 else (iso or "")   # noqa: E731
    pz = lambda v: f"{v:g} %".replace(".", ",")   # noqa: E731
    rand = briefbogen.raender(bogen) or {}
    IB = layout.inhalt(LAY)
    L, R = IB["x"] * mm, (IB["x"] + IB["w"]) * mm
    unten = max((rand.get("fuss") or 25 * mm) + 6 * mm, A4[1] - (IB["y"] + IB["h"]) * mm)
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    cv.setTitle(f"{titel} {r['nr']}")
    cv.setAuthor(S.get("office_name") or "")
    y = A4[1] - IB["y"] * mm
    kurz, ort = S.get("co_short") or S.get("office_name") or "", " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x)
    adr = ", ".join(x for x in ((pr["street"] if pr else ""), " ".join(x for x in ((pr["zip"] if pr else ""), (pr["city"] if pr else "")) if x)) if x)
    V = {"Empfaenger": r["empfaenger"] or a.get("auftraggeber") or "", "Datum": de(r["datum"]), "Bearbeiter": r.get("von") or "",
         "Betreff": f"Rechnungs-Nr. {r['nr']} · {d['projekt']}"}
    LW = {"buero": S.get("office_name", ""), "absender": ", ".join(x for x in (kurz, S.get("co_street"), ort) if x),
          "fusszeile": " · ".join(x for x in (kurz, S.get("co_street"), ort, S.get("co_phone"), S.get("co_email"), S.get("co_web")) if x),
          "datum": de(r["datum"]), "bearbeiter": r.get("von") or "", "projekt": d["projekt"], "bauvorhaben": d["projekt"] + (", " + adr if adr else ""),
          "dokument": titel, "re_nr": r["nr"], "auftraggeber": (V["Empfaenger"].splitlines() or [""])[0], "leistung": a["name"],
          "grundlage": "Schlussrechnung nach § 15 Abs. 1 HOAI" if r["art"] == "schluss" else "Abschlagszahlung nach § 15 Abs. 2 HOAI",
          **{k: v for k, v in EIG.items() if v}}

    def feld(nm, x, fy, w, h, size=10, multi=False, tip=""):
        from reportlab.lib.utils import simpleSplit
        cv.setFont(F["n"], size); cv.setFillGray(0)
        zs = [z2 for z in V[nm].split("\n") for z2 in (simpleSplit(z, F["n"], size, w) or [""])] if multi else [V[nm].replace("\n", " ")]
        yy = fy + h - size * 1.05 - 1 if multi else fy + (h - size) / 2 + 1.5
        for z in zs[:8]:
            cv.drawString(x, yy, z); yy -= size * 1.2
    layout.zeichnen(cv, LAY, LW, 1, A4[1], F, bogen is not None, feld_fn=feld,
                    logo_fn=lambda cv_, r_, t_, h_, w_: C.draw_logo(cv_, r_, t_, h_, w_), umbruch=layout.umbruch_std)

    def reihe(zellen, fett=False, gr=10, ab=5.2 * mm, grau=False):
        """zellen: [(x, text, 'l'|'r')]"""
        nonlocal y
        if y < unten + ab:
            cv.showPage(); y = A4[1] - 25 * mm
        cv.setFont(F["b"] if fett else F["n"], gr)
        cv.setFillGray(0.45 if grau else 0)
        for x, t, ri in zellen:
            (cv.drawRightString if ri == "r" else cv.drawString)(x, y, t)
        y -= ab

    def zeile(links, rechts="", **kw):
        reihe([(L, links, "l")] + ([(R, rechts, "r")] if rechts else []), **kw)

    def absatz(text, gr=9.5, grau=False, ab=4.8 * mm):
        """Text auf die Satzbreite umbrechen."""
        from reportlab.lib.utils import simpleSplit
        for t in simpleSplit(text, F["n"], gr, R - L):
            zeile(t, gr=gr, grau=grau, ab=ab)

    def linie():
        cv.setLineWidth(0.5); cv.setStrokeGray(0.3); cv.line(L, y + 3.6 * mm, R, y + 3.6 * mm)

    # Blatt 1 – Rechnung (Briefkopf, Anschrift, Datum, Überschrift, Betreff aus dem Druck-Layout)
    reihe([(L, "Rechnungs-Nr.", "l"), (L + 34 * mm, r["nr"] or "–", "l")], fett=True, ab=5 * mm)
    reihe([(L, "Bauvorhaben", "l"), (L + 34 * mm, LW["bauvorhaben"][:85], "l")], ab=5 * mm)
    reihe([(L, "Leistung", "l"), (L + 34 * mm, a["name"][:85], "l")], ab=5 * mm)
    if vertrag:
        reihe([(L, "Vertrag vom", "l"), (L + 34 * mm, de(vertrag), "l")], ab=5 * mm)
    reihe([(L, "Leistungsstand zum", "l"), (L + 34 * mm, de(r["datum"]), "l")], ab=5 * mm)
    y -= 4 * mm
    if r["art"] == "schluss":
        satz = ("Schlussrechnung nach § 15 Abs. 1 HOAI über die vertraglich vereinbarten und erbrachten Leistungen. "
                "Das Honorar wird mit Abnahme der Leistungen und Zugang dieser prüffähigen Schlussrechnung fällig (§ 650g Abs. 4 BGB).")
    else:
        satz = f"Abschlagszahlung nach § 15 Abs. 2 HOAI für die bis zum {de(r['datum'])} nachweislich erbrachten Leistungen."
    absatz(satz)
    zeile("Die Aufstellung der Leistungen steht auf Blatt 2 (Erläuterung).", gr=9.5, ab=9 * mm, grau=True)
    zeile("Erbrachte Leistung bis heute (kumuliert, netto)", _eur(st["kum"]))
    if st["frueher"]:
        n = len(st["frueher"])
        zeile(f"abzüglich {'bisherige Rechnung' if n == 1 else f'{n} bisherige Rechnungen'} (netto)", "− " + _eur(st["bisher"]), ab=7 * mm)
    else:
        y -= 1.8 * mm
    linie()
    zeile("Rechnungsbetrag netto", _eur(st["betrag"]), fett=True)
    zeile(f"zzgl. {pz(st['mwst_p'])} Umsatzsteuer", _eur(st["mwst"]), ab=7 * mm)
    linie()
    zeile("Rechnungsbetrag brutto", _eur(st["brutto"]), fett=True, gr=11.5, ab=11 * mm)
    for t in (r["text"] or "").splitlines()[:12]:
        absatz(t) if t.strip() else zeile("", ab=3 * mm)
    for t in (bank or "").splitlines()[:3]:
        absatz(t, gr=9)
    if S.get("co_extra"):   # z. B. Steuernummer / USt-IdNr. (Pflichtangabe auf Rechnungen)
        y -= 2 * mm
        absatz(S["co_extra"], gr=8.5, grau=True)

    # Blatt 2 – Erläuterung
    cv.showPage(); y = A4[1] - 25 * mm
    zeile(f"Erläuterung zur {titel} Nr. {r['nr']} vom {de(r['datum'])}", fett=True, gr=13, ab=7 * mm)
    zeile(f"{d['projekt'][:70]} · {a['name'][:60]}", grau=True, ab=9 * mm)
    if st["art"] == "hoai":
        zeile("Grundlagen (HOAI 2021, Gebäude, §§ 33–35)", fett=True, ab=6 * mm)
        zeile("Anrechenbare Kosten (netto)", _eur(st["kosten"]))
        zeile("Honorarzone", H.ZONEN[st["zone"] - 1])
        zeile("Honorarsatz", H.satz_text(st["satz"]))
        zeile("Honorar für 100 % der Leistungen", _eur(st["grund"]), ab=8 * mm)
        x1, x2, x3, x4 = R - 92 * mm, R - 62 * mm, R - 33 * mm, R
        zeile("Leistungsstand je Leistungsphase (§ 34)", fett=True, ab=6 * mm)
        reihe([(L, "Leistungsphase", "l"), (x1, "Anteil", "r"), (x2, "Honorar", "r"), (x3, "erbracht", "r"), (x4, "erbracht €", "r")], gr=8.5, grau=True, ab=5 * mm)
        for z in st["zeilen"]:
            reihe([(L, f"LPh {z['key'][3:]}  {z['name']}"[:46], "l"), (x1, pz(z["p"]), "r"), (x2, _eur(z["honorar"]), "r"),
                   (x3, pz(z["erbracht"]), "r"), (x4, _eur(z["betrag"]), "r")], gr=9.5, ab=5 * mm)
        linie()
        reihe([(L, "Summe Leistungsphasen", "l"), (x2, _eur(st["summe_lph"]), "r"), (x3, pz(st["anteil"] or 0), "r"), (x4, _eur(st["lph"]), "r")], fett=True, ab=6.5 * mm)
        absatz("Anteile der Leistungsphasen nach § 34 Abs. 3 HOAI; der Leistungsstand je Phase ist nach den bis zum Stichtag erbrachten Grundleistungen bewertet.", gr=8.5, grau=True)
        if st["umbau"]:
            zeile(f"Umbauzuschlag {pz(st['umbau_p'])} (§ 36) auf die erbrachte Leistung", _eur(st["umbau"]))
    elif st["art"] == "pauschal":
        zeile("Pauschalhonorar (netto)", _eur(st["summe_lph"]))
        zeile(f"erbrachter Anteil {pz(st['anteil'] or 0)}", _eur(st["lph"]), ab=6.5 * mm)
    else:
        h = (st.get("ist_min") or 0) / 60
        zeile(f"Leistungen nach Aufwand bis heute ({h:,.2f} Std.)".replace(",", "X").replace(".", ",").replace("X", "."), _eur(st["lph"]), ab=6.5 * mm)
    zeile(f"Nebenkosten (§ 14) {'pauschal ' + pz(st['nk_p']) if st['nk_art'] == 'pauschal' else 'nach Aufwand'}", _eur(st["nk"]), ab=7 * mm)
    linie()
    zeile("Erbrachte Leistung kumuliert (netto)", _eur(st["kum"]), fett=True, ab=10 * mm)
    zeile("Bisherige Rechnungen", fett=True, ab=6 * mm)
    if st["frueher"]:
        c1, c2, c3, c4, c5 = L + 26 * mm, L + 68 * mm, R - 62 * mm, R - 33 * mm, R
        reihe([(L, "Nr.", "l"), (c1, "Art", "l"), (c2, "vom", "l"), (c3, "netto", "r"), (c4, "bezahlt am", "r"), (c5, "bezahlt", "r")], gr=8.5, grau=True, ab=5 * mm)
        for x in st["frueher"]:
            reihe([(L, str(x.get("nr") or "")[:16], "l"), (c1, H.RE_ART.get(x.get("art"), "")[:22], "l"), (c2, de(x.get("datum") or ""), "l"),
                   (c3, _eur(x.get("betrag") or 0), "r"), (c4, de(x.get("bezahlt_am") or "") or "offen", "r"),
                   (c5, _eur(x["bezahlt"]) if x.get("bezahlt") is not None else "–", "r")], gr=9.5, ab=5 * mm)
        linie()
        reihe([(L, "Summe bisheriger Rechnungen (netto)", "l"), (c3, _eur(st["bisher"]), "r")], fett=True, ab=8 * mm)
    else:
        zeile("keine – dies ist die erste Rechnung zu diesem Auftrag", grau=True, ab=8 * mm)
    zeile("Erbrachte Leistung kumuliert", _eur(st["kum"]))
    zeile("abzüglich bisheriger Rechnungen", "− " + _eur(st["bisher"]), ab=6.5 * mm)
    linie()
    zeile("Diese Rechnung (netto)", _eur(st["betrag"]), fett=True, ab=9 * mm)
    if r["art"] == "abschlag" and st["art"] != "stunden" and st.get("netto_gesamt"):
        zeile("Zur Übersicht: vereinbartes Honorar netto (inkl. Nebenkosten)", _eur(st["netto_gesamt"]), gr=9, grau=True, ab=4.6 * mm)
        zeile("davon noch nicht abgerechnet", _eur(round(st["netto_gesamt"] - st["kum"], 2)), gr=9, grau=True)
    cv.save()
    pdf = briefbogen.unterlegen(buf.getvalue(), bogen, seiten=1)
    datei = re.sub(r"[^A-Za-z0-9_.-]+", "_", f"Rechnung_{r['nr']}_{(d['projekt'].split() or ['Projekt'])[0]}") + ".pdf"
    return pdf, datei
