# LB 055 Ersatzstromversorgungsanlagen – eigene Texte und Ansätze (Preisstand 11/2026)

ORT = [{}, {"k": "Bestand", "t": "Einbau im Bestand mit Umschaltung im laufenden Betrieb (Nachtarbeit nach Absprache gesondert).", "fh": 1.35, "gen": "C", "tags": ["altbau"]}]
AUFST = [{"k": "innen", "t": "Aufstellung in einem Betriebsraum, Zu- und Abluft sowie Abgasführung gesondert."},
         {"k": "Haube außen", "t": "Aufstellung im Freien in schallgedämmter, wetterfester Haube (Schalldruck ≤ 65 dB(A) in 7 m).", "fm": 1.22}]
TANK = [{"k": "Tagestank 8 h", "t": "Mit integriertem Tagestank für 8 h Volllast."}, {"k": "Tank 24 h", "t": "Mit Tank für 24 h Volllast, doppelwandig mit Leckanzeige.", "fm": 1.08}]
BATT = [{"k": "10 min", "t": "Überbrückungszeit 10 min bei Volllast."}, {"k": "30 min", "t": "Überbrückungszeit 30 min bei Volllast.", "fm": 1.4},
        {"k": "60 min", "t": "Überbrückungszeit 60 min bei Volllast.", "fm": 1.9, "gen": "C"}]
NETZ = [{"k": "Blei", "t": "Batterien Blei-VRLA, Lebensdauer 10 Jahre."}, {"k": "LiFePO4", "t": "Batterien Lithium-Eisenphosphat mit BMS.", "fm": 1.35}]

WART = [{}, {"k": "Wartung 2 J.", "t": "Einschließlich Wartung mit jährlicher Prüfung und Protokoll in den ersten zwei Betriebsjahren.", "h": 10, "mat": 650}]
NEAERT = [{}, {"k": "Sync", "t": "Mit Synchronisiereinrichtung für unterbrechungsfreie Rücksynchronisation und Netzparallelbetrieb.", "fm": 1.12, "h": 6}]

