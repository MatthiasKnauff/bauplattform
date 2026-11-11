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
