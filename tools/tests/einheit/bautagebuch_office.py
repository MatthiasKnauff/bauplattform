"""Bauportal Office (17.11.2026): Schlüssel (nur diese Datei, nur gültig, nicht gefälscht), leere Dateien, Adresse des Editors und der
WOPI-Weg beim Bautagebuch – Angaben, Holen, Speichern mit Fassung beim ersten Speichern, Konflikt bei fremder Änderung, Testserver/
„nur ansehen“ schreibt nicht. An einem echten Ordner im Dateisystem und einer kleinen Ersatz-Datenbank."""
import contextlib
import io
import os
import tempfile
import time
import zipfile

from lib import gleich, pruefe


class _C:   # Ersatz für db.tx(): nur bp_store und was die Routen brauchen
    def __init__(self, S):
        self.S, self.r = S, []

    def execute(self, q, a=()):
        q = " ".join(q.split())
        if q.startswith("SELECT data FROM bp_store WHERE key='office:schluessel'"):
            self.r = [{"data": self.S["office:schluessel"]}] if "office:schluessel" in self.S else []
        elif q.startswith("INSERT INTO bp_store(key, data) VALUES('office:schluessel'"):
            self.S.setdefault("office:schluessel", a[0])
        elif q.startswith("SELECT 1 FROM bp_store WHERE key=?"):
            self.r = [{"1": 1}] if a[0] in self.S else []
        elif q.startswith("INSERT INTO bp_store(key, data, updated, updated_by)"):
            self.S.setdefault(a[0], a[1])
        elif q.startswith("SELECT id, name FROM projects"):
            self.r = [{"id": a[0], "name": "A100 Haus"}]
        else:
            self.r = []
        return self

    def fetchone(self):
        return self.r[0] if self.r else None

    def fetchall(self):
        return self.r


def test_schluessel_und_leere_dateien():
    from bpcore import office as O
    S = {}
    c = _C(S)
    tok, bis = O.token(c, {"id": 7, "name": "Anna"}, 3, "A/Brief.docx", True, "https://bauportal.example")
    f = O.fid(3, "A/Brief.docx")
    d = O.pruefen(c, tok, f)
    pruefe(d and d["u"] == 7 and d["w"] and d["o"] == "https://bauportal.example", "echter Schlüssel")
    pruefe(bis > time.time() * 1000, "gültig bis (ms)")
    gleich(O.aus_fid(f), (3, "A/Brief.docx"), "Kennung zurück")
    pruefe(O.pruefen(c, tok, O.fid(3, "A/Andere.docx")) is None, "andere Datei: nein")
    roh, sig = tok.split(".")
    pruefe(O.pruefen(c, roh[:-2] + "AA." + sig, f) is None, "verändert: nein")
    pruefe(O.pruefen(c, "", f) is None and O.pruefen(c, "x.y", f) is None, "leer/Unsinn: nein")
    alt = O.DAUER
    O.DAUER = -10
    try:
        t2, _ = O.token(c, {"id": 7, "name": "Anna"}, 3, "A/Brief.docx", True)
        pruefe(O.pruefen(c, t2, f) is None, "abgelaufen: nein")
    finally:
        O.DAUER = alt
    for art in ("docx", "xlsx"):
        z = zipfile.ZipFile(io.BytesIO(O.leer(art)))
        pruefe("[Content_Types].xml" in z.namelist(), f"{art}: echte Office-Datei")
    pruefe(O.bearbeitbar("x.XLSX") and O.bearbeitbar("a.odt") and not O.bearbeitbar("plan.pdf"), "bearbeitbare Endungen")


def test_editor_url():
    from bpcore import office as O
    alt = (O.OFFICE_URL, O._discovery)
    O.OFFICE_URL = "https://office.example"
    O._discovery = lambda: {"docx": {"edit": "http://office:9980/browser/abc/cool.html?<ui=UI_LLCC&>", "view": "http://office:9980/browser/abc/cool.html?"}}
    try:
        u = O.editor_url(3, "A/Brief.docx", True)
        pruefe(u.startswith("https://office.example/browser/abc/cool.html?WOPISrc=http%3A%2F%2Fbautagebuch%3A8000%2Fwopi%2Ffiles%2F"), u)
        pruefe("<ui" not in u and "lang=de" in u, "Platzhalter weg, Deutsch")
        try:
            O.editor_url(3, "A/Plan.dwg", True)
            pruefe(False, "dwg geht nicht")
        except ValueError:
            pass
    finally:
        O.OFFICE_URL, O._discovery = alt


