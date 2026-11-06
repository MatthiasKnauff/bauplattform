# LB 069 Aufzüge (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "069", "name": "Aufzüge", "atv": "DIN 18385", "lohn": "aufzug",
    "gruppen": [
        {"name": "Personenaufzüge", "positionen": [
            {"kurz": "Personenaufzug {kg_} kg, {n} Haltest., {v} m/s",
             "lang": "Elektrisch angetriebener Personenaufzug ohne Triebwerksraum nach DIN EN 81-20/-50, Nennlast {kg_} kg, "
                     "{n} Haltestellen, Geschwindigkeit {v} m/s, Fahrkorb und Türen nach DIN EN 81-70 (rollstuhlgerecht ab "
                     "1000 kg mit 1,10 × 2,10 m), Teleskop-Schiebetüren Edelstahl, Notrufsystem mit 24-h-Aufschaltung, "
                     "Fahrkorbausstattung Standard, einschließlich Montage, Prüfung durch ZÜS und Inbetriebnahme. "
                     "Schacht bauseits.",
             "einheit": "St", "kg": "461", "gen": "C",
             "varianten": [{"kg_": "630", "n": "3", "v": "1,0", "h": 230, "mat": 46000}, {"kg_": "630", "n": "4", "v": "1,0", "h": 260, "mat": 52000},
                           {"kg_": "1000", "n": "4", "v": "1,0", "h": 290, "mat": 62000}, {"kg_": "1000", "n": "6", "v": "1,0", "h": 340, "mat": 76000},
                           {"kg_": "1275", "n": "6", "v": "1,6", "h": 380, "mat": 92000}]},
            {"kurz": "Mehrpreis Aufzug je weitere Haltestelle",
             "lang": "Mehrpreis für jede weitere Haltestelle einschließlich Schachttür, Schachtausrüstung und Steuerungserweiterung.",
             "einheit": "St", "kg": "461", "h": 30, "mat": 5400, "gen": "C"},
            {"kurz": "Mehrpreis Durchlader / zweite Zugangsseite",
             "lang": "Mehrpreis für Fahrkorb mit zweiter Zugangsseite (Durchlader) je Haltestelle mit zusätzlicher Schachttür.",
             "einheit": "St", "kg": "461", "h": 20, "mat": 4200, "gen": "C"},
            {"kurz": "Mehrpreis Brandfallsteuerung / Feuerwehraufzug-Vorbereitung",
             "lang": "Mehrpreis Brandfallsteuerung nach DIN EN 81-73 mit Ansteuerung durch die Brandmeldeanlage.",
             "einheit": "St", "kg": "461", "h": 8, "mat": 1600, "gen": "C"},
            {"kurz": "Aufzug-Wartungsvertrag Vollwartung, 1. Jahr",
             "lang": "Vollwartung der Aufzugsanlage für ein Jahr ab Abnahme einschließlich Notrufbereitschaft; "
                     "die Vergabe eines Folgevertrags bleibt dem Auftraggeber vorbehalten.",
             "einheit": "psch", "kg": "461", "h": 18, "mat": 900, "gen": "C"},
        ]},
        {"name": "Lifte für barrierefreie Erschließung", "positionen": [
            {"kurz": "Plattform-/Hublift senkrecht, Förderhöhe bis {fh} m",
             "lang": "Senkrechter Plattformlift nach Maschinenrichtlinie (DIN EN 81-41) mit Schachtgerüst bzw. in bauseitigem "
                     "Schacht, Plattform ca. 1,10 × 1,40 m, Nennlast 300 kg, Förderhöhe bis {fh} m, 2 Haltestellen, "
                     "Montage und Inbetriebnahme.",
             "einheit": "St", "kg": "461", "gen": "C",
             "varianten": [{"fh": "1,2", "h": 40, "mat": 15500}, {"fh": "3,0", "h": 70, "mat": 26500}, {"fh": "6,0", "h": 100, "mat": 39000}]},
            {"kurz": "Treppenlift {art}",
             "lang": "Treppenlift {art} an Treppenwange bzw. Stufen befestigt, mit Fernbedienungen, Sicherheitsgurt und "
                     "klappbarem Sitz bzw. Plattform, Montage, Einweisung.",
             "einheit": "St", "kg": "461", "gen": "C",
             "varianten": [{"art": "Sitzlift gerade, ein Geschoss", "h": 8, "mat": 4800}, {"art": "Sitzlift kurvig, ein Geschoss", "h": 14, "mat": 10500},
                           {"art": "Plattformlift für Rollstuhl, gerade", "h": 20, "mat": 11500}]},
            {"kurz": "Hebebühne Kleingüteraufzug 50 kg, 2 Haltestellen",
             "lang": "Kleingüteraufzug (Speisenaufzug) Nennlast 50 kg, Fahrkorb 60 × 60 cm, 2 Haltestellen, Schachtgerüst, "
                     "Montage und Inbetriebnahme.",
             "einheit": "St", "kg": "461", "h": 50, "mat": 11500, "gen": "C"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Runde 2
LBS[0]["gruppen"] += [
    {"name": "Modernisierung, Nebenleistungen", "positionen": [
        {"kurz": "Aufzugsmodernisierung Steuerung und Antrieb, {n} Haltestellen",
         "lang": "Modernisierung eines bestehenden Seilaufzugs: neue Steuerung, frequenzgeregelter Antrieb, Schachtinformation, "
                 "Notruf, Anpassung an DIN EN 81-20/-80 soweit gefordert, Demontage der Altteile, Abnahme durch ZÜS, {n} Haltestellen.",
         "einheit": "St", "kg": "461", "gen": "C", "tags": ["altbau"],
         "varianten": [{"n": "4", "h": 120, "mat": 34000}, {"n": "6", "h": 150, "mat": 41000}]},
        {"kurz": "Aufzugstüren erneuern (Schacht- und Kabinentür), je Haltestelle",
         "lang": "Schachttür und anteilig Kabinentür erneuern, Türantrieb, Lichtgitter, Rahmen, Brandschutz E120 nach Erfordernis.",
         "einheit": "St", "kg": "461", "h": 18, "mat": 4300, "gen": "C", "tags": ["altbau"]},
        {"kurz": "Notrufsystem Aufzug nach DIN EN 81-28, Mobilfunk",
         "lang": "Zweiwege-Kommunikationssystem für Aufzugsnotruf mit Mobilfunkmodul und Aufschaltung auf ständig besetzte Stelle "
                 "einbauen; Leitstellengebühren gesondert.",
         "einheit": "St", "kg": "461", "h": 6, "mat": 1150, "gen": "B"},
        {"kurz": "Schachtgerüst / Montagehilfen Aufzug, je Haltestelle",
         "lang": "Montagegerüst bzw. Montagebühne im Aufzugsschacht vorhalten, je Haltestelle, einschließlich Absturzsicherung.",
         "einheit": "St", "kg": "461", "h": 3, "mat": 0, "geraet": 180, "gen": "B"},
        {"kurz": "Prüfung vor Inbetriebnahme durch ZÜS, Unterstützung",
         "lang": "Unterstützung der Prüfung durch die zugelassene Überwachungsstelle (ZÜS) vor Inbetriebnahme, Prüflasten und "
                 "Unterlagen bereitstellen; Prüfgebühr gesondert.",
         "einheit": "psch", "kg": "461", "h": 8, "mat": 0, "geraet": 250, "gen": "B"},
        {"kurz": "Schachtgrubenleiter und Schachtbeleuchtung",
         "lang": "Schachtgrubenleiter aus Aluminium sowie LED-Schachtbeleuchtung mit Schaltern in Grube und Maschinenbereich einbauen.",
         "einheit": "St", "kg": "461", "h": 6, "mat": 980, "gen": "B"},
        {"kurz": "Aufzug Bestand demontieren und entsorgen",
         "lang": "Vorhandene Aufzugsanlage (Kabine, Antrieb, Führungsschienen, Türen, Steuerung) bis 6 Haltestellen demontieren und entsorgen.",
         "einheit": "St", "kg": "394", "h": 60, "mat": 0, "geraet": 2400, "gen": "C", "tags": ["altbau"]},
    ]},
]
_K = lambda *worte: (lambda g, p: any(w in p["kurz"] for w in worte))
KABINE = [{"ersetze": [[r"Fahrkorbausstattung Standard, ", ""]], "k": "Kab. Standard", "t": "Kabinenausstattung Standard (Edelstahl geschliffen bzw. Laminat, Spiegel halbhoch, LED-Decke)."},
          {"k": "Kab. gehoben", "t": "Kabinenausstattung gehoben (Edelstahl/Glas, Spiegel raumhoch, Designdecke, Handlauf beidseitig).", "fm": 1.08},
          {"k": "Kab. Premium", "t": "Kabinenausstattung nach Bemusterung (Glasrückwand, Naturstein-Boden, Sonderdecke).", "fm": 1.16, "gen": "C"}]
TUER = [{"k": "Tür 900", "t": "Teleskop- bzw. Zentralschiebetür lichte Breite 900 mm."}, {"k": "Tür 1100", "t": "Lichte Türbreite 1.100 mm (Bettentransport/Rollstuhl mit Begleitung).", "fm": 1.04}]
zuweisen(LBS, [
    (_K("Personenaufzug"), [KABINE, TUER]),
    (_K("Plattform-/Hublift", "Treppenlift"), [[{}, {"k": "Außenbereich", "t": "Ausführung für den Außenbereich, witterungsbeständig.", "fm": 1.15}], ORT_KLEIN]),
    (_K("Aufzugstüren", "Aufzugsmodernisierung"), [[{}, {"k": "bewohnt, Etappen", "t": "Ausführung im genutzten Gebäude in Etappen, Stillstandzeiten minimiert.", "fh": 1.15}]]),
])
# 630 kg (Fahrkorb 1,10 m breit): Tür 1.100 mm nicht ausführbar
for _g in LBS[0]["gruppen"]:
    for _p in _g["positionen"]:
        for _v in _p.get("varianten") or []:
            if _v.get("kg_") == "630":
                _v["achsen"] = [KABINE, TUER[:1]]
