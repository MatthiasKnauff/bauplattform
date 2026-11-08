# Bauteilvorlagen KG 330 Außenwände / vertikale Baukonstruktionen, außen (331–339) – eigene Aufbauten aus der Positionsdatenbank.
# Faktor = Menge der Position je Einheit des Bauteils.
# Annahmen: Geschosshöhe 2,75 m → Kimmschicht/Sperrschicht 0,36 m je m² Wand.
# Fenster je m²: Anschlussfuge ≈ 3,0 m/m², Fensterbank ≈ 0,7 m/m², Leibung (2 Seiten + Sturz) ≈ 2,0 m/m², Fensterbankanschluss WDVS 0,55 St/m².
# 331.01 steht in kg_331_beispiel.py – hier beginnt 331 bei 331.02.

KIMM = {11.5: "012.01.001.01001", 17.5: "012.01.001.02001", 24: "012.01.001.03001", 30: "012.01.001.04001",
        36.5: "012.01.001.05001", 42.5: "012.01.001.06001"}


def ohne(t="ohne (gesondert erfasst)", std=False):
    o = {"k": "", "t": t, "teile": []}
    if std:
        o["std"] = True
    return o


def opt(k, t, teile, std=False):
    o = {"k": k, "t": t, "teile": teile}
    if std:
        o["std"] = True
    return o


# ---------------------------------------------------------------- gemeinsame Schichten
INNEN_MW = [   # Innenseite massiver Außenwände (Putz + Anstrich)
    opt("Gipsputz", "Gipsputz 10 mm Q2, Dispersionsanstrich", [["023.02.001.01001", 1.0], ["034.02.001.01001", 1.0]], True),
    opt("KZ-Putz", "Kalkzementputz 15 mm, Dispersionsanstrich", [["023.02.001.04001", 1.0], ["034.02.001.01001", 1.0]], True),
    opt("Kalkputz, Silikat", "Kalkputz 15 mm, Silikatanstrich", [["023.02.001.05001", 1.0], ["034.02.002.01001", 1.0]]),
    opt("Lehmputz", "Lehmputz zweilagig 20 mm, Lehmfarbe", [["023.02.001.06001", 1.0], ["034.02.007.03001", 1.0]]),
    ohne("ohne Innenbekleidung (gesondert erfasst)"),
]

INNEN_BETON = [   # Innenseite Stahlbetonwände
    opt("Dünnputz", "Dünnlagenputz 3–5 mm, Dispersionsanstrich", [["023.02.003.01001", 1.0], ["034.02.001.01001", 1.0]], True),
    opt("Gipsputz", "Haftbrücke, Gipsputz 10 mm, Dispersionsanstrich", [["023.01.001.02001", 1.0], ["023.02.001.01001", 1.0], ["034.02.001.01001", 1.0]], True),
    opt("Anstrich", "Betonfläche direkt zweimal gestrichen", [["034.02.004.01001", 1.0]]),
    ohne("ohne Innenbekleidung (gesondert erfasst)"),
]

AUSSENPUTZ = [
    opt("LP + Scheibenputz", "Leichtunterputz mit mineralischem Scheibenputz", [["023.03.001.01001", 1.0]], True),
    opt("LP + Silikonharz", "Leichtunterputz mit Silikonharzputz", [["023.03.001.02001", 1.0]], True),
    opt("LP + Kratzputz", "Leichtunterputz mit Kratzputz", [["023.03.001.03001", 1.0]], True),
    opt("KZ + Kalkscheibe", "Kalkzementputz zweilagig mit Kalk-Scheibenputz 3 mm", [["023.03.005.01001", 1.0]], True),
    opt("KZ + Kellenwurf", "Kalkzementputz zweilagig mit Kellenwurfputz", [["023.03.005.02001", 1.0]]),
    opt("KZ + Filzputz", "Kalkzementputz zweilagig mit Filzputz fein", [["023.03.005.03001", 1.0]]),
]

WDVS = [
    opt("WDVS EPS 12", "WDVS EPS 032, 12 cm, Silikonharzputz", [["023.04.001.01001", 1.0], ["023.04.004.01001", 0.36]]),
    opt("WDVS EPS 16", "WDVS EPS 032, 16 cm, mit Brandriegeln", [["023.04.001.03001", 1.0], ["023.04.004.01001", 0.36]], True),
    opt("WDVS EPS 20", "WDVS EPS 032, 20 cm, mit Brandriegeln", [["023.04.001.05001", 1.0], ["023.04.004.01001", 0.36]], True),
    opt("WDVS MW 16", "WDVS Mineralwolle 035, 16 cm, nichtbrennbar", [["023.04.002.02001", 1.0]], True),
    opt("WDVS MW 20", "WDVS Mineralwolle 035, 20 cm, nichtbrennbar", [["023.04.002.03001", 1.0]]),
    opt("WDVS HF 16", "WDVS Holzfaser auf Massivwand, 16 cm", [["023.04.014.02001", 1.0]]),
    opt("WDVS PIR 12", "WDVS Resol/PIR 022, 12 cm", [["023.04.013.02001", 1.0]]),
]

UK_DAEMM = [   # VHF: Unterkonstruktion + Dämmung
    opt("UK Alu + MW 12", "Alu-Unterkonstruktion bis 160 mm, Mineralwolle 035 120 mm", [["038.01.001.01001", 1.0], ["038.01.003.01001", 1.0]]),
    opt("UK Alu + MW 16", "Alu-Unterkonstruktion bis 220 mm, Mineralwolle 035 160 mm", [["038.01.001.02001", 1.0], ["038.01.003.02001", 1.0]], True),
    opt("UK Alu + MW 20", "Alu-Unterkonstruktion bis 220 mm, Mineralwolle 032 200 mm", [["038.01.001.02001", 1.0], ["038.01.003.03001", 1.0]], True),
    opt("UK Alu + MW 24", "Alu-Unterkonstruktion bis 300 mm, Mineralwolle 032 240 mm", [["038.01.001.03001", 1.0], ["038.01.003.04001", 1.0]], True),
    opt("UK Holz + MW 12", "Holz-Trag-/Konterlattung, Mineralwolle 035 120 mm", [["038.01.002.01001", 1.0], ["038.01.003.01001", 1.0]]),
]

VHF_MINERAL = [
    opt("Faserzement", "Faserzementtafeln 8 mm, durchgefärbt, sichtbar genietet", [["038.02.001.01001", 1.0]], True),
    opt("Faserzement besch.", "Faserzementtafeln 8 mm, beschichtet", [["038.02.001.02001", 1.0]]),
    opt("FZ-Schindel", "Faserzement-Fassadenschindeln, Stülpdeckung", [["038.02.001.03001", 1.0]]),
    opt("HPL", "HPL-Kompaktplatten 8 mm, Dekor nach Wahl", [["038.02.001.04001", 1.0]], True),
    opt("Keramik", "Keramische Fassadenplatten / Feinsteinzeug", [["038.02.001.05001", 1.0]], True),
    opt("Glasplatten", "Glasfassadenplatten (Emailit)", [["038.02.001.09001", 1.0]]),
    opt("Riemchen VHF", "Klinkerriemchen auf mineralischer Trägerplatte", [["038.05.003.01001", 1.0]], True),
    opt("Putzträger VHF", "Putzträgerplatte mit mineralischem Putzsystem", [["038.05.003.02001", 1.0]], True),
    opt("Alu-Verbund", "Aluminium-Verbundplatten als Kassetten 4 mm", [["038.02.001.07001", 1.0]]),
]

VHF_FEST = [["038.01.005.01001", 0.36], ["038.03.004.01001", 0.1], ["038.03.005.01001", 0.1]]   # Brandsperre je Geschoss, Ecken, oberer Abschluss

FB_AUSSEN_M2 = [
    opt("FBa Alu", "Außenfensterbank Alu pulverbeschichtet, Ausladung bis 200 mm", [["022.03.001.03001", 0.7]], True),
    opt("FBa Alu WDVS", "Alu-Fensterbank für WDVS bis 400 mm mit Bordprofil und Abdichtung", [["022.03.001.05001", 0.7], ["023.04.007.01001", 0.55]], True),
    opt("FBa Granit", "Außenfensterbank Granit 3 cm, geflammt", [["014.01.002.01001", 0.7]]),
    opt("FBa Titanzink", "Fensterbank Titanzink gekantet", [["022.03.006.01001", 0.7]]),
    ohne("ohne Außenfensterbank"),
]
FB_INNEN_M2 = [
    opt("FBi Holzwerkst.", "Innenfensterbank Holzwerkstoff beschichtet, bis 250 mm", [["027.03.001.01001", 0.7]], True),
    opt("FBi Agglo", "Innenfensterbank Quarzkomposit 2 cm, bis 250 mm", [["014.01.001.05001", 0.7]], True),
    opt("FBi Granit", "Innenfensterbank Granit 2 cm, bis 250 mm", [["014.01.001.01001", 0.7]]),
    opt("FBi Eiche", "Innenfensterbank Massivholz Eiche, bis 250 mm", [["027.03.001.04001", 0.7]]),
    opt("FBi Gipsfaser", "Fertigteil-Fensterbank Gipsfaser", [["039.06.002.01001", 0.7]]),
    opt("FBi Fliese", "Fensterbank gefliest, bis 250 mm", [["024.02.010.01001", 0.7]]),
    ohne("ohne Innenfensterbank"),
]
LEIBUNG_M2 = [
    opt("Leibung geputzt", "Leibungen innen und außen geputzt", [["023.02.004.01001", 2.0], ["023.03.002.01001", 2.0]], True),
    opt("Leibung WDVS", "Leibung innen geputzt, außen WDVS-Leibungsdämmung 3 cm", [["023.02.004.01001", 2.0], ["023.04.006.01001", 2.0]]),
    ohne("Leibungen gesondert erfasst"),
]
ANSCHLUSS_M2 = [
    opt("RAL-Montage", "Anschlussabdichtung innen/außen mit Folienband (RAL)", [["026.05.001.01001", 3.0]], True),
    opt("Vorwandmontage", "Vorwandmontage in der Dämmebene mit Montagesystem und Folienband", [["026.05.002.01001", 3.0], ["026.05.001.01001", 3.0]], True),
    opt("Aufdopplung 30", "RAL-Anschluss mit Rahmenverbreiterung bis 30 mm", [["026.05.001.01001", 3.0], ["026.02.013.01001", 0.7]]),
]
ZULAGE_FENSTER_M2 = [
    ohne("ohne Zulage", std=True),
    opt("Schall 38 dB", "Schallschutzverglasung Rw ≥ 38 dB", [["026.02.002.01001", 1.0]]),
    opt("Schall 42 dB", "Schallschutzverglasung Rw ≥ 42 dB", [["026.02.002.02001", 1.0]]),
    opt("RC2", "Sicherheitsbeschlag RC2 mit P4A-Glas", [["026.02.001.01001", 0.55]]),
    opt("Sonnenschutzglas", "Sonnenschutzglas g ≤ 0,35", [["026.02.009.01001", 0.8]]),
    opt("Sprossen", "Sprossen im Scheibenzwischenraum", [["026.02.003.01001", 0.55]]),
    opt("Fensterlüfter", "Falzlüfter für Lüftungskonzept", [["026.02.005.01001", 0.3]]),
]


def fenster_m2(vid, name, lang, fenster, tags):
    return {"id": vid, "kg": "334", "name": name, "einheit": "m²", "lang": lang,
            "bezug": "Fensterfläche Rahmenaußenmaß (Rohbauöffnung abzgl. Fugen), nach Fensterliste",
            "schichten": [
                {"name": "Fenster", "optionen": fenster},
                {"name": "Einbau", "optionen": ANSCHLUSS_M2},
                {"name": "Fensterbank außen", "optionen": FB_AUSSEN_M2},
                {"name": "Fensterbank innen", "optionen": FB_INNEN_M2},
                {"name": "Leibungen", "optionen": LEIBUNG_M2},
                {"name": "Zulage", "optionen": ZULAGE_FENSTER_M2},
            ], "tags": tags}


def fenster_st(vid, name, mass, a, umfang, b, leib, codes):
    """Fenster je Stück einer typischen Größe: a = Fläche m², umfang = Anschlussfuge m, b = Breite m, leib = Leibungslänge m."""
    ku, ku8, holz, ha, alu = codes
    return {"id": vid, "kg": "334", "name": name, "einheit": "St",
            "lang": f"Fenster {mass} (ca. {str(a).replace('.', ',')} m²) komplett mit Einbau, Anschlussabdichtung, Fensterbänken und "
                    "Leibungsputz. Rollläden und Sonnenschutz gesondert unter KG 338.",
            "bezug": "Anzahl der Fenster dieser Größe nach Fensterliste",
            "schichten": [
                {"name": "Fenster", "optionen": [
                    opt("Kunststoff", "Kunststofffenster Dreh-Kipp, 3-fach, Uw 0,95, weiß", [[ku, a]], True),
                    opt("Kunststoff Uw 0,8", "Kunststofffenster Dreh-Kipp, 3-fach, Uw 0,80, weiß", [[ku8, a]], True),
                    opt("Holz", "Holzfenster Dreh-Kipp, Uw 0,95, deckend weiß", [[holz, a]], True),
                    opt("Holz-Alu", "Holz-Aluminium-Fenster Dreh-Kipp, Uw 0,85", [[ha, a]], True),
                    opt("Aluminium", "Aluminiumfenster Dreh-Kipp, Uw 1,0", [[alu, a]]),
                    opt("Kunststoff RAL", "Kunststofffenster Uw 0,95, Sonderfarbe RAL", [[ku, a], ["026.02.008.01001", 1.0]]),
                ]},
                {"name": "Einbau", "optionen": [
                    opt("RAL-Montage", "Anschlussabdichtung innen/außen mit Folienband (RAL)", [["026.05.001.01001", umfang]], True),
                    opt("Vorwandmontage", "Vorwandmontage in der Dämmebene mit Folienband", [["026.05.002.01001", umfang], ["026.05.001.01001", umfang]], True),
                ]},
                {"name": "Fensterbank außen", "optionen": [
                    opt("FBa Alu", "Alu-Fensterbank pulverbeschichtet bis 200 mm", [["022.03.001.03001", b], ["022.03.002.01001", 1.0]], True),
                    opt("FBa Alu WDVS", "Alu-Fensterbank für WDVS bis 400 mm mit Bordprofil", [["022.03.001.05001", b], ["023.04.007.01001", 1.0]], True),
                    opt("FBa Granit", "Außenfensterbank Granit 3 cm", [["014.01.002.01001", b]]),
                    ohne("ohne Außenfensterbank"),
                ]},
                {"name": "Fensterbank innen", "optionen": [
                    opt("FBi Holzwerkst.", "Innenfensterbank Holzwerkstoff bis 250 mm", [["027.03.001.01001", b]], True),
                    opt("FBi Agglo", "Innenfensterbank Quarzkomposit bis 250 mm", [["014.01.001.05001", b]], True),
                    opt("FBi Granit", "Innenfensterbank Granit bis 250 mm", [["014.01.001.01001", b]]),
                    opt("FBi Eiche", "Innenfensterbank Eiche massiv bis 250 mm", [["027.03.001.04001", b]]),
                    ohne("ohne Innenfensterbank"),
                ]},
                {"name": "Leibungen", "optionen": [
                    opt("Leibung geputzt", "Leibungen innen und außen geputzt", [["023.02.004.01001", leib], ["023.03.002.01001", leib]], True),
                    opt("Leibung WDVS", "Leibung innen geputzt, außen WDVS-Leibungsdämmung", [["023.02.004.01001", leib], ["023.04.006.01001", leib]]),
                    ohne("Leibungen gesondert erfasst"),
                ]},
                {"name": "Zulage", "optionen": [
                    ohne("ohne Zulage", std=True),
                    opt("Schall 38 dB", "Schallschutzverglasung Rw ≥ 38 dB", [["026.02.002.01001", a]]),
                    opt("RC2", "Sicherheitsbeschlag RC2 mit P4A-Glas", [["026.02.001.01001", 1.0]]),
                    opt("Griff abschließbar", "abschließbarer Fenstergriff", [["026.02.006.01001", 1.0]]),
                    opt("Öffnungsüberw.", "Öffnungsüberwachung Magnet-/Riegelkontakt", [["026.02.007.01001", 1.0]]),
                ]},
            ], "tags": ["neubau"]}


def rollladen(vid, groesse, i):
    """Rollladen je Stück, Größenstufe i (1 = bis 1,5 m² … 4 = bis 6 m²)."""
    s = f"0{i}001"
    return {"id": vid, "kg": "338", "name": f"Rollladen, Fläche bis {groesse} m²", "einheit": "St",
            "lang": f"Außenliegender Rollladen für ein Fenster bzw. eine Fenstertür bis {groesse} m² mit Führungsschienen und Endleiste, "
                    "Bauart und Antrieb nach Wahl. Elektrozuleitung bis Taster gesondert unter KG 440.",
            "bezug": "Anzahl der Elemente nach Fensterliste",
            "schichten": [
                {"name": "Rollladen", "optionen": [
                    opt("PVC-Panzer", "Kunststoffpanzer in bauseitigem Sturz-/Rollladenkasten", [[f"030.01.002.{s}", 1.0]], True),
                    opt("Alu-Panzer", "Alu-Panzer ausgeschäumt in bauseitigem Kasten", [[f"030.01.001.{s}", 1.0]], True),
                    opt("Vorbau Alu", "Vorbaurollladen Aluminium mit Blendkasten", [[f"030.01.003.{s}", 1.0]], True),
                    opt("Aufsatzkasten", "Aufsatzrollladenkasten gedämmt, Alu-Panzer", [[f"030.01.004.{s}", 1.0]], True),
                    opt("Einbau UP", "Einbau-Rollladenkasten Unterputz", [[f"030.01.005.{s}", 1.0]], True),
                    opt("RC2 mit Motor", "Sicherheitsrollladen RC2 mit Motor", [[f"030.01.006.{s}", 1.0]]),
                ]},
                {"name": "Antrieb", "optionen": [
                    ohne("Gurtwickler (im Preis)", std=True),
                    opt("Motor + Taster", "Rohrmotor mit Wandtaster und Anschluss", [["030.01.008.01001", 1.0], ["053.04.006.01001", 1.0]], True),
                    opt("Motor + Funk", "Funk-Rohrmotor mit Handsender", [["030.01.008.01001", 1.0], ["030.04.004.01001", 1.0]], True),
                ]},
                {"name": "Insektenschutz", "optionen": [
                    ohne("ohne Insektenschutz", std=True),
                    opt("Insektenrollo", "Insektenschutzrollo", [["030.04.001.06001", 1.0]]),
                    opt("Spannrahmen", "Insektenschutz-Spannrahmen bis 2 m²", [["030.04.001.02001", 1.0]]),
                ]},
            ], "tags": ["neubau", "altbau"]}


def raffstore(vid, groesse, i, breite):
    s, z = f"0{i}001", f"0{i + 4}001"
    return {"id": vid, "kg": "338", "name": f"Raffstore, Fläche bis {groesse} m²", "einheit": "St",
            "lang": f"Außenliegender Raffstore aus Aluminiumlamellen für ein Element bis {groesse} m², Rohrmotor mit Wandtaster, "
                    "Seil- bzw. Schienenführung. Sturzkasten bzw. Blende nach Wahl.",
            "bezug": "Anzahl der Elemente nach Fensterliste",
            "schichten": [
                {"name": "Raffstore", "optionen": [
                    opt("C-Lamelle 80", "Raffstore C-Form 80 mm gebördelt, Motor", [[f"030.02.001.{s}", 1.0]], True),
                    opt("Z-Lamelle 90", "Raffstore Z-Form 90 mm mit Dichtung, Motor", [[f"030.02.001.{z}", 1.0]], True),
                    opt("Vorbau C80", "Vorbau-Raffstore mit Kasten, C-Form 80 mm", [[f"030.02.002.{s}", 1.0]], True),
                    opt("Lichtlenkung", "Lichtlenk-Raffstore zur Tageslichtnutzung", [[f"030.02.004.{s}", 1.0]], True),
                ]},
                {"name": "Blende", "optionen": [
                    ohne("ohne Blende (Sturzkasten bauseits)", std=True),
                    opt("Alu-Blende", "Raffstore-Blende Aluminium", [["030.02.003.01001", breite]], True),
                ]},
                {"name": "Steuerung", "optionen": [
                    ohne("Wandtaster (im Preis)", std=True),
                    opt("Funk", "Funk-Handsender 1-Kanal zusätzlich", [["030.04.004.01001", 1.0]], True),
                    opt("KNX", "anteiliger KNX-Jalousieaktor", [["070.01.003.01001", 0.25]]),
                ]},
            ], "tags": ["neubau", "altbau"]}


