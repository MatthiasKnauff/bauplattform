# LB 010 Drän- und Versickerungsarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "010", "name": "Drän- und Versickerungsarbeiten", "atv": "DIN 18308", "lohn": "kanal", "kg": "326",
    "gruppen": [
        {"name": "Dränanlagen", "positionen": [
            {"kurz": "Dränleitung PVC/PE gelocht DN {dn}, mit Filterumhüllung",
             "lang": "Ringdränage nach DIN 4095 aus gelochten Dränrohren DN {dn} (Sickerschlitze umlaufend) "
                     "mit Gefälle ≥ 0,5 % auf Betonauflager bzw. Kiesbett verlegen, mit Filterkies 8/16 "
                     "umhüllen und mit Geotextil filterstabil abdecken.",
             "einheit": "m", "gen": "A",
             "varianten": [{"dn": "100", "h": 0.40, "mat": 14}, {"dn": "125", "h": 0.45, "mat": 18}]},
            {"kurz": "Spül- und Kontrollschacht Drän DN {d}",
             "lang": "Spül- bzw. Kontrollschacht für Dränanlagen aus Kunststoff DN {d} mit Anschlussstutzen, "
                     "Teleskopaufsatz und Abdeckung, an Eckpunkten der Dränage einbauen.",
             "einheit": "St", "gen": "A",
             "varianten": [{"d": "315", "h": 1.5, "mat": 140}, {"d": "400", "h": 2.0, "mat": 230}]},
            {"kurz": "Dränschicht an erdberührter Wand, Dränmatte",
             "lang": "Vertikale Dränschicht vor erdberührten Wänden aus Noppenbahn mit kaschiertem Filtervlies, "
                     "Noppen zur Wand, mit Abschlussleiste oben, auf Perimeterdämmung bzw. Abdichtung verlegt.",
             "einheit": "m²", "h": 0.12, "mat": 7.5, "gen": "A", "kg": "335"},
            {"kurz": "Flächendrän unter Bodenplatte, Kies 16/32, d = {d} cm",
             "lang": "Flächendränschicht unter der Bodenplatte aus Kies 16/32 mit Trennvlies oben und unten, "
                     "Dicke {d} cm, an Ringdränage angeschlossen.",
             "einheit": "m²", "gen": "A",
             "varianten": [{"d": "15", "h": 0.05, "mat": 6.5, "geraet": 1}, {"d": "20", "h": 0.06, "mat": 8.5, "geraet": 1.2}]},
            {"kurz": "Pumpenschacht für Dränwasser mit Tauchpumpe",
             "lang": "Pumpenschacht DN 600 aus Kunststoff mit automatischer Tauchpumpe, Schwimmerschalter, "
                     "Druckleitung bis 10 m und Rückflussverhinderer einbauen und in Betrieb nehmen.",
             "einheit": "St", "h": 8, "mat": 1150, "gen": "B"},
        ]},
        {"name": "Versickerung", "positionen": [
            {"kurz": "Versickerungsmulde herstellen, Oberboden {d} cm",
             "lang": "Versickerungsmulde nach DWA-A 138 profilieren, belebte Bodenzone aus Oberboden {d} cm "
                     "andecken, Notüberlauf herstellen; Ansaat gesondert.",
             "einheit": "m²", "gen": "B", "kg": "541", "lohn": "aussen",
             "varianten": [{"d": "30", "h": 0.25, "mat": 8, "geraet": 5}]},
            {"kurz": "Rigolen aus Kunststoff-Sickerblöcken, Speichervolumen",
             "lang": "Rigole aus Kunststoff-Füllkörpern (Speicherkoeffizient ≥ 0,95), in Geotextil eingeschlagen, "
                     "mit Inspektionskanal, Zulauf und Entlüftung, einschließlich Aushub, Kiesbett und Verfüllung. "
                     "Abrechnung nach Bruttovolumen der Blöcke.",
             "einheit": "m³", "h": 3.0, "mat": 180, "geraet": 35, "gen": "B", "kg": "541"},
            {"kurz": "Sickerschacht Betonringe DN {d}, Tiefe bis 3 m",
             "lang": "Sickerschacht aus gelochten Betonringen DN {d} mit Filterkies-Ummantelung, Sandfang im "
                     "Zulauf und Abdeckung Klasse B 125, einschließlich Erdarbeiten.",
             "einheit": "St", "gen": "B", "kg": "541",
             "varianten": [{"d": "1000", "h": 10, "mat": 1150, "geraet": 380}, {"d": "1500", "h": 14, "mat": 1900, "geraet": 520}]},
            {"kurz": "Versickerungsversuch (Open-End-Test)",
             "lang": "Versickerungsversuch zur Bestimmung des Durchlässigkeitsbeiwerts kf im Bohrloch bzw. "
                     "Schurf durchführen und auswerten.",
             "einheit": "St", "h": 2, "geraet": 320, "gen": "B", "kg": "541"},
        ]},
    ],
}]


# ---------------------------------------------------------------- Runde 2: Ausführungsachsen
_ORT = [{}, {"k": "Bestand", "t": "Ausführung an bzw. in bestehendem Gebäude: Anschluss an vorhandene Leitungen, eingeschränkte Zugänglichkeit.",
             "fh": 1.35, "gen": "B", "tags": ["altbau"]}]
_TIEFE = [{}, {"k": "Tiefe über 2 m", "t": "Verlegetiefe bzw. Einbautiefe über 2,0 m mit Grabenverbau (Verbau gesondert).", "fh": 1.2}]
for _g in LBS[0]["gruppen"]:
    for _p in _g["positionen"]:
        if "achsen" not in _p and _p["einheit"] in ("m", "St") and not _p["kurz"].startswith(("Dichtheitsprüfung", "Kamerabefahrung", "Versickerungsversuch")):
            _p["achsen"] = [_ORT, _TIEFE] if _p["einheit"] == "m" and "Graben" in _p["kurz"] else [_ORT]
