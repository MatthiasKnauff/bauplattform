"""Briefbogen je Druck-Layout (19.11.2026): im PDF unterlegen (Vorgabe) · Druck auf Briefpapier · ohne – layout.bogen() und pruefen()."""
import base64

from bpcore import layout
from lib import gleich


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
