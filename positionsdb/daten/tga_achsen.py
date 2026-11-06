# Gemeinsame Ausführungsachsen für die TGA-Leistungsbereiche (040–075). Wird von den lb_0xx-Dateien importiert,
# selbst aber nicht als Leistungsbereich geladen (Dateiname beginnt nicht mit lb_).
import re

# --- Ort / Bestand -----------------------------------------------------------------------------------------------
ORT = [{},
       {"k": "im Bestand", "t": "Ausführung im Bestand: Anpassung an vorhandene Installationen, Schutz angrenzender Bauteile, "
                                "erschwerte Zugänglichkeit und Materialtransport von Hand.", "fh": 1.3, "gen": "B", "tags": ["altbau"]},
       {"k": "Bestand, bewohnt", "t": "Ausführung im genutzten bzw. bewohnten Bestand: abschnittsweises Arbeiten, tägliche Reinigung, "
                                      "Versorgungsunterbrechungen nur nach Abstimmung und kurzzeitig.", "fh": 1.5, "gen": "C", "tags": ["altbau"]},
       {"k": "Arbeitshöhe über 3,5 m", "t": "Montagehöhe über 3,5 m bis 6 m über Standfläche; Arbeitsbühne bzw. Gerüst stellt der Auftragnehmer.",
        "fh": 1.2, "geraet": 0}]
ORT_KLEIN = ORT[:2]

# --- Leitungsverlegung -------------------------------------------------------------------------------------------
VERLEGUNG_ROHR = [
    {"k": "in Vorwand/Schacht", "t": "Verlegung in Vorwandinstallation bzw. Installationsschacht."},
    {"k": "Aufputz sichtbar", "t": "Sichtbare Verlegung auf Wand bzw. Decke, parallel und rechtwinklig ausgerichtet, mit Rohrschellen mit Schalldämmeinlage.",
     "fh": 1.1, "mat": 0.6},
    {"k": "unter Decke abgehängt", "t": "Verlegung unter der Rohdecke bzw. im Deckenhohlraum mit Gewindestangen und Montageschienen.",
     "fh": 1.2, "mat": 2.5},
    {"k": "auf Rohdecke/im Estrich", "t": "Verlegung auf Rohdecke im Fußbodenaufbau, mit Rohrschellen bzw. Befestigungsschienen gesichert.", "fh": 0.9},
    {"k": "unter Putz im Schlitz", "t": "Verlegung unter Putz in bauseits hergestelltem Schlitz, mit Befestigung und Schallschutzschlauch.", "fh": 1.3, "mat": 0.4},
]
VERLEGUNG_ABW = [VERLEGUNG_ROHR[0], VERLEGUNG_ROHR[1], VERLEGUNG_ROHR[2],
                 {"k": "im Erdreich/unter Bodenplatte", "t": "Verlegung in bauseits hergestelltem Graben auf Sandbett, Gefälle nach DIN 1986-100.", "fh": 0.85}]
VERLEGUNG_KABEL = [
    {"k": "unter Putz", "t": "Verlegung unter Putz bzw. in Hohlwand."},
    {"k": "auf Kabelrinne", "t": "Verlegung auf vorhandener Kabelrinne, gebündelt und mit Kabelbindern gesichert.", "fh": 0.75},
    {"k": "im Installationsrohr", "t": "Einziehen in vorhandene Leerrohre bzw. Installationskanäle.", "fh": 0.9},
    {"k": "Aufputz mit Schellen", "t": "Sichtbare Verlegung auf Putz mit Kunststoff- bzw. Metallschellen im Abstand ≤ 30 cm.", "fh": 1.2, "mat": 0.3},
    {"k": "im Beton/Rohdecke", "t": "Verlegung in der Rohdecke vor dem Betonieren in Abstimmung mit dem Rohbau.", "fh": 0.85},
]
VERLEGUNG_GERAET = [
    {"k": "UP Massivwand", "t": "Montage in Massivwand mit Unterputzdose."},
    {"k": "Hohlwand", "t": "Montage in Trockenbauwand mit Hohlwanddose.", "fh": 0.95, "mat": 0.5},
    {"k": "Aufputz", "t": "Aufputzmontage mit Aufputzgehäuse.", "fh": 0.9, "mat": 4},
    {"k": "im Brüstungskanal", "t": "Montage im Brüstungs- bzw. Leitungsführungskanal mit Geräteeinbaudose.", "fh": 0.85, "mat": 5},
]

# --- Befestigung / Untergrund ------------------------------------------------------------------------------------
BEFESTIGUNG = [
    {"k": "", "t": ""},
    {"k": "an Trockenbau", "t": "Befestigung an Trockenbauwand mit Traversen bzw. Hohlraumdübeln.", "fh": 1.05, "mat": 3},
    {"k": "an Holz/Stahl", "t": "Befestigung an Holz- oder Stahlkonstruktion mit Schellen bzw. Trägerklemmen.", "fh": 1.1, "mat": 2},
    {"k": "Altbaumauerwerk, Injektionsanker", "t": "Befestigung in Altbau- bzw. Lochmauerwerk mit Injektionsankern.", "fh": 1.15, "mat": 3,
     "tags": ["altbau"]},
]

