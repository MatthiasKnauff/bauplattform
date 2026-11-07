"""Grundstück zur Baustelle: Gemarkung, Flur, Flurstück (ALKIS) und Geländehöhe über NHN (DGM1) – Geobasis NRW.

Dieselben amtlichen Daten wie in TIM-online, aber direkt über die offenen Dienste von Geobasis NRW (Datenlizenz Deutschland – Zero 2.0):
- WFS NW ALKIS Vereinfacht: Flurstücke mit Gemarkung, Flur, Zähler/Nenner, Fläche, Lagebezeichnung
- WCS NW DGM: Digitales Geländemodell (1 m Raster), Höhen im DHHN2016 = Normalhöhennull (NHN)
Ablauf: Koordinate der Baustelle (Projekt bzw. Adresse über OpenStreetMap) → UTM 32 (ETRS89, EPSG:25832) →
Flurstücke im Umkreis, das Flurstück unter dem Punkt zuerst, weitere mit derselben Hausnummer → Höhe am Punkt.
Ohne zusätzliche Pakete: XML mit ElementTree, GeoTIFF mit einem kleinen eigenen Leser.
"""
import json
import math
import re
import struct
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zlib

WFS = "https://www.wfs.nrw.de/geobasis/wfs_nw_alkis_vereinfacht"
WCS = "https://www.wcs.nrw.de/geobasis/wcs_nw_dgm"
NOMINATIM = "https://nominatim.openstreetmap.org/search"
UA = "Bauplattform/1.0 (self-hosted; Grundstücksabfrage)"
TIMEOUT = 15
_WCS_CACHE = {}


class Fehler(Exception):
    pass


def _get(url, accept="*/*"):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept, "Accept-Language": "de"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.read(), r.headers.get("Content-Type", "")
    except Exception as e:   # Netz, Zeitüberschreitung, HTTP-Fehler
        raise Fehler(f"{urllib.parse.urlsplit(url).netloc} nicht erreichbar ({e})")


# ---------------------------------------------------------------- Koordinaten: WGS84 → ETRS89 / UTM Zone 32 (EPSG:25832)
def utm32(lat, lon):
    """Geographische Koordinaten (Grad) → Rechtswert E, Hochwert N in Metern (UTM 32, GRS80 ≈ WGS84, Fehler < 1 mm)."""
    a, f = 6378137.0, 1 / 298.257222101
    k0, lon0 = 0.9996, math.radians(9.0)
    e2 = f * (2 - f)
    ep2 = e2 / (1 - e2)
    phi, lam = math.radians(lat), math.radians(lon)
    n = a / math.sqrt(1 - e2 * math.sin(phi) ** 2)
    t = math.tan(phi) ** 2
    c = ep2 * math.cos(phi) ** 2
    aa = math.cos(phi) * (lam - lon0)
    m = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi
             - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * math.sin(2 * phi)
             + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * math.sin(4 * phi)
             - (35 * e2 ** 3 / 3072) * math.sin(6 * phi))
    e = k0 * n * (aa + (1 - t + c) * aa ** 3 / 6 + (5 - 18 * t + t ** 2 + 72 * c - 58 * ep2) * aa ** 5 / 120) + 500000.0
    nn = k0 * (m + n * math.tan(phi) * (aa ** 2 / 2 + (5 - t + 9 * c + 4 * c ** 2) * aa ** 4 / 24
                                          + (61 - 58 * t + t ** 2 + 600 * c - 330 * ep2) * aa ** 6 / 720))
    return e, nn


def adresse_suchen(strasse, plz, ort):
    """Adresse → (lat, lon) über OpenStreetMap/Nominatim (höchstens eine Anfrage je Klick)."""
    q = ", ".join(x for x in (strasse, " ".join(y for y in (plz, ort) if y)) if x)
    if not q:
        return None
    raw, _ = _get(NOMINATIM + "?" + urllib.parse.urlencode({"q": q + ", Deutschland", "format": "jsonv2", "limit": 1}), "application/json")
    hits = json.loads(raw.decode("utf-8") or "[]")
    return (float(hits[0]["lat"]), float(hits[0]["lon"])) if hits else None


