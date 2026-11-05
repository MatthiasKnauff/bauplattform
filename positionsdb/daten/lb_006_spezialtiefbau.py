# LB 006 Spezialtiefbau (Baugrubenverbau, Pfähle) – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "006", "name": "Spezialtiefbauarbeiten", "atv": "DIN 18303 / DIN 18301 / DIN 18304", "lohn": "spezialtiefbau", "kg": "312",
    "gruppen": [
        {"name": "Baugrubenverbau", "positionen": [
            {"kurz": "Baustelleneinrichtung Spezialtiefbaugerät {g}",
             "lang": "An- und Abtransport, Auf- und Abbau des Spezialtiefbaugeräts {g} einschließlich Arbeitsplanum "
                     "prüfen, Umsetzen innerhalb der Baustelle anteilig.",
             "einheit": "psch", "gen": "C",
             "varianten": [{"g": "für Trägerbohlwand (Bohr- bzw. Rammgerät)", "h": 16, "geraet": 4200},
                           {"g": "für Spundwand (Vibrationsramme)", "h": 16, "geraet": 4800},
                           {"g": "für Bohrpfähle (Drehbohrgerät)", "h": 24, "geraet": 9500}]},
            {"kurz": "Trägerbohlwand, Verbautiefe bis {t} m, Holzausfachung",
             "lang": "Trägerbohlwand (Berliner Verbau) nach statischer Berechnung des Auftragnehmers herstellen: "
                     "Stahlträger in vorgebohrte bzw. gerammte Bohrlöcher einbringen, Ausfachung mit Kanthölzern bzw. "
                     "Bohlen abschnittsweise mit dem Aushub einbauen, nach Verfüllung der Arbeitsräume Träger ziehen. "
                     "Verbautiefe bis {t} m. Abrechnung nach Ansichtsfläche der Ausfachung.",
             "einheit": "m²", "gen": "C",
             "varianten": [{"t": "4", "h": 1.2, "mat": 38, "geraet": 55}, {"t": "6", "h": 1.4, "mat": 45, "geraet": 68}]},
            {"kurz": "Stahlspundwand, eingerammt/eingerüttelt, Profil nach Statik, wiedergewonnen",
             "lang": "Stahlspundwand aus gemieteten Spundbohlen nach Statik mit Vibrationsramme einbringen, "
                     "für die Bauzeit (bis 3 Monate) vorhalten und nach Gebrauch ziehen. Erschütterungsüberwachung "
                     "gesondert. Abrechnung nach Wandfläche (Rammtiefe × Länge).",
             "einheit": "m²", "h": 0.55, "geraet": 105, "gen": "C"},
            {"kurz": "Rückverankerung Verbau, Verpressanker, Länge bis {l} m",
             "lang": "Temporären Verpressanker nach DIN EN 1537 herstellen, Länge bis {l} m, mit Prüfung und "
                     "Abnahme, Gurtung anteilig.",
             "einheit": "St", "gen": "C",
             "varianten": [{"l": "10", "h": 6, "mat": 300, "geraet": 520}, {"l": "15", "h": 8, "mat": 420, "geraet": 680}]},
            {"kurz": "Unterfangung von Nachbarfundamenten im Düsenstrahlverfahren",
             "lang": "Unterfangung bzw. Abdichtungskörper im Düsenstrahlverfahren (HDI) nach DIN EN 12716 "
                     "herstellen, Säulendurchmesser nach Statik, Abrechnung nach hergestelltem Körpervolumen.",
             "einheit": "m³", "h": 3.0, "mat": 160, "geraet": 520, "gen": "C"},
            {"kurz": "Beweissicherung Nachbargebäude vor/nach Baumaßnahme",
             "lang": "Zustand der Nachbargebäude durch öffentlich bestellten Sachverständigen mit Fotos und "
                     "Rissprotokoll vor Beginn und nach Abschluss der Arbeiten dokumentieren. Je Gebäude.",
             "einheit": "St", "h": 0, "geraet": 1350, "gen": "C", "kg": "391"},
        ]},
        {"name": "Pfahlgründungen", "positionen": [
            {"kurz": "Bohrpfahl Ø {d} cm, Stahlbeton C30/37, Länge bis 12 m",
             "lang": "Ortbeton-Bohrpfahl nach DIN EN 1536 verrohrt herstellen, Durchmesser {d} cm, Beton C30/37, "
                     "Bewehrungskorb gesondert, Pfahlkopf kappen gesondert. Abrechnung nach Pfahllänge ab "
                     "Arbeitsebene bis Pfahlfuß.",
             "einheit": "m", "gen": "C", "kg": "323",
             "varianten": [{"d": "62", "h": 0.8, "mat": 55, "geraet": 115}, {"d": "90", "h": 1.1, "mat": 115, "geraet": 175},
                           {"d": "120", "h": 1.5, "mat": 205, "geraet": 255}]},
            {"kurz": "Bewehrungskorb für Bohrpfähle, B500B",
             "lang": "Bewehrungskörbe für Bohrpfähle aus Betonstahl B500B nach Bewehrungsplan herstellen, "
                     "mit Abstandhaltern einbauen. Abrechnung nach Gewicht.",
             "einheit": "t", "h": 14, "mat": 950, "gen": "B", "kg": "323"},
            {"kurz": "Pfahlkopf kappen und Bewehrung freilegen",
             "lang": "Überbeton am Pfahlkopf bis Sollhöhe abstemmen, Bewehrung freilegen und reinigen, "
                     "Abbruch abfahren. Je Pfahl bis Ø 90 cm.",
             "einheit": "St", "h": 3.5, "geraet": 60, "gen": "B", "kg": "323"},
            {"kurz": "Rammpfahl Stahlbetonfertigteil {q} cm",
             "lang": "Stahlbeton-Fertigteilrammpfahl, Querschnitt {q} cm, liefern und bis zur rechnerischen "
                     "Absetztiefe rammen, Rammprotokoll führen. Abrechnung nach eingebauter Pfahllänge.",
             "einheit": "m", "gen": "C", "kg": "323",
             "varianten": [{"q": "30 × 30", "h": 0.3, "mat": 55, "geraet": 32}, {"q": "40 × 40", "h": 0.4, "mat": 85, "geraet": 40}]},
            {"kurz": "Pfahlprobebelastung statisch",
             "lang": "Statische Probebelastung eines Pfahls nach EA-Pfähle mit Widerlagerkonstruktion durchführen, "
                     "auswerten und dokumentieren.",
             "einheit": "St", "h": 24, "geraet": 20000, "gen": "C", "kg": "323"},
        ]},
    ],
}]
