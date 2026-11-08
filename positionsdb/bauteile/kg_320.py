# Bauteilvorlagen KG 320 Gründung, Unterbau (321 Baugrundverbesserung, 322 Flachgründungen und Bodenplatten, 323 Tiefgründungen,
# 324 Gründungsbeläge, 325 Abdichtungen und Bekleidungen, 326 Dränagen) – eigene Aufbauten aus der Positionsdatenbank.
# Faktor = Menge der Position je Einheit des Bauteils.
# Annahmen: Bewehrung Bodenplatten 75 kg/m³ (je m² = Dicke × 0,075 t), Fundamente 40–60 kg/m³;
# Gebäude ca. 10 × 12 m: Umfang/Fläche ≈ 0,37 m je m², Streifenfundamente ≈ 0,08 m³ je m² Grundfläche;
# Randdämmstreifen/Sockelleisten ≈ 0,6–0,8 m je m² Raumfläche; Bodenaushub 1,8 t/m³.

BEW = "013.06.001.03001"   # Betonstahl gemischt
MAT = "013.06.002.01001"   # Betonstahlmatten

RAND = ["025.01.006.01001", 0.8]   # Randdämmstreifen je m² Estrich

BELAG_WOHNEN = [
    {"k": "Fliesen 30×60", "t": "Feinsteinzeug 30 × 60 cm im Dünnbett, Fliesensockel", "teile": [["024.03.001.02001", 1.0], ["024.03.003.01001", 0.6]], "std": True},
    {"k": "Fliesen 60×60", "t": "Feinsteinzeug 60 × 60 cm im Dünnbett, Fliesensockel", "teile": [["024.03.001.04001", 1.0], ["024.03.003.01001", 0.6]]},
    {"k": "Parkett verklebt", "t": "Fertigparkett Eiche vollflächig verklebt, Sockelleiste MDF", "teile": [["028.02.003.02001", 1.0], ["028.03.003.02001", 0.6]], "std": True},
    {"k": "Vinyl LVT", "t": "Designbelag Vinyl verklebt auf Spachtelung, Sockelleiste", "teile": [["036.01.001.03001", 1.0], ["036.02.003.01001", 1.0], ["036.04.003.03001", 0.6]], "std": True},
    {"k": "Laminat NK 32", "t": "Laminat schwimmend auf Unterlage, Sockelleiste", "teile": [["036.04.001.01001", 1.0], ["036.04.003.03001", 0.6]]},
    {"k": "Sichtestrich", "t": "Estrichoberfläche geschliffen und versiegelt (Zulage)", "teile": [["034.04.007.01001", 1.0], ["025.04.007.01001", 1.0]]},
]

BELAG_OBJEKT = [
    {"k": "Linoleum 2,5", "t": "Linoleum 2,5 mm auf Spachtelung, Sockelleiste", "teile": [["036.01.001.03001", 1.0], ["036.02.001.01001", 1.0], ["036.04.003.01001", 0.4]], "std": True},
    {"k": "Kautschuk 2,0", "t": "Kautschukbelag 2,0 mm auf Spachtelung, Sockelleiste", "teile": [["036.01.001.03001", 1.0], ["036.02.004.01001", 1.0], ["036.04.003.01001", 0.4]], "std": True},
    {"k": "PVC homogen", "t": "PVC-Belag homogen 2,0 mm verschweißt, Hohlkehlsockel", "teile": [["036.01.001.03001", 1.0], ["036.02.002.01001", 1.0], ["036.02.006.01001", 0.4]]},
    {"k": "Teppichfliesen", "t": "Teppichfliesen Objekt Klasse 33, Sockelleiste", "teile": [["036.01.001.03001", 1.0], ["036.03.004.01001", 1.0], ["036.04.003.01001", 0.4]], "std": True},
    {"k": "Fliesen 60×60", "t": "Feinsteinzeug 60 × 60 cm im Dünnbett, Fliesensockel", "teile": [["024.03.001.04001", 1.0], ["024.03.003.01001", 0.4]]},
    {"k": "Industriefliesen", "t": "Spaltplatten 15 × 15 cm im Rüttelverfahren, Hohlkehlsockel", "teile": [["024.03.009.01001", 1.0], ["024.03.010.01001", 0.4]]},
]

