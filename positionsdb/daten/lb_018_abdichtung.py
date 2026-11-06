# LB 018 Abdichtungsarbeiten (Bauwerksabdichtung DIN 18533 / DIN 18531-5) – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "018", "name": "Abdichtungsarbeiten", "atv": "DIN 18336", "lohn": "abdichtung",
    "gruppen": [
        {"name": "Untergrund, Vorarbeiten", "positionen": [
            {"kurz": "Untergrund vorbereiten, reinigen und grundieren",
             "lang": "Abdichtungsuntergrund aus Beton bzw. Mauerwerk von losen Teilen, Graten und Verschmutzungen "
                     "reinigen, Kanten brechen, Grundierung bzw. Voranstrich systemgerecht vollflächig auftragen.",
             "einheit": "m²", "kg": "326", "h": 0.08, "mat": 1.8, "gen": "A"},
            {"kurz": "Mörtelhohlkehle herstellen, Schenkellänge {s} cm",
             "lang": "Hohlkehle am Übergang Bodenplatte/Wand bzw. in Innenecken aus Sperrmörtel herstellen, "
                     "Schenkellänge {s} cm, als Untergrund für die Abdichtung.",
             "einheit": "m", "kg": "326", "gen": "A",
             "varianten": [{"s": "4", "h": 0.12, "mat": 1.8}, {"s": "6", "h": 0.15, "mat": 2.8}]},
            {"kurz": "Mauerwerk Kellerwand: Kratzspachtelung / Ausgleichsputz",
             "lang": "Fugen und Unebenheiten von Mauerwerk vor dem Aufbringen der Abdichtung mit Sperrmörtel als "
                     "Kratzspachtelung schließen, Mörteltaschen und Ausbrüche verfüllen.",
             "einheit": "m²", "kg": "335", "h": 0.20, "mat": 3.5, "gen": "A"},
        ]},
        {"name": "Erdberührte Bauteile", "positionen": [
            {"kurz": "Abdichtung PMBC (Bitumendickbeschichtung), {w}",
             "lang": "Abdichtung erdberührter Wände mit polymermodifizierter Bitumendickbeschichtung (PMBC) nach "
                     "DIN 18533 für Wassereinwirkungsklasse {w}, in zwei Arbeitsgängen, Trockenschichtdicke nach Norm, "
                     "{v}, einschließlich Schichtdickenkontrolle und Protokoll. Abrechnung nach abgedichteter Fläche.",
             "einheit": "m²", "kg": "335", "gen": "A",
             "varianten": [{"w": "W1-E (Bodenfeuchte, nichtstauendes Sickerwasser)", "v": "ohne Verstärkungseinlage", "h": 0.28, "mat": 11},
                           {"w": "W2.1-E (mäßige Einwirkung drückenden Wassers)", "v": "mit Verstärkungseinlage aus Gewebe", "h": 0.38, "mat": 17}]},
            {"kurz": "Abdichtung mineralische Dichtschlämme (MDS), flexibel, W1-E",
             "lang": "Abdichtung erdberührter Wand- und Sockelflächen mit flexibler mineralischer Dichtungsschlämme "
                     "(MDS) in mindestens zwei Arbeitsgängen, Trockenschichtdicke ≥ 2 mm, für W1-E.",
             "einheit": "m²", "kg": "335", "h": 0.30, "mat": 9.5, "gen": "A"},
            {"kurz": "Abdichtung Bitumen-Schweißbahnen, {n}-lagig, erdberührt",
             "lang": "Abdichtung erdberührter Bauteile mit Polymerbitumen-Schweißbahnen, {n}-lagig, vollflächig "
                     "aufgeschweißt, Stöße überlappt 10 cm, auf Voranstrich, einschließlich Kehlen und Kanten.",
             "einheit": "m²", "kg": "326", "gen": "B",
             "varianten": [{"n": "1", "h": 0.30, "mat": 11}, {"n": "2", "h": 0.50, "mat": 21}]},
            {"kurz": "Frischbetonverbundsystem (FBV) unter Bodenplatte",
             "lang": "Frischbetonverbundbahn als Abdichtung bzw. Zusatzmaßnahme unter WU-Bodenplatten verlegen, "
                     "Stöße mit Systemklebeband geschlossen, Hochführung an Schalung, einschließlich Detailausbildung. "
                     "Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "326", "h": 0.12, "mat": 19, "gen": "B"},
            {"kurz": "Abdichtung Bodenplatte unten, Bitumenbahn auf Sauberkeitsschicht",
             "lang": "Querschnitts- bzw. Flächenabdichtung auf der Sauberkeitsschicht unter Bodenplatten aus einer "
                     "Lage Bitumen-Schweißbahn, Stöße 10 cm überlappt verschweißt, mit Schutzlage.",
             "einheit": "m²", "kg": "326", "h": 0.25, "mat": 12, "gen": "A"},
            {"kurz": "Rohrdurchführung abdichten, Los-/Festflansch bzw. Dichtmanschette, DN {dn}",
             "lang": "Durchdringung einer Rohrleitung durch die Abdichtung mit Systemmanschette bzw. Los- und "
                     "Festflanschkonstruktion abdichten, passend zur Abdichtungsart und Wassereinwirkungsklasse. Nennweite bis DN {dn}.",
             "einheit": "St", "kg": "326", "gen": "B",
             "varianten": [{"dn": "100", "h": 0.8, "mat": 28}, {"dn": "200", "h": 1.2, "mat": 75}]},
            {"kurz": "Schutzlage Noppenbahn vor Abdichtung, Noppenhöhe 8 mm",
             "lang": "Schutz- bzw. Dränschicht aus HDPE-Noppenbahn, Noppenhöhe 8 mm, mit Vlies, Noppen zur Wand, "
                     "oben mit Abschlussleiste befestigt, Stöße überlappt.",
             "einheit": "m²", "kg": "335", "h": 0.10, "mat": 4.5, "gen": "A"},
            {"kurz": "Perimeterdämmung XPS, d = {d} mm, geklebt",
             "lang": "Perimeterdämmung aus extrudiertem Polystyrol (XPS) mit Stufenfalz, WLS 035, Dicke {d} mm, "
                     "druckfest, auf der Abdichtung mit systemverträglichem Kleber punktweise verklebt, Stöße dicht.",
             "einheit": "m²", "kg": "335", "gen": "A",
             "varianten": [{"d": "80", "h": 0.15, "mat": 15}, {"d": "120", "h": 0.16, "mat": 22}, {"d": "160", "h": 0.18, "mat": 29},
                           {"d": "200", "h": 0.20, "mat": 36}]},
            {"kurz": "Lastabtragende Dämmung unter Bodenplatte, {m}",
             "lang": "Lastabtragende Wärmedämmung unter der Bodenplatte aus {m}, auf verdichtetem Planum, "
                     "mit Trennvlies, Dicke nach Wärmeschutznachweis {d}.",
             "kg": "324", "gen": "B",
             "varianten": [{"m": "XPS 300 kPa, zweilagig versetzt", "d": "(160 mm)", "einheit": "m²", "h": 0.18, "mat": 32},
                           {"m": "Schaumglasschotter, lose, 1,3-fach verdichtet", "d": "(m³ eingebaut)", "einheit": "m³", "h": 0.6, "mat": 105, "geraet": 8}]},
        ]},
        {"name": "Sockel, Balkone, Fugen", "positionen": [
            {"kurz": "Sockelabdichtung, Spritzwasserbereich, MDS bis 50 cm über Gelände",
             "lang": "Sockelabdichtung im Spritzwasserbereich von 20 cm unter bis 30–50 cm über Geländeoberfläche mit "
                     "flexibler Dichtschlämme in zwei Arbeitsgängen, Anschluss an die erdberührte Abdichtung überlappend.",
             "einheit": "m", "kg": "335", "h": 0.25, "mat": 6, "gen": "A"},
            {"kurz": "Balkon-/Terrassenabdichtung, {s}",
             "lang": "Abdichtung genutzter Dachflächen bzw. Balkone nach DIN 18531-5 mit {s}, einschließlich "
                     "Wandanschluss mindestens 15 cm über Belag (an Türen mit Rinne 5 cm), Randabschlüsse und Entwässerung. "
                     "Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "359", "gen": "B",
             "varianten": [{"s": "Flüssigkunststoff (PMMA/PU), vlieseinlagig", "h": 0.55, "mat": 38},
                           {"s": "Polymerbitumenbahn zweilagig, oberste Lage wurzelfest", "h": 0.55, "mat": 24}]},
            {"kurz": "Anschluss Abdichtung an Tür/Fenster, Flüssigkunststoff",
             "lang": "Anschluss der Bauwerksabdichtung an Tür- und Fensterelemente bzw. Schwellen mit "
                     "Flüssigkunststoff und Vlieseinlage, Anschlusshöhe nach Norm, einschließlich Grundierung.",
             "einheit": "m", "kg": "359", "h": 0.45, "mat": 14, "gen": "B"},
            {"kurz": "Fugenband / Dehnfugenabdichtung, Breite {b} cm",
             "lang": "Bewegungsfuge in der Abdichtung mit elastischem Fugenband bzw. Schlaufe aus Bahnen überbrücken, "
                     "Breite {b} cm, beidseitig eingebunden.",
             "einheit": "m", "kg": "326", "gen": "B",
             "varianten": [{"b": "20", "h": 0.35, "mat": 12}, {"b": "30", "h": 0.45, "mat": 18}]},
            {"kurz": "Lichtschacht abdichten / Kellerfenster-Anschluss",
             "lang": "Anschluss der Abdichtung an Lichtschacht bzw. Kellerfenster: Dichtbandanschluss rundum, "
                     "Schachtbefestigung abdichten, einschließlich Kehlen.",
             "einheit": "St", "kg": "335", "h": 1.2, "mat": 25, "gen": "B"},
        ]},
        {"name": "Instandsetzung Bestand", "positionen": [
            {"kurz": "Nachträgliche Horizontalsperre, Injektionsverfahren, Wanddicke {d} cm",
             "lang": "Nachträgliche Horizontalabdichtung in bestehendem Mauerwerk im Bohrlochinjektionsverfahren mit "
                     "zugelassenem Injektionsmittel (Silan/Siloxan-Creme), Bohrlochabstand 10–12 cm, Bohrlöcher anschließend "
                     "verschließen. Wanddicke bis {d} cm. Abrechnung nach Wandlänge.",
             "einheit": "m", "kg": "335", "gen": "C", "tags": ["altbau"],
             "varianten": [{"d": "24", "h": 0.8, "mat": 22, "geraet": 3}, {"d": "36,5", "h": 1.0, "mat": 32, "geraet": 4},
                           {"d": "50", "h": 1.3, "mat": 44, "geraet": 5}]},
            {"kurz": "Kellerwand von innen abdichten, mineralisches Abdichtungssystem",
             "lang": "Innenabdichtung erdberührter Kellerwände im Bestand: Altputz entfernen (gesondert), Untergrund "
                     "vorbereiten, Dichtschlämme zweilagig und Sanierputz-System nach WTA, einschließlich Hohlkehle.",
             "einheit": "m²", "kg": "335", "h": 1.2, "mat": 32, "gen": "C", "tags": ["altbau"]},
            {"kurz": "Kellerwand außen freilegen und neu abdichten (ohne Erdarbeiten)",
             "lang": "Freigelegte Kelleraußenwand reinigen, Altabdichtung entfernen, Fehlstellen mit Sperrmörtel "
                     "schließen, Hohlkehle, Abdichtung mit PMBC zweilagig, Noppenbahn, einschließlich Anschluss an "
                     "Sockelabdichtung. Erdarbeiten gesondert.",
             "einheit": "m²", "kg": "335", "h": 1.0, "mat": 26, "gen": "C", "tags": ["altbau"]},
            {"kurz": "Rissinjektion im Beton, je m Riss",
             "lang": "Wasserführende Risse in Beton- bzw. WU-Bauteilen mit Injektionsharz über Bohrpacker "
                     "verpressen, Packer anschließend entfernen und Bohrlöcher verschließen. Abrechnung nach Risslänge.",
             "einheit": "m", "kg": "335", "h": 1.0, "mat": 25, "geraet": 6, "gen": "C", "tags": ["altbau"]},
            {"kurz": "Schleierinjektion Acrylatgel, flächig",
             "lang": "Flächige Schleierinjektion gegen drückendes bzw. flächig eindringendes Wasser: Bohrlöcher im Raster "
                     "durch das Bauteil, Packer setzen, Acrylatgel hinter das Bauteil verpressen, Packer entfernen und "
                     "Bohrlöcher verschließen. Abrechnung nach behandelter Fläche, Injektionsgut bis 15 kg/m² enthalten.",
             "einheit": "m²", "kg": "335", "h": 1.0, "mat": 45, "geraet": 5, "gen": "C", "tags": ["altbau"]},
        ]},
    ],
}]

