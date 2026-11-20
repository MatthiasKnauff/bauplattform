"""Bauherrenportal im Container „dienste“ (beschlossen am 15.11.2026): im eingestellten Takt (Vorgabe jede Minute) neue Freigaben und
Konten zum Portal schicken und den Eingangskorb abholen (bpcore/bauherren.py: abgleich). Der Kern baut die Verbindung immer selbst auf –
das Portal kann das Büro nicht erreichen. Anmeldelinks verschickt der Kern mit dem Mailzugang des Büros."""
import os
import threading
import time

from bpcore import bauherren, fehler, mail

from . import db, remote, settings, sync

_gestartet = False
ORDNER = "Von Bauherrschaft"   # Vorgabe; eingestellt im Bauherrenportal → Ablage (ordner_bauherren) („Bauherr:in“ geht nicht: der Doppelpunkt ist in Windows-Freigaben verboten)


def _ablegen(pid, name, data):
    """Datei einer Bauherr:in in „Pläne & Dateien / Projekt / Von Bauherrschaft“ – mit Datum und Uhrzeit vorn, nichts wird überschrieben.
    Testserver oder keine Ablage: nur im Büro gespeichert (bh_datei), Rückgabe ''."""
    if remote.NUR_LESEN:
        return ""
    with db.tx() as c:
        conf = settings.all(c)
        p = c.execute("SELECT id, name, folder FROM projects WHERE id=?", (pid,)).fetchone()
    if not p or not sync.enabled(conf):
        return ""
    t = remote.open_target(conf)
    teile = remote.clean_path(p["folder"] or "") or remote.find_project_path(t, sync.code_of(p), remote.clean(p["name"]))
    from bpcore import ablage_einst
    rel = "/".join(teile + ablage_einst.ordner(conf, "ordner_bauherren") + [remote.clean(time.strftime("%Y-%m-%d %H%M ") + name)[:180]])
    t.put_bytes(data, rel)
    return rel


def _mail(an, betreff, text):
    if os.environ.get("TESTSERVER") == "1":   # Testserver verschickt keine Mails: Anmeldelink in der Verwaltung zeigen (die letzten 10)
        with db.tx() as c:
            L = (bauherren._store(c, "bauherren:testmails") or [])[-9:]
            bauherren._store(c, "bauherren:testmails", L + [{"zeit": time.strftime("%Y-%m-%dT%H:%M:%S"), "an": an, "betreff": betreff, "text": text}])
        return
    with db.tx() as c:
        cf = mail.conf(c)
    if not an or not mail.configured(cf):
        raise RuntimeError("Mailversand nicht eingerichtet")
    mail.direkt(cf, [an], betreff, text)


def durchgang():
    try:
        return bauherren.abgleich(db.tx, _mail, _ablegen)
    except Exception as e:   # noqa: BLE001 – Portal nicht erreichbar: Stand merken, nächster Takt
        with db.tx() as c:
            alt = bauherren._store(c, "bauherren:stand") or {}
            bauherren._store(c, "bauherren:stand", {**alt, "fehler": str(e)[:300], "fehler_zeit": time.strftime("%Y-%m-%dT%H:%M:%S")})
        return {"fehler": str(e)}


def start():
    global _gestartet
    if _gestartet:
        return
    _gestartet = True

    def schleife():
        time.sleep(45)
        while True:
            takt = 60
            try:
                with db.tx() as c:
                    takt = bauherren.einst(c)["takt"]
                durchgang()
            except Exception as e:   # noqa: BLE001
                fehler.still("dienste", "Bauherrenportal", e)
            time.sleep(takt)

    threading.Thread(target=schleife, daemon=True, name="bauherren").start()
