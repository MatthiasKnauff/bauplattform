"""Der gemeinsame Dateispeicher der Bauplattform (GO 21.11.2026): große Dateien liegen als Datei auf EINEM Laufwerk, nicht in der Datenbank.

Warum: Rechnungs-PDFs, Pläne der Markierung und IFC-Dateien standen als BYTEA in der Datenbank – jede tägliche Sicherung schrieb sie neu,
die Datenbank wuchs mit jedem Plan. Jetzt hält die Datenbank nur den Verweis (Prüfsumme) – Name und Größe stehen wie bisher an der Sache.

Aufbau
  Laufwerk    DATA_DIR/dateien/<ab>/<cd>/<sha256> – das Volume „bautagebuch_data“, das JEDER App-Container unter /data einbindet
              (Stack-Dateien; prüft tools/tests/einheit/plattform_dateien.py). Gleicher Inhalt = dieselbe Datei, Dateien ändern sich nie.
  Tabelle     bp_datei(sha, groesse, erstellt, frei_seit, extern) – was im Speicher liegt (Migration 0104).
  Verweis     je Tabelle die Spalte `datei_ref` neben der bisherigen BYTEA-Spalte (TABELLEN). Eine Zeile hat entweder den Verweis
              oder (ältere Zeile bzw. Speicher nicht eingeschaltet) den Inhalt in der Datenbank – gelesen wird immer über inhalt().

Sicherheitsnetz – nichts geht verloren, wenn ein Container das Laufwerk nicht sieht
  Kennung     Der Dienste-Container legt im Speicher die Datei „.kennung“ an und merkt dieselbe Kennung in bp_store („dateien:kennung“).
              Ein Prozess „sieht“ den Speicher nur, wenn er genau diese Kennung liest (sieht()).
  Meldungen   Jeder App-Prozess meldet alle 10 Minuten, welche Kennung er sieht (anmelden() → bp_store „dateien:app:<App>“).
  Schalter    Die Dienste schalten den Speicher erst ein („dateien:an“), wenn ALLE Meldungen der letzten halben Stunde die richtige
              Kennung tragen (pruefen()). Solange aus: alles schreibt wie früher in die Datenbank, gelesen wird beides.
  Umzug       Vorhandene Zeilen ziehen die Dienste um (umziehen()) – erst Datei schreiben und gegenlesen, dann den Inhalt aus der
              Datenbank nehmen.
  Löschen     Eine Datei ohne Verweis bleibt noch HALTEN Tage liegen (aufraeumen()) und nie, solange der Papierkorb sie nennt –
              so findet auch eine zurückgespielte Datensicherung ihre Dateien.
  Sicherung   bautagebuch/core/extern.py kopiert neue Dateien auf den Dateiserver (Ordner „Dateien“) und holt fehlende zurück.

Benutzen (eine App)
  bytea, ref = dateien.werte(c, roh)            # beim INSERT: eine der beiden Spalten ist None
  roh = dateien.inhalt(c, zeile, "data")        # beim Lesen: Zeile mit den Spalten data und datei_ref
Neue Tabelle: Spalte datei_ref (Migration), Zeile in TABELLEN, Lesen/Schreiben wie oben – Umzug, Aufräumen und Sicherung gehen von selbst.
"""
import hashlib
import json
import os
import threading
import time
import uuid
from datetime import datetime, timedelta

from . import fehler

ORDNER = os.path.join(os.environ.get("DATA_DIR", "data"), "dateien")
MARKE = ".kennung"
# (Tabelle, Schlüsselspalte, BYTEA-Spalte) – der Verweis heißt überall datei_ref
TABELLEN = (("ava_beleg", "id", "data"), ("skizze", "id", "datei"), ("pm_planstand_datei", "planstand", "daten"))
HALTEN = 90      # Tage, die eine Datei ohne Verweis noch liegen bleibt
MELDEN = 600     # Sekunden zwischen zwei Meldungen eines App-Prozesses
FRISCH = 1800    # Meldungen, die jünger sind, zählen für den Schalter
_an = {"bis": 0.0, "wert": False}


class Fehlt(LookupError):
    """Der Verweis steht in der Datenbank, die Datei liegt nicht im Speicher (Laufwerk nicht eingebunden oder verloren)."""

    def __init__(self, sha):
        super().__init__("Die Datei liegt nicht im Dateispeicher. Bitte der Verwaltung melden (Datensicherung → Dateien zurückholen).")
        self.sha = sha


def _jetzt():
    return datetime.now().isoformat(timespec="seconds")


def pfad(sha):
    return os.path.join(ORDNER, sha[:2], sha[2:4], sha)


def _marke():
    try:
        with open(os.path.join(ORDNER, MARKE), encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return ""


def _lies(c, key):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (key,)).fetchone()
    return r["data"] if r else ""


def _setze(c, key, wert):
    c.execute("INSERT INTO bp_store(key, data, updated) VALUES(?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated",
              (key, wert, _jetzt()))


def sieht(c):
    """Sieht dieser Prozess den gemeinsamen Speicher? (Kennung im Laufwerk = Kennung in der Datenbank)"""
    k = _lies(c, "dateien:kennung")
    return bool(k) and _marke() == k


