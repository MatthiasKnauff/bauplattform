"""Kosten – Druck (GO 16.11.2026): Bericht einer Kostenermittlung als PDF über die gemeinsame Druckseite (bp/druck.js: Vorschau,
ankreuzen, Senden, Ablegen, Stempel). Teile zum Ankreuzen (TEILE); Einstellungen im Druck-Layout „Kostenermittlung (DIN 276)“
(bpcore/layout.py, Bereich „kosten“): Gliederungstiefe 1/2/3, netto/brutto, Runden, Vermerk „vorläufig“ – Briefbogen wie bei allen Ausdrucken.

GET /api/bk/<i>/bericht.pdf?teile=deckblatt,zusammenfassung,…&layout.kosten=…&opt.kosten={…}
Raumbuch und Raumtypen gibt es nicht mehr (Kosten aus Bauteilen); Pläne kommen nicht als Anlage – unter „Grundlagen“ nur Name und Datum des Planstands.
"""
import io
import json
import re
from datetime import date

from flask import Response, g, jsonify, request

from baukosten import STUFE_NAME, ZIEL_QUELLE, _j, _row, app, aus_modell, calc, clean_data, flow
from baukosten_ausgabe import ART, befunde, gliederung
from bpcore import db, layout, modell
import common as C

TEILE = (("deckblatt", "Deckblatt", True), ("zusammenfassung", "Zusammenfassung (Stufe, Summe, Genauigkeit)", True), ("din", "Kosten nach DIN 276", True),
         ("zusammenstellung", "Zusammenstellung der Kosten mit Ort, Datum, Unterschrift", False),
         ("bauteile", "Bauteile (Menge × Preis)", False), ("genauigkeit", "Genauigkeit (Spannen, Offenes)", True),
         ("mittelabfluss", "Mittelabfluss mit Diagramm", True), ("grundlagen", "Erläuterungen und Grundlagen", True),
         ("aenderungen", "Anhang: Änderungen beim Einlesen (Excel)", False))


def _opt():
    try:
        ex = json.loads(request.args.get("opt.kosten") or request.args.get("opt") or "{}")
    except ValueError:
        ex = {}
    with db.tx() as c_:
        return layout.optionen(c_, "kosten", request.args.get("layout.kosten") or request.args.get("layout"), ex if isinstance(ex, dict) else {})


