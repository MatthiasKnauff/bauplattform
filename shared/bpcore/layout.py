"""Druck-Layouts der Bauplattform: Lage der Felder auf der ersten Seite (Briefkopf, Anschrift, Datum, Betreff …) und der
Bereich, in den der Inhalt fließt – je Ausdruck („Bereich“) mit eigenen Variablen, mit Versionen wie im Bauzeitenplan.

Gespeichert in bp_store „layout:<bereich>“: {"versionen": [{id, name, data, archiviert, datum, wer}], "aktiv": id}
data = {"raster": mm, "elemente": [{id, typ, x, y, w, h (mm von oben links), text, groesse, fett, farbe, ausrichtung,
                                    unterstrichen, seiten ("erste"|"alle"), nur_ohne_bogen, feld}]}
Typen: text (fester Text mit {variablen}), feld (im Brief-Editor änderbar: Empfänger, Datum, Bearbeiter, Betreff),
       logo, linie, falzmarken, inhalt (dorthin fließt der eigentliche Inhalt: Anschreiben, Liste, Frist, Gruß …).
"""
import copy
import json
import re
import uuid
from datetime import datetime

MM = 72 / 25.4

GEMEINSAM = {
    "buero": "Name des Büros (Einstellungen → Firma)",
    "absender": "Rücksendeangabe über der Anschrift: Kurzname, Straße, Ort des Büros",
    "fusszeile": "Kontaktzeile des Büros (Name · Anschrift · Telefon · E-Mail · Internet) – nur ohne Briefbogen nötig",
    "datum": "heutiges Datum",
    "bearbeiter": "Name dessen, der den Ausdruck erstellt",
    "projekt": "Projektname (z. B. A497 Maybachstraße 15a, Essen)",
    "bauvorhaben": "Projekt mit Baustellenadresse",
    "dokument": "Überschrift des Ausdrucks (z. B. „Mängelrüge nach VOB/B“)",
}
BEREICHE = {
    "maengelruege": {"name": "Mängelrüge", "gruppe": "Aufgaben & Mängel", "variablen": {
        **GEMEINSAM, "firma": "Name der gerügten Firma", "grundlage": "Rechtsgrundlage unter dem Betreff (§ 4 Abs. 7 / § 13 Abs. 5 VOB/B)",
        "frist": "Frist zur Beseitigung (TT.MM.JJJJ)", "anzahl": "Anzahl der gerügten Mängel", "auftrag": "Auftrag / Vergabe-Nr."}},
    "terminruege": {"name": "Terminrüge (Aufforderung zur Abhilfe)", "gruppe": "Aufgaben & Mängel", "variablen": {
        **GEMEINSAM, "firma": "Name der Firma", "grundlage": "Rechtsgrundlage unter dem Betreff (§ 5 Abs. 3 VOB/B)",
        "frist": "Frist zur Wiederaufnahme (TT.MM.JJJJ)", "anzahl": "Tage im Verzug", "auftrag": "Auftrag / Vergabe-Nr."}},
}
FELDER = {"Empfaenger": "Empfänger (Anschrift, mehrzeilig)", "Datum": "Datum", "Bearbeiter": "Bearbeitet von", "Betreff": "Betreff / Bauvorhaben"}
TYPEN = {"text": "Text", "feld": "Feld (im Brief änderbar)", "logo": "Logo", "linie": "Linie", "falzmarken": "Falz- und Lochmarken", "inhalt": "Inhalt (fließt)"}


def _e(typ, x, y, w, h, **k):
    return {"id": uuid.uuid4().hex[:8], "typ": typ, "x": x, "y": y, "w": w, "h": h, "seiten": "erste", **k}


