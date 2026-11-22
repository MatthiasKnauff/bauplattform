"""Jede Schicht gleich: Material · Stärke · Ausführung (GO 18.11.2026, Mock „Schicht: Material, Stärke, Ausführung“: MA-A1 B1 C1).

Die Optionen einer Schicht der Bauteil-Vorlagen mischen heute Material und Dicke („KS 17,5“, „KS 24“, „Hlz 24“, „PP4 24“). Hier wird jede
Option in drei Angaben zerlegt – Material (fester Name aus MATERIAL, sonst wie bisher der Dämmstoff ohne Zahl), Stärke in cm (aus dem Text der
Position, „d = 17,5 cm“, „15 mm“; bei Spannen „16–18 cm“ die Zahl der Option) und Ausführung (Betongüte, Rohdichteklasse, WLS …, nach dem Muster
des Materials aus dem Text). A1: gilt für alle Schichten, deren Material erkannt wird, und wie bisher für jede Dämmschicht.

Eine Bauteilzeile wählt weiter eine Option (wahl) – die mit gleichem Material, gleicher Ausführung und der nächsten Stärke. Abweichungen stehen
in der Zeile: dicken = {Schicht: cm} (C1, eigene Stärke – Preis zwischen den Nachbardicken umgerechnet, daemmdicke.preis) und
ausf = {Schicht: Wert} (B1, Ausführung aus der festen Liste oder vom Büro eingetragen – Text der Positionen mit dem neuen Wert, Preis bleibt).
Vom Büro eingetragene Ausführungen merkt sich der Kern (bp_store „schicht:ausf“) und bietet sie wieder an.
"""
import json
import re

from . import daemmdicke as DD

# Material: (Erkennung im Text der Option/Position, Name, Ausführung: Bezeichnung, Muster im Text, feste Werte, übliche Stärken in cm)
MATERIAL = [
    (r"kalksand|\bKS\b(?!-)", "Kalksandstein", "Rohdichte", r"RDK\s*\d,\d", ["RDK 1,6", "RDK 1,8", "RDK 2,0", "RDK 2,2"], [11.5, 15, 17.5, 20, 24, 30]),
    (r"porenbeton|gasbeton|\bPP\s?\d", "Porenbeton", "Festigkeit/Rohdichte", r"PP\d-0,\d\d", ["PP2-0,35", "PP4-0,55", "PP6-0,65"], [11.5, 17.5, 24, 30, 36.5]),
    (r"(?<!dach)(?<!ton)(?<!glas)(?<![a-zäöü])(?:plan|hochloch)?ziegel(?!.*eindeck)|\bhlz\b", "Ziegel", "Füllung", r"\b(?:un)?gefüllt\b", ["ungefüllt", "gefüllt"], [11.5, 17.5, 24, 30, 36.5, 42.5]),
    (r"stahlbeton|\bstb\b|ortbeton|elementwand|beton\s*c\d|\bC\d{2}/\d{2}", "Stahlbeton", "Betongüte", r"\bC\d{2}/\d{2}\b", ["C20/25", "C25/30", "C30/37", "C35/45"], [16, 18, 20, 22, 25, 30]),
    (r"\bEPS\b|polystyrol", "EPS", "WLS", r"(?<![\d,.])0[234]\d(?!\d|,\d)", ["031", "032", "035", "040"], DD.LISTE),
    (r"\bXPS\b", "XPS", "WLS", r"(?<![\d,.])0[234]\d(?!\d|,\d)", ["027", "030", "035"], DD.LISTE),
    (r"mineralwolle|steinwolle|glaswolle|\bMW\b", "Mineralwolle", "WLS", r"(?<![\d,.])0[234]\d(?!\d|,\d)", ["032", "035", "040"], DD.LISTE),
    (r"holzfaser|\bHF\b", "Holzfaser", "WLS", r"(?<![\d,.])0[34]\d(?!\d|,\d)", ["038", "040", "045"], DD.LISTE),
    (r"\bPIR\b|\bPUR\b", "PIR/PUR", "WLS", r"(?<![\d,.])02\d(?!\d|,\d)", ["022", "023", "024", "026"], DD.LISTE),
    (r"kalk-?gips", "Kalk-Gipsputz", "", "", [], [1, 1.5, 2]),
    (r"gipsputz|\bgips\b(?!karton|platte|faser)", "Gipsputz", "Oberfläche", r"\bQ[1-4]\b", ["Q2", "Q3", "Q4"], [1, 1.5, 2]),
    (r"kalkzement|\bKZ\b", "Kalkzementputz", "Mörtel", r"\bCS\s?I{1,3}V?\b", ["CS II", "CS III"], [1, 1.5, 2]),
    (r"kalkputz|\bkalk\s?\d|\bCL\b", "Kalkputz", "", "", [], [1, 1.5, 2]),
    (r"lehmputz|\blehm\b", "Lehmputz", "", "", [], [1.5, 2, 3]),
    (r"zementestrich|\bCT\b", "Zementestrich", "Festigkeit", r"\bC\d{2}-F\d\b", ["C20-F4", "C25-F4", "C30-F5"], [4.5, 5, 6, 6.5, 7]),
    (r"anhydrit|calciumsulfat|\bCA\b|fließestrich", "Calciumsulfatestrich", "Festigkeit", r"\bC\d{2}-F\d\b", ["C20-F4", "C25-F4", "C30-F5"], [3.5, 4, 4.5, 5]),
]
_MAT = [(re.compile(m[0], re.I), m) for m in MATERIAL]
DAEMMSTOFFE = {"EPS", "XPS", "Mineralwolle", "Holzfaser", "PIR/PUR"}   # in einer Dämmschicht zählt nur ein Dämmstoff als Material
_ZAHL = re.compile(r"(?<![\w,])(\d+(?:,\d+)?)(?![\w,])")
_SPANNE = re.compile(r"(\d+(?:[.,]\d+)?)\s*[–-]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b", re.I)
_DGLEICH = re.compile(r"\bd\s*=\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b", re.I)


