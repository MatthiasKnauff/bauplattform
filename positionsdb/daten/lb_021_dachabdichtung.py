# LB 021 Dachabdichtungsarbeiten (Flachdach, DIN 18531) – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "021", "name": "Dachabdichtungsarbeiten", "atv": "DIN 18338", "lohn": "dach",
    "gruppen": [
        {"name": "Voranstrich, Dampfsperre", "positionen": [
            {"kurz": "Voranstrich Bitumen auf Beton-/Holzuntergrund",
             "lang": "Untergrund reinigen und Bitumen-Voranstrich vollflächig im Streich- bzw. Sprühverfahren auftragen, "
                     "Verbrauch nach Herstellerangabe.",
             "einheit": "m²", "kg": "363", "h": 0.03, "mat": 1.1, "gen": "A"},
            {"kurz": "Dampfsperre {m}",
             "lang": "Dampfsperre aus {m}, an aufgehenden Bauteilen bis Oberkante Dämmung hochgeführt und angeschlossen, "
                     "Nähte dicht. Abrechnung nach Dachfläche.",
             "einheit": "m²", "kg": "363", "gen": "A",
             "varianten": [{"m": "Elastomerbitumenbahn Alu-Einlage, verschweißt", "h": 0.12, "mat": 8.5},
                           {"m": "Kaltselbstklebebahn mit Alu-Einlage", "h": 0.08, "mat": 9.5},
                           {"m": "PE-Folie 0,4 mm, Nähte verklebt", "h": 0.06, "mat": 2.2}]},
        ]},
        {"name": "Wärmedämmung", "positionen": [
            {"kurz": "Flachdachdämmung {m}, {d} mm",
             "lang": "Wärmedämmung für nicht genutzte Flachdächer aus {m}, Dicke {d} mm, Anwendungstyp DAA, Druckfestigkeit "
                     "nach Herstellerangabe, im Verband verlegt und verklebt bzw. mechanisch befestigt. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "363", "gen": "A",
             "varianten": [{"m": "EPS 035 DAA dh", "d": "160", "h": 0.10, "mat": 14}, {"m": "EPS 035 DAA dh", "d": "200", "h": 0.10, "mat": 17.5},
                           {"m": "EPS 035 DAA dh", "d": "240", "h": 0.12, "mat": 21},
                           {"m": "PIR alukaschiert, WLS 023", "d": "120", "h": 0.10, "mat": 26},
                           {"m": "PIR alukaschiert, WLS 023", "d": "160", "h": 0.10, "mat": 34},
                           {"m": "PIR alukaschiert, WLS 023", "d": "200", "h": 0.12, "mat": 42},
                           {"m": "Mineralwolle A1, WLS 038", "d": "160", "h": 0.12, "mat": 30},
                           {"m": "Mineralwolle A1, WLS 038", "d": "200", "h": 0.14, "mat": 37}]},
            {"kurz": "Gefälledämmung {m}, i. M. {d} mm",
             "lang": "Gefälledämmsystem aus {m} nach Verlegeplan des Herstellers, Gefälle mindestens 2 %, "
                     "mittlere Dicke {d} mm, einschließlich Kehl- und Gratkeile. Verlegeplan wird mitgeliefert. "
                     "Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "363", "gen": "B",
             "varianten": [{"m": "EPS 035 DAA", "d": "160", "h": 0.16, "mat": 21}, {"m": "EPS 035 DAA", "d": "220", "h": 0.18, "mat": 28},
                           {"m": "PIR, WLS 026", "d": "160", "h": 0.16, "mat": 40}, {"m": "PIR, WLS 026", "d": "200", "h": 0.18, "mat": 50},
                           {"m": "Mineralwolle A1", "d": "180", "h": 0.20, "mat": 45}]},
            {"kurz": "Mechanische Befestigung Dachaufbau nach Windsogberechnung",
             "lang": "Mechanische Befestigung von Dämmung und Abdichtung mit Tellerdübeln bzw. Schrauben und "
                     "Lastverteilungstellern, Anzahl und Anordnung nach Windsogberechnung (wird mitgeliefert).",
             "einheit": "m²", "kg": "363", "h": 0.05, "mat": 2.8, "gen": "B"},
        ]},
        {"name": "Abdichtung Fläche", "positionen": [
            {"kurz": "Bitumenabdichtung 2-lagig, {o}",
             "lang": "Dachabdichtung zweilagig: untere Lage Polymerbitumen-Schweißbahn bzw. Kaltselbstklebebahn, "
                     "obere Lage Polymerbitumen-Schweißbahn {o}, beschiefert, Nähte versetzt, vollflächig verschweißt. "
                     "Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "363", "gen": "A",
             "varianten": [{"o": "PYE PV 200 S5", "h": 0.32, "mat": 18}, {"o": "PYE PV 250 S5, wurzelfest", "h": 0.34, "mat": 23}]},
            {"kurz": "Kunststoffdachbahn {m} {d} mm, mech. befestigt",
             "lang": "Einlagige Dachabdichtung mit Kunststoffdachbahn aus {m}, Dicke {d} mm, mit Vlieskaschierung bzw. "
                     "Schutzvlies, im Nahtbereich mechanisch befestigt, Nähte mit Heißluft verschweißt und geprüft. "
                     "Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "363", "gen": "A",
             "varianten": [{"m": "FPO/TPO", "d": "1,8", "h": 0.18, "mat": 17}, {"m": "PVC-P", "d": "1,5", "h": 0.18, "mat": 14},
                           {"m": "PVC-P", "d": "2,0", "h": 0.20, "mat": 18}]},
            {"kurz": "EPDM-Dachbahn 1,5 mm, verklebt",
             "lang": "Dachabdichtung mit EPDM-Elastomerbahn 1,5 mm, großflächig konfektioniert, vollflächig verklebt bzw. "
                     "lose mit Auflast, Nähte mit Systemnahtband. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "363", "h": 0.20, "mat": 19, "gen": "B"},
            {"kurz": "Flüssigabdichtung Flachdach PMMA/PU, vlieseingelegt",
             "lang": "Flächenabdichtung mit Flüssigkunststoff (PMMA bzw. PU) mit Vlieseinlage, auf grundiertem Untergrund, "
                     "Gesamtschichtdicke nach Zulassung, mit Deckversiegelung. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "363", "h": 0.45, "mat": 42, "gen": "B"},
            {"kurz": "Trenn-/Schutzlage Kunststoffvlies {g} g/m²",
             "lang": "Trenn- bzw. Schutzlage aus Polyestervlies, flächenbezogene Masse {g} g/m², mit 10 cm Überlappung lose verlegt.",
             "einheit": "m²", "kg": "363", "gen": "A",
             "varianten": [{"g": "300", "h": 0.03, "mat": 1.5}, {"g": "500", "h": 0.04, "mat": 2.4}]},
        ]},
        {"name": "Anschlüsse, Ränder", "positionen": [
            {"kurz": "Attika-/Wandanschluss, Höhe bis {hh} cm, {m}",
             "lang": "An- und Abschluss der Dachabdichtung an Attika bzw. aufgehendes Bauteil, {m}, Anschlusshöhe "
                     "mindestens 15 cm über Oberfläche Belag/Kies, Höhe bis {hh} cm, mit Dämmkeil, oben mit Klemmprofil "
                     "befestigt bzw. über Attika geführt. Abrechnung nach Länge.",
             "einheit": "m", "kg": "363", "gen": "B",
             "varianten": [{"m": "Bitumen zweilagig", "hh": "30", "h": 0.45, "mat": 14}, {"m": "Bitumen zweilagig", "hh": "50", "h": 0.60, "mat": 20},
                           {"m": "Kunststoffbahn", "hh": "30", "h": 0.40, "mat": 14}, {"m": "Kunststoffbahn", "hh": "50", "h": 0.50, "mat": 19}]},
            {"kurz": "Dachrandabschluss mit Dachrandprofil Aluminium, Ansichtshöhe {hh} mm",
             "lang": "Dachrandabschluss aus stranggepresstem Aluminium-Dachrandprofil, Ansichtshöhe {hh} mm, natur bzw. "
                     "beschichtet, mit Stoßverbindern und Eckformteilen, Abdichtung eingeklemmt.",
             "einheit": "m", "kg": "363", "gen": "B",
             "varianten": [{"hh": "100", "h": 0.35, "mat": 32}, {"hh": "200", "h": 0.40, "mat": 52}]},
            {"kurz": "Lichtkuppel {g} cm, {a}, mit Aufsetzkranz",
             "lang": "Lichtkuppel aus Acrylglas bzw. PC, doppelschalig, Größe {g} cm, mit gedämmtem Aufsetzkranz "
                     "30 cm, {a}, einbauen und an Abdichtung anschließen.",
             "einheit": "St", "kg": "362", "gen": "C",
             "varianten": [{"g": "100 × 100", "a": "starr", "h": 3.5, "mat": 780}, {"g": "100 × 100", "a": "mit Elektro-Lüftungsantrieb", "h": 4.5, "mat": 1350},
                           {"g": "120 × 120", "a": "als RWA-Gerät", "h": 5.0, "mat": 2100}]},
            {"kurz": "Durchdringung einfassen (Rohr, Stütze), Ø bis {d} mm",
             "lang": "Durchdringung der Dachabdichtung mit vorgefertigter Manschette bzw. Formteil einfassen, an "
                     "Abdichtung angeschlossen und oben mit Schlauchschelle gesichert. Ø bis {d} mm.",
             "einheit": "St", "kg": "363", "gen": "A",
             "varianten": [{"d": "110", "h": 0.8, "mat": 30}, {"d": "250", "h": 1.2, "mat": 55}]},
            {"kurz": "Bewegungsfuge im Flachdach, Fugenschlaufe mit Stützwulst",
             "lang": "Bewegungsfuge der Dachabdichtung mit Schlaufe und Stützwulst aus Elastomerbahn ausbilden, "
                     "beidseitig in die Flächenabdichtung eingebunden.",
             "einheit": "m", "kg": "363", "h": 0.60, "mat": 28, "gen": "B"},
        ]},
        {"name": "Entwässerung", "positionen": [
            {"kurz": "Dachgully DN {dn}, {a}, gedämmt, mit Aufstockelement",
             "lang": "Flachdachablauf DN {dn}, {a}, wärmegedämmt, mit Anschlussflansch für die Abdichtung, Aufstockelement "
                     "und Kiesfang, einbauen und an Dampfsperre und Abdichtung anschließen; Anschlussleitung gesondert.",
             "einheit": "St", "kg": "363", "gen": "B",
             "varianten": [{"dn": "70", "a": "senkrecht", "h": 2.0, "mat": 210}, {"dn": "100", "a": "senkrecht", "h": 2.2, "mat": 250},
                           {"dn": "100", "a": "waagerecht", "h": 2.2, "mat": 230}]},
            {"kurz": "Notüberlauf Attika, Speier Edelstahl/Alu, {b} mm",
             "lang": "Notüberlauf durch die Attika als rechteckiger Speier aus Edelstahl bzw. Aluminium, Querschnitt "
                     "{b} mm, mit Klebeflansch, an Abdichtung angeschlossen, nach Entwässerungsberechnung.",
             "einheit": "St", "kg": "363", "gen": "B",
             "varianten": [{"b": "100 × 50", "h": 1.8, "mat": 120}, {"b": "200 × 100", "h": 2.2, "mat": 175}]},
            {"kurz": "Druckströmungsentwässerung, Dachablauf, Systemelement",
             "lang": "Dachablauf für Druckströmungsentwässerung (Unterdrucksystem) mit Strömungsberuhiger, "
                     "wärmegedämmt, nach hydraulischer Berechnung des Systemherstellers; Rohrsystem gesondert.",
             "einheit": "St", "kg": "411", "h": 2.5, "mat": 380, "gen": "C"},
        ]},
        {"name": "Oberflächen, Begrünung, Sicherheit", "positionen": [
            {"kurz": "Kiesschüttung 16/32, d = {d} cm, mit Schutzlage",
             "lang": "Auflast und Oberflächenschutz aus gewaschenem Rundkies 16/32 mm, Dicke {d} cm, auf Schutzvlies, "
                     "eben verteilt; Randstreifen und Abläufe mit Kiesleiste frei gehalten.",
             "einheit": "m²", "kg": "363", "gen": "A",
             "varianten": [{"d": "5", "h": 0.08, "mat": 5.5, "geraet": 1.5}, {"d": "8", "h": 0.10, "mat": 8.5, "geraet": 2}]},
            {"kurz": "Extensive Dachbegrünung, Systemaufbau ca. {d} cm",
             "lang": "Extensive Dachbegrünung als Systemaufbau nach FLL-Dachbegrünungsrichtlinie: Schutz- und Speichervlies, "
                     "Drän- und Wasserspeicherelement, Filtervlies, Extensivsubstrat und Sedum-Sprossen bzw. -Matten, "
                     "Gesamtdicke ca. {d} cm, einschließlich Kiesstreifen an Rändern, Kontrollschächten und Fertigstellungspflege.",
             "einheit": "m²", "kg": "363", "gen": "B",
             "varianten": [{"d": "8", "h": 0.35, "mat": 26, "geraet": 3}, {"d": "12", "h": 0.40, "mat": 34, "geraet": 4}]},
            {"kurz": "Kontrollschacht für Dachablauf, begrünt/bekiest",
             "lang": "Kontrollschacht aus Edelstahl bzw. Kunststoff mit Deckel über Dachablauf, höhenanpassbar.",
             "einheit": "St", "kg": "363", "h": 0.3, "mat": 75, "gen": "A"},
            {"kurz": "Betonplatten auf Stelzlagern, Terrassenbelag",
             "lang": "Begehbarer Belag auf genutzten Dachflächen aus Betonplatten 50 × 50 × 4 cm, auf höhenverstellbaren "
                     "Stelzlagern über Schutzlage verlegt, Fugen 3 mm.",
             "einheit": "m²", "kg": "363", "h": 0.45, "mat": 38, "gen": "B", "lohn": "aussen"},
            {"kurz": "Einzelanschlagpunkt Flachdach DIN EN 795, {a}",
             "lang": "Anschlageinrichtung zur Absturzsicherung als Einzelanschlagpunkt Typ A, {a}, einschließlich "
                     "Einbindung in die Abdichtung, Kennzeichnung, Dokumentation und Abnahmeprüfung.",
             "einheit": "St", "kg": "363", "gen": "B",
             "varianten": [{"a": "auf Stahlbetondecke verankert", "h": 2.0, "mat": 320}, {"a": "auflastgehalten", "h": 1.5, "mat": 650}]},
            {"kurz": "Seilsicherungssystem Flachdach, Edelstahlseil, inkl. Stützen",
             "lang": "Horizontales Seilsicherungssystem nach DIN EN 795 Typ C aus Edelstahlseil mit End-, Zwischen- und "
                     "Eckstützen auf der Tragkonstruktion, einschließlich Läufer, Abdichtung der Stützen und Abnahmeprüfung. "
                     "Abrechnung nach Seillänge.",
             "einheit": "m", "kg": "363", "h": 0.6, "mat": 68, "gen": "C"},
        ]},
        {"name": "Bestand, Sanierung", "positionen": [
            {"kurz": "Altdachaufbau Bitumen/Kies abtragen und entsorgen, bis {d} cm",
             "lang": "Vorhandenen Flachdachaufbau (Kies, Abdichtung, Dämmung bis {d} cm) abtragen, sortenrein trennen, "
                     "verladen und entsorgen einschließlich Gebühren; teerhaltige Bahnen gesondert.",
             "einheit": "m²", "kg": "394", "gen": "B", "tags": ["altbau"],
             "varianten": [{"d": "12", "h": 0.35, "geraet": 12}, {"d": "25", "h": 0.45, "geraet": 18}]},
            {"kurz": "Altabdichtung als Dampfsperre belassen, prüfen, Blasen öffnen",
             "lang": "Bestehende Bitumenabdichtung als Dampfsperre für den neuen Aufbau vorbereiten: Blasen und Falten "
                     "aufschneiden und verkleben, Fehlstellen ausbessern, reinigen.",
             "einheit": "m²", "kg": "363", "h": 0.10, "mat": 1.5, "gen": "C", "tags": ["altbau"]},
            {"kurz": "Leckortung Flachdach (Rauchgas/Impulsverfahren), je Einsatz",
             "lang": "Leckortung auf der Flachdachfläche mittels Impulsstrom- bzw. Rauchgasverfahren durch Fachfirma, "
                     "Markierung der Fehlstellen und Kurzbericht. Dachfläche bis 300 m².",
             "einheit": "psch", "kg": "363", "h": 4.0, "geraet": 380, "gen": "C", "tags": ["altbau"]},
        ]},
    ],
}]


