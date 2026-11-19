"""Ausschreibungsdaten in drei Ebenen: Büro → Projekt → LV (GO 18.11.2026, Mock „Ausschreibungsdaten in drei Ebenen“: AD-A1 B1 C1 D1 E1 F1).

Was für alle LVs eines Projekts gleich ist, steht einmal am Projekt (Gruppe „Ausschreibung (alle LVs)“ in den Projektdaten, Schlüssel lv_…),
sonst gilt die Vorgabe des Büros (Verwaltung → Büro & Standort → „Vorgaben für Ausschreibungen“). Ein LV hält nur, was nur es selbst hat
(Gewerk, KG, Kostenansatz, Vergabenummer, Termine) und Abweichungen. Das Erben selbst rechnet die App (plattform/ava_ebenen.py).

  ERBT        Schlüssel der LV-Daten (data.meta), die vom Projekt bzw. Büro kommen können
  VORSCHLAG   Abgabe/Eröffnung: am Projekt nur als Vorschlag (A1), nicht im Büro
  REGEL       Bindefrist als „x Wochen nach Abgabe“ – nur Projekt und Büro; das LV rechnet daraus das Datum
  buero(c)    Vorgaben des Büros {Schlüssel wie im LV: Wert} – Vertragsbedingungen (vb_…) teilt es mit dem Protokoll der Angebotsbesprechung
  projekt(c, pid)  Angaben am Projekt {Schlüssel wie im LV: Wert} (nur gefüllte)
  WEICHEN     Feld → {Weichenfeld: erlaubte Werte}: was durch die Vergabeart wegfällt (Mock „Ausschreibungsdaten Schritt für Schritt“, B1 19.11.2026) –
              verschwindet im Assistenten, in der Maske und im Druck; gespeicherte Werte bleiben und kommen mit der Weiche zurück (sichtbar, sichtbare)
"""
import json

from . import stammdaten

BUERO_KEY = "ava_lv_vorgaben"          # Vorgaben fürs Ausschreiben (außer Vertragsbedingungen)
VB_KEY = "ava_besprechung_vorgaben"    # Vertragsbedingungen – dieselben wie im Protokoll (plattform/ava_vergabe.GRUNDLAGEN)
NUR_LV = ("vergabenr", "gewerk", "kg", "budget", "versand", "bindefrist", "zuschlag", "ausf_beginn", "ausf_ende", "bemerkung")
VORSCHLAG = ("abgabe", "abgabe_zeit", "eroeffnung")
REGEL = "bindefrist_wochen"
WOCHEN = ["4 Wochen nach Abgabe", "6 Wochen nach Abgabe", "8 Wochen nach Abgabe", "12 Wochen nach Abgabe"]
OEFF = ("Öffentliche Ausschreibung", "Beschränkte Ausschreibung")
VERH, PRIV = "Freihändige Vergabe / Verhandlungsvergabe", "Preisanfrage (privat)"   # „Direktauftrag“: kein Angebotsverfahren
WEICHEN = {"vergabenr": {"vergabeart": OEFF}, "eroeffnung": {"vergabeart": OEFF},   # Submission und Vergabenummer nur bei Ausschreibungen
           **{k: {"vergabeart": OEFF + (VERH,)} for k in ("abgabeort", "nebenangebote")},
           **{k: {"vergabeart": OEFF + (VERH, PRIV)} for k in ("versand", "abgabe", "abgabe_zeit", "bindefrist", "aufforderung", "gaeb", "vereinbarungen")}}
PRAEFIX = "lv_"   # Schlüssel in den Projektdaten
GRUNDLAGEN = [   # Vertragsbedingungen ab Werk – auch das Protokoll der Angebotsbesprechung (plattform/ava_vergabe); (Schlüssel, Beschriftung, Vorgabe) – wie im Vordruck des Büros (Vorbelegungen besprochen am 14.11.2026)
    ("vertragsgrundlage", "Vertragsgrundlage (VOB/BGB)", "VOB/B (Fassung 2016)"),
    ("bescheinigungen", "Bescheinigungen / Nachweise / Sicherheiten", "Freistellungsbescheinigung (§ 48b EStG) wird spätestens mit Baubeginn eingereicht"),
    ("vertragsstrafe", "Vertragsstrafe", "keine"),
    ("erfuellung", "Vertragserfüllungsbürgschaft", "entfällt"),
    ("gewaehrleistung", "Gewährleistung", "5 Jahre"),
    ("einbehalt", "Gewährleistungseinbehalt", "5 % der Bruttoabrechnungssumme"),
    ("einbehalt_abl", "ablösbar gegen Bürgschaft", "ja"),   # eigener Schalter neben dem Einbehalt (14.11.2026)
    ("rechnungsstellung", "Rechnungsstellung", "Abschlagsrechnungen nach Aufmaß, Schlussrechnung nach Abnahme"),
    ("zahlungsfrist", "Zahlungsfrist Abschlagsrechnungen", "21 Tage nach Zugang der prüfbaren Rechnung (§ 16 Abs. 1 Nr. 3 VOB/B)"),   # 18.11.2026 → Auftragsdaten
    ("energie", "Energie- / Medienkosten", "bauseits, kostenlos"),
    ("nachunternehmer", "Nachunternehmer", "nur mit vorheriger Zustimmung der Auftraggeber:in; vorgesehene Nachunternehmer bitte im Angebot nennen"),   # 18.11.2026 (LV-Druck C1)
]


