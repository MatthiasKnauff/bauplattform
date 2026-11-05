# LB 084 Abbruch- und Rückbauarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)
# Entsorgungsgebühren gesondert nach LB 087, sofern nicht anders angegeben.

_ABF = " Abbruchmaterial getrennt nach Abfallarten sammeln und zur Sammelstelle auf der Baustelle transportieren; Entsorgung nach LB 087."

LBS = [{
    "nr": "084", "name": "Abbruch- und Rückbauarbeiten", "atv": "DIN 18459", "lohn": "abbruch", "kg": "394",
    "tags": ["altbau"],
    "gruppen": [
        {"name": "Vorbereitung, Schutz, Komplettabbruch", "positionen": [
            {"kurz": "Rückbaukonzept und Schadstofferkundung durch Sachverständigen",
             "lang": "Schadstofferkundung des Gebäudes (Asbest, KMF, PAK, PCB, Holzschutzmittel) mit Probenahme, "
                     "Laboranalysen und Rückbau- bzw. Entsorgungskonzept durch einen Sachverständigen erstellen.",
             "einheit": "psch", "h": 0, "geraet": 3200, "gen": "C", "tags": ["altbau"]},
            {"kurz": "Gebäude vollständig abbrechen, umbauter Raum, {t}",
             "lang": "Gebäude einschließlich Fundamente bis 1 m unter Gelände maschinell abbrechen, vorab entkernen, "
                     "Material sortenrein trennen, laden und abfahren; Entsorgungsgebühren für mineralischen "
                     "Bauschutt Z1.1 enthalten, Schadstoffe gesondert. Bauweise: {t}. Abrechnung nach umbautem Raum.",
             "einheit": "m³", "gen": "C", "kg": "212",
             "varianten": [{"t": "Massivbau bis 3 Geschosse", "h": 0.20, "geraet": 21}, {"t": "Holz-/Leichtbau, Halle", "h": 0.15, "geraet": 14}]},
            {"kurz": "Staub- und Schmutzschutz in genutzten Bereichen, Folienabdeckung",
             "lang": "Böden, Treppen und Einbauten in angrenzenden genutzten Bereichen mit Abdeckvlies und "
                     "Folie staubdicht abdecken, abkleben, vorhalten und entfernen.",
             "einheit": "m²", "h": 0.08, "mat": 2.2, "gen": "B"},
            {"kurz": "Abstützung (Notabstützung) mit Baustützen, bis {hh} m",
             "lang": "Tragende Bauteile vor Abbruch- bzw. Umbauarbeiten mit Stahlrohrstützen und Kanthölzern "
                     "nach Statik abstützen, Lasteintragung über Lastverteilung, vorhalten bis 4 Wochen und entfernen. "
                     "Je Stütze, Höhe bis {hh} m.",
             "einheit": "St", "gen": "B",
             "varianten": [{"hh": "3,0", "h": 0.8, "mat": 8, "geraet": 12}, {"hh": "4,5", "h": 1.2, "mat": 12, "geraet": 18}]},
        ]},
        {"name": "Rohbauteile abbrechen", "positionen": [
            {"kurz": "Mauerwerk abbrechen, {t}, d bis {d} cm",
             "lang": "Mauerwerk aus {t} abbrechen, Wanddicke bis {d} cm, einschließlich Putz und Bekleidungen." + _ABF +
                     " Abrechnung nach Wandfläche, Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "gen": "B", "kg": "394",
             "varianten": [{"t": "Ziegel/Kalksandstein", "d": "11,5", "h": 0.55, "geraet": 2},
                           {"t": "Ziegel/Kalksandstein", "d": "24", "h": 0.95, "geraet": 4},
                           {"t": "Ziegel/Kalksandstein", "d": "36,5", "h": 1.35, "geraet": 6},
                           {"t": "Bims/Porenbeton/Gipsdielen", "d": "11,5", "h": 0.40, "geraet": 1.5}]},
            {"kurz": "Stahlbeton abbrechen, {t}",
             "lang": "Bauteile aus Stahlbeton ({t}) mit Abbruchhammer bzw. Betonzange abbrechen, Bewehrung "
                     "abtrennen und getrennt sammeln." + _ABF + " Abrechnung nach Volumen.",
             "einheit": "m³", "gen": "C",
             "varianten": [{"t": "Wände, Decken bis 25 cm", "h": 9, "geraet": 75}, {"t": "Fundamente, Bodenplatten", "h": 6, "geraet": 90}]},
            {"kurz": "Betonbodenplatte/Kellerboden abbrechen, d bis {d} cm",
             "lang": "Unbewehrten bzw. leicht bewehrten Betonboden abbrechen, Dicke bis {d} cm." + _ABF,
             "einheit": "m²", "gen": "B",
             "varianten": [{"d": "10", "h": 0.45, "geraet": 4}, {"d": "20", "h": 0.85, "geraet": 7}]},
            {"kurz": "Holzbalkendecke rückbauen mit Einschub und Belag",
             "lang": "Holzbalkendecke einschließlich Dielung, Einschub mit Füllung, Putz auf Rohr- bzw. Lattung "
                     "rückbauen, Holz (A II–A IV nach Altholzverordnung) getrennt sammeln." + _ABF,
             "einheit": "m²", "h": 1.6, "geraet": 4, "gen": "C"},
            {"kurz": "Treppe abbrechen, {t}",
             "lang": "Vorhandene Treppe ({t}) einschließlich Geländer abbrechen bzw. demontieren." + _ABF +
                     " Abrechnung nach Steigungen.",
             "einheit": "St", "gen": "B", "hinweis": "Einheit: je Steigung",
             "varianten": [{"t": "Holz", "h": 0.5, "geraet": 2}, {"t": "Stahlbeton", "h": 1.5, "geraet": 8}]},
            {"kurz": "Schornstein abbrechen, {z}-zügig, über und unter Dach",
             "lang": "Gemauerten Schornstein {z}-zügig von Kopf bis Kellersohle abbrechen, Öffnungen in Decken "
                     "schließen gesondert." + _ABF + " Abrechnung nach Höhe.",
             "einheit": "m", "gen": "B",
             "varianten": [{"z": "1", "h": 1.6, "geraet": 6}, {"z": "2", "h": 2.4, "geraet": 9}]},
        ]},
        {"name": "Ausbau, Bekleidungen, Beläge", "positionen": [
            {"kurz": "Putz abschlagen, {t}",
             "lang": "Putz bis auf den tragfähigen Untergrund abschlagen ({t}), Untergrund abkehren." + _ABF,
             "einheit": "m²", "gen": "A",
             "varianten": [{"t": "Innenputz Wand", "h": 0.30, "geraet": 0.8}, {"t": "Innenputz Decke", "h": 0.40, "geraet": 0.8},
                           {"t": "Außenputz Fassade", "h": 0.45, "geraet": 1.2}]},
            {"kurz": "Fliesenbelag entfernen, {t}, einschl. Kleber/Mörtelbett",
             "lang": "Keramische Fliesen und Platten ({t}) einschließlich Kleberschicht bzw. Mörtelbett entfernen, "
                     "Untergrund grob säubern." + _ABF,
             "einheit": "m²", "gen": "A",
             "varianten": [{"t": "Wand", "h": 0.45, "geraet": 1}, {"t": "Boden", "h": 0.55, "geraet": 1.5}]},
            {"kurz": "Bodenbelag entfernen, {t}",
             "lang": "Vorhandenen Bodenbelag ({t}) aufnehmen, Kleberreste grob abstoßen." + _ABF,
             "einheit": "m²", "gen": "A",
             "varianten": [{"t": "Teppich/PVC verklebt", "h": 0.20, "geraet": 0.8}, {"t": "Parkett/Dielen", "h": 0.30, "geraet": 0.8},
                           {"t": "Laminat schwimmend", "h": 0.08, "geraet": 0.5}]},
            {"kurz": "Estrich abbrechen, d bis {d} cm, einschl. Dämmschicht",
             "lang": "Estrich einschließlich Trenn- und Dämmschicht abbrechen, Dicke bis {d} cm, Rohdecke abkehren." + _ABF,
             "einheit": "m²", "gen": "A",
             "varianten": [{"d": "6", "h": 0.40, "geraet": 2}, {"d": "10", "h": 0.60, "geraet": 3}]},
            {"kurz": "Trockenbauwand/Unterdecke demontieren",
             "lang": "Leichte Trennwände bzw. Unterdecken aus Gipsplatten auf Metall- oder Holzunterkonstruktion "
                     "einschließlich Dämmung demontieren, Metall, Gips und Mineralwolle getrennt sammeln." + _ABF,
             "einheit": "m²", "h": 0.30, "geraet": 0.8, "gen": "A"},
            {"kurz": "Tür ausbauen, mit Zarge, {t}",
             "lang": "Innen- bzw. Außentür ({t}) mit Zarge bzw. Blendrahmen ausbauen, Befestigungen entfernen." + _ABF,
             "einheit": "St", "gen": "A",
             "varianten": [{"t": "Innentür Holz", "h": 0.9, "geraet": 3}, {"t": "Stahlzarge eingemauert", "h": 1.6, "geraet": 4},
                           {"t": "Haustür/Außentür", "h": 2.0, "geraet": 6}]},
            {"kurz": "Fenster ausbauen, Größe bis {a} m²",
             "lang": "Fenster einschließlich Blendrahmen, Fensterbänken innen und außen und Rollladen ausbauen, "
                     "Glas und Rahmenmaterial getrennt sammeln." + _ABF,
             "einheit": "St", "gen": "A",
             "varianten": [{"a": "1,5", "h": 1.0, "geraet": 4}, {"a": "3,0", "h": 1.6, "geraet": 7}]},
            {"kurz": "Sanitärobjekt demontieren, {t}",
             "lang": "Sanitärobjekt ({t}) einschließlich Armaturen demontieren, Anschlüsse fachgerecht "
                     "verschließen." + _ABF,
             "einheit": "St", "gen": "A", "lohn": "sanitaer",
             "varianten": [{"t": "WC/Waschtisch", "h": 0.8, "geraet": 3}, {"t": "Badewanne/Duschwanne", "h": 1.5, "geraet": 6}]},
            {"kurz": "Heizkörper demontieren, entleeren, Anschlüsse verschließen",
             "lang": "Heizkörper entleeren, demontieren, Halterungen entfernen, Anschlüsse dicht verschließen." + _ABF,
             "einheit": "St", "h": 0.8, "geraet": 3, "gen": "A", "lohn": "heizung"},
            {"kurz": "Elektroinstallation stilllegen und zurückbauen, je m² NGF",
             "lang": "Vorhandene Elektroinstallation spannungsfrei schalten, sichern, Leitungen, Dosen, Schalter "
                     "und Leuchten zurückbauen. Abrechnung nach Netto-Grundfläche.",
             "einheit": "m²", "h": 0.12, "geraet": 0.6, "gen": "C", "lohn": "elektro"},
            {"kurz": "Dacheindeckung abbrechen, {t}, mit Lattung",
             "lang": "Dacheindeckung aus {t} einschließlich Lattung und Konterlattung abbrechen, über Rutsche "
                     "bzw. Kran in Container." + _ABF,
             "einheit": "m²", "gen": "B", "kg": "394",
             "varianten": [{"t": "Tondachziegel/Betondachsteinen", "h": 0.35, "geraet": 1.5}, {"t": "Bitumenschindeln/Schiefer", "h": 0.40, "geraet": 1.5}]},
            {"kurz": "Flachdachaufbau abbrechen bis Rohdecke, d bis {d} cm",
             "lang": "Flachdachaufbau (Kies, Abdichtung, Dämmung, Dampfsperre) bis auf die Rohdecke abbrechen, "
                     "Gesamtdicke bis {d} cm, Materialien getrennt sammeln." + _ABF,
             "einheit": "m²", "gen": "B",
             "varianten": [{"d": "15", "h": 0.35, "geraet": 2}, {"d": "30", "h": 0.50, "geraet": 3}]},
        ]},
        {"name": "Schadstoffsanierung", "positionen": [
            {"kurz": "Asbestzementplatten demontieren nach TRGS 519, {t}",
             "lang": "Asbestzement-Produkte ({t}) nach TRGS 519 emissionsarm zerstörungsfrei demontieren, "
                     "befeuchten, staubdicht verpacken (Big Bags), kennzeichnen und bereitstellen; Entsorgung nach LB 087. "
                     "Sachkunde, Anzeige und Messungen sind enthalten.",
             "einheit": "m²", "gen": "C",
             "varianten": [{"t": "Dach-Wellplatten", "h": 0.45, "mat": 3, "geraet": 4}, {"t": "Fassadenplatten", "h": 0.55, "mat": 3, "geraet": 4}]},
            {"kurz": "Schwarzbereich einrichten (Asbest, schwach gebunden), Personenschleuse",
             "lang": "Abgeschotteten Sanierungsbereich mit Unterdruckhaltung, 4-Kammer-Personenschleuse, "
                     "Materialschleuse und Messungen nach TRGS 519 einrichten, betreiben und räumen.",
             "einheit": "psch", "h": 40, "mat": 1200, "geraet": 5800, "gen": "C"},
            {"kurz": "Asbesthaltigen Fliesenkleber/Spachtelmasse entfernen (BT-Verfahren)",
             "lang": "Asbesthaltige Fliesenkleber, Spachtelmassen bzw. Bodenbeläge nach anerkanntem "
                     "emissionsarmem Verfahren (BT-Verfahren) entfernen, Abfälle verpacken.",
             "einheit": "m²", "h": 1.4, "mat": 4, "geraet": 9, "gen": "C"},
            {"kurz": "Künstliche Mineralfasern (alte KMF) ausbauen nach TRGS 521",
             "lang": "Mineralwolle-Dämmstoffe alter Art ausbauen, staubarm in reißfeste Säcke verpacken, "
                     "Schutzmaßnahmen nach TRGS 521; Entsorgung nach LB 087.",
             "einheit": "m²", "h": 0.40, "mat": 1.5, "geraet": 1, "gen": "B"},
            {"kurz": "PAK-haltigen Parkettkleber entfernen",
             "lang": "Teerhaltigen (PAK) Parkettkleber nach Ausbau des Parketts mechanisch entfernen, Staubabsaugung "
                     "mit H-Sauger, Abfälle als gefährlichen Abfall verpacken.",
             "einheit": "m²", "h": 0.9, "mat": 2, "geraet": 6, "gen": "C"},
        ]},
    ],
}]


