"""Ablauftests: Verwaltung (nur für Administratoren).

Benutzer anlegen, App-Rechte vergeben, sperren, überall abmelden, löschen; Projektübersicht über alle Apps,
Projekt archivieren; zentrale Einstellungen (KI); Druck-Layouts mit benannten Versionen; Protokoll; Zustand der Dienste.
Alle Benutzer und Projekte legt der Test selbst an und löscht sie wieder – die gemeinsamen Testbenutzer bleiben unberührt.
"""
import re
import time

from lib import finde, gleich, pruefe

NEU_PW = "Baustelle-2026-neu"
APP_KEYS = ["bautagebuch", "gantt", "adressen", "baukosten", "aufgaben", "plaene", "ava", "kommunikation", "baudaten", "zeiten", "bauantrag", "waermeschutz", "wiki"]
PW_ZEICHEN = set("abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789")   # ohne leicht verwechselbare Zeichen (0/O, 1/l/I)


# ---------------------------------------------------------------- Hilfen
def _benutzer_anlegen(ctx, apps, **felder):
    name = ctx.name("Nutzer")
    r = ctx.admin.pj("/verwaltung/api/users", {"name": name, "apps": apps, **felder})
    return r["id"], name, r["password"]


def _anmelden_mit_neuem_kennwort(ctx, name, start_pw):
    c = ctx.gast().login(name, start_pw)
    c.pj("/api/password", {"old": start_pw, "new": NEU_PW})
    return c


def _benutzer(ctx, uid=None, name=None):
    for u in ctx.admin.gj("/verwaltung/api/users")["users"]:
        if (uid is not None and u["id"] == uid) or (name is not None and u["name"] == name):
            return u
    return None


def _uebersicht(ctx, pid):
    return finde(ctx.admin.gj("/verwaltung/api/projects"), key=f"bt{pid}")


def _protokoll(ctx, action, detail):
    return finde(ctx.admin.gj("/verwaltung/api/audit?cat=verwaltung"), user_name="Test-Admin", action=action, detail=detail)


# ---------------------------------------------------------------- Benutzer und Rechte
def test_benutzer_anlegen(ctx):
    """Benutzer anlegen: Startkennwort (12 Zeichen, ohne verwechselbare Zeichen), Angaben in der Liste, Protokoll, Prüfungen."""
    uid, name, pw = _benutzer_anlegen(ctx, ["adressen"], vorname="Rita", nachname="Tester", email="rita@beispiel.test")
    try:
        gleich(len(pw), 12, "Länge des Startkennworts")
        pruefe(set(pw) <= PW_ZEICHEN, f"Startkennwort enthält verwechselbare Zeichen: {pw}")
        liste = ctx.admin.gj("/verwaltung/api/users")
        gleich([a["key"] for a in liste["apps"]], APP_KEYS, "Apps zur Auswahl")
        u = finde(liste["users"], id=uid)
        pruefe(u, "neuer Benutzer fehlt in der Liste")
        gleich((u["name"], u["full"], u["email"]), (name, "Rita Tester", "rita@beispiel.test"), "Angaben des Benutzers")
        gleich((u["is_admin"], u["active"], u["must_change"]), (False, True, True), "Status des neuen Benutzers")
        gleich((u["apps"], u["apps_all"]), (["adressen"], False), "App-Rechte")
        pruefe(_protokoll(ctx, "Benutzer angelegt", name), "Anlegen fehlt im Protokoll")
        # gleicher Name (auch in anderer Schreibweise), zu kurzer Name, falsche E-Mail
        for body, teil in (({"name": name.lower()}, "gibt es schon"), ({"name": "X"}, "mindestens 2"),
                           ({"name": ctx.name("Nutzer"), "email": "rita@"}, "E-Mail")):
            a = ctx.admin.post("/verwaltung/api/users", {**body, "apps": ["adressen"]}, expect=400)
            pruefe(teil in (a.json.get("error") or ""), f"{body}: unerwartete Meldung {a.text[:200]}")
    finally:
        ctx.admin.delete(f"/verwaltung/api/users/{uid}", expect=200)


def test_app_rechte_nur_adressen(ctx):
    """Ein Benutzer nur mit „Adressen“ erreicht nur diese App; neue Rechte gelten sofort ohne neues Anmelden."""
    uid, name, pw = _benutzer_anlegen(ctx, ["adressen"])
    try:
        c = _anmelden_mit_neuem_kennwort(ctx, name, pw)
        gleich(c.gj("/api/me")["apps"], ["adressen"], "Apps laut Startseite")
        c.get("/adressen/api/contacts", expect=200)
        for pfad in ("/maengel/api/maengel", "/plaene/api/projekte", "/kommunikation/api/kom"):
            c.get(pfad, expect=403)
        c.get("/bautagebuch/api/projects", expect=(401, 403))   # das Bautagebuch übernimmt die Sitzung ohne Recht gar nicht erst
        c.get("/verwaltung/api/users", expect=403)   # kein Administrator
        ctx.admin.uj(f"/verwaltung/api/users/{uid}", {"apps": ["adressen", "plaene"]})
        gleich(c.gj("/api/me")["apps"], ["adressen", "plaene"], "Apps nach der Änderung")
        c.get("/plaene/api/projekte", expect=200)
        c.get("/maengel/api/maengel", expect=403)   # „Aufgaben & Mängel“ bleibt bewusst abgewählt
        pruefe(_protokoll(ctx, "Benutzer geändert", f"{name}: Apps: Adressen, Pläne & Dateien"), "Rechteänderung fehlt im Protokoll")
        # alle Apps angehakt = „alle“ (dann gelten auch künftige Apps)
        ctx.admin.uj(f"/verwaltung/api/users/{uid}", {"apps": APP_KEYS})
        u = _benutzer(ctx, uid=uid)
        gleich((u["apps"], u["apps_all"]), (APP_KEYS, True), "alle Apps")
    finally:
        ctx.admin.delete(f"/verwaltung/api/users/{uid}", expect=200)


