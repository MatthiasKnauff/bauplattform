# LB 011 Abscheideranlagen, Kleinkläranlagen – eigene Texte und Ansätze (Preisstand 11/2026)

TIEFE = [{"k": "", "t": "Einbautiefe (Zulaufsohle unter Gelände) bis 1,5 m."},
         {"k": "ET 2,5 m", "t": "Einbautiefe bis 2,5 m, mit Aufsatzstücken bzw. Schachtverlängerung.", "fh": 1.2, "mat": 260},
         {"k": "ET 3,5 m", "t": "Einbautiefe bis 3,5 m, mit Schachtverlängerung und erhöhtem Aufwand beim Versetzen.", "fh": 1.4, "mat": 520, "gen": "C"}]
ABDECK = [{"k": "", "t": "Schachtabdeckung Klasse B 125 (Gehwege, Pkw-Flächen gelegentlich)."},
          {"k": "D 400", "t": "Schachtabdeckung Klasse D 400 (Fahrbahnen, Lkw-befahren), mit lastverteilendem Betonauflagering.", "mat": 380, "h": 1.5}]
WERK = [{"k": "Beton", "t": "Behälter aus Stahlbeton, werkseitig innen beschichtet bzw. ausgekleidet.", "geraet": 250},
        {"k": "PE", "t": "Behälter aus Polyethylen, auftriebssicher eingebaut (Betonummantelung bzw. Verankerung gesondert).", "fm": 0.92}]
GW = [{}, {"k": "im GW", "t": "Einbau im Grundwasser bzw. Schichtenwasser: Auftriebssicherung und Wasserhaltung gesondert.", "fh": 1.25, "gen": "C"}]

