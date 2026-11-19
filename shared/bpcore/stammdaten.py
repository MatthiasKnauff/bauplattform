"""Stammdaten für alle Belange: Projekt (mit Bauherr und Terminen), Leistungsverzeichnis (Ausschreibung/Vergabe),
Angebot und Auftrag. Die Felder sind hier einmal beschrieben; dieselbe Maske (BPHead.datenMaske) zeigt sie in der
Verwaltung, in der AVA und in den Baukosten.

bp_store  projektdaten:<pid>   Projekt- und Bauherrendaten {feld: wert}
ava_lv.data["meta"]            Angaben zur Ausschreibung des LV
ava_lv.vergabe["auftrag"]      Angaben zum Auftrag
ava_angebot.daten              Angaben zum Angebot
"""
import json
from datetime import date, datetime

from . import plan

# Feld: (Schlüssel, Bezeichnung, Typ, Optionen/Hinweis) – Typen: text, textarea, date, time, zahl, eur, prozent, check, select, mail, tel,
# kontakt: Firma oder Person aus den Kontakten (Adressen) – Eingabe sucht dort, sonst „neu anlegen?“ mit der gewohnten Kontaktmaske.
#          Gespeichert werden der Name (<k>) und die Kontakt-ID (<k>_kid); Anschrift, Telefon, E-Mail kommen aus dem Kontakt.
#          Optionen als dict: {"rolle": Gewerk/Funktion beim Neuanlegen und für die Reihenfolge der Treffer, "hilfe": Hinweis}
def K(rolle, hilfe=""):
    return {"rolle": rolle, "hilfe": hilfe}


# Auswahl + frei (GO 17.11.2026): übliche Werte fest, dazu, was das Büro in anderen Projekten eingetragen hat (projekt_felder)
NUTZUNGEN = ["Wohnen", "Büro / Verwaltung", "Gewerbe", "Einzelhandel", "Gastronomie", "Hotel / Beherbergung", "Schule / Kita", "Pflege / betreutes Wohnen",
             "Praxis / Gesundheit", "Lager / Logistik", "Produktion / Werkstatt", "Sport / Freizeit", "Kultur / Versammlung", "Landwirtschaft / Tierhaltung"]
BERUFE = ["Architekt:in", "Dipl.-Ing. Architekt:in", "Innenarchitekt:in", "Landschaftsarchitekt:in", "Stadtplaner:in", "Bauingenieur:in", "Dipl.-Ing. Bauingenieur:in",
          "Bauvorlageberechtigte:r Ingenieur:in", "Staatlich geprüfte:r Bautechniker:in", "Handwerksmeister:in (bauvorlageberechtigt)"]
KAMMERN = ["Architektenkammer Nordrhein-Westfalen", "Ingenieurkammer-Bau Nordrhein-Westfalen", "Architektenkammer Niedersachsen", "Ingenieurkammer Niedersachsen",
           "Architektenkammer Rheinland-Pfalz", "Ingenieurkammer Rheinland-Pfalz", "Architekten- und Stadtplanerkammer Hessen", "Ingenieurkammer Hessen",
           "Bayerische Architektenkammer", "Bayerische Ingenieurekammer-Bau", "Architektenkammer Baden-Württemberg", "Ingenieurkammer Baden-Württemberg",
           "Architektenkammer Berlin", "Baukammer Berlin", "Brandenburgische Architektenkammer", "Brandenburgische Ingenieurkammer",
           "Architektenkammer Bremen", "Ingenieurkammer Bremen", "Hamburgische Architektenkammer", "Hamburgische Ingenieurkammer-Bau",
           "Architektenkammer Mecklenburg-Vorpommern", "Ingenieurkammer Mecklenburg-Vorpommern", "Architektenkammer des Saarlandes", "Ingenieurkammer des Saarlandes",
           "Architektenkammer Sachsen", "Ingenieurkammer Sachsen", "Architektenkammer Sachsen-Anhalt", "Ingenieurkammer Sachsen-Anhalt",
           "Architekten- und Ingenieurkammer Schleswig-Holstein", "Architektenkammer Thüringen", "Ingenieurkammer Thüringen"]
FUNKTIONEN = ["Geschäftsführung", "Projektleitung", "Bauleitung", "Objektüberwachung", "Entwurf / Planung", "Ausschreibung / Vergabe", "Bauantrag / Genehmigung",
              "Technische:r Zeichner:in", "Sachverständige:r", "Sekretariat / Assistenz", "Buchhaltung", "Werkstudent:in", "Auszubildende:r"]
