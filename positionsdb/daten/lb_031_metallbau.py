# LB 031 Metallbauarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "031", "name": "Metallbauarbeiten", "atv": "DIN 18360", "lohn": "metallbau",
    "gruppen": [
        {"name": "Zargen, Stahltüren", "positionen": [
            {"kurz": "Stahl-Umfassungszarge, Maulweite {mw} mm, {rm}",
             "lang": "Stahl-Umfassungszarge aus verzinktem Stahlblech 1,5 mm, grundiert, mit Gummidichtung, "
                     "Bandaufnahmen und Schließblech, Maulweite bis {mw} mm, für Mauerwerk bzw. Ständerwand, "
                     "Rohbaurichtmaß {rm}, lot- und fluchtgerecht eingebaut und hinterfüllt.",
             "einheit": "St", "kg": "344", "gen": "A",
             "varianten": [{"mw": "125", "rm": "885 × 2010 mm", "h": 1.6, "mat": 120},
                           {"mw": "175", "rm": "1010 × 2135 mm", "h": 1.8, "mat": 150},
                           {"mw": "275", "rm": "1010 × 2135 mm", "h": 2.0, "mat": 195}]},
            {"kurz": "Stahl-Eckzarge, {rm}",
             "lang": "Stahl-Eckzarge aus verzinktem Stahlblech, grundiert, mit Dichtung, für Mauerwerks- und "
                     "Betonöffnungen, Rohbaurichtmaß {rm}, eingebaut und vermörtelt.",
             "einheit": "St", "kg": "344", "gen": "A",
             "varianten": [{"rm": "885 × 2010 mm", "h": 1.3, "mat": 80}, {"rm": "1010 × 2135 mm", "h": 1.4, "mat": 95}]},
            {"kurz": "Mehrzwecktür Stahl, einflügelig, {rm}",
             "lang": "Stahl-Mehrzwecktür einflügelig, doppelwandiges Türblatt mit Dämmeinlage, mit Eckzarge, "
                     "Einsteckschloss PZ, Drückergarnitur, verzinkt und pulverbeschichtet RAL nach Wahl, "
                     "Rohbaurichtmaß {rm}.",
             "einheit": "St", "kg": "344", "gen": "B",
             "varianten": [{"rm": "875 × 2000 mm", "h": 2.5, "mat": 420}, {"rm": "1000 × 2125 mm", "h": 2.8, "mat": 480}]},
            {"kurz": "Feuerschutztür Stahl T{k}, {f}, {rm}",
             "lang": "Feuerschutztür aus Stahl EI2 {k}-C5 (T{k}) mit Zulassung bzw. Leistungserklärung, {f}, Zarge "
                     "für Mauerwerk/Beton, Obentürschließer, Feuerschutz-Drückergarnitur, Profilzylinder vorgerichtet, "
                     "pulverbeschichtet RAL nach Wahl, Kennzeichnung. Rohbaurichtmaß {rm}.",
             "einheit": "St", "kg": "344", "gen": "B",
             "varianten": [{"k": "30", "f": "1-flg.", "rm": "1000 × 2125 mm", "h": 4.5, "mat": 900},
                           {"k": "30", "f": "2-flg.", "rm": "2000 × 2125 mm", "h": 8, "mat": 2350},
                           {"k": "90", "f": "1-flg.", "rm": "1000 × 2125 mm", "h": 5.5, "mat": 1450},
                           {"k": "90", "f": "2-flg.", "rm": "2000 × 2125 mm", "h": 9, "mat": 3500}]},
            {"kurz": "Rauchschutztür Stahl S200, einflügelig",
             "lang": "Rauchschutztür Sa/S200-C5 aus Stahl, einflügelig, mit umlaufender Dichtung, absenkbarer "
                     "Bodendichtung, Obentürschließer, Prüfzeugnis.",
             "einheit": "St", "kg": "344", "gen": "B", "varianten": [{"rm": "1000 × 2125 mm", "h": 4.0, "mat": 820}]},
            {"kurz": "Rohrrahmentür verglast {bs}, {f}",
             "lang": "Rohrrahmentür aus Stahl- bzw. Aluminiumprofilen, Anforderung {bs}, "
                     "{f}, Verglasung passend zur Anforderung, Obentürschließer mit Feststellanlage vorgerichtet, Panikschloss, "
                     "pulverbeschichtet, Rohbaurichtmaß nach Liste.",
             "einheit": "St", "kg": "344", "gen": "C",
             "varianten": [{"bs": "T30-RS", "f": "1-flg. 1,25 × 2,25 m", "h": 9, "mat": 4300}, {"bs": "T30-RS", "f": "2-flg. 2,25 × 2,25 m", "h": 14, "mat": 7600},
                           {"bs": "RS", "f": "1-flg. 1,25 × 2,25 m", "h": 7, "mat": 2900}, {"bs": "RS", "f": "2-flg. 2,25 × 2,25 m", "h": 11, "mat": 5100},
                           {"bs": "ohne Brandschutz", "f": "1-flg. 1,25 × 2,25 m", "h": 6, "mat": 2100}, {"bs": "ohne Brandschutz", "f": "2-flg. 2,25 × 2,25 m", "h": 9, "mat": 3600}]},
            {"kurz": "Feststellanlage für Feuerschutzabschluss mit Abnahme",
             "lang": "Bauaufsichtlich zugelassene Feststellanlage (Haftmagnete, Rauchschalter, Auslösetaster, "
                     "Energieversorgung) an Feuerschutztür montieren, einschließlich Abnahmeprüfung und Kennzeichnung.",
             "einheit": "St", "kg": "344", "h": 4.0, "mat": 850, "gen": "B"},
            {"kurz": "Feuerschutz-Sektionaltor / Schiebetor EI2 30, bis {gr}",
             "lang": "Feuerschutztor EI2 30 als Schiebetor bzw. Rolltor mit Feststellanlage und Zulassung, "
                     "Antrieb mit Not-Schließfunktion, verzinkt, Torgröße bis {gr}.",
             "einheit": "St", "kg": "344", "gen": "C", "varianten": [{"gr": "3,0 × 3,0 m", "h": 30, "mat": 9800}]},
            {"kurz": "Garagen-Sektionaltor, Motor, {gr}",
             "lang": "Sektionaltor mit wärmegedämmten Stahlsektionen (42 mm), Federausgleich, Antrieb mit Funk-"
                     "handsender und Hinderniserkennung, Farbe RAL nach Wahl, Torgröße {gr}.",
             "einheit": "St", "kg": "334", "gen": "B",
             "varianten": [{"gr": "2,50 × 2,125 m", "h": 7, "mat": 1650}, {"gr": "5,00 × 2,125 m", "h": 9, "mat": 2700}]},
        ]},
        {"name": "Geländer, Handläufe", "positionen": [
            {"kurz": "Treppengeländer Stahl, Stäbe, Handlauf {hl}",
             "lang": "Treppengeländer aus Stahl, feuerverzinkt und pulverbeschichtet, Höhe 1,00 m (bzw. nach LBO), "
                     "senkrechte Füllstäbe Abstand ≤ 12 cm, Handlauf {hl}, seitlich an die Treppenwange bzw. auf "
                     "die Stufen gedübelt, Statik durch AN. Abrechnung nach Länge in Steigung.",
             "einheit": "m", "kg": "359", "gen": "B",
             "varianten": [{"hl": "Stahlrohr Ø 42 mm", "h": 3.0, "mat": 165}, {"hl": "Edelstahl Ø 42 mm", "h": 3.2, "mat": 205}]},
            {"kurz": "Treppengeländer Edelstahl, {fu}",
             "lang": "Treppengeländer aus Edelstahl V2A geschliffen, Pfosten mit seitlicher Befestigung, Füllung "
                     "{fu}, Handlauf Ø 42 mm, Höhe nach LBO, Statik durch AN. Abrechnung nach Länge in Steigung.",
             "einheit": "m", "kg": "359", "gen": "B",
             "varianten": [{"fu": "horizontale Relinge Ø 12 mm", "h": 3.0, "mat": 210},
                           {"fu": "VSG-Glas 2 × 8 mm in Glasklemmen", "h": 3.5, "mat": 300}]},
            {"kurz": "Balkongeländer {ka}",
             "lang": "Balkon- bzw. Brüstungsgeländer {art}, Höhe über OK Belag, an der Balkonplatte befestigt, "
                     "Statik durch AN. Abrechnung nach Länge.",
             "einheit": "m", "kg": "359", "gen": "B",
             "varianten": [{"art": "Stahl verzinkt mit Füllstäben", "ka": "Stahl/Stäbe", "h": 2.8, "mat": 200},
                           {"art": "Stahl verzinkt mit Lochblechfüllung", "ka": "Stahl/Lochblech", "h": 2.8, "mat": 240},
                           {"art": "Aluminium mit VSG-Füllung", "ka": "Alu/VSG", "h": 3.0, "mat": 340},
                           {"art": "Ganzglas-Brüstung im Bodenprofil, VSG", "ka": "Ganzglas Bodenprofil", "h": 3.5, "mat": 560}]},
            {"kurz": "Französischer Balkon, Breite bis {b} m",
             "lang": "Absturzsicherung vor bodentiefen Fenstern aus Edelstahlrahmen mit VSG-Glasfüllung bzw. "
                     "Stahlstäben, in der Leibung oder am Fensterrahmen befestigt, geprüftes System, Breite bis {b} m.",
             "einheit": "St", "kg": "359", "gen": "B",
             "varianten": [{"b": "1,25", "h": 2.0, "mat": 380}, {"b": "2,00", "h": 2.5, "mat": 520}]},
            {"kurz": "Wandhandlauf {m} Ø 42 mm mit Haltern",
             "lang": "Wandhandlauf aus {m}, Ø 42 mm, mit Wandhaltern im Abstand ≤ 1,20 m, Endkappen bzw. "
                     "Endbögen zur Wand, barrierefrei nach DIN 18040 (über Treppenende 30 cm hinausgeführt). "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "359", "gen": "A",
             "varianten": [{"m": "Edelstahl V2A geschliffen", "h": 0.9, "mat": 70}, {"m": "Stahl verzinkt beschichtet", "h": 0.9, "mat": 48},
                           {"m": "Holz Buche/Eiche auf Stahlhaltern", "h": 0.9, "mat": 55}]},
            {"kurz": "Geländer Bestand: Höhe nachrüsten / aufsetzen",
             "lang": "Bestehendes Geländer an heutige Anforderungen anpassen: Aufsatzrohr bzw. Zusatzhandlauf "
                     "anschweißen oder klemmen, Füllung schließen, Beschichtung ausbessern. Abrechnung nach Länge.",
             "einheit": "m", "kg": "359", "h": 2.0, "mat": 70, "gen": "C", "tags": ["altbau"]},
        ]},
        {"name": "Treppen, Roste, Schächte", "positionen": [
            {"kurz": "Stahltreppe gerade, Flachstahlwangen, Laufbreite {b} m",
             "lang": "Außen- bzw. Nebentreppe aus Stahl, feuerverzinkt, Wangen aus Flachstahl, Stufen aus "
                     "Gitterrost rutschhemmend R11 mit Antrittkante, Geländer einseitig, Geschosshöhe bis 3,0 m, "
                     "Laufbreite {b} m, einschließlich Statik und Fußplatten.",
             "einheit": "St", "kg": "351", "gen": "C",
             "varianten": [{"b": "1,00", "h": 28, "mat": 4500}, {"b": "1,20", "h": 32, "mat": 5400}]},
            {"kurz": "Spindeltreppe Stahl, Ø {d} m",
             "lang": "Spindeltreppe aus Stahl feuerverzinkt mit Gitterroststufen und Außengeländer, Ø {d} m, "
                     "Geschosshöhe bis 3,0 m, einschließlich Statik.",
             "einheit": "St", "kg": "351", "gen": "C", "varianten": [{"d": "1,40", "h": 22, "mat": 4200}, {"d": "1,60", "h": 24, "mat": 4800}, {"d": "2,00", "h": 28, "mat": 6400}]},
            {"kurz": "Steigleiter / Fluchtleiter, Höhe bis {hh} m",
             "lang": "Ortsfeste Steigleiter aus Stahl verzinkt bzw. Aluminium nach DIN EN ISO 14122-4 mit Rückenschutz "
                     "ab 3 m, Austrittshilfe, Wandhalter, Höhe bis {hh} m.",
             "einheit": "St", "kg": "359", "gen": "B",
             "varianten": [{"hh": "4", "h": 8, "mat": 1150}, {"hh": "8", "h": 14, "mat": 2300}]},
            {"kurz": "Gitterrost, Tragstab {t} mm",
             "lang": "Pressschweiß-Gitterrost feuerverzinkt, Maschenweite 30/10 mm, Tragstab {t} mm, mit Randeinfassung "
                     "und Auflagerwinkel, rutschhemmend, gegen Abheben gesichert. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "359", "gen": "A",
             "varianten": [{"t": "30 × 3", "h": 1.0, "mat": 85}, {"t": "40 × 3", "h": 1.1, "mat": 105}]},
            {"kurz": "Kellerlichtschacht Kunststoff mit Rost, {gr}",
             "lang": "Kellerlichtschacht aus GFK bzw. Polymerbeton mit verzinktem Gitterrost und Abhebesicherung, "
                     "an Kelleraußenwand montiert, Anschluss Entwässerung, Größe {gr}.",
             "einheit": "St", "kg": "339", "gen": "B",
             "varianten": [{"gr": "100 × 60 × 40 cm", "h": 1.8, "mat": 260}, {"gr": "125 × 100 × 70 cm", "h": 2.5, "mat": 480}]},
            {"kurz": "Fußabstreifer Edelstahl/Rost mit Wanne, {gr}",
             "lang": "Fußabstreifer als Rahmen mit Edelstahl- oder Gummi-Rips-Einlage in Bodenwanne mit Entwässerung, "
                     "Einbau bündig, Größe {gr}.",
             "einheit": "St", "kg": "339", "gen": "B",
             "varianten": [{"gr": "100 × 60 cm", "h": 1.5, "mat": 310}, {"gr": "150 × 100 cm", "h": 2.0, "mat": 620}]},
            {"kurz": "Abdeckung / Schachtdeckel Stahl, Riffelblech, bis 1 m²",
             "lang": "Abdeckung aus Riffelblech feuerverzinkt mit Rahmen aus Winkelstahl, Klappmechanismus bzw. Griffe, "
                     "befahrbar bzw. begehbar nach Angabe, bis 1 m².",
             "einheit": "St", "kg": "359", "h": 3.0, "mat": 280, "gen": "B"},
        ]},
        {"name": "Vordächer, Briefkästen, Kleinstahl", "positionen": [
            {"kurz": "Vordach {art}, Ausladung {a} m, Breite {b} m",
             "lang": "Vordach über Eingang aus {art}, mit Entwässerung zur Seite bzw. Fallrohr, wandseitige "
                     "Befestigung über thermisch getrennte Konsolen nach Statik, Ausladung {a} m, Breite {b} m.",
             "einheit": "St", "kg": "339", "gen": "C",
             "varianten": [{"art": "Edelstahl-Glas (VSG) mit Zugstangen", "a": "1,0", "b": "1,6", "h": 6, "mat": 1400},
                           {"art": "Stahl verzinkt, Blechdeckung", "a": "1,5", "b": "2,5", "h": 10, "mat": 1900},
                           {"art": "Aluminium Kassettenvordach", "a": "1,5", "b": "3,0", "h": 8, "mat": 2400}]},
            {"kurz": "Briefkastenanlage {n} Fächer mit Klingeltableau",
             "lang": "Briefkastenanlage aus Edelstahl bzw. pulverbeschichtetem Stahl, {n} Briefkastenfächer mit "
                     "Namensschildern, integriertes Klingeltableau mit Sprechstelle vorgerichtet, auf Standfuß bzw. "
                     "Wandmontage, Briefkasten nach DIN EN 13724.",
             "einheit": "St", "kg": "339", "gen": "C",
             "varianten": [{"n": "4", "h": 4, "mat": 1300}, {"n": "8", "h": 5, "mat": 2100}, {"n": "16", "h": 7, "mat": 3800}]},
            {"kurz": "Schlosserarbeiten Kleinstahlteile nach Zeichnung",
             "lang": "Kleinstahlteile (Konsolen, Winkel, Halterungen, Abfangungen) aus Baustahl S235 nach Zeichnung "
                     "anfertigen, feuerverzinken und montieren. Abrechnung nach Gewicht.",
             "einheit": "kg", "kg": "339", "h": 0.08, "mat": 3.8, "gen": "B"},
            {"kurz": "Fahrradständer / Anlehnbügel Edelstahl/verzinkt",
             "lang": "Fahrrad-Anlehnbügel aus Stahlrohr feuerverzinkt bzw. Edelstahl, Ø 48 mm, zum Einbetonieren "
                     "oder Aufdübeln, einschließlich Fundament.",
             "einheit": "St", "kg": "551", "h": 1.2, "mat": 140, "gen": "A"},
            {"kurz": "Mülltonnenbox Metall, für {n} Tonnen 240 l",
             "lang": "Mülltonnenbox aus verzinktem und beschichtetem Stahl bzw. Edelstahl mit Klappdeckeln und Türen, "
                     "für {n} Tonnen 240 l, auf bauseitiger Fläche verankert.",
             "einheit": "St", "kg": "551", "gen": "C",
             "varianten": [{"n": "2", "h": 3, "mat": 1350}, {"n": "4", "h": 4, "mat": 2450}]},
            {"kurz": "Anschlagpunkt / Sicherungssystem Dach nach EN 795",
             "lang": "Einzelanschlagpunkt für persönliche Schutzausrüstung nach DIN EN 795 Typ A, Edelstahl, auf "
                     "Stahlbeton bzw. Holzsparren befestigt, mit Prüfprotokoll und Dokumentation.",
             "einheit": "St", "kg": "369", "h": 1.5, "mat": 180, "gen": "B", "lohn": "dach"},
        ]},
    ],
}]


