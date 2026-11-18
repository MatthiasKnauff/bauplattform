"""Ausschreibungsdaten in drei Ebenen: Büro → Projekt → LV (GO 18.11.2026, Mock „Ausschreibungsdaten in drei Ebenen“).

  A1  am Projekt alles außer Gewerk, KG, Kostenansatz, Vergabenummer und den Terminen des LV; Abgabe/Eröffnung am Projekt als Vorschlag,
      Bindefrist als Regel „x Wochen nach Abgabe“ (das LV rechnet das Datum)
  B1  „fürs Projekt übernehmen?“ beim OK in der Maske, wenn am Projekt noch nichts steht (fuers_projekt), und beim Anlegen eines weiteren
      LV, solange es nur im ersten steht (vorschlag)
  C1  Konflikte im Dialog: andere LVs behalten ihren Wert und gelten als „abweichend“; „auch angleichen“ nimmt ihren eigenen Wert weg
  E1  nach der Vergabe friert der Auftrag die geerbten Werte ein (vergabe.ebenen) – spätere Änderungen am Projekt ändern ihn nicht

Felder und Vorgaben des Büros stehen im Kern (bpcore/ausschreibung.py). Das Erben rechnet nur aufloesen() – Maske, Druck, Protokoll und
Vertrag lesen darüber.

GET  /api/lv/<i>/ebenen                  {fuers_projekt: [{k, l, wert, text, konflikte}], steckbrief}
GET  /api/projekt/<pid>/ebenen/vorschlag  {felder: [{k, l, wert, text, lvs, konflikte}]}  – nach dem Anlegen eines weiteren LV
POST /api/projekt/<pid>/ebenen/hoch       {werte: {k: v}, angleichen: [lv_id]} – mit pruefen: true nur die Konflikte (lv: ohne dieses LV)
POST /api/lv/<i>/ebenen/nur-lv            {felder: [k]} – „nur dieses LV“: nicht wieder fragen
"""
import json
import re
from datetime import date, timedelta

from flask import g, jsonify, request

from bpcore import ausschreibung as AS, db, stammdaten, versionen
from bpcore.jsonwert import lies as _j
from ava import _lv, _now, _sees, app

QUELLE = {"lv": "eigener Wert", "projekt": "vom Projekt", "buero": "vom Büro", "gerechnet": "gerechnet", "auftrag": "beim Auftrag festgehalten"}
CHECK = {k for _, F in stammdaten.LV for k, _, typ, _ in F if typ == "check"}
LABEL = {**{k: l for _, F in stammdaten.LV for k, l, *_ in F}, AS.REGEL: "Bindefrist (Regel)"}


def _vergeben(V):
    return bool(V.get("bieter")) and not V.get("aufgehoben")


def eigen(M, k):
    """Hat das LV für k einen eigenen Wert? Häkchen: wenn gesetzt (auch „aus“), sonst: wenn nicht leer."""
    return (k in M and M[k] is not None) if k in CHECK else not AS.leer(M.get(k))


def gleich(a, b):
    if isinstance(a, list) or isinstance(b, list):
        return sorted(map(str, a or [])) == sorted(map(str, b or []))
    if isinstance(a, bool) or isinstance(b, bool):
        return bool(a) == bool(b)
    return str(a if a is not None else "").strip() == str(b if b is not None else "").strip()


def text(k, v):
    if isinstance(v, bool):
        return "ja" if v else "nein"
    if isinstance(v, list):
        return "; ".join(str(x.get("name") if isinstance(x, dict) else x) for x in v)
    return str(v if v is not None else "")


def oben(c, pid, K=None):
    """Was ein LV des Projekts ohne eigenen Eintrag bekommt: {k: (wert, quelle)} – Projekt vor Büro; Abgabe/Eröffnung nur vom Projekt."""
    K = K if K is not None else {}
    if ("oben", pid) not in K:
        if "B" not in K:
            K["B"] = AS.buero(c)
        P = AS.projekt(c, pid) if pid else {}
        O = {}
        for k in AS.ERBT + (AS.REGEL,):
            if k in P:
                O[k] = (P[k], "projekt")
            elif k in K["B"] and k not in AS.VORSCHLAG:
                O[k] = (K["B"][k], "buero")
        K[("oben", pid)] = O
    return K[("oben", pid)]


