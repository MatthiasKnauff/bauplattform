"""Ablauftests: Aufgaben & Mängel und To-dos der Startseite.

Mängel kommen aus den Einträgen der Bautagesberichte. Damit die Erwartungen eindeutig sind, legt jeder Test ein eigenes
Bautagebuch-Projekt mit einem Bericht und eigenen Einträgen an (Projekt mit Koordinaten – ohne Adresssuche im Internet)
und löscht es am Ende wieder. Die Mängel der Testdaten werden nur gelesen.
Kein Test löst eine E-Mail aus: Rügen nur als Entwurf/Ausdruck, To-dos ohne Benachrichtigung, Erinnerungen in der Zukunft.
"""
import base64
from datetime import date, timedelta
from urllib.parse import quote

from lib import finde, gleich, pruefe

HEUTE = __import__('datetime').datetime.now(__import__('zoneinfo').ZoneInfo('Europe/Berlin')).date()   # wie die Server (deutsche Zeit) – nicht UTC des Testlaufs
REGELN = ["maengel", "erinnerungen", "rechnungen", "skonto", "nachtraege", "vergabe", "firma", "terminruege", "verzug",
          "planversand", "vorort", "tagesbericht", "budget", "urlaub", "honorar", "nachreichen", "formulare", "diktat", "post"]


# ---------------------------------------------------------------- Hilfen
def _iso(tage):
    return (HEUTE + timedelta(days=tage)).isoformat()


def _de(iso):
    return f"{iso[8:10]}.{iso[5:7]}.{iso[:4]}"


def _uid(ctx, name):
    u = finde(ctx.admin.gj("/verwaltung/api/users")["users"], name=name)
    pruefe(u, f"Benutzer „{name}“ fehlt")
    return u["id"]


def _baustelle(ctx, leaders=()):
    """Eigenes Bautagebuch-Projekt mit einem Bericht vor 7 Tagen → {pid, rid, name, tag}."""
    name = ctx.name("Baustelle")
    pid = ctx.admin.pj("/bautagebuch/api/projects", {"name": name, "street": "Musterweg 1", "zip": "45127", "city": "Essen",
                                                     "lat": 51.45, "lon": 7.01, "leaders": list(leaders)})["id"]
    tag = _iso(-7)
    rid = ctx.admin.pj(f"/bautagebuch/api/projects/{pid}/reports", {"date": tag})["id"]
    return {"pid": pid, "rid": rid, "name": name, "tag": tag}


def _eintrag(ctx, b, kind="maengel", **felder):
    return ctx.admin.pj(f"/bautagebuch/api/reports/{b['rid']}/items", {"kind": kind, **felder})["id"]


def _baustelle_weg(ctx, b):
    ctx.admin.delete(f"/bautagebuch/api/projects/{b['pid']}", expect=200)


def _liste(client, scope="all"):
    return client.gj(f"/maengel/api/maengel?scope={scope}")


