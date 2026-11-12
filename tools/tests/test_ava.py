"""Ablauftests Ausschreibung & Abrechnung (AVA): LV anlegen und bearbeiten, Angebote mit Preisspiegel, Vergabe, Aufmaß,
Rechnungsprüfung, GAEB/Excel, PDF-Ausdrucke, Kataloge und Rechte – alles über die normalen Schnittstellen (/ava/api/…).

Jeder Test legt sein eigenes LV im Testprojekt T101 an (eindeutiger Name) und legt es am Ende wieder in den Papierkorb.
Erwartete Beträge sind von Hand gerechnet (Menge × Einheitspreis, Nachlass, Einbehalt, 19 % Umsatzsteuer).
"""
import base64, io, json, zipfile
from xml.sax.saxutils import escape

from lib import finde, gleich, pruefe

A = "/ava/api"


# ---------------------------------------------------------------- Hilfen
def _pid(ctx, teil="T101"):
    return ctx.projekt(teil)["id"]


def _t(i, kurz, lvl=1):
    return {"id": i, "typ": "titel", "lvl": lvl, "kurz": kurz}


def _p(i, kurz, menge, einheit="m²", ep_s=None, art="N", **kw):
    return {"id": i, "typ": "pos", "kurz": kurz, "lang": "", "menge": menge, "einheit": einheit, "art": art, "ep_s": ep_s, **kw}


# Rohbau: Mauerwerk 120 m², Innenputz 300 m² (Auftragspreise 48,20 € und 18,75 €)
ROHBAU = [_t("t1", "Mauerarbeiten"), _p("p1", "Mauerwerk KS 17,5 cm", 120, ep_s=46.00), _p("p2", "Innenputz Kalkgips", 300, ep_s=18.00)]


def _lv(c, ctx, name="LV", items=None, pid=None):
    """Neues LV im Testprojekt; mit items gleich gespeichert und nummeriert."""
    lv = c.pj(f"{A}/lv", {"project_id": pid or _pid(ctx), "name": ctx.name(name), "gewerk": "Rohbau"})
    if items is not None:
        lv = c.uj(f"{A}/lv/{lv['id']}", {"data": {"items": items}, "nummerieren": True})
    return lv


def _weg(c, lv):
    if lv:
        c.delete(f"{A}/lv/{lv['id']}", expect=None)


def _angebot(c, lv_id, bieter, preise, **extra):
    """Angebot anlegen und Preise (und z. B. Nachlass) eintragen; gibt (LV, Angebot) zurück."""
    L = c.pj(f"{A}/lv/{lv_id}/angebote", {"bieter": bieter})
    a = finde(L["angebote"], bieter=bieter)
    pruefe(a, f"Angebot „{bieter}“ fehlt nach dem Anlegen")
    L = c.uj(f"{A}/angebote/{a['id']}", {"preise": preise, **extra})
    return L, finde(L["angebote"], id=a["id"])


def _vergeben(c, lv_id, bieter="Rohbau Schulte & Söhne", preise=None, **extra):
    L, a = _angebot(c, lv_id, bieter, preise or {"p1": 48.20, "p2": 18.75}, **extra)
    return c.pj(f"{A}/lv/{lv_id}/vergabe", {"angebot_id": a["id"]})


def _calc_re(L, rid):
    x = finde(L["calc"]["rechnungen"], id=rid)
    pruefe(x, f"Rechnung {rid} fehlt in der Berechnung")
    return x


def _re_neu(c, lv_id, **body):
    L = c.pj(f"{A}/lv/{lv_id}/rechnungen", body)
    return L, max(L["rechnungen"], key=lambda r: r["nr"])


def _xlsx(zeilen):
    """Kleine Excel-Datei (ein Blatt, Text als Inline-Text) – nur mit der Standardbibliothek."""
    def spalte(i):
        s, i = "", i + 1
        while i:
            i, r = divmod(i - 1, 26)
            s = chr(65 + r) + s
        return s
    rows = []
    for r, z in enumerate(zeilen, 1):
        cells = []
        for k, v in enumerate(z):
            if v is None or v == "":
                continue
            ref = f"{spalte(k)}{r}"
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                cells.append(f'<c r="{ref}"><v>{v}</v></c>')
            else:
                cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{escape(str(v))}</t></is></c>')
        rows.append(f'<row r="{r}">{"".join(cells)}</row>')
    kopf = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", kopf + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="xml" ContentType="application/xml"/>'
                   '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                   '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
        z.writestr("_rels/.rels", kopf + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   f'<Relationship Id="rId1" Type="{rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>')
        z.writestr("xl/workbook.xml", kopf + f'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="{rel}">'
                   '<sheets><sheet name="LV" sheetId="1" r:id="rId1"/></sheets></workbook>')
        z.writestr("xl/_rels/workbook.xml.rels", kopf + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   f'<Relationship Id="rId1" Type="{rel}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
        z.writestr("xl/worksheets/sheet1.xml", kopf + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
                   + "".join(rows) + "</sheetData></worksheet>")
    return buf.getvalue()


def _pdf(zeilen):
    """Einfache PDF mit Textebene (eine Seite, Helvetica) – nur mit der Standardbibliothek."""
    esc = lambda t: t.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")   # noqa: E731
    inhalt = ("BT /F1 10 Tf " + " ".join(f"1 0 0 1 50 {800 - 18 * k} Tm ({esc(z)}) Tj" for k, z in enumerate(zeilen)) + " ET").encode("cp1252")
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
            b"<< /Length %d >>\nstream\n" % len(inhalt) + inhalt + b"\nendstream",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]
    out, lage = bytearray(b"%PDF-1.4\n"), []
    for i, o in enumerate(objs, 1):
        lage.append(len(out))
        out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    x = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1) + b"".join(b"%010d 00000 n \n" % v for v in lage)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, x)
    return bytes(out)


def _pdf_spalten(zeilen):
    """PDF mit Spalten: je Zeile [(x, Text, rechtsbündig?)] – wie AVA-Programme Mengen und Preise in Spalten setzen."""
    esc = lambda t: t.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")   # noqa: E731
    teile = []
    for k, z in enumerate(zeilen):
        for x, t, rechts in z:
            xx = x - len(t) * 5.6 if rechts else x   # Helvetica 10 pt: etwa 5,6 pt je Zeichen (reicht für die Spalten)
            teile.append(f"1 0 0 1 {xx:.1f} {800 - 14 * k} Tm ({esc(t)}) Tj")
    inhalt = ("BT /F1 10 Tf " + " ".join(teile) + " ET").encode("cp1252")
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
            b"<< /Length %d >>\nstream\n" % len(inhalt) + inhalt + b"\nendstream",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]
    out, lage = bytearray(b"%PDF-1.4\n"), []
    for i, o in enumerate(objs, 1):
        lage.append(len(out))
        out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    x = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1) + b"".join(b"%010d 00000 n \n" % v for v in lage)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, x)
    return bytes(out)


XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


# ---------------------------------------------------------------- Leistungsverzeichnis
def test_lv_anlegen_loeschen_wiederherstellen(ctx):
    """LV im Projekt anlegen, in der Liste finden, in den Papierkorb legen und mit „Rückgängig“ zurückholen."""
    c, pid = ctx.admin, _pid(ctx)
    name = ctx.name("Rohbau")
    lv = c.pj(f"{A}/lv", {"project_id": pid, "name": name, "gewerk": "Rohbau"})
    try:
        gleich(lv["name"], name, "Name")
        gleich(lv["project_id"], pid, "Projekt")
        gleich(lv["status"], "entwurf", "Status eines neuen LV")
        pruefe(lv["nr"], "neues LV bekommt eine Nummer")
        x = finde(c.gj(f"{A}/lv?project_id={pid}"), id=lv["id"])
        pruefe(x, "neues LV fehlt in der LV-Liste des Projekts")
        gleich(x["n_pos"], 0, "Positionen im leeren LV")
        r = c.delete(f"{A}/lv/{lv['id']}").json
        pruefe(r.get("ok") and r.get("papierkorb"), f"Löschen liefert keine Papierkorb-ID: {r}")
        c.get(f"{A}/lv/{lv['id']}", expect=404)
        pruefe(not finde(c.gj(f"{A}/lv?project_id={pid}"), id=lv["id"]), "gelöschtes LV steht noch in der Liste")
        c.post(f"{A}/bp/papierkorb/{r['papierkorb']}/zurueck", {})
        gleich(c.gj(f"{A}/lv/{lv['id']}")["name"], name, "LV nach „Rückgängig“ wieder da")
    finally:
        _weg(c, lv)


def test_positionen_nummerieren_einfuegen_loeschen(ctx):
    """Titel und Positionen speichern, OZ neu vergeben, Position einfügen und löschen – die OZ rücken nach."""
    c = ctx.admin
    lv = None
    try:
        items = [_t("t1", "Erdarbeiten"), _p("a", "Oberboden abtragen", 85, ep_s=6.5), _p("b", "Baugrube ausheben", 120, "m³", ep_s=14.0),
                 _t("t2", "Verbau", 2), _p("c", "Trägerbohlwand", 40, ep_s=95.0), _p("h", "Hinweis zum Baugrund", 0, "", art="T"),
                 _t("t3", "Mauerarbeiten"), _p("d", "Mauerwerk KS 17,5 cm", 120, ep_s=46.0)]
        lv = _lv(c, ctx, "Nummern", items)
        oz = {x["id"]: x["oz"] for x in lv["data"]["items"]}
        gleich(oz, {"t1": "01", "a": "01.0010", "b": "01.0020", "t2": "01.01", "c": "01.01.0010", "h": "", "t3": "02", "d": "02.0010"}, "Ordnungszahlen")
        # neue Position zwischen a und b, Langtext und Kostengruppe ändern
        I = lv["data"]["items"]
        I.insert(2, _p("n", "Bodenaustausch Schotter 0/45", 30, "m³", ep_s=38.0, kg="321"))
        I[1]["lang"] = "Oberboden 30 cm abtragen und seitlich lagern."
        lv = c.uj(f"{A}/lv/{lv['id']}", {"data": {"items": I}, "nummerieren": True})
        oz = {x["id"]: x["oz"] for x in lv["data"]["items"]}
        gleich((oz["a"], oz["n"], oz["b"]), ("01.0010", "01.0020", "01.0030"), "OZ nach dem Einfügen")
        gleich(finde(lv["data"]["items"], id="a")["lang"], "Oberboden 30 cm abtragen und seitlich lagern.", "geänderter Langtext")
        gleich(finde(lv["data"]["items"], id="n")["kg"], "321", "Kostengruppe")
        # Position a löschen, Titel t2 samt Inhalt löschen
        I = [x for x in lv["data"]["items"] if x["id"] not in ("a", "t2", "c", "h")]
        lv = c.uj(f"{A}/lv/{lv['id']}", {"data": {"items": I}, "nummerieren": True})
        gleich([(x["id"], x["oz"]) for x in lv["data"]["items"]], [("t1", "01"), ("n", "01.0010"), ("b", "01.0020"), ("t3", "02"), ("d", "02.0010")],
               "OZ nach dem Löschen")
        # ohne „nummerieren“ bleiben eigene OZ stehen
        I = lv["data"]["items"]
        I[1]["oz"] = "01.0015"
        lv = c.uj(f"{A}/lv/{lv['id']}", {"data": {"items": I}})
        gleich(lv["data"]["items"][1]["oz"], "01.0015", "eigene OZ ohne Neunummerierung")
        gleich(finde(c.gj(f"{A}/lv?project_id={_pid(ctx)}"), id=lv["id"])["n_pos"], 3, "Anzahl Positionen in der Liste")
    finally:
        _weg(c, lv)