# ---------------------------------------------------------------- Flurstücke (WFS, GML)
def _lokal(tag):
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def _ringe(geom):
    """Alle Polygonringe (äußere und innere) eines GML-Geometrieelements als Listen von (E, N)."""
    out = []
    for el in geom.iter():
        name = _lokal(el.tag)
        if name in ("posList", "coordinates") and el.text:
            zahlen = [float(x) for x in re.split(r"[\s,]+", el.text.strip()) if x]
            dim = int(el.get("srsDimension") or el.get("dimension") or 2)
            if name == "coordinates":
                dim = 2
            out.append([(zahlen[i], zahlen[i + 1]) for i in range(0, len(zahlen) - dim + 1, dim)])
    return out


def _innen(p, ring):
    x, y = p
    drin = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1:
            drin = not drin
    return drin


def flurstuecke(e, n, umkreis=35.0):
    """Flurstücke im Umkreis (Quadrat ±umkreis Meter) um den Punkt; je Flurstück die Angaben und ob der Punkt darin liegt."""
    url = WFS + "?" + urllib.parse.urlencode({
        "SERVICE": "WFS", "VERSION": "2.0.0", "REQUEST": "GetFeature", "TYPENAMES": "ave:Flurstueck", "COUNT": "60",
        "SRSNAME": "urn:ogc:def:crs:EPSG::25832",
        "BBOX": f"{e - umkreis:.2f},{n - umkreis:.2f},{e + umkreis:.2f},{n + umkreis:.2f},urn:ogc:def:crs:EPSG::25832"})
    raw, _ = _get(url, "application/gml+xml, text/xml")
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        raise Fehler("Antwort des ALKIS-Dienstes nicht lesbar")
    if _lokal(root.tag) in ("ExceptionReport", "ServiceExceptionReport"):
        txt = " ".join(t.strip() for t in root.itertext() if t.strip())
        raise Fehler(f"ALKIS-Dienst: {txt[:300]}")
    out = []
    for f in root.iter():
        if _lokal(f.tag) != "Flurstueck":
            continue
        d, ringe = {}, []
        for ch in f:
            name = _lokal(ch.tag)
            if len(ch):
                ringe += _ringe(ch)
            elif ch.text is not None:
                d[name] = ch.text.strip()
        drin = any(_innen((e, n), r) for r in ringe[:1]) if ringe else False
        if ringe and len(ringe) > 1 and drin:   # in einem inneren Ring (Loch) liegt der Punkt nicht im Flurstück
            drin = not any(_innen((e, n), r) for r in ringe[1:])
        # Abstand zum Punkt (Mittelpunkt des Umrings) für die Sortierung
        if ringe:
            xs, ys = zip(*ringe[0])
            ab = math.hypot(sum(xs) / len(xs) - e, sum(ys) / len(ys) - n)
        else:
            ab = 9e9
        out.append(_flurstueck(d, drin, ab))
    return out


def _flurstueck(d, drin, ab):
    z, nen = (d.get("flstnrzae") or "").lstrip("0"), (d.get("flstnrnen") or "").lstrip("0")
    flur = d.get("flur") or ""
    m = re.search(r"(\d+)\s*$", flur)   # „Flur 3“ / „3“ / Schlüssel
    return {"gemarkung": d.get("gemarkung") or "", "gemarkungsnr": d.get("gemaschl") or "", "flur": m.group(1).lstrip("0") or "0" if m else flur,
            "flurstueck": f"{z}/{nen}" if nen else z, "kennzeichen": d.get("flstkennz") or "", "flaeche": _zahl(d.get("flaeche")),
            "lage": d.get("lagebeztxt") or "", "gemeinde": d.get("gemeinde") or "", "nutzung": d.get("tntxt") or "",
            "aktualitaet": (d.get("aktualit") or "")[:10], "am_punkt": bool(drin), "abstand": round(ab, 1)}


def _zahl(x):
    try:
        return float(str(x).replace(",", "."))
    except (TypeError, ValueError):
        return None


def _norm(t):
    t = (t or "").lower().replace("ß", "ss").replace("strasse", "str").replace("str.", "str")
    return re.sub(r"[^a-z0-9äöü]", "", t)