def test_sperren_abmelden_loeschen(ctx):
    """Überall abmelden beendet die Sitzungen; gesperrt kann sich niemand anmelden; gelöscht verschwindet der Benutzer."""
    uid, name, pw = _benutzer_anlegen(ctx, ["adressen"])
    geloescht = False
    try:
        c = _anmelden_mit_neuem_kennwort(ctx, name, pw)
        pruefe(_benutzer(ctx, uid=uid)["sessions"] >= 1, "Sitzung des Benutzers wird nicht angezeigt")
        ctx.admin.pj(f"/verwaltung/api/users/{uid}/logout")
        c.get("/adressen/api/contacts", expect=401)
        gleich(_benutzer(ctx, uid=uid)["sessions"], 0, "Sitzungen nach „überall abmelden“")
        c.login(name, NEU_PW)
        ctx.admin.uj(f"/verwaltung/api/users/{uid}", {"active": False})
        u = _benutzer(ctx, uid=uid)
        gleich((u["active"], u["sessions"]), (False, 0), "gesperrter Benutzer")
        c.get("/adressen/api/contacts", expect=401)
        ctx.gast().post("/api/login", {"name": name, "password": NEU_PW}, expect=403)
        pruefe(_protokoll(ctx, "Benutzer geändert", f"{name}: gesperrt"), "Sperren fehlt im Protokoll")
        ctx.admin.delete(f"/verwaltung/api/users/{uid}", expect=200)
        geloescht = True
        pruefe(_benutzer(ctx, uid=uid) is None, "gelöschter Benutzer steht noch in der Liste")
        ctx.gast().post("/api/login", {"name": name, "password": NEU_PW}, expect=401)
        pruefe(_protokoll(ctx, "Benutzer gelöscht", name), "Löschen fehlt im Protokoll")
        ctx.admin.put(f"/verwaltung/api/users/{uid}", {"active": True}, expect=404)
    finally:
        if not geloescht:
            ctx.admin.delete(f"/verwaltung/api/users/{uid}", expect=200)


def test_administrator_schuetzt_sich_selbst(ctx):
    """Der angemeldete Administrator kann sich weder sperren noch die Administratorrechte entziehen."""
    ich = ctx.admin.gj("/verwaltung/api/me")["id"]
    a = ctx.admin.put(f"/verwaltung/api/users/{ich}", {"active": False}, expect=400)
    pruefe("selbst sperren" in a.json.get("error", ""), f"Meldung: {a.text[:200]}")
    a = ctx.admin.put(f"/verwaltung/api/users/{ich}", {"is_admin": False}, expect=400)
    pruefe("selbst entziehen" in a.json.get("error", ""), f"Meldung: {a.text[:200]}")
    u = _benutzer(ctx, uid=ich)
    gleich((u["active"], u["is_admin"]), (True, True), "Administrator unverändert")