def test_kostenschaetzung_im_lv(ctx):
    """Kostenschätzung des LV: Σ Menge × Schätzpreis, ohne Bedarfs-/Wahlpositionen, mit Pauschale (3.913,75 €)."""
    c = ctx.admin
    lv = None
    try:
        items = [_t("t1", "Rohbau"),
                 _p("p1", "Mauerwerk KS 17,5 cm", 12.5, ep_s=48.20),                   # 602,50
                 _p("p2", "Innenputz Kalkgips", 85.4, ep_s=18.75),                     # 1.601,25
                 _p("p3", "Bedarfsposition Bohrung", 10, "St", ep_s=30.0, art="E"),   # zählt nicht
                 _p("p4", "Wahlposition Porenbeton", 12.5, ep_s=55.0, art="A"),       # zählt nicht
                 _p("p5", "Baustelleneinrichtung", 1, "psch", ep_s=1500.0, art="P"),  # 1.500,00
                 _p("p6", "Stundenlohn Facharbeiter", 4, "h", ep_s=52.50, art="E", gb=True),   # 210,00
                 _p("p7", "Kernbohrung DN 100", 2, "St")]                              # ohne Schätzpreis
        lv = _lv(c, ctx, "Schaetzung", items)
        gleich(lv["calc"]["schaetzung"], 3913.75, "Kostenschätzung")
        gleich(lv["calc"]["ohne_schaetzung"], 1, "Positionen ohne Schätzpreis")
        x = finde(c.gj(f"{A}/lv?project_id={_pid(ctx)}"), id=lv["id"])
        gleich(x["schaetzung"], 3913.75, "Schätzung in der LV-Liste")
        gleich(x["prognose"], 3913.75, "Prognose ohne Auftrag = Schätzung")
        gleich(x["n_pos"], 7, "Anzahl Positionen")
    finally:
        _weg(c, lv)


def test_gleichzeitig_bearbeitet_konflikt(ctx):
    """Speichern mit veraltetem Stand (rev) wird mit 409 abgelehnt, mit „force“ übernommen."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Konflikt", ROHBAU)
        alt = lv["rev"]
        c.uj(f"{A}/lv/{lv['id']}", {"rev": alt, "name": ctx.name("Neu")})
        r = c.put(f"{A}/lv/{lv['id']}", {"rev": alt, "name": "zu spät"}, expect=409).json
        pruefe(r.get("conflict"), f"Konflikt nicht gemeldet: {r}")
        neu = c.uj(f"{A}/lv/{lv['id']}", {"rev": alt, "force": True, "gewerk": "Mauerarbeiten"})
        gleich(neu["gewerk"], "Mauerarbeiten", "mit force gespeichert")
    finally:
        _weg(c, lv)


# ---------------------------------------------------------------- Angebote, Preisspiegel, Vergabe
def test_angebote_preisspiegel_vergabe(ctx):
    """Zwei Angebote mit Nachlass, Rangfolge im Preisspiegel (PDF), Vergabe an den Günstigsten und Aufheben der Vergabe."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Vergabe", ROHBAU + [_p("p3", "Baustelleneinrichtung", 1, "psch", ep_s=1200.0, art="P")])
        firmen = c.gj(f"{A}/kontakte")
        k = finde(firmen, name="Rohbau Schulte & Söhne")
        pruefe(k, "Firma „Rohbau Schulte & Söhne“ aus den Testdaten fehlt in /api/kontakte")
        L = c.pj(f"{A}/lv/{lv['id']}/angebote", {"contact_id": k["id"]})
        a1 = finde(L["angebote"], contact_id=k["id"])
        pruefe(a1 and a1["bieter"] == k["name"], "Angebot über die Adresse trägt den Firmennamen")
        # Schulte: 120 × 48,20 + 300 × 18,75 + 1.400,00 = 5.784,00 + 5.625,00 + 1.400,00 = 12.809,00; −3 % = 12.424,73
        L = c.uj(f"{A}/angebote/{a1['id']}", {"preise": {"p1": 48.20, "p2": 18.75, "p3": 1400}, "nachlass": 3, "eingang": "2026-10-20"})
        # Bau Müller: 120 × 47,50 + 300 × 19,90 = 5.700,00 + 5.970,00 = 11.670,00, Baustelleneinrichtung fehlt; −0 % −0 €
        L, a2 = _angebot(c, lv["id"], "Bau Müller GmbH", {"p1": 47.50, "p2": 19.90})
        K = {x["id"]: x for x in L["calc"]["angebote"]}
        gleich(K[a1["id"]]["summe"], 12809.00, "Angebotssumme Schulte")
        gleich(K[a1["id"]]["netto"], 12424.73, "Wertung Schulte (−3 %)")
        gleich(K[a2["id"]]["summe"], 11670.00, "Angebotssumme Müller")
        gleich(K[a2["id"]]["fehlt"], 1, "fehlende Preise Müller")
        gleich(K[a2["id"]].get("rang"), 1, "Rang Müller (günstigste Wertung)")
        gleich(K[a1["id"]].get("rang"), 2, "Rang Schulte")
        # Müller ergänzt die Baustelleneinrichtung mit 1.500,00 → 13.170,00 und gibt 600 € Nachlass → 12.570,00
        L = c.uj(f"{A}/angebote/{a2['id']}", {"preise": {"p3": 1500}, "nachlass_eur": 600})
        K = {x["id"]: x for x in L["calc"]["angebote"]}
        gleich(K[a2["id"]]["netto"], 12570.00, "Wertung Müller (−600 €)")
        gleich(K[a1["id"]].get("rang"), 1, "nach der Ergänzung ist Schulte am günstigsten")
        c.get(f"{A}/lv/{lv['id']}/pdf?art=preisspiegel").ist_pdf()
        # leerer Preis entfernt den Preis
        L = c.uj(f"{A}/angebote/{a2['id']}", {"preise": {"p3": ""}})
        pruefe("p3" not in finde(L["angebote"], id=a2["id"])["preise"], "leerer Preis muss den Preis entfernen")
        # Vergabe an Schulte: Auftragspreise = Angebotspreise, Auftrag 12.424,73
        L = c.pj(f"{A}/lv/{lv['id']}/vergabe", {"angebot_id": a1["id"], "datum": "2026-11-02"})
        gleich(L["status"], "vergeben", "Status nach der Vergabe")
        gleich(L["vergabe"]["bieter"], "Rohbau Schulte & Söhne", "Auftragnehmer")
        gleich(L["vergabe"]["preise"], {"p1": 48.2, "p2": 18.75, "p3": 1400.0}, "Auftragspreise")
        gleich(L["vergabe"]["einbehalt"], 5.0, "Vorgabe Sicherheitseinbehalt 5 %")
        gleich(L["calc"]["auftrag"], 12424.73, "Auftragssumme")
        x = finde(c.gj(f"{A}/lv?project_id={_pid(ctx)}"), id=lv["id"])
        gleich((x["auftragnehmer"], x["auftrag"], x["vergeben"]), ("Rohbau Schulte & Söhne", 12424.73, True), "LV-Liste nach der Vergabe")
        c.post(f"{A}/lv/{lv['id']}/vergabe", {"angebot_id": 999999999}, expect=404)
        L = c.delete(f"{A}/lv/{lv['id']}/vergabe").json
        gleich((L["status"], L["vergabe"], L["calc"]["auftrag"]), ("versendet", {}, 0), "Vergabe aufgehoben")
        L = c.delete(f"{A}/angebote/{a2['id']}").json
        pruefe(not finde(L["angebote"], id=a2["id"]), "gelöschtes Angebot steht noch im LV")
    finally:
        _weg(c, lv)


