"""Bauantrag – Antragspaket: welche Vordrucke ein Antrag nutzt, eigene Unterlagen (PDF, Scan, Foto), Werte auf Vordrucke ohne
Formularfelder setzen („Platzieren“) und alles zu einem PDF mit Inhaltsverzeichnis zusammenfügen.

Stücke eines Antrags: „f<id>“ = amtlicher Vordruck (bauantrag_formular), „u<id>“ = eigene Unterlage (bauantrag_unterlage).
Platzierungen gelten je Datei-Inhalt (sha256): [{feld, seite, x, y, w, h, groesse, text?}] mit x/y/w/h als Anteil der Seite (0–1),
y von oben. feld = Schlüssel eines Antragsfelds, „datum“, „kreuz“ (✗) oder „frei“ (fester Text).
Eigene Unterlagen liegen im Projektordner (Spalte pfad); in der Datenbank steht nur der Verweis. Ältere stehen noch in daten.
"""
import hashlib
import io
import json
import re
import time
from datetime import datetime

from . import bauantrag_formulare as BF

# Vorschläge: Vordruck (an Titel erkannt) → passt, wenn … (W = Werte des Antrags)
VORSCHLAEGE = [
    (("baubeschreibung",), lambda W, v: True),
    (("betriebsbeschreibung",), lambda W, v: bool(re.search(r"gewerb|betrieb|werkstatt|lager|produktion|gastst|hotel", (W.get("nutzung") or "").lower()))),
    (("statistik", "erhebungsbogen"), lambda W, v: (W.get("art") or "") in ("Errichtung", "Erweiterung", "Änderung", "Nutzungsänderung") and v != "vorbescheid"),
    (("abbruch", "beseitigung"), lambda W, v: (W.get("art") or "") == "Abbruch"),
    (("werbeanlage",), lambda W, v: "werb" in (W.get("bezeichnung") or "").lower()),
    (("vorbescheid",), lambda W, v: v == "vorbescheid"),
]
_FELDZAHL = {}
LESER = None   # (project_id, pfad) → bytes: Datei aus dem Projektordner – setzt die App (liest über das Bautagebuch)
_DATEIEN = {}   # (project_id, pfad) → (Tag, bytes): bis Mitternacht behalten, damit Vorschau und Paket nicht jedes Mal vom Server lesen
_DATEIEN_MAX = 200 * 1024 * 1024   # höchstens so viel im Speicher (älteste zuerst raus)


def dateien_vergessen(project_id=None):
    """„↻ Projektordner neu einlesen“: Zwischenspeicher leeren – z. B. nach einem neuen Plan-Index am selben Tag."""
    for k in [k for k in _DATEIEN if project_id is None or k[0] == project_id]:
        _DATEIEN.pop(k, None)


def unterlage_daten(u, project_id):
    """Inhalt einer eigenen Unterlage: aus dem Projektordner (pfad) oder – ältere – aus der Datenbank (daten). None = nicht lesbar."""
    if u.get("daten") is not None:
        return bytes(u["daten"])
    pfad = u.get("pfad") or ""
    if not pfad or not LESER or not project_id:
        return None
    k = (project_id, pfad)
    heute = time.strftime("%Y-%m-%d")
    hit = _DATEIEN.get(k)
    if hit and hit[0] == heute:
        return hit[1]
    d = LESER(project_id, pfad)
    if d:
        _DATEIEN[k] = (heute, d)
        while sum(len(v[1]) for v in _DATEIEN.values()) > _DATEIEN_MAX and len(_DATEIEN) > 1:
            _DATEIEN.pop(next(iter(_DATEIEN)))   # zuerst gelesene zuerst
    return d


def feldzahl(daten, sha):
    """Anzahl Formularfelder eines PDFs (je Inhalt gemerkt)."""
    if sha not in _FELDZAHL:
        try:
            _FELDZAHL[sha] = len(BF.felder(daten))
        except Exception:   # noqa: BLE001 – kaputtes/verschlüsseltes PDF: wie ohne Felder
            _FELDZAHL[sha] = 0
    return _FELDZAHL[sha]


def sha(daten):
    return hashlib.sha256(bytes(daten)).hexdigest()


