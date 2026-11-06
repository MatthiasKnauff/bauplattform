# LB 091 Stundenlohnarbeiten – Verrechnungssätze je Gewerk und Qualifikation, Gerätestunden (Preisstand 11/2026)
# Grundlage: Verrechnungslohn je Gewerk aus gen.py (h = 1 je Stunde), Qualifikation über Faktor, Zeitzuschläge additiv.

GEWERKE = [
    ("baustelle", "Baustelleneinrichtung", "391"), ("geruest", "Gerüstbau", "392"), ("erdbau", "Erdbau", "311"), ("kanal", "Kanalbau", "411"),
    ("rohbau", "Maurer/Betonbauer", "399"), ("naturstein", "Steinmetz", "399"), ("zimmerer", "Zimmerer", "399"), ("stahlbau", "Stahlbauer", "399"),
    ("abdichtung", "Abdichter", "399"), ("dach", "Dachdecker", "369"), ("klempner", "Klempner", "369"), ("putz", "Stuckateur/Putzer", "399"),
    ("fliesen", "Fliesenleger", "399"), ("estrich", "Estrichleger", "399"), ("fenster", "Fensterbauer", "339"), ("tischler", "Tischler", "399"),
    ("parkett", "Parkettleger", "399"), ("rollladen", "Rollladenbauer", "339"), ("metallbau", "Metallbauer", "399"), ("glas", "Glaser", "399"),
    ("reinigung", "Gebäudereiniger", "397"), ("maler", "Maler/Lackierer", "399"), ("boden", "Bodenleger", "399"), ("fassade", "Fassadenbauer", "339"),
    ("trockenbau", "Trockenbauer", "399"), ("heizung", "Heizungsbauer", "429"), ("sanitaer", "Installateur Sanitär", "419"),
    ("daemmtga", "Isolierer (techn. Dämmung)", "499"), ("elektro", "Elektroinstallateur", "449"), ("msr", "MSR-/GA-Techniker", "489"),
    ("lueftung", "Lüftungsbauer", "439"), ("aufzug", "Aufzugsmonteur", "469"), ("aussen", "Garten- und Landschaftsbauer", "599"),
    ("abbruch", "Abbrucharbeiter", "394"), ("brandschutz", "Brandschutzmonteur", "499"),
]

QUALI = [{"k": "Facharbeiter/Geselle", "t": "Facharbeiter bzw. Geselle."},
         {"k": "Helfer/Werker", "t": "Helfer bzw. Werker (angelernt).", "fh": 0.80},
         {"k": "Vorarbeiter", "t": "Vorarbeiter bzw. Spezialfacharbeiter.", "fh": 1.12},
         {"k": "Meister/Techniker", "t": "Meister, Techniker bzw. Bauleiter des Auftragnehmers, nur auf ausdrückliche Anordnung.", "fh": 1.35},
         {"k": "Auszubildender", "t": "Auszubildender (ab 2. Lehrjahr), nur zusammen mit einem Facharbeiter.", "fh": 0.50}]
ZEIT = [{"k": "Normalarbeitszeit", "t": "Innerhalb der tariflichen Normalarbeitszeit."},
        {"k": "Überstunde", "t": "Angeordnete Überstunde, Zuschlag 25 % auf den Lohnanteil.", "fh": 1.25},
        {"k": "Nachtarbeit", "t": "Angeordnete Nachtarbeit (20–6 Uhr), Zuschlag 25 %.", "fh": 1.25},
        {"k": "Samstag", "t": "Angeordnete Arbeit am Samstag, Zuschlag 25 %.", "fh": 1.25},
        {"k": "Sonn-/Feiertag", "t": "Angeordnete Arbeit an Sonn- oder Feiertagen, Zuschlag 100 %.", "fh": 2.0, "gen": "B"}]

