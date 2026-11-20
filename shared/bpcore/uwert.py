"""U-Werte an den Bauteilen (GO 18.11.2026, Mock „U-Werte an den Bauteilen“: UW-A1 B1 C1 D1).

Der U-Wert wird nicht gespeichert, sondern aus der gewählten Ausführung gerechnet – im Browser mit demselben Rechenkern wie der
Wärmeschutz (bp/wsphysik.js, bp/wsregeln.js). Hier steht nur, was der Rechenkern dafür braucht:

baustoff(text)                → (Schlüssel der Baustoff-Datenbank ws_baustoff, λ aus dem Text oder None) – feste Zuordnung über den Text der
                                Ausführung bzw. der Position („KS 17,5“ → Kalksandstein 1800, „EPS 032“ → EPS mit λ 0,032); kein Raten über Ähnlichkeit
schichten_vorlage(c, auf)     → Schichten eines gewählten Aufbaus (Vorlage des Baukastens, Wahl je Schicht, eigene Dämmdicke)
                                [{n, d (cm), m (Schlüssel), lam?, m2/breite/abstand (Gefach), seite, fehlt?}]
projekt(c, pid)               → je Zeile der Bauteilliste: Art (wand, steildach, …, fenster), Schichten innen → außen (Kern-Zeile mit ihren
                                Ergänzungen: Innenputz 336, WDVS 335, Dachbelag 363, Bekleidung 364, Bodenaufbau 324), Uw bei Fenstern/Türen
                                (aus der Position, je Zeile überschreibbar: Zeile.uw), dazu die benutzten Baustoffe und ob das Projekt ein Neubau ist.
Anforderung (Farbe): Neubau gegen das Referenzgebäude (GModG Anlage 1), sonst Höchstwerte bei Änderung (Anlage 7) – Werte in bp/wsregeln.js.
"""
import json
import os
import re

