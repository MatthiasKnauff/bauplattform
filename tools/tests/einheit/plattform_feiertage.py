"""Feiertage je Bundesland (bpcore/feiertage.py) und Büroinfos ohne Eintrag (bpcore/buero.py)."""
from bpcore import feiertage as FT
from lib import gleich, pruefe


def test_bundesweit_und_laender():
    gleich(FT.ostern(2026).isoformat(), "2026-04-05", "Ostersonntag 2026")
    de = FT.tage(2026, "DE")
    gleich(len(de), 9, "neun bundesweite Feiertage")
    pruefe("2026-06-04" not in de, "Fronleichnam nicht bundesweit")
    gleich(FT.name("2026-06-04", "NW"), "Fronleichnam", "Fronleichnam NRW")
    gleich(FT.name("2026-11-01", "BY"), "Allerheiligen", "Allerheiligen Bayern")
    gleich(FT.name("2026-10-31", "NI"), "Reformationstag", "Reformationstag Niedersachsen")
    gleich(FT.name("2026-10-31", "NW"), "", "kein Reformationstag in NRW")
    gleich(FT.name("2026-11-18", "SN"), "Buß- und Bettag", "Buß- und Bettag Sachsen 2026")
    gleich(FT.name("2026-03-08", "BE"), "Internationaler Frauentag", "Frauentag Berlin")
    gleich(FT.name("2026-08-15", "SL"), "Mariä Himmelfahrt", "Mariä Himmelfahrt Saarland")
    gleich(FT.name("2026-09-20", "TH"), "Weltkindertag", "Weltkindertag Thüringen")
    gleich(FT.tage(2026, ""), {}, "ohne Land keine Feiertage")


def test_zeiten_nimmt_das_land():
    from bpcore import zeiten as Z
    P = {**Z.PERSON, "soll_woche": 40.0, "tage": "01234", "land": "NW"}
    gleich(Z.soll_min(P, "2026-06-04"), 0, "Fronleichnam frei in NRW")
    gleich(Z.soll_min({**P, "land": "NI"}, "2026-06-04"), 480, "Fronleichnam Arbeitstag in Niedersachsen")
