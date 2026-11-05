# LB 027 Tischlerarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

_TUER = ("Innentürelement komplett liefern und einbauen: Türblatt {blatt}, Oberfläche {ob}, mit Holz-Umfassungszarge, "
         "umlaufende Dichtung, Bänder 2-teilig vernickelt, Einsteckschloss nach Ausführung. Drückergarnitur gesondert. "
         "Einschließlich Montageschaum und Ausrichten.")

# ---------------------------------------------------------------- Ausführungsachsen
GR_W = [{"k": "760 × 2010", "t": "Rohbaurichtmaß 760 × 2010 mm.", "fm": 0.97},
        {"k": "885 × 2010", "t": "Rohbaurichtmaß 885 × 2010 mm."},
        {"k": "1010 × 2010", "t": "Rohbaurichtmaß 1010 × 2010 mm.", "fm": 1.06},
        {"k": "885 × 2135", "t": "Rohbaurichtmaß 885 × 2135 mm (Überhöhe).", "fm": 1.08},
        {"k": "1010 × 2135", "t": "Rohbaurichtmaß 1010 × 2135 mm (Überhöhe).", "fm": 1.13, "fh": 1.05}]
GR_O = [{"k": "885 × 2135", "t": "Rohbaurichtmaß 885 × 2135 mm."},
        {"k": "1010 × 2135", "t": "Rohbaurichtmaß 1010 × 2135 mm.", "fm": 1.08},
        {"k": "1135 × 2135", "t": "Rohbaurichtmaß 1135 × 2135 mm (barrierefrei, lichte Breite ≥ 90 cm).", "fm": 1.18, "fh": 1.08},
        {"k": "1260 × 2135", "t": "Rohbaurichtmaß 1260 × 2135 mm (Überbreite).", "fm": 1.3, "fh": 1.12}]
GR_S = GR_O[:3]
ZARGE = [{"k": "WD 12,5", "t": "Zarge für Wanddicke bis 12,5 cm.", "mat": -10},
         {"k": "WD 17,5", "t": "Zarge für Wanddicke bis 17,5 cm."},
         {"k": "WD 24", "t": "Zarge für Wanddicke bis 24 cm.", "mat": 28},
         {"k": "WD 30", "t": "Zarge für Wanddicke bis 30 cm.", "mat": 52}]
ZARGE3 = ZARGE[1:]
FALZ = [{}, {"k": "stumpf", "t": "Türblatt stumpf einschlagend (flächenbündig) mit verdeckt liegenden 3D-Bändern und Magnetschloss.", "fm": 1.28, "h": 0.4}]
LA = [{}, {"k": "LA", "t": "Mit Lichtausschnitt (LA) ca. 30 × 160 cm, ESG satiniert, Glasleisten.", "mat": 140, "h": 0.2}]
SCHLOSS = [{"k": "BB", "t": "Schloss mit Buntbart (BB)."}, {"k": "PZ", "t": "Schloss für Profilzylinder (PZ) vorgerichtet, Zylinder gesondert.", "mat": 12},
           {"k": "WC", "t": "Bad-/WC-Schloss mit Olive und Notentriegelung, Garnitur gesondert.", "mat": 22}]
ORT = [{}, {"k": "Bestand", "t": "Einbau im Bestand in vorhandene Öffnung (Ausbau Altelement gesondert), Anpassen an unebene Leibungen und Böden, "
            "Beischleifen bzw. Kürzen nach vorhandenem Boden.", "h": 0.8, "gen": "B", "tags": ["altbau"]}]
BR_LA = [{}, {"k": "Brandschutzglas", "t": "Mit Lichtausschnitt aus zugelassenem Brandschutzglas.", "mat": 480, "h": 0.5}]
WE_RC = [{"k": "RC2", "t": "Widerstandsklasse RC 2, Rw,P ≥ 37 dB."}, {"k": "RC3", "t": "Widerstandsklasse RC 3, Rw,P ≥ 42 dB.", "mat": 650, "h": 0.8}]
GLAS_T = [{"k": "klar", "t": "Glas klar."}, {"k": "satiniert", "t": "Glas vollflächig satiniert.", "mat": 45},
          {"k": "Motiv", "t": "Glas mit satiniertem bzw. gelasertem Motiv nach Wahl.", "mat": 130}]