VORLAGEN = [
    # ---------------------------------------------------------------- 321 Baugrundverbesserung
    {"id": "321.01", "kg": "321", "name": "Bodenaustausch unter Gründung", "einheit": "m³",
     "lang": "Nicht tragfähigen Boden unter der Gründung ausheben und abfahren (Z0), durch verdichtetes Mineralgemisch bzw. Schotter ersetzen, "
             "mit Trennvlies und Verdichtungsnachweis.",
     "bezug": "Austauschvolumen im eingebauten Zustand",
     "schichten": [
         {"name": "Austausch", "optionen": [
             {"k": "Mineral 0/32", "t": "Bodenaustausch mit Mineralgemisch 0/32", "teile": [["002.03.004.01001", 1.0]], "std": True},
             {"k": "Schotter 0/45", "t": "Bodenaustausch mit Schotter 0/45", "teile": [["002.03.004.02001", 1.0]], "std": True}]},
         {"name": "Trennlage", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Vlies GRK 3", "t": "Geotextil GRK 3 an Sohle, d = 0,5 m (2 m² je m³)", "teile": [["002.03.006.01001", 2.0]], "std": True},
             {"k": "Vlies GRK 4", "t": "Geotextil GRK 4 an Sohle, d = 0,5 m (2 m² je m³)", "teile": [["002.03.006.02001", 2.0]]}]},
         {"name": "Boden", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Zulage Fels 20 %", "t": "Zulage für 20 % schwer lösbaren Boden", "teile": [["002.02.003.01001", 0.2]], "std": True}]},
         {"name": "Prüfung", "optionen": [
             {"k": "LFG", "t": "Lastplattendruckversuch dynamisch, 1 je 25 m³", "teile": [["002.04.011.01001", 0.04]], "std": True},
             {"k": "PDV", "t": "Plattendruckversuch statisch, 1 je 100 m³", "teile": [["002.03.007.01001", 0.01]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "321.02", "kg": "321", "name": "Bodenverbesserung Bindemittel", "einheit": "m²",
     "lang": "Bindige Böden durch Einfräsen von Kalk bzw. Zement verbessern bzw. verfestigen (Frästiefe bis 30 cm), Planum herstellen, Tragfähigkeit nachweisen.",
     "bezug": "Behandelte Fläche",
     "schichten": [
         {"name": "Bindemittel", "optionen": [
             {"k": "15 kg/m²", "t": "Dosierung 15 kg/m²", "teile": [["002.04.006.01001", 1.0]], "std": True},
             {"k": "25 kg/m²", "t": "Dosierung 25 kg/m²", "teile": [["002.04.006.02001", 1.0]], "std": True},
             {"k": "40 kg/m²", "t": "Dosierung 40 kg/m²", "teile": [["002.04.006.03001", 1.0]], "std": True}]},
         {"name": "Planum", "optionen": [
             {"k": "Planum ±3", "t": "Planum ±3 cm", "teile": [["002.03.001.01001", 1.0]], "std": True},
             {"k": "Planum ±2", "t": "Planum ±2 cm", "teile": [["002.03.001.02001", 1.0]], "std": True}]},
         {"name": "Prüfung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "PDV /500 m²", "t": "Plattendruckversuch 1 je 500 m²", "teile": [["002.03.007.01001", 0.002]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "321.03", "kg": "321", "name": "Tragschicht unter Bodenplatte", "einheit": "m²",
     "lang": "Lastverteilende Trag- bzw. Frostschutzschicht unter Bodenplatten aus verdichtetem Mineralgemisch auf Planum, mit Trennvlies und Nachweis.",
     "bezug": "Fläche der Tragschicht",
     "fest": [["002.03.001.01001", 1.0]],
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             {"k": "d = 20 cm", "t": "Tragschicht d = 20 cm, DPr 97 %", "teile": [["002.03.005.01001", 1.0]], "std": True},
             {"k": "d = 30 cm", "t": "Tragschicht d = 30 cm, DPr 97 %", "teile": [["002.03.005.02001", 1.0]], "std": True},
             {"k": "d = 50 cm", "t": "Tragschicht d = 50 cm, DPr 97 %", "teile": [["002.03.005.03001", 1.0]], "std": True}]},
         {"name": "Trennlage", "optionen": [
             {"k": "", "t": "", "teile": []},
             {"k": "Vlies GRK 3", "t": "Geotextil GRK 3", "teile": [["002.03.006.01001", 1.0]], "std": True},
             {"k": "Vlies GRK 4", "t": "Geotextil GRK 4", "teile": [["002.03.006.02001", 1.0]], "std": True}]},
         {"name": "Prüfung", "optionen": [
             {"k": "", "t": "", "teile": []},
             {"k": "PDV /300 m²", "t": "Plattendruckversuch 1 je 300 m²", "teile": [["002.03.007.01001", 0.0033]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "321.04", "kg": "321", "name": "Düsenstrahlverfahren (HDI)", "einheit": "m³",
     "lang": "Baugrundverbesserung bzw. Abdichtung im Düsenstrahlverfahren (HDI) als Unterfangung, Dichtsohle oder Lückenschluss, mit anteiliger Geräte-BE.",
     "bezug": "Hergestelltes Injektionskörpervolumen",
     "schichten": [
         {"name": "Verfahren", "optionen": [
             {"k": "Unterfangung", "t": "HDI-Unterfangung", "teile": [["006.03.010.01001", 1.0]], "std": True},
             {"k": "Dichtsohle", "t": "HDI-Baugrubensohle/Dichtsohle", "teile": [["006.03.010.02001", 1.0]], "std": True},
             {"k": "Lückenschluss", "t": "HDI-Lückenschluss/Abdichtung", "teile": [["006.03.010.03001", 1.0]], "std": True}]},
         {"name": "Baustelleneinrichtung", "optionen": [
             {"k": "BE /50 m³", "t": "Bohrgerät An-/Abtransport anteilig bei 50 m³", "teile": [["006.04.006.02001", 0.02]], "std": True},
             {"k": "BE /200 m³", "t": "Bohrgerät An-/Abtransport anteilig bei 200 m³", "teile": [["006.04.006.02001", 0.005]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    # ---------------------------------------------------------------- 322 Flachgründungen und Bodenplatten
    {"id": "322.01", "kg": "322", "name": "Streifenfundament je m³", "einheit": "m³",
     "lang": "Streifenfundament aus unbewehrtem Beton in Erdschalung oder aus Stahlbeton, wahlweise geschalt, mit Fundamentaushub und Sauberkeitsschicht.",
     "bezug": "Betonvolumen des Fundaments (Querschnitt × Länge); Aushub 1,1 m³ je m³, Sauberkeitsschicht 1,25 m² je m³ (h ≈ 0,8 m)",
     "schichten": [
         {"name": "Fundament", "optionen": [
             {"k": "unbew. C16/20", "t": "unbewehrter Beton C16/20 in Erdschalung", "teile": [["013.02.001.01001", 1.0]], "std": True},
             {"k": "unbew. C20/25", "t": "unbewehrter Beton C20/25 in Erdschalung", "teile": [["013.02.001.02001", 1.0]]},
             {"k": "StB C25/30", "t": "Stahlbeton C25/30, Bewehrung 40 kg/m³", "teile": [["013.02.002.03001", 1.0], [BEW, 0.04]], "std": True},
             {"k": "StB C30/37", "t": "Stahlbeton C30/37, Bewehrung 50 kg/m³", "teile": [["013.02.002.05001", 1.0], [BEW, 0.05]]}]},
         {"name": "Schalung", "optionen": [
             {"k": "", "t": "Erdschalung (Graben)", "teile": [], "std": True},
             {"k": "geschalt", "t": "seitliche Schalung, 2,5 m² je m³", "teile": [["013.05.001.01001", 2.5]], "std": True}]},
         {"name": "Aushub", "optionen": [
             {"k": "Aushub lagern", "t": "Fundamentgraben ausheben, Boden seitlich lagern", "teile": [["002.02.004.01001", 1.1]], "std": True},
             {"k": "Aushub Z0 ab", "t": "Fundamentgraben ausheben, Boden Z0 abfahren", "teile": [["002.02.004.01001", 1.1], ["002.02.007.01001", 2.0]], "std": True},
             {"k": "ohne Aushub", "t": "Aushub in Baugrube enthalten", "teile": [], "std": True}]},
         {"name": "Unterlage", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "SKS 5 cm", "t": "Sauberkeitsschicht C12/15, 5 cm", "teile": [["013.01.001.01001", 1.25]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "322.02", "kg": "322", "name": "Einzelfundament je m³", "einheit": "m³",
     "lang": "Einzelfundament aus Stahlbeton unter Stützen, mit Schalung, Bewehrung, Aushub als Einzelgrube und Sauberkeitsschicht.",
     "bezug": "Betonvolumen des Fundaments; Aushub 1,2 m³ je m³, Sauberkeitsschicht 1,0 m² je m³",
     "schichten": [
         {"name": "Fundament", "optionen": [
             {"k": "StB C20/25", "t": "Stahlbeton C20/25, Bewehrung 40 kg/m³", "teile": [["013.02.002.02001", 1.0], [BEW, 0.04]], "std": True},
             {"k": "StB C25/30", "t": "Stahlbeton C25/30, Bewehrung 50 kg/m³", "teile": [["013.02.002.04001", 1.0], [BEW, 0.05]], "std": True},
             {"k": "StB C30/37", "t": "Stahlbeton C30/37, Bewehrung 60 kg/m³", "teile": [["013.02.002.06001", 1.0], [BEW, 0.06]]},
             {"k": "unbew. C16/20", "t": "unbewehrter Beton C16/20 in Erdschalung", "teile": [["013.02.001.01001", 1.0]]}]},
         {"name": "Schalung", "optionen": [
             {"k": "", "t": "Erdschalung", "teile": [], "std": True},
             {"k": "geschalt", "t": "Fundamentschalung, 3,0 m² je m³", "teile": [["013.05.001.01001", 3.0]], "std": True}]},
         {"name": "Aushub", "optionen": [
             {"k": "Grube lagern", "t": "Einzelgrube ausheben (Zulage ≤1 m³), Boden lagern", "teile": [["002.02.004.02001", 1.2], ["002.04.009.02001", 1.2]], "std": True},
             {"k": "Grube Z0 ab", "t": "Einzelgrube ausheben, Boden Z0 abfahren", "teile": [["002.02.004.02001", 1.2], ["002.04.009.02001", 1.2], ["002.02.007.01001", 2.2]], "std": True},
             {"k": "ohne Aushub", "t": "Aushub in Baugrube enthalten", "teile": [], "std": True}]},
         {"name": "Unterlage", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "SKS 5 cm", "t": "Sauberkeitsschicht C12/15, 5 cm", "teile": [["013.01.001.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "322.03", "kg": "322", "name": "Frostschürze", "einheit": "m",
     "lang": "Umlaufende Frostschürze aus Beton unter dem Bodenplattenrand, Tiefe 80 cm, mit Aushub und Abfuhr; optional mit Perimeterdämmung außen.",
     "bezug": "Länge der Frostschürze (Gebäudeumfang)",
     "schichten": [
         {"name": "Frostschürze", "optionen": [
             {"k": "B 25 cm", "t": "Breite 25 cm, Tiefe 80 cm", "teile": [["013.02.003.01001", 1.0]], "std": True},
             {"k": "B 40 cm", "t": "Breite 40 cm, Tiefe 80 cm", "teile": [["013.02.003.02001", 1.0]], "std": True}]},
         {"name": "Dämmung außen", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "XPS 80", "t": "Perimeterdämmung XPS 80 mm, 0,8 m² je m", "teile": [["018.02.008.01001", 0.8]], "std": True},
             {"k": "XPS 120", "t": "Perimeterdämmung XPS 120 mm, 0,8 m² je m", "teile": [["018.02.008.02001", 0.8]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "322.04", "kg": "322", "name": "Bodenplatte EG ohne Keller", "einheit": "m²",
     "lang": "Gründung eines nicht unterkellerten Gebäudes je m² Grundfläche: kapillarbrechende Schicht, Sauberkeitsschicht bzw. Trennlage, "
             "lastabtragende Dämmung, Stahlbeton-Bodenplatte komplett (Schalung, Bewehrung, Beton) und Randgründung anteilig.",
     "bezug": "Grundfläche der Bodenplatte (Außenmaß); Randgründung bezogen auf Gebäude ca. 10 × 12 m",
     "schichten": [
         {"name": "Unterbau", "optionen": [
             {"k": "Kies 15", "t": "kapillarbrechende Schicht Kies 16/32, 15 cm", "teile": [["002.04.005.01001", 1.0]], "std": True},
             {"k": "Kies 20", "t": "kapillarbrechende Schicht Kies 16/32, 20 cm", "teile": [["002.04.005.02001", 1.0]], "std": True},
             {"k": "Tragschicht 30", "t": "Frostschutz-/Tragschicht 30 cm", "teile": [["002.03.005.02001", 1.0]]}]},
         {"name": "Dämmung unter Platte", "optionen": [
             {"k": "SKS + XPS 10", "t": "Sauberkeitsschicht 5 cm, XPS 10 cm lastabtragend", "teile": [["013.01.001.01001", 1.0], ["013.01.003.01001", 1.0]], "std": True},
             {"k": "SKS + XPS 14", "t": "Sauberkeitsschicht 5 cm, XPS 14 cm lastabtragend", "teile": [["013.01.001.01001", 1.0], ["013.01.003.02001", 1.0]], "std": True},
             {"k": "SKS + XPS 20", "t": "Sauberkeitsschicht 5 cm, XPS 20 cm lastabtragend", "teile": [["013.01.001.01001", 1.0], ["013.01.003.03001", 1.0]]},
             {"k": "Schaumglas 30", "t": "Schaumglasschotter 30 cm verdichtet, Trennvlies", "teile": [["013.01.004.02001", 1.0], ["002.03.006.01001", 1.0]]},
             {"k": "PE-Folie", "t": "ohne Dämmung unter Platte, PE-Folie zweilagig", "teile": [["013.01.002.01001", 1.0]], "std": True}]},
         {"name": "Bodenplatte", "optionen": [
             {"k": "BP 16 cm", "t": "Stahlbeton C25/30, d = 16 cm, komplett", "teile": [["013.09.001.01001", 1.0]]},
             {"k": "BP 20 cm", "t": "Stahlbeton C25/30, d = 20 cm, komplett", "teile": [["013.09.001.02001", 1.0]], "std": True},
             {"k": "BP 25 cm", "t": "Stahlbeton C30/37, d = 25 cm, komplett", "teile": [["013.09.001.03001", 1.0]], "std": True},
             {"k": "Faserbeton 20", "t": "Stahlfaserbeton d = 20 cm, komplett", "teile": [["013.09.011.02001", 1.0]], "std": True}]},
         {"name": "Randgründung", "optionen": [
             {"k": "Frostschürze", "t": "Frostschürze 25 × 80 cm, 0,37 m je m²", "teile": [["013.02.003.01001", 0.37]], "std": True},
             {"k": "Streifenfund.", "t": "Streifenfundamente StB anteilig 0,08 m³ je m² mit Aushub", "teile": [["013.02.002.03001", 0.08], [BEW, 0.0032], ["002.02.004.01001", 0.09]], "std": True},
             {"k": "", "t": "Randgründung gesondert", "teile": []}]},
     ], "tags": ["neubau"]},

    {"id": "322.05", "kg": "322", "name": "Bodenplatte Keller WU", "einheit": "m²",
     "lang": "Wasserundurchlässige Bodenplatte unter Kellergeschossen (Weiße Wanne): Sauberkeitsschicht, Dämmung nach Wahl, WU-Stahlbetonplatte "
             "und Fugenabdichtung der Arbeitsfugen anteilig.",
     "bezug": "Grundfläche der Bodenplatte; Arbeitsfugen ≈ 0,4 m je m²",
     "schichten": [
         {"name": "Unterlage", "optionen": [
             {"k": "SKS 5", "t": "Sauberkeitsschicht C12/15, 5 cm", "teile": [["013.01.001.01001", 1.0]], "std": True},
             {"k": "SKS 8", "t": "Sauberkeitsschicht C12/15, 8 cm", "teile": [["013.01.001.02001", 1.0]]},
             {"k": "SKS 5 + Folie", "t": "Sauberkeitsschicht 5 cm, PE-Folie zweilagig", "teile": [["013.01.001.01001", 1.0], ["013.01.002.01001", 1.0]]}]},
         {"name": "Dämmung unter Platte", "optionen": [
             {"k": "", "t": "ohne Dämmung (unbeheizter Keller)", "teile": [], "std": True},
             {"k": "XPS 10", "t": "XPS 10 cm lastabtragend", "teile": [["013.01.003.01001", 1.0]], "std": True},
             {"k": "XPS 16 2-lagig", "t": "XPS 300 kPa 16 cm zweilagig versetzt", "teile": [["018.02.009.01001", 1.0]], "std": True},
             {"k": "Schaumglas 30", "t": "Schaumglasschotter lose 30 cm, 1,3-fach verdichtet", "teile": [["018.02.009.02001", 0.3]]}]},
         {"name": "WU-Platte", "optionen": [
             {"k": "WU 30 cm", "t": "WU-Bodenplatte C30/37, d = 30 cm, komplett", "teile": [["013.09.001.04001", 1.0]], "std": True},
             {"k": "WU 40 cm", "t": "WU-Bodenplatte C30/37, d = 40 cm, komplett", "teile": [["013.09.001.05001", 1.0]], "std": True},
             {"k": "WU 35 Einzelpos.", "t": "WU-Beton C30/37 35 cm, Bewehrung 85 kg/m³, Randschalung",
              "teile": [["013.02.005.02001", 0.35], [MAT, 0.018], [BEW, 0.012], ["013.05.001.01001", 0.12]], "std": True}]},
         {"name": "Fugen", "optionen": [
             {"k": "Fugenblech", "t": "Arbeitsfugen beschichtetes Fugenblech, 0,4 m je m²", "teile": [["013.07.001.02001", 0.4]], "std": True},
             {"k": "Injektionsschl.", "t": "Arbeitsfugen Injektionsschlauch verpresst, 0,4 m je m²", "teile": [["013.07.001.04001", 0.4]]},
             {"k": "FBV + Fugenblech", "t": "Frischbetonverbundbahn unter Platte, Fugenblech 0,4 m je m²", "teile": [["018.02.004.01001", 1.0], ["013.07.001.02001", 0.4]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "322.06", "kg": "322", "name": "Bodenplatte Stahlbeton, Einzelpos.", "einheit": "m²",
     "lang": "Stahlbeton-Bodenplatte aus Einzelpositionen: Beton nach Dicke, Bewehrung 75 kg/m³ (Matten und Stabstahl), Randschalung anteilig, "
             "Unterlage und Oberflächenbearbeitung nach Wahl.",
     "bezug": "Grundfläche der Bodenplatte; Randschalung 0,08 m² je m²",
     "fest": [["013.05.001.01001", 0.08]],
     "schichten": [
         {"name": "Unterlage", "optionen": [
             {"k": "PE-Folie", "t": "Trennlage PE-Folie zweilagig", "teile": [["013.01.002.01001", 1.0]], "std": True},
             {"k": "SKS 5", "t": "Sauberkeitsschicht C12/15, 5 cm", "teile": [["013.01.001.01001", 1.0]], "std": True},
             {"k": "SKS 5 + XPS 10", "t": "Sauberkeitsschicht 5 cm, XPS 10 cm", "teile": [["013.01.001.01001", 1.0], ["013.01.003.01001", 1.0]]}]},
         {"name": "Platte", "optionen": [
             {"k": "20 cm C25/30", "t": "C25/30, d = 20 cm, Bewehrung 15 kg/m²", "teile": [["013.02.004.06001", 0.2], [MAT, 0.009], [BEW, 0.006]], "std": True},
             {"k": "25 cm C25/30", "t": "C25/30, d = 25 cm, Bewehrung 19 kg/m²", "teile": [["013.02.004.07001", 0.25], [MAT, 0.011], [BEW, 0.008]], "std": True},
             {"k": "30 cm C30/37", "t": "C30/37, d = 30 cm, Bewehrung 23 kg/m²", "teile": [["013.02.004.11001", 0.3], [MAT, 0.013], [BEW, 0.010]], "std": True},
             {"k": "40 cm C30/37", "t": "C30/37, d = 40 cm, Bewehrung 30 kg/m²", "teile": [["013.02.004.12001", 0.4], [MAT, 0.016], [BEW, 0.014]]},
             {"k": "18 cm C20/25", "t": "C20/25, d = 18 cm, Bewehrung 12 kg/m²", "teile": [["013.02.004.01001", 0.18], [MAT, 0.012]]}]},
         {"name": "Oberfläche", "optionen": [
             {"k": "", "t": "abgezogen und abgerieben", "teile": [], "std": True},
             {"k": "flügelgeglättet", "t": "flügelgeglättet", "teile": [["013.02.006.01001", 1.0]], "std": True},
             {"k": "geglättet + HS", "t": "flügelgeglättet mit Hartstoffeinstreuung", "teile": [["013.02.006.01001", 1.0], ["013.02.007.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "322.07", "kg": "322", "name": "Bodenplatte Halle/Industrie", "einheit": "m²",
     "lang": "Befahrbare Hallenbodenplatte auf Trag-/Frostschutzschicht mit Trennlage, Stahlfaser- oder Stahlbetonplatte, Oberfläche und Fugenausbildung.",
     "bezug": "Hallengrundfläche; Scheinfugen im Raster ca. 6 × 6 m (0,33 m je m²)",
     "fest": [["013.01.002.01001", 1.0]],
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             {"k": "TS 30", "t": "Frostschutz-/Tragschicht 30 cm", "teile": [["002.03.005.02001", 1.0]], "std": True},
             {"k": "TS 50", "t": "Frostschutz-/Tragschicht 50 cm", "teile": [["002.03.005.03001", 1.0]], "std": True}]},
         {"name": "Platte", "optionen": [
             {"k": "SFB 20", "t": "Stahlfaserbeton d = 20 cm, geglättet, Fugen geschnitten", "teile": [["013.09.011.02001", 1.0]], "std": True},
             {"k": "SFB 25", "t": "Stahlfaserbeton d = 25 cm, geglättet, Fugen geschnitten", "teile": [["013.09.011.03001", 1.0]], "std": True},
             {"k": "StB 25 + Glätte", "t": "Stahlbeton C30/37 25 cm komplett, flügelgeglättet, Scheinfugen", "teile": [["013.09.001.03001", 1.0], ["013.02.006.01001", 1.0], ["025.04.002.01001", 0.33]], "std": True}]},
         {"name": "Oberfläche", "optionen": [
             {"k": "Hartstoff", "t": "Hartstoffeinstreuung frisch in frisch", "teile": [["013.02.007.01001", 1.0]], "std": True},
             {"k": "EP-Versiegelung", "t": "2K-Epoxid-Versiegelung", "teile": [["034.04.007.01001", 1.0]], "std": True},
             {"k": "PU-Verlauf 2 mm", "t": "PU-Verlaufsbeschichtung 2 mm", "teile": [["034.04.007.03001", 1.0]]},
             {"k": "", "t": "ohne Zusatzbehandlung", "teile": []}]},
     ], "tags": ["neubau"]},

    {"id": "322.08", "kg": "322", "name": "Kellerboden Bestand erneuern", "einheit": "m²",
     "lang": "Alten Kellerboden abbrechen und entsorgen, neue bewehrte Betonplatte auf kapillarbrechender Schicht im Bestandskeller herstellen, "
             "optional mit Flächenabdichtung.",
     "bezug": "Kellerbodenfläche (lichte Raummaße)",
     "schichten": [
         {"name": "Rückbau", "optionen": [
             {"k": "", "t": "ohne Abbruch (Altboden verbleibt bzw. Lehmboden)", "teile": [], "std": True},
             {"k": "Abbruch 10 cm", "t": "Betonboden bis 10 cm abbrechen, Beton entsorgen", "teile": [["084.02.003.01001", 1.0], ["087.04.001.01001", 0.25]], "std": True},
             {"k": "Abbruch 20 cm", "t": "Betonboden bis 20 cm abbrechen, Beton entsorgen", "teile": [["084.02.003.02001", 1.0], ["087.04.001.01001", 0.5]], "std": True}]},
         {"name": "Neue Platte", "optionen": [
             {"k": "Platte 10 cm", "t": "Betonplatte d = 10 cm mit Matte auf Kies und PE-Folie", "teile": [["013.10.007.01001", 1.0]], "std": True},
             {"k": "Platte 12 cm", "t": "Betonplatte d = 12 cm mit Matte auf Kies und PE-Folie", "teile": [["013.10.007.02001", 1.0]], "std": True},
             {"k": "Platte 15 cm", "t": "Betonplatte d = 15 cm mit Matte auf Kies und PE-Folie", "teile": [["013.10.007.03001", 1.0]]}]},
         {"name": "Abdichtung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Bitumenbahn", "t": "Bitumenbahn 1-lagig auf Platte, an Wänden hochgeführt", "teile": [["018.05.001.01001", 1.0]], "std": True},
             {"k": "EP-Feuchtesperre", "t": "Epoxid-Feuchtesperre auf Platte", "teile": [["036.01.001.06001", 1.0]]}]},
     ], "tags": ["altbau"]},

    {"id": "322.09", "kg": "322", "name": "Technik-/Maschinensockel", "einheit": "St",
     "lang": "Betonsockel für Technikgeräte und Maschinen auf der Bodenplatte, mit einbetonierten Einbauteilen nach Wahl.",
     "bezug": "Anzahl der Sockel",
     "schichten": [
         {"name": "Sockel", "optionen": [
             {"k": "≤0,25 m³", "t": "Betonsockel bis 0,25 m³", "teile": [["013.09.010.01001", 1.0]], "std": True},
             {"k": "≤0,5 m³", "t": "Betonsockel bis 0,5 m³", "teile": [["013.09.010.02001", 1.0]], "std": True},
             {"k": "≤1,0 m³", "t": "Betonsockel bis 1,0 m³", "teile": [["013.09.010.03001", 1.0]], "std": True}]},
         {"name": "Einbauteile", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "4 Ankerplatten", "t": "4 Ankerplatten/Ankerschienen bis 5 kg einbetoniert", "teile": [["013.07.005.01001", 4.0]], "std": True},
             {"k": "4 Ankerschienen", "t": "4 Ankerschienen 0,30 m warmgewalzt", "teile": [["013.07.006.01001", 4.0]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "322.10", "kg": "322", "name": "Aufzugsunterfahrt/Pumpensumpf", "einheit": "St",
     "lang": "Vertiefung in der Bodenplatte für Aufzugsunterfahrt bzw. Pumpensumpf (bis 4 m², 1,5 m tief), WU-Stahlbeton komplett, "
             "mit Abdichtung bzw. Fugensicherung nach Wahl.",
     "bezug": "Anzahl; Abdichtungsfläche ca. 10 m² je Stück",
     "fest": [["013.02.008.01001", 1.0]],
     "schichten": [
         {"name": "Abdichtung", "optionen": [
             {"k": "", "t": "WU-Beton ohne Zusatzabdichtung", "teile": [], "std": True},
             {"k": "MDS 2-lagig", "t": "mineralische Dichtschlämme zweilagig, 10 m²", "teile": [["018.05.003.02001", 10.0]], "std": True},
             {"k": "PMBC", "t": "PMBC mit Gewebeeinlage, 10 m²", "teile": [["018.05.003.01001", 10.0]], "std": True},
             {"k": "Schweißbahn", "t": "Bitumenschweißbahn zweilagig, 10 m²", "teile": [["018.05.003.03001", 10.0]]}]},
         {"name": "Fugen", "optionen": [
             {"k": "Fugenblech", "t": "Anschlussfuge Fugenblech beschichtet, 8 m", "teile": [["018.05.006.01001", 8.0]], "std": True},
             {"k": "Injektion", "t": "Anschlussfuge Injektionsschlauch, 8 m", "teile": [["018.05.006.03001", 8.0]], "std": True}]},
     ], "tags": ["neubau"]},

    # ---------------------------------------------------------------- 323 Tiefgründungen
    {"id": "323.01", "kg": "323", "name": "Bohrpfahl je m", "einheit": "m",
     "lang": "Verrohrt hergestellter Ortbeton-Bohrpfahl C30/37 mit Bewehrungskorb, Pfahlkopf kappen und Integritätsprüfung anteilig, "
             "Baustelleneinrichtung des Großbohrgeräts anteilig.",
     "bezug": "Pfahllänge ab Arbeitsebene; Kopf/Prüfung bezogen auf 10 m Pfahllänge",
     "schichten": [
         {"name": "Pfahl", "optionen": [
             {"k": "Ø 62 cm", "t": "Bohrpfahl Ø 62 cm, Bewehrung 25 kg/m", "teile": [["006.02.001.01001", 1.0], ["006.02.002.01001", 0.025]], "std": True},
             {"k": "Ø 90 cm", "t": "Bohrpfahl Ø 90 cm, Bewehrung 45 kg/m", "teile": [["006.02.001.02001", 1.0], ["006.02.002.01001", 0.045]], "std": True},
             {"k": "Ø 120 cm", "t": "Bohrpfahl Ø 120 cm, Bewehrung 80 kg/m", "teile": [["006.02.001.03001", 1.0], ["006.02.002.01001", 0.08]], "std": True}]},
         {"name": "Kopf/Prüfung", "optionen": [
             {"k": "Kopf kappen", "t": "Pfahlkopf kappen, Bewehrung freilegen", "teile": [["006.02.003.01001", 0.1]], "std": True},
             {"k": "Kopf + Low-Strain", "t": "Pfahlkopf kappen, Integritätsprüfung jeder Pfahl", "teile": [["006.02.003.01001", 0.1], ["006.04.005.01001", 0.1]], "std": True}]},
         {"name": "Baustelleneinrichtung", "optionen": [
             {"k": "BE /500 m", "t": "BE Großbohrgerät anteilig bei 500 m Pfahl", "teile": [["006.01.001.03001", 0.002]], "std": True},
             {"k": "BE /1000 m", "t": "BE Großbohrgerät anteilig bei 1.000 m Pfahl", "teile": [["006.01.001.03001", 0.001]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "323.02", "kg": "323", "name": "Mikropfahl", "einheit": "m",
     "lang": "Verpresspfahl kleinen Durchmessers (GEWI bzw. Selbstbohrpfahl) mit Kopfplatte, z. B. für Nachgründungen im Bestand, mit anteiliger Geräte-BE.",
     "bezug": "Pfahllänge",
     "schichten": [
         {"name": "Pfahl", "optionen": [
             {"k": "GEWI 32", "t": "GEWI-Stab Ø 32 mm", "teile": [["006.04.002.01001", 1.0]], "std": True},
             {"k": "GEWI 50", "t": "GEWI-Stab Ø 50 mm", "teile": [["006.04.002.02001", 1.0]], "std": True},
             {"k": "Selbstbohr R51", "t": "Selbstbohrpfahl R51", "teile": [["006.04.002.03001", 1.0]], "std": True}]},
         {"name": "Anschluss", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Einbauteil Kopf", "t": "Kopfanschluss als Einbauteil bis 20 kg, 1 je 6 m", "teile": [["013.07.005.02001", 0.17]], "std": True}]},
         {"name": "Baustelleneinrichtung", "optionen": [
             {"k": "BE /100 m", "t": "Kleinbohrgerät An-/Abtransport anteilig bei 100 m", "teile": [["006.04.006.01001", 0.01]], "std": True},
             {"k": "BE /300 m", "t": "Kleinbohrgerät An-/Abtransport anteilig bei 300 m", "teile": [["006.04.006.01001", 0.0033]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "323.03", "kg": "323", "name": "Rammpfahl", "einheit": "m",
     "lang": "Fertigrammpfahl aus Stahlbeton bzw. Stahlrohr, bis zur Absetztiefe gerammt, Pfahlkopf kappen, mit anteiliger BE des Rammgeräts und Prüfung.",
     "bezug": "Eingebaute Pfahllänge; Kopf/Prüfung bezogen auf 10 m Pfahllänge",
     "schichten": [
         {"name": "Pfahl", "optionen": [
             {"k": "StB 30×30", "t": "Stahlbeton-Fertigpfahl 30 × 30 cm", "teile": [["006.04.003.01001", 1.0]], "std": True},
             {"k": "StB 35×35", "t": "Stahlbeton-Fertigpfahl 35 × 35 cm", "teile": [["006.04.003.02001", 1.0]], "std": True},
             {"k": "StB 40×40", "t": "Stahlbeton-Fertigpfahl 40 × 40 cm", "teile": [["006.02.004.02001", 1.0], ["006.04.004.01001", 0.1]]},
             {"k": "Stahlrohr Ø406", "t": "Stahlrohrpfahl Ø 406 mm", "teile": [["006.04.003.03001", 1.0]], "std": True}]},
         {"name": "Prüfung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "dyn. Probebel.", "t": "dynamische Probebelastung, 1 je 500 m", "teile": [["006.04.005.02001", 0.002]], "std": True}]},
         {"name": "Baustelleneinrichtung", "optionen": [
             {"k": "BE /500 m", "t": "Rammgerät An-/Abtransport anteilig bei 500 m", "teile": [["006.04.006.04001", 0.002]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "323.04", "kg": "323", "name": "Pfahlgründung je Pfahl kompl.", "einheit": "St",
     "lang": "Pfahlgründung je Stütze: Bohrpfahl mit Bewehrung, Pfahlkopf kappen, Pfahlkopfplatte aus Stahlbeton, Prüfung nach Wahl.",
     "bezug": "Anzahl der Pfähle (je Stütze ein Pfahl)",
     "schichten": [
         {"name": "Pfahl", "optionen": [
             {"k": "Ø62 L 10 m", "t": "Bohrpfahl Ø 62 cm, 10 m, Bewehrung, Kopf kappen", "teile": [["006.02.001.01001", 10.0], ["006.02.002.01001", 0.25], ["006.02.003.01001", 1.0]], "std": True},
             {"k": "Ø90 L 12 m", "t": "Bohrpfahl Ø 90 cm, 12 m, Bewehrung, Kopf kappen", "teile": [["006.02.001.02001", 12.0], ["006.02.002.01001", 0.54], ["006.02.003.01001", 1.0]], "std": True},
             {"k": "Ø120 L 12 m", "t": "Bohrpfahl Ø 120 cm, 12 m, Bewehrung, Kopf kappen", "teile": [["006.02.001.03001", 12.0], ["006.02.002.01001", 0.96], ["006.02.003.01001", 1.0]]}]},
         {"name": "Kopfplatte", "optionen": [
             {"k": "Kopf 1,0 m³", "t": "Pfahlkopfplatte StB C25/30 1,0 m³, geschalt, 80 kg/m³", "teile": [["013.02.002.04001", 1.0], [BEW, 0.08], ["013.05.001.01001", 4.0]], "std": True},
             {"k": "Kopf 2,0 m³", "t": "Pfahlkopfplatte StB C25/30 2,0 m³, geschalt, 80 kg/m³", "teile": [["013.02.002.04001", 2.0], [BEW, 0.16], ["013.05.001.01001", 6.0]], "std": True}]},
         {"name": "Prüfung", "optionen": [
             {"k": "Low-Strain", "t": "Integritätsprüfung", "teile": [["006.04.005.01001", 1.0]], "std": True},
             {"k": "LS + dyn. 10 %", "t": "Integritätsprüfung, dynamische Probebelastung jeder 10. Pfahl", "teile": [["006.04.005.01001", 1.0], ["006.04.005.02001", 0.1]], "std": True}]},
     ], "tags": ["neubau"]},

    # ---------------------------------------------------------------- 324 Gründungsbeläge
    {"id": "324.01", "kg": "324", "name": "Bodenaufbau auf BP, Wohnen", "einheit": "m²",
     "lang": "Fußbodenaufbau auf der Bodenplatte für Wohnräume: Abdichtung gegen Bodenfeuchte, Wärme-/Trittschalldämmung, schwimmender Estrich "
             "mit Randstreifen und Bodenbelag mit Sockel.",
     "bezug": "Raumfläche (lichte Maße), Sockel 0,6 m je m²",
     "schichten": [
         {"name": "Abdichtung/Dämmung", "optionen": [
             {"k": "Bit + EPS 60", "t": "Bitumenbahn 1-lagig, EPS DEO 60 mm", "teile": [["018.05.001.01001", 1.0], ["025.01.001.02001", 1.0]], "std": True},
             {"k": "Bit + EPS 100", "t": "Bitumenbahn 1-lagig, EPS DEO 100 mm", "teile": [["018.05.001.01001", 1.0], ["025.01.001.04001", 1.0]], "std": True},
             {"k": "Bit + XPS 80", "t": "Bitumenbahn 1-lagig, XPS 80 mm", "teile": [["018.05.001.01001", 1.0], ["025.01.008.02001", 1.0]], "std": True},
             {"k": "PE + EPS 40 + TSD", "t": "PE-Folie zweilagig, EPS 40 mm und Trittschall EPS-T 30-2 (Dämmung unter Platte)",
              "teile": [["025.01.009.01001", 1.0], ["025.01.001.01001", 1.0], ["025.01.002.01001", 1.0]]}]},
         {"name": "Estrich", "optionen": [
             {"k": "ZE 50", "t": "Zementestrich schwimmend 50 mm, Randdämmstreifen", "teile": [["025.02.001.02001", 1.0], RAND], "std": True},
             {"k": "Heiz-ZE 50", "t": "Zement-Heizestrich 50 mm über Rohr, Randdämmstreifen (FBH gesondert)", "teile": [["025.02.002.02001", 1.0], RAND], "std": True},
             {"k": "CA 40", "t": "Calciumsulfat-Fließestrich 40 mm, Randdämmstreifen", "teile": [["025.03.001.02001", 1.0], RAND]}]},
         {"name": "Belag", "optionen": BELAG_WOHNEN},
     ], "tags": ["neubau"]},

    {"id": "324.02", "kg": "324", "name": "Bodenaufbau auf BP, Objekt", "einheit": "m²",
     "lang": "Fußbodenaufbau auf der Bodenplatte für Büro-, Schul- und Gewerbeflächen: Abdichtung, Dämmung, Estrich und elastischer bzw. textiler Belag.",
     "bezug": "Raumfläche (lichte Maße), Sockel 0,4 m je m²",
     "schichten": [
         {"name": "Abdichtung/Dämmung", "optionen": [
             {"k": "Bit + EPS 60", "t": "Bitumenbahn 1-lagig, EPS DEO 60 mm", "teile": [["018.05.001.01001", 1.0], ["025.01.001.02001", 1.0]], "std": True},
             {"k": "Bit + XPS 120", "t": "Bitumenbahn 1-lagig, XPS 120 mm", "teile": [["018.05.001.01001", 1.0], ["025.01.008.03001", 1.0]], "std": True},
             {"k": "Bit + MW 40", "t": "Bitumenbahn 1-lagig, Mineralwolle 40 mm (Trittschall)", "teile": [["018.05.001.01001", 1.0], ["025.01.007.01001", 1.0]]}]},
         {"name": "Estrich", "optionen": [
             {"k": "ZE 60", "t": "Zementestrich schwimmend 60 mm, Randdämmstreifen", "teile": [["025.02.001.03001", 1.0], RAND], "std": True},
             {"k": "Schnell-ZE 50", "t": "Schnellestrich zementär 50 mm, belegreif nach ca. 3 Tagen", "teile": [["025.03.013.02001", 1.0], RAND], "std": True},
             {"k": "CA 50", "t": "Calciumsulfat-Fließestrich 50 mm, angeschliffen", "teile": [["025.03.001.03001", 1.0], ["025.03.003.01001", 1.0], RAND]}]},
         {"name": "Belag", "optionen": BELAG_OBJEKT},
     ], "tags": ["neubau"]},

    {"id": "324.03", "kg": "324", "name": "Keller-/Nebenraumboden", "einheit": "m²",
     "lang": "Einfacher Bodenaufbau für Keller-, Technik- und Lagerräume auf der Bodenplatte: Estrich auf Trennlage bzw. im Verbund, Oberfläche nach Wahl.",
     "bezug": "Raumfläche (lichte Maße)",
     "schichten": [
         {"name": "Abdichtung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Bitumenbahn", "t": "Bitumenbahn 1-lagig gegen Bodenfeuchte", "teile": [["018.05.001.01001", 1.0]], "std": True}]},
         {"name": "Estrich", "optionen": [
             {"k": "ZE 40 Trennlage", "t": "Zementestrich 40 mm auf Trennlage", "teile": [["025.02.004.01001", 1.0]], "std": True},
             {"k": "ZE 50 Trennlage", "t": "Zementestrich 50 mm auf Trennlage", "teile": [["025.02.004.02001", 1.0]], "std": True},
             {"k": "Verbund 30", "t": "Verbundestrich CT-C30-F5, 30 mm", "teile": [["025.02.003.01001", 1.0]], "std": True},
             {"k": "ohne Estrich", "t": "Bodenplatte geglättet als Nutzfläche (Zulage)", "teile": [["013.02.006.01001", 1.0]]}]},
         {"name": "Oberfläche", "optionen": [
             {"k": "", "t": "roh", "teile": [], "std": True},
             {"k": "EP-Versiegelung", "t": "Bodenbeschichtung 2K-Epoxid, zweimal", "teile": [["034.04.007.01001", 1.0]], "std": True},
             {"k": "Fliesen Mittelbett", "t": "Bodenfliesen 30 × 30 cm im Mittelbett, Sockel 0,4 m/m²", "teile": [["024.03.002.01001", 1.0], ["024.03.003.01001", 0.4]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "324.04", "kg": "324", "name": "Nutz-/Industrieestrich", "einheit": "m²",
     "lang": "Direkt genutzter Estrich auf der Bodenplatte für Werkstätten, Garagen und Lager, mit Fugen und optionaler Beschichtung.",
     "bezug": "Nutzfläche; Fugen ca. 0,3 m je m²",
     "schichten": [
         {"name": "Estrich", "optionen": [
             {"k": "Nutz-ZE 50", "t": "Zement-Nutzestrich geglättet 50 mm", "teile": [["025.02.007.01001", 1.0]], "std": True},
             {"k": "Nutz-ZE 70", "t": "Zement-Nutzestrich geglättet 70 mm", "teile": [["025.02.007.02001", 1.0]], "std": True},
             {"k": "Verbund 50 + HS", "t": "Verbundestrich 50 mm mit Hartstoffeinstreuung", "teile": [["025.02.003.02001", 1.0], ["025.03.006.01001", 1.0]], "std": True},
             {"k": "Gussasphalt 35", "t": "Gussasphaltestrich AS-IC10, 35 mm", "teile": [["025.03.004.02001", 1.0]]},
             {"k": "Kunstharz 5", "t": "Kunstharzestrich Epoxid 5 mm auf Bodenplatte", "teile": [["025.04.006.01001", 1.0], ["025.03.009.01001", 1.0]]}]},
         {"name": "Fugen", "optionen": [
             {"k": "Scheinfugen", "t": "Scheinfugen schneiden und verharzen, 0,3 m je m²", "teile": [["025.04.002.01001", 0.3]], "std": True},
             {"k": "Fugenprofile", "t": "Bewegungsfugen mit Profil, 0,3 m je m²", "teile": [["025.04.001.01001", 0.3]], "std": True}]},
         {"name": "Beschichtung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "EP abgestreut", "t": "Epoxidbeschichtung abgestreut, rutschhemmend", "teile": [["034.04.007.02001", 1.0]], "std": True},
             {"k": "PU-Verlauf", "t": "PU-Verlaufsbeschichtung 2 mm", "teile": [["034.04.007.03001", 1.0]]}]},
     ], "tags": ["neubau"]},

    {"id": "324.05", "kg": "324", "name": "Bodenaufbau Bestand erneuern", "einheit": "m²",
     "lang": "Erneuerung des Fußbodens auf bestehender Bodenplatte/Kellersohle: Altbelag bzw. Altestrich entfernen und entsorgen, Untergrund ausgleichen "
             "oder neuen Estrich herstellen, neuer Belag.",
     "bezug": "Raumfläche (lichte Maße)",
     "schichten": [
         {"name": "Rückbau", "optionen": [
             {"k": "Fliesen ab", "t": "Bodenfliesen mit Mörtelbett entfernen, Bauschutt entsorgen", "teile": [["084.03.002.02001", 1.0], ["087.04.001.19001", 0.05]], "std": True},
             {"k": "PVC/Teppich ab", "t": "Teppich/PVC verklebt entfernen, Mischabfall entsorgen", "teile": [["084.03.003.01001", 1.0], ["087.04.001.14001", 0.005]], "std": True},
             {"k": "Belag + Estrich ab", "t": "Fliesen und Estrich bis 6 cm mit Dämmung abbrechen, entsorgen",
              "teile": [["084.03.002.02001", 1.0], ["084.03.004.01001", 1.0], ["087.04.001.19001", 0.18]]}]},
         {"name": "Untergrund", "optionen": [
             {"k": "Spachtel 5 mm", "t": "Untergrund grundieren und zementär spachteln bis 5 mm", "teile": [["036.01.001.04001", 1.0]], "std": True},
             {"k": "Dünnestrich 20", "t": "Renovierestrich 20 mm auf Altuntergrund", "teile": [["025.03.008.02001", 1.0]], "std": True},
             {"k": "ZE 50 Trennlage", "t": "neuer Zementestrich 50 mm auf Trennlage", "teile": [["025.02.004.02001", 1.0]]}]},
         {"name": "Belag", "optionen": [
             {"k": "Fliesen 60×60", "t": "Feinsteinzeug 60 × 60 cm, Fliesensockel", "teile": [["024.03.001.04001", 1.0], ["024.03.003.01001", 0.6]], "std": True},
             {"k": "Vinyl LVT", "t": "Designbelag Vinyl verklebt, Sockelleiste", "teile": [["036.02.003.01001", 1.0], ["036.04.003.03001", 0.6]], "std": True},
             {"k": "Linoleum", "t": "Linoleum 2,5 mm, Sockelleiste", "teile": [["036.02.001.01001", 1.0], ["036.04.003.01001", 0.6]], "std": True},
             {"k": "Vinyl-Klick", "t": "Vinyl-Klickboden schwimmend, Sockelleiste", "teile": [["036.02.010.02001", 1.0], ["036.04.003.03001", 0.6]]}]},
     ], "tags": ["altbau"]},

    # ---------------------------------------------------------------- 325 Abdichtungen und Bekleidungen
    {"id": "325.01", "kg": "325", "name": "Abdichtung unter Bodenplatte", "einheit": "m²",
     "lang": "Flächenabdichtung unter der Bodenplatte auf Sauberkeitsschicht bzw. als Frischbetonverbund, mit Schutzlage und Durchdringungen anteilig.",
     "bezug": "Abgedichtete Fläche (Grundfläche Bodenplatte zzgl. Hochführungen)",
     "fest": [["013.01.001.01001", 1.0]],
     "schichten": [
         {"name": "Abdichtung", "optionen": [
             {"k": "Bitumenbahn", "t": "Bitumen-Schweißbahn 1-lagig auf Sauberkeitsschicht", "teile": [["018.02.005.01001", 1.0]], "std": True},
             {"k": "FBV-Bahn", "t": "Frischbetonverbundbahn", "teile": [["018.02.004.01001", 1.0]], "std": True},
             {"k": "FPO 1,5 mm", "t": "Kunststoffbahn FPO/EPDM 1,5 mm", "teile": [["018.05.002.01001", 1.0]], "std": True},
             {"k": "FPO 2,0 mm", "t": "Kunststoffbahn FPO/EPDM 2,0 mm", "teile": [["018.05.002.02001", 1.0]]}]},
         {"name": "Schutzlage", "optionen": [
             {"k": "PE-Folie", "t": "PE-Folie zweilagig als Schutz-/Trennlage", "teile": [["013.01.002.01001", 1.0]], "std": True},
             {"k": "Bautenschutzm.", "t": "Bautenschutzmatte Gummigranulat 6 mm", "teile": [["018.05.012.03001", 1.0]], "std": True}]},
         {"name": "Durchdringungen", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Rohrdurchf. anteil.", "t": "Rohrdurchführungen DN 100 abdichten, 1 je 20 m²", "teile": [["018.02.006.01001", 0.05]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "325.02", "kg": "325", "name": "Abdichtung auf Bodenplatte", "einheit": "m²",
     "lang": "Flächenabdichtung auf der Bodenplatte unter dem Estrich gegen Bodenfeuchte (W1-E), an Wänden hochgeführt, mit Untergrundvorbereitung.",
     "bezug": "Abgedichtete Fläche einschließlich Hochführungen",
     "schichten": [
         {"name": "Vorbereitung", "optionen": [
             {"k": "grundiert", "t": "Untergrund reinigen und grundieren", "teile": [["018.01.001.01001", 1.0]], "std": True},
             {"k": "grund. + Kehle", "t": "grundieren, Mörtelhohlkehle 0,35 m je m²", "teile": [["018.01.001.01001", 1.0], ["018.01.002.01001", 0.35]], "std": True}]},
         {"name": "Abdichtung", "optionen": [
             {"k": "Bitumen 1-lagig", "t": "Polymerbitumenbahn 1-lagig", "teile": [["018.05.001.01001", 1.0]], "std": True},
             {"k": "Bitumen 2-lagig", "t": "Polymerbitumenbahn 2-lagig", "teile": [["018.05.001.02001", 1.0]], "std": True},
             {"k": "MDS flexibel", "t": "mineralische Dichtschlämme flexibel", "teile": [["018.02.002.01001", 1.0]]},
             {"k": "FPO 1,5 mm", "t": "Kunststoffbahn FPO/EPDM 1,5 mm", "teile": [["018.05.002.01001", 1.0]]}]},
         {"name": "Anschlüsse", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Durchdr. anteilig", "t": "Abdichtungsanschlüsse an Durchdringungen, 1 je 15 m²", "teile": [["018.05.005.01001", 0.067]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "325.03", "kg": "325", "name": "Fugenabdichtung WU-Bodenplatte", "einheit": "m",
     "lang": "Abdichtung von Arbeits-, Sollriss- und Bewegungsfugen in WU-Bodenplatten und am Wandanschluss, optional mit Nachinjektion.",
     "bezug": "Fugenlänge",
     "schichten": [
         {"name": "Fugenabdichtung", "optionen": [
             {"k": "Fugenblech besch.", "t": "beschichtetes Fugenblech 167 mm", "teile": [["018.05.006.01001", 1.0]], "std": True},
             {"k": "Fugenblech 300", "t": "unbeschichtetes Fugenblech 300 × 1,5 mm", "teile": [["013.07.001.01001", 1.0]], "std": True},
             {"k": "Quellband", "t": "Quellband Bentonit/Hydrogel", "teile": [["018.05.006.02001", 1.0]], "std": True},
             {"k": "Injektionsschl.", "t": "verpressbarer Injektionsschlauch mit Packern", "teile": [["018.05.006.03001", 1.0]], "std": True},
             {"k": "Dehnfugenband", "t": "innenliegendes Dehnfugenband 240 mm", "teile": [["013.07.002.01001", 1.0]]},
             {"k": "Sollrisselement", "t": "Sollrissfugenelement", "teile": [["018.05.006.04001", 1.0]]}]},
         {"name": "Nachinjektion", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "30 % verpresst", "t": "Injektionsschlauch zu 30 % nachverpressen", "teile": [["018.05.007.01001", 0.3]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "325.04", "kg": "325", "name": "Abdichtung Sumpf/Unterfahrt", "einheit": "m²",
     "lang": "Abdichtung von Aufzugsunterfahrten und Pumpensümpfen (W1-E) einschließlich Untergrundvorbereitung und Hohlkehlen.",
     "bezug": "Abgedichtete Fläche (Boden und Wände)",
     "schichten": [
         {"name": "Vorbereitung", "optionen": [
             {"k": "grundiert", "t": "reinigen und grundieren", "teile": [["018.01.001.01001", 1.0]], "std": True},
             {"k": "grund. + Kehle", "t": "grundieren, Hohlkehle 0,6 m je m²", "teile": [["018.01.001.01001", 1.0], ["018.01.002.02001", 0.6]], "std": True}]},
         {"name": "Abdichtung", "optionen": [
             {"k": "PMBC Gewebe", "t": "PMBC mit Gewebeeinlage", "teile": [["018.05.003.01001", 1.0]], "std": True},
             {"k": "MDS 2-lagig", "t": "MDS zweilagig mit Dichtband", "teile": [["018.05.003.02001", 1.0]], "std": True},
             {"k": "Schweißbahn 2-lg.", "t": "Bitumenschweißbahn zweilagig", "teile": [["018.05.003.03001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "325.05", "kg": "325", "name": "Bodenplattenrand/Sockel", "einheit": "m",
     "lang": "Ausbildung des Bodenplattenrands: Abdichtung der Sockelfuge bzw. Sockelabdichtung im Spritzwasserbereich, Stirndämmung und Schutzlage.",
     "bezug": "Länge des Plattenrands (Gebäudeumfang); Stirnfläche 0,5 m² je m",
     "schichten": [
         {"name": "Abdichtung", "optionen": [
             {"k": "Fuge MDS", "t": "Fugenabdichtung Sockel/Bodenplatte mit Dichtschlämme", "teile": [["013.07.008.01001", 1.0]], "std": True},
             {"k": "Sockel MDS 50", "t": "Sockelabdichtung MDS bis 50 cm über Gelände", "teile": [["018.03.001.01001", 1.0]], "std": True}]},
         {"name": "Stirndämmung", "optionen": [
             {"k": "", "t": "", "teile": []},
             {"k": "XPS 80", "t": "Perimeterdämmung XPS 80 mm an Plattenstirn, 0,5 m² je m", "teile": [["018.02.008.01001", 0.5]], "std": True},
             {"k": "XPS 120", "t": "Perimeterdämmung XPS 120 mm an Plattenstirn, 0,5 m² je m", "teile": [["018.02.008.02001", 0.5]], "std": True}]},
         {"name": "Schutz", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Noppenbahn", "t": "Noppenbahn 8 mm als Schutzlage, 0,5 m² je m", "teile": [["018.02.007.01001", 0.5]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "325.06", "kg": "325", "name": "Kellerboden nachträgl. abdichten", "einheit": "m²",
     "lang": "Nachträgliche Abdichtung eines bestehenden Kellerbodens: Altbeschichtung entfernen bzw. Oberfläche strahlen, Abdichtung bzw. Feuchtesperre, "
             "Schutz-/Nutzestrich.",
     "bezug": "Kellerbodenfläche (lichte Maße)",
     "schichten": [
         {"name": "Vorbereitung", "optionen": [
             {"k": "Altbesch. ab", "t": "Altabdichtung/Bitumenanstrich mechanisch entfernen", "teile": [["018.05.010.01001", 1.0]], "std": True},
             {"k": "kugelgestrahlt", "t": "Betonoberfläche kugelstrahlen", "teile": [["081.01.003.01001", 1.0]], "std": True}]},
         {"name": "Abdichtung", "optionen": [
             {"k": "EP-Feuchtesperre", "t": "Epoxid-Feuchtesperre", "teile": [["036.01.001.06001", 1.0]], "std": True},
             {"k": "Bitumenbahn", "t": "Polymerbitumenbahn 1-lagig, hochgeführt", "teile": [["018.05.001.01001", 1.0]], "std": True},
             {"k": "MDS flexibel", "t": "mineralische Dichtschlämme flexibel", "teile": [["018.02.002.01001", 1.0]], "std": True}]},
         {"name": "Estrich", "optionen": [
             {"k": "Verbund 30", "t": "Verbundestrich 30 mm", "teile": [["025.02.003.01001", 1.0]], "std": True},
             {"k": "ZE 50 Trennlage", "t": "Zementestrich 50 mm auf Trennlage", "teile": [["025.02.004.02001", 1.0]], "std": True},
             {"k": "", "t": "ohne Estrich", "teile": []}]},
     ], "tags": ["altbau"]},

    # ---------------------------------------------------------------- 326 Dränagen
    {"id": "326.01", "kg": "326", "name": "Ringdränage", "einheit": "m",
     "lang": "Ringdränage nach DIN 4095 um das Gebäude aus gelochten Dränrohren mit Filterkies und Geotextil, Spül- und Kontrollschächte anteilig.",
     "bezug": "Länge der Dränleitung; Schächte 1 je 20 m",
     "schichten": [
         {"name": "Dränleitung", "optionen": [
             {"k": "DN 100", "t": "Dränleitung DN 100 mit Filterumhüllung", "teile": [["010.01.001.01001", 1.0]], "std": True},
             {"k": "DN 125", "t": "Dränleitung DN 125 mit Filterumhüllung", "teile": [["010.01.001.02001", 1.0]], "std": True}]},
         {"name": "Packung", "optionen": [
             {"k": "", "t": "Filterkies in Position enthalten", "teile": [], "std": True},
             {"k": "Kiespackung", "t": "zusätzliche Sickerpackung Sand/Kies 0,15 m³ je m, Geotextil 1,5 m² je m",
              "teile": [["002.04.004.01001", 0.15], ["002.03.006.01001", 1.5]], "std": True}]},
         {"name": "Schächte", "optionen": [
             {"k": "Schacht DN 315", "t": "Spül-/Kontrollschacht DN 315, 1 je 20 m", "teile": [["010.01.002.01001", 0.05]], "std": True},
             {"k": "Schacht DN 400", "t": "Spül-/Kontrollschacht DN 400, 1 je 20 m", "teile": [["010.01.002.02001", 0.05]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "326.02", "kg": "326", "name": "Flächendränage unter BP", "einheit": "m²",
     "lang": "Flächendrän unter der Bodenplatte aus Kies 16/32 mit Trennvlies, optional mit Sammelleitungen zur Ringdränage.",
     "bezug": "Fläche der Bodenplatte",
     "schichten": [
         {"name": "Dränschicht", "optionen": [
             {"k": "Kies 15", "t": "Flächendrän Kies 16/32, 15 cm", "teile": [["010.01.004.01001", 1.0]], "std": True},
             {"k": "Kies 20", "t": "Flächendrän Kies 16/32, 20 cm", "teile": [["010.01.004.02001", 1.0]], "std": True}]},
         {"name": "Trennlage", "optionen": [
             {"k": "Vlies GRK 3", "t": "Geotextil GRK 3 unten", "teile": [["002.03.006.01001", 1.0]], "std": True},
             {"k": "Vlies GRK 4", "t": "Geotextil GRK 4 unten", "teile": [["002.03.006.02001", 1.0]], "std": True}]},
         {"name": "Sammelleitung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Leitung 0,2 m/m²", "t": "Dränleitung DN 100 als Sammler, 0,2 m je m²", "teile": [["010.01.001.01001", 0.2]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "326.03", "kg": "326", "name": "Dränschicht an erdberührter Wand", "einheit": "m²",
     "lang": "Vertikale Dränschicht vor erdberührten Wänden als Teil der Dränanlage (Dränmatte, Noppenbahn mit Vlies bzw. Dränplatte), optional Filtervlies.",
     "bezug": "Dränfläche der Wand",
     "schichten": [
         {"name": "Dränschicht", "optionen": [
             {"k": "Dränmatte", "t": "Dränmatte", "teile": [["010.01.003.01001", 1.0]], "std": True},
             {"k": "Noppen 20 + Vlies", "t": "Noppenbahn 20 mm mit Vlies", "teile": [["018.05.012.01001", 1.0]], "std": True},
             {"k": "Dränpl. EPS 50", "t": "Dränplatte EPS haufwerksporig 50 mm", "teile": [["018.05.012.02001", 1.0]], "std": True}]},
         {"name": "Filter", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Filtervlies", "t": "zusätzliches Filtervlies GRK 3", "teile": [["002.03.006.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "326.04", "kg": "326", "name": "Dränwasser-Pumpenschacht", "einheit": "St",
     "lang": "Pumpenschacht für Dränwasser mit Tauchpumpe, Druckleitung zum Anschlusspunkt und optional Kontrollschacht.",
     "bezug": "Anzahl der Pumpenschächte",
     "fest": [["010.01.005.01001", 1.0]],
     "schichten": [
         {"name": "Druckleitung", "optionen": [
             {"k": "PE 10 m", "t": "Druckleitung PE DN 100, 10 m", "teile": [["008.03.005.02001", 10.0]], "std": True},
             {"k": "PE 25 m", "t": "Druckleitung PE DN 100, 25 m", "teile": [["008.03.005.02001", 25.0]], "std": True}]},
         {"name": "Kontrollschacht", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Schacht DN 400", "t": "Kontrollschacht DN 400 vor Übergabe", "teile": [["010.01.002.02001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},
]
