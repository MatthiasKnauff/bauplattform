"""LV-Druck: Deckblatt, Seite „Angaben zur Ausschreibung“, Vorbemerkungen und Schluss – nach dem Muster des Büros (LV A481, 17.11.2026).

Aus ava.py ausgelagert. Was es zu einem LV schon gibt, steht auf den ersten zwei Seiten:
  LV- & Auftragsdaten (data.meta: Abgabe, Abgabeort, Bindefrist, Vergabenummer, Ausführung, Angebotsaufforderung, Vereinbarungen,
  Vertragsbedingungen – ohne eigene die Vorgaben des Büros), Projekt (Name, Anschrift, Bauherr:in, Bauleitung), Büro (Logo, Anschrift,
  Telefon, E-Mail) und als Projektbild das Titelbild aus dem Bauherrenportal (Foto oder Zeichnung).
Die Texte, die der Druck-Editor bearbeitet (Titel, Bauvorhaben, Bauherr, Aufsteller, Datum, Hinweis), bleiben im Entwurf Formularfelder.
"""
import io
import re
from datetime import date

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import CondPageBreak, KeepTogether, PageBreak, Paragraph, Spacer, Table, TableStyle
from xml.sax.saxutils import escape

from bpcore import stammdaten

X = lambda t: escape(str(t or "")).replace("\n", "<br/>")   # noqa: E731


def _de(v):
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", str(v or ""))
    return f"{m.group(3)}.{m.group(2)}.{m.group(1)}" if m else str(v or "")


