"""Innenwände, Treppen und Räume im Gebäude-Baukasten (Etappe 5 „Gebäudemodell neu“ – GO 22.11.2026, Mock „Etappe 5“: G1-A G2-A G3-A G4-A).

Ohne Plan entsteht das Innere im Grundriss: eine gezogene Linie ist eine Innenwand (Typ aus dem Korb bzw. Vorgabe IW), ein gezogenes Rechteck
eine Treppe (Form, Material, Steigungen; Deckenloch in der Decke darüber). Räume ergeben sich aus den Wänden – je Geschoss (Körper) die
Flächen zwischen Außen- und Innenwänden (Raster 5 cm, Umriss aus den Rasterkanten); Namen hängen an einem Punkt in der Fläche (wie raumweg).

bk["innen"]   = [{id, k, a: [x, y], b: [x, y], korb?}]                      Innenwand im Körper k (Geschoss eines Gebäudeteils)
bk["treppen"] = [{id, k, x, y, w, l, r: xp|xm|yp|ym, form, mat, stg}]       Treppe im Körper k, Laufrichtung r, Steigungen stg
bk["rnamen"]  = [{k, p: [x, y], name, offen?}]                              Name eines Raums; offen = bis unters Dach (keine Decke darüber)

sauber(bk, ids) · raeume(bk) → [{nr, name, flaeche, umfang, hoehe, geschoss, teil, k, umriss, mitte, offen}] · zeilen(bk, korb, name, vl) · deckenloch(bk)
"""
import math

from .wert import kurz as _s

IWID = 9_600_000 + 700_000   # Innenwände im Netz (wie IWID im Baustein)
TRID = 9_600_000 + 600_000   # Treppen im Netz (wie TRID im Baustein)
FORMEN = ("gerade", "viertel", "halb", "wendel")
FORM_NAME = {"gerade": "gerade", "viertel": "viertelgewendelt (L)", "halb": "halbgewendelt (U)", "wendel": "Wendeltreppe"}
MAT = ("stahlbeton", "holz", "stahl", "stahlholz")
MAT_NAME = {"stahlbeton": "Stahlbeton", "holz": "Holz", "stahl": "Stahl", "stahlholz": "Stahl mit Holzstufen"}
RICHT = ("xp", "xm", "yp", "ym")
AUSSEN = 0.365   # Dicke der Außenwand, solange der Korb nichts anderes sagt (wie DICKE.wand im Baustein)
INNEN = 0.115    # Dicke der Innenwand (wie DICKE.innen im Baustein)
RASTER = 0.05
VORGABE_IW = "341.01"


def _f(v, lo=-500.0, hi=500.0, nd=3):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return lo
    return lo if math.isnan(x) else round(min(hi, max(lo, x)), nd)


def _pt(p):
    return [_f(p[0]), _f(p[1])] if isinstance(p, (list, tuple)) and len(p) == 2 else None


def sauber(bk, ids):
    """Eingabe des Browsers → gültige Innenwände, Treppen, Raumnamen (nur in vorhandenen Körpern)."""
    I = []
    for x in (bk.get("innen") if isinstance(bk.get("innen"), list) else [])[:400]:
        if not isinstance(x, dict) or x.get("k") not in ids or not _s(x.get("id"), 12):
            continue
        a, b = _pt(x.get("a")), _pt(x.get("b"))
        if a and b and math.hypot(b[0] - a[0], b[1] - a[1]) >= 0.2:
            I.append({"id": _s(x["id"], 12), "k": x["k"], "a": a, "b": b, **({"korb": _s(x["korb"], 12)} if _s(x.get("korb"), 12) else {})})
    T = []
    for x in (bk.get("treppen") if isinstance(bk.get("treppen"), list) else [])[:40]:
        if not isinstance(x, dict) or x.get("k") not in ids or not _s(x.get("id"), 12):
            continue
        T.append({"id": _s(x["id"], 12), "k": x["k"], "x": _f(x.get("x")), "y": _f(x.get("y")), "w": _f(x.get("w"), 0.6, 8, 2), "l": _f(x.get("l"), 0.6, 12, 2),
                  "r": x.get("r") if x.get("r") in RICHT else "xp", "form": x.get("form") if x.get("form") in FORMEN else "gerade",
                  "mat": x.get("mat") if x.get("mat") in MAT else "stahlbeton", "stg": int(_f(x.get("stg"), 0, 40, 0))})
    N = []
    for x in (bk.get("rnamen") if isinstance(bk.get("rnamen"), list) else [])[:400]:
        p = _pt((x or {}).get("p")) if isinstance(x, dict) else None
        if p and x.get("k") in ids and (_s(x.get("name"), 80) or x.get("offen")):
            N.append({"k": x["k"], "p": p, "name": _s(x.get("name"), 80), **({"offen": True} if x.get("offen") else {})})
    return {**({"innen": I} if I else {}), **({"treppen": T} if T else {}), **({"rnamen": N} if N else {})}


