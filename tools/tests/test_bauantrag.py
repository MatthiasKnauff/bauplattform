"""Ablauftests Bauantrag: anlegen, Werte aus den Quellen, von Hand ändern und zurücksetzen, Entwurfsverfasser wählen,
Bauvorlagen, Stand „eingereicht“ sperrt, PDF, Papierkorb."""
from lib import gleich, pruefe

BA = "/bauantrag/api"


def test_bauantrag(ctx):
    a = ctx.admin
    d = a.pj(f"{BA}/antraege", {"project_id": ctx.pid, "verfahren": "baugenehmigung", "name": "RT Bauantrag"})
    aid = d["antrag"]["id"]
    pk = None
    try:
        F = {f["key"]: f for f in d["felder"]}
        gleich(F["verfahren"]["wert"], "baugenehmigung", "Verfahren gesetzt")
        pruefe(F["gs_strasse"]["quelle"] in ("Projekt", ""), f"Quelle Straße: {F['gs_strasse']['quelle']}")
        pruefe(len(d["schritte"]) == 6 and d["fehlt"]["felder"], "sechs Schritte, Pflichtfelder offen")
        d = a.uj(f"{BA}/antraege/{aid}", {"felder": {"verfahrensart": "vereinfachtes Genehmigungsverfahren", "gebaeudeklasse": "3", "unbekannt": "x"}})
        F = {f["key"]: f for f in d["felder"]}
        gleich((F["verfahrensart"]["quelle"], F["gebaeudeklasse"]["wert"], F["gebaeudeklasse"]["quelle"], F["gebaeudeklasse"]["ziel"]),
               ("von Hand", "3", "Projektdaten", "Projektdaten"), "nur im Antrag bzw. in die Projektdaten zurückgeschrieben")
        d = a.uj(f"{BA}/antraege/{aid}", {"felder": {"verfahrensart": None, "gebaeudeklasse": ""}})
        pruefe(next(f for f in d["felder"] if f["key"] == "verfahrensart")["quelle"] != "von Hand", "auf die Quelle zurückgesetzt")
        d = a.uj(f"{BA}/antraege/{aid}", {"felder": {"ev_wahl": "buero"}, "bauvorlagen": {"statik": {"status": "entfaellt"}}})
        gleich(next(b for b in d["bauvorlagen"] if b["key"] == "statik")["status"], "entfaellt", "Bauvorlage entfällt")
        pruefe(next(f for f in d["felder"] if f["key"] == "ev_name")["quelle"] in ("Büro", ""), "Entwurfsverfasser aus dem Büro")
        r = a.get(f"{BA}/antraege/{aid}/antrag.pdf", expect=(200, 409))   # ohne geladene amtliche Formulare (Testlauf ohne Internet): klare Meldung
        if r.status == 409:
            pruefe("Formulare" in (r.json or {}).get("error", ""), "Hinweis auf „Formulare → Jetzt prüfen“")
        a.uj(f"{BA}/antraege/{aid}", {"status": "eingereicht"})
        a.put(f"{BA}/antraege/{aid}", {"felder": {"flur": "9"}}, expect=409)
        a.uj(f"{BA}/antraege/{aid}", {"status": "entwurf"})
        pruefe(any(x["id"] == aid for x in a.gj(f"{BA}/antraege")["antraege"]), "Antrag in der Liste")
        pk = a.delete(f"{BA}/antraege/{aid}").json["papierkorb"]
        a.get(f"{BA}/antraege/{aid}", expect=404)
        a.pj(f"/bauantrag/api/bp/papierkorb/{pk}/zurueck")
        gleich(a.gj(f"{BA}/antraege/{aid}")["antrag"]["name"], "RT Bauantrag", "aus dem Papierkorb zurück")
        pk = None
    finally:
        if pk is None:
            try:
                a.delete(f"{BA}/antraege/{aid}")
            except Exception:   # noqa: BLE001 – schon weg
                pass
