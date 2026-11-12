"""CAD-Dateien für die Baukosten: IFC (BIM-Modell, z. B. aus Allplan, Archicad, Revit) und DXF (Grundriss).

Ohne Zusatzbibliothek: IFC ist eine STEP-Textdatei (ISO 10303-21), DXF eine Liste aus Gruppencode und Wert.

ifc_lesen(bytes) → {"raeume": [...], "bauteile": [...], "geschosse": [...], "hinweise": [...], "info": {...}}
    raeume:   {nr, name, flaeche, umfang, hoehe, geschoss, langname}
    bauteile: {kg, art, name, material, dicke, menge, einheit, anzahl, aussen, tragend}  (je Bauteiltyp gleicher Aufbau zusammengefasst)
dxf_lesen(bytes) → {"raeume": [...], "hinweise": [...], "info": {...}}  – geschlossene Polylinien mit Raumbeschriftung
"""
import math
import re

# ---------------------------------------------------------------- IFC (STEP)
_ENT = re.compile(r"#(\d+)\s*=\s*([A-Z0-9_]+)\s*\(", re.S)


def _dekodiere(s):
    """STEP-Zeichenketten: '' → ', \\X2\\00FC\\X0\\ → ü, \\X\\FC → ü, \\S\\ … (ISO 8859)."""
    def x2(m):
        h = m.group(1)
        try:
            return "".join(chr(int(h[i:i + 4], 16)) for i in range(0, len(h), 4))
        except ValueError:
            return ""
    s = re.sub(r"\\X2\\([0-9A-Fa-f]+)\\X0\\", x2, s)
    s = re.sub(r"\\X4\\([0-9A-Fa-f]+)\\X0\\", lambda m: "".join(chr(int(m.group(1)[i:i + 8], 16)) for i in range(0, len(m.group(1)), 8)), s)
    s = re.sub(r"\\X\\([0-9A-Fa-f]{2})", lambda m: bytes([int(m.group(1), 16)]).decode("latin-1"), s)
    s = re.sub(r"\\S\\(.)", lambda m: chr(ord(m.group(1)) + 128), s)
    return s.replace("''", "'").replace("\\\\", "\\")


_RX_REF = re.compile(r"#(\d+)")
_RX_NAME = re.compile(r"[A-Z0-9_]+")
_RX_ZAHL = re.compile(r"[-+]?(\d+\.?\d*([eE][-+]?\d+)?|\.\d+)")


class _Typ:   # getypter Wert, z. B. IFCLABEL('Wand') oder IFCBOOLEAN(.T.)
    __slots__ = ("typ", "wert")

    def __init__(self, typ, wert):
        self.typ, self.wert = typ, wert


def _parse_args(t, i):
    """Argumentliste ab Position i (nach „(“) → (Liste, Position nach „)“)."""
    out, n = [], len(t)
    while i < n:
        ch = t[i]
        if ch in " \r\n\t,":
            i += 1
            continue
        if ch == ")":
            return out, i + 1
        if ch == "(":
            v, i = _parse_args(t, i + 1)
            out.append(v)
        elif ch == "'":
            j = i + 1
            while True:
                k = t.find("'", j)
                if k < 0:
                    k = n
                    break
                if k + 1 < n and t[k + 1] == "'":
                    j = k + 2
                    continue
                break
            out.append(_dekodiere(t[i + 1:k]))
            i = k + 1
        elif ch == "#":
            m = _RX_REF.match(t, i)
            out.append(("#", int(m.group(1))))
            i += len(m.group(0))
        elif ch == "$" or ch == "*":
            out.append(None)
            i += 1
        elif ch == ".":
            k = t.find(".", i + 1)
            out.append("." + t[i + 1:k] + ".")
            i = k + 1
        elif ch == '"':   # Binär
            k = t.find('"', i + 1)
            out.append(t[i + 1:k])
            i = k + 1
        elif ch.isalpha():
            m = _RX_NAME.match(t, i)
            nm = m.group(0)
            i += len(nm)
            while i < n and t[i] in " \r\n\t":
                i += 1
            if i < n and t[i] == "(":
                v, i = _parse_args(t, i + 1)
                out.append(_Typ(nm, v[0] if len(v) == 1 else v))
            else:
                out.append(nm)
        else:
            m = _RX_ZAHL.match(t, i)
            if not m:
                i += 1
                continue
            s = m.group(0)
            out.append(float(s) if any(c in s for c in ".eE") else int(s))
            i += len(s)
    return out, i


class _Store:
    """Entitäten des DATA-Abschnitts – erst beim Zugriff zerlegt (Geometrie mit Zehntausenden Punkten wird nur gelesen, wenn nötig)."""

    def __init__(self, text):
        a = text.find("DATA;")
        self.t = text[a + 5:] if a >= 0 else text
        self.pos, self.typ, self.cache, self.nach_typ = {}, {}, {}, {}
        for m in _ENT.finditer(self.t):
            i = int(m.group(1))
            self.pos[i], self.typ[i] = m.end(), m.group(2)
            self.nach_typ.setdefault(m.group(2), []).append(i)

    def __len__(self):
        return len(self.pos)

    def get(self, i, alt=None):
        if i not in self.pos:
            return alt
        if i not in self.cache:
            try:
                self.cache[i] = (self.typ[i], _parse_args(self.t, self.pos[i])[0])
            except Exception:
                self.cache[i] = (self.typ[i], [])
        return self.cache[i]

    __getitem__ = get

    def alle(self, *typen):
        for t in typen:
            for i in self.nach_typ.get(t, []):
                yield i, self.get(i)[1]


def _entitaeten(text):
    return _Store(text)


def _wert(v):
    while isinstance(v, _Typ):
        v = v.wert
    if v == ".T.":
        return True
    if v == ".F.":
        return False
    return v


