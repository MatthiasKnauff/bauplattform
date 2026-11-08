"""Allplan-Bürostandard auf dem Dateiserver (z. B. \\\\192.168.233.88\\Allplan\\Daten) – Kataloge finden, lesen und später schreiben.

Zuerst zum Kennenlernen der Formate: die Katalogdateien des Bürostandards (std) als ZIP – Elementkatalog nem_ele, Positionskatalog
nem_pos, Kundenkataloge, Smart Catalog (XML Catalog Data), Attributdefinitionen (xml) und die Katalog-Datenbank (*.db3).

GET /api/allplan/suche          → {std: Pfad, dateien: [{pfad, size}], ...}   (nur Verwaltung)
GET /api/allplan/paket          → {name, datei: Base64-ZIP}
Einstellung: allplan_unc (Verwaltung → Einstellungen), Zugangsdaten wie die Ablage.
"""
import base64
import io
import re
import zipfile
from flask import Blueprint, g, jsonify, request
from core import db, remote, settings, sync

bp = Blueprint("allplan", __name__)
STANDARD = r"\\192.168.233.88\Allplan\Daten"
MAX_ZIP = 40 * 1024 * 1024
ORDNER = ("nem_ele", "nem_pos", "xml", "xml catalog data", "kukat1", "kukat2", "kukat3", "kukat4", "kukat5", "catalog", "kataloge", "katalog")
ENDUNG = (".kat", ".ktm", ".ktx", ".db3", ".xml", ".dat", ".csv", ".txt", ".ini", ".sqlite", ".dbf", ".cdx", ".fpt")


def _ziel(unc=None):
    with db.tx() as c:
        conf = settings.all(c)
    unc = (unc or conf.get("allplan_unc") or STANDARD).strip()
    teile = [t for t in re.split(r"[\\/]+", unc) if t]
    if not unc.startswith(("\\\\", "//")):
        return remote.Folder(unc), unc, ""
    if len(teile) < 2:
        return None, unc, "Allplan-Pfad bitte als \\\\Server\\Freigabe\\Ordner angeben."
    if not conf.get("store_user"):
        return None, unc, "Für den Dateiserver fehlen die Zugangsdaten (Verwaltung → Einstellungen → Ablage)."
    try:
        return remote.Smb(teile[0], teile[1], "/".join(teile[2:]), conf.get("store_user", ""), conf.get("store_pass", ""),
                          conf.get("store_domain", "")), unc, ""
    except ImportError:
        return None, unc, "Das Paket für Windows-Freigaben (smbprotocol) fehlt im Container."


def _std(t):
    """Bürostandard-Ordner finden: „std“ direkt darunter oder bis zwei Ebenen tiefer (erkennbar an nem_ele bzw. xml)."""
    def ist_std(rel):
        namen = {x["name"].lower() for x in t.listdir(rel) if x["dir"]}
        return bool(namen & {"nem_ele", "nem_pos"}) or {"xml", "symbole"} <= namen or {"xml", "library"} <= namen
    oben = t.listdir("")
    kand = [x["name"] for x in oben if x["dir"] and x["name"].lower() == "std"] + [x["name"] for x in oben if x["dir"] and x["name"].lower() != "std"]
    if ist_std(""):
        return ""
    for n in kand[:40]:
        if n.lower() == "std" and ist_std(n):
            return n
    for n in kand[:40]:
        try:
            for y in t.listdir(n):
                if y["dir"] and y["name"].lower() == "std" and ist_std(f"{n}/{y['name']}"):
                    return f"{n}/{y['name']}"
        except Exception:
            continue
    return None


def _dateien(t, std):
    out = []
    for x in t.listdir(std):
        p = f"{std}/{x['name']}" if std else x["name"]
        if not x["dir"] and x["name"].lower().endswith(ENDUNG):
            out.append({"pfad": p, "size": x["size"]})
        elif x["dir"] and x["name"].lower() in ORDNER:
            for y in t.listdir(p):
                if not y["dir"]:
                    out.append({"pfad": f"{p}/{y['name']}", "size": y["size"]})
                elif x["name"].lower() == "xml":   # Unterordner von xml (z. B. Smart Catalog) eine Ebene tiefer
                    for z in t.listdir(f"{p}/{y['name']}"):
                        if not z["dir"]:
                            out.append({"pfad": f"{p}/{y['name']}/{z['name']}", "size": z["size"]})
    return out


def _admin():
    u = g.get("user")
    try:
        return bool(u and u["is_admin"])
    except (KeyError, TypeError):
        return False


@bp.get("/api/allplan/suche")
def suche():
    if not _admin():
        return jsonify(error="Nur für die Verwaltung."), 403
    t, unc, err = _ziel(request.args.get("unc"))
    if err:
        return jsonify(ok=False, error=err), 400
    try:
        std = _std(t)
        if std is None:
            return jsonify(ok=False, unc=unc, error=f"Unter {unc} wurde kein Allplan-Bürostandard (Ordner std mit nem_ele/xml) gefunden.",
                           ordner=[x["name"] for x in t.listdir("") if x["dir"]][:60])
        D = _dateien(t, std)
    except Exception as e:
        return jsonify(ok=False, unc=unc, error=f"Allplan-Ordner nicht erreichbar: {sync._msg(e)}"), 502
    return jsonify(ok=True, unc=unc, std=std, dateien=D, summe=sum(x["size"] for x in D))


@bp.get("/api/allplan/paket")
def paket():
    if not _admin():
        return jsonify(error="Nur für die Verwaltung."), 403
    t, unc, err = _ziel(request.args.get("unc"))
    if err:
        return jsonify(error=err), 400
    try:
        std = _std(t)
        if std is None:
            return jsonify(error=f"Unter {unc} wurde kein Allplan-Bürostandard gefunden."), 404
        D = sorted(_dateien(t, std), key=lambda x: (x["size"] > 5 * 1024 * 1024, x["pfad"]))   # große Dateien zuletzt
        buf, summe, weg = io.BytesIO(), 0, []
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            for x in D:
                if summe + x["size"] > MAX_ZIP:
                    weg.append(x["pfad"])
                    continue
                try:
                    z.writestr(x["pfad"], t.read(x["pfad"]))
                    summe += x["size"]
                except Exception as e:
                    weg.append(f"{x['pfad']} ({sync._msg(e)})")
            z.writestr("_inhalt.txt", f"Allplan-Bürostandard {unc}\\{std}\n{len(D) - len(weg)} Dateien\n" + ("Nicht enthalten:\n" + "\n".join(weg) if weg else ""))
    except Exception as e:
        return jsonify(error=f"Allplan-Ordner nicht lesbar: {sync._msg(e)}"), 502
    from core import audit
    with db.tx() as c:
        audit.log(c, g.user["name"], "export", "Allplan-Bürostandard gelesen", f"{unc} · {len(D) - len(weg)} Dateien", None, "", "")
    return jsonify(name="allplan-std-kataloge.zip", datei=base64.b64encode(buf.getvalue()).decode(), dateien=len(D) - len(weg), weg=weg)
