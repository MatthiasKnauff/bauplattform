"""Ablauftests: Startseite, gemeinsame Anmeldung (SSO) und Rechte.

Geprüft wird über den Verteiler (alle Apps unter einer Adresse):
  - Anmelden, falsches Kennwort, Sperre nach mehreren Fehlversuchen (nur mit erfundenen Namen – die Sperre gilt je
    Name und Absender, die gemeinsamen Testbenutzer dürfen nie gesperrt werden)
  - Abmelden gilt in allen Apps, die Sitzung wird auf dem Server beendet
  - eigenes Kennwort ändern (Pflicht beim ersten Anmelden), gesperrte Benutzer werden abgewiesen
  - Weiterleitung nach dem Anmelden nur auf eigene Adressen
Für alles, was einen Benutzer verändert, legt der Test einen eigenen Benutzer an und löscht ihn am Ende wieder.
"""
from lib import PW, finde, gleich, pruefe

NEU_PW = "Baustelle-2026-neu"
ALLE_APPS = ["bautagebuch", "gantt", "adressen", "baukosten", "aufgaben", "plaene", "ava", "kommunikation", "baudaten", "zeiten", "bauantrag"]
APPS_MIT_ME = ["adressen", "maengel", "plaene", "kommunikation", "zeiten", "verwaltung"]   # Pfade im Verteiler mit /api/me


# ---------------------------------------------------------------- Hilfen
def _benutzer_anlegen(ctx, apps, **felder):
    """Eigenen Testbenutzer über die Verwaltung anlegen → (id, Name, Startkennwort)."""
    name = ctx.name("Nutzer")
    r = ctx.admin.pj("/verwaltung/api/users", {"name": name, "apps": apps, **felder})
    pruefe(r.get("ok") and r.get("id"), f"Benutzer nicht angelegt: {r}")
    return r["id"], name, r["password"]


def _anmelden_mit_neuem_kennwort(ctx, name, start_pw):
    """Mit dem Startkennwort anmelden und das Pflicht-Kennwort setzen – danach sind die Apps nutzbar."""
    c = ctx.gast().login(name, start_pw)
    c.pj("/api/password", {"old": start_pw, "new": NEU_PW})
    return c


def _benutzer_loeschen(ctx, uid):
    ctx.admin.delete(f"/verwaltung/api/users/{uid}", expect=200)


# ---------------------------------------------------------------- Tests
def test_anmeldung_gilt_in_allen_apps(ctx):
    """Eine Anmeldung auf der Startseite gilt in allen Apps (gleicher Benutzer, gleiche Sitzung)."""
    me = ctx.admin.gj("/api/me")
    pruefe(me.get("ok"), f"Startseite kennt die Sitzung nicht: {me}")
    gleich(me["name"], "Test-Admin", "angemeldeter Name")
    gleich(me["is_admin"], True, "Administrator")
    gleich(me["apps"], ALLE_APPS, "Administrator darf alle Apps")
    for app in APPS_MIT_ME:
        x = ctx.admin.gj(f"/{app}/api/me")
        pruefe(x.get("ok"), f"/{app}: Sitzung nicht übernommen: {x}")
        gleich(x["id"], me["id"], f"/{app}: gleicher Benutzer")
    pruefe(isinstance(ctx.admin.gj("/bautagebuch/api/projects"), list), "Bautagebuch übernimmt die Anmeldung nicht")
    # ohne Anmeldung: Startseite sagt „nicht angemeldet“, die Apps antworten mit 401
    gast = ctx.gast()
    gleich(gast.gj("/api/me").get("ok"), False, "Gast ist nicht angemeldet")
    for app in APPS_MIT_ME:
        gast.get(f"/{app}/api/me", expect=401)


