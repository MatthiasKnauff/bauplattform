"""Diktat: die Antwort der KI wird aufs erwartete Format gebracht – Vorgänge nur aus der Liste, Prozent 0–100, nichts Fremdes."""
from lib import gleich, pruefe


def test_ki_antwort_saeubern():
    from modules import diktat
    vg = [{"nr": 1, "vorgang": "Estrich EG", "firma": "Weber", "gantt_id": "g1", "uid": 7}]
    v = {"wetter": {"weather": " sonnig ", "temp": "ca. 12 °C"}, "anwesend": [{"firma": "Weber", "kopf": 3, "taetigkeit": "Estrich"}, {"firma": "", "kopf": 2}, "Quatsch"],
         "fehlt": ["Klein", ""], "fortschritt": [{"nr": 1, "pct": 140}, {"nr": 9, "pct": 50}, {"nr": "1", "pct": 10}],
         "maengel": ["Fenster undicht", 5], "notizen": [], "fremd": ["x"]}
    o = diktat._sauber(v, vg)
    gleich(o["wetter"], {"weather": "sonnig", "temp": "12"}, "Wetter")
    gleich([a["firma"] for a in o["anwesend"]], ["Weber"], "nur Einträge mit Firma")
    gleich(o["anwesend"][0]["kopf"], 3, "Anzahl")
    gleich(o["fehlt"], ["Klein"], "fehlt ohne Leere")
    gleich([(f["gantt_id"], f["uid"], f["pct"]) for f in o["fortschritt"]], [("g1", 7, 100)], "nur bekannte Vorgänge, höchstens 100 %")
    gleich(o["maengel"], ["Fenster undicht"], "nur Text")
    pruefe("fremd" not in o, "unbekannte Felder fallen weg")
