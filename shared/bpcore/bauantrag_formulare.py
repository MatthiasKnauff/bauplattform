"""Amtliche Bauantragsformulare je Bundesland (App „Bauantrag“).

NRW: Die Vordrucke sind Anlagen zur VV BauPrüfVO auf recht.nrw.de; der feste Link „aktuellste Fassung“ führt immer auf die geltende
Fassung. Der Dienste-Container prüft täglich (und die App auf Knopfdruck): Anlagen lesen, neue oder geänderte PDFs laden und in der
Datenbank vorhalten (Tabelle bauantrag_formular). Kommt eine Anlage hinzu oder ändert sich eine, steht sie auf „neu“ bzw. „geaendert“ –
das wird als To-do gemeldet (bpcore/todo.py, Regel „formulare“), bis jemand „gesehen“ drückt.
Andere Länder: auf Abruf – die Seite des Landes mit den Vordrucken wird einmal eingetragen (nur Verwaltung), gelistet werden die
PDF-Links dort; vorgehalten wird nichts.
"""
import hashlib
import html
import ipaddress
import json
import re
import socket
import urllib.parse
import urllib.request
from datetime import datetime

LAENDER = {"BW": "Baden-Württemberg", "BY": "Bayern", "BE": "Berlin", "BB": "Brandenburg", "HB": "Bremen", "HH": "Hamburg", "HE": "Hessen",
           "MV": "Mecklenburg-Vorpommern", "NI": "Niedersachsen", "NW": "Nordrhein-Westfalen", "RP": "Rheinland-Pfalz", "SL": "Saarland",
           "SN": "Sachsen", "ST": "Sachsen-Anhalt", "SH": "Schleswig-Holstein", "TH": "Thüringen"}
QUELLE_NRW = "https://recht.nrw.de/taxonomy/term/33405"   # „Link zur aktuellsten Fassung“ der VV BauPrüfVO
VORHALTEN = {"NW"}
MAX_PDF = 15 * 1024 * 1024
UA = {"User-Agent": "Bauplattform/1.0 (Formularpruefung)"}


def _jetzt():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _sicher(url):
    """Nur https und keine Adressen im eigenen Netz (der Server ruft die Seite ab – nichts Internes erreichbar machen)."""
    u = urllib.parse.urlsplit(url or "")
    if u.scheme != "https" or not u.hostname:
        raise ValueError("Bitte eine https-Adresse angeben.")
    for info in socket.getaddrinfo(u.hostname, 443):
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise ValueError("Diese Adresse liegt im eigenen Netz und wird nicht abgerufen.")
    return url


def _holen(url, max_bytes=3 * 1024 * 1024):
    _sicher(url)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        _sicher(r.geturl())   # auch das Ziel einer Weiterleitung prüfen
        data = r.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise ValueError("Datei zu groß.")
        return r.geturl(), data


def anlagen_lesen(seite, basis):
    """PDF-Links einer Seite: [{schluessel, nr, titel, url}] – NRW: je Anlage (I/1 …), sonst je Link."""
    out, seen = [], {}
    for m in re.finditer(r'<a\s[^>]*href="([^"]+\.pdf)"[^>]*>(.*?)</a>', seite, re.I | re.S):
        url = urllib.parse.urljoin(basis, html.unescape(m.group(1)))
        text = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", m.group(2))).split())
        text = re.sub(r"\s*\(?PDF\)?\s*(Nicht\s+)?[Bb]arrierefrei\s*$", "", text).strip(" ()")
        a = re.search(r"Anlage\s+([IVX]+\s*/\s*[\d.]+[a-z]?)", text)
        nr = re.sub(r"\s+", "", a.group(1)) if a else ""
        titel = text[a.end():].strip(" –-:") if a else text
        key = nr or url
        if key in seen:   # gleiche Anlage zweimal verlinkt (Titel / „PDF barrierefrei“): den längeren Titel behalten
            if len(titel) > len(out[seen[key]]["titel"]):
                out[seen[key]]["titel"] = titel
            continue
        seen[key] = len(out)
        out.append({"schluessel": key, "nr": nr, "titel": titel or url.rsplit("/", 1)[-1], "url": url})
    return out


def _fassung(url, seite):
    m = re.search(r"/(\d{2})(\d{2})(\d{4})-", url)
    if m:
        return f"{m.group(1)}.{m.group(2)}.{m.group(3)}"
    m = re.search(r"[Ff]assung vom\s*(\d{1,2}\.\d{1,2}\.\d{4})", seite)
    return m.group(1) if m else ""


def quelle(c, land):
    if land == "NW":
        return QUELLE_NRW
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"bauantrag:quelle:{land}",)).fetchone()
    try:
        return (json.loads(r["data"]) if r else {}).get("url", "")
    except ValueError:
        return ""


def quelle_setzen(c, land, url, wer):
    _sicher(url)
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (f"bauantrag:quelle:{land}", json.dumps({"url": url}), _jetzt(), wer))


def stand(c, land):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"bauantrag:formulare:{land}",)).fetchone()
    try:
        return json.loads(r["data"]) if r else {}
    except ValueError:
        return {}


