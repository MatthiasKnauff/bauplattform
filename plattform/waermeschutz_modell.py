"""Wärmeschutz ⇄ Projektmodell: Bauteile der Gebäudehülle kommen aus den Quellen des Projekts (Kern: bpcore/huelle.py – Baukosten/IFC,
Planungsassistent), nicht mehr über einen eigenen Griff in die Baukosten. Was sich dort ändert, wartet hier als Hinweis (rote Zahl an der Linie).

GET  /api/nachweise/<nid>/modell           Hinweise für diesen Nachweis: neu · flaeche · vorschlag, dazu die Linie und die Quellen
POST /api/nachweise/<nid>/modell           {hid, tun: uebernehmen | ablehnen, typ?} → Nachweis wie PUT (mit „vorher“ für Rückgängig) und die Hinweise
POST /api/nachweise/<nid>/modell/zurueck   {bid, oeffnen?} Rückweg: Aufbau eines Bauteils als Hinweis an Kosten und Ausschreibung
Im Bauteil steht nur der Verweis „ref“ (früher „bk“ = Baukosten-Ermittlung:Zeile). Baustoffe ordnet der Wärmeschutz zu (seine Datenbank).
"""
import json
import re
import time

from flask import g, jsonify, request

from bpcore import db, huelle, modell
from waermeschutz import TYPEN, _bauteil, _detail, _j, _nachweis, app

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
    S, K = [], {b["k"] for b in BS}
    for n, d, *x in lagen or []:
        if not d:
            continue
        k = x[0] if x and x[0] in K else None   # Schicht aus dem gewählten Aufbau: Baustoff fest (bpcore/uwert.py), sonst über den Namen
        g = (x[1] if len(x) > 1 and isinstance(x[1], dict) else {}) if k else {}
        b = {"k": k} if k else _baustoff(n, BS)
        plan = not k or (len(x) > 2 and x[2] is True)   # Name aus dem Plan (Allplan-Material) bleibt der Name der Schicht, der Baustoff liefert die Werte (B1)
        S.append({"m": b["k"], "d": round(d * 100, 1), **({"name": str(n)[:80]} if plan and n else {}), **({"lam": g["lam"]} if g.get("lam") else {}),
                  **({k2: g[k2] for k2 in ("m2", "breite", "abstand") if g.get(k2)} if g.get("m2") else {})}
                 if b else {"m": "eigen", "d": round(d * 100, 1), "name": str(n)[:60] or "Schicht"})
    if len(S) > 1:   # Reihenfolge im Modell oft außen → innen: Putz/Bekleidung innen gehört nach vorn
        aussen = re.compile(r"wdvs|außen|aussen|fassade|klinker|verblend|dämm|daemm|abdicht|bitumen|substrat|kies")
        if aussen.search(str(lagen[0][0]).lower()) and not aussen.search(str(lagen[-1][0]).lower()):
            S.reverse()
    return S


def _ref(b):
    return b.get("ref") or (f"bk:{b['bk']}" if b.get("bk") else "")


def _hinweise(c, n):
    data = _j(n["data"], {}) or {}
    H = huelle.huelle(c, n["project_id"])
    da = [dict(b, ref=_ref(b)) for b in data.get("bauteile") or []]
    soll, linie = huelle.hinweise_abgleichen(c, n["project_id"], "waermeschutz", huelle.abgleich(da, H["bauteile"]), g.user["name"], f"n{n['id']}|")
    return {"hinweise": [dict({k: h.get(k) for k in ("id", "art", "titel", "text", "quelle", "da")}, typ=h["bauteil"]["art"], ref=h["bauteil"]["ref"],
                              **({"aussen": h["bauteil"]["aussen"]} if isinstance(h["bauteil"].get("aussen"), bool) else {})) for h in soll],
            "linie": {k: linie[k] for k in ("richtung", "uebernahme", "zustand")}, "quellen": H["quellen"]}, soll


@app.get("/api/nachweise/<int:nid>/modell")
def modell_hinweise(nid):
    with db.tx() as c:
        n = _nachweis(c, nid)
        if not n:
            return jsonify(error="Nachweis nicht gefunden."), 404
        return jsonify(_hinweise(c, n)[0])


