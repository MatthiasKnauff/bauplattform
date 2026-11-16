"""Pläne ohne 3D-Modell lesen – DXF und PDF (GO 16.11.2026, Entwurf „Gebäudemodell als Mitte“, Punkt 4a).

Was geht – und was nicht (so steht es auch in der Oberfläche):
  DXF  Räume aus geschlossenen Umrissen samt Raumstempel (Text im Umriss: Nummer, Name), Fenster und Türen aus ihren Symbolen (Blöcke),
       Wandlängen aus den Linien je Ebene. Ebenen und Blöcke heißen in jedem Büro anders: beim ersten Einlesen ordnet man sie einmal per
       Klick zu (Räume · Außenwände · Innenwände · Fenster · Türen · nicht verwenden); die Zuordnung merkt sich das Büro (bp_store „gebaeudemodell:dxf“).
       DWG (geschlossenes Format) geht nicht – im CAD als DXF oder IFC speichern.
  PDF  aus CAD (keine Scans): nur die Raumstempel – Name, Nummer, Fläche. Keine Wände, Fenster oder Türen.

dxf_ebenen(raw)              → {ebenen: [{name, flaechen, linien, texte}], bloecke: [{name, n}], einheit}
dxf_lesen(raw, zuordnung)    → Rohdaten wie cadimport.ifc_lesen(…, bestand=True): {raeume, bauteile, geschosse, hinweise, info}
pdf_lesen(raw)               → dasselbe, nur mit Räumen
vorschlag(name, art)         → Rolle aus dem Namen raten (Ebene/Block)
"""
import math
import re

ROLLEN_EBENE = ("raum", "wand_aussen", "wand_innen", "ignorieren")
ROLLEN_BLOCK = ("fenster", "tuer", "ignorieren")
EINHEIT = {1: 0.0254, 2: 0.3048, 4: 0.001, 5: 0.01, 6: 1.0}   # $INSUNITS → Meter
WANDHOEHE = 2.75   # Wandflächen aus Wandlängen: angenommene Geschosshöhe (steht als Hinweis in der Zeile)


def vorschlag(name, art):
    n = (name or "").lower()
    if art == "block":
        if re.search(r"fenster|window|\bfe\b|^fe[_\-\s]|^f\d", n):
            return "fenster"
        if re.search(r"t(ü|ue)r|door|\btue?\b|^t\d|^tue?[_\-\s]", n):
            return "tuer"
        return "ignorieren"
    if re.search(r"raum|room|fl(ä|ae)che|space|\bnf\b|nrf", n):
        return "raum"
    if re.search(r"(au(ß|ss)en|ext).*(wand|wall|mauer)|(wand|wall|mauer).*(au(ß|ss)en|ext)|\baw\b", n):
        return "wand_aussen"
    if re.search(r"(innen|int).*(wand|wall)|(wand|wall).*(innen|int)|\biw\b|trockenbau", n):
        return "wand_innen"
    if re.search(r"wand|wall|mauer", n):
        return "wand_aussen"
    return "ignorieren"


# ------------------------------------------------------------------ DXF
def _text(raw):
    if raw[:22].startswith(b"AutoCAD Binary DXF"):
        raise ValueError("Binäres DXF kann das Gebäudemodell nicht lesen – bitte im CAD als DXF (ASCII) oder IFC speichern.")
    if raw[:6] in (b"AC1015", b"AC1018", b"AC1021", b"AC1024", b"AC1027", b"AC1032") or raw[:4] == b"AC10":
        raise ValueError("Das ist eine DWG-Datei (geschlossenes Format) – bitte im CAD als DXF oder IFC speichern.")
    try:
        t = raw.decode("utf-8")
    except UnicodeDecodeError:
        t = raw.decode("cp1252", "replace")
    return re.sub(r"\\U\+([0-9A-Fa-f]{4})", lambda m: chr(int(m.group(1), 16)), t)


def _paare(t):
    z = t.splitlines()
    if len(z) < 4 or z[0].strip() != "0" and "SECTION" not in t[:200]:
        raise ValueError("Das ist keine DXF-Datei.")
    for i in range(0, len(z) - 1, 2):
        try:
            yield int(z[i].strip()), z[i + 1].rstrip("\r")
        except ValueError:
            continue


def _mtext(s):
    s = re.sub(r"\\[PpNn]", " ", s)
    s = re.sub(r"\\[A-Za-z][^;\\{}]*;", "", s)
    s = re.sub(r"\\[A-Za-z]", "", s)
    return re.sub(r"\s+", " ", s.replace("{", "").replace("}", "")).strip()


