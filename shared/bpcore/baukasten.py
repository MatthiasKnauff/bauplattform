"""Gebäude-Baukasten (GO 20.11.2026, Mock „Gebäude-Baukasten“: A3 B2 C D2 E1 F1/F2 G1 H1).

Das Gebäude per Klick und Ziehen: Körper je Geschoss und Gebäudeteil, Dächer, Gauben, Fenster. Steht neben dem Planungsassistenten – beide
füllen dieselben Angaben (Geschosse, Keller, Dachform, Fläche je Teil); Ergebnis ist der Planstand „Assistent“ (Art „hand“) mit Bauteilen
aus der Geometrie und einem 3D-Netz, das im Gebäudemodell und in allen Apps zu sehen ist.

Korb (G1): die Aufbauten des Projekts – je Eintrag eine Vorlage aus den Baudaten. Wände, Dächer, Böden sind fest damit verknüpft: ändert
sich der Aufbau im Korb, bekommen alle verknüpften Bauteile ihn beim nächsten Nachführen (Zeilen der Bauteilliste aus `zeilen()`).
Fenster (D2): Rahmen, Verglasung und Uw gelten als Vorgabe für die Fenster-Zeilen; die Fensterfläche schätzt weiter der Assistent.
Kommt später ein Plan (E1), bleiben Baukasten und Korb stehen; die Angaben gehen über den Abgleich als Vorschlag (folgt).

Modell: m["baukasten"] = {koerper, dach, gauben, oeff, teile, raeume}, m["korb"] = {id: {art, vorlage, name, eigen}}.
sauber(bk) · korb_sauber(k) · aus_assistent(m) · ins_assistent(a, bk) · rohbau(bk, korb, EL) · netz_pruefen(N) · routen()
Das 3D-Netz rechnet der Baustein (bp/gebaeudekasten.js, mit Dicke aus dem Aufbau – E1) und gibt es beim Speichern mit; Nummern wie in rohbau().
"""
import math

from .wert import kurz as _s

RASTER = 0.5   # B2: Maße rasten auf 0,5 m ein (Höhen auf 0,05 m)
RUECK = 1.25   # H1: Staffelgeschoss rückt allseitig so weit zurück
SEITEN = {"xp": (1, 0), "xm": (-1, 0), "yp": (0, 1), "ym": (0, -1)}
FORMEN = ("sattel", "walm", "pult", "flach")
NEIGUNG = {"sattel": 38, "walm": 35, "pult": 15, "flach": 0}
GAUBEN = ("Schleppgaube", "Satteldachgaube", "Flachdachgaube")
RAHMEN = ("Holz", "Kunststoff", "Holz-Alu", "Alu")
UW = {"Holz": (1.3, 0.9), "Kunststoff": (1.2, 0.85), "Holz-Alu": (1.2, 0.8), "Alu": (1.5, 1.0)}   # Katalog: 2-fach, 3-fach (Beispiele)
ARTEN = ("wand", "dach", "boden")
VORGABE = {"wand": "331.02", "dach": "363.04", "flach": "363.09", "boden": "322.04", "decke": "351.01"}   # Aufbau, solange der Korb nichts anderes sagt
ID0 = 9_600_000   # Nummern der Körperflächen im Netz (nie gleich einem IFC- oder Ergänzungs-Objekt)


def _f(v, lo=0.0, hi=1e4, nd=3):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return lo
    if math.isnan(x):
        return lo
    return round(min(hi, max(lo, x)), nd)


def _r(v, st=RASTER):
    return round(round(float(v) / st) * st, 3)


def korb_sauber(k):
    out = {}
    for i, (kid, e) in enumerate(list((k if isinstance(k, dict) else {}).items())[:80]):
        if not isinstance(e, dict) or e.get("art") not in ARTEN or not _s(kid, 12):
            continue
        out[_s(kid, 12)] = {"art": e["art"], "vorlage": _s(e.get("vorlage"), 12), "name": _s(e.get("name"), 120) or _s(e.get("vorlage"), 12), "eigen": bool(e.get("eigen"))}
    return out


