"""Ablauftests Honorar: nur Verwaltung, Auftrag anlegen, HOAI rechnen, Nebenkosten nach Aufwand, Angebot als PDF, Papierkorb."""
from lib import gleich, pruefe

HO = "/honorar/api"


def test_honorar_auftrag(ctx):
    """Anna (keine Verwaltung) kommt nicht hinein; Auftrag nach HOAI mit Kosten im deutschen Format, Zone, Umbauzuschlag;
    Leistungsphase abwählen; Nebenkosten nach Aufwand; Angebot als PDF; löschen legt in den Papierkorb, zurückholen geht."""
    ctx.anmelden("Anna Bauer").get(f"{HO}/auftraege", expect=403)
    d = ctx.admin.pj(f"{HO}/auftraege", {"project_id": ctx.pid, "art": "hoai", "name": "RT Honorar"})
    aid = d["auftrag"]["id"]
    pk = None
    try:
        gleich(sum(1 for p in d["rechnung"]["phasen"] if p["an"]), 9, "neuer Auftrag: alle Leistungsphasen")
        d = ctx.admin.uj(f"{HO}/auftraege/{aid}", {"kosten": "1.000.000,00", "zone": 3, "umbau": "20"})
        gleich((d["auftrag"]["kosten"], d["rechnung"]["grund"]), (1000000.0, 115675.0), "Basishonorarsatz Zone III")
        lph = d["auftrag"]["lph"]; lph["lph9"]["an"] = False
        d = ctx.admin.uj(f"{HO}/auftraege/{aid}", {"lph": lph, "nk": {"art": "aufwand"}})
        pruefe(abs(d["rechnung"]["summe_lph"] - 115675 * 0.98) < 0.1, f"ohne LPh 9: {d['rechnung']['summe_lph']}")
        d = ctx.admin.pj(f"{HO}/auftraege/{aid}/nk", {"art": "plot", "text": "Plotauftrag", "betrag": "123,40"})
        gleich(d["rechnung"]["nk"], 123.4, "Nebenkosten nach Aufwand")
        pdf = ctx.admin.get(f"{HO}/auftraege/{aid}/angebot.pdf").ist_pdf()
        pruefe("Honorar_" in (pdf.headers.get("Content-Disposition") or ""), "Dateiname des Angebots")
        liste = ctx.admin.gj(f"{HO}/auftraege")
        pruefe(any(a["id"] == aid for a in liste["auftraege"]), "Auftrag in der Liste")
        pk = ctx.admin.delete(f"{HO}/auftraege/{aid}").json["papierkorb"]
        ctx.admin.get(f"{HO}/auftraege/{aid}", expect=404)
        ctx.admin.pj(f"/{HO.split('/')[1]}/api/bp/papierkorb/{pk}/zurueck")
        gleich(ctx.admin.gj(f"{HO}/auftraege/{aid}")["nk_liste"][0]["text"], "Plotauftrag", "aus dem Papierkorb zurück – mit Nebenkosten")
        pk = None
    finally:
        if pk is None:
            try:
                ctx.admin.delete(f"{HO}/auftraege/{aid}")
            except Exception:   # noqa: BLE001 – schon weg
                pass