# ---------------------------------------------------------------- Aufmaß
def test_aufmass_rechenweg(ctx):
    """Aufmaß mit Rechenweg (2 × 3,50 × 2,75 – Türöffnung), mehrere Zeilen auf einmal, ändern, löschen, Massenermittlung als PDF."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Aufmass", ROHBAU)
        gleich(c.pj(f"{A}/formel", {"formel": "2 × 3,50 × 2,75"})["wert"], 19.25, "Rechenweg über /api/formel")
        pruefe(c.pj(f"{A}/formel", {"formel": "drei mal vier"})["wert"] is None, "Text ist kein Rechenweg")
        L = c.pj(f"{A}/lv/{lv['id']}/aufmass", {"pos_id": "p1", "datum": "2026-11-03", "ort": "EG Achse A–B", "formel": "2 × 3,50 × 2,75 – 0,885 × 2,135"})
        z = finde(L["aufmass"], ort="EG Achse A–B")
        gleich(z["menge"], 17.3605, "Menge aus dem Rechenweg 19,25 − 1,889475", 0.0001)
        L = c.pj(f"{A}/lv/{lv['id']}/aufmass", {"zeilen": [{"pos_id": "p1", "ort": "OG Achse A–B", "formel": "(12,40 + 8,10) × 2,75"},
                                                       {"pos_id": "p2", "ort": "EG Flur", "formel": "", "menge": "42,5"},
                                                       {"pos_id": "gibtsnicht", "ort": "falsch", "menge": 1}]})
        gleich(len(L["aufmass"]), 3, "Zeile zu unbekannter Position wird nicht übernommen")
        # p1: 17,3605 + 56,375 = 73,7355 · p2: 42,5
        gleich(L["calc"]["aufmass"]["p1"], 73.7355, "Summe Aufmaß Mauerwerk", 0.0002)
        gleich(L["calc"]["aufmass"]["p2"], 42.5, "Menge ohne Rechenweg")
        L = c.uj(f"{A}/aufmass/{z['id']}", {"formel": "2 × 3,50 × 2,75"})
        gleich(L["calc"]["aufmass"]["p1"], 75.625, "nach Änderung 19,25 + 56,375", 0.0002)
        c.get(f"{A}/lv/{lv['id']}/pdf?art=aufmass").ist_pdf()
        L = c.delete(f"{A}/aufmass/{z['id']}").json
        gleich(L["calc"]["aufmass"]["p1"], 56.375, "nach dem Löschen", 0.0002)
        c.post(f"{A}/lv/{lv['id']}/aufmass", {"pos_id": "gibtsnicht", "menge": 3}, expect=400)
    finally:
        _weg(c, lv)


# ---------------------------------------------------------------- Rechnungen
def test_rechnung_erst_nach_vergabe(ctx):
    """Ohne Vergabe keine Rechnung (400); eine zweite Rechnung erst, wenn die vorige geprüft ist."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "OhneVergabe", ROHBAU)
        c.post(f"{A}/lv/{lv['id']}/rechnungen", {"art": "abschlag"}, expect=400)
        _vergeben(c, lv["id"])
        _re_neu(c, lv["id"], art="abschlag")
        c.post(f"{A}/lv/{lv['id']}/rechnungen", {"art": "abschlag"}, expect=400)
    finally:
        _weg(c, lv)


def test_teil_und_schlussrechnung(ctx):
    """1. Teilrechnung prüfen, Schlussrechnung kumuliert mit Abzug, 5 % Einbehalt und bisher anerkannt; Prüf-PDF und Freigabe."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Abrechnung", ROHBAU)
        _vergeben(c, lv["id"])
        c.pj(f"{A}/lv/{lv['id']}/aufmass", {"zeilen": [{"pos_id": "p1", "ort": "EG", "formel": "2 × 30"}, {"pos_id": "p2", "ort": "EG", "formel": "4 × 25"}]})
        L, r1 = _re_neu(c, lv["id"], art="abschlag", re_nr="AR-1", datum="2026-10-28", eingang="2026-10-30", gefordert=4800)
        x = _calc_re(L, r1["id"])
        # 60 × 48,20 + 100 × 18,75 = 4.767,00; Einbehalt 5 % 238,35 → 4.528,65; brutto × 1,19 = 5.389,09
        gleich(x["leistung"], 4767.00, "1. TR Leistungsstand")
        gleich(x["einbehalt"], 238.35, "1. TR Einbehalt 5 %")
        gleich(x["zahlung"], 4528.65, "1. TR Zahlbetrag netto")
        gleich(x["brutto"], 5389.09, "1. TR Zahlbetrag brutto")
        gleich(x["differenz"], 33.00, "1. TR gefordert − geprüft")
        L = c.uj(f"{A}/rechnungen/{r1['id']}", {"status": "geprueft"})
        R1 = finde(L["rechnungen"], id=r1["id"])
        gleich(R1["status"], "geprueft", "Status 1. TR")
        gleich(R1["data"].get("stand"), {"p1": 60.0, "p2": 100.0}, "festgehaltener Aufmaßstand")
        c.put(f"{A}/rechnungen/{r1['id']}", {"einbehalt": 3}, expect=400)   # geprüfte Rechnung ist gesperrt
        # weiteres Aufmaß bis zur vollen LV-Menge, dann Schlussrechnung
        c.pj(f"{A}/lv/{lv['id']}/aufmass", {"zeilen": [{"pos_id": "p1", "ort": "OG", "formel": "60"}, {"pos_id": "p2", "ort": "OG", "formel": "8 × 25"}]})
        L, r2 = _re_neu(c, lv["id"], art="schluss", re_nr="SR-1", eingang="2026-11-04", gefordert=11500)
        gleich(_calc_re(L, r1["id"])["zahlung"], 4528.65, "geprüfte 1. TR bleibt beim festgehaltenen Stand")
        L = c.uj(f"{A}/rechnungen/{r2['id']}", {"abzuege": [{"text": "Bauwesenversicherung", "pct": 0.3}], "notiz": "Mengen geprüft"})
        x = _calc_re(L, r2["id"])
        # 11.409,00 − 0,3 % (34,23) = 11.374,77; Einbehalt 5 % 568,74 → 10.806,03; − 4.528,65 = 6.277,38; brutto 7.470,09
        gleich(x["leistung"], 11409.00, "SR Leistungsstand")
        gleich(x["abzuege"], 34.23, "SR Abzug 0,3 %")
        gleich(x["einbehalt"], 568.74, "SR Einbehalt 5 %")
        gleich(x["anerkannt"], 10806.03, "SR anerkannt kumuliert")
        gleich(x["vorher"], 4528.65, "SR bisher anerkannt")
        gleich(x["zahlung"], 6277.38, "SR Zahlbetrag netto")
        gleich(x["mwst"], 1192.70, "SR Umsatzsteuer 19 %")
        gleich(x["brutto"], 7470.09, "SR Zahlbetrag brutto")
        gleich(x["differenz"], 91.00, "SR gefordert 11.500 − 11.409")
        c.delete(f"{A}/rechnungen/{r1['id']}", expect=400)   # auf der 1. TR baut die Schlussrechnung auf
        c.get(f"{A}/lv/{lv['id']}/pdf?art=rechnung&rid={r2['id']}").ist_pdf()
        L = c.uj(f"{A}/rechnungen/{r2['id']}", {"status": "geprueft"})
        gleich(L["status"], "abgerechnet", "LV nach geprüfter Schlussrechnung")
        gleich(L["calc"]["abgerechnet"], 10806.03, "abgerechnet")
        gleich(L["calc"]["sicherheit"]["einbehalten"], 568.74, "Sicherheitseinbehalt")
        c.post(f"{A}/lv/{lv['id']}/rechnungen", {"art": "abschlag"}, expect=400)   # nach der Schlussrechnung keine Teilrechnung mehr
        c.delete(f"{A}/lv/{lv['id']}/vergabe", expect=400)   # Vergabe mit geprüften Rechnungen bleibt
        c.get(f"{A}/lv/{lv['id']}/pdf?art=rechnung&rid={r2['id']}&freigabe=1").ist_pdf()
        c.get(f"{A}/lv/{lv['id']}/pdf?art=rechnung&rid=999999999", expect=404)
        x = finde(c.gj(f"{A}/lv?project_id={_pid(ctx)}"), id=lv["id"])
        gleich([(r["nr"], r["art"], r["status"]) for r in x["rechnungen"]], [(1, "abschlag", "geprueft"), (2, "schluss", "geprueft")], "Rechnungen in der LV-Liste")
    finally:
        _weg(c, lv)


def test_regie_frei_und_sicherheit(ctx):
    """Auftrag ohne LV (frei), Regierechnung mit Stundenzetteln, Rechnung ohne Aufmaß und Freigabe der Sicherheit."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Regie")
        L = c.pj(f"{A}/lv/{lv['id']}/vergabe", {"frei": True, "bieter": "Gerüstbau Ruhr", "summe": 5000, "einbehalt": 5})
        gleich((L["status"], L["calc"]["auftrag"]), ("vergeben", 5000.00), "freier Auftrag")
        c.post(f"{A}/lv/{lv['id']}/vergabe", {"frei": True, "bieter": ""}, expect=400)
        L, r1 = _re_neu(c, lv["id"], art="regie")
        L, rx = _re_neu(c, lv["id"], art="abschlag")   # offene Regierechnung hält eine Teilrechnung nicht auf (eigene Kette)
        c.post(f"{A}/lv/{lv['id']}/rechnungen", {"art": "sicherheit"}, expect=400)   # die Freigabe der Sicherheit braucht alle geprüft
        c.delete(f"{A}/rechnungen/{rx['id']}")
        L = c.uj(f"{A}/rechnungen/{r1['id']}", {"zeilen": [{"text": "Facharbeiter", "menge": 8, "einheit": "h", "ep": 52.50},
                                                           {"text": "Helfer", "menge": 8, "einheit": "h", "ep": 41.00},
                                                           {"text": "Bauschutt entsorgen", "menge": 2, "einheit": "t", "ep": 85.00}]})
        x = _calc_re(L, r1["id"])
        # 420,00 + 328,00 + 170,00 = 918,00; 5 % = 45,90 → 872,10; brutto 1.037,80
        gleich(x["leistung"], 918.00, "Summe Stundenlohnarbeiten")
        gleich(x["zahlung"], 872.10, "Zahlbetrag Regie netto")
        gleich(x["brutto"], 1037.80, "Zahlbetrag Regie brutto")
        c.get(f"{A}/lv/{lv['id']}/pdf?art=rechnung&rid={r1['id']}").ist_pdf()
        c.uj(f"{A}/rechnungen/{r1['id']}", {"status": "geprueft"})
        L, r2 = _re_neu(c, lv["id"], art="abschlag")
        L = c.uj(f"{A}/rechnungen/{r2['id']}", {"frei": 2000})
        x = _calc_re(L, r2["id"])
        gleich((x["leistung"], x["vorher"], x["zahlung"]), (2000.00, 0, 1900.00), "Rechnung ohne Aufmaß: 2.000 − 5 %")
        L = c.uj(f"{A}/rechnungen/{r2['id']}", {"zeilen": [{"text": "Gerüst Mehrhöhe", "menge": 10, "einheit": "m²", "ep": 150, "pos": "abc123"}, {"text": "Anfahrt", "menge": 1, "einheit": "psch", "ep": 500}]})
        x = _calc_re(L, r2["id"]); r_ = finde(L["rechnungen"], id=r2["id"])
        gleich((x["leistung"], x["zahlung"]), (2000.00, 1900.00), "Positionen von Hand: 1.500 + 500 − 5 %")
        pruefe(r_["data"]["zeilen"][0].get("pos") == "abc123" and r_["data"]["zeilen"][1]["einheit"] == "psch", "Positionen von Hand: Verweis ins LV und Einheit bleiben")
        c.uj(f"{A}/rechnungen/{r2['id']}", {"status": "geprueft"})
        L, r3 = _re_neu(c, lv["id"], art="sicherheit", betrag=145.90)
        x = _calc_re(L, r3["id"])
        gleich((x["zahlung"], x["brutto"]), (145.90, 173.62), "Freigabe der Sicherheit netto/brutto")
        L = c.uj(f"{A}/rechnungen/{r3['id']}", {"status": "geprueft"})
        S = L["calc"]["sicherheit"]
        gleich((S["einbehalten"], S["freigegeben"], S["offen"]), (145.90, 145.90, 0), "Sicherheiten einbehalten/freigegeben/offen")
        gleich(L["calc"]["abgerechnet"], 2772.10, "abgerechnet 872,10 + 1.900,00")
        c.get(f"{A}/lv/{lv['id']}/pdf?art=rechnung&rid={r3['id']}&freigabe=1").ist_pdf()
        L = c.delete(f"{A}/rechnungen/{r3['id']}").json   # Freigabe steht für sich: darf gelöscht werden
        pruefe(not finde(L["rechnungen"], id=r3["id"]), "gelöschte Rechnung steht noch im LV")
    finally:
        _weg(c, lv)


