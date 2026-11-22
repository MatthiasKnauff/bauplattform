"""Adressverzeichnis exportieren (bpcore/contacts.py, ein Baustein für Bautagebuch und Adressen, 17.11.2026): Excel mit allen Spalten
und „In Berichten verwendet“, PLZ als Text; PDF im Druck-Layout „Adressverzeichnis“ (Kopf, Unterzeile mit Stand, Zahl, Filter und Fußzeile aus dem Layout)."""
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


def _db():
    import sqlite3
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE settings(key PRIMARY KEY, value)")
    c.execute("CREATE TABLE bp_store(key PRIMARY KEY, data, updated, updated_by)")
    c.execute("CREATE TABLE buero_logo(id INTEGER PRIMARY KEY, daten, ext, geaendert)")   # ohne Logo
    c.execute("INSERT INTO settings VALUES('office_name', 'Musterbüro'), ('co_city', 'Essen')")
    return c


def test_pdf():   # 23.11.2026: im Druck-Layout „Adressverzeichnis“ (bpcore/layout.py) – ab Werk A4 quer, ohne Briefbogen, Spalte Notizen wählbar
    from pypdf import PdfReader
    from bpcore import layout
    c = _db()
    pdf = C.export_pdf(c, ROWS, "Gewerk: Dachdecker", "Max Muster")
    pruefe(pdf[:5] == b"%PDF-", "PDF-Kopf")
    s = PdfReader(io.BytesIO(pdf)).pages[0]
    text = s.extract_text()
    pruefe(float(s.mediabox.width) > float(s.mediabox.height), "A4 quer")
    pruefe("Adressverzeichnis" in text and "Musterbüro" in text and "2 Kontakte · Gewerk: Dachdecker" in text and "Seite 1" in text, f"Kopf und Fuß aus dem Layout: {text[:300]}")
    pruefe("Notizen" not in text, "Notizen ab Werk aus")
    pruefe("Notizen" in PdfReader(io.BytesIO(C.export_pdf(c, ROWS, "x", "", None, {"notizen": True}))).pages[0].extract_text(), "Notizen als Inhaltseinstellung")
    gleich(layout.bogen_modus(layout.aktiv(c, "adressen")), "ohne", "ab Werk ohne Briefbogen (A4 hoch passt nicht unter A4 quer)")
