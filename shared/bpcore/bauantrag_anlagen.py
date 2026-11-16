"""Bauantrag – Anlagen: alles, was zum Antrag gehört, auch was nicht als Datei im Paket liegt.

Arten: „bauvorlage“ (aus der Checkliste, b:<key>), „frei“ (eigene Zeile; frühere eigene Punkte des Deckblatts: e:<text>),
„plan“ (aus der Planliste von „Pläne & Dateien“) und „datei“ (PDF aus dem Projektordner). Pläne und Dateien werden entweder
nur genannt oder als PDF beigelegt (dann eine eigene Unterlage u<id> im Paket, Schlüssel ukey).
Je Anlage: an/aus, Stand (liegt bei · wird nachgereicht · liegt Prüfingenieur vor), Abschnitt (Trennblatt 1–5).
Abgabe: „papier“ (Pläne werden gefaltet dazugelegt – Packliste am Ende) oder „digital“ (alles als PDF, ZIP je Anlage).
Gespeichert in bauantrag.daten._paket: anlagen [..], anl_stand {id: stand}, anl_abschnitt {id: nr}, abgabe, druck_max.

Papier (entschieden am 16.11.2026): Was das Büro selbst drucken kann (bis druck_max, Vorgabe A3), liegt als PDF im Paket; größere Pläne
werden geplottet – im Paket liegt an ihrer Stelle ein Einlegeblatt, die Anlagenliste nennt sie, die Packliste zählt sie auf. Das Format
(größte Seite) steht je Anlage in „format“ (papier()). Mehrere Ausfertigungen: ausfertigungen_pdf(). Plotauftrag an den Plotdienst:
plotauftrag_pdf() – für beliebige Pläne, unabhängig von der Größe.
"""
import re

STAND = {"bei": "liegt bei", "nach": "wird nachgereicht", "pruef": "liegt Prüfingenieur vor"}
BV_ABSCHNITT = {"liegenschaft": 2, "lageplan": 2, "grundrisse": 3, "schnitte": 3, "ansichten": 3, "baubeschreibung": 4, "berechnungen": 4,
                "statik": 5, "waerme": 5, "brandschutz": 5, "stellplatz": 5, "entwaesserung": 5, "statistik": 1}
BV_PLAN = {"grundrisse": "grundriss", "schnitte": "schnitt", "ansichten": "ansicht", "lageplan": "lageplan"}   # durch Pläne erledigt


DIN = (("A4", 210, 297), ("A3", 297, 420), ("A2", 420, 594), ("A1", 594, 841), ("A0", 841, 1189))   # kurze × lange Seite in mm
DRUCK_MAX = "A3"   # Vorgabe: bis hierhin druckt das Büro selbst


def papier(pdf):
    """Format eines PDFs: größte Seite → {b, h (mm, kurze × lange Seite), name („A1“ oder „594 × 1500 mm“), seiten}. None, wenn nicht lesbar."""
    import io
    from pypdf import PdfReader
    try:
        R = PdfReader(io.BytesIO(pdf))
        gr = (0, 0)
        for s in R.pages:
            b, h = sorted((float(s.mediabox.width) * 25.4 / 72 * float(s.get("/UserUnit", 1) or 1), float(s.mediabox.height) * 25.4 / 72 * float(s.get("/UserUnit", 1) or 1)))
            if b * h > gr[0] * gr[1]:
                gr = (b, h)
        n = len(R.pages)
    except Exception:   # noqa: BLE001 – beschädigtes PDF: Format unbekannt
        return None
    if not gr[0]:
        return None
    b, h = round(gr[0]), round(gr[1])
    name = next((k for k, x, y in DIN if abs(b - x) <= 6 and abs(h - y) <= 6), None) or f"{b} × {h} mm"
    return {"b": b, "h": h, "name": name, "seiten": n}


def zu_gross(fmt, grenze=DRUCK_MAX):
    """Passt das Format nicht mehr auf das größte Blatt, das das Büro selbst druckt? Unbekanntes Format gilt als druckbar."""
    g = next((x for x in DIN if x[0] == grenze), DIN[1])
    return bool(fmt) and (fmt["b"] > g[1] + 6 or fmt["h"] > g[2] + 6)


from .wert import falt as _fold


