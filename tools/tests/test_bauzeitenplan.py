"""Ablauftests Bauzeitenplan (Gantt-App) – über den Verteiler unter /bauzeitenplan/api/….

Geprüft werden: Plan anlegen (mit Bautagebuch-Projekt verknüpft), Speichern/Laden ohne Verluste, Bereinigung ungültiger Werte,
Mehrbenutzer (Änderungszähler _rev → 409 bei veraltetem Stand, „wer ist im Plan“), benannte Versionen, Archiv, Verknüpfung,
Löschen in den Papierkorb und Wiederherstellen, Firmen/Leistungskatalog/Abschnitte/Vorgaben/Einstellungen, Rechte.
Die Terminrechnung selbst läuft im Browser (gantt/public/app.js) und wird in tools/tests/js/bauzeitenplan.test.mjs geprüft;
Druck und Export (PDF, MS-Project-XML) entstehen ebenfalls im Browser und sind hier nicht prüfbar.
Jeder Test legt eigene Pläne an (Namen über ctx.name) und räumt sie wieder ab; die beiden Testdaten-Pläne werden nur gelesen.
"""
import urllib.error
import urllib.request
import uuid
from datetime import date

from lib import finde, gleich, pruefe

G = "/bauzeitenplan/api"


def tagnr(d):
    """Datum → Tageszahl (Tage seit 1970) – so speichert der Bauzeitenplan Termine."""
    return (d - date(1970, 1, 1)).days


def leistung(uid, name, dur, lvl=0, preds=(), **mehr):
    t = {"uid": uid, "name": name, "dur": dur, "lvl": lvl, "res": "", "gw": "", "pct": 0, "notes": "", "cons": None,
         "preds": [p if isinstance(p, dict) else {"uid": p, "type": "FS", "lag": 0} for p in preds]}
    t.update(mehr)
    return t


def plan_daten(name, tasks=None, link=None):
    """Plan im Format der Oberfläche (wie bautagebuch/tools/testdaten.py)."""
    tasks = tasks if tasks is not None else [leistung(1, "Baubeginn", 0), leistung(2, "Rohbau", 10, preds=[1])]
    d = {"name": name, "start": tagnr(date(2026, 11, 2)), "nextUid": max([t.get("uid", 0) for t in tasks] or [0]) + 1, "tasks": tasks,
         "cal": {"week": 5, "state": "NW", "free": []}, "trades": {}}
    if link is not None:
        d["_link"] = link
    return d


def neuer_plan(c, name, tasks=None, link=None):
    p = c.post(f"{G}/projects", plan_daten(name, tasks, link), expect=201).json
    pruefe(p.get("id"), f"Plan ohne id angelegt: {p}")
    return p


def weg(ctx, pid):
    """Plan löschen und gleich endgültig aus dem Papierkorb entfernen (Aufräumen nach dem Test)."""
    a = ctx.admin.delete(f"{G}/projects/{pid}", expect=None)
    if a.status == 200 and (a.json or {}).get("papierkorb"):
        ctx.admin.post(f"{G}/bp/papierkorb/loeschen", {"ids": [a.json["papierkorb"]]}, expect=None)


def speichern(c, p, **aend):
    """Plan wie die Oberfläche speichern (mit dem zuletzt gelesenen Änderungszähler _rev)."""
    return c.put(f"{G}/projects/{p['id']}", {**p, **aend}, expect=200).json


def t103(ctx):
    return ctx.projekt("T103")["id"]   # ohne Bauleiter → für alle sichtbar (auch für Clara Wolf)


# ---------------------------------------------------------------------------------------------- Pläne
def test_plan_anlegen_mit_projekt(ctx):
    """Plan für ein Testprojekt anlegen: erscheint in der Liste, ist mit dem Bautagebuch-Projekt verknüpft."""
    name = ctx.name("Plan")
    p = neuer_plan(ctx.admin, name, link=t103(ctx))
    try:
        gleich(p["name"], name, "Name")
        gleich(p["_rev"], 1, "Änderungszähler eines neuen Plans")
        gleich(p["_by"], "Test-Admin", "angelegt von")
        pruefe(p["_bt"] and p["_bt"]["id"] == t103(ctx), f"Verknüpfung mit T103 fehlt: {p['_bt']}")
        pruefe("T103" in p["_bt"]["name"], f"Projektname der Verknüpfung: {p['_bt']}")
        lst = ctx.admin.gj(f"{G}/projects")
        e = finde(lst, id=p["id"])
        pruefe(e, "neuer Plan fehlt in der Liste")
        gleich(e["n"], 2, "Anzahl Leistungen in der Liste")
        gleich(e["bt_id"], t103(ctx), "verknüpftes Projekt in der Liste")
        gleich(e["archived"], False, "neuer Plan nicht archiviert")
        bt = finde(ctx.admin.gj(f"{G}/bt-projects"), id=t103(ctx))
        pruefe(bt and bt["plan"], f"Projektauswahl zeigt bei T103 keinen Plan: {bt}")
    finally:
        weg(ctx, p["id"])