def daten(c, r, P, F, user_name=""):
    """Alles, was die ersten zwei Seiten zeigen – aus LV-Daten, Projekt und Büro."""
    import ava_vergabe
    meta = dict((P["data"] or {}).get("meta") or {})
    if not any(str(meta.get("vb_" + k) or "").strip() for k in ava_vergabe.VB if k != "einbehalt_abl"):   # keine eigenen: Vorgaben des Büros
        G = ava_vergabe.vorgaben(c)
        meta.update({"vb_" + k: G[k] for k in ava_vergabe.VB if k != "einbehalt_abl" and G.get(k)})
    S = {x["key"]: x["value"] or "" for x in c.execute("SELECT key, value FROM settings WHERE key='office_name' OR key LIKE 'co\\_%'").fetchall()}
    p = c.execute("SELECT id, name, street, zip, city, client, leaders FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
    leit = []
    if p:
        import json
        try:
            ids = [int(x) for x in json.loads(p["leaders"] or "[]")]
        except (ValueError, TypeError):
            ids = []
        if ids:
            for u in c.execute("SELECT * FROM users WHERE id = ANY(?)", (ids,)).fetchall():
                leit.append(" ".join(x for x in (u["vorname"] or "", u["nachname"] or "") if x) or u["name"])
    bild = None
    if p:
        try:
            from bpcore import bauherren_kopf
            bild = bauherren_kopf.titelbild(c, p["id"])
        except Exception:   # noqa: BLE001 – ohne Projektbild drucken
            bild = None
    pm = re.match(r"\s*([A-Za-z]{0,3}\d[\w.]*)\s*(.*)", (p["name"] if p else P.get("projekt")) or "")
    verein = meta.get("vereinbarungen") or []
    verein = [str(x.get("name") if isinstance(x, dict) else x) for x in (verein if isinstance(verein, list) else str(verein).split("\n")) if str(x).strip()]
    vb = [(lab, str(meta.get(k) or "")) for k, lab, *_ in stammdaten.LV[2][1] if k != "vb_einbehalt_abl" and str(meta.get(k) or "").strip()]
    return {"meta": meta, "S": S, "leitung": leit, "bild": bild, "projektnr": pm.group(1) if pm else "", "projektname": (pm.group(2) if pm else "") or (p["name"] if p else ""),
            "vereinbarungen": verein, "vb": vb, "ich": user_name, "bauherr_text": F.get("Bauherr") or (p["client"] if p else "") or ""}


def deckblatt(cv, ps, D, F, FN, LV, ink, mute, akzent, logo, entwurf, feld_entwurf):
    """Deckblatt: links Projektbild, Logo und Büro – rechts die Kästen mit den Eckdaten (wie LV A481)."""
    M, S = D["meta"], D["S"]
    L, top = 20 * mm, ps[1] - 18 * mm
    xr, wr = 108 * mm, ps[0] - 108 * mm - 15 * mm
    linie = colors.HexColor("#9c9a94")

    def umbruch(t, fnt, size, w):
        out = []
        for z in str(t or "").split("\n"):
            cur = ""
            for wd in z.split(" "):
                tt = (cur + " " + wd).strip()
                if stringWidth(tt, fnt, size) > w and cur:
                    out.append(cur); cur = wd
                else:
                    cur = tt
            out.append(cur)
        return out

    def kasten(lab, wert, x, y, w, h, feld=None, size=10):   # y = Oberkante
        cv.setStrokeColor(linie); cv.setLineWidth(0.6); cv.roundRect(x, y - h, w, h, 1.5 * mm, stroke=1, fill=0)
        cv.setFont(FN["n"], 6.5); cv.setFillColor(mute); cv.drawString(x + 2 * mm, y - 3.2 * mm, lab)
        if feld and entwurf:
            feld_entwurf(feld, x + 1.5 * mm, y - h + 1 * mm, w - 3 * mm, h - 5 * mm, size)
            return
        cv.setFont(FN["b"], size); cv.setFillColor(ink)
        yy = y - 4 * mm - size * 1.1
        for z in umbruch(wert, FN["b"], size, w - 4 * mm):
            if yy < y - h + 1.2 * mm:
                break
            cv.drawString(x + 2 * mm, yy, z); yy -= size * 1.22

    # rechts: Titel und Kästen
    cv.setFont(FN["b"], 21); cv.setFillColor(ink); cv.drawString(xr, top - 8 * mm, (F.get("Titel") or "Leistungsverzeichnis")[:40])
    cv.setFont(FN["n"], 8); cv.setFillColor(mute); cv.drawString(xr, top - 13 * mm, "Leistungsbeschreibung" + (f" · Vergabe-Nr. {M['vergabenr']}" if M.get("vergabenr") else ""))
    cv.setStrokeColor(akzent); cv.setLineWidth(1.4); cv.line(xr, top - 16 * mm, xr + 40 * mm, top - 16 * mm)
    y, g, h2 = top - 21 * mm, 3.2 * mm, (wr - 2 * mm) / 2
    reihe = [("Projekt", f"{D['projektnr']}\n{D['projektname']}".strip(), 17, None),
             ("Bauvorhaben", F.get("Bauvorhaben") or "", 22, "Bauvorhaben"),
             ("Leistung (LV)", f"{LV['nr']}\n{LV['name']}", 17, None)]
    for lab, w_, h, fe in reihe:
        kasten(lab, w_, xr, y, wr, h * mm, fe); y -= h * mm + g
    for (la, va), (lb, vb_) in ((("Ausführungsbeginn", _de(M.get("ausf_beginn")) or "k. A."), ("Ausführungsende", _de(M.get("ausf_ende")) or "k. A.")),):
        kasten(la, va, xr, y, h2, 11 * mm); kasten(lb, vb_, xr + h2 + 2 * mm, y, h2, 11 * mm); y -= 11 * mm + g
    kasten("Angebotsaufforderung", M.get("aufforderung") or stammdaten.AUFFORDERUNG[0], xr, y, wr, 19 * mm, size=8.5); y -= 19 * mm + g
    kasten("Abgabetermin", _de(M.get("abgabe")) or "k. A.", xr, y, h2, 11 * mm); kasten("Abgabezeit", M.get("abgabe_zeit") or "k. A.", xr + h2 + 2 * mm, y, h2, 11 * mm); y -= 11 * mm + g
    ort = M.get("abgabeort") or ""
    if not ort or ort.startswith("im Büro der Ausschreibenden"):
        ort = "\n".join(v for v in (S.get("office_name"), S.get("co_street"), " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x)) if v) or ort
    kasten("Abgabeort", ort, xr, y, wr, 17 * mm, size=9); y -= 17 * mm + g
    kasten("Zuschlags- und Bindefrist", _de(M.get("bindefrist")) or "k. A.", xr, y, h2, 11 * mm)
    kasten("Eröffnung (Submission)", _de(M.get("eroeffnung")) or "k. A.", xr + h2 + 2 * mm, y, h2, 11 * mm); y -= 11 * mm + g
    kasten("MwSt.", "19,00 %", xr, y, h2, 11 * mm); kasten("Währung", "EUR", xr + h2 + 2 * mm, y, h2, 11 * mm); y -= 11 * mm + g

    # links: Projektbild, Logo, Büro
    yl = top
    if D["bild"]:
        try:
            ir = ImageReader(io.BytesIO(D["bild"])); iw, ih = ir.getSize(); bw = 78 * mm; bh = min(62 * mm, bw * ih / iw); bw = bh * iw / ih
            cv.drawImage(ir, L, yl - bh, bw, bh, mask="auto"); cv.setStrokeColor(linie); cv.setLineWidth(0.5); cv.rect(L, yl - bh, bw, bh)
            yl -= bh + 14 * mm
        except Exception:   # noqa: BLE001 – Bild nicht lesbar: ohne
            pass
    yl = min(yl, ps[1] * 0.62)
    if logo:
        try:
            ir = ImageReader(io.BytesIO(logo)); iw, ih = ir.getSize(); lw = 66 * mm; lh = min(34 * mm, lw * ih / iw); lw = lh * iw / ih
            cv.drawImage(ir, L, yl - lh, lw, lh, mask="auto"); yl -= lh + 6 * mm
        except Exception:   # noqa: BLE001
            pass
    cv.setFont(FN["n"], 6.5); cv.setFillColor(mute); cv.drawString(L, yl, "Planverfasser / Ausschreibung"); yl -= 4.5 * mm
    if entwurf:
        feld_entwurf("Aufsteller", L - 1 * mm, yl - 26 * mm, 78 * mm, 28 * mm, 9.5)
        yl -= 28 * mm
    else:
        cv.setFillColor(ink)
        for k, z in enumerate((F.get("Aufsteller") or "").split("\n")):
            cv.setFont(FN["b"] if k == 0 else FN["n"], 9.5)
            for zz in umbruch(z, FN["n"], 9.5, 78 * mm):
                cv.drawString(L, yl, zz); yl -= 4.6 * mm
    yl -= 2 * mm
    cv.setFont(FN["n"], 9); cv.setFillColor(ink)
    for z in (f"Tel.: {S['co_phone']}" if S.get("co_phone") else "", S.get("co_email") or "", S.get("co_web") or ""):
        if z:
            cv.drawString(L, yl, z); yl -= 4.4 * mm
    if F.get("Bauherr"):
        yl -= 6 * mm; cv.setFont(FN["n"], 6.5); cv.setFillColor(mute); cv.drawString(L, yl, "Bauherr:in"); yl -= 4.5 * mm
        if entwurf:
            feld_entwurf("Bauherr", L - 1 * mm, yl - 16 * mm, 78 * mm, 18 * mm, 9.5)
        else:
            cv.setFont(FN["n"], 9.5); cv.setFillColor(ink)
            for z in F["Bauherr"].split("\n")[:4]:
                cv.drawString(L, yl, z[:60]); yl -= 4.6 * mm
    if F.get("Hinweis") or entwurf:
        if entwurf:
            feld_entwurf("Hinweis", L - 1 * mm, 26 * mm, 80 * mm, 22 * mm, 9)
        else:
            cv.setFont(FN["n"], 9); cv.setFillColor(ink); yy = 44 * mm
            for z in umbruch(F["Hinweis"], FN["n"], 9, 80 * mm)[:5]:
                cv.drawString(L, yy, z); yy -= 4.3 * mm
    cv.setFont(FN["n"], 8.5); cv.setFillColor(mute); cv.drawRightString(ps[0] - 15 * mm, 14 * mm, f"Stand {F.get('Datum') or date.today().strftime('%d.%m.%Y')}")


def angaben(D, F, LV, FN, W, fs, ink, mute, band, akzent, preise=None):
    """Seite 2: Projekt, Leistung, Beteiligte, Ausführung, Vertragsbedingungen, Hinweise und die Angebotssumme mit Unterschriften."""
    M, S = D["meta"], D["S"]
    lab = ParagraphStyle("al", fontName=FN["n"], fontSize=6.5, leading=8, textColor=mute)
    w = ParagraphStyle("aw", fontName=FN["n"], fontSize=fs, leading=fs * 1.3, textColor=ink)
    wb = ParagraphStyle("awb", fontName=FN["b"], fontSize=fs + 1, leading=(fs + 1) * 1.3, textColor=ink)
    h1 = ParagraphStyle("ah1", fontName=FN["b"], fontSize=16, leading=20, textColor=ink)
    h2 = ParagraphStyle("ah2", fontName=FN["b"], fontSize=12, leading=15, textColor=ink)
    linie = colors.HexColor("#9c9a94")
    zelle = lambda l_, v, st=w: [Paragraph(X(l_), lab), Paragraph(X(v), st)]   # noqa: E731

    def block(rows, breiten):
        t = Table(rows, colWidths=breiten)
        t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, linie), ("LINEBELOW", (0, 0), (-1, -2), 0.4, linie), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5), ("LEFTPADDING", (0, 0), (-1, -1), 6)]))
        return t
    buero = "\n".join(v for v in (S.get("office_name"), S.get("co_street"), " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x)) if v)
    kontakt = "\n".join(v for v in (f"Telefon {S['co_phone']}" if S.get("co_phone") else "", S.get("co_email") or "") if v)
    out = [Paragraph(X(F.get("Titel") or "Leistungsverzeichnis"), h1), Spacer(1, 2 * mm),
           block([[zelle(f"Projekt{' (' + D['projektnr'] + ')' if D['projektnr'] else ''}", D["projektname"], wb)], [zelle("Leistung (LV)", f"{LV['nr']}  {LV['name']}", wb)]], [W]),
           Spacer(1, 4 * mm)]
    b3 = [W * 0.42, W * 0.30, W * 0.28]
    rows = [[zelle("Bauvorhaben", F.get("Bauvorhaben") or "", wb), "", ""]]
    if D["bauherr_text"]:
        rows.append([zelle("Bauherr:in", D["bauherr_text"]), "", ""])
    rows.append([zelle("Planverfasser / Ausschreibung", buero), Paragraph(X(kontakt), w), [Paragraph("Ansprechpartner:in", lab), Paragraph(X(D["ich"]), w)]])
    if D["leitung"]:
        rows.append([zelle("Bauleitung", buero), Paragraph(X(kontakt), w), [Paragraph("Ansprechpartner:in", lab), Paragraph(X(", ".join(D["leitung"])), w)]])
    t = Table(rows, colWidths=b3)
    st = [("BOX", (0, 0), (-1, -1), 0.6, linie), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
          ("LEFTPADDING", (0, 0), (-1, -1), 6), ("SPAN", (0, 0), (-1, 0))]
    for k in range(len(rows) - 1):
        st.append(("LINEBELOW", (0, k), (-1, k), 0.4, linie))
    if D["bauherr_text"]:
        st.append(("SPAN", (0, 1), (-1, 1)))
    t.setStyle(TableStyle(st))
    out += [t, Spacer(1, 4 * mm)]
    ecke = [(l_, v) for l_, v in (("Vergabeart", M.get("vergabeart")), ("Vergabenummer", M.get("vergabenr")), ("Vertragsart", M.get("vertragsart")),
                                 ("Ausführung", " – ".join(x for x in (_de(M.get("ausf_beginn")), _de(M.get("ausf_ende"))) if x)),
                                 ("Angebotsabgabe", " ".join(x for x in (_de(M.get("abgabe")), M.get("abgabe_zeit") or "") if x)),
                                 ("Bindefrist", _de(M.get("bindefrist"))), ("Nebenangebote", "zugelassen" if M.get("nebenangebote") else ""),
                                 ("Austauschformat", M.get("gaeb"))) if v]
    if ecke or D["vb"]:
        z = [[zelle(a, b)] + ([zelle(*ecke[k + 1])] if k + 1 < len(ecke) else [""]) for k, (a, b) in enumerate(ecke) if k % 2 == 0]
        z += [[zelle(a, b)] + ([zelle(*D["vb"][k + 1])] if k + 1 < len(D["vb"]) else [""]) for k, (a, b) in enumerate(D["vb"]) if k % 2 == 0]
        out += [Paragraph("Ausschreibung und Vertragsbedingungen", h2), Spacer(1, 1.5 * mm), block(z, [W / 2, W / 2]), Spacer(1, 4 * mm)]
    hinweis = ("Diese Unterlagen sind vollständig auszufüllen und rechtsverbindlich zu unterschreiben. Bitte sorgen Sie für den termingerechten Eingang "
               "Ihres Angebots am Abgabeort (siehe Deckblatt)." + (f" Fragen beantworten wir gern ({S['co_email']})." if S.get("co_email") else ""))
    hz = [Paragraph(X(hinweis), w)] + [Paragraph("• " + X(v), w) for v in D["vereinbarungen"]]
    ht = Table([[hz]], colWidths=[W]); ht.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, linie), ("BACKGROUND", (0, 0), (-1, -1), band),
                                                               ("LEFTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    out += [ht, Spacer(1, 5 * mm)]
    eur = lambda v: f"{v:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".") if v is not None else "................................"   # noqa: E731
    pl = ParagraphStyle("apl", fontName=FN["b"], fontSize=fs + 1, leading=(fs + 1) * 1.4, textColor=ink)
    sm = [[Paragraph("Angebotssumme in EUR", h2), "", ""],
          [Paragraph("Angebotssumme, netto", pl), Paragraph(eur(preise), pl), ""],
          [Paragraph("zzgl. Umsatzsteuer 19 %", w), Paragraph(eur(preise * 0.19 if preise is not None else None), w), ""],
          [Paragraph("<u>Angebotssumme, brutto</u>", pl), Paragraph(eur(preise * 1.19 if preise is not None else None), pl), ""],
          ["", "", ""],
          [Paragraph("." * 70, w), "", Paragraph("." * 60, w)],
          [Paragraph("Bieter:in – Ort, Datum", lab), "", Paragraph("Ausschreibende – Ort, Datum", lab)],
          [Spacer(1, 9 * mm), "", ""],
          [Paragraph("." * 70, w), "", Paragraph("." * 60, w)],
          [Paragraph("Bieter:in – Unterschrift und Stempel", lab), "", Paragraph("Angebotssumme nachgeprüft", lab)]]
    t = Table(sm, colWidths=[W * 0.48, W * 0.04, W * 0.48])
    t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.9, ink), ("SPAN", (0, 0), (-1, 0)), ("SPAN", (1, 1), (2, 1)), ("SPAN", (1, 2), (2, 2)), ("SPAN", (1, 3), (2, 3)),
                           ("LINEBELOW", (0, 0), (-1, 0), 0.6, linie), ("BACKGROUND", (0, 0), (-1, 0), band), ("LEFTPADDING", (0, 0), (-1, -1), 7),
                           ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2), ("VALIGN", (0, 0), (-1, -1), "BOTTOM")]))
    out += [KeepTogether([t]), PageBreak()]
    return out