def text(x):
    """Bezeichnung einer Anlage, bei Plänen mit Nummer und Index."""
    if x.get("art") == "plan":
        z = " ".join(v for v in (f"Plan {x['nr']}" if x.get("nr") else "", f"Index {x['index']}" if x.get("index") else "") if v)
        return f"{x.get('text') or 'Plan'}{' · ' + z if z else ''}"
    return x.get("text") or ""


def liste(P, bauvorlagen):
    """Alle Anlagen in Anzeige-Reihenfolge: Abschnitt, darin wie die Checkliste der Bauvorlagen (auch Dateien einer Bauvorlage), dann wie angelegt."""
    Dk = P.get("deckblatt") or {}
    ein, aus = set(Dk.get("ein") or []), set(Dk.get("aus") or [])
    S, AB = P.get("anl_stand") or {}, P.get("anl_abschnitt") or {}
    eig = [x for x in (P.get("anlagen") or []) if isinstance(x, dict) and x.get("id")]
    plantitel = " ".join(_fold(x.get("text")) for x in eig if x.get("art") == "plan" and x.get("an", True))
    out = []
    mit_datei = {x.get("bv") for x in eig if x.get("bv")}   # Bauvorlagen, deren Dateien als eigene Anlagen stehen (Schritt 6: drucken / nur nennen)
    for b in bauvorlagen:
        if b["key"] == "antrag" or b["key"] in mit_datei:
            continue
        i, t = "b:" + b["key"], b["name"]
        durch = BV_PLAN.get(b["key"]) and BV_PLAN[b["key"]] in plantitel   # die Pläne dazu sind schon einzeln genannt
        an = t in ein or (b.get("status") in ("da", "beigefuegt") and t not in aus and not durch)
        out.append({"id": i, "art": "bauvorlage", "text": t, "an": an, "stand": S.get(i, "bei"), "abschnitt": int(AB.get(i) or BV_ABSCHNITT.get(b["key"], 5)),
                    "beilegen": False, "pflicht": bool(b.get("pflicht")), "durch_plaene": bool(durch)})
    for t in Dk.get("eigene") or []:
        i = "e:" + t
        out.append({"id": i, "art": "frei", "text": t, "an": t not in aus, "stand": S.get(i, "bei"), "abschnitt": int(AB.get(i) or 5), "beilegen": False})
    for x in eig:
        out.append({"id": x["id"], "art": x.get("art") or "frei", "text": x.get("text") or "", "an": x.get("an", True), "stand": x.get("stand") or "bei",
                    "abschnitt": int(x.get("abschnitt") or 5), "beilegen": bool(x.get("beilegen") and x.get("ukey")), "ukey": x.get("ukey") or "",
                    "pfad": x.get("pfad") or "", "nr": x.get("nr") or "", "index": x.get("index") or "", "plan": x.get("plan") or "",
                    "format": x.get("format") if isinstance(x.get("format"), dict) else None, "bv": x.get("bv") or ""})
    for x in out:
        x["bezeichnung"] = text(x)
    rang = {b["key"]: k for k, b in enumerate(bauvorlagen)}
    return sorted(out, key=lambda x: (x["abschnitt"], rang.get(x["id"][2:] if x["art"] == "bauvorlage" else x.get("bv"), len(rang))))


def gliederung(paket, gewaehlt, anlagen):
    """Inhalt des Antrags in Abschnitten (Trennblätter) mit Anlagen-Nummern: [{nr, tnr, titel, eintraege: [{nr, art, key|id, titel, stand}]}].
    Stücke (Vordrucke, Unterlagen) stehen, wo sie in der Reihenfolge liegen; genannte Anlagen in ihrem Abschnitt hinter den Stücken."""
    titel = {x["key"]: x for x in paket}
    A, cur, n = [], None, 0
    for k in gewaehlt:
        x = titel.get(k)
        if not x:
            continue
        if k.startswith("t"):
            n += 1
            cur = {"nr": n, "tnr": int(k[1:]), "titel": x["titel"], "eintraege": []}
            A.append(cur)
            continue
        if cur is None:
            cur = {"nr": 0, "tnr": 0, "titel": "", "eintraege": []}
            A.append(cur)
        an = next((y for y in anlagen if y.get("ukey") == k), None)
        cur["eintraege"].append({"art": "stueck", "key": k, "titel": (an["bezeichnung"] if an else (f"Anlage {x['nr']} – " if x.get("nr") else "") + x["titel"]),
                                 "stand": "bei", "id": an["id"] if an else ""})
    for y in anlagen:
        if not y["an"] or y.get("beilegen"):
            continue
        ziel = next((s for s in A if s["tnr"] == y["abschnitt"]), None) or (A[-1] if A else None)
        if not ziel:
            ziel = {"nr": 0, "tnr": 0, "titel": "", "eintraege": []}
            A.append(ziel)
        ziel["eintraege"].append({"art": "nennen", "id": y["id"], "titel": y["bezeichnung"], "stand": y["stand"], "plan": y["art"] == "plan",
                                  "format": (y.get("format") or {}).get("name") or "", "datei": bool(y.get("pfad")),
                                  "plot": zu_gross(y.get("format")) if isinstance(y.get("format"), dict) else y["art"] == "plan"})
    A = [s for s in A if s["eintraege"]]   # leere Abschnitte fallen weg – wie die Trennblätter im Paket
    n = 0
    for s in A:
        if s["tnr"]:
            n += 1
            s["nr"] = n
        for i, e in enumerate(s["eintraege"], 1):
            e["nr"] = f"{s['nr']}.{i}" if s["nr"] else str(i)
    return A


