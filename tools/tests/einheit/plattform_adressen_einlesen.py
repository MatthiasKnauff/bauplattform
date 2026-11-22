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
    gleich(S, ["gewerk", "firma", "person", "", "strasse", "plzort", "tel", "fax", "mobil", "mail", "web", "projekt", "notiz"], "Zuordnung")
    c = db()
    K, n = E.ordnen(c, Z, S)
    gleich([k["name"] for k in K], ["Dach Eins GmbH", "Rita Probe", "Alt Bau GmbH"], "ein Kontakt je Firma, Person ohne Firma")
    d = K[0]
    gleich(([p["name"] for p in d["personen"]], [p["anrede"] for p in d["personen"]], d["gewerke"], d["zip"], d["city"]),
           (["Max Beispiel", "Eva Muster"], ["Herr", "Frau"], ["Dachdecker", "Klempner"], "45127", "Essen"), "Personen, Gewerke, PLZ/Ort")
    gleich(([p["name"] for p in d["projekte"]], d["stichworte"], d["mails"], d["tel"]), (["A100 Haus am See"], ["Z900"], ["b@eins.test"], ["0201 2"]), "Projekt, Stichwort, weitere Mail, Fax")
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
    gleich((d["contact_person"], d["email"], d["website"], d["trade"], d["stichworte"], ex["projekte"]),
           ("Herr Max Beispiel", "a@eins.test", "https://eins.test", "Dachdecker, Klempner", "Z900", [1]), "Felder")
    gleich(sorted((w["typ"], w["wert"]) for w in ex["weitere"]), [("mail", "b@eins.test"), ("person", "Eva Muster"), ("tel", "0201 2")], "weitere Angaben")
    pruefe(c.execute("SELECT 1 FROM contacts WHERE name='Dach Eins GmbH (2)'").fetchone(), "doppelt mit Zähler")
    a = c.execute("SELECT * FROM contacts WHERE name='Alt Bau GmbH'").fetchone()
    gleich((a["street"], a["trade"], a["phone"]), ("Straße 3", "Maler", "0201 3"), "nur leere Felder gefüllt")
    gleich(c.execute("SELECT art FROM contacts WHERE name='Rita Probe'").fetchone()["art"], "bauherr", "Art")
    gleich(r["stand"]["vorher"][0]["zeile"]["street"], "", "Stand für Rückgängig")


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
