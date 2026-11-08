# Bauteilvorlagen KG 360 Dächer, KG 370 Infrastrukturanlagen (Garagen, Carports), KG 380 Baukonstruktive Einbauten.
# Faktor = Menge der Position je Einheit des Bauteils.
# Annahmen geneigte Dächer (je m² Dachfläche, in der Neigung gemessen):
#   Sparrenabstand e = 75 cm → 1,33 m Sparren je m²; Flachdach-Holzbalken e = 62,5 cm → 1,6 m je m².
#   First, Ortgang, Traufe anteilig je 0,08 m je m² (Satteldach EFH, ca. 150 m² Dachfläche).
# Flachdach (je m² Dachfläche): 1 Dachablauf + 1 Notüberlauf je ca. 150 m² → 0,007 St je m².
# Dachrinne je m Traufe: 1 Fallrohr (6 m) je 10 m Traufe → 0,6 m Fallrohr je m.

# ------------------------------------------------------------------------------------------------ gemeinsame Schichten
HOLZSCHUTZ = [
    {"k": "", "t": "ohne chemischen Holzschutz (Gebrauchsklasse 0, technisch getrocknetes Holz)", "teile": [], "std": True},
    {"k": "Holzschutz GK2", "t": "vorbeugender chemischer Holzschutz GK 1–2", "teile": [["016.06.001.01001", 0.8]], "std": True},
    {"k": "Holzschutz GK3", "t": "vorbeugender chemischer Holzschutz GK 3", "teile": [["016.06.001.02001", 0.8]]},
]

UNTERDECKUNG = [
    {"k": "UD-Bahn", "t": "diffusionsoffene Unterdeckbahn, Konterlattung 40/60 mit Nageldichtband",
     "teile": [["020.01.001.01001", 1.0], ["020.01.002.01001", 1.0]], "std": True},
    {"k": "UD Holzfaser", "t": "Holzfaser-Unterdeckplatte 35 mm, Konterlattung 40/60",
     "teile": [["016.02.001.04001", 1.0], ["020.01.002.01001", 1.0]], "std": True},
    {"k": "Unterdach", "t": "Rauspundschalung 24 mm mit regensicherem Unterdach aus Bitumenbahn, Konterlattung",
     "teile": [["020.01.006.01001", 1.0], ["020.01.007.01001", 1.0], ["020.01.002.01001", 1.0]]},
]

LATTUNG = [
    {"k": "", "t": "Dachlattung 30/50 mm", "teile": [["020.01.003.01001", 1.0]], "std": True},
    {"k": "Latte 40/60", "t": "Dachlattung 40/60 mm (größere Sparrenabstände)", "teile": [["020.01.003.02001", 1.0]]},
]

DECKUNG_PFANNE = [
    {"k": "Falzziegel", "t": "Tondachziegel Falzziegel naturrot", "teile": [["020.02.001.02001", 1.0]], "std": True},
    {"k": "Flachdachpfanne", "t": "Tondachziegel Flachdachpfanne engobiert", "teile": [["020.02.001.01001", 1.0]], "std": True},
    {"k": "Ziegel glasiert", "t": "Tondachziegel glasiert", "teile": [["020.02.001.03001", 1.0]]},
    {"k": "Betonstein", "t": "Betondachsteine Frankfurter Pfanne", "teile": [["020.02.001.05001", 1.0]], "std": True},
    {"k": "Betonstein glatt", "t": "Betondachsteine glatt, flache Optik", "teile": [["020.02.001.06001", 1.0]], "std": True},
    {"k": "Metallpfanne", "t": "Metalldachpfannen Stahl, beschichtet", "teile": [["020.02.008.01001", 1.0]]},
]

ZUBEHOER_STEILDACH = [   # anteilig je m² Dachfläche
    ["020.03.001.01001", 0.08],   # First/Grat trocken
    ["020.03.002.01001", 0.08],   # Ortgang mit Ortgangziegeln
    ["020.01.005.01001", 0.08],   # Traufe Lüftungselement
    ["020.01.004.01001", 0.08],   # Traufblech
    ["020.03.004.01001", 0.01],   # Firstanfänger/Endscheibe
    ["020.04.004.01001", 0.03],   # Lüfterziegel
    ["020.04.008.01001", 0.02],   # Sicherheitsdachhaken
]

VORANSTRICH = ["021.01.001.01001", 1.0]

DAMPFSPERRE_BIT = [
    {"k": "", "t": "Dampfsperre Elastomerbitumenbahn mit Alu-Einlage, verschweißt", "teile": [["021.01.002.01001", 1.0]], "std": True},
    {"k": "DS kaltselbstkl.", "t": "Dampfsperre Kaltselbstklebebahn mit Alu-Einlage", "teile": [["021.01.002.02001", 1.0]]},
]

DAEMMUNG_FLACH = [
    {"k": "EPS 160", "t": "Wärmedämmung EPS 035 DAA dh, 160 mm", "teile": [["021.02.001.01001", 1.0]], "std": True},
    {"k": "EPS 200", "t": "Wärmedämmung EPS 035 DAA dh, 200 mm", "teile": [["021.02.001.02001", 1.0]], "std": True},
    {"k": "EPS 240", "t": "Wärmedämmung EPS 035 DAA dh, 240 mm", "teile": [["021.02.001.03001", 1.0]]},
    {"k": "PIR 120", "t": "Wärmedämmung PIR alukaschiert 023, 120 mm", "teile": [["021.02.001.04001", 1.0]]},
    {"k": "PIR 160", "t": "Wärmedämmung PIR alukaschiert 023, 160 mm", "teile": [["021.02.001.05001", 1.0]], "std": True},
    {"k": "PIR 200", "t": "Wärmedämmung PIR alukaschiert 023, 200 mm", "teile": [["021.02.001.06001", 1.0]]},
    {"k": "MW 160", "t": "Wärmedämmung Mineralwolle A1 038, 160 mm, nichtbrennbar", "teile": [["021.02.001.07001", 1.0]], "std": True},
    {"k": "MW 200", "t": "Wärmedämmung Mineralwolle A1 038, 200 mm, nichtbrennbar", "teile": [["021.02.001.08001", 1.0]]},
]

ENTW_FLACH = [
    {"k": "", "t": "Dachentwässerung anteilig: 1 Dachablauf DN 100 gedämmt und 1 Notüberlauf je ca. 150 m²",
     "teile": [["021.05.001.02001", 0.007], ["021.05.002.01001", 0.007]], "std": True},
    {"k": "ohne Entw.", "t": "ohne Dachentwässerung (gesondert erfasst)", "teile": []},
]

OBERFL_FLACH = [
    {"k": "", "t": "ohne Auflast, Abdichtung frei bewittert", "teile": [], "std": True},
    {"k": "Kies 5", "t": "Kiesschüttung 16/32, 5 cm, mit Schutzlage", "teile": [["021.06.001.01001", 1.0]], "std": True},
    {"k": "Kies 8", "t": "Kiesschüttung 16/32, 8 cm, mit Schutzlage", "teile": [["021.06.001.02001", 1.0]]},
]

DACHRAND_STB = [
    {"k": "", "t": "ohne Dachrand (gesondert erfasst)", "teile": [], "std": True},
    {"k": "Randschalung", "t": "Deckenrandschalung anteilig, ca. 0,08 m² je m²", "teile": [["013.05.001.11001", 0.08]], "std": True},
    {"k": "Attika StB", "t": "Attika Stahlbeton 20 × 50 cm anteilig (0,12 m je m²), geschalt und bewehrt",
     "teile": [["013.03.004.01001", 0.012], ["013.05.001.02001", 0.12], ["013.06.001.01001", 0.0012]], "std": True},
]

OBERFL_GK = [
    {"k": "Q2", "t": "Verspachtelung Q2, Dispersionsanstrich", "teile": [["034.02.001.03001", 1.0]], "std": True},
    {"k": "Q3", "t": "Verspachtelung Q3, Dispersionsanstrich", "teile": [["039.06.001.01001", 1.0], ["034.02.001.03001", 1.0]], "std": True},
    {"k": "Q4", "t": "Vollflächige Spachtelung Q4, Dispersionsanstrich", "teile": [["039.06.001.02001", 1.0], ["034.02.001.03001", 1.0]]},
]

