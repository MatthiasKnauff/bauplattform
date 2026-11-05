# LB 012 Mauerarbeiten – eigene Texte und Kalkulationsansätze (Preisstand 11/2026)
# Felder je Position: kurz, lang (mit {Platzhaltern} aus den Varianten), einheit, kg (DIN 276), h (h/E), mat (Stoff €/E),
# optional geraet (€/E), gen (A|B|C), tags, hinweis, lohn (abweichendes Gewerk). Varianten überschreiben die Felder.


# Ausführungsachsen (Folgetexte): je Option kurz-Zusatz "k", Folgetext "t", Zeit-/Stofffaktor "fh"/"fm", Zuschläge "h"/"mat"/"geraet",
# optional "gen", "kg", "einheit", "lohn", "tags". Die erste Option ist meist die Grundausführung ohne Zusatz.
FLAECHE = [{}, {"k": "Teilflächen bis 5 m²", "t": "Ausführung in Einzelflächen bis 5 m², auch Pfeiler, Brüstungen und Wandstücke.", "fh": 1.35, "gen": "B"}]
ORT = [{}, {"k": "im Bestand", "t": "Ausführung im Bestand: Anschlüsse an vorhandene Bauteile, erschwerte Zugänglichkeit und Materialtransport von Hand.",
            "fh": 1.25, "fm": 1.05, "gen": "B", "tags": ["altbau"]},
       {"k": "Höhe über 3,5 m", "t": "Arbeitshöhe über 3,5 m über Standfläche, Arbeits- und Schutzgerüst wird gesondert vergütet.", "fh": 1.15}]
KS_FK = [{"ersetze": [[r"KS (\d+)-(\d,\d)", r"KS RDK \2"]], "k": "SFK 12", "t": "Steinfestigkeitsklasse 12.", "fm": 0.95}, {"k": "SFK 20", "t": "Steinfestigkeitsklasse 20."},
         {"k": "SFK 28", "t": "Steinfestigkeitsklasse 28.", "fm": 1.12}]
MOERTEL = [{"k": "Dünnbett", "t": "Vermauern im Dünnbettverfahren."}, {"k": "Normalmörtel", "t": "Vermauern in Normalmauermörtel M 10, Fugendicke 12 mm.", "fh": 1.18, "fm": 1.04}]

