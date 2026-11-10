"""Kostengruppen nach DIN 276 (Ausgabe 2018) – die eine Liste für alle Apps.

NAMEN     Kennzahl → Bezeichnung, 2. und 3. Ebene der KG 200 bis 500 (Bezeichnungen teils gekürzt)
vorschlag(gewerk) → Kennzahlen, die zu einem Gewerk passen (für die Vorschlagsliste der Spalte KG, wichtigste zuerst)
"""
import re

_E2 = {
    "210": "Herrichten", "220": "Öffentliche Erschließung", "230": "Nichtöffentliche Erschließung", "240": "Ausgleichsmaßnahmen und -abgaben",
    "250": "Übergangsmaßnahmen",
    "310": "Baugrube / Erdbau", "320": "Gründung, Unterbau", "330": "Außenwände", "340": "Innenwände", "350": "Decken", "360": "Dächer",
    "370": "Infrastrukturanlagen", "380": "Baukonstruktive Einbauten", "390": "Sonstige Maßnahmen für Baukonstruktionen",
    "410": "Abwasser, Wasser, Gas", "420": "Wärmeversorgung", "430": "Raumlufttechnik", "440": "Elektrische Anlagen",
    "450": "Kommunikation, Sicherheit", "460": "Förderanlagen", "470": "Nutzungsspezifische Anlagen", "480": "Gebäudeautomation",
    "490": "Sonstige Maßnahmen für technische Anlagen",
    "510": "Erdbau (Außenanlagen)", "520": "Gründung, Unterbau (Außenanlagen)", "530": "Oberbau, Deckschichten", "540": "Baukonstruktionen (Außenanlagen)",
    "550": "Technische Anlagen (Außenanlagen)", "560": "Einbauten in Außenanlagen", "570": "Vegetationsflächen", "580": "Wasserflächen",
    "590": "Sonstige Maßnahmen für Außenanlagen",
}
_SONST = ("Baustelleneinrichtung", "Gerüste", "Sicherungsmaßnahmen", "Abbruchmaßnahmen", "Instandsetzungen", "Materialentsorgung",
          "Zusätzliche Maßnahmen", "Provisorien")
_E3 = {
    "211": "Sicherungsmaßnahmen", "212": "Abbruchmaßnahmen", "213": "Altlastenbeseitigung", "214": "Herrichten der Geländeoberfläche",
    "215": "Kampfmittelräumung", "216": "Kulturhistorische Funde",
    "311": "Herstellung Baugrube", "312": "Umschließung", "313": "Wasserhaltung", "314": "Vortrieb",
    "321": "Baugrundverbesserung", "322": "Flachgründungen und Bodenplatten", "323": "Tiefgründungen", "324": "Gründungsbeläge",
    "325": "Abdichtungen und Bekleidungen (Gründung)", "326": "Dränagen",
    "331": "Tragende Außenwände", "332": "Nichttragende Außenwände", "333": "Außenstützen", "334": "Außenwandöffnungen (Fenster, Türen)",
    "335": "Außenwandbekleidungen außen", "336": "Außenwandbekleidungen innen", "337": "Elementierte Außenwandkonstruktionen", "338": "Lichtschutz (Außenwände)",
    "341": "Tragende Innenwände", "342": "Nichttragende Innenwände", "343": "Innenstützen", "344": "Innenwandöffnungen (Türen)",
    "345": "Innenwandbekleidungen", "346": "Elementierte Innenwandkonstruktionen", "347": "Lichtschutz (Innenwände)",
    "351": "Deckenkonstruktionen", "352": "Deckenöffnungen", "353": "Deckenbeläge (Boden)", "354": "Deckenbekleidungen", "355": "Elementierte Deckenkonstruktionen",
    "361": "Dachkonstruktionen", "362": "Dachöffnungen", "363": "Dachbeläge", "364": "Dachbekleidungen", "365": "Elementierte Dachkonstruktionen", "366": "Lichtschutz (Dach)",
    "371": "Anlagen für den Straßenverkehr", "375": "Anlagen der Abwasserentsorgung", "376": "Anlagen der Wasserversorgung",
    "381": "Allgemeine Einbauten", "382": "Besondere Einbauten", "383": "Landschaftsgestalterische Einbauten", "386": "Orientierungs- und Informationssysteme",
    **{f"39{i + 1}": n for i, n in enumerate(_SONST)},
    "411": "Abwasseranlagen", "412": "Wasseranlagen", "413": "Gasanlagen",
    "421": "Wärmeerzeugungsanlagen", "422": "Wärmeverteilnetze", "423": "Raumheizflächen", "424": "Verkehrsheizflächen",
    "431": "Lüftungsanlagen", "432": "Teilklimaanlagen", "433": "Klimaanlagen", "434": "Kälteanlagen",
    "441": "Hoch- und Mittelspannungsanlagen", "442": "Eigenstromversorgung", "443": "Niederspannungsschaltanlagen", "444": "Niederspannungsinstallation",
    "445": "Beleuchtungsanlagen", "446": "Blitzschutz- und Erdungsanlagen",
    "451": "Telekommunikationsanlagen", "452": "Such- und Signalanlagen", "454": "Elektroakustische Anlagen", "455": "Audiovisuelle Medien, Antennen",
    "456": "Gefahrenmelde- und Alarmanlagen", "457": "Datenübertragungsnetze",
    "461": "Aufzugsanlagen", "462": "Fahrtreppen, Fahrsteige", "465": "Krananlagen",
    "471": "Küchentechnische Anlagen", "473": "Medizin- und labortechnische Anlagen", "474": "Feuerlöschanlagen",
    "481": "Automationseinrichtungen", "482": "Schaltschränke", "484": "Kabel, Leitungen, Verlegesysteme",
    **{f"49{i + 1}": n + " (technische Anlagen)" for i, n in enumerate(_SONST)},
    "511": "Herstellung (Erdbau außen)", "513": "Wasserhaltung (außen)",
    "521": "Baugrundverbesserung (außen)", "522": "Gründungen und Bodenplatten (außen)", "525": "Dränagen (außen)",
    "531": "Wege", "532": "Straßen", "533": "Plätze, Höfe, Terrassen", "534": "Stellplätze", "535": "Sportplatzflächen", "536": "Spielplatzflächen",
    "541": "Einfriedungen", "542": "Begrenzungswände", "543": "Wände, Stützwände", "544": "Rampen, Treppen, Tribünen", "545": "Überdachungen",
    "546": "Stege", "548": "Wasserbecken",
    "551": "Abwasseranlagen (außen)", "552": "Wasseranlagen (außen)", "554": "Elektrische Anlagen (außen)",
    "561": "Allgemeine Einbauten (außen)", "562": "Besondere Einbauten (außen)", "563": "Orientierungs- und Informationssysteme (außen)",
    "571": "Vegetationstechnische Bodenbearbeitung", "572": "Sicherungsbauweisen", "573": "Pflanzflächen", "574": "Rasen- und Saatflächen",
    **{f"59{i + 1}": n + " (außen)" for i, n in enumerate(_SONST)},
}
NAMEN = dict(sorted({**_E2, **_E3}.items()))

