# LB 034 Maler- und Lackierarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "034", "name": "Maler- und Lackierarbeiten", "atv": "DIN 18363", "lohn": "maler",
    "gruppen": [
        {"name": "Vorarbeiten", "positionen": [
            {"kurz": "Abdeckarbeiten {art}",
             "lang": "Nicht zu behandelnde Flächen und Bauteile {art} mit Folie, Malervlies bzw. Abklebeband schützen, "
                     "nach Abschluss entfernen und entsorgen. Abrechnung nach {abr}.",
             "einheit": "m²", "kg": "345", "gen": "A",
             "varianten": [{"art": "Böden mit Malervlies auslegen", "abr": "Bodenfläche", "h": 0.03, "mat": 0.9},
                           {"art": "Fenster und Türen abkleben", "abr": "Bauteilfläche", "h": 0.08, "mat": 0.6}]},
            {"kurz": "Untergrund vorbehandeln: {art}",
             "lang": "Untergrund für Beschichtung vorbehandeln: {art}. Abrechnung nach behandelter Fläche.",
             "einheit": "m²", "kg": "345", "gen": "A",
             "varianten": [{"art": "Tiefgrund lösemittelfrei auf Putz bzw. Gipsplatten", "h": 0.03, "mat": 0.5},
                           {"art": "Sperrgrund bei Nikotin-, Wasser- oder Rußflecken", "h": 0.05, "mat": 1.4},
                           {"art": "lose Altanstriche abstoßen und Fehlstellen spachteln", "h": 0.12, "mat": 0.6},
                           {"art": "Leimfarbe abwaschen", "h": 0.15, "mat": 0.3},
                           {"art": "Altanstrich mit Abbeizer entfernen (Holz/Metall)", "h": 0.55, "mat": 4}]},
            {"kurz": "Flächenspachtelung auf Putz, {q}",
             "lang": "Putzflächen ganzflächig spachteln und schleifen, Qualitätsstufe {q}, für glatte Anstriche "
                     "und Streiflicht-Anforderungen. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "345", "gen": "B",
             "varianten": [{"q": "Q3 (einfach)", "h": 0.20, "mat": 1.3}, {"q": "Q4 (vollflächig zweifach)", "h": 0.38, "mat": 2.5}]},
            {"kurz": "Rissüberbrückung mit Gewebe/Vlies im Bestand",
             "lang": "Risse im Putz öffnen, mit Füllspachtel schließen und ein Renoviervlies bzw. Glasgewebe "
                     "streifenweise oder flächig einkleben, zum Überstreichen vorbereitet.",
             "einheit": "m", "kg": "345", "h": 0.18, "mat": 1.6, "gen": "B", "tags": ["altbau"]},
        ]},
        {"name": "Innenanstriche", "positionen": [
            {"kurz": "Dispersionsanstrich innen, Nassabrieb Kl. {k}, {art}",
             "lang": "Innenwand- bzw. Deckenanstrich mit Dispersionsfarbe nach DIN EN 13300, Nassabriebklasse {k}, "
                     "Deckvermögen Klasse 2, {art}, Farbton weiß bzw. hell getönt. Öffnungen über 2,5 m² werden "
                     "abgezogen. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "345", "gen": "A",
             "varianten": [{"k": "3", "art": "Grund- und Schlussanstrich auf Wand", "h": 0.10, "mat": 1.1},
                           {"k": "2", "art": "Grund- und Schlussanstrich auf Wand, scheuerbeständig", "h": 0.10, "mat": 1.6},
                           {"k": "3", "art": "Grund- und Schlussanstrich auf Decke", "h": 0.12, "mat": 1.1, "kg": "353"},
                           {"k": "1", "art": "Latexfarbe, zweimal, in stark beanspruchten Bereichen", "h": 0.11, "mat": 2.1}]},
            {"kurz": "Silikatanstrich innen, zweimal, auf mineralischem Putz",
             "lang": "Innenanstrich mit Dispersions-Silikatfarbe auf mineralischem Putz, Grund- und Schlussanstrich, "
                     "diffusionsoffen und schimmelhemmend ohne Biozid, Farbton weiß.",
             "einheit": "m²", "kg": "345", "h": 0.11, "mat": 1.6, "gen": "A"},
            {"kurz": "Aufpreis Farbton {art}",
             "lang": "Aufpreis zu den Anstrichpositionen für {art}.",
             "einheit": "m²", "kg": "345", "gen": "B",
             "varianten": [{"art": "mittlere Farbtöne (Farbtonklasse 2)", "h": 0.0, "mat": 0.8},
                           {"art": "intensive Farbtöne mit zusätzlichem Anstrich", "h": 0.06, "mat": 1.8},
                           {"art": "Farbwechsel und Abkleben scharfkantiger Farbtrennung", "einheit": "m", "h": 0.06, "mat": 0.3}]},
            {"kurz": "Anstrich auf Beton/Kalksandstein-Sichtmauerwerk innen, zweimal",
             "lang": "Lasierender bzw. deckender Anstrich auf Sichtbeton oder Kalksand-Sichtmauerwerk innen, nach "
                     "Grundierung zweimal, Fugen mitgestrichen.",
             "einheit": "m²", "kg": "345", "h": 0.14, "mat": 1.6, "gen": "A"},
            {"kurz": "Treppenhaus/Hohe Räume: Aufpreis Anstrich über 3,5 m Höhe",
             "lang": "Aufpreis für Anstricharbeiten an Wand- und Deckenflächen über 3,5 m Arbeitshöhe "
                     "einschließlich Rollgerüst bzw. Arbeitsbühne.",
             "einheit": "m²", "kg": "345", "h": 0.04, "mat": 0, "geraet": 0.6, "gen": "B"},
            {"kurz": "Schimmelsanierung oberflächlich, Fläche bis 0,5 m²",
             "lang": "Oberflächlichen Schimmelbefall nach Ursachenklärung mit geeignetem Mittel abtöten, entfernen, "
                     "Fläche mit Sperr- und Schimmelschutzbeschichtung überarbeiten. Je Einzelfläche bis 0,5 m².",
             "einheit": "St", "kg": "345", "h": 1.2, "mat": 9, "gen": "C", "tags": ["altbau"]},
        ]},
        {"name": "Lackierungen", "positionen": [
            {"kurz": "Holztreppengeländer/Handlauf lackieren bzw. ölen",
             "lang": "Holzhandläufe und Geländer reinigen, anschleifen, zweimal mit Klarlack bzw. Hartöl behandeln. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "359", "h": 0.35, "mat": 1.5, "gen": "B"},
            {"kurz": "Lackierung {bauteil}, {sys}",
             "lang": "Beschichtung {bauteil}: Untergrund reinigen, anschleifen, {sys}, Farbton nach RAL. "
                     "Abrechnung nach {abr}.",
             "einheit": "St", "kg": "344", "gen": "B",
             "varianten": [
                 {"bauteil": "Holztür beidseitig einschl. Kanten", "sys": "Grundierung, Vorlack und Acryl-Schlusslack", "abr": "Stück (Türblatt bis 1,0 × 2,1 m)", "einheit": "St", "kg": "344", "h": 1.6, "mat": 9},
                 {"bauteil": "Stahlzarge bis 1,0 × 2,1 m", "sys": "Haftgrund und zweimal Acryl-Lack", "abr": "Stück", "einheit": "St", "kg": "344", "h": 0.8, "mat": 4},
                 {"bauteil": "Holzfenster außen und innen, überholen", "sys": "Zwischenschliff und Dickschichtlasur zweimal", "abr": "Stück bis 1,5 m²", "einheit": "St", "kg": "334", "h": 1.8, "mat": 8},
                 {"bauteil": "Heizkörper Plattenheizkörper", "sys": "Heizkörperlack zweimal", "abr": "Ansichtsfläche einfach", "einheit": "m²", "kg": "423", "h": 0.55, "mat": 3},
                 {"bauteil": "Rohrleitungen bis DN 50", "sys": "Grundierung und Kunstharzlack", "abr": "Länge", "einheit": "m", "kg": "422", "h": 0.12, "mat": 0.6},
                 {"bauteil": "Stahlgeländer Füllstab", "sys": "Haftgrund und zweimal Metallschutzlack", "abr": "Ansichtsfläche einfach", "einheit": "m²", "kg": "359", "h": 0.70, "mat": 4.5},
                 {"bauteil": "Stahlteile verzinkt", "sys": "Haftvermittler und zweimal 2K-Acryl-Lack", "abr": "abgewickelte Fläche", "einheit": "m²", "kg": "359", "h": 0.45, "mat": 6},
                 {"bauteil": "Holzbekleidung/Dachüberstand außen", "sys": "Imprägniergrund und Dünnschichtlasur zweimal", "abr": "Fläche", "einheit": "m²", "kg": "363", "h": 0.28, "mat": 3},
             ]},
            {"kurz": "Brandschutzbeschichtung Stahlträger R{r}, U/A bis {ua}",
             "lang": "Dämmschichtbildende Brandschutzbeschichtung für Stahlbauteile nach allgemeiner Bauartgenehmigung, "
                     "Feuerwiderstand R{r}, Profilfaktor U/A bis {ua} m⁻¹, mit Grundierung und Überzugslack, "
                     "Schichtdicke nach Zulassung, mit Kennzeichnungsschild. Abrechnung nach abgewickelter Fläche.",
             "einheit": "m²", "kg": "359", "gen": "C", "lohn": "maler",
             "varianten": [{"r": "30", "ua": "200", "h": 0.55, "mat": 18}, {"r": "60", "ua": "200", "h": 0.90, "mat": 42}]},
        ]},
        {"name": "Fassade, Boden, Sonstiges", "positionen": [
            {"kurz": "Holzfassade/Holzbauteile außen {art}",
             "lang": "Holzflächen außen {art}, Farbton nach Bemusterung, einschließlich Reinigung und Anschliff. "
                     "Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "335", "gen": "B",
             "varianten": [{"art": "deckend mit Holzschutzfarbe zweimal beschichten", "h": 0.30, "mat": 3.5},
                           {"art": "mit Vergrauungslasur einmal behandeln", "h": 0.15, "mat": 2.0}]},
            {"kurz": "Kellerwände/Tiefgarage: Anstrich mit Kalk- bzw. Silikatfarbe einmal",
             "lang": "Einmaliger Anstrich von Keller-, Technik- oder Tiefgaragenwänden und -decken auf Beton bzw. "
                     "Kalksandstein mit Kalk- bzw. Silikatfarbe, Farbton weiß. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "345", "h": 0.06, "mat": 0.7, "gen": "A"},
            {"kurz": "Sockelanstrich/Fassadensockel, wasserabweisend, zweimal",
             "lang": "Sockelflächen im Spritzwasserbereich mit wasserabweisender Sockelfarbe zweimal beschichten, "
                     "einschließlich Grundierung. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "335", "h": 0.25, "mat": 4, "gen": "A"},
            {"kurz": "Fassadenanstrich {art}, zweimal",
             "lang": "Fassadenanstrich mit {art} auf mineralischem Putz bzw. Beton: Reinigen, Grundierung, "
                     "Zwischen- und Schlussanstrich, Farbton nach Bemusterung. Öffnungen über 2,5 m² werden abgezogen. "
                     "Gerüst gesondert.",
             "einheit": "m²", "kg": "335", "gen": "A",
             "varianten": [{"art": "Silikonharzfarbe", "h": 0.20, "mat": 3.5},
                           {"art": "Dispersions-Silikatfarbe", "h": 0.20, "mat": 3.0},
                           {"art": "Reinacrylat-Fassadenfarbe", "h": 0.20, "mat": 3.2}]},
            {"kurz": "Fassade reinigen mit Heißwasser-Hochdruck",
             "lang": "Fassadenflächen vor der Beschichtung mit Heißwasser-Hochdruckgerät reinigen, Algen- und "
                     "Pilzbefall mit Fassadenreiniger behandeln. Gerüst gesondert.",
             "einheit": "m²", "kg": "335", "h": 0.08, "mat": 0.4, "geraet": 0.5, "gen": "A", "tags": ["altbau"]},
            {"kurz": "Betonlasur/Betonkosmetik auf Sichtbeton",
             "lang": "Farbangleichung von Sichtbetonflächen durch Betonlasur in Lasurtechnik, nach Musterfläche, "
                     "einschließlich Hydrophobierung.",
             "einheit": "m²", "kg": "335", "h": 0.40, "mat": 5.5, "gen": "C"},
            {"kurz": "Bodenbeschichtung {art}",
             "lang": "Bodenbeschichtung auf Beton- bzw. Zementestrich {art}, Untergrund kugelgestrahlt bzw. "
                     "geschliffen (gesondert), Kehlen und Aufkantungen gesondert.",
             "einheit": "m²", "kg": "352", "gen": "B",
             "varianten": [{"art": "als Versiegelung 2K-Epoxid, zweimal, z. B. Kellerräume", "h": 0.18, "mat": 7},
                           {"art": "als Beschichtung Epoxid, abgestreut, rutschhemmend R11 (Garage, Technik)", "h": 0.35, "mat": 18},
                           {"art": "als PU-Verlaufsbeschichtung 2 mm", "h": 0.40, "mat": 28}]},
            {"kurz": "Markierung Parkplätze/Wege, Breite 12 cm",
             "lang": "Bodenmarkierung mit 2K-Markierungsfarbe, Breite 12 cm, abgeklebt, einschließlich Vorbehandlung. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "352", "h": 0.08, "mat": 1.2, "gen": "A"},
            {"kurz": "Graffitischutz auf Fassade/Sichtbeton",
             "lang": "Permanentes oder semipermanentes Graffitischutzsystem nach Herstellerangabe auf Beton- bzw. "
                     "Putzflächen aufbringen, Musterfläche zur Abnahme.",
             "einheit": "m²", "kg": "335", "h": 0.18, "mat": 8, "gen": "C"},
            {"kurz": "Stundenlohnarbeiten Maler (Geselle)",
             "lang": "Arbeiten im Stundenlohn auf Anordnung der Bauleitung, Geselle einschließlich Zuschläge. "
                     "Abrechnung nach bestätigten Stundenlohnzetteln.",
             "einheit": "h", "kg": "345", "h": 1.0, "mat": 0, "gen": "A"},
        ]},
    ],
}]


# ------------------------------------------------------------------ Runde 2: Ausführungsachsen und weitere Grundpositionen
def _r2_setze(regeln):
    for g in LBS[0]["gruppen"]:
        for p in g["positionen"]:
            if p.get("achsen"):
                continue
            for teil, ax in regeln:
                if teil in p["kurz"]:
                    p["achsen"] = ax
                    break


def _r2_neu(gruppe, positionen):
    for g in LBS[0]["gruppen"]:
        if g["name"] == gruppe:
            g["positionen"] += positionen
            return
    LBS[0]["gruppen"].append({"name": gruppe, "positionen": positionen})


MA_UG = [{}, {"k": "auf GK", "t": "Untergrund gespachtelte Gipsplattenflächen (Q2/Q3), Grundierung mit Sperrgrund gegen Vergilbung.", "fh": 0.95, "mat": 0.2},
         {"k": "auf Beton", "t": "Untergrund Betonflächen: Trennmittelreste und Sinterschicht entfernen, entstauben, grundieren.", "fh": 1.08, "mat": 0.4},
         {"k": "auf Raufaser/Vlies", "t": "Untergrund vorhandene bzw. neue Raufaser- oder Vliestapete, erhöhter Materialverbrauch.", "fh": 1.05, "fm": 1.15},
         {"k": "auf Altanstrich", "t": "Untergrund tragfähiger Altanstrich: Flächen reinigen, kleine Fehlstellen spachteln, nicht tragfähige Stellen entfernen.",
          "fh": 1.15, "mat": 0.25, "tags": ["altbau"]}]
MA_UG_MIN = [{}, {"k": "auf Beton", "t": "Untergrund Betonflächen, entstaubt und mineralisch grundiert.", "fh": 1.08, "mat": 0.4},
             {"k": "auf mineral. Altanstrich", "t": "Untergrund tragfähiger mineralischer Altanstrich (Kalk/Silikat), abgebürstet und vorgenässt.",
              "fh": 1.12, "mat": 0.2, "tags": ["altbau"]}]
MA_ORT = [{}, {"k": "Bestand möbliert", "t": "Ausführung in genutzten bzw. möblierten Räumen: Möbel abrücken und abdecken, Schutz von Böden und Einbauten.",
               "fh": 1.35, "mat": 0.3, "gen": "B", "tags": ["altbau"]},
          {"k": "≤ 10 m²", "t": "Einzelflächen bis 10 m² (Kleinräume, Nischen, Treppenläufe).", "fh": 1.30, "gen": "B"}]
MA_ORT2 = MA_ORT[:2]
MA_HOEHE = [{}, {"k": "H > 3,5 m", "t": "Arbeitshöhe über 3,50 m (Treppenhäuser, Hallen), Gerüst gesondert.", "fh": 1.15}]
MA_FARBE = [{}, {"k": "getönt", "t": "Farbton hell bis mittel getönt nach Farbkarte (Hellbezugswert über 50).", "fm": 1.12},
            {"k": "Intensivton", "t": "Farbton intensiv bzw. dunkel, gegebenenfalls zusätzlicher Deckanstrich zur gleichmäßigen Deckung.", "fm": 1.40, "fh": 1.18, "gen": "B"}]
MA_FARBE2 = MA_FARBE[:2]
MA_LZUST = [{}, {"k": "Altlack überholen", "t": "Vorhandene tragfähige Lackierung reinigen, anschleifen, Fehlstellen grundieren und spachteln.", "fh": 1.30, "fm": 1.10,
                 "tags": ["altbau"]},
            {"k": "Altlack entfernen", "t": "Altbeschichtung bis auf den tragfähigen Untergrund entfernen (abbeizen bzw. abschleifen), Rückstände entsorgen.",
             "fh": 2.20, "fm": 1.35, "gen": "C", "tags": ["altbau"]}]
MA_GLANZ = [{}, {"k": "hochglänzend", "t": "Schlusslack hochglänzend, zusätzlicher Zwischenschliff.", "fh": 1.15, "fm": 1.10}]
MA_FUG = [{}, {"k": "auf Altanstrich", "t": "Untergrund tragfähiger Altanstrich: Haftprüfung, Reinigung, Ausbesserung kleiner Fehlstellen.", "fh": 1.15, "mat": 0.4,
               "tags": ["altbau"]},
          {"k": "auf WDVS", "t": "Untergrund Oberputz eines Wärmedämmverbundsystems, Farbe mit Systemfreigabe, Hellbezugswert über 20.", "fm": 1.08},
          {"k": "auf Beton/Klinker", "t": "Untergrund Beton bzw. Verblendmauerwerk, Fugen und Kanten gesondert gestrichen.", "fh": 1.12, "mat": 0.3}]
MA_GLIED = [{}, {"k": "stark gegliedert", "t": "Fassade stark gegliedert (Faschen, Gesimse, Vorsprünge, Laibungen), Abrechnung nach abgewickelter Fläche.",
                 "fh": 1.30, "gen": "B"}]
MA_GHOEHE = [{}, {"k": "ab 3. OG", "t": "Ausführung über dem 2. Obergeschoss, erhöhter Transport- und Sicherungsaufwand am Gerüst.", "fh": 1.08}]
MA_HZUST = [{}, {"k": "Renovierung", "t": "Vorhandene Lasur bzw. Lackierung reinigen, anschleifen, vergraute Stellen aufarbeiten.", "fh": 1.35, "tags": ["altbau"]},
            {"k": "Altanstrich entfernen", "t": "Abblätternde Altbeschichtung vollständig entfernen und Holz neu grundieren.", "fh": 2.0, "fm": 1.2, "gen": "C",
             "tags": ["altbau"]}]
MA_BUG = [{}, {"k": "auf Altbeschichtung", "t": "Untergrund vorhandene tragfähige Beschichtung: anschleifen, reinigen, Haftgrund.", "fh": 1.15, "mat": 1.5,
               "tags": ["altbau"]}]
MA_BRAUM = [{}, {"k": "≤ 20 m²", "t": "Einzelflächen bis 20 m² (Kellerräume, Technikräume).", "fh": 1.30, "fm": 1.06}]
MA_ZUST2 = MA_HZUST[:2]

_r2_setze([
    ("Dispersionsanstrich innen", [MA_UG, MA_ORT, MA_HOEHE, MA_FARBE]),
    ("Silikatanstrich innen", [MA_UG_MIN, MA_ORT, MA_HOEHE, MA_FARBE]),
    ("Anstrich auf Beton/Kalksandstein", [MA_ORT, MA_HOEHE, MA_FARBE]),
    ("Flächenspachtelung auf Putz", [MA_ORT, MA_HOEHE]),
    ("Untergrund vorbehandeln", [MA_ORT, MA_HOEHE]),
    ("Abdeckarbeiten", [MA_ORT2]),
    ("Lackierung {bauteil}", [MA_LZUST, MA_GLANZ, MA_FARBE2, MA_ORT2]),
    ("Holztreppengeländer/Handlauf", [MA_LZUST, MA_ORT2]),
    ("Fassadenanstrich", [MA_FUG, MA_FARBE, MA_GLIED, MA_GHOEHE]),
    ("Holzfassade/Holzbauteile außen", [MA_HZUST, MA_FARBE2, MA_GHOEHE]),
    ("Sockelanstrich", [MA_FARBE, MA_ZUST2]),
    ("Kellerwände/Tiefgarage", [MA_UG_MIN, MA_HOEHE]),
    ("Bodenbeschichtung", [MA_BUG, MA_BRAUM, MA_FARBE2]),
    ("Brandschutzbeschichtung", [MA_ORT2, [{}, {"k": "mit Deckbeschichtung", "t": "Zusätzliche farbige Deckbeschichtung nach RAL auf der Dämmschichtbildner-Beschichtung.",
                                                 "h": 0.12, "mat": 3.5}]]),
    ("Betonlasur", [MA_GLIED, MA_GHOEHE]),
    ("Graffitischutz", [[{}, {"k": "permanent", "t": "Permanentsystem (mehrfach reinigbar) statt Opferschicht.", "mat": 6, "fh": 1.1}], MA_GHOEHE]),
    ("Fassade reinigen", [MA_GLIED, MA_GHOEHE]),
])

_r2_neu("Innenanstriche", [
    {"kurz": "{art_k} innen, zweimal", "einheit": "m²", "kg": "345", "gen": "A",
     "lang": "Innenanstrich mit {art} in zwei Arbeitsgängen nach Grundierung, diffusionsoffen, Farbton weiß bzw. abgetönt mit "
             "kalkverträglichen Pigmenten. Öffnungen über 2,5 m² werden abgezogen.",
     "achsen": [MA_UG_MIN, MA_ORT, MA_HOEHE, MA_FARBE],
     "varianten": [{"art": "Sumpfkalkfarbe", "art_k": "Kalkanstrich", "h": 0.13, "mat": 1.6},
                   {"art": "Kalk-Kasein-Farbe", "art_k": "Kalk-Kasein-Anstrich", "h": 0.13, "mat": 2.2},
                   {"art": "Lehmfarbe auf Lehm- bzw. Kalkputz", "art_k": "Lehmfarbe", "h": 0.14, "mat": 2.6},
                   {"art": "Sol-Silikatfarbe", "art_k": "Sol-Silikat-Anstrich", "h": 0.11, "mat": 2.4}]},
    {"kurz": "Strukturanstrich/Rollputz innen, Körnung {kn}", "einheit": "m²", "kg": "345", "gen": "B",
     "lang": "Strukturbeschichtung innen als gefüllte Dispersions- bzw. Silikatbeschichtung, Körnung {kn}, aufgerollt und gleichmäßig "
             "strukturiert, einschließlich Grundierung. Ein Deckanstrich gesondert.",
     "achsen": [MA_UG, MA_ORT, MA_HOEHE, MA_FARBE],
     "varianten": [{"kn": "fein (bis 0,5 mm)", "h": 0.16, "mat": 2.6}, {"kn": "mittel (bis 1,0 mm)", "h": 0.18, "mat": 3.4}]},
    {"kurz": "Isolieranstrich gegen {art}", "einheit": "m²", "kg": "345", "gen": "B",
     "lang": "Absperrender Isolieranstrich gegen {art} auf Wand- bzw. Deckenflächen, einmal deckend, als Grundlage für den Schlussanstrich.",
     "achsen": [MA_UG[:4], MA_ORT, MA_HOEHE], "tags": ["altbau"],
     "varianten": [{"art": "Nikotin- und Rußverfärbungen", "h": 0.08, "mat": 1.8}, {"art": "Wasser- und Rostflecken (Teilflächen)", "h": 0.12, "mat": 2.2}]},
    {"kurz": "Schimmelhemmender Mineralanstrich nach Sanierung, zweimal", "einheit": "m²", "kg": "345", "gen": "B",
     "lang": "Nach erfolgter Ursachenbeseitigung: Flächen mit Schimmelentferner behandeln, trocknen lassen, zweimal mit alkalischer "
             "Silikat- bzw. Kalkfarbe ohne Biozide streichen.",
     "h": 0.20, "mat": 2.8, "achsen": [MA_UG_MIN, MA_ORT, MA_HOEHE], "tags": ["altbau"]},
    {"kurz": "Dekorative Spachteltechnik {art}", "einheit": "m²", "kg": "345", "gen": "C",
     "lang": "Dekorative Wandgestaltung in {art}, mehrlagig gespachtelt bzw. geglättet nach Musterfläche, einschließlich Grundierung "
             "und Schutzwachs bzw. Versiegelung nach Systemangabe.",
     "achsen": [MA_ORT, MA_HOEHE, MA_FARBE],
     "varianten": [{"art": "Kalkglätte (Stucco-Optik)", "h": 0.90, "mat": 9}, {"art": "Spachtelbeschichtung in Beton-Optik", "h": 0.75, "mat": 8},
                   {"art": "Marmorputz-Optik, poliert", "h": 1.30, "mat": 14}]},
    {"kurz": "Lasur-/Wischtechnik auf Grundanstrich, {art}", "einheit": "m²", "kg": "345", "gen": "C",
     "lang": "Farbige Wandgestaltung in {art} auf vorhandenem bzw. gesondert vergütetem Grundanstrich, nach Musterfläche.",
     "achsen": [MA_ORT, MA_HOEHE, MA_FARBE],
     "varianten": [{"art": "Lasurtechnik einfarbig", "h": 0.30, "mat": 1.8}, {"art": "Wischtechnik zweifarbig", "h": 0.45, "mat": 2.4}]},
    {"kurz": "Spachtelung {q} auf Gipsplatten durch Maler, {b}", "einheit": "m²", "kg": "345", "gen": "B",
     "lang": "Oberflächenverbesserung gespachtelter Gipsplattenflächen (Q2) durch den Maler auf Qualitätsstufe {q} nach Merkblatt, "
             "{b}, schleifen und entstauben.",
     "achsen": [MA_ORT, MA_HOEHE],
     "varianten": [{"q": "Q3", "b": "Wandflächen", "h": 0.14, "mat": 0.8}, {"q": "Q3", "b": "Deckenflächen", "h": 0.17, "mat": 0.8, "kg": "353"},
                   {"q": "Q4", "b": "Wandflächen", "h": 0.28, "mat": 2.0}, {"q": "Q4", "b": "Deckenflächen", "h": 0.34, "mat": 2.0, "kg": "353"}]},
    {"kurz": "Holzdecke/Holzbalken innen {art}", "einheit": "m²", "kg": "353", "gen": "B",
     "lang": "Sichtbare Holzdecken, Balken und Bekleidungen innen anschleifen, entstauben und {art}. Abrechnung nach abgewickelter Fläche.",
     "achsen": [MA_LZUST[:2], MA_ORT2, MA_HOEHE],
     "varianten": [{"art": "zweimal farblos lasieren", "h": 0.28, "mat": 2.2}, {"art": "deckend lackieren (Grund- und Schlusslack)", "h": 0.40, "mat": 3.0},
                   {"art": "weiß pigmentiert ölen", "h": 0.30, "mat": 3.4}]},
    {"kurz": "Fuge elastisch durch Maler, {art}", "einheit": "m", "kg": "345", "gen": "A",
     "lang": "Anschluss- bzw. Bewegungsfuge bis 10 mm vorbereiten, Rundschnur einlegen, mit {art} verfugen und glätten.",
     "achsen": [MA_ORT2],
     "varianten": [{"art": "überstreichbarem Acryl-Dichtstoff", "h": 0.06, "mat": 0.5}, {"art": "Silikon (Sanitär, nicht überstreichbar)", "h": 0.07, "mat": 0.8}]},
])
_r2_neu("Lackierungen", [
    {"kurz": "Holzfenster außen streichen, Größe {g}", "einheit": "St", "kg": "334", "gen": "B",
     "lang": "Holzfenster bzw. Fenstertür außen einschließlich Falz- und Kittflächen: Glas abkleben, anschleifen, Fehlstellen grundieren, "
             "Zwischen- und Schlussbeschichtung mit Dickschichtlasur bzw. Fensterlack. Fenstergröße {g}.",
     "achsen": [MA_LZUST, MA_FARBE2, [{}, {"k": "mit Sprossen", "t": "Fenster mit glasteilenden Sprossen.", "fh": 1.40, "fm": 1.15}]],
     "varianten": [{"g": "bis 1,0 m²", "h": 1.3, "mat": 5}, {"g": "bis 2,0 m²", "h": 1.9, "mat": 8}, {"g": "bis 3,5 m²", "h": 2.6, "mat": 12}]},
    {"kurz": "{art_k} beidseitig lackieren", "einheit": "St", "kg": "334", "gen": "B",
     "lang": "{art} beidseitig einschließlich Kanten und Rahmen: reinigen, anschleifen, grundieren, Vorlack und wetterbeständiger Schlusslack. "
             "Beschläge abkleben bzw. demontieren und wieder montieren.",
     "achsen": [MA_LZUST, MA_FARBE2],
     "varianten": [{"art": "Holz-Haustür mit Rahmen bis 1,2 × 2,2 m", "art_k": "Holz-Haustür", "h": 3.2, "mat": 18},
                   {"art": "Holz-Nebeneingangstür mit Rahmen bis 1,0 × 2,1 m", "art_k": "Nebeneingangstür Holz", "h": 2.4, "mat": 12},
                   {"art": "Holz-Fensterladen zweiflügelig bis 1,5 m²", "art_k": "Fensterladen Holz", "h": 2.6, "mat": 10},
                   {"art": "Garagen-Schwingtor bzw. Sektionaltor Stahl bis 2,5 × 2,1 m (Außenseite)", "art_k": "Garagentor Stahl", "h": 2.8, "mat": 16, "kg": "339"}]},
    {"kurz": "Zaun/Geländer außen Stahl lackieren, Höhe bis {hh}", "einheit": "m", "kg": "359", "gen": "B",
     "lang": "Stahlzaun bzw. Außengeländer: Rost und lose Beschichtung mechanisch entfernen, Fehlstellen rostschützend grundieren, "
             "{sys}. Höhe bis {hh}, Abrechnung nach Länge.",
     "achsen": [MA_LZUST, MA_FARBE2],
     "varianten": [{"hh": "1,0 m", "sys": "zweimal Alkydharz-Metallschutzlack", "h": 0.55, "mat": 3.2},
                   {"hh": "1,0 m", "sys": "zweimal 2K-PUR-Lack", "h": 0.60, "mat": 5.5},
                   {"hh": "1,5 m", "sys": "zweimal Alkydharz-Metallschutzlack", "h": 0.75, "mat": 4.5},
                   {"hh": "1,5 m", "sys": "zweimal 2K-PUR-Lack", "h": 0.82, "mat": 7.5}]},
    {"kurz": "Dachuntersicht/Traufkasten streichen, Breite bis {b} cm", "einheit": "m", "kg": "363", "gen": "B",
     "lang": "Dachüberstand (Sparrenköpfe, Untersicht, Stirnbrett) bis {b} cm Breite reinigen, anschleifen und zweimal mit "
             "Holzschutzlasur bzw. Wetterschutzfarbe streichen. Gerüst gesondert.",
     "achsen": [MA_HZUST, MA_FARBE2],
     "varianten": [{"b": "30", "h": 0.45, "mat": 2.2}, {"b": "60", "h": 0.70, "mat": 3.8}, {"b": "100", "h": 1.05, "mat": 6}]},
])
_r2_neu("Fassade, Boden, Sonstiges", [
    {"kurz": "Fassade Risssanierung {art}", "einheit": "m²", "kg": "335", "gen": "B", "tags": ["altbau"],
     "lang": "Sanierung von Netz- und Haarrissen auf Putzfassaden: {art}, anschließend gesondert vergüteter Fassadenanstrich. Gerüst gesondert.",
     "achsen": [MA_FARBE, MA_GLIED, MA_GHOEHE],
     "varianten": [{"art": "Faserfüller-Zwischenbeschichtung vollflächig, rissüberbrückend", "h": 0.18, "mat": 3.5},
                   {"art": "Armierungsspachtel mit Gewebeeinlage vollflächig und Egalisationsputz", "h": 0.55, "mat": 9}]},
    {"kurz": "Fassade Altbeschichtung entfernen, {art}", "einheit": "m²", "kg": "335", "gen": "C", "tags": ["altbau"],
     "lang": "Nicht tragfähige Altbeschichtung von Putz- bzw. Betonfassaden entfernen durch {art}, Rückstände auffangen und entsorgen.",
     "achsen": [MA_GLIED, MA_GHOEHE],
     "varianten": [{"art": "Abbeizen und Heißwasser-Hochdruck", "h": 0.45, "mat": 3.5, "geraet": 1.0},
                   {"art": "Partikelstrahlen (Niederdruck)", "h": 0.40, "mat": 1.5, "geraet": 3.0}]},
    {"kurz": "Hydrophobierung Sichtmauerwerk/Beton außen", "einheit": "m²", "kg": "335", "gen": "B",
     "lang": "Wasserabweisende Imprägnierung auf Silan-/Siloxanbasis für Verblendmauerwerk bzw. Sichtbeton, im Flutverfahren zweimal "
             "nass in nass aufgetragen, Glasflächen geschützt.",
     "h": 0.10, "mat": 2.6, "achsen": [MA_GLIED, MA_GHOEHE]},
    {"kurz": "Putzausbesserung vor Anstrich, Einzelfläche bis {a}", "einheit": "St", "kg": "335", "gen": "C", "tags": ["altbau"],
     "lang": "Schadhafte Putzstellen abschlagen, Untergrund vornässen, mit angepasstem Putzmörtel schließen und Struktur angleichen. "
             "Einzelfläche bis {a}.",
     "achsen": [[{}, {"k": "innen", "t": "Ausführung an Innenflächen.", "fh": 0.85, "kg": "345"}]],
     "varianten": [{"a": "0,25 m²", "h": 0.5, "mat": 2.5}, {"a": "1,0 m²", "h": 1.3, "mat": 7}]},
    {"kurz": "Stützen-/Wandsockel Tiefgarage, Warnmarkierung {art}", "einheit": "m", "kg": "345", "gen": "B",
     "lang": "Sockelanstrich an Stützen und Wänden in Tiefgaragen, Höhe bis 1,0 m, {art}, mit abriebfester 2K-Beschichtung.",
     "varianten": [{"art": "einfarbig", "h": 0.25, "mat": 2.5}, {"art": "gelb-schwarz schraffiert", "h": 0.45, "mat": 3.5}]},
    {"kurz": "Bodenmarkierung innen Halle/Lager, Linie {b} cm", "einheit": "m", "kg": "352", "gen": "B",
     "lang": "Fahrweg- und Lagerflächenmarkierung innen mit 2K-Epoxid-Markierungsfarbe, Linienbreite {b} cm, abgeklebt.",
     "achsen": [MA_FARBE2],
     "varianten": [{"b": "5", "h": 0.06, "mat": 0.6}, {"b": "10", "h": 0.08, "mat": 1.1}]},
])
