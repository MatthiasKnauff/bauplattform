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
    "grundstueck": "Gemarkung, Flur und Flurstück aus den Projektdaten (z. B. „Gemarkung Altenessen, Flur 3, Flurstück 12/4“)",
    "gemarkung": "Gemarkung (Projektdaten)", "flur": "Flur (Projektdaten)", "flurstueck": "Flurstück(e) (Projektdaten)",
    "hoehe_nhn": "Geländehöhe in m über NHN (Projektdaten)",
}
BEREICHE = {
    "maengelruege": {"name": "Mängelrüge", "gruppe": "Aufgaben & Mängel", "variablen": {
        **GEMEINSAM, "firma": "Name der gerügten Firma", "grundlage": "Rechtsgrundlage unter dem Betreff (§ 4 Abs. 7 / § 13 Abs. 5 VOB/B)",
        "frist": "Frist zur Beseitigung (TT.MM.JJJJ)", "anzahl": "Anzahl der gerügten Mängel", "auftrag": "Auftrag / Vergabe-Nr."}},
    "terminruege": {"name": "Terminrüge (Aufforderung zur Abhilfe)", "gruppe": "Aufgaben & Mängel", "variablen": {
        **GEMEINSAM, "firma": "Name der Firma", "grundlage": "Rechtsgrundlage unter dem Betreff (§ 5 Abs. 3 VOB/B)",
        "frist": "Frist zur Wiederaufnahme (TT.MM.JJJJ)", "anzahl": "Tage im Verzug", "auftrag": "Auftrag / Vergabe-Nr."}},
}
BEREICHE["honorarrechnung"] = {"name": "Honorarrechnung (Abschlag/Schluss)", "gruppe": "Honorar", "variablen": {
    **GEMEINSAM, "grundlage": "Zeile unter dem Betreff (z. B. „Abschlagszahlung nach § 15 Abs. 2 HOAI“)", "re_nr": "Rechnungsnummer",
    "auftraggeber": "Auftraggeber (erste Zeile des Empfängers)", "leistung": "beauftragte Leistung (Honorarauftrag)"}}
BEREICHE["bauantrag_anschreiben"] = {"name": "Bauantrag – Anschreiben an die Bauaufsicht", "gruppe": "Bauantrag", "variablen": {
    **GEMEINSAM, "grundlage": "Zeile unter dem Betreff (z. B. Aktenzeichen)", "behoerde": "Bauaufsichtsbehörde (erste Zeile des Empfängers)"}}
# Inhaltsblöcke der Briefe (fließen im Inhaltsbereich untereinander) – Reihenfolge, Schrift, Abstand und ein/aus je Layout einstellbar
def _b(key, name, groesse, fett=False, abstand=0.0, text=None, pflicht=False):
    return {"key": key, "name": name, "groesse": groesse, "fett": fett, "abstand": abstand, "an": True, **({"text": text} if text is not None else {}), **({"pflicht": True} if pflicht else {})}


BLOECKE = {
    "maengelruege": [_b("anschreiben", "Anschreiben", 9.5), _b("liste_titel", "Überschrift der Liste", 10, True, 4, ""),
                     _b("liste", "Mängelliste", 9.5, pflicht=True), _b("frist", "Frist", 10, True, 4, ""), _b("gruss", "Gruß und Unterschrift", 9.5)],
    "terminruege": [_b("anschreiben", "Anschreiben", 9.5), _b("liste_titel", "Überschrift der Liste", 10, True, 4, ""),
                    _b("liste", "Rückstand / Tage (Liste)", 9.5, pflicht=True), _b("frist", "Frist", 10, True, 4, ""), _b("gruss", "Gruß und Unterschrift", 9.5)],
}
BLOCK_VORGABE = {   # was ohne eigenen Text dasteht (Terminrüge: je nach Fall)
    "maengelruege": {"liste_titel": "Festgestellte Mängel", "frist": "Frist zur Beseitigung:"},
    "terminruege": {"liste_titel": "Rückstand / Tage ohne Besetzung (je nach Fall)", "frist": "Frist zur Abhilfe:"},
}


