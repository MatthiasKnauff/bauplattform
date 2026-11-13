"""Datenbankversionen: Momentaufnahmen der PostgreSQL-Datenbank (pg_dump) im Ordner data/backups.

Arten (Teil des Dateinamens bau-JJJJMMTT-HHMMSS-<art>.dump):
  auto     täglich automatisch (die letzten 30 bleiben)
  manuell  per Knopf (die letzten 30 bleiben)
  vor-…    vor einer Migration bzw. vor einer Wiederherstellung (die letzten 10 bleiben)
Wiederherstellen spielt eine Version mit pg_restore in die laufende Datenbank ein (vorher entsteht eine Sicherung).
Fotodateien (data/uploads) sind nicht Teil der Datenbank; sie werden nie überschrieben.
"""
import fcntl, glob, os, re, subprocess, threading, time
from datetime import datetime
from . import db
from bpcore import fehler   # stille Fehler für die Verwaltung festhalten

NAME = re.compile(r"^bau-(\d{8})-(\d{6})-([a-z0-9-]+)\.dump$")
KEEP = {"auto": 30, "manuell": 30, "vor": 10}
_started = False


def folder():
    d = os.path.join(db.DATA, "backups")
    os.makedirs(d, exist_ok=True)
    return d


def _group(kind):
    return "vor" if kind.startswith("vor") else kind


def prune():
    by = {}
    for f in sorted(glob.glob(os.path.join(folder(), "bau-*.dump"))):
        m = NAME.match(os.path.basename(f))
        if m:
            by.setdefault(_group(m.group(3)), []).append(f)
    for g, files in by.items():
        for old in files[:-KEEP.get(g, 30)]:
            try: os.remove(old)
            except OSError: pass


def create(kind="manuell"):
    kind = re.sub(r"[^a-z0-9-]", "-", kind.lower())[:30] or "manuell"
    name = f"bau-{datetime.now():%Y%m%d-%H%M%S}-{kind}.dump"
    path = os.path.join(folder(), name)
    db.dump(path)
    prune()
    return name


def listing():
    out = []
    for f in glob.glob(os.path.join(folder(), "bau-*.dump")):
        n = os.path.basename(f); m = NAME.match(n)
        if not m:
            continue
        st = os.stat(f)
        out.append({"name": n, "kind": m.group(3), "size": st.st_size, "mtime": st.st_mtime,
                    "created": datetime.strptime(m.group(1) + m.group(2), "%Y%m%d%H%M%S").isoformat(sep=" ")})
    return sorted(out, key=lambda x: x["name"], reverse=True)


def path_of(name):
    if not NAME.match(name or ""):
        return None
    p = os.path.join(folder(), name)
    return p if os.path.isfile(p) else None


def restore(name):
    """Version zurückspielen. Gibt (ok, Meldung) zurück."""
    p = path_of(name)
    if not p:
        return False, "Version nicht gefunden."
    chk = subprocess.run(["pg_restore", "--list", p], capture_output=True, text=True)
    if chk.returncode:
        return False, "Die Sicherung ist beschädigt."
    newest = max(db.known_versions(), default=0)
    create("vor-wiederherstellung")
    r = subprocess.run(["pg_restore", "--clean", "--if-exists", "--no-owner", "--single-transaction", "-d", db.DSN, p], capture_output=True, text=True)
    if r.returncode:
        return False, "Wiederherstellen fehlgeschlagen: " + (r.stderr or "").strip()[:300]
    db._cols.clear()
    with db.tx() as c:
        have = db.schema_version(c)
    if have > newest:
        return False, "Die Sicherung stammt von einer neueren App-Version (bitte die App aktualisieren)."
    db.migrate()    # ältere Sicherung: Schema auf den aktuellen Stand bringen
    return True, "Wiederhergestellt."


def start():
    global _started
    if _started:
        return
    _started = True

    def loop():
        while True:
            try:
                with open(os.path.join(db.DATA, ".backup.lock"), "w") as lk:
                    try:
                        fcntl.flock(lk, fcntl.LOCK_EX | fcntl.LOCK_NB)   # nur ein Prozess prüft
                    except OSError:
                        raise StopIteration
                    autos = [x for x in listing() if x["kind"] == "auto"]
                    if not autos or time.time() - autos[0]["mtime"] > 23.5 * 3600:
                        name = create("auto")
                        from . import extern
                        extern.kopieren(name)   # Kopie auf den Dateiserver (falls eingerichtet)
                        from . import bauportal
                        if (bauportal._conf().get("portal_unc") or "").strip():
                            bauportal.wiki_sichern()   # Wiki für sich: Auszug, wiki.json, Notfallpaket → Bauportal/06 Sicherung
            except Exception as e:
                if not isinstance(e, StopIteration):   # StopIteration = ein anderer Prozess prüft gerade – kein Fehler
                    fehler.still("bautagebuch", "Tägliche Datensicherung", e)
                pass
            time.sleep(900)
    threading.Thread(target=loop, daemon=True).start()
