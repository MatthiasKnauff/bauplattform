# LB 035 Korrosionsschutzarbeiten an Stahl- und Aluminiumbauten – eigene Texte und Ansätze (Preisstand 11/2026)

ORT = [{}, {"k": "Bestand", "t": "Ausführung an bestehender Konstruktion bei laufender Nutzung, mit Abdecken angrenzender Bauteile.",
            "fh": 1.3, "gen": "B", "tags": ["altbau"]},
       {"k": "H > 4 m", "t": "Arbeitshöhe über 4 m, Hubarbeitsbühne bzw. Gerüst wird gesondert vergütet.", "fh": 1.15}]
GLIED = [{"k": "flächig", "t": "Flächige, gut zugängliche Bauteile (Träger, Stützen, Bleche)."},
         {"k": "gegliedert", "t": "Stark gegliederte Bauteile (Fachwerke, Geländer, Gitterkonstruktionen), Abrechnung nach abgewickelter Fläche.",
          "fh": 1.45, "fm": 1.15}]
KORR = [{"k": "C2", "t": "Korrosivitätskategorie C2 nach DIN EN ISO 12944-2, Schutzdauer mittel (M)."},
        {"k": "C3", "t": "Korrosivitätskategorie C3, Schutzdauer hoch (H).", "fh": 1.15, "fm": 1.2},
        {"k": "C4", "t": "Korrosivitätskategorie C4, Schutzdauer hoch (H).", "fh": 1.3, "fm": 1.45, "gen": "B"},
        {"k": "C5", "t": "Korrosivitätskategorie C5, Schutzdauer hoch (H), Schichtdicken nach Systemblatt.", "fh": 1.45, "fm": 1.8, "gen": "C"}]

