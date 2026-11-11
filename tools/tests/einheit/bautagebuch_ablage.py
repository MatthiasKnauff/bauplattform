"""Ablegen: ähnliche Ordner erkennen (ohne Kürzel und Nummer, Synonyme) und zusammenführen (gleiche Namen „(2)“, gleicher Inhalt bleibt liegen,
leer erkennen) – an einem echten Ordner im Dateisystem, nicht auf dem Dateiserver."""
import os
import tempfile

from lib import gleich, pruefe


def test_ordner_aehnlich():
    """„A481 05_Schriftverkehr“, „Korrespondenz“ und „4.2 Post“ sind ähnlich; „Fotos“ und „Bilder“ auch; „Statik“ nicht."""
    from modules import ablage_aehnlich as A
    gleich(A.schluessel("A481 05_Schriftverkehr"), "schriftverkehr", "Kürzel und Nummer weg")
    pruefe(A.aehnlich(A.schluessel("Korrespondenz"), A.schluessel("A481 05_Schriftverkehr")), "Synonym Korrespondenz")
    pruefe(A.aehnlich(A.schluessel("4.2 Post"), A.schluessel("Schriftverkehr")), "Synonym Post")
    pruefe(A.aehnlich(A.schluessel("Bilder"), A.schluessel("A481 Fotos")), "Fotos / Bilder")
    pruefe(A.aehnlich(A.schluessel("Schriftverkehr Firmen"), A.schluessel("Schriftverkehr  firmen")), "Schreibweise")
    pruefe(not A.aehnlich(A.schluessel("Statik"), A.schluessel("Schriftverkehr")), "Statik ist etwas anderes")


def test_zusammenfuehren_ohne_verlust():
    """Unterordner werden zusammengeführt, gleiche Namen bekommen „(2)“, inhaltsgleiche Dateien bleiben liegen; danach ist die Quelle nicht leer."""
    from core import remote
    from modules import ablage_aehnlich as A
    with tempfile.TemporaryDirectory() as td:
        def schreib(p, b):
            os.makedirs(os.path.dirname(os.path.join(td, p)), exist_ok=True)
            open(os.path.join(td, p), "wb").write(b)
        schreib("alt/a.pdf", b"A"); schreib("alt/b.pdf", b"B-neu"); schreib("alt/gleich.pdf", b"G"); schreib("alt/Sub/x.pdf", b"X")
        schreib("neu/b.pdf", b"B-alt"); schreib("neu/gleich.pdf", b"G"); schreib("neu/Sub/y.pdf", b"Y")
        t = remote.Folder(td)
        if remote.NUR_LESEN:   # Testserver-Umgebung: hier nur prüfen, was geht
            return
        log, gl = [], []
        A._verschieben(t, "alt", "neu", log, gl)
        gleich(sorted(os.listdir(os.path.join(td, "neu"))), ["Sub", "a.pdf", "b (2).pdf", "b.pdf", "gleich.pdf"], "Ziel")
        gleich(sorted(os.listdir(os.path.join(td, "neu", "Sub"))), ["x.pdf", "y.pdf"], "Unterordner zusammengeführt")
        gleich(gl, ["alt/gleich.pdf"], "gleicher Inhalt bleibt liegen")
        pruefe(not A._leer(t, "alt"), "alte Quelle nicht leer (gleiche Datei liegt noch dort)")
        gleich(len(log), 3, "drei Dateien verschoben")
