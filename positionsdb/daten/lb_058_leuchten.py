# LB 058 Leuchten und Lampen (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "058", "name": "Leuchten und Lampen", "atv": "DIN 18382", "lohn": "elektro",
    "gruppen": [
        {"name": "Innenleuchten", "positionen": [
            {"kurz": "LED-Einbaudownlight Ø {d} mm, {lm} lm, {art}",
             "lang": "LED-Einbaudownlight für Decken (Gipskarton bzw. Akustikdecke), Ø {d} mm, Lichtstrom ca. {lm} lm, "
                     "Farbtemperatur 3000 K bzw. 4000 K, Farbwiedergabe Ra ≥ 80, UGR nach Anforderung, {art}, "
                     "einschließlich Betriebsgerät, Deckenausschnitt und Anschluss an vorhandene Zuleitung.",
             "einheit": "St", "kg": "445", "gen": "B",
             "varianten": [{"d": "90", "lm": "600", "art": "nicht dimmbar", "h": 0.6, "mat": 32}, {"d": "90", "lm": "800", "art": "dimmbar (Phasenabschnitt)", "h": 0.6, "mat": 48},
                           {"d": "150", "lm": "1500", "art": "DALI-dimmbar", "h": 0.7, "mat": 95}, {"d": "200", "lm": "2500", "art": "DALI-dimmbar", "h": 0.8, "mat": 140}]},
            {"kurz": "LED-Panel {m} mm, {lm} lm, {art}",
             "lang": "LED-Flächenleuchte (Panel) {m} mm für Rasterdecke bzw. Anbau mit Rahmen, ca. {lm} lm, 4000 K, "
                     "UGR < 19 für Bildschirmarbeitsplätze, {art}, montieren und anschließen.",
             "einheit": "St", "kg": "445", "gen": "B",
             "varianten": [{"m": "625 × 625", "lm": "3600", "art": "EVG nicht dimmbar", "h": 0.8, "mat": 85},
                           {"m": "625 × 625", "lm": "3600", "art": "DALI", "h": 0.9, "mat": 125},
                           {"m": "1250 × 312", "lm": "4000", "art": "Anbau mit Rahmen, DALI", "h": 1.0, "mat": 155}]},
            {"kurz": "LED-Langfeldleuchte Pendel/Anbau, Länge {l} mm, {lm} lm",
             "lang": "LED-Langfeldleuchte als Anbau- bzw. Pendelleuchte, direkt/indirekt strahlend, Länge {l} mm, "
                     "ca. {lm} lm, 4000 K, mit Pendelabhängung bis 1,5 m, montieren und anschließen.",
             "einheit": "St", "kg": "445", "gen": "C",
             "varianten": [{"l": "1200", "lm": "4500", "h": 1.2, "mat": 260}, {"l": "1500", "lm": "6000", "h": 1.4, "mat": 340}]},
            {"kurz": "LED-Feuchtraum-Wannenleuchte IP65, Länge {l} mm",
             "lang": "LED-Feuchtraumleuchte (Wannenleuchte) Schutzart IP65, Polycarbonat-Wanne, Länge {l} mm, "
                     "ca. {lm} lm, für Keller-, Technik- und Garagenräume, montieren und anschließen.",
             "einheit": "St", "kg": "445", "gen": "A",
             "varianten": [{"l": "1200", "lm": "3500", "h": 0.6, "mat": 42}, {"l": "1500", "lm": "5000", "h": 0.7, "mat": 55}]},
            {"kurz": "LED-Wand-/Deckenleuchte rund Ø {d} mm, {art}",
             "lang": "LED-Wand- bzw. Deckenleuchte rund Ø {d} mm, opale Abdeckung, ca. 1500 lm, {art}, montieren und anschließen.",
             "einheit": "St", "kg": "445", "gen": "B",
             "varianten": [{"d": "300", "art": "Standard IP44", "h": 0.6, "mat": 55}, {"d": "300", "art": "mit HF-Bewegungssensor (Treppenhaus)", "h": 0.7, "mat": 95},
                           {"d": "400", "art": "schlagfest IK10 (Sporthalle/Flur)", "h": 0.8, "mat": 140}]},
            {"kurz": "LED-Lichtband Tragschiene mit Geräteträger, je m",
             "lang": "LED-Lichtbandsystem aus Tragschiene mit Durchgangsverdrahtung und LED-Geräteträgern, ca. 2.500 lm/m, "
                     "abgehängt, einschließlich Endkappen, Verbinder und Einspeisung anteilig. Abrechnung nach Länge.",
             "einheit": "m", "kg": "445", "h": 0.8, "mat": 85, "gen": "C"},
            {"kurz": "LED-Strip-Profil Aluminium mit Abdeckung, je m",
             "lang": "LED-Streifen 24 V, ca. 1000 lm/m, in Aluminium-Profil mit opaler Abdeckung, einschließlich Netzteil und "
                     "Dimmer anteilig, für indirekte Beleuchtung (Vouten, Möbel). Abrechnung nach Länge.",
             "einheit": "m", "kg": "445", "h": 0.6, "mat": 38, "gen": "C"},
            {"kurz": "Stromschiene 3-Phasen mit LED-Strahler, je m mit {n} Strahler",
             "lang": "3-Phasen-Stromschiene Aufbau bzw. abgehängt mit Einspeisung und Endkappen, je m mit {n} LED-Strahler "
                     "ca. 2000 lm, Ra ≥ 90, schwenkbar (Ausstellung, Verkauf). Abrechnung nach Schienenlänge.",
             "einheit": "m", "kg": "445", "gen": "C",
             "varianten": [{"n": "1", "h": 1.0, "mat": 165}, {"n": "2", "h": 1.3, "mat": 290}]},
        ]},
        {"name": "Außenleuchten", "positionen": [
            {"kurz": "LED-Außenwandleuchte IP54, {art}",
             "lang": "LED-Außenwandleuchte Aluminium-Druckguss, Schutzart IP54, warmweiß 3000 K, insektenfreundlich, {art}, "
                     "montieren und anschließen.",
             "einheit": "St", "kg": "445", "gen": "B",
             "varianten": [{"art": "ohne Sensor", "h": 0.8, "mat": 75}, {"art": "mit Bewegungssensor", "h": 0.9, "mat": 120}]},
            {"kurz": "LED-Pollerleuchte Höhe {hh} mm, mit Erdkabelanschluss",
             "lang": "LED-Pollerleuchte aus Aluminium, Höhe {hh} mm, IP65, warmweiß, auf Betonfundament bzw. Erdanker "
                     "montieren und an Erdkabel anschließen. Fundament und Kabel gesondert.",
             "einheit": "St", "kg": "445", "gen": "C",
             "varianten": [{"hh": "650", "h": 1.5, "mat": 260}, {"hh": "1000", "h": 1.8, "mat": 340}]},
            {"kurz": "LED-Mastleuchte Weg/Parkplatz, Lichtpunkthöhe {hh} m, mit Mast",
             "lang": "LED-Mastaufsatzleuchte mit Stahlmast feuerverzinkt, Lichtpunkthöhe {hh} m, Mastanschlusskasten, "
                     "ca. 4000 lm, 3000 K, ULOR 0 %, montieren und anschließen. Fundament gesondert.",
             "einheit": "St", "kg": "445", "gen": "C",
             "varianten": [{"hh": "4", "h": 4, "mat": 1050}, {"hh": "6", "h": 5, "mat": 1400}]},
            {"kurz": "LED-Bodeneinbaustrahler befahrbar IP67",
             "lang": "LED-Bodeneinbaustrahler mit Einbaugehäuse, befahrbar, IP67, ca. 500 lm, montieren und anschließen.",
             "einheit": "St", "kg": "445", "h": 1.2, "mat": 210, "gen": "C"},
        ]},
        {"name": "Sicherheitsbeleuchtung, Lichtsteuerung", "positionen": [
            {"kurz": "Rettungszeichenleuchte LED Einzelbatterie, {art}",
             "lang": "Rettungszeichenleuchte nach DIN EN 1838 / DIN EN 60598-2-22 mit Einzelbatterie, Betriebsdauer 3 h, "
                     "Selbsttest, Erkennungsweite nach Planung, {art}, mit Piktogramm montieren und anschließen.",
             "einheit": "St", "kg": "445", "gen": "B",
             "varianten": [{"art": "Wand/Decke einseitig, 22 m", "h": 0.8, "mat": 155}, {"art": "Pendel doppelseitig, 30 m", "h": 1.2, "mat": 230}]},
            {"kurz": "Sicherheitsleuchte LED Einzelbatterie, {art}",
             "lang": "Sicherheitsleuchte für Rettungswege bzw. Antipanikbeleuchtung mit Einzelbatterie 3 h, Selbsttest, "
                     "{art}, montieren und anschließen.",
             "einheit": "St", "kg": "445", "gen": "B",
             "varianten": [{"art": "Deckeneinbau", "h": 0.8, "mat": 165}, {"art": "Aufbau IP65", "h": 0.8, "mat": 175}]},
            {"kurz": "Zentralbatteriesystem Sicherheitsbeleuchtung, {n} Stromkreise",
             "lang": "Zentralbatterieanlage nach DIN EN 50171 mit Überwachung je Leuchte, Batterie für 3 h, {n} Endstromkreise, "
                     "Aufstellung im eigenen Brandabschnitt, Inbetriebnahme, Prüfbuch. Leuchten und Leitungen gesondert.",
             "einheit": "St", "kg": "445", "gen": "C",
             "varianten": [{"n": "8", "h": 16, "mat": 7800}, {"n": "20", "h": 24, "mat": 13500}]},
            {"kurz": "DALI-Lichtsteuerung je Raum (Controller, Taster, Sensor)",
             "lang": "Lichtsteuerung je Raum mit DALI-Steuergerät bzw. -Gateway-Anteil, Tageslicht- und Präsenzsensor, "
                     "Taster, Programmierung der Lichtszenen.",
             "einheit": "St", "kg": "445", "h": 3, "mat": 260, "gen": "C"},
            {"kurz": "Leuchtmittel/Leuchte demontieren und entsorgen",
             "lang": "Vorhandene Leuchte demontieren, Anschluss sichern, Leuchte und Leuchtmittel nach ElektroG entsorgen.",
             "einheit": "St", "kg": "445", "h": 0.35, "mat": 0, "geraet": 4, "gen": "A", "tags": ["altbau"]},
        ]},
    ],
}]

