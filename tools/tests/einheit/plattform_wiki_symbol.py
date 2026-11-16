"""Wiki-Symbol (bpcore/wiki_symbol.py, GO 16.11.2026): Treffer nach Worten und Projekt nur für geprüfte Einträge; Bearbeiten ohne Recht
geht in die Prüfrunde; Löschen nur mit Recht oder als Autor:in; nachts fällig nur, was älter ist als die Frist. Testdaten erfunden."""
import json
import sqlite3
from datetime import datetime, timedelta

from bpcore import wiki_symbol as S
from lib import gleich, pruefe


def db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE wiki_eintrag(id INTEGER PRIMARY KEY, kapitel, titel, text, stichworte, quelle, projekt_id, projekte, status, autor, created, updated, deleted DEFAULT '')")
    c.execute("CREATE TABLE wiki_datei(id INTEGER PRIMARY KEY, eintrag, name, pfad, deleted DEFAULT '')")
    c.execute("CREATE TABLE bp_store(key PRIMARY KEY, data, updated, updated_by)")
    E = [(1, "Abdichtung", "Sockel: Abdichtung hochführen", "30 cm", "Abdichtung, Sockel", "[]", "geprueft"),
         (2, "Abdichtung", "Bitumendickbeschichtung nicht bei Frost", "…", "Abdichtung", json.dumps([{"id": 12, "name": "A497"}]), "geprueft"),
         (3, "Ausbau", "Estrich: Belegreife messen", "CM-Messung", "Estrich", "[]", "neu")]
    for i, k, t, x, s, p, st in E:
        c.execute("INSERT INTO wiki_eintrag(id, kapitel, titel, text, stichworte, projekte, status, autor) VALUES(?,?,?,?,?,?,?,5)", (i, k, t, x, s, p, st))
    return c


def test_treffer():
    c = db()
    R = S.symbole(c, {"a": {"w": ["Sockelabdichtung mit Bitumendickbeschichtung"]}, "b": {"w": ["Estrich verlegen"]}, "c": {"w": [], "p": 12}, "d": {"w": ["Malerarbeiten"]}})
    gleich(sorted(x["id"] for x in R["a"]), [1, 2], "Worte passen zu Stichworten/Titel")
    gleich(R["b"], [], "nur geprüfte Einträge (Estrich ist noch neu)")
    gleich([x["id"] for x in R["c"]], [2], "ausdrücklich mit dem Projekt verknüpft")
    gleich(R["d"], [], "nichts Passendes → kein Symbol")


def test_rechte():
    ich, chef, autor = {"id": 9, "name": "x", "rollen": []}, {"id": 1, "name": "y", "is_admin": True}, {"id": 5, "name": "z"}
    e = {"autor": 5}
    import bpcore.wiki as W
    alt = W.darf_pruefen
    W.darf_pruefen = lambda u: u is chef
    try:
        pruefe(not S.darf_loeschen(ich, e) and S.darf_loeschen(chef, e) and S.darf_loeschen(autor, e), "löschen: Recht oder Autor:in")
    finally:
        W.darf_pruefen = alt


def test_nachts_nur_was_faellig_ist():
    c = db()
    jetzt = datetime(2026, 12, 20, 3, 0)
    alt, jung = (jetzt - timedelta(days=40)).strftime("%Y-%m-%dT%H:%M:%S"), (jetzt - timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%S")
    c.execute("UPDATE wiki_eintrag SET deleted=? WHERE id=1", (alt,))
    c.execute("UPDATE wiki_eintrag SET deleted=? WHERE id=2", (jung,))
    c.execute("INSERT INTO wiki_datei(id, eintrag, name, pfad) VALUES(1, 1, 'a.jpg', 'Abdichtung/a.jpg'), (2, 2, 'b.jpg', 'Abdichtung/b.jpg')")
    c.execute("INSERT INTO wiki_datei(id, eintrag, name, pfad, deleted) VALUES(3, 3, 'c.pdf', 'Ausbau/c.pdf', ?)", (alt,))
    c.execute("INSERT INTO bp_store(key, data) VALUES('papierkorb:dateien:wiki', ?)", (json.dumps(["Recht/d.pdf"]),))
    P, E, D = S.faellig(c, jetzt)
    gleich(E, [1], "nur Einträge älter als 30 Tage")
    gleich(D, [3], "gelöschte Datei älter als 30 Tage")
    gleich(sorted(P), ["Abdichtung/a.jpg", "Ausbau/c.pdf", "Recht/d.pdf"], "Dateien für den Papierkorb der Ablage")
    S.entfernen(c, E, D)
    gleich([r["id"] for r in c.execute("SELECT id FROM wiki_eintrag ORDER BY id")], [2, 3], "jüngerer gelöschter Eintrag bleibt (noch wiederherstellbar)")
    gleich(S.faellig(c, jetzt)[0], [], "Warteschlange abgeholt – nichts mehr fällig")
