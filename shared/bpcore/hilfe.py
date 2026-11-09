"""Hilfe & Fehler (🐞? in der Kopfleiste aller Apps): Fragen per Nachricht an die Helfer und Live-Hilfe mit geteiltem Bildschirm.

Tabellen (Büro-Datenbank, nie im Repo):
  bp_hilfe       eine Anfrage – art 'frage' (Nachricht mit Foto) oder 'live' (Bildschirm teilen),
                 status offen → laeuft (ein Helfer hat übernommen) → erledigt/beendet
  bp_hilfe_msg   der Verlauf (Nachrichten beider Seiten)
  bp_hilfe_live  nur das jeweils letzte Bild der Live-Hilfe samt Zeiger – wird beim Beenden gelöscht,
                 nichts davon wird aufbewahrt

Wer hilft: Benutzer-IDs unter dem Schlüssel hilfe:helfer (Verwaltung → System → Hilfe-Anfragen); ohne Eintrag alle aktiven Admins.
Fernsteuern gibt es nicht – der Helfer sieht, zeigt (roter Zeiger mit Text) und schreibt.
"""
import base64
import json
import re
from datetime import datetime

from . import konto

_ok = {"tabelle": False}
MAX_BILD = 6 * 1024 * 1024        # Foto zur Frage
MAX_LIVE = 1536 * 1024            # ein Live-Bild (JPEG)
ARTEN = {"frage": "Frage", "live": "Live-Hilfe"}
STATUS = {"offen": "offen", "laeuft": "in Arbeit", "erledigt": "erledigt", "beendet": "beendet"}


def _tabelle(c):
    if _ok["tabelle"]:
        return
    c.execute("""CREATE TABLE IF NOT EXISTS bp_hilfe(id SERIAL PRIMARY KEY, art TEXT NOT NULL DEFAULT 'frage', ts TEXT NOT NULL DEFAULT '',
                 user_id INTEGER, user_name TEXT NOT NULL DEFAULT '', app TEXT NOT NULL DEFAULT '', projekt TEXT NOT NULL DEFAULT '',
                 text TEXT NOT NULL DEFAULT '', kontext TEXT NOT NULL DEFAULT '{}', bild TEXT NOT NULL DEFAULT '', bild_typ TEXT NOT NULL DEFAULT '',
                 status TEXT NOT NULL DEFAULT 'offen', helfer_id INTEGER, helfer_name TEXT NOT NULL DEFAULT '',
                 geaendert TEXT NOT NULL DEFAULT '', gelesen_user INTEGER NOT NULL DEFAULT 0, gelesen_helfer INTEGER NOT NULL DEFAULT 0)""")
    c.execute("""CREATE TABLE IF NOT EXISTS bp_hilfe_msg(id SERIAL PRIMARY KEY, hilfe_id INTEGER NOT NULL, ts TEXT NOT NULL DEFAULT '',
                 user_id INTEGER, user_name TEXT NOT NULL DEFAULT '', text TEXT NOT NULL DEFAULT '')""")
    c.execute("""CREATE TABLE IF NOT EXISTS bp_hilfe_live(hilfe_id INTEGER PRIMARY KEY, seq INTEGER NOT NULL DEFAULT 0, ts TEXT NOT NULL DEFAULT '',
                 bild TEXT NOT NULL DEFAULT '', zeiger TEXT NOT NULL DEFAULT '', zseq INTEGER NOT NULL DEFAULT 0)""")
    _ok["tabelle"] = True


def _s(v, n):
    return str(v or "").strip()[:n]


def _jetzt():
    return datetime.now().isoformat(timespec="seconds")


def _bild(roh, grenze):
    """data:-URL prüfen (PNG/JPEG/WebP, Signatur, Größe) → (base64, typ) oder ValueError."""
    if not roh:
        return "", ""
    m = re.match(r"^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$", roh)
    if not m:
        raise ValueError("Das Bild konnte nicht gelesen werden (nur PNG, JPEG oder WebP).")
    try:
        daten = base64.b64decode(m.group(2), validate=False)
    except Exception:
        raise ValueError("Das Bild konnte nicht gelesen werden.")
    if len(daten) > grenze:
        raise ValueError("Das Bild ist zu groß.")
    if not daten.startswith({"png": b"\x89PNG", "jpeg": b"\xff\xd8", "webp": b"RIFF"}[m.group(1)]):
        raise ValueError("Das Bild konnte nicht gelesen werden.")
    return base64.b64encode(daten).decode(), m.group(1)


