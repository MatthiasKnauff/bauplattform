"""Excel-Kostenberechnung einlesen (Mock „Excel-Kostenberechnung“ XL-0 … XL-8 A, 23.11.2026): eigener Leser für alte .xls (bpcore/xls.py),
.xlsx über openpyxl, DIN 276:2008 → 2018, Einzelbeträge aus „=1200+800,5“, Befunde (falsche Zeile in der Formel, nicht in der Summe,
441 → 444, Lücken), Rechnung im Kostenstand mit KG 700 fest. Testdaten erfunden; die .xls entsteht beim Test (einheit/xls_fiktiv.py) – keine .xls im Repo."""
import io

import openpyxl

import baukosten
import baukosten_excel as E
from bpcore import xls
from lib import gleich, pruefe
from einheit.xls_fiktiv import kosten as _xls   # tools/tests liegt im Suchpfad (einheit/run.py)



def _xlsx():
    wb = openpyxl.Workbook(); w = wb.active
    w.append(["Nr.", "Bezeichnung", "brutto", "", "netto"])
    for kg, n, c, e in [(300, "Bauwerk – Baukonstruktionen", None, None), (311, "Baugrubenherstellung", "=E3*1.19", "=1200+800.5"),
                        (324, "Unterböden und Bodenplatten", "=E4*1.19", 5000), (331, "Tragende Außenwände", "=E6*1.19", 20000),
                        (441, "Hoch- und Mittelspannungsanlagen", "=E6*1.19", 3000), (735, "Tragwerksplanung", "=E7*1.19", 4000)]:
        w.append([kg, n, c, None, e])
    w["B9"] = "Summe"; w["C9"] = "=SUM(C3:C6)"
    b = io.BytesIO(); wb.save(b)
    return b.getvalue()


def _pruefen(x, wo):
    Z = [(z["kg"], z["kg_alt"], z["betrag"]) for z in x["zeilen"]]
    gleich(Z, [("311", "311", 1200.0), ("311", "311", 800.5), ("322", "324", 5000.0), ("331", "331", 20000.0), ("441", "441", 3000.0), ("741", "735", 4000.0)], f"{wo}: Zeilen")
    gleich(x["summe"], 34000.5, f"{wo}: Summe")
    B = {(b["art"], b["kg"]) for b in x["befunde"]}
    for soll in [("umgesetzt", "322"), ("umgesetzt", "741"), ("rechenfehler", "331"), ("rechenfehler", "741"), ("pruefen", "441"), ("luecke", "391")]:
        pruefe(soll in B, f"{wo}: Befund {soll} fehlt – {sorted(B)}")
    pruefe(next(b for b in x["befunde"] if b["art"] == "pruefen")["nach"] == "444", f"{wo}: Vorschlag 441 → 444")
    pruefe("322" in x["liste"] and "391" not in x["liste"], f"{wo}: Liste der Kostengruppen")


def test_xls_und_xlsx():
    roh = _xls()
    Z = xls.zellen(roh)
    gleich(Z[(5, 3)][1], "=E6*1.19", "xls: Formel als Text")
    gleich(Z[(3, 5)][1], "=1200+800.5", "xls: Zahlenformel")
    gleich(Z[(9, 3)][1], "=SUM(C3:C6)", "xls: Summe")
    _pruefen(E.lesen("kosten_fiktiv.xls", roh), "xls")
    _pruefen(E.lesen("kosten_fiktiv.xlsx", _xlsx()), "xlsx")
    for name, roh in (("x.xls", b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\0" * 600), ("x.pdf", b"%PDF-1.4"), ("x.xlsx", b"PK\3\4kaputt")):
        try:
            E.lesen(name, roh); pruefe(False, f"{name}: kaputte Datei ohne Meldung")
        except ValueError as e:
            pruefe(str(e), f"{name}: Meldung")


def test_im_kostenstand():
    x = E.sauber({**E.lesen("kosten_fiktiv.xls", _xls()), "zeilen": [*E.lesen("kosten_fiktiv.xls", _xls())["zeilen"], {"kg": "abc", "betrag": 1}]})
    gleich(len(x["zeilen"]), 6, "sauber: unbekannte KG weg")
    d = baukosten.clean_data({**baukosten.default_data(), "excel": x, "risiko": 0, "nk_fest": 4000})
    c = baukosten.calc(d)
    gleich(c["kg300"], 27000.5, "KG 300 aus Excel")
    gleich(c["kg400"], 3000.0, "KG 400 aus Excel")
    gleich(c["nk"], 4000.0, "KG 700 fest, nicht doppelt")
    gleich(c["total"], 34000.5, "Summe wie die Liste")
    d2 = baukosten.clean_data({**d, "preise": {"xl:1": 1500}})
    gleich(baukosten.calc(d2)["kg300"], 27300.5, "Betrag überschreiben über Preise")


def test_bearbeiten_behaelt_kennungen():
    """Bearbeiten (23.11.2026): Kennungen bleiben (Preise von Hand hängen daran), neue oder doppelte bekommen eine freie."""
    x = E.sauber({"zeilen": [{"id": "xl:1", "kg": "331", "betrag": 5}, {"id": "xl:7", "kg": "334", "betrag": 2}, {"kg": "323", "betrag": 1},
                             {"id": "xl:7", "kg": "335", "betrag": 3}]})
    gleich([z["id"] for z in x["zeilen"]], ["xl:1", "xl:7", "xl:3", "xl:4"], "Kennungen")