def _f(x):
    return float(str(x).replace(",", "."))


def material(text):
    """Text der Option/Position → Eintrag aus MATERIAL oder None."""
    for rx, m in _MAT:
        if rx.search(str(text or "")):
            return m
    return None


def staerke(text, k=""):
    """Stärke in cm: „d = …“ vor jeder anderen Maßangabe; Spanne „16–18 cm“ → die Zahl der Option, wenn sie darin liegt."""
    t = str(text or "")
    kz = [_f(x) for x in _ZAHL.findall(str(k or ""))]
    m = _SPANNE.search(t)
    if m:
        f = 0.1 if m.group(3).lower() == "mm" else 1
        a, b = _f(m.group(1)) * f, _f(m.group(2)) * f
        x = next((z for z in kz if a <= z <= b), None)
        return round(x if x is not None else a, 2)
    m = _DGLEICH.search(t)
    if m:
        return round(_f(m.group(1)) / (10 if m.group(2).lower() == "mm" else 1), 2)
    return DD.dicke_cm(t)


def ausfuehrung(text, m):
    """Ausführung im Text nach dem Muster des Materials („C25/30“, „RDK 2,0“, „032“) oder ''."""
    if not m or not m[3]:
        return ""
    x = re.search(m[3], str(text or ""), re.I)
    return re.sub(r"\s+", " ", x.group(0)).strip() if x else ""


def _positionen(c, codes):
    codes = sorted({x for x in codes if x})
    if not codes:
        return {}
    return {r["code"]: r["kurz"] or "" for r in c.execute(f"SELECT code, kurz FROM pdb_position WHERE katalog='gk3' AND code IN ({','.join('?' * len(codes))})", codes).fetchall()}


def gelernt(c):
    """Vom Büro eingetragene Ausführungen je Bezeichnung (bp_store „schicht:ausf“)."""
    try:
        r = c.execute("SELECT data FROM bp_store WHERE key='schicht:ausf'").fetchone()
        G = json.loads(r["data"]) if r and r["data"] else {}
    except Exception:   # noqa: BLE001 – ohne Speicher nichts Gelerntes
        return {}
    return G if isinstance(G, dict) else {}


def lernen(c, bez, wert, wer=""):
    wert = re.sub(r"\s+", " ", str(wert or "")).strip()[:40]
    if not bez or not wert:
        return
    from . import konto
    G = gelernt(c)
    L = [x for x in G.get(bez) or [] if x != wert]
    G[bez] = ([wert] + L)[:30]
    konto._put(c, "schicht:ausf", json.dumps(G, ensure_ascii=False), wer)


