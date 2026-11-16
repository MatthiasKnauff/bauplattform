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
    import gzip, json
    r = a.get(f"{B}/netz")
    n = json.loads(gzip.decompress(r.body) if (r.headers.get("Content-Encoding") or "") == "gzip" else r.body)
    pruefe(n["e"] and any(e["t"] == "w" for e in n["e"]), f"3D-Netz des gültigen Planstands: {str(n)[:200]}")
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


def test_assistent_lernt(ctx):
    """Ergänzung im Assistenten eines Projekts → Vorschlag in einem ähnlichen Projekt („1× in …“), vergessen."""
    a = ctx.admin
    andere = next((p for p in ctx.projekte if p["id"] != ctx.pid), None)
    pruefe(andere, "zweites Testprojekt fehlt")

    def setzen(pid, ass):
        d = a.gj(f"{GM}/api/bp/modell/{pid}")
        m = dict(d["modell"], assistent=ass)
        return a.put(f"{GM}/api/bp/modell/{pid}", {"modell": m, "rev": d["rev"]}).json
    setzen(ctx.pid, {"type": "k:ef:nb::", "area": 150, "units": 1, "floors": 2, "notiz": {"bau": ["Radonvorsorge prüfen (RT)"]},
                     "custom": [{"id": "eigrt1", "n": "Blower-Door-Messung (RT)", "ph": "abschluss", "d": 1, "gw": "Energieberatung"}]})
    setzen(andere["id"], {"type": "k:ef:nb::", "area": 190, "units": 1, "floors": 2})
    V = a.gj(f"{GM}/api/bp/modell/{andere['id']}/lernen")
    t = {v["text"]: v for v in V}
    pruefe("Radonvorsorge prüfen (RT)" in t and "Blower-Door-Messung (RT)" in t, f"Vorschläge im ähnlichen Projekt: {[v['text'] for v in V]}")
    gleich((t["Radonvorsorge prüfen (RT)"]["n"], t["Blower-Door-Messung (RT)"]["daten"].get("gw")), (1, "Energieberatung"), "Herkunft „1×“ und Daten der Leistung")
    setzen(andere["id"], {"type": "k:mf:um::", "area": 190, "units": 4, "floors": 3})
    pruefe(not any(v["text"].endswith("(RT)") for v in a.gj(f"{GM}/api/bp/modell/{andere['id']}/lernen")), "anderes Gebäude: keine Vorschläge")
    G = a.pj(f"{GM}/api/bp/modell/{ctx.pid}/gelernt/vergessen", {"schluessel": t["Radonvorsorge prüfen (RT)"]["schluessel"]})
    pruefe(not any(x["text"] == "Radonvorsorge prüfen (RT)" for x in G), "vergessen")


def test_startdaten(ctx):
    """Startdaten aus dem Gebäudemodell (Schritt 7): Bauantrag liest Geschosse, BRI und Art aus dem Modell – nicht bei getrennter Linie;
    Kosten „Leer anfangen“ ohne Bauteile; LV-Entwurf aus dem Modell."""
    a, pid = ctx.admin, ctx.pid
    B = f"{GM}/api/bp/modell/{pid}"
    d = a.gj(B)
    m = dict(d["modell"], geschosse=[{"id": "g1", "name": "EG", "flaeche": 100, "hoehe": 2.8}, {"id": "g2", "name": "1.OG", "flaeche": 90, "hoehe": 2.8}],
             assistent=dict(d["modell"].get("assistent") or {}, type="k:ef:nb::", floors=2, units=1))
    a.put(B, {"modell": m, "rev": d["rev"]})
    an = a.pj("/bauantrag/api/antraege", {"project_id": pid, "name": ctx.name("Startdaten")})
    aid = an["antrag"]["id"]
    try:
        F = {f["key"]: f for f in an["felder"]}
        gleich((F["bri"]["wert"], F["bri"]["quelle"]), ("532.0", "Gebäudemodell"), "BRI aus Geschossflächen × Höhen")
        pruefe(F["geschosse"]["quelle"] != "Gebäudemodell" or F["geschosse"]["wert"] == "2", f"Vollgeschosse: {F['geschosse']}")
        a.put(f"{B}/link/bauantrag", {"zustand": "getrennt"})
        F2 = {f["key"]: f for f in a.gj(f"/bauantrag/api/antraege/{aid}")["felder"]}
        pruefe(not any(f["quelle"] == "Gebäudemodell" for f in F2.values()), "getrennte Linie: nichts aus dem Modell")
    finally:
        a.put(f"{B}/link/bauantrag", {"zustand": "lebendig", "uebernahme": "uebernahme"})
        a.delete(f"/bauantrag/api/antraege/{aid}", expect=None)
    bk = a.pj("/baukosten/api/bk", {"project_id": pid, "name": ctx.name("Leer"), "modell": False})
    try:
        gleich(bk["data"].get("bauteile") or [], [], "„Leer anfangen“: keine Bauteile aus dem Modell")
    finally:
        a.delete(f"/baukosten/api/bk/{bk['id']}", expect=None)
    lv = a.pj("/ava/api/lv", {"project_id": pid, "name": ctx.name("Aus Modell"), "gewerk": "Rohbau"})
    try:
        r = a.post(f"/ava/api/lv/{lv['id']}/aus-modell", {}, expect=None)
        pruefe(r.status == 200 and isinstance(r.json["data"]["items"], list) or r.status == 400 and "Gebäudemodell" in r.json["error"], f"LV aus dem Modell: {r.status} {str(r.json)[:200]}")
    finally:
        a.delete(f"/ava/api/lv/{lv['id']}", expect=None)
