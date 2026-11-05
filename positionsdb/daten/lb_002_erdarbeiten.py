# LB 002 Erdarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "002", "name": "Erdarbeiten", "atv": "DIN 18300", "lohn": "erdbau", "kg": "311",
    "gruppen": [
        {"name": "Vorbereitende Arbeiten", "positionen": [
            {"kurz": "Baufeld räumen, Bewuchs bis {b}, entsorgen",
             "lang": "Baufeld von Strauchwerk, Gras und Bewuchs bis {b} räumen, einschließlich Wurzelstöcken bis "
                     "10 cm Durchmesser, Material laden, abfahren und verwerten. Abrechnung nach Fläche.",
             "einheit": "m²", "gen": "B", "kg": "212",
             "varianten": [{"b": "Rasen/Kraut", "h": 0.010, "geraet": 0.6}, {"b": "Strauchwerk 2 m Höhe", "h": 0.035, "geraet": 1.8}]},
            {"kurz": "Baum fällen, Stammdurchmesser bis {d} cm, einschl. Wurzelstock",
             "lang": "Baum fällen, zerkleinern und abfahren, Wurzelstock roden bzw. ausfräsen, Loch mit Boden "
                     "verfüllen. Erforderliche Fällgenehmigung stellt der Auftraggeber. Stammdurchmesser in 1 m Höhe bis {d} cm.",
             "einheit": "St", "gen": "C", "kg": "212",
             "varianten": [{"d": "30", "h": 3, "geraet": 140}, {"d": "60", "h": 7, "geraet": 380}, {"d": "90", "h": 12, "geraet": 720}]},
            {"kurz": "Oberboden abtragen, d = {d} cm, seitlich lagern",
             "lang": "Oberboden (Mutterboden) nach DIN 18915 in einer Dicke von {d} cm abtragen und auf der "
                     "Baustelle in Mieten bis 2 m Höhe getrennt lagern, Mieten profilieren. Abrechnung nach Fläche.",
             "einheit": "m²", "gen": "A",
             "varianten": [{"d": "20", "h": 0.012, "geraet": 1.2}, {"d": "30", "h": 0.016, "geraet": 1.7}]},
            {"kurz": "Oberboden abtragen und abfahren, d = {d} cm",
             "lang": "Oberboden in einer Dicke von {d} cm abtragen, laden und abfahren zur Verwertung durch den "
                     "Auftragnehmer, einschließlich Annahmegebühren für unbelasteten Oberboden.",
             "einheit": "m²", "gen": "B",
             "varianten": [{"d": "20", "h": 0.015, "geraet": 4.2}, {"d": "30", "h": 0.020, "geraet": 6.0}]},
            {"kurz": "Oberboden andecken aus Miete, d = {d} cm",
             "lang": "Gelagerten Oberboden aus der Miete aufnehmen, in einer Dicke von {d} cm auf vorbereiteten "
                     "Flächen andecken und grob planieren.",
             "einheit": "m²", "gen": "A", "kg": "512",
             "varianten": [{"d": "20", "h": 0.015, "geraet": 1.4}, {"d": "30", "h": 0.020, "geraet": 1.9}]},
            {"kurz": "Vorhandene Befestigung aufnehmen, {t}",
             "lang": "Vorhandene Flächenbefestigung aus {t} aufnehmen, Material laden und zur Verwertung abfahren "
                     "einschließlich Gebühren, Unterbau verbleibt.",
             "einheit": "m²", "gen": "B", "kg": "212",
             "varianten": [{"t": "Betonpflaster bis 10 cm", "h": 0.10, "geraet": 4.5}, {"t": "Asphalt bis 10 cm", "h": 0.08, "geraet": 8.5},
                           {"t": "Gehwegplatten", "h": 0.10, "geraet": 4.0}]},
        ]},
        {"name": "Aushub", "positionen": [
            {"kurz": "Baugrube ausheben, Homogenbereich {hb}, Tiefe bis {t} m, seitlich lagern",
             "lang": "Boden für die Baugrube profilgerecht ausheben, Homogenbereich {hb} nach Baugrundgutachten "
                     "(entspricht bisher etwa Bodenklasse 3–5), Aushubtiefe bis {t} m, Böschungen nach DIN 4124, "
                     "Boden auf der Baustelle zum Wiedereinbau lagern. Abrechnung nach Aufmaß im Abtrag.",
             "einheit": "m³", "gen": "A",
             "varianten": [{"hb": "B1 (leicht lösbar)", "t": "1,25", "h": 0.035, "geraet": 4.5},
                           {"hb": "B1 (leicht lösbar)", "t": "3,5", "h": 0.045, "geraet": 5.5},
                           {"hb": "B2 (mittelschwer lösbar)", "t": "3,5", "h": 0.055, "geraet": 6.8}]},
            {"kurz": "Baugrube ausheben, Homogenbereich {hb}, laden und abfahren (Z0)",
             "lang": "Boden für die Baugrube ausheben, Homogenbereich {hb}, Aushubtiefe bis 3,5 m, unmittelbar "
                     "auf Lkw laden und abfahren zur Verwertung, einschließlich Annahmegebühren für Boden der "
                     "Zuordnungsklasse Z0 (unbelastet). Belasteter Boden wird nach LB 087 nachgewiesen.",
             "einheit": "m³", "gen": "B",
             "varianten": [{"hb": "B1 (leicht lösbar)", "h": 0.05, "geraet": 25}, {"hb": "B2 (mittelschwer lösbar)", "h": 0.06, "geraet": 28}]},
            {"kurz": "Zulage für Aushub in Fels/schwer lösbarem Boden",
             "lang": "Zulage zum Aushub für schwer lösbaren Boden bzw. leichten Fels (Homogenbereich nach Gutachten), "
                     "Lösen mit Reißzahn oder Hydraulikmeißel.",
             "einheit": "m³", "h": 0.25, "geraet": 22, "gen": "C"},
            {"kurz": "Fundamentgräben ausheben, Breite bis {b} m, Tiefe bis {t} m",
             "lang": "Gräben für Streifenfundamente und Einzelfundamente profilgerecht ausheben, Sohle von Hand "
                     "nachgearbeitet, Breite bis {b} m, Tiefe bis {t} m, Boden seitlich lagern oder auf Lkw laden "
                     "(Abfuhr gesondert).",
             "einheit": "m³", "gen": "A", "kg": "322",
             "varianten": [{"b": "0,6", "t": "1,0", "h": 0.40, "geraet": 9}, {"b": "1,0", "t": "1,5", "h": 0.30, "geraet": 8}]},
            {"kurz": "Leitungsgraben ausheben, Tiefe bis {t} m, Breite nach DIN 4124",
             "lang": "Graben für Ver- und Entsorgungsleitungen ausheben, Grabenbreite nach DIN EN 1610 bzw. DIN 4124, "
                     "Tiefe bis {t} m, Boden seitlich lagern; Wiederverfüllen gesondert.",
             "einheit": "m³", "gen": "A", "kg": "541",
             "varianten": [{"t": "1,25", "h": 0.20, "geraet": 7}, {"t": "2,0", "h": 0.24, "geraet": 8.5}]},
            {"kurz": "Handaushub, Homogenbereich B1",
             "lang": "Bodenaushub in Handschachtung an Leitungen, Fundamenten oder beengten Stellen, Boden seitlich "
                     "lagern bzw. in Behälter laden.",
             "einheit": "m³", "h": 2.6, "geraet": 3, "gen": "B"},
            {"kurz": "Boden laden und abfahren, Zuordnungsklasse {z}, einschl. Gebühr",
             "lang": "Gelagerten Boden laden, abfahren und einer zugelassenen Verwertungs- bzw. Entsorgungsstelle "
                     "zuführen, Zuordnungsklasse nach LAGA bzw. ErsatzbaustoffV {z}, einschließlich Annahmegebühren "
                     "und Nachweisen. Abrechnung nach Wiegeschein (Umrechnung 1,8 t/m³).",
             "einheit": "t", "gen": "C", "kg": "311",
             "varianten": [{"z": "Z0/BM-0", "h": 0.02, "geraet": 12}, {"z": "Z1.1/BM-F1", "h": 0.02, "geraet": 17},
                           {"z": "Z1.2/BM-F2", "h": 0.02, "geraet": 21}, {"z": "Z2/BM-F3", "h": 0.02, "geraet": 29}]},
            {"kurz": "Bodenprobe entnehmen und analysieren (Deklaration)",
             "lang": "Haufwerk beproben nach LAGA PN 98 und im akkreditierten Labor auf Parameter nach "
                     "ErsatzbaustoffV bzw. Deponieverordnung untersuchen lassen, Ergebnisbericht übergeben.",
             "einheit": "St", "h": 1.0, "geraet": 380, "gen": "B"},
        ]},
        {"name": "Planum, Verfüllung, Bodenaustausch", "positionen": [
            {"kurz": "Planum der Baugrubensohle herstellen und verdichten, ±{t} cm",
             "lang": "Baugrubensohle bzw. Gründungssohle profilgerecht herstellen, Höhentoleranz ±{t} cm, "
                     "nachverdichten bis zur geforderten Tragfähigkeit (Plattendruckversuch gesondert).",
             "einheit": "m²", "gen": "A", "kg": "321",
             "varianten": [{"t": "3", "h": 0.03, "geraet": 0.8}, {"t": "2", "h": 0.045, "geraet": 1.0}]},
            {"kurz": "Arbeitsraum verfüllen mit seitlich gelagertem Boden",
             "lang": "Arbeitsräume an Bauwerken lagenweise (max. 30 cm) mit seitlich gelagertem, geeignetem Boden "
                     "verfüllen und verdichten, Abdichtung und Dämmung dabei nicht beschädigen.",
             "einheit": "m³", "h": 0.12, "geraet": 6, "gen": "A"},
            {"kurz": "Arbeitsraum verfüllen mit geliefertem Material {m}",
             "lang": "Arbeitsräume bzw. Gräben lagenweise mit geliefertem {m} verfüllen und auf mindestens 97 % "
                     "Proctordichte verdichten. Abrechnung nach Aufmaß im verdichteten Zustand.",
             "einheit": "m³", "gen": "A",
             "varianten": [{"m": "Kiessand 0/32", "h": 0.12, "mat": 26, "geraet": 6},
                           {"m": "Recyclingmaterial RC-1 0/45", "h": 0.12, "mat": 18, "geraet": 6}]},
            {"kurz": "Bodenaustausch, Aushub ungeeigneter Boden und Einbau {m}",
             "lang": "Nicht tragfähigen Boden unter der Gründung ausheben und abfahren (Gebühr Z0 enthalten), "
                     "Ersatz durch {m}, lagenweise eingebaut und verdichtet bis Ev2 ≥ 100 MN/m².",
             "einheit": "m³", "gen": "B", "kg": "321",
             "varianten": [{"m": "Mineralgemisch 0/32", "h": 0.20, "mat": 28, "geraet": 32},
                           {"m": "Schotter 0/45", "h": 0.20, "mat": 31, "geraet": 32}]},
            {"kurz": "Frostschutzschicht/Tragschicht unter Bodenplatte, d = {d} cm",
             "lang": "Kapillarbrechende Schicht bzw. Tragschicht unter Bodenplatten aus Kiessand bzw. Schotter 0/32, "
                     "Dicke {d} cm, lagenweise einbauen und verdichten, Oberfläche ±2 cm.",
             "einheit": "m²", "gen": "A", "kg": "326",
             "varianten": [{"d": "20", "h": 0.05, "mat": 5.8, "geraet": 1.3}, {"d": "30", "h": 0.06, "mat": 8.5, "geraet": 1.8},
                           {"d": "50", "h": 0.09, "mat": 14, "geraet": 2.8}]},
            {"kurz": "Geotextil als Trennlage, GRK {g}",
             "lang": "Geotextil-Vlies als Trenn- und Filterschicht, Geotextilrobustheitsklasse GRK {g}, mit 30 cm "
                     "Überlappung verlegen.",
             "einheit": "m²", "gen": "A", "kg": "326",
             "varianten": [{"g": "3", "h": 0.02, "mat": 1.1}, {"g": "4", "h": 0.02, "mat": 1.6}]},
            {"kurz": "Plattendruckversuch nach DIN 18134",
             "lang": "Statischen Plattendruckversuch nach DIN 18134 durchführen und protokollieren, Ev2 und "
                     "Ev2/Ev1 bestimmen. Je Versuch.",
             "einheit": "St", "h": 0, "geraet": 210, "gen": "A"},
            {"kurz": "Geländemodellierung, Boden auftragen und profilieren",
             "lang": "Seitlich gelagerten Boden laden, transportieren bis 100 m, in Lagen auftragen, verdichten "
                     "und nach Höhenplan profilieren.",
             "einheit": "m³", "h": 0.08, "geraet": 5.5, "gen": "B", "kg": "511"},
        ]},
    ],
}]


