"""Vorbelegte Textliste (Feldart „liste“, 18.11.2026 – Vereinbarungen der Ausschreibung): [{t, an, s?}], alte Form (Liste der Texte) wird zu
Zeilen „an“; Druck nimmt nur die Zeilen „an“, ohne Wert die Standardzeilen (bpcore/stammdaten.py)."""
from bpcore import stammdaten as SD
from lib import gleich


def test_bereinigen_und_aktiv():
    gleich(SD.liste_bereinigen(["A", {"t": " B  x ", "an": False, "s": "B"}, {"t": "", "an": True}, 3]),
           [{"t": "A", "an": True}, {"t": "B x", "an": False, "s": "B"}], "alte Form, Leerzeichen, leere Zeilen")
    gleich(SD.liste_aktiv([{"t": "A", "an": True}, {"t": "B", "an": False}]), ["A"], "nur Zeilen „an“")
    gleich(SD.liste_aktiv(None, ["X", "Y"]), ["X", "Y"], "ohne Wert: Standard")
    gleich(SD.liste_aktiv([]), [], "bewusst leer")
    F = {f[0]: f for g in SD.LV for f in g[1]}
    gleich(F["vereinbarungen"][2], "liste", "Vereinbarungen als Textliste")
    gleich(any("Freistellungsbescheinigung" in t for t in SD.VEREINBARUNGEN), False, "nicht doppelt zu den Nachweisen")