def test_speichern_laden_ohne_verluste(ctx):
    """Speichern und neu Laden: Leistungen, Vorgänger, Einschränkung, Abschnitte, Kalender und Gewerke bleiben erhalten."""
    tasks = [
        leistung(1, "Rohbau", 0),
        leistung(2, "Mauerwerk EG", 10, lvl=1, gw="Rohbau", res="Rohbau Schulte & Söhne", pct=40, notes="Achse B prüfen"),
        leistung(3, "Decke über EG", 4, lvl=1, preds=[{"uid": 2, "type": "SS", "lag": 3}], cons=tagnr(date(2026, 11, 16)),
                 color="#78909c"),
        leistung(4, "Estrich", 5, preds=[{"uid": 3, "type": "FF", "lag": -1}, {"uid": 2, "type": "FS", "lag": 2}],
                 segs=[{"d": 2, "gap": 0}, {"d": 3, "gap": 4}]),
        leistung(5, "Übergabe", 0, preds=[{"uid": 4, "type": "SF", "lag": 0}]),
    ]
    p = neuer_plan(ctx.admin, ctx.name("Plan"), tasks)
    try:
        p = speichern(ctx.admin, p, cal={"week": 6, "state": "BY", "free": [{"from": "2026-12-24", "to": "2027-01-01", "name": "Betriebsferien", "yearly": True}]},
                      trades={"Rohbau": {"firm": "", "status": "beauftragt", "note": "Vertrag liegt vor", "din": "18330", "craft": "Maurer", "extra": False}},
                      gwColors={"Rohbau": "#78909c"})
        x = ctx.admin.gj(f"{G}/projects/{p['id']}")
        gleich(len(x["tasks"]), 5, "Anzahl Leistungen")
        for soll, ist in zip(tasks, x["tasks"]):
            for k in ("uid", "name", "dur", "lvl", "preds", "cons", "gw", "res", "pct", "notes"):
                gleich(ist[k], soll[k], f"Leistung {soll['uid']} Feld {k}")
        gleich(x["tasks"][2]["color"], "#78909c", "Balkenfarbe")
        gleich(x["tasks"][3]["segs"], [{"d": 2, "gap": 0}, {"d": 3, "gap": 4}], "Abschnitte (unterbrochene Leistung)")
        gleich(x["tasks"][0]["segs"], None, "keine Abschnitte")
        gleich(x["cal"], {"week": 6, "state": "BY", "free": [{"from": "2026-12-24", "to": "2027-01-01", "name": "Betriebsferien", "yearly": True}]},
               "Arbeitskalender")
        gleich(x["trades"]["Rohbau"]["din"], "18330", "DIN des Gewerks")
        gleich(x["trades"]["Rohbau"]["status"], "beauftragt", "Vergabestand")
        gleich(x["gwColors"], {"Rohbau": "#78909c"}, "Gewerkfarben")
        gleich(x["start"], tagnr(date(2026, 11, 2)), "Projektbeginn")
        gleich(x["nextUid"], 6, "nächste Nummer")
        gleich(x["_rev"], 2, "Änderungszähler nach einmal Speichern")
    finally:
        weg(ctx, p["id"])


def test_ungueltige_werte_bereinigt(ctx):
    """Ungültige Eingaben werden beim Speichern bereinigt (Prozent, Dauer, Art der Verknüpfung, Farbe, Kalender)."""
    tasks = [leistung(1, "A", -3, pct=150, color="rot", lvl=99),
             leistung(2, "B", 2.6, preds=[{"uid": 1, "type": "XY", "lag": 1.6}, {"uid": "x"}]),
             {"name": "ohne Nummer", "dur": 1}]
    d = plan_daten(ctx.name("Plan"), tasks)
    d["cal"] = {"week": 4, "state": "nrw"}
    d["nextUid"] = 1
    p = ctx.admin.post(f"{G}/projects", d, expect=201).json
    try:
        a, b, c = p["tasks"]
        gleich(a["dur"], 0, "negative Dauer → 0")
        gleich(a["pct"], 100, "Prozent höchstens 100")
        gleich(a["color"], "", "ungültige Farbe entfernt")
        gleich(a["lvl"], 20, "Ebene höchstens 20")
        gleich(b["dur"], 3, "Dauer gerundet")
        gleich(b["preds"], [{"uid": 1, "type": "FS", "lag": 2}], "unbekannte Art → EA, Zeitabstand gerundet, Vorgänger ohne Nummer entfällt")
        gleich(c["uid"], 3, "Leistung ohne Nummer bekommt die nächste freie")
        gleich(p["nextUid"], 4, "nächste Nummer größer als alle vergebenen")
        gleich(p["cal"], {"week": 5, "state": "DE", "free": []}, "ungültige Arbeitswoche/Bundesland → Standard")
    finally:
        weg(ctx, p["id"])


def test_veralteter_stand_gibt_konflikt(ctx):
    """Zwei Benutzer im selben Plan: Speichern auf veraltetem Stand → 409 mit Name des anderen; „trotzdem speichern“ geht."""
    anna = ctx.anmelden("Anna Bauer")
    p = neuer_plan(ctx.admin, ctx.name("Plan"), link=t103(ctx))
    try:
        stand_anna = anna.gj(f"{G}/projects/{p['id']}")
        gleich(stand_anna["_rev"], 1, "Anna liest Stand 1")
        neu = speichern(ctx.admin, p, name=p["name"] + " (Admin)")
        gleich(neu["_rev"], 2, "Admin speichert Stand 2")
        a = anna.put(f"{G}/projects/{p['id']}", {**stand_anna, "name": p["name"] + " (Anna)"}, expect=409)
        gleich(a.json.get("conflict"), True, "Konflikt gemeldet")
        gleich(a.json.get("rev"), 2, "aktueller Stand in der Antwort")
        gleich(a.json.get("by"), "Test-Admin", "wer zuletzt gespeichert hat")
        x = ctx.admin.gj(f"{G}/projects/{p['id']}")
        gleich(x["name"], p["name"] + " (Admin)", "abgelehnte Speicherung hat nichts überschrieben")
        gleich(x["_rev"], 2, "Änderungszähler unverändert")
        # Neu laden und auf dem aktuellen Stand speichern
        y = speichern(anna, x, name=p["name"] + " (Anna)")
        gleich(y["_rev"], 3, "Stand 3")
        gleich(y["_by"], "Anna Bauer", "zuletzt von Anna")
        # „Meine Fassung speichern“ überschreibt bewusst
        z = speichern(ctx.admin, neu, _force=True, name=p["name"] + " (erzwungen)")
        gleich(z["_rev"], 4, "erzwungenes Speichern trotz altem Stand")
        gleich(ctx.admin.gj(f"{G}/projects/{p['id']}")["name"], p["name"] + " (erzwungen)", "erzwungene Fassung gespeichert")
    finally:
        weg(ctx, p["id"])