LBS = [{
    "nr": "035", "name": "Korrosionsschutzarbeiten an Stahl- und Aluminiumbauten", "atv": "DIN 18364", "lohn": "maler",
    "gruppen": [
        {"name": "Oberflächenvorbereitung", "positionen": [
            {"kurz": "Strahlen Stahloberfläche, Vorbereitungsgrad {sa}",
             "lang": "Stahloberflächen durch Strahlen mit mineralischem Strahlmittel auf den Vorbereitungsgrad {sa} nach DIN EN ISO 12944-4 "
                     "vorbereiten, einschließlich Abdecken angrenzender Flächen, Absaugen und Entsorgen des Strahlguts. "
                     "Abrechnung nach beschichteter Fläche.",
             "einheit": "m²", "kg": "359", "gen": "B", "achsen": [GLIED, ORT],
             "varianten": [{"sa": "Sa 2", "h": 0.25, "mat": 3.0, "geraet": 4.0}, {"sa": "Sa 2½", "h": 0.32, "mat": 3.8, "geraet": 5.0},
                           {"sa": "Sa 3", "h": 0.42, "mat": 4.6, "geraet": 6.5}]},
            {"kurz": "Entrostung Hand/masch. {st}",
             "lang": "Lose Beschichtung, Rost und Zunder von Hand bzw. maschinell (Drahtbürste, Schleifer, Nadelpistole) entfernen, "
                     "Vorbereitungsgrad {st}, Oberfläche entstauben.",
             "einheit": "m²", "kg": "359", "gen": "B", "achsen": [GLIED, ORT],
             "varianten": [{"st": "St 2", "h": 0.30, "mat": 0.8}, {"st": "St 3", "h": 0.45, "mat": 1.2}, {"st": "PSt 3 (punktweise)", "h": 0.20, "mat": 0.6}]},
            {"kurz": "Feuerverzinkte Oberfläche sweepen",
             "lang": "Feuerverzinkte Oberflächen für die nachfolgende Beschichtung (Duplex-System) durch leichtes Sweep-Strahlen "
                     "aufrauen, Zinkschicht nicht durchbrechen, entstauben.",
             "einheit": "m²", "kg": "359", "gen": "B", "h": 0.18, "mat": 2.0, "geraet": 3.0, "achsen": [GLIED, ORT]},
            {"kurz": "Reinigen und Entfetten, {art}",
             "lang": "Oberflächen von Fett, Öl, Salzen und Schmutz reinigen ({art}), mit klarem Wasser nachwaschen, trocknen lassen.",
             "einheit": "m²", "kg": "359", "gen": "A", "achsen": [GLIED, ORT],
             "varianten": [{"art": "ammoniakalische Netzmittelwäsche", "h": 0.10, "mat": 0.9},
                           {"art": "Hochdruckwasserstrahlen", "h": 0.08, "mat": 0.4, "geraet": 1.2}]},
        ]},
        {"name": "Beschichtungssysteme", "positionen": [
            {"kurz": "Grundbeschichtung {sys}, {sd} µm",
             "lang": "Grundbeschichtung auf vorbereitete Stahloberfläche aufbringen, Beschichtungsstoff {sys}, Sollschichtdicke "
                     "trocken {sd} µm, im Streich- bzw. Spritzverfahren, Kanten und Schweißnähte vorlegen.",
             "einheit": "m²", "kg": "359", "gen": "A", "achsen": [GLIED, KORR, ORT],
             "varianten": [{"sys": "Alkydharz-Zinkphosphat", "sd": "60", "h": 0.12, "mat": 3.2},
                           {"sys": "Epoxid-Zinkphosphat", "sd": "80", "h": 0.13, "mat": 4.8},
                           {"sys": "Epoxid-Zinkstaub", "sd": "60", "h": 0.14, "mat": 7.5},
                           {"sys": "Haftvermittler für Zink/Alu", "sd": "40", "h": 0.10, "mat": 3.6}]},
            {"kurz": "Zwischenbeschichtung {sys}, {sd} µm",
             "lang": "Zwischenbeschichtung auf Grundbeschichtung, Beschichtungsstoff {sys}, Sollschichtdicke trocken {sd} µm, "
                     "farblich abgesetzt zur Kontrolle.",
             "einheit": "m²", "kg": "359", "gen": "A", "achsen": [GLIED, KORR, ORT],
             "varianten": [{"sys": "Alkydharz", "sd": "60", "h": 0.11, "mat": 3.0}, {"sys": "Epoxid-Eisenglimmer", "sd": "100", "h": 0.13, "mat": 5.6},
                           {"sys": "Epoxid", "sd": "80", "h": 0.12, "mat": 4.6}]},
            {"kurz": "Deckbeschichtung {sys}, {sd} µm, Farbton RAL",
             "lang": "Deckbeschichtung in Farbton nach RAL (Standardfarbton), Beschichtungsstoff {sys}, Sollschichtdicke trocken {sd} µm, "
                     "gleichmäßig deckend.",
             "einheit": "m²", "kg": "359", "gen": "A", "achsen": [GLIED, KORR, ORT],
             "varianten": [{"sys": "Alkydharz", "sd": "40", "h": 0.11, "mat": 3.2}, {"sys": "Polyurethan (PUR) acrylisch", "sd": "60", "h": 0.12, "mat": 5.8},
                           {"sys": "Acrylharz wasserverdünnbar", "sd": "60", "h": 0.12, "mat": 4.4}, {"sys": "Polysiloxan", "sd": "80", "h": 0.13, "mat": 9.8}]},
            {"kurz": "Duplex-Beschichtung auf Feuerverzinkung, {n}-schichtig",
             "lang": "Beschichtungssystem auf feuerverzinktem Stahl (Duplex-System) aus Haftgrund und Deckbeschichtung, {n}-schichtig, "
                     "Gesamtschichtdicke nach Systemblatt, Farbton RAL.",
             "einheit": "m²", "kg": "359", "gen": "B", "achsen": [GLIED, KORR, ORT],
             "varianten": [{"n": "2", "h": 0.24, "mat": 8.5}, {"n": "3", "h": 0.34, "mat": 12.0}]},
            {"kurz": "Beschichtung Aluminiumbauteile, {n}-schichtig",
             "lang": "Aluminiumoberflächen anschleifen, mit Haftvermittler grundieren und mit {n} Deckbeschichtung(en) auf PUR-Basis "
                     "versehen, Farbton RAL.",
             "einheit": "m²", "kg": "359", "gen": "B", "achsen": [GLIED, ORT],
             "varianten": [{"n": "1", "h": 0.28, "mat": 6.5}, {"n": "2", "h": 0.38, "mat": 9.5}]},
            {"kurz": "Kantenschutz/Streifenbeschichtung Kanten, Nähte",
             "lang": "Zusätzliche Streifenbeschichtung an Kanten, Schweißnähten, Schrauben und Ecken vor jeder Schicht mit dem Pinsel.",
             "einheit": "m", "kg": "359", "gen": "A", "h": 0.04, "mat": 0.5, "achsen": [KORR, ORT]},
            {"kurz": "Ausbessern Beschichtung, Fehlstellen bis {g}",
             "lang": "Beschädigte Beschichtung (Transport- und Montageschäden) punktweise entrosten, Grund-, Zwischen- und "
                     "Deckbeschichtung systemgerecht ergänzen. Fehlstellengröße bis {g}.",
             "einheit": "St", "kg": "359", "gen": "B", "achsen": [KORR, ORT],
             "varianten": [{"g": "0,01 m²", "h": 0.15, "mat": 1.0}, {"g": "0,05 m²", "h": 0.30, "mat": 2.0}, {"g": "0,25 m²", "h": 0.70, "mat": 4.5}]},
        ]},
        {"name": "Brandschutz- und Sonderbeschichtungen", "positionen": [
            {"kurz": "Brandschutzbeschichtung Stahl {r}, U/A bis {ua}",
             "lang": "Dämmschichtbildende Brandschutzbeschichtung auf Stahlbauteile mit allgemeiner Bauartgenehmigung, Feuerwiderstand {r}, "
                     "Profilfaktor U/A bis {ua} m⁻¹, einschließlich Grundierung nach Zulassung, Schichtdickenmessung und Kennzeichnung.",
             "einheit": "m²", "kg": "359", "gen": "C", "achsen": [GLIED, ORT],
             "varianten": [{"r": "R 30", "ua": "160", "h": 0.45, "mat": 18}, {"r": "R 30", "ua": "300", "h": 0.55, "mat": 26},
                           {"r": "R 60", "ua": "160", "h": 0.75, "mat": 42}, {"r": "R 60", "ua": "250", "h": 0.95, "mat": 58},
                           {"r": "R 90", "ua": "160", "h": 1.20, "mat": 85}]},
            {"kurz": "Deckbeschichtung auf BS-Beschichtung, {o}",
             "lang": "Systemzugehörige Deckbeschichtung auf dämmschichtbildende Brandschutzbeschichtung, {o}, Farbton RAL.",
             "einheit": "m²", "kg": "359", "gen": "B", "achsen": [GLIED, ORT],
             "varianten": [{"o": "innen", "h": 0.12, "mat": 4.5}, {"o": "außen bzw. Feuchtbereich", "h": 0.14, "mat": 6.8}]},
            {"kurz": "Beschichtung Stahlbeton-Einbauteile/Ankerschienen, punktweise",
             "lang": "Kleinteilige Stahleinbauteile, Anker, Konsolen und Befestigungen mit Zinkstaub-Grund und Deckanstrich versehen.",
             "einheit": "St", "kg": "359", "gen": "B", "h": 0.20, "mat": 2.5, "achsen": [KORR, ORT]},
            {"kurz": "Schichtdickenmessung und Protokoll",
             "lang": "Trockenschichtdicken je Bauteilgruppe nach DIN EN ISO 19840 messen und protokollieren, Haftfestigkeitsprüfung "
                     "durch Gitterschnitt an Probestellen.",
             "einheit": "psch", "kg": "359", "gen": "B", "h": 4.0, "mat": 20},
            {"kurz": "Kontrollfläche anlegen nach DIN EN ISO 12944-8",
             "lang": "Kontrollfläche je Beschichtungssystem anlegen, kennzeichnen und dokumentieren, Größe ca. 10 m².",
             "einheit": "St", "kg": "359", "gen": "B", "h": 3.0, "mat": 35},
        ]},
    ],
}]


# Alkydharz-Systeme nur bis Korrosivitätskategorie C3 (DIN EN ISO 12944-5)
for _g in LBS[0]["gruppen"]:
    for _p in _g["positionen"]:
        if _p.get("achsen") == [GLIED, KORR, ORT]:
            for _v in _p.get("varianten") or []:
                if str(_v.get("sys", "")).startswith("Alkydharz"):
                    _v["achsen"] = [GLIED, KORR[:2], ORT]
