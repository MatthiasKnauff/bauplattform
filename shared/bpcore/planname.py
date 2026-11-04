"""Plannamen nach der Plannummerierung des Büros lesen, Planstände (Index) ordnen, CAD-Dateien zuordnen, Gewerk erkennen.

Aufbau:  <Projekt> [<Kennung>] <Nummer> [INDEX <Buchstabe>] <Titel> [_<lfd. Nr.>]
  Projekt   A526 (Buchstabe + drei Ziffern, ggf. mit Unterprojekt A450.2)
  Kennung   optional (Stelle 0): AA Außenanlage, ELT Elektro, FL Fliesenspiegel, FK Farbkonzept, P (…) Positionsplan,
            AP Außenputz, IP Innenputz, NA Nachtrag zum Bauantrag
  Nummer    1. Leistungsphase . 2. Gebäudetyp/Variante . 3. Planart . 4. laufende Nummer (bei Grundrissen das Geschoss:
            1 = KG, 2 = EG, 3 = 1. OG …), z. B. 5.1.1.2 = Ausführungsplan, Gebäudetyp 1, Grundriss EG; Trennzeichen Punkt oder Unterstrich
  INDEX B   Planstand – ohne Index ist es der Ursprungsplan; der höchste Buchstabe ist der neueste Stand
"""
import re

STANDARD = {
    "phasen": {"1": "Bestand", "2": "Vorentwurf", "3": "Entwurf", "4": "Genehmigungsplan", "5": "Ausführungsplan", "6": "Ausschreibung"},
    "planarten": {"0": "Lageplan", "1": "Grundriss", "2": "Ansicht", "3": "Schnitt", "4": "Detail", "5": "Isometrie / Perspektive"},
    "kennungen": {"AA": "Außenanlagen", "ELT": "Elektro", "FL": "Fliesen", "FK": "Maler", "AP": "Putz", "IP": "Putz"},
    "stichworte": {
        "Rohbau": "bodenplatte, decke, fundament, rohbau, schal, bewehrung, mauerwerk, sturz, ringbalken",
        "Zimmerer": "balkenlage, dachstuhl, sparren, holzbau, zimmerer, pfetten",
        "Dachdecker": "dachdeck, dacheindeck, dachaufsicht",
        "Abbruch": "abbruch, rückbau, abriss, demontage",
        "Elektro": "elektro, beleuchtung, elt",
        "HLS": "hls, heizung, sanitär, lüftung, haustechnik, tga",
        "Fenster": "fenster",
        "Trockenbau": "trockenbau, abhangdecke, akustikdecke",
        "Estrich": "estrich",
        "Fliesen": "fliesen",
        "Treppenbau": "treppe",
        "alle Firmen": "baustelleneinrichtung, be-plan",
    },
    "max_mb": 20,
}
ALT_PHASEN = {"1": "Bestand", "2": "Entwurf", "3": "Genehmigung", "4": "Ausführung", "5": "Details", "6": "Ausschreibung"}   # frühere (falsche) Vorgabe
ALT_PLANARTEN = {"0": "Lageplan", "1": "Grundriss", "2": "Ansicht", "3": "Schnitt", "4": "Detail", "5": "Isometrie"}
KENNUNG_NAME = {"AA": "Außenanlage", "ELT": "Elektro", "FL": "Fliesenspiegel", "FK": "Farbkonzept", "P": "Positionsplan",
                "AP": "Außenputz", "IP": "Innenputz", "NA": "Nachtrag zum Bauantrag"}