def test_wer_arbeitet_im_plan(ctx):
    """Herzschlag: der zweite Benutzer sieht, wer den Plan noch offen hat, und den aktuellen Stand."""
    anna = ctx.anmelden("Anna Bauer")
    p = neuer_plan(ctx.admin, ctx.name("Plan"), link=t103(ctx))
    try:
        a = ctx.admin.pj(f"{G}/projects/{p['id']}/presence")
        gleich(a["others"], [], "noch niemand sonst im Plan")
        b = anna.pj(f"{G}/projects/{p['id']}/presence")
        gleich(b["others"], ["Test-Admin"], "Anna sieht den Admin")
        gleich(b["rev"], 1, "Stand im Herzschlag")
        speichern(ctx.admin, p)
        gleich(anna.pj(f"{G}/projects/{p['id']}/presence")["rev"], 2, "Herzschlag meldet den neueren Stand")
        ctx.admin.delete(f"{G}/projects/{p['id']}/presence")
        gleich(anna.pj(f"{G}/projects/{p['id']}/presence")["others"], [], "Admin hat den Plan verlassen")
        anna.delete(f"{G}/projects/{p['id']}/presence")
        gleich(ctx.admin.post(f"{G}/projects/unbekannt-{uuid.uuid4().hex[:6]}/presence", expect=404).json.get("gone"), True,
               "gelöschter/unbekannter Plan → gone")
    finally:
        weg(ctx, p["id"])


# ---------------------------------------------------------------------------------------------- Versionen
def test_benannte_versionen(ctx):
    """Benannte Versionen: anlegen, eigener Inhalt je Version, zurückholen, umbenennen, löschen."""
    p = neuer_plan(ctx.admin, ctx.name("Plan"), [leistung(1, "Rohbau", 10)])
    q = neuer_plan(ctx.admin, ctx.name("Plan2"))
    try:
        v1 = ctx.admin.post(f"{G}/projects/{p['id']}/versions", {"name": "Stand Vergabe", "note": "vor Umplanung"}, expect=201).json
        gleich(v1["name"], "Stand Vergabe", "Name")
        gleich(v1["note"], "vor Umplanung", "Notiz")
        gleich(v1["auto"], False, "benannte Version")
        gleich(v1["n"], 1, "Anzahl Leistungen")
        gleich(v1["by"], "Test-Admin", "angelegt von")
        p = speichern(ctx.admin, p, tasks=[leistung(1, "Rohbau", 12), leistung(2, "Dach", 5, preds=[1]), leistung(3, "Ausbau", 20, preds=[2])])
        v2 = ctx.admin.post(f"{G}/projects/{p['id']}/versions", {"name": "Stand Ausführung"}, expect=201).json
        gleich(v2["n"], 3, "zweite Version mit 3 Leistungen")
        lst = ctx.admin.gj(f"{G}/projects/{p['id']}/versions")
        pruefe(finde(lst, id=v1["id"]) and finde(lst, id=v2["id"]), f"Versionen fehlen in der Liste: {lst}")
        gleich(len(lst), 2, "zwei Versionen")
        # jede Version hat ihren eigenen Inhalt
        d1 = ctx.admin.gj(f"{G}/projects/{p['id']}/versions/{v1['id']}")["data"]
        gleich([(t["name"], t["dur"]) for t in d1["tasks"]], [("Rohbau", 10)], "Inhalt Version 1")
        d2 = ctx.admin.gj(f"{G}/projects/{p['id']}/versions/{v2['id']}")["data"]
        gleich([t["name"] for t in d2["tasks"]], ["Rohbau", "Dach", "Ausbau"], "Inhalt Version 2")
        # Version 1 zurückholen (wie „Wiederherstellen“ in der Oberfläche) – Version 2 bleibt unverändert
        p = speichern(ctx.admin, p, tasks=d1["tasks"], start=d1["start"])
        gleich([t["name"] for t in ctx.admin.gj(f"{G}/projects/{p['id']}")["tasks"]], ["Rohbau"], "Plan auf Version 1 zurückgesetzt")
        gleich(len(ctx.admin.gj(f"{G}/projects/{p['id']}/versions/{v2['id']}")["data"]["tasks"]), 3, "Version 2 unverändert")
        # umbenennen; automatische Zwischenstände werden durch einen Namen zu benannten
        r = ctx.admin.patch(f"{G}/projects/{p['id']}/versions/{v1['id']}", {"name": "Stand Vergabe (Bauherr)"}).json
        gleich(r["name"], "Stand Vergabe (Bauherr)", "umbenannt")
        gleich(r["note"], "vor Umplanung", "Notiz bleibt beim Umbenennen")
        va = ctx.admin.post(f"{G}/projects/{p['id']}/versions", {"auto": True}, expect=201).json
        gleich(va["auto"], True, "automatischer Zwischenstand")
        gleich(ctx.admin.patch(f"{G}/projects/{p['id']}/versions/{va['id']}", {"name": "jetzt benannt"}).json["auto"], False,
               "mit Namen kein automatischer Stand mehr")
        # Versionen gehören zu genau einem Plan
        ctx.admin.get(f"{G}/projects/{q['id']}/versions/{v1['id']}", expect=404)
        # löschen
        ctx.admin.delete(f"{G}/projects/{p['id']}/versions/{v2['id']}")
        ctx.admin.get(f"{G}/projects/{p['id']}/versions/{v2['id']}", expect=404)
        gleich(len(ctx.admin.gj(f"{G}/projects/{p['id']}/versions")), 2, "nach dem Löschen: Version 1 und der benannte Zwischenstand")
    finally:
        weg(ctx, p["id"])
        weg(ctx, q["id"])


