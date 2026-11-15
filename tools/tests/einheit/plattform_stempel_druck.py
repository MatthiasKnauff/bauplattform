"""Stempeln auf jeder Druckseite (bpcore/stempel_druck.py, 15.11.2026): Vorschlag auf der letzten Seite, gemerkte Lage gilt,
Stempel landet wirklich im PDF (eine Seite mehr Inhalt, gleiche Seitenzahl). Ohne Datenbank, mit einem gemalten Stempelbild."""
import io

from lib import gleich, pruefe


def _pdf(n):
    from reportlab.pdfgen import canvas
    b = io.BytesIO(); c = canvas.Canvas(b)
    for i in range(n):
        c.drawString(72, 720, f"Seite {i + 1}"); c.showPage()
    c.save(); return b.getvalue()


def _png():
    from PIL import Image
    b = io.BytesIO(); Image.new("RGBA", (260, 100), (30, 60, 160, 255)).save(b, "PNG"); return b.getvalue()


def test_vorschlag_letzte_seite():
    from bpcore import stempel_druck as SD
    v = SD.vorschlag(3)
    gleich({o["art"] for o in v}, {"buero", "sig"}, "Bürostempel und Unterschrift vorgeschlagen")
    pruefe(all(o["s"] == 2 and o["teil"] == "doc" for o in v), "auf der letzten Seite")
    pruefe(all(0 <= o["x"] <= 1 - o["w"] and 0 <= o["y"] <= 1 - o["h"] for o in v), "innerhalb der Seite")


def test_stempel_im_pdf():
    from bpcore import stempel_druck as SD, stempel_paket as SP
    pdf = _pdf(2)
    out = SP.anwenden(pdf, SD.vorschlag(2), {"doc": 0}, lambda art: _png() if art == "buero" else None)
    gleich(SP.seiten(out), 2, "Seitenzahl bleibt")
    pruefe(len(out) > len(pdf), "Stempel eingesetzt")
    weg = [{**o, "weg": True} for o in SD.vorschlag(2)]
    gleich(SP.anwenden(pdf, weg, {"doc": 0}, lambda art: _png()), pdf, "gelöschte Stempel: PDF unverändert")