LBS = [{
    "nr": "055", "name": "Ersatzstromversorgungsanlagen", "atv": "DIN 18382", "lohn": "elektro",
    "gruppen": [
        {"name": "Netzersatzanlagen", "positionen": [
            {"kurz": "Netzersatzanlage Diesel, {p} kVA",
             "lang": "Netzersatzaggregat mit Dieselmotor und Synchrongenerator, Dauerleistung {p} kVA (PRP), mit Steuerung, automatischer Netzumschaltung, "
                     "Batterieladegerät, Kühlwasservorwärmung und Schwingungsdämpfern, angeliefert, aufgestellt, angeschlossen und mit Probelauf unter Last in Betrieb genommen.",
             "einheit": "St", "kg": "441", "gen": "C", "achsen": [AUFST, TANK, NEAERT, ORT, WART],
             "varianten": [{"p": "20", "h": 24, "mat": 16500}, {"p": "40", "h": 28, "mat": 23500}, {"p": "80", "h": 34, "mat": 36000},
                           {"p": "150", "h": 42, "mat": 54000}, {"p": "300", "h": 56, "mat": 92000}, {"p": "500", "h": 72, "mat": 135000}]},
            {"kurz": "Netzumschaltung (ATS) {i} A",
             "lang": "Automatische Netzumschalteinrichtung mit motorbetätigten Lastschaltern bzw. Schützen, Bemessungsstrom {i} A, im Verteiler eingebaut.",
             "einheit": "St", "kg": "441", "gen": "C", "achsen": [ORT],
             "varianten": [{"i": "63", "h": 6, "mat": 1650}, {"i": "160", "h": 8, "mat": 3200}, {"i": "400", "h": 12, "mat": 6800}, {"i": "800", "h": 16, "mat": 12500}]},
            {"kurz": "Abgasanlage NEA Edelstahl, DN {dn}",
             "lang": "Abgasleitung für Netzersatzanlage aus Edelstahl, doppelwandig gedämmt, mit Schalldämpfer, Kompensator und Regenhaube, DN {dn}, je m Leitung.",
             "einheit": "m", "kg": "441", "gen": "C", "lohn": "heizung", "achsen": [ORT],
             "varianten": [{"dn": "80", "h": 1.2, "mat": 145}, {"dn": "125", "h": 1.5, "mat": 210}, {"dn": "200", "h": 2.0, "mat": 340}]},
            {"kurz": "Einspeisesteckdose für mobiles Aggregat, {i} A",
             "lang": "Einspeisevorrichtung CEE für mobiles Ersatzstromaggregat mit Umschalter (Netz – 0 – Aggregat), Bemessungsstrom {i} A.",
             "einheit": "St", "kg": "441", "gen": "B", "achsen": [ORT],
             "varianten": [{"i": "32", "h": 4, "mat": 420}, {"i": "63", "h": 5, "mat": 780}, {"i": "125", "h": 7, "mat": 1450}]},
            {"kurz": "Probelauf/Wartung Netzersatzanlage jährlich, bis {p} kVA",
             "lang": "Jährliche Wartung und Prüfung der Netzersatzanlage nach DIN VDE 0100-560 bzw. Herstellervorgabe mit Lastprobe, Protokoll, Stoffe ohne Kraftstoff.",
             "einheit": "St", "kg": "441", "gen": "B",
             "varianten": [{"p": "80", "h": 6, "mat": 280}, {"p": "300", "h": 10, "mat": 520}, {"p": "500", "h": 14, "mat": 780}]},
        ]},
        {"name": "USV-Anlagen", "positionen": [
            {"kurz": "USV-Anlage online (VFI), {p} kVA",
             "lang": "Unterbrechungsfreie Stromversorgung in Online-Doppelwandlertechnik (VFI-SS-111) nach DIN EN 62040, Leistung {p} kVA, mit Bypass, "
                     "Netzwerkkarte, Batterieschrank, montiert, angeschlossen und in Betrieb genommen.",
             "einheit": "St", "kg": "441", "gen": "C", "achsen": [BATT, NETZ, ORT, WART],
             "varianten": [{"p": "3", "h": 4, "mat": 1650}, {"p": "10", "h": 8, "mat": 4800}, {"p": "20", "h": 12, "mat": 8900},
                           {"p": "40", "h": 16, "mat": 15800}, {"p": "80", "h": 24, "mat": 28500}, {"p": "160", "h": 34, "mat": 52000}]},
            {"kurz": "Wartungsbypass extern für USV, {p} kVA",
             "lang": "Externer Handumgehungsschalter (Wartungsbypass) für die USV, Leistung bis {p} kVA, im Wandgehäuse.",
             "einheit": "St", "kg": "441", "gen": "B", "achsen": [ORT],
             "varianten": [{"p": "10", "h": 3, "mat": 480}, {"p": "40", "h": 4, "mat": 980}, {"p": "160", "h": 6, "mat": 2400}]},
        ]},
        {"name": "Batteriespeicher (Eigenstrom)", "positionen": [
            {"kurz": "Batteriespeicher Lithium, {c} kWh, Wechselrichter {p} kW",
             "lang": "Stationärer Batteriespeicher Lithium-Eisenphosphat für PV-Eigenverbrauch, nutzbare Kapazität {c} kWh, mit Hybrid- bzw. "
                     "Batteriewechselrichter {p} kW, Energiemanager und Anbindung an die PV-Anlage, montiert und in Betrieb genommen.",
             "einheit": "St", "kg": "442", "gen": "C",
             "achsen": [[{"k": "ohne Notstrom", "t": "Ohne Notstromfunktion."}, {"k": "mit Ersatzstrom", "t": "Mit automatischer Ersatzstromumschaltung für ausgewählte Stromkreise.", "h": 4, "mat": 750}], ORT],
             "varianten": [{"c": "5", "p": "5", "h": 8, "mat": 3900}, {"c": "10", "p": "8", "h": 10, "mat": 6200}, {"c": "15", "p": "10", "h": 12, "mat": 8400},
                           {"c": "30", "p": "20", "h": 18, "mat": 15500}, {"c": "60", "p": "30", "h": 26, "mat": 28000}]},
        ]},
    ],
}]
