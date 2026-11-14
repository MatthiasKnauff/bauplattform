"""Wiki in Runden (besprochen am 14.11.2026, Mock „Wiki-Ablauf in Runden“).

  1 Sammeln        die ganze Runde (Länge einstellbar, Vorgabe 1 Woche) mit der KI im Büro – Bautagebücher, Projektordner, „Erkenntnis fürs Wiki“
                   aus jeder App → Status „neu“. Nichts verlässt das Büro.
  2 Vorsichten     zu Beginn der nächsten Runde (Tag und Uhrzeit einstellbar) bekommt eine Rolle (z. B. Assistenz) die Funde: behalten oder Unsinn
                   → „vorsicht“ → „auswerten“ bzw. gelöscht. Abschaltbar.
  3 Auswerten      die behaltenen Funde gehen an die gewählte KI (extern: anonymisiert, ai.py) – zusammenführen, einordnen. Vorher auf Wunsch
                   „Jetzt senden?“: durch die Person, die vorgesichtet hat, oder durch eine Rolle. Abschaltbar.
  4 Fachlich prüfen  verteilt an Personen mit dem Recht „wiki.pruefen“: Projektleitung des Projekts → zuständig fürs Kapitel → zufällig.
                   Je Eintrag: ins Wiki (geprüft) · korrigieren · löschen · warten (kommt in der nächsten Runde wieder zur selben Person).
Stand der Runde in bp_store „wiki:runde“, Einstellungen in „wiki:runde:einst“. Die Dienste rufen takt() auf (bautagebuch/core/wiki_dienst.py),
die To-dos der Startseite kommen aus todo.py (Regel „wiki“)."""
import json
import random
from datetime import datetime

from . import rechte

EINST = {"tage": 7, "tag": 0, "stunde": 7, "bt": True, "ordner": True, "vorsicht": True, "vorsicht_rolle": "assistenz", "auswerten": True, "ki": "ollama",
         "bestaetigen": "vorsicht", "bestaetigen_rolle": "gf", "zustaendig": {}}
BESTAETIGEN = ("aus", "vorsicht", "rolle")   # vor dem Senden an die KI: niemand · wer vorgesichtet hat · eine Rolle
RUNDE, EIN = "wiki:runde", "wiki:runde:einst"


def _jetzt():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def _lesen(c, key, d):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (key,)).fetchone()
    try:
        v = json.loads(r["data"]) if r else None
    except ValueError:
        v = None
    return v if isinstance(v, dict) else d


def _schreiben(c, key, v):
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?, ?, ?, 'wiki') "
              "ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated=excluded.updated, updated_by=excluded.updated_by",
              (key, json.dumps(v, ensure_ascii=False), _jetzt()))


def einst(c):
    E = {**EINST, **_lesen(c, EIN, {})}
    E["zustaendig"] = {str(k): int(v) for k, v in (E.get("zustaendig") or {}).items() if str(v).isdigit()}
    return E


def einst_setzen(c, b):
    from . import ai
    E = einst(c)
    for k, v in (b or {}).items():
        if k in ("tage", "tag", "stunde"):
            lo, hi = {"tage": (1, 62), "tag": (0, 6), "stunde": (0, 23)}[k]
            try:
                E[k] = max(lo, min(hi, int(v)))
            except (TypeError, ValueError):
                raise ValueError("Bitte eine Zahl.")
        elif k in ("bt", "ordner", "vorsicht", "auswerten"):
            E[k] = bool(v)
        elif k in ("vorsicht_rolle", "bestaetigen_rolle"):
            if not c.execute("SELECT 1 FROM rollen WHERE key=?", (str(v),)).fetchone():
                raise ValueError("Unbekannte Rolle.")
            E[k] = str(v)
        elif k == "bestaetigen":
            if v not in BESTAETIGEN:
                raise ValueError("Unbekannte Einstellung.")
            E[k] = v
        elif k == "ki":
            if v not in ai.KEYS or v == "intern":
                raise ValueError("Unbekannte KI.")
            E[k] = v
        elif k == "zustaendig" and isinstance(v, dict):
            E[k] = {str(t)[:80]: int(u) for t, u in v.items() if str(u).isdigit() and int(u) > 0}
    _schreiben(c, EIN, E)
    return E


