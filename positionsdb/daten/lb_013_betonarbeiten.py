# LB 013 Beton- und Stahlbetonarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)
# Beton-, Schalungs- und Bewehrungspositionen getrennt (übliche LV-Gliederung); Komplettpositionen in Gruppe "Fertigteile".

_BETON = ("Beton nach DIN EN 206/DIN 1045-2 als Transportbeton {b}, Expositionsklassen nach Statik und Planung, "
          "Konsistenz nach Wahl des AN, einbauen, verdichten und nachbehandeln. ")

LBS = [{
    "nr": "013", "name": "Beton- und Stahlbetonarbeiten", "atv": "DIN 18331", "lohn": "rohbau",
    "gruppen": [
        {"name": "Sauberkeitsschichten, Dämmung unter Bodenplatten", "positionen": [
            {"kurz": "Sauberkeitsschicht C12/15, d = {d} cm",
             "lang": "Sauberkeitsschicht aus unbewehrtem Beton C12/15 auf vorbereitetem Planum, Dicke {d} cm, "
                     "Oberfläche abgezogen. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "326", "gen": "A",
             "varianten": [{"d": "5", "h": 0.10, "mat": 7.2}, {"d": "8", "h": 0.12, "mat": 11.5}, {"d": "10", "h": 0.14, "mat": 14.2}]},
            {"kurz": "Trennlage PE-Folie 0,2 mm, zweilagig",
             "lang": "Trenn- und Gleitlage aus PE-Folie 0,2 mm in zwei Lagen mit 20 cm Stoßüberdeckung "
                     "unter Bodenplatten verlegen.",
             "einheit": "m²", "kg": "324", "h": 0.03, "mat": 0.9, "gen": "A"},
            {"kurz": "Lastabtragende Dämmung unter Bodenplatte, XPS {d} cm, WLS 035",
             "lang": "Lastabtragende Wärmedämmung unter der Bodenplatte aus extrudiertem Polystyrol XPS mit "
                     "allgemeiner bauaufsichtlicher Zulassung für diesen Einsatz, Druckspannung nach Statik "
                     "(≥ 300 kPa), Stufenfalz, WLS 035, Dicke {d} cm, einlagig dicht gestoßen.",
             "einheit": "m²", "kg": "326", "gen": "A",
             "varianten": [{"d": "10", "h": 0.08, "mat": 20}, {"d": "14", "h": 0.09, "mat": 28}, {"d": "20", "h": 0.12, "mat": 40}]},
            {"kurz": "Schaumglasschotter unter Bodenplatte, d = {d} cm verdichtet",
             "lang": "Lastabtragende Dämm- und Tragschicht aus Schaumglasschotter 10/50, Verdichtungsfaktor 1,3, "
                     "auf Geotextil eingebaut und verdichtet, Dicke nach Verdichtung {d} cm, mit Trennvlies oben.",
             "einheit": "m²", "kg": "326", "gen": "B",
             "varianten": [{"d": "20", "h": 0.12, "mat": 22, "geraet": 1.5}, {"d": "30", "h": 0.16, "mat": 33, "geraet": 2}]},
        ]},
        {"name": "Gründung", "positionen": [
            {"kurz": "Streifenfundament unbewehrt C{b}, in Erdschalung",
             "lang": "Streifen- bzw. Einzelfundament aus unbewehrtem Beton C{b} in Erdschalung (Graben) einbauen "
                     "und verdichten, Oberfläche abgezogen. Abrechnung nach Volumen.",
             "einheit": "m³", "kg": "322", "gen": "A",
             "varianten": [{"b": "16/20", "h": 0.70, "mat": 128}, {"b": "20/25", "h": 0.70, "mat": 134}]},
            {"kurz": "Fundament Stahlbeton {b}, Streifen-/Einzelfundament",
             "lang": _BETON + "Bauteil: bewehrtes Streifen- bzw. Einzelfundament; Schalung und Bewehrung werden "
                              "gesondert vergütet. Abrechnung nach Volumen.",
             "einheit": "m³", "kg": "322", "gen": "A",
             "varianten": [{"b": "C25/30", "h": 0.75, "mat": 140}, {"b": "C30/37", "h": 0.75, "mat": 150}]},
            {"kurz": "Frostschürze/Frostschutzfundament, Breite {b} cm, Tiefe 80 cm",
             "lang": "Umlaufende Frostschürze aus Beton C20/25 unter der Bodenplatte, Breite {b} cm, Tiefe "
                     "80 cm ab Unterkante Bodenplatte, einschließlich Aushub, Erdschalung und Abfuhr des Bodens.",
             "einheit": "m", "kg": "322", "gen": "B",
             "varianten": [{"b": "25", "h": 0.55, "mat": 30, "geraet": 6}, {"b": "40", "h": 0.75, "mat": 48, "geraet": 9}]},
            {"kurz": "Bodenplatte Stahlbeton {b}, d = {d} cm",
             "lang": _BETON + "Bauteil: Bodenplatte, Dicke {d} cm, Oberfläche maschinell geglättet bzw. abgerieben "
                              "nach Vorgabe; Bewehrung und Randschalung gesondert. Abrechnung nach Volumen.",
             "einheit": "m³", "kg": "324", "gen": "A",
             "varianten": [{"b": "C25/30", "d": "20–25", "h": 0.65, "mat": 140}, {"b": "C30/37", "d": "25–35", "h": 0.60, "mat": 150}]},
            {"kurz": "Bodenplatte WU-Beton {b}, wasserundurchlässig, d = {d} cm",
             "lang": "Bodenplatte aus wasserundurchlässigem Beton nach DAfStb-Richtlinie „Wasserundurchlässige "
                     "Bauwerke aus Beton“, Beanspruchungs- und Nutzungsklasse nach Planung, Festigkeitsklasse {b}, "
                     "w/z ≤ 0,55, Dicke {d} cm, einbauen, verdichten und mindestens 7 Tage nachbehandeln. "
                     "Bewehrung, Schalung und Fugenabdichtung gesondert.",
             "einheit": "m³", "kg": "324", "gen": "A",
             "varianten": [{"b": "C30/37", "d": "25–30", "h": 0.65, "mat": 162}, {"b": "C30/37", "d": "über 30", "h": 0.60, "mat": 162}]},
            {"kurz": "Oberfläche Bodenplatte flügelgeglättet, Zulage",
             "lang": "Zulage für Betonoberfläche maschinell flügelgeglättet, Ebenheit nach DIN 18202 Tab. 3 Zeile 3, "
                     "für direkte Nutzung bzw. Beschichtung geeignet.",
             "einheit": "m²", "kg": "324", "h": 0.08, "mat": 0.5, "geraet": 1.2, "gen": "A"},
            {"kurz": "Einstreuung Hartstoff in frischen Beton, Zulage",
             "lang": "Hartstoffeinstreuung nach DIN 18560-7, ca. 4 kg/m², in den frischen Beton einarbeiten "
                     "und flügelglätten, für Lager- und Garagenböden.",
             "einheit": "m²", "kg": "324", "h": 0.10, "mat": 4.5, "geraet": 1, "gen": "B"},
            {"kurz": "Aufzugsunterfahrt/Pumpensumpf, Stahlbeton, komplett",
             "lang": "Vertiefung in der Bodenplatte für Aufzugsunterfahrt bzw. Pumpensumpf, Grundfläche bis 4 m², "
                     "Tiefe bis 1,5 m, Stahlbeton C30/37 WU, einschließlich Schalung und Bewehrung.",
             "einheit": "St", "kg": "324", "h": 30, "mat": 1500, "gen": "C"},
        ]},
        {"name": "Wände und Stützen", "positionen": [
            {"kurz": "Wand Stahlbeton {b}, d = {d} cm",
             "lang": _BETON + "Bauteil: Wand, Dicke {d} cm, Höhe bis 3,0 m je Betonierabschnitt; Schalung und "
                              "Bewehrung gesondert. Abrechnung nach Volumen, Öffnungen über 0,5 m³ werden abgezogen.",
             "einheit": "m³", "kg": "331", "gen": "A",
             "varianten": [{"b": "C25/30", "d": "18–20", "h": 1.10, "mat": 145}, {"b": "C25/30", "d": "24–30", "h": 0.90, "mat": 145},
                           {"b": "C30/37 WU", "d": "25–30", "h": 0.95, "mat": 165}]},
            {"kurz": "Innenwand Stahlbeton {b}, d = {d} cm",
             "lang": _BETON + "Bauteil: tragende Innenwand bzw. Treppenhaus-/Aufzugswand, Dicke {d} cm; Schalung "
                              "und Bewehrung gesondert. Abrechnung nach Volumen.",
             "einheit": "m³", "kg": "341", "gen": "A",
             "varianten": [{"b": "C25/30", "d": "18–20", "h": 1.10, "mat": 145}, {"b": "C25/30", "d": "25", "h": 0.95, "mat": 145}]},
            {"kurz": "Stütze Stahlbeton {b}, Querschnitt bis {q} cm",
             "lang": _BETON + "Bauteil: Stütze, Querschnitt bis {q} cm, Höhe bis 3,5 m; Schalung und Bewehrung "
                              "gesondert. Abrechnung nach Volumen.",
             "einheit": "m³", "kg": "333", "gen": "A",
             "varianten": [{"b": "C30/37", "q": "25 × 25", "h": 2.6, "mat": 155}, {"b": "C30/37", "q": "40 × 40", "h": 1.8, "mat": 155}]},
            {"kurz": "Attika/Brüstung Stahlbeton C25/30, d = {d} cm",
             "lang": _BETON.replace("{b}", "C25/30") + "Bauteil: Attika bzw. Brüstung, Dicke {d} cm, Höhe bis 1,2 m; Schalung und "
                              "Bewehrung gesondert. Abrechnung nach Volumen.",
             "einheit": "m³", "kg": "331", "gen": "B",
             "varianten": [{"d": "20", "h": 1.6, "mat": 145}]},
            {"kurz": "Elementwand (Doppelwand) d = {d}, liefern, versetzen, verfüllen",
             "lang": "Wand aus Stahlbeton-Doppelwandelementen (Halbfertigteil) nach Elementplan, Gesamtdicke {d} cm, "
                     "einschließlich Bewehrung der Schalen, Versetzen mit Kran, Abstützung, Stoßbewehrung und "
                     "Kernbeton C25/30. Abrechnung nach Wandfläche, Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "331", "gen": "B",
             "varianten": [{"d": "24 cm", "h": 0.85, "mat": 105, "geraet": 8}, {"d": "30 cm", "h": 0.90, "mat": 125, "geraet": 9},
                           {"d": "30 cm, WU-Ausführung", "h": 1.00, "mat": 150, "geraet": 9}]},
        ]},
        {"name": "Decken, Unterzüge, Treppen", "positionen": [
            {"kurz": "Decke Stahlbeton {b}, d = {d} cm",
             "lang": _BETON + "Bauteil: Decke bzw. Dachdecke, Dicke {d} cm, Oberfläche abgezogen bzw. nach "
                              "Vorgabe; Schalung und Bewehrung gesondert. Abrechnung nach Volumen.",
             "einheit": "m³", "kg": "351", "gen": "A",
             "varianten": [{"b": "C25/30", "d": "18–22", "h": 0.75, "mat": 140}, {"b": "C30/37", "d": "24–30", "h": 0.70, "mat": 150}]},
            {"kurz": "Aufbeton auf Element-/Filigrandecke C25/30, d = {d} cm",
             "lang": "Ortbetonergänzung auf Elementdecken aus Beton C25/30 einschließlich Vornässen der "
                     "Fertigteiloberfläche, Dicke im Mittel {d} cm. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "351", "gen": "A",
             "varianten": [{"d": "14", "h": 0.12, "mat": 20}, {"d": "18", "h": 0.14, "mat": 25.5}]},
            {"kurz": "Elementdecke (Filigrandecke) d = {d} cm Fertigteilplatte, liefern und verlegen",
             "lang": "Stahlbeton-Elementdeckenplatten mit Gitterträgern, Plattendicke {d} cm, mit statisch "
                     "erforderlicher Bewehrung nach Verlegeplan liefern, mit Kran verlegen, Montageunterstützung "
                     "stellen und vorhalten; Zulagebewehrung und Aufbeton gesondert.",
             "einheit": "m²", "kg": "351", "gen": "B",
             "varianten": [{"d": "5", "h": 0.30, "mat": 38, "geraet": 4}, {"d": "6", "h": 0.30, "mat": 42, "geraet": 4}]},
            {"kurz": "Spannbeton-Hohldielen {d} cm, liefern und verlegen",
             "lang": "Spannbeton-Fertigdecke aus Hohlplatten, Dicke {d} cm, nach Verlegeplan liefern, mit Kran "
                     "verlegen, Fugen vergießen, Ringanker gesondert.",
             "einheit": "m²", "kg": "351", "gen": "B",
             "varianten": [{"d": "20", "h": 0.25, "mat": 68, "geraet": 5}, {"d": "26,5", "h": 0.25, "mat": 82, "geraet": 6}]},
            {"kurz": "Unterzug/Überzug Stahlbeton C30/37",
             "lang": _BETON.replace("{b}", "C30/37") + "Bauteil: Unter- bzw. Überzug, Ringbalken; Schalung und "
                              "Bewehrung gesondert. Abrechnung nach Volumen.",
             "einheit": "m³", "kg": "351", "h": 1.6, "mat": 150, "gen": "A"},
            {"kurz": "Ringanker/Ringbalken in Mauerwerk, C25/30",
             "lang": "Beton C25/30 für Ringanker, Ringbalken und Stürze in U-Schalen bzw. Mauerwerksaussparungen "
                     "einbauen; Bewehrung gesondert. Abrechnung nach Volumen.",
             "einheit": "m³", "kg": "331", "h": 2.4, "mat": 145, "gen": "A"},
            {"kurz": "Balkonplatte/Kragplatte Stahlbeton C30/37, d = 18–22 cm",
             "lang": _BETON.replace("{b}", "C30/37") + "Bauteil: auskragende Platte (Balkon, Vordach), mit Gefälle "
                              "und Tropfkante; Schalung, Bewehrung und Isokorb gesondert. Abrechnung nach Volumen.",
             "einheit": "m³", "kg": "352", "h": 1.3, "mat": 160, "gen": "B"},
            {"kurz": "Wärmedämmendes Anschlusselement (Kragplattenanschluss), Typ {t}",
             "lang": "Tragendes Wärmedämmelement für auskragende Bauteile mit bauaufsichtlicher Zulassung, "
                     "Tragstufe und Höhe nach Statik, Typ {t}, liefern und lagegerecht einbauen. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "352", "gen": "B",
             "varianten": [{"t": "Kragbalkon, Standardtragstufe", "h": 0.40, "mat": 145}, {"t": "Kragbalkon, hohe Tragstufe", "h": 0.45, "mat": 210},
                           {"t": "gestützter Balkon (Querkraft)", "h": 0.30, "mat": 75}]},
            {"kurz": "Treppenlauf Ortbeton C30/37 je Steigung, Schalung und Bewehrung",
             "lang": "Gerade Stahlbetontreppe in Ortbeton C30/37 mit Stufen, Laufbreite bis 1,25 m, einschließlich "
                     "Schalung (Lauf, Stufen, Wangen), Bewehrung nach Statik und Trittschalldämmlager. "
                     "Abrechnung nach Anzahl der Steigungen.",
             "einheit": "St", "kg": "351", "h": 3.2, "mat": 95, "gen": "B", "hinweis": "Einheit: je Steigung"},
            {"kurz": "Fertigteiltreppe Stahlbeton, gerader Lauf, {s} Steigungen",
             "lang": "Treppenlauf als Stahlbetonfertigteil in Sichtbetonqualität, Laufbreite bis 1,20 m, {s} "
                     "Steigungen, mit Trittschalldämmlagern an Podest bzw. Decke liefern und mit Kran versetzen.",
             "einheit": "St", "kg": "351", "gen": "B",
             "varianten": [{"s": "8–10", "h": 6, "mat": 1650, "geraet": 250}, {"s": "15–17", "h": 8, "mat": 2650, "geraet": 300}]},
            {"kurz": "Podestplatte Fertigteil, bis 3 m²",
             "lang": "Treppenpodest als Stahlbetonfertigteil, Fläche bis 3 m², mit Trittschalldämmlagern liefern "
                     "und versetzen.",
             "einheit": "St", "kg": "351", "h": 3, "mat": 850, "geraet": 120, "gen": "B"},
        ]},
        {"name": "Schalung", "positionen": [
            {"kurz": "Schalung {t}, Sichtbetonklasse {sb}",
             "lang": "Schalung für {t} herstellen, vorhalten und ausschalen, Schalhaut nach Wahl des AN, "
                     "Anforderungen an die Ansichtsfläche {sb}, einschließlich Abstützungen und Ankerstellen "
                     "schließen. Abrechnung nach geschalter Fläche.",
             "einheit": "m²", "gen": "A",
             "varianten": [{"t": "Fundamente und Bodenplattenränder", "sb": "ohne Anforderung", "h": 0.55, "mat": 7, "kg": "322"},
                           {"t": "Wände, Höhe bis 3,0 m", "sb": "ohne Anforderung", "h": 0.60, "mat": 8, "kg": "331"},
                           {"t": "Wände, Höhe bis 3,0 m", "sb": "SB 2", "h": 0.80, "mat": 12, "kg": "331"},
                           {"t": "Wände, Höhe bis 3,0 m", "sb": "SB 3", "h": 1.10, "mat": 19, "kg": "331"},
                           {"t": "Wände, Höhe über 3,0 bis 5,0 m", "sb": "ohne Anforderung", "h": 0.75, "mat": 10, "kg": "331"},
                           {"t": "Stützen, rechteckig", "sb": "ohne Anforderung", "h": 0.90, "mat": 10, "kg": "333"},
                           {"t": "Decken, Raumhöhe bis 3,0 m", "sb": "ohne Anforderung", "h": 0.55, "mat": 9, "kg": "351"},
                           {"t": "Decken, Raumhöhe bis 3,0 m", "sb": "SB 2", "h": 0.70, "mat": 12, "kg": "351"},
                           {"t": "Decken, Raumhöhe über 3,0 bis 5,0 m", "sb": "ohne Anforderung", "h": 0.70, "mat": 11, "kg": "351"},
                           {"t": "Unterzüge, Überzüge, Balken", "sb": "ohne Anforderung", "h": 1.10, "mat": 11, "kg": "351"},
                           {"t": "Deckenränder und Stirnflächen bis 30 cm", "sb": "ohne Anforderung", "h": 0.85, "mat": 7, "kg": "351"},
                           {"t": "Balkon- und Kragplatten mit Tropfkante", "sb": "SB 2", "h": 1.10, "mat": 14, "kg": "352"}]},
            {"kurz": "Rundstützenschalung Ø bis {d} cm",
             "lang": "Schalung für runde Stützen mit Kartonschalrohr bzw. Stahlschalung, Durchmesser bis {d} cm, "
                     "Höhe bis 3,5 m. Abrechnung nach Stützenlänge.",
             "einheit": "m", "kg": "333", "gen": "B",
             "varianten": [{"d": "30", "h": 0.8, "mat": 22}, {"d": "50", "h": 1.0, "mat": 38}]},
            {"kurz": "Aussparung in Schalung, bis {a}",
             "lang": "Aussparungen und Durchbrüche in Wänden oder Decken mit Aussparungskörpern einschalen, "
                     "Größe bis {a}, lage- und höhengerecht nach Plan.",
             "einheit": "St", "kg": "331", "gen": "A",
             "varianten": [{"a": "Ø 15 cm / 0,04 m²", "h": 0.30, "mat": 4}, {"a": "0,25 m²", "h": 0.60, "mat": 9}, {"a": "1,0 m²", "h": 1.30, "mat": 18}]},
            {"kurz": "Dreikantleiste in Schalung einlegen",
             "lang": "Dreikantleisten 15/15 mm in Schalungsecken einlegen zur Ausbildung gefaster Kanten.",
             "einheit": "m", "h": 0.03, "mat": 0.6, "gen": "A", "kg": "331"},
        ]},
        {"name": "Bewehrung", "positionen": [
            {"kurz": "Betonstahl B500B, Stabstahl {d}, schneiden, biegen, verlegen",
             "lang": "Betonstahl B500B als Stabstahl {d} nach Bewehrungsplänen liefern, schneiden, biegen und "
                     "verlegen, einschließlich Bindedraht und Abstandhalter. Abrechnung nach Stahlliste (theoretisches Gewicht).",
             "einheit": "t", "gen": "A", "kg": "351",
             "varianten": [{"d": "Ø 6–12 mm", "h": 17, "mat": 990}, {"d": "Ø 14–28 mm", "h": 12, "mat": 960}, {"d": "gemischt Ø 6–28 mm", "h": 15, "mat": 975}]},
            {"kurz": "Betonstahlmatten B500A, Lagermatten, verlegen",
             "lang": "Betonstahlmatten B500A als Lagermatten nach Verlegeplan liefern, zuschneiden und verlegen "
                     "einschließlich Abstandhalter und Unterstützungskörbe. Abrechnung nach Gewicht ohne Verschnitt.",
             "einheit": "t", "kg": "351", "h": 11, "mat": 980, "gen": "A"},
            {"kurz": "Bewehrung in kleinen Mengen (Kleinbauteile), Zulage",
             "lang": "Zulage zur Bewehrung für Kleinmengen bis 200 kg je Bauteil (Stürze, Ringanker, Podeste).",
             "einheit": "kg", "kg": "331", "h": 0.008, "mat": 0.10, "gen": "B"},
            {"kurz": "Bewehrungsanschluss mit Rückbiegeanschluss, Länge",
             "lang": "Bewehrungsanschluss mit Verwahrkasten (Rückbiegeanschluss) nach Statik einbauen, "
                     "nach dem Ausschalen öffnen und Bügel zurückbiegen.",
             "einheit": "m", "kg": "331", "h": 0.30, "mat": 16, "gen": "A"},
            {"kurz": "Bewehrung nachträglich einbohren und verkleben, Ø {d} mm",
             "lang": "Bewehrungsstäbe Ø {d} mm in vorhandenen Beton einbohren, Bohrloch reinigen und mit "
                     "bauaufsichtlich zugelassenem Injektionsmörtel verankern, Einbindetiefe nach Statik bis 20 cm.",
             "einheit": "St", "kg": "331", "gen": "B", "tags": ["altbau"],
             "varianten": [{"d": "10", "h": 0.30, "mat": 4.5, "geraet": 1}, {"d": "16", "h": 0.40, "mat": 8, "geraet": 1.5}]},
            {"kurz": "Durchstanzbewehrung Dübelleisten",
             "lang": "Durchstanzbewehrung aus Doppelkopfankern auf Montageleisten mit bauaufsichtlicher "
                     "Zulassung nach Statik liefern und einbauen. Abrechnung nach Gewicht.",
             "einheit": "kg", "kg": "351", "h": 0.03, "mat": 4.8, "gen": "B"},
        ]},
        {"name": "Fugen, Einbauteile, WU-Details", "positionen": [
            {"kurz": "Abdichtung Arbeitsfuge mit {t}",
             "lang": "Abdichtung von Arbeitsfugen in WU-Bauteilen mit {t} nach allgemeinem bauaufsichtlichem "
                     "Prüfzeugnis, lagegerecht befestigt, Stöße und Kreuzungen nach Herstellervorgabe.",
             "einheit": "m", "kg": "324", "gen": "A",
             "varianten": [{"t": "unbeschichtetem Fugenblech 300 × 1,5 mm", "h": 0.20, "mat": 10},
                           {"t": "beschichtetem Fugenblech", "h": 0.18, "mat": 14},
                           {"t": "quellfähigem Fugenband", "h": 0.12, "mat": 9},
                           {"t": "Injektionsschlauch inkl. Verpressen", "h": 0.25, "mat": 22}]},
            {"kurz": "Dehnfugenband innenliegend, Breite {b} mm",
             "lang": "Elastomer-Dehnfugenband innenliegend nach DIN 7865 für Bewegungsfugen, Breite {b} mm, "
                     "einschließlich Fugeneinlage, Stöße werkseitig bzw. vulkanisiert.",
             "einheit": "m", "kg": "324", "gen": "B",
             "varianten": [{"b": "240", "h": 0.45, "mat": 42}, {"b": "320", "h": 0.50, "mat": 58}]},
            {"kurz": "Sollrissfugenelement WU-Wand",
             "lang": "Sollrissquerschnittsschwächung mit Fugenelement für WU-Wände nach Herstellerangabe "
                     "einbauen, Höhe bis 3,0 m.",
             "einheit": "m", "kg": "331", "h": 0.25, "mat": 26, "gen": "B"},
            {"kurz": "Rohrdurchführung WU, Futterrohr mit Dichtflansch DN {dn}",
             "lang": "Wasserdichte Rohrdurchführung für WU-Bauteile: Futterrohr mit Dichtflansch bzw. "
                     "Mantelrohr für Ringraumdichtung, DN {dn}, lagegerecht einbetonieren.",
             "einheit": "St", "kg": "331", "gen": "A",
             "varianten": [{"dn": "100", "h": 0.6, "mat": 38}, {"dn": "150", "h": 0.7, "mat": 52}, {"dn": "200", "h": 0.8, "mat": 70}]},
            {"kurz": "Einbauteil einbetonieren (Ankerschiene/Ankerplatte), bis {g} kg",
             "lang": "Stahl-Einbauteile (Ankerschienen, Ankerplatten, Kopfbolzen) bauseits bzw. als Lieferung "
                     "nach Plan lagegerecht befestigen und einbetonieren, Gewicht je Stück bis {g} kg; "
                     "Lieferung der Einbauteile gesondert.",
             "einheit": "St", "kg": "331", "gen": "A",
             "varianten": [{"g": "5", "h": 0.4, "mat": 2}, {"g": "20", "h": 0.8, "mat": 3}]},
            {"kurz": "Ankerschiene warmgewalzt, Länge 0,30 m, liefern und einbauen",
             "lang": "Ankerschiene aus feuerverzinktem Stahl, Profil 40/22, Länge 0,30 m, mit Schaumfüllung, "
                     "liefern und einbetonieren.",
             "einheit": "St", "kg": "331", "h": 0.25, "mat": 16, "gen": "A"},
            {"kurz": "Elektro-Leerdose und Leerrohr in Decke einlegen",
             "lang": "Deckendosen und Leerrohre nach Vorgabe der Elektroplanung vor dem Betonieren einlegen "
                     "(Material bauseits), lagegerecht befestigen.",
             "einheit": "St", "kg": "444", "h": 0.25, "mat": 0, "geraet": 0.5, "gen": "A"},
            {"kurz": "Fugenabdichtung Sockel/Bodenplatte, Dichtschlämme",
             "lang": "Zusätzliche Abdichtung des Anschlusses Bodenplatte/Wand mit mineralischer Dichtschlämme, "
                     "Breite 30 cm, zweilagig.",
             "einheit": "m", "kg": "335", "h": 0.12, "mat": 3.5, "gen": "A"},
        ]},
        {"name": "Perimeter- und Wanddämmung, Kleinleistungen", "positionen": [
            {"kurz": "Perimeterdämmung XPS an erdberührten Wänden, d = {d} cm",
             "lang": "Perimeterdämmung aus XPS-Platten mit Stufenfalz, WLS 035, Dicke {d} cm, punktweise auf die "
                     "Abdichtung bzw. WU-Wand geklebt, bis 3 m Einbautiefe.",
             "einheit": "m²", "kg": "335", "gen": "A",
             "varianten": [{"d": "10", "h": 0.20, "mat": 20}, {"d": "14", "h": 0.22, "mat": 28}, {"d": "20", "h": 0.25, "mat": 40}]},
            {"kurz": "Dämmung einlegen in Schalung (Holzwolle-Mehrschichtplatte), d = {d} cm",
             "lang": "Holzwolle-Mehrschichtplatte mit Mineralwolle- bzw. EPS-Kern als verlorene Schalung bzw. "
                     "Untersichtdämmung in die Deckenschalung einlegen, Dicke {d} cm, mit Dübeln verankert.",
             "einheit": "m²", "kg": "353", "gen": "B",
             "varianten": [{"d": "10", "h": 0.20, "mat": 22}, {"d": "15", "h": 0.22, "mat": 29}]},
            {"kurz": "Kernbohrung in Stahlbeton Ø {d} mm, je m Bohrtiefe",
             "lang": "Kernbohrung mit Diamantbohrkrone in Stahlbeton, Durchmesser bis {d} mm, einschließlich "
                     "Wasserabsaugung und Bohrkern entsorgen. Abrechnung nach Bohrtiefe in Metern (1 cm = 0,01 m).",
             "einheit": "m", "kg": "394", "gen": "B", "tags": ["altbau"], "lohn": "abbruch",
                          "varianten": [{"d": "62", "h": 1.2, "geraet": 45}, {"d": "125", "h": 1.8, "geraet": 75}, {"d": "200", "h": 2.6, "geraet": 115},
                           {"d": "300", "h": 3.8, "geraet": 180}]},
            {"kurz": "Öffnung in Stahlbetonwand sägen, d bis {d} cm",
             "lang": "Öffnung in Stahlbetonwand mit Wandsäge schneiden, Wanddicke bis {d} cm, Eckbohrungen, "
                     "Betonteile zerlegen und zur Sammelstelle transportieren. Abrechnung nach Schnittlänge.",
             "einheit": "m", "kg": "394", "gen": "C", "tags": ["altbau"], "lohn": "abbruch",
             "varianten": [{"d": "20", "h": 1.0, "geraet": 85}, {"d": "30", "h": 1.3, "geraet": 125}]},
            {"kurz": "Betonoberfläche aufrauen/kugelstrahlen",
             "lang": "Vorhandene Betonoberflächen durch Kugelstrahlen bzw. Fräsen aufrauen und Zementschlämme "
                     "entfernen, als Haftgrund für Aufbeton oder Beschichtung, staubfrei absaugen.",
             "einheit": "m²", "kg": "352", "h": 0.10, "geraet": 6, "gen": "B", "tags": ["altbau"]},
            {"kurz": "Betoninstandsetzung, Fehlstelle reprofilieren bis 3 cm",
             "lang": "Schadhaften Beton bis auf tragfähigen Untergrund entfernen, Bewehrung entrosten und mit "
                     "Korrosionsschutz versehen, mit PCC-Mörtel nach Instandsetzungsrichtlinie reprofilieren, "
                     "Schichtdicke bis 3 cm.",
             "einheit": "m²", "kg": "352", "h": 3.5, "mat": 45, "gen": "C", "tags": ["altbau"]},
            {"kurz": "Vergussmörtel unter Stützen/Auflagern, schwindarm",
             "lang": "Fugen unter Fertigteilstützen, Stahlstützen und Auflagern mit schwindarmem "
                     "Vergussmörtel vergießen. Abrechnung nach Volumen.",
             "einheit": "l", "kg": "333", "h": 0.08, "mat": 2.6, "gen": "B"},
        ]},
    ],
}]