def bloecke(lay, bereich):
    """Inhaltsblöcke in der Reihenfolge des Layouts, fehlende mit den Vorgaben ergänzt. Text '' = Vorgabe des Ausdrucks."""
    std = {x["key"]: x for x in BLOECKE.get(bereich, [])}
    out, gesehen = [], set()
    for x in (lay or {}).get("bloecke") or []:
        if isinstance(x, dict) and x.get("key") in std and x["key"] not in gesehen:
            gesehen.add(x["key"]); out.append({**std[x["key"]], **{k: v for k, v in x.items() if k in ("groesse", "fett", "abstand", "an", "text")}})
    out += [dict(v) for k, v in std.items() if k not in gesehen]
    for x in out:
        if x.get("pflicht"):
            x["an"] = True
    return out


def _bloecke_pruefen(L):
    out = []
    for x in L if isinstance(L, list) else []:
        if not isinstance(x, dict) or not isinstance(x.get("key"), str) or len(x["key"]) > 20:
            continue
        n = lambda k, d, lo, hi: max(lo, min(hi, float(x.get(k) if isinstance(x.get(k), (int, float)) else d)))   # noqa: E731
        y = {"key": x["key"], "groesse": n("groesse", 9.5, 6, 20), "fett": bool(x.get("fett")), "abstand": n("abstand", 0, 0, 40), "an": x.get("an") is not False}
        if isinstance(x.get("text"), str):
            y["text"] = x["text"][:160]
        out.append(y)
    return out[:20]


AVA = {
    "buero": GEMEINSAM["buero"], "fusszeile": GEMEINSAM["fusszeile"], "datum": "heutiges Datum (Druckdatum)", "bearbeiter": GEMEINSAM["bearbeiter"],
    "projekt": GEMEINSAM["projekt"], "bauvorhaben": GEMEINSAM["bauvorhaben"], "bauherr": "Bauherrschaft des Projekts",
    "dokument": "Überschrift des Ausdrucks (z. B. „Rechnungsprüfung – 2. Abschlagsrechnung“)", "untertitel": "Zeile unter der Überschrift (Projekt, LV, Auftragnehmer)",
    "lv": "LV-Nummer und Bezeichnung (z. B. LV 03 Rohbauarbeiten)", "gewerk": "Gewerk des LV", "auftragnehmer": "beauftragte Firma",
    "seite": "Seitenzahl",
    **{k: GEMEINSAM[k] for k in ("grundstueck", "gemarkung", "flur", "flurstueck", "hoehe_nhn")},
}
RE = {"rechnung": "Rechnung (z. B. 2. Abschlagsrechnung)", "re_nr": "Rechnungsnummer der Firma", "re_datum": "Rechnungsdatum", "eingang": "Eingang der Rechnung"}
def _o(key, name, std, wahl=None):
    """Inhaltseinstellung eines Ausdrucks (im Layout gespeichert, beim Drucken änderbar)."""
    return {"key": key, "name": name, "typ": "wahl" if wahl else "bool", "std": std, **({"wahl": wahl} if wahl else {})}