NACHTRAGSGRUENDE = ["geänderte Ausführung (§ 2 Abs. 5 VOB/B)", "zusätzliche Leistung (§ 2 Abs. 6 VOB/B)", "Mengenänderung über 10 % (§ 2 Abs. 3 VOB/B)",
                    "Leistung ohne Auftrag (§ 2 Abs. 8 VOB/B)", "Wunsch der Bauherrschaft", "Planungsänderung", "unvorhergesehene Bestandssituation",
                    "Baugrund / Bodenverhältnisse", "behördliche Auflage", "Behinderung / Bauzeitverlängerung (§ 6 VOB/B)"]
LISTE_PROJEKT = 30   # höchstens so viele eigene Werte zusätzlich


PROJEKT = [
    ("Bauherr:in", [
        ("bauherr", "Bauherr:in", "kontakt", K("Bauherr", "steht auf Briefen, Rügen, LV-Deckblatt und Rechnungsfreigabe")),
        ("bh_vertreter", "Vertreten durch", "kontakt", K("Verwalter", "z. B. Hausverwaltung, Geschäftsführer, Bevollmächtigter")),
        ("bh_ansprech", "Ansprechpartner:in", "kontakt", K("Bauherr")),
        ("bh_firma", "Rechnung · USt-IdNr. · öffentlich", "html", "steht am Kontakt der Bauherr:in (Abschnitt „Firma / Rechnung“) – gilt in jedem Projekt dieser Bauherr:in"),   # PD-A1
    ]),
    ("Beteiligte", [
        ("baustelle", "Baustelle", "kontakt", K("Baustelle", "Baustellenadresse in den Kontakten – wie im Bautagebuch")),
        ("projektsteuerung", "Projektsteuerung", "kontakt", K("Projektsteuerung")),
        ("objektplanung", "Objektplanung / Architekt:in", "kontakt", K("Architekt")),
        ("tragwerk", "Tragwerksplanung", "kontakt", K("Tragwerksplanung")),
        ("sigeko", "SiGeKo", "kontakt", K("SiGeKo")),
        ("bauleitung", "Bauleiter:in (nach Landesbauordnung)", "kontakt", K("Bauleiter")),   # 15.11.2026 – auch im Bauantrag
        ("nw_waerme", "Wärmeschutz- / Energienachweis (GModG)", "kontakt", K("Energieberater")),
        ("nw_schall", "Schallschutznachweis", "kontakt", K("Bauphysik")),
        ("nw_brand", "Brandschutznachweis", "kontakt", K("Brandschutz")),
    ]),
    ("Projekt", [
        ("beschreibung", "Projektbeschreibung", "textarea", "kurz: was wird gebaut – erscheint z. B. auf dem LV-Deckblatt"),
        ("massnahme", "Art der Maßnahme", "select", ["", "Neubau", "Umbau", "Erweiterung", "Sanierung / Modernisierung", "Instandsetzung", "Abbruch", "Außenanlagen"]),
        ("nutzung", "Nutzung", "auswahl", {"opt": NUTZUNGEN, "hilfe": "übliche Nutzungen – dazu, was im Büro schon eingetragen ist; eigener Wert möglich", "liste": "projekt"}),
        ("gemarkung", "Gemarkung", "text", ""), ("flur", "Flur", "text", ""), ("flurstueck", "Flurstück", "text", ""),
        ("hoehe_nhn", "Geländehöhe über NHN", "text", "in m (DHHN2016) – mit „aus ALKIS ermitteln“ aus dem DGM1 NRW an der Baustelle"),
        ("genehmigung_az", "Baugenehmigung – Aktenzeichen", "text", ""), ("genehmigung_datum", "Baugenehmigung vom", "date", ""),
        ("budget", "Kostenrahmen (brutto)", "eur", ""),
        ("ki_extern_aus", "Keine externe KI (Vorgabe der Bauherrschaft)", "check", "sperrt externe KI für dieses Projekt – sonst gilt, was die Verwaltung erlaubt"),   # ki_fragen.projekt_ki
    ]),
    ("Bauantrag", [   # gilt für alle Anträge des Projekts – die App „Bauantrag“ liest und schreibt hier
        ("behoerde", "Untere Bauaufsichtsbehörde", "kontakt", K("Behörde", "z. B. Stadt Essen – Bauordnungsamt")),
        ("gs_flaeche", "Grundstücksgröße (m²)", "zahl", ""), ("bplan", "Bebauungsplan", "text", "z. B. Nr. 7/84 „Grillostraße“ – leer = Innenbereich"),
        ("gebiet", "Gebietsart", "select", ["", "Wohngebiet (WA)", "reines Wohngebiet (WR)", "Mischgebiet (MI)", "urbanes Gebiet (MU)", "Gewerbegebiet (GE)", "Industriegebiet (GI)", "Sondergebiet (SO)", "Außenbereich"]),
        ("baulasten", "Baulasten", "select", ["", "keine bekannt", "vorhanden", "angefragt"]), ("denkmal", "Denkmalschutz", "select", ["", "ja", "nein"]),
        ("gebaeudeklasse", "Gebäudeklasse", "select", ["", "1", "2", "3", "4", "5"]), ("sonderbau", "Sonderbau", "select", ["", "ja", "nein"]),
        ("grf", "Grundfläche GR (m²)", "zahl", ""), ("bgf", "Bruttogrundfläche BGF (m²)", "zahl", ""), ("bri", "Brutto-Rauminhalt BRI (m³)", "zahl", ""),
        ("grz", "GRZ vorhanden", "text", ""), ("gfz", "GFZ vorhanden", "text", ""), ("geschosse", "Vollgeschosse", "zahl", ""), ("hoehe", "Höhe OK Gebäude (m)", "zahl", ""),
        ("we", "Wohneinheiten", "zahl", ""), ("st_notw", "Stellplätze notwendig", "zahl", ""), ("st_nachg", "Stellplätze nachgewiesen", "zahl", ""),
    ]),
    ("Termine", [
        ("baubeginn", "Baubeginn", "date", "kann aus dem Bauzeitenplan übernommen oder dorthin übertragen werden"),
        ("fertigstellung", "voraussichtliche Fertigstellung", "date", ""),
        ("uebergabe", "Übergabe an die Bauherr:in", "date", ""),
    ]),
]