# ---------------------------------------------------------------- Runde 2: Ausführungsachsen und weitere Grundpositionen
EXPO = [{"k": "XC1", "t": "Expositionsklasse XC1 (Innenbauteil, trocken)."},
        {"k": "XC4/XF1", "t": "Expositionsklassen XC4, XF1 (Außenbauteil, frei bewittert).", "mat": 6},
        {"k": "XD1/XF2", "t": "Expositionsklassen XD1, XF2 (Tausalz, z. B. Garagen und Zufahrten), Luftporenbildner nach Erfordernis.", "mat": 16},
        {"k": "XA1", "t": "Expositionsklasse XA1 (chemisch schwach angreifend) nach Bodengutachten.", "mat": 11}]
EINBAU = [{"k": "Kübel", "t": "Einbau mit Kran und Kübel."},
          {"k": "Pumpe", "t": "Einbau mit Autobetonpumpe einschließlich An- und Abfahrt anteilig.", "fh": 0.8, "geraet": 14},
          {"k": "SVB", "t": "Einbau als selbstverdichtender Beton (SVB), Schalung auf erhöhten Frischbetondruck ausgelegt.", "fh": 0.6, "mat": 32, "gen": "B"}]
MENGE = [{}, {"k": "Kleinmenge", "t": "Betonierabschnitt bis 5 m³, Kleinmengenzuschlag des Werks eingerechnet.", "fh": 1.45, "mat": 18, "gen": "B"}]
ORT = [{}, {"k": "Bestand", "t": "Ausführung im Bestand bzw. Umbau: Anschluss an vorhandene Bauteile, eingeschränkte Zufahrt und Förderung.",
            "fh": 1.35, "mat": 8, "gen": "B", "tags": ["altbau"]}]
