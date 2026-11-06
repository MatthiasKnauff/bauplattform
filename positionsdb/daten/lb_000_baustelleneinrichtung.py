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
             "einheit": "mWo", "h": 0.002, "geraet": 0.2, "gen": "A", "hinweis": "Einheit: Meter × Wochen"},
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
             "varianten": [{"t": "Bürocontainer 20 Fuß", "h": 0.1, "geraet": 52},
                           {"t": "Mannschaftscontainer 20 Fuß", "h": 0.1, "geraet": 49},
                           {"t": "Materialcontainer 20 Fuß", "h": 0, "geraet": 32},
                           {"t": "Sanitärcontainer", "h": 0.3, "geraet": 105}]},
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

# ---------------------------------------------------------------- Ausbau Runde 3 (Nacht 06.11.2026)
DAUER = [{"k": "", "t": ""}, {"k": "kurzfristig", "t": "Vorhaltung kurzfristig (unter 4 Wochen Gesamtdauer), Mindestmiete eingerechnet.", "fg": 1.25, "gen": "B"},
         {"k": "langfristig", "t": "Vorhaltung langfristig (über 26 Wochen Gesamtdauer).", "fg": 0.85}]
ZUG = [{"k": "", "t": ""}, {"k": "eingeschr. Zufahrt", "t": "Eingeschränkte Zufahrt bzw. Innenstadtlage, Anlieferung mit kleinerem Fahrzeug oder Umsetzen.", "fh": 1.2, "fg": 1.15, "gen": "B"}]
FLAE = [{"k": "", "t": ""}, {"k": "bis 100 m²", "t": "Gesamtfläche bis 100 m².", "fh": 1.3, "fm": 1.1, "fg": 1.2, "gen": "B"}]
RUECK = [{"k": "", "t": "Einschließlich Rückbau und Entsorgung bzw. Verwertung des Materials."},
         {"k": "verbleibt", "t": "Material verbleibt nach Abschluss als Unterbau der späteren Außenanlage; kein Rückbau.", "fh": 0.7, "fg": 0.55}]