def test_auftrag_ohne_lv_und_nicht_vergeben(ctx):
    """Neuer Auftrag mit Häkchen „ohne Angebot und LV“ bzw. mit neuem LV; ausgeschriebenes LV als „nicht vergeben“ markieren und zurücknehmen."""
    c = ctx.admin
    lv1 = lv2 = lv3 = None
    try:
        # Häkchen gesetzt: nur Firma, Summe, Skonto
        lv1 = _lv(c, ctx, "Auftrag ohne LV")
        L = c.pj(f"{A}/lv/{lv1['id']}/vergabe", {"frei": True, "ohne_lv": True, "bieter": "Metallbau Nowak", "summe": 14435.40, "einbehalt": 0,
                                                 "skonto": 2, "skonto_tage": 14, "datum": "2026-09-01"})
        gleich((L["status"], L["calc"]["auftrag"], L["vergabe"]["ohne_lv"], L["vergabe"]["skonto"], L["vergabe"]["skonto_tage"], L["vergabe"]["datum"]),
               ("vergeben", 14435.40, True, 2.0, 14, "2026-09-01"), "Auftrag ohne Angebot und LV")
        x = finde(c.gj(f"{A}/lv?project_id={_pid(ctx)}"), id=lv1["id"])
        gleich((x["vergeben"], x["frei"], x["ohne_lv"]), (True, True, True), "LV-Liste: Auftrag ohne LV")
        # Häkchen weg, neues LV: an die Firma vergeben, Positionen folgen
        lv2 = _lv(c, ctx, "Auftrag mit neuem LV")
        L = c.pj(f"{A}/lv/{lv2['id']}/vergabe", {"frei": True, "ohne_lv": False, "bieter": "Tischlerei Blank", "summe": 0})
        x = finde(c.gj(f"{A}/lv?project_id={_pid(ctx)}"), id=lv2["id"])
        gleich((L["status"], x["frei"], x["ohne_lv"]), ("vergeben", True, False), "Auftrag mit neuem LV")
        # ausgeschrieben, nicht beauftragt
        lv3 = _lv(c, ctx, "Nicht vergeben", ROHBAU)
        _angebot(c, lv3["id"], "Bau Müller GmbH", {"p1": 47.50, "p2": 19.90})
        c.post(f"{A}/lv/{lv1['id']}/vergabe", {"nicht": True}, expect=400)   # vergebenes LV: erst Vergabe aufheben
        L = c.pj(f"{A}/lv/{lv3['id']}/vergabe", {"nicht": True, "grund": "entfallen", "notiz": "in Rohbau enthalten"})
        gleich((L["status"], L["vergabe"]["nicht_vergeben"]["grund"], L["vergabe"]["nicht_vergeben"]["notiz"]), ("nicht_vergeben", "entfallen", "in Rohbau enthalten"),
               "nicht vergeben mit Grund")
        x = finde(c.gj(f"{A}/lv?project_id={_pid(ctx)}"), id=lv3["id"])
        gleich((x["status"], x["vergeben"], x["prognose"], x["n_angebote"]), ("nicht_vergeben", False, 0, 1), "LV-Liste: nicht vergeben zählt nicht in der Prognose")
        L = c.delete(f"{A}/lv/{lv3['id']}/vergabe").json
        gleich((L["status"], "nicht_vergeben" in L["vergabe"]), ("versendet", False), "nicht vergeben zurückgenommen")
        # erneut nicht vergeben, dann doch vergeben: Kennzeichen verschwindet
        c.pj(f"{A}/lv/{lv3['id']}/vergabe", {"nicht": True, "grund": "zurueckgestellt"})
        L = c.pj(f"{A}/lv/{lv3['id']}/vergabe", {"frei": True, "bieter": "Bau Müller GmbH", "summe": 100})
        gleich((L["status"], "nicht_vergeben" in L["vergabe"]), ("vergeben", False), "Vergabe nach „nicht vergeben“")
    finally:
        for x in (lv1, lv2, lv3):
            _weg(c, x)


def test_nachlass_skonto_in_rechnung(ctx):
    """Auftrag mit 2 % Nachlass und 3 % Skonto in 14 Tagen: Abzug in der Rechnung, Skontofrist ab Eingang, Änderung je Rechnung."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Skonto", [_t("t1", "Fliesenarbeiten"), _p("p1", "Bodenfliesen 60 × 60 cm", 50, ep_s=45.0)])
        L = _vergeben(c, lv["id"], "Fliesen Rossi", {"p1": 48.20}, nachlass=2, skonto=3, skonto_tage=14)
        gleich((L["vergabe"]["nachlass"], L["vergabe"]["skonto"], L["vergabe"]["skonto_tage"]), (2.0, 3.0, 14), "Konditionen aus dem Angebot")
        gleich(L["calc"]["auftrag"], 2361.80, "Auftrag 50 × 48,20 − 2 %")
        c.pj(f"{A}/lv/{lv['id']}/aufmass", {"pos_id": "p1", "ort": "Bad EG", "formel": "5 × 10"})
        L, r = _re_neu(c, lv["id"], art="abschlag", eingang="2026-11-02")
        x = _calc_re(L, r["id"])
        # 2.410,00 − 48,20 = 2.361,80; − 5 % 118,09 = 2.243,71; brutto 2.670,01; Skonto 3 % 80,10 → 2.589,91
        gleich((x["leistung"], x["nachlass"], x["einbehalt"]), (2410.00, 48.20, 118.09), "Leistung, Nachlass, Einbehalt")
        gleich((x["zahlung"], x["brutto"]), (2243.71, 2670.01), "Zahlbetrag netto/brutto")
        gleich((x["skonto"], x["brutto_skonto"], x["skonto_bis"]), (80.10, 2589.91, "2026-11-16"), "Skonto")
        L = c.uj(f"{A}/rechnungen/{r['id']}", {"skonto": 2, "skonto_tage": 10})
        x = _calc_re(L, r["id"])
        gleich((x["skonto"], x["brutto_skonto"], x["skonto_bis"]), (53.40, 2616.61, "2026-11-12"), "Skonto in der Rechnung geändert")
        L = c.uj(f"{A}/rechnungen/{r['id']}", {"skonto": "", "skonto_tage": ""})
        gleich(_calc_re(L, r["id"])["skonto_pct"], 3.0, "leer = wieder wie im Auftrag")
        c.get(f"{A}/lv/{lv['id']}/pdf?art=rechnung&rid={r['id']}&freigabe=1").ist_pdf()
    finally:
        _weg(c, lv)


def test_nachtraege(ctx):
    """Nachträge nach der Vergabe: Preise je Nachtrag, Summen je Status, Prognose; im Auftrags-GAEB (X86) enthalten, nicht in X83."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Nachtrag", ROHBAU)
        L = _vergeben(c, lv["id"])
        I = L["data"]["items"] + [_p("n1", "Zusätzliche Abdichtung Kelleraußenwand", 6, nt="NT01", nt_status="beauftragt", nt_grund="Drückendes Wasser"),
                                  _p("n2", "Mehrmenge Bodenaustausch", 2, "m³", nt="NT02"),
                                  _p("n3", "Stemmarbeiten Bestand", 1, "psch", nt="NT03", nt_status="abgelehnt")]
        L = c.uj(f"{A}/lv/{lv['id']}", {"data": {"items": I}, "vergabe": {"preise": {"n1": 45.00, "n2": 120.00, "n3": 500.00}}})
        gleich(finde(L["data"]["items"], id="n2")["nt_status"], "angemeldet", "Vorgabe-Status eines Nachtrags")
        gleich(L["calc"]["auftrag"], 11409.00, "Hauptauftrag ohne Nachträge 5.784,00 + 5.625,00")
        gleich(L["calc"]["nachtraege"], {"angemeldet": 240.00, "beauftragt": 270.00, "abgelehnt": 500.00}, "Nachträge je Status")
        x = finde(c.gj(f"{A}/lv?project_id={_pid(ctx)}"), id=lv["id"])
        gleich((x["nachtraege"], x["nt_angemeldet"], x["n_nt"]), (270.00, 240.00, 3), "Nachträge in der LV-Liste")
        gleich(x["prognose"], 11919.00, "Prognose 11.409 + 270 + 240")
        # Rechnungsprüfung: angemeldete Nachträge zählen je nach Büro-Einstellung mit oder erst nach Beauftragung
        import time
        L = c.pj(f"{A}/lv/{lv['id']}/aufmass", {"zeilen": [{"pos_id": "n1", "formel": "6"}, {"pos_id": "n2", "formel": "2"}]})
        l0 = L["calc"]["leistung"]
        try:
            c.uj(f"{A}/einstellungen/abrechnung", {"nt_nur_beauftragt": True}); time.sleep(3.5)
            l1 = c.gj(f"{A}/lv/{lv['id']}")["calc"]["leistung"]
            gleich(round(l0 - l1, 2), 240.00, "nur beauftragte Nachträge: angemeldeter NT02 (2 × 120) zählt nicht")
        finally:
            c.uj(f"{A}/einstellungen/abrechnung", {"nt_nur_beauftragt": False})
        x86 = c.get(f"{A}/lv/{lv['id']}/gaeb?dp=86").body.decode("utf-8")
        pruefe("Zusätzliche Abdichtung Kelleraußenwand" in x86, "Nachtrag fehlt im Auftrags-GAEB X86")
        pruefe("<UP>48.20</UP>" in x86, "Auftragspreis fehlt im X86")
        x83 = c.get(f"{A}/lv/{lv['id']}/gaeb?dp=83").body.decode("utf-8")
        pruefe("Zusätzliche Abdichtung" not in x83 and "<UP>" not in x83, "X83 (Angebotsaufforderung) ohne Nachträge und ohne Preise")
    finally:
        _weg(c, lv)


