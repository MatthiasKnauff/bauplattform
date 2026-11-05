# LB 000 Baustelleneinrichtung – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "000", "name": "Baustelleneinrichtung", "atv": "DIN 18299", "lohn": "baustelle", "kg": "391",
    "gruppen": [
        {"name": "Einrichten und Räumen", "positionen": [
            {"kurz": "Baustelle einrichten und räumen, Bauvolumen bis {v}",
             "lang": "Baustelle für die eigenen Leistungen einrichten, alle Geräte, Unterkünfte und Lagerflächen "
                     "anliefern, aufstellen und nach Fertigstellung wieder räumen, Flächen in den ursprünglichen "
                     "Zustand versetzen. Vorhalten wird gesondert vergütet. Bauvolumen der eigenen Leistung bis {v}.",
             "einheit": "psch", "gen": "C",
             "varianten": [{"v": "50.000 €", "h": 24, "mat": 150, "geraet": 650},
                           {"v": "250.000 €", "h": 60, "mat": 400, "geraet": 2200},
                           {"v": "1.000.000 €", "h": 140, "mat": 900, "geraet": 6500}]},
            {"kurz": "Baustelleneinrichtung vorhalten, Bauvolumen bis {v}",
             "lang": "Die eingerichtete Baustelle einschließlich Unterkünften, Geräten, Lagerflächen und Sicherungen "
                     "betriebsbereit vorhalten und unterhalten. Abrechnung je angefangene Woche der Vorhaltezeit. "
                     "Bauvolumen der eigenen Leistung bis {v}.",
             "einheit": "Wo", "gen": "C",
             "varianten": [{"v": "50.000 €", "h": 2, "geraet": 140}, {"v": "250.000 €", "h": 4, "geraet": 420},
                           {"v": "1.000.000 €", "h": 8, "geraet": 1100}]},
            {"kurz": "Baustellenschild {g} m², liefern, aufstellen, vorhalten, entfernen",
             "lang": "Bauschild als Aluverbundplatte, Größe ca. {g} m², Druck nach Vorlage des Auftraggebers, auf "
                     "Holz- oder Stahlunterkonstruktion standsicher aufstellen, für die Bauzeit vorhalten und danach "
                     "entfernen.",
             "einheit": "St", "gen": "B",
             "varianten": [{"g": "2", "h": 3, "mat": 320, "geraet": 60}, {"g": "6", "h": 5, "mat": 780, "geraet": 120}]},
        ]},
        {"name": "Absperrungen und Zufahrten", "positionen": [
            {"kurz": "Mobiler Bauzaun, Höhe 2,0 m, auf- und abbauen",
             "lang": "Mobilen Bauzaun aus verzinkten Gitterelementen 3,5 × 2,0 m mit Betonfüßen und Schellen "
                     "liefern, standsicher aufstellen, bei Bedarf mit Windsicherung, und nach Bauende abbauen. "
                     "Vorhaltung gesondert. Abrechnung nach Länge.",
             "einheit": "m", "h": 0.12, "geraet": 3.5, "gen": "A"},
            {"kurz": "Mobilen Bauzaun vorhalten",
             "lang": "Mobilen Bauzaun wie vor vorhalten, kontrollieren und instand halten. Abrechnung je Meter und Woche.",
             "einheit": "mWo", "h": 0.005, "geraet": 0.35, "gen": "A", "hinweis": "Einheit: Meter × Wochen"},
            {"kurz": "Bauzauntor, Breite {b} m, liefern, vorhalten, entfernen",
             "lang": "Tor im mobilen Bauzaun als Dreh- oder Schiebetor, Breite {b} m, mit Verschlussmöglichkeit, für "
                     "die Bauzeit vorhalten und danach entfernen.",
             "einheit": "St", "gen": "B",
             "varianten": [{"b": "3,5", "h": 1.0, "geraet": 140}, {"b": "7,0", "h": 2.0, "geraet": 260}]},
            {"kurz": "Sichtschutz-/Werbeplane am Bauzaun",
             "lang": "Sichtschutzplane aus PE-Gewebe am Bauzaun befestigen, winddurchlässig, für die Bauzeit "
                     "vorhalten, danach entfernen. Abrechnung nach Länge.",
             "einheit": "m", "h": 0.05, "mat": 4.5, "gen": "B"},
            {"kurz": "Baustraße Schotter, d = {d} cm, herstellen und zurückbauen",
             "lang": "Provisorische Baustraße bzw. Lagerfläche auf Geotextil aus Recyclingschotter 0/45 herstellen, "
                     "Dicke {d} cm, verdichtet; nach Bauende vollständig zurückbauen und abfahren.",
             "einheit": "m²", "gen": "B",
             "varianten": [{"d": "20", "h": 0.08, "mat": 6, "geraet": 4}, {"d": "30", "h": 0.10, "mat": 9, "geraet": 5}]},
            {"kurz": "Lastverteilungsplatten (Baggermatratzen) vorhalten",
             "lang": "Lastverteilungsplatten aus Kunststoff oder Stahl als befahrbare Abdeckung empfindlicher Flächen "
                     "verlegen, vorhalten und entfernen. Abrechnung je m² und Woche.",
             "einheit": "m²Wo", "h": 0.02, "geraet": 1.6, "gen": "B"},
            {"kurz": "Verkehrssicherung Gehweg, Absperrschranken mit Beleuchtung",
             "lang": "Verkehrssicherung nach verkehrsrechtlicher Anordnung mit Absperrschranken, Leitbaken und "
                     "Warnleuchten aufstellen, vorhalten und täglich kontrollieren; Antrag gesondert. "
                     "Abrechnung je Meter und Woche.",
             "einheit": "mWo", "h": 0.02, "geraet": 1.4, "gen": "C"},
        ]},
        {"name": "Unterkünfte und Sanitär", "positionen": [
            {"kurz": "{t}, liefern, aufstellen, abbauen",
             "lang": "{t} in Standardausführung mit Beleuchtung, Heizung und Steckdosen liefern, mit Kran oder "
                     "Lkw aufstellen, an Baustrom anschließen und nach Bauende abbauen. Vorhaltung gesondert.",
             "einheit": "St", "gen": "B",
             "varianten": [{"t": "Bürocontainer 20 Fuß", "h": 3, "geraet": 480},
                           {"t": "Mannschaftscontainer 20 Fuß", "h": 3, "geraet": 480},
                           {"t": "Materialcontainer 20 Fuß", "h": 2, "geraet": 380},
                           {"t": "Sanitärcontainer mit WC und Waschbecken", "h": 5, "geraet": 650}]},
            {"kurz": "{t} vorhalten",
             "lang": "{t} betriebsbereit vorhalten einschließlich Reinigung nach Bedarf. Abrechnung je Woche.",
             "einheit": "Wo", "gen": "B",
             "varianten": [{"t": "Bürocontainer 20 Fuß", "h": 0.2, "geraet": 75},
                           {"t": "Mannschaftscontainer 20 Fuß", "h": 0.2, "geraet": 70},
                           {"t": "Materialcontainer 20 Fuß", "h": 0, "geraet": 32},
                           {"t": "Sanitärcontainer", "h": 0.5, "geraet": 140}]},
            {"kurz": "Mobiltoilette (Chemie-WC) mit wöchentlicher Reinigung",
             "lang": "Mobile Toilettenkabine mit Handwaschmöglichkeit aufstellen, wöchentlich reinigen und "
                     "entleeren, nach Bauende abholen. Abrechnung je Woche einschließlich Service.",
             "einheit": "Wo", "h": 0, "geraet": 38, "gen": "A"},
        ]},
        {"name": "Baustrom, Bauwasser, Beleuchtung", "positionen": [
            {"kurz": "Baustromanschluss mit Baustromverteiler {a} A",
             "lang": "Baustromverteiler nach DIN VDE 0100-704 mit Zähler, FI-Schutzschaltern und Steckdosen, "
                     "Anschlusswert {a} A, an den vom Netzbetreiber bereitgestellten Anschlusspunkt anschließen, "
                     "Zuleitung bis 30 m, vorhalten und nach Bauende entfernen. Netzbetreiberkosten gesondert.",
             "einheit": "St", "gen": "B", "lohn": "elektro",
             "varianten": [{"a": "63", "h": 6, "mat": 120, "geraet": 600}, {"a": "125", "h": 9, "mat": 220, "geraet": 1050}]},
            {"kurz": "Unterverteiler Baustrom, liefern, vorhalten, entfernen",
             "lang": "Baustrom-Unterverteiler mit Steckdosen 230/400 V und FI-Schutz an Arbeitsstellen aufstellen, "
                     "verkabeln, vorhalten und entfernen. Je Stück für die gesamte Bauzeit.",
             "einheit": "St", "h": 2.5, "geraet": 320, "gen": "B", "lohn": "elektro"},
            {"kurz": "Bauwasseranschluss mit Standrohr/Zähler und Zapfstellen",
             "lang": "Bauwasserversorgung vom bereitgestellten Anschluss mit Wasserzähler, frostgeschützter Leitung "
                     "bis 30 m und zwei Zapfstellen herstellen, vorhalten und zurückbauen. Gebühren des Versorgers gesondert.",
             "einheit": "St", "h": 6, "mat": 180, "geraet": 350, "gen": "B", "lohn": "sanitaer"},
            {"kurz": "Baustellenbeleuchtung Treppenhaus/Flure",
             "lang": "Temporäre Beleuchtung in Treppenhäusern und Fluren mit Lichterkette bzw. LED-Leuchten "
                     "(mind. 20 lx), installieren, vorhalten und entfernen. Abrechnung je Geschoss für die Bauzeit.",
             "einheit": "St", "h": 3, "mat": 60, "geraet": 140, "gen": "B", "lohn": "elektro",
             "hinweis": "Einheit: je Geschoss"},
        ]},
        {"name": "Hebezeuge und Geräte", "positionen": [
            {"kurz": "Turmdrehkran {t}, An- und Abtransport, Auf- und Abbau",
             "lang": "Turmdrehkran {t} einschließlich Fundament bzw. Ballast, Transport, Montage, Abnahme durch "
                     "Sachkundigen und Demontage. Vorhaltung und Kranführer gesondert.",
             "einheit": "St", "gen": "C",
             "varianten": [{"t": "Schnellmontagekran, Ausladung bis 35 m", "h": 16, "geraet": 4200},
                           {"t": "Obendreher, Ausladung bis 50 m", "h": 40, "geraet": 16500}]},
            {"kurz": "Turmdrehkran {t} vorhalten",
             "lang": "Turmdrehkran {t} betriebsbereit vorhalten einschließlich Wartung, Prüfung und Energiekosten, "
                     "ohne Kranführer. Abrechnung je Woche.",
             "einheit": "Wo", "gen": "C",
             "varianten": [{"t": "Schnellmontagekran, Ausladung bis 35 m", "h": 0, "geraet": 850},
                           {"t": "Obendreher, Ausladung bis 50 m", "h": 0, "geraet": 1900}]},
            {"kurz": "Autokran bis {t} t mit Bediener",
             "lang": "Autokran Tragfähigkeit bis {t} t einschließlich Fahrer, An- und Abfahrt, für Hubarbeiten "
                     "nach Anweisung. Abrechnung nach Einsatzstunden.",
             "einheit": "h", "gen": "C", "h": 0,
             "varianten": [{"t": "40", "geraet": 175}, {"t": "100", "geraet": 290}]},
            {"kurz": "Schuttrutsche, Länge bis {l} m, vorhalten",
             "lang": "Schuttrutsche aus Kunststoffelementen mit Einfülltrichter am Gerüst befestigen, über "
                     "Container führen, für die Bauzeit vorhalten und abbauen.",
             "einheit": "St", "gen": "B",
             "varianten": [{"l": "10", "h": 3, "geraet": 260}, {"l": "20", "h": 5, "geraet": 420}]},
            {"kurz": "{v} für Baumischabfall stellen (ohne Entsorgung)",
             "lang": "{v} stellen und nach Füllung abholen; Entsorgungsgebühren werden nach "
                     "LB 087 gesondert vergütet. Je Stellung.",
             "einheit": "St", "h": 0, "gen": "B",
             "varianten": [{"v": "Absetzcontainer 7 m³", "geraet": 140}, {"v": "Absetzcontainer 10 m³", "geraet": 165}, {"v": "Abrollcontainer 20 m³", "geraet": 240}]},
        ]},
        {"name": "Sicherheit und Schutz", "positionen": [
            {"kurz": "Geländer als Absturzsicherung, Seitenschutz an Deckenrändern",
             "lang": "Seitenschutz nach DIN EN 13374 Klasse A aus Schutzgeländerpfosten und Bordbrett an "
                     "Deckenrändern und Öffnungen montieren, vorhalten und demontieren. Abrechnung nach Länge.",
             "einheit": "m", "h": 0.25, "geraet": 6, "gen": "A"},
            {"kurz": "Deckenöffnung abdecken, bis {a} m², durchtrittsicher",
             "lang": "Öffnungen in Decken mit tragfähigen, gegen Verschieben gesicherten Bohlen- oder "
                     "Plattenabdeckungen durchtrittsicher abdecken und kennzeichnen, vorhalten, entfernen.",
             "einheit": "St", "gen": "A",
             "varianten": [{"a": "1", "h": 0.5, "mat": 12}, {"a": "4", "h": 1.2, "mat": 35}]},
            {"kurz": "Schutzabdeckung von Bauteilen mit Folie und Platten",
             "lang": "Fertige Bauteile (Böden, Treppen, Fensterbänke) mit Schutzvlies bzw. Folie und darüber "
                     "Hartfaser- oder Wellplatten abdecken, vorhalten und rückstandsfrei entfernen.",
             "einheit": "m²", "h": 0.10, "mat": 3.8, "gen": "B"},
            {"kurz": "Staubschutzwand mit Tür, Folie auf Teleskopstützen",
             "lang": "Staubschutzwand aus reißfester Folie auf Teleskopstützen bis 3,0 m Raumhöhe mit "
                     "Reißverschlusstür herstellen, vorhalten und entfernen. Abrechnung nach Wandfläche.",
             "einheit": "m²", "h": 0.12, "mat": 2.5, "geraet": 1.5, "gen": "B", "tags": ["altbau"]},
            {"kurz": "Baustellenbewachung, Wachdienst",
             "lang": "Bewachung der Baustelle durch zugelassenes Sicherheitsunternehmen nach Einsatzplan des "
                     "Auftraggebers. Abrechnung nach Wachstunden.",
             "einheit": "h", "h": 0, "geraet": 33, "gen": "B"},
        ]},
    ],
}]