def runde(c):
    return {"nr": 0, "stufe": "sammeln", "beginn": "", "vorgelegt": "", **_lesen(c, RUNDE, {})}


def _stufe(c, **kw):
    R = runde(c)
    R.update(kw)
    _schreiben(c, RUNDE, R)
    return R


def faellig(c, jetzt=None):
    """Ist es Zeit, die Runde vorzulegen? Ab der eingestellten Stunde; bei Wochen-Runden am eingestellten Wochentag, sonst „tage“ nach der letzten Vorlage."""
    jetzt = jetzt or datetime.now()
    E, R = einst(c), runde(c)
    woche = E["tage"] % 7 == 0
    if jetzt.hour < E["stunde"] or (woche and jetzt.weekday() != E["tag"]):
        return False
    try:
        zuletzt = datetime.fromisoformat(R["vorgelegt"]).date() if R["vorgelegt"] else None
    except ValueError:
        zuletzt = None
    return zuletzt is None or (jetzt.date() - zuletzt).days >= (E["tage"] - 1 if woche else E["tage"])


def vorlegen(c):
    """Beginn der nächsten Runde: was gesammelt wurde, geht zum Vorsichten (oder gleich weiter); Zurückgestelltes kommt wieder."""
    E, R = einst(c), runde(c)
    nr = int(R.get("nr") or 0) + 1
    c.execute("UPDATE wiki_eintrag SET warten=0 WHERE warten<>0 AND warten<=?", (nr,))
    c.execute("UPDATE wiki_eintrag SET status=?, updated=? WHERE deleted='' AND status='neu' AND kapitel<>'Wochen'",
              ("vorsicht" if E["vorsicht"] else "auswerten", _jetzt()))
    _stufe(c, nr=nr, beginn=_jetzt(), vorgelegt=_jetzt(), stufe="vorsicht" if E["vorsicht"] else "weiter", gesichtet_von=None)
    if not E["vorsicht"]:
        nach_vorsicht(c, None)
    return runde(c)


def zahl(c, status):
    return c.execute("SELECT count(*) AS n FROM wiki_eintrag WHERE deleted='' AND status=?", (status,)).fetchone()["n"]


def darf_vorsichten(c, u):
    E = einst(c)
    return bool(u) and ((u["rolle"] if "rolle" in u.keys() else "") == E["vorsicht_rolle"] or rechte.hat(u, "wiki.pruefen") or rechte.hat(u, "verwaltung"))


def vorsicht_setzen(c, u, eid, behalten):
    if not darf_vorsichten(c, u):
        raise PermissionError("Vorsichten darf die eingestellte Rolle (Verwaltung → Einstellungen → Wiki).")
    r = c.execute("SELECT status FROM wiki_eintrag WHERE id=? AND deleted=''", (eid,)).fetchone()
    if not r or r["status"] not in ("vorsicht", "auswerten"):
        raise LookupError("Eintrag nicht in der Vorsichtung.")
    if behalten:
        c.execute("UPDATE wiki_eintrag SET status='auswerten', updated=? WHERE id=?", (_jetzt(), eid))
    else:
        c.execute("UPDATE wiki_eintrag SET deleted=?, updated=? WHERE id=?", (_jetzt(), _jetzt(), eid))


def vorsicht_fertig(c, u):
    """„Fertig“: alle übrigen behalten und weiter zur Auswertung."""
    if not darf_vorsichten(c, u):
        raise PermissionError("Vorsichten darf die eingestellte Rolle (Verwaltung → Einstellungen → Wiki).")
    c.execute("UPDATE wiki_eintrag SET status='auswerten', updated=? WHERE deleted='' AND status='vorsicht'", (_jetzt(),))
    _stufe(c, gesichtet_von=u["id"])
    return nach_vorsicht(c, u)