# ---------------------------------------------------------------- Baustoff aus dem Text (Reihenfolge: das Genauere zuerst)
D = "dämm"   # Art: Dämmstoff (λ aus dem Text, Dicke Pflicht)
T = "trag"   # Tragschicht / Platte (Dicke Pflicht)
F = "fein"   # Putz, Estrich, Belag – ohne Dicke mit Vorgabe
REGELN = [
    (r"vakuum|\bVIP\b", "vip", D), (r"phenol|resol|kooltherm", "phenol_021", D),
    (r"\bPIR\b|\bPUR\b|polyurethan", "pur_026", D), (r"\bXPS\b|extrud", "xps_035", D),
    (r"\bEPS\b|polystyrol(?!-?partikel)|styropor", "eps_035", D),
    (r"holzfaser[- ]?putztr|\bHF\b[^,]*putztr", "wf_046_putz", D), (r"holzfaser[- ]?unterdeck", "wf_050_unterdeck", D),
    (r"holzfaser|\bHF\b", "wf_040_platte", D), (r"zellulose|isofloc", "zellulose_038", D), (r"hanf|flachs", "hanf_040", D),
    (r"schaumglas", "schaumglas", D), (r"perlit", "perlite", D), (r"mineraldämm|multipor", "mineralschaum", D),
    (r"holzwolle", "hwl_063", D), (r"kork", "kork_040", D),
    (r"mineralwolle|steinwolle|glaswolle|\bMW\b|\bMW\s*\d", "mw_035", D),
    (r"holzrahmen|ständer\s*\d+\s*/\s*\d+.*gedämmt", "mw_035", D),   # Holzrahmenwand „Ständer 60/160 mm, gedämmt“ → Gefach
    (r"wärmedämmend|wärmedämmziegel|\bT[0-9]{1,2}\b|poroton", "hlz_daemm_10", D),   # Planziegel wärmedämmend (λ steht im Text)
    (r"planziegel|hochlochziegel|\bHlz\b|ziegel ungefüllt", "hlz_1200", T),
    (r"klinker|verblend|vormauer", "vmz", T),
    (r"granit", "naturstein_granit", T), (r"sandstein", "naturstein_sand", T), (r"kalkstein|travertin|marmor", "kalkstein_hart", T),
    (r"porenbeton[^,]*\bPP\s*2|\bPP\s*2\b", "porenbeton_350", T), (r"porenbeton|\bPP\s*\d|ytong|gasbeton", "porenbeton_500", T),
    (r"kalksand|\bKS\b", "ks_1800", T), (r"leichtbeton|bims|blähton", "bims", T),
    (r"brettsperrholz|\bBSP\b|\bCLT\b", "brettsperrholz", T), (r"brettschicht|\bBSH\b", "bsh", T),
    (r"stahlbeton|\bStB\b|beton|elementwand|elementdecke|fertigteil|hohldiele|aufbeton|\bC\d\d/\d\d\b|\bWU\b", "beton_stb", T),
    (r"\bOSB\b", "osb", T), (r"rauspund|schalung|dielen", "schalung", T), (r"sparren|balken|\bKVH\b|kantholz", "holz_nadel", T),
    (r"gipsfaser|\bGF\b|trockenestrich", "gf", T), (r"gipsplatte|gipskarton|\bGK[BF]?\b", "gkb", T), (r"faserzement", "faserzement", T),
    (r"lehmputz", "putz_lehm", F), (r"wärmedämmputz", "putz_waermedaemm_t1", F), (r"leicht(unter)?putz|\bLP\b", "putz_leicht", F),
    (r"kalkzement|\bKZ\b|sanierputz", "putz_kalkzement", F), (r"gips|dünnlagen|dünnputz", "putz_kalkgips", F), (r"kalkputz", "putz_kalk", F),
    (r"silikonharz|oberputz|scheibenputz|kratzputz|putzsystem|außenputz", "putz_wdvs", F),
    (r"zementestrich|\bZE\b|heizestrich|zement-heizestrich", "estrich_zement", F), (r"calciumsulfat|anhydrit|fließestrich|\bCA\b", "estrich_anhydrit", F),
    (r"gussasphalt", "gussasphalt", F), (r"fliesen|feinsteinzeug|keramik|mosaik", "fliesen", F), (r"parkett", "parkett", F),
    (r"linoleum", "bodenbelag_lino", F), (r"vinyl|\bPVC\b|laminat|elastisch", "bodenbelag_pvc", F), (r"teppich|textil", "teppich", F),
    (r"kautschuk|gummi", "bodenbelag_gummi", F), (r"estrich", "estrich_zement", F),
]
REGELN = [(re.compile(m, re.I), k, a) for m, k, a in REGELN]
VORGABE_CM = {"putz_leicht": 2.0, "putz_wdvs": 0.5, "putz_kalkgips": 1.5, "putz_kalkzement": 1.5, "putz_kalk": 1.5, "putz_lehm": 2.0,
              "estrich_zement": 5.0, "estrich_anhydrit": 4.0, "fliesen": 1.0, "parkett": 1.5, "bodenbelag_lino": 0.3, "bodenbelag_pvc": 0.3, "teppich": 0.8,
              "gussasphalt": 3.0, "osb": 1.5, "gkb": 1.25, "gf": 1.25, "schalung": 2.0, "vmz": 11.5, "bodenbelag_gummi": 0.3}
HINTERL = re.compile(r"\bVHF\b|hinterlüft|rhombus|stülpschalung|deckelschalung", re.I)
GESTRICHEN = re.compile(r"anstrich|gestrichen|lasiert|beschicht", re.I)
# Schichten, die für den U-Wert nicht zählen: außen hinterlüftet (Deckung, Lattung, Bekleidung der VHF), Erdreich/Unterbau, dünne Bahnen
WEG = re.compile(r"dachziegel|tondach|dachstein|biber|schiefer|stehfalz|deckung|lattung|konterlatt|hinterlüft|bekleidung\b.*(vhf|fassade)|\bHPL\b|lärche"
                 r"|kies|tragschicht|frostschürze|streifenfund|randgründung|sauberkeitsschicht|abdichtung|bitumen|folie|bahn\b|dampf|anstrich|grundierung"
                 r"|haftbrücke|egalisation|brandriegel|holzschutz|entwässerung|ohne\b|systemschalung|hydrophob|lasur|kosmetik|fugenblech|injektion"
                 r"|horizontalsperre|schutzmatte|einbauteil|ankerplatte|kunstharz|verlauf|trapez|rinne|fallrohr|kehle|kehlblech|durchdring|notüberlauf"
                 r"|speier|gesims|fasche|asbest|stelzlager|rückbau|m³ je m²|dübel", re.I)
