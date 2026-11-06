# LB 016 Zimmer- und Holzbauarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "016", "name": "Zimmer- und Holzbauarbeiten", "atv": "DIN 18334", "lohn": "zimmerer",
    "gruppen": [
        {"name": "Dachtragwerke", "positionen": [
            {"kurz": "Dachtragwerk {m}",
             "lang": "Dachtragwerk (Sparren, Pfetten, Kehlbalken, Stiele, Streben) aus {m}, Festigkeitsklasse nach "
                     "Statik, technisch getrocknet, nach Abbundplan abbinden bzw. CNC-abbinden und aufstellen, einschließlich "
                     "Verbindungsmittel (Schrauben, Nägel, Stabdübel, Winkel) und Hilfskonstruktion. Abrechnung nach "
                     "Holzliste in m³ Abbundholz.",
             "einheit": "m³", "kg": "361", "gen": "B",
             "varianten": [{"m": "KVH C24 Nadelholz", "h": 8.5, "mat": 540},
                           {"m": "BSH GL24h Fichte", "h": 8.0, "mat": 760},
                           {"m": "BSH GL28h Fichte", "h": 9.5, "mat": 900},
                           {"m": "Bauschnittholz S10/C24", "h": 9.0, "mat": 430}]},
            {"kurz": "Sparren KVH C24, {q} mm",
             "lang": "Sparren aus Konstruktionsvollholz KVH C24, Querschnitt {q} mm, gehobelt und gefast, nach "
                     "Statik abbinden, auf Pfetten bzw. Fußschwelle aufkerven und mit Sparrenpfettenankern bzw. Schrauben "
                     "befestigen. Abrechnung nach Sparrenlänge.",
             "einheit": "m", "kg": "361", "gen": "B",
             "varianten": [{"q": "80 × 180", "h": 0.30, "mat": 8.5}, {"q": "80 × 200", "h": 0.33, "mat": 9.5},
                           {"q": "100 × 220", "h": 0.38, "mat": 13.0}, {"q": "100 × 240", "h": 0.40, "mat": 14.2},
                           {"q": "120 × 260", "h": 0.45, "mat": 18.5}]},
            {"kurz": "Pfette / Unterzug BSH GL24h, {q} mm",
             "lang": "Pfette bzw. Holzunterzug aus Brettschichtholz GL24h, Querschnitt {q} mm, gehobelt, Kanten gefast, "
                     "einschließlich Auflagerausbildung und Verankerung (Stahlformteile gesondert). Abrechnung nach Länge.",
             "einheit": "m", "kg": "361", "gen": "B",
             "varianten": [{"q": "120 × 240", "h": 0.42, "mat": 23}, {"q": "140 × 280", "h": 0.50, "mat": 31},
                           {"q": "160 × 320", "h": 0.60, "mat": 40}, {"q": "200 × 400", "h": 0.70, "mat": 63}]},
            {"kurz": "Fußschwelle / Mauerlatte KVH, {q} mm, mit Verankerung",
             "lang": "Fußschwelle bzw. Mauerlatte aus KVH C24, Querschnitt {q} mm, auf Ringbalken mit Feuchtesperre "
                     "verlegen und mit Ankerschrauben bzw. Schwerlastankern nach Statik befestigen.",
             "einheit": "m", "kg": "361", "gen": "A",
             "varianten": [{"q": "120 × 120", "h": 0.45, "mat": 13}, {"q": "140 × 160", "h": 0.55, "mat": 18}]},
            {"kurz": "Stahlformteile / Holzverbinder, verzinkt",
             "lang": "Holzverbinder (Balkenschuhe, Winkelverbinder, Sparrenpfettenanker, Stützenfüße, Zuganker) aus "
                     "feuerverzinktem Stahl, nach Statik, mit zugelassenen Verbindungsmitteln montieren. Abrechnung nach Gewicht.",
             "einheit": "kg", "kg": "361", "h": 0.10, "mat": 6.8, "gen": "B"},
            {"kurz": "Dachgaube {a}, Holz, Breite bis {b} m",
             "lang": "Dachgaube als {a} in Holzkonstruktion herstellen: Wechsel im Sparrenfeld, Gaubenwangen, "
                     "Gaubendach, Brüstungs- und Sturzriegel aus KVH, einschließlich Verbindungsmittel; Eindeckung, "
                     "Dämmung, Bekleidung und Fenster gesondert. Außenbreite bis {b} m.",
             "einheit": "St", "kg": "361", "gen": "C",
             "varianten": [{"a": "Schleppgaube", "b": "2,5", "h": 32, "mat": 1150}, {"a": "Satteldachgaube", "b": "2,0", "h": 38, "mat": 1250},
                           {"a": "Flachdachgaube", "b": "3,5", "h": 42, "mat": 1600}]},
            {"kurz": "Sparrenwechsel, Öffnung bis {b} m",
             "lang": "Wechsel im Sparrenfeld für Dachflächenfenster, Schornstein- oder Lüftungsdurchgang herstellen, "
                     "Wechselhölzer KVH im Querschnitt der Sparren, mit Balkenschuhen angeschlossen. Lichte Öffnung bis {b} m.",
             "einheit": "St", "kg": "361", "gen": "B",
             "varianten": [{"b": "1,0", "h": 2.5, "mat": 45}, {"b": "1,5", "h": 3.5, "mat": 70}]},
            {"kurz": "Vordach/Carport Holz BSH, bis {a} m²",
             "lang": "Vordach als Holzkonstruktion aus Brettschichtholz (Stützen, Pfetten, Sparren), gehobelt, mit "
                     "konstruktivem Holzschutz, Stützenfüße feuerverzinkt auf bauseitigen Fundamenten; Dachdeckung "
                     "gesondert. Dachfläche bis {a} m².",
             "einheit": "St", "kg": "369", "gen": "C", "tags": ["aussen"],
             "varianten": [{"a": "4", "h": 14, "mat": 900}, {"a": "18", "h": 38, "mat": 2900}]},
        ]},
        {"name": "Schalungen, Lattungen, Unterdeckung", "positionen": [
            {"kurz": "Dachschalung {m}, {d} mm",
             "lang": "Dachschalung aus {m}, Dicke {d} mm, auf Sparren verlegt und verschraubt bzw. genagelt, Stöße auf "
                     "Sparren, einschließlich Zuschnitt an Graten, Kehlen und Durchdringungen.",
             "einheit": "m²", "kg": "361", "gen": "A",
             "varianten": [{"m": "Nadelholz-Rauspund", "d": "24", "h": 0.30, "mat": 17}, {"m": "OSB/3-Platten, N+F", "d": "22", "h": 0.25, "mat": 13.5},
                           {"m": "Sichtschalung Fichte gehobelt, N+F", "d": "19", "h": 0.40, "mat": 21}, {"m": "Holzfaserdämmplatte als Unterdeck", "d": "35", "h": 0.25, "mat": 17}]},
            {"kurz": "Unterdeckbahn diffusionsoffen, auf Sparren/Schalung",
             "lang": "Diffusionsoffene Unterdeck- bzw. Unterspannbahn (sd ≤ 0,1 m), regensicher nach ZVDH-Regeln, "
                     "mit Überlappungen und Klebebändern, an Traufe, First und Durchdringungen angeschlossen.",
             "einheit": "m²", "kg": "363", "h": 0.08, "mat": 3.4, "gen": "A"},
            {"kurz": "Konterlattung Nadelholz {q} mm",
             "lang": "Konterlattung aus imprägniertem Nadelholz, sortiert S10, Querschnitt {q} mm, auf den Sparren "
                     "über der Unterdeckung genagelt bzw. geschraubt.",
             "einheit": "m²", "kg": "363", "gen": "A",
             "varianten": [{"q": "30 × 50", "h": 0.06, "mat": 1.6}, {"q": "40 × 60", "h": 0.07, "mat": 2.3}, {"q": "60 × 60", "h": 0.08, "mat": 3.5}]},
            {"kurz": "Traufbohle / Traufausbildung mit Lüftungsgitter",
             "lang": "Traufausbildung mit Traufbohle bzw. Keilbohle, Insektenschutz-Lüftungsgitter und Anschluss der "
                     "Unterdeckbahn an das Traufblech (Traufblech gesondert).",
             "einheit": "m", "kg": "363", "h": 0.25, "mat": 6.5, "gen": "A"},
            {"kurz": "Dachüberstand bekleiden, Profilholz Fichte",
             "lang": "Untersicht des Dach- bzw. Ortgangüberstands mit Profilholz Fichte, 19 mm, gehobelt, mit "
                     "werkseitiger Grundierung auf Unterkonstruktion bekleiden, Hinterlüftung sicherstellen. Breite bis 60 cm.",
             "einheit": "m²", "kg": "363", "h": 0.85, "mat": 28, "gen": "B"},
            {"kurz": "Stirnbrett / Ortgangbrett, Lärche/Fichte, 24 × {b} mm",
             "lang": "Stirn- bzw. Ortgangbrett, Fichte oder Lärche, gehobelt, 24 × {b} mm, mit Edelstahlschrauben befestigt.",
             "einheit": "m", "kg": "363", "gen": "A",
             "varianten": [{"b": "200", "h": 0.22, "mat": 6.5}, {"b": "300", "h": 0.26, "mat": 9.5}]},
        ]},
        {"name": "Dämmung am Dach", "positionen": [
            {"kurz": "Zwischensparrendämmung MW WLS {w}, {d} mm",
             "lang": "Wärmedämmung zwischen den Sparren aus Mineralwolle-Klemmfilz, Baustoffklasse A1, WLS {w}, "
                     "Dicke {d} mm, passgenau und fugenlos eingeklemmt.",
             "einheit": "m²", "kg": "363", "gen": "A",
             "varianten": [{"w": "035", "d": "160", "h": 0.18, "mat": 11}, {"w": "035", "d": "200", "h": 0.20, "mat": 13.5},
                           {"w": "032", "d": "240", "h": 0.22, "mat": 19}]},
            {"kurz": "Zwischensparrendämmung Holzfaser, {d} mm",
             "lang": "Wärmedämmung zwischen Sparren bzw. Ständern aus flexiblen Holzfaserdämmmatten, WLS 038, "
                     "Dicke {d} mm, mit Übermaß eingeklemmt.",
             "einheit": "m²", "kg": "363", "gen": "A",
             "varianten": [{"d": "160", "h": 0.20, "mat": 19}, {"d": "200", "h": 0.22, "mat": 24}, {"d": "240", "h": 0.25, "mat": 29}]},
            {"kurz": "Einblasdämmung Zellulose/Holzfaser in Hohlräume",
             "lang": "Hohlraumdämmung aus losen Zellulose- oder Holzfaserflocken mit bauaufsichtlicher Zulassung, "
                     "maschinell in geschlossene Gefache eingeblasen, Rohdichte nach Zulassung, mit Prüfprotokoll. "
                     "Abrechnung nach Volumen.",
             "einheit": "m³", "kg": "363", "h": 1.2, "mat": 48, "geraet": 12, "gen": "B"},
            {"kurz": "Aufsparrendämmung {m}, {d} mm",
             "lang": "Aufsparrendämmsystem aus {m}, Dicke {d} mm, mit Nut und Feder, auf Dampfbremse über Sichtschalung "
                     "verlegt, einschließlich Systemkonterlatten und Langschrauben nach Herstellerbemessung.",
             "einheit": "m²", "kg": "363", "gen": "B",
             "varianten": [{"m": "PIR, kaschiert, WLS 023", "d": "140", "h": 0.40, "mat": 46},
                           {"m": "PIR, kaschiert, WLS 023", "d": "180", "h": 0.45, "mat": 56},
                           {"m": "Holzfaser WLS 040", "d": "160", "h": 0.50, "mat": 52},
                           {"m": "Holzfaser WLS 040", "d": "200", "h": 0.55, "mat": 64}]},
            {"kurz": "Dampfbremse feuchtevariabel, luftdicht verklebt",
             "lang": "Feuchtevariable Dampfbrems- und Luftdichtheitsbahn auf der Rauminnenseite, Stöße und Anschlüsse "
                     "an Wände, Durchdringungen und Fenster mit systemzugehörigen Klebebändern und Dichtmassen luftdicht verklebt.",
             "einheit": "m²", "kg": "363", "h": 0.12, "mat": 4.5, "gen": "A"},
            {"kurz": "Dämmung oberste Geschossdecke begehbar, {d} mm",
             "lang": "Wärmedämmung der obersten Geschossdecke aus Mineralwolle- bzw. Holzfaserplatten, Dicke {d} mm, "
                     "mit begehbarer Abdeckung aus OSB-Platten 22 mm in den Laufbereichen, einschließlich Dampfbremse.",
             "einheit": "m²", "kg": "352", "gen": "B", "tags": ["altbau"],
             "varianten": [{"d": "160", "h": 0.45, "mat": 30}, {"d": "240", "h": 0.50, "mat": 40}]},
        ]},
        {"name": "Holzrahmenbau, Wände", "positionen": [
            {"kurz": "Holzrahmenwand außen, Ständer {q} mm, gedämmt",
             "lang": "Tragende Außenwand in Holzrahmenbauweise (vorgefertigte Elemente): Ständer, Schwellen und Rähme aus "
                     "KVH C24, Querschnitt {q} mm, Gefachdämmung Mineralwolle bzw. Holzfaser, innen OSB/3 als aussteifende "
                     "und luftdichte Ebene mit verklebten Stößen, außen Holzfaserplatte 60 mm als putzfähiger Untergrund. "
                     "Einschließlich Montage, Kran und Anschlüsse. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "331", "gen": "B", "tags": ["neubau"],
             "varianten": [{"q": "60 × 160", "h": 1.5, "mat": 108}, {"q": "60 × 200", "h": 1.6, "mat": 120},
                           {"q": "60 × 240", "h": 1.7, "mat": 134}]},
            {"kurz": "Holzrahmenwand innen tragend, 60 × 120 mm, OSB",
             "lang": "Tragende Innenwand in Holzrahmenbauweise, Ständer KVH 60 × 120 mm, Hohlraumdämmung Mineralwolle "
                     "60 mm, beidseitig OSB/3 15 mm; Gipskarton-Bekleidung gesondert. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "341", "h": 1.0, "mat": 52, "gen": "B"},
            {"kurz": "Installationsebene Lattung 40/60 mm, Dämmung 40 mm",
             "lang": "Installationsebene vor der luftdichten Schicht aus Lattung 40 × 60 mm, Abstand 62,5 cm, "
                     "mit Hohlraumdämmung Mineralwolle 40 mm; Bekleidung gesondert.",
             "einheit": "m²", "kg": "336", "h": 0.35, "mat": 8.5, "gen": "A"},
            {"kurz": "Holzfassade Boden-Deckel/Rhombus, {m}",
             "lang": "Hinterlüftete Fassadenbekleidung aus {m}, Dicke 24 mm, auf senkrechter bzw. waagerechter "
                     "Traglattung mit Edelstahlschrauben verdeckt bzw. sichtbar befestigt, mit Insektenschutzgitter an "
                     "Lüftungsöffnungen, einschließlich Eckausbildungen. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "335", "gen": "C",
             "varianten": [{"m": "sibirischer Lärche, sägerau", "h": 1.1, "mat": 58}, {"m": "Douglasie, gehobelt", "h": 1.1, "mat": 52},
                           {"m": "thermobehandelter Kiefer", "h": 1.1, "mat": 72}]},
        ]},
        {"name": "Decken, Massivholz", "positionen": [
            {"kurz": "Holzbalkendecke KVH {q} mm, gedämmt",
             "lang": "Holzbalkendecke aus KVH C24, Querschnitt {q} mm, Achsabstand nach Statik, auf Auflagern "
                     "verankert, mit Hohlraumdämmung Mineralwolle 100 mm; obere Beplankung und Fußbodenaufbau gesondert. "
                     "Abrechnung nach Deckenfläche.",
             "einheit": "m²", "kg": "351", "gen": "B",
             "varianten": [{"q": "100 × 200", "h": 0.50, "mat": 36}, {"q": "120 × 240", "h": 0.58, "mat": 46}]},
            {"kurz": "Brettsperrholz (CLT) {d} mm, {s}",
             "lang": "Massivholzbauteil aus Brettsperrholz, Dicke {d} mm, {s}, nach Werkplanung vorgefertigt "
                     "mit Aussparungen, mit Kran montiert, Fugen und Stöße mit Stufenfalz verschraubt und luftdicht abgeklebt. "
                     "Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "351", "gen": "C",
             "varianten": [{"d": "140", "s": "Decke, Nichtsichtqualität", "h": 0.55, "mat": 118},
                           {"d": "200", "s": "Decke, Nichtsichtqualität", "h": 0.60, "mat": 162},
                           {"d": "160", "s": "Decke, Wohnsichtqualität", "h": 0.65, "mat": 158}]},
            {"kurz": "Brettsperrholz (CLT) Wand {d} mm, {s}",
             "lang": "Wandbauteil aus Brettsperrholz, Dicke {d} mm, {s}, nach Werkplanung vorgefertigt mit Aussparungen, "
                     "mit Kran montiert, Stöße verschraubt und luftdicht abgeklebt. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "341", "gen": "C",
             "varianten": [{"d": "100", "s": "Nichtsichtqualität", "h": 0.55, "mat": 88}, {"d": "120", "s": "Wohnsichtqualität", "h": 0.62, "mat": 118}]},
            {"kurz": "Holzbalkendecke Bestand: Balkenkopf ausbessern / anlaschen",
             "lang": "Geschädigten Balkenkopf einer Holzbalkendecke freilegen, geschädigtes Holz entfernen und mit "
                     "beidseitigen Laschen aus KVH bzw. Stahlprofilen nach Statik verstärken, Auflager neu herstellen.",
             "einheit": "St", "kg": "351", "h": 7.0, "mat": 120, "gen": "C", "tags": ["altbau"]},
            {"kurz": "Blindboden / Rauspundboden auf Balkenlage, 24 mm",
             "lang": "Rauspundboden aus Nadelholz, 24 mm, auf Holzbalkenlage verlegt und genagelt bzw. geschraubt, "
                     "als Unterlage für Trockenestrich oder Dielen.",
             "einheit": "m²", "kg": "352", "h": 0.32, "mat": 18, "gen": "A"},
            {"kurz": "Holztreppe / Dachbodentreppe (Einschubtreppe), gedämmt",
             "lang": "Wärmegedämmte Bodeneinschubtreppe mit luftdichtem Kasten, U-Wert ≤ 0,8 W/(m²K), Öffnung ca. "
                     "70 × 130 cm, einschließlich Einbau in vorhandenen Wechsel und Anschluss an die Luftdichtheitsebene.",
             "einheit": "St", "kg": "352", "h": 4.0, "mat": 640, "gen": "B"},
        ]},
        {"name": "Holzschutz, Abbruch, Sonstiges", "positionen": [
            {"kurz": "Chemischer Holzschutz, vorbeugend, Gefährdungsklasse {gk}",
             "lang": "Vorbeugenden chemischen Holzschutz nach DIN 68800-3 mit zugelassenem Holzschutzmittel für "
                     "Gebrauchsklasse {gk} im Streich- oder Sprühverfahren an allen Seiten aufbringen; nur wo konstruktiver "
                     "Holzschutz nicht ausreicht. Abrechnung nach behandelter Holzoberfläche.",
             "einheit": "m²", "kg": "361", "gen": "A",
             "varianten": [{"gk": "GK 1–2", "h": 0.06, "mat": 1.6}, {"gk": "GK 3", "h": 0.08, "mat": 2.4}]},
            {"kurz": "Dachstuhl Bestand: Bekämpfung Hausbock/Anobien, Heißluftverfahren",
             "lang": "Bekämpfung von Holzschädlingen im bestehenden Dachstuhl im Heißluftverfahren mit Temperaturmessung "
                     "im Holzquerschnitt (≥ 55 °C über mindestens 60 Minuten), einschließlich Protokoll. Abrechnung nach "
                     "behandelter Grundfläche.",
             "einheit": "m²", "kg": "395", "h": 0.45, "mat": 2, "geraet": 9, "gen": "C", "tags": ["altbau"]},
            {"kurz": "Dachstuhl Bestand: Holzbauteil austauschen, Querschnitt bis {q} cm",
             "lang": "Schadhaftes Holzbauteil (Sparren, Kehlbalken, Strebe) im Bestand abstützen, ausbauen, entsorgen "
                     "und durch neues KVH gleichen Querschnitts ersetzen, kraftschlüssig anschließen. Querschnitt bis {q} cm.",
             "einheit": "m", "kg": "361", "gen": "C", "tags": ["altbau"],
             "varianten": [{"q": "10 × 20", "h": 1.6, "mat": 14}, {"q": "16 × 24", "h": 2.2, "mat": 24}]},
            {"kurz": "Sparren aufdoppeln für höhere Dämmstärke, +{d} mm",
             "lang": "Vorhandene Sparren seitlich bzw. oberseitig mit KVH-Bohlen um {d} mm aufdoppeln, verschraubt, "
                     "zur Aufnahme einer stärkeren Zwischensparrendämmung. Abrechnung nach Dachfläche.",
             "einheit": "m²", "kg": "363", "gen": "B", "tags": ["altbau"],
             "varianten": [{"d": "60", "h": 0.35, "mat": 6.5}, {"d": "100", "h": 0.40, "mat": 9.5}]},
            {"kurz": "Holzbauteile abbrechen (Dachstuhl, Decke), entsorgen",
             "lang": "Holzkonstruktion (Dachstuhl, Balkenlage, Bekleidungen) abbrechen, Nägel ziehen, sortenrein "
                     "(Altholz A I–A IV) trennen, verladen und entsorgen einschließlich Gebühren. Abrechnung nach "
                     "Dach- bzw. Deckenfläche.",
             "einheit": "m²", "kg": "394", "h": 0.55, "geraet": 9, "gen": "C", "tags": ["altbau"]},
            {"kurz": "Stundenlohnarbeiten Zimmerer (Facharbeiter)",
             "lang": "Stundenlohnarbeiten nur auf Anordnung der Bauleitung, Nachweis durch Stundenzettel. Verrechnungssatz "
                     "Facharbeiter einschließlich Werkzeug und Kleingerät.",
             "einheit": "h", "kg": "361", "h": 1.0, "mat": 0, "geraet": 2, "gen": "A"},
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


HOLZ_KVH = [{"k": "Fichte/Tanne", "t": "Holzart Fichte/Tanne."},
            {"k": "Kiefer", "t": "Holzart Kiefer.", "fm": 1.05},
            {"k": "Douglasie", "t": "Holzart Douglasie, kerngetrennt.", "fm": 1.28},
            {"k": "Lärche", "t": "Holzart Lärche, kerngetrennt.", "fm": 1.38},
            {"k": "Eiche D30 statt KVH", "t": "Abweichend Eichen-Vollholz D30 (Laubholz, Sortierung nach DIN 4074-5) statt Nadelholz-KVH C24, getrocknet.", "fm": 2.7, "fh": 1.25, "gen": "C"}]
HOLZ_BSH = [{"k": "Fichte", "t": "Lamellen aus Fichte."}, {"k": "Lärche", "t": "Lamellen aus Lärche.", "fm": 1.45, "gen": "C"}]
OBERFL = [{"ersetze": [[r",? gehobelt(,| und)?( Kanten)? gefast", ""], [r",? gehobelt(?=,)", ""]], "k": "nicht sichtbar", "t": "Oberfläche nicht sichtbar, egalisiert bzw. sägerau."},
          {"k": "sichtbar", "t": "Sichtbar bleibend: gehobelt, Kanten gefast, Verbindungsmittel verdeckt soweit möglich.", "fh": 1.12, "fm": 1.06},
          {"k": "Sichtqualität", "t": "Hohe Sichtqualität: ausgesuchte Ware, geschliffen, Endbeschichtung Lasur farblos.", "fh": 1.28, "fm": 1.12, "mat": 2.0}]
DN = [{"k": "≤35°", "t": "Dachneigung bis 35°."}, {"k": "35–50°", "t": "Dachneigung über 35° bis 50°.", "fh": 1.10},
      {"k": ">50°", "t": "Dachneigung über 50°.", "fh": 1.22}]
FORM = [{}, {"k": "gegliedert", "t": "Dachfläche gegliedert (Walme, Gauben, Kehlen), erhöhter Zuschnitt.", "fh": 1.18, "fm": 1.05}]
ORT = [{}, {"k": "Bestand", "t": "Ausführung im Bestand: Anpassen an vorhandene, nicht maßhaltige Konstruktion, Transport von Hand.",
            "fh": 1.30, "fm": 1.04, "gen": "B", "tags": ["altbau"]}]
EINBAU = [{}, {"k": "von innen", "t": "Einbau von der Rauminnenseite (Überkopfarbeit) bei bestehender Eindeckung.", "fh": 1.30, "tags": ["altbau"]}]
BRAND = [{"k": "ohne Anf.", "t": "Ohne Anforderungen an den Feuerwiderstand."},
         {"k": "REI 30", "t": "Feuerwiderstand REI 30 nach Nachweis, zusätzliche Beplankung GKF bzw. Gipsfaser.", "h": 0.25, "mat": 12},
         {"k": "REI 60", "t": "Feuerwiderstand REI 60 (K2 30) nach Nachweis, doppelte Brandschutzbeplankung.", "h": 0.45, "mat": 26, "gen": "C"}]
VORFERTIG = [{"k": "vorgefertigt", "t": "Werkseitig vorgefertigte Elemente, Montage mit Kran."},
             {"k": "vor Ort", "t": "Herstellung vor Ort ohne Vorfertigung.", "fh": 1.55, "fm": 0.96}]
GEBH = [{}, {"k": "H>7m", "t": "Arbeitshöhe über 7 m, Materialtransport mit Aufzug bzw. Kran.", "fh": 1.08, "geraet": 1.0}]
FASS_OF = [{"k": "unbehandelt", "t": "Oberfläche unbehandelt, natürliche Vergrauung."},
           {"k": "vorvergraut", "t": "Werkseitig vorvergraut (Vergrauungslasur).", "mat": 9},
           {"k": "deckend", "t": "Werkseitig deckend beschichtet, zweifach, Farbton nach RAL/NCS, Schnittkanten nachbehandelt.", "mat": 16, "fh": 1.05}]
SCHUETT = [{}, {"k": "mit Schüttung", "t": "Mit zusätzlicher Splitt- bzw. Kalksplittschüttung 60 mm auf Rieselschutz für den Schallschutz.", "h": 0.25, "mat": 9}]

_neu("Dachtragwerke", [
    {"kurz": "Kehlbalken / Zangen KVH, {q} mm",
     "lang": "Kehlbalken bzw. Zangen aus KVH C24, Querschnitt {q} mm, mit Sparren verschraubt bzw. verbolzt nach Statik.",
     "einheit": "m", "kg": "361", "gen": "B",
     "varianten": [{"q": "60 × 160", "h": 0.25, "mat": 6.5}, {"q": "80 × 200", "h": 0.32, "mat": 10}, {"q": "2 × 60 × 200", "h": 0.40, "mat": 15}]},
    {"kurz": "Stiel / Holzstütze {m}, {q} mm",
     "lang": "Stiel bzw. Holzstütze aus {m}, Querschnitt {q} mm, mit Stützenfuß und Kopfanschluss nach Statik.",
     "einheit": "m", "kg": "361", "gen": "B",
     "varianten": [{"m": "KVH C24", "q": "120 × 120", "h": 0.45, "mat": 11}, {"m": "KVH C24", "q": "160 × 160", "h": 0.52, "mat": 19},
                   {"m": "BSH GL24h", "q": "160 × 160", "h": 0.55, "mat": 26}, {"m": "BSH GL24h", "q": "200 × 200", "h": 0.62, "mat": 40}]},
    {"kurz": "Kopfband / Strebe KVH, Länge bis 1,5 m",
     "lang": "Kopfband bzw. Strebe aus KVH, Querschnitt passend zur Konstruktion, mit Versatz oder Stabdübeln angeschlossen.",
     "einheit": "St", "kg": "361", "h": 1.3, "mat": 18, "gen": "B"},
    {"kurz": "Grat-/Kehlsparren KVH, Zulage Abbund",
     "lang": "Zulage für Grat- bzw. Kehlsparren einschließlich Schiften und Klauen der Schiftersparren.",
     "einheit": "m", "kg": "361", "h": 0.85, "mat": 6, "gen": "B"},
    {"kurz": "Aufschiebling / Traufaufschiebling KVH",
     "lang": "Aufschiebling an der Traufe zur Neigungsänderung aus KVH, seitlich an Sparren geschraubt, Länge bis 1,2 m.",
     "einheit": "St", "kg": "361", "h": 0.45, "mat": 8, "gen": "A"},
    {"kurz": "Windrispenband verzinkt, gespannt",
     "lang": "Windrispenband aus verzinktem Lochband 40 × 2 mm, diagonal über die Sparren gespannt und genagelt, einschließlich "
             "Spannschloss und Endverankerung.", "einheit": "m", "kg": "361", "h": 0.08, "mat": 2.4, "gen": "A"},
    {"kurz": "Sparren an Traufe verlängern, bis 60 cm",
     "lang": "Vorhandene Sparren an der Traufe bzw. am Ortgang mit seitlich angelaschten Hölzern um bis 60 cm verlängern, "
             "verschraubt.", "einheit": "St", "kg": "361", "h": 0.9, "mat": 12, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Kranstellung Holzbau / Mobilkran mit Fahrer",
     "lang": "Mobilkran bis 40 t mit Fahrer für die Montage der Holzkonstruktion, einschließlich An- und Abfahrt anteilig.",
     "einheit": "h", "kg": "391", "h": 0, "geraet": 165, "gen": "B", "achsen": []},
])
_neu("Schalungen, Lattungen, Unterdeckung", [
    {"kurz": "Gaubenwange beplanken, OSB 22 mm",
     "lang": "Gaubenwangen und Brüstungen außen mit OSB/3-Platten 22 mm beplanken, als Untergrund für Bekleidung.",
     "einheit": "m²", "kg": "361", "h": 0.55, "mat": 14, "gen": "B"},
    {"kurz": "Winddichtung / Fassadenbahn auf Holzrahmen außen",
     "lang": "Diffusionsoffene Winddichtungsbahn auf Holzrahmenwand bzw. Gaube, Stöße und Anschlüsse verklebt.",
     "einheit": "m²", "kg": "335", "h": 0.10, "mat": 3.8, "gen": "A"},
    {"kurz": "Deckenbekleidung {m}",
     "lang": "Deckenbekleidung aus {m} auf Lattung, Abstand nach Herstellerangabe, verdeckt befestigt.",
     "einheit": "m²", "kg": "353", "gen": "B",
     "varianten": [{"m": "Profilholz Fichte, 14 mm", "h": 0.75, "mat": 22}, {"m": "Holzwolle-Akustikplatten", "h": 0.65, "mat": 34},
                   {"m": "Holz-Akustikpaneelen geschlitzt", "h": 0.85, "mat": 72}]},
    {"kurz": "Dachschalung abbrechen und entsorgen",
     "lang": "Vorhandene Dachschalung einschließlich Nägel abbrechen, sortieren (Altholz) und entsorgen.",
     "einheit": "m²", "kg": "394", "h": 0.25, "geraet": 4, "gen": "B", "tags": ["altbau"], "lohn": "abbruch"},
])
_neu("Dämmung am Dach", [
    {"kurz": "Dämmung zwischen Sparren ausbauen und entsorgen",
     "lang": "Vorhandene Zwischensparrendämmung (Mineralwolle alter Generation nach TRGS 521) staubarm ausbauen, "
             "in Säcke verpacken und entsorgen.", "einheit": "m²", "kg": "394", "h": 0.25, "mat": 1.5, "geraet": 5, "gen": "B",
     "tags": ["altbau"], "lohn": "abbruch"},
    {"kurz": "Untersparrendämmung {m}, d = {d} mm",
     "lang": "Ergänzende Untersparrendämmung aus {m}, Dicke {d} mm, unterseitig an Sparren befestigt, Stöße dicht.",
     "einheit": "m²", "kg": "363", "gen": "A",
     "varianten": [{"m": "Holzfaser", "d": "40", "h": 0.25, "mat": 13}, {"m": "Holzfaser", "d": "60", "h": 0.27, "mat": 18},
                   {"m": "PIR alukaschiert", "d": "40", "h": 0.22, "mat": 12}]},
    {"kurz": "Sub-and-Top-Luftdichtheitsbahn, Sanierung außen",
     "lang": "Feuchtevariable Luftdichtheitsbahn für die Sanierung von außen, schlaufenförmig über und zwischen den Sparren verlegt, "
             "an Giebel und Traufe luftdicht angeschlossen.", "einheit": "m²", "kg": "363", "h": 0.20, "mat": 6.5, "gen": "B", "tags": ["altbau"],
     "achsen": [DN]},
    {"kurz": "Luftdichter Anschluss, Klebeband",
     "lang": "Luftdichter Anschluss der Dampfbremse an Mauerwerk, Pfetten oder Durchdringungen mit Anschlussklebeband bzw. "
             "Dichtmasse auf grundiertem Untergrund.", "einheit": "m", "kg": "363", "h": 0.10, "mat": 2.8, "gen": "A"},
    {"kurz": "Luftdichtheitsmessung (Blower-Door), je Gebäude",
     "lang": "Messung der Luftdichtheit nach DIN EN ISO 9972 mit Leckageortung und Prüfbericht, Einfamilienhaus.",
     "einheit": "psch", "kg": "363", "h": 0, "geraet": 580, "gen": "B", "achsen": []},
])
_neu("Holzrahmenbau, Wände", [
    {"kurz": "Zulage Holzfaser-Putzträger 100 mm statt 60 mm",
     "lang": "Zulage zur Holzrahmenwand außen für eine Holzfaser-Putzträgerplatte 100 mm statt der enthaltenen 60 mm.",
     "einheit": "m²", "kg": "331", "h": 0.06, "mat": 14, "gen": "B"},
    {"kurz": "Öffnung in Holzrahmenwand, Sturz/Brüstungsriegel",
     "lang": "Ausbildung einer Fenster- bzw. Türöffnung in Holzrahmenwand mit Sturz, Brüstungsriegel und Laibungsstielen, "
             "Öffnungsbreite bis 1,5 m.", "einheit": "St", "kg": "331", "h": 2.0, "mat": 45, "gen": "B"},
    {"kurz": "Fachwerk instandsetzen: Ständer/Riegel austauschen, bis 16 × 16 cm",
     "lang": "Schadhaften Fachwerkständer bzw. -riegel ausbauen und durch Eichenholz gleichen Querschnitts mit zimmermannsmäßigen "
             "Verbindungen (Zapfen, Holznägel) ersetzen.", "einheit": "m", "kg": "331", "h": 3.0, "mat": 55, "gen": "C", "tags": ["altbau", "denkmal"]},
    {"kurz": "Fachwerkgefach ausmauern bzw. Lehmstein/Lehmputz",
     "lang": "Gefach in Fachwerkwand mit Lehmsteinen bzw. Leichtlehmsteinen ausmauern, Anschlüsse mit Dreikantleisten.",
     "einheit": "m²", "kg": "331", "h": 2.2, "mat": 42, "gen": "C", "tags": ["altbau", "denkmal"]},
    {"kurz": "Fachwerkwand abbrechen, einschl. Ausfachung, entsorgen",
     "lang": "Fachwerkwand mit Ausfachung abbrechen, Holz und Mauerwerk trennen und entsorgen.",
     "einheit": "m²", "kg": "394", "h": 1.0, "geraet": 14, "gen": "C", "tags": ["altbau"], "lohn": "abbruch"},
    {"kurz": "Holzbalkon BSH mit Lärchenbelag",
     "lang": "Balkon als Holzkonstruktion aus BSH-Trägern auf Stützen, Belag aus Lärchendielen 28 mm mit Fuge, konstruktiver "
             "Holzschutz, ohne Geländer. Abrechnung nach Balkonfläche.", "einheit": "m²", "kg": "359", "h": 3.5, "mat": 210, "gen": "C"},
    {"kurz": "Balkonbelag {m}",
     "lang": "Belag aus {m} auf Unterkonstruktion mit Abstandshaltern, verdeckt bzw. sichtbar mit Edelstahlschrauben befestigt.",
     "einheit": "m²", "kg": "359", "gen": "B",
     "varianten": [{"m": "Lärchendielen 28 mm", "h": 0.9, "mat": 46}, {"m": "Douglasie 28 mm", "h": 0.9, "mat": 40},
                   {"m": "Thermoesche 26 mm", "h": 0.95, "mat": 85}, {"m": "WPC-Hohlkammerdielen", "h": 0.8, "mat": 58}]},
])
_neu("Decken, Massivholz", [
    {"kurz": "Holzbalken seitlich aufdoppeln/verstärken",
     "lang": "Bestehende Holzbalken seitlich mit KVH-Bohlen bzw. Furnierschichtholz nach Statik aufdoppeln, verschraubt.",
     "einheit": "m", "kg": "351", "h": 0.85, "mat": 14, "gen": "C", "tags": ["altbau"]},
    {"kurz": "Holz-Beton-Verbunddecke, Aufbeton 8 cm",
     "lang": "Ertüchtigung einer Holzbalkendecke zur Holz-Beton-Verbunddecke: Schubverbinder nach Zulassung, Trennlage, "
             "Bewehrungsmatte und Aufbeton C25/30, 8 cm.", "einheit": "m²", "kg": "351", "h": 1.6, "mat": 62, "gen": "C", "tags": ["altbau"], "lohn": "rohbau"},
    {"kurz": "Einschub / Fehlboden ausbauen und entsorgen (Bestand)",
     "lang": "Vorhandenen Einschub mit Lehm- bzw. Schlackefüllung ausbauen, staubarm in Behälter laden und entsorgen.",
     "einheit": "m²", "kg": "394", "h": 0.5, "geraet": 16, "gen": "C", "tags": ["altbau"], "lohn": "abbruch"},
    {"kurz": "Massivholzdielen {m}, 21–28 mm, verschraubt",
     "lang": "Dielenboden aus {m}, Nut und Feder, auf Lagerhölzern bzw. Blindboden verdeckt verschraubt, geschliffen und geölt.",
     "einheit": "m²", "kg": "352", "gen": "B",
     "varianten": [{"m": "Fichte/Kiefer", "h": 0.9, "mat": 38}, {"m": "Lärche/Douglasie", "h": 0.9, "mat": 52}, {"m": "Eiche", "h": 1.0, "mat": 88}]},
    {"kurz": "Lagerhölzer für Dielenboden, gedämmt",
     "lang": "Lagerhölzer 60 × 80 mm auf Trittschalldämmstreifen ausgerichtet, Zwischenräume mit Mineralwolle gedämmt.",
     "einheit": "m²", "kg": "352", "h": 0.45, "mat": 14, "gen": "A"},
    {"kurz": "Treppenloch in Holzbalkendecke, Wechsel",
     "lang": "Öffnung in Holzbalkendecke für Treppen- bzw. Schachtöffnung bis 3 m² mit Wechseln nach Statik herstellen.",
     "einheit": "St", "kg": "351", "h": 8.0, "mat": 160, "gen": "C", "tags": ["altbau"]},
])
_neu("Holzschutz, Abbruch, Sonstiges", [
    {"kurz": "Holzbauteile reinigen, Altanstrich entfernen",
     "lang": "Sichtbare Holzbauteile im Bestand abbürsten bzw. strahlen, Altanstriche entfernen, Staub absaugen.",
     "einheit": "m²", "kg": "395", "h": 0.35, "geraet": 3, "gen": "C", "tags": ["altbau"]},
    {"kurz": "Feuchtemessung / holzschutztechnische Untersuchung Dachstuhl",
     "lang": "Holzfeuchtemessung und Untersuchung auf Schädlingsbefall bzw. Pilze mit Bericht, Dachstuhl Einfamilienhaus.",
     "einheit": "psch", "kg": "395", "h": 4, "geraet": 120, "gen": "C", "tags": ["altbau"], "achsen": []},
])


def _regel(gruppe, p):
    if p["einheit"] in ("h", "psch"):
        return []
    k = p["kurz"]
    if gruppe == "Dachtragwerke":
        if p["einheit"] in ("m³",) or "Sparren KVH" in k or "Pfette" in k or "Stiel" in k or "Kehlbalken" in k:
            return [OBERFL, DN, ORT] if "{m}" in k else [HOLZ_BSH if "BSH" in k else HOLZ_KVH, OBERFL, DN, ORT]
        if "Gaube" in k or "Vordach" in k:
            return [OBERFL, ORT]
        return [DN, ORT]
    if gruppe == "Schalungen, Lattungen, Unterdeckung":
        if "Deckenbekleidung" in k or "Winddichtung" in k:
            return [ORT, GEBH]
        return [DN, FORM, ORT, GEBH]
    if gruppe == "Dämmung am Dach":
        if "Geschossdecke" in k:
            return [ORT]
        if "Aufsparren" in k:
            return [DN, FORM, ORT, GEBH]
        return [DN, EINBAU, ORT] if "ausbauen" not in k else [DN]
    if gruppe == "Holzrahmenbau, Wände":
        if k.startswith("Holzrahmenwand außen, Ständer") or k.startswith("Holzrahmenwand innen"):
            return [BRAND, VORFERTIG, GEBH]
        if k.startswith("Holzfassade"):
            return [FASS_OF, GEBH, ORT]
        return [ORT, GEBH] if "Fachwerk" not in k else [GEBH]
    if gruppe == "Decken, Massivholz":
        if k.startswith("Brettsperrholz (CLT) Wand"):
            return [BRAND, ORT]
        if k.startswith("Holzbalkendecke KVH") or k.startswith("Brettsperrholz"):
            return [BRAND, SCHUETT, ORT]
        return [ORT]
    return [ORT]


for _g in LBS[0]["gruppen"]:
    for _p in _g["positionen"]:
        if "achsen" not in _p:
            _p["achsen"] = _regel(_g["name"], _p)
        if ("Bestand" in _p["kurz"] or "altbau" in _p.get("tags", [])) and ORT in _p["achsen"]:
            _p["achsen"] = [a for a in _p["achsen"] if a is not ORT]   # schon Bestandsleistung: kein zweiter Bestandszuschlag
