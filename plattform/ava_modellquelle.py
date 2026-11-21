"""Ausschreibung ← Gebäudemodell: Quelle „Bauteile“ neben den Baudaten (GO 21.11.2026, Mock „Gebäudemodell in der Kopierquelle“: A1 B1 C2 D3 F1).

A1  Die Quelle zeigt die Bauteile des gültigen Planstands, die einen Aufbau haben, darunter die Positionen ihres Aufbaus aus den Baudaten
    (Menge = Faktor × Bauteilmenge; dieselbe Rechnung wie Kosten und LV-Entwurf: bauteilliste.berechnete → baudaten.aufloesen).
B1  Ein ganzes Bauteil ins LV ziehen legt alle Positionen seines Aufbaus ab, jede einzeln verknüpft (Schlüssel `mod` = „<Zeile>#<Teil>“).
C2  Das Zeichen im LV ist die Kette: verknüpft / gelöst (`mod_los`). Die Linie „Ausschreibung“ der Verknüpfungen geht vor: getrennt oder fest
    → nichts folgt dem Modell, die Kette ist grau.
D3  Solange verknüpft, folgen Menge, Text und Preis (Schätzpreis der Position in den Baudaten) dem Modell – direkt, solange die Position nicht
    von Hand geändert (Fingerabdruck `mod_h` = Stand, wie er zuletzt aus dem Modell kam) und das LV weder versandt noch vergeben ist;
    sonst Hinweis `mod_offen` im LV mit „Übernehmen“ / „Später“. Fehlt der Teil im Modell (Bauteil weg, anderer Aufbau mit weniger Teilen),
    bleibt die Position stehen und trägt `mod_weg`.
F1  „Alle Bauteile ablegen“ macht dasselbe wie Ziehen, nur für alle (in der Oberfläche); der LV-Entwurf je Gewerk (ava_modell.py) bleibt.

Wann wird abgeglichen? Beim Öffnen eines LV: _payload meldet `mod.alt`, wenn sich das Modell seit dem letzten Abgleich geändert hat –
die Seite ruft dann POST …/modell/abgleich (eine Anfrage nur in diesem Fall).

GET  /api/projekt/<pid>/modellquelle     → {planstand, rev, getrennt, bauteile: [{id, name, teil, kg, kgname, menge, einheit, aufbau, pos: […]}], im: {mod: [LV]}}
POST /api/lv/<i>/modell/abgleich         {aktion?: „uebernehmen“ | „spaeter“}   → Payload des LV (+ mod_stat)
POST /api/lv/<i>/modell/los              {pos, los}                              → Payload des LV
"""
import hashlib
import json
from datetime import datetime

from flask import g, jsonify, request

from bpcore import baudaten, bauteilliste, db, din276, modell, versionen
from bpcore.jsonwert import lies as _j
import ava as A
import ava_tuersync

FELDER = ("kurz", "lang", "menge", "einheit", "ep_s")   # was dem Modell folgt (D3)


def fingerabdruck(x):
    """Stand einer Position in den Feldern, die dem Modell folgen – so erkennt der Abgleich Änderungen von Hand."""
    v = [x.get("kurz") or "", x.get("lang") or "", round(float(x.get("menge") or 0), 3), x.get("einheit") or "",
         None if x.get("ep_s") is None else round(float(x["ep_s"]), 2)]
    return hashlib.sha1(json.dumps(v, ensure_ascii=False).encode()).hexdigest()[:12]


def linie(c, pid):
    """Zustand der Linie „Ausschreibung“: „lebendig“, „fest“ oder „getrennt“ (die Linie geht vor)."""
    return next((x.get("zustand") or "lebendig" for x in modell.links(c, pid) if x.get("app") == "ausschreibung"), "lebendig")


def rev(c, pid):
    r = c.execute("SELECT rev FROM pm_modell WHERE project_id=?", (pid,)).fetchone()
    return r["rev"] if r else 0


def _name(x):
    n = x.get("name") or ""
    return f"{n} – {x['mat']}" if x.get("mat") and x["mat"] not in n else n


def bauteile(c, pid):
    """Bauteile mit Aufbau und ihre Positionen (A1). → (Liste, Planstand-Name)"""
    L = modell.lesen(c, pid)["modell"].get("bauteilliste") or bauteilliste.leer()
    bts, _ = bauteilliste.berechnete(c, L)
    out = []
    for x in bts:
        a = x.get("aufbau")
        if not isinstance(a, dict) or not a.get("v"):
            continue
        AU = baudaten.aufbau(c, a["v"], a.get("w"), a.get("d"), a.get("a"))
        if not AU or not AU.get("teile"):
            continue
        name, P = _name(x), []
        for i, t in enumerate(AU["teile"]):
            y = baudaten.aufloesen(c, [t], x.get("menge") or 0, name)
            if not y:
                continue
            y = y[0]
            p = {"mod": f"{x['id']}#{i}"[:240], "typ": "pos", "art": "N", **{k: y.get(k) for k in ("kurz", "lang", "menge", "einheit", "kg", "ep_s")},
                 "quelle": ("Gebäudemodell: " + name)[:200], "lb": y.get("lb_name") or ""}
            if isinstance(t.get("id"), int):
                p["pdb"] = t["id"]   # Herkunft in den Baudaten: Auftrags-/Angebotspreise fließen dorthin zurück
            p["mod_h"] = fingerabdruck(p)
            P.append(p)
        if not P:
            continue
        kg2 = str(x.get("kg") or "")[:2] + "0"
        out.append({"id": x["id"], "name": name, "teil": x.get("teil") or "", "kg": x.get("kg") or "", "kgname": f"{kg2} {din276.NAMEN.get(kg2, '')}".strip(),
                    "menge": x.get("menge") or 0, "einheit": x.get("einheit") or "", "aufbau": AU.get("name") or x.get("mat") or "", "pos": P})
    return out, (L.get("quelle") or {}).get("name") or ""