VORLAGEN = [
    # ================================================================ 331 Tragende Außenwände
    {"id": "331.02", "kg": "331", "name": "AW monolithisch, verputzt", "einheit": "m²",
     "lang": "Tragende Außenwand aus wärmedämmendem Mauerwerk ohne Zusatzdämmung, außen mineralisch verputzt, innen geputzt und "
             "gestrichen, einschließlich Kimmschicht. Öffnungen und Stürze gesondert unter KG 334.",
     "bezug": "Wandfläche (Außenmaß × Geschosshöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             opt("Hlz 36,5", "Planziegel wärmedämmend d = 36,5 cm, λ = 0,08", [["012.02.001.01001", 1.0], [KIMM[36.5], 0.36]], True),
             opt("Hlz 42,5", "Planziegel wärmedämmend d = 42,5 cm, λ = 0,07", [["012.02.001.02001", 1.0], [KIMM[42.5], 0.36]], True),
             opt("Hlz 49", "Planziegel wärmedämmend d = 49 cm, λ = 0,07", [["012.02.001.03001", 1.0], [KIMM[42.5], 0.36]]),
             opt("PP2 36,5", "Porenbeton-Plansteine PP2-0,35 d = 36,5 cm", [["012.02.003.01001", 1.0], [KIMM[36.5], 0.36]], True),
             opt("PP2 42,5", "Porenbeton-Plansteine PP2-0,35 d = 42,5 cm", [["012.02.003.02001", 1.0], [KIMM[42.5], 0.36]], True),
             opt("Hbl 36,5", "Leichtbeton-Hohlblocksteine Hbl 4 d = 36,5 cm", [["012.05.003.03001", 1.0], [KIMM[36.5], 0.36]]),
         ]},
         {"name": "Außenputz", "optionen": AUSSENPUTZ[:3] + [dict(AUSSENPUTZ[3], std=False)] + AUSSENPUTZ[4:]},
         {"name": "Innenseite", "optionen": INNEN_MW},
     ], "tags": ["neubau"]},

    {"id": "331.03", "kg": "331", "name": "AW zweischalig, Kerndämmung, Klinker", "einheit": "m²",
     "lang": "Zweischalige tragende Außenwand: Innenschale Mauerwerk, Kerndämmung Mineralwolle, Vormauerschale aus Klinker mit "
             "Drahtankern und Fußpunktausbildung, innen geputzt. Öffnungen, Abfangungen und Stürze gesondert.",
     "bezug": "Wandfläche (Außenmaß × Geschosshöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Innenschale", "optionen": [
             opt("KS 17,5", "Kalksand-Plansteine d = 17,5 cm", [["012.02.004.01001", 1.0], [KIMM[17.5], 0.36]], True),
             opt("KS 24", "Kalksand-Plansteine d = 24 cm", [["012.02.004.02001", 1.0], [KIMM[24], 0.36]], True),
             opt("Hlz 24", "Planziegel ungefüllt d = 24 cm", [["012.02.002.01001", 1.0], [KIMM[24], 0.36]]),
             opt("PP4 24", "Porenbeton-Plansteine PP4 d = 24 cm", [["012.02.003.03001", 1.0], [KIMM[24], 0.36]]),
         ]},
         {"name": "Kerndämmung", "optionen": [
             opt("KD MW 12", "Kerndämmung Mineralwolle 035, 12 cm", [["012.02.007.01001", 1.0]]),
             opt("KD MW 14", "Kerndämmung Mineralwolle 035, 14 cm", [["012.02.007.02001", 1.0]], True),
             opt("KD MW 16", "Kerndämmung Mineralwolle 035, 16 cm", [["012.02.007.03001", 1.0]], True),
             opt("KD MW 20", "Kerndämmung Mineralwolle 035, 20 cm", [["012.02.007.04001", 1.0]], True),
         ]},
         {"name": "Vormauerschale", "optionen": [
             opt("Klinker NF", "Klinker NF, Halbsteinverband, Fugenglattstrich", [["012.02.006.01001", 1.0], ["012.01.002.01001", 0.36]], True),
             opt("Klinker DF", "Klinker DF, Halbsteinverband, Fugenglattstrich", [["012.02.006.02001", 1.0], ["012.01.002.01001", 0.36]]),
             opt("Klinker WDF", "Klinker WDF, Halbsteinverband, Fugenglattstrich", [["012.02.006.03001", 1.0], ["012.01.002.01001", 0.36]], True),
         ]},
         {"name": "Innenseite", "optionen": INNEN_MW},
     ], "tags": ["neubau"]},

    {"id": "331.04", "kg": "331", "name": "AW Stahlbeton + WDVS", "einheit": "m²",
     "lang": "Tragende Außenwand aus Ortbeton (Schalung, Bewehrung, Beton als Komplettleistung) mit Wärmedämmverbundsystem, "
             "innen geputzt bzw. gespachtelt und gestrichen.",
     "bezug": "Wandfläche (Außenmaß × Geschosshöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             opt("StB 18", "Stahlbetonwand C25/30 d = 18 cm, komplett", [["013.09.002.01001", 1.0]], True),
             opt("StB 20", "Stahlbetonwand C25/30 d = 20 cm, komplett", [["013.09.002.02001", 1.0]], True),
             opt("StB 24", "Stahlbetonwand C25/30 d = 24 cm, komplett", [["013.09.002.03001", 1.0]], True),
             opt("StB 25 WU", "Stahlbetonwand C30/37 WU d = 25 cm, komplett", [["013.09.002.04001", 1.0]]),
         ]},
         {"name": "Wärmedämmung außen", "optionen": WDVS},
         {"name": "Innenseite", "optionen": INNEN_BETON},
     ], "tags": ["neubau"]},

    {"id": "331.05", "kg": "331", "name": "AW Stahlbeton + VHF", "einheit": "m²",
     "lang": "Tragende Stahlbeton-Außenwand mit vorgehängter hinterlüfteter Fassade: Unterkonstruktion, Mineralwolledämmung, "
             "Bekleidung, Brandsperren und Anschlussprofile; innen geputzt bzw. gespachtelt und gestrichen.",
     "bezug": "Wandfläche (Außenmaß × Geschosshöhe), Öffnungen über 2,5 m² abgezogen",
     "fest": VHF_FEST,
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             opt("StB 20", "Stahlbetonwand C25/30 d = 20 cm, komplett", [["013.09.002.02001", 1.0]], True),
             opt("StB 24", "Stahlbetonwand C25/30 d = 24 cm, komplett", [["013.09.002.03001", 1.0]], True),
             opt("StB 18", "Stahlbetonwand C25/30 d = 18 cm, komplett", [["013.09.002.01001", 1.0]]),
         ]},
         {"name": "Unterkonstruktion + Dämmung", "optionen": [dict(o, std=o["k"] in ("UK Alu + MW 16", "UK Alu + MW 20")) for o in UK_DAEMM]},
         {"name": "Bekleidung", "optionen": [dict(o, std=o["k"] in ("Faserzement", "HPL", "Keramik")) for o in VHF_MINERAL]
                                            + [opt("Lärche Stülp", "Stülpschalung Lärche", [["038.05.004.02001", 1.0]]),
                                               opt("Alu-Kassette", "Alu-Kassetten 2 mm pulverbeschichtet", [["038.05.001.01001", 1.0]])]},
         {"name": "Innenseite", "optionen": [dict(o, std=o["k"] == "Dünnputz") for o in INNEN_BETON]},
     ], "tags": ["neubau"]},

    {"id": "331.06", "kg": "331", "name": "AW Sichtbeton mit Innendämmung", "einheit": "m²",
     "lang": "Tragende Außenwand aus Ortbeton C30/37 mit Sichtbetonfläche außen (Schalung, Bewehrung ca. 50 kg/m³ und Beton "
             "einzeln erfasst), Oberflächenschutz außen und Innendämmung.",
     "bezug": "Wandfläche (Außenmaß × Geschosshöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Beton + Bewehrung", "optionen": [
             opt("StB 20", "Beton C30/37 d = 20 cm, Betonstahl 50 kg/m³", [["013.03.001.12001", 0.20], ["013.06.001.03001", 0.010]], True),
             opt("StB 25", "Beton C30/37 d = 25 cm, Betonstahl 50 kg/m³", [["013.03.001.13001", 0.25], ["013.06.001.03001", 0.0125]], True),
             opt("StB 30", "Beton C30/37 d = 30 cm, Betonstahl 50 kg/m³", [["013.03.001.14001", 0.30], ["013.06.001.03001", 0.015]]),
         ]},
         {"name": "Schalung", "optionen": [
             opt("SB 2 außen", "Systemschalung außen Sichtbeton SB 2, innen ohne Anforderung", [["013.05.001.03001", 1.0], ["013.05.001.02001", 1.0]], True),
             opt("SB 3 außen", "Systemschalung außen Sichtbeton SB 3, innen ohne Anforderung", [["013.05.001.04001", 1.0], ["013.05.001.02001", 1.0]], True),
             opt("SB 2 beidseitig", "Systemschalung beidseitig Sichtbeton SB 2", [["013.05.001.03001", 2.0]]),
         ]},
         {"name": "Oberfläche außen", "optionen": [
             opt("Hydrophobierung", "Hydrophobierung der Sichtbetonfläche", [["034.04.013.01001", 1.0]], True),
             opt("Betonlasur", "Betonlasur / Betonkosmetik", [["034.04.006.01001", 1.0]], True),
             opt("Graffitischutz", "permanenter Graffitischutz", [["034.04.009.01001", 1.0]]),
             ohne("ohne Oberflächenbehandlung"),
         ]},
         {"name": "Innendämmung", "optionen": [
             opt("ID Gips-EPS 60", "Verbundplatte Gips/EPS 60 mm, Dispersionsanstrich", [["039.03.006.01001", 1.0], ["034.02.001.01001", 1.0]], True),
             opt("ID CaSi 50", "Calciumsilikat 50 mm kapillaraktiv, Silikatanstrich", [["039.03.006.02001", 1.0], ["034.02.002.01001", 1.0]], True),
             opt("VSS + MW 100", "Vorsatzschale CW 50 mit MW 100 mm, Dampfbremse, Anstrich",
                 [["039.03.001.01001", 1.0], ["039.04.002.02001", 1.0], ["016.03.005.01001", 1.0], ["034.02.001.01001", 1.0]]),
             ohne("ohne Innendämmung (unbeheizt)"),
         ]},
     ], "tags": ["neubau"]},

    {"id": "331.07", "kg": "331", "name": "AW Holzrahmenbau", "einheit": "m²",
     "lang": "Tragende Außenwand in Holzrahmenbauweise (vorgefertigt, Gefachdämmung, OSB innen, Holzfaserplatte außen) mit "
             "Fassade nach Wahl und innerer Bekleidung.",
     "bezug": "Wandfläche (Außenmaß × Geschosshöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Tragkonstruktion", "optionen": [
             opt("HRB 160", "Holzrahmenwand Ständer 60/160 mm, gedämmt", [["016.04.001.01001", 1.0]], True),
             opt("HRB 200", "Holzrahmenwand Ständer 60/200 mm, gedämmt", [["016.04.001.02001", 1.0]], True),
             opt("HRB 240", "Holzrahmenwand Ständer 60/240 mm, gedämmt", [["016.04.001.03001", 1.0]], True),
         ]},
         {"name": "Fassade", "optionen": [
             opt("Putz auf HF", "Putzsystem auf Holzfaserplatte 60 mm", [["023.03.001.02001", 1.0]], True),
             opt("HF 100 + Putz", "Holzfaser-Putzträger 100 mm statt 60 mm, Putzsystem", [["016.04.005.01001", 1.0], ["023.03.001.02001", 1.0]]),
             opt("WDVS HF 10", "zusätzliches WDVS Holzfaser 10 cm", [["023.04.003.02001", 1.0]]),
             opt("Lärche VHF", "Lattung, Fassadenbahn, Lärchenschalung sägerau",
                 [["038.01.002.01001", 1.0], ["016.02.008.01001", 1.0], ["016.04.004.01001", 1.0]], True),
             opt("Douglasie Rhombus", "Lattung, Fassadenbahn, Rhombusschalung Douglasie",
                 [["038.01.002.01001", 1.0], ["016.02.008.01001", 1.0], ["016.04.004.02001", 1.0]]),
             opt("Faserzement VHF", "Lattung, Fassadenbahn, Faserzementtafeln",
                 [["038.01.002.01001", 1.0], ["038.01.004.01001", 1.0], ["038.02.001.01001", 1.0]], True),
         ]},
         {"name": "Innenseite", "optionen": [
             opt("Inst.-Ebene + GK", "Installationsebene 40 mm, GKB 12,5 mm, Anstrich",
                 [["016.04.003.01001", 1.0], ["039.03.001.03001", 1.0], ["034.02.001.01001", 1.0]], True),
             opt("GK direkt", "GKB 12,5 mm direkt, Anstrich", [["039.03.001.03001", 1.0], ["034.02.001.01001", 1.0]], True),
             opt("OSB sichtbar", "OSB sichtbar, farblos lasiert", [["034.02.014.01001", 1.0]]),
             ohne("ohne Innenbekleidung"),
         ]},
     ], "tags": ["neubau"]},

    {"id": "331.08", "kg": "331", "name": "Kellerwand Mauerwerk, abgedichtet", "einheit": "m²",
     "lang": "Erdberührte Kelleraußenwand aus Kalksand-Plansteinen mit Kimmschicht und Querschnittsabdichtung, Kratzspachtelung, "
             "Abdichtung nach DIN 18533, Perimeterdämmung und Schutzschicht; innen nach Wahl.",
     "bezug": "erdberührte Wandfläche (Außenmaß × Wandhöhe), Öffnungen über 2,5 m² abgezogen",
     "fest": [["018.01.003.01001", 1.0]],
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             opt("KS 24", "KS-Plansteine d = 24 cm, Sperrbahn", [["012.02.005.01001", 1.0], [KIMM[24], 0.36], ["012.01.002.02001", 0.36]], True),
             opt("KS 30", "KS-Plansteine d = 30 cm, Sperrbahn", [["012.02.005.02001", 1.0], [KIMM[30], 0.36], ["012.01.002.02001", 0.36]], True),
             opt("KS 36,5", "KS-Plansteine d = 36,5 cm, Sperrbahn", [["012.02.005.03001", 1.0], [KIMM[36.5], 0.36], ["012.01.002.03001", 0.36]]),
         ]},
         {"name": "Abdichtung", "optionen": [
             opt("KMB W1-E", "Bitumendickbeschichtung W1-E (Bodenfeuchte)", [["018.02.001.01001", 1.0]], True),
             opt("KMB W2.1-E", "Bitumendickbeschichtung W2.1-E (drückendes Wasser)", [["018.02.001.02001", 1.0]], True),
             opt("MDS W1-E", "flexible mineralische Dichtschlämme W1-E", [["018.02.002.01001", 1.0]]),
             opt("Bitumen 2-lagig", "Bitumen-Schweißbahnen zweilagig", [["018.02.003.02001", 1.0]]),
         ]},
         {"name": "Perimeterdämmung", "optionen": [
             ohne("ohne Perimeterdämmung (unbeheizt)", std=True),
             opt("XPS 8", "Perimeterdämmung XPS 80 mm, geklebt", [["018.02.008.01001", 1.0]]),
             opt("XPS 12", "Perimeterdämmung XPS 120 mm, geklebt", [["018.02.008.02001", 1.0]], True),
             opt("XPS 16", "Perimeterdämmung XPS 160 mm, geklebt", [["018.02.008.03001", 1.0]], True),
             opt("XPS 20", "Perimeterdämmung XPS 200 mm, geklebt", [["018.02.008.04001", 1.0]]),
         ]},
         {"name": "Schutzschicht", "optionen": [
             opt("Noppenbahn", "Noppenbahn 8 mm als Schutzlage", [["018.02.007.01001", 1.0]], True),
             opt("Dränmatte", "Noppenbahn 20 mm mit Filtervlies", [["018.05.012.01001", 1.0]]),
             opt("Dränplatte EPS", "Dränplatte EPS haufwerksporig 50 mm", [["018.05.012.02001", 1.0]]),
         ]},
         {"name": "Innenseite", "optionen": [
             opt("KZ-Putz, Kalk", "Kalkzementputz 15 mm, Kalk-/Silikatanstrich", [["023.02.001.04001", 1.0], ["034.04.002.01001", 1.0]], True),
             opt("Anstrich", "Mauerwerk direkt mit Kalk-/Silikatfarbe gestrichen", [["034.04.002.01001", 1.0]], True),
             ohne("innen roh"),
         ]},
     ], "tags": ["neubau"]},

    {"id": "331.09", "kg": "331", "name": "Kellerwand WU-Beton (weiße Wanne)", "einheit": "m²",
     "lang": "Erdberührte Kelleraußenwand aus wasserundurchlässigem Beton als weiße Wanne mit Arbeitsfugenabdichtung, "
             "Perimeterdämmung und Schutzschicht.",
     "bezug": "erdberührte Wandfläche (Außenmaß × Wandhöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             opt("WU 25", "WU-Stahlbetonwand C30/37 d = 25 cm, komplett", [["013.09.002.04001", 1.0]], True),
             opt("WU 30", "WU-Stahlbetonwand C30/37 d = 30 cm, komplett", [["013.09.002.05001", 1.0]], True),
             opt("Elementwand WU 30", "WU-Doppelwand d = 30 cm mit Kernbeton", [["013.03.005.03001", 1.0]]),
         ]},
         {"name": "Fugenabdichtung", "optionen": [
             opt("Fugenblech", "beschichtetes Fugenblech in Arbeitsfugen", [["013.07.001.02001", 0.36]], True),
             opt("Injektionsschlauch", "Injektionsschlauch in Arbeitsfugen inkl. Verpressen", [["013.07.001.04001", 0.36]], True),
             opt("Fugenbl. + Sollriss", "Fugenblech und Sollrissfugenelemente", [["013.07.001.02001", 0.36], ["013.07.003.01001", 0.06]]),
         ]},
         {"name": "Perimeterdämmung", "optionen": [
             ohne("ohne Perimeterdämmung (unbeheizt)", std=True),
             opt("XPS 12", "Perimeterdämmung XPS 120 mm", [["018.02.008.02001", 1.0]], True),
             opt("XPS 16", "Perimeterdämmung XPS 160 mm", [["018.02.008.03001", 1.0]], True),
             opt("XPS 20", "Perimeterdämmung XPS 200 mm", [["018.02.008.04001", 1.0]]),
         ]},
         {"name": "Schutzschicht", "optionen": [
             opt("Noppenbahn", "Noppenbahn 8 mm als Schutzlage", [["018.02.007.01001", 1.0]], True),
             opt("Dränplatte EPS", "Dränplatte EPS haufwerksporig 50 mm", [["018.05.012.02001", 1.0]], True),
             opt("Schutzmatte", "Bautenschutzmatte Gummigranulat 6 mm", [["018.05.012.03001", 1.0]]),
         ]},
         {"name": "Innenseite", "optionen": [
             opt("Anstrich", "Betonfläche mit Kalk-/Silikatfarbe gestrichen", [["034.04.002.01001", 1.0]], True),
             opt("Dünnputz", "Dünnlagenputz, Dispersionsanstrich", [["023.02.003.01001", 1.0], ["034.02.001.01001", 1.0]]),
             ohne("innen roh"),
         ]},
     ], "tags": ["neubau"]},

    {"id": "331.10", "kg": "331", "name": "Kellerwand Stahlbeton, abgedichtet", "einheit": "m²",
     "lang": "Erdberührte Kelleraußenwand aus Stahlbeton (Komplettleistung) mit außenliegender Abdichtung nach DIN 18533 "
             "(schwarze Wanne), Perimeterdämmung und Schutzschicht.",
     "bezug": "erdberührte Wandfläche (Außenmaß × Wandhöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             opt("StB 20", "Stahlbetonwand C25/30 d = 20 cm, komplett", [["013.09.002.02001", 1.0]], True),
             opt("StB 24", "Stahlbetonwand C25/30 d = 24 cm, komplett", [["013.09.002.03001", 1.0]], True),
         ]},
         {"name": "Abdichtung", "optionen": [
             opt("KMB W1-E", "Bitumendickbeschichtung W1-E", [["018.02.001.01001", 1.0]], True),
             opt("KMB W2.1-E", "Bitumendickbeschichtung W2.1-E", [["018.02.001.02001", 1.0]], True),
             opt("FPO 1,5", "Kunststoffbahn FPO/EPDM 1,5 mm", [["018.05.002.01001", 1.0]]),
             opt("Bitumen 2-lagig", "Bitumen-Schweißbahnen zweilagig", [["018.02.003.02001", 1.0]], True),
         ]},
         {"name": "Perimeterdämmung", "optionen": [
             ohne("ohne Perimeterdämmung (unbeheizt)", std=True),
             opt("XPS 12", "Perimeterdämmung XPS 120 mm", [["018.02.008.02001", 1.0]], True),
             opt("XPS 16", "Perimeterdämmung XPS 160 mm", [["018.02.008.03001", 1.0]], True),
         ]},
         {"name": "Schutzschicht", "optionen": [
             opt("Noppenbahn", "Noppenbahn 8 mm als Schutzlage", [["018.02.007.01001", 1.0]], True),
             opt("Dränmatte", "Noppenbahn 20 mm mit Filtervlies", [["018.05.012.01001", 1.0]]),
         ]},
         {"name": "Innenseite", "optionen": [
             opt("Anstrich", "Betonfläche mit Kalk-/Silikatfarbe gestrichen", [["034.04.002.01001", 1.0]], True),
             ohne("innen roh"),
         ]},
     ], "tags": ["neubau"]},

    {"id": "331.11", "kg": "331", "name": "AW Mauerwerk + VHF", "einheit": "m²",
     "lang": "Tragende Außenwand aus Mauerwerk mit vorgehängter hinterlüfteter Fassade (Unterkonstruktion, Mineralwolle, "
             "Bekleidung, Brandsperren, Ecken und oberer Abschluss), innen geputzt.",
     "bezug": "Wandfläche (Außenmaß × Geschosshöhe), Öffnungen über 2,5 m² abgezogen",
     "fest": VHF_FEST,
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             opt("KS 17,5", "Kalksand-Plansteine d = 17,5 cm", [["012.02.004.01001", 1.0], [KIMM[17.5], 0.36]], True),
             opt("KS 24", "Kalksand-Plansteine d = 24 cm", [["012.02.004.02001", 1.0], [KIMM[24], 0.36]], True),
             opt("Hlz 24", "Planziegel ungefüllt d = 24 cm", [["012.02.002.01001", 1.0], [KIMM[24], 0.36]]),
         ]},
         {"name": "Unterkonstruktion + Dämmung", "optionen": [dict(o, std=o["k"] in ("UK Alu + MW 16", "UK Alu + MW 20")) for o in UK_DAEMM]},
         {"name": "Bekleidung", "optionen": [dict(o, std=o["k"] in ("Faserzement", "HPL", "Riemchen VHF")) for o in VHF_MINERAL]
                                            + [opt("Lärche Stülp", "Stülpschalung Lärche", [["038.05.004.02001", 1.0]]),
                                               opt("Alu-Sinuswelle", "Alu-Sinuswelle beschichtet", [["038.02.001.08001", 1.0]])]},
         {"name": "Innenseite", "optionen": INNEN_MW},
     ], "tags": ["neubau"]},

    {"id": "331.12", "kg": "331", "name": "AW Mauerwerk Bestand instandsetzen", "einheit": "m²",
     "lang": "Instandsetzung tragender Bestandsaußenwände aus Mauerwerk: Fugen, schadhafte Steine, Risse und nachträgliche "
             "Horizontalsperre (bezogen auf eine eingeschossige Wandfläche).",
     "bezug": "instand zu setzende Wandfläche (Ansichtsfläche), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Fugen", "optionen": [
             opt("Fugen Kalk NHL", "Fugen auskratzen, neu verfugen mit Kalkmörtel NHL", [["012.06.007.01001", 1.0]], True),
             opt("Fugen Trasskalk", "Fugen auskratzen, neu verfugen mit Trasskalkmörtel", [["012.06.007.02001", 1.0]], True),
             opt("Fugen Zement", "Fugen auskratzen, neu verfugen mit Zementmörtel", [["012.06.007.03001", 1.0]], True),
             opt("Verpressen", "Mauerwerk mit Injektionsmörtel verpressen", [["012.06.006.01001", 1.0]]),
             ohne("ohne Fugensanierung"),
         ]},
         {"name": "Steinaustausch", "optionen": [
             ohne("ohne Steinaustausch", std=True),
             opt("Steine 0,5/m²", "schadhafte Steine NF auswechseln, ca. 0,5 St/m²", [["012.06.004.01001", 0.5]], True),
             opt("Steine 2/m²", "schadhafte Steine NF auswechseln, ca. 2 St/m²", [["012.06.004.01001", 2.0]]),
         ]},
         {"name": "Risse", "optionen": [
             ohne("ohne Risssanierung", std=True),
             opt("Rissvernadelung", "Rissvernadelung bis 2 mm, ca. 0,2 m/m²", [["012.06.003.01001", 0.2]], True),
             opt("Rissvernad. 5 mm", "Rissvernadelung bis 5 mm, ca. 0,3 m/m²", [["012.06.003.02001", 0.3]]),
         ]},
         {"name": "Horizontalsperre", "optionen": [
             ohne("ohne Horizontalsperre", std=True),
             opt("HS Injektion", "Horizontalsperre Injektion, Wand bis 36,5 cm", [["012.06.001.02001", 0.36]], True),
             opt("HS mechanisch", "Horizontalsperre mechanisch, Wand bis 36,5 cm", [["012.06.002.01001", 0.36]]),
         ]},
     ], "tags": ["altbau"]},

    {"id": "331.13", "kg": "331", "name": "Fachwerk-Außenwand Bestand sanieren", "einheit": "m²",
     "lang": "Instandsetzung einer Fachwerk-Außenwand im Bestand: Holzteile austauschen, Gefache neu ausfachen, Oberflächen "
             "außen und innen. Holzanteil der Ansichtsfläche ca. 30 %.",
     "bezug": "Wandfläche Fachwerk (Ansichtsfläche), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Holztragwerk", "optionen": [
             opt("Holz 0,15 m/m²", "Ständer/Riegel austauschen, ca. 0,15 m je m²", [["016.04.007.01001", 0.15]], True),
             opt("Holz 0,4 m/m²", "Ständer/Riegel austauschen, ca. 0,4 m je m²", [["016.04.007.01001", 0.4]], True),
             ohne("Holztragwerk bleibt"),
         ]},
         {"name": "Gefache", "optionen": [
             opt("Gefache 30 %", "30 % der Gefache ausmauern bzw. Lehmstein", [["016.04.008.01001", 0.3]], True),
             opt("Gefache 70 %", "70 % der Gefache ausmauern bzw. Lehmstein", [["016.04.008.01001", 0.7]], True),
             ohne("Gefache bleiben"),
         ]},
         {"name": "Außenseite", "optionen": [
             opt("Holz deckend", "Holz deckend gestrichen, Gefache Silikatanstrich", [["034.04.001.01001", 0.3], ["034.04.004.02001", 0.7]], True),
             opt("Holz Lasur", "Holz lasiert, Gefache Silikatanstrich", [["034.03.002.08001", 0.3], ["034.04.004.02001", 0.7]]),
         ]},
         {"name": "Innenseite", "optionen": [
             opt("Lehmputz", "Lehmputz 20 mm, Lehmfarbe", [["023.02.001.06001", 1.0], ["034.02.007.03001", 1.0]], True),
             opt("ID Holzfaser", "Innendämmung Holzfaser 60 mm, Lehmfarbe", [["039.03.006.03001", 1.0], ["034.02.007.03001", 1.0]], True),
             opt("Kalkputz", "Kalkputz 15 mm, Kalkanstrich", [["023.02.001.05001", 1.0], ["034.02.007.01001", 1.0]], True),
             ohne("innen ohne Maßnahme"),
         ]},
     ], "tags": ["altbau"]},

    {"id": "331.14", "kg": "331", "name": "Brüstung/Attika Stahlbeton", "einheit": "m²",
     "lang": "Brüstung bzw. Attika aus Ortbeton C25/30 d = 20 cm (Beton, Schalung beidseitig, Bewehrung ca. 80 kg/m³) mit "
             "Außendämmung bzw. Bekleidung und Innenseite.",
     "bezug": "Ansichtsfläche der Brüstung (Länge × Höhe)",
     "fest": [["013.03.004.01001", 0.20], ["013.06.001.01001", 0.016]],
     "schichten": [
         {"name": "Schalung", "optionen": [
             opt("Schalung normal", "Wandschalung beidseitig ohne Sichtanforderung", [["013.05.001.02001", 2.0]], True),
             opt("Schalung SB 2", "außen Sichtbeton SB 2, innen ohne Anforderung", [["013.05.001.03001", 1.0], ["013.05.001.02001", 1.0]], True),
         ]},
         {"name": "Außenseite", "optionen": [
             opt("WDVS EPS 12", "WDVS EPS 12 cm", [["023.04.001.01001", 1.0]], True),
             opt("WDVS MW 12", "WDVS Mineralwolle 12 cm", [["023.04.002.01001", 1.0]], True),
             opt("VHF Faserzement", "Alu-UK, MW 120, Faserzementtafeln", [["038.01.001.01001", 1.0], ["038.01.003.01001", 1.0], ["038.02.001.01001", 1.0]], True),
             opt("Hydrophobierung", "Sichtbeton hydrophobiert", [["034.04.013.01001", 1.0]]),
         ]},
         {"name": "Innenseite", "optionen": [
             opt("Dünnputz", "Dünnlagenputz, Dispersionsanstrich", [["023.02.003.01001", 1.0], ["034.02.001.01001", 1.0]], True),
             opt("WDVS innen", "Attika innen gedämmt, EPS 12 cm", [["023.04.001.01001", 1.0]], True),
             ohne("innen roh / Dachabdichtung gesondert"),
         ]},
     ], "tags": ["neubau"]},

    {"id": "331.15", "kg": "331", "name": "Brüstungs-/Pfeilermauerwerk", "einheit": "m²",
     "lang": "Tragendes Brüstungs- bzw. Pfeilermauerwerk aus Plansteinen mit Außen- und Innenbekleidung.",
     "bezug": "Ansichtsfläche von Brüstungen und Pfeilern",
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             opt("Planstein 17,5", "Brüstungsmauerwerk Planstein d = 17,5 cm", [["012.05.008.01001", 1.0], [KIMM[17.5], 0.5]], True),
             opt("Planstein 24", "Brüstungsmauerwerk Planstein d = 24 cm", [["012.05.008.02001", 1.0], [KIMM[24], 0.5]], True),
             opt("Planstein 36,5", "Brüstungsmauerwerk Planstein d = 36,5 cm", [["012.05.008.03001", 1.0], [KIMM[36.5], 0.5]], True),
         ]},
         {"name": "Außenseite", "optionen": [
             opt("WDVS EPS 16", "WDVS EPS 16 cm", [["023.04.001.03001", 1.0]], True),
             opt("WDVS MW 16", "WDVS Mineralwolle 16 cm", [["023.04.002.02001", 1.0]], True),
             opt("LP + Scheibenputz", "Leichtputz mit Scheibenputz", [["023.03.001.01001", 1.0]], True),
             opt("Klinker NF", "Kerndämmung 14 cm und Klinker NF", [["012.02.007.02001", 1.0], ["012.02.006.01001", 1.0]]),
         ]},
         {"name": "Innenseite", "optionen": INNEN_MW},
     ], "tags": ["neubau"]},

    {"id": "331.16", "kg": "331", "name": "AW Elementwand + WDVS", "einheit": "m²",
     "lang": "Tragende Außenwand aus Stahlbeton-Doppelwandelementen mit Kernbeton und Wärmedämmverbundsystem, innen gespachtelt "
             "und gestrichen.",
     "bezug": "Wandfläche (Außenmaß × Geschosshöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             opt("Elementwand 24", "Doppelwand d = 24 cm mit Kernbeton C25/30", [["013.03.005.01001", 1.0]], True),
             opt("Elementwand 30", "Doppelwand d = 30 cm mit Kernbeton C25/30", [["013.03.005.02001", 1.0]], True),
         ]},
         {"name": "Wärmedämmung außen", "optionen": WDVS},
         {"name": "Innenseite", "optionen": [
             opt("Spachtel + Anstr.", "Dünnlagenputz 3–5 mm, Dispersionsanstrich", [["023.02.003.01001", 1.0], ["034.02.001.01001", 1.0]], True),
             opt("Anstrich", "Fertigteiloberfläche direkt gestrichen", [["034.02.004.01001", 1.0]], True),
             ohne("innen roh"),
         ]},
     ], "tags": ["neubau"]},

    {"id": "331.17", "kg": "331", "name": "AW Brettsperrholz", "einheit": "m²",
     "lang": "Tragende Außenwand aus Brettsperrholz (CLT) mit Außendämmung bzw. hinterlüfteter Fassade und Innenseite sichtbar "
             "oder bekleidet.",
     "bezug": "Wandfläche (Außenmaß × Geschosshöhe), Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Tragschicht", "optionen": [
             opt("CLT 100 NSi", "Brettsperrholz 100 mm, Nichtsichtqualität", [["016.05.003.01001", 1.0]], True),
             opt("CLT 120 WSi", "Brettsperrholz 120 mm, Wohnsichtqualität", [["016.05.003.02001", 1.0]], True),
         ]},
         {"name": "Dämmung + Fassade", "optionen": [
             opt("WDVS HF 10", "WDVS Holzfaser 10 cm auf Holzbau", [["023.04.003.02001", 1.0]]),
             opt("WDVS HF 16", "WDVS Holzfaser 16 cm", [["023.04.014.02001", 1.0]], True),
             opt("Lärche + MW 16", "Holz-UK, MW 160, Fassadenbahn, Lärchenschalung",
                 [["038.01.002.01001", 1.0], ["038.01.003.02001", 1.0], ["016.02.008.01001", 1.0], ["016.04.004.01001", 1.0]], True),
             opt("FZ + MW 16", "Holz-UK, MW 160, Fassadenbahn, Faserzementtafeln",
                 [["038.01.002.01001", 1.0], ["038.01.003.02001", 1.0], ["038.01.004.01001", 1.0], ["038.02.001.01001", 1.0]], True),
         ]},
         {"name": "Innenseite", "optionen": [
             opt("sichtbar", "Holzoberfläche sichtbar, farblos lasiert", [["034.02.014.01001", 1.0]], True),
             opt("GK direkt", "GKB 12,5 mm direkt, Anstrich", [["039.03.001.03001", 1.0], ["034.02.001.01001", 1.0]], True),
             opt("Inst.-Ebene + GK", "Installationsebene, GKB 12,5 mm, Anstrich",
                 [["016.04.003.01001", 1.0], ["039.03.001.03001", 1.0], ["034.02.001.01001", 1.0]]),
         ]},
     ], "tags": ["neubau"]},

    {"id": "331.18", "kg": "331", "name": "Kellerwand Bestand nachträgl. abdichten", "einheit": "m²",
     "lang": "Nachträgliche Abdichtung einer erdberührten Kellerwand im Bestand (ohne Erdarbeiten) außen oder innen, mit "
             "Horizontalsperre, Perimeterdämmung und Sanierputz innen.",
     "bezug": "erdberührte Wandfläche, Horizontalsperre bezogen auf 2,75 m Wandhöhe",
     "schichten": [
         {"name": "Abdichtung", "optionen": [
             opt("außen W1-E", "Wand außen freilegen, reinigen, neu abdichten W1-E, Noppenbahn", [["018.04.003.01001", 1.0], ["018.02.007.01001", 1.0]], True),
             opt("innen mineral.", "Kellerwand innen mit mineralischem System abdichten", [["018.04.002.01001", 1.0]], True),
             opt("Schleierinj.", "Schleierinjektion Acrylatgel flächig", [["018.04.005.01001", 1.0]], True),
         ]},
         {"name": "Perimeterdämmung", "optionen": [
             ohne("ohne Perimeterdämmung", std=True),
             opt("XPS 8", "Perimeterdämmung XPS 80 mm", [["018.02.008.01001", 1.0]]),
             opt("XPS 12", "Perimeterdämmung XPS 120 mm", [["018.02.008.02001", 1.0]], True),
         ]},
         {"name": "Horizontalsperre", "optionen": [
             ohne("ohne Horizontalsperre", std=True),
             opt("HS Injektion", "nachträgliche Horizontalsperre, Wand 36,5 cm", [["018.04.001.02001", 0.36]], True),
             opt("HS mechanisch", "Mauersägeverfahren mit Edelstahlplatten", [["018.05.008.01001", 0.36]]),
         ]},
         {"name": "Innenseite", "optionen": [
             opt("Sanierputz 2 cm", "Salzputz entfernen, Sanierputz WTA 2 cm", [["023.01.007.01001", 1.0], ["018.05.009.01001", 1.0]], True),
             opt("Sanierputz 3 cm", "Salzputz entfernen, Sanierputz WTA 3 cm", [["023.01.007.01001", 1.0], ["018.05.009.02001", 1.0]], True),
             ohne("innen ohne Maßnahme"),
         ]},
     ], "tags": ["altbau"]},

    # ================================================================ 332 Nichttragende Außenwände
    {"id": "332.01", "kg": "332", "name": "Ausfachungswand Mauerwerk", "einheit": "m²",
     "lang": "Nichttragende Außenwand als Ausfachung im Skelettbau aus wärmedämmendem Mauerwerk mit gleitendem Deckenanschluss, "
             "außen geputzt, innen geputzt und gestrichen.",
     "bezug": "Wandfläche zwischen Decken und Stützen, Öffnungen über 2,5 m² abgezogen",
     "fest": [["012.03.006.01001", 0.36]],
     "schichten": [
         {"name": "Wandbaustoff", "optionen": [
             opt("PP2 36,5", "Porenbeton-Plansteine PP2 d = 36,5 cm", [["012.02.003.01001", 1.0], [KIMM[36.5], 0.36]], True),
             opt("PP2 42,5", "Porenbeton-Plansteine PP2 d = 42,5 cm", [["012.02.003.02001", 1.0], [KIMM[42.5], 0.36]], True),
             opt("Hlz 36,5", "Planziegel wärmedämmend d = 36,5 cm", [["012.02.001.01001", 1.0], [KIMM[36.5], 0.36]], True),
             opt("Hbl 36,5", "Leichtbeton-Hohlblock d = 36,5 cm", [["012.05.003.03001", 1.0], [KIMM[36.5], 0.36]]),
         ]},
         {"name": "Außenputz", "optionen": [dict(o, std=o["k"] in ("LP + Scheibenputz", "LP + Silikonharz")) for o in AUSSENPUTZ]},
         {"name": "Innenseite", "optionen": INNEN_MW},
     ], "tags": ["neubau"]},

    {"id": "332.02", "kg": "332", "name": "AW Metallständer, nichttragend", "einheit": "m²",
     "lang": "Nichttragende Außenwand in Trockenbauweise: Metallständerwerk, außen zementgebundene Beplankung, Hohlraumdämmung, "
             "Dampfbremse, Fassade nach Wahl, innen gespachtelt und gestrichen.",
     "bezug": "Wandfläche, Öffnungen über 2,5 m² abgezogen",
     "fest": [["039.01.010.01001", 1.0], ["016.03.005.01001", 1.0]],
     "schichten": [
         {"name": "Ständerwerk", "optionen": [
             opt("CW 100", "CW 100, beidseitig doppelt beplankt", [["039.01.005.03001", 1.0]], True),
             opt("CW 75", "CW 75, beidseitig doppelt beplankt", [["039.01.005.02001", 1.0]], True),
             opt("CW 75 Gipsfaser", "CW 75, Gipsfaserplatten 2 × 12,5 mm", [["039.01.001.02001", 1.0]]),
         ]},
         {"name": "Hohlraumdämmung", "optionen": [
             opt("MW 100", "Mineralwolle 100 mm", [["039.04.002.02001", 1.0]], True),
             opt("MW 40", "Mineralwolle 40 mm", [["039.04.002.01001", 1.0]]),
         ]},
         {"name": "Fassade", "optionen": [
             opt("WDVS MW 12", "WDVS Mineralwolle 12 cm", [["023.04.002.01001", 1.0]], True),
             opt("WDVS MW 16", "WDVS Mineralwolle 16 cm", [["023.04.002.02001", 1.0]]),
             opt("VHF Faserzement", "Alu-UK, MW 120, Faserzementtafeln", [["038.01.001.01001", 1.0], ["038.01.003.01001", 1.0], ["038.02.001.01001", 1.0]], True),
             opt("VHF Putzträger", "Alu-UK, MW 120, Putzträgerplatte mit Putz", [["038.01.001.01001", 1.0], ["038.01.003.01001", 1.0], ["038.05.003.02001", 1.0]], True),
         ]},
         {"name": "Innenseite", "optionen": [
             opt("Q2 + Anstrich", "Spachtelung Q2, Dispersionsanstrich", [["034.02.001.01001", 1.0]], True),
             opt("Q3 + Anstrich", "Spachtelung Q3, Dispersionsanstrich", [["039.06.001.01001", 1.0], ["034.02.001.01001", 1.0]], True),
             ohne("innen ohne Oberfläche"),
         ]},
     ], "tags": ["neubau"]},

    {"id": "332.03", "kg": "332", "name": "Glasbausteinwand außen", "einheit": "m²",
     "lang": "Nichttragende, lichtdurchlässige Außenwand aus Glasbausteinen d = 8 cm mit Bewehrung und Randanschluss.",
     "bezug": "Ansichtsfläche der Glasbausteinwand",
     "fest": [["023.04.019.02001", 2.0]],
     "schichten": [
         {"name": "Glasbausteine", "optionen": [
             opt("GBS 19×19", "Glasbausteine 19 × 19 cm", [["012.05.005.01001", 1.0]], True),
             opt("GBS 24×24", "Glasbausteine 24 × 24 cm", [["012.05.005.02001", 1.0]], True),
         ]},
         {"name": "Randabschluss", "optionen": [
             ohne("Randanschluss mit Fugenband (im Preis)", std=True),
             opt("Edelstahlprofil", "Putzabschlussprofil Edelstahl umlaufend", [["023.01.003.03001", 2.0]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "332.04", "kg": "332", "name": "AW Metall-Leichtbau zweischalig", "einheit": "m²",
     "lang": "Nichttragende Außenwand im Hallen- und Gewerbebau: Innenschale, Unterkonstruktion, Mineralwolledämmung und "
             "Metallbekleidung außen.",
     "bezug": "Wandfläche, Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Innenschale", "optionen": [
             opt("Trapez innen", "Stahl-Trapezprofil 0,75 mm als Innenschale", [["017.04.009.01001", 1.0]], True),
             opt("OSB innen", "OSB/3 22 mm als Innenschale", [["039.03.009.02001", 1.0]], True),
             ohne("ohne Innenschale"),
         ]},
         {"name": "UK + Dämmung", "optionen": [
             opt("UK + MW 12", "Alu-UK bis 160 mm, Mineralwolle 120 mm", [["038.01.001.01001", 1.0], ["038.01.003.01001", 1.0]], True),
             opt("UK + MW 16", "Alu-UK bis 220 mm, Mineralwolle 160 mm", [["038.01.001.02001", 1.0], ["038.01.003.02001", 1.0]], True),
             opt("UK + MW 20", "Alu-UK bis 220 mm, Mineralwolle 200 mm", [["038.01.001.02001", 1.0], ["038.01.003.03001", 1.0]], True),
         ]},
         {"name": "Bekleidung", "optionen": [
             opt("Alu-Sinuswelle", "Alu-Sinuswelle/Trapez beschichtet", [["038.02.001.08001", 1.0]], True),
             opt("Alu-Kassette", "Alu-Kassetten 2 mm pulverbeschichtet", [["038.05.001.01001", 1.0]], True),
             opt("Lochblech", "Alu-Lochblech 3 mm", [["038.05.002.02001", 1.0]]),
             opt("Stehfalz TiZn", "Winkelstehfalz Titanzink", [["022.03.004.01001", 1.0]]),
         ]},
     ], "tags": ["neubau"]},

    # ================================================================ 333 Außenstützen
    {"id": "333.01", "kg": "333", "name": "Außenstütze Stahlbeton", "einheit": "St",
     "lang": "Außenstütze aus Ortbeton als Komplettleistung (Schalung, Bewehrung, Beton) mit Oberfläche bzw. Dämmung.",
     "bezug": "Anzahl der Stützen gleicher Abmessung",
     "schichten": [
         {"name": "Stütze", "optionen": [
             opt("25×25, 3 m", "Stahlbetonstütze 25 × 25 cm, Höhe bis 3,0 m", [["013.09.004.01001", 1.0]], True),
             opt("30×30, 3 m", "Stahlbetonstütze 30 × 30 cm, Höhe bis 3,0 m", [["013.09.004.02001", 1.0]], True),
             opt("40×40, 3 m", "Stahlbetonstütze 40 × 40 cm, Höhe bis 3,0 m", [["013.09.004.03001", 1.0]], True),
             opt("30×30, 4,5 m", "Stahlbetonstütze 30 × 30 cm, Höhe bis 4,5 m", [["013.09.004.04001", 1.0]]),
             opt("40×40, 4,5 m", "Stahlbetonstütze 40 × 40 cm, Höhe bis 4,5 m", [["013.09.004.05001", 1.0]]),
             opt("Ø 30, 3 m", "Rundstütze Ø 30 cm, Höhe bis 3,0 m", [["013.09.004.06001", 1.0]]),
         ]},
         {"name": "Oberfläche", "optionen": [
             opt("Betonlasur", "Betonlasur, ca. 3,6 m² Abwicklung", [["034.04.006.01001", 3.6]], True),
             opt("Silikonharz", "Silikonharzanstrich, ca. 3,6 m² Abwicklung", [["034.04.004.01001", 3.6]], True),
             ohne("Beton roh"),
         ]},
         {"name": "Dämmung", "optionen": [
             ohne("ohne Dämmung", std=True),
             opt("WDVS EPS 12", "Stütze mit WDVS EPS 12 cm, ca. 5 m²", [["023.04.001.01001", 5.0]], True),
             opt("WDVS MW 12", "Stütze mit WDVS MW 12 cm, ca. 5 m²", [["023.04.002.01001", 5.0]]),
         ]},
     ], "tags": ["neubau"]},

    {"id": "333.02", "kg": "333", "name": "Außenstütze Stahl", "einheit": "St",
     "lang": "Außenstütze aus Stahlrohr bis 3,0 m mit Kopf- und Fußplatte, Korrosionsschutz (ca. 80 kg, 1,4 m² Oberfläche) "
             "und Verankerung.",
     "bezug": "Anzahl der Stützen gleicher Abmessung",
     "schichten": [
         {"name": "Stütze", "optionen": [
             opt("Rohr Ø 114", "Rundrohr Ø 114,3 × 6,3 mm", [["017.01.003.01001", 1.0]], True),
             opt("Quadrat 120", "Quadratrohr 120 × 120 × 8 mm", [["017.01.003.02001", 1.0]], True),
             opt("Rohr Ø 168", "Rundrohr Ø 168,3 × 8 mm", [["017.01.003.03001", 1.0]], True),
         ]},
         {"name": "Korrosionsschutz", "optionen": [
             opt("feuerverzinkt", "Feuerverzinkung ca. 80 kg", [["017.02.001.01001", 80.0]], True),
             opt("Duplex", "Feuerverzinkung und Duplexbeschichtung", [["017.02.001.01001", 80.0], ["017.02.003.01001", 1.4]], True),
             opt("Beschichtung C3", "Korrosionsschutzbeschichtung C3", [["017.02.002.02001", 1.4]]),
         ]},
         {"name": "Verankerung", "optionen": [
             opt("Ankerpl. nachtr.", "Ankerplatte 200 × 200 mit Verbundankern", [["017.04.004.02001", 1.0]], True),
             opt("Ankerpl. einbet.", "Ankerplatte 200 × 200 mit Kopfbolzen einbetoniert", [["017.04.003.02001", 1.0]], True),
             opt("Einzelfundament", "Einzelfundament 0,5 m³ mit Ankerplatte", [["013.02.002.02001", 0.5], ["017.04.003.02001", 1.0]]),
         ]},
         {"name": "Brandschutz", "optionen": [
             ohne("ohne Brandschutz", std=True),
             opt("R 30", "dämmschichtbildende Beschichtung R 30", [["017.02.004.01001", 1.4]]),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "333.03", "kg": "333", "name": "Außenstütze Holz", "einheit": "St",
     "lang": "Außenstütze aus Konstruktionsvollholz bzw. Brettschichtholz, Länge ca. 3,0 m, mit Stützenfuß aus Stahlformteil "
             "auf Schwerlastankern und Holzschutzanstrich.",
     "bezug": "Anzahl der Stützen gleicher Abmessung",
     "fest": [["016.01.005.01001", 8.0], ["017.01.005.02001", 4.0]],
     "schichten": [
         {"name": "Stütze", "optionen": [
             opt("KVH 12/12", "Holzstütze KVH C24 120 × 120 mm, 3 m", [["016.01.010.01001", 3.0]], True),
             opt("KVH 16/16", "Holzstütze KVH C24 160 × 160 mm, 3 m", [["016.01.010.02001", 3.0]], True),
             opt("BSH 16/16", "Holzstütze BSH GL24h 160 × 160 mm, 3 m", [["016.01.010.03001", 3.0]], True),
             opt("BSH 20/20", "Holzstütze BSH GL24h 200 × 200 mm, 3 m", [["016.01.010.04001", 3.0]], True),
         ]},
         {"name": "Oberfläche", "optionen": [
             opt("Dünnschichtlasur", "Imprägniergrund, Dünnschichtlasur zweimal", [["034.03.002.08001", 2.0]], True),
             opt("deckend", "Holzschutzfarbe deckend zweimal", [["034.04.001.01001", 2.0]], True),
             opt("Vergrauungslasur", "Vergrauungslasur einmal", [["034.04.001.02001", 2.0]], True),
             ohne("unbehandelt"),
         ]},
     ], "tags": ["neubau"]},

    {"id": "333.04", "kg": "333", "name": "Außenstütze StB-Fertigteil", "einheit": "St",
     "lang": "Außenstütze als Stahlbeton-Fertigteil liefern und montieren, mit Vergussmörtel am Fuß, Oberfläche nach Wahl.",
     "bezug": "Anzahl der Stützen gleicher Abmessung",
     "schichten": [
         {"name": "Stütze", "optionen": [
             opt("FT 30×30, 4 m", "Fertigteilstütze 30 × 30 cm, L ≤ 4 m", [["013.09.005.01001", 1.0], ["013.08.007.01001", 10.0]], True),
             opt("FT 40×40, 6 m", "Fertigteilstütze 40 × 40 cm, L ≤ 6 m", [["013.09.005.02001", 1.0], ["013.08.007.01001", 15.0]], True),
             opt("FT 50×50, 8 m", "Fertigteilstütze 50 × 50 cm, L ≤ 8 m", [["013.09.005.03001", 1.0], ["013.08.007.01001", 25.0]], True),
         ]},
         {"name": "Oberfläche", "optionen": [
             ohne("Fertigteiloberfläche roh", std=True),
             opt("Hydrophobierung", "Hydrophobierung, ca. 6 m²", [["034.04.013.01001", 6.0]], True),
             opt("Graffitischutz", "Graffitischutz, ca. 4 m² Sockelbereich", [["034.04.009.01001", 4.0]]),
         ]},
     ], "tags": ["neubau"]},

    {"id": "333.05", "kg": "333", "name": "Außenstütze Ortbeton je m", "einheit": "m",
     "lang": "Rechteckige Außenstütze aus Ortbeton C30/37 (Beton, Stützenschalung und Bewehrung einzeln erfasst) je m Stützenlänge.",
     "bezug": "Stützenlänge von OK Fundament bzw. Decke bis UK Decke/Unterzug",
     "schichten": [
         {"name": "Querschnitt", "optionen": [
             opt("25×25", "Querschnitt 25 × 25 cm", [["013.03.003.05001", 0.0625], ["013.05.001.06001", 1.0]], True),
             opt("30×30", "Querschnitt 30 × 30 cm", [["013.03.003.06001", 0.09], ["013.05.001.06001", 1.2]], True),
             opt("40×40", "Querschnitt 40 × 40 cm", [["013.03.003.07001", 0.16], ["013.05.001.06001", 1.6]], True),
             opt("50×50", "Querschnitt 50 × 50 cm", [["013.03.003.08001", 0.25], ["013.05.001.06001", 2.0]], True),
             opt("rund Ø 30", "Rundstütze Ø 30 cm", [["013.03.003.06001", 0.071], ["013.05.002.01001", 1.0]]),
         ]},
         {"name": "Bewehrung", "optionen": [
             opt("Bew. 150 kg/m³", "Betonstahl ca. 150 kg/m³ (Mittelwert über Querschnitte, 15 kg/m)", [["013.06.001.03001", 0.015]], True),
             opt("Bew. 250 kg/m³", "Betonstahl ca. 250 kg/m³ (hoch bewehrt, 25 kg/m)", [["013.06.001.03001", 0.025]], True),
         ]},
         {"name": "Oberfläche", "optionen": [
             ohne("Beton roh", std=True),
             opt("Betonlasur", "Betonlasur", [["034.04.006.01001", 1.2]], True),
         ]},
     ], "tags": ["neubau"]},

    # ================================================================ 334 Außenwandöffnungen
    fenster_m2("334.01", "Fenster Kunststoff je m²",
               "Kunststofffenster mit Dreifachverglasung liefern und einbauen, mit Anschlussabdichtung, Fensterbänken außen und innen "
               "sowie Leibungsputz. Rollläden gesondert unter KG 338.",
               [opt("Ku bis 1 m²", "Kunststofffenster Uw 0,95, Elemente bis 1,0 m²", [["026.01.001.01001", 1.0]]),
                opt("Ku 1–2,5 m²", "Kunststofffenster Uw 0,95, Elemente 1,0–2,5 m²", [["026.01.001.02001", 1.0]], True),
                opt("Ku > 2,5 m²", "Kunststofffenster Uw 0,95, Elemente über 2,5 m²", [["026.01.001.03001", 1.0]], True),
                opt("Ku Uw 0,8", "Kunststofffenster Uw 0,80, 1,0–2,5 m²", [["026.01.001.04001", 1.0]], True),
                opt("Ku + Oberlicht", "Kunststoff-Fensterelement mit Oberlicht 2,5–4,0 m²", [["026.01.010.01001", 1.0]]),
                opt("Ku Festverglasung", "Kunststoff-Festverglasung Uw 0,90", [["026.01.005.01001", 1.0]]),
                opt("Ku RAL-Farbe", "Kunststofffenster 1,0–2,5 m², Sonderfarbe RAL", [["026.01.001.02001", 1.0], ["026.02.008.01001", 0.55]])],
               ["neubau", "altbau"]),

    fenster_m2("334.02", "Fenster Holz je m²",
               "Holzfenster mit Dreifachverglasung liefern und einbauen, mit Anschlussabdichtung, Fensterbänken und Leibungsputz; "
               "auch Kasten- bzw. Denkmalfenster für den Bestand.",
               [opt("Holz Uw 0,95", "Holzfenster Uw 0,95, deckend weiß", [["026.01.002.01001", 1.0]], True),
                opt("Holz Uw 0,80", "Holzfenster Uw 0,80, lasiert", [["026.01.002.02001", 1.0]], True),
                opt("Holz + Sprossen", "Holzfenster Uw 0,95 mit Sprossen", [["026.01.002.01001", 1.0], ["026.02.003.01001", 0.55]]),
                opt("Denkmal ≤ 1,5", "Kasten-/Verbundfenster Holz bis 1,5 m²", [["026.01.014.01001", 1.0]]),
                opt("Denkmal > 1,5", "Kasten-/Verbundfenster Holz über 1,5 m²", [["026.01.014.02001", 1.0]])],
               ["neubau", "altbau"]),

    fenster_m2("334.03", "Fenster Holz-Alu je m²",
               "Holz-Aluminium-Fenster (innen Holz, außen Alu-Deckschale) mit Dreifachverglasung liefern und einbauen, mit Anschluss, "
               "Fensterbänken und Leibungsputz.",
               [opt("HA bis 1 m²", "Holz-Alu-Fenster Uw 0,85, bis 1,0 m²", [["026.01.003.01001", 1.0]], True),
                opt("HA 1–2,5 m²", "Holz-Alu-Fenster Uw 0,85, 1,0–2,5 m²", [["026.01.003.02001", 1.0]], True),
                opt("HA > 2,5 m²", "Holz-Alu-Fenster Uw 0,85, über 2,5 m²", [["026.01.003.03001", 1.0]], True)],
               ["neubau", "altbau"]),

    fenster_m2("334.04", "Fenster Alu/Stahl je m²",
               "Metallfenster aus thermisch getrennten Aluminium- bzw. Stahlprofilen liefern und einbauen, mit Anschluss, "
               "Fensterbänken und Leibungsputz; auch Brandschutzfenster.",
               [opt("Alu bis 1 m²", "Alufenster Uw 1,0, bis 1,0 m²", [["026.01.004.01001", 1.0]]),
                opt("Alu 1–2,5 m²", "Alufenster Uw 1,0, 1,0–2,5 m²", [["026.01.004.02001", 1.0]], True),
                opt("Stahl ≤ 1,5 m²", "Stahlfenster thermisch getrennt bis 1,5 m²", [["026.01.013.01001", 1.0]], True),
                opt("Stahl 1,5–3 m²", "Stahlfenster thermisch getrennt 1,5–3,0 m²", [["026.01.013.02001", 1.0]], True),
                opt("Brandschutz EI30", "Brandschutzfenster EI 30 fest, Stahl/Alu", [["026.01.012.01001", 1.0]])],
               ["neubau", "altbau"]),

    fenster_st("334.05", "Fenster klein je St (ca. 1,0 m²)", "ca. 0,88 × 1,13 m", 1.0, 4.0, 0.88, 3.1,
               ["026.01.001.01001", "026.01.001.04001", "026.01.002.01001", "026.01.003.01001", "026.01.004.01001"]),
    fenster_st("334.06", "Fenster mittel je St (ca. 1,75 m²)", "ca. 1,26 × 1,38 m", 1.75, 5.3, 1.26, 4.0,
               ["026.01.001.02001", "026.01.001.04001", "026.01.002.01001", "026.01.003.02001", "026.01.004.02001"]),
    fenster_st("334.07", "Fenster groß je St (ca. 3,0 m²)", "ca. 2,01 × 1,51 m", 3.0, 7.0, 2.01, 5.0,
               ["026.01.001.03001", "026.01.001.04001", "026.01.002.01001", "026.01.003.03001", "026.01.004.02001"]),

    {"id": "334.08", "kg": "334", "name": "Fenstertür / Balkontür je St", "einheit": "St",
     "lang": "Fenstertür (Balkon-/Terrassentür) Dreh-Kipp bis ca. 1,10 × 2,20 m liefern und einbauen, mit Anschlussabdichtung, "
             "Bodeneinstandsprofil bzw. barrierefreier Schwelle und Leibungsputz.",
     "bezug": "Anzahl der Fenstertüren nach Fensterliste",
     "schichten": [
         {"name": "Fenstertür", "optionen": [
             opt("Ku 1,00×2,20", "Kunststoff-Fenstertür bis 1,00 × 2,20 m", [["026.01.006.01001", 1.0]], True),
             opt("Ku 1,25×2,30", "Kunststoff-Fenstertür bis 1,25 × 2,30 m", [["026.01.006.02001", 1.0]], True),
             opt("Holz 2,2 m²", "Holz-Fenstertür Uw 0,95, ca. 2,2 m²", [["026.01.002.01001", 2.2]], True),
             opt("Holz-Alu 2,2 m²", "Holz-Alu-Fenstertür Uw 0,85, ca. 2,2 m²", [["026.01.003.02001", 2.2]], True),
             opt("Alu 2,2 m²", "Alu-Fenstertür Uw 1,0, ca. 2,2 m²", [["026.01.004.02001", 2.2]]),
         ]},
         {"name": "Einbau", "optionen": [
             opt("RAL-Montage", "Anschlussabdichtung mit Folienband", [["026.05.001.01001", 6.4]], True),
             opt("Vorwandmontage", "Vorwandmontage in der Dämmebene mit Folienband", [["026.05.002.01001", 6.4], ["026.05.001.01001", 6.4]], True),
         ]},
         {"name": "Schwelle", "optionen": [
             opt("Einstandsprofil", "Bodeneinstandsprofil / Montagezarge", [["026.02.012.01001", 1.1]], True),
             opt("Nullschwelle", "barrierefreie Nullschwelle mit Einstandsprofil", [["026.02.012.01001", 1.1], ["026.02.011.01001", 1.0]], True),
             ohne("Schwelle im Preis"),
         ]},
         {"name": "Leibungen", "optionen": [
             opt("Leibung geputzt", "Leibungen innen und außen geputzt", [["023.02.004.01001", 5.5], ["023.03.002.01001", 5.5]], True),
             opt("Leibung WDVS", "innen geputzt, außen WDVS-Leibungsdämmung", [["023.02.004.01001", 5.5], ["023.04.006.01001", 5.5]]),
             ohne("Leibungen gesondert"),
         ]},
         {"name": "Zulage", "optionen": [
             ohne("ohne Zulage", std=True),
             opt("RC2", "Sicherheitsbeschlag RC2 mit P4A-Glas", [["026.02.001.01001", 1.0]]),
             opt("Absturzsicherung", "absturzsichernde Verglasung DIN 18008-4", [["026.02.010.01001", 1.8]]),
             opt("Insektenschutz", "Insektenschutz-Drehrahmen Tür", [["030.04.001.03001", 1.0]]),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "334.09", "kg": "334", "name": "Hebe-Schiebe-Tür je St", "einheit": "St",
     "lang": "Hebe-Schiebe-Tür bis ca. 3,00 × 2,30 m liefern und einbauen, mit Anschlussabdichtung, Bodeneinstandsprofil und "
             "Leibungsputz.",
     "bezug": "Anzahl der Hebe-Schiebe-Türen nach Fensterliste",
     "schichten": [
         {"name": "HS-Tür", "optionen": [
             opt("HST Kunststoff", "Hebe-Schiebe-Tür Kunststoff bis 3,00 × 2,30 m", [["026.01.007.01001", 1.0]], True),
             opt("HST Holz-Alu", "Hebe-Schiebe-Tür Holz-Alu bis 3,00 × 2,30 m", [["026.01.007.02001", 1.0]], True),
             opt("HST Alu 4 m", "Hebe-Schiebe-Tür Aluminium bis 4,00 × 2,40 m", [["026.01.007.03001", 1.0]], True),
         ]},
         {"name": "Einbau", "optionen": [
             opt("RAL-Montage", "Anschlussabdichtung mit Folienband", [["026.05.001.01001", 10.6]], True),
             opt("Vorwandmontage", "Vorwandmontage mit Folienband", [["026.05.002.01001", 10.6], ["026.05.001.01001", 10.6]], True),
         ]},
         {"name": "Schwelle", "optionen": [
             opt("Einstandsprofil", "Bodeneinstandsprofil", [["026.02.012.01001", 3.0]], True),
             opt("Nullschwelle", "barrierefreie Schwelle mit Einstandsprofil", [["026.02.012.01001", 3.0], ["026.02.011.01001", 1.0]], True),
         ]},
         {"name": "Verglasung", "optionen": [
             ohne("Standardverglasung", std=True),
             opt("Sonnenschutzglas", "Sonnenschutzglas g ≤ 0,35", [["026.02.009.01001", 6.0]]),
             opt("Schall 38 dB", "Schallschutzverglasung Rw ≥ 38 dB", [["026.02.002.01001", 6.9]]),
         ]},
         {"name": "Leibungen", "optionen": [
             opt("Leibung geputzt", "Leibungen innen und außen geputzt", [["023.02.004.01001", 7.6], ["023.03.002.01001", 7.6]], True),
             ohne("Leibungen gesondert"),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "334.10", "kg": "334", "name": "Haustür je St", "einheit": "St",
     "lang": "Hauseingangstür RC2 mit Mehrfachverriegelung liefern und einbauen, mit Anschlussabdichtung, Schließtechnik und "
             "Zubehör nach Wahl.",
     "bezug": "Anzahl der Haustüren",
     "fest": [["026.05.001.01001", 5.4]],
     "schichten": [
         {"name": "Haustür", "optionen": [
             opt("HT Kunststoff", "Haustür Kunststoff mit Glasausschnitt bis 1,10 × 2,20 m", [["026.03.001.01001", 1.0]], True),
             opt("HT Alu", "Haustür Aluminium flügelüberdeckend bis 1,10 × 2,20 m", [["026.03.001.02001", 1.0]], True),
             opt("HT Holz", "Haustür Holz nach Bemusterung bis 1,10 × 2,20 m", [["026.03.001.03001", 1.0]], True),
             opt("HT Alu + Seitent.", "Haustür Aluminium mit Seitenteil bis 1,80 × 2,30 m", [["026.03.001.04001", 1.0]], True),
         ]},
         {"name": "Schließtechnik", "optionen": [
             opt("Zylinder einzeln", "Profilzylinder einzelschließend", [["029.01.002.01001", 1.0]], True),
             opt("Schließanlage", "Profilzylinder in Schließanlage", [["029.01.002.02001", 1.0]], True),
             opt("Motorschloss", "Motorschloss selbstverriegelnd, Elektrotüröffner", [["029.04.001.05001", 1.0], ["029.02.006.01001", 1.0], ["029.01.002.02001", 1.0]]),
             opt("Transponder", "elektronischer Zylinder (Transponder)", [["029.01.002.04001", 1.0]]),
         ]},
         {"name": "Zubehör", "optionen": [
             ohne("ohne Zubehör", std=True),
             opt("Briefeinwurf", "Briefeinwurf Edelstahl in Tür", [["029.03.003.01001", 1.0]], True),
             opt("Fußabstreifer", "Fußabstreifer mit Wanne 100 × 60 cm", [["031.03.006.01001", 1.0]]),
             opt("Hausnummer", "Hausnummer Edelstahl", [["029.03.002.01001", 1.0]]),
         ]},
         {"name": "Leibungen", "optionen": [
             opt("Leibung geputzt", "Leibungen innen und außen geputzt", [["023.02.004.01001", 5.5], ["023.03.002.01001", 5.5]], True),
             ohne("Leibungen gesondert"),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "334.11", "kg": "334", "name": "Nebeneingangs-/Außentür je St", "einheit": "St",
     "lang": "Einflügelige Außentür als Nebeneingang, Keller- oder Technikraumtür, auch mit Feuerschutz, mit Anschlussabdichtung "
             "und Schließtechnik.",
     "bezug": "Anzahl der Türen",
     "fest": [["026.05.001.01001", 5.2]],
     "schichten": [
         {"name": "Tür", "optionen": [
             opt("Ku/Alu-Tür", "Nebeneingangstür Kunststoff/Alu bis 1,00 × 2,10 m", [["026.03.002.01001", 1.0]], True),
             opt("Stahltür", "Mehrzwecktür Stahl 1000 × 2125 mm, Eckzarge", [["031.01.003.02001", 1.0]], True),
             opt("Stahl T30", "Feuerschutztür Stahl T30 1000 × 2125 mm", [["031.01.004.01001", 1.0]], True),
             opt("Stahl T90", "Feuerschutztür Stahl T90 1000 × 2125 mm", [["031.01.004.03001", 1.0]]),
         ]},
         {"name": "Beschlag", "optionen": [
             opt("Zyl. Schließanl.", "Profilzylinder in Schließanlage", [["029.01.002.02001", 1.0]], True),
             opt("ES1 + Zylinder", "Schutzbeschlag ES1 und Profilzylinder Schließanlage", [["029.01.001.05001", 1.0], ["029.01.002.02001", 1.0]], True),
             opt("Panik EN 1125", "Paniktürverschluss Druckstange und Zylinder", [["029.02.003.01001", 1.0], ["029.01.002.02001", 1.0]]),
         ]},
         {"name": "Türschließer", "optionen": [
             ohne("ohne Türschließer", std=True),
             opt("Obentürschließer", "Obentürschließer mit Gleitschiene", [["029.02.001.01001", 1.0]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "334.12", "kg": "334", "name": "Eingangsanlage Objekt je St", "einheit": "St",
     "lang": "Eingangsanlage im Objektbau aus Aluminium bzw. automatische Schiebetüranlage mit Fluchtweg-, Zutritts- und "
             "Schließtechnik nach Wahl sowie Fußabstreifer.",
     "bezug": "Anzahl der Eingangsanlagen",
     "schichten": [
         {"name": "Anlage", "optionen": [
             opt("Alu 2,5×2,5 m", "Eingangsanlage Aluminium mit Seitenteil bis 2,50 × 2,50 m", [["026.03.003.01001", 1.0], ["026.05.001.01001", 10.0]], True),
             opt("Alu 3,5×2,8 m", "Eingangsanlage Aluminium mit Seitenteil bis 3,50 × 2,80 m", [["026.03.003.02001", 1.0], ["026.05.001.01001", 12.6]], True),
             opt("Schiebetür 1,40", "automatische Schiebetüranlage, Durchgang 1,40 m", [["026.03.004.01001", 1.0], ["026.05.001.01001", 11.0]], True),
             opt("Schiebetür 2,00", "automatische Schiebetüranlage, Durchgang 2,00 m", [["026.03.004.02001", 1.0], ["026.05.001.01001", 13.0]], True),
         ]},
         {"name": "Tür-/Zutrittstechnik", "optionen": [
             opt("Obentürschließer", "Obentürschließer, Zylinder Schließanlage", [["029.02.001.01001", 1.0], ["029.01.002.02001", 1.0]], True),
             opt("Panik + Fluchttür", "Paniktürverschluss und Fluchttürsteuerung", [["029.02.003.01001", 1.0], ["029.02.005.01001", 1.0]], True),
             opt("Zutritt online", "elektronischer Wandleser online, Motorschloss", [["029.04.007.03001", 1.0], ["029.04.001.05001", 1.0]]),
             opt("Freilaufschließer", "Freilauftürschließer mit Rauchmelder", [["029.02.002.01001", 1.0]]),
             ohne("Technik im Preis (Schiebetür)"),
         ]},
         {"name": "Fußabstreifer", "optionen": [
             opt("Abstreifer 100×60", "Fußabstreifer Edelstahl mit Wanne 100 × 60 cm", [["031.03.006.01001", 1.0]], True),
             opt("Abstreifer 150×100", "Fußabstreifer Edelstahl mit Wanne 150 × 100 cm", [["031.03.006.02001", 1.0]], True),
             ohne("ohne Fußabstreifer"),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "334.13", "kg": "334", "name": "Garagen-/Industrietor je St", "einheit": "St",
     "lang": "Tor in der Außenwand (Garagen-Sektionaltor, Industrie- bzw. Schnelllauftor, Tiefgaragentor) mit Antrieb, "
             "Anschlussfugen und Bedienung.",
     "bezug": "Anzahl der Tore",
     "schichten": [
         {"name": "Tor", "optionen": [
             opt("Sektional 2,5 m", "Garagen-Sektionaltor 2,50 × 2,125 m, Motor", [["031.01.009.01001", 1.0], ["023.04.019.02001", 6.8]], True),
             opt("Sektional 5,0 m", "Garagen-Sektionaltor 5,00 × 2,125 m, Motor", [["031.01.009.02001", 1.0], ["023.04.019.02001", 9.3]], True),
             opt("Rolltor 3×3 m", "Industrie-Rolltor / Schnelllauftor 3,0 × 3,0 m", [["031.01.013.01001", 1.0], ["023.04.019.02001", 9.0]], True),
             opt("Rolltor 4×4 m", "Industrie-Rolltor / Schnelllauftor 4,0 × 4,0 m", [["031.01.013.02001", 1.0], ["023.04.019.02001", 12.0]], True),
             opt("TG-Tor 5×2,3 m", "Tiefgaragentor 5,0 × 2,3 m", [["031.01.013.03001", 1.0], ["023.04.019.02001", 9.6]], True),
             opt("Brandschutztor", "Feuerschutz-Sektionaltor EI2 30 bis 3,0 × 3,0 m", [["031.01.008.01001", 1.0]]),
         ]},
         {"name": "Bedienung", "optionen": [
             ohne("Taster (im Preis)", std=True),
             opt("2 Handsender", "zwei Funk-Handsender", [["030.04.004.01001", 2.0]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "334.14", "kg": "334", "name": "Kellerfenster mit Lichtschacht je St", "einheit": "St",
     "lang": "Kellerfenster aus Kunststoff (Kipp) mit Anschlussabdichtung, wahlweise mit Lichtschacht und Sicherung.",
     "bezug": "Anzahl der Kellerfenster",
     "schichten": [
         {"name": "Kellerfenster", "optionen": [
             opt("KF 80×60", "Kellerfenster Kunststoff 80 × 60 cm", [["026.01.009.01001", 1.0], ["026.05.001.01001", 2.8]], True),
             opt("KF 100×75", "Kellerfenster Kunststoff 100 × 75 cm", [["026.01.009.02001", 1.0], ["026.05.001.01001", 3.5]], True),
         ]},
         {"name": "Lichtschacht", "optionen": [
             ohne("ohne Lichtschacht", std=True),
             opt("LS Kunststoff", "Lichtschacht Kunststoff 100 × 60 × 40 cm, Anschluss abgedichtet", [["031.03.005.01001", 1.0], ["018.03.005.01001", 1.0]], True),
             opt("LS Beton", "Lichtschacht Betonfertigteil 100 × 40 cm, Anschluss abgedichtet", [["013.09.007.01001", 1.0], ["018.03.005.01001", 1.0]]),
         ]},
         {"name": "Sicherung", "optionen": [
             ohne("ohne Sicherung", std=True),
             opt("Gitter", "Sicherheitsgitter Stahl verzinkt", [["031.02.008.01001", 1.0]], True),
             opt("Insektenschutz", "Insektenschutz-Lichtschachtabdeckung", [["030.04.001.07001", 1.0]]),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "334.15", "kg": "334", "name": "Fenstertausch Bestand je St", "einheit": "St",
     "lang": "Austausch eines Bestandsfensters (ca. 1,26 × 1,38 m): Altfenster ausbauen und entsorgen, neues Fenster mit "
             "RAL-Anschluss einbauen, Leibungen beiputzen, Fensterbänke erneuern.",
     "bezug": "Anzahl der zu tauschenden Fenster",
     "fest": [["026.05.005.02001", 1.0], ["026.05.001.01001", 5.3], ["026.05.014.01001", 1.75]],
     "schichten": [
         {"name": "Fenster neu", "optionen": [
             opt("Kunststoff", "Kunststofffenster Uw 0,95", [["026.01.001.02001", 1.75]], True),
             opt("Kunststoff Uw 0,8", "Kunststofffenster Uw 0,80", [["026.01.001.04001", 1.75]], True),
             opt("Holz", "Holzfenster Uw 0,95", [["026.01.002.01001", 1.75]], True),
             opt("Holz-Alu", "Holz-Alu-Fenster Uw 0,85", [["026.01.003.02001", 1.75]], True),
             opt("Denkmal", "Kastenfenster Holz über 1,5 m²", [["026.01.014.02001", 1.75]]),
         ]},
         {"name": "Leibung", "optionen": [
             opt("beiputzen", "Leibungen nach Fenstertausch beiputzen", [["026.05.006.01001", 4.0]], True),
             opt("WDVS nacharbeiten", "Leibungen beiputzen, Anschluss im WDVS nacharbeiten", [["026.05.006.01001", 4.0], ["023.04.017.01001", 4.0]], True),
         ]},
         {"name": "Fensterbänke", "optionen": [
             opt("FBa Alu neu", "Alu-Fensterbank außen erneuern, innen bleibt", [["022.03.005.01001", 1.26]], True),
             opt("FBa + FBi neu", "Alu-Fensterbank außen und Innenfensterbank Holzwerkstoff erneuern", [["022.03.005.01001", 1.26], ["027.03.001.01001", 1.26]], True),
             ohne("Fensterbänke bleiben"),
         ]},
         {"name": "Rollladenkasten", "optionen": [
             ohne("ohne Maßnahme", std=True),
             opt("Kasten dämmen", "Rollladenkasten innen dämmen und abdichten", [["030.01.010.01001", 1.0]]),
         ]},
     ], "tags": ["altbau"]},

    {"id": "334.16", "kg": "334", "name": "Holzfenster Bestand instandsetzen", "einheit": "St",
     "lang": "Instandsetzung eines Holzfensters im Bestand (ca. 1,5 m², 2 Flügel): Überarbeiten und Beschichten, Dichtungen, "
             "Beschläge und Verglasung nach Wahl.",
     "bezug": "Anzahl der Fenster",
     "schichten": [
         {"name": "Beschichtung", "optionen": [
             opt("überarbeiten", "Holzfenster überarbeiten und neu beschichten", [["026.05.012.01001", 1.5]], True),
             opt("Anstrich außen", "Holzfenster außen streichen bis 2 m²", [["034.03.004.02001", 1.0]], True),
             opt("Dickschichtlasur", "Zwischenschliff, Dickschichtlasur zweimal", [["034.03.002.03001", 1.0]]),
         ]},
         {"name": "Dichtungen", "optionen": [
             opt("Dichtungen neu", "Fensterdichtungen erneuern, ca. 5 m", [["026.05.010.01001", 5.0]], True),
             ohne("Dichtungen bleiben", std=True),
         ]},
         {"name": "Beschlag", "optionen": [
             opt("Wartung", "Beschläge schmieren und einstellen, 2 Flügel", [["026.05.009.01001", 2.0]], True),
             opt("Beschlag neu", "Dreh-Kipp-Beschlag erneuern, 2 Flügel", [["026.05.011.01001", 2.0]], True),
         ]},
         {"name": "Verglasung", "optionen": [
             ohne("Verglasung bleibt", std=True),
             opt("Isolierglas 3-fach", "Isolierglas 3-fach Ug 0,6 einsetzen", [["032.01.001.02001", 1.2], ["026.05.015.01001", 5.0]], True),
             opt("Denkmalglas", "Denkmalglas / Goetheglas einsetzen", [["032.04.002.01001", 1.2]]),
             opt("Sonnenschutzfolie", "Sonnenschutzfolie auf Bestandsglas", [["032.04.004.01001", 1.2]]),
         ]},
     ], "tags": ["altbau"]},

    {"id": "334.17", "kg": "334", "name": "Öffnung in Bestands-AW herstellen", "einheit": "St",
     "lang": "Neue Öffnung in einer tragenden Bestandsaußenwand aus Mauerwerk herstellen: Abfangung, Stahlsturz, Durchbruch, "
             "Leibungen beiputzen. Fenster bzw. Tür gesondert.",
     "bezug": "Anzahl der neuen Öffnungen",
     "schichten": [
         {"name": "Durchbruch", "optionen": [
             opt("≤ 2,0 m², d ≤ 24", "Wanddurchbruch bis 2,0 m², Wand bis 24 cm", [["012.04.007.01001", 1.0]], True),
             opt("≤ 2,5 m², d ≤ 36,5", "Wanddurchbruch bis 2,5 m², Wand bis 36,5 cm", [["012.04.007.02001", 1.0]], True),
         ]},
         {"name": "Sturz", "optionen": [
             opt("2 × IPE 160", "Abfangung, Stahlsturz 2 × IPE 160, ca. 1,6 m", [["017.01.004.01001", 1.0], ["017.01.002.01001", 1.6]], True),
             opt("2 × IPE 200", "Abfangung, Stahlsturz 2 × IPE 200, ca. 2,0 m", [["017.01.004.01001", 1.0], ["017.01.002.02001", 2.0]], True),
             opt("HEB 200", "Abfangung bis 4 m, Stahlsturz HEB 200, ca. 2,6 m", [["017.01.004.02001", 1.0], ["017.01.002.03001", 2.6]]),
         ]},
         {"name": "Leibungen", "optionen": [
             opt("innen + außen", "Leibungen innen und außen putzen, ca. 5 m", [["023.02.004.02001", 5.0], ["023.03.002.02001", 5.0]], True),
             opt("nur innen", "Leibungen innen putzen, ca. 5 m", [["023.02.004.02001", 5.0]], True),
         ]},
     ], "tags": ["altbau"]},

    {"id": "334.18", "kg": "334", "name": "Öffnungszulage Mauerwerk Neubau", "einheit": "St",
     "lang": "Zulage je Öffnung in Mauerwerks-Außenwänden: Sturz bzw. Rollladenkasten als Sturz, Leibungen und "
             "Fensterbankanschluss. Fenster gesondert.",
     "bezug": "Anzahl der Öffnungen je Sturztyp",
     "schichten": [
         {"name": "Sturz", "optionen": [
             opt("Flachsturz 17,5", "Flachsturz 1,26 m für Wand 17,5 cm", [["012.04.001.02001", 1.0]], True),
             opt("Flachsturz 24", "Flachsturz 1,51 m für Wand 24 cm", [["012.04.001.03001", 1.0]], True),
             opt("Flachsturz 36,5", "Flachsturz 2,01 m für Wand 36,5 cm", [["012.04.001.04001", 1.0]]),
             opt("U-Schale 24", "U-Schale 1,5 m mit Ortbeton und Bewehrung", [["012.04.003.01001", 1.5], ["013.04.006.01001", 0.03]], True),
             opt("RL-Kasten 1,26", "Rollladen-/Raffstorekasten als Sturz 1,26 m", [["012.04.002.01001", 1.0]], True),
             opt("RL-Kasten 2,01", "Rollladen-/Raffstorekasten als Sturz 2,01 m", [["012.04.002.02001", 1.0]]),
         ]},
         {"name": "Leibungen", "optionen": [
             opt("Leibung geputzt", "Leibungen innen und außen geputzt, ca. 3,5 m", [["023.02.004.01001", 3.5], ["023.03.002.01001", 3.5]], True),
             opt("Leibung WDVS", "innen geputzt, außen WDVS-Leibungsdämmung, ca. 3,5 m", [["023.02.004.01001", 3.5], ["023.04.006.01001", 3.5]], True),
         ]},
         {"name": "Fensterbankanschluss", "optionen": [
             ohne("im Fensteraufbau enthalten", std=True),
             opt("FB-Anschluss WDVS", "Fensterbankanschluss im WDVS mit Bordprofil", [["023.04.007.01001", 1.0]], True),
         ]},
     ], "tags": ["neubau"]},

    # ================================================================ 335 Außenwandbekleidungen außen
    {"id": "335.01", "kg": "335", "name": "WDVS EPS", "einheit": "m²",
     "lang": "Wärmedämmverbundsystem mit EPS-Dämmplatten WLS 032, Armierung und Silikonharz-Oberputz, mit Brandriegeln je Geschoss; "
             "auf Neubau- oder Bestandsuntergrund. Gerüst gesondert (KG 392).",
     "bezug": "Fassadenfläche, Öffnungen über 2,5 m² abgezogen, Leibungen gesondert",
     "schichten": [
         {"name": "Untergrund", "optionen": [
             ohne("Neubau-Mauerwerk, keine Vorbereitung", std=True),
             opt("Bestand Altputz", "Altputz prüfen, Fehlstellen ausbessern, grundieren", [["023.01.001.01001", 1.0], ["034.04.014.01001", 0.2]], True),
             opt("Altputz abschlagen", "Altputz abschlagen, Ausgleichsputz 10 mm", [["023.01.005.03001", 1.0], ["023.01.008.01001", 1.0]]),
         ]},
         {"name": "Dämmung", "optionen": [
             opt("EPS 12", "EPS 032, 12 cm", [["023.04.001.01001", 1.0]], True),
             opt("EPS 14", "EPS 032, 14 cm", [["023.04.001.02001", 1.0]]),
             opt("EPS 16", "EPS 032, 16 cm", [["023.04.001.03001", 1.0]], True),
             opt("EPS 18", "EPS 032, 18 cm", [["023.04.001.04001", 1.0]]),
             opt("EPS 20", "EPS 032, 20 cm", [["023.04.001.05001", 1.0]], True),
             opt("EPS 24", "EPS 032, 24 cm", [["023.04.001.06001", 1.0]], True),
         ]},
         {"name": "Oberfläche", "optionen": [
             ohne("Silikonharzputz hell (im System)", std=True),
             opt("dunkel + Egalis.", "Oberputz dunkel (HBW 10–20) mit Egalisationsanstrich", [["023.04.010.01001", 1.0], ["023.04.011.01001", 1.0]], True),
             opt("Egalisation", "Egalisationsanstrich Silikonharzfarbe", [["023.04.011.01001", 1.0]]),
         ]},
         {"name": "Brandschutz", "optionen": [
             opt("Brandriegel", "Brandriegel Mineralwolle je Geschoss", [["023.04.004.01001", 0.36]], True),
             ohne("ohne Brandriegel (Dämmung ≤ 10 cm bzw. GK 1–3)"),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "335.02", "kg": "335", "name": "WDVS Mineralwolle", "einheit": "m²",
     "lang": "Nichtbrennbares Wärmedämmverbundsystem mit Mineralwolle-Platten bzw. -Lamellen, Armierung und Oberputz, "
             "gedübelt nach Dübelschema.",
     "bezug": "Fassadenfläche, Öffnungen über 2,5 m² abgezogen, Leibungen gesondert",
     "schichten": [
         {"name": "Untergrund", "optionen": [
             ohne("Neubau-Mauerwerk, keine Vorbereitung", std=True),
             opt("Bestand Altputz", "Altputz prüfen, Fehlstellen ausbessern, grundieren", [["023.01.001.01001", 1.0], ["034.04.014.01001", 0.2]], True),
         ]},
         {"name": "Dämmung", "optionen": [
             opt("MW 12", "Mineralwolle-Platte 035, 12 cm", [["023.04.002.01001", 1.0]]),
             opt("MW 16", "Mineralwolle-Platte 035, 16 cm", [["023.04.002.02001", 1.0]], True),
             opt("MW 20", "Mineralwolle-Platte 035, 20 cm", [["023.04.002.03001", 1.0]], True),
             opt("MW 24", "Mineralwolle-Platte 035, 24 cm", [["023.04.002.04001", 1.0]], True),
             opt("MW-Lamelle 12", "Mineralwolle-Lamelle 041, 12 cm", [["023.04.012.01001", 1.0]]),
             opt("MW-Lamelle 16", "Mineralwolle-Lamelle 041, 16 cm", [["023.04.012.02001", 1.0]], True),
             opt("MW-Lamelle 20", "Mineralwolle-Lamelle 041, 20 cm", [["023.04.012.03001", 1.0]]),
         ]},
         {"name": "Dübelung", "optionen": [
             ohne("Standard-Dübelung (im System)", std=True),
             opt("Dübel Randbereich", "erhöhte Dübelanzahl im Randbereich", [["023.04.018.01001", 1.0]]),
             opt("Schraubdübel", "Schraubdübel für Lochstein/Porenbeton", [["023.04.018.03001", 1.0]], True),
             opt("Dübel versenkt", "versenkte Dübelmontage mit Rondelle", [["023.04.018.02001", 1.0]]),
         ]},
         {"name": "Oberfläche", "optionen": [
             ohne("Oberputz hell (im System)", std=True),
             opt("Egalisation", "Egalisationsanstrich Silikonharzfarbe", [["023.04.011.01001", 1.0]]),
             opt("dunkel + Egalis.", "Oberputz dunkel mit Egalisationsanstrich", [["023.04.010.01001", 1.0], ["023.04.011.01001", 1.0]]),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "335.03", "kg": "335", "name": "WDVS Holzfaser / Hochleistung", "einheit": "m²",
     "lang": "Wärmedämmverbundsystem mit Holzfaserdämmplatten (ökologisch, diffusionsoffen) bzw. Resol/PIR-Hartschaum für geringe "
             "Aufbauhöhen, mit Armierung und Oberputz.",
     "bezug": "Fassadenfläche, Öffnungen über 2,5 m² abgezogen, Leibungen gesondert",
     "schichten": [
         {"name": "Untergrund", "optionen": [
             ohne("Neubau, keine Vorbereitung", std=True),
             opt("Bestand Altputz", "Altputz prüfen, Fehlstellen ausbessern, grundieren", [["023.01.001.01001", 1.0], ["034.04.014.01001", 0.2]], True),
         ]},
         {"name": "Dämmung", "optionen": [
             opt("HF 12", "Holzfaser auf Massivwand 12 cm", [["023.04.014.01001", 1.0]], True),
             opt("HF 16", "Holzfaser auf Massivwand 16 cm", [["023.04.014.02001", 1.0]], True),
             opt("HF 20", "Holzfaser auf Massivwand 20 cm", [["023.04.014.03001", 1.0]], True),
             opt("HF 6 Holzbau", "Holzfaser-Putzträger auf Holzbau 6 cm", [["023.04.003.01001", 1.0]]),
             opt("HF 10 Holzbau", "Holzfaser-Putzträger auf Holzbau 10 cm", [["023.04.003.02001", 1.0]]),
             opt("PIR 8", "Resol/PIR 022, 8 cm", [["023.04.013.01001", 1.0]], True),
             opt("PIR 12", "Resol/PIR 022, 12 cm", [["023.04.013.02001", 1.0]], True),
         ]},
         {"name": "Oberfläche", "optionen": [
             ohne("Oberputz hell (im System)", std=True),
             opt("Egalisation", "Egalisationsanstrich", [["023.04.011.01001", 1.0]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "335.04", "kg": "335", "name": "WDVS Bestand sanieren/aufdoppeln", "einheit": "m²",
     "lang": "Sanierung eines bestehenden Wärmedämmverbundsystems: Reinigung bzw. Algenentfernung, Aufdopplung oder Neuarmierung, "
             "Anschlüsse an Fenster und Durchdringungen nacharbeiten.",
     "bezug": "Fassadenfläche, Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Vorbereitung", "optionen": [
             opt("HD-Reinigung", "Fassade mit Heißwasser-Hochdruck reinigen", [["034.04.005.01001", 1.0]], True),
             opt("Algen entfernen", "Algen entfernen, Armierung und Anstrich", [["023.04.016.01001", 1.0]], True),
             opt("Altbesch. entf.", "Altbeschichtung abbeizen, Heißwasser-Hochdruck", [["034.04.012.01001", 1.0]]),
         ]},
         {"name": "Maßnahme", "optionen": [
             opt("Aufdopplung EPS 8", "WDVS-Aufdopplung EPS 8 cm", [["023.04.015.01001", 1.0]], True),
             opt("Aufdopplung EPS 12", "WDVS-Aufdopplung EPS 12 cm", [["023.04.015.02001", 1.0]], True),
             opt("Neuarmierung", "Armierungsspachtel mit Gewebe, Silikonharzanstrich", [["034.04.011.02001", 1.0], ["034.04.004.01001", 1.0]], True),
         ]},
         {"name": "Anschlüsse", "optionen": [
             opt("Anschl. nacharb.", "Fensteranschlüsse und Durchdringungen nacharbeiten", [["023.04.017.01001", 0.3], ["023.04.021.01001", 0.05]], True),
             ohne("ohne Anschlussarbeiten"),
         ]},
         {"name": "Oberfläche", "optionen": [
             ohne("Oberfläche im System", std=True),
             opt("Egalisation", "Egalisationsanstrich", [["023.04.011.01001", 1.0]], True),
         ]},
     ], "tags": ["altbau"]},

    {"id": "335.05", "kg": "335", "name": "Außenputz mineralisch, Neubau", "einheit": "m²",
     "lang": "Zweilagiger mineralischer Außenputz auf Mauerwerk mit Putzprofilen (Abschluss- und Sockelprofil), wahlweise mit "
             "Fassadenanstrich.",
     "bezug": "Fassadenfläche, Öffnungen über 2,5 m² abgezogen, Leibungen gesondert",
     "fest": [["023.01.003.03001", 0.3], ["023.01.003.04001", 0.15]],
     "schichten": [
         {"name": "Untergrund", "optionen": [
             ohne("ohne Vorbehandlung", std=True),
             opt("Spritzbewurf", "Spritzbewurf vollflächig", [["023.01.001.03001", 1.0]], True),
             opt("Putzträger", "Putzträger über Mischmauerwerk, ca. 0,3 m/m²", [["023.01.002.01001", 0.3]]),
         ]},
         {"name": "Putz", "optionen": AUSSENPUTZ},
         {"name": "Anstrich", "optionen": [
             ohne("ohne Anstrich (durchgefärbt)", std=True),
             opt("Silikonharz", "Fassadenanstrich Silikonharzfarbe zweimal", [["034.04.004.01001", 1.0]], True),
             opt("Silikat", "Fassadenanstrich Dispersions-Silikatfarbe zweimal", [["034.04.004.02001", 1.0]]),
             opt("Reinacrylat", "Fassadenanstrich Reinacrylat zweimal", [["034.04.004.03001", 1.0]]),
         ]},
     ], "tags": ["neubau"]},

    {"id": "335.06", "kg": "335", "name": "Außenputz Bestand instandsetzen", "einheit": "m²",
     "lang": "Instandsetzung von Außenputz im Bestand: Untergrund vorbereiten, Putz ausbessern bzw. armieren oder erneuern, "
             "Fassadenanstrich.",
     "bezug": "Fassadenfläche, Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Vorbereitung", "optionen": [
             opt("HD-Reinigung", "Fassade mit Heißwasser-Hochdruck reinigen", [["034.04.005.01001", 1.0]], True),
             opt("Altbesch. abbeizen", "Altbeschichtung abbeizen und abwaschen", [["034.04.012.01001", 1.0]], True),
             opt("Partikelstrahlen", "Altbeschichtung durch Partikelstrahlen entfernen", [["034.04.012.02001", 1.0]]),
         ]},
         {"name": "Putz", "optionen": [
             opt("ausbessern", "Putz in Teilflächen ausbessern (ca. 20 %)", [["034.04.014.02001", 0.2]], True),
             opt("Armierungsputz", "Fehlstellen ausbessern, Armierungsputz mit Gewebe vollflächig", [["034.04.014.02001", 0.1], ["023.03.006.01001", 1.0]], True),
             opt("Neuputz", "Altputz abschlagen, Kalkzementputz mit Scheibenputz neu", [["023.01.005.03001", 1.0], ["023.03.005.01001", 1.0]], True),
             opt("Faserfüller", "Risssanierung mit Faserfüller vollflächig", [["034.04.011.01001", 1.0]]),
         ]},
         {"name": "Anstrich", "optionen": [
             opt("Silikonharz", "Silikonharzfarbe zweimal", [["034.04.004.01001", 1.0]], True),
             opt("Silikat", "Dispersions-Silikatfarbe zweimal", [["034.04.004.02001", 1.0]], True),
             opt("Reinacrylat", "Reinacrylat-Fassadenfarbe zweimal", [["034.04.004.03001", 1.0]]),
         ]},
     ], "tags": ["altbau"]},

    {"id": "335.07", "kg": "335", "name": "Fassadenanstrich", "einheit": "m²",
     "lang": "Renovierungsanstrich einer verputzten Fassade mit Vorbereitung und Zusatzschutz nach Wahl.",
     "bezug": "Fassadenfläche, Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Vorbereitung", "optionen": [
             opt("HD-Reinigung", "Heißwasser-Hochdruckreinigung", [["034.04.005.01001", 1.0]], True),
             opt("Faserfüller", "Reinigung, Faserfüller-Zwischenbeschichtung", [["034.04.005.01001", 1.0], ["034.04.011.01001", 1.0]], True),
             opt("Altbesch. entf.", "Altbeschichtung entfernen", [["034.04.012.01001", 1.0]]),
         ]},
         {"name": "Anstrich", "optionen": [
             opt("Silikonharz", "Silikonharzfarbe zweimal", [["034.04.004.01001", 1.0]], True),
             opt("Silikat", "Dispersions-Silikatfarbe zweimal", [["034.04.004.02001", 1.0]], True),
             opt("Reinacrylat", "Reinacrylat-Fassadenfarbe zweimal", [["034.04.004.03001", 1.0]], True),
         ]},
         {"name": "Zusatz", "optionen": [
             opt("Sockelanstrich", "wasserabweisender Sockelanstrich (ca. 10 %)", [["034.04.003.01001", 0.1]], True),
             opt("Graffitischutz", "Graffitischutz im Erdgeschoss (ca. 30 %)", [["034.04.009.01001", 0.3]], True),
             ohne("ohne Zusatz"),
         ]},
     ], "tags": ["altbau"]},

    {"id": "335.08", "kg": "335", "name": "VHF mineralische Platten", "einheit": "m²",
     "lang": "Vorgehängte hinterlüftete Fassade mit Unterkonstruktion, Mineralwolledämmung und Bekleidung aus Faserzement, HPL, "
             "Keramik, Glas oder Riemchen-/Putzträgerplatten, mit Brandsperren, Ecken und oberem Abschluss.",
     "bezug": "bekleidete Fassadenfläche, Öffnungen über 2,5 m² abgezogen, Leibungen gesondert",
     "fest": VHF_FEST,
     "schichten": [
         {"name": "Unterkonstruktion + Dämmung", "optionen": UK_DAEMM},
         {"name": "Bekleidung", "optionen": [dict(o, std=o["k"] in ("Faserzement", "HPL", "Keramik", "Riemchen VHF", "Putzträger VHF")) for o in VHF_MINERAL]},
         {"name": "Fugen", "optionen": [
             opt("offene Fugen", "offene Fugen mit UV-beständiger Fassadenbahn", [["038.01.004.01001", 1.0]], True),
             ohne("geschlossene Fugen / Fugenprofile", std=True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "335.09", "kg": "335", "name": "VHF Metall", "einheit": "m²",
     "lang": "Vorgehängte hinterlüftete Metallfassade aus Kassetten, Stehfalz-, Well- oder Lochblechen auf Alu-Unterkonstruktion "
             "mit Mineralwolledämmung, Brandsperren und Anschlussprofilen.",
     "bezug": "bekleidete Fassadenfläche, Öffnungen über 2,5 m² abgezogen, Leibungen gesondert",
     "fest": VHF_FEST,
     "schichten": [
         {"name": "Unterkonstruktion + Dämmung", "optionen": [dict(o, std=o["k"] in ("UK Alu + MW 16", "UK Alu + MW 20")) for o in UK_DAEMM]},
         {"name": "Bekleidung", "optionen": [
             opt("Alu-Kassette 2", "Alu-Kassetten 2 mm, pulverbeschichtet", [["038.05.001.01001", 1.0]], True),
             opt("Alu-Kass. 3 elox", "Alu-Kassetten 3 mm, eloxiert", [["038.05.001.02001", 1.0]]),
             opt("Edelstahl-Kass.", "Edelstahl-Kassetten 1,2 mm, geschliffen", [["038.05.001.03001", 1.0]]),
             opt("Cortenstahl", "Cortenstahl-Kassetten 2 mm", [["038.05.001.04001", 1.0]], True),
             opt("Titanzink-Kass.", "Titanzink-Kassetten vorbewittert", [["038.05.001.05001", 1.0]], True),
             opt("Kupfer-Kassette", "Kupfer-Kassetten vorbewittert", [["038.05.001.06001", 1.0]]),
             opt("Stehfalz TiZn", "Winkelstehfalz Titanzink", [["022.03.004.01001", 1.0]], True),
             opt("Stehfalz Kupfer", "Winkelstehfalz Kupfer 0,7 mm", [["022.03.004.02001", 1.0]]),
             opt("Alu-Sinuswelle", "Alu-Sinuswelle/Trapez beschichtet", [["038.02.001.08001", 1.0]], True),
             opt("Streckmetall", "Alu-Streckmetall", [["038.05.002.01001", 1.0]], True),
             opt("Lochblech", "Alu-Lochblech 3 mm", [["038.05.002.02001", 1.0]]),
             opt("Edelstahlgewebe", "Edelstahl-Drahtgewebe als Prallschale", [["038.05.002.03001", 1.0]]),
         ]},
         {"name": "Zulage", "optionen": [
             ohne("ebene Fläche", std=True),
             opt("Rundung R ≥ 5 m", "Bogen/Rundung Radius ≥ 5 m", [["038.05.005.01001", 1.0]]),
             opt("Rundung R ≥ 2 m", "Bogen/Rundung Radius ≥ 2 m", [["038.05.005.02001", 1.0]]),
             opt("offene Fugen", "Fassadenbahn für offene Fugen", [["038.01.004.01001", 1.0]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "335.10", "kg": "335", "name": "VHF Holz", "einheit": "m²",
     "lang": "Hinterlüftete Holzfassade auf Holz-Unterkonstruktion mit Dämmung, Fassadenbahn und Insektenschutz, Schalungsart und "
             "Holzart nach Wahl, Oberfläche unbehandelt oder beschichtet.",
     "bezug": "bekleidete Fassadenfläche, Öffnungen über 2,5 m² abgezogen, Leibungen gesondert",
     "fest": [["038.01.002.01001", 1.0], ["016.02.008.01001", 1.0], ["038.03.004.01001", 0.1]],
     "schichten": [
         {"name": "Dämmung", "optionen": [
             opt("MW 12", "Mineralwolle 035, 120 mm zwischen Lattung", [["038.01.003.01001", 1.0]], True),
             opt("MW 16", "Mineralwolle 035, 160 mm zwischen Lattung", [["038.01.003.02001", 1.0]], True),
             ohne("ohne Dämmung (Holzbau gedämmt)", std=True),
         ]},
         {"name": "Schalung", "optionen": [
             opt("Stülp Fichte", "Stülpschalung Fichte/Tanne", [["038.05.004.01001", 1.0]]),
             opt("Stülp Lärche", "Stülpschalung Lärche", [["038.05.004.02001", 1.0]], True),
             opt("Stülp Douglasie", "Stülpschalung Douglasie", [["038.05.004.03001", 1.0]]),
             opt("Boden-Deckel Fi", "Boden-Deckel-Schalung Fichte/Tanne", [["038.05.004.04001", 1.0]], True),
             opt("Boden-Deckel Lä", "Boden-Deckel-Schalung Lärche", [["038.05.004.05001", 1.0]]),
             opt("Boden-Deckel Dou", "Boden-Deckel-Schalung Douglasie", [["038.05.004.06001", 1.0]]),
             opt("N+F Fichte", "Nut-und-Feder-Schalung Fichte/Tanne", [["038.05.004.07001", 1.0]]),
             opt("N+F Lärche", "Nut-und-Feder-Schalung Lärche", [["038.05.004.08001", 1.0]]),
             opt("Leisten Lärche", "Leistenschalung offen Lärche", [["038.05.004.11001", 1.0]], True),
             opt("Leisten Douglasie", "Leistenschalung offen Douglasie", [["038.05.004.12001", 1.0]]),
             opt("Rhombus Lärche", "Rhombusleisten Lärche 24 × 68 mm", [["038.02.002.01001", 1.0]], True),
             opt("Rhombus Thermo", "Rhombusleisten Thermoholz Kiefer", [["038.02.002.02001", 1.0]], True),
         ]},
         {"name": "Oberfläche", "optionen": [
             ohne("unbehandelt, natürliche Vergrauung", std=True),
             opt("Vergrauungslasur", "Vergrauungslasur einmal", [["034.04.001.02001", 1.0]], True),
             opt("deckend", "Holzschutzfarbe deckend zweimal", [["034.04.001.01001", 1.0]]),
             opt("Dünnschichtlasur", "Imprägniergrund und Dünnschichtlasur", [["034.03.002.08001", 1.0]]),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "335.11", "kg": "335", "name": "VHF Naturstein", "einheit": "m²",
     "lang": "Hinterlüftete Natursteinfassade aus 3–4 cm starken Platten mit zugelassenen Ankern auf Alu-Unterkonstruktion, "
             "Mineralwolledämmung, Brandsperren und Eckausbildung.",
     "bezug": "bekleidete Fassadenfläche, Öffnungen über 2,5 m² abgezogen, Leibungen gesondert",
     "fest": VHF_FEST,
     "schichten": [
         {"name": "Unterkonstruktion + Dämmung", "optionen": [dict(o, std=o["k"] in ("UK Alu + MW 16", "UK Alu + MW 20")) for o in UK_DAEMM[:4]]},
         {"name": "Naturstein", "optionen": [
             opt("Granit 3 cm", "Granit 3 cm, geschliffen", [["014.05.001.01001", 1.0]], True),
             opt("Kalkstein 3 cm", "Kalkstein 3 cm, geschliffen", [["014.05.001.02001", 1.0]], True),
             opt("Sandstein 4 cm", "Sandstein 4 cm, geschliffen", [["014.05.001.03001", 1.0]], True),
             opt("Travertin 3 cm", "Travertin 3 cm, geschliffen", [["014.05.001.04001", 1.0]], True),
         ]},
         {"name": "Schutz", "optionen": [
             ohne("ohne Imprägnierung", std=True),
             opt("Hydrophobierung", "Hydrophobierung Silan/Siloxan", [["014.06.007.02001", 1.0]], True),
             opt("Anti-Graffiti", "Anti-Graffiti-Schutz permanent", [["014.06.007.03001", 1.0]]),
         ]},
     ], "tags": ["neubau"]},

    {"id": "335.12", "kg": "335", "name": "Klinker-Vorsatzschale + Kerndämmung", "einheit": "m²",
     "lang": "Vormauerschale aus Klinker mit Kerndämmung Mineralwolle, Drahtankern und Fußpunktsperre vor bestehender bzw. "
             "gesondert erfasster tragender Wand.",
     "bezug": "Ansichtsfläche der Vorsatzschale, Öffnungen über 2,5 m² abgezogen",
     "fest": [["012.01.002.01001", 0.36]],
     "schichten": [
         {"name": "Kerndämmung", "optionen": [
             opt("KD MW 12", "Kerndämmung Mineralwolle 12 cm", [["012.02.007.01001", 1.0]], True),
             opt("KD MW 14", "Kerndämmung Mineralwolle 14 cm", [["012.02.007.02001", 1.0]]),
             opt("KD MW 16", "Kerndämmung Mineralwolle 16 cm", [["012.02.007.03001", 1.0]], True),
             opt("KD MW 20", "Kerndämmung Mineralwolle 20 cm", [["012.02.007.04001", 1.0]], True),
         ]},
         {"name": "Klinker", "optionen": [
             opt("Klinker NF", "Klinker NF, Fugenglattstrich", [["012.02.006.01001", 1.0]], True),
             opt("Klinker DF", "Klinker DF, Fugenglattstrich", [["012.02.006.02001", 1.0]], True),
             opt("Klinker WDF", "Klinker WDF, Fugenglattstrich", [["012.02.006.03001", 1.0]], True),
         ]},
         {"name": "Schutz", "optionen": [
             ohne("ohne Imprägnierung", std=True),
             opt("Hydrophobierung", "Hydrophobierung Sichtmauerwerk", [["034.04.013.01001", 1.0]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "335.13", "kg": "335", "name": "Klinkerriemchen geklebt", "einheit": "m²",
     "lang": "Wandbekleidung aus Klinker- bzw. Ziegelriemchen im Dünnbett auf Ausgleichs- bzw. Armierungsputz, verfugt.",
     "bezug": "bekleidete Fläche, Öffnungen über 0,1 m² abgezogen",
     "schichten": [
         {"name": "Untergrund", "optionen": [
             opt("Ausgleichsputz", "Ausgleichsputz bis 10 mm", [["023.01.008.01001", 1.0]], True),
             opt("Armierungsputz", "Armierungsputz mit Gewebe", [["023.03.006.01001", 1.0]], True),
         ]},
         {"name": "Riemchen", "optionen": [
             opt("Riemchen ≤ 35 €", "Klinkerriemchen, Material bis 35 €/m²", [["024.02.001.01001", 1.0]], True),
             opt("Riemchen ≤ 60 €", "Klinkerriemchen, Material bis 60 €/m²", [["024.02.001.02001", 1.0]], True),
         ]},
         {"name": "Schutz", "optionen": [
             ohne("ohne Imprägnierung", std=True),
             opt("Hydrophobierung", "Hydrophobierung", [["034.04.013.01001", 1.0]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "335.14", "kg": "335", "name": "Sockelbekleidung", "einheit": "m²",
     "lang": "Sockelzone der Fassade (Spritzwasserbereich bis ca. 30 cm unter Gelände): Sockeldämmung, Sockelabdichtung, "
             "Oberfläche und Abschlussprofil.",
     "bezug": "Sockelfläche (Länge × Sockelhöhe ca. 0,6 m)",
     "fest": [["018.03.001.01001", 1.7]],
     "schichten": [
         {"name": "Sockeldämmung", "optionen": [
             opt("XPS 12", "Sockeldämmung XPS/Perimeter im WDVS 12 cm", [["023.04.005.01001", 1.0]], True),
             opt("XPS 16", "Sockeldämmung XPS/Perimeter im WDVS 16 cm", [["023.04.005.02001", 1.0]], True),
             opt("Sockelputz", "ohne Dämmung, Zementsockelputz", [["023.03.003.01001", 1.0]]),
         ]},
         {"name": "Oberfläche", "optionen": [
             ohne("Putz im System", std=True),
             opt("Sockelanstrich", "wasserabweisender Sockelanstrich", [["034.04.003.01001", 1.0]], True),
             opt("Riemchen", "Klinkerriemchen im Dünnbett", [["024.02.001.01001", 1.0]], True),
             opt("Sockel VHF", "Sockelbekleidung VHF Faserzement/HPL", [["038.02.003.01001", 1.7]]),
         ]},
         {"name": "Abschluss", "optionen": [
             opt("Sockelprofil", "Sockelabschlussprofil", [["023.01.003.04001", 1.7]], True),
             opt("Tropfblech", "Sockelabschlussblech Alu mit Tropfkante", [["022.03.003.01001", 1.7]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "335.15", "kg": "335", "name": "Sichtmauerwerk Bestand sanieren", "einheit": "m²",
     "lang": "Sanierung von Sicht- bzw. Klinkermauerwerk im Bestand: Reinigung, Neuverfugung, Steinaustausch, Hydrophobierung.",
     "bezug": "Ansichtsfläche, Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Reinigung", "optionen": [
             opt("HD-Reinigung", "Heißwasser-Hochdruckreinigung", [["034.04.005.01001", 1.0]], True),
             opt("Partikelstrahlen", "Partikelstrahlen Niederdruck", [["034.04.012.02001", 1.0]], True),
         ]},
         {"name": "Fugen", "optionen": [
             opt("reinigen+verfugen", "Mauerwerk reinigen und neu verfugen", [["012.04.010.01001", 1.0]], True),
             opt("Kalk NHL", "Fugen auskratzen, Kalkmörtel NHL", [["012.06.007.01001", 1.0]], True),
             opt("Trasskalk", "Fugen auskratzen, Trasskalkmörtel", [["012.06.007.02001", 1.0]], True),
             ohne("Fugen bleiben"),
         ]},
         {"name": "Steinaustausch", "optionen": [
             ohne("ohne Steinaustausch", std=True),
             opt("Steine 0,5/m²", "Steine NF auswechseln, ca. 0,5 St/m²", [["012.06.004.01001", 0.5]]),
             opt("Maueranker", "Maueranker Edelstahl nachträglich, 2 St/m²", [["012.06.005.01001", 2.0]]),
         ]},
         {"name": "Schutz", "optionen": [
             opt("Hydrophobierung", "Hydrophobierung Sichtmauerwerk", [["034.04.013.01001", 1.0]], True),
             ohne("ohne Imprägnierung", std=True),
         ]},
     ], "tags": ["altbau"]},

    {"id": "335.16", "kg": "335", "name": "Holzfassade Bestand renovieren", "einheit": "m²",
     "lang": "Renovierung einer bestehenden Holzfassade: Reinigung und Entfernen loser Altanstriche, Teilerneuerung schadhafter "
             "Bretter, neue Beschichtung.",
     "bezug": "Fassadenfläche Holz, Öffnungen über 2,5 m² abgezogen",
     "fest": [["016.06.007.01001", 1.0]],
     "schichten": [
         {"name": "Teilerneuerung", "optionen": [
             ohne("ohne Teilerneuerung", std=True),
             opt("10 % erneuern", "schadhafte Bretter erneuern (ca. 10 %, Lärche)", [["038.05.004.05001", 0.1]], True),
             opt("25 % erneuern", "schadhafte Bretter erneuern (ca. 25 %, Lärche)", [["038.05.004.05001", 0.25]]),
         ]},
         {"name": "Beschichtung", "optionen": [
             opt("deckend", "Holzschutzfarbe deckend zweimal", [["034.04.001.01001", 1.0]], True),
             opt("Vergrauungslasur", "Vergrauungslasur einmal", [["034.04.001.02001", 1.0]], True),
             opt("Dünnschichtlasur", "Imprägniergrund und Dünnschichtlasur", [["034.03.002.08001", 1.0]], True),
         ]},
     ], "tags": ["altbau"]},

    {"id": "335.17", "kg": "335", "name": "Faschen, Gesimse, Abdeckungen", "einheit": "m",
     "lang": "Gliederungselemente der Putzfassade: Faschen und Gesimse aus Putz gezogen bzw. abgesetzt, mit Blechabdeckung.",
     "bezug": "Länge der Faschen bzw. Gesimse",
     "schichten": [
         {"name": "Fasche/Gesims", "optionen": [
             opt("Fasche ≤ 20 cm", "Fensterfasche abgesetzt, Breite bis 20 cm", [["023.01.010.03001", 1.0]], True),
             opt("gezogen ≤ 20 cm", "Fasche/Gesims gezogen, Abwicklung bis 20 cm", [["023.03.008.01001", 1.0]], True),
             opt("gezogen ≤ 40 cm", "Gesims gezogen, Abwicklung bis 40 cm", [["023.03.008.02001", 1.0]], True),
             opt("Tropfkante", "Tropfkante/Anschlussprofil", [["023.03.009.01001", 1.0]], True),
         ]},
         {"name": "Abdeckung", "optionen": [
             ohne("ohne Abdeckung", std=True),
             opt("Blech ≤ 250", "Gesimsabdeckung Blech, Zuschnitt bis 250 mm", [["022.03.007.01001", 1.0]], True),
             opt("Blech ≤ 400", "Gesimsabdeckung Blech, Zuschnitt bis 400 mm", [["022.03.007.02001", 1.0]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    # ================================================================ 336 Außenwandbekleidungen innen
    {"id": "336.01", "kg": "336", "name": "Innenputz + Anstrich an Außenwand", "einheit": "m²",
     "lang": "Innenseite massiver Außenwände: Untergrundvorbehandlung, Innenputz, Eckschutzprofile und Oberfläche nach Wahl.",
     "bezug": "Wandfläche innen, Öffnungen über 2,5 m² abgezogen, Leibungen gesondert",
     "fest": [["023.01.003.01001", 0.15]],
     "schichten": [
         {"name": "Untergrund", "optionen": [
             opt("Grundierung", "Grundierung saugfähiger Untergrund", [["023.01.001.01001", 1.0]], True),
             opt("Haftbrücke", "Haftbrücke auf Beton", [["023.01.001.02001", 1.0]], True),
             ohne("ohne Vorbehandlung"),
         ]},
         {"name": "Putz", "optionen": [
             opt("Gips 10 Q2", "Gipsputz 10 mm, Q2", [["023.02.001.01001", 1.0]], True),
             opt("Gips 15 Q3", "Gipsputz 15 mm, Q3", [["023.02.001.02001", 1.0]], True),
             opt("Kalk-Gips 15", "Kalk-Gipsputz 15 mm, gefilzt", [["023.02.001.03001", 1.0]]),
             opt("KZ 15", "Kalkzementputz 15 mm, abgerieben", [["023.02.001.04001", 1.0]], True),
             opt("Kalk 15", "Kalkputz 15 mm, gefilzt", [["023.02.001.05001", 1.0]], True),
             opt("Lehm 20", "Lehmputz zweilagig 20 mm", [["023.02.001.06001", 1.0]]),
         ]},
         {"name": "Oberfläche", "optionen": [
             opt("Dispersion Kl. 3", "Dispersionsanstrich Nassabrieb Kl. 3", [["034.02.001.01001", 1.0]], True),
             opt("Dispersion Kl. 2", "Dispersionsanstrich Nassabrieb Kl. 2", [["034.02.001.02001", 1.0]]),
             opt("Silikat", "Silikatanstrich zweimal", [["034.02.002.01001", 1.0]], True),
             opt("Kalk", "Kalkanstrich zweimal", [["034.02.007.01001", 1.0]]),
             opt("Q3 + Dispersion", "Flächenspachtel Q3, Dispersionsanstrich", [["034.01.003.01001", 1.0], ["034.02.001.01001", 1.0]], True),
             opt("Rollputz", "Strukturanstrich/Rollputz fein", [["034.02.008.01001", 1.0]]),
             ohne("ohne Anstrich"),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "336.02", "kg": "336", "name": "Vorsatzschale/Trockenputz innen", "einheit": "m²",
     "lang": "Innenbekleidung der Außenwand in Trockenbauweise als freistehende bzw. direkt befestigte Vorsatzschale oder "
             "angesetzter Trockenputz, mit Hohlraumdämmung und Oberfläche.",
     "bezug": "bekleidete Wandfläche, Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Vorsatzschale", "optionen": [
             opt("VSS CW 50, 1-lag.", "freistehende Vorsatzschale CW 50, 1 × 12,5 mm GKB", [["039.03.001.01001", 1.0]], True),
             opt("VSS CW 50, 2-lag.", "freistehende Vorsatzschale CW 50, 2 × 12,5 mm GKB", [["039.03.001.02001", 1.0]], True),
             opt("VSS direkt", "direkt befestigte Vorsatzschale, 1 × 12,5 mm GKB", [["039.03.001.03001", 1.0]], True),
             opt("Trockenputz", "Trockenputz Gipsplatten angesetzt 12,5 mm", [["039.03.005.01001", 1.0]]),
             opt("OSB 15", "Wandbekleidung OSB/3 15 mm", [["039.03.009.01001", 1.0]]),
         ]},
         {"name": "Hohlraumdämmung", "optionen": [
             ohne("ohne Dämmung", std=True),
             opt("MW 40", "Mineralwolle 40 mm", [["039.04.002.01001", 1.0]], True),
             opt("MW 100 + DB", "Mineralwolle 100 mm mit Dampfbremse", [["039.04.002.02001", 1.0], ["016.03.005.01001", 1.0]]),
         ]},
         {"name": "Oberfläche", "optionen": [
             opt("Q2 + Dispersion", "Spachtelung Q2, Dispersionsanstrich", [["034.02.001.01001", 1.0]], True),
             opt("Q3 + Dispersion", "Spachtelung Q3, Dispersionsanstrich", [["034.02.013.01001", 1.0], ["034.02.001.01001", 1.0]], True),
             opt("Q4 + Dispersion", "Spachtelung Q4, Dispersionsanstrich", [["034.02.013.03001", 1.0], ["034.02.001.01001", 1.0]]),
             opt("Fliesen 30×60", "imprägnierte Platten, Abdichtung, Wandfliesen 30 × 60", [["039.01.009.01001", 1.0], ["024.01.002.01001", 1.0], ["024.02.003.02001", 1.0]]),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "336.03", "kg": "336", "name": "Innendämmung Außenwand", "einheit": "m²",
     "lang": "Innendämmung von Außenwänden (vor allem im Bestand bzw. bei Denkmalschutz) mit Verbundplatten, kapillaraktiven "
             "Systemen, Wärmedämmputz oder gedämmter Vorsatzschale, einschließlich Untergrundvorbereitung und Oberfläche.",
     "bezug": "gedämmte Wandfläche, Öffnungen über 2,5 m² abgezogen; Leibungen und Flankendämmung gesondert",
     "schichten": [
         {"name": "Untergrund", "optionen": [
             opt("Ausgleichsputz", "Ausgleichsputz bis 10 mm", [["023.01.008.01001", 1.0]], True),
             opt("Altputz + Ausgl.", "Altputz innen abschlagen, Ausgleichsputz", [["023.01.005.01001", 1.0], ["023.01.008.01001", 1.0]], True),
             ohne("Untergrund tragfähig und eben"),
         ]},
         {"name": "Dämmsystem", "optionen": [
             opt("Gips-EPS 60", "Verbundplatte Gipsplatte mit EPS und Dampfbremse 60 mm", [["039.03.006.01001", 1.0]], True),
             opt("CaSi 50", "Calciumsilikatplatte kapillaraktiv 50 mm", [["039.03.006.02001", 1.0]], True),
             opt("Holzfaser 60", "Holzfaser-Innendämmung 60 mm mit Putz", [["039.03.006.03001", 1.0]], True),
             opt("Dämmputz 30", "Wärmedämmputz innen 30 mm", [["023.02.009.01001", 1.0]]),
             opt("Dämmputz 50", "Wärmedämmputz innen 50 mm", [["023.02.009.02001", 1.0]], True),
             opt("VSS + MW 100", "Vorsatzschale CW 50, MW 100 mm, Dampfbremse",
                 [["039.03.001.01001", 1.0], ["039.04.002.02001", 1.0], ["016.03.005.01001", 1.0]]),
         ]},
         {"name": "Oberfläche", "optionen": [
             opt("Silikat", "Silikatanstrich zweimal", [["034.02.002.01001", 1.0]], True),
             opt("Kalk", "Kalkanstrich zweimal", [["034.02.007.01001", 1.0]], True),
             opt("Dispersion", "Dispersionsanstrich", [["034.02.001.01001", 1.0]]),
             opt("Lehmfarbe", "Lehmfarbe zweimal", [["034.02.007.03001", 1.0]]),
         ]},
     ], "tags": ["altbau"]},

    {"id": "336.04", "kg": "336", "name": "Fliesen an Außenwand innen", "einheit": "m²",
     "lang": "Wandfliesen an der Innenseite von Außenwänden (Bad, Küche, Technik) auf Putzuntergrund, mit Untergrundvorbereitung "
             "bzw. Verbundabdichtung, Fliesen im Dünnbett, verfugt.",
     "bezug": "geflieste Wandfläche, Öffnungen über 0,1 m² abgezogen",
     "schichten": [
         {"name": "Putz", "optionen": [
             opt("KZ-Putz", "Kalkzementputz 15 mm als Fliesenuntergrund", [["023.02.001.04001", 1.0]], True),
             ohne("vorhandener Putz/Untergrund", std=True),
         ]},
         {"name": "Untergrund", "optionen": [
             opt("Grundierung + Sp.", "Grundierung und Spachtelung ≤ 3 mm", [["024.01.001.01001", 1.0], ["024.01.001.02001", 1.0]], True),
             opt("Verbundabdichtung", "Grundierung, Verbundabdichtung W1-I/W2-I", [["024.01.001.01001", 1.0], ["024.01.002.01001", 1.0]], True),
         ]},
         {"name": "Fliesen", "optionen": [
             opt("20×25 ≤ 20 €", "Wandfliesen 20 × 25 cm, Material bis 20 €/m²", [["024.02.003.01001", 1.0]], True),
             opt("30×60 ≤ 30 €", "Wandfliesen 30 × 60 cm, Material bis 30 €/m²", [["024.02.003.02001", 1.0]], True),
             opt("30×60 ≤ 50 €", "Wandfliesen 30 × 60 cm, Material bis 50 €/m²", [["024.02.003.03001", 1.0]]),
             opt("60×120", "Wandfliesen 60 × 120 cm, Material bis 50 €/m²", [["024.02.003.04001", 1.0]], True),
             opt("Metro 7,5×30", "Metrofliesen 7,5 × 30 cm", [["024.02.007.06001", 1.0]], True),
             opt("Mosaik 5×5", "Mosaik 5 × 5 cm", [["024.02.004.02001", 1.0]]),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "336.05", "kg": "336", "name": "Holz-/Akustikbekleidung innen", "einheit": "m²",
     "lang": "Wandbekleidung an der Innenseite von Außenwänden aus Holz, Holzwerkstoff oder Akustikpaneelen, wahlweise auf "
             "gedämmter Installationsebene.",
     "bezug": "bekleidete Wandfläche, Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Unterkonstruktion", "optionen": [
             ohne("direkt befestigt", std=True),
             opt("Inst.-Ebene 40", "Lattung 40/60 mm mit Dämmung 40 mm", [["016.04.003.01001", 1.0]], True),
         ]},
         {"name": "Bekleidung", "optionen": [
             opt("Profilbrett", "Holz-Nut-und-Feder-Profilbrett", [["027.03.002.04001", 1.0]], True),
             opt("Dreischichtplatte", "Dreischichtplatte 19 mm", [["039.03.009.03001", 1.0]], True),
             opt("Furnier Eiche", "Furnierplatte Eiche, geschlossen", [["027.03.002.01001", 1.0]], True),
             opt("Akustik gelocht", "Akustikpaneel gelocht mit Vlies", [["027.03.002.02001", 1.0]]),
             opt("Lamellen Akustik", "Holzlamellen auf Akustikfilz", [["027.03.002.03001", 1.0]], True),
             opt("OSB 22", "OSB/3 22 mm", [["039.03.009.02001", 1.0]]),
             opt("Prallwand", "ballwurfsichere Bekleidung Gipsfaser zweilagig", [["039.03.010.01001", 1.0]]),
         ]},
         {"name": "Oberfläche", "optionen": [
             ohne("werkseitig fertig / unbehandelt", std=True),
             opt("lasiert", "zweimal farblos lasiert", [["034.02.014.01001", 1.0]], True),
             opt("deckend", "deckend lackiert", [["034.02.014.02001", 1.0]]),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "336.06", "kg": "336", "name": "Kellerwand innen Sanierputz", "einheit": "m²",
     "lang": "Innenseite feuchter bzw. salzbelasteter Kelleraußenwände im Bestand: Altputz entfernen, Innenabdichtung, "
             "Sanierputzsystem WTA und diffusionsoffener Anstrich.",
     "bezug": "Wandfläche innen, Öffnungen über 2,5 m² abgezogen",
     "schichten": [
         {"name": "Vorbereitung", "optionen": [
             opt("Salzputz entf.", "salzbelasteten Putz entfernen, Mauerwerk vorbereiten", [["023.01.007.01001", 1.0]], True),
             opt("Altputz abschl.", "Altputz innen abschlagen", [["023.01.005.01001", 1.0]], True),
         ]},
         {"name": "Innenabdichtung", "optionen": [
             ohne("ohne Abdichtung", std=True),
             opt("mineral. Abdicht.", "mineralisches Abdichtungssystem innen", [["018.04.002.01001", 1.0]], True),
         ]},
         {"name": "Sanierputz", "optionen": [
             opt("WTA 2 cm", "Sanierputzsystem WTA 20 mm", [["023.02.008.01001", 1.0]], True),
             opt("WTA 3 cm", "Sanierputzsystem WTA 30 mm", [["023.02.008.02001", 1.0]], True),
             opt("WTA 4 cm", "Sanierputzsystem WTA 40 mm", [["023.02.008.03001", 1.0]]),
         ]},
         {"name": "Anstrich", "optionen": [
             opt("Silikat", "Silikatanstrich", [["034.02.002.01001", 1.0]], True),
             opt("Kalk/Silikat 1×", "Kalk- bzw. Silikatfarbe einmal", [["034.04.002.01001", 1.0]]),
             opt("schimmelhemmend", "schimmelhemmender Mineralanstrich", [["034.02.010.01001", 1.0]]),
         ]},
     ], "tags": ["altbau"]},

    {"id": "336.07", "kg": "336", "name": "Innenputz Bestand instandsetzen", "einheit": "m²",
     "lang": "Instandsetzung des Innenputzes an Außenwänden im Bestand: Hohlstellen und Risse sanieren, Teilflächen ausbessern "
             "bzw. Dünnlagenputz, neuer Anstrich.",
     "bezug": "Wandfläche innen, Öffnungen über 2,5 m² abgezogen",
     "fest": [["023.01.006.01001", 1.0]],
     "schichten": [
         {"name": "Putz", "optionen": [
             opt("ausbessern 10 %", "Altputz in Teilflächen bis 2 m² ausbessern (ca. 10 %)", [["023.02.006.02001", 0.1]], True),
             opt("ausbessern + Riss", "Teilflächen ausbessern (10 %), Risse mit Gewebe (0,3 m/m²)", [["023.02.006.02001", 0.1], ["023.02.013.01001", 0.3]], True),
             opt("Dünnputz + Gewebe", "Armierungsgewebe und Dünnlagenputz vollflächig", [["023.02.007.01001", 1.0], ["023.02.003.01001", 1.0]], True),
         ]},
         {"name": "Vorbehandlung", "optionen": [
             opt("Tiefgrund", "Tiefgrund lösemittelfrei", [["034.01.002.01001", 1.0]], True),
             opt("Sperrgrund", "Sperrgrund gegen Verfärbungen", [["034.01.002.02001", 1.0]]),
             opt("Altanstrich entf.", "lose Altanstriche abstoßen, Fehlstellen spachteln", [["034.01.002.03001", 1.0]]),
         ]},
         {"name": "Anstrich", "optionen": [
             opt("Dispersion", "Dispersionsanstrich Kl. 3", [["034.02.001.01001", 1.0]], True),
             opt("Silikat", "Silikatanstrich", [["034.02.002.01001", 1.0]], True),
             opt("Kalk", "Kalkanstrich", [["034.02.007.01001", 1.0]], True),
         ]},
     ], "tags": ["altbau"]},

    # ================================================================ 337 Elementierte Außenwände
    {"id": "337.01", "kg": "337", "name": "Pfosten-Riegel-Fassade", "einheit": "m²",
     "lang": "Pfosten-Riegel-Fassade mit Dreifach-Isolierverglasung einschließlich Statik, Werkplanung und Baukörperanschlüssen; "
             "Öffnungsflügel und Sonderverglasungen nach Wahl.",
     "bezug": "Ansichtsfläche der Fassade (Achsmaß Pfosten × Höhe)",
     "fest": [["026.05.001.01001", 0.6]],
     "schichten": [
         {"name": "Fassadensystem", "optionen": [
             opt("PR Alu Ucw 1,0", "Aluminium, Ucw ≤ 1,0, RAL Standard", [["026.04.001.01001", 1.0]], True),
             opt("PR Alu Ucw 0,8", "Aluminium, Ucw ≤ 0,8, RAL Standard", [["026.04.001.02001", 1.0]], True),
             opt("PR Holz-Alu", "Holz-Aluminium, RAL Standard", [["026.04.002.01001", 1.0]], True),
             opt("PR Brandschutz", "Brandschutzverglasung EI 30 in Fassade", [["026.04.004.01001", 1.0]]),
         ]},
         {"name": "Öffnungsflügel", "optionen": [
             ohne("ohne Öffnungsflügel", std=True),
             opt("1 Flügel/10 m²", "Dreh-Kipp-Flügel, ca. 1 je 10 m²", [["026.04.003.01001", 0.1]], True),
             opt("1 Flügel/5 m²", "Dreh-Kipp-Flügel, ca. 1 je 5 m²", [["026.04.003.01001", 0.2]]),
             opt("RWA 1/20 m²", "RWA-Lüftungsflügel 24 V, ca. 1 je 20 m²", [["026.01.011.01001", 0.05]]),
         ]},
         {"name": "Verglasung", "optionen": [
             ohne("Standard-Wärmeschutzglas", std=True),
             opt("Sonnenschutz 0,35", "Sonnenschutzglas g ≤ 0,35", [["026.02.009.01001", 0.85]], True),
             opt("Sonnenschutz 0,25", "Sonnenschutzglas g ≤ 0,25", [["026.02.009.02001", 0.85]], True),
             opt("Schall 38 dB", "Schallschutzglas Rw ≥ 38 dB", [["026.02.002.01001", 0.85]]),
             opt("absturzsichernd", "absturzsichernde Verglasung", [["026.02.010.01001", 0.4]]),
         ]},
     ], "tags": ["neubau"]},

    {"id": "337.02", "kg": "337", "name": "Fensterband Kunststoff", "einheit": "m²",
     "lang": "Durchlaufendes Fensterband aus gekoppelten Kunststoff-Fensterelementen mit Ober- bzw. Festlichtern, Anschluss, "
             "Fensterbänken und Leibungsputz.",
     "bezug": "Fläche des Fensterbands (Rahmenaußenmaß)",
     "fest": [["026.05.001.01001", 1.5]],
     "schichten": [
         {"name": "Elemente", "optionen": [
             opt("Element 2,5–4 m²", "Fensterelement mit Oberlicht 2,5–4,0 m²", [["026.01.010.01001", 1.0]], True),
             opt("Element > 4 m²", "Fensterelement mit Oberlicht über 4,0 m²", [["026.01.010.02001", 1.0]], True),
             opt("Mix fest/DK", "Mischung 50 % Festverglasung, 50 % Dreh-Kipp", [["026.01.005.01001", 0.5], ["026.01.001.03001", 0.5]], True),
         ]},
         {"name": "Fensterbank außen", "optionen": [
             opt("FBa Alu", "Alu-Fensterbank bis 200 mm", [["022.03.001.03001", 0.45]], True),
             opt("FBa Alu WDVS", "Alu-Fensterbank für WDVS bis 400 mm", [["022.03.001.05001", 0.45]], True),
         ]},
         {"name": "Fensterbank innen", "optionen": [
             opt("FBi Holzwerkst.", "Innenfensterbank Holzwerkstoff bis 250 mm", [["027.03.001.01001", 0.45]], True),
             opt("FBi Agglo", "Innenfensterbank Quarzkomposit", [["014.01.001.05001", 0.45]], True),
             ohne("ohne Innenfensterbank"),
         ]},
         {"name": "Leibungen", "optionen": [
             opt("Leibung geputzt", "Leibungen innen und außen geputzt", [["023.02.004.01001", 1.0], ["023.03.002.01001", 1.0]], True),
             ohne("Leibungen gesondert"),
         ]},
     ], "tags": ["neubau"]},

    {"id": "337.03", "kg": "337", "name": "Elementfassade Glas + Paneel", "einheit": "m²",
     "lang": "Elementierte Fassade mit verglasten Pfosten-Riegel-Feldern und opaken, gedämmten Brüstungspaneelen; Anteil "
             "Verglasung/Paneel nach Wahl.",
     "bezug": "Ansichtsfläche der Fassade",
     "fest": [["026.05.001.01001", 0.6]],
     "schichten": [
         {"name": "Glasanteil", "optionen": [
             opt("Glas 70 %", "70 % Pfosten-Riegel verglast, 30 % Paneel", [["026.04.001.01001", 0.7]], True),
             opt("Glas 50 %", "50 % Pfosten-Riegel verglast, 50 % Paneel", [["026.04.001.01001", 0.5]], True),
             opt("Glas 70 % Ucw 0,8", "70 % verglast Ucw 0,8, 30 % Paneel", [["026.04.001.02001", 0.7]]),
         ]},
         {"name": "Paneel", "optionen": [
             opt("Alu-Verbund", "Paneel Alu-Verbundplatte mit MW 160 auf UK (Anteil)", [["038.02.001.07001", 0.4], ["038.01.003.02001", 0.4], ["038.01.001.01001", 0.4]], True),
             opt("Emailit-Glas", "Paneel Emailit-Glas mit MW 160 auf UK (Anteil)", [["038.02.001.09001", 0.4], ["038.01.003.02001", 0.4], ["038.01.001.01001", 0.4]], True),
         ]},
         {"name": "Sonnenschutzglas", "optionen": [
             ohne("Standard-Wärmeschutzglas", std=True),
             opt("g ≤ 0,35", "Sonnenschutzglas g ≤ 0,35 im Glasanteil", [["026.02.009.01001", 0.6]], True),
         ]},
     ], "tags": ["neubau"]},

    # ================================================================ 338 Lichtschutz
    rollladen("338.01", "1,5", 1),
    rollladen("338.02", "2,5", 2),
    rollladen("338.03", "4", 3),
    rollladen("338.04", "6", 4),
    raffstore("338.05", "1,5", 1, 1.2),
    raffstore("338.06", "2,5", 2, 1.6),
    raffstore("338.07", "4", 3, 2.0),
    raffstore("338.08", "6", 4, 2.5),

    {"id": "338.09", "kg": "338", "name": "Senkrechtmarkise / ZIP-Screen", "einheit": "St",
     "lang": "Textiler Sonnenschutz als Senkrechtmarkise mit ZIP-Führung, Acryl- bzw. Screengewebe, Motorantrieb.",
     "bezug": "Anzahl der Elemente nach Fensterliste",
     "schichten": [
         {"name": "Größe", "optionen": [
             opt("ZIP bis 1,5 m²", "ZIP-Screen bis 1,5 m², Motor", [["030.03.001.01001", 1.0]], True),
             opt("ZIP bis 2,5 m²", "ZIP-Screen bis 2,5 m², Motor", [["030.03.001.02001", 1.0]], True),
             opt("ZIP bis 4 m²", "ZIP-Screen bis 4 m², Motor", [["030.03.001.03001", 1.0]], True),
             opt("ZIP bis 6 m²", "ZIP-Screen bis 6 m², Motor", [["030.03.001.04001", 1.0]], True),
         ]},
         {"name": "Steuerung", "optionen": [
             ohne("Wandtaster (im Preis)", std=True),
             opt("Funk", "Funk-Handsender", [["030.04.004.01001", 1.0]], True),
             opt("Wetterstation", "Wetterstation anteilig (1 je 8 Antriebe)", [["030.04.002.01001", 0.125]]),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "338.10", "kg": "338", "name": "Markise Terrasse/Wintergarten", "einheit": "St",
     "lang": "Außenliegende Markise (Fallarm-, Kassetten-Gelenkarm- oder Wintergartenmarkise) mit Acryltuch und Motor, "
             "Steuerung nach Wahl.",
     "bezug": "Anzahl der Markisen",
     "schichten": [
         {"name": "Markise", "optionen": [
             opt("Fallarm 1,5 m", "Fallarmmarkise bis 1,5 m", [["030.03.002.01001", 1.0]], True),
             opt("Fallarm 2,5 m", "Fallarmmarkise bis 2,5 m", [["030.03.002.02001", 1.0]], True),
             opt("Fallarm 4,0 m", "Fallarmmarkise bis 4,0 m", [["030.03.002.03001", 1.0]]),
             opt("Gelenkarm 3×2", "Kassetten-Gelenkarmmarkise 3,0 × 2,0 m", [["030.03.003.01001", 1.0]], True),
             opt("Gelenkarm 4×2,5", "Kassetten-Gelenkarmmarkise 4,0 × 2,5 m", [["030.03.003.02001", 1.0]], True),
             opt("Gelenkarm 5×3", "Kassetten-Gelenkarmmarkise 5,0 × 3,0 m", [["030.03.003.03001", 1.0]], True),
             opt("Gelenkarm 6×3", "Kassetten-Gelenkarmmarkise 6,0 × 3,0 m", [["030.03.003.04001", 1.0]]),
             opt("WiGa ≤ 12 m²", "Wintergartenmarkise bis 12 m²", [["030.03.004.01001", 1.0]], True),
             opt("WiGa ≤ 20 m²", "Wintergartenmarkise bis 20 m²", [["030.03.004.02001", 1.0]], True),
             opt("WiGa ≤ 30 m²", "Wintergartenmarkise bis 30 m²", [["030.03.004.03001", 1.0]]),
         ]},
         {"name": "Steuerung", "optionen": [
             opt("Funk", "Funk-Handsender", [["030.04.004.01001", 1.0]], True),
             opt("Funk + Wetter", "Funk-Handsender und Wetterstation", [["030.04.004.01001", 1.0], ["030.04.002.01001", 1.0]], True),
             ohne("Wandtaster (im Preis)"),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "338.11", "kg": "338", "name": "Rollladen Bestand instandsetzen", "einheit": "St",
     "lang": "Instandsetzung eines Rollladens im Bestand (bis ca. 2,5 m²): Panzer reparieren oder erneuern, Antrieb, Kasten und "
             "Führungsschienen nach Wahl.",
     "bezug": "Anzahl der Rollläden",
     "schichten": [
         {"name": "Panzer", "optionen": [
             opt("Lamellen ≤ 3", "Panzer reparieren, bis 3 Lamellen", [["030.01.009.01001", 1.0]], True),
             opt("Lamellen ≤ 8", "Panzer reparieren, bis 8 Lamellen", [["030.01.009.02001", 1.0]]),
             opt("PVC neu", "neuer Kunststoffpanzer bis 2,5 m²", [["030.01.002.02001", 1.0]], True),
             opt("Alu neu", "neuer Alu-Panzer bis 2,5 m²", [["030.01.001.02001", 1.0]], True),
         ]},
         {"name": "Antrieb", "optionen": [
             opt("Gurt neu", "Gurt bzw. Gurtwickler erneuern", [["030.01.007.01001", 1.0]], True),
             opt("Motor nachrüsten", "Rollladen motorisieren mit Funk-Handsender", [["030.01.008.01001", 1.0], ["030.04.004.01001", 1.0]], True),
         ]},
         {"name": "Kasten", "optionen": [
             ohne("Kasten bleibt", std=True),
             opt("Kasten dämmen", "Rollladenkasten innen dämmen und abdichten", [["030.01.010.01001", 1.0]], True),
         ]},
         {"name": "Führungsschienen", "optionen": [
             ohne("Schienen bleiben", std=True),
             opt("Schienen 1,5 m", "Führungsschienen tauschen bis 1,5 m", [["030.01.011.01001", 1.0]]),
             opt("Schienen 2,5 m", "Führungsschienen tauschen bis 2,5 m", [["030.01.011.02001", 1.0]]),
         ]},
     ], "tags": ["altbau"]},

    {"id": "338.12", "kg": "338", "name": "Sonnenschutz je m² Fensterfläche", "einheit": "m²",
     "lang": "Außenliegender Sonnenschutz überschlägig je m² Fensterfläche (Elemente im Mittel ca. 2,2 m², Motorantrieb), "
             "mit zentraler Steuerung nach Wahl.",
     "bezug": "Fensterfläche mit Sonnenschutz (Rahmenaußenmaß)",
     "schichten": [
         {"name": "Sonnenschutz", "optionen": [
             opt("Vorbaurollladen", "Vorbaurollladen Alu mit Motor", [["030.01.003.02001", 0.45], ["030.01.008.01001", 0.45]], True),
             opt("Aufsatzrollladen", "Aufsatzrollladenkasten mit Motor", [["030.01.004.02001", 0.45], ["030.01.008.01001", 0.45]]),
             opt("Raffstore C80", "Raffstore C-Form 80 mm, Motor", [["030.02.001.02001", 0.45]], True),
             opt("Raffstore Z90", "Raffstore Z-Form 90 mm, Motor", [["030.02.001.06001", 0.45]], True),
             opt("ZIP-Screen", "Senkrechtmarkise ZIP, Motor", [["030.03.001.02001", 0.45]], True),
             opt("Lichtlenkung", "Lichtlenk-Raffstore, Motor", [["030.02.004.02001", 0.45]]),
         ]},
         {"name": "Steuerung", "optionen": [
             ohne("Einzeltaster (im Preis)", std=True),
             opt("Gruppe + Wetter", "Gruppensteuerung (24 Antriebe) und Wetterstation anteilig", [["030.04.003.02001", 0.019], ["030.04.002.01001", 0.01]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "338.13", "kg": "338", "name": "Insektenschutz", "einheit": "St",
     "lang": "Insektenschutz an Fenstern und Fenstertüren als Spann-, Dreh- oder Schieberahmen, Plissee bzw. Rollo.",
     "bezug": "Anzahl der Elemente",
     "schichten": [
         {"name": "Insektenschutz", "optionen": [
             opt("Spannrahmen 1 m²", "Spannrahmen Fenster bis 1,0 m²", [["030.04.001.01001", 1.0]], True),
             opt("Spannrahmen 2 m²", "Spannrahmen Fenster bis 2,0 m²", [["030.04.001.02001", 1.0]], True),
             opt("Rollo Fenster", "Insektenschutzrollo Fenster bis 1,6 m²", [["030.04.001.06001", 1.0]], True),
             opt("Drehrahmen Tür", "Drehrahmen Tür bis 1,0 × 2,2 m", [["030.04.001.03001", 1.0]], True),
             opt("Plissee Tür", "Plissee Tür bis 1,2 m breit", [["030.04.001.05001", 1.0]], True),
             opt("Schiebeanlage", "Schiebeanlage bis 2,4 m breit", [["030.04.001.04001", 1.0]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    # ================================================================ 339 Sonstiges zur KG 330
    {"id": "339.01", "kg": "339", "name": "Brüstungs-/Balkongeländer", "einheit": "m",
     "lang": "Absturzsicherung an Balkonen, Loggien und Brüstungen, Höhe 1,00 m, mit Statik, Befestigung und Oberfläche.",
     "bezug": "Geländerlänge",
     "schichten": [
         {"name": "Geländer", "optionen": [
             opt("Stahl Stäbe", "Stahlgeländer verzinkt mit Füllstäben", [["031.02.003.01001", 1.0]], True),
             opt("Stahl Lochblech", "Stahlgeländer verzinkt mit Lochblech", [["031.02.003.02001", 1.0]], True),
             opt("Alu + VSG", "Aluminiumgeländer eloxiert mit VSG-Füllung", [["031.02.003.03001", 1.0]], True),
             opt("Ganzglas Profil", "Ganzglasgeländer im Alu-Bodenprofil", [["031.02.003.04001", 1.0]], True),
             opt("Ganzglas TVG auf", "Ganzglasgeländer VSG/TVG, Profil aufgesetzt", [["032.03.003.01001", 1.0]]),
             opt("Glas TVG seitlich", "Ganzglasgeländer VSG/TVG, Profil seitlich", [["032.03.003.02001", 1.0]]),
         ]},
         {"name": "Befestigung", "optionen": [
             ohne("auf/an Betonplatte (im Preis)", std=True),
             opt("durch WDVS", "Montagequader für schwere Lasten im WDVS, 0,8 St/m", [["023.04.008.02001", 0.8]], True),
             opt("durch VHF", "Konsole durch VHF-Bekleidung, 0,8 St/m", [["038.05.006.01001", 0.8]]),
         ]},
         {"name": "Beschichtung", "optionen": [
             ohne("feuerverzinkt bzw. eloxiert (im Preis)", std=True),
             opt("2K-PUR", "Stahl zusätzlich 2K-PUR-Lack", [["034.03.006.02001", 1.0]], True),
         ]},
         {"name": "Handlauf", "optionen": [
             ohne("ohne Zusatzhandlauf", std=True),
             opt("Handlauf Edelstahl", "Wandhandlauf Edelstahl Ø 42 mm", [["031.02.005.01001", 1.0]]),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "339.02", "kg": "339", "name": "Französischer Balkon", "einheit": "St",
     "lang": "Absturzsicherung vor bodentiefen Fenstern als französischer Balkon mit VSG-Glasfüllung, in der Leibung bzw. durch "
             "die Dämmung befestigt.",
     "bezug": "Anzahl der Elemente",
     "schichten": [
         {"name": "Element", "optionen": [
             opt("bis 1,25 m", "Französischer Balkon Glas VSG, Breite bis 1,25 m", [["031.02.004.01001", 1.0]], True),
             opt("bis 2,00 m", "Französischer Balkon Glas VSG, Breite bis 2,00 m", [["031.02.004.02001", 1.0]], True),
         ]},
         {"name": "Befestigung", "optionen": [
             ohne("in der Leibung (im Preis)", std=True),
             opt("durch WDVS", "4 Montagequader für schwere Lasten im WDVS", [["023.04.008.02001", 4.0]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "339.03", "kg": "339", "name": "Lichtschacht", "einheit": "St",
     "lang": "Kellerlichtschacht aus Kunststoff bzw. Betonfertigteil mit Gitterrost und Abhebesicherung, Anschluss an die "
             "Kellerwand und Abdeckung nach Wahl.",
     "bezug": "Anzahl der Lichtschächte",
     "schichten": [
         {"name": "Lichtschacht", "optionen": [
             opt("KS 100×60×40", "Kunststoff-Lichtschacht 100 × 60 × 40 cm", [["031.03.005.01001", 1.0]], True),
             opt("KS 125×100×70", "Kunststoff-Lichtschacht 125 × 100 × 70 cm", [["031.03.005.02001", 1.0]], True),
             opt("Beton 100×40", "Beton-Lichtschacht 100 × 40 cm", [["013.09.007.01001", 1.0]], True),
             opt("Beton 125×50", "Beton-Lichtschacht 125 × 50 cm", [["013.09.007.02001", 1.0]], True),
             opt("Beton 150×70", "Beton-Lichtschacht 150 × 70 cm", [["013.09.007.03001", 1.0]], True),
         ]},
         {"name": "Anschluss", "optionen": [
             opt("abgedichtet", "Anschluss an Kellerwand abgedichtet", [["018.03.005.01001", 1.0]], True),
             ohne("Anschluss im Preis", std=True),
         ]},
         {"name": "Abdeckung", "optionen": [
             ohne("Gitterrost (im Preis)", std=True),
             opt("Insektenschutz", "Insektenschutz-Lichtschachtabdeckung", [["030.04.001.07001", 1.0]], True),
             opt("Sicherheitsgitter", "Sicherheitsgitter Stahl verzinkt", [["031.02.008.01001", 1.0]]),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "339.04", "kg": "339", "name": "Kelleraußentreppe", "einheit": "St",
     "lang": "Kelleraußentreppe aus Stahlbeton mit Wangenwänden und Podest mit Ablauf, Umwehrung bzw. Handlauf, Abdichtung der "
             "Wangen und Überdachung nach Wahl. Erdarbeiten gesondert.",
     "bezug": "Anzahl der Kellerabgänge",
     "schichten": [
         {"name": "Treppe", "optionen": [
             opt("10–12 Stg.", "Kelleraußentreppe Stahlbeton 10–12 Steigungen", [["013.09.008.01001", 1.0]], True),
             opt("14–16 Stg.", "Kelleraußentreppe Stahlbeton 14–16 Steigungen", [["013.09.008.02001", 1.0]], True),
         ]},
         {"name": "Umwehrung", "optionen": [
             opt("Geländer 6 m", "Umwehrung Stahl verzinkt, ca. 6 m", [["031.02.003.01001", 6.0]], True),
             opt("Handlauf 4 m", "Wandhandlauf Stahl verzinkt, ca. 4 m", [["031.02.005.02001", 4.0]], True),
             opt("Geländer+Handlauf", "Umwehrung 6 m und Wandhandlauf 4 m", [["031.02.003.01001", 6.0], ["031.02.005.02001", 4.0]], True),
         ]},
         {"name": "Abdichtung", "optionen": [
             opt("KMB + Noppen", "Wangen außen KMB W1-E und Noppenbahn, ca. 14 m²", [["018.02.001.01001", 14.0], ["018.02.007.01001", 14.0]], True),
             ohne("ohne Abdichtung (WU)", std=True),
         ]},
         {"name": "Überdachung", "optionen": [
             ohne("ohne Überdachung", std=True),
             opt("Glasvordach", "Glas-Vordach 1,2 × 2,5 m", [["032.03.004.02001", 1.0]]),
         ]},
     ], "tags": ["neubau"]},

    {"id": "339.05", "kg": "339", "name": "Vordach am Eingang", "einheit": "St",
     "lang": "Vordach über Hauseingängen aus Glas, Stahl oder Aluminium mit Befestigung an der Außenwand, Entwässerung nach Wahl.",
     "bezug": "Anzahl der Vordächer",
     "schichten": [
         {"name": "Vordach", "optionen": [
             opt("Edelstahl-Glas 1,6", "Edelstahl-Glas VSG, 1,0 × 1,6 m", [["031.04.001.01001", 1.0]], True),
             opt("Stahl 2,5 m", "Stahl verzinkt, 1,5 × 2,5 m", [["031.04.001.02001", 1.0]], True),
             opt("Alu-Kassette 3 m", "Aluminium-Kassettenvordach 1,5 × 3,0 m", [["031.04.001.03001", 1.0]], True),
             opt("Glas Zugst. 1,5", "Glasvordach mit Zugstangen 1,0 × 1,5 m", [["032.03.004.01001", 1.0]], True),
             opt("Glas Zugst. 2,5", "Glasvordach mit Zugstangen 1,2 × 2,5 m", [["032.03.004.02001", 1.0]], True),
             opt("Glas Zugst. 4,0", "Glasvordach mit Zugstangen 1,5 × 4,0 m", [["032.03.004.03001", 1.0]], True),
         ]},
         {"name": "Befestigung", "optionen": [
             ohne("auf Massivwand (im Preis)", std=True),
             opt("durch WDVS", "4 Montagequader für schwere Lasten im WDVS", [["023.04.008.02001", 4.0]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "339.06", "kg": "339", "name": "Mauer-/Brüstungsabdeckung", "einheit": "m",
     "lang": "Abdeckung von Mauerkronen, freistehenden Wänden und Brüstungen aus Aluminium, Naturstein oder Blech, wahlweise auf "
             "Keilbohle mit Gefälle.",
     "bezug": "Länge der Abdeckung",
     "schichten": [
         {"name": "Abdeckung", "optionen": [
             opt("Alu ≤ 333", "Mauerabdeckung Alu, Zuschnitt bis 333 mm", [["022.02.002.01001", 1.0]], True),
             opt("Alu ≤ 500", "Mauerabdeckung Alu, Zuschnitt bis 500 mm", [["022.02.002.02001", 1.0]], True),
             opt("Naturstein ≤ 30", "Naturstein 3 cm, Breite bis 30 cm", [["014.01.003.01001", 1.0]], True),
             opt("Naturstein ≤ 45", "Naturstein 3 cm, Breite bis 45 cm", [["014.01.003.02001", 1.0]], True),
             opt("Kantteil TiZn", "Kantteil Titanzink nach Zeichnung", [["022.02.010.01001", 1.0]]),
         ]},
         {"name": "Unterkonstruktion", "optionen": [
             ohne("direkt auf Mauerkrone", std=True),
             opt("Keilbohle", "Keilbohle mit Gefälle und Trennlage", [["022.02.017.01001", 1.0], ["022.02.018.01001", 0.4]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "339.07", "kg": "339", "name": "Eingangszubehör Fassade", "einheit": "St",
     "lang": "Zubehör am Hauseingang: Briefkastenanlage mit Klingel/Sprechanlage, Fußabstreifer und Hausnummer.",
     "bezug": "je Hauseingang",
     "fest": [["029.03.002.01001", 1.0]],
     "schichten": [
         {"name": "Briefkastenanlage", "optionen": [
             opt("4 Fächer", "Briefkastenanlage 4 Fächer mit Sprechanlage", [["031.04.002.01001", 1.0]], True),
             opt("8 Fächer", "Briefkastenanlage 8 Fächer mit Sprechanlage", [["031.04.002.02001", 1.0]], True),
             opt("16 Fächer", "Briefkastenanlage 16 Fächer mit Sprechanlage", [["031.04.002.03001", 1.0]], True),
             ohne("ohne Briefkastenanlage"),
         ]},
         {"name": "Fußabstreifer", "optionen": [
             opt("100×60", "Fußabstreifer mit Wanne 100 × 60 cm", [["031.03.006.01001", 1.0]], True),
             opt("150×100", "Fußabstreifer mit Wanne 150 × 100 cm", [["031.03.006.02001", 1.0]], True),
         ]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "339.08", "kg": "339", "name": "Balkonanlage vorgestellt", "einheit": "St",
     "lang": "Vorgestellter Balkon als feuerverzinkte Stahlkonstruktion mit Stützen, thermisch getrenntem Wandanschluss und "
             "Geländer, Belag und Fundamente nach Wahl.",
     "bezug": "Anzahl der Balkone",
     "schichten": [
         {"name": "Balkon", "optionen": [
             opt("2,0 × 1,5 m", "Balkonanlage Stahl 2,0 × 1,5 m", [["031.03.009.01001", 1.0]], True),
             opt("3,5 × 1,8 m", "Balkonanlage Stahl 3,5 × 1,8 m", [["031.03.009.02001", 1.0]], True),
         ]},
         {"name": "Belag", "optionen": [
             ohne("Belag im Preis (Gitterrost)", std=True),
             opt("Lärche ca. 4 m²", "Balkonbelag Lärchendielen, ca. 4 m²", [["016.04.011.01001", 4.0]], True),
             opt("WPC ca. 4 m²", "Balkonbelag WPC-Dielen, ca. 4 m²", [["016.04.011.04001", 4.0]]),
         ]},
         {"name": "Fundamente", "optionen": [
             opt("2 Einzelfund.", "zwei Einzelfundamente je 0,5 m³", [["013.02.002.02001", 1.0]], True),
             ohne("Fundamente gesondert"),
         ]},
     ], "tags": ["neubau", "altbau"]},
]