def _plaetze(c, shas):
    if not shas:
        return {}
    return {r["sha256"]: json.loads(r["felder"] or "[]") for r in c.execute("SELECT sha256, felder FROM bauantrag_platzierung WHERE sha256 = ANY(?)", (list(shas),)).fetchall()}


def _u_felder(c, u, pid):
    """Formularfelder einer eigenen Unterlage – Beilagen haben keine; sonst je Inhalt gemerkt (nur beim ersten Mal gelesen)."""
    if u["art"] == "beilegen":
        return 0
    if u["sha256"] in _FELDZAHL:
        return _FELDZAHL[u["sha256"]]
    if u.get("in_db"):
        r = c.execute("SELECT daten FROM bauantrag_unterlage WHERE id=?", (u["id"],)).fetchone()
        d = bytes(r["daten"]) if r and r["daten"] is not None else None
    else:
        try:
            d = unterlage_daten(u, pid)
        except Exception:   # noqa: BLE001 – Projektordner gerade nicht erreichbar
            return 0
    return feldzahl(d, u["sha256"]) if d else 0


def stuecke(c, a, W, land="NW"):
    """Alle möglichen Stücke eines Antrags mit Wahl und Reihenfolge. → (liste, gewählte Schlüssel in Reihenfolge)"""
    P = json.loads(a["daten"] or "{}").get("_paket") or {}
    haupt, nr = BF.formular_fuer(c, a["verfahren"], W, land)
    F = [dict(r) for r in c.execute("SELECT id, nr, titel, fassung, sha256, daten FROM bauantrag_formular WHERE land=? AND status<>'entfallen' "
                                    "AND daten IS NOT NULL ORDER BY nr='' , nr, titel", (land,)).fetchall()]
    U = [dict(r) for r in c.execute("SELECT id, name, art, sha256, pfad, (daten IS NOT NULL) AS in_db FROM bauantrag_unterlage WHERE antrag_id=? ORDER BY id", (a["id"],)).fetchall()]
    PL = _plaetze(c, {x["sha256"] for x in F + U if x["sha256"]})
    out = []
    for f in F:
        t = BF.fold(f["titel"])
        grund = "passt zum Verfahren" if haupt and f["id"] == haupt["id"] else \
            ("vorgeschlagen" if any(any(w in t for w in ws) and fn(W, a["verfahren"]) for ws, fn in VORSCHLAEGE) else "")
        k = f"f{f['id']}"
        an = k in (P.get("an") or []) or (bool(grund) and k not in (P.get("aus") or []))
        out.append({"key": k, "art": "vordruck", "nr": f["nr"], "titel": f["titel"], "fassung": f["fassung"], "felder": feldzahl(f["daten"], f["sha256"]),
                    "platziert": len(PL.get(f["sha256"]) or []), "vorschlag": grund, "an": an, "haupt": bool(haupt and f["id"] == haupt["id"])})
    for u in U:
        k = f"u{u['id']}"
        out.append({"key": k, "art": "unterlage", "titel": u["name"], "nutzung": u["art"], "felder": _u_felder(c, u, a["project_id"]), "pfad": u["pfad"],
                    "platziert": len(PL.get(u["sha256"]) or []), "an": k not in (P.get("aus") or []), "vorschlag": ""})
    for i, t in enumerate(trenner(P), 1):
        out.append({"key": f"t{i}", "art": "trenner", "nr": str(i), "titel": t["titel"], "an": f"t{i}" not in (P.get("aus") or []), "felder": 0, "platziert": 0, "vorschlag": ""})
    reihe = [k for k in (P.get("reihe") or []) if any(x["key"] == k for x in out)]
    an = [x["key"] for x in out if x["an"]]
    if not any(k.startswith("t") for k in reihe):   # Vorgabe: Trennblatt 1 vor die Vordrucke, 2–5 vor die eigenen Unterlagen
        rest = reihe or [k for k in an if not k.startswith("t")]
        i = next((n for n, k in enumerate(rest) if k.startswith("u")), len(rest))
        reihe = ["t1"] + rest[:i] + ["t2", "t3", "t4", "t5"] + rest[i:]
    gewaehlt = [k for k in reihe if k in an] + [k for k in an if k not in reihe]
    pos = {k: i for i, k in enumerate(gewaehlt)}
    out.sort(key=lambda x: (0, pos[x["key"]]) if x["key"] in pos else (1, x["art"] != "vordruck", x.get("nr") or "~", x["titel"]))
    return out, gewaehlt, nr


