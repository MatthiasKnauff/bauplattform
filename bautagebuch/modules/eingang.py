"""Eingangsordner auf dem Server (z. B. \\\\server\\Projekte\\Eingang) für die AVA.

Dort landen Scans vom Kopierer, Angebote, Rechnungen … Die AVA schaut nach, wenn man hineinwechselt, und fragt in
einem kleinen Fenster, welche Dateien verarbeitet werden sollen (wie beim Hineinziehen). Verarbeitete Dateien
wandern in den Unterordner „verarbeitet“ (nichts wird gelöscht).

GET  /api/eingang                  Dateien (neueste oben): name, size, mtime
GET  /api/eingang/datei?name=…     Inhalt (Base64)
POST /api/eingang/erledigt {name}  nach „verarbeitet/“ verschieben
Einstellung: eingang_unc (Verwaltung → Einstellungen → Ablage); Zugangsdaten wie die Ablage.
"""
import base64, re
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


@bp.get("/api/eingang")
def liste():
    t, err = _ziel()
    if err == "aus":
        return jsonify(ok=True, aus=True, dateien=[])
    if err:
        return jsonify(ok=False, error=err, dateien=[])
    try:
        L = [x for x in t.listdir("") if not x["dir"] and x["name"].lower().endswith(ENDUNGEN) and not x["name"].startswith(("~", "."))]
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
    return jsonify(ok=True, ziel=f"{FERTIG}/{ziel}")
