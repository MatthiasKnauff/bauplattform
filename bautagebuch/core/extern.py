"""Sicherung außerhalb des Servers und Wiederherstellung nach einem Ausfall.

1. Kopie der Datenbanksicherung auf den Dateiserver (Einstellung „backup_remote“, z. B. \\\\192.168.233.88\\Projekte\\Bauportal):
   Datenbank/bau-….dump (die letzten 30), Logo/, LIESMICH.txt. Zugangsdaten wie bei der Ablage (store_user/-pass/-domain).
   Nach jeder täglichen und jeder manuellen Sicherung automatisch.
2. Fotos: Jedes Foto liegt nach der Übertragung auch im Projektordner auf dem Server (images.sent_remote). Fehlt die Datei
   im Datenordner (neuer Server, Volume verloren), holt die App sie von dort zurück – beim Start automatisch und per Knopf.
"""
import json, os, re, threading, time
from datetime import datetime

from . import backups, db, remote, settings, storage
from bpcore import fehler   # stille Fehler für die Verwaltung festhalten

KEEP = 30
_foto = {"laeuft": False, "geholt": 0, "fehler": 0, "offen": 0, "meldung": "", "zeit": ""}
_lock = threading.Lock()

LIESMICH = """Bauplattform – Sicherung außerhalb des Servers
==============================================

Datenbank/   tägliche Sicherungen der Datenbank (alle Apps), die letzten {keep}
Logo/        Büro-Logo

Nach einem Ausfall des Servers:
1. Bauplattform neu installieren (README → Installation) und als Administrator anmelden.
2. Verwaltung → Einstellungen → Ablage: Zugang zum Dateiserver eintragen.
3. Verwaltung → Einstellungen → Datensicherung: bei „Sicherung auf dem Dateiserver“ den Pfad eintragen,
   die neueste Sicherung „Zurückholen“ und dann „Wiederherstellen“.
4. Die Fotos holt die App danach selbst aus den Projektordnern zurück (Fortschritt unter Datensicherung).

Stand dieser Datei: {stand}
"""


def _unc(path):
    """\\\\server\\freigabe\\ordner\\… → (server, freigabe, ordner/…)"""
    p = (path or "").strip().replace("/", "\\")
    m = re.match(r"^\\\\([^\\]+)\\([^\\]+)\\?(.*)$", p)
    return (m.group(1), m.group(2), m.group(3).replace("\\", "/").strip("/")) if m else None


def ziel(conf):
    """Ziel der externen Sicherung oder None (nicht eingerichtet)."""
    path = (conf.get("backup_remote") or "").strip()
    if not path:
        return None
    u = _unc(path)
    if u:
        return remote.Smb(u[0], u[1], u[2], conf.get("store_user", ""), conf.get("store_pass", ""), conf.get("store_domain", ""))
    if path.startswith("/"):
        return remote.Folder(path)
    raise ValueError("Bitte den Pfad als \\\\Server\\Freigabe\\Ordner eintragen.")


def _status(c, **kw):
    cur = _j(settings.all(c).get("backup_remote_status"), {})
    cur.update(kw)
    settings.put(c, "backup_remote_status", json.dumps(cur, ensure_ascii=False))


def _j(s, d):
    try:
        v = json.loads(s or "")
        return v if isinstance(v, dict) else d
    except ValueError:
        return d


def kopieren(name=None):
    """Neueste (oder genannte) Sicherung, Logo und LIESMICH auf den Dateiserver. Gibt (ok, Meldung) zurück."""
    with db.tx() as c:
        conf = settings.all(c)
    try:
        t = ziel(conf)
        if not t:
            return False, "Kein Pfad für die Sicherung auf dem Dateiserver eingetragen."
        items = backups.listing()
        if name:
            items = [x for x in items if x["name"] == name]
        if not items:
            return False, "Keine Sicherung vorhanden."
        x = items[0]
        t.put(backups.path_of(x["name"]), "Datenbank/" + x["name"])
        lp = storage.logo_path()
        if lp:
            t.put(lp, "Logo/" + os.path.basename(lp))
        t.put_bytes(LIESMICH.format(keep=KEEP, stand=datetime.now().strftime("%d.%m.%Y %H:%M")).encode("utf-8"), "LIESMICH.txt")
        alt = sorted(e["name"] for e in t.listdir("Datenbank") if not e["dir"] and backups.NAME.match(e["name"]))
        for n in alt[:-KEEP]:
            try:
                t.delete("Datenbank/" + n, False)
            except Exception as e:
                fehler.still("bautagebuch", "Dateiserver: alte Datenbanksicherung löschen", e)
                pass
        with db.tx() as c:
            _status(c, ok=True, zeit=datetime.now().isoformat(timespec="seconds"), datei=x["name"], fehler="")
        return True, f"{x['name']} auf den Dateiserver kopiert."
    except Exception as e:
        msg = _msg(e)
        with db.tx() as c:
            _status(c, ok=False, zeit=datetime.now().isoformat(timespec="seconds"), fehler=msg)
        return False, msg


def kopieren_bald(name=None):
    threading.Thread(target=kopieren, args=(name,), daemon=True).start()