BEREICHE.update({
    "lv": {"name": "Leistungsverzeichnis (Seiten nach dem Deckblatt)", "gruppe": "Ausschreibung & Abrechnung", "art": "ava", "variablen": dict(AVA),
           "optionen": [_o("preise", "Preise", "leer", [["leer", "leer – zum Ausfüllen"], ["schaetzung", "Schätzpreise"], ["auftrag", "Auftragspreise"]]),
                        _o("deckblatt", "Deckblatt", True), _o("vorbem", "Vorbemerkungen", True), _o("vbpos", "Vorbemerkungen im LV (Art „V“)", True),
                        _o("langtext", "Langtexte", True), _o("fotos", "Fotos zu den Positionen", True), _o("zusammenstellung", "Zusammenstellung der Titel", True),
                        _o("bieter", "Bieterangaben am Schluss", True), _o("seite_je_titel", "Jeder Titel auf neuer Seite", False),
                        _o("schrift", "Schriftgröße", "9", [["8", "klein"], ["9", "normal"], ["10", "groß"]])]},
    "preisspiegel": {"name": "Preisspiegel", "gruppe": "Ausschreibung & Abrechnung", "art": "ava", "variablen": dict(AVA),
                     "optionen": [_o("werte", "Je Bieter", "ep_gp", [["ep_gp", "Einheitspreis und Gesamtpreis"], ["ep", "nur Einheitspreis"], ["gp", "nur Gesamtpreis"]]),
                                  _o("markierung", "Niedrigsten Preis und Ausreißer (über 30 %) markieren", True), _o("mittel", "Spalte Mittelwert der Bieter", False),
                                  _o("a3", "Ab 7 Bietern auf A3 quer", True)]},
    "aufmass": {"name": "Massenermittlung / Aufmaß", "gruppe": "Ausschreibung & Abrechnung", "art": "ava", "variablen": dict(AVA),
                "optionen": [_o("zeilen", "Aufmaßzeilen", "alle", [["alle", "mit Zwischenschritten (jede Aufmaßzeile)"], ["summe", "ohne – nur die Menge je Position"]]), _o("rechenweg", "Rechenweg zeigen", True)]},
    "rechnungspruefung": {"name": "Rechnungsprüfung (Prüfblatt)", "gruppe": "Ausschreibung & Abrechnung", "art": "ava", "variablen": {**AVA, **RE}},
    "rechnungsfreigabe": {"name": "Rechnungsfreigabe für den Bauherrn", "gruppe": "Ausschreibung & Abrechnung", "art": "ava", "variablen": {**AVA, **RE}},
})
FELDER = {"Empfaenger": "Empfänger (Anschrift, mehrzeilig)", "Datum": "Datum", "Bearbeiter": "Bearbeitet von", "Betreff": "Betreff / Bauvorhaben"}
FORMATE = {"A4": ("A4 hoch", 210, 297), "A4q": ("A4 quer", 297, 210), "A3": ("A3 hoch", 297, 420), "A3q": ("A3 quer", 420, 297)}


def seite_mm(data):
    """(Breite, Höhe) der Seite in mm nach dem Format des Layouts (Vorgabe A4 hoch)."""
    f = FORMATE.get((data or {}).get("format")) or FORMATE["A4"]
    return f[1], f[2]


def seite_pt(data):
    w, h = seite_mm(data)
    return w * MM, h * MM


TYPEN = {"text": "Text", "feld": "Feld (im Brief änderbar)", "logo": "Logo", "linie": "Linie", "falzmarken": "Falz- und Lochmarken", "inhalt": "Inhalt (fließt)"}


def _e(typ, x, y, w, h, **k):
    return {"id": uuid.uuid4().hex[:8], "typ": typ, "x": x, "y": y, "w": w, "h": h, "seiten": "erste", **k}


def standard(bereich="maengelruege"):
    if (BEREICHE.get(bereich) or {}).get("art") == "ava":
        return _standard_ava(bereich)
    return _standard_brief()


def _standard_ava(bereich):
    """Wie die AVA-Ausdrucke bisher aussehen: Überschrift + Logo oben, Fußzeile mit Seitenzahl, Inhalt dazwischen."""
    if bereich == "preisspiegel":   # A4 quer
        return {"raster": 2.5, "format": "A4q", "folge_oben": 14, "elemente": [
            _e("text", 16, 12, 220, 8, text="{dokument}", groesse=16, fett=True, name="Überschrift"),
            _e("text", 16, 21, 220, 8, text="{untertitel}", groesse=9.5, farbe="mute", name="Untertitel"),
            _e("logo", 251, 12, 30, 18, name="Logo"),
            _e("inhalt", 16, 34, 265, 160, name="Inhalt"),
            _e("text", 16, 199, 180, 4, text="{buero} · {projekt} · {lv}", groesse=7.5, farbe="mute", seiten="alle", name="Fußzeile"),
            _e("text", 221, 199, 60, 4, text="Seite {seite} · {datum}", groesse=7.5, farbe="mute", ausrichtung="rechts", seiten="alle", name="Seitenzahl"),
        ]}
    if bereich == "lv":   # 25 mm Heftrand links, 15 mm rechts; Kopf- und Fußzeile auf allen Seiten nach dem Deckblatt
        return {"raster": 2.5, "folge_oben": 16, "elemente": [
            _e("text", 25, 7, 95, 4, text="{lv}", groesse=7.5, farbe="mute", seiten="alle", name="Kopfzeile links"),
            _e("text", 120, 7, 75, 4, text="{projekt}", groesse=7.5, farbe="mute", ausrichtung="rechts", seiten="alle", name="Kopfzeile rechts"),
            _e("inhalt", 25, 16, 170, 263, name="Inhalt"),
            _e("text", 25, 284, 120, 4, text="{buero} · {datum}", groesse=7.5, farbe="mute", seiten="alle", name="Fußzeile links"),
            _e("text", 145, 284, 50, 4, text="Seite {seite}", groesse=7.5, farbe="mute", ausrichtung="rechts", seiten="alle", name="Seitenzahl"),
        ]}
    return {"raster": 2.5, "folge_oben": 14, "elemente": [
        _e("text", 16, 14, 140, 8, text="{dokument}", groesse=16, fett=True, name="Überschrift"),
        _e("text", 16, 23, 140, 10, text="{untertitel}", groesse=9.5, farbe="mute", name="Untertitel"),
        _e("logo", 164, 14, 30, 22, name="Logo"),
        _e("inhalt", 16, 40, 178, 239, name="Inhalt"),
        _e("text", 16, 284, 130, 4, text="{buero} · {projekt} · {lv}", groesse=7.5, farbe="mute", seiten="alle", name="Fußzeile"),
        _e("text", 134, 284, 60, 4, text="Seite {seite} · {datum}", groesse=7.5, farbe="mute", ausrichtung="rechts", seiten="alle", name="Seitenzahl"),
    ]}


