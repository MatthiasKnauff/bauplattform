"""Wärmeschutznachweis als PDF (19.11.2026, A1 + A2, B1, C1, E1): Zeichnen ohne Datenbank, Eingaben aus dem Browser gesäubert."""
from bpcore import layout
from lib import gleich, pruefe
import waermeschutz_pdf as W

BT = {"name": "AW 1 Außenwand <WDVS>", "art": "Außenwand · Anlage 7 Nr. 1b", "flaeche": 142.5, "u": 0.198, "umax": 0.24, "ok": True,
      "rsi": 0.13, "rse": 0.04, "rt": 5.05, "schichten": [{"name": "KS 2.0 Allplan", "baustoff": "Kalksand-Vollstein 1800", "d": 17.5, "lam": 0.99, "r": 0.177},
                                                       {"name": "EPS 035", "baustoff": "EPS 035", "d": 16, "lam": 0.035, "r": 4.571}],
      "temp": [[0, 19.2], [17.5, 18.6], [33.5, -4.9]], "glaser": {"tauwasser": True, "mc": 0.12, "mev": 0.4, "ps": [[0, 2200], [6.8, 420]], "p": [[0, 1168], [6.8, 321]]}}


def test_saeubern():
    b = W._bt({**BT, "u": "abc", "flaeche": -3, "schichten": [{"d": 1e9, "lam": 0.04}] * 50, "temp": [[0, 999]], "x": "<script>"})
    gleich((b["u"], b["flaeche"], len(b["schichten"]), b["schichten"][0]["d"], b["temp"][0][1]), (None, None, 30, None, None), "Unsinn verworfen, Listen gekürzt")
    pruefe("x" not in b, "nur bekannte Felder")


def test_bauen():
    LAY = layout.pruefen(layout.standard("waermeschutz"), "waermeschutz")
    LW = {"buero": "Büro", "datum": "19.11.2026", "projekt": "A1 Test"}
    DD = {"bauteile": [W._bt(BT), W._bt({"name": "Fenster", "u": 1.1, "umax": 1.3, "ok": True})], "fassung": "GModG", "zone": "≥ 19 °C"}
    bv = {"name": "Erika Muster", "beruf": "Architektin", "kammer": "AKNW", "kammernr": "1"}
    for teile in (list(W.TEILE), ["uebersicht"], ["deckblatt", "bauteile"]):
        pdf = W.bauen(DD, teile, {"name": "A1 Test", "client": "WEG"}, bv, LW, LAY, False, {}, "Tester")
        pruefe(pdf[:5] == b"%PDF-" and len(pdf) > 1500, f"PDF mit {teile}")
    gleich(W._diagramm(W._bt({"name": "x"}), 400, False), None, "ohne Temperaturen keine Grafik")