def test_falsches_kennwort_abgewiesen(ctx):
    """Falsches Kennwort und unbekannter Name werden gleich abgewiesen (kein Hinweis, ob es den Namen gibt)."""
    uid, name, pw = _benutzer_anlegen(ctx, ["adressen"])
    try:
        c = ctx.gast()
        a = c.post("/api/login", {"name": name, "password": "ganz-falsch-1"}, expect=401)
        gleich(a.json.get("error"), "Name oder Kennwort ist falsch.", "Meldung bei falschem Kennwort")
        gleich(c.gj("/api/me").get("ok"), False, "nach falschem Kennwort nicht angemeldet")
        b = ctx.gast().post("/api/login", {"name": ctx.name("Niemand"), "password": "ganz-falsch-1"}, expect=401)
        gleich(b.json.get("error"), a.json.get("error"), "unbekannter Name: gleiche Meldung")
        # mit dem richtigen Kennwort klappt es danach (der Fehlversuch zählt nicht weiter)
        ok = c.post("/api/login", {"name": name, "password": pw}, expect=200).json
        pruefe(ok.get("ok"), f"Anmeldung mit richtigem Kennwort fehlgeschlagen: {ok}")
        gleich(ok.get("must_change"), True, "neuer Benutzer muss sein Kennwort ändern")
    finally:
        _benutzer_loeschen(ctx, uid)


def test_sperre_nach_fehlversuchen(ctx):
    """Nach 5 Fehlversuchen für denselben (erfundenen) Namen sperrt die Anmeldung mit 429; andere Namen bleiben frei."""
    name = ctx.name("Unbekannt")   # erfunden – die Sperre trifft keinen echten Benutzer
    c = ctx.gast()
    fehl, gesperrt = 0, None
    # Die Bremse zählt je Prozess (2 Worker): spätestens nach 2 × 5 Fehlversuchen sperren beide.
    for _ in range(12):
        a = c.post("/api/login", {"name": name, "password": "falsch-falsch"}, expect=(401, 429))
        if a.status == 429:
            gesperrt = a
            break
        fehl += 1
    pruefe(gesperrt is not None, f"nach {fehl} Fehlversuchen noch keine Sperre")
    pruefe(fehl >= 5, f"Sperre schon nach {fehl} Fehlversuchen (erst ab 5 erwartet)")
    pruefe(fehl <= 10, f"Sperre erst nach {fehl} Fehlversuchen")
    pruefe("Zu viele Fehlversuche" in (gesperrt.json.get("error") or ""), f"Meldung bei Sperre: {gesperrt.text[:200]}")
    # ein anderer (ebenfalls erfundener) Name ist nicht betroffen
    ctx.gast().post("/api/login", {"name": ctx.name("Anderer"), "password": "falsch-falsch"}, expect=401)
    # die Fehlversuche stehen im Protokoll der Verwaltung
    log = ctx.admin.gj("/verwaltung/api/audit?cat=konto")
    pruefe(finde(log, user_name=name, action="Anmeldung fehlgeschlagen"), "Fehlversuch nicht im Protokoll")


def test_abmelden_gilt_ueberall(ctx):
    """Abmelden in einer App beendet die Sitzung auf dem Server – danach ist man in keiner App mehr angemeldet."""
    uid, name, pw = _benutzer_anlegen(ctx, ["adressen", "aufgaben"])
    try:
        c = _anmelden_mit_neuem_kennwort(ctx, name, pw)
        c.get("/adressen/api/contacts", expect=200)
        c.get("/maengel/api/me", expect=200)
        # Kopie des Sitzungs-Cookies, um zu prüfen, dass die Sitzung wirklich serverseitig endet
        kopie = ctx.gast()
        for ck in c.jar:
            kopie.jar.set_cookie(ck)
        kopie.get("/adressen/api/me", expect=200)
        r = c.pj("/adressen/api/logout")
        gleich(r.get("ok"), True, "Abmelden")
        gleich(c.gj("/api/me").get("ok"), False, "Startseite nach dem Abmelden")
        c.get("/maengel/api/me", expect=401)
        kopie.get("/adressen/api/contacts", expect=401)
        kopie.get("/maengel/api/me", expect=401)
        gleich(kopie.gj("/api/me").get("ok"), False, "altes Cookie gilt nicht mehr")
    finally:
        _benutzer_loeschen(ctx, uid)