def aufloesen(c, r, K=None, meta=None, herkunft=None):
    """→ (W, Q, G): W alle Angaben des LV (eigene + geerbte), Q Quelle je Schlüssel, G was ohne eigenen Eintrag gälte.
    meta: Angaben einer anderen Fassung des LV (Druck einer Version) statt der aktuellen. herkunft: {} – je Schlüssel, woher G kommt."""
    D, V = _j(r["data"], {}) or {}, _j(r["vergabe"], {}) or {}
    M = dict(meta if meta is not None else D.get("meta") or {})
    if _vergeben(V):   # E1: beim ersten Lesen nach der Vergabe festhalten
        E = V.get("ebenen") if isinstance(V.get("ebenen"), dict) else {}
        if E.get("an") != [V.get("bieter"), V.get("angebot_id")]:   # neu vergeben (auch nach „Vergabe aufheben“): neu festhalten
            V["ebenen"] = E = {"an": [V.get("bieter"), V.get("angebot_id")], "am": _now(), "w": {k: v for k, (v, _) in oben(c, r["project_id"], K).items()}}
            c.execute("UPDATE ava_lv SET vergabe=? WHERE id=?", (json.dumps(V, ensure_ascii=False), r["id"]))
        O = {k: (v, "auftrag") for k, v in (E.get("w") or {}).items()}
    else:
        O = oben(c, r["project_id"], K)
    W, Q, G = dict(M), {}, {}
    for k in AS.ERBT:
        if k in O:
            G[k] = O[k][0]
            if herkunft is not None:
                herkunft[k] = O[k][1]
        if eigen(M, k):
            Q[k] = "lv"
        elif k in O:
            W[k], Q[k] = O[k]
    if eigen(M, "bindefrist"):
        Q["bindefrist"] = "lv"
    else:
        m = re.search(r"\d+", str((O.get(AS.REGEL) or ("",))[0]))
        try:
            if m and W.get("abgabe"):
                W["bindefrist"] = G["bindefrist"] = (date.fromisoformat(str(W["abgabe"])[:10]) + timedelta(weeks=int(m.group()))).isoformat()
                Q["bindefrist"] = "gerechnet"
                if herkunft is not None:
                    herkunft["bindefrist"] = "gerechnet"
        except ValueError:
            pass
    return W, Q, G


def wie_geerbt(c, r, neu, K=None):
    """Vor dem Speichern: Schlüssel, deren neuer Wert dem geerbten gleicht – kein eigener Wert (↺ = den geerbten Wert wieder eintragen)."""
    _, _, G = aufloesen(c, r, K)
    return [k for k in list(AS.ERBT) + ["bindefrist"] if k in neu and k in G and gleich(neu[k], G[k])]


def _lvs(c, pid):
    return [x for x in c.execute("SELECT id, nr, name, data, vergabe, project_id FROM ava_lv WHERE project_id=? ORDER BY nr, id", (pid,)).fetchall()
            if not ((_j(x["data"], {}) or {}).get("meta") or {}).get("lv_weg")]


def konflikte(c, pid, werte, ohne=None):
    """{k: [{id, lv, wert}]} – andere offene LVs mit eigenem, anderem Wert (vergebene sind festgehalten, E1)."""
    out = {}
    for x in _lvs(c, pid):
        if x["id"] == ohne or _vergeben(_j(x["vergabe"], {}) or {}):
            continue
        M = (_j(x["data"], {}) or {}).get("meta") or {}
        for k, v in werte.items():
            if eigen(M, k) and not gleich(M[k], v):
                out.setdefault(k, []).append({"id": x["id"], "lv": f"LV {x['nr']} {x['name']}".strip(), "wert": text(k, M[k])})
    return out


def _zeile(k, v, K):
    return {"k": k, "l": LABEL.get(k, k), "wert": v, "text": text(k, v), "konflikte": K.get(k, [])}


def fuers_projekt(c, r):
    """B1: eigene Werte dieses LV, für die am Projekt noch nichts steht (ohne „nein, nur dieses LV“)."""
    if not r["project_id"]:
        return []
    M = ((_j(r["data"], {}) or {}).get("meta") or {})
    P, nein = AS.projekt(c, r["project_id"]), set(M.get("_nur_lv") or [])
    W = {k: M[k] for k in AS.ERBT if k not in AS.VORSCHLAG and k not in P and k not in nein and eigen(M, k)}
    K = konflikte(c, r["project_id"], W, ohne=r["id"])
    return [_zeile(k, v, K) for k, v in W.items()]


def steckbrief(c, r, K=None):
    """Zeile oben im LV: das Wichtigste und wie viel vom Projekt abweicht."""
    W, Q, G = aufloesen(c, r, K)
    P = AS.projekt(c, r["project_id"]) if r["project_id"] else {}
    abw = [LABEL.get(k, k) for k in AS.ERBT if Q.get(k) == "lv" and k in P and not gleich(W.get(k), P[k])]
    return {"gewerk": r["gewerk"] or "", "kg": str(W.get("kg") or ""), "abgabe": W.get("abgabe") or "", "zeit": W.get("abgabe_zeit") or "",
            "bindefrist": W.get("bindefrist") or "", "vertrag": W.get("vertragsart") or "", "grundlage": W.get("vb_vertragsgrundlage") or "",
            "strafe": W.get("vb_vertragsstrafe") or "", "abweichend": abw, "quelle": {k: Q[k] for k in ("abgabe", "bindefrist", "vertragsart", "vb_vertragsstrafe") if k in Q}}


