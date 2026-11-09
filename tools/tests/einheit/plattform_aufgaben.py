"""Rechentests (im Container der Plattform, echter Programmcode unter /app): Regeln ohne Datenbank.

- App-Rechte (bpcore/sso.py): welche Apps ein Benutzer mit älteren Rechten automatisch dazubekommt
- Duplikatsuche der Adressen (bpcore/contacts.py): Namen ohne Rechtsform, Telefonnummern +49/0, Internet-Domain
- To-do-Regeln (bpcore/todo.py): Grenzen der Schwellen, Projekte „meine/alle/Liste“, Arbeitstage zurück
- Änderungen in Worten (bpcore/versionen.py), Kennwörter nie im Klartext
- Posteingang (bpcore/posteingang.py): Art einer Mail, vorgeschlagene Erinnerung, Abrufzeiten, persönliche Anrede
Die Erwartungen sind von Hand aus den fachlichen Regeln abgeleitet.
"""
import json
from datetime import date, datetime

from lib import gleich, pruefe

from bpcore import contacts, posteingang, sso, todo, versionen


class _Zeilen:
    def __init__(self, zeilen):
        self.zeilen = zeilen

    def fetchone(self):
        return self.zeilen[0] if self.zeilen else None

    def fetchall(self):
        return list(self.zeilen)


class _FakeDB:
    """Ersatz für die Datenbankverbindung: bp_store-Schlüssel → JSON, contacts-Tabelle → Liste von Zeilen."""

    def __init__(self, store=None, kontakte=None):
        self.store, self.kontakte = store or {}, kontakte or []

    def execute(self, sql, args=()):
        if "FROM bp_store" in sql:
            k = args[0]
            return _Zeilen([{"data": json.dumps(self.store[k])}] if k in self.store else [])
        if "FROM contacts" in sql:
            return _Zeilen([dict(r) for r in self.kontakte])
        raise AssertionError(f"unerwartete Abfrage: {sql}")


def _u(apps, admin=0):
    return {"id": 9, "is_admin": admin, "apps": apps}


# ---------------------------------------------------------------- App-Rechte
def test_apps_neue_apps_fuer_alte_rechte():
    """Rechte „nur Bautagebuch“ bzw. „nur Bauzeitenplan“ bekommen die neueren Apps automatisch, bis sie abgewählt sind."""
    alle = ["bautagebuch", "gantt", "adressen", "baukosten", "aufgaben", "plaene", "ava", "kommunikation", "baudaten", "zeiten"]
    gleich(sso.apps_of(_u('["bautagebuch"]')), ["bautagebuch", "aufgaben", "plaene", "kommunikation", "zeiten"], "nur Bautagebuch")
    gleich(sso.apps_of(_u('["gantt"]')), ["gantt", "aufgaben", "plaene", "ava", "kommunikation", "baudaten", "zeiten"], "nur Bauzeitenplan")
    gleich(sso.apps_of(_u('["baukosten"]')), ["baukosten", "ava", "baudaten", "zeiten"], "nur Baukosten")
    gleich(sso.apps_of(_u('["adressen", "-aufgaben", "-plaene", "-ava", "-kommunikation", "-baudaten", "-zeiten"]')), ["adressen"], "bewusst abgewählt")
    gleich(sso.apps_of(_u('["bautagebuch", "-aufgaben"]')), ["bautagebuch", "plaene", "kommunikation", "zeiten"], "eine App abgewählt")
    gleich(sso.apps_of(_u("")), alle, "leer = alle Apps")
    gleich(sso.apps_of(_u("kein json")), alle, "kaputtes Feld = alle Apps")
    gleich(sso.apps_of(_u('["adressen"]', admin=1)), alle, "Administrator immer alle")
    gleich(sso.apps_of(None), [], "kein Benutzer")
    pruefe(sso.has_app(_u('["gantt"]'), "kommunikation") and not sso.has_app(_u('["gantt"]'), "adressen"), "has_app")


