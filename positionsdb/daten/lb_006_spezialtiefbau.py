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

# ---------------------------------------------------------------- Ausbau Runde 3 (Nacht 06.11.2026)
TIEFE = [{"k": "bis 4 m", "t": "Verbau- bzw. Bohrtiefe bis 4 m.", "fh": 0.9}, {"k": "bis 8 m", "t": "Tiefe über 4 bis 8 m."},
         {"k": "bis 12 m", "t": "Tiefe über 8 bis 12 m.", "fh": 1.12, "fg": 1.08}, {"k": "bis 18 m", "t": "Tiefe über 12 bis 18 m.", "fh": 1.25, "fg": 1.15, "gen": "C"}]
BODEN = [{"k": "", "t": "Boden nicht bindig bis bindig, ohne Hindernisse (Homogenbereich nach Baugrundgutachten)."},
         {"k": "steinig", "t": "Boden mit Steinen und Blöcken bzw. Hindernissen, erhöhter Bohr- bzw. Rammaufwand.", "fh": 1.3, "fg": 1.25, "gen": "C"},
         {"k": "Fels", "t": "Fels leicht bis mittelschwer lösbar, Bohrwerkzeug für Fels.", "fh": 1.6, "fg": 1.5, "gen": "C"}]
NACHB = [{"k": "", "t": ""}, {"k": "erschütterungsarm", "t": "Erschütterungsarme Ausführung neben empfindlicher Bebauung, mit Erschütterungsmessung.", "fh": 1.15, "fg": 1.2, "gen": "C"}]
RUECK6 = [{"k": "verbleibt", "t": "Verbauelemente verbleiben im Boden.", "fg": 1.0}, {"k": "rückgebaut", "t": "Verbauelemente nach Verfüllen ziehen bzw. rückbauen.", "fh": 1.2, "fg": 0.75}]

