"""Eingangsordner auf dem Server (z. B. \\\\server\\Projekte\\Eingang) für die AVA.

Dort landen Scans vom Kopierer, Angebote, Rechnungen … Die AVA schaut nach, wenn man hineinwechselt, und fragt in
einem kleinen Fenster, welche Dateien verarbeitet werden sollen (wie beim Hineinziehen). Verarbeitete Dateien
wandern in den Unterordner „verarbeitet“ (nichts wird gelöscht).

GET  /api/eingang                  Dateien (neueste oben): name, size, mtime
GET  /api/eingang/datei?name=…     Inhalt (Base64)
POST /api/eingang/erledigt {name}  nach „verarbeitet/“ verschieben
Einstellung: eingang_unc (Verwaltung → Einstellungen → Ablage); Zugangsdaten wie die Ablage.
"""
import base64, json, re, threading, time
from datetime import datetime
from flask import Blueprint, g, jsonify, request
from core import db, remote, settings, sync

bp = Blueprint("eingang", __name__)
ENDUNGEN = (".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".heic", ".docx", ".xlsx", ".xlsm", ".x81", ".x82", ".x83", ".x84", ".x85",
            ".x86", ".d83", ".d84", ".p83", ".p84", ".xml")
FERTIG = "verarbeitet"


def _ziel():
    """(Ziel, Fehlertext) – Eingangsordner als SMB-Freigabe (Zugangsdaten der Ablage) oder Ordner im Container."""
    with db.tx() as c:
        conf = settings.all(c)
    unc = (conf.get("eingang_unc") or "").strip()   # leer = aus (kein fest eingebauter Server mehr)
    if not unc and (conf.get("portal_unc") or "").strip():   # Freigabe „Bauportal“ eingerichtet: deren Ordner „01 Eingang“
        unc = conf["portal_unc"].strip().rstrip("\\/") + "\\01 Eingang"
    if unc in ("", "-", "aus"):
        return None, "aus"
    try:
        if unc.startswith(("\\\\", "//")):
            teile = [t for t in re.split(r"[\\/]+", unc) if t]
            if len(teile) < 2:
                return None, "Eingangsordner: bitte als \\\\Server\\Freigabe\\Ordner angeben."
            if not conf.get("store_user"):
                return None, "Für den Eingangsordner fehlen die Zugangsdaten (Verwaltung → Einstellungen → Ablage)."
            return remote.Smb(teile[0], teile[1], "/".join(teile[2:]), conf.get("store_user", ""), conf.get("store_pass", ""),
                              conf.get("store_domain", "")), ""
        return remote.Folder(unc), ""
    except ImportError:
        return None, "Das Paket für Windows-Freigaben (smbprotocol) fehlt im Container."
    except Exception as e:
        return None, sync._msg(e)


def _name(n):
    n = remote.clean(n or "")
    if not n or "/" in n or "\\" in n or n.startswith("."):
        raise ValueError("Ungültiger Dateiname")
    return n


def _dateien(t):
    return [x for x in t.listdir("") if not x["dir"] and x["name"].lower().endswith(ENDUNGEN) and not x["name"].startswith(("~", "."))]


def zaehlen():
    """Wie viele Dateien liegen im Eingang? → bp_store „eingang:stand“ {n, neueste, zeit}. Die Kopfleiste aller Apps liest nur diesen Stand
    (keine eigene Abfrage beim Öffnen) und zeigt dann das Fenster „Eingang“ (bp/eingang.js)."""
    t, err = _ziel()
    if err == "aus":
        st = {"n": 0, "neueste": "", "aus": True}
    elif err:
        return None
    else:
        try:
            L = _dateien(t)
        except Exception:   # noqa: BLE001 – Server gerade nicht erreichbar: alter Stand bleibt
            return None
        st = {"n": len(L), "neueste": datetime.fromtimestamp(max((x.get("mtime") or 0) for x in L)).isoformat(timespec="minutes") if L else ""}
    st["zeit"] = datetime.now().isoformat(timespec="seconds")
    with db.tx() as c:
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES('eingang:stand',?,?,'dienste') ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated",
                  (json.dumps(st), st["zeit"]))
    return st


_gestartet = False


def start(abstand=180):
    """Dienste: alle 3 Minuten den Eingang zählen."""
    global _gestartet
    if _gestartet:
        return
    _gestartet = True

    def schleife():
        while True:
            try:
                zaehlen()
            except Exception as e:   # noqa: BLE001 – nächste Runde
                from bpcore import fehler
                fehler.still("dienste", "Eingang zählen", e)
            time.sleep(abstand)
    threading.Thread(target=schleife, daemon=True, name="eingang").start()


@bp.get("/api/eingang")
def liste():
    t, err = _ziel()
    if err == "aus":
        return jsonify(ok=True, aus=True, dateien=[])
    if err:
        return jsonify(ok=False, error=err, dateien=[])
    try:
        L = _dateien(t)
    except Exception as e:
        return jsonify(ok=False, error=f"Eingangsordner nicht erreichbar: {sync._msg(e)}", dateien=[])
    L.sort(key=lambda x: -(x.get("mtime") or 0))
    return jsonify(ok=True, dateien=[{"name": x["name"], "size": x["size"],
                                      "mtime": datetime.fromtimestamp(x["mtime"]).isoformat(timespec="minutes") if x.get("mtime") else ""} for x in L[:200]])


@bp.get("/api/eingang/datei")
def datei():
    t, err = _ziel()
    if err:
        return jsonify(error=err), 400
    try:
        n = _name(request.args.get("name"))
        d = t.read(n, 80 * 1024 * 1024 + 1)
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except Exception as e:
        return jsonify(error=f"Datei nicht lesbar: {sync._msg(e)}"), 502
    if len(d) > 80 * 1024 * 1024:
        return jsonify(error="Datei zu groß (höchstens 80 MB)."), 400
    return jsonify(name=n, datei=base64.b64encode(d).decode())


@bp.post("/api/eingang/erledigt")
def erledigt():
    """Datei nach „verarbeitet/“ verschieben (gleicher Name dort: mit Nummer)."""
    t, err = _ziel()
    if err:
        return jsonify(error=err), 400
    try:
        n = _name((request.get_json(silent=True) or {}).get("name"))
        stamm, punkt, endung = n.rpartition(".")
        ziel, k = n, 1
        while t.exists(f"{FERTIG}/{ziel}") and k < 100:
            k += 1
            ziel = f"{stamm} ({k}).{endung}" if punkt else f"{n} ({k})"
        t.rename(n, f"{FERTIG}/{ziel}")
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except Exception as e:
        return jsonify(error=f"Verschieben nicht möglich: {sync._msg(e)}"), 502
    from core import audit
    with db.tx() as c:
        audit.log(c, g.user["name"], "export", "Eingang verarbeitet", f"{n} → {FERTIG}/{ziel}", None, "", "")
    try:
        zaehlen()   # Kopfleiste gleich aktuell
    except Exception:   # noqa: BLE001
        pass
    return jsonify(ok=True, ziel=f"{FERTIG}/{ziel}")