# Gewerk (Stichwort im Namen, klein geschrieben) → passende Kennzahlen bzw. Anfänge davon, wichtigste zuerst
_GEWERK = [
    (("abbruch", "demontage", "rückbau", "rueckbau", "entkernung", "schadstoff"), ("212", "394", "396", "211")),
    (("baustelleneinricht",), ("391", "591")),
    (("gerüst", "geruest"), ("392",)),
    (("erdarbeit", "erdbau", "aushub", "baugrube"), ("311", "312", "313", "51", "214")),
    (("verbau", "spezialtiefbau", "wasserhaltung"), ("312", "313", "323")),
    (("entwässerung", "entwaesserung", "kanal", "drän", "draen", "versicker"), ("326", "411", "551", "525")),
    (("rohbau", "maurer", "mauerarbeit", "beton", "stahlbeton"), ("322", "331", "341", "351", "333", "343", "325", "361", "39")),
    (("zimmer", "holzbau"), ("361", "331", "341", "351", "365", "337")),
    (("stahlbau",), ("333", "343", "351", "361")),
    (("abdichtung",), ("325", "335", "363")),
    (("dachdeck", "dachabdicht", "klempner", "spengler"), ("363", "362", "364", "361")),
    (("dach",), ("363", "361", "362", "364")),
    (("fassade", "wdvs", "vorhang", "naturwerkstein", "naturstein", "klinker"), ("335", "337", "331")),
    (("putz", "stuck"), ("335", "336", "345", "354")),
    (("fenster", "verglasung", "glas"), ("334", "344", "362")),
    (("tischler", "schreiner", "türen", "tueren", "innentür"), ("344", "334", "381")),
    (("metallbau", "schlosser", "geländer", "gelaender"), ("334", "344", "352", "381", "541")),
    (("rollladen", "sonnenschutz", "jalousie"), ("338", "347", "366")),
    (("trockenbau",), ("342", "345", "354", "346")),
    (("estrich",), ("353", "325")),
    (("fliesen", "platten"), ("353", "345", "336")),
    (("parkett", "bodenbelag", "bodenbeschicht", "beschichtung", "linoleum", "teppich"), ("353",)),
    (("maler", "anstrich", "lackier", "tapez"), ("345", "336", "354", "335")),
    (("reinigung",), ("397",)),
    (("sanitär", "sanitaer", "abwasser", "wasser", "gas"), ("411", "412", "413")),
    (("heizung", "wärme", "waerme"), ("421", "422", "423", "424")),
    (("lüftung", "lueftung", "klima", "kälte", "kaelte", "raumluft"), ("431", "432", "433", "434")),
    (("elektro", "starkstrom", "beleuchtung", "blitzschutz"), ("444", "445", "443", "446", "442")),
    (("schwachstrom", "fernmelde", "brandmelde", "daten", "netzwerk"), ("456", "457", "451", "452")),
    (("aufzug", "fördertechnik", "foerdertechnik"), ("461", "462")),
    (("küche", "kueche"), ("471",)),
    (("gebäudeautomation", "gebaeudeautomation", "msr"), ("481", "482", "484")),
    (("landschaft", "garten", "pflanz", "außenanlage", "aussenanlage", "freianlage", "vegetation"), ("573", "574", "571", "531", "533", "541", "5")),
    (("pflaster", "wegebau", "straßenbau", "strassenbau"), ("531", "532", "533", "534")),
    (("zaun", "einfried"), ("541", "542")),
    (("spielplatz",), ("536", "562")),
]


def vorschlag(gewerk):
    """Kennzahlen, die zum Gewerk passen – in der Reihenfolge der Tabelle oben, ohne Doppelte. Unbekanntes Gewerk: leer."""
    g = re.sub(r"\s+", " ", str(gewerk or "").lower())
    out = []
    for worte, kgs in _GEWERK:
        if any(w in g for w in worte):
            for p in kgs:
                for k in NAMEN:
                    if k.startswith(p) and k[1:] != "00" and k not in out and (len(p) == 3 or k[2] != "0" or len(p) == 1):
                        out.append(k)
    return out
