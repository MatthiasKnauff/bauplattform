import re
# LB 041 Wärmeversorgungsanlagen – Leitungen, Armaturen, Heizflächen (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "041", "name": "Wärmeversorgungsanlagen – Leitungen, Armaturen, Heizflächen", "atv": "DIN 18380", "lohn": "heizung",
    "gruppen": [
        {"name": "Rohrleitungen", "positionen": [
            {"kurz": "Heizungsrohr Mehrschichtverbund {d} mm, verlegt",
             "lang": "Heizungsleitung aus Mehrschichtverbundrohr PE-RT/Al/PE-RT, Außendurchmesser {d} mm, mit Press-"
                     "fittings des gleichen Systems, auf Rohdecke, in Schächten oder unter Putz verlegen, einschließlich "
                     "Befestigungen, Form- und Verbindungsstücke anteilig. Dämmung gesondert. Abrechnung nach Länge.",
             "einheit": "m", "kg": "422", "gen": "A",
             "varianten": [{"d": "16", "h": 0.20, "mat": 7.5}, {"d": "20", "h": 0.22, "mat": 9.5}, {"d": "26", "h": 0.26, "mat": 14},
                           {"d": "32", "h": 0.30, "mat": 19}, {"d": "40", "h": 0.36, "mat": 30}, {"d": "50", "h": 0.42, "mat": 42}]},
            {"kurz": "Heizungsrohr C-Stahl verzinkt, Pressverbindung, {d} mm",
             "lang": "Heizungsleitung aus außen verzinktem C-Stahlrohr mit Pressfittings, Außendurchmesser {d} mm, "
                     "auf Wand und Decke mit Rohrschellen mit Schalldämmeinlage verlegen, einschließlich Form- und "
                     "Verbindungsstücke anteilig. Abrechnung nach Länge.",
             "einheit": "m", "kg": "422", "gen": "A",
             "varianten": [{"d": "15", "h": 0.25, "mat": 9}, {"d": "22", "h": 0.28, "mat": 12.5}, {"d": "28", "h": 0.32, "mat": 16},
                           {"d": "35", "h": 0.38, "mat": 22}, {"d": "42", "h": 0.44, "mat": 29}, {"d": "54", "h": 0.52, "mat": 40},
                           {"d": "76,1", "h": 0.70, "mat": 68}, {"d": "88,9", "h": 0.85, "mat": 85}]},
            {"kurz": "Heizungsrohr Stahl geschweißt (Gewinderohr/Siederohr) DN {dn}",
             "lang": "Heizungsleitung aus nahtlosem bzw. geschweißtem Stahlrohr nach DIN EN 10255/10220, DN {dn}, "
                     "geschweißt, mit Rohrhalterungen und Grundanstrich, einschließlich Bögen, T-Stücke und Reduzierungen "
                     "anteilig. Abrechnung nach Länge.",
             "einheit": "m", "kg": "422", "gen": "B",
             "varianten": [{"dn": "65", "h": 0.95, "mat": 42}, {"dn": "80", "h": 1.10, "mat": 55}, {"dn": "100", "h": 1.35, "mat": 75}]},
            {"kurz": "Kupferrohr Heizung, Pressverbindung, {d} mm",
             "lang": "Heizungsleitung aus Kupferrohr nach DIN EN 1057, Außendurchmesser {d} mm, mit Pressfittings, "
                     "einschließlich Befestigungen sowie Form- und Verbindungsstücke anteilig. Abrechnung nach Länge.",
             "einheit": "m", "kg": "422", "gen": "B",
             "varianten": [{"d": "15", "h": 0.26, "mat": 14}, {"d": "22", "h": 0.30, "mat": 21}, {"d": "28", "h": 0.34, "mat": 28}]},
            {"kurz": "Erdverlegte Nahwärmeleitung, Kunststoffmantelrohr Duo {d} mm",
             "lang": "Flexibles, vorgedämmtes Kunststoffmantelrohr als Doppelrohr (Vor- und Rücklauf) PE-Xa {d} mm "
                     "in bauseits hergestellten Graben verlegen, mit Endkappen und Hauseinführung anteilig. "
                     "Abrechnung nach Grabenlänge.",
             "einheit": "m", "kg": "422", "gen": "C",
             "varianten": [{"d": "2 × 25", "h": 0.5, "mat": 78}, {"d": "2 × 32", "h": 0.55, "mat": 92}, {"d": "2 × 40", "h": 0.6, "mat": 115}]},
            {"kurz": "Anschluss an Bestandsleitung herstellen, bis DN {dn}",
             "lang": "Neue Leitung an vorhandene Heizungsleitung anbinden, einschließlich Entleeren und Wiederbefüllen "
                     "des betroffenen Anlagenteils, Übergangsstück und Entlüften. Nennweite bis DN {dn}.",
             "einheit": "St", "kg": "422", "gen": "B", "tags": ["altbau"],
             "varianten": [{"dn": "25", "h": 2.0, "mat": 35}, {"dn": "50", "h": 3.0, "mat": 70}]},
            {"kurz": "Druckprobe und Spülung Heizungsanlage",
             "lang": "Dichtheitsprüfung der Heizungsleitungen mit Wasser nach DIN EN 14336 bzw. Herstellerangaben, "
                     "Spülen der Anlage, Prüfprotokoll. Abrechnung je Anlage.",
             "einheit": "psch", "kg": "422", "h": 4, "mat": 20, "gen": "A"},
        ]},
        {"name": "Armaturen", "positionen": [
            {"kurz": "Absperrkugelhahn Heizung DN {dn}",
             "lang": "Absperrkugelhahn aus Messing vernickelt mit Hebel bzw. Flügelgriff, PN 16, DN {dn}, in Leitung einbauen.",
             "einheit": "St", "kg": "422", "gen": "A",
             "varianten": [{"dn": "15", "h": 0.3, "mat": 12}, {"dn": "20", "h": 0.35, "mat": 16}, {"dn": "25", "h": 0.4, "mat": 22},
                           {"dn": "32", "h": 0.5, "mat": 34}, {"dn": "50", "h": 0.7, "mat": 75}]},
            {"kurz": "Absperrklappe Zwischenflansch DN {dn}",
             "lang": "Absperrklappe in Zwischenflanschausführung mit Handhebel, PN 16, DN {dn}, einschließlich Gegenflansche, "
                     "Dichtungen und Schrauben.",
             "einheit": "St", "kg": "422", "gen": "B",
             "varianten": [{"dn": "65", "h": 1.5, "mat": 210}, {"dn": "80", "h": 1.8, "mat": 245}, {"dn": "100", "h": 2.2, "mat": 310}]},
            {"kurz": "Strangregulierventil mit Messnippeln DN {dn}",
             "lang": "Strangregulierventil mit Voreinstellung, Messnippeln und Entleerung, DN {dn}, einbauen und "
                     "nach Abgleichberechnung einstellen.",
             "einheit": "St", "kg": "422", "gen": "A",
             "varianten": [{"dn": "15", "h": 0.6, "mat": 62}, {"dn": "20", "h": 0.7, "mat": 75}, {"dn": "25", "h": 0.8, "mat": 98},
                           {"dn": "32", "h": 0.9, "mat": 135}, {"dn": "50", "h": 1.2, "mat": 260}]},
            {"kurz": "Differenzdruckregler Strang DN {dn}",
             "lang": "Differenzdruckregler mit Partnerventil und Impulsleitung für Heizungsstränge, DN {dn}, einbauen und einstellen.",
             "einheit": "St", "kg": "422", "gen": "B",
             "varianten": [{"dn": "20", "h": 1.2, "mat": 260}, {"dn": "32", "h": 1.5, "mat": 380}]},
            {"kurz": "Hocheffizienz-Umwälzpumpe Heizung, DN {dn}",
             "lang": "Hocheffizienz-Nassläuferpumpe mit elektronischer Differenzdruckregelung (EEI ≤ 0,23), Anschluss DN {dn}, "
                     "einschließlich Verschraubungen und Wärmedämmschale, elektrischer Anschluss an bauseitige Zuleitung.",
             "einheit": "St", "kg": "422", "gen": "B",
             "varianten": [{"dn": "25", "h": 1.5, "mat": 320}, {"dn": "32", "h": 1.8, "mat": 540}, {"dn": "40", "h": 2.5, "mat": 1150}, {"dn": "50", "h": 3.0, "mat": 1650}]},
            {"kurz": "Automatischer Schnellentlüfter mit Absperrung",
             "lang": "Automatischen Schnellentlüfter mit Absperrventil an Hochpunkten der Heizungsleitung einbauen.",
             "einheit": "St", "kg": "422", "h": 0.3, "mat": 14, "gen": "A"},
        ]},
        {"name": "Flächenheizung", "positionen": [
            {"kurz": "Fußbodenheizung Noppensystem, Rohr {d} mm, VA {va} cm",
             "lang": "Warmwasser-Fußbodenheizung als Nasssystem nach DIN EN 1264 auf Noppenplatte mit Trittschall-"
                     "dämmung (Dämmdicke nach Wärmeschutz, im Grundpreis 30 mm), Heizrohr PE-RT bzw. PE-Xa mit "
                     "Sauerstoffsperre {d} mm, Verlegeabstand {va} cm, einschließlich Randdämmstreifen, Rohranteile bis "
                     "zum Verteiler, Druckprobe und Protokoll. Verteiler gesondert. Abrechnung nach beheizter Fläche.",
             "einheit": "m²", "kg": "423", "gen": "B",
             "varianten": [{"d": "14", "va": "10", "h": 0.40, "mat": 27}, {"d": "16", "va": "10", "h": 0.38, "mat": 26},
                           {"d": "16", "va": "15", "h": 0.32, "mat": 22}, {"d": "17", "va": "20", "h": 0.28, "mat": 19}]},
            {"kurz": "Fußbodenheizung Tackersystem, Rohr {d} mm, VA {va} cm",
             "lang": "Warmwasser-Fußbodenheizung im Tackersystem auf Verbundfolie über Dämmung (Dämmung gesondert), "
                     "Heizrohr {d} mm, Verlegeabstand {va} cm, mit Randdämmstreifen, Rohrabschnitten bis Verteiler, "
                     "Druckprobe und Protokoll. Abrechnung nach beheizter Fläche.",
             "einheit": "m²", "kg": "423", "gen": "B",
             "varianten": [{"d": "16", "va": "10", "h": 0.34, "mat": 17}, {"d": "16", "va": "15", "h": 0.28, "mat": 14}]},
            {"kurz": "Fußbodenheizung Trockensystem, Aufbauhöhe bis 30 mm",
             "lang": "Flächenheizung im Trockenbausystem mit Wärmeleitblechen bzw. gefrästen Dämmplatten, Aufbauhöhe "
                     "bis 30 mm, Heizrohr 12–16 mm, für Altbau bzw. Holzbalkendecken, einschließlich Randstreifen und "
                     "Rohranteilen bis Verteiler. Abrechnung nach beheizter Fläche.",
             "einheit": "m²", "kg": "423", "h": 0.55, "mat": 52, "gen": "C", "tags": ["altbau"]},
            {"kurz": "Fußbodenheizung in Estrich eingefräst (Bestand)",
             "lang": "Heizrohrkanäle in bestehenden Estrich fräsen, Heizrohr 10–12 mm einlegen und mit Ausgleichsmasse "
                     "verfüllen, staubarm mit Absaugung, einschließlich Rohranteilen bis Verteiler.",
             "einheit": "m²", "kg": "423", "h": 0.70, "mat": 24, "geraet": 9, "gen": "C", "tags": ["altbau"]},
            {"kurz": "Heizkreisverteiler Edelstahl mit Durchflussanzeigen, {n} Kreise",
             "lang": "Heizkreisverteiler aus Edelstahl mit Vor- und Rücklaufbalken, Durchflussmessern, Thermostat-"
                     "oberteilen, Füll- und Entleerhähnen, Entlüftern und Kugelhähnen, für {n} Heizkreise, "
                     "einschließlich Unterputz-Verteilerschrank und Anschluss der Heizkreise.",
             "einheit": "St", "kg": "423", "gen": "B",
             "varianten": [{"n": "3", "h": 3.0, "mat": 360}, {"n": "5", "h": 3.5, "mat": 450}, {"n": "8", "h": 4.5, "mat": 620},
                           {"n": "12", "h": 6.0, "mat": 850}]},
            {"kurz": "Einzelraumregelung Fußbodenheizung, Raumthermostat und Stellantrieb",
             "lang": "Einzelraumregelung je Raum: Raumthermostat (Funk oder Bus), Anteil Regelleiste und thermischer "
                     "Stellantrieb am Verteiler, montieren, verdrahten und einstellen. Abrechnung je Regelzone.",
             "einheit": "St", "kg": "423", "h": 1.0, "mat": 120, "gen": "B"},
            {"kurz": "Wand-/Deckenheizung Nasssystem, Rohr 10 mm, je m²",
             "lang": "Wandflächenheizung mit Kapillar- bzw. Kleinrohrregistern 10 mm auf Wand befestigen, zum Einputzen "
                     "vorbereitet, einschließlich Anschlussleitungen bis Verteiler und Druckprobe. Abrechnung nach belegter Fläche.",
             "einheit": "m²", "kg": "423", "h": 0.70, "mat": 48, "gen": "C"},
        ]},
        {"name": "Heizkörper", "positionen": [
            {"kurz": "Flachheizkörper Kompakt Typ {typ}, BH {bh} mm, BL {bl} mm",
             "lang": "Stahl-Flachheizkörper (Kompaktheizkörper) Typ {typ}, Bauhöhe {bh} mm, Baulänge {bl} mm, "
                     "weiß pulverbeschichtet, mit Befestigungskonsolen, Entlüftung und Blindstopfen, einschließlich "
                     "Anschlussverschraubung und Druckprobe. Thermostatventil gesondert.",
             "einheit": "St", "kg": "423", "gen": "A",
             "varianten": [{"typ": "11", "bh": "600", "bl": "800", "h": 1.6, "mat": 105}, {"typ": "22", "bh": "600", "bl": "800", "h": 1.8, "mat": 165},
                           {"typ": "22", "bh": "600", "bl": "1200", "h": 2.0, "mat": 230}, {"typ": "22", "bh": "600", "bl": "1600", "h": 2.2, "mat": 300},
                           {"typ": "33", "bh": "600", "bl": "1200", "h": 2.2, "mat": 330}, {"typ": "33", "bh": "600", "bl": "2000", "h": 2.6, "mat": 520},
                           {"typ": "22", "bh": "900", "bl": "1000", "h": 2.0, "mat": 285}]},
            {"kurz": "Ventilheizkörper mit Mittenanschluss Typ {typ}, BL {bl} mm",
             "lang": "Stahl-Ventilheizkörper mit integriertem Ventileinsatz und Anschluss unten mittig, Typ {typ}, "
                     "Bauhöhe 600 mm, Baulänge {bl} mm, mit Anschlussarmatur (Hahnblock) und Druckprobe.",
             "einheit": "St", "kg": "423", "gen": "A",
             "varianten": [{"typ": "22", "bl": "1000", "h": 2.0, "mat": 275}, {"typ": "33", "bl": "1400", "h": 2.4, "mat": 430}]},
            {"kurz": "Badheizkörper Handtuchwärmer {b} × {hh} mm",
             "lang": "Badheizkörper als Handtuchwärmer aus Stahlrohr, weiß, Breite {b} mm, Höhe {hh} mm, "
                     "mit Wandkonsolen, Entlüfter und Anschlussgarnitur, optional mit Elektroheizstab (gesondert).",
             "einheit": "St", "kg": "423", "gen": "B",
             "varianten": [{"b": "500", "hh": "1200", "h": 2.0, "mat": 210}, {"b": "600", "hh": "1800", "h": 2.4, "mat": 330}]},
            {"kurz": "Röhrenradiator {s}-säulig, BH {bh} mm, je Glied",
             "lang": "Stahl-Röhrenradiator {s}-säulig, Bauhöhe {bh} mm, weiß, montieren mit Konsolen und Anschlussarmaturen. "
                     "Abrechnung je Glied.",
             "einheit": "St", "kg": "423", "gen": "B",
             "varianten": [{"s": "3", "bh": "600", "h": 0.10, "mat": 14}, {"s": "4", "bh": "900", "h": 0.12, "mat": 22}]},
            {"kurz": "Unterflurkonvektor mit Gebläse, Länge {l} mm",
             "lang": "Unterflurkonvektor für bodentiefe Verglasungen mit EC-Gebläse und Rollrost Aluminium, Kanalbreite "
                     "bis 260 mm, Länge {l} mm, einschließlich Höhenjustierung und Anschluss.",
             "einheit": "St", "kg": "423", "gen": "C",
             "varianten": [{"l": "1250", "h": 3.0, "mat": 980}, {"l": "2000", "h": 3.5, "mat": 1450}]},
            {"kurz": "Thermostatventil mit Voreinstellung und Thermostatkopf, DN {dn}",
             "lang": "Thermostatventilunterteil mit stufenloser Voreinstellung, Durchgangs- oder Eckform, DN {dn}, "
                     "mit Thermostatkopf (Flüssigkeitsfühler) und Rücklaufverschraubung, einbauen und voreinstellen.",
             "einheit": "St", "kg": "423", "gen": "A",
             "varianten": [{"dn": "10", "h": 0.6, "mat": 42}, {"dn": "15", "h": 0.6, "mat": 46}]},
            {"kurz": "Heizkörper demontieren und wieder montieren (Malerarbeiten)",
             "lang": "Vorhandenen Heizkörper für Maler- oder Putzarbeiten entleeren bzw. absperren, abnehmen, lagern, "
                     "wieder montieren, befüllen und entlüften.",
             "einheit": "St", "kg": "423", "h": 1.5, "mat": 5, "gen": "B", "tags": ["altbau"]},
            {"kurz": "Heizkörper demontieren und entsorgen",
             "lang": "Vorhandenen Heizkörper einschließlich Ventil und Konsolen demontieren, Anschlüsse verschließen, "
                     "Altmaterial entsorgen.",
             "einheit": "St", "kg": "423", "h": 1.0, "mat": 3, "geraet": 12, "gen": "B", "tags": ["altbau"]},
        ]},
    ],
}]

