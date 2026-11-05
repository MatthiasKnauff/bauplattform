# LB 047 Dämm- und Brandschutzarbeiten an technischen Anlagen (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "047", "name": "Dämm- und Brandschutzarbeiten an technischen Anlagen", "atv": "DIN 18421", "lohn": "daemmtga",
    "gruppen": [
        {"name": "Rohrdämmung", "positionen": [
            {"kurz": "Rohrdämmung Mineralwolle-Schale mit Alu-Kaschierung, {d} mm, Dämmdicke {s}",
             "lang": "Wärmedämmung von Heizungs- bzw. Warmwasserleitungen nach GEG Anlage 8 mit Mineralwolle-Rohrschalen "
                     "A2-s1,d0, alukaschiert mit Überlappung, Nahtstellen und Stöße mit Alu-Klebeband verschlossen, "
                     "für Rohr-Außendurchmesser {d} mm, Dämmdicke {s}. Formstücke und Armaturen werden wie Rohr gemessen. "
                     "Abrechnung nach Rohrlänge.",
             "einheit": "m", "kg": "422", "gen": "A",
             "varianten": [{"d": "15–18", "s": "20 mm (100 %)", "h": 0.12, "mat": 4.5}, {"d": "22", "s": "30 mm (100 %)", "h": 0.13, "mat": 6},
                           {"d": "28", "s": "30 mm (100 %)", "h": 0.14, "mat": 7}, {"d": "35", "s": "30 mm (100 %)", "h": 0.15, "mat": 8.5},
                           {"d": "42", "s": "40 mm (100 %)", "h": 0.17, "mat": 11}, {"d": "54", "s": "50 mm (100 %)", "h": 0.19, "mat": 15},
                           {"d": "76,1", "s": "70 mm (100 %)", "h": 0.24, "mat": 24}, {"d": "88,9", "s": "80 mm (100 %)", "h": 0.27, "mat": 30},
                           {"d": "108", "s": "100 mm (100 %)", "h": 0.32, "mat": 40}]},
            {"kurz": "Rohrdämmung Kautschuk geschlossenzellig, {d} mm, Dämmdicke {s} mm",
             "lang": "Dämmung aus synthetischem Kautschuk, geschlossenzellig, als Schlauch bzw. Platte, Brandverhalten "
                     "BL-s3,d0, für Trinkwasser kalt (Tauwasser- und Erwärmungsschutz nach DIN 1988-200) bzw. Kälteleitungen, "
                     "Rohrdurchmesser {d} mm, Dämmdicke {s} mm, Nähte und Stöße verklebt. Abrechnung nach Rohrlänge.",
             "einheit": "m", "kg": "412", "gen": "A",
             "varianten": [{"d": "15–18", "s": "9", "h": 0.10, "mat": 3}, {"d": "22–28", "s": "13", "h": 0.11, "mat": 5},
                           {"d": "35–42", "s": "13", "h": 0.13, "mat": 7.5}, {"d": "54", "s": "19", "h": 0.15, "mat": 12},
                           {"d": "76,1", "s": "19", "h": 0.18, "mat": 17}]},
            {"kurz": "Dämmung von Armaturen mit Kappen, DN {dn}",
             "lang": "Abnehmbare Dämmkappe für Armaturen und Flansche aus Mineralwolle mit Blech- bzw. Folienmantel, "
                     "mit Schnellverschlüssen, DN {dn}.",
             "einheit": "St", "kg": "422", "gen": "B",
             "varianten": [{"dn": "25–50", "h": 0.8, "mat": 45}, {"dn": "65–100", "h": 1.2, "mat": 95}]},
            {"kurz": "Ummantelung Rohrdämmung mit verzinktem Stahlblech",
             "lang": "Ummantelung der Dämmung mit verzinktem Stahlblech bzw. Aluminiumblech 0,6–0,8 mm in Technikräumen "
                     "und befahrbaren Bereichen, überlappt und verschraubt. Abrechnung nach Mantelfläche.",
             "einheit": "m²", "kg": "422", "h": 0.9, "mat": 22, "gen": "B"},
            {"kurz": "Dämmung Lüftungskanal Mineralwolle-Matte alukaschiert, {s} mm",
             "lang": "Wärme- bzw. Tauwasserdämmung von Lüftungskanälen und -rohren mit alukaschierter Mineralwollematte "
                     "{s} mm, mit Stiften und Alu-Klebeband befestigt. Abrechnung nach gedämmter Oberfläche.",
             "einheit": "m²", "kg": "431", "gen": "A",
             "varianten": [{"s": "30", "h": 0.35, "mat": 9}, {"s": "50", "h": 0.40, "mat": 13}, {"s": "100", "h": 0.50, "mat": 24}]},
        ]},
        {"name": "Brandschutz an Leitungen", "positionen": [
            {"kurz": "Brandschutzmanschette für brennbare Rohre, DN {dn}, R 90",
             "lang": "Brandschutzmanschette mit intumeszierender Einlage für Kunststoffrohre in Wand- oder "
                     "Deckendurchführung, Feuerwiderstand R 90 nach allgemeiner Bauartgenehmigung, DN {dn}, montieren, "
                     "Restspalt nach Zulassung verschließen, Kennzeichnungsschild anbringen.",
             "einheit": "St", "kg": "411", "gen": "A",
             "varianten": [{"dn": "50", "h": 0.6, "mat": 42}, {"dn": "75", "h": 0.7, "mat": 55}, {"dn": "110", "h": 0.8, "mat": 72},
                           {"dn": "160", "h": 1.0, "mat": 120}]},
            {"kurz": "Rohrabschottung nichtbrennbare Rohre mit Mineralwolleschale, {d} mm, R 90",
             "lang": "Abschottung von Metallrohren in Wand- bzw. Deckendurchführung mit Mineralwolle-Rohrschale "
                     "(Schmelzpunkt ≥ 1.000 °C) in zugelassener Länge, Feuerwiderstand R 90 nach Bauartgenehmigung, "
                     "Rohrdurchmesser {d} mm, mit Kennzeichnung.",
             "einheit": "St", "kg": "422", "gen": "A",
             "varianten": [{"d": "bis 28", "h": 0.4, "mat": 22}, {"d": "35–54", "h": 0.5, "mat": 34}, {"d": "76–108", "h": 0.7, "mat": 58}]},
            {"kurz": "Kombiabschottung Weichschott, Öffnung bis {a} m², S 90",
             "lang": "Weichschott-Kombiabschottung aus beschichteten Mineralfaserplatten für gemischte Belegung "
                     "(Kabel, Rohre) in Wand oder Decke, S 90 nach Zulassung, Öffnungsfläche bis {a} m², "
                     "einschließlich Beschichtung der Leitungen und Kennzeichnungsschild.",
             "einheit": "St", "kg": "444", "gen": "B",
             "varianten": [{"a": "0,1", "h": 1.5, "mat": 85}, {"a": "0,25", "h": 2.5, "mat": 165}, {"a": "0,5", "h": 3.5, "mat": 290}]},
            {"kurz": "Kabelabschottung Brandschutzmasse/Steine, je Durchführung",
             "lang": "Abschottung einzelner Kabeldurchführungen mit Brandschutzmasse, -schaum oder -steinen nach "
                     "Zulassung, Feuerwiderstand S 90, Durchführung bis 15 × 15 cm, mit Kennzeichnung.",
             "einheit": "St", "kg": "444", "h": 0.8, "mat": 38, "gen": "B"},
            {"kurz": "Dokumentation Abschottungen mit Fotos und Übereinstimmungserklärung",
             "lang": "Brandschutztechnische Dokumentation aller hergestellten Abschottungen mit Plan, Fotos, "
                     "Nummerierung und Übereinstimmungserklärungen. Abrechnung je Abschottung.",
             "einheit": "St", "kg": "444", "h": 0.15, "mat": 1, "gen": "B"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Ergänzungen (Runde 2)
DICKE = [{"k": "100 % GEG", "t": "Dämmdicke 100 % nach GEG Anlage 8."},
         {"k": "50 % (Durchführung/Kreuzung)", "t": "Dämmdicke 50 % im Bereich von Wand- und Deckendurchführungen bzw. Leitungskreuzungen.", "fm": 0.6, "fh": 0.85},
         {"k": "200 % (erhöhter Wärmeschutz)", "t": "Erhöhte Dämmdicke 200 % (z. B. Förderprogramm, Passivhaus).", "fm": 1.9, "fh": 1.2}]
MANTEL = [{"k": "", "t": ""},
          {"k": "PVC-Folienmantel", "t": "Mit PVC-Mantel (Isogenopak) als Oberfläche, Rundbögen vorgefertigt.", "mat": 4, "h": 0.06},
          {"k": "Blechmantel", "t": "Mit Ummantelung aus Aluminium- bzw. verzinktem Stahlblech.", "mat": 9, "h": 0.15}]
BAUTEIL = [{"k": "Massivwand", "t": "Einbau in Massivwand."}, {"k": "Massivdecke", "t": "Einbau in Massivdecke, Ausführung überkopf bzw. von oben.", "fh": 1.15},
           {"k": "leichte Trennwand", "t": "Einbau in leichte Trennwand (Metallständer, beidseitig beplankt) nach Zulassung.", "fh": 1.1, "mat": 6}]
LBS[0]["gruppen"][0]["positionen"] += [
    {"kurz": "Zulage Dämmung Formstück (Bogen/T-Stück) bis {d} mm",
     "lang": "Zulage für das Dämmen von Bögen, T-Stücken und Reduzierungen mit vorgefertigten Formteilen bzw. Segmenten, Rohrdurchmesser bis {d} mm.",
     "einheit": "St", "kg": "422", "gen": "A",
     "varianten": [{"d": "28", "h": 0.12, "mat": 3}, {"d": "54", "h": 0.18, "mat": 6}, {"d": "108", "h": 0.3, "mat": 14}]},
    {"kurz": "Dämmung Behälter/Speicher Mineralwolle mit Mantel, d = {s} mm",
     "lang": "Wärmedämmung von Behältern, Speichern und Verteilern mit Mineralwolle-Matten, Dicke {s} mm, Ummantelung Alu- bzw. Stahlblech. "
             "Abrechnung nach Außenfläche der Dämmung.",
     "einheit": "m²", "kg": "422", "gen": "B", "varianten": [{"s": "50", "h": 1.2, "mat": 32}, {"s": "100", "h": 1.5, "mat": 48}]},
    {"kurz": "Kältedämmung Kautschuk für Kälte-/Kühlwasserleitung {d} mm, d = {s} mm",
     "lang": "Diffusionsdichte Kältedämmung aus Kautschuk für Kaltwasser- bzw. Kühlleitungen, Rohr {d} mm, Dämmdicke {s} mm, "
             "vollflächig verklebt, Halterungen mit Kälteschellen. Abrechnung nach Länge.",
     "einheit": "m", "kg": "434", "gen": "B",
     "varianten": [{"d": "22–28", "s": "19", "h": 0.16, "mat": 8}, {"d": "35–54", "s": "25", "h": 0.2, "mat": 15}, {"d": "76–108", "s": "32", "h": 0.3, "mat": 30}]},
    {"kurz": "Alte Rohrdämmung (KMF) entfernen nach TRGS 521",
     "lang": "Vorhandene Rohrdämmung aus alter Mineralwolle (vor 1996) unter Schutzmaßnahmen nach TRGS 521 entfernen, staubdicht verpacken und entsorgen. "
             "Abrechnung nach Rohrlänge.",
     "einheit": "m", "kg": "422", "h": 0.25, "mat": 1.5, "geraet": 4, "gen": "C", "tags": ["altbau"]},
    {"kurz": "Begleitheizung Frostschutz selbstregelnd, mit Thermostat",
     "lang": "Selbstregelndes Heizband als Frostschutz für Wasserleitungen unter der Dämmung, mit Anschlussset und Thermostat. Abrechnung nach Länge.",
     "einheit": "m", "kg": "412", "h": 0.2, "mat": 22, "gen": "B"},
]
LBS[0]["gruppen"][1]["positionen"] += [
    {"kurz": "Brandschutzbekleidung Lüftungskanal L 90, Kalziumsilikat",
     "lang": "Brandschutzbekleidung von Lüftungsleitungen L 90 nach DIN 4102-6 aus Kalziumsilikatplatten nach Verwendbarkeitsnachweis, "
             "einschließlich Abhängung für Brandfall. Abrechnung nach Bekleidungsfläche.",
     "einheit": "m²", "kg": "431", "h": 1.6, "mat": 78, "gen": "B"},
    {"kurz": "Installationskanal I 90 / Brandschutzkanal für Leitungen, {m} mm",
     "lang": "Brandschutzkanal I 90 aus Brandschutzplatten für die Verlegung von Leitungen in Rettungswegen, lichter Querschnitt {m} mm, "
             "mit Abhängungen. Abrechnung nach Länge.",
     "einheit": "m", "kg": "444", "gen": "B",
     "varianten": [{"m": "200 × 100", "h": 1.2, "mat": 95}, {"m": "400 × 150", "h": 1.6, "mat": 140}, {"m": "600 × 200", "h": 2.0, "mat": 190}]},
    {"kurz": "Brandschutzmanschette Mischinstallation/Rohrbündel bis {d} mm",
     "lang": "Abschottung von Rohrbündeln bzw. gemischter Installation (Kunststoff und Metall) mit Brandschutzband bzw. Manschettensystem nach Zulassung, "
             "Bündeldurchmesser bis {d} mm.",
     "einheit": "St", "kg": "411", "gen": "B", "varianten": [{"d": "125", "h": 1.0, "mat": 95}, {"d": "250", "h": 1.6, "mat": 190}]},
    {"kurz": "Bestandsabschottung prüfen, kennzeichnen bzw. nachbessern",
     "lang": "Vorhandene Abschottung auf Übereinstimmung mit dem Verwendbarkeitsnachweis prüfen, bei Bedarf nachbessern, dokumentieren und kennzeichnen.",
     "einheit": "St", "kg": "444", "h": 0.6, "mat": 15, "gen": "C", "tags": ["altbau"]},
]
zuweisen(LBS, vorab() + [
    (ist("m", kurz=r"Mineralwolle-Schale"), [DICKE, MANTEL, ORT, MENGE]),
    (ist("m", kurz=r"Kautschuk|Kältedämmung"), [MANTEL[:2], ORT, MENGE]),
    (ist(("m", "m²")), [ORT, MENGE]),
    (ist("St", kurz=r"Manschette|Abschottung|Kombiabschottung"), [BAUTEIL, ORT]),
    (ist(), [ORT_KLEIN]),
])