# ---------------------------------------------------------------- Adressen
def test_kontakte_vergleichswerte():
    """Namen ohne Rechtsform/Umlaute, Telefonnummern einheitlich (+49 → 0), Domain aus der Internetadresse."""
    gleich(contacts.name_norm("Fa. Müller GmbH & Co. KG"), "muller", "Rechtsform und Umlaut")
    gleich(contacts.name_norm("Straßenbau Weiß e.K."), "strassenbau weiss", "ß und e.K.")
    gleich(contacts._ziffern("+49 201 4711-10"), "0201471110", "+49 wird zu 0")
    gleich(contacts._ziffern("0049 201 4711-10"), "0201471110", "0049 wird zu 0")
    gleich(contacts._ziffern("0201 4711-10"), "0201471110", "Inland")
    gleich(contacts._ziffern("12 34"), "", "zu kurz für einen Vergleich")
    gleich(contacts._domain("https://www.schulz-elektro.de/kontakt"), "schulz-elektro.de", "Domain ohne www und Pfad")
    gleich(contacts._domain("kein-punkt"), "", "keine Domain")


def test_telefon_mit_null_in_klammern():
    """Die übliche Schreibweise „+49 (0)201 …“ ist dieselbe Nummer wie „0201 …“ (sonst findet die Duplikatsuche sie nicht)."""
    gleich(contacts._ziffern("+49 (0)201 4711-10"), "0201471110", "+49 (0) wird zu 0")
    gleich(contacts._ziffern("+49 (0) 341 98765-43"), "03419876543", "+49 (0) mit Leerzeichen")


def test_duplikate_gruppen():
    """Duplikatsuche: gleicher Name ohne Rechtsform + gleiche Nummer, gleiche Domain; Baustellen nie mit Firmen; Ausnahmen."""
    leer = {"trade": "", "contact_person": "", "phone": "", "mobile": "", "email": "", "website": "", "street": "", "zip": "", "city": ""}
    K = [
        {**leer, "id": 1, "name": "Fa. Müller GmbH", "phone": "0201 123456", "email": "info@mueller-bau.de"},
        {**leer, "id": 2, "name": "Müller GmbH & Co. KG", "phone": "+49 201 123456"},
        {**leer, "id": 3, "name": "Schulz Elektro", "website": "www.schulz-elektro.de", "email": "schulz@gmail.com"},
        {**leer, "id": 4, "name": "Haustechnik Nord", "email": "info@schulz-elektro.de"},
        {**leer, "id": 5, "name": "Baustelle Hauptstr. 1", "trade": "Baustelle", "phone": "0201 123456"},
        {**leer, "id": 6, "name": "Gmail Nutzer", "email": "anderer@gmail.com"},
    ]
    G = contacts.duplikate(_FakeDB(kontakte=K))
    gleich(sorted(g["ids"] for g in G), [[1, 2], [3, 4]], "Gruppen")
    g12 = next(g for g in G if g["ids"] == [1, 2])
    gleich(g12["grund"], "gleiche Telefonnummer, gleicher Name", "Grund 1/2")
    gleich(next(g for g in G if g["ids"] == [3, 4])["grund"], "gleiche Internetseite/Mail-Domain", "Grund 3/4")
    gleich([g["ids"] for g in contacts.duplikate(_FakeDB(kontakte=K), {"1-2"})], [[3, 4]], "als verschieden markiert")


