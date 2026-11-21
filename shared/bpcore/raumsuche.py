"""Räume aus den Wänden ermitteln (GO 16.11.2026): Hat ein IFC keine Räume (IfcSpace – Allplan gibt sie nur mit, wenn man es beim Export
einschaltet), sucht der Kern sie selbst. Je Geschoss werden Wände, Stützen, Fenster und Türen von oben ins Raster gezeichnet (Körper ohne
Öffnungen – der Sturz schließt die Tür), das Außen von den Rändern her geflutet; jede übrige geschlossene Fläche ab 1 m² ist ein Raum.

raeume(raw) → [{"id", "nr", "name": "Raum", "flaeche", "umfang", "hoehe", "geschoss", "z", "umriss": [[x, y], …], "ermittelt": True}]
  id: 990000000 + k (gibt es im IFC nicht – so kann die Liste die Räume Fenstern und Türen zuordnen und beim Ausgeben neue IfcSpace anlegen)
ins_ifc(E, neu, OH, raeume) – legt beim „IFC mit Maßnahmen ausgeben“ für ermittelte Räume echte IfcSpace an (Extrusion des Umrisses).

Grenzen: Offene Grundrisse ohne Wand dazwischen werden ein Raum; Namen kennt die Geometrie nicht („Raum“, umbenennen in der Liste).
Fläche und Umfang aus dem Umriss im Raster (Zelle 5 cm, große Gebäude gröber) – „ermittelt“, nicht aufgemessen.
"""
import math
import re

from .netz import _Netz

ID0 = 990000000
HINDERNIS = ("IFCWALL", "IFCWALLSTANDARDCASE", "IFCWALLELEMENTEDCASE", "IFCCURTAINWALL", "IFCCOLUMN", "IFCCOLUMNSTANDARDCASE",
             "IFCDOOR", "IFCDOORSTANDARDCASE", "IFCWINDOW", "IFCWINDOWSTANDARDCASE")
WAND = HINDERNIS[:4]
MIN_FL = 1.0


def _flaeche(P):
    return sum(P[k - 1][0] * P[k][1] - P[k][0] * P[k - 1][1] for k in range(len(P))) / 2


def _dp(P, tol):   # Douglas-Peucker für geschlossene Umrisse (Treppen der Rasterkanten an schrägen Wänden glätten)
    if len(P) < 5:
        return P
    def ab(p, a, b):
        L = math.dist(a, b)
        return math.dist(p, a) if L == 0 else abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / L

    def teil(Q):
        if len(Q) < 3:
            return Q
        k, d = max(((j, ab(Q[j], Q[0], Q[-1])) for j in range(1, len(Q) - 1)), key=lambda x: x[1])
        return teil(Q[:k + 1])[:-1] + teil(Q[k:]) if d > tol else [Q[0], Q[-1]]
    w = max(range(len(P)), key=lambda j: math.dist(P[0], P[j]))   # an zwei weit entfernten Punkten teilen
    A = teil(P[:w + 1])
    B = teil(P[w:] + [P[0]])
    return A[:-1] + B[:-1]


def _versatz(P, d):   # Umriss um d nach außen schieben (Ecken auf der Winkelhalbierenden)
    if _flaeche(P) < 0:
        P = P[::-1]
    out, n = [], len(P)
    for k in range(n):
        a, b, c_ = P[k - 1], P[k], P[(k + 1) % n]
        e1, e2 = (b[0] - a[0], b[1] - a[1]), (c_[0] - b[0], c_[1] - b[1])
        l1, l2 = math.hypot(*e1) or 1, math.hypot(*e2) or 1
        n1, n2 = (e1[1] / l1, -e1[0] / l1), (e2[1] / l2, -e2[0] / l2)   # außen (rechts bei Gegenuhrzeigersinn)
        s = 1 + n1[0] * n2[0] + n1[1] * n2[1]
        f = d / s if s > 0.2 else d
        out.append((b[0] + (n1[0] + n2[0]) * f, b[1] + (n1[1] + n2[1]) * f))
    return out


