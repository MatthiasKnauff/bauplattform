"""LV-Druck: Deckblatt, Seite „Angaben zur Ausschreibung“, Vorbemerkungen und Bieterangaben – im Stil unserer Dokumente
(GO 18.11.2026, Mock „LV im Stil unserer Dokumente“: A1 B1 C1 D1) – wie Protokoll und Bauvertrag (ava_vergabe._pdf):
Titel, Kapitel mit feiner Linie, links die Beschriftung in Großbuchstaben, rechts der Wert.

  A1  Briefbogen des Büros nur unter dem Deckblatt (ava._lv_druck → briefbogen.unterlegen), ab Seite 2 das Druck-Layout (Kopf, Seitenzahl)
  B1  kein Projektbild
  C1  dazu: öffentliche:r Auftraggeber:in (Projektdaten), Zahlungsfrist, Nachweise, Nachunternehmer (Vertragsbedingungen des LV, sonst
      des Projekts, sonst die Vorgaben des Büros – ava_ebenen.aufloesen)
  D1  Angebotssumme mit Unterschrift auf Seite 2

Alles aus den LV-Daten (data.meta), den Projektdaten und den Bürodaten.

In der PDF-Vorschau bearbeiten (GO 18.11.2026, Mock „In der PDF-Vorschau bearbeiten“: PV-A1 B1 C1): im Entwurf liegt über jedem Wert, der aus
einem Feld kommt, ein unsichtbarer Link https://bauplattform.invalid/<ziel> – „feld/<Name>“ (Text des Ausdrucks: Titel, Bauvorhaben, Bauherr,
Aufsteller, Hinweis, Vorbemerkungen, Schlusstext), „ev/<schlüssel>[,<schlüssel>]“ (Ausschreibungsdaten: LV, sonst Projekt, sonst Büro),
„edit/<Position>/<kurz|lang>“. Die Vorschau (ava-werkzeuge.js) legt darüber die Rahmen und öffnet beim Klick genau dieses Feld.
Keine Formularfelder mehr (die gelben Felder entfallen).
"""
import re
from datetime import date

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import simpleSplit
from reportlab.platypus import CondPageBreak, KeepTogether, PageBreak, Paragraph, Spacer, Table, TableStyle
from xml.sax.saxutils import escape

from bpcore import stammdaten

X = lambda t: escape(str(t or "")).replace("\n", "<br/>")   # noqa: E731
ZIEL = "https://bauplattform.invalid/"


class LinkPara(Paragraph):
    """Absatz mit unsichtbarem Link über der ganzen Fläche (nur im Entwurf) – auch über einen Seitenumbruch hinweg."""
    def __init__(self, text, style, ziel=None, **kw):
        super().__init__(text, style, **kw)
        self._ziel = ziel

    def split(self, aW, aH):
        teile = super().split(aW, aH)
        for t in teile:
            t._ziel = self._ziel
        return teile

    def drawOn(self, canv, x, y, _sW=0):
        super().drawOn(canv, x, y, _sW)
        if self._ziel:
            canv.linkURL(ZIEL + self._ziel, (x, y, x + self.width, y + self.height), relative=1, thickness=0)


def P_(text, style, ziel=None):
    """Paragraph – mit Ziel (nur im Entwurf gesetzt) bearbeitbar."""
    return LinkPara(text, style, ziel) if ziel else Paragraph(text, style)
SCHWARZ, GRAU, LINIE = colors.HexColor("#111111"), colors.HexColor("#555555"), colors.HexColor("#bfbfbf")
LABEL_B = 52 * mm   # Breite der Beschriftungsspalte – wie im Protokoll


def _de(v):
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", str(v or ""))
    return f"{m.group(3)}.{m.group(2)}.{m.group(1)}" if m else str(v or "")