LBS[0]["gruppen"] += [
    {"name": "Verbau (Ergänzung)", "positionen": [
        {"kurz": "Trägerbohlwand {art}",
         "lang": "Trägerbohlwand (Berliner Verbau): Stahlträger in vorgebohrte Löcher einstellen bzw. rammen, Ausfachung {art} "
                 "abschnittsweise mit dem Aushub einbauen, Hohlräume verfüllen. Abrechnung nach Ansichtsfläche.",
         "einheit": "m²", "kg": "312", "gen": "B", "achsen": [TIEFE, BODEN, RUECK6],
         "varianten": [{"art": "Holzbohlen", "h": 0.9, "mat": 38, "geraet": 55}, {"art": "Stahlbeton-Fertigteilplatten", "h": 0.8, "mat": 62, "geraet": 55},
                       {"art": "Spritzbeton 15 cm bewehrt", "h": 1.0, "mat": 58, "geraet": 60, "achsen": [TIEFE, BODEN]}]},
        {"kurz": "Spundwand {prof}",
         "lang": "Stahlspundwand aus warmgewalzten Bohlen {prof}, Stahlgüte S240GP, einrütteln bzw. einpressen, Schlossdichtung "
                 "nach Erfordernis. Abrechnung nach Wandfläche (Ansicht).",
         "einheit": "m²", "kg": "312", "gen": "B", "achsen": [TIEFE, NACHB, RUECK6],
         "varianten": [{"prof": "AZ 13 (ca. 107 kg/m²)", "h": 0.45, "mat": 115, "geraet": 45}, {"prof": "AZ 18 (ca. 118 kg/m²)", "h": 0.5, "mat": 128, "geraet": 48},
                       {"prof": "AZ 26 (ca. 155 kg/m²)", "h": 0.55, "mat": 165, "geraet": 55}]},
        {"kurz": "Kanaldielen/Grabenverbau {art}",
         "lang": "Verbau für Leitungsgräben ({art}) einbauen, vorhalten und rückbauen. Abrechnung nach verbauter Wandfläche.",
         "einheit": "m²", "kg": "312", "gen": "A", "achsen": [TIEFE[:2], BODEN[:2]], "lohn": "erdbau",
         "varianten": [{"art": "Grabenverbaugeräte (Platten)", "h": 0.25, "geraet": 9}, {"art": "Kanaldielen", "h": 0.45, "geraet": 12},
                       {"art": "Gleitschienenverbau", "h": 0.35, "geraet": 16}]},
        {"kurz": "Verpressanker {art}, Länge {l} m",
         "lang": "Verpressanker als {art} nach DIN EN 1537, Länge {l} m, bohren, einbauen, verpressen, prüfen (Abnahmeprüfung) und "
                 "festlegen; einschließlich Gurtung anteilig.",
         "einheit": "St", "kg": "312", "gen": "C", "achsen": [BODEN, [{"k": "", "t": ""}, {"k": "ausbaubar", "t": "Ausbaubarer Litzenanker, nach Gebrauch ausbauen.", "h": 2, "mat": 180}]],
         "varianten": [{"art": "Kurzzeitanker (Litze)", "l": "12", "h": 6, "mat": 380, "geraet": 520}, {"art": "Kurzzeitanker (Litze)", "l": "18", "h": 8, "mat": 520, "geraet": 720},
                       {"achsen": [BODEN], "art": "Daueranker (Stab)", "l": "12", "h": 8, "mat": 720, "geraet": 650}, {"achsen": [BODEN], "art": "Daueranker (Stab)", "l": "18", "h": 10, "mat": 980, "geraet": 880}]},
        {"kurz": "Gurtung/Aussteifung Stahl",
         "lang": "Gurtung bzw. Aussteifung aus Walzprofilen für Verbau, liefern, einbauen, vorhalten, ausbauen. Abrechnung nach Gewicht.",
         "einheit": "t", "kg": "312", "gen": "B", "h": 14, "mat": 650, "geraet": 220, "lohn": "stahlbau"},
        {"kurz": "Spritzbetonsicherung {d} cm, {art}",
         "lang": "Böschungs- bzw. Wandsicherung aus Spritzbeton C25/30, Dicke {d} cm, {art}, im Trockenspritz- bzw. "
                 "Nassspritzverfahren, einschließlich Entwässerungsöffnungen. Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "312", "gen": "B", "achsen": [TIEFE[:3], [{"k": "", "t": ""}, {"k": "Bodennägel", "t": "Mit Bodenvernagelung (Nägel gesondert nach Stück).", "h": 0.2}]],
         "varianten": [{"d": "10", "art": "mit Baustahlmatte Q188", "h": 0.55, "mat": 32, "geraet": 22}, {"d": "15", "art": "mit Baustahlmatte Q257", "h": 0.7, "mat": 45, "geraet": 28},
                       {"d": "20", "art": "zweilagig bewehrt", "h": 0.95, "mat": 62, "geraet": 35}]},
        {"kurz": "Bodennagel {l} m",
         "lang": "Bodennagel als GEWI-Stab bzw. Selbstbohranker, Länge {l} m, bohren, verpressen, mit Ankerplatte anschließen.",
         "einheit": "St", "kg": "312", "gen": "C", "achsen": [BODEN],
         "varianten": [{"l": "4", "h": 1.5, "mat": 95, "geraet": 110}, {"l": "6", "h": 2, "mat": 135, "geraet": 150}, {"l": "9", "h": 2.8, "mat": 195, "geraet": 210}]},
        {"kurz": "Bohrpfahlwand {art}, Ø {d} mm",
         "lang": "Bohrpfahlwand als {art}, Pfahldurchmesser {d} mm, Beton C30/37, Bewehrung nach Statik gesondert, "
                 "einschließlich Leitwand anteilig. Abrechnung nach Wandfläche.",
         "einheit": "m²", "kg": "312", "gen": "C", "achsen": [TIEFE[1:], BODEN, NACHB],
         "varianten": [{"art": "aufgelöste Wand", "d": "620", "h": 1.2, "mat": 85, "geraet": 140}, {"art": "tangierende Wand", "d": "620", "h": 1.6, "mat": 120, "geraet": 190},
                       {"art": "überschnittene Wand", "d": "880", "h": 2.0, "mat": 165, "geraet": 260}]},
        {"kurz": "Schlitzwand d = {d} cm",
         "lang": "Schlitzwand im Greifer- bzw. Fräsverfahren unter Stützflüssigkeit, Dicke {d} cm, Beton C30/37 im Kontraktorverfahren, "
                 "Bewehrungskörbe gesondert, Leitwände und Entsorgung der Stützsuspension enthalten. Abrechnung nach Wandfläche.",
         "einheit": "m²", "kg": "312", "gen": "C", "achsen": [TIEFE[2:], BODEN],
         "varianten": [{"d": "60", "h": 1.6, "mat": 110, "geraet": 210}, {"d": "80", "h": 1.9, "mat": 145, "geraet": 250}, {"d": "100", "h": 2.2, "mat": 180, "geraet": 290}]},
        {"kurz": "Düsenstrahlverfahren (HDI) {art}",
         "lang": "Bodenvermörtelung im Düsenstrahlverfahren für {art}, Säulen nach Ausführungsplan, Zementsuspension, "
                 "Rückflussentsorgung enthalten. Abrechnung nach hergestelltem Körpervolumen.",
         "einheit": "m³", "kg": "321", "gen": "C", "achsen": [NACHB],
         "varianten": [{"art": "Unterfangung", "h": 3.5, "mat": 180, "geraet": 380}, {"art": "Baugrubensohle/Dichtsohle", "h": 2.5, "mat": 150, "geraet": 300},
                       {"art": "Lückenschluss/Abdichtung", "h": 3.0, "mat": 170, "geraet": 340}]},
        {"kurz": "Unterfangung Bestandsfundament, {art}",
         "lang": "Unterfangung eines bestehenden Fundaments in Abschnitten ({art}) nach DIN 4123 bzw. Statik, mit Überwachung der Bestandsbebauung. Abrechnung nach Länge.",
         "einheit": "m", "kg": "394", "gen": "C", "lohn": "rohbau", "tags": ["altbau"],
         "varianten": [{"art": "Beton in Abschnitten bis 1,25 m Breite, Tiefe bis 1 m", "h": 9, "mat": 160, "geraet": 40},
                       {"art": "Beton in Abschnitten, Tiefe bis 2 m", "h": 15, "mat": 290, "geraet": 70}]},
    ]},
    {"name": "Pfähle (Ergänzung)", "positionen": [
        {"kurz": "Bohrpfahl Ø {d} mm",
         "lang": "Großbohrpfahl verrohrt gebohrt, Durchmesser {d} mm, Beton C30/37 im Kontraktorverfahren, Bewehrung gesondert, "
                 "Pfahlkopf abstemmen anteilig. Abrechnung nach Pfahllänge.",
         "einheit": "m", "kg": "323", "gen": "C", "achsen": [TIEFE[1:], BODEN, NACHB],
         "varianten": [{"d": "620", "h": 1.0, "mat": 70, "geraet": 100}, {"d": "880", "h": 1.3, "mat": 140, "geraet": 140},
                       {"d": "1200", "h": 1.8, "mat": 260, "geraet": 200}]},
        {"kurz": "Mikropfahl {art}",
         "lang": "Verpresspfahl kleinen Durchmessers ({art}) nach DIN EN 14199, bohren, einbauen, verpressen, Pfahlkopf mit Kopfplatte. Abrechnung nach Pfahllänge.",
         "einheit": "m", "kg": "323", "gen": "C", "achsen": [TIEFE, BODEN, [{"k": "", "t": ""}, {"k": "innen", "t": "Herstellung im Gebäude bzw. im Keller mit Kleinbohrgerät bei begrenzter Höhe.", "fh": 1.5, "fg": 1.3, "tags": ["altbau"]}]],
         "varianten": [{"art": "GEWI-Stab Ø 32 mm", "h": 0.9, "mat": 55, "geraet": 75}, {"art": "GEWI-Stab Ø 50 mm", "h": 1.0, "mat": 85, "geraet": 85},
                       {"art": "Selbstbohrpfahl R51", "h": 0.7, "mat": 70, "geraet": 70}]},
        {"kurz": "Rammpfahl {art}",
         "lang": "Fertigrammpfahl {art} liefern und rammen, Pfahlköpfe kappen. Abrechnung nach Pfahllänge.",
         "einheit": "m", "kg": "323", "gen": "C", "achsen": [TIEFE[1:], NACHB],
         "varianten": [{"art": "Stahlbeton 30 × 30 cm", "h": 0.25, "mat": 62, "geraet": 45, "achsen": [TIEFE[1:]]}, {"art": "Stahlbeton 35 × 35 cm", "h": 0.3, "mat": 78, "geraet": 50, "achsen": [TIEFE[1:]]},
                       {"art": "Stahlrohr Ø 406 mm", "h": 0.35, "mat": 145, "geraet": 55}]},
        {"kurz": "Pfahlkopf freilegen und abstemmen, Ø {d} mm",
         "lang": "Pfahlkopf freilegen, auf Solltiefe abstemmen, Bewehrung freilegen und richten, Abbruch entsorgen.",
         "einheit": "St", "kg": "323", "gen": "B", "lohn": "abbruch",
         "varianten": [{"d": "bis 620", "h": 2.5, "geraet": 35}, {"d": "bis 1200", "h": 5, "geraet": 70}]},
        {"kurz": "Pfahlprüfung {art}",
         "lang": "{art} nach EA-Pfähle durch Prüfinstitut, einschließlich Bericht.",
         "einheit": "St", "kg": "323", "gen": "C",
         "varianten": [{"art": "Integritätsprüfung (Low-Strain)", "h": 0, "geraet": 140}, {"art": "dynamische Probebelastung", "h": 4, "geraet": 3800}]},
        {"kurz": "Bohrgerät {art}, An- und Abtransport",
         "lang": "Bohr- bzw. Rammgerät ({art}) zur Baustelle bringen, einrichten, umsetzen und abtransportieren. Je Gerät.",
         "einheit": "psch", "kg": "312", "gen": "C", "achsen": [[{"k": "", "t": ""}, {"k": "Innenstadt", "t": "Innenstadtlage mit Genehmigungen und Begleitfahrzeug.", "fg": 1.3}]],
         "varianten": [{"art": "Kleinbohrgerät bis 10 t", "h": 6, "geraet": 1400}, {"art": "Ankerbohrgerät bis 20 t", "h": 8, "geraet": 2600},
                       {"art": "Großbohrgerät bis 80 t", "h": 24, "geraet": 9500}, {"art": "Rammgerät/Rüttler mit Mäkler", "h": 16, "geraet": 6200}]},
    ]},
]
