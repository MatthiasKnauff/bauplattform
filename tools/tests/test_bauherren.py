"""Ablauftests Bauherrenportal, Seite des Büros (bpcore/bauherren.py): freigeben, Konten einladen und sperren, Einstellungen –
der Schlüssel geht nie an den Browser. Das Portal selbst prüft tools/tests/einheit/plattform_bauherren_portal.py."""
from lib import gleich, pruefe


def test_bauherren(ctx):
    a = ctx.admin
    E = a.gj("/api/bp/bauherren/einst")
    pruefe("schluessel" in E and E["schluessel"] in (True, False), "nur „hinterlegt“, nie der Wert")
    a.put("/api/bp/bauherren/einst", {"schluessel": "zu kurz"}, expect=400)
    a.put("/api/bp/bauherren/einst", {"url": "ftp://x"}, expect=400)
    E = a.uj("/api/bp/bauherren/einst", {"an": False, "url": "https://bauherren.example.org/", "takt": 5, "schluessel": "k" * 40})
    gleich((E["url"], E["takt"], E["schluessel"], E["an"]), ("https://bauherren.example.org", 15, True, False), "gespeichert, Takt mindestens 15 s")
    pruefe("k" * 40 not in str(E), "Schlüssel nicht in der Antwort")
    a.post("/api/bp/bauherren/freigeben", {"pid": 0, "art": "info"}, expect=400)
    r = a.pj("/api/bp/bauherren/freigeben", {"pid": ctx.pid, "art": "termine", "schluessel": "plan", "titel": "Terminplan", "daten": {"text": "Rohbau ab KW 3"}})
    a.pj("/api/bp/bauherren/freigeben", {"pid": ctx.pid, "art": "termine", "schluessel": "plan", "titel": "Terminplan neu", "daten": {"text": "Rohbau ab KW 4"}})
    P = a.gj(f"/api/bp/bauherren/projekt/{ctx.pid}")
    gleich([f["titel"] for f in P["freigaben"] if f["schluessel"] == r["schluessel"]], ["Terminplan neu"], "derselbe Schlüssel ersetzt das alte Paket")
    a.post(f"/api/bp/bauherren/projekt/{ctx.pid}", {"email": "kein-mail"}, expect=400)
    P = a.pj(f"/api/bp/bauherren/projekt/{ctx.pid}", {"email": "Bauherr@Example.org", "name": "B. Herr"})
    gleich([(k["email"], k["aktiv"]) for k in P["konten"]], [("bauherr@example.org", 1)], "eingeladen")
    gleich((P["konten"][0]["eingeladen"], P["url"]), ("", "https://bauherren.example.org"), "Einladungsmail noch nicht verschickt, Adresse des Portals für den Text")
    P = a.pj(f"/api/bp/bauherren/projekt/{ctx.pid}", {"eingeladen": "Bauherr@Example.org"})
    pruefe(P["konten"][0]["eingeladen"] and P["konten"][0]["aktiv"] == 1, "Vermerk „Einladung verschickt am …“, Konto unverändert")
    P = a.pj(f"/api/bp/bauherren/projekt/{ctx.pid}", {"email": "bauherr@example.org", "name": "B. Herr", "aktiv": False})
    gleich([k["aktiv"] for k in P["konten"]], [0], "gesperrt")
    P = a.pj(f"/api/bp/bauherren/projekt/{ctx.pid}", {"zurueck": r["schluessel"]})
    pruefe(all(f["geloescht"] for f in P["freigaben"] if f["schluessel"] == r["schluessel"]), "zurückgezogen")
    # 16.11.2026: Bereiche an/aus, Freigabe mit PDF, Datei im Büro ansehen
    B = {x["key"]: x["an"] for x in P["bereiche"]}
    gleich((B["plan"], B["kosten"], B["rechnung"], B["upload"]), (True, False, False, True), "Vorgabe: Kosten und Rechnungen aus")
    P = a.pj(f"/api/bp/bauherren/projekt/{ctx.pid}", {"bereiche": {"kosten": True, "plan": False, "gibtsnicht": True}})
    B = {x["key"]: x["an"] for x in P["bereiche"]}
    gleich((B["plan"], B["kosten"], "gibtsnicht" in B), (False, True, False), "umgeschaltet, Unbekanntes ignoriert")
    pdf = b"%PDF-1.4\n%Test\n"
    r = a.pj("/api/bp/bauherren/freigeben", felder={"json": '{"pid": %d, "art": "plan", "schluessel": "plan:101", "titel": "Grundriss EG – Index C"}' % ctx.pid},
             dateien={"datei": ("101 Grundriss EG C.pdf", pdf, "application/pdf")})
    pruefe(r["bereich_aus"], "Bereich Pläne ist aus – die App fragt nach dem Einschalten")
    P = a.gj(f"/api/bp/bauherren/projekt/{ctx.pid}")
    f = [x for x in P["freigaben"] if x["schluessel"] == r["schluessel"]][0]
    gleich([d["name"] for d in f["dateien"]], ["101 Grundriss EG C.pdf"], "PDF an der Freigabe")
    d = a.get(f"/api/bp/bauherren/datei/{r['schluessel']}/0")
    gleich((d.body, d.headers.get("Content-Type", "").split(";")[0]), (pdf, "application/pdf"), "im Büro abrufbar")
    a.post("/api/bp/bauherren/freigeben", felder={"json": '{"pid": %d, "art": "plan", "titel": "x"}' % ctx.pid}, dateien={"datei": ("x.exe", b"MZ", "application/x-msdownload")}, expect=400)
    a.get("/api/bp/bauherren/datei/gibtsnicht/0", expect=404)
    a.uj("/api/bp/bauherren/einst", {"an": False, "url": ""})


