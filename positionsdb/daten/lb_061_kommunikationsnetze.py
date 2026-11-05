# LB 061 Kommunikationsnetze (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "061", "name": "Kommunikationsnetze", "atv": "DIN 18382", "lohn": "elektro",
    "gruppen": [
        {"name": "Datennetz", "positionen": [
            {"kurz": "Datenkabel Cat {c}, S/FTP, verlegt",
             "lang": "Installationskabel Kategorie {c} S/FTP, halogenfrei, 4 × 2 × AWG 23, auf Kabelrinne, im Leerrohr oder "
                     "unter Putz verlegen, beidseitig beschriften. Abrechnung nach Länge.",
             "einheit": "m", "kg": "457", "gen": "A",
             "varianten": [{"c": "7", "h": 0.07, "mat": 1.3}, {"c": "7A", "h": 0.08, "mat": 1.8}]},
            {"kurz": "Datendose Cat 6A, {n}-fach, Unterputz, aufgelegt",
             "lang": "Anschlussdose Kategorie 6A, geschirmt, {n}-fach RJ45, Unterputz mit Zentralplatte und Rahmen "
                     "(Schalterprogramm), Kabel auflegen und beschriften.",
             "einheit": "St", "kg": "457", "gen": "A",
             "varianten": [{"n": "1", "h": 0.6, "mat": 32}, {"n": "2", "h": 0.8, "mat": 45}]},
            {"kurz": "Patchfeld 19\" 24 Port Cat 6A, bestückt und aufgelegt",
             "lang": "Patchfeld 19\" 1 HE mit 24 Ports Kategorie 6A geschirmt, Module bestückt, Kabel aufgelegt und beschriftet.",
             "einheit": "St", "kg": "457", "h": 6, "mat": 320, "gen": "A"},
            {"kurz": "Netzwerkschrank 19\", {he} HE, {art}",
             "lang": "Netzwerkschrank 19\" {he} HE, {art}, mit Glastür, Seitenwänden, Kabeleinführung, Steckdosenleiste "
                     "und Erdung, montieren.",
             "einheit": "St", "kg": "457", "gen": "B",
             "varianten": [{"he": "12", "art": "Wandgehäuse", "h": 2.5, "mat": 360}, {"he": "42", "art": "Standschrank 800 × 800 mm", "h": 5, "mat": 1350}]},
            {"kurz": "Multimediaverteiler Einfamilienhaus mit Patchfeld 12 Port",
             "lang": "Medienverteiler Unterputz bzw. Feld im Zählerschrank mit Patchfeld 12 Port Cat 6A, Steckdose, "
                     "Platz für Router/Switch, Kabel aufgelegt.",
             "einheit": "St", "kg": "457", "h": 4, "mat": 280, "gen": "B"},
            {"kurz": "Messung Datennetz Permanent Link Klasse EA, je Port",
             "lang": "Abnahmemessung je Datenport als Permanent Link Klasse EA mit kalibriertem Messgerät, Messprotokoll.",
             "einheit": "St", "kg": "457", "h": 0.15, "mat": 0, "gen": "A"},
            {"kurz": "Lichtwellenleiter Gebäudeanschluss / Glasfaser-Hausverkabelung je Wohneinheit",
             "lang": "Glasfaser-Hausverkabelung vom Hausübergabepunkt bis Glasfaser-Teilnehmeranschlussdose je Wohneinheit, "
                     "Singlemode-Kabel bis 30 m, gespleißt, mit Messprotokoll.",
             "einheit": "St", "kg": "451", "h": 3, "mat": 110, "gen": "B"},
            {"kurz": "WLAN-Access-Point PoE, Decke",
             "lang": "WLAN-Access-Point Wi-Fi 6/6E mit PoE-Versorgung an Decke montieren, anschließen und einrichten.",
             "einheit": "St", "kg": "457", "h": 1.0, "mat": 210, "gen": "C"},
        ]},
        {"name": "Antennen, Telefon", "positionen": [
            {"kurz": "SAT-Anlage {art}",
             "lang": "Satellitenempfangsanlage {art}: Parabolspiegel 80 cm mit Mast bzw. Wandhalter, LNB, "
                     "Erdung/Potentialausgleich, Ausrichtung und Pegelmessung.",
             "einheit": "St", "kg": "455", "gen": "B",
             "varianten": [{"art": "mit Quattro-LNB und Multischalter 4 Teilnehmer", "h": 8, "mat": 520},
                           {"art": "Einkabel-System (dCSS) bis 16 Teilnehmer", "h": 12, "mat": 980}]},
            {"kurz": "Antennenleitung Koax 120 dB mit Antennendose",
             "lang": "Koaxialkabel Klasse A+ (≥ 120 dB) bis 20 m sternförmig verlegen, Antennendose (TV/Radio/SAT) "
                     "Unterputz mit Rahmen, angeschlossen.",
             "einheit": "St", "kg": "455", "h": 1.5, "mat": 48, "gen": "A"},
            {"kurz": "Telefon-/TAE-Anschluss mit Leitung J-Y(St)Y",
             "lang": "TAE-Anschlussdose Unterputz mit Leitung J-Y(St)Y 2 × 2 × 0,6 bis 20 m vom APL, angeschlossen.",
             "einheit": "St", "kg": "451", "h": 1.2, "mat": 28, "gen": "A"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Runde 2
LBS[0]["gruppen"] += [
    {"name": "Lichtwellenleiter, aktive Komponenten", "positionen": [
        {"kurz": "LWL-Kabel Singlemode OS2, {f} Fasern, Innen/Außen",
         "lang": "Lichtwellenleiterkabel Singlemode OS2, {f} Fasern, Universalkabel für innen und außen, halogenfrei, "
                 "nagetiergeschützt, einziehen bzw. auf Rinne verlegen.",
         "einheit": "m", "kg": "457", "gen": "B",
         "varianten": [{"f": "12", "h": 0.08, "mat": 2.6}, {"f": "24", "h": 0.09, "mat": 3.8}, {"f": "48", "h": 0.1, "mat": 6.2}]},
        {"kurz": "LWL-Spleißbox/Patchpanel 19\" mit {n} Pigtails, gespleißt",
         "lang": "LWL-Spleißbox bzw. Patchpanel 19\" 1 HE mit LC-Duplex-Kupplungen, {n} Pigtails, Spleißkassetten, Fasern "
                 "fusionsgespleißt und abgelegt, beschriftet.",
         "einheit": "St", "kg": "457", "gen": "B",
         "varianten": [{"n": "12", "h": 3.5, "mat": 240}, {"n": "24", "h": 6, "mat": 380}]},
        {"kurz": "LWL-Messung OTDR und Dämpfung, je Faser",
         "lang": "Messung je LWL-Faser mit OTDR in beide Richtungen und Einfügedämpfung, Protokoll mit Kurven.",
         "einheit": "St", "kg": "457", "h": 0.25, "mat": 0, "geraet": 4, "gen": "A"},
        {"kurz": "Netzwerk-Switch managed, {p} Port, {art}",
         "lang": "Managed Switch 19\" mit {p} Ports Gigabit und 4 SFP+-Uplinks, {art}, liefern, in Netzwerkschrank einbauen, "
                 "Grundkonfiguration (VLAN nach Vorgabe) und Dokumentation.",
         "einheit": "St", "kg": "457", "gen": "C",
         "varianten": [{"p": "24", "art": "ohne PoE", "h": 2.5, "mat": 520}, {"p": "24", "art": "PoE+ 370 W", "h": 2.5, "mat": 980},
                       {"p": "48", "art": "ohne PoE", "h": 3, "mat": 900}, {"p": "48", "art": "PoE+ 740 W", "h": 3, "mat": 1750}]},
        {"kurz": "USV 19\" für Netzwerkschrank, {va} VA, Online",
         "lang": "Unterbrechungsfreie Stromversorgung 19\" Online-Doppelwandler, {va} VA, mit Netzwerkkarte und Batterieeinschub, "
                 "einbauen, anschließen und Abschaltszenario konfigurieren.",
         "einheit": "St", "kg": "457", "gen": "C",
         "varianten": [{"va": "1.500", "h": 2, "mat": 980}, {"va": "3.000", "h": 2.5, "mat": 1750}]},
        {"kurz": "Patchkabel Cat 6A S/FTP, Länge {l} m",
         "lang": "Patchkabel Cat 6A S/FTP, halogenfrei, Länge {l} m, liefern und im Schrank bzw. am Arbeitsplatz rangieren.",
         "einheit": "St", "kg": "457", "gen": "A",
         "varianten": [{"l": "0,5", "h": 0.05, "mat": 4.5}, {"l": "2", "h": 0.05, "mat": 7}, {"l": "5", "h": 0.05, "mat": 11}]},
        {"kurz": "Kabelmanagement-Panel / Rangierbügel 19\" 1 HE",
         "lang": "Kabelführungspanel 19\" 1 HE mit Rangierbügeln und Abdeckung, einbauen.",
         "einheit": "St", "kg": "457", "h": 0.3, "mat": 28, "gen": "A"},
        {"kurz": "Erdung und Potentialausgleich Netzwerkschrank",
         "lang": "Netzwerkschrank an Potentialausgleich anschließen: Erdungsschiene, Verbindungen der Schrankteile, Leitung "
                 "bis 15 m zur Potentialausgleichsschiene.",
         "einheit": "St", "kg": "457", "h": 1.5, "mat": 45, "gen": "A"},
        {"kurz": "Dokumentation Datennetz mit Belegungsplan, je Verteiler",
         "lang": "Dokumentation des passiven Netzes: Portbelegungsplan, Grundrisse mit Dosennummern, Messprotokolle, Übergabe digital.",
         "einheit": "St", "kg": "457", "h": 3, "mat": 0, "gen": "B"},
        {"kurz": "Glasfaser-Abschlusspunkt (APL/Gf-TA) mit Leitung, je Wohnung",
         "lang": "Glasfaser-Teilnehmeranschlussdose (Gf-TA) in der Wohnung setzen, LWL-Verbindung vom Gebäudeverteiler bis 30 m "
                 "einziehen, spleißen und messen.",
         "einheit": "St", "kg": "457", "h": 2.5, "mat": 65, "gen": "B"},
        {"kurz": "Datenleitungen Bestand demontieren, je Arbeitsplatz",
         "lang": "Vorhandene Datenverkabelung je Arbeitsplatz (Dose, Leitung bis Verteiler) außer Betrieb nehmen, demontieren und entsorgen.",
         "einheit": "St", "kg": "394", "h": 0.6, "mat": 0, "geraet": 2, "gen": "B", "tags": ["altbau"]},
    ]},
]
_K = lambda *worte: (lambda g, p: any(w in p["kurz"] for w in worte))
BRANDKLASSE = [{"k": "Dca", "t": "Brandverhalten Dca-s2,d2,a1."}, {"k": "B2ca", "t": "Brandverhalten B2ca-s1a,d1,a1 (für Rettungswege).", "fm": 1.35}]
zuweisen(LBS, [
    (_K("Datenkabel"), [BRANDKLASSE, VERLEGUNG_KABEL, ORT, MENGE]),
    (_K("LWL-Kabel"), [VERLEGUNG_KABEL[:3], ORT_KLEIN, MENGE]),
    (_K("Datendose", "Antennenleitung", "Telefon-", "Glasfaser-Abschlusspunkt"), [VERLEGUNG_GERAET, ORT]),
    (_K("Patchfeld", "Netzwerkschrank", "Multimediaverteiler", "Spleißbox", "Switch", "USV"), [ORT_KLEIN]),
    (_K("WLAN", "SAT-Anlage"), [ORT, [{}, {"k": "inkl. Einrichtung", "t": "Einschließlich Einrichtung und Konfiguration nach Vorgabe des Auftraggebers.", "h": 0.8}]]),
])