LBS = [{
    "nr": "012", "name": "Mauerarbeiten", "atv": "DIN 18330", "lohn": "rohbau",
    "gruppen": [
        {"name": "Vorarbeiten, Sperrschichten", "positionen": [
            {"kurz": "Kimmschicht aus Mauermörtel, Wanddicke {d} cm",
             "lang": "Kimmschicht als Ausgleichsschicht unter Plansteinmauerwerk herstellen, aus Normalmauermörtel M10, "
                     "höhen- und fluchtgerecht nach Nivellier abgezogen, Dicke im Mittel 2 cm. Wanddicke {d} cm. "
                     "Abrechnung nach Länge in Wandachse.",
             "einheit": "m", "kg": "331", "gen": "A",
             "varianten": [{"d": "11,5", "h": 0.12, "mat": 1.8}, {"d": "17,5", "h": 0.15, "mat": 2.6},
                           {"d": "24", "h": 0.18, "mat": 3.5}, {"d": "30", "h": 0.20, "mat": 4.3},
                           {"d": "36,5", "h": 0.22, "mat": 5.2}, {"d": "42,5", "h": 0.25, "mat": 6.0}]},
            {"kurz": "Horizontale Sperrschicht, Bitumen-Dachbahn, Breite bis {b} cm",
             "lang": "Horizontale Sperrschicht gegen aufsteigende Feuchtigkeit nach DIN 18533 unter Mauerwerk einlegen, "
                     "Bitumen-Dachbahn R 500, lose mit Überdeckung an den Stößen von mindestens 20 cm. Breite bis {b} cm.",
             "einheit": "m", "kg": "331", "gen": "A",
             "varianten": [{"b": "17,5", "h": 0.05, "mat": 1.2}, {"b": "30", "h": 0.06, "mat": 1.9}, {"b": "50", "h": 0.08, "mat": 3.0}]},
            {"kurz": "Mauersperrbahn mineralisch (Dichtschlämme) unter Mauerwerk",
             "lang": "Querschnittsabdichtung unter Mauerwerk aus mineralischer Dichtschlämme in zwei Arbeitsgängen, "
                     "Gesamtschichtdicke mindestens 2 mm, auf vorbereitetem Untergrund. Breite bis 36,5 cm.",
             "einheit": "m", "kg": "331", "h": 0.12, "mat": 4.5, "gen": "B"},
        ]},
        {"name": "Außenwände", "positionen": [
            {"kurz": "Außenwand Planziegel wärmedämmend, d = {d} cm, λ = {l}",
             "lang": "Tragendes Außenmauerwerk nach DIN EN 1996 aus wärmedämmenden Planhochlochziegeln mit integrierter "
                     "Dämmstofffüllung, Wanddicke {d} cm, Bemessungswert der Wärmeleitfähigkeit λ = {l} W/(mK), "
                     "Festigkeitsklasse nach Statik, in Dünnbettmörtel bzw. Mörtelpad, Stoßfugen verzahnt ohne Mörtel. "
                     "Einschließlich Anschlagsteine, Ergänzungs- und Passziegel. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "331", "gen": "B", "tags": ["neubau"],
             "achsen": [FLAECHE, ORT],
             "varianten": [{"d": "36,5", "l": "0,08", "h": 0.62, "mat": 78}, {"d": "42,5", "l": "0,07", "h": 0.70, "mat": 96},
                           {"d": "49", "l": "0,07", "h": 0.80, "mat": 118}]},
            {"kurz": "Außenwand Planziegel ungefüllt, d = {d} cm",
             "lang": "Tragendes Außenmauerwerk aus Planhochlochziegeln ohne Dämmstofffüllung, Wanddicke {d} cm, "
                     "Rohdichte- und Festigkeitsklasse nach Statik, im Dünnbettverfahren, Stoßfugen verzahnt. "
                     "Einschließlich Passziegel. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "331", "gen": "A",
             "achsen": [FLAECHE, ORT],
             "varianten": [{"d": "24", "h": 0.50, "mat": 44}, {"d": "30", "h": 0.56, "mat": 55}, {"d": "36,5", "h": 0.62, "mat": 66}]},
            {"kurz": "Außenwand Porenbeton-Plansteine PP{fk}, d = {d} cm",
             "lang": "Tragendes Außenmauerwerk aus Porenbeton-Plansteinen PP{fk}, Wanddicke {d} cm, in Dünnbettmörtel "
                     "mit Zahnkelle vollflächig vermörtelt, Stoßfugen mit Nut und Feder. Einschließlich Passstücke "
                     "schneiden. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "331", "gen": "A",
             "achsen": [FLAECHE, ORT],
             "varianten": [{"fk": "2-0,35", "d": "36,5", "h": 0.48, "mat": 62}, {"fk": "2-0,35", "d": "42,5", "h": 0.54, "mat": 74},
                           {"fk": "4-0,55", "d": "24", "h": 0.40, "mat": 38}, {"fk": "4-0,55", "d": "30", "h": 0.45, "mat": 47}]},
            {"kurz": "Außenwand Kalksand-Plansteine KS {fk}, d = {d} cm",
             "lang": "Tragendes Außenmauerwerk (Tragschale) aus Kalksand-Plansteinen bzw. -Planelementen KS {fk}, "
                     "Wanddicke {d} cm, im Dünnbettverfahren, für spätere Wärmedämmung (WDVS bzw. Kerndämmung). "
                     "Einschließlich Passsteine. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "331", "gen": "A",
             "achsen": [KS_FK, FLAECHE, ORT],
             "varianten": [{"fk": "20-2,0", "d": "17,5", "h": 0.38, "mat": 30}, {"fk": "20-2,0", "d": "24", "h": 0.45, "mat": 40}]},
            {"kurz": "Kellerwand Kalksand-Vollsteine KS {fk}, d = {d} cm",
             "lang": "Kelleraußenwand aus Kalksand-Plansteinen KS {fk} im Dünnbettverfahren, Wanddicke {d} cm, "
                     "erdberührt, für außenliegende Abdichtung und Perimeterdämmung. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "331", "gen": "A",
             "achsen": [KS_FK, FLAECHE],
             "varianten": [{"fk": "20-2,0", "d": "24", "h": 0.48, "mat": 41}, {"fk": "20-2,0", "d": "30", "h": 0.55, "mat": 52},
                           {"fk": "20-2,0", "d": "36,5", "h": 0.62, "mat": 63}]},
            {"kurz": "Verblendmauerwerk Klinker {f}, Halbsteinverband, Fugenglattstrich",
             "lang": "Vorsatzschale als Sichtmauerwerk aus Vormauerklinkern Format {f}, frostbeständig, Sortierung nach "
                     "Bemusterung (Klinker-Materialpreis bis {m} €/m² im Stoffansatz enthalten), im Halbsteinverband in "
                     "Vormauermörtel, Fugen im Fugenglattstrich. Einschließlich Edelstahl-Drahtanker nach Statik, "
                     "Dämmstoffhalter, Tropfscheiben und Entwässerungsöffnungen am Fußpunkt. "
                     "Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "335", "gen": "C",
             "achsen": [FLAECHE, ORT],
             "varianten": [{"f": "NF", "m": "45", "h": 1.20, "mat": 58}, {"f": "DF", "m": "50", "h": 1.35, "mat": 64},
                           {"f": "WDF", "m": "55", "h": 1.10, "mat": 68}]},
            {"kurz": "Kerndämmung zweischaliges Mauerwerk, Mineralwolle WLS 035, d = {d} cm",
             "lang": "Kerndämmung für zweischaliges Mauerwerk aus Mineralwolle-Kerndämmplatten, wasserabweisend, "
                     "Baustoffklasse A1, WLS 035, Dicke {d} cm, dicht gestoßen eingebaut, mit Dämmstoffhaltern an den "
                     "Drahtankern gesichert.",
             "einheit": "m²", "kg": "335", "gen": "A",
             "varianten": [{"d": "12", "h": 0.14, "mat": 14}, {"d": "14", "h": 0.15, "mat": 16.5}, {"d": "16", "h": 0.16, "mat": 19}, {"d": "20", "h": 0.18, "mat": 24}]},
        ]},
        {"name": "Innenwände", "positionen": [
            {"kurz": "Innenwand tragend, Kalksand-Plansteine KS {fk}, d = {d} cm",
             "lang": "Tragendes Innenmauerwerk aus Kalksand-Plansteinen KS {fk}, Wanddicke {d} cm, im Dünnbettverfahren, "
                     "Stoßfugen vermörtelt bzw. mit Nut und Feder. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "341", "gen": "A",
             "achsen": [KS_FK, MOERTEL, FLAECHE, ORT],
             "varianten": [{"fk": "12-1,8", "d": "11,5", "h": 0.32, "mat": 19}, {"fk": "20-2,0", "d": "17,5", "h": 0.38, "mat": 28},
                           {"fk": "20-2,0", "d": "24", "h": 0.45, "mat": 38}]},
            {"kurz": "Innenwand tragend, Planziegel, d = {d} cm",
             "lang": "Tragendes Innenmauerwerk aus Planhochlochziegeln, Wanddicke {d} cm, Festigkeits- und Rohdichteklasse "
                     "nach Statik bzw. Schallschutznachweis, im Dünnbettverfahren. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "341", "gen": "A",
             "achsen": [FLAECHE, ORT],
             "varianten": [{"d": "17,5", "h": 0.40, "mat": 30}, {"d": "24", "h": 0.48, "mat": 40}]},
            {"kurz": "Wohnungstrennwand Schallschutz, KS-Plansteine RDK 2,0, d = {d} cm",
             "lang": "Wohnungstrennwand mit erhöhten Schallschutzanforderungen aus Kalksand-Plansteinen Rohdichteklasse "
                     "2,0, Wanddicke {d} cm, Stoßfugen vollständig vermörtelt, Anschlüsse an flankierende Bauteile nach "
                     "Schallschutznachweis. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "341", "gen": "A",
             "achsen": [FLAECHE, ORT],
             "varianten": [{"d": "24", "h": 0.50, "mat": 42}, {"d": "30", "h": 0.58, "mat": 53}]},
            {"kurz": "Nichttragende Innenwand, Porenbeton-Planbauplatten, d = {d} cm",
             "lang": "Nichttragende Trennwand nach DIN 4103-1 aus Porenbeton-Planbauplatten, Wanddicke {d} cm, "
                     "in Dünnbettmörtel, Anschluss an Decke mit Mineralwollestreifen bzw. elastischem Anschluss, "
                     "Anschluss an Wände mit Flachankern. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "342", "gen": "A",
             "achsen": [FLAECHE, ORT],
             "varianten": [{"d": "7,5", "h": 0.30, "mat": 14}, {"d": "10", "h": 0.32, "mat": 17}, {"d": "11,5", "h": 0.34, "mat": 19}]},
            {"kurz": "Nichttragende Innenwand, KS-Bauplatten, d = {d} cm",
             "lang": "Nichttragende Trennwand aus Kalksand-Bauplatten, Wanddicke {d} cm, im Dünnbettverfahren, "
                     "Anschlüsse wie vor. Öffnungen über 2,5 m² werden abgezogen.",
             "einheit": "m²", "kg": "342", "gen": "A",
             "varianten": [{"d": "7", "h": 0.30, "mat": 13}, {"d": "10", "h": 0.32, "mat": 16}, {"d": "11,5", "h": 0.34, "mat": 18}]},
            {"kurz": "Gleitender Deckenanschluss nichttragender Wand",
             "lang": "Verformungsfähiger Anschluss nichttragender Wände an Stahlbetondecken mit Deckendurchbiegung: "
                     "Fuge 2 cm mit Mineralwollestreifen A1 verfüllen, seitlich mit Gleitankern bzw. Anschlussprofilen "
                     "halten, Fuge beidseitig für spätere elastische Versiegelung vorbereiten.",
             "einheit": "m", "kg": "342", "h": 0.18, "mat": 6.5, "gen": "B"},
        ]},
        {"name": "Stürze, Ringanker, Ergänzungen", "positionen": [
            {"kurz": "Flachsturz Ziegel/KS, Länge {l} m, für Wanddicke {d} cm",
             "lang": "Vorgefertigten Flachsturz (Ziegel-, KS- oder Porenbetonschale mit Bewehrung) liefern und mit "
                     "Übermauerung bzw. Überbeton nach Herstellerangaben einbauen, Auflagerlänge mindestens 11,5 cm. "
                     "Lichte Öffnung bis {l} m, Wanddicke {d} cm (mehrere Stürze nebeneinander).",
             "einheit": "St", "kg": "331", "gen": "A",
             "varianten": [{"l": "1,01", "d": "11,5", "h": 0.35, "mat": 18}, {"l": "1,26", "d": "17,5", "h": 0.50, "mat": 36},
                           {"l": "1,51", "d": "24", "h": 0.70, "mat": 56}, {"l": "2,01", "d": "36,5", "h": 1.10, "mat": 108},
                           {"l": "2,51", "d": "36,5", "h": 1.30, "mat": 138}]},
            {"kurz": "Rolladen-/Raffstorekasten als Sturz, Länge {l} m",
             "lang": "Wärmedämmenden Rollladen- bzw. Raffstore-Sturzkasten mit integriertem Sturz für monolithisches "
                     "Mauerwerk liefern und nach Herstellerangabe einbauen, Revisionsöffnung nach unten, "
                     "einschließlich seitlicher Abschlüsse. Lichte Öffnung bis {l} m.",
             "einheit": "St", "kg": "331", "gen": "C",
             "varianten": [{"l": "1,26", "h": 1.0, "mat": 210}, {"l": "2,01", "h": 1.3, "mat": 290}, {"l": "2,51", "h": 1.6, "mat": 360}]},
            {"kurz": "U-Schale für Ringbalken/Sturz, Wanddicke {d} cm",
             "lang": "U-Schalen aus Ziegel bzw. Porenbeton passend zum Mauerwerk als verlorene Schalung für Ringbalken "
                     "oder Stürze versetzen, mit Wärmedämmeinlage auf der Außenseite; Bewehrung und Beton werden "
                     "gesondert vergütet.",
             "einheit": "m", "kg": "331", "gen": "B",
             "varianten": [{"d": "24", "h": 0.25, "mat": 14}, {"d": "36,5", "h": 0.30, "mat": 22}, {"d": "42,5", "h": 0.32, "mat": 26}]},
            {"kurz": "Mauerwerk aus Ziegeln DF/NF ergänzen, Ausmauerung, d = {d} cm",
             "lang": "Kleinflächige Ausmauerungen, Ergänzungen und Schließen von Aussparungen in kleinformatigem "
                     "Mauerwerk (DF/NF) in Normalmauermörtel, einschließlich Anpassarbeiten an vorhandenes Mauerwerk, "
                     "Wanddicke {d} cm.",
             "einheit": "m²", "kg": "341", "gen": "B", "tags": ["altbau"],
             "varianten": [{"d": "11,5", "h": 1.30, "mat": 26}, {"d": "24", "h": 2.40, "mat": 52}]},
            {"kurz": "Öffnung im Mauerwerk zumauern, bis {a} m²",
             "lang": "Vorhandene Wandöffnung (Tür, Fenster, Durchbruch) im Bestand vollständig zumauern, Mauerwerk "
                     "aus Kalksandstein bzw. Ziegel der vorhandenen Wanddicke bis 24 cm, kraftschlüssig mit Mörtel an "
                     "Bestand angeschlossen, einschließlich Verzahnung bzw. Maueranker. Fläche bis {a} m².",
             "einheit": "St", "kg": "341", "gen": "C", "tags": ["altbau"],
             "varianten": [{"a": "1,0", "h": 2.5, "mat": 30}, {"a": "2,5", "h": 5.0, "mat": 70}, {"a": "4,0", "h": 7.5, "mat": 110}]},
            {"kurz": "Schlitz im Mauerwerk herstellen, bis {q} cm, nachträglich",
             "lang": "Schlitze für Installationen in bestehendem Mauerwerk mit Mauernutfräse herstellen, Querschnitt "
                     "bis {q} cm, einschließlich Abtransport des Schutts zur Sammelstelle auf der Baustelle; Schließen "
                     "der Schlitze gesondert. Grenzwerte nach DIN EN 1996-1-1/NA beachten.",
             "einheit": "m", "kg": "341", "gen": "B", "tags": ["altbau"],
             "varianten": [{"q": "3 × 3", "h": 0.18, "mat": 0.5, "geraet": 1.5}, {"q": "5 × 5", "h": 0.28, "mat": 0.8, "geraet": 2.5},
                           {"q": "10 × 5", "h": 0.45, "mat": 1.2, "geraet": 3.5}]},
            {"kurz": "Wanddurchbruch Mauerwerk, d bis {d} cm, Fläche bis {a} m²",
             "lang": "Durchbruch in tragendem Mauerwerk nach statischer Vorgabe herstellen, mit Abstützen, "
                     "Einbau der Sturzträger gesondert. Leibungen beiputzfertig, Schutt zur Sammelstelle auf der "
                     "Baustelle. Wanddicke bis {d} cm, Durchbruchfläche bis {a} m².",
             "einheit": "St", "kg": "394", "gen": "C", "tags": ["altbau"], "lohn": "abbruch",
             "varianten": [{"d": "24", "a": "2,0", "h": 7.0, "mat": 25, "geraet": 60}, {"d": "36,5", "a": "2,5", "h": 10.0, "mat": 35, "geraet": 85}]},
            {"kurz": "Schornstein-/Abgassystem, einzügig, Ø {d} mm",
             "lang": "Mehrschaliges Abgassystem (keramisches Innenrohr, Dämmung, Mantelstein) für raumluftunabhängige "
                     "Feuerstätten, einzügig, lichter Ø {d} mm, mit Luft-Abgas-Funktion nach Herstellerangabe, "
                     "einschließlich Formteile (Sockel, Reinigungsöffnung, Anschlussstück) anteilig. Abrechnung nach Höhe.",
             "einheit": "m", "kg": "429", "gen": "C",
             "varianten": [{"d": "160", "h": 1.6, "mat": 175}, {"d": "200", "h": 1.8, "mat": 205}]},
            {"kurz": "Schornsteinkopf, Abdeckplatte und Verkleidung, pauschal",
             "lang": "Schornsteinkopf über Dach mit Edelstahl- bzw. Faserzement-Abdeckplatte und Kopfverkleidung "
                     "(Klinkeroptik oder Blech) nach Herstellersystem herstellen, Höhe über Dach bis 1,5 m.",
             "einheit": "St", "kg": "429", "h": 6.0, "mat": 780, "gen": "C"},
            {"kurz": "Mauerwerk reinigen und neu verfugen (Bestand)",
             "lang": "Bestehendes Sichtmauerwerk: Fugen 1,5 bis 2 cm tief auskratzen, Flächen mit Wasser reinigen, "
                     "neu verfugen mit Fugenmörtel nach Bemusterung, Fugenbild an den Bestand angepasst.",
             "einheit": "m²", "kg": "335", "h": 1.30, "mat": 6, "geraet": 2, "gen": "C", "tags": ["altbau"]},
        ]},
    ],
}]


