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
    # andere Tests legen vorher evtl. „Von Hand“ an (erste Zeile ohne Plan) – für diesen Test beiseite (Papierkorb), am Ende zurück
    alt = a.gj(f"{B}/planstaende")
    alt_pk = [a.post(f"{B}/planstand/{p['id']}", {"loeschen": True}).json["papierkorb"]
              for p in sorted(alt["planstaende"], key=lambda p: p["id"] == alt.get("gilt"))]
    n0 = len([p for p in a.gj(f"{B}/planstaende")["planstaende"] if not p["archiviert"]])
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
    r = a.post(f"{B}/bauteile/ifc", {})   # IFC mit Maßnahmen ohne die Datei noch einmal zu wählen (beim Einlesen gespeichert, 17.11.2026)
    pruefe(r.status == 200 and r.body.startswith(b"ISO-10303-21"), f"IFC ausgeben aus dem gespeicherten Planstand: {r.status} {r.body[:120]}")
    e2 = a.post(f"{B}/bauteile/lesen", dateien={"datei": ("stand2.ifc", _ifc(True), "application/octet-stream")}).json
    neu = [x["id"] for x in e2["abgleich"]["neu"] if x["bereich"] == "oeffnung"]
    ent = [x["id"] for x in e2["abgleich"]["entfaellt"]]
    pruefe(ent == [f["id"]] and len(neu) == 1 or not ent, f"andere Öffnung: {e2['abgleich']}")
    d2 = a.pj(f"{B}/planstand/{e2['entwurf']}/uebernehmen", {"zuordnung": {f["id"]: neu[0]} if ent and neu else {}, "name": "Werkplanung"})
    if ent and neu:
        gleich(next(z for z in d2["modell"]["bauteilliste"]["zeilen"] if z["id"] == neu[0])["status"], "erneuern", "Zuordnung: Antwort wandert mit")
    gleich(len([p for p in d2["planstaende"] if not p["archiviert"]]), n0 + 2, "zwei Planstände dazu")
    v = a.gj(f"{B}/planstand/{e['entwurf']}")
    pruefe(v["planstand"]["name"] == "Entwurf" and "abgleich" in v, "älteren Planstand ansehen")
    d3 = a.pj(f"{B}/planstand/{e['entwurf']}", {"gilt": True})
    gleich(d3["modell"]["bauteilliste"]["quelle"]["planstand"], e["entwurf"], "älterer Planstand gilt wieder")
    gleich(next(z for z in d3["modell"]["bauteilliste"]["zeilen"] if z["id"] == f["id"])["status"], "erneuern", "mit seinen Antworten")
    a.post(f"{B}/planstand/{e['entwurf']}", {"loeschen": True}, expect=400)   # gültig und es gibt andere: wer gilt danach?
    d4 = a.post(f"{B}/planstand/{e['entwurf']}", {"loeschen": True, "nachfolger": e2["entwurf"]}).json   # auch der gültige lässt sich löschen
    gleich((d4["modell"]["bauteilliste"]["quelle"]["planstand"], d4["war_gueltig"]), (e2["entwurf"], True), "gültigen gelöscht – der Nachfolger gilt")
    pruefe(d4["papierkorb"] and all(p["id"] != e["entwurf"] for p in d4["planstaende"]), "im Papierkorb, nicht mehr im Menü")
    a.post(f"{GM}/api/bp/papierkorb/{d4['papierkorb']}/zurueck", {})
    pruefe(any(p["id"] == e["entwurf"] for p in a.gj(f"{B}/planstaende")["planstaende"]), "Rückgängig: wieder da")
    a.pj(f"{B}/planstand/{e2['entwurf']}", {"gilt": True})
    r = a.pj(f"{B}/bauteile/aufraeumen", {})
    pruefe(not any(z.get("entfaellt") for z in r["modell"]["bauteilliste"]["zeilen"]), "Aufräumen")
    a.post(f"{B}/bauteile/lesen", {"quelle": "server", "pfad": "plan.dwg"}, expect=400)
    # alle Planstände löschen (17.11.2026): kein „Geist“ aus dem Plan (Fläche, Räume, Quelle), IFC ausgeben geht dann nicht
    pk = [a.post(f"{B}/planstand/{x}", {"loeschen": True}).json["papierkorb"] for x in (e["entwurf"], e2["entwurf"])]
    m = a.gj(f"{GM}/api/bp/modell/{ctx.pid}")["modell"]
    pruefe(not m["bauteilliste"].get("zeilen") and not (m["bauteilliste"].get("quelle") or {}).get("planstand") and not m.get("raeume"),
           f"nach dem letzten Planstand ist das Gebäudemodell leer: {len(m['bauteilliste'].get('zeilen') or [])} Zeilen, {len(m.get('raeume') or [])} Räume")
    pruefe(not m.get("flaeche") or (m.get("hand") or {}).get("flaeche"), f"Fläche aus dem Plan bleibt stehen: {m.get('flaeche')}")
    a.post(f"{B}/bauteile/ifc", {}, expect=400)
    # Standardbaum (17.11.2026): erste Zeile ohne Plan → Planstand „Von Hand“ mit den Fragen; die Zeile behält ihre KG (Gruppe „Außenwände“)
    L = a.post(f"{B}/bauteile/hand", {"name": "Mauerwerk Nord", "kg": "330"}).json["modell"]["bauteilliste"]
    pruefe((L.get("quelle") or {}).get("art") == "hand" and any(z["bereich"] == "frage" for z in L["zeilen"]) and any(z["kg"] == "330" and z["name"] == "Mauerwerk Nord" for z in L["zeilen"]),
           f"Von Hand anfangen: {L.get('quelle')}, {[(z['bereich'], z['kg']) for z in L['zeilen']]}")
    a.post(f"{B}/planstand/{L['quelle']['planstand']}", {"loeschen": True})
    for x in pk + alt_pk:
        a.post(f"{GM}/api/bp/papierkorb/{x}/zurueck", {})
    a.pj(f"{B}/planstand/{e2['entwurf']}", {"gilt": True})


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
    # LVs aus dem Modell: je Gewerk eines auf der obersten Ebene, Name/Gewerk/Nummer von selbst, Leistungsbereiche als Gliederungspunkte
    v = a.gj(f"/ava/api/lv/modell-vorschau?project_id={pid}")
    if v.get("error"):
        pruefe("Gebäudemodell" in v["error"], f"Vorschau ohne Bauteile: {v}")
        gleich(a.post("/ava/api/lv/aus-modell", {"project_id": pid, "gewerke": ["rohbau"]}, expect=None).status, 400, "ohne Bauteile: kein LV")
    else:
        G = v["gewerke"]
        pruefe(G and all(x["name"] and x["n"] >= 0 for x in G), f"Vorschau je Gewerk: {G}")
        r = a.pj("/ava/api/lv/aus-modell", {"project_id": pid, "gewerke": [x["key"] for x in G]})
        try:
            gleich([x["name"] for x in r["lvs"]], [x["name"] for x in G], "je Gewerk ein LV, Name = Gewerk")
            nrs = [int(x["nr"]) for x in r["lvs"]]
            gleich(nrs, list(range(nrs[0], nrs[0] + len(nrs))), "Nummern fortlaufend, die nächsten freien")
            lv = a.gj(f"/ava/api/lv/{r['lvs'][0]['id']}")
            pruefe(lv["gewerk"] == G[0]["name"] and any(x["typ"] == "titel" for x in lv["data"]["items"]), "Gewerk gesetzt, Leistungsbereiche als Gliederungspunkte")
            v2 = a.gj(f"/ava/api/lv/modell-vorschau?project_id={pid}")
            pruefe(all(x["schon"] for x in v2["gewerke"]), "zweiter Aufruf: Hinweis „schon da“ je Gewerk")
        finally:
            for x in r["lvs"]:
                a.delete(f"/ava/api/lv/{x['id']}", expect=None)


