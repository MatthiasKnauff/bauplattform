import re
# LB 040 Wärmeversorgungsanlagen – Betriebseinrichtungen (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "040", "name": "Wärmeversorgungsanlagen – Betriebseinrichtungen", "atv": "DIN 18380", "lohn": "heizung",
    "gruppen": [
        {"name": "Wärmepumpen", "positionen": [
            {"kurz": "Luft-Wasser-Wärmepumpe Monoblock, Außenaufstellung, {kw} kW",
             "lang": "Luft-Wasser-Wärmepumpe in Monoblock-Bauweise zur Außenaufstellung liefern, aufstellen und anschließen, "
                     "Heizleistung {kw} kW bei A2/W35, Kältemittel mit niedrigem Treibhauspotenzial (z. B. R290), "
                     "modulierender Verdichter, Vorlauftemperatur bis mindestens 65 °C, schallgedämmte Ausführung, "
                     "mit Regelung und Außenfühler. Einschließlich Aufstellung auf bauseitigem Fundament bzw. Konsole, "
                     "schwingungsentkoppelte Anschlüsse und Kondensatableitung. Peripherie (Speicher, Hydraulik) gesondert.",
             "einheit": "St", "kg": "421", "gen": "C", "tags": ["neubau", "altbau"],
             "varianten": [{"kw": "5", "h": 20, "mat": 8600}, {"kw": "8", "h": 22, "mat": 10400}, {"kw": "10", "h": 24, "mat": 12500},
                           {"kw": "12", "h": 26, "mat": 14200}, {"kw": "16", "h": 30, "mat": 17600}, {"kw": "25", "h": 40, "mat": 26500},
                           {"kw": "40", "h": 56, "mat": 41000}]},
            {"kurz": "Luft-Wasser-Wärmepumpe Split, Innen-/Außeneinheit, {kw} kW",
             "lang": "Luft-Wasser-Wärmepumpe in Split-Bauweise mit Außeneinheit und Inneneinheit (Hydraulikmodul mit "
                     "Umwälzpumpe, Heizstab, Sicherheitsgruppe) liefern und montieren, Heizleistung {kw} kW bei A2/W35. "
                     "Einschließlich Kältemittelleitung bis 10 m, Befüllung und Dichtheitsprüfung durch zertifiziertes Personal.",
             "einheit": "St", "kg": "421", "gen": "C",
             "varianten": [{"kw": "6", "h": 26, "mat": 8200}, {"kw": "9", "h": 28, "mat": 9800}, {"kw": "12", "h": 30, "mat": 12000}]},
            {"kurz": "Sole-Wasser-Wärmepumpe, {kw} kW, Innenaufstellung",
             "lang": "Sole-Wasser-Wärmepumpe zur Innenaufstellung liefern, aufstellen und anschließen, Heizleistung "
                     "{kw} kW bei B0/W35, mit integrierter Sole- und Heizungsumwälzpumpe, Regelung und Außenfühler. "
                     "Erdsonden bzw. Kollektor und Solekreis gesondert.",
             "einheit": "St", "kg": "421", "gen": "C",
             "varianten": [{"kw": "6", "h": 20, "mat": 9800}, {"kw": "10", "h": 22, "mat": 11800}, {"kw": "16", "h": 26, "mat": 15500}]},
            {"kurz": "Erdwärmesonde Doppel-U, Bohrtiefe je m",
             "lang": "Erdwärmesonde als Doppel-U-Sonde PE 100-RC 32 mm herstellen, Bohrung im Spülbohrverfahren, "
                     "Verpressung mit thermisch verbesserter Verfüllsuspension, Druckprüfung, Dokumentation. "
                     "Genehmigung und Baustelleneinrichtung des Bohrunternehmens gesondert. Abrechnung nach Bohrmeter.",
             "einheit": "m", "kg": "421", "h": 0.15, "mat": 30, "geraet": 32, "gen": "C"},
            {"kurz": "Solekreis-Verteiler mit Füllstation, {n} Sondenkreise",
             "lang": "Soleverteiler aus Kunststoff bzw. Edelstahl mit Absperr- und Regulierventilen je Kreis, "
                     "Füll- und Spülstation, Befüllung mit Wasser-Glykol-Gemisch, für {n} Sondenkreise.",
             "einheit": "St", "kg": "421", "gen": "B",
             "varianten": [{"n": "2", "h": 6, "mat": 780}, {"n": "4", "h": 9, "mat": 1350}]},
        ]},
        {"name": "Kessel, Fernwärme", "positionen": [
            {"kurz": "Gas-Brennwerttherme wandhängend, {kw} kW",
             "lang": "Gas-Brennwertgerät wandhängend liefern und montieren, Nennwärmeleistung bis {kw} kW, "
                     "Modulationsbereich mindestens 1:8, mit integrierter Hocheffizienzpumpe, witterungsgeführter Regelung "
                     "und Außenfühler, wasserstoffbeimischungsfähig nach Herstellerangabe. Einschließlich Montageplatte, "
                     "Gas- und Kondensatanschluss, Neutralisation, Inbetriebnahme mit Abgasmessung.",
             "einheit": "St", "kg": "421", "gen": "B",
             "varianten": [{"kw": "15", "h": 12, "mat": 2900}, {"kw": "25", "h": 13, "mat": 3400}, {"kw": "35", "h": 14, "mat": 4100}]},
            {"kurz": "Gas-Brennwertkessel bodenstehend, {kw} kW",
             "lang": "Bodenstehender Gas-Brennwertkessel liefern, aufstellen und anschließen, Nennwärmeleistung {kw} kW, "
                     "Edelstahl-Wärmetauscher, modulierender Brenner, Kaskadenfähigkeit, mit Regelung für mehrere Heizkreise. "
                     "Einschließlich Inbetriebnahme und Einweisung.",
             "einheit": "St", "kg": "421", "gen": "C",
             "varianten": [{"kw": "50", "h": 24, "mat": 7800}, {"kw": "100", "h": 32, "mat": 12500}, {"kw": "200", "h": 44, "mat": 21000}]},
            {"kurz": "Abgassystem Kunststoff für Brennwert, im Schacht, DN {dn}",
             "lang": "Abgasleitung aus PP für Brennwertgeräte im vorhandenen bzw. bauseitigen Schacht montieren, DN {dn}, "
                     "mit Abstandhaltern, Schachtabdeckung, Revisions- und Anschlussstück, Abnahme durch Bezirksschornsteinfeger "
                     "vorbereiten. Abrechnung nach Länge, Formteile anteilig enthalten.",
             "einheit": "m", "kg": "429", "gen": "B",
             "varianten": [{"dn": "80", "h": 0.8, "mat": 38}, {"dn": "110", "h": 0.9, "mat": 52}, {"dn": "160", "h": 1.1, "mat": 85}]},
            {"kurz": "Fernwärme-Übergabestation kompakt, {kw} kW",
             "lang": "Kompakte Fernwärme-Hausstation nach Technischen Anschlussbedingungen des Versorgers liefern und "
                     "montieren, indirekter Anschluss mit Plattenwärmetauscher, Anschlussleistung {kw} kW, mit Regelung, "
                     "Differenzdruckregler, Sicherheitseinrichtungen und Wärmemengenzähler-Passstück.",
             "einheit": "St", "kg": "421", "gen": "C",
             "varianten": [{"kw": "15", "h": 14, "mat": 4800}, {"kw": "50", "h": 20, "mat": 8600}, {"kw": "150", "h": 30, "mat": 16500}]},
            {"kurz": "Pelletkessel mit Saugaustragung, {kw} kW",
             "lang": "Holzpelletkessel mit automatischer Zündung, Brennraumreinigung und Ascheaustragung, Nennleistung "
                     "{kw} kW, einschließlich Saugaustragung aus bauseitigem Lagerraum, Rücklaufanhebung und Regelung.",
             "einheit": "St", "kg": "421", "gen": "C",
             "varianten": [{"kw": "15", "h": 30, "mat": 16500}, {"kw": "25", "h": 34, "mat": 19500}]},
            {"kurz": "Solarthermie Flachkollektoren Aufdach, Kollektorfläche je m²",
             "lang": "Thermische Solaranlage mit Flachkollektoren auf Schrägdach, Aufdachmontage mit Dachhaken, "
                     "einschließlich Solarstation, Solarleitung Edelstahl gedämmt bis 15 m, Regelung und Befüllung. "
                     "Abrechnung nach Bruttokollektorfläche.",
             "einheit": "m²", "kg": "421", "h": 3.5, "mat": 520, "gen": "C"},
        ]},
        {"name": "Speicher", "positionen": [
            {"kurz": "Pufferspeicher Heizwasser {l} l",
             "lang": "Pufferspeicher für Heizungswasser aus Stahl liefern und aufstellen, Inhalt {l} l, mit Wärmedämmung "
                     "mindestens Effizienzklasse B, Anschlüsse für Vorlauf, Rücklauf und Fühler. Einschließlich Entleerung, "
                     "Entlüftung und Anschluss an die Rohrleitungen.",
             "einheit": "St", "kg": "421", "gen": "B",
             "varianten": [{"l": "100", "h": 3, "mat": 650}, {"l": "300", "h": 4, "mat": 1050}, {"l": "500", "h": 5, "mat": 1450},
                           {"l": "800", "h": 6, "mat": 1950}, {"l": "1000", "h": 7, "mat": 2350}]},
            {"kurz": "Trinkwasserspeicher für Wärmepumpe, {l} l",
             "lang": "Trinkwasser-Speicher-Wassererwärmer emailliert mit großflächigem Glattrohr-Wärmetauscher für "
                     "Wärmepumpenbetrieb, Inhalt {l} l, Schutzanode, Wärmedämmung, Anschluss Zirkulation, "
                     "einschließlich Sicherheitsgruppe nach DIN 1988.",
             "einheit": "St", "kg": "421", "gen": "B",
             "varianten": [{"l": "200", "h": 5, "mat": 1500}, {"l": "300", "h": 6, "mat": 1900}, {"l": "500", "h": 7, "mat": 2650}]},
            {"kurz": "Frischwasserstation, Zapfleistung bis {lmin} l/min",
             "lang": "Frischwasserstation zur hygienischen Trinkwassererwärmung im Durchflussprinzip am Pufferspeicher, "
                     "Edelstahl-Plattenwärmetauscher, drehzahlgeregelte Primärpumpe, Zapfleistung bis {lmin} l/min, "
                     "optional Zirkulationsmodul.",
             "einheit": "St", "kg": "421", "gen": "C",
             "varianten": [{"lmin": "25", "h": 6, "mat": 1850}, {"lmin": "40", "h": 7, "mat": 2600}]},
            {"kurz": "Elektro-Durchlauferhitzer elektronisch, {kw} kW",
             "lang": "Elektronisch geregelter Durchlauferhitzer zur dezentralen Warmwasserbereitung, {kw} kW, "
                     "temperaturgenau, montieren und an bauseitige Wasser- und Elektroanschlüsse anschließen.",
             "einheit": "St", "kg": "412", "gen": "B", "lohn": "sanitaer",
             "varianten": [{"kw": "18", "h": 2.5, "mat": 470}, {"kw": "24", "h": 2.5, "mat": 540}]},
            {"kurz": "Kleinspeicher untertisch, 5 l",
             "lang": "Elektro-Kleinspeicher 5 l drucklos für Untertischmontage mit Spezialarmatur, montieren und anschließen.",
             "einheit": "St", "kg": "412", "h": 1.5, "mat": 210, "gen": "A", "lohn": "sanitaer"},
        ]},
        {"name": "Hydraulik, Sicherheit", "positionen": [
            {"kurz": "Heizkreis-Pumpengruppe {art}, DN {dn}",
             "lang": "Vormontierte Heizkreis-Pumpengruppe {art} mit Hocheffizienzpumpe, Absperrkugelhähnen mit "
                     "Thermometern, Schwerkraftbremse und Wärmedämmschale, Anschluss DN {dn}, an Verteilerbalken montieren.",
             "einheit": "St", "kg": "421", "gen": "B",
             "varianten": [{"art": "ungemischt", "dn": "25", "h": 2.5, "mat": 520}, {"art": "gemischt mit Mischer und Stellmotor", "dn": "25", "h": 3.0, "mat": 820},
                           {"art": "gemischt mit Mischer und Stellmotor", "dn": "32", "h": 3.5, "mat": 1050}]},
            {"kurz": "Heizungsverteiler mit hydraulischer Weiche, {n} Heizkreise",
             "lang": "Verteiler-Sammler-Balken mit integrierter hydraulischer Weiche, gedämmt, für {n} Heizkreise, "
                     "einschließlich Wandkonsole und Anschlussverschraubungen.",
             "einheit": "St", "kg": "421", "gen": "B",
             "varianten": [{"n": "2", "h": 3, "mat": 560}, {"n": "3", "h": 3.5, "mat": 720}]},
            {"kurz": "Membran-Ausdehnungsgefäß Heizung {l} l",
             "lang": "Membran-Druckausdehnungsgefäß für geschlossene Heizungsanlagen nach DIN EN 12828, Nenninhalt {l} l, "
                     "mit Kappenventil und Wandhalter bzw. Standfüßen, Vordruck einstellen.",
             "einheit": "St", "kg": "421", "gen": "A",
             "varianten": [{"l": "25", "h": 1.2, "mat": 75}, {"l": "50", "h": 1.5, "mat": 120}, {"l": "100", "h": 2.0, "mat": 230},
                           {"l": "200", "h": 2.5, "mat": 420}]},
            {"kurz": "Heizungswasser-Aufbereitung, Füllen nach VDI 2035",
             "lang": "Befüllung der Heizungsanlage mit vollentsalztem Wasser nach VDI 2035 über Mischbettpatrone bzw. "
                     "mobile Anlage, Protokollierung von Leitfähigkeit und pH-Wert, Anlagenbuch übergeben. "
                     "Abrechnung nach Anlageninhalt.",
             "einheit": "l", "kg": "421", "h": 0.004, "mat": 0.35, "gen": "B"},
            {"kurz": "Magnetit-Schlammabscheider DN {dn}",
             "lang": "Schlamm- und Magnetitabscheider mit Magnetstab im Heizungsrücklauf einbauen, DN {dn}, "
                     "mit Absperrungen und Entleerung.",
             "einheit": "St", "kg": "421", "gen": "A",
             "varianten": [{"dn": "25", "h": 1.2, "mat": 165}, {"dn": "50", "h": 2.0, "mat": 520}]},
            {"kurz": "Wärmemengenzähler mit Funkmodul, qp {qp} m³/h",
             "lang": "Ultraschall-Wärmemengenzähler mit Rechenwerk und Temperaturfühlern, Nenndurchfluss {qp} m³/h, "
                     "MID-geeicht, mit Funk- bzw. M-Bus-Schnittstelle, einbauen.",
             "einheit": "St", "kg": "421", "gen": "B",
             "varianten": [{"qp": "1,5", "h": 1.2, "mat": 230}, {"qp": "6", "h": 2.0, "mat": 520}]},
        ]},
        {"name": "Inbetriebnahme, Abgleich", "positionen": [
            {"kurz": "Hydraulischer Abgleich Verfahren B, je Heizfläche",
             "lang": "Hydraulischen Abgleich nach Verfahren B (raumweise Heizlastberechnung als Grundlage) durchführen: "
                     "Voreinstellwerte berechnen, an Thermostatventilen bzw. Heizkreisen einstellen, Pumpe anpassen, "
                     "Bestätigung nach VdZ-Formular übergeben. Abrechnung je Heizfläche bzw. Heizkreis.",
             "einheit": "St", "kg": "421", "h": 0.8, "mat": 5, "gen": "B", "tags": ["altbau"]},
            {"kurz": "Raumweise Heizlastberechnung DIN EN 12831, je Raum",
             "lang": "Raumweise Heizlastberechnung nach DIN EN 12831-1 mit nationalem Anhang erstellen, je beheiztem Raum.",
             "einheit": "St", "kg": "421", "h": 0.6, "mat": 0, "gen": "B"},
            {"kurz": "Inbetriebnahme Wärmeerzeugeranlage, Einweisung, Dokumentation",
             "lang": "Inbetriebnahme der Wärmeerzeugungsanlage mit Funktionsprüfung, Einregulierung der Regelung, "
                     "Einweisung des Betreibers und Übergabe der Revisionsunterlagen (Bestandspläne, Datenblätter, Protokolle).",
             "einheit": "psch", "kg": "421", "h": 8, "mat": 50, "gen": "B"},
            {"kurz": "Alten Heizkessel demontieren und entsorgen",
             "lang": "Vorhandenen Heizkessel (Öl/Gas) bis 50 kW einschließlich Brenner und Regelung außer Betrieb nehmen, "
                     "entleeren, demontieren und fachgerecht entsorgen, Leitungen verschließen.",
             "einheit": "St", "kg": "421", "h": 6, "mat": 0, "geraet": 220, "gen": "B", "tags": ["altbau"]},
            {"kurz": "Öltank reinigen, demontieren und entsorgen, bis {l} l",
             "lang": "Heizöltank bis {l} l Inhalt durch Fachbetrieb nach WHG reinigen, Restöl absaugen, Tank zerlegen und "
                     "entsorgen, Reinigungsbescheinigung übergeben.",
             "einheit": "St", "kg": "421", "gen": "B", "tags": ["altbau"],
             "varianten": [{"l": "5.000", "h": 6, "mat": 0, "geraet": 900}, {"l": "10.000", "h": 10, "mat": 0, "geraet": 1500}]},
        ]},
    ],
}]