def daten(c, r, P, F, user_name=""):
    """Alles, was Deckblatt und Seite 2 zeigen – aus LV-Daten, Projektdaten und Büro."""
    import ava_ebenen
    meta = ava_ebenen.aufloesen(c, r, meta=(P["data"] or {}).get("meta") or {})[0]   # eigene Angaben, sonst Projekt, sonst Büro (Ebenen)
    S = {x["key"]: x["value"] or "" for x in c.execute("SELECT key, value FROM settings WHERE key='office_name' OR key LIKE 'co\\_%'").fetchall()}
    p = c.execute("SELECT id, name, leaders FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
    PD = stammdaten.projekt_lesen(c, p["id"]) if p else {}
    leit = []
    if p:
        import json
        try:
            ids = [int(x) for x in json.loads(p["leaders"] or "[]")]
        except (ValueError, TypeError):
            ids = []
        for u in c.execute("SELECT * FROM users WHERE id = ANY(?)", (ids,)).fetchall() if ids else []:
            leit.append(" ".join(x for x in (u["vorname"] or "", u["nachname"] or "") if x) or u["name"])
    pm = re.match(r"\s*([A-Za-z]{0,3}\d[\w.]*)\s*(.*)", (p["name"] if p else P.get("projekt")) or "")
    from bpcore import stammdaten as _sd
    verein = _sd.liste_aktiv(meta.get("vereinbarungen"))   # Zeilen „an“ (Feldart „liste“); alte Form: Liste der Texte
    verein = [str(x.get("name") if isinstance(x, dict) else x) for x in (verein if isinstance(verein, list) else str(verein).split("\n")) if str(x).strip()]
    vb = [(lab, str(meta.get(k) or ""), k) for k, lab, *_ in stammdaten.LV[2][1] if k != "vb_einbehalt_abl" and str(meta.get(k) or "").strip()]
    if meta.get("vb_einbehalt") and meta.get("vb_einbehalt_abl", True) and not re.search(r"kein|entf|ablös", meta["vb_einbehalt"], re.I):
        vb = [(l_, v + ", ablösbar gegen Bürgschaft" if l_ == "Gewährleistungseinbehalt" else v, k) for l_, v, k in vb]
    return {"meta": meta, "S": S, "leitung": leit, "projektnr": pm.group(1) if pm else "", "projektname": (pm.group(2) if pm else "") or (p["name"] if p else ""),
            "vereinbarungen": verein, "vb": vb, "ich": user_name, "bauleitung": PD.get("bauleitung") or ""}


def _buero(S):
    return "\n".join(v for v in (S.get("office_name"), S.get("co_street"), " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x)) if v)


def deckblatt(cv, ps, D, F, FN, LV, rand, logo, entwurf, feld_entwurf):
    """Seite 1 auf dem Briefbogen: Titel, Kapitel Projekt · Angebotsabgabe · Ausschreibende Stelle, Angebotsaufforderung, Stand.
    rand: Satzspiegel des Briefbogens (briefbogen.raender) – ohne Briefbogen das Logo oben rechts."""
    M, S = D["meta"], D["S"]
    L, R = rand.get("links") or 25 * mm, ps[0] - (rand.get("rechts") or 20 * mm)
    X2, unten = L + LABEL_B, (rand.get("fuss") or 25 * mm) + 6 * mm
    y = ps[1] - (rand.get("kopf") or 45 * mm) - 6 * mm
    if not rand and logo:   # kein Briefbogen hinterlegt: wenigstens das Logo
        try:
            import io
            from reportlab.lib.utils import ImageReader
            ir = ImageReader(io.BytesIO(logo)); iw, ih = ir.getSize(); hh = 18 * mm; ww = min(60 * mm, iw * hh / ih); hh = ww * ih / iw
            cv.drawImage(ir, R - ww, ps[1] - 14 * mm - hh, ww, hh, mask="auto")
        except Exception:   # noqa: BLE001 – ohne Logo drucken
            pass

    def text(t, x, gr=9.5, fett=False, grau=False, breite=None):
        nonlocal y
        for z in [z2 for z in str(t or "").split("\n") for z2 in (simpleSplit(z, FN["b"] if fett else FN["n"], gr, breite or (R - x)) or [""])]:
            if y < unten:
                return
            cv.setFont(FN["b"] if fett else FN["n"], gr); cv.setFillColor(GRAU if grau else SCHWARZ); cv.drawString(x, y, z)
            y -= gr * 0.43 * mm + 1.6 * mm

    def kapitel(t):
        nonlocal y
        y -= 3 * mm
        cv.setFont(FN["n"], 13); cv.setFillColor(SCHWARZ); cv.drawString(L, y, t); y -= 3 * mm
        cv.setStrokeColor(LINIE); cv.setLineWidth(0.5); cv.line(L, y, R, y); y -= 5 * mm

    def label(t, x, y0):
        cv.setFont(FN["b"], 7.8); cv.setFillColor(colors.HexColor("#333333"))
        for i, z in enumerate(simpleSplit(t.upper(), FN["b"], 7.8, (X2 - L) - 3 * mm)[:2]):
            cv.drawString(x, y0 - i * 3.4 * mm, z)

    def feld(lab, wert, ziel=None):   # ziel: im Entwurf bearbeitbar (Link über dem Wert – siehe oben)
        nonlocal y
        y0 = y
        label(lab, L, y0)
        if entwurf and ziel and not str(wert or "").strip():
            text("＋ eintragen", X2, grau=True)
        else:
            text(wert, X2)
        y = min(y, y0 - 3.6 * mm) - 1.4 * mm
        if entwurf and ziel:
            feld_entwurf(ziel, X2 - 1, y + 1.2 * mm, R - X2 + 1, y0 + 3.6 * mm - (y + 1.2 * mm))

    def paar(a, b):   # zwei Angaben nebeneinander (Datum, Fristen); je Angabe (Beschriftung, Wert, Ziel)
        nonlocal y
        y0, xm = y, L + (R - L) / 2 + 4 * mm
        for x, (lab, wert, *z) in ((L, a), (xm, b)):
            if lab:
                label(lab, x, y0); cv.setFont(FN["n"], 9.5); cv.setFillColor(SCHWARZ); cv.drawString(x + 27 * mm, y0, str(wert or "–")[:48])
                if entwurf and z and z[0]:
                    feld_entwurf(z[0], x + 26 * mm, y0 - 1.6 * mm, (R - L) / 2 - 31 * mm, 5.4 * mm)
        y = y0 - 5.6 * mm

    cv.setFont(FN["n"], 20); cv.setFillColor(SCHWARZ); cv.drawString(L, y, (F.get("Titel") or "Leistungsverzeichnis")[:50])
    if entwurf:
        feld_entwurf("feld/Titel", L - 1, y - 2 * mm, R - L, 9 * mm)
    y -= 8 * mm
    text(" · ".join(x for x in (f"LV {LV['nr']}", LV["name"], f"Vergabe-Nr. {M['vergabenr']}" if M.get("vergabenr") else "") if x), L, gr=10, grau=True); y -= 3 * mm

    kapitel("Projekt")
    feld("Projekt", f"{D['projektnr']} {D['projektname']}".strip())
    feld("Bauvorhaben", F.get("Bauvorhaben") or "", "feld/Bauvorhaben")
    feld("Bauherr:in", F.get("Bauherr") or "", "feld/Bauherr")   # aus den Projektdaten, mit „öffentliche:r Auftraggeber:in“ (ava_besprechung_daten.bauherr)
    feld("Leistung", " · ".join(x for x in (LV["gewerk"] or LV["name"], f"KG {M['kg']}" if M.get("kg") else "") if x), "ev/gewerk,kg")

    kapitel("Angebotsabgabe")
    abgabe = " ".join(x for x in (_de(M.get("abgabe")), f"{M['abgabe_zeit']} Uhr" if M.get("abgabe_zeit") else "") if x)
    aus = " – ".join(x for x in (_de(M.get("ausf_beginn")), _de(M.get("ausf_ende"))) if x)
    for a, b in ((("Abgabe bis", abgabe, "ev/abgabe,abgabe_zeit"), ("Eröffnung", _de(M.get("eroeffnung")), "ev/eroeffnung")),
                 (("Bindefrist", f"bis {_de(M['bindefrist'])}" if M.get("bindefrist") else "", "ev/bindefrist"), ("Vergabeart", M.get("vergabeart"), "ev/vergabeart")),
                 (("Ausführung", aus, "ev/ausf_beginn,ausf_ende"), ("Vertragsart", M.get("vertragsart"), "ev/vertragsart"))):
        if a[1] or b[1] or entwurf:
            paar(a, b)
    y -= 1 * mm
    ort = M.get("abgabeort") or ""
    if not ort or ort.startswith("im Büro der Ausschreibenden"):
        ort = "im Büro der Ausschreibenden – " + ", ".join(v for v in (S.get("co_street"), " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x)) if v)
    feld("Abgabeort", ort.rstrip(" –"), "ev/abgabeort")
    tausch = " · ".join(x for x in (M.get("gaeb") or "", "Nebenangebote zugelassen" if M.get("nebenangebote") else "") if x)
    if tausch or entwurf:
        feld("Austausch", tausch, "ev/gaeb,nebenangebote")

    kapitel("Ausschreibende Stelle")
    feld("Planung / Ausschreibung", F.get("Aufsteller") or "", "feld/Aufsteller")
    feld("Ansprechpartner:in", " · ".join(x for x in (D["ich"], S.get("co_phone") and f"Telefon {S['co_phone']}", S.get("co_email")) if x))
    if D["leitung"] or D["bauleitung"]:
        feld("Bauleitung", ", ".join(D["leitung"]) or D["bauleitung"])

    y -= 3 * mm
    auff = M.get("aufforderung") or stammdaten.AUFFORDERUNG[0]
    y0 = y
    text(auff, L + 3 * mm)
    if entwurf:
        feld_entwurf("ev/aufforderung", L + 2 * mm, y + 1.2 * mm, R - L - 2 * mm, y0 + 3.6 * mm - (y + 1.2 * mm))
    y1 = y
    if F.get("Hinweis"):
        text(F["Hinweis"], L + 3 * mm)
    elif entwurf:
        text("＋ Hinweis", L + 3 * mm, grau=True)
    if entwurf:
        feld_entwurf("feld/Hinweis", L + 2 * mm, y + 1.2 * mm, R - L - 2 * mm, y1 + 3.6 * mm - (y + 1.2 * mm))
    cv.setStrokeColor(LINIE); cv.setLineWidth(2); cv.line(L, y0 + 3.5 * mm, L, y + 2.5 * mm)
    cv.setFont(FN["n"], 8); cv.setFillColor(GRAU); cv.drawRightString(R, 12 * mm, f"Stand {F.get('Datum') or date.today().strftime('%d.%m.%Y')} · Seite 1")


# ---------------------------------------------------------------- Seiten ab 2 (Platypus, im Druck-Layout)
def _stile(FN, fs):
    return {"titel": ParagraphStyle("lt", fontName=FN["n"], fontSize=16, leading=20, textColor=SCHWARZ),
            "unter": ParagraphStyle("lu", fontName=FN["n"], fontSize=10, leading=13, textColor=GRAU, spaceAfter=3 * mm),
            "kap": ParagraphStyle("lk", fontName=FN["n"], fontSize=13, leading=16, textColor=SCHWARZ),
            "lab": ParagraphStyle("ll", fontName=FN["b"], fontSize=7.8, leading=9.5, textColor=colors.HexColor("#333333")),
            "w": ParagraphStyle("lw", fontName=FN["n"], fontSize=fs + 0.5, leading=(fs + 0.5) * 1.35, textColor=SCHWARZ),
            "wb": ParagraphStyle("lwb", fontName=FN["b"], fontSize=fs + 0.5, leading=(fs + 0.5) * 1.35, textColor=SCHWARZ),
            "klein": ParagraphStyle("lkl", fontName=FN["n"], fontSize=7, leading=9, textColor=GRAU)}


def _kapitel(t, St, W):
    k = Table([[Paragraph(X(t), St["kap"])]], colWidths=[W])
    k.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.5, LINIE), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    return [k, Spacer(1, 1.5 * mm)]


def _felder(rows, St, W, entwurf=False):   # rows: (Beschriftung, Wert[, Schlüssel der Ausschreibungsdaten])
    t = Table([[Paragraph(X(l_.upper()), St["lab"]), P_(X(v), St["w"], f"ev/{k[0]}" if entwurf and k else None)] for l_, v, *k in rows if str(v or "").strip()],
              colWidths=[LABEL_B, W - LABEL_B])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 1.6), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.6),
                           ("TOPPADDING", (0, 0), (0, -1), 3)]))
    return t