def test_rueckweg(ctx):
    """Rückweg (Schritt 8): Kosten schreiben ihr Ergebnis ins Modell, Honorar liest es dort; eine in den Kosten geänderte Menge kommt als
    Vorschlag an die Checkliste und wird angenommen; der gültige Bauzeitenplan schreibt Bauphasen, eine Leistung von Hand wird Vorschlag."""
    a, pid = ctx.admin, ctx.pid
    B = f"{GM}/api/bp/modell/{pid}"
    bk = a.pj("/baukosten/api/bk", {"project_id": pid, "name": ctx.name("Rückweg")})
    G = "/bauzeitenplan/api"
    plan, kran = None, ctx.name("Kran stellen")
    try:
        a.put(f"/baukosten/api/bk/{bk['id']}/gueltig")
        m = a.gj(B)["modell"]
        gleich(m["kosten"].get("bk_id"), bk["id"], "Ergebnis der gültigen Kostenermittlung im Modell")
        h = a.pj("/honorar/api/ueberschlag", {"project_id": pid})
        pruefe(not h.get("vorschlag") or "Gebäudemodell" in h["vorschlag"]["info"], f"Honorar liest die Kosten aus dem Modell: {h.get('vorschlag')}")
        zl = bk["data"]["bauteile"]
        if zl:
            z = zl[0]
            a.uj(f"/baukosten/api/bk/{bk['id']}", {"rev": a.gj(f"/baukosten/api/bk/{bk['id']}")["rev"], "data": {"mengen": {z["id"]: (z["menge"] or 0) + 7}}})
            V = [v for v in a.gj(f"{B}/rueckweg")["vorschlaege"] if v["app"] == "kosten"]
            pruefe(V and V[-1]["daten"]["zeilen"][0]["id"] == z["id"], f"Menge aus den Kosten als Vorschlag: {V}")
            r = a.pj(f"{B}/rueckweg/{V[-1]['id']}", {"wahl": {"0": "ja"}})
            gleich(next(x for x in r["modell"]["bauteilliste"]["zeilen"] if x["id"] == z["id"])["menge"], (z["menge"] or 0) + 7, "Vorschlag angenommen")
        T = [{"uid": 1, "name": "Rohbau", "cat": "_grp", "ph": "rohbau", "lvl": 0, "dur": 1, "preds": []},
             {"uid": 2, "name": "Mauerwerk", "cat": "mauer", "lvl": 1, "dur": 10, "preds": []},
             {"uid": 3, "name": kran, "cat": "", "lvl": 1, "dur": 2, "preds": []}]
        plan = a.post(f"{G}/projects", {"name": ctx.name("Rückweg"), "start": 20500, "nextUid": 4, "tasks": T, "cal": {"week": 5, "state": "NW", "free": []}, "trades": {}}, expect=201).json
        a.uj(f"{G}/projects/{plan['id']}/link", {"project_id": pid})
        a.put(f"{G}/projects/{plan['id']}/gueltig", {})
        p = a.gj(f"{G}/projects/{plan['id']}")
        a.uj(f"{G}/projects/{plan['id']}", {**p, "sched": [{"uid": 2, "s": "2027-03-01", "f": "2027-03-12"}, {"uid": 3, "s": "2027-02-25", "f": "2027-02-26"}]})
        R = a.gj(f"{B}/rueckweg")
        gleich(R["termine"].get("phasen", {}).get("rohbau"), {"von": "2027-02-25", "bis": "2027-03-12"}, "Bauphase aus dem gültigen Bauzeitenplan")
        unser = lambda L: [v for v in L if v["app"] == "termine" and v["daten"]["herkunft"].get("ref") == f"gantt:{plan['id']}"]   # noqa: E731 – andere Pläne im Projekt zählen nicht
        V = unser(R["vorschlaege"])
        pruefe(V and any(e["name"] == kran for e in V[-1]["daten"]["zeilen"]), f"Leistung von Hand als Vorschlag: {V}")
        a.pj(f"{B}/rueckweg/{V[-1]['id']}", {"wahl": {}})
        pruefe(not unser(a.gj(f"{B}/rueckweg")["vorschlaege"]), "abgelehnt")
        a.uj(f"{G}/projects/{plan['id']}", {**a.gj(f"{G}/projects/{plan['id']}")})
        pruefe(not unser(a.gj(f"{B}/rueckweg")["vorschlaege"]), "abgelehnter Vorschlag kommt nicht wieder")
        gleich(a.put(f"{B}/rueckweg/schalter", {"termine": False}).json["schalter"]["termine"], False, "Schalter „ins Modell“ aus")
        a.put(f"{B}/rueckweg/schalter", {"termine": True})
    finally:
        for v in a.gj(f"{B}/rueckweg")["vorschlaege"]:   # nichts Offenes zurücklassen (andere Tests erwarten keine Hinweise)
            a.post(f"{B}/rueckweg/{v['id']}", {"wahl": {}}, expect=None)
        a.delete(f"/baukosten/api/bk/{bk['id']}", expect=None)
        if plan:
            a.delete(f"{G}/projects/{plan['id']}", expect=None)


