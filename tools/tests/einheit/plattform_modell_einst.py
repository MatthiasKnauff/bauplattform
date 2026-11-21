"""Einstellungen des Gebäudemodells (bpcore/modell_einst.py): Vorgabe E1 · F1, nur erlaubte Werte, Unbekanntes fällt weg."""
import sqlite3

from bpcore import modell_einst as E
from lib import gleich


def test_einst():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE bp_store(key PRIMARY KEY, data, updated, updated_by)")
    gleich(E.einst(c), {"e": "e1", "f": "f1"}, "Vorgabe")
    gleich(E.einst_setzen(c, {"f": "f2", "e": "x", "a": "a3"}, "anna"), {"e": "e1", "f": "f2"}, "nur erlaubte Werte, A–C gibt es nicht mehr")
    gleich(E.einst(c), {"e": "e1", "f": "f2"}, "gespeichert")
