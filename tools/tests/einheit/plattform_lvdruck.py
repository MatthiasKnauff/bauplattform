"""LV-Druck im Stil unserer Dokumente (GO 18.11.2026, A1 B1 C1 D1 – plattform/ava_lvdruck.py): Deckblatt mit Kapiteln Projekt,
Angebotsabgabe, Ausschreibende Stelle; Seite 2 mit Vertragsbedingungen (auch Zahlungsfrist, Nachweise, Nachunternehmer) und Angebotssumme
mit Unterschrift; kein Projektbild, keine Kästen des früheren Musters. Ohne Datenbank (läuft im Container der AVA)."""
import io

import ava_lvdruck as LD
from lib import pruefe
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, Frame, PageBreak, PageTemplate

FN = {"n": "Helvetica", "b": "Helvetica-Bold"}
LV = {"nr": "08", "name": "Dachabdichtung", "gewerk": "Dachabdichtung"}


def _pdf(entwurf=False):
    D = {"meta": {"vergabenr": "A481-08", "abgabe": "2026-12-11", "abgabe_zeit": "10:00", "bindefrist": "2027-01-29", "vertragsart": "Einheitspreisvertrag (VOB/B)"},
         "S": {"office_name": "Büro", "co_street": "Weg 1", "co_zip": "45000", "co_city": "Essen"}, "leitung": [], "projektnr": "A481", "projektname": "Tierheim",
         "vereinbarungen": [], "vb": [("Zahlungsfrist", "21 Tage"), ("Nachweise", "Freistellungsbescheinigung"), ("Nachunternehmer", "nur mit Zustimmung")], "ich": "M. K.", "bauleitung": ""}
    F = {"Titel": "Leistungsverzeichnis", "Bauvorhaben": "Erweiterung", "Bauherr": "Stadt Essen\nöffentliche:r Auftraggeber:in", "Aufsteller": "Büro", "Hinweis": "", "Datum": "18.11.2026"}
    buf, felder = io.BytesIO(), []
    doc = BaseDocTemplate(buf, pagesize=A4)
    feld = lambda nm, *a: felder.append(nm)   # noqa: E731
    doc.addPageTemplates([PageTemplate(id="a", frames=[Frame(25 * mm, 20 * mm, 170 * mm, 257 * mm)],
                                       onPage=lambda cv, d: d.page == 1 and LD.deckblatt(cv, A4, D, F, FN, LV, {}, None, entwurf, feld))])
    doc.build([PageBreak()] + LD.angaben(D, F, LV, FN, 170 * mm, 9))
    return buf.getvalue(), felder


def test_deckblatt_und_angaben():
    from pypdf import PdfReader
    pdf, _ = _pdf()
    S = [p.extract_text() for p in PdfReader(io.BytesIO(pdf)).pages]
    for t in ("Leistungsverzeichnis", "PROJEKT", "Angebotsabgabe", "Ausschreibende Stelle", "öffentliche:r Auftraggeber:in", "11.12.2026 10:00 Uhr", "bis 29.01.2027"):
        pruefe(t in S[0], f"Deckblatt: „{t}“ fehlt")
    for t in ("Vertragsbedingungen", "ZAHLUNGSFRIST", "NACHWEISE", "NACHUNTERNEHMER", "Angebotssumme brutto", "Unterschrift und Stempel"):
        pruefe(t in S[1], f"Seite 2: „{t}“ fehlt")
    _, felder = _pdf(entwurf=True)
    pruefe(set(felder) == {"Bauvorhaben", "Bauherr", "Aufsteller", "Hinweis"}, f"Felder des Druck-Editors: {felder}")
