# LB 025 Estricharbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "025", "name": "Estricharbeiten", "atv": "DIN 18353", "lohn": "estrich",
    "gruppen": [
        {"name": "Dämmschichten, Trennlagen, Randstreifen", "positionen": [
            {"kurz": "Estrichdämmung {d} mm",
             "lang": "Wärmedämmschicht unter Estrich aus EPS-Hartschaumplatten DEO, Druckspannung 100 kPa, WLS 035, "
                     "Dicke {d} mm, einlagig dicht gestoßen auf ebenem Untergrund verlegt. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "352", "gen": "A",
             "varianten": [{"d": "40", "h": 0.05, "mat": 4.2}, {"d": "60", "h": 0.05, "mat": 6.2},
                           {"d": "80", "h": 0.06, "mat": 8.2}, {"d": "100", "h": 0.06, "mat": 10.3}, {"d": "120", "h": 0.07, "mat": 12.3}]},
            {"kurz": "Trittschalldämmung {art}, DES sm, {d}",
             "lang": "Trittschalldämmschicht aus {art}, Anwendungstyp DES sm, Dicke {d}, dicht gestoßen bzw. im "
                     "Verband auf der Wärmedämmung verlegt. Zusammendrückbarkeit nach Schallschutznachweis.",
             "einheit": "m²", "kg": "352", "gen": "A",
             "varianten": [{"art": "EPS-T Trittschall-Dämmplatten", "d": "30-2 mm", "h": 0.05, "mat": 4.5},
                           {"art": "Mineralwolle-Trittschalldämmplatten", "d": "30-5 mm", "h": 0.06, "mat": 7.5},
                           {"art": "Holzfaser-Trittschalldämmplatten", "d": "20 mm", "h": 0.06, "mat": 9.5}]},
            {"kurz": "Ausgleichsschüttung gebunden, d im Mittel {d} mm",
             "lang": "Gebundene Ausgleichsschüttung (z. B. zementgebundenes EPS-Granulat) zum Ausgleich von "
                     "Unebenheiten und zur Überdeckung von Rohrleitungen auf Rohdecken einbauen und abziehen, "
                     "Dicke im Mittel {d} mm. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "352", "gen": "B",
             "varianten": [{"d": "30", "h": 0.10, "mat": 5.5}, {"d": "50", "h": 0.12, "mat": 9}, {"d": "80", "h": 0.15, "mat": 14}]},
            {"kurz": "Trockenschüttung lose zum Höhenausgleich, d bis {d} mm",
             "lang": "Lose Trockenschüttung (Blähton bzw. Perlite) als Höhenausgleich unter Trockenestrich bzw. auf "
                     "Holzbalkendecken einbauen und abziehen, Dicke bis {d} mm, mit Rieselschutz.",
             "einheit": "m²", "kg": "352", "gen": "B", "tags": ["altbau"],
             "varianten": [{"d": "30", "h": 0.10, "mat": 6}, {"d": "60", "h": 0.14, "mat": 11}]},
            {"kurz": "Trennlage/Abdeckung PE-Folie 0,2 mm",
             "lang": "Abdeckung der Dämmschicht mit PE-Folie mindestens 0,2 mm, Stöße 8 cm überlappend, an den "
                     "Rändern hochgezogen. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "352", "h": 0.02, "mat": 0.5, "gen": "A"},
            {"kurz": "Randdämmstreifen PE, {d} mm, mit Folienlasche",
             "lang": "Randdämmstreifen aus PE-Schaum, Dicke {d} mm, Höhe bis Oberkante Belag, mit angeschweißter "
                     "Folienlasche, an aufgehenden Bauteilen und Durchdringungen. Abrechnung nach Länge.",
             "einheit": "m", "kg": "352", "gen": "A",
             "varianten": [{"d": "8", "h": 0.03, "mat": 0.6}, {"d": "10", "h": 0.03, "mat": 0.8}]},
        ]},
        {"name": "Zementestrich", "positionen": [
            {"kurz": "Zementestrich schwimmend, {d} mm",
             "lang": "Schwimmender Zementestrich CT-C25-F4 nach DIN EN 13813 / DIN 18560-2 auf Dämmschicht, "
                     "Nenndicke {d} mm, maschinell eingebracht, verdichtet und abgerieben, Ebenheit nach DIN 18202 "
                     "Tabelle 3 Zeile 3. Einschließlich Scheinfugen bzw. Fugen nach Fugenplan. Dämmung gesondert.",
             "einheit": "m²", "kg": "352", "gen": "A",
             "varianten": [{"d": "45", "h": 0.20, "mat": 7.0}, {"d": "50", "h": 0.21, "mat": 7.8},
                           {"d": "60", "h": 0.23, "mat": 9.3}, {"d": "70", "h": 0.25, "mat": 10.8}]},
            {"kurz": "Zement-Heizestrich Bauart A, {d} mm über Rohr",
             "lang": "Zement-Heizestrich CT-C25-F4 mit Zusatzmittel, Bauart A nach DIN 18560-2, Überdeckung der "
                     "Heizrohre {d} mm, Gesamtdicke nach Rohrsystem, einschließlich Bewegungsfugen über Heizkreisgrenzen "
                     "und Messstellen für die CM-Messung. Heizsystem gesondert.",
             "einheit": "m²", "kg": "352", "gen": "A",
             "varianten": [{"d": "45", "h": 0.25, "mat": 11.5}, {"d": "50", "h": 0.26, "mat": 12.5}]},
            {"kurz": "Verbundestrich CT-C30-F5 auf Beton, d = {d} mm",
             "lang": "Zement-Verbundestrich CT-C30-F5 auf vorbereitetem Betonuntergrund mit Haftbrücke frisch in "
                     "frisch, Dicke {d} mm, Oberfläche geglättet. Untergrundvorbereitung (Kugelstrahlen) gesondert.",
             "einheit": "m²", "kg": "352", "gen": "B",
             "varianten": [{"d": "30", "h": 0.25, "mat": 7.5}, {"d": "50", "h": 0.30, "mat": 11}]},
            {"kurz": "Zementestrich auf Trennlage, {d} mm",
             "lang": "Zementestrich auf Trennschicht (zweilagige PE-Folie) nach DIN 18560-4, Nenndicke {d} mm, "
                     "z. B. in Keller- und Nebenräumen, Oberfläche abgerieben.",
             "einheit": "m²", "kg": "325", "gen": "A",
             "varianten": [{"d": "40", "h": 0.20, "mat": 7.0}, {"d": "50", "h": 0.21, "mat": 8.3}]},
            {"kurz": "Gefälleestrich für Duschen/Balkone, d i. M. {d} mm",
             "lang": "Zementestrich im Gefälle 1,5–2 % zu Abläufen bzw. Rinnen, Dicke im Mittel {d} mm, "
                     "einschließlich Anpassen an Ablaufkörper, Oberfläche abgerieben für Verbundabdichtung.",
             "einheit": "m²", "kg": "352", "gen": "B",
             "varianten": [{"d": "40", "h": 0.45, "mat": 8}, {"d": "60", "h": 0.55, "mat": 11}]},
            {"kurz": "Aufpreis Estrich {art}",
             "lang": "Aufpreis zu den Estrichpositionen für {art}.",
             "einheit": "m²", "kg": "352", "gen": "B",
             "varianten": [{"art": "Schnellestrich (belegreif nach ca. 7 Tagen)", "h": 0.0, "mat": 6},
                           {"art": "Faserbewehrung (Kunststofffasern)", "h": 0.0, "mat": 1.3},
                           {"art": "Betonstahlmatte bzw. Estrichgitter einlegen", "h": 0.04, "mat": 2.5},
                           {"art": "Oberfläche flügelgeglättet für Nutzestrich", "h": 0.10, "mat": 0.5, "geraet": 1.0}]},
        ]},
        {"name": "Calciumsulfat- und Sonderestriche", "positionen": [
            {"kurz": "CA-Fließestrich schwimmend, {d} mm",
             "lang": "Schwimmender Calciumsulfat-Fließestrich CAF C25-F5 auf Dämmschicht mit dichter PE-Abdeckung, "
                     "Nenndicke {d} mm, gepumpt und mit Schwabbelstange entlüftet. Abschleifen gesondert. "
                     "Nicht in dauerfeuchten Bereichen.",
             "einheit": "m²", "kg": "352", "gen": "A",
             "varianten": [{"d": "35", "h": 0.10, "mat": 11}, {"d": "40", "h": 0.10, "mat": 12.5}, {"d": "50", "h": 0.11, "mat": 15.5}]},
            {"kurz": "CA-Fließestrich als Heizestrich, {d} mm über Rohr",
             "lang": "Calciumsulfat-Fließestrich CAF C25-F5 als Heizestrich Bauart A, Überdeckung der Heizrohre "
                     "{d} mm, Gesamtdicke nach Rohrsystem, mit Messstellen. Abschleifen gesondert.",
             "einheit": "m²", "kg": "352", "gen": "A",
             "varianten": [{"d": "35", "h": 0.12, "mat": 17}, {"d": "40", "h": 0.12, "mat": 18.5}]},
            {"kurz": "Fließestrich-Oberfläche anschleifen und absaugen",
             "lang": "Oberfläche des Calciumsulfat-Fließestrichs nach ausreichender Erhärtung maschinell anschleifen "
                     "und absaugen (Entfernen der Sinterschicht).",
             "einheit": "m²", "kg": "352", "h": 0.04, "mat": 0, "geraet": 0.8, "gen": "A"},
            {"kurz": "Gussasphaltestrich AS-IC{k}, d = {d} mm",
             "lang": "Gussasphaltestrich nach DIN 18560, Härteklasse IC{k}, Dicke {d} mm, auf Trennlage bzw. "
                     "Dämmschicht, Oberfläche abgesandet. Sofort begeh- und belegbar.",
             "einheit": "m²", "kg": "352", "gen": "C",
             "varianten": [{"k": "15", "d": "25", "h": 0.18, "mat": 26, "geraet": 4}, {"k": "10", "d": "35", "h": 0.20, "mat": 34, "geraet": 4}]},
            {"kurz": "Trockenestrich Gipsfaser-Estrichelemente, d = {d}",
             "lang": "Trockenestrich aus Gipsfaser-Estrichelementen mit Stufenfalz, Dicke {d}, auf "
                     "Trittschalldämmung bzw. Trockenschüttung (gesondert), Falze verklebt und verschraubt, "
                     "einschließlich Randstreifen.",
             "einheit": "m²", "kg": "352", "gen": "B", "tags": ["altbau"],
             "varianten": [{"d": "20 mm", "h": 0.25, "mat": 22}, {"d": "25 mm", "h": 0.27, "mat": 27},
                           {"d": "30 mm, holzfaserkaschiert", "h": 0.27, "mat": 36}]},
            {"kurz": "Hartstoffeinstreuung frisch in frisch, Verschleißschicht",
             "lang": "Hartstoffeinstreuung (Korund bzw. Quarz) frisch in frisch auf Beton- bzw. Zementestrichfläche "
                     "einarbeiten und flügelglätten, Menge ca. 4–5 kg/m², für mittlere Beanspruchung, mit Nachbehandlung.",
             "einheit": "m²", "kg": "352", "h": 0.12, "mat": 3.5, "geraet": 1.0, "gen": "B"},
        ]},
        {"name": "Fugen, Nebenarbeiten", "positionen": [
            {"kurz": "Bewegungsfuge im Estrich mit Profil",
             "lang": "Bewegungsfuge durch den gesamten Estrichquerschnitt mit Fugenprofil herstellen, nach Fugenplan, "
                     "z. B. an Türdurchgängen und Heizkreisgrenzen. Abrechnung nach Länge.",
             "einheit": "m", "kg": "352", "h": 0.10, "mat": 3.5, "gen": "A"},
            {"kurz": "Estrich-Scheinfuge schneiden und verharzen",
             "lang": "Scheinfugen bzw. Risse im Estrich mit Nachschnitt öffnen, mit Reaktionsharz und Wellenverbindern "
                     "kraftschlüssig verharzen, Oberfläche absanden.",
             "einheit": "m", "kg": "352", "h": 0.25, "mat": 3.5, "geraet": 0.5, "gen": "B"},
            {"kurz": "Belegreifheizen Heizestrich nach Protokoll",
             "lang": "Funktions- und Belegreifheizen des Heizestrichs nach Aufheizprotokoll in Abstimmung mit dem "
                     "Heizungsbauer begleiten, einschließlich Dokumentation. Abrechnung je Nutzungseinheit.",
             "einheit": "St", "kg": "352", "h": 2.0, "mat": 10, "gen": "B"},
            {"kurz": "CM-Messung Restfeuchte, je Messstelle",
             "lang": "Restfeuchtemessung mit dem CM-Gerät an vorbereiteter Messstelle, Protokoll an Bauleitung "
                     "und Folgegewerk.",
             "einheit": "St", "kg": "352", "h": 0.4, "mat": 3, "gen": "A"},
            {"kurz": "Estrich im Bestand entfernen, d bis {d} mm",
             "lang": "Vorhandenen Estrich einschließlich Dämmschicht abbrechen, Schutt zur Sammelstelle auf der "
                     "Baustelle; Entsorgung gesondert. Dicke bis {d} mm.",
             "einheit": "m²", "kg": "394", "gen": "B", "tags": ["altbau"], "lohn": "abbruch",
             "varianten": [{"d": "60", "h": 0.45, "geraet": 3}, {"d": "100", "h": 0.65, "geraet": 4.5}]},
        ]},
    ],
}]


