"""Dateien ändern in „Alle Dateien“ (17.11.2026, W1 X1 Y1): kopieren, verschieben, umbenennen, neuer Ordner, löschen in den Papierkorb,
wiederherstellen, Namenskonflikte (Rückfrage, beide, ersetzen) und Rückgängig über die zurückgegebenen Schritte – an einem echten Ordner
im Dateisystem, nicht auf dem Dateiserver. Dazu: der Papierkorb leert sich nach 30 Tagen."""
import os
import tempfile
from datetime import datetime, timedelta

from lib import gleich, pruefe


def _lauf(td, fn):
    from flask import Flask, g
    from core import remote
    from modules import dateiops as D
    t = remote.Folder(td)
    alt = D._ziel
    D._ziel = lambda pid: (t, ["P" + str(pid)], None)
    try:
        with Flask("t").test_request_context():
            g.user = {"name": "Test Nutzer", "id": 1}
            return fn(D)
    finally:
        D._ziel = alt


def _schreib(td, p, b=b"x"):
    os.makedirs(os.path.dirname(os.path.join(td, p)), exist_ok=True)
    with open(os.path.join(td, p), "wb") as f:
        f.write(b)


def _da(td, p):
    return os.path.exists(os.path.join(td, p))


def test_aktionen_und_rueckgaengig():
    from core import remote
    if remote.NUR_LESEN:
        return
    with tempfile.TemporaryDirectory() as td:
        _schreib(td, "P1/A/a.pdf", b"A"); _schreib(td, "P1/A/b.pdf", b"B"); _schreib(td, "P1/B/a.pdf", b"alt"); _schreib(td, "P2/X/z.pdf", b"Z")

        def ab(D):
            def los(**b):
                L, st = D.ausfuehren({"project_id": 1, **b})
                return L if st != 200 else L.schritte
            # Konflikt: a.pdf gibt es in B schon → Rückfrage
            gleich(los(art="verschieben", pfade=["A/a.pdf", "A/b.pdf"], ziel="B"), {"konflikte": ["a.pdf"]}, "Rückfrage bei gleichem Namen")
            S = los(art="verschieben", pfade=["A/a.pdf", "A/b.pdf"], ziel="B", konflikt="beide")
            pruefe(_da(td, "P1/B/a (2).pdf") and _da(td, "P1/B/b.pdf") and not _da(td, "P1/A/a.pdf"), "beide behalten: „(2)“")
            R = los(art="zurueck", schritte=S)
            pruefe(_da(td, "P1/A/a.pdf") and _da(td, "P1/A/b.pdf") and not _da(td, "P1/B/b.pdf"), "Rückgängig stellt alles zurück")
            los(art="zurueck", schritte=R)
            pruefe(_da(td, "P1/B/a (2).pdf"), "Wiederholen")
            # Ersetzen: der alte kommt in den Papierkorb, nichts geht verloren
            _schreib(td, "P1/A/a.pdf", b"neu")
            S = los(art="kopieren", pfade=["A/a.pdf"], ziel="B", konflikt="ersetzen")
            gleich(open(os.path.join(td, "P1/B/a.pdf"), "rb").read(), b"neu", "ersetzt")
            pk = [s for s in S if s["nach"][1].startswith("_Papierkorb/")]
            pruefe(pk and open(os.path.join(td, "P1", pk[0]["nach"][1]), "rb").read() == b"alt", "alte Fassung im Papierkorb")
            los(art="zurueck", schritte=S)
            gleich(open(os.path.join(td, "P1/B/a.pdf"), "rb").read(), b"alt", "Rückgängig: alte Fassung wieder da")
            # Kopie im selben Ordner bekommt „(2)“
            los(art="kopieren", pfade=["B/b.pdf"], ziel="B")
            pruefe(_da(td, "P1/B/b (2).pdf"), "Kopie daneben")
            # Umbenennen, Ordner, Löschen, Wiederherstellen
            los(art="umbenennen", pfade=["B/b (2).pdf"], name="c.pdf")
            pruefe(_da(td, "P1/B/c.pdf"), "umbenannt")
            S = los(art="ordner", ziel="A", name="Neu")
            pruefe(os.path.isdir(os.path.join(td, "P1/A/Neu")), "neuer Ordner")
            los(art="zurueck", schritte=S)
            pruefe(not _da(td, "P1/A/Neu"), "leerer Ordner wieder weg")
            S = los(art="loeschen", pfade=["B/c.pdf"])
            pruefe(not _da(td, "P1/B/c.pdf") and S[0]["nach"][1].startswith("_Papierkorb/") and S[0]["nach"][1].endswith("/B/c.pdf"), "Löschen = Papierkorb mit altem Pfad")
            los(art="wiederherstellen", pfade=[S[0]["nach"][1]])
            pruefe(_da(td, "P1/B/c.pdf"), "wiederhergestellt")
            # ganzer Ordner in ein anderes Projekt kopieren
            los(art="kopieren", pfade=["A"], ziel="X", ziel_projekt=2)
            pruefe(_da(td, "P2/X/A/a.pdf"), "Ordner mit Inhalt kopiert")
            # Fehler
            for b, txt in ((dict(art="verschieben", pfade=["A"], ziel="A/Neu"), "in sich selbst"), (dict(art="umbenennen", pfade=["B/b.pdf"], name="c.pdf"), "schon"),
                           (dict(art="kopieren", pfade=["A/a.pdf"], ziel="_Papierkorb"), "Papierkorb")):
                try:
                    D.ausfuehren({"project_id": 1, **b})
                    pruefe(False, "Fehler erwartet: " + txt)
                except D.Fehler as e:
                    pruefe(txt in str(e), f"Fehler „{txt}“: {e}")
        _lauf(td, ab)


