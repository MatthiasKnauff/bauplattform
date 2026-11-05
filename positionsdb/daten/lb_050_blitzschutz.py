# LB 050 Blitzschutz- und Erdungsanlagen, Überspannungsschutz (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "050", "name": "Blitzschutz- und Erdungsanlagen, Überspannungsschutz", "atv": "DIN 18384", "lohn": "elektro",
    "gruppen": [
        {"name": "Erdung", "positionen": [
            {"kurz": "Fundamenterder Bandstahl verzinkt 30 × 3,5 mm",
             "lang": "Fundamenterder nach DIN 18014 aus Bandstahl feuerverzinkt 30 × 3,5 mm hochkant im Fundament "
                     "bzw. auf Abstandhaltern verlegen, im Abstand von ca. 2 m mit der Bewehrung verbinden, "
                     "Verbindungsklemmen anteilig. Abrechnung nach Länge.",
             "einheit": "m", "kg": "446", "h": 0.10, "mat": 4.2, "gen": "A"},
            {"kurz": "Ringerder Edelstahl V4A Rd 10 mm im Erdreich",
             "lang": "Ringerder aus nichtrostendem Stahl V4A Rd 10 mm außerhalb der Perimeterdämmung bzw. Abdichtung "
                     "im bauseitigen Graben verlegen, Kreuzverbinder anteilig. Abrechnung nach Länge.",
             "einheit": "m", "kg": "446", "h": 0.12, "mat": 7.5, "gen": "A"},
            {"kurz": "Erdungsfestpunkt / Anschlussfahne V4A",
             "lang": "Erdungsfestpunkt bzw. Anschlussfahne aus V4A, korrosionsgeschützt aus Beton bzw. Erdreich "
                     "herausgeführt, mit Verbindungsklemme.",
             "einheit": "St", "kg": "446", "h": 0.5, "mat": 32, "gen": "A"},
            {"kurz": "Tiefenerder Staberder V4A, Einschlagtiefe je m",
             "lang": "Tiefenerder aus V4A-Staberder-Segmenten Ø 20 mm einschlagen, mit Kupplungen und Anschlussschelle. "
                     "Abrechnung nach Einschlagtiefe.",
             "einheit": "m", "kg": "446", "h": 0.25, "mat": 28, "gen": "B"},
            {"kurz": "Haupterdungsschiene mit Potentialausgleich",
             "lang": "Haupterdungsschiene im Hausanschlussraum montieren und Schutzpotentialausgleich nach DIN VDE 0100-410/540 "
                     "herstellen: Anschluss von Fundamenterder, Wasser-, Gas-, Heizungsleitungen und Gebäudekonstruktion "
                     "mit Leitungen bis 16 mm² einschließlich Rohrerdungsschellen.",
             "einheit": "psch", "kg": "446", "h": 4, "mat": 120, "gen": "A"},
            {"kurz": "Erdungsmessung mit Protokoll",
             "lang": "Messung des Erdungswiderstands und Durchgangsprüfung der Erdungsanlage, Prüfprotokoll.",
             "einheit": "psch", "kg": "446", "h": 2, "mat": 0, "gen": "A"},
        ]},
        {"name": "Äußerer Blitzschutz", "positionen": [
            {"kurz": "Fangleitung auf {art}",
             "lang": "Fangleitung auf {art} mit Leitungshaltern im Abstand ≤ 1 m verlegen, "
                     "Verbinder und Dehnungsstücke anteilig. Abrechnung nach Länge.",
             "einheit": "m", "kg": "446", "gen": "A",
             "varianten": [{"art": "Flachdach (Betonsockel)", "h": 0.22, "mat": 9}, {"art": "Steildach (Firstleitungshalter)", "h": 0.30, "mat": 8}]},
            {"kurz": "Ableitung an Fassade bzw. unter Putz/Dämmung",
             "lang": "Ableitung an der Fassade bzw. in Dämmung oder Putz verlegen, mit Haltern, "
                     "einschließlich Anschluss an die Fangeinrichtung. Abrechnung nach Länge.",
             "einheit": "m", "kg": "446", "h": 0.25, "mat": 7, "gen": "A"},
            {"kurz": "Trennstelle mit Bezeichnungsschild, Unterflurkasten",
             "lang": "Trennstelle zwischen Ableitung und Erder mit Messklemme in Unterflur-Revisionskasten bzw. Wandkasten, "
                     "mit Nummernschild.",
             "einheit": "St", "kg": "446", "h": 0.8, "mat": 55, "gen": "A"},
            {"kurz": "Fangstange Alu {l} m mit Betonsockel",
             "lang": "Fangstange aus Aluminium Länge {l} m mit Betonsockel und Anschlussklemme zum Schutz von "
                     "Dachaufbauten (PV, Lüftung) nach Trennungsabstandsberechnung.",
             "einheit": "St", "kg": "446", "gen": "B",
             "varianten": [{"l": "1,5", "h": 0.8, "mat": 95}, {"l": "3,0", "h": 1.2, "mat": 210}]},
            {"kurz": "Blitzschutzanlage Einfamilienhaus komplett, LPS III",
             "lang": "Äußere Blitzschutzanlage Schutzklasse III für ein Einfamilienhaus mit Satteldach bis 180 m² "
                     "Grundfläche: Fangeinrichtung, 4 Ableitungen, Trennstellen, Anschluss an Ringerder bzw. Fundamenterder "
                     "und Prüfung mit Dokumentation.",
             "einheit": "psch", "kg": "446", "h": 26, "mat": 1050, "gen": "C"},
            {"kurz": "Blitzschutz-Prüfung nach DIN EN 62305-3 mit Prüfbericht",
             "lang": "Prüfung der Blitzschutzanlage (Sicht- und Messprüfung) durch Blitzschutzfachkraft, Prüfbericht.",
             "einheit": "psch", "kg": "446", "h": 4, "mat": 0, "gen": "B"},
        ]},
        {"name": "Überspannungsschutz", "positionen": [
            {"kurz": "Kombiableiter Typ 1+2 im Zählerschrank, 3-polig + N",
             "lang": "Blitzstrom- und Überspannungsableiter Typ 1+2 (Kombiableiter) für TN-/TT-System, 4-polig, "
                     "im Vorzählerbereich bzw. Zählerschrank auf Hutschiene montieren und anschließen.",
             "einheit": "St", "kg": "446", "h": 1.0, "mat": 420, "gen": "A"},
            {"kurz": "Überspannungsableiter Typ 2 in Unterverteilung",
             "lang": "Überspannungsableiter Typ 2, 3+1-polig mit Fernmeldekontakt, in Unterverteilung montieren und anschließen.",
             "einheit": "St", "kg": "446", "h": 0.8, "mat": 185, "gen": "A"},
            {"kurz": "Feinschutz Typ 3 / Datenleitungsschutz",
             "lang": "Überspannungsschutz Typ 3 als Zwischenstecker bzw. Einbaumodul oder Schutzgerät für Daten-/"
                     "Antennenleitungen montieren.",
             "einheit": "St", "kg": "446", "h": 0.5, "mat": 75, "gen": "A"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Ergänzungen (Runde 2)
LEITER = [{"k": "Alu Rd 8", "t": "Leitermaterial Aluminium Rd 8 mm."},
          {"k": "Edelstahl V4A Rd 10", "t": "Leitermaterial Edelstahl V4A Rd 10 mm.", "fm": 1.6},
          {"k": "Kupfer Rd 8", "t": "Leitermaterial Kupfer Rd 8 mm (z. B. auf Kupferdach).", "fm": 2.3}]
DACH = [{"k": "", "t": ""}, {"k": "Steildach > 45°", "t": "Dachneigung über 45° bzw. Arbeiten mit Seilsicherung.", "fh": 1.3},
        {"k": "Gründach/Kiesdach", "t": "Auf Gründach bzw. Kiesdach mit Betonsockeln auf Schutzplatten.", "fh": 1.15, "mat": 3}]
LBS[0]["gruppen"][1]["positionen"] += [
    {"kurz": "Anschluss metallischer Dachaufbauten an Fangeinrichtung",
     "lang": "Metallische Dachaufbauten (Geländer, Lüfter, Rinnen) mit Klemmen und Leitung bis 2 m an die Fangeinrichtung anschließen.",
     "einheit": "St", "kg": "446", "h": 0.6, "mat": 22, "gen": "A"},
    {"kurz": "Isolierte Fangeinrichtung (HVI-Leitung) mit Stützrohr",
     "lang": "Hochspannungsfeste, isolierte Ableitung (HVI) mit Stützrohr und Fangstange zur Einhaltung des Trennungsabstands, montieren. Abrechnung je Fangmast.",
     "einheit": "St", "kg": "446", "h": 4, "mat": 1150, "gen": "C"},
    {"kurz": "Dehnungsstück/Überbrückungsband Fangleitung",
     "lang": "Dehnungsstück bzw. Überbrückungsband aus Aluminium in die Fangleitung einbauen.",
     "einheit": "St", "kg": "446", "h": 0.3, "mat": 14, "gen": "A"},
    {"kurz": "Blitzschutzanlage Bestand instand setzen, je Ableitung",
     "lang": "Vorhandene Blitzschutzanlage: lockere Halter und Klemmen erneuern, korrodierte Teile austauschen, je Ableitung mit anteiliger Fangeinrichtung.",
     "einheit": "St", "kg": "446", "h": 3, "mat": 85, "gen": "C", "tags": ["altbau"]},
    {"kurz": "Blitzschutzanlage demontieren und entsorgen",
     "lang": "Vorhandene Blitzschutzanlage (Fangeinrichtung, Ableitungen) für Dach- oder Fassadenarbeiten demontieren und entsorgen. Abrechnung nach Länge.",
     "einheit": "m", "kg": "446", "h": 0.12, "mat": 0, "geraet": 0.8, "gen": "B", "tags": ["altbau"]},
]
LBS[0]["gruppen"][2]["positionen"] += [
    {"kurz": "Überspannungsschutz PV-Anlage DC-seitig, Typ 2",
     "lang": "DC-Überspannungsschutz Typ 2 für PV-Generatorleitungen im Generatoranschlusskasten, montieren.",
     "einheit": "St", "kg": "446", "h": 1.0, "mat": 240, "gen": "B"},
    {"kurz": "Blitzschutz-Potentialausgleich für einführende Leitungen",
     "lang": "Blitzschutz-Potentialausgleich am Gebäudeeintritt für Wasser-, Gas-, Heizungs- und Telekommunikationsleitungen mit Ableitern bzw. Erdungsschellen.",
     "einheit": "psch", "kg": "446", "h": 3, "mat": 260, "gen": "B"},
]
zuweisen(LBS, vorab() + [
    (ist("m", kurz=r"Fangleitung"), [LEITER, DACH, ORT_KLEIN]),
    (ist("m", kurz=r"Ableitung"), [LEITER, ORT]),
    (ist("St", kurz=r"Fangstange|Anschluss metall|Dehnung"), [DACH, ORT_KLEIN]),
    (ist("m"), [ORT_KLEIN, MENGE]),
    (ist(), [ORT_KLEIN]),
])

# ---------------------------------------------------------------- Runde 2
LBS[0]["gruppen"] += [
    {"name": "Potentialausgleich, Ergänzungen", "positionen": [
        {"kurz": "Schutzpotentialausgleich Leitung H07V-K {q} mm² gn/ge",
         "lang": "Potentialausgleichsleitung H07V-K {q} mm² grün-gelb von der Haupterdungsschiene zu leitfähigen Teilen "
                 "(Rohrleitungen, Stahlbau, Kabelrinnen), mit Rohrschellen bzw. Klemmen, verlegt und angeschlossen.",
         "einheit": "m", "kg": "446", "gen": "A",
         "varianten": [{"q": "6", "h": 0.12, "mat": 1.6}, {"q": "16", "h": 0.14, "mat": 3.4}, {"q": "25", "h": 0.16, "mat": 5.2}]},
        {"kurz": "Erdungsbandschelle / Anschlussklemme Rohr bis Ø {d} mm",
         "lang": "Erdungsbandschelle bzw. Rohrerdungsschelle für Rohrleitungen bis Ø {d} mm, Edelstahl, montieren und anschließen.",
         "einheit": "St", "kg": "446", "gen": "A",
         "varianten": [{"d": "54", "h": 0.25, "mat": 6}, {"d": "160", "h": 0.3, "mat": 14}]},
        {"kurz": "Örtlicher zusätzlicher Potentialausgleich Bad/Dusche",
         "lang": "Zusätzlichen örtlichen Schutzpotentialausgleich im Bad herstellen (Wannen-, Rohr- und Rinnenanschlüsse), "
                 "Leitungen und Klemmen, Messung.",
         "einheit": "St", "kg": "446", "h": 1.5, "mat": 25, "gen": "A"},
        {"kurz": "Erdungsanlage PV-Gestell / Dachaufbauten anbinden",
         "lang": "Unterkonstruktion der Photovoltaikanlage bzw. Dachaufbauten mit Fangleitung bzw. Potentialausgleich verbinden "
                 "unter Einhaltung der Trennungsabstände, je Modulfeld.",
         "einheit": "St", "kg": "446", "h": 2, "mat": 60, "gen": "B"},
        {"kurz": "Blitzschutz-Dokumentation und Plan nach DIN EN 62305",
         "lang": "Blitzschutzplan mit Fangeinrichtungen, Ableitungen, Trennstellen und Erdung, Risikobewertung bzw. "
                 "Blitzschutzklasse dokumentieren, Übergabe digital.",
         "einheit": "psch", "kg": "446", "h": 6, "mat": 0, "gen": "B"},
    ]},
]
_K = lambda *worte: (lambda g, p: any(w in p["kurz"] for w in worte))
zuweisen(LBS, [
    (_K("Potentialausgleich Leitung", "Schutzpotentialausgleich"), [VERLEGUNG_KABEL, ORT_KLEIN]),
    (_K("Erdungsbandschelle", "Örtlicher"), [ORT]),
])