# ---------------------------------------------------------------- Mängel
def test_maengelliste_aus_berichten(ctx):
    """Mängel, Aufgaben und Weisungen aus dem Bericht erscheinen mit Status offen/überfällig, Frist, Firma und Projekt."""
    b = _baustelle(ctx)
    try:
        m_offen = _eintrag(ctx, b, text="RT Riss im Innenputz", due=_iso(10), company="RT Putz GmbH")
        m_ueber = _eintrag(ctx, b, text="RT Fuge nicht vollfugig", due=_iso(-5))
        aufgabe = _eintrag(ctx, b, kind="zu_erledigen", text="RT Bemusterung vereinbaren")
        weisung = _eintrag(ctx, b, kind="weisungen", text="RT Baustelle besenrein", company="RT Rohbau")
        _eintrag(ctx, b, kind="notizen", text="RT Notiz – gehört nicht in die Mängelliste")
        L = {x["id"]: x for x in _liste(ctx.admin) if x["pid"] == b["pid"]}
        gleich(set(L), {m_offen, m_ueber, aufgabe, weisung}, "Einträge des Projekts in der Mängelliste")
        soll = {   # id: (art, Bezeichnung, Status, Frist, Firma)
            m_offen: ("maengel", "Mangel", "offen", _iso(10), "RT Putz GmbH"),
            m_ueber: ("maengel", "Mangel", "ueberfaellig", _iso(-5), ""),
            aufgabe: ("zu_erledigen", "Zu erledigen", "offen", "", ""),
            weisung: ("weisungen", "Weisung", "offen", "", "RT Rohbau"),
        }
        for i, (art, art_n, status, frist, firma) in soll.items():
            x = L[i]
            gleich((x["art"], x["art_n"], x["status"], x["frist"], x["firma"]), (art, art_n, status, frist, firma), f"Eintrag {x['text']}")
            gleich((x["datum"], x["projekt"], x["rid"], x["archiviert"], x["fotos"], x["done"]), (b["tag"], b["name"], b["rid"], False, 0, False),
                   f"Herkunft {x['text']}")
        gleich(L[m_offen]["uhrzeit"], "09:00", "Uhrzeit der Frist (Vorgabe)")
        # Testdaten: offene Mängel sind vorhanden und jeder Status folgt der Regel erledigt > Frist vorbei > offen
        alle = _liste(ctx.admin)
        pruefe(any(x["art"] == "maengel" and not x["done"] and x["projekt"].startswith("T10") for x in alle), "keine offenen Mängel in den Testdaten")
        for x in alle:
            erwartet = "erledigt" if x["done"] else "ueberfaellig" if x["frist"] and x["frist"] < HEUTE.isoformat() else "offen"
            gleich(x["status"], erwartet, f"Status von Eintrag {x['id']}")
    finally:
        _baustelle_weg(ctx, b)
    pruefe(not any(x["pid"] == b["pid"] for x in _liste(ctx.admin)), "Mängel des gelöschten Projekts noch in der Liste")


def test_maengel_sichtbarkeit_je_bauleitung(ctx):
    """Mängel sieht nur, wer das Projekt sehen darf; „meine“ = Projekte, in denen ich Bauleitung bin."""
    anna_id = _uid(ctx, "Anna Bauer")
    b = _baustelle(ctx, leaders=[anna_id])
    try:
        m = _eintrag(ctx, b, text="RT Fensteranschluss undicht", due=_iso(3))
        anna, bernd = ctx.anmelden("Anna Bauer"), ctx.anmelden("Bernd Krämer")
        pruefe(finde(_liste(anna, "mine"), id=m), "Anna (Bauleitung) sieht den Mangel nicht unter „meine“")
        pruefe(finde(_liste(ctx.admin, "all"), id=m), "Administrator sieht den Mangel nicht")
        pruefe(not finde(_liste(ctx.admin, "mine"), id=m), "Administrator ist nicht Bauleitung – trotzdem unter „meine“")
        pruefe(not finde(_liste(bernd, "all"), id=m), "Bernd sieht einen Mangel aus einem fremden Projekt")
        bernd.put(f"/maengel/api/maengel/{m}", {"done": True}, expect=404)
        bernd.get(f"/maengel/api/maengelruege/vorlage?id={m}", expect=404)
        pruefe(not finde(bernd.gj("/maengel/api/projekte"), id=b["pid"]), "Bernd sieht das fremde Projekt in der Auswahl")
        gleich(finde(anna.gj("/maengel/api/projekte"), id=b["pid"])["mine"], True, "Anna: eigenes Projekt")
        # Testdaten: T101 sehen nur Anna und Administratoren
        t101 = ctx.projekt("T101")["id"]
        pruefe(not any(x["pid"] == t101 for x in _liste(bernd, "all")), "Bernd sieht Mängel aus T101")
        ctx.gast().get("/maengel/api/maengel", expect=401)
        ctx.anmelden("Clara Wolf").get("/maengel/api/maengel", expect=200)   # Bauzeitenplan-Nutzer bekommen die App automatisch
        namen = [x["name"] for x in ctx.admin.gj("/maengel/api/benutzer")]
        pruefe("Anna Bauer" in namen and "admin" not in [n.lower() for n in namen], f"Benutzerauswahl: {namen}")
    finally:
        _baustelle_weg(ctx, b)