def _entities(raw):
    """DXF → (Kopfwerte, Liste der Objekte im Modellbereich: {typ, ebene, pkt: [(x, y)], zu, text, block, x, y})."""
    kopf, objekte = {}, []
    abschnitt, var, cur = "", "", None
    poly = None   # alte POLYLINE mit VERTEX-Folgen

    def fertig():
        nonlocal cur
        if cur is not None:
            objekte.append(cur)
        cur = None
    erwarte_name = False
    for code, v in _paare(_text(raw)):
        if code == 0:
            fertig()
            w = v.strip()
            if w == "SECTION":
                erwarte_name = True
                continue
            if w == "ENDSEC":
                abschnitt = ""
                continue
            if abschnitt != "ENTITIES":
                continue
            if w == "VERTEX" and poly is not None:
                cur = {"typ": "_VERTEX"}
                continue
            if w == "SEQEND" and poly is not None:
                objekte.append(poly)
                poly = None
                continue
            cur = {"typ": w, "ebene": "0", "pkt": [], "zu": False, "text": "", "block": "", "x": None, "y": None, "x2": None, "y2": None, "_b": []}
            if w == "POLYLINE":
                poly, cur = cur, None
            continue
        if code == 2 and erwarte_name:
            abschnitt, erwarte_name = v.strip(), False
            continue
        if abschnitt == "HEADER":
            if code == 9:
                var = v.strip()
            elif var in ("$INSUNITS", "$ACADVER", "$DWGCODEPAGE"):
                kopf[var] = v.strip()
            continue
        if cur is None:
            if poly is not None and code == 8:
                poly["ebene"] = v.strip()
            elif poly is not None and code == 70:
                poly["zu"] = bool(int(v) & 1)
            continue
        if cur["typ"] == "_VERTEX":
            if code == 10:
                cur["x"] = float(v)
            elif code == 20 and cur.get("x") is not None and poly is not None:
                poly["pkt"].append((cur["x"], float(v)))
            continue
        try:
            if code == 8:
                cur["ebene"] = v.strip()
            elif code == 70 and cur["typ"] == "LWPOLYLINE":
                cur["zu"] = bool(int(v) & 1)
            elif code == 10:
                cur["x"] = float(v)
            elif code == 20:
                cur["y"] = float(v)
                if cur["typ"] == "LWPOLYLINE" and cur["x"] is not None:
                    cur["pkt"].append((cur["x"], cur["y"]))
            elif code == 11:
                cur["x2"] = float(v)
            elif code == 21:
                cur["y2"] = float(v)
            elif code in (1, 3) and cur["typ"] in ("TEXT", "MTEXT", "ATTRIB"):
                cur["_b"].append(v)
            elif code == 2 and cur["typ"] == "INSERT":
                cur["block"] = v.strip()
        except ValueError:
            continue
    fertig()
    for o in objekte:
        if o.get("_b"):
            o["text"] = _mtext("".join(o["_b"]))   # MTEXT: Teile (Code 3) in der Reihenfolge der Datei, zuletzt Code 1
    return kopf, [o for o in objekte if o.get("typ") not in (None, "_VERTEX")]


def _flaeche(P):
    return abs(sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P)))) / 2


def _umfang(P, zu=True):
    n = len(P) if zu else len(P) - 1
    return sum(math.dist(P[i], P[(i + 1) % len(P)]) for i in range(max(0, n)))


