"""Ablauftests Zahlungen der Ausschreibung (AVA): vorangegangene Zahlungen ohne Rechnung hier (AZ, 18.11.2026) und vorige Rechnungen
beim Einstieg mitten im Projekt (VZ, 18.11.2026) – Hilfen aus test_ava.py."""
from lib import finde, gleich
from test_ava import A, ROHBAU, _lv


def test_vorangegangene_zahlungen(ctx):
    """AZ-A1 B1 C1 (18.11.2026): Zahlungen ohne Rechnung hier je Auftrag – brutto wie überwiesen, netto gerechnet; erst nach der Vergabe;
    ändern rechnet netto neu; Löschen; in der Rechnung als „bisherige Zahlungen“ (Rechenkern: einheit/plattform_abzuege.py)."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Zahlungen", ROHBAU)
        c.post(f"{A}/lv/{lv['id']}/zahlungen", {"brutto": 1190}, expect=400)   # noch nicht vergeben
        c.pj(f"{A}/lv/{lv['id']}/vergabe", {"frei": True, "bieter": "Zahl Bau", "summe": 20000, "einbehalt": 0})
        L = c.pj(f"{A}/lv/{lv['id']}/zahlungen", {"brutto": 1190, "datum": "2026-09-20", "art": "voraus", "bemerkung": "vor der Plattform"})
        z = L["vergabe"]["zahlungen"][0]
        gleich((z["netto"], z["brutto"], z["art"]), (1000.0, 1190.0, "voraus"), "netto aus brutto (B1)")
        gleich(L["calc"]["zahlungen_frei"]["summe"], 1000.0, "zählt in der Abrechnung")
        L = c.uj(f"{A}/lv/{lv['id']}/zahlungen/{z['id']}", {"brutto": 2380})
        gleich(L["vergabe"]["zahlungen"][0]["netto"], 2000.0, "brutto geändert → netto neu")
        L = c.uj(f"{A}/lv/{lv['id']}/zahlungen/{z['id']}", {"netto": 1990})
        gleich(L["vergabe"]["zahlungen"][0]["netto"], 1990.0, "netto von Hand änderbar")
        L = c.delete(f"{A}/lv/{lv['id']}/zahlungen/{z['id']}").json
        gleich(L["vergabe"]["zahlungen"], [], "gelöscht")
    finally:
        if lv:
            c.delete(f"{A}/lv/{lv['id']}", expect=None)


def test_vorige_rechnungen(ctx):
    """VZ-A1 B1 C1 D1 (18.11.2026): Einstieg bei der 4. Teilrechnung – drei vorige Rechnungen mit Auszahlungsbetrag eingetragen; die Rechnung
    hier zählt weiter (4.), ohne Aufmaß kumuliert zieht sie die bisherigen Zahlungen ab, einzeln nicht."""
    c = ctx.admin
    lv = None
    try:
        lv = _lv(c, ctx, "Vorige", ROHBAU)
        c.pj(f"{A}/lv/{lv['id']}/vergabe", {"frei": True, "bieter": "Vor Bau", "summe": 100000, "einbehalt": 0})
        L = c.pj(f"{A}/lv/{lv['id']}/rechnungen", {"art": "abschlag", "frei": 50000})
        r = L["rechnungen"][-1]
        gleich(r["nr"], 1, "ohne vorige Rechnungen: 1.")
        for k in range(3):
            L = c.pj(f"{A}/lv/{lv['id']}/zahlungen", {"brutto": 11900, "nr": f"R-{k + 1}", "art": "abschlag"})
        gleich(finde(L["rechnungen"], id=r["id"])["nr"], 4, "D1: zählt weiter – 4. Teilrechnung")
        L = c.uj(f"{A}/rechnungen/{r['id']}", {"kumuliert": True})
        k_ = finde(L["calc"]["rechnungen"], id=r["id"])
        gleich((k_["einzeln"], k_["vorher"]), (False, 30000.0), "B1: kumuliert – bisherige Zahlungen ab")
        L = c.uj(f"{A}/rechnungen/{r['id']}", {"kumuliert": False})
        k_ = finde(L["calc"]["rechnungen"], id=r["id"])
        gleich((k_["einzeln"], k_["vorher"]), (True, 0.0), "einzeln: nichts abgezogen")
        z = L["vergabe"]["zahlungen"][0]
        L = c.delete(f"{A}/lv/{lv['id']}/zahlungen/{z['id']}").json
        gleich(finde(L["rechnungen"], id=r["id"])["nr"], 3, "eine vorige weniger – 3.")
    finally:
        if lv:
            c.delete(f"{A}/lv/{lv['id']}", expect=None)
