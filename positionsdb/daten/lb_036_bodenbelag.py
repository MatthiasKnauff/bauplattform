# LB 036 Bodenbelagarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "036", "name": "Bodenbelagarbeiten", "atv": "DIN 18365", "lohn": "boden",
    "gruppen": [
        {"name": "Untergrundvorbereitung", "positionen": [
            {"kurz": "Untergrund vorbereiten: {art}",
             "lang": "Untergrund für elastische bzw. textile Beläge vorbereiten: {art}, nach Vorgabe des "
                     "Verlegewerkstoff-Herstellers. Abrechnung nach behandelter Fläche.",
             "einheit": "m²", "kg": "352", "gen": "A",
             "varianten": [{"art": "Estrich anschleifen und absaugen", "h": 0.04, "mat": 0, "geraet": 0.8},
                           {"art": "Grundierung lösemittelfrei", "h": 0.03, "mat": 0.9},
                           {"art": "Spachtelung zementär bis 2 mm", "h": 0.10, "mat": 4.0},
                           {"art": "Spachtelung zementär bis 5 mm", "h": 0.12, "mat": 8.5},
                           {"art": "Ausgleich faserarmiert bis 10 mm (z. B. auf Holzdielen)", "h": 0.18, "mat": 17},
                           {"art": "Epoxid-Feuchtesperre bei erhöhter Restfeuchte, zweilagig abgesandet", "h": 0.12, "mat": 14}]},
            {"kurz": "Altbelag entfernen: {art}",
             "lang": "Vorhandenen Bodenbelag {art} aufnehmen, Kleberreste maschinell abschälen bzw. abschleifen, "
                     "Material zur Sammelstelle auf der Baustelle; Entsorgung gesondert. Schadstoffverdacht vorab "
                     "klären.",
             "einheit": "m²", "kg": "394", "gen": "B", "tags": ["altbau"], "lohn": "abbruch",
             "varianten": [{"art": "textil, verklebt", "h": 0.20, "geraet": 1.5},
                           {"art": "PVC/Linoleum, verklebt", "h": 0.30, "geraet": 2.0},
                           {"art": "Laminat/Fertigparkett schwimmend", "h": 0.12, "geraet": 0.5}]},
        ]},
        {"name": "Elastische Beläge", "positionen": [
            {"kurz": "Linoleum {d} mm, Bahnenware, verklebt, Material bis {m} €/m²",
             "lang": "Linoleum nach DIN EN ISO 24011, Dicke {d} mm, Bahnenware, werkseitig oberflächenvergütet, "
                     "Farbe nach Bemusterung, Materialpreis bis {m} €/m², mit Dispersionsklebstoff vollflächig verklebt, "
                     "Nähte verfugt bzw. thermisch verschweißt. Abrechnung nach verlegter Fläche.",
             "einheit": "m²", "kg": "352", "gen": "A",
             "varianten": [{"d": "2,5", "m": "25", "h": 0.32, "mat": 30}, {"d": "3,2", "m": "30", "h": 0.34, "mat": 36}]},
            {"kurz": "PVC-Belag homogen Objektbereich, {d} mm, Bahnen verschweißt",
             "lang": "Homogener PVC-Bodenbelag nach DIN EN ISO 10581 für Objektbereiche, Nutzungsklasse 34/43, "
                     "Dicke {d} mm, vollflächig verklebt, Nähte thermisch verschweißt, mit PU-Vergütung.",
             "einheit": "m²", "kg": "352", "gen": "A",
             "varianten": [{"d": "2,0", "h": 0.32, "mat": 24}]},
            {"kurz": "Designbelag Vinyl (LVT) {art}, Nutzschicht {n} mm, Material bis {m} €/m²",
             "lang": "Heterogener Vinyl-Designbelag (LVT) als {art}, Nutzschicht {n} mm, Nutzungsklasse 23/33, "
                     "Materialpreis bis {m} €/m², {v}. Einschließlich Anpassarbeiten. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "352", "gen": "B",
             "varianten": [{"art": "Planken zum Kleben", "n": "0,55", "m": "30", "v": "vollflächig verklebt", "h": 0.38, "mat": 35},
                           {"art": "Klick-Planken mit Trittschallrücken", "n": "0,55", "m": "35", "v": "schwimmend verlegt", "h": 0.30, "mat": 40},
                           {"art": "Fliesenformat zum Kleben, mit Fugenstreifen", "n": "0,7", "m": "40", "v": "vollflächig verklebt", "h": 0.50, "mat": 46}]},
            {"kurz": "Kautschukbelag {d} mm, {art}",
             "lang": "Kautschuk-Bodenbelag nach DIN EN 1817, Dicke {d} mm, {art}, mit geeignetem Klebstoff "
                     "vollflächig verklebt, Nähte kalt verfugt. Erstpflege nach Herstellerangabe.",
             "einheit": "m²", "kg": "352", "gen": "B",
             "varianten": [{"d": "2,0", "art": "glatt, Bahnenware", "h": 0.36, "mat": 42},
                           {"d": "3,5", "art": "Noppenbelag, Fliesen 1 × 1 m", "h": 0.40, "mat": 56}]},
            {"kurz": "Sportboden-/Sicherheitsbelag PVC, rutschhemmend R{r}",
             "lang": "PVC-Sicherheitsbelag mit Einstreuung, rutschhemmend R{r} nach DGUV, Dicke 2 mm, für Nassräume und "
                     "Küchen, vollflächig verklebt und thermisch verschweißt, an Wänden mit Hohlkehle hochgezogen "
                     "(Kehle gesondert).",
             "einheit": "m²", "kg": "352", "gen": "B",
             "varianten": [{"r": "10", "h": 0.38, "mat": 30}, {"r": "11", "h": 0.40, "mat": 36}]},
            {"kurz": "Hohlkehlsockel aus Bahnenmaterial, Höhe {hs} cm, mit Kehlprofil",
             "lang": "Hohlkehlsockel aus dem Belagsmaterial mit Kehlstützprofil und Abschlussprofil herstellen, "
                     "Höhe {hs} cm, Ecken geschweißt bzw. verfugt. Abrechnung nach Länge.",
             "einheit": "m", "kg": "352", "gen": "B",
             "varianten": [{"hs": "10", "h": 0.30, "mat": 6.5}, {"hs": "15", "h": 0.35, "mat": 8}]},
            {"kurz": "Leitfähiger Belag (ESD) mit Kupferbandableitung",
             "lang": "Elektrostatisch ableitfähiger Bodenbelag (Kautschuk bzw. PVC) einschließlich leitfähiger "
                     "Grundierung, leitfähigem Kleber und Kupferbandnetz mit Anschlusspunkten für Potentialausgleich "
                     "(Anschluss durch Elektro). Ableitwiderstand nach Vorgabe, mit Messprotokoll.",
             "einheit": "m²", "kg": "352", "h": 0.55, "mat": 62, "gen": "C"},
        ]},
        {"name": "Textile Beläge, Sauberlaufzonen", "positionen": [
            {"kurz": "Teppichboden {art}, Material bis {m} €/m²",
             "lang": "Textiler Bodenbelag {art}, Polmaterial Polyamid, Nutzungsklasse 33, stuhlrollengeeignet, "
                     "Brandverhalten Cfl-s1, Materialpreis bis {m} €/m², verklebt mit fixierbarem bzw. "
                     "dauerhaftem Klebstoff. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "352", "gen": "B",
             "varianten": [{"art": "als Bahnenware, Tufting-Schlinge", "m": "20", "h": 0.25, "mat": 26},
                           {"art": "als Teppichfliesen 50 × 50 cm, fixiert", "m": "25", "h": 0.22, "mat": 30}]},
            {"kurz": "Sauberlaufzone {art}",
             "lang": "Sauberlaufzone im Eingangsbereich {art}, Größe nach Plan, Oberkante belagsgleich, {rahmen}. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "352", "gen": "C",
             "varianten": [{"art": "als Reinstreifenteppich (Bahnenware) verklebt", "rahmen": "einschließlich Randabschluss", "h": 0.35, "mat": 55},
                           {"art": "als Aluminium-Profilmatte, eingelegt in Mattenrahmen", "rahmen": "Mattenrahmen gesondert", "h": 0.60, "mat": 380}]},
            {"kurz": "Mattenrahmen Aluminium/Edelstahl für Sauberlaufmatte",
             "lang": "Mattenrahmen aus Aluminium- bzw. Edelstahlwinkel für Sauberlaufmatte in Estrichaussparung "
                     "einbauen, höhengerecht, mit Ankern. Abrechnung nach Länge.",
             "einheit": "m", "kg": "352", "h": 0.40, "mat": 26, "gen": "B"},
        ]},
        {"name": "Laminat, Kork, Sockel, Treppen", "positionen": [
            {"kurz": "Laminat NK {k}, schwimmend auf Unterlage, Material bis {m} €/m²",
             "lang": "Laminatboden nach DIN EN 13329, Nutzungsklasse {k}, Klickverbindung, schwimmend auf "
                     "Trittschallunterlage mit Dampfbremse verlegt, Materialpreis bis {m} €/m² (einschließlich "
                     "Unterlage), Randfugen und Anpassarbeiten.",
             "einheit": "m²", "kg": "352", "gen": "A",
             "varianten": [{"k": "32", "m": "18", "h": 0.25, "mat": 22}, {"k": "33", "m": "25", "h": 0.27, "mat": 30}]},
            {"kurz": "Korkboden {art}",
             "lang": "Korkbodenbelag {art}, oberflächenfertig, Nutzungsklasse 23/32, Fugen dicht, einschließlich "
                     "Anpassarbeiten. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "352", "gen": "B",
             "varianten": [{"art": "Klebekork 6 mm, vollflächig verklebt, versiegelt", "h": 0.45, "mat": 38},
                           {"art": "Kork-Fertigelement mit Klickverbindung, schwimmend", "h": 0.30, "mat": 42}]},
            {"kurz": "Sockelleiste {art}",
             "lang": "Sockelleiste {art} an Wänden befestigen, Ecken auf Gehrung bzw. mit Formteilen. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "352", "gen": "A",
             "varianten": [{"art": "Kunststoff weich, 60 mm, geklebt", "h": 0.08, "mat": 2.6},
                           {"art": "Hartkunststoff-Profil mit Kabelkanal 60 mm", "h": 0.10, "mat": 4.5},
                           {"art": "MDF weiß foliert 60 mm", "h": 0.10, "mat": 4.0},
                           {"art": "Belagsstreifen aufgekantet mit Abschlussprofil", "h": 0.18, "mat": 4.5}]},
            {"kurz": "Treppenstufe belegen mit {art}, Breite bis 1,2 m",
             "lang": "Tritt- und Setzstufe mit {art} belegen, mit Treppenkantenprofil (Kontraststreifen nach "
                     "DIN 18040), Untergrund gespachtelt, vollflächig verklebt. Breite bis 1,2 m.",
             "einheit": "St", "kg": "352", "gen": "B",
             "varianten": [{"art": "Linoleum bzw. PVC", "h": 1.10, "mat": 38}, {"art": "Kautschuk-Formstufe", "h": 0.90, "mat": 85},
                           {"art": "Teppich", "h": 1.00, "mat": 35}]},
            {"kurz": "Übergangsprofil/Abschlussschiene Aluminium",
             "lang": "Übergangs-, Anpass- bzw. Abschlussprofil aus Aluminium, eloxiert, an Belagswechseln und "
                     "Türdurchgängen geschraubt bzw. geklebt. Abrechnung nach Länge.",
             "einheit": "m", "kg": "352", "h": 0.18, "mat": 9, "gen": "A"},
            {"kurz": "Erstpflege/Einpflege elastischer Belag",
             "lang": "Bauschlussreinigung und Erstpflege elastischer Beläge mit Grundreinigung und Pflegefilm nach "
                     "Herstellerangabe vor Übergabe.",
             "einheit": "m²", "kg": "352", "h": 0.05, "mat": 0.6, "gen": "A"},
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

BB_RAUM = [{}, {"k": "Räume ≤ 10 m²", "t": "Einzelräume bis 10 m² mit hohem Schnitt- und Anschlussanteil.", "fh": 1.30, "fm": 1.05},
           {"k": "Flure/Treppenhaus", "t": "Schmale Flure und Treppenhauspodeste mit vielen Anschlüssen.", "fh": 1.18, "fm": 1.03}]
BB_ORT = [{}, {"k": "Bestand", "t": "Ausführung im Bestand: Möbel- und Geräteumstellung durch den AG, Anpassung an Türen und Bestandsbeläge, "
                                     "abschnittsweise Verlegung.", "fh": 1.25, "fm": 1.02, "gen": "B", "tags": ["altbau"]}]
BB_UG = [{}, {"k": "auf Heizestrich", "t": "Untergrund Heizestrich, Klebstoff und Belag für Fußbodenheizung geeignet, Belegreife durch CM-Messung bestätigt.",
              "mat": 0.6},
         {"k": "auf Holzwerkstoff", "t": "Untergrund Holzwerkstoffplatten bzw. Trockenestrich, Spezialgrundierung und -klebstoff.", "mat": 1.4, "fh": 1.05},
         {"k": "auf Altfliesen", "t": "Untergrund vorhandener Fliesenbelag, Fugen und Fläche mit Spachtelmasse egalisiert (gesondert), Haftgrundierung.",
          "mat": 1.0, "fh": 1.05, "tags": ["altbau"]}]
BB_MUSTER = [{}, {"k": "Fischgrät/Muster", "t": "Verlegung im Muster (Fischgrät, Fries, Intarsien) nach Verlegeplan, erhöhter Verschnitt.", "fh": 1.65, "fm": 1.10,
                  "gen": "C"}]
BB_MUSTER_Q = [{}, {"k": "diagonal/Muster", "t": "Verlegung diagonal bzw. im Muster (Schachbrett, Fries) nach Verlegeplan, erhöhter Verschnitt.",
                    "fh": 1.40, "fm": 1.08, "gen": "C"}]
BB_MUSTER_KLICK = [{}, {"k": "Fischgrät (A/B-Dielen)", "t": "Verlegung im Fischgrätmuster mit systemeigenen A/B-Dielen, erhöhter Verschnitt.",
                        "fh": 1.50, "fm": 1.15, "gen": "C"}]
BB_UG_SCHW = [{}, {"k": "auf Heizestrich", "t": "Untergrund Heizestrich, Belag und Unterlage für Fußbodenheizung geeignet, Belegreife durch CM-Messung bestätigt.",
                   "mat": 0.4},
              {"k": "auf Holzwerkstoff", "t": "Untergrund Holzwerkstoffplatten bzw. Trockenestrich, eben, mit systemgerechter Unterlage.", "fh": 1.05}]
BB_UG_KORK = [{}, BB_UG[1], {"k": "auf Holzwerkstoff", "t": "Untergrund Holzwerkstoffplatten bzw. Trockenestrich; Grundierung bzw. Unterlage je nach Verlegeart.",
                             "mat": 0.8, "fh": 1.05}]
BB_FARBE = [{}, {"k": "Sonderfarbe", "t": "Farbe bzw. Dessin aus Sonderkollektion, Mindestabnahme anteilig.", "fm": 1.12}]
BB_SOCKEL = [{}, {"k": "mit Gehrung/Endkappen", "t": "Ecken auf Gehrung bzw. mit Formteilen und Endkappen, hoher Eckanteil.", "fh": 1.30, "mat": 0.8}]
BB_STUFE = [{}, {"k": "gewendelt", "t": "Gewendelte bzw. viertelgewendelte Stufen, Zuschnitt nach Schablone.", "fh": 1.40, "fm": 1.12},
            {"k": "mit Kantenprofil", "t": "Zusätzlich Treppenkantenprofil Aluminium mit Kontraststreifen.", "h": 0.20, "mat": 14}]
BB_ENTS = [{}, {"k": "inkl. Entsorgung", "t": "Altmaterial laden, abfahren und einer zugelassenen Verwertung zuführen, Gebühren enthalten.", "geraet": 2.5}]
BB_AFLAECHE = [{}, {"k": "≤ 20 m²", "t": "Einzelflächen bis 20 m².", "fh": 1.25}]

_r2_setze([
    ("Linoleum {d} mm", [BB_UG, BB_RAUM, BB_ORT, BB_FARBE]),
    ("PVC-Belag homogen", [BB_UG, BB_RAUM, BB_ORT, BB_FARBE]),
    ("Designbelag Vinyl", [BB_UG, BB_MUSTER, BB_RAUM, BB_ORT]),
    ("Kautschukbelag", [BB_UG, BB_RAUM, BB_ORT, BB_FARBE]),
    ("Sportboden-/Sicherheitsbelag", [BB_UG, BB_RAUM, BB_ORT]),
    ("Leitfähiger Belag", [BB_UG[:2], BB_RAUM, BB_ORT]),
    ("Teppichboden", [BB_UG, BB_RAUM, BB_ORT]),
    ("Laminat NK", [BB_UG_SCHW, BB_MUSTER_KLICK, BB_RAUM, BB_ORT]),
    ("Korkboden", [BB_UG_KORK, BB_RAUM, BB_ORT]),
    ("Untergrund vorbereiten", [BB_RAUM, BB_ORT]),
    ("Altbelag entfernen", [BB_ENTS, BB_AFLAECHE]),
    ("Sockelleiste", [BB_SOCKEL, BB_ORT]),
    ("Hohlkehlsockel", [BB_SOCKEL, BB_ORT]),
    ("Treppenstufe belegen", [BB_STUFE, BB_ORT]),
    ("Sauberlaufzone", [BB_ORT]),
    ("Erstpflege", [BB_RAUM[:2], BB_ORT]),
])
_r2_neu("Elastische Beläge", [
    {"kurz": "{art_k}, {d} mm, Format {f}", "einheit": "m²", "kg": "352", "gen": "B",
     "lang": "{art} nach DIN EN ISO 10582/10874, Dicke {d} mm, Format {f}, vollflächig verklebt, Stöße dicht gestoßen, im Objektbereich "
             "Nutzungsklasse 33/42. Materialpreis im Ansatz enthalten. Abrechnung nach verlegter Fläche.",
     "achsen": [BB_UG, BB_MUSTER_Q, BB_RAUM, BB_ORT],
     "varianten": [{"art": "Linoleumfliesen", "art_k": "Linoleumfliesen", "d": "2,5", "f": "50 × 50 cm", "h": 0.36, "mat": 34},
                   {"art": "Kautschukfliesen, Oberfläche Hammerschlag", "art_k": "Kautschukfliesen", "d": "3,0", "f": "61 × 61 cm", "h": 0.38, "mat": 52},
                   {"art": "PVC-Fliesen heterogen", "art_k": "PVC-Fliesen", "d": "2,0", "f": "60 × 60 cm", "h": 0.32, "mat": 26},
                   {"art": "Designbelag Vinyl Fliesenoptik", "art_k": "Vinyl-Fliesen", "d": "2,5", "f": "60 × 60 cm", "h": 0.38, "mat": 34}]},
    {"kurz": "PVC-Belag heterogen Objektbereich, {d} mm, Bahnen verschweißt", "einheit": "m²", "kg": "352", "gen": "A",
     "lang": "Heterogener PVC-Belag in Bahnen, Dicke {d} mm, Nutzschicht 0,7 mm, PUR-Vergütung, vollflächig verklebt, Nähte thermisch "
             "verschweißt. Materialpreis im Ansatz enthalten.",
     "achsen": [BB_UG, BB_RAUM, BB_ORT, BB_FARBE],
     "varianten": [{"d": "2,0", "h": 0.32, "mat": 22}, {"d": "2,5", "h": 0.34, "mat": 27}]},
    {"kurz": "Vinyl-Klickboden mit Trägerplatte, Nutzschicht {n} mm, schwimmend", "einheit": "m²", "kg": "352", "gen": "B",
     "lang": "Vinyl-Designboden mit starrer Trägerplatte (SPC/Rigid), Klickverbindung, Nutzschicht {n} mm, schwimmend auf systemgerechter "
             "Dämmunterlage verlegt, Randfugen und Bewegungsprofile in Türdurchgängen. Materialpreis im Ansatz enthalten.",
     "achsen": [BB_UG_SCHW, BB_MUSTER_KLICK, BB_RAUM, BB_ORT],
     "varianten": [{"n": "0,3", "h": 0.25, "mat": 28}, {"n": "0,55", "h": 0.25, "mat": 38}]},
    {"kurz": "Nassraumbelag PVC R{r} mit Hochzug und Sockelkehle", "einheit": "m²", "kg": "352", "gen": "B",
     "lang": "Rutschhemmender PVC-Sicherheitsbelag für Nassbereiche, Bewertungsgruppe R{r}/B, mit Hochzug an Wänden bis 10 cm über "
             "Kehlprofil, Anschluss an Bodenabläufe mit Klemmflansch, Nähte verschweißt.",
     "achsen": [BB_RAUM[:2], BB_ORT],
     "varianten": [{"r": "10", "h": 0.60, "mat": 38}, {"r": "11", "h": 0.62, "mat": 44}]},
    {"kurz": "Bodenleitsystem taktil, {art}", "einheit": "m", "kg": "352", "gen": "C",
     "lang": "Taktiles Bodenleitsystem nach DIN 32984 als {art}, kontrastreich zum Umgebungsbelag, verklebt. {abr}",
     "achsen": [BB_ORT],
     "varianten": [{"art": "Leitstreifen aus Kunststoff-Rippenplatten, Breite 30 cm", "abr": "Abrechnung nach Länge.", "h": 0.35, "mat": 55},
                   {"art": "Aufmerksamkeitsfeld Noppen 90 × 90 cm", "abr": "Abrechnung je Feld.", "einheit": "St", "h": 0.9, "mat": 190}]},
    {"kurz": "Intarsie/Logo im Belag nach Vorlage, bis {a}", "einheit": "St", "kg": "352", "gen": "C",
     "lang": "Einarbeitung von Intarsien, Schriftzügen bzw. Logos in elastischen Belag nach Vorlage (Wasserstrahlschnitt bzw. Handschnitt), "
             "Größe bis {a}, Nähte verschweißt.",
     "varianten": [{"a": "1 m²", "h": 2.5, "mat": 180}, {"a": "4 m²", "h": 6.0, "mat": 520}]},
])
_r2_neu("Textile Beläge, Sauberlaufzonen", [
    {"kurz": "Teppichfliesen {art}, 50 × 50 cm, Material bis {m} €/m²", "einheit": "m²", "kg": "352", "gen": "B",
     "lang": "Textiler Bodenbelag als selbstliegende Teppichfliesen {art}, 50 × 50 cm, mit rutschhemmender Fixierung verlegt, Verlegerichtung "
             "nach Plan. Materialpreis bis {m} €/m² im Ansatz enthalten.",
     "achsen": [BB_UG[:2], BB_MUSTER_Q, BB_RAUM, BB_ORT],
     "varianten": [{"art": "Tufting-Schlinge, Objekt Klasse 33", "m": "25", "h": 0.20, "mat": 30},
                   {"art": "Tufting-Velours, Objekt Klasse 33", "m": "38", "h": 0.20, "mat": 44}]},
    {"kurz": "Nadelvlies-Belag {d} mm, Bahnenware, verklebt", "einheit": "m²", "kg": "352", "gen": "A",
     "lang": "Nadelvliesbelag als Bahnenware, Dicke {d} mm, für Nebenräume und stark frequentierte Bereiche, vollflächig verklebt.",
     "achsen": [BB_UG, BB_RAUM, BB_ORT],
     "varianten": [{"d": "4", "h": 0.22, "mat": 12}, {"d": "6", "h": 0.24, "mat": 16}]},
    {"kurz": "Naturfaserbelag {art}, verklebt", "einheit": "m²", "kg": "352", "gen": "B",
     "lang": "Naturfaserbelag aus {art} mit Latexrücken, vollflächig verklebt, Kanten gekettelt bzw. eingefasst.",
     "achsen": [BB_UG[:2], BB_RAUM, BB_ORT],
     "varianten": [{"art": "Sisal", "h": 0.32, "mat": 42}, {"art": "Kokos", "h": 0.32, "mat": 34}, {"art": "Schurwolle-Flachgewebe", "h": 0.32, "mat": 62}]},
    {"kurz": "Sportbelag/Fallschutz aus Gummigranulat, {d} mm", "einheit": "m²", "kg": "352", "gen": "B",
     "lang": "Elastischer Belag aus PUR-gebundenem Gummigranulat, Dicke {d} mm, als Platten verklebt bzw. fugenlos eingebaut, für Fitness- "
             "und Mehrzweckräume.",
     "achsen": [BB_RAUM[:2], BB_ORT],
     "varianten": [{"d": "10", "h": 0.30, "mat": 32}, {"d": "20", "h": 0.32, "mat": 48}]},
])
_r2_neu("Laminat, Kork, Sockel, Treppen", [
    {"kurz": "Sockelleiste mit Kabelkanal {art}", "einheit": "m", "kg": "352", "gen": "A",
     "lang": "Sockelleiste mit integriertem Kabelkanal {art}, auf Montageclips bzw. geschraubt, mit Innen- und Außenecken.",
     "achsen": [BB_SOCKEL, BB_ORT],
     "varianten": [{"art": "Kunststoff, Höhe 60 mm", "h": 0.12, "mat": 6.5}, {"art": "Aluminium eloxiert, Höhe 80 mm", "h": 0.15, "mat": 14}]},
    {"kurz": "Belagwechsel-/Trennschiene {art}", "einheit": "m", "kg": "352", "gen": "A",
     "lang": "Trenn- bzw. Übergangsschiene {art} bei Belagwechsel und Höhenunterschieden bis 15 mm, verschraubt bzw. eingeklebt.",
     "achsen": [BB_ORT],
     "varianten": [{"art": "Edelstahl, Winkelprofil", "h": 0.14, "mat": 12}, {"art": "Messing, flach", "h": 0.14, "mat": 16},
                   {"art": "Aluminium, Rampenprofil", "h": 0.14, "mat": 9}]},
    {"kurz": "Podest-/Treppenpodestbelag {art}", "einheit": "m²", "kg": "352", "gen": "B",
     "lang": "Belag auf Treppenpodesten aus {art}, einschließlich Anschluss an Treppenkantenprofile und Wandsockel.",
     "achsen": [BB_ORT],
     "varianten": [{"art": "Linoleum 2,5 mm", "h": 0.55, "mat": 34}, {"art": "Kautschuk 3,0 mm", "h": 0.55, "mat": 52}]},
])