# Adressen (17.11.2026): übliche Gewerke/Rollen und Tags als Vorschlag – dazu, was das Büro schon eingetragen hat (contacts.begriffe); frei bleibt möglich
KONTAKT_GEWERKE = ["Bauherr", "Architekt", "Tragwerksplanung", "Bauphysik", "Energieberater", "Vermesser", "Prüfingenieur", "SiGeKo", "Bauamt",
                   "Abbruch", "Erdbau", "Rohbau", "Zimmerer", "Dachdecker", "Klempner", "Fenster", "Metallbau", "Putz / WDVS", "Trockenbau", "Estrich",
                   "Fliesen", "Maler", "Bodenbelag", "Tischler", "Heizung", "Sanitär", "Lüftung", "Elektro", "Aufzug", "Gerüstbau", "Außenanlagen",
                   "Baustelle", "Plotdienst"]
KONTAKT_TAGS = ["Stammfirma", "zuverlässig", "nicht mehr beauftragen", "Weihnachtskartenversand", "Osterpräsent", "Weihnachtsgeschenk",
                "Newsletter", "Einladung Sommerfest", "Presse"]
VERGABEART = ["", "Öffentliche Ausschreibung", "Beschränkte Ausschreibung", "Freihändige Vergabe / Verhandlungsvergabe", "Preisanfrage (privat)", "Direktauftrag"]
VERTRAG = ["", "Einheitspreisvertrag (VOB/B)", "Pauschalvertrag (VOB/B)", "Stundenlohnvertrag", "BGB-Werkvertrag"]
# Auswahl statt freier Felder (GO 17.11.2026, Entwurf „LV-Daten mit Auswahlfeldern“ – A1, B1, C2/C1, D, E1): Typ „auswahl“ = Liste mit
# üblichen Werten (hier fest, nach VOB/B), dazu, was das Büro schon einmal eingetragen hat (Server: ava_lvdaten.listen); „eigener Wert …“
# bleibt immer als letzte Zeile (BPHead.datenMaske). Optionen: {"opt": [Werte | [Wert, Anzeige]], "hilfe": …, "liste": Name der Büro-Liste}.
# Typ „chips“: Mehrfachauswahl (Wert = Liste der gewählten ids – hier die Texte selbst).
def A(opt, hilfe="", liste=""):
    return {"opt": opt, "hilfe": hilfe, "liste": liste}


ZEITEN = ["09:00", "10:00", "10:30", "11:00", "12:00", "14:00"]
ABGABEORT = ["im Büro der Ausschreibenden (Anschrift siehe Deckblatt)", "bei der Bauherrschaft", "über die Vergabeplattform", "per E-Mail an die Ausschreibenden"]
AUFFORDERUNG = ["Sollten Sie an der Ausführung der folgenden Leistungen interessiert sein, bitten wir um die termingerechte Abgabe Ihres Angebots.",
                "Wir bitten um Ihr Angebot für die folgenden Leistungen bis zum Abgabetermin.",
                "Im Auftrag der Bauherrschaft bitten wir um ein Angebot für die nachstehenden Leistungen."]