# --- Ausstattungsstandard, Oberflächen ---------------------------------------------------------------------------
STANDARD = [
    {"k": "einfach", "t": "Ausstattungsstandard einfach (Objektserie).", "fm": 0.75},
    {"k": "mittel", "t": "Ausstattungsstandard mittel."},
    {"k": "gehoben", "t": "Ausstattungsstandard gehoben (Designserie, erweiterte Funktionen).", "fm": 1.6, "fh": 1.1},
    {"k": "Premium", "t": "Ausstattungsstandard Premium nach Bemusterung.", "fm": 2.4, "fh": 1.2, "gen": "C"},
]
OBERFLAECHE_SAN = [
    {"k": "", "t": "Oberfläche weiß bzw. verchromt."},
    {"k": "Farbe matt", "t": "Oberfläche in matter Sonderfarbe (z. B. schwarz matt) nach Bemusterung.", "fm": 1.25},
    {"k": "Edelstahl gebürstet", "t": "Oberfläche Edelstahl gebürstet bzw. PVD-beschichtet.", "fm": 1.45},
]
SCHALTERPROGRAMM = [
    {"k": "reinweiß", "t": "Schalterprogramm Kunststoff reinweiß glänzend."},
    {"k": "anthrazit matt", "t": "Schalterprogramm Kunststoff anthrazit bzw. schwarz matt.", "fm": 1.35},
    {"k": "Edelstahl/Alu", "t": "Schalterprogramm Metall (Edelstahl oder Aluminium).", "fm": 2.1},
    {"k": "Designrahmen Glas", "t": "Schalterprogramm mit Designrahmen aus Glas bzw. Echtmaterial nach Bemusterung.", "fm": 2.8, "gen": "C"},
]
SCHUTZART = [
    {"k": "", "t": ""},
    {"k": "IP44", "t": "Schutzart IP44 (spritzwassergeschützt).", "fm": 1.2},
    {"k": "IP65", "t": "Schutzart IP65 (strahlwassergeschützt), mit Kabelverschraubungen.", "fm": 1.55, "fh": 1.1},
]
LEUCHTE_FARBE = [
    {"k": "weiß", "t": "Gehäusefarbe weiß."},
    {"k": "schwarz/anthrazit", "t": "Gehäusefarbe schwarz bzw. anthrazit.", "fm": 1.05},
    {"k": "Sonderfarbe RAL", "t": "Gehäuse in Sonderfarbe nach RAL.", "fm": 1.25},
]
LEUCHTE_STEUERUNG = [
    {"k": "", "t": "Betriebsgerät schaltbar."},
    {"k": "Phasenabschnitt dimmbar", "t": "Betriebsgerät dimmbar über Phasenabschnitt.", "fm": 1.15},
    {"k": "DALI", "t": "Betriebsgerät DALI-2 dimmbar, Adressierung in Lichtsteuerung gesondert.", "fm": 1.3},
    {"k": "Tunable White", "ohne": ["3000 K", "4000 K"], "t": "Farbtemperatur einstellbar 2700–6500 K (Tunable White), DALI DT8.", "fm": 1.6, "gen": "C"},
]
KABEL_FE = [
    {"k": "", "t": ""},
    {"k": "halogenfrei", "t": "Ausführung halogenfrei (Brandverhalten Cca-s1b,d1,a1).", "fm": 1.4},
    {"k": "Funktionserhalt E30", "t": "Ausführung mit Funktionserhalt E30 auf geprüftem Verlegesystem nach DIN 4102-12.", "fm": 3.0, "fh": 1.8, "mat": 2.5},
]
MENGE = [{}, {"k": "Kleinmenge", "t": "Kleinmengen bzw. Einzellängen bis insgesamt 10 m je Einsatzstelle.", "fh": 1.3, "fm": 1.1, "gen": "B"}]
DAEMMUNG_VORGEDAEMMT = [
    {"k": "", "t": ""},
    {"k": "vorgedämmt 9 mm", "t": "Rohr werkseitig vorgedämmt (Schutzschlauch bzw. Dämmung 9 mm, Mindestdämmung nach DIN 1988-200 im Fußbodenaufbau).", "fm": 1.3},
    {"k": "vorgedämmt 100 % GEG", "ohne": ["unter Putz im Schlitz"], "t": "Rohr werkseitig vorgedämmt mit Dämmung entsprechend GEG Anlage 8 (100 %).", "fm": 1.8},
]
GERAET_AUFSTELLUNG = [
    {"k": "", "t": ""},
    {"k": "Einbringung erschwert", "t": "Einbringung über Treppen bzw. Engstellen ohne Kran, Gerät ggf. zerlegt einbringen.", "fh": 1.25, "geraet": 150},
    {"k": "mit Kran/Dachaufstellung", "t": "Aufstellung auf Dach bzw. schwer erreichbar, Autokran stellt der Auftragnehmer.", "fh": 1.15, "geraet": 650, "gen": "C"},
]
WARTUNG = [
    {"k": "", "t": ""},
    {"k": "inkl. 2 J. Wartung", "t": "Einschließlich Wartung für zwei Jahre ab Abnahme nach Herstellervorgaben (jährlich).", "mat": 0, "fh": 1.12, "fm": 1.04},
]


