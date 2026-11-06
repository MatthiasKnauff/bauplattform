# LB 078 Kälteanlagen für raumlufttechnische Anlagen – eigene Texte und Ansätze (Preisstand 11/2026)

ORT = [{}, {"k": "Bestand", "t": "Einbau im Bestand: Demontage/Anpassung vorhandener Anschlüsse, beengte Einbringung, Betrieb angrenzender Bereiche aufrechterhalten.",
            "fh": 1.3, "fm": 1.03, "gen": "C", "tags": ["altbau"]}]
AUFST = [{"k": "AG Boden", "t": "Aufstellung auf bauseitigem Fundament bzw. Boden mit Schwingungsdämpfern."},
         {"k": "AG Dach", "t": "Aufstellung auf dem Dach auf Stahlunterkonstruktion mit Schwingungsdämpfern; Kran- und Hebeeinsatz enthalten.", "h": 4.0, "geraet": 650},
         {"k": "AG Wandkonsole", "t": "Montage an der Außenwand auf schallentkoppelter Wandkonsole aus verzinktem Stahl.", "h": 1.5, "mat": 140}]
KM = [{"k": "R32", "t": "Kältemittel R32 (GWP 675)."}, {"k": "R290", "t": "Natürliches Kältemittel R290 (Propan), Sicherheitsanforderungen nach DIN EN 378 beachtet.", "fm": 1.12},
      {"k": "R454B", "t": "Kältemittel R454B (A2L).", "fm": 1.04}]
SCHALL = [{}, {"k": "leise", "t": "Schallreduzierte Ausführung (Nachtabsenkung, gekapselter Verdichter), Schallleistungspegel mindestens 6 dB(A) unter Standard.", "fm": 1.12}]
SCHALL_RK = [{}, {"k": "leise", "t": "Schallreduzierte Ausführung mit langsamlaufenden EC-Ventilatoren und vergrößerter Wärmetauscherfläche, Schallleistungspegel mindestens 6 dB(A) unter Standard.", "fm": 1.15}]
WART = [{}, {"k": "Wartung 2 J.", "t": "Einschließlich Wartung und Dichtheitsprüfung nach Verordnung (EU) 2024/573 für die ersten zwei Betriebsjahre.", "h": 4.0, "mat": 220}]
VERLEG = [{"k": "sichtbar", "t": "Verlegung sichtbar auf Kabelrinne bzw. in Kanal."},
          {"k": "verdeckt", "t": "Verlegung unter Putz, in Schächten bzw. über abgehängter Decke.", "fh": 1.2},
          {"k": "außen UV", "t": "Verlegung außen mit UV-beständiger Dämmung und Blechummantelung.", "fh": 1.15, "mat": 6}]

HOEHE = [{}, {"k": "H > 4 m", "t": "Montagehöhe über 4 m, Arbeiten von Hubarbeitsbühne bzw. Gerüst (Gerät gesondert).", "fh": 1.2}]
DAEMM = [{"k": "", "t": "Dämmdicke nach GEG bzw. Herstellerangabe (Standard 9–13 mm)."},
         {"k": "Dämmung 19 mm", "t": "Verstärkte diffusionsdichte Dämmung 19 mm gegen Tauwasser bei hoher Luftfeuchte.", "mat": 3.5, "fh": 1.05}]
KWMAT = [{"k": "Stahl verzinkt", "t": "Rohrwerkstoff Stahl außen verzinkt, Pressverbindung."},
         {"k": "C-Stahl gepresst", "t": "Rohrwerkstoff C-Stahl mit Kunststoffmantel, Pressverbindung.", "fm": 0.95, "fh": 0.9},
         {"k": "Edelstahl", "t": "Rohrwerkstoff Edelstahl 1.4401, Pressverbindung.", "fm": 1.5}]
ANTR = [{"k": "ohne Antrieb", "t": "Ohne Stellantrieb (Handverstellung)."},
        {"k": "Antrieb 3-Punkt", "t": "Mit elektrischem Stellantrieb 3-Punkt, 230 V bzw. 24 V.", "mat": 160, "h": 0.5},
        {"k": "Antrieb 0–10 V", "t": "Mit stetigem Stellantrieb 0–10 V, Rückmeldung.", "mat": 240, "h": 0.6}]