# ---------------------------------------------------------------------------------------------- Archiv, Verknüpfung, Löschen
def test_archivieren_und_zurueckholen(ctx):
    """Plan archivieren und zurückholen, ohne ihn zu öffnen; ein offener alter Stand bekommt danach einen Konflikt."""
    p = neuer_plan(ctx.admin, ctx.name("Plan"))
    try:
        a = ctx.admin.uj(f"{G}/projects/{p['id']}/archiv", {"archiviert": True})
        gleich(a["archived"], True, "archiviert")
        gleich(a["rev"], 2, "Änderungszähler erhöht")
        gleich(finde(ctx.admin.gj(f"{G}/projects"), id=p["id"])["archived"], True, "Liste zeigt archiviert")
        gleich(ctx.admin.gj(f"{G}/projects/{p['id']}")["archived"], True, "Plan archiviert")
        ctx.admin.put(f"{G}/projects/{p['id']}", p, expect=409)   # p ist noch Stand 1
        gleich(ctx.admin.uj(f"{G}/projects/{p['id']}/archiv", {"archiviert": False})["archived"], False, "zurückgeholt")
        x = ctx.admin.gj(f"{G}/projects/{p['id']}")
        gleich(x["archived"], False, "Plan wieder aktiv")
        gleich(len(x["tasks"]), 2, "Inhalt beim Archivieren unverändert")
    finally:
        weg(ctx, p["id"])


def test_projekt_verknuepfen_und_loesen(ctx):
    """Plan nachträglich mit einem Bautagebuch-Projekt verknüpfen, wieder lösen; unbekanntes Projekt → 404."""
    p = neuer_plan(ctx.admin, ctx.name("Plan"))
    try:
        gleich(p["_bt"], None, "zunächst nicht verknüpft")
        x = ctx.admin.uj(f"{G}/projects/{p['id']}/link", {"project_id": t103(ctx)})
        gleich((x["_bt"] or {}).get("id"), t103(ctx), "verknüpft mit T103")
        pruefe("Essen" in (x["_bt"].get("address") or ""), f"Adresse des Projekts fehlt: {x['_bt']}")
        gleich(finde(ctx.admin.gj(f"{G}/projects"), id=p["id"])["bt_id"], t103(ctx), "Liste zeigt die Verknüpfung")
        gleich(ctx.admin.uj(f"{G}/projects/{p['id']}/link", {"project_id": None})["_bt"], None, "Verknüpfung gelöst")
        ctx.admin.put(f"{G}/projects/{p['id']}/link", {"project_id": 987654321}, expect=404)
        ctx.admin.put(f"{G}/projects/{p['id']}/link", {"project_id": "abc"}, expect=404)
    finally:
        weg(ctx, p["id"])


def test_loeschen_papierkorb_wiederherstellen(ctx):
    """Plan löschen → Papierkorb (mit Versionen); Wiederherstellen bringt Plan und Versionen zurück."""
    p = neuer_plan(ctx.admin, ctx.name("Plan"), [leistung(1, "Abbruch", 3), leistung(2, "Rohbau", 8, preds=[1])])
    try:
        v = ctx.admin.post(f"{G}/projects/{p['id']}/versions", {"name": "vor dem Löschen"}, expect=201).json
        d = ctx.admin.delete(f"{G}/projects/{p['id']}").json
        gleich(d.get("ok"), True, "gelöscht")
        pruefe(isinstance(d.get("papierkorb"), int), f"keine Papierkorb-ID: {d}")
        ctx.admin.get(f"{G}/projects/{p['id']}", expect=404)
        pruefe(not finde(ctx.admin.gj(f"{G}/projects"), id=p["id"]), "gelöschter Plan steht noch in der Liste")
        ctx.admin.get(f"{G}/projects/{p['id']}/versions", expect=404)
        r = ctx.admin.post(f"{G}/bp/papierkorb/{d['papierkorb']}/zurueck").json
        gleich(r.get("ok"), True, "wiederhergestellt")
        x = ctx.admin.gj(f"{G}/projects/{p['id']}")
        gleich([t["name"] for t in x["tasks"]], ["Abbruch", "Rohbau"], "Leistungen wieder da")
        gleich(x["tasks"][1]["preds"], [{"uid": 1, "type": "FS", "lag": 0}], "Vorgänger wieder da")
        pruefe(finde(ctx.admin.gj(f"{G}/projects/{p['id']}/versions"), id=v["id"]), "Version nicht wiederhergestellt")
    finally:
        weg(ctx, p["id"])


