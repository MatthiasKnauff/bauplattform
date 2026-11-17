"""Abwesenheitsarten und Rückgängig (bpcore/zeiten.py, bpcore/abwesenheit.py, GO 17.11.2026): Wirkung aufs Zeitkonto,
eigene Arten mit Schlüssel aus dem Namen, signierter Rückgängig-Stand – mit nachgebildeter Datenbank."""
import json

from bpcore import abwesenheit as AB
from bpcore import zeiten as Z
from lib import gleich, pruefe


class _Db:
    def __init__(self):
        self.s = {}

    def execute(self, sql, p=()):
        class Q(list):
            def fetchone(s): return s[0] if s else None
            def fetchall(s): return list(s)
        if sql.startswith("INSERT INTO settings"):
            self.s["zeit_abw_arten"] = p[0]
            return Q()
        if "zeit_abw_arten" in sql:
            return Q([{"value": self.s["zeit_abw_arten"]}] if "zeit_abw_arten" in self.s else [])
        return Q()


def test_wirkung():
    gleich(Z._gutschrift("frei", 480), 0, "Frei/Ausgleich: aus dem Zeitkonto")
    gleich(Z._gutschrift("elternzeit", 480), 480, "ohne Soll: Saldo bleibt gleich")
    gleich(Z._gutschrift("urlaub_halb", 480), 240, "halber Urlaubstag")
    gleich(Z._gutschrift("kind_krank", 480), 480, "Kind krank: Saldo bleibt gleich")
    pruefe("sonderurlaub" in Z.ANTRAG_ARTEN and "kind_krank" not in Z.ANTRAG_ARTEN, "Sonderurlaub beantragen, Kind krank direkt")


def test_eigene_arten():
    c = _Db()
    L = Z.arten_abw_setzen(c, [{"name": "Homeoffice-Tag", "wirkung": "ausgleich", "antrag": True}, {"name": "Urlaub", "key": "urlaub", "fest": True}])
    e = [x for x in L if not x["fest"]]
    gleich([(x["key"], x["wirkung"], x["antrag"]) for x in e], [("a_homeoffice_tag", "ausgleich", True)], "Schlüssel aus dem Namen, feste bleiben fest")
    gleich(Z._gutschrift("a_homeoffice_tag", 480), 0, "Wirkung der eigenen Art zählt")
    pruefe("a_homeoffice_tag" in Z.ANTRAG_ARTEN, "eigene Art mit Antrag")
    try:
        Z.arten_abw_setzen(c, [{"name": "X", "wirkung": "quatsch"}])
        pruefe(False, "unbekannte Wirkung abgelehnt")
    except ValueError:
        pass
    Z.arten_abw_setzen(c, [])
    pruefe("a_homeoffice_tag" not in Z.ABW and "a_homeoffice_tag" not in Z.ANTRAG_ARTEN, "entfernt")
    gleich(json.loads(c.s["zeit_abw_arten"]), [], "gespeichert leer")


def test_rueck_signiert():
    t = AB._signieren("geheim", {"u": 1, "uid": 2, "tage": {"2027-05-10": "urlaub"}})
    try:
        AB.zurueck(None, {"id": 1, "name": "x"}, t[:-2] + "aa", "geheim")
        pruefe(False, "verfälschter Stand abgelehnt")
    except ValueError:
        pass
    try:
        AB.zurueck(None, {"id": 9, "name": "x"}, t, "geheim")
        pruefe(False, "andere Person abgelehnt")
    except PermissionError:
        pass
