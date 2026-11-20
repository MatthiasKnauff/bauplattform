"""3D-Netz eines Planstands für den Betrachter (bp/ansicht3d.js) – GO 16.11.2026, Entwurf „Gebäudemodell als Mitte“, Punkt 20.

Der Kern rechnet das Modell einmal je Planstand in Dreiecke um (beim Einlesen), der Browser zeigt sie nur noch an. Gespeichert wird nur
dieses abgeleitete Netz (gzip, Tabelle pm_netz) – nie die Datei.

IFC: Körper der Bauteile (Extrusion, Brep, Dreiecks- und Polygonnetze, abgebildete Elemente wie Allplan-Fenster, Boolesche Körper mit dem
ersten Operanden), Platzierungen, Einheit (m/mm), Geschoss je Bauteil, Farbe aus dem Modell. Öffnungen werden aus senkrechten Wandflächen
ausgeschnitten, damit Fenster und Türen sichtbar sind.
DXF: Räume als Bodenplatten, Wandlinien als Wandscheiben (angenommene Höhe), Fenster/Türen nur als Zahl (keine Lage im Raum).

netz_ifc(raw) → {"e": [{"i": Objekt-Nr. im IFC, "t": w|f|d|s|r|x|o (o = Öffnung ohne Fenster/Tür), "h": Wand, in der Fenster/Tür/Öffnung sitzt, "g": Geschoss, "c": "#rrggbb", "v": [x, y, z, …] in cm}], "geschosse": [{"n", "z"}]}
packen(n) / auspacken(bytes)
"""
import gzip
import json
import math

from . import cadimport as CI

TYP = {"IFCWALL": "w", "IFCWALLSTANDARDCASE": "w", "IFCWALLELEMENTEDCASE": "w", "IFCCURTAINWALL": "w", "IFCWINDOW": "f", "IFCWINDOWSTANDARDCASE": "f",
       "IFCDOOR": "d", "IFCDOORSTANDARDCASE": "d", "IFCSLAB": "s", "IFCSLABSTANDARDCASE": "s", "IFCSLABELEMENTEDCASE": "s", "IFCROOF": "r",
       "IFCCOVERING": "x", "IFCCOLUMN": "x", "IFCCOLUMNSTANDARDCASE": "x", "IFCBEAM": "x", "IFCBEAMSTANDARDCASE": "x", "IFCSTAIR": "x", "IFCSTAIRFLIGHT": "x",
       "IFCRAILING": "x", "IFCMEMBER": "x", "IFCMEMBERSTANDARDCASE": "x", "IFCPLATE": "x", "IFCPLATESTANDARDCASE": "x", "IFCBUILDINGELEMENTPROXY": "x",
       "IFCFOOTING": "s", "IFCRAMP": "x", "IFCRAMPFLIGHT": "x", "IFCCHIMNEY": "x", "IFCSHADINGDEVICE": "x"}
STAND = 2   # Fassung des Netzes – ältere rechnet die Route aus der gespeicherten Datei neu (planstand.planstand_netz)
GRENZE = 400000   # höchstens so viele Dreiecke (große Modelle werden nicht vollständig, aber die Seite bleibt flott)


# ------------------------------------------------------------------ Vektoren und Lagen
def _n(v):
    l_ = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / l_ for x in v]


