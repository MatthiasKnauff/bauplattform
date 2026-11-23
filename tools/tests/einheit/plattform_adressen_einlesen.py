"""Adressen einlesen (GO 22.11.2026, Mock „Adressen einlesen“ AE-1 … AE-7 A): Spalten nach der Überschrift, Firmenspalte ohne passende
Überschrift, mehrere Zeilen derselben Firma = ein Kontakt, Anrede, PLZ/Ort, Bauherr:in, Projektnummer → Projekt bzw. Stichwort,
vorhandener Kontakt nur ergänzt, doppelt mit Zähler; CSV mit Semikolon. Testdaten erfunden."""
import json
import sqlite3

import adressen_einlesen as E
from lib import gleich, pruefe


def db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE projects(id INTEGER PRIMARY KEY, name)")
    c.execute("""CREATE TABLE contacts(id INTEGER PRIMARY KEY, name UNIQUE, trade DEFAULT '', contact_person DEFAULT '', role DEFAULT '', phone DEFAULT '',
                 mobile DEFAULT '', email DEFAULT '', website DEFAULT '', street DEFAULT '', zip DEFAULT '', city DEFAULT '', notes DEFAULT '',
                 art DEFAULT '', stichworte DEFAULT '', tags DEFAULT '', extra DEFAULT '{}', created, updated)""")
    c.execute("INSERT INTO projects(name) VALUES('A100 Haus am See'), ('B22 Schule')")
    c.execute("INSERT INTO contacts(name, trade, street) VALUES('Alt Bau GmbH', 'Maler', '')")
    return c