CAD = {".dwg", ".dxf", ".dwf", ".pln", ".ifc"}
KENNUNG = r"AA|ELT|FL|FK|AP|IP|NA|P\s*\([^)]*\)|P"
RX = re.compile(r"^(?P<proj>[A-Za-z]\d{3}(?:\.\d+)*)[\s_-]+(?:(?P<gw>" + KENNUNG + r")[\s_-]+)?(?P<nr>\d+(?:[._]\d+){1,5})(?![\d])[._\s-]*(?P<rest>.*)$", re.I)
RX2 = re.compile(r"(?<![A-Za-z0-9])" + RX.pattern[1:], re.I)
IDX = re.compile(r"(?:^|[\s_-])(?:INDEX|IDX)[\s_.-]*(?P<i>[A-Z])(?=$|[\s_.-])", re.I)
LFD = re.compile(r"[\s_-]+(\d{1,3})$")


def lies(dateiname):
    """Dateiname → {proj, kennung, nr, teile, index, titel, lfd, ext} oder None (passt nicht zum Schema)."""
    stem, ext = (dateiname.rsplit(".", 1) + [""])[:2] if "." in dateiname else (dateiname, "")
    ext = "." + ext.lower() if ext else ""
    m = RX.match(stem.strip())
    if not m:   # Plannummer mitten im Namen („A481 Tierheim … NEU_5008_A481 5.1.4.10. Balkonplatten_7“)
        ms = list(RX2.finditer(stem.strip()))
        m = ms[-1] if ms else None
    if not m:
        return None
    rest = m.group("rest") or ""
    idx = ""
    mi = IDX.search(rest)
    if mi:
        idx = mi.group("i").upper()
        rest = (rest[:mi.start()] + " " + rest[mi.end():])
    lfd = ""
    ml = LFD.search(rest)
    if ml:
        lfd, rest = ml.group(1), rest[:ml.start()]
    titel = " ".join(re.sub(r"_+", " ", rest).split()).strip(" -.")
    teile = re.split(r"[._]", m.group("nr"))
    gw = " ".join((m.group("gw") or "").split())
    gw = (gw[:1].upper() + gw[1:]) if gw.lower().startswith("p") and "(" in gw else gw.upper()
    return {"proj": m.group("proj").upper(), "kennung": gw, "nr": ".".join(teile), "teile": teile, "index": idx,
            "titel": titel, "lfd": lfd, "ext": ext}


def _kw(s):
    return [w.strip().lower() for w in re.split(r"[,;\n]", s or "") if w.strip()]


def geschoss(n):
    """Laufende Nummer bei Grundrissen → Geschoss: 1 = KG, 2 = EG, 3 = 1. OG …"""
    try:
        n = int(n)
    except (TypeError, ValueError):
        return ""
    return "KG" if n == 1 else "EG" if n == 2 else f"{n - 2}. OG" if n > 2 else ""


def gewerk(info, conf):
    """(Gewerk, Quelle) aus Kennung, Inhalt von „P (…)“ oder Stichwörtern im Titel; (\"\", \"\") wenn nichts passt."""
    kn = info.get("kennung") or ""
    k = kn.split("(")[0].strip()
    for kk, gw in (conf.get("kennungen") or {}).items():
        if kk.upper() == k.upper() and gw:
            return gw, f"Kennung {k}"
    t = (info.get("titel") or "").lower()
    if "(" in kn:   # Positionsplan „P (Fenster)“: Gewerk steht in der Klammer
        t = kn.split("(", 1)[1].rstrip(")").lower() + " " + t
    for gw, worte in (conf.get("stichworte") or {}).items():
        for w in _kw(worte):
            if re.search(r"(?<![a-zäöüß])" + re.escape(w), t):
                return gw, f"Stichwort „{w}“"
    return "", ""


def _idx_rang(i):
    return ord(i) - 64 if i else 0