def _standard_brief():
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


def aktiv(c, bereich, vid=None):
    """Layout, nach dem gedruckt wird: die beim Drucken gewählte Version (vid), sonst die aktive (Vorgabe)."""
    d = lesen(c, bereich)
    v = (next((x for x in d["versionen"] if x["id"] == vid), None) if vid else None) \
        or next((x for x in d["versionen"] if x["id"] == d.get("aktiv")), None) or d["versionen"][0]
    return pruefen(v.get("data") or standard(bereich))


def skaliert(lay, fmt):
    """Layout auf ein anderes Format strecken (z. B. A4 quer → A3 quer bei vielen Bietern): Lage und Größe der Felder, Schrift bleibt."""
    if lay.get("format") == fmt or fmt not in FORMATE:
        return lay
    w0, h0 = seite_mm(lay)
    w1, h1 = FORMATE[fmt][1], FORMATE[fmt][2]
    fx, fy = w1 / w0, h1 / h0
    out = copy.deepcopy(lay)
    out["format"] = fmt
    for e in out["elemente"]:
        e["x"], e["w"], e["y"], e["h"] = e["x"] * fx, e["w"] * fx, e["y"] * fy, e["h"] * fy
    if out.get("folge_oben") is not None:
        out["folge_oben"] = out["folge_oben"] * fy
    return out


def optionen(c, bereich, vid=None, extra=None):
    """Inhaltseinstellungen eines Layouts (z. B. Langtexte, Preise) mit den Vorgaben des Ausdrucks ergänzt, darüber extra."""
    std = {o["key"]: o["std"] for o in (BEREICHE.get(bereich) or {}).get("optionen", [])}
    std.update((aktiv(c, bereich, vid).get("optionen") or {}))
    std.update({k: v for k, v in (extra or {}).items() if k in std})
    return std


def wahl(c, bereich):
    """Für den Druckdialog: Layouts (nicht archivierte Versionen) eines Ausdrucks, die Vorgabe zuerst markiert."""
    d = lesen(c, bereich)
    B = BEREICHE.get(bereich) or {}
    return {"bereich": bereich, "name": B.get("name", bereich), "vorgabe": d.get("aktiv"),
            "layouts": [{"id": v["id"], "name": v["name"], "format": FORMATE[pruefen(v.get("data") or {}).get("format", "A4")][0]}
                        for v in d["versionen"] if not v.get("archiviert")],
            "optionen": B.get("optionen", [])}