LBS[0]["gruppen"] += [
    {"name": "Baustraßen und Flächen", "positionen": [
        {"kurz": "Baustraße Schotter {d} cm auf Vlies, {last}",
         "lang": "Baustraße bzw. Bauzufahrt aus Schottertragschicht 0/45 auf Geotextil GRK 3, Dicke {d} cm, verdichtet, "
                 "für {last}. Oberboden wird gesondert abgetragen. Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "391", "gen": "A", "achsen": [RUECK, FLAE, ZUG],
         "varianten": [{"d": "20", "last": "Pkw und Transporter", "h": 0.08, "mat": 9.5, "geraet": 3.5},
                       {"d": "30", "last": "Lkw bis 40 t", "h": 0.11, "mat": 14, "geraet": 4.5},
                       {"d": "40", "last": "Lkw bis 40 t und Mobilkran", "h": 0.14, "mat": 18.5, "geraet": 5.5}]},
        {"kurz": "Lastverteilungsplatten {art} vorhalten",
         "lang": "Mobile Lastverteilungsplatten ({art}) auf vorhandenem Untergrund verlegen, vorhalten, umsetzen nach "
                 "Bedarf und wieder aufnehmen. Abrechnung je m² und Woche.",
         "einheit": "m²Wo", "kg": "391", "gen": "B", "achsen": [DAUER],
         "varianten": [{"art": "Kunststoff, Pkw/Transporter", "h": 0.01, "geraet": 0.9}, {"art": "Kunststoff, Lkw", "h": 0.012, "geraet": 1.4},
                       {"art": "Stahl, Schwerlast", "h": 0.02, "geraet": 2.6}]},
        {"kurz": "Lagerfläche befestigen, {art}",
         "lang": "Lager- bzw. Montagefläche herstellen: {art}, eben abgezogen und verdichtet; einschließlich Rückbau.",
         "einheit": "m²", "kg": "391", "gen": "A", "achsen": [FLAE, ZUG],
         "varianten": [{"art": "Schotter 15 cm auf Vlies", "h": 0.06, "mat": 7, "geraet": 3},
                       {"art": "Recyclingmaterial 20 cm auf Vlies", "h": 0.07, "mat": 5, "geraet": 3.5},
                       {"art": "Asphalt-Fräsgut 15 cm, gewalzt", "h": 0.07, "mat": 4.5, "geraet": 4}]},
        {"kurz": "Reifenwaschanlage {art}",
         "lang": "Reifenwaschanlage an der Baustellenausfahrt ({art}) aufstellen, an Wasser und Strom anschließen, "
                 "Schlamm entsorgen, abbauen. Vorhaltung je Woche.",
         "einheit": "Wo", "kg": "391", "gen": "C", "achsen": [DAUER],
         "varianten": [{"art": "Durchfahrrost mit Hochdruckreiniger", "h": 2, "geraet": 210}, {"art": "automatische Durchfahranlage", "h": 3, "geraet": 620}]},
        {"kurz": "Straßenreinigung Baustellenausfahrt, {art}",
         "lang": "Öffentliche Verkehrsflächen im Bereich der Baustellenausfahrt reinigen ({art}). Abrechnung je Einsatz.",
         "einheit": "St", "kg": "391", "gen": "B",
         "varianten": [{"art": "von Hand", "h": 1.5, "geraet": 5}, {"art": "Kehrmaschine mit Fahrer, bis 2 h", "h": 0, "geraet": 210}]},
        {"kurz": "Wegeführung/Ersatzweg Fußgänger, {art}",
         "lang": "Fußgänger-Ersatzweg entlang der Baustelle mit {art}, Beschilderung und Beleuchtung herstellen, "
                 "vorhalten und entfernen. Abrechnung je Meter und Woche.",
         "einheit": "mWo", "kg": "391", "gen": "B", "achsen": [DAUER],
         "varianten": [{"art": "Bakengeländer", "h": 0.01, "geraet": 1.1}, {"art": "Rampenbrücken über Leitungen", "h": 0.015, "geraet": 2.2}]},
    ]},
    {"name": "Container und Unterkünfte (Vorhaltung)", "positionen": [
        {"kurz": "{art}, Vorhaltung",
         "lang": "{art} mit {ausst} betriebsbereit vorhalten, "
                 "einschließlich Versicherung und Wartung. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "391", "gen": "B", "achsen": [DAUER, [{"k": "", "t": ""}, {"k": "Klimagerät", "t": "Mit Klimagerät (Split).", "geraet": 18}]],
         "varianten": [{"art": "Bürocontainer 20 ft", "h": 0, "geraet": 58, "ausst": "Elektro-Grundausstattung, Beleuchtung und Heizung"}, {"art": "Bürocontainer 20 ft, möbliert", "h": 0, "geraet": 75, "ausst": "Elektro-Grundausstattung, Beleuchtung und Heizung"},
                       {"art": "Mannschaftscontainer 20 ft", "h": 0, "geraet": 55, "ausst": "Elektro-Grundausstattung, Beleuchtung und Heizung"}, {"art": "Doppelbürocontainer 2 × 20 ft", "h": 0, "geraet": 118, "ausst": "Elektro-Grundausstattung, Beleuchtung und Heizung"},
                       {"art": "Besprechungscontainer 2 × 20 ft", "h": 0, "geraet": 125, "ausst": "Elektro-Grundausstattung, Beleuchtung und Heizung"}, {"art": "Magazincontainer 20 ft, ohne Fenster", "h": 0, "geraet": 32, "ausst": "Beleuchtung und Steckdose", "achsen": [DAUER]},
                       {"art": "Magazincontainer 10 ft", "h": 0, "geraet": 24, "ausst": "Beleuchtung und Steckdose", "achsen": [DAUER]}]},
        {"kurz": "Container {art} anliefern, aufstellen, abholen",
         "lang": "Container ({art}) anliefern, mit Autokran bzw. Ladekran aufstellen, ausrichten, anschließen und "
                 "nach Ende der Vorhaltung abholen. Je Container.",
         "einheit": "St", "kg": "391", "gen": "B", "achsen": [ZUG, [{"k": "", "t": ""}, {"k": "gestapelt", "t": "Aufstellung in zweiter Lage (gestapelt), mit Außentreppe anteilig.", "h": 1.5, "geraet": 140}]],
         "varianten": [{"art": "10 ft", "h": 1, "geraet": 260}, {"art": "20 ft", "h": 1.5, "geraet": 380}]},
        {"kurz": "Sanitärcontainer {art}, Vorhaltung",
         "lang": "Sanitärcontainer ({art}) mit Warmwasserbereiter und Frostschutz betriebsbereit vorhalten, "
                 "Reinigung und Verbrauchsmaterial wöchentlich. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "391", "gen": "B", "achsen": [DAUER, [{"k": "", "t": ""}, {"k": "2× Reinigung/Wo", "t": "Reinigung zweimal wöchentlich.", "geraet": 35}]],
         "varianten": [{"art": "WC Damen/Herren mit Urinal", "h": 0, "geraet": 95}, {"art": "WC und Dusche", "h": 0, "geraet": 125},
                       {"art": "Waschraum mit 4 Waschplätzen", "h": 0, "geraet": 85}, {"art": "barrierefrei", "h": 0, "geraet": 115}]},
        {"kurz": "Mobiltoilette {art}, Vorhaltung",
         "lang": "Mobile Toilettenkabine ({art}) aufstellen, wöchentlich reinigen und leeren, abholen. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "391", "gen": "A", "achsen": [DAUER],
         "varianten": [{"art": "Standard", "h": 0, "geraet": 32}, {"art": "mit Handwaschbecken", "h": 0, "geraet": 40}, {"art": "kranbar für Geschossdecken", "h": 0, "geraet": 45}]},
        {"kurz": "Container an Ver-/Entsorgung anschließen, {art}",
         "lang": "Container an {art} anschließen, einschließlich Leitungen bis 25 m und Rückbau.",
         "einheit": "St", "kg": "391", "gen": "B",
         "varianten": [{"art": "Baustrom", "h": 2, "mat": 60, "lohn": "elektro"}, {"art": "Bauwasser und Schmutzwasser", "h": 3, "mat": 140, "lohn": "sanitaer"},
                       {"art": "Netzwerk/Telefon (LTE-Router)", "h": 1, "mat": 180, "lohn": "elektro"}]},
    ]},
    {"name": "Baustrom, Bauwasser, Beleuchtung (Ergänzung)", "positionen": [
        {"kurz": "Baustromverteiler {art}, Vorhaltung",
         "lang": "Baustromverteiler nach DIN EN 61439-4 ({art}) betriebsbereit vorhalten, einschließlich "
                 "wiederkehrender Prüfung. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "391", "gen": "A", "achsen": [DAUER], "lohn": "elektro",
         "varianten": [{"art": "Anschlussverteiler 63 A mit Zähler", "h": 0, "geraet": 28}, {"art": "Hauptverteiler 125 A", "h": 0, "geraet": 45},
                       {"art": "Unterverteiler 32 A", "h": 0, "geraet": 12}, {"art": "Steckdosenverteiler 16 A", "h": 0, "geraet": 7}]},
        {"kurz": "Baustrom-Verbrauch, {art}",
         "lang": "Kosten des Baustromverbrauchs ({art}) als Umlage über die Bauzeit. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "391", "gen": "C",
         "varianten": [{"art": "kleine Baustelle bis 30 kW", "h": 0, "geraet": 85}, {"art": "mittlere Baustelle mit Kran", "h": 0, "geraet": 260},
                       {"art": "große Baustelle, Kran und Bauheizung", "h": 0, "geraet": 620}]},
        {"kurz": "Bauwasser-Verbrauch und Standrohr, {art}",
         "lang": "Bauwasserversorgung ({art}) einschließlich Miete des Standrohrs bzw. Zählers und Verbrauchskosten. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "391", "gen": "C",
         "varianten": [{"art": "kleine Baustelle", "h": 0, "geraet": 28}, {"art": "mittlere Baustelle", "h": 0, "geraet": 65}, {"art": "große Baustelle", "h": 0, "geraet": 140}]},
        {"kurz": "Stromaggregat {kva} kVA, Vorhaltung",
         "lang": "Schallgedämpftes Stromaggregat {kva} kVA mit Tankanlage auf der Baustelle betriebsbereit vorhalten, "
                 "Wartung; Kraftstoff gesondert. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "391", "gen": "C", "achsen": [DAUER],
         "varianten": [{"kva": "20", "h": 0, "geraet": 210}, {"kva": "60", "h": 0, "geraet": 420}, {"kva": "100", "h": 0, "geraet": 620}]},
        {"kurz": "Baustellenbeleuchtung {art}, Vorhaltung",
         "lang": "Baustellenbeleuchtung ({art}) aufstellen, {anschl}, vorhalten und abbauen. "
                 "Abrechnung je Stück und Woche.",
         "einheit": "StWo", "kg": "391", "gen": "B", "achsen": [DAUER], "lohn": "elektro",
         "varianten": [{"art": "LED-Fluter 100 W am Stativ", "anschl": "an Baustrom anschließen", "h": 0.05, "geraet": 4}, {"art": "LED-Lichtmast 4 × 300 W", "anschl": "an Baustrom anschließen", "h": 0.1, "geraet": 38},
                       {"art": "Lichtgirlande Treppenhaus, je 25 m", "anschl": "an Baustrom anschließen", "h": 0.05, "geraet": 5}, {"art": "Akku-Lichtmast autark", "anschl": "Akkus laden bzw. wechseln", "h": 0.1, "geraet": 85}]},
    ]},
    {"name": "Hebezeuge (Ergänzung)", "positionen": [
        {"kurz": "Turmdrehkran {art}, Vorhaltung",
         "lang": "Turmdrehkran {art} betriebsbereit vorhalten, einschließlich Wartung, UVV-Prüfung und Versicherung; "
                 "Kranführer, Montage und Fundament gesondert. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "391", "gen": "C", "achsen": [DAUER],
         "varianten": [{"art": "Schnellmontagekran bis 30 m Ausladung", "h": 0, "geraet": 650}, {"art": "obendrehend bis 50 m, 6 t", "h": 0, "geraet": 1250},
                       {"art": "obendrehend bis 60 m, 10 t", "h": 0, "geraet": 1850}]},
        {"kurz": "Turmdrehkran {art}, Montage und Demontage",
         "lang": "Turmdrehkran {art} anliefern, mit Mobilkran montieren, Abnahme durch Sachverständigen, nach Ende "
                 "demontieren und abtransportieren. Pauschal je Kran.",
         "einheit": "psch", "kg": "391", "gen": "C", "achsen": [ZUG],
         "varianten": [{"art": "Schnellmontagekran", "h": 16, "geraet": 3200}, {"art": "obendrehend bis 50 m", "h": 60, "geraet": 14500},
                       {"art": "obendrehend bis 60 m", "h": 80, "geraet": 21000}]},
        {"kurz": "Kranfundament/Ballast für Turmdrehkran, {art}",
         "lang": "Kranfundament bzw. Ballastierung für den Turmdrehkran nach Herstellerstatik ({art}) herstellen und nach "
                 "Ende zurückbauen.",
         "einheit": "psch", "kg": "391", "gen": "C",
         "varianten": [{"art": "Fertigteil-Ballastplatten", "h": 8, "geraet": 1600}, {"art": "Ortbetonfundament mit Fundamentanker", "h": 24, "mat": 2800, "geraet": 900, "lohn": "rohbau"}]},
        {"kurz": "Kranführer, {art}",
         "lang": "Kranführer für den Turmdrehkran ({art}). Abrechnung nach Stunden.",
         "einheit": "h", "kg": "391", "gen": "A", "h": 1,
         "varianten": [{"art": "Normalarbeitszeit"}, {"art": "Überstunden/Samstag", "h": 1.25}]},
        {"kurz": "Hubarbeitsbühne {art}, Vorhaltung",
         "lang": "Hubarbeitsbühne ({art}) anliefern, einweisen, betriebsbereit vorhalten und abholen; ohne Bediener. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "392", "gen": "B", "achsen": [DAUER],
         "varianten": [{"art": "Scheren-Bühne 8 m elektrisch", "h": 0, "geraet": 260}, {"art": "Scheren-Bühne 12 m Diesel", "h": 0, "geraet": 420},
                       {"art": "Gelenk-Teleskop 16 m", "h": 0, "geraet": 720}, {"art": "Lkw-Bühne 25 m", "h": 0, "geraet": 1650},
                       {"art": "Raupen-Arbeitsbühne 20 m", "h": 0, "geraet": 1250}]},
        {"kurz": "Bauaufzug/Personen-Material-Aufzug {art}, Vorhaltung",
         "lang": "Bauaufzug ({art}) betriebsbereit vorhalten einschließlich Wartung und Prüfung; Montage gesondert. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "391", "gen": "C", "achsen": [DAUER],
         "varianten": [{"art": "Materialaufzug 500 kg", "h": 0, "geraet": 180}, {"art": "Personen-Material-Aufzug 1.500 kg", "h": 0, "geraet": 520}]},
        {"kurz": "Bauaufzug {art}, Montage und Demontage je m Höhe",
         "lang": "Bauaufzug ({art}) montieren, am Bauwerk verankern, prüfen lassen und demontieren. Abrechnung nach Förderhöhe.",
         "einheit": "m", "kg": "391", "gen": "C",
         "varianten": [{"art": "Materialaufzug", "h": 0.8, "geraet": 25}, {"art": "Personen-Material-Aufzug", "h": 1.5, "geraet": 60}]},
    ]},
    {"name": "Absperrung, Schutz und Kennzeichnung (Ergänzung)", "positionen": [
        {"kurz": "Absperrung {art}, Vorhaltung",
         "lang": "Absperrung ({art}) aufstellen, täglich kontrollieren, vorhalten und entfernen. Abrechnung je Meter und Woche.",
         "einheit": "mWo", "kg": "391", "gen": "A", "achsen": [DAUER],
         "varianten": [{"art": "Absperrschranken mit Warnleuchten", "h": 0.008, "geraet": 0.9}, {"art": "Absperrgitter verzinkt", "h": 0.006, "geraet": 0.5},
                       {"art": "Leitbaken mit Fußplatte", "h": 0.008, "geraet": 0.7}, {"art": "Betonschutzwand mobil", "h": 0.02, "geraet": 3.2}]},
        {"kurz": "Bauzaun {art}, Auf- und Abbau",
         "lang": "Bauzaun ({art}) liefern, aufstellen, gegen Umfallen sichern und nach Abschluss abbauen; Vorhaltung gesondert.",
         "einheit": "m", "kg": "391", "gen": "A", "achsen": [ZUG],
         "varianten": [{"art": "mobil 2,0 m mit Fußplatten", "h": 0.1, "geraet": 3}, {"art": "mobil mit Sichtschutzplane", "h": 0.14, "geraet": 5.5},
                       {"art": "Holzbohlenzaun 2,0 m", "h": 0.45, "mat": 22}, {"art": "Stahlblechzaun (Trapezblech) 2,5 m", "h": 0.4, "mat": 18, "geraet": 6}]},
        {"kurz": "Fußgänger-Schutztunnel/Schutzdach, Breite {b} m",
         "lang": "Fußgänger-Schutzdach bzw. Schutztunnel aus Gerüstmaterial mit dichtem Belag und Beleuchtung, lichte Breite {b} m, "
                 "herstellen, vorhalten (4 Wochen) und abbauen. Abrechnung nach Länge.",
         "einheit": "m", "kg": "391", "gen": "B", "lohn": "geruest", "achsen": [ZUG],
         "varianten": [{"b": "1,5", "h": 1.1, "geraet": 38}, {"b": "2,5", "h": 1.6, "geraet": 55}]},
        {"kurz": "Bauschild {g}, liefern, aufstellen, entfernen",
         "lang": "Bauschild {g} nach Gestaltungsvorgabe des Auftraggebers (Druckdaten werden gestellt) auf Unterkonstruktion "
                 "standsicher aufstellen und nach Abschluss entfernen.",
         "einheit": "St", "kg": "391", "gen": "B", "achsen": [[{"k": "", "t": ""}, {"k": "beleuchtet", "t": "Mit LED-Beleuchtung und Zeitschaltuhr.", "h": 2, "mat": 380}]],
         "varianten": [{"g": "2 × 1,5 m", "h": 4, "mat": 420}, {"g": "3 × 2 m", "h": 6, "mat": 780}, {"g": "4 × 3 m", "h": 10, "mat": 1350}]},
        {"kurz": "Bautür provisorisch, {art}",
         "lang": "Provisorische Bautür ({art}) in Rohbauöffnung einbauen, vorhalten und wieder ausbauen.",
         "einheit": "St", "kg": "391", "gen": "A", "lohn": "tischler",
         "varianten": [{"art": "Holz/Spanplatte mit Bügelschloss", "h": 1.5, "mat": 120}, {"art": "Stahl-Bautür verzinkt, Profilzylinder", "h": 1.5, "mat": 210, "geraet": 60},
                       {"art": "Stahl-Bautür mit Panikschloss (Flucht)", "h": 2, "mat": 320, "geraet": 80}]},
        {"kurz": "Fensteröffnung provisorisch verschließen, {art}",
         "lang": "Fenster- bzw. Türöffnungen im Rohbau provisorisch verschließen ({art}), vorhalten und entfernen. Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "391", "gen": "A",
         "varianten": [{"art": "Folie auf Lattung", "h": 0.25, "mat": 3}, {"art": "Folie mit Gewebe, transparent, auf Rahmen", "h": 0.35, "mat": 6},
                       {"art": "OSB-Platte, einbruchhemmend verschraubt", "h": 0.45, "mat": 14}]},
        {"kurz": "Videoüberwachung Baustelle, {art}",
         "lang": "Videoüberwachung der Baustelle ({art}) mit Aufzeichnung und Alarmierung an Leitstelle, aufbauen, vorhalten und abbauen. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "391", "gen": "C", "achsen": [DAUER],
         "varianten": [{"art": "mobiler Kameraturm autark", "h": 0, "geraet": 260}, {"art": "2 Kameras am Bauzaun, Netzstrom", "h": 0, "geraet": 140}]},
    ]},
]
