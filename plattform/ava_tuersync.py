"""Fenster- & Türliste ⇄ LV ⇄ Gebäudemodell automatisch (GO 18.11.2026, Mock „Türliste automatisch verknüpft“: TL-A1 B1 C1 D1 E3).

Je Türliste zwei Schalter (in den Daten der Liste, „sync“): lv und modell – „auto“ (Vorgabe, A1) · „uebernahme“ (Hinweis, dann übernehmen) · „aus“.
Die Linie „Ausschreibung“ der Verknüpfungs-Karte gilt darüber: getrennt = auch die Türliste ist vom Modell getrennt.
  Liste → LV     beim Speichern der Liste: alle LVs mit Positionen aus dieser Liste nachführen (gleiche Ausführung = eine Position, Menge =
                 Anzahl). Ändert sich die Ausführung aller Türen einer Position gemeinsam, bleibt die Position (OZ, Preis) und bekommt Text und
                 Schlüssel der neuen Ausführung. Gelöste Positionen (tl_los) und Türen (lv_los) bleiben außen vor.
                 Versandte oder vergebene LVs ändern sich nicht von selbst (C1): sie bekommen den Hinweis tl_offen.
  LV → Liste     Ausführung einer Position (Positionsdetails) → alle Türen der Position (B1): position_aendern(); Menge kommt immer aus der Liste.
  Liste → Modell Nummer, Geschoss, Raum, Art, Maße, Brüstung (D1): Planstand von Hand/Assistent → das Element im Modell; Planstand aus IFC → die Tür
                 merkt sich die Abweichung (abw: {Feld: Wert im Plan}) – der Plan bleibt, wie gezeichnet; holt der Plan auf, verschwindet sie.

POST /api/projekt/<pid>/tueren/sync          {liste, lv?, modell?}           Schalter setzen
POST /api/projekt/<pid>/tueren/position      {liste, tl, werte}             Ausführung einer LV-Position → alle Türen (B1)
POST /api/lv/<i>/tueren/los                  {pos, los}                      eine Position lösen / wieder verbinden
POST /api/lv/<i>/tueren/offen                {aktion: „ins_lv“ | „spaeter“}  Hinweis nach Versand/Vergabe
"""
import json
from datetime import datetime

from flask import g, jsonify, request

from bpcore import db, konto, versionen
from bpcore.jsonwert import lies as _j
import ava as A

MODI = ("auto", "uebernahme", "aus")
AUSFUEHRUNG = ("art", "flg", "zarge", "blatt", "oberfl", "farbe", "glas", "schloss", "beschlag", "brand", "schall", "rc", "klima", "oeffnung")   # B1: aus dem LV änderbar
GEO = {"nr": "nr", "geschoss": "geschoss", "b": "b", "h": "h", "bruestung": "bruestung"}   # Liste → Modell (D1)


def einst(d):
    s = (d or {}).get("sync") or {}
    return {k: s.get(k) if s.get(k) in MODI else "auto" for k in ("lv", "modell")}


def _tl_von(t, form, liste):
    """Schlüssel der Position, in die eine Tür fällt (wie tueren_zu_positionen)."""
    P = [x for x in A.tueren_zu_positionen([t], form, True, liste) if x["typ"] == "pos" and x.get("art") != "T"]
    return P[0]["tl"] if P else None


def _form(I, liste):
    """„merkmale“ (Titel mit Systembeschreibung je Gruppe) oder „lang“ – wie die Positionen damals ins LV kamen."""
    return "merkmale" if any(str(x.get("tl") or "").startswith(liste + "|") and str(x["tl"]).endswith("|sys") for x in I) else "lang"


def gesperrt(c, r):
    """Versandt oder vergeben: das LV ändert sich nicht mehr von selbst (C1)."""
    V = _j(r["vergabe"], {}) or {}
    if (V.get("bieter") or V.get("frei")) and not V.get("aufgehoben"):
        return "vergeben"
    s = c.execute("SELECT data FROM bp_store WHERE key=?", (f"ava:versand:{r['id']}",)).fetchone()
    d = _j(s["data"] if s else "", {}) or {}
    return "versandt" if any((b or {}).get("versendet") for b in (d.get("bieter") or {}).values()) else ""


