# LB 044 Abwasseranlagen – Leitungen, Abläufe (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "044", "name": "Abwasseranlagen – Leitungen, Abläufe", "atv": "DIN 18381", "lohn": "sanitaer",
    "gruppen": [
        {"name": "Abwasserleitungen im Gebäude", "positionen": [
            {"kurz": "Abwasserrohr PP (HT), DN {dn}",
             "lang": "Abwasserleitung aus Polypropylen-Steckmuffenrohr (HT) nach DIN EN 1451, DN {dn}, als Anschluss- "
                     "bzw. Sammelleitung in Vorwand, Schacht oder auf Rohdecke verlegen, mit Befestigungen sowie Bögen "
                     "und Abzweigen anteilig. Abrechnung nach Länge.",
             "einheit": "m", "kg": "411", "gen": "A",
             "varianten": [{"dn": "40", "h": 0.22, "mat": 5}, {"dn": "50", "h": 0.24, "mat": 6}, {"dn": "70", "h": 0.28, "mat": 8},
                           {"dn": "90", "h": 0.32, "mat": 11}, {"dn": "110", "h": 0.36, "mat": 14}, {"dn": "125", "h": 0.40, "mat": 19},
                           {"dn": "160", "h": 0.48, "mat": 30}]},
            {"kurz": "Abwasserrohr schallgedämmt, mineralverstärkt, DN {dn}",
             "lang": "Schallgedämmtes Abwasserrohrsystem aus mineralverstärktem Polypropylen mit Steckmuffen, DN {dn}, "
                     "Schallschutz nach DIN 4109 bzw. VDI 4100, mit schalldämmenden Rohrschellen, Bögen und Abzweigen "
                     "anteilig, als Fall- und Sammelleitung. Abrechnung nach Länge.",
             "einheit": "m", "kg": "411", "gen": "A",
             "varianten": [{"dn": "50", "h": 0.28, "mat": 11}, {"dn": "75", "h": 0.32, "mat": 15}, {"dn": "90", "h": 0.36, "mat": 19},
                           {"dn": "110", "h": 0.42, "mat": 24}, {"dn": "125", "h": 0.48, "mat": 32}, {"dn": "160", "h": 0.56, "mat": 48}]},
            {"kurz": "Gusseisernes Abflussrohr SML, DN {dn}",
             "lang": "Muffenloses gusseisernes Abflussrohr (SML) nach DIN EN 877 mit Spannverbindern, DN {dn}, als "
                     "Fall-, Sammel- oder Regenwasserleitung im Gebäude, mit Befestigungen und Formstücken anteilig. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "411", "gen": "B",
             "varianten": [{"dn": "70", "h": 0.45, "mat": 32}, {"dn": "100", "h": 0.55, "mat": 42}, {"dn": "125", "h": 0.62, "mat": 58},
                           {"dn": "150", "h": 0.72, "mat": 75}, {"dn": "200", "h": 0.95, "mat": 125}]},
            {"kurz": "Grundleitung KG-Rohr PVC-U SN 4, DN {dn}, unter Bodenplatte",
             "lang": "Grundleitung aus PVC-U-Rohr (KG) SN 4 nach DIN EN 1401, DN {dn}, in vorbereitetem Graben bzw. "
                     "Sandbett unter der Bodenplatte verlegen, Gefälle nach DIN 1986-100, Formstücke anteilig, "
                     "Dichtheitsprüfung gesondert. Erdarbeiten gesondert. Abrechnung nach Länge.",
             "einheit": "m", "kg": "411", "gen": "A",
             "varianten": [{"dn": "110", "h": 0.30, "mat": 9}, {"dn": "125", "h": 0.32, "mat": 12}, {"dn": "160", "h": 0.38, "mat": 17},
                           {"dn": "200", "h": 0.48, "mat": 30}]},
            {"kurz": "Reinigungsöffnung in Abwasserleitung DN {dn}",
             "lang": "Reinigungsrohr bzw. Reinigungsöffnung mit dichtem Deckel in Fall- oder Grundleitung einbauen, DN {dn}.",
             "einheit": "St", "kg": "411", "gen": "A",
             "varianten": [{"dn": "100", "h": 0.6, "mat": 32}, {"dn": "150", "h": 0.8, "mat": 70}]},
            {"kurz": "Lüftungsventil (Belüfter) DN {dn}",
             "lang": "Rohrbelüftungsventil nach DIN EN 12380 für Fall- bzw. Sammelleitungen, DN {dn}, zugänglich einbauen.",
             "einheit": "St", "kg": "411", "gen": "A",
             "varianten": [{"dn": "50", "h": 0.4, "mat": 32}, {"dn": "110", "h": 0.5, "mat": 85}]},
            {"kurz": "Dachdurchführung Lüftungsleitung DN {dn}",
             "lang": "Hauptlüftung über Dach mit Dachdurchgangsziegel bzw. Flachdach-Lüftungsdurchführung und "
                     "Lüftungshaube, DN {dn}, Anschluss der Dachabdichtung durch Dachdecker.",
             "einheit": "St", "kg": "411", "gen": "B",
             "varianten": [{"dn": "100", "h": 1.2, "mat": 75}, {"dn": "125", "h": 1.4, "mat": 95}]},
            {"kurz": "Dichtheitsprüfung Grundleitungen DIN EN 1610",
             "lang": "Dichtheitsprüfung der neu verlegten Grundleitungen mit Wasser oder Luft nach DIN EN 1610, "
                     "einschließlich Absperrblasen und Protokoll. Abrechnung nach geprüfter Länge.",
             "einheit": "m", "kg": "411", "h": 0.05, "mat": 0.2, "geraet": 2.5, "gen": "B", "achsen": []},
            {"kurz": "TV-Inspektion Bestandsleitung DN 100–200, mit Bericht",
             "lang": "Kamerabefahrung der vorhandenen Grund- bzw. Anschlussleitungen DN 100 bis 200, Haltungsbericht "
                     "mit Zustandsklassifizierung und Video. Abrechnung nach befahrener Länge, Anfahrt anteilig.",
             "einheit": "m", "kg": "411", "h": 0.03, "mat": 0, "geraet": 5.5, "gen": "C", "tags": ["altbau"], "achsen": []},
        ]},
        {"name": "Abläufe, Rückstau, Hebeanlagen", "positionen": [
            {"kurz": "Bodenablauf DN {dn}, mit Aufsatzstück und Rost, {art}",
             "lang": "Bodenablauf aus Kunststoff bzw. Edelstahl nach DIN EN 1253, DN {dn}, {art}, mit Geruchsverschluss, "
                     "höhenverstellbarem Aufsatzstück, Dichtmanschette für Verbundabdichtung und Rost.",
             "einheit": "St", "kg": "411", "gen": "B",
             "varianten": [{"dn": "50", "art": "senkrecht", "h": 1.5, "mat": 135}, {"dn": "70", "art": "waagerecht", "h": 1.6, "mat": 160},
                           {"dn": "100", "art": "mit Rückstauverschluss", "h": 2.0, "mat": 340}]},
            {"kurz": "Duschrinne bodengleich Edelstahl, Länge {l} mm",
             "lang": "Duschrinne aus Edelstahl für bodengleiche Duschen mit Ablaufkörper DN 50, Abflussleistung "
                     "≥ 0,6 l/s, werkseitiger Dichtmanschette, Rost (Design nach Bemusterung), Länge {l} mm, "
                     "höhenverstellbar einbauen und anschließen.",
             "einheit": "St", "kg": "411", "gen": "B",
             "varianten": [{"l": "800", "h": 2.5, "mat": 320}, {"l": "1000", "h": 2.7, "mat": 380}, {"l": "1200", "h": 2.9, "mat": 440}]},
            {"kurz": "Rückstauverschluss für fäkalienfreies Abwasser DN {dn}",
             "lang": "Rückstauverschluss Typ 2 für fäkalienfreies Abwasser nach DIN EN 13564 zum Einbau in durchgehende "
                     "Leitung, DN {dn}, mit Betriebs- und Notverschluss, zugänglich einbauen.",
             "einheit": "St", "kg": "411", "gen": "B",
             "varianten": [{"dn": "100", "h": 2.5, "mat": 360}, {"dn": "150", "h": 3.0, "mat": 620}]},
            {"kurz": "Rückstauverschluss elektronisch für fäkalienhaltiges Abwasser DN {dn}",
             "lang": "Rückstauverschluss Typ 3 mit motorischem Verschluss und Steuerung mit Alarmgeber für fäkalien"
                     "haltiges Abwasser, DN {dn}, einbauen und elektrisch an bauseitige Steckdose anschließen.",
             "einheit": "St", "kg": "411", "gen": "C",
             "varianten": [{"dn": "100", "h": 3.5, "mat": 1150}, {"dn": "150", "h": 4.0, "mat": 1600}]},
            {"kurz": "Fäkalienhebeanlage {art}",
             "lang": "Fäkalienhebeanlage nach DIN EN 12050-1 {art}, mit Sammelbehälter, Schneidwerk bzw. Freistromrad, "
                     "Niveausteuerung, Alarmgeber, Rückflussverhinderer und Absperrschieber, einschließlich "
                     "Anschluss der Zu-, Druck- und Lüftungsleitung sowie Inbetriebnahme.",
             "einheit": "St", "kg": "411", "gen": "C",
             "varianten": [{"art": "Einzelanlage (1 Pumpe)", "h": 8, "mat": 2400}, {"art": "Doppelanlage (2 Pumpen)", "h": 12, "mat": 5200}]},
            {"kurz": "Schmutzwasserpumpe mit Schwimmerschalter im Pumpensumpf",
             "lang": "Tauchmotorpumpe für fäkalienfreies Schmutzwasser mit Schwimmerschalter in bauseitigem Pumpensumpf "
                     "aufstellen, Druckleitung mit Rückschlagklappe bis 5 m und Rückstauschleife anteilig.",
             "einheit": "St", "kg": "411", "h": 3, "mat": 380, "gen": "B"},
            {"kurz": "Fettabscheider NS {ns}, freistehend",
             "lang": "Fettabscheideranlage aus Polyethylen nach DIN EN 1825 mit integriertem Schlammfang, Nenngröße NS {ns}, "
                     "freistehend im Gebäude, mit Probenahme, Entsorgungsleitung und Inbetriebnahme.",
             "einheit": "St", "kg": "411", "gen": "C",
             "varianten": [{"ns": "2", "h": 10, "mat": 5200}, {"ns": "4", "h": 12, "mat": 7400}]},
        ]},
        {"name": "Regenwasser innen", "positionen": [
            {"kurz": "Flachdachablauf beheizbar, DN {dn}, mit Kiesfang",
             "lang": "Flachdachgully DN {dn} mit Wärmedämmkörper, Aufstockelement für Warmdach, Anschlussflansch für die "
                     "Dachabdichtung und Kiesfang, auf Wunsch beheizt; Einbindung in die Abdichtung durch Dachdecker.",
             "einheit": "St", "kg": "411", "gen": "B",
             "varianten": [{"dn": "70", "h": 2.0, "mat": 240}, {"dn": "100", "h": 2.2, "mat": 290}]},
            {"kurz": "Notüberlauf Attika DN {dn}",
             "lang": "Notüberlauf für Flachdach als Attikadurchführung mit Speier, DN {dn}, nach Entwässerungsberechnung "
                     "DIN 1986-100 einbauen.",
             "einheit": "St", "kg": "411", "gen": "B",
             "varianten": [{"dn": "70", "h": 1.5, "mat": 150}, {"dn": "100", "h": 1.8, "mat": 210}]},
            {"kurz": "Druckströmungsentwässerung Flachdach, je Ablauf",
             "lang": "Dachablauf für Druckströmungsentwässerung (Unterdrucksystem) mit Sammelleitung PE-HD anteilig, "
                     "nach hydraulischer Berechnung des Herstellers. Abrechnung je Ablauf einschließlich Leitungsanteil bis 15 m.",
             "einheit": "St", "kg": "411", "h": 7, "mat": 950, "gen": "C"},
            {"kurz": "Kondensatleitung Klima/Brennwert, PP DN 32, mit Siphon",
             "lang": "Kondensatleitung aus PP DN 32 bis 10 m mit Siphon bzw. Kugelgeruchsverschluss an Entwässerung anschließen.",
             "einheit": "St", "kg": "411", "h": 1.5, "mat": 45, "gen": "A"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Ergänzungen (Runde 2)
ABL_ROST = [{"k": "", "t": "Rost Edelstahl Standard."}, {"k": "Designrost/fliesbar", "t": "Designrost bzw. befliesbare Abdeckung nach Bemusterung.", "fm": 1.25},
            {"k": "befahrbar Klasse L15", "t": "Ablauf und Rost befahrbar Belastungsklasse L 15 (Garage, Werkstatt).", "fm": 1.4}]
LBS[0]["gruppen"][0]["positionen"] += [
    {"kurz": "Zulage Formstück Abwasser (Bogen/Abzweig) DN {dn}",
     "lang": "Zulage für Formstücke (Bogen, Abzweig, Übergang, Reduzierung) des gewählten Abwasserrohrsystems, DN {dn}, soweit nicht im Rohr enthalten.",
     "einheit": "St", "kg": "411", "gen": "A",
     "varianten": [{"dn": "50–70", "h": 0.12, "mat": 5}, {"dn": "90–110", "h": 0.18, "mat": 12}, {"dn": "125–160", "h": 0.25, "mat": 26}, {"dn": "200", "h": 0.4, "mat": 60}]},
    {"kurz": "Übergang auf Bestandsleitung (Guss/Steinzeug) DN {dn}",
     "lang": "Anschluss an vorhandene Guss- bzw. Steinzeugleitung mit Übergangsmanschette bzw. Rohrkupplung, Leitung sauber abtrennen, DN {dn}.",
     "einheit": "St", "kg": "411", "gen": "B", "tags": ["altbau"],
     "varianten": [{"dn": "100", "h": 1.5, "mat": 45}, {"dn": "150", "h": 2.0, "mat": 85}]},
    {"kurz": "Kernbohrung für Abwasserrohr, Ø bis {d} mm",
     "lang": "Kernbohrung durch Wand bzw. Decke, Ø bis {d} mm, Dicke bis 30 cm, nass gebohrt, Bohrkern entsorgen. Statische Freigabe bauseits.",
     "einheit": "St", "kg": "411", "gen": "B", "lohn": "abbruch",
     "varianten": [{"d": "100", "h": 0.8, "mat": 0, "geraet": 35}, {"d": "150", "h": 1.0, "mat": 0, "geraet": 48}, {"d": "200", "h": 1.2, "mat": 0, "geraet": 60}]},
    {"kurz": "Abwasserleitungen demontieren und entsorgen, bis DN {dn}",
     "lang": "Vorhandene Abwasserleitungen (Guss, Kunststoff, Steinzeug) mit Halterungen demontieren, Anschlüsse verschließen, entsorgen, bis DN {dn}. Abrechnung nach Länge.",
     "einheit": "m", "kg": "411", "gen": "B", "tags": ["altbau"], "lohn": "abbruch",
     "varianten": [{"dn": "100", "h": 0.25, "mat": 0, "geraet": 2.5}, {"dn": "150", "h": 0.4, "mat": 0, "geraet": 4}]},
    {"kurz": "Inliner-Sanierung Fallleitung/Grundleitung DN {dn}",
     "lang": "Grabenlose Sanierung der vorhandenen Abwasserleitung mit Schlauchliner (Epoxidharz bzw. Silikat), DN {dn}, einschließlich Reinigung, "
             "Kamerabefahrung vor und nach der Sanierung und Öffnen der Anschlüsse. Abrechnung nach Länge.",
     "einheit": "m", "kg": "411", "gen": "C", "tags": ["altbau"],
     "varianten": [{"dn": "100", "h": 0.8, "mat": 120, "geraet": 60}, {"dn": "150", "h": 1.0, "mat": 160, "geraet": 75}]},
    {"kurz": "Hochdruckspülung Abwasserleitung, Bestand",
     "lang": "Reinigung der vorhandenen Abwasserleitungen mit Hochdruckspülfahrzeug, Entsorgung des Spülguts. Abrechnung nach Länge, Anfahrt anteilig.",
     "einheit": "m", "kg": "411", "h": 0.03, "mat": 0, "geraet": 4.5, "gen": "C", "tags": ["altbau"]},
    {"kurz": "Rohrschelle Abwasser mit Schalldämmung und Abhängung, Zulage",
     "lang": "Zulage für Fixpunkt- bzw. Gleitschellen mit Schalldämmeinlage an abgehängten Sammelleitungen. Abrechnung je Schelle.",
     "einheit": "St", "kg": "411", "h": 0.2, "mat": 9, "gen": "A"},
    {"kurz": "Kontrollschacht Kunststoff im Gebäude/Außen DN {dn}",
     "lang": "Kontroll- bzw. Revisionsschacht aus PP DN {dn} mit Gerinne, Teleskop-Aufsatz und Abdeckung Klasse A/B, setzen und anschließen.",
     "einheit": "St", "kg": "411", "gen": "B", "varianten": [{"dn": "400", "h": 4, "mat": 420}, {"dn": "600", "h": 5, "mat": 680}, {"dn": "1000", "h": 8, "mat": 1650}]},
]
LBS[0]["gruppen"][1]["positionen"] += [
    {"kurz": "Hebeanlage kompakt für Einzelobjekt (WC/Dusche/Waschtisch)",
     "lang": "Kleinhebeanlage für den Einbau hinter bzw. neben einem Einzelobjekt nach DIN EN 12050-3 mit Anschluss und Druckleitung bis 5 m.",
     "einheit": "St", "kg": "411", "h": 4, "mat": 680, "gen": "B"},
    {"kurz": "Pumpenschacht/Sammelschacht Kunststoff mit Pumpe, unterflur",
     "lang": "Unterflur-Pumpenschacht aus PE mit Tauchpumpe, Niveausteuerung, Rückschlagklappe und Druckleitung, einbauen und anschließen.",
     "einheit": "St", "kg": "411", "h": 8, "mat": 1950, "gen": "C"},
    {"kurz": "Neutralisationsanlage Brennwertkondensat, bis {kw} kW",
     "lang": "Neutralisationsbox mit Granulat für Brennwertkondensat bis {kw} kW Kesselleistung, ggf. mit Förderpumpe, anschließen.",
     "einheit": "St", "kg": "411", "gen": "A", "varianten": [{"kw": "70", "h": 1.5, "mat": 180}, {"kw": "350", "h": 2.5, "mat": 680}]},
    {"kurz": "Wartung Hebeanlage nach DIN EN 12056-4, je Anlage",
     "lang": "Wartung der Hebeanlage durch Fachkundigen mit Funktionsprüfung und Protokoll.",
     "einheit": "St", "kg": "411", "h": 2, "mat": 20, "gen": "B"},
    {"kurz": "Leichtflüssigkeitsabscheider/Koaleszenzabscheider NS {ns}",
     "lang": "Abscheideranlage für Leichtflüssigkeiten nach DIN EN 858 mit Schlammfang und Koaleszenzeinsatz, NS {ns}, einbauen. Erdarbeiten gesondert.",
     "einheit": "St", "kg": "411", "gen": "C", "varianten": [{"ns": "3", "h": 10, "mat": 4800}, {"ns": "6", "h": 12, "mat": 6900}]},
]
LBS[0]["gruppen"][2]["positionen"] += [
    {"kurz": "Regenwasser-Fallrohr innenliegend, SML/PE-HD gedämmt, DN {dn}",
     "lang": "Innenliegende Regenwasserleitung mit Tauwasserdämmung, DN {dn}, als Fall- und Sammelleitung. Abrechnung nach Länge.",
     "einheit": "m", "kg": "411", "gen": "B", "varianten": [{"dn": "100", "h": 0.7, "mat": 52}, {"dn": "125", "h": 0.8, "mat": 66}, {"dn": "150", "h": 0.9, "mat": 85}]},
    {"kurz": "Balkon-/Terrassenablauf mit Abdichtungsflansch DN {dn}",
     "lang": "Balkonablauf mit Klebeflansch für Bitumen- bzw. Flüssigabdichtung, Aufstockelement und Rost, DN {dn}.",
     "einheit": "St", "kg": "411", "gen": "B", "varianten": [{"dn": "50", "h": 1.5, "mat": 140}, {"dn": "70", "h": 1.6, "mat": 165}]},
    {"kurz": "Regenwassernutzung Zisterne-Hauswasserwerk mit Nachspeisung",
     "lang": "Regenwassernutzungsanlage: Hauswasserwerk mit Schwimmender Entnahme, Trinkwassernachspeisung mit freiem Auslauf, Steuerung, Betriebswasserleitung bis 15 m.",
     "einheit": "St", "kg": "411", "h": 12, "mat": 2400, "gen": "C"},
]
zuweisen(LBS, vorab() + [
    (ist("m", kurz=r"HT|schallgedämmt|SML|Regenwasser-Fall"), [VERLEGUNG_ABW, ORT, MENGE]),
    (ist("m", kurz=r"Grundleitung"), [ORT_KLEIN, MENGE]),
    (ist("St", kurz=r"Duschrinne|Balkon"), [ABL_ROST[:2], ORT_KLEIN]),
    (ist("St", kurz=r"Bodenablauf"), [ABL_ROST, ORT_KLEIN]),
    (ist("St", kurz=r"Hebeanlage|Rückstau|Pumpe|abscheider|Neutralisation|Schacht"), [GERAET_AUFSTELLUNG[:2], ORT_KLEIN]),
    (ist("m"), [ORT_KLEIN, MENGE]),
    (ist("St"), [ORT, BEFESTIGUNG]),
    (ist(), [ORT_KLEIN]),
])
