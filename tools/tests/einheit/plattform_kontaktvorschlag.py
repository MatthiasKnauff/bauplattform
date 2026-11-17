"""Kontaktmaske – Vorschläge aus dem Netz (bpcore.geo.companies): bei allgemeinen Namen („Bauordnungsamt“) zuerst im Umkreis des Projekts
bzw. Büros und mit dem Ort suchen, die nächsten zuerst – nicht Treffer aus ganz Deutschland. Photon wird nachgebildet (kein Netz)."""
from lib import gleich, pruefe

from bpcore import geo


def test_umkreis_und_ort_zuerst():
    aufrufe = []

    def photon(q, near, limit=12, bbox=None):
        aufrufe.append((q, bool(bbox)))
        weit = [{"name": "Bauordnungsamt", "street": "Fährstraße", "housenumber": "20", "postcode": "27568", "city": "Bremerhaven", "lat": 53.54, "lon": 8.58, "osm_key": "office", "osm_type": "N", "osm_id": 1},
                {"name": "Bauordnungsamt", "street": "Imhofstraße", "housenumber": "7", "postcode": "86159", "city": "Augsburg", "lat": 48.36, "lon": 10.89, "osm_key": "office", "osm_type": "N", "osm_id": 2}]
        nah = [{"name": "Bauordnungsamt Essen", "street": "Lindenallee", "housenumber": "10", "postcode": "45127", "city": "Essen", "lat": 51.455, "lon": 7.008, "osm_key": "office", "osm_type": "N", "osm_id": 3}]
        if bbox:
            pruefe(bbox[0] < near[1] < bbox[2] and bbox[1] < near[0] < bbox[3], f"Umkreis um den Ort: {bbox}")
            return nah
        return nah + weit if "Essen" in q else weit
    alt = geo._photon
    geo._photon, geo._cache = photon, {}
    try:
        R = geo.companies("Bauordnungsamt", (51.45, 7.01), "Essen")
        gleich(R[0]["city"], "Essen", "Treffer im Umkreis zuerst")
        gleich([r["city"] for r in R], ["Essen", "Bremerhaven", "Augsburg"], "doppelte zusammengefasst, nach Entfernung")
        gleich(aufrufe, [("Bauordnungsamt", True), ("Bauordnungsamt Essen", False), ("Bauordnungsamt", False)], "Umkreis, mit Ort, dann überall")
        aufrufe.clear()
        geo.companies("Bauamt Essen", None, "Essen")
        gleich(aufrufe, [("Bauamt Essen", False)], "Ort steht schon im Suchtext: nicht doppelt")
        aufrufe.clear()
        geo.companies("Bauamt", None, "Bochum")
        gleich(aufrufe[0], ("Bauamt Bochum", False), "ohne Lage: mit dem Ort")
    finally:
        geo._photon, geo._cache = alt, {}


def test_nur_firmen_und_aemter():
    def photon(q, near, limit=12, bbox=None):
        return [{"name": "Rathaus Essen", "postcode": "45127", "city": "Essen", "osm_key": "amenity", "osm_value": "townhall", "osm_type": "W", "osm_id": 1},
                {"name": "Dach Müller", "city": "Essen", "osm_key": "craft", "osm_value": "roofer", "osm_type": "N", "osm_id": 2},
                {"name": "Müllerstraße", "city": "Essen", "osm_key": "highway", "osm_type": "W", "osm_id": 3},
                {"name": "Villa Hügel", "city": "Essen", "osm_key": "tourism", "osm_type": "W", "osm_id": 4},
                {"name": "Haus Müller", "city": "Essen", "osm_key": "building", "osm_type": "W", "osm_id": 5}]
    alt = geo._photon
    geo._photon, geo._cache = photon, {}
    try:
        R = geo.companies("Müller", None, "")
        gleich([(r["name"], r["trade"]) for r in R], [("Rathaus Essen", "Amt"), ("Dach Müller", "Dach")], "nur Firmen und Ämter, mit Gewerk")
    finally:
        geo._photon, geo._cache = alt, {}