def liste():
    with db.tx() as c:
        conf = settings.all(c)
    t = ziel(conf)
    if not t:
        return []
    out = []
    for e in t.listdir("Datenbank"):
        m = backups.NAME.match(e["name"])
        if m and not e["dir"]:
            out.append({"name": e["name"], "kind": m.group(3), "size": e["size"],
                        "created": datetime.strptime(m.group(1) + m.group(2), "%Y%m%d%H%M%S").isoformat(sep=" ")})
    return sorted(out, key=lambda x: x["name"], reverse=True)


def holen(name):
    """Sicherung vom Dateiserver in den Datenordner holen (danach normal wiederherstellen)."""
    if not backups.NAME.match(name or ""):
        raise ValueError("Ungültiger Name.")
    with db.tx() as c:
        conf = settings.all(c)
    t = ziel(conf)
    if not t:
        raise ValueError("Kein Pfad für die Sicherung auf dem Dateiserver eingetragen.")
    data = t.read("Datenbank/" + name)
    dst = os.path.join(backups.folder(), name)
    with open(dst + ".part", "wb") as f:
        f.write(data)
    os.replace(dst + ".part", dst)
    return name


# ---------------------------------------------------------------- Fotos und Logo zurückholen
def fotos_zaehlen():
    with db.tx() as c:
        rows = c.execute("SELECT file, sent_remote FROM images").fetchall()
    fehlt = [r for r in rows if r["file"] and not os.path.exists(os.path.join(storage.UP, r["file"]))]
    return {"gesamt": len(rows), "fehlen": len(fehlt), "holbar": sum(1 for r in fehlt if r["sent_remote"]),
            "nicht_holbar": sum(1 for r in fehlt if not r["sent_remote"])}


def fotos_holen(limit_s=3600):
    """Fehlende Fotos aus den Projektordnern auf dem Dateiserver zurückholen (läuft im Hintergrund)."""
    with _lock:
        if _foto["laeuft"]:
            return False
        _foto.update(laeuft=True, geholt=0, fehler=0, meldung="", zeit=datetime.now().isoformat(timespec="seconds"))

    def run():
        import fcntl
        t0 = time.time()
        lk = open(os.path.join(db.DATA, ".fotos.lock"), "w")
        try:
            fcntl.flock(lk, fcntl.LOCK_EX | fcntl.LOCK_NB)   # nur ein Prozess holt
        except OSError:
            _foto["laeuft"] = False
            lk.close()
            return
        try:
            with db.tx() as c:
                conf = settings.all(c)
                rows = c.execute("SELECT id, file, sent_remote FROM images WHERE sent_remote<>'' ORDER BY id").fetchall()
            fehlt = [r for r in rows if r["file"] and not os.path.exists(os.path.join(storage.UP, r["file"]))]
            _foto["offen"] = len(fehlt)
            t = remote.open_target(conf) if fehlt else None
            for r in fehlt:
                if time.time() - t0 > limit_s:
                    _foto["meldung"] = "Zeitlimit – der Rest folgt beim nächsten Durchlauf."
                    break
                try:
                    data = t.read(r["sent_remote"])
                    dst = os.path.join(storage.UP, r["file"])
                    os.makedirs(os.path.dirname(dst), exist_ok=True)
                    with open(dst + ".part", "wb") as f:
                        f.write(data)
                    os.replace(dst + ".part", dst)
                    _foto["geholt"] += 1
                except Exception:
                    _foto["fehler"] += 1
                _foto["offen"] -= 1
            if not _foto["meldung"]:
                _foto["meldung"] = f"{_foto['geholt']} Fotos zurückgeholt" + (f", {_foto['fehler']} nicht gefunden" if _foto["fehler"] else "") + "."
        except Exception as e:
            fehler.still("bautagebuch", "Fotos vom Dateiserver zurückholen", e)
            _foto["meldung"] = "Fehler: " + _msg(e)
        finally:
            _foto["laeuft"] = False
            lk.close()
    threading.Thread(target=run, daemon=True).start()
    return True


def logo_holen():
    if storage.logo_path():
        return
    with db.tx() as c:
        conf = settings.all(c)
    t = ziel(conf)
    if not t:
        return
    for e in t.listdir("Logo"):
        ext = os.path.splitext(e["name"])[1].lower()
        if not e["dir"] and ext in storage.LOGO_EXT:
            with open(os.path.join(storage.BRAND, "logo" + ext), "wb") as f:
                f.write(t.read("Logo/" + e["name"]))
            return


def status():
    with db.tx() as c:
        conf = settings.all(c)
    return {"pfad": conf.get("backup_remote", ""), "letzte": _j(conf.get("backup_remote_status"), {}),
            "fotos": fotos_zaehlen(), "holen": dict(_foto), "ablage": conf.get("store_mode", "off") != "off"}


def start():
    """Beim Start: fehlende Fotos und Logo automatisch vom Dateiserver holen (z. B. nach einem neuen Server)."""
    def run():
        time.sleep(90)
        try:
            logo_holen()
        except Exception as e:
            fehler.still("bautagebuch", "Logo vom Dateiserver holen (beim Start)", e)
            pass
        try:
            if fotos_zaehlen()["holbar"]:
                fotos_holen()
        except Exception as e:
            fehler.still("bautagebuch", "Fotos vom Dateiserver holen (beim Start)", e)
            pass
    threading.Thread(target=run, daemon=True).start()


def _msg(e):
    from . import sync
    return sync._msg(e)
