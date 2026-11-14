"""Ablauftests Akquise (14.11.2026): nur mit Recht „akquise“ (Anna: 403); anlegen, ändern, Stand prüfen; abgelegten Überschlag anhängen;
archivieren und zurückholen; löschen (Papierkorb) und zurückholen; Umwandeln: Nummer nachgefragt, schon vergebene Nummer → 400,
Projekt mit Bauherr:in, Überschlag wird Honorarauftrag (Angebot), danach nicht mehr in der Liste. Die Ablage ist im Test nicht eingerichtet –
Dateien melden verständlich einen Fehler, die Daten gehen trotzdem."""
import random

from lib import gleich, pruefe

AQ = "/akquise/api"
HO = "/honorar/api"


def test_akquise_ablauf(ctx):
    a = ctx.admin
    ctx.anmelden("Anna Bauer").get(f"{AQ}/akquisen", expect=403)
    name = ctx.name("Akquise")
    x = a.pj(f"{AQ}/akquisen", {"name": name, "bauherr": "Stadt RT", "stand": "unsinn"})
    aid, pid, uid, kid = x["id"], None, None, None
    try:
        gleich((x["stand"], x["bauherr"], x["archiviert"]), ("anfrage", "Stadt RT", 0), "angelegt, unbekannter Stand → Anfrage")
        x = a.uj(f"{AQ}/akquisen/{aid}", {"stand": "angebot", "wiedervorlage": "2026-12-01", "adresse": "Teststr. 1, 45127 Essen"})
        gleich((x["stand"], x["wiedervorlage"]), ("angebot", "2026-12-01"), "Stand und Wiedervorlage")
        kid = a.pj("/akquise/api/bp/kontakte", {"name": ctx.name("Bauherr Akquise")})["kontakt"]["id"]   # Bauherr:in als Kontakt
        x = a.uj(f"{AQ}/akquisen/{aid}", {"kontakt_id": kid, "bauherr": "Stadt RT"})
        gleich(x["kontakt_id"], kid, "Bauherr:in als Kontakt verbunden")
        gleich(a.uj(f"{AQ}/akquisen/{aid}", {"kontakt_id": "x"})["kontakt_id"], None, "Unsinn → ohne Kontakt")
        a.uj(f"{AQ}/akquisen/{aid}", {"kontakt_id": kid})
        uid = a.pj(f"{HO}/ueberschlaege", {"kosten": 500000, "zone": 3, "nk": 5, "wofuer": name})["id"]
        a.uj(f"{AQ}/akquisen/{aid}", {"ueberschlag_dazu": uid})
        L = a.gj(f"{AQ}/akquisen")
        z = next(y for y in L["akquisen"] if y["id"] == aid)
        gleich([u["id"] for u in z["ueberschlaege"]], [uid], "Überschlag hängt an der Akquise")
        pruefe(not any(u["id"] == uid for u in L["ueberschlaege"]), "nicht mehr unter den losen Überschlägen")
        b = a.gj(f"{AQ}/akquisen/{aid}/baum")
        pruefe(b.get("error") or b.get("dateien") == [], f"Dateien ohne Ablage: {b}")
        a.pj(f"{AQ}/akquisen/{aid}/archiv", {"an": True})
        pruefe(not any(y["id"] == aid for y in a.gj(f"{AQ}/akquisen")["akquisen"]), "archiviert: nicht unter den offenen")
        pruefe(any(y["id"] == aid for y in a.gj(f"{AQ}/akquisen?archiv=1")["archiv"]), "im Archiv")
        a.pj(f"{AQ}/akquisen/{aid}/archiv", {"an": False})
        pk = a.delete(f"{AQ}/akquisen/{aid}").json["papierkorb"]
        pruefe(not any(y["id"] == aid for y in a.gj(f"{AQ}/akquisen")["akquisen"]), "gelöscht")
        a.pj(f"/akquise/api/bp/papierkorb/{pk}/zurueck")
        pruefe(any(y["id"] == aid for y in a.gj(f"{AQ}/akquisen")["akquisen"]), "aus dem Papierkorb zurück")
        v = a.gj(f"{AQ}/akquisen/{aid}/umwandeln")
        pruefe(v["nummer"] == "" or v["nummer"][0].isalpha(), f"Nummer vorgeschlagen: {v['nummer']}")
        a.post(f"{AQ}/akquisen/{aid}/umwandeln", {"nummer": "", "name": name}, expect=400)
        nr = f"T{random.randint(10000, 99999)}"
        r = a.pj(f"{AQ}/akquisen/{aid}/umwandeln", {"nummer": nr, "name": name})
        pid = r["project_id"]
        gleich(r["honorar"], 1, "Überschlag → Honorarauftrag")
        P = next(p for p in a.gj("/bautagebuch/api/projects") if p["id"] == pid)
        gleich((P["name"], P["client"]), (f"{nr} {name}", "Stadt RT"), "Projekt mit Nummer und Bauherr:in")
        gleich(a.gj(f"/akquise/api/bp/projekt/{pid}/daten")["werte"].get("bauherr_kid"), kid, "Kontakt der Bauherr:in in den Projektdaten")
        au = [y for y in a.gj(f"{HO}/auftraege")["auftraege"] if y["project_id"] == pid]
        gleich([(y["status"], y["name"]) for y in au], [("angebot", "Architektenleistungen LPh 1–9")], "Honorarauftrag im Stand Angebot")
        pruefe(not any(y["id"] == aid for y in a.gj(f"{AQ}/akquisen")["akquisen"]), "umgewandelt: nicht mehr in der Akquise")
        a.post(f"{AQ}/akquisen/{aid}/umwandeln", {"nummer": nr + "1", "name": name}, expect=400)
        uid = None
    finally:
        if pid:
            a.delete(f"/bautagebuch/api/projects/{pid}", expect=None)
        if uid:
            a.delete(f"{HO}/ueberschlaege/{uid}", expect=None)
        a.delete(f"{AQ}/akquisen/{aid}", expect=None)
        if kid:
            a.delete(f"/adressen/api/contacts/{kid}", expect=None)
