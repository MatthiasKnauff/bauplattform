"""Kürzel aus dem Plan (GO 18.11.2026, Mock „Wand-Kürzel aus dem Plan“: A1 B1 C1 D1, alle Bauteile, F1).

Der Zeichner schreibt an ein Bauteil, wie es aufgebaut ist – im Namen oder im Material einer beliebigen Schicht (stehen Texte in
mehreren Schichten, werden sie in Schichtreihenfolge zusammengelesen). Von „AW1“ bis „AW pp putz anstrich gipsputz fliese anstrich“:
gleiche Bauteile, gleicher Name; was das Portal daraus erkennt, ist ein Vorschlag (C1: „bitte bestätigen“).

zerlegen(text, art)  → {lage, kern, dicke, nummer, aussen: [...], innen: [...], beide: [...], unbekannt: [...], korrigiert: {...}, frage}
                        Reihenfolge: Lage · Kern · außen · innen – was es nur innen gibt (Gipsputz, Fliese, Tapete), beginnt „innen“.
                        Tippfehler bis 1 Buchstabe (ab 4 Buchstaben) bzw. 2 (ab 7) gegen die bekannten Wörter.
stufe(z)             → "offen" (nur Lage oder nichts) · "teils" (Kern erkannt) · "bestaetigen" (Kern und Schichten)
vorschlag(c, z, kg, dicke) → (Vorlage, Wahl) aus dem Bauteil-Baukasten (Katalogabgleich wie bei den Anweisungen) – nie erfunden.
gelernt / lernen     → was das Büro bei gleichem Kürzel schon bestätigt hat (D1: nur als Vorschlag, „3× im Büro“).
Die Art des Bauteils (Wand, Decke, Dach …) kommt aus dem IFC, nicht aus dem Kürzel; die Lage (AW, IW …) ist freiwillig.
"""
import json
import re

# Lage (freiwillig): Kürzel → (Bezeichnung, außen?, Suchwort im Baukasten)
LAGE = {"aw": ("Außenwand", True, ""), "kw": ("Kelleraußenwand", True, "kellerwand"), "iw": ("Innenwand", False, ""),
        "tw": ("Trennwand", False, ""), "wtw": ("Wohnungstrennwand", False, "wohnungstrennwand"),
        "trw": ("Treppenhauswand", False, "wohnungstrennwand"), "gw": ("Gebäudetrennwand", False, "wohnungstrennwand"),
        "brandwand": ("Brandwand", None, ""), "bw": ("Brandwand oder Bestandswand?", None, ""),
        "de": ("Decke", None, ""), "fd": ("Flachdach", None, ""), "sd": ("Steildach", None, ""), "bp": ("Bodenplatte", None, ""),
        "fu": ("Fundament", None, ""), "tr": ("Treppe", None, "")}
# Kern: Kürzel/Wort → (Bezeichnung, massiv/tragfähig?, Suchwort im Baukasten)
KERN = {"ks": ("Kalksandstein", True, "ks"), "kalksandstein": ("Kalksandstein", True, "ks"),
        "pp": ("Porenbeton", True, "pp"), "pb": ("Porenbeton", True, "pp"), "porenbeton": ("Porenbeton", True, "pp"), "ytong": ("Porenbeton", True, "pp"),
        "gasbeton": ("Porenbeton", True, "pp"),
        "hlz": ("Hochlochziegel", True, "hlz"), "plz": ("Planziegel", True, "hlz"), "ziegel": ("Ziegel", True, "hlz"), "poroton": ("Ziegel", True, "hlz"),
        "ssz": ("Schallschutzziegel", True, "ssz"),
        "stb": ("Stahlbeton", True, "stahlbeton"), "beton": ("Stahlbeton", True, "stahlbeton"), "stahlbeton": ("Stahlbeton", True, "stahlbeton"),
        "gk": ("Gipskarton (Metallständer)", False, "metallständer"), "ms": ("Metallständer", False, "metallständer"),
        "tb": ("Trockenbau", False, "metallständer"), "trockenbau": ("Trockenbau", False, "metallständer"),
        "lb": ("Leichtbeton", True, "hbl"), "bims": ("Leichtbeton (Bims)", True, "hbl"), "hbl": ("Leichtbeton", True, "hbl"),
        "holz": ("Holz", True, "holz"), "hrb": ("Holzrahmenbau", True, "holzrahmenbau"), "bsp": ("Brettsperrholz", True, "brettsperrholz"),
        "mauerwerk": ("Mauerwerk (Stein offen)", True, "mauerwerk"), "mw": ("Mauerwerk (Stein offen)", True, "mauerwerk")}   # Allplan-Standard „Mauerwerk“