def bericht(c, r, teile, opt):
    from reportlab.graphics.shapes import Drawing, Line, Rect, String
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import BaseDocTemplate, CondPageBreak, KeepTogether, PageBreak, Paragraph, Spacer, Table, TableStyle
    from xml.sax.saxutils import escape as X

    d = clean_data(_j(r["data"], {}))
    Z, _, _, offen = aus_modell(c, r["project_id"])
    cal = calc(d, [] if d.get("excel") else offen, r["stufe"])   # Stand aus Excel: ohne Bauteile des Modells, nichts Offenes (wie baukosten._out)
    G = cal.get("genau")
    p = c.execute("SELECT name, client, street, zip, city FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
    stufe = STUFE_NAME.get(r["stufe"], "Kostenermittlung")
    brutto, beide, mw = opt.get("betrag") == "brutto", opt.get("betrag") == "beide", d["mwst"]
    fassung = "2008" if opt.get("fassung") == "2008" else "2018"
    din_txt = "DIN 276-1:2008-12" if fassung == "2008" else "DIN 276:2018-12"
    fac = 1 + mw / 100 if brutto else 1
    rnd = int(opt.get("runden") or 0)
    tiefe = int(opt.get("tiefe") or 2)
    basis = f"brutto inkl. {mw:g} % Umsatzsteuer" if brutto else "netto zzgl. Umsatzsteuer"

    def eur(v, roh=False):
        if v is None:
            return "offen"
        v = v if roh else v * fac
        if rnd:
            v = round(v / rnd) * rnd
        return f"{v:,.0f} €".replace(",", ".")

    def zahl(v, n=2):
        return f"{v:,.{n}f}".replace(",", "§").replace(".", ",").replace("§", ".")

    INK, MUTE, LINE, BAND, ACC = colors.HexColor("#1c1c1a"), colors.HexColor("#6b6b66"), colors.HexColor("#d9d6cf"), colors.HexColor("#f2efe8"), colors.HexColor("#b7410e")
    S = {"h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=22, leading=27, textColor=INK, spaceAfter=4),
         "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=INK, spaceBefore=4, spaceAfter=6),
         "p": ParagraphStyle("p", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=INK),
         "m": ParagraphStyle("m", fontName="Helvetica", fontSize=8.5, leading=11.5, textColor=MUTE),
         "c": ParagraphStyle("c", fontName="Helvetica", fontSize=9, leading=11.5, textColor=INK),
         "big": ParagraphStyle("big", fontName="Helvetica-Bold", fontSize=26, leading=30, textColor=INK)}
    with db.tx() as cc:
        office = C.kurzname(cc)
    adr = ", ".join(x for x in ((p["street"] or "") if p else "", " ".join(y for y in ((p["zip"] or "") if p else "", (p["city"] or "") if p else "") if y)) if x)
    LW = layout_werte(c, r, p, stufe)
    LAY = layout.aktiv(c, "kosten", request.args.get("layout.kosten") or request.args.get("layout"))
    tpl, W = layout.platypus_seiten(LAY, LW, {"n": "Helvetica", "b": "Helvetica-Bold"}, logo_fn=lambda cv_, r_, t_, h_, w_: C.draw_logo(cv_, r_, t_, h_, w_))

    def tabelle(rows, widths, rechts=(), fett=(), band=()):
        t = Table(rows, colWidths=widths, repeatRows=1)
        st = [("FONT", (0, 0), (-1, -1), "Helvetica", 9), ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8.5), ("TEXTCOLOR", (0, 0), (-1, 0), MUTE),
              ("LINEBELOW", (0, 0), (-1, 0), 0.8, INK), ("LINEBELOW", (0, 1), (-1, -1), 0.3, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
              ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3), ("LEFTPADDING", (0, 0), (-1, -1), 3)]
        st += [("ALIGN", (k, 0), (k, -1), "RIGHT") for k in rechts]
        st += [("FONT", (0, i), (-1, i), "Helvetica-Bold", 9) for i in fett]
        st += [("BACKGROUND", (0, i), (-1, i), BAND) for i in band]
        t.setStyle(TableStyle(st))
        return t

    story = []
    vorl = " – vorläufig" if opt.get("vorlaeufig") else ""
    if "deckblatt" in teile:
        story += [Spacer(1, 30 * mm), Paragraph(X((p["name"] if p else "") or r["name"]), S["h1"]), Paragraph(X(f"{stufe}{vorl} · {r['name']}"), S["p"]), Spacer(1, 10 * mm)]
        if adr:
            story += [Paragraph("Bauvorhaben", S["m"]), Paragraph(X(adr), S["p"]), Spacer(1, 5 * mm)]
        if p and p["client"]:
            story += [Paragraph("Bauherr:in", S["m"]), Paragraph(X(p["client"]), S["p"]), Spacer(1, 5 * mm)]
        story += [Paragraph("Gesamtkosten (" + X(basis) + ")", S["m"]), Paragraph(eur(cal["total"]), S["big"]), Spacer(1, 5 * mm),
                  Paragraph("Aufgestellt", S["m"]), Paragraph(X(", ".join(x for x in (office, C.full_name(g.user) if getattr(g, "user", None) else "", date.today().strftime("%d.%m.%Y")) if x)), S["p"])]
        story.append(PageBreak())
    if "zusammenfassung" in teile:
        n = lambda v: eur(v, True)   # noqa: E731 – die Zusammenfassung zeigt netto, Umsatzsteuer und brutto
        rows = [["", "Betrag"], ["300 Bauwerk – Baukonstruktionen", n(cal["kg300"])], ["400 Bauwerk – Technische Anlagen", n(cal["kg400"])]]
        if cal["extra"]:
            rows.append(["weitere Kostengruppen", n(cal["extra"])])
        rows += [[f"Unvorhergesehenes ({zahl(d['risiko'], 0)} %)", n(cal["risiko"])],
                 ["700 Baunebenkosten" + ("" if d.get("nk_fest") is not None else f" ({zahl(d['nk'], 0)} %)"), n(cal["nk"])], ["Summe netto", n(cal["total"])],
                 [f"Umsatzsteuer {zahl(mw, 0)} %", n(cal["mwst"])], ["Summe brutto", n(cal["brutto"])]]
        f = [len(rows) - 3, len(rows) - 1]
        z = [[Paragraph(X(a), S["c"]), b] for a, b in rows]
        story += [Paragraph(X(f"Zusammenfassung – {stufe}{vorl}"), S["h2"]), tabelle(z, [W - 40 * mm, 40 * mm], rechts=(1,), fett=f, band=(len(rows) - 1,)), Spacer(1, 3 * mm)]
        if brutto:
            story.append(Paragraph("Die Beträge in den folgenden Teilen sind brutto angegeben.", S["m"]))
        if G:
            story.append(Paragraph(X(f"Genauigkeit: etwa {eur(G['unten'])} bis {eur(G['oben'])} (−{zahl(G['minus'] or 0, 0)} % / +{zahl(G['plus'] or 0, 0)} %); "
                                     f"für die {stufe} üblich ±{G['ziel'][0]}–{G['ziel'][1]} %."), S["p"]))
        story.append(Spacer(1, 6 * mm))
    Gl = gliederung(cal, d, fassung, opt.get("leer") or "weg")
    nb = (lambda v: [eur(v, True), eur(v * (1 + mw / 100), True)]) if beide else None   # noqa: E731 – netto und brutto nebeneinander
    nb2 = lambda v: [eur(v, True), eur(v * (1 + mw / 100), True)]   # noqa: E731
    if "din" in teile:   # gewohnter Aufbau der Excel-Liste: Nr. · Kostengruppe · Teilbetrag · Gesamtbetrag, Summe je 100er-Gruppe (XL-6 A)
        rows, fett, band = [["Nr.", "Kostengruppe", "netto" if beide else "Teilbetrag", "brutto" if beide else "Gesamtbetrag"]], [], []
        P = lambda t, e=0, m="": Paragraph(("&nbsp;" * 3 * e) + X(t) + ("<super>1</super>" if m else ""), S["c"])   # noqa: E731
        for a in Gl["g1"]:
            rows.append([a["k"], P(a["name"]), "", ""]); fett.append(len(rows) - 1)
            for b in a["g2"]:
                if tiefe >= 2:
                    if tiefe >= 3:
                        rows.append([b["k"], P(b["name"], 1, b.get("mark")), *(nb(b["summe"]) if beide else ["", ""])]); fett.append(len(rows) - 1)
                        for x in b["g3"]:
                            rows.append([x["k"], P(x["name"], 2, x["mark"]), *(nb(x["summe"]) if beide else [eur(x["summe"]), ""])])
                        if not beide:
                            rows.append(["", P(f"Summe {b['k'] or b['name']}", 1), "", eur(b["summe"])])
                    else:
                        rows.append([b["k"], P(b["name"], 1, any(x["mark"] for x in b["g3"])), *(nb(b["summe"]) if beide else [eur(b["summe"]), ""])])
            rows.append(["", Paragraph(f"<b>Summe {a['k']}</b>", S["c"]), *(nb(a["summe"]) if beide else ["", eur(a["summe"])])]); fett.append(len(rows) - 1); band.append(len(rows) - 1)
        if Gl["risiko"]:
            rows.append(["", P("Unvorhergesehenes (Kostenrisiko)"), *(nb(Gl["risiko"]) if beide else ["", eur(Gl["risiko"])])])
        rows.append(["", Paragraph("<b>Summe</b>" + ("" if beide else " (" + X(basis) + ")"), S["c"]), *(nb(cal["total"]) if beide else ["", eur(cal["total"])])])
        fett.append(len(rows) - 1); band.append(len(rows) - 1)
        story += [CondPageBreak(50 * mm), Paragraph(X(f"Kosten nach {din_txt} – {tiefe}. Ebene"), S["h2"]),
                  tabelle(rows, [16 * mm, W - 76 * mm, 30 * mm, 30 * mm], rechts=(2, 3), fett=fett, band=band)]
        if Gl["fussnote"] and tiefe >= 2:
            story.append(Paragraph(X("¹ Kostengruppe " + ("umgesetzt von DIN 276:2008 bzw. ergänzt" + (" – siehe Anhang „Änderungen beim Einlesen“" if "aenderungen" in teile and befunde(d) else "")
                                                         if fassung == "2018" else "aus der DIN 276:2018 zurückgeführt – gab es in der DIN 276-1:2008-12 so nicht")), S["m"]))
        story.append(Spacer(1, 6 * mm))
    if "zusammenstellung" in teile:   # Zusammenstellung der Kosten, Ort, Datum, Unterschrift – wie am Ende der Excel-Liste
        rows = [["Nr.", "Kostengruppe", "netto", "brutto"]] + [[a["k"], Paragraph(X(a["name"]), S["c"]), *nb2(a["summe"])] for a in Gl["g1"]]
        if Gl["risiko"]:
            rows.append(["", Paragraph("Unvorhergesehenes (Kostenrisiko)", S["c"]), *nb2(Gl["risiko"])])
        rows += [["", Paragraph("<b>Summe netto</b>", S["c"]), eur(cal["total"], True), ""], ["", Paragraph(X(f"Umsatzsteuer {zahl(mw, 0)} %"), S["c"]), eur(cal["mwst"], True), ""],
                 ["", Paragraph("<b>Summe brutto</b>", S["c"]), "", eur(cal["brutto"], True)]]
        ort = (c.execute("SELECT value FROM settings WHERE key='co_city'").fetchone() or {"value": ""})["value"] or ""
        wer = C.full_name(g.user) if getattr(g, "user", None) else ""
        unt = Table([[Paragraph(X(f"{ort + ', ' if ort else ''}{date.today().strftime('%d.%m.%Y')}"), S["p"]), ""],
                     ["", ""], [Paragraph(X(office or ""), S["m"]), Paragraph(X(wer), S["m"])]], colWidths=[W / 2, W / 2], rowHeights=[None, 14 * mm, None])
        unt.setStyle(TableStyle([("LINEABOVE", (0, 2), (0, 2), 0.6, INK), ("LINEABOVE", (1, 2), (1, 2), 0.6, INK), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                 ("RIGHTPADDING", (0, 0), (0, -1), 12 * mm)]))
        story += [CondPageBreak(90 * mm), KeepTogether([Paragraph(X(f"Zusammenstellung der Kosten – {din_txt}"), S["h2"]),
                  tabelle(rows, [16 * mm, W - 76 * mm, 30 * mm, 30 * mm], rechts=(2, 3), fett=[len(rows) - 3, len(rows) - 1], band=(len(rows) - 1,)),
                  Spacer(1, 10 * mm), Paragraph("Aufgestellt:", S["m"]), Spacer(1, 2 * mm), unt]), Spacer(1, 6 * mm)]
    if "bauteile" in teile:
        BZ = sorted([z for z in cal["zeilen"] if z.get("betrag")], key=lambda z: (z.get("kg") or "999", z.get("name") or ""))
        rows = [["KG", "Bauteil", "Menge", "EP", "Betrag"]] + [[z.get("kg") or "", Paragraph(X(z["name"] + (f" – {z['mat']}" if z.get("mat") else "")), S["c"]),
                                                               f"{zahl(z.get('menge') or 0)} {z.get('einheit') or ''}", f"{zahl((z.get('ep') or 0) * fac)} €", eur(z["betrag"])] for z in BZ]
        story += [CondPageBreak(50 * mm), Paragraph("Bauteile", S["h2"]), tabelle(rows, [12 * mm, W - 94 * mm, 28 * mm, 24 * mm, 30 * mm], rechts=(2, 3, 4)), Spacer(1, 6 * mm)]
    if "genauigkeit" in teile and G:
        T = G.get("teile") or {}
        rows = [["Anteil", "±"], ["Preise (Spannen je Bauteil)", f"{zahl(T.get('preise') or 0, 1)} %"], ["Markt (Preisentwicklung, Region)", f"{zahl(T.get('markt') or 0, 1)} %"],
                ["Mengen (je Herkunft)", f"{zahl(T.get('mengen') or 0, 1)} %"], ["Offene Zeilen (nur nach oben)", f"+{zahl(T.get('offen') or 0, 1)} %"]]
        el = [Paragraph("Genauigkeit", S["h2"]),
              Paragraph(X(f"Band: {eur(G['unten'])} bis {eur(G['oben'])}, also −{zahl(G['minus'] or 0, 1)} % / +{zahl(G['plus'] or 0, 1)} % um die Summe der Bauteile. "
                          f"Üblich für die {stufe}: ±{G['ziel'][0]}–{G['ziel'][1]} % – {'im Ziel' if G['ampel'] == 'gruen' else 'am Rand des Ziels' if G['ampel'] == 'gelb' else 'außerhalb des Ziels'}."), S["p"]),
              Spacer(1, 2 * mm), tabelle(rows, [W - 30 * mm, 30 * mm], rechts=(1,))]
        if G.get("offen"):
            el.append(Paragraph(X(f"{G['offen']} Bauteil{'e' if G['offen'] != 1 else ''} noch offen."), S["p"]))
        if G.get("besser"):
            el += [Spacer(1, 2 * mm), Paragraph("Genauer wird es durch:", S["m"])] + [Paragraph("– " + X(b), S["p"]) for b in G["besser"]]
        el += [Spacer(1, 2 * mm), Paragraph(X("Quelle des Ziel-Bands: " + ZIEL_QUELLE + "."), S["m"]), Spacer(1, 6 * mm)]
        story += [CondPageBreak(60 * mm), KeepTogether(el)]
    if "mittelabfluss" in teile:
        F = flow(c, r, d, cal)
        story += [CondPageBreak(80 * mm), Paragraph("Mittelabfluss", S["h2"])]
        if not F.get("ok"):
            story += [Paragraph(X(F.get("why") or "Kein Bauzeitenplan."), S["p"]), Spacer(1, 6 * mm)]
        else:
            M = F["months"]
            hoch, breit = 45 * mm, W
            dr = Drawing(breit, hoch + 12)
            mx = max([m["idx"] for m in M] + [1])
            bw = breit / max(1, len(M))
            for i, m in enumerate(M):
                h = (m["idx"] / mx) * hoch
                dr.add(Rect(i * bw + bw * 0.15, 10, bw * 0.7, h, fillColor=ACC, strokeColor=None))
                if len(M) <= 18 or i % 2 == 0:
                    dr.add(String(i * bw + bw / 2, 1, f"{m['ym'][5:7]}/{m['ym'][2:4]}", fontName="Helvetica", fontSize=6.5, fillColor=MUTE, textAnchor="middle"))
            dr.add(Line(0, 10, breit, 10, strokeColor=LINE, strokeWidth=0.5))
            rows = [["Monat", "Kosten", "mit Preissteigerung", "Summe"]] + [[f"{m['ym'][5:7]}/{m['ym'][:4]}", eur(m["amount"]), eur(m["idx"]), eur(m["cum_idx"])] for m in M]
            story += [Paragraph(X(f"Nach dem Bauzeitenplan „{F['plan']}“ ({_de(F['start'])} – {_de(F['end'])}), Preissteigerung {zahl(d['rate'], 1)} % im Jahr; ohne Baunebenkosten."), S["p"]),
                      Spacer(1, 3 * mm), dr, Spacer(1, 3 * mm), tabelle(rows, [W - 120 * mm, 40 * mm, 40 * mm, 40 * mm], rechts=(1, 2, 3)), Spacer(1, 6 * mm)]
    if "grundlagen" in teile:
        m = modell.lesen(c, r["project_id"])["modell"] if r["project_id"] else {}
        Q = ((m.get("bauteilliste") or {}).get("quelle") or {})
        ps = " · ".join(x for x in (Q.get("name") or "", _de(Q.get("gelesen") or "")) if x) or "kein Planstand eingelesen"
        hand = len(d.get("preise") or {})
        el = [Paragraph("Erläuterungen und Grundlagen", S["h2"])]
        if d.get("notes"):
            el += [Paragraph(X(z), S["p"]) if z.strip() else Spacer(1, 2 * mm) for z in d["notes"].split("\n")] + [Spacer(1, 3 * mm)]
        for a, b in (("Stufe", f"{stufe} nach DIN 276"), ("Planstand", ps), ("Kostenstand", _monat(d.get("kostenstand"))),
                     ("Mengen", "aus der Bauteil-Liste des Gebäudemodells"),
                     ("Preise", "Bauteil-Baukasten des Büros (von – mittel – bis), Preisstand und Faktor der Baudaten" + (f"; {hand} Preis{'e' if hand != 1 else ''} von Hand" if hand else "")),
                     ("Zuschläge", f"Unvorhergesehenes {zahl(d['risiko'], 0)} %, Baunebenkosten " + (eur(d["nk_fest"], True) + " fest" if d.get("nk_fest") is not None else f"{zahl(d['nk'], 0)} %")
                      + f", Umsatzsteuer {zahl(mw, 0)} %"), ("Beträge", basis + (f", gerundet auf {rnd:,} €".replace(",", ".") if rnd else ""))):
            el.append(Paragraph(f"<b>{X(a)}:</b> {X(b)}", S["p"]))
        story += [CondPageBreak(50 * mm)] + el
    BF = befunde(d)
    if "aenderungen" in teile and BF:   # Anhang: was beim Einlesen umgesetzt, ergänzt oder aufgefallen ist (XL-5 A)
        X_ = d.get("excel") or {}
        rows = [["Art", "KG", "Hinweis"]] + [[Paragraph(X(ART.get(b["art"], b["art"] or "")), S["c"]), b["kg"] or "", Paragraph(X(b["text"] or ""), S["c"])] for b in BF]
        story += [PageBreak(), Paragraph("Anhang: Änderungen beim Einlesen", S["h2"]),
                  Paragraph(X(f"Aus „{X_.get('datei', '')}“, eingelesen am {_de(X_.get('am'))}{' von ' + X_['von'] if X_.get('von') else ''}. "
                              "Die Liste rechnete nach DIN 276-1:2008-12; die Kostengruppen sind auf DIN 276:2018-12 umgesetzt."), S["p"]), Spacer(1, 3 * mm),
                  tabelle(rows, [34 * mm, 12 * mm, W - 46 * mm])]
    buf = io.BytesIO()
    doc = BaseDocTemplate(buf, pagesize=layout.seite_pt(LAY), title=f"{stufe} {r['name']}", author=office or "Bauplattform")
    doc.addPageTemplates(tpl)
    doc.build(story or [Spacer(1, 1)])
    return buf.getvalue()


