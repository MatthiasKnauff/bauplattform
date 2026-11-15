"""Ablauftests Bauherrenportal, Seite des Büros (bpcore/bauherren.py): freigeben, Konten einladen und sperren, Einstellungen –
der Schlüssel geht nie an den Browser. Das Portal selbst prüft tools/tests/einheit/plattform_bauherren_portal.py."""
from lib import gleich, pruefe


def test_bauherren(ctx):
    a = ctx.admin
    E = a.gj("/api/bp/bauherren/einst")
    pruefe("schluessel" in E and E["schluessel"] in (True, False), "nur „hinterlegt“, nie der Wert")
    a.put("/api/bp/bauherren/einst", {"schluessel": "zu kurz"}, expect=400)
    a.put("/api/bp/bauherren/einst", {"url": "ftp://x"}, expect=400)
    E = a.uj("/api/bp/bauherren/einst", {"an": False, "url": "https://bauherren.example.org/", "takt": 5, "schluessel": "k" * 40})
    gleich((E["url"], E["takt"], E["schluessel"], E["an"]), ("https://bauherren.example.org", 15, True, False), "gespeichert, Takt mindestens 15 s")
    pruefe("k" * 40 not in str(E), "Schlüssel nicht in der Antwort")
    a.post("/api/bp/bauherren/freigeben", {"pid": 0, "art": "info"}, expect=400)
    r = a.pj("/api/bp/bauherren/freigeben", {"pid": ctx.pid, "art": "termine", "schluessel": "plan", "titel": "Terminplan", "daten": {"text": "Rohbau ab KW 3"}})
    a.pj("/api/bp/bauherren/freigeben", {"pid": ctx.pid, "art": "termine", "schluessel": "plan", "titel": "Terminplan neu", "daten": {"text": "Rohbau ab KW 4"}})
    P = a.gj(f"/api/bp/bauherren/projekt/{ctx.pid}")
    gleich([f["titel"] for f in P["freigaben"] if f["schluessel"] == r["schluessel"]], ["Terminplan neu"], "derselbe Schlüssel ersetzt das alte Paket")
    a.post(f"/api/bp/bauherren/projekt/{ctx.pid}", {"email": "kein-mail"}, expect=400)
    P = a.pj(f"/api/bp/bauherren/projekt/{ctx.pid}", {"email": "Bauherr@Example.org", "name": "B. Herr"})
    gleich([(k["email"], k["aktiv"]) for k in P["konten"]], [("bauherr@example.org", 1)], "eingeladen")
    P = a.pj(f"/api/bp/bauherren/projekt/{ctx.pid}", {"email": "bauherr@example.org", "name": "B. Herr", "aktiv": False})
    gleich([k["aktiv"] for k in P["konten"]], [0], "gesperrt")
    P = a.pj(f"/api/bp/bauherren/projekt/{ctx.pid}", {"zurueck": r["schluessel"]})
    pruefe(all(f["geloescht"] for f in P["freigaben"] if f["schluessel"] == r["schluessel"]), "zurückgezogen")
    a.uj("/api/bp/bauherren/einst", {"an": False, "url": ""})