def test_bauherr_gebaeude(ctx):
    """Bauherrenportal (Schritt 9): „Gebäude“ freigeben – der Kern stellt den Stand aus dem Modell zusammen (was der Browser schickt, zählt
    nicht) und lässt die Linien, wie sie sind. Seit 17.11.2026 kein eigener Modell-Stand mehr (Versionen = Planstände)."""
    a, pid = ctx.admin, ctx.pid
    vorher = a.gj(f"{GM}/api/bp/modell/{pid}")
    r = a.pj("/api/bp/bauherren/freigeben", {"pid": pid, "art": "gebaeude", "schluessel": "modell", "titel": "Gebäude", "daten": {"text": "vom Browser", "kosten": 1}})
    nach = a.gj(f"{GM}/api/bp/modell/{pid}")
    gleich(nach["staende"], vorher["staende"], "keine neue Version – Versionen sind die Planstände")
    gleich([(l["app"], l["uebernahme"], l["zustand"]) for l in nach["links"]], [(l["app"], l["uebernahme"], l["zustand"]) for l in vorher["links"]], "Linien unverändert")
    P = a.gj(f"/api/bp/bauherren/projekt/{pid}")
    pruefe(any(f["schluessel"] == r["schluessel"] and f["art"] == "gebaeude" for f in P["freigaben"]), "Freigabe „Gebäude“")
    pruefe(any(x["key"] == "gebaeude" and x["an"] for x in P["bereiche"]), "Bereich „Gebäude“ im Standard an")
    a.pj(f"/api/bp/bauherren/projekt/{pid}", {"zurueck": r["schluessel"]})