def sauber(bk):
    """Eingabe des Browsers → gültiger Baukasten (Grenzen, Raster, Verweise)."""
    bk = bk if isinstance(bk, dict) else {}
    K = []
    for x in (bk.get("koerper") if isinstance(bk.get("koerper"), list) else [])[:80]:
        if not isinstance(x, dict) or not _s(x.get("id"), 12):
            continue
        k = {"id": _s(x["id"], 12), "teil": _s(x.get("teil"), 20) or "h", "x": _f(x.get("x"), -500, 500), "y": _f(x.get("y"), -500, 500), "z": _f(x.get("z"), -30, 200),
             "w": max(1.0, _f(x.get("w"), 1, 200)), "d": max(1.0, _f(x.get("d"), 1, 200)), "h": max(2.0, _f(x.get("h"), 2, 8)),
             "wand": _s(x.get("wand"), 12), "boden": _s(x.get("boden"), 12)}
        se = x.get("seiten") if isinstance(x.get("seiten"), dict) else {}
        k["seiten"] = {s: _s(v, 12) for s, v in se.items() if s in SEITEN and _s(v, 12)}
        if x.get("staffel"):
            k["staffel"] = True
        K.append(k)
    ids = {k["id"] for k in K}
    D = {}
    for kid, d in list((bk.get("dach") if isinstance(bk.get("dach"), dict) else {}).items())[:80]:
        if kid in ids and isinstance(d, dict) and d.get("form") in FORMEN:
            D[kid] = {"form": d["form"], "aufbau": _s(d.get("aufbau"), 12)}
            fl = {str(i): _s(a, 12) for i, a in (d.get("fl") if isinstance(d.get("fl"), dict) else {}).items()
                  if str(i).isdigit() and int(i) < len(FLAECHEN[d["form"]]) and _s(a, 12) and _s(a, 12) != D[kid]["aufbau"]}
            if fl:   # einzelne Dachflächen mit eigenem Aufbau (20.11.2026: „Dachflächen auch einzeln anwählbar“)
                D[kid]["fl"] = fl
    G = [{"id": _s(g.get("id"), 12), "k": g["k"], "fl": int(_f(g.get("fl"), 0, 9, 0)), "u": _f(g.get("u"), 0.05, 0.95), "b": _f(g.get("b"), 0.8, 8, 2),
          "form": g.get("form") if g.get("form") in GAUBEN else GAUBEN[0], **_fenster(g)}
         for g in (bk.get("gauben") if isinstance(bk.get("gauben"), list) else [])[:60] if isinstance(g, dict) and g.get("k") in D and _s(g.get("id"), 12)]
    O = [{"id": _s(o.get("id"), 12), "k": o["k"], "seite": o["seite"], "art": o.get("art") if o.get("art") in ("fenster", "fenstertuer", "tuer") else "fenster",
          "u": _f(o.get("u"), 0.02, 0.98), "b": _f(o.get("b"), 0.3, 6, 2), "h": _f(o.get("h"), 0.3, 4, 2), **_fenster(o)}
         for o in (bk.get("oeff") if isinstance(bk.get("oeff"), list) else [])[:400] if isinstance(o, dict) and o.get("k") in ids and o.get("seite") in SEITEN and _s(o.get("id"), 12)]
    T = {_s(t, 20): _s(n, 80) for t, n in list((bk.get("teile") if isinstance(bk.get("teile"), dict) else {}).items())[:20] if _s(t, 20)}
    for k in K:
        T.setdefault(k["teil"], "Hauptgebäude" if not T else f"Anbau {len(T)}")
    return {"koerper": K, "dach": D, "gauben": G, "oeff": O, "teile": {t: n for t, n in T.items() if any(k["teil"] == t for k in K)}, "raeume": bool(bk.get("raeume"))}


def _fenster(o):
    r = o.get("rahmen") if o.get("rahmen") in RAHMEN else "Kunststoff"
    out = {"rahmen": r, "fach": 2 if o.get("fach") == 2 else 3}
    if o.get("uw") not in (None, ""):
        out["uw"] = _f(o.get("uw"), 0.5, 6, 2)
    return out


