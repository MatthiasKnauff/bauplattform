# LB 026 Fenster, Außentüren – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

_FE = ("{rahmen} liefern und einbauen, Dreh-Kipp-Beschlag umlaufend verdeckt, Dreifach-Wärmeschutzverglasung "
       "mit warmer Kante, Uw ≤ {uw} W/(m²K), Farbe {farbe}. Fenstergröße im Mittel {gr} m², ein- oder zweiflügelig nach "
       "Fensterliste. Einschließlich Befestigung nach Montageleitfaden; Anschlussabdichtung wird gesondert vergütet. "
       "Abrechnung nach Fensterfläche (Rahmenaußenmaß).")

LBS = [{
    "nr": "026", "name": "Fenster, Außentüren", "atv": "DIN 18355 / DIN 18360", "lohn": "fenster",
    "gruppen": [
        {"name": "Fenster", "positionen": [
            {"kurz": "Kunststofffenster Uw {uw}, {gr} m²",
             "lang": _FE, "rahmen": "Kunststofffenster aus Mehrkammerprofilen (Bautiefe ≥ 76 mm) mit Stahlaussteifung", "farbe": "gemäß Ausführung",
             "einheit": "m²", "kg": "334", "gen": "B", "tags": ["neubau", "altbau"],
             "varianten": [{"uw": "0,95", "farbe": "weiß", "gr": "bis 1,0", "h": 1.9, "mat": 300},
                           {"uw": "0,95", "farbe": "weiß", "gr": "1,0–2,5", "h": 1.5, "mat": 255},
                           {"uw": "0,95", "farbe": "weiß", "gr": "über 2,5", "h": 1.3, "mat": 230},
                           {"uw": "0,80", "farbe": "weiß", "gr": "1,0–2,5", "h": 1.5, "mat": 290}]},
            {"kurz": "Holzfenster Uw {uw}, {fk}, {gr} m²",
             "lang": _FE, "rahmen": "Holzfenster aus lamelliertem Kantel (Kiefer oder Fichte, IV 78/IV 92), werkseitig deckend beschichtet",
             "einheit": "m²", "kg": "334", "gen": "B",
             "varianten": [{"uw": "0,95", "farbe": "deckend weiß", "fk": "weiß", "gr": "1,0–2,5", "h": 1.7, "mat": 430},
                           {"uw": "0,80", "farbe": "Lasur nach Wahl", "fk": "lasiert", "gr": "1,0–2,5", "h": 1.7, "mat": 480}]},
            {"kurz": "Holz-Alu-Fenster Uw {uw}, {gr} m²",
             "lang": _FE, "rahmen": "Holz-Aluminium-Fenster, innen Holz (Kiefer/Fichte/Eiche), außen hinterlüftete Aluminium-Deckschale pulverbeschichtet",
             "farbe": "innen Holz lasiert, außen RAL nach Wahl", "einheit": "m²", "kg": "334", "gen": "B",
             "varianten": [{"uw": "0,85", "gr": "bis 1,0", "h": 2.1, "mat": 760},
                           {"uw": "0,85", "gr": "1,0–2,5", "h": 1.8, "mat": 660},
                           {"uw": "0,85", "gr": "über 2,5", "h": 1.6, "mat": 600}]},
            {"kurz": "Alufenster Uw {uw}, {gr} m²",
             "lang": _FE, "rahmen": "Aluminiumfenster aus thermisch getrennten Profilen, pulverbeschichtet",
             "farbe": "RAL nach Wahl", "einheit": "m²", "kg": "334", "gen": "B",
             "varianten": [{"uw": "1,0", "gr": "bis 1,0", "h": 2.1, "mat": 760}, {"uw": "1,0", "gr": "1,0–2,5", "h": 1.8, "mat": 640}]},
            {"kurz": "Festverglasung Kunststoff Uw 0,90",
             "lang": "Festverglasung (Blendrahmen mit Glashalteleiste) aus Kunststoffprofilen, Dreifach-Wärmeschutzglas, weiß, "
                     "Größe nach Liste, einschließlich Befestigung. Abrechnung nach Fläche (Rahmenaußenmaß).",
             "einheit": "m²", "kg": "334", "h": 1.2, "mat": 175, "gen": "B"},
            {"kurz": "Fenstertür Kunststoff DK, bis {gr}",
             "lang": "Fenstertür (Balkon-/Terrassentür) aus Kunststoffprofilen, einflügelig Dreh-Kipp, Dreifachverglasung "
                     "Uw ≤ 0,95 W/(m²K), mit Balkontürgriff außen, barrierearme Bodenschwelle (≤ 2 cm), Größe bis {gr}. "
                     "Einschließlich Befestigung; Anschlussabdichtung gesondert.",
             "einheit": "St", "kg": "334", "gen": "B",
             "varianten": [{"gr": "1,00 × 2,20 m", "h": 3.5, "mat": 900}, {"gr": "1,25 × 2,30 m", "h": 4.0, "mat": 1100}]},
            {"kurz": "Hebe-Schiebe-Tür {mat_}, bis {gr}",
             "lang": "Hebe-Schiebe-Tür aus {mat_}, ein Flügel schiebbar, ein Teil fest, Dreifach-Wärmeschutzglas mit "
                     "Sicherheitsglas innen, Uw ≤ 0,90 W/(m²K), wärmegedämmte flache Bodenschwelle, Griffmuschel außen. "
                     "Größe bis {gr}. Einschließlich Befestigung und Transport an die Einbaustelle.",
             "einheit": "St", "kg": "334", "gen": "C",
             "varianten": [{"mat_": "Kunststoff", "gr": "3,00 × 2,30 m", "h": 9, "mat": 3300},
                           {"mat_": "Holz-Aluminium", "gr": "3,00 × 2,30 m", "h": 10, "mat": 5800},
                           {"mat_": "Aluminium", "gr": "4,00 × 2,40 m", "h": 12, "mat": 7400}]},
            {"kurz": "Dachflächenfenster Klapp-Schwing, {gr}",
             "lang": "Dachflächenfenster mit Klapp-Schwingfunktion, Holz weiß lackiert bzw. Kunststoff, Dreifachverglasung "
                     "Uw ≤ 1,0 W/(m²K), mit Eindeckrahmen für die vorhandene Dacheindeckung und Dämm- und "
                     "Dampfsperranschlussset, Größe {gr}.",
             "einheit": "St", "kg": "362", "gen": "C", "lohn": "dach",
             "varianten": [{"gr": "78 × 118 cm", "h": 5, "mat": 780}, {"gr": "114 × 140 cm", "h": 6, "mat": 1050}]},
            {"kurz": "Kellerfenster Kunststoff, Kipp, {gr}",
             "lang": "Kellerfenster aus Kunststoff, Kippflügel, Isolierverglasung, mit Insektenschutzgitter, in "
                     "Mauerwerk oder Betonwand eingebaut, Größe {gr}.",
             "einheit": "St", "kg": "334", "gen": "B",
             "varianten": [{"gr": "80 × 60 cm", "h": 1.5, "mat": 150}, {"gr": "100 × 75 cm", "h": 1.8, "mat": 190}]},
        ]},
        {"name": "Zuschläge und Sonderausstattung", "positionen": [
            {"kurz": "Zuschlag Sicherheitsbeschlag RC2 einschließlich P4A-Glas",
             "lang": "Mehrpreis für einbruchhemmende Ausführung RC 2 nach DIN EN 1627: Pilzkopfverriegelung umlaufend, "
                     "Sicherheitsschließbleche, abschließbarer Griff, Verglasung P4A innen, Montage nach Prüfzeugnis. "
                     "Abrechnung je Flügel.",
             "einheit": "St", "kg": "334", "h": 0.5, "mat": 230, "gen": "B"},
            {"kurz": "Zuschlag Schallschutzverglasung Rw ≥ {db} dB",
             "lang": "Mehrpreis für Schallschutz-Isolierglas mit bewertetem Schalldämmmaß Rw ≥ {db} dB (Fenster "
                     "Schallschutzklasse nach VDI 2719 entsprechend). Abrechnung nach Glasfläche.",
             "einheit": "m²", "kg": "334", "h": 0, "gen": "B",
             "varianten": [{"db": "38", "mat": 45}, {"db": "42", "mat": 85}, {"db": "45", "mat": 130}]},
            {"kurz": "Zuschlag Sprossen im Scheibenzwischenraum / aufgesetzt",
             "lang": "Mehrpreis für Sprossenteilung nach Ansicht: aufgesetzte Wiener Sprosse beidseitig mit "
                     "Distanzprofil im Scheibenzwischenraum. Abrechnung je Feld (Sprossenfeld).",
             "einheit": "St", "kg": "334", "h": 0, "mat": 32, "gen": "C"},
            {"kurz": "Zuschlag Ornament-/Satinatoglas",
             "lang": "Mehrpreis für Ornamentglas bzw. satiniertes Glas als Sichtschutz (z. B. Bad, WC) anstelle Klarglas. "
                     "Abrechnung nach Glasfläche.",
             "einheit": "m²", "kg": "334", "h": 0, "mat": 48, "gen": "B"},
            {"kurz": "Fensterlüfter / Falzlüfter für Lüftungskonzept",
             "lang": "Selbstregulierenden Falz- oder Rahmenlüfter nach Lüftungskonzept DIN 1946-6 in Fensterrahmen "
                     "einbauen, mit Wetter- und Insektenschutz.",
             "einheit": "St", "kg": "334", "h": 0.3, "mat": 55, "gen": "B"},
            {"kurz": "Fenstergriff abschließbar",
             "lang": "Mehrpreis für abschließbaren Fenstergriff (Zylinder oder Druckknopf) anstelle Standardgriff, "
                     "gleichschließend je Wohnung.",
             "einheit": "St", "kg": "334", "h": 0.1, "mat": 22, "gen": "A"},
            {"kurz": "Öffnungsüberwachung Fenster (Magnetkontakt, Riegelkontakt)",
             "lang": "Verdeckt liegenden Magnet- oder Riegelschaltkontakt im Fensterfalz einbauen, Kabelübergang zum "
                     "Blendrahmen, Anschluss an Einbruchmeldeanlage gesondert.",
             "einheit": "St", "kg": "334", "h": 0.5, "mat": 45, "gen": "B"},
        ]},
        {"name": "Außentüren", "positionen": [
            {"kurz": "Haustür {mat_}, {fu}, bis {gr}",
             "lang": "Hauseingangstür aus {mat_}, einflügelig, flügelüberdeckende bzw. beidseitig flächenbündige "
                     "Füllung {fu}, Ud ≤ {ud} W/(m²K), Mehrfachverriegelung mit Profilzylinder, Stoßgriff außen und "
                     "Drücker innen, thermisch getrennte Bodenschwelle, Größe bis {gr}. Einschließlich Befestigung.",
             "einheit": "St", "kg": "334", "gen": "C",
             "varianten": [{"mat_": "Kunststoff", "fu": "mit Glasausschnitt", "ud": "1,1", "gr": "1,10 × 2,20 m", "h": 6, "mat": 1900},
                           {"mat_": "Aluminium", "fu": "flügelüberdeckend", "ud": "0,9", "gr": "1,10 × 2,20 m", "h": 7, "mat": 3800},
                           {"mat_": "Holz", "fu": "nach Bemusterung", "ud": "1,0", "gr": "1,10 × 2,20 m", "h": 7, "mat": 3200},
                           {"mat_": "Aluminium", "fu": "mit Seitenteil", "ud": "0,9", "gr": "1,80 × 2,30 m", "h": 10, "mat": 6200}]},
            {"kurz": "Nebeneingangstür Kunststoff/Alu, bis 1,00 × 2,10 m",
             "lang": "Nebeneingangstür (Keller-, Garagen- oder Gartentür) aus Kunststoff oder Aluminium, einflügelig, "
                     "gedämmte Füllung, Ud ≤ 1,3 W/(m²K), Mehrfachverriegelung, Drückergarnitur, Profilzylinder. "
                     "Einschließlich Befestigung.",
             "einheit": "St", "kg": "334", "h": 4.5, "mat": 1150, "gen": "B"},
            {"kurz": "Eingangsanlage Aluminium mit Seitenteil, Objekt, bis {gr}",
             "lang": "Eingangstüranlage aus thermisch getrennten Aluminiumprofilen für Mehrfamilien- bzw. Objektbau, "
                     "Tür ein- oder zweiflügelig mit festem Seitenteil, VSG-Isolierverglasung, Panikschloss nach EN 179 "
                     "bzw. EN 1125, Obentürschließer, E-Öffner, Bodenschwelle barrierefrei, Größe bis {gr}.",
             "einheit": "St", "kg": "334", "gen": "C", "lohn": "metallbau",
             "varianten": [{"gr": "2,50 × 2,50 m", "h": 14, "mat": 8200}, {"gr": "3,50 × 2,80 m", "h": 18, "mat": 11800}]},
            {"kurz": "Automatische Schiebetüranlage, Durchgang {b} m",
             "lang": "Automatische Schiebetüranlage für Eingangsbereiche, Antrieb mit Sicherheitssensorik nach "
                     "DIN 18650, Fluchtwegfunktion, Alu-Profile mit VSG-Isolierglas, lichte Durchgangsbreite {b} m, "
                     "einschließlich Inbetriebnahme und Einweisung; Stromanschluss bauseits.",
             "einheit": "St", "kg": "334", "gen": "C", "lohn": "metallbau",
             "varianten": [{"b": "1,40", "h": 20, "mat": 14500}, {"b": "2,00", "h": 24, "mat": 17800}]},
        ]},
        {"name": "Pfosten-Riegel-Fassade, Wintergarten", "positionen": [
            {"kurz": "Pfosten-Riegel-Fassade Alu, Ucw {u}",
             "lang": "Pfosten-Riegel-Fassade aus thermisch getrennten Aluminiumprofilen (Ansichtsbreite 50–60 mm), "
                     "pulverbeschichtet, Dreifach-Isolierverglasung Ucw ≤ {u} W/(m²K), Statik und Werkplanung "
                     "durch den AN, einschließlich Anschlüsse an Baukörper mit Folien. Öffnungsflügel gesondert. "
                     "Abrechnung nach Ansichtsfläche.",
             "einheit": "m²", "kg": "337", "gen": "C", "lohn": "metallbau",
             "varianten": [{"u": "1,0", "h": 3.5, "mat": 640}, {"u": "0,8", "h": 3.8, "mat": 760}]},
            {"kurz": "Pfosten-Riegel-Fassade Holz-Alu",
             "lang": "Pfosten-Riegel-Fassade mit Holz-Tragkonstruktion (BSH) und Aluminium-Deckschalen außen, "
                     "Dreifach-Isolierverglasung Ucw ≤ 0,9 W/(m²K), einschließlich Werkplanung und Anschlüsse. "
                     "Abrechnung nach Ansichtsfläche.",
             "einheit": "m²", "kg": "337", "h": 4.0, "mat": 700, "gen": "C", "lohn": "metallbau"},
            {"kurz": "Öffnungsflügel in Pfosten-Riegel-Fassade, Dreh-Kipp",
             "lang": "Einsatzelement als Dreh-Kipp-Flügel in Pfosten-Riegel-Fassade, Aluminium, verdeckt liegender "
                     "Beschlag, Größe bis 1,2 m². Mehrpreis zur Fassadenfläche.",
             "einheit": "St", "kg": "337", "h": 3.0, "mat": 950, "gen": "C", "lohn": "metallbau"},
            {"kurz": "Brandschutzverglasung F30/EI30 in Fassade",
             "lang": "Mehrpreis für Brandschutzverglasung der Feuerwiderstandsklasse EI 30 in einer Pfosten-Riegel-"
                     "Fassade mit allgemeiner Bauartgenehmigung, einschließlich Kennzeichnung. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "337", "h": 1.0, "mat": 620, "gen": "C", "lohn": "metallbau"},
        ]},
        {"name": "Montage, Anschlüsse, Ausbau", "positionen": [
            {"kurz": "Anschlussabdichtung Fenster RAL, innen/außen",
             "lang": "Bauanschlussfuge von Fenstern und Türen nach Leitfaden zur Montage (RAL) dreiebig ausbilden: "
                     "innen luftdicht mit Fensteranschlussband (sd-Wert ≥ 10 m), Funktionsebene mit "
                     "Kompriband bzw. Dämmschaum, außen schlagregendicht mit diffusionsoffenem Band. "
                     "Abrechnung nach Rahmenumfang.",
             "einheit": "m", "kg": "334", "h": 0.25, "mat": 9.5, "gen": "A"},
            {"kurz": "Vorwandmontage Fenster in Dämmebene (WDVS), Montagesystem",
             "lang": "Fenster in der Dämmebene vor dem Mauerwerk mit Montagewinkeln, Montagezargen oder Dämmkonsolen "
                     "statisch befestigen, einschließlich Abdichtungsfolien zum Mauerwerk. Abrechnung nach Rahmenumfang.",
             "einheit": "m", "kg": "334", "h": 0.35, "mat": 28, "gen": "B"},
            {"kurz": "Fensterbank außen Alu, bis {a} mm",
             "lang": "Außenfensterbank aus Aluminium stranggepresst, 2 mm, pulverbeschichtet bzw. eloxiert, Ausladung "
                     "bis {a} mm, Gefälle ≥ 5°, mit Antidröhnstreifen, Bordprofilen mit Dehnungsausgleich und "
                     "Abdichtung unter der Bank. Abrechnung nach Länge.",
             "einheit": "m", "kg": "334", "gen": "A",
             "varianten": [{"a": "180", "h": 0.45, "mat": 34}, {"a": "260", "h": 0.5, "mat": 44}, {"a": "360", "h": 0.55, "mat": 58}]},
            {"kurz": "Brüstungsanschluss mit Fensterbank-Unterkonstruktion (WDVS)",
             "lang": "Thermisch getrennte Fensterbankkonsolen bzw. Dämmkeil unter der Außenfensterbank bei WDVS "
                     "liefern und einbauen, mit Abdichtung zum Fensterrahmen. Abrechnung nach Länge.",
             "einheit": "m", "kg": "334", "h": 0.25, "mat": 22, "gen": "B"},
            {"kurz": "Altfenster ausbauen, entsorgen, {gr}",
             "lang": "Vorhandenes Fenster einschließlich Blendrahmen, Fensterbänken und Befestigungen ausbauen, "
                     "Leibungen säubern, Material abfahren und entsorgen einschließlich Entsorgungsgebühren. "
                     "Holzfenster mit Schadstoffverdacht gesondert. Größe {gr}.",
             "einheit": "St", "kg": "394", "gen": "B", "tags": ["altbau"],
             "varianten": [{"gr": "bis 1,5 m²", "h": 1.2, "mat": 0, "geraet": 15}, {"gr": "1,5–3,0 m²", "h": 1.8, "mat": 0, "geraet": 25},
                           {"gr": "über 3,0 m²", "h": 2.6, "mat": 0, "geraet": 38}]},
            {"kurz": "Leibungen nach Fenstertausch beiputzen",
             "lang": "Innenleibungen nach Fenstertausch mit Putz an das neue Fenster anarbeiten, Putzanschlussprofil "
                     "mit Gewebe, Leibungstiefe bis 30 cm, malerfertig. Abrechnung nach Leibungslänge.",
             "einheit": "m", "kg": "334", "h": 0.5, "mat": 5, "gen": "B", "lohn": "putz", "tags": ["altbau"]},
            {"kurz": "Montage bauseits gelieferter Fenster",
             "lang": "Bauseits gelieferte Fenster an der Baustelle übernehmen, an die Einbaustelle transportieren, "
                     "ausrichten, befestigen und einstellen; Abdichtung gesondert. Abrechnung je Element bis 3 m².",
             "einheit": "St", "kg": "334", "h": 2.0, "mat": 8, "gen": "B"},
        ]},
    ],
}]


# ---------------------------------------------------------------- Runde 2: Ausführungsachsen und weitere Grundpositionen
OEFF = [{"k": "Dreh-Kipp", "t": "Öffnungsart Dreh-Kipp."},
        {"k": "Dreh", "t": "Öffnungsart Dreh (ohne Kippfunktion).", "fm": 0.97},
        {"k": "Kipp", "t": "Öffnungsart Kipp mit Oberlichtöffner.", "fm": 0.95},
        {"k": "Stulp", "t": "Zweiflügelig mit Stulp, ohne festen Pfosten, Gehflügel Dreh-Kipp, Standflügel Dreh.", "fm": 1.10, "fh": 1.1},
        {"k": "PSK", "t": "Öffnungsart Parallel-Schiebe-Kipp (PSK) mit Zwangssteuerung.", "fm": 1.38, "fh": 1.2, "gen": "C"}]
GLAS = [{}, {"k": "Rw 38 dB", "t": "Verglasung mit Schalldämmmaß Rw ≥ 38 dB.", "mat": 45},
        {"k": "Rw 42 dB", "t": "Verglasung mit Schalldämmmaß Rw ≥ 42 dB.", "mat": 85},
        {"k": "VSG P4A", "t": "Innenscheibe aus VSG Widerstandsklasse P4A.", "mat": 95},
        {"k": "Ornament", "t": "Außenscheibe Ornament- bzw. Satinatoglas als Sichtschutz.", "mat": 48}]
GLAS3 = GLAS[:3] + [GLAS[3]]
def _je(ax, f):
    """Achse mit €/m²-Zuschlägen auf ein Stück-Element mit f m² Glasfläche umrechnen."""
    return [{**o, "mat": o["mat"] * f} if "mat" in o else o for o in ax]


RC = [{}, {"k": "RC2", "t": "Einbruchhemmend RC 2 nach DIN EN 1627 mit Pilzkopfbeschlag, abschließbarem Griff und P4A-Glas.", "mat": 120, "h": 0.2}]
RC_ST = [{}, {"k": "RC2", "t": "Einbruchhemmend RC 2 nach DIN EN 1627.", "mat": 260, "h": 0.4}]
FARBE = [{"k": "weiß", "t": "Farbe weiß."}, {"k": "Dekor außen", "t": "Außen foliert in Dekor nach Wahl, innen weiß.", "fm": 1.14},
         {"k": "Dekor beids.", "t": "Beidseitig foliert in Dekor nach Wahl.", "fm": 1.26}]
ORT = [{}, {"k": "Bestand", "t": "Einbau im Bestand in die vorhandene Öffnung nach Ausbau des Altelements (Ausbau gesondert), "
            "Anpassen an unebene Leibungen, Arbeiten in bewohnten Räumen mit Staubschutz.", "fh": 1.3, "h": 0.3, "gen": "B", "tags": ["altbau"]}]
DFF_ANT = [{"k": "manuell", "t": "Bedienung manuell mit Griffleiste."}, {"k": "Elektro", "t": "Elektrischer Kettenantrieb mit Regensensor und Funkbedienung, Anschluss bauseits.", "mat": 450, "h": 1.0},
           {"k": "Solar", "t": "Solarbetriebener Antrieb mit Funkbedienung und Regensensor.", "mat": 520, "h": 0.8}]
DFF_GL = [{}, {"k": "VSG/Schallschutz", "t": "Verglasung mit VSG innen und erhöhtem Schallschutz.", "mat": 95}]
ZUTRITT = [{"k": "PZ", "t": "Verriegelung mechanisch mit Profilzylinder."}, {"k": "Fingerprint", "t": "Mit Fingerprint-Leser im Griff und Motorschloss, Netzteil, Kabelübergang.", "mat": 650, "h": 1.5},
           {"k": "Motorschloss", "t": "Mit automatischem Motorschloss und Freigabe über Sprechanlage, Kabelübergang.", "mat": 720, "h": 1.5}]
RC_HT = [{"k": "RC2", "t": "Widerstandsklasse RC 2."}, {"k": "RC3", "t": "Widerstandsklasse RC 3 mit verstärkten Beschlägen und P5A-Verglasung.", "mat": 480, "h": 0.5}]
PR_GLAS = [{}, {"k": "Rw 42 dB", "t": "Verglasung Rw ≥ 42 dB.", "mat": 90}, {"k": "Sonnenschutz", "t": "Sonnenschutzglas g ≤ 0,30.", "mat": 55},
           {"k": "VSG innen", "t": "Innenscheibe VSG (absturzsichernd nach DIN 18008-4).", "mat": 70}]
PR_FARBE = [{"k": "RAL Standard", "t": "Oberfläche pulverbeschichtet RAL Standardfarbe."}, {"k": "eloxiert", "t": "Oberfläche eloxiert nach Muster.", "mat": 35},
            {"k": "Sonderfarbe", "t": "Pulverbeschichtung in Sonderfarbe bzw. DB-Farbton, Feinstruktur.", "mat": 25}]
PR_HOCH = [{"k": "bis 4 m", "t": "Fassadenhöhe bis 4 m (eingeschossig)."}, {"k": "über 4 m", "t": "Mehrgeschossige Fassade über 4 m Höhe, Montage mit Hubarbeitsbühne.", "fh": 1.15, "geraet": 25}]
FB_FARBE = [{"k": "eloxiert natur", "t": "Oberfläche eloxiert E6/EV1."}, {"k": "RAL Standard", "t": "Pulverbeschichtet RAL Standardfarbe.", "fm": 1.08},
            {"k": "Sonderfarbe", "t": "Pulverbeschichtet in Sonderfarbe.", "fm": 1.2}]
ABD = [{"k": "Folienband", "t": "Ausführung mit Folienbändern."}, {"k": "flüssig", "t": "Außenseitig Flüssigabdichtung mit Vlieseinlage statt Folie.", "mat": 3, "h": 0.05},
       {"k": "Multiband", "t": "Ausführung mit vorkomprimiertem Multifunktionsband (dreiebig in einem Band).", "mat": 6, "h": -0.08}]
ALT = [{"k": "Holz", "t": "Altfenster aus Holz."}, {"k": "Kunststoff", "t": "Altfenster aus Kunststoff.", "fg": 0.9},
       {"k": "Alu/Stahl", "t": "Altfenster aus Aluminium oder Stahl, Metall wird verwertet.", "fh": 1.15, "fg": 0.6},
       {"k": "schadstoffbelastet", "t": "Holzfenster mit Holzschutzmittel bzw. PAK-haltigem Kitt: Ausbau mit Schutzmaßnahmen und Entsorgung als gefährlicher Abfall nach Nachweis.", "fh": 1.4, "fg": 3.0, "gen": "C"}]
GITTER = [{}, {"k": "mit Einbruchgitter", "t": "Mit innenliegendem verzinktem Einbruchschutzgitter.", "mat": 65, "h": 0.3}]
AUSSER = [{}, {"k": "Sonderform", "t": "Sonderform (Rundbogen, Schräge, Dreieck) als Zulage auf das Element.", "fm": 1.45, "fh": 1.3, "gen": "C"}]

_A = [("Kunststofffenster Uw", [OEFF, GLAS, RC, FARBE, ORT]),
      ("Holzfenster Uw", [OEFF, GLAS, RC, ORT]),
      ("Holz-Alu-Fenster Uw", [OEFF, GLAS, RC, ORT]),
      ("Alufenster Uw", [OEFF, GLAS, RC, ORT]),
      ("Festverglasung Kunststoff", [GLAS, FARBE, ORT, AUSSER]),
      ("Fenstertür Kunststoff", [_je(GLAS, 1.8), RC_ST, FARBE, ORT]),
      ("Hebe-Schiebe-Tür", [_je(GLAS3, 6), RC_ST, ORT]),
      ("Dachflächenfenster", [DFF_ANT, DFF_GL, ORT]),
      ("Kellerfenster", [GITTER, ORT]),
      ("Haustür", [ZUTRITT, RC_HT, ORT]),
      ("Nebeneingangstür", [RC_ST, FARBE, ORT]),
      ("Pfosten-Riegel-Fassade", [PR_GLAS, PR_FARBE, PR_HOCH]),
      ("Fensterbank außen", [FB_FARBE, ORT]),
      ("Anschlussabdichtung", [ABD, ORT]),
      ("Altfenster ausbauen", [ALT])]
for _g in LBS[0]["gruppen"]:
    for _p in _g["positionen"]:
        for _pre, _ax in _A:
            if _p["kurz"].startswith(_pre):
                _p["achsen"] = _ax

_GR = {g["name"]: g for g in LBS[0]["gruppen"]}
_GR["Fenster"]["positionen"] += [
    {"kurz": "Fensterelement Kunststoff + Oberlicht, {gr} m²",
     "lang": "Kombiniertes Fensterelement aus Kunststoffprofilen mit festem bzw. kippbarem Ober- oder Unterlicht und "
             "Kämpfer, Dreh-Kipp-Flügel, Dreifachverglasung Uw ≤ 0,95 W/(m²K), Elementgröße {gr} m². "
             "Abrechnung nach Fläche (Rahmenaußenmaß).", "einheit": "m²", "kg": "334", "gen": "B",
     "achsen": [GLAS, RC, FARBE, ORT], "varianten": [{"gr": "2,5–4,0", "h": 1.4, "mat": 265}, {"gr": "über 4,0", "h": 1.25, "mat": 245}]},
    {"kurz": "Lüftungsflügel / RWA-Fenster mit Kettenantrieb {v} V",
     "lang": "Kipp- bzw. Klappflügel als natürliches Rauch- und Wärmeabzugsgerät bzw. Lüftungsflügel mit "
             "Kettenantrieb {v} V, Öffnungsweite nach Nachweis, einschließlich Konsolen und Verkabelung im Rahmen; "
             "Steuerzentrale gesondert. Mehrpreis zum Fensterelement.", "einheit": "St", "kg": "334", "gen": "B",
     "varianten": [{"v": "24", "h": 2.5, "mat": 520}, {"v": "230", "h": 2.0, "mat": 380}]},
    {"kurz": "Brandschutzfenster EI 30 fest, Stahl/Alu",
     "lang": "Festverglasung als Brandschutzverglasung EI 30 in Stahl- oder Aluminiumrahmen mit Bauartgenehmigung, "
             "in Außenwand mit Brandschutzanforderung (z. B. Brandwand-/Treppenraumbereich), einschließlich Kennzeichnung. "
             "Abrechnung nach Fläche.", "einheit": "m²", "kg": "334", "h": 2.5, "mat": 980, "gen": "C", "lohn": "metallbau"},
    {"kurz": "Stahlfenster thermisch getrennt, {gr} m²",
     "lang": "Fenster aus thermisch getrennten Stahlprofilen (schlanke Ansicht, z. B. für Denkmal und Loft), "
             "verzinkt und beschichtet, Dreifachverglasung, Dreh-Kipp, Elementgröße {gr} m².", "einheit": "m²", "kg": "334", "gen": "C",
     "lohn": "metallbau", "achsen": [GLAS3, ORT], "varianten": [{"gr": "bis 1,5", "h": 2.5, "mat": 1150}, {"gr": "1,5–3,0", "h": 2.2, "mat": 980}]},
    {"kurz": "Denkmalfenster Holz (Kasten-/Verbundfenster), {gr} m²",
     "lang": "Holzfenster als Nachbau nach Bestand (Kasten- bzw. Verbundfenster) mit profilierten Sprossen, "
             "Kittfalzoptik, Innenflügel mit Isolierglas, Oberfläche Leinölfarbe bzw. deckend, Bänder und Oliven nach Muster. "
             "Abrechnung nach Fläche.", "einheit": "m²", "kg": "334", "gen": "C", "tags": ["altbau"],
     "achsen": [AUSSER], "varianten": [{"gr": "bis 1,5", "h": 3.5, "mat": 1150}, {"gr": "über 1,5", "h": 3.0, "mat": 980}]},
]
_GR["Zuschläge und Sonderausstattung"]["positionen"] += [
    {"kurz": "Zuschlag Sonderfarbe Kunststofffenster (RAL), je Element",
     "lang": "Mehrpreis für Farbbeschichtung bzw. Folierung in Sonderfarbe außerhalb der Standardkollektion. Abrechnung je Element.",
     "einheit": "St", "kg": "334", "h": 0, "mat": 85, "gen": "C"},
    {"kurz": "Zuschlag Sonnenschutzglas g ≤ {g}",
     "lang": "Mehrpreis für Sonnenschutz-Isolierglas mit Gesamtenergiedurchlassgrad g ≤ {g}. Abrechnung nach Glasfläche.",
     "einheit": "m²", "kg": "334", "h": 0, "gen": "B", "varianten": [{"g": "0,35", "mat": 40}, {"g": "0,25", "mat": 65}]},
    {"kurz": "Zuschlag absturzsichernde Verglasung nach DIN 18008-4",
     "lang": "Mehrpreis für absturzsichernde Verglasung (VSG innen, Kategorie A) bei bodentiefen Fenstern ohne Brüstung, "
             "einschließlich Nachweis. Abrechnung nach Glasfläche.", "einheit": "m²", "kg": "334", "h": 0, "mat": 85, "gen": "B"},
    {"kurz": "Zuschlag barrierefreie Nullschwelle / Magnet-Doppeldichtung",
     "lang": "Mehrpreis für schwellenlose Ausführung (Magnet-Doppeldichtung bzw. Nullschwellensystem) bei Fenster- und "
             "Terrassentüren, einschließlich Entwässerungsrinne vor der Tür (Rinne gesondert).", "einheit": "St", "kg": "334",
     "h": 0.8, "mat": 380, "gen": "B"},
    {"kurz": "Montagezarge / Bodeneinstandsprofil unter Fenstertür",
     "lang": "Wärmegedämmtes, tragfähiges Bodeneinstandsprofil bzw. Montagezarge unter Fenster- und Terrassentüren, "
             "druckfest, mit Abdichtungsanschluss. Abrechnung nach Länge.", "einheit": "m", "kg": "334", "h": 0.4, "mat": 48, "gen": "B"},
    {"kurz": "Rahmenverbreiterung / Aufdopplung Kunststoff, bis {b} mm",
     "lang": "Rahmenverbreiterung aus Kunststoff passend zum Fenstersystem, an den Blendrahmen angeschlagen, Breite bis {b} mm, "
             "Farbe wie Fenster. Abrechnung nach Länge.", "einheit": "m", "kg": "334", "gen": "A",
     "varianten": [{"b": "30", "h": 0.1, "mat": 8}, {"b": "60", "h": 0.12, "mat": 14}, {"b": "100", "h": 0.15, "mat": 22}]},
    {"kurz": "Fenstergriff mit Kindersicherung / Drehbegrenzer",
     "lang": "Mehrpreis für Fenstergriff mit Kindersicherung bzw. Öffnungsbegrenzer (Spaltlüftung).",
     "einheit": "St", "kg": "334", "h": 0.15, "mat": 28, "gen": "A"},
]
_GR["Montage, Anschlüsse, Ausbau"]["positionen"] += [
    {"kurz": "Haustür / Außentür ausbauen und entsorgen",
     "lang": "Vorhandene Haus- bzw. Außentür einschließlich Zarge, Schwelle und Seitenteilen ausbauen, abfahren und entsorgen.",
     "einheit": "St", "kg": "394", "h": 2.5, "mat": 0, "geraet": 45, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Fenster warten: Beschläge schmieren, einstellen, je Flügel",
     "lang": "Wartung nach Herstellerangaben: Beschläge reinigen und schmieren, Flügel einstellen, Dichtungen prüfen, "
             "Funktion sicherheitsrelevanter Teile prüfen, Wartungsprotokoll. Abrechnung je Flügel.",
     "einheit": "St", "kg": "334", "h": 0.4, "mat": 3, "gen": "A", "tags": ["altbau"]},
    {"kurz": "Fensterdichtungen erneuern, Bestand",
     "lang": "Vorhandene Flügel- bzw. Anschlagdichtungen entfernen und durch passende neue Profildichtungen ersetzen. "
             "Abrechnung nach Dichtungslänge.", "einheit": "m", "kg": "334", "h": 0.08, "mat": 2.8, "gen": "A", "tags": ["altbau"]},
    {"kurz": "Fensterbeschlag erneuern (Dreh-Kipp), Bestand",
     "lang": "Vorhandenen Dreh-Kipp-Beschlag eines Flügels ausbauen und durch neuen Beschlag des Systems ersetzen, "
             "einstellen. Abrechnung je Flügel.", "einheit": "St", "kg": "334", "h": 1.5, "mat": 95, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Holzfenster überarbeiten und neu beschichten, Bestand",
     "lang": "Bestehende Holzfenster: alte Beschichtung anschleifen bzw. lose Teile entfernen, Kittfalze ausbessern, "
             "Grund-, Zwischen- und Schlussbeschichtung beidseitig. Abrechnung nach Fensterfläche.",
     "einheit": "m²", "kg": "334", "h": 2.2, "mat": 14, "gen": "C", "tags": ["altbau"], "lohn": "maler"},
    {"kurz": "Provisorischer Fensterverschluss / Notverschluss",
     "lang": "Fensteröffnung bis zum Einbau provisorisch mit Folie auf Lattung bzw. Platte verschließen, unterhalten, "
             "rückbauen. Abrechnung je Öffnung bis 3 m².", "einheit": "St", "kg": "398", "h": 0.6, "mat": 12, "gen": "A"},
    {"kurz": "Fenster schützen: Rahmen abkleben, Schutzfolie",
     "lang": "Eingebaute Fenster und Türen gegen Beschädigung und Verschmutzung durch Folgegewerke schützen: "
             "Rahmen mit Schutzband abkleben, Glas mit Folie bzw. Platte, Entfernen nach Aufforderung. Abrechnung nach Fensterfläche.",
     "einheit": "m²", "kg": "334", "h": 0.12, "mat": 1.5, "gen": "A"},
    {"kurz": "Glasleisten tauschen / Verglasung nachdichten, Bestand",
     "lang": "Glasdichtungen bzw. Versiegelung an vorhandenen Fenstern erneuern, Glasleisten lösen und neu befestigen. "
             "Abrechnung nach Länge.", "einheit": "m", "kg": "334", "h": 0.15, "mat": 2.5, "gen": "B", "tags": ["altbau"]},
]