def pruefen(data):
    """Nur bekannte Typen und Felder, Maße innerhalb der Seite, höchstens ein Inhalt."""
    out, inhalt = [], False
    fmt = (data or {}).get("format") if (data or {}).get("format") in FORMATE else "A4"
    PW, PH = FORMATE[fmt][1], FORMATE[fmt][2]
    for e in (data or {}).get("elemente") or []:
        if not isinstance(e, dict) or e.get("typ") not in TYPEN:
            continue
        if e["typ"] == "inhalt":
            if inhalt:
                continue
            inhalt = True
        f = lambda k, d, lo, hi: max(lo, min(hi, float(e.get(k) if isinstance(e.get(k), (int, float)) else d)))   # noqa: E731
        x = {"id": str(e.get("id") or uuid.uuid4().hex[:8])[:16], "typ": e["typ"], "x": f("x", 20, 0, PW - 5), "y": f("y", 20, 0, PH - 5),
             "w": f("w", 40, 1, PW), "h": f("h", 6, 0.2, PH), "seiten": "alle" if e.get("seiten") == "alle" else "erste",
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
        out.append(_e("inhalt", 20, 25, PW - 35, PH - 45, name="Inhalt") if fmt != "A4" else _e("inhalt", 25, 118, 165, 154, name="Inhalt"))
    r = (data or {}).get("raster")
    fo = (data or {}).get("folge_oben")
    fo = max(5.0, min(150.0, float(fo))) if isinstance(fo, (int, float)) else None
    opt = {}
    for k, v in ((data or {}).get("optionen") or {}).items() if isinstance((data or {}).get("optionen"), dict) else ():
        if isinstance(k, str) and len(k) <= 30 and isinstance(v, (bool, int, float, str)):
            opt[k] = v[:200] if isinstance(v, str) else v
    bl = _bloecke_pruefen((data or {}).get("bloecke"))
    return {"raster": r if r in (1, 2, 2.5, 5, 10) else 2.5, "format": fmt, "elemente": out, **({"folge_oben": fo} if fo is not None else {}),
            **({"optionen": opt} if opt else {}), **({"bloecke": bl} if bl else {})}


def fuellen(t, werte):
    return re.sub(r"\{(\w+)\}", lambda m: str(werte.get(m.group(1), "")), t or "")


def inhalt(lay):
    e = next(x for x in lay["elemente"] if x["typ"] == "inhalt")
    return e


# Listen-Ausdrucke (Adressverzeichnis, Aufgaben …): Farben des Tabellenkopfs – eine Stelle für alle Apps.
# Neutral statt einer App-Farbe, damit Ausdrucke aus allen Apps gleich aussehen und auch schwarz-weiß gut lesbar sind.
TABELLE_KOPF, TABELLE_KOPF_TEXT, TABELLE_STREIFEN, TABELLE_LINIE = "#3a3a38", "#ffffff", "#f3f4f6", "#d9dbe0"


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


def umbruch_std(t, w, size, fn):
    """Text in Zeilen, die in w (Punkt) passen."""
    from reportlab.pdfbase.pdfmetrics import stringWidth
    out = []
    for z in str(t or "").split("\n"):
        cur = ""
        for wd in z.split(" "):
            n = (cur + " " + wd).strip()
            if cur and stringWidth(n, fn, size) > w:
                out.append(cur); cur = wd
            else:
                cur = n
        out.append(cur)
    return out


def rahmen(lay):
    """Inhaltsbereich in mm: (links, oben erste Seite, oben Folgeseiten, Breite, unten)."""
    e = inhalt(lay)
    fo = lay.get("folge_oben")
    return e["x"], e["y"], (fo if fo is not None else min(e["y"], 25)), e["w"], e["y"] + e["h"]


def platypus_seiten(lay, werte, fonts, logo_fn=None, bogen=False, erste_seite=1, ps=None):
    """PageTemplates („erste“, „folge“) für reportlab-Platypus nach dem Layout. erste_seite: Seitennummer, ab der das
    Layout zählt (z. B. 2, wenn ein Deckblatt davor steht – das Deckblatt zeichnet der Aufrufer selbst)."""
    from reportlab.platypus import Frame, PageTemplate
    ps = ps or seite_pt(lay)
    H = ps[1]
    x, y1, y2, w, u = rahmen(lay)

    def zeichne(cv, doc):
        n = doc.page - erste_seite + 1
        if n < 1:
            return
        cv.saveState()
        zeichnen(cv, lay, {**werte, "seite": str(n)}, n, H, fonts, bogen, logo_fn=logo_fn, umbruch=umbruch_std)
        cv.restoreState()

    def fr(oben, ident):
        return Frame(x * MM, H - u * MM, w * MM, (u - oben) * MM, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0, id=ident)
    return [PageTemplate(id="erste", frames=[fr(y1, "f1")], onPage=zeichne, autoNextPageTemplate="folge"),
            PageTemplate(id="folge", frames=[fr(y2, "f2")], onPage=zeichne)], w * MM


# ---------------------------------------------------------------- eigene Felder
# Einmal angelegt, in allen Layouts als {schluessel} nutzbar. quelle "projekt": einmal je Projekt eingetragen (Projekt-Maske
# oder beim ersten Ausdruck), dann immer gesetzt; "ausdruck": bei jedem Ausdruck abgefragt (z. B. eine Nummer, die jedes Mal neu ist).
def _slug(t):
    t = str(t or "").lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "_", t).strip("_")[:30] or "feld"