# ---------------------------------------------------------------------------------------------- Stammdaten
def test_firmen_adressbuch(ctx):
    """Firmen-Adressbuch (= Kontakte): anlegen, ändern, löschen; Anschrift und Gewerke werden zerlegt und zusammengesetzt."""
    fid = "rt-" + uuid.uuid4().hex[:8]
    name = ctx.name("Firma")
    f = {"id": fid, "name": name, "gewerke": ["Maler", "Putz"], "contact": "Petra Test", "phone": "0201 123",
         "mobile": "", "mail": "test@firma.test", "address": "Teststraße 5, 45127 Essen", "note": "aus dem Test"}
    try:
        lst = ctx.admin.uj(f"{G}/firms", {"firms": [f], "deleted": []})
        x = finde(lst, name=name)
        pruefe(x, "Firma fehlt nach dem Anlegen")
        gleich(x["id"], fid, "Gantt-ID bleibt erhalten")
        gleich(x["gewerke"], ["Maler", "Putz"], "Gewerke")
        gleich(x["address"], "Teststraße 5, 45127 Essen", "Anschrift")
        gleich(x["mail"], "test@firma.test", "E-Mail")
        pruefe(x.get("cid"), "Kontakt-ID fehlt")
        lst = ctx.admin.uj(f"{G}/firms", {"firms": [{**f, "phone": "0201 999", "gewerke": ["Maler"]}], "deleted": []})
        x = finde(lst, id=fid)
        gleich(x["phone"], "0201 999", "Telefon geändert")
        gleich(x["gewerke"], ["Maler"], "Gewerke geändert")
        gleich(sum(1 for y in lst if y["name"] == name), 1, "keine doppelte Firma")
        pruefe(finde(ctx.anmelden("Clara Wolf").gj(f"{G}/firms"), id=fid), "Clara sieht die Firma nicht")
        lst = ctx.admin.uj(f"{G}/firms", {"firms": [], "deleted": [fid]})
        pruefe(not finde(lst, id=fid), "Firma nach dem Löschen noch da")
        ctx.admin.put(f"{G}/firms", {"firms": "keine Liste"}, expect=400)
    finally:
        if finde(ctx.admin.gj(f"{G}/firms"), id=fid):
            ctx.admin.put(f"{G}/firms", {"firms": [], "deleted": [fid]}, expect=None)


def test_leistungskatalog_und_quellen(ctx):
    """Eigener Leistungskatalog: Leistung speichern (bereinigt) und laden; Leistungen aus Plänen als Quelle."""
    alt = ctx.admin.gj(f"{G}/library")
    lid = "Lrt" + uuid.uuid4().hex[:8]
    name = ctx.name("Leistung")
    p = neuer_plan(ctx.admin, ctx.name("Plan"), [leistung(1, name, 3, gw="Maler")])
    try:
        neu = ctx.admin.uj(f"{G}/library", alt + [{"id": lid, "n": name, "ph": "rohbau", "gw": "Maler", "d": 4.4, "a": ["x1", ""], "sc": "bau"},
                                                  {"n": "", "ph": "Ungültig!", "d": 0}])
        x = finde(neu, id=lid)
        pruefe(x, "Leistung fehlt nach dem Speichern")
        gleich((x["n"], x["ph"], x["gw"], x["d"], x["a"], x["sc"]), (name, "rohbau", "Maler", 4, ["x1"], "bau"), "bereinigte Leistung")
        y = neu[-1]
        gleich((y["n"], y["ph"], y["d"], y["sc"]), ("Leistung", "ausbau", 1, "we"), "Standardwerte für leere Leistung")
        pruefe(y["id"].startswith("L"), f"neue ID: {y['id']}")
        gleich(finde(ctx.admin.gj(f"{G}/library"), id=lid), x, "geladen wie gespeichert")
        ctx.admin.put(f"{G}/library", {"keine": "Liste"}, expect=400)
        q = finde(ctx.admin.gj(f"{G}/library/sources"), id=p["id"])
        pruefe(q and finde(q["items"], n=name), f"Leistung aus dem Plan fehlt in den Quellen: {q}")
        gleich(finde(q["items"], n=name)["d"], 3, "Dauer aus dem Plan")
        ctx.admin.get(f"{G}/library/unbekannt", expect=404)
    finally:
        ctx.admin.put(f"{G}/library", alt)
        weg(ctx, p["id"])
    gleich(ctx.admin.gj(f"{G}/library"), alt, "Katalog wieder wie vorher")


def test_abschnitte_und_vorgaben(ctx):
    """Abschnitte (Phasen), Firmen je Gewerk und Bezug je Leistung: speichern, bereinigen, laden."""
    ph0, cf0, cs0 = ctx.admin.gj(f"{G}/phases"), ctx.admin.gj(f"{G}/catfirms"), ctx.admin.gj(f"{G}/catscope")
    k = "rt_" + uuid.uuid4().hex[:6]
    try:
        ph = ctx.admin.uj(f"{G}/phases", ph0 + [{"k": k, "n": "Testabschnitt", "own": True}, {"k": k, "n": "doppelt"}, {"k": "Ungültig!", "n": "x"}])
        gleich([x for x in ph if x["k"] == k], [{"k": k, "n": "Testabschnitt", "own": True}], "Abschnitt einmal, ungültige verworfen")
        gleich(len(ph), len(ph0) + 1, "nur ein Abschnitt dazu")
        gleich(ctx.admin.gj(f"{G}/phases"), ph, "Abschnitte geladen wie gespeichert")
        cf = ctx.admin.uj(f"{G}/catfirms", {**cf0, k: "firma-1", k + "_leer": ""})
        gleich(cf.get(k), "firma-1", "Firma je Gewerk")
        pruefe(k + "_leer" not in cf, "leere Zuordnung wird nicht gespeichert")
        cs = ctx.admin.uj(f"{G}/catscope", {**cs0, k: "bau", k + "_x": "irgendwas"})
        gleich(cs.get(k), "bau", "Bezug „Gebäude“")
        pruefe(k + "_x" not in cs, "ungültiger Bezug verworfen")
        ctx.admin.put(f"{G}/phases", {"k": "keine Liste"}, expect=400)
        ctx.admin.put(f"{G}/catfirms", ["keine", "Zuordnung"], expect=400)
    finally:
        ctx.admin.put(f"{G}/phases", ph0)
        ctx.admin.put(f"{G}/catfirms", cf0)
        ctx.admin.put(f"{G}/catscope", cs0)
    gleich(ctx.admin.gj(f"{G}/phases"), ph0, "Abschnitte wieder wie vorher")


