"""Bauzeitenplan zum Ansehen (bpcore/zeitplan.py, 17.11.2026): dieselben Zeilen für die Link-Ansicht und das Bauherrenportal;
für Bauherr:innen als Vorgabe nur Bauphasen und Meilensteine (bauherren_kopf.termine_filtern)."""
from lib import gleich, pruefe

from bpcore import bauherren_kopf, zeitplan

PLAN = {"tasks": [{"uid": 1, "name": "Rohbau", "lvl": 0}, {"uid": 2, "name": "Mauerwerk", "lvl": 1, "dur": 10, "pct": 50, "gw": "Rohbau", "res": "Bau GmbH", "notes": "geheim"},
                  {"uid": 3, "name": "Decke", "lvl": 1, "dur": 5, "pct": 0, "gw": "Rohbau"}, {"uid": 4, "name": "Richtfest", "lvl": 0, "dur": 0}],
        "sched": [{"uid": 1, "s": "2026-12-01", "f": "2026-12-20", "g": 1}, {"uid": 2, "s": "2026-12-01", "f": "2026-12-12"},
                  {"uid": 3, "s": "2026-12-14", "f": "2026-12-20"}, {"uid": 4, "s": "2026-12-21", "f": "2026-12-21"}],
        "gwColors": {"Rohbau": "#8a7b6b"}}


def test_zeilen():
    Z = zeitplan.zeilen(PLAN)
    gleich([z["n"] for z in Z], ["Rohbau", "Mauerwerk", "Decke", "Richtfest"], "alle Zeilen in Reihenfolge")
    gleich((Z[1]["c"], Z[1]["r"], Z[1]["p"], Z[3]["m"], Z[0]["g"]), ("#8a7b6b", "Bau GmbH", 50, 1, 1), "Farbe, Firma, Fortschritt, Meilenstein, Gruppe")
    gleich(Z[0]["p"], 33, "Gruppe: Fortschritt nach Dauer gewichtet")
    pruefe(all("notes" not in z and "_p" not in z for z in Z), "keine Notizen, keine Rechenwerte")
    pruefe("p" not in zeitplan.zeilen(PLAN, {"fortschritt": False})[0], "ohne Fortschritt kein Prozentwert")


def test_nur_phasen_fuer_bauherren():
    gleich([(z["n"], z["l"]) for z in zeitplan.nur_phasen(zeitplan.zeilen(PLAN))], [("Rohbau", 0), ("Richtfest", 0)], "nur Gruppen und Meilensteine")
    alt = bauherren_kopf.kopf
    try:
        D = {"zeitplan": {"zeilen": zeitplan.zeilen(PLAN), "fortschritt": True}, "zeilen": [["Leistung", "Beginn", "Ende"], ["▸ Rohbau", "01.12.2026", "20.12.2026"], ["Mauerwerk", "01.12.2026", "12.12.2026"]]}
        bauherren_kopf.kopf = lambda c, pid: {"termine": "phasen"}
        R = bauherren_kopf.termine_filtern(None, 1, D)
        gleich([z["n"] for z in R["zeitplan"]["zeilen"]], ["Rohbau", "Richtfest"], "Vorgabe: Balkenplan nur Bauphasen")
        gleich([z[0] for z in R["zeilen"][1:]], ["Rohbau"], "Tabelle ebenso")
        bauherren_kopf.kopf = lambda c, pid: {"termine": "alle"}
        gleich(len(bauherren_kopf.termine_filtern(None, 1, D)["zeitplan"]["zeilen"]), 4, "„alle Leistungen“: alles")
    finally:
        bauherren_kopf.kopf = alt
