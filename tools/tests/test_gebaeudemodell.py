"""App „Gebäudemodell“ (plattform/gebaeudemodell.py; bis 16.11.2026 „Planung“): die Seite mit Planständen, Bauteilen, Assistent und
Verknüpfungen – die Daten gehören dem Kern (Projektmodell). Geprüft: Seite und Bausteine werden ausgeliefert, das Projektmodell ist über
die App erreichbar, ohne Anmeldung 401, alte Adressen „/planung/…“ leiten weiter."""
from lib import gleich, pruefe

GM = "/gebaeudemodell"


def test_gebaeudemodell_seite_und_modell(ctx):
    a = ctx.admin
    seite = a.get(f"{GM}/").text
    pruefe('static/gebaeudemodell.js' in seite and 'id="navL"' in seite, "Seite der App „Gebäudemodell“ fehlt oder ist unvollständig")
    pruefe("bpKarte" in a.get(f"{GM}/bp/karte.js").text, "Baustein bp/karte.js wird nicht ausgeliefert")
    pruefe(a.gj(f"{GM}/api/me")["ok"] is True, "api/me")
    pruefe(any(x["key"] == "gebaeudemodell" for x in a.gj(f"{GM}/api/platform")["apps"]), "Gebäudemodell fehlt in der App-Liste")
    d = a.gj(f"{GM}/api/bp/modell/{ctx.pid}")
    gleich(len(d["links"]), 9, "je App eine Linie – über die App „Gebäudemodell“ gelesen")
    pruefe(isinstance(d.get("app_staende"), dict) and all(isinstance(v, list) and v and all(x["ref"] and x["name"] for x in v) for v in d["app_staende"].values()),
           f"Stände der Apps für die Kisten: {d.get('app_staende')}")
    ctx.gast().get(f"{GM}/api/me", expect=401)


def test_alte_adresse_leitet_weiter(ctx):
    pruefe('static/gebaeudemodell.js' in ctx.admin.get("/planung/").text, "/planung/ leitet nicht auf das Gebäudemodell weiter")
    pruefe(ctx.admin.gj("/planung/api/me")["ok"] is True, "/planung/api/… leitet nicht weiter")
