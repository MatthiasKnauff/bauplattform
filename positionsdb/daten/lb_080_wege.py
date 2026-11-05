# LB 080 Straßen, Wege, Plätze – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "080", "name": "Straßen, Wege, Plätze", "atv": "DIN 18318 / DIN 18315", "lohn": "aussen",
    "gruppen": [
        {"name": "Unterbau, Tragschichten", "positionen": [
            {"kurz": "Planum herstellen und verdichten, Ev2 ≥ {ev} MN/m²{zus}",
             "lang": "Planum im Boden der Bodenklasse/Homogenbereich nach Angabe auf ±2 cm profilgerecht herstellen und "
                     "verdichten, Verformungsmodul Ev2 ≥ {ev} MN/m² nachweisen (Plattendruckversuch gesondert).",
             "einheit": "m²", "kg": "521", "gen": "A", "geraet": 0.9,
             "varianten": [{"ev": "45", "zus": "", "h": 0.03, "mat": 0}, {"ev": "80", "zus": ", mit Bodenverbesserung", "h": 0.05, "mat": 4.5}]},
            {"kurz": "Schottertragschicht 0/32 bzw. 0/45, Dicke {d} cm",
             "lang": "Tragschicht aus Schotter-Splitt-Gemisch 0/32 bzw. 0/45 (Natur- oder RC-Baustoff mit "
                     "Güteüberwachung) nach TL SoB-StB liefern, profilgerecht einbauen und verdichten, Ev2 ≥ 120 MN/m² "
                     "bei Pflaster für Pkw-Verkehr bzw. ≥ 100 MN/m² für Gehwege, Dicke {d} cm im verdichteten Zustand.",
             "einheit": "m²", "kg": "521", "gen": "A",
             "varianten": [{"d": "15", "h": 0.06, "mat": 5.5, "geraet": 1.2}, {"d": "20", "h": 0.07, "mat": 7.3, "geraet": 1.5},
                           {"d": "30", "h": 0.09, "mat": 11, "geraet": 2.0}, {"d": "40", "h": 0.11, "mat": 14.5, "geraet": 2.5}]},
            {"kurz": "Frostschutzschicht 0/32, Dicke {d} cm",
             "lang": "Frostschutzschicht aus frostunempfindlichem Kiessand bzw. Schotter 0/32 liefern, einbauen und "
                     "verdichten, Ev2 ≥ 100 MN/m² auf der Oberfläche, Dicke {d} cm.",
             "einheit": "m²", "kg": "521", "gen": "A",
             "varianten": [{"d": "20", "h": 0.06, "mat": 6.2, "geraet": 1.4}, {"d": "30", "h": 0.08, "mat": 9.2, "geraet": 1.9}]},
            {"kurz": "Geotextil / Trennvlies GRK {k}",
             "lang": "Geotextil als Trenn- und Filterlage, Geotextilrobustheitsklasse GRK {k}, mit 30 cm Überlappung "
                     "auf Planum verlegen. Abrechnung nach verlegter Fläche ohne Überlappungen.",
             "einheit": "m²", "kg": "521", "gen": "A",
             "varianten": [{"k": "3", "h": 0.02, "mat": 1.2}, {"k": "4", "h": 0.02, "mat": 1.8}]},
            {"kurz": "Asphalttragdeckschicht AC 16 TD, Dicke {d} cm",
             "lang": "Asphalttragdeckschicht AC 16 TD bzw. AC 11 D N auf Tragschicht maschinell einbauen und "
                     "verdichten, Anschlüsse an Einfassungen mit Bitumenfugenband, Dicke {d} cm. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "522", "gen": "B",
             "varianten": [{"d": "8", "h": 0.08, "mat": 18, "geraet": 4}, {"d": "10", "h": 0.09, "mat": 22, "geraet": 4.5}]},
        ]},
        {"name": "Pflaster, Platten", "positionen": [
            {"kurz": "Betonsteinpflaster {d} cm, {art}, Bettung Splitt",
             "lang": "Pflasterdecke aus Betonsteinen nach DIN EN 1338, {art}, Dicke {d} cm, Farbe nach Bemusterung, "
                     "auf 3–5 cm Bettung aus Brechsand-Splitt 0/5 im Verband verlegen, einschneiden an Einfassungen, "
                     "mit Fugenmaterial einschlämmen und abrütteln. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "522", "gen": "A",
             "varianten": [{"d": "6", "art": "Rechteckpflaster grau", "h": 0.40, "mat": 15, "geraet": 1.5},
                           {"d": "8", "art": "Rechteckpflaster grau", "h": 0.45, "mat": 18, "geraet": 1.5},
                           {"d": "8", "art": "Verbundpflaster", "h": 0.42, "mat": 17, "geraet": 1.5},
                           {"d": "8", "art": "Edelsplittvorsatz, gestrahlt", "h": 0.50, "mat": 32, "geraet": 1.5},
                           {"d": "10", "art": "Rechteckpflaster, befahrbar Lkw", "h": 0.50, "mat": 24, "geraet": 1.8}]},
            {"kurz": "Ökopflaster / Drainpflaster {d} cm, versickerungsfähig",
             "lang": "Versickerungsfähiges Pflaster aus Betonsteinen mit Sickerfugen bzw. haufwerksporig, Dicke {d} cm, "
                     "auf wasserdurchlässiger Bettung 2/5 verlegen, Fugen mit Splitt 1/3 verfüllen. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "522", "gen": "B",
             "varianten": [{"d": "8", "h": 0.45, "mat": 22, "geraet": 1.5}, {"d": "10", "h": 0.50, "mat": 27, "geraet": 1.8}]},
            {"kurz": "Rasengittersteine Beton 8 cm, Kammern mit Substrat und Rasen",
             "lang": "Rasengittersteine aus Beton 60 × 40 × 8 cm auf Bettung verlegen, Kammern mit Rasensubstrat "
                     "verfüllen und mit Gebrauchsrasen einsäen. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "522", "h": 0.45, "mat": 18, "geraet": 1.5, "gen": "A"},
            {"kurz": "Natursteinpflaster {art}, Bettung Splitt, Fugen {fu}",
             "lang": "Pflaster aus Naturstein {art} auf 4–6 cm Bettung im Segment- bzw. Reihenverband verlegen, "
                     "Fugen {fu}, abrütteln. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "522", "gen": "C",
             "varianten": [{"art": "Granit Kleinpflaster 9/11", "fu": "ungebunden mit Brechsand", "h": 1.30, "mat": 48, "geraet": 1.5},
                           {"art": "Granit Großpflaster 15/17", "fu": "ungebunden mit Brechsand", "h": 1.10, "mat": 62, "geraet": 2},
                           {"art": "Granit Kleinpflaster 9/11", "fu": "gebunden mit Pflasterfugenmörtel", "h": 1.50, "mat": 62, "geraet": 1.5}]},
            {"kurz": "Plattenbelag {art}, Bettung Splitt",
             "lang": "Plattenbelag aus {art} auf Splittbettung bzw. auf Stelzlagern verlegen, Fugen 3–5 mm, "
                     "Gefälle 2 %, Schnitte an Einfassungen. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "522", "gen": "B",
             "varianten": [{"art": "Betonplatten 40 × 40 × 4 cm", "h": 0.40, "mat": 17},
                           {"art": "Betonwerksteinplatten 60 × 40 cm, Oberfläche gestrahlt", "h": 0.50, "mat": 42},
                           {"art": "Feinsteinzeug-Terrassenplatten 2 cm, 60 × 60 cm", "h": 0.65, "mat": 48},
                           {"art": "Natursteinplatten Granit 3 cm, geflammt", "h": 0.70, "mat": 85}]},
            {"kurz": "Wassergebundene Wegedecke, Dicke 5 cm",
             "lang": "Wassergebundene Wegedecke aus Mineralgemisch 0/8 bzw. 0/11 (Dynamische Schicht 0/16 darunter "
                     "bauseits), 5 cm, profiliert einbauen, wässern und walzen. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "522", "h": 0.12, "mat": 6.5, "geraet": 1.2, "gen": "A"},
            {"kurz": "Pflaster aufnehmen, reinigen, seitlich lagern",
             "lang": "Vorhandenes Beton- bzw. Natursteinpflaster aufnehmen, von Bettung und Fugenmaterial reinigen, "
                     "auf der Baustelle palettiert lagern zur Wiederverwendung. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "511", "h": 0.35, "mat": 0, "geraet": 1.5, "gen": "B", "tags": ["altbau"]},
            {"kurz": "Pflaster aus Lagerbestand wieder verlegen",
             "lang": "Gelagertes Pflaster wieder auf neuer Bettung verlegen, Ergänzungen bis 10 % bauseits, einschlämmen "
                     "und abrütteln. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "522", "h": 0.50, "mat": 4, "geraet": 1.5, "gen": "B", "tags": ["altbau"]},
        ]},
        {"name": "Einfassungen, Rinnen, Entwässerung", "positionen": [
            {"kurz": "Bordstein Beton {art}, in Beton C20/25 mit Rückenstütze",
             "lang": "Bordstein aus Beton {art} auf Fundament aus Beton C20/25 mit Rückenstütze versetzen, "
                     "Fugen 5 mm, Höhen nach Plan. Abrechnung nach Länge; Kurvensteine als Zulage.",
             "einheit": "m", "kg": "522", "gen": "A",
             "varianten": [{"art": "Tiefbord 8 × 25 cm", "h": 0.30, "mat": 13}, {"art": "Hochbord 15 × 30 cm", "h": 0.40, "mat": 21},
                           {"art": "Rasenbord 5 × 25 cm", "h": 0.25, "mat": 10}]},
            {"kurz": "Granit-Bordstein / Einfassung, Hochbord 15 × 30 cm",
             "lang": "Bordstein aus Granit, Hochbord 15 × 30 cm, Sichtflächen gestockt, auf Betonfundament mit "
                     "Rückenstütze versetzen. Abrechnung nach Länge.",
             "einheit": "m", "kg": "522", "h": 0.55, "mat": 55, "gen": "B"},
            {"kurz": "Einfassung Stahlkante / Alukante für Beete und Wege",
             "lang": "Rasen- bzw. Beeteinfassung aus Cortenstahl bzw. Aluminium, Höhe 12–15 cm, mit Erdspießen "
                     "gesetzt. Abrechnung nach Länge.",
             "einheit": "m", "kg": "522", "h": 0.20, "mat": 16, "gen": "A"},
            {"kurz": "Muldenrinne / Pendelrinne, {art}",
             "lang": "Rinne als {art}, in Beton C20/25 versetzt, Fugen vermörtelt, Längsgefälle nach Plan. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "522", "gen": "B",
             "varianten": [{"art": "3-zeilige Pflasterrinne aus Betonsteinen", "h": 0.55, "mat": 18},
                           {"art": "Betonmuldenrinne 30 cm", "h": 0.40, "mat": 22}]},
            {"kurz": "Entwässerungsrinne Polymerbeton NW {nw}, Klasse {k}, mit Rost",
             "lang": "Entwässerungsrinne aus Polymerbeton bzw. Beton NW {nw} mit Zarge, Belastungsklasse {k} nach "
                     "DIN EN 1433, Abdeckung {ab}, in Betonbettung C25/30 versetzt, einschließlich Stirnwände anteilig; "
                     "Einlaufkasten gesondert. Abrechnung nach Länge.",
             "einheit": "m", "kg": "541", "gen": "B",
             "varianten": [{"nw": "100", "k": "A 15", "ab": "Stegrost verzinkt", "h": 0.60, "mat": 62},
                           {"nw": "100", "k": "C 250", "ab": "Gussrost", "h": 0.70, "mat": 98},
                           {"nw": "150", "k": "D 400", "ab": "Gussrost verschraubt", "h": 0.85, "mat": 165}]},
            {"kurz": "Einlaufkasten / Sinkkasten für Rinne, mit Schlammeimer",
             "lang": "Einlaufkasten passend zur Rinne mit Schlammeimer und Anschluss DN 100/150 an Grundleitung, "
                     "einschließlich Bettung.",
             "einheit": "St", "kg": "541", "h": 1.5, "mat": 210, "gen": "B"},
            {"kurz": "Hofablauf / Straßenablauf Beton mit Guss-Aufsatz",
             "lang": "Hof- bzw. Straßenablauf aus Betonfertigteilen 300 × 500 mm mit Schlammeimer, Guss-Aufsatz "
                     "Klasse C 250 bzw. D 400, Anschluss an Grundleitung, einschließlich Erdarbeiten.",
             "einheit": "St", "kg": "541", "h": 4.0, "mat": 420, "geraet": 40, "gen": "B"},
            {"kurz": "Schachtabdeckung an neue Höhe anpassen",
             "lang": "Vorhandene Schachtabdeckung bzw. Schieberkappe an neue Belagshöhe anpassen, mit Ausgleichsringen "
                     "bzw. Mörtel, Abdeckung wieder setzen.",
             "einheit": "St", "kg": "541", "h": 2.0, "mat": 45, "gen": "B", "tags": ["altbau"]},
            {"kurz": "Stellplatzmarkierung / Bodenmarkierung",
             "lang": "Markierung von Stellplätzen bzw. Wegeführung mit Kaltplastik bzw. Markierungsfarbe weiß, Breite "
                     "12 cm. Abrechnung nach Länge.",
             "einheit": "m", "kg": "522", "h": 0.03, "mat": 1.6, "gen": "B"},
            {"kurz": "Barrierefreier Stellplatz: Markierung und Beschilderung",
             "lang": "Kennzeichnung eines barrierefreien Stellplatzes mit Rollstuhlsymbol (Markierung) und "
                     "Verkehrsschild am Pfosten einschließlich Fundament.",
             "einheit": "St", "kg": "522", "h": 2.5, "mat": 230, "gen": "B"},
            {"kurz": "Bodenindikatoren / Leitsystem Rippen- und Noppenplatten",
             "lang": "Taktiles Bodenleitsystem nach DIN 32984 aus Beton-Rippen- bzw. Noppenplatten 30 × 30 cm, "
                     "kontrastierend zum Umgebungsbelag, in die Pflasterfläche eingebunden. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "522", "h": 0.8, "mat": 55, "gen": "B"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Runde 2: Ausführungsachsen und weitere Grundpositionen
FLAECHE = [{}, {"k": "≤ 20 m²", "t": "Ausführung in Einzelflächen bis 20 m² bzw. mit hohem Schnittanteil.", "fh": 1.40, "fg": 1.3, "gen": "B"},
           {"k": "Hand", "t": "Einbau von Hand bzw. mit Kleingerät (beengte Verhältnisse, Innenhof).", "fh": 1.6, "fg": 0.7, "gen": "B"}]
MUSTER = [{"k": "", "t": "Verlegung im Reihen- bzw. Läuferverband."},
          {"k": "Fischgrät", "t": "Verlegung im Ellbogen- bzw. Fischgrätverband.", "fh": 1.18},
          {"k": "diagonal", "t": "Verlegung diagonal bzw. im Bogen- oder Segmentverband, erhöhter Schnittanteil.", "fh": 1.30, "fm": 1.05}]
FARBE_P = [{"k": "grau", "t": "Farbe grau."}, {"k": "anthrazit/rot", "t": "Farbe durchgefärbt anthrazit bzw. rot.", "fm": 1.10},
           {"k": "Colormix", "t": "Farbmischung (Colormix) nach Bemusterung.", "fm": 1.18}]
OBERFL = [{"k": "", "t": "Oberfläche glatt bzw. werksüblich."}, {"k": "gestrahlt", "t": "Oberfläche kugelgestrahlt.", "fm": 1.25},
          {"k": "geschliffen", "t": "Oberfläche feingeschliffen.", "fm": 1.45, "gen": "B"}]
BETTUNG = [{"k": "", "t": ""}, {"k": "gebunden", "t": "Bettung und Fugen gebunden aus Drainmörtel bzw. Pflasterfugenmörtel (Kunstharz/zementär) nach Herstellerangabe.",
            "h": 0.25, "mat": 22, "gen": "B"}]
ORT = [{}, {"k": "Bestand", "t": "Anschluss an vorhandene Beläge mit Einpassen und Schneiden.", "fh": 1.2, "h": 0.05, "tags": ["altbau"]}]
VERLAUF = [{"k": "gerade", "t": "Verlauf gerade."}, {"k": "Bogen > 12 m", "t": "Verlauf im Bogen mit Radius über 12 m.", "fh": 1.25},
           {"k": "Bogen ≤ 12 m", "t": "Verlauf im Bogen mit Radius bis 12 m, Bogensteine bzw. geschnittene Steine.", "fh": 1.6, "fm": 1.25}]

for gr in LBS[0]["gruppen"]:
    for p in gr["positionen"]:
        k = p["kurz"]
        if k.startswith("Betonsteinpflaster"):
            p["achsen"] = [FARBE_P, MUSTER, FLAECHE, ORT]
        elif k.startswith("Ökopflaster") or k.startswith("Rasengitter"):
            p["achsen"] = [FARBE_P, FLAECHE, ORT]
        elif k.startswith("Natursteinpflaster"):
            p["achsen"] = [MUSTER, FLAECHE, ORT]
        elif k.startswith("Plattenbelag"):
            p["achsen"] = [MUSTER, BETTUNG, FLAECHE, ORT]
        elif k.startswith(("Schottertragschicht", "Frostschutzschicht", "Asphalttragdeck", "Planum")):
            p["achsen"] = [FLAECHE]
        elif k.startswith(("Bordstein", "Granit-Bordstein", "Einfassung", "Muldenrinne")):
            p["achsen"] = [VERLAUF, ORT]
        elif k.startswith("Entwässerungsrinne"):
            p["achsen"] = [[{"k": "", "t": "Rost Stegrost verzinkt."}, {"k": "Guss-Rost", "t": "Rost aus Gusseisen, verschraubt.", "mat": 35},
                            {"k": "Edelstahl-Schlitz", "t": "Schlitzaufsatz bzw. Designrost Edelstahl.", "mat": 85, "gen": "C"}], ORT]

LBS[0]["gruppen"] += [
    {"name": "Rückbau, Instandsetzung", "positionen": [
        {"kurz": "Belag aufnehmen und entsorgen: {art}, Dicke bis {d} cm",
         "lang": "Vorhandenen Belag aus {art} einschließlich Bettung aufnehmen, laden und abfahren; Entsorgung gesondert "
                 "nach LB 087. Dicke bis {d} cm. Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "212", "gen": "B", "lohn": "abbruch", "tags": ["altbau"], "achsen": [FLAECHE],
         "varianten": [{"art": "Betonsteinpflaster", "d": "10", "h": 0.12, "geraet": 3.5},
                       {"art": "Natursteinpflaster", "d": "16", "h": 0.20, "geraet": 4.5},
                       {"art": "Betonplatten", "d": "6", "h": 0.10, "geraet": 3.0},
                       {"art": "Asphalt", "d": "10", "h": 0.08, "geraet": 6.5},
                       {"art": "Asphalt", "d": "20", "h": 0.12, "geraet": 9.5},
                       {"art": "Ortbeton unbewehrt", "d": "15", "h": 0.20, "geraet": 9.0},
                       {"art": "Tragschicht Schotter", "d": "30", "h": 0.06, "geraet": 5.0}]},
        {"kurz": "Asphalt schneiden, Schnitttiefe bis {d} cm",
         "lang": "Vorhandene Asphalt- bzw. Betondecke mit Fugenschneider geradlinig schneiden, Schnitttiefe bis {d} cm, "
                 "Schneidschlamm aufnehmen. Abrechnung nach Länge.",
         "einheit": "m", "kg": "212", "gen": "A", "tags": ["altbau"],
         "varianten": [{"d": "10", "h": 0.10, "geraet": 4.5}, {"d": "20", "h": 0.15, "geraet": 8}, {"d": "30", "h": 0.20, "geraet": 12}]},
        {"kurz": "Bordstein aufnehmen, Rückenstütze abbrechen, {art}",
         "lang": "Vorhandene Bordsteine bzw. Einfassungen einschließlich Fundament und Rückenstütze aufnehmen, {art}. "
                 "Abrechnung nach Länge.",
         "einheit": "m", "kg": "212", "gen": "B", "lohn": "abbruch", "tags": ["altbau"],
         "varianten": [{"art": "laden und abfahren", "h": 0.25, "geraet": 4}, {"art": "reinigen und seitlich lagern", "h": 0.40, "geraet": 2}]},
        {"kurz": "Pflasterfläche ausbessern, Teilfläche bis {a} m²",
         "lang": "Abgesackte bzw. beschädigte Pflasterfläche aufnehmen, Bettung erneuern bzw. Tragschicht nachverdichten, "
                 "Steine wieder verlegen, fehlende Steine ergänzen, einschlämmen und abrütteln. Je Teilfläche bis {a} m².",
         "einheit": "St", "kg": "522", "gen": "C", "tags": ["altbau"],
         "varianten": [{"a": "2", "h": 2.2, "mat": 35, "geraet": 15}, {"a": "5", "h": 4.0, "mat": 75, "geraet": 25}, {"a": "10", "h": 7.0, "mat": 140, "geraet": 40}]},
        {"kurz": "Pflasterfugen erneuern, {art}",
         "lang": "Vorhandene Pflasterfugen auskratzen bzw. ausblasen, Bewuchs entfernen, Fugen mit {art} neu verfüllen. "
                 "Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "522", "gen": "B", "tags": ["altbau"],
         "varianten": [{"art": "Brechsand ungebunden", "h": 0.20, "mat": 2.5, "geraet": 1.0},
                       {"art": "Kunstharz-Fugenmörtel unkrauthemmend", "h": 0.35, "mat": 9, "geraet": 1.0},
                       {"art": "zementärem Fugenmörtel", "h": 0.40, "mat": 7, "geraet": 1.0}]},
        {"kurz": "Pflaster reinigen und imprägnieren",
         "lang": "Pflaster- bzw. Plattenflächen mit Heißwasser-Hochdruck reinigen, Fugenmaterial ergänzen, nach Trocknung "
                 "mit Imprägnierung gegen Öl- und Schmutzaufnahme behandeln.",
         "einheit": "m²", "kg": "522", "h": 0.12, "mat": 3.5, "geraet": 1.2, "gen": "B", "tags": ["altbau"]},
        {"kurz": "Asphaltflickstelle, Fläche bis {a} m²",
         "lang": "Schadstelle in Asphaltdecke rechteckig schneiden, aufnehmen, Unterlage verdichten, Haftkleber auftragen, "
                 "Asphalt AC 11 einbauen und verdichten, Nähte mit Bitumenvergussmasse schließen. Je Stelle bis {a} m².",
         "einheit": "St", "kg": "522", "gen": "C", "tags": ["altbau"],
         "varianten": [{"a": "1", "h": 2.0, "mat": 40, "geraet": 45}, {"a": "4", "h": 3.5, "mat": 120, "geraet": 80}]},
    ]},
    {"name": "Stufen, Mauern, Böschungen", "positionen": [
        {"kurz": "Blockstufe {art}, Länge bis {l} m, auf Fundament",
         "lang": "Blockstufe aus {art}, Querschnitt ca. 35 × 15 cm, auf Streifenfundament C20/25 in Mörtelbett versetzen, "
                 "Gefälle 1–2 % nach vorn. Länge bis {l} m.",
         "einheit": "St", "kg": "524", "gen": "B", "achsen": [ORT],
         "varianten": [{"art": "Betonwerkstein grau", "l": "1,0", "h": 1.2, "mat": 75}, {"art": "Betonwerkstein grau", "l": "2,0", "h": 1.8, "mat": 140},
                       {"art": "Granit gestockt", "l": "1,0", "h": 1.4, "mat": 145}, {"art": "Granit gestockt", "l": "2,0", "h": 2.1, "mat": 270},
                       {"art": "Basalt bzw. Muschelkalk", "l": "1,5", "h": 1.8, "mat": 210}]},
        {"kurz": "Winkelstützelement Beton (L-Stein), Höhe {hh} m",
         "lang": "Winkelstützelement aus Stahlbeton, Höhe {hh} m, Breite 0,50 bzw. 1,00 m, auf Magerbetonfundament "
                 "versetzen, Fugen mit Kompriband, rückseitig Noppenbahn und Filterkies. Abrechnung nach Länge.",
         "einheit": "m", "kg": "533", "gen": "B", "geraet": 12,
         "varianten": [{"hh": "0,55", "h": 0.8, "mat": 75}, {"hh": "0,80", "h": 1.0, "mat": 105}, {"hh": "1,05", "h": 1.2, "mat": 145},
                       {"hh": "1,55", "h": 1.6, "mat": 230}, {"hh": "2,05", "h": 2.0, "mat": 340}]},
        {"kurz": "Palisade {art}, Höhe {hh} cm, in Beton gesetzt",
         "lang": "Palisaden aus {art}, Höhe {hh} cm, davon etwa ein Drittel in Beton C20/25 gesetzt, fluchtgerecht. "
                 "Abrechnung nach Länge.",
         "einheit": "m", "kg": "533", "gen": "B",
         "varianten": [{"art": "Beton grau Ø 12 cm", "hh": "60", "h": 0.9, "mat": 55}, {"art": "Beton grau Ø 12 cm", "hh": "100", "h": 1.1, "mat": 85},
                       {"art": "Granit gespalten 12 × 12 cm", "hh": "100", "h": 1.4, "mat": 160}]},
        {"kurz": "Gabionenwand, Höhe {hh} m, Tiefe {t_} cm, Füllung Bruchstein",
         "lang": "Gabionen aus verzinktem bzw. Zink-Alu-beschichtetem Drahtgitter, Maschenweite 10 × 5 cm, mit "
                 "Bruchsteinfüllung 60/120 mm, Sichtseite von Hand gesetzt, auf Schotterfundament. Höhe {hh} m, "
                 "Tiefe {t_} cm. Abrechnung nach Länge.",
         "einheit": "m", "kg": "533", "gen": "C",
         "varianten": [{"hh": "0,8", "t_": "30", "h": 1.8, "mat": 120, "geraet": 10}, {"hh": "1,2", "t_": "30", "h": 2.4, "mat": 175, "geraet": 14},
                       {"hh": "1,8", "t_": "50", "h": 3.8, "mat": 330, "geraet": 22}]},
        {"kurz": "Trockenmauer Naturstein, Höhe bis {hh} m",
         "lang": "Trockenmauer aus lagerhaften Natursteinen (Sandstein, Kalkstein bzw. Grauwacke) ohne Mörtel, Anzug "
                 "10–15 %, Hinterfüllung mit Schotter, Fundament aus Schotter. Abrechnung nach Ansichtsfläche.",
         "einheit": "m²", "kg": "533", "gen": "C",
         "varianten": [{"hh": "0,8", "h": 4.0, "mat": 150, "geraet": 15}, {"hh": "1,5", "h": 5.0, "mat": 190, "geraet": 25}]},
        {"kurz": "Böschungssicherung {art}",
         "lang": "Böschung mit {art} sichern, an Böschungskopf und -fuß verankern bzw. einbinden. Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "533", "gen": "B",
         "varianten": [{"art": "Erosionsschutzmatte Kokos und Ansaat", "h": 0.15, "mat": 4.5},
                       {"art": "Böschungsplatten / Pflanzringe Beton", "h": 0.60, "mat": 32, "geraet": 3},
                       {"art": "Wasserbausteinen CP 90/250 in Lagen", "h": 0.35, "mat": 45, "geraet": 8}]},
    ]},
    {"name": "Ausstattung, Verkehrsflächen", "positionen": [
        {"kurz": "Poller {art}",
         "lang": "Absperrpfosten {art}, Höhe ca. 0,9–1,0 m, in Einzelfundament bzw. Bodenhülse gesetzt.",
         "einheit": "St", "kg": "551", "gen": "B",
         "varianten": [{"art": "Stahl verzinkt fest einbetoniert", "h": 1.0, "mat": 110}, {"art": "Stahl verzinkt herausnehmbar mit Dreikantschloss", "h": 1.3, "mat": 220},
                       {"art": "Edelstahl Ø 102 mm fest", "h": 1.1, "mat": 320}, {"art": "umlegbar mit Profilzylinder", "h": 1.3, "mat": 290},
                       {"art": "Rammschutzpoller Ø 159 mm betongefüllt", "h": 2.0, "mat": 380}]},
        {"kurz": "Fahrradanlehnbügel / Fahrradständer {art}",
         "lang": "Fahrradabstellanlage {art}, zum Einbetonieren bzw. Aufdübeln, einschließlich Fundamente.",
         "einheit": "St", "kg": "551", "gen": "B",
         "varianten": [{"art": "Anlehnbügel Stahl verzinkt, 1 Bügel = 2 Stellplätze", "h": 1.0, "mat": 120},
                       {"art": "Anlehnbügel Edelstahl", "h": 1.0, "mat": 230},
                       {"art": "Reihenparker für 5 Räder", "h": 1.2, "mat": 280},
                       {"art": "Fahrradüberdachung 5 Stellplätze", "h": 8, "mat": 2600}]},
        {"kurz": "Müllbox / Mülltonnenbox für {n} Tonnen",
         "lang": "Müllbox aus Stahl verzinkt bzw. pulverbeschichtet mit Klappdeckeln und Türen, für {n} Tonnen 240 l, "
                 "auf vorhandene Fläche gesetzt und verankert.",
         "einheit": "St", "kg": "551", "gen": "B",
         "varianten": [{"n": "2", "h": 3, "mat": 950}, {"n": "3", "h": 3.5, "mat": 1350}, {"n": "4", "h": 4, "mat": 1750}]},
        {"kurz": "Feuerwehrzufahrt / Aufstellfläche {art}",
         "lang": "Befestigte Feuerwehrzufahrt bzw. -aufstellfläche nach DIN 14090 als {art} auf Tragschicht ≥ 30 cm, "
                 "Achslast 10 t. Abrechnung nach Fläche (Tragschicht gesondert).",
         "einheit": "m²", "kg": "522", "gen": "B", "achsen": [FLAECHE],
         "varianten": [{"art": "Rasengittersteine Beton 10 cm", "h": 0.50, "mat": 22, "geraet": 1.8},
                       {"art": "Kunststoff-Rasenwaben mit Schotter-Rasen", "h": 0.30, "mat": 18, "geraet": 1.0},
                       {"art": "Schotterrasen 15 cm", "h": 0.15, "mat": 12, "geraet": 2.0}]},
        {"kurz": "Spielplatz-Fallschutz {art}",
         "lang": "Fallschutzbelag nach DIN EN 1177 als {art} für die angegebene kritische Fallhöhe, einschließlich "
                 "Einfassung anteilig. Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "552", "gen": "B",
         "varianten": [{"art": "Fallschutzkies 2/8, 30 cm", "h": 0.25, "mat": 14, "geraet": 2},
                       {"art": "Fallschutzsand 0/2, 30 cm", "h": 0.25, "mat": 12, "geraet": 2},
                       {"art": "Fallschutzplatten EPDM 45 mm", "h": 0.40, "mat": 55},
                       {"art": "fugenloser EPDM-Fallschutzbelag 50 mm", "h": 0.60, "mat": 85}]},
        {"kurz": "Verkehrszeichen / Hinweisschild an Pfosten",
         "lang": "Verkehrs- bzw. Hinweisschild nach StVO, retroreflektierend, an Rohrpfosten Ø 60 mm in Fundament, "
                 "einschließlich Schellen.",
         "einheit": "St", "kg": "551", "h": 1.5, "mat": 190, "gen": "A"},
        {"kurz": "Markierung {art}",
         "lang": "Fahrbahn- bzw. Stellplatzmarkierung {art}, Farbe weiß bzw. gelb, auf gereinigten Untergrund.",
         "einheit": "m", "kg": "522", "gen": "A",
         "varianten": [{"art": "Breitstrich 12 cm, Farbe", "h": 0.03, "mat": 1.1}, {"art": "Breitstrich 12 cm, Kaltplastik", "h": 0.05, "mat": 3.2},
                       {"art": "Sperrfläche / Zebrastreifen 50 cm, Kaltplastik", "h": 0.12, "mat": 12}]},
    ]},
]
