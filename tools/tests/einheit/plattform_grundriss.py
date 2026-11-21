"""Grundriss des Gebäudemodells (bpcore/grundriss.py, GO 20.11.2026 Mock „Gebäudemodell schlank“ A1): Flächen zwischen den Wänden je Geschoss,
frei (kein IfcSpace) oder mit Raum; Geschoss aus der Zuordnung im IFC, nicht aus der Höhe (Allplan schreibt manchmal allen Geschossen dieselbe)."""
import importlib.util
import os

from bpcore import grundriss as GR, raumsuche as RS


def _ifc():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plattform_raumsuche.py")
    s = importlib.util.spec_from_file_location("_rs", p); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
    return m._ifc()[0]


def test_flaechen_frei():
    d = GR.berechnen(_ifc())
    assert [g["n"] for g in d["geschosse"]] == ["EG"], d["geschosse"]
    assert len(d["flaechen"]) == 2 and all(f["raum"] is None and f["g"] == 0 and len(f["umriss"]) >= 4 for f in d["flaechen"]), d["flaechen"]
    assert all(len(f["mitte"]) == 2 for f in d["flaechen"])


def test_geschoss_aus_zuordnung():
    # zweites Geschoss auf derselben Höhe, ohne Bauteile: die Wände gehören laut IFC zum EG – früher landeten sie im obersten Geschoss gleicher Höhe
    raw = _ifc().decode("latin-1").replace("#8=IFCLOCALPLACEMENT($,#5);", "#8=IFCLOCALPLACEMENT($,#5);\n#11=IFCBUILDINGSTOREY('0ccccccccccccccccccccc',$,'OG',$,$,#8,$,$,.ELEMENT.,0.);").encode("latin-1")
    R = RS.raeume(raw)
    assert len(R) == 2 and all(r["geschoss"] == "EG" for r in R), [r["geschoss"] for r in R]
    d = GR.berechnen(raw)
    assert all(d["geschosse"][f["g"]]["n"] == "EG" for f in d["flaechen"]), d
