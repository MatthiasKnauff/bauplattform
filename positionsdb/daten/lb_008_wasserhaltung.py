# LB 008 Wasserhaltung – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "008", "name": "Wasserhaltungsarbeiten", "atv": "DIN 18305", "lohn": "erdbau", "kg": "313",
    "gruppen": [
        {"name": "Offene Wasserhaltung", "positionen": [
            {"kurz": "Offene Wasserhaltung einrichten und räumen",
             "lang": "Offene Wasserhaltung mit Pumpensümpfen, Tauchpumpen, Schläuchen und Absetzbecken einrichten, "
                     "an die Vorflut bzw. den Kanal anschließen (Genehmigung durch den AG) und nach Gebrauch räumen.",
             "einheit": "psch", "h": 12, "mat": 150, "geraet": 650, "gen": "C"},
            {"kurz": "Pumpensumpf herstellen, Tiefe bis 1,5 m, mit Filterrohr",
             "lang": "Pumpensumpf in der Baugrubensohle mit gelochtem Betonrohr DN 500, Filterkies und Abdeckung "
                     "herstellen und nach Gebrauch verfüllen.",
             "einheit": "St", "h": 3, "mat": 85, "geraet": 40, "gen": "B"},
            {"kurz": "Tauchpumpe {q} betreiben",
             "lang": "Schmutzwasser-Tauchpumpe {q} einschließlich Energie, Überwachung und Wartung betreiben. "
                     "Abrechnung nach Betriebstagen (24 h).",
             "einheit": "Tag", "gen": "B",
             "varianten": [{"q": "bis 30 m³/h", "h": 0.3, "geraet": 32}, {"q": "bis 80 m³/h", "h": 0.4, "geraet": 55}]},
        ]},
        {"name": "Grundwasserabsenkung", "positionen": [
            {"kurz": "Grundwasserabsenkung mit Vakuumlanzen, einrichten und räumen",
             "lang": "Vakuum-Wellpointanlage mit Spüllanzen, Sammelleitung, Vakuumpumpe und Reserveaggregat "
                     "einrichten, Lanzen im Abstand nach Bemessung einspülen und nach Gebrauch ziehen und räumen. "
                     "Abrechnung nach Länge der Sammelleitung.",
             "einheit": "m", "h": 0.8, "mat": 6, "geraet": 48, "gen": "C"},
            {"kurz": "Wellpointanlage betreiben",
             "lang": "Wellpointanlage rund um die Uhr betreiben einschließlich Energie, Überwachung, "
                     "Messprotokoll und Rufbereitschaft. Abrechnung nach Betriebstagen.",
             "einheit": "Tag", "h": 1.0, "geraet": 140, "gen": "C"},
            {"kurz": "Brunnen für Grundwasserabsenkung DN {d}, Tiefe bis 10 m",
             "lang": "Filterbrunnen DN {d} mit Filterrohr, Filterkies und Tonsperre herstellen, Unterwasserpumpe "
                     "einbauen, nach Gebrauch rückbauen bzw. verfüllen.",
             "einheit": "St", "gen": "C",
             "varianten": [{"d": "150", "h": 10, "mat": 650, "geraet": 1800}, {"d": "300", "h": 16, "mat": 1100, "geraet": 3200}]},
            {"kurz": "Wassermengenmessung und Ableitung, Absetzbecken",
             "lang": "Absetzbecken mit Wasserzähler zur Mengenerfassung aufstellen, Wasser vorgereinigt ableiten, "
                     "wöchentliche Ablesung dokumentieren; Einleitgebühren trägt der AG.",
             "einheit": "Wo", "h": 1.0, "geraet": 120, "gen": "B"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Ausbau Runde 3 (Nacht 06.11.2026)
DAUER8 = [{"k": "", "t": ""}, {"k": "über 4 Wo", "t": "Betriebsdauer über 4 Wochen.", "fg": 0.9}, {"k": "über 12 Wo", "t": "Betriebsdauer über 12 Wochen.", "fg": 0.8}]
STROM = [{"k": "Netzstrom", "t": "Betrieb mit Baustrom, Stromkosten gesondert."}, {"k": "Aggregat", "t": "Betrieb mit Stromaggregat einschließlich Kraftstoff.", "geraet": 25, "gen": "C"}]
FOERD = [{"k": "bis 10 m³/h", "t": "Fördermenge bis 10 m³/h.", "fg": 0.8}, {"k": "bis 30 m³/h", "t": "Fördermenge über 10 bis 30 m³/h."},
         {"k": "bis 80 m³/h", "t": "Fördermenge über 30 bis 80 m³/h.", "fg": 1.5, "gen": "C"}]

LBS[0]["gruppen"] += [
    {"name": "Offene Wasserhaltung (Ergänzung)", "positionen": [
        {"kurz": "Pumpensumpf {art}",
         "lang": "Pumpensumpf in der Baugrubensohle herstellen ({art}), mit Filterkies umgeben, betreiben und nach Ende verfüllen.",
         "einheit": "St", "kg": "313", "gen": "A",
         "varianten": [{"art": "Betonring DN 500, Tiefe 1 m", "h": 2.5, "mat": 70, "geraet": 35}, {"art": "Betonring DN 1000, Tiefe 1,5 m", "h": 4, "mat": 160, "geraet": 60},
                       {"art": "Kunststoff-Filterrohr DN 300", "h": 1.5, "mat": 55, "geraet": 25}]},
        {"kurz": "Tauchpumpe {art}, Betrieb je Tag",
         "lang": "Schmutzwasser-Tauchpumpe ({art}) einschließlich Schläuchen und Schwimmerschaltung bereitstellen, betreiben und "
                 "überwachen. Abrechnung je Betriebstag.",
         "einheit": "Tag", "kg": "313", "gen": "B", "achsen": [FOERD, STROM, DAUER8],
         "varianten": [{"art": "Schmutzwasser", "h": 0.3, "geraet": 22}, {"art": "Drainage/Klarwasser", "h": 0.25, "geraet": 16}, {"art": "Dickstoff/Schlamm", "h": 0.4, "geraet": 32}]},
        {"kurz": "Absetzbecken/Sedimentation {art}",
         "lang": "Absetzbecken ({art}) vor der Einleitung aufstellen, betreiben, Schlamm entsorgen und abbauen. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "313", "gen": "B", "achsen": [DAUER8],
         "varianten": [{"art": "Container 10 m³", "h": 1, "geraet": 160}, {"art": "Lamellenklärer 30 m³/h", "h": 2, "geraet": 480}]},
        {"kurz": "Neutralisation Baugrubenwasser, Vorhaltung",
         "lang": "Neutralisationsanlage (CO2) für zementhaltiges Baugrubenwasser einschließlich pH-Überwachung bereitstellen und betreiben. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "313", "gen": "C", "achsen": [DAUER8], "h": 2, "geraet": 520},
        {"kurz": "Ableitung Druckleitung {art}",
         "lang": "Ableitung des geförderten Wassers über Druckleitung ({art}) zur Einleitstelle verlegen, vorhalten und rückbauen. Abrechnung nach Länge.",
         "einheit": "m", "kg": "313", "gen": "A",
         "varianten": [{"art": "Feuerwehrschlauch C/B", "h": 0.03, "geraet": 1.5}, {"art": "PE-Rohr DN 100", "h": 0.08, "mat": 3, "geraet": 1.5},
                       {"art": "PE-Rohr DN 150 mit Überfahrschutz", "h": 0.15, "mat": 6, "geraet": 3}]},
        {"kurz": "Einleitgebühr/Abwassergebühr {art}",
         "lang": "Gebühren für die Einleitung des Baugrubenwassers ({art}) nach Bescheid der Behörde bzw. des Netzbetreibers, durchlaufender Posten.",
         "einheit": "m³", "kg": "313", "gen": "C", "h": 0,
         "varianten": [{"art": "Regen- bzw. Mischwasserkanal", "geraet": 1.4}, {"art": "Schmutzwasserkanal", "geraet": 2.6}, {"art": "Gewässer (Erlaubnis)", "geraet": 0.3}]},
    ]},
    {"name": "Grundwasserabsenkung (Ergänzung)", "positionen": [
        {"kurz": "Brunnen herstellen {art}, Tiefe bis {t} m",
         "lang": "Absenkbrunnen ({art}) bohren, Filter- und Vollrohre einbauen, Filterkies, Tondichtung, entsanden und klarpumpen; "
                 "Tiefe bis {t} m. Rückbau gesondert.",
         "einheit": "St", "kg": "313", "gen": "C", "achsen": [[{"k": "", "t": ""}, {"k": "Fels", "t": "Bohrung in Fels.", "fh": 1.4, "fg": 1.5}]],
         "varianten": [{"art": "Bohrbrunnen DN 300", "t": "8", "h": 10, "mat": 520, "geraet": 1300}, {"art": "Bohrbrunnen DN 300", "t": "15", "h": 16, "mat": 900, "geraet": 2200},
                       {"art": "Tiefbrunnen DN 400", "t": "20", "h": 22, "mat": 1500, "geraet": 3400}, {"art": "Tiefbrunnen DN 400", "t": "30", "h": 30, "mat": 2200, "geraet": 4800}]},
        {"kurz": "Brunnenpumpe {art}, Betrieb je Tag",
         "lang": "Unterwasserpumpe ({art}) mit Steuerung, Wasserzähler und Niveauüberwachung im Brunnen betreiben. Abrechnung je Brunnen und Betriebstag.",
         "einheit": "Tag", "kg": "313", "gen": "B", "achsen": [STROM, DAUER8],
         "varianten": [{"art": "bis 10 m³/h", "h": 0.15, "geraet": 14}, {"art": "bis 30 m³/h", "h": 0.2, "geraet": 22}, {"art": "bis 60 m³/h", "h": 0.25, "geraet": 34}]},
        {"kurz": "Vakuumlanzen {art}",
         "lang": "Vakuum-Spülfilterlanzen ({art}) einspülen, an Sammelleitung und Vakuumpumpe anschließen, nach Ende ziehen. Abrechnung je Lanze.",
         "einheit": "St", "kg": "313", "gen": "B",
         "varianten": [{"art": "Länge bis 6 m, Abstand 1–1,5 m", "h": 0.6, "mat": 12, "geraet": 28}, {"art": "Länge bis 8 m, Abstand 1–1,5 m", "h": 0.8, "mat": 15, "geraet": 35}]},
        {"kurz": "Vakuum-Absenkanlage Betrieb je Tag, {art}",
         "lang": "Vakuumpumpenaggregat mit Sammelleitungen ({art}) betreiben, überwachen und dokumentieren. Abrechnung je Betriebstag.",
         "einheit": "Tag", "kg": "313", "gen": "B", "achsen": [STROM, DAUER8],
         "varianten": [{"art": "bis 50 Lanzen", "h": 0.5, "geraet": 75}, {"art": "bis 150 Lanzen", "h": 0.8, "geraet": 140}]},
        {"kurz": "Brunnen rückbauen und verfüllen, Tiefe bis {t} m",
         "lang": "Brunnen nach Ende der Wasserhaltung ziehen bzw. mit Dämmer- oder Tonsuspension fachgerecht verfüllen und dokumentieren.",
         "einheit": "St", "kg": "313", "gen": "B",
         "varianten": [{"t": "15", "h": 4, "mat": 120, "geraet": 260}, {"t": "30", "h": 7, "mat": 260, "geraet": 480}]},
        {"kurz": "Grundwasser-Messstelle {art}",
         "lang": "Grundwassermessstelle (Pegel) DN 50: {art}.",
         "einheit": "St", "kg": "313", "gen": "B",
         "varianten": [{"art": "herstellen, Tiefe bis 10 m, einschließlich Einmessung", "h": 4, "mat": 150, "geraet": 520}, {"art": "Datenlogger mit Fernübertragung betreiben, Abrechnung je Monat", "h": 0.5, "geraet": 85, "einheit": "Mon"}]},
        {"kurz": "Wasserrechtliche Erlaubnis/Monitoring, {art}",
         "lang": "{art} für die Grundwasserabsenkung einschließlich Probenahme und Bericht an die Behörde.",
         "einheit": "psch", "kg": "313", "gen": "C", "h": 0,
         "varianten": [{"art": "Antragsunterlagen erstellen", "geraet": 1800}, {"art": "Wasseranalyse vor Einleitung", "geraet": 420}, {"art": "Monitoring je Monat", "geraet": 650, "einheit": "Mon"}]},
        {"kurz": "Infiltration/Rückführung Grundwasser, {art}",
         "lang": "Rückführung des geförderten Grundwassers über {art} herstellen und betreiben. Abrechnung je Stück.",
         "einheit": "St", "kg": "313", "gen": "C",
         "varianten": [{"art": "Schluckbrunnen DN 300, Tiefe bis 15 m", "h": 16, "mat": 900, "geraet": 2200}, {"art": "Versickerungsrigole 10 m", "h": 12, "mat": 650, "geraet": 380}]},
    ]},
]