SCH_ART = [{"k": "vor der Wand", "t": "Vor der Wand laufend mit Laufschiene sichtbar."},
           {"k": "Wandtasche", "t": "In bauseitiger Wandtasche (Schiebetürkasten gesondert) mit Futter und Bekleidung.", "mat": 160, "h": 1.0}]
OB3 = [{"k": "Weißlack", "t": "Oberfläche Weißlack."}, {"k": "CPL Dekor", "t": "Oberfläche CPL in Dekor.", "fm": 0.9},
       {"k": "Furnier Eiche", "t": "Oberfläche Echtholzfurnier Eiche.", "fm": 1.25}]
SCHR_T = [{"k": "60 cm tief", "t": "Korpustiefe 60 cm."}, {"k": "40 cm tief", "t": "Korpustiefe 40 cm.", "fm": 0.85, "fh": 0.9}]
SCHR_A = [{"k": "Drehtüren", "t": "Fronten als Drehtüren."}, {"k": "Schiebetüren", "t": "Fronten als Schiebetüren mit Laufschiene und Dämpfung.", "mat": 45, "h": 0.4}]
SCHR_I = [{}, {"k": "mit Schubkästen", "t": "Mit Schubkastenelementen (Vollauszug, gedämpft), anteilig auf die Frontfläche umgelegt.", "mat": 60, "h": 0.4}]
FB_ORT = [{}, {"k": "Austausch", "t": "Austausch im Bestand: alte Fensterbank ausbauen und entsorgen, Untergrund ausgleichen.", "h": 0.35, "geraet": 3, "tags": ["altbau"]}]
HOLZ_T = [{"k": "Buche", "t": "Holzart Buche.", "fm": 0.9}, {"k": "Eiche", "t": "Holzart Eiche."}, {"k": "Nussbaum", "t": "Holzart Amerikanischer Nussbaum.", "fm": 1.45, "gen": "C"}]
OBFL = [{"k": "lackiert", "t": "Oberfläche lackiert (Parkettlack, seidenmatt)."}, {"k": "geölt", "t": "Oberfläche geölt und gewachst.", "fh": 1.05}]
GEL_T = [{"k": "Holzstäbe", "t": "Geländer mit Holzstäben."}, {"k": "Edelstahlgeländer", "t": "Geländer mit Edelstahlstäben bzw. -relingen und Handlauf Holz.", "mat": 900, "h": 3}]
WB_BR = [{}, {"k": "schwer entflammbar", "t": "Plattenmaterial schwer entflammbar (B-s1,d0) mit Nachweis.", "fm": 1.2}]
ORTW = [{}, {"k": "Bestand", "t": "Montage im Bestand auf vorhandenem Untergrund, Unebenheiten ausgleichen.", "fh": 1.2, "tags": ["altbau"]}]
LEISTE_H = [{"k": "60 mm", "t": "Höhe 60 mm."}, {"k": "80 mm", "t": "Höhe 80 mm.", "fm": 1.2}, {"k": "100 mm", "t": "Höhe 100 mm.", "fm": 1.45}]

