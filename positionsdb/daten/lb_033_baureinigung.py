# LB 033 Baureinigungsarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "033", "name": "Baureinigungsarbeiten", "atv": "DIN 18299", "lohn": "reinigung",
    "gruppen": [
        {"name": "Bauendreinigung", "positionen": [
            {"kurz": "Grobreinigung Rohbau/Ausbau, je m² {bezug}",
             "lang": "Zwischen- bzw. Grobreinigung während der Bauzeit: Bauschutt, Verpackungen und Reste besenrein "
                     "aufnehmen und zum bauseitigen Container bringen, Böden besenrein. Abrechnung je m² {bezug} und "
                     "Reinigungsdurchgang.",
             "einheit": "m²", "kg": "397", "gen": "A",
             "varianten": [{"bezug": "Brutto-Grundfläche (BGF)", "h": 0.035, "mat": 0.10}]},
            {"kurz": "Bauendreinigung {art}, je m² Netto-Raumfläche",
             "lang": "Bauendreinigung vor Übergabe: Böden (Belagsart beachten), Türen, Zargen, Heizkörper, "
                     "Schalter, Sanitärobjekte und Fliesen reinigen, Rückstände von Farbe, Mörtel und Etiketten "
                     "entfernen, {art}. Fenster gesondert. Abrechnung je m² Netto-Raumfläche.",
             "einheit": "m²", "kg": "397", "gen": "B",
             "varianten": [{"art": "Wohnungsbau/Büro", "h": 0.10, "mat": 0.25},
                           {"art": "Sanitär- und Technikbereiche erhöht verschmutzt", "h": 0.16, "mat": 0.40},
                           {"art": "elastische Beläge mit Erstpflege (Einpflege)", "h": 0.14, "mat": 0.80}]},
            {"kurz": "Fensterreinigung beidseitig einschließlich Rahmen, {art}",
             "lang": "Glasflächen beidseitig einschließlich Rahmen, Falze und Fensterbänke reinigen, Aufkleber und "
                     "Schutzfolien entfernen, {art}. Abrechnung nach Glas-/Rahmenfläche (Ansichtsfläche).",
             "einheit": "m²", "kg": "397", "gen": "A",
             "varianten": [{"art": "erreichbar vom Boden bzw. von der Leiter", "h": 0.10, "mat": 0.10},
                           {"art": "mit Hubarbeitsbühne (Gerät enthalten)", "h": 0.14, "mat": 0.10, "geraet": 1.6}]},
            {"kurz": "Fassaden- und Glasdachreinigung nach Fertigstellung",
             "lang": "Reinigung von Metall- und Glasfassaden bzw. Glasdächern nach Fertigstellung mit geeigneten "
                     "Reinigungsmitteln, einschließlich Arbeitsbühne bzw. Seilzugangstechnik. Abrechnung nach "
                     "Ansichtsfläche.",
             "einheit": "m²", "kg": "397", "h": 0.12, "mat": 0.2, "geraet": 2.2, "gen": "C"},
            {"kurz": "Sonderreinigung: Zementschleier von Fliesen entfernen",
             "lang": "Zementschleier und Fugenmörtelreste von Fliesen- und Natursteinbelägen mit säurehaltigem bzw. "
                     "materialverträglichem Reiniger entfernen, nachwaschen, neutralisieren.",
             "einheit": "m²", "kg": "397", "h": 0.12, "mat": 0.6, "gen": "B"},
            {"kurz": "Reinigung Lüftungsauslässe/Leuchten nach Fertigstellung",
             "lang": "Leuchten, Lüftungsauslässe und Deckenauslässe innen und außen von Baustaub befreien und "
                     "feucht reinigen. Abrechnung je Stück.",
             "einheit": "St", "kg": "397", "h": 0.12, "mat": 0.1, "gen": "B"},
            {"kurz": "Stundenlohnarbeiten Reinigungskraft",
             "lang": "Reinigungsarbeiten im Stundenlohn auf Anordnung der Bauleitung, einschließlich Reinigungs"
                     "mittel und Gerät. Abrechnung nach bestätigten Stundenlohnzetteln.",
             "einheit": "h", "kg": "397", "h": 1.0, "mat": 1.0, "gen": "A"},
        ]},
    ],
}]


# ------------------------------------------------------------------ Runde 2: Ausführungsachsen und weitere Grundpositionen
def _r2_setze(regeln):
    for g in LBS[0]["gruppen"]:
        for p in g["positionen"]:
            if p.get("achsen"):
                continue
            for teil, ax in regeln:
                if teil in p["kurz"]:
                    p["achsen"] = ax
                    break


def _r2_neu(gruppe, positionen):
    for g in LBS[0]["gruppen"]:
        if g["name"] == gruppe:
            g["positionen"] += positionen
            return
    LBS[0]["gruppen"].append({"name": gruppe, "positionen": positionen})

RE_VERSCHM = [{}, {"k": "stark verschmutzt", "t": "Starke Verschmutzung durch Folgegewerke (Mörtel, Farbe, Klebstoff), zusätzlicher Arbeitsgang.", "fh": 1.45,
                   "fm": 1.3, "gen": "B"}]
