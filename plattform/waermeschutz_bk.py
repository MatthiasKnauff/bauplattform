"""Wärmeschutz – Bauteile der Gebäudehülle aus den Baukosten übernehmen (IFC-Modell oder Raumbuch).

GET  /api/nachweise/<nid>/baukosten   Vorschläge: Außenwände, Fenster/Türen, Dach, Bodenplatte, Decken (Art wählen) – mit Fläche,
                                      Kostengruppe, Herkunft und – wo das Modell Schichten mitgibt – dem Aufbau (Baustoffe zugeordnet).
                                      Was schon im Nachweis steht (gleiche Herkunft „bk“), kommt als „angleichen“ mit beiden Flächen.
POST /api/nachweise/<nid>/baukosten   {neu: [{bk, typ}], angleichen: [bk]} → Nachweis wie PUT, mit „vorher“ für Rückgängig.
Die Baukosten bleiben unverändert; im Bauteil steht nur der Verweis „bk“ (Baukosten-Projekt:Zeile).
"""
import json
import re
import time

from flask import jsonify, request

from bpcore import db
from waermeschutz import _bauteil, _detail, _j, _nachweis, app

# Kostengruppe → Art im Nachweis ("" = bitte wählen)
KG_TYP = {"331": "wand", "332": "wand", "334": "fenster", "361": "steildach", "362": "steildach", "363": "steildach",
          "322": "bodenplatte", "324": "bodenplatte", "351": ""}
GRUPPE = {"wand": "Außenwände", "erdwand": "Außenwände", "fenster": "Fenster und Türen", "tuer": "Fenster und Türen",
          "steildach": "Dach", "flachdach": "Dach", "bodenplatte": "Gegen Erdreich", "": "Decken – Art wählen"}


def _typ(r):
    t = KG_TYP.get(str(r.get("kg") or ""))
    if t is None:
        return None
    n = f"{r.get('name') or ''} {r.get('mat') or ''}".lower()
    if t == "wand" and re.search(r"keller|erdreich|perimeter|\bug\b|untergeschoss", n):
        return "erdwand"
    if t == "fenster" and re.search(r"\btür|tuer|\btor\b", n):
        return "tuer"
    if t == "steildach" and re.search(r"flach|gründach|grundach|attika|warmdach|umkehrdach", n):
        return "flachdach"
    return t


_WORT = re.compile(r"[a-zäöüß]{3,}")


def _woerter(s):
    s = str(s or "").lower().replace("ae", "ä").replace("oe", "ö").replace("ue", "ü")
    return {w for w in _WORT.findall(s) if w not in ("und", "mit", "der", "die", "das", "für", "aus", "cm", "mm")}


def _baustoff(name, BS):
    """Material aus dem Modell → Baustoff der Datenbank (Wortgleichheit); sonst None."""
    w = _woerter(name)
    if not w:
        return None
    best, sc = None, 0.0
    for b in BS:
        bw = b["w"]
        if not bw:
            continue
        gl = len(w & bw) + 0.5 * sum(1 for x in w for y in bw if x != y and len(x) > 4 and (x in y or y in x))
        s = gl / (len(w | bw) ** 0.5)
        if s > sc:
            best, sc = b, s
    return best if sc >= 0.55 else None


def _schichten(lagen, BS):
    """IFC-Schichten [[Material, Dicke m]] → Schichten des Nachweises (innen → außen, Dicke in cm)."""
    S = []
    for n, d in lagen or []:
        if not d:
            continue
        b = _baustoff(n, BS)
        S.append({"m": b["k"], "d": round(d * 100, 1)} if b else {"m": "eigen", "d": round(d * 100, 1), "name": str(n)[:60] or "Schicht"})
    if len(S) > 1:   # Reihenfolge im Modell oft außen → innen: Putz/Bekleidung innen gehört nach vorn
        aussen = re.compile(r"wdvs|außen|aussen|fassade|klinker|verblend|dämm|daemm|abdicht|bitumen|substrat|kies")
        if aussen.search(str(lagen[0][0]).lower()) and not aussen.search(str(lagen[-1][0]).lower()):
            S.reverse()
    return S


