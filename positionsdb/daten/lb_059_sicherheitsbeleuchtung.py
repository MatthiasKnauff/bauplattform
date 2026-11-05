# LB 059 Sicherheitsbeleuchtungsanlagen – eigene Texte und Ansätze (Preisstand 11/2026)

ORT = [{}, {"k": "Bestand", "t": "Montage im Bestand bei laufender Nutzung, Leitungswege an Vorhandenes anpassen.", "fh": 1.3, "gen": "C", "tags": ["altbau"]}]
MONT = [{"k": "Decke", "t": "Montage an der Decke."}, {"k": "Wand", "t": "Montage an der Wand."},
        {"k": "Pendelmontage", "t": "Abgependelt mit Seilabhängung bis 1,5 m.", "h": 0.3, "mat": 25},
        {"k": "in Unterdecke", "t": "Einbau in Unterdecke mit Einbaurahmen.", "h": 0.15, "mat": 18}]
VERS = [{"k": "ZB", "t": "Versorgung über Zentralbatterieanlage, mit Einzelleuchtenüberwachung (Adresse)."},
        {"k": "EB", "t": "Versorgung über Einzelbatterie (NiMH bzw. LiFePO4, 3 h), mit Selbsttestfunktion.", "mat": 75}]
HOEHE = [{}, {"k": "H > 4 m", "t": "Montagehöhe über 4 m, Hubarbeitsbühne gesondert.", "fh": 1.25}]