RE_NUTZ = [{}, {"k": "Schule/Kita", "t": "Nutzung Schule/Kita: Reinigung auch von Einbauten, Garderoben und Sanitärobjekten in hoher Dichte.", "fh": 1.12},
           {"k": "Praxis/Labor", "t": "Nutzung Praxis/Labor bzw. Klinik: hygienische Endreinigung mit Desinfektion der Kontaktflächen.", "fh": 1.30, "fm": 1.8,
            "gen": "B"},
           {"k": "Halle/Lager", "t": "Hallen- und Lagerflächen mit großen zusammenhängenden Flächen, maschinelle Reinigung.", "fh": 0.70, "geraet": 0.15}]
RE_GLAS = [{}, {"k": "Rahmen mit Schutzfolie", "t": "Einschließlich Entfernen von Schutzfolien und Etiketten an Rahmen und Gläsern.", "fh": 1.30}]
RE_BEL = [{}, {"k": "textiler Belag", "t": "Bodenflächen mit textilem Belag: Sprühextraktion statt Nassreinigung.", "fh": 1.25, "geraet": 0.4},
          {"k": "Naturstein/Fliese", "t": "Bodenflächen mit Fliesen bzw. Naturstein, Zementschleier gesondert.", "fh": 1.08}]
_r2_setze([
    ("Bauendreinigung", [RE_VERSCHM, RE_NUTZ, RE_BEL]),
    ("Grobreinigung", [RE_VERSCHM, [{}, {"k": "mit Schuttabtransport", "t": "Einschließlich Abtransport des Kehrichts in bauseitige Container.", "fh": 1.15}]]),
    ("Fensterreinigung", [RE_GLAS, RE_VERSCHM]),
    ("Fassaden- und Glasdachreinigung", [RE_VERSCHM]),
    ("Zementschleier", [RE_VERSCHM]),
])
# Sanitär-/Technikbereiche und elastische Beläge mit Einpflege: keine Option „textiler Belag“
for _g in LBS[0]["gruppen"]:
    for _p in _g["positionen"]:
        if _p["kurz"].startswith("Bauendreinigung {art}"):
            for _v in _p.get("varianten") or []:
                if _v["art"].startswith(("Sanitär", "elastische")):
                    _v["achsen"] = [RE_VERSCHM, RE_NUTZ, [RE_BEL[0], RE_BEL[2]] if _v["art"].startswith("Sanitär") else [RE_BEL[0]]]

_r2_neu("Bauendreinigung", [
    {"kurz": "Zwischenreinigung während der Bauzeit, je {e}", "einheit": "m²", "kg": "397", "gen": "B",
     "lang": "Wiederkehrende Zwischenreinigung von Verkehrswegen, Treppenhäusern und fertiggestellten Bereichen während der Bauzeit, "
             "Abrechnung je m² gereinigter Fläche und {e}.",
     "achsen": [RE_VERSCHM],
     "varianten": [{"e": "Reinigungsgang (besenrein)", "h": 0.015, "mat": 0.02}, {"e": "Reinigungsgang (feucht gewischt)", "h": 0.03, "mat": 0.05}]},
    {"kurz": "Reinigung {art} nach Fertigstellung", "einheit": "St", "kg": "397", "gen": "A",
     "lang": "Endreinigung {art} einschließlich Entfernen von Etiketten, Schutzfolien und Kleberesten, Glanztrocknen.",
     "achsen": [RE_VERSCHM, RE_NUTZ[:3]],
     "varianten": [{"art": "Sanitärobjekt (WC, Waschtisch, Urinal)", "h": 0.20, "mat": 0.3}, {"art": "Dusche/Badewanne mit Abtrennung", "h": 0.45, "mat": 0.5},
                   {"art": "Heizkörper (innen und außen)", "h": 0.30, "mat": 0.2}, {"art": "Innentür mit Zarge", "h": 0.20, "mat": 0.1},
                   {"art": "Einbauküche bzw. Teeküche", "h": 1.5, "mat": 1.0}]},
    {"kurz": "Treppenhausreinigung nach Fertigstellung, je Geschoss", "einheit": "St", "kg": "397", "gen": "A",
     "lang": "Endreinigung eines Treppenhauses je Geschoss: Stufen, Podeste, Geländer, Handläufe, Fenster innen und Türen.",
     "h": 1.8, "mat": 1.5, "achsen": [RE_VERSCHM, RE_BEL]},
    {"kurz": "Grundreinigung beschichteter Boden/Tiefgarage maschinell", "einheit": "m²", "kg": "397", "gen": "A",
     "lang": "Maschinelle Grundreinigung beschichteter Bodenflächen bzw. Tiefgaragen mit Scheuersaugmaschine, Ecken von Hand.",
     "h": 0.02, "mat": 0.05, "geraet": 0.25, "achsen": [RE_VERSCHM]},
    {"kurz": "Außenanlagen kehren und Beläge reinigen nach Fertigstellung", "einheit": "m²", "kg": "597", "gen": "A",
     "lang": "Befestigte Außenflächen kehren, Zementschleier und Verschmutzungen entfernen, Rinnen und Abläufe reinigen.",
     "h": 0.03, "mat": 0.03, "geraet": 0.1, "achsen": [RE_VERSCHM]},
])