CODE_RX = re.compile(r"(?<![\d.])(\d{3}\.\d{2}\.\d{3})(?![\d.])")
ART = {"IFCWALL": "Wand", "IFCWALLSTANDARDCASE": "Wand", "IFCWALLELEMENTEDCASE": "Wand", "IFCSLAB": "Decke", "IFCSLABSTANDARDCASE": "Decke",
       "IFCROOF": "Dach", "IFCWINDOW": "Fenster", "IFCWINDOWSTANDARDCASE": "Fenster", "IFCDOOR": "Tür", "IFCDOORSTANDARDCASE": "Tür",
       "IFCCOLUMN": "Stütze", "IFCCOLUMNSTANDARDCASE": "Stütze", "IFCBEAM": "Träger", "IFCBEAMSTANDARDCASE": "Träger",
       "IFCSTAIR": "Treppe", "IFCSTAIRFLIGHT": "Treppenlauf", "IFCRAMP": "Rampe", "IFCRAILING": "Geländer", "IFCCOVERING": "Bekleidung",
       "IFCCURTAINWALL": "Vorhangfassade", "IFCFOOTING": "Fundament", "IFCPILE": "Pfahl", "IFCPLATE": "Platte", "IFCMEMBER": "Profil",
       "IFCCHIMNEY": "Schornstein", "IFCSHADINGDEVICE": "Sonnenschutz"}