# ---------------------------------------------------------------- Runde 2: Ausführungsachsen und weitere Grundpositionen
ORT = [{}, {"k": "Bestand", "t": "Einbau im Bestand: Anpassen an vorhandene Öffnungen bzw. Bauteile, erschwerter Transport, Arbeiten in genutzten Bereichen.",
            "fh": 1.3, "h": 0.3, "gen": "B", "tags": ["altbau"]}]
OB_Z = [{"k": "grundiert", "t": "Oberfläche verzinkt und grundiert für bauseitigen Anstrich."},
        {"k": "pulverbeschichtet", "t": "Oberfläche pulverbeschichtet RAL nach Wahl.", "mat": 45},
        {"k": "Edelstahl", "t": "Zarge aus Edelstahl geschliffen.", "fm": 2.6, "gen": "C"}]
ZWAND = [{"k": "Mauerwerk", "t": "Für Mauerwerk bzw. Beton mit Maueranker, hinterfüllt."},
         {"k": "Ständerwand", "t": "Für Metallständerwände mit Klemmlaschen bzw. Anschraubwinkeln, ausgedämmt.", "mat": 15, "h": -0.2}]
ZBS = [{}, {"k": "für T30", "t": "Zarge mit Eignungsnachweis für Feuerschutztüren T30.", "mat": 40}]
GR_T = [{"k": "1000 × 2125", "t": "Rohbaurichtmaß 1000 × 2125 mm."}, {"k": "875 × 2000", "t": "Rohbaurichtmaß 875 × 2000 mm.", "fm": 0.92},
        {"k": "1125 × 2125", "t": "Rohbaurichtmaß 1125 × 2125 mm.", "fm": 1.08}, {"k": "1250 × 2250", "t": "Rohbaurichtmaß 1250 × 2250 mm.", "fm": 1.18, "fh": 1.1}]
