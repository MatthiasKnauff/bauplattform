"""Rüge aus dem Suchfeld (bpcore/ruegesuche.py, GO 18.11.2026): Befehlswort erkennen, Firma aus den Wörtern, Mangelzeile aus dem
Schriftverkehr, Bezug im Anschreiben, Vermerk im Bautagebuch – reine Funktionen ohne Datenbank."""
from bpcore import ruegesuche as r
from lib import gleich, pruefe


def test_befehl_und_woerter():
    gleich(r.erkennen("mängelrüge Wasserschaden Assenmacher"), ("mangel", ["wasserschaden", "assenmacher"]), "Mängelrüge + Wörter")
    gleich(r.erkennen("Assenmacher wegen Wasserschaden Rüge"), ("mangel", ["assenmacher", "wasserschaden"]), "Reihenfolge egal, Füllwörter weg")
    gleich(r.erkennen("Terminrüge Müller")[0], "termin", "Terminrüge")
    gleich(r.erkennen("Wasserschaden Assenmacher")[0], None, "ohne Befehlswort keine Rüge")


def test_firma_passt():
    pruefe(r._passt_firma("assenmacher", "Assenmacher GmbH & Co. KG"), "ganzes Wort")
    pruefe(r._passt_firma("assen", "Assenmacher GmbH"), "Anfang des Namens")
    pruefe(not r._passt_firma("gmbh", "Assenmacher GmbH"), "Rechtsform zählt nicht")
    pruefe(not r._passt_firma("wa", "Wasserwerk"), "zu kurz")


def test_mangeltext_bezug_vermerk():
    q = {"betreff": "AW: Wasserschaden Keller", "text": "Sehr geehrte Damen und Herren, im Keller steht nach dem Rohrbruch Wasser. Bitte melden Sie sich."}
    gleich(r.mangeltext(q, "x"), "Wasserschaden Keller: im Keller steht nach dem Rohrbruch Wasser.", "Betreff ohne AW + erster Satz ohne Anrede")
    gleich(r.mangeltext({"betreff": "", "text": ""}, "Dachrinne"), "Dachrinne", "ohne Text: Stichwort")
    t = r.mit_bezug("bei der Ausführung wurden die Mängel festgestellt. Gemäß § 4", {"datum": "2026-11-10", "eingang": True})
    gleich(t, "bei der Ausführung wurden die Mängel festgestellt. Wir beziehen uns auf Ihre Nachricht vom 10.11.2026. Gemäß § 4", "Bezug nach dem ersten Satz")
    gleich(r.mit_bezug("Text", {"datum": "kaputt"}), "Text", "ohne gültiges Datum kein Bezug")
    gleich(r.vermerk({"datum": "2026-11-10", "eingang": True}), "gemeldet per Mail am 10.11.2026", "Vermerk Mail")
    gleich(r.vermerk({"datum": "2026-11-10", "typ": "vorgang"}), "festgehalten am 10.11.2026", "Vermerk Vorgang")