# ---------------------------------------------------------------- Austausch GAEB / Excel / PDF
def test_gaeb_export_und_reimport(ctx):
    """LV als GAEB X83 ausgeben und in ein neues LV einlesen; Angebot als X84 ausgeben und als Angebot wieder einlesen."""
    c = ctx.admin
    lv = neu = None
    try:
        items = ROHBAU + [_t("t2", "Zulagen", 2), _p("p3", "Stundenlohn Facharbeiter", 4, "h", art="E", gb=True),
                          _p("p4", "Alternativ Porenbeton", 12.5, art="A"), _p("h1", "Hinweis", 0, "", art="T", lang="Alle Wände nach DIN EN 1996.")]
        lv = _lv(c, ctx, "GAEB", items)
        x83 = c.get(f"{A}/lv/{lv['id']}/gaeb?dp=83")
        pruefe(x83.body.lstrip().startswith(b"<?xml") and b"<GAEB" in x83.body[:400], "X83 ist keine GAEB-XML-Datei")
        neu = c.pj(f"{A}/lv", {"project_id": _pid(ctx), "name": ""})   # leerer Name → der Name kommt aus der Datei
        L = c.post(f"{A}/lv/{neu['id']}/import", dateien={"datei": ("Rohbau.x83", x83.body, "application/xml")}, felder={"ziel": "lv"}).json
        pruefe("eingelesen" in (L.get("hinweis") or ""), f"Hinweis nach dem Einlesen: {L.get('hinweis')!r}")
        gleich(L["name"], lv["name"], "LV-Name aus der GAEB-Datei")
        GAEB_EH = {"m²": "m2", "m³": "m3", "qm": "m2", "Stk": "St", "lfm": "m", "Std": "h"}   # Export schreibt GAEB-Einheiten
        soll = [(x["typ"], x["oz"], x["kurz"], x.get("menge"), GAEB_EH.get(x.get("einheit"), x.get("einheit")), x.get("art")) for x in lv["data"]["items"]]
        ist = [(x["typ"], x["oz"], x["kurz"], x.get("menge"), x.get("einheit"), x.get("art")) for x in L["data"]["items"]]
        gleich(ist, soll, "Inhalt nach GAEB hin und zurück")
        gleich(finde(L["data"]["items"], oz="01.01.0010").get("gb"), True, "Bedarfsposition mit Gesamtbetrag")
        # Angebot als X84 ausgeben und als Angebot eines anderen Bieters wieder einlesen
        L0, a = _angebot(c, lv["id"], "Rohbau Schulte & Söhne", {"p1": 48.20, "p2": 18.75, "p3": 52.50})
        x84 = c.get(f"{A}/lv/{lv['id']}/gaeb?dp=84&angebot={a['id']}").body
        pruefe(b"<UP>48.20</UP>" in x84, "Einheitspreis fehlt im X84")
        bieter = ctx.name("Bieter")
        L = c.post(f"{A}/lv/{lv['id']}/import", dateien={"datei": ("Angebot.x84", x84, "application/xml")}, felder={"ziel": "angebot", "bieter": bieter}).json
        b = finde(L["angebote"], bieter=bieter)
        pruefe(b, "eingelesenes Angebot fehlt")
        gleich(b["preise"], {"p1": 48.2, "p2": 18.75, "p3": 52.5}, "Preise aus dem X84")
        gleich(finde(L["calc"]["angebote"], id=b["id"])["summe"], 11619.00, "Angebotssumme 5.784 + 5.625 + 4 × 52,50")
        r = c.post(f"{A}/lv/{lv['id']}/import", dateien={"datei": ("kaputt.x83", b"<kein xml", "application/xml")}, felder={"ziel": "lv"}, expect=400).json
        pruefe(r.get("error"), "Fehlermeldung bei kaputter Datei")
    finally:
        _weg(c, lv)
        _weg(c, neu)


def test_excel_export_und_reimport(ctx):
    """LV als Excel ausgeben und in ein neues LV einlesen – gleiche Titel und Positionen, keine Summenzeile als Titel."""
    c = ctx.admin
    lv = neu = None
    try:
        lv = _lv(c, ctx, "Excel", ROHBAU + [_t("t2", "Putzarbeiten"), _p("p3", "Kantenschutzschiene", 85.5, "m", ep_s=4.2)])
        x = c.get(f"{A}/lv/{lv['id']}/excel").ist_xlsx()
        neu = c.pj(f"{A}/lv", {"project_id": _pid(ctx), "name": ctx.name("ExcelNeu")})
        L = c.post(f"{A}/lv/{neu['id']}/import", dateien={"datei": ("LV.xlsx", x.body, XLSX)}, felder={"ziel": "lv"}).json
        soll = [(y["typ"], y["oz"], y["kurz"], y.get("menge"), y.get("einheit")) for y in lv["data"]["items"]]
        ist = [(y["typ"], y["oz"], y["kurz"], y.get("menge"), y.get("einheit")) for y in L["data"]["items"]]
        gleich(len([y for y in ist if y[0] == "pos"]), 3, "Anzahl Positionen nach dem Einlesen")
        pruefe(not any(y[0] == "titel" and "Summe" in y[2] for y in ist), f"Summenzeile der Excel-Datei wurde als Titel eingelesen: {ist[-1]}")
        gleich(ist, soll, "Inhalt nach Excel hin und zurück")
    finally:
        _weg(c, lv)
        _weg(c, neu)