def test_rollen_und_rechte(ctx):
    """Rollen & Rechte: Rolle gibt Rechte, Ausnahmen je Person, Änderung der Rolle wirkt sofort; „Verwaltung“ = Administrator;
    wer das letzte Recht „Verwaltung“ wegnehmen würde, bekommt 400 – und es bleibt alles wie vorher (Rückrollen)."""
    R = ctx.admin.gj("/verwaltung/api/rollen")
    keys = [r["key"] for r in R["rollen"]]
    pruefe({"gf", "mitarbeiter", "assistenz", "it", "extern", "bueroleitung", "bauleitung"} <= set(keys), f"Startrollen: {keys}")
    gleich([x["key"] for x in R["rechte_liste"]], ["projekte.alle", "urlaub.freigeben", "akquise", "wiki.pruefen", "verwaltung"], "Rechte")
    gf = finde(R["rollen"], key="gf")
    uid, name, _ = _benutzer_anlegen(ctx, ["zeiten"], rolle="assistenz")
    neu = ctx.admin.pj("/verwaltung/api/rollen", {"name": ctx.name("Rolle")})
    try:
        ohne_bloecke = lambda L: [k for k in L if not k.startswith("b.")]   # Blöcke der Verwaltung (b.…) prüft test_verwaltung_je_rolle
        u = _benutzer(ctx, uid=uid)
        gleich((u["rolle"], ohne_bloecke(u["rechte"]), u["is_admin"]), ("assistenz", ["projekte.alle"], False), "Assistenz")
        ctx.admin.put(f"/verwaltung/api/users/{uid}", {"plus": ["urlaub.freigeben"], "minus": ["projekte.alle"]}, expect=200)
        gleich(ohne_bloecke(_benutzer(ctx, uid=uid)["rechte"]), ["urlaub.freigeben"], "Ausnahmen je Person")
        ctx.admin.put(f"/verwaltung/api/users/{uid}", {"rolle": neu["key"], "plus": [], "minus": []}, expect=200)
        gleich(_benutzer(ctx, uid=uid)["rechte"], [], "neue Rolle ohne Rechte")
        ctx.admin.put(f"/verwaltung/api/rollen/{neu['key']}", {"rechte": ["verwaltung"]}, expect=200)
        u = _benutzer(ctx, uid=uid)
        gleich((u["rechte"], u["is_admin"]), (["verwaltung"], True), "Rolle geändert → gilt sofort, Verwaltung = Administrator")
        a = ctx.admin.delete(f"/verwaltung/api/rollen/{neu['key']}", expect=400)
        pruefe("noch 1 Person" in a.json.get("error", ""), f"Meldung: {a.text[:200]}")
        a = ctx.admin.put("/verwaltung/api/rollen/gf", {"rechte": ["projekte.alle"]}, expect=400)   # Test-Admin würde sich selbst aussperren
        pruefe("selbst entziehen" in a.json.get("error", ""), f"Meldung: {a.text[:200]}")
        gleich(finde(ctx.admin.gj("/verwaltung/api/rollen")["rollen"], key="gf")["rechte"], gf["rechte"], "Geschäftsführung unverändert (zurückgerollt)")
        gleich(ctx.admin.gj("/verwaltung/api/me")["is_admin"], True, "Test-Admin bleibt Administrator")
    finally:
        ctx.admin.delete(f"/verwaltung/api/users/{uid}", expect=200)
        ctx.admin.delete(f"/verwaltung/api/rollen/{neu['key']}", expect=200)


def test_ohne_administratorrechte_kein_zutritt(ctx):
    """Ohne Verwaltungsrecht: nur die Blöcke der Rolle (Mitarbeiter:in ab Werk: Projekte, Büro, Druck, KI sehen), Gäste 401."""
    anna = ctx.anmelden("Anna Bauer")
    for pfad in ("/verwaltung/api/users", "/verwaltung/api/audit", "/verwaltung/api/status", "/verwaltung/api/rollen", "/verwaltung/api/bt/backups"):
        anna.get(pfad, expect=403)
        ctx.gast().get(pfad, expect=401)
    for pfad in ("/verwaltung/api/projects", "/verwaltung/api/einstellungen", "/verwaltung/api/layouts"):   # sehen
        anna.get(pfad, expect=200)
        ctx.gast().get(pfad, expect=401)
    ki = anna.gj("/verwaltung/api/einstellungen")["ki"]
    pruefe(all(not ki[p]["hint"] for p in ("claude", "gemini", "chatgpt")), "Ohne Verwaltungsrecht kein Teil eines Schlüssels")
    st = anna.gj("/verwaltung/api/bt/settings")
    pruefe(not any(k.startswith(("store_server", "store_user", "mail_", "m365_")) for k in st), f"Zugänge nur für den Administrator: {sorted(st)[:12]}")
    anna.put("/verwaltung/api/bt/settings", {"co_city": "Essen"}, expect=403)   # Büro: nur sehen
    gleich(anna.gj("/verwaltung/api/me")["bloecke"].get("buero"), "sehen", "Stufe „Büro & Standort“")
    anna.post("/verwaltung/api/users", {"name": ctx.name("Nutzer"), "apps": []}, expect=403)
    anna.put("/verwaltung/api/einstellungen", {"ki": {"vorschlag": "off"}}, expect=403)
    anna.get("/adressen/api/bp/versionen/conf", expect=403)   # Aufbewahrung der Versionen: nur Administrator
    gleich(ctx.admin.get("/adressen/api/bp/versionen/conf").status, 200, "Administrator sieht die Aufbewahrung")
    # Einstellungen stehen in der Verwaltung (⚙ springt dorthin): die Seite, das eigene Konto und die Plattform gehen auch ohne Verwaltungsrecht
    anna.get("/verwaltung/", expect=200)
    gleich(anna.gj("/verwaltung/api/me").get("is_admin"), False, "Anna ist kein Administrator")
    anna.get("/verwaltung/api/platform", expect=200)
    anna.get("/verwaltung/api/bp/konto", expect=200)
    anna.get("/verwaltung/api/bp/versionen/conf", expect=403)   # Bausteine prüfen selbst
    ctx.gast().get("/verwaltung/api/me", expect=401)   # nicht angemeldet: kein Zutritt (die Seite selbst leitet zur Anmeldung)


