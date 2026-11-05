# LB 049 Feuerlöschanlagen, Feuerlöschgeräte (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "049", "name": "Feuerlöschanlagen, Feuerlöschgeräte", "atv": "DIN 18381", "lohn": "brandschutz",
    "gruppen": [
        {"name": "Feuerlöscher", "positionen": [
            {"kurz": "Feuerlöscher {art}, mit Wandhalter und Schild",
             "lang": "Tragbarer Feuerlöscher nach DIN EN 3, {art}, mit Wandhalterung, Hinweisschild nach ASR A1.3 "
                     "(langnachleuchtend) und Prüfplakette, montieren.",
             "einheit": "St", "kg": "474", "gen": "A",
             "varianten": [{"art": "Schaum 6 l, 6 LE", "h": 0.5, "mat": 85}, {"art": "Schaum 9 l, 9 LE", "h": 0.5, "mat": 110},
                           {"art": "Pulver ABC 6 kg, 12 LE", "h": 0.5, "mat": 75}, {"art": "CO₂ 5 kg (Elektro/IT)", "h": 0.5, "mat": 150}]},
            {"kurz": "Fettbrandlöscher 6 l (Küche), Klasse F",
             "lang": "Feuerlöscher für Fettbrände Brandklasse F, 6 l, mit Halter und Schild, montieren.",
             "einheit": "St", "kg": "474", "h": 0.5, "mat": 140, "gen": "A"},
        ]},
        {"name": "Löschwasserleitungen, Wandhydranten", "positionen": [
            {"kurz": "Wandhydrant Typ F (DN 25 formstabil) im Schrank",
             "lang": "Wandhydrant nach DIN 14461-1 Typ F mit formstabilem Schlauch 30 m, Hohlstrahlrohr, Absperrventil, "
                     "in Stahlblechschrank Aufputz bzw. Unterputz, einschließlich Anschluss und Kennzeichnung.",
             "einheit": "St", "kg": "474", "h": 5, "mat": 1150, "gen": "B"},
            {"kurz": "Löschwasser-Steigleitung trocken, verzinkt, DN {dn}",
             "lang": "Trockene Steigleitung nach DIN 14462 aus verzinktem Stahlrohr DN {dn} mit Formstücken, "
                     "Befestigung und Kennzeichnung. Einspeise- und Entnahmearmaturen gesondert. Abrechnung nach Länge.",
             "einheit": "m", "kg": "474", "gen": "B",
             "varianten": [{"dn": "80", "h": 1.0, "mat": 55}, {"dn": "100", "h": 1.2, "mat": 70}]},
            {"kurz": "Einspeisearmatur für trockene Steigleitung, 2 × B",
             "lang": "Einspeiseeinrichtung mit zwei B-Festkupplungen, Rückflussverhinderer und Entleerung im "
                     "Einspeiseschrank, Beschilderung.",
             "einheit": "St", "kg": "474", "h": 5, "mat": 1350, "gen": "B"},
            {"kurz": "Entnahmearmatur Steigleitung trocken, je Geschoss",
             "lang": "Entnahmestelle mit Absperrventil und B-Festkupplung je Geschoss, in Schrank bzw. Nische, beschildert.",
             "einheit": "St", "kg": "474", "h": 2.5, "mat": 520, "gen": "B"},
            {"kurz": "Wartung Feuerlöscher (Prüfung nach DIN 14406-4)",
             "lang": "Prüfung und Instandhaltung tragbarer Feuerlöscher durch Sachkundigen, Prüfplakette erneuern.",
             "einheit": "St", "kg": "474", "h": 0.25, "mat": 6, "gen": "A"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Ergänzungen (Runde 2)
LBS[0]["gruppen"][0]["positionen"] += [
    {"kurz": "Feuerlöscherschrank/Standsäule für {n} Feuerlöscher",
     "lang": "Feuerlöscherschrank aus Stahlblech rot bzw. Standsäule mit Kennzeichnung für {n} Feuerlöscher, montieren.",
     "einheit": "St", "kg": "474", "gen": "B", "varianten": [{"n": "1", "h": 0.8, "mat": 140}, {"n": "2", "h": 1.0, "mat": 230}]},
    {"kurz": "Löschdecke im Wandbehälter",
     "lang": "Löschdecke nach DIN EN 1869 im Wandbehälter mit Schild, montieren.",
     "einheit": "St", "kg": "474", "h": 0.3, "mat": 38, "gen": "A"},
    {"kurz": "Flucht- und Rettungsplan DIN ISO 23601, je Plan gerahmt",
     "lang": "Flucht- und Rettungsplan nach DIN ISO 23601 erstellen, nachleuchtend gedruckt, gerahmt und montiert, je Standort.",
     "einheit": "St", "kg": "474", "h": 2.5, "mat": 85, "gen": "B"},
    {"kurz": "Brandschutzzeichen/Rettungszeichen langnachleuchtend",
     "lang": "Sicherheitszeichen nach DIN EN ISO 7010 (Brandschutz bzw. Rettungsweg), langnachleuchtend, Kunststoff bzw. Alu, montieren.",
     "einheit": "St", "kg": "474", "gen": "A", "varianten": [{"h": 0.15, "mat": 9, "g": "20 × 10 cm"}, {"h": 0.2, "mat": 22, "g": "40 × 20 cm"}], "kurz": "Brandschutz-/Rettungszeichen langnachleuchtend, {g}",
     "hinweis": "Format {g}"},
]
LBS[0]["gruppen"][1]["positionen"] += [
    {"kurz": "Löschwasserleitung nass verzinkt, mit Rohrhalterungen, DN {dn}",
     "lang": "Nasse Löschwasserleitung aus verzinktem Stahlrohr, DN {dn}, mit Formstücken, Halterungen und Kennzeichnung. Abrechnung nach Länge.",
     "einheit": "m", "kg": "474", "gen": "B", "varianten": [{"dn": "50", "h": 0.8, "mat": 38}, {"dn": "65", "h": 0.9, "mat": 46}, {"dn": "80", "h": 1.0, "mat": 55}]},
    {"kurz": "Wandhydrant Typ S (DN 25 halbstarr) für Selbsthilfe",
     "lang": "Wandhydrant Typ S für Selbsthilfe, Schlauch formstabil 30 m, Schrank mit Feuerlöscherfach, montieren und anschließen.",
     "einheit": "St", "kg": "474", "h": 5, "mat": 1350, "gen": "B"},
    {"kurz": "Sprinklerkopf liefern und montieren (Erweiterung bestehender Anlage)",
     "lang": "Sprinklerkopf für Erweiterung einer bestehenden VdS-Anlage mit Anschlussleitung bis 3 m, Auslösetemperatur nach Anforderung.",
     "einheit": "St", "kg": "474", "h": 1.5, "mat": 95, "gen": "C", "tags": ["altbau"]},
    {"kurz": "Druck- und Durchflussprüfung Wandhydrant mit Prüfbuch",
     "lang": "Prüfung der Wandhydranten nach DIN 14462 (Druck, Durchfluss, Sichtprüfung), Prüfbuch.",
     "einheit": "St", "kg": "474", "h": 0.8, "mat": 5, "gen": "A"},
]
zuweisen(LBS, vorab() + [
    (ist("m"), [VERLEGUNG_ROHR[1:3], ORT, MENGE]),
    (ist("St", kurz=r"Feuerlöscher |Fettbrand|Löschdecke|Schrank|Wandhydrant"), [BEFESTIGUNG, ORT_KLEIN]),
    (ist(), [ORT_KLEIN]),
])
