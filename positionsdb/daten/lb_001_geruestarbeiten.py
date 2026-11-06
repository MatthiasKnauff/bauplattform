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

# ---------------------------------------------------------------- Ausbau Runde 3 (Nacht 06.11.2026)
LK = [{"k": "LK 3", "t": "Lastklasse 3 (2,0 kN/m²)."}, {"k": "LK 4", "t": "Lastklasse 4 (3,0 kN/m²) für Putz- und Mauerarbeiten.", "fh": 1.08, "fg": 1.12},
      {"k": "LK 5", "t": "Lastklasse 5 (4,5 kN/m²) für Werksteinarbeiten und Lagerung.", "fh": 1.2, "fg": 1.3, "gen": "B"},
      {"k": "LK 6", "t": "Lastklasse 6 (6,0 kN/m²), Bemessung nach Einzelnachweis.", "fh": 1.35, "fg": 1.5, "gen": "C"}]
BK = [{"k": "W06", "t": "Breitenklasse W06."}, {"k": "W09", "t": "Breitenklasse W09.", "fh": 1.08, "fg": 1.12}, {"k": "W12", "t": "Breitenklasse W12.", "fh": 1.18, "fg": 1.25, "gen": "B"}]
HOEHE = [{"k": "bis 8 m", "t": "Gerüsthöhe bis 8 m.", "fh": 0.95}, {"k": "bis 15 m", "t": "Gerüsthöhe über 8 bis 15 m."},
         {"k": "bis 25 m", "t": "Gerüsthöhe über 15 bis 25 m.", "fh": 1.1, "fg": 1.05},
         {"k": "bis 40 m", "t": "Gerüsthöhe über 25 bis 40 m, Standsicherheitsnachweis im Einzelfall.", "fh": 1.25, "fg": 1.12, "gen": "B"}]
GLIED = [{"k": "", "t": ""}, {"k": "stark gegliedert", "t": "Stark gegliederte Fassade (Erker, Vor- und Rücksprünge, Balkone), erhöhter Aufwand.", "fh": 1.25, "fg": 1.1, "gen": "B"}]
ANKER = [{"k": "", "t": "Verankerung in tragfähigem Mauerwerk bzw. Beton."},
         {"k": "Anker in WDVS", "t": "Verankerung durch WDVS bzw. Vorsatzschale mit Abstandsankern, Ankerlöcher nach Abbau dauerhaft verschließen.", "fh": 1.12, "mat": 0.9, "gen": "B"}]
WOCHE = [{"k": "", "t": ""}, {"k": "Kleinfläche", "t": "Gerüstfläche unter 150 m² je Auftrag.", "fg": 1.25, "gen": "B"}]