def test_verwaltung_je_rolle(ctx):
    """Block „Druck & Vorlagen“ für Mitarbeiter:innen auf „ändern“: dann darf Anna die Vorlagen speichern; Schlüssel bleiben gesperrt."""
    R = {r["key"]: r for r in ctx.admin.gj("/verwaltung/api/rollen")["rollen"]}
    alt = R["mitarbeiter"]["rechte"]
    anna = ctx.anmelden("Anna Bauer")
    v = anna.gj("/verwaltung/api/bp/mailvorlagen")
    gleich(v["admin"], False, "Vorlagen vorher nur sehen")
    try:
        ctx.admin.uj("/verwaltung/api/rollen/mitarbeiter", {"rechte": [k for k in alt if not k.startswith("b.druck.")] + ["b.druck.aendern", "b.ki.aendern"]})
        gleich(anna.gj("/verwaltung/api/me")["bloecke"]["druck"], "aendern", "Stufe nach dem Freigeben")
        gleich(anna.gj("/verwaltung/api/bp/mailvorlagen")["admin"], True, "Vorlagen jetzt änderbar")
        anna.put("/verwaltung/api/einstellungen", {"ki": {"vorschlag": "builtin", "claude": {"key": "sk-ant-boese"}}}, expect=200)
        pruefe(not ctx.admin.gj("/verwaltung/api/einstellungen")["ki"]["claude"]["hint"].endswith("oese"), "Schlüssel darf nur der Administrator setzen")
        anna.put("/verwaltung/api/rollen/mitarbeiter", {"rechte": alt + ["verwaltung"]}, expect=403)   # Rollen ändert nur der Administrator
        # Blöcke der Apps: ab Werk nur sehen – Regeln der To-dos und Raumtypen gelten fürs Büro
        anna.put("/api/bp/todo-regeln", {"vergabe": {"wert": 3}}, expect=403)
        anna.put("/baukosten/api/kennwerte", {"x": 1}, expect=403)
        gleich(anna.gj("/bauzeitenplan/api/me").get("katalog"), False, "Leistungskatalog nur sehen")
    finally:
        ctx.admin.uj("/verwaltung/api/rollen/mitarbeiter", {"rechte": alt})


def test_zugaenge_je_rolle(ctx):
    """Block „Zugänge“ (– / neu setzen): mit dem Block darf Anna Schlüssel und Kennwörter setzen, sehen aber nie; ohne nicht.
    Geprüft ohne echte Werte zu ändern (leere Änderungen) – auf dem Testserver liegen echte Zugänge."""
    R = {r["key"]: r for r in ctx.admin.gj("/verwaltung/api/rollen")["rollen"]}
    alt = R["mitarbeiter"]["rechte"]
    anna = ctx.anmelden("Anna Bauer")
    anna.put("/baukosten/api/dienste", {}, expect=403)
    anna.put("/verwaltung/api/bt/settings", {"mail_pass": ""}, expect=403)
    try:
        ctx.admin.uj("/verwaltung/api/rollen/mitarbeiter", {"rechte": alt + ["b.zugaenge.aendern"]})
        gleich(anna.gj("/verwaltung/api/me")["bloecke"]["zugaenge"], "aendern", "Stufe „Zugänge“ nach dem Freigeben")
        anna.put("/baukosten/api/dienste", {}, expect=200)
        anna.put("/verwaltung/api/bt/settings", {"mail_pass": ""}, expect=200)   # leer = unverändert
        anna.put("/verwaltung/api/einstellungen", {"ki": {}}, expect=200)
        st = anna.gj("/verwaltung/api/bt/settings")
        pruefe("mail_pass_set" in st and not any(k in st for k in ("mail_pass", "store_pass", "m365_secret")), "Kennwörter nie an den Browser")
        pruefe(all(not v["hint"] for v in anna.gj("/verwaltung/api/einstellungen")["ki"].values() if isinstance(v, dict) and "hint" in v and "hasKey" in v),
               "Mit „Zugänge“ trotzdem kein Teil eines Schlüssels")
        anna.put("/verwaltung/api/bt/settings", {"co_city": "Essen"}, expect=403)   # Büro bleibt: nur sehen
    finally:
        ctx.admin.uj("/verwaltung/api/rollen/mitarbeiter", {"rechte": alt})


def test_ki_verbrauch(ctx):
    """Verbrauch je Dienst: alle drei Anbieter mit Monat, Ø je Tag, Guthaben; Aufladung eintragen und wieder entfernen (nur mit „KI ändern“)."""
    V = ctx.admin.gj("/verwaltung/api/ki/verbrauch")
    for a in ("claude", "gemini", "chatgpt"):
        pruefe(all(k in V[a] for k in ("monat", "tag_mittel", "guthaben", "aufladungen")), f"Verbrauch {a} unvollständig")
    n = len(V["gemini"]["aufladungen"])
    W = ctx.admin.pj("/verwaltung/api/ki/aufladung", {"anbieter": "gemini", "betrag": "12,50", "datum": "2026-01-02"})
    gleich(len(W["gemini"]["aufladungen"]), n + 1, "Aufladung eingetragen")
    i = next(k for k, x in enumerate(W["gemini"]["aufladungen"]) if x["datum"] == "2026-01-02" and x["betrag"] == 12.5)
    anna = ctx.anmelden("Anna Bauer")
    anna.get("/verwaltung/api/ki/verbrauch", expect=200)   # KI im Büro: sehen
    anna.post("/verwaltung/api/ki/aufladung", {"anbieter": "gemini", "weg": i}, expect=403)
    gleich(len(ctx.admin.pj("/verwaltung/api/ki/aufladung", {"anbieter": "gemini", "weg": i})["gemini"]["aufladungen"]), n, "Aufladung entfernt")