def test_ki_fragen(ctx):
    """KI-Gespräch (Schritt 10): antwortet nur Ollama – ohne Ollama ein Hinweis statt externer KI; „im Netz“ nur mit eingeschalteter
    Zusatzrecherche (Verwaltung, Standard aus)."""
    a, pid = ctx.admin, ctx.pid
    B = f"{GM}/api/bp/modell/{pid}/fragen"
    a.post(B, {"frage": ""}, expect=400)
    r = a.pj(B, {"frage": "Was kostet der Fenstertausch?"})
    pruefe("hinweis" in r and "Ollama" in r["hinweis"] or "antwort" in r, f"Antwort oder Hinweis: {r}")
    pruefe(not r.get("extern"), "nie von selbst extern")
    E = a.gj("/verwaltung/api/einstellungen")
    gleich(E["ki"].get("zusatz"), False, "Zusatzrecherche im Netz: Standard aus")
    if not E["ki"].get("zusatz"):
        a.post(B, {"frage": "Was kostet ein Fenster?", "extern": True}, expect=400)
    # Projekt (Entscheidung B, 19.11.2026): folgt der Verwaltung; einzig „Keine externe KI“ in den Projektdaten sperrt extern
    D = f"/ava/api/bp/projekt/{pid}/daten"
    try:
        w = a.uj(D, {"werte": {"ki_extern_aus": True}})["werte"]
        pruefe(w.get("ki_extern_aus") is True, f"Häkchen „Keine externe KI“ gespeichert: {w.get('ki_extern_aus')}")
        st = a.gj(f"{GM}/api/bp/ki/stufen?pid={pid}")
        pruefe(not st["extern"], f"Häkchen sperrt externe KI im Projekt: {st}")   # Grund: Projekt – oder schon die Verwaltung, wenn sie extern nicht erlaubt
    finally:
        a.uj(D, {"werte": {"ki_extern_aus": False}})
    ctx.gast().post(B, {"frage": "x"}, expect=401)