GAEB = ["GAEB DA XML (X83) – Angebot gern als X84", "GAEB 90 (D83) – Angebot gern als D84", "nur PDF / Papier"]
VEREINBARUNGEN = ["Gewertet werden nur Angebote, die bis zum Abgabetermin eingehen.", "Gewertet werden nur vollständig ausgefüllte Unterlagen.",
                  "Einzelpreise netto in Euro, höchstens zwei Nachkommastellen.", "Änderungen am Leistungsverzeichnis gelten nur, wenn sie schriftlich vereinbart sind.",
                  "Das Angebot ist an den gekennzeichneten Stellen rechtsverbindlich zu unterschreiben.",
                  "Anlagen sind Bestandteil der Ausschreibung."]   # Freistellungsbescheinigung steht unter „Nachweise“ (vb_bescheinigungen) – nicht doppelt
VB_STRAFE = ["keine", "0,2 % der Auftragssumme je Werktag Verzug, höchstens 5 %", "0,3 % der Auftragssumme je Werktag Verzug, höchstens 5 %", "nur für vereinbarte Zwischentermine"]
VB_ERFUELLUNG = ["entfällt", "5 % der Netto-Auftragssumme", "10 % der Netto-Auftragssumme"]
VB_GEWAEHR = ["4 Jahre (§ 13 Abs. 4 VOB/B)", "5 Jahre", "5 Jahre und 1 Monat", "2 Jahre (bewegliche Teile, Wartung)"]
VB_EINBEHALT = ["keiner", "3 % der Bruttoabrechnungssumme", "5 % der Bruttoabrechnungssumme"]
VB_RECHNUNG = ["Abschlagsrechnungen nach Aufmaß, Schlussrechnung nach Abnahme", "Abschläge nach Baufortschritt (Zahlungsplan)", "nur Schlussrechnung"]
VB_GRUNDLAGE = ["VOB/B (Fassung 2016)", "BGB-Bauvertrag (§§ 650a ff. BGB)"]
VB_NACHWEISE = ["Freistellungsbescheinigung (§ 48b EStG) wird spätestens mit Baubeginn eingereicht",
                "Freistellungsbescheinigung (§ 48b EStG), Unbedenklichkeitsbescheinigung der Berufsgenossenschaft und Nachweis der Betriebshaftpflichtversicherung spätestens mit Baubeginn"]
VB_NACHUNTERNEHMER = ["nur mit vorheriger Zustimmung der Auftraggeber:in; vorgesehene Nachunternehmer bitte im Angebot nennen", "nicht zugelassen"]
VB_ZAHLUNG = ["21 Tage nach Zugang der prüfbaren Rechnung (§ 16 Abs. 1 Nr. 3 VOB/B)", "14 Tage nach Zugang der prüfbaren Rechnung", "30 Tage nach Zugang der prüfbaren Rechnung"]
VB_ENERGIE = ["bauseits, kostenlos", "bauseits, Umlage nach den Abzügen", "Auftragnehmer:in stellt selbst"]
ZAHLUNGSFRIST = ["21", "30", "14"]

