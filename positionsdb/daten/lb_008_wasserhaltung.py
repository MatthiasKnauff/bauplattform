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
