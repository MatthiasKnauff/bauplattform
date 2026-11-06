# LB 032 Verglasungsarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "032", "name": "Verglasungsarbeiten", "atv": "DIN 18361", "lohn": "glas",
    "gruppen": [
        {"name": "Isolier- und Sicherheitsglas", "positionen": [
            {"kurz": "Isolierglas {typ}, Ug = {ug}, in vorhandene Rahmen",
             "lang": "Isolierglas {typ} nach DIN EN 1279, Ug = {ug} W/(m²K), warme Kante, in vorhandene Flügel bzw. "
                     "Rahmen mit Verklotzung nach Richtlinie einsetzen, Glashalteleisten wieder befestigen, "
                     "Altglas ausbauen und entsorgen. Abrechnung nach Glasfläche (mindestens 0,5 m² je Scheibe).",
             "einheit": "m²", "kg": "334", "gen": "B", "tags": ["altbau"],
             "varianten": [{"typ": "2-fach Wärmeschutzglas", "ug": "1,1", "h": 1.2, "mat": 62},
                           {"typ": "3-fach Wärmeschutzglas", "ug": "0,6", "h": 1.4, "mat": 105},
                           {"typ": "3-fach mit VSG innen", "ug": "0,6", "h": 1.5, "mat": 150}]},
            {"kurz": "Einscheiben-Sicherheitsglas ESG {d} mm, Kanten poliert",
             "lang": "ESG nach DIN EN 12150, Dicke {d} mm, klar, Kanten geschliffen und poliert, Ecken gestoßen, "
                     "liefern und in vorhandene Halterungen einsetzen. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "339", "gen": "B",
             "varianten": [{"d": "6", "h": 1.0, "mat": 85}, {"d": "8", "h": 1.1, "mat": 110}, {"d": "10", "h": 1.2, "mat": 143}]},
            {"kurz": "Verbundsicherheitsglas VSG {d}, klar",
             "lang": "VSG aus zwei Floatglas- bzw. TVG-Scheiben mit PVB-Folie, Aufbau {d}, Kanten gesäumt bzw. "
                     "poliert, als absturzsichernde oder Überkopfverglasung nach DIN 18008 einsetzen. "
                     "Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "339", "gen": "B",
             "varianten": [{"d": "8 mm (2 × 4, 0,76 PVB)", "h": 1.2, "mat": 140}, {"d": "12 mm (2 × 6)", "h": 1.4, "mat": 185},
                           {"d": "16 mm TVG (2 × 8)", "h": 1.6, "mat": 260}]},
            {"kurz": "Sichtschutzfolie / Glasdekor auf vorhandenes Glas",
             "lang": "Sichtschutz- bzw. Markierungsfolie (Milchglasoptik) auf vorhandene Glasflächen innen faltenfrei "
                     "aufbringen, Motiv bzw. Streifen nach Vorgabe (Kontrastmarkierung nach DIN 18040). "
                     "Abrechnung nach Folienfläche.",
             "einheit": "m²", "kg": "345", "h": 0.6, "mat": 28, "gen": "B"},
            {"kurz": "Glasbruch: Notverglasung / Abdichtung provisorisch",
             "lang": "Bei Glasbruch Scherben sichern und entfernen, Öffnung provisorisch mit Platte bzw. Folie "
                     "verschließen, Aufmaß für Ersatzglas. Abrechnung je Öffnung bis 2 m².",
             "einheit": "St", "kg": "334", "h": 1.5, "mat": 25, "gen": "B", "tags": ["altbau"]},
        ]},
        {"name": "Ganzglas, Trennwände", "positionen": [
            {"kurz": "Ganzglastür ESG 10 mm, Pendel-/Drehtür mit Beschlag, {rm}",
             "lang": "Ganzglastür aus ESG 10 mm, klar oder satiniert, mit Glastürbeschlag (Ober-/Unterlager, "
                     "Bodentürschließer bzw. Bänder), Schloss mit PZ, Griffstange Edelstahl, Größe {rm}.",
             "einheit": "St", "kg": "344", "gen": "B",
             "varianten": [{"rm": "1,00 × 2,20 m", "h": 5, "mat": 1350}, {"rm": "2-flg. 2,00 × 2,20 m", "h": 9, "mat": 2600}]},
            {"kurz": "Glastrennwand ESG/VSG rahmenlos{zus}, Raumhöhe bis {hh} m",
             "lang": "Rahmenlose Glastrennwand (Büro) aus ESG bzw. VSG 10–12 mm{zl} mit Boden- und Deckenprofil "
                     "Aluminium, Stoßfugen mit transparenten Dichtprofilen, Raumhöhe bis {hh} m; Türen gesondert. "
                     "Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "346", "gen": "C",
             "varianten": [{"hh": "3,0", "zus": "", "zl": "", "h": 1.8, "mat": 310}, {"hh": "3,0", "zus": ", doppelt verglast Rw ≥ 42 dB", "zl": ", zweischalig (doppelt verglast) mit Schalldämmmaß Rw ≥ 42 dB", "h": 2.6, "mat": 560}]},
            {"kurz": "Glaswand Dusche ESG 8 mm, {art}",
             "lang": "Duschabtrennung aus ESG 8 mm mit Kalkschutzbeschichtung, {art}, Edelstahlbeschläge, Dichtprofile, "
                     "Höhe 2,00 m, an Wand und Fliesenboden befestigt.",
             "einheit": "St", "kg": "412", "gen": "B",
             "varianten": [{"art": "Walk-in Seitenwand bis 1,20 m mit Stabilisator", "h": 3, "mat": 650},
                           {"art": "Eckeinstieg mit Pendeltür und Seitenteil 90 × 90 cm", "h": 5, "mat": 1250},
                           {"art": "Nische mit Pendeltür bis 1,20 m", "h": 4, "mat": 980}]},
            {"kurz": "Spiegel Kristallglas 6 mm, Kanten poliert",
             "lang": "Spiegel aus Kristallspiegelglas 6 mm, Kanten poliert, auf Wand geklebt bzw. mit Spiegelhaltern "
                     "befestigt, Ausschnitte für Steckdosen gesondert. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "385", "h": 1.0, "mat": 110, "gen": "A"},
            {"kurz": "Küchenrückwand / Wandverkleidung ESG lackiert",
             "lang": "Rückwand bzw. Wandverkleidung aus ESG 6 mm rückseitig lackiert (RAL nach Wahl), Ausschnitte "
                     "für Steckdosen nach Aufmaß, auf Wand geklebt. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "345", "h": 1.5, "mat": 210, "gen": "B"},
            {"kurz": "Brandschutz-Innenfenster / Oberlicht EI 30",
             "lang": "Innenfenster bzw. Oberlicht als Brandschutzverglasung EI 30 in Stahl- oder Holzrahmen mit "
                     "Bauartgenehmigung, eingebaut einschließlich Kennzeichnung. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "344", "h": 2.0, "mat": 820, "gen": "C"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Runde 2: Ausführungsachsen und weitere Grundpositionen
GROESSE = [{"k": "bis 1 m²", "t": "Einzelscheibe bis 1 m².", "fh": 1.25, "fm": 1.05}, {"k": "1–3 m²", "t": "Einzelscheibe 1 bis 3 m²."},
           {"k": "über 3 m²", "t": "Einzelscheibe über 3 m², Einbau mit Saugheber bzw. Glasroboter.", "fh": 1.2, "fm": 1.12, "geraet": 12, "gen": "C"}]
ZUSATZ = [{}, {"k": "Sonnenschutz", "t": "Mit Sonnenschutzbeschichtung (g ≤ 0,35).", "mat": 28},
          {"k": "Schallschutz", "t": "Als Schallschutzglas mit asymmetrischem Aufbau bzw. Schallschutzfolie, Rw nach Vorgabe.", "mat": 45},
          {"k": "Ornament", "t": "Mit Ornamentglas bzw. satiniertem Glas als Sichtschutz.", "mat": 22}]
ORT = [{}, {"k": "über 3,5 m", "t": "Einbauhöhe über 3,5 m; Gerüst bzw. Hubarbeitsbühne gesondert.", "fh": 1.2}]
KANTE = [{"ersetze": [[r"Kanten (geschliffen und poliert|gesäumt bzw\. ?poliert),\s*", ""]], "k": "gesäumt", "t": "Kanten gesäumt."}, {"k": "geschliffen", "t": "Kanten geschliffen.", "mat": 6}, {"k": "poliert", "t": "Kanten poliert.", "mat": 12}]

for gr in LBS[0]["gruppen"]:
    for p in gr["positionen"]:
        k = p["kurz"]
        if k.startswith("Isolierglas"):
            p["achsen"] = [GROESSE, ZUSATZ, ORT]
        elif k.startswith("Einscheiben-Sicherheitsglas"):
            p["kurz"] = p["kurz"].replace(", Kanten poliert", "")
            p["achsen"] = [GROESSE, KANTE, ORT]
        elif k.startswith("Verbundsicherheitsglas"):
            p["achsen"] = [GROESSE, KANTE, ORT]
        elif k.startswith("Glastrennwand"):
            p["achsen"] = [[{}, {"k": "Streifen sat.", "t": "Mit Sichtschutzstreifen satiniert bzw. Folie.", "mat": 18}]]   # raumhoch bis 3,0 m: keine Zulage Einbauhöhe
        elif k.startswith(("Spiegel", "Küchenrückwand")):
            p["achsen"] = [GROESSE]

LBS[0]["gruppen"] += [
    {"name": "Brandschutz, Überkopf, Geländer", "positionen": [
        {"kurz": "Brandschutzglas {kl}, in vorhandenes System",
         "lang": "Brandschutzglas der Klasse {kl} nach DIN EN 13501-2 in zugelassenes Rahmensystem einsetzen, Verklotzung und "
                 "Dichtung nach Bauartgenehmigung, Kennzeichnung. Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "344", "gen": "C", "achsen": [GROESSE, ORT],
         "varianten": [{"kl": "E 30", "h": 1.6, "mat": 280}, {"kl": "EI 30", "h": 1.8, "mat": 520}, {"kl": "EI 60", "h": 2.0, "mat": 780},
                       {"kl": "EI 90", "h": 2.4, "mat": 1050}]},
        {"kurz": "Überkopfverglasung VSG {d}, auf Pfosten-Riegel bzw. Punkthalter",
         "lang": "Überkopfverglasung aus Isolierglas mit VSG innen bzw. Einfach-VSG {d} nach DIN 18008-2, auf bauseitige "
                 "Tragkonstruktion mit Andruckleisten bzw. Punkthaltern montieren, Dichtung nach System. Abrechnung nach Fläche.",
         "einheit": "m²", "kg": "362", "gen": "C", "achsen": [GROESSE, ORT],
         "varianten": [{"d": "10 mm (2 × 5 TVG)", "h": 2.2, "mat": 210}, {"d": "Isolierglas mit VSG 12 innen", "h": 2.6, "mat": 330},
                       {"d": "Isolierglas 3-fach mit VSG", "h": 3.0, "mat": 450}]},
        {"kurz": "Ganzglasgeländer VSG aus TVG, Bodenprofil {art}",
         "lang": "Absturzsichernde Ganzglasbrüstung nach DIN 18008-4 aus VSG aus TVG (2 × 10 mm), in Aluminium-Bodenprofil "
                 "{art} eingespannt, mit Kantenschutz bzw. Handlauf, Nachweis nach abZ/aBG. Abrechnung nach Länge.",
         "einheit": "m", "kg": "359", "gen": "C", "lohn": "metallbau", "achsen": [[{}, {"k": "m. Handlauf", "t": "Mit aufgesetztem Edelstahl-Handlauf Ø 42 mm.", "h": 0.5, "mat": 85}], ORT],
         "varianten": [{"art": "aufgesetzt", "h": 3.0, "mat": 560}, {"art": "seitlich an Stirn", "h": 3.4, "mat": 640}, {"art": "im Boden versenkt", "h": 3.6, "mat": 610}]},
        {"kurz": "Glas-Vordach mit Edelstahl-Zugstangen, Tiefe {t_} m, Breite {b} m",
         "lang": "Vordach aus VSG aus TVG mit Edelstahl-Wandhaltern und Zugstangen, Gefälle zur Traufe, statischer Nachweis "
                 "nach System. Tiefe {t_} m, Breite {b} m.",
         "einheit": "St", "kg": "339", "gen": "C", "lohn": "metallbau",
         "varianten": [{"t_": "1,0", "b": "1,5", "h": 6, "mat": 1450}, {"t_": "1,2", "b": "2,5", "h": 8, "mat": 2350}, {"t_": "1,5", "b": "4,0", "h": 12, "mat": 3900}]},
    ]},
    {"name": "Reparatur, Kleinverglasung", "positionen": [
        {"kurz": "Einfachglas Float {d} mm in Holzrahmen, Kittfalz",
         "lang": "Einfachglas Floatglas {d} mm in vorhandenen Holz- bzw. Stahlrahmen mit Leinölkitt bzw. Glashalteleisten "
                 "einsetzen, Altglas und Altkitt entfernen. Abrechnung nach Glasfläche (mind. 0,25 m² je Scheibe).",
         "einheit": "m²", "kg": "334", "gen": "B", "tags": ["altbau"], "achsen": [GROESSE],
         "varianten": [{"d": "3", "h": 1.6, "mat": 28}, {"d": "4", "h": 1.6, "mat": 32}, {"d": "6", "h": 1.8, "mat": 45}]},
        {"kurz": "Denkmalglas / Goetheglas in Bestandsfenster",
         "lang": "Mundgeblasenes bzw. gezogenes Restaurierungsglas (Goetheglas) in historische Fensterflügel mit Leinölkitt "
                 "einsetzen, Altkitt schonend entfernen. Abrechnung nach Glasfläche.",
         "einheit": "m²", "kg": "334", "h": 2.8, "mat": 260, "gen": "C", "tags": ["altbau"]},
        {"kurz": "Dichtung / Versiegelung Verglasung erneuern",
         "lang": "Vorhandene Glasversiegelung bzw. Dichtprofile an Fenstern und Fassaden entfernen, Glasfalz reinigen, neu "
                 "versiegeln mit Silikon bzw. neue Dichtprofile einsetzen. Abrechnung nach Länge.",
         "einheit": "m", "kg": "334", "h": 0.12, "mat": 2.5, "gen": "B", "tags": ["altbau"], "achsen": [ORT]},
        {"kurz": "Sicherheits-/Sonnenschutzfolie auf Bestandsverglasung {art}",
         "lang": "Fensterfolie {art} innen bzw. außen auf vorhandenes Glas blasenfrei aufbringen, Kanten versiegeln. "
                 "Abrechnung nach Folienfläche.",
         "einheit": "m²", "kg": "334", "gen": "B", "tags": ["altbau"], "achsen": [ORT],
         "varianten": [{"art": "Sonnenschutz außen", "h": 0.6, "mat": 38}, {"art": "Splitterschutz innen", "h": 0.6, "mat": 32},
                       {"art": "Durchwurfhemmung P2A innen", "h": 0.8, "mat": 78}]},
    ]},
]
