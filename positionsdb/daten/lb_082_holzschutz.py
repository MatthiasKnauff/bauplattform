# LB 082 Bekämpfender Holzschutz – eigene Texte und Ansätze (Preisstand 11/2026)

ZUG = [{}, {"k": "schwer zug.", "t": "Bauteile schwer zugänglich (Dachspitz, Kehlbalkenlage, Abseiten), Arbeiten teilweise in Zwangshaltung.", "fh": 1.3, "gen": "C"}]
NUTZ = [{}, {"k": "bewohnt", "t": "Ausführung in genutzten bzw. bewohnten Gebäuden mit Staubschutz, täglicher Reinigung und Rücksicht auf Nutzer.", "fh": 1.2, "mat": 1.5}]
MITTEL = [{"k": "Borsalz", "t": "Bekämpfungsmittel auf Borsalzbasis, wasserlöslich, mit Prüfprädikat nach DIN 68800-4."},
          {"k": "Lösemittel", "t": "Bekämpfungsmittel lösemittelhaltig, schnell eindringend, mit Prüfprädikat; Lüftung und Explosionsschutz beachten.", "fm": 1.25},
          {"k": "Gel/Paste", "t": "Bekämpfungsmittel als Gel bzw. Paste für senkrechte Flächen und Überkopfarbeiten.", "fm": 1.4, "fh": 0.9}]

MENGE = [{}, {"k": "Kleinmenge", "t": "Kleinmengen bis 20 m² bzw. 20 m je Auftrag mit Einrichtung und Abbau.", "fh": 1.3, "fm": 1.1}]

