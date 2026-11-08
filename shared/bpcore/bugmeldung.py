"""Bug-Meldungen der Kolleg:innen (Knopf 🐞 in der Kopfleiste aller Apps).

Jede Meldung: Text des Benutzers, optional ein Bildschirmfoto, dazu automatisch gesammelte Angaben
(App, Adresse, Projekt, Browser, Fenstergröße, Version, letzte Fehler im Browser und fehlgeschlagene Anfragen).
Beim Herunterladen (Verwaltung → System → Bug-Meldungen) kommen noch die Serverfehler dieses Benutzers
aus der Zeit um die Meldung dazu – alles in einer ZIP mit bug-meldungen.md und den Bildern, gedacht zum
Weitergeben an die Entwicklung (z. B. Claude). Die Daten bleiben in der Büro-Datenbank, nie im Repo.
"""
import base64
import io
import json
import re
import zipfile
from datetime import datetime, timedelta

_ok = {"tabelle": False}
MAX_BILD = 6 * 1024 * 1024   # Bytes nach dem Dekodieren


def _tabelle(c):
    if _ok["tabelle"]:
        return
    c.execute("""CREATE TABLE IF NOT EXISTS bp_bug(id SERIAL PRIMARY KEY, ts TEXT NOT NULL DEFAULT '', user_name TEXT NOT NULL DEFAULT '',
                 app TEXT NOT NULL DEFAULT '', text TEXT NOT NULL DEFAULT '', kontext TEXT NOT NULL DEFAULT '{}',
                 bild TEXT NOT NULL DEFAULT '', bild_typ TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'offen', notiz TEXT NOT NULL DEFAULT '')""")
    _ok["tabelle"] = True


def _s(v, n):
    return str(v or "").strip()[:n]


def anlegen(c, u, b, browser=""):
    """Neue Meldung. Gibt die id zurück oder wirft ValueError mit einer verständlichen Meldung."""
    _tabelle(c)
    text = _s(b.get("text"), 8000)
    if len(text) < 3:
        raise ValueError("Bitte kurz beschreiben, was passiert ist.")
    bild, typ = "", ""
    roh = b.get("bild") or ""
    if roh:
        m = re.match(r"^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$", roh)
        if not m:
            raise ValueError("Das Bild konnte nicht gelesen werden (nur PNG, JPEG oder WebP).")
        try:
            daten = base64.b64decode(m.group(2), validate=False)
        except Exception:
            raise ValueError("Das Bild konnte nicht gelesen werden.")
        if len(daten) > MAX_BILD:
            raise ValueError("Das Bild ist zu groß (höchstens 6 MB).")
        sig = {"png": b"\x89PNG", "jpeg": b"\xff\xd8", "webp": b"RIFF"}[m.group(1)]
        if not daten.startswith(sig):
            raise ValueError("Das Bild konnte nicht gelesen werden.")
        bild, typ = base64.b64encode(daten).decode(), m.group(1)
    k = b.get("kontext") if isinstance(b.get("kontext"), dict) else {}
    for feld in ("klicks", "anfragen", "fehler", "zustand"):   # zu viel? erst die langen Listen kürzen
        if len(json.dumps(k, ensure_ascii=False)) <= 60000:
            break
        k.pop(feld, None)
    if len(json.dumps(k, ensure_ascii=False)) > 60000:
        k = {x: _s(k.get(x), 500) for x in ("url", "titel", "projekt", "version")}
    k["browser"] = _s(browser, 400)
    jetzt = datetime.now().isoformat(timespec="seconds")
    return c.execute("INSERT INTO bp_bug(ts, user_name, app, text, kontext, bild, bild_typ) VALUES(?,?,?,?,?,?,?) RETURNING id",
                     (jetzt, _s(u.get("name"), 120), _s(b.get("app"), 60), text, json.dumps(k, ensure_ascii=False), bild, typ)).fetchone()["id"]


def liste(c):
    _tabelle(c)
    out = []
    for r in c.execute("SELECT id, ts, user_name, app, text, kontext, bild_typ, status, notiz FROM bp_bug ORDER BY id DESC LIMIT 500").fetchall():
        d = r.dict()
        try:
            d["kontext"] = json.loads(d["kontext"] or "{}")
        except ValueError:
            d["kontext"] = {}
        out.append(d)
    return out


def offen(c):
    _tabelle(c)
    r = c.execute("SELECT COUNT(*) AS n FROM bp_bug WHERE status='offen'").fetchone()
    return r["n"] if r else 0


def bild(c, i):
    _tabelle(c)
    r = c.execute("SELECT bild, bild_typ FROM bp_bug WHERE id=?", (int(i),)).fetchone()
    if not r or not r["bild"]:
        return None, None
    return base64.b64decode(r["bild"]), "image/" + r["bild_typ"]


