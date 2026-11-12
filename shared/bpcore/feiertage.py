"""Gesetzliche Feiertage je Bundesland – eine Liste für alle Apps (Zeiten, Bauantrag, Dienste).

Das Bundesland des Büros steht in den Büroinfos der Verwaltung (Einstellung co_land, siehe bpcore.bueroinfo).
Der Bauzeitenplan rechnet im Browser mit denselben Regeln (gantt-kern.js, holidaysOf) – bei Änderungen beide anpassen.
"""
from datetime import date, timedelta

LAENDER = {"BW": "Baden-Württemberg", "BY": "Bayern", "BE": "Berlin", "BB": "Brandenburg", "HB": "Bremen", "HH": "Hamburg", "HE": "Hessen",
           "MV": "Mecklenburg-Vorpommern", "NI": "Niedersachsen", "NW": "Nordrhein-Westfalen", "RP": "Rheinland-Pfalz", "SL": "Saarland",
           "SN": "Sachsen", "ST": "Sachsen-Anhalt", "SH": "Schleswig-Holstein", "TH": "Thüringen"}
_cache = {}


def ostern(j):
    """Ostersonntag (Gaußsche Osterformel, gregorianisch)."""
    a, b, c = j % 19, j // 100, j % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l_ = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l_) // 451
    mo = (h + l_ - 7 * m + 114) // 31
    ta = ((h + l_ - 7 * m + 114) % 31) + 1
    return date(j, mo, ta)


def tage(j, land="DE"):
    """{ISO-Datum: Name} der gesetzlichen Feiertage im Jahr j; land = Kürzel (NW …), „DE“ = nur bundesweite, leer = keine."""
    if not land:
        return {}
    if (j, land) in _cache:
        return _cache[(j, land)]
    o, st = ostern(j), land
    t = lambda n: (o + timedelta(days=n)).isoformat()
    d = lambda m, dd: date(j, m, dd).isoformat()
    f = {d(1, 1): "Neujahr"}
    if st in ("BW", "BY", "ST"):
        f[d(1, 6)] = "Heilige Drei Könige"
    if (st == "BE" and j >= 2019) or (st == "MV" and j >= 2023):
        f[d(3, 8)] = "Internationaler Frauentag"
    f[t(-2)] = "Karfreitag"
    if st == "BB":
        f[t(0)] = "Ostersonntag"
    f[t(1)] = "Ostermontag"
    f[d(5, 1)] = "Tag der Arbeit"
    f[t(39)] = "Christi Himmelfahrt"
    if st == "BB":
        f[t(49)] = "Pfingstsonntag"
    f[t(50)] = "Pfingstmontag"
    if st in ("BW", "BY", "HE", "NW", "RP", "SL"):
        f[t(60)] = "Fronleichnam"
    if st == "SL":
        f[d(8, 15)] = "Mariä Himmelfahrt"
    if st == "TH" and j >= 2019:
        f[d(9, 20)] = "Weltkindertag"
    f[d(10, 3)] = "Tag der Deutschen Einheit"
    if st in ("BB", "HB", "HH", "MV", "NI", "SN", "ST", "SH", "TH") or j == 2017:
        f[d(10, 31)] = "Reformationstag"
    if st in ("BW", "BY", "NW", "RP", "SL"):
        f[d(11, 1)] = "Allerheiligen"
    if st == "SN":   # Mittwoch vor dem 23. November
        x = date(j, 11, 22)
        while x.weekday() != 2:
            x -= timedelta(days=1)
        f[x.isoformat()] = "Buß- und Bettag"
    f[d(12, 25)] = "1. Weihnachtstag"
    f[d(12, 26)] = "2. Weihnachtstag"
    _cache[(j, land)] = f
    return f


def name(tag, land="DE"):
    """Name des Feiertags an diesem Tag (ISO-Datum) oder ''."""
    return tage(int(str(tag)[:4]), land).get(str(tag)[:10], "")
