"""Adressverzeichnis exportieren (bpcore/contacts.py, ein Baustein für Bautagebuch und Adressen, 17.11.2026): Excel mit allen Spalten
und „In Berichten verwendet“, PLZ als Text; PDF mit Kopf, Unterzeile (Kurzname, Stand, Zahl, Filter) und Fußzeile."""
import io
from bpcore import contacts as C
from lib import gleich, pruefe

ROWS = [{"name": "Dachdecker Müller", "trade": "Dachdecker", "contact_person": "Anna Müller", "role": "Inhaberin", "phone": "0201 1", "mobile": "0170 2",
         "email": "a@m.de", "website": "m.de", "street": "Weg 1", "zip": "01067", "city": "Dresden", "notes": "", "used": 3},
        {"name": "Klempner Krause", "trade": "", "contact_person": "", "role": "", "phone": "", "mobile": "", "email": "", "website": "", "street": "", "zip": "", "city": "", "notes": "x", "used": 0}]


def test_xlsx():
    from openpyxl import load_workbook
    ws = load_workbook(io.BytesIO(C.export_xlsx(ROWS))).active
    gleich([c.value for c in ws[1]][:3], ["Firma / Name", "Gewerk", "Ansprechpartner:in"], "Kopfzeile")
    gleich(ws.cell(2, 1).value, "Dachdecker Müller", "erste Zeile")
    gleich(ws.cell(2, 10).value, "01067", "PLZ")
    gleich(ws.cell(2, 10).number_format, "@", "PLZ als Text (führende Null)")
    gleich(ws.cell(2, len(C.EXPORT_COLS) + 1).value, 3, "In Berichten verwendet")
    gleich(ws.cell(3, 1).value, "Klempner Krause", "zweite Zeile")
    gleich(ws.max_row, 3, "zwei Kontakte")


def test_pdf():
    pdf = C.export_pdf(ROWS, "Gewerk: Dachdecker", kopf="GK3", fuss="Adressen – Adressverzeichnis")
    pruefe(pdf[:5] == b"%PDF-", "PDF-Kopf")
    pruefe(len(pdf) > 1500, "PDF hat Inhalt")
    gezeichnet = []
    pdf2 = C.export_pdf(ROWS, "alle Kontakte", logo=lambda cv: gezeichnet.append(1), top_mm=22)
    pruefe(pdf2[:5] == b"%PDF-" and gezeichnet, "Logo wird je Seite gezeichnet")