def _kopf(titel, LV, St):
    return [Paragraph(X(titel), St["titel"]), Paragraph(X(f"LV {LV['nr']} · {LV['name']}"), St["unter"])]


def angaben(D, F, LV, FN, W, fs, preise=None):
    """Seite 2 (D1): Vertragsbedingungen, weitere Vereinbarungen, Hinweis, Angebotssumme mit Unterschrift."""
    St, S = _stile(FN, fs), D["S"]
    out = _kopf("Angaben zur Ausschreibung", LV, St)
    E = bool(D.get("entwurf"))
    if D["vb"]:
        out += _kapitel("Vertragsbedingungen", St, W) + [_felder(D["vb"], St, W, E)]
    if D["vereinbarungen"]:
        out += _kapitel("Weitere Vereinbarungen", St, W) + [_felder([("Vereinbarungen", "\n".join(D["vereinbarungen"]), "vereinbarungen")], St, W, E)]
    hinweis = ("Diese Unterlagen sind vollständig auszufüllen und rechtsverbindlich zu unterschreiben. Bitte sorgen Sie für den termingerechten Eingang "
               "Ihres Angebots am Abgabeort (siehe Deckblatt)." + (f" Fragen beantworten wir gern ({S['co_email']})." if S.get("co_email") else ""))
    h = Table([[Paragraph(X(hinweis), St["w"])]], colWidths=[W])
    h.setStyle(TableStyle([("LINEBEFORE", (0, 0), (0, -1), 2, LINIE), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    out += [Spacer(1, 4 * mm), h, Spacer(1, 6 * mm)]
    eur = lambda v: f"{v:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".") if v is not None else "……………………… €"   # noqa: E731
    sm = [[Paragraph("Angebotssumme", St["kap"]), ""],
          [Paragraph("Angebotssumme netto", St["w"]), Paragraph(eur(preise), St["wb"])],
          [Paragraph("zzgl. Umsatzsteuer 19 %", St["w"]), Paragraph(eur(preise * 0.19 if preise is not None else None), St["wb"])],
          [Paragraph("<b>Angebotssumme brutto</b>", St["w"]), Paragraph(eur(preise * 1.19 if preise is not None else None), St["wb"])],
          [Spacer(1, 12 * mm), ""],
          [Paragraph("Bieter:in – Ort, Datum", St["klein"]), Paragraph("Bieter:in – Unterschrift und Stempel", St["klein"])]]
    t = Table(sm, colWidths=[W * 0.55, W * 0.45])
    t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, SCHWARZ), ("SPAN", (0, 0), (-1, 0)), ("LINEBELOW", (0, 0), (-1, 0), 0.5, LINIE), ("ALIGN", (1, 1), (1, 3), "RIGHT"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                           ("LINEABOVE", (0, 5), (0, 5), 0.4, GRAU), ("LINEABOVE", (1, 5), (1, 5), 0.4, GRAU), ("BOTTOMPADDING", (0, -1), (-1, -1), 6)]))
    return out + [KeepTogether([t]), PageBreak()]