def test_mangel_erledigen_und_frist_aendern(ctx):
    """Mangel in der Mängelliste erledigen, Frist und Firma ändern (gespeichert über das Bautagebuch); Prüfungen."""
    b = _baustelle(ctx)
    try:
        m = _eintrag(ctx, b, text="RT Abplatzung Treppenpodest", due=_iso(-2))
        a = ctx.admin
        gleich(finde(_liste(a), id=m)["status"], "ueberfaellig", "vorher")
        a.uj(f"/maengel/api/maengel/{m}", {"done": True})
        x = finde(_liste(a), id=m)
        gleich((x["done"], x["status"]), (True, "erledigt"), "erledigt")
        a.put(f"/maengel/api/maengel/{m}", {"frist": "31.12.2026"}, expect=400)
        a.uj(f"/maengel/api/maengel/{m}", {"done": False, "frist": _iso(20), "uhrzeit": "14:30", "firma": "RT Betonbau"})
        x = finde(_liste(a), id=m)
        gleich((x["status"], x["frist"], x["uhrzeit"], x["firma"]), ("offen", _iso(20), "14:30", "RT Betonbau"), "neue Frist und Firma")
        a.uj(f"/maengel/api/maengel/{m}", {"uhrzeit": "25:00"})   # ungültige Uhrzeit wird nicht übernommen
        gleich(finde(_liste(a), id=m)["uhrzeit"], "14:30", "Uhrzeit unverändert")
        a.put("/maengel/api/maengel/999999999", {"done": True}, expect=404)
        a.get(f"/maengel/api/maengel.pdf?ids={m}&titel=" + quote("RT Mängelliste")).ist_pdf()
        a.get("/maengel/api/maengel.pdf").ist_pdf()
    finally:
        _baustelle_weg(ctx, b)


