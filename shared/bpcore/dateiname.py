"""Dateinamen wie im Zielordner – für „Datei ablegen“ in allen Apps.

Aus vorhandenen Dateinamen (oder einem von Hand getippten Namen) wird ein Muster mit Platzhaltern:
  {datum:iso|de|de2|kompakt|kurz}  Datum (2026-11-12 · 12.11.2026 · 12.11.26 · 20261112 · 261112)
  {projektnr}  Projektkürzel (A481)          {firma}  Firmenname (ohne GmbH & Co. erkannt)
  {nr}         Rechnungs-/Belegnummer        {lfd}    laufende Nummer (z. B. „3.“ in „3. AR“) – die nächste freie
Beispiel: „A481 Häser 2. AR 2026-10-05.pdf“ → „{projektnr} {firma} {lfd}. AR {datum:iso}“ → „A481 Häser 3. AR 2026-11-12.pdf“.
"""
import re
from collections import Counter
from datetime import date

FORM = re.compile(r"\b(gmbh|co|kg|ag|ug|mbh|gbr|ohg|e\.?\s?k|inh|haftungsbeschränkt)\b\.?|&", re.I)
DATEN = (   # (Format, Muster, aus ISO)
    ("iso", r"(?<!\d)(20\d\d)-(\d\d)-(\d\d)(?!\d)", lambda y, m, d: f"{y}-{m}-{d}"),
    ("de", r"(?<!\d)(\d\d)\.(\d\d)\.(20\d\d)(?!\d)", lambda y, m, d: f"{d}.{m}.{y}"),
    ("de2", r"(?<!\d)(\d\d)\.(\d\d)\.(\d\d)(?!\d)", lambda y, m, d: f"{d}.{m}.{y[2:]}"),
    ("kompakt", r"(?<!\d)(20\d\d)(\d\d)(\d\d)(?!\d)", lambda y, m, d: f"{y}{m}{d}"),
    ("kurz", r"(?<!\d)(\d\d)(\d\d)(\d\d)(?!\d)", lambda y, m, d: f"{y[2:]}{m}{d}"),
)
PH = re.compile(r"\{(datum:\w+|projektnr|firma(?:\|[^}]*)?|nr|lfd(?::\d)?)\}")   # {firma|Häser}: so schreibt das Büro die Firma


def _fold(s):
    s = (s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r"[^a-z0-9]+", "", s)


def _stamm(name):
    s, p, e = (name or "").rpartition(".")
    return (s, e.lower()) if p and 1 <= len(e) <= 5 else (name or "", "")


def _ausserhalb(s, rx, ersatz, nur_eins=True):
    """rx nur außerhalb schon gesetzter Platzhalter ersetzen."""
    teile = re.split(r"(\{[^}]*\})", s)
    for i, t in enumerate(teile):
        if t.startswith("{"):
            continue
        neu, n = re.subn(rx, ersatz, t, count=1 if nur_eins else 0)
        if n:
            teile[i] = neu
            if nur_eins:
                break
    return "".join(teile)


def muster(name, werte):
    """Muster aus einem Dateinamen; None, wenn nichts Veränderliches darin steckt."""
    s, _ = _stamm(name)
    for fmt, rx, _f in DATEN:
        if re.search(rx, s):
            s = _ausserhalb(s, rx, "{datum:%s}" % fmt)
            break
    nr = (werte.get("nr") or "").strip()
    if len(nr) >= 2 and nr in s:
        s = s.replace(nr, "{nr}", 1)
    else:   # „Nr. RE-1100“ – die Nummer eines anderen Belegs
        s = _ausserhalb(s, r"(?i)(\bnr\.?\s*)(?!\{)[A-Za-z0-9][\w\-/]*", r"\1{nr}")
    pn = (werte.get("projektnr") or "").strip()
    if pn:
        s = _ausserhalb(s, re.compile(r"(?<![A-Za-z0-9])" + re.escape(pn) + r"(?![A-Za-z0-9])", re.I), "{projektnr}")
    worte = {_fold(w) for w in re.split(r"[\s_.,\-]+", FORM.sub(" ", werte.get("firma") or "")) if len(_fold(w)) >= 3}
    if worte:   # längste Folge von Wörtern der Firma (mit GmbH, & Co. dazwischen) → {firma}
        tok = re.split(r"([\s_]+)", s)
        best, i = None, 0
        while i < len(tok):
            if not tok[i].startswith("{") and _fold(tok[i]) in worte:
                j = i
                k = i + 2
                while k < len(tok) and (_fold(tok[k]) in worte or FORM.fullmatch(tok[k].strip()) or tok[k] in ("&", "Co.", "Co")):
                    j = k
                    k += 2
                if not best or j - i > best[1] - best[0]:
                    best = (i, j)
                i = j + 2
            else:
                i += 1
        if best:
            kurz = re.sub(r"[{}|]", "", "".join(tok[best[0]:best[1] + 1]))
            s = "".join(tok[:best[0]]) + "{firma|%s}" % kurz + "".join(tok[best[1] + 1:])
    s = _ausserhalb(s, r"(?<![\d{])(\d{1,3})(?!\d)", lambda mm: "{lfd:%d}" % len(mm.group(1)) if mm.group(1).startswith("0") and len(mm.group(1)) > 1 else "{lfd}")
    return s if PH.search(s) else None


