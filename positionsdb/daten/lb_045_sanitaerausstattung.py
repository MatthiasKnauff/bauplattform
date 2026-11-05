# LB 045 Gas-, Wasser- und Entwässerungsanlagen – Ausstattung, Elemente (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "045", "name": "Gas-, Wasser- und Entwässerungsanlagen – Ausstattung, Elemente", "atv": "DIN 18381", "lohn": "sanitaer",
    "gruppen": [
        {"name": "Vorwandelemente", "positionen": [
            {"kurz": "Vorwandelement {art}, Bauhöhe {bh} mm",
             "lang": "Vorwand-Montageelement {art} aus pulverbeschichtetem Stahlrahmen mit Befestigungsmaterial für "
                     "Trockenbau- oder Massivbauweise, Bauhöhe {bh} mm, mit Anschlüssen für Wasser und Abwasser, "
                     "Schallschutzset. Beplankung gesondert.",
             "einheit": "St", "kg": "412", "gen": "B",
             "varianten": [{"art": "für Wand-WC mit UP-Spülkasten", "bh": "1120", "h": 2.0, "mat": 285},
                           {"art": "für Waschtisch", "bh": "1120", "h": 1.5, "mat": 140},
                           {"art": "für Urinal", "bh": "1120", "h": 1.6, "mat": 190},
                           {"art": "für Wand-WC, barrierefrei mit Stützgriff-Befestigung", "bh": "1120", "h": 2.5, "mat": 460},
                           {"art": "für Wand-WC, niedrig (unter Fenster)", "bh": "820", "h": 2.0, "mat": 330}]},
            {"kurz": "Betätigungsplatte WC 2-Mengen-Spülung, {art}",
             "lang": "Betätigungsplatte für Unterputz-Spülkasten mit 2-Mengen-Spültechnik, {art}, montieren und einstellen.",
             "einheit": "St", "kg": "412", "gen": "B",
             "varianten": [{"art": "Kunststoff weiß", "h": 0.4, "mat": 55}, {"art": "Edelstahl oder Glas", "h": 0.4, "mat": 165},
                           {"art": "berührungslos elektronisch", "h": 1.0, "mat": 420}]},
        ]},
        {"name": "Sanitärobjekte komplett", "positionen": [
            {"kurz": "Wand-WC spülrandlos komplett, {art}",
             "lang": "Wandhängendes Tiefspül-WC aus Sanitärporzellan, spülrandlos, {art}, mit WC-Sitz mit Deckel "
                     "(Absenkautomatik), Schallschutzset und Anschlussgarnitur, auf vorhandenes Vorwandelement montieren, "
                     "anschließen und einstellen. Vorwandelement und Betätigungsplatte gesondert.",
             "einheit": "St", "kg": "412", "gen": "B",
             "achsen": [OBERFLAECHE_SAN[:2], ORT],
             "varianten": [{"art": "Standardausführung", "h": 2.0, "mat": 340}, {"art": "gehobene Ausführung", "h": 2.0, "mat": 620},
                           {"art": "Dusch-WC mit Elektroanschluss", "h": 3.5, "mat": 2200}]},
            {"kurz": "Wand-WC barrierefrei, verlängerte Ausladung 70 cm",
             "lang": "Wand-WC nach DIN 18040 mit Ausladung 700 mm, spülrandlos, WC-Sitz ohne Deckel bzw. mit Rückenstütze, "
                     "Sitzhöhe 46–48 cm, auf barrierefreies Vorwandelement montieren und anschließen.",
             "einheit": "St", "kg": "412", "h": 2.5, "mat": 560, "gen": "B"},
            {"kurz": "Waschtisch {b} cm mit Einhebelmischer und Siphon",
             "lang": "Waschtisch aus Sanitärporzellan, Breite {b} cm, mit Hahnloch und Überlauf, Befestigung, "
                     "Einhebel-Waschtischmischer mit Ablaufgarnitur (Durchfluss ≤ 6 l/min), Röhrensiphon, Eckventilen "
                     "mit Flexschläuchen, montieren und anschließen.",
             "einheit": "St", "kg": "412", "gen": "B",
             "varianten": [{"b": "45 (Handwaschbecken)", "h": 2.5, "mat": 210}, {"b": "60", "h": 2.8, "mat": 320},
                           {"b": "80", "h": 3.0, "mat": 460}, {"b": "120 (Doppelwaschtisch)", "h": 4.5, "mat": 920}]},
            {"kurz": "Waschtisch barrierefrei unterfahrbar, mit Hebelarmatur",
             "lang": "Unterfahrbarer Waschtisch nach DIN 18040, Breite 55–65 cm, mit Griffmulden, Unterputz- bzw. "
                     "Flachaufputzsiphon, Einhebelmischer mit langem Hebel bzw. berührungslos, Kippspiegel gesondert.",
             "einheit": "St", "kg": "412", "h": 3.5, "mat": 690, "gen": "B"},
            {"kurz": "Waschtischunterschrank {b} cm, montieren",
             "lang": "Waschtisch-Unterschrank mit Schubkasten, Breite {b} cm, Front nach Bemusterung, an Wand montieren "
                     "und Siphon anpassen.",
             "einheit": "St", "kg": "412", "gen": "C",
             "varianten": [{"b": "60", "h": 1.5, "mat": 380}, {"b": "80", "h": 1.7, "mat": 520}]},
            {"kurz": "Dusche bodengleich, Duschrinne bauseits, Armaturen komplett",
             "lang": "Ausstattung für bodengleiche Dusche: Unterputz-Grundkörper mit Thermostatmischer und Fertigset, "
                     "Kopfbrause Ø 25 cm, Handbrause mit Brausestange bzw. Halter, Schlauch. Duschrinne, Abdichtung und "
                     "Duschabtrennung gesondert.",
             "einheit": "St", "kg": "412", "h": 4.5, "mat": 780, "gen": "B"},
            {"kurz": "Duschwanne Stahl-Email {m} cm, flach, mit Ablauf",
             "lang": "Flache Duschwanne aus Stahl-Email, {m} cm, Aufbauhöhe ≤ 2,5 cm über Estrich, mit Wannenträger, "
                     "Schallschutz-Set und Ablaufgarnitur, einbauen und anschließen.",
             "einheit": "St", "kg": "412", "gen": "B",
             "varianten": [{"m": "90 × 90", "h": 3.0, "mat": 360}, {"m": "120 × 90", "h": 3.2, "mat": 470}, {"m": "160 × 90", "h": 3.5, "mat": 620}]},
            {"kurz": "Duschabtrennung Glas ESG 8 mm, {art}",
             "lang": "Duschabtrennung aus Einscheibensicherheitsglas 8 mm klar mit Beschichtung, Beschläge verchromt, "
                     "{art}, maßgenau nach Aufmaß, montieren und abdichten.",
             "einheit": "St", "kg": "412", "gen": "C",
             "varianten": [{"art": "Walk-in, feststehend bis 120 cm", "h": 2.5, "mat": 720}, {"art": "Eckeinstieg mit Pendeltür 90 × 90", "h": 3.5, "mat": 1150},
                           {"art": "Nische mit Pendeltür bis 100 cm", "h": 3.0, "mat": 880}]},
            {"kurz": "Badewanne Acryl {m} cm mit Wannenträger, Armaturen komplett",
             "lang": "Körperformbadewanne aus Sanitäracryl {m} cm mit Wannenträger bzw. Füßen, Schallschutzset, "
                     "Ab- und Überlaufgarnitur mit Füllfunktion, Aufputz- bzw. Unterputz-Wannenthermostat mit Handbrause, "
                     "einbauen und anschließen. Verkleidung gesondert.",
             "einheit": "St", "kg": "412", "gen": "B",
             "varianten": [{"m": "170 × 75", "h": 5.0, "mat": 980}, {"m": "180 × 80", "h": 5.0, "mat": 1150}]},
            {"kurz": "Urinal mit Absaugesiphon und Steuerung, {art}",
             "lang": "Urinal aus Sanitärporzellan mit Zulauf von hinten, Absaugesiphon und Befestigung, {art}, "
                     "auf Vorwandelement montieren und anschließen.",
             "einheit": "St", "kg": "412", "gen": "B",
             "varianten": [{"art": "mit manueller Druckspüler-Betätigung", "h": 2.5, "mat": 420},
                           {"art": "mit berührungsloser Infrarot-Steuerung (Netz)", "h": 3.0, "mat": 780}]},
            {"kurz": "Ausgussbecken Stahl mit Klapprost und Wandbatterie",
             "lang": "Ausgussbecken aus Stahl emailliert mit Klapprost, Wandbatterie mit Schwenkauslauf und Siphon, "
                     "für Putz- und Wirtschaftsräume, montieren und anschließen.",
             "einheit": "St", "kg": "412", "h": 2.5, "mat": 340, "gen": "A"},
            {"kurz": "Küchenanschluss Spüle/Spülmaschine, vorbereitet",
             "lang": "Anschlusspunkte für Küchenspüle und Geschirrspüler vorbereiten: Eckventile kalt/warm mit "
                     "Geräteanschlussventil, Abwasseranschluss mit Gerätestutzen; Montage der Spüle durch Küchenbauer.",
             "einheit": "St", "kg": "412", "h": 1.5, "mat": 65, "gen": "A"},
            {"kurz": "Außenzapfstelle frostsicher mit Rückflussverhinderer",
             "lang": "Frostsichere Außenwandarmatur mit innenliegender Absperrung, Belüfter und Rückflussverhinderer, "
                     "durch die Außenwand einbauen, einschließlich Anschluss an Trinkwasserleitung.",
             "einheit": "St", "kg": "412", "h": 1.8, "mat": 145, "gen": "A"},
            {"kurz": "Waschmaschinenanschluss mit Geräteventil und Siphon",
             "lang": "Waschmaschinenanschluss mit Geräteanschlussventil (Rückflussverhinderer, Belüfter) und Unterputz- "
                     "bzw. Aufputz-Geräteablauf herstellen.",
             "einheit": "St", "kg": "412", "h": 1.2, "mat": 70, "gen": "A"},
        ]},
        {"name": "Barrierefreie Ausstattung, Zubehör", "positionen": [
            {"kurz": "Stützklappgriff WC, Länge 85 cm, {art}",
             "lang": "Stützklappgriff für WC nach DIN 18040, Länge 85 cm, belastbar nach Norm, {art}, auf vorbereitete "
                     "Befestigungsplatte montieren.",
             "einheit": "St", "kg": "412", "gen": "B",
             "varianten": [{"art": "ohne Spülauslösung", "h": 1.0, "mat": 280}, {"art": "mit Spülauslösung und Papierhalter", "h": 1.5, "mat": 520}]},
            {"kurz": "Haltegriff/Stützgriff Edelstahl bzw. Kunststoff, {l} cm",
             "lang": "Wandhaltegriff aus Edelstahl bzw. Kunststoff mit Stahlkern, Länge {l} cm, belastbar nach DIN 18040, montieren.",
             "einheit": "St", "kg": "412", "gen": "A",
             "varianten": [{"l": "30", "h": 0.5, "mat": 55}, {"l": "60", "h": 0.6, "mat": 85}]},
            {"kurz": "Duschklappsitz mit Rückenlehne, barrierefrei",
             "lang": "Hochklappbarer Duschsitz mit Rückenlehne und Armlehnen nach DIN 18040, an tragfähiger Wand montieren.",
             "einheit": "St", "kg": "412", "h": 1.2, "mat": 520, "gen": "B"},
            {"kurz": "Kippspiegel 60 × 70 cm",
             "lang": "Neigbarer Spiegel 60 × 70 cm für barrierefreie Waschplätze, montieren.",
             "einheit": "St", "kg": "412", "h": 0.8, "mat": 260, "gen": "B"},
            {"kurz": "Sanitär-Accessoires je WC-Raum (Papierhalter, Bürste, Haken)",
             "lang": "Sanitär-Zubehör je Raum liefern und montieren: Papierrollenhalter, Reserverollenhalter, "
                     "WC-Bürstengarnitur, Handtuchhaken, Seifenspender; Ausführung nach Bemusterung.",
             "einheit": "St", "kg": "412", "h": 1.5, "mat": 180, "gen": "C"},
            {"kurz": "Sanitärobjekt demontieren und entsorgen",
             "lang": "Vorhandenes Sanitärobjekt (WC, Waschtisch, Wanne o. Ä.) mit Armaturen demontieren, Anschlüsse "
                     "verschließen, Altmaterial entsorgen.",
             "einheit": "St", "kg": "412", "h": 1.2, "mat": 5, "geraet": 18, "gen": "B", "tags": ["altbau"]},
        ]},
    ],
}]