def test_verfeinern_extern(ctx):
    """Verfeinern mit externer KI (16.11.2026): nur mit eingeschalteter Zusatzrecherche (Standard aus) – sonst 400; der Rückweg meldet,
    ob der Knopf erscheint; ohne Anmeldung nichts."""
    a, pid = ctx.admin, ctx.pid
    B = f"{GM}/api/bp/modell/{pid}/verfeinern"
    rw = a.gj(f"{GM}/api/bp/modell/{pid}/rueckweg")
    pruefe("extern" in rw, f"Rückweg meldet die Zusatzrecherche: {sorted(rw)}")
    if not rw["extern"]:
        a.post(B, {"was": ["luecken"]}, expect=400)
    ctx.gast().post(B, {"was": ["luecken"]}, expect=401)


def test_anweisung_und_elemente(ctx):
    """Anweisungen an das Modell und Fenster/Türen einzeln (16.11.2026): Vorschau mit Treffer aus dem Katalog bzw. Rückfrage, Anwenden nur
    mit Treffer, Zurücknehmen einer unbekannten Anweisung → 400; Türliste der Ausschreibung kennt das Modell; ohne Anmeldung nichts."""
    a, pid = ctx.admin, ctx.pid
    B = f"{GM}/api/bp/modell/{pid}"
    a.post(f"{B}/anweisung/anwenden", {"text": "x", "schritte": [{"ziel": "raum", "material": "Teppich"}]}, expect=400)
    r = a.pj(f"{B}/anweisung/vorschau", {"schritte": [{"ziel": "raum", "teil": "boden", "filter": {"geschoss": ["OG"]}, "material": "Teppich"},
                                                     {"ziel": "fenster", "filter": {"bruestung_min": 0.2}, "material": "Fensterbank Kunstmarmor"}]})
    gleich(len(r["schritte"]), 2, "zwei Schritte in der Vorschau")
    pruefe(r["schritte"][0]["beschreibung"].startswith("Böden"), f"Beschreibung: {r['schritte'][0]}")
    pruefe("treffer" in r["schritte"][0] or "rueckfrage" in r["schritte"][0], "Treffer oder Rückfrage")
    pruefe("treffer" in r["schritte"][1] or "rueckfrage" in r["schritte"][1], f"Fensterbänke: {r['schritte'][1]}")
    a.delete(f"{B}/anweisung/gibtsnicht", expect=400)
    v = a.req("POST", f"{B}/anweisung/verstehen", {"text": "Alle Räume im OG Teppich"}, expect=(200, 400))
    pruefe(v.status == 400 or v.json["schritte"], f"verstehen: {v.text[:200]}")
    t = a.gj(f"/ava/api/projekt/{pid}/tueren/modell")
    pruefe("neu" in t and "elemente" in t, f"Türliste ↔ Modell: {t}")
    ctx.gast().post(f"{B}/anweisung/vorschau", {"schritte": []}, expect=401)