def _defs():
    """[(Gruppe, [(k, l, typ, o)])] der LV-Daten ohne die Felder, die nur das LV hat."""
    out = []
    for t, F in stammdaten.LV:
        f = [x for x in F if x[0] not in NUR_LV]
        if t == "Ausschreibung":
            i = next((n for n, x in enumerate(f) if x[0] == "eroeffnung"), len(f) - 1) + 1
            f.insert(i, (REGEL, "Zuschlags- und Bindefrist", "auswahl", stammdaten.A(WOCHEN, "das LV rechnet daraus das Datum")))
        if f:
            out.append((t, f))
    return out


ERBT = tuple(k for _, F in _defs() for k, *_ in F if k != REGEL)


def defs(ebene):
    """Felder einer Ebene: „projekt“ (mit Abgabe/Eröffnung als Vorschlag) oder „buero“ (ohne)."""
    return [(t, [x for x in F if ebene == "projekt" or x[0] not in VORSCHLAG]) for t, F in _defs()]


def projekt_gruppe():
    """Gruppe für stammdaten.PROJEKT – Schlüssel mit lv_ davor."""
    return ("Ausschreibung (alle LVs)", [(PRAEFIX + k, l, typ, o) for _, F in defs("projekt") for k, l, typ, o in F])


def _j(v, d):
    try:
        return json.loads(v) if isinstance(v, str) and v else d
    except ValueError:
        return d


def leer(v):
    return v is None or v == "" or v == [] or (isinstance(v, str) and not v.strip())


def buero(c):
    """{Schlüssel wie im LV: Wert} – Vorgaben des Büros (Vertragsbedingungen ab Werk aus GRUNDLAGEN)."""
    r = c.execute("SELECT value FROM settings WHERE key=?", (BUERO_KEY,)).fetchone()
    B = {k: v for k, v in (_j(r["value"] if r else "", {}) or {}).items() if not leer(v)}
    r = c.execute("SELECT value FROM settings WHERE key=?", (VB_KEY,)).fetchone()
    G = {**{k: v for k, _, v in GRUNDLAGEN}, **(_j(r["value"] if r else "", {}) or {})}
    if "vereinbarungen" not in B:   # ab Werk: alle Standardzeilen an (Feldart „liste“)
        B["vereinbarungen"] = [{"t": t, "an": True, "s": t} for t in stammdaten.VEREINBARUNGEN]
    for k, v in G.items():
        if k == "einbehalt_abl":
            B["vb_einbehalt_abl"] = str(v) == "ja" or v is True
        elif not leer(v):
            B["vb_" + k] = str(v)
    return B


def buero_schreiben(c, werte):
    """Vorgaben des Büros speichern: vb_… in die Vorgaben des Protokolls, der Rest in ava_lv_vorgaben."""
    D = stammdaten.bereinigen(defs("buero"), werte or {})
    r = c.execute("SELECT value FROM settings WHERE key=?", (VB_KEY,)).fetchone()
    G = _j(r["value"] if r else "", {}) or {}
    rest = {}
    for k, v in D.items():
        if k == "vb_einbehalt_abl":
            G["einbehalt_abl"] = "ja" if v else ""
        elif k.startswith("vb_"):
            G[k[3:]] = v
        else:
            rest[k] = v
    for key, val in ((VB_KEY, G), (BUERO_KEY, rest)):
        c.execute("INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (key, json.dumps(val, ensure_ascii=False)))


def projekt(c, pid, PD=None):
    """{Schlüssel wie im LV: Wert} – was am Projekt steht (ohne leere)."""
    PD = PD if PD is not None else stammdaten.projekt_lesen(c, pid)
    out = {}
    for _, F in defs("projekt"):
        for k, _, typ, _ in F:
            v = PD.get(PRAEFIX + k)
            if typ == "check":
                if PRAEFIX + k in PD and v is not None:
                    out[k] = bool(v)
            elif not leer(v):
                out[k] = v
    return out


def hilfen(c, felder):
    """Projektdaten: je Feld der Gruppe „Ausschreibung (alle LVs)“ als Hilfe, was ohne Eintrag gilt (Vorgabe des Büros)."""
    B = buero(c)
    for g in felder:
        for f in g["felder"]:
            k = f["k"][len(PRAEFIX):] if f["k"].startswith(PRAEFIX) else None
            if k is None:
                continue
            v = B.get(k)
            if isinstance(v, bool):
                v = "ja" if v else "nein"
            elif isinstance(v, list):
                v = f"{len(v)} ausgewählt"
            f["hilfe"] = f"leer = vom Büro: {v}" if not leer(v) else ("Vorschlag für neue LVs" if k in VORSCHLAG else "leer = je LV")
    return felder


if not any(t == projekt_gruppe()[0] for t, _ in stammdaten.PROJEKT):   # Gruppe in den Projektdaten (F1) – einmal, egal wer zuerst geladen wird
    stammdaten.PROJEKT.append(projekt_gruppe())


def sichtbar(k, W):
    """Feld gilt bei diesen Angaben (Weiche leer = alles)."""
    return all(not (W or {}).get(f) or (W or {}).get(f) in L for f, L in (WEICHEN.get(k) or {}).items())


def sichtbare(W):
    """Nur die Angaben, die bei der gewählten Vergabeart gelten (für Druck und Protokoll)."""
    return {k: v for k, v in (W or {}).items() if sichtbar(k, W)}