# Nur Hinweis, kein Aufbau (Allplan schreibt sie oft mit ans Material: „Mauerwerk tragend“) – nie „nicht erkannt“
INFO = {"tragend": "tragend", "nichttragend": "nicht tragend", "aussteifend": "aussteifend", "nicht": "", "statisch": ""}
# Schichten: Wort → (Bezeichnung, Seite: aussen | innen | beide, Suchwort)
SCHICHT = {"putz": ("Putz", "beide", "putz"), "aussenputz": ("Außenputz", "aussen", "außenputz"), "leichtputz": ("Leichtputz", "aussen", "leichtputz"),
           "kalkzementputz": ("Kalkzementputz", "beide", "kalkzement"), "gipsputz": ("Gipsputz", "innen", "gipsputz"), "innenputz": ("Innenputz", "innen", "innenputz"),
           "kalkputz": ("Kalkputz", "beide", "kalkputz"), "anstrich": ("Anstrich", "beide", "anstrich"), "farbe": ("Anstrich", "beide", "anstrich"),
           "silikat": ("Silikatanstrich", "beide", "silikat"), "tapete": ("Tapete", "innen", "tapete"), "raufaser": ("Raufaser", "innen", "raufaser"),
           "fliese": ("Fliesen", "innen", "fliesen"), "fliesen": ("Fliesen", "innen", "fliesen"), "wdvs": ("WDVS", "aussen", "wdvs"),
           "vhf": ("Vorgehängte Fassade", "aussen", "vhf"), "klinker": ("Klinker", "aussen", "klinker"), "riemchen": ("Klinkerriemchen", "aussen", "riemchen"),
           "kerndaemmung": ("Kerndämmung", "aussen", "kerndämmung"), "daemmung": ("Dämmung", "aussen", "dämmung"), "eps": ("EPS", "aussen", "eps"),
           "mineralwolle": ("Mineralwolle", "aussen", "mineralwolle"), "perimeter": ("Perimeterdämmung", "aussen", "perimeter"),
           "abdichtung": ("Abdichtung", "aussen", "abdichtung"), "vorsatzschale": ("Vorsatzschale", "innen", "vorsatzschale"),
           "estrich": ("Estrich", "innen", "estrich"), "parkett": ("Parkett", "innen", "parkett"), "laminat": ("Laminat", "innen", "laminat"),
           "teppich": ("Teppich", "innen", "teppich"), "vinyl": ("Vinyl", "innen", "vinyl"), "linoleum": ("Linoleum", "innen", "linoleum"),
           "trittschall": ("Trittschalldämmung", "innen", "trittschall"), "fbh": ("Fußbodenheizung", "innen", ""),
           "fussbodenheizung": ("Fußbodenheizung", "innen", ""), "bitumen": ("Bitumenabdichtung", "aussen", "bitumen"), "kies": ("Kiesschüttung", "aussen", "kies"),
           "begruenung": ("Begrünung", "aussen", "begrünung"), "ziegeldeckung": ("Dachziegel", "aussen", "dachziegel"), "dachziegel": ("Dachziegel", "aussen", "dachziegel"),
           "zwischensparren": ("Zwischensparrendämmung", "innen", "zwischensparren"), "sparren": ("Sparren", "beide", "sparren"),
           "holzleiste": ("Holzleiste", "innen", "holz"), "sockelleiste": ("Sockelleiste", "innen", "sockelleiste"), "naturstein": ("Naturstein", "beide", "naturstein")}
NUR_INNEN = {k for k, v in SCHICHT.items() if v[1] == "innen"}
WAERME = {"fbh", "fussbodenheizung"}   # gehört zur Heizung (KG 423), nicht zum Belag – Hinweis