def _zeichnen(gitter, nx, ny, x0, y0, c, poly):
    """Polygon (2D, m) ins Raster: jede berührte Zelle wird belegt (drei Abtastlinien je Zeile, Zellen angeschnitten → belegt)."""
    ys = [p[1] for p in poly]
    j0, j1 = max(0, int((min(ys) - y0) / c)), min(ny - 1, int((max(ys) - y0) / c))
    n = len(poly)
    for j in range(j0, j1 + 1):
        lo, hi = None, None
        for yy in (y0 + j * c + 0.001, y0 + (j + 0.5) * c, y0 + (j + 1) * c - 0.001):
            X = []
            for k in range(n):
                (xa, ya), (xb, yb) = poly[k - 1], poly[k]
                if (ya > yy) != (yb > yy):
                    X.append(xa + (yy - ya) * (xb - xa) / (yb - ya))
            X.sort()
            for a, b in zip(X[0::2], X[1::2]):
                lo = a if lo is None else min(lo, a)
                hi = b if hi is None else max(hi, b)
                i0, i1 = max(0, int((a - x0) / c)), min(nx - 1, int((b - x0) / c))
                r = j * nx
                for i in range(i0, i1 + 1):
                    gitter[r + i] = 1
        if lo is None:   # sehr dünne Fläche zwischen den Abtastlinien
            xs = [p[0] for p in poly if y0 + j * c - c <= p[1] <= y0 + (j + 1) * c + c]
            if xs:
                for i in range(max(0, int((min(xs) - x0) / c)), min(nx - 1, int((max(xs) - x0) / c)) + 1):
                    gitter[j * nx + i] = 1


def _umrisse(zellen, nx):
    """Gerichtete Randkanten der Zellen (Inneres links) zu Ringen verketten → Liste von Ringen in Gitterpunkten."""
    Z = set(zellen)
    # ein Punkt kann zwei Kanten haben, wenn sich Zellen nur an einer Ecke berühren
    K = {}
    for z in Z:
        j, i = divmod(z, nx)
        if j == 0 or (z - nx) not in Z:
            K.setdefault((i, j), []).append((i + 1, j))
        if i == nx - 1 or (z + 1) not in Z:
            K.setdefault((i + 1, j), []).append((i + 1, j + 1))
        if (z + nx) not in Z:
            K.setdefault((i + 1, j + 1), []).append((i, j + 1))
        if i == 0 or (z - 1) not in Z:
            K.setdefault((i, j + 1), []).append((i, j))
    ringe = []
    while K:
        s = next(iter(K))
        R, p = [s], s
        while True:
            L = K.get(p)
            if not L:
                break
            q = L.pop()
            if not L:
                del K[p]
            if q == s:
                break
            R.append(q)
            p = q
        if len(R) >= 4:
            ringe.append(R)
    return ringe


def _gerade(R):   # Punkte auf einer Geraden weglassen
    out = []
    n = len(R)
    for k in range(n):
        a, b, c_ = R[k - 1], R[k], R[(k + 1) % n]
        if (b[0] - a[0]) * (c_[1] - b[1]) - (b[1] - a[1]) * (c_[0] - b[0]) != 0:
            out.append(b)
    return out


def _kurz(name, k):   # „Erdgeschoss“ → EG, „1. Obergeschoss“ → 1OG, „Keller“ → KG …
    s = (name or "").strip()
    for wort, kz in (("erdgeschoss", "EG"), ("obergeschoss", "OG"), ("untergeschoss", "UG"), ("kellergeschoss", "KG"), ("keller", "KG"), ("dachgeschoss", "DG"),
                     ("spitzboden", "SB")):
        if wort in s.lower():
            m = re.match(r"\s*(\d+)", s)
            return (m.group(1) if m else "") + kz
    m = re.match(r"\s*(KG|UG|EG|OG|DG|SB|\d+\.?\s*OG|\d+\.?\s*UG)\b", s, re.I)
    return re.sub(r"[\s.]", "", m.group(1)).upper() if m else f"G{k + 1}"


