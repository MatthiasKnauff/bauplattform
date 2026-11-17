"""Datenbank des Bauherrenportals: SQLite unter /data (BH_DB). Nur freigegebene Kopien aus dem Büro und die Konten der Bauherr:innen.

Pakete kommen vom Kern (sync) und werden ersetzt, nie hier bearbeitet. Geht etwas verloren, schickt der Kern alles neu.
Seit 16.11.2026: Bereiche je Projekt an/aus (vom Kern; was aus ist, zeigt das Portal nicht), PDFs/Bilder an Paketen (Tabelle datei),
Dateien von Bauherr:innen (eingang art „datei“, Inhalt in eingang_datei – nach dem Abholen gelöscht).
"""
import base64, json, os, re, sqlite3, time

BEREICHE = ("gebaeude", "tagesbericht", "termine", "kosten", "plan", "rechnung", "maengel", "foto", "info", "upload", "nachricht")
VORGABE_AUS = {"kosten", "rechnung"}   # wie im Kern (bpcore/bauherren.py), solange er für das Projekt noch nichts geschickt hat
HOCH = {"pdf": "application/pdf", "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "heic": "image/heic",
        "doc": "application/msword", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls": "application/vnd.ms-excel", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
HOCH_MAX = 50 * 1024 * 1024   # je Datei
HOCH_PROJEKT = 1024 * 1024 * 1024   # je Projekt, solange nicht abgeholt
from contextlib import contextmanager

PFAD = os.environ.get("BH_DB") or os.path.join(os.environ.get("DATA_DIR", "/data"), "bauherren.db")


@contextmanager
def tx():
    os.makedirs(os.path.dirname(PFAD) or ".", exist_ok=True)
    c = sqlite3.connect(PFAD, timeout=20, isolation_level=None)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA foreign_keys=ON")
    c.execute("BEGIN IMMEDIATE")
    try:
        yield c
        c.execute("COMMIT")
    except BaseException:
        c.execute("ROLLBACK")
        raise
    finally:
        c.close()


def einrichten(c):
    for sql in """
    CREATE TABLE IF NOT EXISTS konto (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL DEFAULT '', pw TEXT NOT NULL DEFAULT '',
        totp TEXT NOT NULL DEFAULT '', totp_neu TEXT NOT NULL DEFAULT '', aktiv INTEGER NOT NULL DEFAULT 1, erstellt REAL NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS konto_projekt (konto INTEGER NOT NULL REFERENCES konto(id) ON DELETE CASCADE, pid TEXT NOT NULL, PRIMARY KEY (konto, pid));
    CREATE TABLE IF NOT EXISTS sitzung (hash TEXT PRIMARY KEY, konto INTEGER NOT NULL REFERENCES konto(id) ON DELETE CASCADE, ablauf REAL NOT NULL,
        geraet TEXT NOT NULL DEFAULT '', offen_code INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS einmal (hash TEXT PRIMARY KEY, konto INTEGER, zweck TEXT NOT NULL, ablauf REAL NOT NULL, geheim TEXT NOT NULL DEFAULT '',
        erlaubt INTEGER);
    CREATE TABLE IF NOT EXISTS projekt (pid TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS paket (id TEXT PRIMARY KEY, pid TEXT NOT NULL, art TEXT NOT NULL DEFAULT '', titel TEXT NOT NULL DEFAULT '',
        stand TEXT NOT NULL DEFAULT '', daten TEXT NOT NULL DEFAULT '{}', erhalten REAL NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS paket_pid ON paket (pid);
    CREATE TABLE IF NOT EXISTS eingang (id INTEGER PRIMARY KEY, art TEXT NOT NULL, pid TEXT NOT NULL DEFAULT '', daten TEXT NOT NULL DEFAULT '{}',
        konto INTEGER, zeit REAL NOT NULL, abgeholt REAL);
    CREATE TABLE IF NOT EXISTS datei (paket TEXT NOT NULL, nr INTEGER NOT NULL, name TEXT NOT NULL DEFAULT '', mime TEXT NOT NULL DEFAULT '',
        inhalt BLOB, PRIMARY KEY (paket, nr));
    CREATE TABLE IF NOT EXISTS eingang_datei (eingang INTEGER PRIMARY KEY, inhalt BLOB);
    CREATE TABLE IF NOT EXISTS einst (key TEXT PRIMARY KEY, wert TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS besuch (konto INTEGER NOT NULL, pid TEXT NOT NULL, vorher REAL NOT NULL DEFAULT 0, zuletzt REAL NOT NULL DEFAULT 0, PRIMARY KEY (konto, pid));
    """.split(";"):   # einzeln – executescript würde die laufende Transaktion beenden
        if sql.strip():
            c.execute(sql)
    sp = [r["name"] for r in c.execute("PRAGMA table_info(projekt)").fetchall()]
    if "bereiche" not in sp:
        c.execute("ALTER TABLE projekt ADD COLUMN bereiche TEXT NOT NULL DEFAULT ''")
    if "kopf" not in sp:   # 17.11.2026: Titelbild, Bauphasen, Ansprechperson, Anrede (vom Kern)
        c.execute("ALTER TABLE projekt ADD COLUMN kopf TEXT NOT NULL DEFAULT ''")
    if "karte" not in [r["name"] for r in c.execute("PRAGMA table_info(paket)").fetchall()]:   # 17.11.2026: kleine Karte je Paket für die Listen
        c.execute("ALTER TABLE paket ADD COLUMN karte TEXT NOT NULL DEFAULT ''")


def bereiche(c, pid):
    r = c.execute("SELECT bereiche FROM projekt WHERE pid=?", (pid,)).fetchone()
    try:
        B = json.loads(r["bereiche"]) if r and r["bereiche"] else {}
    except ValueError:
        B = {}
    return {k: bool(B[k]) if k in B else k not in VORGABE_AUS for k in BEREICHE}


def _t(v, n):
    return str(v if v is not None else "").strip()[:n]


FARBE = re.compile(r"#[0-9a-fA-F]{6}")
DATUM = re.compile(r"\d{4}-\d{2}-\d{2}")


def _bild(v, art, n):
    v = str(v or "")
    return v if v.startswith(f"data:image/{art};base64,") and len(v) <= n and re.fullmatch(r"[A-Za-z0-9+/=]*", v.split(",", 1)[1]) else ""


def aussehen_sauber(a):
    """Aussehen des Büros (vom Kern): Name, Logo (PNG), Akzentfarbe, Anrede, Begrüßung – nur was das Portal zeigt, geprüft."""
    a = a if isinstance(a, dict) else {}
    return {"buero": _t(a.get("buero"), 200), "logo": _bild(a.get("logo"), "png", 400_000), "farbe": a.get("farbe") if FARBE.fullmatch(str(a.get("farbe") or "")) else "",
            "anrede": "du" if a.get("anrede") == "du" else "Sie", "gruss": _t(a.get("gruss"), 600)}


def kopf_sauber(k):
    k = k if isinstance(k, dict) else {}
    an = k.get("ansprech") if isinstance(k.get("ansprech"), dict) else None
    return {"bild": _bild(k.get("bild"), "jpeg", 4_000_000), "bild_text": _t(k.get("bild_text"), 200), "anrede": k.get("anrede") if k.get("anrede") in ("Sie", "du") else "",
            "phasen": [{"n": _t(x.get("n"), 80), "von": x["von"], "bis": x["bis"]} for x in (k.get("phasen") or [])[:20]
                       if isinstance(x, dict) and DATUM.fullmatch(str(x.get("von") or "")) and DATUM.fullmatch(str(x.get("bis") or ""))],
            "ansprech": {f: _t(an.get(f), 200) for f in ("name", "funktion", "tel", "mail")} if an and _t(an.get("name"), 200) else None}


def aussehen(c):
    r = c.execute("SELECT wert FROM einst WHERE key='aussehen'").fetchone()
    try:
        return aussehen_sauber(json.loads(r["wert"])) if r else aussehen_sauber({})
    except ValueError:
        return aussehen_sauber({})


def sync(c, b):
    """Pakete ersetzen/löschen, Konten anlegen/ändern/sperren – vom Kern."""
    n = {"pakete": 0, "geloescht": 0, "konten": 0}
    jetzt = time.time()
    for p in (b.get("pakete") or [])[:500]:
        if not isinstance(p, dict) or not _t(p.get("id"), 120) or not _t(p.get("pid"), 40):
            continue
        pid = _t(p["pid"], 40)
        if p.get("projekt"):
            c.execute("INSERT INTO projekt(pid, name) VALUES(?,?) ON CONFLICT(pid) DO UPDATE SET name=excluded.name", (pid, _t(p["projekt"], 200)))
        d = p.get("daten") if isinstance(p.get("daten"), (dict, list)) else {}
        neu = []
        if isinstance(d, dict) and isinstance(d.get("dateien"), list):   # PDFs/Bilder: für sich ablegen, im Paket nur Name und Art
            for x in d["dateien"][:60]:   # mit Vorschaubildern („vorschau-<n>.jpg“, vom Kern)
                try:
                    neu.append((_t(x.get("name"), 200), _t(x.get("mime"), 100), base64.b64decode(x.get("b64") or "")))
                except (ValueError, TypeError, AttributeError):
                    continue
            d = {**d, "dateien": [{"nr": i, "name": nm, "mime": mi, "groesse": len(by)} for i, (nm, mi, by) in enumerate(neu)]}
        karte = json.dumps(d.get("karte"), ensure_ascii=False) if isinstance(d, dict) and isinstance(d.get("karte"), dict) else ""
        karte = karte if len(karte) < 20_000 else ""
        daten = json.dumps(d, ensure_ascii=False)
        if len(daten) > 20_000_000:
            continue
        c.execute("DELETE FROM datei WHERE paket=?", (_t(p["id"], 120),))
        for i, (nm, mi, by) in enumerate(neu):
            c.execute("INSERT INTO datei(paket, nr, name, mime, inhalt) VALUES(?,?,?,?,?)", (_t(p["id"], 120), i, nm, mi, by))
        c.execute("INSERT INTO paket(id, pid, art, titel, stand, daten, erhalten, karte) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET "
                  "pid=excluded.pid, art=excluded.art, titel=excluded.titel, stand=excluded.stand, daten=excluded.daten, erhalten=excluded.erhalten, karte=excluded.karte",
                  (_t(p["id"], 120), pid, _t(p.get("art"), 40), _t(p.get("titel"), 300), _t(p.get("stand"), 40), daten, jetzt, karte))
        n["pakete"] += 1
    for i in (b.get("loeschen") or [])[:2000]:
        n["geloescht"] += c.execute("DELETE FROM paket WHERE id=?", (_t(i, 120),)).rowcount
        c.execute("DELETE FROM datei WHERE paket=?", (_t(i, 120),))
    for p in (b.get("projekte") or [])[:500]:   # Bereiche an/aus je Projekt
        if not isinstance(p, dict) or not _t(p.get("pid"), 40):
            continue
        B = {k: bool(v) for k, v in (p.get("bereiche") or {}).items() if k in BEREICHE}
        c.execute("INSERT INTO projekt(pid, name, bereiche) VALUES(?,?,?) ON CONFLICT(pid) DO UPDATE SET bereiche=excluded.bereiche"
                  + (", name=excluded.name" if p.get("name") else ""), (_t(p["pid"], 40), _t(p.get("name"), 200), json.dumps(B)))
    if isinstance(b.get("aussehen"), dict):
        c.execute("INSERT INTO einst(key, wert) VALUES('aussehen', ?) ON CONFLICT(key) DO UPDATE SET wert=excluded.wert", (json.dumps(aussehen_sauber(b["aussehen"])),))
    for pid, k in list((b.get("koepfe") or {}).items())[:500] if isinstance(b.get("koepfe"), dict) else []:
        c.execute("INSERT INTO projekt(pid, kopf) VALUES(?,?) ON CONFLICT(pid) DO UPDATE SET kopf=excluded.kopf", (_t(pid, 40), json.dumps(kopf_sauber(k))))
    for k in (b.get("konten") or [])[:500]:
        mail = _t((k or {}).get("email"), 200).lower()
        if "@" not in mail:
            continue
        c.execute("INSERT INTO konto(email, name, aktiv, erstellt) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name, aktiv=excluded.aktiv",
                  (mail, _t(k.get("name"), 200), 1 if k.get("aktiv", True) else 0, jetzt))
        kid = c.execute("SELECT id FROM konto WHERE email=?", (mail,)).fetchone()["id"]
        c.execute("DELETE FROM konto_projekt WHERE konto=?", (kid,))
        for pid in (k.get("projekte") or [])[:200]:
            c.execute("INSERT OR IGNORE INTO konto_projekt(konto, pid) VALUES(?,?)", (kid, _t(pid, 40)))
        if not k.get("aktiv", True):
            c.execute("DELETE FROM sitzung WHERE konto=?", (kid,))   # gesperrt: sofort abgemeldet
        n["konten"] += 1
    return n


def eingang_neu(c, art, pid, daten, konto=None):
    c.execute("INSERT INTO eingang(art, pid, daten, konto, zeit) VALUES(?,?,?,?,?)", (art, pid or "", json.dumps(daten, ensure_ascii=False), konto, time.time()))


def eingang_offen(c):
    return [{"id": r["id"], "art": r["art"], "pid": r["pid"], "zeit": r["zeit"], "daten": json.loads(r["daten"] or "{}")}
            for r in c.execute("SELECT * FROM eingang WHERE abgeholt IS NULL ORDER BY id LIMIT 500").fetchall()]


def eingang_quittung(c, ids):
    jetzt = time.time()
    for i in ids:
        c.execute("UPDATE eingang SET abgeholt=? WHERE id=?", (jetzt, i))
        c.execute("DELETE FROM eingang_datei WHERE eingang=?", (i,))   # das Büro hat sie – hier nicht länger aufheben
    c.execute("DELETE FROM eingang WHERE abgeholt IS NOT NULL AND abgeholt<?", (jetzt - 30 * 86400,))   # nach 30 Tagen weg


def darf(c, kid, pid):
    return bool(c.execute("SELECT 1 FROM konto_projekt WHERE konto=? AND pid=?", (kid, pid)).fetchone())


BESUCH_PAUSE = 30 * 60   # so lange nach dem letzten Aufruf gilt es als derselbe Besuch („neu“ bleibt stehen)


def besuch(c, kid, pid, jetzt=None):
    """Seit wann gilt etwas als neu? Zeitpunkt des vorigen Besuchs (beim allerersten Besuch: nichts neu)."""
    jetzt = jetzt or time.time()
    r = c.execute("SELECT vorher, zuletzt FROM besuch WHERE konto=? AND pid=?", (kid, pid)).fetchone()
    if not r:
        c.execute("INSERT INTO besuch(konto, pid, vorher, zuletzt) VALUES(?,?,?,?)", (kid, pid, jetzt, jetzt))
        return jetzt
    vorher = r["zuletzt"] if jetzt - r["zuletzt"] > BESUCH_PAUSE else r["vorher"]
    c.execute("UPDATE besuch SET vorher=?, zuletzt=? WHERE konto=? AND pid=?", (vorher, jetzt, kid, pid))
    return vorher


def projekte(c, kid):
    """Projekte der Bauherr:in mit den Paketen der eingeschalteten Bereiche (mit „neu“ seit dem vorigen Besuch), dem Kopf
    (Titelbild, Bauphasen, Ansprechperson, Anrede) und ob Hochladen und Nachrichten gehen."""
    out = []
    for r in c.execute("SELECT kp.pid, COALESCE(p.name,'') AS name, COALESCE(p.kopf,'') AS kopf FROM konto_projekt kp LEFT JOIN projekt p ON p.pid=kp.pid WHERE kp.konto=? ORDER BY p.name", (kid,)).fetchall():
        B = bereiche(c, r["pid"])
        seit = besuch(c, kid, r["pid"])
        P = [{"id": x["id"], "art": x["art"], "titel": x["titel"], "stand": x["stand"], "neu": x["erhalten"] > seit, "v": int(x["erhalten"] or 0), **({"karte": json.loads(x["karte"])} if x["karte"] else {})}
             for x in c.execute("SELECT id, art, titel, stand, erhalten, karte FROM paket WHERE pid=? ORDER BY stand DESC, titel", (r["pid"],)).fetchall() if B.get(x["art"], True)]
        try:
            K = kopf_sauber(json.loads(r["kopf"])) if r["kopf"] else kopf_sauber({})
        except ValueError:
            K = kopf_sauber({})
        out.append({"pid": r["pid"], "name": r["name"] or "Projekt", "pakete": P, "upload": B["upload"], "nachricht": B["nachricht"], "kopf": K})
    return out


def paket(c, kid, pid, pk):
    if not darf(c, kid, pid):
        return None
    r = c.execute("SELECT * FROM paket WHERE id=? AND pid=?", (pk, pid)).fetchone()
    if not r or not bereiche(c, pid).get(r["art"], True):   # Bereich ausgeschaltet: wie nicht vorhanden
        return None
    return {"id": r["id"], "art": r["art"], "titel": r["titel"], "stand": r["stand"], "daten": json.loads(r["daten"] or "{}")}


def datei(c, kid, pid, pk, nr):
    """PDF/Bild an einem Paket – nur mit Zugang zum Projekt und eingeschaltetem Bereich."""
    if not paket(c, kid, pid, pk):
        return None
    return c.execute("SELECT name, mime, inhalt FROM datei WHERE paket=? AND nr=?", (pk, nr)).fetchone()


def hochladen(c, kid, pid, name, data, text, von, email):
    """Datei einer Bauherr:in annehmen → Eingangskorb (art „datei“). Fehlertext oder None."""
    if not darf(c, kid, pid):
        return "Kein Zugang zu diesem Projekt."
    if not bereiche(c, pid)["upload"]:
        return "Das Hochladen ist für dieses Projekt nicht eingeschaltet."
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext not in HOCH:
        return "Bitte nur PDF, Bilder (JPG, PNG, HEIC) oder Word/Excel-Dateien."
    if not data:
        return "Die Datei ist leer."
    if len(data) > HOCH_MAX:
        return "Die Datei ist zu groß (höchstens 50 MB)."
    belegt = c.execute("SELECT COALESCE(SUM(LENGTH(d.inhalt)),0) AS n FROM eingang_datei d JOIN eingang e ON e.id=d.eingang WHERE e.pid=?", (pid,)).fetchone()["n"]
    if belegt + len(data) > HOCH_PROJEKT:
        return "Gerade ist kein Platz mehr – bitte später noch einmal versuchen."
    cur = c.execute("INSERT INTO eingang(art, pid, daten, konto, zeit) VALUES('datei',?,?,?,?)",
                    (pid, json.dumps({"name": name[:200], "mime": HOCH[ext], "groesse": len(data), "text": text[:2000], "von": von, "email": email}, ensure_ascii=False), kid, time.time()))
    c.execute("INSERT INTO eingang_datei(eingang, inhalt) VALUES(?,?)", (cur.lastrowid, data))
    return None


def hochgeladen(c, kid, pid):
    """Was diese Bauherr:in in dem Projekt hochgeladen hat (letzte 30 Tage) – mit „beim Büro angekommen“."""
    return [{"name": json.loads(r["daten"] or "{}").get("name", ""), "zeit": r["zeit"], "angekommen": bool(r["abgeholt"])}
            for r in c.execute("SELECT daten, zeit, abgeholt FROM eingang WHERE art='datei' AND konto=? AND pid=? ORDER BY zeit DESC LIMIT 50", (kid, pid)).fetchall()]


def eingang_inhalt(c, eid):
    r = c.execute("SELECT inhalt FROM eingang_datei WHERE eingang=?", (eid,)).fetchone()
    return bytes(r["inhalt"]) if r else None