def standard(bereich="maengelruege"):
    """Wie die Briefe bisher aussehen: DIN 5008 Form B (Anschrift im Fenster, Infoblock rechts, Betreff, Inhalt ab 118 mm)."""
    return {"raster": 2.5, "elemente": [
        _e("logo", 130, 12, 60, 16, nur_ohne_bogen=True, name="Logo"),
        _e("text", 25, 45.5, 80, 4, text="{absender}", groesse=7, farbe="mute", unterstrichen=True, name="Rücksendeangabe"),
        _e("feld", 25, 63, 80, 27, feld="Empfaenger", groesse=10, name="Empfänger"),
        _e("text", 128, 49, 62, 4, text="Datum", groesse=8, farbe="mute", name="Beschriftung Datum"),
        _e("feld", 128, 54, 62, 7, feld="Datum", groesse=10, name="Datum"),
        _e("text", 128, 63, 62, 4, text="Bearbeitet von", groesse=8, farbe="mute", name="Beschriftung Bearbeiter"),
        _e("feld", 128, 68, 62, 7, feld="Bearbeiter", groesse=10, name="Bearbeiter"),
        _e("text", 25, 94, 165, 7, text="{dokument}", groesse=13, fett=True, name="Überschrift"),
        _e("feld", 25, 102, 165, 8, feld="Betreff", groesse=10, name="Betreff"),
        _e("text", 25, 110.5, 165, 4, text="{grundlage}", groesse=8, farbe="mute", name="Grundlage"),
        _e("inhalt", 25, 118, 165, 154, name="Inhalt"),
        _e("falzmarken", 4, 105, 7, 106, name="Falz- und Lochmarken"),
        _e("text", 20, 285, 170, 4, text="{fusszeile}", groesse=7, farbe="mute", ausrichtung="mitte", seiten="alle", nur_ohne_bogen=True, name="Fußzeile"),
    ]}


def _key(b):
    return f"layout:{b}"


def lesen(c, bereich):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (_key(bereich),)).fetchone()
    try:
        d = json.loads(r["data"]) if r and r["data"] else None
    except (TypeError, ValueError):
        d = None
    if not d or not d.get("versionen"):
        d = {"versionen": [{"id": "v1", "name": "Startversion", "data": standard(bereich), "archiviert": False, "datum": "", "wer": ""}], "aktiv": "v1"}
    return d


def schreiben(c, bereich, d, wer):
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (_key(bereich), json.dumps(d, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), wer))


def aktiv(c, bereich):
    """Elemente der aktiven Version – nach ihr wird gedruckt."""
    d = lesen(c, bereich)
    v = next((x for x in d["versionen"] if x["id"] == d.get("aktiv")), None) or d["versionen"][0]
    return pruefen(v.get("data") or standard(bereich))


def pruefen(data):
    """Nur bekannte Typen und Felder, Maße innerhalb der Seite, höchstens ein Inhalt."""
    out, inhalt = [], False
    for e in (data or {}).get("elemente") or []:
        if not isinstance(e, dict) or e.get("typ") not in TYPEN:
            continue
        if e["typ"] == "inhalt":
            if inhalt:
                continue
            inhalt = True
        f = lambda k, d, lo, hi: max(lo, min(hi, float(e.get(k) if isinstance(e.get(k), (int, float)) else d)))   # noqa: E731
        x = {"id": str(e.get("id") or uuid.uuid4().hex[:8])[:16], "typ": e["typ"], "x": f("x", 20, 0, 205), "y": f("y", 20, 0, 292),
             "w": f("w", 40, 1, 210), "h": f("h", 6, 0.2, 297), "seiten": "alle" if e.get("seiten") == "alle" else "erste",
             "name": str(e.get("name") or "")[:60], "nur_ohne_bogen": bool(e.get("nur_ohne_bogen"))}
        if e["typ"] == "text":
            x.update(text=str(e.get("text") or "")[:2000])
        if e["typ"] == "feld":
            if e.get("feld") not in FELDER:
                continue
            x["feld"] = e["feld"]
        if e["typ"] in ("text", "feld"):
            x.update(groesse=f("groesse", 10, 5, 40), fett=bool(e.get("fett")), farbe="mute" if e.get("farbe") == "mute" else "ink",
                     ausrichtung=e.get("ausrichtung") if e.get("ausrichtung") in ("links", "mitte", "rechts") else "links",
                     unterstrichen=bool(e.get("unterstrichen")))
        if e["typ"] == "linie":
            x["staerke"] = f("staerke", 0.3, 0.1, 3)
        out.append(x)
    if not inhalt:
        out.append(_e("inhalt", 25, 118, 165, 154, name="Inhalt"))
    r = (data or {}).get("raster")
    return {"raster": r if r in (1, 2, 2.5, 5, 10) else 2.5, "elemente": out}


def fuellen(t, werte):
    return re.sub(r"\{(\w+)\}", lambda m: str(werte.get(m.group(1), "")), t or "")


def inhalt(lay):
    e = next(x for x in lay["elemente"] if x["typ"] == "inhalt")
    return e


