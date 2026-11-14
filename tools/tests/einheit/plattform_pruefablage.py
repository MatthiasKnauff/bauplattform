"""Name der geprüften Rechnung im Projektordner (ava_pruefablage.py, besprochen am 14.11.2026): gleicher Name wie die Rechnung der Firma
mit dem Zusatz „GEPRÜFT“, nach einer erneuten Prüfung „GEPRÜFT NEU“ – ohne den Zusatz zu verdoppeln. Läuft ohne Datenbank."""
import ava_pruefablage as PA
from lib import pruefe


def test_name_geprueft():
    pruefe(PA.name_geprueft("A484 1.AR Fa. Blank.pdf") == "A484 1.AR Fa. Blank GEPRÜFT.pdf", "Zusatz GEPRÜFT")
    pruefe(PA.name_geprueft("Rechnungsprüfung/Blank/A484 1.AR Fa. Blank.PDF", True) == "A484 1.AR Fa. Blank GEPRÜFT NEU.pdf", "Pfad weg, NEU")
    pruefe(PA.name_geprueft("X GEPRÜFT.pdf", True) == "X GEPRÜFT NEU.pdf", "nicht doppelt")
    pruefe(PA.name_geprueft(".pdf") == "Rechnung GEPRÜFT.pdf", "leerer Name")
