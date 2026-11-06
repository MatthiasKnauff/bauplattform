# LB 009 Entwässerungskanalarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "009", "name": "Entwässerungskanalarbeiten", "atv": "DIN 18306", "lohn": "kanal", "kg": "411",
    "gruppen": [
        {"name": "Grundleitungen unter Gebäude", "positionen": [
            {"kurz": "Grundleitung KG-PVC-U SN {sn}, DN {dn}, unter Bodenplatte",
             "lang": "Abwassergrundleitung aus PVC-U-Rohren mit Steckmuffe nach DIN EN 1401, Ringsteifigkeit "
                     "SN {sn}, Nennweite DN {dn}, im vorhandenen Graben unter der Bodenplatte in Sandbettung "
                     "(Bettung und Umhüllung enthalten) mit Gefälle nach Plan verlegen, Dichtheitsprüfung gesondert.",
             "einheit": "m", "gen": "A",
             "varianten": [{"sn": "4", "dn": "100", "h": 0.25, "mat": 9}, {"sn": "4", "dn": "125", "h": 0.27, "mat": 12},
                           {"sn": "4", "dn": "150", "h": 0.30, "mat": 16}, {"sn": "8", "dn": "160", "h": 0.32, "mat": 21},
                           {"sn": "8", "dn": "200", "h": 0.38, "mat": 32}]},
            {"kurz": "Formstück KG (Bogen/Abzweig) DN {dn}",
             "lang": "Formstück aus PVC-U passend zur Grundleitung (Bogen, Abzweig, Übergang, Reduzierung) "
                     "liefern und einbauen, DN {dn}.",
             "einheit": "St", "gen": "A",
             "varianten": [{"dn": "100", "h": 0.12, "mat": 6}, {"dn": "150", "h": 0.15, "mat": 14}, {"dn": "200", "h": 0.20, "mat": 32}]},
            {"kurz": "Grundleitung PP-Hochlastrohr SN 10, DN {dn}",
             "lang": "Abwassergrundleitung aus Polypropylen-Rohren mit Steckmuffe, Ringsteifigkeit SN 10, "
                     "DN {dn}, wie vor verlegen.",
             "einheit": "m", "gen": "A",
             "varianten": [{"dn": "160", "h": 0.32, "mat": 26}, {"dn": "200", "h": 0.38, "mat": 38}]},
            {"kurz": "Reinigungsrohr mit Deckel DN {dn} in Grundleitung",
             "lang": "Reinigungsrohr mit dicht verschraubtem Deckel in die Grundleitung einbauen, DN {dn}.",
             "einheit": "St", "gen": "A",
             "varianten": [{"dn": "100", "h": 0.4, "mat": 38}, {"dn": "150", "h": 0.5, "mat": 62}]},
            {"kurz": "Rückstauverschluss für fäkalienfreies Abwasser DN {dn}",
             "lang": "Rückstauverschluss Typ 2 nach DIN EN 13564 für fäkalienfreies Abwasser, mit Notverschluss, "
                     "in die Grundleitung einbauen bzw. in Bodenplatte einbetonieren, DN {dn}.",
             "einheit": "St", "gen": "B",
             "varianten": [{"dn": "100", "h": 2.0, "mat": 340}, {"dn": "150", "h": 2.5, "mat": 520}]},
            {"kurz": "Dichtheitsprüfung Grundleitung nach DIN EN 1610",
             "lang": "Dichtheitsprüfung der Grundleitungen mit Luft oder Wasser nach DIN EN 1610 durchführen, "
                     "Prüfprotokoll übergeben. Abrechnung nach geprüfter Leitungslänge.",
             "einheit": "m", "h": 0.05, "geraet": 3, "gen": "B"},
            {"kurz": "Kamerabefahrung (TV-Inspektion) Grundleitung",
             "lang": "Optische Inspektion der Grund- und Anschlussleitungen mit Kanalkamera, Zustandsbericht und "
                     "Videoaufzeichnung nach DWA-M 149-2. Abrechnung nach befahrener Länge.",
             "einheit": "m", "h": 0.03, "geraet": 4.5, "gen": "B", "tags": ["altbau"]},
        ]},
        {"name": "Kanäle und Anschlussleitungen außerhalb", "positionen": [
            {"kurz": "Kanalrohr KG-PVC-U SN 8, DN {dn}, Graben bis {t} m, einschl. Erdarbeiten",
             "lang": "Anschlusskanal aus PVC-U, SN 8, DN {dn}, im Erdreich außerhalb des Gebäudes verlegen, "
                     "einschließlich Grabenaushub bis {t} m Tiefe, Grabenverbau, Sandbettung, lagenweisem Verfüllen "
                     "mit Aushubboden und Abfuhr des verdrängten Bodens.",
             "einheit": "m", "gen": "B", "kg": "541",
             "varianten": [{"dn": "150", "t": "1,5", "h": 1.1, "mat": 32, "geraet": 22},
                           {"dn": "150", "t": "2,5", "h": 1.5, "mat": 36, "geraet": 32},
                           {"dn": "200", "t": "2,5", "h": 1.6, "mat": 48, "geraet": 34}]},
            {"kurz": "Hausanschluss an öffentlichen Kanal, Anbohrung DN 150",
             "lang": "Anschluss der Grundstücksentwässerung an den öffentlichen Kanal mit Anbohrsattel bzw. "
                     "Abzweig nach Vorgaben des Netzbetreibers, einschließlich Abstimmung; Gebühren und "
                     "Straßenaufbruch gesondert.",
             "einheit": "St", "h": 8, "mat": 280, "geraet": 350, "gen": "C", "kg": "541"},
            {"kurz": "Kontrollschacht Kunststoff DN {d}, Tiefe bis {t} m",
             "lang": "Kontroll- bzw. Übergabeschacht aus PP/PE nach DIN EN 13598, DN {d}, mit Gerinne, "
                     "Teleskop-Aufsatzrohr und Abdeckung Klasse B 125, Schachttiefe bis {t} m, einschließlich "
                     "Erdarbeiten.",
             "einheit": "St", "gen": "B", "kg": "541",
             "varianten": [{"d": "400", "t": "1,5", "h": 4, "mat": 420, "geraet": 60}, {"d": "1000", "t": "2,5", "h": 8, "mat": 1450, "geraet": 220}]},
            {"kurz": "Betonschacht DN 1000 aus Fertigteilen, Tiefe bis {t} m",
             "lang": "Schacht aus Betonfertigteilen nach DIN 4034-1 (Schachtunterteil mit Gerinne, Ringe, Konus, "
                     "Auflageringe), Abdeckung Klasse D 400, Steigbügel, Schachttiefe bis {t} m, einschließlich "
                     "Erdarbeiten und Anschluss der Rohre.",
             "einheit": "St", "gen": "B", "kg": "541",
             "varianten": [{"t": "2,0", "h": 12, "mat": 1700, "geraet": 420}, {"t": "3,5", "h": 16, "mat": 2250, "geraet": 620}]},
            {"kurz": "Hebeanlage für fäkalienhaltiges Abwasser, Doppelanlage",
             "lang": "Abwasserhebeanlage nach DIN EN 12050-1 als Doppelpumpenanlage mit Behälter, Alarmschaltgerät, "
                     "Druckleitung bis 5 m und Rückflussverhinderer liefern, montieren und in Betrieb nehmen.",
             "einheit": "St", "h": 12, "mat": 6800, "gen": "C", "lohn": "sanitaer"},
            {"kurz": "Fassadenrinne/Kastenrinne Klasse {k}, Breite {b} mm",
             "lang": "Entwässerungsrinne aus Polymerbeton mit Gitterrost Klasse {k}, lichte Breite {b} mm, "
                     "in Betonbettung C20/25 versetzen, an Grundleitung anschließen, einschließlich Stirnwände "
                     "und Einlaufkasten anteilig.",
             "einheit": "m", "gen": "B", "kg": "541", "lohn": "aussen",
             "varianten": [{"k": "B 125", "b": "100", "h": 0.8, "mat": 68}, {"k": "C 250", "b": "150", "h": 1.0, "mat": 98}]},
            {"kurz": "Hofablauf/Straßenablauf mit Schlammeimer",
             "lang": "Hofablauf aus Kunststoff bzw. Beton mit Schlammeimer und Rost Klasse C 250 versetzen und an "
                     "die Grundleitung DN 150 anschließen.",
             "einheit": "St", "h": 3, "mat": 260, "gen": "B", "kg": "541"},
            {"kurz": "Regenwasserzisterne Kunststoff {v} m³, erdverlegt",
             "lang": "Erdtank zur Regenwassernutzung aus PE, Nutzinhalt {v} m³, mit Filter, Überlauf mit "
                     "Geruchsverschluss und Domschacht, einschließlich Aushub, Kiesbett und Verfüllung.",
             "einheit": "St", "gen": "C", "kg": "541",
             "varianten": [{"v": "5", "h": 14, "mat": 2300, "geraet": 450}, {"v": "10", "h": 20, "mat": 4300, "geraet": 750}]},
            {"kurz": "Abscheideranlage Leichtflüssigkeiten NS {ns}",
             "lang": "Koaleszenzabscheider mit Schlammfang nach DIN EN 858, Nenngröße NS {ns}, aus Beton bzw. "
                     "Kunststoff, mit selbsttätigem Verschluss, einschließlich Erdarbeiten und Anschlüssen.",
             "einheit": "St", "gen": "C", "kg": "541",
             "varianten": [{"ns": "3", "h": 16, "mat": 4800, "geraet": 650}, {"ns": "6", "h": 20, "mat": 7200, "geraet": 900}]},
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
            _p["achsen"] = [_ORT, _TIEFE] if _p["einheit"] == "m" and "Graben" in _p["kurz"] and "{t}" not in _p["kurz"] else [_ORT]   # Tiefe schon in den Varianten
