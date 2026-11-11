"""Rechentests Bauantrag: Anlagen der NRW-Seite erkennen (zwei Links je Anlage, Titel, Nummer), Fassung aus der Adresse, nur sichere Adressen."""
from lib import gleich, pruefe

from bpcore import bauantrag_formulare as BF

SEITE = """<div id="attachments">
<a href="/system/files/2026-08/smbl_23210_20000308_a_anlage1.1.pdf">(Anlage I/1 Baugenehmigungsverfahren § 65 BauO NRW 2018)</a>
<a href="/system/files/2026-08/smbl_23210_20000308_a_anlage1.1.pdf">Anlage I/1 Baugenehmigungsverfahren § 65 BauO NRW 2018 (PDF) Barrierefrei</a>
<a href="/system/files/2026-11/2026-11-0007663.pdf">Anlage I/2 Vereinfachtes Baugenehmigungsverfahren &sect; 64 BauO NRW 2018 (PDF) Barrierefrei</a>
<a href="/system/files/BA/47790-50738-smbl_23210_20000308_a_anlageii4.pdf">Anlage II/4 Bericht Bauzustandsbesichtigung (PDF) Nicht barrierefrei</a>
<a href="/impressum">Impressum</a></div>"""


def test_anlagen_der_nrw_seite():
    """Jede Anlage einmal, mit Nummer, Titel ohne „(PDF) Barrierefrei“ und voller Adresse."""
    A = BF.anlagen_lesen(SEITE, "https://recht.nrw.de/lrmb/verwaltungsvorschrift/10112026-verwaltungsvorschrift-zur-verordnung-ueber-bautechnische")
    gleich([a["nr"] for a in A], ["I/1", "I/2", "II/4"], "drei Anlagen")
    gleich(A[1]["titel"], "Vereinfachtes Baugenehmigungsverfahren § 64 BauO NRW 2018", "Titel")
    gleich(A[0]["url"], "https://recht.nrw.de/system/files/2026-08/smbl_23210_20000308_a_anlage1.1.pdf", "volle Adresse")
    gleich(BF._fassung("https://recht.nrw.de/lrmb/verwaltungsvorschrift/10112026-verwaltungsvorschrift-zur", ""), "10.11.2026", "Fassung aus der Adresse")


AKNW = """<h2>Downloads</h2>
<a href="fileadmin/user_upload/Bauantragsformulare_Vertragshilfen/202609_Bauantragsformulare-2026-September/mb2026-220-anlage1.1.pdf" class="download">Anlage I-1 - Bauantrag für große Sonderbauten</a>
<a href="fileadmin/user_upload/Bauantragsformulare_Vertragshilfen/202609_Bauantragsformulare-2026-September/mb2026-220-anlage1.2.pdf">Anlage I-2 - Bauantrag für vereinfachtes Genehmigungsverfahren</a>
<a href="fileadmin/user_upload/Bauantragsformulare_Vertragshilfen/anlage_i_2.1_anzeige_befristete_nutzungsaenderung.pdf">Anlage I-2.2- Anzeige der befristeten Nutzungsänderung</a>"""


def test_anlagen_der_aknw_seite():
    """Seite der Architektenkammer: „Anlage I-2“ wird wie „Anlage I/2“ erkannt, Fassung aus dem Ordnernamen."""
    A = BF.anlagen_lesen(AKNW, "https://www.aknw.de/berufspraxis/planen-und-bauen/bauantragsformulare")
    gleich([a["nr"] for a in A], ["I/1", "I/2", "I/2.2"], "Nummern")
    gleich(A[1]["titel"], "Bauantrag für vereinfachtes Genehmigungsverfahren", "Titel")
    pruefe(A[0]["url"].startswith("https://www.aknw.de/"), "volle Adresse")
    gleich(BF._fassung(A[0]["url"], ""), "09/2026", "Fassung aus dem Ordner")


def test_nur_sichere_adressen():
    """Keine http-Adressen und nichts im eigenen Netz (der Server ruft die Seite ab)."""
    for u in ("http://recht.nrw.de/x", "https://127.0.0.1/x", "https://localhost/x", "ftp://a.de/x"):
        try:
            BF._sicher(u)
            pruefe(False, f"abgelehnt: {u}")
        except (ValueError, OSError):
            pass


