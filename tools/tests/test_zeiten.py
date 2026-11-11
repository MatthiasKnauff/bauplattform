"""Ablauftests Zeiten: Urlaubsantrag stellen, genehmigen, zurückziehen; Urlaub nur über Antrag.

Anna Bauer (alle Apps) beantragt, der Test-Admin entscheidet. Zeitraum weit in der Zukunft (März 2027), damit echte
Tage der Testdaten unberührt bleiben; am Ende wird alles zurückgenommen.
"""
from lib import gleich, pruefe

Z = "/zeiten/api"


def _tage(cl, monat):
    return {t["tag"]: t for t in cl.gj(f"{Z}/monat?m={monat}")["tage"]}


def test_urlaubsantrag(ctx):
    """Antrag (nur Arbeitstage gezählt), doppelt abgelehnt, Urlaub direkt eintragen gesperrt, Genehmigung trägt die Tage ein,
    nur die Verwaltung entscheidet, zurückziehen gibt die Tage wieder frei."""
    anna = ctx.anmelden("Anna Bauer")
    a = anna.pj(f"{Z}/antraege", {"von": "2027-03-05", "bis": "2027-03-10", "art": "urlaub", "notiz": "Ostsee", "vertretung": "Bernd"})["antrag"]
    try:
        gleich((a["status"], a["tage"]), ("offen", 4.0), "Fr 5. bis Mi 10. März 2027: 4 Arbeitstage")
        anna.post(f"{Z}/antraege", {"von": "2027-03-08", "bis": "2027-03-08", "art": "urlaub"}, expect=400)
        anna.put(f"{Z}/abwesenheit", {"von": "2027-03-15", "bis": "2027-03-15", "art": "urlaub"}, expect=403)
        anna.put(f"{Z}/antraege/{a['id']}", {"aktion": "genehmigen"}, expect=403)
        offen = ctx.admin.gj(f"{Z}/antraege?alle=1&jahr=2027")["antraege"]
        pruefe(any(x["id"] == a["id"] and "konto" in x for x in offen), "Verwaltung sieht den Antrag mit Resturlaub")
        pruefe(_tage(anna, "2027-03")["2027-03-08"]["abw"] == "", "vor der Genehmigung ist nichts eingetragen")
        g = ctx.admin.uj(f"{Z}/antraege/{a['id']}", {"aktion": "genehmigen", "antwort": "Schönen Urlaub"})["antrag"]
        gleich((g["status"], g["antwort"]), ("genehmigt", "Schönen Urlaub"), "genehmigt")
        T = _tage(anna, "2027-03")
        gleich([T[d]["abw"] for d in ("2027-03-05", "2027-03-06", "2027-03-08", "2027-03-10")], ["urlaub", "", "urlaub", "urlaub"], "Urlaub an den Arbeitstagen (Samstag frei)")
        ctx.admin.put(f"{Z}/antraege/{a['id']}", {"aktion": "ablehnen"}, expect=400)
        z = anna.uj(f"{Z}/antraege/{a['id']}", {"aktion": "zurueckziehen"})["antrag"]
        gleich(z["status"], "zurueckgezogen", "noch nicht begonnen: zurückziehen geht")
        gleich(_tage(anna, "2027-03")["2027-03-08"]["abw"], "", "Tage wieder frei")
        anna.post(f"{Z}/antraege", {"von": "2027-03-01", "bis": "2027-03-01", "art": "krank"}, expect=400)   # Krank wird direkt eingetragen
    finally:
        try:
            ctx.admin.put(f"{Z}/antraege/{a['id']}", {"aktion": "zurueckziehen"})
        except Exception:   # noqa: BLE001 – schon zurückgezogen
            pass


def test_takt_zusammenfassen_pause(ctx):
    """Takt 15 Minuten: Zeiten gerundet und verbunden; Pause in den Strahl gezogen teilt die Zeit; Rückgängig über den Stand davor;
    Takt nur 5/10/15/30 und nur für die Verwaltung."""
    anna, d = ctx.anmelden("Anna Bauer"), "2025-03-03"
    try:
        anna.pj(f"{Z}/tag/stand", {"d": d, "stand": {"eintraege": [], "tag": {}}})
        anna.pj(f"{Z}/eintrag", {"d": d, "von": "09:03", "bis": "10:00", "art": "buero"})
        r = anna.pj(f"{Z}/eintrag", {"d": d, "von": "10:00", "bis": "10:20", "art": "buero"})
        gleich([(e["von"], e["bis"]) for e in r["eintraege"]], [("09:00", "10:15")], "gerundet und zu einer Zeile verbunden")
        pruefe(len(r["vorher"]["eintraege"]) == 1, "Stand davor für Rückgängig")
        p = anna.uj(f"{Z}/tag", {"d": d, "pausen": [["09:30", "10:00"]]})
        gleich([(e["von"], e["bis"]) for e in p["eintraege"]], [("09:00", "09:30"), ("10:00", "10:15")], "Pause teilt die Zeit")
        gleich((p["pausen"], p["pausen_fest"]), ([["09:30", "10:00"]], True), "Pause als Zeitraum")
        z = anna.pj(f"{Z}/tag/stand", {"d": d, "stand": p["vorher"]})
        gleich(([(e["von"], e["bis"]) for e in z["eintraege"]], z["pausen_fest"]), ([("09:00", "10:15")], False), "Rückgängig: wie vorher")
        anna.put(f"{Z}/zeit_einst", {"takt": 10}, expect=403)
        ctx.admin.put(f"{Z}/zeit_einst", {"takt": 7}, expect=400)
        gleich(ctx.admin.uj(f"{Z}/zeit_einst", {"takt": 15})["takt"], 15, "Takt gespeichert")
    finally:
        anna.pj(f"{Z}/tag/stand", {"d": d, "stand": {"eintraege": [], "tag": {}}})