def test_raum_benennen(ctx):
    """Namen eines Raums (aus den Wänden ermittelt) ändern: unbekannter Raum oder leerer Name → 400, ohne Anmeldung 401."""
    B = f"{GM}/api/bp/modell/{ctx.pid}"
    ctx.admin.post(f"{B}/raum", {"nr": "gibt-es-nicht", "name": "Wohnen"}, expect=400)
    ctx.gast().post(f"{B}/raum", {"nr": "EG.01", "name": "Wohnen"}, expect=401)


def test_modell_von_hand(ctx):
    """Ohne Plan (17.11.2026): Vorschlag des Assistenten, neuer Planstand „Assistent“ als Entwurf mit Abgleich; die Arbeitsmaske ist gesperrt,
    solange ein IFC-Planstand gilt; ohne Räume → 400."""
    a, pid = ctx.admin, ctx.pid
    B = f"{GM}/api/bp/modell/{pid}"
    v = a.gj(f"{B}/hand/vorschlag")
    pruefe(v["raeume"] and "elemente" in v, f"Vorschlag: {str(v)[:200]}")
    a.post(f"{B}/hand/entwurf", {"raeume": []}, expect=400)
    e = a.pj(f"{B}/hand/entwurf", {"raeume": [{"nr": "EG.01", "name": "Wohnen", "geschoss": "EG", "flaeche": 30}],
                                   "elemente": [{"art": "Fenster", "raum": "EG.01", "b": 1.26, "h": 1.38}]})
    pruefe(e["entwurf"] and e["art"] == "hand" and "abgleich" in e, f"Entwurf: {e}")
    Q = (a.gj(B)["modell"].get("bauteilliste") or {}).get("quelle") or {}
    if Q.get("art") not in ("hand", None, ""):
        a.put(f"{B}/hand", {"raeume": []}, expect=409)


def test_baukasten_neuer_planstand(ctx):
    """„Neuer Planstand – mit dem Baukasten“ (21.11.2026): Vorschlag Erdgeschoss + Satteldach (?neu=1), gespeichert mit dem Netz des Bausteins
    als eigener Planstand „Baukasten …“, der sofort gilt; sein 3D-Netz kommt zurück, kaputte Netze lehnt der Kern ab (dann ohne 3D)."""
    import gzip, json
    a, B = ctx.admin, f"{GM}/api/bp/modell/{ctx.pid}"
    vor = a.gj(f"{B}/planstaende")
    v = a.gj(f"{B}/baukasten?neu=1")
    gleich(([k["z"] for k in v["baukasten"]["koerper"]], [d["form"] for d in v["baukasten"]["dach"].values()], v["herkunft"]), ([0.0], ["sattel"], "leer"), "Vorschlag: Erdgeschoss mit Satteldach")
    N = {"e": [{"i": 9600000, "t": "w", "g": 0, "c": "#e8dfd2", "v": [0, 0, 0, 1200, 0, 0, 1200, 0, 290]}], "geschosse": [{"n": "Erdgeschoss", "z": 0}]}
    d = a.put(f"{B}/baukasten", {**v, "netz": N, "neu": True}).json
    L = d["modell"]["bauteilliste"]
    pruefe((L["quelle"] or {}).get("art") == "hand" and L["quelle"]["name"].startswith("Baukasten ") and L["quelle"]["planstand"] not in [p["id"] for p in vor["planstaende"]],
           f"eigener Planstand „Baukasten …“, gilt sofort: {L.get('quelle')}")
    r = a.get(f"{B}/netz")
    n = json.loads(gzip.decompress(r.body) if (r.headers.get("Content-Encoding") or "") == "gzip" else r.body)
    gleich([e["i"] for e in n["e"]], [9600000], "Netz des Bausteins am Planstand")
    a.put(f"{B}/baukasten", {**v, "netz": {"e": [{"i": 1, "t": "<x>", "v": [1]}]}})
    sid = L["quelle"]["planstand"]
    a.post(f"{B}/planstand/{sid}", {"loeschen": True, **({"nachfolger": vor["gilt"]} if vor.get("gilt") else {})})
    if vor.get("gilt"):
        a.pj(f"{B}/planstand/{vor['gilt']}", {"gilt": True})