def an(c):
    """Darf dieser Prozess in den Speicher schreiben? Schalter der Dienste UND eigenes Laufwerk – eine Minute gemerkt."""
    t = time.time()
    if t > _an["bis"]:
        _an["wert"], _an["bis"] = _lies(c, "dateien:an") == "1" and sieht(c), t + 60
    return _an["wert"]


def _schreiben(sha, daten):
    p = pfad(sha)
    if os.path.isfile(p) and os.path.getsize(p) == len(daten):
        return
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = f"{p}.{os.getpid()}.{threading.get_ident()}.teil"
    with open(tmp, "wb") as f:
        f.write(daten)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, p)


def ablegen(c, daten):
    """Inhalt in den Speicher legen. → Prüfsumme (der Verweis) oder None (Speicher aus / Schreiben misslungen → in die Datenbank)."""
    if daten is None or not an(c):
        return None
    daten = bytes(daten)
    sha = hashlib.sha256(daten).hexdigest()
    try:
        _schreiben(sha, daten)
    except OSError as e:
        fehler.still("kern", "Dateispeicher: Datei schreiben", e)
        return None
    c.execute("INSERT INTO bp_datei(sha, groesse, erstellt) VALUES(?,?,?) ON CONFLICT (sha) DO UPDATE SET frei_seit=''", (sha, len(daten), _jetzt()))
    return sha


def werte(c, daten):
    """Für INSERT/UPDATE: (Inhalt für die BYTEA-Spalte, Verweis für datei_ref) – eines von beiden ist None."""
    sha = ablegen(c, daten)
    return (None, sha) if sha else (daten, None)


def lesen(c, sha):
    try:
        with open(pfad(sha), "rb") as f:
            return f.read()
    except OSError:
        raise Fehlt(sha) from None


def inhalt(c, zeile, spalte="data"):
    """Inhalt einer Zeile, die die Spalten <spalte> und datei_ref trägt – gleich, wo er liegt. Leer → b""."""
    ref = zeile["datei_ref"] if "datei_ref" in zeile.keys() else None
    if ref:
        return lesen(c, ref)
    return bytes(zeile[spalte] or b"")


# ---------------------------------------------------------------- Einhängen in eine App
def einhaengen(app, name, tx):
    """Gleich nach dem Anlegen der App: Meldungen starten; eine fehlende Datei wird eine klare Meldung statt „Fehler 500“."""
    from flask import jsonify

    @app.errorhandler(Fehlt)
    def _fehlt(e):
        fehler.still(name, f"Dateispeicher: Datei {e.sha[:12]} fehlt", e)
        return jsonify(error=str(e)), 404
    anmelden(name, tx)


def anmelden(app, tx):
    """Beim Start jeder App: im Hintergrund alle MELDEN Sekunden melden, welche Kennung dieser Prozess im Laufwerk sieht."""
    def lauf():
        time.sleep(5)
        while True:
            try:
                with tx() as c:
                    _setze(c, f"dateien:app:{app}", json.dumps({"k": _marke(), "zeit": _jetzt()}))
            except Exception:   # noqa: BLE001 – Datenbank noch nicht bereit: beim nächsten Mal
                pass
            time.sleep(MELDEN)
    threading.Thread(target=lauf, daemon=True, name="dateien-melden").start()


# ---------------------------------------------------------------- Aufgaben der Dienste
def einrichten(c, zurueck=False):
    """Dienste beim Start: Ordner und Kennung anlegen. → True, wenn der Speicher steht.
    Fehlt die Kennung im Laufwerk, obwohl schon Dateien verzeichnet sind (Volume verloren, neuer Server), wird sie NICHT neu
    angelegt – erst nachdem die Dateien vom Dateiserver zurück sind (zurueck=True, bautagebuch/core/extern.py)."""
    os.makedirs(ORDNER, exist_ok=True)
    k, m = _lies(c, "dateien:kennung"), _marke()
    if k and m == k:
        return True
    if (k or m) and not zurueck and c.execute("SELECT 1 FROM bp_datei LIMIT 1").fetchone():
        _setze(c, "dateien:an", "")
        fehler.still("dienste", "Dateispeicher: Das Laufwerk passt nicht zur Datenbank (Kennung fehlt) – Dateien zurückholen")
        return False
    k = k or uuid.uuid4().hex
    with open(os.path.join(ORDNER, MARKE), "w", encoding="utf-8") as f:
        f.write(k)
    _setze(c, "dateien:kennung", k)
    return True


def meldungen(c):
    """→ {App: {k, zeit, ok}} – nur frische Meldungen."""
    k, grenze, out = _lies(c, "dateien:kennung"), (datetime.now() - timedelta(seconds=FRISCH)).isoformat(timespec="seconds"), {}
    for r in c.execute("SELECT key, data FROM bp_store WHERE key LIKE 'dateien:app:%'").fetchall():
        try:
            d = json.loads(r["data"])
        except ValueError:
            continue
        if (d.get("zeit") or "") >= grenze:
            out[r["key"][12:]] = dict(d, ok=bool(k) and d.get("k") == k)
    return out


