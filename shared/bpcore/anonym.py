"""Anonymisierung der Anfragen an externe KI (Claude, Gemini, ChatGPT) – beschlossen am 14.11.2026.

Vor dem Senden werden Projekte, Adressen, Firmen, Personen, Mitarbeiter:innen, E-Mail-Adressen und Telefonnummern durch
Art#Nummer ersetzt (z. B. firma#302918475610, 12 Ziffern, je Anfrage neu ausgewürfelt). Die Antwort wird zurückübersetzt.
Die Zuordnungstabelle bleibt im Büro (im Speicher; im Protokoll nur, wenn das Protokoll eingeschaltet ist).

Erkannt wird
  1. aus der Datenbank: Projekte (Name, Nummer, Bauherr:in, Anschrift), Kontakte (Name, Ansprechpartner:in, weitere
     Personen, Telefon, E-Mail, Anschrift), Benutzer:innen (Name, Vor- und Nachname, E-Mail);
  2. über Muster: E-Mail-Adressen, Telefonnummern, IBAN, „Herr/Frau Name“, Straße mit Hausnummer, PLZ mit Ort.
Ollama (im Büro) wird nicht anonymisiert, aber mitprotokolliert (Entscheidung 1).
Grenze: Namen, die weder in der Datenbank stehen noch einem Muster folgen, können durchrutschen – darum das Protokoll.
"""
import json
import re
import secrets
import time

EXTERN = ("claude", "gemini", "chatgpt")
ARTEN = ("projekt", "adresse", "bauherr", "firma", "person", "mitarbeiter", "email", "telefon", "iban")
ZUSATZ = ("Namen, Adressen, E-Mail und Telefon sind durch Art#Nummer ersetzt (z. B. firma#302918475610, person#…, projekt#…, "
          "mitarbeiter#…, adresse#…, telefon#…). Übernimm diese Kennungen unverändert, wo du sie brauchst; erfinde keine neuen.")
# Wörter, die in Firmennamen stehen, aber allein nichts verraten (sonst würde „Maler“ oder „Bau“ ausgetauscht)
_ALLGEMEIN = set("""gmbh mbh co kg ag ug ohg gbr e.k ek und & bau bauten bauunternehmung bautechnik maler malerei elektro elektrotechnik
dach dachdeckerei sanitär heizung haustechnik technik holz holzbau tischlerei schreinerei metall metallbau stahl stahlbau glas glaserei
fliesen boden bodenbeläge garten landschaftsbau gerüst gerüstbau abbruch erdbau tiefbau hochbau trockenbau putz stuck beton estrich
fenster türen tore schlosserei zimmerei zimmerer klempner installation service gebäude gebäudetechnik energie solar planung büro
ingenieur ingenieure ingenieurbüro architekt architekten architektur partner gruppe söhne sohn firma handwerk montage projekt stadt
gemeinde kreis land herr frau dr ing dipl""".split())
_CACHE = {"t": 0, "liste": [], "rx": None, "idx": {}}


def _w(s):
    return " ".join(str(s or "").split())


def _liste(c):
    """(Text, Art) aus der Datenbank – längste zuerst; neu gelesen, sobald sich Projekte, Kontakte oder Benutzer:innen geändert haben."""
    stand = tuple(tuple(r) for r in c.execute("SELECT (SELECT count(*) FROM projects), (SELECT max(updated) FROM projects), (SELECT count(*) FROM contacts), "
                                              "(SELECT max(updated) FROM contacts), (SELECT count(*) FROM users), (SELECT max(updated) FROM users)").fetchall())
    if _CACHE.get("stand") == stand and _CACHE["liste"]:
        return _CACHE["liste"]
    _CACHE["stand"] = stand
    L = {}

    def dazu(t, art, min_len=3):
        t = _w(t)
        if len(t) >= min_len and not t.isdigit() and t.lower() not in _ALLGEMEIN:
            L.setdefault(t.lower(), (t, art))

    def name_teile(t, art):   # „Maler Müller GmbH“ → auch „Müller“; „Anna Bauer“ → auch „Bauer“
        for w in re.findall(r"[A-ZÄÖÜ][\wäöüß\-]{3,}", t or ""):
            if w.lower() not in _ALLGEMEIN:
                dazu(w, art, 4)

    for r in c.execute("SELECT name, client, street, zip, city FROM projects").fetchall():
        dazu(r["name"], "projekt")
        m = re.match(r"^([A-Z]\d{2,4}(?:\.\d+)?)\s+(.+)$", _w(r["name"]))
        if m:
            dazu(m.group(2), "projekt", 6)
        dazu(r["client"], "bauherr")
        dazu(r["street"], "adresse", 5)
    for r in c.execute("SELECT name, trade, art, contact_person, phone, mobile, email, street, extra FROM contacts").fetchall():
        bh = "bauherr" in f"{r['trade'] or ''} {r['art'] or ''}".lower()
        art = "bauherr" if bh else "firma"
        dazu(r["name"], art)
        name_teile(r["name"], art)
        dazu(r["contact_person"], "person")
        name_teile(r["contact_person"], "person")
        for t in (r["phone"], r["mobile"]):
            dazu(t, "telefon", 6)
        for m in re.split(r"[,;]\s*", r["email"] or ""):
            dazu(m, "email", 6)
        dazu(r["street"], "adresse", 5)
        try:
            ex = json.loads(r["extra"] or "{}") or {}
        except ValueError:
            ex = {}
        for x in ex.get("weitere") or []:
            if isinstance(x, dict):
                dazu(x.get("wert"), {"tel": "telefon", "mail": "email", "adr": "adresse"}.get(x.get("typ"), "person"))
                name_teile(x.get("wert") if x.get("typ") == "person" else "", "person")
                dazu(x.get("tel"), "telefon", 6)
                dazu(x.get("mail"), "email", 6)
                dazu(x.get("street"), "adresse", 5)
    for r in c.execute("SELECT name, vorname, nachname, email FROM users").fetchall():
        dazu(r["name"], "mitarbeiter")
        dazu(f"{r['vorname'] or ''} {r['nachname'] or ''}", "mitarbeiter")
        dazu(r["nachname"], "mitarbeiter", 4)
        dazu(r["email"], "email", 6)
    liste = sorted(L.values(), key=lambda x: -len(x[0]))
    # mehrere Wörter: Groß-/Kleinschreibung egal; ein Wort (Namen): wie geschrieben – sonst würde „max.“ zu einer Kennung
    teile = [("(?i:" + re.escape(t) + ")") if " " in t else re.escape(t) for t, _ in liste]
    rx = re.compile(r"(?<![\w#@.])(?:" + "|".join(teile) + r")(?![\w@])") if teile else None
    _CACHE.update(t=time.time(), liste=liste, rx=rx, idx={t.lower(): a for t, a in liste})
    return _CACHE["liste"]


