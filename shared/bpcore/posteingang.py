"""Posteingang: Mails zu den eigenen Projekten – einmal am Tag (oder auf Knopfdruck) als Übersicht.

Quellen
  Microsoft 365  zentral in der Verwaltung: App-Registrierung (Mandant, Client-ID, Geheimnis) mit der Anwendungsberechtigung
                 Mail.Read. Gelesen wird je Benutzer nur dessen eigenes Postfach (Adresse aus seinem Konto) – nur lesend.
  IMAP           weitere eigene Postfächer, die jeder unter „Mein Konto“ selbst einträgt (Gmail, Web.de, eigene Domain …).

Zuordnung nur zu den Projekten, für die der Benutzer im Bautagebuch zuständig ist („Meine Projekte“):
  Projektnummer (z. B. A481) im Betreff/Text · Absender ist eine Firma des Projekts (Bautagebuch, Angebote, Aufträge) ·
  markante Wörter aus Projektname und Straße (z. B. „Tierheim“, „Grillo“).
Mails ohne Bezug zu den eigenen Projekten bleiben außen vor.

Gespeichert wird nur, was die Übersicht braucht (Absender, Betreff, Zeit, kurze Vorschau, Namen der Anhänge) –
in bp_store „post:<uid>“; die Zugangsdaten der eigenen Postfächer in „postfaecher:<uid>“.
"""
import email, email.header, email.utils, imaplib, json, re, threading, unicodedata, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

from . import konto

ARTEN = (   # (Art, Muster) – das erste passende gewinnt
    ("Schlussrechnung", r"schlussrechnung|schlussabrechnung"),
    ("Rechnung", r"rechnung|invoice|faktura|\bre[-\s]?nr|abschlag|teilrechnung"),
    ("Nachtrag", r"nachtrag|mehrkosten|zusatzleistung|§\s*2\s*abs"),
    ("Angebot", r"angebot|kostenvoranschlag|offerte"),
    ("Behinderung", r"behinderung|bedenken|§\s*4\s*abs\.?\s*3|§\s*6\s*abs"),
    ("Mangel", r"mangel|maengel|mängel|schaden|reklamation"),
    ("Termin", r"termin|frist|abnahme|besprechung|baubesprechung|ortstermin|einladung"),
    ("Plan", r"\bplan\b|plaene|pläne|zeichnung|\.dwg|\.pdf.*index"),
)
WICHTIG = {"Schlussrechnung", "Rechnung", "Nachtrag", "Angebot", "Behinderung", "Mangel", "Termin"}
FREEMAIL = {"gmail.com", "googlemail.com", "web.de", "gmx.de", "gmx.net", "t-online.de", "outlook.com", "hotmail.com", "hotmail.de",
            "live.de", "yahoo.de", "yahoo.com", "icloud.com", "me.com", "aol.com", "freenet.de", "arcor.de", "posteo.de", "mailbox.org"}
STOPP = {"neubau", "umbau", "anbau", "sanierung", "erweiterung", "modernisierung", "strasse", "straße", "weg", "platz", "allee",
         "haus", "gebaeude", "gebäude", "projekt", "bauvorhaben", "wohnhaus", "wohnungen", "halle", "essen", "bochum",
         "dortmund", "bottrop", "gelsenkirchen", "duisburg", "oberhausen", "muelheim", "mülheim", "herne", "gladbeck", "recklinghausen"}

_lock = threading.Lock()
_busy = set()