def _str_nr(t):
    """'Grillostraße 24 a' → ('grillostr', '24a')"""
    m = re.match(r"^(.*?)(\d+[a-z]?)$", _norm(t))
    return (m.group(1), m.group(2)) if m else (_norm(t), "")


def auswahl(liste, strasse):
    """Flurstück unter dem Punkt plus weitere mit derselben Lagebezeichnung (Straße + Hausnummer)."""
    zs, zn = _str_nr(strasse)
    treffer = []
    for f in liste:
        lage = [_str_nr(x) for x in re.split(r"[;,|]\s*|\s{2,}", f["lage"]) if x.strip()]
        f["gleiche_adresse"] = bool(zs and zn and any(n == zn and (s == zs or s[:7] == zs[:7]) for s, n in lage))
        if f["am_punkt"] or f["gleiche_adresse"]:
            treffer.append(f)
    treffer.sort(key=lambda f: (not f["am_punkt"], f["abstand"]))
    if not treffer and liste:   # Punkt zwischen den Umringen (z. B. auf der Straße): nächstes Flurstück
        treffer = sorted(liste, key=lambda f: f["abstand"])[:1]
    return treffer


# ---------------------------------------------------------------- Geländehöhe (WCS DGM1 → GeoTIFF)
def _wcs_info():
    """CoverageId des DGM und Achsenbezeichnungen – einmal je Prozess vom Dienst gelesen."""
    if _WCS_CACHE:
        return _WCS_CACHE
    raw, _ = _get(WCS + "?SERVICE=WCS&REQUEST=GetCapabilities&VERSION=2.0.1", "text/xml")
    ids = [el.text.strip() for el in ET.fromstring(raw).iter() if _lokal(el.tag) == "CoverageId" and el.text]
    if not ids:
        raise Fehler("Höhendienst: keine Coverage gefunden")
    cid = next((i for i in ids if re.search(r"dgm", i, re.I) and not re.search(r"schatt|relief|hang", i, re.I)), ids[0])
    achsen = ["x", "y"]
    try:
        raw, _ = _get(WCS + "?" + urllib.parse.urlencode({"SERVICE": "WCS", "REQUEST": "DescribeCoverage", "VERSION": "2.0.1", "COVERAGEID": cid}), "text/xml")
        for el in ET.fromstring(raw).iter():
            if el.get("axisLabels"):
                achsen = el.get("axisLabels").split()[:2]
                break
    except (Fehler, ET.ParseError):
        pass
    _WCS_CACHE.update(id=cid, achsen=achsen)
    return _WCS_CACHE