# ---------- Helfer ----------
def helfer_ids(c):
    """Eingestellte Helfer – ohne Einstellung alle aktiven Admins."""
    try:
        ids = [int(x) for x in json.loads(konto._get(c, "hilfe:helfer") or "[]")]
    except (ValueError, TypeError):
        ids = []
    aktiv = {r["id"] for r in c.execute("SELECT id FROM users WHERE active=1").fetchall()}
    ids = [x for x in ids if x in aktiv]
    if not ids:
        ids = [r["id"] for r in c.execute("SELECT id FROM users WHERE active=1 AND is_admin=1 ORDER BY id").fetchall()]
    return ids


def helfer_setzen(c, ids, by=""):
    konto._put(c, "hilfe:helfer", json.dumps([int(x) for x in ids if str(x).isdigit() or isinstance(x, int)]), by)


def ist_helfer(c, u):
    return bool(u) and (bool(u["is_admin"]) or u["id"] in helfer_ids(c))


def benutzer(c):
    from .skizze import name_von
    return [{"id": r["id"], "name": name_von(r), "email": r["email"] or "", "admin": bool(r["is_admin"])}
            for r in c.execute("SELECT * FROM users WHERE active=1 ORDER BY lower(name)").fetchall()]


def helfer_mails(c, ohne=None):
    ids = [x for x in helfer_ids(c) if x != ohne]
    if not ids:
        return []
    rows = c.execute(f"SELECT email FROM users WHERE id IN ({','.join('?' * len(ids))}) AND active=1", tuple(ids)).fetchall()
    return [r["email"].strip() for r in rows if (r["email"] or "").strip()]


# ---------- Anfragen ----------
def _zeile(r, U=None):
    d = {k: r[k] for k in ("id", "art", "ts", "user_id", "user_name", "app", "projekt", "text", "status", "helfer_id", "helfer_name", "geaendert")}
    d["bild"] = bool(r["bild_typ"])
    d["art_name"], d["status_name"] = ARTEN.get(r["art"], r["art"]), STATUS.get(r["status"], r["status"])
    return d


def anlegen(c, u, b, browser=""):
    """Neue Anfrage (frage oder live). Gibt die Zeile zurück oder wirft ValueError."""
    from .skizze import name_von
    _tabelle(c)
    art = "live" if b.get("art") == "live" else "frage"
    text = _s(b.get("text"), 8000)
    if art == "frage" and len(text) < 3:
        raise ValueError("Bitte die Frage kurz beschreiben.")
    bild, typ = _bild(b.get("bild") or "", MAX_BILD)
    k = b.get("kontext") if isinstance(b.get("kontext"), dict) else {}
    for feld in ("klicks", "anfragen", "fehler", "zustand"):
        if len(json.dumps(k, ensure_ascii=False)) <= 60000:
            break
        k.pop(feld, None)
    k["browser"] = _s(browser, 400)
    jetzt = _jetzt()
    r = c.execute("""INSERT INTO bp_hilfe(art, ts, user_id, user_name, app, projekt, text, kontext, bild, bild_typ, status, geaendert)
                     VALUES(?,?,?,?,?,?,?,?,?,?,'offen',?) RETURNING *""",
                  (art, jetzt, u["id"], _s(name_von(u), 120), _s(b.get("app"), 60), _s(k.get("projekt"), 200), text,
                   json.dumps(k, ensure_ascii=False), bild, typ, jetzt)).fetchone()
    if text:
        c.execute("INSERT INTO bp_hilfe_msg(hilfe_id, ts, user_id, user_name, text) VALUES(?,?,?,?,?)", (r["id"], jetzt, u["id"], _s(name_von(u), 120), text))
    if art == "live":
        c.execute("INSERT INTO bp_hilfe_live(hilfe_id, seq, ts) VALUES(?,0,?) ON CONFLICT (hilfe_id) DO UPDATE SET seq=0, bild='', zeiger='', zseq=0, ts=EXCLUDED.ts", (r["id"], jetzt))
    return _zeile(r)


def darf(c, u, hid):
    """Zeile, wenn u Fragesteller, Helfer oder Admin ist – sonst None."""
    _tabelle(c)
    r = c.execute("SELECT * FROM bp_hilfe WHERE id=?", (hid,)).fetchone()
    if not r:
        return None
    if r["user_id"] == u["id"] or ist_helfer(c, u):
        return r
    return None


def meine(c, u):
    """Eigene Anfragen (neueste zuerst) mit Zahl ungelesener Antworten."""
    _tabelle(c)
    out = []
    for r in c.execute("SELECT * FROM bp_hilfe WHERE user_id=? ORDER BY id DESC LIMIT 100", (u["id"],)).fetchall():
        d = _zeile(r)
        d["neu"] = c.execute("SELECT count(*) AS n FROM bp_hilfe_msg WHERE hilfe_id=? AND id>? AND user_id<>?", (r["id"], r["gelesen_user"], u["id"])).fetchone()["n"]
        d["letzte"] = _letzte(c, r["id"])
        out.append(d)
    return out