# ---------------------------------------------------------------- Runde 2: Ausführungsachsen und weitere Grundpositionen
ZUGANG = [{"k": "freie Zufahrt", "t": "Arbeitsraum für Großgerät frei zugänglich."},
          {"k": "eingeschränkt", "t": "Eingeschränkte Zugänglichkeit: Einsatz von Kompaktgerät (Minibagger, Radlader bis 3 t).", "fh": 1.5, "fg": 1.35, "gen": "B"},
          {"k": "von Hand", "t": "Ohne Maschineneinsatz: Lösen, Laden und Fördern von Hand bzw. mit Kleingerät.", "h": 0.9, "fg": 0.3, "gen": "C"}]
WASSER = [{}, {"k": "nass/Grundwasser", "t": "Boden nass bzw. im Bereich abgesenkten Grundwassers, erschwertes Lösen und Laden.", "fh": 1.2, "fg": 1.2, "gen": "B"}]
NAEHE = [{}, {"k": "Leitungen/Bestand", "t": "Arbeiten im Bereich vorhandener Leitungen bzw. an Bestandsfundamenten mit Suchschachtung von Hand.", "fh": 1.3, "fg": 1.1, "gen": "B",
              "tags": ["altbau"]}]
WEG = [{"k": "bis 10 km", "t": "Transportweg bis 10 km."}, {"k": "bis 25 km", "t": "Transportweg über 10 bis 25 km.", "fg": 1.25},
       {"k": "bis 50 km", "t": "Transportweg über 25 bis 50 km.", "fg": 1.55, "gen": "B"}]
