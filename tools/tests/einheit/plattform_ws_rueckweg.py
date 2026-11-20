"""A1 (Mock „Rückweg Außenwand“, 20.11.2026): ändert der Wärmeschutz die Dicke einer Schicht, die aus dem Aufbau im Gebäudemodell kam,
steht sie sofort an der Zeile der Bauteilliste; der Nachweis bekommt keinen Hinweis an sich selbst (sig). Linie nur Modell → App: nichts."""
from lib import gleich, pruefe
import waermeschutz_modell as W
from bpcore import bauteilliste, huelle, modell, uwert

ZID = "331|Wand|Kalksandstein 17,5 cm|0.31|m²||neu"


def _lauf(richtung="beide", ws_umgedreht=False, alt_mw=12, neu_mw=16, extra=False):
    M = {"bauteilliste": {"zeilen": [{"id": ZID, "vorlage": "v1", "wahl": [0, 0, 0], "dicken": {}, "ausf": {}}]}}
    geschrieben = []
    alt = (modell.links, modell.lesen, modell.schreiben, uwert.schichten_vorlage, bauteilliste.setzen, huelle.huelle)
    modell.links = lambda c, pid: [{"app": "waermeschutz", "zustand": "lebendig", "richtung": richtung}]
    modell.lesen = lambda c, pid: {"modell": M}
    modell.schreiben = lambda c, pid, m, wer: geschrieben.append(m)
    uwert.schichten_vorlage = lambda c, auf: [{"si": 0, "n": "Putz", "d": 1.5, "m": "putz_kalk"}, {"si": 1, "n": "KS", "d": 17.5, "m": "ks_1800"},
                                              {"si": 2, "n": "WDVS", "d": (auf.get("d") or {}).get("2", 12), "m": "mw_035"}]

    def setzen(c, L, zid, neu):
        z = next(x for x in L["zeilen"] if x["id"] == zid)
        z["dicken"] = dict(neu["dicken"])
        return z
    bauteilliste.setzen = setzen
    huelle.huelle = lambda c, pid: {"bauteile": [{"ref": "bk:0:" + ZID, "sig": "neu123"}]}
    try:
        S = [{"m": "putz_kalk", "d": 1.5}, {"m": "ks_1800", "d": 17.5}, {"m": "mw_035", "d": alt_mw}]
        N = [dict(s) for s in S]
        N[2]["d"] = neu_mw
        if extra:
            N.append({"m": "putz_kalk", "d": 1})
        if ws_umgedreht:
            S, N = S[::-1], N[::-1]
        a = [{"id": "aw1", "ref": "bk:7:" + ZID, "schichten": S, "sig": "alt"}]
        b = [{"id": "aw1", "kurz": "AW1", "ref": "bk:7:" + ZID, "schichten": N, "sig": "alt"}]
        out = W.ins_modell(None, 5, a, b, "test")
        return out, geschrieben, M, b[0]
    finally:
        modell.links, modell.lesen, modell.schreiben, uwert.schichten_vorlage, bauteilliste.setzen, huelle.huelle = alt


def test_dicke_ins_modell():
    out, geschrieben, M, b = _lauf()
    gleich(M["bauteilliste"]["zeilen"][0]["dicken"], {"2": 16}, "eigene Dicke an der Schicht der Vorlage")
    pruefe(len(geschrieben) == 1 and "12 → 16 cm" in out[0], f"Modell geschrieben, Text: {out}")
    gleich(b["sig"], "neu123", "kein Hinweis „Aufbau geändert“ an den Nachweis selbst")


def test_innen_aussen_umgedreht():
    out, geschrieben, M, _ = _lauf(ws_umgedreht=True)
    gleich(M["bauteilliste"]["zeilen"][0]["dicken"], {"2": 16}, "Nachweis führt die Schichten andersherum – dieselbe Schicht")


def test_nicht_zurueck():
    out, geschrieben, _, _ = _lauf(richtung="zur_app")
    pruefe(not out and not geschrieben, "Linie nur Modell → App: nichts ins Modell")
    out, geschrieben, _, _ = _lauf(extra=True)
    pruefe(not geschrieben and "passen nicht" in out[0], f"andere Schichten: nicht geändert, mit Grund ({out})")
    out, geschrieben, _, _ = _lauf(neu_mw=12)
    pruefe(not out and not geschrieben, "nichts geändert: nichts geschrieben")