WEG_NAME = re.compile(r"^(deckung|bekleidung|unterbau|randgründung|entwässerung|holzschutz|brandschutz|dachrand|zulagen|durchdringungen|abdichtung|schutzlage"
                      r"|oberfläche|untergrund|bauart|pfetten|unterzug|auflager|dampfsperre)$", re.I)
CMMM = re.compile(r"(\d+(?:[.,]\d+)?)\s*(cm|mm)\b", re.I)
PAAR = re.compile(r"(\d+)\s*[/×x]\s*(\d+)\s*mm", re.I)
LAM = re.compile(r"(?:λ\s*=?\s*|WLS\s*|WLG\s*|\b)(0[.,]0\d{1,2}|0[.,]\d\d?\b|0\d\d)\b")
UW = re.compile(r"\bU[wd]\s*(?:[≤<=]|bis)?\s*(\d[.,]\d+)", re.I)


def _zahl(s):
    return float(str(s).replace(",", "."))


def baustoff(text):
    """Text einer Ausführung/Position → (Schlüssel, Art, Treffer-Position, λ aus dem Text)."""
    t = str(text or "")
    for rx, k, art in REGELN:
        m = rx.search(t)
        if m:
            lam = None
            if art == D:
                ml = LAM.search(t, m.start())
                if ml:
                    x = ml.group(1)
                    lam = _zahl(x) if ("," in x or "." in x) else int(x) / 1000
                    lam = lam if 0.005 <= lam <= 0.2 else None
            return k, art, m.start(), lam
    return None, None, 0, None


def dicke_cm(text, ab=0):
    """Dicke im Text hinter dem Baustoff („d = 17,5 cm“, „120 mm“, „60/160 mm“ → 16 cm)."""
    t = str(text or "")
    mp = PAAR.search(t, ab)
    m = CMMM.search(t, ab) or CMMM.search(t)
    if mp and (not m or mp.start() <= m.start()):
        return int(mp.group(2)) / 10, int(mp.group(1)) / 10
    if not m:
        return None, None
    v = _zahl(m.group(1))
    return (v / 10 if m.group(2).lower() == "mm" else v), None


def _seite(name):
    n = (name or "").lower()
    if re.search(r"innen|belag|estrich|bekleidung|installation", n):
        return 0
    if re.search(r"außen|aussen|fassade|wdvs|unter platte|oberfläche|aufsparren|deckung|unterkonstruktion", n):
        return 2
    return 1