def ifc_lesen(raw):
    text = raw.decode("utf-8", "replace") if isinstance(raw, (bytes, bytearray)) else str(raw)
    if "ISO-10303-21" not in text[:200]:
        raise ValueError("Das ist keine IFC-Datei (STEP, ISO 10303-21).")
    schema = (re.search(r"FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'", text) or [None, ""])[1]
    E = _Store(text)
    if not len(E):
        raise ValueError("In der IFC-Datei wurden keine Objekte gefunden.")
    prog = ""
    for _, a in E.alle("IFCAPPLICATION"):
        prog = " ".join(str(x) for x in (a[2], a[1]) if x)
    R = lambda r: E.get(r[1]) if isinstance(r, tuple) and r and r[0] == "#" else None   # noqa: E731

    # Einheiten (Länge mm/cm/m, Fläche, Volumen)
    f_len, f_area, f_vol = 1.0, 1.0, 1.0
    PRE = {".MILLI.": 1e-3, ".CENTI.": 1e-2, ".DECI.": 1e-1, None: 1.0, ".KILO.": 1e3}
    for _, a in E.alle("IFCSIUNIT"):
        if len(a) >= 4:
            p = PRE.get(a[2], 1.0)
            if a[1] == ".LENGTHUNIT.":
                f_len = p
            elif a[1] == ".AREAUNIT.":
                f_area = p * p
            elif a[1] == ".VOLUMEUNIT.":
                f_vol = p ** 3

    # Eigenschaften (auch verschachtelt, z. B. Allplan „Object Layer Attributes #1/Status“) und Mengen je Objekt
    props, mengen = {}, {}

    def flach(liste, pre, out):
        for p in liste or []:
            pp = R(p)
            if not pp:
                continue
            if pp[0] in ("IFCPROPERTYSINGLEVALUE", "IFCPROPERTYENUMERATEDVALUE"):
                v = pp[1][2] if len(pp[1]) > 2 else None
                v = _wert(v[0] if isinstance(v, list) and v else v)
                out.setdefault(pre + str(pp[1][0]), v)
            elif pp[0] == "IFCCOMPLEXPROPERTY" and len(pp[1]) > 3:
                flach(pp[1][3], pre + str(pp[1][0]) + "/", out)
    for _, a in E.alle("IFCRELDEFINESBYPROPERTIES"):
        if len(a) < 6:
            continue
        ziele = [x[1] for x in (a[4] or []) if isinstance(x, tuple)]
        d = R(a[5])
        if not d:
            continue
        if d[0] == "IFCELEMENTQUANTITY":
            for q in d[1][5] or []:
                qq = R(q)
                if not qq or len(qq[1]) < 4:
                    continue
                qt, qa = qq
                v = _wert(qa[3])
                if not isinstance(v, (int, float)):
                    continue
                f = f_area if qt == "IFCQUANTITYAREA" else f_vol if qt == "IFCQUANTITYVOLUME" else f_len if qt == "IFCQUANTITYLENGTH" else 1.0
                for z in ziele:
                    mengen.setdefault(z, {})[str(qa[0])] = v * f
        elif d[0] == "IFCPROPERTYSET":
            o = {}
            flach(d[1][4], "", o)
            for z in ziele:
                P = props.setdefault(z, {})
                for k, v in o.items():
                    P.setdefault(k, v)

    # Material je Objekt (Schichten mit Dicke)
    def material(ref, tiefe=0):
        x = R(ref)
        if not x or tiefe > 4:
            return [], 0.0
        t, a = x
        if t == "IFCMATERIAL":
            return [str(a[0] or "")], 0.0
        if t == "IFCMATERIALLAYERSETUSAGE":
            return material(a[0], tiefe + 1)
        if t == "IFCMATERIALLAYERSET":
            namen, d = [], 0.0
            for l_ in a[0] or []:
                ly = R(l_)
                if ly and ly[0] == "IFCMATERIALLAYER":
                    nm = (material(ly[1][0], tiefe + 1)[0] or [""])[0].strip()
                    if not nm and len(ly[1]) > 3 and isinstance(ly[1][3], str):   # IFC4: Name der Schicht
                        nm = ly[1][3].strip()
                    dk = (_wert(ly[1][1]) or 0) * f_len
                    d += dk
                    namen.append((nm, dk))
            return namen, d
        if t == "IFCMATERIALLIST":
            return [n for m in a[0] or [] for n in material(m, tiefe + 1)[0]], 0.0
        if t in ("IFCMATERIALCONSTITUENTSET", "IFCMATERIALPROFILESETUSAGE", "IFCMATERIALPROFILESET"):
            out = []
            for v in a:
                for m in (v if isinstance(v, list) else [v]):
                    out += material(m, tiefe + 1)[0]
            return out, 0.0
        if t in ("IFCMATERIALCONSTITUENT", "IFCMATERIALPROFILE"):
            for v in a:
                if isinstance(v, tuple):
                    return material(v, tiefe + 1)
        return [], 0.0
    GEWERK = [("putz", "Putz"), ("stuck", "Putz"), ("mauer", "Mauerwerk"), ("beton", "Stahlbeton"), ("trocken", "Trockenbau"), ("fliesen", "Fliesen"),
              ("zimmer", "Holz"), ("holzbau", "Holz"), ("wärmedämm", "Dämmung"), ("dämm", "Dämmung"), ("maler", "Anstrich"), ("estrich", "Estrich"),
              ("stahlbau", "Stahl"), ("naturstein", "Naturstein"), ("klinker", "Klinker"), ("verblend", "Klinker")]

    def schichten(i, namen):
        """Schichtnamen; fehlen sie (Allplan ohne Baustoff), aus „Object Layer Attributes #n“ (Material bzw. Gewerk) des Objekts."""
        out = []
        for k, x in enumerate(namen):
            if not isinstance(x, tuple):
                out.append(x)
                continue
            nm, dk = x
            if not nm:
                P = props.get(i, {})
                nm = str(P.get(f"Object Layer Attributes #{k + 1}/Material") or "").strip()
                if not nm:
                    gw = str(P.get(f"Object Layer Attributes #{k + 1}/Gewerk") or "").lower()
                    nm = next((v for key, v in GEWERK if key in gw), "")
                if not nm and dk and dk <= 0.03:
                    nm = "Putz"
            out.append((nm + " " + f"{round(dk * 100, 1):g} cm".replace(".", ",")).strip() if dk else nm)
        return out
    mat = {}
    for _, a in E.alle("IFCRELASSOCIATESMATERIAL"):
        if len(a) >= 6:
            m = material(a[5])
            for z in a[4] or []:
                if isinstance(z, tuple):
                    mat[z[1]] = m

    # ------------------------------------------------ Geometrie: Mengen aus der Form, wenn das Modell keine mitliefert
    def pkt(ref):
        x = R(ref)
        return [float(v) for v in x[1][0]] if x and x[0] == "IFCCARTESIANPOINT" else None

    def kurve(ref):   # → Liste 2D-Punkte
        x = R(ref)
        if not x:
            return []
        t, a = x
        if t == "IFCPOLYLINE":
            return [q[:2] for q in (pkt(r) for r in a[0] or []) if q]
        if t == "IFCINDEXEDPOLYCURVE":
            pl = R(a[0])
            pts = pl[1][0] if pl else []
            return [[float(q[0]), float(q[1])] for q in pts]
        if t == "IFCCOMPOSITECURVE":
            out = []
            for sg in a[0] or []:
                sx = R(sg)
                if sx and len(sx[1]) > 2:
                    out += kurve(sx[1][2])
            return out
        if t == "IFCTRIMMEDCURVE":
            return kurve(a[0])
        return []

    def profil(ref):   # → (Fläche, Umfang) in Projekteinheit²/Projekteinheit
        x = R(ref)
        if not x:
            return 0.0, 0.0
        t, a = x
        if t == "IFCRECTANGLEPROFILEDEF" and len(a) > 4:
            return float(a[3]) * float(a[4]), 2 * (float(a[3]) + float(a[4]))
        if t == "IFCRECTANGLEHOLLOWPROFILEDEF" and len(a) > 5:
            X, Y, w = float(a[3]), float(a[4]), float(a[5])
            return X * Y - max(0, X - 2 * w) * max(0, Y - 2 * w), 2 * (X + Y)
        if t == "IFCCIRCLEPROFILEDEF" and len(a) > 3:
            return math.pi * float(a[3]) ** 2, 2 * math.pi * float(a[3])
        if t in ("IFCARBITRARYCLOSEDPROFILEDEF", "IFCARBITRARYPROFILEDEFWITHVOIDS") and len(a) > 2:
            P = kurve(a[2])
            if len(P) > 2 and P[0] == P[-1]:
                P = P[:-1]
            A, U = (_flaeche(P), _umfang(P)) if len(P) > 2 else (0.0, 0.0)
            if t == "IFCARBITRARYPROFILEDEFWITHVOIDS" and len(a) > 3:
                for inn in a[3] or []:
                    Q = kurve(inn)
                    if len(Q) > 2:
                        A -= _flaeche(Q)
            return max(A, 0.0), U
        if t in ("IFCISHAPEPROFILEDEF", "IFCLSHAPEPROFILEDEF", "IFCTSHAPEPROFILEDEF", "IFCUSHAPEPROFILEDEF", "IFCCSHAPEPROFILEDEF", "IFCZSHAPEPROFILEDEF") and len(a) > 5:
            return float(a[3]) * float(a[4]) * 0.3, 2 * (float(a[3]) + float(a[4]))   # grob
        return 0.0, 0.0

    def netz_volumen(shells):
        v = 0.0
        for sh in shells:
            sx = R(sh)
            if not sx:
                continue
            for fc in sx[1][0] or []:
                fx = R(fc)
                if not fx:
                    continue
                for bd in fx[1][0] or []:
                    bx = R(bd)
                    if not bx or bx[0] != "IFCFACEOUTERBOUND" and bx[0] != "IFCFACEBOUND":
                        continue
                    lp = R(bx[1][0])
                    if not lp or lp[0] != "IFCPOLYLOOP":
                        continue
                    P = [pkt(r) for r in lp[1][0] or []]
                    P = [q + [0.0] * (3 - len(q)) for q in P if q]
                    sgn = 1.0 if (len(bx[1]) < 2 or bx[1][1] != ".F.") else -1.0
                    for k in range(1, len(P) - 1):
                        a_, b_, c_ = P[0], P[k], P[k + 1]
                        v += sgn * (a_[0] * (b_[1] * c_[2] - b_[2] * c_[1]) - a_[1] * (b_[0] * c_[2] - b_[2] * c_[0]) + a_[2] * (b_[0] * c_[1] - b_[1] * c_[0])) / 6
        return abs(v)

    def ausdehnung(shells):   # größte Kantenlänge des umschließenden Quaders (für Träger/Pfetten)
        lo, hi = [1e18] * 3, [-1e18] * 3
        for sh in shells:
            sx = R(sh)
            for fc in (sx[1][0] if sx else []) or []:
                fx = R(fc)
                for bd in (fx[1][0] if fx else []) or []:
                    bx = R(bd)
                    lp = R(bx[1][0]) if bx else None
                    for r in (lp[1][0] if lp and lp[0] == "IFCPOLYLOOP" else []) or []:
                        q = pkt(r)
                        if q:
                            for k in range(min(3, len(q))):
                                lo[k], hi[k] = min(lo[k], q[k]), max(hi[k], q[k])
        return max(0.0, max(hi[k] - lo[k] for k in range(3))) if hi[0] > -1e18 else 0.0

    def koerper(ref, tiefe=0):   # → {"v": Volumen, "a": Profilfläche, "u": Profilumfang, "h": Extrusionstiefe} in Projekteinheiten
        x = R(ref)
        if not x or tiefe > 6:
            return None
        t, a = x
        if t == "IFCEXTRUDEDAREASOLID" and len(a) > 3:
            A, U = profil(a[0])
            d = R(a[2])
            dz = 1.0
            if d and d[1] and d[1][0]:
                vv = [float(z) for z in d[1][0]] + [0.0] * 3
                n = math.sqrt(vv[0] ** 2 + vv[1] ** 2 + vv[2] ** 2) or 1.0
                dz = abs(vv[2] / n)
            h = float(a[3] or 0)
            return {"v": A * h * dz, "a": A, "u": U, "h": h * dz}
        if t in ("IFCBOOLEANCLIPPINGRESULT", "IFCBOOLEANRESULT") and len(a) > 2:
            k = koerper(a[1], tiefe + 1)
            if k and a[0] == ".DIFFERENCE.":
                k2 = koerper(a[2], tiefe + 1)
                if k2 and R(a[2]) and R(a[2])[0] in ("IFCEXTRUDEDAREASOLID", "IFCFACETEDBREP"):
                    k = dict(k, v=max(0.0, k["v"] - k2["v"]))
            return k
        if t == "IFCFACETEDBREP":
            return {"v": netz_volumen([a[0]]), "l": ausdehnung([a[0]])}
        if t == "IFCSHELLBASEDSURFACEMODEL":
            return {"v": netz_volumen(a[0] or []), "l": ausdehnung(a[0] or [])}
        if t == "IFCMAPPEDITEM" and len(a) > 1:
            src, op = R(a[0]), R(a[1])
            sk = 1.0
            if op and len(op[1]) > 3 and isinstance(op[1][3], (int, float)):
                sk = float(op[1][3])
            if not src:
                return None
            rep = R(src[1][1])
            tot = None
            for it in (rep[1][3] if rep else []) or []:
                k = koerper(it, tiefe + 1)
                if k:
                    tot = tot or {"v": 0.0}
                    tot["v"] += k["v"] * sk ** 3
                    for key in ("a", "u", "h", "l"):
                        if key in k and key not in tot:
                            tot[key] = k[key] * (sk ** 2 if key == "a" else sk)
            return tot
        return None

    def form(i):
        """Body- und Axis-Darstellung eines Objekts → {"v", "a", "u", "h", "achse"} (Werte in m, m², m³)."""
        x = E.get(i)
        if not x or len(x[1]) < 7:
            return {}
        pds = R(x[1][6])
        if not pds:
            return {}
        out = {}
        for rp in pds[1][2] or []:
            r = R(rp)
            if not r or len(r[1]) < 4:
                continue
            kennung = str(r[1][1] or "")
            if kennung == "Axis":
                for it in r[1][3] or []:
                    P = kurve(it)
                    if len(P) > 1:
                        out["achse"] = out.get("achse", 0.0) + sum(math.dist(P[k], P[k - 1]) for k in range(1, len(P))) * f_len
            elif kennung in ("Body", ""):
                for it in r[1][3] or []:
                    k = koerper(it)
                    if not k:
                        continue
                    out["v"] = out.get("v", 0.0) + k["v"] * f_len ** 3
                    if k.get("l"):
                        out["l"] = max(out.get("l", 0.0), k["l"] * f_len)
                    if "a" in k:
                        out["a"] = out.get("a", 0.0) + k["a"] * f_len ** 2
                        out["u"] = max(out.get("u", 0.0), k.get("u", 0.0) * f_len)
                        out["h"] = max(out.get("h", 0.0), k.get("h", 0.0) * f_len)
        return out

    # Geschoss je Objekt (enthalten bzw. Räume über Aggregation)
    geschoss, gname = {}, {}
    for i, a in E.alle("IFCBUILDINGSTOREY"):
        hoehe = _wert(a[9]) if len(a) > 9 else None
        gname[i] = (str(a[7] or a[2] or f"Geschoss {i}"), (hoehe or 0) * f_len if isinstance(hoehe, (int, float)) else None)
    for _, a in E.alle("IFCRELCONTAINEDINSPATIALSTRUCTURE"):
        if len(a) >= 6 and isinstance(a[5], tuple):
            for z in a[4] or []:
                if isinstance(z, tuple):
                    geschoss[z[1]] = a[5][1]
    agg = {}
    for _, a in E.alle("IFCRELAGGREGATES"):
        if len(a) >= 6 and isinstance(a[4], tuple):
            agg[a[4][1]] = [z[1] for z in a[5] or [] if isinstance(z, tuple)]
            for z in a[5] or []:
                if isinstance(z, tuple):
                    geschoss.setdefault(z[1], a[4][1])

    def gs(i):
        for _ in range(6):
            if i in gname:
                return gname[i][0]
            i = geschoss.get(i)
            if i is None:
                return ""
        return ""

    def menge(i, *namen):
        Q = mengen.get(i, {})
        for n in namen:
            for k, v in Q.items():
                if k.lower() == n.lower():
                    return v
        return None

    def prop(i, *namen):
        P = props.get(i, {})
        for n in namen:
            for k, v in P.items():
                if (k.lower() == n.lower() or k.lower().endswith("/" + n.lower())) and v not in (None, ""):
                    return v
        return None

    def zahl(v, f=1.0):
        try:
            return float(str(v).replace(",", ".")) * f
        except (TypeError, ValueError):
            return None

    hinweise, aus_geometrie = [], 0
    # Räume
    raeume = []
    for i, a in E.alle("IFCSPACE"):
        nr, name, lang = str(a[2] or "").strip(), str(a[3] or "").strip() if len(a) > 3 else "", str(a[7] or "").strip() if len(a) > 7 else ""
        fl = menge(i, "NetFloorArea", "GrossFloorArea", "NetArea", "Area")
        if fl is None:
            fl = zahl(prop(i, "NetFloorArea", "Fläche", "Grundfläche", "Netto-Grundfläche", "Area", "NGF", "Nettofläche", "Raumfläche"))
        um = menge(i, "NetPerimeter", "GrossPerimeter", "Perimeter")
        if um is None:
            um = zahl(prop(i, "Umfang", "Perimeter"))
        h = menge(i, "FinishCeilingHeight", "Height", "NetHeight", "GrossHeight")
        if h is None:
            h = zahl(prop(i, "Höhe", "Raumhöhe", "Lichte Höhe", "Height"))
            if h is None:   # Allplan-Text „LRH 2.60m“
                m = re.search(r"LRH\s*([\d.,]+)", str(prop(i, "Text1") or ""))
                h = zahl(m.group(1)) if m else None
        if um and um < 1.5 and f_len < 1:
            um /= f_len
        if h and h < 1.0 and f_len < 1:
            h /= f_len
        if not fl or not um or not h:   # aus der Geometrie (Grundfläche und Höhe des Raumkörpers)
            F = form(i)
            if not fl and F.get("a"):
                fl, aus_geometrie = F["a"], aus_geometrie + 1
            um = um or F.get("u") or None
            h = h or F.get("h") or None
        if not fl and not name and not nr:
            continue
        # Allplan: Name = Raumname, Bezeichnung oft leer; sonst Name = Nummer, LongName = Bezeichnung
        if lang:
            nr_, nm_ = nr, lang
        elif re.fullmatch(r"[A-Za-z]{0,3}\s?[\d.\-/]+[a-z]?", nr):
            nr_, nm_ = nr, name or nr
        else:
            nr_, nm_ = "", nr or name
        raeume.append({"nr": nr_[:20], "name": nm_[:200], "flaeche": round(fl or 0, 2), "umfang": round(um, 2) if um else None,
                       "hoehe": round(h, 2) if h and 1.5 <= h <= 20 else None, "geschoss": gs(i)[:40]})

    # Bauteile
    teil_von = set()
    for i, kinder in agg.items():
        if E.typ.get(i) in ("IFCCURTAINWALL", "IFCSTAIR", "IFCRAMP"):
            teil_von.update(kinder)
    dach_platten = {k for i, kinder in agg.items() if E.typ.get(i) == "IFCROOF" for k in kinder}
    oeffnung = {}   # Wand → Fläche ihrer Öffnungen
    for _, a in E.alle("IFCRELVOIDSELEMENT"):
        if len(a) >= 6 and isinstance(a[4], tuple) and isinstance(a[5], tuple):
            F = form(a[5][1])
            if F.get("a"):
                oeffnung[a[4][1]] = oeffnung.get(a[4][1], 0.0) + F["a"]
    wand_der_oeffnung = {a[5][1]: a[4][1] for _, a in E.alle("IFCRELVOIDSELEMENT") if len(a) >= 6 and isinstance(a[4], tuple) and isinstance(a[5], tuple)}
    wand_von = {}   # Fenster/Tür → Wand, in deren Öffnung es sitzt (außen/innen von der Wand)
    for _, a in E.alle("IFCRELFILLSELEMENT"):
        if len(a) >= 6 and isinstance(a[4], tuple) and isinstance(a[5], tuple) and a[4][1] in wand_der_oeffnung:
            wand_von[a[5][1]] = wand_der_oeffnung[a[4][1]]
    gruppen, status_n = {}, {}
    for typ, art0 in ART.items():
        for i in E.nach_typ.get(typ, []):
            a = E.get(i)[1]
            art = art0
            if i in teil_von:
                continue
            if typ == "IFCROOF" and agg.get(i):
                continue
            status = str(prop(i, "Status") or "").strip()
            st = status.lower()
            if st:
                status_n[status] = status_n.get(status, 0) + 1
            if st.startswith("bestand") or st in ("vorhanden", "existing"):
                continue   # Bestand ohne Maßnahme: keine Kosten
            abbruch = st.startswith("abbruch") or st.startswith("rückbau") or st == "demolish"
            pdt = next((x for x in reversed(a) if isinstance(x, str) and x.startswith(".") and x.endswith(".")), "")
            aussen = prop(i, "IsExternal")
            tragend = prop(i, "LoadBearing")
            namen, dicke = mat.get(i, ([], 0.0))
            lagen = []   # Material je Schicht mit Dicke – die Baukosten prüfen, ob es Schichtmaterialien aus dem Katalog sind
            for k_, x_ in enumerate(namen):
                if isinstance(x_, tuple):
                    nm_ = (x_[0] or str(props.get(i, {}).get(f"Object Layer Attributes #{k_ + 1}/Material") or "")).strip()
                    lagen.append((nm_[:80], round(x_[1], 4)))
            namen = schichten(i, namen)
            if not dicke:
                dicke = menge(i, "Width", "Thickness", "Depth") or 0.0
            objname = str(a[2] or "").strip() if len(a) > 2 else ""
            einheit, m, F = "m²", None, None

            def geo():
                nonlocal F
                if F is None:
                    F = form(i)
                return F
            if art == "Wand" and 0 < dicke <= 0.05:   # Putz-/Bekleidungsschicht als eigene Wand modelliert
                art = "Bekleidung"
            if art == "Wand":
                m = menge(i, "NetSideArea", "GrossSideArea", "NetArea", "GrossArea")
                if m is None:
                    g_ = geo()
                    if g_.get("achse") and g_.get("h") and g_.get("v") and dicke and abs(g_["achse"] * g_["h"] * dicke - g_["v"]) < 0.25 * g_["v"]:
                        m = g_["achse"] * g_["h"]
                    elif g_.get("v") and dicke:
                        m = g_["v"] / dicke
                    elif g_.get("achse") and g_.get("h"):
                        m = g_["achse"] * g_["h"]
                    if m:
                        m = max(0.0, m - oeffnung.get(i, 0.0))
                        aus_geometrie += 1
                if aussen is None:
                    aussen = dicke >= 0.30
                if tragend is None:
                    tragend = dicke >= 0.175 or bool(aussen)
                kg = ("331" if tragend else "332") if aussen else ("341" if tragend else "342")
            elif art == "Decke":
                m = menge(i, "NetArea", "GrossArea", "Area")
                if m is None:
                    g_ = geo()
                    m = g_["v"] / dicke if g_.get("v") and dicke else g_.get("a")
                    aus_geometrie += 1 if m else 0
                kg = "322" if pdt == ".BASESLAB." else "361" if (pdt == ".ROOF." or i in dach_platten) else "351"
                art = "Bodenplatte" if kg == "322" else "Dach" if kg == "361" else "Decke"
            elif art == "Dach":
                m, kg = menge(i, "NetArea", "GrossArea", "ProjectedArea"), "361"
            elif art in ("Fenster", "Tür"):
                h_ = _wert(a[8]) if len(a) > 8 and isinstance(_wert(a[8]), (int, float)) else None
                w = _wert(a[9]) if len(a) > 9 and isinstance(_wert(a[9]), (int, float)) else None
                fl = menge(i, "Area") or ((w * h_) * f_len * f_len if w and h_ else None)
                if aussen is None and i in wand_von:
                    w_ = wand_von[i]
                    aussen = prop(w_, "IsExternal")
                    if aussen is None:
                        aussen = (mat.get(w_, ([], 0.0))[1] or 0) >= 0.30
                if aussen is None:
                    aussen = art == "Fenster"
                kg = "334" if aussen else "344"
                if art == "Fenster":
                    m, einheit = fl or 1, ("m²" if fl else "St")
                else:
                    m, einheit = 1, "St"
                if w and h_:
                    objname = f"{round(w * f_len, 2):g} × {round(h_ * f_len, 2):g} m".replace(".", ",")
            elif art in ("Stütze", "Träger", "Treppenlauf", "Geländer", "Profil", "Pfahl", "Schornstein"):
                ln = menge(i, "Length", "Height")
                if not ln:
                    g_ = geo()
                    ln = g_.get("h") or g_.get("l") or (g_.get("v") / g_["a"] if g_.get("v") and g_.get("a") else None)
                m, einheit = (ln, "m") if ln else (1, "St")
                kg = {"Stütze": "333" if aussen else "343", "Träger": "361" if "pfette" in (objname + str(prop(i, "Objektname") or "")).lower() or "sparren" in (objname + str(prop(i, "Objektname") or "")).lower() else "351",
                      "Treppenlauf": "351", "Geländer": "359", "Profil": "337", "Pfahl": "323", "Schornstein": "429"}[art]
            elif art in ("Treppe", "Rampe"):
                m, einheit, kg = 1, "St", "351"
            elif art == "Bekleidung":
                m = menge(i, "NetArea", "GrossArea", "Area", "NetSideArea", "GrossSideArea")
                if m is None:
                    g_ = geo()
                    dd = dicke or zahl(prop(i, "Schichtdicke")) or 0
                    m = g_["v"] / dd if g_.get("v") and dd else g_.get("a")
                    if m and typ.startswith("IFCWALL"):
                        m = max(0.0, m - oeffnung.get(i, 0.0))
                    aus_geometrie += 1 if m else 0
                mt = str(prop(i, "Material") or "")
                if mt and not namen:
                    namen = [mt]
                kg = {".FLOORING.": "353", ".CEILING.": "354", ".CLADDING.": "335" if aussen else "345", ".ROOFING.": "363", ".INSULATION.": "335" if aussen else "345"}.get(pdt, "345")
            elif art in ("Vorhangfassade", "Platte"):
                m, kg = menge(i, "NetArea", "GrossArea", "Area"), "337"
            elif art == "Fundament":
                v = menge(i, "NetVolume", "GrossVolume") or geo().get("v")
                m, einheit = (v, "m³") if v else (1, "St")
                kg = "322"
            elif art == "Sonnenschutz":
                m, einheit, kg = 1, "St", "338"
            else:
                continue
            if abbruch:
                kg, art = "394", f"Abbruch {art}"
            mtxt = ", ".join(n for n in namen if n)[:200]
            # Code aus dem Bauteilkatalog der Bauplattform (Allplan Material/Qualität, z. B. „331.02.004 AW …“)
            such = " ".join([mtxt] + [str(v) for v in props.get(i, {}).values() if isinstance(v, str)])
            mc = CODE_RX.search(such)
            code = mc.group(1) if mc else ""
            key = (kg, art, mtxt, round(dicke or 0, 3), einheit, code, tuple(lagen))
            gr = gruppen.setdefault(key, {"kg": kg, "art": art, "material": mtxt, "dicke": round(dicke or 0, 3), "einheit": einheit, "menge": 0.0, "anzahl": 0,
                                          "aussen": bool(aussen), "tragend": bool(tragend), "ohne_menge": 0, "namen": set(), "code": code, "lagen": list(lagen)})
            gr["menge"] += m or 0
            gr["anzahl"] += 1
            if not gr.get("uw") and kg == "334":   # Fenster/Türen: U-Wert, wenn das Modell ihn mitgibt (für den Wärmeschutz)
                u_ = zahl(prop(i, "ThermalTransmittance", "U-Wert", "Uw"))
                if u_ and 0.1 < u_ < 10:
                    gr["uw"] = round(u_, 2)
            gr["ohne_menge"] += 0 if m else 1
            if objname:
                gr["namen"].add(objname[:60])
    bauteile, klein = [], 0
    for g in sorted(gruppen.values(), key=lambda x: (x["kg"], -x["menge"])):
        if g["einheit"] != "St" and g["menge"] < 0.5:   # Splitter (z. B. falsch modellierte Wandstücke) weglassen
            klein += g["anzahl"]
            continue
        dk = f"{round(g['dicke'] * 100, 1):g} cm".replace(".", ",") if g["dicke"] else ""
        g["name"] = " ".join(x for x in (g["art"], "außen" if g["aussen"] and g["art"] in ("Wand", "Tür", "Stütze") else "", dk) if x)
        g["menge"] = round(g["menge"], 2)
        g["namen"] = sorted(g["namen"])[:5]
        bauteile.append(g)
    ohne = sum(g["ohne_menge"] for g in bauteile) + klein
    if aus_geometrie:
        hinweise.append(f"Das Modell enthält keine Mengen – {aus_geometrie} Mengen aus der Geometrie berechnet (Wandachse × Höhe bzw. Volumen ÷ Dicke, Öffnungen abgezogen). "
                        "Genauer wird es mit „Mengen/Base Quantities“ im IFC-Export.")
    if ohne:
        hinweise.append(f"{ohne} Bauteile ohne verwertbare Menge nicht übernommen.")
    if status_n and any(k.lower().startswith(("bestand", "vorhanden")) for k in status_n):
        b = sum(v for k, v in status_n.items() if k.lower().startswith(("bestand", "vorhanden")))
        hinweise.append(f"{b} Bauteile mit Status „Bestand“ nicht übernommen; Abbruch unter KG 394.")
    if not raeume:
        hinweise.append("Keine Räume (IfcSpace) im Modell – in Allplan beim IFC-Export die Räume mit ausgeben.")
    elif not any(r["flaeche"] for r in raeume):
        hinweise.append("Räume ohne Flächen – beim Export die Raumflächen mit ausgeben.")
    if not any(g["kg"] in ("361", "363") for g in bauteile) and E.nach_typ.get("IFCBEAM"):
        hinweise.append("Dach nur als Träger/Pfetten modelliert – Dachfläche bitte ergänzen.")
    return {"raeume": raeume, "bauteile": bauteile, "geschosse": [v[0] for v in gname.values()], "hinweise": hinweise,
            "info": {"schema": schema, "objekte": len(E), "programm": prog, "status": status_n}}