def test_amtliches_formular_ausfuellen():
    """Ein ausfüllbares Formular (wie die NRW-Vordrucke): Felder werden an Name/Tooltip erkannt, Gebäudeklasse angekreuzt, nichts eigenes dazu."""
    import io
    from pypdf import PdfReader
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    buf = io.BytesIO(); cv = canvas.Canvas(buf, pagesize=A4); f = cv.acroForm
    f.textfield(name="Text1", tooltip="Bauherrschaft Name, Vorname / Firma", x=50, y=700, width=300, height=18)
    f.textfield(name="Text2", tooltip="Baugrundstück Gemarkung(en)", x=50, y=650, width=300, height=18)
    f.textfield(name="Text3", tooltip="Baugrundstück Flur(e)", x=50, y=620, width=300, height=18)
    f.textfield(name="Text4", tooltip="Baugrundstück Flurstück(e)", x=50, y=590, width=300, height=18)
    f.checkbox(name="GK3", tooltip="Gebäudeklasse 3", x=50, y=550, size=12)
    f.checkbox(name="GK4", tooltip="Gebäudeklasse 4", x=80, y=550, size=12)
    cv.showPage(); cv.save()
    W = {"bauherr_name": "Tierschutzverein RT", "gemarkung": "Altenessen", "flur": "12", "flurstueck": "345", "gebaeudeklasse": "3"}
    data, gefuellt, n = BF.ausfuellen(buf.getvalue(), W)
    F = PdfReader(io.BytesIO(data)).get_fields()
    gleich((F["Text1"].get("/V"), F["Text2"].get("/V"), F["Text3"].get("/V"), F["Text4"].get("/V")), ("Tierschutzverein RT", "Altenessen", "12", "345"), "Textfelder")
    pruefe(str(F["GK3"].get("/V")) not in ("", "None", "/Off") and str(F["GK4"].get("/V")) in ("None", "/Off", ""), f"GK 3 angekreuzt: {F['GK3'].get('/V')} / {F['GK4'].get('/V')}")
    gleich((gefuellt, n), (5, 6), "5 von 6 Feldern")
    # im PDF ausfüllen: Lage der Felder, Zuordnung auch leerer Felder, zurück in den Antrag, eigene Werte für Felder ohne Zuordnung
    Wd = BF.widgets(buf.getvalue())
    t1 = next(x for x in Wd if x["name"] == "Text1")
    pruefe(abs(t1["x"] - 50 / 595.28) < 0.01 and abs(t1["y"] - (841.89 - 718) / 841.89) < 0.01 and t1["typ"] == "text", f"Lage Text1 {t1}")
    gleich(next(x for x in Wd if x["name"] == "GK3")["typ"], "kreuz", "Kästchen erkannt")
    Z = BF.zuordnung(BF.felder(buf.getvalue()), BF.werte_v({}), alle=True)
    gleich((Z.get("Text1"), Z.get("Text4")), ("bh_name", "flurstueck"), "Zuordnung auch ohne Wert")
    gleich(BF.zurueck("bh_strasse", "Neue Str. 5", {"bauherr_anschrift": "Alte Str. 1, 45127 Essen"}), {"bauherr_anschrift": "Neue Str. 5, 45127 Essen"}, "Anschrift neu gebaut")
    gleich(BF.zurueck("gs_hausnr", "24a", {"gs_strasse": "Grillostr. 24"}), {"gs_strasse": "Grillostr. 24a"}, "Hausnummer")
    gleich(BF.zurueck("herstellung", "1.234.567,89 €", {}), {"herstellung": "1234567.89"}, "Betrag")
    d2, _, _ = BF.ausfuellen(buf.getvalue(), W, {"GK4": True, "Text1": "von Hand"})
    F2 = PdfReader(io.BytesIO(d2)).get_fields()
    pruefe(F2["Text1"].get("/V") == "von Hand" and str(F2["GK4"].get("/V")) not in ("", "None", "/Off"), "eigene Werte im PDF")