# ---------------------------------------------------------------- Runde 2: Ausführungsachsen und weitere Grundpositionen
GESCHOSS = [{"k": "KG/EG", "t": "Arbeitsort Keller- bzw. Erdgeschoss."},
            {"k": "OG", "t": "Arbeitsort Obergeschoss: Transport über Treppenhaus bzw. Schuttrutsche zur Sammelstelle.", "fh": 1.18}]
BETRIEB = [{}, {"k": "laufender Betrieb", "t": "Ausführung bei laufendem Betrieb im Gebäude: staubarm, lärmarme Zeitfenster, tägliche Reinigung der Wege.",
                "fh": 1.3, "gen": "C"}]
SCHONEND = [{}, {"k": "schonend für Wiederverwendung", "t": "Bauteile schonend ausbauen, säubern, kennzeichnen und für Wiederverwendung auf der Baustelle lagern.",
                 "fh": 1.7, "gen": "C"}]
VERFAHREN = [{"k": "Kleingerät", "t": "Abbruch mit handgeführtem Gerät (Stemmhammer, Säge)."},
             {"k": "Bagger/Abbruchroboter", "t": "Abbruch mit Abbruchroboter bzw. Bagger mit Abbruchzange, Gerät eingerechnet.", "fh": 0.45, "fg": 2.6, "gen": "B"}]