def test_angebot_aus_excel_und_pdf(ctx):
    """Ausgefülltes Excel und Angebots-PDF einer Firma einlesen: Preise landen über die OZ beim Bieter."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "AngebotDatei", ROHBAU)
        x = _xlsx([["Angebot Bau Müller"], [], ["OZ", "Kurztext", "Langtext", "Menge", "Einheit", "Art", "EP", "GP"], ["01", "Mauerarbeiten"],
                   ["01.0010", "Mauerwerk KS 17,5 cm", "", 120, "m²", "N", "47,90"], ["01.0020", "Innenputz Kalkgips", "", 300, "m²", "N", 19.10]])
        L = c.post(f"{A}/lv/{lv['id']}/import", dateien={"datei": ("Angebot Müller.xlsx", x, XLSX)}, felder={"ziel": "angebot", "bieter": "Bau Müller GmbH"}).json
        a = finde(L["angebote"], bieter="Bau Müller GmbH")
        pruefe(a, "Angebot aus Excel fehlt")
        gleich(a["preise"], {"p1": 47.9, "p2": 19.1}, "Preise aus Excel")
        # 120 × 47,90 + 300 × 19,10 = 5.748,00 + 5.730,00 = 11.478,00
        gleich(finde(L["calc"]["angebote"], id=a["id"])["summe"], 11478.00, "Angebotssumme aus Excel")
        pdf = _pdf(["Rohbau Schulte & Söhne", "Angebot Nr. 2026-311", "01.0010 Mauerwerk KS 17,5 cm 120,000 m2 48,20 5.784,00",
                    "01.0020 Innenputz Kalkgips 300,000 m2 18,75 5.625,00", "Summe netto 11.409,00"])
        L = c.post(f"{A}/lv/{lv['id']}/angebot-pdf", dateien={"datei": ("Angebot Schulte.pdf", pdf, "application/pdf")},
                   felder={"bieter": "Rohbau Schulte & Söhne"}).json
        b = finde(L["angebote"], bieter="Rohbau Schulte & Söhne")
        pruefe(b, f"Angebot aus PDF fehlt ({L.get('hinweis')})")
        gleich(b["preise"], {"p1": 48.2, "p2": 18.75}, "Preise aus der PDF (Menge × EP = GP)")
        K = {y["id"]: y for y in L["calc"]["angebote"]}
        gleich((K[b["id"]].get("rang"), K[a["id"]].get("rang")), (1, 2), "Rang: Schulte 11.409,00 vor Müller 11.478,00")
        c.post(f"{A}/lv/{lv['id']}/angebot-pdf", dateien={"datei": ("leer.pdf", _pdf(["Kein Preis hier"]), "application/pdf")}, expect=400)
    finally:
        _weg(c, lv)


def test_lv_aus_dokumenten(ctx):
    """LV aus beliebigen Dokumenten: Angebots-PDF (Preise als Schätzung), Word, Textliste – ohne KI erkannt; KI nur auf Nachfrage."""
    import io, zipfile
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "AusDokument")
        pdf = _pdf(["Rohbau Schulte & Söhne", "Angebot Nr. 2026-311", "01 Mauerarbeiten", "01.0010 Mauerwerk KS 17,5 cm 120,000 m2 48,20 5.784,00",
                    "01.0020 Innenputz Kalkgips 300,000 m2 18,75 5.625,00", "Summe netto 11.409,00"])
        L = c.post(f"{A}/lv/{lv['id']}/dok", dateien={"datei": ("Angebot Schulte.pdf", pdf, "application/pdf")}).json
        d = L["dokumente"][-1]
        gleich((d["n_pos"], d["n_titel"], d["n_ep"]), (2, 1, 2), "Angebots-PDF: Positionen, Titel, Preise")
        V = c.gj(f"{A}/lvdok/{d['id']}?auslese=1")["vorschlag"]
        p = [x for x in V if x["typ"] == "pos"]
        gleich([(x["oz"], x["kurz"], x["menge"], x["einheit"], x["ep_s"]) for x in p],
               [("01.0010", "Mauerwerk KS 17,5 cm", 120.0, "m2", 48.2), ("01.0020", "Innenputz Kalkgips", 300.0, "m2", 18.75)], "Angebots-PDF: Werte")
        # Word (.docx) mit Tabelle
        W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
        par = lambda t: f"<w:p><w:r><w:t>{t}</w:t></w:r></w:p>"   # noqa: E731
        zeile = lambda *z: "<w:tr>" + "".join(f"<w:tc>{par(x)}</w:tc>" for x in z) + "</w:tr>"   # noqa: E731
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("word/document.xml", f'<?xml version="1.0" encoding="UTF-8"?><w:document {W}><w:body>{par("03 Malerarbeiten")}<w:tbl>'
                       + zeile("03.0010", "Wandflächen streichen", "250,000", "m2") + zeile("03.0020", "Decken streichen", "80,000", "m2") + "</w:tbl></w:body></w:document>")
        L = c.post(f"{A}/lv/{lv['id']}/dok", dateien={"datei": ("Maler.docx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}).json
        d = L["dokumente"][-1]
        gleich((d["n_pos"], d["n_titel"], d["name"]), (2, 1, "Maler.pdf"), "Word: Positionen und Titel")
        # Textliste
        L = c.post(f"{A}/lv/{lv['id']}/dok", dateien={"datei": ("liste.txt", "04.0010 Wandfliesen verlegen 45,000 m2\n".encode(), "text/plain")}).json
        gleich(L["dokumente"][-1]["n_pos"], 1, "Text: Position")
        c.post(f"{A}/lv/{lv['id']}/dok", dateien={"datei": ("alt.doc", b"\xd0\xcf\x11\xe0" + b"\x00" * 100, "application/msword")}, expect=400)
        c.post(f"{A}/lvdok/{d['id']}/ki", {"ki": "intern"}, expect=400)   # KI nur mit gewählter KI
    finally:
        _weg(c, lv)


def test_pdf_spalten_langtext_kumuliert(ctx):
    """Angebot als LV-Ausdruck (Menge und Preise in der letzten Zeile des Langtexts) und kumulierte Abschlagsrechnung
    (Menge bisher / aktuell / gesamt): Preise und Gesamtmengen kommen aus den richtigen Spalten."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Spalten", ROHBAU)
        kopf = [(50, "OZ", False), (110, "Leistungsbeschreibung", False), (390, "Menge", True), (396, "ME", False), (480, "EP", True), (560, "GP", True)]
        ang = _pdf_spalten([[(50, "Angebot Bau Krause GmbH", False)], kopf, [(50, "01", False), (110, "Mauerarbeiten", False)],
                            [(50, "01.0010", False), (110, "Mauerwerk KS 17,5 cm", False)], [(110, "Kalksandstein KS 12-1,8, Dicke 17,5 cm,", False)],
                            [(110, "Höhe bis 3,00 m, liefern und einbauen.", False)],
                            [(390, "120,000", True), (396, "m2", False), (480, "47,10", True), (560, "5.652,00", True)],
                            [(50, "01.0020", False), (110, "Innenputz Kalkgips", False)], [(110, "einlagig, 15 mm, Q2", False)],
                            [(390, "300,000", True), (396, "m2", False), (480, "19,40", True), (560, "5.820,00", True)],
                            [(110, "Summe netto", False), (560, "11.472,00", True)]])
        L = c.post(f"{A}/lv/{lv['id']}/angebot-pdf", dateien={"datei": ("Angebot Krause.pdf", ang, "application/pdf")}, felder={"bieter": "Bau Krause GmbH"}).json
        a = finde(L["angebote"], bieter="Bau Krause GmbH")
        pruefe(a, f"Angebot aus dem LV-Ausdruck fehlt ({L.get('hinweis')})")
        gleich(a["preise"], {"p1": 47.1, "p2": 19.4}, "Preise aus der letzten Zeile des Langtexts")
        _vergeben(c, lv["id"])
        L, r = _re_neu(c, lv["id"], art="abschlag")
        sp = [(40, "OZ", False), (85, "Kurztext", False), (215, "ME", False), (290, "EP", True), (365, "Menge bisher", True), (445, "Menge aktuell", True),
              (522, "Menge gesamt", True), (590, "Betrag ges.", True)]
        re_ = _pdf_spalten([[(50, "Rohbau Schulte & Söhne", False)], [(50, "3. Abschlagsrechnung (kumuliert)", False)], [(50, "Rechnung Nr. AR 0042/26", False)],
                            [(50, "Datum 06.11.2026", False)], sp,
                            [(40, "01.0010", False), (85, "Mauerwerk KS 17,5 cm", False), (215, "m2", False), (290, "48,20", True), (365, "60,000", True),
                             (445, "30,000", True), (522, "90,000", True), (590, "4.338,00", True)],
                            [(40, "01.0020", False), (85, "Innenputz Kalkgips", False), (215, "m2", False), (290, "18,75", True), (365, "100,000", True),
                             (445, "50,000", True), (522, "150,000", True), (590, "2.812,50", True)],
                            [(300, "Gesamtsumme netto", False), (590, "7.150,50", True)]])
        L = c.post(f"{A}/rechnungen/{r['id']}/beleg", dateien={"datei": ("AR 0042.pdf", re_, "application/pdf")}, felder={"ordner": '"nein"'}).json
        R = finde(L["rechnungen"], id=r["id"])
        P = (R["belege"][0].get("auslese") or {}).get("pos") or {}
        gleich({k: v.get("menge") for k, v in P.items()}, {"p1": 90.0, "p2": 150.0}, "kumulierte Rechnung: Menge gesamt (nicht bisher/aktuell)")
        gleich((R["re_nr"], R["datum"], R["gefordert"]), ("AR 0042/26", "2026-11-06", 7150.5), "Nummer, Datum, kumulierter Nettobetrag")
    finally:
        _weg(c, lv)


def test_rechnung_pdf_beleg_auslesen(ctx):
    """Rechnungs-PDF der Firma an die Rechnung hängen: Nummer, Datum und Forderung werden erkannt; Datei erkennen ordnet sie dem LV zu."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Beleg", ROHBAU)
        _vergeben(c, lv["id"])
        L, r = _re_neu(c, lv["id"], art="abschlag")
        pdf = _pdf(["Rohbau Schulte & Söhne", "1. Abschlagsrechnung", "Bauvorhaben: T101 Neubau EFH Am Birkenhain",
                    "Rechnungsnummer: AR-2026-117", "Rechnungsdatum: 03.11.2026",
                    "01.0010 Mauerwerk KS 17,5 cm 60,000 m2 48,20 2.892,00", "01.0020 Innenputz Kalkgips 100,000 m2 18,75 1.875,00",
                    "Summe netto 4.767,00", "zzgl. 19 % MwSt 905,73", "Rechnungsbetrag 5.672,73"])
        L = c.post(f"{A}/rechnungen/{r['id']}/beleg", dateien={"datei": ("AR-2026-117.pdf", pdf, "application/pdf")}, felder={"ordner": '"nein"'}).json
        R = finde(L["rechnungen"], id=r["id"])
        gleich((R["re_nr"], R["datum"], R["gefordert"]), ("AR-2026-117", "2026-11-03", 4767.0), "aus der PDF übernommen")
        gleich(len(R["belege"]), 1, "Beleg an der Rechnung")
        bid = R["belege"][0]["id"]
        c.get(f"{A}/belege/{bid}").ist_pdf()
        A_ = (R["belege"][0].get("auslese") or {}).get("pos") or {}
        gleich((A_.get("p1", {}).get("menge"), A_.get("p2", {}).get("menge")), (60.0, 100.0), "geforderte Mengen je Position")
        c.post(f"{A}/rechnungen/{r['id']}/beleg", dateien={"datei": ("x.txt", b"keine PDF", "text/plain")}, expect=400)
        e = c.post(f"{A}/ava/erkennen", dateien={"datei": ("Rechnung Schulte.pdf", pdf, "application/pdf")}).json
        gleich(e.get("dok"), "rechnung", "Art der Datei")
        gleich(e.get("firma"), "Rohbau Schulte & Söhne", "Firma aus den Adressen")
        pruefe(finde(e.get("projekte"), id=_pid(ctx)), f"Projekt T101 nicht erkannt: {e.get('projekte')}")
        pruefe(finde(e.get("lvs"), id=lv["id"]), "passendes LV nicht vorgeschlagen")
        c.get(f"{A}/lv/{lv['id']}/pdf?art=rechnung&rid={r['id']}&freigabe=1").ist_pdf()   # Freigabe mit angehängter Firmenrechnung
        L = c.delete(f"{A}/belege/{bid}").json
        gleich(finde(L["rechnungen"], id=r["id"])["belege"], [], "Beleg gelöscht")
    finally:
        _weg(c, lv)


def test_pdf_ausdrucke(ctx):
    """LV als PDF (leer zum Ausfüllen und mit Kostenschätzung) und über den Druck-Editor (Entwurf und fertiger Ausdruck)."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Druck", ROHBAU + [_p("h1", "Hinweis", 0, "", art="T", lang="Mörtelgruppe IIa, Steine nach DIN 20000-402.")])
        c.uj(f"{A}/lv/{lv['id']}", {"data": {"items": c.gj(f"{A}/lv/{lv['id']}")["data"]["items"], "vorbem": "Vorbemerkungen zum Rohbau."}})
        c.get(f"{A}/lv/{lv['id']}/pdf").ist_pdf()
        c.get(f"{A}/lv/{lv['id']}/pdf?art=lv&preise=1&fotos=0").ist_pdf()
        c.req("POST", f"{A}/lv/{lv['id']}/druck", {"layout": {"preise": "schaetzung", "deckblatt": True}}).ist_pdf()
        e = c.pj(f"{A}/lv/{lv['id']}/druck", {"schritt": "entwurf", "layout": {"preise": "leer", "felder": {"Hinweis": "Abgabe bis 20.11.2026"}}})
        pruefe(base64.b64decode(e["pdf"])[:5] == b"%PDF-", "Entwurf enthält keine PDF")
        gleich(e["felder"]["Titel"], "Leistungsverzeichnis", "Feld Titel")
        gleich(e["felder"]["Hinweis"], "Abgabe bis 20.11.2026", "eigener Hinweis im Deckblatt")
        gleich(e["layout"]["preise"], "leer", "Layout")
        c.req("POST", f"{A}/lv/{lv['id']}/druck", {"layout": {"preise": "auftrag"}}).ist_pdf()   # ohne Vergabe → Schätzpreise
        c.get(f"{A}/lv/999999999/pdf", expect=404)
    finally:
        _weg(c, lv)


