"""Ablauftests Honorar: nur Verwaltung, Auftrag anlegen, HOAI rechnen, Nebenkosten nach Aufwand, Angebot als PDF, Papierkorb, Rechnungen."""
from lib import gleich, mini_pdf, pruefe

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


def test_honorar_rechnungen(ctx):
    """Abschlag aus „erbracht %“, stellen friert ein, zweiter Abschlag zieht den ersten ab, nur ein Entwurf, PDF mit zwei Blättern,
    bezahlt, Entwurf löschen (Papierkorb), Schlussrechnung, danach keine weitere Rechnung; gestellte nicht löschbar."""
    a = ctx.admin
    d = a.pj(f"{HO}/auftraege", {"project_id": ctx.pid, "art": "pauschal", "name": "RT Rechnungen"})
    aid = d["auftrag"]["id"]
    try:
        a.uj(f"{HO}/auftraege/{aid}", {"pauschal": "10.000,00", "nk": {"art": "pauschal", "p": 0}})
        d = a.pj(f"{HO}/auftraege/{aid}/rechnungen", {"art": "abschlag"})
        r1 = d["neu"]
        a.pj(f"{HO}/auftraege/{aid}/rechnungen", {"art": "abschlag"}, expect=409)
        d = a.uj(f"/honorar/api/rechnungen/{r1}", {"anteil": "30"})
        gleich(d["rechnungen"]["liste"][0]["betrag"], 3000.0, "30 % von 10.000 €")
        d = a.uj(f"/honorar/api/rechnungen/{r1}", {"status": "gestellt"})
        gleich((d["rechnungen"]["abgerechnet"], d["rechnungen"]["offen"]), (3000.0, 3570.0), "gestellt: abgerechnet und offen")
        a.delete(f"/honorar/api/rechnungen/{r1}", expect=409)
        r2 = a.pj(f"{HO}/auftraege/{aid}/rechnungen", {"art": "abschlag"})["neu"]
        d = a.uj(f"/honorar/api/rechnungen/{r2}", {"anteil": "50"})
        x = [r for r in d["rechnungen"]["liste"] if r["id"] == r2][0]
        gleich((x["titel"], x["bisher"], x["betrag"]), ("2. Abschlagsrechnung", 3000.0, 2000.0), "zweiter Abschlag = Zuwachs")
        pdf = a.get(f"/honorar/api/rechnungen/{r2}/rechnung.pdf").ist_pdf()
        import re
        gleich(len(re.findall(rb"/Type\s*/Page[^s]", pdf.body)), 2, "zwei Blätter: Rechnung und Erläuterung")
        pk = a.delete(f"/honorar/api/rechnungen/{r2}").json["papierkorb"]
        pruefe(pk, "Entwurf im Papierkorb")
        d = a.uj(f"/honorar/api/rechnungen/{r1}", {"status": "bezahlt", "bezahlt_am": "2026-11-01", "bezahlt": 3570})
        gleich((d["rechnungen"]["bezahlt"], d["rechnungen"]["offen"]), (3570.0, 0), "bezahlt")
        rs = a.pj(f"{HO}/auftraege/{aid}/rechnungen", {"art": "schluss"})["neu"]
        d = a.uj(f"/honorar/api/rechnungen/{rs}", {"status": "gestellt"})
        x = [r for r in d["rechnungen"]["liste"] if r["id"] == rs][0]
        gleich((x["titel"], x["kum"], x["betrag"]), ("Schlussrechnung", 10000.0, 7000.0), "Schluss: 100 % − Abschlag")
        pruefe("ablage" in d and "ablage_fehler" in d, "Stellen meldet die Ablage im Projektordner")
        a.pj(f"{HO}/auftraege/{aid}/rechnungen", {"art": "abschlag"}, expect=409)
        a.uj(f"/honorar/api/rechnungen/{r1}", {"status": "storniert"}, expect=409)
        # Architektenvertrag: PDF, Fassung speichern (Ablage im Projektordner darf auf dem Testsystem fehlschlagen), Einstellungen
        a.uj(f"{HO}/auftraege/{aid}", {"ablauf": {"vertrag": {"termine": "Bauantrag bis 31.03.2027"}}})
        a.get(f"{HO}/auftraege/{aid}/vertrag.pdf").ist_pdf()
        v = a.pj(f"{HO}/auftraege/{aid}/vertrag", {})
        gleich(len(v["vertraege"]), 1, "Vertrag gespeichert")
        a.get(f"/honorar/api/vertraege/{v['neu']}.pdf").ist_pdf()
        a.get(f"{HO}/auftraege/{aid}/druck.pdf?teile=aufstellung,vertrag,r{r1}").ist_pdf()   # Druckseite: mehrere Teile in einem PDF
        a.get(f"{HO}/auftraege/{aid}/druck.pdf?teile=", expect=400)
        E = a.gj(f"{HO}/einstellungen")
        try:
            gleich(a.uj(f"{HO}/einstellungen", {"honorar_re_nummer": "HR{jahr2}/{lfd}"})["beispiel"][:2], "HR", "Muster der Rechnungsnummer")
            a.put(f"{HO}/einstellungen", {"honorar_zahlungsziel": "zwei"}, expect=400)
        finally:
            a.uj(f"{HO}/einstellungen", {"honorar_re_nummer": E["honorar_re_nummer"]})
        ctx.anmelden("Anna Bauer").get(f"{HO}/einstellungen", expect=403)
    finally:
        a.delete(f"{HO}/auftraege/{aid}")


