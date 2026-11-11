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
        # im PDF ausfüllen: platzierter Wert geändert → Antragsfeld (Maske, alle Vordrucke)
        AF = a.gj(f"{BA}/antraege/{aid}/stueck/{k}/felder")
        gleich([f["feld"] for f in AF["felder"]], ["flurstueck"], "Eingabefeld über dem platzierten Wert")
        d = a.uj(f"{BA}/antraege/{aid}/stueck/{k}/feld", {"feld": "flurstueck", "wert": "77/1"})
        gleich(next(f["wert"] for f in d["felder"] if f["key"] == "flurstueck"), "77/1", "im PDF geändert → in der Maske")
        a.get(f"{BA}/antraege/{aid}/stueck/{k}.pdf").ist_pdf()
        # Anschreiben, Deckblatt mit Häkchenliste, Trennblätter
        a.gj(f"{BA}/behoerden")
        d = a.uj(f"{BA}/antraege/{aid}/paket", {"anschreiben": {"empfaenger": "Stadt RT – Bauaufsicht\nTeststr. 1\n45127 Essen", "ansprechpartner": "Frau Test", "ausfertigungen": 2}})
        gleich((d["anschreiben"]["ansprechpartner"], d["anschreiben"]["ausfertigungen"]), ("Frau Test", 2), "Anschreiben")
        pruefe("2-facher" in d["anschreiben"]["text"], "Text-Vorschlag nennt die Ausfertigungen")
        d = a.uj(f"{BA}/antraege/{aid}/paket", {"deckblatt": {"neu": "Statik (folgt)", "punkt": "Statik (folgt)", "an": True}})
        pruefe(any(x["text"] == "Statik (folgt)" and x["an"] for x in d["deckblatt"]["punkte"]), "eigener Punkt auf dem Deckblatt")
        d = a.uj(f"{BA}/antraege/{aid}/paket", {"trenner": {"nr": 2, "titel": "Pläne"}})
        gleich(next(x["titel"] for x in d["paket"] if x["key"] == "t2"), "Pläne", "Trennblatt umbenannt")
        gleich(d["gewaehlt"][0], "t1", "Trennblatt 1 vorn")
        a.get(f"{BA}/antraege/{aid}/anschreiben.pdf").ist_pdf()
        a.get(f"{BA}/antraege/{aid}/stueck/t1.pdf").ist_pdf()
        a.get(f"{BA}/antraege/{aid}/paket.pdf").ist_pdf()
        a.get(f"{BA}/antraege/{aid}/paket.pdf?teile=anschreiben").ist_pdf()   # Druckseite: nur das Anschreiben
        a.get(f"{BA}/antraege/{aid}/paket.pdf?teile=deckblatt,t1,{k}").ist_pdf()
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


def test_anlagen(ctx):
    """Anlagen: freie Zeile mit Stand, Nummer aus der Gliederung, Anschreiben mit ausgeschriebenen Anlagen, Packliste im Paket,
    Abgabe digital/Papier, Entfernen."""
    a = ctx.admin
    d = a.pj(f"{BA}/antraege", {"project_id": ctx.pid, "verfahren": "baugenehmigung", "name": "RT Anlagen"})
    aid = d["antrag"]["id"]
    try:
        d = a.pj(f"{BA}/antraege/{aid}/anlage", {"neu": [{"art": "frei", "text": "Statik (Ing.-Büro Muster)"}, {"art": "frei", "text": "Vollmacht"}]})
        st, vo = d["neu"]
        d = a.uj(f"{BA}/antraege/{aid}/anlage", {"id": st, "stand": "nach"})
        E = {e["id"]: e for s in d["gliederung"] for e in s["eintraege"] if e.get("id")}
        gleich((E[st]["stand"], E[vo]["stand"], E[st]["art"]), ("nach", "bei", "nennen"), "genannt mit Stand")
        pruefe(E[st]["nr"] and E[vo]["nr"] and E[st]["nr"] != E[vo]["nr"], f"Anlagen-Nummern: {E[st]['nr']}, {E[vo]['nr']}")
        gleich(d["packliste"], 1, "Papier: die Vollmacht kommt auf die Packliste (Nachzureichendes nicht)")
        pruefe(a.get(f"{BA}/antraege/{aid}/anschreiben.pdf").content[:4] == b"%PDF", "Anschreiben mit Anlagen")
        d = a.uj(f"{BA}/antraege/{aid}/abgabe", {"abgabe": "digital"})
        gleich((d["abgabe"], d["packliste"]), ("digital", 0), "digital: keine Packliste")
        a.put(f"{BA}/antraege/{aid}/abgabe", {"abgabe": "fax"}, expect=400)
        d = a.delete(f"{BA}/antraege/{aid}/anlage", {"id": vo}).json
        pruefe(all(x["id"] != vo for x in d["anlagen"]), "entfernt")
    finally:
        try:
            a.delete(f"{BA}/antraege/{aid}")
        except Exception:   # noqa: BLE001 – schon weg
            pass
