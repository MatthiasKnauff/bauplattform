"""Hilfen für die Ablauftests der Bauplattform (tools/tests/test_*.py).

Die Tests laufen in GitHub Actions gegen eine frisch gestartete Plattform mit Testdaten (bautagebuch/tools/testdaten.py),
immer über den Verteiler: alle Apps unter einer Adresse, z. B. /ava/api/…, /bautagebuch/api/…, /bauzeitenplan/api/….
Nur Python-Standardbibliothek.

Ein Test ist eine Funktion  def test_irgendwas(ctx): …  in einer Datei tools/tests/test_<bereich>.py.
Er legt seine Daten selbst an (eindeutige Namen über ctx.name("…")), damit Tests sich nicht gegenseitig stören.
Fehlschlag = Exception (am einfachsten über die Hilfen unten: c.get(..., expect=200), gleich(), pruefe()).

ctx (siehe run.py):
  ctx.base          Adresse des Verteilers, z. B. http://localhost:8090
  ctx.admin         angemeldeter Client „Test-Admin“ (Administrator)
  ctx.anmelden(n)   neuer Client, angemeldet als Benutzer n (Kennwort aller Testbenutzer: Testdaten1)
                      „Anna Bauer“ (alle Apps), „Bernd Krämer“ (nur Bautagebuch), „Clara Wolf“ (nur Bauzeitenplan)
  ctx.gast()        neuer, NICHT angemeldeter Client
  ctx.projekte      Liste der Bautagebuch-Projekte aus den Testdaten (T101 …, T102 …, T103 …)
  ctx.pid           id des ersten Testprojekts
  ctx.name(s)       eindeutiger Name, z. B. "RT-LV-3f9a2c"
"""
import http.cookiejar, json, os, uuid, urllib.error, urllib.request

PW = "Testdaten1"


class Fehler(AssertionError):
    pass


def pruefe(bedingung, meldung):
    if not bedingung:
        raise Fehler(meldung)


def gleich(ist, soll, meldung="", toleranz=0.005):
    """Zahlen (mit kleiner Rundungstoleranz, Standard ½ Cent) oder beliebige Werte vergleichen."""
    if isinstance(soll, (int, float)) and not isinstance(soll, bool):
        try:
            ok = abs(float(ist) - float(soll)) <= toleranz
        except (TypeError, ValueError):
            ok = False
    else:
        ok = ist == soll
    if not ok:
        raise Fehler(f"{meldung + ': ' if meldung else ''}erwartet {soll!r}, erhalten {ist!r}")


def finde(liste, **merkmale):
    """Erstes Element (dict) einer Liste, dessen Felder zu den Merkmalen passen – sonst None."""
    for x in liste or []:
        if isinstance(x, dict) and all(x.get(k) == v for k, v in merkmale.items()):
            return x
    return None


class Antwort:
    def __init__(self, method, path, status, ctype, body, headers):
        self.method, self.path, self.status, self.ctype, self.body, self.headers = method, path, status, ctype or "", body or b"", headers

    @property
    def json(self):
        try:
            return json.loads(self.body or b"null")
        except ValueError:
            raise Fehler(f"{self.method} {self.path}: Antwort ist kein JSON: {self.text[:200]!r}")

    @property
    def text(self):
        return self.body.decode("utf-8", errors="replace")

    def ist_pdf(self):
        pruefe(self.body[:5] == b"%PDF-", f"{self.method} {self.path}: keine PDF-Datei ({self.ctype}, {self.text[:80]!r})")
        return self

    def ist_xlsx(self):   # auch .docx usw.: ZIP-Container
        pruefe(self.body[:2] == b"PK", f"{self.method} {self.path}: keine Excel-/ZIP-Datei ({self.ctype}, {self.text[:80]!r})")
        return self

    def __repr__(self):
        return f"<{self.method} {self.path} → {self.status}>"


