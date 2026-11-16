"""Kleine Umwandlungen – einmal für alle Apps (vorher wortgleiche Kopien in mehreren Modulen). Ohne Abhängigkeiten.

zahl(x)        – Zahl aus Text mit Komma oder Punkt; None, wenn es keine ist
zahl_oder(v,d) – wie zahl, leer/kaputt → d
ids(v)         – Liste ganzer Zahlen aus einer JSON-Spalte
de(iso)        – ISO-Datum als TT.MM.JJJJ
eur(v)         – 1.234,56 €
hm(m)          – Minuten als hh:mm
latin(t)       – Text für Formularfelder, die nur Latin-1 können
falt(s)        – klein, Umlaute aufgelöst (Vergleichen und Suchen)
kurz(v, n)     – Leerraum zusammengefasst, höchstens n Zeichen
oz_teile(t)    – Ordnungszahl als Tupel ohne führende Nullen („01.0020“ → („1“, „20“))
adresse(r)     – „Straße, PLZ Ort“ aus einer Zeile mit street/zip/city
"""
import re
from datetime import datetime

from .jsonwert import lies


def zahl(x):
    try:
        v = float(str(x).replace(",", "."))
        return v if v == v else None
    except (TypeError, ValueError):
        return None


def zahl_oder(v, d=0.0):
    try:
        return float(str(v).replace(",", ".")) if v not in (None, "") else d
    except (TypeError, ValueError):
        return d


def ids(v):
    try:
        return [int(x) for x in lies(v, [])]
    except (TypeError, ValueError):
        return []


def de(iso):
    try:
        return datetime.fromisoformat(iso).strftime("%d.%m.%Y")
    except (TypeError, ValueError):
        return iso or ""


def eur(v):
    return f"{v:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")


def hm(m):
    return f"{int(m) // 60:02d}:{int(m) % 60:02d}"


def latin(t):
    t = str(t or "").translate({0x2013: "-", 0x2014: "-", 0x201E: '"', 0x201C: '"', 0x201D: '"', 0x2018: "'", 0x2019: "'", 0x2026: "...", 0x20AC: "EUR"})
    return t.encode("latin-1", "replace").decode("latin-1")


def falt(s):
    return (s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")


def kurz(v, n):
    return re.sub(r"\s+", " ", str(v if v is not None else "")).strip()[:n]


def oz_teile(t):
    return tuple(p.lstrip("0") or "0" for p in re.split(r"\D+", t or "") if p)


def adresse(r):
    return ", ".join(x for x in (r["street"], " ".join(y for y in (r["zip"], r["city"]) if y)) if x)