def test_maengelruege_vorlage_entwurf_ausdruck(ctx):
    """Mängelrüge: Empfänger aus den Adressen, offene Mängel derselben Firma vorgewählt, Mustertext nach VOB/B, PDF."""
    a = ctx.admin
    firma = ctx.name("Putzbetrieb")
    kid = a.pj("/adressen/api/contacts", {"name": firma, "contact_person": "Petra Test", "street": "Kalkweg 2", "zip": "45127",
                                         "city": "Essen", "email": "petra@rt-putz.test"})["id"]
    b = _baustelle(ctx)
    try:
        m1 = _eintrag(ctx, b, text="RT Riss im Putz Treppenhaus", due=_iso(10), company=firma)
        m2 = _eintrag(ctx, b, text="RT Putz hohl im Flur", due=_iso(-3), company="RT Andere Firma")
        m3 = _eintrag(ctx, b, text="RT schon beseitigt", company=firma)
        auf = _eintrag(ctx, b, kind="zu_erledigen", text="RT keine Mängelrüge", company=firma)
        a.uj(f"/maengel/api/maengel/{m3}", {"done": True})
        v = a.gj(f"/maengel/api/maengelruege/vorlage?id={m1}")
        gleich(v["firma"], firma, "Firma des Mangels")
        gleich(v["empfaenger"], {"id": kid, "name": firma, "person": "Petra Test", "strasse": "Kalkweg 2", "ort": "45127 Essen",
                                 "email": "petra@rt-putz.test"}, "Empfänger aus den Adressen")
        gleich([x["id"] for x in v["maengel"]], [m1, m2], "offene Mängel des Projekts (ohne erledigte und ohne Aufgaben)")
        gleich(v["gewaehlt"], [m1], "vorgewählt: der Mangel und weitere derselben Firma")
        a.get("/maengel/api/maengelruege/vorlage?id=999999999", expect=404)
        frist = _iso(14)
        body = {"ids": [m1, m2], "empfaenger": v["empfaenger"], "frist": frist, "schritt": "entwurf"}
        e = a.pj("/maengel/api/maengelruege", body)
        pruefe(base64.b64decode(e["pdf"])[:5] == b"%PDF-", "Entwurf ist keine PDF-Datei")
        pruefe(e["datei"].startswith(f"Mängelrüge {firma}") and e["datei"].endswith(".pdf"), f"Dateiname {e['datei']}")
        f = e["felder"]
        gleich(f["Empfaenger"], f"{firma}\nz. Hd. Petra Test\nKalkweg 2\n45127 Essen", "Anschrift")
        gleich(f["Betreff"], f"Bauvorhaben: {b['name']}, Musterweg 1, 45127 Essen", "Betreff")
        gleich(f["Bearbeiter"], "Test-Admin", "Bearbeiter")
        gleich(f["Frist"], _de(frist), "Frist im Brief")
        gleich(f["Maengel"], f"1. RT Riss im Putz Treppenhaus  (festgestellt am {_de(b['tag'])})\n"
                             f"2. RT Putz hohl im Flur  (festgestellt am {_de(b['tag'])})", "Liste der Mängel")
        for t in ("§ 4 Abs. 7 Satz 1 VOB/B", f"bis zum {_de(frist)} vollständig", "§ 8 Abs. 3 VOB/B"):
            pruefe(t in f["Text"], f"Mustertext (vor der Abnahme) ohne „{t}“")
        f13 = a.pj("/maengel/api/maengelruege", {**body, "grund": "vob13", "kuendigung": False})["felder"]
        pruefe("§ 13 Abs. 5 Nr. 1 VOB/B" in f13["Text"] and "§ 4 Abs. 7 Satz 1" not in f13["Text"], "Mustertext nach der Abnahme")
        fw = a.pj("/maengel/api/maengelruege", {**body, "werte": {"Frist": "nach Absprache", "Unbekannt": "x"}})["felder"]
        gleich(fw["Frist"], "nach Absprache", "im Editor geänderte Frist")
        d = a.post("/maengel/api/maengelruege", {**body, "schritt": "drucken"}).ist_pdf()
        pruefe(not d.headers.get("X-Mail"), "Ausdruck darf keine Mail verschicken")
        a.post("/maengel/api/maengelruege", {**body, "ids": [auf]}, expect=400)   # Aufgaben sind keine Mängel
        a.post("/maengel/api/maengelruege", {**body, "ids": []}, expect=400)
    finally:
        _baustelle_weg(ctx, b)
        a.delete(f"/adressen/api/contacts/{kid}", expect=200)


def test_schreiben_zwischenspeichern(ctx):
    """Noch nicht versendete Schreiben speichern, je Benutzer auflisten und löschen."""
    a = ctx.admin
    titel = ctx.name("Brief")
    r = a.pj("/maengel/api/briefe", {"url": "api/maengelruege", "titel": titel, "projekt": "RT Projekt",
                                     "body": {"ids": [1], "empfaenger": {"name": "RT Firma"}}})
    bid = r["id"]
    try:
        x = finde(a.gj("/maengel/api/briefe"), id=bid)
        pruefe(x, "gespeichertes Schreiben fehlt")
        gleich((x["titel"], x["firma"], x["projekt"], x["url"]), (titel, "RT Firma", "RT Projekt", "api/maengelruege"), "gespeichertes Schreiben")
        pruefe(not finde(ctx.anmelden("Anna Bauer").gj("/maengel/api/briefe"), id=bid), "fremdes Schreiben sichtbar")
        a.post("/maengel/api/briefe", {"url": "api/sonstwas", "body": {}}, expect=400)
        a.post("/maengel/api/briefe", {"url": "api/terminruege", "body": "kein Objekt"}, expect=400)
    finally:
        a.delete(f"/maengel/api/briefe/{bid}", expect=200)
    pruefe(not finde(a.gj("/maengel/api/briefe"), id=bid), "gelöschtes Schreiben noch da")


