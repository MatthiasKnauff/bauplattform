"""Projektordner nach einem Muster prüfen und angleichen (Verwaltung → Projektordner, nur Administratoren).

Muster ist die Projektvorlage auf dem Dateiserver („A0 Projektvorlage LEER“: Ordner „A000 1. Leistungsphasen 1-4“ …)
oder ein gut sortierter Projektordner. Das Kürzel des Musters („A000“) steht für das Kürzel des jeweiligen Projekts.

Reine Logik ohne Dateiserver: Bäume sind verschachtelte dicts {name: {"dir": bool, "kinder": {...}, "groesse": n}}.
vergleichen() liefert Schritte; jeder Schritt hat eine feste id (aus Art und Pfad), damit beim Ausführen nur Schritte
laufen, die eine frische Prüfung auf dem Server wieder genauso findet – nie ein frei übergebener Pfad.

Schritte (alle Pfade als Liste von Namen relativ zum Projektordner):
  umbenennen  – Ordner/Datei passt zum Muster, heißt aber anders (anderes Kürzel, Schreibweise)      vorgewählt
  anlegen     – Ordner des Musters fehlt                                                             vorgewählt
  kopieren    – Datei des Musters (z. B. „A000 Adressdatei.xlsx“) fehlt                              nicht vorgewählt
  aufloesen   – zusätzlicher Unterordner: Inhalt eine Ebene höher, Ordner weg                         nicht vorgewählt
  verschieben – Ordner, der laut Muster an eine andere Stelle gehört (z. B. „A483 Rechnungsprüfung“ oben statt
                unter „4. Durchführung“): dorthin verschieben, gibt es ihn dort schon, wird der Inhalt zusammengeführt   nicht vorgewählt
"""
import difflib
import hashlib
import re
from collections import Counter

CODE = re.compile(r"^[A-Za-z]+\d+(?:\.\d+)*")
UNWICHTIG = re.compile(r"^(thumbs\.db|desktop\.ini|\.ds_store|~\$.*|\._.*)$", re.I)
BILD = re.compile(r"\.(jpe?g|png|heic|heif|gif|tiff?|bmp|webp|mov|mp4)$", re.I)   # Fotos und Videos behalten ihre Namen
PLATZHALTER = re.compile(r"^(gewerk|firma|beispiel|muster|name)\s*\d*$", re.I)   # „A000 Gewerk 1“: hier stehen später frei benannte Ordner


def kuerzel(name):
    m = CODE.match((name or "").strip())
    return m.group(0) if m else ""


def stamm(name):
    """Name ohne führendes Kürzel: „A483 4. Durchführung“ → „4. Durchführung“."""
    n = (name or "").strip()
    k = kuerzel(n)
    return n[len(k):].strip(" ._-") if k else n


def schluessel(name):
    """Vergleichsform: ohne Kürzel, klein, Umlaute ausgeschrieben, nur Buchstaben und Ziffern."""
    s = stamm(name).lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r"[^a-z0-9]", "", s)


def nummer(name):
    """Gliederungsnummer am Anfang („4. Durchführung“ → „4“), sonst None."""
    m = re.match(r"(\d+)\s*[.)]", stamm(name))
    return m.group(1) if m else None


def muster_kuerzel(baum):
    """Kürzel des Musters: das häufigste Kürzel in den Namen der ersten Ebene (Vorlage: „A000“)."""
    c = Counter(kuerzel(n) for n in baum if kuerzel(n))
    return c.most_common(1)[0][0] if c else ""


def soll_name(name, mk, code):
    """Name im Projekt: Kürzel des Musters durch das des Projekts ersetzen („A000 Fotos“ → „A483 Fotos“)."""
    if mk and kuerzel(name) == mk:
        return code + name.strip()[len(mk):]
    return name


def platzhalter(name):
    return bool(PLATZHALTER.match(stamm(name)))


def unwichtig(name):
    return bool(UNWICHTIG.match(name or ""))