def raeume(raw):
    N = _Netz(raw)
    E = N.E
    from .netz import geschosse
    G, zu, tl = geschosse(N)   # Zuordnung zum Geschoss aus dem IFC – die Höhe allein trügt (Allplan: alle Geschosse auf gleicher Höhe)
    G = [{**g, "n": str(g["n"]).strip()[:40]} for g in G]
    if not G:
        G = [{"i": None, "n": "Gebäude", "z": -1e9}]
    teile = {k: [] for k in range(len(G))}   # Geschoss → [(Polygon 2D, Wand?, z0, z1)]
    for typ in HINDERNIS:
        for i in E.nach_typ.get(typ, []):
            try:
                F, _ = N.flaechen(i)
            except Exception:   # noqa: BLE001 – unlesbare Geometrie: Bauteil auslassen
                continue
            P = [p for f in F for p in f]
            if not P:
                continue
            z0, z1 = min(p[2] for p in P), max(p[2] for p in P)
            k = zu.get(i, zu.get(tl.get(i), zu.get(tl.get(tl.get(i)))))
            if k is None or not G[k]["i"]:
                k = max([k for k, g in enumerate(G) if g["z"] <= z0 + 0.3] or [0])
            for f in F:
                Q = [(p[0], p[1]) for p in f]
                if len(Q) >= 3 and abs(_flaeche(Q)) > 1e-4:
                    teile[k].append((Q, typ in WAND, z0, z1))
    out = []
    for k, T in teile.items():
        if not any(w for _, w, _, _ in T):
            continue
        xs = [p[0] for Q, _, _, _ in T for p in Q]
        ys = [p[1] for Q, _, _, _ in T for p in Q]
        w_, h_ = max(xs) - min(xs) + 2, max(ys) - min(ys) + 2
        c = max(0.05, math.sqrt(w_ * h_ / 600000))
        x0, y0 = min(xs) - 1, min(ys) - 1
        nx, ny = int(w_ / c) + 2, int(h_ / c) + 2
        gitter = bytearray(nx * ny)
        for Q, _, _, _ in T:
            _zeichnen(gitter, nx, ny, x0, y0, c, Q)
        hoehen = sorted(z1 - z0 for _, w, z0, z1 in T if w and z1 - z0 > 1.5)
        hoehe = round(hoehen[len(hoehen) // 2], 2) if hoehen else 2.5
        # Außen fluten (2 = außen), dann übrige freie Flächen als Räume
        stapel = [i for i in range(nx)] + [(ny - 1) * nx + i for i in range(nx)] + [j * nx for j in range(ny)] + [j * nx + nx - 1 for j in range(ny)]
        for s in stapel:
            if gitter[s] == 0:
                gitter[s] = 2
        while stapel:
            z = stapel.pop()
            j, i = divmod(z, nx)
            for q in ((z - 1) if i else -1, (z + 1) if i < nx - 1 else -1, z - nx, z + nx):
                if 0 <= q < nx * ny and gitter[q] == 0:
                    gitter[q] = 2
                    stapel.append(q)
        gef = []
        for s in range(nx * ny):
            if gitter[s] != 0:
                continue
            gitter[s] = 3
            zellen, st = [s], [s]
            while st:
                z = st.pop()
                j, i = divmod(z, nx)
                for q in ((z - 1) if i else -1, (z + 1) if i < nx - 1 else -1, z - nx, z + nx):
                    if 0 <= q < nx * ny and gitter[q] == 0:
                        gitter[q] = 3
                        zellen.append(q)
                        st.append(q)
            if len(zellen) * c * c < MIN_FL:
                continue
            ringe = [_gerade(R) for R in _umrisse(zellen, nx)]
            ringe = [R for R in ringe if len(R) >= 3]
            if not ringe:
                continue
            R = max(ringe, key=lambda R: abs(_flaeche(R)))
            P = _dp([(x0 + p[0] * c, y0 + p[1] * c) for p in R], c * 1.5)
            if len(P) < 3:
                continue
            P = _versatz(P, c / 2)   # das Raster schneidet im Mittel eine halbe Zelle je Seite ab
            um = sum(math.dist(P[m - 1], P[m]) for m in range(len(P)))
            fl = abs(_flaeche(P))
            cx, cy = sum(p[0] for p in P) / len(P), sum(p[1] for p in P) / len(P)
            gef.append((cy, cx, fl, um, P))
        gef.sort(key=lambda r: (-round(r[0], 0), r[1]))
        kz = _kurz(G[k]["n"], k)
        for m, (_, _, fl, um, P) in enumerate(gef):
            out.append({"id": ID0 + len(out), "nr": f"{kz}.{m + 1:02d}", "name": "Raum", "flaeche": round(fl, 2), "umfang": round(um, 2), "hoehe": hoehe,
                        "geschoss": G[k]["n"] if G[k]["i"] else "", "z": round(max(G[k]["z"], min(z0 for _, w, z0, _ in T if w)), 3),
                        "umriss": [[round(x, 3), round(y, 3)] for x, y in P], "ermittelt": True})
    return out


def luecken(raw):
    """Räume, die es im IFC nicht gibt, obwohl andere gezeichnet sind (18.11.2026: Wohnzimmer vergessen) – aus den Wänden ermittelt, nur wo kein
    IfcSpace liegt. → wie raeume(), mit "luecke": True."""
    from .cadimport import _innen
    N = _Netz(raw)
    boeden = []
    for i in N.E.nach_typ.get("IFCSPACE", []):
        F, _ = N.flaechen(i)
        P = [p for f in F for p in f]
        if not P:
            continue
        z0 = min(p[2] for p in P)
        for f in F:
            if len(f) >= 3 and max(p[2] for p in f) - min(p[2] for p in f) < 0.01 and abs(f[0][2] - z0) < 0.05:
                boeden.append((z0, [(p[0], p[1]) for p in f]))
    if not boeden:
        return []
    out = []
    for r in raeume(raw):
        U = r.get("umriss") or []
        if not U or r["flaeche"] < 2.0:
            continue
        cx, cy = sum(p[0] for p in U) / len(U), sum(p[1] for p in U) / len(U)
        if not _innen(cx, cy, [tuple(p) for p in U]):   # Schwerpunkt außerhalb (L-Form): ein Punkt im Umriss
            cx, cy = U[0][0] * 0.9 + cx * 0.1, U[0][1] * 0.9 + cy * 0.1
        z = r.get("z") or 0
        if any(abs(z0 - z) < 1.0 and _innen(cx, cy, Q) for z0, Q in boeden):
            continue
        out.append({**r, "luecke": True})
    return out


def lage(R):
    """Ermittelte Räume für die Zuordnung der Fenster und Türen (netz.elemente_lage): [(id, z0, z1, Umriss)]"""
    return [(r["id"], r["z"], r["z"] + (r.get("hoehe") or 2.5), [tuple(p) for p in r["umriss"]]) for r in R if r.get("umriss")]


# ------------------------------------------------------------------ zurück ins IFC (bauteilliste.ausgeben)
def ins_ifc(E, neu, OH, raeume_, guid, step):
    """Ermittelte Räume als IfcSpace anlegen: Umriss als Extrusion in Höhe des Raums, dem Geschoss (nach Name) zugeordnet.
    E: {Nr.: Text der Zeile}; neu(text) → Nr.; liefert die Zahl der angelegten Räume."""
    R = [r for r in raeume_ if r.get("umriss") and r.get("id", 0) >= ID0 and r["id"] not in E]
    if not R:
        return 0
    ctx = next((i for i, v in sorted(E.items()) if v.startswith("IFCGEOMETRICREPRESENTATIONCONTEXT(")), None)
    if not ctx:
        return 0
    f = 1.0   # Länge in Einheiten der Datei
    for v in E.values():
        if v.startswith("IFCSIUNIT(") and ".LENGTHUNIT." in v:
            f = 1000.0 if ".MILLI." in v else 100.0 if ".CENTI." in v else 1.0
            break
    stock = {}
    for i, v in E.items():
        if v.startswith("IFCBUILDINGSTOREY("):
            m = re.match(r"IFCBUILDINGSTOREY\('[^']*',[^,]*,'((?:[^']|'')*)'", v)
            if m:
                stock[m.group(1).replace("''", "'").strip()] = i
    zz = lambda x: f"{x * f:.6g}" if "." in f"{x * f:.6g}" or "e" in f"{x * f:.6g}" else f"{x * f:.6g}."   # noqa: E731 – STEP-Zahl mit Punkt
    oben = neu("IFCDIRECTION((0.,0.,1.))")
    x_ = neu("IFCDIRECTION((1.,0.,0.))")
    je = {}
    for r in R:
        o = neu(f"IFCCARTESIANPOINT(({zz(0)},{zz(0)},{zz(r['z'])}))")
        pl = neu(f"IFCLOCALPLACEMENT($,IFCAXIS2PLACEMENT3D(#{o},#{oben},#{x_}))")
        pts = [neu(f"IFCCARTESIANPOINT(({zz(x)},{zz(y)}))") for x, y in r["umriss"]]
        pts.append(pts[0])
        pl_ = neu(f"IFCPOLYLINE(({','.join('#%d' % p for p in pts)}))")
        prof = neu(f"IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,'{step(r['nr'])}',#{pl_})")
        o2 = neu(f"IFCCARTESIANPOINT(({zz(0)},{zz(0)},{zz(0)}))")
        lage_ = neu(f"IFCAXIS2PLACEMENT3D(#{o2},$,$)")
        kv = neu(f"IFCEXTRUDEDAREASOLID(#{prof},#{lage_},#{oben},{zz(r.get('hoehe') or 2.5)})")
        rep = neu(f"IFCSHAPEREPRESENTATION(#{ctx},'Body','SweptSolid',(#{kv}))")
        pds = neu(f"IFCPRODUCTDEFINITIONSHAPE($,$,(#{rep}))")
        sp = neu(f"IFCSPACE('{guid('raum' + str(r['id']) + r['nr'])}',{OH},'{step(r['nr'])}','{step("Raum ermittelt aus den Wänden (Bauplattform)")}',$,#{pl},#{pds},'{step(r['name'])}',.ELEMENT.,.INTERNAL.,$)")
        je.setdefault(stock.get((r.get("geschoss") or "").strip()), []).append(sp)
    for st, L in je.items():
        if st:
            neu(f"IFCRELAGGREGATES('{guid('raeume' + str(st))}',{OH},'{step("Räume")}',$,#{st},({','.join('#%d' % x for x in L)}))")
    return len(R)
