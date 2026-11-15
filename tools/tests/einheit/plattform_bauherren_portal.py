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