def zuweisen(lbs, regeln):
    """Ordnet Positionen ohne eigene 'achsen' Achsen nach Regeln zu: (Prüffunktion(gruppe, pos) → bool, [Achsen]).
    Die erste passende Regel gilt."""
    for lb in lbs:
        for gr in lb["gruppen"]:
            for p in gr["positionen"]:
                if "achsen" in p:
                    continue
                for f, ax in regeln:
                    if f(gr["name"], p):
                        p["achsen"] = ax
                        break
    return lbs


def ist(einheit=None, kurz=None, gruppe=None, nicht=None):
    """Hilfsfunktion für Regeln: Einheit (str/tuple), Regex auf Kurztext, Regex auf Gruppenname, Ausschluss-Regex."""
    def f(g, p):
        if einheit and p.get("einheit") not in ((einheit,) if isinstance(einheit, str) else einheit):
            return False
        if kurz and not re.search(kurz, p.get("kurz", ""), re.I):
            return False
        if gruppe and not re.search(gruppe, g, re.I):
            return False
        if nicht and re.search(nicht, p.get("kurz", ""), re.I):
            return False
        return True
    return f

KERNBOHRUNG = [{"k": "Mauerwerk", "t": "Bauteil aus Mauerwerk."},
               {"k": "Stahlbeton", "t": "Bauteil aus Stahlbeton, bewehrt; Bewehrung nach Freigabe durchtrennen.", "fh": 1.25, "fg": 1.45}]
# Bauteildicke als eigene Achse; feste Dickenangaben im Grund-/Kurztext werden dafür entfernt
KB_DICKE = [{"k": "", "t": "Bauteildicke bis 30 cm.",
             "ersetze": [[r"(^|,? )d (bis|≤) ?30 cm", ""], [r",? (Bauteil)?[Dd]icke bis 30 cm", ""]]},
            {"k": "d ≤ 50 cm", "t": "Bauteildicke über 30 cm bis 50 cm.", "fh": 1.5, "fg": 1.6}]
ZUGANG = [{"k": "", "t": ""}, {"k": "Decke überkopf", "t": "Ausführung in der Decke, überkopf, mit Wasserauffang.", "fh": 1.3, "geraet": 10}]
# Demontagen: immer Bestand (kein Bestandszuschlag); überkopf nur bei Leitungen unter der Decke
ZUGANG_DEM = [{}, {"k": "Überkopf", "t": "Demontage überkopf (Leitungen bzw. Bauteile unter der Decke) mit Wasserauffang.", "fh": 1.4}]
_BODEN_RX = r"kessel|tank|speicher|boiler|heizkörper|radiator|wanne|dusch|WC|waschtisch|urinal|bidet|verteiler|station|schrank|gerät"
_DEM_RX = r"demont|entsorg|stilleg|abtrennen|Bestand austauschen"


def vorab(achsen_klein=None):
    """Regeln, die vor den Gewerkregeln gelten: Demontage, Kernbohrungen, Zulagen, Dokumentation."""
    k = achsen_klein or [ORT_KLEIN]
    return [
        (ist(kurz=r"Kernbohrung"), [KERNBOHRUNG, KB_DICKE, ZUGANG, ORT_KLEIN]),
        (lambda g, p: bool(re.search(_DEM_RX, p.get("kurz", ""), re.I) and re.search(_BODEN_RX, p.get("kurz", ""), re.I)), []),
        (ist(kurz=_DEM_RX), [ZUGANG_DEM]),
        (ist(kurz=r"Dokumentation|Protokoll|Berechnung|Erklärung|Revisionsunterlagen|Nachweis"), []),   # Büroleistung: ohne Zuschläge
        (ist(kurz=r"^Zulage|Durchführung|kennzeichn|Prüfung|Messung|Inbetriebnahme|Einweisung|Wartung|Abgleich"), k),
    ]


# Inline-Armaturen, Zähler, Köpfe, Proben: ohne Befestigungsachse (keine eigene Wandbefestigung)
INLINE_RX = r"pumpe|regler|mischer|wächter|fänger|beprob|abscheider|zähler|ventil|filter|absperr|hahn|thermostat|fühler|probe|anschluss an bestand|entlüft|manometer|thermometer|schieber|klappe|rückfluss|druckminder"
GERAET_INNEN = GERAET_AUFSTELLUNG[:2]   # Geräte im Gebäude: ohne Kran/Dachaufstellung
