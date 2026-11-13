"""LV aus der Kostenermittlung gliedern: nach Leistung zusammengefasst oder je Bauteil, eine Ebene (Hinweistext als Überschrift) oder Gliederungspunkte.
Die Einträge kommen hier ohne Datenbank (Bauteile ohne Aufbau aus dem Baukasten bzw. vorbereitete Einträge)."""
from lib import gleich, pruefe


def _E(bauteil, kurz, menge, gruppe, lb="Beton- und Stahlbetonarbeiten", code=None):
    return {"typ": "pos", "art": "N", "kurz": kurz, "lang": "", "menge": menge, "einheit": "m³", "kg": "341", "ep_s": 239.0, "code": code or kurz,
            "_bauteil": bauteil, "_kg": "340 Innenwände", "_lb": lb, "_gruppe": gruppe}


def test_zusammenfassen_und_ebenen():
    import ava_aus_kosten as A
    E = [_E("Wand EG", "Beton C30/37", 5.51, "Wände"), _E("Wand OG", "Beton C30/37", 5.52, "Wände"), _E("Wand EG", "Schalung", 55.1, "Schalung")]
    alt = A._eintraege
    A._eintraege = lambda c, bts, auf: [dict(e) for e in E]
    try:
        I = A.gliedern(None, [], "leistung", "eine", "lb")
        gleich([(x["art"], x["kurz"]) for x in I], [("T", "Wände"), ("N", "Beton C30/37"), ("T", "Schalung"), ("N", "Schalung")], "eine Ebene, Überschriften")
        b = I[1]
        gleich(b["menge"], 11.03, "Mengen addiert")
        pruefe("Wand EG" in b["quelle"] and "Wand OG" in b["quelle"], "Herkunft")
        I = A.gliedern(None, [], "bauteil", "gliederung", "lb")
        gleich([(x["typ"], x.get("lvl"), x["kurz"]) for x in I if x["typ"] == "titel"], [("titel", 1, "340 Innenwände"), ("titel", 2, "Wand EG"), ("titel", 2, "Wand OG")], "je Bauteil mit Untertitel")
        gleich(sum(1 for x in I if x["typ"] == "pos"), 3, "nichts zusammengefasst")
    finally:
        A._eintraege = alt
