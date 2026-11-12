"""Dateinamen wie im Zielordner (bpcore/dateiname.py): Muster aus vorhandenen oder von Hand getippten Namen, nächste laufende Nummer."""
from bpcore import dateiname as D
from lib import gleich, pruefe

W = {"projektnr": "A481", "firma": "Häser Malerbetriebe e.K.", "datum": "2026-11-12", "nr": ""}
ORDNER = [{"name": "A481 Maler Häser 1. AR 2026-09-01.pdf", "mtime": 1}, {"name": "A481 Maler Häser 2. AR 2026-10-05.pdf", "mtime": 2},
          {"name": "Unterordner", "dir": True, "mtime": 3}]


def test_wie_im_ordner():
    m, n = D.aus_ordner(ORDNER, W)
    gleich(m, "{projektnr} Maler {firma|Häser} {lfd}. AR {datum:iso}", "Muster aus den vorhandenen Dateien")
    gleich(n, "A481 Maler Häser 3. AR 2026-11-12.pdf", "nächste Nummer, heutiges Datum, Firma so geschrieben wie im Ordner")


def test_formate_und_nummer():
    m = D.muster("A481_Haeser_AR02_20261005.pdf", W)
    gleich(D.fuellen(m, W, ["A481_Haeser_AR01_20260901.pdf", "A481_Haeser_AR02_20261005.pdf"]), "A481_Haeser_AR03_20261112.pdf", "führende Null und kompaktes Datum")
    m = D.muster("2026-10-05 Rechnung Häser Nr. RE-1100.pdf", W)
    gleich(D.fuellen(m, {**W, "nr": "RE-1184"}), "2026-11-12 Rechnung Häser Nr. RE-1184.pdf", "Rechnungsnummer ersetzt")
    gleich(D.fuellen(m, W), "2026-11-12 Rechnung Häser.pdf", "ohne Nummer fällt „Nr.“ weg")
    gleich(D.muster("Scan_0457.pdf", W) is None or "{lfd}" in D.muster("Scan_0457.pdf", W), True, "Scannername ohne Firma/Datum")


def test_fremde_firma_und_je_firma_zaehlen():
    gleich(D.aus_ordner([{"name": "A481 Angebot Müller Bau GmbH.pdf", "mtime": 1}], {"projektnr": "A481", "firma": "Schulz GmbH"}), (None, None),
           "ein einzelner Name mit fremder Firma taugt nicht als Muster")
    m = D.muster("A541 Angebot Schulz 2026-11-12 V1.pdf", {"projektnr": "A541", "firma": "Schulz GmbH"})
    gleich(D.fuellen(m, {"projektnr": "A541", "firma": "Meier Bau GmbH", "datum": "2026-11-14"}, ["A541 Angebot Schulz 2026-11-12 V1.pdf"]),
           "A541 Angebot Meier Bau GmbH 2026-11-14 V1.pdf", "andere Firma: eigene Zählung, voller Name")
    pruefe(D.fuellen(m, {"projektnr": "A541", "firma": "Schulz GmbH", "datum": "2026-11-14"}, ["A541 Angebot Schulz 2026-11-12 V1.pdf"]).endswith("V2.pdf"),
           "gleiche Firma zählt weiter")
