"""Bauherrenportal im Container „dienste“ (beschlossen am 15.11.2026): im eingestellten Takt (Vorgabe jede Minute) neue Freigaben und
Konten zum Portal schicken und den Eingangskorb abholen (bpcore/bauherren.py: abgleich). Der Kern baut die Verbindung immer selbst auf –
das Portal kann das Büro nicht erreichen. Anmeldelinks verschickt der Kern mit dem Mailzugang des Büros."""
import os
import threading
import time

from bpcore import bauherren, fehler, mail

from . import db

_gestartet = False


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
    mail.send(cf, [an], betreff, text)


def durchgang():
    try:
        return bauherren.abgleich(db.tx, _mail)
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
