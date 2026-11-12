"""Ablauftests Wärmeschutz: Nachweis anlegen (Grundlagen aus dem Bauantrag), Bauteil mit Schichten anlegen und ändern, Rückgängig über „vorher“,
Stufe setzen, Eingaben säubern, Bauteilkatalog, Papierkorb. Gerechnet wird im Browser (Rechentests: tools/tests/js/waermeschutz.test.mjs)."""
from lib import gleich, pruefe

WS = "/waermeschutz/api"


def test_nachweis_bauteile_katalog(ctx):
    """Nachweis mit Bauteil anlegen, ändern, Rückgängig, Stufe, Katalog, Papierkorb."""
    a = ctx.admin
    d = a.pj(f"{WS}/nachweise", {"project_id": ctx.pid, "name": "RT Wärmeschutz"})
    nid, pk = d["nachweis"]["id"], None
    try:
        gleich((d["nachweis"]["status"], d["grundlagen"]["zone"]), ("grundlagen", "19"), "neu: Stufe Grundlagen, Zone ≥ 19 °C")
        pruefe(d["grundlagen"]["vorhaben"] in ("aenderung", "neubau"), "Vorhaben vorbelegt")
        b = {"id": "aw1", "kurz": "AW 1", "typ": "wand", "massnahme": "1b", "flaeche": "142,5",
             "schichten": [{"m": "putz_kalkgips", "d": 1.5}, {"m": "ks_1800", "d": "17,5"}, {"m": "eps_035", "d": 16, "lam": 0.032},
                           {"m": "mw_035", "d": 10, "m2": "holz_nadel", "breite": 6, "abstand": 62.5}, {"m": "x", "d": -3, "lam": "abc"}]}
        d = a.uj(f"{WS}/nachweise/{nid}", {"bauteil": b})
        B = d["bauteile"][0]
        gleich((B["kurz"], B["flaeche"], B["schichten"][1]["d"], B["schichten"][2]["lam"], len(B["schichten"])), ("AW 1", 142.5, 17.5, 0.032, 5), "Bauteil gespeichert, Zahlen mit Komma")
        gleich((B["schichten"][3]["m2"], B["schichten"][3]["abstand"]), ("holz_nadel", 62.5), "Gefach")
        pruefe(B["schichten"][4]["d"] == 0 and "lam" not in B["schichten"][4], "unsinnige Werte verworfen")
        vorher = d["vorher"]
        d = a.uj(f"{WS}/nachweise/{nid}", {"bauteil": {"id": "aw1", "name": "Außenwand WDVS"}, "grundlagen": {"baujahr": "1962", "unbekannt": "x"}, "status": "bauteile"})
        gleich((d["bauteile"][0]["name"], d["bauteile"][0]["kurz"], d["grundlagen"]["baujahr"], d["nachweis"]["status"]), ("Außenwand WDVS", "AW 1", "1962", "bauteile"), "geändert, Rest bleibt")
        pruefe("unbekannt" not in d["grundlagen"], "nur bekannte Grundlagen-Felder")
        d = a.uj(f"{WS}/nachweise/{nid}", {"stand": d["vorher"]})
        gleich((d["bauteile"][0].get("name", ""), d["nachweis"]["status"]), ("", "grundlagen"), "Rückgängig: alter Stand")
        d = a.uj(f"{WS}/nachweise/{nid}", {"bauteil": {"id": "d1", "typ": "steildach", "schichten": []}, "reihenfolge": ["d1", "aw1"]})
        gleich([x["id"] for x in d["bauteile"]], ["d1", "aw1"], "zweites Bauteil, Reihenfolge")
        d = a.uj(f"{WS}/nachweise/{nid}", {"bauteil_weg": "d1"})
        gleich([x["id"] for x in d["bauteile"]], ["aw1"], "Bauteil gelöscht")
        a.put(f"{WS}/nachweise/{nid}", {"status": "quatsch"})
        pruefe(any(x["id"] == nid for x in a.gj(f"{WS}/nachweise?project_id={ctx.pid}")["nachweise"]), "in der Liste des Projekts")
        pruefe(vorher["data"]["bauteile"] == [], "„vorher“ beim ersten Bauteil: leer")
        # Katalog
        k = a.pj(f"{WS}/katalog", {"name": "RT KS + WDVS", "typ": "wand", "schichten": B["schichten"][:3]})["id"]
        K = next(x for x in a.gj(f"{WS}/katalog")["katalog"] if x["id"] == k)
        gleich((K["typ"], len(K["schichten"])), ("wand", 3), "Aufbau im Katalog")
        a.post(f"{WS}/katalog", {"name": ""}, expect=400)
        pkk = a.delete(f"{WS}/katalog/{k}").json["papierkorb"]
        pruefe(pkk and not any(x["id"] == k for x in a.gj(f"{WS}/katalog")["katalog"]), "Katalog-Eintrag im Papierkorb")
        # Papierkorb
        pk = a.delete(f"{WS}/nachweise/{nid}").json["papierkorb"]
        a.get(f"{WS}/nachweise/{nid}", expect=404)
        a.pj(f"{WS}/bp/papierkorb/{pk}/zurueck")
        gleich(a.gj(f"{WS}/nachweise/{nid}")["nachweis"]["name"], "RT Wärmeschutz", "aus dem Papierkorb zurück")
        pk = None
    finally:
        if pk is None:
            a.delete(f"{WS}/nachweise/{nid}", expect=None)


def test_rechte_waermeschutz(ctx):
    """Gast 401; fremdes Projekt 404."""
    ctx.gast().get(f"{WS}/nachweise", expect=401)
    ctx.admin.post(f"{WS}/nachweise", {"project_id": 999999}, expect=404)
