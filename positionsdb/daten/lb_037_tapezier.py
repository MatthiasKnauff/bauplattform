# LB 037 Tapezierarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)

LBS = [{
    "nr": "037", "name": "Tapezierarbeiten", "atv": "DIN 18366", "lohn": "maler",
    "gruppen": [
        {"name": "Vorarbeiten", "positionen": [
            {"kurz": "Alte Tapete entfernen, {art}",
             "lang": "Vorhandene Wandbekleidung {art} restlos entfernen, Untergrund abwaschen, Material zur "
                     "Sammelstelle auf der Baustelle. Abrechnung nach Fläche.",
             "einheit": "m²", "kg": "345", "gen": "B", "tags": ["altbau"],
             "varianten": [{"art": "einlagig, nassabziehbar", "h": 0.12, "mat": 0.2},
                           {"art": "mehrlagig bzw. überstrichen, mit Perforieren und Dampfgerät", "h": 0.25, "mat": 0.3, "geraet": 0.4}]},
            {"kurz": "Makulatur bzw. Grundierung für Tapezierung",
             "lang": "Untergrund für Tapezierung vorbereiten: Grundierung bzw. Makulatur vollflächig auftragen, "
                     "kleinere Unebenheiten beispachteln.",
             "einheit": "m²", "kg": "345", "h": 0.05, "mat": 0.6, "gen": "A"},
        ]},
        {"name": "Wandbekleidungen", "positionen": [
            {"kurz": "{art} tapezieren, {ort}",
             "lang": "{art} nach DIN EN 15102 {ort} auf Stoß tapezieren, Kleister nach Herstellerangabe, "
                     "Anschlüsse sauber geschnitten. Anstrich gesondert. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "345", "gen": "A",
             "varianten": [{"art": "Raufasertapete mittlere Körnung", "ort": "an Wänden", "h": 0.14, "mat": 1.2},
                           {"art": "Raufasertapete mittlere Körnung", "ort": "an Decken", "h": 0.18, "mat": 1.2, "kg": "353"},
                           {"art": "Malervlies glatt 130 g/m², überstreichbar", "ort": "an Wänden", "h": 0.13, "mat": 2.0},
                           {"art": "Malervlies glatt 130 g/m², überstreichbar", "ort": "an Decken", "h": 0.17, "mat": 2.0, "kg": "353"},
                           {"art": "Glasgewebe (Struktur Kette/Rhombus), überstreichbar", "ort": "an Wänden", "h": 0.18, "mat": 3.2},
                           {"art": "Renoviervlies rissüberbrückend", "ort": "an Wänden und Decken", "h": 0.15, "mat": 2.4}]},
            {"kurz": "Mustertapete/Designtapete mit Rapport, Material bis {m} €/m²",
             "lang": "Vlies-Mustertapete mit Rapport, Materialpreis bis {m} €/m² (im Ansatz enthalten), im "
                     "Wandklebeverfahren musterpassend tapeziert. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "345", "gen": "C",
             "varianten": [{"m": "15", "h": 0.25, "mat": 19}, {"m": "40", "h": 0.30, "mat": 47}]},
            {"kurz": "Wandbekleidung Fototapete/Digitaldruck, nach Vorlage",
             "lang": "Digitaldruck-Wandbekleidung auf Vlies nach Kundenvorlage, Bahnen nummeriert, im "
                     "Wandklebeverfahren auf Stoß tapeziert, Material bis 35 €/m² enthalten.",
             "einheit": "m²", "kg": "345", "h": 0.35, "mat": 40, "gen": "C"},
            {"kurz": "Akustik-/Dämmtapete bzw. Thermovlies, d = {d} mm",
             "lang": "Dämm- bzw. Thermovlies als Wandbekleidung, Dicke {d} mm, mit Spezialkleber vollflächig "
                     "geklebt, für spätere Tapezierung bzw. Anstrich (gesondert).",
             "einheit": "m²", "kg": "345", "gen": "B",
             "varianten": [{"d": "4", "h": 0.18, "mat": 7}, {"d": "10", "h": 0.22, "mat": 16}]},
            {"kurz": "Aufpreis Tapezierung: {art}",
             "lang": "Aufpreis zu den Tapezierpositionen für {art}.",
             "einheit": "m²", "kg": "345", "gen": "B",
             "varianten": [{"art": "Dachschrägen, Gauben und kleinteilige Flächen", "h": 0.06, "mat": 0},
                           {"art": "Treppenhäuser über 3,5 m Arbeitshöhe mit Gerüst", "h": 0.06, "mat": 0, "geraet": 0.6}]},
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

TP_UG = [{}, {"k": "auf GK", "t": "Untergrund gespachtelte Gipsplatten, mit Sperrgrund vorbehandelt.", "mat": 0.3},
         {"k": "auf Beton", "t": "Untergrund Betonflächen, Poren und Lunker vorher gespachtelt (gesondert), Grundierung.", "fh": 1.08, "mat": 0.4},
         {"k": "auf Altanstrich", "t": "Untergrund tragfähiger Altanstrich, angeraut und haftvermittelnd grundiert.", "fh": 1.08, "mat": 0.4, "tags": ["altbau"]}]
TP_ORT = [{}, {"k": "Bestand möbliert", "t": "Ausführung in genutzten bzw. möblierten Räumen einschließlich Abrücken und Abdecken.", "fh": 1.30, "gen": "B",
               "tags": ["altbau"]},
          {"k": "Treppenhaus/Kleinflächen", "t": "Treppenhäuser, Flure und Einzelflächen bis 10 m² mit vielen Ecken und Anschlüssen.", "fh": 1.20}]
TP_HOEHE = [{}, {"k": "H > 3,5 m", "t": "Arbeitshöhe über 3,50 m, Gerüst gesondert.", "fh": 1.15}]
TP_SCHICHT = [{}, {"k": "mehrlagig", "t": "Mehrere Tapetenlagen bzw. überstrichene Tapeten, mit Igelwalze perforiert und eingeweicht.", "fh": 1.60, "mat": 0.2},
              {"k": "Decke", "t": "Entfernen an Deckenflächen.", "fh": 1.25, "kg": "353"}]
_r2_setze([
    ("tapezieren, {ort}", [TP_UG, TP_ORT, TP_HOEHE]),
    ("Mustertapete", [TP_UG, TP_ORT, TP_HOEHE]),
    ("Fototapete", [TP_UG, TP_ORT]),
    ("Akustik-/Dämmtapete", [TP_UG, TP_ORT, TP_HOEHE]),
    ("Alte Tapete entfernen", [TP_SCHICHT, TP_ORT[:2]]),
    ("Makulatur", [TP_UG, TP_ORT, [{}, {"k": "Decke", "t": "An Deckenflächen.", "fh": 1.2, "kg": "353"}]]),
])
_r2_neu("Wandbekleidungen", [
    {"kurz": "{art_k} tapezieren, Material bis {m} €/m²", "einheit": "m²", "kg": "345", "gen": "B",
     "lang": "Wandbekleidung aus {art}, Materialpreis bis {m} €/m² im Ansatz enthalten, Bahnen auf Stoß bzw. nach Herstellerangabe "
             "verklebt, an Ecken und Anschlüssen sauber beschnitten.",
     "achsen": [TP_UG, TP_ORT, TP_HOEHE],
     "varianten": [{"art": "Textiltapete auf Papier- bzw. Vliesträger", "art_k": "Textiltapete", "m": "35", "h": 0.40, "mat": 40},
                   {"art": "Vinyltapete strapazierfähig (Objektbereich, abwaschbar)", "art_k": "Vinyltapete Objekt", "m": "18", "h": 0.28, "mat": 22},
                   {"art": "Metall- bzw. Effekttapete", "art_k": "Metall-/Effekttapete", "m": "45", "h": 0.45, "mat": 52},
                   {"art": "Korkwandbelag 3 mm", "art_k": "Korkwandbelag", "m": "25", "h": 0.40, "mat": 30},
                   {"art": "Naturtapete (Gras, Bast)", "art_k": "Naturtapete", "m": "55", "h": 0.50, "mat": 62}]},
    {"kurz": "Renoviervlies auf rissigem Untergrund, mit Anstrichvorbereitung", "einheit": "m²", "kg": "345", "gen": "A", "tags": ["altbau"],
     "lang": "Rissüberbrückendes Renoviervlies auf vorbereitetem, rissigem Altuntergrund vollflächig verklebt, Stöße überlappt geschnitten, "
             "als Untergrund für einen gesondert vergüteten Anstrich.",
     "h": 0.17, "mat": 2.2, "achsen": [TP_UG, TP_ORT, TP_HOEHE]},
    {"kurz": "Bordüre/Wandabschluss tapezieren, Breite bis {b} cm", "einheit": "m", "kg": "345", "gen": "B",
     "lang": "Bordüre bzw. Tapetenabschlussband bis {b} cm Breite waagerecht nach Schnurschlag verkleben.",
     "achsen": [TP_ORT[:2]],
     "varianten": [{"b": "10", "h": 0.06, "mat": 2.5}, {"b": "25", "h": 0.08, "mat": 5}]},
    {"kurz": "Glasgewebe/Malervlies Q4-Ersatz an Decken", "einheit": "m²", "kg": "353", "gen": "A",
     "lang": "Glattvlies bzw. feines Glasgewebe an Deckenflächen vollflächig verkleben als Ersatz für eine Spachtelung Q4, Anstrich gesondert.",
     "h": 0.19, "mat": 2.2, "achsen": [TP_UG, TP_ORT, TP_HOEHE]},
])
