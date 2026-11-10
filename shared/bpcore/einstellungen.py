"""Zentrale Einstellungen der Plattform (Tabelle settings: Schlüssel → Text) – ein Baustein für alle Apps.

Firma, Ablage, Mailserver, Datensicherung … Gelesen und geändert wird hier, nicht mehr über das Bautagebuch.
Kennwörter verlassen den Server nie: an den Browser geht nur „<schlüssel>_set“ (gesetzt ja/nein).
"""
import re

KEY = re.compile(r"^[a-z][a-z0-9_]{0,39}$")
SECRETS = ("store_pass", "mail_pass", "m365_secret")


def alle(c):
    return {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings")}


def setzen(c, key, value):
    c.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, value))


def fuer_browser(c, admin):
    """Einstellungen für die Anzeige: ohne Kennwörter; normale Benutzer sehen nur die Firmendaten."""
    conf = alle(c)
    for k in SECRETS:
        conf[k + "_set"] = bool(conf.pop(k, ""))
    if not admin:
        conf = {k: v for k, v in conf.items() if k == "office_name" or k.startswith("co_")}
    return conf


def aendern(c, werte, wer):
    """Geänderte Einstellungen speichern (mit Eintrag im Versionsverlauf). Leeres Kennwortfeld = unverändert lassen,
    „<kennwort>_clear“ löscht es; unbekannte Formen werden übergangen."""
    from . import versionen
    with versionen.aenderung(c, "einst:bt", wer):
        for k, v in (werte or {}).items():
            if k.endswith("_clear") and k[:-6] in SECRETS:
                setzen(c, k[:-6], "")
            elif k.endswith("_set") or not (KEY.match(k) and isinstance(v, str)):
                continue
            elif k in SECRETS and not v:
                continue
            else:
                setzen(c, k, v[:500])
