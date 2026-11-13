"""Wiki in den Diensten (besprochen am 13.11.2026). Alle 30 Sekunden nachsehen, sonst stündlich:
  Auftrag  „Sammeln“ aus Verwaltung → Einstellungen → Wiki im Hintergrund abarbeiten – Mängel und Weisungen der Bautagebücher, auf Wunsch
           Mails der Person, die gestartet hat, und Dokumente aus den Projektordnern (Protokolle, Rügen, Bedenken, Nachträge, Abnahmen);
           runde für runde an die KI, Stand in bp_store „wiki:sammeln“; am Ende ein To-do für die Person – auch wenn niemand mehr zusieht
  PDF      das ganze Wiki als PDF in „Pläne & Dateien“ → Projekt „Büro“ → „Wiki“ (nur wenn sich etwas geändert hat; nicht auf dem Testserver)
  Sammeln  montags ab 5 Uhr Mängel und Weisungen der Bautagebücher (letzte 2 Wochen) mit der KI im Büro auf Erkenntnisse durchsehen lassen
  Woche    montags ab 6 Uhr einmal je Woche die neuen Erkenntnisse zusammenfassen lassen – als Vorschlag, den jemand in der App übernimmt
Die Regeln stehen in bpcore/wiki.py. Aus den Projektordnern wird nur gelesen."""
import hashlib
import json
import re
import threading
import time
from datetime import datetime

from bpcore import ai, fehler, skizze, wiki

from . import buero_doku, db, remote

_gestartet = False
RUNDE = 25   # Quellen je Anfrage an die KI – kleiner = Antwort kürzer und sicher vollständig
DOK = re.compile(r"protokoll|besprechung|mangel|mängel|maengel|rüge|ruege|bedenken|behinderung|nachtrag|abnahme|schaden|reklamation|gutachten", re.I)
ENDUNG = (".pdf", ".docx", ".txt", ".eml")


def pdf_ablegen():
    with db.tx() as c:
        if not c.execute("SELECT 1 FROM wiki_eintrag WHERE deleted='' LIMIT 1").fetchone():
            return "Wiki leer"
        md = wiki.markdown(c)
    return buero_doku.pdf_ablegen("buero:wiki", md, "Wiki", "Wiki des Büros.pdf", "Wiki des Büros", "Wiki")


def _ki_bereit():
    return "ollama" not in ai.abgeschaltet() and ai.ollama_state()["ok"]


def sammeln():
    """Montags ab 5 Uhr: neue Mängel und Weisungen der letzten 2 Wochen, je Stunde eine Runde (ohne Mails)."""
    jetzt = datetime.now()
    if jetzt.weekday() != 0 or jetzt.hour < 5 or not _ki_bereit():
        return "nicht jetzt"
    with db.tx() as c:
        r = wiki.sammeln(c, None, "ollama", 2, False)
    return f"{r['neu']} neue aus {r['gelesen']} Quellen"


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
    if not _ki_bereit():
        return "KI im Büro nicht bereit"
    with db.tx() as c:
        V = wiki.woche_vorschlag(c, "ollama")
    return f"Vorschlag für {len(V['eintraege'])} Einträge"


# ---------- Dokumente aus den Projektordnern ----------
def quellen_ordner(seit, da, stand):
    """Dokumente der laufenden Projekte, geändert seit …, deren Name nach Protokoll, Mangel, Rüge, Bedenken, Nachtrag, Abnahme klingt →
    (Quellen mit dem Anfang des Textes, Fehler). Die Dateiliste kommt aus „Alle Dateien“ (nachts eingelesen), sonst wird der Ordner gelesen."""
    from bpcore import ablage as AB, vorschau as V
    from modules.alle_dateien import _ziel_conf, scan
    ab = datetime.combine(seit, datetime.min.time()).timestamp()
    with db.tx() as c:
        P = c.execute("SELECT id, name FROM projects WHERE archived=0 ORDER BY id").fetchall()
    Q, fehler_ = [], []
    for n, p in enumerate(P):
        stand(f"Projektordner {n + 1} von {len(P)}: {p['name'][:40]}")
        try:
            t, base = _ziel_conf(p["id"])
            if not t:
                continue
            with db.tx() as c:
                s = V.scan_laden(c, p["id"])
            dateien = ((s or {}).get("res") or {}).get("dateien") if s else None
            if dateien is None:
                dateien = (scan(t, base) or {}).get("dateien") or []
            for pfad, groesse, mtime in dateien:
                name = pfad.rsplit("/", 1)[-1]
                if (mtime or 0) < ab or not name.lower().endswith(ENDUNG) or not DOK.search(name) or (groesse or 0) > 15 * 1048576:
                    continue
                k = "d" + hashlib.sha1(f"{p['id']}|{pfad}|{mtime}".encode()).hexdigest()[:14]
                if k in da:
                    continue
                try:
                    daten = t.read("/".join(base + remote.clean_path(pfad)), 15 * 1048576)   # derselbe Weg wie die Vorschaubilder („Alle Dateien“)
                    text = _text(AB, V, daten, name)
                except Exception as e:   # noqa: BLE001 – Datei überspringen
                    fehler_.append(f"{name}: {str(e)[-120:]}")
                    continue
                text = " ".join((text or "").split())[:1200]
                if len(text) < 40:
                    continue
                Q.append({"k": k, "pid": p["id"], "quelle": f"Projektordner {p['name'][:30]}: {name[:70]}",
                          "zeile": f"({p['name'][:50]}, Dokument „{name[:80]}“, {datetime.fromtimestamp(mtime).date()}) {text}"})
        except Exception as e:   # noqa: BLE001 – nächstes Projekt
            fehler_.append(f"{p['name'][:40]}: {str(e)[:100]}")
    return Q, fehler_