def verknuepfte(c, pid, liste):
    """LVs mit Positionen aus dieser Liste (aktive Version)."""
    out = []
    for r in c.execute("SELECT * FROM ava_lv WHERE project_id=? AND " + A._vf(c, pid), (pid,)).fetchall():
        I = (_j(r["data"], {}) or {}).get("items") or []
        if any(x.get("typ") == "pos" and str(x.get("tl") or "").startswith(liste + "|") for x in I):
            out.append(r)
    return out


def _nachfuehren(I, tueren, alt, liste):
    """Positionen eines LV auf den Stand der Liste bringen → (Items, Zähler)."""
    form = _form(I, liste)
    T = [t for t in tueren if not t.get("lv_los")]
    neu = A.tueren_zu_positionen(T, form, True, liste)
    # Ausführung aller Türen einer Position gemeinsam geändert: Position behalten (OZ, Preis), Schlüssel umhängen
    alt_tl = {t["id"]: _tl_von(t, form, liste) for t in alt or [] if not t.get("lv_los")}
    neu_tl = {t["id"]: _tl_von(t, form, liste) for t in T}
    da = {x.get("tl") for x in I}
    for x in I:
        if x.get("typ") != "pos" or x.get("art") == "T" or x.get("tl_los") or not str(x.get("tl") or "").startswith(liste + "|"):
            continue
        ids = {i for i, k in alt_tl.items() if k == x["tl"]}
        ziel = {neu_tl[i] for i in ids if i in neu_tl}
        if ids and len(ziel) == 1 and x["tl"] not in neu_tl.values():
            z = ziel.pop()
            if z and z not in da:
                da.discard(x["tl"]); x["tl"] = z; da.add(z)
    los = {x["tl"] for x in I if x.get("tl_los") and x.get("tl")}
    for x in I:   # gelöste Positionen: _tl_abgleich fasst sie nicht an
        if x.get("tl_los") and x.get("tl"):
            x["_tl"] = x.pop("tl")
    I, stat = A._tl_abgleich(I, [x for x in neu if x.get("tl") not in los], liste)
    for x in I:
        if "_tl" in x:
            x["tl"] = x.pop("_tl")
    return I, stat


