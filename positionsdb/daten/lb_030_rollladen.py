# LB 030 Rollladenarbeiten, Sonnenschutz – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

# Ausführungsachsen
FARBE = [{}, {"k": "RAL", "t": "Profile und Blenden in RAL-Sonderfarbe nach Wahl des AG.", "fm": 1.08},
         {"k": "Eloxal", "t": "Oberfläche eloxiert bzw. Feinstruktur-DB-Farbton.", "fm": 1.12}]
ANTRIEB_R = [{"k": "Gurt", "t": "Bedienung über Gurtwickler.", "mat": 0},
             {"k": "Motor", "t": "Rohrmotor mit Hinderniserkennung und Wandschalter; Zuleitung bauseits.", "mat": 160, "h": 0.6},
             {"k": "Funkmotor", "t": "Funk-Rohrmotor mit Handsender bzw. Funk-Wandtaster, einbindbar in Smart-Home.", "mat": 240, "h": 0.7},
             {"k": "Solarmotor", "t": "Solar-Funkantrieb mit Akku und Solarmodul, ohne Netzanschluss.", "mat": 380, "h": 0.8}]
ANTRIEB_M = [{"k": "Motor", "t": "Rohrmotor mit Wandtaster; Zuleitung bauseits."},
             {"k": "Funkmotor", "t": "Funkmotor mit Handsender bzw. Funktaster.", "mat": 80, "h": 0.2},
             {"k": "KNX/Bus", "t": "Motor für Busansteuerung (KNX bzw. SMI), Parametrierung gesondert.", "mat": 140, "h": 0.3}]
ORT = [{}, {"k": "Bestand", "t": "Austausch im Bestand: Altanlage demontieren und entsorgen, Anschlüsse anpassen.",
            "fh": 1.35, "h": 0.8, "mat": 15, "gen": "C", "tags": ["altbau"]},
       {"k": "> 3,5 m", "t": "Montagehöhe über 3,5 m; Hubarbeitsbühne bzw. Gerüst wird gesondert vergütet.", "fh": 1.2}]
WIND = [{}, {"k": "WK 3", "t": "Ausführung mit erhöhter Windstabilität, Windwiderstandsklasse 3 nach DIN EN 13659.", "fm": 1.10},
        {"k": "WK 6", "t": "Ausführung mit Windwiderstandsklasse 6 (Hochhaus, exponierte Lage).", "fm": 1.22, "gen": "C"}]
STOFF = [{"k": "Acryl", "t": "Tuch aus spinndüsengefärbtem Acryl."},
         {"k": "Polyester", "t": "Tuch aus beschichtetem Polyestergewebe, schmutzabweisend.", "fm": 1.06},
         {"k": "Screen", "t": "Screen-Gewebe aus PVC-ummantelter Glasfaser, Öffnungsfaktor nach Bemusterung.", "fm": 1.10}]
FL = [{"gr": "bis 1,5 m²", "fl": 0.85}, {"gr": "bis 2,5 m²", "fl": 1.0}, {"gr": "bis 4 m²", "fl": 1.25}, {"gr": "bis 6 m²", "fl": 1.55}]


def flaechen(h, mat, **kw):
    return [{"gr": x["gr"], "h": round(h * (0.85 + 0.15 * x["fl"]), 2), "mat": round(mat * x["fl"]), **kw} for x in FL]