def zeichnen(cv, lay, werte, seite, H, fonts, bogen, feld_fn=None, logo_fn=None, umbruch=None):
    """Feste Elemente einer Seite zeichnen (seite 1 = erste, sonst Folgeseite). feld_fn(name, x, y, w, h, size, multi, tip) setzt
    die änderbaren Felder (Entwurf: Formularfeld, endgültig: Text) – Koordinaten in Punkt, y unten."""
    from reportlab.lib import colors
    from reportlab.pdfbase.pdfmetrics import stringWidth
    ink, mute = colors.HexColor("#1e1e1e"), colors.HexColor("#6b6f76")
    for e in lay["elemente"]:
        if e["typ"] == "inhalt" or (seite > 1 and e["seiten"] != "alle") or (e.get("nur_ohne_bogen") and bogen):
            continue
        x, w, h = e["x"] * MM, e["w"] * MM, e["h"] * MM
        top = H - e["y"] * MM
        if e["typ"] == "logo":
            if logo_fn:
                logo_fn(cv, x + w, top, h, w)
        elif e["typ"] == "linie":
            cv.setStrokeColor(ink); cv.setLineWidth(e.get("staerke", 0.3))
            if w >= h:
                cv.line(x, top - h / 2, x + w, top - h / 2)
            else:
                cv.line(x + w / 2, top, x + w / 2, top - h)
        elif e["typ"] == "falzmarken":
            cv.setStrokeColor(colors.HexColor("#9aa0a6")); cv.setLineWidth(0.4)
            for yy, ln in ((105, 5), (210, 5), (148.5, 7)):
                cv.line(x, H - yy * MM, x + min(w, ln * MM), H - yy * MM)
        elif e["typ"] == "feld":
            if feld_fn:
                feld_fn(e["feld"], x, top - h, w, h, e["groesse"], h > e["groesse"] * 2.2, FELDER[e["feld"]])
        elif e["typ"] == "text":
            size, fn = e["groesse"], fonts["b"] if e["fett"] else fonts["n"]
            t = fuellen(e["text"], werte)
            if not t.strip():
                continue
            zeilen = umbruch(t, w, size, fn) if umbruch else t.split("\n")
            if len(zeilen) == 1:   # einzeilig: bei Bedarf verkleinern, damit es passt (z. B. lange Rücksendeangabe)
                while size > 5 and stringWidth(zeilen[0], fn, size) > w:
                    size -= 0.25
            cv.setFont(fn, size); cv.setFillColor(mute if e["farbe"] == "mute" else ink)
            yy, breit = top - size, 0
            for z in zeilen:
                if yy < top - h - size * 0.3 and z is not zeilen[0]:
                    break
                sw = stringWidth(z, fn, size); breit = max(breit, sw)
                if e["ausrichtung"] == "mitte":
                    cv.drawCentredString(x + w / 2, yy, z)
                elif e["ausrichtung"] == "rechts":
                    cv.drawRightString(x + w, yy, z)
                else:
                    cv.drawString(x, yy, z)
                yy -= size * 1.2
            if e.get("unterstrichen"):
                cv.setStrokeColor(mute); cv.setLineWidth(0.25)
                x0 = x if e["ausrichtung"] == "links" else (x + (w - breit) / 2 if e["ausrichtung"] == "mitte" else x + w - breit)
                cv.line(x0, yy + size * 1.2 - 2, x0 + breit, yy + size * 1.2 - 2)


def beispiel(bereich):
    """Werte für die Vorschau im Editor."""
    return {"buero": "GK3 Architektur", "absender": "GK3, Frohnhauser Str. 233, 45144 Essen", "fusszeile": "GK3 Architektur · Frohnhauser Str. 233 · 45144 Essen · 0201 123456 · mail@gk3-architektur.de",
            "datum": datetime.now().strftime("%d.%m.%Y"), "bearbeiter": "Max Mustermann", "projekt": "A497 Maybachstraße 15a, Essen",
            "bauvorhaben": "A497 Maybachstraße 15a, 45133 Essen", "dokument": "Mängelrüge nach VOB/B" if bereich == "maengelruege" else "Aufforderung zur Abhilfe nach § 5 Abs. 3 VOB/B",
            "firma": "Muster Bau GmbH", "grundlage": "§ 4 Abs. 7 VOB/B" if bereich == "maengelruege" else "§ 5 Abs. 3 VOB/B",
            "frist": "20.11.2026", "anzahl": "3", "auftrag": "V-2026-014",
            "Empfaenger": "Muster Bau GmbH\nz. Hd. Herrn Beispiel\nMusterstraße 1\n45127 Essen", "Datum": datetime.now().strftime("%d.%m.%Y"),
            "Bearbeiter": "Max Mustermann", "Betreff": "Bauvorhaben: A497 Maybachstraße 15a, 45133 Essen, Auftrag V-2026-014"}


def kopie(d):
    return copy.deepcopy(d)
