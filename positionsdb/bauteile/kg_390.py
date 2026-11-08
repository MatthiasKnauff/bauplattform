# Bauteilvorlagen KG 390 Sonstige Maßnahmen für Baukonstruktionen (391 Baustelleneinrichtung, 392 Gerüste, 393 Sicherungsmaßnahmen,
# 394 Abbruchmaßnahmen, 395 Instandsetzungen, 396 Materialentsorgung, 397 Zusätzliche Maßnahmen, 398 Provisorische Baukonstruktionen)
# – eigene Aufbauten aus der Positionsdatenbank. Faktor = Menge der Position je Einheit des Bauteils.
# Annahmen: Rohdichten Abbruch Mauerwerk 1,75 t/m³, Stahlbeton 2,5 t/m³, Boden 1,8 t/m³ (fest);
# Vorhaltezeiten in Wochen (Wo) bzw. Tagen sind in den Optionstexten genannt.

VORLAGEN = [
    # ---------------------------------------------------------------- 391 Baustelleneinrichtung
    {"id": "391.01", "kg": "391", "name": "Bauzaun", "einheit": "m",
     "lang": "Baustellenumzäunung liefern, aufstellen, für die Bauzeit vorhalten und wieder entfernen, mit Toren und Sichtschutz anteilig.",
     "bezug": "Zaunlänge; Tore 1 je 50 m",
     "schichten": [
         {"name": "Zaun", "optionen": [
             {"k": "mobil 2,0 m", "t": "mobiler Bauzaun 2,0 m mit Fußplatten", "teile": [["000.11.002.01001", 1.0]], "std": True},
             {"k": "mobil + Plane", "t": "mobiler Bauzaun mit Sichtschutzplane", "teile": [["000.11.002.02001", 1.0]], "std": True},
             {"k": "Holzbohlen", "t": "Holzbohlenzaun 2,0 m", "teile": [["000.11.002.03001", 1.0]]},
             {"k": "Trapezblech 2,5", "t": "Stahlblechzaun Trapezblech 2,5 m", "teile": [["000.11.002.04001", 1.0]], "std": True}]},
         {"name": "Vorhaltung", "optionen": [
             {"k": "26 Wo", "t": "Vorhaltung 26 Wochen", "teile": [["000.02.002.01001", 26.0]], "std": True},
             {"k": "52 Wo", "t": "Vorhaltung 52 Wochen", "teile": [["000.02.002.01001", 52.0]], "std": True},
             {"k": "78 Wo", "t": "Vorhaltung 78 Wochen", "teile": [["000.02.002.01001", 78.0]]}]},
         {"name": "Tore", "optionen": [
             {"k": "Tor 3,5 m", "t": "Bauzauntor 3,5 m, 1 je 50 m", "teile": [["000.02.003.01001", 0.02]], "std": True},
             {"k": "Tor 7,0 m", "t": "Bauzauntor 7,0 m, 1 je 50 m", "teile": [["000.02.003.02001", 0.02]], "std": True},
             {"k": "Tor 7 m + Werbung", "t": "Bauzauntor 7,0 m, Werbeplane über die ganze Länge", "teile": [["000.02.003.02001", 0.02], ["000.02.004.01001", 1.0]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "391.02", "kg": "391", "name": "Baustelleneinrichtung pauschal", "einheit": "psch",
     "lang": "Baustelle einrichten und räumen, Einrichtung (Unterkünfte, Geräte, Lagerflächen, Sicherungen) für die Bauzeit vorhalten, "
             "Baustellenschild und Medienanschlüsse nach Wahl.",
     "bezug": "Pauschal je Baumaßnahme bzw. Los; Bauvolumen der eigenen Leistung und Bauzeit siehe Option",
     "schichten": [
         {"name": "Größe/Bauzeit", "optionen": [
             {"k": "≤50 T€, 12 Wo", "t": "Bauvolumen bis 50.000 €, 12 Wochen", "teile": [["000.01.001.01001", 1.0], ["000.01.002.01001", 12.0]], "std": True},
             {"k": "≤50 T€, 20 Wo", "t": "Bauvolumen bis 50.000 €, 20 Wochen", "teile": [["000.01.001.01001", 1.0], ["000.01.002.01001", 20.0]], "std": True},
             {"k": "≤250 T€, 26 Wo", "t": "Bauvolumen bis 250.000 €, 26 Wochen", "teile": [["000.01.001.02001", 1.0], ["000.01.002.02001", 26.0]], "std": True},
             {"k": "≤250 T€, 40 Wo", "t": "Bauvolumen bis 250.000 €, 40 Wochen", "teile": [["000.01.001.02001", 1.0], ["000.01.002.02001", 40.0]], "std": True},
             {"k": "≤1 Mio, 52 Wo", "t": "Bauvolumen bis 1.000.000 €, 52 Wochen", "teile": [["000.01.001.03001", 1.0], ["000.01.002.03001", 52.0]], "std": True},
             {"k": "≤1 Mio, 78 Wo", "t": "Bauvolumen bis 1.000.000 €, 78 Wochen", "teile": [["000.01.001.03001", 1.0], ["000.01.002.03001", 78.0]], "std": True}]},
         {"name": "Bauschild", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Schild 2 m²", "t": "Baustellenschild 2 m²", "teile": [["000.01.003.01001", 1.0]]},
             {"k": "Schild 6 m²", "t": "Baustellenschild 6 m²", "teile": [["000.01.003.02001", 1.0]], "std": True}]},
         {"name": "Medien", "optionen": [
             {"k": "", "t": "Medien durch Bauherrn gestellt", "teile": []},
             {"k": "Strom 63 A + Wasser", "t": "Baustromanschluss 63 A, Bauwasseranschluss mit Standrohr", "teile": [["000.04.001.01001", 1.0], ["000.04.003.01001", 1.0]], "std": True},
             {"k": "Strom 125 A + Wasser", "t": "Baustromanschluss 125 A, 2 Unterverteiler, Bauwasseranschluss",
              "teile": [["000.04.001.02001", 1.0], ["000.04.002.01001", 2.0], ["000.04.003.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "391.03", "kg": "391", "name": "Baucontainer", "einheit": "St",
     "lang": "Baustellencontainer liefern, aufstellen, an die Baustellenversorgung anschließen, für die angegebene Zeit vorhalten und abholen.",
     "bezug": "Anzahl der Container bzw. Toiletten",
     "schichten": [
         {"name": "Container", "optionen": [
             {"k": "Büro 26 Wo", "t": "Bürocontainer 20 ft, 26 Wochen", "teile": [["000.08.002.02001", 1.0], ["000.08.001.01001", 26.0]], "std": True},
             {"k": "Büro möbl. 52 Wo", "t": "Bürocontainer 20 ft möbliert, 52 Wochen", "teile": [["000.08.002.02001", 1.0], ["000.08.001.02001", 52.0]], "std": True},
             {"k": "Mannschaft 26 Wo", "t": "Mannschaftscontainer 20 ft, 26 Wochen", "teile": [["000.08.002.02001", 1.0], ["000.08.001.03001", 26.0]], "std": True},
             {"k": "Besprechung 52 Wo", "t": "Besprechungscontainer 2 × 20 ft, 52 Wochen", "teile": [["000.08.002.02001", 2.0], ["000.08.001.05001", 52.0]]},
             {"k": "Sanitär 26 Wo", "t": "Sanitärcontainer WC Damen/Herren, 26 Wochen", "teile": [["000.08.002.02001", 1.0], ["000.08.003.01001", 26.0]], "std": True},
             {"k": "Sanitär 52 Wo", "t": "Sanitärcontainer WC und Dusche, 52 Wochen", "teile": [["000.08.002.02001", 1.0], ["000.08.003.02001", 52.0]]},
             {"k": "Magazin 26 Wo", "t": "Magazincontainer 20 ft, 26 Wochen", "teile": [["000.08.002.02001", 1.0], ["000.08.001.06001", 26.0]], "std": True}]},
         {"name": "Anschluss", "optionen": [
             {"k": "Strom", "t": "Anschluss Baustrom", "teile": [["000.08.005.01001", 1.0]], "std": True},
             {"k": "Strom + Wasser", "t": "Anschluss Baustrom, Bauwasser und Schmutzwasser", "teile": [["000.08.005.01001", 1.0], ["000.08.005.02001", 1.0]], "std": True},
             {"k": "Strom + LTE", "t": "Anschluss Baustrom und Netzwerk (LTE-Router)", "teile": [["000.08.005.01001", 1.0], ["000.08.005.03001", 1.0]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "391.04", "kg": "391", "name": "Baustrom und Bauwasser", "einheit": "psch",
     "lang": "Baustellenversorgung mit Strom und Wasser: Anschlüsse, Verteiler, Verbrauch und Vorhaltung für die Bauzeit.",
     "bezug": "Pauschal je Baustelle",
     "schichten": [
         {"name": "Anschluss", "optionen": [
             {"k": "63 A + Wasser", "t": "Baustromanschluss 63 A, 2 Unterverteiler, Standrohr", "teile": [["000.04.001.01001", 1.0], ["000.04.002.01001", 2.0], ["000.04.003.01001", 1.0]], "std": True},
             {"k": "125 A + Wasser", "t": "Baustromanschluss 125 A, 4 Unterverteiler, Standrohr", "teile": [["000.04.001.02001", 1.0], ["000.04.002.01001", 4.0], ["000.04.003.01001", 1.0]], "std": True}]},
         {"name": "Verbrauch", "optionen": [
             {"k": "klein 26 Wo", "t": "Strom und Wasser kleine Baustelle, 26 Wochen", "teile": [["000.09.002.01001", 26.0], ["000.09.003.01001", 26.0]], "std": True},
             {"k": "mittel 52 Wo", "t": "Strom und Wasser mittlere Baustelle mit Kran, 52 Wochen", "teile": [["000.09.002.02001", 52.0], ["000.09.003.02001", 52.0]], "std": True},
             {"k": "groß 52 Wo", "t": "Strom und Wasser große Baustelle mit Bauheizung, 52 Wochen", "teile": [["000.09.002.03001", 52.0], ["000.09.003.03001", 52.0]]}]},
         {"name": "Beleuchtung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Beleuchtung TH", "t": "Baustellenbeleuchtung Treppenhaus/Flure", "teile": [["000.04.004.01001", 1.0]], "std": True},
             {"k": "Lichtmast 26 Wo", "t": "LED-Lichtmast 26 Wochen", "teile": [["000.09.005.02001", 26.0]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "391.05", "kg": "391", "name": "Turmdrehkran", "einheit": "psch",
     "lang": "Turmdrehkran an- und abtransportieren, montieren und demontieren, Ballast/Fundament, Vorhaltung nach Bauzeit, Kranführer und Genehmigung nach Wahl.",
     "bezug": "Pauschal je Kranstandort",
     "schichten": [
         {"name": "Kran/Vorhaltung", "optionen": [
             {"k": "SMK 20 Wo", "t": "Schnellmontagekran bis 30 m, Ballast FT, 20 Wochen",
              "teile": [["000.10.002.01001", 1.0], ["000.10.003.01001", 1.0], ["000.10.001.01001", 20.0]], "std": True},
             {"k": "SMK 40 Wo", "t": "Schnellmontagekran bis 30 m, Ballast FT, 40 Wochen",
              "teile": [["000.10.002.01001", 1.0], ["000.10.003.01001", 1.0], ["000.10.001.01001", 40.0]], "std": True},
             {"k": "OD 50 m 30 Wo", "t": "Obendreher bis 50 m, Ortbetonfundament, 30 Wochen",
              "teile": [["000.10.002.02001", 1.0], ["000.10.003.02001", 1.0], ["000.10.001.02001", 30.0]], "std": True},
             {"k": "OD 50 m 52 Wo", "t": "Obendreher bis 50 m, Ortbetonfundament, 52 Wochen",
              "teile": [["000.10.002.02001", 1.0], ["000.10.003.02001", 1.0], ["000.10.001.02001", 52.0]], "std": True},
             {"k": "OD 60 m 52 Wo", "t": "Obendreher bis 60 m, Ortbetonfundament, 52 Wochen",
              "teile": [["000.10.002.03001", 1.0], ["000.10.003.02001", 1.0], ["000.10.001.03001", 52.0]]}]},
         {"name": "Kranführer", "optionen": [
             {"k": "", "t": "Kran durch Polier/Monteure bedient", "teile": [], "std": True},
             {"k": "Kranführer 400 h", "t": "Kranführer 400 Stunden Normalarbeitszeit", "teile": [["000.10.004.01001", 400.0]], "std": True}]},
         {"name": "Genehmigung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Anordnung Kran", "t": "verkehrsrechtliche Anordnung Kranaufstellung", "teile": [["090.01.004.03001", 1.0]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "391.06", "kg": "391", "name": "Baustraße/Lagerfläche", "einheit": "m²",
     "lang": "Provisorische Baustraße bzw. Lagerfläche herstellen, vorhalten und nach Bauende zurückbauen, Oberboden vorher abtragen und wieder andecken.",
     "bezug": "Befestigte Fläche",
     "schichten": [
         {"name": "Befestigung", "optionen": [
             {"k": "Schotter 20 Pkw", "t": "Schotter 20 cm auf Vlies, Pkw/Transporter, Rückbau", "teile": [["000.07.001.01001", 1.0]], "std": True},
             {"k": "Schotter 30 Lkw", "t": "Schotter 30 cm auf Vlies, Lkw bis 40 t, Rückbau", "teile": [["000.07.001.02001", 1.0]], "std": True},
             {"k": "Schotter 40 Kran", "t": "Schotter 40 cm auf Vlies, Lkw und Mobilkran, Rückbau", "teile": [["000.07.001.03001", 1.0]], "std": True},
             {"k": "Platten KS 26 Wo", "t": "Lastverteilungsplatten Kunststoff Lkw, 26 Wochen", "teile": [["000.07.002.02001", 26.0]]},
             {"k": "Platten St 12 Wo", "t": "Lastverteilungsplatten Stahl Schwerlast, 12 Wochen", "teile": [["000.07.002.03001", 12.0]]}]},
         {"name": "Oberboden", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "OB ab + an", "t": "Oberboden 20 cm abtragen, lagern und wieder andecken", "teile": [["002.01.003.01001", 1.0], ["002.01.005.01001", 1.0]], "std": True},
             {"k": "OB abfahren", "t": "Oberboden 20 cm abtragen und abfahren", "teile": [["002.01.004.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "391.07", "kg": "391", "name": "BE-Richtwert je m² BGF", "einheit": "m²",
     "lang": "Richtwert für die Baustelleneinrichtung in frühen Kostenermittlungen, je m² Brutto-Grundfläche: Einrichten und Vorhalten, "
             "Hebezeug und Bauzaun anteilig nach Projekttyp.",
     "bezug": "Brutto-Grundfläche (BGF); Annahmen je Option (BGF, Bauzeit, Zaunlänge)",
     "schichten": [
         {"name": "Projekt", "optionen": [
             {"k": "EFH 250 m²", "t": "EFH, BGF 250 m², Bauvolumen bis 250 T€, 20 Wochen", "teile": [["000.01.001.02001", 0.004], ["000.01.002.02001", 0.08]], "std": True},
             {"k": "MFH 1.500 m²", "t": "MFH, BGF 1.500 m², Bauvolumen bis 1 Mio € (Rohbaulos), 60 Wochen", "teile": [["000.01.001.03001", 0.00067], ["000.01.002.03001", 0.04]], "std": True},
             {"k": "Anbau 120 m²", "t": "Anbau/Umbau, BGF 120 m², Bauvolumen bis 50 T€, 16 Wochen", "teile": [["000.01.001.01001", 0.0083], ["000.01.002.01001", 0.133]], "std": True}]},
         {"name": "Hebezeug", "optionen": [
             {"k": "", "t": "Hebezeug in BE enthalten bzw. Autokran gesondert", "teile": [], "std": True},
             {"k": "SMK anteilig", "t": "Schnellmontagekran 20 Wochen je 500 m² BGF", "teile": [["000.10.002.01001", 0.002], ["000.10.001.01001", 0.04]], "std": True},
             {"k": "Autokran 16 h", "t": "Autokran 40 t, 16 h je 250 m² BGF", "teile": [["000.05.003.01001", 0.064]]}]},
         {"name": "Bauzaun", "optionen": [
             {"k": "", "t": "", "teile": []},
             {"k": "Zaun 0,3 m/m²", "t": "mobiler Bauzaun 0,3 m je m² BGF, 30 Wochen", "teile": [["000.11.002.01001", 0.3], ["000.02.002.01001", 9.0]], "std": True},
             {"k": "Zaun + Plane", "t": "mobiler Bauzaun mit Sichtschutz 0,3 m je m², 30 Wochen", "teile": [["000.11.002.02001", 0.3], ["000.02.002.01001", 9.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "391.08", "kg": "391", "name": "Verkehrssicherung/Logistik", "einheit": "psch",
     "lang": "Verkehrsrechtliche Anordnung, Absperrung im öffentlichen Raum, Fußgängerschutz und Baustellenüberwachung für eine innerstädtische Baustelle.",
     "bezug": "Pauschal je Baustelle (Absperrung 20 m über 20 Wochen)",
     "schichten": [
         {"name": "Anordnung/Absperrung", "optionen": [
             {"k": "Halteverbot", "t": "Halteverbot/Ladezone, Absperrschranken 20 m × 20 Wo", "teile": [["090.01.004.01001", 1.0], ["000.11.001.01001", 400.0]], "std": True},
             {"k": "Gehwegsperrung", "t": "Gehweg-/Fahrbahnsperrung, Absperrschranken 20 m × 20 Wo, Ersatzweg", "teile": [["090.01.004.02001", 1.0], ["000.11.001.01001", 400.0], ["000.07.006.01001", 400.0]], "std": True}]},
         {"name": "Fußgängerschutz", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Schutztunnel 20 m", "t": "Fußgänger-Schutztunnel 1,5 m breit, 20 m", "teile": [["000.11.003.01001", 20.0]], "std": True}]},
         {"name": "Überwachung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Video 6 Mon", "t": "mobile Videoüberwachung 6 Monate", "teile": [["090.03.008.01001", 6.0]], "std": True},
             {"k": "Revierkontrolle", "t": "Wachdienst Revierkontrolle, 100 Kontrollgänge", "teile": [["090.03.007.02001", 100.0]]}]},
     ], "tags": ["neubau", "altbau"]},

    # ---------------------------------------------------------------- 392 Gerüste
    {"id": "392.01", "kg": "392", "name": "Fassadengerüst", "einheit": "m²",
     "lang": "Arbeits- und Schutzgerüst als Systemgerüst an der Fassade, aufbauen, 4 Wochen Grundstandzeit, Vorhaltung darüber hinaus, "
             "Bekleidung und Zugang nach Wahl.",
     "bezug": "Eingerüstete Fassadenfläche (Länge × Gerüsthöhe)",
     "schichten": [
         {"name": "Gerüst", "optionen": [
             {"k": "W06 ≤12 m", "t": "LK 3, W06, bis 12 m", "teile": [["001.01.001.01001", 1.0]], "std": True},
             {"k": "W09 ≤12 m", "t": "LK 3, W09, bis 12 m", "teile": [["001.01.001.02001", 1.0]], "std": True},
             {"k": "W09 ≤24 m", "t": "LK 3, W09, bis 24 m", "teile": [["001.01.001.03001", 1.0]], "std": True},
             {"k": "LK 4 W09 ≤24 m", "t": "LK 4, W09, bis 24 m (Mauer-/Natursteinarbeiten)", "teile": [["001.01.001.04001", 1.0], ["001.01.002.02001", 4.0]]}]},
         {"name": "Vorhaltung", "optionen": [
             {"k": "", "t": "nur Grundstandzeit 4 Wochen", "teile": []},
             {"k": "+8 Wo", "t": "Vorhaltung 8 Wochen über Grundstandzeit", "teile": [["001.01.002.01001", 8.0]], "std": True},
             {"k": "+16 Wo", "t": "Vorhaltung 16 Wochen über Grundstandzeit", "teile": [["001.01.002.01001", 16.0]], "std": True}]},
         {"name": "Bekleidung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Netz", "t": "Schutznetz", "teile": [["001.01.004.01001", 1.0]], "std": True},
             {"k": "Plane", "t": "Gerüstplane PE gewebeverstärkt", "teile": [["001.03.006.02001", 1.0]]}]},
         {"name": "Zugang", "optionen": [
             {"k": "", "t": "Innenleitergänge", "teile": [], "std": True},
             {"k": "Treppenturm", "t": "Gerüsttreppe bis 12 m, 1 je 300 m²", "teile": [["001.01.005.01001", 0.0033]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "392.02", "kg": "392", "name": "Fassadengerüst bis 8 m (EFH)", "einheit": "m²",
     "lang": "Fassadengerüst für Ein- und Zweifamilienhäuser bis 8 m Höhe als Rahmen- bzw. Modulgerüst, 4 Wochen Grundstandzeit, mit Verlängerung und Dachfangkonsolen.",
     "bezug": "Eingerüstete Fassadenfläche; Dachfangkonsolen 0,15 m je m²",
     "schichten": [
         {"name": "Gerüst", "optionen": [
             {"k": "Rahmen Stahl", "t": "Rahmengerüst Stahl LK 3, W06", "teile": [["001.03.001.01001", 1.0]], "std": True},
             {"k": "Rahmen Alu", "t": "Rahmengerüst Aluminium LK 3, W06", "teile": [["001.03.001.02001", 1.0]], "std": True},
             {"k": "Modulgerüst", "t": "Modulgerüst LK 3, W06", "teile": [["001.03.001.03001", 1.0]], "std": True}]},
         {"name": "Vorhaltung", "optionen": [
             {"k": "", "t": "Grundstandzeit 4 Wochen", "teile": [], "std": True},
             {"k": "+4 Wo", "t": "Vorhaltung 4 Wochen über Grundstandzeit", "teile": [["001.03.002.01001", 4.0]], "std": True},
             {"k": "+8 Wo", "t": "Vorhaltung 8 Wochen über Grundstandzeit", "teile": [["001.03.002.01001", 8.0]]}]},
         {"name": "Zusatz", "optionen": [
             {"k": "", "t": "", "teile": []},
             {"k": "Dachfang", "t": "Konsolen außen 0,73 m als Dachfang", "teile": [["001.03.005.03001", 0.15]], "std": True},
             {"k": "Dachfang + Netz", "t": "Dachfangkonsolen und Schutznetz", "teile": [["001.03.005.03001", 0.15], ["001.03.006.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "392.03", "kg": "392", "name": "Raumgerüst", "einheit": "m³",
     "lang": "Raumgerüst als Flächengerüst mit vollflächigem Belag für Decken- und Wandarbeiten in Hallen, Treppenräumen und Kirchen, 4 Wochen inkl.",
     "bezug": "Eingerüstetes Raumvolumen",
     "schichten": [
         {"name": "Gerüst", "optionen": [
             {"k": "AH bis 5 m", "t": "Arbeitshöhe bis 5 m", "teile": [["001.04.002.01001", 1.0]], "std": True},
             {"k": "AH bis 10 m", "t": "Arbeitshöhe bis 10 m", "teile": [["001.04.002.02001", 1.0]], "std": True},
             {"k": "AH bis 20 m", "t": "Arbeitshöhe bis 20 m", "teile": [["001.04.002.03001", 1.0]], "std": True}]},
         {"name": "Vorhaltung", "optionen": [
             {"k": "", "t": "4 Wochen enthalten", "teile": [], "std": True},
             {"k": "+4 Wo", "t": "Vorhaltung 4 Wochen zusätzlich", "teile": [["001.04.003.01001", 4.0]], "std": True},
             {"k": "+8 Wo", "t": "Vorhaltung 8 Wochen zusätzlich", "teile": [["001.04.003.01001", 8.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "392.04", "kg": "392", "name": "Dachfanggerüst", "einheit": "m",
     "lang": "Dachfanggerüst an der Traufe als Absturzsicherung bei Dacharbeiten, optional mit Schutzdach über Verkehrswegen.",
     "bezug": "Länge der Traufe",
     "schichten": [
         {"name": "Fanggerüst", "optionen": [
             {"k": "Traufe ≤7 m", "t": "Dachfanggerüst, Traufhöhe bis 7 m", "teile": [["001.04.001.01001", 1.0]], "std": True},
             {"k": "Traufe ≤12 m", "t": "Dachfanggerüst, Traufhöhe bis 12 m", "teile": [["001.04.001.02001", 1.0]], "std": True},
             {"k": "Traufe ≤20 m", "t": "Dachfanggerüst, Traufhöhe bis 20 m", "teile": [["001.04.001.03001", 1.0]], "std": True}]},
         {"name": "Zusatz", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Schutzdach 1,5", "t": "Schutzdach 1,5 m über Gehweg", "teile": [["001.01.006.01001", 1.0]], "std": True},
             {"k": "Schutzdach 2,5", "t": "Schutzdach 2,5 m über Gehweg", "teile": [["001.01.006.02001", 1.0]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "392.05", "kg": "392", "name": "Rollgerüst/Hubarbeitsbühne", "einheit": "St",
     "lang": "Fahrbares Arbeitsgerüst bzw. Hubarbeitsbühne für Montagearbeiten, für die angegebene Einsatzdauer vorgehalten.",
     "bezug": "Anzahl der Geräte",
     "schichten": [
         {"name": "Gerät/Dauer", "optionen": [
             {"k": "Rollgerüst 6 m 4 Wo", "t": "Rollgerüst Arbeitshöhe bis 6 m, 4 Wochen", "teile": [["001.02.002.01001", 4.0]], "std": True},
             {"k": "Rollgerüst 6 m 8 Wo", "t": "Rollgerüst Arbeitshöhe bis 6 m, 8 Wochen", "teile": [["001.02.002.01001", 8.0]], "std": True},
             {"k": "Rollger. 10 m 4 Wo", "t": "Rollgerüst Arbeitshöhe bis 10 m, 4 Wochen", "teile": [["001.02.002.02001", 4.0]], "std": True},
             {"k": "Schere 8 m 4 Wo", "t": "Scherenbühne 8 m elektrisch, 4 Wochen", "teile": [["000.10.005.01001", 4.0]], "std": True},
             {"k": "Schere 12 m 4 Wo", "t": "Scherenbühne 12 m Diesel, 4 Wochen", "teile": [["000.10.005.02001", 4.0]], "std": True},
             {"k": "Gelenk 16 m 2 Wo", "t": "Gelenk-Teleskopbühne 16 m, 2 Wochen", "teile": [["000.10.005.03001", 2.0]], "std": True},
             {"k": "Lkw-Bühne 1 Wo", "t": "Lkw-Arbeitsbühne 25 m, 1 Woche", "teile": [["000.10.005.04001", 1.0]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "392.06", "kg": "392", "name": "Wetterschutzdach über Gerüst", "einheit": "m²",
     "lang": "Wetterschutzdach (Notdach) auf dem Gerüst für Dach- und Sanierungsarbeiten, mit Vorhaltung und seitlicher Planenbekleidung.",
     "bezug": "Überdachte Grundfläche; Seitenbekleidung 0,5 m² je m²",
     "schichten": [
         {"name": "Dach", "optionen": [
             {"k": "Spannw. ≤12 m", "t": "Spannweite bis 12 m", "teile": [["001.04.009.01001", 1.0]], "std": True},
             {"k": "Spannw. ≤20 m", "t": "Spannweite bis 20 m", "teile": [["001.04.009.02001", 1.0]], "std": True},
             {"k": "Spannw. ≤30 m", "t": "Spannweite bis 30 m", "teile": [["001.04.009.03001", 1.0]], "std": True}]},
         {"name": "Vorhaltung", "optionen": [
             {"k": "", "t": "Grundstandzeit", "teile": [], "std": True},
             {"k": "+4 Wo", "t": "Vorhaltung 4 Wochen zusätzlich", "teile": [["001.02.007.01001", 4.0]], "std": True},
             {"k": "+8 Wo", "t": "Vorhaltung 8 Wochen zusätzlich", "teile": [["001.02.007.01001", 8.0]], "std": True}]},
         {"name": "Seiten", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Seitenplane", "t": "Seitenbekleidung Gerüstplane, 0,5 m² je m²", "teile": [["001.03.006.02001", 0.5]], "std": True}]},
     ], "tags": ["altbau", "neubau"]},

    {"id": "392.07", "kg": "392", "name": "Sondergerüst Treppenhaus/Kamin", "einheit": "St",
     "lang": "Gerüste für Einzelarbeiten: Treppenhausgerüst je Geschoss, Schornstein- bzw. Dachgerüst, mit Gerüstprüfung nach Wahl.",
     "bezug": "Anzahl (je Geschoss bzw. je Schornstein)",
     "schichten": [
         {"name": "Gerüst", "optionen": [
             {"k": "TH-Auge ≤1,5 m", "t": "Treppenhausgerüst, Treppenauge bis 1,5 m, je Geschoss", "teile": [["001.04.007.01001", 1.0]], "std": True},
             {"k": "TH-Auge >1,5 m", "t": "Treppenhausgerüst, Treppenauge über 1,5 m, je Geschoss", "teile": [["001.04.007.02001", 1.0]], "std": True},
             {"k": "Kamin ≤1,5 m", "t": "Schornsteingerüst bis 1,5 m über Dach", "teile": [["001.04.006.01001", 1.0]], "std": True},
             {"k": "Kamin ≤4 m", "t": "Schornsteingerüst bis 4 m über Dach", "teile": [["001.04.006.02001", 1.0]], "std": True},
             {"k": "Dachgerüst geneigt", "t": "Schornstein-/Dachgerüst auf geneigtem Dach", "teile": [["001.02.004.01001", 1.0]]}]},
         {"name": "Prüfung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "wiederk. Prüfung", "t": "wiederkehrende Gerüstprüfung", "teile": [["001.04.010.02001", 1.0]], "std": True}]},
     ], "tags": ["altbau"]},

    # ---------------------------------------------------------------- 393 Sicherungsmaßnahmen
    {"id": "393.01", "kg": "393", "name": "Absturzsicherung Deckenrand", "einheit": "m",
     "lang": "Seitenschutz an Deckenrändern, Treppen und Öffnungen während der Rohbau- und Ausbauzeit, mit Abdeckung kleiner Deckenöffnungen anteilig.",
     "bezug": "Länge der gesicherten Kante",
     "schichten": [
         {"name": "Seitenschutz", "optionen": [
             {"k": "Geländer", "t": "Geländer als Seitenschutz an Deckenrändern", "teile": [["000.06.001.01001", 1.0]], "std": True},
             {"k": "Schutzgitter 4 Wo", "t": "Schutzgitter mit Pfosten, 4 Wochen", "teile": [["099.02.007.01001", 1.0]], "std": True},
             {"k": "Holzholme 4 Wo", "t": "Holzholme an Zwingen, 4 Wochen", "teile": [["099.02.007.02001", 1.0]], "std": True}]},
         {"name": "Deckenöffnungen", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Öffnungen anteil.", "t": "Deckenöffnungen bis 1 m² durchtrittsicher abdecken, 1 je 20 m", "teile": [["000.06.002.01001", 0.05]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "393.02", "kg": "393", "name": "Notabstützung/Abfangung", "einheit": "St",
     "lang": "Abstützung bzw. Abfangung von Bauteilen im Bestand während Abbruch- und Umbauarbeiten, mit Rissüberwachung nach Wahl.",
     "bezug": "Anzahl der Abstützungsbereiche (je Öffnung bzw. Feld)",
     "schichten": [
         {"name": "Abstützung", "optionen": [
             {"k": "4 Stützen ≤3 m", "t": "4 Baustützen bis 3,0 m", "teile": [["084.01.004.01001", 4.0]], "std": True},
             {"k": "8 Stützen ≤3 m", "t": "8 Baustützen bis 3,0 m", "teile": [["084.01.004.01001", 8.0]], "std": True},
             {"k": "4 Stützen ≤4,5 m", "t": "4 Baustützen bis 4,5 m", "teile": [["084.01.004.02001", 4.0]], "std": True},
             {"k": "Abfangung ≤2 m", "t": "Abfangung für Trägereinbau, Öffnung bis 2,0 m", "teile": [["017.01.004.01001", 1.0]]},
             {"k": "Abfangung ≤4 m", "t": "Abfangung für Trägereinbau, Öffnung bis 4,0 m", "teile": [["017.01.004.02001", 1.0]]}]},
         {"name": "Überwachung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "2 Rissmonitore", "t": "2 Rissmonitore setzen und ablesen", "teile": [["099.01.002.01001", 2.0]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "393.03", "kg": "393", "name": "Beweissicherung Nachbargebäude", "einheit": "St",
     "lang": "Beweissicherung an Nachbargebäuden vor und nach der Baumaßnahme, Rissmonitore und Erschütterungsmessung während kritischer Arbeiten.",
     "bezug": "Anzahl der Nachbargebäude",
     "schichten": [
         {"name": "Beweissicherung", "optionen": [
             {"k": "BS vor/nach", "t": "Beweissicherung vor und nach der Baumaßnahme (Spezialtiefbau)", "teile": [["006.01.006.01001", 1.0]], "std": True},
             {"k": "BS Gutachten", "t": "Beweissicherung durch Sachverständigen, 1 Gebäude", "teile": [["099.01.001.01001", 1.0]], "std": True}]},
         {"name": "Rissmonitore", "optionen": [
             {"k": "", "t": "", "teile": []},
             {"k": "4 Monitore", "t": "4 Rissmonitore setzen und ablesen", "teile": [["099.01.002.01001", 4.0]], "std": True},
             {"k": "8 Monitore", "t": "8 Rissmonitore setzen und ablesen", "teile": [["099.01.002.01001", 8.0]], "std": True}]},
         {"name": "Erschütterung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Erschütt. 4 Wo", "t": "Erschütterungsmessung 4 Wochen", "teile": [["099.01.003.01001", 4.0]], "std": True},
             {"k": "Erschütt. 12 Wo", "t": "Erschütterungsmessung 12 Wochen", "teile": [["099.01.003.01001", 12.0]]}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "393.04", "kg": "393", "name": "Schutz im genutzten Bestand", "einheit": "m²",
     "lang": "Schutzmaßnahmen bei Arbeiten in genutzten Gebäuden: Bodenschutz, Abdeckung von Bauteilen und Einrichtung, Staubschutzwände anteilig (4 Wochen).",
     "bezug": "Geschützte Bodenfläche; Staubschutzwand 0,1 m² je m²",
     "schichten": [
         {"name": "Bodenschutz", "optionen": [
             {"k": "Malervlies", "t": "Malervlies mit Folie", "teile": [["099.02.001.01001", 1.0]], "std": True},
             {"k": "Wellpappe", "t": "Schutzpappe/Wellpappe", "teile": [["099.02.001.02001", 1.0]], "std": True},
             {"k": "Hartfaser 3 mm", "t": "Hartfaser-/Kunststoffplatten 3 mm", "teile": [["099.02.001.03001", 1.0]], "std": True},
             {"k": "OSB 12 mm", "t": "OSB-Platten 12 mm auf Vlies", "teile": [["099.02.001.04001", 1.0]], "std": True}]},
         {"name": "Abdeckung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Folienabdeckung", "t": "Staub- und Schmutzschutz der Einrichtung mit Folie", "teile": [["084.01.003.01001", 1.0]], "std": True}]},
         {"name": "Staubschutz", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Staubwand anteil.", "t": "Staubschutzwand Folie mit Tür, 0,1 m² je m²", "teile": [["099.02.003.01001", 0.1]], "std": True},
             {"k": "Plattenwand anteil.", "t": "Staubschutzwand Platten mit Tür, 0,1 m² je m²", "teile": [["099.02.003.03001", 0.1]]}]},
     ], "tags": ["altbau"]},

    {"id": "393.05", "kg": "393", "name": "Baumschutz", "einheit": "St",
     "lang": "Schutz von Bäumen im Baufeld nach DIN 18920 durch Stammschutz und Abzäunung des Kronentraufbereichs, je Baum. Die Positionen gelten für 4 Wochen; "
             "für längere Standzeit ist die Verlängerung mit ca. 25 % je weitere 4 Wochen angesetzt.",
     "bezug": "Anzahl der geschützten Bäume",
     "schichten": [
         {"name": "Stammschutz", "optionen": [
             {"k": "Stamm 4 Wo", "t": "Bohlenummantelung Stamm, 4 Wochen", "teile": [["099.02.008.01001", 1.0]], "std": True},
             {"k": "Stamm 24 Wo", "t": "Bohlenummantelung Stamm, 24 Wochen", "teile": [["099.02.008.01001", 2.25]], "std": True},
             {"k": "", "t": "", "teile": []}]},
         {"name": "Kronentraufe", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Kronentr. 4 Wo", "t": "Bauzaun an der Kronentraufe, 4 Wochen", "teile": [["099.02.008.02001", 1.0]], "std": True},
             {"k": "Kronentr. 24 Wo", "t": "Bauzaun an der Kronentraufe, 24 Wochen", "teile": [["099.02.008.02001", 2.25]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    # ---------------------------------------------------------------- 394 Abbruchmaßnahmen
    {"id": "394.01", "kg": "394", "name": "Abbruch Mauerwerk", "einheit": "m²",
     "lang": "Mauerwerkswände mit Kleingerät abbrechen, Abbruchmaterial sortieren und entsorgen, mit Staubschutz und Schadstoffprobe nach Wahl.",
     "bezug": "Wandfläche; Entsorgung nach Wanddicke × 1,75 t/m³",
     "schichten": [
         {"name": "Wand", "optionen": [
             {"k": "MW ≤11,5 cm", "t": "Ziegel/KS bis 11,5 cm, Mauerwerksbruch entsorgen", "teile": [["084.02.001.01001", 1.0], ["087.01.001.02001", 0.2]], "std": True},
             {"k": "MW ≤24 cm", "t": "Ziegel/KS bis 24 cm, Mauerwerksbruch entsorgen", "teile": [["084.02.001.02001", 1.0], ["087.01.001.02001", 0.42]], "std": True},
             {"k": "MW ≤36,5 cm", "t": "Ziegel/KS bis 36,5 cm, Mauerwerksbruch entsorgen", "teile": [["084.02.001.03001", 1.0], ["087.01.001.02001", 0.64]], "std": True},
             {"k": "Porenbeton ≤11,5", "t": "Porenbeton/Bims/Gipsdielen bis 11,5 cm, entsorgen", "teile": [["084.02.001.04001", 1.0], ["087.04.001.03001", 0.07]]}]},
         {"name": "Staubschutz", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Staubwand", "t": "Staubschutzwand mit Tür, 0,5 m² je m²", "teile": [["000.06.004.01001", 0.5]], "std": True}]},
         {"name": "Schadstoffe", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "RC-Analyse", "t": "Probenahme und Analyse Bauschutt, 1 je 50 m²", "teile": [["087.06.001.03001", 0.02]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "394.02", "kg": "394", "name": "Abbruch Stahlbeton", "einheit": "m³",
     "lang": "Stahlbetonbauteile mit Abbruchhammer bzw. Betonzange abbrechen, Bewehrung trennen, Beton und Stahl entsorgen, Notabstützung nach Wahl.",
     "bezug": "Abbruchvolumen (fest); 2,5 t/m³",
     "schichten": [
         {"name": "Bauteil", "optionen": [
             {"k": "Wände/Decken", "t": "Wände und Decken bis 25 cm", "teile": [["084.02.002.01001", 1.0]], "std": True},
             {"k": "Fundamente/BP", "t": "Fundamente und Bodenplatten", "teile": [["084.02.002.02001", 1.0]], "std": True}]},
         {"name": "Entsorgung", "optionen": [
             {"k": "Beton mit Bewehr.", "t": "Beton mit Bewehrung entsorgen, 2,5 t", "teile": [["087.04.001.01001", 2.5]], "std": True},
             {"k": "Beton + Stahl getr.", "t": "Beton 2,4 t und Stahlschrott 0,1 t getrennt entsorgen", "teile": [["087.01.001.01001", 2.4], ["087.04.001.09001", 0.1]], "std": True}]},
         {"name": "Sicherung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Abstützung", "t": "Notabstützung, 0,5 Stützen je m³", "teile": [["084.01.004.01001", 0.5]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "394.03", "kg": "394", "name": "Rückbau Bodenaufbau", "einheit": "m²",
     "lang": "Bodenbeläge und Estrich mit Dämmschicht ausbauen, Abbruchmaterial sammeln und entsorgen.",
     "bezug": "Rückbaufläche",
     "schichten": [
         {"name": "Belag", "optionen": [
             {"k": "Fliesen", "t": "Fliesenbelag mit Mörtelbett", "teile": [["084.03.002.02001", 1.0]], "std": True},
             {"k": "Teppich/PVC", "t": "Teppich bzw. PVC verklebt", "teile": [["084.03.003.01001", 1.0]], "std": True},
             {"k": "Parkett/Dielen", "t": "Parkett bzw. Dielen", "teile": [["084.03.003.02001", 1.0]], "std": True},
             {"k": "Laminat", "t": "Laminat schwimmend", "teile": [["084.03.003.03001", 1.0]]}]},
         {"name": "Estrich", "optionen": [
             {"k": "", "t": "Estrich verbleibt", "teile": [], "std": True},
             {"k": "Estrich ≤6 cm", "t": "Estrich bis 6 cm mit Dämmschicht", "teile": [["084.03.004.01001", 1.0]], "std": True},
             {"k": "Estrich ≤10 cm", "t": "Estrich bis 10 cm mit Dämmschicht", "teile": [["084.03.004.02001", 1.0]]}]},
         {"name": "Entsorgung", "optionen": [
             {"k": "Container gemischt", "t": "Container 10 m³ Bauschutt gemischt, 1 je 50 m²", "teile": [["087.05.003.06001", 0.02]], "std": True},
             {"k": "sortiert lose", "t": "Bauschutt mit Anhaftungen 0,12 t, Mischabfall 0,01 t je m²", "teile": [["087.04.001.19001", 0.12], ["087.04.001.14001", 0.01]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "394.04", "kg": "394", "name": "Entkernung je m² BGF", "einheit": "m²",
     "lang": "Vollständige Entkernung bis auf den tragenden Rohbau, getrennte Sammlung und Entsorgung der Abfälle, Schadstofferkundung anteilig.",
     "bezug": "Brutto-Grundfläche (BGF)",
     "schichten": [
         {"name": "Gebäude", "optionen": [
             {"k": "Wohngebäude", "t": "Wohngebäude", "teile": [["084.05.012.01001", 1.0]], "std": True},
             {"k": "Bürogebäude", "t": "Bürogebäude", "teile": [["084.05.012.02001", 1.0]], "std": True},
             {"k": "Schule/Verwalt.", "t": "Schule/Verwaltung mit Fachräumen", "teile": [["084.05.012.03001", 1.0]], "std": True}]},
         {"name": "Entsorgung", "optionen": [
             {"k": "gemischt 0,12 t", "t": "gemischte Bau- und Abbruchabfälle 0,12 t je m²", "teile": [["087.02.001.08001", 0.12]], "std": True},
             {"k": "sortiert", "t": "sortiert: Bauschutt 0,08 t, Holz 0,02 t, Mischabfall 0,02 t, Metall 0,01 t je m²",
              "teile": [["087.04.001.19001", 0.08], ["087.04.001.06001", 0.02], ["087.04.001.14001", 0.02], ["087.02.001.05001", 0.01]], "std": True}]},
         {"name": "Schadstoffe", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Erkundung anteil.", "t": "Rückbaukonzept und Schadstofferkundung, 1 je 1.000 m² BGF", "teile": [["084.01.001.01001", 0.001]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "394.05", "kg": "394", "name": "Asbestsanierung", "einheit": "m²",
     "lang": "Ausbau asbesthaltiger Bauteile nach TRGS 519 mit Schwarzbereich bzw. Schutzmaßnahmen, Verpackung und Entsorgung als gefährlicher Abfall.",
     "bezug": "Ausbaufläche",
     "schichten": [
         {"name": "Material", "optionen": [
             {"k": "Floor-Flex", "t": "Floor-Flex-Platten mit Kleber entfernen", "teile": [["083.02.004.01001", 1.0]], "std": True},
             {"k": "AZ Fassade", "t": "Asbestzement-Fassadenplatten fest gebunden", "teile": [["083.02.002.02001", 1.0]], "std": True},
             {"k": "AZ Welldach", "t": "Asbestzement-Wellplatten Dach", "teile": [["084.04.001.01001", 1.0]], "std": True},
             {"k": "Leichtbauplatten", "t": "schwach gebundene Leichtbauplatten Wand", "teile": [["083.02.001.01001", 1.0]], "std": True},
             {"k": "Spachtel 3 mm", "t": "Asbest-Spachtel/Putz bis 3 mm", "teile": [["083.02.005.01001", 1.0]]}]},
         {"name": "Schutzmaßnahmen", "optionen": [
             {"k": "", "t": "Arbeiten im Freien, emissionsarm (BT-Verfahren)", "teile": [], "std": True},
             {"k": "Schwarzber. + Mess.", "t": "Schwarzbereich bis 100 m² und Freimessung, anteilig 1 je 100 m²",
              "teile": [["083.01.001.02001", 0.01], ["083.04.001.01001", 0.01], ["083.02.008.01001", 1.0]], "std": True}]},
         {"name": "Entsorgung", "optionen": [
             {"k": "AZ fest 20 kg", "t": "Entsorgung Asbestzement fest gebunden, 20 kg je m²", "teile": [["087.04.002.01001", 0.02]], "std": True},
             {"k": "schwach geb. 15 kg", "t": "Entsorgung schwach gebundener Asbest, 15 kg je m²", "teile": [["087.04.002.02001", 0.015]]}]},
     ], "tags": ["altbau"]},

    {"id": "394.06", "kg": "394", "name": "Rückbau Dachaufbau", "einheit": "m²",
     "lang": "Dacheindeckung bzw. Flachdachaufbau bis auf die Tragkonstruktion abbrechen, Dämmung ausbauen, Abfälle entsorgen.",
     "bezug": "Dachfläche (abgewickelt)",
     "schichten": [
         {"name": "Deckung", "optionen": [
             {"k": "Ziegel + Lattung", "t": "Ton-/Betondachsteine mit Lattung", "teile": [["084.03.011.01001", 1.0]], "std": True},
             {"k": "Bitumenschindel", "t": "Bitumenschindeln/Schiefer mit Lattung", "teile": [["084.03.011.02001", 1.0]]},
             {"k": "Flachdach ≤15 cm", "t": "Flachdachaufbau bis 15 cm bis Rohdecke", "teile": [["084.03.012.01001", 1.0]], "std": True},
             {"k": "Flachdach ≤30 cm", "t": "Flachdachaufbau bis 30 cm bis Rohdecke", "teile": [["084.03.012.02001", 1.0]], "std": True}]},
         {"name": "Dämmung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "KMF alt", "t": "Alt-KMF nach TRGS 521 ausbauen", "teile": [["083.03.001.01001", 1.0], ["087.04.002.03001", 0.005]], "std": True},
             {"k": "EPS/XPS", "t": "EPS/XPS bis 16 cm ausbauen", "teile": [["084.05.005.01001", 1.0]]}]},
         {"name": "Entsorgung", "optionen": [
             {"k": "gemischt 60 kg", "t": "gemischte Bau- und Abbruchabfälle 0,06 t je m²", "teile": [["087.02.001.08001", 0.06]], "std": True},
             {"k": "Container 20 m³", "t": "Container 20 m³ Baumischabfall, 1 je 80 m²", "teile": [["087.05.003.14001", 0.0125]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "394.07", "kg": "394", "name": "Rückbau WDVS/Fassade", "einheit": "m²",
     "lang": "Wärmedämmverbundsystem bzw. vorgehängte Fassadenbekleidung abbrechen, Dämmstoff getrennt entsorgen, HBCD-Prüfung nach Wahl.",
     "bezug": "Fassadenfläche",
     "schichten": [
         {"name": "Fassade", "optionen": [
             {"k": "WDVS EPS ≤10", "t": "WDVS EPS bis 10 cm", "teile": [["084.05.006.01001", 1.0]], "std": True},
             {"k": "WDVS EPS ≤20", "t": "WDVS EPS bis 20 cm", "teile": [["084.05.006.02001", 1.0]], "std": True},
             {"k": "WDVS MW ≤14", "t": "WDVS Mineralwolle bis 14 cm", "teile": [["084.05.006.03001", 1.0]], "std": True},
             {"k": "Holzschalung", "t": "Fassadenbekleidung Holzschalung", "teile": [["084.05.010.01001", 1.0]]},
             {"k": "Metallkassetten", "t": "Fassadenbekleidung Metallkassetten/Trapezblech", "teile": [["084.05.010.03001", 1.0]]}]},
         {"name": "Entsorgung", "optionen": [
             {"k": "Dämmstoff 10 kg", "t": "Dämmstoff ohne HBCD 10 kg je m², Putz als Bauschutt", "teile": [["087.04.001.11001", 0.01], ["087.04.001.19001", 0.02]], "std": True},
             {"k": "HBCD 10 kg", "t": "HBCD-haltiger Dämmstoff 10 kg je m², Putz als Bauschutt", "teile": [["087.04.002.04001", 0.01], ["087.04.001.19001", 0.02]], "std": True}]},
         {"name": "Analytik", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "HBCD-Probe", "t": "HBCD-Analyse, 1 je 100 m²", "teile": [["087.06.001.08001", 0.01]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "394.08", "kg": "394", "name": "Rückbau TGA je m² BGF", "einheit": "m²",
     "lang": "Rückbau der technischen Gebäudeausrüstung im Bestand: Elektroinstallation stilllegen, Heizungs- und Sanitärinstallation demontieren.",
     "bezug": "Brutto-Grundfläche; je m²: 0,06 Heizkörper, 0,8 m Heizungsleitung, 0,04 Sanitärobjekte, 0,4 m Sanitärleitung",
     "schichten": [
         {"name": "Elektro", "optionen": [
             {"k": "Elektro", "t": "Elektroinstallation stilllegen und zurückbauen", "teile": [["084.03.010.01001", 1.0]], "std": True},
             {"k": "", "t": "Elektro verbleibt", "teile": [], "std": True}]},
         {"name": "Heizung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Heizung", "t": "Heizkörper und Heizungsleitungen demontieren", "teile": [["084.03.009.01001", 0.06], ["084.05.007.01001", 0.8]], "std": True}]},
         {"name": "Sanitär", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Sanitär", "t": "Sanitärobjekte und Leitungen demontieren", "teile": [["084.03.008.01001", 0.04], ["084.05.007.02001", 0.4]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "394.09", "kg": "394", "name": "Durchbruch im Bestand", "einheit": "St",
     "lang": "Wand- bzw. Deckendurchbruch im Bestand herstellen, mit Abfangung und Abtransport des Abbruchmaterials.",
     "bezug": "Anzahl der Durchbrüche",
     "schichten": [
         {"name": "Durchbruch", "optionen": [
             {"k": "MW ≤24, ≤2 m²", "t": "Mauerwerk bis 24 cm, bis 2,0 m²", "teile": [["012.04.007.01001", 1.0]], "std": True},
             {"k": "MW ≤36,5, ≤2,5 m²", "t": "Mauerwerk bis 36,5 cm, bis 2,5 m²", "teile": [["012.04.007.02001", 1.0]], "std": True},
             {"k": "StB ≤20, ≤2 m²", "t": "Stahlbetonwand sägen bis 20 cm, bis 2,0 m²", "teile": [["084.05.001.01001", 1.0]], "std": True},
             {"k": "StB ≤25, ≤2,5 m²", "t": "Stahlbetonwand sägen bis 25 cm, bis 2,5 m²", "teile": [["084.05.001.02001", 1.0]], "std": True},
             {"k": "Decke ≤20, ≤2 m²", "t": "Deckenöffnung Stahlbeton bis 20 cm, bis 2,0 m²", "teile": [["013.10.001.02001", 1.0]]}]},
         {"name": "Abfangung", "optionen": [
             {"k": "", "t": "nichttragend bzw. Sturz gesondert", "teile": [], "std": True},
             {"k": "Abfangung ≤2 m", "t": "Abfangung/Abstützung für Trägereinbau bis 2,0 m", "teile": [["017.01.004.01001", 1.0]], "std": True}]},
         {"name": "Entsorgung", "optionen": [
             {"k": "Big Bag", "t": "Big Bag 1 m³ stellen und abfahren, Bauschutt 1 t", "teile": [["087.05.001.09001", 1.0], ["087.01.001.03001", 1.0]], "std": True}]},
     ], "tags": ["altbau"]},

    # ---------------------------------------------------------------- 395 Instandsetzungen
    {"id": "395.01", "kg": "395", "name": "Betoninstandsetzung Wand", "einheit": "m²",
     "lang": "Instandsetzung von Betonflächen nach RL-SIB: Untergrundvorbereitung, Schadstellen ausbessern (anteilig), Oberflächenschutz.",
     "bezug": "Behandelte Betonfläche; Schadstellenanteil siehe Option",
     "schichten": [
         {"name": "Vorbereitung", "optionen": [
             {"k": "Kugelstrahlen", "t": "Oberfläche kugelstrahlen", "teile": [["081.01.003.01001", 1.0]], "std": True},
             {"k": "HDW 500 bar", "t": "Hochdruckwasserstrahlen 500 bar", "teile": [["081.01.003.04001", 1.0]], "std": True},
             {"k": "Sandstrahlen", "t": "Druckluft-Sandstrahlen", "teile": [["081.01.003.03001", 1.0]]}]},
         {"name": "Schadstellen", "optionen": [
             {"k": "10 % Schadst.", "t": "10 % der Fläche: Abtrag 2 cm, Bewehrung entrosten und schützen, Haftbrücke, PCC 20 mm",
              "teile": [["081.01.002.01001", 0.1], ["081.01.004.01001", 0.5], ["081.02.001.01001", 0.5], ["081.02.002.01001", 0.1], ["081.02.003.01001", 0.1]], "std": True},
             {"k": "25 % Schadst.", "t": "25 % der Fläche: Abtrag 2 cm, Bewehrung entrosten und schützen, Haftbrücke, PCC 20 mm",
              "teile": [["081.01.002.01001", 0.25], ["081.01.004.01001", 1.25], ["081.02.001.01001", 1.25], ["081.02.002.01001", 0.25], ["081.02.003.01001", 0.25]], "std": True},
             {"k": "", "t": "ohne Schadstellen", "teile": []}]},
         {"name": "Oberflächenschutz", "optionen": [
             {"k": "Spachtel + OS 2", "t": "Feinspachtelung 1 mm, Hydrophobierung mit Deckbeschichtung OS 2", "teile": [["081.02.004.01001", 1.0], ["081.04.001.02001", 1.0]], "std": True},
             {"k": "OS 5a rissüberbr.", "t": "rissüberbrückende Beschichtung OS 5a", "teile": [["081.04.001.04001", 1.0]], "std": True},
             {"k": "OS 1 Hydroph.", "t": "Hydrophobierung OS 1", "teile": [["081.04.001.01001", 1.0]]}]},
     ], "tags": ["altbau"]},

    {"id": "395.02", "kg": "395", "name": "Rissinjektion Beton", "einheit": "m",
     "lang": "Risse in Betonbauteilen bis 30 cm Dicke kraftschlüssig bzw. dichtend verpressen, mit Bauwerksdiagnose anteilig.",
     "bezug": "Risslänge",
     "schichten": [
         {"name": "Injektion", "optionen": [
             {"k": "EP 0,1–0,3 mm", "t": "Epoxidharz, Rissbreite 0,1–0,3 mm", "teile": [["081.03.001.01001", 1.0]], "std": True},
             {"k": "EP 0,3–1,0 mm", "t": "Epoxidharz, Rissbreite 0,3–1,0 mm", "teile": [["081.03.001.02001", 1.0]], "std": True},
             {"k": "PUR 0,2–1,0 mm", "t": "Polyurethanharz, dichtend", "teile": [["081.03.001.03001", 1.0]], "std": True},
             {"k": "ZL >1,0 mm", "t": "Zementleim, Rissbreite über 1,0 mm", "teile": [["081.03.001.05001", 1.0]], "std": True}]},
         {"name": "Diagnose", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Abklopfen", "t": "Abklopfen auf Hohlstellen, 1 je 10 m Riss", "teile": [["081.01.001.05001", 0.1]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "395.03", "kg": "395", "name": "Horizontalsperre nachträglich", "einheit": "m",
     "lang": "Nachträgliche Querschnittsabdichtung in aufsteigend feuchtem Mauerwerk, Feuchtemessung und Sanierputz beidseitig nach Wahl.",
     "bezug": "Wandlänge; Sanierputz 1 m hoch beidseitig (2 m² je m), Feuchtemessung 1 je 5 m",
     "fest": [["018.05.011.01001", 0.2]],
     "schichten": [
         {"name": "Sperre", "optionen": [
             {"k": "Injektion ≤24", "t": "Injektion drucklos, Wanddicke bis 24 cm", "teile": [["012.06.001.01001", 1.0]], "std": True},
             {"k": "Injektion ≤36,5", "t": "Injektion drucklos, Wanddicke bis 36,5 cm", "teile": [["012.06.001.02001", 1.0]], "std": True},
             {"k": "Injektion ≤50", "t": "Injektion drucklos, Wanddicke bis 50 cm", "teile": [["012.06.001.03001", 1.0]], "std": True},
             {"k": "mechan. ≤36,5", "t": "mechanische Sperre, Wanddicke bis 36,5 cm", "teile": [["012.06.002.01001", 1.0]]},
             {"k": "Mauersäge", "t": "Mauersägeverfahren mit Edelstahlplatten", "teile": [["018.05.008.01001", 1.0]]}]},
         {"name": "Putz", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "WTA 2 cm beids.", "t": "Altputz abschlagen, Sanierputz WTA 2 cm beidseitig, 1 m hoch",
              "teile": [["084.03.001.01001", 2.0], ["018.05.009.01001", 2.0]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "395.04", "kg": "395", "name": "Mauerwerksinstandsetzung", "einheit": "m²",
     "lang": "Instandsetzung von Sicht- bzw. Bestandsmauerwerk: Fugen erneuern, Steine auswechseln, Risse vernadeln.",
     "bezug": "Wandfläche",
     "schichten": [
         {"name": "Fugen", "optionen": [
             {"k": "Fugen NHL", "t": "Fugen auskratzen und neu verfugen, Kalkmörtel NHL", "teile": [["012.06.007.01001", 1.0]], "std": True},
             {"k": "Fugen Trasskalk", "t": "Fugen auskratzen und neu verfugen, Trasskalkmörtel", "teile": [["012.06.007.02001", 1.0]], "std": True},
             {"k": "Fugen Zement", "t": "Fugen auskratzen und neu verfugen, Zementmörtel", "teile": [["012.06.007.03001", 1.0]]}]},
         {"name": "Steine", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "2 NF/m²", "t": "Steine auswechseln, Format NF, 2 je m² (ca. 3 %)", "teile": [["012.06.004.01001", 2.0]], "std": True}]},
         {"name": "Risse", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Vernadelung", "t": "Rissvernadelung bis 2 mm, 0,2 m je m²", "teile": [["012.06.003.01001", 0.2]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "395.05", "kg": "395", "name": "Balkonplatte instandsetzen", "einheit": "m²",
     "lang": "Instandsetzung von Balkonplatten: Schadstellen reprofilieren, Oberseite mit Flüssigkunststoff abdichten, Tropfkante herstellen.",
     "bezug": "Balkonfläche; Tropfkante 0,5 m je m²",
     "schichten": [
         {"name": "Untergrund", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Reprofilierung 10 %", "t": "10 % Betonabtrag und PCC-Reprofilierung", "teile": [["081.01.002.01001", 0.1], ["081.02.003.01001", 0.1]], "std": True}]},
         {"name": "Abdichtung", "optionen": [
             {"k": "PMMA", "t": "Flüssigkunststoff PMMA", "teile": [["081.04.003.01001", 1.0]], "std": True},
             {"k": "PUR", "t": "Flüssigkunststoff PUR", "teile": [["081.04.003.02001", 1.0]], "std": True}]},
         {"name": "Tropfkante", "optionen": [
             {"k": "Tropfkante Mörtel", "t": "Tropfkante nachträglich herstellen", "teile": [["081.04.004.01001", 0.5]], "std": True},
             {"k": "Tropfprofil Alu", "t": "Tropfprofil Aluminium aufkleben", "teile": [["081.04.004.02001", 0.5]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "395.06", "kg": "395", "name": "Holzschutz Dachstuhl", "einheit": "m²",
     "lang": "Bekämpfung von Insektenbefall (Hausbock, Anobien) im Dachstuhl, mit Abbeilen befallener Holzteile und Gutachten anteilig.",
     "bezug": "Dachgrundfläche; Gutachten 1 je 150 m²",
     "fest": [["082.01.001.01001", 0.0067]],
     "schichten": [
         {"name": "Verfahren", "optionen": [
             {"k": "Heißluft", "t": "Heißluftverfahren", "teile": [["082.02.003.01001", 1.0]], "std": True},
             {"k": "Borsalz", "t": "Streichen mit Borsalz, Holz bis 16 cm", "teile": [["082.02.001.01001", 1.0]], "std": True}]},
         {"name": "Abbeilen", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Abbeilen 30 %", "t": "befallenes Holz abbeilen bis 10 mm, 30 % der Fläche", "teile": [["082.01.004.01001", 0.3]], "std": True}]},
     ], "tags": ["altbau"]},

    # ---------------------------------------------------------------- 396 Materialentsorgung
    {"id": "396.01", "kg": "396", "name": "Bodenentsorgung je m³", "einheit": "m³",
     "lang": "Bodenaushub nach Einstufung (ErsatzbaustoffV/DepV) laden, transportieren und verwerten bzw. beseitigen, mit Deklarationsanalyse und Haufwerk nach Wahl.",
     "bezug": "Bodenvolumen fest; 1,8 t/m³",
     "schichten": [
         {"name": "Einstufung", "optionen": [
             {"k": "BM-0/Z0", "t": "BM-0 / Z0", "teile": [["087.03.001.01001", 1.8]], "std": True},
             {"k": "BM-0*/Z0*", "t": "BM-0* / Z0*", "teile": [["087.03.001.02001", 1.8]], "std": True},
             {"k": "BM-F0*/Z1.1", "t": "BM-F0* / Z1.1", "teile": [["087.03.001.03001", 1.8]], "std": True},
             {"k": "BM-F1/Z1.2", "t": "BM-F1 / Z1.2", "teile": [["087.03.001.04001", 1.8]], "std": True},
             {"k": "BM-F2/Z2", "t": "BM-F2 / Z2", "teile": [["087.03.001.05001", 1.8]], "std": True},
             {"k": "DK I", "t": "Deponieklasse DK I", "teile": [["087.03.001.07001", 1.8]], "std": True},
             {"k": "DK II", "t": "Deponieklasse DK II", "teile": [["087.03.001.08001", 1.8]]},
             {"k": "gefährlich", "t": "Boden mit gefährlichen Stoffen, AVV 17 05 03*", "teile": [["087.01.002.03001", 1.8]]}]},
         {"name": "Analytik", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Analyse /500 m³", "t": "Probenahme und Analyse ErsatzbaustoffV, 1 je 500 m³", "teile": [["087.06.001.01001", 0.002]], "std": True}]},
         {"name": "Haufwerk", "optionen": [
             {"k": "", "t": "direkte Abfuhr", "teile": [], "std": True},
             {"k": "Haufwerk", "t": "Haufwerk auf Folie mit Randwall anlegen und abdecken (1,3 m³ lose)", "teile": [["087.06.003.02001", 1.3]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "396.02", "kg": "396", "name": "Abbruchabfälle entsorgen", "einheit": "m³",
     "lang": "Abbruch- und Baustellenabfälle nach Abfallart getrennt entsorgen, einschließlich Containergestellung bzw. loser Abfuhr.",
     "bezug": "Abfallvolumen lose; Schüttdichten je Option",
     "schichten": [
         {"name": "Abfallart", "optionen": [
             {"k": "Beton bewehrt", "t": "Beton mit Bewehrung, 1,5 t/m³ lose", "teile": [["087.04.001.01001", 1.5]], "std": True},
             {"k": "Mauerwerk", "t": "Ziegel/Mauerwerksbruch, 1,3 t/m³ lose", "teile": [["087.01.001.02001", 1.3]], "std": True},
             {"k": "Bauschutt gem.", "t": "Gemisch Beton, Ziegel, Fliesen, 1,4 t/m³ lose", "teile": [["087.01.001.03001", 1.4]], "std": True},
             {"k": "Holz A I–III", "t": "Holz A I–A III, 0,3 t/m³ lose", "teile": [["087.02.001.01001", 0.3]], "std": True},
             {"k": "Baumischabfall", "t": "gemischte Bau- und Abbruchabfälle, 0,25 t/m³", "teile": [["087.02.001.08001", 0.25]], "std": True},
             {"k": "Gipskarton", "t": "Gipskartonplatten, 0,8 t/m³", "teile": [["087.04.001.13001", 0.8]]},
             {"k": "Mineralwolle neu", "t": "Mineralwolle nach 2000, 0,1 t/m³", "teile": [["087.04.001.12001", 0.1]]}]},
         {"name": "Transport", "optionen": [
             {"k": "", "t": "lose Abfuhr (Lkw ab 10 t)", "teile": [], "std": True},
             {"k": "AC 10 m³", "t": "Absetzcontainer 10 m³ stellen und abfahren", "teile": [["087.05.001.04001", 0.1]], "std": True},
             {"k": "ARC 20 m³", "t": "Abrollcontainer 20 m³ stellen und abfahren", "teile": [["087.05.001.06001", 0.05]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "396.03", "kg": "396", "name": "Container inkl. Entsorgung", "einheit": "St",
     "lang": "Container stellen, abfahren und Inhalt entsorgen (Komplettpreis), optional mit verlängerter Standzeit.",
     "bezug": "Anzahl der Container",
     "schichten": [
         {"name": "Container", "optionen": [
             {"k": "Bauschutt 7 m³", "t": "Bauschutt sauber, 7 m³", "teile": [["087.05.003.02001", 1.0]], "std": True},
             {"k": "Bauschutt gem. 10", "t": "Bauschutt gemischt, 10 m³", "teile": [["087.05.003.06001", 1.0]], "std": True},
             {"k": "Holz 10 m³", "t": "Holz A I–III, 10 m³", "teile": [["087.05.003.09001", 1.0]], "std": True},
             {"k": "Mischabfall 10 m³", "t": "Baumischabfall, 10 m³", "teile": [["087.05.003.13001", 1.0]], "std": True},
             {"k": "Mischabfall 20 m³", "t": "Baumischabfall, 20 m³", "teile": [["087.05.003.14001", 1.0]], "std": True},
             {"k": "Gips 10 m³", "t": "Gips, 10 m³", "teile": [["087.05.003.17001", 1.0]], "std": True},
             {"k": "Grünschnitt 10 m³", "t": "Grünschnitt, 10 m³", "teile": [["087.05.003.21001", 1.0]]},
             {"k": "Bauschutt 5 m³", "t": "Bauschutt sauber, 5 m³", "teile": [["087.05.003.01001", 1.0]]}]},
         {"name": "Standzeit", "optionen": [
             {"k": "", "t": "Standzeit bis 14 Tage", "teile": [], "std": True},
             {"k": "+14 Tage", "t": "Standzeit 14 Tage verlängert", "teile": [["087.05.002.01001", 14.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "396.04", "kg": "396", "name": "Gefährliche Abfälle entsorgen", "einheit": "m³",
     "lang": "Gefährliche Abfälle verpacken, abfahren und mit Nachweisführung (eANV) entsorgen.",
     "bezug": "Abfallvolumen lose bzw. verpackt; Schüttdichten je Option, Nachweis 1 je 20 m³",
     "fest": [["087.06.002.01001", 0.05]],
     "schichten": [
         {"name": "Abfall", "optionen": [
             {"k": "AZ fest", "t": "Asbestzement fest gebunden, 1,0 t/m³", "teile": [["087.04.002.01001", 1.0]], "std": True},
             {"k": "Asbest schwach", "t": "schwach gebundener Asbest, 0,3 t/m³", "teile": [["087.04.002.02001", 0.3]], "std": True},
             {"k": "KMF alt", "t": "KMF alter Bauart, 0,1 t/m³", "teile": [["087.04.002.03001", 0.1]], "std": True},
             {"k": "HBCD-Dämmung", "t": "EPS/XPS mit HBCD, 0,03 t/m³", "teile": [["087.04.002.04001", 0.03]], "std": True},
             {"k": "Teer-Dachbahnen", "t": "teerhaltige Dachbahnen, 0,8 t/m³", "teile": [["087.04.002.05001", 0.8]], "std": True},
             {"k": "Holz A IV", "t": "Altholz A IV, 0,4 t/m³", "teile": [["087.04.002.06001", 0.4]], "std": True},
             {"k": "PAK-Bauschutt", "t": "PAK-haltiger Bauschutt, 1,4 t/m³", "teile": [["087.04.002.07001", 1.4]]}]},
         {"name": "Verpackung", "optionen": [
             {"k": "Big Bag", "t": "Big Bag 1 m³ mit Kranabholung", "teile": [["087.05.001.09001", 1.0]], "std": True},
             {"k": "Container 7 m³", "t": "Absetzcontainer 7 m³ (abgedeckt)", "teile": [["087.05.001.03001", 0.143]], "std": True}]},
     ], "tags": ["altbau"]},

    # ---------------------------------------------------------------- 397 Zusätzliche Maßnahmen
    {"id": "397.01", "kg": "397", "name": "Winterbau Einhausung/Heizung", "einheit": "m²",
     "lang": "Winterbaumaßnahmen: Einhausung, Beheizung (40 Tage) und Frostschutz für frisch betonierte Bauteile.",
     "bezug": "Eingehauste bzw. beheizte Fläche",
     "schichten": [
         {"name": "Einhausung", "optionen": [
             {"k": "Gitterfolie", "t": "Gitterfolie, 4 Wochen", "teile": [["099.03.002.01001", 1.0]], "std": True},
             {"k": "Schrumpffolie", "t": "Schrumpffolie, 4 Wochen", "teile": [["099.03.002.02001", 1.0]], "std": True},
             {"k": "Planen + Fenster", "t": "Planen mit Fenstern, 4 Wochen", "teile": [["099.03.002.03001", 1.0]], "std": True}]},
         {"name": "Beheizung", "optionen": [
             {"k": "", "t": "", "teile": []},
             {"k": "Elektro 40 Tage", "t": "Bauheizung 25 kW elektrisch je 200 m², 40 Tage", "teile": [["098.03.001.02001", 0.2]], "std": True},
             {"k": "Öl 40 Tage", "t": "Bauheizung 100 kW Öl je 800 m², 40 Tage, Heizöl 5 l/m²", "teile": [["098.03.001.04001", 0.05], ["098.03.002.01001", 5.0]], "std": True}]},
         {"name": "Betonschutz", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Thermomatten", "t": "Betonnachbehandlung mit Thermomatten", "teile": [["098.03.005.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "397.02", "kg": "397", "name": "Bautrocknung", "einheit": "m²",
     "lang": "Technische Bautrocknung von Estrich und Bauteilen mit Kondenstrocknern bzw. Dämmschichttrocknung, mit CM-Messung.",
     "bezug": "Getrocknete Fläche; CM-Messung 1 je 50 m²",
     "schichten": [
         {"name": "Trocknung", "optionen": [
             {"k": "Kondens 40 l 21 T", "t": "Kondenstrockner 40 l/Tag, 1 je 100 m², 21 Tage", "teile": [["098.03.003.01001", 0.21]], "std": True},
             {"k": "Kondens 80 l 21 T", "t": "Kondenstrockner 80 l/Tag, 1 je 100 m², 21 Tage", "teile": [["098.03.003.02001", 0.21]], "std": True},
             {"k": "Dämmschicht 2 Wo", "t": "Estrichdämmschichttrocknung Unterflur, 2 Wochen", "teile": [["099.03.004.01001", 2.0]], "std": True}]},
         {"name": "Messung", "optionen": [
             {"k": "", "t": "", "teile": []},
             {"k": "CM-Messung", "t": "CM-Messung, 1 je 50 m²", "teile": [["099.03.005.01001", 0.02]], "std": True},
             {"k": "CM 2× + Schutz", "t": "CM-Messung vor/nach, Schutzabdeckung Estrich", "teile": [["099.03.005.01001", 0.04], ["025.04.010.01001", 1.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "397.03", "kg": "397", "name": "Baureinigung je m² BGF", "einheit": "m²",
     "lang": "Reinigung während der Bauzeit und Bauendreinigung vor Übergabe, Fensterreinigung anteilig.",
     "bezug": "Brutto-Grundfläche; Endreinigung 0,8 m² NRF und Fenster 0,15 m² je m² BGF",
     "fest": [["033.01.001.01001", 1.0]],
     "schichten": [
         {"name": "Zwischenreinigung", "optionen": [
             {"k": "4× besenrein", "t": "4 Zwischenreinigungen besenrein", "teile": [["033.01.008.01001", 4.0]], "std": True},
             {"k": "8× besenrein", "t": "8 Zwischenreinigungen besenrein", "teile": [["033.01.008.01001", 8.0]], "std": True},
             {"k": "4× feucht", "t": "4 Zwischenreinigungen feucht gewischt", "teile": [["033.01.008.02001", 4.0]]}]},
         {"name": "Endreinigung", "optionen": [
             {"k": "End Wohnen/Büro", "t": "Bauendreinigung Wohnungsbau/Büro", "teile": [["033.01.002.01001", 0.8]], "std": True},
             {"k": "End + Einpflege", "t": "Bauendreinigung elastische Beläge mit Erstpflege", "teile": [["033.01.002.03001", 0.8]], "std": True}]},
         {"name": "Fenster", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Fenster beidseitig", "t": "Fensterreinigung beidseitig, 0,15 m² je m²", "teile": [["033.01.003.01001", 0.15]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "397.04", "kg": "397", "name": "Messungen/Qualitätssicherung", "einheit": "psch",
     "lang": "Zusätzliche Prüfungen und Messungen am Gebäude (EFH): Luftdichtheit, Thermografie und Bauakustik nach Wahl.",
     "bezug": "Pauschal je Gebäude (EFH)",
     "schichten": [
         {"name": "Luftdichtheit", "optionen": [
             {"k": "Blower-Door Abn.", "t": "Luftdichtheitsmessung Abnahme", "teile": [["099.01.008.02001", 1.0]], "std": True},
             {"k": "Blower-Door 2×", "t": "Luftdichtheitsmessung Vorab und Abnahme", "teile": [["099.01.008.03001", 1.0]], "std": True}]},
         {"name": "Thermografie", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Thermografie", "t": "Thermografie Gebäudehülle innen und außen", "teile": [["099.01.007.02001", 1.0]], "std": True}]},
         {"name": "Akustik", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Schall 2+2", "t": "2 Luftschall- und 2 Trittschallmessungen", "teile": [["099.04.001.01001", 2.0], ["099.04.001.03001", 2.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    # ---------------------------------------------------------------- 398 Provisorische Baukonstruktionen
    {"id": "398.01", "kg": "398", "name": "Provisorischer Öffnungsverschluss", "einheit": "m²",
     "lang": "Fenster- und Türöffnungen während der Bauzeit provisorisch verschließen, optional mit Bautür anteilig.",
     "bezug": "Öffnungsfläche; Bautür 1 je 20 m²",
     "schichten": [
         {"name": "Verschluss", "optionen": [
             {"k": "Folie/Lattung", "t": "Folie auf Lattung", "teile": [["000.11.006.01001", 1.0]], "std": True},
             {"k": "Gewebefolie Rahmen", "t": "transparente Gewebefolie auf Rahmen", "teile": [["000.11.006.02001", 1.0]], "std": True},
             {"k": "OSB einbruchh.", "t": "OSB-Platte einbruchhemmend verschraubt", "teile": [["000.11.006.03001", 1.0]], "std": True},
             {"k": "Stegplatten", "t": "Stegplatten lichtdurchlässig", "teile": [["099.05.002.03001", 1.0]], "std": True}]},
         {"name": "Bautür", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Stahl-Bautür anteil.", "t": "Stahl-Bautür verzinkt mit Profilzylinder, 1 je 20 m²", "teile": [["000.11.005.02001", 0.05]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "398.02", "kg": "398", "name": "Notdach/Wetterschutz", "einheit": "m²",
     "lang": "Provisorische Dachabdeckung bei Dach- und Umbauarbeiten, Mauerkronen abdecken anteilig.",
     "bezug": "Abgedeckte Dachfläche; Mauerkronen 0,3 m je m²",
     "schichten": [
         {"name": "Notdach", "optionen": [
             {"k": "Plane/Lattung", "t": "Plane auf Lattung", "teile": [["098.02.003.01001", 1.0]], "std": True},
             {"k": "Unterspannbahn", "t": "Unterspannbahn als Behelfsdeckung", "teile": [["098.02.003.02001", 1.0]], "std": True},
             {"k": "Systemdach", "t": "Systemdach (Gerüstdach)", "teile": [["098.02.003.03001", 1.0]], "std": True},
             {"k": "Bitumen/Schalung", "t": "Bitumenbahn auf Schalung (Flachdach)", "teile": [["098.02.003.04001", 1.0]], "std": True}]},
         {"name": "Mauerkronen", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Kronen abdecken", "t": "Mauerkronen bis 30 cm abdecken, 0,3 m je m²", "teile": [["098.02.005.01001", 0.3]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "398.03", "kg": "398", "name": "Provisorische Nutzerversorgung", "einheit": "psch",
     "lang": "Provisorische Versorgung der Nutzer während Umbau im bewohnten Bestand: mobile Heizzentrale, Sanitärcontainer und Wasser/Abwasser.",
     "bezug": "Pauschal je Gebäude; Positionen je 4 Wochen, Verlängerung siehe Option",
     "schichten": [
         {"name": "Heizung", "optionen": [
             {"k": "", "t": "", "teile": []},
             {"k": "Heizzentr. 4 Wo", "t": "mobile Heizzentrale bis 60 kW, 4 Wochen", "teile": [["099.05.004.01001", 1.0]], "std": True},
             {"k": "Heizzentr. 12 Wo", "t": "mobile Heizzentrale bis 60 kW, 12 Wochen (Folgeperioden ca. 60 %)", "teile": [["099.05.004.01001", 2.2]], "std": True}]},
         {"name": "Sanitär", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "San.-Cont. 4 Wo", "t": "Sanitärcontainer für Nutzer, 4 Wochen", "teile": [["099.05.004.03001", 1.0]], "std": True},
             {"k": "San.-Cont. 12 Wo", "t": "Sanitärcontainer für Nutzer, 12 Wochen (Folgeperioden ca. 60 %)", "teile": [["099.05.004.03001", 2.2]], "std": True}]},
         {"name": "Wasser/Abwasser", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Wasser/Abw. 4 Wo", "t": "provisorische Wasser-/Abwasserversorgung, 4 Wochen", "teile": [["099.05.004.02001", 1.0]], "std": True}]},
     ], "tags": ["altbau"]},

    {"id": "398.04", "kg": "398", "name": "Provisorische Treppe je Geschoss", "einheit": "St",
     "lang": "Provisorische Treppe bzw. Steigleiter je Geschoss mit Beleuchtung und Seitenschutz (4 Wochen).",
     "bezug": "Anzahl der Geschosse",
     "schichten": [
         {"name": "Treppe", "optionen": [
             {"k": "Gerüsttreppe", "t": "Bautreppe Gerüstsystem", "teile": [["099.05.001.01001", 1.0]], "std": True},
             {"k": "Holztreppe", "t": "Holztreppe", "teile": [["099.05.001.02001", 1.0]], "std": True}]},
         {"name": "Beleuchtung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Beleuchtung", "t": "provisorische Beleuchtung Treppenhaus/Flure", "teile": [["099.05.003.01001", 1.0]], "std": True}]},
         {"name": "Seitenschutz", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Seitenschutz 6 m", "t": "Seitenschutz Treppe/Podest, 6 m", "teile": [["099.02.007.01001", 6.0]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},
]
