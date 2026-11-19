"""Ablauftests Personal (14.11.2026): die Verwaltung sieht alle, Anna nur sich (und ihre Leute); fremde Person → 403; ändern nur mit
Recht „Personal“/Verwaltung (Anna: 403); Daten setzen und zurück; Gehalt nur, wenn als Feld eingestellt; Akte nur mit Recht „personal“
(ohne Ablage: verständlicher Fehler); Abwesenheit: für andere nur als Vorgesetzte:r, krank für sich sofort, Urlaub für sich nur über einen Antrag
(Vorgabe), Antrag stellen und zurückziehen; Kalender zeigt Anna nur, wen sie sieht; Einstellungen nur Verwaltung."""
from lib import gleich, pruefe

PE = "/personal/api"


def test_personal_ablauf(ctx):
    a = ctx.admin
    me = a.gj(f"{PE}/me")
    pruefe(me["alle"], "Verwaltung sieht alle")
    L = a.gj(f"{PE}/personen")
    anna = next(p for p in L["personen"] if p["name"].startswith("Anna"))
    an = ctx.anmelden("Anna Bauer")
    La = an.gj(f"{PE}/personen")
    pruefe(all(p["id"] == anna["id"] or p["vorgesetzter"] == anna["id"] for p in La["personen"]), f"Anna sieht nur sich und ihre Leute: {La['personen']}")
    pruefe(any(p["id"] == anna["id"] for p in La["personen"]), "Anna sieht sich")
    an.get(f"{PE}/personen/{me['id']}", expect=403)
    an.put(f"{PE}/personen/{anna['id']}", {"telefon": "0"}, expect=403)
    an.get(f"{PE}/personen/{anna['id']}/akte", expect=403)
    an.put(f"{PE}/einstellungen", {"frist_jahre": 1}, expect=403)

    E0 = a.gj(f"{PE}/einstellungen")
    alt = a.gj(f"{PE}/personen/{anna['id']}")
    gleich((type(alt["konto"]), type(alt["urlaubskonto"])), (str, dict), "Benutzerkonto = Anmeldename, Urlaubskonto getrennt (kein [object Object])")
    try:
        a.uj(f"{PE}/einstellungen", {"gehalt_feld": False})
        d = a.uj(f"{PE}/personen/{anna['id']}", {"telefon": "0171 RT", "eintritt": "2021-03-01", "gehalt": "999"})
        gleich((d["telefon"], d["eintritt"]), ("0171 RT", "2021-03-01"), "Daten gesetzt")
        pruefe("gehalt" not in d, "Gehalt ohne Feld: nicht gezeigt, nicht gespeichert")
        a.uj(f"{PE}/einstellungen", {"gehalt_feld": True, "frist_jahre": 4})
        d = a.uj(f"{PE}/personen/{anna['id']}", {"gehalt": "3.800 €"})
        gleich(d.get("gehalt"), "3.800 €", "Gehalt als Feld")
        pruefe("gehalt" not in an.gj(f"{PE}/personen/{anna['id']}"), "Anna sieht ihr Gehaltsfeld nicht (nur Recht „Personal“)")
        gleich(a.gj(f"{PE}/einstellungen")["frist_jahre"], 4, "Frist eingestellt")
    finally:
        a.uj(f"{PE}/personen/{anna['id']}", {k: alt.get(k, "") for k in ("telefon", "eintritt")} | {"gehalt": ""})
        a.uj(f"{PE}/einstellungen", E0)

    if me["akte"]:
        x = a.gj(f"{PE}/personen/{anna['id']}/akte")
        pruefe(x.get("error") or isinstance(x.get("dateien"), list), f"Akte ohne Ablage: {x}")

    # Abwesenheit
    an.put(f"{PE}/abwesenheit", {"uid": me["id"], "art": "krank", "von": "2031-03-04"}, expect=403)
    r = an.uj(f"{PE}/abwesenheit", {"uid": anna["id"], "art": "krank", "von": "2031-03-04", "bis": "2031-03-05"})
    try:
        gleich(r["tage"], 2, "krank: zwei Arbeitstage")
        K = an.gj(f"{PE}/abwesenheiten?monat=2031-03")
        ich = next(p for p in K["personen"] if p["id"] == anna["id"])
        gleich(ich["abw"].get("2031-03-04"), "krank", "im Kalender")
        pruefe(all(p["id"] == anna["id"] or p["id"] in {q["id"] for q in La["personen"]} for p in K["personen"]), "Kalender: nur, wen Anna sieht")
    finally:
        an.uj(f"{PE}/abwesenheit", {"uid": anna["id"], "art": "", "von": "2031-03-04", "bis": "2031-03-05"})
    if an.gj(f"{PE}/antraege")["pflicht"]:
        an.put(f"{PE}/abwesenheit", {"uid": anna["id"], "art": "urlaub", "von": "2031-03-10"}, expect=403)
    t = an.pj(f"{PE}/antraege", {"art": "urlaub", "von": "2031-03-10", "bis": "2031-03-12", "notiz": "RT Personal"})["antrag"]
    try:
        gleich((t["status"], t["tage"]), ("offen", 3), "Antrag offen, drei Tage")
        pruefe(any(x["id"] == t["id"] for x in an.gj(f"{PE}/antraege?jahr=2031")["antraege"]), "Antrag in der Liste")
    finally:
        an.uj(f"{PE}/antraege/{t['id']}", {"aktion": "zurueckziehen"})


def test_einwilligung(ctx):
    """Datenschutzhinweise (Mock „DSGVO“, 14.11.2026): Blatt als PDF, Anna (ohne Recht „Personal“) bekommt es nicht; Text der Vorlage
    ändern und zurück; die Verwaltung bekommt die Verfahrensbeschreibung der Anonymisierung als PDF."""
    a = ctx.admin
    anna = next(p for p in a.gj(f"{PE}/personen")["personen"] if p["name"].startswith("Anna"))
    an = ctx.anmelden("Anna Bauer")
    an.get(f"{PE}/personen/{anna['id']}/einwilligung.pdf", expect=403)
    an.put(f"{PE}/einwilligung/text", {"text": "## X\ny"}, expect=403)
    r = a.get(f"{PE}/personen/{anna['id']}/einwilligung.pdf")   # ohne druck=1: kein „gedruckt“ (sonst bliebe ein To-do stehen; gemerkt wird im Einheitstest)
    pruefe(r.body[:4] == b"%PDF", "Blatt ist ein PDF")
    pruefe("einw" in a.gj(f"{PE}/personen/{anna['id']}") and "einw" not in an.gj(f"{PE}/personen/{anna['id']}"), "Stand der Einwilligung nur mit Recht „Personal“")
    T0 = a.gj(f"{PE}/einwilligung/text")
    pruefe(T0["standard"] and "## Ihre Rechte" in T0["text"], "ab Werk der Entwurf")
    try:
        gleich(a.uj(f"{PE}/einwilligung/text", {"text": "## Eigen\nText"})["standard"], False, "eigener Text gespeichert")
    finally:
        a.uj(f"{PE}/einwilligung/text", {"text": T0["text"] if not T0["standard"] else ""})
    v = a.get("/verwaltung/api/ki/datenschutz/verfahren.pdf")
    pruefe(v.body[:4] == b"%PDF", "Verfahrensbeschreibung als PDF")
