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
            m = re.match(r"#(\d+)", t[i:])
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
            m = re.match(r"[A-Z0-9_]+", t[i:])
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
            m = re.match(r"[-+]?(\d+\.?\d*([eE][-+]?\d+)?|\.\d+)", t[i:])
            if not m:
                i += 1
                continue
            s = m.group(0)
            out.append(float(s) if any(c in s for c in ".eE") else int(s))
            i += len(s)
    return out, i


def _entitaeten(text):
    """DATA-Abschnitt → {id: (TYP, args)}. Zeichenketten dürfen „;“ und Zeilenumbrüche enthalten."""
    E = {}
    a = text.find("DATA;")
    t = text[a + 5:] if a >= 0 else text
    for m in _ENT.finditer(t):
        try:
            args, _ = _parse_args(t, m.end())
        except Exception:
            continue
        E[int(m.group(1))] = (m.group(2), args)
    return E


def _wert(v):
    while isinstance(v, _Typ):
        v = v.wert
    if v == ".T.":
        return True
    if v == ".F.":
        return False
    return v


def ifc_lesen(raw):
    text = raw.decode("utf-8", "replace") if isinstance(raw, (bytes, bytearray)) else str(raw)
    if "ISO-10303-21" not in text[:200]:
        raise ValueError("Das ist keine IFC-Datei (STEP, ISO 10303-21).")
    schema = (re.search(r"FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'", text) or [None, ""])[1]
    autor = (re.search(r"FILE_NAME\s*\((.*?)\);", text, re.S) or [None, ""])[1]
    E = _entitaeten(text)
    if not E:
        raise ValueError("In der IFC-Datei wurden keine Objekte gefunden.")
    R = lambda r: E.get(r[1]) if isinstance(r, tuple) and r and r[0] == "#" else None   # noqa: E731

    # Einheiten (Länge mm/cm/m, Fläche, Volumen)
    f_len, f_area, f_vol = 1.0, 1.0, 1.0
    PRE = {".MILLI.": 1e-3, ".CENTI.": 1e-2, ".DECI.": 1e-1, None: 1.0, ".KILO.": 1e3}
    for typ, a in E.values():
        if typ == "IFCSIUNIT" and len(a) >= 4:
            p = PRE.get(a[2], 1.0)
            if a[1] == ".LENGTHUNIT.":
                f_len = p
            elif a[1] == ".AREAUNIT.":
                f_area = p * p
            elif a[1] == ".VOLUMEUNIT.":
                f_vol = p ** 3

    # Eigenschaften und Mengen je Objekt
    props, mengen = {}, {}
    for typ, a in E.values():
        if typ != "IFCRELDEFINESBYPROPERTIES" or len(a) < 6:
            continue
        ziele = [x[1] for x in (a[4] or []) if isinstance(x, tuple)]
        d = R(a[5])
        if not d:
            continue
        if d[0] == "IFCELEMENTQUANTITY":
            for q in d[1][5] or []:
                qq = R(q)
                if not qq:
                    continue
                qt, qa = qq
                nm, v = qa[0], _wert(qa[3]) if len(qa) > 3 else None
                if not isinstance(v, (int, float)):
                    continue
                f = f_area if qt == "IFCQUANTITYAREA" else f_vol if qt == "IFCQUANTITYVOLUME" else f_len if qt == "IFCQUANTITYLENGTH" else 1.0
                for z in ziele:
                    mengen.setdefault(z, {})[str(nm)] = v * f
        elif d[0] == "IFCPROPERTYSET":
            for p in d[1][4] or []:
                pp = R(p)
                if pp and pp[0] == "IFCPROPERTYSINGLEVALUE":
                    v = _wert(pp[1][2]) if len(pp[1]) > 2 else None
                    for z in ziele:
                        props.setdefault(z, {})[str(pp[1][0])] = v

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
                    nm = (material(ly[1][0], tiefe + 1)[0] or [""])[0]
                    dk = (_wert(ly[1][1]) or 0) * f_len
                    d += dk
                    namen.append(f"{nm} {round(dk * 100, 1):g} cm".replace(".", ",").strip() if dk else nm)
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

    mat = {}
    for typ, a in E.values():
        if typ == "IFCRELASSOCIATESMATERIAL" and len(a) >= 6:
            m = material(a[5])
            for z in a[4] or []:
                if isinstance(z, tuple):
                    mat[z[1]] = m

    # Geschoss je Objekt (enthalten bzw. Räume über Aggregation)
    geschoss, gname = {}, {}
    for i, (typ, a) in E.items():
        if typ == "IFCBUILDINGSTOREY":
            hoehe = _wert(a[9]) if len(a) > 9 else None
            gname[i] = (str(a[7] or a[2] or f"Geschoss {i}"), (hoehe or 0) * f_len if isinstance(hoehe, (int, float)) else None)
    for typ, a in E.values():
        if typ == "IFCRELCONTAINEDINSPATIALSTRUCTURE" and len(a) >= 6 and isinstance(a[5], tuple):
            for z in a[4] or []:
                if isinstance(z, tuple):
                    geschoss[z[1]] = a[5][1]
        elif typ == "IFCRELAGGREGATES" and len(a) >= 6 and isinstance(a[4], tuple):
            for z in a[5] or []:
                if isinstance(z, tuple):
                    geschoss.setdefault(z[1], a[4][1])
    def gs(i):   # Raum → Geschoss (auch über Zonen/Bereiche)
        for _ in range(5):
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
                if k.lower() == n.lower() and v not in (None, ""):
                    return v
        return None

    def zahl(v, f=1.0):
        try:
            return float(str(v).replace(",", ".")) * f
        except (TypeError, ValueError):
            return None

    # Räume
    raeume = []
    for i, (typ, a) in E.items():
        if typ != "IFCSPACE":
            continue
        nr, name, lang = str(a[2] or ""), str(a[3] or ""), str(a[7] or "") if len(a) > 7 else ""
        fl = menge(i, "NetFloorArea", "GrossFloorArea", "NetArea", "Area")
        if fl is None:
            fl = zahl(prop(i, "NetFloorArea", "Fläche", "Grundfläche", "Netto-Grundfläche", "Area", "NGF", "Nettofläche"))
        um = menge(i, "NetPerimeter", "GrossPerimeter", "Perimeter")
        if um is None:
            um = zahl(prop(i, "Umfang", "Perimeter"), f_len if (zahl(prop(i, "Umfang", "Perimeter")) or 0) > 500 else 1.0)
        h = menge(i, "FinishCeilingHeight", "Height", "NetHeight", "GrossHeight")
        if h is None:
            h = zahl(prop(i, "Höhe", "Raumhöhe", "Lichte Höhe", "Height"))
            if h and h > 50:
                h *= f_len
        if um and um < 1.5 and f_len < 1:   # Länge offenbar schon in m statt in Projekteinheit
            um /= f_len
        if h and h < 1.0 and f_len < 1:
            h /= f_len
        if not fl and not name and not nr:
            continue
        raeume.append({"nr": nr[:20], "name": (lang or name or nr)[:200] if lang and name and lang != name else (name or lang or nr)[:200],
                       "flaeche": round(fl or 0, 2), "umfang": round(um, 2) if um else None, "hoehe": round(h, 2) if h and 1.5 <= h <= 20 else None,
                       "geschoss": gs(i)[:40]})
        if lang and name and lang != name and name != nr:   # Allplan: Name = Kürzel/Nummer, LongName = Bezeichnung
            raeume[-1]["nr"] = raeume[-1]["nr"] or name[:20]

    # Bauteile
    ART = {"IFCWALL": "Wand", "IFCWALLSTANDARDCASE": "Wand", "IFCWALLELEMENTEDCASE": "Wand", "IFCSLAB": "Decke", "IFCSLABSTANDARDCASE": "Decke",
           "IFCROOF": "Dach", "IFCWINDOW": "Fenster", "IFCWINDOWSTANDARDCASE": "Fenster", "IFCDOOR": "Tür", "IFCDOORSTANDARDCASE": "Tür",
           "IFCCOLUMN": "Stütze", "IFCCOLUMNSTANDARDCASE": "Stütze", "IFCBEAM": "Unterzug", "IFCBEAMSTANDARDCASE": "Unterzug",
           "IFCSTAIR": "Treppe", "IFCSTAIRFLIGHT": "Treppenlauf", "IFCRAMP": "Rampe", "IFCRAILING": "Geländer", "IFCCOVERING": "Bekleidung",
           "IFCCURTAINWALL": "Vorhangfassade", "IFCFOOTING": "Fundament", "IFCPILE": "Pfahl", "IFCPLATE": "Platte", "IFCMEMBER": "Profil",
           "IFCCHIMNEY": "Schornstein", "IFCSHADINGDEVICE": "Sonnenschutz"}
    teil_von = set()   # Platten/Profile einer Vorhangfassade, Läufe einer Treppe, Platten eines Dachs nicht doppelt zählen
    agg = {}
    for typ, a in E.values():
        if typ == "IFCRELAGGREGATES" and len(a) >= 6 and isinstance(a[4], tuple):
            agg[a[4][1]] = [z[1] for z in a[5] or [] if isinstance(z, tuple)]
    for i, kinder in agg.items():
        t = E.get(i, ("",))[0]
        if t in ("IFCCURTAINWALL", "IFCSTAIR", "IFCRAMP"):
            teil_von.update(kinder)
    dach_platten = {k for i, kinder in agg.items() if E.get(i, ("",))[0] == "IFCROOF" for k in kinder}
    gruppen, hinweise = {}, []
    for i, (typ, a) in E.items():
        art = ART.get(typ)
        if not art or i in teil_von:
            continue
        if typ == "IFCROOF" and agg.get(i):   # Dach aus Dachplatten: die Platten zählen
            continue
        pdt = next((x for x in reversed(a) if isinstance(x, str) and x.startswith(".") and x.endswith(".")), "")
        aussen = prop(i, "IsExternal")
        tragend = prop(i, "LoadBearing")
        namen, dicke = mat.get(i, ([], 0.0))
        if not dicke:
            dicke = menge(i, "Width", "Thickness", "Depth") or 0.0
        objname = str(a[2] or "") if len(a) > 2 else ""
        einheit, m = "m²", None
        if art == "Wand":
            m = menge(i, "NetSideArea", "GrossSideArea", "NetArea", "GrossArea")
            if m is None and menge(i, "Length") and menge(i, "Height"):
                m = menge(i, "Length") * menge(i, "Height")
            if aussen is None:
                aussen = dicke >= 0.30
            if tragend is None:
                tragend = dicke >= 0.175 or bool(aussen)
            kg = ("331" if tragend else "332") if aussen else ("341" if tragend else "342")
        elif art == "Decke":
            m = menge(i, "NetArea", "GrossArea", "Area")
            if m is None and menge(i, "NetVolume", "GrossVolume") and dicke:
                m = menge(i, "NetVolume", "GrossVolume") / dicke
            kg = "322" if pdt == ".BASESLAB." else "361" if (pdt == ".ROOF." or i in dach_platten) else "351"
            art = "Bodenplatte" if kg == "322" else "Dach" if kg == "361" else "Decke"
        elif art == "Dach":
            m, kg = menge(i, "NetArea", "GrossArea", "ProjectedArea"), "361"
        elif art in ("Fenster", "Tür"):
            w = _wert(a[9]) if len(a) > 9 and isinstance(_wert(a[9]), (int, float)) else None
            h_ = _wert(a[8]) if len(a) > 8 and isinstance(_wert(a[8]), (int, float)) else None
            fl = menge(i, "Area") or ((w * h_) * f_len * f_len if w and h_ else None)
            if aussen is None:
                aussen = art == "Fenster"
            kg = "334" if aussen else "344"
            if art == "Fenster":
                m, einheit = fl, "m²"
            else:
                m, einheit = 1, "St"
            if fl and art == "Tür":
                objname = objname or f"{round(w * f_len, 2) if w else ''} × {round(h_ * f_len, 2) if h_ else ''} m"
        elif art in ("Stütze", "Unterzug", "Treppenlauf", "Geländer", "Profil", "Pfahl", "Schornstein"):
            ln = menge(i, "Length", "Height")
            m, einheit = (ln, "m") if ln else (1, "St")
            kg = {"Stütze": "333" if aussen else "343", "Unterzug": "351", "Treppenlauf": "351", "Geländer": "359", "Profil": "337", "Pfahl": "323", "Schornstein": "429"}[art]
        elif art in ("Treppe", "Rampe"):
            m, einheit, kg = 1, "St", "351"
        elif art == "Bekleidung":
            m = menge(i, "NetArea", "GrossArea", "Area")
            kg = {".FLOORING.": "353", ".CEILING.": "354", ".CLADDING.": "335" if aussen else "345", ".ROOFING.": "363", ".INSULATION.": "335" if aussen else "345"}.get(pdt, "345")
        elif art in ("Vorhangfassade", "Platte"):
            m, kg = menge(i, "NetArea", "GrossArea", "Area"), "337"
        elif art == "Fundament":
            v = menge(i, "NetVolume", "GrossVolume")
            m, einheit = (v, "m³") if v else (1, "St")
            kg = "322"
        elif art == "Sonnenschutz":
            m, einheit, kg = 1, "St", "338"
        else:
            continue
        if m is None:
            m = 0
        mtxt = ", ".join(n for n in namen if n)[:200]
        key = (kg, art, mtxt, round(dicke or 0, 3), einheit)
        gr = gruppen.setdefault(key, {"kg": kg, "art": art, "material": mtxt, "dicke": round(dicke or 0, 3), "einheit": einheit, "menge": 0.0, "anzahl": 0,
                                      "aussen": bool(aussen), "tragend": bool(tragend), "ohne_menge": 0, "namen": set()})
        gr["menge"] += m or 0
        gr["anzahl"] += 1
        gr["ohne_menge"] += 0 if m else 1
        if objname:
            gr["namen"].add(objname[:60])
    bauteile = []
    for g in sorted(gruppen.values(), key=lambda x: (x["kg"], -x["menge"])):
        dk = f"{round(g['dicke'] * 100, 1):g} cm".replace(".", ",") if g["dicke"] else ""
        g["name"] = " ".join(x for x in (g["art"], "außen" if g["aussen"] and g["art"] in ("Wand", "Tür", "Stütze") else "", dk) if x)
        g["menge"] = round(g["menge"], 2)
        g["namen"] = sorted(g["namen"])[:5]
        bauteile.append(g)
    ohne = sum(g["ohne_menge"] for g in bauteile)
    if ohne:
        hinweise.append(f"{ohne} Bauteile ohne Mengen im Modell – beim IFC-Export „Mengen/Base Quantities“ mit ausgeben.")
    if not raeume:
        hinweise.append("Keine Räume (IfcSpace) im Modell – in Allplan beim IFC-Export die Räume mit ausgeben.")
    elif not any(r["flaeche"] for r in raeume):
        hinweise.append("Räume ohne Flächen – beim Export die Raumflächen (Base Quantities oder Raumbuch-Attribute) mit ausgeben.")
    return {"raeume": raeume, "bauteile": bauteile, "geschosse": [v[0] for v in gname.values()], "hinweise": hinweise,
            "info": {"schema": schema, "objekte": len(E), "programm": (re.findall(r"'([^']*)'", autor) or [""])[-2:][0] if autor else ""}}


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
