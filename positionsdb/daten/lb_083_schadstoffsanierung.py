# LB 083 Sanierungsarbeiten an schadstoffhaltigen Bauteilen – eigene Texte und Ansätze (Preisstand 11/2026)

MENGE = [{"k": "bis 50 m²", "t": "Gesamtmenge im Sanierungsabschnitt bis 50 m².", "fh": 1.25, "gen": "C"},
         {"k": "50–250 m²", "t": "Gesamtmenge im Sanierungsabschnitt 50 bis 250 m²."},
         {"k": "über 250 m²", "t": "Gesamtmenge im Sanierungsabschnitt über 250 m².", "fh": 0.88}]
LAGE = [{"k": "Wand", "t": "Lage an Wandflächen."}, {"k": "Decke", "t": "Lage an Deckenflächen, Überkopfarbeit.", "fh": 1.3},
        {"k": "Boden", "t": "Lage an Bodenflächen.", "fh": 0.9}]
ML = [{"k": "bis 25 m", "t": "Gesamtlänge bis 25 m.", "fh": 1.25}, {"k": "über 25 m", "t": "Gesamtlänge über 25 m."}]
NUTZ = [{}, {"k": "genutzt", "t": "Arbeiten in einem teilweise genutzten Gebäude mit zusätzlichen Abschottungen und Freimessungen.",
             "fh": 1.2, "mat": 2.0, "gen": "C"}]