# ---------------------------------------------------------------- Runde 2: Ausführungsachsen und weitere Grundpositionen
FLAECHE = [{}, {"k": "≤ 10 m²", "t": "Ausführung in Einzelflächen bis 10 m².", "fh": 1.35, "fm": 1.08}]
ORT = [{}, {"k": "im Bestand", "t": "Ausführung im Bestand: Untergrund mit Altresten, erschwerte Zugänglichkeit.", "fh": 1.30, "gen": "C", "tags": ["altbau"]}]
TIEFE = [{"k": "", "t": "Einbautiefe bis 1,5 m unter Gelände."},
         {"k": "Tiefe ≤ 3 m", "t": "Einbautiefe bis 3,0 m unter Gelände, Arbeiten im Arbeitsraum.", "fh": 1.12}]
WE = [{"k": "W1-E", "t": "Wassereinwirkungsklasse W1-E."}, {"k": "W2.1-E", "t": "Wassereinwirkungsklasse W2.1-E (drückendes Wasser bis 3 m).", "fh": 1.30, "fm": 1.45, "gen": "B"}]
UG = [{"k": "Beton", "t": "Untergrund Beton."}, {"k": "Mauerwerk", "t": "Untergrund Mauerwerk mit Kratzspachtelung (gesondert).", "fh": 1.08, "fm": 1.06}]
DBS = [{"k": "", "t": ""}, {"k": "Dichtband Ecken", "t": "Einschließlich Dichtband in Innen- und Außenecken.", "h": 0.03, "mat": 1.2}]


