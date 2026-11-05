# LB 064 Zutrittskontroll- und Zeiterfassungsanlagen – eigene Texte und Ansätze (Preisstand 11/2026)

ORT = [{}, {"k": "Bestand", "t": "Nachrüstung im Bestand an vorhandenen Türen.", "fh": 1.3, "gen": "C", "tags": ["altbau"]}]
TECH = [{"k": "RFID MIFARE DESFire", "t": "Identmedium RFID MIFARE DESFire EV3."}, {"k": "RFID + PIN", "t": "RFID mit zusätzlicher PIN-Tastatur.", "mat": 120},
        {"k": "RFID+BLE", "t": "RFID und mobile Berechtigung über Smartphone (BLE/NFC).", "mat": 90}]
ONL = [{"ersetze": [[r",? batteriebetrieben", ""]], "k": "online verkabelt", "t": "Online-Anbindung und Stromversorgung über Bus bzw. Netzwerk, Leitung gesondert.", "h": 1.0, "mat": 250},
       {"k": "online Funk", "t": "Online-Anbindung über Funk-Gateway, batteriebetrieben.", "mat": 120},
       {"k": "Data-on-Card", "t": "Offline-Komponente, batteriebetrieben, Berechtigungen über Identmedium.", "fh": 0.6}]

LBS = [{
    "nr": "064", "name": "Zutrittskontroll- und Zeiterfassungsanlagen", "atv": "DIN 18382", "lohn": "elektro",
    "gruppen": [
        {"name": "Zutrittskontrolle", "positionen": [
            {"kurz": "Zutrittsleser Wand, {art}",
             "lang": "Zutrittskontroll-Leser zur Wandmontage neben der Tür ({art}), Schutzart IP 65, mit Signalisierung, montiert, angeschlossen und parametriert.",
             "einheit": "St", "kg": "456", "gen": "C", "achsen": [TECH, ORT],
             "varianten": [{"art": "Innen", "h": 1.8, "mat": 320}, {"art": "Außen, vandalismusgeschützt", "h": 2.2, "mat": 480}]},
            {"kurz": "Elektron. Beschlag/Zylinder, {art}",
             "lang": "Elektronische Schließkomponente ({art}), batteriebetrieben, für Rohrrahmen- bzw. Holztüren, programmiert.",
             "einheit": "St", "kg": "456", "gen": "C", "achsen": [TECH, ONL, ORT],
             "varianten": [{"art": "Knaufzylinder", "h": 1.2, "mat": 420}, {"art": "Langschild-Beschlag", "h": 1.8, "mat": 680},
                           {"art": "Langschild-Beschlag für Panikschloss", "h": 2.0, "mat": 820}, {"art": "Möbelschloss", "h": 0.5, "mat": 140}]},
            {"kurz": "Türsteuerungsmodul, {n} Tür(en)",
             "lang": "Zutrittskontroll-Türsteuerung im Gehäuse für {n} Tür(en) mit Ein-/Ausgängen für Öffner, Türkontakt und Riegelkontakt, Netzteil mit Akku.",
             "einheit": "St", "kg": "456", "gen": "C", "achsen": [ORT],
             "varianten": [{"n": "1", "h": 3, "mat": 650}, {"n": "2", "h": 4, "mat": 980}, {"n": "4", "h": 6, "mat": 1650}]},
            {"kurz": "Zutrittskontroll-Software und Server, bis {n} Türen",
             "lang": "Software zur Verwaltung der Zutrittsberechtigungen mit Lizenz für bis zu {n} Türen, Einrichtung auf bauseitigem Server, Schulung 4 h.",
             "einheit": "psch", "kg": "456", "gen": "C", "lohn": "msr",
             "varianten": [{"n": "10", "h": 8, "mat": 1500}, {"n": "50", "h": 14, "mat": 4200}, {"n": "200", "h": 24, "mat": 9500}]},
            {"kurz": "Identmedium {art}",
             "lang": "Identmedium ({art}) liefern, codieren und personalisiert übergeben.",
             "einheit": "St", "kg": "456", "gen": "A", "achsen": [TECH[:1]],
             "varianten": [{"art": "Karte ISO", "h": 0.03, "mat": 6}, {"art": "Schlüsselanhänger", "h": 0.03, "mat": 7}, {"art": "Armband", "h": 0.03, "mat": 9}]},
            {"kurz": "Drehkreuz/Sperre {art}",
             "lang": "Personenvereinzelungsanlage ({art}) mit Anbindung an die Zutrittskontrolle, Fluchtfunktion, montiert und eingestellt.",
             "einheit": "St", "kg": "456", "gen": "C", "achsen": [ORT],
             "varianten": [{"art": "Tripod-Drehsperre", "h": 8, "mat": 3800}, {"art": "Schwenktür-Sensorsperre", "h": 10, "mat": 7800}, {"art": "Drehkreuz mannshoch", "h": 16, "mat": 9500}]},
        ]},
        {"name": "Zeiterfassung", "positionen": [
            {"kurz": "Zeiterfassungsterminal {art}",
             "lang": "Zeiterfassungsterminal ({art}) mit Display, Netzwerkanschluss (PoE), montiert und eingerichtet.",
             "einheit": "St", "kg": "456", "gen": "C", "achsen": [TECH, ORT],
             "varianten": [{"art": "Standard", "h": 1.5, "mat": 780}, {"art": "mit Touch und Kostenstellenbuchung", "h": 2.0, "mat": 1250}]},
        ]},
    ],
}]
