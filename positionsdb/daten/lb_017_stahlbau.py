# LB 017 Stahlbauarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "017", "name": "Stahlbauarbeiten", "atv": "DIN 18335", "lohn": "stahlbau",
    "gruppen": [
        {"name": "Tragkonstruktionen", "positionen": [
            {"kurz": "Stahlkonstruktion {a}, S235/S355, Walzprofile",
             "lang": "Stahlkonstruktion als {a} aus warmgewalzten Profilen (HEA, HEB, IPE, U) S235JR bzw. S355J2 nach "
                     "Statik und Werkstattplanung (Werkstattplanung gesondert), einschließlich Kopf- und Fußplatten, "
                     "Laschen, Steifen und Schrauben, Ausführungsklasse EXC2 nach DIN EN 1090-2. Fertigen, liefern und "
                     "montieren. Korrosionsschutz gesondert. Abrechnung nach Gewicht laut Stückliste.",
             "einheit": "kg", "gen": "B",
             "varianten": [{"a": "Hallentragwerk (Rahmen, Pfetten, Verbände)", "kg": "361", "h": 0.055, "mat": 1.95},
                           {"a": "Stützen und Träger im Geschossbau", "kg": "351", "h": 0.065, "mat": 1.95},
                           {"a": "Kleinkonstruktion (Wechsel, Konsolen, Auswechselungen)", "kg": "351", "h": 0.10, "mat": 2.10}]},
            {"kurz": "Stahlträger {p} einbauen, im Bestand, inkl. Auflager",
             "lang": "Stahlträger {p}, S235, als Sturz bzw. Unterzug im Bestand einbauen: Träger liefern, Auflagertaschen "
                     "herstellen, Träger mit Stahlplatten unterlegen und mit Quellmörtel unterstopfen, seitliche Hohlräume "
                     "ausmauern. Abfangung und Abstützung gesondert. Abrechnung nach Trägerlänge.",
             "einheit": "m", "kg": "351", "gen": "C", "tags": ["altbau"],
             "varianten": [{"p": "2 × IPE 160", "h": 2.2, "mat": 68}, {"p": "2 × IPE 200", "h": 2.6, "mat": 92},
                           {"p": "HEB 200", "h": 2.6, "mat": 120}, {"p": "HEB 240", "h": 3.0, "mat": 152}]},
            {"kurz": "Stahlstütze Rundrohr / Quadratrohr {p}, Höhe bis 3,0 m",
             "lang": "Stahlstütze aus Hohlprofil {p}, S355, mit angeschweißter Kopf- und Fußplatte, Höhe bis 3,0 m, "
                     "auf Fundament bzw. Decke mit Ankern versetzt und untergossen. Korrosionsschutz gesondert.",
             "einheit": "St", "kg": "351", "gen": "B",
             "varianten": [{"p": "Ø 114,3 × 6,3", "h": 3.0, "mat": 210}, {"p": "120 × 120 × 8", "h": 3.0, "mat": 280},
                           {"p": "Ø 168,3 × 8", "h": 3.5, "mat": 360}]},
            {"kurz": "Abfangung / Abstützung für Trägereinbau, je Öffnung bis {b} m",
             "lang": "Temporäre Abfangung tragender Wände für den Einbau von Stahlträgern mit Nadelungen, Stahlstützen "
                     "und Kanthölzern nach Angabe der Tragwerksplanung, vorhalten und nach Erhärten wieder entfernen. "
                     "Lichte Öffnung bis {b} m.",
             "einheit": "St", "kg": "394", "gen": "C", "tags": ["altbau"], "lohn": "rohbau",
             "varianten": [{"b": "2,0", "h": 6.0, "mat": 30, "geraet": 90}, {"b": "4,0", "h": 10.0, "mat": 50, "geraet": 160}]},
            {"kurz": "Schwerlastanker / Verbundanker M{m} setzen",
             "lang": "Verbundanker bzw. Schwerlastanker M{m}, galvanisch verzinkt bzw. A4, mit Zulassung für gerissenen "
                     "Beton, einschließlich Bohren, Reinigen und Setzen nach Montageanweisung.",
             "einheit": "St", "kg": "351", "gen": "A",
             "varianten": [{"m": "12", "h": 0.25, "mat": 9}, {"m": "16", "h": 0.30, "mat": 14}, {"m": "20", "h": 0.35, "mat": 22}]},
            {"kurz": "Stahlunterkonstruktion für Balkon / Vorstellbalkon, je Balkon",
             "lang": "Stahl-Tragkonstruktion für einen Vorstell- bzw. Anbaubalkon bis ca. 6 m², aus Walzprofilen mit "
                     "Stützen, Randträgern und thermisch getrennten Anschlusskonsolen, feuerverzinkt, montiert. Belag und "
                     "Geländer gesondert.",
             "einheit": "St", "kg": "359", "h": 18, "mat": 3200, "gen": "C"},
        ]},
        {"name": "Korrosions- und Brandschutz", "positionen": [
            {"kurz": "Feuerverzinkung von Stahlbauteilen nach DIN EN ISO 1461",
             "lang": "Stückverzinken der Stahlbauteile nach DIN EN ISO 1461, einschließlich Vorbehandlung und Transport "
                     "zur Verzinkerei und zurück. Abrechnung nach Gewicht der unverzinkten Teile.",
             "einheit": "kg", "kg": "351", "h": 0.0, "mat": 0, "geraet": 0.95, "gen": "B"},
            {"kurz": "Korrosionsschutz-Beschichtungssystem {s}",
             "lang": "Korrosionsschutzbeschichtung nach DIN EN ISO 12944 für Korrosivitätskategorie {s}: Oberfläche "
                     "strahlen Sa 2½, Grundbeschichtung und Deckbeschichtung im Farbton nach RAL, Sollschichtdicke nach "
                     "System. Abrechnung nach beschichteter Oberfläche.",
             "einheit": "m²", "kg": "351", "gen": "B", "lohn": "maler",
             "varianten": [{"s": "C2 (innen, beheizt)", "h": 0.35, "mat": 8, "geraet": 6}, {"s": "C3 (außen, Stadtklima)", "h": 0.50, "mat": 12, "geraet": 8}]},
            {"kurz": "Duplexbeschichtung auf verzinktem Stahl",
             "lang": "Beschichtung feuerverzinkter Stahlteile (Duplex-System): Sweepen der Zinkoberfläche, Haftgrund und "
                     "Deckbeschichtung im RAL-Farbton, Gesamtschichtdicke ca. 120 µm. Abrechnung nach Oberfläche.",
             "einheit": "m²", "kg": "351", "h": 0.40, "mat": 10, "geraet": 6, "gen": "B", "lohn": "maler"},
            {"kurz": "Brandschutzbeschichtung (dämmschichtbildend) R {r}",
             "lang": "Dämmschichtbildende Brandschutzbeschichtung auf Stahlbauteilen für Feuerwiderstand R {r}, mit "
                     "allgemeiner Bauartgenehmigung, Schichtdicke nach Profilfaktor U/A, einschließlich Grundierung, "
                     "Deckbeschichtung und Kennzeichnung. Abrechnung nach beschichteter Oberfläche.",
             "einheit": "m²", "kg": "351", "gen": "C", "lohn": "maler",
             "varianten": [{"r": "30", "h": 0.60, "mat": 26, "geraet": 6}, {"r": "60", "h": 0.90, "mat": 52, "geraet": 8},
                           {"r": "90", "h": 1.30, "mat": 88, "geraet": 10}]},
            {"kurz": "Brandschutzbekleidung Stahlstütze/-träger, Platten F{r}",
             "lang": "Brandschutzbekleidung von Stahlstützen und -trägern mit nichtbrennbaren Brandschutzplatten "
                     "(Kalziumsilikat bzw. Gipsfaser) nach Prüfzeugnis für R {r}, kastenförmig, Plattendicke nach System. "
                     "Abrechnung nach Abwicklung.",
             "einheit": "m²", "kg": "351", "gen": "B", "lohn": "trockenbau",
             "varianten": [{"r": "30", "h": 0.9, "mat": 32}, {"r": "90", "h": 1.3, "mat": 62}]},
        ]},
        {"name": "Sonstiges", "positionen": [
            {"kurz": "Werkstatt- und Montageplanung Stahlbau",
             "lang": "Werkstatt- und Montagezeichnungen, Stücklisten und Anschlussdetails auf Grundlage der "
                     "Tragwerksplanung erstellen und zur Freigabe vorlegen. Abrechnung nach Konstruktionsgewicht.",
             "einheit": "kg", "kg": "351", "h": 0.004, "mat": 0, "geraet": 0.12, "gen": "B"},
            {"kurz": "Stundenlohnarbeiten Stahlbauer / Schweißer",
             "lang": "Stundenlohnarbeiten Stahlbau auf Anordnung, einschließlich Schweißgerät und Kleinwerkzeug, "
                     "Nachweis durch Stundenzettel.",
             "einheit": "h", "kg": "351", "h": 1.0, "geraet": 4, "gen": "A"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Runde 2: Ausführungsachsen und weitere Grundpositionen
GUETE = [{"k": "S235", "t": "Stahlsorte S235JR."}, {"k": "S355", "t": "Stahlsorte S355J2.", "fm": 1.08}]
EXC = [{"k": "EXC2", "t": "Ausführungsklasse EXC2."}, {"k": "EXC3", "t": "Ausführungsklasse EXC3 mit erhöhter Schweißnahtprüfung.", "fh": 1.15, "fm": 1.04}]
OBERFL = [{"k": "roh", "t": "Lieferung ohne Oberflächenschutz (Korrosionsschutz gesondert)."},
          {"k": "grundbeschichtet", "t": "Werkseitig gestrahlt und grundbeschichtet.", "mat": 0.35},
          {"k": "feuerverzinkt", "t": "Werkseitig feuerverzinkt nach DIN EN ISO 1461.", "mat": 0.95},
          {"k": "verzinkt + beschichtet", "t": "Feuerverzinkt und pulver- bzw. nassbeschichtet (Duplex) im RAL-Farbton.", "mat": 1.70}]
# für Bauteile je Stück/Meter: Oberfläche als Faktor auf die Stoffkosten
OBERFL_F = [{"k": "roh", "t": "Lieferung ohne Oberflächenschutz (Korrosionsschutz gesondert)."},
            {"k": "grundbeschichtet", "t": "Werkseitig gestrahlt und grundbeschichtet.", "fm": 1.17},
            {"k": "feuerverzinkt", "t": "Werkseitig feuerverzinkt nach DIN EN ISO 1461.", "fm": 1.45},
            {"k": "verzinkt + beschichtet", "t": "Feuerverzinkt und pulver- bzw. nassbeschichtet (Duplex) im RAL-Farbton.", "fm": 1.80}]
ORT = [{}, {"k": "im Bestand", "t": "Montage im Bestand mit beengten Verhältnissen, Einbringen ohne Kran, Teile schraubbar ausgeführt.",
            "fh": 1.45, "gen": "C", "tags": ["altbau"]}]
MONT = [{}, {"k": "Montagehöhe > 6 m", "t": "Montagehöhe über 6 m, Hubarbeitsbühne bzw. Kran wird gestellt.", "fh": 1.15, "geraet": 0.05}]
ANKER_UG = [{"k": "Beton", "t": "Untergrund Stahlbeton."}, {"k": "Mauerwerk", "t": "Untergrund Mauerwerk, Injektionssystem mit Siebhülse.", "fh": 1.2, "mat": 3}]
BS = [{"k": "", "t": ""}, {"k": "Ankergruppe", "t": "Als Ankergruppe auf Ankerplatte (Platte gesondert).", "fh": 0.9}]


def _ax(lb, gruppe, prefix, achsen):
    for gr in lb["gruppen"]:
        if gr["name"] == gruppe:
            for p in gr["positionen"]:
                if p["kurz"].startswith(prefix) and "achsen" not in p:
                    p["achsen"] = achsen


L = LBS[0]
_ax(L, "Tragkonstruktionen", "Stahlkonstruktion", [GUETE, EXC, OBERFL, MONT])
_ax(L, "Tragkonstruktionen", "Stahlträger", [[{}, {"k": "verzinkt", "t": "Träger feuerverzinkt.", "mat": 18}], [{}, {"k": "Auflager Beton", "t": "Auflager auf Betonkonsolen statt Mauerwerk.", "fh": 0.9}]])
_ax(L, "Tragkonstruktionen", "Stahlstütze", [OBERFL_F, ORT, [{}, {"k": "Höhe 4,5 statt 3,0 m", "t": "Höhe abweichend bis 4,5 m.", "fh": 1.2, "fm": 1.45}]])
_ax(L, "Tragkonstruktionen", "Schwerlastanker", [ANKER_UG, [{"k": "verzinkt", "t": ""}, {"k": "A4", "t": "Ankerstange und Mutter aus nichtrostendem Stahl A4.", "fm": 1.8}]])
_ax(L, "Tragkonstruktionen", "Stahlunterkonstruktion", [[{}, {"k": "beschichtet", "t": "Zusätzlich Duplexbeschichtung im RAL-Farbton.", "mat": 650}], [{}, {"k": "bis 10 m²", "t": "Balkonfläche bis 10 m².", "fh": 1.4, "fm": 1.5}]])
_ax(L, "Korrosions- und Brandschutz", "Korrosionsschutz", [ORT, [{}, {"k": "am Bauwerk", "t": "Ausführung am eingebauten Bauteil, Strahlen nur St 3 (maschinell).", "fh": 1.4, "geraet": -3}]])
_ax(L, "Korrosions- und Brandschutz", "Brandschutzbeschichtung", [[{"k": "U/A bis 200", "t": "Profilfaktor U/A bis 200 m⁻¹."}, {"k": "U/A bis 300", "t": "Profilfaktor U/A bis 300 m⁻¹.", "fm": 1.3, "fh": 1.15}], ORT])
_ax(L, "Korrosions- und Brandschutz", "Brandschutzbekleidung", [ORT, [{"k": "4-seitig", "t": ""}, {"k": "3-seitig", "t": "Dreiseitige Bekleidung an Decke anschließend.", "fh": 0.85}]])

L["gruppen"].append({"name": "Profile, Bauteile, Anschlüsse", "positionen": [
    {"kurz": "Walzträger {p} liefern und montieren, Länge bis {l} m",
     "lang": "Einzelträger {p} aus Walzstahl, abgelängt, mit Stirnplatten bzw. Auflagerplatten, Bohrungen für "
             "Schraubanschluss, geliefert und auf vorbereitete Auflager montiert. Länge bis {l} m.",
     "einheit": "St", "kg": "351", "gen": "B", "achsen": [GUETE, OBERFL_F, ORT],
     "varianten": [{"p": p, "l": l, "h": round(1.2 + w * 0.025 * float(l), 2), "mat": round(w * float(l) * 2.0 + 35)}
                   for p, w in (("IPE 160", 15.8), ("IPE 200", 22.4), ("IPE 240", 30.7), ("IPE 300", 42.2), ("HEA 160", 30.4),
                                ("HEA 200", 42.3), ("HEB 160", 42.6), ("HEB 200", 61.3), ("HEB 240", 83.2)) for l in ("4", "6")]},
    {"kurz": "Stahlwinkel / Flachstahl als Auflager, Konsole, Zulage {a}",
     "lang": "Kleinteile aus Winkel-, Flach- oder T-Stahl als {a}, mit Bohrungen und Befestigung an Beton bzw. "
             "Mauerwerk. Abrechnung nach Gewicht.",
     "einheit": "kg", "kg": "351", "gen": "B", "achsen": [OBERFL],
     "varianten": [{"a": "Auflagerwinkel", "h": 0.16, "mat": 2.3}, {"a": "Konsole geschweißt", "h": 0.22, "mat": 2.4},
                   {"a": "Randwinkel für Deckenöffnung", "h": 0.18, "mat": 2.3}]},
    {"kurz": "Ankerplatte {g} mm mit Kopfbolzen, einbetoniert",
     "lang": "Ankerplatte aus Stahl S235, Größe {g} mm, Dicke nach Statik, mit aufgeschweißten Kopfbolzendübeln, "
             "zum Einbetonieren lagegenau an die Schalung geliefert und befestigt.",
     "einheit": "St", "kg": "351", "gen": "B", "achsen": [OBERFL_F],
     "varianten": [{"g": "150 × 150", "h": 0.4, "mat": 28}, {"g": "200 × 200", "h": 0.5, "mat": 42}, {"g": "300 × 300", "h": 0.7, "mat": 78}]},
    {"kurz": "Ankerplatte {g} mm nachtr. mit Verbundankern",
     "lang": "Ankerplatte aus Stahl S235, Größe {g} mm, Dicke nach Statik, mit Bohrungen (ohne Kopfbolzen), auf vorhandenem "
             "Bauteil mit 4 Verbundankern M12 befestigt und untergossen.",
     "einheit": "St", "kg": "351", "gen": "B", "achsen": [OBERFL_F, ANKER_UG],
     "varianten": [{"g": "150 × 150", "h": 1.0, "mat": 40}, {"g": "200 × 200", "h": 1.15, "mat": 52}, {"g": "300 × 300", "h": 1.4, "mat": 80}]},
    {"kurz": "Stütze/Träger untergießen mit Vergussmörtel, Fuge bis 5 cm",
     "lang": "Fußplatten bzw. Auflager mit schwindarmem, fließfähigem Vergussmörtel untergießen, Schalung "
             "herstellen und entfernen. Abrechnung je Auflager bis 0,1 m².",
     "einheit": "St", "kg": "351", "h": 0.8, "mat": 18, "gen": "A"},
    {"kurz": "Pfettenlage / Dachpfetten Stahl, Walzprofil IPE/U",
     "lang": "Dachpfetten als Durchlauf- bzw. Einfeldträger aus Walzprofilen IPE bzw. U, auf Bindern verschraubt, einschließlich "
             "Pfettenschuhe und Kippsicherungen. Abrechnung nach Gewicht.",
     "einheit": "kg", "kg": "361", "gen": "B", "achsen": [OBERFL, MONT], "h": 0.05, "mat": 1.95},
    {"kurz": "Pfettenlage / Dachpfetten, Z-/C-Profil bandverzinkt",
     "lang": "Dachpfetten als Durchlauf- bzw. Einfeldträger aus kaltgeformten Z- bzw. C-Profilen, bandverzinkt (Sendzimir), "
             "auf Bindern verschraubt, einschließlich Pfettenschuhe und Kippsicherungen. Abrechnung nach Gewicht.",
     "einheit": "kg", "kg": "361", "gen": "B", "achsen": [MONT], "h": 0.045, "mat": 2.6},
    {"kurz": "Verbände / Zugstangen, Rundstahl mit Spannschloss",
     "lang": "Wind- und Stabilisierungsverbände aus Rundstahl bzw. Flachstahl mit Spannschlössern und "
             "Anschlusslaschen, vorgespannt montiert. Abrechnung nach Gewicht.",
     "einheit": "kg", "kg": "361", "h": 0.09, "mat": 2.6, "gen": "B", "achsen": [OBERFL, MONT]},
    {"kurz": "Trapezprofil-Dachtragschale Stahl, t = {t} mm, Höhe {hp} mm",
     "lang": "Tragendes Stahltrapezprofil als Dachschale, Dicke {t} mm, Profilhöhe {hp} mm, bandverzinkt mit "
             "Innenbeschichtung, auf Stahlpfetten mit Setzbolzen bzw. Bohrschrauben befestigt, einschließlich "
             "Randversteifungen. Abrechnung nach Dachfläche.",
     "einheit": "m²", "kg": "361", "gen": "B", "achsen": [MONT, [{}, {"k": "gelocht/akustisch", "t": "Profil in den Stegen gelocht mit Akustikeinlage.", "mat": 9}]],
     "varianten": [{"t": "0,75", "hp": "85", "h": 0.18, "mat": 16}, {"t": "0,88", "hp": "135", "h": 0.20, "mat": 21},
                   {"t": "1,00", "hp": "160", "h": 0.22, "mat": 26}]},
    {"kurz": "Stahltreppe gerade, Wangen Flachstahl, Breite {b} m, je Steigung",
     "lang": "Gerade Stahltreppe mit Flachstahl- bzw. U-Profil-Wangen, Stufen aus Gitterrost oder Riffelblech, "
             "Stufenbreite {b} m, an Decken und Boden verdübelt, Geländer gesondert. Abrechnung je Steigung.",
     "einheit": "St", "kg": "351", "gen": "C", "achsen": [[{"k": "Gitterroststufen", "t": ""}, {"k": "Tränenblechstufen", "t": "Stufen aus Tränenblech mit Kantung.", "mat": 15}], OBERFL_F[2:]],
     "varianten": [{"b": "0,8", "h": 1.6, "mat": 130}, {"b": "1,0", "h": 1.8, "mat": 155}, {"b": "1,2", "h": 2.0, "mat": 185}]},
    {"kurz": "Laufsteg / Wartungsbühne Stahl mit Gitterrost, Breite {b} m",
     "lang": "Laufsteg bzw. Wartungsbühne aus Stahlprofilen mit Gitterrostbelag (Maschenweite 30/10), auf "
             "Konsolen bzw. Stützen, Geländer gesondert. Abrechnung nach Länge.",
     "einheit": "m", "kg": "359", "gen": "C", "achsen": [OBERFL_F[2:], MONT],
     "varianten": [{"b": "0,6", "h": 2.0, "mat": 165}, {"b": "0,8", "h": 2.3, "mat": 205}, {"b": "1,2", "h": 2.8, "mat": 290}]},
    {"kurz": "Thermisch getrennter Anschluss für Stahlträger an Fassade",
     "lang": "Wärmebrückenarmes Anschlusselement für den Anschluss außenliegender Stahlträger an die "
             "Gebäudekonstruktion, mit Zulassung, einschließlich Montage nach Herstellerangabe.",
     "einheit": "St", "kg": "351", "h": 1.2, "mat": 340, "gen": "C"},
]})
L["gruppen"].append({"name": "Bestand, Rückbau", "positionen": [
    {"kurz": "Stahlkonstruktion demontieren, {a}",
     "lang": "Vorhandene Stahlkonstruktion ({a}) nach Abstützen demontieren bzw. brennschneiden, Teile zerlegen "
             "und zur Sammelstelle bringen. Schrotterlös wird mit dem Preis verrechnet. Abrechnung nach Gewicht.",
     "einheit": "kg", "kg": "394", "gen": "C", "lohn": "abbruch", "tags": ["altbau"], "achsen": [MONT],
     "varianten": [{"a": "geschraubt", "h": 0.03, "geraet": 0.05}, {"a": "geschweißt, Brennschnitt", "h": 0.045, "geraet": 0.10},
                   {"a": "mit Bleimennige/Altbeschichtung, Schutzmaßnahmen", "h": 0.07, "geraet": 0.25}]},
    {"kurz": "Stahlbauteile im Bestand verstärken, Lamellen/Profile anschweißen",
     "lang": "Verstärkung bestehender Stahlträger bzw. -stützen nach Statik durch Anschweißen von Flachstahl-Lamellen "
             "oder Profilen, einschließlich Freilegen und Reinigen der Anschlussflächen, Schweißnahtprüfung. "
             "Abrechnung nach Gewicht der Verstärkung.",
     "einheit": "kg", "kg": "351", "h": 0.20, "mat": 2.3, "geraet": 0.3, "gen": "C", "tags": ["altbau"], "achsen": [MONT]},
    {"kurz": "Altbeschichtung Stahl entfernen, {v}",
     "lang": "Vorhandene Beschichtung auf Stahlbauteilen entfernen: {v}. Abfälle sammeln; Entsorgung gesondert. "
             "Abrechnung nach Oberfläche.",
     "einheit": "m²", "kg": "351", "gen": "C", "lohn": "maler", "tags": ["altbau"],
     "varianten": [{"v": "maschinell Sa 2½ (Strahlen)", "h": 0.45, "geraet": 9}, {"v": "Handentrostung St 2", "h": 0.55, "geraet": 1},
                   {"v": "bleihaltig, mit Einhausung und Absaugung", "h": 1.0, "geraet": 22}]},
    {"kurz": "Schweißarbeiten am Bauwerk, Kehlnaht a = {a} mm",
     "lang": "Schweißarbeiten am eingebauten Bauteil, Kehlnaht Nahtdicke a = {a} mm, einschließlich Nahtvorbereitung "
             "und Brandwache. Abrechnung nach Nahtlänge.",
     "einheit": "m", "kg": "351", "gen": "B",
     "varianten": [{"a": "3", "h": 0.35, "mat": 1.5}, {"a": "5", "h": 0.6, "mat": 3}, {"a": "7", "h": 0.95, "mat": 5}]},
    {"kurz": "Kernbohrung / Bohrung in Stahlbauteil, Ø bis {d} mm",
     "lang": "Bohrung in vorhandenes Stahlbauteil am Bauwerk mit Magnetbohrmaschine, Ø bis {d} mm, Materialdicke bis 20 mm, "
             "Grat entfernen, Korrosionsschutz ausbessern.",
     "einheit": "St", "kg": "351", "gen": "B",
     "varianten": [{"d": "18", "h": 0.25, "geraet": 3}, {"d": "26", "h": 0.35, "geraet": 4}, {"d": "50", "h": 0.6, "geraet": 9}]},
    {"kurz": "Statisch-konstruktive Prüfung Bestandsstahl, Probenahme",
     "lang": "Entnahme von Werkstoffproben aus vorhandenen Stahlbauteilen zur Bestimmung der Stahlgüte und "
             "Schweißeignung, Verschließen der Entnahmestelle, Laborprüfung über Fremdleistung.",
     "einheit": "St", "kg": "351", "h": 2.0, "geraet": 420, "gen": "C", "tags": ["altbau"]},
]})
