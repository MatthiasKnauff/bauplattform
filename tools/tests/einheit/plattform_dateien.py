"""Gemeinsamer Dateispeicher (bpcore/dateien.py, 21.11.2026): Dateien liegen auf dem Laufwerk, die Datenbank hält den Verweis.
Geprüft wird vor allem das Sicherheitsnetz: geschrieben wird erst, wenn alle Apps das Laufwerk sehen; nichts geht verloren."""
import json
import os
import sqlite3
import tempfile
from datetime import datetime, timedelta

from bpcore import dateien
from lib import gleich, pruefe

def _db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.executescript("""
        CREATE TABLE bp_store(key TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}', updated TEXT NOT NULL DEFAULT '');
        CREATE TABLE bp_datei(sha TEXT PRIMARY KEY, groesse INTEGER NOT NULL DEFAULT 0, erstellt TEXT NOT NULL DEFAULT '',
                              frei_seit TEXT NOT NULL DEFAULT '', extern INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE ava_beleg(id INTEGER PRIMARY KEY, name TEXT, data BLOB, datei_ref TEXT);
        CREATE TABLE skizze(id TEXT PRIMARY KEY, datei BLOB, datei_ref TEXT);
        CREATE TABLE pm_planstand_datei(planstand INTEGER PRIMARY KEY, daten BLOB, datei_ref TEXT);
        CREATE TABLE kom_datei(id INTEGER PRIMARY KEY, data BLOB, datei_ref TEXT);
        CREATE TABLE todo_datei(id INTEGER PRIMARY KEY, data BLOB, datei_ref TEXT);
        CREATE TABLE ava_lvdok(id INTEGER PRIMARY KEY, data BLOB, datei_ref TEXT);
        CREATE TABLE ava_nt_datei(id INTEGER PRIMARY KEY, data BLOB, datei_ref TEXT);
        CREATE TABLE ava_buergschaft(id INTEGER PRIMARY KEY, data BLOB, datei_ref TEXT);
        CREATE TABLE ava_bild(id INTEGER PRIMARY KEY, data BLOB, klein BLOB, datei_ref TEXT);
        CREATE TABLE ava_vergabedok(id INTEGER PRIMARY KEY, pdf BLOB, datei_ref TEXT);
        CREATE TABLE honorar_vertrag(id INTEGER PRIMARY KEY, pdf BLOB, datei_ref TEXT);
        CREATE TABLE honorar_fremd_re(id INTEGER PRIMARY KEY, datei BLOB, datei_ref TEXT);
        CREATE TABLE bh_datei(schluessel TEXT NOT NULL, nr INTEGER NOT NULL DEFAULT 0, inhalt BLOB, datei_ref TEXT, PRIMARY KEY (schluessel, nr));
        CREATE TABLE bauantrag_formular(id INTEGER PRIMARY KEY, daten BLOB, datei_ref TEXT);
        CREATE TABLE bp_papierkorb(id INTEGER PRIMARY KEY, data TEXT);
    """)
    return c


def _umgebung():
    """Frische Datenbank und leeres Laufwerk; stille Fehler werden gesammelt statt in die Datenbank geschrieben."""
    dateien.ORDNER = os.path.join(tempfile.mkdtemp(prefix="bp-dateien-"), "dateien")
    dateien._an["bis"] = 0
    still = []
    dateien.fehler = type("Still", (), {"still": staticmethod(lambda app, wo, e=None: still.append(wo))})   # nur in diesem Modul ersetzt
    return _db(), still


def _melden(c, app, k=None):
    dateien._setze(c, f"dateien:app:{app}", json.dumps({"k": dateien._marke() if k is None else k, "zeit": dateien._jetzt()}))


def _an(c):
    dateien.einrichten(c)
    for a in ("ava", "plaene", "portal"):
        _melden(c, a)
    return dateien.pruefen(c)


def test_erst_wenn_alle_das_laufwerk_sehen():
    c, still = _umgebung()
    gleich(dateien.werte(c, b"%PDF-1"), (b"%PDF-1", None), "ohne eingerichteten Speicher bleibt der Inhalt in der Datenbank")
    pruefe(dateien.einrichten(c) and dateien.sieht(c), "die Dienste legen Ordner und Kennung an")
    pruefe(not dateien.pruefen(c) and dateien.ablegen(c, b"x") is None, "noch keine Meldungen der Apps: Schalter bleibt aus")
    _melden(c, "ava"); _melden(c, "plaene"); _melden(c, "portal", k="")   # portal sieht das Laufwerk nicht
    pruefe(not dateien.pruefen(c), "eine App ohne Laufwerk: Schalter bleibt aus")
    _melden(c, "portal")
    pruefe(dateien.pruefen(c) and dateien.an(c), "alle Meldungen tragen die Kennung: Schalter an")
    _melden(c, "wiki", k="falsch")
    pruefe(not dateien.pruefen(c) and not dateien.an(c) and any("wiki" in s for s in still), "später eine App ohne Laufwerk: wieder aus, mit Meldung an die Verwaltung")
    alt = (datetime.now() - timedelta(seconds=dateien.FRISCH + 60)).isoformat(timespec="seconds")
    dateien._setze(c, "dateien:app:wiki", json.dumps({"k": "falsch", "zeit": alt}))
    pruefe(dateien.pruefen(c), "alte Meldungen (App gibt es nicht mehr) zählen nicht")


