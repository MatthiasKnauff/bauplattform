"""Neuigkeiten: was in einem neuen Stand dazukam – jeder Benutzer sieht es einmal (Startseite: Überblick, in der App: Rundgang).

Die Einträge stehen in neuigkeiten.json (wird mit jedem Push nachgeführt): {id, datum, app, titel, text, ziel}
  app   Schlüssel der App (plaene, bautagebuch, portal …); leer = gilt überall
  ziel  CSS-Auswahl der Stelle, auf die der Rundgang zeigt (optional)
Gesehen wird je Benutzer in bp_store „neu:<id>“ gemerkt – gilt auf allen Geräten.
Wer zum ersten Mal kommt (neuer Kollege), bekommt nur, was höchstens 14 Tage alt ist.
"""
import json, os
from datetime import date, timedelta

from . import konto

DATEI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "neuigkeiten.json")


def laden():
    try:
        with open(DATEI, encoding="utf-8") as fh:
            d = json.load(fh)
        return [x for x in d if isinstance(x, dict) and x.get("id") and x.get("titel")]
    except (OSError, ValueError):
        return []


def _gesehen(c, uid):
    raw = konto._get(c, f"neu:{uid}")
    if raw is None:
        return None
    try:
        return set(json.loads(raw))
    except ValueError:
        return set()


def offen(c, uid, apps):
    """Ungesehene Einträge für die erlaubten Apps (apps: Menge der App-Schlüssel), neueste zuerst."""
    alle = [x for x in laden() if not x.get("app") or x["app"] in apps]
    g = _gesehen(c, uid)
    if g is None:   # zum ersten Mal: Älteres gilt als gesehen
        grenze = (date.today() - timedelta(days=14)).isoformat()
        g = {x["id"] for x in laden() if (x.get("datum") or "") < grenze}
        konto._put(c, f"neu:{uid}", json.dumps(sorted(g)), "neuigkeiten")
    return [x for x in alle if x["id"] not in g]


def neueste(apps, tage=60):
    grenze = (date.today() - timedelta(days=tage)).isoformat()
    return [x for x in laden() if (not x.get("app") or x["app"] in apps) and (x.get("datum") or "") >= grenze]


def verlauf(c, uid, apps):
    """Alle Einträge der erlaubten Apps, neueste zuerst, mit gesehen (für das Register „Änderungen“)."""
    g = _gesehen(c, uid) or set()
    L = [dict(x, gesehen=x["id"] in g) for x in laden() if not x.get("app") or x["app"] in apps]
    return sorted(L, key=lambda x: x.get("datum") or "", reverse=True)


SEITEN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hilfe_seiten")


def hilfeseite(app):
    """Hilfetext einer App (Markdown, von Claude aus dem Programm geschrieben und mitgepflegt); allgemein.md gilt überall."""
    app = "".join(ch for ch in str(app) if ch.isalnum() or ch in "-_")[:40]
    def lies(n):
        try:
            with open(os.path.join(SEITEN, n + ".md"), encoding="utf-8") as fh:
                return fh.read()
        except OSError:
            return ""
    return {"app": app, "text": lies(app) if app else "", "allgemein": lies("allgemein")}


def merken(c, uid, ids):
    g = _gesehen(c, uid) or set()
    bekannt = {x["id"] for x in laden()}
    g |= {str(i) for i in ids if str(i) in bekannt}
    g &= bekannt   # nur Einträge, die es noch gibt
    konto._put(c, f"neu:{uid}", json.dumps(sorted(g)), "neuigkeiten")
    return len(g)