def fuer_helfer(c, u, alle=False):
    """Anfragen, die Helfer sehen: offene und laufende (alle=True: auch erledigte, für die Verwaltung)."""
    _tabelle(c)
    q = "SELECT * FROM bp_hilfe ORDER BY id DESC LIMIT 500" if alle else "SELECT * FROM bp_hilfe WHERE status IN ('offen','laeuft') ORDER BY id DESC LIMIT 200"
    out = []
    for r in c.execute(q).fetchall():
        d = _zeile(r)
        d["neu"] = c.execute("SELECT count(*) AS n FROM bp_hilfe_msg WHERE hilfe_id=? AND id>? AND user_id=?", (r["id"], r["gelesen_helfer"], r["user_id"])).fetchone()["n"]
        d["letzte"] = _letzte(c, r["id"])
        out.append(d)
    return out


def _letzte(c, hid):
    m = c.execute("SELECT ts, user_name, text FROM bp_hilfe_msg WHERE hilfe_id=? ORDER BY id DESC LIMIT 1", (hid,)).fetchone()
    return {"ts": m["ts"], "von": m["user_name"], "text": m["text"][:200]} if m else None


def lesen(c, u, r, seit=0):
    """Anfrage + Verlauf; merkt sich, bis wohin gelesen wurde."""
    d = _zeile(r)
    try:
        d["kontext"] = json.loads(r["kontext"] or "{}")
    except ValueError:
        d["kontext"] = {}
    msgs = c.execute("SELECT id, ts, user_id, user_name, text FROM bp_hilfe_msg WHERE hilfe_id=? AND id>? ORDER BY id", (r["id"], int(seit or 0))).fetchall()
    d["nachrichten"] = [{"id": m["id"], "ts": m["ts"], "von": m["user_name"], "von_id": m["user_id"], "ich": m["user_id"] == u["id"], "text": m["text"]} for m in msgs]
    letzte = c.execute("SELECT max(id) AS m FROM bp_hilfe_msg WHERE hilfe_id=?", (r["id"],)).fetchone()["m"] or 0
    spalte = "gelesen_user" if r["user_id"] == u["id"] else "gelesen_helfer"
    if letzte > r[spalte]:
        c.execute(f"UPDATE bp_hilfe SET {spalte}=? WHERE id=?", (letzte, r["id"]))
    return d


def nachricht(c, u, r, text):
    """Antwort/Nachricht anhängen. Antwortet ein Helfer auf eine offene Frage, übernimmt er sie."""
    from .skizze import name_von
    text = _s(text, 8000)
    if not text:
        raise ValueError("Bitte einen Text eingeben.")
    jetzt = _jetzt()
    m = c.execute("INSERT INTO bp_hilfe_msg(hilfe_id, ts, user_id, user_name, text) VALUES(?,?,?,?,?) RETURNING id",
                  (r["id"], jetzt, u["id"], _s(name_von(u), 120), text)).fetchone()
    if r["user_id"] != u["id"] and r["status"] == "offen":
        c.execute("UPDATE bp_hilfe SET status='laeuft', helfer_id=?, helfer_name=?, geaendert=?, gelesen_helfer=? WHERE id=?", (u["id"], _s(name_von(u), 120), jetzt, m["id"], r["id"]))
    else:
        spalte = "gelesen_user" if r["user_id"] == u["id"] else "gelesen_helfer"
        c.execute(f"UPDATE bp_hilfe SET geaendert=?, {spalte}=? WHERE id=?", (jetzt, m["id"], r["id"]))
    return m["id"]


def status(c, u, r, neu):
    """offen/laeuft/erledigt/beendet – 'laeuft' heißt: dieser Helfer übernimmt (nur einer)."""
    from .skizze import name_von
    if neu not in STATUS:
        raise ValueError("Unbekannter Stand.")
    jetzt = _jetzt()
    if neu == "laeuft":
        if r["user_id"] == u["id"]:
            raise ValueError("Die eigene Anfrage kann man nicht übernehmen.")
        if r["status"] == "laeuft" and r["helfer_id"] not in (None, u["id"]):
            raise ValueError(f"{r['helfer_name']} hilft bereits.")
        if r["status"] in ("erledigt", "beendet"):
            raise ValueError("Die Anfrage ist schon abgeschlossen.")
        c.execute("UPDATE bp_hilfe SET status='laeuft', helfer_id=?, helfer_name=?, geaendert=? WHERE id=?", (u["id"], _s(name_von(u), 120), jetzt, r["id"]))
    elif neu == "offen":
        c.execute("UPDATE bp_hilfe SET status='offen', geaendert=? WHERE id=?", (jetzt, r["id"]))
    else:
        c.execute("UPDATE bp_hilfe SET status=?, geaendert=? WHERE id=?", (neu, jetzt, r["id"]))
    if neu in ("erledigt", "beendet", "offen"):
        c.execute("DELETE FROM bp_hilfe_live WHERE hilfe_id=?", (r["id"],))   # Live-Bilder nie aufbewahren


