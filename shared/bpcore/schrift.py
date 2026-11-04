"""Schrift für Briefe und Ausdrucke (Einstellung „Schrift der Briefe“, settings co_font).

lato      – Lato (SIL Open Font License, liegt in bpcore/fonts), passt zu vielen Briefbögen
helvetica – Helvetica (in jedem PDF-Betrachter vorhanden)
Gibt die Namen für reportlab zurück: {"n": normal, "b": fett, "i": kursiv}.
"""
import os

_DIR = os.path.join(os.path.dirname(__file__), "fonts")
_OK = {}
HELV = {"n": "Helvetica", "b": "Helvetica-Bold", "i": "Helvetica-Oblique"}
WAHL = (("lato", "Lato (modern, wie viele Briefbögen)"), ("helvetica", "Helvetica / Arial"))


def registrieren(art="lato"):
    if art != "lato":
        return HELV
    if "lato" not in _OK:
        try:
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            from reportlab.lib.fonts import addMapping
            for nm, f in (("Lato", "Lato-Regular.ttf"), ("Lato-Bold", "Lato-Bold.ttf"), ("Lato-Italic", "Lato-Italic.ttf")):
                pdfmetrics.registerFont(TTFont(nm, os.path.join(_DIR, f)))
            addMapping("Lato", 0, 0, "Lato"); addMapping("Lato", 1, 0, "Lato-Bold"); addMapping("Lato", 0, 1, "Lato-Italic"); addMapping("Lato", 1, 1, "Lato-Bold")
            _OK["lato"] = {"n": "Lato", "b": "Lato-Bold", "i": "Lato-Italic"}
        except Exception as e:   # Schrift fehlt → Helvetica
            print("Schrift Lato nicht verfügbar:", e, flush=True)
            _OK["lato"] = HELV
    return _OK["lato"]


def fuer(c):
    """Schrift laut Einstellung des Büros (Vorgabe: Lato)."""
    try:
        r = c.execute("SELECT value FROM settings WHERE key='co_font'").fetchone()
        art = (r["value"] if r else "") or "lato"
    except Exception:
        art = "lato"
    return registrieren(art)