def test_portal_umgebaut_nichts_entfallen():
    """Liefert das Portal deutlich weniger Vordrucke als bisher, gilt es als umgebaut: nichts wird als „entfallen“ markiert, Meldung „kaputt“."""
    from bpcore import db
    land = "SL"   # Testland, wird am Ende aufgeräumt
    try:
        with db.tx() as c:
            c.execute("DELETE FROM bauantrag_formular WHERE land=?", (land,))
            for i in range(6):
                c.execute("INSERT INTO bauantrag_formular(land, schluessel, nr, titel, url, status) VALUES(?,?,?,?,?, 'aktuell')", (land, f"I/{i}", f"I/{i}", "Test", f"https://x.de/{i}.pdf"))
            c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data",
                      (f"bauantrag:quelle:{land}", '{"url": "https://x.de/"}', "", "test"))
        alt_holen, alt_sicher = BF._holen, BF._sicher
        BF._holen = lambda url, m=0: ("https://x.de/", b'<a href="/1.pdf">Anlage I/1 Test</a>') if url.endswith("/") else ("", b"%PDF-1.4")
        try:
            erg = BF.pruefen(db.tx, land, "test")
        finally:
            BF._holen, BF._sicher = alt_holen, alt_sicher
        pruefe(erg["kaputt"] and "umgebaut" in erg["fehler"], f"als umgebaut erkannt: {erg}")
        with db.tx() as c:
            st = [r["status"] for r in c.execute("SELECT status FROM bauantrag_formular WHERE land=?", (land,)).fetchall()]
            gleich(st.count("entfallen"), 0, "nichts entfallen")
            pruefe(any(l == land for l, _ in BF.kaputt(c)), "als „Portal nicht lesbar“ gemerkt")
            fid = BF.hochladen(c, land, "I/9", "Eigenes", b"%PDF-1.4 test", "test")
            pruefe(c.execute("SELECT daten FROM bauantrag_formular WHERE id=?", (fid,)).fetchone()["daten"] is not None, "selbst hochgeladen")
    finally:
        with db.tx() as c:
            c.execute("DELETE FROM bauantrag_formular WHERE land=?", (land,))
            c.execute("DELETE FROM bp_store WHERE key LIKE ?", (f"bauantrag:%:{land}",))


def test_anlage_aus_dateiname():
    """Selbst hochgeladene Vordrucke: Anlage aus Titel oder Dateiname (AKNW, recht.nrw.de) erkennen."""
    for t, soll in (("mb2026-220-anlage1.2", "I/2"), ("mb2026-220-anlage1.10.pdf", "I/10"), ("anlage_i_4_werbeanlage.pdf", "I/4"),
                    ("47790-50738-smbl_23210_20000308_a_anlageii4.pdf", "II/4"), ("Anlage I-2.2- Anzeige", "I/2.2"), ("Lageplan.pdf", "")):
        gleich(BF.nr_raten(t), soll, t)