def uw(o):
    """Uw eines Fensters: eigener Wert oder aus dem Katalog nach Rahmen und Verglasung."""
    return o.get("uw") or UW.get(o.get("rahmen"), UW["Kunststoff"])[1 if o.get("fach", 3) == 3 else 0]


# ------------------------------------------------------------------ Assistent ⇄ Baukasten (dieselben Angaben)
def aus_assistent(m):
    """Leerer Baukasten → Körper aus den Angaben des Assistenten (Teile mit Fläche, Geschossen, Keller, Dach); ohne Angaben ein Erdgeschoss."""
    a = m.get("assistent") or {}
    ch = a.get("choice") or {}
    T = [t for t in (m.get("teile") or []) if isinstance(t, dict) and t.get("k")] or [{"k": "h", "n": "Hauptgebäude", "flaeche": a.get("area") or m.get("flaeche") or 0,
                                                                                     "geschosse": a.get("floors") or 1, "keller": ch.get("keller") not in (None, "", "none"), "dach": ch.get("dachform") or "sattel"}]
    K, D, Tn, x0, n = [], {}, {}, 0.0, 0
    for i, t in enumerate(T):
        ge = max(1, int(t.get("geschosse") or 1))
        bgf = (float(t.get("flaeche") or 0) / 0.8 / ge) if t.get("flaeche") else (108.0 if not i else 42.0)   # Wohnfläche ≈ 0,8 × BGF
        w = _r(max(4.0, math.sqrt(bgf * 1.33))) if not i else _r(max(3.0, math.sqrt(bgf)))
        d = _r(max(3.0, bgf / w))
        Tn[t["k"]] = t.get("n") or ("Hauptgebäude" if not i else f"Anbau {i}")
        if t.get("keller"):
            n += 1
            K.append({"id": f"k{n}", "teil": t["k"], "x": x0, "y": 0.0, "z": -2.6, "w": w, "d": d, "h": 2.6, "seiten": {}})
        for g in range(ge):
            n += 1
            K.append({"id": f"k{n}", "teil": t["k"], "x": x0, "y": 0.0, "z": round(g * 2.9, 2), "w": w, "d": d, "h": 2.9 if not g else 2.8, "seiten": {}})
        f = t.get("dach") if t.get("dach") in FORMEN else ("flach" if i else "sattel")
        D[K[-1]["id"]] = {"form": f, "aufbau": ""}
        x0 = _r(x0 + w)
    return {"koerper": K, "dach": D, "gauben": [], "oeff": [], "teile": Tn, "raeume": False}


def abgleich(bk, m):
    """Assistent → Baukasten: hat jemand im Assistenten die Zahl der Geschosse oder die Dachform des Hauptteils geändert, folgt der Baukasten."""
    a = m.get("assistent") or {}
    if not bk.get("koerper") or not a.get("type"):
        return bk
    t0 = bk["koerper"][0]["teil"]
    K = sorted([k for k in bk["koerper"] if k["teil"] == t0 and k["z"] >= 0], key=lambda k: k["z"])
    soll = max(1, int(a.get("floors") or len(K)))
    while len(K) < soll:   # Geschoss oben drauf (das Dach wandert mit)
        o = K[-1]
        n = dict(o, id=_frei(bk), z=round(o["z"] + o["h"], 2), h=2.8, seiten=dict(o.get("seiten") or {}))
        n.pop("staffel", None)
        if o["id"] in bk["dach"]:
            bk["dach"][n["id"]] = bk["dach"].pop(o["id"])
            for g in bk["gauben"]:
                if g["k"] == o["id"]:
                    g["k"] = n["id"]
        bk["koerper"].append(n)
        K.append(n)
    while len(K) > soll:   # oberstes Geschoss weg, Dach rückt nach unten
        o = K.pop()
        bk["koerper"] = [k for k in bk["koerper"] if k["id"] != o["id"]]
        bk["oeff"] = [x for x in bk["oeff"] if x["k"] != o["id"]]
        if o["id"] in bk["dach"]:
            bk["dach"][K[-1]["id"]] = bk["dach"].pop(o["id"])
            for g in bk["gauben"]:
                if g["k"] == o["id"]:
                    g["k"] = K[-1]["id"]
    f = (a.get("choice") or {}).get("dachform")
    if f in FORMEN and K and K[-1]["id"] in bk["dach"] and not K[-1].get("staffel"):
        bk["dach"][K[-1]["id"]]["form"] = f
    return bk