def pruefen(c_fn, land="NW", wer="dienste"):
    """Quelle lesen und mit dem Bestand abgleichen. c_fn: Verbindung als Kontextmanager (db.tx). → {neu, geaendert, entfallen, fehler}"""
    with c_fn() as c:
        q = quelle(c, land)
        alt = {r["schluessel"]: dict(r) for r in c.execute("SELECT id, schluessel, url, sha256, status FROM bauantrag_formular WHERE land=?", (land,)).fetchall()}
    if not q:
        return {"fehler": "Für dieses Land ist noch keine Seite mit den Vordrucken eingetragen."}
    erg = {"neu": [], "geaendert": [], "entfallen": [], "fehler": ""}
    try:
        ziel, roh = _holen(q)
        seite = roh.decode("utf-8", "replace")
        A = anlagen_lesen(seite, ziel)
    except Exception as e:   # noqa: BLE001 – Seite nicht erreichbar: Bestand bleibt, Fehler wird gemerkt
        erg["fehler"] = f"Seite nicht erreichbar: {e}"[:300]
        A, ziel, seite = None, q, ""
    if A is not None and not A:
        erg["fehler"] = "Auf der Seite wurden keine Vordrucke (PDF) gefunden."
    fassung = _fassung(ziel, seite) if A else ""
    erst = not alt   # allererster Abgleich: alles gilt als „aktuell“, keine Flut von Meldungen
    for a in A or []:
        x = alt.get(a["schluessel"])
        daten, sha, groesse = None, "", 0
        if land in VORHALTEN and (not x or x["url"] != a["url"] or not x["sha256"]):
            try:
                _, daten = _holen(a["url"], MAX_PDF)
                sha, groesse = hashlib.sha256(daten).hexdigest(), len(daten)
            except Exception as e:   # noqa: BLE001 – einzelnes PDF nicht ladbar: Eintrag trotzdem führen
                erg["fehler"] = (erg["fehler"] + f" {a['nr'] or a['titel']}: {e}")[:300]
        with c_fn() as c:
            if not x:
                c.execute("""INSERT INTO bauantrag_formular(land, schluessel, nr, titel, url, sha256, groesse, daten, fassung, status)
                             VALUES(?,?,?,?,?,?,?,?,?,?)""", (land, a["schluessel"], a["nr"], a["titel"][:300], a["url"], sha, groesse, daten, fassung, "aktuell" if erst else "neu"))
                if not erst:
                    erg["neu"].append(a)
            else:
                anders = x["url"] != a["url"] or (sha and x["sha256"] and sha != x["sha256"])
                st = "geaendert" if anders and x["status"] != "neu" else ("aktuell" if x["status"] == "entfallen" else x["status"])
                if anders:
                    erg["geaendert"].append(a)
                c.execute("""UPDATE bauantrag_formular SET nr=?, titel=?, url=?, sha256=COALESCE(NULLIF(?, ''), sha256), groesse=CASE WHEN ? > 0 THEN ? ELSE groesse END,
                             daten=COALESCE(?, daten), fassung=CASE WHEN ? THEN ? ELSE fassung END, status=?, geaendert=CASE WHEN ? THEN ? ELSE geaendert END WHERE id=?""",
                          (a["nr"], a["titel"][:300], a["url"], sha, groesse, groesse, daten, bool(anders), fassung, st, bool(anders), _jetzt(), x["id"]))
    if A:
        neu_keys = {a["schluessel"] for a in A}
        with c_fn() as c:
            for k, x in alt.items():
                if k not in neu_keys and x["status"] != "entfallen":
                    c.execute("UPDATE bauantrag_formular SET status='entfallen', geaendert=? WHERE id=?", (_jetzt(), x["id"]))
                    erg["entfallen"].append(k)
    with c_fn() as c:
        st = {**stand(c, land), "geprueft": _jetzt(), "fehler": erg["fehler"]}
        if fassung:
            st["fassung"], st["seite"] = fassung, ziel
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
                  "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (f"bauantrag:formulare:{land}", json.dumps(st, ensure_ascii=False), _jetzt(), wer))
    return erg


def liste(c, land):
    F = [{**dict(r), "hat_datei": bool(r["hat"])} for r in c.execute(
        """SELECT id, nr, titel, url, groesse, fassung, status, gefunden, geaendert, daten IS NOT NULL AS hat FROM bauantrag_formular
           WHERE land=? ORDER BY status='entfallen', CASE WHEN nr ~ '^II' THEN 2 WHEN nr ~ '^I' THEN 1 ELSE 3 END, nr, titel""", (land,)).fetchall()]
    for f in F:
        f.pop("hat", None)
    return F


def offen(c):
    """Neue oder geänderte Formulare (für die To-do-Liste)."""
    return [dict(r) for r in c.execute("SELECT id, land, nr, titel, status, geaendert FROM bauantrag_formular WHERE status IN ('neu','geaendert') ORDER BY land, nr").fetchall()]


def start(c_fn, stunde=5):
    """Dienste-Container: täglich ab 5 Uhr NRW prüfen (nur in der Produktion sinnvoll, schadet im Test aber nicht)."""
    import threading
    import time

    def loop():
        done = ""
        while True:
            time.sleep(900)
            now = datetime.now()
            if now.hour >= stunde and done != now.date().isoformat():
                done = now.date().isoformat()
                try:
                    pruefen(c_fn, "NW")
                except Exception as e:   # noqa: BLE001 – nächster Tag wieder
                    from . import fehler
                    fehler.still("dienste", "Bauantragsformulare prüfen", e)
    threading.Thread(target=loop, daemon=True, name="formulare").start()
