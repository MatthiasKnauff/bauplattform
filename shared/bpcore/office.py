"""Bauportal Office (GO 17.11.2026: „Nextcloud Office“ = Collabora Online, eigener Container „office“ im Stack; P1 Q1 R1).

Ablauf: Pläne & Dateien fragt für eine Datei einen Schlüssel an (plaene_office.py prüft Projekt und Rechte) → der Browser schickt
ihn per Formular an den Editor (OFFICE_URL – Pfad /office unter der Adresse des Bauportals, im Nginx Proxy Manager eine „Custom location“) → der Editor holt und speichert die Datei im
Docker-Netz beim Bautagebuch (WOPI, bautagebuch/modules/office.py), das die Ablage kennt. Der Editor sieht nie den Dateiserver
und nie Zugangsdaten; der Schlüssel gilt nur für diese eine Datei, diese Person und begrenzte Zeit.

Der geheime Schlüssel zum Unterschreiben liegt in bp_store („office:schluessel“), entsteht beim ersten Gebrauch und verlässt den
Server nie. OFFICE_URL leer = Office aus (Knöpfe erscheinen nicht).
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import urllib.request

OFFICE_URL = os.environ.get("OFFICE_URL", "").rstrip("/")   # für den Browser: https://bauportal.gk3-architektur.de/office (eigener Pfad) oder eine eigene Adresse
OFFICE_INTERNAL = os.environ.get("OFFICE_INTERNAL", "http://office:9980").rstrip("/")   # für die Discovery (im Docker-Netz)
OFFICE_PFAD = "/" + os.environ.get("OFFICE_PFAD", "/office").strip("/") if os.environ.get("OFFICE_PFAD", "/office").strip("/") else ""   # service_root des Editors
WOPI_BASIS = os.environ.get("BAUTAGEBUCH_INTERNAL", "http://bautagebuch:8000").rstrip("/") + "/wopi/files/"
DAUER = 10 * 3600   # Sekunden, die ein Schlüssel gilt (ein Arbeitstag)
ENDUNGEN = {"docx": "Dokument", "doc": "Dokument", "odt": "Dokument", "rtf": "Dokument", "xlsx": "Tabelle", "xls": "Tabelle", "ods": "Tabelle",
            "csv": "Tabelle", "pptx": "Präsentation", "ppt": "Präsentation", "odp": "Präsentation", "odg": "Zeichnung"}
NEU = {"docx": "Dokument", "xlsx": "Tabelle", "pptx": "Präsentation", "odg": "Zeichnung"}   # Präsentation, Zeichnung: 18.11.2026 (PDF bearbeiten bewusst nicht – dafür die PDF-Ansicht)


def an():
    return bool(OFFICE_URL)


def endung(name):
    return name.rsplit(".", 1)[-1].lower() if "." in name else ""


def bearbeitbar(name):
    return endung(name) in ENDUNGEN


def _b64(b):
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def _unb64(s):
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def fid(pid, pfad):
    """Kennung der Datei für den Editor – für alle Personen gleich (so arbeiten mehrere gleichzeitig in derselben Datei)."""
    return _b64(f"{int(pid)}\n{pfad}".encode())


def aus_fid(f):
    try:
        p, pfad = _unb64(f).decode().split("\n", 1)
        return int(p), pfad
    except (ValueError, UnicodeDecodeError):
        return None, None


def schluessel(c):
    r = c.execute("SELECT data FROM bp_store WHERE key='office:schluessel'").fetchone()
    if r and r["data"]:
        return r["data"].encode()
    s = secrets.token_hex(32)
    c.execute("INSERT INTO bp_store(key, data) VALUES('office:schluessel', ?) ON CONFLICT (key) DO NOTHING", (s,))
    return c.execute("SELECT data FROM bp_store WHERE key='office:schluessel'").fetchone()["data"].encode()


def token(c, user, pid, pfad, schreiben, herkunft=""):
    """Schlüssel für eine Datei → (token, gültig bis in ms)."""
    e = int(time.time()) + DAUER
    d = {"u": user["id"], "n": (user.get("name") if hasattr(user, "get") else user["name"]) or "", "f": fid(pid, pfad), "w": bool(schreiben),
         "e": e, "s": secrets.token_hex(6), "o": herkunft[:200]}
    roh = _b64(json.dumps(d, separators=(",", ":")).encode())
    sig = _b64(hmac.new(schluessel(c), roh.encode(), hashlib.sha256).digest())
    return f"{roh}.{sig}", e * 1000


def pruefen(c, tok, f):
    """Inhalt des Schlüssels, wenn er echt, gültig und für diese Datei ist – sonst None."""
    try:
        roh, sig = (tok or "").split(".", 1)
    except ValueError:
        return None
    if not hmac.compare_digest(sig, _b64(hmac.new(schluessel(c), roh.encode(), hashlib.sha256).digest())):
        return None
    try:
        d = json.loads(_unb64(roh))
    except ValueError:
        return None
    if d.get("f") != f or int(d.get("e") or 0) < time.time():
        return None
    return d


_DISC = {"t": 0, "x": {}}


def _discovery():
    """Endung → {edit, view} (urlsrc) aus /hosting/discovery – eine Stunde gemerkt."""
    if time.time() - _DISC["t"] < 3600 and _DISC["x"]:
        return _DISC["x"]
    with urllib.request.urlopen(OFFICE_INTERNAL + OFFICE_PFAD + "/hosting/discovery", timeout=10) as r:
        xml = r.read().decode("utf-8", "replace")
    x = {}
    for m in re.finditer(r'<action\b([^>]*)/?>', xml):
        a = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        if a.get("ext") and a.get("urlsrc") and a.get("name") in ("edit", "view"):
            x.setdefault(a["ext"].lower(), {})[a["name"]] = a["urlsrc"].replace("&amp;", "&")
    _DISC.update(t=time.time(), x=x)
    return x


def editor_url(pid, pfad, schreiben):
    """Adresse des Editors für den Browser (Formular-Ziel) – Schema und Host aus OFFICE_URL, Pfad (mit service_root) aus der Discovery."""
    import urllib.parse
    A = _discovery().get(endung(pfad)) or {}
    u = A.get("edit" if schreiben else "view") or A.get("view") or A.get("edit")
    if not u:
        raise ValueError(f"Dateien der Art „.{endung(pfad)}“ kann Bauportal Office nicht öffnen.")
    u = re.sub(r"<[^>]*>", "", u)   # Platzhalter wie <ui=UI_LLCC&>
    u = re.match(r"^https?://[^/]+", OFFICE_URL).group(0) + re.sub(r"^https?://[^/]+", "", u)
    return u + ("" if u.endswith(("?", "&")) else "&" if "?" in u else "?") + "WOPISrc=" + urllib.parse.quote(WOPI_BASIS + fid(pid, pfad), safe="") + "&lang=de&closebutton=1"


# ---------------------------------------------------------------- leere Dateien
def leer(art):
    """Bytes einer leeren Datei (docx, xlsx, pptx, odg)."""
    import io
    import zipfile
    if art == "pptx":   # leere Folie 16:9 ohne (englische) Platzhalter – einmal mit python-pptx erzeugt, liegt bei
        with open(os.path.join(os.path.dirname(__file__), "leer", "praesentation.pptx"), "rb") as f:
            return f.read()
    if art == "odg":   # OpenDocument-Zeichnung: mimetype zuerst und ungepackt, dazu Manifest, Inhalt (eine Seite), Seitenformat A4 quer
        ns = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"'
        b = io.BytesIO()
        with zipfile.ZipFile(b, "w") as z:
            z.writestr(zipfile.ZipInfo("mimetype"), "application/vnd.oasis.opendocument.graphics", compress_type=zipfile.ZIP_STORED)
            z.writestr("META-INF/manifest.xml", '<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">'
                       '<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.graphics"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>'
                       '<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/></manifest:manifest>', compress_type=zipfile.ZIP_DEFLATED)
            z.writestr("content.xml", f'<?xml version="1.0" encoding="UTF-8"?><office:document-content {ns} xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" office:version="1.3">'
                       '<office:body><office:drawing><draw:page draw:name="Seite 1" draw:master-page-name="Standard"/></office:drawing></office:body></office:document-content>', compress_type=zipfile.ZIP_DEFLATED)
            z.writestr("styles.xml", f'<?xml version="1.0" encoding="UTF-8"?><office:document-styles {ns} xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" '
                       'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.3"><office:automatic-styles><style:page-layout style:name="PM1">'
                       '<style:page-layout-properties fo:page-width="29.7cm" fo:page-height="21cm" style:print-orientation="landscape" fo:margin-top="1cm" fo:margin-bottom="1cm" fo:margin-left="1cm" fo:margin-right="1cm"/>'
                       '</style:page-layout></office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PM1"/></office:master-styles></office:document-styles>', compress_type=zipfile.ZIP_DEFLATED)
        return b.getvalue()
    if art == "xlsx":
        from openpyxl import Workbook
        b = io.BytesIO()
        wb = Workbook()
        wb.active.title = "Tabelle1"
        wb.save(b)
        return b.getvalue()
    T = {
        "docx": ({"word/document.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p/><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1134" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>'},
                 '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
                 "word/document.xml", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"),
    }
    if art not in T:
        raise ValueError("Unbekannte Art")
    teile, override, haupt, rel = T[art]
    b = io.BytesIO()
    with zipfile.ZipFile(b, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
                   + override + "</Types>")
        z.writestr("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   f'<Relationship Id="rId1" Type="{rel}" Target="{haupt}"/></Relationships>')
        for k, v in teile.items():
            z.writestr(k, v)
    return b.getvalue()
