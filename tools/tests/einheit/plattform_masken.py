"""Masken ohne Wiederholungen (GO 18.11.2026, MJ-A1 B1 C1 D1 E1): Bundesland der Baustelle für die Feiertage (einmal je Standort gemerkt,
ohne Standort das Büro) und Bauvorlageberechtigte:r aus dem Konto einer Person (Eingaben der Verwaltung gehen vor). Datenbank nachgebildet."""
import json

from bpcore import bueroinfo, feiertage, geo
from lib import gleich


class Zeile(dict):
    def keys(self):
        return super().keys()


class Ergebnis:
    def __init__(self, z):
        self.z = z

    def fetchone(self):
        return self.z[0] if self.z else None

    def fetchall(self):
        return self.z


class Db:
    def __init__(self, projekt=None, einst=None, konto=None, user=None):
        self.projekt, self.einst, self.store, self.konto, self.user = projekt, einst or {}, {}, konto or {}, user

    def execute(self, sql, a=()):
        if "FROM projects" in sql:
            return Ergebnis([Zeile(self.projekt)] if self.projekt else [])
        if "FROM bp_store" in sql:
            k = a[0]
            if k.startswith("konto:"):
                return Ergebnis([Zeile(data=json.dumps(self.konto))])
            return Ergebnis([Zeile(data=self.store[k])] if k in self.store else [])
        if sql.startswith("INSERT INTO bp_store"):
            self.store[a[0]] = a[1]
        if "FROM settings" in sql:
            if "LIKE" in sql:
                return Ergebnis([Zeile(key=k, value=v) for k, v in self.einst.items()])
            return Ergebnis([Zeile(value=self.einst[a[0]])] if a[0] in self.einst else [])
        if "FROM users" in sql:
            return Ergebnis([Zeile(self.user)] if self.user else [])
        return Ergebnis([])


def test_land_der_baustelle():
    gefragt = []
    alt = geo.land
    geo.land = lambda lat, lon: gefragt.append((lat, lon)) or "BY"
    try:
        c = Db({"lat": 48.137, "lon": 11.575}, {"co_land": "NW"})
        gleich(feiertage.land_projekt(c, 5), {"land": "BY", "name": "Bayern", "quelle": "baustelle"}, "aus dem Standort der Baustelle")
        feiertage.land_projekt(c, 5)
        gleich(len(gefragt), 1, "je Standort nur einmal gefragt")
        gleich(feiertage.land_projekt(Db({"lat": None, "lon": None}, {"co_land": "NW"}), 6)["quelle"], "buero", "ohne Standort: Büro")
    finally:
        geo.land = alt


def test_bauvorlage_aus_dem_konto():
    c = Db(einst={"co_bv_uid": "7", "co_bv_kammernr": "A 999"}, konto={"beruf": "Dipl.-Ing. Architekt", "kammer": "AK NRW", "kammernr": "A 123"},
           user={"id": 7, "name": "mk", "vorname": "Matthias", "nachname": "Knauff"})
    B = bueroinfo.bauvorlage(c)
    gleich((B["name"], B["beruf"], B["kammer"], B["kammernr"]), ("Matthias Knauff", "Dipl.-Ing. Architekt", "AK NRW", "A 999"), "aus dem Konto, Eingabe der Verwaltung geht vor")
    gleich(bueroinfo.bauvorlage(Db(einst={"co_bv_name": "Büro"}))["name"], "Büro", "ohne Person: wie bisher die Felder")