WINTER = [{}, {"k": "Winterbau", "t": "Betonieren bei Temperaturen unter +5 °C: Warmbeton bzw. Erhärtungsbeschleuniger, Abdecken mit Wärmedämmmatten.",
               "fh": 1.1, "mat": 9}]
HOEHE = [{"k": "bis 3 m", "t": "Schalhöhe bis 3,0 m."}, {"k": "3–4,5 m", "t": "Schalhöhe über 3,0 bis 4,5 m.", "fh": 1.15, "fm": 1.1},
         {"k": "über 4,5 m", "t": "Schalhöhe über 4,5 m, mit zusätzlichen Arbeitsbühnen.", "fh": 1.35, "fm": 1.25, "gen": "B"}]
SCHALHAUT = [{"k": "Systemschalung", "t": "Schalhaut aus Systemschalung, Ansichtsfläche ohne besondere Anforderung."},
             {"k": "Brettschalung", "t": "Schalhaut als sägeraue Brettschalung, Bretter gleicher Breite, Stöße versetzt.", "fh": 1.6, "mat": 7, "gen": "B"},
             {"k": "Matrize", "t": "Schalhaut mit Strukturmatrize (Elastomer) nach Bemusterung, Matrizenanteil einmalig eingerechnet.", "fh": 1.3, "mat": 38, "gen": "C"}]
