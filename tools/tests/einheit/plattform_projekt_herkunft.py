"""Projektdaten mit Herkunft je Feld (bpcore/projekt_herkunft.py, 18.11.2026, Mock „Projektdaten mit Herkunft“: PD-A1 B1 C1)."""
from bpcore import contacts, projekt_herkunft as PH
from lib import gleich, pruefe


def test_folgen_und_ueberschreiben():
    """B1: leer = Wert der Quelle; gleich der Quelle gespeichert = leer (folgt weiter); anders = eigener Wert."""
    G = {"budget": [1210000.0, "1.210.000 €", "kosten"], "baubeginn": ["2027-03-01", "01.03.2027", "plan"]}
    gleich(PH.wirksam({"budget": None, "baubeginn": "2027-04-01"}, G), {"budget": 1210000.0, "baubeginn": "2027-04-01"}, "leer folgt, eigener bleibt")
    gleich(PH.nur_abweichendes({"budget": "1210000", "baubeginn": "2027-03-01", "nutzung": "Wohnen"}, G),
           {"budget": "", "baubeginn": "", "nutzung": "Wohnen"}, "wie die Quelle → leer")
    gleich(PH.nur_abweichendes({"budget": 52000}, G), {"budget": 52000}, "eigener Wert bleibt")
    pruefe(PH.gleich(52000, "52000,0") and not PH.gleich("a", "b"), "Vergleich nachsichtig")


def test_massnahme_aus_bauart():
    gleich(PH._massnahme("k:mf:an.um:da:d"), "Erweiterung", "Anbau → Erweiterung")
    gleich(PH._massnahme("k:ef:nb::"), "Neubau", "Neubau")
    gleich(PH._massnahme("frei"), "", "ohne Bauart nichts")


def test_bauherr_am_kontakt():
    """A1: Rechnungsanschrift, USt-IdNr. und „öffentlich“ gehören zum Kontakt – Zeilen der Anschrift bleiben, öffentlich = „ja“."""
    f = contacts.firma_bereinigen({"rechnung": "Stadt Essen\n  Rathausplatz 1 \n\n45127 Essen", "ustid": " DE 123 ", "oeffentlich": True})
    gleich((f["rechnung"], f["ustid"], f["oeffentlich"]), ("Stadt Essen\nRathausplatz 1\n45127 Essen", "DE 123", "ja"), "Firma / Rechnung")
    gleich(contacts.firma_bereinigen({"oeffentlich": ""})["oeffentlich"], "", "nicht öffentlich")