def packliste(G, abgabe):
    """Was auf Papier noch dazugelegt wird: genannte Anlagen mit Stand „liegt bei“ (Pläne zuerst)."""
    if abgabe == "digital":
        return []
    R = [e for s in G for e in s["eintraege"] if e["art"] == "nennen" and e["stand"] == "bei"]
    return sorted(R, key=lambda e: not e.get("plan"))


def dateiname(nr, titel):
    """Dateiname je Anlage für die digitale Abgabe, z. B. „03-1_Grundriss_EG_Plan_101_Index_B.pdf“."""
    a, _, b = str(nr).partition(".")
    vorn = f"{int(a):02d}-{b}" if a.isdigit() and b else (f"{int(a):02d}" if a.isdigit() else "00")
    t = re.sub(r"[^\w\-.]+", "_", titel.replace("·", " ").replace("–", "-")).strip("_")
    return f"{vorn}_{t}"[:120] + ".pdf"


def packliste_pdf(R, ausfertigungen, kopf):
    """Letzte Seite bei Abgabe auf Papier: Packliste zum Abhaken."""
    import io
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    y = A4[1] - 30 * mm
    cv.setFont("Helvetica-Bold", 18); cv.drawString(25 * mm, y, "Packliste"); y -= 8 * mm
    cv.setFont("Helvetica", 10.5)
    for z in kopf[:3]:
        cv.drawString(25 * mm, y, z[:95]); y -= 5.2 * mm
    y -= 3 * mm
    cv.drawString(25 * mm, y, f"Diese Anlagen liegen nicht im PDF – bitte {ausfertigungen}-fach dazulegen (Pläne gefaltet auf A4)."); y -= 10 * mm
    cv.setFont("Helvetica-Bold", 10); cv.drawString(25 * mm, y, "Nr."); cv.drawString(42 * mm, y, "Anlage"); cv.drawRightString(185 * mm, y, "Anzahl"); y -= 3 * mm
    cv.setLineWidth(0.6); cv.line(25 * mm, y, 185 * mm, y); y -= 7 * mm
    cv.setFont("Helvetica", 10.5)
    for e in R:
        if y < 25 * mm:
            cv.showPage(); y = A4[1] - 25 * mm; cv.setFont("Helvetica", 10.5)
        cv.rect(19 * mm, y - 0.8 * mm, 3.6 * mm, 3.6 * mm)
        cv.drawString(25 * mm, y, e["nr"]); cv.drawString(42 * mm, y, e["titel"][:78]); cv.drawRightString(185 * mm, y, f"{ausfertigungen}×"); y -= 7.5 * mm
    cv.showPage(); cv.save()
    return buf.getvalue()