def aktion(c, b):
    _tabelle(c)
    if isinstance(b.get("weg"), int):
        c.execute("DELETE FROM bp_bug WHERE id=?", (b["weg"],))
    elif isinstance(b.get("id"), int):
        if b.get("status") in ("offen", "erledigt"):
            c.execute("UPDATE bp_bug SET status=? WHERE id=?", (b["status"], b["id"]))
        if "notiz" in b:
            c.execute("UPDATE bp_bug SET notiz=? WHERE id=?", (_s(b.get("notiz"), 2000), b["id"]))
    elif b.get("alle_erledigt"):
        c.execute("UPDATE bp_bug SET status='erledigt' WHERE status='offen'")


def _serverfehler(c, user_name, ts):
    """Fehler (Server/Browser/still) dieses Benutzers – oder ohne Benutzer – in den 30 Minuten vor bis 5 nach der Meldung."""
    try:
        from . import fehler
        fehler._tabelle(c)
        t = datetime.fromisoformat(ts)
        von, bis = (t - timedelta(minutes=30)).isoformat(timespec="seconds"), (t + timedelta(minutes=5)).isoformat(timespec="seconds")
        return [r.dict() for r in c.execute("""SELECT app, art, meldung, stack, pfad, user_name, anzahl, zuletzt FROM bp_fehler
                    WHERE zuletzt BETWEEN ? AND ? AND (user_name=? OR user_name='') ORDER BY zuletzt DESC LIMIT 15""", (von, bis, user_name)).fetchall()]
    except Exception:
        return []


def _md(d, sf, bildname):
    k = d["kontext"] or {}
    z = [f"## Meldung #{d['id']} – {d['app'] or '?'} – {d['status']}", "",
         f"- **Von:** {d['user_name']} · **Zeit:** {d['ts'].replace('T', ' ')}",
         f"- **Adresse:** `{k.get('url', '')}`"]
    for key, label in (("titel", "Seitentitel"), ("projekt", "Projekt"), ("modus", "Ansicht"), ("version", "Version"),
                       ("fenster", "Fenster"), ("browser", "Browser"), ("zustand", "Zustand der App")):
        if k.get(key):
            v = k[key]
            z.append(f"- **{label}:** " + (f"`{json.dumps(v, ensure_ascii=False)}`" if isinstance(v, (dict, list)) else str(v)))
    if bildname:
        z.append(f"- **Bildschirmfoto:** [{bildname}]({bildname})")
    z += ["", "### Beschreibung", "", d["text"], ""]
    if d.get("notiz"):
        z += ["### Notiz der Verwaltung", "", d["notiz"], ""]
    if k.get("fehler"):
        z += ["### Fehler im Browser (zuletzt auf dieser Seite)", "", "```"] + [f"{x.get('t', '')} {x.get('m', '')}\n{x.get('s', '')}".rstrip() for x in k["fehler"][-15:]] + ["```", ""]
    if k.get("anfragen"):
        z += ["### Fehlgeschlagene Anfragen", "", "```"] + [f"{x.get('t', '')} {x.get('methode', 'GET')} {x.get('url', '')} → {x.get('status', '')} {x.get('text', '')}".rstrip() for x in k["anfragen"][-15:]] + ["```", ""]
    if k.get("klicks"):
        z += ["### Letzte Schritte (Klicks)", "", "```"] + [f"{x.get('t', '')} {x.get('was', '')}" for x in k["klicks"][-20:]] + ["```", ""]
    if sf:
        z += ["### Serverfehler um diese Zeit", "", "```"]
        for x in sf:
            z.append(f"{x['zuletzt']} [{x['app']}/{x['art']}] {x['pfad']} {x['meldung']} (×{x['anzahl']})")
            if x.get("stack"):
                z.append("\n".join(x["stack"].strip().splitlines()[-12:]))
        z += ["```", ""]
    return "\n".join(z)


def export(c, ids=None, nur_offen=True):
    """ZIP mit bug-meldungen.md und den Bildschirmfotos."""
    _tabelle(c)
    q = "SELECT * FROM bp_bug"
    if ids:
        q += " WHERE id IN (" + ",".join(str(int(i)) for i in ids) + ")"
    elif nur_offen:
        q += " WHERE status='offen'"
    rows = c.execute(q + " ORDER BY id").fetchall()
    buf = io.BytesIO()
    teile = [f"# Bug-Meldungen ({len(rows)})", "",
             f"Exportiert {datetime.now().strftime('%d.%m.%Y %H:%M')}. Jede Meldung enthält die Beschreibung der Kollegin/des Kollegen, "
             "automatisch gesammelte Angaben aus dem Browser und die Serverfehler dieses Benutzers um diese Zeit.", ""]
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for r in rows:
            d = r.dict()
            try:
                d["kontext"] = json.loads(d["kontext"] or "{}")
            except ValueError:
                d["kontext"] = {}
            name = ""
            if d["bild"]:
                name = f"bilder/bug-{d['id']}.{'jpg' if d['bild_typ'] == 'jpeg' else d['bild_typ']}"
                z.writestr(name, base64.b64decode(d["bild"]))
            teile += [_md(d, _serverfehler(c, d["user_name"], d["ts"]), name), "---", ""]
        z.writestr("bug-meldungen.md", "\n".join(teile))
    return buf.getvalue(), len(rows)