# ---------------------------------------------------------------- Ergänzungen (Runde 2)
WP_AUSST = [{"k": "", "t": ""},
            {"k": "mit aktiver Kühlung", "t": "Gerät reversibel mit Kühlfunktion, Taupunktüberwachung gesondert.", "fm": 1.07},
            {"k": "schallreduziert", "t": "Schallreduzierte Ausführung (Schallleistungspegel ≤ 50 dB(A) im Nachtbetrieb).", "fm": 1.12}]
BODEN = [{"k": "", "t": "Bohrgut Lockergestein, Entsorgung auf der Baustelle."},
         {"k": "Festgestein", "t": "Bohrung überwiegend im Festgestein (Imlochhammer).", "fg": 1.35, "gen": "C"},
         {"k": "Bohrgut entsorgen", "t": "Bohrgut und Spülung abfahren und entsorgen.", "geraet": 9}]
LBS[0]["gruppen"][0]["positionen"] += [
    {"kurz": "Fundament/Sockel für Wärmepumpen-Außeneinheit, {art}",
     "lang": "Aufstellfläche für die Außeneinheit herstellen: {art}, frostfrei gegründet, mit Kondensat-Sickerpackung aus Kies "
             "und Leerrohren für Hydraulik- und Elektroleitungen.",
     "einheit": "St", "kg": "421", "gen": "B", "lohn": "rohbau",
     "varianten": [{"art": "Streifenfundamente Beton", "h": 6, "mat": 180}, {"art": "Bodenkonsole/Montageschienen auf Rasengittersteinen", "h": 3, "mat": 260}]},
    {"kurz": "Wandkonsole für Wärmepumpe, schwingungsgedämpft",
     "lang": "Wandkonsole aus verzinktem Stahl mit Schwingungsdämpfern für die Außeneinheit, Befestigung mit zugelassenen Ankern.",
     "einheit": "St", "kg": "421", "h": 2.5, "mat": 240, "gen": "B"},
    {"kurz": "Schallschutzhaube/Schallschutzwand für Außeneinheit",
     "lang": "Schallschutzeinhausung bzw. absorbierende Schallschutzwand für die Außeneinheit nach Schallgutachten, montieren.",
     "einheit": "St", "kg": "421", "h": 4, "mat": 1650, "gen": "C"},
    {"kurz": "Hydraulikmodul/Inneneinheit für Monoblock-Wärmepumpe",
     "lang": "Inneneinheit mit Umwälzpumpe, Umschaltventil Heizen/Warmwasser, Sicherheitsgruppe, Heizstab und Regler-Bedienteil, "
             "an Wand montieren und anschließen.",
     "einheit": "St", "kg": "421", "h": 5, "mat": 1450, "gen": "B"},
    {"kurz": "Elektro-Heizstab für Puffer- bzw. Trinkwasserspeicher, {kw} kW",
     "lang": "Einschraubheizkörper mit Thermostat und Sicherheitstemperaturbegrenzer, {kw} kW, einbauen.",
     "einheit": "St", "kg": "421", "gen": "A",
     "varianten": [{"kw": "3", "h": 1.0, "mat": 160}, {"kw": "6", "h": 1.2, "mat": 210}, {"kw": "9", "h": 1.5, "mat": 290}]},
    {"kurz": "Energiemanager/SG-Ready-Anbindung Wärmepumpe an PV",
     "lang": "Anbindung der Wärmepumpe über SG-Ready-Kontakte bzw. Modbus/EEBus an Energiemanager bzw. PV-Wechselrichter, "
             "Parametrierung des Überschussbetriebs.",
     "einheit": "St", "kg": "421", "h": 3, "mat": 380, "gen": "C"},
    {"kurz": "Kältemittel-Dokumentation F-Gase und Dichtheitsprüfung",
     "lang": "Dokumentation nach F-Gase-Verordnung (Kältemittelmenge, CO₂-Äquivalent), Dichtheitsprüfung und Eintrag ins Anlagenlogbuch.",
     "einheit": "St", "kg": "421", "h": 1.5, "mat": 0, "gen": "A"},
]
LBS[0]["gruppen"][1]["positionen"] += [
    {"kurz": "Edelstahl-Abgasleitung zur Schornsteinsanierung, DN {dn}",
     "lang": "Einschaliges Edelstahl-Abgasrohr (1.4404) zur Sanierung eines bestehenden Schornsteins, DN {dn}, in den Schacht "
             "einziehen, mit Abstandhaltern, Reinigungselement, Kopfabdeckung und Anschluss. Abrechnung nach Länge.",
     "einheit": "m", "kg": "429", "gen": "B", "tags": ["altbau"],
     "varianten": [{"dn": "130", "h": 0.9, "mat": 88}, {"dn": "150", "h": 1.0, "mat": 98}, {"dn": "180", "h": 1.1, "mat": 118}]},
    {"kurz": "Doppelwandiger Edelstahlschornstein außen, DN {dn}",
     "lang": "Doppelwandiger, wärmegedämmter Edelstahl-Fassadenschornstein, DN {dn}, mit Wandhaltern, Bodenkonsole, Revision und "
             "Mündungsabschluss. Abrechnung nach Höhe.",
     "einheit": "m", "kg": "429", "gen": "C",
     "varianten": [{"dn": "150", "h": 1.2, "mat": 240}, {"dn": "200", "h": 1.4, "mat": 310}]},
    {"kurz": "Verbrennungsluftöffnung/Zuluftleitung Heizraum",
     "lang": "Verbrennungsluftöffnung nach FeuVO mit Wetterschutzgitter bzw. Zuluftleitung DN 150 bis 3 m herstellen.",
     "einheit": "St", "kg": "429", "h": 2, "mat": 120, "gen": "B"},
    {"kurz": "Brennwert-Kaskade 2 Geräte, hydraulisches und Regelungsset",
     "lang": "Kaskadenset für zwei wandhängende Brennwertgeräte mit Sammler, hydraulischer Weiche, Rückschlagklappen, Abgassammler und Kaskadenregler.",
     "einheit": "St", "kg": "421", "h": 10, "mat": 2400, "gen": "C"},
    {"kurz": "Gas-Brennwerttherme mit integriertem Warmwasser (Kombitherme), {kw} kW",
     "lang": "Gas-Brennwert-Kombigerät mit Durchlauf-Warmwasserbereitung, {kw} kW, montieren und anschließen, Inbetriebnahme mit Abgasmessung.",
     "einheit": "St", "kg": "421", "gen": "B",
     "varianten": [{"kw": "25", "h": 12, "mat": 3100}, {"kw": "30", "h": 12, "mat": 3500}]},
]
LBS[0]["gruppen"][2]["positionen"] += [
    {"kurz": "Kombispeicher Heizung/Trinkwasser (Hygienespeicher), {l} l",
     "lang": "Hygiene-Kombispeicher mit Edelstahl-Wellrohr für Trinkwasser im Durchlaufprinzip, {l} l, Schichtladeeinrichtung, Dämmung.",
     "einheit": "St", "kg": "421", "gen": "B",
     "varianten": [{"l": "500", "h": 6, "mat": 2350}, {"l": "800", "h": 7, "mat": 2950}]},
    {"kurz": "Trinkwasser-Wärmepumpe (Brauchwasser-WP), {l} l",
     "lang": "Trinkwasser-Wärmepumpe mit integriertem Speicher {l} l, Umluft- bzw. Abluftbetrieb, aufstellen und anschließen.",
     "einheit": "St", "kg": "421", "gen": "B",
     "varianten": [{"l": "200", "h": 5, "mat": 2100}, {"l": "300", "h": 6, "mat": 2600}]},
    {"kurz": "Speicher bzw. Boiler demontieren und entsorgen, bis {l} l",
     "lang": "Vorhandenen Speicher bzw. Warmwasserbereiter entleeren, abklemmen, demontieren und entsorgen, bis {l} l.",
     "einheit": "St", "kg": "421", "gen": "B", "tags": ["altbau"],
     "varianten": [{"l": "150", "h": 2.5, "mat": 0, "geraet": 60}, {"l": "500", "h": 4, "mat": 0, "geraet": 120}]},
]
LBS[0]["gruppen"][3]["positionen"] += [
    {"kurz": "Sicherheitsventil Heizung {bar} bar, mit Ablauftrichter",
     "lang": "Membran-Sicherheitsventil {bar} bar, Abblaseleitung mit Ablauftrichter und Geruchsverschluss, einbauen.",
     "einheit": "St", "kg": "421", "gen": "A", "varianten": [{"bar": "2,5", "h": 0.8, "mat": 42}, {"bar": "3", "h": 0.8, "mat": 45}]},
    {"kurz": "Druckhaltestation mit Pumpe und Nachspeisung, bis {kw} kW",
     "lang": "Pumpengesteuerte Druckhalte- und Entgasungsstation mit Nachspeiseautomatik und Systemtrenner für Anlagen bis {kw} kW.",
     "einheit": "St", "kg": "421", "gen": "C", "varianten": [{"kw": "300", "h": 10, "mat": 4800}, {"kw": "1000", "h": 14, "mat": 8200}]},
    {"kurz": "Regelung Heizungsanlage, witterungsgeführt, {n} Heizkreise",
     "lang": "Heizungsregler witterungsgeführt mit Außenfühler, Vorlauffühlern und Speicherfühler für {n} Heizkreise, montieren, verdrahten, parametrieren.",
     "einheit": "St", "kg": "421", "gen": "B",
     "varianten": [{"n": "1", "h": 4, "mat": 420}, {"n": "2", "h": 5, "mat": 650}, {"n": "3", "h": 6, "mat": 880}]},
    {"kurz": "Heizungs-Fernüberwachung/Internetmodul",
     "lang": "Internet- bzw. Fernwartungsmodul für die Wärmeerzeugung, einbinden und App einrichten.",
     "einheit": "St", "kg": "421", "h": 1.5, "mat": 260, "gen": "B"},
]
LBS[0]["gruppen"][4]["positionen"] += [
    {"kurz": "Wartung Wärmeerzeuger jährlich, {art}",
     "lang": "Wartung des Wärmeerzeugers nach Herstellervorgaben ({art}) mit Reinigung, Funktionsprüfung, Messungen und Protokoll.",
     "einheit": "St", "kg": "421", "gen": "B",
     "varianten": [{"art": "Gas-Brennwert", "h": 2.0, "mat": 45}, {"art": "Wärmepumpe", "h": 2.0, "mat": 25}, {"art": "Pelletkessel", "h": 3.5, "mat": 60}]},
    {"kurz": "Gebäudeenergiegesetz-Dokumentation, Fachunternehmererklärung",
     "lang": "Fachunternehmererklärung bzw. Bestätigung für Förderprogramme (BEG) und Nachweise nach GEG ausstellen.",
     "einheit": "St", "kg": "421", "h": 2, "mat": 0, "gen": "A"},
    {"kurz": "Heizungsprovisorium/Bautrocknung mit Elektroheizer, je Woche",
     "lang": "Provisorische Beheizung während der Bauzeit bzw. Umbauphase mit mobilem Heizgerät, Vorhaltung je Woche, Energie bauseits.",
     "einheit": "Wo", "kg": "421", "h": 0.5, "mat": 0, "geraet": 140, "gen": "C"},
]
for p in LBS[0]["gruppen"][0]["positionen"]:
    if p["kurz"].startswith("Erdwärmesonde"):
        p["achsen"] = [BODEN]
