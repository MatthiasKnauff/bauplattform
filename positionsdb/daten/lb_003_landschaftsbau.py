# LB 003 Landschaftsbauarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "003", "name": "Landschaftsbauarbeiten", "atv": "DIN 18320", "lohn": "aussen",
    "gruppen": [
        {"name": "Boden, Rasen", "positionen": [
            {"kurz": "Oberboden {art}, Dicke {d} cm",
             "lang": "Oberboden {art}, Dicke im Mittel {d} cm, profilgerecht einbauen, grob planieren, Steine und "
                     "Wurzeln über 5 cm absammeln. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "512", "gen": "A",
             "varianten": [{"art": "aus seitlicher Lagerung andecken", "d": "20", "h": 0.06, "mat": 0, "geraet": 1.6},
                           {"art": "liefern (Mutterboden gesiebt) und andecken", "d": "20", "h": 0.07, "mat": 7.5, "geraet": 1.6},
                           {"art": "liefern und andecken", "d": "30", "h": 0.09, "mat": 11, "geraet": 2.2}]},
            {"kurz": "Feinplanum für Rasen / Pflanzflächen",
             "lang": "Vegetationstragschicht lockern, Feinplanum herstellen (±2 cm), Steine absammeln, Bodenverbesserung "
                     "durch Kompost 2 l/m² einarbeiten. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "574", "h": 0.06, "mat": 0.6, "geraet": 0.3, "gen": "A"},
            {"kurz": "Rasen {art}",
             "lang": "{art}, einschließlich Startdüngung, Wässern bis zur Abnahme und erstem Schnitt. "
                     "Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "574", "gen": "A",
             "varianten": [{"art": "Gebrauchsrasen RSM 2.2 ansäen, 25 g/m²", "h": 0.03, "mat": 0.9, "geraet": 0.2},
                           {"art": "Rollrasen Gebrauchsrasen verlegen und andrücken", "h": 0.10, "mat": 5.5, "geraet": 0.2},
                           {"art": "Landschaftsrasen mit Kräutern ansäen", "h": 0.03, "mat": 1.1, "geraet": 0.2}]},
            {"kurz": "Fertigstellungspflege Rasen bis Abnahme",
             "lang": "Fertigstellungspflege Rasen nach DIN 18917: mähen (mindestens 3 Schnitte), düngen, wässern, "
                     "Fehlstellen nachsäen, bis zur Abnahme. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "574", "h": 0.04, "mat": 0.4, "geraet": 0.2, "gen": "B"},
        ]},
        {"name": "Pflanzungen", "positionen": [
            {"kurz": "Bodendecker / Stauden pflanzen, {n} St/m²",
             "lang": "Bodendecker bzw. Stauden im Topf, Arten nach Pflanzplan, {n} St/m² pflanzen, angießen, "
                     "einschließlich Pflanzenlieferung. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "574", "gen": "B",
             "varianten": [{"n": "6", "h": 0.20, "mat": 18}, {"n": "9", "h": 0.28, "mat": 26}]},
            {"kurz": "Heckenpflanzen {art}, {n} St/m",
             "lang": "Heckenpflanzen {art}, {n} Stück je laufenden Meter, liefern und pflanzen, Pflanzgraben "
                     "40 cm tief, mit Kompost verbessern, angießen. Abrechnung nach Länge.",
             "einheit": "m", "kg": "574", "gen": "B",
             "varianten": [{"art": "Hainbuche/Liguster 100–125 cm, wurzelnackt", "n": "3", "h": 0.35, "mat": 14},
                           {"art": "Eibe 60–80 cm, mit Ballen", "n": "3", "h": 0.50, "mat": 72}]},
            {"kurz": "Strauch / Solitärgehölz pflanzen, {gr}",
             "lang": "Strauch bzw. Solitärgehölz {gr}, Art nach Pflanzplan, Pflanzgrube 1,5-fache Ballengröße, "
                     "Bodenverbesserung, angießen, Gießrand.",
             "einheit": "St", "kg": "574", "gen": "B",
             "varianten": [{"gr": "Strauch 60–100 cm, Container", "h": 0.3, "mat": 24},
                           {"gr": "Solitär 150–200 cm, mit Ballen", "h": 1.2, "mat": 190}]},
            {"kurz": "Baum pflanzen, Hochstamm StU {stu} cm, mit Verankerung",
             "lang": "Hochstamm, Stammumfang {stu} cm, mit Drahtballen, liefern und pflanzen, Pflanzgrube mindestens "
                     "1,5 × 1,5 × 1,0 m mit Baumsubstrat, Dreibock aus Holzpfählen mit Kokosstrick, Stammschutz und "
                     "Gießrand, einschließlich Anwachspflege bis zur Abnahme.",
             "einheit": "St", "kg": "574", "gen": "C",
             "varianten": [{"stu": "16–18", "h": 4.0, "mat": 420, "geraet": 60}, {"stu": "20–25", "h": 5.0, "mat": 650, "geraet": 80}]},
            {"kurz": "Rindenmulch / Holzhäcksel aufbringen, Dicke 7 cm",
             "lang": "Mulchschicht aus Rindenmulch bzw. Holzhäcksel 10/40 in 7 cm Dicke auf Pflanzflächen "
                     "aufbringen. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "574", "h": 0.05, "mat": 4.5, "gen": "A"},
            {"kurz": "Wurzelschutz / Baumschutz während der Bauzeit",
             "lang": "Bestandsbaum nach DIN 18920 schützen: ortsfester Bauzaun im Abstand Kronentraufe + 1,5 m bzw. "
                     "Stammschutz aus Bohlen mit Polsterung, Unterhaltung und Rückbau.",
             "einheit": "St", "kg": "593", "h": 3.0, "mat": 120, "gen": "B"},
        ]},
        {"name": "Zäune, Ausstattung", "positionen": [
            {"kurz": "Doppelstabmattenzaun verzinkt/beschichtet, Höhe {hh} m",
             "lang": "Zaunanlage aus Doppelstabmatten 6/5/6 mm, verzinkt und pulverbeschichtet RAL 6005 bzw. 7016, "
                     "Pfosten in Betonfundamenten C20/25, Höhe {hh} m, einschließlich Eck- und Endpfosten. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "531", "gen": "A",
             "varianten": [{"hh": "1,03", "h": 0.40, "mat": 38}, {"hh": "1,43", "h": 0.45, "mat": 48}, {"hh": "1,83", "h": 0.55, "mat": 62}]},
            {"kurz": "Zauntor Stahl verzinkt, {art}",
             "lang": "Tor passend zur Zaunanlage aus Stahlrahmen mit Doppelstabmattenfüllung, verzinkt und beschichtet, "
                     "{art}, mit Schloss und Drücker, Torpfosten in Fundamenten.",
             "einheit": "St", "kg": "531", "gen": "B",
             "varianten": [{"art": "einflügelig 1,0 m breit", "h": 3.0, "mat": 520}, {"art": "zweiflügelig 3,0 m breit", "h": 5.0, "mat": 1350}]},
            {"kurz": "Holzzaun / Sichtschutzelement Lärche, Höhe 1,80 m",
             "lang": "Sichtschutzzaun aus Lärche unbehandelt, Elemente 1,80 × 1,80 m auf Pfosten mit H-Anker in "
                     "Betonfundament. Abrechnung nach Länge.",
             "einheit": "m", "kg": "531", "h": 0.9, "mat": 115, "gen": "B"},
            {"kurz": "Sitzbank Holz/Stahl, Fundament",
             "lang": "Parkbank mit Stahlgestell und Holzauflage (Hartholz FSC), 1,80 m, mit Rückenlehne, auf "
                     "Punktfundamenten aufgedübelt.",
             "einheit": "St", "kg": "551", "h": 2.5, "mat": 780, "gen": "B"},
            {"kurz": "Hochbeet / Pflanzkübel Cortenstahl",
             "lang": "Pflanzgefäß bzw. Hochbeet aus Cortenstahl 3 mm, 120 × 60 × 60 cm, mit Drainageschicht, Vlies und "
                     "Substrat befüllt.",
             "einheit": "St", "kg": "551", "h": 1.5, "mat": 420, "gen": "B"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Runde 2: Ausführungsachsen und weitere Grundpositionen
FLAECHE = [{}, {"k": "≤ 50 m²", "t": "Ausführung in Einzelflächen bis 50 m² bzw. Pflanzinseln, überwiegend von Hand.", "fh": 1.5, "fg": 1.3, "gen": "B"}]
BODEN = [{}, {"k": "Bodenverb.", "t": "Pflanzfläche zusätzlich mit Kompost 3 cm und Pflanzsubstrat verbessern, einarbeiten.", "h": 0.04, "mat": 3.5}]
PFLEGE = [{}, {"k": "m. Pflege", "t": "Einschließlich Fertigstellungspflege bis zur Abnahme nach DIN 18916 (Wässern, Unkraut, Nachschnitt).",
           "fh": 1.35, "mat": 0.5}]
GROESSE = [{"k": "", "t": "Pflanzgröße wie angegeben."}, {"k": "Solitär", "t": "Pflanzgröße eine Sortierung höher (Solitärqualität).", "fm": 1.6, "fh": 1.2, "gen": "C"}]
ZAUN_OBF = [{"k": "verzinkt", "t": "Oberfläche feuerverzinkt."}, {"k": "verz.+beschichtet", "t": "Oberfläche feuerverzinkt und pulverbeschichtet RAL 6005 bzw. 7016.", "fm": 1.22}]
ZAUN_BEF = [{"k": "", "t": "Pfosten in Einzelfundamenten C20/25 (Aushub mit Erdbohrer)."},
            {"k": "aufgedübelt", "t": "Pfosten mit Fußplatten auf vorhandene Mauer bzw. Fundamentstreifen gedübelt.", "h": -0.1, "mat": 6},
            {"k": "Hanglage", "t": "Zaun in Hanglage abgetreppt bzw. schräg geführt.", "fh": 1.3}]

for gr in LBS[0]["gruppen"]:
    for p in gr["positionen"]:
        k = p["kurz"]
        if k.startswith(("Oberboden", "Feinplanum", "Rasen")):
            p["achsen"] = [FLAECHE, BODEN] if k.startswith("Rasen") else [FLAECHE]
        elif k.startswith(("Bodendecker", "Hecken")):
            p["achsen"] = [GROESSE, BODEN, PFLEGE]
        elif k.startswith(("Strauch", "Baum pflanzen")):
            p["achsen"] = [GROESSE, PFLEGE]
        elif k.startswith("Doppelstabmattenzaun"):
            p["achsen"] = [ZAUN_OBF, ZAUN_BEF]
        elif k.startswith("Zauntor"):
            p["achsen"] = [ZAUN_OBF, [{}, {"k": "mit E-Öffner", "t": "Mit Elektro-Türöffner und Anschlussdose; Verkabelung gesondert.", "h": 1.0, "mat": 150}]]

LBS[0]["gruppen"] += [
    {"name": "Gehölzarbeiten, Baumpflege", "positionen": [
        {"kurz": "Baum fällen, Stammdurchmesser bis {d} cm, {art}",
         "lang": "Baum im Bestand fachgerecht fällen bzw. abtragen (Seilklettertechnik oder Hubarbeitsbühne nach "
                 "Erfordernis), Holz und Schnittgut {art}. Stammdurchmesser in 1 m Höhe bis {d} cm. Fällgenehmigung bauseits.",
         "einheit": "St", "kg": "214", "gen": "C", "tags": ["altbau"],
         "achsen": [[{}, {"k": "m. Stubben", "t": "Wurzelstubben bis 30 cm unter Gelände ausfräsen, Loch mit Boden verfüllen.", "h": 1.0, "geraet": 60}]],
         "varianten": [{"d": "30", "art": "abfahren und verwerten", "h": 3, "geraet": 90}, {"d": "50", "art": "abfahren und verwerten", "h": 6, "geraet": 220},
                       {"d": "80", "art": "abfahren und verwerten", "h": 12, "geraet": 520}, {"d": "50", "art": "häckseln, Hackgut auf der Fläche", "h": 6.5, "geraet": 200}]},
        {"kurz": "Gehölze roden, Sträucher bis {hh} m Höhe",
         "lang": "Sträucher und Gehölzaufwuchs bis {hh} m Höhe einschließlich Wurzeln roden, Schnittgut abfahren und "
                 "verwerten. Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "214", "gen": "B", "achsen": [FLAECHE],
         "varianten": [{"hh": "2", "h": 0.10, "geraet": 1.8}, {"hh": "4", "h": 0.18, "geraet": 3.2}]},
        {"kurz": "Baumpflege Kronenschnitt, Baumhöhe bis {hh} m",
         "lang": "Pflegeschnitt nach ZTV-Baumpflege: Totholz entfernen, Lichtraumprofil herstellen, Kronensicherung "
                 "prüfen, Schnittgut abfahren. Baumhöhe bis {hh} m.",
         "einheit": "St", "kg": "574", "gen": "C", "tags": ["altbau"],
         "varianten": [{"hh": "10", "h": 3, "geraet": 60}, {"hh": "15", "h": 5, "geraet": 140}, {"hh": "20", "h": 8, "geraet": 260}]},
        {"kurz": "Baumschutz Stammschutz und Wurzelvorhang",
         "lang": "Bestandsbaum während der Bauzeit nach DIN 18920 schützen: Stammschutz aus Bohlen über Polsterung bis 2 m Höhe, "
                 "bei Arbeiten im Wurzelbereich Wurzelvorhang aus Gewebe mit Pfählen und Füllboden. Je Baum.",
         "einheit": "St", "kg": "593", "h": 3.5, "mat": 140, "gen": "B"},
        {"kurz": "Hecke schneiden, Höhe bis {hh} m",
         "lang": "Formschnitt an vorhandener Hecke, beidseitig und oben, Schnittgut aufnehmen und abfahren. "
                 "Abrechnung nach Länge.",
         "einheit": "m", "kg": "574", "gen": "B", "tags": ["altbau"],
         "varianten": [{"hh": "1,5", "h": 0.10, "geraet": 0.8}, {"hh": "2,5", "h": 0.18, "geraet": 1.5}]},
    ]},
    {"name": "Bewässerung, Sonderflächen", "positionen": [
        {"kurz": "Tropfbewässerung Pflanzflächen, mit Steuergerät",
         "lang": "Tropfschlauchbewässerung mit druckkompensierten Tropfern, Verteilerleitung PE 25, Magnetventil, "
                 "Filter und Bewässerungscomputer mit Regensensor; Wasseranschluss gesondert. Abrechnung nach "
                 "bewässerter Fläche.",
         "einheit": "m²", "kg": "573", "h": 0.12, "mat": 6.5, "gen": "C", "achsen": [FLAECHE]},
        {"kurz": "Regner-Bewässerung Rasen, Versenkregner",
         "lang": "Automatische Rasenbewässerung mit Versenkregnern, Rohrleitungen PE im Graben, Ventilbox, Steuergerät "
                 "mit Regensensor, Inbetriebnahme. Abrechnung nach bewässerter Fläche.",
         "einheit": "m²", "kg": "573", "h": 0.10, "mat": 5.5, "gen": "C", "achsen": [FLAECHE]},
        {"kurz": "Retentions-/Versickerungsmulde begrünt, Tiefe {d} cm",
         "lang": "Versickerungsmulde nach DWA-A 138 profilieren, belebte Oberbodenzone 30 cm andecken, Ansaat mit "
                 "Regelsaatgut für Mulden. Muldentiefe {d} cm. Abrechnung nach Muldenfläche.",
         "einheit": "m²", "kg": "541", "gen": "B",
         "varianten": [{"d": "30", "h": 0.12, "mat": 6.5, "geraet": 3}, {"d": "50", "h": 0.16, "mat": 8.5, "geraet": 4.5}]},
        {"kurz": "Blühwiese / Kräuterrasen ansäen",
         "lang": "Ansaat mit gebietseigenem Regiosaatgut (Blumenwiese), Saatbett vorbereiten, anwalzen, ein "
                 "Schröpfschnitt im Anwuchsjahr. Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "574", "h": 0.03, "mat": 1.6, "geraet": 0.3, "gen": "B", "achsen": [FLAECHE, PFLEGE]},
        {"kurz": "Fertigrasen (Rollrasen) verlegen",
         "lang": "Fertigrasen aus Gebrauchsrasen auf vorbereitetem Feinplanum verlegen, anwalzen und angießen. "
                 "Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "574", "h": 0.08, "mat": 5.5, "gen": "A", "achsen": [FLAECHE, BODEN, PFLEGE]},
        {"kurz": "Entwicklungspflege Pflanzflächen, {n}. Jahr",
         "lang": "Entwicklungspflege nach DIN 18919 für Pflanzflächen: 6 Pflegegänge (Unkraut, Wässern bei Bedarf, "
                 "Rückschnitt, Nachpflanzung gesondert), {n}. Standjahr. Abrechnung nach Fläche und Jahr.",
         "einheit": "m²", "kg": "574", "gen": "B",
         "varianten": [{"n": "1", "h": 0.12, "mat": 0.4}, {"n": "2", "h": 0.08, "mat": 0.3}]},
    ]},
    {"name": "Zäune, Tore (Ergänzung)", "positionen": [
        {"kurz": "Maschendrahtzaun, Höhe {hh} m, Spanndrähte",
         "lang": "Maschendrahtzaun aus Drahtgeflecht 60 mm, kunststoffummantelt, mit Rohrpfosten Ø 38 mm und Spanndrähten, "
                 "Eck- und Endpfosten mit Streben. Abrechnung nach Länge.",
         "einheit": "m", "kg": "531", "gen": "A", "achsen": [ZAUN_BEF],
         "varianten": [{"hh": "1,00", "h": 0.30, "mat": 16}, {"hh": "1,50", "h": 0.35, "mat": 21}, {"hh": "2,00", "h": 0.42, "mat": 27}]},
        {"kurz": "Stabgitterzaun Sicherheit, Höhe {hh} m, Übersteigschutz",
         "lang": "Sicherheitszaun aus Stabgittermatten 6/5/6 mm mit Übersteigschutz (Y-Ausleger mit Stacheldraht bzw. "
                 "Klingendraht), Pfosten 60 × 60 mm. Abrechnung nach Länge.",
         "einheit": "m", "kg": "531", "gen": "B", "achsen": [ZAUN_OBF, ZAUN_BEF],
         "varianten": [{"hh": "2,00", "h": 0.70, "mat": 85}, {"hh": "2,40", "h": 0.80, "mat": 105}]},
        {"kurz": "Schiebetor freitragend, Durchfahrt {b} m",
         "lang": "Freitragendes Schiebetor aus Stahl, Füllung Stabgitter passend zum Zaun, mit Laufwagen, Führungs- und "
                 "Endpfosten, Fundament. Durchfahrtsbreite {b} m.",
         "einheit": "St", "kg": "531", "gen": "C", "achsen": [ZAUN_OBF,
             [{"k": "Handbetrieb", "t": "Bedienung von Hand mit Schloss."}, {"k": "Antrieb", "t": "Mit elektrischem Schiebetorantrieb, Lichtschranken und Funksteuerung; Zuleitung gesondert.", "h": 6, "mat": 1450}]],
         "varianten": [{"b": "4,0", "h": 12, "mat": 3600}, {"b": "6,0", "h": 14, "mat": 4800}, {"b": "8,0", "h": 16, "mat": 6200}]},
        {"kurz": "Zaun demontieren und entsorgen",
         "lang": "Vorhandenen Zaun einschließlich Pfosten und Fundamente demontieren, laden und entsorgen. "
                 "Abrechnung nach Länge.",
         "einheit": "m", "kg": "212", "h": 0.35, "geraet": 4, "gen": "B", "lohn": "abbruch", "tags": ["altbau"]},
    ]},
]