def test_kennwort_aendern(ctx):
    """Neuer Benutzer muss sein Kennwort ändern; Regeln für das neue Kennwort; danach gilt nur noch das neue."""
    uid, name, pw = _benutzer_anlegen(ctx, ["adressen"])
    try:
        c = ctx.gast().login(name, pw)
        me = c.gj("/api/me")
        gleich(me.get("must_change"), True, "Pflicht zum Kennwortwechsel")
        c.get("/adressen/api/contacts", expect=401)   # vor dem Wechsel sperren die Apps
        for body, teil in (({"old": "falsch-123", "new": NEU_PW}, "bisherige Kennwort"),
                           ({"old": pw, "new": "kurz"}, "mindestens 8"),
                           ({"old": pw, "new": pw}, "unterscheiden"),
                           ({"old": pw, "new": name}, "zu einfach"),
                           ({"old": pw, "new": "Passwort"}, "zu einfach"),
                           ({"old": pw, "new": NEU_PW, "email": "keine-adresse"}, "E-Mail")):
            a = c.post("/api/password", body, expect=400)
            pruefe(teil in (a.json.get("error") or ""), f"{body}: unerwartete Meldung {a.text[:200]}")
        c.pj("/api/password", {"old": pw, "new": NEU_PW, "email": "rt-nutzer@beispiel.test"})
        me = c.gj("/api/me")
        gleich(me.get("must_change"), False, "nach dem Wechsel keine Pflicht mehr")
        gleich(me.get("email"), "rt-nutzer@beispiel.test", "E-Mail beim Wechsel übernommen")
        c.get("/adressen/api/contacts", expect=200)
        ctx.gast().post("/api/login", {"name": name, "password": pw}, expect=401)   # Startkennwort gilt nicht mehr
        ctx.gast().login(name, NEU_PW)
        # zweiter Wechsel über „⚙ → Für mich“ (in jeder App verfügbar)
        c.post("/adressen/api/bp/kennwort", {"alt": "falsch-123", "neu": "Noch-ein-Kennwort-9"}, expect=400)
        c.pj("/adressen/api/bp/kennwort", {"alt": NEU_PW, "neu": "Noch-ein-Kennwort-9"})
        ctx.gast().login(name, "Noch-ein-Kennwort-9")
        # Darstellung (Farbschema, Akzentfarbe) gilt je Benutzer
        d = c.uj("/api/appearance", {"theme": "hell", "accent": "#12AB34"})
        gleich((d.get("theme"), d.get("accent")), ("hell", "#12ab34"), "Darstellung gespeichert")
        c.put("/api/appearance", {"accent": "rot"}, expect=400)
        c.put("/api/appearance", {"theme": "neon"}, expect=400)
    finally:
        _benutzer_loeschen(ctx, uid)


def test_gesperrter_benutzer_abgewiesen(ctx):
    """Ein gesperrter Benutzer verliert sofort seine Sitzung und kann sich nicht mehr anmelden – entsperrt wieder schon."""
    uid, name, pw = _benutzer_anlegen(ctx, ["adressen"])
    try:
        c = _anmelden_mit_neuem_kennwort(ctx, name, pw)
        c.get("/adressen/api/contacts", expect=200)
        ctx.admin.uj(f"/verwaltung/api/users/{uid}", {"active": False})
        c.get("/adressen/api/contacts", expect=401)
        gleich(c.gj("/api/me").get("ok"), False, "Sitzung des gesperrten Benutzers")
        a = ctx.gast().post("/api/login", {"name": name, "password": NEU_PW}, expect=403)
        pruefe("gesperrt" in (a.json.get("error") or ""), f"Meldung bei gesperrtem Konto: {a.text[:200]}")
        ctx.admin.uj(f"/verwaltung/api/users/{uid}", {"active": True})
        ctx.gast().login(name, NEU_PW).get("/adressen/api/contacts", expect=200)
    finally:
        _benutzer_loeschen(ctx, uid)


def test_weiterleitung_nur_auf_eigene_adressen(ctx):
    """Nach dem Anmelden wird nur auf Adressen der eigenen Plattform weitergeleitet (kein offener Weiterleiter)."""
    ziel = ctx.base + "/adressen/"
    r = ctx.gast().post("/api/login", {"name": "Anna Bauer", "password": PW, "next": ziel}, expect=200).json
    gleich(r.get("next"), ziel, "eigene Adresse als Ziel")
    for fremd in ("https://boese.example/anmelden", "javascript:alert(1)", "//boese.example/x"):
        r = ctx.gast().post("/api/login", {"name": "Anna Bauer", "password": PW, "next": fremd}, expect=200).json
        gleich(r.get("next"), "", f"fremdes Ziel {fremd!r} verworfen")