zuweisen(LBS, vorab() + [
    # Außengeräte: mit Kran-/Dachaufstellung; Sole-WP steht innen
    (ist("St", kurz=r"Wärmepumpe (Monoblock|Split)", nicht=r"Hydraulik|Inneneinheit|Konsole|Fundament|Heizstab|Energiemanager"),
     [WP_AUSST, GERAET_AUFSTELLUNG, ORT_KLEIN, WARTUNG]),
    (ist("St", kurz=r"Sole-Wasser"), [WP_AUSST[:2], GERAET_INNEN, ORT_KLEIN, WARTUNG]),
    # Zubehör und Kleinteile: ohne Kran, ohne Wartung
    (ist("St", kurz=r"Heizstab|Energiemanager|SG-Ready|Kleinspeicher|Hydraulikmodul|Inneneinheit|Wandkonsole|Fundament|Sockel|Solekreis"), [ORT_KLEIN]),
    (ist("St", gruppe=r"Wärmepumpen|Kessel|Speicher", kurz=r"kessel|therme|Station|speicher|Wärmepumpe", nicht=r"demont"),
     [GERAET_INNEN, ORT_KLEIN, WARTUNG]),
    (ist(("m", "m²")), [ORT, MENGE]),
    (lambda g, p: bool(re.search(INLINE_RX, p.get("kurz", ""), re.I)), [ORT]),
    (ist("St", gruppe=r"Hydraulik|Wärmepumpen|Kessel|Speicher"), [ORT, BEFESTIGUNG]),
    (ist(), [ORT_KLEIN]),
])