def test_papierkorb_leeren():
    from core import remote
    from modules import dateiops as D
    if remote.NUR_LESEN:
        return
    with tempfile.TemporaryDirectory() as td:
        alt = (datetime.now() - timedelta(days=31)).strftime("%Y-%m-%d %H-%M-%S")
        neu = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d %H-%M-%S")
        _schreib(td, f"P/_Papierkorb/{alt} Anna/A/x.pdf"); _schreib(td, f"P/_Papierkorb/{neu} Bert/A/y.pdf")
        gleich(D.aufraeumen(remote.Folder(td), ["P"]), 1, "ein alter Eintrag")
        pruefe(not _da(td, f"P/_Papierkorb/{alt} Anna") and _da(td, f"P/_Papierkorb/{neu} Bert/A/y.pdf"), "nur älter als 30 Tage")


def test_liste_nachfuehren():
    """Die gespeicherte Liste „Alle Dateien“ folgt den Schritten (ohne den Ordner neu zu lesen)."""
    from modules import dateiops as D
    S = {1: {"zeit": "z", "res": {"dateien": [["A/a.pdf", 1, 5.0], ["A/S/b.pdf", 2, 6.0]], "ordner": ["A", "A/S"]}}, 2: {"zeit": "z", "res": {"dateien": [], "ordner": []}}}

    class C:
        def __init__(self):
            self.sql = []

        def execute(self, q, a=()):
            self.sql.append((q, a))
            if q.startswith("UPDATE bp_store"):
                import json
                S[int(a[1].split(":")[1])] = json.loads(a[0])
            return self
    alt = D.V.scan_laden
    D.V.scan_laden = lambda c, pid: __import__("copy").deepcopy(S.get(pid))
    try:
        D.nachfuehren(C(), [{"a": "mv", "von": [1, "A"], "nach": [1, "B"]}])
        gleich(sorted(d[0] for d in S[1]["res"]["dateien"]), ["B/S/b.pdf", "B/a.pdf"], "Dateien umgezogen")
        gleich(S[1]["res"]["ordner"], ["B", "B/S"], "Ordner umgezogen")
        D.nachfuehren(C(), [{"a": "cp", "von": [1, "B/S"], "nach": [2, "X"]}, {"a": "md", "nach": [2, "Leer"]}])
        gleich([d[0] for d in S[2]["res"]["dateien"]], ["X/b.pdf"], "Kopie im anderen Projekt")
        gleich(S[2]["res"]["ordner"], ["Leer", "X"], "leerer Ordner und kopierter Ordner")
    finally:
        D.V.scan_laden = alt