def test_postfach_einstellungen_ohne_mailserver(ctx):
    """Eigenes IMAP-Postfach eintragen: Kennwort wird nie zurückgegeben, Abruf „nur von Hand“ liest nichts von selbst."""
    uid, name, pw = _benutzer_anlegen(ctx, ["aufgaben"])
    try:
        c = _anmelden_mit_neuem_kennwort(ctx, name, pw)
        vorher = c.gj("/api/bp/postfaecher")
        gleich(vorher["abruf"], {"rhythmus": "tag", "uhrzeit": "08:00"}, "Voreinstellung des Abrufs")
        gleich(vorher["konten"], [], "noch keine eigenen Postfächer")
        d = c.uj("/api/bp/postfaecher", {"abruf": {"rhythmus": "hand"},
                                         "konten": [{"name": "Test", "host": "imap.beispiel.test", "user": "rt@beispiel.test", "pass": "geheim-123"},
                                                    {"name": "ohne Server", "host": "", "user": "x"}]})
        gleich(d["abruf"]["rhythmus"], "hand", "Abruf nur von Hand")
        gleich(len(d["konten"]), 1, "Postfach ohne Server wird nicht gespeichert")
        k = d["konten"][0]
        pruefe("pass" not in k, "Kennwort des Postfachs wird zurückgegeben")
        gleich((k["pass_set"], k["port"], k["ordner"]), (True, 993, "INBOX"), "Vorgaben des Postfachs")
        post = c.gj("/api/bp/post")
        gleich(post.get("eingerichtet"), True, "eigenes Postfach gilt als eingerichtet")
        gleich(post["abruf"]["rhythmus"], "hand", "Abruf in der Übersicht")
        pruefe(not post.get("mails"), "ohne Abruf dürfen keine Mails da sein")
    finally:
        _benutzer_loeschen(ctx, uid)


def test_projektdaten_fuer_alle_mit_bauleiter_regel(ctx):
    """Die Projektdaten-Maske der Kopfleiste arbeitet direkt mit dem Kern – für alle angemeldeten Benutzer, auch ohne die App
    „Bautagebuch“ (Clara Wolf hat nur den Bauzeitenplan): Sie sieht und ändert nur Projekte, die sie sehen darf (Bauleiter-Regel)."""
    B = "/bauzeitenplan/api/bp/bt"
    clara = ctx.anmelden("Clara Wolf")
    t101 = ctx.projekt("T101")["id"]   # Bauleiterin nur Anna
    liste = clara.gj(f"{B}/projects")
    pruefe(liste and not finde(liste, id=t101), "Clara sieht T101 in der Projektliste der Kopfleiste")
    pruefe(finde(clara.gj(f"{B}/leaders"), name="Anna Bauer"), "Bauleiter-Auswahl fehlt")
    clara.put(f"{B}/projects/{t101}", {"client": "Gehackt"}, expect=403)
    ctx.gast().get(f"{B}/projects", expect=401)
    name = ctx.name("Projekt Kern")
    pid = clara.pj(f"{B}/projects", {"name": name, "street": "", "zip": "", "city": "", "lat": None, "lon": None})["id"]
    try:
        clara.put(f"{B}/projects/{pid}", {"client": "Bauherr Probe"})
        gleich(finde(clara.gj(f"{B}/projects"), id=pid)["client"], "Bauherr Probe", "Änderung über die Kopfleiste gespeichert")
        clara.put(f"{B}/projects/{pid}", {"name": "  "}, expect=400)
        gleich(finde(ctx.admin.gj("/bautagebuch/api/projects"), id=pid)["name"], name, "das Bautagebuch zeigt dasselbe Projekt")
    finally:
        ctx.admin.delete(f"/bautagebuch/api/projects/{pid}")