EINSATZ = [{}, {"k": "Einzelfertigung", "t": "Einmaliger Einsatz ohne Wiederholung (Sonderform bzw. Einzelbauteil).", "fh": 1.25, "fm": 1.6, "gen": "B"}]
LIEFER = [{"k": "gebogen geliefert", "t": "Bewehrung nach Liste gebogen geliefert."},
          {"k": "Baustellenbiegung", "t": "Schneiden und Biegen auf der Baustelle.", "fh": 1.3, "mat": -40}]
KLEINFL = [{}, {"k": "Teilflächen bis 5 m²", "t": "Ausführung in Einzelflächen bis 5 m².", "fh": 1.35, "gen": "B"}]


def _ax(prefix, achsen):
    for g in LBS[0]["gruppen"]:
        for p in g["positionen"]:
            if p["kurz"].startswith(prefix) and "achsen" not in p:
                p["achsen"] = achsen


for _p in ("Fundament Stahlbeton", "Bodenplatte Stahlbeton", "Bodenplatte WU-Beton"):
    _ax(_p, [EXPO, EINBAU, MENGE, ORT, WINTER])
for _p in ("Wand Stahlbeton", "Innenwand Stahlbeton", "Stütze Stahlbeton", "Attika", "Decke Stahlbeton", "Unterzug", "Balkonplatte"):
    _ax(_p, [EXPO, EINBAU, MENGE, ORT, WINTER])
