# Bauteilvorlagen KG 410–490 Technische Anlagen – eigene Aufbauten aus der Positionsdatenbank (Katalog gk3).
# Faktor = Menge der Position je Einheit des Bauteils. TGA-Bauteile meist je St (Objekt/Anlage komplett mit
# Zubehör und anteiligen Leitungen), je m (Leitung) oder je m² (Fläche: Wohn-/Nutzfläche, beheizte Fläche, Dachfläche).
# Anteilige Zentralen/Verteiler: Faktor = 1 / Anzahl der versorgten Einheiten (z. B. Patchfeld 24 Port je 2 Ports → 1/12).


def O(k, t, teile, std=False):
    d = {"k": k, "t": t, "teile": [[c, round(f, 4)] for c, f in teile]}
    if std:
        d["std"] = True
    return d


OHNE = {"k": "", "t": "", "teile": []}


def ohne(t="ohne (gesondert erfasst)", std=True):
    d = {"k": "", "t": t, "teile": []}
    if std:
        d["std"] = True
    return d


def sfx(code, n):
    """Variante einer Grundposition: letzte 3 Ziffern ersetzen (001 Grundausführung, 002/003 … Bestand o. Ä.)."""
    return code[:-3] + f"{n:03d}"


# ---------------------------------------------------------------------------------------------- Leitungs-Bausteine
MSV = {16: "042.01.001.01001", 20: "042.01.001.02001", 26: "042.01.001.03001", 32: "042.01.001.04001",
       40: "042.01.001.05001", 50: "042.01.001.06001", 63: "042.01.001.07001"}
EDS = {15: "042.01.002.01001", 18: "042.01.002.02001", 22: "042.01.002.03001", 28: "042.01.002.04001",
       35: "042.01.002.05001", 42: "042.01.002.06001", 54: "042.01.002.07001", 76: "042.01.002.08001"}
FS_TW = {"k": "042.01.007.01001", "m": "042.01.007.02001", "g": "042.01.007.03001", "x": "042.01.007.04001"}
HT = {40: "044.01.001.01001", 50: "044.01.001.02001", 70: "044.01.001.03001", 90: "044.01.001.04001",
      110: "044.01.001.05001", 125: "044.01.001.06001", 160: "044.01.001.07001"}
SG = {50: "044.01.002.01001", 75: "044.01.002.02001", 90: "044.01.002.03001", 110: "044.01.002.04001",
      125: "044.01.002.05001", 160: "044.01.002.06001"}
SML = {70: "044.01.003.01001", 100: "044.01.003.02001", 125: "044.01.003.03001", 150: "044.01.003.04001", 200: "044.01.003.05001"}
FS_AW = {"k": "044.01.010.01001", "m": "044.01.010.02001", "g": "044.01.010.03001", "x": "044.01.010.04001"}
SCHELLE_AW = "044.01.016.01001"
HZ_MSV = {16: "041.01.001.01001", 20: "041.01.001.02001", 26: "041.01.001.03001", 32: "041.01.001.04001",
          40: "041.01.001.05001", 50: "041.01.001.06001"}
HZ_CS = {15: "041.01.002.01001", 22: "041.01.002.02001", 28: "041.01.002.03001", 35: "041.01.002.04001",
         42: "041.01.002.05001", 54: "041.01.002.06001", 76: "041.01.002.07001", 89: "041.01.002.08001"}
FS_HZ = {"k": "041.01.008.01001", "m": "041.01.008.02001", "g": "041.01.008.03001", "x": "041.01.008.04001"}
WANDSCHEIBE = "042.01.008.01001"
NYM3 = "053.02.001.01001"      # NYM-J 3 × 1,5
NYM325 = "053.02.001.03001"    # NYM-J 3 × 2,5
NYM525 = "053.02.001.04001"    # NYM-J 5 × 2,5
NYM56 = "053.02.001.06001"     # NYM-J 5 × 6
JY2 = "053.02.005.01001"       # J-Y(St)Y 2 × 2 × 0,8
JY4 = "053.02.005.02001"       # J-Y(St)Y 4 × 2 × 0,8
CAT7 = "061.01.001.01001"
CAT7A = "061.01.001.02001"
LS1 = "053.01.006.01001"
LS3 = "053.01.006.02001"
LS3C32 = "053.01.006.03001"
PRUEF_SK = "053.06.001.01001"  # Erstprüfung je Stromkreis

# Anschlussleitungen je Sanitärobjekt (Wasser kalt/warm + Abwasser)
ANS_WC = [[MSV[16], 3.0], [FS_TW["k"], 2], [HT[110], 1.5], [FS_AW["m"], 2], [SCHELLE_AW, 1]]
ANS_WC_RING = [["042.01.009.01001", 1], [MSV[16], 1.0], [HT[110], 1.5], [FS_AW["m"], 2], [SCHELLE_AW, 1]]
ANS_WT = [[MSV[16], 5.0], [FS_TW["k"], 4], [HT[50], 2.0], [FS_AW["k"], 2]]
ANS_WT_RING = [["042.01.009.01001", 2], [MSV[16], 2.0], [HT[50], 2.0], [FS_AW["k"], 2]]
ANS_DU = [[MSV[16], 6.0], [FS_TW["k"], 4], [HT[50], 2.5], [FS_AW["k"], 2]]
ANS_DU_RING = [["042.01.009.01001", 2], [MSV[16], 2.0], [HT[50], 2.5], [FS_AW["k"], 2]]
BEPLANK_WC = [["039.03.002.01001", 1.2]]   # Vorwandbekleidung je WC (ca. 1,0 × 1,2 m)
BEPLANK_WT = [["039.03.002.01001", 0.9]]

V = []   # Vorlagen

