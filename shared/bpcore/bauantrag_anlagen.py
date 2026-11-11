"""Bauantrag – Anlagen: alles, was zum Antrag gehört, auch was nicht als Datei im Paket liegt.

Arten: „bauvorlage“ (aus der Checkliste, b:<key>), „frei“ (eigene Zeile; frühere eigene Punkte des Deckblatts: e:<text>),
„plan“ (aus der Planliste von „Pläne & Dateien“) und „datei“ (PDF aus dem Projektordner). Pläne und Dateien werden entweder
nur genannt oder als PDF beigelegt (dann eine eigene Unterlage u<id> im Paket, Schlüssel ukey).
Je Anlage: an/aus, Stand (liegt bei · wird nachgereicht · liegt Prüfingenieur vor), Abschnitt (Trennblatt 1–5).
Abgabe: „papier“ (Pläne werden gefaltet dazugelegt – Packliste am Ende) oder „digital“ (alles als PDF, ZIP je Anlage).
Gespeichert in bauantrag.daten._paket: anlagen [..], anl_stand {id: stand}, anl_abschnitt {id: nr}, abgabe.
"""
import re

STAND = {"bei": "liegt bei", "nach": "wird nachgereicht", "pruef": "liegt Prüfingenieur vor"}
BV_ABSCHNITT = {"liegenschaft": 2, "lageplan": 2, "grundrisse": 3, "schnitte": 3, "ansichten": 3, "baubeschreibung": 4, "berechnungen": 4,
                "statik": 5, "waerme": 5, "brandschutz": 5, "stellplatz": 5, "entwaesserung": 5, "statistik": 1}
BV_PLAN = {"grundrisse": "grundriss", "schnitte": "schnitt", "ansichten": "ansicht", "lageplan": "lageplan"}   # durch Pläne erledigt


def _fold(s):
    return (s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")


def text(x):
    """Bezeichnung einer Anlage, bei Plänen mit Nummer und Index."""
    if x.get("art") == "plan":
        z = " ".join(v for v in (f"Plan {x['nr']}" if x.get("nr") else "", f"Index {x['index']}" if x.get("index") else "") if v)
        return f"{x.get('text') or 'Plan'}{' · ' + z if z else ''}"
    return x.get("text") or ""


def liste(P, bauvorlagen):
    """Alle Anlagen in Anzeige-Reihenfolge (Abschnitt, dann wie angelegt)."""
    Dk = P.get("deckblatt") or {}
    ein, aus = set(Dk.get("ein") or []), set(Dk.get("aus") or [])
    S, AB = P.get("anl_stand") or {}, P.get("anl_abschnitt") or {}
    eig = [x for x in (P.get("anlagen") or []) if isinstance(x, dict) and x.get("id")]
    plantitel = " ".join(_fold(x.get("text")) for x in eig if x.get("art") == "plan" and x.get("an", True))
    out = []
    for b in bauvorlagen:
        if b["key"] == "antrag":
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
                    "pfad": x.get("pfad") or "", "nr": x.get("nr") or "", "index": x.get("index") or "", "plan": x.get("plan") or ""})
    for x in out:
        x["bezeichnung"] = text(x)
    return sorted(out, key=lambda x: x["abschnitt"])


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
        ziel["eintraege"].append({"art": "nennen", "id": y["id"], "titel": y["bezeichnung"], "stand": y["stand"], "plan": y["art"] == "plan"})
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