def _ax(lb, gruppe, prefix, achsen):
    for gr in lb["gruppen"]:
        if gr["name"] == gruppe:
            for p in gr["positionen"]:
                if p["kurz"].startswith(prefix) and "achsen" not in p:
                    p["achsen"] = achsen


L = LBS[0]
_ax(L, "Untergrund, Vorarbeiten", "Untergrund vorbereiten", [UG, FLAECHE, ORT])
_ax(L, "Untergrund, Vorarbeiten", "Mörtelhohlkehle", [ORT])
_ax(L, "Untergrund, Vorarbeiten", "Mauerwerk Kellerwand", [FLAECHE, ORT])
_ax(L, "Erdberührte Bauteile", "Abdichtung PMBC", [UG, TIEFE, FLAECHE, ORT])
_ax(L, "Erdberührte Bauteile", "Abdichtung mineralische", [UG, DBS, FLAECHE, ORT])
_ax(L, "Erdberührte Bauteile", "Abdichtung Bitumen-Schweißbahnen", [[{"k": "Wand", "t": "Ausführung an Wandflächen.", "kg": "335", "fh": 1.15}, {"k": "Boden", "t": "Ausführung auf Bodenflächen."}], TIEFE, FLAECHE])
_ax(L, "Erdberührte Bauteile", "Frischbetonverbundsystem", [[{"k": "Bodenplatte", "t": ""}, {"k": "Wand (an Schalung)", "t": "Einbau an der Wandschalung.", "kg": "335", "fh": 1.4}], FLAECHE])
_ax(L, "Erdberührte Bauteile", "Rohrdurchführung", [WE, ORT])
_ax(L, "Erdberührte Bauteile", "Schutzlage Noppenbahn", [TIEFE, FLAECHE])
_ax(L, "Erdberührte Bauteile", "Perimeterdämmung XPS", [[{"k": "Wand", "t": ""}, {"k": "unter Bodenplatte", "t": "Lose verlegt unter der Bodenplatte, zweilagig versetzt nicht erforderlich.", "kg": "324", "fh": 0.8}], TIEFE, FLAECHE])
_ax(L, "Sockel, Balkone, Fugen", "Sockelabdichtung", [UG, ORT])
_ax(L, "Sockel, Balkone, Fugen", "Balkon-/Terrassenabdichtung", [FLAECHE, ORT, [{}, {"k": "mit Gefälleestrich-Ausgleich", "t": "Einschließlich Gefälleausgleich mit Reparaturmörtel bis 1 cm.", "h": 0.25, "mat": 8}]])
_ax(L, "Sockel, Balkone, Fugen", "Anschluss Abdichtung", [ORT])
_ax(L, "Sockel, Balkone, Fugen", "Fugenband", [WE, ORT])
_ax(L, "Instandsetzung Bestand", "Nachträgliche Horizontalsperre", [[{"k": "Ziegel/KS", "t": ""}, {"k": "Natursteinmauerwerk", "t": "Mischmauerwerk/Naturstein mit Hohlräumen, Vorverfüllung mit Suspension.", "fh": 1.4, "fm": 1.3}], [{}, {"k": "beidseitig gebohrt", "t": "Bohrungen beidseitig versetzt.", "fh": 1.3}]])
_ax(L, "Instandsetzung Bestand", "Kellerwand von innen", [FLAECHE])
_ax(L, "Instandsetzung Bestand", "Kellerwand außen", [TIEFE, WE, FLAECHE])
_ax(L, "Instandsetzung Bestand", "Rissinjektion", [[{"k": "PU-Harz", "t": "Injektionsharz Polyurethan (abdichtend, dehnfähig)."}, {"k": "Epoxidharz kraftschlüssig", "t": "Kraftschlüssige Füllung mit Epoxidharz.", "fm": 1.3}]])

