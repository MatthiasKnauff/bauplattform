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
    nur wer das Recht hat entscheidet, Meldung an die Person, Zurückziehen nach Genehmigung nur mit Zustimmung."""
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
        ctx.admin.put(f"{Z}/antraege/{a['id']}", {"aktion": "ablehnen", "antwort": "zu spät"}, expect=400)   # schon entschieden
        pruefe(any(x["id"] == a["id"] for x in anna.gj(f"{Z}/bp/antraege")["meine"]), "Anna bekommt die Entscheidung gemeldet (jede App)")
        anna.post(f"{Z}/bp/antraege/{a['id']}", {"aktion": "gesehen"}, expect=200)
        pruefe(not any(x["id"] == a["id"] for x in anna.gj(f"{Z}/bp/antraege")["meine"]), "nach OK keine Meldung mehr")
        z = anna.uj(f"{Z}/antraege/{a['id']}", {"aktion": "zurueckziehen"})["antrag"]
        gleich((z["status"], z["rueckzug"]), ("genehmigt", "beantragt"), "genehmigt: Zurückziehen nur mit Zustimmung")
        pruefe(any(x["id"] == a["id"] for x in ctx.admin.gj(f"{Z}/bp/antraege")["entscheiden"]), "Wunsch erscheint bei der Verwaltung")
        ctx.admin.post(f"{Z}/bp/antraege/{a['id']}", {"aktion": "rueckzug_nein"}, expect=400)   # Begründung fehlt
        z = ctx.admin.post(f"{Z}/bp/antraege/{a['id']}", {"aktion": "rueckzug_ok"}, expect=200).json["antrag"]
        gleich(z["status"], "zurueckgezogen", "zugestimmt: zurückgezogen")
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


def test_zeit_auf_anderen_tag(ctx):
    """Woche: Zeit auf einen anderen Tag gezogen – Eintrag wandert mit Uhrzeit, alter Tag leer; zurück wie vorher; bestätigter Zieltag gesperrt."""
    anna, d0, d1 = ctx.anmelden("Anna Bauer"), "2025-03-10", "2025-03-11"
    try:
        for d in (d0, d1):
            anna.pj(f"{Z}/tag/stand", {"d": d, "stand": {"eintraege": [], "tag": {}}})
        e = anna.pj(f"{Z}/eintrag", {"d": d0, "von": "08:00", "bis": "10:00", "art": "buero"})["eintraege"][0]
        r = anna.uj(f"{Z}/eintrag/{e['id']}", {"tag": d1, "von": "13:00", "bis": "15:00"})
        gleich(([(x["von"], x["bis"]) for x in r["eintraege"]], r["alt"]), ([("13:00", "15:00")], {"tag": d0, "von": "08:00", "bis": "10:00"}), "auf den anderen Tag")
        gleich(anna.gj(f"{Z}/tag?d={d0}")["eintraege"], [], "alter Tag leer")
        r = anna.uj(f"{Z}/eintrag/{e['id']}", {"tag": d0, "von": "08:00", "bis": "10:00"})
        gleich([(x["von"], x["bis"]) for x in r["eintraege"]], [("08:00", "10:00")], "zurück wie vorher")
        anna.pj(f"{Z}/tag/bestaetigen", {"d": d1})
        anna.put(f"{Z}/eintrag/{e['id']}", {"tag": d1}, expect=400)
        anna.put(f"{Z}/eintrag/{e['id']}", {"tag": "kein-tag"}, expect=400)
    finally:
        try:
            anna.post(f"{Z}/tag/oeffnen", {"d": d1})
        except Exception:   # noqa: BLE001
            pass
        for d in (d0, d1):
            anna.pj(f"{Z}/tag/stand", {"d": d, "stand": {"eintraege": [], "tag": {}}})


def test_mitarbeiter_abwesenheiten(ctx):
    """Bereich „Mitarbeiter“: alle sehen, wer weg ist – den Grund und das Urlaubskonto nur, wer Urlaub entscheidet (und man selbst)."""
    ich = ctx.admin.gj("/verwaltung/api/me")["id"]
    ctx.admin.put(f"{Z}/abwesenheit", {"von": "2027-04-05", "bis": "2027-04-05", "art": "krank"}, expect=200)
    try:
        a = {p["id"]: p for p in ctx.anmelden("Anna Bauer").gj(f"{Z}/abwesenheiten?m=2027-04")["personen"]}
        gleich(a[ich]["abw"].get("2027-04-05"), "weg", "Kolleg:innen sehen nur „weg“")
        pruefe("rolle" not in a[ich] and "rest" not in a[ich], "kein Urlaubskonto anderer für Mitarbeiter")
        v = {p["id"]: p for p in ctx.admin.gj(f"{Z}/abwesenheiten?m=2027-04")["personen"]}
        gleich(v[ich]["abw"].get("2027-04-05"), "krank", "mit dem Recht: der Grund")
        pruefe("rest" in v[ich] and "rolle" in v[ich], "mit dem Recht: Urlaubskonto und Rolle")
    finally:
        ctx.admin.put(f"{Z}/abwesenheit", {"von": "2027-04-05", "bis": "2027-04-05", "art": ""})