# ---------------------------------------------------------------- To-do-Regeln
def test_todo_regeln_grenzen():
    """Gespeicherte Regeln: Schwelle 0–365, ungültig → Vorgabe, Benutzerliste nur Zahlen, unbekannte Projektwahl → „meine“."""
    db = _FakeDB(store={"todo:regeln": {"vergabe": {"wert": 999, "an": True}, "firma": {"wert": "x"}, "skonto": {"wert": -5},
                                        "maengel": {"fuer": [3, "a", "7"], "projekte": "irgendwas"}, "budget": {"projekte": [4, "b"]}}})
    R = todo.regeln(db)
    gleich(list(R), [r[0] for r in todo.REGELN], "alle Regeln in fester Reihenfolge")
    gleich((R["vergabe"]["wert"], R["vergabe"]["an"]), (365, True), "Schwelle höchstens 365")
    gleich(R["firma"]["wert"], 14, "ungültige Schwelle → Vorgabe 14 Tage")
    gleich(R["skonto"]["wert"], 0, "Schwelle mindestens 0")
    gleich((R["maengel"]["fuer"], R["maengel"]["projekte"], R["maengel"]["wert"]), ([3, 7], "meine", None), "Mängel")
    gleich(R["budget"]["projekte"], [4], "Projektliste nur Zahlen")
    gleich((R["rechnungen"]["an"], R["rechnungen"]["wert"], R["vergabe"]["einheit"]), (True, 7, "Wochen"), "Voreinstellungen")
    leer = todo.regeln(_FakeDB())
    gleich([k for k, r in leer.items() if r["an"]], ["maengel", "erinnerungen", "rechnungen", "skonto", "nachtraege", "terminruege", "vorort"],
           "ohne Einstellung eingeschaltete Analysen")


def test_todo_projekt_auswahl():
    """Welche Projekte eine Analyse prüft: „meine“ (Bauleitung oder niemand eingetragen), „alle“ sichtbaren, feste Liste; nie Archiv."""
    u, admin = {"id": 5, "is_admin": 0}, {"id": 1, "is_admin": 1}
    p = lambda i, lead, arch=False: {"id": i, "leaders": lead, "archived": arch}   # noqa: E731
    meine, alle = {"projekte": "meine"}, {"projekte": "alle"}
    gleich(todo._projekt_ok(u, p(1, [5]), meine), True, "eigene Bauleitung")
    gleich(todo._projekt_ok(u, p(1, []), meine), True, "niemand eingetragen")
    gleich(todo._projekt_ok(u, p(1, [7]), alle), False, "fremdes Projekt nicht sichtbar")
    gleich(todo._projekt_ok(admin, p(1, [7]), meine), False, "Administrator: nicht seine Bauleitung")
    gleich(todo._projekt_ok(admin, p(1, [7]), alle), True, "Administrator: alle")
    gleich(todo._projekt_ok(u, p(1, [5], True), alle), False, "archiviert")
    gleich(todo._projekt_ok(u, p(1, []), {"projekte": [2]}), False, "nicht in der Liste")
    gleich(todo._projekt_ok(u, p(2, []), {"projekte": [2]}), True, "in der Liste")
    gleich(todo._projekt_ok(u, None, alle), False, "Projekt fehlt")


def test_arbeitstage_zurueck():
    """Arbeitstage zurückzählen überspringt Samstag und Sonntag."""
    gleich(todo._arbeitstage_zurueck(date(2026, 3, 9), 3), date(2026, 3, 4), "Montag − 3 Arbeitstage = Mittwoch davor")
    gleich(todo._arbeitstage_zurueck(date(2026, 3, 9), 1), date(2026, 3, 6), "Montag − 1 = Freitag")
    gleich(todo._arbeitstage_zurueck(date(2026, 3, 11), 2), date(2026, 3, 9), "Mittwoch − 2 = Montag")
    gleich(todo._arbeitstage_zurueck(date(2026, 3, 9), 0), date(2026, 3, 9), "0 Tage")