L["gruppen"].append({"name": "Innenräume, Bahnen, Sonderbauteile", "positionen": [
    {"kurz": "Abdichtung Innenraum Bodenplatte, Bitumenbahn {n}-lagig (W1-E)",
     "lang": "Flächenabdichtung auf der Bodenplatte unter Estrich gegen Bodenfeuchte (W1-E) mit Polymerbitumenbahnen "
             "{n}-lagig, Stöße verschweißt, an Wänden 15 cm hochgeführt bzw. an die Querschnittsabdichtung angeschlossen.",
     "einheit": "m²", "kg": "325", "gen": "A", "achsen": [FLAECHE, ORT],
     "varianten": [{"n": "1", "h": 0.25, "mat": 10}, {"n": "2", "h": 0.42, "mat": 19}]},
    {"kurz": "Abdichtung mit Kunststoff-/Elastomerbahn (FPO/EPDM), erdberührt, d = {d} mm",
     "lang": "Bauwerksabdichtung erdberührter Bauteile mit homogener Kunststoff- bzw. Elastomerbahn, Dicke {d} mm, "
             "lose verlegt bzw. punktweise befestigt, Nähte heißluftverschweißt und geprüft, mit Schutzvlies beidseitig.",
     "einheit": "m²", "kg": "335", "gen": "B", "achsen": [TIEFE, WE, FLAECHE],
     "varianten": [{"d": "1,5", "h": 0.40, "mat": 21}, {"d": "2,0", "h": 0.45, "mat": 27}]},
    {"kurz": "Abdichtung Aufzugs-/Pumpensumpf, {s}",
     "lang": "Abdichtung von Aufzugsunterfahrt bzw. Pumpensumpf mit {s}, einschließlich Kehlen, Ecken und "
             "Anschluss an die Bodenplatte bzw. WU-Konstruktion. Abrechnung nach Fläche.",
     "einheit": "m²", "kg": "326", "gen": "C", "achsen": [WE],
     "varianten": [{"s": "PMBC mit Gewebeeinlage", "h": 0.8, "mat": 19}, {"s": "MDS zweilagig mit Dichtband", "h": 0.75, "mat": 14},
                   {"s": "Bitumenschweißbahn zweilagig", "h": 0.9, "mat": 24}]},
    {"kurz": "Abdichtung Tiefgaragen-/Parkdeck, {s}",
     "lang": "Befahrbare Abdichtung auf Parkdeck bzw. Tiefgaragendecke mit {s}, einschließlich Grundierung, "
             "Anschlüsse an Abläufe und Aufkantungen. Schutz- bzw. Nutzschicht gesondert.",
     "einheit": "m²", "kg": "352", "gen": "C", "achsen": [FLAECHE, ORT],
     "varianten": [{"s": "Polymerbitumen-Schweißbahn zweilagig mit Gussasphalt-Schutzschicht vorbereitet", "h": 0.55, "mat": 28},
                   {"s": "Flüssigkunststoff-Oberflächenschutz OS 10/OS 11, rissüberbrückend", "h": 0.65, "mat": 46}]},
    {"kurz": "Abdichtungsanschluss an Durchdringung {a}",
     "lang": "Anschluss der Bauwerksabdichtung an Durchdringung ({a}) mit systemgerechter Manschette bzw. "
             "Flüssigkunststoff mit Vlies, einschließlich Grundierung und Reinigung.",
     "einheit": "St", "kg": "326", "gen": "B", "achsen": [WE, ORT],
     "varianten": [{"a": "Kabel bis Ø 20 mm, Mehrfachdurchführung bis 4 Kabel", "h": 0.7, "mat": 45},
                   {"a": "Stütze / Profil bis 200 × 200 mm", "h": 1.0, "mat": 30},
                   {"a": "Kernbohrung mit Ringraumdichtung DN 150", "h": 0.8, "mat": 85}]},
    {"kurz": "Fugenabdichtung WU-Beton, {s}",
     "lang": "Abdichtung von Arbeits- bzw. Sollrissfugen in WU-Bauteilen mit {s} nach Herstellerangabe und "
             "Fugenplan, einschließlich Befestigung und Stoßverbindungen. Abrechnung nach Fugenlänge.",
     "einheit": "m", "kg": "326", "gen": "B", "lohn": "rohbau",
     "varianten": [{"s": "beschichtetem Fugenblech 167 mm", "h": 0.15, "mat": 9.5}, {"s": "Quellband (Bentonit/Hydrogel)", "h": 0.10, "mat": 7},
                   {"s": "verpressbarem Injektionsschlauch inkl. Packer", "h": 0.18, "mat": 8.5},
                   {"s": "Sollrissfugenelement", "h": 0.20, "mat": 16}]},
    {"kurz": "Verpressen Injektionsschlauch WU-Fuge, Nachinjektion",
     "lang": "Verpressen bereits eingebauter Injektionsschläuche mit Acrylat- bzw. PU-Harz bei Undichtigkeiten, "
             "Protokollierung der Verpressmengen. Abrechnung nach verpresster Schlauchlänge.",
     "einheit": "m", "kg": "326", "h": 0.25, "mat": 8, "geraet": 3, "gen": "C", "lohn": "rohbau"},
    {"kurz": "Querschnittsabdichtung Mauerwerk nachträglich, {v}",
     "lang": "Nachträgliche Querschnittsabdichtung von Bestandsmauerwerk im {v}, abschnittsweise nach Statik, "
             "einschließlich Verkeilen bzw. Vermörteln. Abrechnung nach Wandlänge, Wanddicke bis 36,5 cm.",
     "einheit": "m", "kg": "335", "gen": "C", "tags": ["altbau"], "lohn": "rohbau",
     "varianten": [{"v": "Mauersägeverfahren mit Edelstahl-/Kunststoffplatten", "h": 2.0, "mat": 45, "geraet": 25},
                   {"v": "Chromstahlblech-Einrammverfahren (nur durchgehende Lagerfuge)", "h": 1.2, "mat": 55, "geraet": 15}]},
    {"kurz": "Sanierputz-System WTA, innen, d = {d} cm",
     "lang": "Sanierputzsystem nach WTA-Merkblatt auf salzbelastetem Mauerwerk: Spritzbewurf, Grundputz als "
             "Porengrundputz und Sanierputz, Gesamtdicke {d} cm, Oberfläche abgerieben.",
     "einheit": "m²", "kg": "336", "gen": "C", "tags": ["altbau"], "lohn": "putz", "achsen": [FLAECHE],
     "varianten": [{"d": "2", "h": 0.75, "mat": 16}, {"d": "3", "h": 0.90, "mat": 23}, {"d": "4", "h": 1.05, "mat": 30}]},
    {"kurz": "Altabdichtung / Bitumenanstrich entfernen, {v}",
     "lang": "Vorhandene Abdichtung bzw. Bitumenanstriche auf erdberührten Wänden {v} entfernen, Reste sammeln; "
             "Entsorgung und Schadstoffuntersuchung (PAK) gesondert.",
     "einheit": "m²", "kg": "394", "gen": "C", "tags": ["altbau"], "lohn": "abbruch",
     "varianten": [{"v": "mechanisch (Abschaben, Fräsen)", "h": 0.55, "geraet": 3}, {"v": "Höchstdruckwasserstrahlen", "h": 0.35, "geraet": 9}]},
    {"kurz": "Feuchtemessung Mauerwerk (Darr-Methode), je Messstelle",
     "lang": "Entnahme von Bohrmehlproben in zwei Tiefen und Bestimmung des Feuchte- und Salzgehalts (Darr-Methode "
             "bzw. Laboranalyse), Dokumentation im Messplan.",
     "einheit": "St", "kg": "335", "h": 0.5, "geraet": 45, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Dränmatte / Schutzplatte vor Perimeterdämmung, {m}",
     "lang": "Schutz- und Dränschicht vor Perimeterdämmung aus {m}, mit Filtervlies, an der Oberkante mit "
             "Abschlussprofil gesichert.",
     "einheit": "m²", "kg": "335", "gen": "A", "achsen": [TIEFE],
     "varianten": [{"m": "Noppenbahn 20 mm mit Vlies", "h": 0.12, "mat": 8.5}, {"m": "Dränplatte EPS haufwerksporig 50 mm", "h": 0.15, "mat": 12},
                   {"m": "Bautenschutzmatte Gummigranulat 6 mm", "h": 0.10, "mat": 7}]},
]})