def test_ablegen_lesen_umziehen():
    c, _ = _umgebung()
    c.execute("INSERT INTO ava_beleg(id, name, data) VALUES(1, 'alt.pdf', ?)", (b"%PDF-alt",))   # Zeile aus der Zeit davor
    pruefe(_an(c), "Speicher an")
    d, ref = dateien.werte(c, b"%PDF-neu")
    pruefe(d is None and ref and os.path.isfile(dateien.pfad(ref)), "neuer Inhalt liegt als Datei, die Datenbank bekommt nur den Verweis")
    c.execute("INSERT INTO ava_beleg(id, name, data, datei_ref) VALUES(2, 'neu.pdf', ?, ?)", (d, ref))
    Z = {r["id"]: r for r in c.execute("SELECT * FROM ava_beleg").fetchall()}
    gleich((dateien.inhalt(c, Z[1]), dateien.inhalt(c, Z[2])), (b"%PDF-alt", b"%PDF-neu"), "gelesen wird beides: Inhalt in der Datenbank und Verweis")
    gleich(dateien.werte(c, b"%PDF-neu")[1], ref, "gleicher Inhalt = dieselbe Datei")
    gleich(c.execute("SELECT COUNT(*) AS n FROM bp_datei").fetchone()["n"], 1, "… und ein Eintrag")
    gleich(dateien.stand(c)["offen"], 1, "eine Zeile wartet auf den Umzug")
    gleich((dateien.umziehen(c), dateien.umziehen(c)), (1, 0), "die Dienste ziehen die alte Zeile um")
    r = c.execute("SELECT * FROM ava_beleg WHERE id=1").fetchone()
    pruefe(r["data"] is None and r["datei_ref"] and dateien.inhalt(c, r) == b"%PDF-alt", "nach dem Umzug: Inhalt aus der Datenbank, Datei lesbar")
    os.remove(dateien.pfad(r["datei_ref"]))
    try:
        dateien.inhalt(c, r)
        pruefe(False, "fehlende Datei muss gemeldet werden")
    except dateien.Fehlt as e:
        pruefe("Dateispeicher" in str(e), "fehlende Datei: klare Meldung statt Absturz")



def test_etappe2_auch_schluessel_aus_zwei_spalten():
    c, _ = _umgebung()
    c.execute("INSERT INTO bh_datei(schluessel, nr, inhalt) VALUES('f:1', 0, ?), ('f:1', 1, ?)", (b"Foto0", b"Foto1"))
    c.execute("INSERT INTO kom_datei(id, data) VALUES(3, ?)", (b"Mail",))
    _an(c)
    gleich(dateien.umziehen(c, 5), 3, "Dokumente und Fotos ziehen mit um – auch bh_datei mit Schlüssel aus zwei Spalten")
    R = {r["nr"]: r for r in c.execute("SELECT * FROM bh_datei").fetchall()}
    gleich([dateien.inhalt(c, R[i], "inhalt") for i in (0, 1)], [b"Foto0", b"Foto1"], "je Zeile die eigene Datei")
    pruefe(all(R[i]["inhalt"] is None for i in (0, 1)), "die Datenbank hält nur noch den Verweis")


def test_aufraeumen_haelt_90_tage_und_den_papierkorb():
    c, _ = _umgebung()
    _an(c)
    a, b, k = (dateien.ablegen(c, x) for x in (b"A", b"B", b"K"))
    c.execute("INSERT INTO ava_beleg(id, datei_ref) VALUES(1, ?)", (a,))
    c.execute("INSERT INTO bp_papierkorb(id, data) VALUES(1, ?)", (json.dumps({"teile": [{"t": "ava_beleg", "rows": [{"datei_ref": k}]}]}),))
    gleich(dateien.aufraeumen(c), 0, "frisch ohne Verweis: nur vorgemerkt")
    F = {r["sha"]: r["frei_seit"] for r in c.execute("SELECT * FROM bp_datei").fetchall()}
    pruefe(F[a] == "" and F[b] and F[k], "vorgemerkt ist nur, worauf nichts zeigt")
    alt = (datetime.now() - timedelta(days=dateien.HALTEN + 1)).isoformat(timespec="seconds")
    c.execute("UPDATE bp_datei SET frei_seit=? WHERE frei_seit<>''", (alt,))
    gleich(dateien.aufraeumen(c), 1, "nach 90 Tagen geht die Datei ohne Verweis")
    pruefe(not os.path.isfile(dateien.pfad(b)) and os.path.isfile(dateien.pfad(k)) and os.path.isfile(dateien.pfad(a)), "was der Papierkorb nennt, bleibt")
    c.execute("UPDATE bp_datei SET frei_seit=? WHERE sha=?", (alt, a))
    dateien.aufraeumen(c)
    gleich(c.execute("SELECT frei_seit FROM bp_datei WHERE sha=?", (a,)).fetchone()["frei_seit"], "", "wieder benutzt: Vormerkung weg")


def test_verlorenes_laufwerk_wird_nicht_still_neu_angelegt():
    c, still = _umgebung()
    _an(c)
    sha = dateien.ablegen(c, b"wichtig")
    os.remove(os.path.join(dateien.ORDNER, dateien.MARKE))   # neues, leeres Volume
    os.remove(dateien.pfad(sha))
    dateien._an["bis"] = 0
    pruefe(not dateien.einrichten(c) and not dateien.an(c) and still, "Kennung fehlt, Dateien verzeichnet: nicht neu anlegen, Speicher aus, Meldung")
    gleich(dateien.werte(c, b"neu"), (b"neu", None), "bis dahin schreibt alles wieder in die Datenbank")
    dateien._schreiben(sha, b"wichtig")   # vom Dateiserver zurückgeholt (extern.dateien_holen)
    pruefe(dateien.einrichten(c, zurueck=True) and dateien.sieht(c), "nach dem Zurückholen bekommt das Laufwerk seine Kennung wieder")

