"""Dämmdicke frei wählen (GO 17.11.2026, D1 E1 F1).

In jeder Dämmschicht der Bauteil-Vorlagen (Schichtname mit „dämm“ oder „WDVS“) wählt man den Dämmstoff (Familie der Optionen, z. B.
„WDVS EPS“) und die Dicke getrennt: 10–20 cm in 2-cm-Schritten oder eine eigene Dicke von 2 bis 40 cm (halbe cm). Eine Bauteilzeile hält
die eigene Dicke in dicken = {Schicht-Nr: cm}, nur wenn sie von der Option abweicht.

Preis (F1): Für jede Position der Option mit Dicke im Text („d = 16 cm“, „16 cm“, „40 mm“) holt preis() die Geschwister derselben Position
(gleicher Code bis zur letzten Stelle, z. B. 023.04.001.*) und rechnet zwischen den beiden nächsten Dicken um – darunter oder darüber
fortgeschrieben und als „geschätzt“ markiert. Texte fürs LV: die Dicke im Kurz- und Langtext ersetzt (text()).
"""
import re

SCHICHT = re.compile(r"dämm|wdvs", re.I)
STOFF = re.compile(r"dämm|wdvs|\bEPS|\bXPS|\bPIR|\bPUR|resol|mineralwolle|steinwolle|glaswolle|holzfaser|schaumglas|zellulose|perimeter|wls\s*0", re.I)
_D = re.compile(r"(?:d\s*=\s*|dicke\s+)?(\d+(?:[.,]\d+)?)\s*(cm|mm)\b", re.I)
LISTE = [10, 12, 14, 16, 18, 20]
MIN, MAX = 2.0, 40.0


def dicke_cm(text):
    m = _D.search(str(text or ""))
    if not m:
        return None
    v = float(m.group(1).replace(",", "."))
    return round(v / 10 if m.group(2).lower() == "mm" else v, 2)


def norm(v):
    """Dicke in cm, auf halbe cm gerundet, 2–40 – sonst None."""
    try:
        x = float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return None
    x = round(x * 2) / 2
    return x if MIN <= x <= MAX else None


def sauber(v):
    out = {}
    for k, x in list((v if isinstance(v, dict) else {}).items())[:12]:
        d = norm(x)
        if str(k).isdigit() and d is not None:
            out[str(int(k))] = d
    return out


def familie(k):
    """„WDVS EPS 16“ → „WDVS EPS“ (Dämmstoff ohne Dicke)."""
    return re.sub(r"\s+", " ", re.sub(r"(?<![\w,])\d+(?:,\d+)?(?![\w,])|\b(cm|mm)\b", "", str(k or ""))).strip(" ,+-×") or str(k or "")


def _positionen(c, codes):
    codes = sorted({x for x in codes if x})
    if not codes:
        return {}
    return {r["code"]: r.dict() for r in c.execute(f"SELECT code, kurz FROM pdb_position WHERE katalog='gk3' AND code IN ({','.join('?' * len(codes))})", codes).fetchall()}


def optionen(c, schichten):
    """Je Dämmschicht der Vorlage: {Schicht-Nr: {Options-Nr: (Familie, Dicke cm, Code der Dämmposition)}} – Dicke aus dem Text der Dämmposition."""
    codes = [t[0] for s in schichten if SCHICHT.search(s.get("name") or "") for o in s.get("optionen") or [] for t in o.get("teile") or []]
    P = _positionen(c, codes)
    out = {}
    for i, s in enumerate(schichten):
        if not SCHICHT.search(s.get("name") or ""):
            continue
        x = {}
        for j, o in enumerate(s.get("optionen") or []):
            T = [t[0] for t in o.get("teile") or [] if t[0] in P and dicke_cm(P[t[0]]["kurz"])]
            T = [t for t in T if STOFF.search(P[t]["kurz"])] or T   # die Dämmung selbst, nicht die Unterkonstruktion („bis 160 mm“)
            if T:
                x[j] = (familie(o.get("k")), dicke_cm(P[T[0]]["kurz"]), T[0])
        if x:
            out[i] = x
    return out


def preis(c, code, d, f=1.0):
    """Preis einer Position bei Dicke d (cm) aus ihren Geschwistern → {ep_von, ep_mittel, ep_bis, geschaetzt} oder None (Position ohne Dicke)."""
    r = c.execute("SELECT code, kurz FROM pdb_position WHERE katalog='gk3' AND code=?", (code,)).fetchone()
    if not r or not dicke_cm(r["kurz"]) or "." not in code:
        return None
    pre = code[:code.rfind(".") + 1]
    pk = {}
    for x in c.execute("SELECT code, kurz, ep_von, ep_mittel, ep_bis FROM pdb_position WHERE katalog='gk3' AND code LIKE ? AND aktiv=1", (pre + "%",)).fetchall():
        t = dicke_cm(x["kurz"])
        if t and t not in pk and re.sub(r"[\d,.]+\s*(cm|mm)", "", x["kurz"]) == re.sub(r"[\d,.]+\s*(cm|mm)", "", r["kurz"]):
            pk[t] = x
    pts = sorted(pk.items())
    if not pts:
        return None
    if len(pts) == 1 or d in pk:
        p = pk.get(d) or pts[0][1]
        return {k: round((p[k] or 0) * f, 2) for k in ("ep_von", "ep_mittel", "ep_bis")} | {"geschaetzt": d not in pk}
    lo = [x for x in pts if x[0] <= d]
    hi = [x for x in pts if x[0] >= d]
    if lo and hi:
        (a, pa), (b, pb), ges = lo[-1], hi[0], False
    elif hi:
        (a, pa), (b, pb), ges = pts[0], pts[1], True
    else:
        (a, pa), (b, pb), ges = pts[-2], pts[-1], True
    q = (d - a) / (b - a)
    return {k: round(max(0.0, ((pa[k] or 0) + ((pb[k] or 0) - (pa[k] or 0)) * q)) * f, 2) for k in ("ep_von", "ep_mittel", "ep_bis")} | {"geschaetzt": ges}


def _zahl(d):
    return (f"{float(d):g}").replace(".", ",")


def text(t, d):
    """Erste Dickenangabe im Text durch d (cm) ersetzen – in der Einheit des Texts."""
    def rep(m):
        if m.group(2).lower() == "mm":
            return m.group(0).replace(m.group(1), _zahl(d * 10), 1)
        return m.group(0).replace(m.group(1), _zahl(d), 1)
    return _D.sub(rep, str(t or ""), count=1)


def kurz(k, d):
    """Optionskürzel „WDVS EPS 16“ mit eigener Dicke → „WDVS EPS 15 cm“."""
    return f"{familie(k)} {_zahl(d)} cm"