# ---------------------------------------------------------------- Kataloge und Suche
def test_katalog_suche_baudaten(ctx):
    """Kopierquelle: Kataloge auflisten, in den Baudaten nach OZ und Text suchen, Gruppe öffnen – Preis im Rahmen der Spanne."""
    c = ctx.admin
    gleich(type(c.gj(f"{A}/katalog").get("kataloge")), list, "Liste der eingelesenen Kataloge")
    c.get(f"{A}/katalog/999999999", expect=404)
    c.get(f"{A}/katalog/999999999/suche?q=Mauerwerk", expect=404)
    k = finde(c.gj(f"{A}/baudaten/kataloge"), id="bd-gk3")
    pruefe(k and k["n_pos"] > 1000, f"Baudaten-Katalog gk3 fehlt oder ist leer: {k}")
    S = c.gj(f"{A}/katalog/bd-gk3/suche?q=000.01.001")
    I = S["data"]["items"]
    gleich((I[0]["typ"], I[0]["oz"], I[0]["kurz"]), ("titel", "000.01", "Einrichten und Räumen"), "Gruppe als Titel")
    p = finde(I, oz="000.01.001.01001")
    pruefe(p, "Position 000.01.001.01001 nicht gefunden")
    gleich((p["kurz"], p["einheit"], p["kg"]), ("Baustelle einrichten und räumen, Bauvolumen bis 50.000 €", "psch", "391"), "Position aus den Baudaten")
    pruefe(p["ep_s"] and p["spanne"][0] <= p["ep_s"] <= p["spanne"][1], f"Schätzpreis {p['ep_s']} außerhalb der Spanne {p.get('spanne')}")
    gleich(p["quelle"], "Baudaten 000.01.001.01001", "Herkunft")
    T = c.gj(f"{A}/katalog/bd-gk3/suche?q=" + "Baustelle%20einrichten%20Bauvolumen")
    pruefe(finde(T["data"]["items"], oz="000.01.001.01001"), "Textsuche findet die Position nicht")
    pruefe(not c.gj(f"{A}/katalog/bd-gk3/suche?q=")["data"]["items"], "leere Suche liefert nichts")
    G = c.gj(f"{A}/katalog/bd-gk3")
    pruefe(finde(G["gewerke"], id="kat:bd-gk3:000.01"), "Gruppe 000.01 fehlt in der Gruppenliste")
    pruefe(finde(c.gj(f"{A}/katalog/bd-gk3/gewerk/000.01")["data"]["items"], oz="000.01.001.01001"), "Position fehlt in der Gruppe 000.01")
    B = c.gj(f"{A}/baudaten/suche?q=000.01.001")
    pruefe(B["gesamt"] >= 3 and finde(B["positionen"], code="000.01.001.01001"), "Baudaten-Suche über /api/baudaten/suche")


def test_katalogposition_ins_lv(ctx):
    """Position aus der Kopierquelle (Baudaten) ins LV übernehmen: Texte, Einheit, KG und Schätzpreis bleiben erhalten."""
    c = ctx.admin
    lv = None
    try:
        p = finde(c.gj(f"{A}/katalog/bd-gk3/suche?q=000.01.001")["data"]["items"], oz="000.01.001.01001")
        pruefe(p, "Katalogposition nicht gefunden")
        lv = _lv(c, ctx, "Katalog", [_t("t1", "Baustelleneinrichtung"), {**p, "id": "k1", "menge": 1}])
        x = finde(lv["data"]["items"], id="k1")
        gleich((x["oz"], x["kurz"], x["einheit"], x["kg"], x["quelle"]),
               ("01.0010", p["kurz"], "psch", "391", "Baudaten 000.01.001.01001"), "übernommene Position (neu nummeriert)")
        gleich(lv["calc"]["schaetzung"], p["ep_s"], "Schätzung = 1 psch × Katalogpreis")
    finally:
        _weg(c, lv)


def test_suche_volltext(ctx):
    """Volltextsuche über alle LVs: findet Position, Langtext und Bieter (Umlaute egal)."""
    c = ctx.admin
    lv = None
    try:
        wort = ctx.name("Kellerlichtschacht").lower()
        lv = _lv(c, ctx, "Suche", [_t("t1", "Ausbau"), _p("p1", f"Lichtschacht {wort}", 2, "St", lang="GFK-Lichtschacht mit Rost, begehbar"),
                                   _p("p2", "Kellerfenster", 2, "St", lang="Kunststoff, Größe 100 × 50 cm")])
        _angebot(c, lv["id"], "Fensterbau Nowak", {"p1": 380.0})
        T = c.gj(f"{A}/suche?q={wort}&pid={_pid(ctx)}")["treffer"]
        t = finde(T, pos_id="p1")
        pruefe(t and t["lv_id"] == lv["id"] and t["art"] == "pos", f"Position nicht gefunden: {T[:3]}")
        T = c.gj(f"{A}/suche?q=GROESSE%20kunststoff&pid={_pid(ctx)}")["treffer"]
        pruefe(finde(T, lv_id=lv["id"], pos_id="p2"), "Suche „GROESSE kunststoff“ findet den Langtext „Größe … Kunststoff“ nicht")
        T = c.gj(f"{A}/suche?q=nowak&pid={_pid(ctx)}")["treffer"]
        pruefe(finde(T, lv_id=lv["id"], art="angebot"), "Bieter wird nicht gefunden")
        gleich(c.gj(f"{A}/suche?q=x")["treffer"], [], "zu kurze Suche")
    finally:
        _weg(c, lv)


def test_lv_kopieren(ctx):
    """LV als Vorlage kopieren: Texte ja, Nachträge nein, Mengen auf Wunsch 0, keine Preise und Angebote."""
    c = ctx.admin
    lv = kopie = None
    try:
        lv = _lv(c, ctx, "Vorlage", ROHBAU)
        L = _vergeben(c, lv["id"])
        c.uj(f"{A}/lv/{lv['id']}", {"data": {"items": L["data"]["items"] + [_p("n1", "Nachtrag Abdichtung", 6, nt="NT01")]}})
        kopie = c.pj(f"{A}/lv", {"project_id": _pid(ctx), "name": ctx.name("Kopie"), "kopie_von": lv["id"], "mengen": False})
        I = kopie["data"]["items"]
        gleich([(x["typ"], x["oz"], x["kurz"]) for x in I], [(x["typ"], x["oz"], x["kurz"]) for x in lv["data"]["items"]], "Texte und OZ kopiert")
        gleich([x["menge"] for x in I if x["typ"] == "pos"], [0, 0], "Mengen auf 0")
        pruefe(not any(x.get("nt") for x in I), "Nachtrag darf nicht mitkopiert werden")
        pruefe(not {x["id"] for x in I} & {"p1", "p2"}, "Kopie braucht eigene Positions-IDs")
        gleich((kopie["angebote"], kopie["vergabe"], kopie["status"]), ([], {}, "entwurf"), "Kopie ohne Angebote und Vergabe")
        c.post(f"{A}/lv", {"project_id": _pid(ctx), "kopie_von": 999999999}, expect=404)
    finally:
        _weg(c, lv)
        _weg(c, kopie)


def test_tuerliste_ins_lv(ctx):
    """Fenster- und Türliste anlegen und als neues LV übernehmen: gleiche Türen = eine Position mit Stückzahl."""
    c, pid = ctx.admin, _pid(ctx)
    liste = lv_id = None
    try:
        r = c.pj(f"{A}/projekt/{pid}/tuerlisten", {"name": ctx.name("Türliste")})
        liste = r["liste"]
        T = [{"nr": "T01", "raum": "0.01", "art": "Innentür", "flg": "1-flg.", "b": "885", "h": "2135", "brand": "T30", "din": "DIN L"},
             {"nr": "T02", "raum": "0.02", "art": "Innentür", "flg": "1-flg.", "b": "885", "h": "2135", "brand": "T30", "din": "DIN R", "anzahl": "2"},
             {"nr": "F01", "raum": "0.01", "art": "Fenster", "b": "1010", "h": "1260"}]
        d = c.uj(f"{A}/projekt/{pid}/tueren?liste={liste}", {"tueren": T})
        gleich(len(d["tueren"]), 3, "Türen gespeichert")
        gleich(len(c.gj(f"{A}/projekt/{pid}/tueren?liste={liste}")["tueren"]), 3, "Türen gelesen")
        c.get(f"{A}/projekt/{pid}/tueren.xlsx?liste={liste}").ist_xlsx()
        r = c.pj(f"{A}/projekt/{pid}/tueren/lv", {"liste": liste, "form": "merkmale", "din_trennen": False, "name": ctx.name("Türen")})
        lv_id = r["lv"]
        gleich((r["positionen"], r["tueren"]), (2, 3), "Positionen und Türen")
        I = c.gj(f"{A}/lv/{lv_id}")["data"]["items"]
        P = [x for x in I if x["typ"] == "pos" and x["art"] != "T"]
        gleich([(x["oz"], x["menge"], x["einheit"], x["kg"]) for x in P], [("01.0010", 1, "St", "334"), ("02.0010", 3, "St", "344")],
               "Fenster 1 Stück, Innentüren T30 3 Stück")
        gleich([x["kurz"] for x in I if x["typ"] == "titel"], ["Fenster", "Innentüren"], "Titel je Gruppe")
        pruefe(finde(c.gj(f"{A}/projekt/{pid}/tueren/lv?liste={liste}"), lv=lv_id), "LV wird als verknüpft gemeldet")
    finally:
        if lv_id:
            c.delete(f"{A}/lv/{lv_id}", expect=None)
        if liste:
            c.delete(f"{A}/projekt/{pid}/tuerlisten/{liste}", expect=None)