KOPF = ["Gewerk", "Müller", "Anrede/Vorname Name (Ansprechpartner)", "Nachname (nicht eintragen)", "Adresse", "PLZ Ort", "Tel", "FAX", "Mobil", "Mail", "Webseite", "Projektnummer", "Notizen"]
Z = [
    ["Dachdecker", "Dach Eins GmbH", "Hr. Max Beispiel", "Beispiel", "Weg 1", "45127 Essen", "0201 1", "0201 2", "", "a@eins.test; b@eins.test", "eins.test", "A100", ""],
    ["Klempner", "Dach Eins GmbH", "Fr. Eva Muster", "Muster", "", "", "", "", "0172 9", "eva@eins.test", "", "A100 und Z900", "zweite"],
    ["Bauherrin", "", "Fr. Rita Probe", "Probe", "Gasse 2", "45130 Essen", "", "", "", "", "", "B22", ""],
    ["Maler", "Alt Bau GmbH", "", "", "Straße 3", "45131 Essen", "0201 3", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", "", "", "", ""],
]


def test_spalten_und_ordnen():
    S = E.spalten(KOPF, Z)
    gleich(S, ["gewerk", "firma", "person", "nachname", "strasse", "plzort", "tel", "fax", "mobil", "mail", "web", "projekt", "notiz"], "Zuordnung")
    c = db()
    K, n = E.ordnen(c, Z, S)
    gleich([k["name"] for k in K], ["Dach Eins GmbH", "Rita Probe", "Alt Bau GmbH"], "ein Kontakt je Firma, Person ohne Firma")
    d = K[0]
    gleich(([p["name"] for p in d["personen"]], [p["anrede"] for p in d["personen"]], d["gewerke"], d["zip"], d["city"]),
           (["Max Beispiel", "Eva Muster"], ["Herr", "Frau"], ["Dachdecker", "Klempner"], "45127", "Essen"), "Personen, Gewerke, PLZ/Ort")
    gleich(([p["name"] for p in d["projekte"]], d["projektnr"], d["mails"], d["tel"]), (["A100 Haus am See"], ["A100", "Z900"], ["b@eins.test"], ["0201 2"]), "Projektnummern, weitere Mail, Fax")
    gleich((K[1]["art"], K[1]["gewerke"], [p["name"] for p in K[1]["projekte"]]), ("bauherr", [], ["B22 Schule"]), "Bauherrin")
    gleich((K[2]["aktion"], K[2]["schon"]["name"], n), ("ergaenzen", "Alt Bau GmbH", {"neu": 2, "ergaenzen": 1, "ueberspringen": 0, "doppelt": 0}), "vorhandener Kontakt")


def test_einlesen_und_zurueck_felder():
    c = db()
    K, _ = E.ordnen(c, Z, E.spalten(KOPF, Z))
    K.append({**K[0], "aktion": "doppelt"})
    r = E.einlesen(c, K, "test")
    gleich((r["neu"], r["ergaenzt"]), (3, 1), "angelegt und ergänzt")
    d = c.execute("SELECT * FROM contacts WHERE name='Dach Eins GmbH'").fetchone()
    ex = json.loads(d["extra"])
    gleich((d["contact_person"], ex["firma"]["ap_anrede"], d["email"], d["website"], d["trade"], d["stichworte"], ex["projektnr"]),
           ("Max Beispiel", "Herr", "a@eins.test", "https://eins.test", "Dachdecker, Klempner", "", ["A100", "Z900"]), "Felder")
    gleich(sorted((w["typ"], w["wert"]) for w in ex["weitere"]), [("mail", "b@eins.test"), ("person", "Eva Muster"), ("tel", "0201 2")], "weitere Angaben")
    pruefe(c.execute("SELECT 1 FROM contacts WHERE name='Dach Eins GmbH (2)'").fetchone(), "doppelt mit Zähler")
    a = c.execute("SELECT * FROM contacts WHERE name='Alt Bau GmbH'").fetchone()
    gleich((a["street"], a["trade"], a["phone"]), ("Straße 3", "Maler", "0201 3"), "nur leere Felder gefüllt")
    gleich(c.execute("SELECT art FROM contacts WHERE name='Rita Probe'").fetchone()["art"], "bauherr", "Art")
    gleich(r["stand"]["vorher"][0]["zeile"]["street"], "", "Stand für Rückgängig")


def test_name_nur_im_nachnamen():
    """23.11.2026 (Video): Bauherr:in mit Firmenspalte (Hausverwaltung) und Personen je Projekt, deren Name nur in der Spalte „Nachname (nicht
    eintragen …)“ steht – Name aus dieser Spalte, kein Platzhalter „Ansprechpartner:in“, Telefon UND Mobil, Projekt je Person, Name in der
    Fax-Spalte als Notiz; nochmal eingelesen ersetzt die Personen ohne Namen. Erfundene Daten."""
    Z2 = [["Bauherr/Ansprechpartner vor Ort", "Hausverwaltung Probe", "", "Hr. Eins", "", "", "0111-1", "", "", "", "", "A401", ""],
          ["Bauherr/Ansprechpartner vor Ort", "Hausverwaltung Probe", "", "Hr. Zwei", "", "", "0222-2", "", "0170-2", "", "", "A402", ""],
          ["Bauherr/Ansprechpartner vor Ort", "Hausverwaltung Probe", "", "Fr. Drei", "", "", "0333-3", "Huda", "", "drei@probe.test", "", "A403.1", ""]]
    c = db()
    S = E.spalten(KOPF, Z2)
    K, _ = E.ordnen(c, Z2, S)
    E.einlesen(c, K, "test")
    d = c.execute("SELECT * FROM contacts WHERE name='Hausverwaltung Probe'").fetchone()
    ex = json.loads(d["extra"])
    P = [w for w in ex["weitere"] if w["typ"] == "person"]
    gleich((d["art"], d["contact_person"], ex["firma"].get("ist_firma"), ex["firma"].get("ap_anrede")), ("bauherr", "Eins", "ja", "Herr"), "Bauherr:in als Firma mit Ansprechpartner")
    gleich([(w["wert"], w.get("anrede"), w["tel"], w.get("bez")) for w in P], [("Zwei", "Herr", "0222-2", "Projekt A402"), ("Drei", "Frau", "0333-3", "Projekt A403.1")], "Personen mit Namen und Projekt")
    gleich([(w.get("bez"), w["wert"]) for w in ex["weitere"] if w["typ"] == "tel"], [("Zwei mobil", "0170-2")], "Mobil bleibt neben dem Telefon")
    pruefe("Fax-Spalte: Huda" in d["notes"] and not any(w.get("wert") == "Huda" for w in ex["weitere"]), "Name in der Fax-Spalte → Notiz")
    # früher eingelesen: Personen mit Platzhalter → Dienste nehmen ihn weg, erneutes Einlesen (ergänzen) setzt den Namen
    alt = {**ex, "weitere": [{**w, "wert": "Ansprechpartner:in"} if w["typ"] == "person" else w for w in ex["weitere"]]}
    c.execute("UPDATE contacts SET extra=? WHERE id=?", (json.dumps(alt), d["id"]))
    from bpcore import contacts as KC
    gleich(KC.platzhalter_weg(c), 1, "Platzhalter entfernt")
    pruefe(all("wert" not in w for w in json.loads(c.execute("SELECT extra FROM contacts WHERE id=?", (d["id"],)).fetchone()["extra"])["weitere"] if w["typ"] == "person"), "ohne Namen")
    K, _ = E.ordnen(c, Z2, S)
    E.einlesen(c, K, "test")
    P = [w for w in json.loads(c.execute("SELECT extra FROM contacts WHERE id=?", (d["id"],)).fetchone()["extra"])["weitere"] if w["typ"] == "person"]
    gleich(sorted(w.get("wert", "") for w in P), ["Drei", "Zwei"], "nochmal eingelesen: Namen ersetzen die Personen ohne Namen")


def test_csv():
    t = "Firma;Telefon;PLZ;Ort\nSüd GmbH;0201 5;45127;Essen\n".encode("cp1252")
    Z2 = E.lesen("liste.csv", t)
    S = E.spalten(Z2[0], Z2[1:])
    gleich(S, ["firma", "tel", "plz", "ort"], "CSV-Spalten")
    K, _ = E.ordnen(db(), Z2[1:], S)
    gleich((K[0]["name"], K[0]["zip"], K[0]["city"]), ("Süd GmbH", "45127", "Essen"), "Windows-Zeichensatz")
    try:
        E.lesen("liste.pdf", b"x")
        pruefe(False, "PDF abgelehnt")
    except ValueError:
        pass


def test_xlsx():
    import io
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(KOPF)
    for z in Z:
        ws.append(z)
    ws.append([None] * 13)
    b = io.BytesIO()
    wb.save(b)
    Z2 = E.lesen("liste.xlsx", b.getvalue())
    gleich((len(Z2), Z2[0][1], Z2[1][1]), (5, "Müller", "Dach Eins GmbH"), "leere Zeilen weg, Text bleibt")


def test_behoerde_und_person():
    """BH-1 … BH-4: Name „Stadt …“ = Behörde, Gewerk-Spalte = Amt je Person; Titel und Zusatz zerlegt; Bauherr:in als Person."""
    from bpcore import contacts as KK
    gleich(KK.person_zerlegen("Hr. Dr. Max Beispiel M.A."), ("Herr", "Dr.", "Max Beispiel", "M.A."), "Person zerlegen")
    gleich(KK.person_zerlegen("Kira Potschka M.A."), ("", "", "Kira Potschka", "M.A."), "nur Zusatz")
    Z3 = [["Amt für Baurecht", "Stadt Duisburg", "Fr. Kira Potschka M.A.", "", "", "", "0203 1", "", "", "k@duisburg.test", "", "", ""],
          ["Untere Denkmalbehörde", "Stadt Duisburg", "Hr. Dr. Jan Beispiel", "", "", "", "", "", "", "", "", "", ""],
          ["Bauherr", "", "Hr. Prof. Otto Probe", "", "", "", "", "", "", "", "", "", ""]]
    c = db()
    K, _ = E.ordnen(c, Z3, E.spalten(KOPF, Z3))
    b = K[0]
    gleich((b["art"], b["gewerke"], [p["amt"] for p in b["personen"]]), ("behoerde", [], ["Amt für Baurecht", "Untere Denkmalbehörde"]), "Behörde mit Ämtern")
    E.einlesen(c, K, "test")
    r = c.execute("SELECT * FROM contacts WHERE name='Stadt Duisburg'").fetchone()
    ex = json.loads(r["extra"])
    gleich((r["art"], r["trade"], r["contact_person"], ex["firma"]["amt"], ex["firma"]["ap_zusatz"], ex["weitere"][0]["amt"], ex["weitere"][0]["titel"]),
           ("behoerde", "", "Kira Potschka", "Amt für Baurecht", "M.A.", "Untere Denkmalbehörde", "Dr."), "Behörde gespeichert")
    o = c.execute("SELECT * FROM contacts WHERE name='Otto Probe'").fetchone()
    gleich((o["art"], o["contact_person"], json.loads(o["extra"])["firma"]["ap_titel"]), ("bauherr", "", "Prof."), "Bauherr als Person")


def test_suche_findet_stichwoerter():
    """Strg+K / Kontaktfeld (contacts.suchen, 23.11.2026): jedes Wort irgendwo – auch Stichwörter, Projektnummern, Amt."""
    from bpcore import contacts as KK
    c = db()
    c.execute("""INSERT INTO contacts(name, stichworte, city, extra) VALUES('Dach Zwei GmbH', 'Gründach', 'Essen', '{"projektnr": ["A528"], "firma": {"amt": "Bauordnungsamt"}}')""")
    gleich([x["name"] for x in KK.suchen(c, "gründach")], ["Dach Zwei GmbH"], "Stichwort")
    gleich([x["name"] for x in KK.suchen(c, "a528 essen")], ["Dach Zwei GmbH"], "Projektnummer und Ort")
    gleich([x["name"] for x in KK.suchen(c, "bauordnungsamt")], ["Dach Zwei GmbH"], "Amt")
    gleich(KK.suchen(c, "gründach köln"), [], "jedes Wort muss passen")