OB_T = [{"k": "RAL Standard", "t": "Oberfläche verzinkt, pulverbeschichtet RAL Standardfarbe."},
        {"k": "Sonderfarbe", "t": "Pulverbeschichtung in RAL-Sonderfarbe bzw. Feinstruktur.", "mat": 90},
        {"k": "Edelstahl-Optik", "t": "Türblatt mit Edelstahl-Beplankung bzw. Folie in Edelstahloptik.", "mat": 380, "gen": "C"}]
ZARGE_T = [{"k": "Eckzarge", "t": "Mit Eckzarge."}, {"k": "Umfassungszarge", "t": "Mit Umfassungszarge passend zur Wanddicke.", "mat": 90, "h": 0.3}]
LA_T = [{}, {"k": "Lichtausschnitt", "t": "Mit Lichtausschnitt ca. 300 × 600 mm, Verglasung passend zur Anforderung.", "mat": 420, "h": 0.4}]
LA_M = [{}, {"k": "Lichtausschnitt", "t": "Mit Lichtausschnitt ca. 300 × 600 mm, VSG.", "mat": 210, "h": 0.3}]
LUEFT = [{}, {"k": "Lüftungsgitter", "t": "Mit Lüftungsgitter oben und unten im Türblatt.", "mat": 65}]
PANIK = [{}, {"k": "Panik EN 1125", "t": "Mit Panikschloss und Druckstange nach DIN EN 1125.", "mat": 420, "h": 1.5}]
FSA = [{}, {"k": "Feststellanlage", "t": "Mit zugelassener Feststellanlage (Rauchschalter, Haftmagnet bzw. Gleitschiene, Auslösetaster) einschließlich Abnahme.", "mat": 850, "h": 4}]
RR_MAT = [{"k": "Stahl", "t": "Profile aus Stahl."}, {"k": "Aluminium", "t": "Profile aus Aluminium.", "fm": 1.1}]
TOR_OB = [{"k": "RAL Standard", "t": "Torblatt Farbe RAL Standard."}, {"k": "Holzdekor", "t": "Torblatt mit Holzdekor-Oberfläche.", "fm": 1.15},
          {"k": "Sonderfarbe", "t": "Torblatt in RAL-Sonderfarbe.", "fm": 1.1}]