# ---------------------------------------------------------------- Projekte über alle Apps
def test_projektuebersicht_mit_testdaten(ctx):
    """Projektübersicht: Testprojekte mit Bauherr, Adresse, Bauleitung, Berichten und verknüpften Bauzeitenplänen."""
    alle = ctx.admin.gj("/verwaltung/api/projects")
    erwartet = {   # aus bautagebuch/tools/testdaten.py
        "T101": ("Familie Neumann", "Am Birkenhain 7, 45219 Essen", ["Anna Bauer"], 9, True),
        "T102": ("Wohnbau Ruhr eG", "Lindenstraße 42, 45128 Essen", ["Anna Bauer", "Bernd Krämer"], 6, True),
        "T103": ("Stadt Essen, Immobilienwirtschaft", "Sonnenweg 3, 45133 Essen", [], 3, None),   # Plan: andere Tests dürfen verknüpfen
    }
    for kurz, (bauherr, adresse, leitung, berichte, mit_plan) in erwartet.items():
        p = next((x for x in alle if (x.get("name") or "").startswith(kurz)), None)
        pruefe(p, f"{kurz} fehlt in der Projektübersicht")
        gleich(p["key"], f"bt{ctx.projekt(kurz)['id']}", f"{kurz}: Schlüssel")
        gleich((p["client"], p["address"]), (bauherr, adresse), f"{kurz}: Bauherr und Adresse")
        gleich(sorted(p["leader_names"]), sorted(leitung), f"{kurz}: Bauleitung")
        pruefe(p["bt"]["reports"] >= berichte, f"{kurz}: nur {p['bt']['reports']} Berichte (mindestens {berichte})")
        if mit_plan is not None:
            gleich(bool(p["plans"]), mit_plan, f"{kurz}: verknüpfter Bauzeitenplan")


def test_projekt_anlegen_und_archivieren(ctx):
    """Projekt über die Verwaltung anlegen, archivieren (verschwindet aus „Aufgaben & Mängel“), zurückholen, löschen."""
    a = ctx.admin
    anna_id = _benutzer(ctx, name="Anna Bauer")["id"]
    a.post("/verwaltung/api/projects/neu", {"client": "ohne Namen"}, expect=400)
    name = ctx.name("Projekt")
    pid = a.pj("/verwaltung/api/projects/neu", {"name": name, "client": "RT Bauherr", "leaders": [anna_id]})["id"]
    try:
        p = _uebersicht(ctx, pid)
        pruefe(p, "neues Projekt fehlt in der Übersicht")
        gleich((p["name"], p["client"], p["archived"], p["leader_names"]), (name, "RT Bauherr", False, ["Anna Bauer"]), "neues Projekt")
        gleich((p["bt"]["reports"], p["plans"], p["bks"]), (0, [], []), "neues Projekt ist leer")
        anna = ctx.anmelden("Anna Bauer")
        pruefe(finde(anna.gj("/maengel/api/projekte"), id=pid), "Anna sieht ihr neues Projekt nicht")
        a.uj(f"/verwaltung/api/projects/{pid}", {"archived": True})
        gleich(_uebersicht(ctx, pid)["archived"], True, "archiviert")
        pruefe(not finde(anna.gj("/maengel/api/projekte"), id=pid), "archiviertes Projekt in „Aufgaben & Mängel“")
        gleich(finde(anna.gj("/plaene/api/projekte"), id=pid)["archived"], True, "Pläne zeigen das Archiv-Kennzeichen")
        pruefe(_protokoll(ctx, "Projekt archiviert", name), "Archivieren fehlt im Protokoll")
        a.uj(f"/verwaltung/api/projects/{pid}", {"archived": False})
        gleich(_uebersicht(ctx, pid)["archived"], False, "aus dem Archiv geholt")
        pruefe(finde(anna.gj("/maengel/api/projekte"), id=pid), "zurückgeholtes Projekt fehlt")
        pruefe(_protokoll(ctx, "Projekt aus dem Archiv geholt", name), "Zurückholen fehlt im Protokoll")
        a.put(f"/verwaltung/api/projects/{pid}", {"name": "  "}, expect=400)
        a.put("/verwaltung/api/projects/999999999", {"archived": True}, expect=404)
    finally:
        r = a.pj("/verwaltung/api/projects/delete", {"bt": pid})
    gleich(r.get("done"), [f"Projekt „{name}“ mit allem, was dazugehört"], "gelöscht")
    pruefe(_uebersicht(ctx, pid) is None, "gelöschtes Projekt steht noch in der Übersicht")


