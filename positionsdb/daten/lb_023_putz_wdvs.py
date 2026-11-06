# LB 023 Putz- und Stuckarbeiten, Wärmedämmsysteme – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "023", "name": "Putz- und Stuckarbeiten, Wärmedämmsysteme", "atv": "DIN 18350 / DIN 18345", "lohn": "putz",
    "gruppen": [
        {"name": "Vorarbeiten, Putzträger, Profile", "positionen": [
            {"kurz": "Untergrund vorbehandeln, {art}",
             "lang": "Putzuntergrund prüfen und vorbehandeln mit {art} nach Herstellerangabe des Putzsystems, "
                     "einschließlich Entfernen loser Teile und Staub. Abrechnung nach geputzter Fläche.",
             "einheit": "m²", "kg": "345", "gen": "A",
             "varianten": [{"art": "Grundierung (saugfähiger Untergrund)", "h": 0.03, "mat": 0.6},
                           {"art": "Haftbrücke auf Beton", "h": 0.04, "mat": 1.3},
                           {"art": "Spritzbewurf vollflächig", "h": 0.08, "mat": 1.5}]},
            {"kurz": "Putzträger aus verzinktem Rippenstreckmetall über {wo}",
             "lang": "Putzträger aus verzinktem Rippenstreckmetall über {wo} anbringen, mit mindestens 10 cm "
                     "Überbindung beidseitig, mechanisch befestigt. Abrechnung nach Länge, Breite bis 30 cm.",
             "einheit": "m", "kg": "345", "gen": "A",
             "varianten": [{"wo": "Mischmauerwerk / Materialwechsel", "h": 0.10, "mat": 2.8},
                           {"wo": "geschlossenen Installationsschlitzen", "h": 0.12, "mat": 2.8}]},
            {"kurz": "Putzprofil verzinkt/Edelstahl: {art}",
             "lang": "{art} als Putzprofil liefern und mit Ansetzmörtel lot- und fluchtgerecht setzen, passend zur "
                     "Putzdicke. Abrechnung nach Länge.",
             "einheit": "m", "kg": "345", "gen": "A",
             "varianten": [{"art": "Eckschutzschiene Innenputz", "h": 0.08, "mat": 1.2},
                           {"art": "Putzabschlussprofil Innenputz", "h": 0.08, "mat": 1.4},
                           {"art": "Putzabschlussprofil Außenputz Edelstahl", "h": 0.10, "mat": 3.5},
                           {"art": "Sockelabschlussprofil Außenputz", "h": 0.12, "mat": 4.0},
                           {"art": "Dehnfugenprofil Innenputz", "h": 0.12, "mat": 6.5}]},
            {"kurz": "Fenster-/Türanschlussprofil mit Gewebelasche",
             "lang": "Anputzleiste mit Schutzlasche und Gewebe für schlagregendichten Anschluss des Putzes an Fenster- "
                     "und Türrahmen liefern und einbauen. Abrechnung nach Länge.",
             "einheit": "m", "kg": "335", "h": 0.08, "mat": 2.6, "gen": "A"},
        ]},
        {"name": "Innenputz", "positionen": [
            {"kurz": "Innenputz Wand {ka}, {d} mm, {kq}",
             "lang": "Innenwandputz als {art}, {lage}, mittlere Dicke {d} mm, auf Mauerwerk bzw. "
                     "Beton, Oberfläche {q}. Ecken und Kanten gerade, Anschlüsse an andere Bauteile mit Kellenschnitt. "
                     "Öffnungen über 2,5 m² werden abgezogen, Leibungen gesondert.",
             "einheit": "m²", "kg": "345", "gen": "A",
             "varianten": [{"ka": "Gipsputz", "kq": "Q2", "art": "Gipsputz (B4/P IV)", "d": "10", "lage": "Maschinenputz einlagig", "q": "geglättet Q2", "h": 0.22, "mat": 3.5},
                           {"ka": "Gipsputz", "kq": "Q3", "art": "Gipsputz (B4/P IV)", "d": "15", "lage": "Maschinenputz einlagig", "q": "gefilzt/geglättet Q3", "h": 0.27, "mat": 4.8},
                           {"ka": "Kalk-Gipsputz", "kq": "gefilzt", "art": "Kalk-Gipsputz", "d": "15", "lage": "Maschinenputz einlagig", "q": "gefilzt", "h": 0.27, "mat": 4.6},
                           {"ka": "Kalkzementputz CS II", "kq": "abgerieben", "art": "Kalk-Zementputz (CS II) für Feuchträume", "d": "15", "lage": "Maschinenputz einlagig", "q": "abgerieben", "h": 0.30, "mat": 4.2},
                           {"ka": "Kalkputz CL", "kq": "gefilzt", "art": "Kalkputz (CL) diffusionsoffen", "d": "15", "lage": "Maschinenputz einlagig", "q": "gefilzt", "h": 0.32, "mat": 6.5},
                           {"ka": "Lehmputz 2-lagig", "kq": "gefilzt", "art": "Lehmputz zweilagig", "d": "20", "lage": "aufgebracht als Unter- und Oberputz", "q": "gefilzt", "h": 0.55, "mat": 12}]},
            {"kurz": "Deckenputz {art}, d = {d} mm, auf Beton",
             "lang": "Deckenputz als {art} auf Stahlbetondecke nach Haftbrücke, mittlere Dicke {d} mm, Oberfläche "
                     "geglättet. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "353", "gen": "A",
             "varianten": [{"art": "Gipsputz", "d": "8", "h": 0.26, "mat": 3.0},
                           {"art": "Gipsputz", "d": "12", "h": 0.30, "mat": 4.0},
                           {"art": "Kalk-Zementputz", "d": "12", "h": 0.34, "mat": 3.6}]},
            {"kurz": "Dünnlagenputz/Flächenspachtel, 3–5 mm",
             "lang": "Dünnlagiger Gipsputz bzw. Flächenspachtelung auf ebenem Plansteinmauerwerk oder Beton, Dicke "
                     "3 bis 5 mm, Oberfläche geglättet Q2 für Anstrich oder Tapete.",
             "einheit": "m²", "kg": "345", "h": 0.18, "mat": 2.4, "gen": "A"},
            {"kurz": "Leibungen putzen, Tiefe bis {t} cm",
             "lang": "Fenster- und Türleibungen sowie Stürze in der Putzart der angrenzenden Fläche putzen, "
                     "einschließlich Kantenschutz, Tiefe bis {t} cm. Abrechnung nach Länge.",
             "einheit": "m", "kg": "345", "gen": "A",
             "varianten": [{"t": "25", "h": 0.20, "mat": 1.5}, {"t": "40", "h": 0.26, "mat": 2.2}]},
            {"kurz": "Schlitze und Durchbrüche beiputzen, Breite bis {b} cm",
             "lang": "Geschlossene Installationsschlitze und kleinere Fehlstellen bündig beiputzen, mit Putzträger "
                     "bzw. Gewebe soweit erforderlich, Breite bis {b} cm.",
             "einheit": "m", "kg": "345", "gen": "B", "tags": ["altbau"],
             "varianten": [{"b": "10", "h": 0.15, "mat": 1.0}, {"b": "30", "h": 0.28, "mat": 2.5}]},
            {"kurz": "Altputz ausbessern, Einzelfläche bis {a} m²",
             "lang": "Schadhaften Innenputz im Bestand bis auf den tragfähigen Untergrund abschlagen, Untergrund "
                     "vorbehandeln und in Putzart und Struktur des Bestands neu putzen, Übergänge angleichen. "
                     "Einzelfläche bis {a} m².",
             "einheit": "m²", "kg": "345", "gen": "C", "tags": ["altbau"],
             "varianten": [{"a": "0,5", "h": 1.30, "mat": 6}, {"a": "2,0", "h": 0.85, "mat": 5}]},
            {"kurz": "Armierungsgewebe in Innenputz einbetten",
             "lang": "Glasfaser-Armierungsgewebe im oberen Drittel des Innenputzes vollflächig einbetten, Stöße "
                     "mindestens 10 cm überlappend, z. B. über Rissen und Materialwechseln.",
             "einheit": "m²", "kg": "345", "h": 0.08, "mat": 1.6, "gen": "A"},
        ]},
        {"name": "Außenputz", "positionen": [
            {"kurz": "Außenputz 2-lagig, Leichtputz + {ko}",
             "lang": "Außenputzsystem auf monolithischem Mauerwerk: mineralischer Leichtunterputz LW, d = 15–20 mm, "
                     "nach Standzeit Armierungsschicht mit Gewebe, Oberputz als {o}. Einschließlich Diagonalarmierung "
                     "an Öffnungsecken. Öffnungen über 2,5 m² werden abgezogen. Gerüst gesondert.",
             "einheit": "m²", "kg": "335", "gen": "B",
             "varianten": [{"ko": "Scheibenputz mineral.", "o": "mineralischer Scheibenputz 2 mm", "h": 0.75, "mat": 13},
                           {"ko": "Silikonharzputz", "o": "Silikonharzputz 2 mm", "h": 0.75, "mat": 16},
                           {"ko": "Kratzputz", "o": "Kratzputz 8 mm", "h": 0.85, "mat": 15}]},
            {"kurz": "Außenleibungen putzen, Tiefe bis {t} cm",
             "lang": "Außenleibungen und Stürze im Putzsystem der Fassade putzen, Kanten mit Eckschutzprofil mit "
                     "Gewebe, Anschluss an Fensterrahmen mit Anputzleiste (gesondert). Tiefe bis {t} cm.",
             "einheit": "m", "kg": "335", "gen": "A",
             "varianten": [{"t": "20", "h": 0.32, "mat": 3.5}, {"t": "40", "h": 0.42, "mat": 5.5}]},
            {"kurz": "Sockelputz Zementputz, wasserabweisend, Höhe bis 50 cm",
             "lang": "Sockelputz im Spritzwasserbereich aus wasserabweisendem Zementputz CS IV, d = ca. 20 mm, "
                     "Oberfläche nach Bemusterung, im erdberührten Bereich mit Dichtschlämme geschützt. "
                     "Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "335", "h": 0.70, "mat": 12, "gen": "B"},
            {"kurz": "Fassadenputz im Bestand ausbessern, Einzelfläche bis 1 m²",
             "lang": "Hohlliegenden und schadhaften Außenputz abschlagen, Untergrund vorbehandeln, Putz zweilagig "
                     "in Struktur des Bestands ergänzen, Übergänge angleichen. Gerüst gesondert.",
             "einheit": "m²", "kg": "335", "h": 1.40, "mat": 12, "gen": "C", "tags": ["altbau"]},
        ]},
        {"name": "Wärmedämmverbundsysteme", "positionen": [
            {"kurz": "WDVS EPS 032, {d} cm",
             "lang": "Wärmedämm-Verbundsystem mit allgemeiner bauaufsichtlicher Zulassung bzw. Bauartgenehmigung: "
                     "Dämmplatten aus EPS (grau) WLS 032, Dicke {d} cm, im Wulst-Punkt-Verfahren geklebt und nach "
                     "Dübelschema gedübelt, Armierungsschicht mit Gewebe, Oberputz Silikonharzputz 2 mm, Farbton hell "
                     "(HBW ≥ 20). Öffnungen über 2,5 m² werden abgezogen, Leibungen gesondert. Gerüst gesondert.",
             "einheit": "m²", "kg": "335", "gen": "B",
             "varianten": [{"d": "12", "h": 0.85, "mat": 34}, {"d": "14", "h": 0.86, "mat": 36}, {"d": "16", "h": 0.88, "mat": 38.5},
                           {"d": "18", "h": 0.90, "mat": 41}, {"d": "20", "h": 0.92, "mat": 43.5}, {"d": "24", "h": 0.96, "mat": 49}]},
            {"kurz": "WDVS Mineralwolle 035, {d} cm, A1",
             "lang": "Nicht brennbares Wärmedämm-Verbundsystem (A1/A2) mit Dämmplatten aus Mineralwolle WLS 035, "
                     "Dicke {d} cm, vollflächig bzw. Wulst-Punkt geklebt und durch das Gewebe gedübelt, "
                     "mineralische Armierung, mineralischer Oberputz 2 mm. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "335", "gen": "B",
             "varianten": [{"d": "12", "h": 1.00, "mat": 46}, {"d": "16", "h": 1.04, "mat": 54},
                           {"d": "20", "h": 1.08, "mat": 62}, {"d": "24", "h": 1.12, "mat": 70}]},
            {"kurz": "WDVS Holzfaser, d = {d} cm, auf Holzbau",
             "lang": "Putzträgerplatten aus Holzfaser für Holzrahmen- bzw. Massivholzwände, Dicke {d} cm, mit "
                     "Breitrückenklammern bzw. Systemdübeln befestigt, mineralische Armierung mit Gewebe und Oberputz "
                     "nach Systemaufbau. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "335", "gen": "C",
             "varianten": [{"d": "6", "h": 0.80, "mat": 38}, {"d": "10", "h": 0.85, "mat": 52}]},
            {"kurz": "Brandriegel Mineralwolle im EPS-WDVS, Höhe 20 cm",
             "lang": "Umlaufender Brandriegel aus Mineralwolle-Lamellen, Höhe 20 cm, in Dicke des WDVS, vollflächig "
                     "geklebt und gedübelt, nach Zulassung bzw. Bauartgenehmigung angeordnet. Abrechnung nach Länge.",
             "einheit": "m", "kg": "335", "h": 0.25, "mat": 8.5, "gen": "A"},
            {"kurz": "Sockeldämmung XPS/Perimeter im WDVS, d = {d} cm",
             "lang": "Sockel- und Perimeterdämmung aus XPS-Platten bzw. Sockeldämmplatten, Dicke {d} cm, geklebt, "
                     "mit Sockelarmierung und mineralischem Sockelputz, erdberührt mit Abdichtung geschützt.",
             "einheit": "m²", "kg": "335", "gen": "B",
             "varianten": [{"d": "12", "h": 1.00, "mat": 42}, {"d": "16", "h": 1.05, "mat": 50}]},
            {"kurz": "Leibungsdämmung WDVS, d = {d} cm, Tiefe bis 30 cm",
             "lang": "Fenster- und Türleibungen sowie Stürze mit Dämmplatten des Systems, Dicke {d} cm, dämmen, "
                     "Kanten mit Gewebe-Eckwinkel, Anschluss an Rahmen mit Anschlussprofil, Armierung und Oberputz. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "335", "gen": "A",
             "varianten": [{"d": "3", "h": 0.45, "mat": 6.5}, {"d": "5", "h": 0.48, "mat": 8.0}]},
            {"kurz": "Fensterbank-Anschluss im WDVS, Bordprofil und Abdichtung",
             "lang": "Anschluss der Fensterbank an das WDVS mit Fensterbank-Bordprofil bzw. Abschlussprofil und "
                     "Fugendichtband, schlagregendicht nach Systemvorgabe. Abrechnung je Fensterbank.",
             "einheit": "St", "kg": "335", "h": 0.50, "mat": 14, "gen": "B"},
            {"kurz": "Montagequader/Befestigungselement im WDVS für {wofuer}",
             "lang": "Wärmebrückenarmes Montageelement (Quader, Zylinder) für {wofuer} in das WDVS einbauen, "
                     "bündig zur Dämmebene, nach Herstellerangabe.",
             "einheit": "St", "kg": "335", "gen": "B",
             "varianten": [{"wofuer": "leichte Lasten (Leuchte, Briefkasten)", "h": 0.35, "mat": 14},
                           {"wofuer": "schwere Lasten (Markise, Vordach)", "h": 0.60, "mat": 42}]},
            {"kurz": "Dehnfugenprofil im WDVS",
             "lang": "Bewegungsfugen im WDVS mit systemzugehörigem Dehnfugenprofil (E- oder V-Form) ausbilden, "
                     "schlagregendicht. Abrechnung nach Länge.",
             "einheit": "m", "kg": "335", "h": 0.25, "mat": 9, "gen": "A"},
            {"kurz": "Aufpreis Oberputz Farbton dunkel (HBW 10–20)",
             "lang": "Aufpreis zu den WDVS-Positionen für Oberputz bzw. Schlussbeschichtung in dunklerem Farbton "
                     "mit Hellbezugswert 10 bis 20 nach Herstellerfreigabe.",
             "einheit": "m²", "kg": "335", "h": 0.0, "mat": 3.5, "gen": "B"},
            {"kurz": "Egalisationsanstrich Silikonharzfarbe auf WDVS-Oberputz",
             "lang": "Egalisationsanstrich auf Oberputz mit Silikonharzfarbe, einmal deckend, Farbton nach "
                     "Bemusterung. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "335", "h": 0.08, "mat": 2.4, "gen": "A"},
        ]},
        {"name": "Stuck, Sonstiges", "positionen": [
            {"kurz": "Stuckprofil gezogen/ergänzen, Abwicklung bis {a} cm",
             "lang": "Profilierte Deckenkehle bzw. Gesims aus Gips im Bestand nach Schablone ziehen oder fehlende "
                     "Teile ergänzen, an vorhandene Profile angepasst, Abwicklung bis {a} cm.",
             "einheit": "m", "kg": "353", "gen": "C", "tags": ["altbau", "denkmal"],
             "varianten": [{"a": "15", "h": 1.2, "mat": 6}, {"a": "30", "h": 2.0, "mat": 10}]},
            {"kurz": "Stundenlohnarbeiten Putzer (Facharbeiter)",
             "lang": "Arbeiten im Stundenlohn auf Anordnung der Bauleitung, Facharbeiter einschließlich aller "
                     "Zuschläge. Abrechnung nach bestätigten Stundenlohnzetteln.",
             "einheit": "h", "kg": "345", "h": 1.0, "mat": 0, "geraet": 0.5, "gen": "A"},
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


BESTAND = [{}, {"k": "Bestand", "t": "Ausführung im Bestand in genutzten bzw. teilgeräumten Gebäuden, Anschlüsse an vorhandene Bauteile, "
                "Schutz angrenzender Flächen und Materialtransport von Hand.", "fh": 1.25, "gen": "B", "tags": ["altbau"]}]
FLAECHE = [{}, {"k": "≤ 5 m²", "t": "Ausführung in Einzelflächen bis 5 m² (Pfeiler, Brüstungen, Nischen, Bäder).", "fh": 1.30, "gen": "B"},
           {"k": "Schräge/TH", "t": "Ausführung an Dachschrägen, Gauben bzw. in Treppenhäusern mit wechselnden Arbeitshöhen.", "fh": 1.15}]
UG_INNEN = [{}, {"k": "Beton", "t": "Untergrund Beton bzw. Betonfertigteile, Haftbrücke im Preis enthalten.", "h": 0.03, "mat": 1.3},
            {"k": "Mischuntergr.", "t": "Mischuntergrund (Mauerwerk mit Betonbauteilen), Materialwechsel mit Gewebe überbrückt.", "h": 0.06, "mat": 1.2},
            {"k": "Porenbeton", "t": "Untergrund Porenbeton, mit Grundierung bzw. Vornässen nach Herstellerangabe.", "h": 0.02, "mat": 0.6}]
OBERFL_INNEN = [{}, {"k": "Q3", "t": "Oberfläche zusätzlich in Qualitätsstufe Q3 nachgearbeitet (für matte, feine Beschichtungen).", "h": 0.05, "mat": 0.3},
                {"k": "Q4", "t": "Oberfläche in Qualitätsstufe Q4 vollflächig geglättet und gespachtelt (Streiflicht, glänzende Beschichtungen).",
                 "h": 0.16, "mat": 1.4, "gen": "B"}]
OBERPUTZ = [{}, {"k": "SiHa 3 mm", "t": "Oberputz abweichend als Silikonharzputz Körnung 3 mm.", "mat": 1.3},
            {"k": "mineral. OP", "t": "Oberputz abweichend als mineralischer Scheibenputz 2 mm mit Egalisationsanstrich.", "h": 0.06, "mat": 0.8},
            {"k": "Silikatputz", "t": "Oberputz abweichend als Silikatputz 2 mm.", "mat": 0.5},
            {"k": "Kratzputz", "t": "Oberputz abweichend als mineralischer Edelkratzputz, Dicke ca. 8 mm.", "h": 0.12, "mat": 3.0}]
FARBTON = [{}, {"k": "dunkel", "t": "Farbton dunkel (Hellbezugswert 10–20), System mit Herstellerfreigabe.", "mat": 3.5, "gen": "B"}]
GEBHOEHE = [{}, {"k": "GK 4/5", "t": "Gebäudeklasse 4/5 (bis 22 m), Brandschutzmaßnahmen nach Zulassung (Brandriegel gesondert), "
                 "erhöhte Dübelanzahl in Randbereichen.", "h": 0.03, "mat": 1.0}]
UG_WDVS = [{}, {"k": "Altputz", "t": "Untergrund tragfähiger Altputz im Bestand: Haftprüfung, Reinigung, Grundierung, Dübelung nach "
                "Abzugsversuch.", "fh": 1.12, "h": 0.05, "mat": 2.5, "tags": ["altbau"], "gen": "B"},
           {"k": "Beton", "t": "Untergrund Beton bzw. Betonfertigteile, Klebung nach Haftzugprüfung.", "mat": 0.5}]
UG_AUSSEN = [{}, {"k": "Porenbeton", "t": "Untergrund Porenbeton-Mauerwerk mit systemgerechtem Leichtputz.", "mat": 0.8},
             {"k": "Altputz", "t": "Untergrund vorhandener tragfähiger Altputz, mit Haftbrücke und vollflächiger Armierung.", "fh": 1.15,
              "mat": 3.0, "tags": ["altbau"], "gen": "B"}]
KOERNUNG = [{}, {"k": "3 mm", "t": "Oberputz in Körnung 3 mm.", "mat": 1.2}]

_gruppe("Vorarbeiten, Putzträger, Profile")["positionen"] += [
    {"kurz": "Altputz abschlagen, {art}",
     "lang": "Vorhandenen Putz {art} bis auf den tragfähigen Untergrund abschlagen, Fugen auskratzen, Flächen abfegen, Schutt zur "
             "Sammelstelle auf der Baustelle; Entsorgung gesondert. Abrechnung nach Fläche.",
     "einheit": "m²", "kg": "394", "gen": "B", "lohn": "abbruch", "tags": ["altbau"], "achsen": [FLAECHE],
     "varianten": [{"art": "innen an Wänden", "h": 0.35, "geraet": 1.0}, {"art": "innen an Decken", "h": 0.50, "geraet": 1.2, "kg": "353"},
                   {"art": "außen, mehrlagig", "h": 0.55, "geraet": 1.5, "kg": "335"}]},
    {"kurz": "Hohlstellen im Putz abklopfen und markieren",
     "lang": "Putzflächen im Bestand flächig auf Hohlstellen abklopfen, Hohlstellen markieren und dokumentieren als Grundlage für "
             "die Abrechnung der Ausbesserungen.", "einheit": "m²", "kg": "345", "h": 0.03, "mat": 0, "gen": "A", "tags": ["altbau"]},
    {"kurz": "Salzbelasteten Putz entfernen, Mauerwerk vorbereiten",
     "lang": "Salzbelasteten bzw. durchfeuchteten Putz mindestens 80 cm über Schadensgrenze abschlagen, Fugen 2 cm tief auskratzen, "
             "Mauerwerk trocken abbürsten, Schutt getrennt zur Sammelstelle.", "einheit": "m²", "kg": "345", "h": 0.60, "geraet": 1.5,
     "gen": "B", "lohn": "abbruch", "tags": ["altbau"]},
    {"kurz": "Mauerwerk ausgleichen (Vorspritz/Ausgleichsputz) bis {d} mm",
     "lang": "Unebenheiten im Mauerwerk vor dem Putzauftrag mit Ausgleichsputz bzw. Zementmörtel ausgleichen, Dicke bis {d} mm, "
             "Ausbruchstellen und Fehlstellen schließen.", "einheit": "m²", "kg": "345", "gen": "B", "tags": ["altbau"], "achsen": [FLAECHE],
     "varianten": [{"d": "10", "h": 0.20, "mat": 3.5}, {"d": "30", "h": 0.38, "mat": 8.5}]},
    {"kurz": "Haftzugprüfung Putz/Untergrund, je Prüfstelle",
     "lang": "Haftzugprüfung am Putzuntergrund bzw. Bestandsputz mit Prüfgerät, je Prüfstelle 3 Einzelmessungen, Protokoll.",
     "einheit": "St", "kg": "345", "h": 0.8, "mat": 6, "geraet": 15, "gen": "A"},
    {"kurz": "Zulage Ecken und Kanten: {art}",
     "lang": "Zulage zu den Putzpositionen für {art}. Abrechnung nach Länge.", "einheit": "m", "kg": "345", "gen": "A",
     "varianten": [{"art": "gerundete Kanten (Radius bis 10 mm)", "h": 0.10, "mat": 0.5},
                   {"art": "Putzkanten scharfkantig ohne Profil", "h": 0.15, "mat": 0.2},
                   {"art": "Fensterfaschen/Putzbänder abgesetzt, Breite bis 20 cm", "h": 0.35, "mat": 2.0, "kg": "335"}]},
]
_gruppe("Innenputz")["positionen"] += [
    {"kurz": "Sanierputzsystem WTA, {d} mm, zweilagig",
     "lang": "Sanierputzsystem nach WTA-Merkblatt auf salzbelastetem Mauerwerk: Spritzbewurf, Grundputz (Porengrundputz) und "
             "Sanierputz, Gesamtdicke {d} mm, Oberfläche abgerieben. Untergrundvorbereitung gesondert.",
     "einheit": "m²", "kg": "345", "gen": "B", "tags": ["altbau"], "achsen": [FLAECHE],
     "varianten": [{"d": "20", "h": 0.75, "mat": 16}, {"d": "30", "h": 0.90, "mat": 22}, {"d": "40", "h": 1.05, "mat": 28}]},
    {"kurz": "Wärmedämmputz innen, d = {d} mm",
     "lang": "Mineralischer Wärmedämmputz als Innendämmung bzw. Ausgleich, Dicke {d} mm, maschinell in Lagen aufgetragen, mit "
             "Armierungsschicht und Oberputz bzw. Glätte. Bauphysikalischer Nachweis bauseits.",
     "einheit": "m²", "kg": "336", "gen": "C", "tags": ["altbau"], "achsen": [FLAECHE],
     "varianten": [{"d": "30", "h": 0.85, "mat": 24}, {"d": "50", "h": 1.05, "mat": 38}]},
    {"kurz": "Innenputz Gipsputz 2-lagig, {d} mm, Ausgleich",
     "lang": "Zweilagiger Gipsmaschinenputz auf stark unebenem Mauerwerk, Gesamtdicke {d} mm, erste Lage aufgeraut, zweite Lage "
             "geglättet Q2. Öffnungen über 2,5 m² werden abgezogen.",
     "einheit": "m²", "kg": "345", "gen": "B", "tags": ["altbau"],
     "varianten": [{"d": "25", "h": 0.42, "mat": 7.5}, {"d": "35", "h": 0.50, "mat": 10.5}]},
    {"kurz": "Putzträgerplatte/Schilfrohr auf Holzuntergrund, mit Putz",
     "lang": "Putzträger (Schilfrohrmatte bzw. Holzwolle-Leichtbauplatte) auf Holzbalkendecke bzw. Fachwerk befestigen und mit "
             "Kalkputz zweilagig verputzen, Gesamtdicke ca. 20 mm.",
     "einheit": "m²", "kg": "353", "h": 1.10, "mat": 16, "gen": "C", "tags": ["altbau", "denkmal"]},
    {"kurz": "Akustikputz auf Trägerplatte, {art}",
     "lang": "Akustik-Putzsystem: Trägerplatten aus Mineralwolle bzw. Blähglas verklebt und gespachtelt, Akustikputz {art} "
             "gespritzt, Schallabsorptionsgrad nach Herstellerangabe.",
     "einheit": "m²", "kg": "353", "gen": "C",
     "varianten": [{"art": "fein, αw ≥ 0,6", "h": 1.00, "mat": 55}, {"art": "fein, αw ≥ 0,85, fugenlos", "h": 1.20, "mat": 78}]},
    {"kurz": "Riss im Innenputz sanieren, mit Gewebe",
     "lang": "Riss im Innenputz keilförmig aufweiten, mit Armierungsmörtel und Gewebestreifen (Breite 30 cm) überbrücken, "
             "Oberfläche angeglichen.", "einheit": "m", "kg": "345", "h": 0.35, "mat": 2.5, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Fensterbank innen beiputzen/Brüstung anarbeiten",
     "lang": "Brüstungsbereich und Unterkante der Fensterbank nach Einbau der Fensterbank beiputzen, Anschlussfuge mit "
             "Kellenschnitt. Abrechnung nach Länge.", "einheit": "m", "kg": "345", "h": 0.20, "mat": 1.0, "gen": "A"},
]
_gruppe("Außenputz")["positionen"] += [
    {"kurz": "Außenputz Kalkzementputz zweilagig mit {o}",
     "lang": "Außenputz auf Mauerwerk aus Kalkzement-Grundputz CS II, d = ca. 15 mm, nach Standzeit Oberputz als {o}. "
             "Öffnungen über 2,5 m² werden abgezogen. Gerüst gesondert.",
     "einheit": "m²", "kg": "335", "gen": "B", "achsen": [UG_AUSSEN, BESTAND],
     "varianten": [{"o": "Kalk-Scheibenputz 3 mm", "h": 0.70, "mat": 11}, {"o": "Kellenwurfputz", "h": 0.85, "mat": 12},
                   {"o": "Filzputz fein", "h": 0.78, "mat": 10}]},
    {"kurz": "Armierungsputz mit Gewebe auf Altputz, vollflächig",
     "lang": "Vollflächige Renovierungsarmierung auf tragfähigem Altputz: Reinigen, Grundierung, Armierungsmörtel mit eingebettetem "
             "Glasfasergewebe, d = ca. 5 mm, als Untergrund für neuen Oberputz (gesondert).",
     "einheit": "m²", "kg": "335", "h": 0.35, "mat": 7, "gen": "B", "tags": ["altbau"], "achsen": [FLAECHE]},
    {"kurz": "Sanierputz außen im Sockelbereich, WTA, d = 30 mm",
     "lang": "Sanierputzsystem WTA im Sockelbereich nach Entfernen des Altputzes: Spritzbewurf, Porengrundputz und Sanierputz, "
             "Gesamtdicke 30 mm, Oberfläche nach Bemusterung.", "einheit": "m²", "kg": "335", "h": 1.00, "mat": 24, "gen": "B",
     "tags": ["altbau"]},
    {"kurz": "Faschen/Gesimse außen ziehen, Abwicklung bis {a} cm",
     "lang": "Profilierte Fenster- bzw. Türfaschen und Gesimse aus Kalkzementmörtel nach Schablone ziehen bzw. ergänzen, "
             "Abwicklung bis {a} cm. Abrechnung nach Länge.", "einheit": "m", "kg": "335", "gen": "C", "tags": ["altbau", "denkmal"],
     "varianten": [{"a": "20", "h": 1.0, "mat": 6}, {"a": "40", "h": 1.8, "mat": 11}]},
    {"kurz": "Tropfkante/Fensterbankanschluss außen mit Profil",
     "lang": "Tropfkantenprofil bzw. Fensterbank-Bordprofil am Außenputz einbauen und anputzen. Abrechnung nach Länge.",
     "einheit": "m", "kg": "335", "h": 0.15, "mat": 4.5, "gen": "A"},
]
_gruppe("Wärmedämmverbundsysteme")["positionen"] += [
    {"kurz": "WDVS MW-Lamelle 041, {d} cm",
     "lang": "Nicht brennbares WDVS mit Mineralwolle-Lamellenplatten WLS 041, Dicke {d} cm, vollflächig verklebt (ohne bzw. mit "
             "reduzierter Dübelung nach Zulassung), mineralische Armierung mit Gewebe, mineralischer Oberputz 2 mm. Öffnungen über "
             "2,5 m² werden abgezogen.", "einheit": "m²", "kg": "335", "gen": "B", "achsen": [UG_WDVS, OBERPUTZ],
     "varianten": [{"d": "12", "h": 0.95, "mat": 44}, {"d": "16", "h": 0.98, "mat": 52}, {"d": "20", "h": 1.02, "mat": 60}]},
    {"kurz": "WDVS Resol/PIR 022, {d} cm",
     "lang": "WDVS mit Hochleistungs-Dämmplatten aus Resol- bzw. PIR-Hartschaum WLS 022, Dicke {d} cm, geklebt und gedübelt, "
             "Armierung mit Gewebe und Oberputz 2 mm, für geringe Aufbaudicken. Öffnungen über 2,5 m² werden abgezogen.",
     "einheit": "m²", "kg": "335", "gen": "C", "achsen": [UG_WDVS, OBERPUTZ],
     "varianten": [{"d": "8", "h": 0.88, "mat": 52}, {"d": "12", "h": 0.90, "mat": 70}]},
    {"kurz": "WDVS Holzfaser auf Mauerwerk, d = {d} cm",
     "lang": "WDVS mit Holzfaser-Dämmplatten auf Massivwand, Dicke {d} cm, geklebt und gedübelt, mineralische Armierung und "
             "Kalk- bzw. Silikatoberputz. Öffnungen über 2,5 m² werden abgezogen.",
     "einheit": "m²", "kg": "335", "gen": "C", "achsen": [UG_WDVS],
     "varianten": [{"d": "12", "h": 1.00, "mat": 58}, {"d": "16", "h": 1.05, "mat": 72}, {"d": "20", "h": 1.10, "mat": 86}]},
    {"kurz": "WDVS aufdoppeln auf bestehendes WDVS, EPS {d} cm",
     "lang": "Aufdopplung eines tragfähigen Bestands-WDVS: Standsicherheitsnachweis bauseits, Oberfläche reinigen, neue EPS-Platten "
             "WLS 032, Dicke {d} cm, kleben und mit Systemdübeln durch beide Lagen in den Untergrund dübeln, Armierung und Oberputz.",
     "einheit": "m²", "kg": "335", "gen": "C", "tags": ["altbau"], "achsen": [OBERPUTZ, FARBTON],
     "varianten": [{"d": "8", "h": 0.95, "mat": 34}, {"d": "12", "h": 1.00, "mat": 39}]},
    {"kurz": "WDVS-Sanierung: Algen entfernen, Armierung und Anstrich",
     "lang": "Bestehendes WDVS mit Algen- und Pilzbefall reinigen, Fungizid-Behandlung, Risse armieren, Egalisationsanstrich zweimal "
             "mit Silikonharzfarbe mit Filmschutz.", "einheit": "m²", "kg": "335", "h": 0.35, "mat": 6.5, "gen": "B", "tags": ["altbau"],
     "achsen": [FARBTON]},
    {"kurz": "Laibung/Sturz Bestand: Fenster-Anschluss im WDVS nacharbeiten",
     "lang": "Bei Fenstertausch im Bestand: Leibung freilegen, Anschlussprofil und Dämmung der Leibung erneuern, an WDVS mit "
             "Gewebe anarbeiten, Oberputz angleichen. Abrechnung nach Länge.", "einheit": "m", "kg": "335", "h": 0.70, "mat": 9,
     "gen": "C", "tags": ["altbau"]},
    {"kurz": "Zulage Dübelung WDVS bei {art}",
     "lang": "Zulage zu den WDVS-Positionen für {art}, nach Dübelschema und Windlastnachweis.", "einheit": "m²", "kg": "335", "gen": "A",
     "varianten": [{"art": "erhöhter Dübelanzahl (Randbereich, > 8 St/m²)", "h": 0.04, "mat": 1.6},
                   {"art": "versenkter Dübelmontage mit Rondelle", "h": 0.03, "mat": 0.6},
                   {"art": "Schraubdübel in Lochstein/Porenbeton", "h": 0.03, "mat": 1.0}]},
    {"kurz": "Fassaden-/Anschlussfugenband vorkomprimiert, {b} mm",
     "lang": "Vorkomprimiertes Fugendichtband (BG1) für Anschlussfugen des WDVS an Fenster, Dach, Durchdringungen einbauen, "
             "Breite {b} mm. Abrechnung nach Länge.", "einheit": "m", "kg": "335", "gen": "A",
     "varianten": [{"b": "15/3–7", "h": 0.06, "mat": 1.4}, {"b": "20/5–12", "h": 0.06, "mat": 2.2}]},
    {"kurz": "Anschluss WDVS an Dachüberstand/Ortgang",
     "lang": "Oberer Abschluss des WDVS an Dachüberstand bzw. Ortgang mit Anschlussprofil und Fugendichtband, Dämmung angepasst. "
             "Abrechnung nach Länge.", "einheit": "m", "kg": "335", "h": 0.30, "mat": 6.5, "gen": "A"},
    {"kurz": "Durchdringung im WDVS abdichten (Rohr, Kabel, Lüftung)",
     "lang": "Durchdringung im WDVS mit Dichtmanschette bzw. Fugenband schlagregendicht anschließen, Durchmesser bis 160 mm.",
     "einheit": "St", "kg": "335", "h": 0.40, "mat": 9, "gen": "A"},
    {"kurz": "Kellerdeckendämmung {art}, {d} mm",
     "lang": "Dämmung der Kellerdecke von unten mit Dämmplatten {art}, Dicke {d} mm, geklebt und mit Tellerdübeln gesichert, "
             "Oberfläche sichtfertig. Abrechnung nach Fläche.",
     "einheit": "m²", "kg": "353", "gen": "A", "tags": ["altbau"],
     "varianten": [{"art": "EPS WLS 035 weiß beschichtet", "d": "100", "h": 0.30, "mat": 14},
                   {"art": "EPS WLS 035 weiß beschichtet", "d": "140", "h": 0.32, "mat": 18},
                   {"art": "Mineralwolle-Lamelle A1 mit Vlies", "d": "100", "h": 0.35, "mat": 24},
                   {"art": "Mineralwolle-Lamelle A1 mit Vlies", "d": "140", "h": 0.38, "mat": 32}]},
]
_gruppe("Stuck, Sonstiges")["positionen"] += [
    {"kurz": "Stuckrosette/Ornament ergänzen bzw. neu versetzen, Ø bis {d} cm",
     "lang": "Stuckrosette bzw. Ornament aus Gips abformen bzw. als Fertigteil liefern, versetzen und an den Bestand anarbeiten, "
             "Durchmesser bis {d} cm.", "einheit": "St", "kg": "353", "gen": "C", "tags": ["altbau", "denkmal"],
     "varianten": [{"d": "40", "h": 2.5, "mat": 60}, {"d": "80", "h": 4.5, "mat": 140}]},
    {"kurz": "Stundenlohnarbeiten Helfer Putz",
     "lang": "Hilfsarbeiten im Stundenlohn auf Anordnung der Bauleitung, Bauhelfer einschließlich aller Zuschläge.",
     "einheit": "h", "kg": "345", "h": 0.82, "mat": 0, "gen": "A"},
]

_achsen([
    ("Innenputz Wand", [UG_INNEN, FLAECHE, BESTAND]),
    ("Deckenputz", [OBERFL_INNEN, FLAECHE, BESTAND]),
    ("Dünnlagenputz", [OBERFL_INNEN, FLAECHE, BESTAND]),
    ("Leibungen putzen", [BESTAND]),
    ("Untergrund vorbehandeln", [FLAECHE]),
    ("Altputz ausbessern", [UG_INNEN]),
    ("Armierungsgewebe", [FLAECHE]),
    ("Außenputz 2-lagig", [UG_AUSSEN, KOERNUNG, FARBTON, BESTAND]),
    ("Außenleibungen", [BESTAND]),
    ("Sockelputz", [BESTAND]),
    ("WDVS EPS", [UG_WDVS, OBERPUTZ, FARBTON, GEBHOEHE]),
    ("WDVS Mineralwolle 035", [UG_WDVS, OBERPUTZ, FARBTON]),
    ("WDVS Holzfaser, d", [OBERPUTZ[:1] + OBERPUTZ[2:4]]),
    ("Sockeldämmung", [BESTAND]),
    ("Leibungsdämmung", [BESTAND]),
    ("Egalisationsanstrich", [FARBTON, BESTAND]),
])