TOR_S = [{"k": "Sicke", "t": "Paneele mit Sicken."}, {"k": "Kassette", "t": "Paneele mit Kassettenprägung.", "fm": 1.05}, {"k": "glatt", "t": "Paneele glatt, ohne Sicken.", "fm": 1.08}]
TOR_A = [{}, {"k": "App-Steuerung", "t": "Antrieb mit App- bzw. Smart-Home-Steuerung und Endlagenmeldung.", "mat": 180, "h": 0.5}]
GEL_OB = [{"k": "verzinkt", "t": "Oberfläche feuerverzinkt.", "fm": 0.85}, {"k": "verzinkt + beschichtet", "t": "Feuerverzinkt und pulverbeschichtet (Duplex) RAL nach Wahl."},
          {"k": "Sonderfarbe", "t": "Duplexbeschichtung in Sonderfarbe bzw. DB-Farbton.", "fm": 1.06}]
GEL_FU = [{"k": "Stäbe", "t": "Füllung senkrechte Stäbe."}, {"k": "Lochblech", "t": "Füllung Lochblech 3 mm, gekantet.", "mat": 40},
          {"k": "Glas VSG", "t": "Füllung VSG 2 × 6 mm in Glashaltern.", "mat": 120, "h": 0.4}]
BEF = [{"k": "seitlich", "t": "Pfosten seitlich an Wange bzw. Stirnseite befestigt."}, {"k": "aufgesetzt", "t": "Pfosten von oben auf Stufen bzw. Platte gedübelt.", "fh": 0.9}]
LAUF = [{"k": "gerade", "t": "Treppenlauf gerade."}, {"k": "gewendelt", "t": "Treppenlauf gewendelt bzw. mit Podestkrümmlingen.", "fh": 1.35, "fm": 1.15, "gen": "C"}]
ES_OB = [{"k": "V2A", "t": "Werkstoff 1.4301 (V2A), geschliffen K240."}, {"k": "V4A", "t": "Werkstoff 1.4404/1.4571 (V4A), z. B. für Außen- und Chloridbelastung.", "fm": 1.3}]
HOEHE = [{"k": "1,00 m", "t": "Geländerhöhe 1,00 m."}, {"k": "1,10 m", "t": "Geländerhöhe 1,10 m (Absturzhöhe über 12 m).", "fm": 1.06}]
BEF_B = [{"k": "stirnseitig", "t": "Pfosten stirnseitig an der Balkonplatte befestigt."}, {"k": "aufgesetzt", "t": "Pfosten von oben auf die Balkonplatte gedübelt.", "fh": 0.9}]
GEL_AL = [{"k": "eloxiert", "t": "Oberfläche eloxiert E6/EV1.", "fm": 0.88}, {"k": "pulverbeschichtet", "t": "Oberfläche pulverbeschichtet RAL nach Wahl."},
          {"k": "Sonderfarbe", "t": "Pulverbeschichtung in Sonderfarbe bzw. DB-Farbton.", "fm": 1.06}]
