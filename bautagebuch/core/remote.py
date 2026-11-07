"""Ziele für die Ablage: Windows-Freigabe (SMB) oder ein im Container eingebundener Ordner."""
import os, re, shutil

BAD = re.compile(r'[\\/:*?"<>|\x00-\x1f]')


def clean(seg):
    """Ordner-/Dateiname Windows-tauglich machen."""
    seg = BAD.sub(" ", seg or "")
    seg = re.sub(r"\s+", " ", seg).strip().rstrip(". ")
    return seg


def clean_path(rel):
    parts = [clean(p) for p in re.split(r"[\\/]+", rel or "")]
    return [p for p in parts if p and p not in (".", "..")]


class Folder:
    """Normaler Ordner (z. B. eine per Docker-Volume/CIFS eingebundene Freigabe)."""
    def __init__(self, base):
        self.base = base

    def _p(self, rel):
        return os.path.join(self.base, *clean_path(rel))

    def put(self, local, rel):
        dst = self._p(rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        tmp = dst + ".part"
        with open(local, "rb") as a, open(tmp, "wb") as b:
            while chunk := a.read(1 << 20):
                b.write(chunk)
        os.replace(tmp, dst)

    def test(self):
        self.put_bytes(b"ok", ".bautagebuch-test")
        os.remove(self._p(".bautagebuch-test"))

    def exists(self, rel):
        return os.path.exists(self._p(rel))

    def rename(self, rel, new_rel):
        os.makedirs(os.path.dirname(self._p(new_rel)), exist_ok=True)
        os.rename(self._p(rel), self._p(new_rel))

    def rmdir_if_empty(self, rel):
        try: os.rmdir(self._p(rel))
        except OSError: pass

    def dirs(self, sub=()):
        try:
            return [e.name for e in os.scandir(os.path.join(self.base, *sub)) if e.is_dir()]
        except OSError:
            return []

    def put_bytes(self, data, rel):
        dst = self._p(rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, "wb") as f:
            f.write(data)

    def listdir(self, rel):
        """Einträge eines Ordners: [{name, dir, size, mtime}] (leer, wenn es den Ordner nicht gibt)."""
        try:
            return [{"name": e.name, "dir": e.is_dir(), "size": 0 if e.is_dir() else e.stat().st_size, "mtime": e.stat().st_mtime}
                    for e in os.scandir(self._p(rel))]
        except OSError:
            return []

    def tree(self, rel):
        """(Anzahl Dateien, Bytes) unterhalb eines Ordners."""
        n = b = 0
        for root, _, files in os.walk(self._p(rel)):
            for f in files:
                n += 1
                try: b += os.path.getsize(os.path.join(root, f))
                except OSError: pass
        return n, b

    def delete(self, rel, is_dir):
        shutil.rmtree(self._p(rel)) if is_dir else os.remove(self._p(rel))

    def read(self, rel, limit=None):
        with open(self._p(rel), "rb") as f:
            return f.read(limit or -1)


def _fehlt(e):
    """Meldet der Dateiserver „Ordner/Datei nicht vorhanden“ (und nicht etwa einen Verbindungsfehler)?"""
    import errno
    if isinstance(e, (FileNotFoundError, NotADirectoryError)) or getattr(e, "errno", None) in (errno.ENOENT, errno.ENOTDIR):
        return True
    t = str(e).upper()
    return "OBJECT_NAME_NOT_FOUND" in t or "OBJECT_PATH_NOT_FOUND" in t or "NOT_A_DIRECTORY" in t


class Smb:
    """Windows-Server über SMB (Port 445), mit Benutzername/Kennwort."""
    def __init__(self, server, share, base, user, password, domain=""):
        import smbclient  # erst hier, damit die App auch ohne das Paket startet
        self.sc = smbclient
        getattr(smbclient, "reset_connection_cache", lambda: None)()  # geänderte Zugangsdaten sicher übernehmen
        self.server, self.share = server.strip().strip("\\/"), share.strip().strip("\\/")
        self.base = clean_path(base)
        self.sc.register_session(self.server, username=(f"{domain}\\{user}" if domain else user),
                                 password=password, connection_timeout=10)

    def _unc(self, rel_parts):
        return "\\\\" + self.server + "\\" + "\\".join([self.share, *self.base, *rel_parts])

    def put(self, local, rel):
        parts = clean_path(rel)
        dst = self._unc(parts)
        self.sc.makedirs(self._unc(parts[:-1]), exist_ok=True)
        tmp = dst + ".part"
        with open(local, "rb") as a, self.sc.open_file(tmp, mode="wb") as b:
            while chunk := a.read(1 << 20):
                b.write(chunk)
        self.sc.replace(tmp, dst)

    def put_bytes(self, data, rel):
        parts = clean_path(rel)
        self.sc.makedirs(self._unc(parts[:-1]), exist_ok=True)
        with self.sc.open_file(self._unc(parts), mode="wb") as f:
            f.write(data)

    def test(self):
        self.put_bytes(b"ok", ".bautagebuch-test")
        self.sc.remove(self._unc([".bautagebuch-test"]))

    def exists(self, rel):
        try:
            self.sc.stat(self._unc(clean_path(rel)))
            return True
        except OSError:
            return False

    def rename(self, rel, new_rel):
        self.sc.makedirs(self._unc(clean_path(new_rel)[:-1]), exist_ok=True)
        self.sc.rename(self._unc(clean_path(rel)), self._unc(clean_path(new_rel)))

    def rmdir_if_empty(self, rel):
        try: self.sc.rmdir(self._unc(clean_path(rel)))
        except Exception: pass   # Ordner nicht leer oder schon weg – dann bleibt er stehen

    def dirs(self, sub=()):
        try:
            return [e.name for e in self.sc.scandir(self._unc(list(sub))) if e.is_dir()]
        except OSError as e:   # nur ein fehlender Ordner ist „leer“; Verbindungsfehler weitergeben – sonst legen Aufrufer doppelte Ordner an
            if _fehlt(e):
                return []
            raise

    def listdir(self, rel):
        try:
            return [{"name": e.name, "dir": e.is_dir(), "size": 0 if e.is_dir() else e.stat().st_size, "mtime": e.stat().st_mtime}
                    for e in self.sc.scandir(self._unc(clean_path(rel)))]
        except OSError as e:   # nur ein fehlender Ordner ist „leer“; Verbindungsfehler weitergeben – sonst legen Aufrufer doppelte Ordner an
            if _fehlt(e):
                return []
            raise

    def tree(self, rel):
        n = b = 0
        for _, _, files in self.sc.walk(self._unc(clean_path(rel))):
            n += len(files)
        for root, _, files in self.sc.walk(self._unc(clean_path(rel))):
            for f in files:
                try: b += self.sc.stat(root + "\\" + f).st_size
                except OSError: pass
        return n, b

    def read(self, rel, limit=None):
        with self.sc.open_file(self._unc(clean_path(rel)), mode="rb") as f:
            return f.read(limit or -1)

    def delete(self, rel, is_dir):
        unc = self._unc(clean_path(rel))
        if not is_dir:
            return self.sc.remove(unc)
        for root, dirs, files in self.sc.walk(unc, topdown=False):
            for f in files:
                self.sc.remove(root + "\\" + f)
            for d in dirs:
                self.sc.rmdir(root + "\\" + d)
        self.sc.rmdir(unc)


CODE = re.compile(r"^[A-Za-z]+\d+(?:\.\d+)*")


def code_prefix(text):
    """Projektkürzel am Anfang eines Namens: „A450.7.in der Löchte“ → „A450.7“, „A450.1. Kordts Feld“ → „A450.1“."""
    m = CODE.match((text or "").strip())
    return m.group(0) if m else ""


def has_code(name, code):
    """Beginnt der Ordnername mit genau diesem Kürzel („A450.1“ passt auf „A450.1. Kordts“, nicht auf „A450.10 …“)?"""
    n, c = (name or "").lower(), (code or "").lower()
    return bool(c) and n.startswith(c) and not re.match(r"\d|\.\d", n[len(c):])


def find_dir(target, code, sub=()):
    """Ordner suchen, der mit dem Kürzel beginnt („A483“ → „A483 Bovermanns Kamp 20, Essen, erledigt“)."""
    hits = sorted(d for d in target.dirs(sub) if has_code(d, code))
    return hits[0] if hits else None


def find_project_path(target, code, name):
    """Pfad zum Projektordner. Unterprojekte („A450.22“) liegen im Ordner des Hauptprojekts („A450 …“),
    „A450.22.1“ eine Ebene tiefer. Fehlt eine Ebene, wird sie mit dem Kürzel bzw. (letzte Ebene) dem Projektnamen angelegt."""
    parts = [p for p in (code or "").split(".") if p]
    if not parts:
        return [name]
    path = []
    for n in range(1, len(parts) + 1):
        prefix = ".".join(parts[:n])
        hit = find_dir(target, prefix, path)
        if n == 1 and not hit and len(parts) > 1:      # Hauptprojekt nicht vorhanden: Unterprojekt liegt evtl. direkt im Basisordner
            hit = find_dir(target, ".".join(parts), [])
            if hit:
                return [hit]
        path.append(hit or (name if n == len(parts) else prefix))
    return path


def open_target(conf):
    """Liefert das Ziel gemäß Einstellungen oder None, wenn die Ablage aus ist."""
    mode = conf.get("store_mode", "off")
    if mode == "folder":
        base = (conf.get("store_dir") or "").strip()
        if not base:
            raise ValueError("Es ist kein Ordner eingetragen.")
        return Folder(base)
    if mode == "smb":
        if not (conf.get("store_server") and conf.get("store_share")):
            raise ValueError("Server und Freigabe sind nötig.")
        return Smb(conf["store_server"], conf["store_share"], conf.get("store_path", ""),
                   conf.get("store_user", ""), conf.get("store_pass", ""), conf.get("store_domain", ""))
    return None