# ---------------------------------------------------------------- Runde 2: Ergänzungen und Ausführungsachsen
def _gruppe(name):
    return next(g for g in LBS[0]["gruppen"] if g["name"] == name)


def _achsen(regeln):
    for g in LBS[0]["gruppen"]:
        for p in g["positionen"]:
            for pre, ax in regeln:
                if p["kurz"].startswith(pre) and "achsen" not in p:
                    p["achsen"] = ax
                    break


BESTAND = [{}, {"k": "Bestand", "t": "Ausführung im Bestand: Materialförderung mit Kleinmengen bzw. von Hand, Anschluss an vorhandene "
                "Bauteile, Schutz angrenzender Flächen.", "fh": 1.20, "geraet": 1.5, "gen": "B", "tags": ["altbau"]}]
GROESSE = [{}, {"k": "20–50 m²", "t": "Gesamtfläche je Einbauabschnitt 20 bis 50 m².", "fh": 1.12, "geraet": 0.8},
           {"k": "≤ 20 m²", "t": "Gesamtfläche je Einbauabschnitt bis 20 m² (Kleinmengen, Anfahrt anteilig).", "fh": 1.35, "geraet": 3.0, "gen": "B"}]
FESTIG = [{"k": "C25-F4"}, {"k": "C30-F5", "t": "Festigkeitsklasse abweichend CT-C30-F5.", "mat": 0.9},
          {"k": "C35-F5", "t": "Festigkeitsklasse abweichend CT-C35-F5 für höhere Lasten.", "mat": 1.8}]