# ---------------------------------------------------------------- Versionen
def test_aenderungen_in_worten():
    """Änderungen werden in Worten beschrieben; Kennwörter erscheinen nie im Klartext."""
    gleich(versionen.aenderungen({"phone": "0201 1", "city": "Essen"}, {"phone": "0201 2", "city": "Essen"}), ["Telefon: „0201 1“ → „0201 2“"], "geändert")
    gleich(versionen.aenderungen(None, {"name": "X"}), ["angelegt"], "neu")
    gleich(versionen.aenderungen({"name": "X"}, None), ["gelöscht"], "gelöscht")
    gleich(versionen.aenderungen({"email": ""}, {"email": "a@b.de"}), ["E-Mail: „a@b.de“"], "eingetragen")
    gleich(versionen.aenderungen({"notes": "alt"}, {"notes": ""}), ["Notizen entfernt"], "entfernt")
    gleich(versionen.aenderungen({"vorlauf": 7}, {"vorlauf": 7.5}), ["Vorlauf (Tage): 7 → 7,5"], "Zahl mit Komma")
    a, b = versionen._mask({"mail_pass": "geheim-1", "name": "X"}), versionen._mask({"mail_pass": "geheim-2", "name": "X"})
    pruefe(a["mail_pass"].startswith(versionen.MARK) and "geheim-1" not in a["mail_pass"], "Kennwort nicht maskiert")
    gleich(a["name"], "X", "normale Felder bleiben")
    gleich(versionen._mask({"mail_pass": "geheim-1"})["mail_pass"], a["mail_pass"], "gleiches Kennwort → gleiche Prüfsumme")
    gleich(versionen.aenderungen(a, b), ["Mail-Kennwort geändert"], "Kennwortwechsel ohne Klartext")
    gleich(versionen._unmask(a, {"mail_pass": "aktuell", "name": "Y"}), {"mail_pass": "aktuell", "name": "X"}, "Wiederherstellen behält das aktuelle Kennwort")


# ---------------------------------------------------------------- Posteingang
def test_art_einer_mail():
    """Art einer Mail aus Betreff/Anhängen: erste passende Art gewinnt (Schlussrechnung vor Rechnung)."""
    gleich(posteingang.art_von({"betreff": "Schlussrechnung BV Lindenstraße"}), "Schlussrechnung", "Schlussrechnung")
    gleich(posteingang.art_von({"betreff": "2. Abschlagsrechnung"}), "Rechnung", "Abschlag")
    gleich(posteingang.art_von({"betreff": "Unterlagen", "anhaenge": ["Angebot_Fenster.pdf"]}), "Angebot", "Anhang")
    gleich(posteingang.art_von({"betreff": "Bedenkenanzeige Abdichtung"}), "Behinderung", "Bedenken")
    gleich(posteingang.art_von({"betreff": "Mängel im Bad"}), "Mangel", "Umlaut")
    gleich(posteingang.art_von({"betreff": "Gruß aus dem Urlaub"}), "Nachricht", "sonst")


def test_erinnerung_aus_mail_vorschlagen():
    """Vorschlag für eine Erinnerung: Rechnung 14 Tage, Termin einen Tag vorher, Rückfrage nach 2 Tagen, sonst keiner."""
    zeit = "2026-03-02T09:15:00Z"
    v = posteingang.vorschlag({"art": "Rechnung", "zeit": zeit, "von_name": "Elektro Wilhelmi", "betreff": "Rechnung 4711"})
    gleich((v["titel"], v["termin"]), ("Rechnung von Elektro Wilhelmi prüfen und freigeben", "2026-03-16"), "Rechnung")
    v = posteingang.vorschlag({"art": "Schlussrechnung", "zeit": zeit, "von": "a@b.de", "betreff": "SR"})
    gleich((v["titel"], v["termin"]), ("Schlussrechnung von a@b.de prüfen (Prüffrist 30 Tage)", "2026-03-27"), "Schlussrechnung")
    v = posteingang.vorschlag({"art": "Termin", "zeit": zeit, "betreff": "Baubesprechung am 12.03."})
    gleich((v["titel"], v["termin"]), ("Termin: Baubesprechung am 12.03.", "2026-03-11"), "Termin: Vortag")
    gleich(posteingang.vorschlag({"art": "Termin", "zeit": zeit, "betreff": "Abnahme am 01.02."}), None, "Termin liegt schon zurück")
    gleich(posteingang.vorschlag({"art": "Termin", "zeit": zeit, "betreff": "Abnahme demnächst"}), None, "Termin ohne Datum")
    v = posteingang.vorschlag({"art": "Nachricht", "zeit": zeit, "von_name": "Rossi", "betreff": "Fliesen", "vorschau": "Können Sie das bitte bestätigen?"})
    gleich((v["titel"], v["termin"]), ("Rossi antworten: Fliesen", "2026-03-04"), "Rückfrage")
    gleich(posteingang.vorschlag({"art": "Nachricht", "zeit": zeit, "betreff": "Info", "vorschau": "Anbei die Unterlagen."}), None, "reine Info")