# ---------------------------------------------------------------- Einstellungen, Layouts, Protokoll, Zustand
def test_einstellungen_ki_hin_und_zurueck(ctx):
    """Zentrale KI-Einstellungen speichern und wieder herstellen (Vorschlagsart, einzelne KI abschalten)."""
    a = ctx.admin
    alt = a.gj("/verwaltung/api/einstellungen")["ki"]
    pruefe(alt["vorschlag"] in ("off", "builtin", "ai"), f"unbekannte Vorschlagsart {alt['vorschlag']!r}")
    neu_v = "off" if alt["vorschlag"] != "off" else "builtin"
    neu_aus = sorted(set(alt["aus"]) ^ {"chatgpt"})
    try:
        r = a.uj("/verwaltung/api/einstellungen", {"ki": {"vorschlag": neu_v, "aus": neu_aus}})["ki"]
        gleich((r["vorschlag"], r["aus"]), (neu_v, neu_aus), "Antwort nach dem Speichern")
        r = a.gj("/verwaltung/api/einstellungen")["ki"]
        gleich((r["vorschlag"], r["aus"]), (neu_v, neu_aus), "nach erneutem Laden")
        r = a.uj("/verwaltung/api/einstellungen", {"ki": {"vorschlag": "quatsch", "aus": neu_aus + ["gibtsnicht"]}})["ki"]
        gleich((r["vorschlag"], r["aus"]), (neu_v, neu_aus), "unbekannte Werte werden ignoriert")
        wort = "abgeschaltet" if "chatgpt" in neu_aus else "wieder eingeschaltet"
        pruefe(_protokoll(ctx, "Einstellungen geändert", f"chatgpt {wort}"), "Änderung fehlt im Protokoll")
    finally:
        r = a.uj("/verwaltung/api/einstellungen", {"ki": {"vorschlag": alt["vorschlag"], "aus": alt["aus"]}})["ki"]
    gleich((r["vorschlag"], r["aus"]), (alt["vorschlag"], alt["aus"]), "ursprünglicher Stand wiederhergestellt")


def test_druck_layout_benannte_versionen(ctx):
    """Druck-Layout: neue benannte Version (Kopie der aktiven), umbenennen, wieder aktivieren, entfernen, Vorschau als PDF."""
    a = ctx.admin
    liste = a.gj("/verwaltung/api/layouts")
    gleich({x["key"] for x in liste}, {"maengelruege", "terminruege", "lv", "preisspiegel", "aufmass", "rechnungspruefung", "rechnungsfreigabe", "honorarrechnung", "bauantrag_anschreiben"}, "Ausdrucke mit Layout")
    a.get("/verwaltung/api/layouts/gibtsnicht", expect=404)
    url = "/verwaltung/api/layouts/terminruege"
    d0 = a.gj(url)
    gleich(d0["bereich"]["name"], "Terminrüge (Aufforderung zur Abhilfe)", "Name des Ausdrucks")
    alt_aktiv, n0 = d0["aktiv"], len(d0["versionen"])
    akt = finde(d0["versionen"], id=alt_aktiv)
    name = ctx.name("Layout")
    neu_id = None
    try:
        d1 = a.uj(url, {"neu": {"name": name}})
        neu = finde(d1["versionen"], name=name)
        pruefe(neu, "neue Version fehlt")
        neu_id = neu["id"]
        gleich(d1["aktiv"], neu_id, "neue Version ist aktiv")
        gleich(len(d1["versionen"]), n0 + 1, "Anzahl der Versionen")
        ohne_id = lambda d: {**d, "elemente": [{k: v for k, v in e.items() if k != "id"} for e in d.get("elemente") or []]}   # noqa: E731 – Kopie bekommt neue Element-IDs
        gleich(ohne_id(neu["data"]), ohne_id(akt["data"]), "neue Version ist eine Kopie der bisher aktiven")
        gleich((neu["archiviert"], neu["wer"]), (False, "Test-Admin"), "Angaben der neuen Version")
        e = finde(a.gj("/verwaltung/api/layouts"), key="terminruege")
        gleich((e["version"], e["n"]), (name, n0 + 1), "Übersicht zeigt die aktive Version")
        d2 = a.uj(url, {"version": neu_id, "name": name + " B", "archiviert": True})
        gleich((finde(d2["versionen"], id=neu_id)["name"], finde(d2["versionen"], id=neu_id)["archiviert"]), (name + " B", True), "umbenannt")
        a.put(url, {"aktiv": "v-gibt-es-nicht"}, expect=404)
        gleich(a.uj(url, {"aktiv": alt_aktiv})["aktiv"], alt_aktiv, "frühere Version wieder aktiv")
        d3 = a.uj(url, {"weg": neu_id})
        neu_id = None
        gleich((len(d3["versionen"]), d3["aktiv"]), (n0, alt_aktiv), "Version entfernt")
        if n0 == 1:
            a.put(url, {"weg": alt_aktiv}, expect=400)   # die einzige Version bleibt
        a.post(url + "/vorschau", {"data": d0["standard"]}, expect=200).ist_pdf()
    finally:
        if neu_id:
            a.put(url, {"aktiv": alt_aktiv}, expect=None)
            a.put(url, {"weg": neu_id}, expect=None)


