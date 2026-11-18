"""U-Werte an den Bauteilen (bpcore/uwert.py, GO 18.11.2026 UW-A1 B1 C1 D1): Baustoff fest aus dem Text der Ausführung, Dicke hinter dem Baustoff,
Gefach bei Zwischensparren/Holzrahmen, Kern-Zeile mit Ergänzungen (Innenputz, WDVS, Dachbelag) – ohne Datenbank."""
from lib import gleich

from bpcore import uwert as U


def test_baustoff_aus_dem_text():
    gleich(U.baustoff("WDVS EPS 032, 16 cm")[0::3], ("eps_035", 0.032), "EPS mit λ aus dem Text")
    gleich(U.baustoff("Kalksand-Plansteine d = 17,5 cm")[0], "ks_1800", "KS")
    gleich(U.baustoff("Planziegel wärmedämmend d = 36,5 cm, λ = 0,08")[0::3], ("hlz_daemm_10", 0.08), "Wärmedämmziegel mit λ")
    gleich(U.baustoff("Zwischensparrendämmung Mineralwolle 035, 160 mm")[0::3], ("mw_035", 0.035), "Mineralwolle")
    gleich(U.baustoff("Aufsparrendämmung PIR kaschiert 023, 140 mm")[0::3], ("pur_026", 0.023), "PIR")
    gleich(U.baustoff("Tondachziegel Falzziegel naturrot")[0], None, "Deckung zählt nicht")


def test_dicke():
    t = "Sauberkeitsschicht 5 cm, XPS 10 cm lastabtragend"
    gleich(U.dicke_cm(t, t.index("XPS"))[0], 10.0, "Dicke hinter dem Baustoff")
    gleich(U.dicke_cm("Holzrahmenwand Ständer 60/160 mm, gedämmt"), (16.0, 6.0), "Gefachtiefe und Ständerbreite")
    gleich(U.dicke_cm("Gipsputz 10 mm Q2"), (1.0, None), "mm → cm")


V = {"name": "AW Mauerwerk + WDVS", "schichten": [
    {"name": "Tragschicht", "optionen": [{"k": "KS 17,5", "t": "Kalksand-Plansteine d = 17,5 cm", "teile": [["a", 1]]}]},
    {"name": "Wärmedämmung außen", "optionen": [{"k": "WDVS EPS 16", "t": "WDVS EPS 032, 16 cm", "teile": [["b", 1]]}]},
    {"name": "Innenseite", "optionen": [{"k": "Gipsputz", "t": "Gipsputz 10 mm Q2, Dispersionsanstrich", "teile": [["c", 1]]}, {"k": "", "t": "ohne Innenbekleidung", "teile": []}]},
    {"name": "Brandschutz", "optionen": [{"k": "Brandriegel", "t": "Brandriegel Mineralwolle je Geschoss", "teile": [["d", 1]]}]},
    {"name": "Sonder", "optionen": [{"k": "CaSi 50", "t": "Calciumsilikatplatte kapillaraktiv 50 mm", "teile": [["e", 1]]}]}]}


def test_schichten_vorlage():
    S = U.schichten_vorlage(None, {"w": [0, 0, 0, 0, 0], "d": {"1": 20}}, V)
    gleich([(s["m"], s["d"], s.get("lam")) for s in S if not s.get("fehlt")], [("ks_1800", 17.5, None), ("eps_035", 20, 0.032), ("putz_kalkgips", 1.0, None)],
           "eigene Dämmdicke 20 cm, Brandriegel zählt nicht")
    gleich([s["n"] for s in S if s.get("fehlt")], ["Sonder CaSi 50"], "unbekannter Baustoff mit Dicke → fehlt (C1)")
    gleich(len(U.schichten_vorlage(None, {"w": [0, 0, 1, 0, 0]}, V)), 3, "„ohne Innenbekleidung“ fällt weg")


def test_art_und_gruppe():
    gleich(U.art({"kg": "331", "name": "Außenwand EG"}), ("wand", "kern"), "Außenwand")
    gleich(U.art({"kg": "331", "name": "Kellerwand"}, "Kellerwand WU-Beton"), ("erdwand", "kern"), "Kellerwand")
    gleich(U.art({"kg": "363", "name": "Dach"}, "Flachdach Warmdach Bitumen"), ("flachdach", "aussen"), "Dachbelag")
    gleich(U.art({"kg": "334", "name": "Haustür"}), ("tuer", "kern"), "Tür")
    gleich(U.art({"kg": "341", "name": "Innenwand"}), (None, None), "Innenwand: kein Hüllbauteil")
    sp = [{"n": "Sparren", "m": "holz_nadel", "d": 20, "sparren": 10, "seite": 1}]
    ds = [{"n": "ZSD", "m": "mw_035", "d": 20, "m2": "holz_nadel", "breite": 8, "abstand": 75, "seite": 1}]
    gk = [{"n": "GK", "m": "gkb", "d": 1.25, "seite": 0}]
    S = U.zusammen(sp, gk, ds)
    gleich([(s["n"], s.get("breite")) for s in S], [("GK", None), ("ZSD", 10)], "Sparren wird Holzanteil der Zwischensparrendämmung, innen zuerst")
