import re
# LB 042 Gas- und Wasseranlagen – Leitungen, Armaturen (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "042", "name": "Gas- und Wasseranlagen – Leitungen, Armaturen", "atv": "DIN 18381", "lohn": "sanitaer",
    "gruppen": [
        {"name": "Trinkwasserleitungen", "positionen": [
            {"kurz": "Trinkwasserleitung Mehrschichtverbund {d} mm",
             "lang": "Trinkwasserleitung aus Mehrschichtverbundrohr mit DVGW-Zulassung, Außendurchmesser {d} mm, "
                     "mit Pressfittings aus Rotguss bzw. PPSU, in Vorwand, Schacht oder auf Rohdecke verlegen, "
                     "einschließlich Befestigungen und Formstücke anteilig. Dämmung gesondert. Abrechnung nach Länge.",
             "einheit": "m", "kg": "412", "gen": "A",
             "varianten": [{"d": "16", "h": 0.22, "mat": 8}, {"d": "20", "h": 0.24, "mat": 10.5}, {"d": "26", "h": 0.28, "mat": 15},
                           {"d": "32", "h": 0.32, "mat": 21}, {"d": "40", "h": 0.38, "mat": 33}, {"d": "50", "h": 0.45, "mat": 46},
                           {"d": "63", "h": 0.55, "mat": 68}]},
            {"kurz": "Trinkwasserleitung Edelstahl 1.4521, Pressverbindung, {d} mm",
             "lang": "Trinkwasserleitung aus Edelstahlrohr 1.4521 mit DVGW-Zulassung und Pressfittings, Außendurchmesser {d} mm, "
                     "mit schallgedämmten Rohrschellen verlegen, einschließlich Formstücke anteilig. Abrechnung nach Länge.",
             "einheit": "m", "kg": "412", "gen": "B",
             "varianten": [{"d": "15", "h": 0.28, "mat": 15}, {"d": "18", "h": 0.30, "mat": 18}, {"d": "22", "h": 0.32, "mat": 23},
                           {"d": "28", "h": 0.36, "mat": 30}, {"d": "35", "h": 0.42, "mat": 40}, {"d": "42", "h": 0.48, "mat": 52},
                           {"d": "54", "h": 0.56, "mat": 70}, {"d": "76,1", "h": 0.75, "mat": 120}]},
            {"kurz": "Gasleitung Stahl bzw. Edelstahl, Pressverbindung, DN {dn}",
             "lang": "Gasleitung nach DVGW-TRGI aus Stahl- bzw. Edelstahlrohr mit gasgeeigneten Pressfittings (gelbe "
                     "Kennzeichnung), DN {dn}, sichtbar verlegt, gelb gekennzeichnet, einschließlich Belastungs- und "
                     "Dichtheitsprüfung mit Protokoll anteilig. Abrechnung nach Länge.",
             "einheit": "m", "kg": "419", "gen": "B",
             "varianten": [{"dn": "20", "h": 0.40, "mat": 22}, {"dn": "25", "h": 0.45, "mat": 28}, {"dn": "32", "h": 0.50, "mat": 36}]},
            {"kurz": "Hausanschlussleitung Wasser PE 100, d {d} mm, in Graben",
             "lang": "Wasseranschlussleitung PE 100 SDR 11 mit Schutzrohr, d {d} mm, im bauseitigen Graben verlegen, "
                     "mit Trassenwarnband, Mauerdurchführung gesondert. Abrechnung nach Länge.",
             "einheit": "m", "kg": "412", "gen": "B",
             "varianten": [{"d": "32", "h": 0.25, "mat": 6}, {"d": "40", "h": 0.28, "mat": 8.5}, {"d": "63", "h": 0.35, "mat": 16}]},
            {"kurz": "Spülen und Druckprüfung Trinkwasseranlage",
             "lang": "Spülen der Trinkwasserinstallation nach DIN EN 806-4 und ZVSHK-Merkblatt mit Wasser-Luft-Gemisch "
                     "bzw. Wasser, Dichtheitsprüfung mit Druckluft oder Wasser, Prüf- und Spülprotokolle. Je Anlage.",
             "einheit": "psch", "kg": "412", "h": 5, "mat": 30, "geraet": 60, "gen": "A"},
            {"kurz": "Trinkwasser-Beprobung auf Legionellen, je Probe",
             "lang": "Probenahme nach Trinkwasserverordnung an vorbereiteter Entnahmestelle durch akkreditiertes Labor, "
                     "Untersuchung auf Legionellen, Befund übergeben.",
             "einheit": "St", "kg": "412", "h": 0.5, "mat": 0, "geraet": 85, "gen": "B"},
        ]},
        {"name": "Hausanschluss, Aufbereitung", "positionen": [
            {"kurz": "Hauswasserstation mit Rückspülfilter und Druckminderer, DN {dn}",
             "lang": "Hauswasserstation nach dem Wasserzähler mit Rückspülfilter (Maschenweite ≤ 100 µm), Druckminderer, "
                     "Manometer und Rückflussverhinderer, DN {dn}, einbauen.",
             "einheit": "St", "kg": "412", "gen": "A",
             "varianten": [{"dn": "25", "h": 2.0, "mat": 360}, {"dn": "32", "h": 2.5, "mat": 450}, {"dn": "50", "h": 3.5, "mat": 980}]},
            {"kurz": "Wasserzähleranlage mit Bügel und Absperrungen, Q3 {q} m³/h",
             "lang": "Wasserzählerbügel mit Absperrventilen vor und hinter dem Zähler montieren, Q3 {q} m³/h, "
                     "für Einbau des Versorgerzählers bzw. Unterzählers vorbereitet.",
             "einheit": "St", "kg": "412", "gen": "A",
             "varianten": [{"q": "4", "h": 1.2, "mat": 75}, {"q": "10", "h": 1.8, "mat": 150}]},
            {"kurz": "Wohnungswasserzähler Aufputz, Funkablesung",
             "lang": "Wohnungswasserzähler (Kalt- bzw. Warmwasser) Q3 2,5 m³/h mit Funkmodul in vorbereitete Anschlussarmatur einbauen.",
             "einheit": "St", "kg": "412", "h": 0.5, "mat": 75, "gen": "A"},
            {"kurz": "Enthärtungsanlage Ionentauscher, Einfamilienhaus",
             "lang": "Vollautomatische Enthärtungsanlage nach dem Ionenaustauschverfahren mit DVGW-Zeichen, "
                     "Verschneideeinrichtung, Desinfektion und Salzbehälter, für Ein- bis Zweifamilienhaus, "
                     "einschließlich Anschluss an Trinkwasser und Abwasser, Inbetriebnahme.",
             "einheit": "St", "kg": "412", "h": 4, "mat": 1650, "gen": "C"},
            {"kurz": "Druckerhöhungsanlage Trinkwasser, 2 Pumpen",
             "lang": "Trinkwasser-Druckerhöhungsanlage mit zwei drehzahlgeregelten Pumpen (1 Betrieb, 1 Reserve), "
                     "Vordruckbehälter bzw. Membrangefäß, Steuerung, nach DIN 1988-500, einschließlich Inbetriebnahme.",
             "einheit": "St", "kg": "412", "h": 12, "mat": 6200, "gen": "C"},
        ]},
        {"name": "Armaturen, Zirkulation", "positionen": [
            {"kurz": "Absperrventil Schrägsitz Trinkwasser DN {dn}",
             "lang": "Freistrom- bzw. Schrägsitzventil aus Rotguss mit DVGW-Zulassung, DN {dn}, mit Entleerung, in "
                     "Strang- oder Stockwerksleitung einbauen.",
             "einheit": "St", "kg": "412", "gen": "A",
             "varianten": [{"dn": "15", "h": 0.4, "mat": 32}, {"dn": "20", "h": 0.45, "mat": 40}, {"dn": "25", "h": 0.5, "mat": 52},
                           {"dn": "32", "h": 0.6, "mat": 78}, {"dn": "50", "h": 0.8, "mat": 160}]},
            {"kurz": "Unterputz-Absperrventil Stockwerk DN {dn}",
             "lang": "Unterputz-Absperrventil mit Verlängerung, Rosette und Kappe, DN {dn}, für Stockwerks- bzw. Wohnungsabsperrung.",
             "einheit": "St", "kg": "412", "gen": "A",
             "varianten": [{"dn": "20", "h": 0.6, "mat": 48}, {"dn": "25", "h": 0.7, "mat": 58}]},
            {"kurz": "Thermostatisches Zirkulationsregulierventil DN {dn}",
             "lang": "Thermostatisches Zirkulationsregulierventil aus Rotguss mit Temperaturanzeige und Absperrung, "
                     "DN {dn}, für den hydraulischen Abgleich der Zirkulation nach DVGW W 553, einbauen und einstellen.",
             "einheit": "St", "kg": "412", "gen": "A",
             "varianten": [{"dn": "15", "h": 0.6, "mat": 92}, {"dn": "20", "h": 0.7, "mat": 110}]},
            {"kurz": "Zirkulationspumpe Trinkwasser, Edelstahl, mit Zeitschaltuhr",
             "lang": "Zirkulationspumpe für Trinkwasser mit Edelstahl- bzw. Rotgussgehäuse, Hocheffizienzmotor, "
                     "integrierte Zeitschaltuhr, mit Absperrungen und Rückflussverhinderer einbauen.",
             "einheit": "St", "kg": "412", "h": 1.5, "mat": 340, "gen": "B"},
            {"kurz": "Thermostatischer Mischer Warmwasser (Verbrühschutz) DN {dn}",
             "lang": "Thermostatischen Trinkwassermischer mit einstellbarer Auslauftemperatur und Rückflussverhinderern, "
                     "DN {dn}, am Speicheraustritt einbauen.",
             "einheit": "St", "kg": "412", "gen": "A",
             "varianten": [{"dn": "20", "h": 1.0, "mat": 165}, {"dn": "25", "h": 1.2, "mat": 230}]},
            {"kurz": "Systemtrenner BA für Nachspeisung Heizung",
             "lang": "Systemtrenner Bauart BA nach DIN EN 12729 mit Absperrungen, Schmutzfänger und Ablauftrichter, "
                     "für die Nachspeisung der Heizungsanlage aus dem Trinkwassernetz, einbauen.",
             "einheit": "St", "kg": "412", "h": 1.2, "mat": 210, "gen": "A"},
            {"kurz": "Gas-Strömungswächter und thermische Absperreinrichtung",
             "lang": "Gasströmungswächter nach DVGW G 5305 und thermisch auslösende Absperreinrichtung vor dem Gasgerät einbauen.",
             "einheit": "St", "kg": "419", "h": 0.8, "mat": 95, "gen": "A"},
            {"kurz": "Trinkwasserleitung im Bestand stilllegen, Totleitung abtrennen",
             "lang": "Nicht mehr genutzte Trinkwasserleitung am Abzweig hygienegerecht abtrennen und verschließen "
                     "(keine Totleitung), einschließlich Entleerung des Abschnitts.",
             "einheit": "St", "kg": "412", "h": 1.5, "mat": 15, "gen": "B", "tags": ["altbau"]},
        ]},
    ],
}]

