# LB 024 Fliesen- und Plattenarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)
# Fliesen-Materialansatz inkl. Verschnitt; Listenpreis der Fliese im Text genannt, damit der Planer anpassen kann.

LBS = [{
    "nr": "024", "name": "Fliesen- und Plattenarbeiten", "atv": "DIN 18352", "lohn": "fliesen",
    "gruppen": [
        {"name": "Untergrund, Abdichtung", "positionen": [
            {"kurz": "Untergrund vorbereiten: {art}",
             "lang": "Untergrund für Fliesenbelag vorbereiten: {art}, nach Herstellerangabe des Verlegesystems. "
                     "Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "345", "gen": "A",
             "varianten": [{"art": "Grundierung auf Gipsputz bzw. Calciumsulfatestrich", "h": 0.03, "mat": 0.9},
                           {"art": "Spachtelung Wand zum Ebenheitsausgleich bis 3 mm", "h": 0.15, "mat": 2.5},
                           {"art": "Bodenausgleich selbstverlaufend bis 5 mm", "h": 0.12, "mat": 7.5},
                           {"art": "Calciumsulfatestrich anschleifen und absaugen", "h": 0.06, "mat": 0, "geraet": 0.8}]},
            {"kurz": "Verbundabdichtung {kw}, {w}",
             "lang": "Abdichtung im Verbund mit Fliesen (AIV) nach DIN 18534 {wo}, Wassereinwirkungsklasse {w}, aus "
                     "{sys} in mindestens zwei Arbeitsgängen, Mindesttrockenschichtdicke nach Herstellerangabe. "
                     "Dichtbänder, Dichtecken und Manschetten gesondert. Abrechnung nach abgedichteter Fläche.",
             "einheit": "m²", "kg": "345", "gen": "A",
             "varianten": [{"kw": "Wand flüssig", "wo": "an Wänden", "w": "W1-I/W2-I", "sys": "flüssig zu verarbeitendem Dispersions- bzw. Reaktionsabdichtungsstoff", "h": 0.18, "mat": 6.5},
                           {"kw": "Boden Dichtschlämme", "wo": "auf Böden", "w": "W2-I/W3-I", "sys": "rissüberbrückender mineralischer Dichtschlämme", "h": 0.16, "mat": 7.5, "kg": "352"},
                           {"kw": "Boden Dichtbahn", "wo": "als Bahnenabdichtung auf Böden", "w": "W3-I", "sys": "kaschierter Dichtbahn, Stöße mit Dichtband", "h": 0.20, "mat": 14, "kg": "352"}]},
            {"kurz": "Abdichtung Systemzubehör: {ka}",
             "lang": "{art} als Systemkomponente der Verbundabdichtung in den Abdichtungsstoff einbetten, "
                     "Überlappung nach Herstellerangabe.",
             "kg": "345", "gen": "A",
             "varianten": [{"ka": "Dichtband", "art": "Dichtband in Wand-/Bodenanschlüssen und Bewegungsfugen", "einheit": "m", "h": 0.08, "mat": 3.0},
                           {"ka": "Dichtecke", "art": "Dichtecke innen/außen", "einheit": "St", "h": 0.10, "mat": 3.5},
                           {"ka": "Manschette", "art": "Rohrmanschette bzw. Bodenmanschette", "einheit": "St", "h": 0.15, "mat": 6.0}]},
        ]},
        {"name": "Wandfliesen", "positionen": [
            {"kurz": "Klinkerriemchen Wand, bis {m} €/m²",
             "lang": "Wandbekleidung aus Klinker- bzw. Ziegelriemchen, Materialpreis bis {m} €/m², im Dünnbett "
                     "mit frostsicherem Flexkleber angesetzt, Fugen mit Fugenmörtel nach Bemusterung, Eckwinkel "
                     "gesondert. Öffnungen über 0,1 m² werden abgezogen.",
             "einheit": "m²", "kg": "335", "gen": "C",
             "varianten": [{"m": "35", "h": 1.30, "mat": 48}, {"m": "60", "h": 1.30, "mat": 76}]},
            {"kurz": "Wand-Dünnplatte {f} cm, 6 mm",
             "lang": "Keramische Dünnplatten Format {f} cm, Dicke ca. 6 mm, im kombinierten Verfahren mit "
                     "S2-Kleber verlegt, Transport mit Plattenrahmen, Materialpreis bis 90 €/m² enthalten.",
             "einheit": "m²", "kg": "345", "gen": "C",
             "varianten": [{"f": "100 × 300", "h": 1.8, "mat": 112}]},
            {"kurz": "Wandfliesen {f} cm, bis {m} €/m²",
             "lang": "Wandbekleidung aus keramischen Fliesen Format {f} cm, Gruppe und Oberfläche nach Bemusterung, "
                     "Materialpreis bis {m} €/m² (Listenpreis, im Ansatz enthalten), im Dünnbett mit flexiblem "
                     "Fliesenkleber C2 verlegt, Fugen zementär grau/weiß, Fugenbild {v}. Öffnungen über 0,1 m² "
                     "werden abgezogen.",
             "einheit": "m²", "kg": "345", "gen": "B",
             "varianten": [{"f": "20 × 25", "m": "20", "v": "Kreuzfuge", "h": 0.85, "mat": 28},
                           {"f": "30 × 60", "m": "30", "v": "Kreuzfuge bzw. Halbverband", "h": 0.80, "mat": 39},
                           {"f": "30 × 60", "m": "50", "v": "Kreuzfuge bzw. Halbverband", "h": 0.80, "mat": 61},
                           {"f": "60 × 120", "m": "50", "v": "Kreuzfuge, Großformat mit Nivelliersystem", "h": 1.10, "mat": 66}]},
            {"kurz": "Mosaik {f} cm, bis {m} €/m²",
             "lang": "Keramik- bzw. Glasmosaik Format {f} cm auf Netz, im Dünnbett verlegt, Fugen mit Epoxid- bzw. "
                     "zementärem Fugenmörtel nach Bemusterung, Materialpreis bis {m} €/m².",
             "einheit": "m²", "kg": "345", "gen": "C",
             "varianten": [{"f": "2,5 × 2,5", "m": "50", "h": 1.60, "mat": 66}, {"f": "5 × 5", "m": "40", "h": 1.30, "mat": 54}]},
            {"kurz": "Fliesenspiegel {f} cm, bis 3 m²",
             "lang": "Kleinflächige Wandbekleidung (Fliesenspiegel) Format {f} cm, Materialpreis bis 30 €/m², "
                     "Dünnbett, einschließlich Abschlussschienen, Einzelfläche bis 3 m².",
             "einheit": "m²", "kg": "345", "gen": "B",
             "varianten": [{"f": "10 × 10 bis 20 × 20", "h": 1.30, "mat": 40}, {"f": "30 × 60", "h": 1.10, "mat": 42}]},
            {"kurz": "Fliesen Vorwand/Wannenschürze",
             "lang": "Bekleidung von Vorwandinstallationen, Ablagen und Wannenschürzen mit Wandfliesen der Fläche, "
                     "einschließlich Schneiden, Kantenausbildung mit Profil bzw. Gehrung und Revisionsöffnung "
                     "(Fliesenrevisionsrahmen gesondert). Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "345", "h": 1.60, "mat": 42, "gen": "B"},
        ]},
        {"name": "Bodenfliesen", "positionen": [
            {"kurz": "Bodenfliesen {f} cm, R{r}, bis {m} €/m²",
             "lang": "Bodenbelag aus Feinsteinzeugfliesen Format {f} cm, rutschhemmend R{r}, Materialpreis bis {m} €/m² "
                     "(im Ansatz enthalten), im Dünnbett mit flexiblem Kleber C2 S1 verlegt (Großformat im kombinierten "
                     "Verfahren), Fugen zementär, Fugenbreite 3 mm. Einschließlich Bewegungsfugen nach Fugenplan "
                     "(Verfugung elastisch gesondert). Abrechnung nach verlegter Fläche.",
             "einheit": "m²", "kg": "352", "gen": "B",
             "varianten": [{"f": "30 × 30", "r": "10", "m": "25", "h": 0.70, "mat": 33},
                           {"f": "30 × 60", "r": "9", "m": "30", "h": 0.72, "mat": 39},
                           {"f": "30 × 60", "r": "9", "m": "50", "h": 0.72, "mat": 61},
                           {"f": "60 × 60", "r": "9", "m": "40", "h": 0.80, "mat": 51},
                           {"f": "60 × 120", "r": "9", "m": "60", "h": 1.05, "mat": 76},
                           {"f": "120 × 120", "r": "9", "m": "80", "h": 1.40, "mat": 100}]},
            {"kurz": "Bodenfliesen Mittelbett, {f} cm",
             "lang": "Bodenfliesen Format {f} cm, Materialpreis bis 30 €/m², im Mittelbett bzw. Dickbett auf "
                     "Betonuntergrund verlegt, einschließlich Ausgleich von Unebenheiten bis 15 mm, Fugen zementär.",
             "einheit": "m²", "kg": "325", "gen": "B",
             "varianten": [{"f": "30 × 30", "h": 0.95, "mat": 42}, {"f": "60 × 60", "h": 1.05, "mat": 46}]},
            {"kurz": "Fliesensockel {hs} cm",
             "lang": "Sockel aus der Bodenfliese geschnitten, Höhe {hs} cm, Oberkante geschliffen bzw. mit "
                     "Abschlussprofil, im Dünnbett angesetzt und verfugt. Abrechnung nach Länge.",
             "einheit": "m", "kg": "345", "gen": "A",
             "varianten": [{"hs": "6", "h": 0.18, "mat": 3.5}, {"hs": "10", "h": 0.20, "mat": 4.5}]},
            {"kurz": "Treppenstufe fliesen, bis {b} m",
             "lang": "Tritt- und Setzstufe mit Feinsteinzeug belegen, Trittstufe mit Stufenprofil bzw. Vorderkante "
                     "mit Gehrung, rutschhemmend R10, Materialpreis bis 40 €/m², Dünnbett. Breite bis {b} m.",
             "einheit": "St", "kg": "352", "gen": "B",
             "varianten": [{"b": "1,0", "h": 1.30, "mat": 35}, {"b": "1,5", "h": 1.70, "mat": 50}]},
            {"kurz": "Bodengleiche Dusche, {art}",
             "lang": "Bodengleichen Duschbereich herstellen: Gefälleausbildung bis 2 % zum Ablauf, Einbinden einer "
                     "{art} (Lieferung gesondert bzw. durch Sanitär) in die Verbundabdichtung, Fliesen im Gefälle "
                     "schneiden und verlegen. Zulage je Duschbereich bis 1,5 m².",
             "einheit": "St", "kg": "352", "gen": "B",
             "varianten": [{"art": "Duschrinne bis 90 cm", "h": 4.5, "mat": 35}, {"art": "punktförmigen Bodenablauf", "h": 3.5, "mat": 25}]},
            {"kurz": "Terrassenplatten Feinsteinzeug 2 cm, Stelzlager, 60 × 60",
             "lang": "Terrassen- bzw. Balkonbelag aus Feinsteinzeug-Außenplatten 60 × 60 × 2 cm, R11, frostsicher, "
                     "lose auf höhenverstellbaren Stelzlagern verlegt, Fugen offen 3–5 mm, Materialpreis bis 45 €/m². "
                     "Einschließlich Randabschluss.",
             "einheit": "m²", "kg": "352", "h": 0.65, "mat": 68, "gen": "B"},
        ]},
        {"name": "Fugen, Profile, Zubehör", "positionen": [
            {"kurz": "Elastische Fuge Silikon {wo}",
             "lang": "Anschluss- bzw. Bewegungsfuge mit Sanitär-Silikon bzw. Naturstein-Silikon schließen, "
                     "einschließlich Vorbehandlung, Hinterfüllung und Abglätten, Farbton passend zur Fuge, {wo}. "
                     "Wartungsfuge im Sinne der DIN 18352. Abrechnung nach Länge.",
             "einheit": "m", "kg": "345", "gen": "A",
             "varianten": [{"wo": "Wand/Wand, Wand/Boden", "h": 0.06, "mat": 0.9},
                           {"wo": "an Sanitärobjekten", "h": 0.08, "mat": 0.9}]},
            {"kurz": "Fugenmörtel Epoxidharz statt zementär, Aufpreis",
             "lang": "Aufpreis für das Verfugen mit Reaktionsharz-Fugenmörtel (Epoxid) anstelle zementärer Fuge, "
                     "z. B. in Großküchen, Duschanlagen oder bei chemischer Beanspruchung.",
             "einheit": "m²", "kg": "352", "h": 0.25, "mat": 9, "gen": "B"},
            {"kurz": "Abschluss-/Eckprofil Edelstahl bzw. Aluminium, {art}",
             "lang": "{art} als Fliesenprofil liefern und beim Verlegen einbauen, Höhe passend zur Fliesendicke. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "345", "gen": "A",
             "varianten": [{"art": "Außenecke/Abschluss Aluminium", "h": 0.12, "mat": 5.5},
                           {"art": "Außenecke/Abschluss Edelstahl", "h": 0.12, "mat": 11},
                           {"art": "Übergangsprofil Boden zu anderem Belag", "h": 0.15, "mat": 12},
                           {"art": "Bewegungsfugenprofil Boden", "h": 0.18, "mat": 16}]},
            {"kurz": "Fliesenrevisionsrahmen Edelstahl, bis {g} cm",
             "lang": "Revisionsöffnung mit Edelstahl-Revisionsrahmen und magnetisch gehaltener Fliesentür liefern und "
                     "einbauen, Fliesen der Fläche eingesetzt, Größe bis {g} cm.",
             "einheit": "St", "kg": "345", "gen": "B",
             "varianten": [{"g": "20 × 20", "h": 0.8, "mat": 45}, {"g": "30 × 30", "h": 1.0, "mat": 60}]},
            {"kurz": "Fliesenbohrung bis Ø {d} mm",
             "lang": "Bohrungen für Armaturen, Rohrdurchführungen und Steckdosen in Fliesen herstellen, sauber "
                     "ausgeführt, Durchmesser bis {d} mm.",
             "einheit": "St", "kg": "345", "gen": "A",
             "varianten": [{"d": "35", "h": 0.12, "mat": 0.8}, {"d": "110", "h": 0.25, "mat": 2.0}]},
            {"kurz": "Fliesen abschlagen {wo}",
             "lang": "Vorhandene Fliesen {wo} einschließlich Mörtel- bzw. Kleberbett abschlagen, Untergrund "
                     "säubern, Schutt zur Sammelstelle auf der Baustelle; Entsorgung gesondert.",
             "einheit": "m²", "kg": "394", "gen": "B", "tags": ["altbau"], "lohn": "abbruch",
             "varianten": [{"wo": "an Wänden", "h": 0.45, "mat": 0, "geraet": 1.5}, {"wo": "auf Böden", "h": 0.55, "mat": 0, "geraet": 2.0}]},
            {"kurz": "Einzelne Fliese im Bestand auswechseln",
             "lang": "Beschädigte Fliese im Bestand vorsichtig ausbauen, Kleberreste entfernen und Ersatzfliese "
                     "(beigestellt bzw. nach Bemusterung) einsetzen und verfugen.",
             "einheit": "St", "kg": "345", "h": 0.60, "mat": 3, "gen": "C", "tags": ["altbau"]},
        ]},
    ],
}]


# ---------------------------------------------------------------- Runde 2: Ergänzungen und Ausführungsachsen
def _gruppe(name):
    return next(g for g in LBS[0]["gruppen"] if g["name"] == name)


def _achsen(regeln):
    for g in LBS[0]["gruppen"]:
        for p in g["positionen"]:
            for pre, ax in regeln:
                if p["kurz"].startswith(pre) and "achsen" not in p:
                    p["achsen"] = ax
                    break


BESTAND = [{}, {"k": "Bestand", "t": "Ausführung im Bestand: Anschlüsse an vorhandene Beläge und Bauteile, Schutz angrenzender Flächen, "
                "Materialtransport von Hand.", "fh": 1.20, "gen": "B", "tags": ["altbau"]}]
MUSTER = [{}, {"k": "Halbverband", "t": "Verlegung im Halbverband bzw. Drittelverband.", "fh": 1.05, "fm": 1.02},
          {"k": "diagonal", "t": "Verlegung diagonal (45°), erhöhter Schnitt- und Verschnittanteil.", "fh": 1.25, "fm": 1.08, "gen": "B"},
          {"k": "Fischgrät", "t": "Verlegung im Fischgrätmuster (Riemchen- bzw. Langformat), Schnitte an allen Rändern.", "fh": 1.45,
           "fm": 1.10, "gen": "C"}]
MUSTER_W = MUSTER[:3]
RAUM = [{}, {"k": "≤ 8 m²", "t": "Ausführung in kleinen Räumen bis 8 m² (Bad, WC, Abstellraum) mit hohem Anteil an Schnitten und Anschlüssen.",
             "fh": 1.20, "gen": "B"}]
UG_WAND = [{}, {"k": "auf GK", "t": "Untergrund Gipsplatten bzw. zementgebundene Bauplatten, mit Grundierung.", "h": 0.02, "mat": 0.6},
           {"k": "auf Altfliese", "t": "Verlegung auf vorhandenem, tragfähigem Fliesenbelag: Reinigen, Anschleifen, Haftgrund.", "h": 0.08,
            "mat": 2.5, "tags": ["altbau"], "gen": "B"}]
UG_BODEN = [{}, {"k": "Heizestrich", "t": "Untergrund Heizestrich: Belegreife durch CM-Messung bestätigt, Feldbegrenzungsfugen übernommen.",
                 "h": 0.02, "mat": 0.5},
            {"k": "Entkopplung", "t": "Mit Entkopplungsmatte vollflächig im Kleber verlegt (z. B. auf jungem Estrich, Holz- oder Mischuntergrund).",
             "h": 0.12, "mat": 13, "gen": "B"},
            {"k": "auf Altfliese", "t": "Verlegung auf vorhandenem, tragfähigem Fliesenbelag: Reinigen, Anschleifen, Haftgrund.", "h": 0.08,
             "mat": 2.5, "tags": ["altbau"], "gen": "B"}]
RUTSCH = [{"ersetze": [[r"\s?\(?(rutschhemmend|Rutschhemmung) R ?\d+\)?,?", ""]], "t": "Rutschhemmung R9."}, {"k": "R11", "t": "Rutschhemmung abweichend R11 (z. B. Küchen, Eingangsbereiche).", "fm": 1.08},
          {"k": "R10/B", "t": "Rutschhemmung R10 und barfuß Bewertungsgruppe B (Duschen, Umkleiden).", "fm": 1.06}]
FUGE = [{}, {"k": "Epoxidfuge", "t": "Verfugung mit Reaktionsharz-Fugenmörtel (Epoxid).", "h": 0.20, "mat": 7.5, "gen": "B"}]
ABD_FL = [{}, {"k": "≤ 5 m²", "t": "Abdichtung in Einzelflächen bis 5 m², z. B. Duschbereiche.", "fh": 1.35}]

_gruppe("Untergrund, Abdichtung")["positionen"] += [
    {"kurz": "Fliesenbelag im Bestand prüfen und vorbehandeln (Überfliesen)",
     "lang": "Vorhandenen Fliesenbelag auf Hohllagen und Tragfähigkeit prüfen, hohle Fliesen entfernen und Fehlstellen spachteln, "
             "Belag reinigen, anschleifen und mit Haftgrund behandeln für Überfliesen.", "einheit": "m²", "kg": "345", "h": 0.25,
     "mat": 3.5, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Kleberbett/Altkleber abschleifen bzw. abfräsen",
     "lang": "Reste von Fliesenkleber und Mörtel nach dem Entfernen der Altfliesen maschinell abschleifen bzw. abfräsen, absaugen.",
     "einheit": "m²", "kg": "352", "h": 0.25, "geraet": 2.5, "gen": "B", "tags": ["altbau"], "lohn": "abbruch"},
    {"kurz": "Entkopplungsmatte unter Fliesen, Boden",
     "lang": "Entkopplungs- bzw. Abdichtungsmatte auf Estrich, Holz- oder Mischuntergrund im Dünnbett vollflächig verlegen, "
             "Stöße nach Herstellerangabe überlappt bzw. abgedichtet.", "einheit": "m²", "kg": "352", "h": 0.14, "mat": 14, "gen": "B",
     "achsen": [BESTAND]},
    {"kurz": "Trittschall-Dämmmatte unter Fliesen, {d} mm",
     "lang": "Trittschalldämmmatte unter keramischem Belag, Dicke {d} mm, im Dünnbett verlegt, Trittschallverbesserung nach "
             "Herstellernachweis.", "einheit": "m²", "kg": "352", "gen": "B",
     "varianten": [{"d": "2", "h": 0.10, "mat": 9}, {"d": "5", "h": 0.12, "mat": 14}]},
    {"kurz": "Bauplatte XPS zementbeschichtet als Fliesenuntergrund, {d} mm",
     "lang": "Bauplatte aus XPS-Hartschaum mit beidseitiger Zementbeschichtung, Dicke {d} mm, auf Wand bzw. Unterkonstruktion "
             "geklebt und gedübelt, Stöße mit Gewebeband armiert.", "einheit": "m²", "kg": "345", "gen": "B", "achsen": [BESTAND],
     "varianten": [{"d": "10", "h": 0.30, "mat": 14}, {"d": "20", "h": 0.32, "mat": 18}, {"d": "50", "h": 0.38, "mat": 28}]},
    {"kurz": "Duschelement befliesbar mit Gefälle, {g} cm",
     "lang": "Befliesbares Duschelement aus XPS mit werkseitigem Gefälle und integriertem Ablauf bzw. Rinnenaufnahme, Größe {g} cm, "
             "im Dünnbett auf Rohboden verlegt, an die Abdichtung angeschlossen.", "einheit": "St", "kg": "352", "gen": "B",
     "achsen": [BESTAND],
     "varianten": [{"g": "90 × 90", "h": 2.0, "mat": 260}, {"g": "120 × 120", "h": 2.4, "mat": 340}, {"g": "90 × 180", "h": 2.8, "mat": 420}]},
    {"kurz": "Zulage Abdichtung {art}",
     "lang": "Zulage zur Verbundabdichtung für {art}.", "einheit": "m²", "kg": "345", "gen": "B",
     "varianten": [{"art": "Wassereinwirkungsklasse W3-I (zusätzliche Lage)", "h": 0.08, "mat": 3.5},
                   {"art": "chemische Beanspruchung (Reaktionsharz)", "h": 0.15, "mat": 18},
                   {"art": "Kontrolle der Schichtdicke mit Protokoll", "h": 0.02, "mat": 0.2}]},
]
_gruppe("Wandfliesen")["positionen"] += [
    {"kurz": "Wandfliesen {f} cm, PG {pg}",
     "lang": "Wandbekleidung aus keramischen Fliesen Format {f} cm, Preisgruppe {pg} (Materialpreis bis {m} €/m², im Ansatz "
             "enthalten), Dünnbett mit flexiblem Kleber C2, Fugen zementär. Öffnungen über 0,1 m² werden abgezogen.",
     "einheit": "m²", "kg": "345", "gen": "B", "achsen": [MUSTER_W, UG_WAND, RAUM, BESTAND],
     "varianten": [{"f": "10 × 10", "pg": "1", "m": "15", "h": 1.05, "mat": 23}, {"f": "15 × 15", "pg": "1", "m": "15", "h": 0.95, "mat": 23},
                   {"f": "20 × 40", "pg": "2", "m": "30", "h": 0.82, "mat": 39}, {"f": "30 × 90", "pg": "2", "m": "35", "h": 0.90, "mat": 45},
                   {"f": "40 × 120", "pg": "3", "m": "60", "h": 1.05, "mat": 77}, {"f": "7,5 × 30 (Metro)", "pg": "2", "m": "30", "h": 1.15, "mat": 39}]},
    {"kurz": "Wandfliesen-Fries/Bordüre, Höhe bis {hs} cm",
     "lang": "Fries bzw. Bordüre aus Dekorfliesen, Höhe bis {hs} cm, im Fliesenbelag eingelegt, Materialpreis bis 15 €/m.",
     "einheit": "m", "kg": "345", "gen": "B", "varianten": [{"hs": "5", "h": 0.25, "mat": 16}, {"hs": "10", "h": 0.30, "mat": 18}]},
    {"kurz": "Fensterleibung/Nische fliesen, Tiefe bis {t} cm",
     "lang": "Fenster- und Nischenleibungen mit Fliesen der Fläche belegen, Kanten mit Profil, Tiefe bis {t} cm. Abrechnung nach Länge.",
     "einheit": "m", "kg": "345", "gen": "A", "achsen": [BESTAND],
     "varianten": [{"t": "15", "h": 0.40, "mat": 7}, {"t": "30", "h": 0.55, "mat": 12}]},
    {"kurz": "Fliesen-Ablage/Fensterbank, Tiefe bis 25 cm",
     "lang": "Ablageflächen und Fensterbänke im Fliesenbereich aus Fliesen mit Gefälle bzw. Natursteinstreifen, Vorderkante mit "
             "Profil, Tiefe bis 25 cm. Abrechnung nach Länge.", "einheit": "m", "kg": "345", "h": 0.60, "mat": 18, "gen": "B"},
]
_gruppe("Bodenfliesen")["positionen"] += [
    {"kurz": "Bodenfliesen {f} cm, PG {pg}",
     "lang": "Bodenbelag aus Feinsteinzeugfliesen Format {f} cm, rutschhemmend R9, Preisgruppe {pg} (Materialpreis bis {m} €/m², "
             "im Ansatz enthalten), im Dünnbett mit flexiblem Kleber C2 verlegt, Fugen zementär. Abrechnung nach verlegter Fläche.",
     "einheit": "m²", "kg": "352", "gen": "B", "achsen": [MUSTER, UG_BODEN, RUTSCH, RAUM, BESTAND],
     "varianten": [{"f": "20 × 20", "pg": "1", "m": "18", "h": 0.80, "mat": 25}, {"f": "45 × 90", "pg": "2", "m": "40", "h": 0.85, "mat": 51},
                   {"f": "20 × 120", "pg": "2", "m": "40", "h": 0.95, "mat": 52}, {"f": "80 × 80", "pg": "3", "m": "60", "h": 0.90, "mat": 75}]},
    {"kurz": "Feinsteinzeug Terrasse/Balkon im Mörtelbett, {f} cm",
     "lang": "Außenbelag aus Feinsteinzeug Format {f} cm, R11, frostsicher, im Drainmörtel bzw. auf Drainagematte verlegt, "
             "Fugen mit wasserdurchlässigem Fugenmörtel, Gefälle vorhanden. Materialpreis bis 40 €/m².",
     "einheit": "m²", "kg": "352", "gen": "C", "achsen": [BESTAND],
     "varianten": [{"f": "30 × 60", "h": 1.10, "mat": 62}, {"f": "60 × 60", "h": 1.15, "mat": 64}]},
    {"kurz": "Industriefliesen/Spaltplatten {f} cm, Rüttelverfahren",
     "lang": "Keramische Industriefliesen bzw. Spaltplatten Format {f} cm, Dicke 10–15 mm, R11–R12, im Rüttelverfahren in Mörtelbett "
             "verlegt, Fugen mit Epoxid, für hochbelastete Bereiche (Großküche, Werkstatt).",
     "einheit": "m²", "kg": "352", "gen": "C", "varianten": [{"f": "15 × 15", "h": 1.10, "mat": 62}, {"f": "20 × 20", "h": 1.00, "mat": 58}]},
    {"kurz": "Hohlkehlsockel keramisch, Großküche/Nassbereich",
     "lang": "Keramischer Hohlkehlsockel passend zum Bodenbelag, Höhe ca. 10 cm, in Kleber bzw. Mörtel versetzt, Fugen Epoxid. "
             "Abrechnung nach Länge.", "einheit": "m", "kg": "345", "h": 0.40, "mat": 18, "gen": "B"},
    {"kurz": "Rinnen-/Gully-Abdeckung Edelstahl einbauen, Länge bis {l} cm",
     "lang": "Abdeckrost bzw. befliesbare Abdeckung einer Duschrinne (Lieferung Sanitär) einbauen und höhengerecht an den Belag "
             "anpassen, Länge bis {l} cm.", "einheit": "St", "kg": "352", "gen": "A",
     "varianten": [{"l": "80", "h": 0.8, "mat": 5}, {"l": "120", "h": 1.0, "mat": 6}]},
    {"kurz": "Zulage Bodenfliesen: Gefälleverlegung zum Ablauf",
     "lang": "Zulage für Verlegung im Gefälle zu Abläufen bzw. Rinnen mit Kehlschnitten, je m² Gefällefläche.",
     "einheit": "m²", "kg": "352", "h": 0.30, "mat": 1.5, "gen": "B"},
    {"kurz": "Zulage Fliesen: Verlegung mit Nivelliersystem (Großformat)",
     "lang": "Zulage für Verlegung mit Nivellier- bzw. Zuglaschensystem zur Vermeidung von Überzähnen bei Großformaten.",
     "einheit": "m²", "kg": "352", "h": 0.10, "mat": 2.5, "gen": "A"},
    {"kurz": "Podest/Treppenstufe außen fliesen, Breite bis {b} m",
     "lang": "Außenstufe bzw. Podestkante mit frostsicherem Feinsteinzeug R11 und Stufenprofil belegen, auf Abdichtung bzw. "
             "Drainagematte. Breite bis {b} m.", "einheit": "St", "kg": "352", "gen": "C", "achsen": [BESTAND],
     "varianten": [{"b": "1,2", "h": 1.8, "mat": 58}, {"b": "2,0", "h": 2.6, "mat": 85}]},
]
_gruppe("Fugen, Profile, Zubehör")["positionen"] += [
    {"kurz": "Fugen im Bestand erneuern: {art}",
     "lang": "Vorhandene Fugen {art} maschinell auskratzen, reinigen und neu verfugen, Farbton nach Bemusterung.",
     "einheit": "m²", "kg": "345", "gen": "B", "tags": ["altbau"],
     "varianten": [{"art": "Wandfliesen zementär", "h": 0.55, "mat": 2.0}, {"art": "Bodenfliesen zementär", "h": 0.50, "mat": 2.5, "kg": "352"},
                   {"art": "Bodenfliesen mit Epoxid", "h": 0.70, "mat": 9, "kg": "352"}]},
    {"kurz": "Silikonfuge im Bestand erneuern",
     "lang": "Alte elastische Fuge vollständig entfernen, Flanken reinigen, Schimmelreste beseitigen, primern und neu mit "
             "Sanitärsilikon verfugen. Abrechnung nach Länge.", "einheit": "m", "kg": "345", "h": 0.12, "mat": 1.0, "gen": "A",
     "tags": ["altbau"]},
    {"kurz": "Hohlliegende Fliesen im Bestand verfüllen bzw. neu verlegen",
     "lang": "Hohlliegende Fliesen ausbauen, Untergrund und Rückseite reinigen und mit Ersatzfliesen bzw. den gesicherten "
             "Fliesen neu verlegen, verfugen. Je m² instand gesetzter Fläche.", "einheit": "m²", "kg": "352", "h": 1.30, "mat": 12,
     "gen": "C", "tags": ["altbau"]},
    {"kurz": "Fliesen-Antirutschbehandlung (Ätzverfahren)",
     "lang": "Nachträgliche Erhöhung der Rutschhemmung keramischer Beläge durch chemisches Ätzverfahren, mit Prüfung, nach "
             "Musterfläche.", "einheit": "m²", "kg": "352", "h": 0.12, "mat": 4.5, "gen": "C", "tags": ["altbau"]},
    {"kurz": "Fleckschutzimprägnierung Feinsteinzeug/Naturstein",
     "lang": "Fleckschutzimprägnierung auf poliertes Feinsteinzeug bzw. Naturstein nach Herstellerangabe auftragen, "
             "Überschuss abnehmen.", "einheit": "m²", "kg": "352", "h": 0.08, "mat": 2.2, "gen": "A"},
    {"kurz": "Stundenlohnarbeiten Fliesenleger",
     "lang": "Arbeiten im Stundenlohn auf Anordnung der Bauleitung, Fliesenleger-Geselle einschließlich aller Zuschläge.",
     "einheit": "h", "kg": "345", "h": 1.0, "mat": 0, "geraet": 0.5, "gen": "A"},
]

_achsen([
    ("Wandfliesen ", [MUSTER_W, UG_WAND, RAUM, BESTAND]),
    ("Wand-Dünnplatte", [UG_WAND, BESTAND]),
    ("Klinkerriemchen", [BESTAND]),
    ("Mosaik", [UG_WAND, FUGE, BESTAND]),
    ("Fliesenspiegel", [UG_WAND, BESTAND]),
    ("Fliesen Vorwand", [FUGE, BESTAND]),
    ("Bodenfliesen Mittelbett", [MUSTER[:3], RUTSCH, BESTAND]),
    ("Bodenfliesen ", [MUSTER, UG_BODEN, RAUM, BESTAND]),
    ("Fliesensockel", [BESTAND]),
    ("Terrassenplatten", [BESTAND]),
    ("Treppenstufe fliesen", [RUTSCH[:2], BESTAND]),
    ("Bodengleiche Dusche", [BESTAND]),
    ("Verbundabdichtung", [ABD_FL, BESTAND]),
    ("Untergrund vorbereiten", [BESTAND]),
])