def _de(s):
    m = re.match(r"(\d{4})-(\d\d)-(\d\d)", str(s or ""))
    return f"{m.group(3)}.{m.group(2)}.{m.group(1)}" if m else ""


def _monat(s):
    m = re.match(r"(\d{4})-(\d\d)", str(s or ""))
    return f"{m.group(2)}/{m.group(1)}" if m else "–"


def layout_werte(c, r, p, stufe):
    adr = ", ".join(x for x in ((p["street"] or "") if p else "", " ".join(y for y in ((p["zip"] or "") if p else "", (p["city"] or "") if p else "") if y)) if x)
    W = {**layout.buero_werte(c), "bearbeiter": C.full_name(g.user) if getattr(g, "user", None) else "",   # Büro, Absender, Fußzeile, Datum (bpcore/layout.py)
         "projekt": p["name"] if p else "", "bauvorhaben": ", ".join(v for v in ((p["name"] if p else ""), adr if adr and p and adr not in p["name"] else "") if v),
         "bauherr": (p["client"] or "") if p else "", "dokument": stufe, "untertitel": " · ".join(x for x in ((p["name"] if p else ""), r["name"]) if x),
         "lv": f"{stufe} – {r['name']}", "gewerk": "", "auftragnehmer": ""}
    W.update({k: v for k, v in layout.eigene_werte(c, r["project_id"]).items() if v or k not in W})
    return W


@app.get("/api/bk/<int:i>/bericht.pdf")
def bk_bericht(i):
    teile = [t for t in (request.args.get("teile") or ",".join(k for k, _, an in TEILE if an)).split(",") if t in dict((k, n) for k, n, _ in TEILE)]
    opt = _opt()
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        try:
            pdf = bericht(c, r, teile, opt)
        except Exception as e:   # Grund anzeigen statt stillem Fehler 500
            app.logger.exception("Kosten-PDF")
            return jsonify(error=f"Der Bericht konnte nicht erstellt werden ({type(e).__name__}: {str(e)[:200]})."), 500
    C.audit(g.user["name"], "baukosten", "Kosten-PDF erstellt", f"{r['name']} · Ebene {opt.get('tiefe')} · {', '.join(teile)}")
    from urllib.parse import quote
    fn = re.sub(r"[\\/:*?\"<>|]+", "_", f"{STUFE_NAME.get(r['stufe'], 'Kosten')} {r['name']}.pdf")
    return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(fn)}"})