def test_mailvorlagen_fuer_ruegen(ctx):
    """Mail-Vorlagen (Mängelrüge, Terminrüge, Planversand, Termin) mit ihren Platzhaltern; ändern darf nur der Administrator."""
    v = ctx.admin.gj("/maengel/api/bp/mailvorlagen")
    gleich(set(v["vorlagen"]), {"maengelruege", "terminruege", "planversand", "termin", "angebotsanfrage"}, "Vorlagen")
    gleich(v["vorlagen"]["maengelruege"]["platzhalter"], ["firma", "bauvorhaben", "projekt", "frist", "anzahl", "absender", "buero", "datum", "signatur"],
           "Platzhalter der Mängelrüge")
    gleich(v["admin"], True, "Administrator")
    for k, x in v["vorlagen"].items():
        pruefe(x["betreff"] and x["text"], f"Vorlage {k} ist leer")
    if v["vorlagen"]["maengelruege"]["standard"]:
        gleich(v["vorlagen"]["maengelruege"]["betreff"], "Mängelrüge – {bauvorhaben}", "Betreff der Standardvorlage")
    ctx.anmelden("Anna Bauer").put("/maengel/api/bp/mailvorlagen", {"maengelruege": {"betreff": "x", "text": "y"}}, expect=403)


# ---------------------------------------------------------------- To-dos
def test_manuelle_aufgaben(ctx):
    """Manuelle To-dos: anlegen, Beteiligte sehen und erledigen sie, löschen darf nur, wer sie angelegt hat."""
    a = ctx.admin
    anna_id = _uid(ctx, "Anna Bauer")
    anna, bernd = ctx.anmelden("Anna Bauer"), ctx.anmelden("Bernd Krämer")
    a.post("/api/bp/todo", {"titel": "   "}, expect=400)
    titel = ctx.name("Aufgabe")
    r = a.pj("/api/bp/todo", {"titel": titel, "notiz": "Bitte prüfen", "faellig": _iso(5), "prio": True, "personen": [anna_id, "x"], "mail": False})
    x = r["aufgabe"]
    tid = x["id"]
    zweite = a.pj("/api/bp/todo", {"titel": ctx.name("Aufgabe"), "faellig": "morgen"})["aufgabe"]
    try:
        gleich(r.get("hinweis"), "", "ohne Benachrichtigung kein Hinweis")
        gleich((x["titel"], x["notiz"], x["faellig"], x["prio"], x["status"]), (titel, "Bitte prüfen", _iso(5), 1, "offen"), "neue Aufgabe")
        gleich((x["personen"], x["personen_namen"], x["erstellt_name"], x["mail"], x["auto"], x["key"]),
               ([anna_id], ["Anna Bauer"], "Test-Admin", False, False, f"t:{tid}"), "Beteiligte und Herkunft")
        gleich(zweite["faellig"], "", "ungültiges Datum wird nicht gespeichert")
        pruefe(finde(anna.gj("/api/bp/todo")["manuell"], id=tid), "Beteiligte sieht die Aufgabe nicht")
        pruefe(not finde(bernd.gj("/api/bp/todo")["manuell"], id=tid), "Unbeteiligter sieht die Aufgabe")
        bernd.put(f"/api/bp/todo/{tid}", {"erledigt": True}, expect=404)
        bernd.delete(f"/api/bp/todo/{tid}", expect=404)
        y = anna.uj(f"/api/bp/todo/{tid}", {"erledigt": True})["aufgabe"]
        gleich((y["status"], y["erledigt_name"]), ("erledigt", "Anna Bauer", ), "von Anna erledigt")
        pruefe(y["erledigt"], "Zeitpunkt des Erledigens fehlt")
        gleich(finde(a.gj("/api/bp/todo")["manuell"], id=tid)["status"], "erledigt", "erledigte Aufgabe bleibt einige Tage sichtbar")
        anna.delete(f"/api/bp/todo/{tid}", expect=403)
        y = a.uj(f"/api/bp/todo/{tid}", {"erledigt": False})["aufgabe"]
        gleich((y["status"], y["erledigt_name"]), ("offen", ""), "wieder offen")
        a.put(f"/api/bp/todo/{tid}", {"titel": ""}, expect=400)
        a.uj(f"/api/bp/todo/{tid}", {"personen": []})
        anna.put(f"/api/bp/todo/{tid}", {"erledigt": True}, expect=404)   # nicht mehr beteiligt
    finally:
        a.delete(f"/api/bp/todo/{tid}", expect=200)
        a.delete(f"/api/bp/todo/{zweite['id']}", expect=200)
    pruefe(not finde(a.gj("/api/bp/todo")["manuell"], id=tid), "gelöschte Aufgabe noch in der Liste")


