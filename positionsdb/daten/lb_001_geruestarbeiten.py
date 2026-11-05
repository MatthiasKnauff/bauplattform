# LB 001 Gerüstarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "001", "name": "Gerüstarbeiten", "atv": "DIN 18451", "lohn": "geruest", "kg": "392",
    "gruppen": [
        {"name": "Fassadengerüste", "positionen": [
            {"kurz": "Fassadengerüst LK {lk}, Breitenklasse {w}, bis {hh} m, Auf-/Abbau inkl. 4 Wochen",
             "lang": "Arbeits- und Schutzgerüst als Systemgerüst nach DIN EN 12811-1, Lastklasse {lk}, Breitenklasse "
                     "{w}, Gerüsthöhe bis {hh} m, mit Seitenschutz, Bordbrettern, Leitergängen und Verankerung, "
                     "liefern, aufbauen, für 4 Wochen Grundstandzeit vorhalten und abbauen. Prüfung und "
                     "Freigabe durch den Gerüstersteller. Abrechnung nach eingerüsteter Fassadenfläche.",
             "einheit": "m²", "gen": "A",
             "varianten": [{"lk": "3", "w": "W06", "hh": "12", "h": 0.16, "geraet": 2.6},
                           {"lk": "3", "w": "W09", "hh": "12", "h": 0.18, "geraet": 3.0},
                           {"lk": "3", "w": "W09", "hh": "24", "h": 0.21, "geraet": 3.4},
                           {"lk": "4", "w": "W09", "hh": "24", "h": 0.23, "geraet": 3.8}]},
            {"kurz": "Fassadengerüst LK {lk} vorhalten über Grundstandzeit",
             "lang": "Gerüst wie vor über die Grundstandzeit hinaus betriebsbereit vorhalten. Abrechnung je m² "
                     "Gerüstfläche und angefangene Woche.",
             "einheit": "m²Wo", "h": 0, "gen": "A",
             "varianten": [{"lk": "3", "geraet": 0.38}, {"lk": "4", "geraet": 0.45}]},
            {"kurz": "Konsolverbreiterung innen, {b} cm",
             "lang": "Innenkonsolen am Fassadengerüst zur Verringerung des Wandabstands anbringen, Belag "
                     "{b} cm breit, auf allen Gerüstlagen. Abrechnung nach Länge je Lage.",
             "einheit": "m", "gen": "A",
             "varianten": [{"b": "30", "h": 0.06, "geraet": 0.9}, {"b": "50", "h": 0.08, "geraet": 1.4}]},
            {"kurz": "Schutznetz/Plane am Fassadengerüst",
             "lang": "Gerüstschutznetz bzw. Gerüstplane außenseitig vollflächig anbringen, für die Standzeit "
                     "vorhalten und mit dem Gerüst abbauen. Abrechnung nach Fläche.",
             "einheit": "m²", "gen": "A",
             "varianten": [{"h": 0.04, "mat": 0.4, "geraet": 0.8}]},
            {"kurz": "Gerüsttreppe als Aufstieg, Höhe bis {hh} m",
             "lang": "Treppenturm bzw. innenliegender Treppenaufstieg mit Geländern als Zugang zu allen "
                     "Gerüstlagen, Gerüsthöhe bis {hh} m, aufbauen, vorhalten (Grundstandzeit) und abbauen.",
             "einheit": "St", "gen": "B",
             "varianten": [{"hh": "12", "h": 6, "geraet": 380}, {"hh": "24", "h": 11, "geraet": 720}]},
            {"kurz": "Schutzdach am Fassadengerüst, Breite {b} m",
             "lang": "Schutzdach über Gehwegen bzw. Zugängen am Gerüst mit Belag und Bordwand herstellen, "
                     "Breite {b} m, vorhalten für die Grundstandzeit und abbauen. Abrechnung nach Länge.",
             "einheit": "m", "gen": "B",
             "varianten": [{"b": "1,5", "h": 0.6, "geraet": 9}, {"b": "2,5", "h": 0.9, "geraet": 14}]},
            {"kurz": "Fanggerüst/Dachfangschutz an Traufe",
             "lang": "Dachfanggerüst an der Traufe mit Schutzwand und Netz nach DIN 4420 bzw. DIN EN 12811 "
                     "als Absturzsicherung für Dacharbeiten herstellen und abbauen. Abrechnung nach Länge.",
             "einheit": "m", "h": 0.45, "geraet": 6, "gen": "A"},
            {"kurz": "Gerüstüberbrückung/Durchgang, Spannweite bis {s} m",
             "lang": "Gerüst mit Gitterträgern über Eingänge, Einfahrten oder Vordächer hinweg überbrücken, "
                     "Spannweite bis {s} m, mit allen Lagen.",
             "einheit": "St", "gen": "B",
             "varianten": [{"s": "4", "h": 3, "geraet": 110}, {"s": "8", "h": 6, "geraet": 230}]},
            {"kurz": "Gerüst umsetzen innerhalb der Baustelle",
             "lang": "Gerüst nach Anweisung abbauen und an anderer Stelle des Gebäudes wieder aufbauen "
                     "(Umsetzen), einschließlich Verankerung. Abrechnung nach umgesetzter Gerüstfläche.",
             "einheit": "m²", "h": 0.15, "geraet": 0.3, "gen": "B"},
            {"kurz": "Lastenaufzug/Bauaufzug am Gerüst, Tragkraft {t} kg",
             "lang": "Schrägaufzug bzw. Gerüstaufzug mit Tragkraft {t} kg aufbauen, betriebsbereit für 4 Wochen "
                     "vorhalten und abbauen.",
             "einheit": "St", "gen": "C",
             "varianten": [{"t": "200", "h": 4, "geraet": 420}, {"t": "500", "h": 8, "geraet": 1150}]},
        ]},
        {"name": "Raum- und Sondergerüste", "positionen": [
            {"kurz": "Raumgerüst, Belaghöhe bis {hh} m, Auf-/Abbau inkl. 4 Wochen",
             "lang": "Flächengerüst als Raumgerüst für Decken- und Wandarbeiten, Lastklasse 3, vollflächiger "
                     "Belag in einer Höhe bis {hh} m, mit Seitenschutz und Aufstieg, aufbauen, 4 Wochen vorhalten "
                     "und abbauen. Abrechnung nach Grundfläche.",
             "einheit": "m²", "gen": "B",
             "varianten": [{"hh": "4", "h": 0.35, "geraet": 3}, {"hh": "8", "h": 0.55, "geraet": 5}, {"hh": "12", "h": 0.80, "geraet": 7.5}]},
            {"kurz": "Fahrbares Arbeitsgerüst (Rollgerüst), Arbeitshöhe bis {hh} m",
             "lang": "Fahrgerüst nach DIN EN 1004 mit Ballast, Arbeitshöhe bis {hh} m, liefern, aufbauen, "
                     "vorhalten und abbauen. Abrechnung je Woche.",
             "einheit": "Wo", "gen": "A",
             "varianten": [{"hh": "6", "h": 1.5, "geraet": 75}, {"hh": "10", "h": 2.5, "geraet": 120}]},
            {"kurz": "Treppenhausgerüst, je Geschoss",
             "lang": "Gerüst im Treppenauge bzw. über Treppenläufen für Wand- und Deckenarbeiten mit "
                     "Belag und Seitenschutz, je Geschoss auf- und abbauen, für 4 Wochen vorhalten.",
             "einheit": "St", "h": 5, "geraet": 85, "gen": "B", "hinweis": "Einheit: je Geschoss"},
            {"kurz": "Schornstein-/Dachgerüst auf geneigtem Dach",
             "lang": "Arbeitsgerüst um einen Schornstein bzw. auf der Dachfläche mit Dachhaken bzw. "
                     "Spezialkonsolen, Arbeitsfläche ca. 4 m², aufbauen, vorhalten und abbauen.",
             "einheit": "St", "h": 6, "geraet": 140, "gen": "C"},
            {"kurz": "Auslegergerüst/Hängegerüst, Sonderkonstruktion",
             "lang": "Hänge- bzw. Auslegergerüst als Sonderkonstruktion nach statischem Nachweis des "
                     "Gerüstbauers herstellen, vorhalten (4 Wochen) und abbauen. Abrechnung nach Belagfläche.",
             "einheit": "m²", "h": 1.6, "geraet": 22, "gen": "C"},
            {"kurz": "Wetterschutzdach über Gerüst (Notdach), Spannweite bis {s} m",
             "lang": "Wetterschutzdach als Systemdach mit Planeneindeckung auf dem Gerüst über dem Gebäude, "
                     "Spannweite bis {s} m, aufbauen, 4 Wochen vorhalten und abbauen. Abrechnung nach überdachter "
                     "Grundfläche.",
             "einheit": "m²", "gen": "C",
             "varianten": [{"s": "12", "h": 0.45, "geraet": 9}, {"s": "20", "h": 0.60, "geraet": 13}]},
            {"kurz": "Wetterschutzdach vorhalten über Grundstandzeit",
             "lang": "Wetterschutzdach wie vor über die Grundstandzeit hinaus vorhalten. Abrechnung je m² und Woche.",
             "einheit": "m²Wo", "h": 0, "geraet": 0.9, "gen": "C"},
        ]},
    ],
}]