def pruefen(c):
    """Schalter setzen: an nur, wenn die Dienste den Speicher sehen und jede frische Meldung die richtige Kennung trägt."""
    M = meldungen(c)
    ok = sieht(c) and len(M) >= 3 and all(x["ok"] for x in M.values())
    if (_lies(c, "dateien:an") == "1") != ok:
        _setze(c, "dateien:an", "1" if ok else "")
        if not ok:
            ohne = ", ".join(sorted(a for a, x in M.items() if not x["ok"])) or "zu wenige Meldungen"
            fehler.still("dienste", f"Dateispeicher ausgeschaltet – ohne Laufwerk: {ohne}")
    _an["bis"] = 0
    return ok


def umziehen(c, n=2):
    """Bis zu n vorhandene Zeilen je Tabelle (wenige: eine Datei hat bis 200 MB) aus der Datenbank in den Speicher. → Zahl der umgezogenen Zeilen."""
    if not an(c):
        return 0
    z = 0
    for t, pk, sp in TABELLEN:
        for r in c.execute(f"SELECT {pk} AS pk, {sp} AS d FROM {t} WHERE datei_ref IS NULL AND {sp} IS NOT NULL LIMIT ?", (n,)).fetchall():
            roh = bytes(r["d"])
            sha = ablegen(c, roh)
            if not sha:
                return z
            if hashlib.sha256(lesen(c, sha)).hexdigest() != sha:   # gegenlesen – erst dann den Inhalt aus der Datenbank nehmen
                fehler.still("dienste", f"Dateispeicher: Datei {sha[:12]} liest sich anders als geschrieben – Umzug angehalten")
                return z
            c.execute(f"UPDATE {t} SET datei_ref=?, {sp}=NULL WHERE {pk}=?", (sha, r["pk"]))
            z += 1
    return z


def aufraeumen(c):
    """Nachts: Dateien ohne Verweis vormerken und nach HALTEN Tagen löschen (nie, solange der Papierkorb sie nennt). → Zahl gelöschter."""
    if not sieht(c):
        return 0
    benutzt = " UNION ".join(f"SELECT datei_ref FROM {t} WHERE datei_ref IS NOT NULL" for t, _, _ in TABELLEN)
    c.execute(f"UPDATE bp_datei SET frei_seit='' WHERE frei_seit<>'' AND sha IN ({benutzt})")
    c.execute(f"UPDATE bp_datei SET frei_seit=? WHERE frei_seit='' AND sha NOT IN ({benutzt})", (_jetzt(),))
    grenze, weg = (datetime.now() - timedelta(days=HALTEN)).isoformat(timespec="seconds"), 0
    for r in c.execute("SELECT sha FROM bp_datei WHERE frei_seit<>'' AND frei_seit<?", (grenze,)).fetchall():
        if c.execute("SELECT 1 FROM bp_papierkorb WHERE data LIKE ? LIMIT 1", (f"%{r['sha']}%",)).fetchone():
            continue
        try:
            os.remove(pfad(r["sha"]))
        except FileNotFoundError:
            pass
        except OSError as e:
            fehler.still("dienste", "Dateispeicher: Datei löschen", e)
            continue
        c.execute("DELETE FROM bp_datei WHERE sha=?", (r["sha"],))
        weg += 1
    return weg


def stand(c):
    """Zahlen für die Verwaltung: {an, dateien, bytes, offen (noch in der Datenbank), apps}."""
    r = c.execute("SELECT COUNT(*) AS n, COALESCE(SUM(groesse), 0) AS b FROM bp_datei").fetchone()
    offen = sum(c.execute(f"SELECT COUNT(*) AS n FROM {t} WHERE datei_ref IS NULL AND {sp} IS NOT NULL").fetchone()["n"] for t, _, sp in TABELLEN)
    return {"an": _lies(c, "dateien:an") == "1", "dateien": r["n"], "bytes": int(r["b"]), "offen": offen, "apps": meldungen(c)}


def start(tx):
    """Dienste: alle 10 Minuten Schalter prüfen und umziehen (in kleinen Schritten), einmal je Nacht aufräumen."""
    def lauf():
        time.sleep(240)   # die Apps melden sich erst
        nacht = ""
        while True:
            try:
                with tx() as c:
                    ok = pruefen(c)
                for _ in range(200 if ok else 0):   # je Runde höchstens 200 Schritte – eigene Transaktion je Schritt
                    with tx() as c:
                        if not umziehen(c):
                            break
                    time.sleep(1)
                tag = datetime.now().strftime("%Y-%m-%d")
                if tag != nacht and datetime.now().hour >= 2:
                    nacht = tag
                    with tx() as c:
                        aufraeumen(c)
            except Exception as e:   # noqa: BLE001 – die übrigen Dienste laufen weiter
                fehler.still("dienste", "Dateispeicher prüfen / umziehen", e)
            time.sleep(MELDEN)
    threading.Thread(target=lauf, daemon=True, name="dateien").start()