# ---------------------------------------------------------------- Ergänzungen (Runde 2)
HK_FARBE = [{"k": "", "t": "Farbe weiß RAL 9016."}, {"k": "Sonderfarbe", "t": "Pulverbeschichtung in Sonderfarbe nach RAL bzw. Strukturlack.", "fm": 1.3}]
HK_ANSCHLUSS = [{"k": "", "t": "Anschluss seitlich bzw. rechts unten."},
                {"k": "Anschluss aus Boden", "t": "Anschluss von unten aus dem Fußboden mit Anschlussgarnitur und Rosetten.", "fh": 1.1, "mat": 25},
                {"k": "Anschluss aus Wand", "t": "Anschluss aus der Wand mit Anschlusswinkeln und Rosetten.", "fh": 1.05, "mat": 18}]
FBH_UNTERGRUND = [{"k": "", "t": ""},
                  {"k": "Dämmung EPS 040 DEO", "t": "Einschließlich zusätzlicher Wärmedämmung EPS 040 DEO 40 mm unter der Systemplatte.", "mat": 7, "h": 0.04},
                  {"k": "Holzbalkendecke", "t": "Untergrund Holzbalkendecke bzw. Trockenestrich, mit Lastverteilungsplatte und Abstimmung mit Statik.", "fh": 1.2, "mat": 6, "gen": "C"}]
