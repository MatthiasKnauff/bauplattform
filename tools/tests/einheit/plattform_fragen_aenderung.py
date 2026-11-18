"""„Fragen und Antworten“ führt Änderungssätze aus (bpcore/fragen_aenderung.py, 18.11.2026, FA-A1 B2 C2): Satz erkennen, Kürzel tauschen
mit Rückfrage („tausche AW KS WDVS in PP“: nur den Kern oder ganz PP?)."""
from bpcore import fragen_aenderung as FA


def test_erkennen():
    for t in ("tausche „AW KS WDVS“ in „PP“", "Parkett in allen Wohnräumen hinzufügen", "alle Fenster im OG Holz-Alu", "ersetze Fliesen durch Vinyl"):
        assert FA.erkennen(t), t
    for t in ("Was kostet der Fenstertausch?", "Wann ist der Rohbau fertig", "Ist das Dach gedämmt?", ""):
        assert not FA.erkennen(t), t
    m = FA.TAUSCH.search("tausche „AW KS WDVS“ in „PP“")
    assert (m.group(1), m.group(2)) == ("AW KS WDVS", "PP"), m.groups()


def test_deutungen():
    D = FA._deutungen("AW KS WDVS", "PP")
    assert len(D) == 2 and D[1] == "PP" and "PP" in D[0] and "WDVS" in D[0] and "KS" not in D[0].split(), D
    assert FA._deutungen("AW KS WDVS", "AW PP WDVS") == ["AW PP WDVS"]
