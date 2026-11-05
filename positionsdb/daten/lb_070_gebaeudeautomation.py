# LB 070 Gebäudeautomation (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "070", "name": "Gebäudeautomation", "atv": "DIN 18386", "lohn": "msr",
    "gruppen": [
        {"name": "Feldgeräte, KNX", "positionen": [
            {"kurz": "KNX-Spannungsversorgung 640 mA mit Drossel",
             "lang": "KNX-Spannungsversorgung 640 mA mit integrierter Drossel, REG, montieren und anschließen.",
             "einheit": "St", "kg": "481", "h": 0.8, "mat": 230, "gen": "A"},
            {"kurz": "KNX-Schaltaktor {n}-fach 16 A, REG",
             "lang": "KNX-Schaltaktor {n}-fach 16 A C-Last, Reiheneinbau, mit Handbedienung, montieren, anschließen, parametrieren.",
             "einheit": "St", "kg": "481", "gen": "B",
             "varianten": [{"n": "4", "h": 1.5, "mat": 210}, {"n": "8", "h": 2.2, "mat": 340}, {"n": "12", "h": 3.0, "mat": 460}]},
            {"kurz": "KNX-Jalousieaktor {n}-fach 230 V, REG",
             "lang": "KNX-Jalousie-/Rollladenaktor {n}-fach 230 V AC mit Fahrzeitermittlung, montieren, anschließen, parametrieren.",
             "einheit": "St", "kg": "481", "gen": "B",
             "varianten": [{"n": "4", "h": 1.8, "mat": 290}, {"n": "8", "h": 2.6, "mat": 470}]},
            {"kurz": "KNX-Dimmaktor LED {n}-fach, REG",
             "lang": "KNX-Universal-Dimmaktor {n}-fach für LED-Lasten, montieren, anschließen, parametrieren.",
             "einheit": "St", "kg": "481", "gen": "B",
             "varianten": [{"n": "2", "h": 1.5, "mat": 310}, {"n": "4", "h": 2.0, "mat": 520}]},
            {"kurz": "KNX-Heizungsaktor 6-fach für Stellantriebe",
             "lang": "KNX-Heizungsaktor 6-fach für thermische Stellantriebe 230 V mit integriertem Regler, montieren und parametrieren.",
             "einheit": "St", "kg": "481", "h": 2.0, "mat": 320, "gen": "B"},
            {"kurz": "KNX-Tastsensor {n}-fach mit Raumtemperaturregler und Display",
             "lang": "KNX-Tastsensor {n}-fach mit integriertem Raumtemperaturregler, Display und Busankoppler, Schalterprogramm, "
                     "montieren, beschriften und parametrieren.",
             "einheit": "St", "kg": "481", "gen": "B",
             "varianten": [{"n": "4", "h": 1.2, "mat": 260}, {"n": "8", "h": 1.4, "mat": 340}]},
            {"kurz": "KNX-Präsenzmelder Decke mit Konstantlichtregelung",
             "lang": "KNX-Präsenzmelder für Deckenmontage mit Konstantlichtregelung und HLK-Kanal, montieren und parametrieren.",
             "einheit": "St", "kg": "481", "h": 1.2, "mat": 260, "gen": "B"},
            {"kurz": "KNX-Wetterstation (Wind, Regen, Helligkeit, Temperatur)",
             "lang": "KNX-Wetterstation mit GPS, Wind-, Regen-, Helligkeits- und Temperatursensor für Sonnenschutzsteuerung, "
                     "montieren und parametrieren.",
             "einheit": "St", "kg": "481", "h": 3, "mat": 520, "gen": "B"},
            {"kurz": "KNX-Busleitung J-Y(St)Y 2 × 2 × 0,8 grün",
             "lang": "KNX-Busleitung J-Y(St)Y 2 × 2 × 0,8 mm, grün, verlegen und anschließen. Abrechnung nach Länge.",
             "einheit": "m", "kg": "481", "h": 0.06, "mat": 0.7, "gen": "A", "lohn": "elektro"},
        ]},
        {"name": "Automationsebene, Software", "positionen": [
            {"kurz": "Visualisierung / Smart-Home-Server mit App",
             "lang": "Visualisierungsserver bzw. IP-Gateway mit App-Zugriff, Fernzugang verschlüsselt, Programmierung "
                     "der Bedienoberfläche je Raum und Einweisung.",
             "einheit": "psch", "kg": "481", "h": 16, "mat": 980, "gen": "C"},
            {"kurz": "Automationsstation DDC für Heizung/Lüftung, {n} Datenpunkte",
             "lang": "Frei programmierbare Automationsstation (DDC) mit BACnet/IP-Schnittstelle im Schaltschrank, "
                     "für ca. {n} physikalische Datenpunkte, Programmierung der Regelstrategien, Inbetriebnahme.",
             "einheit": "St", "kg": "481", "gen": "C",
             "varianten": [{"n": "40", "h": 40, "mat": 4800}, {"n": "120", "h": 90, "mat": 11500}]},
            {"kurz": "Datenpunkt Programmierung und Inbetriebnahme, je Datenpunkt",
             "lang": "Software-Engineering je physikalischem Datenpunkt: Programmierung, Einbindung in Bedien- und "
                     "Beobachtungsebene, Punkt-zu-Punkt-Test, Dokumentation.",
             "einheit": "St", "kg": "481", "h": 0.8, "mat": 0, "gen": "B"},
            {"kurz": "Raumtemperaturfühler/Fühler passiv bzw. aktiv",
             "lang": "Temperatur- bzw. CO₂-/Feuchtefühler für Raum, Kanal oder Anlegemontage liefern, montieren und anschließen.",
             "einheit": "St", "kg": "481", "h": 0.8, "mat": 120, "gen": "B"},
            {"kurz": "Einzelraumregelung Funk für Heizkörper (Bestand), je Raum",
             "lang": "Nachrüst-Einzelraumregelung mit funkgesteuerten Heizkörperthermostaten, Raumfühler und Basisstation-"
                     "Anteil, Einrichtung des Zeitprogramms je Raum.",
             "einheit": "St", "kg": "481", "h": 0.8, "mat": 95, "gen": "B", "tags": ["altbau"], "lohn": "heizung"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Runde 2
LBS[0]["gruppen"] += [
    {"name": "Sensorik, Zähler, Gateways", "positionen": [
        {"kurz": "Raumsensor {art}, Bus-Anschluss",
         "lang": "Raumsensor {art} für Wandmontage, KNX bzw. Modbus/BACnet-fähig, montieren, anschließen und parametrieren.",
         "einheit": "St", "kg": "481", "gen": "B",
         "varianten": [{"art": "CO₂/Temperatur/Feuchte", "h": 1.0, "mat": 240}, {"art": "Temperatur/Feuchte", "h": 0.8, "mat": 140},
                       {"art": "Präsenz/Helligkeit Decke", "h": 1.0, "mat": 165}]},
        {"kurz": "Fensterkontakt/Binäreingang, verdrahtet bzw. Funk",
         "lang": "Fensterkontakt zur Zustandsmeldung (Heizungs- bzw. Lüftungsabschaltung), mit Binäreingang bzw. Funkempfänger, "
                 "montieren und parametrieren.",
         "einheit": "St", "kg": "481", "h": 0.7, "mat": 48, "gen": "A"},
        {"kurz": "Energiezähler {art} mit M-Bus/Modbus, eingebunden",
         "lang": "Energiezähler {art} mit Bus-Schnittstelle, eichrechtskonform, einbauen bzw. Einbau koordinieren, an Datenerfassung "
                 "anbinden und Datenpunkte anlegen.",
         "einheit": "St", "kg": "481", "gen": "B",
         "varianten": [{"art": "Strom 3-phasig, Hutschiene", "h": 1.2, "mat": 170}, {"art": "Wärme/Kälte bis qp 2,5", "h": 1.5, "mat": 290},
                       {"art": "Wasser mit Funk-/M-Bus-Modul", "h": 0.8, "mat": 95}]},
        {"kurz": "Gateway {art}",
         "lang": "Gateway {art} für die Kopplung von Gewerken, REG bzw. Schaltschrankmontage, Parametrierung und Datenpunktliste.",
         "einheit": "St", "kg": "481", "gen": "C",
         "varianten": [{"art": "KNX-IP-Router", "h": 1.5, "mat": 380}, {"art": "DALI-KNX 64 Teilnehmer", "h": 2, "mat": 520},
                       {"art": "Modbus/BACnet zur GLT", "h": 3, "mat": 980}]},
        {"kurz": "MSR-Schaltschrank für Heizung/Lüftung, {f} Felder",
         "lang": "Informationsschwerpunkt/MSR-Schaltschrank mit Leistungs- und Steuerteil, Automationsstation-Aufnahme, "
                 "Reparaturschaltern, Klemmen, {f} Felder, verdrahtet nach Stromlaufplan, aufstellen und anschließen.",
         "einheit": "St", "kg": "481", "gen": "C",
         "varianten": [{"f": "1", "h": 16, "mat": 3800}, {"f": "2", "h": 26, "mat": 6400}]},
        {"kurz": "Feldverkabelung MSR je Datenpunkt bis 20 m",
         "lang": "Feldverkabelung vom Schaltschrank zum Feldgerät (Fühler, Stellantrieb, Meldekontakt) bis 20 m, auflegen und prüfen.",
         "einheit": "St", "kg": "481", "h": 0.8, "mat": 18, "gen": "B"},
        {"kurz": "GA-Funktionsliste und Automationsschema nach VDI 3814, je Anlage",
         "lang": "Erstellen der GA-Funktionsliste und Automationsschemata nach VDI 3814 bzw. DIN EN ISO 16484-3 für eine Anlage "
                 "(z. B. Lüftungsgerät oder Heizkreisverteilung), Abstimmung mit Planer.",
         "einheit": "St", "kg": "481", "h": 10, "mat": 0, "gen": "B"},
        {"kurz": "Einregulierung und Funktionstest Gebäudeautomation, je Raum",
         "lang": "Funktionstest der Raumautomation (Licht, Sonnenschutz, Heizung/Lüftung) mit Protokoll, Übergabe an Betreiber.",
         "einheit": "St", "kg": "481", "h": 0.8, "mat": 0, "gen": "A"},
        {"kurz": "Einweisung Betreiber Gebäudeautomation, je Stunde",
         "lang": "Einweisung des Betreiberpersonals bzw. der Nutzer in Bedienung und Visualisierung, je Stunde.",
         "einheit": "h", "kg": "481", "h": 1, "mat": 0, "gen": "A"},
    ]},
]
_K = lambda *worte: (lambda g, p: any(w in p["kurz"] for w in worte))
DESIGN = [{"k": "", "t": "Oberfläche Kunststoff weiß."}, {"k": "Glas/Metall", "t": "Designausführung Glas bzw. Metall nach Bemusterung.", "fm": 1.5}]
zuweisen(LBS, [
    (_K("Tastsensor", "Raumsensor", "Präsenzmelder"), [DESIGN, VERLEGUNG_GERAET[:3], ORT_KLEIN]),
    (_K("Aktor", "Spannungsversorgung", "Gateway", "Heizungsaktor"), [[{}, {"k": "Nachrüstung Bestand", "t": "Nachrüstung in vorhandener Verteilung inkl. Umverdrahtung.", "fh": 1.5, "tags": ["altbau"]}]]),
    (_K("Fensterkontakt", "Raumtemperaturfühler", "Energiezähler", "Feldverkabelung"), [ORT]),
    (_K("Busleitung"), [VERLEGUNG_KABEL, ORT_KLEIN]),
    (_K("Automationsstation", "MSR-Schaltschrank", "Visualisierung"), [ORT_KLEIN]),
])