DRUCK = [{"k": "EPS DEO 100"}, {"k": "EPS DEO 150", "t": "Druckspannung abweichend 150 kPa (EPS 150).", "fm": 1.25},
         {"k": "EPS DEO 200", "t": "Druckspannung abweichend 200 kPa (EPS 200).", "fm": 1.50},
         {"k": "PUR/PIR 023", "t": "Dämmstoff abweichend PUR/PIR-Hartschaum WLS 023, alukaschiert, Dicke wie angegeben.",
          "fm": 1.9, "gen": "B"}]
BESTAND_KL = [{}, {"k": "Bestand", "t": "Ausführung im Bestand: Kleinmengen, Anschluss an vorhandene Bauteile.", "fh": 1.30, "gen": "B", "tags": ["altbau"]}]
HARTSTOFF = [{"ersetze": [[r",? für mittlere Beanspruchung", ""]], "k": "4–5 kg/m²", "t": "Einstreumenge ca. 4–5 kg/m² für mittlere Beanspruchung."},
             {"k": "6–8 kg/m²", "t": "Einstreumenge ca. 6–8 kg/m² für schwere Beanspruchung (Hartstoffe nach DIN 1100).", "h": 0.02, "mat": 1.8}]
LAGEN = [{}, {"k": "zweilagig", "t": "Verlegung zweilagig mit versetzten Stößen.", "h": 0.03}]
ESTR_ZUS = [{}, {"k": "Schnellzement", "t": "Mit Schnellzement bzw. Estrichbeschleuniger (früh belegreif).", "mat": 6, "gen": "B"},
            {"k": "Faser", "t": "Mit Kunststofffasern als Schwindrissbremse.", "mat": 1.3}]