MENGE = [{}, {"k": "bis 50 m³", "t": "Gesamtmenge bis 50 m³ (Kleinmenge), Umsetzen des Geräts eingerechnet.", "fh": 1.3, "fg": 1.35}]
VERDICHT = [{"k": "Dpr 97 %", "t": "Verdichtungsgrad DPr ≥ 97 %."}, {"k": "Dpr 100 %", "t": "Verdichtungsgrad DPr ≥ 100 %, Ev2 ≥ 100 MN/m² nachweisen.", "fh": 1.2, "fg": 1.2}]


def _ax(prefix, achsen):
    for g in LBS[0]["gruppen"]:
        for p in g["positionen"]:
            if p["kurz"].startswith(prefix) and "achsen" not in p:
                p["achsen"] = achsen


_ax("Oberboden abtragen und abfahren", [WEG, ZUGANG[:2], MENGE])
_ax("Oberboden abtragen", [ZUGANG[:2], MENGE])
_ax("Oberboden andecken", [ZUGANG[:2], MENGE])
_ax("Vorhandene Befestigung", [ZUGANG[:2], NAEHE])
_ax("Baugrube ausheben, Homogenbereich {hb}, Tiefe", [ZUGANG, WASSER, NAEHE, MENGE])
_ax("Baugrube ausheben, Homogenbereich {hb}, laden", [WEG, ZUGANG[:2], WASSER, NAEHE, MENGE])
_ax("Fundamentgräben", [ZUGANG, WASSER, NAEHE])
_ax("Leitungsgraben", [ZUGANG, WASSER, NAEHE])
_ax("Boden laden und abfahren", [WEG])
_ax("Planum", [ZUGANG[:2], VERDICHT])
_ax("Arbeitsraum verfüllen mit seitlich", [ZUGANG, VERDICHT])
_ax("Arbeitsraum verfüllen mit geliefertem", [ZUGANG, VERDICHT])
_ax("Bodenaustausch", [ZUGANG[:2], WASSER, VERDICHT, WEG])
_ax("Frostschutzschicht", [ZUGANG[:2], VERDICHT, MENGE])
_ax("Baufeld räumen", [[{}, {"k": "Hanglage", "t": "Gelände mit Neigung über 1:4.", "fh": 1.4, "fg": 1.3}]])