def optionen(c, schichten):
    """Je Schicht mit erkanntem Material (oder Dämmschicht): {si: {"mats": {Material: {"ausf": Bezeichnung, "muster", "werte": [...],
    "staerken": [...]}}, "o": {oi: {"mat", "dicke", "ausf", "codes": [Positionen mit dieser Stärke im Text]}}}}. Optionen ohne Material oder
    ohne Stärke fehlen in "o" (bleiben eigene Knöpfe, z. B. „innen roh“)."""
    codes = [t[0] for s in schichten for o in s.get("optionen") or [] for t in o.get("teile") or []]
    P = _positionen(c, codes)
    G = gelernt(c)
    out = {}
    for si, s in enumerate(schichten):
        daemm = bool(DD.SCHICHT.search(s.get("name") or ""))
        X = {}
        for oi, o in enumerate(s.get("optionen") or []):
            T = [(t[0], P.get(t[0], "")) for t in o.get("teile") or []]
            if not T:
                continue
            txt = " ".join([o.get("k") or "", o.get("t") or ""] + [x for _, x in T])
            haupt = [x for x in T if staerke(x[1], o.get("k"))]
            if daemm:
                haupt = [x for x in haupt if DD.STOFF.search(x[1])] or haupt
            if daemm:   # Dämmschicht: das Material ist der Dämmstoff – nicht, was sonst in der Option steckt („SKS + XPS 10“: die Sauberkeitsschicht
                #         aus Beton C12/15 machte die Dämmung sonst zu „Stahlbeton“ mit Betongüte, 20.11.2026)
                stoff = next((x[1] for x in T if DD.STOFF.search(x[1])), "")
                m = material(stoff) or material(o.get("k") or "") or material(txt)
                if m and m[1] not in DAEMMSTOFFE:
                    m = None
            else:
                m = material(f"{o.get('k') or ''} {T[0][1]}") or material(txt)
            if not m and not daemm:
                continue
            d = staerke(haupt[0][1], o.get("k")) if haupt else None
            if d is None:
                kz = [_f(x) for x in _ZAHL.findall(o.get("k") or "")]
                d = kz[0] if kz and m and 1 <= kz[0] <= 60 else None
            if d is None:   # ohne Stärke keine Zerlegung („Sicht/Anstrich“) – eigener Knopf
                continue
            codes_d = [code for code, x in T if d and staerke(x, o.get("k")) and abs(staerke(x, o.get("k")) - d) < 0.01]
            X[oi] = {"mat": m[1] if m else DD.familie(o.get("k")), "dicke": d, "ausf": ausfuehrung(" ".join(x[1] for x in haupt) if daemm and haupt else txt, m), "codes": codes_d}
        seen = set()
        for oi in list(X):   # nicht unterscheidbar (gleiches Material, Stärke, Ausführung – „Gipsputz/Fliesen“ neben „Gipsputz beids.“): bleibt eigener Knopf
            key = (X[oi]["mat"], X[oi]["dicke"], X[oi]["ausf"])
            if key in seen:
                X.pop(oi)
            seen.add(key)
        if not X:
            continue
        M = {}   # je Material: Ausführung (Bezeichnung, Liste: fest + aus den Optionen + vom Büro), übliche Stärken
        for x in X.values():
            m = next((e for e in MATERIAL if e[1] == x["mat"]), None)
            e = M.setdefault(x["mat"], {"ausf": m[2] if m else "", "muster": m[3] if m else "", "werte": list(m[4]) if m else [], "staerken": list(m[5]) if m else list(DD.LISTE)})
            if x["ausf"] and x["ausf"] not in e["werte"]:
                e["werte"].append(x["ausf"])
            if x["dicke"] and x["dicke"] not in e["staerken"]:
                e["staerken"].append(x["dicke"])
        for e in M.values():
            e["werte"] = list(dict.fromkeys(e["werte"] + (G.get(e["ausf"]) or []))) if e["ausf"] else []
            e["staerken"].sort()
        out[si] = {"mats": M, "o": X}
    return out


def mat(O, si, oi):
    """(Option, Angaben ihres Materials) einer Schicht aus optionen() – (None, {}) ohne Zerlegung."""
    x = (O.get(si) or {}).get("o", {}).get(oi)
    return (x, O[si]["mats"].get(x["mat"]) or {}) if x else (None, {})


def ausf_sauber(v):
    out = {}
    for k, x in list((v if isinstance(v, dict) else {}).items())[:12]:
        x = re.sub(r"\s+", " ", str(x or "")).strip()[:40]
        if str(k).isdigit() and x:
            out[str(int(k))] = x
    return out


def text_ausf(t, alt, neu, muster=""):
    """Ausführung im Text tauschen: die alte (oder was dem Muster entspricht) durch die neue; fehlt sie, unverändert."""
    t = str(t or "")
    if not neu:
        return t
    if alt and alt in t:
        return t.replace(alt, neu, 1)
    if muster and re.search(muster, t, re.I):
        return re.sub(muster, neu, t, count=1, flags=re.I)
    return t


def kurz(k, mat, d=None, a=None):
    """Kurztext der Schicht mit eigener Stärke/Ausführung: „KS 17,5“ → „Kalksandstein 20 cm RDK 2,0“."""
    if d is None and not a:
        return k
    return " ".join(x for x in (mat or DD.familie(k), f"{DD._zahl(d)} cm" if d else "", a or "") if x)