def vorbemerkungen(text, FN, W, fs, LV, entwurf=False):
    """Vorbemerkungen: Titel wie Seite 2; eine kurze erste Zeile eines Absatzes wird zur Kapitelüberschrift."""
    St = _stile(FN, fs)
    out = _kopf("Vorbemerkungen", LV, St)
    for ab in re.split(r"\n\s*\n", str(text or "")):
        if not ab.strip():
            continue
        z = ab.strip().split("\n")
        if len(z) > 1 and len(z[0]) < 80 and not z[0].rstrip().endswith((".", ",")):
            out += _kapitel(z[0].strip(), St, W); z = z[1:]
        out += [P_(X("\n".join(z)), St["w"], "feld/Vorbemerkungen" if entwurf else None), Spacer(1, 2 * mm)]
    return out + [Spacer(1, 4 * mm)]


def schluss(text, FN, W, fs, entwurf=False):
    """Bieterangaben am Ende: Kapitel „Erklärung der Bieterin / des Bieters“; Zeilen mit „:“ am Ende werden Schreiblinien mit der Beschriftung darunter."""
    St = _stile(FN, fs)
    zeilen, st = [], [("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 1.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5)]
    for z in str(text or "").split("\n"):
        if z.rstrip().endswith(":"):
            zeilen += [[Spacer(1, 9 * mm)], [Paragraph(X(z.rstrip()[:-1]), St["klein"])]]
            st.append(("LINEABOVE", (0, len(zeilen) - 1), (0, len(zeilen) - 1), 0.4, GRAU))
        elif z.strip():
            zeilen.append([P_(X(z), St["w"], "feld/Schlusstext" if entwurf else None)])
    t = Table(zeilen or [[""]], colWidths=[W])
    t.setStyle(TableStyle(st))
    return [CondPageBreak(70 * mm), Spacer(1, 6 * mm), KeepTogether(_kapitel("Erklärung der Bieterin / des Bieters", St, W) + [t])]


def verzeichnis(items, FN, W, fs):
    """Verzeichnis der Bieterangaben (Mock „Bietertextergänzungen“ D1): jede Angabe der Bieter:in mit OZ und Punktlinie – am Ende des LV."""
    from bpcore import textergaenzung as TE
    V = TE.verzeichnis(items)
    if not V:
        return []
    St = _stile(FN, fs)
    zeilen = [[Paragraph(X(oz), St["klein"]), Paragraph(X(f"{kurz} – {frage}" + (f" (Vorschlag: {vor} oder gleichwertig)" if vor else "")), St["w"]), Paragraph(X(TE.PUNKTE), St["w"])]
              for oz, kurz, frage, vor in V]
    t = Table(zeilen, colWidths=[W * 0.16, W * 0.5, W * 0.34])
    t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                           ("LINEBELOW", (0, 0), (-1, -1), 0.3, GRAU)]))
    return [CondPageBreak(50 * mm), Spacer(1, 6 * mm)] + _kapitel("Verzeichnis der Bieterangaben", St, W) + [t]