# ---------------------------------------------------------------- Runde 2: weitere Achsen und Grundpositionen
BRAND = [{}, {"k": "Brandwand", "t": "Ausführung als Brandwand bzw. Wand anstelle einer Brandwand (REI-M 90) nach Prüfzeugnis des Steinherstellers.",
              "fm": 1.08, "fh": 1.05}]
FORMAT = [{"k": "DF", "t": "Steinformat DF.", "fh": 1.25}, {"k": "NF", "t": "Steinformat NF.", "fh": 1.15}, {"k": "2DF", "t": "Steinformat 2DF."},
          {"k": "3DF", "t": "Steinformat 3DF.", "fh": 0.9}]
ZUSTAND = [{}, {"k": "Sichtmauerwerk", "t": "Ausführung als Sichtmauerwerk mit Fugenglattstrich, Steine nach Bemusterung.", "fh": 1.3, "fm": 1.4, "gen": "B"}]


def _ax(prefix, achsen):
    for g in LBS[0]["gruppen"]:
        for p in g["positionen"]:
            if p["kurz"].startswith(prefix) and "achsen" not in p:
                p["achsen"] = achsen


_ax("Kimmschicht", [ORT])
_ax("Horizontale Sperrschicht", [ORT])
_ax("Kerndämmung", [FLAECHE, ORT])
_ax("Flachsturz", [ORT])
_ax("U-Schale", [ORT])
_ax("Schlitz im Mauerwerk", [[{"k": "waagerecht", "t": "Schlitz waagerecht bzw. schräg.", "fh": 1.15}, {"k": "senkrecht", "t": "Schlitz senkrecht."}],
                              [{"k": "Mauerwerk weich", "t": "In Mauerwerk aus Porenbeton, Hochlochziegel oder Bims.", "fh": 0.8},
                               {"k": "Mauerwerk hart", "t": "In Mauerwerk aus Kalksand-Vollstein, Vollziegel oder Klinker."}]])