def _fold(t):
    t = str(t or "").lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(a, b)
    return t


def normal(text):
    """Schreibweise vereinheitlichen: „AW-KS“, „aw ks“, „Aw  Ks“ → „aw ks“ (Groß/klein, Leerzeichen, Bindestriche egal).
    Erklärungen in Klammern zählen nicht – „AW (Außenwand)“ aus dem Allplan-Katalog ist „aw“."""
    t = str(text or "")
    while re.search(r"\([^()]*\)", t):   # auch verschachtelt
        t = re.sub(r"\([^()]*\)", " ", t)
    t = re.sub(r"nicht[\s_\-]+tragend", "nichttragend", _fold(t))
    t = re.sub(r"(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])", " ", t)   # „aw1“ → „aw 1“
    return " ".join(re.findall(r"[a-z]+|\d+(?:[.,]\d+)?", t))


def _abstand(a, b, grenze):
    if abs(len(a) - len(b)) > grenze:
        return grenze + 1
    v = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        n = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            n[j] = min(v[j] + 1, n[j - 1] + 1, v[j - 1] + (ca != cb), (v[j - 2] + 1) if i > 1 and j > 1 and ca == b[j - 2] and a[i - 2] == cb else 99)
        v = n
    return v[-1]


def _wort(w):
    """Bekanntes Wort finden: genau, Plural/Stamm, sonst Tippfehler. → (Tabelle, Schlüssel, korrigiert?)"""
    for T, name in ((LAGE, "lage"), (KERN, "kern"), (SCHICHT, "schicht")):
        if w in T:
            return name, w, False
    for T, name in ((SCHICHT, "schicht"), (KERN, "kern")):
        for k in T:
            if len(w) >= 5 and (w.startswith(k) and len(w) - len(k) <= 2 or k.startswith(w) and len(k) - len(w) <= 1):
                return name, k, False
    if len(w) < 4:
        return None, w, False
    grenze = 2 if len(w) >= 7 else 1
    best = None
    for T, name in ((SCHICHT, "schicht"), (KERN, "kern")):
        for k in T:
            if len(k) < 4:
                continue
            d = _abstand(w, k, grenze)
            if d <= grenze and (best is None or d < best[0]):
                best = (d, name, k)
    return (best[1], best[2], True) if best else (None, w, False)