def _frei(bk):
    n = 1 + max([int(k["id"][1:]) for k in bk["koerper"] if k["id"][1:].isdigit()] or [0])
    return f"k{n}"


def ins_assistent(a, bk):
    """Baukasten → Assistent: Geschosse, Keller, Dachform und Fläche des Hauptteils; Fläche, Geschosse, Keller, Dach je weiterem Teil (wenn der
    Assistent die Teile schon kennt). Ohne Angaben im Assistenten (kein Gebäudetyp) bleibt er, wie er ist."""
    if not a or not a.get("type") or not bk.get("koerper"):
        return a
    a = dict(a, choice=dict(a.get("choice") or {}))
    teile = list(dict.fromkeys(k["teil"] for k in bk["koerper"]))
    for i, t in enumerate(teile):
        K = [k for k in bk["koerper"] if k["teil"] == t]
        ob = [k for k in K if k["z"] >= 0]
        fl = round(sum(k["w"] * k["d"] for k in ob) * 0.8)   # Wohnfläche ≈ 0,8 × BGF
        dk = next((bk["dach"][k["id"]]["form"] for k in sorted(K, key=lambda k: -k["z"]) if k["id"] in bk["dach"]), "")
        if not i:
            a.update(floors=max(1, len(ob)), area=fl or a.get("area") or 0)
            if a["choice"].get("keller") is not None or any(k["z"] < 0 for k in K):
                a["choice"]["keller"] = (a["choice"].get("keller") if a["choice"].get("keller") not in (None, "", "none") else "wu") if any(k["z"] < 0 for k in K) else "none"
            if dk:
                a["choice"]["dachform"] = dk
        elif t in {x.get("k") for x in a.get("tl") or []}:
            te = dict(a.get("teile") or {})
            te[t] = dict(te.get(t) or {}, area=fl, floors=max(1, len(ob)), keller=1 if any(k["z"] < 0 for k in K) else 0, **({"dach": dk} if dk else {}))
            a["teile"] = te
    return a


# ------------------------------------------------------------------ Geometrie → Bauteile der Liste
def _beruehrt(k, s, K):
    """Länge × Höhe der Wandfläche k/s, an der ein anderer Körper anliegt (innen, keine Außenwand)."""
    nx, ny = SEITEN[s]
    ebene = (k["x"] + k["w"]) if nx > 0 else k["x"] if nx < 0 else (k["y"] + k["d"]) if ny > 0 else k["y"]
    A = 0.0
    for q in K:
        if q is k:
            continue
        qe = (q["x"] if nx > 0 else q["x"] + q["w"]) if nx else (q["y"] if ny > 0 else q["y"] + q["d"])
        if abs(qe - ebene) > 0.01:
            continue
        a0, a1 = (k["y"], k["y"] + k["d"]) if nx else (k["x"], k["x"] + k["w"])
        b0, b1 = (q["y"], q["y"] + q["d"]) if nx else (q["x"], q["x"] + q["w"])
        lz = min(k["z"] + k["h"], q["z"] + q["h"]) - max(k["z"], q["z"])
        la = min(a1, b1) - max(a0, b0)
        if lz > 0 and la > 0:
            A += lz * la
    return A


FLAECHEN = {"flach": (0,), "pult": (0,), "sattel": (0, 1), "walm": (0, 1, 2, 3)}   # Dachflächen in dach_polygone (Rest: Giebel, Ortgang, Attika) – gleiche Reihenfolge wie im Baustein


