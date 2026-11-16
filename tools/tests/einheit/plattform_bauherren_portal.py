"""Bauherrenportal (15.11.2026): eigene App auf eigenem Server – Abgleich mit dem Kern, Anmeldung per Link, Kennwort + zweiter Faktor,
QR-Code wie bei Nextcloud, Rechte je Projekt, Schutz gegen fremde Formulare (bauherren/app.py, anmeldung.py, speicher.py)."""
import importlib, os, sys, tempfile

from lib import gleich, pruefe

HIER = "/app/bauherren" if os.path.isdir("/app/bauherren") else os.path.join(os.path.dirname(__file__), "..", "..", "..", "bauherren")
SK = "s" * 40


def _app():
    os.environ["BH_DB"] = os.path.join(tempfile.mkdtemp(), "bh.db")
    os.environ["BH_SCHLUESSEL"] = SK
    os.environ["BH_UNSICHER"] = "1"
    sys.path.insert(0, os.path.abspath(HIER))
    for m in ("speicher", "anmeldung", "app"):
        sys.modules.pop(m, None)
    A = importlib.import_module("anmeldung")
    app = importlib.import_module("app")
    return app, A


def test_totp_rfc():
    _, A = _app()
    g = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"   # RFC 6238, Anhang B: „12345678901234567890“
    gleich(A._totp(g, 59 // 30), "287082", "Zeit 59")
    gleich(A._totp(g, 1111111109 // 30), "081804", "Zeit 1111111109")
    pruefe(A.totp_ok(g, "287082", jetzt=59) and not A.totp_ok(g, "287083", jetzt=59), "Prüfung")


def test_ablauf():
    app, A = _app()
    cl = app.app.test_client()
    K = {"Authorization": "Bearer " + SK}
    gleich(cl.post("/api/kern/sync", json={}).status_code, 401, "ohne Schlüssel kein Zugang")
    gleich(cl.post("/api/kern/sync", json={}, headers={"Authorization": "Bearer " + "x" * 40}).status_code, 401, "falscher Schlüssel")
    r = cl.post("/api/kern/sync", headers=K, json={"pakete": [{"id": "7:termine:t", "pid": "7", "projekt": "Tierheim", "art": "termine", "titel": "Terminplan", "stand": "2026-11-15", "daten": {"text": "Rohbau ab KW 3"}},
                                                              {"id": "8:info:x", "pid": "8", "projekt": "Fremd", "art": "info", "titel": "Geheim", "daten": {"text": "nicht für A"}}],
                                                   "konten": [{"email": "a@b.de", "name": "Anna", "projekte": ["7"], "aktiv": True}]})
    gleich(r.get_json()["pakete"], 2, "Pakete angekommen")
    gleich(cl.get("/api/ich").get_json()["angemeldet"], False, "nicht angemeldet")
    gleich(cl.post("/api/anmelden/link", json={"email": "a@b.de"}).status_code, 403, "ohne Kopf X-BH: abgelehnt (fremde Formulare)")
    H = {"X-BH": "1"}
    pruefe(cl.post("/api/anmelden/link", json={"email": "a@b.de"}, headers=H).get_json()["ok"], "Link angefordert")
    pruefe(cl.post("/api/anmelden/link", json={"email": "unbekannt@b.de"}, headers=H).get_json()["ok"], "unbekannte Adresse: gleiche Antwort")
    E = cl.get("/api/kern/eingang", headers=K).get_json()
    gleich([x["art"] for x in E], ["mail"], "nur ein Mail-Auftrag – für die unbekannte Adresse keiner")
    link = E[0]["daten"]["text"].split("http://localhost")[1].split()[0]
    cl.post("/api/kern/eingang/quittung", headers=K, json={"ids": [E[0]["id"]]})
    gleich(cl.get("/api/kern/eingang", headers=K).get_json(), [], "abgeholt")
    gleich(cl.get(link).status_code, 302, "Link einlösen")
    gleich(cl.get(link).status_code, 200, "zweites Mal: nur Hinweis (Link verbraucht)")
    I = cl.get("/api/ich").get_json()
    gleich([p["pid"] for p in I["projekte"]], ["7"], "nur das eigene Projekt")
    gleich(cl.get("/api/paket/8/8:info:x").status_code, 404, "fremdes Paket nicht lesbar")
    gleich(cl.get("/api/paket/7/7:termine:t").get_json()["daten"]["text"], "Rohbau ab KW 3", "eigenes Paket")
    gleich(cl.post("/api/nachricht", json={"pid": "8", "text": "x"}, headers=H).status_code, 403, "Nachricht nur in eigene Projekte")
    pruefe(cl.post("/api/nachricht", json={"pid": "7", "text": "Wann kommt das Gerüst?"}, headers=H).get_json()["ok"], "Nachricht")
    gleich([x["daten"]["text"] for x in cl.get("/api/kern/eingang", headers=K).get_json()], ["Wann kommt das Gerüst?"], "Nachricht im Eingangskorb")
    # Kennwort + zweiter Faktor
    gleich(cl.post("/api/konto/kennwort", json={"neu": "kurz"}, headers=H).status_code, 400, "Kennwort zu kurz")
    pruefe(cl.post("/api/konto/kennwort", json={"neu": "ein langes Kennwort"}, headers=H).get_json()["ok"], "Kennwort gesetzt")
    g = cl.post("/api/konto/2fa/start", json={}, headers=H).get_json()["geheim"]
    import time as _t
    pruefe(cl.post("/api/konto/2fa/bestaetigen", json={"code": A._totp(g, int(_t.time() // 30))}, headers=H).get_json()["ok"], "zweiter Faktor an")
    cl2 = app.app.test_client()
    gleich(cl2.post("/api/anmelden/kennwort", json={"email": "a@b.de", "kennwort": "falsch"}, headers=H).status_code, 401, "falsches Kennwort")
    gleich(cl2.post("/api/anmelden/kennwort", json={"email": "a@b.de", "kennwort": "ein langes Kennwort"}, headers=H).get_json(), {"code": True}, "Code wird verlangt")
    pruefe(cl2.post("/api/anmelden/kennwort", json={"email": "a@b.de", "kennwort": "ein langes Kennwort", "code": A._totp(g, int(_t.time() // 30))}, headers=H).get_json()["ok"], "mit Code angemeldet")
    # QR wie bei Nextcloud: PC ohne Anmeldung zeigt Code, das angemeldete Handy (cl) erlaubt
    pc = app.app.test_client()
    t = pc.post("/api/qr/neu", json={}, headers=H).get_json()["token"]
    gleich(pc.get(f"/api/qr/{t}").get_json()["fertig"], False, "wartet")
    fremd = app.app.test_client()
    pruefe(cl.post(f"/api/qr/{t}/erlauben", json={}, headers=H).get_json()["ok"], "Handy erlaubt")
    gleich(fremd.get(f"/api/qr/{t}").get_json()["fertig"], False, "ein fremder Browser bekommt die Sitzung nicht")
    pruefe(pc.get(f"/api/qr/{t}").get_json()["fertig"] and pc.get("/api/ich").get_json()["angemeldet"], "PC angemeldet")
    # gesperrt: sofort abgemeldet
    cl.post("/api/kern/sync", headers=K, json={"konten": [{"email": "a@b.de", "projekte": [], "aktiv": False}]})
    gleich(cl.get("/api/ich").get_json()["angemeldet"], False, "gesperrt → abgemeldet")


def test_abgleich_mailfehler_sichtbar():
    """Kann der Kern einen Anmeldelink nicht verschicken, steht der Grund im Stand (Verwaltung) und der Auftrag bleibt im Eingangskorb."""
    from contextlib import contextmanager
    from bpcore import bauherren as B
    lager = {"bauherren:einst": {"an": True, "url": "https://portal.test"}, "bauherren:schluessel": "k" * 40}

    class C:
        def execute(self, *a):
            return self

        def fetchall(self):
            return []

        def fetchone(self):
            return None

    @contextmanager
    def tx():
        yield C()

    quittiert = []
    alt = (B._store, B._ruf)
    B._store = lambda c, k, v=None: lager.get(k) if v is None else lager.__setitem__(k, v)
    B._ruf = lambda E, sk, m, pfad, body=None, timeout=60: ([{"id": 1, "art": "mail", "daten": {"an": "a@b.de", "betreff": "x", "text": "y"}}] if pfad == "/api/kern/eingang"
                                                           else quittiert.append(body) or {})

    def kaputt(an, betreff, text):
        raise RuntimeError("Mailversand nicht eingerichtet")
    try:
        n = B.abgleich(tx, kaputt)
        gleich(n["mails"], 0, "nichts verschickt")
        pruefe("a@b.de" in lager["bauherren:stand"]["fehler"] and "nicht eingerichtet" in lager["bauherren:stand"]["fehler"], f"Grund im Stand: {lager['bauherren:stand']}")
        gleich(quittiert, [], "Auftrag bleibt im Eingangskorb")
        n = B.abgleich(tx, lambda an, betreff, text: None)
        gleich((n["mails"], lager["bauherren:stand"]["fehler"], quittiert), (1, "", [{"ids": [1]}]), "beim nächsten Durchgang verschickt, Fehler weg, quittiert")
    finally:
        B._store, B._ruf = alt


def _angemeldet(app, cl, K, mail="a@b.de"):
    H = {"X-BH": "1"}
    cl.post("/api/anmelden/link", json={"email": mail}, headers=H)
    E = [x for x in cl.get("/api/kern/eingang", headers=K).get_json() if x["art"] == "mail"]
    link = E[-1]["daten"]["text"].split("http://localhost")[1].split()[0]
    cl.post("/api/kern/eingang/quittung", headers=K, json={"ids": [x["id"] for x in E]})
    cl.get(link)
    return H


def test_bereiche_dateien_hochladen():
    """16.11.2026: Bereiche je Projekt an/aus (aus = unsichtbar, nicht gelöscht), PDFs an Paketen, Dateien der Bauherr:innen ans Büro."""
    import base64, io
    app, A = _app()
    cl = app.app.test_client()
    K = {"Authorization": "Bearer " + SK}
    pdf = b"%PDF-1.4 Plan"
    cl.post("/api/kern/sync", headers=K, json={
        "pakete": [{"id": "7:plan:101", "pid": "7", "projekt": "Tierheim", "art": "plan", "titel": "Grundriss EG", "stand": "2026-11-14",
                    "daten": {"text": "Index C", "dateien": [{"name": "101 Grundriss EG C.pdf", "mime": "application/pdf", "b64": base64.b64encode(pdf).decode()}]}},
                   {"id": "7:kosten:k", "pid": "7", "projekt": "Tierheim", "art": "kosten", "titel": "Kostenstand", "daten": {"text": "684.000 €"}}],
        "konten": [{"email": "a@b.de", "name": "Anna", "projekte": ["7"], "aktiv": True}]})
    H = _angemeldet(app, cl, K)
    P = cl.get("/api/ich").get_json()["projekte"][0]
    gleich([x["art"] for x in P["pakete"]], ["plan"], "Kosten ist ohne Einstellung aus (Vorgabe), Pläne an")
    pruefe(P["upload"] and P["nachricht"], "Hochladen und Nachrichten an")
    d = cl.get("/api/paket/7/7:plan:101").get_json()["daten"]
    gleich((d["dateien"][0]["name"], d["dateien"][0]["groesse"], "b64" in d["dateien"][0]), ("101 Grundriss EG C.pdf", len(pdf), False), "im Paket nur Name und Größe")
    r = cl.get("/api/datei/7/7:plan:101/0")
    gleich((r.status_code, r.data, r.mimetype), (200, pdf, "application/pdf"), "PDF abrufbar")
    gleich(cl.get("/api/paket/7/7:kosten:k").status_code, 404, "ausgeschalteter Bereich: wie nicht vorhanden")
    # Büro schaltet um: Kosten an, Pläne und Hochladen aus
    cl.post("/api/kern/sync", headers=K, json={"projekte": [{"pid": "7", "name": "Tierheim", "bereiche": {"kosten": True, "plan": False, "upload": False}}]})
    P = cl.get("/api/ich").get_json()["projekte"][0]
    gleich(([x["art"] for x in P["pakete"]], P["upload"]), (["kosten"], False), "umgeschaltet")
    gleich(cl.get("/api/datei/7/7:plan:101/0").status_code, 404, "PDF eines ausgeschalteten Bereichs nicht abrufbar")
    gleich(cl.post("/api/hochladen", data={"pid": "7", "datei": (io.BytesIO(b"x"), "a.pdf")}, headers=H).status_code, 400, "Hochladen aus")
    cl.post("/api/kern/sync", headers=K, json={"projekte": [{"pid": "7", "bereiche": {"plan": True, "kosten": True, "upload": True, "nachricht": False}}]})
    gleich([x["art"] for x in cl.get("/api/ich").get_json()["projekte"][0]["pakete"]], ["plan", "kosten"], "wieder an: wieder da (nicht gelöscht)")
    gleich(cl.post("/api/nachricht", json={"pid": "7", "text": "x"}, headers=H).status_code, 403, "Nachrichten aus")
    # Hochladen
    gleich(cl.post("/api/hochladen", data={"pid": "7", "datei": (io.BytesIO(b"x"), "a.exe")}, headers=H).status_code, 400, "falsche Dateiart")
    gleich(cl.post("/api/hochladen", data={"pid": "8", "datei": (io.BytesIO(b"x"), "a.pdf")}, headers=H).status_code, 403, "fremdes Projekt")
    gleich(cl.post("/api/hochladen", data={"pid": "7", "datei": (io.BytesIO(b"x"), "a.pdf")}).status_code, 403, "ohne Kopf X-BH")
    pruefe(cl.post("/api/hochladen", data={"pid": "7", "text": "Angebot Küche", "datei": (io.BytesIO(b"%PDF Angebot"), "Angebot.pdf")}, headers=H).get_json()["ok"], "hochgeladen")
    E = [x for x in cl.get("/api/kern/eingang", headers=K).get_json() if x["art"] == "datei"]
    gleich((E[0]["daten"]["name"], E[0]["daten"]["text"], E[0]["daten"]["mime"], "b64" in E[0]["daten"]), ("Angebot.pdf", "Angebot Küche", "application/pdf", False), "im Eingangskorb ohne Inhalt")
    gleich(cl.get(f"/api/kern/eingang/{E[0]['id']}/datei").status_code, 401, "Inhalt nur für den Kern")
    gleich(cl.get(f"/api/kern/eingang/{E[0]['id']}/datei", headers=K).data, b"%PDF Angebot", "Kern holt den Inhalt")
    gleich(cl.get("/api/hochgeladen/7").get_json()[0]["angekommen"], False, "noch nicht abgeholt")
    cl.post("/api/kern/eingang/quittung", headers=K, json={"ids": [E[0]["id"]]})
    gleich((cl.get("/api/hochgeladen/7").get_json()[0]["angekommen"], cl.get(f"/api/kern/eingang/{E[0]['id']}/datei", headers=K).status_code), (True, 404),
           "nach dem Abholen: angekommen, Inhalt im Portal gelöscht")
    # Paket ersetzt/gelöscht: Dateien weg
    cl.post("/api/kern/sync", headers=K, json={"loeschen": ["7:plan:101"]})
    gleich(cl.get("/api/datei/7/7:plan:101/0").status_code, 404, "zurückgezogen: PDF weg")


def test_abgleich_bereiche_dateien_uploads():
    """Kern: schickt Bereiche, PDFs (base64, in Häppchen) und holt Dateien der Bauherr:innen ab – abgelegt und als Kopie im Büro."""
    import json as J
    from contextlib import contextmanager
    from bpcore import bauherren as B
    lager = {"bauherren:einst": {"an": True, "url": "https://portal.test"}, "bauherren:schluessel": "k" * 40,
             "bauherren:bereiche:7": {"b": {**{k: True for k in B.BEREICHE}, "kosten": False}, "gesendet": ""}}
    gross = b"P" * (B.HAEPPCHEN // 2 + 10)
    F = [{"id": 1, "schluessel": "7:plan:101", "project_id": 7, "projekt": "Tierheim", "art": "plan", "titel": "Grundriss", "stand": "2026-11-14", "daten": "{}", "geloescht": "", "updated": "u"},
         {"id": 2, "schluessel": "7:plan:102", "project_id": 7, "projekt": "Tierheim", "art": "plan", "titel": "Schnitt", "stand": "2026-11-14", "daten": "{}", "geloescht": "", "updated": "u"}]
    DB = {"datei": {"7:plan:101": [{"nr": 0, "name": "101.pdf", "mime": "application/pdf", "groesse": len(gross), "inhalt": gross}],
                    "7:plan:102": [{"nr": 0, "name": "102.pdf", "mime": "application/pdf", "groesse": len(gross), "inhalt": gross}]}, "eingang": [], "gespeichert": []}

    class C:
        def __init__(self):
            self.r = []

        def execute(self, sql, a=()):
            s = " ".join(sql.split())
            self.r = []
            if s.startswith("SELECT f.*"):
                self.r = F
            elif s.startswith("SELECT key, data FROM bp_store"):
                self.r = [{"key": k, "data": J.dumps(v)} for k, v in lager.items() if k.startswith("bauherren:bereiche:")]
            elif s.startswith("SELECT name FROM projects"):
                self.r = [{"name": "Tierheim"}]
            elif "FROM bh_datei" in s and s.startswith("SELECT"):
                self.r = DB["datei"].get(a[0], [])
            elif s.startswith("INSERT INTO bh_eingang"):
                DB["eingang"].append(a)
            elif s.startswith("INSERT INTO bh_datei"):
                DB["gespeichert"].append(a)
            return self

        def fetchall(self):
            return self.r

        def fetchone(self):
            return self.r[0] if self.r else None

    @contextmanager
    def tx():
        yield C()
    gesendet, quittiert = [], []

    def ruf(E, sk, m, pfad, body=None, timeout=60):
        if pfad == "/api/kern/sync":
            gesendet.append(body)
            return {}
        if pfad == "/api/kern/eingang":
            return [{"id": 5, "art": "datei", "pid": "7", "zeit": 1763280000, "daten": {"name": "Angebot.pdf", "mime": "application/pdf", "von": "Anna", "text": "Küche"}}]
        quittiert.append(body)
        return {}
    alt = (B._store, B._ruf, B._ruf_roh)
    B._store = lambda c, k, v=None: lager.get(k) if v is None else lager.__setitem__(k, v)
    B._ruf, B._ruf_roh = ruf, lambda E, sk, pfad, timeout=300: b"%PDF Angebot"
    abgelegt = []
    try:
        n = B.abgleich(tx, lambda *a: None, lambda pid, name, data: abgelegt.append((pid, name, data)) or "A481 Tierheim/Von Bauherrschaft/Angebot.pdf")
        gleich(len(gesendet), 2, "zwei große Pläne: zwei Häppchen")
        gleich(gesendet[0]["projekte"], [{"pid": "7", "name": "Tierheim", "bereiche": {**{k: True for k in B.BEREICHE}, "kosten": False}}], "Bereiche mit dem ersten Häppchen")
        gleich(gesendet[1]["projekte"], [], "nicht doppelt")
        d = gesendet[0]["pakete"][0]["daten"]["dateien"][0]
        gleich((d["name"], len(d["b64"]) > len(gross)), ("101.pdf", True), "PDF als base64")
        pruefe(lager["bauherren:bereiche:7"]["gesendet"], "Bereiche als gesendet vermerkt")
        gleich(abgelegt, [(7, "Angebot.pdf", b"%PDF Angebot")], "Datei abgelegt")
        gleich(J.loads(DB["eingang"][0][3])["ablage"], "A481 Tierheim/Von Bauherrschaft/Angebot.pdf", "wo sie liegt, steht am Eintrag")
        gleich((DB["gespeichert"][0][0], DB["gespeichert"][0][5]), ("e:5", b"%PDF Angebot"), "Kopie im Büro")
        gleich((quittiert, n["eingang"]), ([{"ids": [5]}], 1), "quittiert")
    finally:
        B._store, B._ruf, B._ruf_roh = alt


def test_ansicht3d_ausgeliefert():
    """Gebäude im Portal (16.11.2026): der 3D-Betrachter kommt aus dem Baukasten, andere Dateien von dort nicht."""
    app, _ = _app()
    cl = app.app.test_client()
    r = cl.get("/static/ansicht3d.js")
    pruefe(r.status_code == 200 and b"bp3d" in r.data and "javascript" in r.headers.get("Content-Type", ""), f"ansicht3d.js: {r.status_code}")
    gleich(cl.get("/static/head.js").status_code, 404, "sonst nichts aus dem Baukasten")