_gruppe("Dämmschichten, Trennlagen, Randstreifen")["positionen"] += [
    {"kurz": "Estrichdämmung {ka}, {d} mm",
     "lang": "Wärme- und Trittschalldämmung unter Estrich aus {art}, Dicke {d} mm, dicht gestoßen. Abrechnung nach Fläche.",
     "einheit": "m²", "kg": "352", "gen": "A", "achsen": [LAGEN, BESTAND],
     "varianten": [{"ka": "Mineralwolle", "art": "Mineralwolle-Estrichdämmplatten DES sg WLS 035", "d": "40", "h": 0.06, "mat": 8.5},
                   {"ka": "Mineralwolle", "art": "Mineralwolle-Estrichdämmplatten DES sg WLS 035", "d": "60", "h": 0.06, "mat": 12},
                   {"ka": "Holzfaser", "art": "Holzfaser-Dämmplatten druckfest", "d": "40", "h": 0.07, "mat": 12},
                   {"ka": "Holzfaser", "art": "Holzfaser-Dämmplatten druckfest", "d": "60", "h": 0.08, "mat": 17}]},
    {"kurz": "Perimeter-/Bodendämmung XPS unter Estrich, d = {d} mm",
     "lang": "Wärmedämmung aus XPS-Platten auf Bodenplatte bzw. unter Estrich in Feuchtebereichen, Dicke {d} mm, Druckspannung "
             "300 kPa, dicht gestoßen.", "einheit": "m²", "kg": "352", "gen": "A", "achsen": [LAGEN],
     "varianten": [{"d": "50", "h": 0.06, "mat": 9}, {"d": "80", "h": 0.07, "mat": 14}, {"d": "120", "h": 0.08, "mat": 21}]},
    {"kurz": "Feuchtigkeitssperre/Dampfbremse unter Dämmung, {art}",
     "lang": "Abdichtung bzw. Dampfbremse auf Rohdecke bzw. Bodenplatte unter der Dämmschicht aus {art}, Stöße überlappt und "
             "verklebt, an Wänden hochgeführt.", "einheit": "m²", "kg": "352", "gen": "A",
     "varianten": [{"art": "PE-Folie 0,3 mm zweilagig", "h": 0.04, "mat": 1.2}, {"art": "Bitumen-Schweißbahn", "h": 0.12, "mat": 7.5}]},
    {"kurz": "Rohrleitungen auf Rohdecke einbetten/fixieren (Ausgleich)",
     "lang": "Auf der Rohdecke verlegte Installationsleitungen mit Dämmstreifen bzw. Schüttung einfassen, sodass eine ebene "
             "Oberfläche für die Dämmschicht entsteht. Abrechnung nach Leitungslänge.", "einheit": "m", "kg": "352", "h": 0.06,
     "mat": 1.0, "gen": "B"},
    {"kurz": "Höhenausgleich Holzbalkendecke: Rieselschutz und Schüttung",
     "lang": "Holzbalkendecke im Bestand: Rieselschutzpappe auslegen, Trockenschüttung einbringen, abziehen und mit Ausgleichsplatten "
             "abdecken für Trockenestrich.", "einheit": "m²", "kg": "352", "h": 0.30, "mat": 14, "gen": "B", "tags": ["altbau"]},
]
_gruppe("Zementestrich")["positionen"] += [
    {"kurz": "Zementestrich als Nutzestrich, geglättet, d = {d} mm",
     "lang": "Zementestrich CT-C30-F5 als Nutzestrich ohne Belag (Keller, Technik, Garage), Dicke {d} mm, flügelgeglättet, "
             "mit Nachbehandlung und Fugenschnitt.", "einheit": "m²", "kg": "352", "gen": "B", "achsen": [GROESSE, BESTAND],
     "varianten": [{"d": "50", "h": 0.32, "mat": 8.5, "geraet": 1.0}, {"d": "70", "h": 0.36, "mat": 11.5, "geraet": 1.0}]},
    {"kurz": "Sichtestrich geschliffen und versiegelt, d = {d} mm",
     "lang": "Zement-Sichtestrich auf Dämmschicht bzw. als Heizestrich, Dicke {d} mm, nach Erhärtung mehrstufig geschliffen "
             "(Korn freigelegt bzw. Schleifbild nach Muster), imprägniert und versiegelt. Rissfreiheit kann nicht zugesichert werden.",
     "einheit": "m²", "kg": "352", "gen": "C", "achsen": [GROESSE],
     "varianten": [{"d": "60", "h": 0.85, "mat": 16, "geraet": 6}, {"d": "70", "h": 0.90, "mat": 18, "geraet": 6}]},
    {"kurz": "Estrich auf Treppenstufen, d bis 50 mm",
     "lang": "Zementestrich bzw. Ausgleichsmörtel auf Treppenstufen als Untergrund für Belag, Kanten scharfkantig "
             "abgezogen. Abrechnung je Stufe (Tritt- und Setzstufe).", "einheit": "St", "kg": "352", "h": 0.80, "mat": 6, "gen": "B",
     "achsen": [BESTAND]},
    {"kurz": "Estrich in Teilflächen ergänzen (Bestand), bis {a} m²",
     "lang": "Ausgebrochene bzw. aufgestemmte Estrichflächen (z. B. nach Leitungsverlegung) mit Dämmung und Estrich gleicher "
             "Dicke ergänzen, Ränder angeschnitten und verdübelt, Einzelfläche bis {a} m².", "einheit": "m²", "kg": "352", "gen": "C",
     "tags": ["altbau"], "varianten": [{"a": "1", "h": 1.30, "mat": 18, "geraet": 3}, {"a": "5", "h": 0.80, "mat": 15, "geraet": 2}]},
    {"kurz": "Estrich-Anschluss an Bestand verdübeln (Wellenverbinder)",
     "lang": "Neuen Estrich an vorhandenen Estrich kraftschlüssig mit Stahldübeln bzw. Wellenverbindern und Harz anschließen. "
             "Abrechnung nach Länge.", "einheit": "m", "kg": "352", "h": 0.30, "mat": 6, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Zulage Estrich: Überdeckung Leitungen/Mehrdicke je 10 mm",
     "lang": "Zulage für Mehrdicke des Estrichs je angefangene 10 mm über die Nenndicke hinaus.", "einheit": "m²", "kg": "352",
     "h": 0.02, "mat": 1.6, "gen": "A"},
]
_gruppe("Calciumsulfat- und Sonderestriche")["positionen"] += [
    {"kurz": "Fließestrich auf Holzbalkendecke (dünnschichtig), d = {d} mm",
     "lang": "Dünnschichtiger Calciumsulfat-Fließestrich bzw. Dünnestrich auf Trennlage über Holzdielen bzw. Trockenschüttung mit "
             "Ausgleichsplatte, Dicke {d} mm, nach Systemzulassung.", "einheit": "m²", "kg": "352", "gen": "C", "tags": ["altbau"],
     "achsen": [GROESSE], "varianten": [{"d": "20", "h": 0.20, "mat": 16}, {"d": "30", "h": 0.22, "mat": 21}]},
    {"kurz": "Dünnestrich/Renovierestrich auf Altuntergrund, d = {d} mm",
     "lang": "Selbstverlaufender, zementärer Dünnestrich auf vorbereitetem Altuntergrund (Altestrich, Fliese) im Verbund, Dicke "
             "{d} mm, mit Grundierung bzw. Haftbrücke.", "einheit": "m²", "kg": "352", "gen": "B", "tags": ["altbau"],
     "achsen": [GROESSE], "varianten": [{"d": "10", "h": 0.15, "mat": 16}, {"d": "20", "h": 0.18, "mat": 29}, {"d": "30", "h": 0.22, "mat": 42}]},
    {"kurz": "Kunstharzestrich Epoxid, d = {d} mm",
     "lang": "Kunstharzestrich aus Epoxidharz mit Quarzfüllung, Dicke {d} mm, auf grundiertem Untergrund, Oberfläche geglättet "
             "bzw. abgestreut, für chemische und mechanische Beanspruchung.", "einheit": "m²", "kg": "352", "gen": "C",
     "varianten": [{"d": "5", "h": 0.55, "mat": 38}, {"d": "10", "h": 0.70, "mat": 68}]},
    {"kurz": "Magnesiaestrich/Steinholzestrich, d = {d} mm",
     "lang": "Magnesiaestrich auf Trennlage bzw. im Verbund, Dicke {d} mm, Oberfläche geschliffen und geölt, für Industrie- und "
             "Bestandsflächen.", "einheit": "m²", "kg": "352", "gen": "C", "varianten": [{"d": "15", "h": 0.50, "mat": 22}, {"d": "25", "h": 0.60, "mat": 32}]},
    {"kurz": "Trockenestrich {ka}, {d} mm",
     "lang": "Trockenestrich aus {art}, Dicke {d} mm, schwimmend auf Dämmung, Nut und Feder verleimt, mit Randstreifen.",
     "einheit": "m²", "kg": "352", "gen": "B", "tags": ["altbau"], "achsen": [BESTAND],
     "varianten": [{"ka": "Spanplatte P5", "art": "Holzspanplatten P5 (V100)", "d": "22", "h": 0.25, "mat": 11},
                   {"ka": "OSB/4", "art": "OSB/4 Platten", "d": "22", "h": 0.25, "mat": 13},
                   {"ka": "Zementspanplatte", "art": "zementgebundenen Spanplatten", "d": "24", "h": 0.32, "mat": 26}]},
]
_gruppe("Fugen, Nebenarbeiten")["positionen"] += [
    {"kurz": "Estrich kugelstrahlen bzw. fräsen (Haftung/Abtrag)",
     "lang": "Estrich- bzw. Betonoberfläche kugelstrahlen bzw. fräsen zur Entfernung von Zementschlämme, Altbeschichtung bzw. "
             "zur Verbesserung der Haftung, absaugen.", "einheit": "m²", "kg": "352", "h": 0.08, "geraet": 4.5, "gen": "A",
     "achsen": [GROESSE]},
    {"kurz": "Estrich schleifen (Unebenheiten/Grate) bis 2 mm",
     "lang": "Estrichoberfläche zur Herstellung der Ebenheit maschinell schleifen, Grate und Überzähne entfernen, absaugen.",
     "einheit": "m²", "kg": "352", "h": 0.06, "geraet": 1.5, "gen": "A"},
    {"kurz": "Hohlstellen im Estrich verpressen (Injektion)",
     "lang": "Hohlliegenden Verbundestrich durch Bohrungen mit Epoxid-Injektionsharz verpressen, Bohrlöcher verschließen. "
             "Abrechnung nach Fläche der Hohlstelle.", "einheit": "m²", "kg": "352", "h": 0.80, "mat": 22, "gen": "C", "tags": ["altbau"]},
    {"kurz": "Estrich technisch trocknen mit Bautrockner, je {e}",
     "lang": "Beschleunigte Estrichtrocknung mit Kondenstrocknern bzw. Ventilatoren, Aufstellen, Betreiben und Kontrolle, "
             "einschließlich Stromkosten-Pauschale. Abrechnung je {e}.", "einheit": "StWo", "kg": "397", "gen": "B",
     "varianten": [{"e": "Gerät und Woche", "h": 0.8, "mat": 0, "geraet": 85}]},
    {"kurz": "Schutzabdeckung frischer Estrich, Hartfaser/Vlies",
     "lang": "Estrichflächen nach Belegreife bis zur Belagsverlegung mit Schutzvlies und Hartfaserplatten abdecken, Stöße "
             "abgeklebt, nach Gebrauch entfernen.", "einheit": "m²", "kg": "397", "h": 0.04, "mat": 2.8, "gen": "A"},
    {"kurz": "Stundenlohnarbeiten Estrichleger",
     "lang": "Arbeiten im Stundenlohn auf Anordnung der Bauleitung, Facharbeiter einschließlich aller Zuschläge.",
     "einheit": "h", "kg": "352", "h": 1.0, "mat": 0, "geraet": 0.5, "gen": "A"},
]

