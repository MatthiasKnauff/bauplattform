"""Textergänzungen im Langtext (bpcore/textergaenzung.py, Mock „Bietertextergänzungen nach GAEB“ BT-A1 B1 C1 D1, 18.11.2026):
Felder lesen, Druck (Punktlinie, „oder gleichwertig“), leere Büro-Angaben, Verzeichnis, Prüfung der Antworten und die Rundreise durch GAEB."""
from bpcore import gaeb, textergaenzung as TE

LANG = "Türblatt 885 × 2010 mm.\n[[Büro: Farbe = weiß RAL 9016]], [[Büro: Zarge]]\n[[Bieter: Fabrikat | Hörmann BaseLine]]\n[[Bieter: Dämmstoff, Hersteller / Typ]]"
LV = {"nr": "1", "name": "Türen", "items": [{"typ": "titel", "oz": "01", "lvl": 1, "kurz": "Türen"},
                                            {"typ": "pos", "id": "p1", "oz": "01.0010", "kurz": "Innentür", "lang": LANG, "menge": 3, "einheit": "St", "art": "N"}]}


def test_felder_und_druck():
    F = TE.felder(LANG)
    assert [(f["art"], f["frage"], f["wert"], f["vorschlag"]) for f in F] == [("buero", "Farbe", "weiß RAL 9016", ""), ("buero", "Zarge", "", ""),
                                                                              ("bieter", "Fabrikat", "", "Hörmann BaseLine"), ("bieter", "Dämmstoff, Hersteller / Typ", "", "")]
    d = TE.druck_text(LANG)
    assert "Farbe: weiß RAL 9016" in d and "Zarge: " + TE.PUNKTE in d and "Fabrikat: Hörmann BaseLine oder gleichwertig – " + TE.PUNKTE in d and "[[" not in d, d
    assert "Fabrikat: Prüm KF" in TE.druck_text(LANG, ["Prüm KF"]), "Antwort im Auftrag statt Punktlinie"
    assert TE.fehlende_buero(LV["items"]) == [("01.0010", "Zarge")]
    assert [v[2] for v in TE.verzeichnis(LV["items"])] == ["Fabrikat", "Dämmstoff, Hersteller / Typ"]
    P = TE.pruefen(LV["items"], {"p1": ["", ""]})
    assert [p["status"] for p in P] == ["vorschlag", "fehlt"], P


def test_gaeb_rundreise():
    x = gaeb.schreiben(LV, "83")
    assert b'TextComplement Kind="Owner"' in x and b'TextComplement Kind="Bidder"' in x
    p = [i for i in gaeb.lesen(x)["items"] if i["typ"] == "pos"][0]
    assert p["lang"] == LANG and not p.get("bte"), p
    p = [i for i in gaeb.lesen(gaeb.schreiben(LV, "84", preise={"p1": 100}, antworten={"p1": ["Prüm KF", "Isover Integra"]}))["items"] if i["typ"] == "pos"][0]
    assert p["lang"] == LANG and p["bte"] == ["Prüm KF", "Isover Integra"], p