def fold(s):
    s = unicodedata.normalize("NFKD", str(s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss"))
    return "".join(ch for ch in s if not unicodedata.combining(ch))


def _now():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------- Einstellungen
def m365_conf(c):
    r = {x["key"]: x["value"] for x in c.execute("SELECT key, value FROM settings WHERE key IN ('m365_tenant','m365_client','m365_secret')").fetchall()}
    return {"tenant": (r.get("m365_tenant") or "").strip(), "client": (r.get("m365_client") or "").strip(), "secret": (r.get("m365_secret") or "").strip()}


def m365_ok(c):
    m = m365_conf(c)
    return bool(m["tenant"] and m["client"] and m["secret"])


def postfaecher(c, uid):
    v = konto._get(c, f"postfaecher:{uid}")
    try:
        d = json.loads(v) if v else {}
    except ValueError:
        d = {}
    return {"m365": d.get("m365", True), "konten": [k for k in d.get("konten") or [] if isinstance(k, dict)], "abruf": _abruf(d.get("abruf")),
            "eigene": _eigene(d.get("eigene")), "anzeige": _anzeige(d.get("anzeige"))}


def _anzeige(a):
    """Wie lange eine Mail in der Übersicht steht: tage (1–14), wochenende=True → Samstag/Sonntag zählen nicht mit."""
    a = a if isinstance(a, dict) else {}
    try:
        t = max(1, min(14, int(a.get("tage") or 1)))
    except (TypeError, ValueError):
        t = 1
    return {"tage": t, "wochenende": a.get("wochenende", True) is not False}


def _eigene(e):
    """Selbst verschickte Mails, die als Kopie in einem gemeinsamen Postfach (z. B. mail@) landen, ausblenden.
    postfaecher leer = in allen Postfächern."""
    e = e if isinstance(e, dict) else {}
    pf = e.get("postfaecher")
    if isinstance(pf, str):
        pf = re.split(r"[\s,;]+", pf)
    pf = sorted({str(a).strip().lower() for a in (pf or []) if "@" in str(a)})[:20]
    return {"aus": e.get("aus", True) is not False, "postfaecher": pf, "cc": e.get("cc", True) is not False}


def meine_adressen(c, u):
    pf = postfaecher(c, u["id"])
    a = {(u["email"] or "").strip().lower()} | {str(k.get("user") or "").strip().lower() for k in pf["konten"]}
    return {x for x in a if "@" in x}


def eigene_filtern(c, u, mails):
    """Mails ohne die eigenen Kopien (Absender = ich, gelesen aus einem der eingestellten Postfächer)."""
    e = postfaecher(c, u["id"])["eigene"]
    if not e["aus"] and not e["cc"]:
        return mails
    ich, nur, namen = meine_adressen(c, u), set(e["postfaecher"]), meine_namen(u)
    out = []
    for m in mails:
        von, pf = (m.get("von") or "").lower(), (m.get("postfach") or m.get("quelle") or "").lower()
        if e["aus"] and (von in ich or (von and von == pf)) and (not nur or pf in nur):
            continue   # selbst geschickt – auch aus dem gemeinsamen Postfach (z. B. Mail aus dem Büro-Postfach, Kopie an mail@)
        if e["cc"] and _nur_kenntnis(m, ich | {pf}) and not m.get("persoenlich") and not angesprochen(m, namen):
            continue   # nur in CC – außer ich werde im Text persönlich angesprochen
        out.append(m)
    return out


def meine_namen(u):
    """Vor- und Nachname des Benutzers (für „im Text angesprochen“)."""
    n = ""
    for k in ("vorname", "nachname", "name"):
        try:
            n += " " + fold(u[k] or "")
        except (KeyError, IndexError, TypeError):
            pass
    return list(dict.fromkeys(re.findall(r"[a-z]{3,}", n)))[:4]


def angesprochen(m, namen):
    """Wird der Benutzer im Text persönlich angesprochen? („Hallo Matthias“, „Sehr geehrter Herr Knauff“, „@Matthias“, „Matthias, …“ am Anfang)"""
    if not namen:
        return False
    t = fold(" ".join([m.get("suchtext") or m.get("vorschau") or ""]))[:700]
    n = "(?:" + "|".join(re.escape(x) for x in namen) + ")"
    return bool(re.search(r"(?:hallo|hi|hey|moin|servus|lieber|liebe|guten (?:morgen|tag|abend)|sehr geehrte[rs]? (?:herr|frau)|herr|frau|@)\s*" + n + r"\b", t)
                or re.match(r"\s*" + n + r"\b\s*[,!]", t))


def _nur_kenntnis(m, wir):
    """Nur zur Kenntnis: wir stehen nur in CC, nicht unter „An“ (ältere Abrufe ohne Empfänger: nie)."""
    an, cc = [a.lower() for a in m.get("an") or []], [a.lower() for a in m.get("cc") or []]
    if not an and not cc:
        return False
    return not any(a in wir for a in an) and any(a in wir for a in cc)


RHYTHMEN = ("tag", "zweimal", "stuendlich", "hand")


def _abruf(a):
    """Wie oft die Postfächer gelesen werden: einmal am Tag (Uhrzeit), zweimal (Uhrzeit und 5 h später), stündlich 7–19 Uhr, nur von Hand."""
    a = a if isinstance(a, dict) else {}
    r = a.get("rhythmus") if a.get("rhythmus") in RHYTHMEN else "tag"
    z = str(a.get("uhrzeit") or "08:00")
    return {"rhythmus": r, "uhrzeit": z if re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", z) else "08:00"}


def letzter_termin(abruf, jetzt=None):
    """Der letzte planmäßige Abruf vor „jetzt“ (Ortszeit) – oder None (nur von Hand)."""
    jetzt = jetzt or datetime.now()
    r = abruf["rhythmus"]
    if r == "hand":
        return None
    h, m = map(int, abruf["uhrzeit"].split(":"))
    if r == "stuendlich":
        zeiten = [(x, 0) for x in range(7, 20)]
    elif r == "zweimal":
        zeiten = [(h, m), ((h + 5) % 24, m)]
    else:
        zeiten = [(h, m)]
    kand = []
    for tag in (jetzt.date(), jetzt.date() - timedelta(days=1)):
        for hh, mm in zeiten:
            t = datetime(tag.year, tag.month, tag.day, hh, mm)
            if t <= jetzt:
                kand.append(t)
    return max(kand) if kand else None


def faellig(c, uid):
    """Ist ein planmäßiger Abruf fällig (seit dem letzten Termin noch nicht gelesen)?"""
    t = letzter_termin(postfaecher(c, uid)["abruf"])
    if not t:
        return False
    st = lesen(c, uid).get("stand")
    try:
        stand = datetime.fromisoformat(st).astimezone().replace(tzinfo=None) if st else None
    except ValueError:
        stand = None
    return stand is None or stand < t


def alle_faelligen(c_fn):
    """Hintergrund (alle 5 Minuten aus der Aufgaben-App): für jeden eingerichteten Benutzer abrufen, wenn sein Termin erreicht ist."""
    with c_fn() as c:
        users = c.execute("SELECT * FROM users WHERE active=1").fetchall()
    n = 0
    for u in users:
        try:
            with c_fn() as c:
                if not c.execute("SELECT pg_try_advisory_xact_lock(hashtext(?)) AS ok", (f"post:{u['id']}",)).fetchone()["ok"]:
                    continue
                if eingerichtet(c, u) and faellig(c, u["id"]):
                    abrufen(c, u)
                    n += 1
        except Exception as e:   # einzelnes Postfach gestört – die anderen trotzdem
            from . import fehler
            fehler.still(None, f"Postfach abrufen (Benutzer {u['id']})", e)
            continue
    return n


def postfaecher_oeffentlich(c, uid):
    d = postfaecher(c, uid)
    return {"m365": d["m365"], "abruf": d["abruf"], "eigene": d["eigene"], "anzeige": d["anzeige"],
            "konten": [{**{k: v for k, v in x.items() if k not in ("pass", "refresh")}, "pass_set": bool(x.get("pass")), "verbunden": bool(x.get("refresh"))} for x in d["konten"]]}   # Geheimnisse verlassen den Server nie


def postfaecher_setzen(c, uid, b, by):
    alt = postfaecher(c, uid)
    altk = {k.get("id"): k for k in alt["konten"]}
    neu = []
    for k in (b.get("konten") or [])[:8]:
        if not isinstance(k, dict):
            continue
        kid = re.sub(r"[^a-z0-9]", "", str(k.get("id") or ""))[:12] or __import__("uuid").uuid4().hex[:8]
        x = {"id": kid, "name": str(k.get("name") or "")[:60], "host": str(k.get("host") or "").strip()[:120],
             "port": int(k.get("port") or 993) if str(k.get("port") or "993").isdigit() else 993, "user": str(k.get("user") or "").strip()[:160],
             "ordner": str(k.get("ordner") or "INBOX").strip()[:80] or "INBOX", "an": k.get("an", True) is not False}
        pw = k.get("pass")
        x["pass"] = pw if isinstance(pw, str) and pw else (altk.get(kid) or {}).get("pass", "")
        if x["host"] and x["user"]:
            neu.append(x)
    d = {"m365": b.get("m365", alt["m365"]) is not False, "konten": neu, "abruf": _abruf(b.get("abruf") or alt["abruf"]),
         "eigene": _eigene(b.get("eigene") if b.get("eigene") is not None else alt["eigene"]),
         "anzeige": _anzeige(b.get("anzeige") if b.get("anzeige") is not None else alt["anzeige"])}
    konto._put(c, f"postfaecher:{uid}", json.dumps(d, ensure_ascii=False), by)
    return postfaecher_oeffentlich(c, uid)


# ---------------------------------------------------------------- Abruf: Microsoft 365 (Graph, nur lesen)
def _json(url, data=None, headers=None, timeout=25):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def _token(m):
    d = urllib.parse.urlencode({"client_id": m["client"], "client_secret": m["secret"], "scope": "https://graph.microsoft.com/.default",
                                "grant_type": "client_credentials"}).encode()
    try:
        return _json(f"https://login.microsoftonline.com/{urllib.parse.quote(m['tenant'])}/oauth2/v2.0/token", d,
                     {"Content-Type": "application/x-www-form-urlencoded"})["access_token"]
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Anmeldung bei Microsoft 365 abgelehnt ({e.code}) – Mandant, Client-ID und Geheimnis prüfen.")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Microsoft 365 nicht erreichbar ({e.reason}) – Internetzugang des Servers prüfen.")


def m365_lesen(m, adresse, seit):
    tok = _token(m)
    h = {"Authorization": "Bearer " + tok, "Prefer": 'outlook.body-content-type="text"'}
    q = urllib.parse.urlencode({"$filter": f"receivedDateTime ge {seit.strftime('%Y-%m-%dT%H:%M:%SZ')}", "$orderby": "receivedDateTime desc", "$top": "100",
                                "$select": "id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,body,hasAttachments,webLink,isRead"})
    try:
        d = _json(f"https://graph.microsoft.com/v1.0/users/{urllib.parse.quote(adresse)}/mailFolders/inbox/messages?{q}", headers=h)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Postfach {adresse} nicht lesbar ({e.code}) – hat die App die Berechtigung „Mail.Read“ (Anwendung) mit Administratorzustimmung?")
    out = []
    for x in d.get("value") or []:
        f = (x.get("from") or {}).get("emailAddress") or {}
        anh = []
        if x.get("hasAttachments") and len(out) < 60:
            try:
                a = _json(f"https://graph.microsoft.com/v1.0/users/{urllib.parse.quote(adresse)}/messages/{x['id']}/attachments?$select=name", headers=h, timeout=15)
                anh = [y.get("name") or "" for y in a.get("value") or []][:12]
            except Exception:   # Anhangnamen nur Beiwerk
                pass
        out.append({"id": "m:" + x["id"][-40:], "quelle": adresse, "von": (f.get("address") or "").lower(), "von_name": f.get("name") or "",
                    "betreff": x.get("subject") or "", "zeit": x.get("receivedDateTime") or "", "vorschau": (x.get("bodyPreview") or "")[:400],
                    "anhaenge": anh, "link": x.get("webLink") or "", "gelesen": bool(x.get("isRead")), "postfach": adresse.lower(),
                    "an": [((r.get("emailAddress") or {}).get("address") or "").lower() for r in x.get("toRecipients") or []][:40],
                    "cc": [((r.get("emailAddress") or {}).get("address") or "").lower() for r in x.get("ccRecipients") or []][:40],
                    "suchtext": " ".join(((x.get("body") or {}).get("content") or x.get("bodyPreview") or "").split())[:5000]})   # nur zum Zuordnen, wird nicht gespeichert
    return out


# ---------------------------------------------------------------- Abruf: IMAP (eigene Postfächer)
def _dec(s):
    try:
        return str(email.header.make_header(email.header.decode_header(s or "")))
    except Exception:   # Kopfzeile nicht dekodierbar: Rohtext zeigen
        return s or ""


def imap_lesen(k, seit):
    M = imaplib.IMAP4_SSL(k["host"], int(k.get("port") or 993), timeout=25) if int(k.get("port") or 993) != 143 else imaplib.IMAP4(k["host"], 143, timeout=25)
    try:
        if int(k.get("port") or 993) == 143:
            M.starttls()
        M.login(k["user"], k.get("pass") or "")
        M.select('"' + (k.get("ordner") or "INBOX").replace('"', "") + '"', readonly=True)
        typ, data = M.search(None, "SINCE", seit.strftime("%d-%b-%Y"))
        ids = (data[0] or b"").split()[-80:]
        out = []
        for i in reversed(ids):
            typ, d = M.fetch(i, "(BODY.PEEK[HEADER] BODYSTRUCTURE BODY.PEEK[TEXT]<0.6000>)")
            head, text, struct = b"", b"", ""
            for part in d:
                if isinstance(part, tuple):
                    kopf = part[0].decode("latin-1", "replace").upper()
                    if "HEADER" in kopf:
                        head = part[1]
                    elif "TEXT" in kopf:
                        text = part[1]
                    if "BODYSTRUCTURE" in kopf:
                        struct = part[0].decode("latin-1", "replace")
                elif isinstance(part, bytes) and b"BODYSTRUCTURE" in part:
                    struct += part.decode("latin-1", "replace")
            msg = email.message_from_bytes(head + b"\r\n" + text)
            try:
                zeit = email.utils.parsedate_to_datetime(msg.get("Date")).astimezone(timezone.utc)
            except Exception:   # Datum nicht lesbar: als neu werten
                zeit = _now()
            if zeit < seit:
                continue
            name, adr = email.utils.parseaddr(_dec(msg.get("From")))
            vorschau = ""
            for p in msg.walk() if msg.is_multipart() else [msg]:
                if p.get_content_type() == "text/plain":
                    try:
                        vorschau = (p.get_payload(decode=True) or b"").decode(p.get_content_charset() or "utf-8", "replace")
                    except Exception:   # Zeichensatz unbekannt: Rohtext als Vorschau
                        vorschau = str(p.get_payload())[:600]
                    break
            if not vorschau:   # nur HTML – grob entschlackt
                vorschau = re.sub(r"<[^>]+>", " ", text.decode("utf-8", "replace"))
            anh = [_dec(x) for x in re.findall(r'"(?:FILENAME|NAME)" "([^"]+)"', struct, re.I)][:12]
            out.append({"id": f"i:{k['id']}:{(msg.get('Message-ID') or i.decode())[-60:]}", "quelle": k.get("name") or k["user"], "von": adr.lower(),
                        "von_name": name, "betreff": _dec(msg.get("Subject")), "zeit": zeit.isoformat(), "vorschau": " ".join(vorschau.split())[:400],
                        "anhaenge": anh, "link": "", "gelesen": False, "postfach": (k.get("user") or "").lower(),
                        "an": [a.lower() for _, a in email.utils.getaddresses([_dec(msg.get("To"))]) if a][:40],
                        "cc": [a.lower() for _, a in email.utils.getaddresses([_dec(msg.get("Cc"))]) if a][:40],
                        "suchtext": " ".join(vorschau.split())[:5000]})
        return out
    finally:
        try:
            M.logout()
        except Exception:   # Abmelden beim Aufräumen – Verbindung ist ohnehin zu Ende
            pass


# ---------------------------------------------------------------- Zuordnung zu den eigenen Projekten
def meine_projekte(c, uid):
    """Projekte, an denen der Benutzer beteiligt ist: als Bauleiter eingetragen oder Tagesberichte als Bauleiter geschrieben (letzte 12 Monate)."""
    u = c.execute("SELECT name, vorname, nachname FROM users WHERE id=?", (uid,)).fetchone()
    namen = {x for x in ((u["name"] or "").strip(), f"{u['vorname'] or ''} {u['nachname'] or ''}".strip()) if x} if u else set()
    seit = (datetime.now() - timedelta(days=365)).date().isoformat()
    berichte = {r["project_id"] for r in c.execute("SELECT DISTINCT project_id, site_manager FROM reports WHERE site_manager<>'' AND date>=?", (seit,)).fetchall()
                if r["site_manager"].strip().lower() in {x.lower() for x in namen}}
    out = []
    for r in c.execute("SELECT id, name, street, zip, city, leaders, archived FROM projects WHERE archived=0").fetchall():
        try:
            lead = json.loads(r["leaders"] or "[]")
        except ValueError:
            lead = []
        if uid in lead or r["id"] in berichte:
            out.append(r)
    return out


def _merkmale(c, p):
    name = p["name"] or ""
    m = re.match(r"\s*([A-Za-z]{1,3}\s?\d{2,5}(?:[.\-]\d{1,3})?)\b", name)
    nummer = fold(m.group(1)).replace(" ", "") if m else ""
    rest = name[m.end():] if m else name
    worte = set()
    for w in re.findall(r"[A-Za-zÄÖÜäöüß]{5,}", rest + " " + (p["street"] or "")):
        f = fold(w)
        f = re.sub(r"(strasse|str)$", "", f)
        if len(f) >= 5 and f not in STOPP and fold(p["city"] or "") != f:
            worte.add(f)
    # Firmen des Projekts: Kontakte aus den Tagesberichten, Angebote und Aufträge der AVA
    mails = {}
    rows = c.execute("""SELECT DISTINCT ct.id, ct.name, ct.email FROM contacts ct WHERE ct.email<>'' AND ct.id IN (
                          SELECT i.contact_id FROM items i JOIN reports r ON r.id=i.report_id WHERE r.project_id=? AND i.contact_id IS NOT NULL
                          UNION SELECT a.contact_id FROM ava_angebot a JOIN ava_lv l ON l.id=a.lv_id WHERE l.project_id=? AND a.contact_id IS NOT NULL)""",
                     (p["id"], p["id"])).fetchall()
    firmen = {}
    for r in rows:
        for e in re.split(r"[;,\s]+", (r["email"] or "").lower()):
            if "@" in e:
                mails[e] = r["name"]
        kern = " ".join(fold(re.sub(r"\b(gmbh|co|kg|ag|ug|mbh|gbr|ohg|e\.?k|inh|und)\b\.?|&", " ", r["name"] or "", flags=re.I)).split())
        if len(kern) >= 6:
            firmen[kern] = r["name"]
    domains = {e.split("@", 1)[1]: n for e, n in mails.items() if e.split("@", 1)[1] not in FREEMAIL}
    return {"id": p["id"], "name": name, "nummer": nummer, "worte": worte, "mails": mails, "domains": domains, "firmen": firmen}


def art_von(m):
    t = fold(" ".join([m.get("betreff") or "", " ".join(m.get("anhaenge") or []), (m.get("vorschau") or "")[:200]]))
    for a, rx in ARTEN:
        if re.search(rx, t):
            return a
    return "Nachricht"


def _j_dict(v):
    try:
        d = json.loads(v) if v else {}
        return d if isinstance(d, dict) else {}
    except ValueError:
        return {}


def zuordnen(c, uid, mails, gelernt=None):
    """Mails den eigenen Projekten zuordnen. Gesucht wird in Betreff, ganzem Text und Anhängen nach Projektnummer und Stichworten,
    beim Absender und bei allen Empfängern (An/CC) nach Firmen des Projekts, im Text nach Firmennamen; Absender, deren Mails schon
    einem Projekt zugeordnet waren, zählen mit. Ohne Projekt bleibt eine Mail, wenn sie mich im Text persönlich anspricht."""
    P = [_merkmale(c, p) for p in meine_projekte(c, uid)]
    u = c.execute("SELECT name, vorname, nachname FROM users WHERE id=?", (uid,)).fetchone()
    namen = meine_namen(u) if u else []
    gelernt = gelernt or {}
    out = []
    for m in mails:
        t = fold(" ".join([m.get("betreff") or "", m.get("suchtext") or m.get("vorschau") or "", " ".join(m.get("anhaenge") or [])]))
        beteiligt = [a for a in (m.get("an") or []) + (m.get("cc") or []) if a]
        best = None
        for p in P:
            grund, punkte = "", 0
            nr = re.match(r"([a-z]+)(.*)", p["nummer"]) if p["nummer"] else None
            if nr and re.search(r"(?<![a-z0-9])" + re.escape(nr.group(1)) + r"\s?" + re.escape(nr.group(2)) + r"(?![0-9])", t):
                grund, punkte = f"Projektnummer {p['name'].split()[0]}", 4
            elif m.get("von") in p["mails"]:
                grund, punkte = f"Absender: {p['mails'][m['von']]}", 3
            elif m.get("von", "").split("@")[-1] in p["domains"]:
                grund, punkte = f"Firma: {p['domains'][m['von'].split('@')[-1]]}", 2.5
            elif gelernt.get(m.get("von")) == p["id"]:
                grund, punkte = "Absender schrieb schon zu diesem Projekt", 2.4
            else:
                mit = next((a for a in beteiligt if a in p["mails"]), None) or next((a for a in beteiligt if a.split("@")[-1] in p["domains"]), None)
                worte = [w for w in p["worte"] if re.search(r"\b" + re.escape(w), t)]
                firma = next((n for k, n in p["firmen"].items() if k in t), None)
                if mit:
                    grund, punkte = f"Beteiligt: {p['mails'].get(mit) or p['domains'].get(mit.split('@')[-1])}", 2
                elif len(worte) >= 2:
                    grund, punkte = "Stichworte: " + ", ".join(sorted(worte)[:2]), 1.5
                elif firma:
                    grund, punkte = f"Firma im Text: {firma}", 1.2
                elif worte:
                    grund, punkte = "Stichwort: " + worte[0], 1
            if punkte and (not best or punkte > best[0]):
                best = (punkte, p, grund)
        if best:
            out.append({**m, "pid": best[1]["id"], "projekt": best[1]["name"], "grund": best[2], "art": art_von(m)})
        elif angesprochen(m, namen):
            out.append({**m, "pid": 0, "projekt": "An dich – ohne Projekt", "grund": "persönlich angesprochen", "persoenlich": True, "art": art_von(m)})
    return out, len(P)


def vorschlag(m):
    """Erinnerung zu einer wichtigen Mail vorschlagen: {titel, termin (JJJJ-MM-TT), text} oder None."""
    a = m.get("art")
    try:
        t0 = datetime.fromisoformat((m.get("zeit") or "").replace("Z", "+00:00")).date()
    except ValueError:
        t0 = _now().date()
    wer = m.get("von_name") or m.get("von") or "Absender"
    if a not in WICHTIG:   # sonst: Fragen und Bitten um Rückmeldung → „antworten“ in zwei Tagen
        t = fold((m.get("betreff") or "") + " " + (m.get("vorschau") or ""))
        if not re.search(r"\?|bitte um (ruckmeldung|antwort|info|stellungnahme|bestatigung|freigabe)|um ruckmeldung|konnten sie|konnen sie|wurden sie|ware(n)? sie|bearbeitungsstand|wie ist der stand|teilen sie (uns|mir) mit|bitte (pruf|bestatig|melden|teilen|senden|schick)", t):
            return None
        return {"titel": f"{wer} antworten: {m.get('betreff') or 'Mail'}"[:200], "termin": (t0 + timedelta(days=2)).isoformat(),
                "text": f"{m.get('betreff') or ''}\nvon {wer} ({m.get('von') or ''}), eingegangen {t0.strftime('%d.%m.%Y')}"[:1000]}
    tage, titel = {"Schlussrechnung": (25, f"Schlussrechnung von {wer} prüfen (Prüffrist 30 Tage)"),
                   "Rechnung": (14, f"Rechnung von {wer} prüfen und freigeben"),
                   "Nachtrag": (7, f"Nachtrag von {wer} prüfen"),
                   "Angebot": (7, f"Angebot von {wer} prüfen"),
                   "Behinderung": (2, f"Behinderungsanzeige/Bedenken von {wer} beantworten"),
                   "Mangel": (5, f"Mängelmeldung von {wer} nachgehen"),
                   "Termin": (0, f"Termin: {m.get('betreff') or ''}")}[a]
    termin = t0 + timedelta(days=tage)
    if a == "Termin":   # Datum aus Betreff/Text: einen Tag vorher erinnern
        d = re.search(r"\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})?", (m.get("betreff") or "") + " " + (m.get("vorschau") or ""))
        if not d:
            return None
        try:
            j = int(d.group(3)) if d.group(3) else t0.year
            j = j + 2000 if j < 100 else j
            dt = datetime(j, int(d.group(2)), int(d.group(1))).date()
            if dt < t0:
                return None
            termin = max(t0, dt - timedelta(days=1))
        except ValueError:
            return None
    return {"titel": titel[:200], "termin": termin.isoformat(), "text": f"{m.get('betreff') or ''}\nvon {wer} ({m.get('von') or ''}), eingegangen {t0.strftime('%d.%m.%Y')}"[:1000]}


# ---------------------------------------------------------------- Prüfpflichten: erkannte Mails werden gleich zum To-do mit Frist
PRUEF = ("Schlussrechnung", "Rechnung", "Nachtrag", "Angebot", "Plan")


def _werktage(d, n):
    while n > 0:
        d += timedelta(days=1)
        if d.weekday() < 5:
            n -= 1
    return d


def pruefpflicht(m):
    """To-do zu einer Mail mit Prüfpflicht: {titel, faellig, erinnerung, notiz} – Frist ab Eingang der Mail, Grundlage im Text."""
    a = m.get("art")
    if a not in PRUEF:
        return None
    try:
        t0 = datetime.fromisoformat((m.get("zeit") or "").replace("Z", "+00:00")).astimezone().date()
    except ValueError:
        t0 = _now().date()
    wer = m.get("von_name") or m.get("von") or "Absender"
    F = {"Schlussrechnung": (t0 + timedelta(days=30), "1w", f"Schlussrechnung von {wer} prüfen",
                             "Prüfpflicht: Die Schlussrechnung ist binnen 30 Tagen nach Zugang zu prüfen und zu bezahlen; Einwände gegen die Prüfbarkeit "
                             "nur bis dahin (§ 16 Abs. 3 Nr. 1 VOB/B, § 650g Abs. 4 BGB)."),
         "Rechnung": (t0 + timedelta(days=21), "1w", f"Rechnung von {wer} prüfen und freigeben",
                      "Prüfpflicht: Abschlagszahlungen sind binnen 21 Tagen nach Zugang der Aufstellung fällig (§ 16 Abs. 1 Nr. 3 VOB/B)."),
         "Nachtrag": (t0 + timedelta(days=14), "2t", f"Nachtrag von {wer} prüfen",
                      "Prüfpflicht: Nachtragsangebot dem Grunde und der Höhe nach prüfen (§ 2 Abs. 5/6 VOB/B); "
                      "Einigung binnen 30 Tagen anstreben, danach kann angeordnet werden (§ 650b BGB)."),
         "Angebot": (t0 + timedelta(days=7), "2t", f"Angebot von {wer} prüfen und werten",
                     "Prüfpflicht: Angebot prüfen und werten – Bindefrist des Angebots beachten."),
         "Plan": (_werktage(t0, 10), "2t", f"Pläne von {wer} prüfen und freigeben",
                  "Prüfpflicht: Pläne prüfen, freigeben oder Bedenken mitteilen – übliche Frist 10 Werktage, sofern der Vertrag nichts anderes regelt.")}[a]
    faellig, er, titel, grund = F
    notiz = "\n".join(x for x in (grund, f"Frist bis {faellig.strftime('%d.%m.%Y')} (Eingang {t0.strftime('%d.%m.%Y')})",
                                   f"Mail: {m.get('betreff') or ''}", f"von {wer} ({m.get('von') or ''})", m.get("link") or "") if x)
    return {"titel": f"{titel}: {m.get('betreff') or ''}"[:280], "faellig": faellig.isoformat(), "erinnerung": er, "notiz": notiz[:4000]}


def _todo_key(mid):
    return "post:todo:" + __import__("hashlib").sha256(str(mid).encode()).hexdigest()[:32]


def todos_anlegen(c, u, mails, erl):
    """Für neue Mails mit Prüfpflicht je ein To-do anlegen (einmal je Mail, auch wenn sie in mehreren Postfächern steht)
    und bei allen Mails das zugehörige To-do anhängen: m["todo"] = {id, faellig, status}."""
    from . import erinnern, skizze
    jetzt = datetime.now().isoformat(timespec="seconds")
    for m in mails:
        k = _todo_key(m.get("id"))
        tid = konto._get(c, k)
        if tid is None and m.get("art") in PRUEF and m.get("id") not in erl:
            t = pruefpflicht(m)
            if not t:
                continue
            pid = m.get("pid") or None
            leute = [x for x in erinnern.empfaenger(c, u["id"], pid) if x != u["id"]]
            r = c.execute("""INSERT INTO todo(titel, notiz, project_id, faellig, prio, personen, mail, erinnerung, status, erstellt, erstellt_von, erstellt_name, geaendert)
                             VALUES(?,?,?,?,1,?,0,?,'offen',?,?,?,?) RETURNING id""",
                          (t["titel"], t["notiz"], pid, t["faellig"], json.dumps(leute), t["erinnerung"], jetzt, u["id"], skizze.name_von(u), jetzt)).fetchone()
            tid = str(r["id"])
            konto._put(c, k, tid, "posteingang")
        if tid and str(tid).isdigit():
            r = c.execute("SELECT id, faellig, status, erstellt_von, personen FROM todo WHERE id=?", (int(tid),)).fetchone()
            if r:
                todo_mit(c, u["id"], r)
                m["todo"] = {"id": r["id"], "faellig": r["faellig"], "status": r["status"]}
                m.pop("vorschlag", None)
            else:
                m.pop("todo", None)


def todo_mit(c, uid, r):
    """Wer die Mail in seiner Post sieht, ist am To-do beteiligt – sonst wurde es vom Benutzer angelegt, dessen Abruf zuerst lief,
    und alle anderen konnten es weder öffnen noch löschen."""
    try:
        leute = [int(x) for x in json.loads(r["personen"] or "[]")]
    except (ValueError, TypeError):
        leute = []
    if r["erstellt_von"] == uid or uid in leute:
        return False
    c.execute("UPDATE todo SET personen=?, geaendert=? WHERE id=?", (json.dumps(leute + [uid]), datetime.now().isoformat(timespec="seconds"), r["id"]))
    return True


def lesen(c, uid):
    v = konto._get(c, f"post:{uid}")
    try:
        return json.loads(v) if v else {}
    except ValueError:
        return {}


def abrufen(c, u):
    """Alle Postfächer des Benutzers lesen, den eigenen Projekten zuordnen und speichern. Gibt die Übersicht zurück."""
    uid = u["id"]
    with _lock:
        if uid in _busy:
            return dict(lesen(c, uid), laeuft=True)
        _busy.add(uid)
    try:
        alt = lesen(c, uid)
        jetzt = _now()
        try:
            letzte = datetime.fromisoformat(alt.get("stand")) if alt.get("stand") else None
        except ValueError:
            letzte = None
        seit = min(letzte - timedelta(hours=2) if letzte else jetzt - timedelta(days=1), jetzt - timedelta(days=1))
        seit = min(seit, grenze(postfaecher(c, uid)["anzeige"]).astimezone(timezone.utc))
        seit = max(seit, jetzt - timedelta(days=16))
        pf, fehler, mails = postfaecher(c, uid), [], []
        if m365_ok(c):
            for adr in m365_postfaecher_von(c, u):   # eigenes Postfach und vom Administrator zugewiesene (z. B. rechnungen@, mail@)
                try:
                    mails += m365_lesen(m365_conf(c), adr, seit)
                except Exception as e:
                    fehler.append(f"{adr}: {e}")
        for k in pf["konten"]:
            if not k.get("an", True):
                continue
            try:
                mails += imap_lesen(k, seit)
            except Exception as e:
                fehler.append(f"{k.get('name') or k['user']}: {e}")
        gesehen, uniq = set(), []
        for m in sorted(mails, key=lambda m: m.get("zeit") or "", reverse=True):
            key = (m.get("von"), (m.get("betreff") or "").strip().lower(), (m.get("zeit") or "")[:16])
            if key not in gesehen:
                gesehen.add(key)
                uniq.append(m)
        uniq = eigene_filtern(c, u, uniq)
        gelernt = {}
        for m in sorted(alt.get("mails") or [], key=lambda m: m.get("zeit") or ""):   # nur sichere Zuordnungen lernen (Projektnummer)
            if m.get("pid") and m.get("von") and str(m.get("grund") or "").startswith("Projektnummer"):
                gelernt[m["von"]] = m["pid"]
        for k, v in (_j_dict(konto._get(c, f"post:gelernt:{uid}"))).items():
            gelernt.setdefault(k, v)
        zu, n_proj = zuordnen(c, uid, uniq, gelernt)
        for m in zu:
            m.pop("suchtext", None)
            if m.get("pid") and m.get("von") and str(m.get("grund") or "").startswith("Projektnummer"):
                gelernt[m["von"]] = m["pid"]
        konto._put(c, f"post:gelernt:{uid}", json.dumps(dict(list(gelernt.items())[-800:])), "posteingang")
        erl = alt.get("erledigt") or {}
        for m in zu:
            s = None if m.get("art") in PRUEF else vorschlag(m)   # Prüfpflicht → To-do statt Vorschlag
            if s and m["id"] not in erl:
                m["vorschlag"] = s
        todos_anlegen(c, u, zu, erl)
        neu_ids = {m["id"] for m in zu}
        zu = sichtbar(c, uid, zu + [m for m in alt.get("mails") or [] if m.get("id") not in neu_ids])   # ältere mit offener Erinnerung bleiben
        zu.sort(key=lambda m: m.get("zeit") or "", reverse=True)
        d = {"stand": jetzt.isoformat(timespec="seconds"), "seit": seit.isoformat(timespec="seconds"), "mails": zu[:300], "gelesen": len(uniq),
             "projekte": n_proj, "fehler": fehler, "erledigt": {k: v for k, v in erl.items() if v and k in {m["id"] for m in zu}}}
        konto._put(c, f"post:{uid}", json.dumps(d, ensure_ascii=False), "posteingang")
        return d
    finally:
        with _lock:
            _busy.discard(uid)


def grenze(anzeige, jetzt=None):
    """Ältere Mails fallen aus der Übersicht: so viele Tage zurück, Wochenendtage auf Wunsch nicht mitgezählt
    (1 Tag + Wochenende: am Montag stehen noch die Mails seit Freitag)."""
    g = jetzt or datetime.now().astimezone()
    rest = anzeige["tage"]
    while rest > 0:
        g -= timedelta(days=1)
        if anzeige["wochenende"] and g.weekday() >= 5:
            continue
        rest -= 1
    return g


def mit_erinnerung(c, uid):
    """{Mail-ID: Termin} der offenen Erinnerungen, die aus der Mail-Übersicht angelegt wurden."""
    out = {}
    for r in c.execute("SELECT termin, daten, empfaenger FROM erinnerungen WHERE status='offen' AND daten LIKE '%aus_mail%'").fetchall():
        try:
            d, an = json.loads(r["daten"] or "{}"), json.loads(r["empfaenger"] or "[]")
        except ValueError:
            continue
        if d.get("aus_mail") and (uid in an or str(uid) in map(str, an)):
            out[d["aus_mail"]] = r["termin"]
    return out


def sichtbar(c, uid, mails):
    """Eine Mail steht die eingestellten Tage in der Übersicht – mit offener Erinnerung so lange, bis die Erinnerung erledigt ist."""
    gr = grenze(postfaecher(c, uid)["anzeige"])
    er = mit_erinnerung(c, uid)
    out = []
    for m in mails:
        try:
            t = datetime.fromisoformat((m.get("zeit") or "").replace("Z", "+00:00"))
            t = t if t.tzinfo else t.replace(tzinfo=timezone.utc)
        except ValueError:
            t = None
        if m.get("id") in er:
            out.append({**m, "erinnerung": er[m["id"]]})
        elif t is None or t >= gr:
            out.append({k: v for k, v in m.items() if k != "erinnerung"})
    return out


def eingerichtet(c, u):
    pf = postfaecher(c, u["id"])
    return bool((m365_ok(c) and m365_postfaecher_von(c, u)) or any(k.get("an", True) for k in pf["konten"]))


def m365_test(c, adresse):
    m = m365_conf(c)
    if not (m["tenant"] and m["client"] and m["secret"]):
        raise RuntimeError("Mandant, Client-ID und Geheimnis eintragen und speichern.")
    n = len(m365_lesen(m, adresse, _now() - timedelta(days=1)))
    return f"Postfach {adresse} gelesen – {n} Mails seit gestern."


# ---------------------------------------------------------------- Zuweisung der Microsoft-365-Postfächer (Administrator)
def zuweisung(c):
    """{postfaecher: [{adresse, name}], zuordnung: {uid: [adresse …]}} – freigegebene/gemeinsame Postfächer (mail@, rechnungen@ …)
    und welche Benutzer sie in ihrer Übersicht sehen."""
    v = konto._get(c, "post:zuweisung")
    try:
        d = json.loads(v) if v else {}
    except ValueError:
        d = {}
    return {"postfaecher": [x for x in d.get("postfaecher") or [] if isinstance(x, dict) and "@" in str(x.get("adresse") or "")],
            "zuordnung": {str(k): [a for a in v_ if isinstance(a, str)] for k, v_ in (d.get("zuordnung") or {}).items() if isinstance(v_, list)}}


def zuweisung_setzen(c, b, by):
    pf, seen = [], set()
    for x in (b.get("postfaecher") or [])[:200]:
        a = str((x or {}).get("adresse") or "").strip().lower()[:200]
        if "@" in a and a not in seen:
            seen.add(a)
            pf.append({"adresse": a, "name": str(x.get("name") or "")[:100]})
    zu = {}
    for k, v in (b.get("zuordnung") or {}).items():
        if str(k).isdigit() and isinstance(v, list):
            zu[str(k)] = sorted({str(a).strip().lower() for a in v if str(a).strip().lower() in seen})
    konto._put(c, "post:zuweisung", json.dumps({"postfaecher": pf, "zuordnung": zu}, ensure_ascii=False), by)
    return zuweisung(c)


def m365_postfaecher_von(c, u):
    """Welche Microsoft-365-Postfächer gehören in die Übersicht dieses Benutzers? Das eigene (wenn eingeschaltet) und die zugewiesenen."""
    out = []
    eigen = (u["email"] or "").strip().lower()
    if eigen and postfaecher(c, u["id"])["m365"]:
        out.append(eigen)
    for a in zuweisung(c)["zuordnung"].get(str(u["id"]), []):
        if a not in out:
            out.append(a)
    return out


def m365_alle(c):
    """Alle Postfächer im Microsoft-365-Mandanten (Benutzer und freigegebene Postfächer) – braucht zusätzlich „User.Read.All“."""
    m = m365_conf(c)
    tok = _token(m)
    out, url = [], "https://graph.microsoft.com/v1.0/users?$select=mail,displayName,userPrincipalName&$top=200"
    try:
        while url and len(out) < 1000:
            d = _json(url, headers={"Authorization": "Bearer " + tok})
            out += [{"adresse": (x.get("mail") or "").lower(), "name": x.get("displayName") or ""} for x in d.get("value") or [] if x.get("mail")]
            url = d.get("@odata.nextLink")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Liste der Postfächer nicht lesbar ({e.code}) – dafür braucht die App zusätzlich „User.Read.All“ (Anwendung). "
                           "Postfächer lassen sich auch von Hand eintragen.")
    return sorted(out, key=lambda x: x["adresse"])
