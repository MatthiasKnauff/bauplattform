"""Eigenarten von Kopierer-Scans (bpcore/scan.py, 18.11.2026): Gerätenamen mit Zeitstempel erkennen (Konica Minolta, Canon, Ricoh,
Kyocera, Sharp, Xerox …), Zeichensalat in der Textebene, leere Rückseiten, Kopf-/Faxzeilen nie als Titel; Namensvorschlag der Ablage."""
from datetime import date

from bpcore import ablage, scan as S
from lib import gleich, pruefe


def test_scannernamen():
    for n, d in (("SKMBT_C55013050717230", date(2013, 5, 7)), ("SKM_C250i26111812300", date(2026, 11, 18)), ("KM_C250i-20261118123000", date(2026, 11, 18)),
                 ("20261118123045_00002", date(2026, 11, 18)), ("20261118123045010_0001", date(2026, 11, 18)), ("doc20261118123045", date(2026, 11, 18)),
                 ("MX-3070N_20261118_123045", date(2026, 11, 18)), ("Xerox Scan_11182026123045", date(2026, 11, 18)), ("Scan_0457", None)):
        gleich(S.scanner_name(n), (True, d), f"Scannername {n}")
    gleich(S.scanner_name("Angebot_20261118123045"), (False, date(2026, 11, 18)), "eingetippter Name vor dem Zeitstempel bleibt")
    gleich(S.scanner_name("Angebot Müller Dach")[0], False, "normaler Name")


def test_textschicht_und_kopfzeilen():
    pruefe(S.muell("(cid:3)(cid:4) " * 6), "Schrift ohne Zeichentabelle")
    pruefe(not S.muell("Angebot über Dachdeckerarbeiten am Haus Berger " * 5), "echter Text")
    pruefe(S.kopfzeile("Seite 1/3") and S.kopfzeile("18.11.2026 12:30 KONICA MINOLTA") and S.kopfzeile("Fax: 0201 123456"), "Kopierer-/Faxzeilen")
    pruefe(not S.kopfzeile("Angebot Dachdeckerarbeiten"), "Betreff bleibt")


def test_leere_seite():
    from PIL import Image, ImageDraw
    im = Image.new("L", (1000, 1400), 255)
    pruefe(S.leer(im), "weiße Seite ist leer")
    d = ImageDraw.Draw(im)
    for i in range(40):
        d.rectangle((100, 100 + i * 30, 900, 112 + i * 30), fill=0)
    pruefe(not S.leer(im), "Seite mit Text ist nicht leer")


def test_namensvorschlag():
    v = ablage.namen("SKM_C250i26111812300.pdf", "Seite 1/2\n18.11.2026 12:30 KONICA MINOLTA\nAngebot Dachdeckerarbeiten Haus Berger", "A534")
    gleich(v[0], "A534 Angebot Dachdeckerarbeiten Haus Berger 18.11.2026.pdf", "Titel aus dem Text, nicht aus der Kopfzeile")
    gleich(ablage.namen("doc20261110123045.pdf", "Nachtragsangebot Fliesenarbeiten Bad", "A534")[0],
           "A534 Nachtragsangebot Fliesenarbeiten Bad 10.11.2026.pdf", "Datum aus dem Zeitstempel des Kopierers")