_ax("Streifenfundament unbewehrt", [EINBAU, MENGE, ORT, WINTER])
_ax("Ringanker", [MENGE, ORT, WINTER])
_ax("Schalung ", [SCHALHAUT, HOEHE, EINSATZ, ORT])
_ax("Rundstützenschalung", [HOEHE, EINSATZ, ORT])
_ax("Betonstahl B500B", [LIEFER, MENGE, ORT])
_ax("Betonstahlmatten", [MENGE, ORT])
_ax("Sauberkeitsschicht", [EINBAU[:2], KLEINFL, ORT])
_ax("Lastabtragende Dämmung", [KLEINFL, ORT])
_ax("Perimeterdämmung", [[{}, {"k": "zweilagig", "t": "Zweilagig mit versetzten Stößen verlegt.", "fh": 1.4, "mat": 2}], KLEINFL, ORT])
_ax("Aufbeton", [EINBAU, KLEINFL, ORT, WINTER])
_ax("Elementdecke", [[{}, {"k": "Sichtuntersicht", "t": "Untersicht in Sichtqualität für Anstrich ohne Spachtelung.", "mat": 6}], KLEINFL, ORT])
_ax("Elementwand", [[{}, {"k": "Sichtfläche", "t": "Ansichtsseite in Sichtbetonqualität SB 2.", "mat": 12}], HOEHE, ORT])
_ax("Kernbohrung", [[{"k": "Wand", "t": "Bohrung horizontal in Wänden."}, {"k": "Decke", "t": "Bohrung vertikal in Decken, Wasser auffangen.", "fh": 1.1},
                     {"k": "Überkopf", "t": "Bohrung überkopf von unten.", "fh": 1.3}], ORT])