GLAS_BP = [{"k": "Profil Alu natur", "t": "Bodenprofil Aluminium natur, Glaskante mit Kantenschutzprofil.", "fm": 0.86}, {"k": "Profil Edelstahloptik", "t": "Bodenprofil mit Abdeckung in Edelstahloptik.", "mat": 45}]
HL_F = [{"k": "gerade", "t": "Handlauf gerade."}, {"k": "gebogen", "t": "Handlauf gebogen bzw. mit Krümmlingen an Podesten.", "fh": 1.5, "fm": 1.2}]
HL_LED = [{}, {"k": "mit LED", "t": "Mit integriertem LED-Lichtband im Handlauf, Treiber; Anschluss bauseits.", "mat": 85, "h": 0.3}]
FB_FU = [{"k": "Glas VSG", "t": "Füllung VSG klar bzw. satiniert."}, {"k": "Edelstahlstäbe", "t": "Füllung Edelstahlstäbe bzw. Relinge.", "fm": 0.85}]
FB_BEF = [{"k": "Leibung", "t": "Befestigung in der Fensterleibung."}, {"k": "am Rahmen", "t": "Befestigung am Fensterrahmen mit geprüften Haltern.", "fh": 0.9},
          {"k": "vor WDVS", "t": "Befestigung vor der Fassade mit thermisch getrennten Konsolen durch das WDVS.", "mat": 90, "h": 0.8}]