# ---------------------------------------------------------------- Rechte
def test_rechte_ohne_ava_und_gast(ctx):
    """Ohne Anmeldung 401, ohne Freigabe der AVA (Bernd Krämer, nur Bautagebuch) 403 – lesen wie schreiben."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Rechte", ROHBAU)
        gast = ctx.gast()
        for m, p in (("GET", "/lv"), ("GET", f"/lv/{lv['id']}"), ("GET", f"/lv/{lv['id']}/pdf"), ("POST", "/lv"), ("PUT", f"/lv/{lv['id']}")):
            gast.req(m, A + p, {} if m != "GET" else None, expect=401)
        bernd = ctx.anmelden("Bernd Krämer")
        for m, p in (("GET", "/me"), ("GET", "/lv"), ("GET", f"/lv/{lv['id']}"), ("GET", f"/lv/{lv['id']}/gaeb"), ("DELETE", f"/lv/{lv['id']}")):
            bernd.req(m, A + p, {} if m != "GET" else None, expect=403)
        bernd.post(f"{A}/lv", {"project_id": _pid(ctx, "T102"), "name": "darf nicht"}, expect=403)
        gleich(c.gj(f"{A}/lv/{lv['id']}")["name"], lv["name"], "LV nach den abgelehnten Zugriffen unverändert")
    finally:
        _weg(c, lv)


def test_rechte_projekt_sichtbarkeit(ctx):
    """LVs eines Projekts sehen nur dessen Bauleitung und Admins: Anna (Bauleiterin T101) ja, Clara Wolf nicht (404)."""
    c = ctx.admin
    lv = lv103 = None
    try:
        anna = ctx.anmelden("Anna Bauer")
        lv = anna.pj(f"{A}/lv", {"project_id": _pid(ctx, "T101"), "name": ctx.name("Anna")})
        gleich(anna.gj(f"{A}/lv/{lv['id']}")["name"], lv["name"], "Anna liest ihr LV")
        clara = ctx.anmelden("Clara Wolf")
        pruefe(not finde(clara.gj(f"{A}/projekte"), id=_pid(ctx, "T101")), "Clara sieht das Projekt T101")
        clara.get(f"{A}/lv?project_id={_pid(ctx, 'T101')}", expect=404)
        clara.get(f"{A}/lv/{lv['id']}", expect=404)
        clara.put(f"{A}/lv/{lv['id']}", {"name": "fremd"}, expect=404)
        clara.get(f"{A}/lv/{lv['id']}/excel", expect=404)
        clara.post(f"{A}/lv", {"project_id": _pid(ctx, "T101"), "name": "fremd"}, expect=404)
        pruefe(not finde(clara.gj(f"{A}/lv"), id=lv["id"]), "LV aus T101 in Claras LV-Liste")
        lv103 = clara.pj(f"{A}/lv", {"project_id": _pid(ctx, "T103"), "name": ctx.name("Clara")})   # T103 ohne Bauleitung: für alle
        gleich(c.gj(f"{A}/lv/{lv['id']}")["name"], lv["name"], "Admin sieht alles")
    finally:
        _weg(c, lv)
        _weg(c, lv103)


def test_angebotsbesprechung_und_bauvertrag(ctx):
    """Angebotsbesprechung zum Angebot: Konditionen eintragen, abschließen → Nachlass/Skonto im Angebot und im Auftrag,
    Sicherheiten bleiben erhalten; Bauvertrag aus dem Auftrag (BGB für Privat), PDF, unterschriebenes PDF zurück."""
    from lib import mini_pdf
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Vergabe", ROHBAU)
        L = _vergeben(c, lv["id"], "Bau Vogt")
        aid = L["vergabe"]["angebot_id"]
        L = c.uj(f"{A}/lv/{lv['id']}", {"rev": L["rev"], "vergabe": {"sicherheit": {"abnahme": "2026-11-11", "ma": {"form": "buergschaft", "buerge": "Sparkasse"}}}})
        d = c.pj(f"{A}/lv/{lv['id']}/besprechung", {"angebot_id": aid, "summe": 10000})
        vid = d["neu"]
        pruefe(finde(d["dokumente"], id=vid, art="besprechung"), "Protokoll fehlt in der Liste")
        d2 = c.pj(f"{A}/lv/{lv['id']}/besprechung", {"angebot_id": aid})
        gleich(d2["neu"], vid, "zweites Anlegen öffnet dasselbe Protokoll")
        c.uj(f"{A}/vergabedok/{vid}", {"angebot": {"nachlass": "1,5 %", "skonto": "2"}})
        c.uj(f"{A}/vergabedok/{vid}", {"angebot": {"skonto_tage": "10 Tage"}, "grundlagen": {"einbehalt": "3 % der Bruttoabrechnungssumme"}})
        c.get(f"{A}/vergabedok/{vid}.pdf?neu=1").ist_pdf()
        c.get(f"{A}/vergabedok/{vid}.pdf?blanko=1").ist_pdf()   # Blanko für die Baustelle (Gesprächsfelder als Linien)
        r = c.get(f"{A}/vergabedok/{vid}/suchen", expect=None)   # im Projektordner suchen – ohne Projektordner 502, sonst Liste
        pruefe(r.status in (200, 502), f"Suchen: 200/502 erwartet, kam {r.status}")
        if r.status == 200:
            pruefe(isinstance(r.json.get("treffer"), list), "Suchen liefert eine Trefferliste")
        r = c.post(f"{A}/vergabedok/{vid}/unterschrieben", dateien={"datei": ("foto.txt", b"kein Bild", "text/plain")}, expect=None)
        gleich(r.status, 400, "Einlesen: weder PDF noch Foto → abgelehnt")
        d = c.pj(f"{A}/vergabedok/{vid}/abschliessen")
        gleich(finde(d["dokumente"], id=vid)["status"], "abgeschlossen", "Status nach Abschluss")
        L = c.gj(f"{A}/lv/{lv['id']}")
        a = finde(L["angebote"], id=aid)
        gleich((a["nachlass"], a["skonto"], a["skonto_tage"]), (1.5, 2.0, 10), "Konditionen im Angebot (beide Eingaben zusammen)")
        gleich((L["vergabe"]["nachlass"], L["vergabe"]["skonto"]), (1.5, 2.0), "Konditionen im Auftrag")
        S = L["vergabe"]["sicherheit"]
        gleich((S["abnahme"], S["ma"]["buerge"], S["ma"]["pct"], S["gw_jahre"]), ("2026-11-11", "Sparkasse", 3.0, 5), "Sicherheiten ergänzt, nicht überschrieben")
        d = c.pj(f"{A}/lv/{lv['id']}/bauvertrag", {"art": "vertrag", "ag_art": "privat"})
        vt = finde(d["dokumente"], id=d["neu"])
        pruefe("BGB" in json.dumps(vt, ensure_ascii=False), "Vertrag für Privat nach BGB")
        c.get(f"{A}/vergabedok/{d['neu']}.pdf?neu=1").ist_pdf()
        vid2 = d["neu"]
        r = c.post(f"{A}/vergabedok/{vid2}/unterschrieben", dateien={"datei": ("Bauvertrag.pdf", mini_pdf("unterschrieben"), "application/pdf")}, expect=None)
        if r.status == 200:   # mit Projektordner: abgelegt, in der Datenbank nur der Verweis (Testserver: zum Ausprobieren in der Datenbank)
            x = finde(r.json["dokumente"], art="vertrag")
            gleich((x["status"], x["hat_pdf"]), ("unterschrieben", True), "Status nach Unterschrift, unterschriebene Fassung da")
            c.get(f"{A}/vergabedok/{vid2}.pdf").ist_pdf()
        else:   # ohne Projektordner (oder Testserver): nichts in der Datenbank, Status bleibt
            pruefe(r.status in (409, 502), f"ohne Ablage 409/502 erwartet, kam {r.status}")
            x = finde(c.gj(f"{A}/lv/{lv['id']}/vergabedok")["dokumente"], id=vid2)
            gleich((x["status"], x["hat_pdf"]), ("entwurf", False), "ohne Ablage nichts gespeichert")
    finally:
        _weg(c, lv)


def test_lv_weg_kette_bleibt(ctx):
    """LV löschen mit Angeboten (12.11.2026): nur das LV ist weg (meta.lv_weg), Angebote und Summen bleiben; zurückholen geht."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Kette", ROHBAU)
        L, a = _angebot(c, lv["id"], "Bau Kette GmbH", {"p1": 47.50, "p2": 19.90})
        vor = {x["id"]: x["summe"] for x in L["calc"]["angebote"]}
        L = c.pj(f"{A}/lv/{lv['id']}/lvweg", {"weg": True})
        pruefe(L["lv_weg"] and L["lv_weg"]["von"], "LV als gelöscht markiert (wer, wann)")
        gleich({x["id"]: x["summe"] for x in L["calc"]["angebote"]}, vor, "Angebote mit Summen bleiben")
        x = finde(c.gj(f"{A}/lv?project_id={L['project_id']}"), id=lv["id"])
        pruefe(x and x["lv_weg"], "Liste kennt „LV gelöscht“")
        L = c.uj(f"{A}/lv/{lv['id']}", {"name": "umbenannt"})
        pruefe(L["lv_weg"], "Speichern des LV verliert die Markierung nicht")
        L = c.pj(f"{A}/lv/{lv['id']}/lvweg", {"weg": False})
        pruefe(not L["lv_weg"], "LV zurückgeholt")
    finally:
        _weg(c, lv)


def test_lv_versand(ctx):
    """LV-Versand: Termine und Bieter:innen merken (Adresse der Firma vorbelegt, Anrede änderbar, Rückmeldung),
    Bieter:in wieder herausnehmen; Senden ohne Empfänger:in → 400 (es wird hier nichts verschickt)."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Versand", ROHBAU)
        d = c.gj(f"{A}/lv/{lv['id']}/versand")
        gleich((d["bieter"], d["abgabe"]), ([], ""), "neues LV: noch keine Bieter:innen")
        pruefe("{anrede}" in d["vorlage"]["text"], "Vorlage „Angebotsanfrage“ mit persönlicher Anrede")
        k = next((x for x in c.gj(f"{A}/kontakte") if x.get("email")), None)
        if k:
            d = c.uj(f"{A}/lv/{lv['id']}/versand", {"abgabe": "2026-12-01T10:00", "rueckmeldung": "2026-11-25", "bieter": {str(k["id"]): {"weg": False}}})
            b = finde(d["bieter"], contact_id=k["id"])
            pruefe(b and b["email"], "Bieter:in mit vorbelegter E-Mail-Adresse der Firma")
            pruefe(b["anrede"].startswith("Sehr geehrte"), "Anrede aus der Ansprechperson")
            d = c.uj(f"{A}/lv/{lv['id']}/versand", {"bieter": {str(k["id"]): {"anrede": "Hallo Frau Test,", "rueck": "zusage"}}})
            b = finde(d["bieter"], contact_id=k["id"])
            gleich((b["anrede"], b["rueck"], d["abgabe"]), ("Hallo Frau Test,", "zusage", "2026-12-01T10:00"), "Anrede, Rückmeldung, Termin gemerkt")
            d = c.uj(f"{A}/lv/{lv['id']}/versand", {"bieter": {str(k["id"]): {"weg": True}}})
            gleich(d["bieter"], [], "Bieter:in herausgenommen")
        r = c.post(f"{A}/lv/{lv['id']}/versand/senden", {"an": []}, expect=None)
        gleich(r.status, 400, "Senden ohne Empfänger:in")
    finally:
        if lv:
            _weg(c, lv)