def _innen(x, y, P):
    r = False
    for i in range(len(P)):
        (x1, y1), (x2, y2) = P[i], P[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1:
            r = not r
    return r


def _zu(o):
    P = o["pkt"]
    return o["typ"] in ("LWPOLYLINE", "POLYLINE") and len(P) >= 3 and (o["zu"] or math.dist(P[0], P[-1]) < 1e-6)


def dxf_ebenen(raw):
    kopf, O = _entities(raw)
    E, Bl = {}, {}
    for o in O:
        e = E.setdefault(o["ebene"], {"name": o["ebene"], "flaechen": 0, "linien": 0, "texte": 0})
        if _zu(o):
            e["flaechen"] += 1
        elif o["typ"] in ("LINE", "LWPOLYLINE", "POLYLINE"):
            e["linien"] += 1
        elif o["typ"] in ("TEXT", "MTEXT", "ATTRIB"):
            e["texte"] += 1
        elif o["typ"] == "INSERT" and o["block"]:
            b = Bl.setdefault(o["block"], {"name": o["block"], "n": 0})
            b["n"] += 1
    return {"ebenen": sorted([e for e in E.values() if e["flaechen"] or e["linien"]], key=lambda e: e["name"].lower()),
            "bloecke": sorted([b for b in Bl.values() if not b["name"].startswith("*")], key=lambda b: b["name"].lower()), "einheit": kopf.get("$INSUNITS", "")}


def _faktor(kopf, flaechen):
    f = EINHEIT.get(int(kopf.get("$INSUNITS") or 0 or 0)) if str(kopf.get("$INSUNITS") or "").isdigit() else None
    if f:
        return f, ""
    mitte = sorted(flaechen)[len(flaechen) // 2] if flaechen else 0
    if mitte > 1e5:   # ohne Angabe: Räume in mm² → mm, in cm² → cm
        return 0.001, "Die DXF-Datei nennt keine Einheit – Millimeter angenommen."
    if mitte > 2e3:
        return 0.01, "Die DXF-Datei nennt keine Einheit – Zentimeter angenommen."
    return 1.0, "Die DXF-Datei nennt keine Einheit – Meter angenommen."


def dxf_lesen(raw, zuordnung):
    """zuordnung: {ebenen: {name: rolle}, bloecke: {name: rolle}} – fehlt eine Ebene oder ein Block, gilt der Vorschlag aus dem Namen."""
    kopf, O = _entities(raw)
    ZE = (zuordnung or {}).get("ebenen") or {}
    ZB = (zuordnung or {}).get("bloecke") or {}
    rolle_e = lambda n: ZE.get(n) or vorschlag(n, "ebene")   # noqa: E731
    rolle_b = lambda n: ZB.get(n) or vorschlag(n, "block")   # noqa: E731
    umrisse = [o for o in O if _zu(o) and rolle_e(o["ebene"]) == "raum"]
    f, hinweis_einheit = _faktor(kopf, [_flaeche(o["pkt"]) for o in umrisse])
    texte = [o for o in O if o["typ"] in ("TEXT", "MTEXT", "ATTRIB") and o["text"] and o["x"] is not None and o["y"] is not None]
    hinweise = [hinweis_einheit] if hinweis_einheit else []
    raeume = []
    for k, o in enumerate(sorted(umrisse, key=lambda o: (-o["pkt"][0][1], o["pkt"][0][0]))):
        fl = _flaeche(o["pkt"]) * f * f
        if fl < 0.5 or fl > 5000:
            continue
        drin = [t["text"] for t in texte if _innen(t["x"], t["y"], o["pkt"])]
        nr = next((t for t in drin if re.fullmatch(r"[A-Z]?\d{1,2}[.\-]\d{1,3}[a-z]?|\d{3,4}", t.strip())), "")
        name = next((t for t in drin if t != nr and not re.search(r"\d+[.,]\d+\s*m|^\s*[\d.,\s]+$|m²|m2\b", t) and len(t) <= 60), "")
        raeume.append({"id": 900000 + k, "nr": nr.strip()[:20], "name": (name or "Raum").strip()[:200], "flaeche": round(fl, 2),
                       "umfang": round(_umfang(o["pkt"]) * f, 2), "hoehe": None, "geschoss": ""})
    # Wände: Länge aller Linien je Rolle ÷ 2 (eine Wand hat zwei Seiten) × angenommene Höhe
    laenge = {"wand_aussen": 0.0, "wand_innen": 0.0}
    for o in O:
        r = rolle_e(o["ebene"])
        if r not in laenge:
            continue
        if o["typ"] == "LINE" and o["x2"] is not None and o["x"] is not None:
            laenge[r] += math.dist((o["x"], o["y"]), (o["x2"], o["y2"])) * f
        elif o["typ"] in ("LWPOLYLINE", "POLYLINE") and len(o["pkt"]) >= 2:
            laenge[r] += _umfang(o["pkt"], _zu(o)) * f
    bauteile = []
    for r, kg, art in (("wand_aussen", "331", "Wand"), ("wand_innen", "341", "Wand")):
        if laenge[r] > 0.5:
            lw = laenge[r] / 2
            bauteile.append({"kg": kg, "art": art, "name": f"Wand {'außen' if kg == '331' else 'innen'} (aus DXF)", "material": "", "dicke": 0, "einheit": "m²",
                             "menge": round(lw * WANDHOEHE, 2), "anzahl": 1, "aussen": kg == "331", "zustand": "", "ids": [], "code": "", "flaeche": 0,
                             "hinweis": f"Aus dem DXF geschätzt: Wandlinien {lw:.1f} m (Summe ÷ 2) × {WANDHOEHE:g} m Höhe".replace(".", ",")})
    n = {"fenster": 0, "tuer": 0}
    for o in O:
        if o["typ"] == "INSERT" and o["block"] and rolle_b(o["block"]) in n:
            n[rolle_b(o["block"])] += 1
    for r, kg, art in (("fenster", "334", "Fenster"), ("tuer", "344", "Tür")):
        if n[r]:
            bauteile.append({"kg": kg, "art": art, "name": f"{art} (aus DXF, Symbole)", "material": "", "dicke": 0, "einheit": "St", "menge": n[r], "anzahl": n[r],
                             "aussen": False, "zustand": "", "ids": [], "code": "", "flaeche": 0})
    if not raeume:
        hinweise.append("Keine Räume gefunden – sind die Raumumrisse geschlossene Polylinien auf einer Ebene, die „Räume“ zugeordnet ist?")
    if not bauteile:
        hinweise.append("Keine Wände, Fenster oder Türen gefunden – bitte die Ebenen und Blöcke zuordnen.")
    hinweise.append("Aus DXF: Wandflächen sind geschätzt (Länge × Höhe), Fenster und Türen nur gezählt.")
    return {"raeume": raeume, "bauteile": bauteile, "geschosse": [], "hinweise": hinweise,
            "info": {"programm": "DXF" + (f" ({kopf['$ACADVER']})" if kopf.get("$ACADVER") else ""), "objekte": len(O)}}


# ------------------------------------------------------------------ PDF
FLAECHE = re.compile(r"^(?:(?:NF|NRF|NGF|F|A|Fl\.?)[:=]?)?(\d{1,4}[.,]\d{1,2})$", re.I)


def pdf_lesen(raw):
    """Raumstempel aus einem CAD-PDF: je Flächenangabe („12,34 m²“, „NF 12,34“) die Wörter darüber als Name und Nummer."""
    import io
    import pdfplumber
    raeume, k = [], 0
    try:
        doc = pdfplumber.open(io.BytesIO(raw))
    except Exception:   # noqa: BLE001
        raise ValueError("Das ist keine lesbare PDF-Datei.")
    with doc:
        for seite in doc.pages[:20]:
            W = seite.extract_words(keep_blank_chars=False, use_text_flow=False) or []
            for i, w in enumerate(W):
                t = w["text"].replace("m²", "").replace("m2", "").strip()
                nach = W[i + 1]["text"] if i + 1 < len(W) else ""
                m = FLAECHE.match(t)
                if not m or not (re.match(r"^m[²2]$", nach) or "m²" in w["text"] or "m2" in w["text"] or re.match(r"(?i)^(NF|NRF|NGF)", w["text"])):
                    continue
                fl = float(m.group(1).replace(",", "."))
                if not 0.5 <= fl <= 5000:
                    continue
                oben = [x for x in W if w["top"] - 45 <= x["top"] < w["top"] - 1 and abs(x["x0"] - w["x0"]) < 70]
                oben.sort(key=lambda x: (x["top"], x["x0"]))
                nr = next((x["text"] for x in oben if re.fullmatch(r"[A-Z]?\d{1,2}[.\-]\d{1,3}[a-z]?", x["text"])), "")
                name = " ".join(x["text"] for x in oben if x["text"] != nr and not FLAECHE.match(x["text"].replace("m²", "")) and not re.match(r"^m[²2]$", x["text"]))
                k += 1
                raeume.append({"id": 950000 + k, "nr": nr[:20], "name": (name or "Raum")[:200], "flaeche": round(fl, 2),
                               "umfang": round(4.4 * math.sqrt(fl), 2), "hoehe": None, "geschoss": ""})   # Umfang geschätzt (Rechteck 1:1,4)
    gesehen, R = set(), []
    for r in raeume:
        s = (r["nr"], r["name"], r["flaeche"])
        if s not in gesehen:
            gesehen.add(s)
            R.append(r)
    H = ["Aus PDF: nur Räume (Raumstempel mit Fläche) – Wände, Fenster und Türen kann ein PDF nicht liefern; Wandflächen der Räume sind aus der Fläche geschätzt."]
    if not R:
        H.insert(0, "Keine Raumstempel gefunden – ist es ein PDF aus dem CAD (kein Scan) mit Flächenangaben wie „12,34 m²“?")
    return {"raeume": R, "bauteile": [], "geschosse": [], "hinweise": H, "info": {"programm": "PDF", "objekte": len(R)}}