def test_protokoll_filter(ctx):
    """Protokoll der Verwaltung: Filter nach Bereich „verwaltung“ und „konto“ liefern nur diese Einträge."""
    for cat in ("verwaltung", "konto"):
        log = ctx.admin.gj(f"/verwaltung/api/audit?cat={cat}")
        pruefe(log, f"Protokoll „{cat}“ ist leer")
        pruefe(all(x["cat"] == cat for x in log), f"Filter „{cat}“ liefert fremde Einträge")
        pruefe(len(log) <= 300, "mehr als 300 Einträge")
    pruefe(finde(ctx.admin.gj("/verwaltung/api/audit?cat=konto"), user_name="Test-Admin", action="Angemeldet"), "Anmeldung fehlt im Protokoll")


def test_zustand_der_dienste(ctx):
    """Zustand: alle Plattform-Dienste antworten, Datenbank mit aktuellem Schema, Testdaten gezählt."""
    s = ctx.admin.gj("/verwaltung/api/status")
    for key in ("bauportal", "portal", "adressen", "aufgaben", "plaene", "kommunikation", "admin"):
        x = finde(s["services"], key=key)
        pruefe(x and x["ok"], f"Dienst „{key}“ meldet einen Fehler: {x}")
    pruefe(s["db"]["schema"] >= 27, f"Schema {s['db']['schema']} älter als benötigt (27)")
    pruefe(s["counts"]["Benutzer"] >= 4, "weniger als 4 Benutzer")
    pruefe(s["counts"]["Projekte"] >= 3, "weniger als 3 Projekte")
    pruefe(s["counts"]["davon mit Projekt verknüpft"] >= 2, "Bauzeitenpläne der Testdaten nicht verknüpft")
    pruefe(s.get("version") is not None, "keine Versionsangabe")


def test_verwaltung_einstellungen_aus_dem_kern(ctx):
    """Die zentralen Einstellungen liest und speichert die Verwaltung direkt aus dem Kern (bpcore.einstellungen) – dieselben
    Werte sieht das Bautagebuch; Kennwörter verlassen den Server nie."""
    v = ctx.admin.gj("/verwaltung/api/bt/settings")
    pruefe("has_logo" in v and "mail_pass_set" in v, "Einstellungen der Verwaltung unvollständig")
    pruefe(not any(k in v for k in ("mail_pass", "store_pass", "m365_secret")), "Kennwort in den Einstellungen der Verwaltung")
    alt = v.get("co_fax", "")
    try:
        ctx.admin.put("/verwaltung/api/bt/settings", {"co_fax": "0201 / 12 34 56-99", "mail_pass": "", "nicht erlaubt!": "x"})
        gleich(ctx.admin.gj("/verwaltung/api/bt/settings").get("co_fax"), "0201 / 12 34 56-99", "Verwaltung speichert die Einstellung")
        gleich(ctx.admin.gj("/bautagebuch/api/settings").get("co_fax"), "0201 / 12 34 56-99", "das Bautagebuch sieht denselben Wert")
        pruefe("nicht erlaubt!" not in ctx.admin.gj("/verwaltung/api/bt/settings"), "ungültiger Schlüssel wurde gespeichert")
    finally:
        ctx.admin.put("/verwaltung/api/bt/settings", {"co_fax": alt})


def test_apps_im_buero_abschalten(ctx):
    """Apps fürs ganze Büro abschalten: verschwinden aus der App-Liste (auch beim Administrator), einschalten bringt sie zurück;
    Verwaltung/Startseite und unbekannte Namen lassen sich nicht abschalten."""
    try:
        r = ctx.admin.uj("/verwaltung/api/apps_aus", {"aus": ["baudaten", "verwaltung", "gibtsnicht"]})
        gleich(r["aus"], ["baudaten"], "nur bekannte Apps")
        time.sleep(3.5)   # jeder Arbeitsprozess hält die Einstellung 3 Sekunden vor
        keys = [a["key"] for a in ctx.admin.gj("/verwaltung/api/platform")["apps"]]
        pruefe("baudaten" not in keys and "admin" in keys, f"abgeschaltet: {keys}")
        pruefe("baudaten" not in ctx.admin.gj("/verwaltung/api/me")["apps"], "auch nicht in den Apps des Administrators")
    finally:
        ctx.admin.uj("/verwaltung/api/apps_aus", {"aus": []})
    time.sleep(3.5)
    pruefe("baudaten" in [a["key"] for a in ctx.admin.gj("/verwaltung/api/platform")["apps"]], "wieder eingeschaltet")