# ---------------------------------------------------------------- DXF (Grundriss mit Raumpolygonen)
def _paare(text):
    z = text.splitlines()
    for k in range(0, len(z) - 1, 2):
        try:
            yield int(z[k].strip()), z[k + 1].rstrip("\r")
        except ValueError:
            continue


def _mtext(s):
    s = re.sub(r"\\[ACcFfHhQTWp][^;]*;", "", s)
    s = re.sub(r"\\[Pp]", "\n", s)
    s = re.sub(r"[{}]|\\[LlOoKkNn]", "", s)
    s = re.sub(r"%%[cC]", "Ø", s)
    s = s.replace("%%d", "°").replace("%%D", "°").replace("\\~", " ")
    return s.strip()


def _flaeche(P):
    return abs(sum(P[k][0] * P[k - 1][1] - P[k - 1][0] * P[k][1] for k in range(len(P)))) / 2


def _umfang(P):
    return sum(math.dist(P[k], P[k - 1]) for k in range(len(P)))


def _innen(x, y, P):
    drin = False
    for k in range(len(P)):
        (x1, y1), (x2, y2) = P[k - 1], P[k]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            drin = not drin
    return drin


FLAECHE_TXT = re.compile(r"^\s*(?:(?:NGF|NRF|NF|F|A|Fläche|Flaeche)\s*[:=]?\s*)?(\d{1,4}(?:[.,]\d{1,3})?)\s*(m²|m2|qm|m\^2)?\s*$", re.I)
NR_TXT = re.compile(r"^\s*(?:R(?:aum)?\.?\s*)?([A-Z]{0,2}\s?\d{1,3}(?:[.,\-/]\d{1,3}){0,3}[a-z]?)\s*$")