TRENNER = ["Antrag und Formulare", "Lageplan und Katasterauszüge", "Bauzeichnungen", "Beschreibungen und Berechnungen", "Nachweise und Sonstiges"]
ANSCHREIBEN_TEXT = ("Sehr geehrte Damen und Herren,\n\nim Auftrag der Bauherrschaft überreichen wir Ihnen den {verfahren} für das Vorhaben „{vorhaben}“ "
                    "auf dem Grundstück {grundstueck}.\n\nDie Bauvorlagen liegen in {ausfertigungen}-facher Ausfertigung bei; eine Aufstellung finden Sie "
                    "im Inhaltsverzeichnis. Für Rückfragen stehen wir Ihnen gern zur Verfügung.\n\nMit freundlichen Grüßen")


def trenner(P):
    """Fünf Trennblätter: [{titel}] – Titel je Antrag änderbar, an/aus wie die anderen Stücke (_paket.aus)."""
    T = P.get("trenner") or []
    return [{"titel": (T[i].get("titel") if i < len(T) and isinstance(T[i], dict) and T[i].get("titel") else TRENNER[i])} for i in range(5)]


def deckblatt(P, bauvorlagen):
    """Deckblatt mit Inhaltsverzeichnis: an/aus und die Häkchenliste weiterer Inhalte (Bauvorlagen, die nicht als Datei beiliegen,
    plus eigene Punkte). Vorgabe angehakt: Bauvorlagen, die vorliegen oder beigefügt sind."""
    D = P.get("deckblatt") or {}
    ein, aus = set(D.get("ein") or []), set(D.get("aus") or [])
    punkte = []
    for b in bauvorlagen:
        if b["key"] == "antrag":
            continue
        t = b["name"]
        punkte.append({"text": t, "an": t in ein or (b.get("status") in ("da", "beigefuegt") and t not in aus), "eigen": False})
    for t in D.get("eigene") or []:
        punkte.append({"text": t, "an": t not in aus, "eigen": True})
    return {"an": D.get("an", True), "punkte": punkte}


ANSCHREIBEN_AENDERUNG = ("Sehr geehrte Damen und Herren,\n\nim Auftrag der Bauherrschaft überreichen wir Ihnen zum {verfahren}{bezug} für das Vorhaben „{vorhaben}“ "
                         "auf dem Grundstück {grundstueck} einen Änderungsantrag.\n\n{was}Die geänderten Bauvorlagen liegen in {ausfertigungen}-facher Ausfertigung bei; "
                         "alle übrigen Bauvorlagen gelten unverändert. Für Rückfragen stehen wir Ihnen gern zur Verfügung.\n\nMit freundlichen Grüßen")
ANSCHREIBEN_ERGAENZUNG = ("Sehr geehrte Damen und Herren,\n\nzum {verfahren}{bezug} für das Vorhaben „{vorhaben}“ auf dem Grundstück {grundstueck} "
                          "reichen wir im Auftrag der Bauherrschaft folgende Unterlagen nach:\n\n{liste}\n\nDie Unterlagen liegen in {ausfertigungen}-facher Ausfertigung bei. "
                          "Für Rückfragen stehen wir Ihnen gern zur Verfügung.\n\nMit freundlichen Grüßen")


