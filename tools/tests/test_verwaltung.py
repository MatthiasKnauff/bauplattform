"""Ablauftests: Verwaltung (nur für Administratoren).

Benutzer anlegen, App-Rechte vergeben, sperren, überall abmelden, löschen; Projektübersicht über alle Apps,
Projekt archivieren; zentrale Einstellungen (KI); Druck-Layouts mit benannten Versionen; Protokoll; Zustand der Dienste.
Alle Benutzer und Projekte legt der Test selbst an und löscht sie wieder – die gemeinsamen Testbenutzer bleiben unberührt.
"""
import time

from lib import finde, gleich, pruefe

NEU_PW = "Baustelle-2026-neu"
APP_KEYS = ["bautagebuch", "gantt", "adressen", "baukosten", "aufgaben", "plaene", "ava", "kommunikation", "baudaten", "zeiten"]
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


def test_ohne_administratorrechte_kein_zutritt(ctx):
    """Nicht-Administratoren bekommen in der Verwaltung 403, Gäste 401."""
    anna = ctx.anmelden("Anna Bauer")
    for pfad in ("/verwaltung/api/users", "/verwaltung/api/projects", "/verwaltung/api/audit", "/verwaltung/api/einstellungen",
                 "/verwaltung/api/layouts", "/verwaltung/api/status"):
        anna.get(pfad, expect=403)
        ctx.gast().get(pfad, expect=401)
    anna.post("/verwaltung/api/users", {"name": ctx.name("Nutzer"), "apps": []}, expect=403)
    anna.put("/verwaltung/api/einstellungen", {"ki": {"vorschlag": "off"}}, expect=403)
    anna.get("/adressen/api/bp/versionen/conf", expect=403)   # Aufbewahrung der Versionen: nur Administrator
    gleich(ctx.admin.get("/adressen/api/bp/versionen/conf").status, 200, "Administrator sieht die Aufbewahrung")


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
    gleich({x["key"] for x in liste}, {"maengelruege", "terminruege", "lv", "preisspiegel", "aufmass", "rechnungspruefung", "rechnungsfreigabe"}, "Ausdrucke mit Layout")
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
