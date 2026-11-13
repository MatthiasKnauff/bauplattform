"""Wiki: Vergleich für Hinweise und Warnungen – zusammengesetzte Wörter („Kellerabdichtung“ ↔ „Abdichtung“), Füllwörter zählen nicht."""
from lib import gleich, pruefe

from bpcore import wiki as W


def test_punkte():
    Q = W._stark(["Kellerabdichtung KMB zweilagig liefern und einbauen"])
    pruefe("liefern" not in Q and "und" not in Q, "Füllwörter weg")
    pruefe(W._punkte(Q, W._worte("Kellerwand: Abdichtung an der Bodenplatte undicht")) >= 2, "Abdichtung steckt in Kellerabdichtung")
    gleich(W._punkte(Q, W._worte("Riss im Putz Wohnzimmer")), 0, "nichts Gemeinsames")
    gleich(W._punkte(W._stark(["Fenster"]), W._worte("Fenster klemmt")), 2, "gleiches Wort")
    gleich(W.titel_aus("Estrich: Belegreife messen lassen. Sonst Schäden."), "Estrich: Belegreife messen lassen.", "Titel bis zum Satzende")