def test_pruefpflicht_todo_aus_mail():
    """Mails mit Prüfpflicht werden To-dos: Fälligkeit = Frist ab Eingang (SR 30 Tage, Abschlag 21, Plan 10 Werktage), Grundlage in der Notiz."""
    zeit = "2026-03-02T09:15:00Z"   # Montag
    t = posteingang.pruefpflicht({"art": "Schlussrechnung", "zeit": zeit, "von_name": "Muster Bau", "betreff": "SR 12"})
    gleich((t["faellig"], t["erinnerung"]), ("2026-04-01", "1w"), "Schlussrechnung 30 Tage")
    pruefe("§ 16 Abs. 3" in t["notiz"] and "01.04.2026" in t["notiz"], "Grundlage und Frist in der Notiz")
    gleich(posteingang.pruefpflicht({"art": "Rechnung", "zeit": zeit, "betreff": "AR 2"})["faellig"], "2026-03-23", "Abschlag 21 Tage")
    gleich(posteingang.pruefpflicht({"art": "Plan", "zeit": zeit, "betreff": "Werkplan"})["faellig"], "2026-03-16", "Plan 10 Werktage")
    gleich(posteingang.pruefpflicht({"art": "Mangel", "zeit": zeit, "betreff": "Riss"}), None, "keine Prüfpflicht")


def test_abrufzeiten_postfach():
    """Letzter planmäßiger Abruf: täglich, zweimal (Uhrzeit und 5 h später), stündlich 7–19 Uhr, nur von Hand."""
    T = lambda r, z="08:00": posteingang._abruf({"rhythmus": r, "uhrzeit": z})   # noqa: E731
    gleich(posteingang.letzter_termin(T("tag"), datetime(2026, 3, 2, 12, 0)), datetime(2026, 3, 2, 8, 0), "täglich, mittags")
    gleich(posteingang.letzter_termin(T("tag"), datetime(2026, 3, 2, 7, 59)), datetime(2026, 3, 1, 8, 0), "täglich, vor der Uhrzeit")
    gleich(posteingang.letzter_termin(T("zweimal"), datetime(2026, 3, 2, 14, 0)), datetime(2026, 3, 2, 13, 0), "zweimal, nachmittags")
    gleich(posteingang.letzter_termin(T("zweimal"), datetime(2026, 3, 2, 7, 0)), datetime(2026, 3, 1, 13, 0), "zweimal, früh morgens")
    gleich(posteingang.letzter_termin(T("stuendlich"), datetime(2026, 3, 2, 6, 30)), datetime(2026, 3, 1, 19, 0), "stündlich, vor 7 Uhr")
    gleich(posteingang.letzter_termin(T("stuendlich"), datetime(2026, 3, 2, 12, 30)), datetime(2026, 3, 2, 12, 0), "stündlich, mittags")
    gleich(posteingang.letzter_termin(T("hand"), datetime(2026, 3, 2, 12, 0)), None, "nur von Hand")
    gleich(posteingang._abruf({"rhythmus": "quatsch", "uhrzeit": "25:00"}), {"rhythmus": "tag", "uhrzeit": "08:00"}, "ungültig → Vorgabe")


def test_persoenlich_angesprochen():
    """Persönliche Anrede im Text erkennt die Mail ohne Projekt als „an dich“."""
    namen = posteingang.meine_namen({"vorname": "Anna", "nachname": "Bauer", "name": "Anna Bauer"})
    gleich(namen, ["anna", "bauer"], "Namen des Benutzers")
    for text, soll in (("Hallo Anna, anbei die Pläne", True), ("Sehr geehrte Frau Bauer, wir bitten um …", True),
                       ("Anna, bitte kurz prüfen", True), ("Die Unterlagen für die Kita liegen bei", False)):
        gleich(posteingang.angesprochen({"vorschau": text}, namen), soll, text)
    gleich(posteingang.angesprochen({"vorschau": "Hallo Anna"}, []), False, "ohne Namen")
