"""Ablauftests Bauantrag: anlegen, Werte aus den Quellen, von Hand ändern und zurücksetzen, Entwurfsverfasser wählen,
Bauvorlagen, Stand „eingereicht“ sperrt, PDF, Papierkorb."""
from lib import gleich, pruefe

BA = "/bauantrag/api"


def _mini_pdf():
    """Kleinstes gültiges PDF (eine leere A4-Seite) mit richtiger xref-Tabelle."""
    obj = [b"<</Type/Catalog/Pages 2 0 R>>", b"<</Type/Pages/Kids[3 0 R]/Count 1>>", b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>"]
    out, pos = b"%PDF-1.4\n", []
    for i, o in enumerate(obj, 1):
        pos.append(len(out)); out += b"%d 0 obj" % i + o + b"endobj\n"
    x = len(out)
    out += b"xref\n0 4\n0000000000 65535 f \n" + b"".join(b"%010d 00000 n \n" % p for p in pos)
    return out + b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n%d\n%%%%EOF" % x


def test_bauantrag(ctx):
    a = ctx.admin
    d = a.pj(f"{BA}/antraege", {"project_id": ctx.pid, "verfahren": "baugenehmigung", "name": "RT Bauantrag"})
    aid = d["antrag"]["id"]
    pk = None
    try:
        F = {f["key"]: f for f in d["felder"]}
        gleich(F["verfahren"]["wert"], "baugenehmigung", "Verfahren gesetzt")
        pruefe(F["gs_strasse"]["quelle"] in ("Projekt", ""), f"Quelle Straße: {F['gs_strasse']['quelle']}")
        pruefe(len(d["schritte"]) == 6 and d["fehlt"]["felder"], "sechs Schritte, Pflichtfelder offen")
        d = a.uj(f"{BA}/antraege/{aid}", {"felder": {"verfahrensart": "vereinfachtes Genehmigungsverfahren", "gebaeudeklasse": "3", "unbekannt": "x"}})
        F = {f["key"]: f for f in d["felder"]}
        gleich((F["verfahrensart"]["quelle"], F["gebaeudeklasse"]["wert"], F["gebaeudeklasse"]["quelle"], F["gebaeudeklasse"]["ziel"]),
               ("von Hand", "3", "Projektdaten", "Projektdaten"), "nur im Antrag bzw. in die Projektdaten zurückgeschrieben")
        d = a.uj(f"{BA}/antraege/{aid}", {"felder": {"verfahrensart": None, "gebaeudeklasse": ""}})
        pruefe(next(f for f in d["felder"] if f["key"] == "verfahrensart")["quelle"] != "von Hand", "auf die Quelle zurückgesetzt")
        d = a.uj(f"{BA}/antraege/{aid}", {"felder": {"ev_wahl": "buero"}, "bauvorlagen": {"statik": {"status": "entfaellt"}}})
        gleich(next(b for b in d["bauvorlagen"] if b["key"] == "statik")["status"], "entfaellt", "Bauvorlage entfällt")
        pruefe(next(f for f in d["felder"] if f["key"] == "ev_name")["quelle"] in ("Büro", ""), "Entwurfsverfasser aus dem Büro")
        r = a.get(f"{BA}/antraege/{aid}/antrag.pdf", expect=(200, 409))   # ohne geladene amtliche Formulare (Testlauf ohne Internet): klare Meldung
        if r.status == 409:
            pruefe("Formulare" in (r.json or {}).get("error", ""), "Hinweis auf „Formulare → Jetzt prüfen“")
        # Antragspaket: eigene Unterlage (PDF ohne Felder) → nur beilegen; Platzieren; Reihenfolge; Paket-PDF mit Inhaltsverzeichnis
        mini = _mini_pdf()
        d = a.post(f"{BA}/antraege/{aid}/unterlagen", dateien={"datei": ("Formular Stadt.pdf", mini, "application/pdf")}).json
        u = [x for x in d["paket"] if x["art"] == "unterlage"]
        gleich((len(u), u[0]["nutzung"], u[0]["an"]), (1, "beilegen", True), "Unterlage ohne Felder: wird beigelegt")
        k = u[0]["key"]
        d = a.uj(f"{BA}/antraege/{aid}/paket", {"key": k, "nutzung": "ausfuellen"})
        a.uj(f"{BA}/antraege/{aid}/platzierung/{k}", {"felder": [{"feld": "flurstueck", "seite": 0, "x": 0.1, "y": 0.1, "w": 0.3, "h": 0.03, "groesse": 10}]})
        P = a.gj(f"{BA}/antraege/{aid}/platzierung/{k}")
        gleich((len(P["felder"]), P["seiten"][0] < 1), (1, True), "Platzierung gemerkt, Seite hochkant")
        a.get(f"{BA}/antraege/{aid}/platzierung/{k}/seite/0.png")
        a.get(f"{BA}/antraege/{aid}/stueck/{k}.pdf").ist_pdf()
        a.get(f"{BA}/antraege/{aid}/paket.pdf").ist_pdf()
        d = a.uj(f"{BA}/antraege/{aid}/paket", {"key": k, "an": False})
        pruefe(k not in d["gewaehlt"], "abgewählt")
        pk2 = a.delete(f"/bauantrag/api/unterlagen/{k[1:]}").json["papierkorb"]
        pruefe(pk2, "Unterlage im Papierkorb")
        a.get(f"{BA}/antraege/{aid}/stueck/{k}.pdf", expect=404)
        a.uj(f"{BA}/antraege/{aid}", {"status": "eingereicht"})
        a.put(f"{BA}/antraege/{aid}", {"felder": {"flur": "9"}}, expect=409)
        a.uj(f"{BA}/antraege/{aid}", {"status": "entwurf"})
        pruefe(any(x["id"] == aid for x in a.gj(f"{BA}/antraege")["antraege"]), "Antrag in der Liste")
        pk = a.delete(f"{BA}/antraege/{aid}").json["papierkorb"]
        a.get(f"{BA}/antraege/{aid}", expect=404)
        a.pj(f"/bauantrag/api/bp/papierkorb/{pk}/zurueck")
        gleich(a.gj(f"{BA}/antraege/{aid}")["antrag"]["name"], "RT Bauantrag", "aus dem Papierkorb zurück")
        pk = None
    finally:
        if pk is None:
            try:
                a.delete(f"{BA}/antraege/{aid}")
            except Exception:   # noqa: BLE001 – schon weg
                pass