_ax("Abdichtung Arbeitsfuge", [ORT])
_ax("Rohrdurchführung WU", [[{}, {"k": "nachträglich", "t": "Nachträglicher Einbau in Kernbohrung mit Ringraumdichtung.", "h": 0.8, "mat": 25}]])

_BESTAND = [{"k": "", "t": ""}, {"k": "im Bestand", "t": "Ausführung im Bestand bei eingeschränkter Zugänglichkeit.", "fh": 1.3, "gen": "B", "tags": ["altbau"]}]

LBS[0]["gruppen"].append({"name": "Komplettbauteile (Beton, Schalung, Bewehrung)", "positionen": [
    {"kurz": "Bodenplatte komplett, d = {d} cm, {b}",
     "lang": "Bodenplatte als Komplettleistung: Randschalung, Bewehrung nach Statik (im Mittel {bew} kg/m²), Beton {b} "
             "einbauen, verdichten, Oberfläche abgezogen und abgerieben, nachbehandeln. Abrechnung nach Fläche.",
     "einheit": "m²", "kg": "324", "gen": "B", "achsen": [EXPO, EINBAU, MENGE, ORT],
     "varianten": [{"d": "16", "b": "C25/30", "bew": "12", "h": 0.55, "mat": 38}, {"d": "20", "b": "C25/30", "bew": "15", "h": 0.62, "mat": 46},
                   {"d": "25", "b": "C30/37", "bew": "20", "h": 0.72, "mat": 58}, {"d": "30", "b": "C30/37 WU", "bew": "28", "h": 0.85, "mat": 74},
                   {"d": "40", "b": "C30/37 WU", "bew": "40", "h": 1.05, "mat": 98}]},
    {"kurz": "Stahlbetonwand komplett, d = {d} cm, {b}",
     "lang": "Stahlbetonwand als Komplettleistung: zweiseitige Systemschalung, Bewehrung nach Statik (im Mittel {bew} kg/m²), "
             "Beton {b}, Wandhöhe bis 3,0 m. Abrechnung nach Wandfläche, Öffnungen über 2,5 m² werden abgezogen.",
     "einheit": "m²", "kg": "331", "gen": "B", "achsen": [EXPO, HOEHE, MENGE, ORT],
     "varianten": [{"d": "18", "b": "C25/30", "bew": "14", "h": 2.0, "mat": 46}, {"d": "20", "b": "C25/30", "bew": "16", "h": 2.05, "mat": 50},
                   {"d": "24", "b": "C25/30", "bew": "20", "h": 2.15, "mat": 58}, {"d": "25", "b": "C30/37 WU", "bew": "24", "h": 2.3, "mat": 68},
                   {"d": "30", "b": "C30/37 WU", "bew": "30", "h": 2.45, "mat": 80}]},
    {"kurz": "Stahlbetondecke komplett, d = {d} cm, {b}",
     "lang": "Stahlbeton-Ortbetondecke als Komplettleistung: Deckenschalung mit Systemschalung einschließlich Unterstützung, "
             "Randabschalung, Bewehrung nach Statik (im Mittel {bew} kg/m²), Beton {b}, Oberfläche abgezogen. Abrechnung nach Fläche.",
     "einheit": "m²", "kg": "351", "gen": "B", "achsen": [HOEHE, EINBAU, MENGE, ORT],
     "varianten": [{"d": "18", "b": "C25/30", "bew": "16", "h": 1.35, "mat": 52}, {"d": "20", "b": "C25/30", "bew": "18", "h": 1.4, "mat": 57},
                   {"d": "22", "b": "C25/30", "bew": "20", "h": 1.45, "mat": 62}, {"d": "25", "b": "C30/37", "bew": "24", "h": 1.55, "mat": 71},
                   {"d": "30", "b": "C30/37", "bew": "30", "h": 1.7, "mat": 85}]},
    {"kurz": "Stahlbetonstütze komplett, {q} cm, Höhe bis {hh} m",
     "lang": "Stahlbetonstütze als Komplettleistung mit Systemschalung, Bewehrung nach Statik und Beton C30/37, Querschnitt {q} cm, "
             "Höhe bis {hh} m, Kanten gefast. Abrechnung je Stück.",
     "einheit": "St", "kg": "333", "gen": "B", "achsen": [[{}, {"k": "Sichtbeton SB 3", "t": "Sichtbeton SB 3 nach Merkblatt.", "fh": 1.3, "mat": 45, "gen": "C"}], ORT],
     "varianten": [{"q": "25 × 25", "hh": "3,0", "h": 6.5, "mat": 105}, {"q": "30 × 30", "hh": "3,0", "h": 7.2, "mat": 140}, {"q": "40 × 40", "hh": "3,0", "h": 8.5, "mat": 225},
                   {"q": "30 × 30", "hh": "4,5", "h": 10, "mat": 205}, {"q": "40 × 40", "hh": "4,5", "h": 12, "mat": 330}, {"q": "Ø 30", "hh": "3,0", "h": 6.0, "mat": 165}]},
    {"kurz": "Stahlbeton-Fertigteilstütze {q} cm, Länge bis {l} m, liefern und montieren",
     "lang": "Stahlbeton-Fertigteilstütze C35/45 nach Statik und Werkplanung, Querschnitt {q} cm, Länge bis {l} m, mit Konsolen nach Plan, "
             "liefern, mit Mobilkran versetzen, in Köcher- bzw. Hülsenfundament vergießen.",
     "einheit": "St", "kg": "333", "gen": "C", "achsen": [[{}, {"k": "mit Konsole", "t": "Mit ein bis zwei Konsolen.", "mat": 180}]],
     "varianten": [{"q": "30 × 30", "l": "4", "h": 3, "mat": 720, "geraet": 260}, {"q": "40 × 40", "l": "6", "h": 3.5, "mat": 1350, "geraet": 320},
                   {"q": "50 × 50", "l": "8", "h": 4, "mat": 2250, "geraet": 380}]},
    {"kurz": "Stahlbeton-Fertigteilbinder/-unterzug, Länge bis {l} m",
     "lang": "Stahlbeton- bzw. Spannbeton-Fertigteilbinder nach Statik und Werkplanung, Länge bis {l} m, liefern und mit Mobilkran auf Auflager "
             "montieren, Elastomerlager und Verguss einschließlich.",
     "einheit": "St", "kg": "351", "gen": "C",
     "varianten": [{"l": "8", "h": 4, "mat": 1850, "geraet": 380}, {"l": "12", "h": 5, "mat": 3300, "geraet": 520}, {"l": "18", "h": 6, "mat": 6100, "geraet": 780}]},
    {"kurz": "Lichtschacht Betonfertigteil {b} × {t} cm, mit Gitterrost",
     "lang": "Kellerlichtschacht aus Betonfertigteil, Breite {b} cm, Tiefe {t} cm, Höhe bis 1,0 m, an Kelleraußenwand dicht anschließen, "
             "mit verzinktem Gitterrost und Abhebesicherung, Entwässerung über Ablauf.",
     "einheit": "St", "kg": "339", "gen": "B", "achsen": [[{}, {"k": "druckwasserdicht", "t": "Druckwasserdichte Ausführung mit Flanschanschluss an WU-Wand.", "mat": 260, "h": 1.0}]],
     "varianten": [{"b": "100", "t": "40", "h": 2.5, "mat": 310}, {"b": "125", "t": "50", "h": 3.0, "mat": 420}, {"b": "150", "t": "70", "h": 3.5, "mat": 560}]},
    {"kurz": "Kelleraußentreppe Stahlbeton, {s} Steigungen, komplett",
     "lang": "Außentreppe zum Keller aus Stahlbeton C30/37 XF1 mit seitlichen Wangenwänden, einschließlich Schalung, Bewehrung, "
             "Podest mit Ablauf, Oberfläche besenstrich. Erdarbeiten gesondert.",
     "einheit": "St", "kg": "339", "gen": "C", "achsen": [ORT],
     "varianten": [{"s": "10–12", "h": 48, "mat": 2100}, {"s": "14–16", "h": 60, "mat": 2700}]},
    {"kurz": "Rampe Stahlbeton, Neigung bis {n} %, d = {d} cm, komplett",
     "lang": "Stahlbetonrampe (Tiefgarage bzw. Anlieferung) mit Schalung, Bewehrung und Beton C30/37 XD3/XF4, Dicke {d} cm, "
             "Neigung bis {n} %, Oberfläche besenrau, mit Ausrundungen. Abrechnung nach Fläche.",
     "einheit": "m²", "kg": "352", "gen": "C", "achsen": [ORT],
     "varianten": [{"n": "15", "d": "25", "h": 2.4, "mat": 110}, {"n": "15", "d": "30", "h": 2.6, "mat": 130}]},
    {"kurz": "Betonsockel/Fundamentsockel für Technik, bis {v} m³",
     "lang": "Sockel aus Stahlbeton C25/30 für technische Geräte (Wärmepumpe, Lüftungsgerät, Trafo), mit Schalung, Bewehrung, Einbauteilen "
             "und gefasten Kanten, Volumen bis {v} m³.",
     "einheit": "St", "kg": "322", "gen": "B", "achsen": [[{}, {"k": "schwingungsentkoppelt", "t": "Auf Elastomerlagern schwingungsentkoppelt.", "mat": 140, "h": 1.0}], ORT],
     "varianten": [{"v": "0,25", "h": 3.0, "mat": 90}, {"v": "0,5", "h": 4.5, "mat": 150}, {"v": "1,0", "h": 7.0, "mat": 270}]},
    {"kurz": "Faserbeton-Bodenplatte (Stahlfaser), d = {d} cm, komplett",
     "lang": "Industrieboden bzw. Bodenplatte aus Stahlfaserbeton C30/37 mit Fasergehalt nach Statik, Dicke {d} cm, auf Trennlage, "
             "Oberfläche flügelgeglättet, Schwind- und Scheinfugen geschnitten und vergossen. Abrechnung nach Fläche.",
     "einheit": "m²", "kg": "324", "gen": "B", "achsen": [[{}, {"k": "Hartstoff", "t": "Mit Hartstoffeinstreuung 4 kg/m².", "h": 0.1, "mat": 5}], MENGE],
     "varianten": [{"d": "15", "h": 0.45, "mat": 42}, {"d": "20", "h": 0.5, "mat": 55}, {"d": "25", "h": 0.55, "mat": 68}]},
    {"kurz": "Fertigteilgarage Beton, {g}",
     "lang": "Betonfertigteilgarage mit Boden, Wänden und Dach aus einem Stück, Schwingtor verzinkt, Dachentwässerung, auf bauseitigem "
             "Streifenfundament aufstellen, Anlieferung mit Spezialfahrzeug. Abmessung {g}.",
     "einheit": "St", "kg": "371", "gen": "C", "achsen": [[{}, {"k": "Sektionaltor elektrisch", "t": "Statt Schwingtor Sektionaltor mit Antrieb.", "mat": 1900, "h": 2}]],
     "varianten": [{"g": "Einzelgarage 3 × 6 m", "h": 6, "mat": 8900, "geraet": 650}, {"g": "Großraumgarage 3,5 × 7 m", "h": 7, "mat": 11800, "geraet": 750}]},
]})
LBS[0]["gruppen"].append({"name": "Stahlbetonarbeiten im Bestand", "positionen": [
    {"kurz": "Deckenöffnung in Stahlbetondecke herstellen, d bis {d} cm, bis {a} m²",
     "lang": "Öffnung in vorhandener Stahlbetondecke durch Kernbohren und Seilsägen herstellen, einschließlich Abstützung, "
             "Herausheben der Betonteile, Schutt zur Sammelstelle; Auswechslung nach Statik gesondert. Deckendicke bis {d} cm, Fläche bis {a} m².",
     "einheit": "St", "kg": "394", "lohn": "abbruch", "gen": "C", "achsen": [_BESTAND[1:] or [{}]],
     "varianten": [{"d": "20", "a": "0,5", "h": 6, "geraet": 380}, {"d": "20", "a": "2,0", "h": 12, "geraet": 820}, {"d": "25", "a": "4,0", "h": 18, "geraet": 1450},
                   {"d": "30", "a": "6,0", "h": 26, "geraet": 2100}]},
    {"kurz": "Deckenöffnung schließen, Stahlbeton d = {d} cm, bis {a} m²",
     "lang": "Vorhandene Deckenöffnung mit Stahlbeton C25/30 schließen: Schalung mit Unterstützung, Anschlussbewehrung einbohren "
             "und verkleben, Bewehrung nach Statik, Beton einbauen. Deckendicke {d} cm, Fläche bis {a} m².",
     "einheit": "St", "kg": "351", "gen": "C", "tags": ["altbau"],
     "varianten": [{"d": "16–20", "a": "1,0", "h": 9, "mat": 150}, {"d": "16–20", "a": "3,0", "h": 18, "mat": 380}, {"d": "20–25", "a": "6,0", "h": 30, "mat": 720}]},
    {"kurz": "Fundament unterfangen, abschnittsweise, Tiefe bis {t} m",
     "lang": "Bestehendes Fundament in Abschnitten bis 1,25 m Länge nach DIN 4123 unterfangen: Aushub von Hand, Beton C20/25, "
             "kraftschlüssiges Verpressen der Fuge mit Quellmörtel. Abrechnung nach Länge der Unterfangung.",
     "einheit": "m", "kg": "322", "gen": "C", "tags": ["altbau"], "achsen": [[{}, {"k": "Wanddicke über 50 cm", "t": "Wanddicke über 50 cm.", "fh": 1.35, "fm": 1.4}]],
     "varianten": [{"t": "1,0", "h": 9, "mat": 110}, {"t": "1,5", "h": 13, "mat": 160}, {"t": "2,0", "h": 18, "mat": 215}]},
    {"kurz": "Vorsatzschale Stahlbeton an Bestandswand, d = {d} cm",
     "lang": "Stahlbeton-Vorsatzschale an bestehender Wand zur Ertüchtigung: Untergrund aufrauen, Verbundanker bzw. Bewehrung einbohren, "
             "Bewehrung, einseitige Schalung, Beton C25/30. Abrechnung nach Fläche.",
     "einheit": "m²", "kg": "331", "gen": "C", "tags": ["altbau"], "achsen": [HOEHE],
     "varianten": [{"d": "10", "h": 3.2, "mat": 48}, {"d": "15", "h": 3.6, "mat": 62}, {"d": "20", "h": 4.0, "mat": 76}]},
    {"kurz": "Aufbeton im Verbund auf Bestandsdecke, d = {d} cm",
     "lang": "Verbundaufbeton auf vorhandener Stahlbetondecke zur Verstärkung: Untergrund kugelstrahlen, Haftbrücke, Verbundbewehrung "
             "nach Statik einbohren, Beton C30/37 einbauen und nachbehandeln.",
     "einheit": "m²", "kg": "351", "gen": "C", "tags": ["altbau"], "achsen": [KLEINFL, EINBAU],
     "varianten": [{"d": "5", "h": 0.8, "mat": 28}, {"d": "8", "h": 0.95, "mat": 36}, {"d": "10", "h": 1.05, "mat": 42}]},
    {"kurz": "Sturz/Unterzug Stahlbeton in Bestandswand einbauen, Länge bis {l} m",
     "lang": "Ortbetonsturz bzw. -unterzug in bestehendem Mauerwerk herstellen: abschnittsweises Stemmen, Abfangung mit Nadeln und Stützen, "
             "Schalung, Bewehrung, Beton C25/30, kraftschlüssiges Unterstopfen. Wanddicke bis 36,5 cm.",
     "einheit": "St", "kg": "331", "gen": "C", "tags": ["altbau"],
     "varianten": [{"l": "1,5", "h": 12, "mat": 140, "geraet": 60}, {"l": "2,5", "h": 18, "mat": 220, "geraet": 90}, {"l": "4,0", "h": 28, "mat": 380, "geraet": 140}]},
    {"kurz": "Kellerboden erneuern, Betonplatte d = {d} cm auf Bestand",
     "lang": "Neue Betonbodenplatte im Bestandskeller: Planum herrichten, kapillarbrechende Schicht, PE-Folie, Beton C20/25 mit "
             "Mattenbewehrung, Oberfläche abgerieben. Förderung von Hand bzw. mit Pumpe durch Kellerfenster.",
     "einheit": "m²", "kg": "324", "gen": "B", "tags": ["altbau"], "achsen": [EINBAU[:2], KLEINFL],
     "varianten": [{"d": "10", "h": 1.0, "mat": 28}, {"d": "12", "h": 1.1, "mat": 33}, {"d": "15", "h": 1.25, "mat": 40}]},
]})


