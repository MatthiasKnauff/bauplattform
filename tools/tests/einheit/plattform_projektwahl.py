"""Projekt wählen (GO 19.11.2026, Mock „Projekt wählen – neu“: A1 B1) – bpcore/projektwahl.py: Zuletzt/Favoriten je Person, Zähler, Stand."""
import json
from datetime import date

from bpcore import projektwahl as PW
from lib import gleich, pruefe


class _C:
    def __init__(self):
        self.extra = {}

    def execute(self, sql, a=()):
        me = self

        class R:
            def fetchone(self_):
                return {"extra": json.dumps(me.extra)}
        if sql.startswith("UPDATE users"):
            me.extra = json.loads(a[0])
        return R()


def test_zuletzt_und_favoriten():
    c = _C()
    for pid in (1, 2, 3, 2, 4, 5, 6, 7):
        PW.zuletzt_merken(c, 9, pid)
    gleich(PW.zuletzt(c, 9), [7, 6, 5, 4, 2], "die letzten 5, neuestes zuerst, ohne Doppelte")
    PW.fav_setzen(c, 9, 3, True); PW.fav_setzen(c, 9, 5, True); PW.fav_setzen(c, 9, 3, False)
    gleich(PW.favoriten(c, 9), [5], "Favorit an und wieder aus")


def test_zaehler():
    E = [{"pid": 1, "faellig": "2026-11-18"}, {"pid": 1, "faellig": "2026-12-01"}, {"pid": 1, "faellig": ""}, {"pid": 2, "info": True},
         {"pid": 1, "status": "erledigt", "faellig": "2026-11-01"}, {"pid": 3, "faellig": "2026-11-01", "spaeter": "2026-11-30"}, {"pid": None}]
    gleich(PW.zaehler(E, date(2026, 11, 19)), {1: [1, 2]}, "rot = fällig, grau = offen; Hinweise, Erledigtes, Zurückgestelltes zählen nicht")


def test_stand_aus_termine():
    T = {"phasen": {"rohbau": {"von": "2026-10-01", "bis": "2026-12-20"}, "ausbau": {"von": "2027-01-10", "bis": "2027-03-01"}}}
    gleich(PW.stand_aus_termine(T, date(2026, 11, 19)), "Rohbau bis 20.12.", "laufende Bauphase")
    gleich(PW.stand_aus_termine(T, date(2026, 12, 28)), "Innenausbau ab 10.01.", "zwischen zwei Phasen: die nächste")
    gleich(PW.stand_aus_termine(T, date(2027, 5, 1)), "Bau abgeschlossen", "nach der letzten")
    pruefe(PW.stand_aus_termine({}, date(2026, 11, 19)) == "", "ohne Bauzeitenplan leer (dann Honorar)")