def anschreiben(P, W, verfahren_name, V=None):
    """Anschreiben an die Bauaufsicht: an/aus, Empfänger, Ansprechpartner:in, Text (Vorgabe mit den Angaben des Antrags).
    V: Änderung/Ergänzung zum Ursprung (Bezug mit Aktenzeichen und Datum, was sich ändert bzw. was nachgereicht wird)."""
    A = P.get("anschreiben") or {}
    gs = ", ".join(x for x in (W.get("gs_strasse"), W.get("gs_ort")) if x) or "–"
    lage = ", ".join(x for x in (f"Gemarkung {W['gemarkung']}" if W.get("gemarkung") else "", f"Flur {W['flur']}" if W.get("flur") else "",
                                 f"Flurstück {W['flurstueck']}" if W.get("flurstueck") else "") if x)
    verf, az = verfahren_name or "Bauantrag", A.get("aktenzeichen") or (V or {}).get("aktenzeichen") or ""
    grund = dict(vorhaben=W.get("bezeichnung") or "–", grundstueck=gs + (f" ({lage})" if lage else ""), ausfertigungen=A.get("ausfertigungen") or 3)
    betreff = f"{verf} – {W.get('bezeichnung') or ''}".strip(" –")
    if V:
        e = V.get("eingereicht") or ""
        bezug = (f" vom {e[8:10]}.{e[5:7]}.{e[:4]}" if len(e) == 10 else "") + (f" (Aktenzeichen {az})" if az else "")
        if V["art"] == "ergaenzung":
            liste = "\n".join("– " + n for n in V.get("unterlagen") or []) or "– …"
            vorgabe = ANSCHREIBEN_ERGAENZUNG.format(verfahren=verf, bezug=bezug, liste=liste, **grund)
            betreff = f"Ergänzung zum {verf} – {W.get('bezeichnung') or ''}".strip(" –")
        else:
            vorgabe = ANSCHREIBEN_AENDERUNG.format(verfahren=verf, bezug=bezug, was=f"Geändert wird: {V['was']}\n\n" if V.get("was") else "", **grund)
            betreff = f"Änderungsantrag zum {verf} – {W.get('bezeichnung') or ''}".strip(" –")
        if az:
            betreff += f" · Az. {az}"
    else:
        vorgabe = ANSCHREIBEN_TEXT.format(verfahren=verf, **grund)
    return {"an": A.get("an", True), "behoerde_id": A.get("behoerde_id"), "empfaenger": A.get("empfaenger") or W.get("behoerde") or "",
            "ansprechpartner": A.get("ansprechpartner") or "", "aktenzeichen": az, "ausfertigungen": A.get("ausfertigungen") or 3,
            "text": A.get("text") or vorgabe, "text_vorgabe": vorgabe, "anlagen": A.get("anlagen") or "liste", "betreff": A.get("betreff") or betreff + f"\n{gs}"}