def vorbemerkungen(text, FN, W, fs, ink, band, akzent):
    """Vorbemerkungen kräftig: Kopfband in der Akzentfarbe, Text im Kasten, Absätze mit Abstand."""
    kopf = ParagraphStyle("vbk", fontName=FN["b"], fontSize=13, leading=16, textColor=colors.white)
    p = ParagraphStyle("vbp", fontName=FN["n"], fontSize=fs + 0.5, leading=(fs + 0.5) * 1.42, textColor=ink, spaceAfter=4)
    k = Table([[Paragraph("Vorbemerkungen", kopf)]], colWidths=[W])
    k.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), akzent), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    out = [k, Spacer(1, 3 * mm)]
    for ab in re.split(r"\n\s*\n", str(text or "")):
        if ab.strip():
            z = ab.strip().split("\n")
            if len(z) > 1 and len(z[0]) < 80 and not z[0].rstrip().endswith((".", ",")):   # erste kurze Zeile als Zwischenüberschrift
                out.append(Paragraph(f"<b>{X(z[0])}</b>", p)); z = z[1:]
            out.append(Paragraph(X("\n".join(z)), p))
    return out + [Spacer(1, 6 * mm)]


def schluss(text, FN, W, fs, ink, mute, band):
    """Bieterangaben am Ende: eigener Kasten mit Überschrift; Zeilen mit „:“ am Ende werden zu Schreiblinien mit der Beschriftung darunter."""
    h = ParagraphStyle("shh", fontName=FN["b"], fontSize=12, leading=15, textColor=ink)
    p = ParagraphStyle("shp", fontName=FN["n"], fontSize=fs + 0.5, leading=(fs + 0.5) * 1.35, textColor=ink)
    lab = ParagraphStyle("shl", fontName=FN["n"], fontSize=7, leading=9, textColor=mute)
    zeilen, leer = [[Paragraph("Erklärung der Bieterin / des Bieters", h)]], 0
    for z in str(text or "").split("\n"):
        if z.rstrip().endswith(":"):
            zeilen += [[Spacer(1, 9 * mm if leer else 6 * mm)], [Paragraph("." * 110, p)], [Paragraph(X(z.rstrip()[:-1]), lab)]]
            leer = 0
        elif z.strip():
            zeilen.append([Paragraph(X(z), p)]); leer = 0
        else:
            leer += 1
    t = Table(zeilen, colWidths=[W])
    t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.9, ink), ("BACKGROUND", (0, 0), (-1, 0), band), ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.HexColor("#9c9a94")),
                           ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 1.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
                           ("TOPPADDING", (0, 0), (-1, 0), 5), ("BOTTOMPADDING", (0, 0), (-1, 0), 6), ("BOTTOMPADDING", (0, -1), (-1, -1), 8)]))
    return [CondPageBreak(70 * mm), Spacer(1, 8 * mm), KeepTogether([t])]