LBS[0]["gruppen"].append({"name": "Weitere Erdarbeiten, Gräben und Sicherungen", "positionen": [
    {"kurz": "Suchschachtung von Hand nach Leitungen, Tiefe bis {t} m",
     "lang": "Suchschlitz bzw. Suchschachtung von Hand zur Ortung vorhandener Leitungen und Kabel, Grundfläche bis 1,0 m², "
             "Leitungen freilegen und sichern, wieder verfüllen und verdichten. Tiefe bis {t} m.",
     "einheit": "St", "kg": "311", "gen": "B", "achsen": [[{}, {"k": "Oberfläche befestigt", "t": "Einschließlich Aufnehmen und Wiederherstellen der Oberflächenbefestigung.", "h": 1.5, "mat": 25}]],
     "varianten": [{"t": "1,0", "h": 2.2, "geraet": 8}, {"t": "1,5", "h": 3.5, "geraet": 10}, {"t": "2,0", "h": 5.0, "geraet": 14}]},
    {"kurz": "Böschung abflachen und sichern, Neigung {n}, Folienabdeckung",
     "lang": "Baugrubenböschung profilgerecht auf Neigung {n} herstellen, Böschungsfläche mit Folie abdecken und gegen Abrutschen "
             "und Ausspülen sichern, vorhalten während der Bauzeit und entfernen.",
     "einheit": "m²", "kg": "311", "gen": "B", "achsen": [ZUGANG[:2]],
     "varianten": [{"n": "45°", "h": 0.06, "mat": 1.2, "geraet": 1.5}, {"n": "60°", "h": 0.07, "mat": 1.2, "geraet": 1.8}]},
    {"kurz": "Grabenverbau mit Verbauplatten/Verbaubox, Tiefe bis {t} m",
     "lang": "Grabenverbau mit Verbauboxen bzw. Gleitschienenverbau nach DIN 4124, Grabenbreite bis 1,5 m, einbauen, vorhalten "
             "während der Leitungsverlegung und rückbauen. Abrechnung nach Grabenlänge.",
     "einheit": "m", "kg": "311", "gen": "B", "achsen": [WASSER, NAEHE],
     "varianten": [{"t": "2,0", "h": 0.8, "geraet": 22}, {"t": "3,0", "h": 1.1, "geraet": 34}, {"t": "4,0", "h": 1.5, "geraet": 48}]},
    {"kurz": "Grabenverfüllung mit Sand/Kies, Leitungszone und Hauptverfüllung",
     "lang": "Leitungsgraben verfüllen: Leitungszone mit Sand 0/2 bis 30 cm über Rohrscheitel von Hand verdichtet, "
             "Hauptverfüllung lagenweise mit Kiessand 0/32 verdichtet; Material liefern.",
     "einheit": "m³", "kg": "541", "gen": "A", "achsen": [ZUGANG, VERDICHT],
     "varianten": [{"h": 0.35, "mat": 26, "geraet": 6}]},
    {"kurz": "Kapillarbrechende Schicht Kies 16/32, d = {d} cm",
     "lang": "Kapillarbrechende Schicht aus gewaschenem Kies 16/32 unter Bodenplatten einbauen, abziehen und statisch verdichten, "
             "Dicke {d} cm.",
     "einheit": "m²", "kg": "326", "gen": "A", "achsen": [ZUGANG[:2], MENGE],
     "varianten": [{"d": "15", "h": 0.05, "mat": 5.4, "geraet": 1.0}, {"d": "20", "h": 0.06, "mat": 7.2, "geraet": 1.2}, {"d": "30", "h": 0.08, "mat": 10.8, "geraet": 1.6}]},
    {"kurz": "Boden verbessern mit Bindemittel (Kalk/Zement), {m} kg/m²",
     "lang": "Bodenverbesserung bzw. -verfestigung bindiger Böden durch Einfräsen von Bindemittel nach Eignungsprüfung, Dosierung {m} kg/m², "
             "Frästiefe bis 30 cm, verdichten. Eignungsprüfung gesondert.",
     "einheit": "m²", "kg": "321", "gen": "B", "achsen": [MENGE],
     "varianten": [{"m": "15", "h": 0.02, "mat": 3.0, "geraet": 2.2}, {"m": "25", "h": 0.02, "mat": 4.8, "geraet": 2.4}, {"m": "40", "h": 0.025, "mat": 7.6, "geraet": 2.8}]},
    {"kurz": "Boden zwischenlagern auf der Baustelle, Miete anlegen und abdecken",
     "lang": "Ausgehobenen Boden getrennt nach Homogenbereichen und Belastungsklassen auf der Baustelle zwischenlagern, "
             "Miete profilieren und mit Folie abdecken, Wiederaufnahme gesondert.",
     "einheit": "m³", "kg": "311", "gen": "A", "achsen": [ZUGANG[:2]],
     "varianten": [{"h": 0.03, "mat": 0.6, "geraet": 3.2}]},
    {"kurz": "Boden innerhalb der Baustelle umlagern, Förderweg bis {w} m",
     "lang": "Boden aus Zwischenlager laden, innerhalb der Baustelle fördern und an anderer Stelle einbauen bzw. ablagern, "
             "Förderweg bis {w} m.",
     "einheit": "m³", "kg": "311", "gen": "A", "achsen": [ZUGANG[:2], VERDICHT],
     "varianten": [{"w": "50", "h": 0.04, "geraet": 4.5}, {"w": "200", "h": 0.05, "geraet": 6.5}, {"w": "500", "h": 0.06, "geraet": 9.0}]},
    {"kurz": "Zulage für Aushub mit Hindernissen (Mauerreste, Fundamente) bis {g} m³",
     "lang": "Zulage zum Bodenaushub für das Lösen, Zerkleinern und gesonderte Laden von Bauwerksresten, alten Fundamenten und "
             "Mauerwerk im Boden, Einzelgröße bis {g} m³; Entsorgung gesondert.",
     "einheit": "m³", "kg": "311", "gen": "C", "achsen": [ZUGANG[:2]],
     "varianten": [{"g": "0,1", "h": 0.3, "geraet": 18}, {"g": "1,0", "h": 0.5, "geraet": 32}]},
    {"kurz": "Rasenansaat auf Böschungen/Erosionsschutzmatte",
     "lang": "Erosionsschutz auf Böschungen: Kokos- bzw. Jutegewebe verlegen und mit Erdnägeln sichern, Saatgut für Böschungen "
             "einbringen.",
     "einheit": "m²", "kg": "574", "gen": "B",
     "varianten": [{"h": 0.08, "mat": 3.8}]},
    {"kurz": "Lastplattendruckversuch dynamisch (Leichtes Fallgewicht)",
     "lang": "Verdichtungsprüfung mit dem leichten Fallgewichtsgerät nach TP BF-StB Teil B 8.3, je Messpunkt drei Messungen "
             "mit Protokoll.",
     "einheit": "St", "kg": "311", "gen": "A",
     "varianten": [{"h": 0.25, "geraet": 35}]},
    {"kurz": "Vermessung und Absteckung der Baugrube, Schnurgerüst",
     "lang": "Baugrube und Gebäudeachsen nach Lageplan abstecken, Höhenfestpunkt übernehmen, Schnurgerüst herstellen, "
             "vorhalten und beseitigen.",
     "einheit": "psch", "kg": "311", "gen": "B",
     "varianten": [{"h": 6, "mat": 60, "geraet": 380}]},
]})
