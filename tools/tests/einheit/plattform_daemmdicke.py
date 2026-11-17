"""Dämmdicke frei wählen (bpcore/daemmdicke.py, GO 17.11.2026 D1 E1 F1): Dicke aus dem Positionstext, Dämmstoff ohne Dicke,
Preis zwischen den Nachbardicken umgerechnet (außerhalb fortgeschrieben = geschätzt), Text mit neuer Dicke – nachgebildete Datenbank."""
from bpcore import daemmdicke as D
from lib import gleich, pruefe

POS = {"023.04.001.01001": ("WDVS EPS 032, 12 cm", 80.0), "023.04.001.02001": ("WDVS EPS 032, 14 cm", 84.0),
       "023.04.001.03001": ("WDVS EPS 032, 16 cm", 88.0), "023.04.001.05001": ("WDVS EPS 032, 20 cm", 96.0),
       "023.04.004.01001": ("Brandriegel Mineralwolle im EPS-WDVS, Höhe 20 cm", 30.0),
       "038.01.001.01001": ("Alu-Unterkonstruktion bis 160 mm", 40.0), "038.01.003.01001": ("Mineralwolle 035 120 mm", 20.0)}


class _Db:
    def execute(self, sql, p=()):
        class Q(list):
            def fetchone(s): return s[0] if s else None
            def fetchall(s): return list(s)

        class R(dict):
            def dict(s): return dict(s)
        row = lambda c: R(code=c, kurz=POS[c][0], ep_von=POS[c][1] * 0.9, ep_mittel=POS[c][1], ep_bis=POS[c][1] * 1.1)  # noqa: E731
        if "code LIKE ?" in sql:
            return Q([row(c) for c in POS if c.startswith(p[0][:-1])])
        if "code=?" in sql:
            return Q([row(p[0])] if p[0] in POS else [])
        if "code IN" in sql:
            return Q([row(c) for c in p if c in POS])
        return Q()


def test_dicke_und_familie():
    gleich((D.dicke_cm("WDVS EPS 032, 16 cm"), D.dicke_cm("Trittschall EPS-T 40 mm"), D.dicke_cm("Kerndämmung, d = 14 cm")), (16.0, 4.0, 14.0), "Dicke aus dem Text")
    gleich((D.familie("WDVS EPS 16"), D.kurz("WDVS EPS 16", 15)), ("WDVS EPS", "WDVS EPS 15 cm"), "Dämmstoff ohne Dicke")
    gleich(D.text("WDVS EPS 032, 16 cm, mit Brandriegeln", 15), "WDVS EPS 032, 15 cm, mit Brandriegeln", "LV-Text mit neuer Dicke")
    gleich(D.sauber({"1": "15,3", "x": 4, "2": 50}), {"1": 15.5}, "halbe cm, 2–40 cm")


def test_preis_umgerechnet():
    c = _Db()
    gleich(D.preis(c, "023.04.001.03001", 15), {"ep_von": 77.4, "ep_mittel": 86.0, "ep_bis": 94.6, "geschaetzt": False}, "15 cm zwischen 14 und 16 cm")
    gleich(D.preis(c, "023.04.001.03001", 18)["ep_mittel"], 92.0, "18 cm zwischen 16 und 20 cm")
    x = D.preis(c, "023.04.001.03001", 10)
    gleich((x["ep_mittel"], x["geschaetzt"]), (76.0, True), "10 cm unter der kleinsten Position: fortgeschrieben, geschätzt")
    pruefe(D.preis(c, "023.04.004.01001", 15) is None or D.preis(c, "023.04.004.01001", 15)["geschaetzt"], "Brandriegel hat keine Geschwister-Dicken")


def test_daemmposition_nicht_unterkonstruktion():
    S = [{"name": "Unterkonstruktion + Dämmung", "optionen": [{"k": "UK Alu + MW 12", "teile": [["038.01.001.01001", 1.0], ["038.01.003.01001", 1.0]]}]},
         {"name": "Wärmedämmung außen", "optionen": [{"k": "WDVS EPS 16", "teile": [["023.04.001.03001", 1.0], ["023.04.004.01001", 0.36]]}]},
         {"name": "Tragschicht", "optionen": [{"k": "KS 24", "teile": []}]}]
    O = D.optionen(_Db(), S)
    gleich(O, {0: {0: ("UK Alu + MW", 12.0, "038.01.003.01001")}, 1: {0: ("WDVS EPS", 16.0, "023.04.001.03001")}}, "Dicke der Dämmung, nicht „bis 160 mm“ der UK")
