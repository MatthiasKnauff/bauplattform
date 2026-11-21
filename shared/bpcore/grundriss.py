"""Grundriss des Gebäudemodells (GO 20.11.2026, Mock „Gebäudemodell schlank“ A1; Räume annehmen A1 B1 C1 D1): je Geschoss die Flächen
zwischen den Wänden aus dem IFC des gültigen Planstands (raumsuche.raeume) – mit dem Raum, der dort liegt (IfcSpace des Plans oder ein schon
ermittelter Raum), sonst „frei“: eine Fläche ohne Raum, die man im Grundriss per Klick als Raum annimmt (Ergänzung neben dem Plan,
modell_plus). Gerechnet einmal je Planstand und gemerkt in bp_store („gm:grundriss:<Planstand>“) – nur Umrisse, nie die Datei.

berechnen(raw) → {"geschosse": [{"n", "z"}], "flaechen": [{"g", "umriss": [[x, y] m], "flaeche", "z", "hoehe", "raum": {"nr", "name"} | None}]}
GET /api/bp/modell/<pid>/grundriss → {"art": "ifc", …berechnen} | {"art": "", "flaechen": []} (ohne IFC: nur die 3D-Ansicht zeichnet)
"""
import json

STAND = 1   # Fassung der gemerkten Rechnung


def berechnen(raw):
    from .cadimport import _innen
    from .raumsuche import _Netz, raeume
    R = raeume(raw)
    N = _Netz(raw)
    from .netz import geschosse
    G = [{"n": str(g["n"]).strip()[:40], "z": g["z"]} for g in geschosse(N)[0]]
    boeden = []   # (z, Umriss, nr, name) der IfcSpace – Boden = waagrechte Fläche ganz unten
    for i, a in N.E.alle("IFCSPACE"):
        try:
            F, _ = N.flaechen(i)
        except Exception:   # noqa: BLE001 – unlesbare Geometrie: Raum ohne Umriss
            continue
        P = [p for f in F for p in f]
        if not P:
            continue
        z0 = min(p[2] for p in P)
        nr, lang = str(a[2] or "").strip()[:40], (str(a[7] or "").strip() if len(a) > 7 else "")[:80]
        for f in F:
            if len(f) >= 3 and max(p[2] for p in f) - min(p[2] for p in f) < 0.01 and abs(f[0][2] - z0) < 0.05:
                boeden.append((z0, [(p[0], p[1]) for p in f], nr, lang))
    out = []
    for r in R:
        U = r.get("umriss") or []
        if not U:
            continue
        cx, cy = sum(p[0] for p in U) / len(U), sum(p[1] for p in U) / len(U)
        if not _innen(cx, cy, [tuple(p) for p in U]):   # L-Form: ein Punkt im Umriss
            cx, cy = U[0][0] * 0.9 + cx * 0.1, U[0][1] * 0.9 + cy * 0.1
        z = r.get("z") or 0
        sp = next(((nr, lang) for z0, Q, nr, lang in boeden if abs(z0 - z) < 1.0 and _innen(cx, cy, Q)), None)
        g = next((k for k, x in enumerate(G) if x["n"] == r.get("geschoss")), 0)
        out.append({"g": g, "umriss": U, "flaeche": r["flaeche"], "z": z, "hoehe": r.get("hoehe") or 2.5, "mitte": [round(cx, 3), round(cy, 3)],
                    "raum": {"nr": sp[0], "name": sp[1]} if sp else None})
    return {"geschosse": G, "flaechen": out}


def routen(bp, mit, lesen_modell):
    from flask import jsonify

    from . import planstand as P

    @bp.get("/api/bp/modell/<int:pid>/grundriss")
    def modell_grundriss(pid):
        def tun(c, wer):
            Q = ((lesen_modell(c, pid)["modell"].get("bauteilliste") or {}).get("quelle")) or {}
            sid = Q.get("planstand")
            if not sid or (Q.get("art") or "ifc") != "ifc":
                return jsonify(art=Q.get("art") or "", geschosse=[], flaechen=[])
            key = f"gm:grundriss:{int(sid)}"
            r = c.execute("SELECT data FROM bp_store WHERE key=?", (key,)).fetchone()
            if r:
                try:
                    d = json.loads(r["data"])
                    if d.get("stand") == STAND:
                        return jsonify(art="ifc", **{k: d[k] for k in ("geschosse", "flaechen")})
                except (ValueError, TypeError):
                    pass
            datei = P.datei_lesen(c, pid, sid)
            if not datei:
                return jsonify(art="ifc", geschosse=[], flaechen=[], hinweis="Für diesen Planstand ist die Datei nicht gespeichert – bitte noch einmal einlesen.")
            try:
                d = berechnen(datei[1])
            except Exception:   # noqa: BLE001 – ohne lesbare Geometrie kein Grundriss
                return jsonify(art="ifc", geschosse=[], flaechen=[], hinweis="Aus diesem Plan ließ sich kein Grundriss rechnen.")
            c.execute("INSERT INTO bp_store(key, data) VALUES(?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data", (key, json.dumps({**d, "stand": STAND})))
            return jsonify(art="ifc", **d)
        return mit(pid, tun)