def test_bauherren_startseite(ctx):
    """Startseite im Portal (17.11.2026): Aussehen des Büros (Farbe, Anrede, Begrüßung), je Projekt Titelbild (Foto oder Zeichnung als PDF),
    Ansprechperson, Termine-Umfang, Bauphasen, Wochenmail-Schalter – Vorgaben sparsam (nur Bauphasen, keine Mail)."""
    from lib import mini_pdf
    a = ctx.admin
    A0 = a.gj("/api/bp/bauherren/aussehen")
    try:
        A = a.uj("/api/bp/bauherren/aussehen", {"farbe": A0["farben"][1], "anrede": "du", "gruss": "Hallo"})
        gleich((A["farbe"], A["anrede"], A["gruss"]), (A0["farben"][1], "du", "Hallo"), "Aussehen gespeichert")
        gleich(a.uj("/api/bp/bauherren/aussehen", {"farbe": "red"})["farbe"], A0["farben"][1], "nur Farben aus der Liste")
    finally:
        a.put("/api/bp/bauherren/aussehen", {k: A0[k] for k in ("farbe", "anrede", "gruss")})
    B = f"/api/bp/bauherren/projekt/{ctx.pid}"
    K = a.gj(B + "/kopf")
    gleich((K["termine"], K["mail"], K["phasen"]), ("phasen", "aus", True), "Vorgaben: nur Bauphasen, keine Mail, Bauphasen an")
    K = a.uj(B + "/kopf", {"termine": "alle", "mail": "woche", "anrede": "Sie", "bild_text": "Ansicht Süd", "ansprech": K["leute"][0]["id"]})
    gleich((K["termine"], K["mail"], K["anrede"], K["bild_text"]), ("alle", "woche", "Sie", "Ansicht Süd"), "je Projekt eingestellt")
    a.post(B + "/titelbild", dateien={"datei": ("x.txt", b"kein Bild", "text/plain")}, expect=400)
    K = a.post(B + "/titelbild", dateien={"datei": ("Ansicht.pdf", mini_pdf(), "application/pdf")}).json
    pruefe(K["bild"], "Zeichnung als Titelbild")
    r = a.get(B + "/titelbild")
    pruefe(r.body[:3] == b"\xff\xd8\xff", "als JPEG abgelegt")
    pruefe(not a.delete(B + "/titelbild").json["bild"], "entfernt")
    a.put(B + "/kopf", {"termine": "phasen", "mail": "aus", "anrede": "", "bild_text": "", "ansprech": ""})