# ---------------------------------------------------------------- Runde 2: Ergänzungen und Ausführungsachsen
def _neu(gruppe, positionen):
    for g in LBS[0]["gruppen"]:
        if g["name"] == gruppe:
            g["positionen"].extend(positionen)
            return
    LBS[0]["gruppen"].append({"name": gruppe, "positionen": positionen})


GROESSE = [{"k": ">200m²", "t": "Zusammenhängende Dachfläche über 200 m²."},
           {"k": "50–200m²", "t": "Dachfläche 50 bis 200 m².", "fh": 1.12, "fm": 1.03},
           {"k": "<50m²", "t": "Dachfläche unter 50 m² bzw. Teilflächen (Garage, Gaube, Vordach).", "fh": 1.35, "fm": 1.08, "gen": "B"}]
HOEHE = [{}, {"k": "H≤20m", "t": "Dachhöhe über 7 m bis 20 m, Materialtransport mit Aufzug bzw. Kran.", "fh": 1.05, "geraet": 0.8},
         {"k": "H>20m", "t": "Dachhöhe über 20 m, Krantransport, erhöhte Windsoglasten.", "fh": 1.10, "fm": 1.04, "geraet": 1.5}]
ORT = [{}, {"k": "Bestand", "t": "Sanierung auf genutztem Gebäude, abschnittsweise Ausführung mit täglichem Notverschluss.",
            "fh": 1.18, "gen": "B", "tags": ["altbau"]}]