STUFE = [{"k": "Gitterroststufen", "t": "Stufen aus Gitterrost R11 mit Antrittkante."}, {"k": "Riffelblechstufen", "t": "Stufen aus Tränenblech.", "fm": 1.05},
         {"k": "Lochblechstufen", "t": "Stufen aus Lochblech gekantet.", "fm": 1.08}, {"k": "Betonwerksteinstufen", "t": "Stufen aus Betonwerkstein in Stahlschalen.", "fm": 1.25, "fh": 1.15}]
GEL2 = [{"k": "Geländer einseitig", "t": "Geländer einseitig."}, {"k": "Geländer beidseitig", "t": "Geländer beidseitig.", "mat": 900, "h": 6}]
OB2 = [{"k": "verzinkt", "t": "Oberfläche feuerverzinkt."}, {"k": "Duplex", "t": "Feuerverzinkt und pulverbeschichtet.", "fm": 1.12}]
LEI_M = [{"ersetze": [[r" aus Stahl verzinkt bzw\. Aluminium", ""]], "k": "Stahl verzinkt", "t": "Werkstoff Stahl feuerverzinkt."}, {"k": "Aluminium", "t": "Werkstoff Aluminium.", "fm": 1.1}, {"k": "Edelstahl", "t": "Werkstoff Edelstahl.", "fm": 1.6}]
LEI_S = [{"ersetze": [[r" mit Rückenschutz ab 3 m", ""]], "k": "Rückenschutz", "t": "Mit Rückenschutz ab 3 m Höhe."}, {"k": "Steigschutzschiene", "t": "Mit Steigschutzschiene und Läufer statt Rückenschutz.", "mat": 380}]
GR_MW = [{"k": "MW 30/10", "t": "Maschenweite 30/10 mm."}, {"k": "MW 30/30", "t": "Maschenweite 30/30 mm.", "fm": 0.9}, {"k": "MW 20/10 (fußgängerfreundlich)", "t": "Maschenweite 20/10 mm.", "fm": 1.15}]
GR_M = [{"k": "verzinkt", "t": "Feuerverzinkt."}, {"k": "Edelstahl", "t": "Edelstahl V2A.", "fm": 2.5, "gen": "C"}]
LS_R = [{}, {"k": "befahrbar Pkw", "t": "Mit Pkw-befahrbarem Rost und verstärktem Schacht.", "mat": 180}, {"k": "Abhebesicherung RC", "t": "Mit einbruchhemmender Abhebesicherung.", "mat": 45}]
VD_GR = [{"k": "Standard", "t": "Abmessungen wie beschrieben."}, {"k": "kleiner", "t": "Abmessungen ca. 25 % kleiner.", "fm": 0.8, "fh": 0.85},
         {"k": "größer", "t": "Abmessungen ca. 25 % größer.", "fm": 1.25, "fh": 1.15}]
VD_E = [{}, {"k": "mit Rinne/Fallrohr", "t": "Mit Rinne und Fallrohr zur Grundleitung.", "mat": 180, "h": 1.5}]
BK_M = [{"k": "Stahl beschichtet", "t": "Stahl pulverbeschichtet RAL nach Wahl."}, {"k": "Edelstahl", "t": "Edelstahl gebürstet.", "fm": 1.3}]
BK_S = [{"k": "Audio", "t": "Sprechstelle Audio vorgerichtet."}, {"k": "Video", "t": "Sprechstelle Video mit Kamera vorgerichtet.", "mat": 650}]
BK_A = [{"k": "Wand", "t": "Wandmontage bzw. Unterputz."}, {"k": "freistehend", "t": "Freistehend auf Ständern mit Fundament.", "mat": 250, "h": 1.5}]
KL_M = [{"k": "verzinkt", "t": "Feuerverzinkt."}, {"k": "Duplex", "t": "Feuerverzinkt und beschichtet.", "mat": 0.9}, {"k": "Edelstahl", "t": "Edelstahl V2A.", "fm": 2.8, "fh": 1.2}]

_A = [("Stahl-Umfassungszarge", [ZWAND, ZBS, OB_Z, ORT]), ("Stahl-Eckzarge", [ZBS, OB_Z, ORT]),
      ("Mehrzwecktür Stahl", [OB_T, ZARGE_T, LA_M, LUEFT, ORT]),
      ("Feuerschutztür Stahl", [OB_T[:2], LA_T, ZARGE_T, PANIK, FSA, ORT]),
      ("Rauchschutztür Stahl", [GR_T, OB_T[:2], LA_T, PANIK, FSA, ORT]),
      ("Rohrrahmentür", [RR_MAT, OB_T[:2], PANIK, FSA, ORT]),
      ("Garagen-Sektionaltor", [TOR_OB, TOR_S, TOR_A, ORT]),
      ("Treppengeländer Stahl", [GEL_OB, GEL_FU, BEF, LAUF, ORT]),
      ("Treppengeländer Edelstahl", [ES_OB, BEF, LAUF, ORT]),
      ("Balkongeländer", [BEF_B, HOEHE, GEL_OB, ORT]),
      ("Französischer Balkon", [FB_FU, FB_BEF, ORT]),
      ("Wandhandlauf", [HL_F, HL_LED, ORT]),
      ("Geländer Bestand", [GEL_OB]),
      ("Stahltreppe gerade", [STUFE, GEL2, OB2]), ("Spindeltreppe", [STUFE[:3], OB2]),
      ("Steigleiter", [LEI_M, LEI_S]), ("Gitterrost", [GR_MW, GR_M]),
      ("Kellerlichtschacht", [LS_R, ORT]), ("Fußabstreifer", [ORT]), ("Abdeckung / Schachtdeckel", [GR_M]),
      ("Vordach", [VD_GR, VD_E]), ("Briefkastenanlage", [BK_M, BK_S, BK_A]),
      ("Schlosserarbeiten", [KL_M]), ("Mülltonnenbox", [BK_M])]
