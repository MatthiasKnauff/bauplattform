"""Wetter + Adresse aus GPS-Koordinaten, Adresssuche. Koordinaten werden nicht gespeichert (nur auf Wunsch am Projekt)."""
import datetime, urllib.parse
from flask import Blueprint, jsonify, request
from core import geo

bp = Blueprint("weather", __name__)


def describe(code):
    """WMO-Wettercode -> (Wetter, Niederschlag) passend zu den Auswahllisten der Oberfläche."""
    if code in (0, 1): return "Heiter", "trocken"
    if code == 2: return "Wolkig", "trocken"
    if code == 3: return "Bedeckt", "trocken"
    if code in (45, 48): return "Nebel", "trocken"
    if code in (51, 53, 55, 56, 57, 61, 80): return "Bedeckt", "leichter Regen"
    if code in (63, 66, 67, 81): return "Bedeckt", "Regen"
    if code in (65, 82): return "Bedeckt", "Starkregen"
    if code in (71, 73, 75, 77, 85, 86): return "Bedeckt", "Schnee"
    if code in (95, 96, 99): return "Gewitter", "Regen"
    return "", ""


def num(v):
    return "" if v is None else (str(int(round(v))) if abs(v) >= 10 or abs(v - round(v)) < 1e-9 else str(round(v, 1)))


def historic(lat, lon, day, hour):
    """Wetter für ein bestimmtes Datum (und die Stunde des Berichts): Vorhersage-Dienst für die letzten ~90 Tage bis
    +15 Tage, davor das Archiv (ERA5, ca. 5 Tage verzögert, deshalb nicht für ganz frische Tage)."""
    delta = (day - datetime.date.today()).days
    if delta > 15:
        raise ValueError("zu weit in der Zukunft")
    base = "https://api.open-meteo.com/v1/forecast?" if delta >= -90 else "https://archive-api.open-meteo.com/v1/archive?"
    w = geo.fetch_json(base + urllib.parse.urlencode({
        "latitude": lat, "longitude": lon, "wind_speed_unit": "kmh", "timezone": "auto",
        "start_date": day.isoformat(), "end_date": day.isoformat(),
        "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"}))["hourly"]
    i = min(max(hour, 0), len(w["time"]) - 1)
    if all(w[k][i] is None for k in ("temperature_2m", "weather_code")):
        raise ValueError("keine Daten")
    return {"weather_code": w["weather_code"][i], "temperature_2m": w["temperature_2m"][i],
            "relative_humidity_2m": w["relative_humidity_2m"][i], "wind_speed_10m": w["wind_speed_10m"][i]}


@bp.get("/api/geo")
def geo_info():
    try:
        lat, lon = float(request.args["lat"]), float(request.args["lon"])
        assert -90 <= lat <= 90 and -180 <= lon <= 180
    except (KeyError, ValueError, AssertionError):
        return jsonify(error="Ungültige Koordinaten"), 400
    out, problems = {}, []
    day, hour = None, 10
    if request.args.get("date"):
        try:
            day = datetime.date.fromisoformat(request.args["date"])
            hour = int(str(request.args.get("time") or "10:00")[:2])
        except ValueError:
            return jsonify(error="Ungültiges Datum"), 400
        if day == datetime.date.today():
            day = None   # heute: aktuelle Werte
    try:
        if day:
            w = historic(lat, lon, day, hour)
        else:
            w = geo.fetch_json("https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode({
                "latitude": lat, "longitude": lon, "wind_speed_unit": "kmh", "timezone": "auto",
                "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"}))["current"]
        weather, precip = describe(w.get("weather_code"))
        out.update(weather=weather, precip=precip, temp=num(w.get("temperature_2m")),
                   humidity=num(w.get("relative_humidity_2m")), wind=num(w.get("wind_speed_10m")))
    except Exception:
        problems.append("Wetter")
    try:
        if request.args.get("noaddr") == "1":
            raise LookupError
        a = geo.reverse(lat, lon)
        out.update(plz=a["zip"], street=a["street"], city=a["city"],
                   place=", ".join(x for x in (a["street"], a["city"]) if x))
    except LookupError:
        pass
    except Exception:
        problems.append("Ort")
    if len(problems) == 2 or (request.args.get("noaddr") == "1" and problems):
        return jsonify(error="Wetter- und Ortsdienst sind vom Server aus nicht erreichbar (Internetzugang prüfen)."), 502
    return jsonify(**out, partial=problems)


@bp.get("/api/geocode")
def geocode():
    hit = geo.search(request.args.get("q", ""), from_name=request.args.get("from_name") == "1")
    return jsonify(found=bool(hit), **(hit or {}))