LBS = [{
    "nr": "078", "name": "Kälteanlagen für raumlufttechnische Anlagen", "atv": "DIN 18379", "lohn": "lueftung",
    "gruppen": [
        {"name": "Kälteerzeuger", "positionen": [
            {"kurz": "Kaltwassersatz luftgek., {q} kW",
             "lang": "Luftgekühlter Kaltwassersatz in Kompaktbauweise für Außenaufstellung mit Scroll- bzw. Inverterverdichter, Verflüssiger mit "
                     "EC-Ventilatoren, Plattenverdampfer, integrierter Hydraulik (Pumpe, Ausdehnungsgefäß, Sicherheitsventil, Strömungswächter) und "
                     "Regelung mit Schnittstelle zur Gebäudeautomation. Nennkälteleistung {q} kW bei 12/7 °C Kaltwasser und 35 °C Außenluft. "
                     "Einschließlich Montage, Füllung, Inbetriebnahme durch den Hersteller und Einweisung.",
             "einheit": "St", "kg": "434", "gen": "C", "achsen": [KM, AUFST[:2], SCHALL, ORT, WART],
             "varianten": [{"q": "20", "h": 18, "mat": 16500}, {"q": "40", "h": 22, "mat": 26500}, {"q": "70", "h": 28, "mat": 41000},
                           {"q": "100", "h": 34, "mat": 56000}, {"q": "150", "h": 42, "mat": 78000}, {"q": "250", "h": 56, "mat": 118000}]},
            {"kurz": "Kaltwasser-Wärmepumpe reversibel, {q} kW",
             "lang": "Reversible Luft-Wasser-Wärmepumpe für Heiz- und Kühlbetrieb (Kaltwasser), Außenaufstellung, Invertertechnik, Heiz-/Kühlleistung "
                     "{q} kW, mit Regelung, Abtauautomatik, Kondensatwanne mit Heizung und Fernwartung. Montage, Füllung und Inbetriebnahme.",
             "einheit": "St", "kg": "434", "gen": "C", "achsen": [KM, AUFST[:2], SCHALL, ORT, WART],
             "varianten": [{"q": "16", "h": 16, "mat": 14500}, {"q": "30", "h": 20, "mat": 22500}, {"q": "50", "h": 26, "mat": 33500},
                           {"q": "80", "h": 32, "mat": 49000}]},
            {"kurz": "VRF-Außengerät Wärmepumpe, {q} kW",
             "lang": "Außengerät eines VRF-Systems (variabler Kältemittelmassenstrom) als Wärmepumpe, Invertertechnik, Nennkühlleistung {q} kW, "
                     "für bis zu {n} Innengeräte, mit Steuerplatine, Kommunikationsbus und Kältemittelgrundfüllung. Montage, Anschluss, "
                     "Druckprobe, Vakuumierung, Nachfüllung und Inbetriebnahme.",
             "einheit": "St", "kg": "434", "gen": "C", "achsen": [AUFST, SCHALL, ORT, WART],
             "varianten": [{"q": "14", "n": "8", "h": 12, "mat": 8200}, {"q": "28", "n": "16", "h": 16, "mat": 14500},
                           {"q": "45", "n": "26", "h": 20, "mat": 21500}, {"q": "68", "n": "40", "h": 26, "mat": 31000}]},
            {"kurz": "Split-Klimagerät Wandgerät {q} kW",
             "lang": "Split-Klimaanlage (Single-Split) bestehend aus Wand-Innengerät und Außengerät, Inverter, Kühl- und Heizfunktion, "
                     "Nennkühlleistung {q} kW, Energieeffizienzklasse A++ oder besser, mit Infrarot-Fernbedienung und Kondensatpumpe. "
                     "Einschließlich Kältemittelleitung bis 5 m, Kondensatleitung, Inbetriebnahme.",
             "einheit": "St", "kg": "434", "gen": "B", "achsen": [KM[:2], AUFST[::2], ORT, WART],
             "varianten": [{"q": "2,5", "h": 8, "mat": 1150}, {"q": "3,5", "h": 8.5, "mat": 1350}, {"q": "5,0", "h": 9.5, "mat": 1800},
                           {"q": "7,1", "h": 11, "mat": 2600}]},
            {"kurz": "Multi-Split-Außengerät {q} kW für {n} Innengeräte",
             "lang": "Multi-Split-Außengerät, Inverter, Nennkühlleistung {q} kW, Anschluss von bis zu {n} Innengeräten, mit Kältemittelgrundfüllung. "
                     "Montage, Druckprobe, Vakuumierung und Inbetriebnahme; Innengeräte gesondert.",
             "einheit": "St", "kg": "434", "gen": "C", "achsen": [AUFST, ORT, WART],
             "varianten": [{"q": "5,3", "n": "2", "h": 7, "mat": 1900}, {"q": "8,0", "n": "3", "h": 8, "mat": 2700},
                           {"q": "10,5", "n": "4", "h": 9, "mat": 3500}, {"q": "12,5", "n": "5", "h": 10, "mat": 4300}]},
            {"kurz": "Rückkühler trocken (Drycooler), {q} kW",
             "lang": "Trockenrückkühler mit Lamellenwärmetauscher Cu/Al, EC-Ventilatoren drehzahlgeregelt, für Glykolgemisch, Leistung {q} kW. "
                     "Einschließlich Regelung, Montage und Inbetriebnahme.",
             "einheit": "St", "kg": "434", "gen": "C", "achsen": [AUFST[:2], SCHALL_RK, ORT],
             "varianten": [{"q": "30", "h": 12, "mat": 7800}, {"q": "60", "h": 15, "mat": 12500}, {"q": "120", "h": 20, "mat": 21000}]},
        ]},
        {"name": "Innengeräte, Kühlflächen", "positionen": [
            {"kurz": "VRF-Innengerät {art}, {q} kW",
             "lang": "Innengerät für VRF-System, Bauart {art}, Nennkühlleistung {q} kW, elektronisches Expansionsventil, EC-Ventilator, Kondensatpumpe "
                     "soweit erforderlich, Bus-Anschluss. Montage, Anschluss an Kältemittel- und Kondensatleitung, Inbetriebnahme.",
             "einheit": "St", "kg": "434", "gen": "B", "achsen": [HOEHE, ORT, [{"k": "Kabel-FB", "t": "Mit Kabelfernbedienung (Raumbediengerät) je Gerät.", "h": 1.0, "mat": 120},
                                                                     {"k": "zentral gesteuert", "t": "Bedienung über zentrale Steuerung bzw. Gebäudeautomation, ohne Raumbediengerät."}]],
             "varianten": [{"art": "Wandgerät", "q": "2,2", "h": 5, "mat": 780}, {"art": "Wandgerät", "q": "3,6", "h": 5.5, "mat": 920},
                           {"art": "Deckenkassette 4-Wege", "q": "3,6", "h": 7, "mat": 1350}, {"art": "Deckenkassette 4-Wege", "q": "5,6", "h": 7.5, "mat": 1600},
                           {"art": "Kanalgerät flach", "q": "3,6", "h": 8, "mat": 1250}, {"art": "Kanalgerät flach", "q": "7,1", "h": 9, "mat": 1750},
                           {"art": "Deckenunterbaugerät", "q": "7,1", "h": 7, "mat": 1700}, {"art": "Truhengerät", "q": "2,8", "h": 5.5, "mat": 1050}]},
            {"kurz": "Split-Innengerät {art}, {q} kW",
             "lang": "Innengerät für Multi-Split-Anlage, Bauart {art}, Nennkühlleistung {q} kW, mit Fernbedienung. Montage, Anschluss und Inbetriebnahme.",
             "einheit": "St", "kg": "434", "gen": "B", "achsen": [ORT, HOEHE],
             "varianten": [{"art": "Wandgerät", "q": "2,0", "h": 4.5, "mat": 480}, {"art": "Wandgerät", "q": "3,5", "h": 5, "mat": 620},
                           {"art": "Kassette", "q": "3,5", "h": 6.5, "mat": 980}, {"art": "Truhe", "q": "2,5", "h": 5, "mat": 760}]},
            {"kurz": "Fan-Coil {art}, {q} kW",
             "lang": "Gebläsekonvektor für 2-Leiter- bzw. 4-Leiter-Kaltwassersystem, Bauart {art}, Kühlleistung {q} kW, EC-Ventilator, "
                     "Kondensatwanne, Ventile mit Stellantrieb, Raumregler. Montage und hydraulischer Anschluss.",
             "einheit": "St", "kg": "434", "gen": "B", "achsen": [[{"k": "2-Leiter", "t": "2-Leiter-Ausführung."}, {"k": "4-Leiter", "t": "4-Leiter-Ausführung mit zusätzlichem Heizregister.", "fm": 1.15, "h": 1.0}], ORT, HOEHE],
             "varianten": [{"art": "Truhe mit Gehäuse", "q": "1,5", "h": 5, "mat": 950}, {"art": "Truhe mit Gehäuse", "q": "3,0", "h": 5.5, "mat": 1250},
                           {"art": "Deckenkassette", "q": "3,5", "h": 7, "mat": 1550}, {"art": "Kanaleinbau", "q": "4,5", "h": 8, "mat": 1450}]},
            {"kurz": "Kühldecke/Kühlsegel {art}",
             "lang": "Wasserdurchströmte Kühldecke bzw. Kühlsegel, Bauart {art}, Kühlleistung ca. 70–90 W/m² bei 16/18 °C, Anschluss mit "
                     "Schläuchen an bauseitige Verteilleitungen, {ofl}. Abrechnung nach aktiver Fläche.",
             "einheit": "m²", "kg": "434", "gen": "C", "achsen": [HOEHE, ORT, [{}, {"k": "akustisch wirksam", "t": "Perforiert mit Akustikvlies, Schallabsorption αw ≥ 0,6.", "fm": 1.12}]],
             "varianten": [{"art": "Metall-Kühldecke geschlossen", "ofl": "Oberfläche pulverbeschichtet", "h": 1.6, "mat": 175},
                           {"art": "Kühlsegel frei abgehängt", "ofl": "Oberfläche pulverbeschichtet", "h": 1.8, "mat": 230},
                           {"art": "Kapillarrohrmatten im Putz", "ofl": "Matten an der Rohdecke befestigt, Einputzen und Oberfläche gesondert (Putzarbeiten)", "h": 1.2, "mat": 85,
                            "achsen": [HOEHE, ORT]}]},
        ]},
        {"name": "Leitungen, Zubehör", "positionen": [
            {"kurz": "Kältemittelltg. Cu {d}, gedämmt",
             "lang": "Kältemittelleitung als Leitungspaar (Saug- und Flüssigkeitsleitung) aus Kupferrohr nach DIN EN 12735-1, hartgelötet unter "
                     "Schutzgas, mit diffusionsdichter Kautschukdämmung, Abmessung {d}, einschließlich Befestigung, Formteile, Druckprobe mit Stickstoff "
                     "und Vakuumierung. Abrechnung nach Leitungslänge.",
             "einheit": "m", "kg": "434", "gen": "B", "achsen": [VERLEG, DAEMM, ORT, HOEHE],
             "varianten": [{"d": "6/10 mm", "h": 0.55, "mat": 16}, {"d": "6/12 mm", "h": 0.6, "mat": 19}, {"d": "10/16 mm", "h": 0.7, "mat": 27},
                           {"d": "10/19 mm", "h": 0.75, "mat": 32}, {"d": "12/22 mm", "h": 0.85, "mat": 40}, {"d": "16/28 mm", "h": 1.0, "mat": 55},
                           {"d": "19/35 mm", "h": 1.2, "mat": 74}]},
            {"kurz": "VRF-Abzweig (Refnet), Größe {g}",
             "lang": "Kältemittel-Abzweigstück für VRF-Systeme (Saug- und Flüssigkeitsseite), werkseitig vorgedämmt, Größe {g}, eingelötet.",
             "einheit": "St", "kg": "434", "gen": "B", "achsen": [ORT],
             "varianten": [{"g": "bis 22 kW", "h": 1.2, "mat": 95}, {"g": "bis 33 kW", "h": 1.4, "mat": 135}, {"g": "über 33 kW", "h": 1.6, "mat": 190}]},
            {"kurz": "Kaltwasserltg. DN {dn}, kältegedämmt",
             "lang": "Kaltwasserleitung aus Stahlrohr bzw. C-Stahl-Pressrohr, außen verzinkt, DN {dn}, einschließlich Form- und Verbindungsstücke, "
                     "Befestigung mit Kälteschellen und diffusionsdichter Kautschukdämmung nach GEG. Abrechnung nach Länge.",
             "einheit": "m", "kg": "434", "gen": "B", "achsen": [KWMAT, VERLEG, ORT, HOEHE],
             "varianten": [{"dn": "20", "h": 0.75, "mat": 32}, {"dn": "25", "h": 0.85, "mat": 38}, {"dn": "32", "h": 0.95, "mat": 48},
                           {"dn": "40", "h": 1.05, "mat": 58}, {"dn": "50", "h": 1.25, "mat": 74}, {"dn": "65", "h": 1.5, "mat": 98},
                           {"dn": "80", "h": 1.8, "mat": 125}, {"dn": "100", "h": 2.2, "mat": 165}]},
            {"kurz": "Kaltwasser-Regelventil DN {dn}, PN 16",
             "lang": "Durchgangs- bzw. Dreiwege-Regelventil für Kaltwasser, Gehäuse Grauguss bzw. Rotguss, DN {dn}, PN 16, kvs-Wert nach Berechnung, "
                     "mit Kältedämmkappe, eingebaut und angeschlossen.",
             "einheit": "St", "kg": "434", "gen": "B", "achsen": [ANTR, ORT, HOEHE],
             "varianten": [{"dn": "15", "h": 0.8, "mat": 120}, {"dn": "20", "h": 0.9, "mat": 145}, {"dn": "25", "h": 1.0, "mat": 180}, {"dn": "32", "h": 1.2, "mat": 240},
                           {"dn": "40", "h": 1.5, "mat": 330}, {"dn": "50", "h": 1.8, "mat": 450}, {"dn": "65", "h": 2.4, "mat": 780}, {"dn": "80", "h": 2.8, "mat": 980}]},
            {"kurz": "Absperrklappe Kaltwasser DN {dn}, {art}",
             "lang": "Absperrklappe zwischen Flanschen bzw. Absperrkugelhahn für Kaltwasser, DN {dn}, {art}, mit Kältedämmkappe, eingebaut.",
             "einheit": "St", "kg": "434", "gen": "A", "achsen": [ORT, HOEHE],
             "varianten": [{"dn": "25", "art": "Kugelhahn", "h": 0.6, "mat": 45}, {"dn": "32", "art": "Kugelhahn", "h": 0.7, "mat": 65},
                           {"dn": "50", "art": "Absperrklappe Handhebel", "h": 1.2, "mat": 140}, {"dn": "65", "art": "Absperrklappe Handhebel", "h": 1.5, "mat": 170},
                           {"dn": "80", "art": "Absperrklappe Getriebe", "h": 1.8, "mat": 260}, {"dn": "100", "art": "Absperrklappe Getriebe", "h": 2.2, "mat": 330}]},
            {"kurz": "Strangregulierventil Kaltwasser DN {dn}",
             "lang": "Strangregulierventil mit Messnippeln und Voreinstellung für den hydraulischen Abgleich des Kaltwassernetzes, DN {dn}, mit Kältedämmkappe.",
             "einheit": "St", "kg": "434", "gen": "A", "achsen": [ORT, HOEHE],
             "varianten": [{"dn": "15", "h": 0.7, "mat": 75}, {"dn": "20", "h": 0.8, "mat": 90}, {"dn": "25", "h": 0.9, "mat": 120}, {"dn": "32", "h": 1.0, "mat": 165},
                           {"dn": "40", "h": 1.2, "mat": 230}, {"dn": "50", "h": 1.5, "mat": 320}]},
            {"kurz": "Kühlregister für RLT-Gerät, {art}, {q} kW",
             "lang": "Kühlregister zum Einbau in RLT-Kanal bzw. -Gerät, Bauart {art}, Kühlleistung {q} kW, Lamellen Aluminium, Rohre Kupfer, "
                     "mit Tropfenabscheider und Kondensatwanne Edelstahl, eingebaut und angeschlossen.",
             "einheit": "St", "kg": "434", "gen": "B",
             "achsen": [[{"k": "Lamellen Alu", "t": "Lamellen Aluminium blank."}, {"k": "Lamellen beschichtet", "t": "Lamellen epoxidbeschichtet für korrosive Umgebung.", "fm": 1.2}], ORT],
             "varianten": [{"art": "Kaltwasser", "q": "5", "h": 3, "mat": 650}, {"art": "Kaltwasser", "q": "15", "h": 4, "mat": 1150}, {"art": "Kaltwasser", "q": "30", "h": 5, "mat": 1900},
                           {"art": "Kaltwasser", "q": "60", "h": 7, "mat": 3300}, {"art": "Direktverdampfer (DX)", "q": "10", "h": 4, "mat": 1050},
                           {"art": "Direktverdampfer (DX)", "q": "25", "h": 5, "mat": 1850}, {"art": "Direktverdampfer (DX)", "q": "45", "h": 6.5, "mat": 2900}]},
            {"kurz": "Kältemittel-Gaswarnanlage, {n} Sensor(en)",
             "lang": "Gaswarnanlage nach DIN EN 378-3 für Räume mit Kältemittel (Innengeräte bzw. Kältezentrale), Zentrale mit {n} Sensor(en) passend zum Kältemittel, "
                     "optischer und akustischer Alarm, Abschaltung bzw. Lüftungsansteuerung, Inbetriebnahme und Prüfung.",
             "einheit": "St", "kg": "434", "gen": "C", "lohn": "elektro", "achsen": [ORT],
             "varianten": [{"n": "1", "h": 4, "mat": 750}, {"n": "2", "h": 5.5, "mat": 1100}, {"n": "4", "h": 8, "mat": 1750}, {"n": "8", "h": 13, "mat": 2900}]},
            {"kurz": "Kühlwasser-Glykolfüllung {art}",
             "lang": "Kälteträgerkreis mit Wasser-Glykol-Gemisch füllen, Mischung {art}, Konzentration prüfen und protokollieren. Abrechnung nach Füllmenge.",
             "einheit": "l", "kg": "434", "gen": "B",
             "varianten": [{"art": "Ethylenglykol 30 %", "h": 0.01, "mat": 1.3}, {"art": "Propylenglykol 35 %", "h": 0.01, "mat": 1.9}]},
            {"kurz": "Kondensatleitung PP/PVC, DN {dn}",
             "lang": "Kondensatleitung aus Kunststoffrohr mit Gefälle, einschließlich Formteile, Befestigung und Anschluss an Abwasser über Geruchsverschluss "
                     "(Siphon mit Rückschlagsicherung), Abmessung DN {dn}.",
             "einheit": "m", "kg": "434", "gen": "A", "achsen": [VERLEG[:2], ORT, HOEHE],
             "varianten": [{"dn": "20", "h": 0.3, "mat": 4.5}, {"dn": "32", "h": 0.35, "mat": 6.5}, {"dn": "40", "h": 0.4, "mat": 8}]},
            {"kurz": "Kondensatpumpe für Klimagerät, {art}",
             "lang": "Kondensatpumpe {art} mit Alarmkontakt, Förderhöhe bis 10 m, montiert und angeschlossen.",
             "einheit": "St", "kg": "434", "gen": "B", "achsen": [ORT],
             "varianten": [{"art": "Minipumpe im Kanal", "h": 1.0, "mat": 120}, {"art": "Behälterpumpe", "h": 1.2, "mat": 165}]},
            {"kurz": "Kältemittel nachfüllen, {km}",
             "lang": "Kältemittel {km} gemäß Leitungslänge und Herstellerangabe nachfüllen, Menge dokumentieren und im Anlagenlogbuch eintragen.",
             "einheit": "kg", "kg": "434", "gen": "C",
             "varianten": [{"km": "R32", "h": 0.2, "mat": 38}, {"km": "R410A", "h": 0.2, "mat": 75}, {"km": "R290", "h": 0.25, "mat": 45}, {"km": "R454B", "h": 0.2, "mat": 62}]},
            {"kurz": "Mauerdurchführung Kältemittelleitung, {art}",
             "lang": "Durchführung der Kälte- und Kondensatleitungen durch {art}, Kernbohrung, Mantelrohr, Abdichtung luft- und schlagregendicht.",
             "einheit": "St", "kg": "434", "gen": "B", "lohn": "rohbau",
             "varianten": [{"art": "Mauerwerk bis 36,5 cm", "h": 1.5, "mat": 25, "geraet": 35}, {"art": "Stahlbeton bis 30 cm", "h": 2.0, "mat": 25, "geraet": 60},
                           {"art": "WDVS-Fassade mit Kernbohrung", "h": 2.2, "mat": 45, "geraet": 45}]},
            {"kurz": "Leitungsabdeckkanal außen, {b} mm",
             "lang": "Leitungsabdeckkanal aus Kunststoff, UV-beständig, mit Form- und Endstücken, Größe {b} mm, an der Fassade montiert.",
             "einheit": "m", "kg": "434", "gen": "A",
             "varianten": [{"b": "60 × 45", "h": 0.3, "mat": 9}, {"b": "80 × 60", "h": 0.35, "mat": 12}, {"b": "100 × 70", "h": 0.4, "mat": 16}]},
            {"kurz": "Kaltwasser-Pufferspeicher {v} l, kältegedämmt",
             "lang": "Pufferspeicher für Kaltwasser aus Stahl, Inhalt {v} l, mit diffusionsdichter Kältedämmung, Anschlussstutzen und Fühlerhülsen.",
             "einheit": "St", "kg": "434", "gen": "B", "achsen": [ORT],
             "varianten": [{"v": "200", "h": 4, "mat": 1150}, {"v": "500", "h": 6, "mat": 1900}, {"v": "1000", "h": 8, "mat": 3100}]},
            {"kurz": "Kühlkreis-Pumpengruppe DN {dn}, mit Mischer",
             "lang": "Vormontierte Pumpengruppe für Kaltwasserkreis, Hocheffizienzpumpe, Dreiwege-Mischventil mit Stellantrieb, Absperrungen, Thermometer, "
                     "Kältedämmschale, DN {dn}.",
             "einheit": "St", "kg": "434", "gen": "B", "achsen": [ORT],
             "varianten": [{"dn": "25", "h": 3, "mat": 980}, {"dn": "32", "h": 3.5, "mat": 1250}, {"dn": "40", "h": 4.5, "mat": 1750}]},
        ]},
        {"name": "Inbetriebnahme, Prüfungen", "positionen": [
            {"kurz": "Dichtheitsprüfung Kälteanlage, Füllmenge {f}",
             "lang": "Dichtheitsprüfung nach Verordnung (EU) 2024/573 bzw. DIN EN 378-4 einschließlich Eintrag im Anlagenlogbuch, Füllmenge {f}.",
             "einheit": "St", "kg": "434", "gen": "B",
             "varianten": [{"f": "bis 5 t CO₂-Äq.", "h": 1.5, "mat": 10}, {"f": "bis 50 t CO₂-Äq.", "h": 2.5, "mat": 15}, {"f": "über 50 t CO₂-Äq.", "h": 4, "mat": 25}]},
            {"kurz": "Inbetriebnahme und Einregulierung Kälteanlage, {art}",
             "lang": "Inbetriebnahme, Funktionsprüfung, Einregulierung der Volumenströme und Sollwerte sowie Einweisung des Betreibers für {art}; "
                     "Inbetriebnahmeprotokoll und Revisionsunterlagen.",
             "einheit": "psch", "kg": "434", "gen": "C",
             "varianten": [{"art": "Single-/Multi-Split", "h": 3, "mat": 0, "geraet": 20}, {"art": "VRF-System bis 16 Innengeräte", "h": 12, "geraet": 60},
                           {"art": "Kaltwassersystem", "h": 16, "geraet": 80}]},
            {"kurz": "Demontage Altklimagerät, Kältemittel absaugen und entsorgen",
             "lang": "Vorhandenes Klimagerät (Innen- und Außengerät) demontieren, Kältemittel fachgerecht absaugen, Gerät und Kältemittel nach "
                     "Elektro- und Elektronikgerätegesetz bzw. Chemikalienrecht entsorgen, Nachweis führen.",
             "einheit": "St", "kg": "394", "gen": "B", "tags": ["altbau"],
             "varianten": [{"h": 3, "mat": 0, "geraet": 85}, {"h": 6, "geraet": 180, "kurz": "Demontage Alt-Kaltwassersatz bis 50 kW, Kältemittel entsorgen"}]},
            {"kurz": "Wartung Kälte-/Klimaanlage je Jahr, {art}",
             "lang": "Jährliche Wartung nach Herstellervorgabe und VDMA 24186-3: Reinigung, Filterwechsel, Kontrolle der Kältemittelfüllung, Dichtheitsprüfung, "
                     "Funktionsprüfung der Regel- und Sicherheitseinrichtungen, Protokoll. Anlage: {art}.",
             "einheit": "St", "kg": "434", "gen": "B",
             "varianten": [{"art": "Single-Split", "h": 2, "mat": 25}, {"art": "Multi-Split bis 5 Innengeräte", "h": 4, "mat": 45},
                           {"art": "VRF bis 16 Innengeräte", "h": 10, "mat": 120}, {"art": "Kaltwassersatz bis 100 kW", "h": 8, "mat": 150}]},
        ]},
    ],
}]