def test_vorlagen_und_assistent_einrichtung(ctx):
    """Plan-Vorlagen und gespeicherte Einrichtungen des Assistenten: anlegen, laden, löschen."""
    name = ctx.name("Vorlage")
    v = ctx.admin.post(f"{G}/presets", {"name": name, "scope": "phases", "phases": ["rohbau", "ausbau"], "data": {"tasks": []}}, expect=201).json
    try:
        gleich((v["name"], v["scope"], v["phases"], v["by"]), (name, "phases", ["rohbau", "ausbau"], "Test-Admin"), "Vorlage")
        pruefe(finde(ctx.admin.gj(f"{G}/presets"), id=v["id"]), "Vorlage fehlt in der Liste")
        gleich(ctx.admin.gj(f"{G}/presets/{v['id']}")["data"], {"tasks": []}, "Inhalt der Vorlage")
    finally:
        ctx.admin.delete(f"{G}/presets/{v['id']}")
    ctx.admin.get(f"{G}/presets/{v['id']}", expect=404)
    name = ctx.name("Einrichtung")
    e = ctx.admin.post(f"{G}/assistcfg/vorlagen", {"name": name, "data": {"profiles": {"efh": {"n": "Einfamilienhaus", "floors": 2}}}}, expect=201).json
    try:
        gleich(e["data"]["profiles"]["efh"], {"n": "Einfamilienhaus", "floors": 2}, "Einrichtung gespeichert")
        pruefe(finde(ctx.admin.gj(f"{G}/assistcfg/vorlagen"), id=e["id"]), "Einrichtung fehlt in der Liste")
        ctx.admin.post(f"{G}/assistcfg/vorlagen", {"name": name, "data": "keine Einrichtung"}, expect=400)
        pruefe(isinstance(ctx.admin.gj(f"{G}/assistcfg"), dict), "Einrichtung des Assistenten nicht lesbar")
    finally:
        ctx.admin.delete(f"{G}/assistcfg/vorlagen/{e['id']}")
    pruefe(not finde(ctx.admin.gj(f"{G}/assistcfg/vorlagen"), id=e["id"]), "Einrichtung nach dem Löschen noch da")


def test_einstellungen_nur_verwaltung(ctx):
    """KI-Einstellungen: alle dürfen lesen, nur die Verwaltung ändern; der API-Schlüssel verlässt den Server nie."""
    alt = ctx.admin.gj(f"{G}/settings")["ai"]
    for k in ("mode", "model", "models", "hasKey"):
        pruefe(k in alt, f"Einstellung {k} fehlt: {alt}")
    clara = ctx.anmelden("Clara Wolf")
    gleich(clara.gj(f"{G}/settings")["ai"]["mode"], alt["mode"], "Clara darf lesen")
    clara.put(f"{G}/settings", {"ai": {"mode": "off"}}, expect=403)
    try:
        neu = "off" if alt["mode"] != "off" else "builtin"
        gleich(ctx.admin.uj(f"{G}/settings", {"ai": {"mode": neu, "model": "gibt-es-nicht"}})["ai"]["mode"], neu, "Vorschlagsart geändert")
        x = ctx.admin.gj(f"{G}/settings")["ai"]
        gleich(x["mode"], neu, "Vorschlagsart gespeichert")
        gleich(x["model"], alt["model"], "unbekanntes Modell ignoriert")
        if not alt["hasKey"]:   # nur auf einem System ohne eigenen Schlüssel (CI) – sonst würde der echte gelöscht
            a = ctx.admin.put(f"{G}/settings", {"ai": {"key": "sk-ant-rauchtest-WXYZ"}})
            gleich(a.json["ai"]["hasKey"], True, "Schlüssel hinterlegt")
            gleich(a.json["ai"]["keyHint"], "…WXYZ", "nur die letzten Zeichen")
            pruefe("rauchtest" not in a.text and "rauchtest" not in ctx.admin.get(f"{G}/settings").text, "API-Schlüssel wird ausgeliefert")
            b = ctx.admin.uj(f"{G}/settings", {"ai": {"clearKey": True}})["ai"]
            gleich(b["hasKey"], b["fromEnv"], "Schlüssel wieder entfernt")
    finally:
        ctx.admin.put(f"{G}/settings", {"ai": {"mode": alt["mode"], "model": alt["model"]}})
    gleich(ctx.admin.gj(f"{G}/settings")["ai"]["mode"], alt["mode"], "Einstellung wieder wie vorher")