def _x(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


def _dot(a, b):
    return sum(x * y for x, y in zip(a, b))


class _M:   # Lage: Ursprung + drei Achsen (Spalten)
    __slots__ = ("o", "x", "y", "z")

    def __init__(self, o=(0, 0, 0), x=(1, 0, 0), y=(0, 1, 0), z=(0, 0, 1)):
        self.o, self.x, self.y, self.z = list(o), list(x), list(y), list(z)

    def p(self, q):
        q = list(q) + [0.0] * (3 - len(q))
        return [self.o[k] + self.x[k] * q[0] + self.y[k] * q[1] + self.z[k] * q[2] for k in range(3)]

    def r(self, q):   # nur drehen (Richtungen)
        return [self.x[k] * q[0] + self.y[k] * q[1] + self.z[k] * q[2] for k in range(3)]

    def nach(self, inner):   # self ∘ inner
        return _M(self.p(inner.o), self.r(inner.x), self.r(inner.y), self.r(inner.z))


class _Netz:
    def __init__(self, raw):
        t = raw.decode("latin-1") if isinstance(raw, (bytes, bytearray)) else str(raw)
        if "ISO-10303-21" not in t[:200]:
            raise ValueError("Keine IFC-Datei.")
        self.E = CI._Store(t)
        self.f = 1.0
        for _, a in self.E.alle("IFCSIUNIT"):
            if len(a) >= 4 and a[1] == ".LENGTHUNIT." and a[2] == ".MILLI.":
                self.f = 0.001
            elif len(a) >= 4 and a[1] == ".LENGTHUNIT." and a[2] == ".CENTI.":
                self.f = 0.01
        self.lp_cache, self.farbe = {}, {}
        for _, a in self.E.alle("IFCSTYLEDITEM"):
            if a and isinstance(a[0], tuple):
                c = self._stil(a[1] if len(a) > 1 else None)
                if c:
                    self.farbe[a[0][1]] = c

    def a(self, ref):
        e = self.E.get(ref[1]) if isinstance(ref, tuple) else None
        return e if e else (None, [])

    def _stil(self, styles, tiefe=0):
        for s in styles or []:
            if not isinstance(s, tuple) or tiefe > 3:
                continue
            typ, a = self.a(s)
            if typ == "IFCPRESENTATIONSTYLEASSIGNMENT":
                c = self._stil(a[0] if a else [], tiefe + 1)
                if c:
                    return c
            if typ == "IFCSURFACESTYLE" and len(a) >= 3:
                for st in a[2] or []:
                    t2, b = self.a(st)
                    if t2 in ("IFCSURFACESTYLERENDERING", "IFCSURFACESTYLESHADING") and b:
                        t3, rgb = self.a(b[0])
                        if t3 == "IFCCOLOURRGB" and len(rgb) >= 4:
                            d = CI._wert(b[1]) if len(b) > 1 else 0
                            return ("#%02x%02x%02x" % tuple(int(max(0, min(1, float(CI._wert(x) or 0))) * 255) for x in rgb[1:4]), float(d or 0) if isinstance(d, (int, float)) else 0.0)
        return None

    def pkt(self, ref):
        typ, a = self.a(ref)
        return [float(x) * self.f for x in (a[0] if a and isinstance(a[0], list) else [])] if typ == "IFCCARTESIANPOINT" else [0.0, 0.0, 0.0]

    def richtung(self, ref, d):
        typ, a = self.a(ref)
        return [float(x) for x in a[0]] if typ == "IFCDIRECTION" and a and isinstance(a[0], list) else d

    def a2p(self, ref):
        typ, a = self.a(ref)
        if typ not in ("IFCAXIS2PLACEMENT3D", "IFCAXIS2PLACEMENT2D") or not a:
            return _M()
        o = self.pkt(a[0])
        if typ == "IFCAXIS2PLACEMENT2D":
            x = self.richtung(a[1] if len(a) > 1 else None, [1, 0])
            x = _n(list(x) + [0])
            return _M(o + [0] * (3 - len(o)), x, [-x[1], x[0], 0], [0, 0, 1])
        z = _n(self.richtung(a[1] if len(a) > 1 else None, [0, 0, 1]))
        x = self.richtung(a[2] if len(a) > 2 else None, [1, 0, 0])
        x = _n([x[k] - _dot(x, z) * z[k] for k in range(3)]) if abs(_dot(_n(x), z)) < 0.999 else _n(_x([0, 1, 0] if abs(z[1]) < 0.9 else [1, 0, 0], z))
        return _M(o + [0] * (3 - len(o)), x, _x(z, x), z)

    def lp(self, ref, tiefe=0):
        if not isinstance(ref, tuple) or tiefe > 40:
            return _M()
        i = ref[1]
        if i in self.lp_cache:
            return self.lp_cache[i]
        typ, a = self.a(ref)
        m = _M()
        if typ == "IFCLOCALPLACEMENT" and len(a) >= 2:
            m = self.a2p(a[1])
            if a[0] is not None:
                m = self.lp(a[0], tiefe + 1).nach(m)
        self.lp_cache[i] = m
        return m

    # -------------------------------------------------------------- Profile und Körper
    def kurve(self, ref, tiefe=0):
        typ, a = self.a(ref)
        if typ == "IFCPOLYLINE":
            return [self.pkt(p)[:2] for p in a[0]]
        if typ == "IFCINDEXEDPOLYCURVE":
            t2, b = self.a(a[0])
            P = [[float(x) * self.f for x in p[:2]] for p in (b[0] if b else [])]
            return P
        if typ == "IFCCOMPOSITECURVE" and tiefe < 5:
            out = []
            for s in a[0] or []:
                t2, b = self.a(s)
                if t2 in ("IFCCOMPOSITECURVESEGMENT", "IFCSEGMENT") and len(b) >= 3:
                    P = self.kurve(b[2], tiefe + 1)
                    out += P if not out or not P or P[0] != out[-1] else P[1:]
            return out
        if typ == "IFCTRIMMEDCURVE" and tiefe < 5:
            return self.kurve(a[0], tiefe + 1)
        return []

    def profil(self, ref):
        typ, a = self.a(ref)
        if not typ:
            return []
        if typ in ("IFCARBITRARYCLOSEDPROFILEDEF", "IFCARBITRARYPROFILEDEFWITHVOIDS"):
            P = self.kurve(a[2])
            return P[:-1] if len(P) > 1 and P[0] == P[-1] else P
        m = self.a2p(a[2]) if len(a) > 2 and a[2] is not None else _M()
        if typ == "IFCCIRCLEPROFILEDEF" or typ == "IFCCIRCLEHOLLOWPROFILEDEF":
            r = float(a[3]) * self.f
            Q = [(r * math.cos(k * math.pi / 8), r * math.sin(k * math.pi / 8)) for k in range(16)]
        else:
            if len(a) < 5 or not isinstance(a[3], (int, float)) or not isinstance(a[4], (int, float)):
                return []
            X, Y = float(a[3]) * self.f / 2, float(a[4]) * self.f / 2   # Rechteck, I/U/L/T usw.: umhüllendes Rechteck
            Q = [(-X, -Y), (X, -Y), (X, Y), (-X, Y)]
        return [m.p(q)[:2] for q in Q]

    def koerper(self, ref, M, tiefe=0):
        """Körper → Liste von Flächen (Polygone in Weltkoordinaten)."""
        typ, a = self.a(ref)
        if tiefe > 8 or not typ:
            return []
        if typ == "IFCEXTRUDEDAREASOLID":
            P = self.profil(a[0])
            if len(P) < 3:
                return []
            S = M.nach(self.a2p(a[1]))
            d = _n(self.richtung(a[2], [0, 0, 1]))
            h = float(a[3]) * self.f
            u = [[p[0], p[1], 0.0] for p in P]
            o = [[p[0] + d[0] * h, p[1] + d[1] * h, d[2] * h] for p in P]
            F = [list(reversed(u)), o] + [[u[i], u[(i + 1) % len(u)], o[(i + 1) % len(u)], o[i]] for i in range(len(u))]
            return [[S.p(q) for q in f] for f in F]
        if typ in ("IFCFACETEDBREP", "IFCFACETEDBREPWITHVOIDS", "IFCSHELLBASEDSURFACEMODEL"):
            schalen = [a[0]] if typ != "IFCSHELLBASEDSURFACEMODEL" else (a[0] or [])
            F = []
            for sch in schalen:
                for fc in (self.a(sch)[1] or [[]])[0] or []:
                    for b in (self.a(fc)[1] or [[]])[0] or []:
                        t2, bb = self.a(b)
                        if t2 in ("IFCFACEOUTERBOUND", "IFCFACEBOUND") and bb:
                            t3, lp_ = self.a(bb[0])
                            if t3 == "IFCPOLYLOOP" and lp_:
                                F.append([M.p(self.pkt(p)) for p in lp_[0]])
                            break
            return F
        if typ in ("IFCTRIANGULATEDFACESET", "IFCPOLYGONALFACESET"):
            t2, c = self.a(a[0])
            P = [[float(x) * self.f for x in p] for p in (c[0] if c else [])]
            if typ == "IFCTRIANGULATEDFACESET":
                idx = a[3] if len(a) > 3 and isinstance(a[3], list) else []
                return [[M.p(P[k - 1]) for k in tri] for tri in idx if all(0 < k <= len(P) for k in tri)]
            F = []
            for f in a[2] if len(a) > 2 and isinstance(a[2], list) else []:
                t3, b = self.a(f)
                if b and isinstance(b[0], list):
                    F.append([M.p(P[k - 1]) for k in b[0] if 0 < k <= len(P)])
            return F
        if typ == "IFCMAPPEDITEM":
            t2, rm = self.a(a[0])   # IfcRepresentationMap(MappingOrigin, MappedRepresentation)
            if t2 != "IFCREPRESENTATIONMAP" or len(rm) < 2:
                return []
            T = self.operator(a[1]).nach(self.a2p(rm[0]))
            t3, rep = self.a(rm[1])
            F = []
            for it in (rep[3] if len(rep) > 3 else []) or []:
                F += self.koerper(it, M.nach(T), tiefe + 1)
            return F
        if typ in ("IFCBOOLEANCLIPPINGRESULT", "IFCBOOLEANRESULT"):
            return self.koerper(a[1], M, tiefe + 1)   # erster Operand (Abschnitte, z. B. Giebel, werden nicht abgezogen)
        return []

    def operator(self, ref):
        typ, a = self.a(ref)
        if not typ or not a:
            return _M()
        x = _n(self.richtung(a[0], [1, 0, 0]))
        y = _n(self.richtung(a[1], [0, 1, 0]))
        o = self.pkt(a[2]) if len(a) > 2 else [0, 0, 0]
        s = float(a[3]) if len(a) > 3 and isinstance(a[3], (int, float)) else 1.0
        z = _n(self.richtung(a[4], _x(x, y))) if len(a) > 4 and a[4] is not None else _n(_x(x, y))
        return _M(o + [0] * (3 - len(o)), [v * s for v in x], [v * s for v in y], [v * s for v in z])

    def flaechen(self, i):
        typ, a = self.E.get(i)
        if len(a) < 7 or a[5] is None or a[6] is None:
            return [], None
        M = self.lp(a[5])
        t2, pds = self.a(a[6])
        F, farbe = [], None
        for rep in (pds[2] if len(pds) > 2 else []) or []:
            t3, r = self.a(rep)
            if t3 != "IFCSHAPEREPRESENTATION" or len(r) < 4 or str(r[1] or "") not in ("Body", "Facetation", "Mesh", ""):
                continue
            for it in r[3] or []:
                F += self.koerper(it, M)
                farbe = farbe or self.farbe.get(it[1]) if isinstance(it, tuple) else farbe
                if not farbe and isinstance(it, tuple):   # abgebildete Elemente: Farbe am inneren Körper
                    t4, mi = self.a(it)
                    if t4 == "IFCMAPPEDITEM":
                        t5, rm = self.a(mi[0])
                        t6, rep2 = self.a(rm[1]) if len(rm) > 1 else (None, [])
                        farbe = next((self.farbe.get(x[1]) for x in (rep2[3] if len(rep2) > 3 else []) or [] if isinstance(x, tuple) and self.farbe.get(x[1])), None)
            if F:
                break
        return F, farbe


# ------------------------------------------------------------------ Öffnungen ausschneiden, Dreiecke
def _ausschneiden(F, oeffnungen):
    """Senkrechte Rechteckflächen (Wandseiten) ohne die Bereiche, durch die eine Öffnung geht."""
    if not oeffnungen:
        return F
    out = []
    for f in F:
        if len(f) != 4:
            out.append(f)
            continue
        nrm = _n(_x([f[1][k] - f[0][k] for k in range(3)], [f[2][k] - f[0][k] for k in range(3)]))
        if abs(nrm[2]) > 0.05:
            out.append(f)
            continue
        U = _n([f[1][0] - f[0][0], f[1][1] - f[0][1], 0.0])
        if abs(U[0]) + abs(U[1]) < 1e-9:
            U = _n([f[2][0] - f[1][0], f[2][1] - f[1][1], 0.0])
        o = f[0]
        uv = [(_dot([p[k] - o[k] for k in range(3)], U), p[2]) for p in f]
        u0, u1 = min(x[0] for x in uv), max(x[0] for x in uv)
        z0, z1 = min(x[1] for x in uv), max(x[1] for x in uv)
        if u1 - u0 < 1e-6 or z1 - z0 < 1e-6:
            out.append(f)
            continue
        R = []
        for O in oeffnungen:
            w = [_dot([p[k] - o[k] for k in range(3)], nrm) for p in O]
            if min(w) > 0.002 or max(w) < -0.002:
                continue
            ou = [_dot([p[k] - o[k] for k in range(3)], U) for p in O]
            oz = [p[2] for p in O]
            a, b, c, d = max(u0, min(ou)), min(u1, max(ou)), max(z0, min(oz)), min(z1, max(oz))
            if b - a > 1e-4 and d - c > 1e-4:
                R.append((a, b, c, d))
        if not R:
            out.append(f)
            continue
        us = sorted({u0, u1, *[r[0] for r in R], *[r[1] for r in R]})
        zs = sorted({z0, z1, *[r[2] for r in R], *[r[3] for r in R]})
        V = lambda u, z: [o[0] + U[0] * u, o[1] + U[1] * u, z]   # noqa: E731
        vorn = _dot(_x([f[1][k] - f[0][k] for k in range(3)], [f[2][k] - f[0][k] for k in range(3)]), nrm) > 0
        for i in range(len(us) - 1):
            for j in range(len(zs) - 1):
                cu, cz = (us[i] + us[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2
                if any(r[0] < cu < r[1] and r[2] < cz < r[3] for r in R):
                    continue
                q = [V(us[i], zs[j]), V(us[i + 1], zs[j]), V(us[i + 1], zs[j + 1]), V(us[i], zs[j + 1])]
                if _dot(_x([q[1][k] - q[0][k] for k in range(3)], [q[2][k] - q[0][k] for k in range(3)]), nrm) < 0 and vorn or not vorn and _dot(_x([q[1][k] - q[0][k] for k in range(3)], [q[2][k] - q[0][k] for k in range(3)]), nrm) > 0:
                    q.reverse()
                out.append(q)
    return out


def _dreiecke(f):
    """Ebenes Polygon → Dreiecke (Ohrenschneiden; auch L- und U-förmige Umrisse)."""
    P = []
    for p in f:
        if not P or math.dist(P[-1], p) > 1e-7:
            P.append(p)
    if len(P) > 1 and math.dist(P[0], P[-1]) < 1e-7:
        P.pop()
    if len(P) < 3:
        return []
    if len(P) == 3:
        return [P]
    nrm = [0.0, 0.0, 0.0]
    for i in range(len(P)):
        a, b = P[i], P[(i + 1) % len(P)]
        nrm[0] += (a[1] - b[1]) * (a[2] + b[2]); nrm[1] += (a[2] - b[2]) * (a[0] + b[0]); nrm[2] += (a[0] - b[0]) * (a[1] + b[1])
    k = max(range(3), key=lambda i: abs(nrm[i]))
    if abs(nrm[k]) < 1e-12:
        return []
    ax = [i for i in range(3) if i != k]
    Q = [(p[ax[0]], p[ax[1]]) for p in P]
    if nrm[k] < 0:
        Q = [(q[1], q[0]) for q in Q]
    idx, out, schutz = list(range(len(P))), [], 0
    kreuz = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])   # noqa: E731
    while len(idx) > 3 and schutz < 10 * len(P):
        schutz += 1
        for n in range(len(idx)):
            i0, i1, i2 = idx[n - 1], idx[n], idx[(n + 1) % len(idx)]
            a, b, c = Q[i0], Q[i1], Q[i2]
            if kreuz(a, b, c) <= 1e-14:
                continue
            if any(j not in (i0, i1, i2) and kreuz(a, b, Q[j]) >= 0 and kreuz(b, c, Q[j]) >= 0 and kreuz(c, a, Q[j]) >= 0 for j in idx):
                continue
            out.append([P[i0], P[i1], P[i2]])
            idx.pop(n)
            break
        else:
            break
    if len(idx) >= 3:
        out += [[P[idx[0]], P[idx[i]], P[idx[i + 1]]] for i in range(1, len(idx) - 1)]
    return out


def netz_ifc(raw):
    N = _Netz(raw)
    E = N.E
    geschoss, G = {}, []
    for i, a in E.alle("IFCBUILDINGSTOREY"):
        z = float(a[9]) * N.f if len(a) > 9 and isinstance(a[9], (int, float)) else 0.0
        G.append({"i": i, "n": str(a[2] or f"Geschoss {len(G) + 1}")[:60], "z": round(z, 3)})
    G.sort(key=lambda g: g["z"])
    gnr = {g["i"]: k for k, g in enumerate(G)}
    for _, a in E.alle("IFCRELCONTAINEDINSPATIALSTRUCTURE"):
        if len(a) >= 6 and isinstance(a[5], tuple) and a[5][1] in gnr:
            for x in a[4] or []:
                if isinstance(x, tuple):
                    geschoss[x[1]] = gnr[a[5][1]]
    teil = {}
    for _, a in E.alle("IFCRELAGGREGATES"):
        if len(a) >= 6 and isinstance(a[4], tuple):
            for x in a[5] or []:
                if isinstance(x, tuple):
                    teil[x[1]] = a[4][1]
    oeff = {}
    for _, a in E.alle("IFCRELVOIDSELEMENT"):
        if len(a) >= 6 and isinstance(a[4], tuple) and isinstance(a[5], tuple):
            oeff.setdefault(a[4][1], []).append(a[5][1])
    wand_von = {o: w for w, O in oeff.items() for o in O}   # Öffnung → Wand; Fenster/Tür → Wand ihrer Öffnung („h“: zieht seitlich mit der Wand)
    fuell = {a[5][1]: a[4][1] for _, a in E.alle("IFCRELFILLSELEMENT") if len(a) >= 6 and isinstance(a[4], tuple) and isinstance(a[5], tuple)}
    out, n_dr = [], 0
    for typ, t in TYP.items():
        for i in E.nach_typ.get(typ, []):
            if n_dr > GRENZE:
                break
            F, farbe = N.flaechen(i)
            if not F:
                continue
            if i in oeff:
                O = [sum(N.flaechen(o)[0], []) for o in oeff[i]]
                F = _ausschneiden(F, [o for o in O if o])
            v = []
            for f in F:
                for d in _dreiecke(f):
                    for p in d:
                        v += [round(p[0] * 100), round(p[1] * 100), round(p[2] * 100)]
            if not v:
                continue
            n_dr += len(v) // 9
            g = geschoss.get(i, geschoss.get(teil.get(i), geschoss.get(teil.get(teil.get(i)), 0)))
            out.append({"i": i, "t": t, "g": g, "c": farbe[0] if farbe else "", "a": round(farbe[1], 2) if farbe and farbe[1] else 0, "v": v})
            if wand_von.get(fuell.get(i)):
                out[-1]["h"] = wand_von[fuell[i]]
    # Öffnungen ohne Fenster oder Tür (20.11.2026): im Plan nur das Loch – die Bauteilliste führt sie als „Öffnung ohne Bauteil“ (ids = Öffnung),
    # also als durchscheinender Körper „o“, damit man sie anklicken und im Nachweis wiederfinden kann.
    gefuellt = set(fuell.values())
    for wand, O in oeff.items():
        for o in O:
            if o in gefuellt or n_dr > GRENZE:
                continue
            F = N.flaechen(o)[0]
            v = [round(x * 100) for f in F or [] for d in _dreiecke(f) for p in d for x in p[:3]]
            if v:
                n_dr += len(v) // 9
                out.append({"i": o, "t": "o", "g": geschoss.get(wand, geschoss.get(teil.get(wand), 0)), "c": "", "a": 0, "v": v, "h": wand})
    return {"stand": STAND, "e": out, "geschosse": [{"n": g["n"], "z": g["z"]} for g in G] or [{"n": "Gebäude", "z": 0}], "dreiecke": n_dr, "voll": n_dr <= GRENZE}


def netz_dxf(raw, zuordnung):
    """DXF: Räume als dünne Bodenplatten, Wandlinien als Scheiben angenommener Höhe (plan2d.WANDHOEHE)."""
    from . import plan2d as P2
    kopf, O = P2._entities(raw)
    ZE = (zuordnung or {}).get("ebenen") or {}
    rolle = lambda n: ZE.get(n) or P2.vorschlag(n, "ebene")   # noqa: E731
    umrisse = [o for o in O if P2._zu(o) and rolle(o["ebene"]) == "raum"]
    f, _ = P2._faktor(kopf, [P2._flaeche(o["pkt"]) for o in umrisse])
    out, h = [], P2.WANDHOEHE
    for k, o in enumerate(umrisse):
        P = [(x * f, y * f) for x, y in o["pkt"]]
        v = []
        for d in _dreiecke([[x, y, 0.0] for x, y in P]):
            for p in d:
                v += [round(p[0] * 100), round(p[1] * 100), 0]
        if v:
            out.append({"i": 900000 + k, "t": "s", "g": 0, "c": "#d9d4c7", "a": 0, "v": v})
    for k, o in enumerate(O):
        if rolle(o["ebene"]) not in ("wand_aussen", "wand_innen"):
            continue
        L = [((o["x"], o["y"]), (o["x2"], o["y2"]))] if o["typ"] == "LINE" and o["x2"] is not None and o["x"] is not None else \
            [(o["pkt"][i], o["pkt"][i + 1]) for i in range(len(o["pkt"]) - 1)] + ([(o["pkt"][-1], o["pkt"][0])] if P2._zu(o) else []) if o["typ"] in ("LWPOLYLINE", "POLYLINE") else []
        v = []
        for (x0, y0), (x1, y1) in L:
            a, b = (x0 * f, y0 * f), (x1 * f, y1 * f)
            q = [[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], h], [a[0], a[1], h]]
            for d in _dreiecke(q) + _dreiecke(list(reversed(q))):
                for p in d:
                    v += [round(p[0] * 100), round(p[1] * 100), round(p[2] * 100)]
        if v:
            out.append({"i": 910000 + k, "t": "w", "g": 0, "c": "#efece6" if rolle(o["ebene"]) == "wand_aussen" else "#e2ded6", "a": 0, "v": v})
    return {"e": out, "geschosse": [{"n": "Grundriss", "z": 0}], "dreiecke": sum(len(e["v"]) // 9 for e in out), "voll": True}


WAND = ("IFCWALL", "IFCWALLSTANDARDCASE", "IFCWALLELEMENTEDCASE")


def _huelle(P):   # konvexe Hülle (Andrew) – 2D-Punkte
    P = sorted(set(P))
    if len(P) < 3:
        return P
    def kreuz(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    u, o_ = [], []
    for p in P:
        while len(u) >= 2 and kreuz(u[-2], u[-1], p) <= 0:
            u.pop()
        u.append(p)
    for p in reversed(P):
        while len(o_) >= 2 and kreuz(o_[-2], o_[-1], p) <= 0:
            o_.pop()
        o_.append(p)
    return u[:-1] + o_[:-1]


def _abstand_rand(p, H):   # kürzester Abstand eines Punkts zum Rand eines Polygons
    best = 1e9
    for k in range(len(H)):
        a, b = H[k], H[(k + 1) % len(H)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L2 = dx * dx + dy * dy or 1e-12
        t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2))
        best = min(best, math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy))
    return best


def aussenlage(raw, ids=None):
    """Außen- oder Innenwand aus der Lage – nur für Wände, an denen das IFC nichts sagt (IsExternal fehlt; Klärung E, 16.11.2026).
    1. Räume (IfcSpace) im Modell: Neben der Wand wird auf beiden Seiten geprüft, ob ein Raumboden darunter liegt – Raum nur auf einer Seite
       = Außenwand, auf beiden = Innenwand.
    2. Ohne Räume (oder kein Raum auf beiden Seiten): Wand am Außenumriss des Geschosses (konvexe Hülle aller Wände) = Außenwand.
    → {Objekt-Nr.: True/False}; Wände, die sich nicht entscheiden lassen, fehlen (dann gilt die Dicke als letzte Regel)."""
    N = _Netz(raw)
    E = N.E
    W = [i for t in WAND for i in E.nach_typ.get(t, [])]
    if ids is not None:
        W_ziel = set(ids)
    else:
        W_ziel = set(W)
    wand = {}
    for i in W:
        F, _ = N.flaechen(i)
        P = [p for f in F for p in f]
        if len(P) >= 4:
            wand[i] = P
    boeden = []   # waagerechte Unterseiten der Räume: (z unten, z oben, Polygon 2D)
    for i in E.nach_typ.get("IFCSPACE", []):
        F, _ = N.flaechen(i)
        P = [p for f in F for p in f]
        if not P:
            continue
        z0, z1 = min(p[2] for p in P), max(p[2] for p in P)
        for f in F:
            if len(f) >= 3 and max(p[2] for p in f) - min(p[2] for p in f) < 0.01 and abs(f[0][2] - z0) < 0.05:
                boeden.append((z0, z1, [(p[0], p[1]) for p in f]))

    def im_raum(x, y, z):
        return any(z0 - 0.05 <= z <= z1 + 0.05 and CI._innen(x, y, Q) for z0, z1, Q in boeden)
    out = {}
    stock = {}   # Wände nach Höhe gruppiert (für die Hülle je Geschoss)
    for i, P in wand.items():
        stock.setdefault(round(min(p[2] for p in P), 1), []).append(i)
    huelle = {k: _huelle([(p[0], p[1]) for i in L for p in wand[i]]) for k, L in stock.items()}
    for i in W_ziel:
        P = wand.get(i)
        if not P:
            continue
        xy = [(p[0], p[1]) for p in P]
        H = _huelle(xy)
        if len(H) < 3:
            continue
        k = max(range(len(H)), key=lambda j: math.dist(H[j], H[(j + 1) % len(H)]))   # längste Kante = Wandrichtung
        a, b = H[k], H[(k + 1) % len(H)]
        L = math.dist(a, b) or 1.0
        d = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
        n = (-d[1], d[0])
        c = (sum(x for x, _ in xy) / len(xy), sum(y for _, y in xy) / len(xy))
        halb = max(abs((x - c[0]) * n[0] + (y - c[1]) * n[1]) for x, y in xy)
        z = min(p[2] for p in P) + 0.3
        if boeden:
            seiten = [0, 0]
            for t in (-0.3, 0.0, 0.3):
                m = (c[0] + d[0] * t * L, c[1] + d[1] * t * L)
                for s, sg in ((0, 1), (1, -1)):
                    q = (m[0] + sg * n[0] * (halb + 0.3), m[1] + sg * n[1] * (halb + 0.3))
                    seiten[s] += im_raum(q[0], q[1], z)
            if seiten[0] and seiten[1]:
                out[i] = False
                continue
            if seiten[0] or seiten[1]:   # Raum nur auf einer Seite: außen nur am Umriss – sonst fehlt drüben ein Raum (nicht gezeichnet), Innenwand
                Hs = huelle.get(round(min(p[2] for p in P), 1)) or []
                out[i] = _abstand_rand(c, Hs) <= halb + 0.15 if len(Hs) >= 3 else True
                continue
        Hs = huelle.get(round(min(p[2] for p in P), 1)) or []
        if len(Hs) >= 3:
            out[i] = _abstand_rand(c, Hs) <= halb + 0.15
    return out


def richtungen(raw, ids):
    """Himmelsrichtung der Außenseite je Wand (18.11.2026, Kürzel aus dem Plan) – „N“, „O“, „S“, „W“. Außenseite = weg vom Inneren des Geschosses
    (konvexe Hülle aller Wände); Norden aus „TrueNorth“ der Datei, sonst +Y. → {Objekt-Nr.: Richtung}"""
    N = _Netz(raw)
    E = N.E
    nord = (0.0, 1.0)
    for _, a in E.alle("IFCGEOMETRICREPRESENTATIONCONTEXT"):
        d = E.get(a[5][1]) if len(a) > 5 and isinstance(a[5], tuple) else None
        if d and d[1] and isinstance(d[1][0], list) and len(d[1][0]) >= 2:
            x, y = float(d[1][0][0]), float(d[1][0][1])
            if math.hypot(x, y) > 1e-9:
                nord = (x / math.hypot(x, y), y / math.hypot(x, y))
                break
    W = [i for t in WAND for i in E.nach_typ.get(t, [])]
    pts = {}
    for i in W:
        F, _ = N.flaechen(i)
        P = [p for f in F for p in f]
        if len(P) >= 4:
            pts[i] = P
    stock = {}
    for i, P in pts.items():
        stock.setdefault(round(min(p[2] for p in P), 1), []).append(i)
    mitte = {}
    for k, L in stock.items():
        H = _huelle([(p[0], p[1]) for i in L for p in pts[i]])
        mitte[k] = (sum(x for x, _ in H) / len(H), sum(y for _, y in H) / len(H)) if H else None
    out = {}
    for i in ids:
        P = pts.get(i)
        if not P:
            continue
        xy = [(p[0], p[1]) for p in P]
        H = _huelle(xy)
        if len(H) < 3:
            continue
        k = max(range(len(H)), key=lambda j: math.dist(H[j], H[(j + 1) % len(H)]))
        a, b = H[k], H[(k + 1) % len(H)]
        L = math.dist(a, b) or 1.0
        n = (-(b[1] - a[1]) / L, (b[0] - a[0]) / L)
        c = (sum(x for x, _ in xy) / len(xy), sum(y for _, y in xy) / len(xy))
        m = mitte.get(round(min(p[2] for p in P), 1))
        if m and (c[0] - m[0]) * n[0] + (c[1] - m[1]) * n[1] < 0:
            n = (-n[0], -n[1])
        winkel = math.degrees(math.atan2(n[0] * nord[1] - n[1] * nord[0], n[0] * nord[0] + n[1] * nord[1])) % 360   # im Uhrzeigersinn ab Nord
        out[i] = "NOSW"[int(((winkel + 45) % 360) // 90)]
    return out


def elemente_lage(raw, extra=None):
    """Fenster und Türen einzeln (GO 16.11.2026, Gebäudemodell Teil 2): Breite, Höhe, Brüstung über dem Geschossboden und die Räume
    (IfcSpace) davor und dahinter aus der Geometrie → {Objekt-Nr.: {"b", "h", "bruestung", "raeume": [Raum-Nr. im IFC]}} in m.
    Ohne lesbare Geometrie fehlt das Element (die Liste nimmt dann die Maße aus dem IFC). extra: [(Raum-id, z0, z1, Umriss)] ermittelter Räume."""
    N = _Netz(raw)
    E = N.E
    stock = {}   # Objekt → Höhe des Geschossbodens
    gz = {}
    for i, a in E.alle("IFCBUILDINGSTOREY"):
        gz[i] = float(a[9]) * N.f if len(a) > 9 and isinstance(a[9], (int, float)) else 0.0
    for _, a in E.alle("IFCRELCONTAINEDINSPATIALSTRUCTURE"):
        if len(a) >= 6 and isinstance(a[5], tuple) and a[5][1] in gz:
            for x in a[4] or []:
                if isinstance(x, tuple):
                    stock[x[1]] = gz[a[5][1]]
    raeume = []
    for i in E.nach_typ.get("IFCSPACE", []):
        F, _ = N.flaechen(i)
        P = [p for f in F for p in f]
        if not P:
            continue
        z0, z1 = min(p[2] for p in P), max(p[2] for p in P)
        for f in F:
            if len(f) >= 3 and max(p[2] for p in f) - min(p[2] for p in f) < 0.01 and abs(f[0][2] - z0) < 0.05:
                raeume.append((i, z0, z1, [(p[0], p[1]) for p in f]))
    raeume += list(extra or [])   # aus den Wänden ermittelte Räume (raumsuche.lage) – wenn das IFC keine hat
    out = {}
    for typ in ("IFCWINDOW", "IFCWINDOWSTANDARDCASE", "IFCDOOR", "IFCDOORSTANDARDCASE"):
        for i in E.nach_typ.get(typ, []):
            F, _ = N.flaechen(i)
            P = [p for f in F for p in f]
            if len(P) < 3:
                continue
            z0, z1 = min(p[2] for p in P), max(p[2] for p in P)
            xy = [(p[0], p[1]) for p in P]
            H = _huelle(xy)
            if len(H) < 2:
                continue
            k = max(range(len(H)), key=lambda j: math.dist(H[j], H[(j + 1) % len(H)]))
            a_, b_ = H[k], H[(k + 1) % len(H)]
            L = math.dist(a_, b_) or 1.0
            d = ((b_[0] - a_[0]) / L, (b_[1] - a_[1]) / L)
            n = (-d[1], d[0])
            c = (sum(x for x, _ in xy) / len(xy), sum(y for _, y in xy) / len(xy))
            halb = max(abs((x - c[0]) * n[0] + (y - c[1]) * n[1]) for x, y in xy)
            boden = stock.get(i)
            R = []
            for sg in (1, -1):
                q = (c[0] + sg * n[0] * (halb + 0.4), c[1] + sg * n[1] * (halb + 0.4))
                R += [r for r, rz0, rz1, Q in raeume if rz0 - 0.1 <= z0 + 0.3 <= rz1 + 0.1 and CI._innen(q[0], q[1], Q) and r not in R]
            if boden is None and R:   # Geschossboden unbekannt: Unterkante des Raums davor
                boden = min(rz0 for r, rz0, _, _ in raeume if r in R)
            out[i] = {"b": round(L, 3), "h": round(z1 - z0, 3), "bruestung": round(max(0.0, z0 - boden), 3) if boden is not None else None, "raeume": R[:2]}
    return out


def packen(n):
    return gzip.compress(json.dumps(n, separators=(",", ":")).encode(), 6)


def stand(b):
    """Fassung eines gepackten Netzes, ohne es ganz auszupacken ("stand" steht vorn) – 0 = vor STAND 2."""
    import re
    import zlib
    try:
        kopf = zlib.decompressobj(31).decompress(bytes(b[:2048]), 200)
    except zlib.error:
        return 0
    m = re.match(rb'\{"stand":(\d+)', kopf)
    return int(m.group(1)) if m else 0


def auspacken(b):
    return json.loads(gzip.decompress(b).decode())