def _vorschlaege(c, n):
    data = _j(n["data"], {}) or {}
    da = {str(b.get("bk")): b for b in data.get("bauteile") or [] if b.get("bk")}
    P = c.execute("SELECT id, name, data FROM bk_projects WHERE project_id=? AND archived=0 ORDER BY updated DESC", (n["project_id"],)).fetchall()
    BS = [{"k": r["schluessel"], "w": _woerter(r["name"])} for r in c.execute("SELECT schluessel, name FROM ws_baustoff WHERE aktiv").fetchall()]
    out = []
    for p in P[:3]:
        for r in (_j(p["data"], {}) or {}).get("bauteile") or []:
            t = _typ(r)
            if t is None or (r.get("einheit") or "m²") != "m²" and t not in ("fenster", "tuer"):
                continue
            bk = f"{p['id']}:{r.get('id')}"
            x = {"bk": bk, "kg": r.get("kg") or "", "name": r.get("name") or "", "mat": r.get("mat") or "", "herkunft": r.get("formel") or r.get("src") or "",
                 "flaeche": round(float(r.get("menge") or 0), 2) if (r.get("einheit") or "m²") == "m²" else None, "einheit": r.get("einheit") or "m²",
                 "typ": t, "gruppe": GRUPPE[t], "baukosten": p["name"], "uw": r.get("uw"), "schichten": _schichten(r.get("lagen"), BS) if t not in ("fenster", "tuer") else []}
            if bk in da:
                b = da[bk]
                if x["flaeche"] is None or abs((b.get("flaeche") or 0) - x["flaeche"]) < 0.05:
                    continue   # steht schon so im Nachweis
                x.update(da=b["id"], da_flaeche=b.get("flaeche"), da_name=b.get("name") or "")
            out.append(x)
    return out, [p["name"] for p in P[:3]]


@app.route("/api/nachweise/<int:nid>/baukosten", methods=["GET", "POST"])
def aus_baukosten(nid):
    with db.tx() as c:
        n = _nachweis(c, nid)
        if not n:
            return jsonify(error="Nachweis nicht gefunden."), 404
        V, bkp = _vorschlaege(c, n)
        if request.method == "GET":
            return jsonify(vorschlaege=V, baukosten=bkp)
        b = request.get_json(silent=True) or {}
        data = _j(n["data"], {}) or {}
        data.setdefault("grundlagen", {}); data.setdefault("bauteile", [])
        vorher = {"name": n["name"], "status": n["status"], "data": json.loads(json.dumps(data))}
        VB = {x["bk"]: x for x in V}
        neu = 0
        for w in (b.get("neu") or [])[:60]:
            x = VB.get(str((w or {}).get("bk")))
            typ = (w or {}).get("typ") or (x or {}).get("typ")
            if not x or x.get("da") or not typ:
                continue
            if len(data["bauteile"]) >= 60:
                return jsonify(error="Höchstens 60 Bauteile je Nachweis."), 400
            bt = _bauteil({"bk": x["bk"], "typ": typ, "name": x["name"][:120], "flaeche": x["flaeche"] or 0, "schichten": x["schichten"],
                           **({"uw": x["uw"]} if x.get("uw") and typ in ("fenster", "tuer") else {}),
                           "notiz": f"Aus den Baukosten „{x['baukosten']}“ (KG {x['kg']}, {x['herkunft']})" + (" – Schichten aus dem Modell, Reihenfolge innen → außen bitte prüfen" if x["schichten"] else "")})
            data["bauteile"].append(bt); neu += 1
        gl = 0
        for bk in (b.get("angleichen") or [])[:60]:
            x = VB.get(str(bk))
            if x and x.get("da") and x["flaeche"] is not None:
                for y in data["bauteile"]:
                    if y.get("id") == x["da"]:
                        y["flaeche"] = x["flaeche"]; gl += 1
        c.execute("UPDATE ws_nachweis SET data=?, geaendert=? WHERE id=?", (json.dumps(data), time.strftime("%Y-%m-%d %H:%M:%S"), nid))
        d = _detail(c, _nachweis(c, nid))
    d.update(vorher=vorher, neu=neu, angeglichen=gl)
    return jsonify(d)