# ---------------------------------------------------------------------------------------------- Rechte
def test_rechte_ohne_freischaltung(ctx):
    """Ohne Anmeldung 401, Bernd Krämer (nur Bautagebuch) 403 – für Lesen und Schreiben; Status-Abfrage bleibt offen."""
    gast = ctx.gast()
    a = gast.get(f"{G}/projects", expect=401)
    pruefe(a.json.get("login"), "Anmeldeadresse fehlt in der Antwort")
    gast.post(f"{G}/projects", plan_daten(ctx.name("Plan")), expect=401)
    gast.get(f"{G}/settings", expect=401)
    gleich(gast.gj(f"{G}/health").get("ok"), True, "Status ohne Anmeldung")
    bernd = ctx.anmelden("Bernd Krämer")
    for pfad in ("/projects", "/firms", "/library", "/settings", "/bt-projects"):
        bernd.get(G + pfad, expect=403)
    bernd.post(f"{G}/projects", plan_daten(ctx.name("Plan")), expect=403)
    pruefe(not any(x["name"].startswith("RT-Plan") and x["by"] == "Bernd Krämer" for x in ctx.admin.gj(f"{G}/projects")),
           "Bernd konnte trotz fehlender Freischaltung einen Plan anlegen")


def test_clara_nur_sichtbare_projekte(ctx):
    """Clara Wolf (nur Bauzeitenplan) arbeitet mit Plänen freier Projekte, sieht aber den Plan von T101 (nur Anna) nicht."""
    clara = ctx.anmelden("Clara Wolf")
    me = clara.gj(f"{G}/me")
    pruefe("gantt" in me["apps"] and not me["is_admin"], f"Konto von Clara: {me}")
    p = neuer_plan(clara, ctx.name("Plan"), link=t103(ctx))
    try:
        gleich(p["_by"], "Clara Wolf", "von Clara angelegt")
        speichern(clara, p, name=p["name"] + " geändert")
        clara.post(f"{G}/projects/{p['id']}/versions", {"name": "Claras Stand"}, expect=201)
        pruefe(finde(clara.gj(f"{G}/projects"), id=p["id"]), "Clara sieht ihren Plan nicht")
        # Plan der Testdaten zu T101 (Bauleiterin nur Anna) – für Clara unsichtbar
        t101 = ctx.projekt("T101")["id"]
        plan101 = next((x for x in ctx.admin.gj(f"{G}/projects") if x.get("bt_id") == t101), None)
        pruefe(plan101, "Testdaten-Plan zu T101 fehlt")
        pruefe(not finde(clara.gj(f"{G}/projects"), id=plan101["id"]), "Clara sieht den Plan von T101 in der Liste")
        clara.get(f"{G}/projects/{plan101['id']}", expect=404)
        clara.get(f"{G}/projects/{plan101['id']}/versions", expect=404)
        clara.put(f"{G}/projects/{plan101['id']}", {"name": "fremd"}, expect=404)
        clara.put(f"{G}/projects/{p['id']}/link", {"project_id": t101}, expect=404)
        pruefe(not finde(clara.gj(f"{G}/bt-projects"), id=t101), "T101 in Claras Projektauswahl")
        gleich(ctx.anmelden("Anna Bauer").get(f"{G}/projects/{plan101['id']}").status, 200, "Anna (Bauleiterin T101) sieht den Plan")
    finally:
        weg(ctx, p["id"])


def test_neuer_plan_nicht_mit_fremdem_projekt_verknuepfbar(ctx):
    """Beim Anlegen darf Clara ihren Plan nicht mit T101 verknüpfen, das sie nicht sehen darf (kein Name/keine Adresse)."""
    clara = ctx.anmelden("Clara Wolf")
    t101 = ctx.projekt("T101")["id"]
    a = clara.post(f"{G}/projects", plan_daten(ctx.name("Plan"), link=t101), expect=None)
    try:
        if a.status in (200, 201):
            p = a.json
            gleich(p.get("_bt"), None, "Verknüpfung mit unsichtbarem Projekt (verrät Name und Adresse von T101)")
            gleich(ctx.admin.gj(f"{G}/projects/{p['id']}")["_bt"], None, "Plan ist mit T101 verknüpft")
        else:
            pruefe(a.status in (400, 403, 404), f"unerwarteter Status {a.status}")
    finally:
        if a.status in (200, 201) and (a.json or {}).get("id"):
            weg(ctx, a.json["id"])


def test_schreiben_nur_von_eigener_seite(ctx):
    """Schutz vor fremden Seiten: Schreibzugriff mit fremdem Origin → 403, mit eigenem Origin erlaubt."""
    p = neuer_plan(ctx.admin, ctx.name("Plan"))
    c = ctx.admin

    def mit_origin(origin):
        r = urllib.request.Request(c.base + f"{G}/projects/{p['id']}/presence", data=b"{}", method="POST",
                                   headers={"Content-Type": "application/json", "Origin": origin})
        try:
            with c.op.open(r, timeout=60) as resp:
                return resp.status
        except urllib.error.HTTPError as e:
            return e.code
    try:
        gleich(mit_origin("https://boese-seite.example"), 403, "fremde Seite")
        gleich(mit_origin(c.base), 200, "eigene Seite")
    finally:
        c.delete(f"{G}/projects/{p['id']}/presence", expect=None)
        weg(ctx, p["id"])