def test_wopi():
    from core import remote
    from flask import Flask
    from bpcore import office as O
    from modules import office as M
    S = {}
    with tempfile.TemporaryDirectory() as td:
        os.makedirs(os.path.join(td, "P", "A"))
        with open(os.path.join(td, "P", "A", "Brief.docx"), "wb") as fh:
            fh.write(b"alt")
        t = remote.Folder(td)
        alt = (M._ziel_conf, M.db.tx, M.audit.log, M._liste)
        M._ziel_conf = lambda pid: (t, ["P"])
        M.db.tx = contextlib.contextmanager(lambda: (yield _C(S)))
        M.audit.log = lambda *a, **k: None
        M._liste = lambda *a, **k: None
        try:
            app = Flask("t")
            app.register_blueprint(M.bp)
            cl = app.test_client()
            f = O.fid(1, "A/Brief.docx")
            tok, _ = O.token(_C(S), {"id": 1, "name": "Anna Bau"}, 1, "A/Brief.docx", True)
            lese, _ = O.token(_C(S), {"id": 2, "name": "Bert"}, 1, "A/Brief.docx", False)
            gleich(cl.get(f"/wopi/files/{f}?access_token=falsch").status_code, 401, "ohne gültigen Schlüssel")
            i = cl.get(f"/wopi/files/{f}?access_token={tok}").get_json()
            gleich((i["BaseFileName"], i["Size"], i["UserCanWrite"] or remote.NUR_LESEN, i["UserFriendlyName"]), ("Brief.docx", 3, True, "Anna Bau"), "Angaben")
            gleich(cl.get(f"/wopi/files/{f}/contents?access_token={tok}").data, b"alt", "holen")
            pruefe(not cl.get(f"/wopi/files/{f}?access_token={lese}").get_json()["UserCanWrite"], "nur ansehen")
            gleich(cl.post(f"/wopi/files/{f}/contents?access_token={lese}", data=b"x", headers={"X-WOPI-Override": "PUT"}).status_code, 401, "nur ansehen: nicht speichern")
            if remote.NUR_LESEN:
                return
            r = cl.post(f"/wopi/files/{f}/contents?access_token={tok}", data=b"neu1", headers={"X-WOPI-Override": "PUT", "X-COOL-WOPI-Timestamp": i["LastModifiedTime"]})
            gleich(r.status_code, 200, "speichern")
            gleich(open(os.path.join(td, "P", "A", "Brief.docx"), "rb").read(), b"neu1", "gespeichert")
            F = os.listdir(os.path.join(td, "P", "A", "_Fassungen", "Brief"))
            pruefe(len(F) == 1 and open(os.path.join(td, "P", "A", "_Fassungen", "Brief", F[0]), "rb").read() == b"alt" and "Anna Bau" in F[0], "vorige Fassung aufgehoben")
            cl.post(f"/wopi/files/{f}/contents?access_token={tok}", data=b"neu2", headers={"X-WOPI-Override": "PUT"})
            gleich(len(os.listdir(os.path.join(td, "P", "A", "_Fassungen", "Brief"))), 1, "je Sitzung nur eine Fassung")
            r = cl.post(f"/wopi/files/{f}/contents?access_token={tok}", data=b"neu3", headers={"X-WOPI-Override": "PUT", "X-COOL-WOPI-Timestamp": "2000-01-01T00:00:00.000000Z"})
            gleich((r.status_code, (r.get_json() or {}).get("COOLStatusCode")), (409, 1010), "fremd geändert: Rückfrage im Editor")
            gleich(open(os.path.join(td, "P", "A", "Brief.docx"), "rb").read(), b"neu2", "nichts überschrieben")
            gleich(cl.post(f"/wopi/files/{f}?access_token={tok}", headers={"X-WOPI-Override": "LOCK"}).status_code, 501, "Sperren nicht angeboten")
        finally:
            M._ziel_conf, M.db.tx, M.audit.log, M._liste = alt
