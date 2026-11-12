"""Geodienste: Open-Meteo (Wetter) und OpenStreetMap/Nominatim (Adresse <-> Koordinaten)."""
import json, math, re, threading, time, urllib.parse, urllib.request

UA = "Bautagebuch-App/1.0 (self-hosted)"
PAUSE = 1.1   # Sekunden zwischen zwei Nominatim-Anfragen (Nutzungsrichtlinie: max. 1 Anfrage/s)
NOMINATIM = "https://nominatim.openstreetmap.org"


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "de"})
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.load(r)


def haversine(lat1, lon1, lat2, lon2):
    """Entfernung in Metern."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 6371000 * 2 * math.asin(math.sqrt(a))


def clean_name(q):
    """Projektname -> Suchtext: führendes Kürzel (z. B. 'A481 ') und Klammerzusätze entfernen."""
    q = re.sub(r"\(.*$", "", q or "")
    q = re.sub(r"^\s*[A-Za-z]{0,2}\d+(?:\.\d+)*\s+", "", q)
    return " ".join(q.split()).strip(" ,")


def parts(a):
    town = a.get("city") or a.get("town") or a.get("village") or a.get("municipality") or ""
    street = " ".join(x for x in (a.get("road"), a.get("house_number")) if x)
    return {"street": street, "zip": a.get("postcode", ""), "city": town}


def name_variants(name):
    """Projektname -> Suchtexte, vom genauesten zum gröbsten. Beschreibende Wörter vor der Straße
    (z. B. 'Tierheim' in 'A481 Tierheim Grillostr. 24, Essen') werden schrittweise weggelassen."""
    q = clean_name(name)
    if not q:
        return []
    first, sep, rest = q.partition(",")
    words, out = first.split(), []
    for k in range(min(3, max(1, len(words) - 1))):
        part = " ".join(words[k:])
        if k and not re.search(r"\d|str|weg\b|platz|allee|ring\b|damm|ufer|gasse|hof\b|feld|berg\b|markt|chaussee|pfad|steig|kamp\b|brink|tal\b", part, re.I):
            break
        out.append((part + sep + rest).strip(" ,"))
    return out


def _norm(t):
    t = (t or "").lower().replace("ß", "ss").replace("strasse", "str").replace("straße", "str")
    return re.sub(r"[^a-z0-9äöüé]", "", t)


def plausible(res, query):
    """Passt der Treffer zum Suchtext? Straße (erste 5 Buchstaben) und Stadt (erste 4) müssen im Text vorkommen."""
    qn = _norm(query)
    road = re.sub(r"\s+\d[\w/-]*$", "", res.get("street", ""))
    if road and _norm(road)[:5] not in qn:
        return False
    return not res.get("city") or _norm(res["city"])[:4] in qn


def _lookup(q):
    hits = fetch_json(NOMINATIM + "/search?" + urllib.parse.urlencode(
        {"q": q, "format": "jsonv2", "addressdetails": 1, "limit": 1}))
    if not hits:
        return None
    h = hits[0]
    a = h.get("address", {})
    return {"lat": float(h["lat"]), "lon": float(h["lon"]), **parts(a)}, bool(a.get("house_number"))


def search(q, from_name=False, strict=False):
    """Adresse oder Projektname -> {lat, lon, street, zip, city} oder None.
    Fehlt im Treffer die PLZ, wird sie über die Koordinaten nachgeschlagen.
    strict=True: Netzwerkfehler werden nicht verschluckt (None bedeutet dann wirklich 'nichts gefunden')."""
    variants = name_variants(q) if from_name else [" ".join((q or "").split())]
    best = None
    try:
        for n, v in enumerate(v for v in variants if v):
            if n:
                time.sleep(PAUSE)
            got = _lookup(v)
            if not got:
                continue
            res, exact = got
            if from_name and not plausible(res, v):
                continue       # Treffer gehört offenbar zu einem anderen Ort/einer anderen Straße
            if exact:          # Treffer mit Hausnummer: sofort nehmen
                best = res
                break
            best = best or res
        if best and not best["zip"]:
            time.sleep(PAUSE)
            r = reverse(best["lat"], best["lon"])
            best["zip"] = r["zip"]
            best["city"] = best["city"] or r["city"]
    except Exception:
        if strict:
            raise
    return best


def reverse(lat, lon):
    """Koordinaten -> {street, zip, city}. Wirft bei Netzfehlern."""
    g = fetch_json(NOMINATIM + "/reverse?" + urllib.parse.urlencode(
        {"lat": lat, "lon": lon, "format": "jsonv2", "zoom": 18, "addressdetails": 1}))
    return parts(g.get("address", {}))


# ---------- Vorschläge beim Tippen (Firmen und Adressen) über Photon ----------
# Photon (photon.komoot.io, OpenStreetMap-Daten) ist für die Suche beim Tippen gedacht; Nominatim verbietet das in seiner
# Nutzungsrichtlinie. Nominatim wird nur einmal pro angetipptem Vorschlag befragt (Telefon/E-Mail/Internet) – siehe company_detail().
PHOTON = "https://photon.komoot.io/api/"
_TRADES = {"electrician": "Elektro", "plumber": "Sanitär", "hvac": "Heizung/Lüftung", "heating_engineer": "Heizung", "carpenter": "Zimmerer",
           "roofer": "Dach", "painter": "Maler", "tiler": "Fliesen", "joiner": "Tischler", "builder": "Bau", "bricklayer": "Maurer",
           "plasterer": "Putz/Trockenbau", "glaziery": "Glaser", "scaffolder": "Gerüstbau", "metal_construction": "Metallbau", "stonemason": "Naturstein",
           "floorer": "Boden", "insulation": "Dämmung", "window_construction": "Fenster", "architect": "Architekt:in", "engineer": "Ingenieur:in",
           "surveyor": "Vermessung", "estate_agent": "Immobilien", "construction": "Bau"}
_SKIP = {"highway", "boundary", "place", "natural", "waterway", "railway", "landuse", "route"}
_cache, _lock, _last = {}, threading.Lock(), [0.0]
PHOTON_PAUSE = 0.3


def _tag(t, *keys):
    for k in keys:
        if t.get(k):
            return str(t[k]).split(";")[0].strip()
    return ""


def _photon(q, near, limit=12):
    prm = {"q": q, "limit": limit, "lang": "de"}
    if near:
        prm["lat"], prm["lon"] = near
    with _lock:
        wait = PHOTON_PAUSE - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()
        data = fetch_json(PHOTON + "?" + urllib.parse.urlencode(prm))
    out = []
    for f in data.get("features", []):
        p, co = f.get("properties", {}), (f.get("geometry") or {}).get("coordinates") or [None, None]
        out.append({**p, "lon": co[0], "lat": co[1]})
    return out


def _km(near, h):
    try:
        return round(haversine(near[0], near[1], float(h["lat"]), float(h["lon"])) / 1000, 1) if near else None
    except (KeyError, TypeError, ValueError):
        return None


def _cached(key, build):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < 3600:
        return hit[1]
    try:
        val = build()
    except Exception:
        return []          # kein Netz: nichts vorschlagen, nicht zwischenspeichern
    if len(_cache) > 400:
        _cache.clear()
    _cache[key] = (time.time(), val)
    return val


def _sort(out, near):
    if near:   # nächste zuerst; ohne Position ans Ende
        out.sort(key=lambda x: (x["km"] is None, x["km"] or 0))
    return out[:6]


def companies(q, near=None):
    """Firmenvorschläge beim Tippen: [{name, trade, street, zip, city, km, osm_type, osm_id}]. Zwischenspeicher 1 Stunde."""
    q = " ".join((q or "").split())
    if len(q) < 3:
        return []
    def build():
        out, seen = [], set()
        for h in _photon(q, near):
            if h.get("osm_key") in _SKIP or not h.get("name"):
                continue
            street = " ".join(x for x in (h.get("street"), h.get("housenumber")) if x)
            k = (h["name"].lower(), street.lower(), (h.get("city") or "").lower())
            if k in seen:
                continue
            seen.add(k)
            out.append({"name": h["name"], "trade": _TRADES.get(h.get("osm_value"), ""), "street": street, "zip": h.get("postcode", ""),
                        "city": h.get("city") or h.get("town") or h.get("locality") or "", "km": _km(near, h), "phone": "", "email": "", "website": "",
                        "osm_type": h.get("osm_type", ""), "osm_id": h.get("osm_id")})
        return _sort(out, near)
    return _cached(("co", q.lower(), round(near[0], 1) if near else None, round(near[1], 1) if near else None), build)


def addresses(q, near=None):
    """Adressvorschläge beim Tippen (wie bei DHL): [{street, zip, city, km, label}] aus Straße + Hausnummer + PLZ + Ort."""
    q = " ".join((q or "").split())
    if len(q) < 3:
        return []
    def build():
        out, seen = [], set()
        for h in _photon(q, near):
            street = h.get("street") or (h.get("name") if h.get("osm_key") == "highway" else "")
            city = h.get("city") or h.get("town") or h.get("locality") or h.get("district") or ""
            if not street or not city:
                continue
            street = " ".join(x for x in (street, h.get("housenumber")) if x)
            k = (street.lower(), h.get("postcode", ""), city.lower())
            if k in seen:
                continue
            seen.add(k)
            out.append({"street": street, "zip": h.get("postcode", ""), "city": city, "km": _km(near, h),
                        "label": f"{street}, {(h.get('postcode', '') + ' ' + city).strip()}"})
        return _sort(out, near)
    return _cached(("ad", q.lower(), round(near[0], 1) if near else None, round(near[1], 1) if near else None), build)


def company_detail(osm_type, osm_id):
    """Telefon, E-Mail, Internet eines angetippten Vorschlags (eine einzelne Nominatim-Abfrage) oder {}."""
    t = {"N": "N", "W": "W", "R": "R"}.get(str(osm_type).upper()[:1])
    if not t or not str(osm_id).isdigit():
        return {}
    try:
        with _lock:
            wait = PAUSE - (time.time() - _last[0])
            if wait > 0:
                time.sleep(wait)
            _last[0] = time.time()
            hits = fetch_json(NOMINATIM + "/lookup?" + urllib.parse.urlencode({"osm_ids": f"{t}{osm_id}", "format": "jsonv2", "extratags": 1, "addressdetails": 1}))
    except Exception:   # kein Netz: keine Angaben, nicht zwischenspeichern
        return {}
    if not hits:
        return {}
    et = hits[0].get("extratags") or {}
    return {"phone": _tag(et, "phone", "contact:phone"), "email": _tag(et, "email", "contact:email"), "website": _tag(et, "website", "contact:website")}


# ---------- Adressen ergänzen (PLZ <-> Ort, Straße -> PLZ/Ort) ----------
_acache = {}


def complete_address(street="", zip_="", city=""):
    """Fehlende PLZ/Ort aus dem Netz (Nominatim) ergänzen: {zip, city} (nur gefundene Teile) oder {}.
    PLZ allein → Ort; Straße + Ort → PLZ; Straße + PLZ → Ort. Zwischenspeicher, höchstens 1 Anfrage/s."""
    street, zip_, city = (" ".join((x or "").split()) for x in (street, zip_, city))
    key = (street.lower(), zip_, city.lower())
    if key in _acache:
        return _acache[key]
    out = {}
    try:
        with _lock:
            wait = PAUSE - (time.time() - _last[0])
            if wait > 0:
                time.sleep(wait)
            _last[0] = time.time()
            if zip_ and not city and not street:
                hits = fetch_json(NOMINATIM + "/search?" + urllib.parse.urlencode(
                    {"postalcode": zip_, "country": "de", "format": "jsonv2", "addressdetails": 1, "limit": 1}))
                if hits:
                    out["city"] = parts(hits[0].get("address", {}))["city"]
            else:
                q = ", ".join(x for x in (street, " ".join(y for y in (zip_, city) if y)) if x)
                res = search(q, strict=True)   # holt bei Bedarf die PLZ über die Koordinaten nach
                if res and (not street or plausible(res, q)):
                    if not zip_ and res.get("zip"):
                        out["zip"] = res["zip"]
                    if not city and res.get("city"):
                        out["city"] = res["city"]
    except Exception:
        return {}      # kein Netz: nicht zwischenspeichern
    if len(_acache) > 500:
        _acache.clear()
    _acache[key] = out
    return out