LBS = [{
    "nr": "011", "name": "Abscheideranlagen, Kleinkläranlagen", "atv": "DIN 18306", "lohn": "kanal",
    "gruppen": [
        {"name": "Leichtflüssigkeitsabscheider", "positionen": [
            {"kurz": "Leichtfl.-Abscheider Kl. I, NS {ns}, Schlammfang {s} l",
             "lang": "Leichtflüssigkeitsabscheider nach DIN EN 858 / DIN 1999-100, Klasse I (Koaleszenzabscheider), Nenngröße NS {ns}, mit "
                     "vorgeschaltetem bzw. integriertem Schlammfang {s} l und selbsttätigem Schwimmerverschluss. Liefern, mit Autokran versetzen, "
                     "an Zu- und Ablauf anschließen, Dichtheitsprüfung. Erdarbeiten gesondert.",
             "einheit": "St", "kg": "411", "gen": "C", "achsen": [WERK, TIEFE, ABDECK, GW],
             "varianten": [{"ns": "3", "s": "600", "h": 10, "mat": 4200}, {"ns": "6", "s": "1200", "h": 12, "mat": 5600},
                           {"ns": "10", "s": "2000", "h": 14, "mat": 7400}, {"ns": "15", "s": "3000", "h": 16, "mat": 9600},
                           {"ns": "20", "s": "4000", "h": 18, "mat": 12200}]},
            {"kurz": "Warnanlage für Leichtflüssigkeitsabscheider, {art}",
             "lang": "Elektronische Warnanlage für Abscheider, {art}, mit Schaltgerät, optischer und akustischer Alarmierung und potentialfreiem Kontakt. "
                     "Montage, Kabelverlegung im Leerrohr bis 15 m, Inbetriebnahme.",
             "einheit": "St", "kg": "411", "gen": "B", "lohn": "elektro",
             "varianten": [{"art": "Schichtdicke Leichtflüssigkeit", "h": 4, "mat": 980}, {"art": "Schichtdicke und Aufstau", "h": 5, "mat": 1450},
                           {"art": "Schichtdicke, Aufstau, Schlammspiegel", "h": 6, "mat": 1950}]},
            {"kurz": "Probenahmeschacht DN {dn} nach Abscheider",
             "lang": "Probenahmeschacht aus Beton bzw. PE, DN {dn}, mit Durchflussrinne und Fallstufe für Probenahme, Abdeckung nach Belastungsklasse.",
             "einheit": "St", "kg": "411", "gen": "B", "achsen": [TIEFE[:2], ABDECK],
             "varianten": [{"dn": "800", "h": 5, "mat": 820}, {"dn": "1000", "h": 6, "mat": 1150}]},
        ]},
        {"name": "Fettabscheider, Stärkeabscheider", "positionen": [
            {"kurz": "Fettabscheider Erdeinbau, NS {ns}, Schlammfang {s} l",
             "lang": "Fettabscheider nach DIN EN 1825 / DIN 4040-100 zum Erdeinbau, Nenngröße NS {ns}, mit Schlammfang {s} l, Fettspeicher, "
                     "geruchsdichter Abdeckung, Lüftungsanschluss DN 100. Versetzen, Anschluss, Dichtheitsprüfung, Generalinspektionsgrundlage.",
             "einheit": "St", "kg": "411", "gen": "C", "achsen": [WERK, TIEFE, ABDECK, GW],
             "varianten": [{"ns": "2", "s": "200", "h": 10, "mat": 4300}, {"ns": "4", "s": "400", "h": 12, "mat": 5600},
                           {"ns": "7", "s": "700", "h": 14, "mat": 7600}, {"ns": "10", "s": "1000", "h": 16, "mat": 9400}]},
            {"kurz": "Fettabscheider freistehend Gebäude, NS {ns}, {art}",
             "lang": "Fettabscheider aus Edelstahl bzw. PE zur Aufstellung im Gebäude, Nenngröße NS {ns}, {art}, mit Schauglas, Probenahmeeinrichtung, "
                     "geruchsdichtem Deckel. Aufstellung, Anschluss an Zu-, Ablauf und Lüftung, Inbetriebnahme.",
             "einheit": "St", "kg": "411", "gen": "C", "lohn": "sanitaer",
             "achsen": [[{}, {"k": "erschwert", "t": "Einbringung durch Treppenhaus/Türen ohne Hebezeug, ggf. in Teilen.", "h": 4, "geraet": 120}]],
             "varianten": [{"ns": "2", "art": "Direktentsorgung", "h": 12, "mat": 8800}, {"ns": "4", "art": "Direktentsorgung", "h": 14, "mat": 11500},
                           {"ns": "4", "art": "Vollentsorgung mit Pumpe", "h": 16, "mat": 16800}, {"ns": "7", "art": "Vollentsorgung mit Pumpe", "h": 18, "mat": 21500},
                           {"ns": "10", "art": "Vollentsorgung, Hebeanlage", "h": 22, "mat": 28500}]},
            {"kurz": "Stärkeabscheider NS {ns}",
             "lang": "Stärkeabscheider nach DIN 4040 für Abwasser aus Kartoffel- und Gemüseverarbeitung, Nenngröße NS {ns}, mit Schlammfang. Aufstellung und Anschluss.",
             "einheit": "St", "kg": "411", "gen": "C", "lohn": "sanitaer",
             "varianten": [{"ns": "2", "h": 8, "mat": 3800}, {"ns": "4", "h": 10, "mat": 5200}]},
            {"kurz": "Generalinspektion Abscheideranlage, {art}",
             "lang": "Generalinspektion vor Inbetriebnahme bzw. wiederkehrend nach DIN 1999-100 / DIN 4040-100 durch Sachkundigen: Entleerung durch "
                     "Entsorger (gesondert), Reinigung, Prüfung von Bauzustand, Dichtheit, Einbauteilen; Prüfbericht. Anlage: {art}.",
             "einheit": "St", "kg": "411", "gen": "B",
             "varianten": [{"art": "Leichtflüssigkeitsabscheider bis NS 10", "h": 6, "mat": 60}, {"art": "Leichtflüssigkeitsabscheider über NS 10", "h": 9, "mat": 80},
                           {"art": "Fettabscheider", "h": 7, "mat": 70}]},
        ]},
        {"name": "Kleinkläranlagen, Sammelgruben", "positionen": [
            {"kurz": "Kleinkläranlage {art}, bis {ew} EW",
             "lang": "Vollbiologische Kleinkläranlage mit allgemeiner bauaufsichtlicher Zulassung, Verfahren {art}, Ausbaugröße bis {ew} Einwohnerwerte, "
                     "Ablaufklasse C. Behälter mit Einbauteilen, Steuerung im Außenschaltschrank, Belüftung. Versetzen, Anschluss, Inbetriebnahme, Einweisung; "
                     "Erdarbeiten gesondert.",
             "einheit": "St", "kg": "411", "gen": "C", "achsen": [WERK, TIEFE[:2], GW, [{}, {"k": "Ablaufklasse D", "t": "Ablaufklasse D (mit Nitrifikation/Denitrifikation).", "fm": 1.08}]],
             "varianten": [{"art": "SBR", "ew": "4", "h": 14, "mat": 5600}, {"art": "SBR", "ew": "8", "h": 16, "mat": 7200},
                           {"art": "SBR", "ew": "12", "h": 18, "mat": 9400}, {"art": "Festbett", "ew": "4", "h": 14, "mat": 6200},
                           {"art": "Festbett", "ew": "8", "h": 16, "mat": 8100}]},
            {"kurz": "Abwassersammelgrube abflusslos, {v} m³",
             "lang": "Abflusslose Sammelgrube für häusliches Schmutzwasser, Nutzinhalt {v} m³, mit Füllstandsanzeige und Absaugleitung DN 100 mit Storz-B-Kupplung. Versetzen, Anschluss, Dichtheitsprüfung.",
             "einheit": "St", "kg": "411", "gen": "C", "achsen": [WERK, TIEFE[:2], ABDECK, GW],
             "varianten": [{"v": "6", "h": 10, "mat": 3800}, {"v": "10", "h": 12, "mat": 5400}, {"v": "15", "h": 14, "mat": 7600}]},
            {"kurz": "Regenwasserzisterne Erdtank, {v} m³",
             "lang": "Erdtank zur Regenwassersammlung mit Zulauffilter, beruhigtem Zulauf, Überlaufsiphon, schwimmender Entnahme und Teleskop-Domschacht; Versetzen und Anschluss.",
             "einheit": "St", "kg": "411", "gen": "B", "achsen": [WERK, ABDECK, GW],
             "varianten": [{"v": "3", "h": 8, "mat": 1650}, {"v": "5", "h": 9, "mat": 2300}, {"v": "7,5", "h": 10, "mat": 3200}, {"v": "10", "h": 12, "mat": 4300}]},
            {"kurz": "Rückhaltebehälter mit Drossel, {v} m³",
             "lang": "Regenrückhaltebehälter mit Drosselabfluss nach Vorgabe der Entwässerungsgenehmigung, Nutzvolumen {v} m³, Drosselorgan einstellbar, "
                     "Notüberlauf, Wartungsschacht. Versetzen, Anschluss und Dichtheitsprüfung.",
             "einheit": "St", "kg": "411", "gen": "C", "achsen": [WERK, TIEFE[:2], ABDECK, GW],
             "varianten": [{"v": "5", "h": 10, "mat": 3900}, {"v": "10", "h": 14, "mat": 6600}, {"v": "20", "h": 20, "mat": 11800}]},
            {"kurz": "Stilllegung Altgrube/Kleinkläranlage, {art}",
             "lang": "Bestehende Grube bzw. Kleinkläranlage außer Betrieb nehmen: Entleerung durch Entsorger (gesondert), Reinigung, {art}, Anschlussleitungen verschließen.",
             "einheit": "St", "kg": "394", "gen": "C", "tags": ["altbau"],
             "varianten": [{"art": "mit Sand verfüllen", "h": 8, "mat": 380, "geraet": 250}, {"art": "abbrechen und verfüllen", "h": 16, "mat": 450, "geraet": 900}]},
        ]},
        {"name": "Schächte, Pumpstationen, Betrieb", "positionen": [
            {"kurz": "Kontrollschacht DN {dn}, Zu-/Ablauf DN {a}",
             "lang": "Kontroll- bzw. Revisionsschacht DN {dn} aus Betonfertigteilen bzw. PE mit Gerinne, Steigbügeln bzw. Steigleiter ab DN 1000, "
                     "Anschlüssen DN {a}, Abdeckung nach Belastungsklasse. Versetzen, Anschluss, Dichtheitsprüfung.",
             "einheit": "St", "kg": "411", "gen": "B", "achsen": [WERK, TIEFE, ABDECK, GW],
             "varianten": [{"dn": "400", "a": "150", "h": 3.5, "mat": 420}, {"dn": "600", "a": "150", "h": 4.5, "mat": 720},
                           {"dn": "800", "a": "200", "h": 6, "mat": 980}, {"dn": "1000", "a": "200", "h": 8, "mat": 1350}]},
            {"kurz": "Abwasserpumpstation erdeingebaut, {art}",
             "lang": "Schmutzwasser-Pumpstation zum Erdeinbau, Schacht PE bzw. Beton, {art}, Druckleitungsanschluss, Absperrschieber, Rückschlagklappe, "
                     "Schaltgerät mit Alarm im Außenschrank. Versetzen, Anschluss, Inbetriebnahme.",
             "einheit": "St", "kg": "411", "gen": "C", "achsen": [TIEFE, ABDECK, GW],
             "varianten": [{"art": "1 Pumpe, Einfamilienhaus", "h": 10, "mat": 3600}, {"art": "2 Pumpen, Mehrfamilienhaus", "h": 14, "mat": 6900},
                           {"art": "2 Pumpen mit Schneidwerk", "h": 16, "mat": 8600}]},
            {"kurz": "Entleerung und Reinigung Abscheider/Grube durch Entsorger, {v} m³",
             "lang": "Entleerung und Hochdruckreinigung durch zugelassenen Entsorgungsfachbetrieb mit Saugwagen, Inhalt bis {v} m³, Entsorgungsnachweis; "
                     "Entsorgungsgebühren enthalten.", "einheit": "St", "kg": "411", "gen": "C",
             "varianten": [{"v": "2", "h": 1.5, "geraet": 380}, {"v": "5", "h": 2, "geraet": 620}, {"v": "10", "h": 3, "geraet": 1050}]},
            {"kurz": "Dichtheitsprüfung Abscheider/Behälter mit Wasser",
             "lang": "Dichtheitsprüfung von Abscheider bzw. Behälter durch Wasserfüllung nach DIN 1999-100 bzw. DIN EN 1610, Prüfprotokoll.",
             "einheit": "St", "kg": "411", "gen": "B", "varianten": [{"h": 3, "mat": 20, "geraet": 60}]},
            {"kurz": "Wartungsvertrag Kleinkläranlage je Jahr, {n} Wartungen",
             "lang": "Wartung der Kleinkläranlage nach bauaufsichtlicher Zulassung durch Fachbetrieb mit {n} Wartung(en) je Jahr, Ablaufprobe, Wartungsbericht an Behörde.",
             "einheit": "St", "kg": "411", "gen": "B", "varianten": [{"n": "2", "h": 4, "mat": 90}, {"n": "3", "h": 6, "mat": 130}]},
        ]},
    ],
}]