LBS = [{
    "nr": "030", "name": "Rollladenarbeiten, Sonnenschutz", "atv": "DIN 18358", "lohn": "rollladen",
    "gruppen": [
        {"name": "Rollläden", "positionen": [
            {"kurz": "Rollladenpanzer Aluminium, Fläche {gr}",
             "lang": "Rollladenpanzer aus doppelwandigen, ausgeschäumten Aluminiumprofilen in vorhandenen bzw. "
                     "bauseitigen Rollladenkasten einbauen, mit Endleiste, Führungsschienen, Welle und Lagern. "
                     "Fläche je Element {gr}. Abrechnung nach Stück.",
             "einheit": "St", "kg": "338", "gen": "B", "achsen": [ANTRIEB_R, FARBE, ORT],
             "varianten": flaechen(2.0, 240)},
            {"kurz": "Rollladenpanzer Kunststoff PVC, Fläche {gr}",
             "lang": "Rollladenpanzer aus PVC-Hohlkammerprofilen mit Endleiste, Führungsschienen, Welle und Lagern in "
                     "vorhandenen Rollladenkasten einbauen. Fläche je Element {gr}.",
             "einheit": "St", "kg": "338", "gen": "A", "achsen": [ANTRIEB_R, ORT],
             "varianten": flaechen(1.8, 150)},
            {"kurz": "Vorbaurollladen Aluminium, Fläche {gr}",
             "lang": "Vorbaurollladen mit Aluminium-Kasten (45° abgeschrägt bzw. rund), Aluminium-Panzer und "
                     "Führungsschienen, auf Fassade bzw. in Leibung montiert, Fläche {gr}.",
             "einheit": "St", "kg": "338", "gen": "B", "achsen": [ANTRIEB_R, FARBE, ORT],
             "varianten": flaechen(2.8, 420)},
            {"kurz": "Aufsatzrollladenkasten zum Fenster, gedämmt, Fläche {gr}",
             "lang": "Aufsatzrollladenkasten für Fenster, wärmegedämmt (Usb ≤ 0,85 W/(m²K)), Revision von innen bzw. "
                     "unten, mit Panzer Aluminium und Führungsschienen, werkseitig auf das Fenster montiert. Fläche {gr}.",
             "einheit": "St", "kg": "338", "gen": "B", "achsen": [ANTRIEB_R, FARBE],
             "varianten": flaechen(1.4, 380)},
            {"kurz": "Einbau-Rollladenkasten Unterputz, Fläche {gr}",
             "lang": "Einbaurollladenkasten (Putzträgerkasten) in Mauerwerk bzw. WDVS einsetzen, gedämmt, Revision "
                     "nach unten, mit Aluminiumpanzer, Führungsschienen und Endleiste. Fläche {gr}.",
             "einheit": "St", "kg": "338", "gen": "B", "achsen": [ANTRIEB_R, FARBE],
             "varianten": flaechen(2.2, 360)},
            {"kurz": "Sicherheitsrollladen RC2, Fläche {gr}",
             "lang": "Einbruchhemmender Rollladen der Widerstandsklasse RC 2 nach DIN EN 1627 mit Aluminium-Strangpressprofilen, "
                     "Hochschiebesicherung, verstärkten Führungsschienen und Endleiste. Fläche {gr}.",
             "einheit": "St", "kg": "338", "gen": "C", "achsen": [ANTRIEB_M, FARBE],
             "varianten": flaechen(3.5, 980)},
            {"kurz": "Rollladengurt erneuern / Gurtwickler tauschen",
             "lang": "Vorhandenen Rollladengurt bzw. Aufschraubgurtwickler austauschen, Rollladenkasten öffnen und "
                     "schließen, Funktion prüfen.",
             "einheit": "St", "kg": "338", "h": 0.8, "mat": 25, "gen": "A", "tags": ["altbau"]},
            {"kurz": "Rollladen motorisieren (Nachrüstung)",
             "lang": "Bestehenden Rollladen mit Rohrmotor nachrüsten, Welle anpassen, Gurt und Gurtwickler entfernen, "
                     "Öffnung verschließen, Endlagen einstellen; Elektroanschluss gesondert.",
             "einheit": "St", "kg": "338", "h": 1.8, "mat": 180, "gen": "B", "tags": ["altbau"],
             "achsen": [ANTRIEB_M]},
            {"kurz": "Rollladenpanzer reparieren, Lamellen tauschen bis {n} St",
             "lang": "Vorhandenen Rollladenpanzer ausbauen, defekte Lamellen bzw. Endleiste ersetzen, Aufhängungen erneuern, "
                     "Panzer wieder einbauen und einstellen. Austausch bis {n} Lamellen.",
             "einheit": "St", "kg": "338", "gen": "B", "tags": ["altbau"],
             "varianten": [{"n": "3", "h": 1.2, "mat": 25}, {"n": "8", "h": 1.6, "mat": 55}]},
            {"kurz": "Rollladenkasten innen dämmen und abdichten",
             "lang": "Bestehenden Rollladenkasten öffnen, mit Dämmplatten bzw. Dämmschalen auskleiden, Gurtdurchführung "
                     "mit Bürstendichtung versehen, Revisionsdeckel luftdicht abdichten.",
             "einheit": "St", "kg": "338", "h": 1.2, "mat": 45, "gen": "B", "tags": ["altbau"]},
            {"kurz": "Führungsschienen tauschen, Länge bis {l} m",
             "lang": "Vorhandene Führungsschienen demontieren, neue Aluminium-Führungsschienen mit Bürsten- bzw. "
                     "Gummidichtung montieren, Länge bis {l} m je Seite.",
             "einheit": "St", "kg": "338", "gen": "A", "tags": ["altbau"], "achsen": [FARBE],
             "varianten": [{"l": "1,5", "h": 0.8, "mat": 45}, {"l": "2,5", "h": 1.0, "mat": 70}]},
        ]},
        {"name": "Raffstore, Jalousien", "positionen": [
            {"kurz": "Raffstore {lam}, Fläche {gr}",
             "lang": "Außenliegender Raffstore mit Lamellen {lam}, Aluminium einbrennlackiert, Seil- bzw. "
                     "Schienenführung, Einbau in bauseitigen Sturzkasten bzw. Blende, Fläche {gr}.",
             "einheit": "St", "kg": "338", "gen": "B", "achsen": [ANTRIEB_M, WIND, FARBE, ORT],
             "varianten": [{**v, "lam": "C-Form 80 mm gebördelt"} for v in flaechen(3.3, 680)]
                          + [{**v, "lam": "Z-Form 90 mm mit Dichtung"} for v in flaechen(3.6, 820)]},
            {"kurz": "Vorbau-Raffstore mit Kasten, {lam}, Fläche {gr}",
             "lang": "Raffstore mit Aluminium-Vorbaukasten zur Montage vor der Fassade bzw. in der Leibung, Lamellen "
                     "{lam}, Schienenführung, Fläche {gr}.",
             "einheit": "St", "kg": "338", "gen": "B", "achsen": [ANTRIEB_M, WIND, FARBE, ORT],
             "varianten": [{**v, "lam": "C-Form 80 mm"} for v in flaechen(3.8, 900)]},
            {"kurz": "Raffstore-Blende Aluminium",
             "lang": "Kastenblende aus Aluminium für Raffstore, pulverbeschichtet, mit Revisionsöffnung, einschließlich "
                     "Befestigungswinkel. Abrechnung nach Länge.",
             "einheit": "m", "kg": "338", "h": 0.6, "mat": 85, "gen": "B", "achsen": [FARBE]},
            {"kurz": "Lichtlenk-Raffstore, Tageslichtnutzung, Fläche {gr}",
             "lang": "Raffstore mit zweigeteiltem Behang: Oberteil mit Lichtlenklamellen, Unterteil Blendschutz, "
                     "Lamellen getrennt verstellbar, Fläche {gr}.",
             "einheit": "St", "kg": "338", "gen": "C", "achsen": [ANTRIEB_M, FARBE],
             "varianten": flaechen(4.0, 1250)},
            {"kurz": "Innenjalousie Aluminium 25 mm, Fläche {gr}",
             "lang": "Innenliegende Jalousie mit Aluminiumlamellen 25 mm, Oberschiene, Wendestab bzw. Kurbel, auf den "
                     "Flügel bzw. in die Leibung montiert, Fläche {gr}.",
             "einheit": "St", "kg": "385", "gen": "A", "achsen": [FARBE],
             "varianten": flaechen(0.8, 95)},
            {"kurz": "Raffstore Behang tauschen, Fläche {gr}",
             "lang": "Behang eines vorhandenen Raffstores ausbauen und durch neuen Behang gleicher Bauart ersetzen, "
                     "Aufzugsbänder und Leiterkordeln erneuern, Endlagen einstellen. Fläche {gr}.",
             "einheit": "St", "kg": "338", "gen": "B", "tags": ["altbau"], "achsen": [FARBE],
             "varianten": flaechen(2.0, 380)},
        ]},
        {"name": "Markisen, textiler Sonnenschutz", "positionen": [
            {"kurz": "Senkrechtmarkise / Screen ZIP, Fläche {gr}",
             "lang": "Textiler Sonnenschutz als Senkrechtmarkise mit ZIP-Seitenführung, Kassette Aluminium, windstabil, "
                     "Fläche {gr}.",
             "einheit": "St", "kg": "338", "gen": "B", "achsen": [STOFF, ANTRIEB_M, FARBE, ORT],
             "varianten": flaechen(3.0, 760)},
            {"kurz": "Fallarmmarkise, Breite bis {b} m",
             "lang": "Fallarmmarkise mit Aluminium-Tuchwelle, Fallarmen und Volant, Wand- bzw. Leibungsmontage, "
                     "Breite bis {b} m.",
             "einheit": "St", "kg": "338", "gen": "B", "achsen": [STOFF, ANTRIEB_M],
             "varianten": [{"b": "1,5", "h": 2.5, "mat": 480}, {"b": "2,5", "h": 3.0, "mat": 650}, {"b": "4,0", "h": 3.6, "mat": 880}]},
            {"kurz": "Gelenkarmmarkise Kassette, Breite {b} m, Ausfall {a} m",
             "lang": "Gelenkarm-Kassettenmarkise mit Wind-/Sonnenwächter, Wand- oder Deckenmontage mit Konsolen nach "
                     "Untergrund, Breite {b} m, Ausfall {a} m.",
             "einheit": "St", "kg": "338", "gen": "C", "achsen": [STOFF, ANTRIEB_M, FARBE],
             "varianten": [{"b": "3,0", "a": "2,0", "h": 4.5, "mat": 1900}, {"b": "4,0", "a": "2,5", "h": 5, "mat": 2300},
                           {"b": "5,0", "a": "3,0", "h": 5.5, "mat": 2900}, {"b": "6,0", "a": "3,0", "h": 6, "mat": 3400}]},
            {"kurz": "Wintergartenmarkise / Glasdachbeschattung, Fläche bis {fl} m²",
             "lang": "Aufdachmarkise für Glasdächer mit Führungsschienen, Tuchspannsystem und Kassette, Montage auf "
                     "Sparren bzw. Pfosten, Fläche bis {fl} m².",
             "einheit": "St", "kg": "338", "gen": "C", "achsen": [STOFF, ANTRIEB_M],
             "varianten": [{"fl": "12", "h": 8, "mat": 3800}, {"fl": "20", "h": 10, "mat": 5400}, {"fl": "30", "h": 12, "mat": 7200}]},
            {"kurz": "Markisentuch erneuern, Breite bis {b} m",
             "lang": "Markisentuch einer vorhandenen Markise abnehmen und durch neues, maßgefertigtes Tuch ersetzen, "
                     "Volant und Einschubleisten erneuern, Funktion prüfen.",
             "einheit": "St", "kg": "338", "gen": "B", "tags": ["altbau"], "achsen": [STOFF],
             "varianten": [{"b": "3,0", "h": 2.0, "mat": 380}, {"b": "5,0", "h": 2.5, "mat": 560}]},
            {"kurz": "Innenliegender Blendschutz {art}",
             "lang": "Innenliegender Blendschutz als {art}, Stoff nach Bemusterung (schwer entflammbar), montiert. "
                     "Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "385", "gen": "B",
             "achsen": [[{"k": "Kettenzug", "t": "Bedienung mit Kettenzug."},
                         {"k": "Motor", "t": "Bedienung mit Motor und Taster; Zuleitung bauseits.", "mat": 95, "h": 0.3}],
                        [{}, {"k": "Verdunkelung", "t": "Stoff verdunkelnd (Blackout) mit seitlichen Führungen.", "fm": 1.4, "h": 0.2}]],
             "varianten": [{"art": "Rollo", "h": 0.5, "mat": 70}, {"art": "Plissee mit Seilspannung", "h": 0.6, "mat": 95},
                           {"art": "Vertikallamellenanlage", "h": 0.5, "mat": 80}, {"art": "Flächenvorhang mit Schiene", "h": 0.6, "mat": 110}]},
        ]},
        {"name": "Insektenschutz, Steuerung", "positionen": [
            {"kurz": "Insektenschutz {art}",
             "lang": "Insektenschutz aus Aluminiumrahmen, {art}, maßgefertigt, montiert.",
             "einheit": "St", "kg": "338", "gen": "A",
             "achsen": [[{"k": "", "t": "Gewebe Fiberglas grau bzw. schwarz."},
                         {"k": "Pollenschutz", "t": "Pollenschutzgewebe.", "mat": 35},
                         {"k": "Edelstahlgewebe", "t": "Gewebe aus Edelstahl, haustierfest.", "mat": 60}], FARBE],
             "varianten": [{"art": "Spannrahmen Fenster bis 1,0 m²", "h": 0.35, "mat": 65},
                           {"art": "Spannrahmen Fenster bis 2,0 m²", "h": 0.45, "mat": 95},
                           {"art": "Drehrahmen Tür bis 1,0 × 2,2 m", "h": 1.2, "mat": 260},
                           {"art": "Schiebeanlage bis 2,4 m breit", "h": 1.6, "mat": 420},
                           {"art": "Plissee Tür bis 1,2 m breit", "h": 1.2, "mat": 320},
                           {"art": "Rollo Fenster bis 1,6 m²", "h": 0.8, "mat": 170},
                           {"art": "Lichtschachtabdeckung bis 1,0 × 0,6 m", "h": 0.5, "mat": 95}]},
            {"kurz": "Wetterstation Sonnenschutz (Wind, Sonne, Regen)",
             "lang": "Wetterstation mit Wind-, Helligkeits- und Regensensor für Sonnenschutzsteuerung liefern, auf Dach "
                     "bzw. Fassade montieren, an Steuerung anschließen.",
             "einheit": "St", "kg": "338", "h": 2.5, "mat": 520, "gen": "B", "lohn": "elektro"},
            {"kurz": "Sonnenschutz-Gruppensteuerung bis {n} Antriebe",
             "lang": "Gruppensteuergerät für Sonnenschutzantriebe mit Zeitschaltuhr, Einzel- und Gruppentastern, "
                     "Programmierung und Einweisung; Verkabelung gesondert. Bis {n} Antriebe.",
             "einheit": "St", "kg": "338", "gen": "C", "lohn": "elektro",
             "varianten": [{"n": "8", "h": 5, "mat": 650}, {"n": "24", "h": 9, "mat": 1400}, {"n": "60", "h": 16, "mat": 2900}]},
            {"kurz": "Funk-Handsender / Funk-Wandtaster {k_}-Kanal",
             "lang": "Funksender für Rollladen- bzw. Sonnenschutzantriebe, {k_}-Kanal, einlernen und Funktion prüfen.",
             "einheit": "St", "kg": "338", "gen": "A",
             "varianten": [{"k_": "1", "h": 0.3, "mat": 45}, {"k_": "5", "h": 0.4, "mat": 75}, {"k_": "16", "h": 0.6, "mat": 120}]},
            {"kurz": "Sonnenschutzanlage warten, je Antrieb",
             "lang": "Wartung von Sonnenschutzanlagen: Sichtprüfung, Reinigung der Führungen, Endlagen und Sicherheits"
                     "funktionen prüfen, Mängel protokollieren. Abrechnung je Antrieb.",
             "einheit": "St", "kg": "338", "h": 0.4, "mat": 3, "gen": "B", "tags": ["altbau"]},
        ]},
    ],
}]
