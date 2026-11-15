"""Kontakte: Gewerk, Stichwörter und Tags als Listen (bpcore/contacts.py, besprochen am 15.11.2026) – doppelte (ohne Groß/klein) und leere
fallen weg, Semikolon zählt wie Komma; begriffe() zählt je Begriff, häufigste zuerst (Vorschläge der Kontaktmaske)."""
from bpcore import contacts as C
from lib import gleich


class _C:
    def __init__(self, rows):
        self.rows = rows

    def execute(self, *_):
        return self

    def fetchall(self):
        return self.rows


def test_liste_und_bereinigen():
    gleich(C.liste("Dachdecker; dachdecker, Klempner ,,"), ["Dachdecker", "Klempner"], "Liste ohne doppelte")
    gleich(C.bereinigen({"trade": "a, b; A", "stichworte": " Gründach ,Flachdach", "tags": "Stammfirma, stammfirma"}, partial=True),
           {"trade": "a, b", "stichworte": "Gründach, Flachdach", "tags": "Stammfirma"}, "bereinigen schreibt Listen einheitlich")


def test_begriffe():
    rows = [{"trade": "Dachdecker", "stichworte": "Gründach", "tags": "Stammfirma"}, {"trade": "dachdecker, Klempner", "stichworte": "", "tags": ""},
            {"trade": "Klempner", "stichworte": "Gründach, Flachdach", "tags": "nicht mehr beauftragen"}]
    B = C.begriffe(_C(rows))
    gleich(B["trade"], [("Dachdecker", 2), ("Klempner", 2)], "Gewerke gezählt, Schreibweise der ersten")
    gleich(B["stichworte"][0], ("Gründach", 2), "Stichwörter: häufigste zuerst")
    gleich(len(B["tags"]), 2, "Tags")