def test_automatische_aufgabe_ueberfaelliger_mangel(ctx):
    """Überfälliger Mangel erscheint als automatische Aufgabe bei der Bauleitung; zurückstellen und ausblenden je Benutzer."""
    anna_id = _uid(ctx, "Anna Bauer")
    regel = finde(ctx.admin.gj("/api/bp/todo-regeln")["regeln"], key="maengel")
    gleich((regel["an"], regel["fuer"], regel["projekte"]), (True, "alle", "meine"), "Voreinstellung der Regel „Mängel“")
    b = _baustelle(ctx, leaders=[anna_id])
    anna = ctx.anmelden("Anna Bauer")
    m_ueber = _eintrag(ctx, b, text="RT Gefälle Dusche zu gering", due=_iso(-5), company="RT Fliesen")
    m_offen = _eintrag(ctx, b, text="RT Silikonfuge", due=_iso(10))
    key = f"maengel:{m_ueber}"
    try:
        e = finde(anna.gj("/api/bp/todo")["auto"], key=key)
        pruefe(e, "überfälliger Mangel fehlt in Annas To-dos")
        gleich((e["regel"], e["pid"], e["projekt"], e["faellig"], e["link"], e["auto"]), ("maengel", b["pid"], b["name"], _iso(-5), "aufgaben:#maengel", True), "To-do")
        gleich((e["titel"], e["text"]), ("Mangel: RT Gefälle Dusche zu gering", "Frist abgelaufen · RT Fliesen – nachfassen oder rügen"), "Text des To-dos")
        pruefe(not finde(anna.gj("/api/bp/todo")["auto"], key=f"maengel:{m_offen}"), "Mangel mit Frist in der Zukunft als überfällig gemeldet")
        pruefe(not finde(ctx.anmelden("Bernd Krämer").gj("/api/bp/todo")["auto"], key=key), "Bernd bekommt das To-do eines fremden Projekts")
        pruefe(not finde(ctx.admin.gj("/api/bp/todo")["auto"], key=key), "„meine Projekte“: Administrator ist hier nicht Bauleitung")
        anna.pj("/api/bp/todo-zustand", {"key": key, "bis": _iso(3)})
        gleich(finde(anna.gj("/api/bp/todo")["auto"], key=key).get("spaeter"), _iso(3), "zurückgestellt bis")
        anna.pj("/api/bp/todo-zustand", {"key": key, "aus": True})
        pruefe(not finde(anna.gj("/api/bp/todo")["auto"], key=key), "ausgeblendetes To-do noch sichtbar")
    finally:
        anna.pj("/api/bp/todo-zustand", {"key": key})
        _baustelle_weg(ctx, b)
    pruefe(not finde(anna.gj("/api/bp/todo")["auto"], key=key), "To-do des gelöschten Projekts noch da")