_MUSTER = [   # nach den bekannten Namen angewandt
    ("email", re.compile(r"[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+")),
    ("iban", re.compile(r"\b[A-Z]{2}\d{2}(?: ?\d{4}){4,7}(?: ?\d{1,4})?\b")),
    ("telefon", re.compile(r"(?<![\w#])(?:\+\d{2}|0)\d{2,5}[ /\-]?\d[\d \-]{3,12}\d(?![\w])")),
    ("person", re.compile(r"\b(?:Herrn?|Frau)\s+(?:Dr\.\s+)?[A-ZÄÖÜ][\wäöüß\-]+")),
    ("adresse", re.compile(r"\b[A-ZÄÖÜ][\wäöüß\-]*(?:straße|str\.|weg|allee|platz|gasse|ring|damm|ufer)\s+\d+\s?[a-z]?\b", re.I)),
]
_KENNUNG = re.compile(r"\b(?:" + "|".join(ARTEN) + r")#(\d{12})\b")


class Tausch:
    """Eine Anfrage: hin() ersetzt, zurueck() übersetzt die Antwort, ersetzt = [(kennung, klartext, art)]."""

    def __init__(self, c):
        self.c, self.k2t, self.t2k, self.ersetzt = c, {}, {}, []

    def _kennung(self, text, art):
        key = text.lower()
        if key not in self.t2k:
            k = f"{art}#{secrets.randbelow(10 ** 12):012d}"
            while k in self.k2t:
                k = f"{art}#{secrets.randbelow(10 ** 12):012d}"
            self.t2k[key], self.k2t[k] = k, text
            self.ersetzt.append((k, text, art))
        return self.t2k[key]

    def hin(self, text):
        if not text:
            return text
        _liste(self.c)
        rx, idx = _CACHE["rx"], _CACHE["idx"]
        if rx:
            text = rx.sub(lambda m: self._kennung(m.group(0), idx.get(m.group(0).lower(), "person")), text)
        for art, rx in _MUSTER:
            text = rx.sub(lambda m: m.group(0) if "#" in m.group(0) else self._kennung(m.group(0), art), text)
        return text

    def zurueck(self, text):
        """Kennungen in der Antwort → Klartext (auch, wenn die KI die Art davor verändert hat: die Nummer zählt)."""
        if not text or not self.k2t:
            return text
        nr = {k.split("#", 1)[1]: t for k, t in self.k2t.items()}
        text = _KENNUNG.sub(lambda m: nr.get(m.group(1), m.group(0)), text)
        return re.sub(r"\b[a-z]+#(\d{12})\b", lambda m: nr.get(m.group(1), m.group(0)), text)


# ---------- Protokoll (Verwaltung → KI → Datenschutz) ----------
def _einst(c):
    from . import einstellungen
    E = einstellungen.alle(c)
    try:
        tage = max(1, min(3650, int(E.get("ki_protokoll_tage") or 90)))
    except ValueError:
        tage = 90
    return E.get("ki_protokoll", "1") != "0", tage


def protokoll_an(c):
    return _einst(c)[0]


def protokollieren(c, anbieter, zweck, gesendet, antwort, ersetzt, dauer_ms, bild=False):
    """Eine Zeile ins Protokoll – gesendet ist die anonymisierte Fassung; ersetzt die Zuordnung (bleibt im Büro)."""
    an, tage = _einst(c)
    if not an:
        return
    try:
        from flask import g, has_request_context
        wer = (g.user["name"] if has_request_context() and getattr(g, "user", None) else "") or ""
    except Exception:
        wer = ""
    import os
    c.execute("INSERT INTO ki_protokoll(zeit, wer, app, anbieter, zweck, gesendet, antwort, ersetzt, bild, dauer_ms) VALUES(?,?,?,?,?,?,?,?,?,?)",
              (time.strftime("%Y-%m-%d %H:%M:%S"), wer, os.environ.get("APP", ""), anbieter, zweck or "", (gesendet or "")[:200000],
               (antwort or "")[:100000], json.dumps(ersetzt, ensure_ascii=False), 1 if bild else 0, int(dauer_ms)))
    c.execute("DELETE FROM ki_protokoll WHERE zeit < ?", (time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(time.time() - tage * 86400)),))
