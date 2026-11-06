# LB 098 Witterungsschutzmaßnahmen – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "098", "name": "Witterungsschutzmaßnahmen", "atv": "DIN 18299", "lohn": "baustelle", "kg": "397",
    "gruppen": [
        {"name": "Witterungsschutz", "positionen": [
            {"kurz": "Fensteröffnungen provisorisch verschließen, Folie/Platte",
             "lang": "Fenster- und Türöffnungen im Rohbau mit Folie auf Lattenrahmen bzw. OSB-Platten "
                     "winddicht verschließen, vorhalten und vor Fenstereinbau entfernen. Abrechnung nach Öffnungsfläche.",
             "einheit": "m²", "h": 0.25, "mat": 4.5, "gen": "B"},
            {"kurz": "Notabdeckung Dach/Decke mit Planen",
             "lang": "Offene Dach- bzw. Deckenflächen mit reißfesten Gewebeplanen gegen Niederschlag abdecken, "
                     "gegen Windsog sichern, vorhalten und entfernen.",
             "einheit": "m²", "h": 0.08, "mat": 1.8, "gen": "B"},
            {"kurz": "Winterbaumaßnahme: Bauheizung/Bautrocknung, Heizgerät {p} kW",
             "lang": "Mobiles Heiz- bzw. Trocknungsgerät mit {p} kW Leistung aufstellen, betreiben einschließlich "
                     "Brennstoff bzw. Strom und Überwachung. Abrechnung je Gerät und Tag.",
             "einheit": "Tag", "gen": "C",
             "varianten": [{"p": "bis 30", "h": 0.3, "geraet": 75}, {"p": "bis 80", "h": 0.4, "geraet": 170}]},
            {"kurz": "Bautrockner (Kondenstrockner) vorhalten und betreiben",
             "lang": "Kondensationstrockner für die Bautrocknung aufstellen, betreiben, Kondensat abführen, "
                     "Feuchtemessungen protokollieren. Abrechnung je Gerät und Tag.",
             "einheit": "Tag", "h": 0.1, "geraet": 22, "gen": "B"},
            {"kurz": "Betonschutz bei Frost, Wärmedämmmatten abdecken",
             "lang": "Frisch eingebauten Beton mit Wärmedämmmatten bzw. Thermoplanen gegen Frost schützen, "
                     "Temperatur überwachen, Matten nach Erhärtung entfernen.",
             "einheit": "m²", "h": 0.06, "geraet": 1.5, "gen": "B", "lohn": "rohbau"},
            {"kurz": "Schnee- und Eisbeseitigung auf der Baustelle",
             "lang": "Schnee und Eis von Arbeitsflächen, Gerüsten und Verkehrswegen beseitigen, abstumpfende "
                     "Mittel streuen. Abrechnung nach Stunden.",
             "einheit": "h", "h": 1, "mat": 2, "gen": "B"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Ausbau Runde 3 (Nacht 06.11.2026)
DAUER9 = [{"k": "", "t": "Vorhaltedauer bis 4 Wochen."}, {"k": "kurzfristig", "t": "Einsatzdauer unter 2 Wochen, Mindestmiete eingerechnet.", "fg": 1.3, "gen": "B",
           "ersetze": [[r"4 Wochen vorhalten", "vorhalten"], [r"vorhalten \(4 Wochen\)", "vorhalten"]]},
          {"k": "Winterperiode", "t": "Einsatz über die gesamte Winterperiode (über 8 Wochen).", "fg": 0.8}]
ENERGIE = [{"k": "Strom", "t": "Elektrisch betrieben, Stromkosten gesondert."}, {"k": "Öl", "t": "Ölbefeuert mit Tank, Brennstoff gesondert.", "fg": 1.1},
           {"k": "Gas", "t": "Gasbefeuert (Propan), Gasversorgung und Brennstoff gesondert.", "fg": 1.05}]
LAGE = [{"k": "", "t": ""}, {"k": "über 3 m", "t": "Montage über 3 m Höhe bzw. am Gerüst.", "fh": 1.3}, {"k": "Kleinflächen", "t": "Einzelflächen unter 10 m².", "fh": 1.4, "fm": 1.15, "gen": "B"}]

LBS[0]["gruppen"] += [
    {"name": "Einhausung, Notdach, Abdeckung", "positionen": [
        {"kurz": "Einhausung/Winterbauzelt {art}",
         "lang": "Einhausung als Winterbauschutz ({art}) mit Unterkonstruktion, Bespannung und Zugangsöffnungen herstellen, "
                 "4 Wochen vorhalten und rückbauen. Abrechnung nach bespannter Fläche.",
         "einheit": "m²", "kg": "397", "gen": "B", "achsen": [LAGE[:2], DAUER9],
         "varianten": [{"art": "Gewebeplane auf Gerüst", "h": 0.15, "mat": 1.8, "geraet": 1.2}, {"art": "Luftpolster-/Isolierfolie zweilagig", "h": 0.2, "mat": 3.5, "geraet": 1.4},
                       {"art": "Systemzelt (Halle) bis 15 m Spannweite", "h": 0.25, "geraet": 9}, {"art": "Schrumpffolie, transparent", "h": 0.3, "mat": 5.5}]},
        {"kurz": "Einhausung vorhalten je Woche, {art}",
         "lang": "Einhausung wie vor ({art}) über 4 Wochen hinaus vorhalten, nach Sturm kontrollieren und instandsetzen. Abrechnung je m² und Woche.",
         "einheit": "m²Wo", "kg": "397", "gen": "B", "h": 0,
         "varianten": [{"art": "Plane/Folie", "geraet": 0.15}, {"art": "Systemzelt", "geraet": 0.9}]},
        {"kurz": "Notdach {art}",
         "lang": "Notdach ({art}) über geöffnetem Dach bzw. Rohbau herstellen, gegen Windsog sichern, vorhalten (4 Wochen) und entfernen. Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "397", "gen": "B", "lohn": "dach", "achsen": [LAGE, DAUER9],
         "varianten": [{"art": "Plane auf Lattung", "h": 0.18, "mat": 3.5, "geraet": 0.5}, {"art": "Unterspannbahn als Behelfsdeckung", "h": 0.12, "mat": 2.8},
                       {"art": "Systemdach (Gerüstdach)", "h": 0.4, "geraet": 9}, {"art": "Bitumenbahn auf Schalung (Flachdach)", "h": 0.35, "mat": 9}]},
        {"kurz": "Abdeckung {art}",
         "lang": "Bauteile bzw. Flächen gegen Niederschlag und Frost abdecken ({art}), beschweren, vorhalten und entfernen. Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "397", "gen": "A", "achsen": [LAGE, DAUER9],
         "varianten": [{"art": "PE-Folie 0,2 mm", "h": 0.04, "mat": 0.6}, {"art": "Gewebeplane", "h": 0.05, "mat": 0.4, "geraet": 0.4},
                       {"art": "Frostschutzmatte (Beton)", "h": 0.05, "mat": 0.6, "geraet": 0.9}, {"art": "Wärmedämmmatte mit Folie (Beton)", "h": 0.06, "mat": 0.9, "geraet": 1.1},
                       {"art": "Bitumenbahn lose (Mauerkronen)", "h": 0.08, "mat": 2.2}]},
        {"kurz": "Mauerkrone/Wandkopf abdecken, Breite bis {b} cm",
         "lang": "Mauerkronen bzw. Wandköpfe von Rohbaumauerwerk mit Folie bzw. Bahn abdecken, beschweren, vorhalten und entfernen. Abrechnung nach Länge.",
         "einheit": "m", "kg": "397", "gen": "A", "lohn": "rohbau",
         "varianten": [{"b": "30", "h": 0.04, "mat": 0.6}, {"b": "50", "h": 0.05, "mat": 0.9}]},
    ]},
    {"name": "Heizen, Trocknen, Frostschutz", "positionen": [
        {"kurz": "Bauheizung {kw} kW, Vorhaltung je Tag",
         "lang": "Mobile Bauheizung bzw. Warmlufterzeuger {kw} kW mit Abgasführung bzw. Raumluftunabhängigkeit nach Erfordernis aufstellen, "
                 "betreiben, überwachen und abbauen. Abrechnung je Betriebstag.",
         "einheit": "Tag", "kg": "397", "gen": "B", "achsen": [ENERGIE, DAUER9],
         "varianten": [{"kw": "9", "h": 0.1, "geraet": 12}, {"kw": "25", "h": 0.12, "geraet": 22}, {"kw": "50", "h": 0.15, "geraet": 38},
                       {"kw": "100", "h": 0.2, "geraet": 65, "achsen": [ENERGIE[1:], DAUER9]}, {"kw": "200", "h": 0.3, "geraet": 110, "achsen": [ENERGIE[1:], DAUER9]}]},
        {"kurz": "Brennstoff/Energie Bauheizung, {art}",
         "lang": "Brennstoff bzw. Energie für die Bauheizung ({art}) liefern und abrechnen.",
         "einheit": "l", "kg": "397", "gen": "C", "h": 0,
         "varianten": [{"art": "Heizöl EL je Liter", "geraet": 1.15}, {"art": "Propan je Liter Flüssiggas", "geraet": 0.95}]},
        {"kurz": "Bautrockner {art}, Vorhaltung je Tag",
         "lang": "Bautrockner ({art}) aufstellen, an Strom anschließen, {abl}, Raumklima überwachen und protokollieren. Abrechnung je Gerät und Tag.",
         "einheit": "Tag", "kg": "397", "gen": "B", "achsen": [DAUER9, [{"k": "", "t": ""}, {"k": "mit Messprotokoll", "t": "Mit CM-Messung bzw. Feuchtemessung und Protokoll je Woche anteilig.", "geraet": 6}]],
         "varianten": [{"art": "Kondenstrockner 40 l/Tag", "abl": "Kondensat ableiten", "h": 0.05, "geraet": 9}, {"art": "Kondenstrockner 80 l/Tag", "abl": "Kondensat ableiten", "h": 0.06, "geraet": 15},
                       {"art": "Adsorptionstrockner 300 m³/h", "abl": "feuchte Regenerationsluft über Schlauch ins Freie führen", "h": 0.08, "geraet": 28},
                       {"art": "Estrich-Dämmschichttrocknung (Seitenkanal)", "abl": "Kondensat ableiten", "h": 0.15, "geraet": 32}]},
        {"kurz": "Frostschutzbeheizung {art}",
         "lang": "Frostschutz für {art} herstellen, betreiben und entfernen. Abrechnung je Stück und Woche.",
         "einheit": "StWo", "kg": "397", "gen": "B", "achsen": [DAUER9],
         "varianten": [{"art": "Bauwasserleitung mit Heizband je 10 m", "h": 0.2, "mat": 6, "geraet": 6}, {"art": "Standrohr/Hydrant mit Isolierhaube", "h": 0.2, "geraet": 9},
                       {"art": "Sanitärcontainer (Frostwächter)", "h": 0.1, "geraet": 12}]},
        {"kurz": "Betonnachbehandlung bei Frost, {art}",
         "lang": "Frisch betonierte Bauteile bei Frost schützen ({art}) bis zum Erreichen der Gefrierbeständigkeit, mit Temperaturprotokoll.",
         "einheit": "m²", "kg": "397", "gen": "B", "lohn": "rohbau",
         "varianten": [{"art": "Abdecken mit Thermomatten, Abrechnung nach Fläche", "h": 0.06, "mat": 0.5, "geraet": 1.2}, {"art": "Unterheizen der Decke mit Warmluft, Abrechnung je m² und Woche", "h": 0.03, "geraet": 1.8, "einheit": "m²Wo"},
                       {"art": "Beheizte Einhausung der Wand, Abrechnung je m² und Woche", "h": 0.05, "geraet": 2.5, "einheit": "m²Wo"}]},
        {"kurz": "Schnee- und Eisräumung {art}",
         "lang": "Schnee und Eis von {art} räumen und abstreuen, nach Anforderung. Abrechnung nach Fläche je Einsatz.",
         "einheit": "m²", "kg": "397", "gen": "A",
         "varianten": [{"art": "Zufahrten und Lagerflächen (maschinell)", "h": 0.004, "geraet": 0.12}, {"art": "Gerüstlagen und Decken (von Hand)", "h": 0.03, "mat": 0.05},
                       {"art": "Dachflächen/Flachdächer (von Hand)", "h": 0.05, "mat": 0.05}]},
        {"kurz": "Winterbau-Bereitschaft und Wetterüberwachung",
         "lang": "Wetterüberwachung, Organisation der Winterbaumaßnahmen und Bereitschaft für Sturm- und Frostereignisse während der Winterperiode. Abrechnung je Woche.",
         "einheit": "Wo", "kg": "397", "gen": "B", "h": 1.5, "geraet": 15},
    ]},
]