def test_regeln_der_automatischen_aufgaben(ctx):
    """Regeln der automatischen To-dos: alle Analysen, Schwelle begrenzt (0–365), auf Standard zurücksetzen."""
    a = ctx.admin
    R = a.gj("/api/bp/todo-regeln")
    gleich([r["key"] for r in R["regeln"]], REGELN, "Analysen")
    alt = finde(R["regeln"], key="vergabe")
    gleich((alt["name"], alt["wert_name"], alt["einheit"]), ("Vergabe vor Baubeginn", "Wochen vor Beginn", "Wochen"), "Beschreibung der Regel")
    gleich(finde(R["regeln"], key="nachtraege")["wert"], None, "Regel ohne Schwelle")
    anna_id = _uid(ctx, "Anna Bauer")
    try:
        v = finde(a.uj("/api/bp/todo-regeln", {"vergabe": {"an": not alt["an"], "wert": 999}})["regeln"], key="vergabe")
        gleich((v["an"], v["wert"]), (not alt["an"], 365), "Schwelle höchstens 365")
        v = finde(a.uj("/api/bp/todo-regeln", {"vergabe": {"wert": -4}})["regeln"], key="vergabe")
        gleich(v["wert"], 0, "Schwelle mindestens 0")
        v = finde(a.uj("/api/bp/todo-regeln", {"vergabe": {"wert": "viel", "fuer": [anna_id, "x"], "projekte": "alle"}})["regeln"], key="vergabe")
        gleich((v["wert"], v["fuer"], v["projekte"]), (6, [anna_id], "alle"), "ungültige Schwelle → Vorgabe 6 Wochen")
        v = finde(a.uj("/api/bp/todo-regeln", {"_standard": ["vergabe"]})["regeln"], key="vergabe")
        gleich((v["an"], v["wert"], v["fuer"], v["projekte"]), (False, 6, "alle", "meine"), "Standard der Regel")
    finally:
        r = a.uj("/api/bp/todo-regeln", {"vergabe": {k: alt[k] for k in ("an", "fuer", "projekte", "wert")}})
    v = finde(r["regeln"], key="vergabe")
    gleich((v["an"], v["wert"], v["fuer"], v["projekte"]), (alt["an"], alt["wert"], alt["fuer"], alt["projekte"]), "ursprünglicher Stand")


# ---------------------------------------------------------------- Erinnerungen
def test_eigene_erinnerungen(ctx):
    """Eigene Erinnerung anlegen, verschieben, erledigen, löschen und wiederherstellen (Termin in der Zukunft – keine Mail)."""
    a = ctx.admin
    ich = a.gj("/api/me")["id"]
    a.post("/maengel/api/erinnerungen", {"titel": "", "termin": _iso(30)}, expect=400)
    a.post("/maengel/api/erinnerungen", {"titel": "RT", "termin": "31.12."}, expect=400)
    titel = ctx.name("Erinnerung")
    rid = a.pj("/maengel/api/erinnerungen", {"titel": titel, "text": "RT Text", "termin": _iso(30), "uhrzeit": "10:30", "an": [ich]})["id"]
    geloescht = False
    try:
        pruefe(rid.startswith("r"), f"Kennung {rid}")
        e = finde(a.gj("/maengel/api/erinnerungen?scope=mine")["items"], id=rid)
        pruefe(e, "neue Erinnerung fehlt unter „meine“")
        gleich((e["quelle"], e["titel"], e["text"], e["termin"], e["uhrzeit"], e["status"], e["lage"]),
               ("eigen", titel, "RT Text", _iso(30), "10:30", "offen", "spaeter"), "neue Erinnerung")
        gleich((e["datum"], e["vorab"]), (_iso(30), ""), "eigene Erinnerung: der Termin ist die Sache selbst, keine Vorab-Erinnerung")
        gleich((e["an"], e["an_ids"], e["von"], e["manuell"], e["pid"]), (["Test-Admin"], [ich], "Test-Admin", False, None), "Empfänger")
        gleich(a.gj(f"/maengel/api/erinnerungen/{rid}"), e, "einzelne Erinnerung")
        pruefe(not finde(ctx.anmelden("Bernd Krämer").gj("/maengel/api/erinnerungen?scope=mine")["items"], id=rid), "fremde Erinnerung unter „meine“")
        a.put(f"/maengel/api/erinnerungen/{rid}", {"termin": "kaputt"}, expect=400)
        a.uj(f"/maengel/api/erinnerungen/{rid}", {"termin": _iso(3), "titel": titel + " B"})
        e = a.gj(f"/maengel/api/erinnerungen/{rid}")
        gleich((e["termin"], e["lage"], e["titel"]), (_iso(3), "bald", titel + " B"), "verschoben (innerhalb einer Woche = bald)")
        a.uj(f"/maengel/api/erinnerungen/{rid}", {"status": "erledigt"})
        gleich(a.gj(f"/maengel/api/erinnerungen/{rid}")["lage"], "erledigt", "erledigt")
        item = a.delete(f"/maengel/api/erinnerungen/{rid}").json["item"]
        geloescht = True
        a.get(f"/maengel/api/erinnerungen/{rid}", expect=404)
        a.pj("/maengel/api/erinnerungen/wiederherstellen", item)
        geloescht = False
        e = a.gj(f"/maengel/api/erinnerungen/{rid}")
        gleich((e["titel"], e["status"]), (titel + " B", "erledigt"), "wiederhergestellt")
        a.post("/maengel/api/erinnerungen/wiederherstellen", {**item, "quelle": "plan"}, expect=400)
        a.delete("/maengel/api/erinnerungen/b123", expect=400)   # Einträge des Bautagebuchs werden dort erledigt
    finally:
        if not geloescht:
            a.delete(f"/maengel/api/erinnerungen/{rid}", expect=200)