def loeschen(c, hid):
    _tabelle(c)
    c.execute("DELETE FROM bp_hilfe_live WHERE hilfe_id=?", (hid,))
    c.execute("DELETE FROM bp_hilfe_msg WHERE hilfe_id=?", (hid,))
    c.execute("DELETE FROM bp_hilfe WHERE id=?", (hid,))


def bild(c, hid):
    _tabelle(c)
    r = c.execute("SELECT bild, bild_typ FROM bp_hilfe WHERE id=?", (hid,)).fetchone()
    if not r or not r["bild"]:
        return None, ""
    return base64.b64decode(r["bild"]), "image/" + r["bild_typ"]


# ---------- Live ----------
def live_bild_setzen(c, r, roh):
    """Der Hilfesuchende schickt das aktuelle Bild (JPEG) – nur das letzte wird behalten. Gibt den neuen Zähler zurück."""
    b64, typ = _bild(roh, MAX_LIVE)
    if typ != "jpeg":
        raise ValueError("Live-Bilder bitte als JPEG.")
    x = c.execute("""INSERT INTO bp_hilfe_live(hilfe_id, seq, ts, bild) VALUES(?,1,?,?)
                     ON CONFLICT (hilfe_id) DO UPDATE SET seq=bp_hilfe_live.seq+1, ts=EXCLUDED.ts, bild=EXCLUDED.bild RETURNING seq""",
                  (r["id"], _jetzt(), b64)).fetchone()
    return x["seq"]


def live_stand(c, r):
    """Zeiger und Zähler (für beide Seiten), ohne das Bild."""
    x = c.execute("SELECT seq, ts, zeiger, zseq FROM bp_hilfe_live WHERE hilfe_id=?", (r["id"],)).fetchone()
    if not x:
        return {"seq": 0, "zeiger": None, "zseq": 0, "ts": ""}
    try:
        z = json.loads(x["zeiger"]) if x["zeiger"] else None
    except ValueError:
        z = None
    return {"seq": x["seq"], "zeiger": z, "zseq": x["zseq"], "ts": x["ts"]}


def live_bild(c, r, seit=0):
    """Das letzte Bild für den Helfer – None, wenn sich seit `seit` nichts geändert hat."""
    x = c.execute("SELECT seq, ts, bild FROM bp_hilfe_live WHERE hilfe_id=?", (r["id"],)).fetchone()
    if not x or x["seq"] <= int(seit or 0) or not x["bild"]:
        return None
    return {"seq": x["seq"], "ts": x["ts"], "bild": "data:image/jpeg;base64," + x["bild"]}


def zeiger_setzen(c, r, z):
    """Roter Zeiger des Helfers: {x, y} in Prozent des Bildes, optional text; None löscht ihn."""
    if z:
        try:
            z = {"x": max(0.0, min(100.0, float(z.get("x")))), "y": max(0.0, min(100.0, float(z.get("y")))), "text": _s(z.get("text"), 120)}
        except (TypeError, ValueError):
            raise ValueError("Zeiger ohne Position.")
    c.execute("""INSERT INTO bp_hilfe_live(hilfe_id, seq, ts, zeiger, zseq) VALUES(?,0,?,?,1)
                 ON CONFLICT (hilfe_id) DO UPDATE SET zeiger=EXCLUDED.zeiger, zseq=bp_hilfe_live.zseq+1""",
              (r["id"], _jetzt(), json.dumps(z) if z else ""))


# ---------- Mail ----------
def mail_text(cf, r, u_name, text, antwort=False):
    url = (cf.get("app_url") or "").rstrip("/")
    link = f"{url}/#hilfe={r['id']}" if url else ""
    kopf = (f"{u_name} hat auf deine Hilfe-Anfrage geantwortet" if antwort else
            f"{u_name} bittet um {'Live-Hilfe (Bildschirm teilen)' if r['art'] == 'live' else 'Hilfe'}")
    wo = " · ".join(x for x in (r["app"], r["projekt"]) if x)
    body = f"{kopf}{' – ' + wo if wo else ''}.\n\n{text}\n\n" + (f"Antworten im Bauportal: {link}\n" if link else "Antworten im Bauportal über 🐞? in der Kopfleiste.\n")
    return f"Bauportal-Hilfe: {kopf}", body