def ordnen(dateien, conf, zuordnung=None):
    """Dateien aus dem Projektordner → (Pläne, sonstige PDFs).
    Plan: {key, proj, kennung, kennung_name, nr, phase, phase_name, variante, planart, planart_name, lfd, geschoss, titel, gewerk, gewerk_quelle, staende:[…]}
    Stand: {index, pdf:{pfad,name,groesse,mtime}, cad:[…]} – neuester Stand zuerst."""
    zuordnung = zuordnung or {}
    ph, pa = conf.get("phasen") or {}, conf.get("planarten") or {}
    plaene, sonst, cad_frei = {}, [], {}
    stamm = lambda f: (f.get("ordner") or "", f["name"].rsplit(".", 1)[0].strip().lower())
    for f in dateien:
        i = lies(f["name"])
        if not i:
            if f["name"].lower().endswith(".pdf"):
                sonst.append(f)
            elif "." + f["name"].rsplit(".", 1)[-1].lower() in CAD:
                cad_frei.setdefault(stamm(f), []).append({**f, "ext": "." + f["name"].rsplit(".", 1)[-1].lower()})
            continue
        key = f"{i['proj']}|{i['kennung']}|{i['nr']}"
        p = plaene.get(key)
        if not p:
            T = i["teile"] + [""] * 4
            p = plaene[key] = {"key": key, "proj": i["proj"], "kennung": i["kennung"], "kennung_name": KENNUNG_NAME.get(i["kennung"].split("(")[0].strip().upper(), ""),
                               "nr": i["nr"], "titel": i["titel"],
                               "phase": T[0], "phase_name": ph.get(T[0], ""), "variante": T[1],
                               "planart": T[2], "planart_name": pa.get(T[2], "") if T[2] else "",
                               "lfd": T[3], "geschoss": geschoss(T[3]) if T[2] == "1" else "", "_st": {}, "_titel_rang": -1}
        st = p["_st"].setdefault(i["index"], {"index": i["index"], "pdf": None, "pdfs": [], "cad": []})
        e = {**f, "lfd": i["lfd"], "ext": i["ext"]}
        if i["ext"] == ".pdf":
            st["pdfs"].append(e)
            if _idx_rang(i["index"]) >= p["_titel_rang"] and i["titel"]:
                p["titel"], p["_titel_rang"] = i["titel"], _idx_rang(i["index"])
        elif i["ext"] in CAD:
            st["cad"].append(e)
    out = []
    for p in plaene.values():
        st = p.pop("_st")
        p.pop("_titel_rang", None)
        p["staende"] = [_fertig(st[i]) for i in sorted(st, key=_idx_rang, reverse=True)]
        p["staende"] = [x for x in p["staende"] if x["pdf"] or x["cad"]]
        if not any(x["pdf"] for x in p["staende"]):   # nur CAD-Dateien: kein Plan zum Versenden
            continue
        gw = zuordnung.get(p["key"])
        p["gewerk"], p["gewerk_quelle"] = (gw, "zugeordnet") if gw else gewerk(p, conf)
        out.append(p)
    out.sort(key=lambda p: (p["proj"], [int(x) if x.isdigit() else 0 for x in p["nr"].split(".")], p["kennung"]))
    weitere = []   # PDFs ohne Plannummer: genauso versendbar, Gewerk aus Stichwörtern, CAD-Datei mit gleichem Namen im selben Ordner
    for f in sorted(sonst, key=lambda f: -(f.get("mtime") or 0)):
        key = "f:" + f["pfad"]
        titel = " ".join(re.sub(r"[_]+", " ", f["name"].rsplit(".", 1)[0]).split())
        gw = zuordnung.get(key)
        g_, q_ = (gw, "zugeordnet") if gw else gewerk({"titel": titel}, conf)
        weitere.append({**f, "key": key, "titel": titel, "gewerk": g_, "gewerk_quelle": q_, "cad": cad_frei.get(stamm(f), [])})
    return out, weitere


def _fertig(st):
    """Mehrere PDFs desselben Stands (Kopien in anderen Ordnern, lfd. Nr.): die jüngste Datei ist der Plan."""
    st["pdfs"].sort(key=lambda e: e.get("mtime") or 0, reverse=True)
    st["pdf"] = st["pdfs"][0] if st["pdfs"] else None
    st["kopien"] = len(st["pdfs"]) - 1 if st["pdfs"] else 0
    st.pop("pdfs", None)
    return st
