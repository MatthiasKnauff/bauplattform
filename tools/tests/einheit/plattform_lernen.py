"""Der Planungsassistent lernt (bpcore/lernen.py, GO 16.11.2026): Profil aus der Bauart, Ähnlichkeit, Ergänzungen eines Projekts – ohne Datenbank."""
from bpcore import lernen as L
from lib import gleich, pruefe


def test_profil_und_aehnlich():
    p = L.profil({"type": "k:ef:nb:da:", "area": 150})
    gleich(p, {"geb": "ef", "mass": ["nb"], "area": 150.0}, "Profil aus der Bauart in Ebenen")
    gleich(L.profil({"type": "neubau_efh"})["mass"], ["nb"], "alter Gebäudetyp")
    pruefe(L.aehnlich(p, {"geb": "ef", "mass": ["nb", "da"], "area": 220}), "EFH-Neubau 150 ↔ 220 m²: ähnlich")
    pruefe(not L.aehnlich(p, {"geb": "mf", "mass": ["nb"], "area": 150}), "anderes Gebäude: nicht ähnlich")
    pruefe(not L.aehnlich(p, {"geb": "ef", "mass": ["um"], "area": 150}), "andere Maßnahme: nicht ähnlich")
    pruefe(not L.aehnlich(p, {"geb": "ef", "mass": ["nb"], "area": 400}), "mehr als doppelt so groß: nicht ähnlich")


def test_eintraege_und_schluessel():
    a = {"custom": [{"id": "eig1", "n": "Blower-Door-Messung", "ph": "abschluss", "d": 1, "gw": "Energieberatung"}], "notiz": {"bau": ["Radon prüfen"], "eck": []}}
    E = L.eintraege(a)
    gleich([(e[0], e[1], e[2]) for e in E], [("leistung", "abschluss", "Blower-Door-Messung"), ("notiz", "bau", "Radon prüfen")], "eigene Leistung und Ergänzung")
    gleich(L.schluessel("notiz", "bau", "Radon  prüfen!"), L.schluessel("notiz", "bau", "radon pruefen"), "Schlüssel ohne Groß/Klein, Umlaute, Satzzeichen")