_ax("Gleitender Deckenanschluss", [ORT])
for g in LBS[0]["gruppen"]:
    for p in g["positionen"]:
        if p["kurz"].startswith(("Innenwand tragend", "Wohnungstrennwand")) and p.get("achsen") and BRAND not in p["achsen"]:
            p["achsen"] = p["achsen"] + [BRAND]

LBS[0]["gruppen"].append({"name": "Mauerwerk kleinformatig, Sonderbauteile", "positionen": [
    {"kurz": "Mauerwerk Vollziegel Mz {fk}, d = {d} cm, Normalmörtel",
     "lang": "Mauerwerk aus Vollziegeln Mz nach DIN EN 771-1/DIN 20000-401, Festigkeitsklasse {fk}, in Normalmauermörtel M 10 "
             "im Läufer- bzw. Blockverband, Wanddicke {d} cm. Öffnungen über 2,5 m² werden abgezogen.",
     "einheit": "m²", "kg": "341", "gen": "B", "achsen": [FORMAT, ZUSTAND, FLAECHE, ORT],
     "varianten": [{"fk": "12", "d": "11,5", "h": 1.05, "mat": 38}, {"fk": "12", "d": "24", "h": 1.9, "mat": 74}, {"fk": "20", "d": "36,5", "h": 2.8, "mat": 118}]},
    {"kurz": "Mauerwerk Kalksand-Vollstein KS {fk}, d = {d} cm, kleinformatig",
     "lang": "Mauerwerk aus Kalksand-Vollsteinen bzw. -Lochsteinen kleinformatig, Festigkeitsklasse {fk}, in Normalmauermörtel, "
             "Wanddicke {d} cm. Öffnungen über 2,5 m² werden abgezogen.",
     "einheit": "m²", "kg": "341", "gen": "A", "achsen": [FORMAT, ZUSTAND, FLAECHE, ORT],
     "varianten": [{"fk": "12", "d": "11,5", "h": 0.85, "mat": 24}, {"fk": "20", "d": "17,5", "h": 1.2, "mat": 36}, {"fk": "20", "d": "24", "h": 1.5, "mat": 48}]},
    {"kurz": "Mauerwerk Hohlblocksteine Leichtbeton Hbl {fk}, d = {d} cm",
     "lang": "Mauerwerk aus Hohlblocksteinen aus Leichtbeton Hbl, Festigkeitsklasse {fk}, in Leichtmauermörtel bzw. Normalmörtel, "
             "Wanddicke {d} cm, z. B. für Kellerwände und Nebengebäude.",
     "einheit": "m²", "kg": "331", "gen": "A", "achsen": [FLAECHE, ORT],
     "varianten": [{"fk": "2", "d": "24", "h": 0.55, "mat": 34}, {"fk": "4", "d": "30", "h": 0.62, "mat": 44}, {"fk": "4", "d": "36,5", "h": 0.7, "mat": 54}]},
    {"kurz": "Schallschutzziegel verfüllt, d = {d} cm",
     "lang": "Wohnungstrenn- bzw. Treppenhauswand aus Planfüllziegeln, nach dem Vermauern lagenweise mit Beton C12/15 verfüllt, "
             "Wanddicke {d} cm, bewertetes Schalldämm-Maß nach Prüfzeugnis.",
     "einheit": "m²", "kg": "341", "gen": "B", "achsen": [FLAECHE, ORT, BRAND],
     "varianten": [{"d": "17,5", "h": 0.62, "mat": 48}, {"d": "24", "h": 0.72, "mat": 62}, {"d": "30", "h": 0.82, "mat": 78}]},
    {"kurz": "Glasbausteinwand {f} cm, Wanddicke 8 cm",
     "lang": "Wand aus Glasbausteinen {f} cm, Dicke 8 cm, klar bzw. nach Bemusterung, mit Bewehrung in Lager- und Stoßfugen, "
             "Randanschluss mit Dehnungsfuge und U-Profil, Fugen weiß verfugt.",
     "einheit": "m²", "kg": "342", "gen": "B", "achsen": [[{}, {"k": "satiniert", "t": "Glasbausteine satiniert bzw. strukturiert.", "fm": 1.25}],
                                                          [{}, {"k": "Brandschutz G60", "t": "Brandschutz-Glasbausteinwand G 60 nach Zulassung.", "fm": 2.6, "fh": 1.2, "gen": "C"}]],
     "varianten": [{"f": "19 × 19", "h": 2.6, "mat": 115}, {"f": "24 × 24", "h": 2.3, "mat": 125}]},
    {"kurz": "Natursteinmauerwerk {a}, d = {d} cm",
     "lang": "Mauerwerk aus heimischem Naturstein, {a}, in Kalkmörtel, Sichtseite handwerklich bearbeitet, Wanddicke {d} cm; "
             "Steinmaterial nach Bemusterung im Stoffansatz enthalten.",
     "einheit": "m²", "kg": "335", "gen": "C", "achsen": [FLAECHE, ORT],
     "varianten": [{"a": "Bruchsteinmauerwerk", "d": "30", "h": 4.5, "mat": 95}, {"a": "hammerrechtes Schichtenmauerwerk", "d": "30", "h": 5.5, "mat": 120},
                   {"a": "Quadermauerwerk", "d": "40", "h": 6.5, "mat": 240}]},
    {"kurz": "Lehmsteinmauerwerk, d = {d} cm, Lehmmörtel",
     "lang": "Nichttragendes Mauerwerk aus Lehmsteinen nach DIN 18945 in Lehmmauermörtel nach DIN 18946, Wanddicke {d} cm, "
             "Anschlüsse mit Flachankern.",
     "einheit": "m²", "kg": "342", "gen": "B", "achsen": [FLAECHE, ORT],
     "varianten": [{"d": "11,5", "h": 0.9, "mat": 34}, {"d": "17,5", "h": 1.15, "mat": 50}]},
    {"kurz": "Brüstungs-/Pfeilermauerwerk Planstein, d = {d} cm",
     "lang": "Brüstungen, Pfeiler und Wandstücke bis 1,5 m² aus Plansteinen der Wandkonstruktion, im Dünnbettverfahren, "
             "mit Passsteinen. Abrechnung nach Fläche.",
     "einheit": "m²", "kg": "331", "gen": "B", "achsen": [ORT],
     "varianten": [{"d": "17,5", "h": 0.75, "mat": 34}, {"d": "24", "h": 0.85, "mat": 44}, {"d": "36,5", "h": 1.05, "mat": 82}]},
    {"kurz": "Installationsvormauerung Porenbeton, d = {d} cm, bis Raumhöhe",
     "lang": "Vormauerung für Installationen aus Porenbeton-Planbauplatten, Dicke {d} cm, mit Flachankern an die Wand, "
             "Aussparungen nach Installationsplan.",
     "einheit": "m²", "kg": "342", "gen": "A", "achsen": [FLAECHE, ORT],
     "varianten": [{"d": "5", "h": 0.32, "mat": 12}, {"d": "7,5", "h": 0.34, "mat": 14}, {"d": "10", "h": 0.36, "mat": 17}]},
    {"kurz": "Schachtwand gemauert, d = {d} cm, mit Revisionsöffnung",
     "lang": "Installationsschacht aus Kalksand- bzw. Porenbeton-Plansteinen, Wanddicke {d} cm, einschließlich Aussparung für "
             "Revisionsöffnung. Abrechnung nach Wandfläche.",
     "einheit": "m²", "kg": "342", "gen": "B", "achsen": [ORT, BRAND],
     "varianten": [{"d": "11,5", "h": 0.55, "mat": 20}, {"d": "17,5", "h": 0.62, "mat": 29}]},
]})
LBS[0]["gruppen"].append({"name": "Mauerwerksinstandsetzung im Bestand", "positionen": [
    {"kurz": "Horizontalsperre nachträglich, Injektion, Wanddicke bis {d} cm",
     "lang": "Nachträgliche Horizontalabdichtung gegen aufsteigende Feuchte im Bohrlochverfahren: Bohrlöcher im Abstand 10–12,5 cm, "
             "Injektionscreme bzw. -flüssigkeit nach WTA-Merkblatt drucklos bzw. mit Druck einbringen, Bohrlöcher schließen. "
             "Wanddicke bis {d} cm. Abrechnung nach Länge.",
     "einheit": "m", "kg": "395", "gen": "C", "tags": ["altbau"],
     "achsen": [[{"k": "drucklos", "t": "Injektion drucklos (Creme)."}, {"k": "Druckinjektion", "t": "Injektion mit Druck über Packer.", "fh": 1.3, "geraet": 4}],
                [{}, {"k": "Durchfeuchtung hoch", "t": "Durchfeuchtungsgrad über 80 %: vorher Bohrlochtrocknung bzw. Vorinjektion mit Bohrlochsuspension.", "fh": 1.4, "fm": 1.3}]],
     "varianten": [{"d": "24", "h": 0.55, "mat": 18, "geraet": 3}, {"d": "36,5", "h": 0.75, "mat": 28, "geraet": 4}, {"d": "50", "h": 1.0, "mat": 38, "geraet": 5},
                   {"d": "75", "h": 1.4, "mat": 58, "geraet": 7}]},
    {"kurz": "Horizontalsperre mechanisch, Edelstahlbleche eingerammt, Wanddicke bis {d} cm",
     "lang": "Mechanische Horizontalsperre durch Einrammen gewellter Chromstahlbleche in eine durchgehende Lagerfuge, "
             "überlappend, Wanddicke bis {d} cm, Anschluss an Vertikalabdichtung.",
     "einheit": "m", "kg": "395", "gen": "C", "tags": ["altbau"], "geraet": 18,
     "varianten": [{"d": "36,5", "h": 1.2, "mat": 42}, {"d": "50", "h": 1.5, "mat": 58}]},
    {"kurz": "Rissvernadelung Mauerwerk mit Spiralankern, Rissbreite bis {r} mm",
     "lang": "Statische Rissinstandsetzung im Mauerwerk: Lagerfugen beidseits des Risses einschneiden, Edelstahl-Spiralanker "
             "Ø 6 mm in Injektionsmörtel einbetten, Länge je Anker 1,0 m, Abstand nach Statik (i. d. R. jede 3. Lagerfuge), Riss verpressen. "
             "Abrechnung nach Risslänge.",
     "einheit": "m", "kg": "395", "gen": "C", "tags": ["altbau"],
     "achsen": [[{"k": "einseitig", "t": "Ausführung einseitig."}, {"k": "beidseitig", "t": "Ausführung beidseitig.", "fh": 1.8, "fm": 2}], [ORT[2], {}][::-1]],
     "varianten": [{"r": "2", "h": 1.6, "mat": 22}, {"r": "5", "h": 2.0, "mat": 28}]},
    {"kurz": "Mauerwerk ausbessern, Steine auswechseln, Format {f}",
     "lang": "Schadhafte Mauersteine im Sicht- bzw. Hintermauerwerk ausstemmen und durch passende Steine (Altsteine bzw. Neusteine nach "
             "Bemusterung) in Mörtel ersetzen, Fugen angepasst. Abrechnung je ausgetauschtem Stein.",
     "einheit": "St", "kg": "395", "gen": "C", "tags": ["altbau"],
     "achsen": [[{}, {"k": "Sichtmauerwerk", "t": "Sichtmauerwerk, Farbe und Fugenbild an Bestand angepasst.", "fh": 1.4, "fm": 1.5}]],
     "varianten": [{"f": "NF", "h": 0.45, "mat": 3.5}, {"f": "DF", "h": 0.42, "mat": 3.0}, {"f": "2DF", "h": 0.55, "mat": 4.5}]},
    {"kurz": "Maueranker nachträglich, Verbindung Vorsatzschale, Edelstahl",
     "lang": "Nachträgliche Verankerung von Vormauerschalen mit Edelstahl-Injektions- bzw. Spiralankern, Bohrung durch Vorsatzschale, "
             "Ankerlänge nach Schalenabstand, Bohrloch farblich angepasst schließen. Abrechnung je Anker.",
     "einheit": "St", "kg": "395", "gen": "B", "tags": ["altbau"], "achsen": [ORT[::2]],
     "varianten": [{"h": 0.25, "mat": 4.5, "geraet": 0.5}]},
    {"kurz": "Mauerwerk verpressen (Hohlräume), Injektionsmörtel",
     "lang": "Hohlräume und Fehlstellen in Mischmauerwerk über Bohrlöcher im Raster 50 cm mit Injektionsmörtel auf Kalkbasis verpressen, "
             "Packer setzen und entfernen. Abrechnung nach Wandfläche.",
     "einheit": "m²", "kg": "395", "gen": "C", "tags": ["altbau"], "geraet": 6,
     "varianten": [{"h": 1.2, "mat": 24}]},
    {"kurz": "Fugen auskratzen und neu verfugen, {m}",
     "lang": "Lose und mürbe Fugen 2 cm tief auskratzen, ausblasen, vornässen und mit {m} neu verfugen, Fugenbild nach Bestand.",
     "einheit": "m²", "kg": "395", "gen": "C", "tags": ["altbau"],
     "achsen": [[{"k": "Wandfläche", "t": "An Wandflächen."}, {"k": "Gewölbe/Unterseite", "t": "An Gewölben bzw. überkopf.", "fh": 1.4}], FLAECHE],
     "varianten": [{"m": "Kalkmörtel NHL", "h": 1.1, "mat": 5}, {"m": "Trasskalkmörtel", "h": 1.15, "mat": 6}, {"m": "Zementmörtel", "h": 1.0, "mat": 4}]},
]})
