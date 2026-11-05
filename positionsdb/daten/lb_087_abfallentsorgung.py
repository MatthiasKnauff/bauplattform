# LB 087 Abfallentsorgung, Verwertung und Beseitigung – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)
# Annahmegebühren regional sehr unterschiedlich: Genauigkeitsklasse C.

_T = ("Abfall der Abfallart {a} (AVV {avv}) von der Sammelstelle der Baustelle laden, zu einer zugelassenen "
      "Anlage transportieren und dort verwerten bzw. beseitigen lassen, einschließlich Annahmegebühren und "
      "Nachweisführung (Wiegescheine, ggf. eANV). ")

LBS = [{
    "nr": "087", "name": "Abfallentsorgung, Verwertung und Beseitigung", "atv": "DIN 18299", "lohn": "abbruch", "kg": "394",
    "gruppen": [
        {"name": "Mineralische Abfälle", "positionen": [
            {"kurz": "Entsorgung {a}, AVV {avv}",
             "lang": _T + "Abrechnung nach Wiegeschein.",
             "einheit": "t", "gen": "C",
             "varianten": [{"a": "Beton", "avv": "17 01 01", "h": 0.03, "geraet": 22},
                           {"a": "Ziegel/Mauerwerksbruch", "avv": "17 01 02", "h": 0.03, "geraet": 26},
                           {"a": "Gemisch aus Beton, Ziegeln, Fliesen", "avv": "17 01 07", "h": 0.03, "geraet": 28},
                           {"a": "Boden und Steine, unbelastet", "avv": "17 05 04", "h": 0.03, "geraet": 16},
                           {"a": "Gleisschotter/Bettungsmaterial", "avv": "17 05 08", "h": 0.03, "geraet": 32},
                           {"a": "Baustoffe auf Gipsbasis", "avv": "17 08 02", "h": 0.03, "geraet": 110},
                           {"a": "Bitumengemische ohne Teer", "avv": "17 03 02", "h": 0.03, "geraet": 48}]},
            {"kurz": "Entsorgung {a} (gefährlicher Abfall), AVV {avv}",
             "lang": _T + "Gefährlicher Abfall, Entsorgungsnachweis über das elektronische Nachweisverfahren. "
                          "Abrechnung nach Wiegeschein.",
             "einheit": "t", "gen": "C",
             "varianten": [{"a": "asbesthaltige Baustoffe", "avv": "17 06 05*", "h": 0.05, "geraet": 340},
                           {"a": "teerhaltige Bitumengemische (PAK)", "avv": "17 03 01*", "h": 0.05, "geraet": 210},
                           {"a": "Boden mit gefährlichen Stoffen", "avv": "17 05 03*", "h": 0.05, "geraet": 160},
                           {"a": "Dämmmaterial mit gefährlichen Stoffen (alte KMF)", "avv": "17 06 03*", "h": 0.05, "geraet": 420}]},
        ]},
        {"name": "Nichtmineralische Abfälle", "positionen": [
            {"kurz": "Entsorgung {a}, AVV {avv}",
             "lang": _T + "Abrechnung nach Wiegeschein.",
             "einheit": "t", "gen": "C",
             "varianten": [{"a": "Holz A I–A III", "avv": "17 02 01", "h": 0.03, "geraet": 95},
                           {"a": "Altholz A IV (behandelt)", "avv": "17 02 04*", "h": 0.05, "geraet": 185},
                           {"a": "Glas", "avv": "17 02 02", "h": 0.03, "geraet": 60},
                           {"a": "Kunststoffe", "avv": "17 02 03", "h": 0.03, "geraet": 210},
                           {"a": "Metalle gemischt (Erlös abgezogen)", "avv": "17 04 07", "h": 0.03, "geraet": 0},
                           {"a": "Kabel", "avv": "17 04 11", "h": 0.03, "geraet": 30},
                           {"a": "Dämmmaterial Mineralwolle neu / EPS ohne HBCD", "avv": "17 06 04", "h": 0.03, "geraet": 260},
                           {"a": "gemischte Bau- und Abbruchabfälle", "avv": "17 09 04", "h": 0.03, "geraet": 210}]},
            {"kurz": "Entsorgung HBCD-haltiger Dämmstoffe (EPS/XPS), AVV 17 06 04",
             "lang": _T.replace("{a}", "Polystyrol-Dämmstoff mit HBCD").replace("{avv}", "17 06 04") +
                     "Verbrennung in zugelassener Anlage. Abrechnung nach Wiegeschein.",
             "einheit": "t", "h": 0.05, "geraet": 900, "gen": "C"},
            {"kurz": "Baumischabfall im Container {v}, inkl. Stellung und Entsorgung",
             "lang": "Container {v} für gemischte Bau- und Abbruchabfälle (AVV 17 09 04) stellen, nach Füllung "
                     "abholen und entsorgen, einschließlich Gebühren bis zum zulässigen Füllgewicht. Je Container.",
             "einheit": "St", "gen": "C",
             "varianten": [{"v": "7 m³", "h": 0, "geraet": 820}, {"v": "10 m³", "h": 0, "geraet": 1100}]},
            {"kurz": "Baustellenabfälle sortieren und Getrennthaltung dokumentieren (GewAbfV)",
             "lang": "Baustellenabfälle nach Gewerbeabfallverordnung getrennt sammeln, Sammelbehälter "
                     "kennzeichnen und die Getrennthaltung bzw. Vorbehandlung dokumentieren. Abrechnung nach Stunden.",
             "einheit": "h", "h": 1, "gen": "B"},
        ]},
    ],
}]
