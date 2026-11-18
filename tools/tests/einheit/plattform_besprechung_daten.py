"""Angebotsbesprechung aus den Daten (GO 18.11.2026, A1 B1 C1 – plattform/ava_besprechung_daten.py): ein Feld folgt seiner Quelle, solange
es nicht von Hand überschrieben ist; sonst bleibt der Text und es gibt einen Hinweis; „behalten“/„übernehmen“; Termine als Datum für die
Auftragsdaten (KW → Montag/Freitag), Preis-Satz → Vertragsart. Quellen nachgebildet, ohne Datenbank (läuft im Container der AVA)."""
import json

import ava_besprechung_daten as BD
from lib import gleich, pruefe


class Zeile(dict):
    def keys(self):
        return super().keys()


def _lauf(D, Q):
    """abgleich() mit festen Quellen statt Datenbank."""
    alt = (BD.quellen, BD._lv, BD._angebot)
    BD.quellen, BD._lv, BD._angebot = (lambda *a, **k: json.loads(json.dumps(Q))), (lambda c, i: {"id": i}), (lambda c, r: {"id": 1})
    try:
        r = Zeile(id=1, lv_id=1, angebot_id=1, art="besprechung", status="entwurf", data=json.dumps(D))
        return BD.abgleich(None, r, schreiben=False)
    finally:
        BD.quellen, BD._lv, BD._angebot = alt


def test_feld_folgt_der_quelle():
    D = {"angebot": {"gueltig": "ja, gebunden bis 31.01.2027"}, "_q": {"angebot.gueltig": "ja, gebunden bis 31.01.2027"}}
    D2, ql, H, _ = _lauf(D, {"angebot.gueltig": {"w": "ja, gebunden bis 28.02.2027", "q": "LV-Daten"}})
    gleich((D2["angebot"]["gueltig"], ql.get("angebot.gueltig"), H), ("ja, gebunden bis 28.02.2027", "LV-Daten", []), "unverändertes Feld folgt der Quelle (blau)")
    D = {"angebot": {"gueltig": "ja, mündlich verlängert"}, "_q": {"angebot.gueltig": "ja, gebunden bis 31.01.2027"}}
    D2, ql, H, _ = _lauf(D, {"angebot.gueltig": {"w": "ja, gebunden bis 31.03.2027", "q": "LV-Daten"}})
    gleich(D2["angebot"]["gueltig"], "ja, mündlich verlängert", "von Hand überschrieben bleibt")
    pruefe(len(H) == 1 and H[0]["neu"] == "ja, gebunden bis 31.03.2027" and H[0]["q"] == "LV-Daten" and "angebot.gueltig" not in ql, f"Hinweis statt still: {H}")
    D2, ql, H, _ = _lauf({"angebot": {"gueltig": "ja, mündlich verlängert"}, "_q": {"angebot.gueltig": "ja, gebunden bis 31.01.2027"}},
                         {"angebot.gueltig": {"w": "ja, gebunden bis 31.01.2027", "q": "LV-Daten"}})
    gleich(H, [], "Quelle unverändert → kein Hinweis, Text bleibt")
    D2, ql, H, _ = _lauf({"kopf": {"bauherr": ""}, "_q": {}}, {"kopf.bauherr": {"w": "WEG Merziger Aue", "q": "Projektdaten"}})
    gleich(D2["kopf"]["bauherr"], "WEG Merziger Aue", "leeres Feld füllt sich aus der Quelle")


def test_rueckweg_hilfen():
    gleich((BD._datum("KW 10/2027"), BD._datum("KW 15/2027 (ca. 6 Wochen)", ende=True), BD._datum("1.3.2027"), BD._datum("bald")),
           ("2027-03-08", "2027-04-16", "2027-03-01", ""), "Termine → Datum (KW: Montag bzw. Freitag)")
    gleich((BD._vertragsart("Pauschalpreis", ""), BD._vertragsart("nach Einheitspreisen", "BGB-Werkvertrag"), BD._vertragsart("nach Stundenlohn", "")),
           ("Pauschalvertrag (VOB/B)", "BGB-Werkvertrag", "Stundenlohnvertrag"), "Preis-Satz → Vertragsart")
    gleich(BD._mitarbeiter("ca. 1.200 Leute"), "1200", "Mitarbeiter:innen als Zahl")
