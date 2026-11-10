"""Kostengruppen DIN 276 (bpcore/din276.py): Liste bis zur 3. Ebene, Vorschläge je Gewerk."""
from bpcore import din276
from lib import pruefe


def test_namen():
    N = din276.NAMEN
    pruefe(N.get("331") == "Tragende Außenwände", "331 fehlt oder heißt anders")
    pruefe(all(len(k) == 3 and k.isdigit() for k in N), "nur dreistellige Kennzahlen")
    pruefe(list(N) == sorted(N), "sortiert")
    pruefe("310" in N and "570" in N and "212" in N, "2. Ebene und Außenanlagen/Herrichten da")


def test_vorschlag():
    pruefe(din276.vorschlag("Dachdeckungsarbeiten")[0] == "363", "Dachdeckung → zuerst 363")
    pruefe(din276.vorschlag("Rohbauarbeiten")[:2] == ["322", "331"], "Rohbau → Bodenplatte, Außenwände")
    pruefe("573" in din276.vorschlag("Landschaftsbauarbeiten -Pflanzen-"), "Landschaftsbau → Pflanzflächen")
    pruefe(din276.vorschlag("") == [] and din276.vorschlag("Sonstiges xyz") == [], "unbekanntes Gewerk: leer")
    v = din276.vorschlag("Fliesen- und Plattenarbeiten")
    pruefe(len(v) == len(set(v)) and all(k in din276.NAMEN for k in v), "keine Doppelten, nur bekannte Kennzahlen")