LV = [
    ("Ausschreibung", [
        ("vergabeart", "Vergabeart", "select", VERGABEART), ("vergabenr", "Vergabenummer", "text", "Vorschlag nach dem Schema des Büros – antippen übernimmt"),
        ("gewerk", "Gewerk", "auswahl", A([], liste="gewerk")),
        ("kg", "Kostengruppe DIN 276", "auswahl", A([], liste="kg")),
        ("budget", "Kostenansatz (netto)", "eur", "für den Vergleich mit den Angeboten"),
        ("versand", "Versand an die Bieter:innen", "date", ""),
        ("abgabe", "Angebotsabgabe bis", "date", ""), ("abgabe_zeit", "Uhrzeit", "auswahl", A(ZEITEN)),
        ("abgabeort", "Abgabeort", "auswahl", A(ABGABEORT)),
        ("eroeffnung", "Eröffnungstermin (Submission)", "date", ""),
        ("bindefrist", "Zuschlags- und Bindefrist bis", "date", ""),
        ("zuschlag", "Zuschlag erteilt am", "date", ""),
        ("vertragsart", "Vertragsart", "select", VERTRAG),
        ("nebenangebote", "Nebenangebote zugelassen", "check", ""),
    ]),
    ("Angebotsaufforderung", [   # Deckblatt des LV (ava_lvdruck.py)
        ("aufforderung", "Text der Angebotsaufforderung", "auswahl", A(AUFFORDERUNG)),
        ("gaeb", "Austauschformat", "auswahl", A(GAEB)),
        ("vereinbarungen", "Sonstige Vereinbarungen", "liste", {"opt": [{"id": t} for t in VEREINBARUNGEN], "neu": "Vereinbarung",
                                                                 "hilfe": "an/aus · Text frei · ↺ je Zeile zum Standard"}),   # Feldart „liste“ (bp.js bpTextliste)
    ]),
    ("Vertragsbedingungen", [   # dieselben wie im Protokoll der Angebotsbesprechung (Grundlagen); neues LV: Vorgaben des Büros (D, 17.11.2026)
        ("vb_vertragsgrundlage", "Vertragsgrundlage", "auswahl", A(VB_GRUNDLAGE)),   # 18.11.2026 (LV-Druck C1): Grundlage, Nachweise, Nachunternehmer, Zahlungsfrist
        ("vb_vertragsstrafe", "Vertragsstrafe", "auswahl", A(VB_STRAFE)),
        ("vb_erfuellung", "Vertragserfüllungsbürgschaft", "auswahl", A(VB_ERFUELLUNG)),
        ("vb_gewaehrleistung", "Gewährleistung", "auswahl", A(VB_GEWAEHR)),
        ("vb_einbehalt", "Gewährleistungseinbehalt", "auswahl", A(VB_EINBEHALT)),
        ("vb_einbehalt_abl", "Einbehalt ablösbar gegen Bürgschaft", "check", ""),
        ("vb_rechnungsstellung", "Rechnungsstellung", "auswahl", A(VB_RECHNUNG)),
        ("vb_zahlungsfrist", "Zahlungsfrist", "auswahl", A(VB_ZAHLUNG)),
        ("vb_bescheinigungen", "Nachweise", "auswahl", A(VB_NACHWEISE)),
        ("vb_nachunternehmer", "Nachunternehmer", "auswahl", A(VB_NACHUNTERNEHMER)),
        ("vb_energie", "Energie- / Medienkosten", "auswahl", A(VB_ENERGIE, "Umlagen für Bauwasser, Baustrom … stehen nach der Vergabe in den Abzügen")),
    ]),
    ("Ausführung", [
        ("ausf_beginn", "Ausführungsbeginn", "date", "kann aus dem Bauzeitenplan übernommen werden (Leistungen dieses Gewerks)"),
        ("ausf_ende", "Fertigstellung der Leistung", "date", ""),
        ("bemerkung", "Bemerkung", "textarea", ""),
    ]),
]
ANGEBOT = [
    ("Angebot", [
        ("angebotsnr", "Angebotsnummer", "text", ""), ("angebotsdatum", "Angebot vom", "date", ""),
        ("bindefrist", "gebunden bis", "date", ""),
        ("ansprech", "Ansprechpartner:in", "kontakt", K("", "Person bei der Bieter:in – Telefon und E-Mail aus den Kontakten")),
        ("nebenangebot", "enthält Nebenangebote", "check", ""), ("geprueft", "rechnerisch geprüft", "check", ""),
        ("vorbehalte", "Vorbehalte / Abweichungen", "textarea", "z. B. eigene Zahlungs- oder Lieferbedingungen"),
    ]),
]
AUFTRAG = [
    ("Auftrag", [
        ("auftragsnr", "Auftragsnummer", "text", "Vorschlag nach dem Schema des Büros – antippen übernimmt"), ("auftragsdatum", "Auftrag vom", "date", ""),
        ("vertragsart", "Vertragsart", "select", VERTRAG),
        ("beginn", "vertraglicher Ausführungsbeginn", "date", ""), ("ende", "vertragliche Fertigstellung", "date", ""),
        ("zahlungsfrist", "Zahlungsfrist Abschlagsrechnungen (Tage)", "auswahl", A(ZAHLUNGSFRIST, "VOB/B: 21 Tage")),
        ("bauleiter_an", "Bauleiter:in der Auftragnehmer:in", "kontakt", K("Bauleiter", "Telefon und E-Mail aus den Kontakten")),
        ("mitarbeiter_projekt", "Mitarbeiter:innen fürs Projekt", "text", "aus der Angebotsbesprechung"),   # 18.11.2026 (AB-A1: Rückweg aus dem Protokoll)
        ("subunternehmer", "Subunternehmer (Firma – Leistung, je Zeile)", "textarea", "aus der Angebotsbesprechung; Nachunternehmer nur mit Zustimmung"),
        ("bemerkung", "Bemerkung", "textarea", ""),
    ]),
    ("Vertragsbedingungen", [   # Vertragsstrafe, Sicherheiten, Gewährleistung, Umlagen: Rechenleiter „Abzüge“ (ava_abzuege.py) – daraus der Text
        ("vb_rechnungsstellung", "Rechnungsstellung", "auswahl", A(VB_RECHNUNG)),
    ]),
]


