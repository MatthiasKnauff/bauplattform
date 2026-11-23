"""Bauzeitenplan – der Leistungskatalog lernt aus den Plänen des Büros (Mock „Leistungskatalog: Abhängigkeiten“ C + K3-A, K7; GO 22.11.2026).

Grundlage je Plan (gantt_projects.data.tasks), nie eine externe KI:
- Dauer: Leistungen des Assistenten (cat, Vorschlag t.vs) mit anderer Dauer als vorgeschlagen (von Hand geändert) oder überzogen
  (t.ueber = {at, grund}; zählt nur mit Grund „leistung“ – Wetter, Firma, Bauherrschaft, anderes nicht). Verhältnis Ist ÷ Soll, wenn der
  Plan ein festgehaltenes Soll hat (Mock „Soll und Ist“ SI-7: dieselbe Leistung – uid – im Soll), sonst Ist ÷ Vorschlag.
- Abhängigkeit: von Hand dazugehängte Vorgänger zwischen zwei Leistungen des Katalogs (nicht im Vorschlag t.vs.pl).
- Eigene Leistungen (ohne cat) mit gleichem Namen in mehreren Plänen.
Ein Vorschlag entsteht ab MIN Plänen; die Seite (library.js) ordnet ihn dem Katalog zu und zeigt ihn zum Übernehmen (K3-A – nie
automatisch). „Nicht mehr vorschlagen“ merkt sich Store „catlern_nein“.

GET /api/catlernen → {dauer: {cat: [{p, f}]}, links: {"von>nach": [p]}, eigene: {name: {n, gw, d, p: [...]}}, nein: [...]}
PUT /api/catlernen/nein {schluessel}
"""
import json
import re

MIN = 2
GRUENDE = ("leistung", "wetter", "firma", "bauherr", "anders")


def _basis(cat):
    return str(cat or "").split("~")[0]


def auswerten(zeilen):
    """zeilen = [(Planname, data-Dict[, Soll-data-Dict])] → Rohdaten der Vorschläge (je Plan höchstens ein Eintrag je Leistung/Paar/Name)."""
    dauer, links, eigene = {}, {}, {}
    for z in zeilen:
        name, d, soll = z[0], z[1], (z[2] if len(z) > 2 else None)
        T = d.get("tasks") if isinstance(d, dict) and isinstance(d.get("tasks"), list) else []
        S = {t.get("uid"): float(t.get("dur") or 0) for t in ((soll or {}).get("tasks") or []) if isinstance(t, dict)} if isinstance(soll, dict) else {}
        cat_von = {t.get("uid"): _basis(t.get("cat")) for t in T if isinstance(t, dict) and t.get("cat") and not str(t.get("cat")).startswith("_")}
        gesehen_d, gesehen_l, gesehen_e = set(), set(), set()
        for t in T:
            if not isinstance(t, dict):
                continue
            cat = _basis(t.get("cat"))
            vs = t.get("vs") if isinstance(t.get("vs"), dict) else None
            basis = S.get(t.get("uid")) or (float(vs["d"]) if vs and (vs.get("d") or 0) > 0 else 0)   # SI-7: Soll vor Vorschlag
            if cat and not cat.startswith("_") and basis > 0 and cat not in gesehen_d:
                u = t.get("ueber") if isinstance(t.get("ueber"), dict) else {}
                ist = float(t.get("dur") or 0) + (float(u.get("at") or 0) if u.get("grund") == "leistung" else 0)
                if ist > 0 and abs(ist - basis) >= 0.5:
                    dauer.setdefault(cat, []).append({"p": name, "f": round(ist / basis, 3)})
                    gesehen_d.add(cat)
            if cat and not cat.startswith("_") and vs:
                vor = {p.get("uid") for p in (vs.get("pl") or []) if isinstance(p, dict)}
                for p in t.get("preds") or []:
                    if not isinstance(p, dict) or p.get("uid") in vor:
                        continue
                    von = cat_von.get(p.get("uid"))
                    k = f"{von}>{cat}"
                    if von and von != cat and k not in gesehen_l:
                        links.setdefault(k, []).append(name)
                        gesehen_l.add(k)
            if not t.get("cat") and not t.get("ms") and (t.get("lvl") or 0) > 0 and (t.get("dur") or 0) > 0:
                n = re.sub(r"\s+", " ", str(t.get("name") or "")).strip()
                k = n.lower()
                if 3 <= len(n) <= 120 and k not in gesehen_e:
                    e = eigene.setdefault(k, {"n": n, "gw": str(t.get("gw") or "")[:80], "d": t.get("dur"), "p": []})
                    e["p"].append(name)
                    gesehen_e.add(k)
    return {"dauer": {k: v for k, v in dauer.items() if len(v) >= MIN},
            "links": {k: v for k, v in links.items() if len(v) >= MIN},
            "eigene": {k: v for k, v in eigene.items() if len(v["p"]) >= MIN}}


def einbinden(app, *, store_get, store_put, uname, body, darf):
    from flask import jsonify

    from bpcore import db

    @app.get("/api/catlernen")
    def catlernen():
        with db.tx() as c:
            Z, soll = [], {}
            for v in c.execute("SELECT gantt_id, meta, data FROM gantt_versions ORDER BY created, id").fetchall():   # je Plan das jüngste Soll (SI-7)
                try:
                    m = json.loads(v["meta"] or "{}")
                    if m.get("soll") and not m.get("soll_aus"):   # zurückgenommene zählen nicht
                        soll[v["gantt_id"]] = json.loads(v["data"] or "{}")
                except (TypeError, ValueError):
                    continue
            for r in c.execute("SELECT id, name, data FROM gantt_projects").fetchall():
                try:
                    Z.append((r["name"] or "Plan", json.loads(r["data"] or "{}"), soll.get(r["id"])))
                except (TypeError, ValueError):
                    continue
            nein = store_get(c, "catlern_nein", [])
            return jsonify({**auswerten(Z), "nein": nein if isinstance(nein, list) else []})

    @app.put("/api/catlernen/nein")
    def catlernen_nein():
        if not darf():
            return jsonify(error="Den Leistungskatalog für alle Projekte darfst du nicht ändern."), 403
        k = str((body() or {}).get("schluessel") or "")[:160]
        if not k:
            return jsonify(error="Schlüssel fehlt."), 400
        with db.tx() as c:
            L = store_get(c, "catlern_nein", [])
            L = (L if isinstance(L, list) else []) + ([k] if k not in (L or []) else [])
            store_put(c, "catlern_nein", L[-2000:], uname())
            return jsonify(nein=L)