def test_mail_vorschlag_wird_ein_todo(ctx):
    """Eine Mail – eine Sache: der Vorschlag aus der Post wird ein To-do, keine zusätzliche Erinnerung; für dieselbe Mail noch einmal
    ändert nur Text und Termin dieses To-dos."""
    a = ctx.admin
    mid, titel = ctx.name("Mail"), ctx.name("Vorschlag")
    a.post("/api/bp/post/erinnerung", {"id": mid, "titel": "", "termin": _iso(3)}, expect=400)
    r = a.pj("/api/bp/post/erinnerung", {"id": mid, "titel": titel, "termin": _iso(3), "text": "RT Text"})
    tid = r["todo"]["id"]
    try:
        x = finde(a.gj("/api/bp/todo")["manuell"], id=tid)
        pruefe(x, "To-do aus dem Vorschlag fehlt unter den eigenen Aufgaben")
        gleich((x["titel"], x["faellig"], x["status"]), (titel, _iso(3), "offen"), "To-do aus dem Vorschlag")
        pruefe(not [e for e in a.gj("/maengel/api/erinnerungen?scope=mine")["items"] if titel in e["titel"]], "zum Vorschlag ist zusätzlich eine Erinnerung entstanden")
        r2 = a.pj("/api/bp/post/erinnerung", {"id": mid, "titel": titel + " B", "termin": _iso(5), "text": "RT Text"})
        gleich(r2["todo"]["id"], tid, "dieselbe Mail noch einmal: dasselbe To-do")
        x = finde(a.gj("/api/bp/todo")["manuell"], id=tid)
        gleich((x["titel"], x["faellig"]), (titel + " B", _iso(5)), "Text und Termin geändert")
    finally:
        a.delete(f"/api/bp/todo/{tid}")


def test_einstellungen_erinnerungen(ctx):
    """Einstellungen „Aufgaben & Mängel“: Vorlauf 0–60 Tage, Lücke 1–90 Tage, Uhrzeit nur gültig; danach Ursprung zurück."""
    a = ctx.admin
    alt = a.gj("/maengel/api/einstellungen")
    gleich(set(alt), {"vorlauf", "luecke", "mail_plan", "uhrzeit"}, "Felder")
    try:
        n = a.uj("/maengel/api/einstellungen", {"vorlauf": 100, "luecke": 500, "mail_plan": False, "uhrzeit": "06:45"})
        gleich((n["vorlauf"], n["luecke"], n["mail_plan"], n["uhrzeit"]), (60, 90, False, "06:45"), "Grenzen eingehalten")
        n = a.uj("/maengel/api/einstellungen", {"vorlauf": -3, "uhrzeit": "25:00"})
        gleich((n["vorlauf"], n["uhrzeit"]), (0, "06:45"), "Vorlauf mindestens 0, ungültige Uhrzeit ignoriert")
        n = a.uj("/maengel/api/einstellungen", {"vorlauf": "abc", "luecke": 12})
        gleich((n["vorlauf"], n["luecke"]), (0, 12), "ungültige Zahl ignoriert")
        gleich(a.gj("/maengel/api/einstellungen"), n, "gespeichert")
    finally:
        r = a.uj("/maengel/api/einstellungen", alt)
    gleich(r, alt, "ursprüngliche Einstellungen")