GERAETE = [
    ("Minibagger bis 3 t mit Fahrer", 95, "311"), ("Mobilbagger 14–18 t mit Fahrer", 165, "311"), ("Radlader 1,5 m³ mit Fahrer", 120, "311"),
    ("Kettendumper 1,5 t", 28, "311"), ("Rüttelplatte 400 kg", 14, "311"), ("Lkw 3-Achser Kipper mit Fahrer", 105, "311"),
    ("Lkw mit Ladekran mit Fahrer", 125, "391"), ("Autokran 40 t mit Fahrer", 210, "391"), ("Hubarbeitsbühne Gelenk 12 m", 45, "392"),
    ("Hubarbeitsbühne Teleskop 20 m", 75, "392"), ("Scherenbühne 10 m", 32, "392"), ("Teleskopstapler 4 t mit Fahrer", 95, "391"),
    ("Kernbohrgerät bis Ø 250 mm", 22, "394"), ("Wandsäge hydraulisch", 55, "394"), ("Stemmhammer 10 kg", 8, "394"), ("Abbruchhammer 25 kg", 12, "394"),
    ("Industriestaubsauger Klasse H", 9, "397"), ("Bautrockner Kondens", 6, "397"), ("Heizgerät Öl/Diesel 30 kW", 9, "397"),
    ("Kompressor 5 m³/min", 18, "399"), ("Hochdruckreiniger heiß", 12, "397"), ("Schmutzwasserpumpe bis 30 m³/h", 6, "313"),
    ("Stromaggregat 20 kVA", 16, "391"), ("Betonmischer 350 l", 7, "399"), ("Estrichpumpe/Mischpumpe", 38, "399"),
    ("Spritzgerät Airless", 9, "399"), ("Schleifmaschine Boden (Einscheibe)", 14, "399"), ("Rohrkamera/Kanal-TV mit Bediener", 110, "411"),
    ("Lkw 7,5 t Pritsche mit Fahrer", 75, "391"), ("Bauaufzug/Schrägaufzug", 15, "391"),
]
GDAUER = [{"k": "je Betriebsstunde", "t": "Abrechnung je Betriebsstunde, mindestens 4 h je Einsatz."},
          {"k": "Tagessatz (8 h)", "t": "Abrechnung als Tagessatz für 8 Betriebsstunden.", "fg": 7.0, "einheit": "Tag"}]

LBS = [{
    "nr": "091", "name": "Stundenlohnarbeiten", "atv": "VOB/B § 15", "lohn": "rohbau",
    "gruppen": [
        {"name": f"Stundenlohn {name}", "positionen": [
            {"kurz": f"Stundenlohnarbeit {name}",
             "lang": f"Stundenlohnarbeiten im Gewerk {name}, nur auf schriftliche Anordnung der Bauleitung des Auftraggebers. Verrechnungssatz "
                     "einschließlich Lohn, lohngebundener Kosten, Werkzeug, Kleingeräte, Gemeinkosten, Wagnis und Gewinn; Stoffe und Großgeräte "
                     "werden gesondert vergütet. Stundenlohnzettel sind arbeitstäglich zur Anerkennung vorzulegen.",
             "einheit": "h", "kg": kg, "lohn": g, "h": 1.0, "mat": 0, "gen": "A", "achsen": [QUALI, ZEIT],
             "hinweis": "Eventualposition; Abrechnung nach anerkannten Stundenlohnzetteln (VOB/B § 15 Abs. 3)."},
        ]} for g, name, kg in GEWERKE
    ] + [
        {"name": "Gerätestunden", "positionen": [
            {"kurz": f"Gerätevorhaltung {gname}",
             "lang": f"Vorhalten und Betreiben von {gname} für Stundenlohnarbeiten auf Anordnung, einschließlich Betriebsstoffe, Wartung und "
                     "An-/Abtransport anteilig; Bedienpersonal nur, soweit in der Bezeichnung genannt.",
             "einheit": "h", "kg": gkg, "lohn": "baustelle", "h": 0, "geraet": satz / 1.12, "gen": "B", "achsen": [GDAUER]}
            for gname, satz, gkg in GERAETE]},
        {"name": "Stoffe und Zuschläge zu Stundenlohnarbeiten", "positionen": [
            {"kurz": "Stoffe zu Stundenlohnarbeiten, Zuschlag {z}, je 100 € Einkauf",
             "lang": "Vergütung von Stoffen für Stundenlohnarbeiten nach nachgewiesenem Einkaufspreis (netto) zuzüglich Zuschlag für Gemeinkosten, "
                     "Wagnis und Gewinn {z}. Abrechnungseinheit: je 100 € nachgewiesener Einkaufswert (Menge = Einkaufswert / 100 €).",
             "einheit": "St", "hinweis": "Einheit St = je 100 € Einkaufswert", "kg": "399", "gen": "A",
             "varianten": [{"z": "10 %", "h": 0, "mat": 98.2}, {"z": "15 %", "h": 0, "mat": 102.7}, {"z": "20 %", "h": 0, "mat": 107.1}]},
            {"kurz": "Anfahrt Kundendienst/Kleinauftrag, {e}",
             "lang": "Anfahrtspauschale für Stundenlohn- bzw. Kleinaufträge einschließlich Fahrzeug und Fahrzeit, Entfernung {e}.",
             "einheit": "St", "kg": "399", "gen": "B", "achsen": [[{"k": g_[1], "lohn": g_[0]} for g_ in GEWERKE[:]]],
             "varianten": [{"e": "bis 15 km", "h": 0.5, "mat": 12}, {"e": "bis 30 km", "h": 0.8, "mat": 22}, {"e": "bis 50 km", "h": 1.2, "mat": 35}]},
        ]},
    ],
}]