def _partner(m_name, kandidaten, schon):
    """Passender Eintrag im Projekt zu einem Eintrag des Musters: gleiche Vergleichsform, sonst gleiche Gliederungsnummer
    (nur wenn eindeutig), sonst sehr ähnlicher Name."""
    frei = [k for k in kandidaten if k not in schon]
    s = schluessel(m_name)
    for k in frei:
        if schluessel(k) == s:
            return k
    n = nummer(m_name)
    if n:
        gl = [k for k in frei if nummer(k) == n]
        if len(gl) == 1:
            return gl[0]
    best, wert = None, 0.0
    for k in frei:
        r = difflib.SequenceMatcher(None, s, schluessel(k)).ratio()
        if r > wert:
            best, wert = k, r
    return best if wert >= 0.82 else None


def sid(art, pfad, neu=""):
    return hashlib.sha1(("|".join([art, *pfad, neu])).encode()).hexdigest()[:12]


def index(muster, mk, code, pfad=(), out=None):
    """Ordner des Musters nach Vergleichsform → Pfad im Projekt (Namen mit dem Kürzel des Projekts); mehrdeutige fallen weg."""
    out = {} if out is None else out
    for n, m in muster.items():
        if not m["dir"] or platzhalter(n) or unwichtig(n):
            continue
        p = list(pfad) + [soll_name(n, mk, code)]
        k = schluessel(n)
        if k:
            out[k] = None if k in out else p
        index(m.get("kinder", {}), mk, code, p, out)
    return out


def vergleichen(muster, ist, code, mk=None, pfad=None, schritte=None, tiefe=0, idx=None):
    """Muster- und Projektbaum vergleichen → Liste von Schritten (siehe oben)."""
    mk = muster_kuerzel(muster) if mk is None else mk
    idx = index(muster, mk, code) if idx is None else idx
    pfad = pfad or []
    schritte = [] if schritte is None else schritte
    schon = set()
    frei_benannt = [n for n, m in muster.items() if m["dir"] and platzhalter(n)]   # z. B. Rechnungsprüfung: je Firma ein Ordner
    gegliedert = any(m["dir"] for m in muster.values())   # gibt das Muster hier Unterordner vor? (sonst – z. B. Fotos – ist alles frei)
    for m_name, m in sorted(muster.items(), key=lambda x: (not x[1]["dir"], x[0].lower())):
        if unwichtig(m_name) or (m["dir"] and platzhalter(m_name)):
            continue
        soll = soll_name(m_name, mk, code)
        kand = [k for k, v in ist.items() if v["dir"] == m["dir"] and not unwichtig(k)]
        p = _partner(m_name, kand, schon) if ist is not None else None
        if p:
            schon.add(p)
            if p != soll:
                schritte.append({"id": sid("umbenennen", pfad + [p], soll), "art": "umbenennen", "pfad": pfad + [p], "neu": soll,
                                 "dir": m["dir"], "vor": True})
            if m["dir"]:
                vergleichen(m.get("kinder", {}), ist[p].get("kinder", {}), code, mk, pfad + [p], schritte, tiefe + 1, idx)
        elif m["dir"]:
            schritte.append({"id": sid("anlegen", pfad + [soll]), "art": "anlegen", "pfad": pfad + [soll], "dir": True, "vor": True})
            _neu_anlegen(m.get("kinder", {}), mk, code, pfad + [soll], schritte)
        else:
            schritte.append({"id": sid("kopieren", pfad + [soll]), "art": "kopieren", "pfad": pfad + [soll], "dir": False, "vor": False,
                             "quelle": m.get("quelle")})
    for k, v in sorted((ist or {}).items()):
        if k in schon or unwichtig(k):
            continue
        if v["dir"] and frei_benannt:   # frei benannter Ordner (statt „Gewerk 1“): nur das Kürzel davor, wie im Muster
            if mk and kuerzel(frei_benannt[0]) == mk and kuerzel(k) != code:
                neu = code + " " + stamm(k)
                schritte.append({"id": sid("umbenennen", pfad + [k], neu), "art": "umbenennen", "pfad": pfad + [k], "neu": neu, "dir": True, "vor": True})
        elif v["dir"] and idx.get(schluessel(k)) and idx[schluessel(k)][:-1] != pfad:   # gehört laut Muster an eine andere Stelle
            schritte.append({"id": sid("verschieben", pfad + [k], "/".join(idx[schluessel(k)])), "art": "verschieben", "pfad": pfad + [k],
                             "ziel": idx[schluessel(k)], "dir": True, "vor": False, "inhalt": len(v.get("kinder", {}))})
        elif v["dir"] and pfad and gegliedert:   # zusätzlicher Unterordner, wo das Muster Unterordner vorgibt (auf der ersten Ebene nie)
            schritte.append({"id": sid("aufloesen", pfad + [k]), "art": "aufloesen", "pfad": pfad + [k], "dir": True, "vor": False,
                             "inhalt": len(v.get("kinder", {}))})
        elif not v["dir"] and mk and kuerzel(k) == mk and code != mk:   # aus der Vorlage kopiert, Kürzel nie angepasst
            neu = soll_name(k, mk, code)
            schritte.append({"id": sid("umbenennen", pfad + [k], neu), "art": "umbenennen", "pfad": pfad + [k], "neu": neu, "dir": False, "vor": True})
        elif not v["dir"] and code and kuerzel(k) and kuerzel(k) != code:   # Datei mit dem Kürzel eines anderen Projekts (z. B. „A480 Statik.pdf“ in A481)
            neu = code + k.strip()[len(kuerzel(k)):]
            schritte.append({"id": sid("umbenennen", pfad + [k], neu), "art": "umbenennen", "pfad": pfad + [k], "neu": neu, "dir": False, "vor": False,
                             "grund": f"Datei mit fremdem Kürzel {kuerzel(k)}"})
        elif not v["dir"] and code and not kuerzel(k) and pfad and not BILD.search(k) and not any("foto" in x.lower() for x in pfad):   # Datei ohne Projektkürzel – Kürzel davor (nicht vorgewählt; Fotos bleiben frei)
            neu = f"{code} {k.strip()}"
            schritte.append({"id": sid("umbenennen", pfad + [k], neu), "art": "umbenennen", "pfad": pfad + [k], "neu": neu, "dir": False, "vor": False,
                             "grund": "Datei ohne Projektkürzel"})
    return schritte


