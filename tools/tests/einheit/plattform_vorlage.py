"""Rechentests Blockvorlagen (bpcore/vorlage.py): Felder wachsen, was darunter liegt, rückt nach; leere Felder fallen weg;
langer Text bricht über Seiten um; Bilder werden nie geteilt; Spaltenköpfe oben auf der Seite."""
import io

from lib import gleich, pruefe

from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import Image, SimpleDocTemplate

from bpcore import layout, vorlage as VL

S = {"schrift": {"n": "Helvetica", "b": "Helvetica-Bold", "i": "Helvetica-Oblique"}, "ink": colors.black, "mute": colors.grey,
     "linie": colors.lightgrey, "band": colors.whitesmoke, "kopf": True}
V = layout.VORLAGEN["lv"]["position"]["std"]


def _teile(b, w=170 * mm):
    b.wrap(w, 10 ** 6)
    return b._teile


def test_wachsen_und_wegfallen():
    kurz = _teile(VL.block(V, {"oz": "01.0010", "kurz": "Kurz", "menge": "1", "eh": "St", "art": "Pauschal"}, S))
    lang = _teile(VL.block(V, {"oz": "01.0010", "kurz": "Kurz", "lang": "Zeile\n" * 12, "menge": "1", "eh": "St", "art": "Pauschal"}, S))
    y = lambda T, t: next(x["y"] for x in T if getattr(x["f"], "text", "") == t)   # noqa: E731
    pruefe(y(kurz, "Pauschal") < 8 * mm, "ohne Langtext rückt die Art nach oben (leeres Feld fällt weg)")
    pruefe(y(lang, "Pauschal") > y(kurz, "Pauschal") + 30 * mm, "langer Langtext schiebt die Art nach unten")
    gleich(y(lang, "1"), y(kurz, "1"), "Menge daneben bleibt oben stehen")


def test_umbruch_ohne_bilder_zu_teilen():
    b = VL.block(V, {"oz": "1", "kurz": "Kurz", "lang": "\n".join(f"Zeile {i}" for i in range(80)), "fotos": []}, S)
    b.wrap(170 * mm, 120 * mm)
    T = b.split(170 * mm, 120 * mm)
    gleich(len(T), 2, "langer Text: zwei Teile")
    pruefe(T[1].fortsetzung, "zweiter Teil ist Fortsetzung")
    from PIL import Image as PI
    o = io.BytesIO(); PI.new("RGB", (300, 400), (90, 120, 160)).save(o, "JPEG")
    bild = Image(io.BytesIO(o.getvalue()), width=40 * mm, height=55 * mm)
    b2 = VL.block(V, {"oz": "2", "kurz": "Kurz", "fotos": [bild]}, S)
    _, h = b2.wrap(170 * mm, 30 * mm)
    T2 = b2.split(170 * mm, 30 * mm)
    pruefe(len(T2) == 2 and any(t["f"] is bild for t in T2[1]._teile), "Foto passt nicht mehr: ganz auf die nächste Seite, nicht geteilt")


def test_pdf_mit_kopf():
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, leftMargin=20 * mm, rightMargin=20 * mm)
    story = [VL.block(V, {"oz": f"01.{i:04d}", "kurz": f"Position {i}", "lang": "Text " * 60, "menge": "3", "eh": "m²", "ep": "1,00", "gp": "3,00 €"}, S, erster=i == 0) for i in range(40)]
    doc.build(story)
    pruefe(buf.getvalue().startswith(b"%PDF") and len(buf.getvalue()) > 5000, "PDF mit vielen Positionen über mehrere Seiten")
    gleich([s[2] for s in VL.spalten(V)], ["OZ", "Leistung", "Menge", "EH", "EP", "GP"], "Spaltenköpfe aus der Vorlage")
