"""Gemeinsame Umwandlungen (bpcore/wert.py) und Anmeldung (bpcore/anmeldung.py) – einmal für alle Apps statt Kopien je Modul."""
from bpcore import anmeldung as A, wert as W
from lib import gleich, pruefe


def test_umwandlungen():
    gleich(W.zahl("1,5"), 1.5, "Zahl mit Komma")
    gleich(W.zahl("abc"), None, "keine Zahl")
    gleich(W.zahl_oder("", 7.0), 7.0, "leer → Standard")
    gleich(W.ids("[1, \"2\"]"), [1, 2], "ids aus JSON")
    gleich(W.ids("[\"x\"]"), [], "kaputte ids")
    gleich(W.de("2026-11-16"), "16.11.2026", "Datum")
    gleich(W.de("irgendwas"), "irgendwas", "kein Datum bleibt stehen")
    gleich(W.eur(1234.5), "1.234,50 €", "Euro")
    gleich(W.hm(125), "02:05", "Minuten als hh:mm")
    gleich(W.latin("A – „B“ … 5 €"), 'A - "B" ... 5 EUR', "Latin-1 für Formularfelder")
    gleich(W.falt("Größe Öl"), "groesse oel", "Umlaute aufgelöst")
    gleich(W.kurz("  a \n b  ", 3), "a b", "Leerraum, Länge")
    gleich(W.oz_teile("01.0020"), ("1", "20"), "Ordnungszahl")
    gleich(W.adresse({"street": "Weg 1", "zip": "45131", "city": "Essen"}), "Weg 1, 45131 Essen", "Adresse")


def test_anmeldung():
    from werkzeug.security import generate_password_hash
    u = {"pass_hash": generate_password_hash("Bauleitung2026!")}
    pruefe(A.pruefe(u, "Bauleitung2026!") and not A.pruefe(u, "falsch") and not A.pruefe(None, "x"), "Kennwortprüfung")
    pruefe("mindestens" in A.neu_pruefen("kurz"), "zu kurz")
    pruefe("zu einfach" in A.neu_pruefen("anna bauer", "Anna Bauer"), "eigener Name")
    gleich(A.neu_pruefen("Bauleitung2026!", "Anna", "Testdaten1"), None, "gutes Kennwort")
    k = "test:bremse"
    A.frei(k)
    for _ in range(5):
        pruefe(not A.zu_viele(k), "Bremse zu früh")
        A.fehlversuch(k)
    pruefe(A.zu_viele(k), "Bremse greift nach 5 Fehlversuchen nicht")
    A.frei(k)
    pruefe(not A.zu_viele(k), "Bremse nach frei() noch aktiv")
