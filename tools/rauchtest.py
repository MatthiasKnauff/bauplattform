"""Rauchtest der Bauplattform – läuft in GitHub Actions vor jeder Freigabe (siehe .github/workflows/build.yml).

Prüft gegen eine frisch gestartete Plattform (über den Verteiler, alle Apps unter einer Adresse):
  1. Verteiler und Startseite antworten
  2. Anmeldung mit dem Testbenutzer „Test-Admin“ (aus bautagebuch/tools/testdaten.py)
  3. Jede App: Hauptseite lädt, Anmeldung gilt dort auch (SSO), wichtigste Datenabfragen liefern keine Fehler

Gezählt wird als Fehler: keine Antwort, Serverfehler (5xx), nicht angemeldet (401/403), Seite fehlt (404),
kaputtes JSON. Eine 400 (z. B. fehlender Parameter) gilt als „antwortet“ und ist in Ordnung.

Aufruf:  python3 tools/rauchtest.py http://localhost:8090
Nur Python-Standardbibliothek. Rückgabewert 0 = alles grün, 1 = mindestens ein Fehler.
"""
import http.cookiejar, json, sys, time, urllib.error, urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8090").rstrip("/")
USER, PW = "Test-Admin", "Testdaten1"

# Pfad im Verteiler → (Name, Datenabfragen). Die Hauptseite "/" und "/api/me" prüft der Test bei jeder App selbst.
# {pid} = ein Testprojekt aus dem Bautagebuch (wird nach der Anmeldung ermittelt).
# Nicht geprüft: alles, was die Ablage auf dem Dateiserver braucht (z. B. Planliste) – die gibt es im Test nicht.
APPS = {
    "bautagebuch":   ("Bautagebuch", ["/api/projects", "/api/contacts", "/api/settings", "/api/users", "/api/backups", "/api/search?q=Test"]),
    "bauzeitenplan": ("Bauzeitenplan", ["/api/health", "/api/bt-projects", "/api/firms", "/api/library", "/api/phases", "/api/settings"]),
    "adressen":      ("Adressen", ["/api/contacts", "/api/contacts/duplikate"]),
    "baukosten":     ("Baukosten", ["/api/bk", "/api/kennwerte", "/api/sources"]),
    "maengel":       ("Aufgaben & Post (Offen)", ["/api/maengel", "/api/termine", "/api/erinnerungen", "/api/projekte"]),
    "plaene":        ("Pläne", ["/api/projekte", "/api/kontakte", "/api/versandliste?project_id={pid}"]),
    "ava":           ("AVA", ["/api/projekte", "/api/kontakte", "/api/uebersicht", "/api/baudaten/kataloge"]),
    "kommunikation": ("Aufgaben & Post (Verschickt)", ["/api/kom", "/api/kontakte"]),
    "baudaten":      ("Baudaten", ["/api/start", "/api/gruppen", "/api/firmen"]),
    "zeiten":        ("Zeiten", ["/api/grund", "/api/tag", "/api/woche", "/api/monat", "/api/offen", "/api/konten", "/api/auswertung"]),
    "honorar":       ("Honorar", ["/api/auftraege"]),
    "bauantrag":     ("Bauantrag", ["/api/antraege"]),
    "waermeschutz":  ("Wärmeschutz", ["/api/nachweise", "/api/katalog"]),
    "wiki":          ("Wiki", ["/api/eintraege", "/api/woche"]),
    "verwaltung":    ("Verwaltung", ["/api/users", "/api/status", "/api/projects", "/api/audit", "/api/einstellungen"]),
}

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
fehler, ok = [], 0


def req(method, path, body=None, timeout=60):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method,
                               headers={"Content-Type": "application/json"} if data else {})
    try:
        with opener.open(r, timeout=timeout) as resp:
            return resp.status, resp.headers.get("Content-Type", ""), resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Content-Type", ""), e.read()
    except Exception as e:   # keine Antwort, Zeitüberschreitung …
        return 0, "", str(e).encode()


def check(label, path, expect_html=False, method="GET", body=None):
    """Eine Abfrage prüfen; gibt das JSON (oder None) zurück."""
    global ok
    t = time.time()
    status, ctype, raw = req(method, path, body)
    ms = int((time.time() - t) * 1000)
    problem = None
    if status == 0:
        problem = "keine Antwort: " + raw.decode(errors="replace")[:200]
    elif status >= 500:
        problem = f"Serverfehler {status}"
    elif status in (401, 403):
        problem = f"nicht angemeldet / kein Zugriff ({status})"
    elif status == 404:
        problem = "nicht gefunden (404)"
    elif status == 200 and expect_html and b"<html" not in raw[:3000].lower():
        problem = "Seite enthält kein HTML"
    js = None
    if not problem and status == 200 and "json" in ctype:
        try:
            js = json.loads(raw or b"null")
        except ValueError:
            problem = "kaputtes JSON"
    if problem:
        detail = raw.decode(errors="replace").strip().replace("\n", " ")[:300]
        fehler.append(f"{label}: {method} {path} → {problem}" + (f"\n      {detail}" if detail and status else ""))
        print(f"  FEHLER  {method} {path}  ({problem}, {ms} ms)")
    else:
        ok += 1
        print(f"  ok      {method} {path}  ({status}, {ms} ms)")
    return js


def warte_auf_verteiler(sek=120):
    ende = time.time() + sek
    while time.time() < ende:
        status, _, _ = req("GET", "/_verteiler/health", timeout=5)
        if status == 200:
            return True
        time.sleep(2)
    return False


def main():
    print(f"Rauchtest gegen {BASE}\n")
    if not warte_auf_verteiler():
        print("FEHLER: Verteiler antwortet nicht – Abbruch.")
        return 1

    print("Startseite & Anmeldung")
    check("Verteiler", "/_verteiler/health")
    check("Startseite", "/login", expect_html=True)
    js = check("Anmeldung", "/api/login", method="POST", body={"name": USER, "password": PW})
    if not (js and js.get("ok")):
        print("\nFEHLER: Anmeldung mit dem Testbenutzer hat nicht geklappt – weitere Prüfungen sinnlos.")
        for f in fehler:
            print("  - " + f)
        return 1
    me = check("Startseite", "/api/me")
    if not (me and me.get("ok")):
        fehler.append("Startseite: /api/me meldet nach der Anmeldung keine gültige Sitzung")
    check("Startseite", "/", expect_html=True)
    check("Startseite", "/api/links")

    projekte = check("Bautagebuch", "/bautagebuch/api/projects") or []
    pid = projekte[0]["id"] if projekte and isinstance(projekte, list) else 0
    if not pid:
        fehler.append("Bautagebuch: keine Testprojekte vorhanden – Testdaten wurden nicht angelegt?")
    print(f"  Testprojekt: {pid or '—'} ({len(projekte) if isinstance(projekte, list) else 0} Projekte)")

    for prefix, (name, apis) in APPS.items():
        print(f"\n{name}  (/{prefix}/)")
        check(name, f"/{prefix}/", expect_html=True)
        me = check(name, f"/{prefix}/api/me")
        if isinstance(me, dict) and me.get("ok") is False:
            fehler.append(f"{name}: Anmeldung der Startseite gilt hier nicht (SSO)")
            print("  FEHLER  Anmeldung gilt hier nicht (SSO)")
        for p in apis:
            check(name, f"/{prefix}{p.replace('{pid}', str(pid))}")

    print(f"\n{ok} Prüfungen in Ordnung, {len(fehler)} Fehler.")
    if fehler:
        print("\nFehler:")
        for f in fehler:
            print("  - " + f)
        return 1
    print("Rauchtest bestanden.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