def _neu_anlegen(muster, mk, code, pfad, schritte):
    for m_name, m in sorted(muster.items()):
        if unwichtig(m_name) or (m["dir"] and platzhalter(m_name)):
            continue
        soll = soll_name(m_name, mk, code)
        if m["dir"]:
            schritte.append({"id": sid("anlegen", pfad + [soll]), "art": "anlegen", "pfad": pfad + [soll], "dir": True, "vor": True})
            _neu_anlegen(m.get("kinder", {}), mk, code, pfad + [soll], schritte)
        else:
            schritte.append({"id": sid("kopieren", pfad + [soll]), "art": "kopieren", "pfad": pfad + [soll], "dir": False, "vor": False,
                             "quelle": m.get("quelle")})


def umgerechnet(pfad, umbenannt):
    """Pfad (alte Namen) nach den Umbenennungen: umbenannt = {tuple(alter Pfad): neuer Name}."""
    out = list(pfad)
    for i in range(len(out)):
        neu = umbenannt.get(tuple(pfad[:i + 1]))
        if neu:
            out[i] = neu
    return out


def reihenfolge(schritte):
    """Ausführungsreihenfolge: Umbenennen (tiefste zuerst, alte Pfade), Auflösen, Anlegen, Kopieren."""
    rang = {"umbenennen": 0, "aufloesen": 1, "verschieben": 2, "anlegen": 3, "kopieren": 4}
    return sorted(schritte, key=lambda s: (rang[s["art"]], -len(s["pfad"]) if rang[s["art"]] < 3 else len(s["pfad"])))


def frei(name, vorhanden):
    """Freier Name im Zielordner: „Plan.pdf“ → „Plan (2).pdf“ …"""
    if name not in vorhanden:
        return name
    st, dot, ext = name.rpartition(".")
    if not dot or "/" in ext or len(ext) > 6:
        st, ext, dot = name, "", ""
    n = 2
    while f"{st} ({n}){dot}{ext}" in vorhanden:
        n += 1
    return f"{st} ({n}){dot}{ext}"