def nach_vorsicht(c, u):
    E = einst(c)
    if not zahl(c, "auswerten"):
        return _stufe(c, stufe="pruefen")
    if not E["auswerten"]:   # Stufe 3 ausgelassen: so wie gesichtet in die fachliche Prüfung
        c.execute("UPDATE wiki_eintrag SET status='zusammengefasst', updated=? WHERE deleted='' AND status='auswerten'", (_jetzt(),))
        verteilen(c)
        return _stufe(c, stufe="pruefen")
    if E["bestaetigen"] == "aus":
        return _stufe(c, stufe="auswerten")
    return _stufe(c, stufe="bestaetigen")


def darf_bestaetigen(c, u):
    E, R = einst(c), runde(c)
    if not u:
        return False
    if E["bestaetigen"] == "rolle":
        return (u["rolle"] if "rolle" in u.keys() else "") == E["bestaetigen_rolle"] or rechte.hat(u, "verwaltung")
    return R.get("gesichtet_von") in (None, u["id"]) and darf_vorsichten(c, u) or rechte.hat(u, "verwaltung")


def bestaetigen(c, u):
    if runde(c)["stufe"] != "bestaetigen":
        raise ValueError("Es wartet nichts auf die Bestätigung.")
    if not darf_bestaetigen(c, u):
        raise PermissionError("Bestätigen darf die eingestellte Person bzw. Rolle (Verwaltung → Einstellungen → Wiki).")
    return _stufe(c, stufe="auswerten", bestaetigt_von=u["id"], bestaetigt=_jetzt())


def auswerten(c, ki):
    """Stufe 3 (Dienste): die behaltenen Funde an die KI – zusammenführen und einordnen, dann verteilen. Externe KI: anonymisiert (ai.py)."""
    from . import wiki
    ids = [r["id"] for r in c.execute("SELECT id FROM wiki_eintrag WHERE deleted='' AND status='auswerten' ORDER BY id LIMIT 60")]
    if not ids:
        return _stufe(c, stufe="pruefen")
    wiki.woche_vorschlag(c, ki, "auswerten")
    wiki.woche_uebernehmen(c, None, None, "auswerten")
    c.execute("UPDATE wiki_eintrag SET status='zusammengefasst', updated=? WHERE deleted='' AND status='auswerten' AND id IN (" + ",".join("?" * len(ids)) + ")",
              (_jetzt(), *ids))   # was die KI nicht erfasst hat, geht so in die Prüfung
    if zahl(c, "auswerten"):
        return runde(c)   # mehr als 60: die nächste Portion beim nächsten Takt
    verteilen(c)
    return _stufe(c, stufe="pruefen", ausgewertet=_jetzt())


def _pruefer(c):
    return [u for u in c.execute("SELECT * FROM users WHERE active=1").fetchall() if rechte.hat(u, "wiki.pruefen")]


def verteilen(c):
    """Fachliche Prüfung verteilen: Projektleitung des Projekts → zuständig fürs Kapitel → zufällig (nur Personen mit „wiki.pruefen“)."""
    P = _pruefer(c)
    ids = {u["id"] for u in P}
    if not ids:
        return 0
    zust = einst(c)["zustaendig"]
    n = 0
    for e in c.execute("SELECT id, kapitel, projekt_id FROM wiki_eintrag WHERE deleted='' AND status='zusammengefasst' AND pruefer IS NULL AND kapitel<>'Wochen'").fetchall():
        wer = None
        if e["projekt_id"]:
            p = c.execute("SELECT leaders FROM projects WHERE id=?", (e["projekt_id"],)).fetchone()
            try:
                L = json.loads(p["leaders"] or "[]") if p and isinstance(p["leaders"], str) else (p["leaders"] if p else []) or []
            except ValueError:
                L = []
            wer = next((int(x) for x in L if str(x).isdigit() and int(x) in ids), None)
        if wer is None and zust.get(e["kapitel"]) in ids:
            wer = zust[e["kapitel"]]
        if wer is None:
            wer = random.choice(sorted(ids))
        c.execute("UPDATE wiki_eintrag SET pruefer=? WHERE id=?", (wer, e["id"]))
        n += 1
    return n