# ---------------------------------------------------------------- Runde 2: weitere Grundpositionen
LBS[0]["gruppen"] += [
    {"name": "Objekt- und Sonderleuchten", "positionen": [
        {"kurz": "LED-Hallenleuchte (High-Bay) {lm} lm, IP65",
         "lang": "LED-Hallenstrahler für Raumhöhen über 6 m, Lichtstrom {lm} lm, Lichtfarbe 4000 K, Ra ≥ 80, Abstrahlwinkel nach "
                 "Lichtberechnung, Schutzart IP65, an Kette bzw. Bügel montieren und anschließen.",
         "einheit": "St", "kg": "445", "gen": "B",
         "varianten": [{"lm": "15.000", "h": 1.5, "mat": 210}, {"lm": "22.000", "h": 1.6, "mat": 290}, {"lm": "30.000", "h": 1.8, "mat": 380}]},
        {"kurz": "LED-Rasterleuchte Einlege 625 × 625, UGR < 19, {lm} lm",
         "lang": "LED-Einlegeleuchte für Rasterdecke 625 × 625 mm bzw. 600 × 600 mm mit Mikroprismen- oder Rasteroptik, "
                 "UGR < 19, Lichtstrom {lm} lm, 4000 K, einlegen, sichern und anschließen.",
         "einheit": "St", "kg": "445", "gen": "A",
         "varianten": [{"lm": "3.400", "h": 0.6, "mat": 95}, {"lm": "4.300", "h": 0.6, "mat": 120}]},
        {"kurz": "LED-Treppenhausleuchte mit HF-Sensor und Grundlicht",
         "lang": "LED-Wand- bzw. Deckenleuchte für Treppenhäuser mit integriertem Hochfrequenzsensor, Grundlichtfunktion, "
                 "Lichtstrom ca. 1.200 lm, vandalismusgeschützt IK08, montieren und anschließen.",
         "einheit": "St", "kg": "445", "h": 0.8, "mat": 115, "gen": "A"},
        {"kurz": "LED-Spiegelleuchte/Badleuchte IP44, Länge {l} mm",
         "lang": "LED-Spiegel- bzw. Badleuchte Schutzart IP44, Länge {l} mm, 3000–4000 K, montieren und anschließen.",
         "einheit": "St", "kg": "445", "gen": "B",
         "varianten": [{"l": "600", "h": 0.8, "mat": 85}, {"l": "900", "h": 0.9, "mat": 120}]},
        {"kurz": "LED-Pendelleuchte direkt/indirekt Büro, Länge {l} mm",
         "lang": "LED-Pendelleuchte mit direktem und indirektem Lichtanteil für Bildschirmarbeitsplätze, Länge {l} mm, UGR < 19, "
                 "Seilabhängung bis 1,5 m, montieren, ausrichten und anschließen.",
         "einheit": "St", "kg": "445", "gen": "B",
         "varianten": [{"l": "1.200", "h": 1.2, "mat": 340}, {"l": "1.500", "h": 1.3, "mat": 410}]},
        {"kurz": "LED-Strahler für Stromschiene, {w} W",
         "lang": "LED-Strahler für 3-Phasen-Stromschiene, Leistung {w} W, Abstrahlwinkel wählbar, Ra ≥ 90, einsetzen und ausrichten.",
         "einheit": "St", "kg": "445", "gen": "B",
         "varianten": [{"w": "15", "h": 0.25, "mat": 85}, {"w": "25", "h": 0.25, "mat": 115}, {"w": "35", "h": 0.3, "mat": 145}]},
        {"kurz": "LED-Leuchtmittel/Retrofit tauschen (Bestand)",
         "lang": "Vorhandene Leuchtmittel gegen LED-Retrofit-Leuchtmittel tauschen, Funktion prüfen, Altleuchtmittel getrennt entsorgen.",
         "einheit": "St", "kg": "445", "h": 0.15, "mat": 9, "gen": "A", "tags": ["altbau"]},
        {"kurz": "Langfeldleuchte Bestand auf LED umrüsten",
         "lang": "Vorhandene Leuchtstofflampen-Langfeldleuchte auf LED umrüsten: Vorschaltgerät entfernen, Neuverdrahtung bzw. "
                 "LED-Einsatz einbauen, Kennzeichnung der Umrüstung anbringen.",
         "einheit": "St", "kg": "445", "h": 0.6, "mat": 48, "gen": "B", "tags": ["altbau"]},
    ]},
    {"name": "Lichtplanung, Prüfung", "positionen": [
        {"kurz": "Lichttechnische Berechnung nach DIN EN 12464-1, je Raumtyp",
         "lang": "Lichtberechnung mit Planungssoftware für einen Raumtyp nach DIN EN 12464-1 mit Wartungsfaktor, Ausdruck der "
                 "Isolinien, Beleuchtungsstärken und UGR-Werte.",
         "einheit": "St", "kg": "445", "h": 1.5, "mat": 0, "gen": "B"},
        {"kurz": "Beleuchtungsstärkemessung mit Protokoll, je Raum",
         "lang": "Messung der Beleuchtungsstärke nach Fertigstellung mit kalibriertem Luxmeter im Raster, Protokoll mit Soll-Ist-Vergleich.",
         "einheit": "St", "kg": "445", "h": 0.5, "mat": 0, "gen": "A"},
        {"kurz": "Prüfung Sicherheitsbeleuchtung nach DIN VDE V 0108-100, je Leuchte",
         "lang": "Funktions- und Betriebsdauerprüfung der Sicherheits- bzw. Rettungszeichenleuchten, Eintrag ins Prüfbuch.",
         "einheit": "St", "kg": "445", "h": 0.15, "mat": 0, "gen": "A"},
    ]},
]