LBS = [{
    "nr": "082", "name": "Bekämpfender Holzschutz", "atv": "DIN 18363 / DIN 68800-4", "lohn": "zimmerer",
    "gruppen": [
        {"name": "Untersuchung, Vorbereitung", "positionen": [
            {"kurz": "Holzschutzgutachten Befallsermittlung, {art}",
             "lang": "Untersuchung der Holzkonstruktion auf tierische und pflanzliche Schädlinge durch Sachkundigen für Holzschutz: Sichtprüfung, "
                     "Bohrwiderstands- bzw. Feuchtemessung, Probennahme, Bestimmung der Schädlinge, Kartierung und schriftlicher Bericht mit Sanierungsvorschlag. "
                     "Umfang: {art}.",
             "einheit": "St", "kg": "394", "gen": "C", "tags": ["altbau"],
             "varianten": [{"art": "Dachstuhl Einfamilienhaus", "h": 6, "mat": 120}, {"art": "Dachstuhl Mehrfamilienhaus", "h": 10, "mat": 180},
                           {"art": "Holzbalkendecken je Geschoss", "h": 5, "mat": 90}, {"art": "Fachwerkfassade", "h": 8, "mat": 150}]},
            {"kurz": "Holzproben Labor, {art}",
             "lang": "Entnahme und Laboruntersuchung von Holzproben, Untersuchung auf {art}, Bericht.", "einheit": "St", "kg": "394", "gen": "B",
             "varianten": [{"art": "Pilzbefall (Art)", "h": 0.5, "mat": 140}, {"art": "Altholzschutzmittel (PCP/Lindan/DDT)", "h": 0.5, "mat": 230}]},
            {"kurz": "Holzoberflächen abbürsten und absaugen",
             "lang": "Holzoberflächen von Staub, Insektenmehl und losen Teilen befreien durch Abbürsten und Absaugen mit Industriesauger, Material entsorgen.",
             "einheit": "m²", "kg": "394", "gen": "A", "achsen": [ZUG, NUTZ, MENGE], "varianten": [{"h": 0.18, "mat": 0.5, "geraet": 0.8}]},
            {"kurz": "Befallenes Holz abbeilen bis gesundes Holz, Tiefe bis {t} mm",
             "lang": "Durch Insekten- oder Pilzbefall geschädigte Holzschichten bis auf das gesunde Holz abbeilen bzw. abfräsen, Tiefe bis {t} mm, "
                     "Abfall getrennt sammeln und entsorgen. Abrechnung nach bearbeiteter Holzoberfläche.",
             "einheit": "m²", "kg": "394", "gen": "B", "achsen": [ZUG, NUTZ, MENGE],
             "varianten": [{"t": "10", "h": 0.6, "mat": 1, "geraet": 1.5}, {"t": "25", "h": 1.1, "mat": 1.5, "geraet": 2.5}]},
        ]},
        {"name": "Bekämpfung tierischer Schädlinge", "positionen": [
            {"kurz": "Hausbock/Anobien bekämpfen, Streichen, {art}",
             "lang": "Bekämpfung von Insektenbefall (Hausbockkäfer, Gewöhnlicher Nagekäfer) durch zweimaliges Streichen bzw. Sprühen aller zugänglichen "
                     "Holzoberflächen mit zugelassenem Bekämpfungsmittel in der vorgeschriebenen Aufbringmenge, {art}. Abrechnung nach behandelter Oberfläche.",
             "einheit": "m²", "kg": "394", "gen": "B", "achsen": [MITTEL, ZUG, NUTZ, MENGE],
             "varianten": [{"art": "Holz bis 16 cm", "h": 0.25, "mat": 3.5}, {"art": "Holz über 16 cm", "h": 0.32, "mat": 4.5}]},
            {"kurz": "Bohrlochtränkung Holz, Querschnitt {q}",
             "lang": "Bohrlochtränkung zur Tiefenbehandlung starker Holzquerschnitte: Bohrungen im Raster ca. 15–20 cm, mit Tränkventilen bzw. "
                     "Drucktränkung füllen, Bohrlöcher mit Holzdübeln verschließen. Querschnitt {q}. Abrechnung nach Holzlänge.",
             "einheit": "m", "kg": "394", "gen": "B", "achsen": [MITTEL[:2], ZUG, MENGE],
             "varianten": [{"q": "bis 16/18 cm", "h": 0.5, "mat": 5}, {"q": "bis 20/24 cm", "h": 0.7, "mat": 7.5}, {"q": "über 20/24 cm", "h": 0.9, "mat": 10}]},
            {"kurz": "Heißluftverfahren gegen Insekten, {art}",
             "lang": "Bekämpfung von Insektenbefall im Heißluftverfahren nach DIN 68800-4: Erwärmung der Holzbauteile auf mindestens 55 °C im Kern "
                     "über mindestens 60 Minuten mit mobilen Heißluftgeneratoren, Temperaturüberwachung mit Messfühlern, Protokoll. {art}. "
                     "Abrechnung {abr}.",
             "einheit": "m²", "kg": "394", "gen": "C", "achsen": [NUTZ, MENGE],
             "varianten": [{"art": "Dachstuhl", "abr": "nach Grundfläche des behandelten Bereichs", "h": 0.45, "mat": 2, "geraet": 9},
                           {"art": "Holzbalkendecke", "abr": "nach Deckenfläche des behandelten Bereichs", "h": 0.55, "mat": 2.5, "geraet": 11},
                           {"art": "Fachwerkwand", "abr": "nach Wandfläche (Ansichtsfläche einseitig) des behandelten Bereichs", "h": 0.6, "mat": 2.5, "geraet": 12}]},
            {"kurz": "Begasung Gebäude/Objekt gegen Holzschädlinge",
             "lang": "Begasung durch zugelassenen Fachbetrieb mit Sachkunde nach Gefahrstoffverordnung: Abdichten, Begasen, Lüften, Freigabemessung, Behördenanzeige. "
                     "Abrechnung nach begastem Rauminhalt.", "einheit": "m³", "kg": "394", "gen": "C", "lohn": "abbruch",
             "varianten": [{"h": 0.03, "mat": 3.5, "geraet": 4}]},
            {"kurz": "Hausschwamm: Mauerwerk ausbrennen/bohren und tränken, d bis {d} cm",
             "lang": "Bekämpfung von Echtem Hausschwamm im Mauerwerk: Putz im Befallsbereich plus 1,5 m Sicherheitsabstand abschlagen, Fugen auskratzen, "
                     "Mauerwerk abflammen, Bohrlöcher im Raster setzen und mit Schwammsperrmittel tränken, Oberfläche sperren. Wanddicke bis {d} cm.",
             "einheit": "m²", "kg": "394", "gen": "C", "lohn": "rohbau", "achsen": [NUTZ],
             "varianten": [{"d": "24", "h": 2.2, "mat": 18, "geraet": 6}, {"d": "36,5", "h": 2.8, "mat": 26, "geraet": 8}, {"d": "51", "h": 3.4, "mat": 34, "geraet": 10}]},
            {"kurz": "Hausschwammbefallenes Holz ausbauen und entsorgen",
             "lang": "Mit Echtem Hausschwamm befallene Hölzer einschließlich 1 m Sicherheitszone im gesunden Holz ausbauen, in Folie verpacken und als "
                     "gefährlichen bzw. besonders überwachungsbedürftigen Abfall nach Vorgabe entsorgen (Entsorgungsgebühr gesondert).",
             "einheit": "m³", "kg": "394", "gen": "C", "achsen": [ZUG, NUTZ], "varianten": [{"h": 14, "mat": 20, "geraet": 60}]},
        ]},
        {"name": "Holzersatz, Verstärkung", "positionen": [
            {"kurz": "Holzbalken auswechseln KVH {q} cm, bis {l} m",
             "lang": "Geschädigten Holzbalken bzw. Sparren auswechseln: abstützen, Altholz ausbauen, neues Konstruktionsvollholz C24, technisch getrocknet, "
                     "vorbeugend chemisch geschützt bzw. Gefährdungsklasse beachtet, Querschnitt {q} cm, Länge bis {l} m, passgenau einbauen und anschließen.",
             "einheit": "St", "kg": "394", "gen": "C", "achsen": [ZUG, NUTZ],
             "varianten": [{"q": "8/16", "l": "4", "h": 4, "mat": 48}, {"q": "10/20", "l": "5", "h": 5.5, "mat": 78}, {"q": "12/24", "l": "6", "h": 7.5, "mat": 115},
                           {"q": "16/24", "l": "6", "h": 9, "mat": 155}]},
            {"kurz": "Balkenkopf anschuhen, bis {q} cm",
             "lang": "Zerstörten Balkenkopf bis in gesundes Holz abschneiden, neues Holzstück gleichen Querschnitts mit Stahllaschen bzw. eingeklebten "
                     "Gewindestangen nach Statik kraftschlüssig anschließen (Anschuhen), Auflager herrichten. Querschnitt bis {q} cm.",
             "einheit": "St", "kg": "394", "gen": "C", "achsen": [ZUG, NUTZ],
             "varianten": [{"q": "16/20", "h": 6, "mat": 90}, {"q": "20/24", "h": 8, "mat": 130}, {"q": "24/28", "h": 10, "mat": 180}]},
            {"kurz": "Beidseitige Laschung Holzbalken, Bohlen {q} cm",
             "lang": "Verstärkung geschädigter Balken durch beidseitig angeschraubte Bohlen aus KVH C24 bzw. Stahlprofile nach Statik, Querschnitt {q} cm, "
                     "Verbindungsmittel nach Statik. Abrechnung nach Laschenlänge.",
             "einheit": "m", "kg": "394", "gen": "B", "achsen": [ZUG, NUTZ, MENGE],
             "varianten": [{"q": "6/16", "h": 1.2, "mat": 22}, {"q": "8/20", "h": 1.5, "mat": 32}]},
            {"kurz": "Vorbeugender Holzschutz Neuholz, Streichen, {gk}",
             "lang": "Vorbeugender chemischer Holzschutz für eingebautes Neuholz nach DIN 68800-3, Gebrauchsklasse {gk}, Streichen bzw. Sprühen in der "
                     "Aufbringmenge nach Zulassung, Nachweis mit Kennzeichnung.", "einheit": "m²", "kg": "361", "gen": "A", "achsen": [ZUG, MENGE],
             "varianten": [{"gk": "GK 1", "h": 0.12, "mat": 1.6}, {"gk": "GK 2", "h": 0.14, "mat": 2.2}, {"gk": "GK 3.1", "h": 0.16, "mat": 2.9}]},
            {"kurz": "Feuchtemessung und Trocknung Holzbauteile, {art}",
             "lang": "Holzfeuchte messen und Bauteile technisch trocknen ({art}) bis unter 20 % Holzfeuchte, Messprotokoll.", "einheit": "m²", "kg": "394", "gen": "C",
             "varianten": [{"art": "Kondenstrocknung", "h": 0.2, "geraet": 8}, {"art": "Infrarot-Heizplatten", "h": 0.35, "geraet": 12}]},
            {"kurz": "Kennzeichnung Holzschutzmaßnahme (Schild)",
             "lang": "Dauerhafte Kennzeichnung der durchgeführten Holzschutzmaßnahme nach DIN 68800 mit Schild (Mittel, Datum, Ausführender) an gut sichtbarer Stelle.",
             "einheit": "St", "kg": "394", "gen": "A", "varianten": [{"h": 0.3, "mat": 18}]},
        ]},
    ],
}]