def _pfl(P):
    """Fläche eines ebenen Polygons im Raum."""
    sx = sy = sz = 0.0
    for i in range(len(P)):
        (x1, y1, z1), (x2, y2, z2) = P[i], P[(i + 1) % len(P)]
        sx += y1 * z2 - z1 * y2
        sy += z1 * x2 - x1 * z2
        sz += x1 * y2 - y1 * x2
    return math.sqrt(sx * sx + sy * sy + sz * sz) / 2


def dach_anteile(k, form):
    """Anteil jeder Dachfläche an der Dachfläche gesamt (dach_flaeche) – für einen eigenen Aufbau je Fläche."""
    P = dach_polygone(k, form)
    A = {i: _pfl(P[i]) for i in FLAECHEN[form] if i < len(P)}
    s = sum(A.values()) or 1
    return {i: a / s for i, a in A.items()}


def dach_flaeche(k, form):
    if form == "flach":
        return k["w"] * k["d"]
    ue = 0.0 if form == "pult" else 0.4
    g = (k["w"] + 2 * ue) * (k["d"] + 2 * ue)
    return g / math.cos(math.radians(NEIGUNG.get(form, 38)))


def rohbau(bk, korb, EL=None, vorlagen=None):
    """Außenwände, Bodenplatten, Decken und Dächer aus den Körpern – je Gebäudeteil und Aufbau im Korb eine Zeile (wie modell_hand.rohbau,
    aber gemessen statt geschätzt). Fensterflächen (EL, Schätzung des Assistenten – D2) werden anteilig von den Außenwänden abgezogen."""
    K, Kb = bk.get("koerper") or [], korb or {}
    vorlagen = vorlagen or {}
    name = lambda kid, v: (Kb.get(kid) or {}).get("name") or vorlagen.get(v) or v   # noqa: E731
    vl = lambda kid, std: (Kb.get(kid) or {}).get("vorlage") or std   # noqa: E731
    G = {}

    def add(teil, kg, art, nm, v, menge, ids, aussen):
        if menge < 0.3:
            return
        key = (teil, kg, v)
        g = G.setdefault(key, {"kg": kg, "art": art, "material": "", "dicke": 0, "einheit": "m²", "menge": 0.0, "anzahl": 1, "aussen": aussen, "name": nm, "code": "", "ids": [],
                               "zustand": "", "hinweis": "Aus dem Gebäude-Baukasten gemessen.", "vorlage": v, "geschaetzt": True, "teil": teil, "baukasten": True})
        g["menge"] += menge
        g["ids"] += ids

    teil_tief = {}
    for k in K:
        teil_tief[k["teil"]] = min(teil_tief.get(k["teil"], 1e9), k["z"])
    for b, k in enumerate(K):
        for si, s in enumerate(SEITEN):
            L = k["d"] if s[0] == "x" else k["w"]
            fl = L * k["h"] - _beruehrt(k, s, K)
            kid = (k.get("seiten") or {}).get(s) or k.get("wand")
            v = vl(kid, VORGABE["wand"])
            add(k["teil"], "331", "Wand", f"Außenwand – {name(kid, v)}", v, fl, [ID0 + b * 20 + si], True)
        unten = k["z"] <= teil_tief[k["teil"]] + 0.01
        kid = k.get("boden")
        v = vl(kid, VORGABE["boden"] if unten else VORGABE["decke"])
        kg = v.split(".")[0] if "." in v else ("322" if unten else "351")
        add(k["teil"], kg, "Bodenplatte" if kg.startswith("32") else "Decke", ("Bodenplatte – " if kg.startswith("32") else "Decke – ") + name(kid, v), v, k["w"] * k["d"], [ID0 + b * 20 + 5], kg.startswith("32"))
        D = (bk.get("dach") or {}).get(k["id"])
        if D:
            ges, fn = dach_flaeche(k, D["form"]), dict(sattel="Satteldach", walm="Walmdach", pult="Pultdach", flach="Flachdach")[D["form"]]
            npoly = len(dach_polygone(k, D["form"]))
            for i, ant in dach_anteile(k, D["form"]).items():   # je Dachfläche – eigener Aufbau (fl) oder der des Dachs
                kid = (D.get("fl") or {}).get(str(i)) or D.get("aufbau")
                v = vl(kid, VORGABE["flach"] if D["form"] == "flach" else VORGABE["dach"])
                ids = [ID0 + b * 20 + 6 + i] + ([ID0 + b * 20 + 6 + j for j in range(npoly) if j not in FLAECHEN[D["form"]]] if i == 0 else [])   # Giebel/Ortgang an der ersten Fläche
                add(k["teil"], v.split(".")[0] if "." in v else "363", "Dach", f"Dach ({fn}) – {name(kid, v)}", v, ges * ant, ids, True)
        unter = next((q for q in K if q["teil"] == k["teil"] and k.get("staffel") and abs(q["z"] + q["h"] - k["z"]) < 0.01), None)
        if unter:   # Terrasse (H1): Decke darunter minus Staffelgeschoss
            add(k["teil"], "363", "Dach", "Terrasse um das Staffelgeschoss", VORGABE["flach"], unter["w"] * unter["d"] - k["w"] * k["d"], [], True)
    # Fensterflächen des Assistenten anteilig von den Außenwänden je Teil
    for teil in {k["teil"] for k in K}:
        W = [g for (t, kg, _), g in G.items() if t == teil and kg == "331"]
        fen = sum((e.get("b") or 0) * (e.get("h") or 0) for e in (EL or []) if e.get("aussen"))
        ges = sum(g["menge"] for g in W) or 1
        anteil = sum(k["w"] * k["d"] for k in K if k["teil"] == teil) / (sum(k["w"] * k["d"] for k in K) or 1)
        for g in W:
            g["menge"] = max(0.0, g["menge"] - fen * anteil * g["menge"] / ges)
    out = []
    for g in G.values():
        g["menge"] = round(g["menge"], 2)
        out.append(g)
    return out