def schichten_vorlage(c, auf, V=None, kurz=None):
    """Gewählter Aufbau {v, w, d} → Schichten. V = Vorlage (sonst aus pdb_vorlage), kurz = {Positionscode: Kurztext} (Dicke, wenn der Text keine hat)."""
    if V is None:
        r = c.execute("SELECT daten FROM pdb_vorlage WHERE id=?", (str((auf or {}).get("v") or ""),)).fetchone()
        V = json.loads(r["daten"] or "{}") if r else {}
    W, DK, out = list((auf or {}).get("w") or []), {str(k): v for k, v in ((auf or {}).get("d") or {}).items()}, []
    AU = {str(k): v for k, v in ((auf or {}).get("a") or {}).items() if v}   # eigene Ausführung (schicht.py): z. B. „035“ statt „032“ → anderes λ
    SO = None
    for si, s in enumerate((V or {}).get("schichten") or []):
        O = s.get("optionen") or []
        if not O:
            continue
        o = O[max(0, min(int(W[si]) if si < len(W) and str(W[si]).lstrip("-").isdigit() else 0, len(O) - 1))]
        txt = " ".join(x for x in (o.get("k"), o.get("t")) if x)
        if str(si) in AU:
            from . import schicht
            SO = SO if SO is not None else schicht.optionen(c, (V or {}).get("schichten") or [])
            x, mi = schicht.mat(SO, si, O.index(o))
            if x and mi.get("ausf"):
                o = {**o, "t": schicht.text_ausf(o.get("t") or txt, x["ausf"], AU[str(si)], mi["muster"])}
                txt = " ".join(y for y in (o.get("k"), o.get("t")) if y)
        if not o.get("teile") or "entfällt" in txt.lower() or WEG_NAME.match((s.get("name") or "").strip()):
            continue
        k, art, ab, lam = baustoff(o.get("t") or txt)
        if not k:
            k, art, ab, lam = baustoff(txt)
        if k and WEG.search(txt) and art != D and not CMMM.search(txt):   # „Fugenblech“, „Betonlasur“ … ohne Dicke
            continue
        if not k:
            if not WEG.search(txt) and CMMM.search(txt):   # hat eine Dicke, aber kein bekannter Baustoff → fehlt (C1)
                out.append({"si": si, "n": f"{s.get('name') or ''} {o.get('k') or ''}".strip()[:80], "d": dicke_cm(txt)[0], "m": "", "seite": _seite(s.get("name")), "fehlt": True})
            continue
        if HINTERL.search(txt) or (HINTERL.search(str((V or {}).get("name") or "")) and re.search(r"naturstein|bekleidung|platte|fassade|tafel", (s.get("name") or "") + " " + txt, re.I)):   # außen hinterlüftet: zählt nicht
            continue
        d, breite = DK.get(str(si)), None
        if d is None:
            d, breite = dicke_cm(o.get("t") or txt, ab)
            if art == F and d and (d > 8 or re.search(r"\d\s*[×x]\s*\d+\s*cm", txt)):   # „Feinsteinzeug 30 × 60 cm“ ist das Format, nicht die Dicke
                d = None
        if d is None and art == T and GESTRICHEN.search(txt) and k not in VORGABE_CM:   # „Betonfläche direkt gestrichen“: keine Schicht
            continue
        if d is None:
            for code, _f in o.get("teile") or []:
                d, breite = dicke_cm((kurz or {}).get(code, ""))
                if d:
                    break
        if d is None:
            d = VORGABE_CM.get(k)
        x = {"si": si, "n": f"{s.get('name') or ''} {o.get('k') or o.get('t') or ''}".strip()[:80], "d": d, "m": k, "seite": _seite(s.get("name"))}
        if lam:
            x["lam"] = lam
        if not d:
            x["fehlt"] = True
        if art == D and re.search(r"zwischensparren|zwischen|gefach|holzrahmen|ständer", txt, re.I):
            x.update(m2="holz_nadel", breite=breite or (8 if "sparren" in txt.lower() else 6), abstand=75 if "sparren" in txt.lower() else 62.5)
        if k == "holz_nadel" and re.search(r"sparren|balken", txt, re.I):
            x["sparren"] = breite or 8
        out.append(x)
    return out