def _lvs(c, pid):
    return c.execute("SELECT * FROM ava_lv WHERE project_id=? AND " + A._vf(c, pid), (pid,)).fetchall()


def quelle(c, pid):
    B, ps = bauteile(c, pid)
    im = {}
    for r in _lvs(c, pid):
        for x in (_j(r["data"], {}) or {}).get("items") or []:
            if x.get("typ") == "pos" and x.get("mod"):
                im.setdefault(x["mod"], [])
                t = f"LV {r['nr']}".strip()
                if t not in im[x["mod"]]:
                    im[x["mod"]].append(t)
    return {"planstand": ps, "rev": rev(c, pid), "linie": linie(c, pid), "bauteile": B, "im": im}


def zustand(c, r):
    """Für _payload: {alt, linie} – alt = verknüpfte Positionen und das Modell hat sich seit dem letzten Abgleich geändert."""
    d = _j(r["data"], {}) or {}
    if not r["project_id"] or not any(x.get("mod") for x in d.get("items") or []):
        return None
    li = linie(c, r["project_id"])
    return {"linie": li, "alt": li == "lebendig" and d.get("mod_rev") != rev(c, r["project_id"])}


def abgleich(c, r, wer, erzwingen=False):
    """D3: verknüpfte Positionen eines LV auf den Stand des Modells. → {auto, offen, weg} oder None (nichts zu tun)."""
    pid, d = r["project_id"], _j(r["data"], {}) or {}
    I = d.get("items") or []
    V = [x for x in I if x.get("typ") == "pos" and x.get("mod") and not x.get("mod_los")]
    if not pid or not V or linie(c, pid) != "lebendig":
        return None
    Q = {p["mod"]: p for b in bauteile(c, pid)[0] for p in b["pos"]}
    sp = "" if erzwingen else ava_tuersync.gesperrt(c, r)
    st, offen = {"auto": 0, "weg": 0}, []
    for x in V:
        s = Q.get(x["mod"])
        if not s:
            if not x.get("mod_weg"):
                x["mod_weg"] = True
            st["weg"] += 1
            continue
        x.pop("mod_weg", None)
        jetzt = fingerabdruck(x)
        if s["mod_h"] == jetzt:   # stimmt (auch wenn von Hand genauso gesetzt)
            x["mod_h"] = s["mod_h"]
            continue
        if s["mod_h"] == x.get("mod_h"):   # Modell unverändert – nur von Hand geändert: das LV behält es
            continue
        hand = bool(x.get("mod_h")) and jetzt != x["mod_h"]
        if (hand or sp) and not erzwingen:
            offen.append(x["id"])
            continue
        for k in FELDER:
            x[k] = s.get(k)
        x["mod_h"] = s["mod_h"]
        st["auto"] += 1
    d["mod_rev"] = rev(c, pid)
    if offen:
        d["mod_offen"] = {"ids": offen, "grund": sp or "von Hand geändert", "am": datetime.now().isoformat(timespec="minutes")}
    else:
        d.pop("mod_offen", None)
    d["items"] = A.clean_items(I)   # OZ bleiben (D3: nur Menge, Text, Preis)
    if st["auto"]:
        versionen.vor(c, f"avalv:{r['id']}")
    c.execute("UPDATE ava_lv SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(d, ensure_ascii=False), A._now(), wer, r["id"]))
    if st["auto"]:
        versionen.nach(c, f"avalv:{r['id']}", wer)
        A.C.audit(wer, "ava", "LV dem Gebäudemodell nachgeführt", f"LV {r['nr']}: {st['auto']} Position(en)")
    return dict(st, offen=len(offen))


# ---------------------------------------------------------------- Routen
@A.app.get("/api/projekt/<int:pid>/modellquelle")
def lv_modellquelle(pid):
    with db.tx() as c:
        if not A._sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        return jsonify(quelle(c, pid))


@A.app.post("/api/lv/<int:i>/modell/abgleich")
def lv_modell_abgleich(i):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = A._lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        if b.get("aktion") == "spaeter":
            d = _j(r["data"], {}) or {}
            d.pop("mod_offen", None)
            c.execute("UPDATE ava_lv SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(d, ensure_ascii=False), A._now(), g.user["name"], i))
            st = None
        else:
            st = abgleich(c, r, g.user["name"], erzwingen=b.get("aktion") == "uebernehmen")
        return jsonify(dict(A._payload(c, A._lv(c, i)), mod_stat=st))


@A.app.post("/api/lv/<int:i>/modell/los")
def lv_modell_los(i):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = A._lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        d = _j(r["data"], {}) or {}
        x = next((x for x in d.get("items") or [] if x.get("id") == b.get("pos")), None)
        if x is None or not x.get("mod"):
            return jsonify(error="Diese Position kommt nicht aus dem Gebäudemodell."), 404
        if b.get("los"):
            x["mod_los"] = True
        else:
            x.pop("mod_los", None)
            d.pop("mod_rev", None)   # wieder verbunden: beim nächsten Öffnen auf den Stand des Modells
        versionen.vor(c, f"avalv:{i}")
        c.execute("UPDATE ava_lv SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(d, ensure_ascii=False), A._now(), g.user["name"], i))
        versionen.nach(c, f"avalv:{i}", g.user["name"])
        if not b.get("los"):
            abgleich(c, A._lv(c, i), g.user["name"])
        return jsonify(A._payload(c, A._lv(c, i)))
