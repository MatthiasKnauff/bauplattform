# LB 020 Dachdeckungsarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "020", "name": "Dachdeckungsarbeiten", "atv": "DIN 18338", "lohn": "dach",
    "gruppen": [
        {"name": "Unterdeckung, Lattung", "positionen": [
            {"kurz": "Unterdeckbahn diffusionsoffen, regensicher",
             "lang": "Unterdeckung nach Fachregeln des Dachdeckerhandwerks aus diffusionsoffener Unterdeckbahn "
                     "(sd ≤ 0,2 m), Stöße und Nähte verklebt, Anschlüsse an Traufe, First, Durchdringungen und aufgehende "
                     "Bauteile regensicher ausgebildet. Abrechnung nach Dachfläche.",
             "einheit": "m²", "kg": "363", "h": 0.09, "mat": 3.8, "gen": "A"},
            {"kurz": "Konterlattung 40/60 mm mit Nageldichtband",
             "lang": "Konterlattung aus Nadelholz, imprägniert, 40 × 60 mm, auf den Sparren über der Unterdeckung "
                     "mit untergelegtem Nageldichtband befestigt.",
             "einheit": "m²", "kg": "363", "h": 0.07, "mat": 2.9, "gen": "A"},
            {"kurz": "Dachlattung {q} mm",
             "lang": "Traglattung aus Nadelholz, sortiert nach DIN 4074 S10, imprägniert, Querschnitt {q} mm, "
                     "Lattabstand nach Deckwerkstoff eingemessen, einschließlich Trauf- und Firstlatten.",
             "einheit": "m²", "kg": "363", "gen": "A",
             "varianten": [{"q": "30 × 50", "h": 0.12, "mat": 3.3}, {"q": "40 × 60", "h": 0.13, "mat": 4.4}]},
            {"kurz": "Traufblech / Tropfblech",
             "lang": "Traufblech aus Titanzink bzw. Aluminium beschichtet, Zuschnitt bis 25 cm, an der Traufe "
                     "befestigt, Unterdeckbahn darauf angeklebt.",
             "einheit": "m", "kg": "363", "h": 0.15, "mat": 7.5, "gen": "A", "lohn": "klempner"},
            {"kurz": "Traufe Lüftungselement / Vogelschutz",
             "lang": "Traufkamm bzw. Lüftungsgitter aus Kunststoff/Aluminium gegen Vögel und Insekten an der Traufe "
                     "montieren, Lüftungsquerschnitt nach Fachregel.",
             "einheit": "m", "kg": "363", "h": 0.06, "mat": 3.2, "gen": "A"},
        ]},
        {"name": "Eindeckungen", "positionen": [
            {"kurz": "Eindeckung {m}",
             "lang": "Dacheindeckung mit {m}, Farbe und Oberfläche nach Bemusterung, nach Fachregeln und "
                     "Herstellerangaben mit Sturmklammern gemäß Windsogberechnung verlegt, auf vorhandener Lattung. "
                     "Einschließlich Schneiden an Graten, Kehlen und Anschlüssen. Formziegel/-steine gesondert. "
                     "Abrechnung nach Dachfläche ohne Abzug von Öffnungen bis 1 m².",
             "einheit": "m²", "kg": "363", "gen": "B",
             "varianten": [{"m": "Tonziegel Flachdachpfanne, engobiert", "h": 0.40, "mat": 22},
                           {"m": "Tonziegel Falzziegel", "h": 0.38, "mat": 17},
                           {"m": "Tonziegel glasiert", "h": 0.40, "mat": 32},
                           {"m": "Biberschwanzziegeln, Doppeldeckung", "h": 0.85, "mat": 42},
                           {"m": "Betondachsteinen (Frankfurter Pfanne)", "h": 0.36, "mat": 12.5},
                           {"m": "Betondachsteinen, glatt, flach", "h": 0.38, "mat": 16},
                           {"m": "Faserzement-Dachplatten, Doppeldeckung", "h": 0.85, "mat": 34},
                           {"m": "Faserzement-Wellplatten, Profil 5", "h": 0.28, "mat": 18}]},
            {"kurz": "Schieferdeckung {a}, auf Schalung",
             "lang": "Dachdeckung mit Naturschiefer, Qualität nach DIN EN 12326, in {a}, auf Vollschalung mit "
                     "Bitumen-Vordeckbahn, mit Schiefernägeln bzw. -haken befestigt. Einschließlich Zuschnitt und "
                     "Kleinanschlüssen. Abrechnung nach Dachfläche.",
             "einheit": "m²", "kg": "363", "gen": "C",
             "varianten": [{"a": "Rechteck-Doppeldeckung", "h": 1.5, "mat": 72}, {"a": "Altdeutscher Deckung", "h": 2.6, "mat": 85}]},
            {"kurz": "Doppelstehfalzdach {m}",
             "lang": "Metalldachdeckung als Doppelstehfalzdeckung aus {m}, Scharbreite ca. 500–600 mm, auf Vollschalung "
                     "mit strukturierter Trennlage, mit Fest- und Schiebehaften befestigt. Einschließlich Traufe und First "
                     "nach Systemdetail. Abrechnung nach Dachfläche.",
             "einheit": "m²", "kg": "363", "gen": "C", "lohn": "klempner",
             "varianten": [{"m": "Titanzink, 0,7 mm, vorbewittert", "h": 1.1, "mat": 52}, {"m": "Aluminium, farbbeschichtet, 0,7 mm", "h": 1.05, "mat": 46},
                           {"m": "Kupfer, 0,6 mm", "h": 1.15, "mat": 98}]},
            {"kurz": "Dach {m}",
             "lang": "Dacheindeckung mit {m}, auf Stahl- bzw. Holzpfetten mit Bohrschrauben und Dichtscheiben "
                     "befestigt, Längs- und Querstöße mit Dichtband, einschließlich Formteile anteilig. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "363", "gen": "B",
             "varianten": [{"m": "Trapezblech Stahl 0,75 mm, Antikondensvlies", "h": 0.30, "mat": 24},
                           {"m": "Sandwichpaneele PIR 100 mm", "h": 0.35, "mat": 46},
                           {"m": "Sandwichpaneele PIR 160 mm", "h": 0.38, "mat": 58}]},
        ]},
        {"name": "First, Grat, Ortgang, Kehle", "positionen": [
            {"kurz": "First/Grat trocken, Firstziegel mit Lüftungsband",
             "lang": "First bzw. Grat mit passenden Firstziegeln bzw. -steinen in Trockenbauweise: Firstlattenhalter, "
                     "Firstlatte, belüftetes Firstrollband und Firstklammern; Anfänger und Endscheiben gesondert. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "363", "gen": "A", "h": 0.45, "mat": 24},
            {"kurz": "Ortgang {s}",
             "lang": "Ortgangausbildung {s}, passend zum Deckwerkstoff, einschließlich "
                     "Befestigung mit Ortgangklammern bzw. Schrauben.",
             "einheit": "m", "kg": "363", "gen": "A",
             "varianten": [{"s": "mit Ortgangziegeln/-steinen", "h": 0.35, "mat": 19}, {"s": "mit Ortgangblech Alu/Titanzink", "h": 0.40, "mat": 18, "lohn": "klempner"}]},
            {"kurz": "Kehle, {a}",
             "lang": "Dachkehle als {a}, einschließlich Kehlschalung bzw. Kehlbrett, Unterlage und Zuschneiden "
                     "der angrenzenden Deckung. Abrechnung nach Kehllänge.",
             "einheit": "m", "kg": "363", "gen": "B",
             "varianten": [{"a": "Metallkehle aus Titanzink, Zuschnitt 50 cm", "h": 0.80, "mat": 28},
                           {"a": "eingebundene Kehle (Biber/Schiefer)", "h": 2.2, "mat": 22}]},
            {"kurz": "Firstanfänger / Gratanfänger / Endscheibe",
             "lang": "Systemzugehöriger Formziegel als First- bzw. Gratanfänger oder First-Endscheibe, passend zur "
                     "Eindeckung liefern und versetzen.",
             "einheit": "St", "kg": "363", "h": 0.15, "mat": 18, "gen": "A"},
            {"kurz": "Pultabschluss / Pultziegel, belüftet",
             "lang": "Pultdachabschluss mit systemzugehörigen Pultziegeln bzw. -steinen und Lüftungselement, "
                     "einschließlich Befestigung und ggf. Pultabschlussblech.",
             "einheit": "m", "kg": "363", "h": 0.45, "mat": 32, "gen": "B"},
        ]},
        {"name": "Einbauteile, Durchgänge", "positionen": [
            {"kurz": "Dachflächenfenster {g}",
             "lang": "Dachflächenfenster aus Holz/Kunststoff weiß, 3-fach-Verglasung, Uw ≤ 1,0 W/(m²K), Größe {g}, "
                     "liefern und einbauen, einschließlich Eindeckrahmen, Dämmrahmen, Dampfsperr- und "
                     "Unterdeckanschlussschürze; Wechsel und Innenfutter gesondert.",
             "einheit": "St", "kg": "362", "gen": "C",
             "varianten": [{"g": "ca. 78 × 118 cm, Schwingfenster", "h": 4.5, "mat": 720},
                           {"g": "ca. 78 × 140 cm, Schwingfenster", "h": 5.0, "mat": 820},
                           {"g": "ca. 114 × 140 cm, Klapp-Schwingfenster", "h": 5.5, "mat": 1150},
                           {"g": "ca. 78 × 140 cm, elektrisch mit Regensensor", "h": 6.0, "mat": 1350}]},
            {"kurz": "Dachausstieg / Ausstiegsfenster, ca. 45 × 55 cm",
             "lang": "Dachausstiegsfenster für nicht ausgebaute Dachräume, ca. 45 × 55 cm, mit Eindeckrahmen, "
                     "Einfachverglasung, einbauen.",
             "einheit": "St", "kg": "362", "h": 1.8, "mat": 140, "gen": "B"},
            {"kurz": "Innenfutter Dachfenster, Gipskarton/Systemfutter",
             "lang": "Innenfutter für Dachflächenfenster als Systemfutter bzw. aus Gipskarton mit Kantenschutz, "
                     "Laibungen oben waagerecht, unten senkrecht, luftdicht angeschlossen.",
             "einheit": "St", "kg": "364", "h": 2.5, "mat": 190, "gen": "B"},
            {"kurz": "Lüfterziegel / Lüfterstein mit Abdeckung",
             "lang": "Systemzugehöriger Lüfterziegel bzw. -stein mit Insektenschutz, nach Lüftungsbedarf verteilt.",
             "einheit": "St", "kg": "363", "h": 0.12, "mat": 9, "gen": "A"},
            {"kurz": "Dachdurchgang {a}",
             "lang": "Dachdurchgang für {a} mit passendem Formziegel bzw. Systemdurchgangselement, Anschluss an "
                     "Unterdeckung mit Manschette.",
             "einheit": "St", "kg": "363", "gen": "B",
             "varianten": [{"a": "Entlüftungsleitung DN 100", "h": 0.8, "mat": 85}, {"a": "Antennen-/Kabeldurchführung", "h": 0.6, "mat": 55},
                           {"a": "Lüftungs-Fortluft DN 160", "h": 1.0, "mat": 140}]},
            {"kurz": "Schneefangsystem {a}",
             "lang": "Schneefangsystem als {a} aus feuerverzinktem bzw. beschichtetem Stahl, mit Stützen auf "
                     "Konterlatten bzw. Schneefangziegeln, nach Schneelastzone bemessen.",
             "einheit": "m", "kg": "363", "gen": "B",
             "varianten": [{"a": "Schneefanggitter, Höhe 20 cm", "h": 0.40, "mat": 26}, {"a": "Rundholz-Schneefang Ø 12 cm", "h": 0.50, "mat": 30}]},
            {"kurz": "Laufrost / Trittstufe für Schornsteinfeger, Länge {l} cm",
             "lang": "Sicherheitstrittstufe bzw. Laufrost aus Aluminium/verzinktem Stahl nach DIN EN 516 auf "
                     "Stützen der Eindeckung, Länge {l} cm.",
             "einheit": "St", "kg": "363", "gen": "A",
             "varianten": [{"l": "25", "h": 0.4, "mat": 48}, {"l": "80", "h": 0.8, "mat": 120}]},
            {"kurz": "Sicherheitsdachhaken / Anschlageinrichtung Steildach",
             "lang": "Sicherheitsdachhaken bzw. Einzelanschlagpunkt nach DIN EN 517 / DIN EN 795, auf Sparren "
                     "befestigt, mit Prüfdokumentation.",
             "einheit": "St", "kg": "363", "h": 0.6, "mat": 58, "gen": "A"},
            {"kurz": "Schornsteinanschluss Steildach, Bleiersatz",
             "lang": "Anschluss der Eindeckung an Schornstein bzw. Mauerwerk mit Walzblei bzw. Bleiersatzband, "
                     "Brust, Seiten und Rückenkehle, mit Überhangstreifen; Klempnerverwahrung gesondert. Querschnitt bis 60 × 60 cm.",
             "einheit": "St", "kg": "363", "h": 3.0, "mat": 95, "gen": "B"},
            {"kurz": "Wandanschluss Steildach, Anschlussband",
             "lang": "Seitlicher bzw. oberer Wandanschluss der Dachdeckung mit Anschlussband (Bleiersatz) und "
                     "Kappleiste aus Alu, Fuge elastisch geschlossen.",
             "einheit": "m", "kg": "363", "h": 0.45, "mat": 18, "gen": "A"},
        ]},
        {"name": "Bestand, Abbruch, Sonstiges", "positionen": [
            {"kurz": "Deckung abdecken, entsorgen, {m}",
             "lang": "Vorhandene Dacheindeckung aus {m} einschließlich Lattung und Formteilen abdecken, über "
                     "Schuttrutsche bzw. Kran in Container laden und entsorgen einschließlich Gebühren.",
             "einheit": "m²", "kg": "394", "gen": "B", "tags": ["altbau"],
             "varianten": [{"m": "Ton-/Betondachsteinen", "h": 0.28, "geraet": 6}, {"m": "Schiefer/Biber", "h": 0.38, "geraet": 7}]},
            {"kurz": "Asbest-Faserzementplatten ausbauen, TRGS 519",
             "lang": "Ausbau asbesthaltiger Faserzement-Dach- bzw. Wellplatten nach TRGS 519 durch sachkundiges Personal, "
                     "zerstörungsfrei, Platten benetzen, in zugelassene Big-Bags verpacken und als gefährlicher Abfall "
                     "entsorgen, einschließlich Arbeitsplan, Anzeige und Nachweise.",
             "einheit": "m²", "kg": "394", "h": 0.45, "mat": 3, "geraet": 16, "gen": "C", "tags": ["altbau"], "lohn": "abbruch"},
            {"kurz": "Dachziegel einzeln austauschen / Reparaturdeckung",
             "lang": "Beschädigte Dachziegel bzw. -steine austauschen (Material passend bzw. aus Bestand), "
                     "einschließlich Hilfskonstruktion bzw. Leiter. Abrechnung je ausgetauschtes Stück.",
             "einheit": "St", "kg": "363", "h": 0.25, "mat": 6, "gen": "C", "tags": ["altbau"]},
            {"kurz": "Dach- und Rinnenreinigung, Moos entfernen",
             "lang": "Dachfläche von Moos und Bewuchs befreien, Dachrinnen und Fallrohre reinigen, Abfälle entsorgen.",
             "einheit": "m²", "kg": "363", "h": 0.10, "geraet": 1.2, "gen": "C", "tags": ["altbau"]},
            {"kurz": "Stundenlohnarbeiten Dachdecker (Geselle)",
             "lang": "Stundenlohnarbeiten Dachdecker auf Anordnung, einschließlich Kleinwerkzeug, Nachweis durch Stundenzettel.",
             "einheit": "h", "kg": "363", "h": 1.0, "geraet": 2, "gen": "A"},
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


NEIGUNG = [{"k": "≤30°", "t": "Dachneigung bis 30°."},
           {"k": "30–45°", "t": "Dachneigung über 30° bis 45°.", "fh": 1.10},
           {"k": "45–60°", "t": "Dachneigung über 45° bis 60°, mit zusätzlicher Sicherung der Deckung.", "fh": 1.22, "fm": 1.03},
           {"k": ">60°", "t": "Dachneigung über 60° (Mansarde, Turm), jedes Deckelement mechanisch befestigt.", "fh": 1.38, "fm": 1.06, "gen": "C"}]
FORM = [{}, {"k": "gegliedert", "t": "Dachfläche gegliedert (Walm, Gauben, Kehlen, Grate), erhöhter Schneideaufwand.", "fh": 1.15, "fm": 1.06},
        {"k": "Kleinfl.", "t": "Kleinflächen bis 10 m² (Gauben, Vordächer, Erker) bzw. Einzelflächen.", "fh": 1.45, "fm": 1.10, "gen": "C"}]
TRAUFE = [{}, {"k": "TH≤12m", "t": "Traufhöhe über 7 m bis 12 m, Materialtransport mit Aufzug.", "fh": 1.05},
          {"k": "TH>12m", "t": "Traufhöhe über 12 m, Materialtransport mit Kran bzw. Bauaufzug.", "fh": 1.10, "geraet": 1.5}]
ORT = [{}, {"k": "Bestand", "t": "Ausführung im Bestand an genutztem Gebäude, Anschluss an vorhandene Deckung und Schutz gegen Witterung je Arbeitsabschnitt.",
            "fh": 1.15, "gen": "B", "tags": ["altbau"]}]
FARBE = [{"k": "naturrot", "t": "Farbe naturrot bzw. Standardfarbe."},
         {"k": "engobiert", "t": "Oberfläche engobiert, Farbe nach Bemusterung.", "fm": 1.15},
         {"k": "edelengobiert", "t": "Oberfläche edelengobiert bzw. matt, Farbe nach Bemusterung.", "fm": 1.32}]
SPARRENABSTAND = [{}, {"k": "SA>80cm", "t": "Sparrenabstand über 80 cm, Lattung im verstärkten Querschnitt nach Fachregel.", "fm": 1.25}]

_neu("Unterdeckung, Lattung", [
    {"kurz": "Dachschalung Rauspund 24 mm",
     "lang": "Vollschalung aus Nadelholz-Rauspund, 24 mm, sägerau, imprägniert, auf Sparren genagelt, Stöße auf Sparren versetzt, "
             "als Unterlage für Unterdach, Schiefer- oder Metalldeckung. Abrechnung nach Dachfläche.",
     "einheit": "m²", "kg": "363", "h": 0.30, "mat": 17.5, "gen": "A", "lohn": "zimmerer"},
    {"kurz": "Unterdach regensicher, Bitumenbahn",
     "lang": "Regensicheres Unterdach für flache Dachneigungen unter Regeldachneigung aus Polymerbitumenbahn auf Vollschalung, "
             "Nähte verschweißt, Konterlatten mit Bahnenstreifen eingebunden.",
     "einheit": "m²", "kg": "363", "h": 0.22, "mat": 12, "gen": "B"},
    {"kurz": "Zulage Unterdeckung an Durchdringung",
     "lang": "Zulage für das regensichere Einbinden einer Durchdringung in die Unterdeckung mit Systemmanschette bzw. Formteil, "
             "Durchmesser bis 160 mm.",
     "einheit": "St", "kg": "363", "h": 0.35, "mat": 14, "gen": "A"},
    {"kurz": "Zulage Wechsel-/Doppellatte",
     "lang": "Zulage für zusätzliche Wechsel-, Doppel- oder Ergänzungslatten an Traufe, First, Graten, Kehlen und Einbauteilen.",
     "einheit": "m", "kg": "363", "h": 0.06, "mat": 1.2, "gen": "A"},
])
_neu("Eindeckungen", [
    {"kurz": "Dacheindeckung Hohlpfanne/Krempziegel, historisch",
     "lang": "Dacheindeckung mit Hohlpfannen bzw. Krempziegeln nach historischem Vorbild, mit Strohdocken bzw. Mörtelverstrich "
             "nach Denkmalvorgabe, auf Lattung. Abrechnung nach Dachfläche.",
     "einheit": "m²", "kg": "363", "h": 0.75, "mat": 34, "gen": "C", "tags": ["altbau", "denkmal"]},
    {"kurz": "Dacheindeckung Mönch-Nonne-Ziegel, im Mörtelbett",
     "lang": "Dacheindeckung mit Mönch- und Nonnenziegeln, Mönche im Mörtel verlegt und mit Klammern gesichert.",
     "einheit": "m²", "kg": "363", "h": 1.40, "mat": 58, "gen": "C", "tags": ["denkmal"]},
    {"kurz": "Dacheindeckung Bitumenschindeln auf Schalung",
     "lang": "Dacheindeckung mit Bitumenschindeln, beschiefert, auf Vollschalung mit Vordeckbahn, genagelt und selbstklebend, "
             "für Dachneigungen ab 15°.",
     "einheit": "m²", "kg": "363", "h": 0.40, "mat": 15, "gen": "A"},
    {"kurz": "Dacheindeckung Metalldachpfannen Stahl",
     "lang": "Dacheindeckung mit großformatigen Metalldachpfannen aus Stahl, beschichtet, mit Bohrschrauben auf Lattung, "
             "einschließlich Systemformteile anteilig.",
     "einheit": "m²", "kg": "363", "h": 0.30, "mat": 21, "gen": "B"},
    {"kurz": "Reetdachdeckung, d = 30 cm, gebunden",
     "lang": "Weichdach aus Reet, Deckdicke ca. 30 cm, mit Edelstahldraht auf Lattung gebunden, First mit Heidesoden bzw. "
             "Firsthaube nach Wahl.", "einheit": "m²", "kg": "363", "h": 2.6, "mat": 62, "gen": "C", "tags": ["denkmal"]},
    {"kurz": "Steildachbegrünung extensiv, Schubsicherung",
     "lang": "Extensive Begrünung auf geneigtem Dach bis 25° auf wurzelfester Abdichtung mit Schubschwellen bzw. "
             "Rasterelementen, Substrat und Sedummatten.", "einheit": "m²", "kg": "363", "h": 0.55, "mat": 48, "gen": "C"},
])
_neu("First, Grat, Ortgang, Kehle", [
    {"kurz": "First/Grat im Mörtelbett (Nassverlegung)",
     "lang": "First bzw. Grat mit Firstziegeln im Mörtelbett verlegen, Mörtel eingefärbt, Firstziegel geklammert.",
     "einheit": "m", "kg": "363", "h": 0.70, "mat": 22, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Walmkappe / Firstkreuz / Gratanschluss Formteil",
     "lang": "Systemformteil als Walmkappe, Firstkreuz oder Gratverteiler passend zur Eindeckung liefern und versetzen.",
     "einheit": "St", "kg": "363", "h": 0.35, "mat": 42, "gen": "A"},
    {"kurz": "Ortgang überstehend mit Zahnleiste",
     "lang": "Ortgang mit überstehender Deckung auf Ortgangbrett, Zahnleiste und Ortgangklammern, Ziegel mit Mörtelverstrich bzw. "
             "Windfeder abgeschlossen.", "einheit": "m", "kg": "363", "h": 0.45, "mat": 14, "gen": "B"},
    {"kurz": "Kehle mit Kehlziegeln/Kehlformsteinen",
     "lang": "Dachkehle mit systemzugehörigen Kehlziegeln bzw. -formsteinen auf Kehlschalung mit Unterlage.",
     "einheit": "m", "kg": "363", "h": 1.0, "mat": 46, "gen": "B"},
])
_neu("Einbauteile, Durchgänge", [
    {"kurz": "Dachfenster-Zubehör: {z}",
     "lang": "Zubehör zum Dachflächenfenster: {z}, passend zum Fenstertyp liefern und montieren.",
     "einheit": "St", "kg": "362", "gen": "B",
     "varianten": [{"z": "Außenrollladen elektrisch/solar", "h": 1.2, "mat": 520}, {"z": "Hitzeschutz-Markise außen", "h": 0.6, "mat": 180},
                   {"z": "Verdunkelungsrollo innen", "h": 0.3, "mat": 110}, {"z": "Insektenschutzrollo", "h": 0.4, "mat": 140},
                   {"z": "Lichtlenk-/Lichtschacht-Futter tief", "h": 2.0, "mat": 240}]},
    {"kurz": "Dachfenster austauschen, gleiche Größe",
     "lang": "Vorhandenes Dachflächenfenster ausbauen und entsorgen, neues Fenster gleicher Größe mit Eindeckrahmen, "
             "Dämm- und Anschlussschürzen einbauen, Innenanschluss an vorhandenes Futter anpassen.",
     "einheit": "St", "kg": "362", "h": 6.0, "mat": 860, "gen": "C", "tags": ["altbau"]},
    {"kurz": "PV-Leitungsdurchführung, Systemelement",
     "lang": "Regensichere Durchführung für Solar- bzw. PV-Leitungen mit Systemziegel und Manschette in Unterdeckung.",
     "einheit": "St", "kg": "363", "h": 0.7, "mat": 65, "gen": "A"},
    {"kurz": "Schneefangstütze / Schneestopper einzeln",
     "lang": "Schneestopper bzw. Schneefanghaken einzeln je Ziegel, verteilt nach Schneelastzone.",
     "einheit": "St", "kg": "363", "h": 0.10, "mat": 6, "gen": "A"},
    {"kurz": "Sturmklammern nachrüsten",
     "lang": "Vorhandene Deckung mit Sturmklammern nach Windsogberechnung nachrüsten, Ziegel aufnehmen und wieder verlegen.",
     "einheit": "m²", "kg": "363", "h": 0.25, "mat": 3.5, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Lüftungshaube / Dunstrohraufsatz Steildach",
     "lang": "Lüftungshaube aus Kunststoff/Metall für Dunstrohr bzw. Lüftung mit Systemziegel und Anschluss an Unterdeckung.",
     "einheit": "St", "kg": "363", "h": 0.9, "mat": 110, "gen": "B"},
])
_neu("Bestand, Abbruch, Sonstiges", [
    {"kurz": "Umdecken: aufnehmen, Lattung neu, wiederverlegen",
     "lang": "Vorhandene Ziegel bzw. Dachsteine aufnehmen, seitlich lagern, Lattung erneuern, Ziegel sortiert wieder verlegen, "
             "Fehlmengen gesondert.", "einheit": "m²", "kg": "363", "h": 0.75, "mat": 5, "gen": "C", "tags": ["altbau"]},
    {"kurz": "Fehlende Dachziegel ergänzen (Fehlmenge)",
     "lang": "Ergänzung fehlender bzw. zerbrochener Dachziegel bei Umdeckung durch passende Ziegel (Neuware oder Gebrauchtware).",
     "einheit": "St", "kg": "363", "h": 0.05, "mat": 3.2, "gen": "C", "tags": ["altbau"]},
    {"kurz": "Notabdeckung Dach mit Plane, gesichert",
     "lang": "Behelfsmäßige Notabdeckung offener Dachflächen mit schwerer Gewebeplane, gegen Windsog gesichert, vorhalten bis "
             "zur Eindeckung.", "einheit": "m²", "kg": "391", "h": 0.08, "mat": 2.5, "gen": "B"},
    {"kurz": "Lattung und Unterspannbahn abbrechen, entsorgen",
     "lang": "Vorhandene Lattung, Konterlattung und Unterspannbahn abbrechen, Nägel ziehen, sortenrein trennen und entsorgen.",
     "einheit": "m²", "kg": "394", "h": 0.15, "geraet": 3, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Schornstein über Dach abbrechen, bis {h1} m",
     "lang": "Schornsteinkopf über Dach bis {h1} m Höhe abtragen, Dachfläche schließen (Wechsel und Deckung gesondert), "
             "Schutt entsorgen.", "einheit": "St", "kg": "394", "gen": "C", "tags": ["altbau"], "lohn": "abbruch",
     "varianten": [{"h1": "1,0", "h": 4.0, "geraet": 60}, {"h1": "2,0", "h": 7.0, "geraet": 110}]},
    {"kurz": "Dachflächen-Inspektion mit Protokoll und Fotodokumentation",
     "lang": "Begehung und Inspektion der Dachfläche, Dokumentation der Schäden mit Fotos und Kurzbericht.",
     "einheit": "psch", "kg": "363", "h": 3.0, "geraet": 30, "gen": "B", "achsen": []},
])


def _regel(gruppe, p):
    if p["einheit"] in ("h", "psch"):
        return []
    if gruppe == "Eindeckungen":
        ziegel = "Tondachziegeln (F" in p.get("kurz", "") or "{m}" in p.get("kurz", "")
        return [NEIGUNG, FORM, TRAUFE, ORT]
    if gruppe in ("Unterdeckung, Lattung",):
        return [NEIGUNG, FORM, TRAUFE, ORT] if "Lattung" not in p["kurz"] else [NEIGUNG, SPARRENABSTAND, TRAUFE, ORT]
    if gruppe == "First, Grat, Ortgang, Kehle":
        return [NEIGUNG, TRAUFE, ORT]
    if gruppe == "Einbauteile, Durchgänge":
        return [NEIGUNG, TRAUFE, ORT] if p["einheit"] == "St" else [NEIGUNG, FORM, TRAUFE, ORT]
    return [NEIGUNG, TRAUFE]


for _g in LBS[0]["gruppen"]:
    for _p in _g["positionen"]:
        if "achsen" not in _p:
            _p["achsen"] = _regel(_g["name"], _p)
# Farbachse nur bei den Tonziegel-Falz- und Flachdachpfannen
for _p in LBS[0]["gruppen"][1]["positionen"]:
    if _p["kurz"] == "Eindeckung {m}":
        _p["varianten"] = [dict(v, achsen=[FARBE, NEIGUNG, FORM, TRAUFE, ORT]) if "Falzziegel" in v["m"] else v for v in _p["varianten"]]