# Raster Festigkeitsklasse × Bauteildicke (Stoff je m³ nach Güte, Zeitansatz nach Dicke/Bauteil)
_GUETE = {"C20/25": 132, "C25/30": 140, "C30/37": 150, "C35/45": 163, "C30/37 WU": 165, "C35/45 WU": 178}


def _raster(prefix, gueten, dicken, schluessel="d"):
    for g in LBS[0]["gruppen"]:
        for p in g["positionen"]:
            if p["kurz"].startswith(prefix):
                p["varianten"] = [{"b": b, schluessel: d, "h": h, "mat": _GUETE[b]} for b in gueten for d, h in dicken]


_raster("Wand Stahlbeton", ["C20/25", "C25/30", "C30/37", "C35/45", "C30/37 WU"],
        [("15–18", 1.20), ("20", 1.05), ("24–25", 0.92), ("30", 0.85), ("35–40", 0.78)])
_raster("Innenwand Stahlbeton", ["C20/25", "C25/30", "C30/37"], [("15–18", 1.20), ("20", 1.05), ("24–25", 0.92), ("30", 0.85)])
_raster("Decke Stahlbeton", ["C20/25", "C25/30", "C30/37", "C35/45"], [("16–18", 0.80), ("20–22", 0.74), ("24–26", 0.70), ("28–32", 0.66)])
_raster("Bodenplatte Stahlbeton", ["C20/25", "C25/30", "C30/37"], [("15–20", 0.70), ("20–25", 0.65), ("25–35", 0.60), ("über 35", 0.55)])
_raster("Bodenplatte WU-Beton", ["C30/37 WU", "C35/45 WU"], [("25–30", 0.65), ("30–40", 0.60), ("über 40", 0.55)])
_raster("Stütze Stahlbeton", ["C25/30", "C30/37", "C35/45"], [("25 × 25", 2.6), ("30 × 30", 2.2), ("40 × 40", 1.8), ("50 × 50", 1.5)], "q")
_raster("Fundament Stahlbeton", ["C20/25", "C25/30", "C30/37"], [("Streifenfundament", 0.75), ("Einzelfundament", 0.85)], "t")
for g in LBS[0]["gruppen"]:
    for p in g["positionen"]:
        if p["kurz"].startswith("Fundament Stahlbeton"):
            p["kurz"] = "Fundament Stahlbeton {b}, {t}"


