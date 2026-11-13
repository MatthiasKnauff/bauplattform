"""Freigabe „Bauportal“ auf dem Dateiserver – Platz für große Dateien, die in keinen Projektordner gehören.

Einstellung portal_unc (Verwaltung → Einstellungen → Ablage), z. B. \\\\server\\Bauportal; Zugangsdaten wie die Ablage.
Die Freigabe legt das Büro selbst an; die Plattform legt darin die Ordner unten an, jeweils mit einer LIESMICH.txt:

  01 Eingang    Scanner, Kopierer, Mails – die AVA fragt beim Hineinwechseln, was verarbeitet werden soll
  02 Wiki       Dateien des Wikis (in der Datenbank steht nur Text und ein kleines Vorschaubild)
  03 Kataloge   eigene und gekaufte Kataloge (lizenzierte Daten bleiben hier – nie im Repo)
  04 Vorlagen   Briefbogen, Druckvorlagen, Musterverträge
  05 Ausgabe    was die Plattform für andere erzeugt (Exporte, Pakete)
  06 Sicherung  Wiki für sich gesichert (Datenbankauszug, wiki.json, Notfallpaket) – das Wiki darf nie verloren gehen

Der Testserver (TESTSERVER=1) liest nur – Ordner anlegen und Sicherungen schreiben werden dort übersprungen.
"""
import io, json, os, tempfile, zipfile
from datetime import datetime

import bpcore
from . import db, extern, remote, settings
from bpcore import fehler

ORDNER = {
    "01 Eingang": "Hier legen Scanner, Kopierer oder Mail-Regeln Dateien ab (PDF, Bilder, GAEB, Excel …).\n"
                  "Wechselt jemand in „Ausschreibung & Abrechnung“, fragt ein kleines Fenster, welche Dateien verarbeitet werden sollen.\n"
                  "Erledigte Dateien wandern in den Unterordner „verarbeitet“ – gelöscht wird nichts.",
    "02 Wiki": "Dateien des Wikis (Bilder, PDFs, Pläne zu den Einträgen), je Kapitel ein Unterordner.\n"
               "In der Datenbank stehen nur der Text und ein kleines Vorschaubild. Bitte hier nichts umbenennen oder verschieben –\n"
               "die Einträge zeigen auf diese Dateien.",
    "03 Kataloge": "Kataloge für die Baudaten und die Ausschreibung (eigene Kataloge, gekaufte Kataloge wie sirAdos).\n"
                   "Lizenzierte Daten bleiben hier im Büro.",
    "04 Vorlagen": "Vorlagen des Büros: Briefbogen, Druck-Layouts, Musterverträge, Formulare.",
    "05 Ausgabe": "Was die Plattform für andere erzeugt: Exporte, LV-Pakete, Druckdateien zum Abholen.\n"
                  "Kann von Zeit zu Zeit aufgeräumt werden.",
    "06 Sicherung": "Das Wiki für sich gesichert – damit es nie verloren geht, auch wenn die Bauplattform einmal nicht läuft:\n\n"
                    "  Wiki/wiki-JJJJMMTT.dump     Datenbankauszug (nur die Tabellen des Wikis), die letzten 30\n"
                    "  Wiki/wiki.json              alle Einträge als lesbare Datei (mit Vorschaubildern)\n"
                    "  Wiki/wiki-notfallpaket.zip  kleines Programm zum Lesen des Wikis ohne Bauplattform (Docker oder Python)\n\n"
                    "Die Dateien zu den Einträgen liegen in „02 Wiki“.\n"
                    "Die tägliche Sicherung der ganzen Datenbank liegt dort, wo es unter Verwaltung → Datensicherung eingetragen ist.",
}
KEEP = 30
NOTFALL = os.path.join(os.path.dirname(os.path.abspath(bpcore.__file__)), "wiki_notfall")   # der kleine Wiki-Leser


def _conf():
    with db.tx() as c:
        return settings.all(c)


def ziel(conf=None):
    """Freigabe Bauportal als Ziel (Smb oder Ordner) oder None, wenn nicht eingetragen."""
    conf = conf if conf is not None else _conf()
    path = (conf.get("portal_unc") or "").strip()
    if not path:
        return None
    u = extern._unc(path)
    if u:
        return remote.Smb(u[0], u[1], u[2], conf.get("store_user", ""), conf.get("store_pass", ""), conf.get("store_domain", ""))
    if path.startswith("/"):
        return remote.Folder(path)
    raise ValueError("Bitte die Freigabe als \\\\Server\\Bauportal eintragen.")


def _liesmich(name, text):
    return (f"Bauportal – {name}\n{'=' * (11 + len(name))}\n\n{text}\n\n"
            f"Angelegt von der Bauplattform. Stand dieser Datei: {datetime.now():%d.%m.%Y}\n").replace("\n", "\r\n").encode("utf-8")


