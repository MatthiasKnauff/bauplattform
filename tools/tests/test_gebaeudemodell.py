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


def _ifc(tuer=False):
    """Kleinstes IFC aus dem Einheitstest (eine Bestandswand mit Öffnung, zwei Räume) – mit tuer=True wird aus der Fenster- eine Türöffnung
    (zweiter Planstand: eine Zeile entfällt, eine ist neu)."""
    import os, re
    t = open(os.path.join(os.path.dirname(__file__), "einheit", "plattform_bauteilliste.py"), encoding="utf-8").read()
    raw = re.search(r'IFC = b"""(.*?)"""', t, re.S).group(1).replace("\\\\", "\\").encode("latin-1")
    return raw.replace(b"'Fenster\\X\\F6ffnung'", b"'T\\X\\FCr\\X\\F6ffnung'") if tuer else raw


def test_planstaende(ctx):
    """Planstand einlesen (Entwurf mit Abgleich), übernehmen, zweiten Stand mit Zuordnung, älteren gelten lassen, aufräumen."""
    a, pid = ctx.admin, ctx.pid
    B = f"{GM}/api/bp/modell/{pid}"
    e = a.post(f"{B}/bauteile/lesen", dateien={"datei": ("stand1.ifc", _ifc(), "application/octet-stream")}).json
    vorher = a.gj(B)["modell"]["bauteilliste"]
    pruefe(e["entwurf"] and {"neu", "geaendert", "entfaellt", "gleich"} <= set(e["abgleich"]), f"Entwurf mit Abgleich: {e}")
    gleich(a.gj(B)["modell"]["bauteilliste"], vorher, "der Entwurf ändert das Modell noch nicht")
    d = a.pj(f"{B}/planstand/{e['entwurf']}/uebernehmen", {"zuordnung": {}, "name": "Entwurf"})
    L = d["modell"]["bauteilliste"]
    gleich((L["quelle"]["planstand"], [p["name"] for p in d["planstaende"]][-1]), (e["entwurf"], "Entwurf"), "erster Planstand gilt")
    f = next(z for z in L["zeilen"] if z["bereich"] == "oeffnung")
    a.pj(f"{B}/bauteile/zeile", {"id": f["id"], "status": "erneuern"})
    e2 = a.post(f"{B}/bauteile/lesen", dateien={"datei": ("stand2.ifc", _ifc(True), "application/octet-stream")}).json
    neu = [x["id"] for x in e2["abgleich"]["neu"] if x["bereich"] == "oeffnung"]
    ent = [x["id"] for x in e2["abgleich"]["entfaellt"]]
    pruefe(ent == [f["id"]] and len(neu) == 1 or not ent, f"andere Öffnung: {e2['abgleich']}")
    d2 = a.pj(f"{B}/planstand/{e2['entwurf']}/uebernehmen", {"zuordnung": {f["id"]: neu[0]} if ent and neu else {}, "name": "Werkplanung"})
    if ent and neu:
        gleich(next(z for z in d2["modell"]["bauteilliste"]["zeilen"] if z["id"] == neu[0])["status"], "erneuern", "Zuordnung: Antwort wandert mit")
    gleich(len([p for p in d2["planstaende"] if not p["archiviert"]]), 2, "zwei Planstände")
    v = a.gj(f"{B}/planstand/{e['entwurf']}")
    pruefe(v["planstand"]["name"] == "Entwurf" and "abgleich" in v, "älteren Planstand ansehen")
    d3 = a.pj(f"{B}/planstand/{e['entwurf']}", {"gilt": True})
    gleich(d3["modell"]["bauteilliste"]["quelle"]["planstand"], e["entwurf"], "älterer Planstand gilt wieder")
    gleich(next(z for z in d3["modell"]["bauteilliste"]["zeilen"] if z["id"] == f["id"])["status"], "erneuern", "mit seinen Antworten")
    a.post(f"{B}/planstand/{e['entwurf']}", {"loeschen": True}, expect=400)
    a.pj(f"{B}/planstand/{e2['entwurf']}", {"gilt": True})
    r = a.pj(f"{B}/bauteile/aufraeumen", {})
    pruefe(not any(z.get("entfaellt") for z in r["modell"]["bauteilliste"]["zeilen"]), "Aufräumen")
    a.post(f"{B}/bauteile/lesen", {"quelle": "server", "pfad": "plan.dwg"}, expect=400)