def test_druck_als_pdf(ctx):
    """Drucken → PDF: echte Druckseiten (aus print.js erzeugt) werden zu einer PDF-Datei mit passendem Dateinamen"""
    import json as _json, os as _os
    from lib import HIER as _HIER
    d = _json.load(open(_os.path.join(_HIER, "daten", "gantt_druck.json"), encoding="utf-8"))
    a = ctx.admin.post(f"{G}/pdf", {"pages": d["pages"] * 2, "name": d["name"]}).ist_pdf()
    pruefe(a.body.count(b"/Type /Page\n") + a.body.count(b"/Type /Page ") + a.body.count(b"/Type/Page") >= 2 or len(a.body) > 20000,
           "PDF scheint keine zwei Seiten zu enthalten")
    pruefe("Testprojekt" in (a.headers.get("Content-Disposition") or "") or "Testprojekt%20Druck" in (a.headers.get("Content-Disposition") or ""),
           f"Dateiname fehlt: {a.headers.get('Content-Disposition')}")
    if _os.environ.get("RT_ARTEFAKTE"):   # in der Pipeline zum Ansehen ablegen
        _os.makedirs(_os.environ["RT_ARTEFAKTE"], exist_ok=True)
        open(_os.path.join(_os.environ["RT_ARTEFAKTE"], "bauzeitenplan.pdf"), "wb").write(a.body)
    ctx.admin.post(f"{G}/pdf", {"pages": ["kein svg"]}, expect=400)
    ctx.admin.post(f"{G}/pdf", {"pages": ['<svg xmlns="http://www.w3.org/2000/svg"><image href="file:///etc/passwd" width="9" height="9"/></svg>']}, expect=400)
    ctx.admin.post(f"{G}/pdf", {}, expect=400)
    ctx.gast().post(f"{G}/pdf", {"pages": d["pages"]}, expect=401)


# ---------------------------------------------------------------------------------------------- Links zum Ansehen
def test_link_zum_ansehen(ctx):
    """Plan teilen: Link ohne Anmeldung lesbar (ohne Notizen), Fortschritt abschaltbar, fester Stand bleibt, mitlaufend wechselt die Version,
    zurückgezogen/abgelaufen → nicht mehr lesbar, fremder Plan wird abgelehnt."""
    sched = [{"uid": 1, "s": "2026-11-02", "f": "2026-11-13", "g": 0}, {"uid": 2, "s": "2026-11-16", "f": "2026-11-16", "g": 0}]
    tasks = [leistung(1, "Rohbau", 10, gw="Rohbau", res="Rohbau Schulte", pct=40, notes="geheim"), leistung(2, "Abnahme", 0, preds=[1])]
    a = neuer_plan(ctx.admin, ctx.name("Plan A"), tasks, link=t103(ctx))
    b = neuer_plan(ctx.admin, ctx.name("Plan B"), [leistung(1, "Nur in B", 3)], link=t103(ctx))
    fremd = neuer_plan(ctx.admin, ctx.name("Fremd"))
    try:
        a = speichern(ctx.admin, a, sched=sched)
        speichern(ctx.admin, b, sched=[{"uid": 1, "s": "2026-11-02", "f": "2026-11-04", "g": 0}])
        mit = ctx.admin.post(f"{G}/projects/{a['id']}/links", {"name": "Firma", "art": "mit", "fortschritt": True}, expect=201).json
        fest = ctx.admin.post(f"{G}/projects/{a['id']}/links", {"name": "Bauherr", "art": "fest", "fortschritt": False}, expect=201).json
        gast = ctx.gast()
        v = gast.gj(f"{G}/ansicht/{mit['token']}")
        gleich([z["n"] for z in v["zeilen"]], ["Rohbau", "Abnahme"], "Leistungen in der Ansicht")
        gleich(v["zeilen"][0]["p"], 40, "Fortschritt sichtbar")
        gleich(v["zeilen"][1]["m"], 1, "Meilenstein")
        pruefe("geheim" not in str(v), "Notizen dürfen nicht in der Ansicht stehen")
        w = gast.gj(f"{G}/ansicht/{fest['token']}")
        pruefe("p" not in w["zeilen"][0], "ohne Fortschritt: kein Prozentwert")
        # Plan ändern: fester Stand bleibt, mitlaufend zeigt die Änderung
        speichern(ctx.admin, a, tasks=[leistung(1, "Rohbau neu", 10), tasks[1]], sched=sched)
        gleich(gast.gj(f"{G}/ansicht/{fest['token']}")["zeilen"][0]["n"], "Rohbau", "fester Stand unverändert")
        gleich(gast.gj(f"{G}/ansicht/{mit['token']}")["zeilen"][0]["n"], "Rohbau neu", "mitlaufend aktuell")
        # mitlaufend: andere Version desselben Projekts zeigen – fremder Plan abgelehnt
        ctx.admin.put(f"{G}/links/{mit['token']}", {"gantt_id": b["id"]}, expect=200)
        gleich(gast.gj(f"{G}/ansicht/{mit['token']}")["zeilen"][0]["n"], "Nur in B", "Version gewechselt")
        ctx.admin.put(f"{G}/links/{mit['token']}", {"gantt_id": fremd["id"]}, expect=400)
        # zurückziehen und Ablauf
        ctx.admin.put(f"{G}/links/{mit['token']}", {"aktiv": False}, expect=200)
        gast.get(f"{G}/ansicht/{mit['token']}", expect=404)
        ctx.admin.put(f"{G}/links/{fest['token']}", {"ablauf": "2020-01-01"}, expect=200)
        gast.get(f"{G}/ansicht/{fest['token']}", expect=410)
        gast.get(f"{G}/projects/{a['id']}/links", expect=401)   # Verwaltung der Links nur angemeldet
        gleich(len(ctx.admin.gj(f"{G}/projects/{a['id']}/links")), 2, "zwei Links beim Plan")
    finally:
        for p in (a, b, fremd):
            weg(ctx, p["id"])
