"""Baukosten – PDF für den Bauherrn: Kostentabelle nach DIN 276 bis zur gewählten Gliederungstiefe, Bericht mit wählbaren Teilen
(Deckblatt, Zusammenfassung, Genauigkeit, Kosten, Raumtypen, Raumbuch, Mittelabfluss, Erläuterungen, Quellen, Pläne).
Teil der App „Baukosten“ (baukosten.py lädt dieses Modul am Ende; kg_rows, build_report und TEILE stehen dort weiter zur Verfügung)."""
import io
import re
from datetime import date

from flask import Response, g, jsonify, request

from bpcore import db
import common as C
from baukosten import (DIN, KG2, STUFE_EBENE, STUFE_NAME, _bt_betrag, _j, _num, _out, _row, app, calc, clean_data, flow,   # noqa: F401
                       genauigkeit, preview_png, quellen)

def kg_rows(d, cal, depth):
    """Kosten nach DIN 276 bis zur gewählten Gliederungstiefe (1 = 100er, 2 = 10er, 3 = Einzelpositionen).
    Ergebnis: Liste von (Ebene, KG, Bezeichnung, Betrag oder None = offen)."""
    leaves = []   # (KG dreistellig, Bezeichnung, Betrag | None)
    if cal.get("kg2"):   # Kostenberechnung mit Bauteilen: je Gruppe der 2. Ebene Bauteile oder Kennwert-Anteil
        for k, x in sorted(cal["kg2"].items()):
            if x["quelle"] == "bauteile":
                for b in d["bauteile"]:
                    if b["kg"][:2] + "0" == k:
                        leaves.append((b["kg"], b["name"] + (f" – {b['mat']}" if b["mat"] else "") + f" ({str(round(b['menge'], 2)).replace('.', ',')} {b['einheit']})", _bt_betrag(b)))
            elif x["wert"]:
                leaves.append((k, "aus Kennwerten (noch ohne Bauteile)", x["wert"]))
    for main, total in ((("300", cal["kg300"]), ("400", cal["kg400"])) if not cal.get("kg2") else ()):
        rest = 100.0
        for k in KG2:
            if k[0] == main[0] and d["kg2"].get(k):
                leaves.append((k, f"aus Kennwerten ({d['kg2'][k]:g} % von KG {main})".replace(".", ","), total * d["kg2"][k] / 100)); rest -= d["kg2"][k]
        if total and rest > 0.01:
            leaves.append((main, "nicht weiter aufgeteilt (Kennwerte je Raumtyp)" if rest > 99.99 else "nicht zugeordneter Rest", total * rest / 100))
    for it in d["items"]:
        kg = re.sub(r"\D", "", it["kg"])[:3]
        if len(kg) == 3 and kg != "700":
            leaves.append((kg, (it["name"] or DIN.get(kg, "")) + (" (geschätzt)" if it.get("est") else ""), it["amount"]))
    leaves.append(("700", "Baunebenkosten", cal["nk"]))

    def tot(xs):
        return None if xs and all(x[2] is None for x in xs) else sum(x[2] or 0 for x in xs)

    rows = []
    for g1 in sorted({k[0] + "00" for k, _, _ in leaves}):
        L1 = [x for x in leaves if x[0][0] == g1[0]]
        rows.append((1, g1, DIN.get(g1, ""), tot(L1), any(x[2] is None for x in L1)))
        if depth < 2 or (len(L1) == 1 and L1[0][0] == g1):   # nur ein Betrag für die ganze Gruppe: keine Unterzeilen
            continue
        for g2 in sorted({x[0][:2] + "0" for x in L1 if x[0] != g1}):
            L2 = [x for x in L1 if x[0][:2] == g2[:2] and x[0] != g1]
            rows.append((2, g2, DIN.get(g2, L2[0][1]), tot(L2), any(x[2] is None for x in L2)))
            if depth >= 3 and (len(L2) > 1 or L2[0][0] != g2):
                for x in L2:
                    rows.append((3, x[0] if x[0] != g2 else "", x[1], x[2], x[2] is None))
        for x in L1:   # Beträge direkt auf der 1. Ebene (z. B. KG 300 nicht weiter aufgeteilt)
            if x[0] == g1:
                rows.append((2, "", x[1], x[2], x[2] is None))
    # Positionen ohne gültige Kostengruppe (z. B. „+ Position“ ohne KG): zählen in der Gesamtsumme mit, also auch hier zeigen
    ohne = [it for it in d["items"] if len(re.sub(r"\D", "", it["kg"] or "")[:3]) != 3]
    if ohne:
        L = [("", it["name"] or "Position", it["amount"]) for it in ohne]
        rows.append((1, "", "Ohne Kostengruppe", tot(L), any(x[2] is None for x in L)))
        if depth >= 2:
            for x in L:
                rows.append((2, "", x[1], x[2], x[2] is None))
    return rows


