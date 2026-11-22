"""Bauzeitenplan: der Leistungskatalog lernt aus den Plänen (gantt/lernen.py, Mock „Leistungskatalog: Abhängigkeiten“ C, K3-A, K7 – 22.11.2026)."""
import os
import sys

for _w in ("/app/gantt", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "gantt")):   # im Container /app/gantt, sonst das Repo
    if os.path.isfile(os.path.join(_w, "lernen.py")):
        sys.path.insert(0, _w)
        break
import lernen   # noqa: E402
from lib import gleich, pruefe   # noqa: E402


def _plan(dur, ueber=None, vor_extra=True):
    T = [{"uid": 1, "name": "Beginn", "dur": 0}, {"uid": 3, "name": "Bemusterung", "dur": 1, "lvl": 1, "cat": "bem"},
         {"uid": 2, "name": "Estrich", "dur": dur, "lvl": 1, "cat": "estrich~w0", "vs": {"d": 3, "pl": [{"uid": 1}]},
          "preds": [{"uid": 1}] + ([{"uid": 3}] if vor_extra else []), **({"ueber": ueber} if ueber else {})},
         {"uid": 4, "name": "Baustrom-Abbau", "dur": 1, "lvl": 1}]
    return {"tasks": T}


def test_dauer_links_eigene():
    R = lernen.auswerten([("A", _plan(4)), ("B", _plan(3, {"at": 3, "grund": "leistung"}))])
    gleich(sorted(x["f"] for x in R["dauer"]["estrich"]), [1.333, 2.0], "von Hand länger und überzogen mit Grund „Leistung“ (Teil-Leistung zählt zur Leistung)")
    gleich(R["links"], {"bem>estrich": ["A", "B"]}, "von Hand dazugehängter Vorgänger")
    pruefe("baustrom-abbau" in R["eigene"], "eigene Leistung in zwei Plänen")


def test_nicht_zaehlt():
    R = lernen.auswerten([("A", _plan(3, {"at": 5, "grund": "wetter"}, False)), ("B", _plan(4, None, False))])
    pruefe("estrich" not in R["dauer"], f"Wetter zählt nicht – nur ein Plan bleibt: {R['dauer']}")
    gleich(R["links"], {}, "ohne Abweichung kein Vorschlag")
    R = lernen.auswerten([("A", _plan(4))])
    gleich((R["dauer"], R["eigene"]), ({}, {}), "ein Plan allein reicht nicht")