def lv_nachfuehren(c, pid, liste, tueren, alt, wer, nur=None, erzwingen=False):
    """Liste → LVs. nur: eine LV-ID; erzwingen: auch versandte/vergebene (Hinweis „Trotzdem ins LV“). → [{lv, name, stat | gesperrt}]"""
    out = []
    for r in verknuepfte(c, pid, liste):
        if nur and r["id"] != nur:
            continue
        d = _j(r["data"], {}) or {}
        sp = "" if erzwingen else gesperrt(c, r)
        if sp:
            d["tl_offen"] = {"liste": liste, "am": datetime.now().isoformat(timespec="minutes"), "grund": sp}
            stat = None
        else:
            d["items"], stat = _nachfuehren(list(d.get("items") or []), tueren, alt, liste)
            d["items"] = A.clean_items(d["items"])
            A.nummerieren(d["items"])
            d.pop("tl_offen", None)
            if not any(stat.get(k) for k in ("angepasst", "neu", "null")) and not erzwingen:
                continue
        versionen.vor(c, f"avalv:{r['id']}")
        c.execute("UPDATE ava_lv SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(d, ensure_ascii=False), A._now(), wer, r["id"]))
        versionen.nach(c, f"avalv:{r['id']}", wer)
        out.append({"lv": r["id"], "name": f"LV {r['nr']} {r['name']}".strip(), "stat": stat, "gesperrt": sp})
    return out


def modell_nachfuehren(c, pid, alt, neu, wer):
    """Liste → Modell (D1). Ändert neu (abw) an Ort und Stelle; → Text für die Meldung oder ''."""
    from bpcore import bauteilliste as B, modell
    if any(x.get("app") == "ausschreibung" and x.get("zustand") == "getrennt" for x in modell.links(c, pid)):
        return ""
    A_ = {t["id"]: t for t in alt or []}
    geaendert = [(t, {k for k in GEO if str(t.get(k) or "") != str(A_[t["id"]].get(k) or "")}) for t in neu if t.get("mid") and t["id"] in A_]
    geaendert = [(t, F) for t, F in geaendert if F]
    if not geaendert:
        return ""
    M = modell.lesen(c, pid)
    m = M["modell"]
    L = B.sauber(m.get("bauteilliste"))
    E = {str(e["id"]): e for e in L.get("elemente") or []}
    hand = ((L.get("quelle") or {}).get("art") or "") == "hand"
    n = 0
    for t, F in geaendert:
        e = E.get(str(t["mid"]))
        if e is None:
            continue
        if hand:   # Planstand von Hand / Assistent: das Element selbst
            for k in F:
                v = t.get(k)
                e[k] = A._meter(v) if k in ("b", "h", "bruestung") and v not in (None, "") else (v or "")
            n += 1
        else:   # Planstand aus IFC: der Plan bleibt – die Tür merkt sich, was im Plan steht
            from bpcore.elemente import _zeile_liste
            soll = _zeile_liste(e, L.get("raeume"))
            ab = dict(t.get("abw") or {})
            for k in F:
                if str(soll.get(k) or "") != str(t.get(k) or ""):
                    ab[k] = str(soll.get(k) or "")
                else:
                    ab.pop(k, None)
            if ab:
                t["abw"] = ab
            else:
                t.pop("abw", None)
            n += 1
    if hand and n:
        m["bauteilliste"] = L
        modell.schreiben(c, pid, m, wer)
        return f"Gebäudemodell: {n} Element{'e' if n != 1 else ''} nachgeführt"
    return f"Gebäudemodell (Plan aus IFC): {n} Abweichung{'en' if n != 1 else ''} zum Plan vermerkt – „An den Zeichner“" if n else ""


def nach_speichern(c, pid, liste, alt_daten, neu_daten, wer):
    """Nach dem Speichern einer Türliste (ava.tueren): Modell und LVs nachführen → (neu_daten, Meldungen)."""
    S = einst(neu_daten)
    meld = []
    if S["modell"] == "auto":
        t = modell_nachfuehren(c, pid, alt_daten.get("tueren"), neu_daten["tueren"], wer)
        if t:
            meld.append(t)
    lvs = []
    if S["lv"] == "auto":
        lvs = lv_nachfuehren(c, pid, liste, neu_daten["tueren"], alt_daten.get("tueren"), wer)
        for x in lvs:
            if x["gesperrt"]:
                meld.append(f"{x['name']} ist {x['gesperrt']} – nicht automatisch geändert, Hinweis im LV")
            else:
                st = x["stat"]
                teile = [f"{st['neu']} neu" if st.get("neu") else "", f"{st['angepasst']} angepasst" if st.get("angepasst") else "", f"{st['null']} auf Menge 0" if st.get("null") else ""]
                meld.append(f"{x['name']}: " + ", ".join(t for t in teile if t))
    return neu_daten, meld, [x["lv"] for x in lvs]


# ---------------------------------------------------------------- Routen
def _liste_lesen(c, pid, liste):
    return _j(konto._get(c, A._tl_key(pid, liste)), {}) or {}


def _liste_schreiben(c, pid, liste, d, wer):
    d = dict(d, rev=int(d.get("rev") or 0) + 1, updated_by=wer)
    konto._put(c, A._tl_key(pid, liste), json.dumps(d, ensure_ascii=False), wer)
    return d


@A.app.post("/api/projekt/<int:pid>/tueren/sync")
def tueren_sync(pid):
    b = request.get_json(silent=True) or {}
    liste = A._tl_id(b.get("liste"))
    with db.tx() as c:
        if not A._sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", (A._tl_key(pid, liste),))
        d = _liste_lesen(c, pid, liste)
        S = einst(d)
        for k in ("lv", "modell"):
            if b.get(k) in MODI:
                S[k] = b[k]
        d["sync"] = S
        d = _liste_schreiben(c, pid, liste, d, g.user["name"])
        meld = []
        if b.get("lv") == "auto":   # wieder an: gleich nachführen
            for x in lv_nachfuehren(c, pid, liste, d.get("tueren") or [], d.get("tueren") or [], g.user["name"]):
                meld.append(x["name"] + (" – " + x["gesperrt"] if x["gesperrt"] else " nachgeführt"))
        return jsonify(sync=S, meldungen=meld, rev=d["rev"])


@A.app.post("/api/projekt/<int:pid>/tueren/position")
def tueren_position(pid):
    """B1: Ausführung einer LV-Position → alle Türen dieser Position; danach die LVs wie nach jedem Speichern."""
    b = request.get_json(silent=True) or {}
    liste, tl = A._tl_id(b.get("liste")), str(b.get("tl") or "")
    werte = {k: A._s(v, A.TUER_TEXT.get(k, 60)) for k, v in (b.get("werte") or {}).items() if k in AUSFUEHRUNG}
    if not werte:
        return jsonify(error="Nichts zu ändern."), 400
    with db.tx() as c:
        if not A._sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", (A._tl_key(pid, liste),))
        d = _liste_lesen(c, pid, liste)
        alt = [dict(t) for t in d.get("tueren") or []]
        r = next((r for r in verknuepfte(c, pid, liste)), None)
        form = _form((_j(r["data"], {}) or {}).get("items") or [], liste) if r else "merkmale"
        n = 0
        for t in d.get("tueren") or []:
            if not t.get("lv_los") and _tl_von(t, form, liste) == tl:
                for k, v in werte.items():
                    if v:
                        t[k] = v
                    else:
                        t.pop(k, None)
                n += 1
        if not n:
            return jsonify(error="Keine Tür gehört (noch) zu dieser Position – Türliste und LV abgleichen."), 404
        d = _liste_schreiben(c, pid, liste, d, g.user["name"])
        _, meld, _ = nach_speichern(c, pid, liste, {"tueren": alt}, d, g.user["name"])
        return jsonify(tueren=n, meldungen=meld)


@A.app.post("/api/lv/<int:i>/tueren/los")
def lv_tueren_los(i):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = A._lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        d = _j(r["data"], {}) or {}
        x = next((x for x in d.get("items") or [] if x.get("id") == b.get("pos")), None)
        if x is None or not x.get("tl"):
            return jsonify(error="Diese Position kommt nicht aus der Türliste."), 404
        if b.get("los"):
            x["tl_los"] = True
        else:
            x.pop("tl_los", None)
        versionen.vor(c, f"avalv:{i}")
        c.execute("UPDATE ava_lv SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(d, ensure_ascii=False), A._now(), g.user["name"], i))
        versionen.nach(c, f"avalv:{i}", g.user["name"])
        if not b.get("los") and r["project_id"]:   # wieder verbunden: auf den Stand der Liste
            liste = x["tl"].split("|")[0]
            T = (_liste_lesen(c, r["project_id"], liste).get("tueren")) or []
            lv_nachfuehren(c, r["project_id"], liste, T, T, g.user["name"], nur=i)
        return jsonify(A._payload(c, A._lv(c, i)))


@A.app.post("/api/lv/<int:i>/tueren/offen")
def lv_tueren_offen(i):
    """C1: Hinweis „Türliste geändert“ nach Versand/Vergabe – trotzdem ins LV oder später."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = A._lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        d = _j(r["data"], {}) or {}
        o = d.get("tl_offen") or {}
        if b.get("aktion") == "ins_lv" and o and r["project_id"]:
            T = (_liste_lesen(c, r["project_id"], o.get("liste") or "1").get("tueren")) or []
            lv_nachfuehren(c, r["project_id"], o.get("liste") or "1", T, T, g.user["name"], nur=i, erzwingen=True)
        else:
            d.pop("tl_offen", None)
            c.execute("UPDATE ava_lv SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(d, ensure_ascii=False), A._now(), g.user["name"], i))
        return jsonify(A._payload(c, A._lv(c, i)))
