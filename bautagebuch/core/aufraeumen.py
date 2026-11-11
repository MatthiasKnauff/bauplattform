"""Nachts den Dateiserver aufräumen: alte Stände der Bautagebuch-Ablage („…_old1.pdf“, Fototag-Ordner „…_old1“).

Beim erneuten Export benennt die Ablage das vorhandene PDF und den Fotoordner des Tages in „…_old1“, „…_old2“ … um
(sync._rotate_old). Einmal pro Nacht werden je Bericht und Tag nur die neuesten Stände behalten:
- so viele wie in den Einstellungen bei „… behalten“ eingetragen,
- steht dort 0 (= alle behalten), gilt für die Nacht „store_auto_keep“ (Vorgabe 2).
Ausschalten: Einstellung „store_auto_cleanup“ = 0 (Bautagebuch → Einstellungen → Ablage).
Testserver (TESTSERVER=1): läuft nicht – die Ablage wird dort nur gelesen.
Ergebnis der letzten Nacht in bp_store „ablage:aufraeumen“ (angezeigt in den Einstellungen)."""
import json
import threading
import time
from datetime import datetime

from bpcore import fehler
from . import db, remote, settings, sync

KEY = "ablage:aufraeumen"


def an(conf):
    return str(conf.get("store_auto_cleanup", "1")) != "0"


def nachts_conf(conf):
    """Einstellungen für den nächtlichen Lauf: 0 (= alle behalten) wird durch store_auto_keep ersetzt."""
    k = sync._keep(conf, "store_auto_keep") or 2
    c2 = dict(conf)
    for key in ("store_keep_old_pdf", "store_keep_old_photos"):
        if not sync._keep(conf, key):
            c2[key] = str(k)
    return c2


def laufen():
    """Ein Durchgang über alle Projekte mit Berichten. → Ergebnis (wie sync.alte_staende) oder None, wenn nichts zu tun ist."""
    if remote.NUR_LESEN:
        return None
    with db.tx() as c:
        if not c.execute("SELECT pg_try_advisory_xact_lock(hashtext('ablage:aufraeumen')) AS ok").fetchone()["ok"]:
            return None
        conf = settings.all(c)
        if not sync.enabled(conf) or not an(conf):
            return None
        P = c.execute("SELECT id, name, folder FROM projects ORDER BY name").fetchall()
        D = {}
        for r in c.execute("SELECT DISTINCT project_id, date FROM reports").fetchall():
            D.setdefault(r["project_id"], []).append(r["date"])
    res = sync.alte_staende(nachts_conf(conf), [(p, D.get(p["id"], [])) for p in P if D.get(p["id"])], True)
    merken({"zeit": time.strftime("%Y-%m-%dT%H:%M:%S"), "geloescht": res["geloescht"], "pdf": res["pdf"], "fotos": res["fotos"],
            "fehler": res["fehler"], "behalten": res["behalten"]})
    return res


def merken(d):
    with db.tx() as c:
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?, ?, ?, 'dienste') "
                  "ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated=excluded.updated, updated_by=excluded.updated_by",
                  (KEY, json.dumps(d), d["zeit"]))


def letzter():
    with db.tx() as c:
        r = c.execute("SELECT data FROM bp_store WHERE key=?", (KEY,)).fetchone()
    try:
        return json.loads(r["data"]) if r else None
    except ValueError:
        return None


_started = False


def start(stunde=2):
    """Hintergrund: täglich ab 2 Uhr einmal aufräumen."""
    global _started
    if _started:
        return
    _started = True

    def loop():
        done = ""
        while True:
            time.sleep(600)
            now = datetime.now()
            if now.hour >= stunde and done != now.date().isoformat():
                done = now.date().isoformat()
                try:
                    laufen()
                except Exception as e:   # noqa: BLE001 – Server nicht erreichbar o. ä.: nächste Nacht wieder
                    fehler.still("dienste", "Dateiserver nachts aufräumen", e)
    threading.Thread(target=loop, daemon=True, name="aufraeumen").start()
