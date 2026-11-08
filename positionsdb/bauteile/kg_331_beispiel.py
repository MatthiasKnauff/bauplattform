# Bauteilvorlagen KG 331 Tragende Außenwände (Beispiel/Muster für das Format) – eigene Aufbauten aus der Positionsdatenbank.
# Faktor = Menge der Position je Einheit des Bauteils (hier je m² Wandfläche).
# Kimmschicht: 1 m Wandlänge je 2,75 m Geschosshöhe → 0,36 m je m² Wand.

INNEN_MW = [   # Innenseite massiver Außenwände (Putz + Anstrich)
    {"k": "Gipsputz", "t": "Gipsputz 10 mm Q2, Dispersionsanstrich", "teile": [["023.02.001.01001", 1.0], ["034.02.001.01001", 1.0]], "std": True},
    {"k": "Kalkzementputz", "t": "Kalkzementputz 15 mm, Dispersionsanstrich", "teile": [["023.02.001.04001", 1.0], ["034.02.001.01001", 1.0]], "std": True},
    {"k": "Kalkputz, Silikat", "t": "Kalkputz 15 mm, Silikatanstrich", "teile": [["023.02.001.05001", 1.0], ["034.02.002.01001", 1.0]]},
    {"k": "innen roh", "t": "ohne Innenbekleidung (gesondert erfasst)", "teile": []},
]

VORLAGEN = [
    {"id": "331.01", "kg": "331", "name": "AW Mauerwerk + WDVS", "einheit": "m²",
     "lang": "Tragende Außenwand aus Mauerwerk mit Wärmedämmverbundsystem und Innenputz, einschließlich Kimmschicht. "
             "Öffnungen, Stürze und Leibungen sind gesondert unter KG 334 bzw. als Zulage erfasst.",
     "bezug": "Wandfläche (Außenmaß × Geschosshöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             {"k": "KS 17,5", "t": "Kalksand-Plansteine d = 17,5 cm", "teile": [["012.02.004.01001", 1.0], ["012.01.001.02001", 0.36]], "std": True},
             {"k": "KS 24", "t": "Kalksand-Plansteine d = 24 cm", "teile": [["012.02.004.02001", 1.0], ["012.01.001.03001", 0.36]], "std": True},
             {"k": "Hlz 24", "t": "Planziegel ungefüllt d = 24 cm", "teile": [["012.02.002.01001", 1.0], ["012.01.001.03001", 0.36]]},
             {"k": "PP4 24", "t": "Porenbeton-Plansteine PP4 d = 24 cm", "teile": [["012.02.003.03001", 1.0], ["012.01.001.03001", 0.36]]}]},
         {"name": "Wärmedämmung außen", "optionen": [
             {"k": "WDVS EPS 12", "t": "WDVS EPS 032, 12 cm", "teile": [["023.04.001.01001", 1.0]]},
             {"k": "WDVS EPS 16", "t": "WDVS EPS 032, 16 cm", "teile": [["023.04.001.03001", 1.0]], "std": True},
             {"k": "WDVS EPS 20", "t": "WDVS EPS 032, 20 cm", "teile": [["023.04.001.05001", 1.0]], "std": True},
             {"k": "WDVS MW 16", "t": "WDVS Mineralwolle 035, 16 cm, nichtbrennbar", "teile": [["023.04.002.02001", 1.0]], "std": True},
             {"k": "WDVS MW 20", "t": "WDVS Mineralwolle 035, 20 cm, nichtbrennbar", "teile": [["023.04.002.03001", 1.0]]},
             {"k": "WDVS HF 16", "t": "WDVS Holzfaser auf Mauerwerk, 16 cm", "teile": [["023.04.014.02001", 1.0]]}]},
         {"name": "Innenseite", "optionen": INNEN_MW},
     ], "tags": ["neubau"]},
]