def fenster_vorgabe(bk):
    """D2: Rahmen, Verglasung, Uw der Fenster im Baukasten → Vorgabe für die Fenster-Zeilen (häufigster Rahmen, mittleres Uw)."""
    F = [o for o in bk.get("oeff") or [] if o["art"] != "tuer"] + list(bk.get("gauben") or [])
    if not F:
        return None
    r = max(RAHMEN, key=lambda x: sum(1 for o in F if o["rahmen"] == x))
    return {"rahmen": r, "uw": round(sum(uw(o) for o in F) / len(F), 2), "anzahl": len(F)}


def dach_polygone(k, form):
    """Dachflächen eines Körpers (Weltkoordinaten) – dieselbe Reihenfolge wie dachFlaechen() im Baustein (Nummern im Netz)."""
    ue = 0.0 if form == "pult" else 0.4
    x0, x1, y0, y1, z = k["x"] - ue, k["x"] + k["w"] + ue, k["y"] - ue, k["y"] + k["d"] + ue, k["z"] + k["h"]
    kurz = min(k["w"], k["d"])
    H = 0.35 if form == "flach" else math.tan(math.radians(NEIGUNG[form])) * (kurz if form == "pult" else kurz / 2)
    la = k["w"] >= k["d"]
    if form == "flach":
        return [[(x0, y0, z + H), (x1, y0, z + H), (x1, y1, z + H), (x0, y1, z + H)]]
    if form == "pult":
        return [[(x0, y0, z + H), (x1, y0, z + H), (x1, y1, z), (x0, y1, z)], [(x1, y1, z), (x1, y0, z), (x1, y0, z + H)], [(x0, y0, z), (x0, y1, z), (x0, y0, z + H)],
                [(x1, y0, z), (x0, y0, z), (x0, y0, z + H), (x1, y0, z + H)]]
    e = kurz / 2 if form == "walm" else 0
    if la:
        r0, r1 = (x0 + e, (y0 + y1) / 2, z + H), (x1 - e, (y0 + y1) / 2, z + H)
        return [[(x0, y1, z), (x1, y1, z), r1, r0], [(x1, y0, z), (x0, y0, z), r0, r1], [(x1, y1, z), (x1, y0, z), r1], [(x0, y0, z), (x0, y1, z), r0]]
    r0, r1 = ((x0 + x1) / 2, y0 + e, z + H), ((x0 + x1) / 2, y1 - e, z + H)
    return [[(x1, y1, z), (x1, y0, z), r0, r1], [(x0, y0, z), (x0, y1, z), r1, r0], [(x0, y1, z), (x1, y1, z), r1], [(x1, y0, z), (x0, y0, z), r0]]