def _text(AB, V, daten, name):
    n = name.lower()
    if n.endswith(".pdf"):
        return AB.text_aus(daten, name)   # erste Seiten, Scans per Texterkennung
    if n.endswith(".docx"):
        import io, zipfile
        z = zipfile.ZipFile(io.BytesIO(daten))
        return " ".join(V._absaetze(z.open("word/document.xml").read(3 * 1048576).decode("utf-8", "replace"), r"</w:p>", r"<w:t[^>]*>(.*?)</w:t>")[:80])
    return daten[:20000].decode("utf-8", "replace")


def auftrag():
    """Ein „Sammeln“ aus der Verwaltung abarbeiten (Status wartet → läuft → fertig/fehler)."""
    with db.tx() as c:
        A = wiki.auftrag(c)
        if A.get("status") != "wartet":
            return "kein Auftrag"
        u = c.execute("SELECT * FROM users WHERE id=?", (A.get("uid"),)).fetchone()
        wiki.auftrag_stand(c, status="laeuft", beginn=wiki._jetzt(), schritt="Quellen werden zusammengestellt")
    neu, gelesen, fehl = 0, 0, []
    try:
        seit = wiki._seit(A.get("wochen"))
        stand = lambda t: _stand(schritt=t)   # noqa: E731
        with db.tx() as c:
            da = wiki._gesammelt(c)
            Q = wiki.quellen_bautagebuch(c, seit, da)
            ki = wiki.ki_von(c, u)
            if A.get("mails") and u is not None:
                stand("Mails werden gelesen")
                M, f = wiki.quellen_mails(c, u, seit, da)
                Q += M
                fehl += f
        if A.get("ordner"):
            D, f = quellen_ordner(seit, da, stand)
            Q += D
            fehl += f[:20]
        _stand(gesamt=len(Q), fehler=fehl[:20])
        for i in range(0, len(Q), RUNDE):
            if wiki_abgebrochen():
                break
            _stand(schritt=f"Die KI liest {i + 1}–{min(len(Q), i + RUNDE)} von {len(Q)}")
            try:   # eine Runde, die nicht klappt (KI überlastet, Antwort unlesbar), hält die übrigen nicht auf
                with db.tx() as c:
                    neu += wiki.auswerten(c, u, ki, Q[i:i + RUNDE])
            except ai.AIError as e:
                fehl.append(f"Runde {i // RUNDE + 1}: {e}")
                _stand(fehler=fehl[-20:])
            gelesen = min(len(Q), i + RUNDE)
            _stand(gelesen=gelesen, neu=neu)
        _stand(status="fertig", ende=wiki._jetzt(), schritt="fertig")
    except Exception as e:   # noqa: BLE001
        fehler.still("dienste", "Wiki sammeln", e)
        _stand(status="fehler", ende=wiki._jetzt(), schritt=str(e)[:200])
    if u is not None:   # Bescheid als To-do für die Person, die gestartet hat
        jetzt = wiki._jetzt()
        with db.tx() as c:
            c.execute("""INSERT INTO todo(titel, notiz, project_id, faellig, prio, personen, mail, erinnerung, status, erstellt, erstellt_von, erstellt_name, geaendert)
                         VALUES(?,?,NULL,?,0,?,0,'','offen',?,?,?,?)""",
                      (f"Wiki: {neu} neue Erkenntnis{'' if neu == 1 else 'se'} gesammelt – bitte durchsehen", f"Gelesen: {gelesen} Quellen."
                       + (f" Hinweise: {'; '.join(fehl[:3])}" if fehl else ""), jetzt[:10], json.dumps([u["id"]]), jetzt, u["id"], skizze.name_von(u), jetzt))
    return f"{neu} neue aus {gelesen}"


def _stand(**kw):
    with db.tx() as c:
        wiki.auftrag_stand(c, **kw)


def wiki_abgebrochen():
    with db.tx() as c:
        return wiki.auftrag(c).get("status") == "abgebrochen"


def start():
    global _gestartet
    if _gestartet:
        return
    _gestartet = True

    def schleife():
        time.sleep(60)   # erst die übrigen Dienste hochkommen lassen
        zuletzt = 0.0
        while True:
            try:
                auftrag()
            except Exception as e:   # noqa: BLE001
                fehler.still("dienste", "Wiki: Auftrag sammeln", e)
            if time.time() - zuletzt > 3600:
                zuletzt = time.time()
                for name, f in (("Wiki als PDF ablegen", pdf_ablegen), ("Wiki: aus Bautagebüchern sammeln", sammeln), ("Wiki: Woche zusammenfassen", woche)):
                    try:
                        f()
                    except Exception as e:   # noqa: BLE001 – nächste Runde
                        fehler.still("dienste", name, e)
            time.sleep(30)

    threading.Thread(target=schleife, daemon=True, name="wiki").start()