# ================================================================================================ 411 Abwasser
V += [
    {"id": "411.01", "kg": "411", "name": "Grundleitung unter Bodenplatte", "einheit": "m",
     "lang": "Grundleitung für Schmutz- bzw. Regenwasser unter der Bodenplatte bzw. im Erdreich, einschließlich anteiliger "
             "Formstücke, Reinigungsöffnungen und Dichtheitsprüfung nach DIN EN 1610.",
     "bezug": "Leitungslänge in der Achse, Formstücke übermessen",
     "schichten": [
         {"name": "Rohr", "optionen": [
             O("KG DN 100", "KG-Rohr PVC-U SN 4, DN 100", [["009.01.001.01001", 1.0]]),
             O("KG DN 125", "KG-Rohr PVC-U SN 4, DN 125", [["009.01.001.02001", 1.0]], True),
             O("KG DN 150", "KG-Rohr PVC-U SN 4, DN 150", [["009.01.001.03001", 1.0]], True),
             O("KG SN8 DN 160", "KG-Rohr PVC-U SN 8, DN 160", [["009.01.001.04001", 1.0]]),
             O("KG SN8 DN 200", "KG-Rohr PVC-U SN 8, DN 200", [["009.01.001.05001", 1.0]], True),
             O("PP SN10 DN 160", "PP-Hochlastrohr SN 10, DN 160", [["009.01.003.01001", 1.0]]),
             O("PP SN10 DN 200", "PP-Hochlastrohr SN 10, DN 200", [["009.01.003.02001", 1.0]])]},
         {"name": "Formstücke", "optionen": [
             O("FS 0,3/m", "Formstücke (Bögen, Abzweige) ca. 0,3 St/m", [["009.01.002.02001", 0.3]], True),
             O("FS + RO", "Formstücke 0,3 St/m und Reinigungsrohr je 20 m", [["009.01.002.02001", 0.3], ["009.01.004.02001", 0.05]], True),
             O("FS 0,5/m", "Formstücke ca. 0,5 St/m (stark verzweigt)", [["009.01.002.02001", 0.5]])]},
         {"name": "Erdarbeiten", "optionen": [
             ohne("Erdarbeiten gesondert bzw. in KG 320 enthalten"),
             O("Graben 0,8 m", "Leitungsgraben bis 0,8 m tief ausheben, Sandbettung, seitlich verfüllen",
               [["002.02.005.01001", 0.5], ["002.04.004.01001", 0.2], ["002.03.002.01001", 0.3]], True)]},
         {"name": "Prüfung", "optionen": [
             O("DP", "Dichtheitsprüfung DIN EN 1610", [["009.01.006.01001", 1.0]], True),
             O("DP + TV", "Dichtheitsprüfung und TV-Inspektion", [["009.01.006.01001", 1.0], ["009.01.007.01001", 1.0]], True)]},
     ], "tags": ["neubau"]},

    {"id": "411.02", "kg": "411", "name": "Fall- und Sammelleitung im Gebäude", "einheit": "m",
     "lang": "Abwasser-Fall- bzw. Sammelleitung im Schacht oder in der Vorwand, einschließlich anteiliger Formstücke, "
             "schallgedämmter Befestigung und – je nach Wahl – Brandschutzmanschetten an Deckendurchführungen.",
     "bezug": "Leitungslänge in der Achse; je Geschoss ca. 2,75–3,0 m Fallleitung",
     "schichten": [
         {"name": "Rohr", "optionen": [
             O("HT DN 70", "PP-HT-Rohr DN 70", [[HT[70], 1.0], [FS_AW["k"], 0.4], [SCHELLE_AW, 0.5]]),
             O("HT DN 110", "PP-HT-Rohr DN 110", [[HT[110], 1.0], [FS_AW["m"], 0.4], [SCHELLE_AW, 0.5]], True),
             O("SG DN 90", "Schallgedämmtes Abwasserrohr DN 90", [[SG[90], 1.0], [FS_AW["m"], 0.4], [SCHELLE_AW, 0.5]], True),
             O("SG DN 110", "Schallgedämmtes Abwasserrohr DN 110", [[SG[110], 1.0], [FS_AW["m"], 0.4], [SCHELLE_AW, 0.5]], True),
             O("SG DN 125", "Schallgedämmtes Abwasserrohr DN 125", [[SG[125], 1.0], [FS_AW["g"], 0.4], [SCHELLE_AW, 0.5]]),
             O("SML DN 100", "Gussrohr SML DN 100, nichtbrennbar", [[SML[100], 1.0], [SCHELLE_AW, 0.5]], True),
             O("SML DN 125", "Gussrohr SML DN 125, nichtbrennbar", [[SML[125], 1.0], [SCHELLE_AW, 0.5]]),
             O("SML DN 150", "Gussrohr SML DN 150, nichtbrennbar", [[SML[150], 1.0], [SCHELLE_AW, 0.5]])]},
         {"name": "Brandschutz", "optionen": [
             ohne("ohne Brandschutzanforderung bzw. nichtbrennbares Rohr"),
             O("BS-Manschette", "Brandschutzmanschette R 90 je Deckendurchführung (0,36 St/m)", [["047.02.001.03001", 0.36]], True),
             O("BS-Abschottung", "Rohrabschottung nichtbrennbare Rohre je Decke (0,36 St/m)", [["047.02.002.03001", 0.36]])]},
         {"name": "Lüftung/Reinigung", "optionen": [
             ohne("Hauptlüftung und Reinigung gesondert", False),
             O("RO + Belüfter", "Reinigungsöffnung je Strang und Belüfter anteilig (je 10 m)", [["044.01.005.01001", 0.1], ["044.01.006.02001", 0.1]], True),
             O("RO + DD", "Reinigungsöffnung und Dachdurchführung Lüftung anteilig (je 10 m)", [["044.01.005.01001", 0.1], ["044.01.007.01001", 0.1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "411.03", "kg": "411", "name": "Bodenablauf/Duschrinne komplett", "einheit": "St",
     "lang": "Bodenablauf bzw. Duschrinne komplett mit Anschlussleitung bis zur Sammelleitung und Anbindung an die "
             "Abdichtung, je nach Wahl mit Brandschutzmanschette in der Decke.",
     "bezug": "Anzahl der Abläufe",
     "schichten": [
         {"name": "Ablauf", "optionen": [
             O("BA DN 50 senkr.", "Bodenablauf DN 50 senkrecht mit Aufsatz und Rost", [["044.02.001.01001", 1]], True),
             O("BA DN 70 waag.", "Bodenablauf DN 70 waagerecht mit Aufsatz und Rost", [["044.02.001.02001", 1]], True),
             O("BA DN 100 RS", "Bodenablauf DN 100 mit Rückstauverschluss", [["044.02.001.03001", 1]]),
             O("Rinne 800", "Duschrinne Edelstahl 800 mm", [["044.02.002.01001", 1]], True),
             O("Rinne 1000", "Duschrinne Edelstahl 1000 mm", [["044.02.002.02001", 1]]),
             O("Rinne 1200", "Duschrinne Edelstahl 1200 mm", [["044.02.002.03001", 1]], True),
             O("Balkon DN 70", "Balkon-/Terrassenablauf DN 70 mit Abdichtungsflansch", [["044.03.006.02001", 1]])]},
         {"name": "Anschluss", "optionen": [
             O("Ltg. DN 50 2 m", "Anschlussleitung HT DN 50, ca. 2 m, mit Formstücken", [[HT[50], 2.0], [FS_AW["k"], 2]], True),
             O("Ltg. DN 70 3 m", "Anschlussleitung HT DN 70, ca. 3 m, mit Formstücken", [[HT[70], 3.0], [FS_AW["k"], 2]], True),
             O("Ltg. DN 110 3 m", "Anschlussleitung HT DN 110, ca. 3 m, mit Formstücken", [[HT[110], 3.0], [FS_AW["m"], 2]])]},
         {"name": "Abdichtung/Brandschutz", "optionen": [
             O("Dichtmanschette", "Dichtmanschette und Dichtband an Verbundabdichtung", [["024.01.003.03001", 1], ["024.01.003.01001", 1.0]], True),
             O("Manschette + BS", "Dichtmanschette und Brandschutzmanschette R 90 DN 75", [["024.01.003.03001", 1], ["047.02.001.02001", 1]], True),
             ohne("ohne (Abdichtung gesondert)", False)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "411.04", "kg": "411", "name": "Hebeanlage komplett", "einheit": "St",
     "lang": "Abwasserhebeanlage nach DIN EN 12056-4 komplett mit Zulauf- und Druckleitung, Rückschleife über die "
             "Rückstauebene, Elektroanschluss und Inbetriebnahme.",
     "bezug": "Anzahl der Anlagen",
     "schichten": [
         {"name": "Anlage", "optionen": [
             O("Kompakt Objekt", "Hebeanlage kompakt für Einzelobjekt (WC/Dusche/WT)", [["044.02.008.01001", 1]]),
             O("Fäk. 1 P 60 l", "Fäkalienhebeanlage Einzelanlage, Behälter 60 l", [["046.01.005.01001", 1]], True),
             O("Fäk. 1 P 120 l", "Fäkalienhebeanlage Einzelanlage, Behälter 120 l", [["046.01.005.02001", 1]]),
             O("Fäk. 2 P 250 l", "Fäkalienhebeanlage Doppelanlage, Behälter 250 l", [["046.01.005.03001", 1]], True),
             O("Fäk. 2 P 450 l", "Fäkalienhebeanlage Doppelanlage, Behälter 450 l", [["046.01.005.04001", 1]]),
             O("Schmutzw.-Schacht", "Pumpenschacht Ø 600 mit Tauchmotorpumpe 15 m³/h", [["046.01.004.02001", 1], ["046.01.003.02001", 1]], True),
             O("Schmutzw.-Sumpf", "Schmutzwasserpumpe mit Schwimmer im Pumpensumpf", [["044.02.006.01001", 1]], True)]},
         {"name": "Leitungen", "optionen": [
             O("Zul. + Druck kurz", "Zulauf DN 110 ca. 3 m, Druckleitung DN 50 ca. 8 m mit Rückschleife",
               [[HT[110], 3.0], [FS_AW["m"], 2], [HT[50], 8.0], [FS_AW["k"], 4], ["041.02.007.03001", 1]], True),
             O("Zul. + Druck lang", "Zulauf DN 110 ca. 5 m, Druckleitung DN 70 ca. 15 m mit Rückschleife",
               [[HT[110], 5.0], [FS_AW["m"], 3], [HT[70], 15.0], [FS_AW["k"], 6], ["041.02.007.03001", 1]], True)]},
         {"name": "Elektro", "optionen": [
             O("CEE 16 A", "Elektroanschluss über CEE-Steckdose 16 A, Zuleitung 15 m, Absicherung",
               [["053.08.001.01001", 1], [NYM525, 15.0], [LS3, 1], [PRUEF_SK, 1]], True),
             O("Festanschluss", "Festanschluss mit Notschalter, Zuleitung 15 m, Absicherung",
               [["053.04.005.05001", 1], [NYM525, 12.0], [LS3, 1], [PRUEF_SK, 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "411.05", "kg": "411", "name": "Rückstausicherung komplett", "einheit": "St",
     "lang": "Rückstausicherung für Entwässerungsgegenstände unterhalb der Rückstauebene nach DIN EN 13564, "
             "eingebaut in Grundleitung, Schacht oder Bodenplatte, einschließlich Anschluss.",
     "bezug": "Anzahl der Rückstauverschlüsse",
     "schichten": [
         {"name": "Verschluss", "optionen": [
             O("RS fäkfrei 100", "Rückstauverschluss fäkalienfrei DN 100", [["044.02.003.01001", 1]], True),
             O("RS fäkfrei 150", "Rückstauverschluss fäkalienfrei DN 150", [["044.02.003.02001", 1]]),
             O("RS fäk. el. 100", "Rückstauverschluss elektronisch fäkalienhaltig DN 100", [["044.02.004.01001", 1]], True),
             O("RS fäk. el. 150", "Rückstauverschluss elektronisch fäkalienhaltig DN 150", [["044.02.004.02001", 1]], True),
             O("RS Grundltg. 100", "Rückstauverschluss in Grundleitung DN 100", [["009.01.005.01001", 1]], True)]},
         {"name": "Einbau", "optionen": [
             O("in Schacht 400", "Einbau in Kontrollschacht Kunststoff DN 400", [["044.01.017.01001", 1]], True),
             O("in Schacht 600", "Einbau in Kontrollschacht Kunststoff DN 600", [["044.01.017.02001", 1]]),
             ohne("Einbau in Bodenplatte/freiliegend, ohne Schacht")]},
         {"name": "Anschluss", "optionen": [
             O("Neubau", "Anschluss an neue Grundleitung, Formstücke", [["009.01.002.01001", 2], ["009.01.001.01001", 2.0]], True),
             O("Bestand", "Übergang auf Bestandsleitung Guss/Steinzeug", [["044.01.011.01001", 2], ["009.01.001.01001", 1.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "411.06", "kg": "411", "name": "Dachentwässerung innenliegend", "einheit": "St",
     "lang": "Innenliegende Flachdachentwässerung je Dachablauf: Dachablauf, Fallleitung im Gebäude bis zur Grundleitung "
             "(ca. 2 Geschosse) und – je nach Wahl – Notüberlauf.",
     "bezug": "Anzahl der Dachabläufe",
     "schichten": [
         {"name": "Dachablauf", "optionen": [
             O("DA DN 70 beh.", "Flachdachablauf beheizbar DN 70 mit Kiesfang", [["044.03.001.01001", 1]], True),
             O("DA DN 100 beh.", "Flachdachablauf beheizbar DN 100 mit Kiesfang", [["044.03.001.02001", 1]], True),
             O("Druckströmung", "Druckströmungsentwässerung, Ablauf mit Systemelement", [["044.03.003.01001", 1], ["021.05.003.01001", 1]], True)]},
         {"name": "Fallleitung", "optionen": [
             O("RW-FL DN 100 6 m", "Regenwasser-Fallrohr innen DN 100, ca. 6 m", [["044.03.005.01001", 6.0], [FS_AW["m"], 3]], True),
             O("RW-FL DN 125 6 m", "Regenwasser-Fallrohr innen DN 125, ca. 6 m", [["044.03.005.02001", 6.0], [FS_AW["g"], 3]]),
             O("RW-FL DN 150 9 m", "Regenwasser-Fallrohr innen DN 150, ca. 9 m", [["044.03.005.03001", 9.0], [FS_AW["g"], 4]]),
             O("SG DN 110 6 m", "Schallgedämmtes Rohr DN 110, ca. 6 m, gedämmt", [[SG[110], 6.0], [FS_AW["m"], 3], ["047.01.002.03001", 6.0]], True)]},
         {"name": "Notüberlauf", "optionen": [
             ohne("Notentwässerung gesondert"),
             O("NÜ Attika 70", "Notüberlauf Attika DN 70", [["044.03.002.01001", 1]], True),
             O("NÜ Attika 100", "Notüberlauf Attika DN 100", [["044.03.002.02001", 1]])]},
     ], "tags": ["neubau"]},

    {"id": "411.07", "kg": "411", "name": "Fettabscheideranlage komplett", "einheit": "St",
     "lang": "Fettabscheider nach DIN EN 1825/DIN 4040-100 komplett mit Zu- und Ablaufleitung, Probenahme und "
             "Generalinspektion vor Inbetriebnahme.",
     "bezug": "Anzahl der Anlagen",
     "schichten": [
         {"name": "Abscheider", "optionen": [
             O("FA NS 2 frei", "Fettabscheider NS 2 freistehend im Gebäude", [["044.02.007.01001", 1]], True),
             O("FA NS 4 frei", "Fettabscheider NS 4 freistehend im Gebäude", [["044.02.007.02001", 1]]),
             O("FA NS 2 Direkt", "Fettabscheider NS 2 mit Direktentsorgung", [["046.03.003.01001", 1]], True),
             O("FA NS 4 Direkt", "Fettabscheider NS 4 mit Direktentsorgung", [["046.03.003.02001", 1]], True),
             O("FA NS 7 + Heb.", "Fettabscheider NS 7, Direktentsorgung, Hebeanlage", [["046.03.003.03001", 1]]),
             O("FA NS 4 Erde", "Fettabscheider Erdeinbau NS 4, Beton", [["011.02.001.02001", 1]], True)]},
         {"name": "Leitungen", "optionen": [
             O("Zu/Ab 10 m", "Zu- und Ablaufleitung DN 150, ca. 10 m, mit Formstücken", [["009.01.001.03001", 10.0], ["009.01.002.02001", 4]], True),
             O("Zu/Ab 20 m", "Zu- und Ablaufleitung DN 150, ca. 20 m, mit Formstücken", [["009.01.001.03001", 20.0], ["009.01.002.02001", 6]], True)]},
         {"name": "Probenahme/Prüfung", "optionen": [
             O("GI", "Generalinspektion vor Inbetriebnahme", [["011.02.004.03001", 1]], True),
             O("GI + Probenahme", "Generalinspektion und Probenahmeschacht DN 800", [["011.02.004.03001", 1], ["011.01.003.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "411.08", "kg": "411", "name": "Leichtflüssigkeitsabscheider", "einheit": "St",
     "lang": "Leichtflüssigkeitsabscheideranlage nach DIN EN 858 mit Schlammfang, Warnanlage und Probenahmeschacht, "
             "erdeingebaut, einschließlich Dichtheitsprüfung.",
     "bezug": "Anzahl der Anlagen",
     "fest": [["011.04.004.01001", 1]],
     "schichten": [
         {"name": "Abscheider", "optionen": [
             O("LFA NS 3", "Leichtflüssigkeitsabscheider Kl. I NS 3, Beton", [["011.01.001.01001", 1]], True),
             O("LFA NS 6", "Leichtflüssigkeitsabscheider Kl. I NS 6, Beton", [["011.01.001.02001", 1]], True),
             O("LFA NS 10", "Leichtflüssigkeitsabscheider Kl. I NS 10, Beton", [["011.01.001.03001", 1]], True),
             O("LFA NS 15", "Leichtflüssigkeitsabscheider Kl. I NS 15, Beton", [["011.01.001.04001", 1]]),
             O("Koaleszenz NS 3", "Koaleszenzabscheider NS 3 (Kunststoff)", [["044.02.012.01001", 1]])]},
         {"name": "Warnanlage", "optionen": [
             O("Warn. Schicht", "Warnanlage Schichtdicke", [["011.01.002.01001", 1]], True),
             O("Warn. Sch.+Stau", "Warnanlage Schichtdicke und Aufstau", [["011.01.002.02001", 1]], True),
             O("Warn. komplett", "Warnanlage Schichtdicke, Aufstau, Schlammspiegel", [["011.01.002.03001", 1]])]},
         {"name": "Probenahme", "optionen": [
             O("PS DN 800", "Probenahmeschacht DN 800", [["011.01.003.01001", 1]], True),
             O("PS DN 1000", "Probenahmeschacht DN 1000", [["011.01.003.02001", 1]], True)]},
     ], "tags": ["neubau"]},

    {"id": "411.09", "kg": "411", "name": "Kleinkläranlage komplett", "einheit": "St",
     "lang": "Vollbiologische Kleinkläranlage mit Kontrollschacht und Zulaufleitung, einschließlich Inbetriebnahme; "
             "Erdarbeiten für die Behälter gesondert.",
     "bezug": "Anzahl der Anlagen",
     "schichten": [
         {"name": "Anlage", "optionen": [
             O("SBR 4 EW", "SBR-Anlage bis 4 EW, Beton", [["011.03.001.01001", 1]], True),
             O("SBR 8 EW", "SBR-Anlage bis 8 EW, Beton", [["011.03.001.02001", 1]], True),
             O("SBR 12 EW", "SBR-Anlage bis 12 EW, Beton", [["011.03.001.03001", 1]]),
             O("Festbett 4 EW", "Festbettanlage bis 4 EW, Beton", [["011.03.001.04001", 1]], True),
             O("Festbett 8 EW", "Festbettanlage bis 8 EW, Beton", [["011.03.001.05001", 1]], True)]},
         {"name": "Schacht", "optionen": [
             O("KS DN 400", "Kontrollschacht DN 400 Beton", [["011.04.001.01001", 1]], True),
             O("KS DN 600", "Kontrollschacht DN 600 Beton", [["011.04.001.02001", 1]], True)]},
         {"name": "Zulauf", "optionen": [
             O("Zulauf 10 m", "Zulaufleitung KG DN 150, ca. 10 m", [["009.01.001.03001", 10.0], ["009.01.002.02001", 3]], True),
             O("Zulauf 20 m", "Zulaufleitung KG DN 150, ca. 20 m", [["009.01.001.03001", 20.0], ["009.01.002.02001", 4]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "411.10", "kg": "411", "name": "Regenwassernutzung Zisterne", "einheit": "St",
     "lang": "Regenwassernutzungsanlage mit erdverlegter Zisterne, Pumpentechnik und Leitungen zum Gebäude; "
             "Erdarbeiten für den Behälter gesondert.",
     "bezug": "Anzahl der Anlagen",
     "schichten": [
         {"name": "Zisterne", "optionen": [
             O("Kunstst. 3 m³", "Zisterne Kunststoff 3.000 l, begehbar", [["046.03.001.01001", 1]]),
             O("Kunstst. 5 m³", "Zisterne Kunststoff 5.000 l, begehbar", [["046.03.001.02001", 1]], True),
             O("Kunstst. 7,5 m³", "Zisterne Kunststoff 7.500 l, begehbar", [["046.03.001.03001", 1]], True),
             O("Kunstst. 10 m³", "Zisterne Kunststoff 10.000 l, begehbar", [["046.03.001.04001", 1]]),
             O("Beton 5 m³", "Zisterne Beton-Erdtank 5 m³", [["011.03.003.02001", 1]], True),
             O("Beton 10 m³", "Zisterne Beton-Erdtank 10 m³", [["011.03.003.04001", 1]], True)]},
         {"name": "Technik", "optionen": [
             O("Hauswasserz.", "Regenwasser-Hauswasserzentrale mit Nachspeisung", [["046.03.002.01001", 1]], True),
             O("Tauchpumpe", "Tauchmotorpumpe in Zisterne (Gartenbewässerung)", [["046.01.003.01001", 1]], True)]},
         {"name": "Leitungen", "optionen": [
             O("Ltg. 10 m", "Zulauf KG DN 110 und Saug-/Druckleitung PE 32, je ca. 10 m", [["044.01.004.01001", 10.0], ["042.01.004.01001", 10.0]], True),
             O("Ltg. 20 m", "Zulauf KG DN 110 und Saug-/Druckleitung PE 32, je ca. 20 m", [["044.01.004.01001", 20.0], ["042.01.004.01001", 20.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "411.11", "kg": "411", "name": "Abwasserleitung erneuern (Bestand)", "einheit": "m",
     "lang": "Bestehende Abwasserleitung demontieren und entsorgen, neue Leitung im Bestand einbauen und an Bestandsleitungen "
             "anschließen, einschließlich anteiliger Formstücke und Brandschutz.",
     "bezug": "Leitungslänge der neuen Leitung",
     "schichten": [
         {"name": "Rückbau", "optionen": [
             O("Rückbau ≤ DN 100", "Altleitung bis DN 100 demontieren und entsorgen", [["044.01.013.01001", 1.0]], True),
             O("Rückbau ≤ DN 150", "Altleitung bis DN 150 demontieren und entsorgen", [["044.01.013.02001", 1.0]], True),
             ohne("ohne Rückbau (Altleitung stillgelegt)", False)]},
         {"name": "Neue Leitung", "optionen": [
             O("HT DN 110", "PP-HT DN 110 im Bestand", [[sfx(HT[110], 3), 1.0], [FS_AW["m"], 0.5], [SCHELLE_AW, 0.5]], True),
             O("SG DN 110", "Schallgedämmt DN 110 im Bestand", [[sfx(SG[110], 3), 1.0], [FS_AW["m"], 0.5], [SCHELLE_AW, 0.5]], True),
             O("SML DN 100", "Guss SML DN 100 im Bestand", [[sfx(SML[100], 3), 1.0], [SCHELLE_AW, 0.5]], True),
             O("SG DN 125", "Schallgedämmt DN 125 im Bestand", [[sfx(SG[125], 3), 1.0], [FS_AW["g"], 0.5], [SCHELLE_AW, 0.5]])]},
         {"name": "Anschlüsse/Brandschutz", "optionen": [
             O("Überg. je 10 m", "Übergang auf Bestandsleitung je 10 m", [["044.01.011.01001", 0.1]], True),
             O("Überg. + BS", "Übergang je 10 m und Brandschutzmanschette je Decke", [["044.01.011.01001", 0.1], ["047.02.001.03001", 0.36]], True)]},
     ], "tags": ["altbau"]},

    {"id": "411.12", "kg": "411", "name": "Inliner-Sanierung Abwasserleitung", "einheit": "m",
     "lang": "Grabenlose Sanierung bestehender Fall- bzw. Grundleitungen mit Schlauchliner, einschließlich Vorreinigung, "
             "TV-Inspektion und Dichtheitsprüfung nach der Sanierung.",
     "bezug": "Sanierte Leitungslänge",
     "schichten": [
         {"name": "Inliner", "optionen": [
             O("Liner DN 100", "Schlauchliner DN 100", [["044.01.014.01001", 1.0]], True),
             O("Liner DN 150", "Schlauchliner DN 150", [["044.01.014.02001", 1.0]], True)]},
         {"name": "Vorarbeiten", "optionen": [
             O("HD-Spülung", "Hochdruckspülung", [["044.01.015.01001", 1.0]], True),
             O("Spülung + TV", "Hochdruckspülung und TV-Inspektion vorher/nachher", [["044.01.015.01001", 1.0], ["044.01.009.01001", 2.0]], True),
             ohne("ohne (Vorarbeiten gesondert)", False)]},
         {"name": "Prüfung", "optionen": [
             O("Dichtheit", "Dichtheitsprüfung nach Sanierung", [["044.01.008.01001", 1.0]], True),
             O("Dichth. + Doku", "Dichtheitsprüfung und Kamerabefahrung mit Bericht", [["044.01.008.01001", 1.0], ["009.01.007.01001", 1.0]], True)]},
     ], "tags": ["altbau"]},
]

# ================================================================================================ 412 Wasser
VORW_WC = [
    O("VE 1120", "Vorwandelement Wand-WC, Bauhöhe 1120 mm", [["045.01.001.01001", 1]], True),
    O("VE 820 niedrig", "Vorwandelement Wand-WC, Bauhöhe 820 mm (unter Fenster)", [["045.01.001.05001", 1]], True),
]
BETAET = [
    O("BP Kunststoff", "Betätigungsplatte 2-Mengen, Kunststoff weiß", [["045.01.002.01001", 1]], True),
    O("BP Edelstahl/Glas", "Betätigungsplatte 2-Mengen, Edelstahl bzw. Glas", [["045.01.002.02001", 1]], True),
    O("BP berührungslos", "Betätigungsplatte berührungslos elektronisch", [["045.01.002.03001", 1], [NYM3, 8.0]]),
]
BETAET_K = [
    O("BP Kunstst.", "Betätigungsplatte 2-Mengen, Kunststoff weiß", [["045.01.002.01001", 1]], True),
    O("BP Edelst.", "Betätigungsplatte 2-Mengen, Edelstahl bzw. Glas", [["045.01.002.02001", 1]], True),
    O("BP berührungslos", "Betätigungsplatte berührungslos elektronisch", [["045.01.002.03001", 1], [NYM3, 8.0]]),
]
ABTRENN = [
    ohne("ohne Abtrennung (Vorhang/bauseits)", False),
    O("Walk-in", "Duschabtrennung Walk-in ESG 8 mm bis 120 cm", [["045.02.008.01001", 1]], True),
    O("Nische Pendel", "Duschabtrennung Nische mit Pendeltür bis 100 cm", [["045.02.008.03001", 1]], True),
    O("Eck 90 Pendel", "Duschabtrennung Eckeinstieg mit Pendeltür 90 × 90", [["045.02.008.02001", 1]]),
]

V += [
    {"id": "412.01", "kg": "412", "name": "Trinkwasserleitung", "einheit": "m",
     "lang": "Trinkwasserleitung kalt/warm/Zirkulation in Vorwand oder Schacht, einschließlich anteiliger Formstücke, "
             "Befestigung, Dämmung nach GEG/DIN 1988-200 und Spülung.",
     "bezug": "Leitungslänge in der Achse",
     "schichten": [
         {"name": "Rohr", "optionen": [
             O("MSV 16", "Mehrschichtverbundrohr 16 mm", [[MSV[16], 1.0], [FS_TW["k"], 0.5]], True),
             O("MSV 20", "Mehrschichtverbundrohr 20 mm", [[MSV[20], 1.0], [FS_TW["k"], 0.5]], True),
             O("MSV 26", "Mehrschichtverbundrohr 26 mm", [[MSV[26], 1.0], [FS_TW["m"], 0.4]], True),
             O("MSV 32", "Mehrschichtverbundrohr 32 mm", [[MSV[32], 1.0], [FS_TW["m"], 0.4]]),
             O("MSV 40", "Mehrschichtverbundrohr 40 mm", [[MSV[40], 1.0], [FS_TW["g"], 0.3]]),
             O("MSV 50", "Mehrschichtverbundrohr 50 mm", [[MSV[50], 1.0], [FS_TW["g"], 0.3]]),
             O("ES 22", "Edelstahlrohr 1.4521, 22 mm", [[EDS[22], 1.0], [FS_TW["k"], 0.4]], True),
             O("ES 28", "Edelstahlrohr 1.4521, 28 mm", [[EDS[28], 1.0], [FS_TW["m"], 0.4]]),
             O("ES 35", "Edelstahlrohr 1.4521, 35 mm", [[EDS[35], 1.0], [FS_TW["m"], 0.3]], True),
             O("ES 54", "Edelstahlrohr 1.4521, 54 mm", [[EDS[54], 1.0], [FS_TW["g"], 0.3]])]},
         {"name": "Dämmung", "optionen": [
             O("Kautschuk 9", "Kautschuk 9 mm (Kaltwasser/Vorwand)", [["047.01.002.01001", 1.0]], True),
             O("Kautschuk 13", "Kautschuk 13 mm (Kaltwasser, Tauwasserschutz)", [["047.01.002.02001", 1.0]], True),
             O("MW 100 % GEG", "Mineralwolle-Schale alukaschiert, 100 % GEG (Warmwasser)", [["047.01.001.02001", 1.0]], True),
             ohne("ohne Dämmung", False)]},
         {"name": "Brandschutz", "optionen": [
             ohne("ohne Abschottung"),
             O("Abschottung", "Rohrabschottung je Decke/Wand (0,36 St/m)", [["047.02.002.01001", 0.36]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.02", "kg": "412", "name": "Hauswasseranschluss komplett", "einheit": "St",
     "lang": "Trinkwasser-Hausanschluss ab Grundstücksgrenze mit Hauseinführung, Wasserzähleranlage, Hauswasserstation "
             "mit Filter und Druckminderer sowie Spülung und Druckprüfung der Anlage.",
     "bezug": "Anzahl der Hausanschlüsse",
     "fest": [["042.01.005.01001", 1]],
     "schichten": [
         {"name": "Anschlussleitung", "optionen": [
             O("PE d 32, 10 m", "Hausanschlussleitung PE 100 d 32, ca. 10 m", [["042.01.004.01001", 10.0]], True),
             O("PE d 40, 15 m", "Hausanschlussleitung PE 100 d 40, ca. 15 m", [["042.01.004.02001", 15.0]], True),
             O("PE d 63, 20 m", "Hausanschlussleitung PE 100 d 63, ca. 20 m", [["042.01.004.03001", 20.0]])]},
         {"name": "Einführung", "optionen": [
             O("Mehrsparten", "Mehrsparten-Hauseinführung", [["053.01.001.01001", 1]], True),
             O("Futterrohr", "Wanddurchführung mit Futterrohr und Ringraumdichtung", [["041.01.011.01001", 1]], True)]},
         {"name": "Station", "optionen": [
             O("HWS DN 25", "Wasserzähleranlage Q3 4 und Hauswasserstation DN 25", [["042.02.002.01001", 1], ["042.02.001.01001", 1]], True),
             O("HWS DN 32", "Wasserzähleranlage Q3 10 und Hauswasserstation DN 32", [["042.02.002.02001", 1], ["042.02.001.02001", 1]], True),
             O("HWS DN 50", "Wasserzähleranlage Q3 10 und Hauswasserstation DN 50", [["042.02.002.02001", 1], ["042.02.001.03001", 1]])]},
         {"name": "Zusatz", "optionen": [
             ohne("ohne"),
             O("Leckageschutz", "Leckageschutz mit Absperrventil und Sensoren", [["042.02.006.01001", 1]], True),
             O("Enthärtung EFH", "Enthärtungsanlage Ionentauscher EFH", [["042.02.004.01001", 1]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.03", "kg": "412", "name": "Trinkwassererwärmung zentral", "einheit": "St",
     "lang": "Zentrale Trinkwassererwärmung mit Speicher bzw. Frischwasserstation, Sicherheitsgruppe, Zirkulation und "
             "Verbrühschutz nach Wahl; Anbindung an den Wärmeerzeuger.",
     "bezug": "Anzahl der Anlagen",
     "schichten": [
         {"name": "Speicher", "optionen": [
             O("Speicher 200 l", "Trinkwasserspeicher 200 l mit Glattrohr-WT", [["040.03.002.01001", 1]], True),
             O("Speicher 300 l", "Trinkwasserspeicher 300 l mit Glattrohr-WT", [["040.03.002.02001", 1]], True),
             O("Speicher 500 l", "Trinkwasserspeicher 500 l mit Glattrohr-WT", [["040.03.002.03001", 1]]),
             O("FWS 25 + P 500", "Frischwasserstation 25 l/min mit Pufferspeicher 500 l", [["040.03.003.01001", 1], ["040.03.001.03001", 1]], True),
             O("FWS 40 + P 800", "Frischwasserstation 40 l/min mit Pufferspeicher 800 l", [["040.03.003.02001", 1], ["040.03.001.04001", 1]]),
             O("Hygiene 500 l", "Kombispeicher (Hygienespeicher) 500 l", [["040.03.006.01001", 1]], True),
             O("BW-WP 300 l", "Trinkwasser-Wärmepumpe 300 l", [["040.03.007.02001", 1]])]},
         {"name": "Zirkulation", "optionen": [
             ohne("ohne Zirkulation (kurze Leitungswege)"),
             O("Zirk. EFH", "Zirkulationspumpe mit Zeitschaltuhr, 2 Regulierventile", [["042.03.004.01001", 1], ["042.03.003.01001", 2]], True),
             O("Zirk. MFH", "Zirkulationspumpe HE DN 20, 6 thermostatische Regulierventile", [["046.01.002.02001", 1], ["042.03.003.01001", 6]])]},
         {"name": "Zubehör", "optionen": [
             O("Verbrühschutz", "Thermostatischer Mischer DN 20", [["042.03.005.01001", 1]], True),
             O("Mischer + Heizst.", "Thermostatischer Mischer DN 20 und Elektro-Heizstab 3 kW", [["042.03.005.01001", 1], ["040.01.010.01001", 1]], True),
             ohne("ohne", False)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.04", "kg": "412", "name": "Trinkwassererwärmung dezentral", "einheit": "St",
     "lang": "Dezentrale elektrische Trinkwassererwärmung je Zapfstelle bzw. Wohnung mit Wasser- und Elektroanschluss.",
     "bezug": "Anzahl der Geräte",
     "schichten": [
         {"name": "Gerät", "optionen": [
             O("DLE 18 kW", "Elektronischer Durchlauferhitzer 18 kW mit Geräteanschluss 400 V",
               [["040.03.004.01001", 1], ["053.04.005.03001", 1], [LS3C32, 1], [PRUEF_SK, 1]], True),
             O("DLE 24 kW", "Elektronischer Durchlauferhitzer 24 kW mit Geräteanschluss 400 V",
               [["040.03.004.02001", 1], ["053.04.005.03001", 1], [LS3C32, 1], [PRUEF_SK, 1]], True),
             O("Kleinsp. 5 l", "Kleinspeicher untertisch 5 l mit Steckdose", [["040.03.005.01001", 1], ["053.04.002.01001", 1]], True)]},
         {"name": "Wasseranschluss", "optionen": [
             O("MSV 16, 3 m", "Kalt-/Warmwasser MSV 16, ca. 2 × 1,5 m", [[MSV[16], 3.0], [FS_TW["k"], 2]], True),
             O("Edelst. 15, 3 m", "Kalt-/Warmwasser Edelstahl 15 mm, ca. 2 × 1,5 m", [[EDS[15], 3.0], [FS_TW["k"], 2]], True)]},
         {"name": "Zubehör", "optionen": [
             ohne("ohne"),
             O("Absperrung", "Absperrventil Schrägsitz DN 15", [["042.03.001.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.05", "kg": "412", "name": "WC wandhängend komplett", "einheit": "St",
     "lang": "Wand-WC komplett mit Vorwandelement, Betätigungsplatte, WC-Keramik mit Sitz, Wasser- und Abwasseranschluss "
             "an die Verteil-/Sammelleitung und – je nach Wahl – Beplankung der Vorwand.",
     "bezug": "Anzahl der WC-Anlagen",
     "schichten": [
         {"name": "Vorwandelement", "optionen": VORW_WC},
         {"name": "WC", "optionen": [
             O("WC Standard", "Wand-WC spülrandlos, Standardausführung", [["045.02.001.01001", 1]], True),
             O("WC gehoben", "Wand-WC spülrandlos, gehobene Ausführung", [["045.02.001.02001", 1]], True),
             O("Dusch-WC", "Dusch-WC mit Elektroanschluss", [["045.02.001.03001", 1], ["053.04.002.01001", 1]], True)]},
         {"name": "Betätigung", "optionen": BETAET},
         {"name": "Anschlüsse", "optionen": [
             O("Anschl. Reihe", "Anschluss Kalt-/Abwasser, Reiheninstallation", ANS_WC, True),
             O("Anschl. Ring", "Anschluss als Ringinstallation (Hygiene)", ANS_WC_RING)]},
         {"name": "Beplankung", "optionen": [
             O("Beplankung", "Vorwandbekleidung GK-Platten 2-lagig, ca. 1,2 m²", BEPLANK_WC, True),
             ohne("ohne (Beplankung gesondert)", False)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.06", "kg": "412", "name": "WC barrierefrei komplett", "einheit": "St",
     "lang": "Barrierefreies WC nach DIN 18040 komplett mit Vorwandelement für Stützgriffe, WC mit Ausladung 70 cm, "
             "Stützklappgriffen, Betätigung und Anschlüssen; Notruf nach Wahl.",
     "bezug": "Anzahl der barrierefreien WC-Anlagen",
     "fest": [["045.01.001.04001", 1]] + ANS_WC + BEPLANK_WC,
     "schichten": [
         {"name": "WC", "optionen": [
             O("WC bf 70", "Wand-WC barrierefrei, Ausladung 70 cm", [["045.02.002.01001", 1]], True),
             O("Dusch-WC", "Dusch-WC, barrierefrei montiert", [["045.02.001.03001", 1], ["053.04.002.01001", 1]], True)]},
         {"name": "Stützgriffe", "optionen": [
             O("2 SKG", "2 Stützklappgriffe 85 cm ohne Spülauslösung", [["045.03.001.01001", 2]], True),
             O("SKG+Spülausl.", "1 Stützklappgriff mit Spülauslösung/Papierhalter, 1 ohne", [["045.03.001.02001", 1], ["045.03.001.01001", 1]], True)]},
         {"name": "Betätigung", "optionen": BETAET_K},
         {"name": "Notruf", "optionen": [
             ohne("ohne Notruf", False),
             O("Notruf", "Notrufanlage barrierefreies WC komplett", [["062.02.001.01001", 1], [JY2, 20.0]], True),
             O("NR + Signal", "Notrufanlage mit Zugtaster, Signal, Abstelltaster", [["063.02.007.01001", 1], [JY2, 20.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.07", "kg": "412", "name": "Waschtisch komplett", "einheit": "St",
     "lang": "Waschtisch aus Sanitärporzellan mit Einhebelmischer, Siphon und Eckventilen, Vorwandelement bzw. Wandanschluss, "
             "Anschlussleitungen und – je nach Wahl – Möbel und Spiegel.",
     "bezug": "Anzahl der Waschtische",
     "schichten": [
         {"name": "Montage", "optionen": [
             O("Vorwand", "Vorwandelement Waschtisch, beplankt", [["045.01.001.02001", 1]] + BEPLANK_WT, True),
             O("Massivwand", "Anschluss an Massivwand mit Wandscheiben", [[WANDSCHEIBE, 2]], True)]},
         {"name": "Waschtisch", "optionen": [
             O("HWB 45", "Handwaschbecken 45 cm mit Armatur", [["045.02.003.01001", 1]]),
             O("WT 60", "Waschtisch 60 cm mit Armatur", [["045.02.003.02001", 1]], True),
             O("WT 80", "Waschtisch 80 cm mit Armatur", [["045.02.003.03001", 1]], True),
             O("Doppel-WT 120", "Doppelwaschtisch 120 cm mit 2 Armaturen", [["045.02.003.04001", 1], [MSV[16], 3.0]], True),
             O("WT 60 + UP-Arm.", "Waschtisch 60 cm, Wandarmatur Unterputz", [["045.02.003.02001", 1], ["045.02.015.03001", 1]])]},
         {"name": "Möbel/Spiegel", "optionen": [
             O("Spiegel 60", "Kristallspiegel 60 cm", [["045.02.022.01001", 1]], True),
             O("US 60 + Spiegel", "Unterschrank 60 cm und Kristallspiegel", [["045.02.005.01001", 1], ["045.02.022.01001", 1]], True),
             O("US 80 + LED-Sp.", "Unterschrank 80 cm und LED-Spiegel 80 cm", [["045.02.005.02001", 1], ["045.02.022.02001", 1]], True),
             O("Spiegelschrank", "Spiegelschrank LED 80 cm", [["045.02.022.03001", 1]]),
             ohne("ohne Möbel und Spiegel", False)]},
     ], "fest": ANS_WT + [["045.02.027.01001", 1]], "tags": ["neubau", "altbau"]},

    {"id": "412.08", "kg": "412", "name": "Waschtisch barrierefrei komplett", "einheit": "St",
     "lang": "Unterfahrbarer Waschtisch nach DIN 18040 mit Hebelarmatur, Flachaufputzsiphon, Vorwandelement, "
             "Anschlüssen, Spiegel und Haltegriffen nach Wahl.",
     "bezug": "Anzahl der Waschplätze",
     "fest": [["045.02.004.01001", 1], ["045.01.001.02001", 1]] + ANS_WT + BEPLANK_WT,
     "schichten": [
         {"name": "Spiegel", "optionen": [
             O("Kippspiegel", "Kippspiegel 60 × 70 cm", [["045.03.004.01001", 1]], True),
             O("Spiegel 60", "Kristallspiegel 60 cm, tief montiert", [["045.02.022.01001", 1]], True),
             O("LED-Spiegel", "LED-Spiegel 80 cm, tief montiert", [["045.02.022.02001", 1]], True)]},
         {"name": "Haltegriffe", "optionen": [
             ohne("ohne Haltegriffe", False),
             O("2 Griffe 30", "2 Haltegriffe 30 cm", [["045.03.002.01001", 2]], True),
             O("2 Griffe 60", "2 Haltegriffe 60 cm", [["045.03.002.02001", 2]], True)]},
         {"name": "Spender", "optionen": [
             ohne("ohne Spender"),
             O("Seife + Papier", "Seifenspender und Papierhandtuchspender", [["045.03.007.01001", 1], ["045.03.007.02001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.09", "kg": "412", "name": "Dusche bodengleich komplett", "einheit": "St",
     "lang": "Bodengleiche Dusche komplett: Entwässerung (Duschrinne bzw. Ablauf mit Gefälleelement oder Duschfläche), "
             "Unterputz-Thermostat mit Kopf- und Handbrause, Anschlüsse, Verbundabdichtung des Duschbereichs und Abtrennung nach Wahl.",
     "bezug": "Anzahl der Duschplätze",
     "schichten": [
         {"name": "Duschfläche", "optionen": [
             O("Rinne + Element", "Duschrinne 800 mm auf befliesbarem Gefälleelement 90 × 90", [["044.02.002.01001", 1], ["024.01.009.01001", 1]], True),
             O("Rinne + Gefälle", "Duschrinne 1000 mm, Gefälle im Fliesenbelag", [["044.02.002.02001", 1], ["024.03.005.01001", 1]], True),
             O("BA + Element 120", "Bodenablauf DN 50 mit Gefälleelement 120 × 120", [["044.02.001.01001", 1], ["024.01.009.02001", 1]]),
             O("Mineralguss 90", "Duschfläche Mineralguss bodengleich 90 × 90", [["045.02.019.01001", 1]], True),
             O("Mineralguss 140", "Duschfläche Mineralguss bodengleich 140 × 90", [["045.02.019.03001", 1]])]},
         {"name": "Armatur", "optionen": [
             O("UP-Thermostat", "UP-Thermostat mit Kopfbrause Ø 25 cm und Handbrause", [["045.02.006.01001", 1]], True),
             O("Duschsystem AP", "Duschsystem Aufputz mit Kopfbrause und Thermostat", [["045.02.017.01001", 1]], True),
             O("Thermostat AP", "Brausethermostat Aufputz mit Brausegarnitur", [["045.02.016.01001", 1]])]},
         {"name": "Abtrennung", "optionen": ABTRENN},
         {"name": "Abdichtung", "optionen": [
             O("Abdichtung W2", "Verbundabdichtung Boden 2 m², Wand 5 m², Dichtband und Manschetten",
               [["024.01.002.02001", 2.0], ["024.01.002.01001", 5.0], ["024.01.003.01001", 6.0], ["024.01.003.03001", 3]], True),
             ohne("ohne (Abdichtung in KG 345/352)", False)]},
     ], "fest": ANS_DU, "tags": ["neubau", "altbau"]},

    {"id": "412.10", "kg": "412", "name": "Duschwanne komplett", "einheit": "St",
     "lang": "Flache Duschwanne aus Stahl-Email mit Ablauf, Armatur, Anschlüssen und Abtrennung nach Wahl.",
     "bezug": "Anzahl der Duschplätze",
     "fest": ANS_DU,
     "schichten": [
         {"name": "Wanne", "optionen": [
             O("Wanne 90 × 90", "Duschwanne Stahl-Email 90 × 90 cm", [["045.02.007.01001", 1]], True),
             O("Wanne 120 × 90", "Duschwanne Stahl-Email 120 × 90 cm", [["045.02.007.02001", 1]], True),
             O("Wanne 160 × 90", "Duschwanne Stahl-Email 160 × 90 cm", [["045.02.007.03001", 1]])]},
         {"name": "Armatur", "optionen": [
             O("Thermostat AP", "Brausethermostat Aufputz mit Brausegarnitur", [["045.02.016.01001", 1]], True),
             O("Duschsystem AP", "Duschsystem Aufputz mit Kopfbrause", [["045.02.017.01001", 1]], True),
             O("UP-Thermostat", "UP-Thermostat mit Kopf- und Handbrause", [["045.02.006.01001", 1]])]},
         {"name": "Abtrennung", "optionen": ABTRENN},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.11", "kg": "412", "name": "Badewanne komplett", "einheit": "St",
     "lang": "Acryl-Badewanne mit Wannenträger, Ab- und Überlaufgarnitur, Wannenthermostat mit Handbrause, Anschlüssen und "
             "Wannenverkleidung nach Wahl.",
     "bezug": "Anzahl der Wannen",
     "schichten": [
         {"name": "Wanne", "optionen": [
             O("Wanne 170 × 75", "Acrylwanne 170 × 75 cm mit Armaturen", [["045.02.009.01001", 1]], True),
             O("Wanne 180 × 80", "Acrylwanne 180 × 80 cm mit Armaturen", [["045.02.009.02001", 1]], True)]},
         {"name": "Verkleidung", "optionen": [
             O("Schürze System", "Wannenträger mit Systemverkleidung", [["045.02.020.01001", 1]], True),
             O("Schürze Fliese", "Wannenschürze gefliest, ca. 1,0 m²", [["024.02.006.01001", 1.0]], True),
             ohne("ohne (gesondert)", False)]},
         {"name": "Anschlüsse", "optionen": [
             O("Anschl. Reihe", "Kalt-/Warmwasser MSV 16 und Abwasser DN 50", [[MSV[16], 6.0], [FS_TW["k"], 4], [HT[50], 2.5], [FS_AW["k"], 2]], True),
             O("Anschl. Ring", "Ringinstallation Kalt-/Warmwasser, Abwasser DN 50", [["042.01.009.01001", 2], [MSV[16], 2.0], [HT[50], 2.5], [FS_AW["k"], 2]], True)]},
         {"name": "Zubehör", "optionen": [
             ohne("ohne"),
             O("Haltegriff", "Haltegriff 60 cm", [["045.03.002.02001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.12", "kg": "412", "name": "Urinalanlage komplett", "einheit": "St",
     "lang": "Urinal mit Vorwandelement, Spülung manuell oder berührungslos, Anschlüssen, Beplankung und Schamwand nach Wahl.",
     "bezug": "Anzahl der Urinale",
     "fest": [["045.01.001.03001", 1]],
     "schichten": [
         {"name": "Urinal", "optionen": [
             O("Urinal Druckspül.", "Urinal mit manueller Druckspüler-Betätigung", [["045.02.010.01001", 1]], True),
             O("Urinal Infrarot", "Urinal mit Infrarot-Steuerung (Netz)", [["045.02.010.02001", 1], [NYM3, 8.0]], True)]},
         {"name": "Anschlüsse", "optionen": [
             O("MSV 16", "Kaltwasser MSV 16 ca. 3 m, Abwasser DN 50", [[MSV[16], 3.0], [FS_TW["k"], 2], [HT[50], 1.5], [FS_AW["k"], 2]], True),
             O("Edelstahl 15", "Kaltwasser Edelstahl 15 mm ca. 3 m, Abwasser DN 50", [[EDS[15], 3.0], [FS_TW["k"], 2], [HT[50], 1.5], [FS_AW["k"], 2]], True)]},
         {"name": "Beplankung", "optionen": [
             O("Beplankung", "Vorwandbekleidung GK 2-lagig, ca. 1,0 m²", [["039.03.002.01001", 1.0]], True),
             O("Vorwand raumhoch", "Vorwandbekleidung raumhoch, ca. 2,5 m²", [["039.03.002.02001", 2.5]], True)]},
         {"name": "Schamwand", "optionen": [
             ohne("ohne Schamwand"),
             O("Schamwand", "Urinal-Trennwand Kompaktplatte", [["045.02.024.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.13", "kg": "412", "name": "Küchenanschluss Spüle komplett", "einheit": "St",
     "lang": "Anschlusspunkte für Küchenspüle und Geschirrspüler mit Eckventilen, Geräteventil und Abwasseranschluss, "
             "Zuleitungen ab Strang sowie Armatur und Warmwasserbereitung nach Wahl.",
     "bezug": "Anzahl der Küchenanschlüsse",
     "fest": [["045.02.012.01001", 1]],
     "schichten": [
         {"name": "Wasserleitung", "optionen": [
             O("MSV 16, 8 m", "Kalt-/Warmwasser MSV 16, ca. 2 × 4 m", [[MSV[16], 8.0], [FS_TW["k"], 4]], True),
             O("MSV 16, 12 m", "Kalt-/Warmwasser MSV 16, ca. 2 × 6 m", [[MSV[16], 12.0], [FS_TW["k"], 6]], True)]},
         {"name": "Abwasser", "optionen": [
             O("HT DN 50, 4 m", "Abwasser HT DN 50, ca. 4 m", [[HT[50], 4.0], [FS_AW["k"], 3]], True),
             O("SG DN 50, 4 m", "Abwasser schallgedämmt DN 50, ca. 4 m", [[SG[50], 4.0], [FS_AW["k"], 3]], True)]},
         {"name": "Armatur", "optionen": [
             ohne("Armatur durch Küchenbauer"),
             O("Küchenarmatur", "Küchenarmatur Einhebel mit Brause", [["045.02.018.01001", 1]], True)]},
         {"name": "Warmwasser", "optionen": [
             ohne("Warmwasser zentral"),
             O("Kleinspeicher 5 l", "Kleinspeicher untertisch 5 l mit Steckdose", [["040.03.005.01001", 1], ["053.04.002.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.14", "kg": "412", "name": "Zapfstelle/Sonderobjekt komplett", "einheit": "St",
     "lang": "Einzelzapfstelle bzw. Sonderobjekt (Ausgussbecken, Außenzapfstelle, Waschmaschinenanschluss, Notdusche, "
             "Reihenwaschanlage) komplett mit Zuleitung und Abwasseranschluss.",
     "bezug": "Anzahl der Objekte",
     "schichten": [
         {"name": "Objekt", "optionen": [
             O("Ausguss", "Ausgussbecken Stahl mit Klapprost und Wandbatterie, Vorwandelement", [["045.02.011.01001", 1], ["045.01.003.02001", 1]], True),
             O("Außenzapfst.", "Außenzapfstelle frostsicher mit Rückflussverhinderer", [["045.02.013.01001", 1]], True),
             O("WM-Anschluss", "Waschmaschinenanschluss mit Geräteventil und Siphon", [["045.02.014.01001", 1]], True),
             O("Auslaufventil", "Auslaufventil mit Rohrbelüfter DN 15", [["042.02.013.01001", 1]]),
             O("Notdusche", "Augen- und Körpernotdusche DIN EN 15154", [["045.02.026.01001", 1]], True),
             O("Waschrinne 3 Pl.", "Reihenwaschanlage Edelstahl, 3 Plätze", [["045.02.025.01001", 1]]),
             O("Waschrinne 5 Pl.", "Reihenwaschanlage Edelstahl, 5 Plätze", [["045.02.025.02001", 1]])]},
         {"name": "Zuleitung", "optionen": [
             O("MSV 16, 5 m", "Zuleitung MSV 16, ca. 5 m", [[MSV[16], 5.0], [FS_TW["k"], 2], ["047.01.002.01001", 5.0]], True),
             O("MSV 20, 10 m", "Zuleitung MSV 20, ca. 10 m", [[MSV[20], 10.0], [FS_TW["k"], 3], ["047.01.002.01001", 10.0]], True),
             O("ES 18, 10 m", "Zuleitung Edelstahl 18 mm, ca. 10 m", [[EDS[18], 10.0], [FS_TW["k"], 3], ["047.01.002.01001", 10.0]])]},
         {"name": "Abwasser", "optionen": [
             ohne("ohne Abwasseranschluss", False),
             O("HT DN 50, 3 m", "Abwasser HT DN 50, ca. 3 m", [[HT[50], 3.0], [FS_AW["k"], 2]], True),
             O("HT DN 70, 3 m", "Abwasser HT DN 70, ca. 3 m", [[HT[70], 3.0], [FS_AW["k"], 2]], True)]},
     ], "tags": ["neubau", "altbau"]},
]

# Bad komplett (Wohnung): WC- und Waschtisch-Pakete
WC_PAKET = {
    "std": [["045.01.001.01001", 1], ["045.02.001.01001", 1], ["045.01.002.01001", 1]] + BEPLANK_WC,
    "geh": [["045.01.001.01001", 1], ["045.02.001.02001", 1], ["045.01.002.02001", 1]] + BEPLANK_WC,
    "dwc": [["045.01.001.01001", 1], ["045.02.001.03001", 1], ["045.01.002.02001", 1], ["053.04.002.01001", 1]] + BEPLANK_WC,
}
V += [
    {"id": "412.15", "kg": "412", "name": "Bad komplett (Sanitär) Wohnung", "einheit": "St",
     "lang": "Sanitärausstattung eines Wohnungsbades komplett: Wand-WC mit Vorwand, Waschplatz, Dusche und/oder Wanne mit "
             "Armaturen, alle Anschlussleitungen ab Strang und Silikonfugen. Fliesen und Abdichtung optional (sonst KG 345/352).",
     "bezug": "Anzahl der Bäder",
     "schichten": [
         {"name": "WC", "optionen": [
             O("WC Standard", "Wand-WC Standard mit Vorwand, Betätigung Kunststoff", WC_PAKET["std"], True),
             O("WC gehoben", "Wand-WC gehoben, Betätigung Edelstahl/Glas", WC_PAKET["geh"], True),
             O("Dusch-WC", "Dusch-WC mit Vorwand und Elektroanschluss", WC_PAKET["dwc"])]},
         {"name": "Waschplatz", "optionen": [
             O("WT 60", "Waschtisch 60 cm mit Vorwand, Spiegel", [["045.02.003.02001", 1], ["045.01.001.02001", 1], ["045.02.022.01001", 1]] + BEPLANK_WT, True),
             O("WT 80 + US", "Waschtisch 80 cm, Unterschrank, LED-Spiegel", [["045.02.003.03001", 1], ["045.01.001.02001", 1], ["045.02.005.02001", 1], ["045.02.022.02001", 1]] + BEPLANK_WT, True),
             O("Doppel-WT 120", "Doppelwaschtisch 120 cm, Spiegelschrank", [["045.02.003.04001", 1], ["045.01.001.02001", 1], ["045.02.022.03001", 1]] + BEPLANK_WT, True)]},
         {"name": "Dusche/Wanne", "optionen": [
             O("Dusche bodengl.", "Dusche bodengleich mit Rinne, UP-Thermostat, Walk-in",
               [["044.02.002.01001", 1], ["024.01.009.01001", 1], ["045.02.006.01001", 1], ["045.02.008.01001", 1]], True),
             O("Duschwanne 90", "Duschwanne 90 × 90 mit Thermostat und Abtrennung Eck",
               [["045.02.007.01001", 1], ["045.02.016.01001", 1], ["045.02.008.02001", 1]]),
             O("Wanne 170", "Badewanne 170 × 75 mit Armatur und Schürze", [["045.02.009.01001", 1], ["045.02.020.01001", 1]], True),
             O("Wanne + Dusche", "Badewanne 180 × 80 und bodengleiche Dusche mit Walk-in",
               [["045.02.009.02001", 1], ["045.02.020.02001", 1], ["044.02.002.01001", 1], ["024.01.009.01001", 1], ["045.02.006.01001", 1], ["045.02.008.01001", 1]], True)]},
         {"name": "Installation", "optionen": [
             O("Reiheninst.", "Anschlussleitungen Reiheninstallation, Silikonfugen",
               [[MSV[16], 14.0], [FS_TW["k"], 10], [HT[110], 2.0], [HT[50], 6.0], [FS_AW["m"], 3], [FS_AW["k"], 5], ["045.02.027.01001", 3], ["050.04.003.01001", 1]], True),
             O("Ringinst.", "Ringinstallation (Hygiene) mit Wandscheiben, Silikonfugen",
               [["042.01.009.01001", 5], [MSV[16], 8.0], [HT[110], 2.0], [HT[50], 6.0], [FS_AW["m"], 3], [FS_AW["k"], 5], ["045.02.027.01001", 3], ["050.04.003.01001", 1]], True)]},
         {"name": "Fliesen", "optionen": [
             ohne("ohne (Fliesen und Abdichtung in KG 345/352)"),
             O("Fliesen Std. 6 m²", "Abdichtung, Wandfliesen 20 m² und Bodenfliesen 6 m² Standard",
               [["024.01.002.01001", 8.0], ["024.01.002.02001", 6.0], ["024.02.003.02001", 20.0], ["024.03.001.02001", 6.0], ["024.01.003.01001", 12.0]]),
             O("Fliesen geh. 8 m²", "Abdichtung, Wandfliesen 26 m² 60 × 120, Boden 8 m² 60 × 60",
               [["024.01.002.01001", 10.0], ["024.01.002.02001", 8.0], ["024.02.003.04001", 26.0], ["024.03.001.04001", 8.0], ["024.01.003.01001", 14.0]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.16", "kg": "412", "name": "Gäste-WC komplett (Sanitär)", "einheit": "St",
     "lang": "Sanitärausstattung eines Gäste-WCs: Wand-WC mit Vorwand, Handwaschbecken mit Armatur, Anschlüsse ab Strang, "
             "Spiegel und Accessoires nach Wahl.",
     "bezug": "Anzahl der Gäste-WCs",
     "fest": ANS_WC + [[MSV[16], 4.0], [FS_TW["k"], 2], [HT[50], 2.0], [FS_AW["k"], 2], ["045.02.027.01001", 2]],
     "schichten": [
         {"name": "WC", "optionen": [
             O("WC Standard", "Wand-WC Standard mit Vorwand", WC_PAKET["std"], True),
             O("WC gehoben", "Wand-WC gehoben mit Vorwand", WC_PAKET["geh"], True),
             O("WC niedrig VE", "Wand-WC Standard, Vorwand 820 mm unter Fenster",
               [["045.01.001.05001", 1], ["045.02.001.01001", 1], ["045.01.002.01001", 1], ["039.03.002.01001", 1.0]], True)]},
         {"name": "Handwaschbecken", "optionen": [
             O("HWB 45", "Handwaschbecken 45 cm mit Armatur, Vorwand", [["045.02.003.01001", 1], ["045.01.001.02001", 1]] + BEPLANK_WT, True),
             O("WT 60", "Waschtisch 60 cm mit Armatur, Vorwand", [["045.02.003.02001", 1], ["045.01.001.02001", 1]] + BEPLANK_WT, True)]},
         {"name": "Ausstattung", "optionen": [
             O("Spiegel", "Kristallspiegel 60 cm", [["045.02.022.01001", 1]], True),
             O("Spiegel + Acc.", "Spiegel und Accessoires (Papierhalter, Bürste, Haken)", [["045.02.022.01001", 1], ["045.03.005.01001", 1]], True),
             ohne("ohne", False)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.17", "kg": "412", "name": "Bad barrierefrei komplett (Sanitär)", "einheit": "St",
     "lang": "Sanitärausstattung eines barrierefreien Bades nach DIN 18040-2: Ausstattungspaket (unterfahrbarer Waschtisch, "
             "WC mit Stützklappgriffen, Dusche mit Sitz und Griffen, Kippspiegel), Vorwandelemente, bodengleiche Entwässerung und Anschlüsse.",
     "bezug": "Anzahl der Bäder",
     "fest": [["045.03.009.01001", 1], ["045.01.001.04001", 1], ["045.01.001.02001", 1], ["045.02.006.01001", 1]] + ANS_WC + ANS_WT + ANS_DU
             + [["039.03.002.01001", 2.2], ["045.02.027.01001", 3], ["050.04.003.01001", 1]],
     "schichten": [
         {"name": "Entwässerung", "optionen": [
             O("Rinne 1000", "Duschrinne 1000 mm, Gefälle im Fliesenbelag", [["044.02.002.02001", 1], ["024.03.005.01001", 1]], True),
             O("Rinne 1200", "Duschrinne 1200 mm auf Gefälleelement 120 × 120", [["044.02.002.03001", 1], ["024.01.009.02001", 1]], True)]},
         {"name": "Abtrennung", "optionen": [
             ohne("Duschvorhang (bauseits)"),
             O("Walk-in", "Duschabtrennung Walk-in ESG", [["045.02.008.01001", 1]], True)]},
         {"name": "Notruf", "optionen": [
             ohne("ohne Notruf"),
             O("Notruf", "Notrufanlage mit Zugtaster und Abstelltaster", [["063.02.007.01001", 1], [JY2, 20.0]], True)]},
         {"name": "Accessoires", "optionen": [
             O("Accessoires", "Papierhalter, Bürste, Haken", [["045.03.005.01001", 1]], True),
             O("Acc. + Griffe", "Accessoires und 2 zusätzliche Haltegriffe 60 cm", [["045.03.005.01001", 1], ["045.03.002.02001", 2]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.18", "kg": "412", "name": "Druckerhöhungsanlage komplett", "einheit": "St",
     "lang": "Trinkwasser-Druckerhöhungsanlage nach DIN 1988-500 mit Trennstation bzw. Systemtrenner und Filter, "
             "einschließlich Absperrungen und Inbetriebnahme.",
     "bezug": "Anzahl der Anlagen",
     "schichten": [
         {"name": "DEA", "optionen": [
             O("DEA 2 P 4 m³/h", "DEA 2 Pumpen bis 4 m³/h", [["046.01.001.01001", 1]], True),
             O("DEA 2 P 10 m³/h", "DEA 2 Pumpen bis 10 m³/h", [["046.01.001.02001", 1]], True),
             O("DEA 3 P 16 m³/h", "DEA 3 Pumpen bis 16 m³/h", [["046.01.001.03001", 1]], True),
             O("DEA 3 P 30 m³/h", "DEA 3 Pumpen bis 30 m³/h", [["046.01.001.04001", 1]])]},
         {"name": "Trennung", "optionen": [
             O("Systemtr. BA 25", "Trennstation/Systemtrenner BA DN 25", [["046.02.005.01001", 1]], True),
             O("Systemtr. BA 50", "Trennstation/Systemtrenner BA DN 50", [["046.02.005.02001", 1]], True),
             O("Freier Ausl. AB", "Trennstation Typ AB (freier Auslauf) DN 32", [["046.02.005.03001", 1]])]},
         {"name": "Filter/Armaturen", "optionen": [
             O("Filter DN 32", "Rückspülfilter automatisch DN 32, 2 Absperrventile DN 32", [["046.02.004.01001", 1], ["042.03.001.04001", 2]], True),
             O("Filter DN 50", "Rückspülfilter automatisch DN 50, 2 Absperrventile DN 50", [["046.02.004.02001", 1], ["042.03.001.05001", 2]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.19", "kg": "412", "name": "Wasseraufbereitung komplett", "einheit": "St",
     "lang": "Trinkwasseraufbereitung mit Enthärtung, Filter und Dosierung bzw. UV-Desinfektion nach Wahl, "
             "einschließlich Einbindung in die Hausinstallation.",
     "bezug": "Anzahl der Anlagen",
     "schichten": [
         {"name": "Enthärtung", "optionen": [
             O("Enth. EFH", "Enthärtungsanlage Ionentauscher Einfamilienhaus", [["042.02.004.01001", 1]], True),
             O("Enth. 1,5 m³/h", "Enthärtungsanlage Doppelsäule bis 1,5 m³/h", [["046.02.001.01001", 1]], True),
             O("Enth. 3 m³/h", "Enthärtungsanlage Doppelsäule bis 3 m³/h", [["046.02.001.02001", 1]], True),
             O("Enth. 6 m³/h", "Enthärtungsanlage Doppelsäule bis 6 m³/h", [["046.02.001.03001", 1]])]},
         {"name": "Filter", "optionen": [
             ohne("Filter in Hauswasserstation vorhanden"),
             O("Rückspülf. 32", "Rückspülfilter automatisch DN 32", [["046.02.004.01001", 1]], True)]},
         {"name": "Dosierung/UV", "optionen": [
             ohne("ohne"),
             O("Dosierung DN 25", "Mineralstoff-Dosieranlage DN 25", [["046.02.002.01001", 1]], True),
             O("UV 2 m³/h", "UV-Desinfektionsanlage bis 2 m³/h", [["046.02.003.01001", 1]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.20", "kg": "412", "name": "Wohnungsanschluss Trinkwasser", "einheit": "St",
     "lang": "Trinkwasser-Wohnungsanschluss am Strang: Stockwerksabsperrungen, Wohnungswasserzähler mit Funkablesung, "
             "Strangregulierung der Zirkulation und Leckageschutz nach Wahl.",
     "bezug": "Anzahl der Wohnungen",
     "schichten": [
         {"name": "Absperrung", "optionen": [
             O("UP-Absp. DN 20", "2 Unterputz-Absperrventile DN 20 (kalt/warm)", [["042.03.002.01001", 2]], True),
             O("UP-Absp. DN 25", "2 Unterputz-Absperrventile DN 25 (kalt/warm)", [["042.03.002.02001", 2]], True)]},
         {"name": "Zähler", "optionen": [
             O("WZ kalt + warm", "2 Wohnungswasserzähler Funk (kalt/warm)", [["042.02.003.01001", 2]], True),
             O("WZ kalt", "1 Wohnungswasserzähler Funk (kalt)", [["042.02.003.01001", 1]], True)]},
         {"name": "Zirkulation", "optionen": [
             O("Zirk.-Reg. DN 15", "Thermostatisches Zirkulationsregulierventil DN 15", [["042.03.003.01001", 1]], True),
             ohne("ohne Zirkulation", False)]},
         {"name": "Leckageschutz", "optionen": [
             ohne("ohne"),
             O("Leckageschutz", "Leckageschutz mit Absperrventil und Sensoren", [["042.02.006.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "412.21", "kg": "412", "name": "Sanitärobjekt erneuern (Bestand)", "einheit": "St",
     "lang": "Vorhandenes Sanitärobjekt demontieren und entsorgen, neues Objekt im Bestand montieren und an vorhandene "
             "Leitungen anschließen, einschließlich Silikonfuge.",
     "bezug": "Anzahl der Objekte",
     "fest": [["045.03.006.01001", 1], ["045.02.027.01001", 1]],
     "schichten": [
         {"name": "Neues Objekt", "optionen": [
             O("WC Standard", "Wand-WC Standard auf neuem Vorwandelement, Betätigung",
               [[sfx("045.02.001.01001", 2), 1], [sfx("045.01.001.01001", 2), 1], ["045.01.002.01001", 1]], True),
             O("WT 60", "Waschtisch 60 cm mit Armatur", [[sfx("045.02.003.02001", 2), 1]], True),
             O("HWB 45", "Handwaschbecken 45 cm mit Armatur", [[sfx("045.02.003.01001", 2), 1]]),
             O("Wanne 170", "Badewanne 170 × 75 mit Armaturen", [[sfx("045.02.009.01001", 2), 1]], True),
             O("Dusche bodengl.", "Dusche bodengleich, Armaturen (Rinne gesondert)", [[sfx("045.02.006.01001", 2), 1]], True),
             O("nur Armatur", "Armatur tauschen (Waschtisch/Spüle/Dusche)", [["045.03.008.01001", 1]])]},
         {"name": "Anschluss", "optionen": [
             O("vorhanden", "Anschluss an vorhandene Leitungen", [[FS_TW["k"], 2]], True),
             O("anpassen", "Anschlüsse anpassen: MSV 16 ca. 3 m, Wandscheiben, HT DN 50 ca. 1 m",
               [[sfx(MSV[16], 3), 3.0], [WANDSCHEIBE, 2], [sfx(HT[50], 3), 1.0], [FS_AW["k"], 2]], True)]},
     ], "tags": ["altbau"]},
]

# ================================================================================================ 413 Gas
V += [
    {"id": "413.01", "kg": "413", "name": "Gasinstallation Gebäude komplett", "einheit": "St",
     "lang": "Gasinstallation nach DVGW-TRGI ab Hauptabsperreinrichtung bis zum Gasgerät: Gasdruckregelgerät, "
             "Zähleranschluss, Leitungen, Gasströmungswächter und Dichtheits-/Gebrauchsfähigkeitsprüfung.",
     "bezug": "Anzahl der Gasanlagen (je Gebäude bzw. Nutzungseinheit)",
     "fest": [["042.02.008.01001", 1], ["042.03.007.01001", 1]],
     "schichten": [
         {"name": "Leitung", "optionen": [
             O("DN 20, 10 m", "Gasleitung DN 20, ca. 10 m", [["042.01.003.01001", 10.0], ["046.04.003.01001", 1]], True),
             O("DN 20, 20 m", "Gasleitung DN 20, ca. 20 m", [["042.01.003.01001", 20.0], ["046.04.003.01001", 1]], True),
             O("DN 25, 15 m", "Gasleitung DN 25, ca. 15 m", [["042.01.003.02001", 15.0], ["046.04.003.01001", 1]], True),
             O("DN 32, 40 m", "Gasleitung DN 32, ca. 40 m", [["042.01.003.03001", 40.0], ["046.04.003.02001", 1]])]},
         {"name": "Druckregelung", "optionen": [
             O("GDR 6 m³/h", "Gasdruckregelgerät mit SAV bis 6 m³/h", [["042.02.007.01001", 1]], True),
             O("GDR 25 m³/h", "Gasdruckregelgerät mit SAV bis 25 m³/h", [["042.02.007.02001", 1]], True),
             ohne("Druckregelung durch Netzbetreiber", False)]},
         {"name": "Bestand", "optionen": [
             ohne("Neuanlage"),
             O("Altltg. stilll.", "Bestehende Gasleitung stilllegen und prüfen", [["042.02.009.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "413.02", "kg": "413", "name": "Gasleitung", "einheit": "m",
     "lang": "Gasleitung Stahl/Edelstahl mit Pressverbindung in Vorwand bzw. Schacht, einschließlich Befestigung, "
             "Korrosionsschutzanstrich und Abschottung nach Wahl.",
     "bezug": "Leitungslänge in der Achse",
     "schichten": [
         {"name": "Rohr", "optionen": [
             O("Gas DN 20", "Gasleitung DN 20", [["042.01.003.01001", 1.0]], True),
             O("Gas DN 25", "Gasleitung DN 25", [["042.01.003.02001", 1.0]], True),
             O("Gas DN 32", "Gasleitung DN 32", [["042.01.003.03001", 1.0]], True)]},
         {"name": "Anstrich", "optionen": [
             ohne("ohne Anstrich (Edelstahl)"),
             O("Lackierung", "Grundierung und Kunstharzlack gelb", [["034.03.002.05001", 1.0]], True)]},
         {"name": "Brandschutz", "optionen": [
             ohne("ohne Abschottung"),
             O("Abschottung", "Rohrabschottung je Decke/Wand (0,36 St/m)", [["047.02.002.01001", 0.36]], True)]},
     ], "tags": ["neubau", "altbau"]},
]

# ================================================================================================ 421 Wärmeerzeugung
WP_SPEICHER = [
    O("P 100 + TWS 300", "Pufferspeicher 100 l, Trinkwasserspeicher 300 l", [["040.03.001.01001", 1], ["040.03.002.02001", 1]], True),
    O("P 300 + TWS 300", "Pufferspeicher 300 l, Trinkwasserspeicher 300 l", [["040.03.001.02001", 1], ["040.03.002.02001", 1]], True),
    O("Hygiene 500", "Kombispeicher (Hygienespeicher) 500 l", [["040.03.006.01001", 1]]),
    O("nur Puffer 100", "Pufferspeicher 100 l (Warmwasser dezentral)", [["040.03.001.01001", 1]]),
]
WP_FEST = [["040.04.003.02001", 1], ["040.04.004.01001", 300], ["040.04.005.01001", 1], ["040.05.003.01001", 1],
           ["040.05.007.01001", 1], ["044.03.004.01001", 1]]
V += [
    {"id": "421.01", "kg": "421", "name": "Luft-Wasser-Wärmepumpe Monoblock", "einheit": "St",
     "lang": "Luft-Wasser-Wärmepumpe Monoblock zur Außenaufstellung komplett mit Hydraulikmodul, Speicher, "
             "Ausdehnungsgefäß, Schlammabscheider, Füllwasseraufbereitung, Kondensatableitung, Elektroanschluss mit EVU-Sperre und Inbetriebnahme.",
     "bezug": "Anzahl der Wärmeerzeuger",
     "fest": [["040.01.009.01001", 1], ["053.09.001.01001", 1], ["053.04.005.04001", 1], ["040.01.012.01001", 1]] + WP_FEST,
     "schichten": [
         {"name": "Wärmepumpe", "optionen": [
             O("LWWP 5 kW", "Monoblock 5 kW (A2/W35)", [["040.01.001.01001", 1]]),
             O("LWWP 8 kW", "Monoblock 8 kW (A2/W35)", [["040.01.001.02001", 1]], True),
             O("LWWP 10 kW", "Monoblock 10 kW (A2/W35)", [["040.01.001.03001", 1]], True),
             O("LWWP 12 kW", "Monoblock 12 kW (A2/W35)", [["040.01.001.04001", 1]], True),
             O("LWWP 16 kW", "Monoblock 16 kW (A2/W35)", [["040.01.001.05001", 1]], True),
             O("LWWP 25 kW", "Monoblock 25 kW (A2/W35)", [["040.01.001.06001", 1]]),
             O("LWWP 40 kW", "Monoblock 40 kW (A2/W35)", [["040.01.001.07001", 1]])]},
         {"name": "Aufstellung", "optionen": [
             O("Streifenfund.", "Streifenfundamente Beton", [["040.01.006.01001", 1]], True),
             O("Bodenkonsole", "Bodenkonsole auf Rasengittersteinen", [["040.01.006.02001", 1]], True),
             O("Wandkonsole", "Wandkonsole schwingungsgedämpft", [["040.01.007.01001", 1]]),
             O("Fund. + Schallsch.", "Streifenfundamente und Schallschutzhaube", [["040.01.006.01001", 1], ["040.01.008.01001", 1]])]},
         {"name": "Speicher", "optionen": WP_SPEICHER},
         {"name": "Energiemanagement", "optionen": [
             ohne("ohne"),
             O("SG-Ready/PV", "Energiemanager/SG-Ready-Anbindung an PV", [["040.01.011.01001", 1]], True)]},
     ], "tags": ["neubau"]},

    {"id": "421.02", "kg": "421", "name": "Luft-Wasser-Wärmepumpe Split", "einheit": "St",
     "lang": "Luft-Wasser-Wärmepumpe in Split-Bauweise mit Innen- und Außeneinheit, Kältemittelleitung, Speicher, "
             "Sicherheitstechnik, Elektroanschluss und Inbetriebnahme.",
     "bezug": "Anzahl der Wärmeerzeuger",
     "fest": [["075.03.007.02001", 8.0], ["078.03.013.01001", 1], ["040.01.012.01001", 1], ["053.09.001.01001", 1],
              ["053.04.005.04001", 1]] + WP_FEST,
     "schichten": [
         {"name": "Wärmepumpe", "optionen": [
             O("Split 6 kW", "Split-Wärmepumpe 6 kW", [["040.01.002.01001", 1]], True),
             O("Split 9 kW", "Split-Wärmepumpe 9 kW", [["040.01.002.02001", 1]], True),
             O("Split 12 kW", "Split-Wärmepumpe 12 kW", [["040.01.002.03001", 1]], True)]},
         {"name": "Aufstellung", "optionen": [
             O("Bodenkonsole", "Bodenkonsole auf Rasengittersteinen", [["040.01.006.02001", 1]], True),
             O("Wandkonsole", "Wandkonsole schwingungsgedämpft", [["040.01.007.01001", 1]], True),
             O("Streifenfund.", "Streifenfundamente Beton", [["040.01.006.01001", 1]])]},
         {"name": "Speicher", "optionen": WP_SPEICHER},
     ], "tags": ["neubau", "altbau"]},

    {"id": "421.03", "kg": "421", "name": "Sole-Wasser-Wärmepumpe mit Erdsonden", "einheit": "St",
     "lang": "Sole-Wasser-Wärmepumpe zur Innenaufstellung mit Erdwärmesonden (Doppel-U), Solekreisverteiler, Speicher, "
             "Sicherheitstechnik, Elektroanschluss und Inbetriebnahme; Bohrtiefe nach Heizleistung.",
     "bezug": "Anzahl der Wärmeerzeuger",
     "fest": [["053.09.001.01001", 1]] + WP_FEST,
     "schichten": [
         {"name": "WP + Sonden", "optionen": [
             O("SWWP 6 + 100 m", "Sole-WP 6 kW, 2 Sonden à 50 m", [["040.01.003.01001", 1], ["040.01.004.01001", 100.0], ["040.01.005.01001", 1]], True),
             O("SWWP 10 + 160 m", "Sole-WP 10 kW, 2 Sonden à 80 m", [["040.01.003.02001", 1], ["040.01.004.01001", 160.0], ["040.01.005.01001", 1]], True),
             O("SWWP 16 + 260 m", "Sole-WP 16 kW, 4 Sonden à 65 m", [["040.01.003.03001", 1], ["040.01.004.01001", 260.0], ["040.01.005.02001", 1]], True)]},
         {"name": "Speicher", "optionen": WP_SPEICHER},
         {"name": "Energiemanagement", "optionen": [
             ohne("ohne"),
             O("SG-Ready/PV", "Energiemanager/SG-Ready-Anbindung an PV", [["040.01.011.01001", 1]], True)]},
     ], "tags": ["neubau"]},

    {"id": "421.04", "kg": "421", "name": "Gas-Brennwerttherme komplett", "einheit": "St",
     "lang": "Wandhängende Gas-Brennwerttherme bzw. Kombitherme mit Abgasanlage, Neutralisation, Ausdehnungsgefäß, "
             "Füllwasseraufbereitung, Elektroanschluss und Inbetriebnahme; Trinkwasserspeicher und Rückbau Altanlage nach Wahl.",
     "bezug": "Anzahl der Wärmeerzeuger",
     "fest": [["044.02.010.01001", 1], ["040.04.003.01001", 1], ["040.04.004.01001", 150], ["040.04.005.01001", 1],
              ["053.04.005.05001", 1], ["040.05.003.01001", 1], ["040.05.007.01001", 1]],
     "schichten": [
         {"name": "Therme", "optionen": [
             O("GBW 15 kW", "Gas-Brennwerttherme 15 kW", [["040.02.001.01001", 1]], True),
             O("GBW 25 kW", "Gas-Brennwerttherme 25 kW", [["040.02.001.02001", 1]], True),
             O("GBW 35 kW", "Gas-Brennwerttherme 35 kW", [["040.02.001.03001", 1]]),
             O("Kombi 25 kW", "Kombitherme 25 kW mit Warmwasser", [["040.02.011.01001", 1]], True),
             O("Kombi 30 kW", "Kombitherme 30 kW mit Warmwasser", [["040.02.011.02001", 1]])]},
         {"name": "Abgas", "optionen": [
             O("Abgas Kunstst. 80", "Abgassystem Kunststoff DN 80 im Schacht, ca. 10 m", [["040.02.003.01001", 10.0]], True),
             O("Abgas Edelst. 130", "Edelstahl-Abgasleitung DN 130 in Bestandsschornstein, ca. 10 m", [["040.02.007.01001", 10.0]], True),
             O("Schornst. außen", "Doppelwandiger Edelstahlschornstein außen DN 150, ca. 8 m", [["040.02.008.01001", 8.0]])]},
         {"name": "Warmwasser", "optionen": [
             ohne("über Kombitherme bzw. dezentral"),
             O("Speicher 200 l", "Trinkwasserspeicher 200 l mit Ladepumpe", [["040.03.002.01001", 1], ["041.02.005.01001", 1]], True)]},
         {"name": "Rückbau", "optionen": [
             ohne("Neubau, ohne Rückbau"),
             O("Altkessel", "Alten Heizkessel demontieren und entsorgen", [["040.05.004.01001", 1]], True),
             O("Altkessel + Tank", "Altkessel und Öltank bis 5.000 l entsorgen", [["040.05.004.01001", 1], ["040.05.005.01001", 1]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "421.05", "kg": "421", "name": "Gas-Brennwertkessel Heizzentrale", "einheit": "St",
     "lang": "Bodenstehender Gas-Brennwertkessel bzw. Kaskade für Mehrfamilienhaus/Gewerbe mit Abgasanlage, "
             "Neutralisation, Druckhaltung, Verteiler mit Heizkreisen, Regelung und Inbetriebnahme.",
     "bezug": "Anzahl der Heizzentralen",
     "fest": [["044.02.010.02001", 1], ["040.04.005.02001", 1], ["040.02.009.01001", 1], ["040.05.003.01001", 1]],
     "schichten": [
         {"name": "Kessel", "optionen": [
             O("Kessel 50 kW", "Gas-Brennwertkessel 50 kW", [["040.02.002.01001", 1], ["040.04.003.03001", 1]], True),
             O("Kessel 100 kW", "Gas-Brennwertkessel 100 kW", [["040.02.002.02001", 1], ["040.04.003.04001", 1]], True),
             O("Kessel 200 kW", "Gas-Brennwertkessel 200 kW mit Druckhaltestation", [["040.02.002.03001", 1], ["040.04.008.01001", 1]], True),
             O("Kaskade 2×100", "Kaskade 2 × 100 kW mit Hydraulikset und Druckhaltestation",
               [["040.02.002.02001", 2], ["040.02.010.01001", 1], ["040.04.008.01001", 1]])]},
         {"name": "Abgas", "optionen": [
             O("Abgas DN 110", "Abgassystem Kunststoff DN 110 im Schacht, ca. 15 m", [["040.02.003.02001", 15.0]], True),
             O("Abgas DN 160", "Abgassystem Kunststoff DN 160 im Schacht, ca. 15 m", [["040.02.003.03001", 15.0]], True)]},
         {"name": "Verteilung", "optionen": [
             O("2 HK gemischt", "Verteiler mit hydr. Weiche, 2 gemischte Heizkreise, Regelung 2 HK",
               [["040.04.002.01001", 1], ["040.04.001.03001", 2], ["040.04.009.02001", 1]], True),
             O("3 HK gemischt", "Verteiler mit hydr. Weiche, 3 gemischte Heizkreise, Regelung 3 HK",
               [["040.04.002.02001", 1], ["040.04.001.03001", 3], ["040.04.009.03001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "421.06", "kg": "421", "name": "Pelletkessel komplett", "einheit": "St",
     "lang": "Pelletkessel mit Saugaustragung, Pufferspeicher, Abgasanlage, Trinkwassererwärmung, Sicherheitstechnik, "
             "Elektroanschluss und Inbetriebnahme; Pelletlager baulich gesondert.",
     "bezug": "Anzahl der Wärmeerzeuger",
     "fest": [["040.04.003.02001", 1], ["040.04.004.01001", 300], ["053.04.005.05001", 1], ["040.05.003.01001", 1], ["040.05.007.01001", 1]],
     "schichten": [
         {"name": "Kessel", "optionen": [
             O("Pellet 15 kW", "Pelletkessel 15 kW mit Saugaustragung", [["040.02.005.01001", 1]], True),
             O("Pellet 25 kW", "Pelletkessel 25 kW mit Saugaustragung", [["040.02.005.02001", 1]], True)]},
         {"name": "Abgas", "optionen": [
             O("Edelst. Sanier.", "Edelstahl-Abgasleitung DN 130 im Bestandsschornstein, ca. 10 m", [["040.02.007.01001", 10.0]], True),
             O("Schornst. außen", "Doppelwandiger Edelstahlschornstein DN 150, ca. 8 m", [["040.02.008.01001", 8.0]], True),
             O("Schornst. System", "Schornstein-/Abgassystem einzügig Ø 160, ca. 8 m, mit Kopf", [["012.04.008.01001", 8.0], ["012.04.009.01001", 1]], True)]},
         {"name": "Puffer", "optionen": [
             O("Puffer 800 l", "Pufferspeicher 800 l", [["040.03.001.04001", 1]], True),
             O("Puffer 1000 l", "Pufferspeicher 1000 l", [["040.03.001.05001", 1]], True)]},
         {"name": "Warmwasser", "optionen": [
             O("FWS 25", "Frischwasserstation 25 l/min", [["040.03.003.01001", 1]], True),
             O("Speicher 300 l", "Trinkwasserspeicher 300 l", [["040.03.002.02001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "421.07", "kg": "421", "name": "Fernwärme-Übergabestation komplett", "einheit": "St",
     "lang": "Kompakte Fernwärme-Übergabestation mit Regelung, Wärmemengenzähler, Trinkwassererwärmung und Anschlussleitung "
             "nach Wahl, einschließlich Inbetriebnahme.",
     "bezug": "Anzahl der Hausstationen",
     "fest": [["040.05.003.01001", 1], ["041.01.011.02001", 1]],
     "schichten": [
         {"name": "Station", "optionen": [
             O("FW 15 kW", "Übergabestation kompakt 15 kW", [["040.02.004.01001", 1], ["040.04.006.01001", 1]], True),
             O("FW 50 kW", "Übergabestation kompakt 50 kW", [["040.02.004.02001", 1], ["040.04.006.02001", 1]], True),
             O("FW 150 kW", "Übergabestation kompakt 150 kW", [["040.02.004.03001", 1], ["040.04.006.02001", 1]], True)]},
         {"name": "Warmwasser", "optionen": [
             O("Speicher 300 l", "Trinkwasserspeicher 300 l", [["040.03.002.02001", 1]], True),
             O("Speicher 500 l", "Trinkwasserspeicher 500 l", [["040.03.002.03001", 1]]),
             O("FWS 40 + P 500", "Frischwasserstation 40 l/min mit Puffer 500 l", [["040.03.003.02001", 1], ["040.03.001.03001", 1]], True)]},
         {"name": "Anschlussleitung", "optionen": [
             ohne("Hausanschluss durch Versorger"),
             O("Duo 32, 15 m", "Nahwärmeleitung Duo 2 × 32 mm, ca. 15 m", [["041.01.005.02001", 15.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "421.08", "kg": "421", "name": "Solarthermieanlage komplett", "einheit": "St",
     "lang": "Thermische Solaranlage mit Flachkollektoren Aufdach, Solarleitungen, Pumpengruppe mit Regelung, "
             "Ausdehnungsgefäß und Speicher; Einbindung in die Heizungsanlage.",
     "bezug": "Anzahl der Anlagen",
     "fest": [["040.04.001.01001", 1], ["040.04.009.01001", 1], ["040.04.003.01001", 1], ["040.05.003.01001", 1]],
     "schichten": [
         {"name": "Kollektoren", "optionen": [
             O("Koll. 6 m²", "Flachkollektoren Aufdach 6 m² (Warmwasser)", [["040.02.006.01001", 6.0]], True),
             O("Koll. 10 m²", "Flachkollektoren Aufdach 10 m² (WW + Heizung)", [["040.02.006.01001", 10.0]], True),
             O("Koll. 15 m²", "Flachkollektoren Aufdach 15 m² (WW + Heizung)", [["040.02.006.01001", 15.0]], True)]},
         {"name": "Speicher", "optionen": [
             O("Speicher 300 l", "Trinkwasserspeicher 300 l (bivalent)", [["040.03.002.02001", 1]], True),
             O("Hygiene 800 l", "Kombispeicher (Hygienespeicher) 800 l", [["040.03.006.02001", 1]], True)]},
         {"name": "Solarleitung", "optionen": [
             O("Cu 15, 20 m", "Kupferrohr 15 mm gedämmt, ca. 20 m", [["041.01.004.01001", 20.0], ["047.01.001.01001", 20.0]], True),
             O("Cu 22, 30 m", "Kupferrohr 22 mm gedämmt, ca. 30 m", [["041.01.004.02001", 30.0], ["047.01.001.02001", 30.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "421.09", "kg": "421", "name": "Heizungstausch auf Wärmepumpe (Bestand)", "einheit": "St",
     "lang": "Austausch des fossilen Wärmeerzeugers gegen eine Luft-Wasser-Wärmepumpe im Bestand: Rückbau Altanlage, "
             "Wärmepumpe mit Hydraulikmodul und Speicher, raumweise Heizlastberechnung, hydraulischer Abgleich, Elektroanschluss und Inbetriebnahme.",
     "bezug": "Anzahl der Wärmeerzeuger",
     "fest": [[sfx("040.01.009.01001", 2), 1], [sfx("053.04.005.04001", 2), 1], ["053.09.001.01001", 1], ["040.01.006.01001", 1],
              ["041.01.014.01001", 1], ["040.01.012.01001", 1]] + WP_FEST,
     "schichten": [
         {"name": "Rückbau", "optionen": [
             O("Gaskessel", "Gaskessel demontieren und entsorgen, Gasleitung stilllegen", [["040.05.004.01001", 1], ["042.02.009.01001", 1]], True),
             O("Ölkessel + Tank", "Ölkessel und Öltank bis 5.000 l entsorgen", [["040.05.004.01001", 1], ["040.05.005.01001", 1]], True),
             O("Ölk. + Tank 10 m³", "Ölkessel und Öltank bis 10.000 l entsorgen", [["040.05.004.01001", 1], ["040.05.005.02001", 1]])]},
         {"name": "Wärmepumpe", "optionen": [
             O("LWWP 8 kW", "Monoblock 8 kW im Bestand", [[sfx("040.01.001.02001", 3), 1]], True),
             O("LWWP 10 kW", "Monoblock 10 kW im Bestand", [[sfx("040.01.001.03001", 3), 1]], True),
             O("LWWP 12 kW", "Monoblock 12 kW im Bestand", [[sfx("040.01.001.04001", 3), 1]], True),
             O("LWWP 16 kW", "Monoblock 16 kW im Bestand", [[sfx("040.01.001.05001", 3), 1]])]},
         {"name": "Speicher", "optionen": [
             O("P 300 + TWS 300", "Pufferspeicher 300 l, Trinkwasserspeicher 300 l im Bestand",
               [[sfx("040.03.001.02001", 3), 1], [sfx("040.03.002.02001", 3), 1]], True),
             O("Hygiene 500", "Kombispeicher (Hygienespeicher) 500 l", [["040.03.006.01001", 1]], True)]},
         {"name": "Abgleich", "optionen": [
             O("EFH 10 HK", "Heizlast 8 Räume, hydraulischer Abgleich 10 Heizflächen", [["040.05.002.01001", 8], ["040.05.001.01001", 10]], True),
             O("ZFH 18 HK", "Heizlast 15 Räume, hydraulischer Abgleich 18 Heizflächen", [["040.05.002.01001", 15], ["040.05.001.01001", 18]], True)]},
     ], "tags": ["altbau"]},
]

# ================================================================================================ 422 Wärmeverteilnetze
V += [
    {"id": "422.01", "kg": "422", "name": "Heizungsleitung Wohnbau", "einheit": "m",
     "lang": "Heizungsverteil- bzw. Steigleitung (Vor- oder Rücklauf) in Vorwand oder Schacht, einschließlich anteiliger "
             "Formstücke und Befestigung, Dämmung nach GEG und Abschottung nach Wahl.",
     "bezug": "Leitungslänge je Rohr (Vor- und Rücklauf getrennt)",
     "schichten": [
         {"name": "Rohr", "optionen": [
             O("MSV 16", "Mehrschichtverbund 16 mm", [[HZ_MSV[16], 1.0], [FS_HZ["k"], 0.4]], True),
             O("MSV 20", "Mehrschichtverbund 20 mm", [[HZ_MSV[20], 1.0], [FS_HZ["k"], 0.4]], True),
             O("MSV 26", "Mehrschichtverbund 26 mm", [[HZ_MSV[26], 1.0], [FS_HZ["m"], 0.4]], True),
             O("MSV 32", "Mehrschichtverbund 32 mm", [[HZ_MSV[32], 1.0], [FS_HZ["m"], 0.4]]),
             O("C-Stahl 15", "C-Stahl verzinkt 15 mm", [[HZ_CS[15], 1.0], [FS_HZ["k"], 0.4]]),
             O("C-Stahl 22", "C-Stahl verzinkt 22 mm", [[HZ_CS[22], 1.0], [FS_HZ["k"], 0.4]], True),
             O("C-Stahl 28", "C-Stahl verzinkt 28 mm", [[HZ_CS[28], 1.0], [FS_HZ["m"], 0.4]]),
             O("Kupfer 15", "Kupferrohr 15 mm, Pressverbindung", [["041.01.004.01001", 1.0], [FS_HZ["k"], 0.4]]),
             O("Kupfer 22", "Kupferrohr 22 mm, Pressverbindung", [["041.01.004.02001", 1.0], [FS_HZ["k"], 0.4]])]},
         {"name": "Dämmung", "optionen": [
             O("MW 100 % ≤ 22", "Mineralwolle-Schale alukaschiert, 100 % GEG (bis 22 mm)", [["047.01.001.02001", 1.0], ["047.01.006.01001", 0.3]], True),
             O("MW 100 % 28–35", "Mineralwolle-Schale alukaschiert, 100 % GEG (28–35 mm)", [["047.01.001.03001", 1.0], ["047.01.006.02001", 0.3]], True),
             O("Kautschuk 13", "Kautschuk 13 mm (im Estrich/Fußbodenaufbau)", [["047.01.002.02001", 1.0]]),
             ohne("ohne Dämmung (in beheizten Räumen sichtbar)", False)]},
         {"name": "Brandschutz", "optionen": [
             ohne("ohne Abschottung"),
             O("Abschottung", "Rohrabschottung je Decke/Wand (0,36 St/m)", [["047.02.002.01001", 0.36]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "422.02", "kg": "422", "name": "Heizungsleitung Zentrale/Gewerbe", "einheit": "m",
     "lang": "Heizungsleitung größerer Nennweite in Heizzentrale, Technikräumen oder Trassen, einschließlich anteiliger "
             "Formstücke, Befestigung, Dämmung nach GEG und Ummantelung bzw. Abschottung nach Wahl.",
     "bezug": "Leitungslänge je Rohr (Vor- und Rücklauf getrennt)",
     "schichten": [
         {"name": "Rohr", "optionen": [
             O("C-Stahl 35", "C-Stahl verzinkt 35 mm", [[HZ_CS[35], 1.0], [FS_HZ["m"], 0.3]], True),
             O("C-Stahl 42", "C-Stahl verzinkt 42 mm", [[HZ_CS[42], 1.0], [FS_HZ["g"], 0.3]], True),
             O("C-Stahl 54", "C-Stahl verzinkt 54 mm", [[HZ_CS[54], 1.0], [FS_HZ["g"], 0.3]], True),
             O("C-Stahl 76", "C-Stahl verzinkt 76,1 mm", [[HZ_CS[76], 1.0], [FS_HZ["x"], 0.3]], True),
             O("C-Stahl 89", "C-Stahl verzinkt 88,9 mm", [[HZ_CS[89], 1.0], [FS_HZ["x"], 0.3]]),
             O("MSV 40", "Mehrschichtverbund 40 mm", [[HZ_MSV[40], 1.0], [FS_HZ["g"], 0.3]]),
             O("MSV 50", "Mehrschichtverbund 50 mm", [[HZ_MSV[50], 1.0], [FS_HZ["g"], 0.3]]),
             O("Stahl geschw.", "Stahlrohr geschweißt DN 80", [["041.01.003.02001", 1.0]])]},
         {"name": "Dämmung", "optionen": [
             O("MW 100 % 42", "Mineralwolle-Schale 100 % GEG (bis 42 mm)", [["047.01.001.05001", 1.0], ["047.01.006.02001", 0.3]], True),
             O("MW 100 % 54", "Mineralwolle-Schale 100 % GEG (54 mm)", [["047.01.001.06001", 1.0], ["047.01.006.02001", 0.3]], True),
             O("MW 100 % 76–89", "Mineralwolle-Schale 100 % GEG (76–89 mm)", [["047.01.001.08001", 1.0], ["047.01.006.03001", 0.3]]),
             O("MW + Blechmantel", "Mineralwolle 100 % GEG mit Stahlblech-Ummantelung", [["047.01.001.06001", 1.0], ["047.01.004.01001", 0.45]])]},
         {"name": "Brandschutz", "optionen": [
             ohne("ohne Abschottung"),
             O("Abschottung", "Rohrabschottung je Decke/Wand (0,2 St/m)", [["047.02.002.02001", 0.2]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "422.03", "kg": "422", "name": "Wärmeverteilung je m² beheizte Fläche", "einheit": "m²",
     "lang": "Wärmeverteilnetz eines Gebäudes überschlägig je m² beheizter Fläche: Verteil- und Steigleitungen, "
             "Heizkörperanbindungen bzw. Zuleitungen zu Heizkreisverteilern, Dämmung, Strangregulierung, Spülung/Druckprobe und Abgleich.",
     "bezug": "Beheizte Netto-Raumfläche (NRF)",
     "schichten": [
         {"name": "System", "optionen": [
             O("HK Zweirohr MSV", "Heizkörper-Zweirohrsystem MSV, 1 Heizkörper je 15 m²",
               [["041.01.009.01001", 0.067], [HZ_MSV[26], 0.3], [FS_HZ["m"], 0.1], ["041.02.003.02001", 0.01], ["041.01.007.01001", 0.004]], True),
             O("HK Zweirohr Stahl", "Heizkörper-Zweirohrsystem C-Stahl, 1 Heizkörper je 15 m²",
               [["041.01.009.01001", 0.067], [HZ_CS[28], 0.3], [FS_HZ["m"], 0.1], ["041.02.003.02001", 0.01], ["041.01.007.01001", 0.004]], True),
             O("FBH-Verteilnetz", "Zuleitungen zu Heizkreisverteilern (FBH), 1 Verteiler je 80 m²",
               [[HZ_MSV[26], 0.2], [FS_HZ["m"], 0.06], ["041.02.003.02001", 0.0125], ["041.02.001.02001", 0.025], ["041.01.007.01001", 0.004]], True),
             O("Gewerbe Stahl", "Gewerbe/Verwaltung: Verteilung C-Stahl, 1 Heizkörper je 20 m²",
               [["041.01.009.01001", 0.05], [HZ_CS[35], 0.25], [FS_HZ["m"], 0.1], ["041.02.003.03001", 0.01], ["041.01.007.01001", 0.002]])]},
         {"name": "Dämmung", "optionen": [
             O("Dämmung GEG", "Dämmung Mineralwolle 100 % GEG", [["047.01.001.03001", 0.3]], True),
             O("Dämmung Kautsch.", "Dämmung Kautschuk 13 mm", [["047.01.002.02001", 0.3]], True)]},
         {"name": "Abgleich", "optionen": [
             ohne("ohne (gesondert)", False),
             O("Abgleich B", "Hydraulischer Abgleich Verfahren B je Heizfläche", [["040.05.001.01001", 0.067]], True),
             O("Abgl. + Heizlast", "Raumweise Heizlastberechnung und hydraulischer Abgleich", [["040.05.001.01001", 0.067], ["040.05.002.01001", 0.06]], True)]},
         {"name": "Brandschutz", "optionen": [
             ohne("ohne Abschottungen (EFH)"),
             O("Abschottungen", "Rohrabschottungen an Decken/Wänden (MFH)", [["047.02.002.01001", 0.04]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "422.04", "kg": "422", "name": "Heizungsverteiler", "einheit": "St",
     "lang": "Heizungsverteilung in der Heizzentrale: Verteiler mit hydraulischer Weiche, Pumpengruppen, Ausdehnungsgefäß, "
             "Schlammabscheider, Füllwasseraufbereitung und witterungsgeführte Regelung.",
     "bezug": "Anzahl der Verteilungen",
     "schichten": [
         {"name": "Verteiler", "optionen": [
             O("Vert. 2 HK", "Heizungsverteiler mit hydr. Weiche, 2 Heizkreise", [["040.04.002.01001", 1]], True),
             O("Vert. 3 HK", "Heizungsverteiler mit hydr. Weiche, 3 Heizkreise", [["040.04.002.02001", 1]], True)]},
         {"name": "Pumpengruppen", "optionen": [
             O("2 PG ungem.", "2 Pumpengruppen ungemischt DN 25", [["040.04.001.01001", 2]]),
             O("1+1 PG", "1 Pumpengruppe ungemischt, 1 gemischt DN 25", [["040.04.001.01001", 1], ["040.04.001.02001", 1]], True),
             O("2 PG gem.", "2 Pumpengruppen gemischt DN 25", [["040.04.001.02001", 2]], True),
             O("3 PG gem. 32", "3 Pumpengruppen gemischt DN 32", [["040.04.001.03001", 3]], True)]},
         {"name": "Sicherheitstechnik", "optionen": [
             O("MAG 25", "MAG 25 l, Schlammabscheider DN 25, Füllwasser 200 l", [["040.04.003.01001", 1], ["040.04.005.01001", 1], ["040.04.004.01001", 200]], True),
             O("MAG 50", "MAG 50 l, Schlammabscheider DN 50, Füllwasser 500 l", [["040.04.003.02001", 1], ["040.04.005.02001", 1], ["040.04.004.01001", 500]], True)]},
         {"name": "Regelung", "optionen": [
             O("Reg. 2 HK", "Witterungsgeführte Regelung 2 Heizkreise", [["040.04.009.02001", 1]], True),
             O("Reg. 3 HK", "Witterungsgeführte Regelung 3 Heizkreise", [["040.04.009.03001", 1]], True),
             O("Reg. 3 HK + Web", "Regelung 3 Heizkreise mit Internetmodul", [["040.04.009.03001", 1], ["040.04.010.01001", 1]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "422.05", "kg": "422", "name": "Nahwärmeleitung erdverlegt", "einheit": "m",
     "lang": "Erdverlegte Nahwärmeleitung als Kunststoffmantelrohr Duo, einschließlich Leitungsgraben, Sandbettung und "
             "anteiliger Hauseinführung nach Wahl.",
     "bezug": "Trassenlänge",
     "schichten": [
         {"name": "Leitung", "optionen": [
             O("Duo 2 × 25", "Kunststoffmantelrohr Duo 2 × 25 mm", [["041.01.005.01001", 1.0]], True),
             O("Duo 2 × 32", "Kunststoffmantelrohr Duo 2 × 32 mm", [["041.01.005.02001", 1.0]], True),
             O("Duo 2 × 40", "Kunststoffmantelrohr Duo 2 × 40 mm", [["041.01.005.03001", 1.0]], True)]},
         {"name": "Graben", "optionen": [
             O("Graben 1,0 m", "Leitungsgraben bis 1,25 m tief, Sandbettung, verfüllen",
               [["002.02.005.01001", 0.6], ["002.04.004.01001", 0.25], ["002.03.002.01001", 0.35]], True),
             ohne("Graben gesondert (Gemeinschaftsgraben)")]},
         {"name": "Hauseinführung", "optionen": [
             ohne("ohne"),
             O("Einführ. je 20 m", "Hauseinführung mit Futterrohr je 20 m Trasse", [["041.01.011.02001", 0.05], ["041.01.006.01001", 0.05]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "422.06", "kg": "422", "name": "Heizungsleitung erneuern (Bestand)", "einheit": "m",
     "lang": "Alte Heizungsleitung entleeren, demontieren und entsorgen (ggf. mit KMF-Dämmung nach TRGS 521), "
             "neue Leitung im Bestand mit Dämmung nach GEG einbauen und an Bestand anschließen.",
     "bezug": "Leitungslänge der neuen Leitung",
     "schichten": [
         {"name": "Rückbau", "optionen": [
             O("Altltg. ≤ DN 32", "Altleitung bis DN 32 demontieren", [["041.01.013.01001", 1.0]], True),
             O("Altltg. + KMF", "Altleitung mit KMF-Dämmung nach TRGS 521 entfernen", [["041.01.013.01001", 1.0], ["047.01.009.01001", 1.0]], True),
             ohne("ohne Rückbau", False)]},
         {"name": "Neue Leitung", "optionen": [
             O("MSV 20", "Mehrschichtverbund 20 mm im Bestand", [[sfx(HZ_MSV[20], 3), 1.0], [FS_HZ["k"], 0.5]], True),
             O("MSV 26", "Mehrschichtverbund 26 mm im Bestand", [[sfx(HZ_MSV[26], 3), 1.0], [FS_HZ["m"], 0.5]], True),
             O("C-Stahl 22", "C-Stahl 22 mm im Bestand", [[sfx(HZ_CS[22], 3), 1.0], [FS_HZ["k"], 0.5]], True)]},
         {"name": "Dämmung/Anschluss", "optionen": [
             O("MW GEG + Anschl.", "Dämmung 100 % GEG, Anschluss an Bestand je 10 m", [["047.01.001.02001", 1.0], ["041.01.006.01001", 0.1]], True),
             O("Kautsch. + Anschl.", "Kautschuk 13 mm, Anschluss an Bestand je 10 m", [["047.01.002.02001", 1.0], ["041.01.006.01001", 0.1]], True)]},
     ], "tags": ["altbau"]},
]

# ================================================================================================ 423 Raumheizflächen
HK_ANB = [
    O("Anbindung MSV", "Anbindeleitung MSV 16 vorgedämmt, Vor-/Rücklauf bis je 8 m", [["041.01.009.01001", 1]], True),
    ohne("Anbindung im Verteilnetz enthalten (KG 422)"),
]
HK_ABGL = [
    ohne("ohne", False),
    O("Abgleich", "Hydraulischer Abgleich Verfahren B", [["040.05.001.01001", 1]], True),
]
V += [
    {"id": "423.01", "kg": "423", "name": "Heizkörper komplett", "einheit": "St",
     "lang": "Stahl-Flachheizkörper bzw. Ventilheizkörper komplett mit Konsolen, Thermostatventil mit Voreinstellung und "
             "Thermostatkopf, Verschraubungen, Anbindeleitung und hydraulischem Abgleich nach Wahl.",
     "bezug": "Anzahl der Heizkörper",
     "schichten": [
         {"name": "Heizkörper", "optionen": [
             O("T11 600/800", "Kompakt Typ 11, 600 × 800 mm", [["041.04.001.01001", 1]]),
             O("T22 600/800", "Kompakt Typ 22, 600 × 800 mm", [["041.04.001.02001", 1]], True),
             O("T22 600/1200", "Kompakt Typ 22, 600 × 1200 mm", [["041.04.001.03001", 1]], True),
             O("T22 600/1600", "Kompakt Typ 22, 600 × 1600 mm", [["041.04.001.04001", 1]], True),
             O("T33 600/1200", "Kompakt Typ 33, 600 × 1200 mm", [["041.04.001.05001", 1]]),
             O("T33 600/2000", "Kompakt Typ 33, 600 × 2000 mm", [["041.04.001.06001", 1]]),
             O("T22 900/1000", "Kompakt Typ 22, 900 × 1000 mm", [["041.04.001.07001", 1]]),
             O("VHK T22 1000", "Ventilheizkörper Mittenanschluss Typ 22, 1000 mm", [["041.04.002.01001", 1]], True),
             O("VHK T33 1400", "Ventilheizkörper Mittenanschluss Typ 33, 1400 mm", [["041.04.002.02001", 1]]),
             O("Hygiene 1000", "Hygiene-Planheizkörper 1000 mm", [["041.04.012.01001", 1]]),
             O("Hygiene 1600", "Hygiene-Planheizkörper 1600 mm", [["041.04.012.02001", 1]])]},
         {"name": "Ventil", "optionen": [
             O("TV DN 10", "Thermostatventil DN 10 mit Kopf", [["041.04.006.01001", 1]], True),
             O("TV DN 15", "Thermostatventil DN 15 mit Kopf", [["041.04.006.02001", 1]]),
             O("TV + Funkkopf", "Thermostatventil DN 10 mit elektronischem Funkkopf", [["041.04.006.01001", 1], ["041.04.011.03001", 1]], True),
             O("TV Behörde", "Thermostatventil DN 10 mit Behördenkopf", [["041.04.006.01001", 1], ["041.04.011.02001", 1]])]},
         {"name": "Anbindung", "optionen": HK_ANB},
         {"name": "Abgleich", "optionen": HK_ABGL},
     ], "tags": ["neubau", "altbau"]},

    {"id": "423.02", "kg": "423", "name": "Badheizkörper komplett", "einheit": "St",
     "lang": "Badheizkörper (Handtuchwärmer) komplett mit Befestigung, Ventil und Thermostatkopf, Anbindeleitung und "
             "Abgleich nach Wahl.",
     "bezug": "Anzahl der Badheizkörper",
     "schichten": [
         {"name": "Heizkörper", "optionen": [
             O("Bad-HK 500/1200", "Badheizkörper 500 × 1200 mm", [["041.04.003.01001", 1]], True),
             O("Bad-HK 600/1800", "Badheizkörper 600 × 1800 mm", [["041.04.003.02001", 1]], True)]},
         {"name": "Ventil", "optionen": [
             O("TV DN 15", "Thermostatventil DN 15 mit Kopf", [["041.04.006.02001", 1]], True),
             O("TV + Funkkopf", "Thermostatventil mit elektronischem Funkkopf", [["041.04.006.02001", 1], ["041.04.011.03001", 1]], True)]},
         {"name": "Anbindung", "optionen": HK_ANB},
         {"name": "Abgleich", "optionen": HK_ABGL},
     ], "tags": ["neubau", "altbau"]},

    {"id": "423.03", "kg": "423", "name": "Fußbodenheizung Nasssystem", "einheit": "m²",
     "lang": "Warmwasser-Fußbodenheizung nach DIN EN 1264 mit Systemplatte, Heizrohr, Randdämmstreifen, Druckprobe, "
             "anteiligem Heizkreisverteiler und Einzelraumregelung; Estrich gesondert (KG 352).",
     "bezug": "Beheizte Fläche (Estrichfläche)",
     "schichten": [
         {"name": "System", "optionen": [
             O("Noppe 14 VA 10", "Noppensystem, Rohr 14 mm, VA 10 cm", [["041.03.001.01001", 1.0]]),
             O("Noppe 16 VA 10", "Noppensystem, Rohr 16 mm, VA 10 cm", [["041.03.001.02001", 1.0]], True),
             O("Noppe 16 VA 15", "Noppensystem, Rohr 16 mm, VA 15 cm", [["041.03.001.03001", 1.0]], True),
             O("Noppe 17 VA 20", "Noppensystem, Rohr 17 mm, VA 20 cm", [["041.03.001.04001", 1.0]]),
             O("Tacker 16 VA 10", "Tackersystem, Rohr 16 mm, VA 10 cm", [["041.03.002.01001", 1.0]], True),
             O("Tacker 16 VA 15", "Tackersystem, Rohr 16 mm, VA 15 cm", [["041.03.002.02001", 1.0]], True)]},
         {"name": "Verteiler/Regelung", "optionen": [
             O("Vert. 5 + ERR", "Verteiler 5 Kreise je 60 m², Einzelraumregelung je 16 m²",
               [["041.03.005.02001", 0.0167], ["041.03.006.01001", 0.0625]], True),
             O("Vert. 8 + ERR", "Verteiler 8 Kreise je 100 m², Einzelraumregelung je 20 m²",
               [["041.03.005.03001", 0.01], ["041.03.006.01001", 0.05]], True),
             O("Vert. ohne ERR", "Verteiler 5 Kreise je 60 m², ohne Einzelraumregelung", [["041.03.005.02001", 0.0167]])]},
         {"name": "Zubehör", "optionen": [
             O("Belegreifheizen", "Belegreifheizen mit Protokoll", [["041.03.010.01001", 0.01]], True),
             O("Beleg. + Fugen", "Belegreifheizen, Dehnfugenprofile", [["041.03.010.01001", 0.01], ["041.03.008.01001", 0.2]], True)]},
     ], "tags": ["neubau"]},

    {"id": "423.04", "kg": "423", "name": "Fußbodenheizung Trocken/Bestand", "einheit": "m²",
     "lang": "Fußbodenheizung mit geringer Aufbauhöhe für Sanierung und Leichtbau: Trockensystem oder in bestehenden "
             "Estrich eingefräst, mit anteiligem Verteiler und Einzelraumregelung.",
     "bezug": "Beheizte Fläche",
     "schichten": [
         {"name": "System", "optionen": [
             O("Trocken ≤ 30 mm", "Trockensystem, Aufbauhöhe bis 30 mm", [["041.03.003.01001", 1.0]], True),
             O("Eingefräst", "In bestehenden Estrich eingefräst", [["041.03.004.01001", 1.0]], True),
             O("Trocken Bestand", "Trockensystem im Bestand", [[sfx("041.03.003.01001", 3), 1.0]], True)]},
         {"name": "Verteiler/Regelung", "optionen": [
             O("Vert. 3 + ERR", "Verteiler 3 Kreise je 40 m², Einzelraumregelung je 14 m²",
               [["041.03.005.01001", 0.025], ["041.03.006.01001", 0.07]], True),
             O("Vert. 5 + Funk", "Verteiler 5 Kreise je 60 m², Funk-Einzelraumregelung je Raum",
               [["041.03.005.02001", 0.0167], ["070.02.005.01001", 0.07]], True)]},
         {"name": "Anbindung", "optionen": [
             O("Zuleitung", "Zuleitung zum Verteiler MSV 26, ca. 0,2 m/m²", [[sfx(HZ_MSV[26], 3), 0.2], ["047.01.002.02001", 0.2]], True),
             ohne("Anbindung vorhanden", False)]},
     ], "tags": ["altbau"]},

    {"id": "423.05", "kg": "423", "name": "FBH Industrieboden", "einheit": "m²",
     "lang": "Fußbodenheizung für Hallen und Industrieböden, Rohr auf Bewehrungsmatte befestigt, mit anteiligen "
             "Verteilern, Regelung und Belegreifheizen; Beton/Estrich gesondert.",
     "bezug": "Beheizte Hallenfläche",
     "schichten": [
         {"name": "System", "optionen": [
             O("Ind. VA 15", "Industrie-FBH auf Bewehrung, VA 15 cm", [["041.03.009.01001", 1.0]], True),
             O("Ind. VA 25", "Industrie-FBH auf Bewehrung, VA 25 cm", [["041.03.009.02001", 1.0]], True)]},
         {"name": "Verteiler", "optionen": [
             O("V 12/400 m²", "Verteiler 12 Kreise je 400 m²", [["041.03.005.04001", 0.0025]], True),
             O("V 8/250 m²", "Verteiler 8 Kreise je 250 m²", [["041.03.005.03001", 0.004]], True)]},
         {"name": "Zuleitung", "optionen": [
             O("C-Stahl 35", "Zuleitung C-Stahl 35 mm gedämmt, ca. 0,05 m/m²", [[HZ_CS[35], 0.05], ["047.01.001.04001", 0.05]], True),
             O("C-Stahl 54", "Zuleitung C-Stahl 54 mm gedämmt, ca. 0,04 m/m²", [[HZ_CS[54], 0.04], ["047.01.001.06001", 0.04]], True)]},
         {"name": "Regelung", "optionen": [
             O("Zonen 200 m²", "Zonenregelung je 200 m², Belegreifheizen", [["041.03.006.01001", 0.005], ["041.03.010.01001", 0.002]], True),
             O("ohne Zonen", "ohne Zonenregelung, Belegreifheizen", [["041.03.010.01001", 0.002]], True)]},
     ], "tags": ["neubau"]},

    {"id": "423.06", "kg": "423", "name": "Wand-/Deckenheizung", "einheit": "m²",
     "lang": "Flächenheizung (bzw. -kühlung) in Wand oder Decke als Nasssystem mit Kapillar- bzw. Heizrohren im Putz, "
             "mit anteiligem Verteiler und Regelung; Putz gesondert.",
     "bezug": "Belegte Wand-/Deckenfläche",
     "schichten": [
         {"name": "System", "optionen": [
             O("Nasssystem 10 mm", "Wand-/Deckenheizung Nasssystem, Rohr 10 mm", [["041.03.007.01001", 1.0]], True),
             O("Kapillarmatten", "Kapillarrohrmatten im Putz (Heizen/Kühlen)", [["078.02.004.03001", 1.0]], True)]},
         {"name": "Verteiler", "optionen": [
             O("Vert. 5 / 40 m²", "Verteiler 5 Kreise je 40 m²", [["041.03.005.02001", 0.025]], True),
             O("Vert. 3 / 25 m²", "Verteiler 3 Kreise je 25 m²", [["041.03.005.01001", 0.04]], True)]},
         {"name": "Regelung", "optionen": [
             O("ERR je 12 m²", "Einzelraumregelung je 12 m² Fläche", [["041.03.006.01001", 0.083]], True),
             O("Raumsensor Bus", "Raumsensor Temperatur/Feuchte (Taupunkt) je 15 m²", [["070.03.001.02001", 0.067]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "423.07", "kg": "423", "name": "Deckenstrahlplatten Halle", "einheit": "m",
     "lang": "Deckenstrahlplatten bzw. Deckenheizbänder für Hallen, abgehängt, mit Anbindeleitungen, Absperrung und "
             "Strangregulierung.",
     "bezug": "Länge der Strahlplattenbänder",
     "schichten": [
         {"name": "Strahlplatte", "optionen": [
             O("DSP 600", "Deckenstrahlplatte Breite 600 mm", [["041.03.011.01001", 1.0]], True),
             O("DSP 1200", "Deckenstrahlplatte Breite 1200 mm", [["041.03.011.02001", 1.0]], True)]},
         {"name": "Anbindung", "optionen": [
             O("C-Stahl 28", "Anbindeleitung C-Stahl 28 mm gedämmt, 0,5 m/m", [[HZ_CS[28], 0.5], ["047.01.001.03001", 0.5], [FS_HZ["m"], 0.2]], True),
             O("C-Stahl 42", "Anbindeleitung C-Stahl 42 mm gedämmt, 0,5 m/m", [[HZ_CS[42], 0.5], ["047.01.001.05001", 0.5], [FS_HZ["g"], 0.2]], True)]},
         {"name": "Armaturen", "optionen": [
             O("je 20 m Band", "Strangregulier- und Absperrventile DN 25 je 20 m Band", [["041.02.003.03001", 0.05], ["041.02.001.03001", 0.1], ["041.02.006.01001", 0.05]], True),
             O("je 10 m Band", "Strangregulier- und Absperrventile DN 25 je 10 m Band", [["041.02.003.03001", 0.1], ["041.02.001.03001", 0.2], ["041.02.006.01001", 0.1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "423.08", "kg": "423", "name": "Sonderheizfläche komplett", "einheit": "St",
     "lang": "Sonderheizflächen (Unterflurkonvektor mit Gebläse, Röhrenradiator) komplett mit Ventil, Anbindung und "
             "Elektroanschluss bei Gebläsekonvektoren.",
     "bezug": "Anzahl der Heizflächen",
     "schichten": [
         {"name": "Heizfläche", "optionen": [
             O("UFK 1250", "Unterflurkonvektor mit Gebläse 1250 mm, Elektroanschluss", [["041.04.005.01001", 1], ["053.09.001.03001", 1]], True),
             O("UFK 2000", "Unterflurkonvektor mit Gebläse 2000 mm, Elektroanschluss", [["041.04.005.02001", 1], ["053.09.001.03001", 1]], True),
             O("Radiator 3-s. 15", "Röhrenradiator 3-säulig 600 mm, 15 Glieder", [["041.04.004.01001", 15]], True),
             O("Radiator 4-s. 12", "Röhrenradiator 4-säulig 900 mm, 12 Glieder", [["041.04.004.02001", 12]], True),
             O("HK + Verkleidung", "Kompaktheizkörper T22 1200 mit Verkleidung 1600", [["041.04.001.03001", 1], ["041.04.009.02001", 1]])]},
         {"name": "Ventil/Regelung", "optionen": [
             O("TV DN 15", "Thermostatventil DN 15 mit Kopf", [["041.04.006.02001", 1]], True),
             O("TV + ERR", "Ventil mit Stellantrieb und Raumthermostat", [["041.04.006.02001", 1], ["041.03.006.01001", 1]], True)]},
         {"name": "Anbindung", "optionen": HK_ANB},
     ], "tags": ["neubau", "altbau"]},

    {"id": "423.09", "kg": "423", "name": "Heizkörper erneuern (Bestand)", "einheit": "St",
     "lang": "Alten Heizkörper demontieren und entsorgen, neuen Kompaktheizkörper im Bestand montieren, Ventil bzw. "
             "Thermostatkopf erneuern, Anlage anteilig entleeren/befüllen und abgleichen.",
     "bezug": "Anzahl der Heizkörper",
     "fest": [["041.04.008.01001", 1], ["041.01.014.01001", 0.1]],
     "schichten": [
         {"name": "Heizkörper", "optionen": [
             O("T22 600/800", "Kompakt Typ 22, 600 × 800 mm, im Bestand", [[sfx("041.04.001.02001", 2), 1]], True),
             O("T22 600/1200", "Kompakt Typ 22, 600 × 1200 mm, im Bestand", [[sfx("041.04.001.03001", 2), 1]], True),
             O("T22 600/1600", "Kompakt Typ 22, 600 × 1600 mm, im Bestand", [[sfx("041.04.001.04001", 2), 1]], True),
             O("T33 600/1200", "Kompakt Typ 33, 600 × 1200 mm, im Bestand", [[sfx("041.04.001.05001", 2), 1]])]},
         {"name": "Ventil", "optionen": [
             O("TV neu", "Neues Thermostatventil DN 15 mit Kopf", [[sfx("041.04.006.02001", 2), 1]], True),
             O("nur Kopf", "Vorhandenes Ventil, Thermostatkopf tauschen", [["041.04.011.01001", 1]], True)]},
         {"name": "Abgleich", "optionen": HK_ABGL},
     ], "tags": ["altbau"]},
]

# ================================================================================================ 429 Abgasanlagen
V += [
    {"id": "429.01", "kg": "429", "name": "Abgasanlage/Schornstein", "einheit": "m",
     "lang": "Abgasanlage für Wärmeerzeuger: Kunststoff-Abgasleitung im Schacht, Edelstahl-Sanierungsrohr im "
             "Bestandsschornstein, doppelwandiger Edelstahlschornstein außen oder Systemschornstein; Zubehör anteilig.",
     "bezug": "Höhe der Abgasanlage ab Anschluss",
     "schichten": [
         {"name": "System", "optionen": [
             O("PP DN 80", "Kunststoff-Abgasleitung DN 80 im Schacht", [["040.02.003.01001", 1.0]], True),
             O("PP DN 110", "Kunststoff-Abgasleitung DN 110 im Schacht", [["040.02.003.02001", 1.0]], True),
             O("PP DN 160", "Kunststoff-Abgasleitung DN 160 im Schacht", [["040.02.003.03001", 1.0]]),
             O("Edelst. DN 130", "Edelstahl-Sanierungsrohr DN 130", [["040.02.007.01001", 1.0]], True),
             O("Edelst. DN 180", "Edelstahl-Sanierungsrohr DN 180", [["040.02.007.03001", 1.0]]),
             O("Außen DN 150", "Doppelwandiger Edelstahlschornstein außen DN 150", [["040.02.008.01001", 1.0]], True),
             O("Außen DN 200", "Doppelwandiger Edelstahlschornstein außen DN 200", [["040.02.008.02001", 1.0]]),
             O("System Ø 160", "Systemschornstein einzügig Ø 160", [["012.04.008.01001", 1.0]], True)]},
         {"name": "Zubehör", "optionen": [
             ohne("ohne Zubehör"),
             O("Kopf + Zuluft", "Schornsteinkopf bzw. Mündung und Verbrennungsluft anteilig (je 10 m)",
               [["012.04.009.01001", 0.1], ["040.02.009.01001", 0.1]], True)]},
     ], "tags": ["neubau", "altbau"]},
]

# ================================================================================================ 431 Lüftung
V += [
    {"id": "431.01", "kg": "431", "name": "Wohnungslüftung zentral mit WRG", "einheit": "St",
     "lang": "Kontrollierte Wohnraumlüftung je Wohneinheit: Lüftungsgerät mit Wärmerückgewinnung, Luftverteilung mit "
             "flexiblem Rohrsystem und Verteilerkästen, Ventile, Außen-/Fortluftführung, Schalldämpfer, Kondensatanschluss, "
             "Elektroanschluss und Einregulierung.",
     "bezug": "Anzahl der Wohneinheiten bzw. Geräte",
     "fest": [["075.02.006.01001", 2], ["075.02.005.02001", 2], ["075.02.001.03001", 6.0], ["075.04.001.02001", 4],
              ["075.04.008.01001", 3.0], ["044.03.004.01001", 1], ["053.09.001.02001", 1], ["075.03.008.01001", 1]],
     "schichten": [
         {"name": "Gerät", "optionen": [
             O("WRG 200 m³/h", "Lüftungsgerät mit WRG bis 200 m³/h (Wohnung bis ca. 90 m²)", [["075.01.001.01001", 1]], True),
             O("WRG 300 m³/h", "Lüftungsgerät mit WRG bis 300 m³/h (EFH bis ca. 150 m²)", [["075.01.001.02001", 1]], True),
             O("WRG 450 m³/h", "Lüftungsgerät mit WRG bis 450 m³/h (EFH bis ca. 220 m²)", [["075.01.001.03001", 1]], True)]},
         {"name": "Luftverteilung", "optionen": [
             O("Ø 75, 8 Ventile", "Flexrohr Ø 75 ca. 60 m, 2 Verteilerkästen 6 Anschl., 8 Tellerventile",
               [["075.02.003.02001", 60.0], ["075.02.004.01001", 2], ["075.03.001.02001", 8]], True),
             O("Ø 75, 12 Ventile", "Flexrohr Ø 75 ca. 90 m, 2 Verteilerkästen 10 Anschl., 12 Tellerventile",
               [["075.02.003.02001", 90.0], ["075.02.004.02001", 2], ["075.03.001.02001", 12]], True),
             O("Ø 90, 12 Ventile", "Flexrohr Ø 90 ca. 100 m, 2 Verteilerkästen 10 Anschl., 12 Tellerventile",
               [["075.02.003.03001", 100.0], ["075.02.004.02001", 2], ["075.03.001.02001", 12]])]},
         {"name": "Brandschutz", "optionen": [
             ohne("ohne (Einfamilienhaus)"),
             O("K90-18017", "2 Brandschutz-Absperrvorrichtungen K90-18017 (MFH)", [["075.04.006.01001", 2]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "431.02", "kg": "431", "name": "Dezentraler Lüfter mit WRG", "einheit": "St",
     "lang": "Dezentrales Lüftungsgerät mit regenerativem Wärmespeicher im Pendelbetrieb, Wandeinbau mit Kernbohrung, "
             "Außen- und Innenblende, Elektroanschluss und anteiliger Einregulierung.",
     "bezug": "Anzahl der Geräte",
     "fest": [["075.01.003.01001", 1]],
     "schichten": [
         {"name": "Durchführung", "optionen": [
             O("Kernbohr. MW", "Kernbohrung Ø bis 200 mm in Mauerwerk", [["041.01.010.03001", 1]], True),
             O("Kernbohr. WDVS", "Durchführung WDVS-Fassade mit Kernbohrung", [["078.03.013.03001", 1]], True),
             O("Kernbohr. Beton", "Durchführung Stahlbeton bis 30 cm", [["078.03.013.02001", 1]])]},
         {"name": "Elektro", "optionen": [
             O("Anschl. 230 V", "Geräteanschluss Lüftungsgerät 1-phasig", [["053.09.001.02001", 1]], True),
             O("Ltg. 10 m + Dose", "Leitung NYM 3 × 1,5 ca. 10 m mit Abzweigdose", [[NYM3, 10.0], ["053.03.006.01001", 1]], True)]},
         {"name": "Einregulierung", "optionen": [
             O("je 4 Geräte", "Einregulierung und Protokoll anteilig je 4 Geräte", [["075.03.008.01001", 0.25]], True),
             ohne("ohne", False)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "431.03", "kg": "431", "name": "Abluftanlage Bad/WC", "einheit": "St",
     "lang": "Einzelraum-Abluftanlage für innenliegende Bäder/WCs nach DIN 18017-3 mit Ventilator, Luftleitung, "
             "Fortluftführung, Brandschutz nach Wahl und Elektroanschluss.",
     "bezug": "Anzahl der Abluftstellen",
     "fest": [[NYM3, 8.0], ["053.03.006.01001", 1]],
     "schichten": [
         {"name": "Ventilator", "optionen": [
             O("Lüfter Nachlauf", "UP-Abluftventilator 60 m³/h mit Nachlauf", [["075.01.004.01001", 1]], True),
             O("Lüfter Feuchte", "UP-Abluftventilator 60/30 m³/h feuchtegeführt", [["075.01.004.02001", 1]], True),
             O("Lüfter K90", "Zweiraum-Abluftventilator mit Brandschutzgehäuse K90", [["075.01.004.03001", 1]], True)]},
         {"name": "Luftleitung", "optionen": [
             O("WF DN 100, 3 m", "Wickelfalzrohr DN 100 ca. 3 m mit Formstücken", [["075.02.001.01001", 3.0], ["075.04.001.01001", 2]], True),
             O("WF DN 100, 6 m", "Wickelfalzrohr DN 100 ca. 6 m mit Formstücken", [["075.02.001.01001", 6.0], ["075.04.001.01001", 3]], True),
             O("Flex Ø 75, 4 m", "Flexrohr Ø 75 ca. 4 m", [["075.02.003.02001", 4.0]])]},
         {"name": "Fortluft", "optionen": [
             O("Wanddurchf.", "Wanddurchführung gedämmt mit Wetterschutzgitter", [["075.02.006.01001", 1]], True),
             O("Dachdurchf.", "Dachdurchführung DN 100", [["044.01.007.01001", 1]], True),
             ohne("Anschluss an Sammelschacht")]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "431.04", "kg": "431", "name": "Küchenabluft Wohnung", "einheit": "St",
     "lang": "Abluftanschluss für Dunstabzugshaube mit Mauerkasten (Rückstauklappe), Luftleitung, Kernbohrung und "
             "Dämmung nach Wahl.",
     "bezug": "Anzahl der Küchen",
     "fest": [["075.01.005.01001", 1]],
     "schichten": [
         {"name": "Luftleitung", "optionen": [
             O("WF DN 125, 3 m", "Wickelfalzrohr DN 125 ca. 3 m mit Formstücken", [["075.02.001.02001", 3.0], ["075.04.001.02001", 2]], True),
             O("WF DN 125, 6 m", "Wickelfalzrohr DN 125 ca. 6 m mit Formstücken", [["075.02.001.02001", 6.0], ["075.04.001.02001", 3]], True),
             O("WF DN 160, 4 m", "Wickelfalzrohr DN 160 ca. 4 m mit Formstücken", [["075.02.001.03001", 4.0], ["075.04.001.02001", 2]])]},
         {"name": "Durchbruch", "optionen": [
             O("Kernbohr. 150", "Kernbohrung Ø bis 150 mm", [["042.01.010.03001", 1]], True),
             O("Kernbohr. 200", "Kernbohrung Ø bis 200 mm", [["041.01.010.03001", 1]], True)]},
         {"name": "Dämmung", "optionen": [
             ohne("ohne Dämmung"),
             O("Dämmung 30 mm", "Mineralwolle alukaschiert 30 mm (Tauwasser)", [["075.04.008.01001", 2.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "431.05", "kg": "431", "name": "RLT-Zentralgerät komplett", "einheit": "St",
     "lang": "Lüftungszentralgerät mit Wärmerückgewinnung für Nichtwohngebäude, Schalldämpfer, Absperrklappen, "
             "Wetterschutzgitter, Einregulierung, Dichtheitsprüfung und Hygieneerstinspektion nach VDI 6022.",
     "bezug": "Anzahl der Geräte",
     "fest": [["075.03.008.01001", 1], ["075.06.001.01001", 2], ["075.06.002.01001", 1]],
     "schichten": [
         {"name": "Gerät", "optionen": [
             O("RLT 1.500", "Zentralgerät mit WRG 1.500 m³/h", [["075.01.002.01001", 1]], True),
             O("RLT 3.000", "Zentralgerät mit WRG 3.000 m³/h", [["075.01.002.02001", 1]], True),
             O("RLT 6.000", "Zentralgerät mit WRG 6.000 m³/h", [["075.01.002.03001", 1]], True),
             O("RLT 10.000", "Zentralgerät mit WRG 10.000 m³/h", [["075.01.002.04001", 1]])]},
         {"name": "Außen-/Fortluft", "optionen": [
             O("Kulisse 400×300", "2 Kulissenschalldämpfer, 2 Jalousieklappen 400 × 300, 2 Wetterschutzgitter 600 × 400",
               [["075.04.002.01001", 2], ["075.04.003.01001", 2], ["075.04.004.02001", 2]], True),
             O("Kulisse 600×400", "2 Kulissenschalldämpfer, 2 Jalousieklappen 600 × 400, 2 Wetterschutzgitter 1000 × 800",
               [["075.04.002.02001", 2], ["075.04.003.02001", 2], ["075.04.004.03001", 2]], True),
             O("Kulisse 800×500", "2 Kulissenschalldämpfer 800 × 500, 2 Jalousieklappen 1000 × 600, 2 Wetterschutzgitter 1000 × 800",
               [["075.04.002.03001", 2], ["075.04.003.03001", 2], ["075.04.004.03001", 2]])]},
         {"name": "MSR", "optionen": [
             ohne("MSR gesondert (KG 480)"),
             O("MSR-Schrank", "MSR-Schaltschrank 1 Feld mit DDC 40 Datenpunkte", [["070.03.005.01001", 1], ["070.02.002.01001", 1], ["070.02.003.01001", 40]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "431.06", "kg": "431", "name": "Luftleitung rund DN 100–200", "einheit": "m",
     "lang": "Runde Luftleitung aus Wickelfalzrohr, Dichtheitsklasse C, mit anteiligen Formstücken und Befestigung, "
             "Dämmung und Brandschutzklappen anteilig nach Wahl.",
     "bezug": "Leitungslänge in der Achse",
     "schichten": [
         {"name": "Rohr", "optionen": [
             O("WF DN 100", "Wickelfalzrohr DN 100", [["075.02.001.01001", 1.0], ["075.04.001.01001", 0.4]]),
             O("WF DN 125", "Wickelfalzrohr DN 125", [["075.02.001.02001", 1.0], ["075.04.001.02001", 0.4]], True),
             O("WF DN 160", "Wickelfalzrohr DN 160", [["075.02.001.03001", 1.0], ["075.04.001.02001", 0.4]], True),
             O("WF DN 200", "Wickelfalzrohr DN 200", [["075.02.001.04001", 1.0], ["075.04.001.03001", 0.4]], True)]},
         {"name": "Dämmung", "optionen": [
             ohne("ohne Dämmung"),
             O("MW 30 mm", "Mineralwolle alukaschiert 30 mm (ca. 0,6 m²/m)", [["075.04.008.01001", 0.6]], True),
             O("MW 50 mm", "Mineralwolle alukaschiert 50 mm (ca. 0,75 m²/m)", [["075.04.008.02001", 0.75]], True)]},
         {"name": "Brandschutz", "optionen": [
             ohne("ohne"),
             O("BSK je 10 m", "Brandschutzklappe K90 DN 160 je 10 m", [["075.02.007.02001", 0.1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "431.07", "kg": "431", "name": "Luftleitung rund DN 250–400", "einheit": "m",
     "lang": "Runde Luftleitung größerer Nennweite aus Wickelfalzrohr mit anteiligen Formstücken, Befestigung, "
             "Dämmung und Brandschutzklappen anteilig nach Wahl.",
     "bezug": "Leitungslänge in der Achse",
     "schichten": [
         {"name": "Rohr", "optionen": [
             O("WF DN 250", "Wickelfalzrohr DN 250", [["075.02.001.05001", 1.0], ["075.04.001.04001", 0.4]], True),
             O("WF DN 315", "Wickelfalzrohr DN 315", [["075.02.001.06001", 1.0], ["075.04.001.05001", 0.4]], True),
             O("WF DN 400", "Wickelfalzrohr DN 400", [["075.02.001.07001", 1.0], ["075.04.001.06001", 0.4]], True)]},
         {"name": "Dämmung", "optionen": [
             ohne("ohne Dämmung"),
             O("MW 30 mm", "Mineralwolle alukaschiert 30 mm (ca. 1,2 m²/m)", [["075.04.008.01001", 1.2]], True),
             O("MW 50 mm", "Mineralwolle alukaschiert 50 mm (ca. 1,4 m²/m)", [["075.04.008.02001", 1.4]], True)]},
         {"name": "Brandschutz", "optionen": [
             ohne("ohne"),
             O("BSK je 10 m", "Brandschutzklappe K90 DN 315 je 10 m", [["075.02.007.04001", 0.1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "431.08", "kg": "431", "name": "Luftkanal rechteckig", "einheit": "m²",
     "lang": "Rechteckiger Luftkanal aus verzinktem Stahlblech einschließlich Formteile und Abhängung, mit Dämmung oder "
             "Brandschutzbekleidung, Revisionsöffnungen und Reinigung nach Wahl.",
     "bezug": "Abgewickelte Kanaloberfläche",
     "fest": [["075.02.002.01001", 1.0]],
     "schichten": [
         {"name": "Dämmung", "optionen": [
             ohne("ohne Dämmung"),
             O("MW 30 mm", "Mineralwolle alukaschiert 30 mm", [["075.04.008.01001", 1.05]], True),
             O("MW 50 mm", "Mineralwolle alukaschiert 50 mm", [["075.04.008.02001", 1.05]], True),
             O("MW 100 mm", "Mineralwolle alukaschiert 100 mm (Außenluft)", [["075.04.008.03001", 1.1]]),
             O("L 90 Bekleid.", "Brandschutzbekleidung L 90 Kalziumsilikat", [["047.02.006.01001", 1.1]])]},
         {"name": "Revision/Reinigung", "optionen": [
             O("Revisionsöffn.", "Revisionsöffnungen je 10 m² Kanal", [["075.04.005.01001", 0.1]], True),
             O("Rev. + Reinig.", "Revisionsöffnungen und hygienische Reinigung vor Inbetriebnahme", [["075.04.005.01001", 0.1], ["075.02.009.01001", 0.5]], True)]},
         {"name": "Prüfung", "optionen": [
             ohne("ohne", False),
             O("Dichtheitsprüf.", "Dichtheitsprüfung DIN EN 12599 anteilig (je 100 m²)", [["075.06.001.01001", 0.01]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "431.09", "kg": "431", "name": "Luftdurchlass komplett", "einheit": "St",
     "lang": "Luftdurchlass (Drallauslass, Tellerventil oder Gitter) komplett mit Anschlussleitung und – nach Wahl – "
             "Volumenstromregler.",
     "bezug": "Anzahl der Luftdurchlässe",
     "schichten": [
         {"name": "Durchlass", "optionen": [
             O("Drall 400", "Drallauslass 400 × 400 mit Anschlusskasten", [["075.03.002.01001", 1]], True),
             O("Drall 600", "Drallauslass 600 × 600 mit Anschlusskasten", [["075.03.002.02001", 1]], True),
             O("Teller DN 125", "Tellerventil DN 125 mit Einbaurahmen", [["075.03.001.02001", 1]], True),
             O("Gitter 325×125", "Lüftungsgitter 325 × 125 mit Regelvorrichtung", [["075.03.003.01001", 1]], True),
             O("Gitter 625×225", "Lüftungsgitter 625 × 225 mit Regelvorrichtung", [["075.03.003.02001", 1]])]},
         {"name": "Anschluss", "optionen": [
             O("DN 160, 2 m", "Anschlussleitung Wickelfalz DN 160 ca. 2 m, 1 Formstück", [["075.02.001.03001", 2.0], ["075.04.001.02001", 1]], True),
             O("DN 125, 1,5 m", "Anschlussleitung Wickelfalz DN 125 ca. 1,5 m, 1 Formstück", [["075.02.001.02001", 1.5], ["075.04.001.02001", 1]], True)]},
         {"name": "Volumenstrom", "optionen": [
             ohne("ohne"),
             O("VVS DN 160", "Volumenstromregler VVS DN 160 mit Stellantrieb", [["075.03.004.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "431.10", "kg": "431", "name": "Brandschutzklappe komplett", "einheit": "St",
     "lang": "Brandschutzklappe K90 komplett eingebaut, je nach Wahl in Weichschott, mit Anbindung an die GA bzw. "
             "Rauchauslösung, einschließlich Funktionsprüfung.",
     "bezug": "Anzahl der Brandschutzklappen",
     "fest": [["075.06.003.01001", 1], ["047.02.005.01001", 1]],
     "schichten": [
         {"name": "Klappe", "optionen": [
             O("BSK DN 100", "Brandschutzklappe K90 rund DN 100, Schmelzlot", [["075.02.007.01001", 1]], True),
             O("BSK DN 160", "Brandschutzklappe K90 rund DN 160, Schmelzlot", [["075.02.007.02001", 1]], True),
             O("BSK DN 250", "Brandschutzklappe K90 rund DN 250, Schmelzlot", [["075.02.007.03001", 1]], True),
             O("BSK DN 315", "Brandschutzklappe K90 rund DN 315, Schmelzlot", [["075.02.007.04001", 1]]),
             O("BSK 400×200 mot.", "Brandschutzklappe rechteckig 400 × 200, Federrücklaufmotor", [["075.02.008.01001", 1]], True),
             O("BSK 800×400 mot.", "Brandschutzklappe rechteckig 800 × 400, Federrücklaufmotor", [["075.02.008.02001", 1]])]},
         {"name": "Einbau", "optionen": [
             ohne("Einbau in Massivbauteil (Mörtelverguss)"),
             O("Weichschott", "Einbau in Weichschott bis 0,1 m²", [["047.02.003.01001", 1]], True)]},
         {"name": "Ansteuerung", "optionen": [
             ohne("ohne (Schmelzlot)"),
             O("GA-Anbindung", "Feldverkabelung 2 Datenpunkte, Programmierung", [["070.03.006.01001", 2], ["070.02.003.01001", 2]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "431.11", "kg": "431", "name": "Gewerbeküche Abluft komplett", "einheit": "St",
     "lang": "Abluftanlage für gewerbliche Küche nach VDI 2052: Küchenablufthaube Edelstahl, fettdicht geschweißte "
             "Abluftleitung, Dachventilator, Einregulierung.",
     "bezug": "Anzahl der Anlagen",
     "fest": [["075.03.008.01001", 1], [NYM525, 20.0], [LS3, 1]],
     "schichten": [
         {"name": "Haube", "optionen": [
             O("Haube 1.600", "Küchenablufthaube Edelstahl 1.600 mm", [["075.05.001.01001", 1]], True),
             O("Haube 2.400", "Küchenablufthaube Edelstahl 2.400 mm", [["075.05.001.02001", 1]], True),
             O("Haube 3.200", "Küchenablufthaube Edelstahl 3.200 mm", [["075.05.001.03001", 1]], True)]},
         {"name": "Abluftleitung", "optionen": [
             O("DN 250, 10 m", "Fettdichte Abluftleitung DN 250, ca. 10 m", [["075.05.002.01001", 10.0]], True),
             O("DN 315, 15 m", "Fettdichte Abluftleitung DN 315, ca. 15 m", [["075.05.002.02001", 15.0]], True),
             O("DN 400, 20 m", "Fettdichte Abluftleitung DN 400, ca. 20 m", [["075.05.002.03001", 20.0]])]},
         {"name": "Ventilator", "optionen": [
             O("DV 1.500 m³/h", "Dachventilator Abluft 1.500 m³/h", [["075.01.006.02001", 1]], True),
             O("DV 2 × 1.500", "2 Dachventilatoren Abluft 1.500 m³/h", [["075.01.006.02001", 2]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "431.12", "kg": "431", "name": "Zentrale Abluftanlage MFH", "einheit": "St",
     "lang": "Zentrale Abluftanlage für innenliegende Bäder/WCs eines Mehrfamilienhauses nach DIN 18017-3 mit "
             "Dachventilator, Steigleitung, Abluftventilen und Brandschutz-Absperrvorrichtungen je Abluftstelle.",
     "bezug": "Anzahl der Anlagen (Stränge)",
     "fest": [["075.03.008.01001", 1], [NYM325, 20.0], [LS1, 1]],
     "schichten": [
         {"name": "Ventilator", "optionen": [
             O("DV 500 m³/h", "Dachventilator Abluft 500 m³/h", [["075.01.006.01001", 1]], True),
             O("DV 1.500 m³/h", "Dachventilator Abluft 1.500 m³/h", [["075.01.006.02001", 1]], True)]},
         {"name": "Steigleitung", "optionen": [
             O("DN 200, 15 m", "Steigleitung Wickelfalz DN 200, ca. 15 m", [["075.02.001.04001", 15.0], ["075.04.001.03001", 4]], True),
             O("DN 250, 20 m", "Steigleitung Wickelfalz DN 250, ca. 20 m", [["075.02.001.05001", 20.0], ["075.04.001.04001", 5]], True)]},
         {"name": "Abluftstellen", "optionen": [
             O("4 Stellen", "4 Abluftstellen: Tellerventil, K90-18017, Anschluss DN 100 2 m",
               [["075.03.001.01001", 4], ["075.04.006.01001", 4], ["075.02.001.01001", 8.0]], True),
             O("8 Stellen", "8 Abluftstellen: Tellerventil, K90-18017, Anschluss DN 100 2 m",
               [["075.03.001.01001", 8], ["075.04.006.01001", 8], ["075.02.001.01001", 16.0]], True),
             O("12 Stellen", "12 Abluftstellen: Tellerventil, K90-18017, Anschluss DN 100 2 m",
               [["075.03.001.01001", 12], ["075.04.006.01001", 12], ["075.02.001.01001", 24.0]], True)]},
     ], "tags": ["neubau", "altbau"]},
]

# ================================================================================================ 434 Kälte
KOND = [
    O("Kondensat 5 m", "Kondensatleitung DN 20, ca. 5 m", [["078.03.010.01001", 5.0]], True),
    O("Kond.-Pumpe", "Kondensatpumpe Minipumpe und Kondensatleitung DN 20, ca. 5 m", [["078.03.011.01001", 1], ["078.03.010.01001", 5.0]], True),
]
V += [
    {"id": "434.01", "kg": "434", "name": "Split-Klimagerät komplett", "einheit": "St",
     "lang": "Single-Split-Klimagerät (Wandgerät mit Außengerät) komplett mit Kältemittelleitung, Kondensatableitung, "
             "Mauerdurchführung, Leitungsabdeckung, Elektroanschluss, Inbetriebnahme und Dichtheitsprüfung.",
     "bezug": "Anzahl der Anlagen",
     "fest": [["078.04.002.01001", 1], ["078.04.001.01001", 1], [NYM325, 15.0], [LS1, 1], [PRUEF_SK, 1]],
     "schichten": [
         {"name": "Gerät", "optionen": [
             O("Split 2,5 kW", "Split-Wandgerät 2,5 kW, R32", [["078.01.004.01001", 1]], True),
             O("Split 3,5 kW", "Split-Wandgerät 3,5 kW, R32", [["078.01.004.02001", 1]], True),
             O("Split 5,0 kW", "Split-Wandgerät 5,0 kW, R32", [["078.01.004.03001", 1]], True),
             O("Split 7,1 kW", "Split-Wandgerät 7,1 kW, R32", [["078.01.004.04001", 1]])]},
         {"name": "Kältemittelleitung", "optionen": [
             O("KM-Ltg. 5 m", "Kältemittelleitung Cu 1/4\" + 3/8\" gedämmt, ca. 5 m", [["075.03.007.01001", 5.0]], True),
             O("KM-Ltg. 10 m", "Kältemittelleitung Cu 1/4\" + 1/2\" gedämmt, ca. 10 m", [["075.03.007.02001", 10.0]], True),
             O("KM-Ltg. 15 m", "Kältemittelleitung Cu 1/4\" + 1/2\" gedämmt, ca. 15 m", [["075.03.007.02001", 15.0]])]},
         {"name": "Kondensat", "optionen": KOND},
         {"name": "Durchführung", "optionen": [
             O("MW + Kanal 3 m", "Mauerdurchführung Mauerwerk, Abdeckkanal außen 3 m", [["078.03.013.01001", 1], ["078.03.014.01001", 3.0]], True),
             O("WDVS + Kanal 3 m", "Durchführung WDVS mit Kernbohrung, Abdeckkanal 3 m", [["078.03.013.03001", 1], ["078.03.014.01001", 3.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "434.02", "kg": "434", "name": "Multi-Split-Klimaanlage komplett", "einheit": "St",
     "lang": "Multi-Split-Klimaanlage mit einem Außengerät und mehreren Innengeräten, Kältemittelleitungen je Innengerät "
             "ca. 8 m, Kondensatableitung, Durchführungen, Elektroanschluss und Inbetriebnahme.",
     "bezug": "Anzahl der Anlagen",
     "fest": [["078.04.002.01001", 1], ["078.04.001.01001", 1], ["078.03.013.01001", 1], ["078.03.014.02001", 4.0],
              [NYM325, 20.0], [LS1, 1], [PRUEF_SK, 1]],
     "schichten": [
         {"name": "Anlage", "optionen": [
             O("MS 2 × Wand 2,0", "Außengerät 5,3 kW, 2 Wand-Innengeräte 2,0 kW",
               [["078.01.005.01001", 1], ["078.02.002.01001", 2], ["075.03.007.01001", 16.0]], True),
             O("MS 3 × Wand 2,0", "Außengerät 8,0 kW, 3 Wand-Innengeräte 2,0 kW",
               [["078.01.005.02001", 1], ["078.02.002.01001", 3], ["075.03.007.01001", 24.0]], True),
             O("MS 4 × Wand 2,0", "Außengerät 10,5 kW, 4 Wand-Innengeräte 2,0 kW",
               [["078.01.005.03001", 1], ["078.02.002.01001", 4], ["075.03.007.01001", 32.0]], True),
             O("MS 3 × Kassette", "Außengerät 12,5 kW, 3 Kassetten 3,5 kW",
               [["078.01.005.04001", 1], ["078.02.002.03001", 3], ["075.03.007.02001", 24.0]], True),
             O("MS 2 Wand + Truhe", "Außengerät 8,0 kW, 2 Wandgeräte 2,0 kW, 1 Truhe 2,5 kW",
               [["078.01.005.02001", 1], ["078.02.002.01001", 2], ["078.02.002.04001", 1], ["075.03.007.01001", 24.0]])]},
         {"name": "Kondensat", "optionen": [
             O("Kond. je IG 5 m", "Kondensatleitung DN 20 je Innengerät ca. 5 m (15 m)", [["078.03.010.01001", 15.0]], True),
             O("Kond. + Pumpen", "Kondensatleitung 15 m und 2 Kondensatpumpen", [["078.03.010.01001", 15.0], ["078.03.011.01001", 2]], True)]},
         {"name": "Wartung", "optionen": [
             ohne("ohne"),
             O("Wartung 1. Jahr", "Wartung Multi-Split 1. Jahr", [["078.04.004.02001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "434.03", "kg": "434", "name": "VRF-Innengerät komplett (anteilig)", "einheit": "St",
     "lang": "VRF-Klimasystem je Innengerät: Innengerät mit Kabelfernbedienung, anteiliges VRF-Außengerät, Kältemittelleitung "
             "mit Refnet-Abzweig, Kondensatableitung und anteilige Inbetriebnahme.",
     "bezug": "Anzahl der Innengeräte",
     "fest": [["078.04.002.02001", 0.0625]],
     "schichten": [
         {"name": "Innengerät", "optionen": [
             O("Wand 2,2 kW", "VRF-Wandgerät 2,2 kW", [["078.02.001.01001", 1]], True),
             O("Wand 3,6 kW", "VRF-Wandgerät 3,6 kW", [["078.02.001.02001", 1]]),
             O("Kassette 3,6 kW", "VRF-Deckenkassette 4-Wege 3,6 kW", [["078.02.001.03001", 1]], True),
             O("Kassette 5,6 kW", "VRF-Deckenkassette 4-Wege 5,6 kW", [["078.02.001.04001", 1]]),
             O("Kanal 3,6 kW", "VRF-Kanalgerät flach 3,6 kW", [["078.02.001.05001", 1]], True),
             O("Kanal 7,1 kW", "VRF-Kanalgerät flach 7,1 kW", [["078.02.001.06001", 1]]),
             O("Unterdecke 7,1", "VRF-Deckenunterbaugerät 7,1 kW", [["078.02.001.07001", 1]]),
             O("Truhe 2,8 kW", "VRF-Truhengerät 2,8 kW", [["078.02.001.08001", 1]], True)]},
         {"name": "Außengerät anteilig", "optionen": [
             O("AG 28 kW / 8 IG", "VRF-Außengerät 28 kW anteilig (8 Innengeräte)", [["078.01.003.02001", 0.125]], True),
             O("AG 45 kW / 12 IG", "VRF-Außengerät 45 kW anteilig (12 Innengeräte)", [["078.01.003.03001", 0.0833]], True),
             O("AG 14 kW / 4 IG", "VRF-Außengerät 14 kW anteilig (4 Innengeräte)", [["078.01.003.01001", 0.25]])]},
         {"name": "Leitungen", "optionen": [
             O("KM 15 m + Refnet", "Kältemittelleitung Cu 10/16 ca. 15 m, Refnet-Abzweig", [["078.03.001.03001", 15.0], ["078.03.002.01001", 1]], True),
             O("KM 25 m + Refnet", "Kältemittelleitung Cu 10/16 ca. 25 m, Refnet-Abzweig", [["078.03.001.03001", 25.0], ["078.03.002.01001", 1]], True)]},
         {"name": "Kondensat", "optionen": KOND},
     ], "tags": ["neubau", "altbau"]},

    {"id": "434.04", "kg": "434", "name": "Kaltwassersatz komplett", "einheit": "St",
     "lang": "Luftgekühlter Kaltwassersatz bzw. reversible Kaltwasser-Wärmepumpe mit Pufferspeicher, Pumpengruppe, "
             "Glykolfüllung, Gaswarnanlage, Inbetriebnahme und Dichtheitsprüfung.",
     "bezug": "Anzahl der Kälteerzeuger",
     "fest": [["078.04.002.03001", 1], ["078.04.001.02001", 1], ["078.03.008.01001", 1]],
     "schichten": [
         {"name": "Kälteerzeuger", "optionen": [
             O("KWS 20 kW", "Kaltwassersatz luftgekühlt 20 kW", [["078.01.001.01001", 1]], True),
             O("KWS 40 kW", "Kaltwassersatz luftgekühlt 40 kW", [["078.01.001.02001", 1]], True),
             O("KWS 70 kW", "Kaltwassersatz luftgekühlt 70 kW", [["078.01.001.03001", 1]], True),
             O("KWS 100 kW", "Kaltwassersatz luftgekühlt 100 kW", [["078.01.001.04001", 1]]),
             O("KWS 150 kW", "Kaltwassersatz luftgekühlt 150 kW", [["078.01.001.05001", 1]]),
             O("rev. WP 30 kW", "Reversible Kaltwasser-Wärmepumpe 30 kW", [["078.01.002.02001", 1]], True),
             O("rev. WP 50 kW", "Reversible Kaltwasser-Wärmepumpe 50 kW", [["078.01.002.03001", 1]])]},
         {"name": "Hydraulik", "optionen": [
             O("P 500 + PG 32", "Kaltwasser-Puffer 500 l, Kühlkreis-Pumpengruppe DN 32", [["078.03.015.02001", 1], ["078.03.016.02001", 1]], True),
             O("P 1000 + PG 40", "Kaltwasser-Puffer 1000 l, Kühlkreis-Pumpengruppe DN 40", [["078.03.015.03001", 1], ["078.03.016.03001", 1]], True)]},
         {"name": "Füllung", "optionen": [
             O("Ethylenglykol", "Ethylenglykol 30 %, ca. 400 l", [["078.03.009.01001", 400]], True),
             O("Propylenglykol", "Propylenglykol 35 %, ca. 400 l", [["078.03.009.02001", 400]], True),
             ohne("Wasser ohne Frostschutz (Innenaufstellung)", False)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "434.05", "kg": "434", "name": "Kaltwasserleitung", "einheit": "m",
     "lang": "Kaltwasser-/Kühlwasserleitung Stahl verzinkt, kältegedämmt, sichtbar verlegt, einschließlich anteiliger "
             "Armaturen, Abschottung und Kennzeichnung nach Wahl.",
     "bezug": "Leitungslänge je Rohr (Vor- und Rücklauf getrennt)",
     "schichten": [
         {"name": "Rohr", "optionen": [
             O("KW DN 20", "Kaltwasserleitung DN 20 kältegedämmt", [["078.03.003.01001", 1.0], ["078.03.005.01001", 0.05]]),
             O("KW DN 25", "Kaltwasserleitung DN 25 kältegedämmt", [["078.03.003.02001", 1.0], ["078.03.005.01001", 0.05]], True),
             O("KW DN 32", "Kaltwasserleitung DN 32 kältegedämmt", [["078.03.003.03001", 1.0], ["078.03.005.02001", 0.05]], True),
             O("KW DN 50", "Kaltwasserleitung DN 50 kältegedämmt", [["078.03.003.05001", 1.0], ["078.03.005.03001", 0.05]], True),
             O("KW DN 65", "Kaltwasserleitung DN 65 kältegedämmt", [["078.03.003.06001", 1.0], ["078.03.005.04001", 0.05]]),
             O("KW DN 80", "Kaltwasserleitung DN 80 kältegedämmt", [["078.03.003.07001", 1.0], ["078.03.005.05001", 0.05]], True),
             O("KW DN 100", "Kaltwasserleitung DN 100 kältegedämmt", [["078.03.003.08001", 1.0], ["078.03.005.06001", 0.05]])]},
         {"name": "Brandschutz", "optionen": [
             ohne("ohne Abschottung"),
             O("Abschottung", "Rohrabschottung je Wand/Decke (0,2 St/m)", [["047.02.002.02001", 0.2]], True)]},
         {"name": "Kennzeichnung", "optionen": [
             ohne("ohne", False),
             O("DIN 2403", "Kennzeichnung nach DIN 2403 je 10 m", [["041.01.012.01001", 0.1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "434.06", "kg": "434", "name": "Fan-Coil komplett", "einheit": "St",
     "lang": "Gebläsekonvektor (Fan-Coil) 2-Leiter komplett mit Kaltwasseranbindung und Regelventil, Kondensatableitung, "
             "Raumbediengerät und Elektroanschluss.",
     "bezug": "Anzahl der Geräte",
     "fest": [["078.03.003.01001", 10.0], ["078.03.004.01001", 1], ["078.03.010.01001", 5.0], [NYM3, 10.0]],
     "schichten": [
         {"name": "Gerät", "optionen": [
             O("FC Truhe 1,5 kW", "Fan-Coil Truhe 1,5 kW", [["078.02.003.01001", 1]], True),
             O("FC Truhe 3,0 kW", "Fan-Coil Truhe 3,0 kW", [["078.02.003.02001", 1]], True),
             O("FC Kassette 3,5", "Fan-Coil Deckenkassette 3,5 kW", [["078.02.003.03001", 1]], True),
             O("FC Kanal 4,5 kW", "Fan-Coil Kanaleinbau 4,5 kW", [["078.02.003.04001", 1]])]},
         {"name": "Bedienung", "optionen": [
             O("Raumsensor", "Raumsensor Temperatur/Feuchte Bus", [["070.03.001.02001", 1]], True),
             O("KNX-Tastsensor", "KNX-Tastsensor 4-fach mit Raumtemperaturregler", [["070.01.006.01001", 1]], True)]},
         {"name": "Kondensatpumpe", "optionen": [
             ohne("Kondensat im Gefälle"),
             O("Kond.-Pumpe", "Kondensatpumpe Minipumpe", [["078.03.011.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "434.07", "kg": "434", "name": "Kühldecke/Kühlsegel", "einheit": "m²",
     "lang": "Wasserführende Kühldecke bzw. Kühlsegel mit anteiliger Kaltwasseranbindung, Regelventilen und "
             "Taupunktüberwachung über Raumsensoren.",
     "bezug": "Aktive Kühldeckenfläche",
     "schichten": [
         {"name": "System", "optionen": [
             O("Metall-Kühldecke", "Metall-Kühldecke geschlossen", [["078.02.004.01001", 1.0]], True),
             O("Kühlsegel", "Kühlsegel frei abgehängt", [["078.02.004.02001", 1.0]], True),
             O("Kapillar Putz", "Kapillarrohrmatten im Putz", [["078.02.004.03001", 1.0]], True)]},
         {"name": "Anbindung", "optionen": [
             O("KW DN 20 0,3 m/m²", "Kaltwasserleitung DN 20 ca. 0,3 m/m², Regelventil je 20 m²", [["078.03.003.01001", 0.3], ["078.03.004.01001", 0.05]], True),
             O("+ Strangreg.", "wie vor, zusätzlich Strangregulierventil je 40 m²", [["078.03.003.01001", 0.3], ["078.03.004.01001", 0.05], ["078.03.006.01001", 0.025]], True)]},
         {"name": "Regelung", "optionen": [
             O("Sensor je 20 m²", "Raumsensor Temperatur/Feuchte je 20 m²", [["070.03.001.02001", 0.05]], True),
             O("CO₂-Sensor 20 m²", "Raumsensor CO₂/Temperatur/Feuchte je 20 m²", [["070.03.001.01001", 0.05]], True)]},
     ], "tags": ["neubau", "altbau"]},
]

# ================================================================================================ 442 Eigenstrom (PV, Speicher, NEA, USV)
V += [
    {"id": "442.01", "kg": "442", "name": "Photovoltaikanlage", "einheit": "St",
     "lang": "Netzgekoppelte Photovoltaikanlage komplett mit Modulen, Unterkonstruktion, Wechselrichter, DC-/AC-Verkabelung, "
             "Überspannungsschutz, Erdung, Anmeldung und Inbetriebnahme; Speicher und Energiemanagement nach Wahl. Gerüst gesondert.",
     "bezug": "Anzahl der Anlagen (Leistung in der Option)",
     "fest": [["050.03.004.01001", 1], ["050.04.004.01001", 1]],
     "schichten": [
         {"name": "Generator", "optionen": [
             O("Aufdach 8 kWp", "PV Aufdach 8 kWp", [["053.05.003.01001", 8]], True),
             O("Aufdach 12 kWp", "PV Aufdach 12 kWp", [["053.05.003.01001", 12]], True),
             O("Aufdach 30 kWp", "PV Aufdach 30 kWp", [["053.05.003.02001", 30]], True),
             O("Aufdach 60 kWp", "PV Aufdach 60 kWp", [["053.05.003.02001", 60]]),
             O("Flachdach 20 kWp", "PV Flachdach aufgeständert 20 kWp", [["053.05.004.01001", 20]], True),
             O("Flachdach 50 kWp", "PV Flachdach aufgeständert 50 kWp", [["053.05.004.01001", 50]])]},
         {"name": "Speicher", "optionen": [
             ohne("ohne Batteriespeicher"),
             O("Speicher 10 kWh", "Batteriespeicher LFP nutzbar 10 kWh", [["053.05.005.02001", 1]], True),
             O("Speicher 15 kWh", "Batteriespeicher LFP nutzbar 15 kWh", [["053.05.005.03001", 1]], True)]},
         {"name": "Zählerplatz/EMS", "optionen": [
             O("Zählerplatz", "Zählerplatz-Erweiterung im Bestand", [["053.07.005.01001", 1]], True),
             O("Zählerpl. + EMS", "Zählerplatz-Erweiterung und Energiemanager", [["053.07.005.01001", 1], ["040.01.011.01001", 1]], True),
             ohne("Zählerplatz vorhanden", False)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "442.02", "kg": "442", "name": "Batteriespeicher komplett", "einheit": "St",
     "lang": "Stationärer Lithium-Batteriespeicher mit Wechselrichter bzw. Laderegler, AC-Anschluss, Absicherung und "
             "Zählerplatz-Erweiterung nach Wahl.",
     "bezug": "Anzahl der Speicher",
     "fest": [[NYM56, 6.0], [LS3C32, 1], [PRUEF_SK, 1]],
     "schichten": [
         {"name": "Speicher", "optionen": [
             O("LFP 5 kWh", "Batteriespeicher LFP nutzbar 5 kWh", [["053.05.005.01001", 1]], True),
             O("LFP 10 kWh", "Batteriespeicher LFP nutzbar 10 kWh", [["053.05.005.02001", 1]], True),
             O("Li 10 kWh + WR", "Batteriespeicher 10 kWh mit Wechselrichter 8 kW", [["055.03.001.02001", 1]], True),
             O("Li 30 kWh + WR", "Batteriespeicher 30 kWh mit Wechselrichter 20 kW", [["055.03.001.04001", 1]], True),
             O("Li 60 kWh + WR", "Batteriespeicher 60 kWh mit Wechselrichter 30 kW", [["055.03.001.05001", 1]])]},
         {"name": "Zählerplatz", "optionen": [
             ohne("vorhanden"),
             O("Erweiterung", "Zählerplatz-Erweiterung/Zusatzfeld", [["053.07.005.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "442.03", "kg": "442", "name": "Netzersatzanlage komplett", "einheit": "St",
     "lang": "Netzersatzanlage Diesel zur Innenaufstellung mit Tagestank, Netzumschaltung, Abgasleitung mit Schalldämpfer, "
             "Einspeisesteckdose und Erstwartung nach Wahl.",
     "bezug": "Anzahl der Anlagen",
     "schichten": [
         {"name": "Aggregat", "optionen": [
             O("NEA 20 kVA", "NEA 20 kVA, ATS 63 A, Abgas DN 80 ca. 10 m",
               [["055.01.001.01001", 1], ["055.01.002.01001", 1], ["055.01.003.01001", 10.0], ["055.01.006.01001", 1]], True),
             O("NEA 40 kVA", "NEA 40 kVA, ATS 160 A, Abgas DN 80 ca. 10 m",
               [["055.01.001.02001", 1], ["055.01.002.02001", 1], ["055.01.003.01001", 10.0], ["055.01.006.01001", 1]], True),
             O("NEA 80 kVA", "NEA 80 kVA, ATS 160 A, Abgas DN 125 ca. 12 m",
               [["055.01.001.03001", 1], ["055.01.002.02001", 1], ["055.01.003.02001", 12.0], ["055.01.006.02001", 1]], True),
             O("NEA 150 kVA", "NEA 150 kVA, ATS 400 A, Abgas DN 125 ca. 12 m",
               [["055.01.001.04001", 1], ["055.01.002.03001", 1], ["055.01.003.02001", 12.0], ["055.01.006.02001", 1]], True),
             O("NEA 300 kVA", "NEA 300 kVA, ATS 800 A, Abgas DN 200 ca. 15 m",
               [["055.01.001.05001", 1], ["055.01.002.04001", 1], ["055.01.003.03001", 15.0], ["055.01.006.03001", 1]])]},
         {"name": "Einspeisung", "optionen": [
             ohne("ohne"),
             O("Einspeis. 63 A", "Einspeisesteckdose für mobiles Aggregat 63 A", [["055.01.004.02001", 1]], True)]},
         {"name": "Wartung", "optionen": [
             ohne("ohne"),
             O("Wartung 1. Jahr", "Probelauf/Wartung 1. Jahr bis 80 kVA", [["055.01.005.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "442.04", "kg": "442", "name": "USV-Anlage komplett", "einheit": "St",
     "lang": "Online-USV (VFI) mit Batterien für 10 min Überbrückung, Wartungsbypass und Zuleitung.",
     "bezug": "Anzahl der Anlagen",
     "schichten": [
         {"name": "USV", "optionen": [
             O("USV 3 kVA", "USV 3 kVA", [["055.02.001.01001", 1]], True),
             O("USV 10 kVA + BP", "USV 10 kVA mit externem Wartungsbypass", [["055.02.001.02001", 1], ["055.02.002.01001", 1]], True),
             O("USV 20 kVA + BP", "USV 20 kVA mit Wartungsbypass 40 kVA", [["055.02.001.03001", 1], ["055.02.002.02001", 1]], True),
             O("USV 40 kVA + BP", "USV 40 kVA mit Wartungsbypass 40 kVA", [["055.02.001.04001", 1], ["055.02.002.02001", 1]], True),
             O("USV 80 kVA + BP", "USV 80 kVA mit Wartungsbypass 160 kVA", [["055.02.001.05001", 1], ["055.02.002.03001", 1]]),
             O("USV 160 kVA + BP", "USV 160 kVA mit Wartungsbypass 160 kVA", [["055.02.001.06001", 1], ["055.02.002.03001", 1]])]},
         {"name": "Zuleitung", "optionen": [
             O("NYY 5×10, 20 m", "Zu-/Ableitung NYY-J 5 × 10 mm², ca. 2 × 20 m", [["053.02.002.03001", 40.0]], True),
             O("NYY 4×35, 20 m", "Zu-/Ableitung NYY-J 4 × 35 mm², ca. 2 × 20 m", [["053.02.002.05001", 40.0]], True)]},
     ], "tags": ["neubau", "altbau"]},
]

# ================================================================================================ 443/444 Niederspannung
PROG = {"rw": (0, "reinweiß"), "an": (1, "anthrazit"), "es": (2, "Edelstahl"), "gl": (3, "Glas")}


def eli(stufe, prog, mount):
    """Elektroinstallation je m² Wohnfläche. mount: 'm' Massivwand, 'h' Hohlwand, 'mb'/'hb' im Bestand."""
    p = PROG[prog][0] * 8
    pm = {"m": 1, "mb": 2, "h": 3, "hb": 4}[mount]       # Programm-Geräte (Schalter, Steckdosen, Melder)
    nm = {"m": 1, "mb": 2, "h": 5, "hb": 6}[mount]       # übrige Installationsgeräte
    fr = 2 if mount in ("mb", "hb") else 1                # Feuchtraumsteckdose

    def P(g, f):
        return [f"053.04.{g}{p + pm:03d}", f]

    def N(g, f):
        return [f"053.04.{g}{nm:03d}", f]
    if stufe == 1:
        L = [P("002.01", 0.18), P("002.02", 0.10), P("001.01", 0.10), P("001.02", 0.01), N("004.01", 0.11),
             N("005.01", 0.0125), N("005.02", 0.025), [f"053.04.002.05{fr:03d}", 0.012], [PRUEF_SK, 0.12]]
    elif stufe == 2:
        L = [P("002.01", 0.22), P("002.02", 0.14), P("002.03", 0.02), P("001.01", 0.12), P("001.02", 0.02),
             P("001.03", 0.01), N("004.01", 0.14), N("005.01", 0.0125), N("005.02", 0.03), N("006.01", 0.05),
             [f"053.04.002.05{fr:03d}", 0.02], ["053.04.003.03001", 0.0125], [PRUEF_SK, 0.16]]
    else:
        L = [P("002.01", 0.22), P("002.02", 0.20), P("002.03", 0.04), P("002.04", 0.03), P("001.01", 0.12),
             P("001.02", 0.02), P("001.03", 0.02), P("001.06", 0.04), P("001.04", 0.01), P("003.01", 0.0125),
             N("004.01", 0.18), N("005.01", 0.0125), N("005.02", 0.04), N("006.01", 0.07),
             [f"053.04.002.05{fr:03d}", 0.025], ["053.04.003.03001", 0.025], [PRUEF_SK, 0.20]]
    return L


def eli_stufen(mount):
    return [
        O("Stufe 1 rw", "Ausstattung Stufe 1 (Mindest nach RAL-RG 678), Programm reinweiß", eli(1, "rw", mount), True),
        O("Stufe 2 rw", "Ausstattung Stufe 2 (Standard), Programm reinweiß", eli(2, "rw", mount), True),
        O("Stufe 2 anthrazit", "Ausstattung Stufe 2 (Standard), Programm anthrazit matt", eli(2, "an", mount)),
        O("Stufe 2 Edelstahl", "Ausstattung Stufe 2 (Standard), Programm Edelstahl/Alu", eli(2, "es", mount), True),
        O("Stufe 3 rw", "Ausstattung Stufe 3 (Komfort), Programm reinweiß", eli(3, "rw", mount), True),
        O("Stufe 3 Glas", "Ausstattung Stufe 3 (Komfort), Designrahmen Glas", eli(3, "gl", mount)),
    ]


def uv_opt(sfx_n):
    return [
        O("UV 2-r. / 60 m²", "Unterverteilung 2-reihig bestückt je Wohnung bis 60 m²", [[f"053.01.003.01{sfx_n:03d}", 1 / 60]], True),
        O("UV 3-r. / 85 m²", "Unterverteilung 3-reihig bestückt je Wohnung bis 85 m²", [[f"053.01.003.02{sfx_n:03d}", 1 / 85]], True),
        O("UV 4-r. / 130 m²", "Unterverteilung 4-reihig bestückt je Einheit bis 130 m²", [[f"053.01.003.03{sfx_n:03d}", 1 / 130]]),
    ]


ELI_ZUSATZ = [
    ohne("ohne Zusatzausstattung"),
    O("ÜS T2 + AFDD", "Überspannungsschutz Typ 2 und Brandschutzschalter Schlafräume anteilig",
      [["050.03.002.01001", 1 / 85], ["053.01.007.01001", 0.03]], True),
]

V += [
    {"id": "443.01", "kg": "443", "name": "Niederspannungs-Hauptverteilung", "einheit": "St",
     "lang": "Niederspannungs-Hauptverteilung (NSHV) in Feldbauweise, bestückt, mit Einspeise-Leistungsschalter, "
             "Abgängen, Kombiableiter, Energiemessung und Dokumentation.",
     "bezug": "Anzahl der Hauptverteilungen",
     "fest": [["050.03.001.01001", 1], ["053.07.006.01001", 1], ["053.06.003.01001", 1], ["053.09.005.01001", 1]],
     "schichten": [
         {"name": "Felder", "optionen": [
             O("2 Felder 600", "2 Felder à 600 mm, bestückt", [["053.07.001.01001", 2]], True),
             O("3 Felder 800", "3 Felder à 800 mm, bestückt", [["053.07.001.02001", 3]], True),
             O("4 Felder 1000", "4 Felder à 1000 mm, bestückt", [["053.07.001.03001", 4]], True)]},
         {"name": "Einspeisung", "optionen": [
             O("LS 250 A", "Leistungsschalter kompakt 250 A", [["053.07.003.02001", 1]], True),
             O("LS 400 A", "Leistungsschalter kompakt 400 A", [["053.07.003.03001", 1]], True),
             O("LS 630 A", "Leistungsschalter kompakt 630 A", [["053.07.003.04001", 1]])]},
         {"name": "Abgänge", "optionen": [
             O("8 × NH 63/160", "4 NH-Lasttrenner 63 A, 4 × 160 A", [["053.07.002.01001", 4], ["053.07.002.02001", 4]], True),
             O("12 × NH 63–250", "6 × 63 A, 4 × 160 A, 2 × 250 A", [["053.07.002.01001", 6], ["053.07.002.02001", 4], ["053.07.002.03001", 2]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "444.01", "kg": "444", "name": "Elektroinstallation Wohnen Massivbau", "einheit": "m²",
     "lang": "Elektroinstallation einer Wohnung im Massivbau je m² Wohnfläche: Steckdosen, Schalter, Brennstellen, "
             "Geräteanschlüsse jeweils komplett mit Leitung und Dose, anteilige Unterverteilung und Erstprüfung. "
             "Ausstattungsstufen in Anlehnung an RAL-RG 678; Beleuchtung, Daten und Sprechanlage gesondert.",
     "bezug": "Wohnfläche",
     "schichten": [
         {"name": "Ausstattung", "optionen": eli_stufen("m")},
         {"name": "Verteilung", "optionen": uv_opt(1)},
         {"name": "Zusatz", "optionen": ELI_ZUSATZ},
     ], "tags": ["neubau"]},

    {"id": "444.02", "kg": "444", "name": "Elektroinstallation Wohnen Holz/TB", "einheit": "m²",
     "lang": "Elektroinstallation einer Wohnung im Holz- bzw. Trockenbau je m² Wohnfläche mit Hohlwanddosen: Steckdosen, "
             "Schalter, Brennstellen, Geräteanschlüsse komplett, anteilige Unterverteilung und Erstprüfung.",
     "bezug": "Wohnfläche",
     "schichten": [
         {"name": "Ausstattung", "optionen": eli_stufen("h")},
         {"name": "Verteilung", "optionen": uv_opt(9)},
         {"name": "Zusatz", "optionen": ELI_ZUSATZ},
     ], "tags": ["neubau"]},

    {"id": "444.03", "kg": "444", "name": "Elektroinstallation Wohnen Sanierung", "einheit": "m²",
     "lang": "Erneuerung der Elektroinstallation einer Bestandswohnung je m² Wohnfläche: Rückbau der Altinstallation, "
             "Schlitze, neue Installation im Bestand mit Unterverteilung und Erstprüfung.",
     "bezug": "Wohnfläche",
     "schichten": [
         {"name": "Rückbau", "optionen": [
             O("Rückbau + Schl.", "Altinstallation demontieren, Schlitze und Durchbrüche ca. 0,4 m/m²",
               [["053.06.004.01001", 1 / 75], ["053.02.006.01001", 0.4]], True),
             O("nur Rückbau", "Altinstallation demontieren (Leitungswege vorhanden)", [["053.06.004.01001", 1 / 75]], True)]},
         {"name": "Ausstattung", "optionen": [
             O("Stufe 1 rw", "Stufe 1, reinweiß, im Bestand", eli(1, "rw", "mb"), True),
             O("Stufe 2 rw", "Stufe 2, reinweiß, im Bestand", eli(2, "rw", "mb"), True),
             O("Stufe 2 Edelstahl", "Stufe 2, Edelstahl/Alu, im Bestand", eli(2, "es", "mb")),
             O("Stufe 3 rw", "Stufe 3, reinweiß, im Bestand", eli(3, "rw", "mb"), True),
             O("Stufe 2 Hohlwand", "Stufe 2, reinweiß, Hohlwand im Bestand", eli(2, "rw", "hb"))]},
         {"name": "Verteilung", "optionen": uv_opt(2)[:2]},
         {"name": "Zusatz", "optionen": ELI_ZUSATZ},
     ], "tags": ["altbau"]},

    {"id": "444.04", "kg": "444", "name": "Elektroinstallation Büro/Verwaltung", "einheit": "m²",
     "lang": "Allgemeine Elektroinstallation für Büro- und Verwaltungsflächen je m² Nutzfläche: Installationssystem mit "
             "Steckdosen, Schalter, anteilige Unterverteilung mit Zuleitung, Kabeltrassen und Erstprüfung; Beleuchtung und Daten gesondert.",
     "bezug": "Nutzfläche",
     "fest": [["053.04.001.01001", 0.05], [PRUEF_SK, 0.08]],
     "schichten": [
         {"name": "Installationssystem", "optionen": [
             O("Brüstungskanal Alu", "Brüstungskanal Alu 130 × 55, 0,3 m/m², 2-fach-Steckdosen 0,25 St/m²",
               [["053.08.002.01001", 0.3], ["053.04.002.02007", 0.25]], True),
             O("BK Kunststoff", "Brüstungskanal Kunststoff 60 × 110, 0,3 m/m², 2-fach-Steckdosen 0,25 St/m²",
               [["053.03.004.02001", 0.3], ["053.04.002.02007", 0.25]], True),
             O("Unterflur", "Unterflurkanal estrichbündig 0,15 m/m², Bodentanks je 25 m²",
               [["053.08.003.01001", 0.15], ["053.08.004.02001", 0.04], ["053.04.002.02001", 0.1]], True),
             O("UP-Wand", "Unterputz-Installation, 2-fach-Steckdosen 0,25 St/m²", [["053.04.002.02001", 0.25]])]},
         {"name": "Verteilung", "optionen": [
             O("UV 3 Felder/600", "Unterverteilung AP 3 Felder je 600 m², Zuleitung NYY 5 × 16", [["053.07.004.02001", 1 / 600], ["053.02.002.04001", 0.05]], True),
             O("UV 2 Felder/400", "Unterverteilung AP 2 Felder je 400 m², Zuleitung NYY 5 × 10", [["053.07.004.01001", 1 / 400], ["053.02.002.03001", 0.06]], True)]},
         {"name": "Trasse", "optionen": [
             O("Kabelrinne 200", "Kabelrinne 200 × 60 im Flur, 0,12 m/m²", [["053.03.001.02001", 0.12]], True),
             O("Gitterrinne 200", "Gitterrinne 200 × 60 im Flur, 0,12 m/m²", [["053.03.002.02001", 0.12]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "444.05", "kg": "444", "name": "Elektroinstallation Halle/Werkstatt", "einheit": "m²",
     "lang": "Elektroinstallation für Hallen, Lager und Werkstätten je m² Nutzfläche in Aufputz-Ausführung: Steckdosen IP44, "
             "CEE-Steckdosen, Leitungen auf Trasse, anteilige Unterverteilung und Erstprüfung; Beleuchtung gesondert.",
     "bezug": "Nutzfläche",
     "schichten": [
         {"name": "Ausstattung", "optionen": [
             O("Lager", "Lager: Steckdosen IP44 je 50 m², CEE 16 A je 300 m²",
               [["053.04.002.05001", 0.02], ["053.08.001.01001", 0.0033], ["053.02.002.02001", 0.25], [PRUEF_SK, 0.01]], True),
             O("Werkstatt", "Werkstatt: Steckdosen IP44 je 20 m², CEE 16/32 A je 60/150 m²",
               [["053.04.002.05001", 0.05], ["053.08.001.01001", 0.0167], ["053.08.001.02001", 0.0067], ["053.02.002.02001", 0.6], [PRUEF_SK, 0.03]], True),
             O("Produktion", "Produktion: Steckdosenkombinationen je 40 m², Stromschiene 63 A",
               [["053.08.001.03001", 0.025], ["053.08.006.02001", 0.05], ["053.02.002.03001", 0.15], [PRUEF_SK, 0.02]], True)]},
         {"name": "Trasse", "optionen": [
             O("Kabelrinne 300", "Kabelrinne 300 × 60, 0,06 m/m²", [["053.03.001.03001", 0.06]], True),
             O("Gitterrinne 200", "Gitterrinne 200 × 60, 0,06 m/m²", [["053.03.002.02001", 0.06]], True)]},
         {"name": "Verteilung", "optionen": [
             O("UV 3 F / 1000 m²", "Unterverteilung AP 3 Felder je 1.000 m²", [["053.07.004.02001", 0.001], ["053.02.002.04001", 0.03]], True),
             O("UV 4 F / 800 m²", "Unterverteilung AP 4 Felder je 800 m²", [["053.07.004.03001", 0.00125], ["053.02.002.05001", 0.03]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "444.06", "kg": "444", "name": "Zählerschrank/Hausanschluss komplett", "einheit": "St",
     "lang": "Zählerschrank nach VDE-AR-N 4100 mit Zählerplätzen, Hausanschluss-Vorbereitung, Haupterdungsschiene, "
             "Überspannungsschutz, Hauptleitung zur Unterverteilung und Erstprüfung.",
     "bezug": "Anzahl der Hausanschlüsse",
     "fest": [["050.01.005.01001", 1], [PRUEF_SK, 2]],
     "schichten": [
         {"name": "Zählerschrank", "optionen": [
             O("1 Zählerplatz", "Zählerschrank 1 Zählerplatz und Verteilerfeld", [["053.01.002.01001", 1]], True),
             O("2 Zählerplätze", "Zählerschrank 2 Zählerplätze (Haushalt + WP/PV)", [["053.01.002.02001", 1]], True),
             O("4 Zählerplätze", "Zählerschrank 4 Zählerplätze (MFH)", [["053.01.002.03001", 1]], True),
             O("8 Zählerplätze", "Zählerschrank 8 Zählerplätze (MFH)", [["053.01.002.04001", 1]], True)]},
         {"name": "Hauseinführung", "optionen": [
             O("Mehrsparten", "Mehrsparten-Hauseinführung", [["053.01.001.01001", 1]], True),
             ohne("Einführung durch Netzbetreiber")]},
         {"name": "Überspannung", "optionen": [
             O("Kombi T1+2", "Kombiableiter Typ 1+2 im Zählerschrank", [["050.03.001.01001", 1]], True),
             ohne("ohne (gesondert)", False)]},
         {"name": "Hauptleitung", "optionen": [
             O("NYM 5×10, 10 m", "Hauptleitung NYM-J 5 × 10 mm² zur UV, ca. 10 m", [["053.01.008.01001", 10.0]], True),
             O("NYM 5×16, 15 m", "Hauptleitung NYM-J 5 × 16 mm² zur UV, ca. 15 m", [["053.01.008.02001", 15.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "444.07", "kg": "444", "name": "Unterverteilung komplett", "einheit": "St",
     "lang": "Stromkreisverteiler bestückt mit Schutzeinrichtungen nach Stromkreisliste, Zusatzausstattung nach Wahl, "
             "Zuleitung, Beschriftung und Prüfung.",
     "bezug": "Anzahl der Verteiler",
     "fest": [["053.09.005.01001", 1], [PRUEF_SK, 1]],
     "schichten": [
         {"name": "Verteiler", "optionen": [
             O("UP 2-reihig", "Unterverteilung UP 2-reihig bestückt", [["053.01.003.01001", 1]], True),
             O("UP 3-reihig", "Unterverteilung UP 3-reihig bestückt", [["053.01.003.02001", 1]], True),
             O("UP 4-reihig", "Unterverteilung UP 4-reihig bestückt", [["053.01.003.03001", 1]], True),
             O("AP 2 Felder IP54", "Unterverteilung AP Stahlblech 2 Felder", [["053.07.004.01001", 1]], True),
             O("AP 4 Felder IP54", "Unterverteilung AP Stahlblech 4 Felder", [["053.07.004.03001", 1]])]},
         {"name": "Zusatz", "optionen": [
             ohne("Grundbestückung"),
             O("ÜS T2 + AFDD", "Überspannungsschutz Typ 2, 4 Brandschutzschalter", [["050.03.002.01001", 1], ["053.01.007.01001", 4]], True),
             O("FI Typ B + ÜS", "FI Typ B (WP/Wallbox), Überspannungsschutz Typ 2", [["053.01.004.02001", 1], ["050.03.002.01001", 1]])]},
         {"name": "Zuleitung", "optionen": [
             O("NYM 5×10, 15 m", "Zuleitung NYM-J 5 × 10 mm², ca. 15 m", [["053.01.008.01001", 15.0]], True),
             O("NYY 5×16, 25 m", "Zuleitung NYY-J 5 × 16 mm² auf Rinne, ca. 25 m", [["053.02.002.04001", 25.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "444.08", "kg": "444", "name": "Wallbox/Ladepunkt komplett", "einheit": "St",
     "lang": "Ladepunkt für Elektrofahrzeuge mit Wallbox 11 kW, Zuleitung, Schutzeinrichtungen und Erstprüfung; "
             "Erweiterung der Zuleitung bzw. erdverlegtes Leerrohr nach Wahl.",
     "bezug": "Anzahl der Ladepunkte",
     "fest": [["053.01.004.02001", 1], [LS3C32, 1], [PRUEF_SK, 1]],
     "schichten": [
         {"name": "Wallbox", "optionen": [
             O("WB 11 kW Std.", "Wallbox 11 kW Standard, Zuleitung bis 15 m", [["053.05.002.01001", 1]], True),
             O("WB 11 kW PV/App", "Wallbox 11 kW mit Lastmanagement, PV-Überschussladen", [["053.05.002.02001", 1]], True),
             O("WB eichrechtskonf.", "Wallbox 11 kW eichrechtskonform mit Abrechnung", [["053.05.002.03001", 1]], True)]},
         {"name": "Zuleitung", "optionen": [
             ohne("Zuleitung bis 15 m (enthalten)"),
             O("+ NYY 5×10 20 m", "zusätzliche Zuleitung NYY-J 5 × 10 mm² ca. 20 m auf Rinne", [["053.02.002.03001", 20.0]], True),
             O("+ Erdltg. 20 m", "Leerrohr DN 110 erdverlegt und NYY-J 5 × 10 ca. 20 m", [["053.03.005.02001", 20.0], ["053.02.002.03001", 20.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "444.09", "kg": "444", "name": "Elektroanschluss Haustechnik", "einheit": "St",
     "lang": "Elektrischer Anschluss von haustechnischen Geräten (Wärmepumpe, Lüftungsgerät, Heizkessel, "
             "Durchlauferhitzer, Pumpen) mit Leitung, Absicherung und Erstprüfung.",
     "bezug": "Anzahl der Geräteanschlüsse",
     "fest": [[PRUEF_SK, 1]],
     "schichten": [
         {"name": "Gerät", "optionen": [
             O("WP 3-ph + EVU", "Wärmepumpe 3-phasig mit Steuerleitung (EVU-Sperre)", [["053.09.001.01001", 1], [LS3, 1]], True),
             O("WP Außeneinheit", "Wärmepumpen-Außeneinheit Leistung und Steuerung", [["053.04.005.04001", 1], [LS3, 1]], True),
             O("Lüftungsgerät", "Lüftungsgerät 1-phasig", [["053.09.001.02001", 1], [LS1, 1]], True),
             O("Kessel Notsch.", "Heizung/Kessel mit Notschalter", [["053.04.005.05001", 1], [LS1, 1]], True),
             O("DLE 21 kW", "Durchlauferhitzer 21 kW", [["053.09.001.04001", 1], [LS3C32, 1]]),
             O("Pumpe/Stellantr.", "Umwälzpumpe bzw. Stellantrieb", [["053.09.001.03001", 1]])]},
         {"name": "Schutz", "optionen": [
             ohne("FI in Verteilung vorhanden"),
             O("FI Typ A anteilig", "FI-Schutzschalter Typ A anteilig (je 4 Stromkreise)", [["053.01.004.01001", 0.25]], True)]},
     ], "tags": ["neubau", "altbau"]},
]

# ================================================================================================ 445 Beleuchtung
LEUCHTE_ANSCHL = [
    O("Brennst. Massiv", "Brennstellenanschluss Decke/Wand, Massivbau", [["053.04.004.01001", 1]], True),
    O("Brennst. Hohlwand", "Brennstellenanschluss Hohlwand/Trockenbaudecke", [["053.04.004.01005", 1]], True),
    ohne("Anschluss an vorhandene Zuleitung"),
]
V += [
    {"id": "445.01", "kg": "445", "name": "Leuchte innen komplett", "einheit": "St",
     "lang": "LED-Innenleuchte komplett montiert und angeschlossen, mit Brennstellenanschluss und anteiliger Schaltstelle "
             "nach Wahl.",
     "bezug": "Anzahl der Leuchten",
     "schichten": [
         {"name": "Leuchte", "optionen": [
             O("DL 600 lm", "LED-Downlight Ø 90, 600 lm", [["058.01.001.01001", 1]], True),
             O("DL 800 lm dimm.", "LED-Downlight Ø 90, 800 lm, dimmbar", [["058.01.001.02001", 1]]),
             O("DL 1500 DALI", "LED-Downlight Ø 150, 1500 lm, DALI", [["058.01.001.03001", 1]], True),
             O("Panel 625 EVG", "LED-Panel 625 × 625, 3600 lm", [["058.01.002.01001", 1]], True),
             O("Panel 625 DALI", "LED-Panel 625 × 625, 3600 lm, DALI", [["058.01.002.02001", 1]]),
             O("Langfeld 1500", "LED-Langfeldleuchte 1500 mm, 6000 lm", [["058.01.003.02001", 1]], True),
             O("Feuchtraum 1200", "LED-Feuchtraum-Wannenleuchte IP65, 1200 mm", [["058.01.004.01001", 1]], True),
             O("Rund Ø 300 IP44", "LED-Wand-/Deckenleuchte Ø 300, IP44", [["058.01.005.01001", 1]]),
             O("Rund + HF-Sensor", "LED-Wand-/Deckenleuchte mit HF-Sensor", [["058.01.005.02001", 1]]),
             O("Badleuchte 600", "LED-Spiegel-/Badleuchte IP44, 600 mm", [["058.04.004.01001", 1]]),
             O("Pendel d/i 1500", "LED-Pendelleuchte direkt/indirekt, 1500 mm", [["058.04.005.02001", 1]])]},
         {"name": "Anschluss", "optionen": LEUCHTE_ANSCHL},
         {"name": "Schaltstelle", "optionen": [
             O("Schalter anteil.", "Aus-/Wechselschalter je 2 Leuchten", [["053.04.001.01001", 0.5]], True),
             O("Präsenz anteil.", "Präsenzmelder Decke 360° je 4 Leuchten", [["053.04.003.02001", 0.25]], True),
             ohne("Schaltstelle gesondert", False)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "445.02", "kg": "445", "name": "Beleuchtung Büro/Verwaltung", "einheit": "m²",
     "lang": "Allgemeinbeleuchtung für Büro- und Verwaltungsflächen nach DIN EN 12464-1 (500 lx am Arbeitsplatz) je m² "
             "Nutzfläche: Leuchten komplett mit Anschluss, Steuerung und Lichtberechnung anteilig.",
     "bezug": "Nutzfläche",
     "fest": [["058.05.001.01001", 0.01]],
     "schichten": [
         {"name": "Leuchten", "optionen": [
             O("Panel 625", "LED-Panel 625 × 625 3600 lm, 0,2 St/m²", [["058.01.002.01001", 0.2], ["053.04.004.01005", 0.2]], True),
             O("Raster UGR19", "LED-Rasterleuchte UGR < 19 4300 lm, 0,18 St/m²", [["058.04.002.02001", 0.18], ["053.04.004.01005", 0.18]], True),
             O("Pendel d/i", "Pendelleuchten d/i 1200 mm 0,1 St/m², Downlights 0,05 St/m²",
               [["058.04.005.01001", 0.1], ["058.01.001.03001", 0.05], ["053.04.004.01005", 0.15]], True),
             O("Lichtband", "LED-Lichtband 0,12 m/m²", [["058.01.006.01001", 0.12], ["053.04.004.01001", 0.03]])]},
         {"name": "Steuerung", "optionen": [
             O("Schalter", "Aus-/Wechselschalter je 20 m²", [["053.04.001.01001", 0.05]], True),
             O("Präsenzmelder", "Präsenzmelder je 20 m²", [["053.04.003.02001", 0.05]], True),
             O("DALI je Raum", "DALI-Lichtsteuerung je Raum (20 m²)", [["058.03.004.01001", 0.05]], True)]},
         {"name": "Messung", "optionen": [
             ohne("ohne", False),
             O("Messprotokoll", "Beleuchtungsstärkemessung je Raum (20 m²)", [["058.05.002.01001", 0.05]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "445.03", "kg": "445", "name": "Beleuchtung Halle", "einheit": "m²",
     "lang": "Hallenbeleuchtung mit LED-Hallenleuchten bzw. Lichtband (ca. 300 lx), Zuleitung auf Trasse und Steuerung "
             "je m² Hallenfläche.",
     "bezug": "Hallenfläche",
     "schichten": [
         {"name": "Leuchten", "optionen": [
             O("High-Bay 15.000", "LED-Hallenleuchte 15.000 lm, je 40 m²", [["058.04.001.01001", 0.025]], True),
             O("High-Bay 22.000", "LED-Hallenleuchte 22.000 lm, je 60 m²", [["058.04.001.02001", 0.0167]], True),
             O("High-Bay 30.000", "LED-Hallenleuchte 30.000 lm, je 80 m²", [["058.04.001.03001", 0.0125]], True),
             O("Lichtband", "LED-Lichtband, Reihenabstand 12 m (0,083 m/m²)", [["058.01.006.01001", 0.083]])]},
         {"name": "Zuleitung", "optionen": [
             O("NYY auf Rinne", "NYY-J 3 × 1,5 ca. 0,25 m/m² auf Kabelrinne 100", [["053.02.002.01001", 0.25], ["053.03.001.01001", 0.05]], True),
             O("NYY auf Gitter", "NYY-J 3 × 1,5 ca. 0,25 m/m² auf Gitterrinne 100", [["053.02.002.01001", 0.25], ["053.03.002.01001", 0.05]], True)]},
         {"name": "Steuerung", "optionen": [
             O("Taster je 200 m²", "Taster mit Kontrolllicht je 200 m²", [["053.04.001.04001", 0.005]], True),
             O("Präsenz je 100 m²", "Präsenzmelder je 100 m²", [["053.04.003.02001", 0.01]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "445.04", "kg": "445", "name": "Außenleuchte komplett", "einheit": "St",
     "lang": "LED-Außenleuchte (Wand-, Poller-, Mast- oder Bodeneinbauleuchte) komplett mit Zuleitung bzw. Erdkabel im "
             "Schutzrohr und Schaltung nach Wahl; Fundament für Mastleuchten in der Leuchtenposition.",
     "bezug": "Anzahl der Leuchten",
     "schichten": [
         {"name": "Leuchte", "optionen": [
             O("Wand IP54", "LED-Außenwandleuchte IP54", [["058.02.001.01001", 1]], True),
             O("Wand + Sensor", "LED-Außenwandleuchte mit Bewegungssensor", [["058.02.001.02001", 1]], True),
             O("Poller 650", "LED-Pollerleuchte 650 mm", [["058.02.002.01001", 1]], True),
             O("Poller 1000", "LED-Pollerleuchte 1000 mm", [["058.02.002.02001", 1]]),
             O("Mast 4 m", "LED-Mastleuchte 4 m Lichtpunkthöhe", [["058.02.003.01001", 1]], True),
             O("Mast 6 m", "LED-Mastleuchte 6 m Lichtpunkthöhe", [["058.02.003.02001", 1]]),
             O("Bodeneinbau", "LED-Bodeneinbaustrahler befahrbar IP67", [["058.02.004.01001", 1]])]},
         {"name": "Zuleitung", "optionen": [
             O("Wand 10 m", "Leitung NYM 3 × 1,5 ca. 10 m, Brennstelle", [[NYM3, 10.0], ["053.04.004.01001", 1]], True),
             O("Erdkabel 15 m", "Erdkabel NYY 3 × 1,5 ca. 15 m im Leerrohr DN 50, Graben", [["053.02.002.01001", 15.0], ["053.03.005.01001", 15.0], ["002.02.005.01001", 3.0]], True),
             O("Erdkabel 30 m", "Erdkabel NYY 3 × 1,5 ca. 30 m im Leerrohr DN 50, Graben", [["053.02.002.01001", 30.0], ["053.03.005.01001", 30.0], ["002.02.005.01001", 6.0]])]},
         {"name": "Schaltung", "optionen": [
             ohne("über vorhandene Schaltstelle/Zeitschaltung"),
             O("BM außen", "Bewegungsmelder außen IP55 je 2 Leuchten", [["053.04.003.03001", 0.5]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "445.05", "kg": "445", "name": "Sicherheitsleuchte Einzelbatterie", "einheit": "St",
     "lang": "Sicherheits- bzw. Rettungszeichenleuchte LED mit Einzelbatterie nach DIN EN 1838, komplett mit Anschluss, "
             "Prüfung und Fluchtwegkennzeichnung nach Wahl.",
     "bezug": "Anzahl der Leuchten",
     "fest": [["058.05.003.01001", 1]],
     "schichten": [
         {"name": "Leuchte", "optionen": [
             O("RZL 22 m einseit.", "Rettungszeichenleuchte einseitig 22 m", [["058.03.001.01001", 1]], True),
             O("RZL 30 m Pendel", "Rettungszeichenleuchte Pendel doppelseitig 30 m", [["058.03.001.02001", 1]], True),
             O("SL Einbau", "Sicherheitsleuchte Deckeneinbau", [["058.03.002.01001", 1]], True),
             O("SL Aufbau IP65", "Sicherheitsleuchte Aufbau IP65", [["058.03.002.02001", 1]])]},
         {"name": "Anschluss", "optionen": [
             O("Brennstelle", "Brennstellenanschluss", [["053.04.004.01001", 1]], True),
             O("NHXMH 12 m", "Halogenfreie Leitung NHXMH 3 × 1,5 ca. 12 m", [["053.02.003.01001", 12.0]], True)]},
         {"name": "Kennzeichnung", "optionen": [
             ohne("ohne"),
             O("Schild nachleucht.", "Fluchtwegschild langnachleuchtend 300 × 150", [["059.02.004.02001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "445.06", "kg": "445", "name": "Sicherheitsleuchte Zentralbatterie", "einheit": "St",
     "lang": "Sicherheits- bzw. Rettungszeichenleuchte am Zentralbatteriesystem nach DIN VDE V 0108-100 je Leuchte: "
             "Leuchte, Funktionserhalt-Leitung E30, anteilige Zentrale bzw. Unterstation, Netzüberwachung und Erstprüfung.",
     "bezug": "Anzahl der Leuchten",
     "fest": [["059.03.002.01001", 0.04], ["059.01.003.01001", 0.1]],
     "schichten": [
         {"name": "Leuchte", "optionen": [
             O("RZL 22 m einseit.", "Rettungszeichenleuchte 22 m einseitig, ZB", [["059.02.001.01001", 1]], True),
             O("RZL 22 m doppels.", "Rettungszeichenleuchte 22 m doppelseitig, ZB", [["059.02.001.02001", 1]], True),
             O("RZL 40 m doppels.", "Rettungszeichenleuchte 40 m doppelseitig, ZB", [["059.02.001.04001", 1]]),
             O("SL Flur", "Sicherheitsleuchte Rettungsweg, ZB", [["059.02.002.01001", 1]], True),
             O("SL Antipanik", "Sicherheitsleuchte Antipanik, ZB", [["059.02.002.02001", 1]], True),
             O("SL Halle Spot", "Sicherheitsleuchte Hallen/große Höhen, ZB", [["059.02.002.03001", 1]]),
             O("Mischbetrieb DL", "Allgemeinleuchte mit Sicherheitsfunktion, Downlight", [["059.02.003.01001", 1]])]},
         {"name": "Leitung", "optionen": [
             O("E30 12 m", "Funktionserhalt E30 3 × 1,5, ca. 12 m", [["059.01.004.01001", 12.0]], True),
             O("E30 20 m", "Funktionserhalt E30 3 × 1,5, ca. 20 m", [["059.01.004.01001", 20.0]], True)]},
         {"name": "Zentrale anteilig", "optionen": [
             O("CPS 1 kW / 40 L.", "Zentralbatterie 1.000 W, 8 Kreise, je 40 Leuchten", [["059.01.001.02001", 1 / 40]], True),
             O("CPS 2 kW / 80 L.", "Zentralbatterie 2.000 W, 16 Kreise, je 80 Leuchten", [["059.01.001.03001", 1 / 80]], True),
             O("CPS 4 kW + US", "Zentralbatterie 4.000 W je 150 Leuchten, Unterstation 8 Kreise je 40",
               [["059.01.001.04001", 1 / 150], ["059.01.002.02001", 1 / 40]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "445.07", "kg": "445", "name": "Beleuchtung Wohnung", "einheit": "m²",
     "lang": "Leuchtenausstattung einer Wohnung je m² Wohnfläche (Flur, Bad, Küche mit Einbau- bzw. Aufbauleuchten, "
             "Außenleuchte); Brennstellen in KG 444, Wohn-/Schlafräume ohne Leuchten (Nutzer).",
     "bezug": "Wohnfläche",
     "schichten": [
         {"name": "Leuchten", "optionen": [
             O("Basis", "Deckenleuchten rund IP44 in Flur/Bad/Abstellraum, 0,05 St/m²", [["058.01.005.01001", 0.05]], True),
             O("Standard", "Downlights Flur/Bad 0,08 St/m², Badleuchte, Deckenleuchte Küche",
               [["058.01.001.01001", 0.08], ["058.04.004.01001", 0.0125], ["058.01.005.01001", 0.0125]], True),
             O("Komfort", "Downlights dimmbar 0,15 St/m², LED-Profile Küche, Badleuchte",
               [["058.01.001.02001", 0.15], ["058.01.007.01001", 0.03], ["058.04.004.02001", 0.0125]], True)]},
         {"name": "Außen", "optionen": [
             ohne("ohne Außenleuchte"),
             O("Außen + Sensor", "Außenwandleuchte mit Bewegungssensor je 80 m²", [["058.02.001.02001", 0.0125]], True)]},
         {"name": "Dimmung", "optionen": [
             ohne("ohne"),
             O("Dimmer", "LED-Dimmer je 40 m²", [["053.04.001.06001", 0.025]], True)]},
     ], "tags": ["neubau", "altbau"]},
]

# ================================================================================================ 446 Blitzschutz/Erdung
V += [
    {"id": "446.01", "kg": "446", "name": "Blitzschutz/Erdung Einfamilienhaus", "einheit": "St",
     "lang": "Äußerer Blitzschutz LPS III für ein Einfamilienhaus mit Erdungsanlage, Potentialausgleich und "
             "Überspannungsschutz nach Wahl, einschließlich Prüfung und Dokumentation.",
     "bezug": "Anzahl der Gebäude",
     "fest": [["050.02.005.01001", 1], ["050.01.006.01001", 1]],
     "schichten": [
         {"name": "Erdung", "optionen": [
             O("Fundamenterder", "Fundamenterder 60 m, 4 Anschlussfahnen", [["050.01.001.01001", 60.0], ["050.01.003.01001", 4]], True),
             O("Ringerder V4A", "Ringerder Edelstahl 60 m, 4 Anschlussfahnen", [["050.01.002.01001", 60.0], ["050.01.003.01001", 4]], True),
             O("Tiefenerder", "4 Tiefenerder je 6 m (Bestand)", [["050.01.004.01001", 24.0], ["050.01.003.01001", 4]])]},
         {"name": "Potentialausgleich", "optionen": [
             O("HES + PA", "Haupterdungsschiene, PA-Leitungen 16 mm² 10 m, 4 Rohrschellen", [["050.01.005.01001", 1], ["050.04.001.02001", 10.0], ["050.04.002.01001", 4]], True),
             O("HES + PA + Bad", "wie vor, zusätzlich örtlicher PA Bad", [["050.01.005.01001", 1], ["050.04.001.02001", 10.0], ["050.04.002.01001", 4], ["050.04.003.01001", 1]], True)]},
         {"name": "Überspannung", "optionen": [
             O("T1+2", "Kombiableiter Typ 1+2", [["050.03.001.01001", 1]], True),
             O("T1+2, T2, T3", "Kombiableiter, Typ 2 in UV, 3 Feinschutz", [["050.03.001.01001", 1], ["050.03.002.01001", 1], ["050.03.003.01001", 3]], True)]},
         {"name": "PV", "optionen": [
             ohne("ohne PV"),
             O("PV-Anbindung", "Erdung PV-Gestell, ÜS DC-seitig", [["050.04.004.01001", 1], ["050.03.004.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "446.02", "kg": "446", "name": "Blitzschutzanlage je m² Dachfläche", "einheit": "m²",
     "lang": "Äußere Blitzschutzanlage LPS III für Nichtwohn- und Mehrfamilienhäuser überschlägig je m² Dachfläche: "
             "Fangeinrichtung, Ableitungen mit Trennstellen, Erdung, Anschluss Dachaufbauten, Prüfung und Dokumentation.",
     "bezug": "Dachfläche (Grundfläche des Gebäudes)",
     "fest": [["050.02.007.01001", 0.01], ["050.02.006.01001", 0.0025], ["050.04.005.01001", 0.0025], ["050.02.009.01001", 0.01]],
     "schichten": [
         {"name": "Fangeinrichtung", "optionen": [
             O("Flachdach Rd 8", "Fangleitung Flachdach Masche 10 m, Fangstangen je 100 m²", [["050.02.001.01001", 0.2], ["050.02.004.01001", 0.01]], True),
             O("Steildach", "Fangleitung Steildach (First, Grate)", [["050.02.001.02001", 0.15]], True),
             O("Flachdach + HVI", "Fangleitung Flachdach, isolierte Fangeinrichtung je 200 m²", [["050.02.001.01001", 0.15], ["050.02.008.01001", 0.005]])]},
         {"name": "Ableitungen", "optionen": [
             O("1–2 Geschosse", "Ableitungen je 15 m Umfang, Höhe bis 7 m", [["050.02.002.01001", 0.08], ["050.02.003.01001", 0.012]], True),
             O("3–4 Geschosse", "Ableitungen je 15 m Umfang, Höhe bis 13 m", [["050.02.002.01001", 0.15], ["050.02.003.01001", 0.012]], True),
             O("5–8 Geschosse", "Ableitungen je 15 m Umfang, Höhe bis 25 m", [["050.02.002.01001", 0.25], ["050.02.003.01001", 0.012]], True)]},
         {"name": "Erdung", "optionen": [
             O("Fundamenterder", "Fundamenterder mit Anschlussfahnen", [["050.01.001.01001", 0.2], ["050.01.003.01001", 0.015]], True),
             O("Ringerder V4A", "Ringerder Edelstahl mit Anschlussfahnen", [["050.01.002.01001", 0.2], ["050.01.003.01001", 0.015]], True),
             ohne("Erdung vorhanden", False)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "446.03", "kg": "446", "name": "Überspannungsschutz Gebäude", "einheit": "St",
     "lang": "Überspannungsschutzkonzept je Gebäude: Grobschutz am Hausanschluss, Mittelschutz in Unterverteilungen, "
             "Feinschutz an Endgeräten und Blitzschutz-Potentialausgleich der einführenden Leitungen.",
     "bezug": "Anzahl der Gebäude",
     "schichten": [
         {"name": "Grobschutz", "optionen": [
             O("Kombi T1+2", "Kombiableiter Typ 1+2 im Zählerschrank", [["050.03.001.01001", 1]], True),
             O("nur T2", "Überspannungsableiter Typ 2 (ohne äußeren Blitzschutz)", [["050.03.002.01001", 1]], True)]},
         {"name": "Unterverteilungen", "optionen": [
             O("1 UV", "Typ 2 in 1 Unterverteilung", [["050.03.002.01001", 1]], True),
             O("3 UV", "Typ 2 in 3 Unterverteilungen", [["050.03.002.01001", 3]], True),
             O("6 UV", "Typ 2 in 6 Unterverteilungen", [["050.03.002.01001", 6]])]},
         {"name": "Feinschutz", "optionen": [
             ohne("ohne"),
             O("4 × Typ 3", "4 Feinschutzgeräte/Datenleitungsschutz", [["050.03.003.01001", 4]], True),
             O("10 × Typ 3", "10 Feinschutzgeräte/Datenleitungsschutz", [["050.03.003.01001", 10]])]},
         {"name": "Einführungen", "optionen": [
             ohne("ohne"),
             O("BS-PA", "Blitzschutz-Potentialausgleich einführende Leitungen", [["050.03.005.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},
]

# ================================================================================================ 45x Kommunikation/Sicherheit
DOSE = {"m": 1, "mb": 2, "h": 5, "bk": 13}
V += [
    {"id": "451.01", "kg": "451", "name": "Telekommunikationsanschluss Gebäude", "einheit": "St",
     "lang": "Telekommunikations-Hausanschluss mit Glasfaser-Abschlusspunkt bzw. Gebäudeverkabelung, Leerrohr zur "
             "Grundstücksgrenze, Hauseinführung und TAE-Anschlüsse nach Wahl.",
     "bezug": "Anzahl der Gebäude",
     "schichten": [
         {"name": "Anschluss", "optionen": [
             O("Gf-TA", "Glasfaser-Abschlusspunkt (APL/Gf-TA) mit Leitung", [["061.03.010.01001", 1]], True),
             O("Gf-Hausverk.", "Glasfaser-Gebäudeanschluss/Hausverkabelung", [["061.01.007.01001", 1], ["061.03.010.01001", 1]], True)]},
         {"name": "Leerrohr", "optionen": [
             O("LR DN 50 10 m", "Leerrohr erdverlegt DN 50 mit Zugdraht, ca. 10 m", [["053.03.005.01001", 10.0]], True),
             O("LR DN 50 25 m", "Leerrohr erdverlegt DN 50 mit Zugdraht, ca. 25 m", [["053.03.005.01001", 25.0]], True)]},
         {"name": "Einführung", "optionen": [
             O("Mehrsparten", "Mehrsparten-Hauseinführung (anteilig 1/3)", [["053.01.001.01001", 0.33]], True),
             O("Futterrohr", "Wanddurchführung mit Futterrohr DN 50", [["041.01.011.01001", 1]], True)]},
         {"name": "TAE", "optionen": [
             ohne("ohne TAE"),
             O("2 × TAE", "2 Telefon-/TAE-Anschlüsse mit Leitung", [["061.02.003.01001", 2]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "452.01", "kg": "452", "name": "Türsprechanlage komplett", "einheit": "St",
     "lang": "Türsprechanlage im 2-Draht-Bus je Gebäude: Türstation, Wohnungsstationen, Steuergerät, Türöffner, "
             "Busleitungen (ca. 20 m je Wohnung) und Inbetriebnahme.",
     "bezug": "Anzahl der Anlagen (Wohnungszahl in der Option)",
     "schichten": [
         {"name": "Anlage", "optionen": [
             O("EFH Audio", "1 WE: Türstation Audio, 1 Wohnungsstation Freisprechen",
               [["062.01.001.01001", 1], ["062.01.002.02001", 1], ["062.01.003.01001", 1], [JY2, 30.0]], True),
             O("EFH Video", "1 WE: Türstation Video, 1 Wohnungsstation Video 4,3\"",
               [["062.01.001.04001", 1], ["062.01.002.03001", 1], ["062.01.003.01001", 1], [JY2, 30.0]], True),
             O("MFH 6 Audio", "6 WE: Türstation Audio 6 Ruftasten, 6 Wohnungsstationen",
               [["062.01.001.02001", 1], ["062.01.002.02001", 6], ["062.01.003.01001", 1], [JY2, 130.0]], True),
             O("MFH 6 Video", "6 WE: Türstation Video 6 Ruftasten, 6 Wohnungsstationen Video",
               [["062.01.001.05001", 1], ["062.01.002.03001", 6], ["062.01.003.01001", 1], [JY2, 130.0]], True),
             O("MFH 12 Video", "12 WE: Türstation Video Display, 12 Wohnungsstationen Video",
               [["062.01.001.06001", 1], ["062.01.002.03001", 12], ["062.01.003.02001", 1], [JY2, 250.0]]),
             O("MFH 8 BK-Anlage", "8 WE: Briefkastenanlage mit Sprechstelle, 8 Wohnungsstationen Audio",
               [["062.01.006.02001", 1], ["062.01.002.02001", 8], ["062.01.003.01001", 1], [JY2, 170.0]])]},
         {"name": "Türöffner", "optionen": [
             O("E-Öffner", "Türöffner Standard 12 V", [["062.01.004.01001", 1]], True),
             O("E-Öffner RM", "Türöffner mit Rückmeldekontakt", [["062.01.004.02001", 1]], True)]},
         {"name": "App", "optionen": [
             ohne("ohne"),
             O("Smartphone-GW", "Smartphone-Anbindung (Gateway)", [["062.01.005.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "452.02", "kg": "452", "name": "Lichtrufanlage je Zimmer", "einheit": "St",
     "lang": "Lichtrufanlage nach DIN VDE 0834 je Pflege- bzw. Patientenzimmer: Zimmereinheit, Badeinheit, Leitung und "
             "anteilige Lichtrufzentrale mit Dienstzimmerterminal.",
     "bezug": "Anzahl der Zimmer",
     "fest": [[JY4, 30.0]],
     "schichten": [
         {"name": "Zimmer", "optionen": [
             O("1 Bett", "Zimmereinheit 1 Bett", [["062.02.002.01001", 1]], True),
             O("2 Betten", "Zimmereinheit 2 Betten", [["062.02.002.02001", 1]], True)]},
         {"name": "Bad", "optionen": [
             O("Bad-Einheit", "Zimmereinheit Bad", [["062.02.002.03001", 1]], True),
             ohne("ohne Bad", False)]},
         {"name": "Zentrale anteilig", "optionen": [
             O("je 20 Zimmer", "Lichtrufzentrale anteilig je 20 Zimmer", [["062.02.003.01001", 0.05]], True),
             O("je 40 Zimmer", "Lichtrufzentrale anteilig je 40 Zimmer", [["062.02.003.01001", 0.025]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "454.01", "kg": "454", "name": "Beschallung/ELA je Lautsprecher", "einheit": "St",
     "lang": "Elektroakustische Anlage bzw. Sprachalarmanlage je Lautsprecher: Lautsprecher, Leitung und anteilige "
             "Zentrale.",
     "bezug": "Anzahl der Lautsprecher",
     "schichten": [
         {"name": "Lautsprecher", "optionen": [
             O("LS Decke 6 W", "Deckeneinbaulautsprecher 6 W", [["062.03.001.01001", 1]], True),
             O("LS Wand 6 W", "Wandgehäuselautsprecher 6 W", [["062.03.001.02001", 1]], True),
             O("Druckkammer", "Druckkammerlautsprecher außen 15 W", [["062.03.001.03001", 1]]),
             O("Schallprojektor", "Schallprojektor 20 W", [["062.03.001.04001", 1]], True)]},
         {"name": "Leitung", "optionen": [
             O("J-Y(St)Y 15 m", "Leitung J-Y(St)Y 2 × 2 × 0,8, ca. 15 m", [["062.03.003.01001", 15.0]], True),
             O("FE180/E30 15 m", "Leitung JE-H(St)H FE180/E30, ca. 15 m", [["062.03.003.02001", 15.0]], True)]},
         {"name": "Zentrale anteilig", "optionen": [
             O("ELA 4 Z / 20 LS", "ELA-Zentrale 4 Zonen je 20 Lautsprecher", [["062.03.002.01001", 0.05]], True),
             O("ELA 8 Z / 40 LS", "ELA-Zentrale 8 Zonen je 40 Lautsprecher", [["062.03.002.02001", 0.025]], True),
             O("SAA EN 54 / 40", "Sprachalarmzentrale EN 54-16 je 40 Lautsprecher", [["062.03.002.03001", 0.025]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "455.01", "kg": "455", "name": "SAT-/Antennenanlage komplett", "einheit": "St",
     "lang": "SAT-Empfangsanlage mit Multischalter bzw. Einkabelsystem, Antennendosen mit Koaxleitung, Dachdurchgang, "
             "Erdung und Blitzschutzanbindung nach Wahl.",
     "bezug": "Anzahl der Anlagen",
     "fest": [["020.04.005.02001", 1], ["050.04.001.01001", 10.0], ["050.04.002.01001", 1]],
     "schichten": [
         {"name": "Empfang", "optionen": [
             O("Quattro 4 Teiln.", "SAT-Anlage Quattro-LNB, Multischalter 4 Teilnehmer", [["061.02.001.01001", 1]], True),
             O("Einkabel 16 T.", "SAT-Anlage Einkabel-System bis 16 Teilnehmer", [["061.02.001.02001", 1]], True)]},
         {"name": "Dosen", "optionen": [
             O("4 Dosen", "4 Antennendosen mit Koaxleitung", [["061.02.002.01001", 4]], True),
             O("8 Dosen", "8 Antennendosen mit Koaxleitung", [["061.02.002.01001", 8]], True),
             O("16 Dosen", "16 Antennendosen mit Koaxleitung", [["061.02.002.01001", 16]])]},
         {"name": "Blitzschutz", "optionen": [
             ohne("ohne äußeren Blitzschutz"),
             O("an Fangeinr.", "Anschluss an Fangeinrichtung", [["050.02.007.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "456.01", "kg": "456", "name": "Rauchwarnmelder Wohnung", "einheit": "St",
     "lang": "Rauchwarnmelder nach DIN EN 14604 und DIN 14676 für eine Wohnung (Schlafräume, Kinderzimmer, Flure), "
             "montiert und in Betrieb genommen.",
     "bezug": "Anzahl der Wohnungen",
     "schichten": [
         {"name": "Anzahl", "optionen": [
             O("3 Melder", "3 Melder (Wohnung bis 60 m²)", [], True),
             O("5 Melder", "5 Melder (Wohnung bis 100 m²)", [], True),
             O("7 Melder", "7 Melder (EFH/große Wohnung)", [], True),
             O("10 Melder", "10 Melder (EFH mehrgeschossig)", [], True)]},
         {"name": "Typ", "optionen": [
             O("Einzelgerät", "Rauchwarnmelder Einzelgerät", [], True),
             O("funkvernetzt", "Rauchwarnmelder funkvernetzbar", [], True)]},
     ], "tags": ["neubau", "altbau"]},
]
# Rauchwarnmelder: Menge hängt von Anzahl × Typ ab – Optionen kombiniert ausformulieren
_rwm = V[-1]
_rwm["schichten"] = [{"name": "Ausstattung", "optionen": [
    O(f"{n} RWM {'Funk' if f else 'einzeln'}", f"{n} Rauchwarnmelder {'funkvernetzt' if f else 'Einzelgerät'} ({w})",
      [["063.01.001.02001" if f else "063.01.001.01001", n]], True)
    for n, w in ((3, "Wohnung bis 60 m²"), (5, "Wohnung bis 100 m²"), (7, "große Wohnung/EFH"), (10, "EFH mehrgeschossig"))
    for f in (False, True)]}]

V += [
    {"id": "456.02", "kg": "456", "name": "Brandmelder komplett (anteilig BMZ)", "einheit": "St",
     "lang": "Brandmeldeanlage nach DIN 14675/VDE 0833 je Melder: Melder, Ringleitung, anteilige Brandmelderzentrale mit "
             "Feuerwehrperipherie und Übertragungseinrichtung, Inbetriebnahme und Abnahme.",
     "bezug": "Anzahl der Melder (automatisch und nichtautomatisch)",
     "fest": [["063.03.006.01001", 1]],
     "schichten": [
         {"name": "Melder", "optionen": [
             O("opt. Rauchmelder", "Optischer Rauchmelder im Ring", [["063.01.003.01001", 1]], True),
             O("Mehrkriterien", "Mehrkriterienmelder O/T", [["063.01.003.02001", 1]], True),
             O("Zwischendecke", "Melder in Zwischendecke mit Parallelanzeige", [["063.01.003.03001", 1]], True),
             O("Handmelder", "Handfeuermelder Druckknopf", [["063.01.004.01001", 1]], True),
             O("Signalgeber", "Signalgeber Sirene/Blitzleuchte", [["063.01.005.01001", 1]])]},
         {"name": "Leitung", "optionen": [
             O("BMA-Ltg. 15 m", "Brandmeldeleitung rot, ca. 15 m", [["063.03.005.01001", 15.0]], True),
             O("BMA-Ltg. 25 m", "Brandmeldeleitung rot, ca. 25 m", [["063.03.005.01001", 25.0]], True)]},
         {"name": "Zentrale anteilig", "optionen": [
             O("BMZ 2 R / 100 M.", "BMZ 2 Ringe, FW-Peripherie, ÜE anteilig je 100 Melder",
               [["063.01.002.01001", 0.01], ["063.03.001.01001", 0.01], ["063.03.002.01001", 0.01]], True),
             O("BMZ 4 R / 250 M.", "BMZ 4 Ringe, FW-Peripherie, ÜE anteilig je 250 Melder",
               [["063.01.002.02001", 0.004], ["063.03.001.01001", 0.004], ["063.03.002.01001", 0.004]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "456.03", "kg": "456", "name": "Einbruchmeldeanlage komplett", "einheit": "St",
     "lang": "Einbruchmeldeanlage je Objekt (Funk für Einfamilienhaus bzw. verdrahtet nach VdS-Klasse) mit Meldern, "
             "Signalgeber und Leitungen; Videoüberwachung und Zutrittskontrolle nach Wahl.",
     "bezug": "Anzahl der Objekte",
     "schichten": [
         {"name": "EMA", "optionen": [
             O("Funk EFH", "Funk-EMA Einfamilienhaus, Grundausstattung", [["063.02.001.01001", 1]], True),
             O("VdS A klein", "Zentrale Klasse A, 4 Bewegungsmelder, 8 Magnetkontakte, Außensirene",
               [["063.04.001.01001", 1], ["063.04.002.01001", 4], ["063.04.002.02001", 8], ["063.04.002.05001", 1], [JY4, 200.0]], True),
             O("VdS B Gewerbe", "Zentrale Klasse B, 10 BM, 20 MK, 4 GBM, 4 Riegelkontakte, Sirene",
               [["063.04.001.02001", 1], ["063.04.002.01001", 10], ["063.04.002.02001", 20], ["063.04.002.03001", 4],
                ["063.04.002.04001", 4], ["063.04.002.05001", 1], [JY4, 300.0], [JY2, 300.0]], True),
             O("VdS C", "Zentrale Klasse C, 20 BM, 30 MK, 8 GBM, 6 Riegelkontakte, 2 Sirenen",
               [["063.04.001.03001", 1], ["063.04.002.01001", 20], ["063.04.002.02001", 30], ["063.04.002.03001", 8],
                ["063.04.002.04001", 6], ["063.04.002.05001", 2], [JY4, 500.0], [JY2, 500.0]])]},
         {"name": "Video", "optionen": [
             ohne("ohne Videoüberwachung"),
             O("2 Kam. + NVR", "2 IP-Kameras außen, Rekorder 8 Kanäle, Leitung", [["063.04.003.02001", 2], ["063.04.004.01001", 1], [CAT7, 60.0]], True),
             O("6 Kam. + NVR", "6 IP-Kameras (4 außen, 2 innen), Rekorder 8 Kanäle", [["063.04.003.02001", 4], ["063.04.003.01001", 2], ["063.04.004.01001", 1], [CAT7, 180.0]])]},
         {"name": "Zutritt", "optionen": [
             ohne("ohne Zutrittskontrolle"),
             O("1 Tür ZK", "Zutrittskontrolle 1 Tür (Leser mit Steuerung)", [["063.02.006.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "456.04", "kg": "456", "name": "Zutrittskontrolle je Tür", "einheit": "St",
     "lang": "Elektronische Zutrittskontrolle je Tür mit Leser bzw. elektronischem Beschlag, Türsteuerung, Leitung, "
             "anteiliger Software und Identmedien nach Wahl.",
     "bezug": "Anzahl der Türen",
     "schichten": [
         {"name": "Leser", "optionen": [
             O("Wandleser innen", "Wandleser innen, Türsteuermodul, E-Öffner, Leitung 20 m",
               [["064.01.001.01001", 1], ["064.01.005.01001", 1], ["062.01.004.02001", 1], [JY4, 20.0]], True),
             O("Wandleser außen", "Wandleser außen vandalismusgeschützt, Türsteuermodul, E-Öffner, Leitung 20 m",
               [["064.01.001.02001", 1], ["064.01.005.01001", 1], ["062.01.004.02001", 1], [JY4, 20.0]], True),
             O("E-Beschlag online", "Elektronischer Langschild-Beschlag online verkabelt", [["064.01.002.01001", 1], [JY4, 15.0]], True),
             O("E-Beschlag Panik", "Elektronischer Langschild-Beschlag für Panikschloss", [["064.01.002.02001", 1], [JY4, 15.0]]),
             O("Knaufzylinder", "Elektronischer Knaufzylinder online Funk", [["064.01.003.01001", 1]], True)]},
         {"name": "Software anteilig", "optionen": [
             O("bis 10 Türen", "Software und Server anteilig (System bis 10 Türen)", [["064.01.006.01001", 0.1]], True),
             O("bis 50 Türen", "Software und Server anteilig (System bis 50 Türen)", [["064.01.006.02001", 0.02]], True)]},
         {"name": "Identmedien", "optionen": [
             ohne("ohne (gesondert)"),
             O("10 Karten", "10 Identmedien Karte ISO", [["064.01.007.01001", 10]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "456.05", "kg": "456", "name": "Videokamera komplett", "einheit": "St",
     "lang": "IP-Videokamera komplett mit Datenleitung (PoE), anteiligem Netzwerk-Videorekorder und Einrichtung.",
     "bezug": "Anzahl der Kameras",
     "schichten": [
         {"name": "Kamera", "optionen": [
             O("Dome innen", "IP-Kamera Dome innen", [["063.04.003.01001", 1]], True),
             O("Bullet außen", "IP-Kamera Bullet außen IP67", [["063.04.003.02001", 1]], True),
             O("PTZ außen", "IP-Kamera PTZ außen", [["063.04.003.03001", 1]], True)]},
         {"name": "Leitung", "optionen": [
             O("Cat 7 30 m", "Datenkabel Cat 7, ca. 30 m", [[CAT7, 30.0]], True),
             O("Cat 7 60 m", "Datenkabel Cat 7, ca. 60 m", [[CAT7, 60.0]], True)]},
         {"name": "Rekorder anteilig", "optionen": [
             O("NVR 8 K.", "Netzwerk-Videorekorder 8 Kanäle anteilig", [["063.04.004.01001", 1 / 8]], True),
             O("NVR 16 K.", "Netzwerk-Videorekorder 16 Kanäle anteilig", [["063.04.004.02001", 1 / 16]], True),
             O("NVR 32 K.", "Netzwerk-Videorekorder 32 Kanäle anteilig", [["063.04.004.03001", 1 / 32]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "456.06", "kg": "456", "name": "Brandmelderzentrale komplett", "einheit": "St",
     "lang": "Brandmelderzentrale nach DIN EN 54-2 mit Feuerwehr-Peripherie (FSD, FBF/FAT, Freischaltelement), "
             "Übertragungseinrichtung und Rauchansaugsystem nach Wahl; Melder gesondert.",
     "bezug": "Anzahl der Anlagen",
     "schichten": [
         {"name": "Zentrale", "optionen": [
             O("BMZ 2 Ringe", "Brandmelderzentrale 2 Ringe", [["063.01.002.01001", 1]], True),
             O("BMZ 4 Ringe", "Brandmelderzentrale 4 Ringe", [["063.01.002.02001", 1]], True)]},
         {"name": "Feuerwehr", "optionen": [
             O("FW-Peripherie", "FSD, FBF/FAT, Freischaltelement", [["063.03.001.01001", 1]], True),
             O("FW-Periph. + ÜE", "FW-Peripherie und Übertragungseinrichtung", [["063.03.001.01001", 1], ["063.03.002.01001", 1]], True)]},
         {"name": "RAS", "optionen": [
             ohne("ohne Rauchansaugsystem"),
             O("RAS 500 m²", "Rauchansaugsystem für 500 m²", [["063.03.004.01001", 1]], True),
             O("RAS 1.500 m²", "Rauchansaugsystem für 1.500 m²", [["063.03.004.02001", 1]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "457.01", "kg": "457", "name": "Datendose komplett", "einheit": "St",
     "lang": "Datenanschluss Kategorie 6A komplett: Datendose, Installationskabel (ca. 25 m je Port), anteiliges "
             "Patchfeld bzw. Verteiler, Messung und Patchkabel je Port.",
     "bezug": "Anzahl der Datendosen",
     "schichten": [
         {"name": "Dose + Kabel", "optionen": [
             O("1-f. Massiv", "Datendose 1-fach UP Massivwand, Cat 7 ca. 25 m", [["061.01.002.01001", 1], [CAT7, 25.0], ["061.01.006.01001", 1], ["061.03.006.02001", 1]], True),
             O("2-f. Massiv", "Datendose 2-fach UP Massivwand, Cat 7 ca. 50 m", [["061.01.002.02001", 1], [CAT7, 50.0], ["061.01.006.01001", 2], ["061.03.006.02001", 2]], True),
             O("2-f. Massiv 7A", "Datendose 2-fach UP Massivwand, Cat 7A ca. 50 m", [["061.01.002.02001", 1], [CAT7A, 50.0], ["061.01.006.01001", 2], ["061.03.006.02001", 2]]),
             O("2-f. Hohlwand", "Datendose 2-fach Hohlwand, Cat 7 ca. 50 m", [["061.01.002.02005", 1], [CAT7, 50.0], ["061.01.006.01001", 2], ["061.03.006.02001", 2]], True),
             O("2-f. Brüstungsk.", "Datendose 2-fach im Brüstungskanal, Cat 7 ca. 50 m", [["061.01.002.02013", 1], [CAT7, 50.0], ["061.01.006.01001", 2], ["061.03.006.02001", 2]], True),
             O("2-f. Bestand", "Datendose 2-fach UP im Bestand, Cat 7 ca. 50 m", [["061.01.002.02002", 1], [CAT7, 50.0], ["061.01.006.01001", 2], ["061.03.006.02001", 2]])]},
         {"name": "Verteiler anteilig", "optionen": [
             O("MMV EFH", "Multimediaverteiler EFH mit Patchfeld 12 Port anteilig (8 Dosen)", [["061.01.005.01001", 0.125]], True),
             O("Patch + 12 HE", "Patchfeld 24 Port je 12 Dosen, Wandschrank 12 HE je 24 Dosen", [["061.01.003.01001", 1 / 12], ["061.01.004.01001", 1 / 24]], True),
             O("Patch + 42 HE", "Patchfeld 24 Port je 12 Dosen, Standschrank 42 HE je 96 Dosen", [["061.01.003.01001", 1 / 12], ["061.01.004.02001", 1 / 96], ["061.03.007.01001", 1 / 12]], True)]},
         {"name": "Leerrohr", "optionen": [
             ohne("Kabel in Kanal/Trasse bzw. Hohlwand"),
             O("Rohr M25 25 m", "Installationsrohr M25, ca. 25 m", [["053.03.003.02001", 25.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "457.02", "kg": "457", "name": "Netzwerkverteiler komplett", "einheit": "St",
     "lang": "Netzwerk-Etagenverteiler mit 19\"-Schrank, Patchfeldern, Kabelmanagement, aktiven Komponenten und USV "
             "nach Wahl, Erdung und Dokumentation.",
     "bezug": "Anzahl der Verteiler",
     "fest": [["061.03.008.01001", 1], ["061.03.009.01001", 1]],
     "schichten": [
         {"name": "Schrank + Patch", "optionen": [
             O("12 HE, 1 × 24", "Wandschrank 12 HE, 1 Patchfeld 24 Port", [["061.01.004.01001", 1], ["061.01.003.01001", 1], ["061.03.007.01001", 1]], True),
             O("42 HE, 2 × 24", "Standschrank 42 HE, 2 Patchfelder 24 Port", [["061.01.004.02001", 1], ["061.01.003.01001", 2], ["061.03.007.01001", 2]], True),
             O("42 HE, 4 × 24", "Standschrank 42 HE, 4 Patchfelder 24 Port", [["061.01.004.02001", 1], ["061.01.003.01001", 4], ["061.03.007.01001", 4]], True)]},
         {"name": "Switch", "optionen": [
             ohne("aktive Komponenten durch Nutzer"),
             O("24 P PoE+", "Switch managed 24 Port PoE+, Patchkabel", [["061.03.004.02001", 1], ["061.03.006.01001", 24]], True),
             O("48 P PoE+", "Switch managed 48 Port PoE+, Patchkabel", [["061.03.004.04001", 1], ["061.03.006.01001", 48]], True)]},
         {"name": "USV", "optionen": [
             ohne("ohne USV"),
             O("USV 1.500 VA", "USV 19\" 1.500 VA online", [["061.03.005.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "457.03", "kg": "457", "name": "LWL-Backbone", "einheit": "m",
     "lang": "LWL-Steigleitung Singlemode OS2 zwischen Verteilern, einschließlich anteiliger Spleißboxen an beiden Enden "
             "(je 50 m Strecke), Messung je Faser, Verlegung und Abschottung nach Wahl.",
     "bezug": "Kabellänge",
     "schichten": [
         {"name": "Kabel", "optionen": [
             O("OS2 12 Fasern", "LWL OS2 12 Fasern, Spleißboxen 12 Pigtails anteilig", [["061.03.001.01001", 1.0], ["061.03.002.01001", 0.04], ["061.03.003.01001", 0.24]], True),
             O("OS2 24 Fasern", "LWL OS2 24 Fasern, Spleißboxen 24 Pigtails anteilig", [["061.03.001.02001", 1.0], ["061.03.002.02001", 0.04], ["061.03.003.01001", 0.48]], True),
             O("OS2 48 Fasern", "LWL OS2 48 Fasern, 2 × Spleißboxen 24 anteilig", [["061.03.001.03001", 1.0], ["061.03.002.02001", 0.08], ["061.03.003.01001", 0.96]])]},
         {"name": "Verlegung", "optionen": [
             O("Rohr M32", "Installationsrohr M32", [["053.03.003.03001", 1.0]], True),
             O("auf Trasse", "auf vorhandener Kabeltrasse", [], True)]},
         {"name": "Brandschutz", "optionen": [
             ohne("ohne"),
             O("Abschottung", "Kabelabschottung je 10 m", [["047.02.004.01001", 0.1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "457.04", "kg": "457", "name": "WLAN-Access-Point komplett", "einheit": "St",
     "lang": "WLAN-Access-Point PoE an der Decke komplett mit Datenkabel, Anschlussdose und anteiligem PoE-Switch.",
     "bezug": "Anzahl der Access Points",
     "fest": [["061.01.008.01001", 1], ["061.01.006.01001", 1], ["061.03.006.02001", 1]],
     "schichten": [
         {"name": "Kabel", "optionen": [
             O("Cat 7 30 m", "Datenkabel Cat 7, ca. 30 m", [[CAT7, 30.0]], True),
             O("Cat 7 50 m", "Datenkabel Cat 7, ca. 50 m", [[CAT7, 50.0]], True)]},
         {"name": "Anschluss", "optionen": [
             O("Dose 1-fach", "Datendose 1-fach Aufputz an der Decke", [["061.01.002.01009", 1]], True),
             ohne("Direktanschluss (Stecker konfektioniert)")]},
         {"name": "PoE-Switch anteilig", "optionen": [
             O("24 P PoE / 12", "PoE+-Switch 24 Port anteilig (12 AP)", [["061.03.004.02001", 1 / 12]], True),
             O("48 P PoE / 24", "PoE+-Switch 48 Port anteilig (24 AP)", [["061.03.004.04001", 1 / 24]], True)]},
     ], "tags": ["neubau", "altbau"]},
]

# ================================================================================================ 461 Aufzüge
V += [
    {"id": "461.01", "kg": "461", "name": "Personenaufzug komplett", "einheit": "St",
     "lang": "Elektrischer Personenaufzug nach DIN EN 81-20 komplett mit Kabine, Schacht- und Kabinentüren, Steuerung, "
             "Notrufsystem, Schachtgrubenleiter und -beleuchtung, Montagehilfen, Prüfung vor Inbetriebnahme durch ZÜS.",
     "bezug": "Anzahl der Aufzüge",
     "fest": [["069.03.003.01001", 1], ["069.03.006.01001", 1], ["069.03.005.01001", 1]],
     "schichten": [
         {"name": "Aufzug", "optionen": [
             O("630 kg / 3 HS", "Personenaufzug 630 kg, 3 Haltestellen", [["069.01.001.01001", 1], ["069.03.004.01001", 3]], True),
             O("630 kg / 4 HS", "Personenaufzug 630 kg, 4 Haltestellen", [["069.01.001.02001", 1], ["069.03.004.01001", 4]], True),
             O("1000 kg / 4 HS", "Personenaufzug 1000 kg (Krankentrage), 4 Haltestellen", [["069.01.001.03001", 1], ["069.03.004.01001", 4]], True),
             O("1000 kg / 6 HS", "Personenaufzug 1000 kg, 6 Haltestellen", [["069.01.001.04001", 1], ["069.03.004.01001", 6]], True),
             O("1275 kg / 6 HS", "Personenaufzug 1275 kg, 1,6 m/s, 6 Haltestellen", [["069.01.001.05001", 1], ["069.03.004.01001", 6]])]},
         {"name": "Mehrpreise", "optionen": [
             ohne("ohne"),
             O("Brandfallsteuer.", "Brandfallsteuerung/Feuerwehraufzug-Vorbereitung", [["069.01.004.01001", 1]], True),
             O("Durchlader", "Durchlader/zweite Zugangsseite", [["069.01.003.01001", 1]]),
             O("+1 Haltestelle", "weitere Haltestelle", [["069.01.002.01001", 1], ["069.03.004.01001", 1]], True)]},
         {"name": "Wartung", "optionen": [
             ohne("ohne Wartungsvertrag"),
             O("Vollwartung 1 J.", "Vollwartung 1. Jahr", [["069.01.005.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "461.02", "kg": "461", "name": "Hublift/Treppenlift komplett", "einheit": "St",
     "lang": "Barrierefreie Förderanlage (Plattform-/Hublift oder Treppenlift) komplett mit Elektroanschluss und Notruf "
             "nach Wahl.",
     "bezug": "Anzahl der Anlagen",
     "schichten": [
         {"name": "Anlage", "optionen": [
             O("Hublift 1,2 m", "Plattform-/Hublift senkrecht bis 1,2 m", [["069.02.001.01001", 1]], True),
             O("Hublift 3,0 m", "Plattform-/Hublift senkrecht bis 3,0 m", [["069.02.001.02001", 1]], True),
             O("Hublift 6,0 m", "Plattform-/Hublift senkrecht bis 6,0 m", [["069.02.001.03001", 1]]),
             O("Sitzlift gerade", "Treppenlift Sitzlift gerade, ein Geschoss", [["069.02.002.01001", 1]], True),
             O("Sitzlift kurvig", "Treppenlift Sitzlift kurvig, ein Geschoss", [["069.02.002.02001", 1]], True),
             O("Plattformlift", "Treppenlift Plattformlift für Rollstuhl, gerade", [["069.02.002.03001", 1]], True)]},
         {"name": "Elektro", "optionen": [
             O("Steckdose 15 m", "Steckdose IP44, Leitung NYM 3 × 2,5 ca. 15 m, LS", [["053.04.002.05001", 1], [NYM325, 15.0], [LS1, 1], [PRUEF_SK, 1]], True),
             O("Festanschl. 400 V", "Festanschluss 400 V, NYM 5 × 2,5 ca. 15 m, LS", [[NYM525, 15.0], [LS3, 1], ["053.03.006.01001", 1], [PRUEF_SK, 1]], True)]},
         {"name": "Notruf", "optionen": [
             ohne("ohne Notruf"),
             O("Notruf EN 81-28", "Notrufsystem Mobilfunk", [["069.03.003.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "461.03", "kg": "461", "name": "Aufzugsmodernisierung", "einheit": "St",
     "lang": "Modernisierung eines bestehenden Aufzugs: Steuerung und Antrieb, Türen und Notruf nach Wahl, "
             "Prüfung durch ZÜS.",
     "bezug": "Anzahl der Aufzüge",
     "fest": [["069.03.005.01001", 1]],
     "schichten": [
         {"name": "Steuerung/Antrieb", "optionen": [
             O("Mod. 4 HS", "Steuerung und Antrieb erneuern, 4 Haltestellen", [["069.03.001.01001", 1]], True),
             O("Mod. 6 HS", "Steuerung und Antrieb erneuern, 6 Haltestellen", [["069.03.001.02001", 1]], True)]},
         {"name": "Türen", "optionen": [
             ohne("Türen bleiben"),
             O("Türen 4 HS", "Schacht- und Kabinentüren erneuern, 4 Haltestellen", [["069.03.002.01001", 4]], True),
             O("Türen 6 HS", "Schacht- und Kabinentüren erneuern, 6 Haltestellen", [["069.03.002.01001", 6]])]},
         {"name": "Notruf", "optionen": [
             O("Notruf neu", "Notrufsystem DIN EN 81-28 Mobilfunk", [["069.03.003.01001", 1]], True),
             ohne("Notruf vorhanden")]},
         {"name": "Schacht", "optionen": [
             ohne("ohne", False),
             O("Grube + Licht", "Schachtgrubenleiter und Schachtbeleuchtung", [["069.03.006.01001", 1]], True)]},
     ], "tags": ["altbau"]},
]

# ================================================================================================ 474 Feuerlöschanlagen
V += [
    {"id": "474.01", "kg": "474", "name": "Feuerlöscher komplett", "einheit": "St",
     "lang": "Tragbarer Feuerlöscher nach DIN EN 3 mit Wandhalter und Kennzeichnung, Schrank bzw. Standsäule und "
             "anteilige Flucht- und Rettungspläne nach Wahl.",
     "bezug": "Anzahl der Feuerlöscher",
     "schichten": [
         {"name": "Löscher", "optionen": [
             O("Schaum 6 l", "Schaumlöscher 6 l, 6 LE", [["049.01.001.01001", 1]], True),
             O("Schaum 9 l", "Schaumlöscher 9 l, 9 LE", [["049.01.001.02001", 1]], True),
             O("Pulver 6 kg", "Pulverlöscher ABC 6 kg, 12 LE", [["049.01.001.03001", 1]], True),
             O("CO₂ 5 kg", "CO₂-Löscher 5 kg (Elektro/IT)", [["049.01.001.04001", 1]], True),
             O("Fettbrand 6 l", "Fettbrandlöscher 6 l Klasse F", [["049.01.002.01001", 1]])]},
         {"name": "Aufbewahrung", "optionen": [
             ohne("Wandhalter (enthalten)"),
             O("Schrank", "Feuerlöscherschrank/Standsäule für 1 Löscher", [["049.01.003.01001", 1]], True)]},
         {"name": "Pläne", "optionen": [
             ohne("ohne"),
             O("Plan je 3 FL", "Flucht- und Rettungsplan je 3 Feuerlöscher, Rettungszeichen", [["049.01.005.01001", 0.33], ["049.01.006.02001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "474.02", "kg": "474", "name": "Wandhydrant komplett", "einheit": "St",
     "lang": "Wandhydrant im Schrank mit Anschlussleitung nass, Abschottungen nach Wahl und Druck-/Durchflussprüfung.",
     "bezug": "Anzahl der Wandhydranten",
     "fest": [["049.02.009.01001", 1]],
     "schichten": [
         {"name": "Hydrant", "optionen": [
             O("Typ F", "Wandhydrant Typ F (formstabil) im Schrank", [["049.02.001.01001", 1]], True),
             O("Typ S", "Wandhydrant Typ S (Selbsthilfe)", [["049.02.007.01001", 1]], True)]},
         {"name": "Anschlussleitung", "optionen": [
             O("nass DN 50, 10 m", "Löschwasserleitung nass DN 50, ca. 10 m", [["049.02.006.01001", 10.0]], True),
             O("nass DN 65, 15 m", "Löschwasserleitung nass DN 65, ca. 15 m", [["049.02.006.02001", 15.0]], True)]},
         {"name": "Brandschutz", "optionen": [
             ohne("ohne"),
             O("2 Abschottungen", "2 Rohrabschottungen 35–54 mm", [["047.02.002.02001", 2]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "474.03", "kg": "474", "name": "Steigleitung trocken je Geschoss", "einheit": "St",
     "lang": "Trockene Löschwasser-Steigleitung nach DIN 14462 je Geschoss: Steigleitung ca. 3 m, Entnahmearmatur, "
             "Abschottung und anteilige Einspeisearmatur.",
     "bezug": "Anzahl der Geschosse mit Entnahmestelle",
     "fest": [["049.02.004.01001", 1]],
     "schichten": [
         {"name": "Steigleitung", "optionen": [
             O("DN 80, 3 m", "Steigleitung trocken DN 80, ca. 3 m", [["049.02.002.01001", 3.0]], True),
             O("DN 100, 3 m", "Steigleitung trocken DN 100, ca. 3 m", [["049.02.002.02001", 3.0]], True)]},
         {"name": "Einspeisung anteilig", "optionen": [
             O("je 4 Geschosse", "Einspeisearmatur 2 × B anteilig je 4 Geschosse", [["049.02.003.01001", 0.25]], True),
             O("je 8 Geschosse", "Einspeisearmatur 2 × B anteilig je 8 Geschosse", [["049.02.003.01001", 0.125]], True)]},
         {"name": "Abschottung", "optionen": [
             O("Abschottung", "Rohrabschottung 76–108 mm je Decke", [["047.02.002.03001", 1]], True),
             ohne("ohne (Schacht mit Feuerwiderstand)", False)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "474.04", "kg": "474", "name": "Sprinkler Erweiterung", "einheit": "m²",
     "lang": "Erweiterung einer bestehenden Sprinkleranlage je m² Schutzfläche: Sprinklerköpfe und Verteilleitungen nass "
             "anteilig.",
     "bezug": "Geschützte Grundfläche",
     "schichten": [
         {"name": "Kopfabstand", "optionen": [
             O("9 m² je Kopf", "1 Sprinkler je 9 m² (höhere Brandgefahr)", [["049.02.008.01001", 0.111]], True),
             O("12 m² je Kopf", "1 Sprinkler je 12 m² (mittlere Brandgefahr)", [["049.02.008.01001", 0.083]], True),
             O("16 m² je Kopf", "1 Sprinkler je 16 m² (geringe Brandgefahr)", [["049.02.008.01001", 0.0625]], True)]},
         {"name": "Leitung", "optionen": [
             O("DN 50 0,3 m/m²", "Verteilleitung nass DN 50, ca. 0,3 m/m²", [["049.02.006.01001", 0.3]], True),
             O("DN 65 0,2 m/m²", "Verteilleitung nass DN 65, ca. 0,2 m/m²", [["049.02.006.02001", 0.2]], True)]},
     ], "tags": ["altbau"]},
]

# ================================================================================================ 48x Gebäudeautomation
V += [
    {"id": "481.01", "kg": "481", "name": "KNX-Raumautomation je Raum", "einheit": "St",
     "lang": "Raumautomation in KNX je Raum: anteilige Aktorik für Licht, Sonnenschutz und Heizung, Bediengeräte, "
             "Busleitung, anteiliges Systemzubehör, Programmierung und Einregulierung.",
     "bezug": "Anzahl der Räume",
     "fest": [["070.01.001.01001", 0.1], ["070.03.004.01001", 0.05], ["070.03.008.01001", 1]],
     "schichten": [
         {"name": "Funktionen", "optionen": [
             O("Licht + Heizung", "2 Schaltkanäle, 1 Heizkanal, 4 Datenpunkte", [["070.01.002.02001", 0.25], ["070.01.005.01001", 1 / 6], ["070.02.003.01001", 4]], True),
             O("+ Jalousie", "2 Schaltkanäle, 2 Jalousiekanäle, 1 Heizkanal, 7 Datenpunkte",
               [["070.01.002.02001", 0.25], ["070.01.003.02001", 0.25], ["070.01.005.01001", 1 / 6], ["070.02.003.01001", 7]], True),
             O("+ Dimmen", "Dimmkanal, 2 Jalousiekanäle, 1 Heizkanal, 8 Datenpunkte",
               [["070.01.004.01001", 0.5], ["070.01.003.02001", 0.25], ["070.01.005.01001", 1 / 6], ["070.02.003.01001", 8]], True),
             O("Büro Konstantl.", "Präsenzmelder Konstantlicht, DALI-Gateway anteilig, Jalousie, Heizung, 10 DP",
               [["070.01.007.01001", 1], ["070.03.004.02001", 1 / 8], ["070.01.003.02001", 0.25], ["070.01.005.01001", 1 / 6], ["070.02.003.01001", 10]])]},
         {"name": "Bedienung", "optionen": [
             O("Taster 4-f. RTR", "KNX-Tastsensor 4-fach mit Raumtemperaturregler", [["070.01.006.01001", 1]], True),
             O("Taster 8-f. RTR", "KNX-Tastsensor 8-fach mit Raumtemperaturregler", [["070.01.006.02001", 1]], True),
             O("Raumsensor CO₂", "Raumsensor CO₂/Temperatur/Feuchte, Bus", [["070.03.001.01001", 1]])]},
         {"name": "Busleitung", "optionen": [
             O("Bus 20 m", "KNX-Busleitung ca. 20 m", [["070.01.009.01001", 20.0]], True),
             O("Bus 35 m", "KNX-Busleitung ca. 35 m", [["070.01.009.01001", 35.0]], True)]},
         {"name": "Visualisierung", "optionen": [
             ohne("ohne"),
             O("Server anteilig", "Visualisierung/Smart-Home-Server anteilig je 10 Räume", [["070.02.001.01001", 0.1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "481.02", "kg": "481", "name": "Einzelraumregelung Heizung je Raum", "einheit": "St",
     "lang": "Einzelraumregelung der Heizung je Raum (Funk-Nachrüstung, Fußbodenheizung, KNX oder DDC) mit "
             "Fensterkontakten und Einregulierung nach Wahl.",
     "bezug": "Anzahl der Räume",
     "schichten": [
         {"name": "Regelung", "optionen": [
             O("Funk Bestand", "Funk-Einzelraumregelung für Heizkörper (Nachrüstung)", [["070.02.005.01001", 1]], True),
             O("FBH Thermostat", "Raumthermostat mit Stellantrieb (FBH)", [["041.03.006.01001", 1]], True),
             O("KNX RTR", "KNX-Tastsensor mit RTR, Heizaktor anteilig, Busleitung", [["070.01.006.01001", 1], ["070.01.005.01001", 1 / 6], ["070.01.009.01001", 15.0], ["070.02.003.01001", 2]], True),
             O("DDC-Fühler", "Raumtemperaturfühler, Feldverkabelung, Datenpunkt", [["070.02.004.01001", 1], ["070.03.006.01001", 1], ["070.02.003.01001", 1]])]},
         {"name": "Fensterkontakte", "optionen": [
             ohne("ohne"),
             O("1 Kontakt", "1 Fensterkontakt", [["070.03.002.01001", 1]], True),
             O("2 Kontakte", "2 Fensterkontakte", [["070.03.002.01001", 2]], True)]},
         {"name": "Einregulierung", "optionen": [
             ohne("ohne", False),
             O("Funktionstest", "Einregulierung und Funktionstest", [["070.03.008.01001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "481.03", "kg": "481", "name": "MSR-Anlage Heizung/Lüftung", "einheit": "St",
     "lang": "Mess-, Steuer- und Regelungstechnik je technischer Anlage: Automationsstation DDC mit Schaltschrank, "
             "Programmierung und Feldverkabelung der Datenpunkte, Fühler, Energiezähler, GLT-Aufschaltung, Funktionsliste und Einweisung.",
     "bezug": "Anzahl der Anlagen",
     "fest": [["070.03.007.01001", 1], ["070.03.009.01001", 4]],
     "schichten": [
         {"name": "Automationsstation", "optionen": [
             O("DDC 40 DP", "DDC 40 Datenpunkte, MSR-Schrank 1 Feld, Programmierung, Feldverkabelung",
               [["070.02.002.01001", 1], ["070.03.005.01001", 1], ["070.02.003.01001", 40], ["070.03.006.01001", 40]], True),
             O("DDC 120 DP", "DDC 120 Datenpunkte, MSR-Schrank 2 Felder, Programmierung, Feldverkabelung",
               [["070.02.002.02001", 1], ["070.03.005.02001", 1], ["070.02.003.01001", 120], ["070.03.006.01001", 120]], True)]},
         {"name": "Fühler", "optionen": [
             O("6 Fühler", "6 Temperaturfühler", [["070.02.004.01001", 6]], True),
             O("12 Fühler", "12 Temperatur- und Raumfühler", [["070.02.004.01001", 12]], True)]},
         {"name": "Energiezähler", "optionen": [
             ohne("ohne"),
             O("2 W + 1 E", "2 Wärmezähler und 1 Stromzähler M-Bus", [["070.03.003.02001", 2], ["070.03.003.01001", 1]], True),
             O("4 W + 2 E + 2 Wa", "4 Wärme-, 2 Strom-, 2 Wasserzähler M-Bus", [["070.03.003.02001", 4], ["070.03.003.01001", 2], ["070.03.003.03001", 2]])]},
         {"name": "GLT", "optionen": [
             ohne("ohne GLT-Aufschaltung"),
             O("BACnet-Gateway", "Gateway Modbus/BACnet zur GLT", [["070.03.004.03001", 1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "482.01", "kg": "482", "name": "Automationsschwerpunkt/Schaltschrank", "einheit": "St",
     "lang": "Schaltschrank als Automationsschwerpunkt mit Gateway, Energiemessung und Einweisung des Betreibers.",
     "bezug": "Anzahl der Schaltschränke",
     "schichten": [
         {"name": "Schrank", "optionen": [
             O("1 Feld", "MSR-Schaltschrank 1 Feld", [["070.03.005.01001", 1]], True),
             O("2 Felder", "MSR-Schaltschrank 2 Felder", [["070.03.005.02001", 1]], True)]},
         {"name": "Kommunikation", "optionen": [
             O("KNX-IP-Router", "Gateway KNX-IP-Router", [["070.03.004.01001", 1]], True),
             O("BACnet-Gateway", "Gateway Modbus/BACnet zur GLT", [["070.03.004.03001", 1]], True)]},
         {"name": "Energiemessung", "optionen": [
             O("2 Stromzähler", "2 Energiezähler Strom 3-phasig M-Bus", [["070.03.003.01001", 2]], True),
             O("4 Stromzähler", "4 Energiezähler Strom 3-phasig M-Bus", [["070.03.003.01001", 4]], True)]},
         {"name": "Einweisung", "optionen": [
             O("4 h", "Einweisung Betreiber 4 Stunden", [["070.03.009.01001", 4]], True),
             O("8 h", "Einweisung Betreiber 8 Stunden", [["070.03.009.01001", 8]])]},
     ], "tags": ["neubau", "altbau"]},
]

VORLAGEN = V