# ---------------------------------------------------------------- Ergänzungen (Runde 2)
VW_UNTERGRUND = [{"k": "Trockenbau-Vorwand", "t": "Einbau in Trockenbau-Vorwand bzw. Installationswand (Beplankung gesondert)."},
                 {"k": "vor Massivwand", "t": "Befestigung vor Massivwand mit Wandwinkeln, zum Einmauern bzw. Verkleiden.", "fh": 1.1, "mat": 12},
                 {"k": "Raumhoch/freistehend", "t": "Freistehende bzw. raumhohe Montage mit Bodenbefestigung und Traversen.", "fh": 1.25, "mat": 35}]
LBS[0]["gruppen"][0]["positionen"] += [
    {"kurz": "Vorwandelement für {art}, Bauhöhe 1120 mm",
     "lang": "Vorwand-Montageelement für {art} mit Stahlrahmen, Befestigungsmaterial und Anschlüssen, Schallschutzset.",
     "einheit": "St", "kg": "412", "gen": "B",
     "varianten": [{"art": "Bidet", "h": 1.6, "mat": 190}, {"art": "Ausgussbecken", "h": 1.5, "mat": 170}, {"art": "Stützgriffe (Befestigungsplatte)", "h": 1.0, "mat": 95},
                   {"art": "Waschtisch mit Unterputz-Armatur", "h": 1.8, "mat": 230}]},
    {"kurz": "Revisionsöffnung/Revisionsklappe für Vorwand, {m} cm",
     "lang": "Revisionsklappe befliesbar mit Magnet- bzw. Druckverschluss in Vorwandinstallation, {m} cm.",
     "einheit": "St", "kg": "412", "gen": "A", "varianten": [{"m": "20 × 20", "h": 0.5, "mat": 45}, {"m": "30 × 30", "h": 0.6, "mat": 65}]},
]
LBS[0]["gruppen"][1]["positionen"] += [
    {"kurz": "Waschtischarmatur Einhebel, {art}",
     "lang": "Waschtischarmatur {art} mit Ablaufgarnitur bzw. ohne, Durchflussbegrenzung, montieren und anschließen (Waschtisch vorhanden).",
     "einheit": "St", "kg": "412", "gen": "B",
     "varianten": [{"art": "Standhöhe normal", "h": 0.8, "mat": 120}, {"art": "erhöht für Aufsatzbecken", "h": 0.9, "mat": 190},
                   {"art": "Wandarmatur Unterputz mit Grundkörper", "h": 2.0, "mat": 280}, {"art": "berührungslos mit Batterie/Netz", "h": 1.2, "mat": 420}]},
    {"kurz": "Brause-/Wannenthermostat Aufputz mit Brausegarnitur",
     "lang": "Aufputz-Thermostat für Dusche bzw. Wanne mit Verbrühschutz, Brausestange 90 cm, Handbrause und Schlauch.",
     "einheit": "St", "kg": "412", "h": 1.5, "mat": 260, "gen": "B"},
    {"kurz": "Duschsystem Aufputz mit Kopfbrause und Thermostat",
     "lang": "Duschsystem (Duschpaneel bzw. Showerpipe) mit Thermostat, Kopfbrause Ø 25–30 cm, Handbrause und Halter, montieren.",
     "einheit": "St", "kg": "412", "h": 2.0, "mat": 520, "gen": "B"},
    {"kurz": "Küchenarmatur Einhebel mit Brause bzw. Niederdruck",
     "lang": "Spültischarmatur Einhebel mit herausziehbarer Brause bzw. Niederdruckausführung für Kleinspeicher, montieren und anschließen.",
     "einheit": "St", "kg": "412", "h": 1.0, "mat": 160, "gen": "B"},
    {"kurz": "Duschwanne Mineralguss bodengleich {m} cm",
     "lang": "Flache Duschwanne aus Mineralguss bzw. Acryl, bodeneben, mit Ablauf und Wannenträger bzw. Dichtband, {m} cm, einbauen.",
     "einheit": "St", "kg": "412", "gen": "B",
     "varianten": [{"m": "90 × 90", "h": 3.0, "mat": 420}, {"m": "120 × 90", "h": 3.2, "mat": 520}, {"m": "140 × 90", "h": 3.4, "mat": 610}, {"m": "160 × 90", "h": 3.6, "mat": 690}]},
    {"kurz": "Badewannenschürze/Wannenträger mit Verkleidung, {m} cm",
     "lang": "Wannenträger aus Hartschaum mit befliesbarer Schürze bzw. Wannenverkleidung aus Acryl, {m} cm, einschließlich Revisionsöffnung.",
     "einheit": "St", "kg": "412", "gen": "B", "varianten": [{"m": "170 × 75", "h": 1.5, "mat": 210}, {"m": "180 × 80", "h": 1.6, "mat": 240}]},
    {"kurz": "Bidet wandhängend mit Armatur",
     "lang": "Wandhängendes Bidet aus Sanitärporzellan mit Einhebel-Bidetarmatur und Ablaufgarnitur, auf Vorwandelement montieren und anschließen.",
     "einheit": "St", "kg": "412", "h": 2.5, "mat": 520, "gen": "B"},
    {"kurz": "{kz}, Breite {b} cm",
     "lang": "{art} Breite {b} cm, montieren und an vorhandenen Elektroanschluss anschließen.",
     "einheit": "St", "kg": "412", "gen": "C",
     "varianten": [{"kz": "Kristallspiegel mit Facette", "art": "Kristallspiegel mit Facette", "b": "60", "h": 0.8, "mat": 85}, {"kz": "LED-Spiegel", "art": "LED-Spiegel mit Antibeschlag", "b": "80", "h": 1.2, "mat": 290},
                   {"kz": "Spiegelschrank mit LED", "art": "Spiegelschrank mit LED-Beleuchtung und Steckdose", "b": "80", "h": 1.8, "mat": 520}]},
    {"kurz": "Wickeltisch/Wickelauflage klappbar, öffentlich",
     "lang": "Klappbarer Wandwickeltisch für öffentliche Sanitärräume, Polyethylen, mit Sicherheitsgurt, montieren.",
     "einheit": "St", "kg": "412", "h": 1.2, "mat": 480, "gen": "B"},
    {"kurz": "Urinal-Trennwand (Schamwand) Kompaktplatte",
     "lang": "Urinaltrennwand aus HPL-Kompaktplatte 13 mm, ca. 40 × 90 cm, mit Edelstahl-Wandhalter.",
     "einheit": "St", "kg": "412", "h": 0.8, "mat": 160, "gen": "B"},
    {"kurz": "Waschrinne/Reihenwaschanlage Edelstahl, {n} Plätze",
     "lang": "Reihenwaschanlage aus Edelstahl mit Armaturen (Selbstschluss) und Abläufen für {n} Plätze, montieren und anschließen.",
     "einheit": "St", "kg": "412", "gen": "C", "varianten": [{"n": "3", "h": 6, "mat": 2600}, {"n": "5", "h": 8, "mat": 3900}]},
    {"kurz": "Augen- und Körpernotdusche nach DIN EN 15154",
     "lang": "Notdusche (Augen- und Körperdusche) mit Handauslösung, Anschluss an Trinkwasser und Abwasser.",
     "einheit": "St", "kg": "412", "h": 3, "mat": 820, "gen": "B"},
    {"kurz": "Silikonfuge Sanitärobjekt/Fliese, je Objekt",
     "lang": "Elastische Anschlussfuge mit Sanitärsilikon zwischen Sanitärobjekt und Fliesenbelag, Farbe nach Fuge.",
     "einheit": "St", "kg": "412", "h": 0.3, "mat": 4, "gen": "A"},
]
LBS[0]["gruppen"][2]["positionen"] += [
    {"kurz": "Seifenspender/Handtuchspender/Händetrockner, {art}",
     "lang": "{art} für öffentliche Sanitärräume liefern und montieren.",
     "einheit": "St", "kg": "412", "gen": "B",
     "varianten": [{"art": "Seifen- bzw. Desinfektionsmittelspender", "h": 0.4, "mat": 45}, {"art": "Papierhandtuchspender Edelstahl", "h": 0.5, "mat": 110},
                   {"art": "Händetrockner elektrisch (Anschluss bauseits)", "h": 1.0, "mat": 520}, {"art": "Abfallbehälter Edelstahl 25 l", "h": 0.4, "mat": 120}]},
    {"kurz": "Armaturen tauschen im Bestand (Waschtisch/Spüle/Dusche)",
     "lang": "Vorhandene Armatur abbauen und entsorgen, neue Armatur (bauseits bzw. aus gesonderter Position) montieren und anschließen.",
     "einheit": "St", "kg": "412", "h": 1.2, "mat": 15, "gen": "B", "tags": ["altbau"]},
    {"kurz": "Barrierefreies Bad Komplettausstattung DIN 18040-2",
     "lang": "Ausstattungspaket für barrierefreies Bad: unterfahrbarer Waschtisch mit Hebelarmatur, WC mit Stützklappgriffen, "
             "bodengleiche Dusche mit Duschsitz und Haltegriffen, Kippspiegel; Montage auf vorhandenen Vorwandelementen.",
     "einheit": "psch", "kg": "412", "h": 16, "mat": 3800, "gen": "C"},
]
zuweisen(LBS, vorab() + [
    (ist("St", kurz=r"Vorwandelement"), [VW_UNTERGRUND, ORT]),
    (ist("St", kurz=r"WC|Waschtisch \d|Bidet|Urinal|Badewanne|Duschwanne"), [STANDARD, OBERFLAECHE_SAN[:2], ORT]),
    (ist("St", kurz=r"armatur|Thermostat|Duschsystem|Betätigung|Dusche bodengleich|Ausguss"), [STANDARD, OBERFLAECHE_SAN, ORT_KLEIN]),
    (ist("St", kurz=r"griff|Duschklapp|Spiegel|Accessoire|spender|Wickel"), [STANDARD[:3], BEFESTIGUNG, ORT_KLEIN]),
    (ist("St", kurz=r"Duschabtrennung"), [OBERFLAECHE_SAN, ORT_KLEIN]),
    (ist(), [ORT_KLEIN]),
])