def einlegeblatt_pdf(nr, titel, fmt, kopf, plot=True):
    """Platzhalterblatt: liegt im Paket an der Stelle einer Anlage, die nur genannt wird (Plot oder gesondert) – hilft beim Zusammenlegen der Mappen."""
    import io
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    cv.setFillColorRGB(0.12, 0.12, 0.12)
    cv.setFont("Helvetica", 11); cv.drawString(25 * mm, A4[1] - 40 * mm, f"Anlage {nr}")
    cv.setFont("Helvetica-Bold", 22)
    y = A4[1] - 52 * mm
    for z in (titel[:44], titel[44:88]):
        if z:
            cv.drawString(25 * mm, y, z); y -= 10 * mm
    cv.setLineWidth(1.2); cv.line(25 * mm, y, 185 * mm, y); y -= 12 * mm
    cv.setFont("Helvetica-Bold", 14); cv.drawString(25 * mm, y, "Dieser Plan liegt als Plot bei – gefaltet auf A4." if plot else "Diese Anlage liegt gesondert bei."); y -= 8 * mm
    cv.setFont("Helvetica", 11); cv.setFillColorRGB(0.35, 0.35, 0.35)
    if fmt:
        cv.drawString(25 * mm, y, f"Format {fmt}"); y -= 6 * mm
    y -= 6 * mm
    for z in kopf[:3]:
        cv.drawString(25 * mm, y, z[:95]); y -= 5.5 * mm
    cv.showPage(); cv.save()
    return buf.getvalue()


def ausfertigungen_pdf(data, n):
    """Ein PDF zum Durchdrucken: n Ausfertigungen hintereinander, jede beginnt mit dem Vermerk „Ausfertigung i von n“ oben rechts
    auf ihrer ersten Seite. n = 1: unverändert."""
    n = max(1, min(5, int(n or 1)))
    if n == 1:
        return data
    import io
    from pypdf import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    w = PdfWriter()
    for i in range(1, n + 1):
        R = PdfReader(io.BytesIO(data))
        for k, s in enumerate(R.pages):
            p = w.add_page(s)
            if k == 0:
                b, h = float(p.mediabox.width), float(p.mediabox.height)
                buf = io.BytesIO()
                cv = canvas.Canvas(buf, pagesize=(b, h))
                cv.setFont("Helvetica-Bold", 10); cv.setFillColorRGB(0.15, 0.15, 0.15)
                cv.drawRightString(b - 40, h - 28, f"Ausfertigung {i} von {n}")
                cv.showPage(); cv.save()
                p.merge_page(PdfReader(io.BytesIO(buf.getvalue())).pages[0])
    out = io.BytesIO()
    w.write(out)
    return out.getvalue()


def plotauftrag_pdf(zeilen, anzahl, hinweis, kopf, buero):
    """Auftragszettel für den Plotdienst: je Plan Format und Anzahl, dazu der Hinweis (Falten, Lieferung). zeilen: [{titel, format, seiten}]."""
    import io
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    y = A4[1] - 28 * mm
    cv.setFont("Helvetica-Bold", 18); cv.drawString(25 * mm, y, "Plotauftrag"); y -= 8 * mm
    cv.setFont("Helvetica", 10.5)
    for z in [x for x in (buero or [])[:4] if x] + [""] + [x for x in kopf[:3] if x]:
        cv.drawString(25 * mm, y, z[:95]); y -= 5.2 * mm
    y -= 4 * mm
    cv.setFont("Helvetica-Bold", 10); cv.drawString(25 * mm, y, "Plan"); cv.drawString(140 * mm, y, "Format"); cv.drawRightString(185 * mm, y, "Anzahl"); y -= 3 * mm
    cv.setLineWidth(0.6); cv.line(25 * mm, y, 185 * mm, y); y -= 7 * mm
    cv.setFont("Helvetica", 10.5)
    for e in zeilen:
        if y < 45 * mm:
            cv.showPage(); y = A4[1] - 25 * mm; cv.setFont("Helvetica", 10.5)
        cv.drawString(25 * mm, y, (e.get("titel") or "")[:62]); cv.drawString(140 * mm, y, (e.get("format") or "wie Datei")[:22]); cv.drawRightString(185 * mm, y, f"{anzahl}×"); y -= 7 * mm
    y -= 5 * mm
    cv.setFont("Helvetica-Bold", 10); cv.drawString(25 * mm, y, "Hinweise"); y -= 6 * mm
    cv.setFont("Helvetica", 10.5)
    for z in (hinweis or "").split("\n")[:14]:
        while z:
            if y < 20 * mm:
                cv.showPage(); y = A4[1] - 25 * mm; cv.setFont("Helvetica", 10.5)
            cv.drawString(25 * mm, y, z[:98]); z = z[98:]; y -= 5.5 * mm
    cv.showPage(); cv.save()
    return buf.getvalue()
