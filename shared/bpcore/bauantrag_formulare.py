"""Amtliche Bauantragsformulare je Bundesland (App „Bauantrag“).

Je Land eine Seite (Portal), auf der die Vordrucke veröffentlicht sind – NRW: Seite der Architektenkammer (AKNW, ausfüllbare Vordrucke
zur BauO NRW), ersatzweise die Anlagen zur VV BauPrüfVO auf recht.nrw.de; andere Länder trägt die Verwaltung einmal ein. Alle dort veröffentlichten PDFs werden gelistet und in der Datenbank
zwischengespeichert (Tabelle bauantrag_formular); NRW täglich, die anderen beim Öffnen bzw. auf Knopfdruck. Neu oder geändert → To-do
(bpcore/todo.py, Regel „formulare“), bis jemand „gesehen“ drückt.
Ändert sich das Portal so, dass nichts mehr gelesen werden kann (Seite weg, keine PDFs, deutlich weniger als bisher), bleibt der Bestand
erhalten, das Land wird als „Portal nicht lesbar“ gemeldet (To-do) und die Formulare lassen sich selbst hochladen (hochladen()).
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
QUELLE_NRW = "https://www.aknw.de/berufspraxis/planen-und-bauen/bauantragsformulare"   # Architektenkammer NRW: aktuelle Vordrucke
ERSATZ_NRW = "https://recht.nrw.de/taxonomy/term/33405"   # „Link zur aktuellsten Fassung“ der VV BauPrüfVO – wenn die AKNW-Seite nicht lesbar ist
VORHALTEN = set(LAENDER)   # alle veröffentlichten Vordrucke werden zwischengespeichert
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
        a = re.search(r"Anlage\s+([IVX]+)\s*[/-]\s*(\d+(?:\.\d+)*[a-z]?)", text)   # „Anlage I/2“ (recht.nrw.de) oder „Anlage I-2“ (AKNW)
        nr = f"{a.group(1)}/{a.group(2)}" if a else ""
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
    m = re.search(r"/(20\d{2})(\d{2})_Bauantragsformulare", url)   # AKNW: Ordner „202609_Bauantragsformulare-2026-September“
    if m:
        return f"{m.group(2)}/{m.group(1)}"
    m = re.search(r"[Ff]assung vom\s*(\d{1,2}\.\d{1,2}\.\d{4})", seite)
    if m:
        return m.group(1)
    m = re.search(r"Am\s+(\d{1,2}\.\s*\w+\s+\d{4})\s+ist\s+das", seite)   # AKNW-Seite: „Am 1. September 2026 ist das … in Kraft getreten“
    return m.group(1) if m else ""


def quelle(c, land):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"bauantrag:quelle:{land}",)).fetchone()
    try:
        u = (json.loads(r["data"]) if r else {}).get("url", "")
    except ValueError:
        u = ""
    return u or (QUELLE_NRW if land == "NW" else "")


def quelle_setzen(c, land, url, wer):
    if url or land != "NW":   # NRW leer: zurück zur Vorgabe (AKNW)
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
        seite_vorher = stand(c, land).get("seite") or ""
        alt = {r["schluessel"]: dict(r) for r in c.execute("SELECT id, schluessel, url, sha256, status FROM bauantrag_formular WHERE land=?", (land,)).fetchall()}
    if not q:
        return {"fehler": "Für dieses Land ist noch keine Seite mit den Vordrucken eingetragen."}
    erg = {"neu": [], "geaendert": [], "entfallen": [], "fehler": ""}
    try:
        ziel, roh = _holen(q)
        seite = roh.decode("utf-8", "replace")
        A = anlagen_lesen(seite, ziel)
        if land == "NW" and q == QUELLE_NRW and len([a for a in A if a["nr"]]) < 3:   # AKNW-Seite umgebaut: amtliche Anlagen auf recht.nrw.de
            ziel, roh = _holen(ERSATZ_NRW)
            seite = roh.decode("utf-8", "replace")
            A = anlagen_lesen(seite, ziel)
    except Exception as e:   # noqa: BLE001 – Seite nicht erreichbar: Bestand bleibt, Fehler wird gemerkt
        erg["fehler"] = f"Seite nicht erreichbar: {e}"[:300]
        A, ziel, seite = None, q, ""
    if A is not None and not A:
        erg["fehler"] = "Auf der Seite wurden keine Vordrucke (PDF) gefunden."
    bisher = [x for x in alt.values() if x["status"] != "entfallen" and x["url"]]
    neue_quelle = bool(seite_vorher) and A is not None and urllib.parse.urlsplit(seite_vorher).hostname != urllib.parse.urlsplit(ziel).hostname
    if A and not neue_quelle and len(bisher) >= 4 and len(A) < len(bisher) / 2:   # Portal umgebaut? Lieber nichts als „entfallen“ markieren
        erg["fehler"] = f"Auf der Seite stehen nur noch {len(A)} statt bisher {len(bisher)} Vordrucke – das Portal wurde wohl umgebaut."
        A = None
    erg["kaputt"] = bool(erg["fehler"]) and not A
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
                if k not in neu_keys and x["status"] != "entfallen" and x["url"]:   # selbst hochgeladene bleiben
                    c.execute("UPDATE bauantrag_formular SET status='entfallen', geaendert=? WHERE id=?", (_jetzt(), x["id"]))
                    erg["entfallen"].append(k)
    with c_fn() as c:
        st = {**stand(c, land), "geprueft": _jetzt(), "fehler": erg["fehler"], "kaputt": erg["kaputt"]}
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


def hochladen(c, land, nr, titel, daten, wer, fid=None):
    """Formular selbst hochladen (wenn das Portal nicht mehr lesbar ist oder ein Vordruck fehlt). fid: diesen Eintrag ersetzen."""
    daten = bytes(daten or b"")
    if not daten.startswith(b"%PDF"):
        raise ValueError("Bitte eine PDF-Datei wählen.")
    if len(daten) > MAX_PDF:
        raise ValueError("Die Datei ist größer als 15 MB.")
    nr = re.sub(r"\s+", "", str(nr or ""))[:20]
    sha = hashlib.sha256(daten).hexdigest()
    fassung = "hochgeladen " + datetime.now().strftime("%d.%m.%Y")
    if fid:
        c.execute("UPDATE bauantrag_formular SET daten=?, sha256=?, groesse=?, fassung=?, status='aktuell', url='', geaendert=?, titel=COALESCE(NULLIF(?, ''), titel) WHERE id=? AND land=?",
                  (daten, sha, len(daten), fassung, _jetzt(), str(titel or "")[:300], fid, land))
        return fid
    key = nr or "upl:" + sha[:12]
    r = c.execute("SELECT id FROM bauantrag_formular WHERE land=? AND schluessel=?", (land, key)).fetchone()
    if r:
        return hochladen(c, land, nr, titel, daten, wer, r["id"])
    return c.execute("""INSERT INTO bauantrag_formular(land, schluessel, nr, titel, url, sha256, groesse, daten, fassung, status)
                        VALUES(?,?,?,?,'',?,?,?,?,'aktuell') RETURNING id""", (land, key, nr, str(titel or "Formular")[:300], sha, len(daten), daten, fassung)).fetchone()["id"]


def kaputt(c):
    """Länder, deren Portal zuletzt nicht lesbar war: [(land, fehler)]."""
    out = []
    for r in c.execute("SELECT key, data FROM bp_store WHERE key LIKE 'bauantrag:formulare:%'").fetchall():
        try:
            d = json.loads(r["data"])
        except ValueError:
            continue
        if d.get("kaputt"):
            out.append((r["key"].rsplit(":", 1)[1], d.get("fehler") or ""))
    return out


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


# ---------------------------------------------------------------- amtliches Formular ausfüllen
def fold(s):
    s = str(s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def formular_fuer(c, verfahren, werte, land="NW"):
    """Welche Anlage gilt: Freistellung → I/3; Sonderbau → I/1 (Baugenehmigungsverfahren); sonst I/2 (vereinfachtes Verfahren,
    auch für den Vorbescheid). → Zeile mit daten oder None."""
    nr = "I/3" if verfahren == "freistellung" else "I/1" if (werte.get("sonderbau") == "ja" or "Sonderbau" in (werte.get("verfahrensart") or "")) else "I/2"
    r = c.execute("SELECT id, nr, titel, daten, fassung, sha256 FROM bauantrag_formular WHERE land=? AND nr=? AND status<>'entfallen'", (land, nr)).fetchone()
    return (dict(r) if r else None), nr


def felder(daten):
    """Formularfelder eines PDFs: [{name, tu, typ, an}] (an = Wert für „angekreuzt“ bei Kästchen)."""
    import io
    from pypdf import PdfReader
    rd = PdfReader(io.BytesIO(bytes(daten)))
    out = []
    for name, f in (rd.get_fields() or {}).items():
        typ = f.get("/FT")
        an = ""
        if typ == "/Btn":
            st = [x for x in (f.get("/_States_", []) or []) if x != "/Off"]
            an = st[0] if st else "/Yes"
        out.append({"name": name, "tu": str(f.get("/TU") or ""), "typ": {"/Tx": "text", "/Btn": "kreuz", "/Ch": "wahl"}.get(typ, str(typ)), "an": an})
    return out


def _teile(adr):
    """„Straße 1, 45141 Essen“ → (Straße 1, 45141, Essen)."""
    t = [x.strip() for x in (adr or "").split(",") if x.strip()]
    if not t:
        return "", "", ""
    m = re.match(r"^(\d{5})\s+(.+)$", t[-1])
    if m:
        return ", ".join(t[:-1]), m.group(1), m.group(2)
    return ", ".join(t), "", ""


# Zuordnung: unser Wert → Feld, erkannt an Name/Tooltip (barrierefreie Formulare haben sprechende Tooltips). Je Regel: Abschnitt
# (muss vorkommen, „“ = egal), Wörter (alle müssen vorkommen), Wörter, die nicht vorkommen dürfen.
REGELN = [
    ("bh_name", "bauherr", ("name",), ("vertret",)), ("bh_name", "bauherr", ("firma",), ("vertret",)),
    ("bh_strasse", "bauherr", ("strasse",), ("vertret",)), ("bh_plzort", "bauherr", ("plz",), ("vertret",)), ("bh_ort", "bauherr", ("ort",), ("vertret", "plz")),
    ("bh_vertreter", "", ("vertreten",), ()),
    ("ev_name", "entwurf", ("name",), ("bauvorlage",)), ("ev_name", "entwurf", ("buero",), ()),
    ("ev_strasse", "entwurf", ("strasse",), ()), ("ev_plzort", "entwurf", ("plz",), ()), ("ev_bv", "", ("bauvorlageberechtigt",), ()),
    ("ev_kammernr", "", ("mitgliedsnummer",), ()), ("ev_kammernr", "", ("kammer",), ()),
    ("ev_tel", "entwurf", ("telefon",), ("mobil",)), ("ev_mail", "entwurf", ("mail",), ()),
    ("gs_ort", "grundstueck", ("ort",), ("ortsteil",)), ("gs_strasse", "grundstueck", ("strasse",), ()), ("gs_hausnr", "grundstueck", ("hausnummer",), ()),
    ("gemarkung", "", ("gemarkung",), ()), ("flurstueck", "", ("flurstueck",), ()), ("flur", "", ("flur",), ("flurstueck", "flurkarte")),
    ("bezeichnung", "", ("bezeichnung", "vorhaben"), ()), ("rohbau", "", ("rohbau",), ()), ("herstellung", "", ("herstell",), ()),
]


def ausfuellen(daten, W):
    """Amtliches PDF mit den Werten W ({feld: wert} aus dem Antrag) ausfüllen. → (PDF-Bytes, Anzahl gefüllt, Anzahl Felder)."""
    import io
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import NameObject, BooleanObject
    rd = PdfReader(io.BytesIO(bytes(daten)))
    F = felder(daten)
    w = PdfWriter(clone_from=rd)
    if not F:
        out = io.BytesIO(); w.write(out)
        return out.getvalue(), 0, 0
    bs, bp, bo = _teile(W.get("bauherr_anschrift"))
    es, ep, eo = _teile(W.get("ev_anschrift"))
    gs = W.get("gs_strasse") or ""
    m = re.match(r"^(.*?)\s+(\d+\s*[a-zA-Z]?(?:\s*[-–]\s*\d+\s*[a-zA-Z]?)?)$", gs)
    gp, go = (W.get("gs_ort") or "").split(" ", 1) if re.match(r"^\d{5}\s", W.get("gs_ort") or "") else ("", W.get("gs_ort") or "")
    V = {"bh_name": W.get("bauherr_name"), "bh_strasse": bs, "bh_plzort": f"{bp} {bo}".strip(), "bh_ort": bo, "bh_vertreter": W.get("bauherr_vertreter"),
         "ev_name": W.get("ev_name"), "ev_strasse": es, "ev_plzort": f"{ep} {eo}".strip(), "ev_bv": W.get("ev_name"),
         "ev_kammernr": " ".join(x for x in (W.get("ev_kammer"), W.get("ev_kammernr")) if x), "ev_tel": W.get("ev_tel"), "ev_mail": W.get("ev_mail"),
         "gs_ort": go, "gs_strasse": m.group(1) if m else gs, "gs_hausnr": m.group(2) if m else "", "gemarkung": W.get("gemarkung"), "flur": W.get("flur"),
         "flurstueck": W.get("flurstueck"), "bezeichnung": W.get("bezeichnung"),
         "rohbau": _eur(W.get("rohbau")), "herstellung": _eur(W.get("herstellung"))}
    werte, benutzt = {}, set()
    for key, abschnitt, worte, nicht in REGELN:
        if not V.get(key) or key in benutzt:
            continue
        for f in F:
            if f["name"] in werte or f["typ"] != "text":
                continue
            t = fold(f["name"] + " " + f["tu"])
            if (not abschnitt or abschnitt in t) and all(x in t for x in worte) and not any(x in t for x in nicht):
                werte[f["name"]] = str(V[key]); benutzt.add(key)
                break
    kreuze = {}
    gk, verf = str(W.get("gebaeudeklasse") or ""), W.get("verfahren")
    for f in F:   # Kästchen: Gebäudeklasse, Sonderbau, Vorbescheid / vereinfachtes Verfahren
        if f["typ"] != "kreuz":
            continue
        t = fold(f["name"] + " " + f["tu"])
        an = (gk and "gebaeudeklasse" in t and re.search(rf"\b{gk}\b", t)) or (W.get("sonderbau") == "ja" and "sonderbau" in t) \
            or (verf == "vorbescheid" and "vorbescheid" in t) or (verf == "baugenehmigung" and "vereinfacht" in t and W.get("sonderbau") != "ja")
        if an:
            kreuze[f["name"]] = f["an"] or "/Yes"
    for page in w.pages:
        try:
            w.update_page_form_field_values(page, {**werte, **kreuze}, auto_regenerate=False)
        except Exception:   # noqa: BLE001 – Seite ohne Felder
            pass
    try:
        w._root_object["/AcroForm"][NameObject("/NeedAppearances")] = BooleanObject(True)   # Leser zeichnen die Werte selbst
    except Exception:   # noqa: BLE001
        pass
    out = io.BytesIO(); w.write(out)
    return out.getvalue(), len(werte) + len(kreuze), len(F)


def _eur(v):
    try:
        return f"{float(str(v).replace('.', '').replace(',', '.')):,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".") if v not in (None, "") else ""
    except ValueError:
        return str(v)
