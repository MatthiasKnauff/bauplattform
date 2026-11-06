# LB 039 Trockenbauarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

_WAND = ("Nichttragende Montagewand nach DIN 18183-1 mit Unterkonstruktion aus Metallprofilen {p} (UW/CW, "
         "Achsabstand 62,5 cm), {bepl}, Hohlraum mit Mineralwolle {mw} gedämmt. Wanddicke ca. {d} mm. "
         "{anf}Anschlüsse mit Dichtungsband, Fugen und Befestigungsmittel verspachtelt in Qualitätsstufe Q2. "
         "Öffnungen über 2,5 m² werden abgezogen.")

LBS = [{
    "nr": "039", "name": "Trockenbauarbeiten", "atv": "DIN 18340", "lohn": "trockenbau",
    "gruppen": [
        {"name": "Metallständerwände", "positionen": [
            {"kurz": "Montagewand {p}, beplankt mit Gipsfaserplatten {bepl_k}, d = {d} mm",
             "lang": _WAND, "einheit": "m²", "kg": "342", "gen": "A",
             "varianten": [{"p": "CW 75", "bepl_k": "1 × 12,5 mm", "bepl": "beidseitig einlagig mit Gipsfaserplatten 12,5 mm", "mw": "60 mm", "d": "100", "anf": "", "h": 0.62, "mat": 20},
                           {"p": "CW 75", "bepl_k": "2 × 12,5 mm", "bepl": "beidseitig zweilagig mit Gipsfaserplatten 12,5 mm", "mw": "60 mm", "d": "125", "anf": "", "h": 0.85, "mat": 30}]},
            {"kurz": "Holzständerwand nichttragend, Ständer 60/{s} mm, 2 × 12,5 mm GK",
             "lang": "Nichttragende Trennwand mit Holzständerwerk aus KVH 60/{s} mm, Achsabstand 62,5 cm, beidseitig "
                     "zweilagig mit Gipsplatten 12,5 mm beplankt, Hohlraum mit Mineralwolle gedämmt, Fugen Q2. "
                     "Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "342", "gen": "B", "tags": ["altbau"],
             "varianten": [{"s": "60", "h": 0.90, "mat": 22}, {"s": "100", "h": 0.95, "mat": 26}]},
            {"kurz": "Montagewand einseitig beplankt (Raumabtrennung/Schachtwand) {p}, 2 × 12,5 mm",
             "lang": "Montagewand mit Ständern {p}, einseitig zweilagig mit Gipsplatten 12,5 mm beplankt, z. B. als "
                     "Schachtabschluss oder Wandverkleidung mit Abstand, gedämmt, Fugen Q2. Öffnungen über 2,5 m² "
                     "werden abgezogen.",
             "einheit": "m²", "kg": "342", "gen": "A",
             "varianten": [{"p": "CW 50", "h": 0.50, "mat": 11}, {"p": "CW 100", "h": 0.55, "mat": 14}]},
            {"kurz": "Metallständerwand {p}, einfach beplankt 12,5 mm GKB, d = {d} mm",
             "lang": _WAND, "einheit": "m²", "kg": "342", "gen": "A",
             "varianten": [{"p": "CW 50", "bepl": "beidseitig einlagig mit Gipsplatten GKB 12,5 mm", "mw": "40 mm", "d": "75", "anf": "", "h": 0.55, "mat": 12.5},
                           {"p": "CW 75", "bepl": "beidseitig einlagig mit Gipsplatten GKB 12,5 mm", "mw": "60 mm", "d": "100", "anf": "", "h": 0.57, "mat": 14},
                           {"p": "CW 100", "bepl": "beidseitig einlagig mit Gipsplatten GKB 12,5 mm", "mw": "80 mm", "d": "125", "anf": "", "h": 0.60, "mat": 16}]},
            {"kurz": "Metallständerwand {p}, doppelt beplankt 2 × 12,5 mm, d = {d} mm",
             "lang": _WAND, "einheit": "m²", "kg": "342", "gen": "A",
             "varianten": [{"p": "CW 50", "bepl": "beidseitig zweilagig mit Gipsplatten GKB bzw. GKF 12,5 mm", "mw": "40 mm", "d": "100", "anf": "", "h": 0.75, "mat": 17.5},
                           {"p": "CW 75", "bepl": "beidseitig zweilagig mit Gipsplatten GKB bzw. GKF 12,5 mm", "mw": "60 mm", "d": "125", "anf": "", "h": 0.77, "mat": 19},
                           {"p": "CW 100", "bepl": "beidseitig zweilagig mit Gipsplatten GKB bzw. GKF 12,5 mm", "mw": "80 mm", "d": "150", "anf": "", "h": 0.80, "mat": 21}]},
            {"kurz": "Brandschutzwand {k}, {p}, {bepl_k}",
             "lang": _WAND, "einheit": "m²", "kg": "342", "gen": "B",
             "varianten": [{"k": "EI 30", "p": "CW 75", "bepl_k": "2 × 12,5 mm GKF", "bepl": "beidseitig zweilagig mit Feuerschutzplatten GKF 12,5 mm", "mw": "60 mm, Schmelzpunkt ≥ 1000 °C", "d": "125",
                            "anf": "Feuerwiderstandsklasse EI 30 nach Prüfzeugnis des Systemherstellers, Anschlüsse nach Systemvorgabe. ", "h": 0.80, "mat": 21},
                           {"k": "EI 90", "p": "CW 75", "bepl_k": "2 × 12,5 mm GKF", "bepl": "beidseitig zweilagig mit Feuerschutzplatten GKF 12,5 mm", "mw": "60 mm, Schmelzpunkt ≥ 1000 °C, Rohdichte ≥ 40 kg/m³", "d": "125",
                            "anf": "Feuerwiderstandsklasse EI 90 nach Prüfzeugnis des Systemherstellers, Anschlüsse nach Systemvorgabe. ", "h": 0.85, "mat": 24},
                           {"k": "EI 90", "p": "CW 100", "bepl_k": "2 × 15 mm GKF", "bepl": "beidseitig zweilagig mit Feuerschutzplatten GKF 15 mm", "mw": "80 mm, Schmelzpunkt ≥ 1000 °C", "d": "160",
                            "anf": "Feuerwiderstandsklasse EI 90 als Brandwand-Ersatz nach Systemnachweis, Anschlüsse nach Systemvorgabe. ", "h": 0.92, "mat": 29}]},
            {"kurz": "Schallschutzwand Doppelständer {p}, 2 × 12,5 mm, Rw ≥ {rw} dB",
             "lang": _WAND, "einheit": "m²", "kg": "342", "gen": "B",
             "varianten": [{"p": "2 × CW 50 getrennt", "rw": "62", "bepl": "beidseitig zweilagig mit Schallschutzplatten 12,5 mm", "mw": "2 × 40 mm", "d": "155",
                            "anf": "Bewertetes Schalldämm-Maß nach Prüfzeugnis Rw ≥ 62 dB, Ständerreihen ohne Verbindung. ", "h": 1.00, "mat": 31},
                           {"p": "2 × CW 75 getrennt", "rw": "67", "bepl": "beidseitig zweilagig mit Schallschutzplatten 12,5 mm", "mw": "2 × 60 mm", "d": "205",
                            "anf": "Bewertetes Schalldämm-Maß nach Prüfzeugnis Rw ≥ 67 dB, Ständerreihen ohne Verbindung. ", "h": 1.05, "mat": 35}]},
            {"kurz": "Installationswand Doppelständer CW 50, Hohlraum bis {d} mm",
             "lang": "Installationswand aus zwei Reihen CW-50-Profilen mit Laschenverbindung, Gesamtdicke bis {d} mm, "
                     "beidseitig zweilagig mit Gipsplatten 12,5 mm (in Feuchträumen GKBI bzw. H2) beplankt, Hohlraum "
                     "teilweise gedämmt, Traversen für Sanitärobjekte gesondert. Verspachtelung Q2.",
             "einheit": "m²", "kg": "342", "gen": "B",
             "varianten": [{"d": "220", "h": 1.00, "mat": 27}, {"d": "300", "h": 1.10, "mat": 30}]},
            {"kurz": "Aufpreis Imprägnierte Platten (GKBI/H2) im Feuchtraum, je Lage",
             "lang": "Aufpreis für die Beplankung mit imprägnierten Gipsplatten (H2) anstelle GKB in häuslichen "
                     "Feuchträumen, je Plattenlage und Seite.",
             "einheit": "m²", "kg": "342", "h": 0.0, "mat": 1.6, "gen": "A"},
            {"kurz": "Aufpreis Zementgebundene Bauplatte statt Gipsplatte, je Lage",
             "lang": "Aufpreis für zementgebundene Bauplatten 12,5 mm in Nassbereichen (Duschanlagen, "
                     "Wassereinwirkungsklasse W2-I/W3-I) anstelle Gipsplatten, je Plattenlage und Seite, "
                     "einschließlich Systemspachtel und Gewebe.",
             "einheit": "m²", "kg": "342", "h": 0.12, "mat": 17, "gen": "B"},
            {"kurz": "Aufpreis Hartgipsplatte (Diamant/DFH2IR) für erhöhte Beanspruchung",
             "lang": "Aufpreis für hochfeste Gipsplatten (Typ DFH2IR) 12,5 mm anstelle GKB für erhöhte Stoß- und "
                     "Konsollasten, je Plattenlage und Seite.",
             "einheit": "m²", "kg": "342", "h": 0.03, "mat": 4.5, "gen": "A"},
            {"kurz": "Aufpreis Wandhöhe über {hh} m",
             "lang": "Aufpreis für Montagewände mit Wandhöhe über {hh} m, einschließlich verstärkter bzw. doppelter "
                     "Ständerprofile nach Systemtabelle und Arbeitsgerüst.",
             "einheit": "m²", "kg": "342", "gen": "B",
             "varianten": [{"hh": "4,0", "h": 0.10, "mat": 3.0}, {"hh": "6,0", "h": 0.18, "mat": 6.0, "geraet": 1.5}]},
            {"kurz": "Gleitender Deckenanschluss für Montagewand",
             "lang": "Gleitenden Deckenanschluss zur Aufnahme von Deckendurchbiegungen bis 20 mm mit Gleitprofil "
                     "bzw. Plattenstreifen nach Systemvorgabe herstellen, bei Brandschutzwänden nach Prüfzeugnis. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "342", "h": 0.25, "mat": 6.5, "gen": "A"},
            {"kurz": "Freies Wandende/Eckausbildung mit Kantenschutz",
             "lang": "Freies Wandende bzw. Wandecke mit CW-/UA-Profil verstärken, Kanten mit Kantenschutzprofil "
                     "verspachtelt. Abrechnung nach Länge.",
             "einheit": "m", "kg": "342", "h": 0.30, "mat": 4.5, "gen": "A"},
        ]},
        {"name": "Öffnungen, Einbauteile, Verstärkungen", "positionen": [
            {"kurz": "Türöffnung in Montagewand mit UA-Profilen, Höhe bis {hh} m, Breite bis {b} m",
             "lang": "Türöffnung in Montagewand mit 2 mm UA-Aussteifungsprofilen (Sturz- und Leibungsprofile) "
                     "bodenbis deckenhoch befestigt, Sturzausbildung, Leibungen beplankt und verspachtelt. Rohbauöffnung "
                     "bis {b} × {hh} m, für Zargenmontage durch den Tischler.",
             "einheit": "St", "kg": "342", "gen": "A",
             "varianten": [{"b": "1,01", "hh": "2,13", "h": 1.8, "mat": 48}, {"b": "2,01", "hh": "2,26", "h": 2.6, "mat": 78}]},
            {"kurz": "Öffnung für Fenster/Durchreiche/Lüftung in Montagewand bis {a} m²",
             "lang": "Öffnung in Montagewand mit Auswechslung aus CW-/UW-Profilen herstellen, Leibungen beplankt "
                     "und verspachtelt, Fläche bis {a} m².",
             "einheit": "St", "kg": "342", "gen": "A",
             "varianten": [{"a": "0,25", "h": 0.7, "mat": 8}, {"a": "1,0", "h": 1.2, "mat": 18}]},
            {"kurz": "Traverse/Tragständer für {wofuer} in Montagewand",
             "lang": "Traverse bzw. Montageelement für {wofuer} zwischen CW-Profilen einbauen, Belastbarkeit nach "
                     "Herstellerangabe, Lage nach Plan.",
             "einheit": "St", "kg": "342", "gen": "A",
             "varianten": [{"wofuer": "Waschtisch / WC (Sanitärtraverse)", "h": 0.40, "mat": 22},
                           {"wofuer": "Hängeschränke, Konsollasten (Holzbohle bzw. Blechstreifen)", "h": 0.30, "mat": 9},
                           {"wofuer": "Handlauf bzw. Stützgriff barrierefrei", "h": 0.40, "mat": 18}]},
            {"kurz": "Revisionsöffnung mit Revisionsklappe {art}, {g} mm",
             "lang": "Revisionsöffnung in Wand bzw. Decke herstellen und Revisionsklappe {art} der Größe {g} mm "
                     "mit Plattenfüllung bündig einbauen, Fugen verspachtelt.",
             "einheit": "St", "kg": "342", "gen": "B",
             "varianten": [{"art": "ohne Brandschutzanforderung", "g": "300 × 300", "h": 0.6, "mat": 38},
                           {"art": "ohne Brandschutzanforderung", "g": "600 × 600", "h": 0.8, "mat": 65},
                           {"art": "EI 30 (Wand/Decke) nach Prüfzeugnis", "g": "300 × 300", "h": 0.8, "mat": 145},
                           {"art": "EI 90 (Wand/Decke) nach Prüfzeugnis", "g": "600 × 600", "h": 1.1, "mat": 360}]},
            {"kurz": "Ausschnitt für Einbauteile (Dosen, Leuchten, Auslässe) bis Ø {d} mm",
             "lang": "Ausschnitte in Trockenbaubekleidungen für bauseitige Einbauteile herstellen, Lage nach Angabe "
                     "der Fachgewerke, bei Brandschutzbauteilen mit Einhausung nach Systemvorgabe (gesondert). "
                     "Durchmesser bzw. Kantenlänge bis {d} mm.",
             "einheit": "St", "kg": "342", "gen": "A",
             "varianten": [{"d": "70", "h": 0.08, "mat": 0}, {"d": "250", "h": 0.20, "mat": 0}]},
            {"kurz": "Brandschutz-Einhausung für Einbauleuchte/Dose in EI-Decke",
             "lang": "Einhausung aus Feuerschutzplatten für Einbauleuchten, Lautsprecher bzw. Dosen in "
                     "feuerwiderstandsfähigen Unterdecken bzw. Wänden nach Systemvorgabe herstellen.",
             "einheit": "St", "kg": "353", "h": 0.8, "mat": 18, "gen": "B"},
        ]},
        {"name": "Vorsatzschalen, Schächte, Bekleidungen", "positionen": [
            {"kurz": "Vorsatzschale {art}, Beplankung {bepl}",
             "lang": "Vorsatzschale vor Massivwand {art}, Beplankung {bepl}, Hohlraum mit Mineralwolle gedämmt, "
                     "Fugen und Anschlüsse verspachtelt Q2. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "345", "gen": "A",
             "varianten": [{"art": "freistehend mit CW 50", "bepl": "1 × 12,5 mm GKB", "h": 0.45, "mat": 10},
                           {"art": "freistehend mit CW 50", "bepl": "2 × 12,5 mm GKB", "h": 0.55, "mat": 13.5},
                           {"art": "direkt befestigt mit CD-Profil 60/27 und Direktabhängern", "bepl": "1 × 12,5 mm GKB", "h": 0.42, "mat": 9}]},
            {"kurz": "Vorwandinstallation Trockenbau für Sanitär, Höhe {hh}",
             "lang": "Bekleidung einer Vorwandinstallation (Montagegestelle bauseits) mit Gipsplatten H2 bzw. "
                     "zementgebundenen Bauplatten zweilagig, einschließlich Unterkonstruktion, Ausschnitte für "
                     "Anschlüsse und Revisionsöffnung, Ablageflächen. Höhe {hh}. Abrechnung nach Ansichtsfläche.",
             "einheit": "m²", "kg": "345", "gen": "B",
             "varianten": [{"hh": "bis 1,30 m", "h": 1.30, "mat": 22}, {"hh": "raumhoch", "h": 1.00, "mat": 20}]},
            {"kurz": "Installationsschacht {k}, dreiseitig, Abwicklung bis {a} m",
             "lang": "Schachtwand bzw. Schachtbekleidung für Installationsschächte {k}, dreiseitig, aus "
                     "Metallunterkonstruktion und Gipsplatten-Beplankung nach Systemvorgabe, Abwicklung bis {a} m, "
                     "einschließlich Anschlüsse und Verspachtelung. Abrechnung nach Ansichtsfläche.",
             "einheit": "m²", "kg": "342", "gen": "B",
             "varianten": [{"k": "ohne Brandschutzanforderung", "a": "1,5", "h": 0.90, "mat": 16},
                           {"k": "EI 90 von beiden Seiten", "a": "1,5", "h": 1.30, "mat": 34}]},
            {"kurz": "Brandschutzbekleidung Stahlstütze/-träger R{r}, {sys}",
             "lang": "Kastenförmige Brandschutzbekleidung von Stahlstützen bzw. -trägern mit {sys}, "
                     "Feuerwiderstand R{r} nach Prüfzeugnis bzw. Bauartgenehmigung, Plattendicke nach Profilfaktor, "
                     "Kantenschutz, Verspachtelung, Kennzeichnung. Abrechnung nach abgewickelter Bekleidungsfläche.",
             "einheit": "m²", "kg": "359", "gen": "C",
             "varianten": [{"r": "30", "sys": "Feuerschutzplatten GKF", "h": 1.2, "mat": 22},
                           {"r": "90", "sys": "Calciumsilikat- bzw. Gipsfaserplatten", "h": 1.6, "mat": 55}]},
            {"kurz": "Trockenputz Gipsplatten angesetzt, 12,5 mm",
             "lang": "Wandtrockenputz aus Gipsplatten 12,5 mm mit Ansetzbinder auf Massivwand angesetzt, Fugen und "
                     "Anschlüsse verspachtelt Q2. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "345", "h": 0.40, "mat": 6.5, "gen": "A"},
            {"kurz": "Verbundplatte Innendämmung {art}, d = {d} mm",
             "lang": "Innendämmung von Außenwänden mit Verbundplatten {art}, Dicke {d} mm, mit Ansetzbinder bzw. "
                     "Klebemörtel angesetzt und gedübelt, Fugen verspachtelt, Anschlüsse luftdicht. Bauphysikalischer "
                     "Nachweis bauseits. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "336", "gen": "B", "tags": ["altbau"],
             "varianten": [{"art": "Gipsplatte mit EPS und Dampfbremse", "d": "60", "h": 0.50, "mat": 22},
                           {"art": "Calciumsilikat, kapillaraktiv", "d": "50", "h": 0.80, "mat": 55},
                           {"art": "Holzfaser mit Lehm- bzw. Kalkputz-Trägerschicht", "d": "60", "h": 0.85, "mat": 48}]},
        ]},
        {"name": "Unterdecken, Deckenbekleidungen", "positionen": [
            {"kurz": "Holzbalkendecke unterseitig bekleiden, Federschiene, {bepl}",
             "lang": "Unterseitige Bekleidung von Holzbalkendecken mit Federschienen (Schallentkopplung) und "
                     "Beplankung {bepl}, Hohlraumdämmung gesondert, Fugen verspachtelt Q2.",
             "einheit": "m²", "kg": "353", "gen": "B", "tags": ["altbau"],
             "varianten": [{"bepl": "1 × 12,5 mm GKB", "h": 0.55, "mat": 11}, {"bepl": "2 × 12,5 mm GKF (F30-B mit Balken)", "h": 0.75, "mat": 16}]},
            {"kurz": "Hohlraumdämmung in Unterdecke/Holzbalkendecke, Mineralwolle {d} mm",
             "lang": "Hohlraumdämmung aus Mineralwolle-Filz WLS 035, Dicke {d} mm, auf Unterdecke bzw. zwischen "
                     "Balken lückenlos verlegt.",
             "einheit": "m²", "kg": "353", "gen": "A",
             "varianten": [{"d": "40", "h": 0.06, "mat": 3.2}, {"d": "100", "h": 0.08, "mat": 6.8}]},
            {"kurz": "Abgehängte Decke GK, Unterkonstruktion CD-Profile, Abhängehöhe bis {ab} cm, {bepl}",
             "lang": "Unterdecke nach DIN 18181 mit Metallunterkonstruktion aus CD-Profilen 60/27 (Grund- und "
                     "Tragprofil, kreuzweise), Nonius- bzw. Schnellabhänger, Abhängehöhe bis {ab} cm, Beplankung {bepl}, "
                     "Fugen verspachtelt Q2, Randanschluss mit Trennstreifen bzw. Schattenfuge. Öffnungen über "
                     "2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "353", "gen": "A",
             "varianten": [{"ab": "50", "bepl": "1 × 12,5 mm GKB", "h": 0.55, "mat": 13},
                           {"ab": "100", "bepl": "1 × 12,5 mm GKB", "h": 0.60, "mat": 14.5},
                           {"ab": "50", "bepl": "2 × 12,5 mm GKB", "h": 0.70, "mat": 17}]},
            {"kurz": "Deckenbekleidung direkt befestigt, {bepl}",
             "lang": "Deckenbekleidung an Massiv- bzw. Holzbalkendecken mit CD-Profilen auf Direktabhängern bzw. "
                     "Holzlattung, Beplankung {bepl}, Fugen verspachtelt Q2. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "353", "gen": "A",
             "varianten": [{"bepl": "1 × 12,5 mm GKB", "h": 0.48, "mat": 10.5}, {"bepl": "Gipsfaserplatte 12,5 mm", "h": 0.52, "mat": 14}]},
            {"kurz": "Brandschutz-Unterdecke {k}, selbstständig, {bepl}",
             "lang": "Feuerwiderstandsfähige Unterdecke {k} nach Prüfzeugnis des Systemherstellers, "
                     "Brandbeanspruchung von unten bzw. von oben und unten wie angegeben, Unterkonstruktion und "
                     "Beplankung {bepl}, Abhänger nach System, Randanschlüsse nach Systemvorgabe, verspachtelt Q2.",
             "einheit": "m²", "kg": "353", "gen": "B",
             "varianten": [{"k": "EI 30 (von unten)", "bepl": "2 × 12,5 mm GKF", "h": 0.85, "mat": 21},
                           {"k": "EI 90 (von unten)", "bepl": "2 × 20 mm GKF", "h": 1.05, "mat": 34},
                           {"k": "EI 90 selbstständig (von oben und unten), z. B. Flurdecke", "bepl": "Systemplatten nach Prüfzeugnis", "h": 1.30, "mat": 62}]},
            {"kurz": "Akustikdecke Gips-Lochplatte {loch}, mit Akustikvlies",
             "lang": "Fugenlose Akustikunterdecke aus gelochten Gipsplatten {loch} mit rückseitigem Akustikvlies, "
                     "Lochanteil nach Herstellerangabe, auf CD-Unterkonstruktion abgehängt, Randfries ungelocht, "
                     "Fugen mit Systemspachtel verspachtelt, Schallabsorptionsgrad αw nach Angabe. Öffnungen über "
                     "2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "353", "gen": "B",
             "varianten": [{"loch": "Rundlochung 8/18", "h": 0.85, "mat": 34}, {"loch": "Schlitzlochung bzw. Streulochung", "h": 0.90, "mat": 40}]},
            {"kurz": "Rasterdecke {art}, Raster 625 × 625 mm",
             "lang": "Rasterdecke mit sichtbarer Tragkonstruktion (T-Profile 24 mm, weiß), Raster 625 × 625 mm, "
                     "Einlegeplatten {art}, Abhängehöhe bis 80 cm, Randwinkel, Einlegeplatten demontierbar. "
                     "Ausschnitte für Einbauteile gesondert.",
             "einheit": "m²", "kg": "353", "gen": "A",
             "varianten": [{"art": "Mineralfaser, Kante SK, αw 0,7", "h": 0.32, "mat": 18},
                           {"art": "Mineralfaser, Kante VT (abgesetzt), αw 0,9", "h": 0.38, "mat": 28},
                           {"art": "Metallkassetten gelocht mit Akustikvlies", "h": 0.45, "mat": 48}]},
            {"kurz": "Deckensegel/Wandabsorber Akustik, {g}",
             "lang": "Freihängendes Akustik-Deckensegel bzw. Wandabsorber aus Glaswolle- bzw. Mineralwolleplatte mit "
                     "Vliesbeschichtung, Größe {g}, Schallabsorptionsklasse A, mit Seilabhängung bzw. "
                     "Einhängesystem montiert.",
             "einheit": "St", "kg": "353", "gen": "C",
             "varianten": [{"g": "1200 × 1200 mm", "h": 0.8, "mat": 190}, {"g": "2400 × 1200 mm", "h": 1.1, "mat": 330}]},
            {"kurz": "Fries/Deckensprung/Schürze in GK, Abwicklung bis {a} cm",
             "lang": "Deckensprung, Schürze bzw. Fries aus Gipsplatten mit Unterkonstruktion, Kanten mit "
                     "Kantenschutz, verspachtelt Q2, Abwicklung bis {a} cm. Abrechnung nach Länge.",
             "einheit": "m", "kg": "353", "gen": "B",
             "varianten": [{"a": "30", "h": 0.55, "mat": 7}, {"a": "60", "h": 0.80, "mat": 11}]},
            {"kurz": "Schattenfuge/Randabschlussprofil an Unterdecke",
             "lang": "Randabschluss der Unterdecke mit Schattenfugenprofil bzw. Randwinkel aus Stahlblech "
                     "verzinkt, umlaufend. Abrechnung nach Länge.",
             "einheit": "m", "kg": "353", "h": 0.15, "mat": 3.5, "gen": "A"},
            {"kurz": "Lichtband-/Vorhangschienen-Aussparung in GK-Decke",
             "lang": "Aussparung in der Unterdecke für Lichtband bzw. Vorhangschiene mit Profil herstellen, "
                     "Kanten beplankt und verspachtelt. Abrechnung nach Länge.",
             "einheit": "m", "kg": "353", "h": 0.45, "mat": 9, "gen": "B"},
        ]},
        {"name": "Dachgeschossausbau", "positionen": [
            {"kurz": "Dachschrägenbekleidung mit Zwischensparrendämmung {d} mm, GK 12,5 mm",
             "lang": "Ausbau von Dachschrägen: Zwischensparrendämmung aus Mineralwolle-Klemmfilz WLS 035, Dicke {d} mm, "
                     "feuchtevariable Dampfbremse luftdicht verklebt einschließlich Anschlüsse, Unterkonstruktion "
                     "(CD-Profile mit Direktabhängern bzw. Lattung) und Beplankung mit Gipsplatten 12,5 mm, Fugen "
                     "verspachtelt Q2. Abrechnung nach bekleideter Fläche.",
             "einheit": "m²", "kg": "364", "gen": "B",
             "varianten": [{"d": "160", "h": 1.00, "mat": 27}, {"d": "200", "h": 1.05, "mat": 31}, {"d": "240", "h": 1.10, "mat": 36}]},
            {"kurz": "Untersparrendämmung zusätzlich, d = {d} mm",
             "lang": "Zusätzliche Untersparrendämmung aus Mineralwolle WLS 032 zwischen Unterkonstruktion, Dicke {d} mm, "
                     "lückenlos eingebaut.",
             "einheit": "m²", "kg": "364", "gen": "A",
             "varianten": [{"d": "40", "h": 0.10, "mat": 5}, {"d": "60", "h": 0.12, "mat": 7.5}]},
            {"kurz": "Drempel-/Kniestockwand aus Montagewand CW 50, Höhe bis 1,2 m",
             "lang": "Drempelwand aus Metallständern CW 50, einseitig beplankt 2 × 12,5 mm GKB, gedämmt, "
                     "Anschluss an Dachschräge, verspachtelt Q2. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "342", "h": 0.75, "mat": 15, "gen": "A"},
            {"kurz": "Luftdichtheitsanschluss Dampfbremse an {wo}",
             "lang": "Luftdichten Anschluss der Dampfbremse an {wo} mit Systemklebeband bzw. Anschlusskleber "
                     "dauerhaft herstellen, Abrechnung nach Länge bzw. Stück wie angegeben.",
             "einheit": "m", "kg": "364", "gen": "A",
             "varianten": [{"wo": "Massivwände und Pfetten", "h": 0.12, "mat": 3.2},
                           {"wo": "Durchdringungen (Rohre, Kabel) mit Manschette", "einheit": "St", "h": 0.25, "mat": 6}]},
        ]},
        {"name": "Oberflächen, Sonstiges", "positionen": [
            {"kurz": "Aufpreis Oberflächenqualität {q} auf GK-Flächen",
             "lang": "Aufpreis für die Verspachtelung von Gipsplattenflächen in Qualitätsstufe {q} nach Merkblatt "
                     "Nr. 2 der Industriegruppe Gipsplatten anstelle Q2, einschließlich Schleifen.",
             "einheit": "m²", "kg": "345", "gen": "A",
             "varianten": [{"q": "Q3", "h": 0.10, "mat": 0.8}, {"q": "Q4", "h": 0.25, "mat": 2.0}]},
            {"kurz": "Fertigteil-Fensterbank/Ablage Gips-/Gipsfaserplatte",
             "lang": "Ablageflächen bzw. Fensterbänke aus Gipsfaserplatten auf Unterkonstruktion, Vorderkante mit "
                     "Kantenschutz, verspachtelt Q2. Tiefe bis 30 cm. Abrechnung nach Länge.",
             "einheit": "m", "kg": "345", "h": 0.45, "mat": 8, "gen": "B"},
            {"kurz": "Trockenbau-Bekleidung Rohre/Leitungen (Kofferung), Abwicklung bis {a} cm",
             "lang": "Verkofferung von Rohren und Leitungen mit Gipsplatten 12,5 mm auf UK, Kanten mit Kantenschutz, "
                     "verspachtelt Q2, Abwicklung bis {a} cm. Abrechnung nach Länge.",
             "einheit": "m", "kg": "345", "gen": "B",
             "varianten": [{"a": "40", "h": 0.55, "mat": 7}, {"a": "80", "h": 0.80, "mat": 12}]},
            {"kurz": "Rückbau Trockenbauwand/-decke im Bestand",
             "lang": "Vorhandene Trockenbauwand bzw. Unterdecke einschließlich Unterkonstruktion und Dämmung "
                     "zurückbauen, Material getrennt nach Gipsplatten, Metall und Dämmstoff zur Sammelstelle auf der "
                     "Baustelle; Entsorgung gesondert.",
             "einheit": "m²", "kg": "394", "h": 0.30, "mat": 0, "geraet": 0.5, "gen": "B", "tags": ["altbau"], "lohn": "abbruch"},
            {"kurz": "Stundenlohnarbeiten Trockenbauer",
             "lang": "Arbeiten im Stundenlohn auf Anordnung der Bauleitung, Facharbeiter einschließlich aller "
                     "Zuschläge. Abrechnung nach bestätigten Stundenlohnzetteln.",
             "einheit": "h", "kg": "342", "h": 1.0, "mat": 0, "geraet": 0.5, "gen": "A"},
        ]},
    ],
}]


# ------------------------------------------------------------------ Runde 2: Ausführungsachsen und weitere Grundpositionen
def _r2_setze(regeln):
    for g in LBS[0]["gruppen"]:
        for p in g["positionen"]:
            if p.get("achsen"):
                continue
            for teil, ax in regeln:
                if teil in p["kurz"]:
                    p["achsen"] = ax
                    break


def _r2_neu(gruppe, positionen):
    for g in LBS[0]["gruppen"]:
        if g["name"] == gruppe:
            g["positionen"] += positionen
            return
    LBS[0]["gruppen"].append({"name": gruppe, "positionen": positionen})


TB_HOEHE = [{}, {"k": "H ≤ 4 m", "t": "Wandhöhe über 2,75 m bis 4,00 m, Ständerabstand und Profile nach Herstellerangabe.", "fh": 1.12, "fm": 1.05},
            {"k": "H ≤ 5,5 m", "t": "Wandhöhe über 4,00 m bis 5,50 m, verstärkte Ständerprofile bzw. reduzierter Ständerabstand nach Herstellerangabe.",
             "fh": 1.28, "fm": 1.20, "gen": "B"}]
TB_PLATTE = [{}, {"k": "H2 statt GKB", "t": "Beplankung abweichend mit imprägnierten Gipsplatten (Typ H2) für häusliche Feuchträume.", "mat": 2.2},
             {"k": "GKF statt GKB", "t": "Beplankung abweichend mit Gipsplatten mit verbessertem Gefügezusammenhalt bei hohen Temperaturen (Typ DF).", "mat": 1.6},
             {"k": "Hartgips statt GKB", "t": "Beplankung abweichend mit Hartgipsplatten (Typ DFH2IR) für erhöhte Stoß-, Schall- und Befestigungsanforderungen.",
              "mat": 7.5, "fh": 1.08},
             {"k": "Gipsfaser statt GKB", "t": "Beplankung abweichend mit Gipsfaserplatten 12,5 mm, Fugen geklebt bzw. gespachtelt nach Herstellerangabe.",
              "mat": 6.0, "fh": 1.10}]
TB_QUAL = [{}, {"k": "Q3", "t": "Verspachtelung in Qualitätsstufe Q3: breites Ausspachteln der Fugen und scharfes Abziehen der Kartonoberfläche.",
                "h": 0.10, "mat": 0.6},
           {"k": "Q4", "t": "Verspachtelung in Qualitätsstufe Q4: vollflächiges Überziehen und Glätten der Oberfläche für Streiflicht und glänzende Beschichtungen.",
            "h": 0.22, "mat": 1.8, "gen": "B"}]
TB_ORT = [{}, {"k": "Bestand", "t": "Ausführung im Bestand: Anschlüsse an unebene Bestandsbauteile, Materialtransport von Hand, Schutz angrenzender Flächen.",
               "fh": 1.22, "fm": 1.03, "gen": "B", "tags": ["altbau"]},
          {"k": "≤ 5 m²", "t": "Ausführung in Einzelflächen bis 5 m² (Kleinflächen, Nischen, Vorsprünge).", "fh": 1.32, "fm": 1.05, "gen": "B"}]
TB_ORT2 = TB_ORT[:2]
TB_DPLATTE = [{}, {"k": "Platten H2", "t": "Beplankung abweichend mit imprägnierten Gipsplatten (Typ H2).", "mat": 2.2},
              {"k": "GKF", "t": "Beplankung abweichend mit Gipsplatten Typ DF.", "mat": 1.6},
              {"k": "Gipsfaser", "t": "Beplankung abweichend mit Gipsfaserplatten 12,5 mm.", "mat": 6.0, "fh": 1.12}]
TB_RAUM = [{}, {"k": "Räume ≤ 10 m²", "t": "Einzelräume bis 10 m² Grundfläche (Flure, Bäder, Abstellräume) mit hohem Rand- und Schnittanteil.", "fh": 1.25, "fm": 1.04}]
TB_DHOEHE = [{}, {"k": "Raumhöhe > 4 m", "t": "Raumhöhe über 4,00 m, Arbeiten von fahrbarem Gerüst bzw. Hubarbeitsbühne (Gerüst gesondert).", "fh": 1.18}]
TB_KANTE = [{}, {"k": "Kante VT", "t": "Plattenkante abweichend VT (teilweise verdeckt), Fase sichtbar.", "mat": 3.5, "fh": 1.05}]
TB_DACH = [{}, {"k": "mit Gauben/Kehlen", "t": "Dachflächen mit Gauben, Kehlen und Graten, hoher Anteil an Zuschnitten und Anschlüssen.", "fh": 1.25, "fm": 1.04}]
TB_STUFE = [{}, {"k": "≤ 2 m²", "t": "Einzelöffnung bzw. Einzelfläche bis 2 m².", "fh": 1.2}]

_r2_setze([
    ("Metallständerwand {p}, einfach", [TB_HOEHE, TB_PLATTE, TB_QUAL, TB_ORT]),
    ("Metallständerwand {p}, doppelt", [TB_HOEHE, TB_PLATTE, TB_QUAL, TB_ORT]),
    ("Installationswand Doppelständer", [TB_HOEHE, TB_PLATTE, TB_QUAL, TB_ORT]),
    ("Montagewand einseitig beplankt", [TB_HOEHE, TB_PLATTE, TB_QUAL, TB_ORT]),
    ("Brandschutzwand", [TB_HOEHE, TB_QUAL, TB_ORT]),
    ("Schallschutzwand Doppelständer", [TB_HOEHE, TB_QUAL, TB_ORT]),
    ("Montagewand {p}, beplankt mit Gipsfaser", [TB_HOEHE, TB_QUAL, TB_ORT]),
    ("Holzständerwand nichttragend", [TB_QUAL, TB_ORT]),
    ("Abgehängte Decke GK", [TB_DPLATTE, TB_QUAL, TB_RAUM, TB_DHOEHE, TB_ORT]),
    ("Deckenbekleidung direkt", [TB_DPLATTE, TB_QUAL, TB_RAUM, TB_DHOEHE, TB_ORT]),
    ("Holzbalkendecke unterseitig", [TB_DPLATTE, TB_QUAL, TB_RAUM, TB_ORT]),
    ("Brandschutz-Unterdecke", [TB_QUAL, TB_RAUM, TB_DHOEHE, TB_ORT]),
    ("Akustikdecke Gips-Lochplatte", [TB_RAUM, TB_DHOEHE, TB_ORT]),
    ("Rasterdecke", [TB_KANTE, TB_RAUM, TB_DHOEHE, TB_ORT]),
    ("Vorsatzschale", [TB_HOEHE, TB_QUAL, TB_ORT]),
    ("Vorwandinstallation Trockenbau", [TB_QUAL, TB_ORT]),
    ("Installationsschacht", [TB_QUAL, TB_ORT]),
    ("Brandschutzbekleidung Stahlstütze", [TB_ORT2]),
    ("Trockenputz Gipsplatten", [TB_QUAL, TB_ORT]),
    ("Verbundplatte Innendämmung", [TB_QUAL, TB_ORT]),
    ("Dachschrägenbekleidung", [TB_DACH, TB_QUAL, TB_ORT2]),
    ("Untersparrendämmung", [TB_DACH, TB_ORT2]),
    ("Drempel-/Kniestockwand", [TB_QUAL, TB_ORT2]),
    ("Hohlraumdämmung in Unterdecke", [TB_ORT2]),
    ("Fries/Deckensprung", [TB_QUAL, TB_ORT2]),
    ("Trockenbau-Bekleidung Rohre", [TB_QUAL, TB_ORT2]),
    ("Türöffnung in Montagewand", [TB_ORT2]),
    ("Öffnung für Fenster/Durchreiche", [TB_ORT2]),
    ("Revisionsöffnung", [TB_ORT2]),
    ("Rückbau Trockenbauwand", [[{}, {"k": "mit Dämmung getrennt", "t": "Dämmstoff, Gipsplatten und Metallprofile getrennt sammeln und zur Entsorgung bereitstellen.",
                                    "fh": 1.15}], [{}, {"k": "Decke", "t": "Rückbau an Deckenflächen (Unterdecken, Bekleidungen).", "fh": 1.25}]]),
])

_GIPSDIELE = ("Nichttragende Trennwand aus Gips-Wandbauplatten (Vollplatten) nach DIN EN 12859, Dicke {d} mm, {typ}, mit Gipskleber in Nut und Feder "
              "verklebt, Anschlüsse an Decke und Wände mit Anschlussstreifen aus Kork bzw. Bitumenfilz. Oberfläche gespachtelt Q2. "
              "Öffnungen über 2,5 m² werden abgezogen.")
_DOPPEL = ("Systemboden als {art} auf Rohbetondecke bzw. Estrich, Gesamthöhe bis Oberkante Platte {hh} mm, Nutzlast nach DIN EN 12825 bzw. "
           "DIN EN 13213 Elementklasse {kl}, einschließlich Randanschlüsse mit Dämmstreifen, Revisionsöffnungen bzw. Plattenzuschnitte und "
           "Erdung nach Herstellerangabe. Belag gesondert.")
_r2_neu("Metallständerwände", [
    {"kurz": "Gips-Wandbauplatte d = {d} mm, {typ_k}", "lang": _GIPSDIELE, "einheit": "m²", "kg": "342", "gen": "A",
     "achsen": [[{}, {"k": "H ≤ 4 m", "t": "Wandhöhe über 2,75 m bis 4,00 m, Plattendicke und Anschlüsse nach Herstellerangabe.", "fh": 1.12, "fm": 1.03}],
                TB_QUAL, TB_ORT],
     "varianten": [{"d": "60", "typ": "Rohdichte mittel", "typ_k": "Standard", "h": 0.42, "mat": 18},
                   {"d": "80", "typ": "Rohdichte mittel", "typ_k": "Standard", "h": 0.45, "mat": 22},
                   {"d": "100", "typ": "Rohdichte mittel", "typ_k": "Standard", "h": 0.48, "mat": 26},
                   {"d": "80", "typ": "hydrophobiert (Feuchtraum)", "typ_k": "hydrophobiert", "h": 0.45, "mat": 26},
                   {"d": "100", "typ": "Rohdichte hoch (Schallschutz)", "typ_k": "hohe Rohdichte", "h": 0.50, "mat": 31}]},
    {"kurz": "Metallständerwand {p} mit Strahlenschutz-Bleieinlage {pb} mm",
     "lang": "Metallständerwand {p} beidseitig zweilagig beplankt, eine Lage je Seite als Gipsplatte mit kaschierter Bleifolie {pb} mm "
             "Bleigleichwert, Stöße mit Bleistreifen überdeckt, Strahlenschutz nach Strahlenschutzgutachten. Hohlraumdämmung Mineralwolle. "
             "Durchdringungen mit Bleimanschetten.",
     "einheit": "m²", "kg": "342", "gen": "C", "achsen": [TB_HOEHE[:2], TB_QUAL, TB_ORT2],
     "varianten": [{"p": "CW 75", "pb": "1,0", "h": 1.30, "mat": 95}, {"p": "CW 75", "pb": "2,0", "h": 1.45, "mat": 150},
                   {"p": "CW 100", "pb": "2,0", "h": 1.50, "mat": 155}]},
    {"kurz": "Einbruchhemmende Montagewand RC {rc}, {p}",
     "lang": "Metallständerwand {p} mit einbruchhemmender Ausführung nach DIN EN 1627 Widerstandsklasse RC {rc} nach Systemprüfung: "
             "Stahlblecheinlage verzinkt zwischen den Beplankungslagen, beidseitig zweilagig beplankt, Hohlraumdämmung Mineralwolle.",
     "einheit": "m²", "kg": "342", "gen": "C", "achsen": [TB_HOEHE[:2], TB_QUAL, TB_ORT2],
     "varianten": [{"p": "CW 75", "rc": "2", "h": 1.15, "mat": 62}, {"p": "CW 75", "rc": "3", "h": 1.30, "mat": 82}]},
    {"kurz": "Feuchtraumwand zementgebunden, {p}, Beanspruchungsklasse W2-I",
     "lang": "Metallständerwand {p} aus korrosionsgeschützten Profilen, beidseitig einlagig mit zementgebundenen Bauplatten 12,5 mm beplankt, "
             "Fugen mit Systemarmierung, geeignet für Abdichtung nach DIN 18534 Wassereinwirkungsklasse W2-I/W3-I. Hohlraumdämmung Mineralwolle.",
     "einheit": "m²", "kg": "342", "gen": "B", "achsen": [TB_HOEHE[:2], TB_ORT],
     "varianten": [{"p": "CW 50", "h": 0.95, "mat": 42}, {"p": "CW 75", "h": 0.98, "mat": 45}, {"p": "CW 100", "h": 1.02, "mat": 48}]},
    {"kurz": "Wandanschluss Montagewand an Fassade/Pfosten-Riegel, schalltechnisch getrennt",
     "lang": "Anschluss einer Montagewand an Fassadenpfosten bzw. Fensterelemente mit Anschlussprofil, schalldämmendem Dichtungsband und "
             "beidseitig elastischer Fuge, ohne starre Verbindung zur Fassade.",
     "einheit": "m", "kg": "342", "h": 0.35, "mat": 9.5, "gen": "B", "achsen": [TB_ORT2]},
])
_r2_neu("Systemböden", [
    {"kurz": "{art_k}, Höhe {hh} mm, Elementklasse {kl}", "lang": _DOPPEL, "einheit": "m²", "kg": "352", "gen": "B",
     "achsen": [TB_RAUM, TB_ORT2, [{}, {"k": "Feuerwiderstand", "t": "Mit Feuerwiderstand nach Systemprüfung (F30 von unten), Hohlraum-Abschottungen gesondert.",
                                     "mat": 14, "fh": 1.08, "gen": "C"}]],
     "varianten": [{"art": "Hohlboden aus Calciumsulfat-Fließestrich auf verlorener Schalung", "art_k": "Hohlboden Fließestrich", "hh": "150", "kl": "2", "h": 0.55, "mat": 46},
                   {"art": "Hohlboden aus Calciumsulfat-Fließestrich auf verlorener Schalung", "art_k": "Hohlboden Fließestrich", "hh": "250", "kl": "3", "h": 0.60, "mat": 54},
                   {"art": "Doppelboden aus Calciumsulfatplatten 600 × 600 mm auf höhenverstellbaren Stützen", "art_k": "Doppelboden CaSO4", "hh": "200", "kl": "2", "h": 0.42, "mat": 62},
                   {"art": "Doppelboden aus Calciumsulfatplatten 600 × 600 mm auf höhenverstellbaren Stützen", "art_k": "Doppelboden CaSO4", "hh": "400", "kl": "3", "h": 0.48, "mat": 74},
                   {"art": "Doppelboden aus Holzwerkstoffplatten mit Stahlblechwanne auf Stützen", "art_k": "Doppelboden Holzwerkstoff", "hh": "200", "kl": "2", "h": 0.45, "mat": 58}]},
    {"kurz": "Revisions-/Bodentankeinsatz im Systemboden, {g}",
     "lang": "Revisionsöffnung bzw. Ausschnitt für Bodentank im Hohl- oder Doppelboden, {g}, mit Rahmen und belagsfähigem Deckel, "
             "Einbau nach Plan der Elektroplanung. Bodentank selbst gesondert.",
     "einheit": "St", "kg": "352", "gen": "B", "achsen": [TB_ORT2],
     "varianten": [{"g": "bis 300 × 300 mm", "h": 0.8, "mat": 55}, {"g": "bis 600 × 600 mm", "h": 1.1, "mat": 95}]},
    {"kurz": "Hohlraumabschottung im Systemboden, Höhe bis {hh} mm",
     "lang": "Abschottung des Bodenhohlraums an Raum- bzw. Brandabschnittsgrenzen aus Mineralwolleschott bzw. Brandschutzplatten nach "
             "Systemnachweis, einschließlich Verschluss von Leitungsdurchführungen.",
     "einheit": "m", "kg": "352", "gen": "C",
     "varianten": [{"hh": "200", "h": 0.6, "mat": 28}, {"hh": "400", "h": 0.8, "mat": 44}]},
])
_r2_neu("Vorsatzschalen, Schächte, Bekleidungen", [
    {"kurz": "Kabelkanal-/Leitungsbekleidung {k}, Abwicklung bis {a} cm",
     "lang": "Brandschutzbekleidung von Elektroleitungen bzw. Kabeltrassen aus Brandschutzplatten nach allgemeinem bauaufsichtlichem "
             "Prüfzeugnis, Feuerwiderstand {k} (Funktionserhalt bzw. Schutz der Rettungswege), Abwicklung bis {a} cm, mit Revisionsstößen.",
     "einheit": "m", "kg": "345", "gen": "C", "achsen": [TB_ORT2],
     "varianten": [{"k": "I30", "a": "60", "h": 0.85, "mat": 32}, {"k": "I90", "a": "60", "h": 1.05, "mat": 52},
                   {"k": "E30", "a": "100", "h": 1.15, "mat": 48}, {"k": "E90", "a": "100", "h": 1.45, "mat": 82}]},
    {"kurz": "Deckenschott/Brandschutzschott in Hohlraum über Unterdecke, {k}",
     "lang": "Schott im Deckenhohlraum über Flurwänden aus Metallunterkonstruktion und Brandschutzplatten nach Prüfzeugnis, "
             "Feuerwiderstand {k}, Höhe bis 1,0 m, einschließlich Anschlüsse an Rohdecke und Wandkopf.",
     "einheit": "m", "kg": "342", "gen": "C", "achsen": [TB_ORT2],
     "varianten": [{"k": "EI 30", "h": 0.90, "mat": 26}, {"k": "EI 90", "h": 1.20, "mat": 45}]},
    {"kurz": "Wandbekleidung Holzwerkstoffplatte {art}, d = {d} mm, auf Lattung",
     "lang": "Wandbekleidung aus {art}, Dicke {d} mm, auf Holz- bzw. Metallunterkonstruktion, sichtbar verschraubt oder geklebt nach "
             "Wahl des Auftraggebers, Kanten gefast. Als Prallschutz bzw. Träger für Einbauten.",
     "einheit": "m²", "kg": "345", "gen": "B", "achsen": [TB_HOEHE[:2], TB_ORT],
     "varianten": [{"art": "OSB/3-Platten", "d": "15", "h": 0.55, "mat": 16}, {"art": "OSB/3-Platten", "d": "22", "h": 0.60, "mat": 22},
                   {"art": "Dreischichtplatten Fichte", "d": "19", "h": 0.70, "mat": 38}, {"art": "Siebdruckplatten Birke", "d": "18", "h": 0.70, "mat": 42}]},
    {"kurz": "Prallwand/Ballwurfsichere Bekleidung, {art}",
     "lang": "Ballwurfsichere Wandbekleidung nach DIN 18032-3 aus {art} auf schwingungsgedämpfter Unterkonstruktion, Fugen und Kanten "
             "stoßgeschützt, für Sport- und Mehrzweckräume.",
     "einheit": "m²", "kg": "345", "gen": "C", "achsen": [TB_HOEHE[:2]],
     "varianten": [{"art": "Gipsfaserplatten zweilagig", "h": 0.90, "mat": 38}, {"art": "Holz-Lamellen auf Akustikvlies", "h": 1.20, "mat": 95}]},
])
_r2_neu("Unterdecken, Deckenbekleidungen", [
    {"kurz": "Metallkassettendecke {art}, {g}",
     "lang": "Abgehängte Metalldecke aus pulverbeschichteten Stahlblechkassetten {art}, Format {g}, auf Unterkonstruktion nach "
             "Herstellersystem, Abhängehöhe bis 750 mm, einschließlich Randwinkel. Akustikvlies werkseitig kaschiert.",
     "einheit": "m²", "kg": "353", "gen": "C", "achsen": [TB_RAUM, TB_DHOEHE, TB_ORT2],
     "varianten": [{"art": "Einlegesystem, gelocht", "g": "625 × 625 mm", "h": 0.50, "mat": 48},
                   {"art": "Klemmsystem, gelocht", "g": "600 × 600 mm", "h": 0.60, "mat": 58},
                   {"art": "Bandrastersystem, gelocht", "g": "Bandraster 1250 × 312,5 mm", "h": 0.70, "mat": 72}]},
    {"kurz": "Holzwolle-Akustikplatte {d} mm, {art}",
     "lang": "Akustikbekleidung aus zementgebundenen Holzwolleplatten, Dicke {d} mm, {art}, Farbe naturgrau bzw. werkseitig weiß "
             "beschichtet, sichtbar verschraubt auf Lattung bzw. direkt befestigt.",
     "einheit": "m²", "kg": "353", "gen": "B", "achsen": [TB_RAUM, TB_DHOEHE, TB_ORT2],
     "varianten": [{"d": "25", "art": "ohne Dämmung", "h": 0.40, "mat": 24},
                   {"d": "50", "art": "Mehrschichtplatte mit Mineralwollekern", "h": 0.45, "mat": 34},
                   {"d": "100", "art": "Mehrschichtplatte mit Mineralwollekern (Wärmedämmung Tiefgarage/Keller)", "h": 0.50, "mat": 48}]},
    {"kurz": "Unterdecke Feuchtraum/Außenbereich zementgebunden, Abhängehöhe bis 500 mm",
     "lang": "Abgehängte Unterdecke für Feuchträume bzw. überdachte Außenbereiche, Unterkonstruktion korrosionsgeschützt, Beplankung "
             "zementgebundene Bauplatten 12,5 mm, Fugen armiert, Oberfläche spachtelfähig.",
     "einheit": "m²", "kg": "353", "h": 0.85, "mat": 34, "gen": "B", "achsen": [TB_RAUM, TB_ORT2]},
    {"kurz": "Kühldecken-/Heizdeckenelemente in GK-Decke integrieren",
     "lang": "Integration von Kühl- bzw. Heizdeckenregistern (Lieferung durch TGA) in eine GK-Unterdecke: Ausbildung der Unterkonstruktion "
             "nach Herstellerangabe, Einlegen der Registerplatten, Spachtelung Q2. Anschluss der Register gesondert.",
     "einheit": "m²", "kg": "353", "h": 0.45, "mat": 6.5, "gen": "C", "achsen": [TB_QUAL, TB_ORT2]},
])


# Prüfung 11/2026: unpassende Achsen je Variante ausschließen
def _achsen_je_variante(prefix, wenn, neu):
    for g in LBS[0]["gruppen"]:
        for p in g["positionen"]:
            if p["kurz"].startswith(prefix):
                for v in p.get("varianten") or []:
                    if wenn(v):
                        v["achsen"] = neu(p.get("achsen") or [])


_ohne_55 = lambda ax: [TB_HOEHE[:2] if a is TB_HOEHE else a for a in ax]   # Wandhöhe 5,5 m nur mit CW 75/100 doppelt beplankt
_achsen_je_variante("Metallständerwand {p}, einfach", lambda v: True, _ohne_55)
_achsen_je_variante("Metallständerwand {p}, doppelt", lambda v: "50" in v.get("p", ""), _ohne_55)
_achsen_je_variante("Montagewand einseitig beplankt", lambda v: True, _ohne_55)
_achsen_je_variante("Vorsatzschale {art}", lambda v: "CW 50" in v.get("art", ""), _ohne_55)
# Beplankung bzw. Kante schon in der Variante: keine Zulage dafür
_ohne = lambda achse: (lambda ax: [a for a in ax if a is not achse])
_achsen_je_variante("Holzbalkendecke unterseitig bekleiden", lambda v: "GKF" in v.get("bepl", ""), _ohne(TB_DPLATTE))
_achsen_je_variante("Deckenbekleidung direkt befestigt", lambda v: "Gipsfaser" in v.get("bepl", ""), _ohne(TB_DPLATTE))
_achsen_je_variante("Rasterdecke {art}", lambda v: "VT" in v.get("art", "") or "Metall" in v.get("art", ""), _ohne(TB_KANTE))
