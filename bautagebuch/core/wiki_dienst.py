"""Wiki in den Diensten (besprochen am 13.11.2026): stündlich nachsehen –
  PDF      das ganze Wiki als PDF in „Pläne & Dateien“ → Projekt „Büro“ → „Wiki“ (nur wenn sich etwas geändert hat; nicht auf dem Testserver)
  Woche    montags ab 6 Uhr einmal je Woche die neuen Erkenntnisse von der KI im Büro (Ollama) zusammenfassen lassen – als Vorschlag,
           den jemand in der App „Wiki“ übernimmt oder verwirft (nichts wird ohne Bestätigung geändert)
Die Regeln stehen in bpcore/wiki.py."""
import threading
import time
from datetime import datetime

from bpcore import ai, fehler, wiki

from . import buero_doku, db

_gestartet = False


def pdf_ablegen():
    with db.tx() as c:
        if not c.execute("SELECT 1 FROM wiki_eintrag WHERE deleted='' LIMIT 1").fetchone():
            return "Wiki leer"
        md = wiki.markdown(c)
    return buero_doku.pdf_ablegen("buero:wiki", md, "Wiki", "Wiki des Büros.pdf", "Wiki des Büros", "Wiki")


def woche():
    """Montags: Vorschlag vorbereiten, wenn es Neues gibt, noch keiner offen ist und die KI im Büro bereit ist."""
    jetzt = datetime.now()
    kw = "%d-%02d" % jetzt.isocalendar()[:2]
    if jetzt.weekday() != 0 or jetzt.hour < 6:
        return "nicht Montag früh"
    with db.tx() as c:
        r = c.execute("SELECT data FROM bp_store WHERE key='wiki:woche:zuletzt'").fetchone()
        if (r and r["data"] == f'"{kw}"') or wiki.woche_offen(c) or not c.execute(
                "SELECT 1 FROM wiki_eintrag WHERE deleted='' AND status='neu' LIMIT 1").fetchone():
            return "nichts zu tun"
        wiki._store(c, "wiki:woche:zuletzt", kw)
    if "ollama" in ai.abgeschaltet() or not ai.ollama_state()["ok"]:
        return "KI im Büro nicht bereit"
    with db.tx() as c:
        V = wiki.woche_vorschlag(c, "ollama")
    return f"Vorschlag für {len(V['eintraege'])} Einträge"


def start():
    global _gestartet
    if _gestartet:
        return
    _gestartet = True

    def schleife():
        time.sleep(120)   # erst die übrigen Dienste hochkommen lassen
        while True:
            for name, f in (("Wiki als PDF ablegen", pdf_ablegen), ("Wiki: Woche zusammenfassen", woche)):
                try:
                    f()
                except Exception as e:   # noqa: BLE001 – nächste Runde
                    fehler.still("dienste", name, e)
            time.sleep(3600)

    threading.Thread(target=schleife, daemon=True, name="wiki").start()
