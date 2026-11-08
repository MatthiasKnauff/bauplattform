# Bauteilvorlagen KG 340 Innenwände und KG 350 Decken (DIN 276:2018) – eigene Aufbauten aus der Positionsdatenbank.
# Faktor = Menge der Position je Einheit des Bauteils (m² Wand-/Deckenfläche, m Länge, St Stück).
# Annahmen: Geschosshöhe 2,75 m → Kimmschicht/Deckenanschluss 0,36 m je m² Wand; Wandbekleidung beidseitig = Faktor 2,0;
# Bewehrung Wände ca. 50 kg/m³, Decken ca. 100 kg/m³ (60 % Matten, 40 % Stabstahl), Unterzüge ca. 150 kg/m³;
# Randdämmstreifen und Sockelleisten 0,7 m je m² Bodenfläche (Räume 15–25 m²).
# DIN 276:2018: 353 Deckenbeläge, 354 Deckenbekleidungen (neue Zählung).


def o(k, t, teile, std=False):
    d = {"k": k, "t": t, "teile": [list(x) for x in teile]}
    if std:
        d["std"] = True
    return d


OHNE = {"k": "", "t": "", "teile": []}

# ---------------------------------------------------------------- gemeinsame Optionen Wände
BEKL_MW_2 = [   # Bekleidung massiver Innenwände, beide Seiten zusammen (Faktor 2 = beidseitig)
    o("Gipsputz beids.", "beidseitig Gipsputz 10 mm Q2, Dispersionsanstrich",
      [["023.02.001.01001", 2.0], ["034.02.001.01001", 2.0]], True),
    o("KZ-Putz beids.", "beidseitig Kalkzementputz 15 mm, Dispersionsanstrich",
      [["023.02.001.04001", 2.0], ["034.02.001.01001", 2.0]], True),
    o("Gipsputz/Fliesen", "Seite 1 Gipsputz + Dispersionsanstrich, Seite 2 Kalkzementputz, Verbundabdichtung, Wandfliesen 30×60 cm",
      [["023.02.001.01001", 1.0], ["034.02.001.01001", 1.0], ["023.02.001.04001", 1.0], ["024.01.002.01001", 1.0],
       ["024.02.003.02001", 1.0]], True),
    o("Gipsputz Q3 beids.", "beidseitig Gipsputz 15 mm Q3, Dispersionsanstrich Nassabriebklasse 2",
      [["023.02.001.02001", 2.0], ["034.02.001.02001", 2.0]]),
    o("Kalkputz beids.", "beidseitig Kalkputz 15 mm, Silikatanstrich",
      [["023.02.001.05001", 2.0], ["034.02.002.01001", 2.0]]),
    o("Vlies beids.", "beidseitig Gipsputz 10 mm, Malervlies, Dispersionsanstrich",
      [["023.02.001.01001", 2.0], ["037.02.001.03001", 2.0], ["034.02.001.01001", 2.0]]),
    o("Sicht/Anstrich", "Sichtmauerwerk beidseitig, Anstrich zweimal", [["034.02.004.01001", 2.0]]),
    o("", "ohne Bekleidung (gesondert unter KG 345 erfasst)", []),
]

BEKL_BETON_2 = [   # Oberfläche Stahlbetonwände beidseitig
    o("Spachtel/Anstrich", "beidseitig Flächenspachtelung Q3, Dispersionsanstrich",
      [["034.01.003.01001", 2.0], ["034.02.001.01001", 2.0]], True),
    o("Gipsputz beids.", "beidseitig Haftbrücke, Gipsputz 10 mm Q2, Dispersionsanstrich",
      [["023.01.001.02001", 2.0], ["023.02.001.01001", 2.0], ["034.02.001.01001", 2.0]], True),
    o("Anstrich roh", "Betonfläche beidseitig zweimal gestrichen (Sichtbeton)", [["034.02.004.01001", 2.0]], True),
    o("Betonlasur", "Betonlasur/Betonkosmetik beidseitig", [["034.04.006.01001", 2.0]]),
    o("", "ohne Oberflächenbehandlung", []),
]

GK_OBERFL_2 = [   # Oberfläche Montagewände beidseitig
    o("Anstrich", "Verspachtelung Q2, Dispersionsanstrich beidseitig", [["034.02.001.01001", 2.0]], True),
    o("Q3, Anstrich", "Verspachtelung Q3, Dispersionsanstrich beidseitig",
      [["039.06.001.01001", 2.0], ["034.02.001.01001", 2.0]], True),
    o("Vlies, Anstrich", "Malervlies, Dispersionsanstrich beidseitig",
      [["037.02.001.03001", 2.0], ["034.02.001.01001", 2.0]]),
    o("Q4, Anstrich", "Verspachtelung Q4, Dispersionsanstrich Nassabriebklasse 2 beidseitig",
      [["039.06.001.02001", 2.0], ["034.02.001.02001", 2.0]]),
    o("Fliesen einseitig", "Seite 1 Verbundabdichtung + Wandfliesen 30×60 cm, Seite 2 Dispersionsanstrich",
      [["024.01.002.01001", 1.0], ["024.02.003.02001", 1.0], ["034.02.001.01001", 1.0]]),
    o("", "ohne Anstrich (Q2 verspachtelt)", []),
]

GK_ZULAGE = [
    o("", "", [], True),
    o("gleit. Anschluss", "gleitender Deckenanschluss", [["039.01.013.01001", 0.36]], True),
    o("Höhe > 4 m", "Wandhöhe über 4,0 m", [["039.01.012.01001", 1.0]]),
    o("Türöffnungen", "Türöffnungen mit UA-Profilen, 1 je 10 m² Wand", [["039.02.001.01001", 0.1]]),
]

GK_OBERFL_1 = [   # Oberfläche einseitig (Vorsatzschalen, Schachtwände)
    o("Anstrich", "Verspachtelung Q2, Dispersionsanstrich", [["034.02.001.01001", 1.0]], True),
    o("Q3, Anstrich", "Verspachtelung Q3, Dispersionsanstrich", [["039.06.001.01001", 1.0], ["034.02.001.01001", 1.0]], True),
    o("Fliesen", "Verbundabdichtung, Wandfliesen 30×60 cm", [["024.01.002.01001", 1.0], ["024.02.003.02001", 1.0]]),
    o("Vlies, Anstrich", "Malervlies, Dispersionsanstrich", [["037.02.001.03001", 1.0], ["034.02.001.01001", 1.0]]),
    o("", "ohne Anstrich (Q2 verspachtelt)", []),
]

ZYLINDER = [
    o("Schließanlage", "Profilzylinder in Schließanlage", [["029.01.002.02001", 1.0]], True),
    o("Einzelzylinder", "Profilzylinder einzelschließend", [["029.01.002.01001", 1.0]], True),
    o("E-Zylinder", "elektronischer Profilzylinder (Transponder)", [["029.01.002.04001", 1.0]]),
    o("", "ohne Zylinder (bauseits)", []),
]

# ---------------------------------------------------------------- gemeinsame Optionen Böden
DAEMM_EST = [   # Dämmschicht unter schwimmendem Estrich
    o("EPS 40 + T", "Wärmedämmung EPS 40 mm + Trittschalldämmung EPS-T 30-2",
      [["025.01.001.01001", 1.0], ["025.01.002.01001", 1.0]], True),
    o("MW-T 30", "Trittschalldämmung Mineralwolle 30-5 mm", [["025.01.002.02001", 1.0]], True),
    o("EPS-T 30", "Trittschalldämmung EPS-T 30-2 mm", [["025.01.002.01001", 1.0]]),
    o("EPS 60 + T", "Wärmedämmung EPS 60 mm + Trittschalldämmung EPS-T 30-2",
      [["025.01.001.02001", 1.0], ["025.01.002.01001", 1.0]]),
    o("Holzfaser-T", "Trittschalldämmung Holzfaser 20 mm", [["025.01.002.03001", 1.0]]),
]

ESTRICH = [
    o("ZE 50", "Zementestrich CT-C25-F4 schwimmend 50 mm", [["025.02.001.02001", 1.0]], True),
    o("CA 40", "Calciumsulfat-Fließestrich 40 mm, angeschliffen, grundiert",
      [["025.03.001.02001", 1.0], ["025.03.003.01001", 1.0], ["024.01.001.01001", 1.0]], True),
    o("ZE 45", "Zementestrich CT-C25-F4 schwimmend 45 mm", [["025.02.001.01001", 1.0]]),
    o("ZE 60", "Zementestrich CT-C25-F4 schwimmend 60 mm", [["025.02.001.03001", 1.0]]),
    o("CA 35", "Calciumsulfat-Fließestrich 35 mm, angeschliffen, grundiert",
      [["025.03.001.01001", 1.0], ["025.03.003.01001", 1.0], ["024.01.001.01001", 1.0]]),
    o("Schnellestrich", "Schnellestrich-System zementär 45 mm, belegreif nach ca. 3 Tagen", [["025.03.013.01001", 1.0]]),
]

EST_FEST = [["025.01.006.01001", 0.7], ["025.01.005.01001", 1.0]]   # Randdämmstreifen, PE-Abdeckung

ELAST_VORB = [["036.01.001.02001", 1.0], ["036.01.001.03001", 1.0]]   # Grundierung + Spachtelung 2 mm

DECKE_OBERFL = [   # Anstrich Deckenflächen
    o("Anstrich", "Dispersionsanstrich Decke", [["034.02.001.03001", 1.0]], True),
    o("Q3, Anstrich", "Verspachtelung Q3, Dispersionsanstrich", [["039.06.001.01001", 1.0], ["034.02.001.03001", 1.0]], True),
    o("Q4, Anstrich", "Verspachtelung Q4, Dispersionsanstrich", [["039.06.001.02001", 1.0], ["034.02.001.03001", 1.0]]),
    o("Vlies, Anstrich", "Malervlies Decke, Dispersionsanstrich", [["037.02.001.04001", 1.0], ["034.02.001.03001", 1.0]]),
    o("", "ohne Anstrich (Q2 verspachtelt)", []),
]