def test_module_archivieren(ctx):
    """Verwaltung → Projekte: Bauzeitenplan eines Projekts archivieren und zurückholen (PUT api/projects/module) – Daten bleiben."""
    a = ctx.admin
    P = a.gj("/verwaltung/api/projects")
    p = next((x for x in P if x.get("plans")), None)
    if not p:
        return
    gid = p["plans"][0]["id"]
    a.uj("/verwaltung/api/projects/module", {"plans": [gid], "archived": True})
    try:
        x = next(y for y in a.gj("/verwaltung/api/projects") if y["key"] == p["key"])
        gleich(next(y for y in x["plans"] if y["id"] == gid)["archived"], True, "Plan archiviert")
        pruefe(any(y["id"] == gid and y["archived"] for y in a.gj("/bauzeitenplan/api/projects")), "Bauzeitenplan kennt das Archiv")
    finally:
        a.uj("/verwaltung/api/projects/module", {"plans": [gid], "archived": False})
    x = next(y for y in a.gj("/verwaltung/api/projects") if y["key"] == p["key"])
    gleich(next(y for y in x["plans"] if y["id"] == gid)["archived"], False, "zurückgeholt")
    ctx.anmelden("Anna Bauer").put("/verwaltung/api/projects/module", {"plans": [gid], "archived": True}, expect=403)


def test_basic_je_rolle_und_app(ctx):
    """Basic/Profi: Vorgabe je Rolle (Verwaltung → Rollen & Rechte) und je App abweichend (Schalter oben in der Kopfleiste)."""
    neu = ctx.admin.pj("/verwaltung/api/rollen", {"name": ctx.name("Basicrolle")})
    alt = ctx.admin.gj("/verwaltung/api/bp/darstellung")
    try:
        ctx.admin.uj(f"/verwaltung/api/rollen/{neu['key']}", {"modus": "einfach"})
        gleich(finde(ctx.admin.gj("/verwaltung/api/rollen")["rollen"], key=neu["key"])["modus"], "einfach", "Rolle startet in Basic")
        ctx.admin.uj(f"/verwaltung/api/rollen/{neu['key']}", {"modus": "quatsch"})
        gleich(finde(ctx.admin.gj("/verwaltung/api/rollen")["rollen"], key=neu["key"])["modus"], "", "Unbekannt → Vorgabe des Büros")
        d = ctx.admin.uj("/verwaltung/api/bp/darstellung", {"modus": "einfach", "app": "ava"})
        gleich((d["modus_apps"].get("ava"), d["modus"]), ("einfach", alt["modus"]), "nur die AVA in Basic, sonst wie bisher")
        d = ctx.admin.uj("/verwaltung/api/bp/darstellung", {"modus": "", "app": "ava"})
        pruefe("ava" not in d["modus_apps"], "AVA wieder wie die Vorgabe")
    finally:
        ctx.admin.uj("/verwaltung/api/bp/darstellung", {"modus": "", "app": "ava"})
        ctx.admin.delete(f"/verwaltung/api/rollen/{neu['key']}", expect=200)


def test_ki_datenschutz(ctx):
    """Datenschutz (14.11.2026): externe KI bekommt Namen, Adressen, E-Mail, Telefon nur als Art#Nummer; Protokoll mit Aufbewahrung,
    Export als Text und XML – nur Administrator bzw. Recht „datenschutz“."""
    a = ctx.admin
    k = a.pj("/adressen/api/contacts", {"name": ctx.name("Datenschutz Bau GmbH"), "contact_person": "Herbert Quast", "phone": "0201 7654321", "email": "quast@dsbau.example"})
    kid = k.get("id") or (k.get("contact") or {}).get("id")
    alt = a.gj("/verwaltung/api/ki/datenschutz")
    try:
        r = a.pj("/verwaltung/api/ki/datenschutz/probe", {"text": f"{ctx.name('Datenschutz Bau GmbH')}: Herbert Quast ruft an, 0201 7654321, quast@dsbau.example, Frau Peters, max. 5 mm."})
        g = r["gesendet"]
        pruefe("Quast" not in g and "7654321" not in g and "dsbau" not in g and "Peters" not in g, f"nichts im Klartext: {g}")
        pruefe(re.search(r"firma#\d{12}", g) and re.search(r"telefon#\d{12}", g) and re.search(r"email#\d{12}", g) and "max. 5 mm" in g, f"Kennungen mit Art: {g}")
        pruefe(r["zurueck_gleich"], "Antwort lässt sich zurückübersetzen")
        d = a.uj("/verwaltung/api/ki/datenschutz", {"tage": 30, "an": True})
        gleich((d["tage"], d["an"]), (30, True), "Aufbewahrung einstellbar")
        a.put("/verwaltung/api/ki/datenschutz", {"tage": "x"}, expect=400)
        for f in ("txt", "xml"):
            t = a.get(f"/verwaltung/api/ki/datenschutz/export?form={f}").text
            pruefe(t.startswith("Protokoll der KI-Anfragen" if f == "txt" else "<?xml"), f"Export {f}")
        ctx.anmelden("Anna Bauer").get("/verwaltung/api/ki/datenschutz", expect=403)
    finally:
        a.put("/verwaltung/api/ki/datenschutz", {"tage": alt["tage"], "an": alt["an"]}, expect=200)
        if kid:
            a.delete(f"/adressen/api/contacts/{kid}", expect=None)