LBS = [{
    "nr": "027", "name": "Tischlerarbeiten", "atv": "DIN 18355", "lohn": "tischler",
    "gruppen": [
        {"name": "Innentüren", "positionen": [
            {"kurz": "Innentür Röhrenspan {ob}",
             "lang": _TUER, "blatt": "Röhrenspaneinlage, Klimaklasse I, Beanspruchungsgruppe N",
             "einheit": "St", "kg": "344", "gen": "B", "achsen": [GR_W, ZARGE, FALZ, LA, SCHLOSS, ORT],
             "varianten": [{"ob": "CPL weiß", "h": 2.5, "mat": 330}, {"ob": "Weißlack", "h": 2.5, "mat": 410},
                           {"ob": "Furnier Eiche", "h": 2.6, "mat": 520}]},
            {"kurz": "Innentür Vollspan {ob}",
             "lang": _TUER, "blatt": "Vollspaneinlage, Klimaklasse II, Beanspruchungsgruppe M",
             "einheit": "St", "kg": "344", "gen": "B", "achsen": [GR_O, ZARGE3, LA, SCHLOSS, ORT],
             "varianten": [{"ob": "HPL", "h": 3.0, "mat": 620}, {"ob": "Weißlack", "h": 3.0, "mat": 590}]},
            {"kurz": "Innentür Feuchtraum Klimaklasse III, CPL",
             "lang": _TUER.replace("{blatt}", "feuchtraumgeeignet, Klimaklasse III, Kanten umlaufend versiegelt").replace("{ob}", "CPL"),
             "einheit": "St", "kg": "344", "h": 2.6, "mat": 470, "gen": "B", "achsen": [GR_W, ZARGE3, SCHLOSS, ORT]},
            {"kurz": "Schallschutztür Rw {db} dB",
             "lang": _TUER + " Schalldämmung des eingebauten Elements Rw,P ≥ {db} dB, absenkbare Bodendichtung.",
             "blatt": "Schallschutzeinlage", "ob": "HPL", "einheit": "St", "kg": "344", "gen": "C", "achsen": [GR_S, LA, ORT],
             "varianten": [{"db": "32", "h": 4.0, "mat": 1050}, {"db": "37", "h": 4.5, "mat": 1450}, {"db": "42", "h": 5.0, "mat": 1950}]},
            {"kurz": "Wohnungseingangstür Klimaklasse III, Schallschutz, 1010 × 2135",
             "lang": "Wohnungseingangstür als geprüftes Element: Holztürblatt Klimaklasse III, einbruchhemmend nach Ausführung, "
                     "mit Holz- oder Stahlumfassungszarge, Mehrfachverriegelung, Sicherheitsbeschlag mit Ziehschutz, Türspion, "
                     "absenkbare Bodendichtung, Rohbaurichtmaß 1010 × 2135 mm.",
             "einheit": "St", "kg": "344", "h": 5.5, "mat": 2100, "gen": "C", "achsen": [WE_RC, ORT]},
            {"kurz": "Feuerschutztür Holz EI2 30 (T30), {rm}",
             "lang": "Feuerhemmende Holztür EI2 30-C5 nach DIN EN 16034 bzw. Zulassung, mit zugelassener Zarge, "
                     "Obentürschließer, Brandschutzbeschlag, HPL-Oberfläche, Kennzeichnungsschild, Rohbaurichtmaß {rm}.",
             "einheit": "St", "kg": "344", "gen": "C", "achsen": [BR_LA, ORT],
             "varianten": [{"rm": "1010 × 2135 mm", "h": 5.0, "mat": 1650}, {"rm": "2-flg. 2010 × 2135 mm", "h": 8.5, "mat": 3700}]},
            {"kurz": "Rauchschutztür Holz S200, 1010 × 2135",
             "lang": "Rauchschutztür Sa/S200 mit Holztürblatt, umlaufender Dichtung, absenkbarer Bodendichtung und "
                     "Obentürschließer mit Freilauf vorgerichtet, Prüfzeugnis, Rohbaurichtmaß 1010 × 2135 mm.",
             "einheit": "St", "kg": "344", "h": 4.5, "mat": 1350, "gen": "C", "achsen": [BR_LA, ORT]},
            {"kurz": "Ganzglastür ESG 8 mm in Holzzarge, {rm}",
             "lang": "Ganzglas-Drehtür aus ESG 8 mm mit Glastürbeschlag und Studioschloss, in Holz-Umfassungszarge mit "
                     "Glastürbändern, Rohbaurichtmaß {rm}.",
             "einheit": "St", "kg": "344", "gen": "B", "achsen": [GLAS_T, ORT],
             "varianten": [{"rm": "760 × 2010", "h": 2.8, "mat": 590}, {"rm": "885 × 2010", "h": 2.8, "mat": 620}, {"rm": "1010 × 2135", "h": 3.0, "mat": 720}]},
            {"kurz": "Schiebetür Holz bis 1,00 × 2,10 m",
             "lang": "Schiebetürblatt aus Holzwerkstoff mit Lauf- und Führungsschiene, Soft-Close-Dämpfer und Griffmuscheln, "
                     "Türgröße bis 1,00 × 2,10 m.",
             "einheit": "St", "kg": "344", "h": 3.5, "mat": 720, "gen": "B", "achsen": [SCH_ART, OB3, ORT]},
            {"kurz": "Nur Türblatt erneuern in vorhandener Zarge, {ob}",
             "lang": "Neues Türblatt passend zur vorhandenen Zarge (Aufmaß, Bandaufnahmen und Schlosssitz übernehmen) liefern, "
                     "einpassen und einhängen, Oberfläche {ob}, Röhrenspaneinlage, altes Türblatt entsorgen.",
             "einheit": "St", "kg": "344", "gen": "B", "tags": ["altbau"], "achsen": [LA, SCHLOSS],
             "varianten": [{"ob": "CPL weiß", "h": 2.0, "mat": 210}, {"ob": "Weißlack", "h": 2.0, "mat": 280}, {"ob": "Furnier Eiche", "h": 2.1, "mat": 360}]},
            {"kurz": "Renovierungszarge über vorhandene Stahlzarge, mit Türblatt",
             "lang": "Renovierungs- bzw. Überschubzarge aus Holzwerkstoff über vorhandene Stahl- oder Holzzarge montieren "
                     "(ohne Ausbau der Altzarge), mit neuem Türblatt Röhrenspan, Dichtung, Bänder. Drückergarnitur gesondert.",
             "einheit": "St", "kg": "344", "h": 3.0, "mat": 480, "gen": "B", "tags": ["altbau"], "achsen": [OB3, SCHLOSS]},
            {"kurz": "Innentür ausbauen und entsorgen, {art}",
             "lang": "Vorhandene Innentür ausbauen ({art}), Material abfahren und entsorgen einschließlich Gebühren.",
             "einheit": "St", "kg": "394", "gen": "A", "tags": ["altbau"],
             "varianten": [{"art": "Holzzarge/Futter mit Bekleidung", "h": 1.0, "mat": 0, "geraet": 18},
                           {"art": "Stahlzarge herausstemmen, Leibung beiputzfertig", "h": 2.0, "mat": 0, "geraet": 22}]},
            {"kurz": "Türblatt kürzen / anpassen (Bestand)",
             "lang": "Vorhandenes Türblatt aushängen, unten um bis zu 2 cm kürzen (z. B. für Überströmöffnung bei "
                     "Lüftung oder neuen Bodenaufbau), Kante versiegeln, wieder einhängen und einstellen.",
             "einheit": "St", "kg": "344", "h": 1.0, "mat": 5, "gen": "B", "tags": ["altbau"]},
            {"kurz": "Lüftungsgitter in Türblatt einbauen",
             "lang": "Überströmgitter aus Aluminium bzw. Kunststoff beidseitig in Türblatt einbauen, Ausschnitt herstellen, "
                     "freier Querschnitt nach Lüftungskonzept.",
             "einheit": "St", "kg": "344", "h": 0.6, "mat": 28, "gen": "A"},
            {"kurz": "Abseitentür / Kniestocktür, gedämmt, bis 60 × 80 cm",
             "lang": "Abseiten- bzw. Kniestocktür mit gedämmtem Türblatt, Rahmen, umlaufender Dichtung und Magnet- bzw. "
                     "Drückverschluss, luftdicht an die Dampfbremse angeschlossen, bis 60 × 80 cm.",
             "einheit": "St", "kg": "344", "h": 2.0, "mat": 230, "gen": "B"},
        ]},
        {"name": "Einbauten, Möbel", "positionen": [
            {"kurz": "Einbauschrank raumhoch, {ob}",
             "lang": "Einbauschrank raumhoch nach Zeichnung, Korpus aus melaminbeschichteter Spanplatte 19 mm, "
                     "Fronten {ob}, Topfbänder mit Dämpfung, Einlegeböden und Kleiderstange nach Plan, "
                     "Passleisten zu Wand und Decke. Abrechnung nach Frontfläche.",
             "einheit": "m²", "kg": "381", "gen": "C", "achsen": [SCHR_T, SCHR_A, SCHR_I],
             "varianten": [{"ob": "melaminbeschichtet weiß", "h": 2.8, "mat": 230}, {"ob": "lackiert MDF", "h": 3.2, "mat": 330},
                           {"ob": "Echtholzfurnier", "h": 3.4, "mat": 420}]},
            {"kurz": "Garderobe / Wandpaneel mit Haken und Ablage",
             "lang": "Garderobenelement aus beschichteter Holzwerkstoffplatte mit Hutablage, Haken bzw. Kleiderstange "
                     "und Schuhablage nach Zeichnung, an Wand befestigt. Abrechnung nach Länge.",
             "einheit": "m", "kg": "381", "h": 2.0, "mat": 240, "gen": "C", "achsen": [OB3]},
            {"kurz": "Thekenanlage / Empfangstheke, Holzwerkstoff mit HPL",
             "lang": "Empfangs- bzw. Ausgabetheke nach Zeichnung aus Holzwerkstoff, Oberflächen HPL, Arbeitshöhe und "
                     "erhöhte Ablage, Kabeldurchlässe, abschließbare Unterschränke, barrierefreier Teil mit "
                     "Unterfahrbarkeit. Abrechnung nach Länge.",
             "einheit": "m", "kg": "381", "h": 9.0, "mat": 1150, "gen": "C"},
            {"kurz": "Küchenarbeitsplatte {ob}, Tiefe 60 cm",
             "lang": "Arbeitsplatte {ob}, Tiefe 60 cm, auf bauseitige Unterschränke montiert, einschließlich "
                     "Wandabschlussleiste und Kantenversiegelung. Ausschnitte gesondert. Abrechnung nach Länge.",
             "einheit": "m", "kg": "381", "gen": "C",
             "varianten": [{"ob": "Schichtstoff 38 mm", "h": 1.0, "mat": 95}, {"ob": "Massivholz Buche/Eiche 40 mm", "h": 1.3, "mat": 240},
                           {"ob": "Kompaktplatte 12 mm", "h": 1.4, "mat": 280}]},
            {"kurz": "Ausschnitt in Arbeitsplatte, {art}",
             "lang": "Ausschnitt in Arbeitsplatte für {art} nach Schablone herstellen, Schnittkanten versiegeln.",
             "einheit": "St", "kg": "381", "gen": "A",
             "varianten": [{"art": "Einbauspüle/Kochfeld aufliegend", "h": 0.8, "mat": 5}, {"art": "Unterbauspüle mit polierter Kante", "h": 1.8, "mat": 15},
                           {"art": "Steckdose/Armatur", "h": 0.3, "mat": 2}]},
            {"kurz": "Teeküche / Pantry komplett, Länge {l} m",
             "lang": "Teeküchenzeile mit Unterschränken, Oberschränken, Arbeitsplatte, Einbauspüle mit Armatur, "
                     "Kühlschrank unterbaufähig und Zweiplatten-Kochfeld bzw. Mikrowelle, Fronten beschichtet, "
                     "Länge {l} m; Anschlüsse Wasser/Abwasser/Strom bauseits vorbereitet.",
             "einheit": "St", "kg": "381", "gen": "C",
             "varianten": [{"l": "1,80", "h": 10, "mat": 2400}, {"l": "2,40", "h": 12, "mat": 3200}, {"l": "3,00", "h": 14, "mat": 4100}]},
            {"kurz": "Waschtischunterschrank / Badmöbel nach Maß, Breite bis {b} cm",
             "lang": "Waschtischunterschrank nach Maß aus feuchtebeständiger Holzwerkstoffplatte mit Schubkästen bzw. Türen, "
                     "Aussparungen für Siphon, wandhängend montiert, Breite bis {b} cm.",
             "einheit": "St", "kg": "381", "gen": "C", "achsen": [OB3],
             "varianten": [{"b": "80", "h": 3.0, "mat": 520}, {"b": "120", "h": 3.5, "mat": 720}]},
            {"kurz": "Regal / Wandboard nach Maß, Tiefe bis 40 cm",
             "lang": "Regal aus Holzwerkstoff bzw. Massivholz nach Zeichnung mit festen und verstellbaren Böden, an Wand "
                     "befestigt. Abrechnung nach Ansichtsfläche.",
             "einheit": "m²", "kg": "381", "h": 2.2, "mat": 160, "gen": "C", "achsen": [OB3]},
            {"kurz": "Sitzbank / Fensterbank als Möbel, Massivholz",
             "lang": "Sitzbank bzw. tiefe Fensterbank als Möbel aus Massivholz, Tiefe bis 50 cm, "
                     "mit Unterkonstruktion an Wand und Boden befestigt. Abrechnung nach Länge.",
             "einheit": "m", "kg": "381", "h": 2.5, "mat": 260, "gen": "C", "achsen": [HOLZ_T, OBFL]},
            {"kurz": "Spind / Garderobenschrank Stahl-Holz, 2-türig",
             "lang": "Garderobenschrank für Personal, zweiabteilig, Korpus Stahl pulverbeschichtet, Türen Holzwerkstoff "
                     "HPL, Zylinderschloss, Hutboden und Kleiderstange, auf Sockel, 80 × 50 × 180 cm.",
             "einheit": "St", "kg": "611", "h": 0.8, "mat": 560, "gen": "B"},
            {"kurz": "Heizkörperverkleidung Holz/MDF mit Lochblech",
             "lang": "Heizkörperverkleidung aus MDF lackiert mit Lochblech- bzw. Lamellenfront, abnehmbar, mit Abdeckplatte. "
                     "Abrechnung nach Länge.", "einheit": "m", "kg": "381", "h": 1.8, "mat": 140, "gen": "C"},
        ]},
        {"name": "Fensterbänke, Bekleidungen, Treppen", "positionen": [
            {"kurz": "Fensterbank innen {ob}, Tiefe bis {t} mm",
             "lang": "Innenfensterbank {ob}, Tiefe bis {t} mm, vorn gerundete Kante, seitliche Einputzenden, auf "
                     "Montagekleber bzw. Quellmörtel verlegt, mit Fuge zum Fensterrahmen. Abrechnung nach Länge.",
             "einheit": "m", "kg": "345", "gen": "A", "achsen": [FB_ORT],
             "varianten": [{"ob": "Holzwerkstoff beschichtet", "t": "250", "h": 0.45, "mat": 28},
                           {"ob": "Holzwerkstoff beschichtet", "t": "350", "h": 0.5, "mat": 38},
                           {"ob": "Holzwerkstoff beschichtet", "t": "500", "h": 0.55, "mat": 52},
                           {"ob": "Massivholz Eiche", "t": "250", "h": 0.55, "mat": 72},
                           {"ob": "Massivholz Eiche", "t": "350", "h": 0.6, "mat": 95}]},
            {"kurz": "Wandbekleidung {ob}",
             "lang": "Wandbekleidung aus {ob} auf Lattung bzw. Systemunterkonstruktion, einschließlich Abschluss- "
                     "und Eckausbildung sowie Aussparungen für Schalter. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "345", "gen": "C", "achsen": [WB_BR, ORTW],
             "varianten": [{"ob": "Furnierplatte Eiche, geschlossen", "h": 1.6, "mat": 95},
                           {"ob": "Akustikpaneel gelocht mit Vlies", "h": 1.8, "mat": 135},
                           {"ob": "Holzlamellen auf Akustikfilz", "h": 1.5, "mat": 115},
                           {"ob": "Holz-Nut-und-Feder-Profilbrett", "h": 1.2, "mat": 45}]},
            {"kurz": "Deckenbekleidung Holz, {ob}",
             "lang": "Deckenbekleidung aus {ob} auf Lattung (Lattung gesondert), verdeckt befestigt, einschließlich "
                     "Randabschlüsse und Ausschnitte für Leuchten. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "353", "gen": "B", "achsen": [WB_BR, ORTW],
             "varianten": [{"ob": "Profilbretter Fichte", "h": 1.0, "mat": 32}, {"ob": "Akustik-Holzpaneele", "h": 1.3, "mat": 120}]},
            {"kurz": "Sockelleiste {ob}",
             "lang": "Sockelleiste {ob}, mit Clips bzw. verdeckt geschraubt, Ecken auf Gehrung. Abrechnung nach Länge.",
             "einheit": "m", "kg": "352", "gen": "A", "achsen": [LEISTE_H, ORTW],
             "varianten": [{"ob": "MDF weiß foliert", "h": 0.12, "mat": 4.5}, {"ob": "MDF weiß lackiert", "h": 0.12, "mat": 6},
                           {"ob": "Massivholz Eiche", "h": 0.15, "mat": 11}]},
            {"kurz": "Holztreppe {typ}",
             "lang": "Innentreppe als {typ} aus Massivholz, Stufen 40 mm, einschließlich Handlauf einseitig und Geländer, "
                     "Statik und Aufmaß durch AN, Geschosshöhe bis 2,90 m.",
             "einheit": "St", "kg": "351", "gen": "C", "achsen": [HOLZ_T, GEL_T],
             "varianten": [{"typ": "Wangentreppe gerade", "h": 22, "mat": 5200}, {"typ": "Wangentreppe viertelgewendelt", "h": 28, "mat": 7200},
                           {"typ": "Bolzentreppe halbgewendelt", "h": 32, "mat": 9600}]},
            {"kurz": "Treppenstufen Holz auf Betontreppe, {d} mm",
             "lang": "Trittstufen aus Massivholz, Dicke {d} mm, mit Setzstufe, vollflächig verklebt auf "
                     "Stahlbetontreppe, Vorderkante gefast. Abrechnung je Stufe bis 1,00 m Breite.",
             "einheit": "St", "kg": "352", "gen": "B", "achsen": [HOLZ_T, OBFL],
             "varianten": [{"d": "30", "h": 1.5, "mat": 140}, {"d": "40", "h": 1.6, "mat": 175}]},
            {"kurz": "Holztreppe renovieren: Stufen schleifen und versiegeln",
             "lang": "Vorhandene Holztreppe: Tritt- und Setzstufen bis auf rohes Holz schleifen, Fehlstellen kitten, "
                     "Oberfläche neu versiegeln. Abrechnung je Stufe.",
             "einheit": "St", "kg": "352", "h": 1.0, "mat": 9, "gen": "B", "tags": ["altbau"], "achsen": [OBFL], "lohn": "parkett"},
            {"kurz": "Renovierungsstufen auf vorhandene Treppe (Überdeckung)",
             "lang": "Renovierungsstufen (Tritt- und Setzstufen-Überdeckung) aus Holzwerkstoff mit Echtholz- bzw. "
                     "Laminatoberfläche und Kantenprofil auf vorhandene Stufen aufkleben. Abrechnung je Stufe.",
             "einheit": "St", "kg": "352", "h": 1.2, "mat": 95, "gen": "B", "tags": ["altbau"]},
            {"kurz": "Bodentreppe / Dachbodentreppe gedämmt, {art}",
             "lang": "Bodeneinschubtreppe mit gedämmtem Deckel (U ≤ 0,8 W/(m²K)), luftdicht, Lukenmaß ca. 120 × 70 cm, "
                     "{art}, einschließlich Anschluss an die Dampfbremse.",
             "einheit": "St", "kg": "359", "gen": "B",
             "varianten": [{"art": "Holzleiter 3-teilig", "h": 3.5, "mat": 420}, {"art": "Scherentreppe Stahl", "h": 3.5, "mat": 680},
                           {"art": "Holzleiter, Feuerwiderstand EI 30", "h": 4.0, "mat": 1150}]},
            {"kurz": "Revisionsklappe / Verkleidung Installationsschacht Holz",
             "lang": "Verkleidung von Installationsschächten bzw. Vorwänden mit Holzwerkstoffplatte beschichtet, mit "
                     "abnehmbarer Revisionsklappe auf Magnetverschluss. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "345", "h": 1.6, "mat": 70, "gen": "B"},
            {"kurz": "Türbekleidung / Futter erneuern, Bestand",
             "lang": "Vorhandene Türbekleidung bzw. Futter abnehmen und durch neue Bekleidung aus MDF bzw. Massivholz "
                     "ersetzen, an das vorhandene Türblatt angepasst. Abrechnung je Tür.",
             "einheit": "St", "kg": "344", "h": 1.8, "mat": 95, "gen": "B", "tags": ["altbau"]},
        ]},
    ],
}]
