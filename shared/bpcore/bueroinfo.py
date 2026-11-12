"""Büroinfos, die mehrere Apps brauchen: Bundesland und Name der Plattform (Verwaltung → Büro).

Nichts davon steht fest im Programm – jede Installation trägt ihre Werte in der Verwaltung ein.
"""
from .feiertage import LAENDER

NAME = "Bauportal"   # Vorgabe, solange in der Verwaltung kein eigener Name steht


def _wert(c, key):
    r = c.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return ((r["value"] if r else "") or "").strip()


def land(c):
    """Bundesland des Büros (Kürzel wie NW); ohne Eintrag „DE“ = nur bundesweite Feiertage."""
    v = _wert(c, "co_land").upper()
    return v if v in LAENDER else "DE"


def land_oder(c, vorgabe="NW"):
    """Bundesland des Büros für Dinge, die ein echtes Land brauchen (Bauantrag-Vordrucke); ohne Eintrag die Vorgabe."""
    v = land(c)
    return v if v in LAENDER else vorgabe


def name(c):
    """Name der Plattform im Kopf, auf der Anmeldung und als App-Name."""
    return _wert(c, "plattform_name")[:40] or NAME