LBS = [{
    "nr": "083", "name": "Sanierungsarbeiten an schadstoffhaltigen Bauteilen", "atv": "DIN 18459", "lohn": "abbruch",
    "gruppen": [
        {"name": "Baustelleneinrichtung Schadstoffsanierung", "positionen": [
            {"kurz": "Schwarzbereich einrichten, {art}, bis {a} m² Grundfläche",
             "lang": "Sanierungsbereich (Schwarzbereich) staubdicht abschotten: Wände und Böden mit PE-Folie mindestens 0,2 mm doppelt "
                     "auslegen, Stöße verklebt, Durchdringungen abgedichtet, Kennzeichnung nach TRGS. Ausführung {art}. Grundfläche bis {a} m², "
                     "Vorhalten für die Dauer der Arbeiten und Rückbau nach Freigabe.",
             "einheit": "St", "kg": "394", "gen": "C", "achsen": [NUTZ],
             "varianten": [{"art": "Asbest TRGS 519", "a": "25", "h": 16, "mat": 280}, {"art": "Asbest TRGS 519", "a": "100", "h": 38, "mat": 820},
                           {"art": "Asbest TRGS 519", "a": "300", "h": 85, "mat": 2100}, {"art": "für KMF (TRGS 521)", "a": "100", "h": 22, "mat": 520},
                           {"art": "für PAK/PCB", "a": "100", "h": 32, "mat": 740}]},
            {"kurz": "Personenschleuse {n}-Kammer, Vorhaltung je Woche",
             "lang": "Personenschleuse als {n}-Kammer-Schleuse mit Dusche, Warmwasserbereiter und Abwasserfilterung, an den Schwarzbereich "
                     "angeschlossen, betriebsbereit vorhalten, einschließlich Reinigung und Filterwechsel.",
             "einheit": "Wo", "kg": "394", "gen": "B",
             "varianten": [{"n": "3", "h": 4, "mat": 120, "geraet": 380}, {"n": "4", "h": 5, "mat": 150, "geraet": 520}]},
            {"kurz": "Personenschleuse auf- und abbauen, {n}-Kammer",
             "lang": "An- und Abtransport, Auf- und Abbau der {n}-Kammer-Personenschleuse, Anschluss an Wasser, Abwasser und Strom.",
             "einheit": "St", "kg": "394", "gen": "B",
             "varianten": [{"n": "3", "h": 10, "geraet": 450}, {"n": "4", "h": 12, "geraet": 600}]},
            {"kurz": "Materialschleuse, Vorhaltung je Woche",
             "lang": "Materialschleuse (2-Kammer) für das Ausschleusen verpackter Abfälle vorhalten, einschließlich Reinigung.",
             "einheit": "Wo", "kg": "394", "gen": "B", "h": 2, "mat": 40, "geraet": 160},
            {"kurz": "Unterdruckhaltegerät {q} m³/h, Vorhaltung je Woche",
             "lang": "Unterdruckhaltegerät mit Vor-, Fein- und Schwebstofffilter H13, Volumenstrom {q} m³/h, mit Differenzdruckanzeige und "
                     "Alarmgeber, Betrieb rund um die Uhr, einschließlich Filterwechsel und Entsorgung der Filter.",
             "einheit": "Wo", "kg": "394", "gen": "B",
             "varianten": [{"q": "1.000", "h": 1.5, "mat": 45, "geraet": 140}, {"q": "2.000", "h": 2, "mat": 70, "geraet": 210},
                           {"q": "4.000", "h": 2.5, "mat": 110, "geraet": 320}]},
            {"kurz": "Unterdruck-Dokumentation, Differenzdruckschreiber",
             "lang": "Kontinuierliche Aufzeichnung des Unterdrucks im Schwarzbereich mit Datenlogger, wöchentliche Auswertung.",
             "einheit": "Wo", "kg": "394", "gen": "A", "h": 1, "geraet": 65},
            {"kurz": "Sachkundiger Aufsichtführender nach TRGS {t}",
             "lang": "Ständig anwesender sachkundiger Aufsichtführender nach TRGS {t} für die Dauer der Sanierungsarbeiten, soweit nicht in den "
                     "Einheitspreisen enthalten.",
             "einheit": "h", "kg": "394", "gen": "A", "h": 1.15,
             "varianten": [{"t": "519"}, {"t": "521"}, {"t": "524"}]},
            {"kurz": "Anzeige an Behörden und Arbeitsplan",
             "lang": "Erstellen des Arbeitsplans mit Gefährdungsbeurteilung und Anzeige der Arbeiten bei Gewerbeaufsicht und Berufsgenossenschaft.",
             "einheit": "psch", "kg": "394", "gen": "B",
             "varianten": [{"h": 6}, {"h": 12, "kurz": "Anzeige an Behörden und Arbeitsplan, umfangreiche Sanierung"}]},
        ]},
        {"name": "Asbestsanierung", "positionen": [
            {"kurz": "Asbestplatten ausbauen: {art}, schwach gebunden",
             "lang": "Schwach gebundene asbesthaltige Bauteile ({art}) im Schwarzbereich unter Benetzung mit Restfaserbindemittel ausbauen, "
                     "staubdicht in reißfeste Säcke bzw. Big-Bags verpacken, kennzeichnen und zur Materialschleuse transportieren. "
                     "Befestigungsmittel mit entfernen, Untergrund feinreinigen.",
             "einheit": "m²", "kg": "394", "gen": "C", "achsen": [LAGE, MENGE, NUTZ],
             "varianten": [{"art": "Leichtbauplatten", "h": 1.8, "mat": 6}, {"art": "Spritzasbest-Beschichtung", "h": 3.2, "mat": 9},
                           {"art": "Brandschutzbekleidung", "h": 2.4, "mat": 7}]},
            {"kurz": "AZ-Platten ausbauen: {art}, fest gebunden",
             "lang": "Fest gebundene Asbestzementprodukte ({art}) nach TRGS 519 zerstörungsarm demontieren (Befestigungen lösen, nicht brechen), "
                     "Oberfläche vorher mit Restfaserbindemittel benetzen, auf Paletten stapeln und mit Folie dicht verpacken.",
             "einheit": "m²", "kg": "394", "gen": "B", "achsen": [MENGE, NUTZ],
             "varianten": [{"art": "Wellplatten Dach", "h": 0.45, "mat": 2.5}, {"art": "ebene Fassadenplatten", "h": 0.55, "mat": 2.5},
                           {"art": "Dachschindeln/Rauten", "h": 0.65, "mat": 2.5}, {"art": "Fensterbänke", "h": 0.8, "mat": 2.5}]},
            {"kurz": "Asbesthaltige Floor-Flex-Platten mit Kleber entfernen",
             "lang": "Asbesthaltige Vinyl-Asbest-Bodenplatten (Floor-Flex) einschließlich asbesthaltigem Kleber nach anerkanntem Verfahren (BT-Verfahren) "
                     "entfernen, Kleberreste abtragen, Untergrund staubfrei feinreinigen, Abfälle staubdicht verpacken.",
             "einheit": "m²", "kg": "394", "gen": "C", "achsen": [MENGE, NUTZ],
             "varianten": [{"h": 0.9, "mat": 4, "geraet": 3}, {"h": 1.3, "mat": 5, "geraet": 5, "kurz": "Floor-Flex-Platten mit schwarzem Kleber (PAK) entfernen"}]},
            {"kurz": "Asbest-Spachtel/Putz abtragen, bis {d} mm",
             "lang": "Asbesthaltige Spachtelmassen, Fliesenkleber bzw. Putze nach anerkanntem emissionsarmen Verfahren mit abgesaugten Fräsen "
                     "abtragen, Schichtdicke bis {d} mm, Absaugung mit Sauger Klasse H, Abfälle staubdicht verpacken.",
             "einheit": "m²", "kg": "394", "gen": "C", "achsen": [LAGE, MENGE, NUTZ],
             "varianten": [{"d": "3", "h": 0.9, "mat": 3, "geraet": 4}, {"d": "10", "h": 1.5, "mat": 4, "geraet": 6}, {"d": "20", "h": 2.2, "mat": 5, "geraet": 8}]},
            {"kurz": "Asbesthaltige Rohrisolierung entfernen, DN {dn}",
             "lang": "Asbesthaltige Rohrdämmung im Glovebag- bzw. Schwarzbereichsverfahren entfernen, Rohroberfläche reinigen und mit Bindemittel "
                     "behandeln, Abfälle verpacken. Rohrnennweite DN {dn}.",
             "einheit": "m", "kg": "394", "gen": "C", "achsen": [ML, NUTZ],
             "varianten": [{"dn": "bis 50", "h": 0.8, "mat": 6}, {"dn": "65–100", "h": 1.2, "mat": 8}, {"dn": "125–200", "h": 1.8, "mat": 11}]},
            {"kurz": "Asbesthaltige Dichtung/Kitt entfernen, {art}",
             "lang": "Asbesthaltige Dichtungen, Kitte bzw. Schnüre ({art}) unter Benetzung entfernen, Abfälle verpacken.",
             "einheit": "m", "kg": "394", "gen": "C", "achsen": [NUTZ],
             "varianten": [{"art": "Fensterkitt", "h": 0.25, "mat": 1}, {"art": "Brandschutztür-Dichtung", "h": 0.3, "mat": 1},
                           {"art": "Fugenmasse Fassade", "h": 0.4, "mat": 1.5}]},
            {"kurz": "Feinreinigung Schwarzbereich nach Asbestsanierung",
             "lang": "Feinreinigung aller Oberflächen des Sanierungsbereichs mit Industriesauger Klasse H und feuchtem Wischen, Behandlung mit "
                     "Restfaserbindemittel, Vorbereitung für die Freimessung.",
             "einheit": "m²", "kg": "394", "gen": "B", "h": 0.25, "mat": 0.8, "achsen": [MENGE]},
        ]},
        {"name": "KMF, PAK, PCB und sonstige Schadstoffe", "positionen": [
            {"kurz": "Alt-KMF ausbauen, {art}",
             "lang": "Künstliche Mineralfasern alter Bauart (vor 1996) nach TRGS 521 ausbauen ({art}), staubarm in reißfeste Säcke verpacken, "
                     "kennzeichnen und zum Container transportieren.",
             "einheit": "m²", "kg": "394", "gen": "B", "achsen": [MENGE, NUTZ],
             "varianten": [{"art": "Zwischensparrendämmung", "h": 0.45, "mat": 1.5}, {"art": "Dämmung über abgehängter Decke", "h": 0.55, "mat": 1.5},
                           {"art": "Trennwanddämmung", "h": 0.35, "mat": 1.2}, {"art": "Dämmung Flachdach", "h": 0.40, "mat": 1.2}]},
            {"kurz": "PAK-haltigen Parkettkleber/Teer entfernen",
             "lang": "PAK-haltige Klebstoffe (Teer, Bitumen) nach TRGS 524 unter Absaugung abfräsen bzw. abschälen, Untergrund feinreinigen.",
             "einheit": "m²", "kg": "394", "gen": "C", "h": 1.2, "mat": 3, "geraet": 6, "achsen": [MENGE, NUTZ]},
            {"kurz": "PCB-haltige Fugenmasse ausbauen, Fugenbreite bis {b} mm",
             "lang": "PCB-haltige dauerelastische Fugenmassen herausschneiden, Fugenflanken 1 cm tief abfräsen, Abfälle gefährlich verpacken.",
             "einheit": "m", "kg": "394", "gen": "C", "achsen": [NUTZ],
             "varianten": [{"b": "15", "h": 0.45, "mat": 2, "geraet": 1.5}, {"b": "30", "h": 0.65, "mat": 3, "geraet": 2}]},
            {"kurz": "Holzschutzmittel-belastetes Holz ausbauen (PCP/Lindan)",
             "lang": "Mit Holzschutzmitteln belastete Holzbauteile ausbauen, zerkleinern ohne Staubentwicklung, als Altholz A IV verpacken.",
             "einheit": "m²", "kg": "394", "gen": "C", "h": 0.7, "mat": 1.5, "achsen": [MENGE, NUTZ]},
            {"kurz": "Schimmelbefall sanieren, Klasse {k_}",
             "lang": "Mikrobiellen Befall (Schimmel) nach UBA-Leitfaden sanieren: befallene Beschichtungen und Putze abtragen, Oberfläche reinigen und "
                     "desinfizieren, Schutzmaßnahmen nach Gefährdungsklasse {k_}.",
             "einheit": "m²", "kg": "394", "gen": "C", "achsen": [LAGE, NUTZ],
             "varianten": [{"k_": "1 (geringer Befall)", "h": 0.6, "mat": 4}, {"k_": "2 (mittlerer Befall)", "h": 1.0, "mat": 6},
                           {"k_": "3 (großflächig)", "h": 1.6, "mat": 9, "geraet": 3}]},
            {"kurz": "Bleihaltige Beschichtung entfernen",
             "lang": "Bleihaltige Altbeschichtungen nasschemisch bzw. mit Absaugung abtragen, Abfälle als gefährlicher Abfall verpacken.",
             "einheit": "m²", "kg": "394", "gen": "C", "h": 0.9, "mat": 6, "geraet": 2, "achsen": [LAGE, MENGE]},
        ]},
        {"name": "Messungen, Entsorgung", "positionen": [
            {"kurz": "Raumluftmessung {art}",
             "lang": "Raumluftmessung durch akkreditiertes Labor: {art}, einschließlich Probenahme, Analyse und Bericht.",
             "einheit": "St", "kg": "394", "gen": "B",
             "varianten": [{"art": "Asbest-Freimessung nach VDI 3492", "h": 0, "geraet": 650}, {"art": "KMF-Messung nach VDI 3492", "h": 0, "geraet": 580},
                           {"art": "PCB-Raumluft", "h": 0, "geraet": 420}, {"art": "Erfolgskontrolle Schimmel (Luftkeim)", "h": 0, "geraet": 320}]},
            {"kurz": "Materialprobe entnehmen und analysieren, {art}",
             "lang": "Materialprobe aus Bauteil entnehmen, verpacken und im Labor analysieren lassen ({art}), Ergebnisbericht.",
             "einheit": "St", "kg": "394", "gen": "B",
             "varianten": [{"art": "Asbest REM/EDX", "h": 0.5, "geraet": 85}, {"art": "PAK 16 EPA", "h": 0.5, "geraet": 110},
                           {"art": "PCB 6 Kongenere", "h": 0.5, "geraet": 120}, {"art": "KMF Kanzerogenitätsindex", "h": 0.5, "geraet": 140}]},
            {"kurz": "Entsorgung {art}, AVV {avv}",
             "lang": "Ordnungsgemäßes Entsorgen von {art} (Abfallschlüssel {avv}) einschließlich Transport, Nachweisführung im elektronischen "
                     "Abfallnachweisverfahren und Entsorgungsgebühren.",
             "einheit": "t", "kg": "394", "gen": "C", "lohn": "baustelle",
             "varianten": [{"art": "asbesthaltigen Baustoffen", "avv": "17 06 05*", "h": 0.5, "geraet": 420},
                           {"art": "schwach gebundenem Asbest", "avv": "17 06 01*", "h": 0.6, "geraet": 650},
                           {"art": "KMF alter Bauart", "avv": "17 06 03*", "h": 0.5, "geraet": 520},
                           {"art": "teerhaltigen Gemischen", "avv": "17 03 01*", "h": 0.4, "geraet": 380},
                           {"art": "PCB-haltigen Abfällen", "avv": "17 09 02*", "h": 0.6, "geraet": 1450},
                           {"art": "Altholz A IV", "avv": "17 02 04*", "h": 0.3, "geraet": 260}]},
        ]},
    ],
}]