_achsen([
    ("Estrichdämmung", [DRUCK, LAGEN, BESTAND]),
    ("Trittschalldämmung", [BESTAND]),
    ("Ausgleichsschüttung", [GROESSE, BESTAND]),
    ("Zementestrich schwimmend", [FESTIG, ESTR_ZUS, GROESSE, BESTAND]),
    ("Zement-Heizestrich", [FESTIG[:2], ESTR_ZUS, GROESSE, BESTAND]),
    ("Verbundestrich", [GROESSE, BESTAND]),
    ("Zementestrich auf Trennlage", [FESTIG[:2], GROESSE, BESTAND]),
    ("Gefälleestrich", [BESTAND]),
    ("CA-Fließestrich", [GROESSE, BESTAND]),
    ("Gussasphalt", [GROESSE]),
    ("Trockenestrich Gipsfaser", [BESTAND]),
    ("Estrich im Bestand entfernen", [GROESSE]),
])


# ------------------------------------------------------------------ Runde 2: weitere Achsen und Grundpositionen
FOERDER = [{}, {"k": "ab 3. OG", "t": "Einbau ab dem 3. Obergeschoss bzw. Förderweite über 60 m, zusätzliche Pumpenleitung.", "fh": 1.08, "geraet": 0.6}]
RAUM_E = [{}, {"k": "Räume ≤ 10 m²", "t": "Einzelräume bis 10 m² (Bäder, Flure, Abstellräume) mit hohem Rand- und Fugenanteil.", "fh": 1.25, "fm": 1.03}]
for _g in LBS[0]["gruppen"]:
    for _p in _g["positionen"]:
        _k = _p["kurz"]
        if _p.get("achsen") and any(_k.startswith(x) for x in ("Zementestrich", "Zement-Heizestrich", "CA-Fließestrich", "Estrichdämmung", "Verbundestrich",
                                                                 "Gefälleestrich", "Ausgleichsschüttung", "Zementestrich als Nutzestrich")):
            _p["achsen"] = list(_p["achsen"]) + [FOERDER]
        if _p.get("achsen") and any(_k.startswith(x) for x in ("Zementestrich schwimmend", "CA-Fließestrich schwimmend", "Gefälleestrich", "Trockenestrich")):
            _p["achsen"] = list(_p["achsen"]) + [RAUM_E]