# ---------------------------------------------------------------- Runde 2: Achsen zuordnen
_G = lambda *namen: (lambda g, p: g in namen)
_K = lambda *worte: (lambda g, p: any(w in p["kurz"] for w in worte))
LICHTFARBE = [{"ersetze": [[r"(Farbtemperatur |Lichtfarbe |warmweiß |neutralweiß )?\d{4}(–\d{4})? K( bzw\. \d{4} K)?,?", ""], [r"(Farbwiedergabe )?Ra ≥ \d+,?", ""]], "k": "3000 K", "t": "Lichtfarbe 3000 K warmweiß, Ra ≥ 80."}, {"k": "4000 K", "t": "Lichtfarbe 4000 K neutralweiß, Ra ≥ 80."},
              {"k": "Ra ≥ 90", "t": "Farbwiedergabe Ra ≥ 90, Lichtfarbe nach Wahl des Auftraggebers.", "fm": 1.15}]
LEUCHTE_MONTAGE = [{}, {"k": "in Gipskartondecke", "t": "Einbau in Gipskarton- bzw. Unterdecke inkl. Ausschnitt und Hohlraum-Verdrahtung.", "fh": 1.1},
                   {"k": "über 3,5 m", "t": "Montagehöhe über 3,5 m bis 6 m, Arbeitsbühne stellt der Auftragnehmer.", "fh": 1.3, "geraet": 3}]
