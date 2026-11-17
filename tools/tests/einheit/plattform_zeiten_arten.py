"""Eigene Tätigkeiten in Zeiten (17.11.2026): Administrator und Geschäftsführung ergänzen die Liste für das Büro, alle anderen wählen nur aus."""
import sqlite3

from bpcore import zeiten as Z


def _db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT)")
    return c


def test_eigene_taetigkeit():
    c = _db()
    k, n = Z.arten_neu(c, "  Wettbewerb  ")
    assert k == "e_wettbewerb" and n == "Wettbewerb", (k, n)
    A = Z.arten(c)
    assert A[-1][0] == "sonst" and ("e_wettbewerb", "Wettbewerb") in A, A   # vor „Sonstiges“
    assert Z.arten_neu(c, "wettbewerb") == (k, n), "gleicher Name: kein zweiter Eintrag"
    assert Z.arten_neu(c, "Büro / Organisation") == ("buero", "Büro / Organisation"), "feste Tätigkeit wird erkannt"
    assert Z.art_ok("e_wettbewerb") and Z.art_ok("lph3") and not Z.art_ok("e_") and not Z.art_ok("x")
    try:
        Z.arten_neu(c, " ")
        assert False, "leerer Name"
    except ValueError:
        pass