NEIG = [{"k": "≤5°", "t": "Dachneigung bis 5°."}, {"k": "5–20°", "t": "Dachneigung über 5° bis 20°, Schubsicherung der Lagen.", "fh": 1.10, "fm": 1.03}]
QUAL = [{"k": "K1", "t": "Bahnenqualität nach Anwendungskategorie K1 der DIN 18531."},
        {"k": "K2", "t": "Erhöhte Anforderungen Anwendungskategorie K2: höherwertige Bahnen und zusätzliche Lagen bzw. Dicke.", "fm": 1.22, "fh": 1.05}]
BRANDD = [{}, {"k": "A1-Aufbau", "t": "Nichtbrennbarer Dachaufbau (Dämmung A1, Brandriegel), Harte Bedachung.", "fm": 1.08}]

_neu("Voranstrich, Dampfsperre", [
    {"kurz": "Notabdichtung / Behelfsabdichtung Bitumenbahn, lose",
     "lang": "Behelfsabdichtung als Bauzeitabdichtung bzw. Notdach aus einer Lage Bitumenbahn, punktweise verklebt.",
     "einheit": "m²", "kg": "363", "h": 0.08, "mat": 5, "gen": "A"},
    {"kurz": "Dampfdruckausgleichsschicht, Lochglasvlies-Bitumenbahn",
     "lang": "Dampfdruckausgleichsschicht aus Lochglasvlies-Bitumenbahn, lose verlegt, unter vollflächig verschweißter Lage.",
     "einheit": "m²", "kg": "363", "h": 0.06, "mat": 3.2, "gen": "A"},
    {"kurz": "Holzschalung / Trapezblech: Zulage Dampfsperre an Sicken",
     "lang": "Zulage für Dampfsperre auf Trapezblech mit Sickenfüllern bzw. Auflagerplatten zur Überbrückung der Sicken.",
     "einheit": "m²", "kg": "363", "h": 0.04, "mat": 2.2, "gen": "A"},
])
_neu("Wärmedämmung", [
    {"kurz": "Flachdachdämmung XPS (Umkehrdach), d = {d} mm",
     "lang": "Umkehrdachdämmung aus XPS mit Stufenfalz, zugelassen für Umkehrdächer, einlagig auf der Abdichtung, Dicke {d} mm, "
             "mit wasserableitender Trennlage und Auflast.", "einheit": "m²", "kg": "363", "gen": "A",
     "varianten": [{"d": "160", "h": 0.10, "mat": 31}, {"d": "200", "h": 0.10, "mat": 39}, {"d": "240", "h": 0.12, "mat": 47}]},
    {"kurz": "Flachdachdämmung Schaumglas, verklebt in Heißbitumen, d = {d} mm",
     "lang": "Kompaktdachdämmung aus Schaumglasplatten, vollflächig in Heißbitumen verklebt, Fugen gefüllt, Dicke {d} mm.",
     "einheit": "m²", "kg": "363", "gen": "B",
     "varianten": [{"d": "120", "h": 0.35, "mat": 62}, {"d": "180", "h": 0.40, "mat": 92}]},
    {"kurz": "Vakuumdämmung an Terrassentür, 40 mm",
     "lang": "Vakuumisolationspaneele mit Schutzkaschierung nach Verlegeplan an Terrassen-Türanschlüssen mit geringer Aufbauhöhe.",
     "einheit": "m²", "kg": "363", "h": 0.40, "mat": 165, "gen": "C"},
    {"kurz": "Dämmkeil / Dämmstreifen an Aufkantung, 60 × 60 mm",
     "lang": "Dämmkeil aus Mineralwolle bzw. PIR 60 × 60 mm am Übergang Fläche zu Aufkantung.",
     "einheit": "m", "kg": "363", "h": 0.05, "mat": 2.0, "gen": "A"},
    {"kurz": "Zulage Dämmung Holzbohle / Attika-Aufdopplung, Holz 6/{b}",
     "lang": "Holzbohle bzw. Attikaaufdopplung als Befestigungsrand für Dachrandprofil und Abdichtung, imprägniert, verankert.",
     "einheit": "m", "kg": "363", "gen": "A", "lohn": "zimmerer",
     "varianten": [{"b": "16", "h": 0.30, "mat": 6}, {"b": "24", "h": 0.35, "mat": 9}]},
])
_neu("Abdichtung Fläche", [
    {"kurz": "Bitumenabdichtung 1-lagig, 5,2 mm, auf Altdach",
     "lang": "Einlagige Dachabdichtung mit Polymerbitumen-Schweißbahn 5,2 mm, Polyestervlies, beschiefert, auf vorhandener "
             "tragfähiger Altabdichtung vollflächig verschweißt.", "einheit": "m²", "kg": "363", "h": 0.20, "mat": 12.5, "gen": "A", "tags": ["altbau"]},
    {"kurz": "Bitumenabdichtung dreilagig, genutzte Dachfläche",
     "lang": "Dreilagige Abdichtung genutzter Dachflächen aus Polymerbitumenbahnen, oberste Lage wurzelfest.",
     "einheit": "m²", "kg": "363", "h": 0.48, "mat": 31, "gen": "A"},
    {"kurz": "Kunststoffdachbahn {m}, verklebt",
     "lang": "Kunststoffdachbahn {m} mit Vlieskaschierung, vollflächig mit PU-Kleber verklebt, Nähte verschweißt.",
     "einheit": "m²", "kg": "363", "gen": "A",
     "varianten": [{"m": "FPO 1,8 mm", "h": 0.20, "mat": 23}, {"m": "PVC-P 1,5 mm", "h": 0.20, "mat": 20}]},
    {"kurz": "Kunststoffdachbahn {m}, lose mit Auflast",
     "lang": "Kunststoffdachbahn {m}, lose verlegt mit Auflast (Kies bzw. Begrünung), Nähte verschweißt und geprüft.",
     "einheit": "m²", "kg": "363", "gen": "A",
     "varianten": [{"m": "FPO 1,8 mm", "h": 0.14, "mat": 16}, {"m": "PVC-P 1,8 mm", "h": 0.14, "mat": 15}, {"m": "EPDM 1,5 mm", "h": 0.15, "mat": 18}]},
    {"kurz": "Wurzelschutzbahn Zulage nach FLL",
     "lang": "Zulage für wurzel- und rhizomfeste Ausführung der obersten Abdichtungslage nach FLL-Verfahren.",
     "einheit": "m²", "kg": "363", "h": 0.02, "mat": 4.5, "gen": "A"},
    {"kurz": "Abdichtungsprüfung Nahtprüfung / Vakuumprüfung, protokolliert",
     "lang": "Prüfung der Nähte mit Prüfnadel bzw. Vakuumglocke, Dokumentation im Prüfprotokoll.",
     "einheit": "m²", "kg": "363", "h": 0.02, "geraet": 0.3, "gen": "A"},
])
_neu("Anschlüsse, Ränder", [
    {"kurz": "Türanschluss genutztes Dach, Höhe 5 cm mit Entwässerungsrinne",
     "lang": "Abdichtungsanschluss an Fenstertür mit reduzierter Anschlusshöhe 5 cm, Flüssigkunststoff, mit Gitterrost-Rinne "
             "vor der Tür.", "einheit": "m", "kg": "363", "h": 1.0, "mat": 120, "gen": "B"},
    {"kurz": "Lichtband / Lichtkuppel-Aufsetzkranz: Abdichtungsanschluss",
     "lang": "Anschluss der Dachabdichtung an Aufsetzkranz bzw. Lichtband ringsum, Anschlusshöhe ≥ 15 cm.",
     "einheit": "m", "kg": "363", "h": 0.40, "mat": 12, "gen": "A"},
    {"kurz": "Anschluss an Lüftungsgerät / Fundamentsockel, Aufkantung",
     "lang": "Abdichtung von Gerätesockeln bzw. Fundamenten für haustechnische Anlagen mit Aufkantung und Abschlussprofil.",
     "einheit": "m", "kg": "363", "h": 0.55, "mat": 16, "gen": "B"},
    {"kurz": "Traufblech / Rinneneinhangblech Flachdach, Alu/Titanzink",
     "lang": "Traufblech bzw. Rinneneinhangblech am Flachdachrand, mit Abdichtung eingeklebt.",
     "einheit": "m", "kg": "363", "h": 0.30, "mat": 12, "gen": "A", "lohn": "klempner"},
    {"kurz": "Wandanschlussprofil / Klemmschiene mit Dichtfuge",
     "lang": "Oberer Abschluss der Wandanschlusshöhe mit Klemmschiene bzw. Wandanschlussprofil Alu, Fuge elastisch versiegelt.",
     "einheit": "m", "kg": "363", "h": 0.20, "mat": 9, "gen": "A"},
])
_neu("Entwässerung", [
    {"kurz": "Attikagully / Speier mit Fallrohranschluss DN {dn}",
     "lang": "Attikaablauf mit Anschlussflansch und Rohrstutzen für außenliegendes Fallrohr DN {dn}.",
     "einheit": "St", "kg": "363", "gen": "B",
     "varianten": [{"dn": "80", "h": 1.6, "mat": 145}, {"dn": "100", "h": 1.8, "mat": 170}]},
    {"kurz": "Dachablauf im Bestand erneuern (Sanierungseinsatz)",
     "lang": "Vorhandenen Dachablauf mit Sanierungseinsatz (Einsteck-Ablauf mit Dichtring) in bestehende Leitung erneuern.",
     "einheit": "St", "kg": "363", "h": 1.8, "mat": 160, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Rinnenausbildung in Dachfläche (Kehlrinne), Abdichtung",
     "lang": "Innenliegende Kehlrinne in der Dachfläche aus Dämmkeilen und Abdichtung, Breite bis 50 cm.",
     "einheit": "m", "kg": "363", "h": 0.80, "mat": 26, "gen": "B"},
])
_neu("Bestand, Sanierung", [
    {"kurz": "Teerhaltige Dachbahnen ausbauen und entsorgen (PAK)",
     "lang": "Teer- bzw. PAK-haltige Dachbahnen nach Analytik ausbauen, getrennt erfassen und als gefährlicher Abfall entsorgen.",
     "einheit": "m²", "kg": "394", "h": 0.40, "geraet": 28, "gen": "C", "tags": ["altbau"], "lohn": "abbruch"},
    {"kurz": "Kies aufnehmen, seitlich lagern und wieder verteilen",
     "lang": "Vorhandene Kiesschüttung aufnehmen, auf dem Dach bzw. im Container zwischenlagern und nach Fertigstellung wieder verteilen.",
     "einheit": "m²", "kg": "363", "h": 0.20, "geraet": 2, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Durchfeuchtete Dämmung ausbauen und entsorgen",
     "lang": "Durchfeuchtete Wärmedämmung bis 20 cm ausbauen, Dampfsperre prüfen, entsorgen.",
     "einheit": "m²", "kg": "394", "h": 0.30, "geraet": 9, "gen": "C", "tags": ["altbau"]},
    {"kurz": "Dachentwässerung Bestand reinigen und Kiesfang ersetzen",
     "lang": "Dachabläufe reinigen, Kiesfänge bzw. Laubfänge ersetzen, Durchgängigkeit prüfen.",
     "einheit": "St", "kg": "363", "h": 0.5, "mat": 25, "gen": "A", "tags": ["altbau"]},
    {"kurz": "Wartung Flachdach nach Fachregel, jährlich, bis 300 m²",
     "lang": "Inspektion und Wartung der Flachdachfläche: Abläufe reinigen, Anschlüsse prüfen, Bewuchs entfernen, Kurzprotokoll.",
     "einheit": "psch", "kg": "363", "h": 4.0, "geraet": 40, "gen": "B", "achsen": []},
])