_achsen([
    ("Trockenschüttung lose", [GROESSE, BESTAND]),
    ("Trennlage/Abdeckung", [BESTAND_KL]),
    ("Randdämmstreifen", [BESTAND_KL]),
    ("Feuchtigkeitssperre", [BESTAND_KL]),
    ("Aufpreis Estrich", [BESTAND]),
    ("Estrich in Teilflächen", [FESTIG[:2], ESTR_ZUS]),
    ("Hartstoffeinstreuung", [GROESSE, HARTSTOFF]),
    ("Kunstharzestrich", [GROESSE, BESTAND]),
    ("Magnesiaestrich", [GROESSE, BESTAND]),
    ("Fließestrich-Oberfläche", [GROESSE, BESTAND]),
    ("Bewegungsfuge", [BESTAND_KL]),
    ("Estrich schleifen", [GROESSE, BESTAND]),
    ("Hohlstellen", [GROESSE]),
    ("Dünnestrich", [GROESSE, FOERDER]),
    ("Fließestrich auf Holzbalkendecke", [GROESSE, FOERDER]),
])
_gruppe("Calciumsulfat- und Sonderestriche")["positionen"] += [
    {"kurz": "Nivelliermasse selbstverlaufend, d = {d} mm, {art}",
     "lang": "Selbstverlaufende Ausgleichs- bzw. Nivelliermasse {art}, Schichtdicke {d} mm, auf grundiertem Untergrund maschinell bzw. von "
             "Hand eingebracht und mit Stachelwalze entlüftet, als Untergrund für Bodenbeläge.",
     "einheit": "m²", "kg": "352", "gen": "A", "achsen": [GROESSE, BESTAND, FOERDER],
     "varianten": [{"d": "5", "art": "zementär", "h": 0.10, "mat": 7.5}, {"d": "10", "art": "zementär", "h": 0.12, "mat": 14},
                   {"d": "20", "art": "zementär, faserarmiert", "h": 0.15, "mat": 26}, {"d": "10", "art": "calciumsulfatgebunden", "h": 0.11, "mat": 12}]},
    {"kurz": "Schnellestrich-System zementär, schwimmend, {d} mm, belegreif nach {t}",
     "lang": "Schnellestrich als Werktrockenmörtel-System CT-C30-F5 auf Dämmschicht, Nenndicke {d} mm, belegreif nach {t} nach "
             "Herstellerangabe (CM-Messung), maschinell eingebracht und abgerieben.",
     "einheit": "m²", "kg": "352", "gen": "B", "achsen": [GROESSE, BESTAND, FOERDER, RAUM_E],
     "varianten": [{"d": "45", "t": "ca. 3 Tagen", "h": 0.22, "mat": 17}, {"d": "50", "t": "ca. 3 Tagen", "h": 0.23, "mat": 19},
                   {"d": "45", "t": "ca. 24 Stunden", "h": 0.24, "mat": 24}]},
    {"kurz": "Leichtestrich/Schaumbeton als Ausgleich, d = {d} mm",
     "lang": "Leichter Ausgleichsestrich aus Schaumbeton bzw. Leichtzuschlag-Estrich, Rohdichte bis 500 kg/m³, zur Überdeckung von "
             "Installationen und zum Höhenausgleich, Dicke {d} mm, maschinell eingebaut.",
     "einheit": "m²", "kg": "352", "gen": "B", "achsen": [GROESSE, BESTAND, FOERDER],
     "varianten": [{"d": "50", "h": 0.10, "mat": 8.5, "geraet": 1.2}, {"d": "100", "h": 0.12, "mat": 16, "geraet": 1.6}, {"d": "150", "h": 0.14, "mat": 23, "geraet": 2.0}]},
]
_gruppe("Fugen, Nebenarbeiten")["positionen"] += [
    {"kurz": "Estrichbewehrung {art}",
     "lang": "Bewehrung im Estrich als {art}, mittig in der Estrichschicht eingebaut, im Bereich von Feldbegrenzungsfugen unterbrochen.",
     "einheit": "m²", "kg": "352", "gen": "A", "achsen": [BESTAND],
     "varianten": [{"art": "Estrichgitter verzinkt 50 × 50 × 2 mm", "h": 0.04, "mat": 2.6},
                   {"art": "Betonstahlmatte Q131 A", "h": 0.06, "mat": 3.8},
                   {"art": "Glasfaser-Estrichgewebe", "h": 0.03, "mat": 1.8}]},
    {"kurz": "Estrich auf Tragfähigkeit prüfen, Gitterritz- und Hammerschlagprüfung",
     "lang": "Prüfung vorhandener Estrichflächen auf Festigkeit, Hohllagen und Rissbildung mit Gitterritz- und Hammerschlagprüfung, "
             "Protokoll mit Lageplan.",
     "einheit": "m²", "kg": "352", "h": 0.02, "mat": 0, "gen": "A", "tags": ["altbau"], "achsen": [GROESSE]},
    {"kurz": "Riss im Estrich kraftschlüssig verharzen, mit Wellenverbindern",
     "lang": "Risse im Estrich aufschneiden, quer dazu im Abstand von 25 cm einschneiden, Estrichklammern bzw. Wellenverbinder einlegen und "
             "mit Gießharz kraftschlüssig verschließen, Oberfläche abgesandet.",
     "einheit": "m", "kg": "352", "h": 0.35, "mat": 6.5, "gen": "B", "tags": ["altbau"]},
]