def test_honorar_versionen(ctx):
    """Versionen je Auftrag: speichern, weiterrechnen, alte laden, „gilt“, PDF mit Versionsnamen; Umstellen auf je Projekt."""
    a = ctx.admin
    d = a.pj(f"{HO}/auftraege", {"project_id": ctx.pid, "art": "pauschal", "name": "RT Versionen"})
    aid = d["auftrag"]["id"]
    try:
        a.uj(f"{HO}/auftraege/{aid}/versionen/modus", {"modus": "auftrag"})
        a.uj(f"{HO}/auftraege/{aid}", {"pauschal": "10.000,00"})
        v1 = a.pj(f"{HO}/auftraege/{aid}/versionen", {"name": "Angebot 1"})["neu"]
        a.uj(f"{HO}/auftraege/{aid}", {"pauschal": "12.000,00"})
        a.pj(f"/honorar/api/versionen/{v1}/laden", {})
        gleich(a.gj(f"{HO}/auftraege/{aid}")["auftrag"]["pauschal"], 10000.0, "Version 1 zurückgeholt")
        L = a.uj(f"/honorar/api/versionen/{v1}", {"gilt": True})
        pruefe(L["versionen"][0]["gilt"], "gilt gesetzt")
        pdf = a.get(f"{HO}/auftraege/{aid}/angebot.pdf?version={v1}").ist_pdf()
        pruefe("Angebot_1" in (pdf.headers.get("Content-Disposition") or ""), "PDF mit Versionsnamen")
        P = a.uj(f"{HO}/auftraege/{aid}/versionen/modus", {"modus": "projekt"})
        gleich((P["modus"], P["andere"] >= 1), ("projekt", True), "je Projekt: Versionen je Auftrag bleiben")
        vp = a.pj(f"{HO}/auftraege/{aid}/versionen", {})
        pruefe(vp["versionen"] and vp["versionen"][0]["auftraege"] >= 1, "Version je Projekt mit allen Aufträgen")
    finally:
        a.uj(f"{HO}/auftraege/{aid}/versionen/modus", {"modus": "auftrag"}, expect=None)
        a.delete(f"{HO}/auftraege/{aid}", expect=None)


def test_honorar_ablauf(ctx):
    """Ablauf: als Anfrage anlegen, Angaben je Stufe speichern und einzeln löschen, Stufe weiter bis Vertrag, abgelehnt;
    unbekannte Stufen und Felder werden verworfen; die Liste zeigt Stufe und Angaben."""
    a = ctx.admin
    d = a.pj(f"{HO}/auftraege", {"project_id": ctx.pid, "art": "pauschal", "name": "RT Ablauf", "status": "anfrage",
                                 "ablauf": {"anfrage": {"von": "Bauherr RT", "datum": "2026-11-01", "quatsch": "x"}}})
    aid = d["auftrag"]["id"]
    try:
        gleich((d["auftrag"]["status"], d["auftrag"]["ablauf"]["anfrage"]), ("anfrage", {"von": "Bauherr RT", "datum": "2026-11-01"}), "als Anfrage angelegt")
        d = a.uj(f"{HO}/auftraege/{aid}", {"status": "angebot", "ablauf": {"angebot": {"gesendet": "2026-11-03", "bindefrist": "2026-12-01"}}})
        gleich((d["auftrag"]["status"], d["auftrag"]["ablauf"]["angebot"]["bindefrist"]), ("angebot", "2026-12-01"), "Angebot gesendet")
        d = a.uj(f"{HO}/auftraege/{aid}", {"ablauf": {"angebot": {"bindefrist": None}}})
        pruefe("bindefrist" not in d["auftrag"]["ablauf"]["angebot"] and d["auftrag"]["ablauf"]["anfrage"]["von"] == "Bauherr RT", "Feld gelöscht, Rest bleibt")
        d = a.uj(f"{HO}/auftraege/{aid}", {"status": "vertrag", "ablauf": {"vertrag": {"bh": True, "buero": False}}})
        gleich((d["auftrag"]["status"], d["auftrag"]["ablauf"]["vertrag"]), ("vertrag", {"bh": True, "buero": False}), "Vertrag")
        d = a.uj(f"{HO}/auftraege/{aid}", {"status": "gibtsnicht"})
        gleich(d["auftrag"]["status"], "vertrag", "unbekannte Stufe verworfen")
        d = a.uj(f"{HO}/auftraege/{aid}", {"status": "abgelehnt", "ablauf": {"abgelehnt": {"grund": "zu teuer"}}})
        z = next(x for x in a.gj(f"{HO}/auftraege")["auftraege"] if x["id"] == aid)
        gleich((z["status"], z["ablauf"]["abgelehnt"]["grund"]), ("abgelehnt", "zu teuer"), "Liste mit Stufe und Angaben")
    finally:
        try:
            a.delete(f"{HO}/auftraege/{aid}")
        except Exception:   # noqa: BLE001 – schon weg
            pass