def trennblatt_pdf(nr, titel, inhalt):
    """Trennblatt: große Nummer und Titel, darunter was in diesem Abschnitt folgt."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    cv.setFillColorRGB(0.12, 0.12, 0.12)
    cv.setFont("Helvetica-Bold", 96); cv.drawString(25 * mm, A4[1] - 95 * mm, str(nr))
    cv.setLineWidth(1.2); cv.line(25 * mm, A4[1] - 103 * mm, 185 * mm, A4[1] - 103 * mm)
    cv.setFont("Helvetica-Bold", 22); cv.drawString(25 * mm, A4[1] - 118 * mm, titel[:48])
    cv.setFont("Helvetica", 11); cv.setFillColorRGB(0.35, 0.35, 0.35)
    y = A4[1] - 135 * mm
    for t in inhalt[:30]:
        cv.drawString(30 * mm, y, ("–  " + t)[:95]); y -= 6.5 * mm
    cv.showPage(); cv.save()
    return buf.getvalue()


def bild_zu_pdf(daten):
    """Foto/Scan (JPG, PNG, HEIC, TIFF) → PDF, je Bild eine A4-Seite (hoch oder quer nach dem Bild), nach EXIF gedreht."""
    from PIL import Image, ImageOps
    try:
        import pillow_heif
        pillow_heif.register_heif_opener()
    except ImportError:
        pass
    im = Image.open(io.BytesIO(daten))
    seiten = []
    for i in range(getattr(im, "n_frames", 1)):
        im.seek(i)
        x = ImageOps.exif_transpose(im.copy()).convert("RGB")
        x.thumbnail((2480, 2480))   # 300 dpi auf A4 reicht
        seiten.append(x)
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    cv = canvas.Canvas(buf)
    for x in seiten:
        ps = landscape(A4) if x.width > x.height else A4
        cv.setPageSize(ps)
        r = min(ps[0] / x.width, ps[1] / x.height)
        w, h = x.width * r, x.height * r
        b = io.BytesIO(); x.save(b, "JPEG", quality=82)
        cv.drawImage(ImageReader(b), (ps[0] - w) / 2, (ps[1] - h) / 2, w, h)
        cv.showPage()
    cv.save()
    return buf.getvalue()


def wert(feld, W, text=""):
    if feld == "datum":
        return datetime.now().strftime("%d.%m.%Y")
    if feld == "kreuz":
        return "✗"
    if feld == "frei":
        return text or ""
    v = W.get(feld)
    if feld in ("rohbau", "herstellung"):
        return BF._eur(v)
    return "" if v is None else str(v)


def platzieren(daten, plaetze, W):
    """Werte als Text auf die Seiten legen (für PDFs ohne Felder und Scans)."""
    if not plaetze:
        return bytes(daten)
    from pypdf import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import simpleSplit
    rd = PdfReader(io.BytesIO(bytes(daten)))
    w = PdfWriter(clone_from=rd)
    for i, pg in enumerate(w.pages):
        P = [p for p in plaetze if int(p.get("seite") or 0) == i]
        if not P:
            continue
        box = pg.mediabox
        bw, bh, bx, by = float(box.width), float(box.height), float(box.left), float(box.bottom)
        rot = int(pg.get("/Rotate") or 0) % 360
        dw, dh = (bh, bw) if rot in (90, 270) else (bw, bh)   # so wie man die Seite sieht
        buf = io.BytesIO()
        cv = canvas.Canvas(buf, pagesize=(dw, dh))
        cv.setFillColorRGB(0.05, 0.12, 0.45)
        for p in P:
            t = wert(p.get("feld"), W, p.get("text"))
            if not t:
                continue
            gr = max(5.0, min(24.0, float(p.get("groesse") or 9)))
            x, y0, ww, hh = float(p["x"]) * dw, float(p["y"]) * dh, float(p["w"]) * dw, float(p["h"]) * dh
            fn = "Helvetica-Bold" if p.get("feld") == "kreuz" else "Helvetica"
            zeilen = [z2 for z in t.split("\n") for z2 in (simpleSplit(z, fn, gr, max(10, ww)) or [""])]
            yy = dh - y0 - gr * 0.95
            for z in zeilen:
                if yy < dh - y0 - hh - gr * 0.3 and z is not zeilen[0]:
                    break
                cv.setFont(fn, gr)
                cv.drawString(x + 1, yy, z.replace("✗", "X") if fn == "Helvetica-Bold" else z)
                yy -= gr * 1.15
        cv.save()
        ov = PdfReader(io.BytesIO(buf.getvalue())).pages[0]
        if rot:   # zurück in die Koordinaten der ungedrehten Seite
            ov.add_transformation({90: (0, 1, -1, 0, bw, 0), 180: (-1, 0, 0, -1, bw, bh), 270: (0, -1, 1, 0, 0, bh)}[rot])
        if bx or by:
            ov.add_transformation((1, 0, 0, 1, bx, by))
        pg.merge_page(ov)
    out = io.BytesIO(); w.write(out)
    return out.getvalue()


def stueck_pdf(c, key, W, eigene=None):
    """Ein Stück ausgefüllt: Formularfelder + Platzierungen. eigene: {sha256: {Feldname: Wert}} – im PDF eingetragene Werte von Feldern,
    die keinem Antragsfeld entsprechen. → (PDF, Titel, {felder, gefuellt, platziert}) oder None."""
    if key.startswith("f"):
        r = c.execute("SELECT nr, titel, daten, sha256 FROM bauantrag_formular WHERE id=?", (int(key[1:]),)).fetchone()
        titel = f"Anlage {r['nr']} {r['titel']}".strip() if r and r["nr"] else (r["titel"] if r else "")
    else:
        r = c.execute("SELECT u.name AS titel, u.daten, u.pfad, u.sha256, u.art, b.project_id FROM bauantrag_unterlage u JOIN bauantrag b ON b.id=u.antrag_id "
                      "WHERE u.id=?", (int(key[1:]),)).fetchone()
        titel = r["titel"] if r else ""
    if not r:
        return None
    d = unterlage_daten(dict(r), r["project_id"]) if key.startswith("u") else (bytes(r["daten"]) if r["daten"] is not None else None)
    if d is None:
        return None
    if key.startswith("u") and r["art"] == "beilegen":
        return d, titel, {"felder": 0, "gefuellt": 0, "platziert": 0}
    data, gef, n = BF.ausfuellen(d, W, (eigene or {}).get(r["sha256"]))
    P = _plaetze(c, {r["sha256"]}).get(r["sha256"]) or []
    if P:
        data = platzieren(data, P, W)
    return data, titel, {"felder": n, "gefuellt": gef, "platziert": len(P)}


def paket_pdf(teile, kopf, entwurf=False, deckblatt_an=True, weitere=(), vorn=None, hinten=None):
    """Antragspaket: vorn (z. B. Anschreiben, PDF-Bytes), Deckblatt mit Inhaltsverzeichnis (Abschnitte = Trennblätter, Seitenzahlen,
    weitere Inhalte als Häkchenliste), dann die Stücke, zuletzt „hinten“ (z. B. Packliste).
    teile: [(art, titel, pdf)] mit art „trenner“ (pdf wird erzeugt), „stueck“ oder „nennen“ (liegt nicht im PDF; statt pdf der Stand, z. B. „liegt gefaltet bei“)."""
    from pypdf import PdfReader, PdfWriter
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    # Trennblätter erzeugen (mit Inhalt des Abschnitts), Stücke lesen
    R, n_tr = [], 0
    for i, (art, t, d) in enumerate(teile):
        if art == "nennen":
            R.append(("nennen", t, None, d))
            continue
        if art == "trenner":
            n_tr += 1
            folgend = []
            for art2, t2, _ in teile[i + 1:]:
                if art2 == "trenner":
                    break
                folgend.append(t2)
            d = trennblatt_pdf(n_tr, t, folgend)
        try:
            R.append((art, t, PdfReader(io.BytesIO(d)), n_tr if art == "trenner" else None))
        except Exception:   # noqa: BLE001 – unlesbares Stück: im Verzeichnis vermerken
            R.append((art, t + " (nicht lesbar)", None, None))
    w = PdfWriter()
    n_vorn = 0
    if vorn:
        rv = PdfReader(io.BytesIO(vorn)); w.append(rv, outline_item="Anschreiben"); n_vorn = len(rv.pages)
    if deckblatt_an:
        buf = io.BytesIO()
        cv = canvas.Canvas(buf, pagesize=A4)
        y = A4[1] - 30 * mm
        cv.setFont("Helvetica-Bold", 18); cv.drawString(25 * mm, y, "Antragsunterlagen"); y -= 9 * mm
        cv.setFont("Helvetica", 10.5)
        for z in kopf:
            cv.drawString(25 * mm, y, z[:95]); y -= 5.2 * mm
        y -= 7 * mm
        cv.setFont("Helvetica-Bold", 11); cv.drawString(25 * mm, y, "Inhalt"); cv.drawRightString(185 * mm, y, "Seite"); y -= 3 * mm
        cv.setLineWidth(0.6); cv.line(25 * mm, y, 185 * mm, y); y -= 6 * mm
        s0 = n_vorn + 2
        for art, t, rd, nr in R:
            if y < 45 * mm:
                break
            if art == "trenner":
                y -= 1.5 * mm
                cv.setFont("Helvetica-Bold", 10.5); cv.drawString(25 * mm, y, f"{nr}   {t}"[:90])
            else:
                cv.setFont("Helvetica", 10); cv.drawString(31 * mm, y, t[:(70 if art == "nennen" else 88)])
            if art == "nennen":
                cv.setFont("Helvetica-Oblique", 8.5); cv.drawRightString(185 * mm, y, nr or "")
            else:
                cv.drawRightString(185 * mm, y, str(s0) if rd else "–")
            y -= 5.8 * mm
            s0 += len(rd.pages) if rd else 0
        W2 = [x for x in weitere if x.get("text") and x.get("an")]   # nur die angehakten – die Häkchen gibt es nur in der Maske
        if W2 and y > 40 * mm:
            y -= 5 * mm
            cv.setFont("Helvetica-Bold", 10.5); cv.drawString(25 * mm, y, "Weitere Unterlagen"); y -= 6 * mm
            cv.setFont("Helvetica", 10)
            for x in W2:
                if y < 22 * mm:
                    break
                cv.drawString(31 * mm, y, x["text"][:88]); y -= 5.6 * mm
        if entwurf:
            cv.setFont("Helvetica-Bold", 9); cv.setFillColorRGB(0.75, 0.2, 0.15); cv.drawString(25 * mm, 15 * mm, "ENTWURF")
        cv.showPage(); cv.save()
        w.append(PdfReader(io.BytesIO(buf.getvalue())), outline_item="Inhaltsverzeichnis")
    for art, t, rd, nr in R:
        if rd:
            w.append(rd, outline_item=(f"{nr} {t}" if art == "trenner" else t)[:120])
    if hinten:
        w.append(PdfReader(io.BytesIO(hinten)), outline_item="Packliste")
    sprungmarken(w, n_vorn if deckblatt_an else None, n_vorn + (1 if deckblatt_an else 0))
    out = io.BytesIO(); w.write(out)
    return out.getvalue()


def sprungmarken(w, deckblatt, erstes):
    """Benannte Ziele „schritt-<schritt>“ im Paket – die Vorschau springt damit zum Schritt des Assistenten (BPHead.pdfZiel).
    Formularfelder bestimmen die Stelle; ohne passendes Feld: Prüfen = Anfang, Bauvorlagen = Inhaltsverzeichnis, sonst Anfang des ersten Vordrucks."""
    from pypdf.generic import ArrayObject, FloatObject, NameObject, NullObject, TextStringObject
    n = len(w.pages)
    if not n:
        return
    Z = BF.sprungziele(w.pages)
    erstes = min(erstes, n - 1)
    oben = lambda i: float(w.pages[i].mediabox.top)   # noqa: E731
    i0 = min((i for i, _ in Z.values()), default=erstes)   # ohne Feld der Behörde: Anfang des ersten ausgefüllten Vordrucks
    Z.setdefault("verfahren", (i0, oben(i0)))
    if deckblatt is not None and deckblatt < n:
        Z["bauvorlagen"] = (deckblatt, oben(deckblatt))
    Z["pruefen"] = (0, oben(0))
    for s in ("beteiligte", "grundstueck", "vorhaben", "bauvorlagen"):   # fehlt ein Schritt: dort bleiben, wo der vorige steht
        Z.setdefault(s, Z.get({"beteiligte": "verfahren", "grundstueck": "beteiligte", "vorhaben": "grundstueck", "bauvorlagen": "vorhaben"}[s]))
    for s, (i, top) in Z.items():
        try:
            w.add_named_destination_array(TextStringObject("schritt-" + s), ArrayObject(
                [w.pages[i].indirect_reference, NameObject("/XYZ"), NullObject(), FloatObject(min(top, oben(i))), NullObject()]))
        except Exception:   # noqa: BLE001 – Sprungmarke ist Komfort, das PDF geht vor
            pass


def seite_png(daten, n, breite=900):
    """Seite n als PNG (für „Platzieren“) → (png, Seitenzahl, Breite/Höhe)."""
    import pypdfium2 as pdfium
    from bpcore.vorschau import PDFIUM_SPERRE
    with PDFIUM_SPERRE:   # pdfium ist nicht threadsicher: mehrere Seiten gleichzeitig (lazy geladen) brachen sonst ab
        pdf = pdfium.PdfDocument(bytes(daten))
        try:
            anz = len(pdf)
            n = max(0, min(anz - 1, n))
            pg = pdf[n]
            w, h = pg.get_size()
            im = pg.render(scale=breite / max(w, h, 1)).to_pil()   # gedreht wie angezeigt
            pg.close()
        finally:
            pdf.close()
    b = io.BytesIO(); im.convert("RGB").save(b, "PNG", optimize=True)
    return b.getvalue(), anz, im.width / max(im.height, 1)