def eigene(c):
    r = c.execute("SELECT data FROM bp_store WHERE key='layout:eigene'").fetchone()
    try:
        d = json.loads(r["data"]) if r and r["data"] else []
    except (TypeError, ValueError):
        d = []
    return [x for x in d if isinstance(x, dict) and x.get("key")]


def eigene_setzen(c, liste, wer):
    belegt = set(GEMEINSAM) | set(AVA) | set(RE) | {k for b in BEREICHE.values() for k in b["variablen"]}
    out, keys = [], set()
    for x in (liste or [])[:60]:
        if not isinstance(x, dict) or not str(x.get("name") or "").strip():
            continue
        k = str(x.get("key") or "") or _slug(x["name"])
        k = _slug(k)
        while k in belegt or k in keys:
            k = (k + "_2")[:32]
        keys.add(k)
        out.append({"key": k, "name": str(x["name"]).strip()[:60], "quelle": "ausdruck" if x.get("quelle") == "ausdruck" else "projekt",
                    "hilfe": str(x.get("hilfe") or "")[:200]})
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES('layout:eigene',?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (json.dumps(out, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), wer))
    return out


def werte_projekt(c, pid):
    if not pid:
        return {}
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"layoutwerte:{int(pid)}",)).fetchone()
    try:
        d = json.loads(r["data"]) if r and r["data"] else {}
    except (TypeError, ValueError):
        d = {}
    return d if isinstance(d, dict) else {}


def werte_projekt_setzen(c, pid, werte, wer):
    d = werte_projekt(c, pid)
    for k, v in (werte or {}).items():
        d[k if re.fullmatch(r"_?[a-z0-9_]{1,50}", str(k)) else _slug(k)] = str(v or "")[:500]
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (f"layoutwerte:{int(pid)}", json.dumps(d, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), wer))
    return d


def gebraucht(c, bereich, lay=None):
    """Eigene Felder, die im aktiven Layout des Ausdrucks vorkommen."""
    lay = lay or aktiv(c, bereich)
    txt = " ".join(e.get("text") or "" for e in lay["elemente"])
    return [x for x in eigene(c) if "{" + x["key"] + "}" in txt]


def abfrage(c, bereich, pid):
    """Was vor dem Ausdruck gefragt werden muss: Felder „bei jedem Ausdruck“ und noch leere Projekt-Felder (alle mit Wert vorbelegt)."""
    W = werte_projekt(c, pid)
    out = []
    for x in gebraucht(c, bereich):
        out.append({**x, "wert": W.get(x["key"], "") if x["quelle"] == "projekt" else W.get("_zuletzt_" + x["key"], ""),
                    "fehlt": x["quelle"] == "ausdruck" or not W.get(x["key"])})
    return out


def eigene_werte(c, pid, extra=None):
    """Werte der eigenen Felder für den Ausdruck: Projektwerte, darüber die beim Ausdruck eingegebenen."""
    W = werte_projekt(c, pid)
    out = {x["key"]: W.get(x["key"], "") for x in eigene(c)}
    if pid:   # Grundstück aus den Projektdaten (Verwaltung → Projektdaten, „aus ALKIS ermitteln“)
        from . import stammdaten
        try:
            P = stammdaten.projekt_lesen(c, pid) or {}
        except Exception as e:
            from . import fehler
            fehler.still(None, "Ausdruck: Projektdaten (Grundstück) lesen", e)
            P = {}
        for k in ("gemarkung", "flur", "flurstueck", "hoehe_nhn"):
            out.setdefault(k, str(P.get(k) or ""))
        teile = [f"Gemarkung {P['gemarkung']}" if P.get("gemarkung") else "", f"Flur {P['flur']}" if P.get("flur") else "",
                 (f"Flurstück{'e' if ',' in str(P['flurstueck']) or ';' in str(P['flurstueck']) else ''} {P['flurstueck']}") if P.get("flurstueck") else ""]
        out.setdefault("grundstueck", ", ".join(t for t in teile if t))
    for k, v in (extra or {}).items():
        out[_slug(k)] = str(v or "")[:500]
    return out