VORLAGEN = [
    # ============================================================ KG 341 Tragende Innenwände
    {"id": "341.01", "kg": "341", "name": "IW tragend Mauerwerk, verputzt", "einheit": "m²",
     "lang": "Tragende Innenwand aus Plansteinmauerwerk im Dünnbett auf Kimmschicht, mit beidseitiger Bekleidung. "
             "Stürze und Öffnungen gesondert unter KG 344.",
     "bezug": "Wandfläche (Rohbaumaß Länge × Geschosshöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             o("KS 11,5", "Kalksand-Plansteine KS 12, d = 11,5 cm", [["012.03.001.01001", 1.0], ["012.01.001.01001", 0.36]], True),
             o("KS 17,5", "Kalksand-Plansteine KS 12, d = 17,5 cm", [["012.03.001.02001", 1.0], ["012.01.001.02001", 0.36]], True),
             o("KS 24", "Kalksand-Plansteine KS 12, d = 24 cm", [["012.03.001.03001", 1.0], ["012.01.001.03001", 0.36]], True),
             o("Hlz 17,5", "Planziegel, d = 17,5 cm", [["012.03.002.01001", 1.0], ["012.01.001.02001", 0.36]], True),
             o("Hlz 24", "Planziegel, d = 24 cm", [["012.03.002.02001", 1.0], ["012.01.001.03001", 0.36]]),
             o("PP4 24", "Porenbeton-Plansteine PP4, d = 24 cm", [["012.02.003.03001", 1.0], ["012.01.001.03001", 0.36]])]},
         {"name": "Bekleidung", "optionen": BEKL_MW_2},
         {"name": "Zulagen", "optionen": [
             o("", "", [], True),
             o("Schlitze", "Installationsschlitze 5×5 cm herstellen und beiputzen, 0,5 m je m² Wand",
               [["012.04.006.02001", 0.5], ["023.02.005.01001", 0.5]], True)]},
     ], "tags": ["neubau"]},

    {"id": "341.02", "kg": "341", "name": "Wohnungstrennwand massiv", "einheit": "m²",
     "lang": "Tragende Wohnungstrennwand mit erhöhtem Schallschutz aus Mauerwerk hoher Rohdichte, beidseitig bekleidet, "
             "wahlweise mit zusätzlicher Vorsatzschale.",
     "bezug": "Wandfläche (Rohbaumaß), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             o("KS 24 RDK 2,0", "KS-Plansteine RDK 2,0, d = 24 cm", [["012.03.003.01001", 1.0], ["012.01.001.03001", 0.36]], True),
             o("KS 30 RDK 2,0", "KS-Plansteine RDK 2,0, d = 30 cm", [["012.03.003.02001", 1.0], ["012.01.001.04001", 0.36]], True),
             o("SSZ 24", "Schallschutzziegel verfüllt, d = 24 cm", [["012.05.004.02001", 1.0], ["012.01.001.03001", 0.36]], True),
             o("SSZ 30", "Schallschutzziegel verfüllt, d = 30 cm", [["012.05.004.03001", 1.0], ["012.01.001.04001", 0.36]])]},
         {"name": "Bekleidung", "optionen": BEKL_MW_2},
         {"name": "Vorsatzschale", "optionen": [
             o("", "", [], True),
             o("Vorsatzschale", "freistehende Vorsatzschale CW 50, 1 × 12,5 mm GKB, einseitig, gestrichen",
               [["039.03.001.01001", 1.0], ["034.02.001.01001", 1.0]], True)]},
     ], "tags": ["neubau"]},

    {"id": "341.03", "kg": "341", "name": "IW tragend Stahlbeton Ortbeton", "einheit": "m²",
     "lang": "Tragende Innenwand aus Ortbeton XC1 mit beidseitiger Schalung und Bewehrung (ca. 50 kg/m³), "
             "mit Oberflächenbehandlung beidseitig.",
     "bezug": "Wandfläche (Rohbaumaß), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Beton", "optionen": [
             o("StB 18 C25", "Stahlbeton C25/30, d = 18 cm, Bewehrung 9 kg/m²",
               [["013.03.002.05001", 0.18], ["013.06.001.03001", 0.009]], True),
             o("StB 20 C25", "Stahlbeton C25/30, d = 20 cm, Bewehrung 10 kg/m²",
               [["013.03.002.06001", 0.20], ["013.06.001.03001", 0.010]], True),
             o("StB 25 C25", "Stahlbeton C25/30, d = 25 cm, Bewehrung 12,5 kg/m²",
               [["013.03.002.07001", 0.25], ["013.06.001.03001", 0.0125]], True),
             o("StB 30 C25", "Stahlbeton C25/30, d = 30 cm, Bewehrung 15 kg/m²",
               [["013.03.002.08001", 0.30], ["013.06.001.03001", 0.015]]),
             o("StB 20 C30", "Stahlbeton C30/37, d = 20 cm, Bewehrung 10 kg/m²",
               [["013.03.002.10001", 0.20], ["013.06.001.03001", 0.010]]),
             o("StB 25 C30", "Stahlbeton C30/37, d = 25 cm, Bewehrung 12,5 kg/m²",
               [["013.03.002.11001", 0.25], ["013.06.001.03001", 0.0125]])]},
         {"name": "Schalung", "optionen": [
             o("", "Wandschalung beidseitig, ohne Sichtbetonanforderung", [["013.05.001.02001", 2.0]], True),
             o("SB 2", "Wandschalung beidseitig, Sichtbetonklasse SB 2", [["013.05.001.03001", 2.0]], True),
             o("SB 3", "Wandschalung beidseitig, Sichtbetonklasse SB 3", [["013.05.001.04001", 2.0]]),
             o("H > 3 m", "Wandschalung beidseitig, Höhe 3–5 m", [["013.05.001.05001", 2.0]])]},
         {"name": "Oberfläche", "optionen": BEKL_BETON_2},
     ], "tags": ["neubau"]},

    {"id": "341.04", "kg": "341", "name": "IW Stahlbeton-Elementwand", "einheit": "m²",
     "lang": "Tragende Innenwand aus Doppelwandelementen (Halbfertigteil) mit Kernbeton, Stoßbewehrung und Abstützung, "
             "Oberfläche beidseitig behandelt.",
     "bezug": "Wandfläche (Rohbaumaß), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Element", "optionen": [
             o("Elementwand 24", "Doppelwand d = 24 cm, Kernbeton C25/30", [["013.03.005.01001", 1.0]], True),
             o("Elementwand 30", "Doppelwand d = 30 cm, Kernbeton C25/30", [["013.03.005.02001", 1.0]], True)]},
         {"name": "Oberfläche", "optionen": BEKL_BETON_2},
         {"name": "Einbauteile", "optionen": [
             o("", "", [], True),
             o("Leerdosen", "Elektro-Leerdosen und Aussparungen eingelegt",
               [["013.07.007.01001", 0.3], ["013.05.003.01001", 0.2]], True)]},
     ], "tags": ["neubau"]},

    {"id": "341.05", "kg": "341", "name": "IW tragend Holzrahmenbau", "einheit": "m²",
     "lang": "Tragende Innenwand in Holzrahmenbauweise, Ständer KVH 60/120 mit Mineralwolle und OSB beidseitig, "
             "mit Bekleidung und Oberfläche.",
     "bezug": "Wandfläche (Rohbaumaß), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Rahmen", "optionen": [
             o("HRW 60/120", "Holzrahmenwand KVH 60/120, MW 60 mm, OSB beidseitig", [["016.04.002.01001", 1.0]], True),
             o("HRW + Inst.-Ebene", "Holzrahmenwand KVH 60/120 mit Installationsebene einseitig",
               [["016.04.002.01001", 1.0], ["016.04.003.01001", 1.0]], True)]},
         {"name": "Bekleidung", "optionen": [
             o("GKB beids.", "beidseitig Gipsplatten 12,5 mm direkt befestigt", [["039.03.001.03001", 2.0]], True),
             o("OSB sichtbar", "OSB sichtbar, beidseitig farblos lasiert", [["034.02.014.01001", 2.0]], True),
             o("Dreischicht", "beidseitig Dreischichtplatten 19 mm", [["039.03.009.03001", 2.0]])]},
         {"name": "Oberfläche", "optionen": [
             o("Anstrich", "Dispersionsanstrich beidseitig", [["034.02.001.01001", 2.0]], True),
             o("Q3, Anstrich", "Verspachtelung Q3, Dispersionsanstrich beidseitig",
               [["039.06.001.01001", 2.0], ["034.02.001.01001", 2.0]], True),
             o("", "ohne", [])]},
     ], "tags": ["neubau"]},

    {"id": "341.06", "kg": "341", "name": "IW tragend Brettsperrholz", "einheit": "m²",
     "lang": "Tragende Innenwand aus Brettsperrholz, vorgefertigt und mit Kran montiert, Stöße luftdicht abgeklebt, "
             "sichtbar belassen oder bekleidet.",
     "bezug": "Wandfläche, Öffnungen über 2,5 m² abgezogen",
     "fest": [["016.01.005.01001", 0.5]],
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             o("BSP 100 NSi", "Brettsperrholz 100 mm, Nichtsichtqualität", [["016.05.003.01001", 1.0]], True),
             o("BSP 120 WSi", "Brettsperrholz 120 mm, Wohnsichtqualität", [["016.05.003.02001", 1.0]], True)]},
         {"name": "Bekleidung", "optionen": [
             o("sichtbar lasiert", "Holzoberfläche beidseitig farblos lasiert", [["034.02.014.01001", 2.0]], True),
             o("GKB beids.", "beidseitig Gipsplatten 12,5 mm direkt, Dispersionsanstrich",
               [["039.03.001.03001", 2.0], ["034.02.001.01001", 2.0]], True),
             o("VSS einseitig", "einseitig Vorsatzschale CW 50 gestrichen, andere Seite weiß geölt",
               [["039.03.001.01001", 1.0], ["034.02.001.01001", 1.0], ["034.02.014.03001", 1.0]], True),
             o("weiß geölt", "Holzoberfläche beidseitig weiß pigmentiert geölt", [["034.02.014.03001", 2.0]])]},
         {"name": "Anschlüsse", "optionen": [
             o("", "", [], True),
             o("luftdicht", "luftdichte Anschlüsse an Decke und Wände geklebt", [["016.03.010.01001", 0.8]], True)]},
     ], "tags": ["neubau"]},

    {"id": "341.07", "kg": "341", "name": "IW tragend Mauerwerk Bestand", "einheit": "m²",
     "lang": "Tragende Innenwand im Bestand aus kleinformatigem Mauerwerk (Ergänzung, Ausmauerung, Neubau im Umbau), "
             "mit beidseitiger Bekleidung in bestandsverträglicher Ausführung.",
     "bezug": "Wandfläche, Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             o("Mz 11,5", "Vollziegel Mz 12, d = 11,5 cm, Normalmörtel", [["012.05.001.01001", 1.0]], True),
             o("Mz 24", "Vollziegel Mz 12, d = 24 cm, Normalmörtel", [["012.05.001.02001", 1.0]], True),
             o("KS-V 11,5", "Kalksand-Vollstein KS 12, d = 11,5 cm", [["012.05.002.01001", 1.0]], True),
             o("KS-V 17,5", "Kalksand-Vollstein KS 20, d = 17,5 cm", [["012.05.002.02001", 1.0]]),
             o("KS-V 24", "Kalksand-Vollstein KS 20, d = 24 cm", [["012.05.002.03001", 1.0]]),
             o("Ausmauerung 11,5", "Mauerwerk ergänzen/ausmauern DF/NF, d = 11,5 cm", [["012.04.004.01001", 1.0]]),
             o("Ausmauerung 24", "Mauerwerk ergänzen/ausmauern DF/NF, d = 24 cm", [["012.04.004.02001", 1.0]])]},
         {"name": "Bekleidung", "optionen": [
             o("Kalkputz beids.", "beidseitig Kalkputz 15 mm, Kalkanstrich",
               [["023.02.001.05002", 2.0], ["034.02.007.01001", 2.0]], True),
             o("Gipsputz beids.", "beidseitig Gipsputz 10 mm, Dispersionsanstrich",
               [["023.02.001.01002", 2.0], ["034.02.001.01001", 2.0]], True),
             o("Lehmputz beids.", "beidseitig Lehmputz 2-lagig 20 mm, Lehmfarbe",
               [["023.02.001.06002", 2.0], ["034.02.007.03001", 2.0]]),
             o("", "ohne Bekleidung", [])]},
         {"name": "Vorarbeiten", "optionen": [
             o("", "", [], True),
             o("Putz abschlagen", "Altputz an angrenzenden Flächen abschlagen (Anarbeitung), beidseitig",
               [["023.01.005.01001", 0.5]], True)]},
     ], "tags": ["altbau"]},

    # ============================================================ KG 342 Nichttragende Innenwände
    {"id": "342.01", "kg": "342", "name": "Metallständerwand einfach beplankt", "einheit": "m²",
     "lang": "Nichttragende Montagewand nach DIN 18183 mit CW-Profilen, beidseitig einlagig beplankt, Hohlraum gedämmt, "
             "verspachtelt und beschichtet.",
     "bezug": "Wandfläche (Länge × lichte Raumhöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Ständerwerk", "optionen": [
             o("CW 50", "CW 50, 1 × 12,5 mm beidseitig, d = 75 mm", [["039.01.004.01001", 1.0]], True),
             o("CW 75", "CW 75, 1 × 12,5 mm beidseitig, d = 100 mm", [["039.01.004.02001", 1.0]], True),
             o("CW 100", "CW 100, 1 × 12,5 mm beidseitig, d = 125 mm", [["039.01.004.03001", 1.0]], True)]},
         {"name": "Platten", "optionen": [
             o("", "Gipsplatten GKB", [], True),
             o("H2", "imprägnierte Gipsplatten H2 (Feuchtraum)", [["039.01.009.01001", 2.0]], True),
             o("Hartgips", "Hartgipsplatten für erhöhte Beanspruchung", [["039.01.011.01001", 2.0]]),
             o("zementgebunden", "zementgebundene Bauplatten statt Gipsplatten", [["039.01.010.01001", 2.0]])]},
         {"name": "Oberfläche", "optionen": GK_OBERFL_2},
         {"name": "Zulagen", "optionen": GK_ZULAGE},
     ], "tags": ["neubau", "altbau"]},

    {"id": "342.02", "kg": "342", "name": "Metallständerwand doppelt beplankt", "einheit": "m²",
     "lang": "Nichttragende Montagewand nach DIN 18183 mit CW-Profilen, beidseitig zweilagig beplankt, Hohlraum gedämmt, "
             "verspachtelt und beschichtet.",
     "bezug": "Wandfläche (Länge × lichte Raumhöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Ständerwerk", "optionen": [
             o("CW 50 2×", "CW 50, 2 × 12,5 mm beidseitig, d = 100 mm", [["039.01.005.01001", 1.0]], True),
             o("CW 75 2×", "CW 75, 2 × 12,5 mm beidseitig, d = 125 mm", [["039.01.005.02001", 1.0]], True),
             o("CW 100 2×", "CW 100, 2 × 12,5 mm beidseitig, d = 150 mm", [["039.01.005.03001", 1.0]], True)]},
         {"name": "Platten", "optionen": [
             o("", "Gipsplatten GKB", [], True),
             o("H2", "imprägnierte Gipsplatten H2, alle Lagen", [["039.01.009.01001", 4.0]], True),
             o("Hartgips", "äußere Lage Hartgipsplatten", [["039.01.011.01001", 2.0]]),
             o("zementgebunden", "äußere Lage zementgebundene Bauplatten", [["039.01.010.01001", 2.0]])]},
         {"name": "Oberfläche", "optionen": GK_OBERFL_2},
         {"name": "Zulagen", "optionen": GK_ZULAGE},
     ], "tags": ["neubau", "altbau"]},

    {"id": "342.03", "kg": "342", "name": "Brandschutzwand Trockenbau", "einheit": "m²",
     "lang": "Nichttragende Montagewand mit Feuerwiderstand nach Prüfzeugnis, beidseitig zweilagig mit Feuerschutzplatten GKF, "
             "Mineralwolle-Dämmung, Anschlüsse nach Prüfzeugnis.",
     "bezug": "Wandfläche (Länge × lichte Raumhöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Wand", "optionen": [
             o("EI 30 CW 75", "EI 30, CW 75, 2 × 12,5 mm GKF", [["039.01.006.01001", 1.0]], True),
             o("EI 90 CW 75", "EI 90, CW 75, 2 × 12,5 mm GKF", [["039.01.006.02001", 1.0]], True),
             o("EI 90 CW 100", "EI 90, CW 100, 2 × 15 mm GKF", [["039.01.006.03001", 1.0]], True)]},
         {"name": "Platten", "optionen": [
             o("", "Feuerschutzplatten GKF", [], True),
             o("GKFI", "imprägnierte Feuerschutzplatten (Feuchtraum)", [["039.01.009.01001", 4.0]])]},
         {"name": "Oberfläche", "optionen": GK_OBERFL_2},
         {"name": "Zulagen", "optionen": [
             o("", "", [], True),
             o("gleit. Anschluss", "gleitender Deckenanschluss", [["039.01.013.01001", 0.36]], True),
             o("Revision EI 30", "Revisionsklappe EI 30, 1 je 20 m²", [["039.02.004.03001", 0.05]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "342.04", "kg": "342", "name": "Schallschutzwand Doppelständer", "einheit": "m²",
     "lang": "Nichttragende Montagewand mit getrenntem Doppelständerwerk, beidseitig zweilagig beplankt, "
             "für erhöhten Schallschutz (z. B. Wohnungs- und Hotelzimmertrennwände).",
     "bezug": "Wandfläche (Länge × lichte Raumhöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Wand", "optionen": [
             o("2×CW 50", "Doppelständer 2 × CW 50, 2 × 12,5 mm, Rw ≥ 62 dB", [["039.01.007.01001", 1.0]], True),
             o("2×CW 75", "Doppelständer 2 × CW 75, 2 × 12,5 mm, Rw ≥ 67 dB", [["039.01.007.02001", 1.0]], True)]},
         {"name": "Platten", "optionen": [
             o("", "Gipsplatten GKB", [], True),
             o("Hartgips", "äußere Lage Hartgipsplatten", [["039.01.011.01001", 2.0]], True),
             o("H2", "imprägnierte Gipsplatten H2, alle Lagen", [["039.01.009.01001", 4.0]])]},
         {"name": "Oberfläche", "optionen": GK_OBERFL_2},
         {"name": "Zulagen", "optionen": GK_ZULAGE},
     ], "tags": ["neubau", "altbau"]},

    {"id": "342.05", "kg": "342", "name": "Installationswand Trockenbau", "einheit": "m²",
     "lang": "Installationswand aus doppeltem CW-50-Ständerwerk mit Laschenverbindung, beidseitig zweilagig beplankt "
             "(im Feuchtraum H2), mit Traversen für Sanitärobjekte und Oberfläche.",
     "bezug": "Wandfläche (Länge × lichte Raumhöhe)",
     "schichten": [
         {"name": "Wand", "optionen": [
             o("Inst.-Wand 220", "Doppelständer CW 50, Hohlraum bis 220 mm", [["039.01.008.01001", 1.0]], True),
             o("Inst.-Wand 300", "Doppelständer CW 50, Hohlraum bis 300 mm", [["039.01.008.02001", 1.0]], True)]},
         {"name": "Platten", "optionen": [
             o("", "Gipsplatten GKB bzw. H2 nach Raum", [], True),
             o("zementgebunden", "äußere Lage zementgebundene Bauplatten", [["039.01.010.01001", 2.0]])]},
         {"name": "Traversen", "optionen": [
             o("Traversen", "Sanitärtraversen für Waschtisch/WC, 1 je 2 m²", [["039.02.003.01001", 0.5]], True),
             o("Traversen + Griffe", "Sanitärtraversen und Traversen für Stützgriffe (barrierefrei)",
               [["039.02.003.01001", 0.5], ["039.02.003.03001", 0.3]], True),
             o("", "ohne Traversen", [])]},
         {"name": "Oberfläche", "optionen": [
             o("Fliesen einseitig", "Seite 1 Abdichtung + Fliesen 30×60, Seite 2 Dispersionsanstrich",
               [["024.01.002.01001", 1.0], ["024.02.003.02001", 1.0], ["034.02.001.01001", 1.0]], True),
             o("Fliesen beids.", "beidseitig Verbundabdichtung + Wandfliesen 30×60 cm",
               [["024.01.002.01001", 2.0], ["024.02.003.02001", 2.0]], True),
             o("Anstrich", "Dispersionsanstrich beidseitig", [["034.02.001.01001", 2.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "342.06", "kg": "342", "name": "Feuchtraumwand zementgebunden", "einheit": "m²",
     "lang": "Montagewand für hohe Feuchtebeanspruchung mit zementgebundenen Bauplatten, Verbundabdichtung "
             "und Fliesen beidseitig (Duschanlagen, Umkleiden, Schwimmbad).",
     "bezug": "Wandfläche (Länge × lichte Raumhöhe), Öffnungen über 2,5 m² abgezogen",
     "fest": [["024.01.002.01001", 2.0], ["024.01.003.01001", 0.5]],
     "schichten": [
         {"name": "Wand", "optionen": [
             o("CW 50 zem.", "CW 50, zementgebundene Bauplatten, W2-I", [["039.01.018.01001", 1.0]], True),
             o("CW 75 zem.", "CW 75, zementgebundene Bauplatten, W2-I", [["039.01.018.02001", 1.0]], True),
             o("CW 100 zem.", "CW 100, zementgebundene Bauplatten, W2-I", [["039.01.018.03001", 1.0]], True)]},
         {"name": "Fliesen", "optionen": [
             o("Fliesen 20×25", "beidseitig Wandfliesen 20 × 25 cm", [["024.02.003.01001", 2.0]], True),
             o("Fliesen 30×60", "beidseitig Wandfliesen 30 × 60 cm", [["024.02.003.02001", 2.0]], True),
             o("Fliesen 30×60 geh.", "beidseitig Wandfliesen 30 × 60 cm, bis 50 €/m²", [["024.02.003.03001", 2.0]]),
             o("Mosaik 5×5", "beidseitig Mosaik 5 × 5 cm", [["024.02.004.02001", 2.0]]),
             o("Fliesen 60×120", "beidseitig Wandfliesen 60 × 120 cm", [["024.02.003.04001", 2.0]])]},
         {"name": "Abdichtung", "optionen": [
             o("", "Verbundabdichtung W2-I", [], True),
             o("W3-I", "Zulage Abdichtung W3-I, zusätzliche Lage beidseitig", [["024.01.010.01001", 2.0]], True)]},
     ], "tags": ["neubau"]},

    {"id": "342.07", "kg": "342", "name": "Montagewand Gipsfaser", "einheit": "m²",
     "lang": "Nichttragende Montagewand CW 75 mit Gipsfaserplatten (robust, hohe Lasten), Hohlraum gedämmt, "
             "verspachtelt und beschichtet.",
     "bezug": "Wandfläche (Länge × lichte Raumhöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Wand", "optionen": [
             o("GF 1×12,5", "CW 75, Gipsfaser 1 × 12,5 mm beidseitig", [["039.01.001.01001", 1.0]], True),
             o("GF 2×12,5", "CW 75, Gipsfaser 2 × 12,5 mm beidseitig", [["039.01.001.02001", 1.0]], True)]},
         {"name": "Oberfläche", "optionen": GK_OBERFL_2},
         {"name": "Zulagen", "optionen": GK_ZULAGE},
     ], "tags": ["neubau", "altbau"]},

    {"id": "342.08", "kg": "342", "name": "Holzständerwand nichttragend", "einheit": "m²",
     "lang": "Nichttragende Innenwand aus Holzständern mit Mineralwolle, beidseitig 2 × 12,5 mm Gipsplatten, "
             "z. B. im Holzbau oder Dachausbau.",
     "bezug": "Wandfläche (Länge × lichte Raumhöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Wand", "optionen": [
             o("Holz 60/60", "Holzständer 60/60, 2 × 12,5 mm GK beidseitig", [["039.01.002.01001", 1.0]], True),
             o("Holz 60/100", "Holzständer 60/100, 2 × 12,5 mm GK beidseitig", [["039.01.002.02001", 1.0]], True)]},
         {"name": "Oberfläche", "optionen": GK_OBERFL_2},
         {"name": "Zulagen", "optionen": GK_ZULAGE},
     ], "tags": ["neubau", "altbau"]},

    {"id": "342.09", "kg": "342", "name": "Nichttragende IW Mauerwerk", "einheit": "m²",
     "lang": "Nichttragende Innenwand aus Bauplatten (Porenbeton, Kalksandstein), Lehm- oder Glasbausteinen, "
             "mit gleitendem Deckenanschluss und beidseitiger Bekleidung.",
     "bezug": "Wandfläche (Länge × lichte Raumhöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Wand", "optionen": [
             o("PP-Platte 10", "Porenbeton-Planbauplatten d = 10 cm",
               [["012.03.004.02001", 1.0], ["012.01.001.01001", 0.36], ["012.03.006.01001", 0.36]], True),
             o("PP-Platte 11,5", "Porenbeton-Planbauplatten d = 11,5 cm",
               [["012.03.004.03001", 1.0], ["012.01.001.01001", 0.36], ["012.03.006.01001", 0.36]], True),
             o("KS-Platte 10", "KS-Bauplatten d = 10 cm",
               [["012.03.005.02001", 1.0], ["012.01.001.01001", 0.36], ["012.03.006.01001", 0.36]], True),
             o("KS-Platte 11,5", "KS-Bauplatten d = 11,5 cm",
               [["012.03.005.03001", 1.0], ["012.01.001.01001", 0.36], ["012.03.006.01001", 0.36]], True),
             o("PP-Platte 7,5", "Porenbeton-Planbauplatten d = 7,5 cm",
               [["012.03.004.01001", 1.0], ["012.03.006.01001", 0.36]]),
             o("KS-Platte 7", "KS-Bauplatten d = 7 cm", [["012.03.005.01001", 1.0], ["012.03.006.01001", 0.36]]),
             o("Lehmstein 11,5", "Lehmsteinmauerwerk d = 11,5 cm, Lehmmörtel",
               [["012.05.007.01001", 1.0], ["012.03.006.01001", 0.36]]),
             o("Glasbaustein", "Glasbausteinwand 19 × 19 cm, d = 8 cm", [["012.05.005.01001", 1.0]])]},
         {"name": "Bekleidung", "optionen": BEKL_MW_2},
         {"name": "Zulagen", "optionen": [
             o("", "", [], True),
             o("Schlitze", "Installationsschlitze 3×3 cm herstellen und beiputzen, 0,5 m je m² Wand",
               [["012.04.006.01001", 0.5], ["023.02.005.01001", 0.5]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "342.10", "kg": "342", "name": "Gips-Wandbauplatten", "einheit": "m²",
     "lang": "Nichttragende Innenwand aus massiven Gips-Wandbauplatten nach DIN EN 12859, geklebt, Fugen gespachtelt, "
             "mit Oberflächenbeschichtung.",
     "bezug": "Wandfläche (Länge × lichte Raumhöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Wand", "optionen": [
             o("GWP 60", "Gips-Wandbauplatte d = 60 mm", [["039.01.015.01001", 1.0]], True),
             o("GWP 80", "Gips-Wandbauplatte d = 80 mm", [["039.01.015.02001", 1.0]], True),
             o("GWP 100", "Gips-Wandbauplatte d = 100 mm", [["039.01.015.03001", 1.0]], True),
             o("GWP 80 hydro", "Gips-Wandbauplatte d = 80 mm, hydrophobiert", [["039.01.015.04001", 1.0]]),
             o("GWP 100 schwer", "Gips-Wandbauplatte d = 100 mm, hohe Rohdichte", [["039.01.015.05001", 1.0]])]},
         {"name": "Oberfläche", "optionen": [
             o("Anstrich", "Dispersionsanstrich beidseitig", [["034.02.001.01001", 2.0]], True),
             o("Q3, Anstrich", "Spachtelung Q3, Dispersionsanstrich beidseitig",
               [["034.02.013.01001", 2.0], ["034.02.001.01001", 2.0]], True),
             o("Fliesen einseitig", "Seite 1 Abdichtung + Fliesen 30×60, Seite 2 Dispersionsanstrich",
               [["024.01.002.01001", 1.0], ["024.02.003.02001", 1.0], ["034.02.001.01001", 1.0]], True),
             o("", "ohne Anstrich", [])]},
         {"name": "Zulagen", "optionen": [
             o("", "", [], True),
             o("gleit. Anschluss", "gleitender Deckenanschluss", [["039.01.013.01001", 0.36]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "342.11", "kg": "342", "name": "Sonderwand Strahlen-/Einbruchschutz", "einheit": "m²",
     "lang": "Montagewand mit besonderer Anforderung: Strahlenschutz mit Bleieinlage (Röntgen, Praxis) "
             "oder einbruchhemmend RC 2/RC 3, beidseitig beschichtet.",
     "bezug": "Wandfläche (Länge × lichte Raumhöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Wand", "optionen": [
             o("Blei 1,0 CW 75", "Strahlenschutz-Bleieinlage 1,0 mm, CW 75", [["039.01.016.01001", 1.0]], True),
             o("Blei 2,0 CW 75", "Strahlenschutz-Bleieinlage 2,0 mm, CW 75", [["039.01.016.02001", 1.0]], True),
             o("Blei 2,0 CW 100", "Strahlenschutz-Bleieinlage 2,0 mm, CW 100", [["039.01.016.03001", 1.0]], True),
             o("RC 2 CW 75", "einbruchhemmende Montagewand RC 2, CW 75", [["039.01.017.01001", 1.0]], True),
             o("RC 3 CW 75", "einbruchhemmende Montagewand RC 3, CW 75", [["039.01.017.02001", 1.0]], True)]},
         {"name": "Oberfläche", "optionen": GK_OBERFL_2},
     ], "tags": ["neubau", "altbau"]},

    {"id": "342.12", "kg": "342", "name": "Schachtwand / Raumabtrennung", "einheit": "m²",
     "lang": "Einseitig beplankte Montagewand, Installationsschacht in Trockenbau oder gemauerte Schachtwand, "
             "mit Revisionsöffnungen und Oberfläche raumseitig.",
     "bezug": "Wandfläche bzw. Abwicklung der Schachtbekleidung (Ansichtsfläche)",
     "schichten": [
         {"name": "Wand", "optionen": [
             o("CW 50 einseitig", "Montagewand CW 50, einseitig beplankt", [["039.01.003.01001", 1.0]], True),
             o("CW 100 einseitig", "Montagewand CW 100, einseitig beplankt", [["039.01.003.02001", 1.0]], True),
             o("Schacht o. Anf.", "Installationsschacht ohne Brandschutzanforderung", [["039.03.003.01001", 1.0]], True),
             o("Schacht EI 90", "Installationsschacht EI 90 von beiden Seiten", [["039.03.003.02001", 1.0]], True),
             o("Schacht MW 11,5", "Schachtwand gemauert d = 11,5 cm, mit Revisionsöffnung", [["012.05.010.01001", 1.0]]),
             o("Schacht MW 17,5", "Schachtwand gemauert d = 17,5 cm, mit Revisionsöffnung", [["012.05.010.02001", 1.0]])]},
         {"name": "Revision", "optionen": [
             o("", "", [], True),
             o("Revisionsklappe", "Revisionsklappe 600 × 600 mm, 1 je 10 m²", [["039.02.004.02001", 0.1]], True),
             o("Revision EI 90", "Revisionsklappe EI 90 600 × 600 mm, 1 je 10 m²", [["039.02.004.04001", 0.1]])]},
         {"name": "Oberfläche", "optionen": GK_OBERFL_1},
     ], "tags": ["neubau", "altbau"]},

    {"id": "342.13", "kg": "342", "name": "Montagewand im Bestand", "einheit": "m²",
     "lang": "Nichttragende Montagewand im Umbau unter Bestandsbedingungen (Anschluss an unebene Bauteile, Kleinflächen), "
             "wahlweise mit Rückbau der vorhandenen Trennwand.",
     "bezug": "Wandfläche (Länge × lichte Raumhöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Wand", "optionen": [
             o("CW 50 1× Bestand", "CW 50, 1 × 12,5 mm beidseitig, Bestand", [["039.01.004.01002", 1.0]], True),
             o("CW 75 1× Bestand", "CW 75, 1 × 12,5 mm beidseitig, Bestand", [["039.01.004.02002", 1.0]], True),
             o("CW 50 2× Bestand", "CW 50, 2 × 12,5 mm beidseitig, Bestand", [["039.01.005.01002", 1.0]], True),
             o("CW 75 2× Bestand", "CW 75, 2 × 12,5 mm beidseitig, Bestand", [["039.01.005.02002", 1.0]], True),
             o("GWP 80 Bestand", "Gips-Wandbauplatte d = 80 mm, Bestand", [["039.01.015.02002", 1.0]])]},
         {"name": "Rückbau", "optionen": [
             o("", "", [], True),
             o("Rückbau TB-Wand", "vorhandene Trockenbauwand demontieren und entsorgen", [["084.03.005.01001", 1.0]], True),
             o("Abbruch MW 11,5", "vorhandene Wand Ziegel/KS d ≤ 11,5 cm abbrechen", [["084.02.001.01001", 1.0]]),
             o("Abbruch Gipsdiele", "vorhandene Wand Bims/Gipsdielen d ≤ 11,5 cm abbrechen", [["084.02.001.04001", 1.0]])]},
         {"name": "Oberfläche", "optionen": GK_OBERFL_2},
     ], "tags": ["altbau"]},

    # ============================================================ KG 343 Innenstützen
    {"id": "343.01", "kg": "343", "name": "Innenstütze Stahlbeton Ortbeton", "einheit": "St",
     "lang": "Innenstütze aus Ortbeton als Komplettleistung mit Schalung und Bewehrung, Oberfläche nach Wahl.",
     "bezug": "Stück je Stütze und Geschoss",
     "schichten": [
         {"name": "Stütze", "optionen": [
             o("25×25 h 3,0", "Stahlbetonstütze 25 × 25 cm, Höhe bis 3,0 m", [["013.09.004.01001", 1.0]], True),
             o("30×30 h 3,0", "Stahlbetonstütze 30 × 30 cm, Höhe bis 3,0 m", [["013.09.004.02001", 1.0]], True),
             o("40×40 h 3,0", "Stahlbetonstütze 40 × 40 cm, Höhe bis 3,0 m", [["013.09.004.03001", 1.0]], True),
             o("Ø 30 h 3,0", "Stahlbetonrundstütze Ø 30 cm, Höhe bis 3,0 m", [["013.09.004.06001", 1.0]], True),
             o("30×30 h 4,5", "Stahlbetonstütze 30 × 30 cm, Höhe bis 4,5 m", [["013.09.004.04001", 1.0]]),
             o("40×40 h 4,5", "Stahlbetonstütze 40 × 40 cm, Höhe bis 4,5 m", [["013.09.004.05001", 1.0]])]},
         {"name": "Oberfläche", "optionen": [
             o("", "Sichtbeton roh", [], True),
             o("Anstrich", "Betonanstrich zweimal (ca. 3,6 m²)", [["034.02.004.01001", 3.6]], True),
             o("Spachtel/Anstrich", "Spachtelung Q3 und Anstrich (ca. 3,6 m²)",
               [["034.01.003.01001", 3.6], ["034.02.004.01001", 3.6]]),
             o("Warnmarkierung", "Anstrich und Warnmarkierung gelb-schwarz (Tiefgarage)",
               [["034.02.004.01001", 3.6], ["034.04.015.02001", 1.2]])]},
         {"name": "Kantenschutz", "optionen": [
             o("", "", [], True),
             o("Kantenschutz", "Edelstahl-Kantenschutzwinkel an 4 Kanten, je 1,0 m hoch", [["029.04.008.01001", 4.0]], True)]},
     ], "tags": ["neubau"]},

    {"id": "343.02", "kg": "343", "name": "Innenstütze Stahlbeton Fertigteil", "einheit": "St",
     "lang": "Stahlbeton-Fertigteilstütze liefern und montieren, untergossen mit schwindarmem Vergussmörtel, "
             "mit Konsolen bzw. Einbauteilen und Oberfläche.",
     "bezug": "Stück je Stütze",
     "fest": [["013.08.007.01001", 15.0]],
     "schichten": [
         {"name": "Stütze", "optionen": [
             o("FT 30×30 L4", "Fertigteilstütze 30 × 30 cm, Länge bis 4 m", [["013.09.005.01001", 1.0]], True),
             o("FT 40×40 L6", "Fertigteilstütze 40 × 40 cm, Länge bis 6 m", [["013.09.005.02001", 1.0]], True),
             o("FT 50×50 L8", "Fertigteilstütze 50 × 50 cm, Länge bis 8 m", [["013.09.005.03001", 1.0]], True)]},
         {"name": "Einbauteile", "optionen": [
             o("", "", [], True),
             o("Einbauteile", "2 Einbauteile/Ankerplatten bis 20 kg", [["013.07.005.02001", 2.0]], True)]},
         {"name": "Oberfläche", "optionen": [
             o("", "Sichtbeton roh", [], True),
             o("Betonlasur", "Betonlasur (ca. 4 m²)", [["034.04.006.01001", 4.0]], True),
             o("Anstrich", "Betonanstrich zweimal (ca. 4 m²)", [["034.02.004.01001", 4.0]])]},
     ], "tags": ["neubau"]},

    {"id": "343.03", "kg": "343", "name": "Innenstütze Stahl", "einheit": "St",
     "lang": "Stahlstütze aus Rund- oder Quadratrohr bis 3,0 m mit Fußplatte, Verankerung und Untergießen, "
             "Korrosionsschutz und Brandschutz nach Anforderung.",
     "bezug": "Stück je Stütze und Geschoss",
     "fest": [["017.01.005.02001", 4.0], ["017.04.005.01001", 1.0]],
     "schichten": [
         {"name": "Stütze", "optionen": [
             o("Ø 114", "Rundrohr Ø 114,3 × 6,3 mm", [["017.01.003.01001", 1.0]], True),
             o("□ 120", "Quadratrohr 120 × 120 × 8 mm", [["017.01.003.02001", 1.0]], True),
             o("Ø 168", "Rundrohr Ø 168,3 × 8 mm", [["017.01.003.03001", 1.0]], True)]},
         {"name": "Korrosionsschutz", "optionen": [
             o("KS C2", "Beschichtungssystem C2 (ca. 1,3 m²)", [["017.02.002.01001", 1.3]], True),
             o("feuerverzinkt", "Feuerverzinkung (ca. 60 kg)", [["017.02.001.01001", 60.0]], True),
             o("Duplex", "Feuerverzinkung und Duplexbeschichtung",
               [["017.02.001.01001", 60.0], ["017.02.003.01001", 1.3]])]},
         {"name": "Brandschutz", "optionen": [
             o("", "ohne Anforderung", [], True),
             o("R 30 Beschichtung", "dämmschichtbildende Beschichtung R 30", [["017.02.004.01001", 1.3]], True),
             o("F 30 Bekleidung", "Plattenbekleidung F 30 vierseitig (ca. 2,4 m²)", [["017.02.005.01001", 2.4]], True),
             o("R 90 Beschichtung", "dämmschichtbildende Beschichtung R 90", [["017.02.004.03001", 1.3]]),
             o("F 90 Bekleidung", "Plattenbekleidung F 90 vierseitig (ca. 2,4 m²)", [["017.02.005.02001", 2.4]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "343.04", "kg": "343", "name": "Innenstütze Holz", "einheit": "St",
     "lang": "Holzstütze aus KVH oder BSH, Höhe ca. 3,0 m, mit Stützenfuß aus Stahl, Oberflächenbehandlung "
             "und ggf. Brandschutzbekleidung.",
     "bezug": "Stück je Stütze und Geschoss (Höhe bis 3,0 m)",
     "schichten": [
         {"name": "Stütze", "optionen": [
             o("KVH 12/12", "KVH C24 120 × 120 mm, 3,0 m", [["016.01.010.01001", 3.0]], True),
             o("KVH 16/16", "KVH C24 160 × 160 mm, 3,0 m", [["016.01.010.02001", 3.0]], True),
             o("BSH 16/16", "BSH GL24h 160 × 160 mm, 3,0 m", [["016.01.010.03001", 3.0]], True),
             o("BSH 20/20", "BSH GL24h 200 × 200 mm, 3,0 m", [["016.01.010.04001", 3.0]])]},
         {"name": "Oberfläche", "optionen": [
             o("", "unbehandelt", [], True),
             o("lasiert", "farblos lasiert (ca. 1,8 m²)", [["034.02.014.01001", 1.8]], True),
             o("weiß geölt", "weiß pigmentiert geölt (ca. 1,8 m²)", [["034.02.014.03001", 1.8]]),
             o("deckend", "deckend lackiert (ca. 1,8 m²)", [["034.02.014.02001", 1.8]])]},
         {"name": "Fußpunkt", "optionen": [
             o("Stützenfuß", "Stützenfuß Stahl verzinkt mit Dübeln", [["016.01.005.01001", 6.0], ["017.01.005.01001", 2.0]], True),
             o("Ankerplatte", "Ankerplatte nachträglich mit Verbundankern, Holzverbinder",
               [["017.04.004.01001", 1.0], ["016.01.005.01001", 3.0]], True)]},
         {"name": "Brandschutz", "optionen": [
             o("", "", [], True),
             o("GKF-Bekleidung", "Brandschutzbekleidung Feuerschutzplatten (ca. 2,2 m²)", [["039.03.004.01001", 2.2]])]},
     ], "tags": ["neubau", "altbau"]},

    # ============================================================ KG 344 Innenwandöffnungen
    {"id": "344.01", "kg": "344", "name": "Innentür Röhrenspan Wohnbau", "einheit": "St",
     "lang": "Innentürelement komplett mit Holz-Umfassungszarge, Röhrenspan-Türblatt, Dichtung, Bändern und "
             "Buntbartschloss, mit Drückergarnitur und Zubehör.",
     "bezug": "Stück je Türelement",
     "schichten": [
         {"name": "Türelement", "optionen": [
             o("CPL 885", "CPL weiß, 885 × 2010 mm, Zarge bis 12,5 cm", [["027.01.001.01097", 1.0]], True),
             o("Weißlack 885", "Weißlack, 885 × 2010 mm, Zarge bis 12,5 cm", [["027.01.001.02097", 1.0]], True),
             o("Eiche 885", "Furnier Eiche, 885 × 2010 mm, Zarge bis 12,5 cm", [["027.01.001.03097", 1.0]], True),
             o("CPL 760", "CPL weiß, 760 × 2010 mm, Zarge bis 12,5 cm", [["027.01.001.01001", 1.0]]),
             o("CPL 885 WD 17,5", "CPL weiß, 885 × 2010 mm, Zarge bis 17,5 cm", [["027.01.001.01121", 1.0]]),
             o("Weißlack WD 17,5", "Weißlack, 885 × 2010 mm, Zarge bis 17,5 cm", [["027.01.001.02121", 1.0]]),
             o("CPL 1010 bf", "CPL weiß, 1010 × 2135 mm (barrierefrei), Zarge bis 17,5 cm", [["027.01.001.01409", 1.0]]),
             o("Weißlack 1010 bf", "Weißlack, 1010 × 2135 mm (barrierefrei), Zarge bis 17,5 cm", [["027.01.001.02409", 1.0]])]},
         {"name": "Drücker", "optionen": [
             o("Drücker Alu", "Drückergarnitur Aluminium F1 mit Rosetten", [["029.01.001.01001", 1.0]], True),
             o("Drücker Edelstahl", "Drückergarnitur Edelstahl matt mit Rosetten", [["029.01.001.02001", 1.0]], True),
             o("", "Drückergarnitur bauseits", [])]},
         {"name": "Zubehör", "optionen": [
             o("", "", [], True),
             o("Türstopper", "Türstopper Boden", [["029.03.001.01001", 1.0]], True),
             o("Stopper + Lüftung", "Türstopper und Lüftungsgitter im Türblatt",
               [["029.03.001.01001", 1.0], ["027.01.014.01001", 1.0]])]},
     ], "tags": ["neubau"]},

    {"id": "344.02", "kg": "344", "name": "Innentür Bad/WC", "einheit": "St",
     "lang": "Innentürelement für Bad und WC mit WC-Schloss, Umfassungszarge, Dichtung und Bändern, "
             "wahlweise in Klimaklasse III für Feuchträume, mit WC-Garnitur.",
     "bezug": "Stück je Türelement",
     "schichten": [
         {"name": "Türelement", "optionen": [
             o("CPL WC 885", "Röhrenspan CPL weiß, 885 × 2010 mm, WC-Schloss", [["027.01.001.01101", 1.0]], True),
             o("Weißlack WC 885", "Röhrenspan Weißlack, 885 × 2010 mm, WC-Schloss", [["027.01.001.02101", 1.0]], True),
             o("Feuchtraum WC", "Feuchtraumtür Klimaklasse III, CPL, 760 × 2010 mm, WC-Schloss", [["027.01.003.01005", 1.0]], True),
             o("Eiche WC 885", "Röhrenspan Furnier Eiche, 885 × 2010 mm, WC-Schloss", [["027.01.001.03101", 1.0]]),
             o("Feuchtraum WC 24", "Feuchtraumtür Klimaklasse III, CPL, Zarge bis 24 cm, WC-Schloss", [["027.01.003.01011", 1.0]])]},
         {"name": "Drücker", "optionen": [
             o("WC-Garnitur", "Drücker Edelstahl, Kurzschild WC mit Notöffnung", [["029.01.001.03001", 1.0]], True),
             o("Rosette Alu", "Drückergarnitur Aluminium mit WC-Rosetten", [["029.01.001.01001", 1.0]], True)]},
         {"name": "Zubehör", "optionen": [
             o("", "", [], True),
             o("Lüftungsgitter", "Lüftungsgitter im Türblatt", [["027.01.014.01001", 1.0]], True),
             o("Stopper + Lüftung", "Türstopper und Lüftungsgitter", [["029.03.001.02001", 1.0], ["027.01.014.01001", 1.0]])]},
     ], "tags": ["neubau"]},

    {"id": "344.03", "kg": "344", "name": "Innentür Vollspan Objekt", "einheit": "St",
     "lang": "Objekt-Innentürelement mit Vollspan-Türblatt (Beanspruchungsgruppe M), Umfassungszarge, PZ-Schloss, "
             "Edelstahl-Drückergarnitur, Zylinder und Türstopper, wahlweise mit Türschließer.",
     "bezug": "Stück je Türelement",
     "fest": [["029.01.001.02001", 1.0], ["029.03.001.01001", 1.0]],
     "schichten": [
         {"name": "Türelement", "optionen": [
             o("HPL 885", "Vollspan HPL, 885 × 2135 mm, Zarge bis 17,5 cm, PZ", [["027.01.002.01003", 1.0]], True),
             o("HPL 1010", "Vollspan HPL, 1010 × 2135 mm, Zarge bis 17,5 cm, PZ", [["027.01.002.01039", 1.0]], True),
             o("Weißlack 885", "Vollspan Weißlack, 885 × 2135 mm, Zarge bis 17,5 cm, PZ", [["027.01.002.02003", 1.0]], True),
             o("Weißlack 1010", "Vollspan Weißlack, 1010 × 2135 mm, Zarge bis 17,5 cm, PZ", [["027.01.002.02039", 1.0]], True),
             o("HPL 1010 WD 24", "Vollspan HPL, 1010 × 2135 mm, Zarge bis 24 cm, PZ", [["027.01.002.01051", 1.0]]),
             o("HPL 1135", "Vollspan HPL, 1135 × 2135 mm, Zarge bis 17,5 cm, PZ", [["027.01.002.01075", 1.0]])]},
         {"name": "Zylinder", "optionen": ZYLINDER},
         {"name": "Schließer", "optionen": [
             o("", "", [], True),
             o("Türschließer", "Obentürschließer mit Gleitschiene", [["029.02.001.01001", 1.0]], True),
             o("Freilaufschließer", "Freilauftürschließer barrierefrei mit Rauchmelder", [["029.02.002.01001", 1.0]])]},
     ], "tags": ["neubau"]},

    {"id": "344.04", "kg": "344", "name": "Schallschutztür", "einheit": "St",
     "lang": "Schallschutz-Türelement mit geprüftem Schalldämmmaß, Zarge mit Dichtung und absenkbarer Bodendichtung, "
             "Edelstahl-Drückergarnitur, Zylinder, wahlweise Türschließer.",
     "bezug": "Stück je Türelement",
     "fest": [["029.01.001.02001", 1.0]],
     "schichten": [
         {"name": "Türelement", "optionen": [
             o("Rw 32 885", "Schallschutztür Rw 32 dB, 885 × 2135 mm", [["027.01.004.01001", 1.0]], True),
             o("Rw 32 1010", "Schallschutztür Rw 32 dB, 1010 × 2135 mm", [["027.01.004.01005", 1.0]], True),
             o("Rw 37 885", "Schallschutztür Rw 37 dB, 885 × 2135 mm", [["027.01.004.02001", 1.0]], True),
             o("Rw 37 1010", "Schallschutztür Rw 37 dB, 1010 × 2135 mm", [["027.01.004.02005", 1.0]], True),
             o("Rw 42 885", "Schallschutztür Rw 42 dB, 885 × 2135 mm", [["027.01.004.03001", 1.0]]),
             o("Rw 32 885 LA", "Schallschutztür Rw 32 dB, 885 × 2135 mm, mit Lichtausschnitt", [["027.01.004.01003", 1.0]])]},
         {"name": "Zylinder", "optionen": ZYLINDER},
         {"name": "Schließer", "optionen": [
             o("", "", [], True),
             o("Türschließer", "Obentürschließer mit Gleitschiene", [["029.02.001.01001", 1.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "344.05", "kg": "344", "name": "Wohnungseingangstür", "einheit": "St",
     "lang": "Geprüftes Wohnungseingangstürelement Klimaklasse III, einbruchhemmend, Schallschutz Rw,P ≥ 37 dB, "
             "mit Mehrfachverriegelung, Sicherheitsbeschlag, Spion und Bodendichtung, Zylinder und Zubehör.",
     "bezug": "Stück je Türelement",
     "schichten": [
         {"name": "Türelement", "optionen": [
             o("WE-Tür RC 2", "Wohnungseingangstür 1010 × 2135 mm, RC 2", [["027.01.005.01001", 1.0]], True),
             o("WE-Tür RC 3", "Wohnungseingangstür 1010 × 2135 mm, RC 3", [["027.01.005.01003", 1.0]], True)]},
         {"name": "Zylinder", "optionen": [
             o("Sicherheitszyl.", "Sicherheitszylinder in Schließanlage", [["029.01.002.03001", 1.0]], True),
             o("Schließanlage", "Profilzylinder in Schließanlage", [["029.01.002.02001", 1.0]], True),
             o("E-Zylinder", "elektronischer Profilzylinder (Transponder)", [["029.01.002.04001", 1.0]])]},
         {"name": "Zubehör", "optionen": [
             o("", "", [], True),
             o("Schild + Stopper", "Türschild Edelstahl und Türstopper", [["029.03.002.01001", 1.0], ["029.03.001.01001", 1.0]], True),
             o("Digitalspion", "digitaler Türspion mit Display", [["029.04.003.02001", 1.0]])]},
         {"name": "Schließer", "optionen": [
             o("", "", [], True),
             o("Türschließer", "Obentürschließer mit Gleitschiene", [["029.02.001.01001", 1.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "344.06", "kg": "344", "name": "Feuer-/Rauchschutztür Holz", "einheit": "St",
     "lang": "Feuerhemmende bzw. rauchdichte Holztür mit zugelassener Zarge, Obentürschließer, Brandschutzbeschlag "
             "und Kennzeichnung, mit Zylinder und wahlweise Feststellanlage.",
     "bezug": "Stück je Türelement",
     "schichten": [
         {"name": "Türelement", "optionen": [
             o("T30 Holz 1-flg.", "EI2 30-C5, 1-flg. 1010 × 2135 mm", [["027.01.006.01001", 1.0]], True),
             o("T30 Holz Glas", "EI2 30-C5, 1-flg. 1010 × 2135 mm, Brandschutzglas", [["027.01.006.01003", 1.0]], True),
             o("T30 Holz 2-flg.", "EI2 30-C5, 2-flg. 2010 × 2135 mm", [["027.01.006.02001", 1.0]], True),
             o("RS Holz", "Rauchschutztür S200, 1010 × 2135 mm", [["027.01.007.01001", 1.0]], True),
             o("T30 2-flg. Glas", "EI2 30-C5, 2-flg. 2010 × 2135 mm, Brandschutzglas", [["027.01.006.02003", 1.0]]),
             o("RS Holz Glas", "Rauchschutztür S200, 1010 × 2135 mm, Brandschutzglas", [["027.01.007.01003", 1.0]])]},
         {"name": "Zylinder", "optionen": ZYLINDER},
         {"name": "Feststellung", "optionen": [
             o("", "", [], True),
             o("Feststellanlage", "Feststellanlage mit Rauchmelder und Abnahme", [["031.01.007.01001", 1.0]], True),
             o("Freilauf", "Freilauftürschließer mit Rauchmelder", [["029.02.002.01001", 1.0]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "344.07", "kg": "344", "name": "Feuer-/Rauchschutztür Stahl", "einheit": "St",
     "lang": "Stahl-Feuerschutz- bzw. Rauchschutztür mit Zulassung, Zarge für Mauerwerk/Beton, Obentürschließer, "
             "Feuerschutz-Drückergarnitur, pulverbeschichtet, mit Zylinder und Zubehör.",
     "bezug": "Stück je Türelement",
     "schichten": [
         {"name": "Türelement", "optionen": [
             o("T30 1-flg.", "EI2 30, 1-flg. 1000 × 2125 mm, Eckzarge", [["031.01.004.01001", 1.0]], True),
             o("T30 2-flg.", "EI2 30, 2-flg. 2000 × 2125 mm, Eckzarge", [["031.01.004.02001", 1.0]], True),
             o("T90 1-flg.", "EI2 90, 1-flg. 1000 × 2125 mm, Eckzarge", [["031.01.004.03001", 1.0]], True),
             o("RS Stahl", "Rauchschutztür S200, 1-flg. 1000 × 2125 mm", [["031.01.005.01001", 1.0]], True),
             o("T90 2-flg.", "EI2 90, 2-flg. 2000 × 2125 mm, Eckzarge", [["031.01.004.04001", 1.0]]),
             o("T30 Umfassungsz.", "EI2 30, 1-flg. 1000 × 2125 mm, Umfassungszarge", [["031.01.004.01009", 1.0]]),
             o("T30 Feststellung", "EI2 30, 1-flg., mit Feststellanlage", [["031.01.004.01003", 1.0]]),
             o("T30 Panik", "EI2 30, 1-flg., mit Panikfunktion EN 1125", [["031.01.004.01005", 1.0]])]},
         {"name": "Zylinder", "optionen": ZYLINDER},
         {"name": "Zubehör", "optionen": [
             o("", "", [], True),
             o("Notausgang EN 179", "Notausgangsverschluss mit Drücker EN 179", [["029.02.004.01001", 1.0]], True),
             o("Feststellanlage", "Feststellanlage mit Rauchmelder und Abnahme", [["031.01.007.01001", 1.0]]),
             o("Haftmagnet", "Türstopper mit Haftmagnet", [["029.03.001.03001", 1.0]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "344.08", "kg": "344", "name": "Innentür in Stahlzarge", "einheit": "St",
     "lang": "Innentür mit Stahl-Umfassungs- oder Eckzarge (grundiert, lackiert) und Holztürblatt, "
             "mit Drückergarnitur, für robuste Bereiche (Schule, Verwaltung, Keller).",
     "bezug": "Stück je Türelement",
     "fest": [["034.03.002.02001", 1.0]],
     "schichten": [
         {"name": "Zarge", "optionen": [
             o("Stahlzarge MW 125", "Stahl-Umfassungszarge Maulweite 125 mm, 885 × 2010", [["031.01.001.01001", 1.0]], True),
             o("Stahlzarge MW 175", "Stahl-Umfassungszarge Maulweite 175 mm, 1010 × 2135", [["031.01.001.02001", 1.0]], True),
             o("Eckzarge", "Stahl-Eckzarge 885 × 2010 mm", [["031.01.002.01001", 1.0]], True),
             o("Stahlzarge MW 275", "Stahl-Umfassungszarge Maulweite 275 mm, 1010 × 2135", [["031.01.001.03001", 1.0]])]},
         {"name": "Türblatt", "optionen": [
             o("Blatt CPL", "Türblatt Röhrenspan CPL weiß", [["027.01.010.01001", 1.0]], True),
             o("Blatt Weißlack", "Türblatt Röhrenspan Weißlack", [["027.01.010.02001", 1.0]], True),
             o("Blatt Eiche", "Türblatt Furnier Eiche", [["027.01.010.03001", 1.0]])]},
         {"name": "Drücker", "optionen": [
             o("Drücker Alu", "Drückergarnitur Aluminium F1", [["029.01.001.01001", 1.0]], True),
             o("Edelstahl + Zyl.", "Drückergarnitur Edelstahl PZ mit Einzelzylinder",
               [["029.01.001.02001", 1.0], ["029.01.002.01001", 1.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "344.09", "kg": "344", "name": "Stahl-Mehrzwecktür", "einheit": "St",
     "lang": "Stahl-Mehrzwecktür einflügelig, doppelwandiges Türblatt mit Dämmeinlage, Zarge, PZ-Schloss und "
             "Drückergarnitur, verzinkt und pulverbeschichtet, mit Zylinder.",
     "bezug": "Stück je Türelement",
     "schichten": [
         {"name": "Türelement", "optionen": [
             o("MZT 875", "875 × 2000 mm, Eckzarge", [["031.01.003.01001", 1.0]], True),
             o("MZT 1000", "1000 × 2125 mm, Eckzarge", [["031.01.003.02001", 1.0]], True),
             o("MZT 1000 UZ", "1000 × 2125 mm, Umfassungszarge", [["031.01.003.02009", 1.0]], True),
             o("MZT 875 Lüftung", "875 × 2000 mm, Eckzarge, Lüftungsgitter", [["031.01.003.01003", 1.0]]),
             o("MZT 1000 Licht", "1000 × 2125 mm, Eckzarge, Lichtausschnitt", [["031.01.003.02005", 1.0]])]},
         {"name": "Zylinder", "optionen": ZYLINDER},
         {"name": "Schließer", "optionen": [
             o("", "", [], True),
             o("Türschließer", "Obentürschließer mit Gleitschiene", [["029.02.001.01001", 1.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "344.10", "kg": "344", "name": "Ganzglastür innen", "einheit": "St",
     "lang": "Ganzglastür aus ESG in Holzzarge mit Glastürbeschlag und Studioschloss oder als Pendel-/Drehtür "
             "ESG 10 mm mit Beschlag, wahlweise satiniert.",
     "bezug": "Stück je Türelement",
     "schichten": [
         {"name": "Türelement", "optionen": [
             o("ESG 8 885 klar", "ESG 8 mm in Holzzarge, 885 × 2010 mm, klar", [["027.01.008.02001", 1.0]], True),
             o("ESG 8 885 sat.", "ESG 8 mm in Holzzarge, 885 × 2010 mm, satiniert", [["027.01.008.02003", 1.0]], True),
             o("ESG 8 1010 klar", "ESG 8 mm in Holzzarge, 1010 × 2135 mm, klar", [["027.01.008.03001", 1.0]], True),
             o("ESG 10 Pendeltür", "Ganzglastür ESG 10 mm, Pendel-/Drehtür 1,00 × 2,20 m", [["032.02.001.01001", 1.0]], True),
             o("ESG 8 760 klar", "ESG 8 mm in Holzzarge, 760 × 2010 mm, klar", [["027.01.008.01001", 1.0]]),
             o("ESG 8 Motiv", "ESG 8 mm in Holzzarge, 885 × 2010 mm, Motiv", [["027.01.008.02005", 1.0]]),
             o("ESG 10 2-flg.", "Ganzglastür ESG 10 mm, 2-flg. 2,00 × 2,20 m", [["032.02.001.02001", 1.0]])]},
         {"name": "Zubehör", "optionen": [
             o("", "", [], True),
             o("Türstopper", "Türstopper Boden", [["029.03.001.01001", 1.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "344.11", "kg": "344", "name": "Schiebetür innen", "einheit": "St",
     "lang": "Schiebetür aus Holzwerkstoff mit Lauf- und Führungsschiene und Soft-Close, vor der Wand oder in "
             "Wandtasche laufend, bzw. automatische Schiebetüranlage.",
     "bezug": "Stück je Türanlage",
     "schichten": [
         {"name": "Tür", "optionen": [
             o("vor Wand WL", "vor der Wand laufend, Weißlack", [["027.01.009.01001", 1.0]], True),
             o("vor Wand CPL", "vor der Wand laufend, CPL Dekor", [["027.01.009.01003", 1.0]], True),
             o("Wandtasche WL", "in Wandtasche laufend, Weißlack", [["027.01.009.01007", 1.0]], True),
             o("Wandtasche CPL", "in Wandtasche laufend, CPL Dekor", [["027.01.009.01009", 1.0]], True),
             o("vor Wand Eiche", "vor der Wand laufend, Furnier Eiche", [["027.01.009.01005", 1.0]]),
             o("Wandtasche Eiche", "in Wandtasche laufend, Furnier Eiche", [["027.01.009.01011", 1.0]]),
             o("Automatik 1,40", "automatische Schiebetüranlage, Durchgang 1,40 m", [["026.03.004.01001", 1.0]]),
             o("Automatik 2,00", "automatische Schiebetüranlage, Durchgang 2,00 m", [["026.03.004.02001", 1.0]])]},
         {"name": "Öffnung", "optionen": [
             o("", "", [], True),
             o("Öffnung TB-Wand", "Türöffnung in Montagewand mit UA-Profilen, bis 2,01 m breit",
               [["039.02.001.02001", 1.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "344.12", "kg": "344", "name": "Rohrrahmentür verglast", "einheit": "St",
     "lang": "Rohrrahmentür aus Stahlprofilen mit Verglasung passend zur Anforderung, Obentürschließer, Panikschloss, "
             "pulverbeschichtet, für Flure und Treppenräume.",
     "bezug": "Stück je Türelement",
     "schichten": [
         {"name": "Türelement", "optionen": [
             o("T30-RS 1-flg.", "T30-RS, 1-flg. 1,25 × 2,25 m", [["031.01.006.01001", 1.0]], True),
             o("T30-RS 2-flg.", "T30-RS, 2-flg. 2,25 × 2,25 m", [["031.01.006.02001", 1.0]], True),
             o("RS 1-flg.", "Rauchschutz RS, 1-flg. 1,25 × 2,25 m", [["031.01.006.03001", 1.0]], True),
             o("RS 2-flg.", "Rauchschutz RS, 2-flg. 2,25 × 2,25 m", [["031.01.006.04001", 1.0]], True),
             o("ohne Anf. 1-flg.", "ohne Anforderung, 1-flg. 1,25 × 2,25 m", [["031.01.006.05001", 1.0]]),
             o("ohne Anf. 2-flg.", "ohne Anforderung, 2-flg. 2,25 × 2,25 m", [["031.01.006.06001", 1.0]])]},
         {"name": "Feststellung", "optionen": [
             o("", "", [], True),
             o("Feststellanlage", "Feststellanlage mit Rauchmelder und Abnahme", [["031.01.007.01001", 1.0]], True)]},
         {"name": "Zylinder", "optionen": ZYLINDER},
     ], "tags": ["neubau", "altbau"]},

    {"id": "344.13", "kg": "344", "name": "Innentür erneuern im Bestand", "einheit": "St",
     "lang": "Erneuerung vorhandener Innentüren: neues Türblatt in vorhandener Zarge oder Renovierungszarge mit "
             "Türblatt über vorhandene Zarge, mit Drückergarnitur und Überarbeitung der Zarge.",
     "bezug": "Stück je Tür",
     "schichten": [
         {"name": "Maßnahme", "optionen": [
             o("Blatt CPL", "neues Türblatt CPL weiß in vorhandener Zarge", [["027.01.010.01001", 1.0]], True),
             o("Blatt Weißlack", "neues Türblatt Weißlack in vorhandener Zarge", [["027.01.010.02001", 1.0]], True),
             o("Blatt Eiche", "neues Türblatt Furnier Eiche in vorhandener Zarge", [["027.01.010.03001", 1.0]], True),
             o("Renovierungszarge", "Renovierungszarge Weißlack über vorhandene Zarge, mit Türblatt", [["027.01.011.01001", 1.0]], True),
             o("komplett neu CPL", "alte Tür mit Zarge ausbauen, neues Türelement CPL weiß 885 × 2010",
               [["027.01.012.01001", 1.0], ["027.01.001.01098", 1.0]]),
             o("komplett neu WL", "Stahlzarge herausstemmen, neues Türelement Weißlack 885 × 2010",
               [["027.01.012.02001", 1.0], ["027.01.001.02098", 1.0]])]},
         {"name": "Drücker", "optionen": [
             o("Drücker Alu", "Drückergarnitur Aluminium F1", [["029.01.001.01001", 1.0]], True),
             o("Drücker Edelstahl", "Drückergarnitur Edelstahl matt", [["029.01.001.02001", 1.0]], True)]},
         {"name": "Zarge", "optionen": [
             o("", "vorhandene Zarge bleibt unbehandelt", [], True),
             o("Stahlzarge lack.", "vorhandene Stahlzarge schleifen und lackieren", [["034.03.002.02001", 1.0]], True),
             o("Blatt kürzen", "Türblatt kürzen/anpassen an neuen Bodenaufbau", [["027.01.013.01001", 1.0]])]},
     ], "tags": ["altbau"]},

    {"id": "344.14", "kg": "344", "name": "Türöffnung herstellen Bestand", "einheit": "St",
     "lang": "Neue Türöffnung in bestehender Innenwand: Durchbruch mit Abfangung und Sturz bzw. Wandsägen, "
             "Leibungen beigeputzt. Türelement gesondert.",
     "bezug": "Stück je Öffnung (bis ca. 1,0 × 2,1 m)",
     "schichten": [
         {"name": "Durchbruch", "optionen": [
             o("MW ≤ 24", "Wanddurchbruch Mauerwerk d bis 24 cm, bis 2,0 m²", [["012.04.007.01001", 1.0]], True),
             o("MW ≤ 36,5", "Wanddurchbruch Mauerwerk d bis 36,5 cm, bis 2,5 m²", [["012.04.007.02001", 1.0]], True),
             o("StB ≤ 20 sägen", "Öffnung in Stahlbetonwand sägen, d bis 20 cm (5,2 m Schnitt)", [["013.08.004.01001", 5.2]], True),
             o("StB ≤ 30 sägen", "Öffnung in Stahlbetonwand sägen, d bis 30 cm (5,2 m Schnitt)", [["013.08.004.02001", 5.2]])]},
         {"name": "Sturz", "optionen": [
             o("2×IPE 160", "Sturz 2 × IPE 160 mit Abfangung", [["017.01.002.01001", 1.4], ["017.01.004.01001", 1.0]], True),
             o("Flachsturz", "Flachsturz 1,51 m eingebaut", [["012.04.001.03001", 1.0]], True),
             o("", "ohne Sturz (Stahlbeton)", [])]},
         {"name": "Leibung", "optionen": [
             o("", "", [], True),
             o("Leibung geputzt", "Leibungen und Sturz beiputzen (ca. 5,2 m)", [["023.02.004.01001", 5.2]], True)]},
     ], "tags": ["altbau"]},

    {"id": "344.15", "kg": "344", "name": "Öffnung schließen Bestand", "einheit": "St",
     "lang": "Vorhandene Wandöffnung zumauern und beidseitig an den Bestand anputzen.",
     "bezug": "Stück je Öffnung",
     "schichten": [
         {"name": "Zumauern", "optionen": [
             o("bis 1,0 m²", "Öffnung zumauern bis 1,0 m²", [["012.04.005.01001", 1.0]], True),
             o("bis 2,5 m²", "Öffnung zumauern bis 2,5 m²", [["012.04.005.02001", 1.0]], True),
             o("bis 4,0 m²", "Öffnung zumauern bis 4,0 m²", [["012.04.005.03001", 1.0]], True)]},
         {"name": "Putz", "optionen": [
             o("", "", [], True),
             o("beigeputzt", "beidseitig Gipsputz und Anstrich (ca. 4 m²)",
               [["023.02.001.01002", 4.0], ["034.02.001.01001", 4.0]], True)]},
     ], "tags": ["altbau"]},

    {"id": "344.16", "kg": "344", "name": "Revisions-/Abseitentür", "einheit": "St",
     "lang": "Kleine Wandöffnung mit Verschluss: Abseiten-/Kniestocktür gedämmt oder Revisionsklappe in Montagewand.",
     "bezug": "Stück",
     "schichten": [
         {"name": "Verschluss", "optionen": [
             o("Abseitentür", "Abseitentür/Kniestocktür gedämmt, bis 60 × 80 cm", [["027.01.015.01001", 1.0]]),
             o("Revision 300", "Revisionsklappe 300 × 300 mm", [["039.02.004.01001", 1.0]]),
             o("Revision 600", "Revisionsklappe 600 × 600 mm", [["039.02.004.02001", 1.0]]),
             o("Revision EI 30", "Revisionsklappe EI 30, 300 × 300 mm", [["039.02.004.03001", 1.0]]),
             o("Revision EI 90", "Revisionsklappe EI 90, 600 × 600 mm", [["039.02.004.04001", 1.0]])]},
     ], "tags": ["neubau", "altbau"]},

    # ============================================================ KG 345 Innenwandbekleidungen
    {"id": "345.01", "kg": "345", "name": "Innenputz mit Anstrich", "einheit": "m²",
     "lang": "Innenwandputz auf Mauerwerk oder Beton mit Vorbehandlung, Eckschutzschienen und Abschlussprofilen "
             "sowie Beschichtung.",
     "bezug": "Wandfläche je Seite, Öffnungen über 2,5 m² abgezogen",
     "fest": [["023.01.003.01001", 0.3], ["023.01.003.02001", 0.2]],
     "schichten": [
         {"name": "Untergrund", "optionen": [
             o("", "", [], True),
             o("Haftbrücke", "Haftbrücke auf Beton", [["023.01.001.02001", 1.0]], True),
             o("Spritzbewurf", "Spritzbewurf vollflächig", [["023.01.001.03001", 1.0]]),
             o("Grundierung", "Grundierung saugfähiger Untergrund", [["023.01.001.01001", 1.0]])]},
         {"name": "Putz", "optionen": [
             o("Gipsputz Q2", "Gipsputz 10 mm, Q2", [["023.02.001.01001", 1.0]], True),
             o("Gipsputz Q3", "Gipsputz 15 mm, Q3", [["023.02.001.02001", 1.0]], True),
             o("KZ-Putz", "Kalkzementputz CS II 15 mm, abgerieben", [["023.02.001.04001", 1.0]], True),
             o("Kalkgipsputz", "Kalk-Gipsputz 15 mm, gefilzt", [["023.02.001.03001", 1.0]]),
             o("Kalkputz", "Kalkputz CL 15 mm, gefilzt", [["023.02.001.05001", 1.0]]),
             o("Lehmputz", "Lehmputz 2-lagig 20 mm", [["023.02.001.06001", 1.0]]),
             o("Gipsputz 25", "Gipsputz 2-lagig 25 mm, Ausgleich", [["023.02.010.01001", 1.0]])]},
         {"name": "Oberfläche", "optionen": [
             o("Disp. Kl. 3", "Dispersionsanstrich Nassabriebklasse 3", [["034.02.001.01001", 1.0]], True),
             o("Disp. Kl. 2", "Dispersionsanstrich Nassabriebklasse 2", [["034.02.001.02001", 1.0]], True),
             o("Vlies + Disp.", "Malervlies, Dispersionsanstrich", [["037.02.001.03001", 1.0], ["034.02.001.01001", 1.0]], True),
             o("Raufaser + Disp.", "Raufaser, Dispersionsanstrich", [["037.02.001.01001", 1.0], ["034.02.001.01001", 1.0]], True),
             o("Silikat", "Silikatanstrich zweimal", [["034.02.002.01001", 1.0]]),
             o("Kalkanstrich", "Kalkanstrich zweimal", [["034.02.007.01001", 1.0]]),
             o("Lehmfarbe", "Lehmfarbe zweimal", [["034.02.007.03001", 1.0]]),
             o("Strukturanstrich", "Strukturanstrich/Rollputz fein", [["034.02.008.01001", 1.0]]),
             o("", "ohne Anstrich", [])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "345.02", "kg": "345", "name": "Wandfliesen Nassbereich", "einheit": "m²",
     "lang": "Wandfliesenbelag im Dünnbett auf Putz oder Platten, mit Verbundabdichtung nach DIN 18534 im "
             "Spritzwasserbereich, Silikonfugen und Abschlussprofilen.",
     "bezug": "verflieste Wandfläche",
     "fest": [["024.04.001.01001", 0.3], ["024.04.003.01001", 0.2]],
     "schichten": [
         {"name": "Untergrund", "optionen": [
             o("auf KZ-Putz", "Kalkzementputz 15 mm als Fliesenuntergrund", [["023.02.001.04001", 1.0]], True),
             o("auf Platten", "Grundierung auf Gipsplatten/Putz vorhanden", [["024.01.001.01001", 1.0]], True),
             o("Spachtelung", "Spachtelung zum Ebenheitsausgleich ≤ 3 mm", [["024.01.001.02001", 1.0]])]},
         {"name": "Abdichtung", "optionen": [
             o("", "ohne Abdichtung (W0-I)", [], True),
             o("Abdichtung W1/W2", "Verbundabdichtung flüssig W1-I/W2-I mit Dichtband",
               [["024.01.002.01001", 1.0], ["024.01.003.01001", 0.4]], True),
             o("Abdichtung W3", "Verbundabdichtung W2-I + Zulage W3-I mit Dichtband",
               [["024.01.002.01001", 1.0], ["024.01.010.01001", 1.0], ["024.01.003.01001", 0.4]])]},
         {"name": "Fliesen", "optionen": [
             o("Fliesen 20×25", "Wandfliesen 20 × 25 cm, bis 20 €/m²", [["024.02.003.01001", 1.0]], True),
             o("Fliesen 30×60", "Wandfliesen 30 × 60 cm, bis 30 €/m²", [["024.02.003.02001", 1.0]], True),
             o("Fliesen 60×120", "Wandfliesen 60 × 120 cm, bis 50 €/m²", [["024.02.003.04001", 1.0]], True),
             o("Metro 7,5×30", "Wandfliesen 7,5 × 30 cm (Metro)", [["024.02.007.06001", 1.0]], True),
             o("Fliesen 30×60 geh.", "Wandfliesen 30 × 60 cm, bis 50 €/m²", [["024.02.003.03001", 1.0]]),
             o("Fliesen 10×10", "Wandfliesen 10 × 10 cm", [["024.02.007.01001", 1.0]]),
             o("Mosaik 2,5×2,5", "Mosaik 2,5 × 2,5 cm", [["024.02.004.01001", 1.0]]),
             o("Fliesen 40×120", "Wandfliesen 40 × 120 cm", [["024.02.007.05001", 1.0]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "345.03", "kg": "345", "name": "Wandbekleidung Tapete", "einheit": "m²",
     "lang": "Tapezierarbeiten an Wänden auf vorbereitetem Untergrund mit Makulatur, wahlweise mit Entfernen alter "
             "Tapeten, mit Anstrich der überstreichbaren Tapeten.",
     "bezug": "tapezierte Wandfläche, Öffnungen über 2,5 m² abgezogen",
     "fest": [["037.01.002.01001", 1.0]],
     "schichten": [
         {"name": "Vorarbeiten", "optionen": [
             o("", "", [], True),
             o("Alttapete entf.", "alte Tapete einlagig entfernen", [["037.01.001.01001", 1.0]], True),
             o("Alttapete mehrl.", "alte Tapete mehrlagig mit Dampfgerät entfernen", [["037.01.001.02001", 1.0]])]},
         {"name": "Tapete", "optionen": [
             o("Raufaser", "Raufasertapete mittlere Körnung", [["037.02.001.01001", 1.0]], True),
             o("Malervlies", "Malervlies glatt 130 g/m²", [["037.02.001.03001", 1.0]], True),
             o("Glasgewebe", "Glasgewebe Struktur, überstreichbar", [["037.02.001.05001", 1.0]], True),
             o("Renoviervlies", "Renoviervlies rissüberbrückend", [["037.02.001.06001", 1.0]]),
             o("Mustertapete", "Mustertapete mit Rapport, bis 15 €/m²", [["037.02.002.01001", 1.0]]),
             o("Designtapete", "Designtapete mit Rapport, bis 40 €/m²", [["037.02.002.02001", 1.0]]),
             o("Vinyltapete", "Vinyltapete Objekt", [["037.02.006.02001", 1.0]]),
             o("Textiltapete", "Textiltapete", [["037.02.006.01001", 1.0]])]},
         {"name": "Anstrich", "optionen": [
             o("Disp. Kl. 3", "Dispersionsanstrich Nassabriebklasse 3", [["034.02.001.01001", 1.0]], True),
             o("Latex Kl. 1", "Latexfarbe Nassabriebklasse 1, zweimal", [["034.02.001.04001", 1.0]], True),
             o("", "ohne Anstrich (fertige Tapete)", [])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "345.04", "kg": "345", "name": "Vorsatzschale Trockenbau", "einheit": "m²",
     "lang": "Wandbekleidung als Vorsatzschale freistehend oder direkt befestigt bzw. Trockenputz, "
             "einseitig verspachtelt und beschichtet.",
     "bezug": "bekleidete Wandfläche, Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Schale", "optionen": [
             o("VSS CW 50 1×", "freistehend CW 50, 1 × 12,5 mm GKB", [["039.03.001.01001", 1.0]], True),
             o("VSS CW 50 2×", "freistehend CW 50, 2 × 12,5 mm GKB", [["039.03.001.02001", 1.0]], True),
             o("VSS direkt", "direkt befestigt, 1 × 12,5 mm GKB", [["039.03.001.03001", 1.0]], True),
             o("Trockenputz", "Gipsplatten 12,5 mm angesetzt", [["039.03.005.01001", 1.0]], True)]},
         {"name": "Platten", "optionen": [
             o("", "Gipsplatten GKB", [], True),
             o("H2", "imprägnierte Gipsplatten H2", [["039.01.009.01001", 1.0]], True),
             o("zementgebunden", "zementgebundene Bauplatte statt Gipsplatte", [["039.01.010.01001", 1.0]])]},
         {"name": "Oberfläche", "optionen": GK_OBERFL_1},
     ], "tags": ["neubau", "altbau"]},

    {"id": "345.05", "kg": "345", "name": "Innendämmung Außenwand", "einheit": "m²",
     "lang": "Innendämmung an Außenwänden im Bestand mit Verbundplatten oder Wärmedämmputz, wahlweise mit Abschlagen "
             "des Altputzes und Ausgleich, mit Oberfläche.",
     "bezug": "gedämmte Wandfläche, Öffnungen über 2,5 m² abgezogen; Leibungen gesondert",
     "schichten": [
         {"name": "Vorarbeiten", "optionen": [
             o("", "", [], True),
             o("Altputz ab", "Altputz abschlagen, Ausgleichsputz bis 10 mm",
               [["023.01.005.01001", 1.0], ["023.01.008.01001", 1.0]], True)]},
         {"name": "Dämmung", "optionen": [
             o("GK-EPS 60", "Verbundplatte Gipsplatte mit EPS, d = 60 mm", [["039.03.006.01001", 1.0]], True),
             o("CaSi 50", "Calciumsilikatplatte kapillaraktiv, d = 50 mm", [["039.03.006.02001", 1.0]], True),
             o("Holzfaser 60", "Holzfaser-Verbundplatte, d = 60 mm", [["039.03.006.03001", 1.0]], True),
             o("Dämmputz 30", "Wärmedämmputz innen, d = 30 mm", [["023.02.009.01001", 1.0]]),
             o("Dämmputz 50", "Wärmedämmputz innen, d = 50 mm", [["023.02.009.02001", 1.0]])]},
         {"name": "Oberfläche", "optionen": [
             o("Q3, Disp.", "Spachtelung Q3, Dispersionsanstrich", [["034.02.013.01001", 1.0], ["034.02.001.01001", 1.0]], True),
             o("Kalkputz, Silikat", "Dünnlagenputz/Kalkspachtel, Silikatanstrich",
               [["023.02.003.01001", 1.0], ["034.02.002.01001", 1.0]], True),
             o("Silikat", "Silikatanstrich zweimal", [["034.02.002.01001", 1.0]])]},
     ], "tags": ["altbau"]},

    {"id": "345.06", "kg": "345", "name": "Sanierputz feuchte Wände", "einheit": "m²",
     "lang": "Sanierung salz- und feuchtebelasteter Innenwände: Altputz abschlagen, Mauerwerk vorbereiten, "
             "Sanierputzsystem WTA zweilagig, diffusionsoffener Anstrich.",
     "bezug": "sanierte Wandfläche (in der Regel bis 1 m über Schadensgrenze)",
     "schichten": [
         {"name": "Vorarbeiten", "optionen": [
             o("Putz + Salz ab", "Altputz abschlagen, salzbelasteten Putz entfernen, Mauerwerk vorbereiten",
               [["023.01.005.01001", 1.0], ["023.01.007.01001", 1.0]], True),
             o("Putz ab", "Altputz abschlagen", [["023.01.005.01001", 1.0]], True)]},
         {"name": "Sanierputz", "optionen": [
             o("WTA 20", "Sanierputzsystem WTA 20 mm", [["023.02.008.01001", 1.0]], True),
             o("WTA 30", "Sanierputzsystem WTA 30 mm", [["023.02.008.02001", 1.0]], True),
             o("WTA 40", "Sanierputzsystem WTA 40 mm", [["023.02.008.03001", 1.0]], True)]},
         {"name": "Anstrich", "optionen": [
             o("Silikat", "Silikatanstrich zweimal", [["034.02.002.01001", 1.0]], True),
             o("Kalk", "Kalkanstrich zweimal", [["034.02.007.01001", 1.0]], True),
             o("schimmelhemmend", "schimmelhemmender Mineralanstrich", [["034.02.010.01001", 1.0]])]},
     ], "tags": ["altbau"]},

    {"id": "345.07", "kg": "345", "name": "Holz-/Akustik-Wandbekleidung", "einheit": "m²",
     "lang": "Wandbekleidung aus Holzwerkstoff, Massivholz-Profilbrettern oder Akustikpaneelen, wahlweise auf "
             "Lattung mit Dämmung, mit Oberflächenbehandlung.",
     "bezug": "bekleidete Wandfläche (Ansichtsfläche)",
     "schichten": [
         {"name": "Bekleidung", "optionen": [
             o("Furnier Eiche", "Furnierplatte Eiche, geschlossen", [["027.03.002.01001", 1.0]], True),
             o("Akustik gelocht", "Akustikpaneel gelocht mit Vlies", [["027.03.002.02001", 1.0]], True),
             o("Lamellen/Filz", "Holzlamellen auf Akustikfilz", [["027.03.002.03001", 1.0]], True),
             o("Profilbrett", "Nut-und-Feder-Profilbrett", [["027.03.002.04001", 1.0]], True),
             o("Dreischicht 19", "Dreischichtplatte 19 mm", [["039.03.009.03001", 1.0]], True),
             o("OSB 15", "OSB/3-Platte 15 mm", [["039.03.009.01001", 1.0]]),
             o("Siebdruck 18", "Siebdruckplatte Birke 18 mm", [["039.03.009.04001", 1.0]]),
             o("Prallwand GF", "ballwurfsichere Bekleidung, Gipsfaser zweilagig", [["039.03.010.01001", 1.0]]),
             o("Prallwand Holz", "ballwurfsichere Bekleidung, Holzlamellen", [["039.03.010.02001", 1.0]])]},
         {"name": "Unterkonstruktion", "optionen": [
             o("", "direkt bzw. auf Systemunterkonstruktion", [], True),
             o("Lattung + Dämmung", "Lattung 40/60 mm mit Dämmung 40 mm", [["016.04.003.01001", 1.0]], True)]},
         {"name": "Oberfläche", "optionen": [
             o("", "werkseitig fertig", [], True),
             o("lasiert", "farblos lasiert", [["034.02.014.01001", 1.0]], True),
             o("weiß geölt", "weiß pigmentiert geölt", [["034.02.014.03001", 1.0]]),
             o("deckend", "deckend lackiert", [["034.02.014.02001", 1.0]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "345.08", "kg": "345", "name": "Dekorative Wandoberfläche", "einheit": "m²",
     "lang": "Hochwertige Wandoberfläche: Spachteltechnik, Lasur-/Wischtechnik, Natursteinbekleidung, Klinkerriemchen "
             "oder Sonderbeläge auf vorbereitetem Untergrund.",
     "bezug": "gestaltete Wandfläche",
     "schichten": [
         {"name": "Untergrund", "optionen": [
             o("Gipsputz Q3", "Gipsputz 15 mm Q3 neu", [["023.02.001.02001", 1.0]], True),
             o("Bestand", "vorhandener Putz, Tiefgrund", [["034.01.002.01001", 1.0]], True)]},
         {"name": "Oberfläche", "optionen": [
             o("Kalkglätte", "Kalkglätte (Stucco-Optik)", [["034.02.011.01001", 1.0]], True),
             o("Beton-Optik", "Spachtelbeschichtung in Beton-Optik", [["034.02.011.02001", 1.0]], True),
             o("Marmorputz", "Marmorputz-Optik, poliert", [["034.02.011.03001", 1.0]], True),
             o("Lasurtechnik", "Grundanstrich und Lasurtechnik einfarbig",
               [["034.02.001.01001", 1.0], ["034.02.012.01001", 1.0]], True),
             o("Naturstein", "Naturstein-Wandbekleidung 1–2 cm, geklebt, poliert", [["014.05.002.01001", 1.0]], True),
             o("Klinkerriemchen", "Klinkerriemchen bis 35 €/m²", [["024.02.001.01001", 1.0]], True),
             o("Wischtechnik", "Grundanstrich und Wischtechnik zweifarbig",
               [["034.02.001.01001", 1.0], ["034.02.012.02001", 1.0]]),
             o("Dünnplatte", "keramische Dünnplatte 100 × 300 cm", [["024.02.002.01001", 1.0]]),
             o("Fototapete", "Fototapete/Digitaldruck nach Vorlage", [["037.02.003.01001", 1.0]]),
             o("Korkwand", "Korkwandbelag", [["037.02.006.04001", 1.0]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "345.09", "kg": "345", "name": "Wandanstrich erneuern Bestand", "einheit": "m²",
     "lang": "Renovierungsanstrich an Wänden im Bestand mit Abdeckarbeiten, Untergrundvorbehandlung, "
             "Ausbesserung von Putzschäden und Rissen.",
     "bezug": "gestrichene Wandfläche, Öffnungen über 2,5 m² abgezogen",
     "fest": [["034.01.001.01001", 0.3], ["034.01.001.02001", 0.1]],
     "schichten": [
         {"name": "Untergrund", "optionen": [
             o("Tiefgrund", "Tiefgrund lösemittelfrei", [["034.01.002.01001", 1.0]], True),
             o("Altanstrich ab", "lose Altanstriche abstoßen, Fehlstellen vorbehandeln", [["034.01.002.03001", 1.0]], True),
             o("Leimfarbe ab", "Leimfarbe abwaschen", [["034.01.002.04001", 1.0]], True),
             o("Sperrgrund", "Sperrgrund gegen Nikotin-/Wasserflecken", [["034.01.002.02001", 1.0]])]},
         {"name": "Ausbesserung", "optionen": [
             o("", "", [], True),
             o("Putz/Risse", "Putzausbesserung (5 % der Fläche) und Rissüberbrückung",
               [["023.02.006.02001", 0.05], ["034.01.004.01001", 0.1]], True),
             o("Spachtel Q3", "Flächenspachtelung Q3", [["034.01.003.01001", 1.0]]),
             o("Renoviervlies", "Renoviervlies auf rissigem Untergrund", [["037.02.007.01001", 1.0]])]},
         {"name": "Anstrich", "optionen": [
             o("Disp. Kl. 3", "Dispersionsanstrich Nassabriebklasse 3", [["034.02.001.01001", 1.0]], True),
             o("Disp. Kl. 2", "Dispersionsanstrich Nassabriebklasse 2", [["034.02.001.02001", 1.0]], True),
             o("Silikat", "Silikatanstrich zweimal", [["034.02.002.01001", 1.0]]),
             o("Kalk", "Kalkanstrich zweimal", [["034.02.007.01001", 1.0]]),
             o("Latex Kl. 1", "Latexfarbe Nassabriebklasse 1", [["034.02.001.04001", 1.0]])]},
     ], "tags": ["altbau"]},

    {"id": "345.10", "kg": "345", "name": "Wandfliesen erneuern Bestand", "einheit": "m²",
     "lang": "Erneuerung von Wandfliesen im Bestand: alte Fliesen abschlagen und Untergrund ausgleichen oder "
             "überfliesen, Abdichtung und neuer Fliesenbelag.",
     "bezug": "verflieste Wandfläche",
     "fest": [["024.04.001.01001", 0.3]],
     "schichten": [
         {"name": "Rückbau", "optionen": [
             o("Fliesen ab", "Fliesen abschlagen, Ausgleichsputz bis 10 mm",
               [["024.04.006.01001", 1.0], ["023.01.008.01001", 1.0]], True),
             o("Überfliesen", "Fliesenbelag prüfen und für Überfliesen vorbehandeln", [["024.01.004.01001", 1.0]], True)]},
         {"name": "Abdichtung", "optionen": [
             o("", "ohne Abdichtung", [], True),
             o("Abdichtung W1/W2", "Verbundabdichtung flüssig mit Dichtband",
               [["024.01.002.01001", 1.0], ["024.01.003.01001", 0.4]], True)]},
         {"name": "Fliesen", "optionen": [
             o("Fliesen 30×60", "Wandfliesen 30 × 60 cm, Bestand", [["024.02.003.02002", 1.0]], True),
             o("Fliesen 20×25", "Wandfliesen 20 × 25 cm, Bestand", [["024.02.003.01002", 1.0]], True),
             o("Fliesen 60×120", "Wandfliesen 60 × 120 cm", [["024.02.003.04001", 1.0]])]},
     ], "tags": ["altbau"]},

    # ============================================================ KG 346 Elementierte Innenwandkonstruktionen
    {"id": "346.01", "kg": "346", "name": "Glastrennwand rahmenlos", "einheit": "m²",
     "lang": "Rahmenlose Glastrennwand aus ESG/VSG mit Boden- und Deckenprofil, wahlweise mit integrierten Türen "
             "und Sichtschutzfolie.",
     "bezug": "Ansichtsfläche der Trennwand einschließlich Türen",
     "schichten": [
         {"name": "Wand", "optionen": [
             o("einfach verglast", "ESG/VSG 10–12 mm, Raumhöhe bis 3,0 m", [["032.02.002.01001", 1.0]], True),
             o("doppelt verglast", "doppelt verglast (Schallschutz), Raumhöhe bis 3,0 m", [["032.02.002.02001", 1.0]], True)]},
         {"name": "Türen", "optionen": [
             o("", "", [], True),
             o("Glastür je 10 m²", "Ganzglastür ESG 10 mm, 1 je 10 m² Wand", [["032.02.001.01001", 0.1]], True),
             o("Rohrrahmentür", "Rohrrahmentür verglast 1-flg., 1 je 10 m² Wand", [["031.01.006.05001", 0.1]])]},
         {"name": "Dekor", "optionen": [
             o("", "", [], True),
             o("Sichtschutzfolie", "Sichtschutzfolie/Glasdekor auf 40 % der Fläche", [["032.01.004.01001", 0.4]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "346.02", "kg": "346", "name": "Kellertrennwand Stahlgitter", "einheit": "m²",
     "lang": "Elementierte Kellertrennwand/Kellerverschlag aus Stahlgitterelementen mit Türen, verzinkt.",
     "bezug": "Ansichtsfläche der Trennwand einschließlich Türen",
     "schichten": [
         {"name": "Wand", "optionen": [
             o("Höhe 2,00 m", "Stahlgitter, Höhe 2,00 m", [["031.01.014.01001", 1.0]], True),
             o("raumhoch", "Stahlgitter, raumhoch", [["031.01.014.02001", 1.0]], True)]},
         {"name": "Kennzeichnung", "optionen": [
             o("", "", [], True),
             o("Nummernschilder", "Nummernschild je Abteil (1 je 10 m²)", [["029.03.002.01001", 0.1]], True)]},
     ], "tags": ["neubau", "altbau"]},

    # ============================================================ KG 349 Sonstiges zur KG 340
    {"id": "349.01", "kg": "349", "name": "Wandhandlauf / Wandschutz", "einheit": "m",
     "lang": "Wandhandlauf auf Haltern und/oder Ramm- und Wandschutz an Flurwänden, in Montagewänden mit Traversen.",
     "bezug": "Länge des Handlaufs bzw. Wandschutzes",
     "schichten": [
         {"name": "Handlauf", "optionen": [
             o("HL Edelstahl", "Wandhandlauf Edelstahl Ø 42 mm mit Haltern", [["031.02.005.01001", 1.0]], True),
             o("HL Stahl", "Wandhandlauf Stahl verzinkt, beschichtet Ø 42 mm", [["031.02.005.02001", 1.0]], True),
             o("HL Holz", "Wandhandlauf Holz Buche/Eiche auf Stahlhaltern", [["031.02.005.03001", 1.0]], True),
             o("", "ohne Handlauf", [])]},
         {"name": "Wandschutz", "optionen": [
             o("", "", [], True),
             o("Rammschutz 200", "Rammschutz Kunststoff 200 mm", [["029.04.008.02001", 1.0]], True),
             o("HL-Rammschutz", "Handlauf-Rammschutz-Kombination", [["029.04.008.03001", 1.0]])]},
         {"name": "Traversen", "optionen": [
             o("", "Massivwand", [], True),
             o("Traversen TB", "Traversen in Montagewand, 1 je m", [["039.02.003.03001", 1.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "349.02", "kg": "349", "name": "Installationsschlitz Mauerwerk", "einheit": "m",
     "lang": "Schlitz für Leitungen im Mauerwerk herstellen und nach Installation beiputzen.",
     "bezug": "Schlitzlänge",
     "schichten": [
         {"name": "Schlitz", "optionen": [
             o("Schlitz 3×3", "Schlitz bis 3 × 3 cm", [["012.04.006.01001", 1.0]], True),
             o("Schlitz 5×5", "Schlitz bis 5 × 5 cm", [["012.04.006.02001", 1.0]], True),
             o("Schlitz 10×5", "Schlitz bis 10 × 5 cm", [["012.04.006.03001", 1.0]], True)]},
         {"name": "Beiputzen", "optionen": [
             o("beigeputzt", "Schlitz beiputzen, Breite bis 10 cm", [["023.02.005.01001", 1.0]], True),
             o("", "ohne Beiputzen", [], True),
             o("beigeputzt ≤ 30", "Schlitz beiputzen, Breite bis 30 cm", [["023.02.005.02001", 1.0]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "349.03", "kg": "349", "name": "Rohr-/Kanalbekleidung", "einheit": "m",
     "lang": "Trockenbau-Bekleidung von Rohren und Leitungen (Kofferung) bzw. Kabelkanal-/Leitungsbekleidung mit "
             "Feuerwiderstand, mit Oberfläche.",
     "bezug": "Länge der Bekleidung",
     "schichten": [
         {"name": "Bekleidung", "optionen": [
             o("Kofferung ≤ 40", "Kofferung, Abwicklung bis 40 cm", [["039.06.003.01001", 1.0]], True),
             o("Kofferung ≤ 80", "Kofferung, Abwicklung bis 80 cm", [["039.06.003.02001", 1.0]], True),
             o("I 30 ≤ 60", "Leitungsbekleidung I 30, Abwicklung bis 60 cm", [["039.03.007.01001", 1.0]], True),
             o("E 30 ≤ 100", "Leitungsbekleidung E 30, Abwicklung bis 100 cm", [["039.03.007.03001", 1.0]], True),
             o("I 90 ≤ 60", "Leitungsbekleidung I 90, Abwicklung bis 60 cm", [["039.03.007.02001", 1.0]]),
             o("E 90 ≤ 100", "Leitungsbekleidung E 90, Abwicklung bis 100 cm", [["039.03.007.04001", 1.0]])]},
         {"name": "Oberfläche", "optionen": [
             o("Anstrich", "Dispersionsanstrich (ca. 0,6 m²/m)", [["034.02.001.01001", 0.6]], True),
             o("Q3, Anstrich", "Verspachtelung Q3, Dispersionsanstrich",
               [["039.06.001.01001", 0.6], ["034.02.001.01001", 0.6]], True),
             o("", "ohne Anstrich", [])]},
     ], "tags": ["neubau", "altbau"]},

    # ============================================================ KG 351 Deckenkonstruktionen
    {"id": "351.01", "kg": "351", "name": "StB-Decke Ortbeton", "einheit": "m²",
     "lang": "Stahlbeton-Massivdecke aus Ortbeton XC1 mit Deckenschalung, Randschalung und Bewehrung "
             "(ca. 100 kg/m³, Matten und Stabstahl), mit Einbauteilen nach Wahl.",
     "bezug": "Deckenfläche (Rohbaumaß), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Beton", "optionen": [
             o("StB 18 C25", "C25/30, d = 18 cm, Bewehrung 18 kg/m²",
               [["013.04.001.05001", 0.18], ["013.06.002.01001", 0.011], ["013.06.001.03001", 0.007]], True),
             o("StB 20 C25", "C25/30, d = 20 cm, Bewehrung 20 kg/m²",
               [["013.04.001.06001", 0.20], ["013.06.002.01001", 0.012], ["013.06.001.03001", 0.008]], True),
             o("StB 25 C25", "C25/30, d = 25 cm, Bewehrung 25 kg/m²",
               [["013.04.001.07001", 0.25], ["013.06.002.01001", 0.015], ["013.06.001.03001", 0.010]], True),
             o("StB 25 C30", "C30/37, d = 25 cm, Bewehrung 25 kg/m²",
               [["013.04.001.11001", 0.25], ["013.06.002.01001", 0.015], ["013.06.001.03001", 0.010]], True),
             o("StB 22 C25", "C25/30, d = 22 cm, Bewehrung 22 kg/m²",
               [["013.04.001.06001", 0.22], ["013.06.002.01001", 0.013], ["013.06.001.03001", 0.009]]),
             o("StB 30 C25", "C25/30, d = 30 cm, Bewehrung 30 kg/m²",
               [["013.04.001.08001", 0.30], ["013.06.002.01001", 0.018], ["013.06.001.03001", 0.012]]),
             o("StB 20 C30", "C30/37, d = 20 cm, Bewehrung 20 kg/m²",
               [["013.04.001.10001", 0.20], ["013.06.002.01001", 0.012], ["013.06.001.03001", 0.008]])]},
         {"name": "Schalung", "optionen": [
             o("", "Deckenschalung bis 3,0 m, Randschalung", [["013.05.001.07001", 1.0], ["013.05.001.11001", 0.03]], True),
             o("SB 2", "Deckenschalung Sichtbeton SB 2, Randschalung",
               [["013.05.001.08001", 1.0], ["013.05.001.11001", 0.03]], True),
             o("Raumhöhe > 3 m", "Deckenschalung Raumhöhe über 3,0 m, Randschalung",
               [["013.05.001.09001", 1.0], ["013.05.001.11001", 0.03]])]},
         {"name": "Einbauteile", "optionen": [
             o("", "", [], True),
             o("Leerdosen", "Elektro-Leerdosen mit Leerrohr, 0,15 St/m²", [["013.07.007.01001", 0.15]], True),
             o("Leerdosen + Aussp.", "Leerdosen und Aussparungen bis Ø 15 cm",
               [["013.07.007.01001", 0.15], ["013.05.003.01001", 0.05]])]},
         {"name": "Zulagen", "optionen": [
             o("", "", [], True),
             o("Durchstanzbew.", "Durchstanzbewehrung Dübelleisten, 2 kg/m²", [["013.06.006.01001", 2.0]])]},
     ], "tags": ["neubau"]},

    {"id": "351.02", "kg": "351", "name": "StB-Decke komplett", "einheit": "m²",
     "lang": "Stahlbeton-Ortbetondecke als Komplettleistung mit Systemschalung, Randabschalung und Bewehrung "
             "nach Statik, Oberfläche abgezogen.",
     "bezug": "Deckenfläche (Rohbaumaß), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Decke", "optionen": [
             o("StB 18", "d = 18 cm, C25/30", [["013.09.003.01001", 1.0]], True),
             o("StB 20", "d = 20 cm, C25/30", [["013.09.003.02001", 1.0]], True),
             o("StB 22", "d = 22 cm, C25/30", [["013.09.003.03001", 1.0]], True),
             o("StB 25", "d = 25 cm, C30/37", [["013.09.003.04001", 1.0]], True),
             o("StB 30", "d = 30 cm, C30/37", [["013.09.003.05001", 1.0]], True)]},
         {"name": "Einbauteile", "optionen": [
             o("", "", [], True),
             o("Leerdosen", "Elektro-Leerdosen mit Leerrohr, 0,15 St/m²", [["013.07.007.01001", 0.15]], True),
             o("Leerdosen + Aussp.", "Leerdosen und Aussparungen bis Ø 15 cm",
               [["013.07.007.01001", 0.15], ["013.05.003.01001", 0.05]])]},
         {"name": "Oberseite", "optionen": [
             o("", "abgezogen", [], True),
             o("flügelgeglättet", "Oberfläche flügelgeglättet (Zulage)", [["013.02.006.01001", 1.0]], True)]},
     ], "tags": ["neubau"]},

    {"id": "351.03", "kg": "351", "name": "Elementdecke mit Aufbeton", "einheit": "m²",
     "lang": "Stahlbeton-Elementdecke (Filigrandecke) mit Gitterträgern und Montageunterstützung, Zulagebewehrung "
             "und Ortbetonergänzung C25/30.",
     "bezug": "Deckenfläche (Rohbaumaß), Öffnungen über 2,5 m² abgezogen",
     "fest": [["013.06.002.01001", 0.006], ["013.06.001.01001", 0.003], ["013.05.001.11001", 0.03]],
     "schichten": [
         {"name": "Element", "optionen": [
             o("Element 5 cm", "Elementdeckenplatte 5 cm", [["013.04.003.01001", 1.0]], True),
             o("Element 6 cm", "Elementdeckenplatte 6 cm", [["013.04.003.02001", 1.0]], True)]},
         {"name": "Aufbeton", "optionen": [
             o("Aufbeton 14", "Ortbetonergänzung C25/30, d = 14 cm", [["013.04.002.01001", 1.0]], True),
             o("Aufbeton 18", "Ortbetonergänzung C25/30, d = 18 cm", [["013.04.002.02001", 1.0]], True)]},
         {"name": "Einbauteile", "optionen": [
             o("", "", [], True),
             o("Leerdosen", "Elektro-Leerdosen mit Leerrohr, 0,15 St/m²", [["013.07.007.01001", 0.15]], True)]},
     ], "tags": ["neubau"]},

    {"id": "351.04", "kg": "351", "name": "Holzbalkendecke Neubau", "einheit": "m²",
     "lang": "Holzbalkendecke aus KVH mit Hohlraumdämmung, Verankerung und oberseitiger Beplankung, "
             "wahlweise mit vorbeugendem Holzschutz.",
     "bezug": "Deckenfläche (Rohbaumaß)",
     "fest": [["016.01.005.01001", 0.5]],
     "schichten": [
         {"name": "Balkenlage", "optionen": [
             o("KVH 10/20", "KVH 100 × 200 mm, gedämmt", [["016.05.001.01001", 1.0]], True),
             o("KVH 12/24", "KVH 120 × 240 mm, gedämmt", [["016.05.001.02001", 1.0]], True)]},
         {"name": "Beplankung", "optionen": [
             o("Rauspund 24", "Rauspundboden 24 mm", [["016.05.005.01001", 1.0]], True),
             o("OSB 22", "OSB/4-Platten 22 mm", [["025.03.011.02001", 1.0]], True),
             o("Spanplatte 22", "Spanplatte P5 22 mm", [["025.03.011.01001", 1.0]])]},
         {"name": "Holzschutz", "optionen": [
             o("", "", [], True),
             o("Holzschutz", "vorbeugender Holzschutz GK 1–2 (ca. 1,5 m²/m²)", [["016.06.001.01001", 1.5]], True)]},
     ], "tags": ["neubau"]},

    {"id": "351.05", "kg": "351", "name": "Brettsperrholz-/HBV-Decke", "einheit": "m²",
     "lang": "Massivholzdecke aus Brettsperrholz oder Holz-Beton-Verbunddecke, mit Verbindern und luftdichten Stößen, "
             "Unterseite sichtbar behandelt, wahlweise mit Schüttung.",
     "bezug": "Deckenfläche, Öffnungen über 2,5 m² abgezogen",
     "fest": [["016.01.005.01001", 1.0], ["016.03.010.01001", 0.3]],
     "schichten": [
         {"name": "Decke", "optionen": [
             o("BSP 140 NSi", "Brettsperrholz 140 mm, Nichtsichtqualität", [["016.05.002.01001", 1.0]], True),
             o("BSP 200 NSi", "Brettsperrholz 200 mm, Nichtsichtqualität", [["016.05.002.02001", 1.0]], True),
             o("BSP 160 WSi", "Brettsperrholz 160 mm, Wohnsichtqualität", [["016.05.002.03001", 1.0]], True),
             o("HBV-Decke", "Holzbalkenlage KVH 10/20 mit Schalung, Holz-Beton-Verbund 8 cm",
               [["016.05.001.01001", 1.0], ["016.05.005.01001", 1.0], ["016.05.008.01001", 1.0]])]},
         {"name": "Unterseite", "optionen": [
             o("", "unbehandelt", [], True),
             o("lasiert", "Holzuntersicht farblos lasiert", [["034.02.014.01001", 1.0]], True),
             o("weiß geölt", "Holzuntersicht weiß pigmentiert geölt", [["034.02.014.03001", 1.0]])]},
         {"name": "Beschwerung", "optionen": [
             o("", "", [], True),
             o("Schüttung 60", "Schüttung zur Beschwerung/Höhenausgleich bis 60 mm", [["025.01.004.02001", 1.0]], True)]},
     ], "tags": ["neubau"]},

    {"id": "351.06", "kg": "351", "name": "Treppenlauf Stahlbeton", "einheit": "St",
     "lang": "Gerader Treppenlauf aus Stahlbeton als Fertigteil mit Trittschalldämmlagern oder in Ortbeton "
             "mit Schalung und Bewehrung, wahlweise mit Podestplatte und Unteransicht. Belag gesondert (KG 353).",
     "bezug": "Stück je Treppenlauf (Geschosshöhe bis ca. 2,90 m)",
     "schichten": [
         {"name": "Lauf", "optionen": [
             o("FT 15–17 Stg.", "Fertigteiltreppe gerade, 15–17 Steigungen", [["013.04.010.02001", 1.0]], True),
             o("FT 8–10 Stg.", "Fertigteiltreppe gerade, 8–10 Steigungen", [["013.04.010.01001", 1.0]], True),
             o("Ortbeton 16 Stg.", "Ortbetontreppe C30/37, 16 Steigungen", [["013.04.009.01001", 16.0]], True),
             o("Ortbeton 9 Stg.", "Ortbetontreppe C30/37, 9 Steigungen", [["013.04.009.01001", 9.0]])]},
         {"name": "Podest", "optionen": [
             o("", "", [], True),
             o("FT-Podest", "Podestplatte Fertigteil bis 3 m²", [["013.04.011.01001", 1.0]], True)]},
         {"name": "Unterseite", "optionen": [
             o("", "Sichtbeton roh", [], True),
             o("Spachtel/Anstrich", "Unteransicht und Wangen gespachtelt und gestrichen (ca. 6 m²)",
               [["034.01.003.01001", 6.0], ["034.02.004.01001", 6.0]], True)]},
     ], "tags": ["neubau"]},

    {"id": "351.07", "kg": "351", "name": "Treppe Holz/Stahl komplett", "einheit": "St",
     "lang": "Innentreppe als Holzwangen- oder Bolzentreppe mit Geländer bzw. Stahltreppe/Spindeltreppe mit "
             "Gitterroststufen und Geländer, wahlweise mit Wandhandlauf.",
     "bezug": "Stück je Treppe und Geschoss",
     "schichten": [
         {"name": "Treppe", "optionen": [
             o("Holz gerade", "Wangentreppe gerade, Buche, Holzstäbe", [["027.03.005.01001", 1.0]], True),
             o("Holz ¼-gewendelt", "Wangentreppe viertelgewendelt, Buche, Holzstäbe", [["027.03.005.02001", 1.0]], True),
             o("Bolzentreppe", "Bolzentreppe halbgewendelt, Buche", [["027.03.005.03001", 1.0]], True),
             o("Stahl 1,00", "Stahltreppe, Laufbreite 1,00 m, Gitterrost, Geländer", [["031.03.001.01001", 1.0]], True),
             o("Spindel Ø 1,40", "Spindeltreppe Stahl Ø 1,40 m, Gitterrost", [["031.03.002.01001", 1.0]], True),
             o("Spindel Ø 1,60", "Spindeltreppe Stahl Ø 1,60 m, Gitterrost", [["031.03.002.02001", 1.0]], True),
             o("Stahl 1,20", "Stahltreppe, Laufbreite 1,20 m, Gitterrost, Geländer", [["031.03.001.02001", 1.0]]),
             o("Spindel Ø 2,00", "Spindeltreppe Stahl Ø 2,00 m, Gitterrost", [["031.03.002.03001", 1.0]])]},
         {"name": "Wandhandlauf", "optionen": [
             o("", "", [], True),
             o("HL Edelstahl", "Wandhandlauf Edelstahl Ø 42 mm, 4 m", [["031.02.005.01001", 4.0]], True),
             o("HL Holz", "Wandhandlauf Holz auf Stahlhaltern, 4 m", [["031.02.005.03001", 4.0]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "351.08", "kg": "351", "name": "Unterzug Stahlbeton", "einheit": "m",
     "lang": "Unterzug aus Ortbeton C30/37 mit Schalung und Bewehrung (ca. 150 kg/m³) oder als Fertigteil, "
             "Oberfläche nach Wahl.",
     "bezug": "Länge des Unterzugs (Achsmaß)",
     "schichten": [
         {"name": "Querschnitt", "optionen": [
             o("UZ 25/40", "Ortbeton b/h = 25/40 cm",
               [["013.04.005.01001", 0.10], ["013.05.001.10001", 1.05], ["013.06.001.03001", 0.015]], True),
             o("UZ 30/50", "Ortbeton b/h = 30/50 cm",
               [["013.04.005.01001", 0.15], ["013.05.001.10001", 1.30], ["013.06.001.03001", 0.0225]], True),
             o("UZ 30/60", "Ortbeton b/h = 30/60 cm",
               [["013.04.005.01001", 0.18], ["013.05.001.10001", 1.50], ["013.06.001.03001", 0.027]], True),
             o("FT-Unterzug", "Stahlbeton-Fertigteilunterzug bis 8 m", [["013.09.006.01001", 0.125]], True),
             o("UZ 40/60", "Ortbeton b/h = 40/60 cm",
               [["013.04.005.01001", 0.24], ["013.05.001.10001", 1.60], ["013.06.001.03001", 0.036]])]},
         {"name": "Oberfläche", "optionen": [
             o("", "Sichtbeton roh", [], True),
             o("Anstrich", "Betonanstrich (ca. 1,3 m²/m)", [["034.02.004.01001", 1.3]], True),
             o("Spachtel/Anstrich", "Spachtelung Q3 und Anstrich (ca. 1,3 m²/m)",
               [["034.01.003.01001", 1.3], ["034.02.004.01001", 1.3]])]},
     ], "tags": ["neubau"]},

    {"id": "351.09", "kg": "351", "name": "Stahlträger-Unterzug", "einheit": "m",
     "lang": "Unterzug aus Walzprofil S235 (Länge bis 6 m) mit Auflagerplatten, Korrosionsschutz und Brandschutz "
             "nach Anforderung, z. B. für Abfangungen im Umbau.",
     "bezug": "Länge des Trägers",
     "fest": [["017.04.003.02001", 0.33]],
     "schichten": [
         {"name": "Profil", "optionen": [
             o("IPE 200", "Walzträger IPE 200", [["017.04.001.04001", 0.167]], True),
             o("IPE 240", "Walzträger IPE 240", [["017.04.001.06001", 0.167]], True),
             o("IPE 300", "Walzträger IPE 300", [["017.04.001.08001", 0.167]], True),
             o("HEB 200", "Walzträger HEB 200", [["017.04.001.16001", 0.167]], True),
             o("HEB 240", "Walzträger HEB 240", [["017.04.001.18001", 0.167]])]},
         {"name": "Korrosionsschutz", "optionen": [
             o("KS C2", "Beschichtungssystem C2 (ca. 0,9 m²/m)", [["017.02.002.01001", 0.9]], True),
             o("feuerverzinkt", "Feuerverzinkung (ca. 35 kg/m)", [["017.02.001.01001", 35.0]])]},
         {"name": "Brandschutz", "optionen": [
             o("", "ohne Anforderung", [], True),
             o("R 30 Beschichtung", "dämmschichtbildende Beschichtung R 30", [["017.02.004.01001", 0.9]], True),
             o("F 90 Bekleidung", "Plattenbekleidung F 90 (ca. 1,0 m²/m)", [["017.02.005.02001", 1.0]], True),
             o("R 60 Beschichtung", "dämmschichtbildende Beschichtung R 60", [["017.02.004.02001", 0.9]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "351.10", "kg": "351", "name": "Holzbalkendecke ertüchtigen", "einheit": "m²",
     "lang": "Ertüchtigung einer Holzbalkendecke im Bestand: Fehlboden ausbauen, Balken verstärken bzw. Balkenköpfe "
             "instand setzen oder Holz-Beton-Verbund, neue Oberseite, Holzschutz.",
     "bezug": "Deckenfläche",
     "fest": [["016.06.001.01001", 1.0]],
     "schichten": [
         {"name": "Rückbau", "optionen": [
             o("Fehlboden aus", "Einschub/Fehlboden ausbauen und entsorgen", [["016.05.009.01001", 1.0]], True),
             o("", "ohne Rückbau", [], True)]},
         {"name": "Ertüchtigung", "optionen": [
             o("Balken aufdoppeln", "Balken seitlich aufdoppeln (0,6 m je m²)", [["016.05.007.01001", 0.6]], True),
             o("Balkenköpfe", "Balkenköpfe ausbessern/anlaschen (1 je 10 m²)", [["016.05.004.01001", 0.1]], True),
             o("HBV 8 cm", "Holz-Beton-Verbund mit Aufbeton 8 cm", [["016.05.008.01001", 1.0]], True),
             o("Aufdoppeln + Köpfe", "Balken aufdoppeln und Balkenköpfe ausbessern",
               [["016.05.007.01001", 0.6], ["016.05.004.01001", 0.1]]),
             o("", "ohne Verstärkung", [])]},
         {"name": "Oberseite", "optionen": [
             o("Blindboden", "Blindboden/Rauspund 24 mm neu, Bestand", [["016.05.005.01002", 1.0]], True),
             o("Schüttung", "Rieselschutz und Schüttung zum Höhenausgleich", [["025.01.011.01001", 1.0]], True),
             o("OSB 22", "OSB/4-Platten 22 mm", [["025.03.011.02001", 1.0]])]},
     ], "tags": ["altbau"]},

    # ============================================================ KG 352 Deckenöffnungen
    {"id": "352.01", "kg": "352", "name": "Deckenöffnung herstellen Bestand", "einheit": "St",
     "lang": "Neue Öffnung in vorhandener Stahlbetondecke sägen und entsorgen, mit Randeinfassung bzw. Wechsel und "
             "wahlweise Abstützung.",
     "bezug": "Stück je Öffnung",
     "schichten": [
         {"name": "Öffnung", "optionen": [
             o("≤ 0,5 m²", "Deckenöffnung d ≤ 20 cm, bis 0,5 m²", [["013.10.001.01001", 1.0]], True),
             o("≤ 2,0 m²", "Deckenöffnung d ≤ 20 cm, bis 2,0 m²", [["013.10.001.02001", 1.0]], True),
             o("≤ 4,0 m²", "Deckenöffnung d ≤ 25 cm, bis 4,0 m²", [["013.10.001.03001", 1.0]], True),
             o("≤ 6,0 m²", "Deckenöffnung d ≤ 30 cm, bis 6,0 m²", [["013.10.001.04001", 1.0]], True)]},
         {"name": "Rand", "optionen": [
             o("", "", [], True),
             o("Randwinkel", "Randwinkel Stahl (ca. 40 kg)", [["017.04.002.03001", 40.0]], True),
             o("Wechsel IPE 200", "Wechsel aus 2 Walzträgern IPE 200 bis 4 m", [["017.04.001.03001", 2.0]])]},
         {"name": "Sicherung", "optionen": [
             o("", "", [], True),
             o("Abstützung", "Notabstützung mit 4 Baustützen", [["084.01.004.01001", 4.0]], True)]},
     ], "tags": ["altbau"]},

    {"id": "352.02", "kg": "352", "name": "Deckenöffnung schließen", "einheit": "St",
     "lang": "Vorhandene Deckenöffnung mit Stahlbeton schließen, wahlweise mit Unterseite verputzt und gestrichen.",
     "bezug": "Stück je Öffnung",
     "schichten": [
         {"name": "Verschluss", "optionen": [
             o("≤ 1,0 m²", "Stahlbeton d = 16–20 cm, bis 1,0 m²", [["013.10.002.01001", 1.0]], True),
             o("≤ 3,0 m²", "Stahlbeton d = 16–20 cm, bis 3,0 m²", [["013.10.002.02001", 1.0]], True),
             o("≤ 6,0 m²", "Stahlbeton d = 20–25 cm, bis 6,0 m²", [["013.10.002.03001", 1.0]], True)]},
         {"name": "Unterseite", "optionen": [
             o("", "", [], True),
             o("Putz/Anstrich", "Unterseite Gipsputz und Anstrich (ca. 2 m²)",
               [["023.02.002.01002", 2.0], ["034.02.001.03001", 2.0]], True)]},
     ], "tags": ["altbau"]},

    {"id": "352.03", "kg": "352", "name": "Bodentreppe / Deckenluke", "einheit": "St",
     "lang": "Gedämmte Bodentreppe (Dachbodentreppe) in Deckenöffnung, wahlweise mit Herstellen der Öffnung, "
             "luftdicht angeschlossen.",
     "bezug": "Stück",
     "fest": [["016.03.010.01001", 4.0]],
     "schichten": [
         {"name": "Treppe", "optionen": [
             o("Holzleiter 3-tlg.", "Bodentreppe gedämmt, Holzleiter 3-teilig", [["027.03.009.01001", 1.0]], True),
             o("Scherentreppe", "Bodentreppe gedämmt, Scherentreppe Stahl", [["027.03.009.02001", 1.0]], True),
             o("EI 30", "Bodentreppe Holzleiter, Feuerwiderstand EI 30", [["027.03.009.03001", 1.0]], True),
             o("Einschubtreppe", "Einschubtreppe Holz, gedämmt", [["016.05.006.01001", 1.0]])]},
         {"name": "Öffnung", "optionen": [
             o("", "Öffnung vorhanden", [], True),
             o("Wechsel Holz", "Öffnung in Holzbalkendecke mit Wechsel", [["016.05.012.01001", 1.0]], True),
             o("Öffnung StB", "Deckenöffnung in Stahlbetondecke bis 2,0 m²", [["013.10.001.02001", 1.0]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "352.04", "kg": "352", "name": "Deckendurchbruch klein", "einheit": "St",
     "lang": "Kleine Deckenöffnung: Kernbohrung in Bestandsdecke (Bohrtiefe ca. 20 cm), Aussparung in der Schalung "
             "oder Revisionsöffnung in Unterdecke.",
     "bezug": "Stück",
     "schichten": [
         {"name": "Öffnung", "optionen": [
             o("KB Ø 62", "Kernbohrung Ø 62 mm, 20 cm tief", [["013.08.003.01001", 0.2]], True),
             o("KB Ø 125", "Kernbohrung Ø 125 mm, 20 cm tief", [["013.08.003.02001", 0.2]], True),
             o("KB Ø 200", "Kernbohrung Ø 200 mm, 20 cm tief", [["013.08.003.03001", 0.2]], True),
             o("KB Ø 300", "Kernbohrung Ø 300 mm, 20 cm tief", [["013.08.003.04001", 0.2]], True),
             o("Aussparung 0,04", "Aussparung in Schalung bis Ø 15 cm", [["013.05.003.01001", 1.0]], True),
             o("Aussparung 0,25", "Aussparung in Schalung bis 0,25 m²", [["013.05.003.02001", 1.0]], True),
             o("Aussparung 1,0", "Aussparung in Schalung bis 1,0 m²", [["013.05.003.03001", 1.0]], True),
             o("Revision 300", "Revisionsklappe Unterdecke 300 × 300 mm", [["039.02.004.01001", 1.0]]),
             o("Revision 600", "Revisionsklappe Unterdecke 600 × 600 mm", [["039.02.004.02001", 1.0]]),
             o("Revision EI 30", "Revisionsklappe EI 30, 300 × 300 mm", [["039.02.004.03001", 1.0]]),
             o("Revision EI 90", "Revisionsklappe EI 90, 600 × 600 mm", [["039.02.004.04001", 1.0]])]},
     ], "tags": ["neubau", "altbau"]},

    # ============================================================ KG 353 Deckenbeläge
    {"id": "353.01", "kg": "353", "name": "Estrich + Fliesen", "einheit": "m²",
     "lang": "Bodenaufbau auf Rohdecke: Dämmschicht, schwimmender Estrich mit Randdämmstreifen, Bodenfliesen im "
             "Dünnbett mit Sockel.",
     "bezug": "Bodenfläche (lichte Raummaße)",
     "fest": EST_FEST + [["024.04.001.01001", 0.3]],
     "schichten": [
         {"name": "Dämmung", "optionen": DAEMM_EST},
         {"name": "Estrich", "optionen": ESTRICH},
         {"name": "Fliesen", "optionen": [
             o("FSZ 30×60", "Feinsteinzeug 30 × 60 cm, R9, bis 30 €/m²", [["024.03.001.02001", 1.0]], True),
             o("FSZ 60×60", "Feinsteinzeug 60 × 60 cm, R9, bis 40 €/m²", [["024.03.001.04001", 1.0]], True),
             o("FSZ 60×120", "Feinsteinzeug 60 × 120 cm, R9, bis 60 €/m²", [["024.03.001.05001", 1.0]], True),
             o("FSZ 20×120", "Feinsteinzeug Holzoptik 20 × 120 cm", [["024.03.007.03001", 1.0]], True),
             o("Fliesen 30×30", "Bodenfliesen 30 × 30 cm, R10", [["024.03.001.01001", 1.0]]),
             o("FSZ 30×60 geh.", "Feinsteinzeug 30 × 60 cm, bis 50 €/m²", [["024.03.001.03001", 1.0]]),
             o("FSZ 120×120", "Feinsteinzeug 120 × 120 cm, bis 80 €/m²", [["024.03.001.06001", 1.0]]),
             o("Fliesen 20×20", "Bodenfliesen 20 × 20 cm", [["024.03.007.01001", 1.0]])]},
         {"name": "Sockel", "optionen": [
             o("Sockel 6 cm", "Fliesensockel 6 cm", [["024.03.003.01001", 0.7]], True),
             o("Sockel 10 cm", "Fliesensockel 10 cm", [["024.03.003.02001", 0.7]]),
             o("", "ohne Sockel", [])]},
     ], "tags": ["neubau"]},

    {"id": "353.02", "kg": "353", "name": "Estrich + Parkett", "einheit": "m²",
     "lang": "Bodenaufbau auf Rohdecke: Dämmschicht, schwimmender Estrich, Parkett schwimmend oder vollflächig "
             "verklebt (Massivparkett geschliffen und versiegelt bzw. geölt), Sockelleiste.",
     "bezug": "Bodenfläche (lichte Raummaße)",
     "fest": EST_FEST,
     "schichten": [
         {"name": "Dämmung", "optionen": DAEMM_EST},
         {"name": "Estrich", "optionen": ESTRICH},
         {"name": "Parkett", "optionen": [
             o("FP schwimmend", "Fertigparkett, Nutzschicht 3,5 mm, schwimmend, Material ≤ 35 €",
               [["028.02.003.04001", 1.0], ["028.01.002.01001", 1.0]], True),
             o("FP verklebt", "Fertigparkett, Nutzschicht 3,5 mm, verklebt, Material ≤ 45 €",
               [["028.02.003.02001", 1.0], ["028.01.001.01001", 1.0]], True),
             o("FP verklebt geh.", "Fertigparkett, Nutzschicht 4 mm, verklebt, Material ≤ 70 €",
               [["028.02.003.03001", 1.0], ["028.01.001.01001", 1.0]], True),
             o("Stabparkett", "Eiche Stabparkett Schiffsverband 22 mm, geschliffen, versiegelt",
               [["028.02.004.01001", 1.0], ["028.01.001.01001", 1.0], ["028.02.006.01001", 1.0]], True),
             o("Fischgrät massiv", "Eiche Stabparkett Fischgrät 22 mm, geschliffen, versiegelt",
               [["028.02.004.02001", 1.0], ["028.01.001.01001", 1.0], ["028.02.006.01001", 1.0]]),
             o("FP Fischgrät", "Fertigparkett Eiche Fischgrät, Nutzschicht 2,5 mm, verklebt",
               [["028.02.008.01001", 1.0], ["028.01.001.01001", 1.0]]),
             o("Mosaikparkett", "Eiche Mosaikparkett 8 mm, geschliffen, versiegelt",
               [["028.02.004.03001", 1.0], ["028.01.001.01001", 1.0], ["028.02.006.01001", 1.0]]),
             o("Landhausdiele", "Massivholzdiele Eiche 180 mm, verklebt, geölt",
               [["028.02.009.02001", 1.0], ["028.01.001.01001", 1.0], ["028.02.006.02001", 1.0]]),
             o("Industrieparkett", "Hochkantlamelle Eiche 16 mm, geschliffen, versiegelt",
               [["028.02.004.04001", 1.0], ["028.01.001.01001", 1.0], ["028.02.006.01001", 1.0]])]},
         {"name": "Sockel", "optionen": [
             o("Sockel Eiche", "Sockelleiste Eiche massiv 60 mm", [["028.03.003.01001", 0.7]], True),
             o("Sockel MDF weiß", "Sockelleiste MDF weiß foliert 80 mm", [["028.03.003.02001", 0.7]], True),
             o("", "ohne Sockel", [])]},
     ], "tags": ["neubau"]},

    {"id": "353.03", "kg": "353", "name": "Estrich + elastischer Belag", "einheit": "m²",
     "lang": "Bodenaufbau auf Rohdecke: Dämmschicht, schwimmender Estrich, Untergrund grundiert und gespachtelt, "
             "elastischer Bodenbelag verklebt, Sockel und Erstpflege.",
     "bezug": "Bodenfläche (lichte Raummaße)",
     "fest": EST_FEST + ELAST_VORB + [["036.04.006.01001", 1.0]],
     "schichten": [
         {"name": "Dämmung", "optionen": DAEMM_EST},
         {"name": "Estrich", "optionen": ESTRICH},
         {"name": "Belag", "optionen": [
             o("Linoleum 2,5", "Linoleum 2,5 mm, Bahnenware", [["036.02.001.01001", 1.0]], True),
             o("PVC homogen", "PVC homogen 2,0 mm, verschweißt", [["036.02.002.01001", 1.0]], True),
             o("Vinyl LVT", "Designbelag Vinyl, Nutzschicht 0,55 mm", [["036.02.003.01001", 1.0]], True),
             o("Kautschuk 2,0", "Kautschukbelag 2,0 mm, glatt", [["036.02.004.01001", 1.0]], True),
             o("Linoleum 3,2", "Linoleum 3,2 mm, Bahnenware", [["036.02.001.02001", 1.0]]),
             o("Vinyl LVT 0,7", "Designbelag Vinyl, Nutzschicht 0,7 mm", [["036.02.003.03001", 1.0]]),
             o("PVC heterogen", "PVC heterogen 2,0 mm, verschweißt", [["036.02.009.01001", 1.0]]),
             o("Linoleumfliesen", "Linoleumfliesen 2,5 mm, 50 × 50 cm", [["036.02.008.01001", 1.0]]),
             o("Sicherheitsbelag", "PVC-Sicherheitsbelag R10", [["036.02.005.01001", 1.0]]),
             o("ESD-Belag", "leitfähiger Belag (ESD) mit Kupferband", [["036.02.007.01001", 1.0]])]},
         {"name": "Sockel", "optionen": [
             o("Sockel Kunststoff", "Sockelleiste Kunststoff 60 mm", [["036.04.003.01001", 0.7]], True),
             o("Hohlkehlsockel", "Hohlkehlsockel aus Belag 10 cm", [["036.02.006.01001", 0.7]], True),
             o("Sockel MDF weiß", "Sockelleiste MDF weiß foliert", [["036.04.003.03001", 0.7]])]},
     ], "tags": ["neubau"]},

    {"id": "353.04", "kg": "353", "name": "Estrich + Textilbelag", "einheit": "m²",
     "lang": "Bodenaufbau auf Rohdecke: Dämmschicht, schwimmender Estrich, Untergrund grundiert und gespachtelt, "
             "textiler Bodenbelag als Bahnenware oder Fliesen, Sockel.",
     "bezug": "Bodenfläche (lichte Raummaße)",
     "fest": EST_FEST + ELAST_VORB,
     "schichten": [
         {"name": "Dämmung", "optionen": DAEMM_EST},
         {"name": "Estrich", "optionen": ESTRICH},
         {"name": "Belag", "optionen": [
             o("Teppich Bahn", "Tufting-Schlinge, Bahnenware, Material ≤ 20 €/m²", [["036.03.001.01001", 1.0]], True),
             o("Teppichfliesen", "Teppichfliesen 50 × 50 cm, fixiert", [["036.03.001.02001", 1.0]], True),
             o("TF Velours 33", "Teppichfliesen Tufting-Velours, Klasse 33", [["036.03.004.02001", 1.0]], True),
             o("Nadelvlies 4", "Nadelvlies-Belag 4 mm, Bahnenware", [["036.03.005.01001", 1.0]], True),
             o("TF Schlinge 33", "Teppichfliesen Tufting-Schlinge, Klasse 33", [["036.03.004.01001", 1.0]]),
             o("Sisal", "Naturfaserbelag Sisal, verklebt", [["036.03.006.01001", 1.0]]),
             o("Kokos", "Naturfaserbelag Kokos, verklebt", [["036.03.006.02001", 1.0]]),
             o("Schurwolle", "Schurwolle-Flachgewebe, verklebt", [["036.03.006.03001", 1.0]])]},
         {"name": "Sockel", "optionen": [
             o("Sockel Kunststoff", "Sockelleiste Kunststoff 60 mm", [["036.04.003.01001", 0.7]], True),
             o("Belagsstreifen", "Sockel aus Belagsstreifen mit Abschlussprofil", [["036.04.003.04001", 0.7]])]},
     ], "tags": ["neubau"]},

    {"id": "353.05", "kg": "353", "name": "Heizestrich + Belag", "einheit": "m²",
     "lang": "Bodenaufbau für Fußbodenheizung: Dämmschicht, Heizestrich Bauart A mit Bewegungsfugen, "
             "Belegreifheizen und CM-Messung, Bodenbelag mit Sockel. Heizrohre gesondert (KG 423).",
     "bezug": "beheizte Bodenfläche (lichte Raummaße)",
     "fest": EST_FEST + [["025.04.001.01001", 0.1], ["025.04.003.01001", 0.01], ["025.04.004.01001", 0.02]],
     "schichten": [
         {"name": "Dämmung", "optionen": [
             o("EPS 40 + T", "Wärmedämmung EPS 40 mm + Trittschalldämmung EPS-T 30-2",
               [["025.01.001.01001", 1.0], ["025.01.002.01001", 1.0]], True),
             o("EPS 60 + T", "Wärmedämmung EPS 60 mm + Trittschalldämmung EPS-T 30-2",
               [["025.01.001.02001", 1.0], ["025.01.002.01001", 1.0]], True),
             o("EPS 100 + T", "Wärmedämmung EPS 100 mm + Trittschalldämmung EPS-T (gegen unbeheizt)",
               [["025.01.001.04001", 1.0], ["025.01.002.01001", 1.0]])]},
         {"name": "Heizestrich", "optionen": [
             o("ZE-Heiz 45", "Zement-Heizestrich 45 mm über Rohr", [["025.02.002.01001", 1.0]], True),
             o("CA-Heiz 35", "CA-Fließestrich als Heizestrich 35 mm über Rohr, angeschliffen, grundiert",
               [["025.03.002.01001", 1.0], ["025.03.003.01001", 1.0], ["024.01.001.01001", 1.0]], True),
             o("ZE-Heiz 50", "Zement-Heizestrich 50 mm über Rohr", [["025.02.002.02001", 1.0]]),
             o("CA-Heiz 40", "CA-Fließestrich als Heizestrich 40 mm über Rohr, angeschliffen, grundiert",
               [["025.03.002.02001", 1.0], ["025.03.003.01001", 1.0], ["024.01.001.01001", 1.0]])]},
         {"name": "Belag", "optionen": [
             o("Fliesen 60×60", "Feinsteinzeug 60 × 60 cm, Sockel 6 cm",
               [["024.03.001.04001", 1.0], ["024.03.003.01001", 0.7]], True),
             o("Parkett verklebt", "Fertigparkett verklebt, Material ≤ 45 €, Sockel Eiche",
               [["028.02.003.02001", 1.0], ["028.01.001.01001", 1.0], ["028.03.003.01001", 0.7]], True),
             o("Vinyl LVT", "Designbelag Vinyl 0,55 mm, Spachtelung, Sockel",
               [["036.02.003.01001", 1.0], ["036.01.001.02001", 1.0], ["036.01.001.03001", 1.0], ["036.04.003.01001", 0.7]], True),
             o("Linoleum", "Linoleum 2,5 mm, Spachtelung, Sockel",
               [["036.02.001.01001", 1.0], ["036.01.001.02001", 1.0], ["036.01.001.03001", 1.0], ["036.04.003.01001", 0.7]], True),
             o("Fliesen 30×60", "Feinsteinzeug 30 × 60 cm, Sockel 6 cm",
               [["024.03.001.02001", 1.0], ["024.03.003.01001", 0.7]]),
             o("Naturstein", "Naturstein Jura-Kalkstein 30 × 60 cm, Sockel",
               [["014.02.001.02001", 1.0], ["014.02.002.01001", 0.7]])]},
     ], "tags": ["neubau"]},

    {"id": "353.06", "kg": "353", "name": "Nutzestrich / Bodenbeschichtung", "einheit": "m²",
     "lang": "Strapazierfähiger Bodenaufbau für Keller-, Technik-, Lager- und Werkstattflächen: Nutz-, Verbund-, "
             "Sicht- oder Gussasphaltestrich, wahlweise mit Reaktionsharzbeschichtung.",
     "bezug": "Bodenfläche (lichte Raummaße)",
     "fest": [["025.01.006.01001", 0.5]],
     "schichten": [
         {"name": "Dämmung", "optionen": [
             o("", "ohne Dämmung (Verbund bzw. auf Trennlage)", [["025.01.005.01001", 1.0]], True),
             o("EPS 40 + T", "Wärmedämmung EPS 40 mm + Trittschalldämmung EPS-T",
               [["025.01.001.01001", 1.0], ["025.01.002.01001", 1.0], ["025.01.005.01001", 1.0]], True)]},
         {"name": "Estrich", "optionen": [
             o("Nutzestrich 50", "Zementestrich als Nutzestrich geglättet, 50 mm", [["025.02.007.01001", 1.0]], True),
             o("Verbund + Hartst.", "Verbundestrich CT-C30-F5 30 mm mit Hartstoffeinstreuung",
               [["025.02.003.01001", 1.0], ["025.03.006.01001", 1.0]], True),
             o("Sichtestrich 60", "Sichtestrich geschliffen und versiegelt, 60 mm", [["025.02.008.01001", 1.0]], True),
             o("Nutzestrich 70", "Zementestrich als Nutzestrich geglättet, 70 mm", [["025.02.007.02001", 1.0]]),
             o("Gussasphalt 25", "Gussasphaltestrich AS-IC15, 25 mm", [["025.03.004.01001", 1.0]]),
             o("Kunstharz EP 5", "Kunstharzestrich Epoxid, 5 mm, auf Verbundestrich",
               [["025.02.003.01001", 1.0], ["025.03.009.01001", 1.0]])]},
         {"name": "Beschichtung", "optionen": [
             o("", "", [], True),
             o("EP-Versiegelung", "2K-Epoxid-Versiegelung zweimal", [["034.04.007.01001", 1.0]], True),
             o("EP R11", "Epoxid-Beschichtung abgestreut, rutschhemmend", [["034.04.007.02001", 1.0]], True),
             o("PU 2 mm", "PU-Verlaufsbeschichtung 2 mm", [["034.04.007.03001", 1.0]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "353.07", "kg": "353", "name": "Trockenestrich + Belag", "einheit": "m²",
     "lang": "Trockener Bodenaufbau für Holzbalkendecken und Bestand: Ausgleichsschüttung, Trockenestrichelemente, "
             "Bodenbelag mit Sockel.",
     "bezug": "Bodenfläche (lichte Raummaße)",
     "fest": [["025.01.006.01001", 0.7]],
     "schichten": [
         {"name": "Ausgleich", "optionen": [
             o("Schüttung 30", "Trockenschüttung lose bis 30 mm", [["025.01.004.01001", 1.0]], True),
             o("Schüttung 60", "Trockenschüttung lose bis 60 mm", [["025.01.004.02001", 1.0]], True),
             o("Rieselsch.+Schütt.", "Rieselschutz und Schüttung auf Holzbalkendecke", [["025.01.011.01001", 1.0]]),
             o("", "ohne Ausgleich", [])]},
         {"name": "Trockenestrich", "optionen": [
             o("GF 20", "Gipsfaser-Estrichelemente 20 mm", [["025.03.005.01001", 1.0]], True),
             o("GF 25", "Gipsfaser-Estrichelemente 25 mm", [["025.03.005.02001", 1.0]], True),
             o("GF 30 + HF", "Gipsfaser-Estrichelemente 30 mm, holzfaserkaschiert", [["025.03.005.03001", 1.0]]),
             o("Spanplatte 22", "Spanplatte P5 22 mm", [["025.03.011.01001", 1.0]]),
             o("OSB 22", "OSB/4 22 mm", [["025.03.011.02001", 1.0]]),
             o("Zementspan 24", "Zementspanplatte 24 mm", [["025.03.011.03001", 1.0]])]},
         {"name": "Belag", "optionen": [
             o("Fliesen + Entk.", "Entkopplungsmatte, Feinsteinzeug 60 × 60 cm, Sockel",
               [["024.01.006.01001", 1.0], ["024.03.001.04001", 1.0], ["024.03.003.01001", 0.7]], True),
             o("Parkett schwimmend", "Fertigparkett schwimmend auf Holzfaserunterlage, Sockel MDF",
               [["028.02.003.04001", 1.0], ["028.01.002.02001", 1.0], ["028.03.003.02001", 0.7]], True),
             o("Vinyl-Klick", "Vinyl-Klickboden 0,55 mm, Sockel MDF",
               [["036.02.010.02001", 1.0], ["036.04.003.03001", 0.7]], True),
             o("Linoleum", "Linoleum 2,5 mm, Spachtelung, Sockel",
               [["036.02.001.01001", 1.0], ["036.01.001.02001", 1.0], ["036.01.001.03001", 1.0], ["036.04.003.01001", 0.7]], True),
             o("Laminat", "Laminat NK 33 auf Unterlage, Sockel MDF",
               [["036.04.001.02001", 1.0], ["028.01.002.01001", 1.0], ["036.04.003.03001", 0.7]])]},
     ], "tags": ["altbau", "neubau"]},

    {"id": "353.08", "kg": "353", "name": "Estrich + Naturstein", "einheit": "m²",
     "lang": "Bodenaufbau auf Rohdecke: Dämmschicht, schwimmender Estrich, Naturstein- oder Werksteinbelag "
             "mit Sockel, wahlweise imprägniert.",
     "bezug": "Bodenfläche (lichte Raummaße)",
     "fest": EST_FEST,
     "schichten": [
         {"name": "Dämmung", "optionen": [DAEMM_EST[0], DAEMM_EST[3]]},
         {"name": "Estrich", "optionen": ESTRICH},
         {"name": "Belag", "optionen": [
             o("Granit", "Granit geschliffen/poliert, 2 cm, 30 × 60", [["014.02.001.01001", 1.0]], True),
             o("Jura-Kalkstein", "Jura-Kalkstein geschliffen, 2 cm, 30 × 60", [["014.02.001.02001", 1.0]], True),
             o("Betonwerkstein", "Betonwerkstein geschliffen, 3 cm, im Mörtelbett", [["014.02.001.04001", 1.0]], True),
             o("Terrazzo", "Terrazzo-Fertigplatten 3 cm, im Mörtelbett", [["014.02.001.05001", 1.0]], True),
             o("Solnhofener", "Solnhofener Platten gespalten 1,5 cm", [["014.02.001.03001", 1.0]])]},
         {"name": "Sockel", "optionen": [
             o("Sockel NS", "Natursteinsockel h = 6–8 cm", [["014.02.002.01001", 0.7]], True),
             o("", "ohne Sockel", [])]},
         {"name": "Pflege", "optionen": [
             o("", "", [], True),
             o("imprägniert", "Imprägnierung öl- und wasserabweisend", [["014.06.007.01001", 1.0]], True)]},
     ], "tags": ["neubau"]},

    {"id": "353.09", "kg": "353", "name": "Bodenbelag Nassraum", "einheit": "m²",
     "lang": "Bodenaufbau für Bäder, Duschen und Nassräume: Dämmung, Zementestrich, Verbundabdichtung "
             "mit Dichtbändern und -ecken nach DIN 18534, Fliesen oder Nassraumbelag mit Sockel.",
     "bezug": "Bodenfläche (lichte Raummaße)",
     "fest": EST_FEST + [["025.01.001.01001", 1.0], ["025.01.002.01001", 1.0], ["024.04.001.01001", 0.7]],
     "schichten": [
         {"name": "Estrich", "optionen": [
             o("ZE 50", "Zementestrich 50 mm", [["025.02.001.02001", 1.0]], True),
             o("ZE 50 + Gefälle", "Zementestrich 50 mm, Fliesen im Gefälle verlegt",
               [["025.02.001.02001", 1.0], ["024.03.012.01001", 1.0]], True),
             o("Gefälleestrich", "Gefälleestrich i. M. 40 mm auf Zementestrich 45 mm",
               [["025.02.001.01001", 1.0], ["025.02.005.01001", 1.0]])]},
         {"name": "Abdichtung", "optionen": [
             o("W2-I", "Verbundabdichtung Dichtschlämme W2-I mit Dichtband und -ecken",
               [["024.01.002.02001", 1.0], ["024.01.003.01001", 0.7], ["024.01.003.02001", 0.3]], True),
             o("W3-I", "Verbundabdichtung Dichtbahn W3-I mit Dichtband und -ecken",
               [["024.01.002.03001", 1.0], ["024.01.003.01001", 0.7], ["024.01.003.02001", 0.3]], True),
             o("", "ohne Abdichtung", [])]},
         {"name": "Belag", "optionen": [
             o("Fliesen 30×30 R10", "Bodenfliesen 30 × 30 cm, R10, Sockel 10 cm",
               [["024.03.001.01001", 1.0], ["024.03.003.02001", 0.7]], True),
             o("Fliesen 20×20", "Bodenfliesen 20 × 20 cm, Sockel 10 cm",
               [["024.03.007.01001", 1.0], ["024.03.003.02001", 0.7]], True),
             o("FSZ 60×60", "Feinsteinzeug 60 × 60 cm, Sockel 10 cm",
               [["024.03.001.04001", 1.0], ["024.03.003.02001", 0.7]], True),
             o("PVC R11 Hochzug", "Nassraumbelag PVC R11 mit Hochzug und Sockelkehle", [["036.02.011.02001", 1.0]], True),
             o("Mittelbett 30×30", "Bodenfliesen im Mittelbett 30 × 30 cm, Sockel",
               [["024.03.002.01001", 1.0], ["024.03.003.02001", 0.7]]),
             o("PVC R10 Hochzug", "Nassraumbelag PVC R10 mit Hochzug und Sockelkehle", [["036.02.011.01001", 1.0]]),
             o("Industriefliesen", "Spaltplatten 20 × 20 cm, Hohlkehlsockel",
               [["024.03.009.02001", 1.0], ["024.03.010.01001", 0.7]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "353.10", "kg": "353", "name": "Bodenbelag erneuern Bestand", "einheit": "m²",
     "lang": "Erneuerung des Bodenbelags auf vorhandenem Estrich: Altbelag entfernen, Untergrund anschleifen, "
             "grundieren und spachteln, neuer Belag mit Sockelleiste.",
     "bezug": "Bodenfläche (lichte Raummaße)",
     "fest": [["036.01.001.02001", 1.0], ["036.04.003.03001", 0.7]],
     "schichten": [
         {"name": "Rückbau", "optionen": [
             o("Textil ab", "Altbelag textil verklebt entfernen", [["036.01.002.01001", 1.0]], True),
             o("PVC/Lino ab", "Altbelag PVC/Linoleum verklebt entfernen", [["036.01.002.02001", 1.0]], True),
             o("Laminat ab", "Laminat/Fertigparkett schwimmend entfernen", [["036.01.002.03001", 1.0]], True),
             o("Fliesen ab", "Bodenfliesen abschlagen, Ausgleich faserarmiert ≤ 10 mm",
               [["024.04.006.02001", 1.0], ["036.01.001.05001", 1.0]])]},
         {"name": "Untergrund", "optionen": [
             o("Spachtel 2 mm", "Estrich anschleifen, Spachtelung bis 2 mm",
               [["036.01.001.01001", 1.0], ["036.01.001.03001", 1.0]], True),
             o("Spachtel 5 mm", "Estrich anschleifen, Spachtelung bis 5 mm",
               [["036.01.001.01001", 1.0], ["036.01.001.04001", 1.0]], True),
             o("Dünnestrich 10", "Renovierestrich 10 mm auf Altuntergrund", [["025.03.008.01001", 1.0]])]},
         {"name": "Belag", "optionen": [
             o("Vinyl LVT", "Designbelag Vinyl 0,55 mm, Bestand", [["036.02.003.01002", 1.0]], True),
             o("Linoleum", "Linoleum 2,5 mm", [["036.02.001.01001", 1.0]], True),
             o("Vinyl-Klick", "Vinyl-Klickboden 0,55 mm, schwimmend", [["036.02.010.02001", 1.0]], True),
             o("Parkett schwimmend", "Fertigparkett schwimmend auf Holzfaserunterlage",
               [["028.02.003.04001", 1.0], ["028.01.002.02001", 1.0]], True),
             o("Teppich", "Teppichboden Bahnenware", [["036.03.001.01001", 1.0]]),
             o("Fliesen 60×60", "Feinsteinzeug 60 × 60 cm, Bestand", [["024.03.001.04002", 1.0]])]},
     ], "tags": ["altbau"]},

    {"id": "353.11", "kg": "353", "name": "Estrich + Laminat/Vinyl-Klick", "einheit": "m²",
     "lang": "Einfacher Bodenaufbau im Wohnungsbau: Trittschalldämmung, schwimmender Estrich, schwimmend verlegter "
             "Klickbelag auf Unterlage, Sockelleiste.",
     "bezug": "Bodenfläche (lichte Raummaße)",
     "fest": EST_FEST,
     "schichten": [
         {"name": "Dämmung", "optionen": [DAEMM_EST[0], DAEMM_EST[2]]},
         {"name": "Estrich", "optionen": [
             o("ZE 45", "Zementestrich CT-C25-F4 45 mm", [["025.02.001.01001", 1.0]], True),
             o("CA 35", "Calciumsulfat-Fließestrich 35 mm, angeschliffen",
               [["025.03.001.01001", 1.0], ["025.03.003.01001", 1.0]], True)]},
         {"name": "Belag", "optionen": [
             o("Laminat NK 32", "Laminat NK 32, Material ≤ 18 €/m²", [["036.04.001.01001", 1.0], ["028.01.002.01001", 1.0]], True),
             o("Laminat NK 33", "Laminat NK 33, Material ≤ 25 €/m²", [["036.04.001.02001", 1.0], ["028.01.002.01001", 1.0]], True),
             o("Vinyl-Klick 0,3", "Vinyl-Klickboden 0,3 mm", [["036.02.010.01001", 1.0], ["028.01.002.01001", 1.0]], True),
             o("Vinyl-Klick 0,55", "Vinyl-Klickboden 0,55 mm", [["036.02.010.02001", 1.0], ["028.01.002.01001", 1.0]], True),
             o("Kork-Klick", "Kork-Fertigelement mit Klickverbindung", [["036.04.002.02001", 1.0], ["028.01.002.02001", 1.0]])]},
         {"name": "Sockel", "optionen": [
             o("Sockel MDF", "Sockelleiste MDF weiß foliert 60 mm", [["036.04.003.03001", 0.7]], True),
             o("Sockel m. Kanal", "Sockelleiste Kunststoff mit Kabelkanal", [["036.04.007.01001", 0.7]], True)]},
     ], "tags": ["neubau"]},

    {"id": "353.12", "kg": "353", "name": "Holzdielenboden", "einheit": "m²",
     "lang": "Massivholzdielen auf Lagerhölzern mit Dämmstreifen bzw. Dämmung, verschraubt, geschliffen und "
             "geölt oder versiegelt, mit Sockelleiste.",
     "bezug": "Bodenfläche (lichte Raummaße)",
     "fest": [["027.03.004.02001", 0.7]],
     "schichten": [
         {"name": "Unterbau", "optionen": [
             o("Lagerhölzer", "Lagerhölzer 40/60 mm mit Dämmstreifen", [["028.02.002.01001", 1.0]], True),
             o("Lagerholz gedämmt", "Lagerhölzer mit Dämmung im Zwischenraum", [["016.05.011.01001", 1.0]], True)]},
         {"name": "Dielen", "optionen": [
             o("Fichte 28", "Massivholzdielen Fichte/Kiefer 28 mm", [["028.02.001.01001", 1.0]], True),
             o("Lärche 27", "Massivholzdielen Lärche 27 mm", [["028.02.001.02001", 1.0]], True),
             o("Eiche 21", "Massivholzdielen Eiche 21 mm", [["028.02.001.03001", 1.0]], True)]},
         {"name": "Oberfläche", "optionen": [
             o("geölt", "Hartwachsöl zweimal", [["028.02.006.02001", 1.0]], True),
             o("versiegelt", "Wasserlack seidenmatt dreimal", [["028.02.006.01001", 1.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "353.13", "kg": "353", "name": "Treppenbelag je Stufe", "einheit": "St",
     "lang": "Belag von Tritt- und Setzstufe auf Massivtreppe (Breite bis ca. 1,0–1,25 m), wahlweise mit "
             "Estrich-Ausgleich auf der Stufe.",
     "bezug": "Stück je Stufe (Tritt- und Setzstufe)",
     "schichten": [
         {"name": "Belag", "optionen": [
             o("Fliesen", "Feinsteinzeug Tritt- und Setzstufe, bis 1,0 m", [["024.03.004.01001", 1.0]], True),
             o("Granit", "Trittstufe Granit 3 cm + Setzstufe Naturstein, bis 1,0 m",
               [["014.03.001.01001", 1.0], ["014.03.002.01001", 1.0]], True),
             o("Betonwerkstein", "Trittstufe Betonwerkstein 3 cm + Setzstufe, bis 1,25 m",
               [["014.03.001.04001", 1.0], ["014.03.002.02001", 1.0]], True),
             o("Holz Buche 40", "Trittstufe Buche 40 mm mit Setzstufe, lackiert", [["027.03.006.02001", 1.0]], True),
             o("Parkett", "Tritt- und Setzstufe mit Parkett, bis 1,0 m", [["028.03.005.01001", 1.0]], True),
             o("Linoleum/PVC", "Treppenstufe Linoleum bzw. PVC, bis 1,2 m", [["036.04.004.01001", 1.0]], True),
             o("Kautschuk", "Kautschuk-Formstufe, bis 1,2 m", [["036.04.004.02001", 1.0]], True),
             o("Fliesen ≤ 1,5", "Feinsteinzeug Tritt- und Setzstufe, bis 1,5 m", [["024.03.004.02001", 1.0]]),
             o("Jura", "Trittstufe Jura-Kalkstein 3 cm + Setzstufe",
               [["014.03.001.03001", 1.0], ["014.03.002.01001", 1.0]]),
             o("Holz Buche 30", "Trittstufe Buche 30 mm mit Setzstufe, lackiert", [["027.03.006.01001", 1.0]]),
             o("Teppich", "Treppenstufe Teppich, bis 1,2 m", [["036.04.004.03001", 1.0]])]},
         {"name": "Untergrund", "optionen": [
             o("", "", [], True),
             o("Estrich Stufe", "Estrich auf Treppenstufe bis 50 mm", [["025.02.009.01001", 1.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "353.14", "kg": "353", "name": "Systemboden + Belag", "einheit": "m²",
     "lang": "Hohl- oder Doppelboden auf Rohdecke mit Randanschlüssen und Erdung, Bodenbelag, wahlweise mit "
             "Bodentankeinsätzen, für Büro- und Technikflächen.",
     "bezug": "Bodenfläche (lichte Raummaße)",
     "fest": [["036.04.003.02001", 0.4]],
     "schichten": [
         {"name": "Systemboden", "optionen": [
             o("Hohlboden 150", "Hohlboden Fließestrich, Höhe 150 mm, EK 2", [["039.07.001.01001", 1.0]], True),
             o("Hohlboden 250", "Hohlboden Fließestrich, Höhe 250 mm, EK 3", [["039.07.001.02001", 1.0]], True),
             o("DB CaSO4 200", "Doppelboden Calciumsulfat, Höhe 200 mm, EK 2", [["039.07.001.03001", 1.0]], True),
             o("DB Holz 200", "Doppelboden Holzwerkstoff, Höhe 200 mm, EK 2", [["039.07.001.05001", 1.0]], True),
             o("DB CaSO4 400", "Doppelboden Calciumsulfat, Höhe 400 mm, EK 3", [["039.07.001.04001", 1.0]])]},
         {"name": "Belag", "optionen": [
             o("Teppichfliesen", "Teppichfliesen Tufting-Schlinge, Klasse 33", [["036.03.004.01001", 1.0]], True),
             o("Vinyl LVT", "Designbelag Vinyl 0,55 mm", [["036.02.003.01001", 1.0], ["036.01.001.02001", 1.0]], True),
             o("Linoleum", "Linoleum 2,5 mm, gespachtelt", [["036.02.001.01001", 1.0], ["036.01.001.02001", 1.0],
                                                          ["036.01.001.03001", 1.0]], True),
             o("Kautschuk", "Kautschukbelag 2,0 mm", [["036.02.004.01001", 1.0], ["036.01.001.02001", 1.0]]),
             o("ESD-Belag", "leitfähiger Belag (ESD)", [["036.02.007.01001", 1.0]])]},
         {"name": "Bodentanks", "optionen": [
             o("", "", [], True),
             o("Bodentanks", "Revisions-/Bodentankeinsatz bis 300 × 300, 1 je 20 m²", [["039.07.002.01001", 0.05]], True)]},
     ], "tags": ["neubau"]},

    # ============================================================ KG 354 Deckenbekleidungen
    {"id": "354.01", "kg": "354", "name": "Deckenputz mit Anstrich", "einheit": "m²",
     "lang": "Deckenbekleidung auf Betondecken: Haftbrücke, Deckenputz bzw. Spachtelung, Beschichtung.",
     "bezug": "Deckenfläche (lichte Raummaße)",
     "schichten": [
         {"name": "Untergrund", "optionen": [
             o("Haftbrücke", "Haftbrücke auf Beton", [["023.01.001.02001", 1.0]], True),
             o("", "ohne Vorbehandlung", [], True)]},
         {"name": "Putz", "optionen": [
             o("Gipsputz 8", "Deckenputz Gipsputz 8 mm", [["023.02.002.01001", 1.0]], True),
             o("Gipsputz 12", "Deckenputz Gipsputz 12 mm", [["023.02.002.02001", 1.0]], True),
             o("Dünnlagenputz", "Dünnlagenputz/Flächenspachtel 3–5 mm", [["023.02.003.01001", 1.0]], True),
             o("KZ-Putz 12", "Deckenputz Kalkzementputz 12 mm", [["023.02.002.03001", 1.0]]),
             o("Spachtel Q3", "Spachtelung Q3 auf Betonfertigteil/Filigran", [["034.02.013.02001", 1.0]]),
             o("Spachtel Q4", "Spachtelung Q4 vollflächig", [["034.02.013.04001", 1.0]]),
             o("", "Sichtbeton ohne Putz", [])]},
         {"name": "Oberfläche", "optionen": [
             o("Anstrich", "Dispersionsanstrich Decke", [["034.02.001.03001", 1.0]], True),
             o("Raufaser + Disp.", "Raufaser an Decken, Dispersionsanstrich",
               [["037.02.001.02001", 1.0], ["034.02.001.03001", 1.0]], True),
             o("Vlies + Disp.", "Malervlies an Decken, Dispersionsanstrich",
               [["037.02.001.04001", 1.0], ["034.02.001.03001", 1.0]], True),
             o("Silikat", "Silikatanstrich zweimal", [["034.02.002.01001", 1.0]]),
             o("Kalk", "Kalkanstrich zweimal", [["034.02.007.01001", 1.0]]),
             o("Betonlasur", "Betonlasur auf Sichtbeton", [["034.04.006.01001", 1.0]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "354.02", "kg": "354", "name": "Abgehängte GK-Decke", "einheit": "m²",
     "lang": "Unterdecke nach DIN 18181 mit CD-Unterkonstruktion abgehängt oder direkt befestigt, beplankt, "
             "wahlweise mit Hohlraumdämmung, Schattenfuge und Ausschnitten, mit Beschichtung.",
     "bezug": "Deckenfläche (lichte Raummaße), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Decke", "optionen": [
             o("GK ≤ 50 1×", "abgehängt ≤ 50 cm, 1 × 12,5 mm GKB", [["039.04.003.01001", 1.0]], True),
             o("GK ≤ 100 1×", "abgehängt ≤ 100 cm, 1 × 12,5 mm GKB", [["039.04.003.02001", 1.0]], True),
             o("GK ≤ 50 2×", "abgehängt ≤ 50 cm, 2 × 12,5 mm GKB", [["039.04.003.03001", 1.0]], True),
             o("GK direkt", "direkt befestigt, 1 × 12,5 mm GKB", [["039.04.004.01001", 1.0]]),
             o("GF direkt", "direkt befestigt, Gipsfaserplatte 12,5 mm", [["039.04.004.02001", 1.0]]),
             o("Feuchtraum zem.", "Feuchtraum-Unterdecke zementgebunden ≤ 50 cm", [["039.04.014.01001", 1.0]])]},
         {"name": "Dämmung", "optionen": [
             o("", "", [], True),
             o("MW 40", "Hohlraumdämmung Mineralwolle 40 mm", [["039.04.002.01001", 1.0]], True),
             o("MW 100", "Hohlraumdämmung Mineralwolle 100 mm", [["039.04.002.02001", 1.0]])]},
         {"name": "Oberfläche", "optionen": DECKE_OBERFL},
         {"name": "Zulagen", "optionen": [
             o("Schattenfuge", "Schattenfuge/Randabschlussprofil (0,4 m/m²)", [["039.04.010.01001", 0.4]], True),
             o("Schattenf.+Ausschn", "Schattenfuge und Ausschnitte für Einbauleuchten (0,3 St/m²)",
               [["039.04.010.01001", 0.4], ["039.02.005.02001", 0.3]], True),
             o("", "ohne Zulagen", [])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "354.03", "kg": "354", "name": "Brandschutz-Unterdecke", "einheit": "m²",
     "lang": "Selbstständige Brandschutz-Unterdecke (Feuerwiderstand von unten) mit Feuerschutzplatten nach "
             "Prüfzeugnis, mit Beschichtung und Zulagen.",
     "bezug": "Deckenfläche (lichte Raummaße)",
     "schichten": [
         {"name": "Decke", "optionen": [
             o("EI 30", "EI 30 von unten, 2 × 12,5 mm GKF", [["039.04.005.01001", 1.0]], True),
             o("EI 90", "EI 90 von unten, 2 × 20 mm GKF", [["039.04.005.02001", 1.0]], True),
             o("EI 90 System", "EI 90, Systemplatten nach Prüfzeugnis", [["039.04.005.03001", 1.0]], True)]},
         {"name": "Oberfläche", "optionen": DECKE_OBERFL},
         {"name": "Zulagen", "optionen": [
             o("", "", [], True),
             o("Einhausungen", "Brandschutz-Einhausung für Einbauleuchten/Dosen (0,2 St/m²)", [["039.02.006.01001", 0.2]], True),
             o("Revision EI 90", "Revisionsklappe EI 90 (1 je 50 m²)", [["039.02.004.04001", 0.02]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "354.04", "kg": "354", "name": "Akustikdecke GK gelocht", "einheit": "m²",
     "lang": "Fugenlose Akustikunterdecke aus gelochten Gipsplatten mit Akustikvlies, Randfries ungelocht, "
             "mit Beschichtung und Zulagen.",
     "bezug": "Deckenfläche (lichte Raummaße)",
     "schichten": [
         {"name": "Decke", "optionen": [
             o("Rundlochung", "Rundlochung 8/18 mit Akustikvlies", [["039.04.006.01001", 1.0]], True),
             o("Schlitz-/Streul.", "Schlitz- bzw. Streulochung mit Akustikvlies", [["039.04.006.02001", 1.0]], True)]},
         {"name": "Oberfläche", "optionen": [
             o("Anstrich", "Dispersionsanstrich gerollt (Lochung frei)", [["034.02.001.03001", 1.0]], True),
             o("", "ohne Anstrich", [], True)]},
         {"name": "Zulagen", "optionen": [
             o("Schattenfuge", "Schattenfuge/Randabschluss (0,4 m/m²)", [["039.04.010.01001", 0.4]], True),
             o("Fries/Sprung", "Deckensprung/Fries in GK (0,2 m/m²)", [["039.04.009.01001", 0.2]], True),
             o("Ausschnitte", "Ausschnitte für Einbauteile (0,3 St/m²)", [["039.02.005.02001", 0.3]], True),
             o("", "ohne Zulagen", [])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "354.05", "kg": "354", "name": "Raster-/Kassettendecke", "einheit": "m²",
     "lang": "Demontierbare Unterdecke mit sichtbarer oder verdeckter Tragkonstruktion, Mineralfaser- oder "
             "Metallkassetten, wahlweise mit Auflagedämmung und Ausschnitten.",
     "bezug": "Deckenfläche (lichte Raummaße)",
     "schichten": [
         {"name": "Decke", "optionen": [
             o("MF SK", "Mineralfaser 625 × 625, Kante SK, αw 0,7", [["039.04.007.01001", 1.0]], True),
             o("MF VT", "Mineralfaser, Kante VT, αw 0,9", [["039.04.007.02001", 1.0]], True),
             o("Metall gelocht", "Metallkassetten gelocht mit Vlies", [["039.04.007.03001", 1.0]], True),
             o("MK Einlege", "Metallkassette Einlegesystem 625 × 625", [["039.04.012.01001", 1.0]], True),
             o("MK Bandraster", "Metallkassette Bandrastersystem 1250 × 312,5", [["039.04.012.03001", 1.0]], True),
             o("MK Klemm", "Metallkassette Klemmsystem 600 × 600", [["039.04.012.02001", 1.0]])]},
         {"name": "Auflage", "optionen": [
             o("", "", [], True),
             o("MW 40", "Auflagedämmung Mineralwolle 40 mm", [["039.04.002.01001", 1.0]], True)]},
         {"name": "Ausschnitte", "optionen": [
             o("", "", [], True),
             o("Ausschnitte", "Ausschnitte für Leuchten und Auslässe (0,3 St/m²)", [["039.02.005.02001", 0.3]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "354.06", "kg": "354", "name": "Holz-/Holzwolle-Deckenbekleidung", "einheit": "m²",
     "lang": "Deckenbekleidung aus Holzwolle-Akustikplatten, Profilholz oder Akustik-Holzpaneelen mit "
             "Unterkonstruktion, mit Oberflächenbehandlung.",
     "bezug": "Deckenfläche (lichte Raummaße)",
     "schichten": [
         {"name": "Bekleidung", "optionen": [
             o("HWL 25", "Holzwolle-Akustikplatte 25 mm", [["039.04.013.01001", 1.0]], True),
             o("HWL 50 MW", "Holzwolle-Mehrschichtplatte 50 mm mit MW-Kern", [["039.04.013.02001", 1.0]], True),
             o("Profilholz", "Profilbretter Fichte", [["027.03.003.01001", 1.0]], True),
             o("Akustik-Holz", "Akustik-Holzpaneele", [["027.03.003.02001", 1.0]], True),
             o("Profilholz 14", "Profilholz Fichte 14 mm (Zimmerer)", [["016.02.009.01001", 1.0]]),
             o("Holz geschlitzt", "Holz-Akustikpaneele geschlitzt", [["016.02.009.03001", 1.0]])]},
         {"name": "Oberfläche", "optionen": [
             o("", "werkseitig/unbehandelt", [], True),
             o("lasiert", "farblos lasiert", [["034.02.014.01001", 1.0]], True),
             o("weiß pigm.", "weiß pigmentiert geölt", [["034.02.014.03001", 1.0]], True),
             o("Anstrich", "Dispersionsanstrich gespritzt", [["034.02.001.03001", 1.0]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "354.07", "kg": "354", "name": "Kellerdeckendämmung", "einheit": "m²",
     "lang": "Dämmung der Kellerdecke von unten mit Dämmplatten, geklebt und gedübelt, sichtfertige Oberfläche, "
             "wahlweise mit Untergrundvorbereitung.",
     "bezug": "gedämmte Deckenfläche",
     "schichten": [
         {"name": "Dämmung", "optionen": [
             o("EPS 100", "EPS WLS 035 weiß beschichtet, 100 mm", [["023.04.022.01001", 1.0]], True),
             o("EPS 140", "EPS WLS 035 weiß beschichtet, 140 mm", [["023.04.022.02001", 1.0]], True),
             o("MW 100", "Mineralwolle-Lamelle A1 mit Vlies, 100 mm", [["023.04.022.03001", 1.0]], True),
             o("MW 140", "Mineralwolle-Lamelle A1 mit Vlies, 140 mm", [["023.04.022.04001", 1.0]], True),
             o("HWL-MW", "Holzwolle-Mehrschichtplatte mit MW-Kern (Wärmedämmung)", [["039.04.013.03001", 1.0]], True)]},
         {"name": "Untergrund", "optionen": [
             o("", "", [], True),
             o("Altanstrich ab", "lose Altanstriche abstoßen, Untergrund vorbehandeln", [["034.01.002.03001", 1.0]], True)]},
     ], "tags": ["altbau", "neubau"]},

    {"id": "354.08", "kg": "354", "name": "Holzbalkendecke unterseitig bekl.", "einheit": "m²",
     "lang": "Unterseitige Bekleidung von Holzbalkendecken mit Gipsplatten auf Federschiene, wahlweise "
             "feuerhemmend, mit Hohlraumdämmung und Beschichtung.",
     "bezug": "Deckenfläche (lichte Raummaße)",
     "schichten": [
         {"name": "Bekleidung", "optionen": [
             o("1× GKB Federschi.", "Federschiene, 1 × 12,5 mm GKB", [["039.04.001.01001", 1.0]], True),
             o("2× GKF F30", "2 × 12,5 mm GKF (F 30-B mit Balken)", [["039.04.001.02001", 1.0]], True),
             o("2× GKF Bestand", "2 × 12,5 mm GKF (F 30-B), Bestand", [["039.04.001.02002", 1.0]], True),
             o("1× GKB Bestand Q3", "1 × 12,5 mm GKB, Q3, Räume ≤ 10 m², Bestand", [["039.04.001.01011", 1.0]])]},
         {"name": "Dämmung", "optionen": [
             o("", "", [], True),
             o("MW 100", "Hohlraumdämmung Mineralwolle 100 mm", [["039.04.002.02001", 1.0]], True),
             o("MW 40", "Hohlraumdämmung Mineralwolle 40 mm", [["039.04.002.01001", 1.0]])]},
         {"name": "Oberfläche", "optionen": DECKE_OBERFL},
     ], "tags": ["neubau", "altbau"]},

    {"id": "354.09", "kg": "354", "name": "Deckenputz erneuern Bestand", "einheit": "m²",
     "lang": "Erneuerung von Deckenputz im Bestand: Altputz abschlagen oder ausbessern, neuer Putz bzw. Putzträger, "
             "wahlweise Stuckergänzung, Beschichtung.",
     "bezug": "Deckenfläche (lichte Raummaße)",
     "schichten": [
         {"name": "Vorarbeiten", "optionen": [
             o("Altputz ab", "Altputz an Decken abschlagen", [["023.01.005.02001", 1.0]], True),
             o("ausbessern", "Hohlstellen abklopfen, Putz ausbessern (10 %)",
               [["023.01.006.01001", 1.0], ["023.02.006.02001", 0.1]], True)]},
         {"name": "Putz", "optionen": [
             o("Gipsputz 12", "Deckenputz Gipsputz 12 mm, Bestand", [["023.02.002.02002", 1.0]], True),
             o("Putzträger + Putz", "Putzträgerplatte/Schilfrohr auf Holzuntergrund, mit Putz", [["023.02.011.01001", 1.0]], True),
             o("KZ-Putz 12", "Deckenputz Kalkzementputz 12 mm", [["023.02.002.03001", 1.0]]),
             o("Akustikputz", "Akustikputz auf Trägerplatte, αw ≥ 0,6", [["023.02.012.01001", 1.0]]),
             o("", "nur Ausbesserung", [])]},
         {"name": "Stuck", "optionen": [
             o("", "", [], True),
             o("Stuckprofil", "Stuckprofil ergänzen, Abwicklung bis 15 cm (0,4 m/m²)", [["023.05.001.01001", 0.4]], True),
             o("Rosette", "Stuckrosette ergänzen Ø bis 40 cm (1 je 20 m²)", [["023.05.003.01001", 0.05]])]},
         {"name": "Oberfläche", "optionen": [
             o("Anstrich", "Dispersionsanstrich Decke", [["034.02.001.03001", 1.0]], True),
             o("Kalk", "Kalkanstrich zweimal", [["034.02.007.01001", 1.0]], True),
             o("Leimfarbe ab+Disp", "Leimfarbe abwaschen, Dispersionsanstrich",
               [["034.01.002.04001", 1.0], ["034.02.001.03001", 1.0]])]},
     ], "tags": ["altbau"]},

    {"id": "354.10", "kg": "354", "name": "Akustikputzdecke", "einheit": "m²",
     "lang": "Fugenlose Akustikputzdecke auf Trägerplatten, schallabsorbierend, mit Randabschluss.",
     "bezug": "Deckenfläche (lichte Raummaße)",
     "schichten": [
         {"name": "Akustikputz", "optionen": [
             o("αw ≥ 0,6", "Akustikputz fein, αw ≥ 0,6", [["023.02.012.01001", 1.0]], True),
             o("αw ≥ 0,85", "Akustikputz fein, fugenlos, αw ≥ 0,85", [["023.02.012.02001", 1.0]], True)]},
         {"name": "Rand", "optionen": [
             o("", "", [], True),
             o("Schattenfuge", "Schattenfuge/Randabschlussprofil (0,4 m/m²)", [["039.04.010.01001", 0.4]], True)]},
     ], "tags": ["neubau", "altbau"]},

    # ============================================================ KG 355 Elementierte Deckenkonstruktionen
    {"id": "355.01", "kg": "355", "name": "Hohldielendecke komplett", "einheit": "m²",
     "lang": "Elementierte Decke aus Spannbeton-Hohldielen mit Fugenverguss und Ringanker, Oberseite und "
             "Unterseite fertiggestellt.",
     "bezug": "Deckenfläche (Rohbaumaß)",
     "fest": [["013.04.006.01001", 0.01]],
     "schichten": [
         {"name": "Hohldielen", "optionen": [
             o("HD 20", "Spannbeton-Hohldielen 20 cm", [["013.04.004.01001", 1.0]], True),
             o("HD 26,5", "Spannbeton-Hohldielen 26,5 cm", [["013.04.004.02001", 1.0]], True)]},
         {"name": "Oberseite", "optionen": [
             o("Verbundestrich 50", "Verbundestrich CT-C30-F5 50 mm", [["025.02.003.02001", 1.0]], True),
             o("Aufbeton 14", "Ortbetonergänzung C25/30 14 cm mit Matten",
               [["013.04.002.01001", 1.0], ["013.06.002.01001", 0.004]], True),
             o("ZE 50 schwimmend", "EPS 40 + EPS-T, Zementestrich 50 mm schwimmend",
               [["025.01.001.01001", 1.0], ["025.01.002.01001", 1.0], ["025.02.001.02001", 1.0], ["025.01.006.01001", 0.7]], True)]},
         {"name": "Unterseite", "optionen": [
             o("Fugen + Anstrich", "Fugen spachteln, Anstrich", [["034.01.003.01001", 0.3], ["034.02.004.01001", 1.0]], True),
             o("", "roh", [], True),
             o("GK abgehängt", "GK-Unterdecke abgehängt, Anstrich", [["039.04.003.01001", 1.0], ["034.02.001.03001", 1.0]])]},
     ], "tags": ["neubau"]},

    {"id": "355.02", "kg": "355", "name": "Brettsperrholzdecke mit Aufbau", "einheit": "m²",
     "lang": "Elementierte Massivholzdecke aus Brettsperrholz mit Schüttung, Trittschalldämmung, Estrich und "
             "Bodenbelag als Gesamtaufbau.",
     "bezug": "Deckenfläche",
     "fest": [["016.01.005.01001", 1.0], ["025.01.006.01001", 0.7]],
     "schichten": [
         {"name": "Decke", "optionen": [
             o("BSP 140", "Brettsperrholz 140 mm, Nichtsichtqualität", [["016.05.002.01001", 1.0]], True),
             o("BSP 200", "Brettsperrholz 200 mm, Nichtsichtqualität", [["016.05.002.02001", 1.0]], True),
             o("BSP 160 WSi", "Brettsperrholz 160 mm, Wohnsichtqualität", [["016.05.002.03001", 1.0]], True)]},
         {"name": "Aufbau", "optionen": [
             o("Schüttung + GF", "Schüttung 60 mm, Holzfaser-Trittschall, Gipsfaser-Trockenestrich 25 mm",
               [["025.01.004.02001", 1.0], ["025.01.002.03001", 1.0], ["025.03.005.02001", 1.0]], True),
             o("Schüttung + ZE", "Schüttung 60 mm, MW-Trittschall, Zementestrich 50 mm",
               [["025.01.004.02001", 1.0], ["025.01.002.02001", 1.0], ["025.01.005.01001", 1.0], ["025.02.001.02001", 1.0]], True)]},
         {"name": "Belag", "optionen": [
             o("Parkett", "Fertigparkett verklebt, Material ≤ 45 €", [["028.02.003.02001", 1.0], ["028.01.001.01001", 1.0]], True),
             o("Linoleum", "Linoleum 2,5 mm, gespachtelt",
               [["036.02.001.01001", 1.0], ["036.01.001.02001", 1.0], ["036.01.001.03001", 1.0]], True),
             o("", "ohne Belag", [])]},
     ], "tags": ["neubau"]},

    # ============================================================ KG 359 Sonstiges zur KG 350
    {"id": "359.01", "kg": "359", "name": "Treppengeländer", "einheit": "m",
     "lang": "Treppengeländer Höhe 1,00 m seitlich befestigt, mit Handlauf, wahlweise mit zusätzlichem "
             "Wandhandlauf auf der Gegenseite.",
     "bezug": "Länge in Steigung gemessen",
     "schichten": [
         {"name": "Geländer", "optionen": [
             o("Stahl Stäbe", "Stahl verzinkt/beschichtet, Stäbe, Handlauf Stahlrohr", [["031.02.001.01001", 1.0]], True),
             o("Stäbe HL Edelst.", "Stahl verzinkt, Stäbe, Handlauf Edelstahl", [["031.02.001.02001", 1.0]], True),
             o("Relinge V2A", "Edelstahl mit horizontalen Relingen", [["031.02.002.01001", 1.0]], True),
             o("VSG Glasklemmen", "VSG 2 × 8 mm in Glasklemmen, Edelstahl", [["031.02.002.02001", 1.0]], True),
             o("Ganzglas", "Ganzglasgeländer VSG/TVG, Bodenprofil seitlich", [["032.03.003.02001", 1.0]])]},
         {"name": "Wandhandlauf", "optionen": [
             o("", "", [], True),
             o("HL Edelstahl", "Wandhandlauf Edelstahl Ø 42 mm Gegenseite", [["031.02.005.01001", 1.0]], True),
             o("HL Holz", "Wandhandlauf Holz Gegenseite", [["031.02.005.03001", 1.0]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "359.02", "kg": "359", "name": "Brüstungs-/Balkongeländer", "einheit": "m",
     "lang": "Absturzsicherung an Balkonen, Galerien und Deckenrändern, Höhe 1,00 m, stirnseitig oder aufgesetzt "
             "befestigt.",
     "bezug": "Länge des Geländers",
     "fest": [["017.01.005.01001", 2.0]],
     "schichten": [
         {"name": "Geländer", "optionen": [
             o("Stahl Stäbe", "Stahl verzinkt, Stäbe, stirnseitig", [["031.02.003.01001", 1.0]], True),
             o("Stahl Lochblech", "Stahl verzinkt, Lochblechfüllung", [["031.02.003.02001", 1.0]], True),
             o("Alu/VSG", "Aluminium eloxiert mit VSG-Füllung", [["031.02.003.03001", 1.0]], True),
             o("Ganzglas Boden", "Ganzglas mit Bodenprofil Alu", [["031.02.003.04001", 1.0]], True),
             o("Ganzglas aufges.", "Ganzglasgeländer VSG/TVG, Bodenprofil aufgesetzt", [["032.03.003.01001", 1.0]]),
             o("Ganzglas versenkt", "Ganzglasgeländer VSG/TVG, Bodenprofil versenkt", [["032.03.003.03001", 1.0]])]},
         {"name": "Sichtschutz", "optionen": [
             o("", "", [], True),
             o("Glasdekor", "Sichtschutzfolie/Glasdekor (0,9 m²/m)", [["032.01.004.01001", 0.9]])]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "359.03", "kg": "359", "name": "Balkon Stahlbeton Kragplatte", "einheit": "m²",
     "lang": "Auskragende Balkonplatte aus Ortbeton C30/37 mit Gefälle und Tropfkante, wärmedämmendem "
             "Anschlusselement, Abdichtung, Belag und Entwässerung. Geländer gesondert.",
     "bezug": "Balkonfläche (Auskragung ca. 1,5 m)",
     "fest": [["022.02.016.01001", 0.6], ["044.03.006.01001", 0.15]],
     "schichten": [
         {"name": "Platte", "optionen": [
             o("Kragplatte 18", "C30/37, d = 18 cm, Schalung, Bewehrung 110 kg/m³",
               [["013.04.007.01001", 0.18], ["013.05.001.12001", 1.15], ["013.06.001.03001", 0.020]], True),
             o("Kragplatte 22", "C30/37, d = 22 cm, Schalung, Bewehrung 110 kg/m³",
               [["013.04.007.01001", 0.22], ["013.05.001.12001", 1.2], ["013.06.001.03001", 0.024]], True)]},
         {"name": "Anschluss", "optionen": [
             o("Isokorb Standard", "wärmedämmendes Anschlusselement Kragbalkon (0,67 m/m²)", [["013.04.008.01001", 0.67]], True),
             o("Isokorb gestützt", "Anschlusselement gestützter Balkon (Querkraft)", [["013.04.008.03001", 0.67]], True),
             o("Isokorb hoch", "Anschlusselement Kragbalkon, hohe Tragstufe", [["013.04.008.02001", 0.67]])]},
         {"name": "Abdichtung", "optionen": [
             o("PMMA", "Flüssigkunststoff PMMA, vlieseinlagig, mit Türanschluss",
               [["018.03.002.01001", 1.0], ["018.03.003.01001", 0.3]], True),
             o("Bitumen 2-lagig", "Polymerbitumenbahn zweilagig", [["018.03.002.02001", 1.0]]),
             o("", "ohne Abdichtung (WU-Platte)", [])]},
         {"name": "Belag", "optionen": [
             o("FSZ Mörtelbett", "Feinsteinzeug im Mörtelbett 60 × 60", [["024.03.008.02001", 1.0]], True),
             o("FSZ Stelzlager", "Feinsteinzeug 2 cm auf Stelzlagern 60 × 60", [["024.03.006.01001", 1.0]], True),
             o("WPC-Dielen", "WPC-Hohlkammerdielen", [["016.04.011.04001", 1.0]], True),
             o("Naturstein", "Naturstein auf Drainmörtel 3 cm", [["014.02.003.01001", 1.0]]),
             o("Lärchendielen", "Lärchendielen 28 mm", [["016.04.011.01001", 1.0]]),
             o("PMMA Nutzschicht", "Flüssigkunststoff PMMA als Nutzbelag", [["081.04.003.01001", 1.0]])]},
     ], "tags": ["neubau"]},

    {"id": "359.04", "kg": "359", "name": "Balkonanlage vorgestellt", "einheit": "St",
     "lang": "Vorgestellte Balkonanlage aus Stahl, feuerverzinkt, mit Geländer, thermisch getrennt oder mit "
             "Schwerlastankern befestigt, wahlweise mit Einzelfundamenten.",
     "bezug": "Stück je Balkon",
     "schichten": [
         {"name": "Balkon", "optionen": [
             o("Stahl 2,0×1,5", "Balkonanlage Stahl 2,0 × 1,5 m, Stäbe", [["031.03.009.01001", 1.0]], True),
             o("Stahl 3,5×1,8", "Balkonanlage Stahl 3,5 × 1,8 m, Stäbe", [["031.03.009.02001", 1.0]], True)]},
         {"name": "Anschluss", "optionen": [
             o("therm. getrennt", "2 thermisch getrennte Anschlüsse an Fassade", [["017.04.012.01001", 2.0]], True),
             o("Schwerlastanker", "8 Schwerlastanker M20", [["017.01.005.03001", 8.0]], True)]},
         {"name": "Fundament", "optionen": [
             o("", "", [], True),
             o("Einzelfundamente", "Einzelfundamente Stahlbeton (0,5 m³)", [["013.02.002.02001", 0.5]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "359.05", "kg": "359", "name": "Laufsteg / Wartungssteg", "einheit": "m",
     "lang": "Laufsteg bzw. Wartungsbühne aus Stahl mit Gitterrost, feuerverzinkt, befestigt mit Dübeln.",
     "bezug": "Länge des Stegs",
     "schichten": [
         {"name": "Steg", "optionen": [
             o("Steg B 0,6", "Laufsteg Gitterrost, B 0,6 m", [["017.04.011.01001", 1.0]], True),
             o("Steg B 0,8", "Laufsteg Gitterrost, B 0,8 m", [["017.04.011.02001", 1.0]], True),
             o("Steg B 1,2", "Laufsteg Gitterrost, B 1,2 m", [["017.04.011.03001", 1.0]], True),
             o("Steg + Geländer", "Wartungssteg Gitterrost mit Geländer", [["031.03.010.01001", 1.0]], True)]},
         {"name": "Befestigung", "optionen": [
             o("", "", [], True),
             o("Anker", "2 Schwerlastanker M12 je m", [["017.01.005.01001", 2.0]], True)]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "359.06", "kg": "359", "name": "Holzbalkon", "einheit": "m²",
     "lang": "Holzbalkon aus BSH mit Lärchenbelag, mit Geländer (ca. 0,8 m je m² Balkonfläche) und wahlweise "
             "Punktfundamenten.",
     "bezug": "Balkonfläche",
     "schichten": [
         {"name": "Balkon", "optionen": [
             o("Holzbalkon BSH", "Holzbalkon BSH mit Lärchenbelag", [["016.04.010.01001", 1.0]], True)]},
         {"name": "Geländer", "optionen": [
             o("Geländer Stahl", "Balkongeländer Stahl verzinkt, Stäbe", [["031.02.003.01001", 0.8]], True),
             o("Geländer Alu/VSG", "Balkongeländer Alu mit VSG", [["031.02.003.03001", 0.8]], True)]},
         {"name": "Fundament", "optionen": [
             o("", "", [], True),
             o("Punktfundamente", "Einzelfundamente Stahlbeton (0,1 m³/m²)", [["013.02.002.02001", 0.1]], True)]},
     ], "tags": ["neubau", "altbau"]},
]