def _regel(gruppe, p):
    if p["einheit"] in ("h", "psch"):
        return []
    k = p["kurz"]
    if gruppe in ("Voranstrich, Dampfsperre",):
        return [GROESSE, HOEHE, ORT]
    if gruppe == "Wärmedämmung":
        return [GROESSE, HOEHE, ORT] if p["einheit"] == "m²" else [HOEHE, ORT]
    if gruppe == "Abdichtung Fläche":
        if "Zulage" in k or "prüfung" in k or "Trenn" in k:
            return [GROESSE]
        return [QUAL, NEIG, GROESSE, HOEHE, ORT]
    if gruppe == "Anschlüsse, Ränder":
        return [HOEHE, ORT] if p["einheit"] == "St" else [QUAL, HOEHE, ORT]
    if gruppe == "Oberflächen, Begrünung, Sicherheit":
        return [GROESSE, HOEHE, ORT] if p["einheit"] == "m²" else [HOEHE, ORT]
    if gruppe == "Bestand, Sanierung":
        return [GROESSE, HOEHE] if p["einheit"] == "m²" else [HOEHE]
    return [HOEHE, ORT]


for _g in LBS[0]["gruppen"]:
    for _p in _g["positionen"]:
        if "achsen" not in _p:
            _p["achsen"] = _regel(_g["name"], _p)
# Mineralwoll-Dämmung bringt den Brandschutz mit, EPS/PIR: Achse Brandriegel nicht sinnvoll -> nur Abdichtung bekommt BRANDD
for _p in LBS[0]["gruppen"][2]["positionen"]:
    if _p["kurz"].startswith("Bitumenabdichtung 2-lagig"):
        _p["achsen"] = [QUAL, NEIG, BRANDD, GROESSE, HOEHE, ORT]
