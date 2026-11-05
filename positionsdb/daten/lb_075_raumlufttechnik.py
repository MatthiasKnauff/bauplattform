# LB 075 Raumlufttechnische Anlagen (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "075", "name": "Raumlufttechnische Anlagen", "atv": "DIN 18379", "lohn": "lueftung",
    "gruppen": [
        {"name": "Lüftungsgeräte", "positionen": [
            {"kurz": "Zentrales Wohnungslüftungsgerät mit WRG, bis {v} m³/h",
             "lang": "Zentrales Lüftungsgerät für kontrollierte Wohnraumlüftung mit Gegenstrom-Wärmeübertrager "
                     "(Wärmebereitstellungsgrad ≥ 85 %), EC-Ventilatoren, Filter ISO ePM1 50 % Zuluft / ISO Coarse Abluft, "
                     "Bypass, Frostschutz, Feuchte- und CO₂-geführter Regelung, Luftleistung bis {v} m³/h, "
                     "Wand- oder Deckenmontage, Kondensatanschluss, Inbetriebnahme mit Einregulierung und Protokoll.",
             "einheit": "St", "kg": "431", "gen": "C",
             "varianten": [{"v": "200", "h": 10, "mat": 3600}, {"v": "300", "h": 12, "mat": 4700}, {"v": "450", "h": 14, "mat": 6100}]},
            {"kurz": "Lüftungszentralgerät RLT mit WRG, {v} m³/h",
             "lang": "Raumlufttechnisches Zentralgerät nach DIN EN 13053 und VDI 6022, Kompaktbauweise, mit Platten- bzw. "
                     "Rotationswärmeübertrager, EC-Ventilatoren, Filterstufen, Klappen, Heizregister PWW, integrierter "
                     "Regelung, Luftvolumenstrom {v} m³/h, Einbringung, Aufstellung, Inbetriebnahme. Kälteregister gesondert.",
             "einheit": "St", "kg": "431", "gen": "C",
             "varianten": [{"v": "1.500", "h": 30, "mat": 14500}, {"v": "3.000", "h": 40, "mat": 23000}, {"v": "6.000", "h": 56, "mat": 38000},
                           {"v": "10.000", "h": 70, "mat": 56000}]},
            {"kurz": "Dezentraler Wandlüfter mit WRG, paarweise",
             "lang": "Dezentrales Lüftungsgerät mit regenerativem Wärmespeicher im Pendelbetrieb, Wandeinbau, Luftleistung "
                     "bis 40 m³/h, mit Außenblende und Innenblende, Steuerung je Raumpaar. Abrechnung je Gerät; Kernbohrung gesondert.",
             "einheit": "St", "kg": "431", "h": 2.5, "mat": 560, "gen": "B", "tags": ["altbau"]},
            {"kurz": "Abluftventilator Bad/WC Unterputz, {art}",
             "lang": "Einzelraum-Abluftventilator nach DIN 18017-3 für innenliegende Bäder/WCs mit Unterputzgehäuse, "
                     "Brandschutzklappe falls erforderlich, Rückschlagklappe, {art}, montieren und anschließen.",
             "einheit": "St", "kg": "431", "gen": "B",
             "varianten": [{"art": "60 m³/h mit Nachlauf", "h": 1.8, "mat": 210}, {"art": "60/30 m³/h feuchtegeführt", "h": 2.0, "mat": 290},
                           {"art": "Zweiraum-Anschluss mit Brandschutz-Gehäuse K90", "h": 2.5, "mat": 420}]},
            {"kurz": "Küchen-Abluftanschluss Dunstabzug mit Mauerkasten",
             "lang": "Abluftleitung für Dunstabzugshaube DN 150 bis 3 m mit wärmegedämmtem Mauerkasten mit motorischer "
                     "bzw. magnetischer Klappe und Außengitter herstellen; Zuluftnachströmung (Fensterkontaktschalter) gesondert.",
             "einheit": "St", "kg": "431", "h": 3.0, "mat": 280, "gen": "B"},
            {"kurz": "Dachventilator Abluft, {v} m³/h",
             "lang": "Radial-Dachventilator mit EC-Motor, Luftleistung {v} m³/h, mit Flachdachsockel, Rückschlagklappe "
                     "und Revisionsschalter, montieren und anschließen.",
             "einheit": "St", "kg": "431", "gen": "C",
             "varianten": [{"v": "500", "h": 5, "mat": 1350}, {"v": "1.500", "h": 6, "mat": 2300}]},
        ]},
        {"name": "Luftleitungen", "positionen": [
            {"kurz": "Wickelfalzrohr verzinkt DN {dn}, Dichtheitsklasse C",
             "lang": "Luftleitung aus Wickelfalzrohr Stahl verzinkt, DN {dn}, Dichtheitsklasse C nach DIN EN 12237, "
                     "mit Lippendichtungen, Abhängungen und Formteilen anteilig. Abrechnung nach Mittelachse.",
             "einheit": "m", "kg": "431", "gen": "A",
             "varianten": [{"dn": "100", "h": 0.35, "mat": 9}, {"dn": "125", "h": 0.38, "mat": 11}, {"dn": "160", "h": 0.42, "mat": 14},
                           {"dn": "200", "h": 0.48, "mat": 18}, {"dn": "250", "h": 0.55, "mat": 24}, {"dn": "315", "h": 0.65, "mat": 32},
                           {"dn": "400", "h": 0.80, "mat": 46}]},
            {"kurz": "Rechteckiger Luftkanal verzinkt, Blechdicke bis 1,0 mm",
             "lang": "Rechteckiger Luftkanal aus verzinktem Stahlblech nach DIN EN 1505, Blechdicke bis 1,0 mm, mit Flanschen, "
                     "Dichtungen, Abhängungen, Formteile anteilig. Abrechnung nach abgewickelter Kanaloberfläche.",
             "einheit": "m²", "kg": "431", "h": 0.9, "mat": 38, "gen": "B"},
            {"kurz": "Flexibles Rohrsystem Wohnungslüftung Ø {d} mm, im Estrich/Beton",
             "lang": "Flexibles Luftverteilsystem aus PE-HD-Rohr mit antistatischer Innenschicht, Ø {d} mm, in Rohbetondecke "
                     "oder Estrich verlegt, mit Verteilerkästen-Anteil und Endkappen. Abrechnung nach Länge.",
             "einheit": "m", "kg": "431", "gen": "B",
             "varianten": [{"d": "63", "h": 0.18, "mat": 5.5}, {"d": "75", "h": 0.20, "mat": 7}, {"d": "90", "h": 0.22, "mat": 9}]},
            {"kurz": "Luftverteilerkasten Wohnungslüftung mit Schalldämpfer, {n} Anschlüsse",
             "lang": "Luftverteilerkasten mit integriertem Schalldämpfer und {n} Anschlussstutzen für das Rohrsystem, "
                     "einschließlich Revisionsöffnung.",
             "einheit": "St", "kg": "431", "gen": "B",
             "varianten": [{"n": "6", "h": 1.5, "mat": 190}, {"n": "10", "h": 2.0, "mat": 270}]},
            {"kurz": "Rohrschalldämpfer DN {dn}, Länge 1000 mm",
             "lang": "Rohrschalldämpfer mit Mineralfaser-Absorber und Lochblech-Innenrohr, DN {dn}, Länge 1000 mm, einbauen.",
             "einheit": "St", "kg": "431", "gen": "A",
             "varianten": [{"dn": "125", "h": 0.6, "mat": 75}, {"dn": "160", "h": 0.7, "mat": 92}, {"dn": "250", "h": 0.9, "mat": 145}]},
            {"kurz": "Außen-/Fortluft-Wanddurchführung gedämmt mit Wetterschutzgitter DN {dn}",
             "lang": "Außen- bzw. Fortluftdurchführung durch die Außenwand mit wärmegedämmtem, dampfdichtem Rohr, "
                     "Wetterschutzgitter bzw. Kombi-Wanddurchführung, DN {dn}. Kernbohrung gesondert.",
             "einheit": "St", "kg": "431", "gen": "B",
             "varianten": [{"dn": "160", "h": 2.0, "mat": 180}, {"dn": "250", "h": 2.5, "mat": 260}]},
            {"kurz": "Brandschutzklappe K90 rund DN {dn}, mit Schmelzlot",
             "lang": "Brandschutzklappe K90 nach DIN EN 15650 mit Leistungserklärung, rund DN {dn}, mit Schmelzlot-"
                     "Auslösung und Endschalter, Einbau in Massivwand/-decke bzw. leichte Trennwand nach Verwendbarkeits"
                     "nachweis, einschließlich Vermörtelung bzw. Einbausatz.",
             "einheit": "St", "kg": "431", "gen": "B",
             "varianten": [{"dn": "100", "h": 2.0, "mat": 330}, {"dn": "160", "h": 2.2, "mat": 380}, {"dn": "250", "h": 2.6, "mat": 480},
                           {"dn": "315", "h": 3.0, "mat": 560}]},
            {"kurz": "Brandschutzklappe rechteckig K90 mit Federrücklaufmotor, {m} mm",
             "lang": "Brandschutzklappe rechteckig K90, Nennmaß {m} mm, mit Federrücklaufmotor 24 V und Endschaltern, einbauen.",
             "einheit": "St", "kg": "431", "gen": "C",
             "varianten": [{"m": "400 × 200", "h": 3.5, "mat": 980}, {"m": "800 × 400", "h": 4.5, "mat": 1450}]},
            {"kurz": "Hygienische Reinigung Lüftungsleitungen vor Inbetriebnahme",
             "lang": "Reinigung des Luftleitungsnetzes nach VDI 6022 vor Inbetriebnahme einschließlich Hygiene-Erstinspektion "
                     "mit Protokoll. Abrechnung nach Leitungslänge.",
             "einheit": "m", "kg": "431", "h": 0.05, "mat": 0, "geraet": 1.5, "gen": "C"},
        ]},
        {"name": "Luftdurchlässe, Klima", "positionen": [
            {"kurz": "Tellerventil Zu-/Abluft DN {dn} mit Einbaurahmen",
             "lang": "Tellerventil aus Stahl, weiß, für Zu- bzw. Abluft, DN {dn}, mit Einbaurahmen, einregulieren.",
             "einheit": "St", "kg": "431", "gen": "A",
             "varianten": [{"dn": "100", "h": 0.4, "mat": 22}, {"dn": "125", "h": 0.45, "mat": 26}]},
            {"kurz": "Drallauslass Decke {m} mm mit Anschlusskasten",
             "lang": "Deckendrallauslass {m} mm mit Anschlusskasten, Volumenstromdrossel und Messstutzen, in Unterdecke einbauen.",
             "einheit": "St", "kg": "431", "gen": "B",
             "varianten": [{"m": "400 × 400", "h": 1.2, "mat": 185}, {"m": "600 × 600", "h": 1.4, "mat": 245}]},
            {"kurz": "Lüftungsgitter Wand/Kanal {m} mm mit Regelvorrichtung",
             "lang": "Lüftungsgitter aus Aluminium mit einzeln verstellbaren Lamellen und Mengeneinstellung, {m} mm, einbauen.",
             "einheit": "St", "kg": "431", "gen": "A",
             "varianten": [{"m": "325 × 125", "h": 0.6, "mat": 48}, {"m": "625 × 225", "h": 0.8, "mat": 85}]},
            {"kurz": "Volumenstromregler VVS rund DN {dn} mit Stellantrieb",
             "lang": "Variabler Volumenstromregler mit Messeinrichtung und Kompaktregler, DN {dn}, einbauen, verdrahten und einstellen.",
             "einheit": "St", "kg": "431", "gen": "B",
             "varianten": [{"dn": "160", "h": 1.8, "mat": 540}, {"dn": "250", "h": 2.0, "mat": 640}]},
            {"kurz": "Split-Klimagerät Wand, Kühlleistung {kw} kW",
             "lang": "Split-Klimagerät mit Inverter, Wandinnengerät und Außengerät, Kühlleistung {kw} kW, Kältemittel R32, "
                     "einschließlich Kältemittelleitung bis 5 m, Kondensatleitung, Befüllung durch zertifiziertes Personal, "
                     "Inbetriebnahme. Elektroanschluss bauseits.",
             "einheit": "St", "kg": "434", "gen": "C",
             "varianten": [{"kw": "2,5", "h": 8, "mat": 1150}, {"kw": "3,5", "h": 8, "mat": 1350}, {"kw": "5,0", "h": 9, "mat": 1750}]},
            {"kurz": "Multisplit-Außengerät für {n} Innengeräte",
             "lang": "Multisplit-Außengerät mit Inverter für {n} Innengeräte, Gesamtkühlleistung nach Auslegung, "
                     "auf Konsole bzw. Bodensockel, Inbetriebnahme. Innengeräte und Leitungen gesondert.",
             "einheit": "St", "kg": "434", "gen": "C",
             "varianten": [{"n": "2", "h": 8, "mat": 2100}, {"n": "4", "h": 10, "mat": 3500}]},
            {"kurz": "Kältemittelleitung Kupfer gedämmt, Paar {d}",
             "lang": "Kältemittelleitung als vorisoliertes Kupferrohrpaar {d}, gebördelt bzw. gelötet, mit Befestigung "
                     "und Kabelkanal Außen. Abrechnung nach Länge.",
             "einheit": "m", "kg": "434", "gen": "B",
             "varianten": [{"d": "1/4\" + 3/8\"", "h": 0.4, "mat": 16}, {"d": "1/4\" + 1/2\"", "h": 0.45, "mat": 19}]},
            {"kurz": "Einregulierung und Messung Lüftungsanlage, Protokoll",
             "lang": "Einregulierung der Luftvolumenströme an allen Durchlässen mit Messprotokoll, Funktionsprüfung, "
                     "Übergabe Wartungsplan und Revisionsunterlagen.",
             "einheit": "psch", "kg": "431", "h": 6, "mat": 0, "gen": "B"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Runde 2: weitere Grundpositionen
LBS[0]["gruppen"] += [
    {"name": "Formteile, Klappen, Zubehör", "positionen": [
        {"kurz": "Formstück Wickelfalz (Bogen/T-Stück/Reduzierung) DN {dn}",
         "lang": "Formstück für Wickelfalzrohr (Bogen 90°/45°, T-Stück, Reduzierung, Sattelstutzen) aus verzinktem Stahlblech mit "
                 "Lippendichtung, Dichtheitsklasse C, DN {dn}, einbauen. Abrechnung je Stück zusätzlich zum Rohr (durchgemessen).",
         "einheit": "St", "kg": "431", "gen": "A",
         "varianten": [{"dn": "100", "h": 0.25, "mat": 9}, {"dn": "160", "h": 0.3, "mat": 14}, {"dn": "200", "h": 0.35, "mat": 19},
                       {"dn": "250", "h": 0.45, "mat": 26}, {"dn": "315", "h": 0.55, "mat": 38}, {"dn": "400", "h": 0.7, "mat": 58}]},
        {"kurz": "Rechteck-Schalldämpfer Kulisse {m} mm, Länge {l} mm",
         "lang": "Kulissenschalldämpfer für rechteckige Luftleitungen, Querschnitt {m} mm, Länge {l} mm, Kulissen mit "
                 "abriebfester Glasvlieskaschierung, Gehäuse verzinkt, mit Flanschen einbauen.",
         "einheit": "St", "kg": "431", "gen": "B",
         "varianten": [{"m": "400 × 300", "l": "1.000", "h": 1.5, "mat": 360}, {"m": "600 × 400", "l": "1.000", "h": 2.0, "mat": 520},
                       {"m": "800 × 500", "l": "1.500", "h": 3.0, "mat": 890}]},
        {"kurz": "Jalousieklappe/Absperrklappe {m} mm mit Stellantrieb",
         "lang": "Jalousie- bzw. Absperrklappe verzinkt mit gegenläufigen Lamellen, Dichtheitsklasse 2, Querschnitt {m} mm, "
                 "mit Stellantrieb 24 V Auf/Zu, einbauen und anschließen.",
         "einheit": "St", "kg": "431", "gen": "B",
         "varianten": [{"m": "400 × 300", "h": 1.5, "mat": 340}, {"m": "600 × 400", "h": 1.8, "mat": 430}, {"m": "1.000 × 600", "h": 2.5, "mat": 640}]},
        {"kurz": "Wetterschutzgitter Außenwand {m} mm, Alu, mit Vogelschutz",
         "lang": "Wetterschutzgitter aus Aluminium mit Regenschutzlamellen und Vogelschutzgitter, Querschnitt {m} mm, "
                 "Einbaurahmen, in vorhandene Wandöffnung einbauen und abdichten.",
         "einheit": "St", "kg": "431", "gen": "B",
         "varianten": [{"m": "300 × 300", "h": 1.2, "mat": 140}, {"m": "600 × 400", "h": 1.6, "mat": 240}, {"m": "1.000 × 800", "h": 2.5, "mat": 520}]},
        {"kurz": "Revisionsöffnung/Reinigungsdeckel für Luftleitung",
         "lang": "Revisionsöffnung bzw. Reinigungsdeckel nach DIN EN 12097 in Luftleitung einbauen, luftdicht, mit Schnellverschluss.",
         "einheit": "St", "kg": "431", "h": 0.5, "mat": 32, "gen": "A"},
        {"kurz": "Brandschutz-Absperrvorrichtung Wohnungslüftung K90-18017",
         "lang": "Brandschutz-Absperrvorrichtung nach DIN 18017-3 für Abluftleitungen in Schächten bzw. Decken, K90, "
                 "mit Kaltrauchsperre, nach Zulassung einbauen und Mörtelverguss bzw. Abschottung herstellen.",
         "einheit": "St", "kg": "431", "h": 1.2, "mat": 95, "gen": "B"},
        {"kurz": "Rauchschutzklappe/Entrauchungsklappe {m} mm, motorisch",
         "lang": "Entrauchungsklappe nach DIN EN 12101-8 bzw. Rauchschutzklappe, Querschnitt {m} mm, mit Stellantrieb 24/230 V "
                 "und Endschaltern, nach Zulassung einbauen, anschließen und prüfen.",
         "einheit": "St", "kg": "431", "gen": "C",
         "varianten": [{"m": "400 × 400", "h": 3, "mat": 1350}, {"m": "600 × 600", "h": 3.5, "mat": 1750}]},
        {"kurz": "Luftleitungsdämmung Mineralwolle alukaschiert {d} mm",
         "lang": "Wärme- bzw. Tauwasserdämmung von Luftleitungen mit Mineralwolle-Lamellenmatte alukaschiert, Dicke {d} mm, "
                 "Stöße mit Aluklebeband dampfdicht verklebt; Abrechnung nach Dämmoberfläche.",
         "einheit": "m²", "kg": "431", "gen": "A", "lohn": "daemmtga",
         "varianten": [{"d": "30", "h": 0.35, "mat": 9}, {"d": "50", "h": 0.4, "mat": 13}, {"d": "100", "h": 0.5, "mat": 24}]},
    ]},
    {"name": "Gewerbliche Küchenlüftung, Sonderanlagen", "positionen": [
        {"kurz": "Küchenablufthaube gewerblich, Edelstahl, {l} mm, mit Aerosolabscheider",
         "lang": "Küchenablufthaube nach VDI 2052 aus Edelstahl, Länge {l} mm, Tiefe ca. 1.100 mm, mit Aerosolabscheidern, "
                 "Fettauffangrinne, LED-Beleuchtung, Abhängung, montieren und an Abluft anschließen.",
         "einheit": "St", "kg": "431", "gen": "C",
         "varianten": [{"l": "1.600", "h": 6, "mat": 2400}, {"l": "2.400", "h": 8, "mat": 3300}, {"l": "3.200", "h": 10, "mat": 4300}]},
        {"kurz": "Abluftleitung Küche fettdicht geschweißt DN {dn}",
         "lang": "Fettdichte Küchenabluftleitung aus Stahlblech geschweißt bzw. Edelstahl, DN {dn}, mit Reinigungsöffnungen, "
                 "Gefälle zur Haube, montieren.",
         "einheit": "m", "kg": "431", "gen": "C",
         "varianten": [{"dn": "250", "h": 1.2, "mat": 95}, {"dn": "315", "h": 1.4, "mat": 125}, {"dn": "400", "h": 1.7, "mat": 165}]},
        {"kurz": "Tiefgaragen-Abluftventilator / CO-Warnanlage, psch",
         "lang": "Mechanische Entlüftung einer Tiefgarage bis 60 Stellplätze: Abluftventilator(en) bzw. Strahlventilatoren, "
                 "CO-Warnanlage mit Sensoren, Steuerung und Leitungen, Inbetriebnahme und Abnahme durch Sachverständigen-Vorbereitung.",
         "einheit": "psch", "kg": "431", "h": 60, "mat": 14500, "gen": "C"},
        {"kurz": "Labor-/Werkstattabsaugung Punktabsaugung mit Gelenkarm",
         "lang": "Punktabsaugung mit Gelenkarm Ø 100 mm, Reichweite bis 2 m, Wand- bzw. Deckenhalterung, Absperrklappe, "
                 "Anschluss an Abluftleitung.",
         "einheit": "St", "kg": "431", "h": 2.5, "mat": 520, "gen": "B"},
    ]},
    {"name": "Inbetriebnahme, Prüfung, Demontage", "positionen": [
        {"kurz": "Dichtheitsprüfung Luftleitungsnetz nach DIN EN 12599, je Abschnitt",
         "lang": "Dichtheitsprüfung eines Leitungsabschnitts (bis 100 m² Oberfläche) nach DIN EN 12599 mit Prüfgerät, Protokoll mit "
                 "Leckluftrate und Bewertung der Dichtheitsklasse.",
         "einheit": "St", "kg": "431", "h": 3, "mat": 0, "geraet": 60, "gen": "B"},
        {"kurz": "Hygieneerstinspektion nach VDI 6022, je Anlage",
         "lang": "Hygieneerstinspektion einer RLT-Anlage nach VDI 6022 Blatt 1 durch qualifizierten Prüfer (Kategorie A), mit "
                 "Abklatschproben und Bericht.",
         "einheit": "St", "kg": "431", "h": 6, "mat": 0, "geraet": 380, "gen": "B"},
        {"kurz": "Funktionsprüfung Brandschutzklappen, je Klappe",
         "lang": "Funktionsprüfung von Brandschutzklappen bei Inbetriebnahme bzw. wiederkehrend: Auslösen, Schließen, "
                 "Öffnen, Sichtprüfung, Eintrag ins Prüfbuch, Kennzeichnung.",
         "einheit": "St", "kg": "431", "h": 0.4, "mat": 0, "gen": "A"},
        {"kurz": "Filterwechsel Lüftungsgerät {g}, je Satz",
         "lang": "Filtersatz für Lüftungsgerät {g} (Außen- und Abluftfilter nach Herstellerangabe, ISO ePM1/ePM10) liefern und wechseln, Altfilter entsorgen.",
         "einheit": "St", "kg": "431", "gen": "A",
         "varianten": [{"g": "bis 400 m³/h", "h": 0.4, "mat": 45}, {"g": "über 400 m³/h", "h": 1.2, "mat": 260}]},
        {"kurz": "Lüftungsleitungen Bestand demontieren, {art}",
         "lang": "Vorhandene Luftleitungen {art} einschließlich Befestigungen demontieren, zerkleinern und entsorgen; Öffnungen "
                 "provisorisch verschließen.",
         "einheit": "m", "kg": "394", "gen": "C", "tags": ["altbau"], "lohn": "lueftung",
         "varianten": [{"art": "rund bis DN 250", "h": 0.25, "mat": 0, "geraet": 1.5}, {"art": "rechteckig bis 0,5 m² Querschnitt", "h": 0.6, "mat": 0, "geraet": 4}]},
        {"kurz": "Lüftungsgerät Bestand demontieren und entsorgen, bis {v} m³/h",
         "lang": "Vorhandenes Lüftungsgerät bis {v} m³/h außer Betrieb nehmen, abklemmen, demontieren, abtransportieren und entsorgen.",
         "einheit": "St", "kg": "394", "gen": "C", "tags": ["altbau"],
         "varianten": [{"v": "500", "h": 4, "mat": 0, "geraet": 60}, {"v": "5.000", "h": 14, "mat": 0, "geraet": 320}]},
        {"kurz": "Reinigung Lüftungsanlage Bestand, je m Luftleitung",
         "lang": "Reinigung bestehender Luftleitungen mit rotierenden Bürsten und Absaugung, Revisionsöffnungen setzen anteilig, "
                 "Dokumentation vorher/nachher mit Kamerabefahrung.",
         "einheit": "m", "kg": "431", "h": 0.25, "mat": 2, "geraet": 4, "gen": "B", "tags": ["altbau"]},
    ]},
]

# ---------------------------------------------------------------- Runde 2: Achsen zuordnen
_K = lambda *worte: (lambda g, p: any(w in p["kurz"] for w in worte))
LTG_MAT = [{"k": "", "t": ""}, {"k": "Edelstahl 1.4301", "t": "Ausführung in Edelstahl 1.4301.", "fm": 2.8, "fh": 1.15, "gen": "C"}]
LTG_DAEMM = [{}, {"k": "gedämmt 30 mm", "t": "Einschließlich Dämmung mit Mineralwolle alukaschiert 30 mm, Stöße dampfdicht verklebt.", "fm": 1.6, "h": 0.25}]
LTG_HOEHE = [{}, {"k": "über 3,5 m", "t": "Montagehöhe über 3,5 m bis 6 m, Arbeitsbühne stellt der Auftragnehmer.", "fh": 1.25, "geraet": 1.5}]
DL_FARBE = [{"k": "", "t": "Sichtteile pulverbeschichtet weiß RAL 9010."}, {"k": "Sonderfarbe RAL", "t": "Sichtteile in Sonderfarbe nach RAL.", "fm": 1.15}]
DL_EINBAU = [{"k": "", "t": "Einbau in Beton- bzw. Massivdecke/-wand."}, {"k": "in Unterdecke", "t": "Einbau in Gipskarton- bzw. Systemdecke mit Ausschnitt und Abhängung.", "fh": 1.15, "mat": 6}]
GERAET_REG = [{}, {"k": "CO₂-/Feuchte-geführt", "t": "Bedarfsgeführte Regelung über CO₂- und Feuchtesensoren mit Bedieneinheit.", "mat": 240, "h": 1.5}]
zuweisen(LBS, [
    (_K("Wickelfalzrohr", "Rechteckiger Luftkanal"), [LTG_MAT, LTG_DAEMM, LTG_HOEHE, ORT_KLEIN, MENGE]),
    (_K("Formstück"), [LTG_MAT, LTG_HOEHE, ORT_KLEIN]),
    (_K("Flexibles Rohrsystem", "Luftverteilerkasten"), [ORT_KLEIN, MENGE]),
    (_K("Schalldämpfer", "Jalousieklappe", "Brandschutzklappe", "Absperrvorrichtung", "Rauchschutzklappe", "Revisionsöffnung"), [LTG_HOEHE, ORT_KLEIN]),
    (_K("Tellerventil", "Drallauslass", "Lüftungsgitter", "Wetterschutzgitter"), [DL_FARBE, DL_EINBAU, ORT_KLEIN]),
    (_K("Volumenstromregler"), [LTG_HOEHE, ORT_KLEIN]),
    (_K("Wohnungslüftungsgerät", "Lüftungszentralgerät", "Dezentraler Wandlüfter"), [GERAET_REG, GERAET_AUFSTELLUNG, ORT_KLEIN, WARTUNG]),
    (_K("Dachventilator", "Split-Klimagerät", "Multisplit"), [GERAET_AUFSTELLUNG, ORT_KLEIN, WARTUNG]),
    (_K("Abluftventilator Bad"), [[{}, {"k": "mit Feuchtesteuerung", "t": "Mit Hygrostat bzw. Feuchte-/Nachlaufsteuerung.", "mat": 35}], VERLEGUNG_GERAET[:3], ORT]),
    (_K("Kältemittelleitung", "Küchen-Abluftanschluss", "Abluftleitung Küche", "Luftleitungsdämmung"), [LTG_HOEHE, ORT_KLEIN]),
    (_K("Küchenablufthaube", "Punktabsaugung"), [ORT_KLEIN]),
])
