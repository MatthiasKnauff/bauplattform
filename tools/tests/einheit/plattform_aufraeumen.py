"""Adressen aufräumen (19.11.2026, A1 B1 C1 D1): was als ähnlich gilt, Ziel aus der festen Liste, Aufteilen, Baustelle leeren."""
from bpcore import aufraeumen as A
from lib import gleich, pruefe


def test_aehnlich():
    gleich(A.aehnlich("Sanitär", "sanitaer"), "Schreibweise", "Umlaut, Groß/Klein")
    gleich(A.aehnlich("Bauherr*in", "Bauherren"), "Schreibweise", "Gendern, Mehrzahl")
    gleich(A.aehnlich("Dachdekcer", "Dachdecker"), "Tippfehler", "Tippfehler")
    gleich(A.aehnlich("Elektroarbeiten", "Elektrotechnik"), "Wortstamm", "Wortstamm")
    gleich(A.aehnlich("Galabau", "Garten- und Landschaftsbau"), "Abkürzung", "Abkürzung")
    gleich(A.aehnlich("Maler", "Maurer"), "", "Maler und Maurer sind verschieden")
    gleich(A.aehnlich("Heizung", "Heizung Sanitär"), "", "zwei Wörter sind kein Wortstamm")


def test_gruppen_und_ziel():
    W = {"Sanitär": 12, "Sanitaer": 2, "sanitär": 1, "Elektro": 9, "Elektroarbeiten": 4, "Maler": 3}
    G = A._gruppen(W, set(), {})
    gleich(sorted(sorted(L) for L, g, k in G), [["Elektro", "Elektroarbeiten"], ["Sanitaer", "Sanitär", "sanitär"]], "zwei Gruppen")
    L = next(L for L, g, k in G if "Elektro" in L)
    gleich(A._ziel(L, W, []), "Elektro", "häufigster als Ziel")
    k = next(k for L, g, k in G if "Elektro" in L)
    pruefe(not any("Elektro" in L for L, g, kk in A._gruppen(W, {k}, {})), "„Nicht ähnlich“ gemerkt → Gruppe kommt nicht wieder")