def test_fremdleistungen(ctx):
    """Fachplaner über unser Büro: Rechnung erfassen (mit PDF), prüfen → freigeben, geht mit Zuschlag in den Abschlag; beim Stellen
    festgeschrieben (nicht mehr änderbar/löschbar), Storno gibt sie wieder frei; „Bauherr direkt“ wird nie weiterberechnet."""
    a = ctx.admin
    aid = a.pj(f"{HO}/auftraege", {"project_id": ctx.pid, "art": "pauschal", "name": "RT Fremd"})["auftrag"]["id"]
    try:
        d = a.pj(f"{HO}/auftraege/{aid}/fremd", {"leistung": "Tragwerksplanung", "firma": "RT Statik", "weiter": "zuschlag", "zuschlag_p": "5"})
        fid = d["neu"]
        f = next(x for x in d["fremd"]["liste"] if x["id"] == fid)
        gleich((f["beauftragt"], f["zuschlag_p"]), ("buero", 5.0), "über uns, 5 % Zuschlag")
        r = a.post(f"{HO}/fremd/{fid}/rechnungen", dateien={"datei": ("re.pdf", mini_pdf("Statik"), "application/pdf")}, felder={"nr": "S-1", "datum": "2026-11-02", "netto": "1000"}).json
        rid = r["neu"]
        a.get(f"{HO}/fremd-re/{rid}/datei").ist_pdf()
        gleich(next(x for x in r["fremd"]["liste"] if x["id"] == fid)["offen"], 0.0, "eingegangen, noch nicht freigegeben – nichts offen")
        for st in ("geprueft", "freigegeben"):
            d = a.uj(f"{HO}/fremd-re/{rid}", {"status": st})
        gleich(d["fremd"]["summe"]["offen"], 1050.0, "freigegeben: 1.000 + 5 % offen")
        r1 = a.pj(f"{HO}/auftraege/{aid}/rechnungen", {"art": "abschlag"})["neu"]
        d = a.uj(f"{HO}/rechnungen/{r1}", {"anteil": "0"})
        gleich(next(x for x in d["rechnungen"]["liste"] if x["id"] == r1)["betrag"], 1050.0, "Abschlag enthält die Fremdleistung")
        d = a.uj(f"{HO}/rechnungen/{r1}", {"status": "gestellt"})
        gleich((d["fremd"]["summe"]["weiter"], d["fremd"]["summe"]["offen"]), (1050.0, 0.0), "beim Stellen weiterberechnet")
        a.put(f"{HO}/fremd-re/{rid}", {"netto": "900"}, expect=409)
        a.delete(f"{HO}/fremd-re/{rid}", expect=409)
        a.uj(f"{HO}/fremd-re/{rid}", {"status": "bezahlt"})
        d = a.uj(f"{HO}/rechnungen/{r1}", {"status": "storniert"})
        gleich(d["fremd"]["summe"]["offen"], 1050.0, "Storno: wieder offen")
        d = a.uj(f"{HO}/fremd/{fid}", {"beauftragt": "bauherr"})
        gleich(d["fremd"]["summe"]["offen"], 0.0, "Bauherr direkt: nichts weiterzuberechnen")
    finally:
        a.delete(f"{HO}/auftraege/{aid}", expect=None)


def test_kennwort_pdf(ctx):
    """Kennwort der Honorar-PDFs im Projektordner: wird gespeichert, aber nie zurückgegeben; zu kurz abgelehnt; entfernbar."""
    a = ctx.admin
    E = a.gj("/honorar/api/einstellungen")
    pruefe("honorar_pdf_kennwort" not in E and "kennwort" not in E, "Kennwort nie an den Browser")
    a.put("/honorar/api/einstellungen", {"kennwort": "kurz"}, expect=400)
    E = a.uj("/honorar/api/einstellungen", {"kennwort": "Geheim-Test-123"})
    pruefe(E["kennwort_gesetzt"] and "Geheim-Test-123" not in str(E), "gesetzt, aber nicht sichtbar")
    E = a.uj("/honorar/api/einstellungen", {"kennwort_loeschen": True})
    pruefe(not E["kennwort_gesetzt"], "entfernt")
