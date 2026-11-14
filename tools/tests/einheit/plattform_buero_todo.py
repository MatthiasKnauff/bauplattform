"""ToDo-Liste der Bauplattform: Abschnitte, wartende Punkte, Unterpunkte, Zeitangabe, Erledigtes, stabile Kennung."""
from bpcore import buero_todo
from lib import gleich, pruefe

MD = """# Bauplattform – ToDo-Liste

## Wartet auf dich
- **App-Einstellungen aufräumen** – Adressen ohne App-Seite **ca. 2 h**
- **Kanban** – Entwurf zeigen?

## Jetzt in Arbeit
- Suche in der Kopfleiste **ca. 15 min**
  - ~~Startseite erledigt~~
  - offen: Mängel

## Erledigt
- ~~Aufmaß rechts – 14.11.2026~~
"""


def test_todo_lesen():
    A = buero_todo.lesen(MD)
    gleich([(a["titel"], a["warten"], len(a["punkte"])) for a in A], [("Wartet auf dich", True, 2), ("Jetzt in Arbeit", False, 1), ("Erledigt", False, 1)], "Abschnitte")
    p = A[0]["punkte"][0]
    gleich((p["id"], p["zeit"], p["text"]), ("app-einstellungen-aufräumen", "ca. 2 h", "App-Einstellungen aufräumen – Adressen ohne App-Seite"), "Kennung aus dem fetten Titel, Zeit abgetrennt")
    u = A[1]["punkte"][0]["unter"]
    gleich([(x["text"], x["erledigt"]) for x in u], [("Startseite erledigt", True), ("offen: Mängel", False)], "Unterpunkte mit Erledigt")
    pruefe(A[2]["punkte"][0]["erledigt"], "durchgestrichen = erledigt")
