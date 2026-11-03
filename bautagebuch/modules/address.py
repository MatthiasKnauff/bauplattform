"""Adressen ergänzen: PLZ ↔ Ort, Straße → PLZ/Ort. Erst aus dem Verlauf (Kontakte, Projekte, Firmendaten – sofort, offline),
dann aus dem Netz (OpenStreetMap)."""
from collections import Counter
from flask import Blueprint, jsonify, request
from core import db, geo

bp = Blueprint("address", __name__)


def _pairs(c):
    for t in ("contacts", "projects"):
        for r in c.execute(f"SELECT zip, city FROM {t} WHERE zip!='' AND city!=''"):
            yield r["zip"].strip(), r["city"].strip()
    s = {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings WHERE key IN ('co_zip','co_city')")}
    if s.get("co_zip") and s.get("co_city"):
        yield s["co_zip"].strip(), s["co_city"].strip()


@bp.get("/api/address/complete")
def complete():
    street, zip_, city = (" ".join(request.args.get(k, "").split()) for k in ("street", "zip", "city"))
    if (zip_ and city) or not (zip_ or city):
        return jsonify({})                       # nichts zu ergänzen
    with db.tx() as c:
        pairs = list(_pairs(c))
    if zip_ and not city:
        cities = Counter(ct for z, ct in pairs if z == zip_)
        if cities:
            return jsonify(city=cities.most_common(1)[0][0], source="verlauf")
    if city and not zip_ and not street:
        return jsonify({})                       # nur Ort: PLZ wäre geraten (große Städte haben viele) – Auswahl bietet das Feld aus dem Verlauf an
    got = geo.complete_address(street, zip_, city)
    return jsonify(**got, source="netz") if got else jsonify({})


@bp.get("/api/address/suggest")
def suggest():
    """Adressvorschläge beim Tippen in „Straße“: ?q=Straße [PLZ Ort]&lat=&lon= (Umkreis, optional)."""
    lat, lon = request.args.get("lat", type=float), request.args.get("lon", type=float)
    return jsonify(items=geo.addresses(request.args.get("q", ""), (lat, lon) if lat is not None and lon is not None else None))
