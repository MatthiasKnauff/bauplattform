"""App „Planung“ (plattform/planung.py, Etappe 4 vom 15.11.2026): die Seite mit Karte, Assistent und Ständen – ohne eigene Daten.
Geprüft: Seite und Bausteine werden ausgeliefert, das Projektmodell ist über die App erreichbar (gemeinsame Kopfleiste), ohne Anmeldung 401."""
from lib import gleich, pruefe

PL = "/planung"


def test_planung_seite_und_modell(ctx):
    a = ctx.admin
    seite = a.get(f"{PL}/").text
    pruefe('static/planung.js' in seite and 'id="navL"' in seite, "Seite der App „Planung“ fehlt oder ist unvollständig")
    pruefe("bpKarte" in a.get(f"{PL}/bp/karte.js").text, "Baustein bp/karte.js wird nicht ausgeliefert")
    pruefe(a.gj(f"{PL}/api/me")["ok"] is True, "api/me")
    pruefe(any(x["key"] == "planung" for x in a.gj(f"{PL}/api/platform")["apps"]), "Planung fehlt in der App-Liste")
    d = a.gj(f"{PL}/api/bp/modell/{ctx.pid}")
    gleich(len(d["links"]), 9, "je App eine Linie – über die App „Planung“ gelesen")
    ctx.gast().get(f"{PL}/api/me", expect=401)