LBS = [{
    "nr": "059", "name": "Sicherheitsbeleuchtungsanlagen", "atv": "DIN 18382", "lohn": "elektro",
    "gruppen": [
        {"name": "Zentrale Stromversorgung", "positionen": [
            {"kurz": "ZBanlage CPS, {p} W / 3 h, {k_} Stromkreise",
             "lang": "Zentrale Stromversorgungsanlage (CPS) nach DIN EN 50171 im Schrankgehäuse mit Ladeteil, Überwachungsrechner, Prüfbuch "
                     "elektronisch, Anschluss an Gebäudeleittechnik, Bemessungsleistung {p} W für 3 h Betriebsdauer, {k_} Endstromkreise. "
                     "Mit verschlossenen Blei-Batterien (Lebensdauer 10 Jahre) im Batterieschrank, montiert, angeschlossen und in Betrieb genommen.",
             "einheit": "St", "kg": "445", "gen": "C", "achsen": [ORT, [{}, {"k": "Funktionserhalt-Raum", "t": "Aufstellung in eigenem Raum mit Lüftung nach DIN EN IEC 62485-2, Lüftungsnachweis.", "h": 3, "mat": 350}]],
             "varianten": [{"p": "500", "k_": "4", "h": 16, "mat": 6200}, {"p": "1.000", "k_": "8", "h": 20, "mat": 8900},
                           {"p": "2.000", "k_": "16", "h": 26, "mat": 13800}, {"p": "4.000", "k_": "24", "h": 34, "mat": 21500},
                           {"p": "8.000", "k_": "40", "h": 46, "mat": 36000}]},
            {"kurz": "Unterstation Sicherheitsbeleuchtung, {k_} Stromkreise",
             "lang": "Unterstation in E30-Gehäuse für die Verteilung der Sicherheitsbeleuchtung im Brandabschnitt, {k_} überwachte Endstromkreise, "
                     "Busverbindung zur Zentrale.",
             "einheit": "St", "kg": "445", "gen": "C", "achsen": [ORT],
             "varianten": [{"k_": "4", "h": 6, "mat": 1650}, {"k_": "8", "h": 8, "mat": 2600}, {"k_": "12", "h": 10, "mat": 3500}]},
            {"kurz": "Netzüberwachung 3-phasig für Sicherheitsbeleuchtung",
             "lang": "Dreiphasige Netzwächter-Baugruppe zur Überwachung der allgemeinen Unterverteilung, Busanschluss, in Unterverteilung eingebaut.",
             "einheit": "St", "kg": "445", "gen": "B", "h": 1.5, "mat": 165, "achsen": [ORT]},
            {"kurz": "Leitung Funktionserhalt E30, {q}",
             "lang": "Kabel mit Funktionserhalt (z. B. NHXH-J FE180/E30) auf geprüftem Verlegesystem E30 verlegen, einschließlich Befestigung und Abschottungen anteilig, Querschnitt {q}.",
             "einheit": "m", "kg": "445", "gen": "B", "achsen": [ORT, [{"k": "Einzelschelle", "t": "Verlegung mit Einzelschellen."}, {"k": "auf Kabelrinne E30", "t": "Verlegung auf Kabelrinne E30 (Rinne gesondert).", "fh": 0.7}]],
             "varianten": [{"q": "3 × 1,5 mm²", "h": 0.14, "mat": 4.8}, {"q": "3 × 2,5 mm²", "h": 0.15, "mat": 6.2}, {"q": "5 × 2,5 mm²", "h": 0.18, "mat": 9.5},
                           {"q": "5 × 6 mm²", "h": 0.22, "mat": 18}]},
        ]},
        {"name": "Sicherheits- und Rettungszeichenleuchten", "positionen": [
            {"kurz": "Rettungszeichenl., Erk.-weite {w} m, {s}",
             "lang": "Rettungszeichenleuchte LED nach DIN EN 1838 / DIN EN ISO 7010, Erkennungsweite {w} m, {s}, Piktogramm nach Fluchtwegplan, "
                     "Schutzart IP 40, Dauerschaltung, montiert und angeschlossen.",
             "einheit": "St", "kg": "445", "gen": "B", "achsen": [VERS, MONT, ORT, HOEHE],
             "varianten": [{"w": "22", "s": "einseitig", "h": 0.8, "mat": 145}, {"w": "22", "s": "doppelseitig", "h": 0.9, "mat": 175},
                           {"w": "30", "s": "einseitig", "h": 0.9, "mat": 190}, {"w": "40", "s": "doppelseitig", "h": 1.0, "mat": 260}]},
            {"kurz": "Sicherheitsleuchte {art}",
             "lang": "Sicherheitsleuchte LED für {art}, mit auf die Aufgabe abgestimmter Optik, Lichtstrom und Abstände nach lichttechnischer "
                     "Berechnung, montiert und angeschlossen.",
             "einheit": "St", "kg": "445", "gen": "B", "achsen": [VERS, MONT, ORT, HOEHE],
             "varianten": [{"art": "Rettungswege (Flurausleuchtung)", "h": 0.7, "mat": 125}, {"art": "Antipanikbeleuchtung Fläche", "h": 0.7, "mat": 135},
                           {"art": "Hallen / große Höhen (Spot)", "h": 0.9, "mat": 210}, {"art": "Außenbereich IP 65", "h": 1.0, "mat": 220}]},
            {"kurz": "Allgemeinleuchte mit Sicherheitsfunktion (Mischbetrieb), {art}",
             "lang": "Allgemeinbeleuchtungsleuchte mit integriertem Adressmodul für Sicherheitsbetrieb aus Zentralbatterie ({art}), Mehrpreis zur Standardleuchte.",
             "einheit": "St", "kg": "445", "gen": "B", "achsen": [ORT],
             "varianten": [{"art": "Downlight", "h": 0.3, "mat": 65}, {"art": "Langfeldleuchte", "h": 0.3, "mat": 70}, {"art": "Panel", "h": 0.3, "mat": 70}]},
            {"kurz": "Hinweisschild Fluchtweg nachleuchtend, {g}",
             "lang": "Langnachleuchtendes Sicherheitszeichen nach DIN ISO 7010 / DIN 67510, Größe {g}, auf Wand bzw. Tür geklebt oder geschraubt.",
             "einheit": "St", "kg": "445", "gen": "A", "achsen": [[{"k": "Kunststoff", "t": "Material Kunststoff."}, {"k": "Aluminium", "t": "Material Aluminium.", "mat": 12}], ORT],
             "varianten": [{"g": "200 × 100 mm", "h": 0.15, "mat": 9}, {"g": "300 × 150 mm", "h": 0.18, "mat": 15}, {"g": "400 × 200 mm", "h": 0.2, "mat": 24}]},
            {"kurz": "Bodennahe Leitmarkierung, {art}",
             "lang": "Bodennahe Sicherheitsleitmarkierung ({art}) im Verlauf der Rettungswege montieren.",
             "einheit": "m", "kg": "445", "gen": "B", "achsen": [ORT],
             "varianten": [{"art": "langnachleuchtendes Profil", "h": 0.12, "mat": 14}, {"art": "LED-Lichtband elektrisch", "h": 0.3, "mat": 48}]},
        ]},
        {"name": "Prüfung, Dokumentation", "positionen": [
            {"kurz": "Lichttechnische Berechnung Sicherheitsbeleuchtung, bis {a} m²",
             "lang": "Lichttechnische Berechnung der Sicherheitsbeleuchtung (Rettungswege, Antipanik, Arbeitsplätze mit besonderer Gefährdung) mit Leuchtenplan, bis {a} m² NGF.",
             "einheit": "psch", "kg": "445", "gen": "B",
             "varianten": [{"a": "1.000", "h": 6}, {"a": "5.000", "h": 14}, {"a": "15.000", "h": 28}]},
            {"kurz": "Erstprüfung und Beleuchtungsstärkemessung, je {n} Leuchten",
             "lang": "Erstprüfung der Sicherheitsbeleuchtungsanlage nach DIN EN 50172 / VDE 0108-100 mit Messung der Beleuchtungsstärken, Prüfbuch und Protokoll, je {n} Leuchten.",
             "einheit": "St", "kg": "445", "gen": "B",
             "varianten": [{"n": "25", "h": 4}, {"n": "100", "h": 10}, {"n": "250", "h": 20}]},
            {"kurz": "Fluchtweg- und Rettungsplan nach DIN ISO 23601, {g}",
             "lang": "Flucht- und Rettungsplan nach DIN ISO 23601 auf Grundlage der Grundrisse erstellen, drucken und gerahmt montieren, Format {g}.",
             "einheit": "St", "kg": "445", "gen": "B", "lohn": "baustelle",
             "varianten": [{"g": "DIN A3", "h": 2.5, "mat": 45}, {"g": "DIN A2", "h": 3, "mat": 70}]},
        ]},
    ],
}]
