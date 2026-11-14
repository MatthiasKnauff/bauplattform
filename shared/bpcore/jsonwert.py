"""JSON-Spalten lesen – einmal für alle Apps (vorher eine eigene Kopie `_j` je Modul).

lies(v, d) – Text wird als JSON gelesen, alles andere bleibt, wie es ist; fehlt der Wert (None, leerer oder
kaputter Text), kommt der Standard d zurück. Ohne Abhängigkeiten, damit auch reine Rechenmodule es benutzen können.
"""
import json


def lies(v, d=None):
    try:
        x = json.loads(v) if isinstance(v, str) else v
    except (TypeError, ValueError):
        return d
    return d if x is None else x