def _opt(o):
    if isinstance(o, list):
        return {"opt": o}
    if isinstance(o, dict):
        return {k: v for k, v in o.items() if v}
    return {"hilfe": o} if o else {}


def felder(defn):
    return [{"titel": t, "felder": [{"k": k, "l": l, "typ": typ, **_opt(o)} for k, l, typ, o in F]} for t, F in defn]


def projekt_felder(c):
    """Felder der Projektdaten – Auswahlfelder mit „liste: projekt“ bekommen dazu, was das Büro in anderen Projekten eingetragen hat (häufigste zuerst)."""
    F = felder(PROJEKT)
    keys = [f["k"] for g in F for f in g["felder"] if f["typ"] == "auswahl" and f.get("liste") == "projekt"]
    if not keys:
        return F
    n = {k: {} for k in keys}
    for r in c.execute("SELECT data FROM bp_store WHERE key LIKE 'projektdaten:%'").fetchall():
        d = _j(r["data"], {}) or {}
        for k in keys:
            v = str(d.get(k) or "").strip()
            if v:
                n[k][v] = n[k].get(v, 0) + 1
    for g in F:
        for f in g["felder"]:
            if f["k"] in n:
                fest = {str(x).lower() for x in f.get("opt") or []}
                f["opt"] = list(f.get("opt") or []) + [v for v, _ in sorted(n[f["k"]].items(), key=lambda x: (-x[1], x[0].lower())) if v.lower() not in fest][:LISTE_PROJEKT]
    return F


# Kurze Vorschlagslisten für einzelne Felder (Konto, Verwaltung): fest + was im Büro schon steht (Konten konto:<id>, Einstellungen co_bv_*)
LISTEN = {"beruf": (BERUFE, "beruf", "co_bv_beruf"), "kammer": (KAMMERN, "kammer", "co_bv_kammer"), "funktion": (FUNKTIONEN, "funktion", ""),
          "nachtrag": (NACHTRAGSGRUENDE, "", "")}


def listen(c, namen):
    """{name: [Werte]} – feste Werte zuerst, dann eigene Werte des Büros (häufigste zuerst), ohne Doppelte."""
    namen = [n for n in namen if n in LISTEN]
    if not namen:
        return {}
    konten = [_j(r["data"], {}) or {} for r in c.execute("SELECT data FROM bp_store WHERE key LIKE 'konto:%'").fetchall()]
    out = {}
    for n in namen:
        fest, feld, einst = LISTEN[n]
        z = {}
        for k in (konten if feld else []):
            v = str(k.get(feld) or "").strip()
            if v:
                z[v] = z.get(v, 0) + 1
        if einst:
            r = c.execute("SELECT value FROM settings WHERE key=?", (einst,)).fetchone()
            v = str((r["value"] if r else "") or "").strip()
            if v:
                z[v] = z.get(v, 0) + 1
        klein = {x.lower() for x in fest}
        out[n] = list(fest) + [v for v, _ in sorted(z.items(), key=lambda x: (-x[1], x[0].lower())) if v.lower() not in klein][:LISTE_PROJEKT]
    return out


def kontakt_ids(defn, werte):
    return sorted({int(werte[k + "_kid"]) for _, F in defn for k, _, typ, _ in F
                   if typ == "kontakt" and str((werte or {}).get(k + "_kid") or "").isdigit()})


