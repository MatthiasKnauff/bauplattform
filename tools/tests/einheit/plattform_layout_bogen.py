"""Briefbogen je Druck-Layout (19.11.2026): im PDF unterlegen (Vorgabe) · Druck auf Briefpapier · ohne – layout.bogen() und pruefen()."""
import base64

from bpcore import layout
from lib import gleich, pruefe


class _C:   # nur bp_store „briefbogen“
    def __init__(self, daten):
        self.d = daten

    def execute(self, sql, *a):
        d = self.d

        class R:
            def fetchone(self_):
                return {"data": base64.b64encode(d).decode()} if d else None
        return R()


def test_modus_und_pruefen():
    gleich(layout.bogen_modus({}), "unterlegen", "Vorgabe: unterlegen")
    gleich(layout.pruefen({"bogen": "papier"}).get("bogen"), "papier", "Briefpapier bleibt gespeichert")
    gleich(layout.pruefen({"bogen": "unterlegen"}).get("bogen"), None, "Vorgabe wird nicht gespeichert")
    gleich(layout.pruefen({"bogen": "quatsch"}).get("bogen"), None, "unbekannter Wert fällt weg")


def test_bogen():
    c, leer = _C(b"%PDF-bogen"), _C(None)
    gleich(layout.bogen(c, {}), (b"%PDF-bogen", True, b"%PDF-bogen"), "unterlegen: PDF darunter, Logo/Fußzeile weg")
    gleich(layout.bogen(c, {"bogen": "papier"}), (None, True, b"%PDF-bogen"), "Briefpapier: nichts unterlegt, Platz frei, Ränder vom Briefbogen")
    gleich(layout.bogen(c, {"bogen": "ohne"}), (None, False, None), "ohne: Logo und Fußzeile aus dem Layout")
    gleich(layout.bogen(leer, {}), (None, False, None), "kein Briefbogen hinterlegt: wie ohne")
    gleich(layout.bogen(leer, {"bogen": "papier"}), (None, True, None), "Briefpapier ohne hinterlegten Bogen: trotzdem Platz frei")


class _Cv:   # zeichnet nichts, merkt sich die Texte
    def __init__(self):
        self.t = []

    def __getattr__(self, k):
        if k in ("drawString", "drawRightString", "drawCentredString"):
            return lambda x, y, s: self.t.append(s)
        return lambda *a, **kw: None


def test_fusszeile_nur_seitenzahl():
    """Briefbogen/Briefpapier im Hintergrund (19.11.2026): keine Fußzeile, nur die Seitenzahl – ohne Briefbogen bleibt alles."""
    from reportlab.lib.pagesizes import A4
    lay = layout.pruefen(layout.standard("kosten"), "kosten")
    W = {"buero": "GK3", "projekt": "A1", "lv": "LV", "datum": "19.11.2026", "seite": "2", "dokument": "Titel"}
    F = {"n": "Helvetica", "b": "Helvetica-Bold"}
    mit, ohne = _Cv(), _Cv()
    layout.zeichnen(mit, lay, W, 2, A4[1], F, True)
    layout.zeichnen(ohne, lay, W, 2, A4[1], F, False)
    gleich(mit.t, ["Seite 2"], "mit Briefbogen nur die Seitenzahl")
    pruefe(any("GK3" in x for x in ohne.t) and any("19.11.2026" in x for x in ohne.t), f"ohne Briefbogen Fußzeile wie bisher: {ohne.t}")


def test_honorar_layouts():
    """Honorarangebot (Brief) und Architektenvertrag (Seiten mit Fußzeile) haben eigene Druck-Layouts (19.11.2026)."""
    pruefe("honorarangebot" in layout.BEREICHE and "honorarvertrag" in layout.BEREICHE, "beide Ausdrucke im Editor")
    b = layout.standard("honorarangebot")
    pruefe(any(e["typ"] == "feld" and e["feld"] == "Empfaenger" for e in b["elemente"]), "Angebot als Brief mit Anschrift")
    v = layout.standard("honorarvertrag")
    x, y1, y2, w, u = layout.rahmen(v)
    pruefe(y1 >= 45 and y2 < y1, f"Vertrag: Seite 1 unter dem Briefkopf ({y1} mm), Folgeseiten höher ({y2} mm)")
    pruefe(any("{seite}" in (e.get("text") or "") and e["seiten"] == "alle" for e in v["elemente"]), "Seitenzahl auf allen Seiten")