LBS[0]["gruppen"][0]["positionen"] += [
    {"kurz": "Zulage Formstück/Pressfitting Heizung {d} mm",
     "lang": "Zulage zur Rohrleitung für Formstücke (Bogen, T-Stück, Reduzierung, Übergang) des gewählten Systems, Durchmesser {d} mm, "
             "soweit nicht in den Rohrpositionen enthalten. Abrechnung je Formstück.",
     "einheit": "St", "kg": "422", "gen": "A",
     "varianten": [{"d": "15–22", "h": 0.12, "mat": 6}, {"d": "28–35", "h": 0.16, "mat": 11}, {"d": "42–54", "h": 0.22, "mat": 22}, {"d": "76–108", "h": 0.35, "mat": 55}]},
    {"kurz": "Heizkörper-Anbindeleitung Mehrschichtverbund 16 mm, je Heizkörper",
     "lang": "Anbindung eines Heizkörpers an die Verteilleitung bzw. den Heizkreisverteiler mit Mehrschichtverbundrohr 16 mm "
             "vorgedämmt, Vor- und Rücklauf bis je 8 m, einschließlich Formteile.",
     "einheit": "St", "kg": "422", "h": 2.0, "mat": 95, "gen": "B"},
    {"kurz": "Kernbohrung für Rohrdurchführung, Ø bis {d} mm, d bis 30 cm",
     "lang": "Kernbohrung durch Wand bzw. Decke aus Beton oder Mauerwerk, Ø bis {d} mm, Dicke bis 30 cm, nass gebohrt, "
             "Bohrkern entsorgen. Statische Freigabe bauseits.",
     "einheit": "St", "kg": "422", "gen": "B", "lohn": "abbruch",
     "varianten": [{"d": "50", "h": 0.6, "mat": 0, "geraet": 25}, {"d": "100", "h": 0.8, "mat": 0, "geraet": 35}, {"d": "200", "h": 1.2, "mat": 0, "geraet": 60}]},
    {"kurz": "Wanddurchführung mit Futterrohr und Ringraumdichtung, DN {dn}",
     "lang": "Futterrohr aus PVC bzw. Stahl in Wand oder Decke einsetzen, Ringraum mit Dichtung bzw. Schalldämmung schließen, DN {dn}.",
     "einheit": "St", "kg": "422", "gen": "A", "varianten": [{"dn": "50", "h": 0.5, "mat": 18}, {"dn": "100", "h": 0.7, "mat": 32}]},
    {"kurz": "Rohrleitungen kennzeichnen nach DIN 2403",
     "lang": "Kennzeichnung der Rohrleitungen mit Schildern bzw. Klebebändern (Medium, Fließrichtung) nach DIN 2403. Abrechnung je Kennzeichnung.",
     "einheit": "St", "kg": "422", "h": 0.08, "mat": 2.5, "gen": "A"},
    {"kurz": "Heizungsleitungen demontieren und entsorgen, bis DN {dn}",
     "lang": "Vorhandene, außer Betrieb genommene Heizungsleitungen einschließlich Halterungen und Dämmung demontieren und entsorgen, "
             "Restleitungen verschließen, bis DN {dn}. Abrechnung nach Länge.",
     "einheit": "m", "kg": "422", "gen": "B", "tags": ["altbau"], "lohn": "abbruch",
     "varianten": [{"dn": "32", "h": 0.18, "mat": 0, "geraet": 1.5}, {"dn": "80", "h": 0.35, "mat": 0, "geraet": 3.5}]},
    {"kurz": "Anlage entleeren, wiederbefüllen und entlüften (Bestand)",
     "lang": "Bestehende Heizungsanlage bzw. Anlagenteil entleeren, nach den Arbeiten mit aufbereitetem Wasser wiederbefüllen, "
             "entlüften und in Betrieb nehmen.",
     "einheit": "psch", "kg": "422", "h": 3, "mat": 30, "gen": "B", "tags": ["altbau"]},
]
LBS[0]["gruppen"][1]["positionen"] += [
    {"kurz": "Rückschlagklappe/Schwerkraftbremse DN {dn}",
     "lang": "Rückschlagventil bzw. Schwerkraftbremse aus Messing, DN {dn}, einbauen.",
     "einheit": "St", "kg": "422", "gen": "A", "varianten": [{"dn": "20", "h": 0.4, "mat": 22}, {"dn": "32", "h": 0.5, "mat": 38}, {"dn": "50", "h": 0.7, "mat": 85}]},
    {"kurz": "Schmutzfänger DN {dn}",
     "lang": "Schmutzfänger mit Sieb aus Edelstahl, DN {dn}, einbauen.",
     "einheit": "St", "kg": "422", "gen": "A", "varianten": [{"dn": "25", "h": 0.5, "mat": 28}, {"dn": "50", "h": 0.8, "mat": 78}, {"dn": "80", "h": 1.5, "mat": 210}]},
    {"kurz": "Dreiwege-Mischventil mit Stellantrieb DN {dn}",
     "lang": "Dreiwege-Mischventil mit stetigem Stellantrieb 24 V, DN {dn}, einbauen und an Regelung anschließen.",
     "einheit": "St", "kg": "422", "gen": "B", "varianten": [{"dn": "20", "h": 1.2, "mat": 290}, {"dn": "32", "h": 1.5, "mat": 380}, {"dn": "50", "h": 2.0, "mat": 620}]},
    {"kurz": "Thermometer/Manometer mit Tauchhülse",
     "lang": "Zeigerthermometer bzw. Manometer mit Tauchhülse bzw. Absperrhahn in die Rohrleitung einbauen.",
     "einheit": "St", "kg": "422", "h": 0.3, "mat": 22, "gen": "A"},
    {"kurz": "Entleerungshahn KFE DN 15 mit Kappe",
     "lang": "Kesselfüll- und Entleerungshahn DN 15 mit Schlauchanschluss und Kappe einbauen.",
     "einheit": "St", "kg": "422", "h": 0.25, "mat": 9, "gen": "A"},
]
LBS[0]["gruppen"][2]["positionen"] += [
    {"kurz": "Zulage Fußbodenheizung Randdämmstreifen und Dehnfugenprofil",
     "lang": "Zulage für Bewegungsfugenprofile mit Rohrschutzhülsen im Bereich von Feldbegrenzungen. Abrechnung nach Fugenlänge.",
     "einheit": "m", "kg": "423", "h": 0.12, "mat": 6, "gen": "A"},
    {"kurz": "Fußbodenheizung Industrieboden auf Bewehrungsmatte, VA {va} cm",
     "lang": "Heizrohr PE-Xa 20 mm auf Bewehrungsmatte bzw. Trägermatte für Heizestriche in Hallen und Industrieböden, "
             "Verlegeabstand {va} cm, einschließlich Rohranteile bis Verteiler und Druckprobe.",
     "einheit": "m²", "kg": "423", "gen": "B", "varianten": [{"va": "15", "h": 0.18, "mat": 13}, {"va": "25", "h": 0.14, "mat": 9}]},
    {"kurz": "Heizestrich-Belegreifheizen mit Protokoll",
     "lang": "Funktionsheizen und Belegreifheizen des Heizestrichs nach Aufheizprotokoll (DIN EN 1264-4) steuern und dokumentieren.",
     "einheit": "psch", "kg": "423", "h": 3, "mat": 0, "gen": "A"},
    {"kurz": "Deckenstrahlplatte/Deckenheizband Hallen, Breite {b} mm",
     "lang": "Deckenstrahlplatten bzw. Strahlbänder aus Stahl mit Dämmauflage, Breite {b} mm, abgehängt, mit Anschlüssen. Abrechnung nach Länge.",
     "einheit": "m", "kg": "423", "gen": "C", "varianten": [{"b": "600", "h": 1.0, "mat": 140}, {"b": "1200", "h": 1.3, "mat": 240}]},
]
LBS[0]["gruppen"][3]["positionen"] += [
    {"kurz": "Heizkörperverkleidung/Heizkörpernische, Länge {l} mm",
     "lang": "Heizkörperverkleidung aus pulverbeschichtetem Stahlblech mit Luftgitter, abnehmbar, Länge {l} mm.",
     "einheit": "St", "kg": "423", "gen": "C", "varianten": [{"l": "1000", "h": 1.5, "mat": 260}, {"l": "1600", "h": 1.8, "mat": 360}]},
    {"kurz": "Heizkörper-Wandkonsolen Zulage Stand-/Bodenkonsole",
     "lang": "Zulage für Standkonsolen zur Bodenmontage vor Glasflächen bzw. Leichtwänden, je Heizkörper ein Paar.",
     "einheit": "St", "kg": "423", "h": 0.5, "mat": 45, "gen": "A"},
    {"kurz": "Thermostatkopf tauschen, {art_k}",
     "lang": "Thermostatkopf auf vorhandenes Ventilunterteil montieren: {art}.",
     "einheit": "St", "kg": "423", "gen": "A",
     "varianten": [{"art": "Standard-Flüssigkeitsfühler", "art_k": "Standard", "h": 0.25, "mat": 18},
                   {"art": "Behördenmodell, diebstahlgesichert", "art_k": "Behördenmodell", "h": 0.3, "mat": 28},
                   {"art": "elektronisch programmierbar/Funk", "art_k": "elektronisch/Funk", "h": 0.4, "mat": 65}]},
    {"kurz": "Kompaktheizkörper hygienisch (Planfront ohne Konvektor), Typ 20, BL {bl} mm",
     "lang": "Hygieneheizkörper ohne Konvektorbleche (Krankenhaus, Pflege), Typ 20, Bauhöhe 600 mm, Baulänge {bl} mm, montiert.",
     "einheit": "St", "kg": "423", "gen": "B", "varianten": [{"bl": "1000", "h": 1.8, "mat": 260}, {"bl": "1600", "h": 2.2, "mat": 390}]},
]
zuweisen(LBS, vorab() + [
    (ist("m", kurz=r"Mehrschichtverbund|Kupfer"), [VERLEGUNG_ROHR, DAEMMUNG_VORGEDAEMMT, ORT, MENGE]),
    (ist("m", kurz=r"C-Stahl|Stahl geschw"), [VERLEGUNG_ROHR, ORT, MENGE]),
    (ist("m", kurz=r"Nahwärme"), [ORT_KLEIN, MENGE]),
    (ist("St", kurz=r"Röhren"), [HK_FARBE, ORT_KLEIN]),   # je Glied: keine Zuschläge je Heizkörper
    (ist("St", kurz=r"Ventilheiz"), [HK_FARBE, [{}] + HK_ANSCHLUSS[1:], BEFESTIGUNG, ORT_KLEIN]),   # Anschluss unten mittig
    (ist("St", kurz=r"Flachheiz|Badheiz|Hygiene"), [HK_FARBE, HK_ANSCHLUSS, BEFESTIGUNG, ORT_KLEIN]),
    (ist("m²", kurz=r"Fußbodenheizung (Noppen|Tacker)"), [FBH_UNTERGRUND, ORT_KLEIN, MENGE]),
    (ist(("m²", "m")), [ORT_KLEIN, MENGE]),
    (lambda g, p: bool(re.search(INLINE_RX, p.get("kurz", ""), re.I)), [ORT]),
    (ist("St", gruppe=r"Armaturen"), [ORT, BEFESTIGUNG]),
    (ist("St"), [ORT, BEFESTIGUNG]),
    (ist(), [ORT_KLEIN]),
])


# Große Rohrdurchmesser nicht unter Putz im Schlitz (Schlitzmaß, Statik): Achse je Variante ohne diese Verlegeart
def _ohne_up(lbs, grenze_d=40, grenze_dn=32):
    for lb in lbs:
        for gr in lb["gruppen"]:
            for p in gr["positionen"]:
                ax = p.get("achsen") or []
                if VERLEGUNG_ROHR not in ax:
                    continue
                for v in p.get("varianten") or [{}]:
                    try:
                        gross = float(str(v.get("d", "0")).replace(",", ".")) >= grenze_d or float(str(v.get("dn", "0"))) >= grenze_dn
                    except ValueError:
                        gross = False
                    if gross or re.search(r"Stahl geschw", p["kurz"]):
                        v["achsen"] = [VERLEGUNG_ROHR[:4] if a is VERLEGUNG_ROHR else a for a in ax]


_ohne_up(LBS)