# ---------------------------------------------------------------- Ergänzungen (Runde 2)
LBS[0]["gruppen"][0]["positionen"] += [
    {"kurz": "Zulage Formstück Trinkwasser {d} mm",
     "lang": "Zulage für Formstücke (Bogen, T-Stück, Wandscheibe, Übergang) des gewählten Trinkwassersystems, Durchmesser {d} mm. Abrechnung je Stück.",
     "einheit": "St", "kg": "412", "gen": "A",
     "varianten": [{"d": "16–22", "h": 0.12, "mat": 8}, {"d": "26–35", "h": 0.16, "mat": 15}, {"d": "40–54", "h": 0.24, "mat": 32}, {"d": "63–76", "h": 0.35, "mat": 75}]},
    {"kurz": "Wandscheibe/Armaturenanschluss mit Montageeinheit",
     "lang": "Wandscheibe bzw. Doppelwandscheibe mit Montageplatte für Armaturenanschluss setzen und anschließen, Ausrichtung auf Fliesenebene.",
     "einheit": "St", "kg": "412", "h": 0.5, "mat": 24, "gen": "A"},
    {"kurz": "Ringleitungsinstallation Trinkwasser je Objektanschluss",
     "lang": "Stockwerksinstallation als Ring- bzw. Reiheninstallation mit Doppelwandscheiben zur Vermeidung von Stagnation, je angeschlossenem Objekt.",
     "einheit": "St", "kg": "412", "h": 1.2, "mat": 45, "gen": "B"},
    {"kurz": "Kernbohrung für Rohrdurchführung, Ø bis {d} mm",
     "lang": "Kernbohrung durch Wand bzw. Decke, Ø bis {d} mm, Dicke bis 30 cm, nass gebohrt, Bohrkern entsorgen. Statische Freigabe bauseits.",
     "einheit": "St", "kg": "412", "gen": "B", "lohn": "abbruch",
     "varianten": [{"d": "50", "h": 0.6, "mat": 0, "geraet": 25}, {"d": "100", "h": 0.8, "mat": 0, "geraet": 35}, {"d": "150", "h": 1.0, "mat": 0, "geraet": 48}]},
    {"kurz": "Trinkwasserleitungen demontieren und entsorgen, bis DN {dn}",
     "lang": "Vorhandene Trinkwasserleitungen (verzinkt, Kupfer, Kunststoff) mit Halterungen demontieren und entsorgen, bis DN {dn}. Abrechnung nach Länge.",
     "einheit": "m", "kg": "412", "gen": "B", "tags": ["altbau"], "lohn": "abbruch",
     "varianten": [{"dn": "32", "h": 0.16, "mat": 0, "geraet": 1.2}, {"dn": "80", "h": 0.3, "mat": 0, "geraet": 3}]},
    {"kurz": "Bleileitung ausbauen und fachgerecht entsorgen",
     "lang": "Vorhandene Trinkwasser-Bleileitung ausbauen, getrennt sammeln und nachweislich entsorgen. Abrechnung nach Länge.",
     "einheit": "m", "kg": "412", "h": 0.3, "mat": 0, "geraet": 6, "gen": "B", "tags": ["altbau"], "lohn": "abbruch"},
    {"kurz": "Provisorische Wasserversorgung während Umbau",
     "lang": "Provisorische Trinkwasserversorgung mit Schlauch- bzw. Rohrleitung und Zapfstellen während der Umbauphase herstellen, vorhalten und zurückbauen.",
     "einheit": "psch", "kg": "412", "h": 6, "mat": 160, "gen": "C", "tags": ["altbau"]},
    {"kurz": "Gefährdungsanalyse/Hygieneerstinspektion Trinkwasser",
     "lang": "Hygienische Erstinspektion bzw. Gefährdungsanalyse nach VDI 6023 mit Bericht.",
     "einheit": "psch", "kg": "412", "h": 8, "mat": 0, "geraet": 250, "gen": "C"},
]
LBS[0]["gruppen"][1]["positionen"] += [
    {"kurz": "Leckageschutz mit Absperrventil und Sensoren",
     "lang": "Leckageschutzsystem mit motorischem Absperrventil nach dem Wasserzähler, Durchflussüberwachung und zwei Bodensensoren, App-Anbindung.",
     "einheit": "St", "kg": "412", "h": 3, "mat": 680, "gen": "C"},
    {"kurz": "Gasdruckregelgerät mit Sicherheitsabsperrventil, bis {q} m³/h",
     "lang": "Gas-Hausdruckregelgerät mit SAV und SBV für Durchflüsse bis {q} m³/h nach Vorgaben des Netzbetreibers einbauen.",
     "einheit": "St", "kg": "419", "gen": "B", "varianten": [{"q": "6", "h": 2, "mat": 210}, {"q": "25", "h": 3, "mat": 540}]},
    {"kurz": "Gaszähler-Anschlussplatte/Einrohrzähler-Anschluss",
     "lang": "Gaszähleranschluss mit Zählerverschraubungen bzw. Einrohranschlussstück und Absperrarmatur, für Versorgerzähler vorbereitet.",
     "einheit": "St", "kg": "419", "h": 1.5, "mat": 120, "gen": "A"},
    {"kurz": "Gasleitung stilllegen und Gebrauchsfähigkeit prüfen",
     "lang": "Nicht mehr benötigte Gasleitung stilllegen und dicht verschließen bzw. Gebrauchsfähigkeitsprüfung der bestehenden Leitung nach TRGI mit Protokoll.",
     "einheit": "psch", "kg": "419", "h": 3, "mat": 25, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Rückflussverhinderer prüfbar DN {dn}",
     "lang": "Prüfbarer Rückflussverhinderer Typ EA nach DIN EN 13959, DN {dn}, einbauen.",
     "einheit": "St", "kg": "412", "gen": "A", "varianten": [{"dn": "20", "h": 0.4, "mat": 24}, {"dn": "32", "h": 0.5, "mat": 45}]},
    {"kurz": "Automatische Spülstation gegen Stagnation",
     "lang": "Hygienespülstation mit Magnetventil, Zeitsteuerung und freiem Auslauf zur automatischen Spülung selten genutzter Leitungsteile.",
     "einheit": "St", "kg": "412", "h": 3, "mat": 980, "gen": "C"},
    {"kurz": "Thermische Desinfektion Trinkwasseranlage, Durchführung",
     "lang": "Thermische Desinfektion der Trinkwasser-Erwärmungsanlage nach DVGW W 551 mit Temperaturprotokoll an allen Entnahmestellen.",
     "einheit": "psch", "kg": "412", "h": 6, "mat": 0, "gen": "C"},
    {"kurz": "Schlauchanschlussventil/Auslaufventil mit Rohrbelüfter DN 15",
     "lang": "Auslaufventil DN 15 mit Schlauchverschraubung, Rohrbelüfter und Rückflussverhinderer, z. B. Technikraum, einbauen.",
     "einheit": "St", "kg": "412", "h": 0.5, "mat": 38, "gen": "A"},
]
zuweisen(LBS, vorab() + [
    (ist("m", kurz=r"Gasleitung"), [VERLEGUNG_ROHR[:3], ORT, MENGE]),   # vor Edelstahl: Gas ohne GEG-Dämmung, nicht unter Putz
    (ist("m", kurz=r"Mehrschichtverbund|Edelstahl"), [VERLEGUNG_ROHR, DAEMMUNG_VORGEDAEMMT, ORT, MENGE]),
    (ist("m"), [ORT_KLEIN, MENGE]),
    (lambda g, p: bool(re.search(INLINE_RX, p.get("kurz", ""), re.I)), [ORT]),
    (ist("St", gruppe=r"Armaturen|Hausanschluss|Trinkwasser"), [ORT, BEFESTIGUNG]),
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