def steigungen(k, t):
    """Steigungen der Treppe: angegeben, sonst aus der Geschosshöhe (Steigung um 17,5 cm)."""
    return t.get("stg") or max(2, round((k["h"] + 0.2) / 0.175))


def schrittmass(k, t):
    """(Steigung, Auftritt, Schrittmaß) in cm – Auftritt aus der Lauflänge (gerade Treppe); nur ein Hinweis, keine Planung nach DIN 18065."""
    n = steigungen(k, t)
    s = (k["h"] + 0.2) / n * 100
    lauf = t["l"] if t["r"] in ("xp", "xm") else t["w"]
    a = lauf / max(1, n - 1) * 100
    return round(s, 1), round(a, 1), round(2 * s + a, 1)


def _seg_abstand(px, py, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    L2 = dx * dx + dy * dy or 1e-9
    t = max(0.0, min(1.0, ((px - a[0]) * dx + (py - a[1]) * dy) / L2))
    return math.hypot(px - a[0] - t * dx, py - a[1] - t * dy)


def _umriss(Z, nx, x0, y0):
    """Umriss einer Zellmenge (Rasterkanten zu einem Vieleck verkettet, gerade Stücke zusammengefasst) – das längste Vieleck."""
    E = {}
    for (i, j) in Z:
        for (a, b, n) in (((i, j), (i + 1, j), (i, j - 1)), ((i + 1, j), (i + 1, j + 1), (i + 1, j)), ((i + 1, j + 1), (i, j + 1), (i, j + 1)), ((i, j + 1), (i, j), (i - 1, j))):
            if n not in Z:
                E[a] = b
    best = []
    while E:
        s, P = next(iter(E)), []
        p = s
        while p in E:
            P.append(p)
            p = E.pop(p)
        Q = [q for n, q in enumerate(P) if (P[n - 1][0] - q[0]) * (P[(n + 1) % len(P)][1] - q[1]) != (P[n - 1][1] - q[1]) * (P[(n + 1) % len(P)][0] - q[0])]
        if len(Q) > len(best):
            best = Q
    return [[round(x0 + i * RASTER, 3), round(y0 + j * RASTER, 3)] for i, j in best]


def raeume(bk):
    """Räume je Körper: Flächen zwischen den Außenwänden (innen) und den Innenwänden, ab 1 m²; Name/offen aus rnamen (Punkt in der Fläche)."""
    from .baukasten import geschoss_kurz
    K = bk.get("koerper") or []
    TN = bk.get("teile") or {}
    out, nr = [], {}
    for k in K:
        W = [w for w in bk.get("innen") or [] if w["k"] == k["id"]]
        x0, y0 = k["x"] + AUSSEN, k["y"] + AUSSEN
        nx, ny = int(round((k["w"] - 2 * AUSSEN) / RASTER)), int(round((k["d"] - 2 * AUSSEN) / RASTER))
        if nx < 4 or ny < 4:
            continue
        frei = {(i, j) for i in range(nx) for j in range(ny)}
        r = INNEN / 2 + RASTER / 2
        for w in W:   # je Wand nur die Zellen in ihrem Umfeld prüfen
            i0, i1 = max(0, int((min(w["a"][0], w["b"][0]) - r - x0) / RASTER)), min(nx, int((max(w["a"][0], w["b"][0]) + r - x0) / RASTER) + 1)
            j0, j1 = max(0, int((min(w["a"][1], w["b"][1]) - r - y0) / RASTER)), min(ny, int((max(w["a"][1], w["b"][1]) + r - y0) / RASTER) + 1)
            for i in range(i0, i1):
                for j in range(j0, j1):
                    if _seg_abstand(x0 + (i + 0.5) * RASTER, y0 + (j + 0.5) * RASTER, w["a"], w["b"]) <= r:
                        frei.discard((i, j))
        gesch = geschoss_kurz(k, K)
        while frei:
            st = frei.pop()
            Z, offen_ = {st}, [st]
            while offen_:
                i, j = offen_.pop()
                for n in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                    if n in frei:
                        frei.discard(n)
                        Z.add(n)
                        offen_.append(n)
            fl = len(Z) * RASTER * RASTER
            if fl < 1.0:
                continue
            U = _umriss(Z, nx, x0, y0)
            umfang = sum(math.hypot(U[n][0] - U[n - 1][0], U[n][1] - U[n - 1][1]) for n in range(len(U)))
            ci = sorted(Z)[len(Z) // 2]
            mitte = [round(x0 + (ci[0] + 0.5) * RASTER, 3), round(y0 + (ci[1] + 0.5) * RASTER, 3)]
            rn = next((r for r in bk.get("rnamen") or [] if r["k"] == k["id"] and (int((r["p"][0] - x0) / RASTER), int((r["p"][1] - y0) / RASTER)) in Z), None)
            nr[gesch] = nr.get(gesch, 0) + 1
            st = "0" if gesch == "EG" else gesch.split(".")[0] if gesch.endswith("OG") else "-1" if gesch == "KG" else "-" + gesch.split(".")[0]
            out.append({"nr": f"{st}.{nr[gesch]:02d}", "name": (rn or {}).get("name") or "Raum", "flaeche": round(fl, 2),
                        "umfang": round(umfang, 2), "hoehe": k["h"], "geschoss": gesch, "teil": TN.get(k["teil"], k["teil"]), "k": k["id"],
                        "umriss": U, "mitte": mitte, **({"offen": True} if (rn or {}).get("offen") else {})})
    return out


def ueber(k, K):
    """Körper direkt über k (gleicher Gebäudeteil)."""
    return next((q for q in K if q["teil"] == k["teil"] and abs(q["z"] - (k["z"] + k["h"])) < 0.01), None)


def deckenloch(bk):
    """Fläche, um die die Decke über einer Treppe kleiner wird: {Körper darüber: m²}."""
    K = bk.get("koerper") or []
    out = {}
    for t in bk.get("treppen") or []:
        k = next((q for q in K if q["id"] == t["k"]), None)
        o = ueber(k, K) if k else None
        if o:
            out[o["id"]] = out.get(o["id"], 0.0) + t["w"] * t["l"]
    return out


def zeilen(bk, korb, name, vl, add):
    """Innenwände (Länge × Geschosshöhe, je Typ im Korb) und Treppen (1 St je Treppe, Name mit Form/Material/Steigungen) über add() von rohbau."""
    K = {k["id"]: k for k in bk.get("koerper") or []}
    for n, w in enumerate(bk.get("innen") or []):
        k = K.get(w["k"])
        if not k:
            continue
        kid = w.get("korb")
        v = vl(kid, VORGABE_IW)
        add(k["teil"], v.split(".")[0] if "." in v else "341", "Wand", f"Innenwand – {name(kid, v)}", v, math.hypot(w["b"][0] - w["a"][0], w["b"][1] - w["a"][1]) * k["h"],
            [IWID + n], False, kid)
    for n, t in enumerate(bk.get("treppen") or []):
        k = K.get(t["k"])
        if not k:
            continue
        add(k["teil"], "351", "Treppe", f"Treppe {FORM_NAME[t['form']]}, {MAT_NAME[t['mat']]}, {steigungen(k, t)} Steigungen", "", 1, [TRID + n], False, "", einheit="St", je=t["id"])


def grundriss(bk):
    """Grundriss aus dem Baukasten (GET …/grundriss, art „baukasten“): je Geschoss Körper (Außenkante), Innenwände, Treppen, Räume."""
    from .baukasten import geschoss_kurz
    K = bk.get("koerper") or []
    zs = sorted({(geschoss_kurz(k, K), k["z"]) for k in K}, key=lambda x: x[1])
    G, gi = [], {}
    for n, z in zs:
        if n not in gi:
            gi[n] = len(G)
            G.append({"n": {"EG": "Erdgeschoss", "KG": "Kellergeschoss"}.get(n, n.replace("OG", ". Obergeschoss").replace("..", ".").replace("UG", ". Untergeschoss")), "z": z})
    g = {k["id"]: gi[geschoss_kurz(k, K)] for k in K}
    KK = {k["id"]: k for k in K}
    return {"geschosse": G,
            "koerper": [{"k": k["id"], "g": g[k["id"]], "x": k["x"], "y": k["y"], "w": k["w"], "d": k["d"], "h": k["h"], "aussen": AUSSEN} for k in K],
            "innen": [dict(w, g=g[w["k"]]) for w in bk.get("innen") or []],
            "treppen": [dict(t, g=g[t["k"]], stg=steigungen(KK[t["k"]], t), schritt=schrittmass(KK[t["k"]], t)) for t in bk.get("treppen") or []],
            "flaechen": [{"g": g[r["k"]], "k": r["k"], "umriss": r["umriss"], "flaeche": r["flaeche"], "mitte": r["mitte"], "raum": {"nr": r["nr"], "name": r["name"]},
                          **({"offen": True} if r.get("offen") else {})} for r in raeume(bk)]}
