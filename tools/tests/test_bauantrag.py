"""Ablauftests Bauantrag: anlegen, Werte aus den Quellen, von Hand ändern und zurücksetzen, Entwurfsverfasser wählen,
Bauvorlagen, Stand „eingereicht“ sperrt, PDF, Papierkorb."""
from lib import finde, gleich, mini_pdf, pruefe

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
        if not u:   # Freigabe-Test mit den Produktiv-Einstellungen: kein Projektordner, kein Testserver → nichts in der Datenbank speichern
            pruefe(any("nicht gespeichert" in f for f in d.get("fehler") or []), f"ohne Projektordner: Meldung statt Speichern ({d.get('fehler')})")
        else:
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
            gleich(AF["felder"][0].get("akey"), "flurstueck", "Antragsfeld dahinter (Herkunft, Vorschläge)")
            # Bauherrschaft aus den Adressen wählen (Vorschlag im PDF): ganzer Block, Rückgängig über „vorher“
            kid = a.pj("/adressen/api/contacts", {"name": "RT Bauherr Wahl GmbH", "street": "Wahlweg 3", "zip": "45127", "city": "Essen", "email": "wahl@example.org"})["id"]
            try:
                d = a.pj(f"{BA}/antraege/{aid}/bauherr", {"kid": kid})
                F = {f["key"]: f for f in d["felder"]}
                gleich((F["bauherr_name"]["wert"], F["bauherr_anschrift"]["wert"], F["bauherr_mail"]["wert"]),
                       ("RT Bauherr Wahl GmbH", "Wahlweg 3, 45127 Essen", "wahl@example.org"), "Bauherr gewählt: Block aus den Adressen")
                v = d["vorher"]
                d = a.pj(f"{BA}/antraege/{aid}/bauherr", {"kid": v["kid"] or 0, "name": v["name"], "daten": v["daten"]})
                pruefe(next(f for f in d["felder"] if f["key"] == "bauherr_name")["wert"] != "RT Bauherr Wahl GmbH", "Rückgängig: vorheriger Bauherr")
            finally:
                a.delete(f"/adressen/api/contacts/{kid}", expect=None)
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
        pruefe(a.get(f"{BA}/antraege/{aid}/anschreiben.pdf").body[:4] == b"%PDF", "Anschreiben mit Anlagen")
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


def test_formular_loeschen(ctx):
    """Selbst hochgeladenes Formular löschen: Papierkorb, wiederherstellen, erneut löschen."""
    a = ctx.admin
    titel = ctx.name("Formular")
    pdf = mini_pdf(titel)
    d = a.post(f"{BA}/formulare/hochladen", dateien={"datei": (titel + ".pdf", pdf, "application/pdf")}, felder={"land": "BE", "titel": titel}).json
    x = finde(d["formulare"], titel=titel)
    pruefe(x, "hochgeladenes Formular in der Liste")
    gleich(x["url"], "", "ohne Adresse im Portal")
    d = a.delete(f"{BA}/formulare/{x['id']}").json
    pruefe(not [f for f in d["formulare"] if f["titel"] == titel], "gelöscht")
    a.post(f"{BA}/bp/papierkorb/{d['papierkorb']}/zurueck", {})
    pruefe([f for f in a.gj(f"{BA}/formulare?land=BE")["formulare"] if f["titel"] == titel], "aus dem Papierkorb zurück")
    a.delete(f"{BA}/formulare/{x['id']}")


