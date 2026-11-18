"""Ansprechperson im Versand (GO 18.11.2026, Mock „Ansprechperson im Versand“: AP-A1 B1 C1): Anrede und Titel an der Person in den
Adressen, Personen ohne eigene E-Mail bekommen die Adresse der Firma (bpcore/contacts.py: anrede, mail_adressen, weitere_bereinigen)."""
import json

from bpcore import contacts as K
from lib import gleich


class Zeile(dict):
    def keys(self):
        return super().keys()


def test_anrede_aus_der_person():
    gleich(K.anrede("Peter Schulte", "Herr", "Dr."), "Sehr geehrter Herr Dr. Schulte,", "Anrede und Titel an der Person")
    gleich(K.anrede("Anna Kowalski", "Frau"), "Sehr geehrte Frau Kowalski,", "Frau ohne Titel")
    gleich(K.anrede("Herr Kemper"), "Sehr geehrter Herr Kemper,", "wie bisher aus dem Namen")
    gleich(K.anrede("Anna Kowalski"), "Guten Tag Anna Kowalski,", "Name ohne Anrede")
    gleich(K.anrede(""), "Sehr geehrte Damen und Herren,", "Firma allgemein")


def test_personen_ohne_eigene_mail():
    k = Zeile(email="info@schulte.de", contact_person="Peter Schulte", extra=json.dumps({
        "firma": {"ap_anrede": "Herr", "ap_titel": "Dr."},
        "weitere": [{"typ": "person", "wert": "Anna Kowalski", "bez": "Bauleitung", "anrede": "Frau"},
                    {"typ": "person", "wert": "Jens Berg", "mail": "j.berg@schulte.de", "anrede": "Herr"}]}))
    A = K.mail_adressen(k)
    gleich([(x["name"], x["email"], x["eigene"]) for x in A],
           [("Peter Schulte", "info@schulte.de", True), ("Anna Kowalski", "info@schulte.de", False), ("Jens Berg", "j.berg@schulte.de", True)],
           "auch ohne eigene E-Mail wählbar")
    gleich(K.anrede_von(A[0]), "Sehr geehrter Herr Dr. Schulte,", "Hauptansprechperson mit Anrede aus der Firma")
    gleich(K.anrede_von(A[1]), "Sehr geehrte Frau Kowalski,", "weitere Person")


def test_bereinigen():
    w = K.weitere_bereinigen([{"typ": "person", "wert": "X Y", "anrede": "Herrn", "titel": "Dr."}, {"typ": "tel", "wert": "0201", "anrede": "Frau"}])
    gleich(w, [{"typ": "person", "wert": "X Y", "titel": "Dr."}, {"typ": "tel", "wert": "0201"}], "nur Herr/Frau, nur bei Personen")
    gleich(K.firma_bereinigen({"ap_anrede": "Frau", "ap_titel": " Prof. "})["ap_anrede"], "Frau", "Anrede der Hauptansprechperson")