for _g in LBS[0]["gruppen"]:
    for _p in _g["positionen"]:
        for _pre, _ax in _A:
            if _p["kurz"].startswith(_pre):
                _p["achsen"] = _ax
                break

# Balkongeländer: Aluminium nicht feuerverzinkt; Ganzglas im Bodenprofil ohne Pfosten
for _g in LBS[0]["gruppen"]:
    for _p in _g["positionen"]:
        if _p["kurz"].startswith("Balkongeländer"):
            for _v in _p.get("varianten") or []:
                if _v["art"].startswith("Aluminium"):
                    _v["achsen"] = [BEF_B, HOEHE, GEL_AL, ORT]
                elif _v["art"].startswith("Ganzglas"):
                    _v["achsen"] = [HOEHE, GLAS_BP, ORT]

_GR = {g["name"]: g for g in LBS[0]["gruppen"]}
_GR["Zargen, Stahltüren"]["positionen"] += [
    {"kurz": "Stahlzarge / Stahltür ausbauen und entsorgen, {art}",
     "lang": "Vorhandene {art} ausbauen, Zarge herausstemmen, Leibungen beiputzfertig herstellen, Schrott verwerten.",
     "einheit": "St", "kg": "394", "gen": "B", "tags": ["altbau"], "lohn": "abbruch",
     "varianten": [{"art": "Stahlzarge ohne Türblatt", "h": 1.8, "mat": 0, "geraet": 10}, {"art": "Stahltür einflügelig mit Zarge", "h": 2.8, "mat": 0, "geraet": 15},
                   {"art": "Stahltür zweiflügelig mit Zarge", "h": 4.5, "mat": 0, "geraet": 25}]},
    {"kurz": "Feuerschutztür prüfen und warten (jährlich), {f}",
     "lang": "Wartung von Feuer- und Rauchschutzabschlüssen nach DIN 4102/DIN EN 16034 bzw. Herstellervorgabe: Schließfunktion, "
             "Schließfolgeregelung, Dichtungen, Kennzeichnung prüfen, einstellen, Prüfbuch führen. {f}.",
     "einheit": "St", "kg": "344", "gen": "A", "tags": ["altbau"],
     "varianten": [{"f": "einflügelig", "h": 0.8, "mat": 5}, {"f": "zweiflügelig", "h": 1.2, "mat": 8}, {"f": "mit Feststellanlage", "h": 1.5, "mat": 10}]},
    {"kurz": "Stahltür {f} nachrüsten",
     "lang": "Vorhandene Stahltür ertüchtigen: {f}, Funktion prüfen und einstellen; Zulassungsfragen (Feuerschutz) mit dem Hersteller klären.",
     "einheit": "St", "kg": "344", "gen": "B", "tags": ["altbau"],
     "varianten": [{"f": "Obentürschließer", "h": 1.2, "mat": 170}, {"f": "Panikschloss mit Drücker EN 179", "h": 1.5, "mat": 260},
                   {"f": "Dichtung umlaufend und Bodendichtung", "h": 1.0, "mat": 85}]},
    {"kurz": "Industrie-Rolltor / Schnelllauftor, {gr}",
     "lang": "Rolltor aus Aluminium- bzw. Stahlprofilen mit Elektroantrieb, Führungsschienen, Lichtgitter bzw. Schließkantensicherung, "
             "Notbetätigung, Torgröße {gr}, einschließlich Inbetriebnahme.",
     "einheit": "St", "kg": "334", "gen": "C", "achsen": [TOR_OB[::2], TOR_A],
     "varianten": [{"gr": "3,0 × 3,0 m", "h": 16, "mat": 4800}, {"gr": "4,0 × 4,0 m", "h": 20, "mat": 6800}, {"gr": "Tiefgaragentor 5,0 × 2,3 m", "h": 18, "mat": 5900}]},
    {"kurz": "Kellertrennwand / Kellerverschlag Stahlgitter, Höhe {hh} m",
     "lang": "Kellertrennwandsystem aus verzinkten Stahlpaneelen (Streckmetall bzw. Lochblech) mit Türen und Vorhängeschlossüberfalle, "
             "Höhe {hh} m. Abrechnung nach Wandfläche, Türen eingerechnet.",
     "einheit": "m²", "kg": "346", "gen": "B", "varianten": [{"hh": "2,00", "h": 0.8, "mat": 62}, {"hh": "raumhoch", "h": 0.9, "mat": 70}]},
]
_GR["Geländer, Handläufe"]["positionen"] += [
    {"kurz": "Absturzsicherung Flachdach / Attikageländer, {art}",
     "lang": "Absturzsicherung für Wartungswege auf Flachdächern als {art}, Höhe 1,10 m, verzinkt, ohne Durchdringung der "
             "Abdichtung bzw. mit Abdichtungsanschluss nach Herstellerangabe. Abrechnung nach Länge.",
     "einheit": "m", "kg": "369", "gen": "B",
     "varianten": [{"art": "freistehendes Geländer mit Ballastgewichten", "h": 0.8, "mat": 145}, {"art": "Klappgeländer an Attika befestigt", "h": 1.0, "mat": 175}]},
    {"kurz": "Fenstergitter / Sicherheitsgitter Stahl verzinkt, bis 1,5 m²",
     "lang": "Fenstergitter aus Vierkant- bzw. Rundstahl, feuerverzinkt, in der Leibung mit Einbohrdollen bzw. Sicherheitsschrauben "
             "befestigt, Gitterabstand ≤ 12 cm, bis 1,5 m².", "einheit": "St", "kg": "339", "h": 2.0, "mat": 230, "gen": "B", "achsen": [GEL_OB[1:], ORT]},
    {"kurz": "Geländer Bestand strahlen und neu beschichten",
     "lang": "Vorhandenes Stahlgeländer: Korrosion und Altbeschichtung durch Strahlen bzw. Schleifen entfernen (Untergrund St 2), "
             "Zinkstaubgrundierung und zweifache Deckbeschichtung. Abrechnung nach Länge.", "einheit": "m", "kg": "359",
     "h": 1.5, "mat": 18, "geraet": 12, "gen": "C", "tags": ["altbau"], "lohn": "maler"},
    {"kurz": "Kinderschutz: Geländer schließen mit Füllung, Bestand",
     "lang": "Vorhandenes Geländer mit zu großen Öffnungen durch zusätzliche Füllung (Lochblech, Glas oder Stäbe) nachträglich "
             "schließen, Öffnungen ≤ 12 cm. Abrechnung nach Länge.", "einheit": "m", "kg": "359", "h": 1.5, "mat": 85, "gen": "B",
     "tags": ["altbau"], "achsen": [GEL_FU[1:]]},
]
_GR["Treppen, Roste, Schächte"]["positionen"] += [
    {"kurz": "Außentreppe / Fluchttreppe Stahl, {n} Geschosse",
     "lang": "Außenliegende Flucht- bzw. Erschließungstreppe aus Stahl mit Podesten und Geländer, Stufen nach Ausführung, "
             "an Fassade bzw. auf Fundamenten (Fundamente gesondert), Statik und Werkplanung AN, {n} Geschosse.",
     "einheit": "St", "kg": "351", "gen": "C", "achsen": [STUFE[:3], OB2],
     "varianten": [{"n": "2", "h": 70, "mat": 15500}, {"n": "3", "h": 100, "mat": 23000}, {"n": "4", "h": 130, "mat": 30500}]},
    {"kurz": "Balkonanlage Stahl vorgestellt, {gr}",
     "lang": "Vorgestellter Balkon als Stahlkonstruktion mit Stützen, Trägern, Bodenplatte bzw. Gitterrost/Belag und Geländer, "
             "thermisch getrennter Wandanschluss, Fundamente gesondert, Statik AN, Größe {gr}.",
     "einheit": "St", "kg": "339", "gen": "C", "achsen": [OB2, GEL_FU, ORT],
     "varianten": [{"gr": "2,0 × 1,5 m", "h": 30, "mat": 5200}, {"gr": "3,5 × 1,8 m", "h": 42, "mat": 8200}]},
    {"kurz": "Wartungssteg / Laufsteg Gitterrost mit Geländer",
     "lang": "Wartungssteg aus Stahlkonstruktion mit Gitterrostbelag, beidseitigem Geländer mit Knie- und Fußleiste, Breite 0,8 m, "
             "auf Konsolen bzw. Stützen. Abrechnung nach Länge.", "einheit": "m", "kg": "359", "h": 5.0, "mat": 520, "gen": "C", "achsen": [OB2]},
]
_GR["Vordächer, Briefkästen, Kleinstahl"]["positionen"] += [
    {"kurz": "Fahrradüberdachung / Carport Stahl, {n}",
     "lang": "Überdachung aus Stahlstützen und Trägern mit Dacheindeckung aus Trapezblech bzw. Stegplatten, Entwässerung, "
             "Fundamente gesondert, {n}.", "einheit": "St", "kg": "551", "gen": "C", "achsen": [OB2],
     "varianten": [{"n": "Fahrräder, Länge 5 m", "h": 16, "mat": 3800}, {"n": "Carport für 1 Pkw", "h": 18, "mat": 4300}, {"n": "Carport für 2 Pkw", "h": 26, "mat": 6800}]},
    {"kurz": "Rammschutz / Anfahrschutz Stahlrohr, {art}",
     "lang": "Anfahrschutz aus Stahlrohr Ø 100 mm bzw. Bügel, gelb-schwarz beschichtet, mit Fußplatten aufgedübelt bzw. einbetoniert, {art}.",
     "einheit": "St", "kg": "339", "gen": "A",
     "varianten": [{"art": "Bügel 1,0 m", "h": 1.2, "mat": 180}, {"art": "Eckschutz", "h": 0.8, "mat": 110}, {"art": "Poller herausnehmbar", "h": 1.5, "mat": 320}]},
    {"kurz": "Unterkonstruktion Stahl für Lüftungsgeräte / Technik",
     "lang": "Tragrahmen bzw. Podest aus Stahlprofilen für technische Geräte auf Dach oder Boden, schwingungsentkoppelt, "
             "mit Abdichtungsanschluss der Stützenfüße. Abrechnung nach Gewicht.", "einheit": "kg", "kg": "369", "h": 0.07, "mat": 3.6,
     "gen": "B", "achsen": [KL_M[:2]]},
]