def hoehe(e, n):
    """Geländehöhe in m über NHN am Punkt (Mittel der Rasterzellen im Umkreis von 1 m)."""
    w = _wcs_info()
    ax, ay = w["achsen"]
    if ax.lower() in ("y", "n", "lat", "north", "northing"):   # Achsenfolge Nord/Ost
        ax, ay = ay, ax
    q = [("SERVICE", "WCS"), ("VERSION", "2.0.1"), ("REQUEST", "GetCoverage"), ("COVERAGEID", w["id"]), ("FORMAT", "image/tiff"),
         ("SUBSET", f"{ax}({e - 1.5:.2f},{e + 1.5:.2f})"), ("SUBSET", f"{ay}({n - 1.5:.2f},{n + 1.5:.2f})")]
    raw, ctype = _get(WCS + "?" + urllib.parse.urlencode(q), "image/tiff")
    if not raw[:4] in (b"II*\x00", b"MM\x00*"):
        txt = raw[:600].decode("utf-8", "replace")
        txt = re.sub(r"<[^>]+>", " ", txt)
        raise Fehler("Höhendienst: " + " ".join(txt.split())[:250])
    werte = [v for v in tiff_werte(raw) if v is not None and -500 < v < 3000]
    if not werte:
        raise Fehler("Höhendienst: keine Höhe am Punkt")
    werte.sort()
    return round(werte[len(werte) // 2], 2)


def tiff_werte(raw):
    """Alle Werte des ersten Bildes eines GeoTIFF (Gleitkomma oder Ganzzahl, ohne/Deflate/LZW, Prädiktor 1–3)."""
    bo = "<" if raw[:2] == b"II" else ">"
    (ifd,) = struct.unpack(bo + "I", raw[4:8])
    (anz,) = struct.unpack(bo + "H", raw[ifd:ifd + 2])
    T = {}
    groesse = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 16: 8}
    form = {1: "B", 3: "H", 4: "I", 6: "b", 8: "h", 9: "i", 11: "f", 12: "d", 16: "Q"}
    for k in range(anz):
        p = ifd + 2 + 12 * k
        tag, typ, cnt = struct.unpack(bo + "HHI", raw[p:p + 8])
        g = groesse.get(typ, 1) * cnt
        off = p + 8 if g <= 4 else struct.unpack(bo + "I", raw[p + 8:p + 12])[0]
        if typ == 2:
            T[tag] = raw[off:off + cnt].rstrip(b"\x00").decode("latin-1")
        elif typ in form:
            T[tag] = list(struct.unpack(bo + form[typ] * cnt, raw[off:off + g]))
    breite, hoehe_ = T[256][0], T[257][0]
    bits = (T.get(258) or [32])[0]
    komp = (T.get(259) or [1])[0]
    fmt = (T.get(339) or [1])[0]
    praed = (T.get(317) or [1])[0]
    spp = (T.get(277) or [1])[0]
    nodata = _zahl(T.get(42113)) if isinstance(T.get(42113), str) else None
    if 322 in T:   # Kacheln
        kw, kh, offs, laengen = T[322][0], T[323][0], T[324], T[325]
    else:          # Streifen
        kw, kh = breite, (T.get(278) or [hoehe_])[0]
        offs, laengen = T[273], T[279]
    bps = bits // 8
    code = {(3, 4): "f", (3, 8): "d", (1, 1): "B", (1, 2): "H", (1, 4): "I", (2, 1): "b", (2, 2): "h", (2, 4): "i"}.get((fmt, bps))
    if not code:
        raise Fehler(f"Höhendienst: Rasterformat nicht unterstützt (SampleFormat {fmt}, {bits} bit)")
    bild = [[None] * breite for _ in range(hoehe_)]
    proZeile = -(-breite // kw)
    for i, (o, l) in enumerate(zip(offs, laengen)):
        daten = _entpacken(raw[o:o + l], komp)
        zeilen = kh if 322 in T else min(kh, hoehe_ - i * kh)
        daten = _praediktor(daten, praed, kw, zeilen, bps * spp, bps, bo)
        werte = struct.unpack(bo + code * (len(daten) // bps), daten[:len(daten) // bps * bps])
        x0, y0 = ((i % proZeile) * kw, (i // proZeile) * kh) if 322 in T else (0, i * kh)
        for yy in range(zeilen):
            for xx in range(kw):
                k = (yy * kw + xx) * spp
                if y0 + yy < hoehe_ and x0 + xx < breite and k < len(werte):
                    v = werte[k]
                    bild[y0 + yy][x0 + xx] = None if (nodata is not None and v == nodata) or v != v else v
    return [v for row in bild for v in row]


def _entpacken(b, komp):
    if komp == 1:
        return b
    if komp in (8, 32946):
        return zlib.decompress(b)
    if komp == 5:
        return _lzw(b)
    raise Fehler(f"Höhendienst: TIFF-Kompression {komp} nicht unterstützt")


def _lzw(b):
    """TIFF-LZW (MSB zuerst, Codes 9–12 Bit, „early change“)."""
    tab = [bytes([i]) for i in range(256)] + [b"", b""]
    out, bits, nbits, w, pos = bytearray(), 0, 0, b"", 0
    breite = 9
    alt = None
    for byte in b:
        bits = (bits << 8) | byte
        nbits += 8
        while nbits >= breite:
            nbits -= breite
            code = (bits >> nbits) & ((1 << breite) - 1)
            if code == 256:
                tab = tab[:258]
                breite, alt = 9, None
                continue
            if code == 257:
                return bytes(out)
            if alt is None:
                eintrag = tab[code]
            elif code < len(tab):
                eintrag = tab[code]
                tab.append(tab[alt] + eintrag[:1])
            else:
                eintrag = tab[alt] + tab[alt][:1]
                tab.append(eintrag)
            out += eintrag
            alt = code
            if len(tab) + 1 >= (1 << breite) and breite < 12:
                breite += 1
    return bytes(out)


def _praediktor(d, praed, breite, zeilen, pixbytes, bps, bo):
    if praed == 1:
        return d
    d = bytearray(d)
    zeile = breite * pixbytes
    if praed == 2:   # horizontale Differenzen je Abtastwert (Ganzzahlen)
        code = {1: "B", 2: "H", 4: "I"}[bps]
        for y in range(zeilen):
            v = list(struct.unpack(bo + code * (zeile // bps), d[y * zeile:(y + 1) * zeile]))
            st = pixbytes // bps
            for i in range(st, len(v)):
                v[i] = (v[i] + v[i - st]) & ((1 << (8 * bps)) - 1)
            d[y * zeile:(y + 1) * zeile] = struct.pack(bo + code * len(v), *v)
        return bytes(d)
    if praed == 3:   # Gleitkomma-Prädiktor: Byte-Differenzen, Bytes nach Wertigkeit gruppiert
        out = bytearray(len(d))
        for y in range(zeilen):
            r = d[y * zeile:(y + 1) * zeile]
            for i in range(1, len(r)):
                r[i] = (r[i] + r[i - 1]) & 0xFF
            for x in range(breite * (pixbytes // bps)):
                for k in range(bps):   # Byte k der Wertigkeit (höchstwertiges zuerst)
                    ziel = x * bps + (bps - 1 - k if bo == "<" else k)
                    out[y * zeile + ziel] = r[k * breite * (pixbytes // bps) + x]
        return bytes(out)
    return bytes(d)


# ---------------------------------------------------------------- Zusammen
def ermitteln(lat=None, lon=None, strasse="", plz="", ort=""):
    """Grundstücksangaben zur Baustelle. Gibt {punkt, flurstuecke, hoehe, werte, hinweise} zurück."""
    hinweise = []
    if lat is None or lon is None:
        p = adresse_suchen(strasse, plz, ort)
        if not p:
            raise Fehler("Die Adresse der Baustelle wurde nicht gefunden – bitte Straße, PLZ und Ort im Projekt prüfen.")
        lat, lon = p
        hinweise.append("Lage aus der Adresse (OpenStreetMap) bestimmt.")
    if not (50.2 <= lat <= 52.6 and 5.8 <= lon <= 9.5):
        raise Fehler("Die Baustelle liegt nicht in Nordrhein-Westfalen – die Abfrage nutzt die Dienste von Geobasis NRW.")
    e, n = utm32(lat, lon)
    liste = flurstuecke(e, n)
    fs = auswahl(liste, strasse)
    h, hq = None, ""
    try:
        h, hq = hoehe(e, n), "DGM1 NRW (Geobasis NRW), Höhe über NHN (DHHN2016)"
    except Fehler as ex:
        hinweise.append(str(ex))
    werte = {}
    if fs:
        gem = fs[0]["gemarkung"]
        gleich = [f for f in fs if f["gemarkung"] == gem]
        fluren = list(dict.fromkeys(f["flur"] for f in gleich))
        werte["gemarkung"] = gem
        werte["flur"] = ", ".join(fluren)
        werte["flurstueck"] = ", ".join(f["flurstueck"] for f in gleich) if len(fluren) == 1 else \
            "; ".join(f"Flur {fl}: " + ", ".join(f["flurstueck"] for f in gleich if f["flur"] == fl) for fl in fluren)
    if h is not None:
        werte["hoehe_nhn"] = f"{h:.2f}".replace(".", ",")
    return {"punkt": {"lat": round(lat, 6), "lon": round(lon, 6), "e": round(e, 2), "n": round(n, 2)}, "flurstuecke": fs,
            "umgebung": len(liste), "hoehe": h, "hoehe_quelle": hq, "werte": werte, "hinweise": hinweise,
            "quelle": "ALKIS (WFS NW ALKIS Vereinfacht), Geobasis NRW – dl-de/zero-2-0"}