def stand():
    """Für die Verwaltung: welche Ordner es auf der Freigabe schon gibt."""
    conf = _conf()
    out = {"pfad": conf.get("portal_unc", ""), "nur_lesen": remote.NUR_LESEN, "ordner": [], "fehler": "",
           "wiki": json.loads(conf.get("wiki_sicherung_status") or "{}")}
    try:
        t = ziel(conf)
        if t:
            da = {e["name"] for e in t.listdir("") if e["dir"]}
            out["ordner"] = [{"name": n, "da": n in da} for n in ORDNER]
    except Exception as e:   # noqa: BLE001 – Fehler als Text für die Verwaltung
        out["fehler"] = extern._msg(e)
    return out


def einrichten():
    """Ordner 01–06 mit LIESMICH.txt anlegen (vorhandene bleiben unberührt). Gibt (ok, Meldung) zurück."""
    if remote.NUR_LESEN:
        return False, "Testserver: die Freigabe wird hier nur gelesen – Ordner werden auf der Produktion angelegt."
    t = ziel()
    if not t:
        return False, "Keine Freigabe „Bauportal“ eingetragen."
    neu = 0
    for name, text in ORDNER.items():
        if not t.exists(name):
            t.mkdir(name)
            neu += 1
        if not t.exists(name + "/LIESMICH.txt"):
            t.put_bytes(_liesmich(name, text), name + "/LIESMICH.txt")
    return True, f"{neu} Ordner angelegt." if neu else "Alle Ordner waren schon da – fehlende LIESMICH ergänzt."


# ---------------------------------------------------------------- Wiki für sich sichern
def wiki_json(c):
    """Alle Einträge (ohne gelöschte) mit Dateiverweisen und Vorschaubildern – lesbar ohne Datenbank."""
    import base64
    rows = c.execute("SELECT id, kapitel, titel, text, stichworte, quelle, projekt_id, status, created, updated "
                     "FROM wiki_eintrag WHERE deleted='' ORDER BY kapitel, titel").fetchall()
    dat = {}
    for d in c.execute("SELECT id, eintrag, name, pfad, mime, groesse, vorschau FROM wiki_datei ORDER BY id").fetchall():
        v = bytes(d["vorschau"]) if d["vorschau"] else b""
        dat.setdefault(d["eintrag"], []).append({"name": d["name"], "pfad": d["pfad"], "mime": d["mime"], "groesse": d["groesse"],
                                                 "vorschau": "data:image/jpeg;base64," + base64.b64encode(v).decode() if v else ""})
    return {"stand": datetime.now().isoformat(timespec="seconds"), "ordner": "02 Wiki",
            "eintraege": [dict(r) | {"dateien": dat.get(r["id"], [])} for r in rows]}


def notfallpaket():
    """ZIP mit dem kleinen Wiki-Leser (Dockerfile, wiki_lesen.py, LIESMICH) – Bytes."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for n in sorted(os.listdir(NOTFALL)):
            p = os.path.join(NOTFALL, n)
            if os.path.isfile(p) and not n.startswith(".") and not n.endswith(".pyc"):
                z.write(p, "wiki-notfall/" + n)
    return buf.getvalue()


def wiki_sichern():
    """Datenbankauszug des Wikis, wiki.json und Notfallpaket nach „06 Sicherung/Wiki“. Gibt (ok, Meldung) zurück."""
    from bpcore import schema
    if remote.NUR_LESEN:
        return False, "Testserver: keine Sicherung auf die Freigabe."
    try:
        t = ziel()
        if not t:
            return False, "Keine Freigabe „Bauportal“ eingetragen."
        name = f"wiki-{datetime.now():%Y%m%d}.dump"
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, name)
            schema.dump_tabellen(p, "wiki_*")
            t.put(p, "06 Sicherung/Wiki/" + name)
        with db.tx() as c:
            daten = wiki_json(c)
        t.put_bytes(json.dumps(daten, ensure_ascii=False, indent=1).encode("utf-8"), "06 Sicherung/Wiki/wiki.json")
        t.put_bytes(notfallpaket(), "06 Sicherung/Wiki/wiki-notfallpaket.zip")
        alt = sorted(e["name"] for e in t.listdir("06 Sicherung/Wiki") if not e["dir"] and e["name"].startswith("wiki-") and e["name"].endswith(".dump"))
        for n in alt[:-KEEP]:
            t.delete("06 Sicherung/Wiki/" + n, False)
        n = len(daten['eintraege'])
        ok, msg = True, f"Wiki gesichert ({n} {'Eintrag' if n == 1 else 'Einträge'})."
    except Exception as e:   # noqa: BLE001
        fehler.still("dienste", "Wiki auf die Freigabe Bauportal sichern", e)
        ok, msg = False, extern._msg(e)
    with db.tx() as c:
        settings.put(c, "wiki_sicherung_status", json.dumps({"ok": ok, "meldung": msg, "zeit": datetime.now().isoformat(timespec="seconds")},
                                                            ensure_ascii=False))
    return ok, msg
