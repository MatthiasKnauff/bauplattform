"""Ausschreibung ← Gebäudemodell, Quelle „Bauteile“ (GO 21.11.2026, Mock „Gebäudemodell in der Kopierquelle“ D3 – plattform/ava_modellquelle.py):
verknüpfte Positionen folgen dem Modell (Menge, Text, Preis; OZ bleibt) – direkt, solange nichts von Hand geändert und das LV weder versandt
noch vergeben ist, sonst Hinweis; gelöste und freie Positionen bleiben; fehlt der Teil im Modell, bleibt die Position mit Vermerk.
Modell und Datenbank nachgebildet (läuft im Container der AVA)."""
import json

import ava_modellquelle as MQ
from lib import gleich, pruefe


class C:
    """Datenbank-Ersatz: merkt sich das letzte UPDATE."""
    def __init__(self):
        self.data = None

    def execute(self, sql, args=()):
        if sql.startswith("UPDATE ava_lv"):
            self.data = json.loads(args[0])
        return self


def _pos(i, menge, ep=10.0, kurz="Mauerwerk"):
    p = {"mod": f"z1#{i}", "typ": "pos", "art": "N", "kurz": kurz, "lang": kurz + " herstellen", "menge": menge, "einheit": "m²", "kg": "331", "ep_s": ep}
    p["mod_h"] = MQ.fingerabdruck(p)
    return p


def _lauf(items, quelle, gesperrt="", linie="lebendig", erzwingen=False, extra=None):
    alt = (MQ.bauteile, MQ.linie, MQ.rev, MQ.ava_tuersync.gesperrt, MQ.versionen.vor, MQ.versionen.nach, MQ.A.C.audit)
    MQ.bauteile, MQ.linie, MQ.rev = (lambda c, pid: ([{"pos": quelle}], "Plan")), (lambda c, pid: linie), (lambda c, pid: 7)
    MQ.ava_tuersync.gesperrt = lambda c, r: gesperrt
    MQ.versionen.vor = MQ.versionen.nach = lambda *a, **k: None
    MQ.A.C.audit = lambda *a, **k: None
    try:
        c = C()
        r = {"id": 1, "nr": "01", "project_id": 5, "data": json.dumps({"items": items, **(extra or {})}), "vergabe": "{}"}
        return MQ.abgleich(c, r, "test", erzwingen=erzwingen), c.data
    finally:
        MQ.bauteile, MQ.linie, MQ.rev, MQ.ava_tuersync.gesperrt, MQ.versionen.vor, MQ.versionen.nach, MQ.A.C.audit = alt


def test_fingerabdruck():
    a = _pos(0, 85.7)
    pruefe(MQ.fingerabdruck(dict(a, oz="01.0010", id="x", quelle="egal")) == a["mod_h"], "OZ, Kennung und Herkunft gehören nicht zum Fingerabdruck")
    pruefe(MQ.fingerabdruck(dict(a, menge=85.8)) != a["mod_h"] and MQ.fingerabdruck(dict(a, ep_s=11)) != a["mod_h"], "Menge und Preis schon")


def test_folgt_dem_modell():
    I = [dict(_pos(0, 85.7), id="a", oz="01.0010"), {"id": "f", "typ": "pos", "art": "N", "oz": "01.0020", "kurz": "Sturz", "menge": 6, "einheit": "St"}]
    st, d = _lauf(I, [_pos(0, 92.0, 12.5, "Mauerwerk 24 cm")])
    N = {x["id"]: x for x in d["items"]}
    gleich((st["auto"], st["offen"], N["a"]["menge"], N["a"]["ep_s"], N["a"]["kurz"], N["a"]["oz"]), (1, 0, 92.0, 12.5, "Mauerwerk 24 cm", "01.0010"), "Menge, Preis, Text folgen – OZ bleibt")
    gleich((N["f"]["kurz"], N["f"]["menge"], d["mod_rev"], "mod_offen" in d), ("Sturz", 6, 7, False), "freie Position bleibt, Stand gemerkt")
    gleich(N["a"]["mod_h"], MQ.fingerabdruck(N["a"]), "neuer Fingerabdruck")


def test_von_hand_geaendert_fragt():
    a = dict(_pos(0, 85.7), id="a")
    a["menge"] = 80   # von Hand, Fingerabdruck noch der alte
    st, d = _lauf([a], [_pos(0, 92.0)])
    gleich((st["auto"], st["offen"], d["items"][0]["menge"], d["mod_offen"]["ids"]), (0, 1, 80, ["a"]), "Hinweis statt Überschreiben")
    st, d = _lauf([a], [_pos(0, 92.0)], erzwingen=True)
    gleich((st["auto"], d["items"][0]["menge"], "mod_offen" in d), (1, 92.0, False), "„Übernehmen“ setzt den Stand des Modells")
    st, d = _lauf([a], [_pos(0, 85.7)])   # Modell unverändert: die Hand-Änderung ist keine offene Frage
    gleich((st["auto"], st["offen"], d["items"][0]["menge"]), (0, 0, 80), "Modell unverändert → nichts zu fragen")


def test_versandt_geloest_weg_linie():
    a = dict(_pos(0, 85.7), id="a")
    st, d = _lauf([a], [_pos(0, 92.0)], gesperrt="versandt")
    gleich((st["auto"], st["offen"], d["items"][0]["menge"], d["mod_offen"]["grund"]), (0, 1, 85.7, "versandt"), "versandtes LV ändert sich nicht von selbst")
    los = dict(_pos(0, 85.7), id="a", mod_los=True)
    pruefe(_lauf([los], [_pos(0, 92.0)])[0] is None, "nur gelöste Positionen: nichts zu tun")
    weg = dict(_pos(3, 10), id="w")
    st, d = _lauf([a, weg], [_pos(0, 85.7)])
    gleich((st["weg"], d["items"][1].get("mod_weg"), d["items"][1]["menge"]), (1, True, 10), "Teil fehlt im Modell: Position bleibt mit Vermerk")
    pruefe(_lauf([a], [_pos(0, 92.0)], linie="getrennt")[0] is None and _lauf([a], [_pos(0, 92.0)], linie="fest")[0] is None, "Linie getrennt/fest geht vor")