# ---------------------------------------------------------------- Zeilen der Bauteilliste → Art und Gruppe
def art(z, vname=""):
    """(Art, Rolle) – Rolle: kern | innen | aussen; None = kein Hüllbauteil."""
    kg, n = str(z.get("kg") or ""), f"{z.get('name') or ''} {vname} {z.get('kurz') or ''}".lower()
    if kg in ("334", "337"):
        return ("tuer" if re.search(r"haustür|außentür|nebeneingang|eingangsanlage|\btor\b", n) else "fenster"), "kern"
    if kg == "362":
        return ("lichtkuppel" if re.search(r"lichtkuppel|glasdach", n) else "dachfenster"), "kern"
    if kg in ("331", "332"):
        if re.search(r"brüstung|attika|pfeiler|glasbaustein", n):
            return None, None
        return ("erdwand" if re.search(r"keller|erdreich|\bwu\b|weiße wanne|erdberührt", n) else "wand"), "kern"
    if kg == "335":
        return "wand", "aussen"
    if kg == "336":
        return ("erdwand" if "keller" in n else "wand"), "innen"
    flach = bool(re.search(r"flach|warmdach|umkehrdach|gründach|dachterrasse|trapez|hallendach", n))
    if kg == "361":
        return (None, None) if re.search(r"gaube", n) else ("flachdach" if flach else "steildach"), "kern"
    if kg == "363":
        return ("flachdach" if flach else "steildach"), "aussen"
    if kg == "364":
        return (None, None) if re.search(r"überstand|traufkasten", n) else ("flachdach" if flach else "steildach"), "innen"
    if kg == "322":
        return ("bodenplatte", "kern") if re.search(r"bodenplatte|kellerboden", n) else (None, None)
    if kg == "324":
        return "bodenplatte", "innen"
    return None, None


def _baustoffe(c, keys):
    """Benutzte Baustoffe im Format des Rechenkerns (bp/wsregeln.js aufbau(): id, lambda, rho, mu, c, holz, luft, belueftet)."""
    if not keys:
        return {}
    out = {}
    try:
        for r in c.execute("SELECT * FROM ws_baustoff WHERE schluessel IN (" + ",".join("?" * len(keys)) + ")", tuple(keys)).fetchall():
            r = dict(r)
            out[r["schluessel"]] = {"id": r["schluessel"], "name": r.get("name") or "", "lambda": r.get("lambda"), "rho": r.get("rho"), "mu": r.get("mu") if r.get("mu") is not None else 1,
                                    "c": r.get("c") or 1000, **({"holz": r["holz"]} if r.get("holz") else {})}
    except Exception:   # noqa: BLE001 – Tabelle noch nicht angelegt (Wärmeschutz nie geöffnet): eingebaute Werte
        pass
    if len(out) < len(keys):
        for e in json.load(open(os.path.join(os.path.dirname(__file__), "ws_baustoffe.json"), encoding="utf-8"))["baustoffe"]:
            if e["k"] in keys and e["k"] not in out:
                out[e["k"]] = {"id": e["k"], "name": e["name"], "lambda": e.get("lambda"), "rho": e.get("rho"), "mu": e.get("mu", 1), "c": e.get("c") or 1000,
                               **({"holz": e["holz"] if isinstance(e["holz"], str) else "vollholz"} if e.get("holz") else {})}
    return out


def zusammen(kern, innen, aussen):
    """Kern-Zeile mit ihren Ergänzungen → Schichten innen → außen. Sparren/Balken: mit Dämmung im Gefach wird das Holz der Anteil im Gefach,
    sonst (Aufsparrendämmung) liegt es auf der Innenseite und zählt nicht."""
    S = [dict(x, seite=-1) for x in innen] + kern + [dict(x, seite=3) for x in aussen]
    sp = [x for x in S if x.get("sparren")]
    ge = [x for x in S if x.get("m2")]
    if sp:
        for x in ge:
            x["breite"] = sp[0]["sparren"]
        S = [x for x in S if not x.get("sparren")]
    return sorted(S, key=lambda x: x["seite"])