def bereinigen(defn, werte, alt=None):
    """Nur bekannte Felder, Texte gekürzt, Zahlen als Zahl, Häkchen als bool."""
    out = dict(alt or {})
    for _, F in defn:
        for k, _, typ, o in F:
            if typ == "html":   # nur Anzeige
                continue
            if typ == "kontakt" and k + "_kid" in (werte or {}):
                kid = str(werte.get(k + "_kid") or "")
                out[k + "_kid"] = int(kid) if kid.isdigit() else None
            if k not in (werte or {}):
                continue
            v = werte[k]
            if typ == "check":
                out[k] = bool(v)
            elif typ in ("zahl", "eur", "prozent"):
                try:
                    out[k] = None if v in (None, "") else round(float(str(v).replace(".", "").replace(",", ".") if isinstance(v, str) and "," in v else v), 4)
                except (TypeError, ValueError):
                    out[k] = None
            elif typ == "date":
                v = str(v or "")[:10]
                out[k] = v if len(v) == 10 and v[4] == "-" else ""
            elif typ == "select":
                out[k] = v if v in o else ""
            elif typ == "chips":   # Mehrfachauswahl: Liste der gewählten ids
                out[k] = [str(x)[:300] for x in v][:30] if isinstance(v, list) else []
            elif typ == "liste":   # vorbelegte Textzeilen [{t, an, s?}]
                out[k] = liste_bereinigen(v)
            else:
                out[k] = str(v or "")[:4000 if typ == "textarea" else 300]
    return out


def liste_bereinigen(v):
    """Textliste (Feldart „liste“, 18.11.2026): [{t, an, s?}] – alte Form (Liste der gewählten Texte) wird zu Zeilen „an“."""
    out = []
    for x in (v if isinstance(v, list) else [])[:40]:
        z = {"t": x, "an": True} if isinstance(x, str) else x if isinstance(x, dict) else None
        if not z:
            continue
        t = " ".join(str(z.get("t") or "").split())[:400]
        y = {"t": t, "an": z.get("an") is not False}
        if z.get("s"):
            y["s"] = " ".join(str(z["s"]).split())[:400]
        if t or y.get("s"):
            out.append(y)
    return out


def liste_aktiv(v, std=None):
    """Texte der Zeilen, die „an“ sind – für Druck und Vertrag; ohne Wert die Standardzeilen (std)."""
    if v is None:
        return list(std or [])
    return [z["t"] for z in liste_bereinigen(v) if z["an"] and z["t"]]


def _j(v, d):
    try:
        return json.loads(v) if isinstance(v, str) and v else (v if v is not None and not isinstance(v, str) else d)
    except ValueError:
        return d


def projekt_lesen(c, pid, quellen=True):
    """Projektdaten für alle Apps. quellen=True (Vorgabe): Felder ohne eigenen Wert kommen aus ihrer Quelle (Kosten, Bauzeitenplan,
    Gebäudemodell, Baustelle – bpcore/projekt_herkunft.py, PD-B1); Rechnung/USt-IdNr./öffentlich aus dem Kontakt der Bauherr:in (PD-A1)."""
    d = _roh(c, pid)
    if not quellen:
        return d
    from . import projekt_herkunft as PH
    return {**PH.wirksam(d, PH.geerbt(c, pid, d)), **PH.bauherr_firma(c, d)}


def _roh(c, pid):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"projektdaten:{int(pid)}",)).fetchone()
    d = _j(r["data"], {}) if r else {}
    p = c.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
    if p is not None and not d.get("bauherr") and (p["client"] if "client" in p.keys() else ""):
        d["bauherr"] = p["client"]   # bisher nur der Name des Bauherrn am Projekt
    for k in ("bauherr", "bh_vertreter", "bh_ansprech"):   # früher Freitext: mit gleichnamigem Kontakt verbinden
        if d.get(k) and not d.get(k + "_kid"):
            r = c.execute("SELECT id FROM contacts WHERE lower(name)=?", (str(d[k]).strip().lower(),)).fetchone()
            if r:
                d[k + "_kid"] = r["id"]
    if p is not None and not d.get("baustelle_kid"):   # Baustellenadresse des Projekts (Bautagebuch)
        cid = _j(p["extra"], {}).get("contact_id") if "extra" in p.keys() else None
        r = c.execute("SELECT id, name FROM contacts WHERE id=?", (cid,)).fetchone() if str(cid or "").isdigit() else None
        if r:
            d["baustelle"], d["baustelle_kid"] = r["name"], r["id"]
    return d


GRUNDSTUECK = ("gemarkung", "flur", "flurstueck", "hoehe_nhn")


def grundstueck_kontakt(c, kid):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"grundstueck:kontakt:{int(kid)}",)).fetchone()
    d = _j(r["data"], {}) if r else {}
    return {k: str(d.get(k) or "") for k in GRUNDSTUECK}


def grundstueck_kontakt_schreiben(c, kid, werte, wer):
    d = {k: str((werte or {}).get(k) or "").strip()[:200] for k in GRUNDSTUECK}
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (f"grundstueck:kontakt:{int(kid)}", json.dumps(d, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), wer))
    return d