def test_versionen_aenderung_ergaenzung(ctx):
    """Neue Version: Änderung bzw. Ergänzung mit Bezug zum Ursprung (Aktenzeichen, eingereicht am) – umstellbar; ganz neue Version ohne Bezug."""
    a = ctx.admin
    aid = a.pj(f"{BA}/antraege", {"project_id": ctx.pid, "verfahren": "baugenehmigung", "name": "RT Ursprung"})["antrag"]["id"]
    neu = []
    try:
        a.uj(f"{BA}/antraege/{aid}", {"bauvorlagen": {"statik": {"status": "nachgereicht"}}})
        a.uj(f"{BA}/antraege/{aid}/paket", {"anschreiben": {"aktenzeichen": "63/2-0815/26"}})
        d = a.uj(f"{BA}/antraege/{aid}", {"status": "eingereicht"})
        gleich(d["version"], None, "Ursprung ohne Bezug")
        d = a.pj(f"{BA}/antraege/{aid}/kopie", {"art": "aenderung", "was": "Dachgaube Nord", "name": "RT Änderung 1"})
        neu.append(d["antrag"]["id"])
        V = d["version"]
        gleich((V["art"], V["ursprung"], V["aktenzeichen"], V["was"], len(V["eingereicht"])), ("aenderung", aid, "63/2-0815/26", "Dachgaube Nord", 10), "Bezug zum Ursprung")
        pruefe(d["anschreiben"]["betreff"].startswith("Änderungsantrag zum") and "Az. 63/2-0815/26" in d["anschreiben"]["betreff"], "Betreff Änderungsantrag mit Aktenzeichen")
        pruefe("Geändert wird: Dachgaube Nord" in d["anschreiben"]["text"] and d["antrag"]["status"] == "entwurf", "Text nennt die Änderung, neue Version ist Entwurf")
        d = a.uj(f"{BA}/antraege/{neu[0]}/version", {"art": "ergaenzung"})
        pruefe(d["anschreiben"]["betreff"].startswith("Ergänzung zum") and "– Standsicherheitsnachweis" in d["anschreiben"]["text"], "Ergänzung listet die nachgereichten Unterlagen")
        L = {x["id"]: x for x in a.gj(f"{BA}/antraege")["antraege"]}
        gleich((L[neu[0]]["art"], L[neu[0]]["ursprung"], L[aid]["art"]), ("ergaenzung", aid, ""), "Liste: Art und Ursprung")
        d = a.pj(f"{BA}/antraege/{neu[0]}/kopie", {"art": "aenderung"})   # Änderung zur Ergänzung: Ursprung bleibt der erste Antrag
        neu.append(d["antrag"]["id"])
        gleich(d["version"]["ursprung"], aid, "Ursprung bleibt der erste Antrag")
        d = a.pj(f"{BA}/antraege/{aid}/kopie", {"name": "RT ganz neu"})
        neu.append(d["antrag"]["id"])
        gleich(d["version"], None, "ganz neue Version ohne Bezug")
        a.put(f"{BA}/antraege/{neu[-1]}/version", {"art": "aenderung"}, expect=400)
    finally:
        for i in neu + [aid]:
            try:
                a.delete(f"{BA}/antraege/{i}")
            except Exception:   # noqa: BLE001 – schon weg
                pass


def test_einreichen(ctx):
    """Einreichen: Weg, Datum, Aktenzeichen im Verlauf, Stand „eingereicht“, Angaben gesperrt; Rückgängig nimmt die Einreichung zurück."""
    a = ctx.admin
    aid = a.pj(f"{BA}/antraege", {"project_id": ctx.pid, "verfahren": "baugenehmigung", "name": "RT Einreichen"})["antrag"]["id"]
    try:
        d = a.pj(f"{BA}/antraege/{aid}/einreichen", {"weg": "bauportal", "datum": "2026-11-13", "aktenzeichen": "RT-63/26", "notiz": "Portal 4711", "ablegen": False})
        gleich(d["antrag"]["status"], "eingereicht", "Stand eingereicht")
        e = d["einreichungen"][-1]
        gleich((e["weg"], e["datum"], e["aktenzeichen"]), ("bauportal", "2026-11-13", "RT-63/26"), "Verlauf")
        a.put(f"{BA}/antraege/{aid}", {"felder": {"gebaeudeklasse": "3"}}, expect=409)
        d = a.delete(f"{BA}/antraege/{aid}/einreichen").json
        gleich((d["antrag"]["status"], d["einreichungen"]), ("entwurf", []), "Rückgängig")
    finally:
        a.delete(f"{BA}/antraege/{aid}", expect=(200, 404))