def _kurz():
    try:
        with db.tx() as c:
            return C.kurzname(c)
    except Exception:   # ohne Kurznamen drucken – kein Grund abzubrechen
        return ""


def _office():
    try:
        with db.tx() as c:
            r = c.execute("SELECT value FROM settings WHERE key='office_name'").fetchone()
        return (r["value"] if r else "") or ""
    except Exception:   # ohne Büronamen drucken – kein Grund abzubrechen
        return ""


def build_report(c, r, opt):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle)
    from reportlab.graphics.shapes import Drawing, Rect, String, Line
    from xml.sax.saxutils import escape as X

    d = clean_data(_j(r["data"], {}), c)
    cal = calc(d)
    o = _out(c, r, False)
    parts = opt["teile"]
    mw = opt["mwst"] / 100
    fac = 1 + mw if opt["brutto"] else 1
    rnd = opt["runden"]
    basis = f"brutto inkl. {opt['mwst']:g} % MwSt." if opt["brutto"] else "netto zzgl. MwSt."

    def eur(v, raw=False, kw=False):
        if v is None:
            return "offen"
        v = v * (1 if raw else fac)
        if rnd and not kw:   # Kennwerte je m² nicht runden
            v = round(v / rnd) * rnd
        return f"{v:,.0f} €".replace(",", ".")

    def m2(v):
        return f"{v:,.2f}".replace(",", "§").replace(".", ",").replace("§", ".")

    INK, MUTE, ACC, LINE, BAND = colors.HexColor("#1c1c1a"), colors.HexColor("#5e5b55"), colors.HexColor("#9c4a22"), colors.HexColor("#d9d6cf"), colors.HexColor("#f4f3ef")
    S = {
        "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=22, leading=27, textColor=INK, spaceAfter=4),
        "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13.5, leading=17, textColor=INK, spaceBefore=6, spaceAfter=8),
        "p": ParagraphStyle("p", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=INK),
        "m": ParagraphStyle("m", fontName="Helvetica", fontSize=8.5, leading=11.5, textColor=MUTE),
        "big": ParagraphStyle("big", fontName="Helvetica-Bold", fontSize=26, leading=30, textColor=INK),
        "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=9, leading=11.5, textColor=INK),
    }
    office = _office()
    kurz = _kurz() or office
    proj = o.get("project") or {}
    title = r["name"]
    stufe = STUFE_NAME.get(r["stufe"], r["stufe"])
    if opt.get("vorl"):   # gedruckt, obwohl die Daten für diese Stufe noch nicht reichen
        stufe += " (vorläufig)"
    today = date.today().strftime("%d.%m.%Y")
    W = A4[0] - 36 * mm

    def table(data, widths, num_cols=(), head=True, bold_rows=(), level=None):
        t = Table(data, colWidths=widths, repeatRows=1 if head else 0)
        st = [("FONT", (0, 0), (-1, -1), "Helvetica", 9), ("TEXTCOLOR", (0, 0), (-1, -1), INK),
              ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
              ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE)]
        if head:
            st += [("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8.5), ("TEXTCOLOR", (0, 0), (-1, 0), MUTE), ("LINEBELOW", (0, 0), (-1, 0), 0.8, INK)]
        for ci in num_cols:
            st.append(("ALIGN", (ci, 0), (ci, -1), "RIGHT"))
        for ri in bold_rows:
            st += [("FONT", (0, ri), (-1, ri), "Helvetica-Bold", 9.5), ("BACKGROUND", (0, ri), (-1, ri), BAND)]
        t.setStyle(TableStyle(st))
        return t

    story = []
    logo = C.print_logo()

    # Deckblatt
    if "deckblatt" in parts:
        if logo:
            try:
                from reportlab.lib.utils import ImageReader
                ImageReader(io.BytesIO(logo)).getSize()   # nicht lesbares Logo erst beim Bauen des PDFs zu bemerken, ließe alles scheitern
                story += [Image(io.BytesIO(logo), width=28 * mm, height=28 * mm, kind="proportional", hAlign="RIGHT"), Spacer(1, 18 * mm)]
            except Exception:   # Logo nicht lesbar: Deckblatt ohne Logo
                story.append(Spacer(1, 46 * mm))
        else:
            story.append(Spacer(1, 46 * mm))
        story += [Paragraph(X(stufe) + " nach DIN 276", ParagraphStyle("k", parent=S["m"], fontSize=11, textColor=ACC)), Spacer(1, 4),
                  Paragraph(X(proj.get("name") or title), S["h1"])]
        if proj.get("address"):
            story.append(Paragraph(X(proj["address"]), S["p"]))
        story.append(Spacer(1, 22 * mm))
        ks = d.get("kostenstand") or ""
        rows = [["Bauherr", proj.get("client") or "—"], ["Stand", today], ["Kostenstand", f"{ks[5:7]}/{ks[:4]}" if ks else today], ["Kostenbasis", basis],
                ["Grundlage", "DIN 276:2018-12, Kostengliederung bis zur " + f"{STUFE_EBENE.get(r['stufe'], 1)}. Ebene"]]
        if office:
            rows.append(["Aufgestellt", office])
        t = Table(rows, colWidths=[40 * mm, W - 40 * mm])
        t.setStyle(TableStyle([("FONT", (0, 0), (0, -1), "Helvetica", 9), ("TEXTCOLOR", (0, 0), (0, -1), MUTE), ("FONT", (1, 0), (1, -1), "Helvetica-Bold", 10),
                               ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
        story += [t, Spacer(1, 14 * mm), Paragraph("Gesamtkosten", S["m"]), Paragraph(eur(cal["total"]), S["big"]),
                  Paragraph(basis + (f", gerundet auf {rnd:,} €".replace(",", ".") if rnd else ""), S["m"])]
        if "genauigkeit" in parts:
            kinds = [(_j(f["meta"], {}) or {}).get("kind", "") for f in c.execute("SELECT meta FROM bk_files WHERE bk_id=?", (r["id"],))]
            acc = genauigkeit(c, r, d, cal, kinds)
            story += [Spacer(1, 4), Paragraph(f"wahrscheinlich zwischen {eur(acc['low'])} und {eur(acc['high'])}", S["m"])]
        story.append(PageBreak())

    # Zusammenfassung
    if "zusammenfassung" in parts:
        story.append(Paragraph("Zusammenfassung", S["h2"]))
        rows = [["", "Betrag"], ["Bauwerk (KG 300 + 400)", eur(cal["bauwerk"])], ["Weitere Kostengruppen", eur(cal["extra"])],
                ["Baunebenkosten (KG 700)", eur(cal["nk"])]]
        if cal.get("risiko"):
            rows.append([f"Kostenrisiken ({d['risiko']:g} %)".replace(".", ",") + (f" – {d['risiko_text']}" if d.get("risiko_text") else ""), eur(cal["risiko"])])
        if opt["brutto"]:
            rows += [["Gesamt netto", eur(cal["total"], True)], [f"MwSt. {opt['mwst']:g} %", eur(cal["total"] * mw, True)], ["Gesamt brutto", eur(cal["total"] * (1 + mw), True)]]
        else:
            rows += [["Gesamt netto", eur(cal["total"])]]
        story.append(table(rows, [W - 50 * mm, 50 * mm], num_cols=(1,), bold_rows=(len(rows) - 1,)))
        story += [Spacer(1, 8), Paragraph(f"Raumfläche {m2(cal['area'])} m² · Kennwert Bauwerk {eur(cal['kw'], kw=True)} je m² Raumfläche ({'brutto' if opt['brutto'] else 'netto'})", S["m"]), Spacer(1, 14)]

    # Genauigkeit
    if "genauigkeit" in parts:
        kinds = [(_j(f["meta"], {}) or {}).get("kind", "") for f in c.execute("SELECT meta FROM bk_files WHERE bk_id=?", (r["id"],))]
        acc = genauigkeit(c, r, d, cal, kinds)
        rows = [["Einfluss", "Spanne"]] + [[Paragraph(X(f["text"]) + (f"<br/><font color='#5e5b55' size='8'>{X(f['tipp'])}</font>" if f["tipp"] else ""), S["cell"]),
                                            ("nur nach oben " if f.get("oben") else "± ") + f"{f['plus']:g} %"] for f in acc["faktoren"]]
        story += [KeepTogether([Paragraph("Genauigkeit der Kostenermittlung", S["h2"]),
                                Paragraph(f"Die Gesamtkosten liegen nach heutigem Stand wahrscheinlich zwischen <b>{eur(acc['low'])}</b> und <b>{eur(acc['high'])}</b> "
                                          f"(−{acc['lo_pct']:g} % / +{acc['hi_pct']:g} %, {X(acc['urteil'])}). Die Spanne ist nach oben größer, weil offene und unsichere Punkte "
                                          "die Kosten eher erhöhen als senken.", S["p"]), Spacer(1, 6),
                                table(rows, [W - 40 * mm, 40 * mm], num_cols=(1,))]), Spacer(1, 14)]

    # Kostengruppen
    if "kosten" in parts:
        depth = opt["tiefe"]
        rows = [["KG", "Bezeichnung", "Betrag"]]
        bold = []
        for lvl, kg, name, v, open_ in kg_rows(d, cal, depth):
            ind = "    " * (lvl - 1)
            rows.append([kg, Paragraph(X(ind) + ("<b>" if lvl == 1 else "") + X(name) + ("</b>" if lvl == 1 else "") + (" <font color='#9c4a22'>(teilweise offen)</font>" if open_ and v is not None else ""), S["cell"]), eur(v)])
            if lvl == 1:
                bold.append(len(rows) - 1)
        if cal.get("risiko"):
            rows.append(["", Paragraph(X(f"Kostenrisiken, gesondert ausgewiesen ({d['risiko']:g} %)".replace(".", ",") + (f": {d['risiko_text']}" if d.get("risiko_text") else "")), S["cell"]), eur(cal["risiko"])])
        rows.append(["", Paragraph("<b>Gesamt</b>", S["cell"]), eur(cal["total"])])
        story += [Paragraph(f"Kosten nach DIN 276 – {depth}. Gliederungsebene", S["h2"]), table(rows, [16 * mm, W - 56 * mm, 40 * mm], num_cols=(2,), bold_rows=bold + [len(rows) - 1]),
                  Spacer(1, 4), Paragraph(basis + (" · gerundet" if rnd else "") + ". „offen“ = noch nicht ermittelt, in der Summe nicht enthalten.", S["m"]), Spacer(1, 14)]

    # Raumtypen / Kennwerte
    if "raumtypen" in parts:
        rows = [["Raumtyp", "Räume", "Fläche m²", "€ / m²", "Kosten"]]
        for t in cal["types"]:
            if t["n"]:
                rows.append([t["label"], str(t["n"]), m2(t["area"]) + (f" ({m2(t['gew'])} gew.)" if abs(t.get("gew", t["area"]) - t["area"]) > 0.005 else ""),
                             eur(t["kw"], kw=True), eur(t["sum"])])
        J = cal["justage"]
        ar = cal["area"] or 1
        rows.append(["Summe Kennwerte", str(len(d["rooms"])), m2(cal["area"]), eur(cal["kw_summe"] / ar, kw=True), eur(cal["kw_summe"])])
        if abs(J["faktor"] - 1) > 1e-6:
            rows.append([f"Justage: Regionalfaktor {J['region']:g} % × Preisstand {J['preis']:g} %".replace(".", ","), "", "", f"× {J['faktor']:.3f}".replace(".", ","), eur(cal["bauwerk_kw"])])
        if cal["kg2"]:
            rows.append(["Bauwerk mit Bauteilen (Kostenberechnung)", "", "", eur(cal["bauwerk"] / ar, kw=True), eur(cal["bauwerk"])])
        story += [KeepTogether([Paragraph("Kosten nach Nutzung (Kennwerte)", S["h2"]), table(rows, [W - 110 * mm, 18 * mm, 28 * mm, 28 * mm, 36 * mm], num_cols=(1, 2, 3, 4), bold_rows=(len(rows) - 1,))]), Spacer(1, 14)]

    # Raumbuch
    if "raumbuch" in parts and d["rooms"]:
        names = dict((k, v["label"]) for k, v in d["types"].items())
        rows = [["Nr.", "Raum", "Nutzung", "Fläche m²"]] + [[x["nr"], Paragraph(X(x["name"]), S["cell"]), names.get(x["typ"], ""), m2(x["area"])]
                                                          for x in sorted(d["rooms"], key=lambda x: (x["floor"], x["nr"]))]
        rows.append(["", "Summe", "", m2(cal["area"])])
        story += [Paragraph("Raumbuch", S["h2"]), table(rows, [16 * mm, W - 90 * mm, 50 * mm, 24 * mm], num_cols=(3,), bold_rows=(len(rows) - 1,)), Spacer(1, 14)]

    # Mittelabfluss
    if "mittelabfluss" in parts:
        fl = flow(c, r, d, cal)
        story.append(Paragraph("Mittelabfluss", S["h2"]))
        if not fl["ok"]:
            story += [Paragraph(X(fl["why"]), S["m"]), Spacer(1, 14)]
        else:
            M = fl["months"]
            dr = Drawing(W, 150)
            mx = max(m["idx"] for m in M) or 1
            bw = (W - 20) / max(1, len(M))
            for i, m in enumerate(M):
                h = m["idx"] / mx * 110
                dr.add(Rect(10 + i * bw + bw * 0.18, 24, bw * 0.64, h, fillColor=ACC, strokeColor=None))
                if len(M) <= 18 or i % 2 == 0:
                    dr.add(String(10 + i * bw + bw / 2, 10, ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][int(m["ym"][5:]) - 1] + " " + m["ym"][2:4],
                                  fontName="Helvetica", fontSize=7, fillColor=MUTE, textAnchor="middle"))
            dr.add(Line(10, 24, W - 10, 24, strokeColor=LINE, strokeWidth=0.6))
            mon = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
            rows = [["Monat", "Betrag", "kumuliert"]] + [[f"{mon[int(m['ym'][5:]) - 1]} {m['ym'][:4]}", eur(m["idx"]), eur(m["cum_idx"])] for m in M]
            rows.append(["Summe", eur(fl["total_idx"]), ""])
            story += [Paragraph(f"Verteilung über den Bauzeitenplan „{X(fl['plan'])}“ ({date.fromisoformat(fl['start']).strftime('%d.%m.%Y')} bis {date.fromisoformat(fl['end']).strftime('%d.%m.%Y')}), "
                                f"inkl. Baupreisindex {d['rate']:g} % p. a.; ohne Baunebenkosten.", S["m"]), Spacer(1, 6), dr, Spacer(1, 6),
                      table(rows, [W - 90 * mm, 45 * mm, 45 * mm], num_cols=(1, 2), bold_rows=(len(rows) - 1,)), Spacer(1, 14)]

    # Erläuterungen
    if "erlaeuterungen" in parts:
        story.append(Paragraph("Erläuterungen und Annahmen", S["h2"]))
        if d["notes"]:
            for para in d["notes"].split("\n\n"):
                story += [Paragraph(X(para).replace("\n", "<br/>"), S["p"]), Spacer(1, 5)]
        auto = [f"Kostenstufe: {stufe}. Kostenbasis: {basis}" + (f", Beträge gerundet auf {rnd:,} €".replace(",", ".") if rnd else "") + "."]
        offen = [f"KG {i['kg']} {i['name']}" for i in d["items"] if i["amount"] is None]
        if offen:
            auto.append("Noch nicht ermittelt und in der Summe nicht enthalten: " + ", ".join(offen) + ".")
        auto.append(f"Baunebenkosten pauschal mit {d['nk']:g} % angesetzt.")
        for it in d["items"]:
            if it.get("est"):
                auto.append(f"KG {it['kg']} {it['name']} geschätzt ({it['est']['src']}): Spanne {eur(it['est']['low'])} bis {eur(it['est']['high'])}. {it['est']['basis']}")
        kinds = [(_j(f["meta"], {}) or {}).get("kind") for f in c.execute("SELECT meta FROM bk_files WHERE bk_id=?", (r["id"],))]
        if "Grundriss" in kinds:
            auto.append("Flächen aus den Raumstempeln der Grundrisse (Vorentwurf) übernommen.")
        for a in auto:
            story += [Paragraph("• " + X(a), S["p"]), Spacer(1, 3)]
        story.append(Spacer(1, 14))

    if "quellen" in parts:
        story.append(Paragraph("Grundlagen und Quellen", S["h2"]))
        story += [Paragraph("Woher Flächen, Kennwerte, Anteile und Preise dieser Kostenermittlung stammen.", S["m"]), Spacer(1, 6)]
        for q in quellen(c, r, d, cal):
            story += [Paragraph(f"<b>{X(q['t'])}</b><br/>{X(q['x'])}", S["p"]), Spacer(1, 6)]
        story.append(Spacer(1, 8))

    # Pläne
    if "plaene" in parts:
        files = c.execute("SELECT id, name, data FROM bk_files WHERE bk_id=? ORDER BY id", (r["id"],)).fetchall()
        for f in files:
            try:
                png = preview_png(bytes(f["data"]), width=1800)
            except Exception:   # Plan-Datei ohne Vorschau (kein PDF/Bild): im Ausdruck weglassen
                continue
            from PIL import Image as PI
            w, h = PI.open(io.BytesIO(png)).size
            ih = min(A4[1] - 60 * mm, W * h / w)
            story += [PageBreak(), Paragraph("Planunterlage: " + X(f["name"]), S["h2"]), Image(io.BytesIO(png), width=ih * w / h, height=ih)]

    buf = io.BytesIO()

    def frame(cv, doc):
        cv.saveState()
        cv.setFont("Helvetica", 7.5); cv.setFillColor(MUTE)
        cv.drawString(18 * mm, 10 * mm, f"{proj.get('name') or title} · {stufe} · Stand {today}")
        cv.drawRightString(A4[0] - 18 * mm, 10 * mm, (kurz + " · " if kurz else "") + f"Seite {doc.page}")
        cover = doc.page == 1 and "deckblatt" in parts
        if not cover:   # Logo in der Kopfzeile jeder Seite (das Deckblatt zeigt es groß)
            C.draw_logo(cv, A4[0] - 18 * mm, A4[1] - 6 * mm, 11 * mm, 45 * mm)
        cv.setStrokeColor(ACC); cv.setLineWidth(1.2); cv.line(18 * mm, A4[1] - 19 * mm, A4[0] - 18 * mm, A4[1] - 19 * mm)
        cv.restoreState()

    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=24 * mm, bottomMargin=18 * mm,
                            title=f"{stufe} – {proj.get('name') or title}", author=office or "Bauplattform")
    if not story:
        story = [Paragraph("Keine Inhalte gewählt.", S["p"])]
    doc.build(story, onFirstPage=frame, onLaterPages=frame)
    return buf.getvalue()


TEILE = ("deckblatt", "zusammenfassung", "genauigkeit", "kosten", "raumtypen", "raumbuch", "mittelabfluss", "erlaeuterungen", "quellen", "plaene")


@app.get("/api/bk/<int:i>/bericht.pdf")
def bericht(i):
    a = request.args
    opt = {"teile": [t for t in (a.get("teile") or ",".join(TEILE)).split(",") if t in TEILE],
           "tiefe": int(_num(a.get("tiefe"), 2, 1, 3)), "brutto": a.get("brutto") == "1", "mwst": _num(a.get("mwst"), 19, 0, 30),
           "runden": int(a.get("runden")) if a.get("runden") in ("0", "100", "1000") else 0, "vorl": a.get("vorl") == "1"}
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        try:
            pdf = build_report(c, r, opt)
        except Exception as e:   # Grund anzeigen statt stillem Fehler 500
            app.logger.exception("Kosten-PDF")
            return jsonify(error=f"{type(e).__name__}: {str(e)[:200]}"), 500
    C.audit(g.user["name"], "export", "Kosten-PDF erstellt", f"{r['name']} · Ebene {opt['tiefe']} · {', '.join(opt['teile'])}")
    from urllib.parse import quote
    fn = re.sub(r"[\\/:*?\"<>|]+", "_", f"{STUFE_NAME.get(r['stufe'], 'Kosten')} {r['name']}.pdf")
    return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(fn)}"})