def projekt_schreiben(c, pid, werte, wer):
    from . import projekt_herkunft as PH
    roh = _roh(c, pid)
    d = bereinigen(PROJEKT, PH.nur_abweichendes(werte or {}, PH.geerbt(c, pid, {**roh, **(werte or {})})), roh)   # PD-B1: wie die Quelle = leer, folgt ihr weiter
    PH.firma_umziehen(c, d)   # PD-A1: frühere Rechnung/USt-IdNr./öffentlich an den Kontakt der Bauherr:in
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (f"projektdaten:{int(pid)}", json.dumps(d, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), wer))
    if "bauherr" in (werte or {}):   # der Name gilt weiter für alle Apps (Bautagebuch „Bauherrschaft“ usw.)
        c.execute("UPDATE projects SET client=? WHERE id=?", (d.get("bauherr") or "", pid))
    if d.get("baustelle_kid") and "baustelle_kid" in (werte or {}):   # gewählter Kontakt ist die Baustellenadresse des Projekts
        p = c.execute("SELECT extra, street, zip, city FROM projects WHERE id=?", (pid,)).fetchone()
        ex = _j(p["extra"], {}) if p else {}
        if p is not None and ex.get("contact_id") != d["baustelle_kid"]:
            ex.update(contact_id=d["baustelle_kid"], contact_declined=None)
            c.execute("UPDATE projects SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), pid))
        k = c.execute("SELECT street, zip, city FROM contacts WHERE id=?", (d["baustelle_kid"],)).fetchone()
        neu = tuple((k[f] or "").strip() for f in ("street", "zip", "city")) if k else ("", "", "")
        if p is not None and any(neu) and neu != tuple((p[f] or "").strip() for f in ("street", "zip", "city")):
            # MJ-B1 (18.11.2026): die Anschrift des Projekts kommt aus der Baustelle – Standort dazu (für das Bautagebuch vor Ort)
            from . import geo
            g = geo.search(", ".join(x for x in (neu[0], " ".join(x for x in neu[1:] if x)) if x))
            c.execute("UPDATE projects SET street=?, zip=?, city=?" + (", lat=?, lon=?" if g else "") + " WHERE id=?",
                      (*neu, *((g["lat"], g["lon"]) if g else ()), pid))
    return projekt_lesen(c, pid)


def plan_termine(c, pid, gewerk=None, name=None):
    """Anfang/Ende laut Bauzeitenplan(en) des Projekts – mit gewerk/name nur die passenden Leistungen."""
    s, f, plaene = None, None, []
    for gid, pname, data in plan.plans_mit_id(c, pid):
        if not isinstance(data, dict):
            continue
        plaene.append({"id": gid, "name": pname, "start": data.get("start") or ""})
        tasks = {t.get("uid"): t for t in data.get("tasks") or [] if isinstance(t, dict)}
        for x in data.get("sched") or []:
            t = tasks.get(x.get("uid")) or {}
            if x.get("g") or not x.get("s"):
                continue
            if gewerk or name:
                gw = (t.get("gw") or "").strip().lower()
                tn = (t.get("name") or "").lower()
                if not ((gewerk and gw and (gw == gewerk.lower() or gewerk.lower() in gw or gw in gewerk.lower()))
                        or (name and len(name) > 3 and name.lower() in tn)):
                    continue
            s = min(s, x["s"]) if s else x["s"]
            f = max(f, x.get("f") or x["s"]) if f else (x.get("f") or x["s"])
    return {"start": s or "", "ende": f or "", "plaene": plaene}


def baubeginn_in_plan(c, pid, tag):
    """Baubeginn als Projektanfang in die verknüpften Bauzeitenpläne schreiben (Termine rechnet der Plan beim Öffnen neu)."""
    try:
        date.fromisoformat(tag)
    except (TypeError, ValueError):
        return 0
    n = 0
    for gid, _, data in plan.plans_mit_id(c, pid, alle=True):   # in jede Version
        if isinstance(data, dict):
            data["start"] = tag
            c.execute("UPDATE gantt_projects SET data=? WHERE id=?", (json.dumps(data, ensure_ascii=False), gid))
            n += 1
    return n


# Ausschreibung (alle LVs) – Projektebene der Ausschreibungsdaten (18.11.2026, bpcore/ausschreibung.py): Schlüssel lv_… in den Projektdaten
from . import ausschreibung   # noqa: E402,F401 – hängt die Gruppe an PROJEKT an; braucht LV und A von oben
