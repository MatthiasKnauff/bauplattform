"""Ordner auf dem Dateiserver umbenennen, wenn eine App ihren Ordnernamen ändert (Einstellungen je App, bpcore/ablage_einst.py).

Die App merkt sich nur den Auftrag (bp_store „ablage:umbenennen“: key, alt, neu); hier – im Container „dienste“, der als einziger
den Dateiserver erreicht – wird er ausgeführt. Umbenannt wird nur, wo der alte Ordner da ist und der neue noch nicht; nichts wird
gelöscht oder überschrieben. Der Testserver liest die Ablage nur: dort bleibt der Auftrag mit einem Hinweis liegen.
"""
import threading
import time

from bpcore import ablage_einst, fehler

from . import bauportal, db, remote, settings, sync

_gestartet = False


def _umbenennen(t, alt, neu):
    """Einen Ordner (Pfad als Teile) umbenennen – 1, wenn es geklappt hat."""
    a, n = "/".join(alt), "/".join(neu)
    if a == n or not t.exists(a) or t.exists(n):
        return 0
    t.rename(a, n)
    return 1


def ausfuehren(j, conf, projekte=()):
    """Einen Auftrag ausführen; gibt die Zahl der umbenannten Ordner zurück."""
    k, alt, neu = j["key"], j["alt"], j["neu"]
    if k in ("ordner_wiki", "ordner_wiki_sicherung"):
        t = bauportal.ziel(conf)
        return _umbenennen(t, alt, neu) if t else 0
    t = remote.open_target(conf) if sync.enabled(conf) else None
    if not t:
        return 0
    n = 0
    if k == "ordner_personal":   # je Person: Büro/Personal/<Name>/<Ordner> – Zeile für Zeile, nur geänderte
        for p in t.listdir("Büro/Personal") if t.exists("Büro/Personal") else []:
            if p["dir"]:
                for a, b in zip(alt, neu):
                    if a != b:
                        n += _umbenennen(t, ["Büro", "Personal", p["name"], a], ["Büro", "Personal", p["name"], b])
    elif k == "ordner_bauherren":   # je Projektordner
        for p in projekte:
            try:
                teile = remote.clean_path(p["folder"] or "") or remote.find_project_path(t, sync.code_of(p), remote.clean(p["name"]))
            except Exception:   # noqa: BLE001 – Projektordner nicht gefunden: weiter
                continue
            if teile:
                n += _umbenennen(t, teile + alt, teile + neu)
    return n


def durchgang():
    with db.tx() as c:
        L = ablage_einst.auftraege(c)
        offen = [j for j in L if not j.get("fertig")]
        if not offen:
            return 0
        conf = settings.all(c)
        P = [dict(r) for r in c.execute("SELECT id, name, folder FROM projects ORDER BY id").fetchall()]
    if remote.NUR_LESEN:
        for j in offen:
            j.update(fertig=time.strftime("%Y-%m-%dT%H:%M:%S"), fehler="Testserver: die Ablage wird hier nur gelesen – umbenannt wird auf der Produktion.")
    for j in offen:
        if j.get("fertig"):
            continue
        try:
            j["anzahl"] = ausfuehren(j, conf, P)
        except Exception as e:   # noqa: BLE001 – als Text beim Auftrag zeigen
            j["fehler"] = sync._msg(e)[:300]
        j["fertig"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    with db.tx() as c:   # neue Aufträge, die inzwischen dazukamen, bleiben erhalten
        jetzt = ablage_einst.auftraege(c)
        erl = {(j["key"], j["wann"]): j for j in offen}
        ablage_einst.auftraege(c, [erl.get((j.get("key"), j.get("wann")), j) for j in jetzt][-30:])
    return len(offen)


def start():
    global _gestartet
    if _gestartet:
        return
    _gestartet = True

    def schleife():
        time.sleep(30)
        while True:
            try:
                durchgang()
            except Exception as e:   # noqa: BLE001
                fehler.still("dienste", "Ordner umbenennen", e)
            time.sleep(60)

    threading.Thread(target=schleife, daemon=True, name="ablage-umbenennen").start()