def zerlegen(text, art="Wand", aussen=None):
    """Text eines Bauteils lesen. art: aus dem IFC (Wand, Decke, Dach, Bodenplatte …); aussen: Lage aus dem IFC/der Geometrie (Kürzel AW/IW geht vor).
    Wand außen: was vor dem Kern steht, ist außen – dann ist alles danach innen; sonst nach dem Kern außen bis zum ersten Wort, das es nur innen gibt.
    Innenwand: beidseitig. Decke, Boden, Bekleidung: eine Seite."""
    n = normal(text)
    z = {"text": str(text or "").strip()[:200], "norm": n, "lage": "", "lage_name": "", "aussen": aussen, "kern": "", "kern_name": "", "massiv": None,
         "dicke": None, "nummer": "", "aussen_s": [], "innen_s": [], "beide_s": [], "unbekannt": [], "korrigiert": {}, "frage": "", "suchwort": "", "waerme": False,
         "folge": []}
    vor_kern, seite = [], "aussen"
    for k, w in enumerate(n.split()):
        if re.fullmatch(r"\d+(?:[.,]\d+)?", w):
            x = float(w.replace(",", "."))
            if z["kern"] and z["dicke"] is None and 5 <= x <= 60 and not (z["aussen_s"] or z["innen_s"] or z["beide_s"]) and not vor_kern:
                z["dicke"] = x
            elif not z["kern"] and not z["nummer"] and x < 20 and float(x).is_integer():
                z["nummer"] = str(int(x))
                z["folge"].append((w, "Nummer", "nur zur Unterscheidung"))
            continue
        if w in INFO:
            if INFO[w]:
                z["folge"].append((w, INFO[w], "nur Hinweis"))
            continue
        tab, key, korr = ("lage", w, False) if (k == 0 and w in LAGE) or (w == "brandwand" and not z["lage"]) else _wort(w)
        if korr:
            z["korrigiert"][w] = key
        if tab == "lage" and not z["lage"]:
            L = LAGE[key]
            z.update(lage=key, lage_name=L[0], suchwort=L[2], aussen=L[1] if L[1] is not None else z["aussen"])
            if key == "bw":
                z["frage"] = "BW = Brandwand oder Bestandswand?"
            z["folge"].append((w.upper() if len(w) <= 3 else w, L[0], "Lage"))
        elif tab == "kern" and not z["kern"] and art in ("Wand", "Decke", "Dach", "Bodenplatte", "Stütze", "Fundament", "Treppe", "Treppenlauf"):
            z.update(kern=key, kern_name=KERN[key][0], massiv=KERN[key][1])
            z["folge"].append((w, KERN[key][0], "Kern"))
            if vor_kern:   # außen stand vorn – alles danach ist innen
                seite = "innen"
        elif tab in ("schicht", "kern"):
            sz = SCHICHT.get(key) or (KERN[key][0], "beide", KERN[key][2])
            if key in WAERME:
                z["waerme"] = True
            if art != "Wand" or z["aussen"] is False:
                ziel = "innen_s" if art != "Wand" else "beide_s"
            else:
                if key in NUR_INNEN:
                    seite = "innen"
                if sz[1] == "aussen" and seite == "aussen":
                    ziel = "aussen_s"
                elif not z["kern"]:
                    ziel = "aussen_s" if sz[1] != "innen" else "innen_s"
                    vor_kern.append(key)
                else:
                    ziel = "innen_s" if seite == "innen" or sz[1] == "innen" else "aussen_s"
            z[ziel].append(key)
            wo = {"aussen_s": "außen", "innen_s": "innen" if art == "Wand" else "", "beide_s": "beidseitig"}[ziel]
            z["folge"].append((w, sz[0] + (" → Heizung KG 423" if key in WAERME else ""), " · ".join(x for x in (wo, f"„{w}“ als {sz[0]}?" if korr else "") if x)))
        else:
            z["unbekannt"].append(w)
            z["folge"].append((w, "nicht erkannt", "bitte prüfen"))
    if z["kern"] and z["dicke"]:
        z["folge"] = [(a, b + (f" {z['dicke']:g} cm".replace(".", ",") if c == "Kern" else ""), c) for a, b, c in z["folge"]]
    else:
        z["folge"] = [(a, b, c + " · Dicke aus dem Plan" if c == "Kern" else c) for a, b, c in z["folge"]]
    return z


def lesbar(z):
    """[(Wort im Plan, gelesen als, wo)] für die Anzeige „So verstanden“ – in der Reihenfolge des Plans."""
    return [list(x) for x in z["folge"]]


def stufe(z):
    if z["kern"] and (z["aussen_s"] or z["innen_s"] or z["beide_s"]):
        return "bestaetigen"
    if z["kern"] or z["aussen_s"] or z["innen_s"] or z["beide_s"]:
        return "teils"
    return "offen"


def _such(k):   # Suchwort im Baukasten – Schicht oder Baustoff als Schicht (z. B. „holz“ an einer Leiste)
    return SCHICHT[k][2] if k in SCHICHT else KERN[k][2] if k in KERN else ""


def _zahlen(t):
    return [float(x.replace(",", ".")) for x in re.findall(r"\d+(?:,\d+)?", str(t or ""))]


