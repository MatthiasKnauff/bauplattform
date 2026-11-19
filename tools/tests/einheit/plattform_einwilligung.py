"""Datenschutzhinweise und Einwilligung (bpcore/einwilligung.py) und Verfahrensbeschreibung der Anonymisierung (bpcore/ki_verfahren.py) –
Mock „DSGVO: KI anonymisieren“, entschieden am 14.11.2026. Ohne Server: kleine SQLite-Datenbank im Speicher, Testdaten erfunden."""
import io
import json
import sqlite3
from datetime import date, timedelta

from bpcore import einwilligung as E
from lib import gleich, pruefe


def _c():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.executescript("""
      CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE bp_store(key TEXT PRIMARY KEY, data TEXT);
      CREATE TABLE rollen(key TEXT PRIMARY KEY, name TEXT);
      CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, vorname TEXT DEFAULT '', nachname TEXT DEFAULT '', rolle TEXT DEFAULT '', active INTEGER DEFAULT 1, extra TEXT DEFAULT '{}');
      CREATE TABLE personal_person(user_id INTEGER PRIMARY KEY, personal INTEGER DEFAULT 1);
      INSERT INTO settings VALUES ('office_name', 'Musterbüro Architekten'), ('co_street', 'Beispielweg 1'), ('co_zip', '12345'), ('co_city', 'Musterstadt');
      INSERT INTO rollen VALUES ('bl', 'Bauleitung');
      INSERT INTO users(id, name, vorname, nachname, rolle) VALUES (7, 'abauer', 'Anna', 'Beispiel', 'bl'), (8, 'cmuster', 'Carl', 'Muster', '');
    """)
    return c


def test_abschnitte_und_platzhalter():
    A = E.abschnitte(E.STANDARD)
    pruefe(len(A) >= 8 and A[0][0] == "Wer verantwortlich ist", f"Abschnitte aus „## …“: {[a for a, _ in A]}")
    pruefe(any("Art. 15" in t for _, t in A) and any("anonymisiert" in t for _, t in A), "Rechte und KI stehen im Entwurf")
    gleich(E.abschnitte("Vorwort\n## A\nx\n## B\ny"), [("", "Vorwort"), ("A", "x"), ("B", "y")], "Text vor dem ersten Abschnitt bleibt")
    gleich(E.fuellen("{buero} in {adresse}", {"buero": "B", "adresse": "Ort"}), "B in Ort", "Platzhalter")


def test_text_eigen_und_standard():
    c = _c()
    gleich(E.text(c), (E.STANDARD, True), "ab Werk der Entwurf")
    E.text_setzen(c, "## Eigen\nText des Büros")
    gleich(E.text(c), ("## Eigen\nText des Büros", False), "eigener Text")
    E.text_setzen(c, E.STANDARD)
    gleich(E.text(c)[1], True, "Standard wieder eingesetzt → nichts Eigenes gespeichert")


def test_stand_grau_rot_zurueck():
    h = date(2026, 11, 19)
    s = E.stand({}, h)
    gleich((s["offen"], s["rot"]), (True, False), "noch nicht gedruckt: offen, grau")
    s = E.stand({"einwilligung": {"gedruckt": (h - timedelta(days=13)).isoformat()}}, h)
    gleich((s["offen"], s["rot"]), (True, False), "13 Tage nach dem Druck: grau")
    s = E.stand({"einwilligung": {"gedruckt": (h - timedelta(days=14)).isoformat()}}, h)
    gleich((s["offen"], s["rot"]), (True, True), "14 Tage nach dem Druck: rot")
    s = E.stand({"einwilligung": {"gedruckt": "2026-11-01", "zurueck": "2026-11-05"}}, h)
    gleich((s["offen"], s["zurueck"]), (False, "2026-11-05"), "unterschrieben zurück")


def test_druck_zurueck_und_todo():
    c = _c()
    E.gedruckt(c, 7)
    e = json.loads(c.execute("SELECT extra FROM users WHERE id=7").fetchone()["extra"])["einwilligung"]
    gleich(e["gedruckt"], date.today().isoformat(), "Druck gemerkt")
    c.execute("UPDATE users SET extra=? WHERE id=7", (json.dumps({"einwilligung": {"gedruckt": "2026-11-01"}, "winapp": {"nie": True}}),))
    E.gedruckt(c, 7)
    gleich(json.loads(c.execute("SELECT extra FROM users WHERE id=7").fetchone()["extra"])["einwilligung"]["gedruckt"], "2026-11-01", "erneuter Druck behält das erste Datum")
    O = E.offen(c)
    gleich([(x["id"], x["name"], x["bis"]) for x in O], [(7, "Anna Beispiel", "2026-11-15")], "To-do: gedruckt, nicht zurück, fällig nach 14 Tagen")
    E.zurueck(c, 7, "05 Datenschutz & Einwilligungen/Einwilligung.pdf")
    ex = json.loads(c.execute("SELECT extra FROM users WHERE id=7").fetchone()["extra"])
    gleich((E.offen(c), ex["winapp"]), ([], {"nie": True}), "zurück: kein To-do mehr, übrige Angaben bleiben")


def test_pdf_blatt_und_verfahren():
    from pypdf import PdfReader
    c = _c()
    t = "".join(p.extract_text() for p in PdfReader(io.BytesIO(E.pdf(c, 7))).pages)
    for w in ("Datenschutzhinweise und Einwilligung", "Musterbüro Architekten", "Anna Beispiel", "Bauleitung", "Beispielweg 1, 12345 Musterstadt", "Unterschrift", "Entwurf ab Werk"):
        pruefe(w in t, f"Blatt enthält „{w}“")
    E.text_setzen(c, "## Eigen\nHinweise von {buero}.")
    t = "".join(p.extract_text() for p in PdfReader(io.BytesIO(E.pdf(c, 8))).pages)
    pruefe("Hinweise von Musterbüro Architekten." in t and "Entwurf ab Werk" not in t, "eigener Text ohne Entwurf-Vermerk")
    from bpcore import ai, ki_verfahren
    alt = ai.store
    ai.store = lambda c_, k: {"ki": {"zusatz": False}}
    try:
        t = " ".join(p.extract_text() for p in PdfReader(io.BytesIO(ki_verfahren.pdf(c))).pages).replace("\n", " ")
    finally:
        ai.store = alt
    for w in ("Verfahrensbeschreibung", "firma#", "Ollama", "trotzdem senden", "90 Tagen", "ist derzeit aus"):
        pruefe(w in t, f"Verfahrensbeschreibung enthält „{w}“")