LBS[0]["gruppen"] += [
    {"name": "Fassadengerüste nach Last- und Breitenklasse", "positionen": [
        {"kurz": "Fassadengerüst {sys}",
         "lang": "Arbeits- und Schutzgerüst als {sys} nach DIN EN 12811-1 und Aufbau- und Verwendungsanleitung, mit Seitenschutz, "
                 "Bordbrettern, Innen-Leitergängen und Verankerung, liefern, aufbauen, 4 Wochen Grundstandzeit vorhalten und "
                 "abbauen, Prüfprotokoll. Abrechnung nach eingerüsteter Fläche.",
         "einheit": "m²", "kg": "392", "gen": "A", "achsen": [LK, BK, HOEHE, GLIED, ANKER],
         "varianten": [{"sys": "Rahmengerüst Stahl", "h": 0.17, "geraet": 2.9}, {"sys": "Rahmengerüst Aluminium", "h": 0.15, "geraet": 3.3},
                       {"sys": "Modulgerüst", "h": 0.21, "geraet": 3.8}]},
        {"kurz": "Fassadengerüst vorhalten je Woche, {sys}",
         "lang": "Fassadengerüst ({sys}) über die Grundstandzeit hinaus betriebsbereit vorhalten, einschließlich Kontrolle nach "
                 "Sturm. Abrechnung je m² Gerüstfläche und angefangene Woche.",
         "einheit": "m²Wo", "kg": "392", "gen": "A", "achsen": [LK, HOEHE, WOCHE],
         "varianten": [{"sys": "Rahmengerüst Stahl", "h": 0, "geraet": 0.36}, {"sys": "Rahmengerüst Aluminium", "h": 0, "geraet": 0.42},
                       {"sys": "Modulgerüst", "h": 0, "geraet": 0.5}]},
        {"kurz": "Gerüst umbauen/umsetzen, {art}",
         "lang": "Vorhandenes Gerüst nach Anweisung umbauen ({art}), einschließlich erneuter Prüfung. Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "392", "gen": "B", "achsen": [HOEHE],
         "varianten": [{"art": "Belagebene versetzen", "h": 0.05, "geraet": 0.2}, {"art": "Gerüstabschnitt versetzen", "h": 0.12, "geraet": 0.6},
                       {"art": "Verankerung umsetzen für Fassadenarbeiten", "h": 0.03, "geraet": 0.3}]},
        {"kurz": "Gerüst-Zusatzbelag/Zwischenlage, {b}",
         "lang": "Zusätzliche Belaglage mit Seitenschutz einbauen ({b}), vorhalten für die Grundstandzeit, abbauen. Abrechnung nach Länge.",
         "einheit": "m", "kg": "392", "gen": "A",
         "varianten": [{"b": "W06", "h": 0.08, "geraet": 1.6}, {"b": "W09", "h": 0.1, "geraet": 2.1}]},
        {"kurz": "Konsolen {art}",
         "lang": "Gerüstkonsolen {art} an allen Lagen bzw. der angegebenen Lage anbringen, mit Belag und Seitenschutz. Abrechnung nach Länge je Lage.",
         "einheit": "m", "kg": "392", "gen": "A", "achsen": [HOEHE],
         "varianten": [{"art": "innen 0,36 m", "h": 0.06, "geraet": 0.9}, {"art": "innen 0,73 m", "h": 0.09, "geraet": 1.5},
                       {"art": "außen 0,73 m (Dachfang)", "h": 0.1, "geraet": 1.7}]},
        {"kurz": "Gerüstbekleidung {art}",
         "lang": "Gerüstbekleidung aus {art} vollflächig anbringen, für Grundstandzeit vorhalten, mit dem Gerüst entfernen. "
                 "Abrechnung nach bekleideter Fläche.",
         "einheit": "m²", "kg": "392", "gen": "A", "achsen": [HOEHE],
         "varianten": [{"art": "Schutznetz", "h": 0.035, "mat": 0.3, "geraet": 0.6}, {"art": "Gerüstplane PE gewebeverstärkt", "h": 0.05, "mat": 0.5, "geraet": 1.1},
                       {"art": "Staubschutzplane (Sandstrahlarbeiten)", "h": 0.06, "mat": 1.2, "geraet": 1.4},
                       {"art": "Werbeplane bedruckt (Druck gesondert)", "h": 0.07, "mat": 0.5, "geraet": 1.6}]},
        {"kurz": "Treppenturm {art}, Höhe bis {hh} m",
         "lang": "Treppenturm ({art}) als Aufstieg zu allen Gerüstlagen bzw. Geschossen, mit Podesten und Geländern, Höhe bis {hh} m, "
                 "aufbauen, Grundstandzeit vorhalten, abbauen.",
         "einheit": "St", "kg": "392", "gen": "B",
         "varianten": [{"art": "Gerüsttreppe 0,64 m", "hh": "10", "h": 6, "geraet": 340}, {"art": "Gerüsttreppe 0,64 m", "hh": "20", "h": 11, "geraet": 650},
                       {"art": "Bautreppe 1,0 m mit Podesten", "hh": "10", "h": 10, "geraet": 620}, {"art": "Bautreppe 1,0 m mit Podesten", "hh": "20", "h": 18, "geraet": 1150},
                       {"art": "Bautreppe 1,0 m mit Podesten", "hh": "30", "h": 26, "geraet": 1700}]},
        {"kurz": "Treppenturm vorhalten, {art}",
         "lang": "Treppenturm ({art}) über die Grundstandzeit hinaus vorhalten. Abrechnung je Meter Höhe und Woche.",
         "einheit": "mWo", "kg": "392", "gen": "A",
         "varianten": [{"art": "Gerüsttreppe", "h": 0, "geraet": 1.6}, {"art": "Bautreppe 1,0 m", "h": 0, "geraet": 2.6}]},
    ]},
    {"name": "Dach-, Raum- und Sondergerüste (Ergänzung)", "positionen": [
        {"kurz": "Dachfanggerüst, Traufhöhe {hh}",
         "lang": "Dachfanggerüst als Schutzwand an der Traufe nach DIN 4420 bzw. DIN EN 12811 mit Fangnetz bzw. Schutzwand "
                 "1,0 m über Traufkante, aufbauen, Grundstandzeit vorhalten, abbauen. Abrechnung nach Länge.",
         "einheit": "m", "kg": "392", "gen": "A", "achsen": [GLIED],
         "varianten": [{"hh": "bis 7 m", "h": 0.55, "geraet": 9}, {"hh": "bis 12 m", "h": 0.75, "geraet": 13}, {"hh": "bis 20 m", "h": 1.0, "geraet": 18}]},
        {"kurz": "Raumgerüst {art}",
         "lang": "Raumgerüst als Flächengerüst ({art}) mit vollflächigem Belag, Seitenschutz und Aufstieg, aufbauen, 4 Wochen vorhalten, "
                 "abbauen. Abrechnung nach eingerüstetem Raumvolumen.",
         "einheit": "m³", "kg": "392", "gen": "B", "achsen": [LK[:3]],
         "varianten": [{"art": "Arbeitshöhe bis 5 m", "h": 0.09, "geraet": 1.4}, {"art": "Arbeitshöhe bis 10 m", "h": 0.08, "geraet": 1.3},
                       {"art": "Arbeitshöhe bis 20 m (Halle, Kirche)", "h": 0.09, "geraet": 1.5}]},
        {"kurz": "Raumgerüst vorhalten je Woche",
         "lang": "Raumgerüst wie vor über die Grundstandzeit hinaus vorhalten. Abrechnung je m³ und Woche.",
         "einheit": "m³Wo", "kg": "392", "gen": "B", "h": 0, "geraet": 0.12,
         "hinweis": "Einheit m³ × Wochen"},
        {"kurz": "Hängegerüst {art}",
         "lang": "Hängegerüst ({art}) mit Belag, Seitenschutz und Abhängung an der Konstruktion nach statischem Nachweis, "
                 "aufbauen, 4 Wochen vorhalten, abbauen. Abrechnung nach Belagfläche.",
         "einheit": "m²", "kg": "392", "gen": "C",
         "varianten": [{"art": "unter Brücken bzw. Decken, LK 3", "h": 0.9, "geraet": 14}, {"art": "an Stahlträgern mit Trägerklemmen, LK 3", "h": 0.7, "geraet": 11}]},
        {"kurz": "Fahrgerüst {art}, Vorhaltung",
         "lang": "Fahrbares Arbeitsgerüst ({art}) liefern, aufbauen, vorhalten und abbauen. Abrechnung je Stück und Woche.",
         "einheit": "StWo", "kg": "392", "gen": "A",
         "varianten": [{"art": "Arbeitshöhe 4 m", "h": 0.4, "geraet": 55}, {"art": "Arbeitshöhe 6 m", "h": 0.6, "geraet": 75},
                       {"art": "Arbeitshöhe 8 m", "h": 0.8, "geraet": 95}, {"art": "Arbeitshöhe 12 m", "h": 1.2, "geraet": 140}]},
        {"kurz": "Schornstein-/Kamingerüst, {art}",
         "lang": "Arbeitsgerüst um einen Schornstein über Dach ({art}) mit Belag und Seitenschutz, aufbauen, 4 Wochen vorhalten, abbauen.",
         "einheit": "St", "kg": "392", "gen": "B",
         "varianten": [{"art": "bis 1,5 m über Dach", "h": 6, "geraet": 220}, {"art": "bis 4 m über Dach", "h": 10, "geraet": 380}]},
        {"kurz": "Treppenhausgerüst {art}",
         "lang": "Gerüst im Treppenhaus bzw. Treppenauge ({art}) mit Belägen in Podesthöhe, aufbauen, 4 Wochen vorhalten, abbauen. Abrechnung je Geschoss.",
         "einheit": "St", "kg": "392", "gen": "B",
         "varianten": [{"art": "Treppenauge bis 1,5 m", "h": 3, "geraet": 85}, {"art": "Treppenauge über 1,5 m", "h": 4.5, "geraet": 130}]},
        {"kurz": "Lastenaufzug am Gerüst {art}",
         "lang": "Gerüstaufzug ({art}) am Gerüst montieren, prüfen, vorhalten (Grundstandzeit) und demontieren.",
         "einheit": "St", "kg": "392", "gen": "B",
         "varianten": [{"art": "Seilwinde 200 kg bis 20 m", "h": 4, "geraet": 260}, {"art": "Schrägaufzug Dachdecker 250 kg", "h": 5, "geraet": 380},
                       {"art": "Zahnstangen-Materialaufzug 500 kg bis 30 m", "h": 10, "geraet": 950}]},
        {"kurz": "Wetterschutzdach über Gerüst, Spannweite {b} m",
         "lang": "Wetterschutzdach als Systemdach mit Planenbespannung auf dem Gerüst, Spannweite {b} m, aufbauen, 4 Wochen vorhalten, "
                 "abbauen. Abrechnung nach überdachter Grundfläche.",
         "einheit": "m²", "kg": "392", "gen": "C",
         "varianten": [{"b": "bis 12", "h": 0.45, "geraet": 9}, {"b": "bis 20", "h": 0.55, "geraet": 12}, {"b": "bis 30", "h": 0.7, "geraet": 16}]},
        {"kurz": "Gerüstprüfung und Statik, {art}",
         "lang": "{art} durch fachkundige Person bzw. Tragwerksplaner, einschließlich Dokumentation.",
         "einheit": "psch", "kg": "392", "gen": "C",
         "varianten": [{"art": "Standsicherheitsnachweis für Sondergerüst", "h": 0, "geraet": 1200}, {"art": "wiederkehrende Gerüstprüfung", "h": 1.5, "geraet": 0}]},
    ]},
]
