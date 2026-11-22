"""Mehrere Adressen auf einmal (GO 23.11.2026, Mock „Adressen auswählen“ AW-3 A): Gewerk/Stichwort/Tag dazu und entfernen, Art setzen,
Projektnummer dazu/entfernen, ein Rückgängig für alle; Papierkorb nur für unbenutzte. Testdaten erfunden."""
import json
import sqlite3

import adressen_mehr as M
from lib import gleich, pruefe


def db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE contacts(id INTEGER PRIMARY KEY, name UNIQUE, trade DEFAULT '', art DEFAULT '', stichworte DEFAULT '', tags DEFAULT '',
                 extra DEFAULT '{}', updated)""")
    c.execute("INSERT INTO contacts(name, trade, stichworte, extra) VALUES('Dach GmbH', 'Dachdecker', 'Gründach', '{}'), ('Holz KG', 'Zimmerer, dachdecker', '', '{\"projektnr\": [\"A100\"]}'), ('Amt', '', '', NULL)")
    return c


class still:   # Verlauf und Papierkorb sind hier nicht Gegenstand – nur für die Dauer des Tests ersetzt, danach wieder wie vorher
    def __init__(self, **neu):
        self.neu = {"vor": lambda *a, **k: None, "nach": lambda *a, **k: None, **neu}

    def __enter__(self):
        self.alt = (M.versionen.vor, M.versionen.nach, M.K.usage, M.papierkorb.ablegen)
        M.versionen.vor, M.versionen.nach = self.neu["vor"], self.neu["nach"]
        M.K.usage = self.neu.get("usage", M.K.usage)
        M.papierkorb.ablegen = self.neu.get("ablegen", M.papierkorb.ablegen)

    def __exit__(self, *_):
        M.versionen.vor, M.versionen.nach, M.K.usage, M.papierkorb.ablegen = self.alt


def test_dazu_weg_und_zurueck():
    with still():
        _dazu_weg_und_zurueck(db())


def _dazu_weg_und_zurueck(c):
    alt = M.aendern(c, [1, 2, 3], "trade", "dazu", "Dachdecker", "t")
    gleich(sorted(alt), ["3"], "nur wer es noch nicht hat (ohne Groß/klein)")
    gleich(c.execute("SELECT trade FROM contacts WHERE id=3").fetchone()[0], "Dachdecker", "dazu")
    alt2 = M.aendern(c, [1, 2], "trade", "weg", "dachdecker", "t")
    gleich([r[0] for r in c.execute("SELECT trade FROM contacts WHERE id IN (1,2) ORDER BY id")], ["", "Zimmerer"], "entfernt")
    M.zurueck(c, alt2, "t")
    gleich([r[0] for r in c.execute("SELECT trade FROM contacts WHERE id IN (1,2) ORDER BY id")], ["Dachdecker", "Zimmerer, dachdecker"], "ein Rückgängig für alle")
    M.aendern(c, [1, 2], "art", "setzen", "behoerde", "t")
    gleich(c.execute("SELECT art FROM contacts WHERE id=2").fetchone()[0], "behoerde", "Art gesetzt")


def test_projektnummer():
    with still():
        _projektnummer(db())


def _projektnummer(c):
    alt = M.aendern(c, [1, 2, 3], "projektnr", "dazu", "a100", "t")
    gleich(sorted(alt), ["1", "3"], "Nummer groß geschrieben, nur wo sie fehlt")
    gleich(json.loads(c.execute("SELECT extra FROM contacts WHERE id=3").fetchone()[0])["projektnr"], ["A100"], "auch bei leerem extra")
    M.zurueck(c, alt, "t")
    gleich(json.loads(c.execute("SELECT extra FROM contacts WHERE id=1").fetchone()[0]), {}, "zurück")
    try:
        M.aendern(c, [1], "projektnr", "dazu", "kein Kürzel", "t")
        pruefe(False, "ungültige Nummer abgelehnt")
    except ValueError:
        pass


def test_loeschen_nur_unbenutzte():
    with still(usage=lambda c_, i: ["Bautagebuch"] if i == 2 else [], ablegen=lambda c_, t, i, *a: f"pk{i}"):
        pk, block = M.loeschen(db(), [1, 2], "t")
    gleich((pk, block), (["pk1"], ["Holz KG"]), "benutzte bleiben")
