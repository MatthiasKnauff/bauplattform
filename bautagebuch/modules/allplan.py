"""Bauteilkataloge der Bauplattform in den Allplan-Bürostandard schreiben (Dateiserver, Zugangsdaten der Ablage).

Das Bautagebuch kennt die Windows-Freigabe; Baudaten erzeugt die Kataloge und schickt sie hierher.
GET  /api/allplan/ziel          → {ok, unc, std, vorhanden: [...]}         gefundener Ordner std (mit nem_ele bzw. xml)
POST /api/allplan/uebertragen   {dateien: {"kukat1/KUKAT1.KAT": Base64, …}}
     Vorher je Datei sichern: vorhandene .bak → .bak2, aktuelle Datei → .bak (zwei Stände zurück).
Einstellung allplan_unc (Verwaltung → Einstellungen), Standard \\\\192.168.233.88\\Allplan – gesucht wird bis zwei Ebenen tief.
"""
import base64
import re
from flask import Blueprint, g, jsonify, request
from core import db, remote, settings, sync

bp = Blueprint("allplan", __name__)
STANDARD = r"\\192.168.233.88\Allplan"
ERLAUBT = re.compile(r"^kukat[1-5]/KUKAT[1-5]\.(KAT|KTX|KTM)$")   # nur die Kundenkataloge – sonst wird nichts geschrieben


def _admin():
    u = g.get("user")
    try:
        return bool(u and u["is_admin"])
    except (KeyError, TypeError):
        return False


def _ziel():
    with db.tx() as c:
        conf = settings.all(c)
    unc = (conf.get("allplan_unc") or STANDARD).strip()
    teile = [t for t in re.split(r"[\\/]+", unc) if t]
    if not unc.startswith(("\\\\", "//")):
        return remote.Folder(unc), unc, ""
    if len(teile) < 2:
        return None, unc, "Allplan-Pfad bitte als \\\\Server\\Freigabe angeben."
    if not conf.get("store_user"):
        return None, unc, "Für den Dateiserver fehlen die Zugangsdaten (Verwaltung → Einstellungen → Ablage)."
    try:
        return remote.Smb(teile[0], teile[1], "/".join(teile[2:]), conf.get("store_user", ""), conf.get("store_pass", ""),
                          conf.get("store_domain", "")), unc, ""
    except ImportError:
        return None, unc, "Das Paket für Windows-Freigaben (smbprotocol) fehlt im Container."


def _std(t):
    """Bürostandard finden: Ordner „std“ (erkennbar an nem_ele/nem_pos bzw. xml + Library) – direkt oder bis zwei Ebenen tiefer."""
    def ist_std(rel):
        n = {x["name"].lower() for x in t.listdir(rel) if x["dir"]}
        return bool(n & {"nem_ele", "nem_pos"}) or {"xml", "library"} <= n
    if ist_std(""):
        return ""
    oben = [x["name"] for x in t.listdir("") if x["dir"]]
    for n in sorted(oben, key=lambda x: x.lower() != "std")[:60]:
        if n.lower() == "std" and ist_std(n):
            return n
    for n in sorted(oben, key=lambda x: x.lower() not in ("daten", "data"))[:60]:
        try:
            for y in t.listdir(n):
                if y["dir"] and y["name"].lower() == "std" and ist_std(f"{n}/{y['name']}"):
                    return f"{n}/{y['name']}"
        except Exception:
            continue
    return None


@bp.get("/api/allplan/ziel")
def ziel():
    if not _admin():
        return jsonify(error="Nur für die Verwaltung."), 403
    t, unc, err = _ziel()
    if err:
        return jsonify(ok=False, error=err)
    try:
        std = _std(t)
        if std is None:
            return jsonify(ok=False, unc=unc, error=f"Unter {unc} wurde kein Allplan-Bürostandard (Ordner std mit nem_ele bzw. xml) gefunden – "
                                                    "Pfad unter Verwaltung → Einstellungen → „allplan_unc“ anpassen.")
        vorh = []
        for k in range(1, 6):
            for x in t.listdir(f"{std}/kukat{k}" if std else f"kukat{k}"):
                if not x["dir"]:
                    vorh.append(f"kukat{k}/{x['name']}")
    except Exception as e:
        return jsonify(ok=False, unc=unc, error=f"Allplan-Ordner nicht erreichbar: {sync._msg(e)}")
    return jsonify(ok=True, unc=unc, std=std, vorhanden=vorh)


@bp.post("/api/allplan/uebertragen")
def uebertragen():
    if not _admin():
        return jsonify(error="Nur für die Verwaltung."), 403
    D = (request.get_json(silent=True) or {}).get("dateien") or {}
    if not D or any(not ERLAUBT.match(k) for k in D):
        return jsonify(error="Ungültige Katalogdateien."), 400
    t, unc, err = _ziel()
    if err:
        return jsonify(error=err), 400
    try:
        std = _std(t)
        if std is None:
            return jsonify(error=f"Unter {unc} wurde kein Allplan-Bürostandard gefunden."), 404
        pfad = lambda rel: f"{std}/{rel}" if std else rel   # noqa: E731
        gesichert, geschrieben = 0, 0
        for rel, b64 in sorted(D.items()):
            p = pfad(rel)
            if t.exists(p):   # zwei Stände zurück: .bak2 ← .bak ← aktuelle Datei
                if t.exists(p + ".bak"):
                    if t.exists(p + ".bak2"):
                        t.delete(p + ".bak2", False)
                    t.rename(p + ".bak", p + ".bak2")
                t.rename(p, p + ".bak")
                gesichert += 1
            t.put_bytes(base64.b64decode(b64), p)
            geschrieben += 1
    except Exception as e:
        return jsonify(error=f"Übertragen nicht möglich: {sync._msg(e)}"), 502
    from core import audit
    with db.tx() as c:
        audit.log(c, g.user["name"], "export", "Allplan-Kataloge übertragen", f"{unc}\\{std} · {geschrieben} Dateien, {gesichert} gesichert", None, "", "")
    return jsonify(ok=True, unc=unc, std=std, geschrieben=geschrieben, gesichert=gesichert)
