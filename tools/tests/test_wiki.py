"""Ablauftests Wiki (13.11.2026): Erkenntnis aus einer anderen App festhalten (/api/bp/wiki), in der App ändern, Rückgängig über „vorher“,
Status – fachlich prüfen nur mit Recht, geprüfter Eintrag wird beim Ändern wieder „zu prüfen“ –, Hinweise in den Apps nur für geprüfte,
Suche, PDF, Löschen und Zurückholen. Dateien gehen auf die Freigabe „Bauportal“ (im Test nicht eingerichtet → verständlicher Fehler)."""
from lib import gleich, pruefe

WK = "/wiki/api"


def test_wiki_ablauf(ctx):
    a, anna = ctx.admin, ctx.anmelden("Anna Bauer")
    wort = "RTkmb" + ctx.name("x")[-6:]
    eid = anna.pj("/ava/api/bp/wiki", {"text": f"Hohlkehle vor der {wort} trocknen lassen. Sonst reißt die Beschichtung.", "kapitel": "Abdichtung",
                                       "quelle": "AVA · LV 01", "projekt_id": ctx.pid})["id"]
    try:
        E = a.gj(f"{WK}/eintraege/{eid}")
        gleich((E["status"], E["kapitel"], E["titel"], E["quelle"]), ("neu", "Abdichtung", f"Hohlkehle vor der {wort} trocknen lassen.", "AVA · LV 01"),
               "festgehalten: neu, Titel aus dem ersten Satz")
        L = a.gj(f"{WK}/eintraege?q={wort}")
        gleich([x["id"] for x in L["eintraege"]], [eid], "Suche findet den Eintrag")
        pruefe("Abdichtung" in L["kapitel"] and L["darf_pruefen"], "Kapitel und Prüfrecht (Administrator)")
        d = a.uj(f"{WK}/eintraege/{eid}", {"stichworte": f"{wort}; Sockel\nAbdichtung", "titel": "Hohlkehle trocknen lassen"})
        gleich((d["stichworte"], d["titel"], d["vorher"]["titel"]), (f"Abdichtung, {wort}, Sockel", "Hohlkehle trocknen lassen", E["titel"]), "geändert, vorher für Rückgängig")
        gleich(a.gj(f"/ava/api/bp/wiki/hinweise?w={wort}")["hinweise"], [], "ungeprüft: kein Hinweis in den Apps")
        anna.put(f"{WK}/eintraege/{eid}", {"status": "geprueft"}, expect=403)
        d = a.uj(f"{WK}/eintraege/{eid}", {"status": "geprueft"})
        gleich(d["status"], "geprueft", "Administrator prüft fachlich")
        H = a.gj(f"/bautagebuch/api/bp/wiki/hinweise?w=Gewerk%20{wort},Mauerwerk")["hinweise"]
        gleich([x["id"] for x in H], [eid], "geprüft: Hinweis über das Stichwort")
        d = anna.uj(f"{WK}/eintraege/{eid}", {"text": "Hohlkehle mindestens 24 h trocknen lassen."})
        gleich(d["status"], "zusammengefasst", "Text geändert: wieder zu prüfen")
        anna.put(f"{WK}/eintraege/{eid}", {"status": "quatsch"}, expect=400)
        pdf = a.get(f"{WK}/pdf")
        pruefe(pdf.body[:5] == b"%PDF-" and pdf.ctype.startswith("application/pdf"), "PDF des Wikis")
        a.post(f"{WK}/eintraege/{eid}/datei", {"name": "a.txt", "datei": "aGFsbG8="}, expect=None)
        a.delete(f"{WK}/eintraege/{eid}")
        a.get(f"{WK}/eintraege/{eid}", expect=404)
        a.pj(f"{WK}/eintraege/{eid}/zurueck")
        gleich(a.gj(f"{WK}/eintraege/{eid}")["titel"], "Hohlkehle trocknen lassen", "zurückgeholt")
        anna.post("/ava/api/bp/wiki", {"text": "  "}, expect=400)
    finally:
        a.delete(f"{WK}/eintraege/{eid}", expect=None)


def test_wiki_warnung(ctx):
    """Beim Eintippen: Antwort mit geprüften Einträgen und früheren Mängeln (Testdaten), Gäste nicht."""
    W = ctx.admin.gj("/ava/api/bp/wiki/warnung?t=Fenster%20liefern%20und%20einbauen&w=Fenster")
    pruefe(isinstance(W.get("wiki"), list) and isinstance(W.get("maengel"), list), "wiki und maengel")
    gleich(ctx.admin.gj("/ava/api/bp/wiki/warnung?t=und")["maengel"], [], "nur Füllwörter: nichts")
    ctx.gast().get("/ava/api/bp/wiki/warnung?t=Fenster", expect=401)


def test_wiki_rechte(ctx):
    ctx.gast().get(f"{WK}/eintraege", expect=401)
    S = ctx.admin.gj(f"{WK}/sammeln")
    pruefe(S["darf"] and isinstance(S["auftrag"], dict), "Sammeln: Stand für Administrator")
    ctx.anmelden("Anna Bauer").post(f"{WK}/sammeln", {"wochen": 2}, expect=403)
    ctx.gast().post("/ava/api/bp/wiki", {"text": "x"}, expect=401)
    gleich(ctx.admin.gj(f"{WK}/woche"), {}, "kein Vorschlag offen")