AUSSEN_LF = [{"k": "3000 K", "t": "Lichtfarbe 3000 K."}, {"k": "2200 K insektenfreundlich", "t": "Lichtfarbe 2200 K bernstein, insekten- und fledermausfreundlich, ULOR 0 %.", "fm": 1.08}]
SENSOR = [{}, {"k": "mit Bewegungsmelder", "t": "Mit integriertem Bewegungs- bzw. HF-Sensor, Nachlaufzeit und Helligkeitsschwelle einstellbar.", "mat": 35, "h": 0.1}]
SIBE_MONTAGE = [{"k": "Wand/Decke", "t": "Aufbaumontage an Wand bzw. Decke."}, {"k": "Einbau Unterdecke", "t": "Einbau in Unterdecke mit Einbaurahmen.", "mat": 22, "fh": 1.1},
                {"k": "Pendel/abgehängt", "t": "Abgehängt mit Pendelset bis 1 m.", "mat": 28, "fh": 1.2}]
zuweisen(LBS, [
    (_K("Einbaudownlight", "LED-Panel"), [LICHTFARBE, LEUCHTE_MONTAGE, ORT_KLEIN]),
    (_K("Rasterleuchte", "Wand-/Deckenleuchte rund", "Langfeld", "Lichtband", "Pendelleuchte", "Hallenleuchte"),
     [LICHTFARBE, LEUCHTE_STEUERUNG, LEUCHTE_MONTAGE, ORT_KLEIN]),
    (_K("Strip", "Stromschiene", "Strahler für Stromschiene"), [LICHTFARBE, LEUCHTE_STEUERUNG, LEUCHTE_FARBE]),
    (_K("Feuchtraum", "Treppenhausleuchte", "Spiegelleuchte"), [LICHTFARBE, LEUCHTE_MONTAGE, ORT_KLEIN]),
    (_K("Außenwandleuchte"), [AUSSEN_LF, LEUCHTE_FARBE]),
    (_K("Pollerleuchte", "Mastleuchte", "Bodeneinbau"), [AUSSEN_LF, LEUCHTE_FARBE, SENSOR]),
    (_K("Rettungszeichen", "Sicherheitsleuchte"), [ORT]),
    (_K("Zentralbatterie", "DALI-Lichtsteuerung"), [ORT_KLEIN]),
    (_K("Retrofit", "umrüsten", "demontieren"), [[{}, {"k": "über 3,5 m", "t": "Arbeitshöhe über 3,5 m, Arbeitsbühne stellt der Auftragnehmer.", "fh": 1.35, "geraet": 3}]]),
])