def _regex(m, wert=None):
    """Muster → Regex, um aus vorhandenen Namen die laufende Nummer zu lesen (Firma und Projekt wie jetzt – je Firma zählen)."""
    out = ""
    for t in re.split(r"(\{[^}]*\})", m):
        if t.startswith("{lfd"):
            out += r"(?P<lfd>\d{1,3})"
        elif wert and (t.startswith("{firma") or t == "{projektnr}"):
            v = wert(PH.match(t))
            out += re.escape(v) if v else r".*?"
        elif t.startswith("{"):
            out += r".*?"
        else:
            out += re.escape(t)
    return re.compile("^" + out + r"(?: \(\d+\))?$", re.I)


def fuellen(m, werte, vorhandene=(), endung="pdf"):
    """Muster mit den Werten füllen; {lfd} = höchste vorhandene + 1. Fehlende Werte fallen samt Trenner weg."""
    d = (werte.get("datum") or "")[:10]
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", d):
        d = date.today().isoformat()
    y, mo, ta = d.split("-")
    lfd = 0
    unter = "_" in m and " " not in PH.sub("", m)

    def wert(mm):
        k = mm.group(1)
        if k.startswith("datum:"):
            f = dict((a, c) for a, _b, c in DATEN).get(k[6:])
            return f(y, mo, ta) if f else d
        if k.startswith("firma|"):   # die kurze Schreibweise aus dem Ordner, wenn sie zur Firma passt
            kurz, voll = k[6:], werte.get("firma") or ""
            fw = {_fold(w) for w in re.split(r"[\s_.,\-]+", FORM.sub(" ", voll)) if len(_fold(w)) >= 3}
            kw = {_fold(w) for w in re.split(r"[\s_.,\-]+", FORM.sub(" ", kurz)) if len(_fold(w)) >= 3}
            k = "firma"
            if kw and kw <= fw:
                return kurz
        if k.startswith("lfd:"):
            return str(lfd + 1).zfill(int(k[4:]))
        v = {"projektnr": werte.get("projektnr"), "firma": werte.get("firma"), "nr": werte.get("nr"), "lfd": str(lfd + 1)}.get(k) or ""
        v = re.sub(r'[\\/:*?"<>|]+', "-", str(v)).strip()
        return v.replace(" ", "_") if unter else v
    rx = _regex(m, wert)
    for n in vorhandene:
        x = rx.match(_stamm(n)[0])
        if x and x.groupdict().get("lfd"):
            lfd = max(lfd, int(x.group("lfd")))
    if not (werte.get("nr") or "").strip():   # „Nr.“ ohne Nummer weg
        m = re.sub(r"(?i)\bnr\.?[ _]*\{nr\}", "", m)
    s = PH.sub(wert, m)
    s = re.sub(r"([ _]){2,}", r"\1", s).strip(" _-–.")
    return (s[:150].rstrip(" .") + "." + (endung or "pdf")) if s else None


def aus_ordner(dateien, werte, endung="pdf"):
    """Name wie die übrigen Dateien im Ordner (das häufigste Muster der neuesten zehn); None ohne passende Dateien."""
    eig = sorted((x for x in dateien if not x.get("dir") and _stamm(x["name"])[1] == endung), key=lambda x: -(x.get("mtime") or 0))[:10]
    ms = [m for m in (muster(x["name"], werte) for x in eig) if m]
    if not ms:
        return None, None
    zahl = Counter(ms)
    best = max(ms, key=lambda m: (zahl[m], -ms.index(m)))
    if werte.get("firma") and "{firma" not in best and zahl[best] < 2:   # z. B. „Angebot Müller Bau“ für Schulz – fremde Firma steckt im Namen
        return None, None
    return best, fuellen(best, werte, [x["name"] for x in dateien], endung)