for _gi in (1, 2):   # Rohbauteile, Ausbau
    for _p in LBS[0]["gruppen"][_gi]["positionen"]:
        if "achsen" in _p:
            continue
        _ax = [GESCHOSS, BETRIEB]
        if _p["kurz"].startswith(("Mauerwerk abbrechen", "Stahlbeton abbrechen", "Betonbodenplatte", "Estrich abbrechen")):
            _ax = [VERFAHREN] + _ax
        if _p["kurz"].startswith(("Tür ausbauen", "Fenster ausbauen", "Bodenbelag entfernen", "Dacheindeckung", "Holzbalkendecke", "Treppe abbrechen")):
            _ax = _ax + [SCHONEND]
        _p["achsen"] = _ax
for _p in LBS[0]["gruppen"][3]["positionen"]:
    _p.setdefault("achsen", [GESCHOSS, BETRIEB])

LBS[0]["gruppen"].append({"name": "Weitere Rückbauarbeiten", "positionen": [
    {"kurz": "Wanddurchbruch Stahlbeton sägen, d bis {d} cm, Fläche bis {a} m²",
     "lang": "Öffnung in Stahlbetonwand mit Wandsäge bzw. Seilsäge herstellen, Betonteile in transportable Blöcke trennen, "
             "ausheben und zur Sammelstelle bringen, Kühlwasser absaugen. Abfangung nach Statik gesondert." + _ABF,
     "einheit": "St", "gen": "C", "achsen": [GESCHOSS, BETRIEB],
     "varianten": [{"d": "20", "a": "2,0", "h": 8, "geraet": 620}, {"d": "25", "a": "2,5", "h": 10, "geraet": 860}, {"d": "30", "a": "4,0", "h": 14, "geraet": 1350}]},
    {"kurz": "Unterdecke demontieren, {t}",
     "lang": "Unterdecke einschließlich Unterkonstruktion und Abhängung demontieren, Einbauten (Leuchten, Auslässe) vorher durch "
             "Fachgewerk abgeklemmt, {t}." + _ABF,
     "einheit": "m²", "gen": "A", "achsen": [GESCHOSS, BETRIEB],
     "varianten": [{"t": "Gipskarton geschlossen", "h": 0.30, "geraet": 0.8}, {"t": "Mineralfaser-Rasterdecke", "h": 0.22, "geraet": 0.8},
                   {"t": "Holzpaneele mit Lattung", "h": 0.28, "geraet": 0.8}, {"t": "Putz auf Rohrgewebe/Schilfrohr", "h": 0.55, "geraet": 1.2}]},
    {"kurz": "Wandbekleidung entfernen, {t}",
     "lang": "Wandbekleidung einschließlich Unterkonstruktion und Befestigungsmittel entfernen, Untergrund besenrein, {t}." + _ABF,
     "einheit": "m²", "gen": "A", "achsen": [GESCHOSS, BETRIEB],
     "varianten": [{"t": "Holzpaneele", "h": 0.25, "geraet": 0.6}, {"t": "Gipskarton-Vorsatzschale", "h": 0.30, "geraet": 0.8}, {"t": "Tapete/Vlies (abziehen)", "h": 0.12, "geraet": 0.2}]},
    {"kurz": "Dachstuhl abbrechen, Holzkonstruktion, {t}",
     "lang": "Dachkonstruktion aus Holz abschnittsweise abbrechen, Hölzer zerlegen, Nägel und Metallteile trennen, mit Kran bzw. "
             "Rutsche abtransportieren. {t}." + _ABF,
     "einheit": "m²", "gen": "B", "achsen": [[{}, {"k": "behandeltes Holz (A IV)", "t": "Hölzer mit Holzschutzmittel behandelt (Altholzkategorie A IV), getrennt erfassen.", "fh": 1.15}]],
     "varianten": [{"t": "Sparrendach", "h": 0.55, "geraet": 3.5}, {"t": "Pfettendach mit Stuhl", "h": 0.75, "geraet": 4.5}]},
    {"kurz": "Dämmung ausbauen, {t}, d bis {d} cm",
     "lang": "Wärmedämmung aus {t} ausbauen, staubarm in Säcken bzw. Big Bags verpacken und zur Sammelstelle bringen, Dicke bis {d} cm." + _ABF,
     "einheit": "m²", "gen": "B", "achsen": [GESCHOSS],
     "varianten": [{"t": "EPS/XPS", "d": "16", "h": 0.18, "mat": 0.8}, {"t": "Mineralwolle neu (nach 2000)", "d": "20", "h": 0.22, "mat": 1.2},
                   {"t": "Holzfaser/Zellulose", "d": "20", "h": 0.25, "mat": 1.2}]},
    {"kurz": "WDVS abbrechen, Dämmung {t}, d bis {d} cm",
     "lang": "Wärmedämmverbundsystem einschließlich Putz, Dämmplatten, Dübeln und Kleber bis auf tragfähigen Untergrund abbrechen, "
             "Dämmstoff getrennt erfassen. Dämmung {t}, Dicke bis {d} cm. Gerüst gesondert." + _ABF,
     "einheit": "m²", "gen": "B",
     "achsen": [[{}, {"k": "HBCD-haltig", "t": "EPS mit HBCD-Flammschutz: getrennt erfassen und als gefährlicher bzw. POP-Abfall dokumentieren.", "fh": 1.15, "mat": 1.5}]],
     "varianten": [{"t": "EPS", "d": "10", "h": 0.40, "geraet": 1.5}, {"t": "EPS", "d": "20", "h": 0.50, "geraet": 2}, {"t": "Mineralwolle", "d": "14", "h": 0.55, "geraet": 2}]},
    {"kurz": "Heizungs-/Sanitärleitungen zurückbauen, {t}",
     "lang": "Stillgelegte Leitungen einschließlich Befestigungen und Dämmung zurückbauen, Wanddurchführungen verschließen, {t}." + _ABF,
     "einheit": "m", "gen": "B", "lohn": "sanitaer", "achsen": [[{"k": "aufputz", "t": "Leitungen aufputz verlegt."}, {"k": "unterputz/im Schlitz", "t": "Leitungen im Schlitz bzw. unterputz, freistemmen.", "fh": 2.2}], GESCHOSS],
     "varianten": [{"t": "bis DN 25", "h": 0.12, "geraet": 0.3}, {"t": "DN 32–50", "h": 0.18, "geraet": 0.5}, {"t": "DN 65–100", "h": 0.30, "geraet": 1}]},
    {"kurz": "Heizkessel/Öltank zurückbauen, {t}",
     "lang": "Stillgelegte Wärmeerzeugungsanlage bzw. Öltank nach Restentleerung und Reinigung durch Fachbetrieb zerlegen und abtransportieren, "
             "{t}; Tankreinigung und Entsorgung Restöl gesondert.",
     "einheit": "St", "gen": "C", "lohn": "heizung", "achsen": [[{}, {"k": "Kellerlage", "t": "Aufstellung im Keller, Zerlegen vor Ort für Transport über Treppe.", "fh": 1.4}]],
     "varianten": [{"t": "Kessel bis 50 kW", "h": 6, "geraet": 120}, {"t": "Kunststofftanks bis 5.000 l", "h": 5, "geraet": 90}, {"t": "Stahltank bis 10.000 l", "h": 10, "geraet": 380}]},
    {"kurz": "Elektroverteilung demontieren, {t}",
     "lang": "Spannungsfrei geschaltete Verteilung bzw. Zählerschrank demontieren, abgehende Leitungen kennzeichnen bzw. sichern, {t}." + _ABF,
     "einheit": "St", "gen": "B", "lohn": "elektro", "varianten": [{"t": "Unterverteilung bis 48 TE", "h": 1.5, "geraet": 5}, {"t": "Hauptverteilung/Zählerschrank", "h": 4, "geraet": 15}]},
    {"kurz": "Fassadenbekleidung demontieren, {t}",
     "lang": "Vorgehängte Fassadenbekleidung einschließlich Unterkonstruktion demontieren, {t}; Gerüst gesondert." + _ABF,
     "einheit": "m²", "gen": "B",
     "varianten": [{"t": "Holzschalung", "h": 0.35, "geraet": 1}, {"t": "Faserzement (asbestfrei)", "h": 0.40, "geraet": 1.5}, {"t": "Metallkassetten/Trapezblech", "h": 0.35, "geraet": 1.2},
                   {"t": "Naturstein/Keramik, gehängt", "h": 0.70, "geraet": 2.5}]},
    {"kurz": "Außenanlagen zurückbauen, {t}",
     "lang": "Vorhandene Außenanlagenteile zurückbauen, laden und zur Sammelstelle bringen, {t}." + _ABF,
     "einheit": "m", "gen": "B", "kg": "212",
     "varianten": [{"t": "Zaun mit Pfosten und Fundamenten", "h": 0.35, "geraet": 3}, {"t": "Bordsteine einschließlich Rückenstütze", "h": 0.25, "geraet": 4},
                   {"t": "Mauer aus Beton/Naturstein bis 1 m Höhe", "h": 1.2, "geraet": 12}]},
    {"kurz": "Entkernung komplett bis Rohbau, je m² BGF, {t}",
     "lang": "Vollständige Entkernung eines Gebäudes bis auf den tragenden Rohbau: nichttragende Wände, Beläge, Bekleidungen, "
             "Einbauten und Haustechnik ausbauen, getrennt nach Abfallarten sammeln. {t}. Abrechnung nach Brutto-Grundfläche." + _ABF,
     "einheit": "m²", "gen": "C", "achsen": [GESCHOSS, BETRIEB],
     "varianten": [{"t": "Wohngebäude", "h": 1.6, "geraet": 9}, {"t": "Bürogebäude", "h": 1.4, "geraet": 8}, {"t": "Schule/Verwaltung mit Fachräumen", "h": 1.9, "geraet": 11}]},
]})
