# Bauteilvorlagen KG 310 Baugrube/Erdbau (311 Herstellung, 312 Umschließung, 313 Wasserhaltung) – eigene Aufbauten aus der Positionsdatenbank.
# Faktor = Menge der Position je Einheit des Bauteils.
# Annahmen: Boden 1,8 t/m³ (fest), Auflockerung 1,3; Kellerbaugrube 2,8 m tief inkl. Böschung ≈ 3,2 m³ Aushub je m² Sohle;
# Arbeitsraum Keller ≈ 0,8 m³ je m² Sohle (EFH/MFH 10 × 15 m, Arbeitsraum 1,0 m).

VORLAGEN = [
    # ---------------------------------------------------------------- 311 Herstellung
    {"id": "311.01", "kg": "311", "name": "Baugrubenaushub mit Bodenabfuhr", "einheit": "m³",
     "lang": "Baugrube profilgerecht ausheben, Boden seitlich zwischenlagern, laden und zur Verwertung bzw. Entsorgung abfahren "
             "(einschließlich Annahmegebühr der gewählten Zuordnungsklasse). Optional Planum der Sohle anteilig.",
     "bezug": "Aushubvolumen im Abtrag (fest), einschließlich Böschungen und Arbeitsraum",
     "schichten": [
         {"name": "Aushub", "optionen": [
             {"k": "B1 ≤1,25 m", "t": "Homogenbereich B1, leicht lösbar, Tiefe bis 1,25 m", "teile": [["002.02.001.01001", 1.0]]},
             {"k": "B1 ≤3,5 m", "t": "Homogenbereich B1, leicht lösbar, Tiefe bis 3,5 m", "teile": [["002.02.001.02001", 1.0]], "std": True},
             {"k": "B2 ≤3,5 m", "t": "Homogenbereich B2, mittelschwer lösbar, Tiefe bis 3,5 m", "teile": [["002.02.001.03001", 1.0]], "std": True},
             {"k": "B2 + 20 % Fels", "t": "Homogenbereich B2 mit ca. 20 % schwer lösbarem Boden/Fels", "teile": [["002.02.001.03001", 1.0], ["002.02.003.01001", 0.2]]}]},
         {"name": "Bodenverbleib", "optionen": [
             {"k": "Z0 abfahren", "t": "Boden laden und abfahren, Z0/BM-0, bis 10 km", "teile": [["002.02.007.01001", 1.8]], "std": True},
             {"k": "Z1.1 abfahren", "t": "Boden laden und abfahren, Z1.1/BM-F1, bis 10 km", "teile": [["002.02.007.02001", 1.8]], "std": True},
             {"k": "Z1.2 abfahren", "t": "Boden laden und abfahren, Z1.2/BM-F2, bis 10 km", "teile": [["002.02.007.03001", 1.8]]},
             {"k": "Z2 abfahren", "t": "Boden laden und abfahren, Z2/BM-F3, bis 10 km", "teile": [["002.02.007.04001", 1.8]], "std": True},
             {"k": "50 % Wiedereinbau", "t": "50 % zwischenlagern zum Wiedereinbau, 50 % Z0 abfahren", "teile": [["002.04.007.01001", 0.5], ["002.02.007.01001", 0.9]]}]},
         {"name": "Sohle", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "mit Planum", "t": "Planum der Baugrubensohle ±3 cm anteilig (Tiefe ca. 3 m)", "teile": [["002.03.001.01001", 0.33]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "311.02", "kg": "311", "name": "Baugrube Keller je m² Sohle", "einheit": "m²",
     "lang": "Baugrube für ein unterkellertes Gebäude komplett: Oberboden abtragen, Aushub rd. 2,8 m tief mit Böschungen, "
             "Boden abfahren, Planum der Sohle und Arbeitsraumverfüllung nach Wahl.",
     "bezug": "Fläche der Baugrubensohle (Gebäudegrundfläche zzgl. Arbeitsraum)",
     "schichten": [
         {"name": "Oberboden", "optionen": [
             {"k": "OB 20 lagern", "t": "Oberboden 20 cm abtragen und seitlich lagern", "teile": [["002.01.003.01001", 1.2]], "std": True},
             {"k": "OB 30 abfahren", "t": "Oberboden 30 cm abtragen und abfahren", "teile": [["002.01.004.02001", 1.2]], "std": True},
             {"k": "ohne Oberboden", "t": "kein Oberboden vorhanden (befestigte Fläche gesondert)", "teile": []}]},
         {"name": "Aushub", "optionen": [
             {"k": "2,8 m B1 Z0", "t": "Aushub B1 bis 2,8 m, direkt laden und abfahren, Z0", "teile": [["002.02.002.01001", 3.2]], "std": True},
             {"k": "2,8 m B2 Z0", "t": "Aushub B2 bis 2,8 m, direkt laden und abfahren, Z0", "teile": [["002.02.002.02001", 3.2]], "std": True},
             {"k": "2,8 m B1 Z1.1", "t": "Aushub B1 bis 2,8 m, lagern, abfahren Z1.1", "teile": [["002.02.001.02001", 3.2], ["002.02.007.02001", 5.76]], "std": True},
             {"k": "3,5 m B1 Z0", "t": "Aushub B1 bis 3,5 m, direkt laden und abfahren, Z0", "teile": [["002.02.002.01001", 4.0]]},
             {"k": "1,5 m B1 Z0", "t": "Teilunterkellerung/Souterrain, Aushub B1 bis 1,5 m, Z0", "teile": [["002.02.002.01001", 1.7]]}]},
         {"name": "Sohle/Arbeitsraum", "optionen": [
             {"k": "Planum, AR Kies", "t": "Planum ±3 cm, Arbeitsraum mit Kiessand 0/32 verfüllen", "teile": [["002.03.001.01001", 1.0], ["002.03.003.01001", 0.8]], "std": True},
             {"k": "Planum, AR RC", "t": "Planum ±3 cm, Arbeitsraum mit RC 0/45 verfüllen", "teile": [["002.03.001.01001", 1.0], ["002.03.003.02001", 0.8]], "std": True},
             {"k": "nur Planum", "t": "Planum ±3 cm, Arbeitsraumverfüllung gesondert", "teile": [["002.03.001.01001", 1.0]]}]},
     ], "tags": ["neubau"]},

    {"id": "311.03", "kg": "311", "name": "Fundamentaushub", "einheit": "m³",
     "lang": "Gräben bzw. Gruben für Streifen- und Einzelfundamente ausheben, Boden lagern oder abfahren, Sohle verdichten.",
     "bezug": "Aushubvolumen der Fundamentgräben im Abtrag (fest)",
     "schichten": [
         {"name": "Aushub", "optionen": [
             {"k": "Graben B ≤0,6 m", "t": "Fundamentgräben B bis 0,6 m, Tiefe bis 1,0 m", "teile": [["002.02.004.01001", 1.0]], "std": True},
             {"k": "Graben B ≤1,0 m", "t": "Fundamentgräben B bis 1,0 m, Tiefe bis 1,5 m", "teile": [["002.02.004.02001", 1.0]], "std": True},
             {"k": "Einzelgruben", "t": "Einzelfundamentgruben bis 1,0 m³, Zulage Kleinaushub", "teile": [["002.02.004.02001", 1.0], ["002.04.009.02001", 1.0]], "std": True},
             {"k": "Handaushub", "t": "Handaushub B1 (beengte Verhältnisse, Bestand)", "teile": [["002.02.006.01001", 1.0]]}]},
         {"name": "Bodenverbleib", "optionen": [
             {"k": "Z0 abfahren", "t": "Boden laden und abfahren, Z0/BM-0", "teile": [["002.02.007.01001", 1.8]], "std": True},
             {"k": "Z1.1 abfahren", "t": "Boden laden und abfahren, Z1.1/BM-F1", "teile": [["002.02.007.02001", 1.8]], "std": True},
             {"k": "zwischenlagern", "t": "Boden auf der Baustelle zwischenlagern zum Wiedereinbau", "teile": [["002.04.007.01001", 1.0]], "std": True}]},
         {"name": "Sohle", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Sohle verdichtet", "t": "Grabensohle planieren und verdichten (1,25 m² je m³)", "teile": [["002.03.001.01001", 1.25]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "311.04", "kg": "311", "name": "Arbeitsraumverfüllung", "einheit": "m³",
     "lang": "Arbeitsräume an erdberührten Bauteilen lagenweise verfüllen und verdichten (DPr ≥ 97 %), Abdichtung und Dämmung schützen.",
     "bezug": "Verfülltes Volumen im verdichteten Zustand",
     "schichten": [
         {"name": "Material", "optionen": [
             {"k": "Boden seitlich", "t": "seitlich gelagerter, geeigneter Boden", "teile": [["002.03.002.01001", 1.0]], "std": True},
             {"k": "Kiessand 0/32", "t": "geliefertes Kiessand 0/32", "teile": [["002.03.003.01001", 1.0]], "std": True},
             {"k": "RC 0/45", "t": "geliefertes Recyclingmaterial RC-1 0/45", "teile": [["002.03.003.02001", 1.0]], "std": True},
             {"k": "Sand/Kies Graben", "t": "Sand/Kies in schmalen Arbeitsräumen und Gräben", "teile": [["002.04.004.01001", 1.0]]}]},
         {"name": "Förderung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "umlagern ≤50 m", "t": "Boden innerhalb der Baustelle fördern, bis 50 m", "teile": [["002.04.008.01001", 1.0]], "std": True},
             {"k": "umlagern ≤200 m", "t": "Boden innerhalb der Baustelle fördern, bis 200 m", "teile": [["002.04.008.02001", 1.0]]}]},
         {"name": "Prüfung", "optionen": [
             {"k": "", "t": "ohne Verdichtungsprüfung", "teile": []},
             {"k": "LFG-Prüfung", "t": "dynamische Lastplattendruckversuche, 1 je 50 m³", "teile": [["002.04.011.01001", 0.02]], "std": True},
             {"k": "Plattendruck", "t": "statischer Plattendruckversuch, 1 je 200 m³", "teile": [["002.03.007.01001", 0.005]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "311.05", "kg": "311", "name": "Oberbodenarbeiten", "einheit": "m²",
     "lang": "Oberboden im Baufeld abtragen, seitlich in Mieten lagern oder abfahren; optional teilweise wieder andecken und Bodenprobe zur Deklaration.",
     "bezug": "Abtragsfläche des Oberbodens",
     "schichten": [
         {"name": "Abtrag", "optionen": [
             {"k": "OB 20 lagern", "t": "Oberboden 20 cm abtragen, seitlich lagern", "teile": [["002.01.003.01001", 1.0]], "std": True},
             {"k": "OB 30 lagern", "t": "Oberboden 30 cm abtragen, seitlich lagern", "teile": [["002.01.003.02001", 1.0]], "std": True},
             {"k": "OB 20 abfahren", "t": "Oberboden 20 cm abtragen und abfahren", "teile": [["002.01.004.01001", 1.0]], "std": True},
             {"k": "OB 30 abfahren", "t": "Oberboden 30 cm abtragen und abfahren", "teile": [["002.01.004.02001", 1.0]], "std": True}]},
         {"name": "Wiederandecken", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "50 % andecken", "t": "50 % der Fläche nach Bauende aus Miete wieder andecken, 20 cm", "teile": [["002.01.005.01001", 0.5]], "std": True},
             {"k": "100 % andecken", "t": "gesamte Fläche aus Miete wieder andecken, 30 cm", "teile": [["002.01.005.02001", 1.0]]}]},
         {"name": "Deklaration", "optionen": [
             {"k": "", "t": "", "teile": []},
             {"k": "mit Bodenprobe", "t": "Bodenprobe und Deklarationsanalyse, 1 je 500 m²", "teile": [["002.02.008.01001", 0.002]], "std": True},
             {"k": "Probe + Vermessung", "t": "Bodenprobe 1 je 500 m², Absteckung/Schnurgerüst anteilig 1 je 400 m²", "teile": [["002.02.008.01001", 0.002], ["002.04.012.01001", 0.0025]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "311.06", "kg": "311", "name": "Baugrube ohne Keller je m²", "einheit": "m²",
     "lang": "Flache Baugrube für ein nicht unterkellertes Gebäude (Bodenplatte auf Gelände): Oberboden abtragen, Aushub bis Gründungsebene, "
             "Boden abfahren, Planum herstellen.",
     "bezug": "Gebäudegrundfläche zzgl. 0,5 m Arbeitsraum umlaufend",
     "schichten": [
         {"name": "Oberboden", "optionen": [
             {"k": "OB 20 lagern", "t": "Oberboden 20 cm abtragen und seitlich lagern", "teile": [["002.01.003.01001", 1.0]], "std": True},
             {"k": "OB 30 abfahren", "t": "Oberboden 30 cm abtragen und abfahren", "teile": [["002.01.004.02001", 1.0]], "std": True},
             {"k": "ohne Oberboden", "t": "kein Oberboden", "teile": []}]},
         {"name": "Aushub", "optionen": [
             {"k": "0,5 m B1", "t": "Aushub 0,5 m, B1, direkt abfahren Z0", "teile": [["002.02.002.01001", 0.55]], "std": True},
             {"k": "0,8 m B1", "t": "Aushub 0,8 m, B1, direkt abfahren Z0", "teile": [["002.02.002.01001", 0.9]], "std": True},
             {"k": "0,8 m B2", "t": "Aushub 0,8 m, B2, direkt abfahren Z0", "teile": [["002.02.002.02001", 0.9]], "std": True},
             {"k": "1,2 m B1", "t": "Aushub 1,2 m (Bodenaustausch vorgesehen), B1, Z0", "teile": [["002.02.002.01001", 1.3]]}]},
         {"name": "Planum", "optionen": [
             {"k": "Planum ±3 cm", "t": "Planum ±3 cm, DPr 97 %", "teile": [["002.03.001.01001", 1.0]], "std": True},
             {"k": "Planum ±2 cm, PDV", "t": "Planum ±2 cm, Plattendruckversuch 1 je 300 m²", "teile": [["002.03.001.02001", 1.0], ["002.03.007.01001", 0.0033]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "311.07", "kg": "311", "name": "Aushub im Bestand, beengt", "einheit": "m³",
     "lang": "Aushub bei beengten Verhältnissen im Bestand (Kellerabsenkung, Anbau, Hofbereich) von Hand bzw. mit Minibagger und Dumper, "
             "Boden über Container oder Big Bags entsorgen.",
     "bezug": "Aushubvolumen im Abtrag (fest)",
     "schichten": [
         {"name": "Lösen", "optionen": [
             {"k": "Handaushub", "t": "Handaushub B1", "teile": [["002.02.006.01001", 1.0]], "std": True},
             {"k": "Minibagger", "t": "Minibagger bis 3 t mit Fahrer und Kettendumper, ca. 0,35 h/m³", "teile": [["091.36.001.01001", 0.35], ["091.36.004.01001", 0.35]], "std": True},
             {"k": "Mobilbagger", "t": "Mobilbagger 14–18 t mit Fahrer, ca. 0,12 h/m³", "teile": [["091.36.002.01001", 0.12]]}]},
         {"name": "Entsorgung", "optionen": [
             {"k": "Container Z0", "t": "Absetzcontainer 10 m³ (1,3 m³ lose je m³), Boden BM-0 entsorgen", "teile": [["087.05.001.04001", 0.13], ["087.03.001.01001", 1.8]], "std": True},
             {"k": "Container Z1.1", "t": "Absetzcontainer 10 m³, Boden BM-F0*/Z1.1 entsorgen", "teile": [["087.05.001.04001", 0.13], ["087.03.001.03001", 1.8]], "std": True},
             {"k": "Big Bag Z0", "t": "Big Bags 1 m³ mit Kranabholung, Boden BM-0 entsorgen", "teile": [["087.05.001.09001", 1.3], ["087.03.001.01001", 1.8]], "std": True}]},
         {"name": "Leitungssuche", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Suchschachtung", "t": "Suchschachtung von Hand nach Leitungen, 1 je 10 m³", "teile": [["002.04.001.01001", 0.1]], "std": True}]},
     ], "tags": ["altbau"]},

    # ---------------------------------------------------------------- 312 Umschließung
    {"id": "312.01", "kg": "312", "name": "Trägerbohlwand (Berliner Verbau)", "einheit": "m²",
     "lang": "Baugrubenverbau als Trägerbohlwand: Stahlträger einbringen, Ausfachung abschnittsweise mit dem Aushub, nach Wahl rückgebaut oder verbleibend, "
             "mit Rückverankerung oder Aussteifung und anteiliger Baustelleneinrichtung des Spezialtiefbaus.",
     "bezug": "Ansichtsfläche der Verbauwand (Länge × Verbautiefe)",
     "schichten": [
         {"name": "Verbau", "optionen": [
             {"k": "Holz ≤4 m, rück", "t": "Holzausfachung, Verbautiefe bis 4 m, Träger gezogen", "teile": [["006.01.002.01001", 1.0]], "std": True},
             {"k": "Holz ≤6 m, rück", "t": "Holzausfachung, Verbautiefe bis 6 m, Träger gezogen", "teile": [["006.01.002.02001", 1.0]], "std": True},
             {"k": "Holz verbleibt", "t": "Holzbohlen, bis 4 m, Verbau verbleibt", "teile": [["006.03.001.01001", 1.0]]},
             {"k": "StB-FT-Platten", "t": "Ausfachung Stahlbeton-Fertigteilplatten, verbleibt", "teile": [["006.03.001.02001", 1.0]]},
             {"k": "Spritzbeton", "t": "Ausfachung Spritzbeton 15 cm bewehrt", "teile": [["006.03.001.03001", 1.0]], "std": True}]},
         {"name": "Rückhaltung", "optionen": [
             {"k": "", "t": "frei auskragend", "teile": [], "std": True},
             {"k": "verankert", "t": "Verpressanker Kurzzeit 12 m, 1 je 12,5 m²", "teile": [["006.03.004.01001", 0.08]], "std": True},
             {"k": "ausgesteift", "t": "Gurtung und Aussteifung Stahl, ca. 20 kg/m²", "teile": [["006.03.005.01001", 0.02]]}]},
         {"name": "Baustelleneinrichtung", "optionen": [
             {"k": "BE /300 m²", "t": "BE Spezialtiefbau anteilig bei 300 m² Verbaufläche", "teile": [["006.01.001.01001", 0.0033]], "std": True},
             {"k": "BE /100 m²", "t": "BE Spezialtiefbau anteilig bei 100 m² Verbaufläche", "teile": [["006.01.001.01001", 0.01]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "312.02", "kg": "312", "name": "Spundwand", "einheit": "m²",
     "lang": "Baugrubenumschließung aus Stahlspundbohlen, eingerammt bzw. eingerüttelt, rückgebaut oder verbleibend, mit Gurtung/Ankern nach Statik "
             "und anteiliger Baustelleneinrichtung.",
     "bezug": "Ansichtsfläche der Spundwand (Länge × Einbindetiefe)",
     "schichten": [
         {"name": "Spundwand", "optionen": [
             {"k": "Profil n. Statik", "t": "Stahlspundwand, Profil nach Statik, gezogen", "teile": [["006.01.003.01001", 1.0]], "std": True},
             {"k": "AZ 13 verbleibt", "t": "Spundwand AZ 13, verbleibt", "teile": [["006.03.002.01001", 1.0]], "std": True},
             {"k": "AZ 18 verbleibt", "t": "Spundwand AZ 18, verbleibt", "teile": [["006.03.002.02001", 1.0]], "std": True},
             {"k": "AZ 26 verbleibt", "t": "Spundwand AZ 26, verbleibt", "teile": [["006.03.002.03001", 1.0]]}]},
         {"name": "Rückhaltung", "optionen": [
             {"k": "", "t": "frei auskragend", "teile": [], "std": True},
             {"k": "Gurt + Steifen", "t": "Gurtung und Aussteifung Stahl, ca. 25 kg/m²", "teile": [["006.03.005.01001", 0.025]], "std": True},
             {"k": "Gurt + Anker", "t": "Gurtung 15 kg/m², Verpressanker 18 m, 1 je 12,5 m²", "teile": [["006.03.005.01001", 0.015], ["006.03.004.02001", 0.08]]}]},
         {"name": "Baustelleneinrichtung", "optionen": [
             {"k": "BE /300 m²", "t": "BE Rammgerät anteilig bei 300 m²", "teile": [["006.01.001.02001", 0.0033]], "std": True},
             {"k": "BE /150 m²", "t": "BE Rammgerät anteilig bei 150 m²", "teile": [["006.01.001.02001", 0.0067]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "312.03", "kg": "312", "name": "Bohrpfahlwand", "einheit": "m²",
     "lang": "Baugrubenwand aus Bohrpfählen (aufgelöst, tangierend oder überschnitten) bis 8 m, bei Bedarf rückverankert, mit anteiliger BE des Großbohrgeräts.",
     "bezug": "Ansichtsfläche der Pfahlwand",
     "schichten": [
         {"name": "Pfahlwand", "optionen": [
             {"k": "aufgelöst Ø620", "t": "aufgelöste Bohrpfahlwand Ø 620 mm", "teile": [["006.03.008.01001", 1.0]], "std": True},
             {"k": "tangierend Ø620", "t": "tangierende Bohrpfahlwand Ø 620 mm", "teile": [["006.03.008.02001", 1.0]], "std": True},
             {"k": "überschn. Ø880", "t": "überschnittene, wasserdichte Bohrpfahlwand Ø 880 mm", "teile": [["006.03.008.03001", 1.0]], "std": True}]},
         {"name": "Rückverankerung", "optionen": [
             {"k": "", "t": "ohne Anker", "teile": [], "std": True},
             {"k": "Kurzzeitanker", "t": "Verpressanker Litze 18 m, 1 je 12 m²", "teile": [["006.03.004.02001", 0.083]], "std": True},
             {"k": "Daueranker", "t": "Daueranker Stab 12 m, 1 je 12 m²", "teile": [["006.03.004.03001", 0.083]]}]},
         {"name": "Baustelleneinrichtung", "optionen": [
             {"k": "BE /400 m²", "t": "BE Großbohrgerät anteilig bei 400 m²", "teile": [["006.01.001.03001", 0.0025]], "std": True},
             {"k": "BE /200 m²", "t": "BE Großbohrgerät anteilig bei 200 m²", "teile": [["006.01.001.03001", 0.005]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "312.04", "kg": "312", "name": "Schlitzwand", "einheit": "m²",
     "lang": "Baugrubenumschließung als Schlitzwand bis 12 m Tiefe, wasserundurchlässig, mit Rückverankerung nach Statik und anteiliger BE.",
     "bezug": "Ansichtsfläche der Schlitzwand",
     "schichten": [
         {"name": "Schlitzwand", "optionen": [
             {"k": "d = 60 cm", "t": "Schlitzwand d = 60 cm", "teile": [["006.03.009.01001", 1.0]], "std": True},
             {"k": "d = 80 cm", "t": "Schlitzwand d = 80 cm", "teile": [["006.03.009.02001", 1.0]], "std": True},
             {"k": "d = 100 cm", "t": "Schlitzwand d = 100 cm", "teile": [["006.03.009.03001", 1.0]], "std": True}]},
         {"name": "Rückverankerung", "optionen": [
             {"k": "", "t": "ohne Anker (ausgesteift über Decken)", "teile": [], "std": True},
             {"k": "Kurzzeitanker", "t": "Verpressanker Litze 18 m, 1 je 15 m²", "teile": [["006.03.004.02001", 0.067]], "std": True},
             {"k": "Daueranker", "t": "Daueranker Stab 18 m, 1 je 15 m²", "teile": [["006.03.004.04001", 0.067]]}]},
         {"name": "Baustelleneinrichtung", "optionen": [
             {"k": "BE /500 m²", "t": "BE Großgerät anteilig bei 500 m²", "teile": [["006.04.006.03001", 0.002]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "312.05", "kg": "312", "name": "Spritzbeton-/Nagelwand", "einheit": "m²",
     "lang": "Baugrubensicherung als bewehrte Spritzbetonschale, abschnittsweise mit dem Aushub, mit Bodenvernagelung nach Statik.",
     "bezug": "Abgewickelte Fläche der gesicherten Baugrubenwand",
     "schichten": [
         {"name": "Spritzbeton", "optionen": [
             {"k": "SpB 10 cm", "t": "Spritzbeton 10 cm mit Q188", "teile": [["006.03.006.01001", 1.0]], "std": True},
             {"k": "SpB 15 cm", "t": "Spritzbeton 15 cm mit Q257", "teile": [["006.03.006.02001", 1.0]], "std": True},
             {"k": "SpB 20 cm", "t": "Spritzbeton 20 cm, zweilagig bewehrt", "teile": [["006.03.006.03001", 1.0]], "std": True}]},
         {"name": "Vernagelung", "optionen": [
             {"k": "", "t": "ohne Nägel (Böschungssicherung)", "teile": []},
             {"k": "Nägel 4 m", "t": "Bodennägel 4 m, Raster 1,5 × 1,5 m", "teile": [["006.03.007.01001", 0.44]], "std": True},
             {"k": "Nägel 6 m", "t": "Bodennägel 6 m, Raster 1,5 × 1,5 m", "teile": [["006.03.007.02001", 0.44]], "std": True},
             {"k": "Nägel 9 m", "t": "Bodennägel 9 m, 1 je 2,5 m²", "teile": [["006.03.007.03001", 0.4]]}]},
         {"name": "Baustelleneinrichtung", "optionen": [
             {"k": "BE /200 m²", "t": "Ankerbohrgerät An-/Abtransport anteilig bei 200 m²", "teile": [["006.04.006.02001", 0.005]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "312.06", "kg": "312", "name": "Grabenverbau", "einheit": "m²",
     "lang": "Verbau von Fundament-, Leitungs- und Schachtgräben bis 4 m mit Verbaugeräten oder Kanaldielen, einbauen, vorhalten, rückbauen.",
     "bezug": "Verbaute Wandfläche (beidseitig)",
     "schichten": [
         {"name": "Verbauart", "optionen": [
             {"k": "Verbauplatten", "t": "Grabenverbaugeräte (Platten), bis 4 m", "teile": [["006.03.003.01001", 1.0]], "std": True},
             {"k": "Kanaldielen", "t": "Kanaldielenverbau, bis 4 m", "teile": [["006.03.003.02001", 1.0]], "std": True},
             {"k": "Gleitschienen", "t": "Gleitschienenverbau, bis 4 m", "teile": [["006.03.003.03001", 1.0]], "std": True}]},
         {"name": "Zusatz", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Böschung oben", "t": "oberen Grabenrand abböschen und sichern, 0,3 m² je m²", "teile": [["002.04.002.01001", 0.3]], "std": True}]},
     ], "tags": ["neubau", "altbau"]},

    {"id": "312.07", "kg": "312", "name": "Unterfangung Nachbarfundament", "einheit": "m",
     "lang": "Unterfangung bestehender Fundamente an der Baugrubengrenze, abschnittsweise in Beton oder im Düsenstrahlverfahren, "
             "mit Beweissicherung und Rissüberwachung am Nachbargebäude.",
     "bezug": "Länge der unterfangenen Fundamente",
     "schichten": [
         {"name": "Unterfangung", "optionen": [
             {"k": "Beton ≤1,0 m", "t": "abschnittsweise Betonunterfangung, Tiefe bis 1,0 m", "teile": [["013.10.003.01001", 1.0]], "std": True},
             {"k": "Beton ≤1,5 m", "t": "abschnittsweise Betonunterfangung, Tiefe bis 1,5 m", "teile": [["013.10.003.02001", 1.0]], "std": True},
             {"k": "Beton ≤2,0 m", "t": "abschnittsweise Betonunterfangung, Tiefe bis 2,0 m", "teile": [["006.03.011.02001", 1.0]], "std": True},
             {"k": "HDI 1,5 m³/m", "t": "Düsenstrahlunterfangung, ca. 1,5 m³ je m", "teile": [["006.01.005.01001", 1.5]], "std": True}]},
         {"name": "Überwachung", "optionen": [
             {"k": "", "t": "", "teile": []},
             {"k": "Beweissicherung", "t": "Beweissicherung Nachbargebäude, 1 Gebäude je 20 m", "teile": [["099.01.001.01001", 0.05]], "std": True},
             {"k": "Beweis. + Risse", "t": "Beweissicherung 1 je 20 m und Rissmonitore 1 je 5 m", "teile": [["099.01.001.01001", 0.05], ["099.01.002.01001", 0.2]], "std": True},
             {"k": "+ Erschütterung", "t": "Beweissicherung, Rissmonitore, Erschütterungsmessung 4 Wo je 20 m",
              "teile": [["099.01.001.01001", 0.05], ["099.01.002.01001", 0.2], ["099.01.003.01001", 0.2]], "std": True}]},
     ], "tags": ["altbau", "neubau"]},

    {"id": "312.08", "kg": "312", "name": "Böschungssicherung", "einheit": "m²",
     "lang": "Baugrubenböschung abflachen und gegen Witterung und Erosion schützen (Folie, Gewebeplane oder Spritzbeton).",
     "bezug": "Böschungsfläche (abgewickelt)",
     "schichten": [
         {"name": "Böschung", "optionen": [
             {"k": "Neigung 45°", "t": "Böschung abflachen, Neigung 45°", "teile": [["002.04.002.01001", 1.0]], "std": True},
             {"k": "Neigung 60°", "t": "Böschung abflachen, Neigung 60°", "teile": [["002.04.002.02001", 1.0]], "std": True},
             {"k": "", "t": "", "teile": []}]},
         {"name": "Schutz", "optionen": [
             {"k": "PE-Folie", "t": "Abdeckung PE-Folie, beschwert", "teile": [["098.02.004.01001", 1.0]], "std": True},
             {"k": "Gewebeplane", "t": "Abdeckung Gewebeplane, gesichert", "teile": [["098.02.004.02001", 1.0]], "std": True},
             {"k": "Spritzbeton 10", "t": "Spritzbeton 10 cm mit Matte", "teile": [["006.03.006.01001", 1.0]]},
             {"k": "Ansaat", "t": "Rasenansaat mit Erosionsschutzmatte (dauerhafte Böschung)", "teile": [["002.04.010.01001", 1.0]]}]},
         {"name": "Unterhalt", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Erneuerung 50 %", "t": "Abdeckung zu 50 % erneuern (lange Standzeit)", "teile": [["098.02.004.02001", 0.5]], "std": True}]},
     ], "tags": ["neubau"]},

    # ---------------------------------------------------------------- 313 Wasserhaltung
    {"id": "313.01", "kg": "313", "name": "Offene Wasserhaltung", "einheit": "psch",
     "lang": "Offene Wasserhaltung für eine Baugrube bis ca. 300 m² Sohle: Einrichten und Räumen, Pumpensümpfe, Tauchpumpenbetrieb, "
             "Ableitung über Absetzbecken.",
     "bezug": "Pauschal je Baugrube (Annahme: 2–4 Pumpensümpfe, Ableitung 50 m)",
     "fest": [["008.01.001.01001", 1.0]],
     "schichten": [
         {"name": "Pumpensümpfe", "optionen": [
             {"k": "2 Sümpfe Filter", "t": "2 Pumpensümpfe Kunststoff-Filterrohr DN 300", "teile": [["008.03.001.03001", 2.0]], "std": True},
             {"k": "2 Sümpfe DN 1000", "t": "2 Pumpensümpfe Betonring DN 1000", "teile": [["008.03.001.02001", 2.0]], "std": True},
             {"k": "4 Sümpfe 1,5 m", "t": "4 Pumpensümpfe bis 1,5 m mit Filterrohr", "teile": [["008.01.002.01001", 4.0]], "std": True}]},
         {"name": "Pumpenbetrieb", "optionen": [
             {"k": "30 Tage", "t": "2 Tauchpumpen Klarwasser, je 30 Tage", "teile": [["008.03.002.02001", 60.0]], "std": True},
             {"k": "60 Tage", "t": "2 Tauchpumpen Klarwasser, je 60 Tage", "teile": [["008.03.002.02001", 120.0]], "std": True},
             {"k": "90 Tage", "t": "2 Tauchpumpen Klarwasser, je 90 Tage", "teile": [["008.03.002.02001", 180.0]], "std": True},
             {"k": "60 T. Schmutzw.", "t": "2 Schmutzwasserpumpen, je 60 Tage", "teile": [["008.03.002.01001", 120.0]]}]},
         {"name": "Ableitung", "optionen": [
             {"k": "Schlauch", "t": "Ableitung Feuerwehrschlauch 50 m", "teile": [["008.03.005.01001", 50.0]], "std": True},
             {"k": "PE + Absetzbecken", "t": "PE-Druckleitung DN 100 50 m, Absetzcontainer 10 m³ 8 Wochen",
              "teile": [["008.03.005.02001", 50.0], ["008.03.003.01001", 8.0]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "313.02", "kg": "313", "name": "GW-Absenkung Vakuumlanzen", "einheit": "m",
     "lang": "Grundwasserabsenkung mit Vakuum-Wellpointanlage entlang der Baugrube: Einrichten und Räumen, Lanzen im Abstand ca. 1,25 m, "
             "Betrieb der Absenkanlage und Ableitung.",
     "bezug": "Länge der Sammelleitung (≈ Baugrubenumfang); Betrieb bezogen auf rd. 60 m Umfang",
     "fest": [["008.02.001.01001", 1.0]],
     "schichten": [
         {"name": "Lanzen", "optionen": [
             {"k": "Lanzen 6 m", "t": "Vakuumlanzen bis 6 m, Abstand 1,25 m", "teile": [["008.04.003.01001", 0.8]], "std": True},
             {"k": "Lanzen 8 m", "t": "Vakuumlanzen bis 8 m, Abstand 1,25 m", "teile": [["008.04.003.02001", 0.8]], "std": True}]},
         {"name": "Betrieb", "optionen": [
             {"k": "30 Tage", "t": "Absenkanlage bis 50 Lanzen, 30 Tage", "teile": [["008.04.004.01001", 0.5]], "std": True},
             {"k": "60 Tage", "t": "Absenkanlage bis 50 Lanzen, 60 Tage", "teile": [["008.04.004.01001", 1.0]], "std": True},
             {"k": "90 Tage", "t": "Absenkanlage bis 50 Lanzen, 90 Tage", "teile": [["008.04.004.01001", 1.5]], "std": True}]},
         {"name": "Ableitung", "optionen": [
             {"k": "Absetzbecken", "t": "PE-Leitung 0,5 m/m, Absetzbecken 8 Wochen anteilig", "teile": [["008.03.005.02001", 0.5], ["008.03.003.01001", 0.13]], "std": True},
             {"k": "+ Einleitgebühr", "t": "Absetzbecken, Einleitung in Regenwasserkanal ca. 100 m³ je m",
              "teile": [["008.03.005.02001", 0.5], ["008.03.003.01001", 0.13], ["008.03.006.01001", 100.0]], "std": True},
             {"k": "Gewässer + Monit.", "t": "Einleitung in Gewässer mit Erlaubnis, Monitoring 2 Monate anteilig",
              "teile": [["008.03.005.02001", 0.5], ["008.03.006.03001", 200.0], ["008.04.007.03001", 0.033]]}]},
     ], "tags": ["neubau"]},

    {"id": "313.03", "kg": "313", "name": "GW-Absenkung Brunnen", "einheit": "St",
     "lang": "Grundwasserabsenkung über Bohrbrunnen: Brunnen herstellen, Brunnenpumpe betreiben, nach Gebrauch rückbauen und verfüllen; "
             "optional Messstelle und Monitoring anteilig.",
     "bezug": "Anzahl der Brunnen",
     "schichten": [
         {"name": "Brunnen", "optionen": [
             {"k": "DN 300 ≤8 m", "t": "Bohrbrunnen DN 300 bis 8 m, Rückbau", "teile": [["008.04.001.01001", 1.0], ["008.04.005.01001", 1.0]], "std": True},
             {"k": "DN 300 ≤15 m", "t": "Bohrbrunnen DN 300 bis 15 m, Rückbau", "teile": [["008.04.001.02001", 1.0], ["008.04.005.01001", 1.0]], "std": True},
             {"k": "DN 400 ≤20 m", "t": "Tiefbrunnen DN 400 bis 20 m, Rückbau", "teile": [["008.04.001.03001", 1.0], ["008.04.005.02001", 1.0]], "std": True},
             {"k": "DN 400 ≤30 m", "t": "Tiefbrunnen DN 400 bis 30 m, Rückbau", "teile": [["008.04.001.04001", 1.0], ["008.04.005.02001", 1.0]]}]},
         {"name": "Betrieb", "optionen": [
             {"k": "60 T. 30 m³/h", "t": "Brunnenpumpe bis 30 m³/h, 60 Tage", "teile": [["008.04.002.02001", 60.0]], "std": True},
             {"k": "120 T. 30 m³/h", "t": "Brunnenpumpe bis 30 m³/h, 120 Tage", "teile": [["008.04.002.02001", 120.0]], "std": True},
             {"k": "90 T. 60 m³/h", "t": "Brunnenpumpe bis 60 m³/h, 90 Tage", "teile": [["008.04.002.03001", 90.0]]}]},
         {"name": "Monitoring", "optionen": [
             {"k": "", "t": "", "teile": []},
             {"k": "Messstelle anteil.", "t": "GW-Messstelle je 2 Brunnen, Datenlogger 3 Monate", "teile": [["008.04.006.01001", 0.5], ["008.04.006.02001", 1.5]], "std": True},
             {"k": "+ Wasserrecht", "t": "Messstelle anteilig, Monitoring 3 Monate und Wasseranalyse je 4 Brunnen",
              "teile": [["008.04.006.01001", 0.5], ["008.04.006.02001", 1.5], ["008.04.007.03001", 0.75], ["008.04.007.02001", 0.25]], "std": True}]},
     ], "tags": ["neubau"]},

    {"id": "313.04", "kg": "313", "name": "Wasserrecht und GW-Monitoring", "einheit": "psch",
     "lang": "Wasserrechtliche Erlaubnis für Grundwasserentnahme und Einleitung: Antragsunterlagen, Wasseranalysen, Messstellen und laufendes Monitoring.",
     "bezug": "Pauschal je Baumaßnahme",
     "fest": [["008.04.007.01001", 1.0]],
     "schichten": [
         {"name": "Messstellen", "optionen": [
             {"k": "2 Messstellen", "t": "2 Grundwassermessstellen bis 10 m mit Einmessung", "teile": [["008.04.006.01001", 2.0]], "std": True},
             {"k": "4 Messstellen", "t": "4 Grundwassermessstellen bis 10 m mit Einmessung", "teile": [["008.04.006.01001", 4.0]], "std": True}]},
         {"name": "Monitoring", "optionen": [
             {"k": "3 Monate", "t": "Monitoring und Datenlogger 3 Monate, 2 Analysen", "teile": [["008.04.007.03001", 3.0], ["008.04.006.02001", 6.0], ["008.04.007.02001", 2.0]], "std": True},
             {"k": "6 Monate", "t": "Monitoring und Datenlogger 6 Monate, 3 Analysen", "teile": [["008.04.007.03001", 6.0], ["008.04.006.02001", 12.0], ["008.04.007.02001", 3.0]], "std": True},
             {"k": "12 Monate", "t": "Monitoring und Datenlogger 12 Monate, 4 Analysen", "teile": [["008.04.007.03001", 12.0], ["008.04.006.02001", 24.0], ["008.04.007.02001", 4.0]], "std": True}]},
         {"name": "Behandlung", "optionen": [
             {"k": "", "t": "", "teile": [], "std": True},
             {"k": "Neutralisation", "t": "Neutralisation Baugrubenwasser 8 Wochen", "teile": [["008.03.004.01001", 8.0]], "std": True}]},
     ], "tags": ["neubau"]},
]
