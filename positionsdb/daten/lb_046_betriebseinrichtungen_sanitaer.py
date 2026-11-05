# LB 046 Gas-, Wasser- und Entwässerungsanlagen – Betriebseinrichtungen – eigene Texte und Ansätze (Preisstand 11/2026)

ORT = [{}, {"k": "Bestand", "t": "Einbau im Bestand: Demontage/Anpassung vorhandener Anschlüsse, beengte Einbringung, Betrieb der Anlage während der Arbeiten aufrechterhalten.",
            "fh": 1.35, "fm": 1.03, "gen": "C", "tags": ["altbau"]}]
EINBRING = [{}, {"k": "erschwert", "t": "Einbringung durch Treppenhaus bzw. Kellerschacht ohne Hebezeug, Transport von Hand.", "h": 3.0, "geraet": 80}]
INBETR = [{"k": "", "t": ""},
          {"k": "Wartung 2 J.", "t": "Einschließlich Wartung nach Herstellervorgabe für die ersten zwei Betriebsjahre (Angebot gesondert ausweisen).", "h": 4.0, "mat": 180}]

LBS = [{
    "nr": "046", "name": "Gas-, Wasser- und Entwässerungsanlagen – Betriebseinrichtungen", "atv": "DIN 18381", "lohn": "sanitaer",
    "gruppen": [
        {"name": "Druckerhöhung, Pumpen", "positionen": [
            {"kurz": "DEA Trinkwasser, {p} Pumpen, bis {q} m³/h",
             "lang": "Trinkwasser-Druckerhöhungsanlage nach DIN 1988-500 als anschlussfertige Kompaktanlage mit {p} drehzahlgeregelten "
                     "Kreiselpumpen in Edelstahl, Förderstrom bis {q} m³/h, Membrandruckbehälter, Schaltgerät mit Störmeldeausgang, "
                     "Absperr- und Rückflussverhinderer, auf schwingungsgedämpftem Grundrahmen. Einschließlich Montage, Anschluss an "
                     "bauseitige Rohrleitungen, Inbetriebnahme und Einweisung.",
             "einheit": "St", "kg": "412", "gen": "C", "achsen": [ORT, EINBRING, INBETR],
             "varianten": [{"p": "2", "q": "4", "h": 14, "mat": 5800}, {"p": "2", "q": "10", "h": 16, "mat": 8200},
                           {"p": "3", "q": "16", "h": 20, "mat": 12500}, {"p": "3", "q": "30", "h": 26, "mat": 18500}]},
            {"kurz": "Zirkulationspumpe Trinkwarmwasser, Hocheffizienz, DN {dn}",
             "lang": "Zirkulationspumpe für Trinkwarmwasser, Pumpengehäuse Edelstahl bzw. Rotguss, elektronisch geregelt (EC-Motor), "
                     "mit Absperrungen und Rückflussverhinderer, Anschluss DN {dn}, verdrahtungsfertig.",
             "einheit": "St", "kg": "412", "gen": "B", "achsen": [ORT, INBETR],
             "varianten": [{"dn": "15", "h": 2.0, "mat": 360}, {"dn": "20", "h": 2.3, "mat": 480}, {"dn": "25", "h": 2.6, "mat": 720},
                           {"dn": "32", "h": 3.0, "mat": 1050}]},
            {"kurz": "Tauchmotorpumpe Schmutzwasser, {q} m³/h, Förderhöhe {fh_} m",
             "lang": "Tauchmotor-Schmutzwasserpumpe für fäkalienfreies Abwasser, Grauguss bzw. Edelstahl, mit Schwimmerschalter, "
                     "Druckleitungsanschluss, Rückschlagklappe und Absperrschieber. Förderstrom bis {q} m³/h bei {fh_} m Förderhöhe.",
             "einheit": "St", "kg": "411", "gen": "B", "achsen": [ORT, INBETR],
             "varianten": [{"q": "8", "fh_": "6", "h": 3.0, "mat": 480}, {"q": "15", "fh_": "8", "h": 3.5, "mat": 820},
                           {"q": "25", "fh_": "10", "h": 4.5, "mat": 1350}]},
            {"kurz": "Pumpenschacht Kunststoff für Schmutzwasserpumpe, Ø {d} mm",
             "lang": "Pumpenschacht aus PE mit befahrbarer bzw. begehbarer Abdeckung, Zulaufstutzen DN 150, Durchführung für Druckleitung und Kabel, "
                     "Durchmesser {d} mm, Tiefe bis 1,5 m, Erdarbeiten gesondert.",
             "einheit": "St", "kg": "411", "gen": "B", "achsen": [ORT],
             "varianten": [{"d": "400", "h": 4, "mat": 450}, {"d": "600", "h": 5, "mat": 780}, {"d": "800", "h": 6, "mat": 1250}]},
            {"kurz": "Hebeanlage fäkalienh., {art}, Behälter {v} l",
             "lang": "Abwasserhebeanlage für fäkalienhaltiges Abwasser nach DIN EN 12050-1, {art}, Sammelbehälter {v} l, gasdicht, mit "
                     "Schaltgerät, Alarmschaltung, Absperrschiebern, Rückflussverhinderer und Handmembranpumpe für Notentleerung, "
                     "anschlussfertig montiert.",
             "einheit": "St", "kg": "411", "gen": "C", "achsen": [ORT, EINBRING, INBETR],
             "varianten": [{"art": "Einzelanlage", "v": "60", "h": 12, "mat": 2900}, {"art": "Einzelanlage", "v": "120", "h": 14, "mat": 3900},
                           {"art": "Doppelanlage", "v": "250", "h": 20, "mat": 7900}, {"art": "Doppelanlage", "v": "450", "h": 24, "mat": 11800}]},
        ]},
        {"name": "Wasserbehandlung", "positionen": [
            {"kurz": "Enthärtungsanlage Doppelsäule, bis {q} m³/h",
             "lang": "Vollautomatische Enthärtungsanlage mit zwei Austauschersäulen im Pendelbetrieb, mengengesteuerte Regeneration, "
                     "Verschneideventil, Solebehälter, Anschlussblock mit Bypass, DVGW-geprüft, Nennleistung bis {q} m³/h.",
             "einheit": "St", "kg": "412", "gen": "C", "achsen": [ORT, INBETR],
             "varianten": [{"q": "1,5", "h": 6, "mat": 2400}, {"q": "3", "h": 7, "mat": 3600}, {"q": "6", "h": 9, "mat": 6200}]},
            {"kurz": "Dosieranlage Mineralstoff, DN {dn}",
             "lang": "Mengenproportionale Dosieranlage für Mineralstofflösung zum Korrosionsschutz, mit Kontaktwasserzähler, Dosierpumpe und "
                     "Vorratsbehälter, Anschluss DN {dn}.",
             "einheit": "St", "kg": "412", "gen": "B", "achsen": [ORT, INBETR],
             "varianten": [{"dn": "25", "h": 3, "mat": 950}, {"dn": "40", "h": 3.5, "mat": 1450}, {"dn": "50", "h": 4, "mat": 2100}]},
            {"kurz": "UV-Desinfektionsanlage Trinkwasser, bis {q} m³/h",
             "lang": "UV-Desinfektionsanlage mit Edelstahlreaktor, UV-Sensor, Steuergerät und Spülanschluss, DVGW-zertifiziert, bis {q} m³/h.",
             "einheit": "St", "kg": "412", "gen": "C", "achsen": [ORT, INBETR],
             "varianten": [{"q": "2", "h": 5, "mat": 2900}, {"q": "6", "h": 6, "mat": 4800}, {"q": "15", "h": 8, "mat": 8500}]},
            {"kurz": "Rückspülfilter automatisch, DN {dn}",
             "lang": "Rückspülfilter mit automatischer, zeit- und differenzdruckgesteuerter Rückspülung, Filterfeinheit 90 µm, mit Kanalanschluss, DN {dn}.",
             "einheit": "St", "kg": "412", "gen": "B", "achsen": [ORT],
             "varianten": [{"dn": "32", "h": 2.5, "mat": 780}, {"dn": "50", "h": 3.5, "mat": 1650}, {"dn": "80", "h": 5, "mat": 3400}]},
            {"kurz": "Trennstation / Systemtrenner Typ {t}, DN {dn}",
             "lang": "Sicherungseinrichtung nach DIN EN 1717 als Trennstation bzw. Systemtrenner Typ {t}, mit Absperrungen und Ablauftrichter, DN {dn}.",
             "einheit": "St", "kg": "412", "gen": "B", "achsen": [ORT],
             "varianten": [{"t": "BA", "dn": "25", "h": 3, "mat": 650}, {"t": "BA", "dn": "50", "h": 4, "mat": 1450}, {"t": "AB (Freier Auslauf, Trennstation)", "dn": "32", "h": 6, "mat": 3800}]},
        ]},
        {"name": "Regenwassernutzung, Abscheider im Gebäude", "positionen": [
            {"kurz": "Regenwasser-Zisterne Kunststoff, {v} l, erdverlegt",
             "lang": "Regenwasser-Erdtank aus PE mit Teleskopdom und begehbarer bzw. PKW-befahrbarer Abdeckung, Zulauf mit Filterkorb, "
                     "beruhigter Zulauf, Überlaufsiphon mit Kleintierschutz, Volumen {v} l. Erdarbeiten gesondert.",
             "einheit": "St", "kg": "411", "gen": "B",
             "achsen": [[{"k": "begehbar", "t": "Abdeckung begehbar."}, {"k": "PKW-befahrbar", "t": "Abdeckung PKW-befahrbar (Klasse B).", "mat": 420}], ORT],
             "varianten": [{"v": "3.000", "h": 6, "mat": 1350}, {"v": "5.000", "h": 7, "mat": 1950}, {"v": "7.500", "h": 8, "mat": 2800},
                           {"v": "10.000", "h": 10, "mat": 3800}]},
            {"kurz": "Regenwasser-Hauswasserzentrale mit Nachspeisung",
             "lang": "Regenwasser-Hauswasserzentrale mit selbstansaugender Pumpe, Trinkwassernachspeisung über freien Auslauf nach DIN EN 1717, "
                     "Steuerung mit Füllstandsanzeige, Kennzeichnung der Betriebswasserleitungen.",
             "einheit": "St", "kg": "412", "gen": "B", "h": 6, "mat": 1650, "achsen": [ORT, INBETR]},
            {"kurz": "Fettabscheider im Gebäude, NS {ns}, {art}",
             "lang": "Fettabscheideranlage nach DIN EN 1825/DIN 4040-100 zur Aufstellung im Gebäude, Edelstahl bzw. PE, Nenngröße NS {ns}, "
                     "mit Probenahmeeinrichtung, {art}, Schaltgerät und Schichtdickenmessung, anschlussfertig.",
             "einheit": "St", "kg": "411", "gen": "C", "achsen": [EINBRING, INBETR],
             "varianten": [{"ns": "2", "art": "Direktentsorgung", "h": 16, "mat": 8500}, {"ns": "4", "art": "Direktentsorgung", "h": 18, "mat": 11500},
                           {"ns": "7", "art": "Direktentsorgung, Hebeanlage", "h": 24, "mat": 19800}, {"ns": "10", "art": "Direktentsorgung, Hebeanlage", "h": 28, "mat": 26500}]},
            {"kurz": "Stärkeabscheider, NS {ns}",
             "lang": "Stärkeabscheider für Küchenabwasser aus Kartoffelschälmaschinen, Edelstahl, Nenngröße NS {ns}, mit Spüleinrichtung.",
             "einheit": "St", "kg": "411", "gen": "C", "achsen": [EINBRING],
             "varianten": [{"ns": "1", "h": 8, "mat": 3800}, {"ns": "2", "h": 10, "mat": 5200}]},
        ]},
        {"name": "Gasanlagen", "positionen": [
            {"kurz": "Gas-Druckregelgerät mit Sicherheitsabsperrventil, DN {dn}",
             "lang": "Gas-Druckregelgerät mit integriertem Sicherheitsabsperrventil und Sicherheitsabblaseventil, Eingangsdruck bis 1 bar, DN {dn}, "
                     "mit Isolierstück und Absperrarmatur, montiert und geprüft.",
             "einheit": "St", "kg": "412", "gen": "B", "lohn": "heizung", "achsen": [ORT],
             "varianten": [{"dn": "25", "h": 3, "mat": 650}, {"dn": "40", "h": 4, "mat": 1350}, {"dn": "50", "h": 5, "mat": 2400}]},
            {"kurz": "Gasströmungswächter / thermisch auslösende Absperreinrichtung DN {dn}",
             "lang": "Gasströmungswächter bzw. thermisch auslösende Absperreinrichtung nach DVGW-TRGI, DN {dn}, eingebaut.",
             "einheit": "St", "kg": "412", "gen": "A", "lohn": "heizung", "achsen": [ORT],
             "varianten": [{"dn": "20", "h": 0.8, "mat": 65}, {"dn": "25", "h": 1.0, "mat": 85}, {"dn": "40", "h": 1.4, "mat": 180}]},
            {"kurz": "Dichtheits- und Gebrauchsfähigkeitsprüfung Gasleitung, bis {l} m",
             "lang": "Belastungs- und Dichtheitsprüfung bzw. Gebrauchsfähigkeitsprüfung der Gasinstallation nach DVGW G 600 mit Prüfprotokoll, "
                     "Leitungslänge bis {l} m.",
             "einheit": "St", "kg": "412", "gen": "A", "lohn": "heizung",
             "varianten": [{"l": "25", "h": 2.5, "mat": 15}, {"l": "100", "h": 4.5, "mat": 25}]},
        ]},
    ],
}]