# ------------------------------------------------------------------ 3D-Netz (Format von netz.py)
TYPEN = {"w", "s", "r", "f", "d", "o", "x"}


def netz_pruefen(N):
    """Netz aus dem Baustein (bp/gebaeudekasten.js rechnet die Geometrie – eine Stelle, 21.11.2026) → geprüft und begrenzt, sonst None."""
    if not isinstance(N, dict) or not isinstance(N.get("e"), list) or len(N["e"]) > 3000:
        return None
    E, n = [], 0
    for e in N["e"]:
        if not isinstance(e, dict) or not isinstance(e.get("v"), list) or len(e["v"]) % 9 or e.get("t") not in TYPEN:
            return None
        try:
            v = [int(x) for x in e["v"]]
            x = {"i": int(e["i"]), "t": e["t"], "g": max(0, min(60, int(e.get("g") or 0))), "c": _s(e.get("c"), 9), "a": 0, "v": v}
            if e.get("h") is not None:
                x["h"] = int(e["h"])
        except (TypeError, ValueError):
            return None
        if any(abs(c) > 100_000 for c in v):   # 1 km – mehr ist kein Gebäude
            return None
        n += len(v) // 9
        if n > 60_000:
            return None
        E.append(x)
    G = [{"n": _s(g.get("n"), 40), "z": _f(g.get("z"), -30, 200)} for g in (N.get("geschosse") or [])[:60] if isinstance(g, dict)]
    return {"stand": 2, "e": E, "geschosse": G or [{"n": "Gebäude", "z": 0}], "dreiecke": n, "voll": True}


# ------------------------------------------------------------------ Adressen (eingehängt in modell.routen)
def routen(bp, mit, lesen_modell, schreiben_modell):
    from flask import jsonify, request

    @bp.get("/api/bp/modell/<int:pid>/baukasten")
    def baukasten_lesen(pid):
        def tun(c, wer):
            m = lesen_modell(c, pid)["modell"]
            neu = request.args.get("neu") == "1"   # „Neuer Planstand – mit dem Baukasten“: ein Erdgeschoss mit Satteldach, nichts übernommen
            gesp = (m.get("baukasten") or {}).get("koerper") and not neu
            bk = sauber(m.get("baukasten")) if gesp else aus_assistent({} if neu else m)
            a = m.get("assistent") or {}
            herkunft = "baukasten" if gesp else "assistent" if not neu and (m.get("teile") or a.get("area") or m.get("flaeche")) else "leer"   # „leer“ = nur ein Vorschlag
            return jsonify(baukasten=bk if neu else abgleich(bk, m), korb=korb_sauber(m.get("korb")), plan=_plan_art(m), herkunft=herkunft, raeume=(m.get("bauteilliste") or {}).get("raeume") or [])
        return mit(pid, tun)

    @bp.put("/api/bp/modell/<int:pid>/baukasten")
    def baukasten_setzen(pid):
        d = request.get_json(silent=True) or {}

        def tun(c, wer):
            M = lesen_modell(c, pid)
            m = M["modell"]
            bk, kb = sauber(d.get("baukasten")), korb_sauber(d.get("korb"))
            if not bk["koerper"]:
                return jsonify(error="Mindestens ein Geschoss braucht der Baukasten."), 400
            m["baukasten"], m["korb"] = bk, kb
            m["assistent"] = ins_assistent(m.get("assistent") or {}, bk)
            neu = bool(d.get("neu"))   # „Neuer Planstand – mit dem Baukasten“ (21.11.2026): eigener Planstand, gilt sofort – auch neben einem IFC
            plan = _plan_art(m)
            if neu or plan != "ifc":   # ohne Plan: den Planstand aus dem Baukasten nachführen (Bauteile + 3D)
                nachfuehren(c, pid, m, wer, schreiben_modell, netz_pruefen(d.get("netz")), neu)
                plan = "hand"
            else:
                schreiben_modell(c, pid, m, wer)
            return jsonify(dict(lesen_modell(c, pid), plan=plan))
        return mit(pid, tun)