@app.post("/api/nachweise/<int:nid>/modell")
def modell_entscheiden(nid):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        n = _nachweis(c, nid)
        if not n:
            return jsonify(error="Nachweis nicht gefunden."), 404
        h = next((x for x in _hinweise(c, n)[1] if x["id"] == b.get("hid")), None)
        if not h:
            return jsonify(error="Der Hinweis ist nicht mehr aktuell – bitte neu laden."), 409
        data = _j(n["data"], {}) or {}
        data.setdefault("grundlagen", {}); data.setdefault("bauteile", [])
        vorher = {"name": n["name"], "status": n["status"], "data": json.loads(json.dumps(data))}
        if b.get("tun") == "ablehnen":
            modell.hinweis_entscheiden(c, n["project_id"], h["id"], "abgelehnt", g.user["name"])
        elif b.get("tun") == "uebernehmen":
            x = h["bauteil"]
            if h["art"] == "flaeche":
                for y in data["bauteile"]:
                    if y.get("id") == h["da"]:
                        y["flaeche"] = x["flaeche"]
            elif h["art"] == "aufbau":   # Aufbau aus dem Modell geändert: Schichten ersetzen (Baustoffe über die Wortsuche, unklare als „eigen“ = gelb)
                BS = [{"k": r["schluessel"], "w": _woerter(r["name"])} for r in c.execute("SELECT schluessel, name FROM ws_baustoff WHERE aktiv").fetchall()]
                data["bauteile"] = [_bauteil({"schichten": _schichten(x["lagen"], BS), "sig": x.get("sig") or "",
                                                                      **({"aussen": x["aussen"]} if isinstance(x.get("aussen"), bool) else {})}, y) if y.get("id") == h["da"] else y for y in data["bauteile"]]
            else:
                typ = b.get("typ") if b.get("typ") in TYPEN else x["art"]
                if not typ:
                    return jsonify(error="Bitte erst die Art wählen."), 400
                if len(data["bauteile"]) >= 60:
                    return jsonify(error="Höchstens 60 Bauteile je Nachweis."), 400
                BS = [{"k": r["schluessel"], "w": _woerter(r["name"])} for r in c.execute("SELECT schluessel, name FROM ws_baustoff WHERE aktiv").fetchall()] if x["lagen"] else []
                data["bauteile"].append(_bauteil({"ref": x["ref"], "typ": typ, "name": x["name"], "flaeche": x["flaeche"] or 0, "schichten": _schichten(x["lagen"], BS), "sig": x.get("sig") or "",
                                                  **({"aussen": x["aussen"]} if isinstance(x.get("aussen"), bool) else {}), **({"einordnung": x["einordnung"]} if x.get("einordnung") else {}),
                                                  **({"uw": x["uw"]} if x.get("uw") and typ in ("fenster", "tuer") else {}),
                                                  "notiz": f"Aus dem Projektmodell – {x['quelle']}" + (f" ({x['herkunft']})" if x["herkunft"] else "")
                                                  + ((" – Schichten aus dem gewählten Aufbau (Baukasten)" if x.get("aus_aufbau") else " – Schichten aus dem Modell") + ", Reihenfolge innen → außen bitte prüfen" if x["lagen"] else "")}))
            c.execute("UPDATE ws_nachweis SET data=?, geaendert=? WHERE id=?", (json.dumps(data), time.strftime("%Y-%m-%d %H:%M:%S"), nid))
            modell.hinweis_entscheiden(c, n["project_id"], h["id"], "uebernommen", g.user["name"])
        else:
            return jsonify(error="Unbekannte Entscheidung."), 400
        n = _nachweis(c, nid)
        d = _detail(c, n)
        d.update(vorher=vorher, modell=_hinweise(c, n)[0])
    return jsonify(d)


@app.post("/api/nachweise/<int:nid>/modell/zurueck")
def modell_zurueck(nid):
    """Rückweg: der festgelegte Aufbau eines Bauteils geht als Hinweis an Kosten und Ausschreibung – dort entscheidet wieder ein Mensch."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        n = _nachweis(c, nid)
        if not n:
            return jsonify(error="Nachweis nicht gefunden."), 404
        bt = next((x for x in (_j(n["data"], {}) or {}).get("bauteile") or [] if x.get("id") == b.get("bid")), None)
        if not bt:
            return jsonify(error="Bauteil nicht gefunden."), 404
        pid = n["project_id"]
        linie = next(x for x in modell.links(c, pid) if x["app"] == "waermeschutz")
        if linie["zustand"] != "lebendig":
            return jsonify(error="Die Linie zum Projektmodell ist getrennt oder eingefroren."), 409
        if linie["richtung"] == "zur_app":
            if not b.get("oeffnen"):
                return jsonify(error="Die Linie zeigt nur vom Modell zum Wärmeschutz.", oeffnen=True), 409
            modell.link_setzen(c, pid, "waermeschutz", {"richtung": "beide"}, g.user["name"])
        S = bt.get("schichten") or []
        N = {r["schluessel"]: r["name"] for r in c.execute("SELECT schluessel, name FROM ws_baustoff").fetchall()} if S else {}
        aufbau = [{"name": (s.get("name") if s.get("m") == "eigen" else N.get(s.get("m"))) or s.get("m") or "Schicht", "d": s.get("d") or 0} for s in S][:20]
        u = b.get("u") if isinstance(b.get("u"), (int, float)) and 0 < b["u"] < 10 else bt.get("uw")
        name = " ".join(x for x in (bt.get("kurz"), bt.get("name")) if x) or "Bauteil"
        text = " · ".join(f"{a['name']} {('%.1f' % float(a['d'] or 0)).rstrip('0').rstrip('.').replace('.', ',')} cm" for a in aufbau)   # 20.0 → „20 cm“, 17.5 → „17,5 cm“
        daten = {"schluessel": "ws:" + str(bt.get("id")) + ":" + json.dumps([[a["name"], a["d"]] for a in aufbau], ensure_ascii=False)[:400] + f":{u}",
                 "art": "aufbau", "text": (text or "Aufbau laut Wärmeschutz") + (f" · U {str(round(u, 2)).replace('.', ',')} W/(m²K)" if u else ""),
                 "quelle": f"Wärmeschutz „{n['name']}“", "ref": _ref(bt), "typ": bt.get("typ"), "flaeche": bt.get("flaeche") or 0, "aufbau": aufbau, "u": u}
        try:
            k = huelle.zurueck(c, pid, "waermeschutz", ("kosten", "ausschreibung"), f"Wärmeschutz: Aufbau {name} festgelegt", daten, g.user["name"])
        except modell.Ungueltig as e:
            return jsonify(error=str(e)), 409
    return jsonify(ok=True, gesendet=k)