def hoch(c, pid, werte, angleichen=(), wer=""):
    """Werte ans Projekt; LVs mit gleichem Wert erben ab jetzt; „angleichen“ nimmt den eigenen Wert auch bei abweichenden weg."""
    neu = {AS.PRAEFIX + k: v for k, v in werte.items() if k in AS.ERBT or k == AS.REGEL}
    with versionen.aenderung(c, f"bp:projektdaten:{pid}", wer):
        stammdaten.projekt_schreiben(c, pid, neu, wer)
    n = 0
    for x in _lvs(c, pid):
        V = _j(x["vergabe"], {}) or {}
        if _vergeben(V):
            continue
        D = _j(x["data"], {}) or {}
        M = dict(D.get("meta") or {})
        weg = [k for k, v in werte.items() if eigen(M, k) and (gleich(M[k], v) or x["id"] in angleichen)]
        if weg:
            versionen.vor(c, f"avalv:{x['id']}")
            for k in weg:
                M.pop(k, None)
            D["meta"] = M
            c.execute("UPDATE ava_lv SET data=?, updated=?, updated_by=? WHERE id=?", (json.dumps(D, ensure_ascii=False), _now(), wer, x["id"]))
            versionen.nach(c, f"avalv:{x['id']}", wer)
            n += 1
    return n


@app.get("/api/lv/<int:i>/ebenen")
def lv_ebenen(i):
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        return jsonify(fuers_projekt=fuers_projekt(c, r), steckbrief=steckbrief(c, r), projekt_id=r["project_id"])


@app.post("/api/lv/<int:i>/ebenen/nur-lv")
def lv_nur_lv(i):
    """„Nein, nur dieses LV“: für diese Felder nicht wieder fragen."""
    ks = [k for k in (request.get_json(silent=True) or {}).get("felder") or [] if k in AS.ERBT]
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        D = _j(r["data"], {}) or {}
        M = dict(D.get("meta") or {})
        M["_nur_lv"] = sorted(set(M.get("_nur_lv") or []) | set(ks))
        D["meta"] = M
        c.execute("UPDATE ava_lv SET data=? WHERE id=?", (json.dumps(D, ensure_ascii=False), i))
        return jsonify(ok=True)


@app.get("/api/projekt/<int:pid>/ebenen/vorschlag")
def projekt_vorschlag(pid):
    """B1 (zweiter Teil): Angaben, die bisher nur in einem LV stehen (oder in mehreren gleich) – beim Anlegen eines weiteren LV fragen."""
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        P, L = AS.projekt(c, pid), _lvs(c, pid)
        werte, wo = {}, {}
        for x in L:
            M = (_j(x["data"], {}) or {}).get("meta") or {}
            if _vergeben(_j(x["vergabe"], {}) or {}) or set(M.get("_nur_lv") or []) >= set(AS.ERBT):
                continue
            for k in AS.ERBT:
                if k in AS.VORSCHLAG or k in P or k in (M.get("_nur_lv") or []) or not eigen(M, k):
                    continue
                werte.setdefault(k, M[k])   # das erste LV gibt den Wert vor, abweichende werden Konflikte
                wo.setdefault(k, []).append(f"LV {x['nr']} {x['name']}".strip())
        K = konflikte(c, pid, werte)
        return jsonify(felder=[{**_zeile(k, v, K), "lvs": wo[k]} for k, v in werte.items()])


@app.post("/api/projekt/<int:pid>/ebenen/hoch")
def projekt_hoch(pid):
    b = request.get_json(silent=True) or {}
    werte = {k: v for k, v in (b.get("werte") or {}).items() if k in AS.ERBT or k == AS.REGEL}
    ang = {int(x) for x in b.get("angleichen") or [] if str(x).isdigit()}
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        if not werte:
            return jsonify(error="Nichts zu übernehmen."), 400
        if b.get("pruefen"):   # C1: erst zeigen, welche LVs abweichen
            K = konflikte(c, pid, werte, ohne=b.get("lv"))
            return jsonify(felder=[_zeile(k, v, K) for k, v in werte.items()])
        n = hoch(c, pid, werte, ang, g.user["name"])
        return jsonify(ok=True, lvs=n, felder=len(werte))