def dxf_lesen(raw):
    text = raw.decode("utf-8", "replace") if isinstance(raw, (bytes, bytearray)) else str(raw)
    if "SECTION" not in text[:5000] or "ENTITIES" not in text:
        raise ValueError("Das ist keine DXF-Datei im Textformat (binäre DXF bitte als ASCII-DXF exportieren).")
    if text.lstrip().startswith("AC10") or "\x00" in text[:200]:
        raise ValueError("Binäre DXF-Datei – bitte als ASCII-DXF exportieren.")
    ins = None
    m = re.search(r"\$INSUNITS\s*\r?\n\s*70\s*\r?\n\s*(\d+)", text)
    if m:
        ins = int(m.group(1))
    zeilen = text.splitlines()
    k0 = next((k + 1 for k in range(1, len(zeilen)) if zeilen[k].strip() == "ENTITIES" and zeilen[k - 1].strip() == "2"), None)
    if k0 is None:
        raise ValueError("Kein ENTITIES-Abschnitt in der DXF-Datei.")
    teil = "\n".join(zeilen[k0:])
    polys, texte = [], []
    akt, typ = None, None
    poly_alt = None   # POLYLINE + VERTEX
    for code, val in _paare(teil):
        if code == 0:
            if akt is not None:
                if typ == "LWPOLYLINE" and akt.get("geschl") and len(akt["p"]) >= 3:
                    polys.append(akt)
                elif typ in ("TEXT", "MTEXT", "ATTRIB") and akt.get("t"):
                    texte.append(akt)
                elif typ == "VERTEX" and poly_alt is not None and "x" in akt:
                    poly_alt["p"].append((akt["x"], akt.get("y", 0.0)))
            if val == "SEQEND" and poly_alt is not None:
                if poly_alt.get("geschl") and len(poly_alt["p"]) >= 3:
                    polys.append(poly_alt)
                poly_alt = None
            if val == "ENDSEC":
                break
            typ = val
            akt = {"p": [], "layer": "", "t": ""}
            if val == "POLYLINE":
                poly_alt = akt
            continue
        if akt is None:
            continue
        if code == 8:
            akt["layer"] = val.strip()
        elif typ == "LWPOLYLINE":
            if code == 70:
                akt["geschl"] = int(val or 0) & 1
            elif code == 10:
                akt["p"].append([float(val), 0.0])
            elif code == 20 and akt["p"]:
                akt["p"][-1][1] = float(val)
        elif typ == "POLYLINE" and code == 70:
            akt["geschl"] = int(val or 0) & 1
        elif typ == "VERTEX":
            if code == 10:
                akt["x"] = float(val)
            elif code == 20:
                akt["y"] = float(val)
        elif typ in ("TEXT", "MTEXT", "ATTRIB"):
            if code in (1, 3):
                akt["t"] += val
            elif code == 10:
                akt["x"] = float(val)
            elif code == 20:
                akt["y"] = float(val)
            elif code == 11 and typ == "TEXT":
                akt["x2"] = float(val)
            elif code == 21 and typ == "TEXT":
                akt["y2"] = float(val)
    for t in texte:
        t["t"] = _mtext(t["t"])
        if t.get("x2") is not None and abs(t.get("x2") or 0) + abs(t.get("y2") or 0) > 0:   # ausgerichteter Text: Ausrichtepunkt
            t["x"], t["y"] = t["x2"], t["y2"]
    # Einheit: $INSUNITS (4 mm, 5 cm, 6 m), sonst aus der Größe der Polygone geschätzt
    f = {4: 0.001, 5: 0.01, 6: 1.0, 1: 0.0254, 2: 0.3048}.get(ins)
    if f is None:
        fl = sorted(_flaeche(p["p"]) for p in polys)
        med = fl[len(fl) // 2] if fl else 0
        f = 0.001 if med > 1e5 else 0.01 if med > 1e3 else 1.0
    hinweise = []
    lay = [p for p in polys if re.search(r"raum|room|fläche|flaeche|nrf|ngf|space", p["layer"], re.I)]
    kand = lay or polys
    if lay:
        hinweise.append(f"Raumpolygone von den Layern {', '.join(sorted({p['layer'] for p in lay})[:4])}.")
    for p in kand:
        p["a"] = _flaeche(p["p"]) * f * f
        p["u"] = _umfang(p["p"]) * f
        xs, ys = [q[0] for q in p["p"]], [q[1] for q in p["p"]]
        p["bb"] = (min(xs), min(ys), max(xs), max(ys))
        p["texte"] = []
    kand = [p for p in kand if 0.8 <= p["a"] <= 5000]
    kand.sort(key=lambda p: p["a"])
    for t in texte:   # Text dem kleinsten Polygon zuordnen, das ihn enthält
        if "x" not in t:
            continue
        for p in kand:
            b = p["bb"]
            if b[0] <= t["x"] <= b[2] and b[1] <= t["y"] <= b[3] and _innen(t["x"], t["y"], p["p"]):
                p["texte"].append(t["t"])
                break
    raeume, gesehen = [], set()
    for p in kand:
        T = [x for t in p["texte"] for x in t.split("\n") if x.strip()]
        if not T:
            continue
        name = next((x for x in T if re.search(r"[A-Za-zÄÖÜäöü]{3,}", x) and not FLAECHE_TXT.match(x) and not re.match(r"^\s*(U|LH|RH|H|UK|OK|B)\s*[:=]", x)), "")
        def ist_flaeche(x):
            m = FLAECHE_TXT.match(x)
            return bool(m and (m.group(2) or "," in m.group(1) or re.match(r"(?i)\s*(NGF|NRF|NF|Fläche|Flaeche)", x)))
        nr = next((NR_TXT.match(x).group(1).strip() for x in T if NR_TXT.match(x) and not ist_flaeche(x)), "")
        if not name and not nr:
            continue
        a_txt = None
        for x in T:
            if ist_flaeche(x):
                a_txt = float(FLAECHE_TXT.match(x).group(1).replace(",", "."))
        key = (nr, name, round(p["a"], 1))
        if key in gesehen:
            continue
        gesehen.add(key)
        raeume.append({"nr": nr[:20], "name": name[:200], "flaeche": round(a_txt or p["a"], 2), "flaeche_polygon": round(p["a"], 2),
                       "umfang": round(p["u"], 2), "layer": p["layer"], "geschoss": ""})
    if not raeume:
        hinweise.append("Keine beschrifteten Raumpolygone gefunden – Räume als geschlossene Polylinien mit Raumtext (Name/Nummer) im Polygon exportieren.")
    abw = [r for r in raeume if r["flaeche_polygon"] and abs(r["flaeche"] - r["flaeche_polygon"]) > max(0.5, r["flaeche"] * 0.05)]
    if abw:
        hinweise.append(f"Bei {len(abw)} Räumen weicht die beschriftete Fläche um mehr als 5 % vom Polygon ab – die Beschriftung gilt, bitte prüfen.")
    return {"raeume": raeume, "hinweise": hinweise, "info": {"einheit": {0.001: "mm", 0.01: "cm", 1.0: "m"}.get(f, str(f)), "polygone": len(polys), "texte": len(texte)}}