VORLAGEN = [
    # =========================================================================================== 361 Dachkonstruktionen
    {"id": "361.01", "kg": "361", "name": "Sparrendach KVH", "einheit": "m²",
     "lang": "Geneigtes Dachtragwerk als Sparren- oder Kehlbalkendach aus Konstruktionsvollholz C24, Sparrenabstand ca. 75 cm, "
             "einschließlich Fußschwelle mit Verankerung, Windrispenbänder und Holzverbinder. Dachbelag gesondert (KG 363).",
     "bezug": "Dachfläche in der Neigung gemessen, einschließlich Dachüberstände",
     "fest": [["016.01.004.01001", 0.12], ["016.01.014.01001", 0.3], ["016.01.005.01001", 0.4]],
     "schichten": [
         {"name": "Sparren", "optionen": [
             {"k": "Sparren 8/18", "t": "Sparren KVH 80 × 180 mm, e ≈ 75 cm", "teile": [["016.01.002.01001", 1.33]]},
             {"k": "Sparren 8/20", "t": "Sparren KVH 80 × 200 mm, e ≈ 75 cm", "teile": [["016.01.002.02001", 1.33]], "std": True},
             {"k": "Sparren 10/22", "t": "Sparren KVH 100 × 220 mm, e ≈ 75 cm", "teile": [["016.01.002.03001", 1.33]], "std": True},
             {"k": "Sparren 10/24", "t": "Sparren KVH 100 × 240 mm, e ≈ 75 cm", "teile": [["016.01.002.04001", 1.33]], "std": True},
             {"k": "Sparren 12/26", "t": "Sparren KVH 120 × 260 mm, e ≈ 75 cm", "teile": [["016.01.002.05001", 1.33]]}]},
         {"name": "Bauart", "optionen": [
             {"k": "", "t": "Sparrendach ohne Kehlbalken", "teile": [], "std": True},
             {"k": "Kehlbalken", "t": "Kehlbalkendach, Kehlbalken/Zangen KVH 80 × 200 mm", "teile": [["016.01.009.02001", 0.5]], "std": True},
             {"k": "Aufschieblinge", "t": "Sparrendach mit Traufaufschieblingen", "teile": [["016.01.013.01001", 0.1]]}]},
         {"name": "Schalung", "optionen": [
             {"k": "", "t": "ohne Dachschalung (Unterdeckung auf Sparren)", "teile": [], "std": True},
             {"k": "OSB 22", "t": "Dachschalung OSB/3, N+F, 22 mm", "teile": [["016.02.001.02001", 1.0]], "std": True},
             {"k": "Rauspund 24", "t": "Dachschalung Rauspund Nadelholz 24 mm", "teile": [["016.02.001.01001", 1.0]]},
             {"k": "Sichtschalung", "t": "Sichtschalung Fichte gehobelt, N+F, 19 mm", "teile": [["016.02.001.03001", 1.0]]}]},
         {"name": "Holzschutz", "optionen": HOLZSCHUTZ},
     ], "tags": ["neubau"]},

    {"id": "361.02", "kg": "361", "name": "Pfettendach KVH/BSH", "einheit": "m²",
     "lang": "Geneigtes Pfettendach mit Sparren aus KVH C24 auf First-, Mittel- und Fußpfetten aus Brettschichtholz, "
             "mit Stielen, Kopfbändern und Zangen, Holzverbindern und Windrispen. Dachbelag gesondert (KG 363).",
     "bezug": "Dachfläche in der Neigung gemessen, einschließlich Dachüberstände",
     "fest": [["016.01.004.01001", 0.15], ["016.01.010.01001", 0.12], ["016.01.011.01001", 0.05],
              ["016.01.009.01001", 0.3], ["016.01.014.01001", 0.3], ["016.01.005.01001", 0.6]],
     "schichten": [
         {"name": "Sparren", "optionen": [
             {"k": "Sparren 8/18", "t": "Sparren KVH 80 × 180 mm, e ≈ 75 cm", "teile": [["016.01.002.01001", 1.33]], "std": True},
             {"k": "Sparren 8/20", "t": "Sparren KVH 80 × 200 mm, e ≈ 75 cm", "teile": [["016.01.002.02001", 1.33]], "std": True},
             {"k": "Sparren 10/22", "t": "Sparren KVH 100 × 220 mm, e ≈ 75 cm", "teile": [["016.01.002.03001", 1.33]]}]},
         {"name": "Pfetten", "optionen": [
             {"k": "Pfette 12/24", "t": "Pfetten BSH GL24h 120 × 240 mm, ca. 0,25 m je m²", "teile": [["016.01.003.01001", 0.25]], "std": True},
             {"k": "Pfette 14/28", "t": "Pfetten BSH GL24h 140 × 280 mm, ca. 0,25 m je m²", "teile": [["016.01.003.02001", 0.25]], "std": True},
             {"k": "Pfette 16/32", "t": "Pfetten BSH GL24h 160 × 320 mm, ca. 0,25 m je m²", "teile": [["016.01.003.03001", 0.25]]}]},
         {"name": "Schalung", "optionen": [
             {"k": "", "t": "ohne Dachschalung (Unterdeckung auf Sparren)", "teile": [], "std": True},
             {"k": "OSB 22", "t": "Dachschalung OSB/3, N+F, 22 mm", "teile": [["016.02.001.02001", 1.0]], "std": True},
             {"k": "Rauspund 24", "t": "Dachschalung Rauspund Nadelholz 24 mm", "teile": [["016.02.001.01001", 1.0]], "std": True}]},
         {"name": "Holzschutz", "optionen": HOLZSCHUTZ},
     ], "tags": ["neubau"]},

    {"id": "361.03", "kg": "361", "name": "Holzbalken-Flachdach", "einheit": "m²",
     "lang": "Flachdachtragwerk aus Holzbalken KVH C24, Abstand ca. 62,5 cm, mit oberseitiger Schalung als Abdichtungsträger, "
             "Auflagerschwelle und Holzverbindern. Dämmung und Abdichtung gesondert (KG 363).",
     "bezug": "Dachfläche (Grundrissprojektion), einschließlich Dachüberstände",
     "fest": [["016.01.004.01001", 0.15], ["016.01.005.01001", 0.4]],
     "schichten": [
         {"name": "Balkenlage", "optionen": [
             {"k": "Balken 10/22", "t": "Dachbalken KVH 100 × 220 mm, e ≈ 62,5 cm", "teile": [["016.01.002.03001", 1.6]], "std": True},
             {"k": "Balken 10/24", "t": "Dachbalken KVH 100 × 240 mm, e ≈ 62,5 cm", "teile": [["016.01.002.04001", 1.6]], "std": True},
             {"k": "Balken 12/26", "t": "Dachbalken KVH 120 × 260 mm, e ≈ 62,5 cm", "teile": [["016.01.002.05001", 1.6]], "std": True}]},
         {"name": "Schalung", "optionen": [
             {"k": "OSB 22", "t": "Schalung OSB/3, N+F, 22 mm", "teile": [["016.02.001.02001", 1.0]], "std": True},
             {"k": "Rauspund 24", "t": "Schalung Rauspund Nadelholz 24 mm", "teile": [["016.02.001.01001", 1.0]], "std": True}]},
         {"name": "Unterzug", "optionen": [
             {"k": "", "t": "ohne Unterzug (Spannweite bis ca. 5 m)", "teile": [], "std": True},
             {"k": "UZ BSH 14/28", "t": "Unterzug BSH GL24h 140 × 280 mm, ca. 0,2 m je m², mit Stütze", "teile": [["016.01.003.02001", 0.2], ["016.01.010.03001", 0.05]], "std": True},
             {"k": "UZ BSH 20/40", "t": "Unterzug BSH GL24h 200 × 400 mm, ca. 0,2 m je m², mit Stütze", "teile": [["016.01.003.04001", 0.2], ["016.01.010.04001", 0.05]]}]},
         {"name": "Holzschutz", "optionen": HOLZSCHUTZ[:2]},
     ], "tags": ["neubau"]},

    {"id": "361.04", "kg": "361", "name": "Stahlbeton-Flachdach Ortbeton", "einheit": "m²",
     "lang": "Dachdecke aus Ortbeton als Stahlbetonplatte, komplett mit Schalung und Bewehrung, Raumhöhe bis 3 m. "
             "Dachrand und Zulagen wählbar; Dämmung und Abdichtung gesondert (KG 363), Untersicht KG 364.",
     "bezug": "Deckenfläche, Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             {"k": "StB 18", "t": "Stahlbetondecke komplett, d = 18 cm, C25/30", "teile": [["013.09.003.01001", 1.0]], "std": True},
             {"k": "StB 20", "t": "Stahlbetondecke komplett, d = 20 cm, C25/30", "teile": [["013.09.003.02001", 1.0]], "std": True},
             {"k": "StB 22", "t": "Stahlbetondecke komplett, d = 22 cm, C25/30", "teile": [["013.09.003.03001", 1.0]], "std": True},
             {"k": "StB 25", "t": "Stahlbetondecke komplett, d = 25 cm, C30/37", "teile": [["013.09.003.04001", 1.0]], "std": True},
             {"k": "StB 30", "t": "Stahlbetondecke komplett, d = 30 cm, C30/37", "teile": [["013.09.003.05001", 1.0]]}]},
         {"name": "Dachrand", "optionen": DACHRAND_STB},
         {"name": "Zulagen", "optionen": [
             {"k": "", "t": "ohne Zulagen", "teile": [], "std": True},
             {"k": "Einbauteile", "t": "Leerdosen/Leerrohre und Aussparungen anteilig", "teile": [["013.07.007.01001", 0.1], ["013.05.003.01001", 0.03]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "361.05", "kg": "361", "name": "StB-Flachdach Elementdecke", "einheit": "m²",
     "lang": "Dachdecke aus Elementdecken-Fertigteilplatten mit Ortbetonergänzung und Zulagebewehrung (Lagermatten). "
             "Dämmung und Abdichtung gesondert (KG 363).",
     "bezug": "Deckenfläche, Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Fertigteilplatte", "optionen": [
             {"k": "Element 5", "t": "Elementdecke, Fertigteilplatte d = 5 cm", "teile": [["013.04.003.01001", 1.0]], "std": True},
             {"k": "Element 6", "t": "Elementdecke, Fertigteilplatte d = 6 cm", "teile": [["013.04.003.02001", 1.0]], "std": True}]},
         {"name": "Aufbeton", "optionen": [
             {"k": "Aufbeton 14", "t": "Aufbeton C25/30 d = 14 cm, Zulagebewehrung ca. 10 kg/m²", "teile": [["013.04.002.01001", 1.0], ["013.06.002.01001", 0.010]], "std": True},
             {"k": "Aufbeton 18", "t": "Aufbeton C25/30 d = 18 cm, Zulagebewehrung ca. 14 kg/m²", "teile": [["013.04.002.02001", 1.0], ["013.06.002.01001", 0.014]], "std": True}]},
         {"name": "Dachrand", "optionen": DACHRAND_STB},
     ], "tags": ["neubau"]},

    {"id": "361.06", "kg": "361", "name": "Flachdach Spannbeton-Hohldielen", "einheit": "m²",
     "lang": "Dachdecke aus Spannbeton-Hohlplatten, geliefert und verlegt, mit Fugenverguss; für größere Spannweiten "
             "(Gewerbe, Hallenanbauten). Ringbalken und Dachrand wählbar.",
     "bezug": "Deckenfläche, Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             {"k": "Hohldiele 20", "t": "Spannbeton-Hohldielen 20 cm", "teile": [["013.04.004.01001", 1.0]], "std": True},
             {"k": "Hohldiele 26,5", "t": "Spannbeton-Hohldielen 26,5 cm", "teile": [["013.04.004.02001", 1.0]], "std": True}]},
         {"name": "Auflager", "optionen": [
             {"k": "", "t": "Auflager auf vorhandener Konstruktion", "teile": [], "std": True},
             {"k": "Ringbalken", "t": "Ringbalken C25/30 anteilig, ca. 0,012 m³ je m²", "teile": [["013.04.006.01001", 0.012]], "std": True}]},
         {"name": "Dachrand", "optionen": DACHRAND_STB},
     ], "tags": ["neubau"]},

    {"id": "361.07", "kg": "361", "name": "Flachdach Brettsperrholz", "einheit": "m²",
     "lang": "Dachtragwerk aus Brettsperrholz-Elementen (CLT), vorgefertigt, mit Kran montiert, einschließlich Verbindungsmitteln. "
             "Optional mit Unterzug aus Brettschichtholz und Oberflächenbehandlung der Sichtseite.",
     "bezug": "Dachfläche (Grundrissprojektion)",
     "fest": [["016.01.016.01001", 0.01], ["016.01.005.01001", 0.5]],
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             {"k": "BSP 140", "t": "Brettsperrholz 140 mm, Nichtsichtqualität", "teile": [["016.05.002.01001", 1.0]], "std": True},
             {"k": "BSP 160 Sicht", "t": "Brettsperrholz 160 mm, Wohnsichtqualität", "teile": [["016.05.002.03001", 1.0]], "std": True},
             {"k": "BSP 200", "t": "Brettsperrholz 200 mm, Nichtsichtqualität", "teile": [["016.05.002.02001", 1.0]], "std": True}]},
         {"name": "Unterzug", "optionen": [
             {"k": "", "t": "ohne Unterzug", "teile": [], "std": True},
             {"k": "UZ BSH 14/28", "t": "Unterzug BSH GL24h 140 × 280 mm, ca. 0,2 m je m²", "teile": [["016.01.003.02001", 0.2]], "std": True},
             {"k": "UZ BSH 20/40", "t": "Unterzug BSH GL24h 200 × 400 mm, ca. 0,15 m je m²", "teile": [["016.01.003.04001", 0.15]], "std": True}]},
         {"name": "Oberfläche", "optionen": [
             {"k": "", "t": "Sichtseite unbehandelt", "teile": [], "std": True},
             {"k": "lasiert", "t": "Sichtseite mit Imprägniergrund und Dünnschichtlasur", "teile": [["034.03.002.08001", 1.0]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "361.08", "kg": "361", "name": "Hallendach Stahl + Trapezblech", "einheit": "m²",
     "lang": "Dachtragwerk für Hallen aus Stahlrahmen und Dachpfetten mit Verbänden und Trapezprofil-Tragschale; "
             "Korrosionsschutz wählbar. Wärmedämmung und Abdichtung gesondert (KG 363).",
     "bezug": "Dachfläche (Grundrissprojektion), Stahlgewichte als Mittelwerte je m²",
     "fest": [["017.04.008.01001", 1.5]],
     "schichten": [
         {"name": "Haupttragwerk", "optionen": [
             {"k": "Rahmen 15 kg", "t": "Stahlrahmen S235, ca. 15 kg/m² (Spannweite bis ca. 15 m)", "teile": [["017.01.001.01001", 15.0]], "std": True},
             {"k": "Rahmen 25 kg", "t": "Stahlrahmen S235, ca. 25 kg/m² (Spannweite bis ca. 25 m)", "teile": [["017.01.001.01001", 25.0]], "std": True},
             {"k": "ohne Rahmen", "t": "ohne Haupttragwerk (Auflager auf Bindern/Wänden)", "teile": []}]},
         {"name": "Pfetten", "optionen": [
             {"k": "Pfetten IPE", "t": "Dachpfetten Walzprofil IPE/U, ca. 9 kg/m²", "teile": [["017.04.006.01001", 9.0]], "std": True},
             {"k": "Pfetten Z/C", "t": "Dachpfetten Z-/C-Profil bandverzinkt, ca. 7 kg/m²", "teile": [["017.04.007.01001", 7.0]], "std": True}]},
         {"name": "Tragschale", "optionen": [
             {"k": "TR 85", "t": "Trapezprofil Stahl t = 0,75 mm, Höhe 85 mm", "teile": [["017.04.009.01001", 1.0]], "std": True},
             {"k": "TR 135", "t": "Trapezprofil Stahl t = 0,88 mm, Höhe 135 mm", "teile": [["017.04.009.02001", 1.0]], "std": True},
             {"k": "TR 160", "t": "Trapezprofil Stahl t = 1,00 mm, Höhe 160 mm", "teile": [["017.04.009.03001", 1.0]]}]},
         {"name": "Korrosionsschutz", "optionen": [
             {"k": "KS C2", "t": "Beschichtungssystem C2 (innen, beheizt), ca. 0,5 m² je m²", "teile": [["017.02.002.01001", 0.5]], "std": True},
             {"k": "KS C3", "t": "Beschichtungssystem C3, ca. 0,5 m² je m²", "teile": [["017.02.002.02001", 0.5]]},
             {"k": "", "t": "ohne zusätzlichen Korrosionsschutz", "teile": []}]},
     ], "tags": ["neubau"]},

    {"id": "361.09", "kg": "361", "name": "Hallendach BSH-Binder", "einheit": "m²",
     "lang": "Dachtragwerk aus Brettschichtholz-Bindern und Pfetten mit Holzverbindern, mit Kran montiert, "
             "einschließlich Dachschale als Träger für Dämmung und Abdichtung.",
     "bezug": "Dachfläche (Grundrissprojektion), Holzmenge als Mittelwert je m²",
     "fest": [["016.01.005.01001", 1.0], ["016.01.016.01001", 0.02], ["016.01.014.01001", 0.3]],
     "schichten": [
         {"name": "Tragwerk", "optionen": [
             {"k": "BSH GL24h", "t": "Binder und Pfetten BSH GL24h, ca. 0,05 m³ je m²", "teile": [["016.01.001.02001", 0.05]], "std": True},
             {"k": "BSH GL28h", "t": "Binder und Pfetten BSH GL28h, ca. 0,05 m³ je m²", "teile": [["016.01.001.03001", 0.05]], "std": True},
             {"k": "KVH", "t": "Tragwerk KVH C24 (kleinere Spannweiten), ca. 0,045 m³ je m²", "teile": [["016.01.001.01001", 0.045]]}]},
         {"name": "Dachschale", "optionen": [
             {"k": "TR 135", "t": "Trapezprofil Stahl 0,88 mm, Höhe 135 mm", "teile": [["017.04.009.02001", 1.0]], "std": True},
             {"k": "OSB 22", "t": "Schalung OSB/3, N+F, 22 mm", "teile": [["016.02.001.02001", 1.0]], "std": True},
             {"k": "Sichtschalung", "t": "Sichtschalung Fichte gehobelt, N+F, 19 mm", "teile": [["016.02.001.03001", 1.0]], "std": True}]},
         {"name": "Holzschutz", "optionen": HOLZSCHUTZ[:2]},
     ], "tags": ["neubau"]},

    {"id": "361.10", "kg": "361", "name": "Dachstuhl Bestand instandsetzen", "einheit": "m²",
     "lang": "Instandsetzung eines bestehenden Dachstuhls: schadhafte Hölzer austauschen, ggf. Bekämpfung von Holzschädlingen, "
             "Sparren für höhere Dämmstärken aufdoppeln und vorbeugend schützen. Holzschutztechnische Untersuchung vorab empfohlen.",
     "bezug": "Dachfläche in der Neigung gemessen",
     "schichten": [
         {"name": "Holzaustausch", "optionen": [
             {"k": "", "t": "ohne Holzaustausch", "teile": []},
             {"k": "Austausch 10 %", "t": "Holzbauteile austauschen, bis 10 × 20 cm, ca. 0,15 m je m²", "teile": [["016.06.003.01001", 0.15]], "std": True},
             {"k": "Austausch 25 %", "t": "Holzbauteile austauschen, bis 16 × 24 cm, ca. 0,3 m je m²", "teile": [["016.06.003.02001", 0.3]], "std": True}]},
         {"name": "Schädlinge", "optionen": [
             {"k": "", "t": "ohne Schädlingsbekämpfung", "teile": [], "std": True},
             {"k": "Heißluft", "t": "Bekämpfung Hausbock/Anobien im Heißluftverfahren", "teile": [["016.06.002.01001", 1.0]], "std": True}]},
         {"name": "Reinigung", "optionen": [
             {"k": "", "t": "ohne Reinigung", "teile": [], "std": True},
             {"k": "gereinigt", "t": "Holzbauteile reinigen, Altanstrich entfernen, ca. 0,8 m² je m²", "teile": [["016.06.007.01001", 0.8]]}]},
         {"name": "Aufdopplung", "optionen": [
             {"k": "", "t": "ohne Aufdopplung", "teile": [], "std": True},
             {"k": "Aufdopplung +6", "t": "Sparren aufdoppeln für höhere Dämmstärke, +60 mm", "teile": [["016.06.004.01001", 1.0]], "std": True},
             {"k": "Aufdopplung +10", "t": "Sparren aufdoppeln für höhere Dämmstärke, +100 mm", "teile": [["016.06.004.02001", 1.0]], "std": True}]},
         {"name": "Holzschutz", "optionen": [
             {"k": "", "t": "ohne chemischen Holzschutz", "teile": [], "std": True},
             {"k": "Holzschutz GK2", "t": "vorbeugender Holzschutz Neuholz, GK 2, gestrichen", "teile": [["082.03.004.02001", 0.3]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "361.11", "kg": "361", "name": "Dachgaube Holz", "einheit": "St",
     "lang": "Dachgaube in Holzbauweise einschließlich Sparrenwechsel und Verwahrung der Anschlüsse an die Dachfläche in Titanzink. "
             "Wangenbekleidung und Gaubenfenster wählbar; Eindeckung der Hauptdachfläche gesondert.",
     "bezug": "Stück je Gaube",
     "fest": [["016.01.007.02001", 1.0], ["022.02.012.01001", 6.0], ["022.02.011.01001", 2.0]],
     "schichten": [
         {"name": "Gaube", "optionen": [
             {"k": "Schleppgaube", "t": "Schleppgaube, Breite bis 2,5 m", "teile": [["016.01.006.01001", 1.0]], "std": True},
             {"k": "Satteldachgaube", "t": "Satteldachgaube, Breite bis 2,0 m", "teile": [["016.01.006.02001", 1.0]], "std": True},
             {"k": "Flachdachgaube", "t": "Flachdachgaube, Breite bis 3,5 m, mit EPDM-Abdichtung", "teile": [["016.01.006.03001", 1.0], ["021.03.003.01001", 6.0]], "std": True}]},
         {"name": "Wangen", "optionen": [
             {"k": "Wange Zink", "t": "Wangen OSB 22 mm, Metallbekleidung Titanzink (ca. 4 m²)", "teile": [["016.02.007.01001", 4.0], ["022.02.009.01001", 4.0]], "std": True},
             {"k": "Wange Lärche", "t": "Wangen OSB 22 mm, Holzbekleidung Lärche (ca. 4 m²)", "teile": [["016.02.007.01001", 4.0], ["016.04.004.01001", 4.0]], "std": True},
             {"k": "", "t": "Wangen OSB 22 mm, Bekleidung gesondert", "teile": [["016.02.007.01001", 4.0]]}]},
         {"name": "Fenster", "optionen": [
             {"k": "", "t": "ohne Fenster (gesondert erfasst)", "teile": [], "std": True},
             {"k": "Fenster 2 m²", "t": "Kunststofffenster Uw 0,95, ca. 2 m²", "teile": [["026.01.001.02001", 2.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    # =========================================================================================== 362 Dachöffnungen
    {"id": "362.01", "kg": "362", "name": "Dachflächenfenster", "einheit": "St",
     "lang": "Dachflächenfenster mit Eindeckrahmen, einschließlich Sparrenwechsel, Anschluss der Unterdeckung und luftdichtem "
             "Anschluss der Dampfbremse. Innenfutter und Sonnenschutz wählbar.",
     "bezug": "Stück je Fenster",
     "fest": [["016.01.007.01001", 1.0], ["020.01.008.01001", 1.0], ["039.05.004.01001", 4.5]],
     "schichten": [
         {"name": "Fenster", "optionen": [
             {"k": "78×118", "t": "Schwingfenster ca. 78 × 118 cm", "teile": [["020.04.001.01001", 1.0]], "std": True},
             {"k": "78×140", "t": "Schwingfenster ca. 78 × 140 cm", "teile": [["020.04.001.02001", 1.0]], "std": True},
             {"k": "114×140 KSF", "t": "Klapp-Schwingfenster ca. 114 × 140 cm", "teile": [["020.04.001.03001", 1.0]], "std": True},
             {"k": "78×140 elektr.", "t": "Schwingfenster ca. 78 × 140 cm, elektrisch mit Regensensor", "teile": [["020.04.001.04001", 1.0]]},
             {"k": "KSF 78×118", "t": "Klapp-Schwingfenster 78 × 118 cm, manuell", "teile": [["026.01.008.01001", 1.0]]}]},
         {"name": "Innenfutter", "optionen": [
             {"k": "", "t": "ohne Innenfutter (Leibung bauseits)", "teile": []},
             {"k": "Futter GK", "t": "Innenfutter Gipskarton/Systemfutter", "teile": [["020.04.003.01001", 1.0]], "std": True},
             {"k": "Futter tief", "t": "Lichtschacht-Futter tief", "teile": [["020.04.011.05001", 1.0]], "std": True}]},
         {"name": "Sonnenschutz außen", "optionen": [
             {"k": "", "t": "ohne außenliegenden Sonnenschutz", "teile": [], "std": True},
             {"k": "Rollladen", "t": "Außenrollladen elektrisch/solar", "teile": [["020.04.011.01001", 1.0]], "std": True},
             {"k": "Markise", "t": "Hitzeschutz-Markise außen", "teile": [["020.04.011.02001", 1.0]], "std": True}]},
         {"name": "Innen", "optionen": [
             {"k": "", "t": "ohne innenliegendes Zubehör", "teile": [], "std": True},
             {"k": "Verdunkelung", "t": "Verdunkelungsrollo innen", "teile": [["020.04.011.03001", 1.0]], "std": True},
             {"k": "Insektenschutz", "t": "Insektenschutzrollo", "teile": [["020.04.011.04001", 1.0]]}]},
     ], "tags": ["neubau"]},

    {"id": "362.02", "kg": "362", "name": "Dachfenster austauschen", "einheit": "St",
     "lang": "Austausch eines vorhandenen Dachflächenfensters in gleicher Größe oder vergrößert mit Sparrenwechsel und "
             "Reparaturdeckung, einschließlich luftdichtem Anschluss. Innenfutter und Zubehör wählbar.",
     "bezug": "Stück je Fenster",
     "fest": [["039.05.004.01001", 4.5]],
     "schichten": [
         {"name": "Austausch", "optionen": [
             {"k": "gleiche Größe", "t": "Dachfenster austauschen, gleiche Größe", "teile": [["020.04.012.01001", 1.0]], "std": True},
             {"k": "vergrößert", "t": "größeres Klapp-Schwingfenster 114 × 140 cm mit Sparrenwechsel und Reparaturdeckung",
              "teile": [["020.04.001.03001", 1.0], ["016.01.007.02001", 1.0], ["020.05.003.01001", 10.0]], "std": True}]},
         {"name": "Innenfutter", "optionen": [
             {"k": "", "t": "vorhandene Leibung beibehalten, beiarbeiten", "teile": [], "std": True},
             {"k": "Futter GK", "t": "neues Innenfutter Gipskarton/Systemfutter", "teile": [["020.04.003.01001", 1.0]], "std": True}]},
         {"name": "Sonnenschutz außen", "optionen": [
             {"k": "", "t": "ohne außenliegenden Sonnenschutz", "teile": [], "std": True},
             {"k": "Rollladen", "t": "Außenrollladen elektrisch/solar", "teile": [["020.04.011.01001", 1.0]], "std": True},
             {"k": "Markise", "t": "Hitzeschutz-Markise außen", "teile": [["020.04.011.02001", 1.0]], "std": True}]},
         {"name": "Innen", "optionen": [
             {"k": "", "t": "ohne innenliegendes Zubehör", "teile": [], "std": True},
             {"k": "Verdunkelung", "t": "Verdunkelungsrollo innen", "teile": [["020.04.011.03001", 1.0]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "362.03", "kg": "362", "name": "Lichtkuppel Flachdach", "einheit": "St",
     "lang": "Lichtkuppel mit Aufsetzkranz, starr, mit Lüftungsantrieb oder als RWA-Gerät, einschließlich Abdichtungsanschluss "
             "an den Aufsetzkranz. Herstellung der Deckenöffnung je nach Tragwerk wählbar.",
     "bezug": "Stück je Lichtkuppel",
     "fest": [["021.04.007.01001", 4.0]],
     "schichten": [
         {"name": "Lichtkuppel", "optionen": [
             {"k": "LK 100 starr", "t": "Lichtkuppel 100 × 100 cm, starr", "teile": [["021.04.003.01001", 1.0]], "std": True},
             {"k": "LK 100 Lüftung", "t": "Lichtkuppel 100 × 100 cm mit Elektro-Lüftungsantrieb", "teile": [["021.04.003.02001", 1.0]], "std": True},
             {"k": "LK 120 RWA", "t": "Lichtkuppel 120 × 120 cm als RWA-Gerät", "teile": [["021.04.003.03001", 1.0]], "std": True}]},
         {"name": "Öffnung", "optionen": [
             {"k": "", "t": "Öffnung im Tragwerk vorhanden bzw. gesondert", "teile": []},
             {"k": "StB-Aussparung", "t": "Aussparung in Deckenschalung bis 0,25 m² … Öffnung beim Betonieren", "teile": [["013.05.003.02001", 4.0]], "std": True},
             {"k": "Holzwechsel", "t": "Wechsel in Holzbalkenlage, Öffnung bis 1,5 m", "teile": [["016.01.007.02001", 1.0]], "std": True},
             {"k": "Stahlwechsel", "t": "Wechselrahmen Stahl in Trapezdach, ca. 30 kg, beschichtet", "teile": [["017.01.001.03001", 30.0]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "362.04", "kg": "362", "name": "Dachausstieg", "einheit": "St",
     "lang": "Dachausstieg für Wartung und Schornsteinfeger mit Zugang von innen und Sicherung auf dem Dach, "
             "einschließlich Anschlüssen an Deckung bzw. Abdichtung.",
     "bezug": "Stück je Ausstieg",
     "schichten": [
         {"name": "Ausstieg", "optionen": [
             {"k": "Ausstieg 45×55", "t": "Ausstiegsfenster ca. 45 × 55 cm, Steildach", "teile": [["020.04.002.01001", 1.0], ["016.01.007.01001", 1.0]], "std": True},
             {"k": "Ausstieg 78×118", "t": "Dachflächenfenster 78 × 118 cm als Ausstieg, mit Wechsel", "teile": [["020.04.001.01001", 1.0], ["016.01.007.01001", 1.0]], "std": True},
             {"k": "Lichtkuppel", "t": "Lichtkuppel 100 × 100 cm als Ausstieg, Flachdach, mit Anschluss", "teile": [["021.04.003.01001", 1.0], ["021.04.007.01001", 4.0]], "std": True}]},
         {"name": "Zugang innen", "optionen": [
             {"k": "", "t": "Zugang vorhanden (Treppe/Dachboden)", "teile": [], "std": True},
             {"k": "Bodentreppe", "t": "Bodentreppe gedämmt, Holzleiter 3-teilig", "teile": [["027.03.009.01001", 1.0]], "std": True},
             {"k": "Scherentreppe", "t": "Bodentreppe gedämmt, Scherentreppe Stahl", "teile": [["027.03.009.02001", 1.0]]},
             {"k": "Steigleiter", "t": "Steigleiter Stahl verzinkt bis 4 m, Rückenschutz", "teile": [["031.03.003.01001", 1.0]], "std": True}]},
         {"name": "Sicherung", "optionen": [
             {"k": "", "t": "ohne zusätzliche Sicherung", "teile": [], "std": True},
             {"k": "Dachhaken+Tritt", "t": "2 Sicherheitsdachhaken und 2 Laufroste 25 cm", "teile": [["020.04.008.01001", 2.0], ["020.04.007.01001", 2.0]], "std": True},
             {"k": "Anschlagpunkt", "t": "Einzelanschlagpunkt DIN EN 795, auf Stahlbetondecke", "teile": [["021.06.005.01001", 1.0]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "362.05", "kg": "362", "name": "Glasdach / Überkopfverglasung", "einheit": "m²",
     "lang": "Glasdachfläche als Überkopfverglasung aus VSG bzw. Isolierglas mit VSG innen auf Stahlunterkonstruktion, "
             "mit Abdichtungsanschluss und Kantteilen. Optional mit außenliegender Beschattung.",
     "bezug": "Glasfläche in der Neigung gemessen",
     "fest": [["021.04.007.01001", 0.8], ["022.02.010.03001", 0.8]],
     "schichten": [
         {"name": "Verglasung", "optionen": [
             {"k": "VSG 10", "t": "Überkopfverglasung VSG 10 mm aus TVG (unbeheizt)", "teile": [["032.03.002.01001", 1.0]], "std": True},
             {"k": "ISO 2-fach VSG", "t": "Isolierglas mit VSG 12 innen", "teile": [["032.03.002.02001", 1.0]], "std": True},
             {"k": "ISO 3-fach VSG", "t": "Isolierglas 3-fach mit VSG", "teile": [["032.03.002.03001", 1.0]], "std": True}]},
         {"name": "Unterkonstruktion", "optionen": [
             {"k": "UK Stahl verz.", "t": "Stahlunterkonstruktion verzinkt, ca. 18 kg/m²", "teile": [["031.04.003.01001", 18.0]], "std": True},
             {"k": "UK Stahl C3", "t": "Stahlpfetten Walzprofil ca. 15 kg/m², Beschichtung C3", "teile": [["017.04.006.01001", 15.0], ["017.02.002.02001", 0.6]], "std": True}]},
         {"name": "Beschattung", "optionen": [
             {"k": "", "t": "ohne Beschattung", "teile": [], "std": True},
             {"k": "Markise", "t": "Glasdachmarkise mit Motor anteilig (Anlage bis 12 m²)", "teile": [["030.03.004.01001", 0.083]], "std": True}]},
     ], "tags": ["neubau"]},

    # =========================================================================================== 363 Dachbeläge – geneigt
    {"id": "363.01", "kg": "363", "name": "Steildach Ziegel/Dachstein", "einheit": "m²",
     "lang": "Belag für geneigte Dächer: Unterdeckung mit Konterlattung, Dachlattung und Eindeckung mit Dachziegeln oder "
             "Betondachsteinen, einschließlich anteiliger Formteile für First, Ortgang und Traufe, Lüfterziegel und Sicherheitsdachhaken.",
     "bezug": "Dachfläche in der Neigung gemessen, Öffnungen über 1 m² abgezogen",
     "fest": ZUBEHOER_STEILDACH,
     "schichten": [
         {"name": "Unterdeckung", "optionen": UNTERDECKUNG},
         {"name": "Lattung", "optionen": LATTUNG},
         {"name": "Deckung", "optionen": DECKUNG_PFANNE},
     ], "tags": ["neubau"]},

    {"id": "363.02", "kg": "363", "name": "Steildach Biber/Schiefer", "einheit": "m²",
     "lang": "Gehobene Eindeckung geneigter Dächer mit Biberschwanzziegeln in Doppeldeckung, Faserzementplatten oder Naturschiefer "
             "auf Schalung, einschließlich Unterdeckung, Konterlattung und anteiliger Formteile.",
     "bezug": "Dachfläche in der Neigung gemessen, Öffnungen über 1 m² abgezogen",
     "fest": [["020.03.006.01001", 0.08], ["020.01.005.01001", 0.08], ["020.01.004.01001", 0.08], ["020.04.008.01001", 0.02]],
     "schichten": [
         {"name": "Unterdeckung", "optionen": UNTERDECKUNG[:2]},
         {"name": "Deckung", "optionen": [
             {"k": "Biber DD", "t": "Biberschwanzziegel Doppeldeckung auf Lattung 30/50", "teile": [["020.02.001.04001", 1.0], ["020.01.003.01001", 1.0]], "std": True},
             {"k": "Faserzement DD", "t": "Faserzement-Dachplatten Doppeldeckung auf Lattung 30/50", "teile": [["020.02.001.07001", 1.0], ["020.01.003.01001", 1.0]], "std": True},
             {"k": "Schiefer Rechteck", "t": "Schiefer Rechteck-Doppeldeckung auf Rauspund 24 mm mit Vordeckung", "teile": [["020.02.002.01001", 1.0], ["020.01.006.01001", 1.0], ["020.01.007.01001", 1.0]], "std": True},
             {"k": "Schiefer altdt.", "t": "Schiefer Altdeutsche Deckung auf Rauspund 24 mm mit Vordeckung", "teile": [["020.02.002.02001", 1.0], ["020.01.006.01001", 1.0], ["020.01.007.01001", 1.0]], "std": True},
             {"k": "Hohlpfanne hist.", "t": "Hohlpfannen/Krempziegel historisch auf Lattung", "teile": [["020.02.005.01001", 1.0], ["020.01.003.01001", 1.0]]},
             {"k": "Mönch-Nonne", "t": "Mönch-Nonne-Ziegel im Mörtelbett auf Lattung", "teile": [["020.02.006.01001", 1.0], ["020.01.003.01001", 1.0]]}]},
         {"name": "Kehlen", "optionen": [
             {"k": "", "t": "ohne Kehlen", "teile": [], "std": True},
             {"k": "Kehle eingeb.", "t": "eingebundene Kehle anteilig 0,05 m je m²", "teile": [["020.03.003.02001", 0.05]], "std": True},
             {"k": "Kehle Zink", "t": "Metallkehle Titanzink anteilig 0,05 m je m²", "teile": [["020.03.003.01001", 0.05]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "363.03", "kg": "363", "name": "Steildach Metall Stehfalz", "einheit": "m²",
     "lang": "Metalldeckung im Doppelstehfalz auf vollflächiger Holzschalung mit strukturierter Trennlage, "
             "einschließlich anteiliger Traufstreifen und Ortgangbleche.",
     "bezug": "Dachfläche in der Neigung gemessen, Öffnungen über 1 m² abgezogen",
     "fest": [["022.02.018.01001", 1.0], ["022.02.008.02001", 0.08], ["022.02.004.01001", 0.08], ["020.04.008.01001", 0.02]],
     "schichten": [
         {"name": "Unterdeckung", "optionen": [
             {"k": "", "t": "Unterdeckbahn diffusionsoffen mit Konterlattung 40/60 (belüftet)", "teile": [["020.01.001.01001", 1.0], ["020.01.002.01001", 1.0]], "std": True},
             {"k": "UD Holzfaser", "t": "Holzfaser-Unterdeckplatte 35 mm mit Konterlattung", "teile": [["016.02.001.04001", 1.0], ["020.01.002.01001", 1.0]]}]},
         {"name": "Schalung", "optionen": [
             {"k": "", "t": "Rauspundschalung 24 mm", "teile": [["020.01.006.01001", 1.0]], "std": True},
             {"k": "OSB-Schalung", "t": "Schalung OSB/3 22 mm", "teile": [["016.02.001.02001", 1.0]], "std": True}]},
         {"name": "Deckung", "optionen": [
             {"k": "Titanzink", "t": "Doppelstehfalz Titanzink 0,7 mm vorbewittert", "teile": [["020.02.003.01001", 1.0]], "std": True},
             {"k": "Aluminium", "t": "Doppelstehfalz Aluminium farbbeschichtet 0,7 mm", "teile": [["020.02.003.02001", 1.0]], "std": True},
             {"k": "Kupfer", "t": "Doppelstehfalz Kupfer 0,6 mm", "teile": [["020.02.003.03001", 1.0]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "363.04", "kg": "363", "name": "Zwischensparrendämmung", "einheit": "m²",
     "lang": "Wärmedämmung geneigter Dächer zwischen den Sparren mit feuchtevariabler, luftdicht verklebter Dampfbremse und "
             "Anschlüssen; optional zusätzliche Untersparrendämmung. Bekleidung gesondert (KG 364).",
     "bezug": "Dachfläche in der Neigung gemessen (gedämmte Fläche)",
     "fest": [["016.03.005.01001", 1.0], ["016.03.010.01001", 0.4]],
     "schichten": [
         {"name": "Dämmung", "optionen": [
             {"k": "ZSD MW 160", "t": "Zwischensparrendämmung Mineralwolle 035, 160 mm", "teile": [["016.03.001.01001", 1.0]], "std": True},
             {"k": "ZSD MW 200", "t": "Zwischensparrendämmung Mineralwolle 035, 200 mm", "teile": [["016.03.001.02001", 1.0]], "std": True},
             {"k": "ZSD MW 240", "t": "Zwischensparrendämmung Mineralwolle 032, 240 mm", "teile": [["016.03.001.03001", 1.0]], "std": True},
             {"k": "ZSD HF 160", "t": "Zwischensparrendämmung Holzfaser, 160 mm", "teile": [["016.03.002.01001", 1.0]]},
             {"k": "ZSD HF 200", "t": "Zwischensparrendämmung Holzfaser, 200 mm", "teile": [["016.03.002.02001", 1.0]], "std": True},
             {"k": "ZSD HF 240", "t": "Zwischensparrendämmung Holzfaser, 240 mm", "teile": [["016.03.002.03001", 1.0]]},
             {"k": "Einblas 220", "t": "Einblasdämmung Zellulose/Holzfaser, i. M. 220 mm", "teile": [["016.03.003.01001", 0.22]]}]},
         {"name": "Untersparrendämmung", "optionen": [
             {"k": "", "t": "ohne Untersparrendämmung", "teile": [], "std": True},
             {"k": "USD HF 40", "t": "Untersparrendämmung Holzfaser 40 mm", "teile": [["016.03.008.01001", 1.0]], "std": True},
             {"k": "USD HF 60", "t": "Untersparrendämmung Holzfaser 60 mm", "teile": [["016.03.008.02001", 1.0]]},
             {"k": "USD PIR 40", "t": "Untersparrendämmung PIR alukaschiert 40 mm", "teile": [["016.03.008.03001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "363.05", "kg": "363", "name": "Steildach Aufsparrendämmung", "einheit": "m²",
     "lang": "Belag geneigter Dächer mit Aufsparrendämmung: Sichtschalung bzw. OSB auf den Sparren, Dampfbremse, Aufsparren-Dämmelemente, "
             "Konterlattung, Lattung und Eindeckung, einschließlich anteiliger Formteile.",
     "bezug": "Dachfläche in der Neigung gemessen, Öffnungen über 1 m² abgezogen",
     "fest": [["016.03.005.01001", 1.0], ["016.02.003.02001", 1.0], ["020.01.003.02001", 1.0]] + ZUBEHOER_STEILDACH,
     "schichten": [
         {"name": "Unterlage", "optionen": [
             {"k": "Sichtschalung", "t": "Sichtschalung Fichte gehobelt, N+F, 19 mm", "teile": [["016.02.001.03001", 1.0]], "std": True},
             {"k": "OSB", "t": "Schalung OSB/3, N+F, 22 mm", "teile": [["016.02.001.02001", 1.0]], "std": True}]},
         {"name": "Dämmung", "optionen": [
             {"k": "ASD PIR 140", "t": "Aufsparrendämmung PIR kaschiert 023, 140 mm", "teile": [["016.03.004.01001", 1.0]], "std": True},
             {"k": "ASD PIR 180", "t": "Aufsparrendämmung PIR kaschiert 023, 180 mm", "teile": [["016.03.004.02001", 1.0]], "std": True},
             {"k": "ASD HF 160", "t": "Aufsparrendämmung Holzfaser 040, 160 mm", "teile": [["016.03.004.03001", 1.0]]},
             {"k": "ASD HF 200", "t": "Aufsparrendämmung Holzfaser 040, 200 mm", "teile": [["016.03.004.04001", 1.0]], "std": True}]},
         {"name": "Deckung", "optionen": DECKUNG_PFANNE},
     ], "tags": ["neubau", "altbau"]},

    {"id": "363.06", "kg": "363", "name": "Steildach neu decken (Bestand)", "einheit": "m²",
     "lang": "Erneuerung des Dachbelags auf bestehendem Dachstuhl: alte Deckung und Lattung abbrechen und entsorgen, ggf. energetische "
             "Ertüchtigung, neue Unterdeckung, Lattung und Eindeckung mit anteiligen Formteilen.",
     "bezug": "Dachfläche in der Neigung gemessen, Öffnungen über 1 m² abgezogen",
     "fest": [["020.05.009.01001", 1.0], ["020.01.003.01001", 1.0]] + ZUBEHOER_STEILDACH,
     "schichten": [
         {"name": "Rückbau", "optionen": [
             {"k": "", "t": "Ton-/Betondachsteine abdecken und entsorgen", "teile": [["020.05.001.01001", 1.0]], "std": True},
             {"k": "Rückbau Schiefer", "t": "Schiefer/Biber abdecken und entsorgen", "teile": [["020.05.001.02001", 1.0]]},
             {"k": "Rückbau Asbest", "t": "Asbest-Faserzementplatten ausbauen nach TRGS 519", "teile": [["020.05.002.01001", 1.0]], "std": True}]},
         {"name": "Dämmung", "optionen": [
             {"k": "", "t": "ohne Dämmmaßnahme", "teile": [], "std": True},
             {"k": "Sub-and-Top MW", "t": "alte Dämmung ausbauen, Sub-and-Top-Bahn, Zwischensparrendämmung MW 160 mm",
              "teile": [["016.03.007.01001", 1.0], ["016.03.009.01001", 1.0], ["016.03.001.01001", 1.0]], "std": True},
             {"k": "Aufdoppl.+MW 240", "t": "Sparren +100 mm aufdoppeln, Sub-and-Top-Bahn, MW 240 mm",
              "teile": [["016.03.007.01001", 1.0], ["016.06.004.02001", 1.0], ["016.03.009.01001", 1.0], ["016.03.001.03001", 1.0]], "std": True},
             {"k": "ASD PIR 140", "t": "Aufsparrendämmung PIR 140 mm auf Schalung mit Dampfbremse",
              "teile": [["016.02.001.02001", 1.0], ["016.03.005.01001", 1.0], ["016.03.004.01001", 1.0]]}]},
         {"name": "Unterdeckung", "optionen": UNTERDECKUNG[:2]},
         {"name": "Deckung", "optionen": [o for o in DECKUNG_PFANNE if o["k"] in ("Falzziegel", "Betonstein", "Flachdachpfanne")]},
     ], "tags": ["altbau"]},

    {"id": "363.07", "kg": "363", "name": "Dach Trapez/Sandwich, Wellplatte", "einheit": "m²",
     "lang": "Einfacher Dachbelag für Hallen und Nebengebäude aus Sandwichpaneelen, Trapezblech mit Antikondensvlies, "
             "Faserzement-Wellplatten oder Bitumenschindeln, einschließlich anteiliger Kantteile für First und Ortgang.",
     "bezug": "Dachfläche in der Neigung gemessen",
     "fest": [["022.02.010.05001", 0.15]],
     "schichten": [
         {"name": "Unterlage", "optionen": [
             {"k": "", "t": "auf vorhandener Pfettenlage", "teile": [], "std": True},
             {"k": "auf Lattung", "t": "auf Dachlattung 40/60 mm", "teile": [["020.01.003.02001", 1.0]], "std": True},
             {"k": "auf Schalung", "t": "auf Rauspundschalung 24 mm mit Unterdach", "teile": [["020.01.006.01001", 1.0], ["020.01.007.01001", 1.0]]}]},
         {"name": "Deckung", "optionen": [
             {"k": "Sandwich 100", "t": "Sandwichpaneele PIR 100 mm", "teile": [["020.02.004.02001", 1.0]], "std": True},
             {"k": "Sandwich 160", "t": "Sandwichpaneele PIR 160 mm", "teile": [["020.02.004.03001", 1.0]], "std": True},
             {"k": "Trapez 0,75", "t": "Trapezblech Stahl 0,75 mm mit Antikondensvlies (kalt)", "teile": [["020.02.004.01001", 1.0]], "std": True},
             {"k": "Wellplatte", "t": "Faserzement-Wellplatten Profil 5", "teile": [["020.02.001.08001", 1.0]], "std": True},
             {"k": "Bitumenschindel", "t": "Bitumenschindeln (nur mit Schalung)", "teile": [["020.02.007.01001", 1.0]]}]},
     ], "tags": ["neubau"]},

    {"id": "363.08", "kg": "363", "name": "Steildach extensiv begrünt", "einheit": "m²",
     "lang": "Begrüntes geneigtes Dach bis 15° auf Schalung mit wurzelfester Bitumenabdichtung, Schubsicherung und extensiver Begrünung.",
     "bezug": "Dachfläche in der Neigung gemessen",
     "fest": [["020.01.006.01001", 1.0], ["020.02.010.01001", 1.0], ["022.02.008.02001", 0.08]],
     "schichten": [
         {"name": "Abdichtung", "optionen": [
             {"k": "PYE wurzelfest", "t": "Bitumenabdichtung 2-lagig, Oberlage wurzelfest", "teile": [["021.03.001.02001", 1.0]], "std": True},
             {"k": "EPDM+WSB", "t": "EPDM-Bahn 1,5 mm verklebt, Wurzelschutzbahn", "teile": [["021.03.003.01001", 1.0], ["021.03.011.01001", 1.0]], "std": True}]},
         {"name": "Dämmung", "optionen": [
             {"k": "", "t": "ohne Aufdachdämmung (Kaltdach/Nebengebäude)", "teile": [], "std": True},
             {"k": "PIR 120", "t": "Dampfsperre und PIR 120 mm auf Schalung", "teile": [["021.01.002.02001", 1.0], ["021.02.001.04001", 1.0]], "std": True}]},
     ], "tags": ["neubau"]},

    # =========================================================================================== 363 Dachbeläge – flach
    {"id": "363.09", "kg": "363", "name": "Flachdach Warmdach Bitumen", "einheit": "m²",
     "lang": "Belag auf Stahlbeton-Flachdach als Warmdach: Voranstrich, Dampfsperre, Wärmedämmung und zweilagige Abdichtung aus "
             "Polymerbitumenbahnen, Oberfläche frei bewittert oder bekiest, anteilige Dachentwässerung.",
     "bezug": "Dachfläche bis Innenkante Attika, Aufkantungen gesondert (Attika je m)",
     "fest": [VORANSTRICH, ["021.03.001.01001", 1.0]],
     "schichten": [
         {"name": "Dampfsperre", "optionen": DAMPFSPERRE_BIT},
         {"name": "Wärmedämmung", "optionen": DAEMMUNG_FLACH},
         {"name": "Oberfläche", "optionen": OBERFL_FLACH},
         {"name": "Entwässerung", "optionen": ENTW_FLACH},
     ], "tags": ["neubau"]},

    {"id": "363.10", "kg": "363", "name": "Flachdach Kunststoffbahn mech.", "einheit": "m²",
     "lang": "Belag auf Stahltrapez- oder Holzschalung: Dampfsperre mit Sickenzulage, Wärmedämmung, einlagige Kunststoffdachbahn "
             "mechanisch befestigt nach Windsogberechnung, mit Nahtprüfung und anteiliger Dachentwässerung.",
     "bezug": "Dachfläche bis Innenkante Attika, Aufkantungen gesondert",
     "fest": [["021.01.005.01001", 1.0], ["021.02.003.01001", 1.0], ["021.03.012.01001", 1.0]],
     "schichten": [
         {"name": "Dampfsperre", "optionen": [
             {"k": "", "t": "Dampfsperre Kaltselbstklebebahn mit Alu-Einlage", "teile": [["021.01.002.02001", 1.0]], "std": True},
             {"k": "DS PE", "t": "Dampfsperre PE-Folie 0,4 mm, Nähte verklebt", "teile": [["021.01.002.03001", 1.0]]}]},
         {"name": "Wärmedämmung", "optionen": [
             {"k": "MW 160", "t": "Mineralwolle A1 038, 160 mm", "teile": [["021.02.001.07001", 1.0]], "std": True},
             {"k": "MW 200", "t": "Mineralwolle A1 038, 200 mm", "teile": [["021.02.001.08001", 1.0]], "std": True},
             {"k": "PIR 120", "t": "PIR alukaschiert 023, 120 mm", "teile": [["021.02.001.04001", 1.0]]},
             {"k": "PIR 160", "t": "PIR alukaschiert 023, 160 mm", "teile": [["021.02.001.05001", 1.0]], "std": True},
             {"k": "PIR 200", "t": "PIR alukaschiert 023, 200 mm", "teile": [["021.02.001.06001", 1.0]], "std": True}]},
         {"name": "Abdichtung", "optionen": [
             {"k": "FPO 1,8", "t": "Kunststoffdachbahn FPO/TPO 1,8 mm", "teile": [["021.03.002.01001", 1.0]], "std": True},
             {"k": "PVC 1,5", "t": "Kunststoffdachbahn PVC-P 1,5 mm", "teile": [["021.03.002.02001", 1.0]], "std": True},
             {"k": "PVC 2,0", "t": "Kunststoffdachbahn PVC-P 2,0 mm", "teile": [["021.03.002.03001", 1.0]]}]},
         {"name": "Entwässerung", "optionen": ENTW_FLACH},
     ], "tags": ["neubau"]},

    {"id": "363.11", "kg": "363", "name": "Flachdach Gefälledämmung", "einheit": "m²",
     "lang": "Belag auf gefällelosem Stahlbeton-Flachdach: Voranstrich, Dampfsperre, Gefälledämmung (Mittelwert der Dicke) und "
             "Abdichtung aus Bitumen, Kunststoff oder Flüssigkunststoff, mit anteiliger Dachentwässerung.",
     "bezug": "Dachfläche bis Innenkante Attika, Aufkantungen gesondert",
     "fest": [VORANSTRICH, ["021.01.002.01001", 1.0]],
     "schichten": [
         {"name": "Gefälledämmung", "optionen": [
             {"k": "GD EPS 160", "t": "Gefälledämmung EPS 035, i. M. 160 mm", "teile": [["021.02.002.01001", 1.0]], "std": True},
             {"k": "GD EPS 220", "t": "Gefälledämmung EPS 035, i. M. 220 mm", "teile": [["021.02.002.02001", 1.0]], "std": True},
             {"k": "GD PIR 160", "t": "Gefälledämmung PIR 026, i. M. 160 mm", "teile": [["021.02.002.03001", 1.0]], "std": True},
             {"k": "GD PIR 200", "t": "Gefälledämmung PIR 026, i. M. 200 mm", "teile": [["021.02.002.04001", 1.0]]},
             {"k": "GD MW 180", "t": "Gefälledämmung Mineralwolle A1, i. M. 180 mm", "teile": [["021.02.002.05001", 1.0]], "std": True}]},
         {"name": "Abdichtung", "optionen": [
             {"k": "Bitumen 2-lg.", "t": "Bitumenabdichtung 2-lagig PYE PV 200 S5", "teile": [["021.03.001.01001", 1.0]], "std": True},
             {"k": "FPO verklebt", "t": "Kunststoffdachbahn FPO 1,8 mm, verklebt", "teile": [["021.03.008.01001", 1.0]], "std": True},
             {"k": "PVC verklebt", "t": "Kunststoffdachbahn PVC-P 1,5 mm, verklebt", "teile": [["021.03.008.02001", 1.0]]},
             {"k": "Flüssig PMMA", "t": "Flüssigabdichtung PMMA/PU, vlieseingelegt", "teile": [["021.03.004.01001", 1.0]]}]},
         {"name": "Oberfläche", "optionen": OBERFL_FLACH[:2]},
         {"name": "Entwässerung", "optionen": ENTW_FLACH},
     ], "tags": ["neubau"]},

    {"id": "363.12", "kg": "363", "name": "Umkehrdach", "einheit": "m²",
     "lang": "Umkehrdach auf Stahlbetondecke: Abdichtung direkt auf der Decke, darüber XPS-Dämmung, Trennvlies und Auflast "
             "aus Kies, extensiver Begrünung oder Plattenbelag, mit anteiliger Dachentwässerung.",
     "bezug": "Dachfläche bis Innenkante Attika, Aufkantungen gesondert",
     "fest": [VORANSTRICH, ["021.03.005.01001", 1.0]],
     "schichten": [
         {"name": "Abdichtung", "optionen": [
             {"k": "", "t": "Bitumenabdichtung 2-lagig PYE PV 200 S5", "teile": [["021.03.001.01001", 1.0]], "std": True},
             {"k": "Bitumen wurzelf.", "t": "Bitumenabdichtung 2-lagig, Oberlage wurzelfest", "teile": [["021.03.001.02001", 1.0]]}]},
         {"name": "Dämmung", "optionen": [
             {"k": "XPS 160", "t": "XPS-Dämmung für Umkehrdach, 160 mm", "teile": [["021.02.004.01001", 1.0]], "std": True},
             {"k": "XPS 200", "t": "XPS-Dämmung für Umkehrdach, 200 mm", "teile": [["021.02.004.02001", 1.0]], "std": True},
             {"k": "XPS 240", "t": "XPS-Dämmung für Umkehrdach, 240 mm", "teile": [["021.02.004.03001", 1.0]], "std": True}]},
         {"name": "Auflast", "optionen": [
             {"k": "Kies 8", "t": "Kiesschüttung 16/32, 8 cm", "teile": [["021.06.001.02001", 1.0]], "std": True},
             {"k": "extensiv 8", "t": "extensive Dachbegrünung, Systemaufbau ca. 8 cm", "teile": [["021.06.002.01001", 1.0]], "std": True},
             {"k": "Platten Stelzl.", "t": "Betonplatten auf Stelzlagern", "teile": [["021.06.004.01001", 1.0]], "std": True}]},
         {"name": "Entwässerung", "optionen": ENTW_FLACH},
     ], "tags": ["neubau"]},

    {"id": "363.13", "kg": "363", "name": "Gründach extensiv (Warmdach)", "einheit": "m²",
     "lang": "Extensiv begrüntes Warmdach auf Stahlbeton: Voranstrich, Dampfsperre, Wärmedämmung, wurzelfeste Abdichtung, "
             "Schutzvlies und Begrünungssystem, mit anteiligem Kiesstreifen, Kontrollschacht und Dachentwässerung.",
     "bezug": "Dachfläche bis Innenkante Attika, Aufkantungen gesondert",
     "fest": [VORANSTRICH, ["021.01.002.01001", 1.0], ["021.03.005.02001", 1.0], ["021.06.001.01001", 0.1],
              ["021.06.003.01001", 0.007], ["021.05.001.02001", 0.007], ["021.05.002.01001", 0.007]],
     "schichten": [
         {"name": "Wärmedämmung", "optionen": [o for o in DAEMMUNG_FLACH if o["k"] in ("EPS 160", "EPS 200", "PIR 160", "MW 160", "PIR 120")]},
         {"name": "Abdichtung", "optionen": [
             {"k": "PYE wurzelfest", "t": "Bitumenabdichtung 2-lagig, Oberlage wurzelfest nach FLL", "teile": [["021.03.001.02001", 1.0]], "std": True},
             {"k": "FPO lose+WSB", "t": "FPO 1,8 mm lose unter Auflast, Wurzelschutzbahn", "teile": [["021.03.009.01001", 1.0], ["021.03.011.01001", 1.0]], "std": True},
             {"k": "EPDM lose", "t": "EPDM 1,5 mm lose unter Auflast (wurzelfest)", "teile": [["021.03.010.01001", 1.0]]}]},
         {"name": "Begrünung", "optionen": [
             {"k": "extensiv 8", "t": "Systemaufbau extensiv ca. 8 cm", "teile": [["021.06.002.01001", 1.0]], "std": True},
             {"k": "extensiv 12", "t": "Systemaufbau extensiv ca. 12 cm", "teile": [["021.06.002.02001", 1.0]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "363.14", "kg": "363", "name": "Dachterrasse (genutztes Dach)", "einheit": "m²",
     "lang": "Genutzte Dachfläche als Terrasse auf Stahlbeton: Dampfsperre, druckfeste Wärmedämmung, hochwertige Abdichtung, "
             "Schutzlage und Gehbelag auf Stelzlagern bzw. Lagerhölzern, mit anteiliger Entwässerung.",
     "bezug": "Terrassenfläche bis Innenkante Brüstung, Türanschlüsse und Aufkantungen gesondert",
     "fest": [VORANSTRICH, ["021.01.002.01001", 1.0], ["021.03.005.02001", 1.0], ["021.05.001.02001", 0.015]],
     "schichten": [
         {"name": "Wärmedämmung", "optionen": [
             {"k": "EPS dh 200", "t": "EPS 035 DAA dh, 200 mm", "teile": [["021.02.001.02001", 1.0]], "std": True},
             {"k": "PIR 160", "t": "PIR alukaschiert 023, 160 mm", "teile": [["021.02.001.05001", 1.0]], "std": True},
             {"k": "Schaumglas 180", "t": "Schaumglas 180 mm, vollflächig verklebt", "teile": [["021.02.005.02001", 1.0]]}]},
         {"name": "Abdichtung", "optionen": [
             {"k": "Bitumen 3-lg.", "t": "Bitumenabdichtung dreilagig für genutzte Dachflächen", "teile": [["021.03.007.01001", 1.0]], "std": True},
             {"k": "Flüssig PMMA", "t": "Flüssigabdichtung PMMA/PU, vlieseingelegt", "teile": [["021.03.004.01001", 1.0]], "std": True}]},
         {"name": "Belag", "optionen": [
             {"k": "Platten Stelzl.", "t": "Betonplatten auf Stelzlagern", "teile": [["021.06.004.01001", 1.0]], "std": True},
             {"k": "Lärche", "t": "Lärchendielen 28 mm auf Lagerhölzern", "teile": [["016.04.011.01001", 1.0], ["016.05.011.01001", 1.0]], "std": True},
             {"k": "Thermoesche", "t": "Thermoesche-Dielen 26 mm auf Lagerhölzern", "teile": [["016.04.011.03001", 1.0], ["016.05.011.01001", 1.0]], "std": True},
             {"k": "WPC", "t": "WPC-Hohlkammerdielen auf Lagerhölzern", "teile": [["016.04.011.04001", 1.0], ["016.05.011.01001", 1.0]]},
             {"k": "Kies", "t": "Kiesschüttung 16/32, 5 cm (nicht begehbare Teilflächen)", "teile": [["021.06.001.01001", 1.0]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "363.15", "kg": "363", "name": "Holzflachdach Dämmung+Abdichtung", "einheit": "m²",
     "lang": "Belag eines Holzbalken-Flachdachs: feuchtevariable Dampfbremse unterseitig, Volldämmung zwischen den Balken, "
             "Aufdachdämmung (Überdämmung) und Abdichtung auf der Schalung, mechanisch befestigt.",
     "bezug": "Dachfläche (Grundrissprojektion), Aufkantungen gesondert",
     "fest": [["016.03.005.01001", 1.0], ["016.03.010.01001", 0.3], ["021.02.003.01001", 1.0]],
     "schichten": [
         {"name": "Zwischendämmung", "optionen": [
             {"k": "MW 200", "t": "Mineralwolle 035 zwischen Balken, 200 mm", "teile": [["016.03.001.02001", 1.0]], "std": True},
             {"k": "MW 240", "t": "Mineralwolle 032 zwischen Balken, 240 mm", "teile": [["016.03.001.03001", 1.0]], "std": True},
             {"k": "HF 240", "t": "Holzfaser zwischen Balken, 240 mm", "teile": [["016.03.002.03001", 1.0]], "std": True},
             {"k": "Einblas 240", "t": "Einblasdämmung Zellulose, 240 mm", "teile": [["016.03.003.01001", 0.24]]}]},
         {"name": "Aufdachdämmung", "optionen": [
             {"k": "", "t": "ohne Aufdachdämmung", "teile": []},
             {"k": "+PIR 120", "t": "Dampfsperre und PIR 120 mm auf Schalung", "teile": [["021.01.002.02001", 1.0], ["021.02.001.04001", 1.0]], "std": True},
             {"k": "+GD EPS 160", "t": "Dampfsperre und Gefälledämmung EPS i. M. 160 mm", "teile": [["021.01.002.02001", 1.0], ["021.02.002.01001", 1.0]], "std": True}]},
         {"name": "Abdichtung", "optionen": [
             {"k": "Bitumen 2-lg.", "t": "Bitumenabdichtung 2-lagig PYE PV 200 S5", "teile": [["021.03.001.01001", 1.0]], "std": True},
             {"k": "FPO", "t": "Kunststoffdachbahn FPO/TPO 1,8 mm", "teile": [["021.03.002.01001", 1.0]], "std": True},
             {"k": "EPDM", "t": "EPDM-Dachbahn 1,5 mm", "teile": [["021.03.003.01001", 1.0]]}]},
     ], "tags": ["neubau"]},

    {"id": "363.16", "kg": "363", "name": "Flachdach sanieren", "einheit": "m²",
     "lang": "Sanierung eines bestehenden Flachdachs: Altaufbau abtragen oder als Dampfsperre belassen, neue Wärmedämmung und Abdichtung, "
             "Oberfläche neu bzw. vorhandenen Kies wieder einbauen. Asbest/PAK nach Erkundung.",
     "bezug": "Dachfläche bis Innenkante Attika, Aufkantungen gesondert",
     "schichten": [
         {"name": "Altaufbau", "optionen": [
             {"k": "Abtrag 12", "t": "Altdachaufbau bis 12 cm abtragen und entsorgen, neue Dampfsperre", "teile": [["021.07.001.01001", 1.0], VORANSTRICH, ["021.01.002.01001", 1.0]], "std": True},
             {"k": "Abtrag 25", "t": "Altdachaufbau bis 25 cm abtragen und entsorgen, neue Dampfsperre", "teile": [["021.07.001.02001", 1.0], VORANSTRICH, ["021.01.002.01001", 1.0]]},
             {"k": "Altdach als DS", "t": "Altabdichtung als Dampfsperre belassen, prüfen, Blasen öffnen", "teile": [["021.07.002.01001", 1.0]], "std": True},
             {"k": "PAK-Bahnen", "t": "teerhaltige Dachbahnen ausbauen und entsorgen, neue Dampfsperre", "teile": [["021.07.004.01001", 1.0], VORANSTRICH, ["021.01.002.01001", 1.0]]}]},
         {"name": "Wärmedämmung", "optionen": [
             {"k": "PIR 120", "t": "PIR alukaschiert 023, 120 mm", "teile": [["021.02.001.04001", 1.0]], "std": True},
             {"k": "PIR 160", "t": "PIR alukaschiert 023, 160 mm", "teile": [["021.02.001.05001", 1.0]], "std": True},
             {"k": "EPS 200", "t": "EPS 035 DAA dh, 200 mm", "teile": [["021.02.001.02001", 1.0]]},
             {"k": "GD PIR 160", "t": "Gefälledämmung PIR i. M. 160 mm", "teile": [["021.02.002.03001", 1.0]], "std": True}]},
         {"name": "Abdichtung", "optionen": [
             {"k": "Bitumen 2-lg.", "t": "Bitumenabdichtung 2-lagig, mechanisch befestigt", "teile": [["021.03.001.01001", 1.0], ["021.02.003.01001", 1.0]], "std": True},
             {"k": "FPO mech.", "t": "Kunststoffdachbahn FPO 1,8 mm, mechanisch befestigt", "teile": [["021.03.002.01001", 1.0], ["021.02.003.01001", 1.0]], "std": True},
             {"k": "Flüssig PMMA", "t": "Flüssigabdichtung PMMA/PU, vlieseingelegt", "teile": [["021.03.004.01001", 1.0]]}]},
         {"name": "Oberfläche", "optionen": [
             {"k": "", "t": "ohne Auflast", "teile": [], "std": True},
             {"k": "Kies wieder", "t": "vorhandenen Kies aufnehmen, lagern und wieder verteilen, Schutzlage", "teile": [["021.07.005.01001", 1.0], ["021.03.005.01001", 1.0]]},
             {"k": "Kies neu", "t": "Kiesschüttung 16/32, 5 cm, neu", "teile": [["021.06.001.01001", 1.0]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "363.17", "kg": "363", "name": "Altdach Abdichtung erneuern", "einheit": "m²",
     "lang": "Überarbeitung einer intakten Altabdichtung ohne Dämmmaßnahme: Kies aufnehmen, Untergrund prüfen und vorbereiten, "
             "neue Abdichtungslage aufbringen, Dachabläufe reinigen.",
     "bezug": "Dachfläche bis Innenkante Attika, Aufkantungen gesondert",
     "fest": [["021.07.002.01001", 1.0], ["021.07.007.01001", 0.007]],
     "schichten": [
         {"name": "Abdichtung", "optionen": [
             {"k": "Bitumen 1-lg.", "t": "Bitumenabdichtung 1-lagig 5,2 mm auf Altdach", "teile": [["021.03.006.01001", 1.0]], "std": True},
             {"k": "Flüssig PMMA", "t": "Flüssigabdichtung PMMA/PU, vlieseingelegt", "teile": [["021.03.004.01001", 1.0]], "std": True},
             {"k": "PVC lose", "t": "PVC-P 1,8 mm lose mit Auflast, Trennvlies", "teile": [["021.03.009.02001", 1.0], ["021.03.005.01001", 1.0]], "std": True}]},
         {"name": "Kies", "optionen": [
             {"k": "", "t": "ohne Kies", "teile": [], "std": True},
             {"k": "Kies wieder", "t": "vorhandenen Kies aufnehmen und wieder verteilen", "teile": [["021.07.005.01001", 1.0]], "std": True}]},
     ], "tags": ["altbau"]},

    # =========================================================================================== 363 Dachrand, Anschlüsse, Entwässerung
    {"id": "363.18", "kg": "363", "name": "Attika Anschluss + Abdeckung", "einheit": "m",
     "lang": "Attikaausbildung am Flachdach: Aufkantung der Abdichtung mit Dämmkeil, Holzbohle bzw. Keilbohle mit Gefälle und "
             "Attikaabdeckung aus Metall mit Haltern.",
     "bezug": "Länge der Attika, Ecken übermessen",
     "fest": [["021.02.007.01001", 1.0], ["022.02.017.01001", 1.0]],
     "schichten": [
         {"name": "Aufkantung", "optionen": [
             {"k": "Bit. h30", "t": "Attika-Anschluss Bitumen zweilagig, Höhe bis 30 cm", "teile": [["021.04.001.01001", 1.0]], "std": True},
             {"k": "Bit. h50", "t": "Attika-Anschluss Bitumen zweilagig, Höhe bis 50 cm", "teile": [["021.04.001.02001", 1.0]], "std": True},
             {"k": "KSt h30", "t": "Attika-Anschluss Kunststoffbahn, Höhe bis 30 cm", "teile": [["021.04.001.03001", 1.0]]},
             {"k": "KSt h50", "t": "Attika-Anschluss Kunststoffbahn, Höhe bis 50 cm", "teile": [["021.04.001.04001", 1.0]], "std": True}]},
         {"name": "Aufdopplung", "optionen": [
             {"k": "", "t": "ohne Holzaufdopplung", "teile": [], "std": True},
             {"k": "Bohle 6/24", "t": "Attika-Aufdopplung Holzbohle 6/24 (Dämmhöhe)", "teile": [["021.02.008.02001", 1.0]]}]},
         {"name": "Abdeckung", "optionen": [
             {"k": "Zink Z400", "t": "Attikaabdeckung Titanzink 0,8 mm, Zuschnitt bis 400 mm", "teile": [["022.02.001.01001", 1.0]], "std": True},
             {"k": "Zink Z600", "t": "Attikaabdeckung Titanzink 0,8 mm, Zuschnitt bis 600 mm", "teile": [["022.02.001.02001", 1.0]]},
             {"k": "Alu Z400", "t": "Attikaabdeckung Aluminium 2 mm pulverbeschichtet, Zuschnitt bis 400 mm", "teile": [["022.02.001.03001", 1.0]], "std": True},
             {"k": "Alu Z600", "t": "Attikaabdeckung Aluminium 2 mm pulverbeschichtet, Zuschnitt bis 600 mm", "teile": [["022.02.001.04001", 1.0]], "std": True},
             {"k": "Kupfer Z400", "t": "Attikaabdeckung Kupfer 0,7 mm, Zuschnitt bis 400 mm", "teile": [["022.02.001.05001", 1.0]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "363.19", "kg": "363", "name": "Dachrand mit Dachrandprofil", "einheit": "m",
     "lang": "Dachrandabschluss am Flachdach ohne Attika mit Dachrandprofil aus Aluminium bzw. Traufblech mit Rinneneinhang, "
             "einschließlich Abdichtungsanschluss und Holzbohle.",
     "bezug": "Länge des Dachrands, Ecken übermessen",
     "fest": [["021.02.008.01001", 1.0]],
     "schichten": [
         {"name": "Dachrand", "optionen": [
             {"k": "Profil 100", "t": "Dachrandprofil Ansichtshöhe 100 mm", "teile": [["021.04.002.01001", 1.0]], "std": True},
             {"k": "Profil 200", "t": "Dachrandprofil Ansichtshöhe 200 mm", "teile": [["021.04.002.02001", 1.0]], "std": True},
             {"k": "Traufblech", "t": "Traufblech/Rinneneinhangblech Alu/Titanzink mit Anschluss", "teile": [["021.04.009.01001", 1.0]], "std": True}]},
         {"name": "Stirnbekleidung", "optionen": [
             {"k": "", "t": "ohne Stirnbekleidung", "teile": [], "std": True},
             {"k": "Kantteil Alu", "t": "Stirnblende Kantteil Aluminium beschichtet, Z ≤ 250", "teile": [["022.02.010.03001", 1.0]], "std": True},
             {"k": "Kantteil Zink", "t": "Stirnblende Kantteil Titanzink, Z ≤ 250", "teile": [["022.02.010.01001", 1.0]]}]},
     ], "tags": ["neubau"]},

    {"id": "363.20", "kg": "363", "name": "Wandanschluss Flachdach", "einheit": "m",
     "lang": "Anschluss der Flachdachabdichtung an aufgehende Wände mit Aufkantung, Klemmschiene und Überhangstreifen.",
     "bezug": "Länge des Wandanschlusses",
     "fest": [["021.02.007.01001", 1.0]],
     "schichten": [
         {"name": "Aufkantung", "optionen": [
             {"k": "Bit. h30", "t": "Wandanschluss Bitumen zweilagig, Höhe bis 30 cm", "teile": [["021.04.001.01001", 1.0]], "std": True},
             {"k": "Bit. h50", "t": "Wandanschluss Bitumen zweilagig, Höhe bis 50 cm", "teile": [["021.04.001.02001", 1.0]]},
             {"k": "KSt h30", "t": "Wandanschluss Kunststoffbahn, Höhe bis 30 cm", "teile": [["021.04.001.03001", 1.0]], "std": True}]},
         {"name": "Abschluss", "optionen": [
             {"k": "Klemmschiene", "t": "Wandanschlussprofil/Klemmschiene mit Dichtfuge", "teile": [["021.04.010.01001", 1.0]], "std": True},
             {"k": "Kappleiste", "t": "Kappleiste mit Überhangstreifen Titanzink", "teile": [["022.02.007.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "363.21", "kg": "363", "name": "Dachrinne + Fallrohr", "einheit": "m",
     "lang": "Hängedachrinne halbrund mit Rinnenstutzen, Endstücken und Rinnenwinkeln anteilig sowie Fallrohren mit Bögen "
             "und Standrohr (1 Fallrohr je ca. 10 m Traufe, Höhe ca. 6 m).",
     "bezug": "Länge der Traufe",
     "fest": [["022.01.011.01001", 0.1], ["022.01.010.01001", 0.1], ["022.01.005.02001", 0.3], ["022.01.006.01001", 0.1]],
     "schichten": [
         {"name": "Rinne", "optionen": [
             {"k": "Zink 333", "t": "Hängedachrinne Titanzink 0,7 mm, Größe 333, mit Stutzen", "teile": [["022.01.001.01001", 1.0], ["022.01.003.01001", 0.1]], "std": True},
             {"k": "Zink 400", "t": "Hängedachrinne Titanzink 0,7 mm, Größe 400, mit Stutzen", "teile": [["022.01.001.02001", 1.0], ["022.01.003.01001", 0.1]], "std": True},
             {"k": "Kupfer 333", "t": "Hängedachrinne Kupfer 0,6 mm, Größe 333, mit Stutzen", "teile": [["022.01.001.03001", 1.0], ["022.01.003.02001", 0.1]], "std": True},
             {"k": "Kupfer 400", "t": "Hängedachrinne Kupfer 0,7 mm, Größe 400, mit Stutzen", "teile": [["022.01.001.04001", 1.0], ["022.01.003.02001", 0.1]]},
             {"k": "Alu 333", "t": "Hängedachrinne Aluminium beschichtet, Größe 333, mit Stutzen", "teile": [["022.01.001.05001", 1.0], ["022.01.003.01001", 0.1]], "std": True}]},
         {"name": "Fallrohr", "optionen": [
             {"k": "FR Zink 100", "t": "Fallrohr Titanzink DN 100, 0,6 m je m Traufe", "teile": [["022.01.004.02001", 0.6]], "std": True},
             {"k": "FR Zink 80", "t": "Fallrohr Titanzink DN 80, 0,6 m je m Traufe", "teile": [["022.01.004.01001", 0.6]]},
             {"k": "FR Kupfer 100", "t": "Fallrohr Kupfer DN 100, 0,6 m je m Traufe", "teile": [["022.01.004.03001", 0.6]]},
             {"k": "FR Alu 100", "t": "Fallrohr Aluminium beschichtet DN 100, 0,6 m je m Traufe", "teile": [["022.01.004.04001", 0.6]]},
             {"k": "FR WDVS", "t": "Fallrohr Titanzink DN 100 mit Abstandsschellen für WDVS bis 200 mm", "teile": [["022.01.004.02001", 0.6], ["022.01.015.02001", 0.3]], "std": True}]},
         {"name": "Zubehör", "optionen": [
             {"k": "", "t": "ohne Zubehör", "teile": [], "std": True},
             {"k": "Laubschutz", "t": "Laubschutzgitter in der Rinne", "teile": [["022.01.008.01001", 1.0]], "std": True},
             {"k": "Rinnenheizung", "t": "Rinnenheizung selbstregelnd in Rinne und Fallrohr", "teile": [["022.01.009.01001", 1.6]]},
             {"k": "Regensammler", "t": "Regensammler für Zisterne anteilig", "teile": [["022.01.007.01001", 0.1]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "363.22", "kg": "363", "name": "Kastenrinne + Fallrohr", "einheit": "m",
     "lang": "Kastenrinne aus Metall (z. B. vor Attika, an Hallendächern) mit Rinnenstutzen, Dehnungsausgleichern und Fallrohren "
             "(1 Fallrohr je ca. 10 m, Höhe ca. 6 m), optional Rinnenkessel.",
     "bezug": "Länge der Rinne",
     "fest": [["022.01.012.01001", 0.08], ["022.01.005.02001", 0.3], ["022.01.004.02001", 0.6]],
     "schichten": [
         {"name": "Rinne", "optionen": [
             {"k": "Kasten Zink 500", "t": "Kastenrinne Titanzink 0,8 mm, Zuschnitt 500 mm, mit Stutzen", "teile": [["022.01.002.01001", 1.0], ["022.01.003.01001", 0.1]], "std": True},
             {"k": "Kasten Zink 667", "t": "Kastenrinne Titanzink 0,8 mm, Zuschnitt 667 mm, mit Stutzen", "teile": [["022.01.002.02001", 1.0], ["022.01.003.01001", 0.1]], "std": True},
             {"k": "Kasten VA 500", "t": "Kastenrinne Edelstahl 0,6 mm, Zuschnitt 500 mm, mit Stutzen", "teile": [["022.01.002.03001", 1.0], ["022.01.003.01001", 0.1]], "std": True}]},
         {"name": "Zubehör", "optionen": [
             {"k": "", "t": "ohne Rinnenkessel", "teile": [], "std": True},
             {"k": "Rinnenkessel", "t": "Rinnenkessel/Wasserfangkasten je Fallrohr", "teile": [["022.01.013.01001", 0.1]], "std": True},
             {"k": "Rinnenheizung", "t": "Rinnenheizung selbstregelnd in Rinne und Fallrohr", "teile": [["022.01.009.01001", 1.6]]}]},
     ], "tags": ["neubau"]},

    {"id": "363.23", "kg": "363", "name": "Flachdach-Entwässerungspunkt", "einheit": "St",
     "lang": "Entwässerungspunkt im Flachdach: Dachablauf gedämmt mit Aufstockelement bzw. Attikagully, zugehöriger Notüberlauf "
             "und Zubehör je nach Dachaufbau.",
     "bezug": "Stück je Dachablauf",
     "schichten": [
         {"name": "Ablauf", "optionen": [
             {"k": "Gully DN 70", "t": "Dachgully DN 70 senkrecht, gedämmt", "teile": [["021.05.001.01001", 1.0]]},
             {"k": "Gully DN 100", "t": "Dachgully DN 100 senkrecht, gedämmt", "teile": [["021.05.001.02001", 1.0]], "std": True},
             {"k": "Gully DN 100 w.", "t": "Dachgully DN 100 waagerecht, gedämmt", "teile": [["021.05.001.03001", 1.0]], "std": True},
             {"k": "Attikagully 100", "t": "Attikagully/Speier mit Fallrohranschluss DN 100", "teile": [["021.05.004.02001", 1.0]], "std": True},
             {"k": "Druckströmung", "t": "Dachablauf für Druckströmungsentwässerung", "teile": [["021.05.003.01001", 1.0]]}]},
         {"name": "Notentwässerung", "optionen": [
             {"k": "", "t": "ohne Notüberlauf (gesondert)", "teile": []},
             {"k": "NÜ 100×50", "t": "Notüberlauf Attika, Speier 100 × 50 mm", "teile": [["021.05.002.01001", 1.0]], "std": True},
             {"k": "NÜ 200×100", "t": "Notüberlauf Attika, Speier 200 × 100 mm", "teile": [["021.05.002.02001", 1.0]], "std": True}]},
         {"name": "Zubehör", "optionen": [
             {"k": "", "t": "ohne Zubehör", "teile": [], "std": True},
             {"k": "Kontrollschacht", "t": "Kontrollschacht für Dachablauf (begrünt/bekiest)", "teile": [["021.06.003.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "363.24", "kg": "363", "name": "Ortgang Steildach", "einheit": "m",
     "lang": "Ortgangausbildung am Steildach mit Ortgangziegeln, Ortgangblech oder Zahnleiste, optional Stirnbrett mit Lasur.",
     "bezug": "Länge des Ortgangs in der Neigung",
     "schichten": [
         {"name": "Ortgang", "optionen": [
             {"k": "Ortgangziegel", "t": "Ortgang mit Ortgangziegeln/-steinen", "teile": [["020.03.002.01001", 1.0]], "std": True},
             {"k": "Ortgangblech", "t": "Ortgang mit Ortgangblech Alu/Titanzink", "teile": [["020.03.002.02001", 1.0]], "std": True},
             {"k": "Zahnleiste", "t": "Ortgang überstehend mit Zahnleiste", "teile": [["020.03.008.01001", 1.0]]},
             {"k": "Windfeder Zink", "t": "Ortgangblech/Windfeder Titanzink, Z ≤ 333", "teile": [["022.02.004.01001", 1.0]], "std": True}]},
         {"name": "Stirnbrett", "optionen": [
             {"k": "", "t": "ohne Stirnbrett", "teile": [], "std": True},
             {"k": "Brett 200 lasiert", "t": "Ortgangbrett 24 × 200 mm, Lasur", "teile": [["016.02.006.01001", 1.0], ["034.03.002.08001", 0.5]], "std": True},
             {"k": "Brett 300 lasiert", "t": "Ortgangbrett 24 × 300 mm, Lasur", "teile": [["016.02.006.02001", 1.0], ["034.03.002.08001", 0.7]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "363.25", "kg": "363", "name": "Kehle Steildach", "einheit": "m",
     "lang": "Kehlausbildung am Steildach als Metallkehle, eingebundene Kehle oder mit Kehlformziegeln, mit Kehlschalung.",
     "bezug": "Länge der Kehle in der Neigung",
     "schichten": [
         {"name": "Kehle", "optionen": [
             {"k": "Metallkehle Zink", "t": "Metallkehle Titanzink, Zuschnitt 50 cm", "teile": [["020.03.003.01001", 1.0]], "std": True},
             {"k": "Kehlblech Kupfer", "t": "Kehlblech Kupfer 0,6 mm, Zuschnitt 500 mm", "teile": [["022.02.003.02001", 1.0]], "std": True},
             {"k": "eingebunden", "t": "eingebundene Kehle (Biber/Schiefer)", "teile": [["020.03.003.02001", 1.0]], "std": True},
             {"k": "Kehlziegel", "t": "Kehle mit Kehlziegeln/Kehlformsteinen", "teile": [["020.03.009.01001", 1.0]]}]},
         {"name": "Unterlage", "optionen": [
             {"k": "", "t": "Unterlage in der Dachfläche enthalten", "teile": []},
             {"k": "Kehlschalung", "t": "Kehlschalung Rauspund 0,6 m² je m mit Unterdach", "teile": [["020.01.006.01001", 0.6], ["020.01.007.01001", 0.6]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "363.26", "kg": "363", "name": "Schornsteinanschluss Steildach", "einheit": "St",
     "lang": "Anschluss und Verwahrung eines Schornsteins im Steildach einschließlich Unterdeckungsanschluss, optional "
             "Bekleidung des Schornsteinkopfes und Abdeckhaube.",
     "bezug": "Stück je Schornstein",
     "fest": [["020.01.008.01001", 1.0]],
     "schichten": [
         {"name": "Verwahrung", "optionen": [
             {"k": "Bleiersatz", "t": "Schornsteinanschluss mit Bleiersatz", "teile": [["020.04.009.01001", 1.0]], "std": True},
             {"k": "Verwahrung Zink", "t": "Schornsteinverwahrung Titanzink", "teile": [["022.02.005.01001", 1.0]], "std": True},
             {"k": "Verwahrung Cu", "t": "Schornsteinverwahrung Kupfer", "teile": [["022.02.005.02001", 1.0]]}]},
         {"name": "Kopf", "optionen": [
             {"k": "", "t": "Schornsteinkopf ohne Bekleidung", "teile": [], "std": True},
             {"k": "Kopf bekleidet", "t": "Schornsteinkopf mit Metall bekleiden, ca. 3 m²", "teile": [["022.02.006.01001", 3.0]], "std": True}]},
         {"name": "Haube", "optionen": [
             {"k": "", "t": "ohne Haube", "teile": [], "std": True},
             {"k": "Haube VA", "t": "Schornsteinhaube Edelstahl", "teile": [["022.02.013.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "363.27", "kg": "363", "name": "Dachdurchgang Steildach", "einheit": "St",
     "lang": "Dachdurchgang für Leitungen im Steildach als Systemelement mit Anschluss an Unterdeckung und luftdichtem Anschluss "
             "an die Dampfbremse.",
     "bezug": "Stück je Durchgang",
     "fest": [["020.01.008.01001", 1.0]],
     "schichten": [
         {"name": "Durchgang", "optionen": [
             {"k": "Entlüftung 100", "t": "Entlüftungsleitung DN 100", "teile": [["020.04.005.01001", 1.0]], "std": True},
             {"k": "Antenne/Kabel", "t": "Antennen-/Kabeldurchführung", "teile": [["020.04.005.02001", 1.0]], "std": True},
             {"k": "Fortluft 160", "t": "Lüftungs-Fortluft DN 160", "teile": [["020.04.005.03001", 1.0]], "std": True},
             {"k": "PV-Durchführung", "t": "PV-Leitungsdurchführung, Systemelement", "teile": [["020.04.013.01001", 1.0]], "std": True},
             {"k": "Lüftungshaube", "t": "Lüftungshaube/Dunstrohraufsatz", "teile": [["020.04.016.01001", 1.0]]}]},
         {"name": "Luftdichtheit", "optionen": [
             {"k": "", "t": "ohne innenseitigen Anschluss (Kaltdach)", "teile": [], "std": True},
             {"k": "luftdicht", "t": "luftdichter Anschluss der Dampfbremse an die Durchdringung", "teile": [["039.05.004.02001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "363.28", "kg": "363", "name": "Durchdringung Flachdach", "einheit": "St",
     "lang": "Einfassung von Rohr-, Stützen- und Kabeldurchdringungen in der Flachdachabdichtung bzw. Anschluss an Gerätesockel.",
     "bezug": "Stück je Durchdringung",
     "schichten": [
         {"name": "Durchdringung", "optionen": [
             {"k": "bis Ø 110", "t": "Durchdringung einfassen, Ø bis 110 mm", "teile": [["021.04.004.01001", 1.0]], "std": True},
             {"k": "bis Ø 250", "t": "Durchdringung einfassen, Ø bis 250 mm", "teile": [["021.04.004.02001", 1.0]], "std": True},
             {"k": "Gerätesockel", "t": "Anschluss an Lüftungsgerät/Fundamentsockel, ca. 4 m Aufkantung", "teile": [["021.04.008.01001", 4.0]], "std": True}]},
         {"name": "Abdeckung", "optionen": [
             {"k": "", "t": "ohne Aufsatz", "teile": [], "std": True},
             {"k": "Lüftungshaube", "t": "Lüftungshaube/Entlüftungsaufsatz Blech DN 100–150", "teile": [["022.02.014.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    # =========================================================================================== 364 Dachbekleidungen
    {"id": "364.01", "kg": "364", "name": "Dachschräge GK-Bekleidung", "einheit": "m²",
     "lang": "Innere Bekleidung geneigter Dächer bzw. Holzflachdächer mit Gipsplatten auf Unterkonstruktion, optional mit "
             "Installationsebene, einschließlich Verspachtelung und Anstrich. Dämmung gesondert (KG 363).",
     "bezug": "bekleidete Fläche in der Neigung gemessen",
     "fest": [["039.05.004.01001", 0.3]],
     "schichten": [
         {"name": "Bekleidung", "optionen": [
             {"k": "GKB 12,5", "t": "Gipsplatte 1 × 12,5 mm GKB auf Federschiene", "teile": [["039.04.001.01001", 1.0]], "std": True},
             {"k": "GKF 2×12,5 F30", "t": "Gipsplatte 2 × 12,5 mm GKF (F30-B mit Sparren)", "teile": [["039.04.001.02001", 1.0]], "std": True},
             {"k": "GF 12,5", "t": "Gipsfaserplatte 12,5 mm direkt befestigt", "teile": [["039.04.004.02001", 1.0]], "std": True},
             {"k": "GKB direkt", "t": "Gipsplatte 1 × 12,5 mm GKB direkt befestigt", "teile": [["039.04.004.01001", 1.0]]}]},
         {"name": "Installationsebene", "optionen": [
             {"k": "", "t": "ohne Installationsebene", "teile": [], "std": True},
             {"k": "Inst.-Ebene", "t": "Installationsebene Lattung 40/60 mit Dämmung 40 mm", "teile": [["016.04.003.01001", 1.0]], "std": True}]},
         {"name": "Oberfläche", "optionen": OBERFL_GK},
     ], "tags": ["neubau", "altbau"]},

    {"id": "364.02", "kg": "364", "name": "Dachschräge Holzbekleidung", "einheit": "m²",
     "lang": "Innere Bekleidung geneigter Dächer oder Dachuntersichten mit Profilholz, Holzwerkstoff- oder Akustikpaneelen, "
             "optional mit Installationsebene und Oberflächenbehandlung.",
     "bezug": "bekleidete Fläche in der Neigung gemessen",
     "schichten": [
         {"name": "Bekleidung", "optionen": [
             {"k": "Profilholz", "t": "Profilholz Fichte 14 mm", "teile": [["016.02.009.01001", 1.0]], "std": True},
             {"k": "Profilbretter", "t": "Profilbretter Fichte", "teile": [["027.03.003.01001", 1.0]], "std": True},
             {"k": "Dreischicht 19", "t": "Dreischichtplatte 19 mm", "teile": [["039.03.009.03001", 1.0]], "std": True},
             {"k": "Holzwolle", "t": "Holzwolle-Akustikplatten", "teile": [["016.02.009.02001", 1.0]], "std": True},
             {"k": "Akustik geschl.", "t": "Holz-Akustikpaneele geschlitzt", "teile": [["016.02.009.03001", 1.0]]},
             {"k": "Akustik Holz", "t": "Akustik-Holzpaneele", "teile": [["027.03.003.02001", 1.0]]}]},
         {"name": "Installationsebene", "optionen": [
             {"k": "", "t": "ohne Installationsebene", "teile": [], "std": True},
             {"k": "Inst.-Ebene", "t": "Installationsebene Lattung 40/60 mit Dämmung 40 mm", "teile": [["016.04.003.01001", 1.0]], "std": True}]},
         {"name": "Oberfläche", "optionen": [
             {"k": "", "t": "unbehandelt bzw. werkseitig beschichtet", "teile": [], "std": True},
             {"k": "lasiert", "t": "Imprägniergrund und Dünnschichtlasur", "teile": [["034.03.002.08001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "364.03", "kg": "364", "name": "Dachausbau Schräge kompakt", "einheit": "m²",
     "lang": "Ausbau der Dachschräge als Trockenbau-Komplettleistung: Zwischensparrendämmung, Dampfbremse, Unterkonstruktion und "
             "Gipsplatte 12,5 mm, optional Untersparrendämmung; nicht zusätzlich mit 363.04 rechnen.",
     "bezug": "bekleidete Fläche in der Neigung gemessen",
     "fest": [["039.05.004.01001", 0.4]],
     "schichten": [
         {"name": "Paket", "optionen": [
             {"k": "ZSD 160", "t": "Dachschrägenbekleidung mit Zwischensparrendämmung 160 mm", "teile": [["039.05.001.01001", 1.0]], "std": True},
             {"k": "ZSD 200", "t": "Dachschrägenbekleidung mit Zwischensparrendämmung 200 mm", "teile": [["039.05.001.02001", 1.0]], "std": True},
             {"k": "ZSD 240", "t": "Dachschrägenbekleidung mit Zwischensparrendämmung 240 mm", "teile": [["039.05.001.03001", 1.0]], "std": True}]},
         {"name": "Untersparrendämmung", "optionen": [
             {"k": "", "t": "ohne Untersparrendämmung", "teile": [], "std": True},
             {"k": "USD 40", "t": "Untersparrendämmung zusätzlich 40 mm", "teile": [["039.05.002.01001", 1.0]], "std": True},
             {"k": "USD 60", "t": "Untersparrendämmung zusätzlich 60 mm", "teile": [["039.05.002.02001", 1.0]], "std": True}]},
         {"name": "Oberfläche", "optionen": OBERFL_GK[:2]},
     ], "tags": ["altbau"]},

    {"id": "364.04", "kg": "364", "name": "Flachdach-Untersicht StB", "einheit": "m²",
     "lang": "Untersicht von Stahlbeton-Dachdecken: Deckenputz mit Anstrich oder abgehängte Unterdecke (glatt, Akustik, Raster), "
             "optional mit Hohlraumdämmung.",
     "bezug": "Deckenfläche (lichte Raummaße)",
     "schichten": [
         {"name": "Bekleidung", "optionen": [
             {"k": "Gipsputz 8", "t": "Deckenputz Gipsputz 8 mm auf Beton", "teile": [["023.02.002.01001", 1.0]], "std": True},
             {"k": "KZ-Putz 12", "t": "Deckenputz Kalk-Zementputz 12 mm", "teile": [["023.02.002.03001", 1.0]]},
             {"k": "GK abgehängt", "t": "abgehängte GK-Decke 1 × 12,5 mm, Abhängehöhe bis 50 cm, Q2", "teile": [["039.04.003.01001", 1.0]], "std": True},
             {"k": "Akustik Loch", "t": "Akustikdecke Gips-Lochplatte mit Vlies", "teile": [["039.04.006.01001", 1.0]], "std": True},
             {"k": "Raster MF", "t": "Rasterdecke Mineralfaser 625 × 625 mm", "teile": [["039.04.007.01001", 1.0]], "std": True},
             {"k": "Holzwolle 25", "t": "Holzwolle-Akustikplatte 25 mm, direkt", "teile": [["039.04.013.01001", 1.0]]}]},
         {"name": "Hohlraumdämmung", "optionen": [
             {"k": "", "t": "ohne Hohlraumdämmung", "teile": [], "std": True},
             {"k": "MW 40", "t": "Hohlraumdämmung Mineralwolle 40 mm (bei Unterdecke)", "teile": [["039.04.002.01001", 1.0]], "std": True}]},
         {"name": "Anstrich", "optionen": [
             {"k": "", "t": "Dispersionsanstrich", "teile": [["034.02.001.03001", 1.0]], "std": True},
             {"k": "ohne Anstrich", "t": "ohne Anstrich (Systemoberfläche)", "teile": []}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "364.05", "kg": "364", "name": "Dachüberstand / Traufkasten", "einheit": "m",
     "lang": "Bekleidung der Dachüberstands-Untersicht an der Traufe mit Profilholz einschließlich Traufbohle mit Lüftungsgitter, "
             "optional Stirnbrett, mit Anstrich.",
     "bezug": "Länge der Traufe",
     "fest": [["016.02.004.01001", 1.0]],
     "schichten": [
         {"name": "Untersicht", "optionen": [
             {"k": "Ausladung 40", "t": "Untersicht Profilholz Fichte, Ausladung ca. 40 cm", "teile": [["016.02.005.01001", 0.4]], "std": True},
             {"k": "Ausladung 60", "t": "Untersicht Profilholz Fichte, Ausladung ca. 60 cm", "teile": [["016.02.005.01001", 0.6]], "std": True},
             {"k": "Ausladung 90", "t": "Untersicht Profilholz Fichte, Ausladung ca. 90 cm", "teile": [["016.02.005.01001", 0.9]]}]},
         {"name": "Stirnbrett", "optionen": [
             {"k": "", "t": "ohne Stirnbrett", "teile": [], "std": True},
             {"k": "Stirnbrett 200", "t": "Stirnbrett Lärche/Fichte 24 × 200 mm", "teile": [["016.02.006.01001", 1.0]], "std": True}]},
         {"name": "Anstrich", "optionen": [
             {"k": "", "t": "Traufkasten streichen", "teile": [["034.03.007.02001", 1.0]], "std": True},
             {"k": "ohne Anstrich", "t": "ohne Anstrich (vorbehandelt geliefert)", "teile": []}]},
     ], "tags": ["neubau", "altbau"]},

    # =========================================================================================== 369 Sonstiges Dächer
    {"id": "369.01", "kg": "369", "name": "Absturzsicherung Flachdach", "einheit": "m",
     "lang": "Kollektive oder individuelle Absturzsicherung am Flachdachrand: freistehendes Geländer, Klappgeländer an der Attika "
             "oder Seilsicherungssystem, optional mit zusätzlichen Einzelanschlagpunkten.",
     "bezug": "Länge des gesicherten Dachrands",
     "schichten": [
         {"name": "System", "optionen": [
             {"k": "Geländer frei", "t": "freistehendes Geländer mit Ballastgewichten", "teile": [["031.02.007.01001", 1.0]], "std": True},
             {"k": "Klappgeländer", "t": "Klappgeländer an Attika befestigt", "teile": [["031.02.007.02001", 1.0]], "std": True},
             {"k": "Seilsystem", "t": "Seilsicherungssystem Edelstahlseil inkl. Stützen", "teile": [["021.06.006.01001", 1.0]], "std": True},
             {"k": "Einzelanschlag", "t": "Einzelanschlagpunkte auf StB-Decke, Abstand ca. 10 m", "teile": [["021.06.005.01001", 0.1]], "std": True}]},
         {"name": "Ergänzung", "optionen": [
             {"k": "", "t": "ohne Ergänzung", "teile": [], "std": True},
             {"k": "+Anschlagpunkte", "t": "zusätzliche Einzelanschlagpunkte auflastgehalten, je 20 m", "teile": [["021.06.005.02001", 0.05]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "369.02", "kg": "369", "name": "Anschlagpunkt / Dachsicherung", "einheit": "St",
     "lang": "Anschlageinrichtung nach DIN EN 795 für Wartungsarbeiten auf Steil- oder Flachdach, optional mit Laufrosten "
             "bzw. Trittstufen für den Schornsteinfeger.",
     "bezug": "Stück je Anschlagpunkt",
     "schichten": [
         {"name": "Anschlagpunkt", "optionen": [
             {"k": "Dachhaken", "t": "Sicherheitsdachhaken/Anschlageinrichtung Steildach", "teile": [["020.04.008.01001", 1.0]], "std": True},
             {"k": "EN 795 Steildach", "t": "Anschlagpunkt/Sicherungssystem nach EN 795", "teile": [["031.04.006.01001", 1.0]], "std": True},
             {"k": "EAP StB", "t": "Einzelanschlagpunkt Flachdach, auf StB-Decke verankert", "teile": [["021.06.005.01001", 1.0]], "std": True},
             {"k": "EAP Auflast", "t": "Einzelanschlagpunkt Flachdach, auflastgehalten", "teile": [["021.06.005.02001", 1.0]], "std": True}]},
         {"name": "Laufanlage", "optionen": [
             {"k": "", "t": "ohne Laufanlage", "teile": [], "std": True},
             {"k": "Tritt 25", "t": "2 Trittstufen 25 cm", "teile": [["020.04.007.01001", 2.0]], "std": True},
             {"k": "Laufrost 80", "t": "2 Laufroste 80 cm", "teile": [["020.04.007.02001", 2.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "369.03", "kg": "369", "name": "Schneefang Steildach", "einheit": "m",
     "lang": "Schneefangsystem an geneigten Dächern als Schneefanggitter, Rundholz-Schneefang oder Einzel-Schneestopper, "
             "optional zweite Reihe bei langen Sparren.",
     "bezug": "Länge der Schneefangreihe(n) entlang der Traufe",
     "schichten": [
         {"name": "System", "optionen": [
             {"k": "Gitter 20", "t": "Schneefanggitter Höhe 20 cm", "teile": [["020.04.006.01001", 1.0]], "std": True},
             {"k": "Rundholz", "t": "Rundholz-Schneefang Ø 12 cm", "teile": [["020.04.006.02001", 1.0]], "std": True},
             {"k": "Schneestopper", "t": "Schneestopper einzeln, ca. 3 St je m", "teile": [["020.04.014.01001", 3.0]], "std": True}]},
         {"name": "Reihen", "optionen": [
             {"k": "", "t": "eine Reihe an der Traufe", "teile": [], "std": True},
             {"k": "+Stopper", "t": "zusätzlich Schneestopper in der Fläche, ca. 2 St je m", "teile": [["020.04.014.01001", 2.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "369.04", "kg": "369", "name": "Wartungssteg Dach", "einheit": "m",
     "lang": "Laufsteg bzw. Wartungsbühne aus Stahl mit Gitterrost, feuerverzinkt, für den Zugang zu Dachtechnik, optional mit Geländer.",
     "bezug": "Länge des Stegs",
     "schichten": [
         {"name": "Steg", "optionen": [
             {"k": "B 0,6", "t": "Laufsteg Gitterrost, Breite 0,6 m", "teile": [["017.04.011.01001", 1.0]], "std": True},
             {"k": "B 0,8", "t": "Laufsteg Gitterrost, Breite 0,8 m", "teile": [["017.04.011.02001", 1.0]], "std": True},
             {"k": "B 1,2", "t": "Wartungsbühne Gitterrost, Breite 1,2 m", "teile": [["017.04.011.03001", 1.0]], "std": True}]},
         {"name": "Geländer", "optionen": [
             {"k": "", "t": "ohne Geländer", "teile": [], "std": True},
             {"k": "Geländer", "t": "freistehendes Geländer einseitig", "teile": [["031.02.007.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "369.05", "kg": "369", "name": "Vordach", "einheit": "St",
     "lang": "Vordach über Eingängen aus Holz, Stahl, Aluminium oder Glas mit Befestigung, optional mit Entwässerung über Fallrohr.",
     "bezug": "Stück je Vordach",
     "schichten": [
         {"name": "Vordach", "optionen": [
             {"k": "Holz bis 4 m²", "t": "Vordach Holz BSH, bis 4 m²", "teile": [["016.01.008.01001", 1.0]], "std": True},
             {"k": "VA-Glas 1,0", "t": "Vordach Edelstahl-Glas VSG, Ausladung 1,0 m, B 1,6 m", "teile": [["031.04.001.01001", 1.0]], "std": True},
             {"k": "Stahl 1,5", "t": "Vordach Stahl verzinkt, Ausladung 1,5 m, B 2,5 m", "teile": [["031.04.001.02001", 1.0]]},
             {"k": "Alu-Kassette", "t": "Kassettenvordach Aluminium, Ausladung 1,5 m, B 3,0 m", "teile": [["031.04.001.03001", 1.0]], "std": True},
             {"k": "Glas Zugstangen", "t": "Glas-Vordach mit Zugstangen, Tiefe 1,2 m, B 2,5 m", "teile": [["032.03.004.02001", 1.0]], "std": True}]},
         {"name": "Entwässerung", "optionen": [
             {"k": "", "t": "freie Entwässerung über Tropfkante", "teile": [], "std": True},
             {"k": "Fallrohr", "t": "Wasserspeier und Fallrohr DN 80, ca. 3 m", "teile": [["022.01.018.01001", 1.0], ["022.01.004.01001", 3.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    # =========================================================================================== 371 Garagen, Carports
    {"id": "371.01", "kg": "371", "name": "Fertiggarage Beton", "einheit": "St",
     "lang": "Betonfertigteilgarage geliefert und versetzt, mit Gründung, optional Sektionaltor mit Antrieb, Dachbegrünung "
             "und Dachentwässerung.",
     "bezug": "Stück je Garage",
     "schichten": [
         {"name": "Garage", "optionen": [
             {"k": "Einzel 3×6", "t": "Fertigteilgarage Einzelgarage 3 × 6 m, mit Standardtor", "teile": [["013.09.012.01001", 1.0]], "std": True},
             {"k": "Großraum 3,5×7", "t": "Fertigteilgarage Großraum 3,5 × 7 m, mit Standardtor", "teile": [["013.09.012.02001", 1.0]], "std": True}]},
         {"name": "Gründung", "optionen": [
             {"k": "Streifenfund.", "t": "Streifenfundamente C20/25 ca. 1,6 m³", "teile": [["013.02.001.02001", 1.6]], "std": True},
             {"k": "Bodenplatte", "t": "Bodenplatte komplett d = 16 cm, ca. 20 m²", "teile": [["013.09.001.01001", 20.0]], "std": True}]},
         {"name": "Tor", "optionen": [
             {"k": "", "t": "Standardtor der Garage", "teile": [], "std": True},
             {"k": "Sektionaltor", "t": "Garagen-Sektionaltor mit Motor 2,50 × 2,125 m (statt Standardtor)", "teile": [["031.01.009.01001", 1.0]], "std": True}]},
         {"name": "Dach", "optionen": [
             {"k": "", "t": "Dach werkseitig abgedichtet", "teile": [], "std": True},
             {"k": "Gründach", "t": "extensive Dachbegrünung 8 cm mit Wurzelschutz, ca. 20 m²", "teile": [["021.06.002.01001", 20.0], ["021.03.011.01001", 20.0]], "std": True}]},
         {"name": "Entwässerung", "optionen": [
             {"k": "", "t": "Entwässerung werkseitig/gesondert", "teile": [], "std": True},
             {"k": "Rinne+Fallrohr", "t": "Hängedachrinne Zink 333, 6 m, mit Fallrohr DN 100", "teile": [["022.01.001.01001", 6.0], ["022.01.003.01001", 1.0], ["022.01.004.02001", 2.5], ["022.01.005.02001", 2.0]]}]},
     ], "tags": ["neubau"]},

    {"id": "371.02", "kg": "371", "name": "Carport", "einheit": "St",
     "lang": "Carport für einen oder zwei Pkw aus Holz oder verzinktem Stahl mit Punktfundamenten, optional Dachbegrünung und "
             "Entwässerung mit Rinne und Fallrohr.",
     "bezug": "Stück je Carport",
     "fest": [["013.02.002.02001", 0.6]],
     "schichten": [
         {"name": "Carport", "optionen": [
             {"k": "Holz 1 Pkw", "t": "Carport Holz BSH, bis 18 m²", "teile": [["016.01.008.02001", 1.0]], "std": True},
             {"k": "Stahl 1 Pkw", "t": "Carport Stahl verzinkt für 1 Pkw", "teile": [["031.04.007.02001", 1.0]], "std": True},
             {"k": "Stahl 2 Pkw", "t": "Carport Stahl verzinkt für 2 Pkw", "teile": [["031.04.007.03001", 1.0], ["013.02.002.02001", 0.4]], "std": True},
             {"k": "Fahrräder 5 m", "t": "Fahrradüberdachung Stahl, Länge 5 m", "teile": [["031.04.007.01001", 1.0]]}]},
         {"name": "Dach", "optionen": [
             {"k": "", "t": "Dacheindeckung im Lieferumfang", "teile": [], "std": True},
             {"k": "Gründach", "t": "Abdichtung EPDM und extensive Begrünung 8 cm, ca. 18 m²", "teile": [["021.03.003.01001", 18.0], ["021.06.002.01001", 18.0]], "std": True}]},
         {"name": "Entwässerung", "optionen": [
             {"k": "", "t": "freie Entwässerung", "teile": [], "std": True},
             {"k": "Rinne+Fallrohr", "t": "Hängedachrinne Zink 333, 6 m, mit Fallrohr DN 100", "teile": [["022.01.001.01001", 6.0], ["022.01.003.01001", 1.0], ["022.01.004.02001", 2.5], ["022.01.005.02001", 2.0]], "std": True}]},
     ], "tags": ["neubau"]},

    # =========================================================================================== 381 Allgemeine Einbauten
    {"id": "381.01", "kg": "381", "name": "Einbauschrank raumhoch", "einheit": "m²",
     "lang": "Raumhoher Einbauschrank nach Maß, 60 cm tief, mit Drehtüren, Böden und Kleiderstangen, optional ergänzt um "
             "Garderobenpaneel oder offene Regale.",
     "bezug": "Frontfläche (Breite × Höhe)",
     "fest": [["027.03.004.02001", 0.4]],
     "schichten": [
         {"name": "Schrank", "optionen": [
             {"k": "melamin weiß", "t": "Korpus und Front melaminbeschichtet weiß", "teile": [["027.02.001.01001", 1.0]], "std": True},
             {"k": "MDF lackiert", "t": "Front MDF lackiert", "teile": [["027.02.001.02001", 1.0]], "std": True},
             {"k": "Echtholz", "t": "Front Echtholzfurnier", "teile": [["027.02.001.03001", 1.0]], "std": True}]},
         {"name": "Ergänzung", "optionen": [
             {"k": "", "t": "ohne Ergänzung", "teile": [], "std": True},
             {"k": "+Garderobe", "t": "Garderobenpaneel mit Haken und Ablage, 0,3 m je m²", "teile": [["027.02.002.01001", 0.3]], "std": True},
             {"k": "+Regal", "t": "offenes Regal nach Maß, 0,3 m² je m²", "teile": [["027.02.008.01001", 0.3]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "381.02", "kg": "381", "name": "Teeküche / Pantry", "einheit": "St",
     "lang": "Teeküche bzw. Pantryküche komplett mit Unter- und Oberschränken, Arbeitsplatte, Spüle und Grundgeräten, "
             "mit Spritzschutz an der Wand.",
     "bezug": "Stück je Küchenzeile",
     "schichten": [
         {"name": "Küche", "optionen": [
             {"k": "1,80 m", "t": "Teeküche komplett, Länge 1,80 m", "teile": [["027.02.006.01001", 1.0]], "std": True},
             {"k": "2,40 m", "t": "Teeküche komplett, Länge 2,40 m", "teile": [["027.02.006.02001", 1.0]], "std": True},
             {"k": "3,00 m", "t": "Teeküche komplett, Länge 3,00 m", "teile": [["027.02.006.03001", 1.0]], "std": True}]},
         {"name": "Spritzschutz", "optionen": [
             {"k": "", "t": "ohne Spritzschutz", "teile": [], "std": True},
             {"k": "Fliesenspiegel", "t": "Wandfliesen 30 × 60 cm, ca. 1,5 m²", "teile": [["024.02.003.02001", 1.5]], "std": True},
             {"k": "Glasrückwand", "t": "Küchenrückwand ESG lackiert, ca. 1,5 m²", "teile": [["032.02.005.01001", 1.5]], "std": True}]},
         {"name": "Arbeitsplatte", "optionen": [
             {"k": "", "t": "Arbeitsplatte im Lieferumfang", "teile": [], "std": True},
             {"k": "Platte Quarz", "t": "Aufpreis Arbeitsplatte Quarzkomposit 2 cm, ca. 2,4 m (Differenz zu Schichtstoff)",
              "teile": [["014.05.003.01001", 2.4]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "381.03", "kg": "381", "name": "Küchenarbeitsplatte", "einheit": "m",
     "lang": "Küchen-Arbeitsplatte, Tiefe 60 cm, auf bauseitigen Unterschränken, mit Ausschnitten für Spüle, Kochfeld und Steckdosen "
             "anteilig, optional mit Rückwand.",
     "bezug": "Länge der Arbeitsplatte",
     "schichten": [
         {"name": "Arbeitsplatte", "optionen": [
             {"k": "Schichtstoff", "t": "Schichtstoff 38 mm", "teile": [["027.02.004.01001", 1.0]], "std": True},
             {"k": "Massivholz", "t": "Massivholz Buche/Eiche 40 mm", "teile": [["027.02.004.02001", 1.0]], "std": True},
             {"k": "Kompakt", "t": "Kompaktplatte 12 mm", "teile": [["027.02.004.03001", 1.0]]},
             {"k": "Quarz 2", "t": "Granit/Quarzkomposit 2 cm", "teile": [["014.05.003.01001", 1.0]], "std": True},
             {"k": "Quarz 3", "t": "Granit/Quarzkomposit 3 cm", "teile": [["014.05.003.02001", 1.0]], "std": True}]},
         {"name": "Ausschnitte", "optionen": [
             {"k": "", "t": "Ausschnitte aufliegend (Spüle/Kochfeld) und Steckdosen anteilig", "teile": [["027.02.005.01001", 0.6], ["027.02.005.03001", 0.5]], "std": True},
             {"k": "Unterbauspüle", "t": "Ausschnitt Unterbauspüle poliert, Kochfeld aufliegend, Steckdosen anteilig", "teile": [["027.02.005.02001", 0.3], ["027.02.005.01001", 0.3], ["027.02.005.03001", 0.5]], "std": True}]},
         {"name": "Rückwand", "optionen": [
             {"k": "", "t": "ohne Rückwand", "teile": [], "std": True},
             {"k": "Glasrückwand", "t": "Küchenrückwand ESG lackiert, 0,6 m² je m", "teile": [["032.02.005.01001", 0.6]], "std": True},
             {"k": "Fliesen", "t": "Wandfliesen 30 × 60 cm, 0,6 m² je m", "teile": [["024.02.003.02001", 0.6]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "381.04", "kg": "381", "name": "Badmöbel nach Maß", "einheit": "St",
     "lang": "Waschtischunterschrank nach Maß in Weißlack, mit Spiegel und optional offenem Wandregal.",
     "bezug": "Stück je Waschplatz",
     "schichten": [
         {"name": "Unterschrank", "optionen": [
             {"k": "B ≤ 80", "t": "Waschtischunterschrank Breite bis 80 cm", "teile": [["027.02.007.01001", 1.0]], "std": True},
             {"k": "B ≤ 120", "t": "Waschtischunterschrank Breite bis 120 cm", "teile": [["027.02.007.02001", 1.0]], "std": True}]},
         {"name": "Spiegel", "optionen": [
             {"k": "", "t": "ohne Spiegel", "teile": []},
             {"k": "Spiegel 0,6", "t": "Spiegel Kristallglas 6 mm, ca. 0,6 m²", "teile": [["032.02.004.01001", 0.6]], "std": True},
             {"k": "Spiegel 1,0", "t": "Spiegel Kristallglas 6 mm, ca. 1,0 m²", "teile": [["032.02.004.01001", 1.0]], "std": True}]},
         {"name": "Regal", "optionen": [
             {"k": "", "t": "ohne Regal", "teile": [], "std": True},
             {"k": "Regal", "t": "Wandboard/Regal nach Maß, ca. 0,3 m²", "teile": [["027.02.008.01001", 0.3]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "381.05", "kg": "381", "name": "Briefkastenanlage", "einheit": "St",
     "lang": "Briefkastenanlage aus Stahl beschichtet mit Klingel- und Sprechanlagenmodul (Audio), Wandmontage oder freistehend "
             "auf Fundamentsockel, optional mit Vordach.",
     "bezug": "Stück je Anlage",
     "schichten": [
         {"name": "Anlage", "optionen": [
             {"k": "4 Fächer", "t": "Briefkastenanlage 4 Fächer, Audio", "teile": [["031.04.002.01001", 1.0]], "std": True},
             {"k": "8 Fächer", "t": "Briefkastenanlage 8 Fächer, Audio", "teile": [["031.04.002.02001", 1.0]], "std": True},
             {"k": "16 Fächer", "t": "Briefkastenanlage 16 Fächer, Audio", "teile": [["031.04.002.03001", 1.0]], "std": True}]},
         {"name": "Montage", "optionen": [
             {"k": "", "t": "Wandmontage", "teile": [], "std": True},
             {"k": "freistehend", "t": "freistehend auf Ständer (Kleinstahl ca. 15 kg) und Fundamentsockel", "teile": [["031.04.003.01001", 15.0], ["013.09.010.01001", 1.0]], "std": True}]},
         {"name": "Überdachung", "optionen": [
             {"k": "", "t": "ohne Überdachung", "teile": [], "std": True},
             {"k": "Vordach", "t": "Vordach Edelstahl-Glas, Ausladung 1,0 m", "teile": [["031.04.001.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "381.06", "kg": "381", "name": "Treppengeländer / Handlauf", "einheit": "m",
     "lang": "Geländer an Treppen und Galerien als Stahl-, Edelstahl- oder Glasgeländer, optional mit Wandhandlauf auf der "
             "Gegenseite und Duplexbeschichtung.",
     "bezug": "Länge des Geländers in der Neigung gemessen",
     "schichten": [
         {"name": "Geländer", "optionen": [
             {"k": "Stahl Stäbe", "t": "Geländer Stahl verzinkt mit Stäben, Handlauf Stahlrohr Ø 42", "teile": [["031.02.001.01001", 1.0]], "std": True},
             {"k": "VA-Handlauf", "t": "Geländer mit Stäben, Handlauf Edelstahl Ø 42", "teile": [["031.02.001.02001", 1.0]], "std": True},
             {"k": "Relinge VA", "t": "Geländer Edelstahl mit horizontalen Relingen", "teile": [["031.02.002.01001", 1.0]], "std": True},
             {"k": "VSG Klemmen", "t": "Geländer mit VSG-Füllung 2 × 8 mm in Glasklemmen", "teile": [["031.02.002.02001", 1.0]], "std": True},
             {"k": "Ganzglas", "t": "Ganzglasgeländer VSG aus TVG, Bodenprofil seitlich", "teile": [["032.03.003.02001", 1.0]]}]},
         {"name": "Wandhandlauf", "optionen": [
             {"k": "", "t": "ohne Wandhandlauf", "teile": [], "std": True},
             {"k": "+Handlauf VA", "t": "Wandhandlauf Edelstahl Ø 42 auf Gegenseite", "teile": [["031.02.005.01001", 1.0]], "std": True},
             {"k": "+Handlauf Holz", "t": "Wandhandlauf Holz Buche/Eiche auf Stahlhaltern", "teile": [["031.02.005.03001", 1.0]], "std": True}]},
         {"name": "Oberfläche", "optionen": [
             {"k": "", "t": "Standardoberfläche (verzinkt bzw. Edelstahl)", "teile": [], "std": True},
             {"k": "Duplex", "t": "Duplexbeschichtung auf Verzinkung, ca. 0,5 m² je m", "teile": [["017.02.003.01001", 0.5]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "381.07", "kg": "381", "name": "Bodentreppe", "einheit": "St",
     "lang": "Gedämmte Bodentreppe zum Dachboden, einschließlich Herstellung der Deckenöffnung und luftdichtem Anschluss.",
     "bezug": "Stück je Bodentreppe",
     "schichten": [
         {"name": "Treppe", "optionen": [
             {"k": "Holzleiter", "t": "Bodentreppe gedämmt, Holzleiter 3-teilig", "teile": [["027.03.009.01001", 1.0]], "std": True},
             {"k": "Scherentreppe", "t": "Bodentreppe gedämmt, Scherentreppe Stahl", "teile": [["027.03.009.02001", 1.0]], "std": True},
             {"k": "EI 30", "t": "Bodentreppe gedämmt, Holzleiter, Feuerwiderstand EI 30", "teile": [["027.03.009.03001", 1.0]], "std": True}]},
         {"name": "Öffnung", "optionen": [
             {"k": "", "t": "Öffnung vorhanden", "teile": []},
             {"k": "Holzwechsel", "t": "Wechsel in Holzbalkenlage, Öffnung bis 1,5 m", "teile": [["016.01.007.02001", 1.0]], "std": True},
             {"k": "StB gesägt", "t": "Öffnung in Stahlbetondecke sägen, ca. 4,4 m Schnittlänge", "teile": [["013.08.004.01001", 4.4]], "std": True}]},
         {"name": "Anschluss", "optionen": [
             {"k": "", "t": "ohne luftdichten Anschluss", "teile": []},
             {"k": "luftdicht", "t": "luftdichter Anschluss umlaufend, ca. 4,4 m", "teile": [["039.05.004.01001", 4.4]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "381.08", "kg": "381", "name": "Garderobe / Sitzbank", "einheit": "m",
     "lang": "Eingebaute Garderobe, Sitzbank oder Heizkörperverkleidung als Möbeleinbau nach Maß.",
     "bezug": "Länge des Einbaus",
     "schichten": [
         {"name": "Einbau", "optionen": [
             {"k": "Garderobe", "t": "Garderobe/Wandpaneel mit Haken und Ablage, Weißlack", "teile": [["027.02.002.01001", 1.0]], "std": True},
             {"k": "Sitzbank", "t": "Sitzbank/Fensterbank als Möbel, Massivholz Buche", "teile": [["027.02.009.01001", 1.0]], "std": True},
             {"k": "HK-Verkleidung", "t": "Heizkörperverkleidung Holz/MDF mit Lochblech", "teile": [["027.02.011.01001", 1.0]], "std": True}]},
         {"name": "Ergänzung", "optionen": [
             {"k": "", "t": "ohne Ergänzung", "teile": [], "std": True},
             {"k": "+Regal", "t": "Wandboard/Regal darüber, 0,4 m² je m", "teile": [["027.02.008.01001", 0.4]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    # =========================================================================================== 382 Besondere Einbauten
    {"id": "382.01", "kg": "382", "name": "Empfangstheke", "einheit": "m",
     "lang": "Thekenanlage bzw. Empfangstheke aus Holzwerkstoff mit HPL, optional mit Frontbekleidung und Glasaufsatz.",
     "bezug": "Länge der Theke",
     "schichten": [
         {"name": "Theke", "optionen": [
             {"k": "", "t": "Thekenanlage Holzwerkstoff mit HPL", "teile": [["027.02.003.01001", 1.0]], "std": True}]},
         {"name": "Front", "optionen": [
             {"k": "", "t": "Front HPL", "teile": [], "std": True},
             {"k": "Front Furnier", "t": "Frontbekleidung Furnier Eiche, 1,1 m² je m", "teile": [["027.03.002.01001", 1.1]], "std": True},
             {"k": "Front Akustik", "t": "Frontbekleidung Akustikpaneel, 1,1 m² je m", "teile": [["027.03.002.02001", 1.1]], "std": True}]},
         {"name": "Aufsatz", "optionen": [
             {"k": "", "t": "ohne Aufsatz", "teile": [], "std": True},
             {"k": "Glasaufsatz", "t": "Glasaufsatz ESG 8 mm, 0,3 m² je m", "teile": [["032.01.002.02001", 0.3]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "382.02", "kg": "382", "name": "Kellertrennwand-Anlage", "einheit": "m²",
     "lang": "Mieterkeller-Abtrennung aus Stahlgitter-Systemwänden mit Türen, optional mit Rammschutz.",
     "bezug": "Wandfläche der Abtrennungen",
     "schichten": [
         {"name": "Trennwand", "optionen": [
             {"k": "H 2,00", "t": "Kellertrennwand Stahlgitter, Höhe 2,00 m", "teile": [["031.01.014.01001", 1.0]], "std": True},
             {"k": "raumhoch", "t": "Kellertrennwand Stahlgitter, raumhoch", "teile": [["031.01.014.02001", 1.0]], "std": True}]},
         {"name": "Schutz", "optionen": [
             {"k": "", "t": "ohne Rammschutz", "teile": [], "std": True},
             {"k": "Eckschutz", "t": "Eckschutz Stahlrohr anteilig", "teile": [["031.04.008.02001", 0.05]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "382.03", "kg": "382", "name": "Umkleide-Spindanlage", "einheit": "St",
     "lang": "Spind bzw. Garderobenschrank aus Stahl-Holz, 2-türig, für Umkleiden, optional mit Sitzbank.",
     "bezug": "Stück je Spind",
     "schichten": [
         {"name": "Spind", "optionen": [
             {"k": "", "t": "Spind Stahl-Holz 2-türig", "teile": [["027.02.010.01001", 1.0]], "std": True}]},
         {"name": "Sitzbank", "optionen": [
             {"k": "", "t": "ohne Sitzbank", "teile": [], "std": True},
             {"k": "+Sitzbank", "t": "Sitzbank Massivholz anteilig 0,6 m je Spind", "teile": [["027.02.009.01001", 0.6]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},
]