def vorschlag(c, z, kg, dicke_m=0.0, innen_mit=False):
    """(Vorlage, Wahl) aus dem Baukasten – über den Katalogabgleich der Anweisungen (anweisung.katalog); Dicke des Kerns aus dem Plan
    (bzw. dem Kürzel) auf die nächstliegende Option. innen_mit: Innenseite mitnehmen (ohne Räume, B1). Nichts Passendes → (None, None)."""
    from . import anweisung, bauteilliste
    w = [z["suchwort"]] if z["suchwort"] else []
    if z["kern"]:
        w.append(KERN[z["kern"]][2])
    w += [x for x in (_such(k) for k in z["aussen_s"] + z["beide_s"] + (z["innen_s"] if innen_mit else [])) if x]
    if not w:
        return None, None, ""
    T = anweisung.katalog(c, " ".join(w), [kg])
    if not T:
        return None, None, ""
    best = T[0]
    V = bauteilliste._vorlage(c, best["vorlage"])
    if not V:
        return None, None, ""
    hinweis = ""
    wahl = bauteilliste._std(V)
    for si, oi in (best.get("setze") or {}).items():
        if int(si) < len(wahl):
            wahl[int(si)] = oi
    d = z["dicke"] or round((dicke_m or 0) * 100, 1)
    if d and z["kern"]:   # Kern-Schicht: Option mit dem Kern-Wort und der nächsten Dicke
        such = KERN[z["kern"]][2]
        for si, s in enumerate(V["schichten"]):
            K = [(oi, _zahlen(o.get("k"))) for oi, o in enumerate(s.get("optionen") or []) if such and such in _fold(f"{o.get('k', '')} {o.get('t', '')}")]
            K = [(oi, [x for x in zz if 5 <= x <= 60]) for oi, zz in K]
            K = [(oi, zz[-1]) for oi, zz in K if zz]
            if K:
                oi, dd = min(K, key=lambda x: abs(x[1] - d))
                wahl[si] = oi
                if abs(dd - d) > 1:   # Dickenprobe: Plan und Baustein passen nicht – nachfragen, nicht still rechnen
                    z_ = lambda v: f"{v:g}".replace(".", ",")   # noqa: E731
                    hinweis = f"Plan {z_(d)} cm – im Baustein gibt es {', '.join(z_(x) for x in sorted({x for _, x in K}))} cm; genommen {z_(dd)} cm, bitte prüfen."
                break
    if not innen_mit:   # Räume da: Innenseite kommt aus dem Raumbuch (B1) – in der Wand „ohne Innenbekleidung (gesondert erfasst)“, sonst doppelt
        for si, sch in enumerate(V["schichten"]):
            if re.search(r"innen|bekleid", _fold(sch.get("name"))):
                oi = next((k for k, o in enumerate(sch.get("optionen") or []) if "gesondert" in _fold(o.get("t"))), None)
                if oi is not None:
                    wahl[si] = oi
    return V["id"], wahl, hinweis


# ------------------------------------------------------------------ Gelerntes (D1)
def gelernt(c, norm):
    try:
        r = c.execute("SELECT data FROM bp_store WHERE key='kuerzel:gelernt'").fetchone()
    except Exception:   # noqa: BLE001 – ohne Speicher (Werkzeuge, Tests) nichts Gelerntes
        return None
    try:
        G = json.loads(r["data"]) if r and r["data"] else {}
    except ValueError:
        G = {}
    E = G.get(norm) or {}
    if not E:
        return None
    k, n = max(E.items(), key=lambda x: x[1])
    vid, _, wahl = k.partition(":")
    return {"vorlage": vid, "wahl": [int(x) for x in wahl.split(".") if x.isdigit()], "n": n}


def lernen(c, norm, vid, wahl, wer=""):
    if not norm or not vid:
        return
    from . import konto
    r = c.execute("SELECT data FROM bp_store WHERE key='kuerzel:gelernt'").fetchone()
    try:
        G = json.loads(r["data"]) if r and r["data"] else {}
    except ValueError:
        G = {}
    k = f"{vid}:{'.'.join(str(int(x)) for x in wahl or [])}"
    E = G.setdefault(norm[:80], {})
    E[k] = E.get(k, 0) + 1
    if len(G) > 3000:   # alte Einträge mit wenig Zählern zuerst weg
        for x in sorted(G, key=lambda x: sum(G[x].values()))[:500]:
            G.pop(x, None)
    konto._put(c, "kuerzel:gelernt", json.dumps(G, ensure_ascii=False), wer)


def liste():
    """Für die Zeichner: Kürzel, die das Portal sicher kennt."""
    return {"lage": [(k.upper(), v[0]) for k, v in LAGE.items() if k not in ("brandwand",)],
            "kern": sorted({(k.upper() if len(k) <= 3 else k, v[0]) for k, v in KERN.items()}),
            "schichten": sorted({v[0] for v in SCHICHT.values()})}
