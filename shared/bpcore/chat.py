"""Chat in der Kopfleiste aller Apps (head.js → 💬): je App ein fester Raum und ein Gesamtchat für alle.

Die Räume sind fest angepinnt – niemand legt sie an oder löscht sie. Wer einen Raum sieht:
  gesamt           alle angemeldeten Benutzer
  <App-Schlüssel>  wer die App nutzen darf (sso.apps_of), Administratoren immer
  admin            nur Administratoren (Verwaltung)
Nachrichten liegen in chat_nachricht; chat_gelesen merkt je Benutzer und Raum die zuletzt gelesene Nachricht (Zahl am Knopf).
Die Oberfläche fragt bei offenem Chat alle paar Sekunden nur Neues ab (nach=<letzte id>), sonst selten die Übersicht.
"""
from datetime import datetime

from . import sso

GESAMT = "gesamt"
MAX_TEXT = 4000
SEITE = 80   # Nachrichten je Abruf (ältere über vor=<id>)


def _now():
    return datetime.now().isoformat(timespec="seconds")


def namen():
    return {GESAMT: "Gesamtchat", **dict(sso.APPS), "admin": "Verwaltung"}


def raeume(u):
    """Räume, die der Benutzer sieht – in fester Reihenfolge: Gesamtchat, dann die Apps wie im App-Umschalter."""
    if not u:
        return []
    erlaubt = set(sso.apps_of(u))
    out = [GESAMT] + [k for k, _ in sso.APPS if k in erlaubt]
    if u["is_admin"]:
        out.append("admin")
    return out


def darf(u, raum):
    return raum in raeume(u)


def name_von(u):
    k = set(u.keys()) if hasattr(u, "keys") else set()
    vn, nn = (u["vorname"] if "vorname" in k else "") or "", (u["nachname"] if "nachname" in k else "") or ""
    return f"{vn} {nn}".strip() or u["name"]


def _zeile(r, u):
    return {"id": r["id"], "raum": r["raum"], "uid": r["uid"], "name": r["name"], "text": r["text"], "projekt": r["projekt"] or "",
            "created": r["created"], "ich": r["uid"] == u["id"]}


def uebersicht(c, u):
    """Je Raum: Name, ungelesene Nachrichten (anderer), letzte Nachricht. Dazu die Summe für den Knopf."""
    rs = raeume(u)
    if not rs:
        return {"raeume": [], "ungelesen": 0}
    ph = ",".join("?" * len(rs))
    ung = {r["raum"]: r["n"] for r in c.execute(
        f"SELECT n.raum AS raum, COUNT(*) AS n FROM chat_nachricht n LEFT JOIN chat_gelesen g ON g.uid=? AND g.raum=n.raum "
        f"WHERE n.raum IN ({ph}) AND n.geloescht=0 AND (n.uid IS NULL OR n.uid<>?) AND n.id>COALESCE(g.bis,0) GROUP BY n.raum",
        (u["id"], *rs, u["id"]))}
    ids = [r["m"] for r in c.execute(
        f"SELECT MAX(id) AS m FROM chat_nachricht WHERE raum IN ({ph}) AND geloescht=0 GROUP BY raum", tuple(rs))]
    letzte = {}
    if ids:
        for r in c.execute(f"SELECT * FROM chat_nachricht WHERE id IN ({','.join('?' * len(ids))})", tuple(ids)):
            letzte[r["raum"]] = {"name": r["name"], "text": r["text"][:160], "created": r["created"], "ich": r["uid"] == u["id"]}
    nm = namen()
    out = [{"raum": k, "name": nm.get(k, k), "angepinnt": True, "ungelesen": int(ung.get(k, 0)), "letzte": letzte.get(k)} for k in rs]
    return {"raeume": out, "ungelesen": sum(x["ungelesen"] for x in out)}


def gelesen(c, u, raum, bis):
    if not bis:
        return
    r = c.execute("SELECT bis FROM chat_gelesen WHERE uid=? AND raum=?", (u["id"], raum)).fetchone()
    if r is None:
        c.execute("INSERT INTO chat_gelesen(uid, raum, bis) VALUES(?,?,?)", (u["id"], raum, int(bis)))
    elif int(r["bis"]) < int(bis):
        c.execute("UPDATE chat_gelesen SET bis=? WHERE uid=? AND raum=?", (int(bis), u["id"], raum))


def nachrichten(c, u, raum, nach=0, vor=0, ab=0, lesen=True):
    """Nachrichten eines Raums, älteste zuerst.
    nach=<id>  nur Neueres (Nachladen bei offenem Chat) · vor=<id> eine Seite Älteres · sonst die letzten SEITE.
    ab=<id>    älteste angezeigte Nachricht – dazu kommen die seither gelöschten ids, damit sie bei allen verschwinden."""
    if nach:
        rows = c.execute("SELECT * FROM chat_nachricht WHERE raum=? AND geloescht=0 AND id>? ORDER BY id LIMIT 500", (raum, int(nach))).fetchall()
        mehr = False
    else:
        bed, arg = ("AND id<?", (int(vor),)) if vor else ("", ())
        rows = c.execute(f"SELECT * FROM chat_nachricht WHERE raum=? AND geloescht=0 {bed} ORDER BY id DESC LIMIT ?", (raum, *arg, SEITE + 1)).fetchall()
        mehr = len(rows) > SEITE
        rows = list(reversed(rows[:SEITE]))
    weg = [r["id"] for r in c.execute("SELECT id FROM chat_nachricht WHERE raum=? AND geloescht=1 AND id>=?", (raum, int(ab)))] if ab else []
    out = [_zeile(r, u) for r in rows]
    if lesen and out and not vor:
        gelesen(c, u, raum, out[-1]["id"])
    return {"raum": raum, "name": namen().get(raum, raum), "nachrichten": out, "mehr": mehr, "geloescht": weg}


def senden(c, u, raum, text, projekt=""):
    text = (text or "").replace("\r\n", "\n").strip()
    if not text:
        raise ValueError("Bitte etwas schreiben.")
    if len(text) > MAX_TEXT:
        raise ValueError(f"Die Nachricht ist zu lang (höchstens {MAX_TEXT} Zeichen).")
    c.execute("INSERT INTO chat_nachricht(raum, uid, name, text, projekt, created) VALUES(?,?,?,?,?,?)",
              (raum, u["id"], name_von(u), text, (projekt or "")[:120], _now()))
    r = c.execute("SELECT * FROM chat_nachricht WHERE raum=? AND uid=? ORDER BY id DESC LIMIT 1", (raum, u["id"])).fetchone()
    gelesen(c, u, raum, r["id"])   # die eigene Nachricht zählt nicht als ungelesen
    return _zeile(r, u)


def loeschen(c, u, raum, nid):
    """Eigene Nachricht löschen (Administratoren: jede)."""
    r = c.execute("SELECT uid FROM chat_nachricht WHERE id=? AND raum=? AND geloescht=0", (int(nid), raum)).fetchone()
    if not r:
        raise LookupError("Nachricht nicht gefunden.")
    if r["uid"] != u["id"] and not u["is_admin"]:
        raise PermissionError("Nur eigene Nachrichten können gelöscht werden.")
    c.execute("UPDATE chat_nachricht SET geloescht=1 WHERE id=?", (int(nid),))