# Expositionsklassen nur mit zulässiger Mindestfestigkeit (DIN 1045-2): C20/25 nur XC1, C25/30 ohne XD1/XF2
EXPO_C20 = [EXPO[0]]
EXPO_C25 = [x for x in EXPO if x["k"] != "XD1/XF2"]
# Schalung: Höhe steckt in der Variante; Schalhaut-Varianten nur bei Sichtbetonklasse
for _g in LBS[0]["gruppen"]:
    for _p in _g["positionen"]:
        if EXPO in (_p.get("achsen") or []):
            for _v in _p.get("varianten") or []:
                if _v.get("b") in ("C20/25", "C25/30"):
                    _v["achsen"] = [EXPO_C20 if a is EXPO and _v["b"] == "C20/25" else EXPO_C25 if a is EXPO else a for a in _p["achsen"]]
        if _p["kurz"].startswith("Schalung {t}"):
            for _v in _p["varianten"]:
                ax = []
                if _v["sb"] != "ohne Anforderung":
                    ax.append(SCHALHAUT)
                if not any(x in _v["t"] for x in ("bis 3,0", "über 3,0", "Fundamente", "Deckenränder", "Balkon")):
                    ax.append(HOEHE)
                _v["achsen"] = ax + [EINSATZ, ORT]