def pruefen(c, u, eid, aktion):
    """Stufe 4: ok (ins Wiki) · loeschen · warten (nächste Runde wieder) · neu (an jemand anderen – zufällig)."""
    from . import wiki
    if not wiki.darf_pruefen(u):
        raise PermissionError("Fachlich prüfen darf nur, wer das Recht „Wiki prüfen“ hat.")
    r = c.execute("SELECT status FROM wiki_eintrag WHERE id=? AND deleted=''", (eid,)).fetchone()
    if not r:
        raise LookupError("Eintrag nicht gefunden")
    j = _jetzt()
    if aktion == "ok":
        c.execute("UPDATE wiki_eintrag SET status='geprueft', warten=0, updated=? WHERE id=?", (j, eid))
    elif aktion == "loeschen":
        c.execute("UPDATE wiki_eintrag SET deleted=?, updated=? WHERE id=?", (j, j, eid))
    elif aktion == "warten":
        c.execute("UPDATE wiki_eintrag SET warten=?, pruefer=COALESCE(pruefer, ?), updated=? WHERE id=?", (int(runde(c)["nr"] or 0) + 1, u["id"], j, eid))
    elif aktion == "zurueck":   # Rückgängig von ok/warten
        c.execute("UPDATE wiki_eintrag SET status='zusammengefasst', warten=0, updated=? WHERE id=?", (j, eid))
    else:
        raise ValueError("Unbekannte Aktion.")


def stand(c, u):
    """Für die App: Runde, Zahlen je Stufe, was diese Person jetzt tun kann."""
    R, E = runde(c), einst(c)
    nr = int(R.get("nr") or 0)
    meine = c.execute("SELECT count(*) AS n FROM wiki_eintrag WHERE deleted='' AND status='zusammengefasst' AND pruefer=? AND kapitel<>'Wochen' AND (warten=0 OR warten<=?)",
                      (u["id"], nr)).fetchone()["n"] if u else 0
    return {"runde": R, "einst": {k: E[k] for k in ("tage", "tag", "stunde", "vorsicht", "auswerten", "bestaetigen", "ki")},
            "zahl": {s: zahl(c, s) for s in ("neu", "vorsicht", "auswerten", "zusammengefasst")}, "meine": meine,
            "darf_vorsichten": darf_vorsichten(c, u), "darf_bestaetigen": R["stufe"] == "bestaetigen" and darf_bestaetigen(c, u)}


def todos(c, u):
    """To-dos der Startseite (Regel „wiki“): je Stufe eines – eine Sache, ein Eintrag."""
    R, E = runde(c), einst(c)
    nr = int(R.get("nr") or 0)
    out = []
    rolle = u["rolle"] if "rolle" in u.keys() else ""
    nv = zahl(c, "vorsicht")
    if nv and rolle == E["vorsicht_rolle"]:
        out.append(("vorsicht", f"Wiki: {nv} Fund{'' if nv == 1 else 'e'} vorsichten", "behalten oder Unsinn – danach wertet die KI aus", "wiki:#ber=vorsicht"))
    if R["stufe"] == "bestaetigen" and darf_bestaetigen(c, u):
        na = zahl(c, "auswerten")
        out.append(("bestaetigen", f"Wiki: {na} Fund{'' if na == 1 else 'e'} an die KI senden?", f"Auswertung mit {E['ki']} – extern anonymisiert", "wiki:#ber=auswerten"))
    m = c.execute("SELECT count(*) AS n FROM wiki_eintrag WHERE deleted='' AND status='zusammengefasst' AND pruefer=? AND kapitel<>'Wochen' AND (warten=0 OR warten<=?)", (u["id"], nr)).fetchone()["n"]
    if m:
        out.append(("pruefen", f"Wiki: {m} Eintr{'ag' if m == 1 else 'äge'} fachlich prüfen", "ins Wiki · korrigieren · löschen · warten", "wiki:#ber=meine"))
    return out, R.get("vorgelegt") or ""