def multipart(dateien=None, felder=None):
    """dateien: {feldname: (dateiname, bytes, content_type)}; felder: {name: wert} → (body, content_type)"""
    grenze = "----bp" + uuid.uuid4().hex
    teile = []
    for k, v in (felder or {}).items():
        teile.append(f'--{grenze}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    for k, (fn, data, ct) in (dateien or {}).items():
        teile.append(f'--{grenze}\r\nContent-Disposition: form-data; name="{k}"; filename="{fn}"\r\n'
                     f'Content-Type: {ct or "application/octet-stream"}\r\n\r\n'.encode() + data + b"\r\n")
    teile.append(f"--{grenze}--\r\n".encode())
    return b"".join(teile), f"multipart/form-data; boundary={grenze}"


class Client:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.name = None

    def req(self, method, path, json_=None, *, dateien=None, felder=None, body=None, ctype=None, expect=(200, 201), timeout=120):
        """Anfrage senden. expect: erwarteter Status (Zahl oder Tupel); None = nicht prüfen. Gibt Antwort zurück."""
        if json_ is not None:
            body, ctype = json.dumps(json_).encode(), "application/json"
        elif dateien is not None or felder is not None:
            body, ctype = multipart(dateien, felder)
        headers = {"Content-Type": ctype} if ctype else {}
        r = urllib.request.Request(self.base + path, data=body, method=method, headers=headers)
        try:
            with self.op.open(r, timeout=timeout) as resp:
                a = Antwort(method, path, resp.status, resp.headers.get("Content-Type"), resp.read(), resp.headers)
        except urllib.error.HTTPError as e:
            a = Antwort(method, path, e.code, e.headers.get("Content-Type"), e.read(), e.headers)
        except Exception as e:
            raise Fehler(f"{method} {path}: keine Antwort ({e})")
        if expect is not None:
            ok = a.status in expect if isinstance(expect, (tuple, list, set)) else a.status == expect
            if not ok:
                raise Fehler(f"{method} {path}: Status {a.status} statt {expect}" + (f" ({self.name})" if self.name else "")
                             + f" – {a.text[:400]}")
        return a

    def get(self, path, **kw):
        return self.req("GET", path, **kw)

    def post(self, path, json_=None, **kw):
        return self.req("POST", path, json_, **kw)

    def put(self, path, json_=None, **kw):
        return self.req("PUT", path, json_, **kw)

    def patch(self, path, json_=None, **kw):
        return self.req("PATCH", path, json_, **kw)

    def delete(self, path, json_=None, **kw):
        return self.req("DELETE", path, json_, **kw)

    # Kurzformen: Status prüfen und gleich das JSON liefern
    def gj(self, path, **kw):
        return self.get(path, **kw).json

    def pj(self, path, json_=None, **kw):
        return self.post(path, json_, **kw).json

    def uj(self, path, json_=None, **kw):
        return self.put(path, json_, **kw).json

    def login(self, name, pw=PW):
        a = self.post("/api/login", {"name": name, "password": pw}, expect=200)
        pruefe(a.json.get("ok"), f"Anmeldung „{name}“ fehlgeschlagen: {a.text[:200]}")
        self.name = name
        return self


class Ctx:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.admin = self.anmelden("Test-Admin")
        self.projekte = self.admin.gj("/bautagebuch/api/projects")
        pruefe(self.projekte, "keine Testprojekte – wurden die Testdaten angelegt?")
        self.pid = self.projekte[0]["id"]

    def anmelden(self, name, pw=PW):
        return Client(self.base).login(name, pw)

    def gast(self):
        return Client(self.base)

    @staticmethod
    def name(s="Test"):
        return f"RT-{s}-{uuid.uuid4().hex[:6]}"

    def projekt(self, teil):
        """Testprojekt, dessen Name den Text enthält (z. B. "T101")."""
        p = next((x for x in self.projekte if teil in (x.get("name") or "")), None)
        pruefe(p, f"Testprojekt „{teil}“ nicht gefunden")
        return p


HIER = os.path.dirname(os.path.abspath(__file__))


def mini_pdf(notiz="Test"):
    """Kleinste gültige PDF (eine leere Seite) – für Tests, die eine echte, lesbare PDF hochladen; notiz macht sie unterscheidbar."""
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>"]
    out, pos = bytearray(b"%PDF-1.4\n% " + notiz.encode("latin-1", "replace") + b"\n"), []
    for i, o in enumerate(objs, 1):
        pos.append(len(out))
        out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    x = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1) + b"".join(b"%010d 00000 n \n" % p for p in pos)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, x)
    return bytes(out)