def _buero_beispiel(c):
    """Büroname, Absender und Fußzeile für die Vorschau – aus Verwaltung → Büro, sonst neutrale Musterwerte (kein fest eingebautes Büro)."""
    S = {}
    if c is not None:
        try:
            S = {r[0]: r[1] or "" for r in c.execute("SELECT key, value FROM settings WHERE key IN ('office_name','co_short','co_street','co_zip','co_city','co_phone','co_email','co_web')")}
        except Exception:
            S = {}
    name = S.get("office_name") or "Musterbüro Architektur"
    ort = " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x) or "12345 Musterstadt"
    strasse = S.get("co_street") or "Musterstraße 1"
    fuss = " · ".join(v for v in (name, strasse, ort, S.get("co_phone") or "0123 456789", S.get("co_email") or "mail@musterbuero.de", S.get("co_web")) if v)
    return name, f"{S.get('co_short') or name}, {strasse}, {ort}", fuss


def beispiel(bereich, c=None):
    """Werte für die Vorschau im Editor."""
    BN, ABS, FUSS = _buero_beispiel(c)
    if (BEREICHE.get(bereich) or {}).get("art") == "ava":
        return {"buero": BN, "fusszeile": FUSS, "datum": datetime.now().strftime("%d.%m.%Y"),
                "bearbeiter": "Max Mustermann", "projekt": "A497 Maybachstraße 15a, Essen", "bauvorhaben": "A497 Maybachstraße 15a, 45133 Essen", "bauherr": "Muster Wohnbau GmbH",
                "dokument": {"lv": "Leistungsverzeichnis", "aufmass": "Massenermittlung – LV 03 Rohbauarbeiten", "rechnungspruefung": "Rechnungsprüfung – 2. Abschlagsrechnung",
                             "rechnungsfreigabe": "Rechnungsfreigabe – 2. Abschlagsrechnung"}.get(bereich, ""),
                "untertitel": "A497 Maybachstraße 15a, Essen · LV 03 Rohbauarbeiten", "lv": "LV 03 Rohbauarbeiten", "gewerk": "Rohbau", "auftragnehmer": "Muster Bau GmbH", "grundstueck": "Gemarkung Altenessen, Flur 3, Flurstück 12/4", "gemarkung": "Altenessen", "flur": "3",
                "flurstueck": "12/4", "hoehe_nhn": "54,30",
                "seite": "1", "rechnung": "2. Abschlagsrechnung", "re_nr": "RE-2026-117", "re_datum": "02.11.2026", "eingang": "04.11.2026"}
    return {"buero": BN, "absender": ABS, "fusszeile": FUSS,
            "datum": datetime.now().strftime("%d.%m.%Y"), "bearbeiter": "Max Mustermann", "projekt": "A497 Maybachstraße 15a, Essen",
            "bauvorhaben": "A497 Maybachstraße 15a, 45133 Essen", "dokument": {"maengelruege": "Mängelrüge nach VOB/B", "honorarrechnung": "2. Abschlagsrechnung", "bauantrag_anschreiben": "Antrag auf Baugenehmigung"}.get(bereich, "Aufforderung zur Abhilfe nach § 5 Abs. 3 VOB/B"),
            "re_nr": "2026-007", "auftraggeber": "Muster Wohnbau GmbH", "leistung": "Architektenleistungen LPh 1–9",
            "firma": "Muster Bau GmbH", "grundlage": "§ 4 Abs. 7 VOB/B" if bereich == "maengelruege" else "§ 5 Abs. 3 VOB/B",
            "frist": "20.11.2026", "anzahl": "3", "auftrag": "V-2026-014",
            "Empfaenger": "Muster Bau GmbH\nz. Hd. Herrn Beispiel\nMusterstraße 1\n45127 Essen", "Datum": datetime.now().strftime("%d.%m.%Y"),
            "Bearbeiter": "Max Mustermann", "Betreff": "Bauvorhaben: A497 Maybachstraße 15a, 45133 Essen, Auftrag V-2026-014"}


def kopie(d):
    return copy.deepcopy(d)