def test_wiki_tags_projekte(ctx):
    """Tags statt Rubrik (der erste ordnet ein), mehrere Projekte je Eintrag, Tags nach Häufigkeit, Vorbelegung aus einem Dokument."""
    import base64
    a = ctx.admin
    eid = a.pj("/wiki/api/bp/wiki", {"text": "RT Tags: Grundleitung vor dem Betonieren prüfen.", "tags": ["Entwässerung", "Bodenplatte", "entwässerung"],
                                     "projekte": [{"id": ctx.pid, "name": "x"}, {"name": "A999 Nur Ordner"}]})["id"]
    try:
        E = a.gj(f"{WK}/eintraege/{eid}")
        gleich((E["kapitel"], E["tags"], len(E["projekte"]), E["projekt_id"]), ("Entwässerung", ["Entwässerung", "Bodenplatte"], 2, ctx.pid), "Tags und Projekte")
        d = a.uj(f"{WK}/eintraege/{eid}", {"tags": ["Bodenplatte"]})
        gleich((d["kapitel"], d["tags"]), ("Bodenplatte", ["Bodenplatte"]), "erster Tag ordnet ein")
        a.uj(f"{WK}/eintraege/{eid}", {"kapitel": d["vorher"]["kapitel"], "stichworte": d["vorher"]["stichworte"]})
        gleich(a.gj(f"{WK}/eintraege/{eid}")["tags"], ["Entwässerung", "Bodenplatte"], "Rückgängig")
        T = a.gj(f"{WK}/eintraege")["tags"]
        pruefe(any(x["tag"] == "Entwässerung" and x["n"] >= 1 for x in T), "Tags mit Zahl")
        v = a.pj("/wiki/api/bp/wiki/lesen", {"name": "p.txt", "datei": base64.b64encode("Protokoll: Bodenplatte und Entwässerung geprüft.".encode()).decode(), "essenz": False})
        pruefe("Bodenplatte" in v["tags"], f"Vorbelegung aus dem Dokument: {v}")
    finally:
        a.delete(f"{WK}/eintraege/{eid}", expect=None)


def test_wiki_runde(ctx):
    """Wiki in Runden (14.11.2026): vorlegen → vorsichten (behalten/Unsinn, Fertig) → ohne Auswertung direkt verteilt → fachlich prüfen
    (warten, ins Wiki); Einstellungen nur in der Verwaltung; die Einstellungen werden am Ende zurückgesetzt."""
    a, anna = ctx.admin, ctx.anmelden("Anna Bauer")
    E0 = a.gj(f"{WK}/runde")["einst_alle"]
    anna.put(f"{WK}/runde/einst", {"tage": 14}, expect=403)
    a.put(f"{WK}/runde/einst", {"ki": "intern"}, expect=400)
    wort = "RNDx" + ctx.name("x")[-6:]
    ids = [anna.pj("/ava/api/bp/wiki", {"text": f"{wort} Erkenntnis {i}. Mehr Text dazu.", "kapitel": "Bauablauf", "projekt_id": ctx.pid})["id"] for i in range(2)]
    try:
        a.uj(f"{WK}/runde/einst", {"vorsicht": True, "auswerten": False})
        R = a.pj(f"{WK}/runde/vorlegen")
        pruefe(R["runde"]["stufe"] == "vorsicht" and R["zahl"]["vorsicht"] >= 2, "vorgelegt: zum Vorsichten")
        a.pj(f"{WK}/runde/vorsicht", {"id": ids[1], "behalten": False})
        a.get(f"{WK}/eintraege/{ids[1]}", expect=404)
        R = a.pj(f"{WK}/runde/fertig")
        gleich(R["runde"]["stufe"], "pruefen", "ohne Auswertung: gleich zur fachlichen Prüfung")
        E = a.gj(f"{WK}/eintraege/{ids[0]}")
        pruefe(E["status"] == "zusammengefasst" and E["pruefer"], "verteilt an eine Person mit „Wiki prüfen“")
        anna.post(f"{WK}/runde/pruefen", {"id": ids[0], "aktion": "ok"}, expect=403)
        a.pj(f"{WK}/runde/pruefen", {"id": ids[0], "aktion": "warten"})
        pruefe(a.gj(f"{WK}/eintraege/{ids[0]}")["warten"] > 0, "zurückgestellt bis zur nächsten Runde")
        a.pj(f"{WK}/runde/pruefen", {"id": ids[0], "aktion": "ok"})
        gleich(a.gj(f"{WK}/eintraege/{ids[0]}")["status"], "geprueft", "ins Wiki")
        a.post(f"{WK}/runde/pruefen", {"id": ids[0], "aktion": "quatsch"}, expect=400)
    finally:
        a.uj(f"{WK}/runde/einst", {k: E0[k] for k in ("vorsicht", "auswerten")})
        for i in ids:
            a.delete(f"{WK}/eintraege/{i}", expect=None)