def projekt(c, pid):
    from . import bauteilliste as B, modell
    m = modell.lesen(c, pid)["modell"]
    L = B.sauber(m.get("bauteilliste"))
    neubau = B.bauart(m) == "neubau"
    Z = [z for z in L["zeilen"] if not z.get("entfaellt") and z.get("status") != "abbruch"]
    vids = sorted({z["vorlage"] for z in Z if z.get("vorlage")})
    VV = {r["id"]: (r["name"], json.loads(r["daten"] or "{}")) for r in c.execute(
        "SELECT id, name, daten FROM pdb_vorlage WHERE id IN (" + ",".join("?" * len(vids)) + ")", tuple(vids)).fetchall()} if vids else {}
    codes = sorted({t[0] for _n, V in VV.values() for s in V.get("schichten") or [] for o in s.get("optionen") or [] for t in o.get("teile") or []})
    kurz = {r["code"]: r["kurz"] for r in c.execute("SELECT code, kurz FROM pdb_position WHERE katalog='positionsdb' AND code IN ("
                                                       + ",".join("?" * len(codes)) + ")", tuple(codes)).fetchall()} if codes else {}
    info = {}
    for z in Z:
        vn, V = VV.get(z.get("vorlage"), ("", {}))
        a, rolle = art(z, vn)
        if not a:
            continue
        x = {"typ": a, "rolle": rolle, "teil": z.get("teil") or ""}
        if a in ("fenster", "tuer", "dachfenster", "lichtkuppel"):
            txt = " ".join(str(o.get("t") or "") for i, s in enumerate(V.get("schichten") or []) for j, o in enumerate(s.get("optionen") or [])
                           if j == ((z.get("wahl") or [])[i] if i < len(z.get("wahl") or []) else 0))
            mu = UW.search(txt) or UW.search(z.get("kurz") or "")
            x["uw_pos"] = _zahl(mu.group(1)) if mu else None
            x["uw"] = z.get("uw") or x["uw_pos"]
        else:
            x["s"] = schichten_vorlage(c, {"v": z.get("vorlage"), "w": z.get("wahl"), "d": z.get("dicken"), "a": z.get("ausf")}, V, kurz) if z.get("vorlage") else []
        info[z["id"]] = x
    # Gruppen: Kern-Zeile + Ergänzungen desselben Gebäudeteils und derselben Art (WDVS 335 und Innenputz 336 an jede Außenwand)
    out = {}
    for zid, x in info.items():
        if "s" not in x:
            out[zid] = {"typ": x["typ"], "uw": x["uw"], "uw_pos": x["uw_pos"]}
            continue
        if x["rolle"] != "kern":
            continue
        gl = [(i, y) for i, y in info.items() if i != zid and y["typ"] == x["typ"] and y["teil"] == x["teil"] and "s" in y]
        innen, aussen = [y for _i, y in gl if y["rolle"] == "innen"], [y for _i, y in gl if y["rolle"] == "aussen"]
        S = zusammen(x["s"], [s for y in innen for s in y["s"]], [s for y in aussen for s in y["s"]])
        out[zid] = {"typ": x["typ"], "s": S, "mit": [i for i, y in gl if y["rolle"] != "kern"]}
    for zid, x in info.items():   # Ergänzungen zeigen den U-Wert ihrer Kern-Zeile; ohne Kern-Zeile stehen sie allein (unvollständig)
        if "s" in x and x["rolle"] != "kern":
            k = next((i for i, y in out.items() if zid in (y.get("mit") or [])), None)
            out[zid] = {"typ": x["typ"], "wie": k} if k else {"typ": x["typ"], "s": sorted(x["s"], key=lambda s: s["seite"]), "ohne_kern": True}
    keys = {s["m"] for y in out.values() for s in y.get("s") or [] if s.get("m")} | {s["m2"] for y in out.values() for s in y.get("s") or [] if s.get("m2")}
    return {"neubau": neubau, "zeilen": out, "baustoffe": _baustoffe(c, sorted(keys))}


def lagen(c, auf):
    """Für den Wärmeschutz (huelle): Schichten als [[Name, Dicke m, Baustoff, Gefach?]] – der Baustoff kommt mit, kein Raten über den Namen."""
    return [[s["n"], round(s["d"] / 100, 4), s.get("m") or "", {k: s[k] for k in ("lam", "m2", "breite", "abstand") if s.get(k)}]
            for s in schichten_vorlage(c, auf) if s.get("d") and not s.get("fehlt")]


def routen(bp, mit):
    from flask import jsonify

    @bp.get("/api/bp/modell/<int:pid>/uwerte")
    def uwerte(pid):
        return mit(pid, lambda c, wer: jsonify(projekt(c, pid)))
