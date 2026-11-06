import re
# LB 038 Vorgehängte hinterlüftete Fassaden – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "038", "name": "Vorgehängte hinterlüftete Fassaden", "atv": "DIN 18351", "lohn": "fassade", "kg": "335",
    "gruppen": [
        {"name": "Unterkonstruktion, Dämmung", "positionen": [
            {"kurz": "Unterkonstruktion Aluminium, Wandabstand bis {a} mm",
             "lang": "Metall-Unterkonstruktion für vorgehängte hinterlüftete Fassade aus Aluminium-Wandhaltern mit "
                     "thermischen Trennelementen und senkrechten T- bzw. L-Tragprofilen, Fest- und Gleitpunkte, "
                     "Verankerung mit zugelassenen Dübeln nach statischem Nachweis (wird mitgeliefert), Wandabstand bis "
                     "{a} mm. Abrechnung nach bekleideter Fläche.",
             "einheit": "m²", "gen": "B",
             "varianten": [{"a": "160", "h": 0.55, "mat": 34}, {"a": "220", "h": 0.60, "mat": 40}, {"a": "300", "h": 0.65, "mat": 48}]},
            {"kurz": "Unterkonstruktion Holz, Traglattung/Konterlattung",
             "lang": "Holz-Unterkonstruktion aus Kanthölzern bzw. Doppellattung, imprägniert, mit Konterlattung für die "
                     "Hinterlüftung, verankert in den Untergrund; Dämmung gesondert. Abrechnung nach Fläche.",
             "einheit": "m²", "h": 0.45, "mat": 15, "gen": "B"},
            {"kurz": "Fassadendämmung Mineralwolle A1, kaschiert, WLS {w}, d = {d} mm",
             "lang": "Wärmedämmung aus Mineralwolle-Fassadendämmplatten, nichtbrennbar A1, WLS {w}, mit schwarzer "
                     "Vlieskaschierung, Dicke {d} mm, dicht gestoßen zwischen den Wandhaltern verlegt und mit "
                     "Dämmstoffhaltern (mind. 5 St/m²) befestigt.",
             "einheit": "m²", "gen": "A",
             "varianten": [{"w": "035", "d": "120", "h": 0.20, "mat": 17}, {"w": "035", "d": "160", "h": 0.22, "mat": 22},
                           {"w": "032", "d": "200", "h": 0.25, "mat": 31}, {"w": "032", "d": "240", "h": 0.28, "mat": 37}]},
            {"kurz": "Winddichtung / Fassadenbahn UV-beständig, für offene Fugen",
             "lang": "Diffusionsoffene, UV-beständige schwarze Fassadenbahn über der Dämmung als Winddichtung bei "
                     "offenen Fugen der Bekleidung, überlappt und an Öffnungen angeschlossen.",
             "einheit": "m²", "h": 0.08, "mat": 5.5, "gen": "A"},
            {"kurz": "Brandsperre im Hinterlüftungsraum, Stahlblech, je Geschoss",
             "lang": "Horizontale Brandsperre im Hinterlüftungsraum nach Muster-Verwaltungsvorschrift Technische "
                     "Baubestimmungen, aus verzinktem Stahlblech ≥ 1 mm, geschossweise durchlaufend, Lüftungsquerschnitt "
                     "gemäß Vorgabe.",
             "einheit": "m", "h": 0.35, "mat": 16, "gen": "B"},
        ]},
        {"name": "Bekleidungen", "positionen": [
            {"kurz": "Fassadenbekleidung aus {m}",
             "lang": "Fassadenbekleidung aus {m}, Format und Fugenbild nach Fassadenplanung, auf der Unterkonstruktion "
                     "{b} befestigt, Fugen offen bzw. hinterlegt, einschließlich Zuschnitt und Kleinteile. Abrechnung nach "
                     "Fläche, Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "gen": "C",
             "varianten": [{"m": "Faserzementtafeln, durchgefärbt, 8 mm", "b": "sichtbar genietet", "h": 0.85, "mat": 72},
                           {"m": "Faserzementtafeln, beschichtet, 8 mm", "b": "verdeckt geklebt", "h": 0.90, "mat": 62},
                           {"m": "Faserzement-Fassadenschindeln / Stülpdeckung", "b": "genagelt", "h": 1.10, "mat": 45},
                           {"m": "HPL-Kompaktplatten, 8 mm, Dekor nach Wahl", "b": "sichtbar genietet", "h": 0.85, "mat": 88},
                           {"m": "keramischen Fassadenplatten / Feinsteinzeug", "b": "mit Agraffen verdeckt", "h": 1.10, "mat": 115},
                           {"m": "Natursteinplatten 3 cm (Granit/Muschelkalk)", "b": "mit Ankern im Fugenbereich", "h": 1.40, "mat": 150},
                           {"m": "Aluminium-Verbundplatten (Kassetten), 4 mm, A2-Kern", "b": "eingehängt", "h": 1.20, "mat": 125},
                           {"m": "Metall-Sinuswelle/Trapezprofil Alu, beschichtet", "b": "verschraubt", "h": 0.55, "mat": 38},
                           {"m": "Glasfassadenplatten (Emailit)", "b": "mit Punkthaltern", "h": 1.30, "mat": 190},
                           {"m": "Holzschalung Lärche, Boden-Deckel", "b": "verschraubt", "h": 0.95, "mat": 52, "gen": "B"}]},
            {"kurz": "Holz-Rhombusleisten {m}, 24 × 68 mm, offene Fuge",
             "lang": "Fassadenbekleidung aus Rhombusleisten {m}, 24 × 68 mm, mit Fugenabstand ca. 10 mm, verdeckt "
                     "mit Edelstahl-Clips auf senkrechter Lattung befestigt, über UV-beständiger Fassadenbahn.",
             "einheit": "m²", "gen": "C",
             "varianten": [{"m": "sibirische Lärche", "h": 1.15, "mat": 62}, {"m": "Thermoholz Kiefer", "h": 1.15, "mat": 78}]},
            {"kurz": "Sockelbekleidung VHF, Spritzwasserbereich, Faserzement/HPL",
             "lang": "Bekleidung des Sockels im Spritzwasserbereich mit stoßfesten Faserzement- bzw. HPL-Platten, "
                     "einschließlich Lüftungsprofil mit Insektenschutz am unteren Abschluss. Höhe bis 50 cm.",
             "einheit": "m", "h": 0.70, "mat": 45, "gen": "B"},
        ]},
        {"name": "Öffnungen, Anschlüsse", "positionen": [
            {"kurz": "Laibungsbekleidung Fenster/Tür, Tiefe bis {t} mm",
             "lang": "Bekleidung der Fenster- bzw. Türlaibungen mit Material der Fassade bzw. Aluminium-Kantteilen, "
                     "Tiefe bis {t} mm, einschließlich Unterkonstruktion, Dämmung und Anschlüssen an Fensterrahmen. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "gen": "B",
             "varianten": [{"t": "250", "h": 0.75, "mat": 32}, {"t": "400", "h": 0.85, "mat": 44}]},
            {"kurz": "Sturzbekleidung mit Lüftungsprofil, Tiefe bis {t} mm",
             "lang": "Sturzbekleidung mit perforiertem Lüftungsprofil bzw. Insektenschutzgitter für die Zuluft bzw. "
                     "Abluft der Hinterlüftung, Tiefe bis {t} mm.",
             "einheit": "m", "gen": "B",
             "varianten": [{"t": "250", "h": 0.80, "mat": 36}, {"t": "400", "h": 0.90, "mat": 48}]},
            {"kurz": "Fensterbank VHF, Alu-Kantteil mit Hinterlüftungsöffnung",
             "lang": "Brüstungsabschluss unter Fenstern als Aluminium-Kantteil, beschichtet, mit Gefälle, Tropfkante "
                     "und Lüftungsquerschnitt für die Hinterlüftung, Ausladung bis 350 mm.",
             "einheit": "m", "h": 0.70, "mat": 46, "gen": "B"},
            {"kurz": "Außen-/Innenecke Bekleidung, Eckprofil bzw. Gehrung",
             "lang": "Ausbildung von Außen- bzw. Innenecken der Bekleidung mit Eckprofil aus Aluminium oder "
                     "Gehrungszuschnitt, einschließlich zusätzlicher Unterkonstruktion.",
             "einheit": "m", "h": 0.45, "mat": 18, "gen": "B"},
            {"kurz": "Oberer Fassadenabschluss / Attikaanschluss mit Lüftungsöffnung",
             "lang": "Oberer Abschluss der Bekleidung unter Attikaabdeckung bzw. Dachüberstand mit Abluftöffnung und "
                     "Insektenschutzgitter.",
             "einheit": "m", "h": 0.40, "mat": 15, "gen": "A"},
            {"kurz": "Durchdringung in der Bekleidung (Leuchte, Rohr, Konsole) ausbilden",
             "lang": "Durchdringung der Fassadenbekleidung für Leuchten, Rohre oder Konsolen mit passgenauem Ausschnitt, "
                     "Manschette bzw. Abdeckrosette und zusätzlicher Unterkonstruktion.",
             "einheit": "St", "h": 1.2, "mat": 25, "gen": "B"},
            {"kurz": "Dehnfuge / Gebäudetrennfuge in VHF ausbilden",
             "lang": "Bewegungsfuge der Fassadenbekleidung über Gebäudetrennfugen mit getrennter Unterkonstruktion und "
                     "hinterlegtem Fugenprofil ausbilden.",
             "einheit": "m", "h": 0.50, "mat": 22, "gen": "B"},
        ]},
        {"name": "Sonstiges", "positionen": [
            {"kurz": "Statischer Nachweis und Montageplanung VHF",
             "lang": "Prüffähige Statik der Unterkonstruktion und Verankerung, Fassadenverlegeplan und Ausführungsdetails "
                     "erstellen und zur Freigabe vorlegen; Dübelauszugsversuche am Bauwerk.",
             "einheit": "psch", "h": 4.0, "geraet": 1800, "gen": "C"},
            {"kurz": "Bestehende Fassadenbekleidung demontieren und entsorgen",
             "lang": "Vorhandene Fassadenbekleidung (ohne Schadstoffe) einschließlich Unterkonstruktion und Dämmung "
                     "demontieren, sortenrein trennen, verladen und entsorgen.",
             "einheit": "m²", "kg": "394", "h": 0.45, "geraet": 9, "gen": "B", "tags": ["altbau"], "lohn": "abbruch"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Runde 2: Ausführungsachsen und weitere Grundpositionen
UG = [{"k": "", "t": "Verankerungsgrund Stahlbeton."},
      {"k": "UG Mauerwerk", "t": "Verankerungsgrund Mauerwerk (Lochstein), Injektionsdübel mit Siebhülse.", "fh": 1.12, "mat": 3},
      {"k": "UG Holzbau", "t": "Befestigung an Holzrahmenbau bzw. Brettsperrholz mit Holzbauschrauben.", "fh": 0.95}]
HOEHE = [{"k": "", "t": ""}, {"k": "Höhe > 8 m", "t": "Gebäudehöhe über 8 m bis Hochhausgrenze, erhöhte Windsoglasten.", "fh": 1.08, "fm": 1.06},
         {"k": "Hochhaus", "t": "Gebäude über Hochhausgrenze, nichtbrennbare Bauprodukte, Montage mit Fassadenbefahranlage bzw. Mastkletterbühne.", "fh": 1.25, "fm": 1.15, "gen": "C"}]
FLAECHE = [{}, {"k": "≤ 20 m²", "t": "Ausführung in Teilflächen bis 20 m² (Gauben, Brüstungen, Treppenhauskerne).", "fh": 1.35, "fm": 1.08}]
ORT = [{}, {"k": "Sanierung", "t": "Ausführung an bestehendem Gebäude: Untergrund mit Unebenheiten bis 3 cm, Bestandsbauteile anpassen.", "fh": 1.18, "gen": "C", "tags": ["altbau"]}]
FARBE = [{}, {"k": "Sonderfarbe/-dekor", "t": "Farbe bzw. Dekor außerhalb der Standardkollektion.", "fm": 1.15}]
FORMAT = [{"k": "", "t": "Plattenformat aus Standardgrößen ohne Sonderzuschnitt."},
          {"k": "Großformat", "t": "Großformatige Platten bis 1,5 × 3,1 m nach Fugenplan.", "fh": 1.12, "fm": 1.05},
          {"k": "Kleinformat/Raster", "t": "Kleinteiliges Fugenraster mit erhöhtem Zuschnittanteil.", "fh": 1.25, "fm": 1.06}]
LAIBMAT = [{"k": "Fassadenmaterial", "t": "Bekleidung aus dem Material der Fassade."},
           {"k": "Alu-Kantteil", "t": "Bekleidung als Aluminium-Kantteil 2 mm, pulverbeschichtet.", "fm": 1.1},
           {"k": "Edelstahl", "t": "Bekleidung als Edelstahl-Kantteil 1,5 mm, geschliffen.", "fm": 1.6, "gen": "C"}]


def _ax(lb, gruppe, prefix, achsen):
    for gr in lb["gruppen"]:
        if gr["name"] == gruppe:
            for p in gr["positionen"]:
                if p["kurz"].startswith(prefix) and "achsen" not in p:
                    p["achsen"] = achsen


L = LBS[0]
_ax(L, "Unterkonstruktion, Dämmung", "Unterkonstruktion Aluminium", [UG, HOEHE, FLAECHE, ORT])
_ax(L, "Unterkonstruktion, Dämmung", "Unterkonstruktion Holz", [UG, FLAECHE, ORT])
_ax(L, "Unterkonstruktion, Dämmung", "Fassadendämmung", [[{}, {"k": "zweilagig", "t": "Zweilagig mit versetzten Stößen.", "fh": 1.3}], FLAECHE, ORT])
_ax(L, "Unterkonstruktion, Dämmung", "Winddichtung", [FLAECHE])
_ax(L, "Unterkonstruktion, Dämmung", "Brandsperre", [[{"k": "", "t": ""}, {"k": "Edelstahl", "t": "Brandsperre aus Edelstahlblech.", "fm": 1.8}], ORT])
_ax(L, "Bekleidungen", "Fassadenbekleidung", [FORMAT, FARBE, HOEHE, FLAECHE, ORT])
# brennbare Bekleidungen nicht am Hochhaus; Bahnenware (Sinuswelle/Trapez) ohne Kleinformat-Raster – Achsen je Variante
for _gr in L["gruppen"]:
    for _p in _gr["positionen"]:
        if _p["kurz"].startswith("Fassadenbekleidung aus"):
            for _v in _p.get("varianten", []):
                if re.search(r"HPL|Holz", _v.get("m", "")):
                    _v["achsen"] = [FORMAT, FARBE, HOEHE[:2], FLAECHE, ORT]
                elif re.search(r"Sinuswelle|Trapez", _v.get("m", "")):
                    _v["achsen"] = [FORMAT[:2], FARBE, HOEHE, FLAECHE, ORT]
_ax(L, "Bekleidungen", "Holz-Rhombusleisten", [[{}, {"k": "vorvergraut", "t": "Werkseitig vorvergraut bzw. lasiert.", "mat": 12}], HOEHE[:2], FLAECHE, ORT])
_ax(L, "Bekleidungen", "Sockelbekleidung", [ORT])
_ax(L, "Öffnungen, Anschlüsse", "Laibungsbekleidung", [LAIBMAT, ORT])
_ax(L, "Öffnungen, Anschlüsse", "Sturzbekleidung", [LAIBMAT, ORT])
_ax(L, "Öffnungen, Anschlüsse", "Fensterbank VHF", [FARBE, ORT])
_ax(L, "Öffnungen, Anschlüsse", "Außen-/Innenecke", [LAIBMAT, ORT])
_ax(L, "Öffnungen, Anschlüsse", "Oberer Fassadenabschluss", [ORT])
_ax(L, "Öffnungen, Anschlüsse", "Durchdringung", [ORT])
_ax(L, "Öffnungen, Anschlüsse", "Dehnfuge", [ORT])

L["gruppen"].append({"name": "Weitere Bekleidungen, Zulagen", "positionen": [
    {"kurz": "Metall-Kassettenfassade {m}, eingehängt",
     "lang": "Fassadenbekleidung aus gekanteten Metallkassetten {m}, auf Systemunterkonstruktion eingehängt, "
             "mit Fugenausbildung 15–20 mm, einschließlich Passkassetten. Abrechnung nach Fläche.",
     "einheit": "m²", "gen": "C", "achsen": [FORMAT, FARBE, HOEHE, ORT],
     "varianten": [{"m": "Aluminium 2 mm, pulverbeschichtet", "h": 1.25, "mat": 140}, {"m": "Aluminium 3 mm, eloxiert", "h": 1.30, "mat": 185},
                   {"m": "Edelstahl 1,2 mm, geschliffen", "h": 1.35, "mat": 260}, {"m": "Cortenstahl 2 mm", "h": 1.35, "mat": 175},
                   {"m": "Titanzink, vorbewittert", "h": 1.40, "mat": 190}, {"m": "Kupfer, vorbewittert", "h": 1.40, "mat": 320}]},
    {"kurz": "Streckmetall/Lochblech-Fassade, {m}, als Prallschale",
     "lang": "Vorgehängte Prallschale aus {m} vor geschlossener Wand bzw. Fensterbändern, auf Rahmen aus "
             "Aluminiumprofilen, einschließlich Konsolen. Abrechnung nach Fläche.",
     "einheit": "m²", "gen": "C", "achsen": [FARBE, HOEHE, ORT],
     "varianten": [{"m": "Aluminium-Streckmetall", "h": 1.1, "mat": 115}, {"m": "Aluminium-Lochblech 3 mm", "h": 1.0, "mat": 98},
                   {"m": "Edelstahl-Drahtgewebe", "h": 1.3, "mat": 180}]},
    {"kurz": "VHF-Bekleidung {m} auf Trägerplatte",
     "lang": "Bekleidung aus {m} auf mineralischer Trägerplatte als VHF-System mit Zulassung, Fugen mit "
             "Fugenmörtel geschlossen, einschließlich Ecken als Winkelstücke.",
     "einheit": "m²", "gen": "C", "achsen": [HOEHE, FLAECHE, ORT],
     "varianten": [{"m": "Klinkerriemchen", "h": 1.6, "mat": 95}, {"m": "Putzträgerplatte mit mineralischem Putzsystem", "h": 1.2, "mat": 55}]},
    {"kurz": "Holzschalung {s}, {m}",
     "lang": "Holzfassade als {s} aus {m}, Brettdicke 21–24 mm, mit Edelstahlschrauben auf Lattung, "
             "Insektenschutz an Zu- und Abluftöffnungen.",
     "einheit": "m²", "gen": "B", "lohn": "zimmerer",
     "achsen": [[{}, {"k": "vorvergraut", "t": "Werkseitig vorvergraut bzw. deckend beschichtet.", "mat": 14}], [{}, {"k": "Brandschutz B-s1", "t": "Schwerentflammbar imprägniert (B-s1,d0).", "mat": 18}], FLAECHE, ORT],
     "varianten": [{"s": s, "m": m, "h": hh, "mat": mm} for s, hh in (("Stülpschalung", 0.95), ("Boden-Deckel-Schalung", 1.0), ("Nut-und-Feder-Schalung", 0.9),
                                                                         ("Leistenschalung offen", 1.15)) for m, mm in (("Fichte/Tanne", 34), ("Lärche", 48), ("Douglasie", 44))]},
    {"kurz": "Zulage Bogen/Rundung in VHF-Bekleidung, Radius ≥ {r} m",
     "lang": "Zulage für gebogene Fassadenflächen: Unterkonstruktion und Bekleidung segmentiert bzw. gebogen, "
             "Radius mindestens {r} m. Abrechnung nach gebogener Fläche.",
     "einheit": "m²", "gen": "C",
     "varianten": [{"r": "5", "h": 0.6, "mat": 25}, {"r": "2", "h": 1.1, "mat": 55}]},
    {"kurz": "Absturzsicherung/Geländer an VHF-Brüstung, Konsole durch Bekleidung",
     "lang": "Ausbildung der Befestigungskonsolen für Geländer bzw. Absturzsicherungen durch die VHF: thermisch "
             "getrennte Konsole an Rohbau, Durchführung durch Bekleidung mit Abdeckrosette.",
     "einheit": "St", "h": 1.5, "mat": 85, "gen": "B", "achsen": [ORT]},
    {"kurz": "Montage Fassadenschild / Hausnummer / Leuchte auf VHF",
     "lang": "Befestigung bauseitiger Ausstattung (Schild, Hausnummer, Außenleuchte) an der Unterkonstruktion "
             "mit Hinterlegung, Kabeldurchführung abgedichtet.",
     "einheit": "St", "h": 0.8, "mat": 12, "gen": "A"},
    {"kurz": "Fassadenbekleidung reinigen / Graffitischutz, {r}",
     "lang": "Reinigung der Fassadenbekleidung: {r}. Abrechnung nach Fläche; Hubarbeitsbühne gesondert.",
     "einheit": "m²", "gen": "B", "lohn": "reinigung", "tags": ["altbau"],
     "varianten": [{"r": "Endreinigung nach Fertigstellung", "h": 0.08, "mat": 0.3}, {"r": "Unterhaltsreinigung mit Neutralreiniger", "h": 0.12, "mat": 0.5},
                   {"r": "Graffitientfernung und Schutzbeschichtung", "h": 0.45, "mat": 9, "geraet": 3}]},
    {"kurz": "Einzelne Fassadenplatte austauschen, bis {a} m²",
     "lang": "Beschädigte Fassadenplatte demontieren und durch neue Platte gleicher Art ersetzen (Material nach "
             "Bemusterung bzw. vom Bestand), einschließlich Befestigungsmittel.",
     "einheit": "St", "gen": "C", "tags": ["altbau"],
     "varianten": [{"a": "0,5", "h": 1.2, "mat": 55}, {"a": "1,5", "h": 2.0, "mat": 140}, {"a": "3,0", "h": 3.0, "mat": 260}]},
    {"kurz": "Tropfblech/Fugenprofil horizontal, Alu",
     "lang": "Horizontales Fugen- bzw. Tropfprofil aus Aluminium zwischen Plattenreihen, mit Wasserabführung.",
     "einheit": "m", "h": 0.18, "mat": 9, "gen": "A", "achsen": [FARBE, ORT]},
]})
