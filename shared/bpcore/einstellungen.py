"""Zentrale Einstellungen der Plattform (Tabelle settings: Schlüssel → Text) – ein Baustein für alle Apps.

Firma, Ablage, Mailserver, Datensicherung … Gelesen und geändert wird hier, nicht mehr über das Bautagebuch.
Kennwörter verlassen den Server nie: an den Browser geht nur „<schlüssel>_set“ (gesetzt ja/nein).
"""
import re

KEY = re.compile(r"^[a-z][a-z0-9_]{0,39}$")
SECRETS = ("store_pass", "mail_pass", "m365_secret")
# Zugänge (Block „zugaenge“ der Rollen): Server, Benutzer, Postfach – dazu die Kennwörter, die niemand sieht
ZUGANG = ("mail_host", "mail_port", "mail_user", "mail_from", "m365_client", "m365_tenant",
          "store_server", "store_share", "store_domain", "store_user", "store_path", "store_dir") + SECRETS


def alle(c):
    return {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings")}


def setzen(c, key, value):
    c.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, value))


ABLAGE = ("store_tpl_photos", "store_folder_desc", "store_tpl_pdf", "store_old_mode", "store_keep_old_photos", "store_keep_old_pdf", "pdf_name_tpl",
          "eingang_unc", "allplan_unc")


def block_von(k):
    """Block der Verwaltung (rechte.BLOECKE) zu einer Einstellung; „“ = alles Übrige – nur Administrator."""
    if k == "office_name" or k.startswith("co_") or k in ("modus_standard", "ui_karte"):
        return "buero"
    return "ablage" if k in ABLAGE else "zugaenge" if k in ZUGANG else ""


def fuer_browser(c, admin, bloecke=()):
    """Einstellungen für die Anzeige: ohne Kennwörter. Ohne Verwaltungsrecht nur die Firmendaten und die Felder der Blöcke,
    die die Rolle sehen darf (bloecke) – Zugänge (Server, Benutzer, Postfach …) nie."""
    conf = alle(c)
    for k in SECRETS:
        conf[k + "_set"] = bool(conf.pop(k, ""))
    if not admin:
        conf = {k: v for k, v in conf.items() if k == "office_name" or k.startswith("co_") or (block_von(k[:-4] if k.endswith("_set") else k) in bloecke)
                or (k == "store_mode" and "ablage" in bloecke)}   # ob abgelegt wird, sieht die Ablage mit; ändern nur Administrator
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
