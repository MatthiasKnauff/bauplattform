"""Stempel und Unterschrift im PDF-Paket der Rechnungsfreigabe: vorgesehene Stellen finden, gemerkte Lage gilt, Einsetzen auf die richtige Seite."""
import io

from bpcore import stempel_paket as SP
from lib import gleich, pruefe


def _pdf(seiten):
    from reportlab.pdfgen import canvas
    b = io.BytesIO(); c = canvas.Canvas(b)
    for zeilen in seiten:
        for k, (x, y, t) in enumerate(zeilen):
            c.drawString(x, y, t)
        c.showPage()
    c.save(); return b.getvalue()


def _png():
    from PIL import Image
    im = Image.new("RGBA", (60, 30), (20, 40, 160, 255)); b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()


def test_vorgesehene_stellen():
    fr = _pdf([[(60, 200, "Ort, Datum"), (230, 200, "Bauleitung / Objektüberwachung")]])
    re_ = _pdf([[(60, 500, "Pos. 1 Abdichtung"), (300, 300, "Rechnungsbetrag 4.783,80 EUR")], [(60, 700, "Seite 2")]])
    V = SP.vorschlag([{"teil": "freigabe", "pdf": fr, "n": 1}, {"teil": "rechnung:7", "pdf": re_, "n": 2}], "4.783,80")
    by = {o["id"]: o for o in V}
    sig = by["freigabe-sig"]
    pruefe(abs(sig["x"] - 230 / 595.3) < 0.02 and sig["y"] < 1 - 200 / 841.9, f"Unterschrift über „Bauleitung“: {sig}")
    z = by["rechnung:7-zahlbetrag"]
    gleich(z["s"], 0, "Zahlbetrag auf Seite 1 der Rechnung")
    pruefe(abs(z["y"] - (1 - 300 / 841.9)) < 0.03, f"Zahlbetrag direkt unter dem Rechnungsbetrag: {z}")
    gleich({o["art"] for o in V if o["teil"] == "rechnung:7"}, {"buero", "pruef", "zahlbetrag", "sig"}, "auf der Rechnung der Firma alle vier")


def test_lage_und_einsetzen():
    gemerkt = SP.bereinigen([{"id": "a", "art": "buero", "teil": "rechnung:7", "s": 1, "x": 0.1, "y": 0.1, "w": 0.3, "h": 0.1},
                             {"id": "b", "art": "pruef", "teil": "freigabe", "s": 0, "x": 2, "y": 0.5, "w": 0.2, "h": 0.2, "weg": True}, {"art": "boese"}])
    gleich([(o["id"], o["x"], o["weg"]) for o in gemerkt], [("a", 0.1, False), ("b", 1.0, True)], "unbekannte Art weg, Zahlen begrenzt")
    neu = SP.zusammenfuehren(gemerkt, [{"id": "x", "teil": "aufmass", "art": "pruef"}, {"id": "y", "teil": "freigabe", "art": "sig"}])
    gleich([o["id"] for o in neu], ["a", "b", "x"], "gemerkte Teile bleiben, neuer Teil bekommt den Vorschlag")
    paket = _pdf([[(60, 700, "Freigabe")], [(60, 700, "Rechnung S1")], [(60, 700, "Rechnung S2")]])
    aus = SP.anwenden(paket, gemerkt, {"freigabe": 0, "rechnung:7": 1}, lambda art: _png())
    from pypdf import PdfReader
    P = PdfReader(io.BytesIO(aus)).pages
    gleich(len(P), 3, "Seitenzahl bleibt")
    pruefe("/XObject" in str(P[2].get("/Resources", {})) and "/XObject" not in str(P[0].get("/Resources", {})),
           "Bürostempel auf Seite 2 der Rechnung (Paketseite 3), gelöschter Prüfstempel nicht auf der Freigabe")
