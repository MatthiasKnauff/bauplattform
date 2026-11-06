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
                           {"a": "Bitumengemische ohne Teer", "avv": "17 03 02", "h": 0.03, "geraet": 22}]},
            {"kurz": "Entsorgung {a} (gefährlicher Abfall), AVV {avv}",
             "lang": _T + "Gefährlicher Abfall, Entsorgungsnachweis über das elektronische Nachweisverfahren. "
                          "Abrechnung nach Wiegeschein.",
             "einheit": "t", "gen": "C",
             "varianten": [{"a": "asbesthaltige Baustoffe", "avv": "17 06 05*", "h": 0.05, "geraet": 340},
                           {"a": "teerhaltige Bitumengemische (PAK)", "avv": "17 03 01*", "h": 0.05, "geraet": 110},
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

# ---------------------------------------------------------------- Ausbau Runde 3 (Nacht 06.11.2026)
WEG = [{"k": "≤20 km", "t": "Transportweg zur Anlage bis 20 km."}, {"k": "≤50 km", "t": "Transportweg über 20 bis 50 km.", "geraet": 6},
       {"k": ">50 km", "t": "Transportweg über 50 km bis 100 km.", "geraet": 13, "gen": "C"}]
MENGE = [{"k": "lose", "t": "Abfuhr lose mit Lkw bzw. Mulde ab 10 t je Fuhre."},
         {"k": "Kleinmenge", "t": "Kleinmengen unter 5 t je Abfuhr.", "fg": 1.25, "fh": 1.5},
         {"k": "Container", "t": "Abfuhr im Container; Containerstellung gesondert.", "fh": 0.6}]
SORT = [{"k": "", "t": "Sortenrein getrennt gesammelt."}, {"k": "verunreinigt", "t": "Mit Fremdbestandteilen bis 10 % (Holz, Kunststoff, Metall), Sortieraufwand in der Anlage.", "fg": 1.35, "gen": "C"}]
KLEIN_GEF = [{"k": "", "t": ""}, {"k": "Kleinmenge", "t": "Kleinmengen unter 1 t, Sammelentsorgung.", "fg": 1.4, "fh": 1.5}]
GEF = [{"k": "", "t": ""}, {"k": "BigBag", "t": "Verpackt in Big Bags bzw. Plattformsäcken, staubdicht verschlossen und gekennzeichnet.", "mat": 28, "h": 0.4}]

_TB = ("{a} (AVV {avv}) von der Sammelstelle laden, zur zugelassenen Anlage transportieren und verwerten bzw. beseitigen, "
       "einschließlich Annahmegebühren und Nachweisführung (Wiegescheine, Lieferscheine). Abrechnung nach Wiegeschein.")

LBS[0]["gruppen"] += [
    {"name": "Boden nach Zuordnungsklassen", "positionen": [
        {"kurz": "Boden {z}, entsorgen",
         "lang": "Bodenaushub der Einstufung {z} nach Ersatzbaustoffverordnung bzw. Deponieverordnung (Deklarationsanalyse gesondert) " + _TB.replace("{a} (AVV {avv})", ""),
         "einheit": "t", "kg": "394", "gen": "C", "achsen": [WEG, MENGE, SORT],
         "varianten": [{"z": "BM-0 / Z0", "h": 0.03, "geraet": 11, "achsen": [WEG, MENGE]}, {"z": "BM-0* / Z0*", "h": 0.03, "geraet": 14, "achsen": [WEG, MENGE]}, {"z": "BM-F0* / Z1.1", "h": 0.03, "geraet": 17},
                       {"z": "BM-F1 / Z1.2", "h": 0.03, "geraet": 21}, {"z": "BM-F2 / Z2", "h": 0.03, "geraet": 27}, {"z": "BM-F3 / > Z2 (DK 0)", "h": 0.03, "geraet": 35},
                       {"z": "DK I", "h": 0.03, "geraet": 48}, {"z": "DK II", "h": 0.03, "geraet": 72}, {"z": "DK III (gefährlich)", "h": 0.05, "geraet": 145}]},
    ]},
    {"name": "Bau- und Abbruchabfälle (Ergänzung)", "positionen": [
        {"kurz": "Entsorgung {a}, AVV {avv}",
         "lang": _TB,
         "einheit": "t", "kg": "394", "gen": "C", "achsen": [WEG, MENGE, SORT],
         "varianten": [{"a": "Beton mit Bewehrung", "avv": "17 01 01", "h": 0.03, "geraet": 26}, {"a": "Fliesen und Keramik", "avv": "17 01 03", "h": 0.03, "geraet": 30},
                       {"a": "Porenbeton", "avv": "17 01 07", "h": 0.03, "geraet": 85}, {"a": "Kalksandstein", "avv": "17 01 02", "h": 0.03, "geraet": 28},
                       {"a": "Holz unbehandelt A I", "avv": "17 02 01", "h": 0.04, "geraet": 75}, {"a": "Holz behandelt A II/A III", "avv": "17 02 01", "h": 0.04, "geraet": 110},
                       {"a": "Glas", "avv": "17 02 02", "h": 0.04, "geraet": 65}, {"a": "Kunststoffe", "avv": "17 02 03", "h": 0.05, "geraet": 210},
                       {"a": "Eisen und Stahl (Erlös verrechnet)", "avv": "17 04 05", "h": 0.05, "geraet": 1},
                       {"a": "Kabel ohne Gefahrstoffe", "avv": "17 04 11", "h": 0.05, "geraet": 15},
                       {"a": "Dämmmaterial ohne Gefahrstoffe (EPS/XPS ohne HBCD)", "avv": "17 06 04", "h": 0.06, "geraet": 380},
                       {"a": "Mineralwolle neu (nach 2000)", "avv": "17 06 04", "h": 0.06, "geraet": 260},
                       {"a": "Gipskartonplatten", "avv": "17 08 02", "h": 0.04, "geraet": 125},
                       {"a": "Gemischte Bau- und Abbruchabfälle", "avv": "17 09 04", "h": 0.05, "geraet": 185},
                       {"a": "Bitumen-Dachbahnen ohne Teer", "avv": "17 03 02", "h": 0.05, "geraet": 165},
                       {"a": "Asphalt ohne Teer (Fräsgut)", "avv": "17 03 02", "h": 0.03, "geraet": 18},
                       {"a": "Papier und Pappe (Verpackungen)", "avv": "15 01 01", "h": 0.05, "geraet": 45},
                       {"a": "Verpackungen gemischt", "avv": "15 01 06", "h": 0.05, "geraet": 210},
                       {"a": "Bauschutt mit Anhaftungen (Putz, Estrich)", "avv": "17 01 07", "h": 0.03, "geraet": 38},
                       {"a": "Linoleum/PVC-Beläge ohne Schadstoffe", "avv": "17 02 03", "h": 0.05, "geraet": 230}]},
        {"kurz": "Entsorgung gefährlich: {a}, AVV {avv}",
         "lang": _TB + " Gefährlicher Abfall: Entsorgungsnachweis und Begleitschein im elektronischen Nachweisverfahren (eANV).",
         "einheit": "t", "kg": "394", "gen": "C", "achsen": [WEG, GEF, KLEIN_GEF],
         "varianten": [{"a": "Asbestzement fest gebunden", "avv": "17 06 05*", "h": 0.06, "geraet": 260},
                       {"a": "schwach gebundener Asbest (Spritzasbest, Platten)", "avv": "17 06 01*", "h": 0.08, "geraet": 680},
                       {"a": "KMF alt (vor 2000)", "avv": "17 06 03*", "h": 0.06, "geraet": 380},
                       {"a": "EPS/XPS mit HBCD (POP-Abfall, getrennt gehalten)", "avv": "17 06 04", "h": 0.06, "geraet": 980},
                       {"a": "teerhaltige Dachbahnen", "avv": "17 03 03*", "h": 0.06, "geraet": 260},
                       {"a": "Holz A IV (Bahnschwellen, Holzschutzmittel)", "avv": "17 02 04*", "h": 0.05, "geraet": 185},
                       {"a": "PAK-haltiger Parkettkleber/Estrich", "avv": "17 01 06*", "h": 0.06, "geraet": 230},
                       {"a": "PCB-haltige Fugenmassen", "avv": "17 09 02*", "h": 0.1, "geraet": 1650},
                       {"a": "Leuchtstofflampen (bruchsicherer Sammelbehälter)", "avv": "20 01 21*", "h": 0.1, "geraet": 1100, "achsen": [WEG, KLEIN_GEF]},
                       {"a": "Farb- und Lackreste in Gebinden", "avv": "08 01 11*", "h": 0.1, "geraet": 950, "achsen": [WEG, KLEIN_GEF]},
                       {"a": "Altöl in Gebinden", "avv": "13 02 05*", "h": 0.1, "geraet": 520, "achsen": [WEG, KLEIN_GEF]}]},
    ]},
    {"name": "Container und Behälter (Ergänzung)", "positionen": [
        {"kurz": "{c} stellen und abfahren",
         "lang": "{c} anliefern, stellen, nach Füllung bzw. Anforderung abholen (Transport bis 20 km, ohne Entsorgungsgebühr). Je Stellung.",
         "einheit": "St", "kg": "394", "gen": "B",
         "achsen": [[{"k": "", "t": ""}, {"k": "Straßenstellung", "t": "Stellung im öffentlichen Straßenraum einschließlich Sondernutzungserlaubnis und Absicherung.", "geraet": 95, "gen": "C"}],
                    [{"k": "", "t": ""}, {"k": "abdeckbar", "t": "Container mit Deckel bzw. Plane (Gips, Dämmstoffe, Papier).", "geraet": 35}]],
         "varianten": [{"c": "Absetzcontainer 3 m³", "h": 0, "geraet": 115}, {"c": "Absetzcontainer 5 m³", "h": 0, "geraet": 125},
                       {"c": "Absetzcontainer 7 m³", "h": 0, "geraet": 140}, {"c": "Absetzcontainer 10 m³", "h": 0, "geraet": 165},
                       {"c": "Abrollcontainer 15 m³", "h": 0, "geraet": 205}, {"c": "Abrollcontainer 20 m³", "h": 0, "geraet": 240},
                       {"c": "Abrollcontainer 30 m³", "h": 0, "geraet": 270}, {"c": "Abrollcontainer 40 m³", "h": 0, "geraet": 295},
                       {"c": "Big Bag 1 m³ (Kranabholung)", "h": 0, "geraet": 65}]},
        {"kurz": "Container-Standzeit über 14 Tage, {c}",
         "lang": "Standmiete für {c} über die mietfreie Zeit von 14 Tagen hinaus. Abrechnung je Kalendertag.",
         "einheit": "Tag", "kg": "394", "gen": "A", "h": 0,
         "varianten": [{"c": "Absetzcontainer", "geraet": 3}, {"c": "Abrollcontainer", "geraet": 5}]},
        {"kurz": "Container inkl. Entsorgung, {art}, {v}",
         "lang": "Container {v} stellen, abholen und Inhalt ({art}) entsorgen bzw. verwerten, einschließlich Gebühren und Nachweisen; "
                 "Füllung bis Ladekante. Je Container.",
         "einheit": "St", "kg": "394", "gen": "C", "achsen": [[{"k": "", "t": ""}, {"k": "Straßenstellung", "t": "Stellung im öffentlichen Straßenraum mit Genehmigung.", "geraet": 95}]],
         "varianten": [{"art": a, "v": v, "h": 0, "geraet": round(base + p * m3)} for a, p in (("Bauschutt sauber", 28), ("Bauschutt gemischt", 45), ("Holz A I–III", 30),
                                                                                         ("Baumischabfall", 70), ("Gips", 75), ("Grünschnitt", 20))
                       for v, m3, base in (("5 m³", 5, 125), ("7 m³", 7, 140), ("10 m³", 10, 165), ("20 m³", 20, 240))
                       if not (a.startswith("Bauschutt") and m3 > 10)]},   # Bauschutt nur bis 10 m³ (Nutzlast)
    ]},
    {"name": "Analytik und Nachweise", "positionen": [
        {"kurz": "Probenahme und Analyse {art}",
         "lang": "Probenahme {pn}, Analyse im akkreditierten Labor ({art}) und Prüfbericht mit Einstufung.",
         "einheit": "St", "kg": "394", "gen": "B", "achsen": [[{"k": "", "t": ""}, {"k": "Eilanalyse", "t": "Ergebnis innerhalb von 2 Arbeitstagen.", "fg": 1.5}]],
         "varianten": [{"art": "Boden nach Ersatzbaustoffverordnung", "h": 1, "geraet": 340, "pn": "nach LAGA PN 98 am Haufwerk"}, {"art": "Boden nach DepV (Deponieklasse)", "h": 1, "geraet": 480, "pn": "nach LAGA PN 98 am Haufwerk"},
                       {"art": "Bauschutt nach Ersatzbaustoffverordnung (RC)", "h": 1, "geraet": 360, "pn": "nach LAGA PN 98 am Haufwerk"}, {"art": "Asbest (REM) Materialprobe", "h": 0.5, "geraet": 95, "pn": "als Materialprobe am Bauteil (bei Asbest nach VDI 3866 Blatt 1)"},
                       {"art": "PAK in Asphalt/Kleber", "h": 0.5, "geraet": 85, "pn": "als Materialprobe am Bauteil"}, {"art": "KMF Einstufung (KI-Index)", "h": 0.5, "geraet": 120, "pn": "als Materialprobe am Bauteil"},
                       {"art": "PCB in Fugenmassen", "h": 0.5, "geraet": 110, "pn": "als Materialprobe am Bauteil"}, {"art": "HBCD in Dämmstoffen", "h": 0.5, "geraet": 130, "pn": "als Materialprobe am Bauteil"},
                       {"art": "Holz nach AltholzV", "h": 0.5, "geraet": 220, "pn": "als Materialprobe am Bauteil"}]},
        {"kurz": "Nachweisführung {art}",
         "lang": "{art} einschließlich Registerführung und Übergabe der Dokumentation an den Auftraggeber.",
         "einheit": "psch", "kg": "394", "gen": "B", "h": 0,
         "varianten": [{"art": "Entsorgungsnachweis für gefährliche Abfälle (eANV)", "geraet": 380}, {"art": "Abfallbilanz/Entsorgungskonzept für die Baustelle", "geraet": 650},
                       {"art": "Gewerbeabfallverordnung: Getrennthaltungsdokumentation", "geraet": 280}]},
        {"kurz": "Haufwerk anlegen und abdecken, {art}",
         "lang": "Ausbau- bzw. Aushubmaterial bis zum Vorliegen der Analyse getrennt als Haufwerk ({art}) lagern, mit Folie abdecken, beschriften.",
         "einheit": "m³", "kg": "394", "gen": "A", "lohn": "erdbau",
         "varianten": [{"art": "auf vorhandener Fläche", "h": 0.03, "mat": 0.8, "geraet": 2.5}, {"art": "auf Folie mit Randwall", "h": 0.05, "mat": 2, "geraet": 3.5}]},
    ]},
]
