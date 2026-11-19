"""Projektmodell über allen Apps (bpcore/modell.py, Etappe 1 vom 15.11.2026): Modell mit Änderungszähler, nummerierte Stände,
je App genau eine Linie mit Standard, „Alle Linien“, Einfrieren, eigenes Rückgängig der Verknüpfungen, Hinweise, Vorschlag aus Vorhandenem."""
from lib import finde, gleich, pruefe

M = "/api/bp/modell"


def _linie(d, app):
    return finde(d["links"], app=app)


def test_modell_zugang_und_standard(ctx):
    a = ctx.admin
    ctx.gast().get(f"{M}/{ctx.pid}", expect=401)
    a.get(f"{M}/99999999", expect=404)
    d = a.gj(f"{M}/{ctx.pid}")
    gleich([x["app"] for x in d["links"]], ["plaene", "termine", "kosten", "ausschreibung", "bauantrag", "waermeschutz", "honorar", "bautagebuch", "zeiten"], "je App genau eine Linie, feste Reihenfolge")
    pruefe("ki" not in d["modell"], "keine KI-Stufe mehr im Modell – das Projekt folgt der Verwaltung (Entscheidung B, 19.11.2026)")
    a.put(f"{M}/{ctx.pid}/link/gibtsnicht", {"uebernahme": "auto"}, expect=404)
    a.put(f"{M}/{ctx.pid}/link/kosten", {"uebernahme": "quatsch"}, expect=400)
    a.put(f"{M}/{ctx.pid}/link/kosten", {"zustand": "fest"}, expect=400)   # fest braucht einen Stand der App
    a.post(f"{M}/{ctx.pid}/alle", {"uebernahme": "quatsch"}, expect=400)
    a.post(f"{M}/{ctx.pid}/einfrieren", {"app": "gibtsnicht", "stand_name": "x"}, expect=400)


def test_modell_ablauf(ctx):
    a, P = ctx.admin, f"{M}/{ctx.pid}"
    a.pj(f"{P}/standard", {})
    try:
        d = a.gj(P)
        for app, richtung in (("termine", "beide"), ("kosten", "beide"), ("ausschreibung", "beide"), ("bauantrag", "zur_app"), ("plaene", "zum_modell")):
            x = _linie(d, app)
            pruefe(x["richtung"] == richtung and x["uebernahme"] == "uebernahme" and x["zustand"] == "lebendig" and not x["abweichend"], f"Standard {app}: {x}")
        gleich(_linie(d, "zeiten")["zustand"], "getrennt", "Zeiten im Standard getrennt")

        # Modell speichern: Änderungszähler schützt vor gegenseitigem Überschreiben
        d = a.uj(P, {"modell": {"einheiten": 2, "flaeche": "140,5", "geschosse": [{"name": "EG", "hoehe": 2.75}], "ki": {"extern": True}, "quatsch": 1}, "rev": d["rev"]})
        gleich(d["modell"]["flaeche"], 140.5, "Fläche")
        pruefe(d["modell"]["geschosse"][0]["name"] == "EG" and d["modell"]["ki"] == {"buero": True, "extern": True} and "quatsch" not in d["modell"], f"Modell bereinigt: {d['modell']}")
        a.put(P, {"modell": {"einheiten": 9}, "rev": d["rev"] - 1}, expect=409)

        # frühe Phase: alle Linien automatisch – feste und getrennte bleiben
        d = a.pj(f"{P}/alle", {"uebernahme": "auto"})
        pruefe(all(x["uebernahme"] == "auto" for x in d["links"] if x["zustand"] == "lebendig"), "alle lebendigen Linien automatisch")
        gleich(_linie(d, "zeiten")["uebernahme"], "uebernahme", "getrennte Linie bleibt")

        # etwas verlässt das Haus: Linie fest; die Versionen des Modells sind die Planstände (17.11.2026 – keine eigenen Modell-Stände mehr)
        d = a.pj(f"{P}/einfrieren", {"app": "ausschreibung", "stand_ref": "avalv:1@rt", "stand_name": "RT 12.11. versendet"})
        x = _linie(d, "ausschreibung")
        pruefe(x["zustand"] == "fest" and x["modell_stand"] == d["nr"] and x["stand_name"] == "RT 12.11. versendet" and x["abweichend"], f"eingefroren: {x}")
        pruefe(all("nr" in s and "gilt" in s for s in d["staende"]) and (not d["nr"] or any(s["nr"] == d["nr"] and s["gilt"] for s in d["staende"])), f"Versionen = Planstände: {d['staende'][:2]}")
        gleich(_linie(d, "kosten")["uebernahme"], "auto", "Einfrieren ändert die anderen Linien nicht")
        a.post(f"{P}/stand", {"kommentar": "x"}, expect=(404, 405))

        # eigenes Rückgängig: ein Schritt nimmt Einfrieren samt Umstellung zurück, Wiederholen bringt ihn wieder
        pruefe(d["verlauf"]["rueck"] and not d["verlauf"]["vor"], "Rückgängig möglich, Wiederholen nicht")
        d = a.pj(f"{P}/rueck", {})
        pruefe("Ausschreibung" in d["text"], f"Text des zurückgenommenen Schritts: {d['text']}")
        pruefe(_linie(d, "ausschreibung")["zustand"] == "lebendig" and d["verlauf"]["vor"], "zurückgenommen")
        d = a.pj(f"{P}/vor", {})
        pruefe(_linie(d, "ausschreibung")["zustand"] == "fest", "wiederholt")
        a.pj(f"{P}/rueck", {})
        d = a.uj(f"{P}/link/honorar", {"zustand": "getrennt"})   # neue Änderung: nichts mehr zu wiederholen
        pruefe(not d["verlauf"]["vor"] and _linie(d, "honorar")["zustand"] == "getrennt", "neue Änderung verwirft Wiederholen")
        d = a.uj(f"{P}/link/honorar", {"richtung": "beide", "zustand": "lebendig"})
        pruefe(_linie(d, "honorar")["richtung"] == "beide" and _linie(d, "honorar")["abweichend"], "Richtung umkehrbar")

        # Standard wiederherstellen: eine Linie, dann alle
        d = a.pj(f"{P}/standard", {"app": "honorar"})
        pruefe(not _linie(d, "honorar")["abweichend"], "Standard für eine Linie")
        d = a.pj(f"{P}/standard", {})
        pruefe(not any(x["abweichend"] for x in d["links"]), "Standard für alle")
        pruefe(isinstance(a.gj(f"{P}/verlauf")["eintraege"], list) and a.gj(f"{P}/hinweise") == [], "Verlauf und Hinweise lesbar")
        a.post(f"{P}/hinweis/99999999", {"status": "abgelehnt"}, expect=404)
    finally:
        a.pj(f"{P}/standard", {})


def test_modell_vorschlag(ctx):
    """Aus Vorhandenem vorschlagen: liest Bauzeitenplan, Baukosten und Projektdaten zusammen – und ändert nichts."""
    a, P = ctx.admin, f"{M}/{ctx.pid}"
    vorher = a.gj(P)
    v = a.gj(f"{P}/vorschlag")
    gleich([x["feld"] for x in v["felder"]], ["typ", "geschosse", "einheiten", "flaeche", "bgf", "raumhoehe", "raeume"], "Felder des Vorschlags")
    pruefe(all({"name", "werte", "vorschlag", "abweichung"} <= set(x) for x in v["felder"]) and isinstance(v["abweichungen"], int), f"Aufbau: {v}")
    gleich(a.gj(P)["rev"], vorher["rev"], "Vorschlag schreibt nichts")