def test_antragspaket():
    """Foto → PDF-Seite, Werte platzieren (auch auf gedrehten Seiten), Paket mit Inhaltsverzeichnis, Seite als Bild für „Platzieren“."""
    import io
    from PIL import Image
    from pypdf import PdfReader
    from bpcore import bauantrag_paket as BP
    im = Image.new("RGB", (1200, 1700), (240, 238, 230)); b = io.BytesIO(); im.save(b, "JPEG")
    scan = BP.bild_zu_pdf(b.getvalue())
    gleich(len(PdfReader(io.BytesIO(scan)).pages), 1, "Foto wird eine PDF-Seite")
    W = {"bauherr_name": "Muster Wohnbau GmbH", "flurstueck": "12/4"}
    P = [{"feld": "bauherr_name", "seite": 0, "x": 0.1, "y": 0.1, "w": 0.5, "h": 0.03, "groesse": 10},
         {"feld": "frei", "text": "siehe Anlage", "seite": 0, "x": 0.1, "y": 0.2, "w": 0.5, "h": 0.03, "groesse": 9},
         {"feld": "kreuz", "seite": 0, "x": 0.1, "y": 0.3, "w": 0.03, "h": 0.03, "groesse": 10}]
    t = PdfReader(io.BytesIO(BP.platzieren(scan, P, W))).pages[0].extract_text()
    pruefe("Muster Wohnbau GmbH" in t and "siehe Anlage" in t, f"platzierte Werte im PDF ({t[:60]!r})")
    paket = BP.paket_pdf([("trenner", "Antrag und Formulare", None), ("stueck", "Anlage I/2 Bauantrag", scan), ("trenner", "Nachweise", None),
                          ("stueck", "Nachbarzustimmung", scan)], ["Neubau EFH", "Stand heute"], weitere=[{"text": "Statik (folgt)", "an": True}, {"text": "Brandschutz", "an": False}], vorn=scan)
    rd = PdfReader(io.BytesIO(paket))
    gleich(len(rd.pages), 6, "Anschreiben + Inhaltsverzeichnis + 2 Trennblätter + 2 Stücke")
    t = rd.pages[1].extract_text()
    pruefe("Nachbarzustimmung" in t and "Statik (folgt)" in t and "Nachweise" in t, "Inhaltsverzeichnis mit Abschnitten und weiteren Unterlagen")
    pruefe("Brandschutz" not in t, "nicht angehakte Unterlagen stehen nicht im PDF")
    pruefe("Nachbarzustimmung" in rd.pages[4].extract_text(), "Trennblatt nennt seinen Inhalt")
    gleich([x["titel"] for x in BP.trenner({"trenner": [{"titel": "Formulare"}]})][:2], ["Formulare", BP.TRENNER[1]], "Trennblatt umbenannt")
    png, n, v = BP.seite_png(scan, 0, 400)
    pruefe(png[:4] == b"\x89PNG" and n == 1 and 0.6 < v < 0.8, "Seite als Bild, hochkant")


def test_anlagen_gliederung():
    """Anlagen: Nummern je Abschnitt (leere Abschnitte zählen nicht), genannte Pläne auf der Packliste, Dateinamen für digital."""
    from bpcore import bauantrag_anlagen as BAN
    P = {"anlagen": [{"id": "p1", "art": "plan", "text": "Grundriss EG", "nr": "101", "index": "B", "abschnitt": 3, "an": True, "stand": "bei"},
                     {"id": "s1", "art": "frei", "text": "Statik", "abschnitt": 5, "an": True, "stand": "nach"},
                     {"id": "x1", "art": "frei", "text": "aus", "abschnitt": 5, "an": False, "stand": "bei"}]}
    B = [{"key": "antrag", "name": "Antragsformular"}, {"key": "grundrisse", "name": "Bauzeichnungen – Grundrisse 1:100", "status": "da", "pflicht": True}]
    L = BAN.liste(P, B)
    gr = next(x for x in L if x["id"] == "b:grundrisse")
    pruefe(gr["durch_plaene"] and not gr["an"], "Bauvorlage „Grundrisse“ ist durch den Plan erledigt")
    gleich(next(x for x in L if x["id"] == "p1")["bezeichnung"], "Grundriss EG · Plan 101 Index B", "Plan mit Nummer und Index")
    paket = [{"key": "t1", "titel": "Antrag"}, {"key": "f9", "titel": "Bauantrag", "nr": "I/1"}, {"key": "t3", "titel": "Bauzeichnungen"}, {"key": "t4", "titel": "Beschreibungen"}, {"key": "t5", "titel": "Nachweise"}]
    G = BAN.gliederung(paket, ["t1", "f9", "t3", "t4", "t5"], L)
    gleich([(s["nr"], s["titel"], [e["nr"] for e in s["eintraege"]]) for s in G],
           [(1, "Antrag", ["1.1"]), (2, "Bauzeichnungen", ["2.1"]), (3, "Nachweise", ["3.1"])], "Abschnitte ohne Inhalt fallen weg")
    gleich([e["titel"] for e in BAN.packliste(G, "papier")], ["Grundriss EG · Plan 101 Index B"], "Packliste: nur was beiliegt")
    gleich(BAN.packliste(G, "digital"), [], "digital: keine Packliste")
    gleich(BAN.dateiname("2.1", "Grundriss EG · Plan 101 Index B"), "02-1_Grundriss_EG_Plan_101_Index_B.pdf", "Dateiname je Anlage")