def _plan_art(m):
    Q = (m.get("bauteilliste") or {}).get("quelle") or {}
    return "ifc" if (m.get("bauteilliste") or {}).get("zeilen") and Q.get("art") not in ("hand", None, "") else "hand"


def nachfuehren(c, pid, m, wer, schreiben_modell, N=None, neu=False):
    """Planstand aus Baukasten + Räumen/Fenstern (von Hand oder Vorschlag des Assistenten) neu bilden, Netz (N, vom Baustein) dazu speichern.
    neu: eigener neuer Planstand („Baukasten <Datum>“), der sofort gilt – nichts aus dem bisher gültigen übernommen."""
    from datetime import datetime
    from . import anweisung, bauteilliste as B, modell_hand as MH, netz as NZ, planstand as P
    alt = B.leer() if neu else (m.get("bauteilliste") or B.leer())
    if alt.get("raeume"):
        RA, EA = MH.sauber({"raeume": alt.get("raeume") or [], "elemente": MH._el_zurueck(alt)})
    else:
        RA, EA = MH.sauber(MH.vorschlag(m, alt))
    R = MH.R_aus(RA, EA, schaetzen=False)
    V = {r["id"]: r["name"] for r in c.execute("SELECT id, name FROM pdb_vorlage").fetchall()} if _hat(c, "pdb_vorlage") else {}
    roh = rohbau(m["baukasten"], m.get("korb") or {}, R["elemente"], V)
    inn = [g for g in MH.rohbau(R["raeume"], R["elemente"], m.get("assistent"), m.get("teile")) if g["kg"] == "341"] if R["raeume"] else []   # Innenwände schätzt weiter der Assistent
    R["bauteile"] = roh + inn + R["bauteile"]
    L = B.zeilen_aus_ifc(c, R, alt, B.bauart(m))
    fv = fenster_vorgabe(m["baukasten"])
    vl = {g["name"]: g["vorlage"] for g in roh}
    for z in L["zeilen"]:
        if z["name"] in vl and not z.get("vorlage") and vl[z["name"]]:   # fest verknüpft: Aufbau aus dem Korb, auch wenn die Zeile (noch) keine Antwort hat
            B.aufbau_setzen(c, z, vl[z["name"]])
        if fv and z.get("bereich") == "oeffnung" and z.get("art") == "Fenster" and not z.get("uw"):
            z["uw"] = fv["uw"]   # D2: Uw aus dem Baukasten als Vorgabe
    L["anweisungen"] = alt.get("anweisungen") or []
    L["raumbuch"] = alt.get("raumbuch") or {}
    Q = alt.get("quelle") or {}
    L["quelle"] = dict(Q, art="hand", gelesen=P._jetzt(), name=Q.get("name") or f"Baukasten {datetime.now().strftime('%d.%m.%Y')}", programm="Bauplattform (Baukasten)")
    anweisung.ableiten(c, L)
    P._sichern(c, pid, L, wer)
    sid = L["quelle"].get("planstand")
    if sid:
        c.execute("UPDATE pm_planstand SET art='hand' WHERE id=?", (sid,))
        if N:
            c.execute("INSERT INTO pm_netz(planstand, daten, erstellt) VALUES(?,?,?) ON CONFLICT (planstand) DO UPDATE SET daten=EXCLUDED.daten, erstellt=EXCLUDED.erstellt",
                      (sid, NZ.packen(N), P._jetzt()))
    schreiben_modell(c, pid, P.anwenden(m, L), wer)


def _hat(c, tabelle):
    try:
        c.execute(f"SELECT 1 FROM {tabelle} LIMIT 1").fetchall()
        return True
    except Exception:   # noqa: BLE001 – Tabelle fehlt (Test ohne Baudaten)
        return False
