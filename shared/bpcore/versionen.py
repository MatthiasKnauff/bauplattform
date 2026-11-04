"""Versionierung aller Einstellungen und Stammdaten der Bauplattform (Ersatz für manuelles Zwischenspeichern).

Jede Speicherung legt automatisch einen Stand in der Tabelle `versionen` ab – mit den Änderungen in Worten
(„Büroname: „A“ → „B““). Mehrere Speicherungen desselben Benutzers innerhalb von 10 Minuten werden zu einem Stand
zusammengefasst. Jeder Stand kann wiederhergestellt werden (das legt wiederum einen Stand an – nichts geht verloren).
Kennwörter und Schlüssel werden nie gespeichert, nur ob sie sich geändert haben; beim Wiederherstellen bleiben sie, wie sie sind.

Bereiche (Schlüssel `bereich`):
  einst:bt          Allgemeine Einstellungen (Firma, Ablage, E-Mail) – Tabelle settings ohne Vorlagen
  einst:vorlagen    E-Mail-Vorlagen (settings tpl_*)
  gs:<key>          Bauzeitenplan-/KI-Einstellungen (Tabelle gantt_store)
  bp:aufgaben       Einstellungen „Mängel & Erinnerungen“ (bp_store)
  bk:raumtypen      Raumtypen und Kennwerte (bk_store)
  bkp:<id>          eine Kostenermittlung (bk_projects.data)
  avalv:<id>        ein Leistungsverzeichnis (ava_lv: Positionen, Vergabe)
  kontakt:<id>      eine Adresse (contacts)
  konto:<uid>       persönliche Einstellungen eines Benutzers (Versand, Kalender, Darstellung, KI, Assistent, Unterschrift)
  versionen:conf    Aufbewahrung der Stände (bp_store)

Benutzung:  with versionen.aenderung(c, "einst:bt", user_name): … speichern …
"""
import hashlib, json
from contextlib import contextmanager
from datetime import datetime, timedelta

ZUSAMMEN_MIN = 10
SECRET = {"store_pass", "mail_pass", "pass", "key", "api_key", "token", "passwort", "password", "secret"}
MARK = "•geheim:"
BILD = "\u2022bild:"
STANDARD_CONF = {"alle_tage": 90, "taeglich_tage": 730}     # alle Stände 90 Tage, danach einer je Tag; 0 = unbegrenzt
VORSCHLAEGE = [("Sparsam", 30, 180), ("Empfohlen", 90, 730), ("Großzügig", 365, 0)]

GS = {"library": "Bibliothek der Leistungen (Bauzeitenplan)", "phases": "Phasen (Bauzeitenplan)", "catfirms": "Firmen je Gewerk (Bauzeitenplan)",
      "catscope": "Leistungsumfang je Gewerk (Bauzeitenplan)", "settings": "KI und Bauzeitenplan (Verwaltung)", "plattform": "KI-Anbieter (Verwaltung)",
      "presets": "Vorlagen des Bauzeitenplans", "assistcfg": "Assistent des Bauzeitenplans", "assistcfg_vorlagen": "Vorlagen des Assistenten"}
BP = {"aufgaben": "Einstellungen „Mängel & Erinnerungen“", "plaene": "Einstellungen „Planstand & Versand“", "ava": "Einstellungen „Ausschreibung & Abrechnung“", "versionen_conf": "Aufbewahrung der Versionen"}
BK = {"raumtypen": "Raumtypen und Kennwerte (Baukosten)", "vergleich": "Vergleichsobjekte und importierte Kennwerte (Baukosten)", "dienste": "Zugänge zu Kostendatenbanken (Baukosten)"}

LABELS = {
    # AVA (Leistungsverzeichnis)
    "lv": "LV", "items": "Positionen", "kurz": "Kurztext", "lang": "Langtext", "menge": "Menge", "einheit": "Einheit", "art": "Art", "kg": "KG", "kg81": "KG (1981)",
    "lb": "Leistungsbereich", "ep_s": "EP Schätzung", "gb": "mit Gesamtpreis", "entf": "entfällt", "sp": "Schwerpunkt", "bezug": "Bezug", "mf": "Rechenweg",
    "np_vor": "neue Seite vorher", "np_nach": "neue Seite nachher", "nt_status": "Nachtrag-Status", "nt_grund": "Begründung", "vorbem": "Vorbemerkungen",
    "druck": "Drucklayout", "lvl": "Ebene", "oz": "OZ", "signme": "sign-me", "co_font": "Schrift der Briefe",
    "office_name": "Büroname", "co_short": "Kurzname", "co_street": "Straße", "co_zip": "PLZ", "co_city": "Ort", "co_phone": "Telefon", "co_email": "E-Mail",
    "co_web": "Internet", "app_url": "Adresse der Bauplattform", "mail_provider": "Mailanbieter", "mail_host": "SMTP-Server", "mail_port": "SMTP-Port", "mail_user": "Mail-Benutzer",
    "mail_pass": "Mail-Kennwort", "mail_host": "Mailserver", "mail_port": "Mail-Port", "mail_from": "Absender",
    "store_mode": "Ablage", "store_server": "Server", "store_share": "Freigabe", "store_path": "Pfad", "store_user": "Ablage-Benutzer",
    "store_pass": "Ablage-Kennwort", "store_domain": "Domäne", "store_dir": "Ordner", "store_folder_desc": "Ordnerbeschreibung",
    "store_tpl_pdf": "Ablage der Berichte", "store_tpl_photos": "Ablage der Fotos",
    "vorlauf": "Vorlauf (Tage)", "luecke": "Lücke (Tage)", "mail_plan": "Mail aus dem Plan", "uhrzeit": "Uhrzeit",
    "versand": "Versand von Rügen", "kopie": "Kopie an mich", "kalender": "Kalendertermine automatisch", "darstellung": "Darstellung",
    "theme": "Farbschema", "accent": "Akzentfarbe", "ki": "KI", "assistent": "Assistent im Bautagebuch", "signatur": "Unterschrift",
    "schritte": "Schritte", "an": "eingeschaltet", "ai": "KI", "mode": "Vorschlag", "model": "Modell",
    "kw": "Kennwert", "label": "Bezeichnung", "worte": "Suchwörter", "name": "Name", "trade": "Gewerk", "contact_person": "Ansprechpartner",
    "phone": "Telefon", "mobile": "Mobil", "email": "E-Mail", "street": "Straße", "zip": "PLZ", "city": "Ort", "notes": "Notizen",
    "website": "Internet", "role": "Rolle", "extra": "Weiteres", "alle_tage": "alle Stände (Tage)", "taeglich_tage": "ein Stand je Tag bis (Tage)",
    "mailsignatur": "E-Mail-Signatur", "funktion": "Funktion", "phasen": "Phasen", "planarten": "Planarten", "kennungen": "Kennungen", "stichworte": "Stichwörter", "max_mb": "Anhänge höchstens (MB)",
    "betreff": "Betreff", "text": "Text", "auto": "automatisch starten", "on": "anbieten", "steps": "Schritte", "dur": "Dauer", "gw": "Gewerk", "phase": "Phase", "titel": "Titel", "stufe": "Stufe",
}
for _k, _n in (("maengelruege", "Mängelrüge"), ("terminruege", "Terminrüge"), ("termin", "Kalendertermin"), ("planversand", "Planversand")):
    LABELS[f"tpl_{_k}_betreff"] = f"{_n}: Betreff"
    LABELS[f"tpl_{_k}_text"] = f"{_n}: Text"


def _now():
    return datetime.now().isoformat(timespec="seconds")


def _j(s, d=None):
    try:
        return json.loads(s) if isinstance(s, str) else (s if s is not None else d)
    except ValueError:
        return d


# ---------------------------------------------------------------- Kennwörter
def _mask(v):
    if isinstance(v, dict):
        return {k: (MARK + hashlib.sha256(x.encode()).hexdigest()[:10] if k in SECRET and isinstance(x, str) and x else _mask(x)) for k, x in v.items()}
    if isinstance(v, list):
        return [_mask(x) for x in v]
    return v


def _unmask(v, cur):
    """Platzhalter für Kennwörter durch den aktuellen Wert ersetzen (alte Kennwörter kennt die Versionierung nicht)."""
    if isinstance(v, dict):
        cd = cur if isinstance(cur, dict) else {}
        out = {}
        for k, x in v.items():
            if isinstance(x, str) and x.startswith(MARK):
                if cd.get(k):
                    out[k] = cd[k]
            else:
                out[k] = _unmask(x, cd.get(k))
        for k in SECRET:   # Kennwörter, die es im alten Stand noch nicht gab, bleiben erhalten
            if k in cd and k not in out and isinstance(cd[k], str):
                out[k] = cd[k]
        return out
    if isinstance(v, list):
        return [_unmask(x, None) for x in v]
    return v


# ---------------------------------------------------------------- Quellen
class Quelle:
    def __init__(self, titel, recht, load, save):
        self.titel, self.recht, self.load, self.save = titel, recht, load, save


def _row_store(table, key):
    def load(c):
        r = c.execute(f"SELECT data FROM {table} WHERE key=?", (key,)).fetchone()
        return _j(r["data"], r["data"]) if r else None

    def save(c, v, by):
        if v is None:
            c.execute(f"DELETE FROM {table} WHERE key=?", (key,))
            return
        c.execute(f"INSERT INTO {table}(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
                  "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (key, v if isinstance(v, str) else json.dumps(v, ensure_ascii=False), _now(), by))
    return load, save


def _settings(vorlagen):
    def wahl(k):
        return k.startswith("tpl_") == vorlagen

    def load(c):
        return {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings ORDER BY key") if wahl(r["key"])}

    def save(c, v, by):
        v = v or {}
        for r in c.execute("SELECT key FROM settings").fetchall():
            if wahl(r["key"]) and r["key"] not in v and r["key"] not in SECRET:
                c.execute("DELETE FROM settings WHERE key=?", (r["key"],))
        for k, x in v.items():
            if wahl(k):
                c.execute("INSERT INTO settings(key, value) VALUES(?,?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (k, str(x)))
    return load, save


CONTACT_COLS = ("name", "trade", "contact_person", "phone", "mobile", "email", "street", "zip", "city", "notes", "website", "role", "extra")


def _kontakt(i):
    def load(c):
        r = c.execute("SELECT * FROM contacts WHERE id=?", (i,)).fetchone()
        if not r:
            return None
        d = {k: r[k] for k in CONTACT_COLS if k in r.keys()}
        d["extra"] = _j(d.get("extra"), {}) or {}
        return d

    def save(c, v, by):
        if v is None:
            c.execute("DELETE FROM contacts WHERE id=?", (i,))
            return
        v = dict(v)
        v["extra"] = json.dumps(v.get("extra") or {}, ensure_ascii=False)
        cols = [k for k in CONTACT_COLS if k in v]
        if c.execute("SELECT 1 FROM contacts WHERE id=?", (i,)).fetchone():
            c.execute(f"UPDATE contacts SET {', '.join(k + '=?' for k in cols)}, updated=? WHERE id=?", (*[v[k] for k in cols], _now(), i))
        else:
            c.execute(f"INSERT INTO contacts(id, {', '.join(cols)}, created, updated) VALUES(?, {', '.join('?' * len(cols))}, ?, ?)",
                      (i, *[v[k] for k in cols], _now(), _now()))
    return load, save


def _bkp(i):
    def load(c):
        r = c.execute("SELECT data FROM bk_projects WHERE id=?", (i,)).fetchone()
        return _j(r["data"], {}) if r else None

    def save(c, v, by):
        if v is not None:
            c.execute("UPDATE bk_projects SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(v, ensure_ascii=False), _now(), by, i))
    return load, save


def _avalv(i):
    def load(c):
        r = c.execute("SELECT name, nr, gewerk, data, vergabe FROM ava_lv WHERE id=?", (i,)).fetchone()
        return {"name": r["name"], "nr": r["nr"], "gewerk": r["gewerk"], "lv": _j(r["data"], {}), "vergabe": _j(r["vergabe"], {})} if r else None

    def save(c, v, by):
        if v is not None:
            c.execute("UPDATE ava_lv SET name=?, nr=?, gewerk=?, data=?, vergabe=?, rev=rev+1, updated=?, updated_by=? WHERE id=?",
                      (v.get("name") or "", v.get("nr") or "", v.get("gewerk") or "", json.dumps(v.get("lv") or {}, ensure_ascii=False),
                       json.dumps(v.get("vergabe") or {}, ensure_ascii=False), _now(), by, i))
    return load, save


def _konto(uid):
    from . import konto

    def load(c):
        u = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
        if not u:
            return None
        ex = _j(u["extra"], {}) or {}
        sig = c.execute("SELECT data FROM bp_store WHERE key=?", (f"signatur:{uid}",)).fetchone()
        if sig:   # Bild nur einmal ablegen, im Stand steht die Prüfsumme
            h = hashlib.sha256(sig["data"].encode()).hexdigest()[:16]
            if not c.execute("SELECT 1 FROM bp_store WHERE key=?", (f"sigarchiv:{h}",)).fetchone():
                konto._put(c, f"sigarchiv:{h}", sig["data"], "Versionen")
        return {**konto.prefs(c, uid), "darstellung": {"theme": u["theme"] or "dunkel", "accent": u["accent"] or ""},
                "ki": u["ai"] or "intern", "assistent": ex.get("bt_assistent"), "signatur": (BILD + h) if sig else None}

    def save(c, v, by):
        if not v:
            return
        konto.set_prefs(c, uid, v, by)
        d = v.get("darstellung") or {}
        th = d.get("theme") or ""
        c.execute("UPDATE users SET theme=?, accent=?, ai=? WHERE id=?", ("" if th == "dunkel" else th, d.get("accent") or "",
                                                                         "" if v.get("ki") in (None, "intern") else v["ki"], uid))
        u = c.execute("SELECT extra FROM users WHERE id=?", (uid,)).fetchone()
        ex = _j(u["extra"], {}) or {}
        if v.get("assistent") is None:
            ex.pop("bt_assistent", None)
        else:
            ex["bt_assistent"] = v["assistent"]
        c.execute("UPDATE users SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), uid))
        a = c.execute("SELECT data FROM bp_store WHERE key=?", (f"sigarchiv:{str(v.get('signatur') or '')[len(BILD):]}",)).fetchone()
        if v.get("signatur") and a:
            konto._put(c, f"signatur:{uid}", a["data"], by)
        elif not v.get("signatur"):
            c.execute("DELETE FROM bp_store WHERE key=?", (f"signatur:{uid}",))
    return load, save


def quelle(c, bereich):
    a, _, k = (bereich or "").partition(":")
    if bereich == "einst:bt":
        return Quelle("Allgemeine Einstellungen (Firma, Ablage, E-Mail)", "admin", *_settings(False))
    if bereich == "einst:vorlagen":
        return Quelle("E-Mail-Vorlagen", "admin", *_settings(True))
    if a == "gs" and k in GS:
        return Quelle(GS[k], "admin" if k in ("settings", "plattform") else "alle", *_row_store("gantt_store", k))
    if a == "bp" and k in BP:
        return Quelle(BP[k], "admin" if k == "versionen_conf" else "alle", *_row_store("bp_store", k))
    if a == "bk" and k in BK:
        return Quelle(BK[k], "admin" if k == "dienste" else "alle", *_row_store("bk_store", k))
    if a == "avalv" and k.isdigit():
        r = c.execute("SELECT name, nr FROM ava_lv WHERE id=?", (int(k),)).fetchone()
        return Quelle(f"Leistungsverzeichnis „{((r['nr'] + ' ') if r and r['nr'] else '') + (r['name'] if r else k)}“", "alle", *_avalv(int(k)))
    if a in ("bkp", "kontakt", "konto") and k.isdigit():
        i = int(k)
        if a == "bkp":
            r = c.execute("SELECT name FROM bk_projects WHERE id=?", (i,)).fetchone()
            return Quelle(f"Kostenermittlung „{r['name'] if r else i}“", "alle", *_bkp(i))
        if a == "kontakt":
            r = c.execute("SELECT name FROM contacts WHERE id=?", (i,)).fetchone()
            last = c.execute("SELECT daten FROM versionen WHERE bereich=? ORDER BY id DESC LIMIT 1", (bereich,)).fetchone()
            nm = r["name"] if r else ((_j(last["daten"], {}) or {}).get("name") if last else "") or f"Nr. {i}"
            return Quelle(f"Adresse „{nm}“", "alle", *_kontakt(i))
        r = c.execute("SELECT name FROM users WHERE id=?", (i,)).fetchone()
        return Quelle(f"Mein Konto ({r['name'] if r else i})", f"eigen:{i}", *_konto(i))
    return None


def darf(u, q):
    if not u or not q:
        return False
    if q.recht == "alle":
        return True
    if q.recht.startswith("eigen:"):
        return str(u["id"]) == q.recht[6:]
    return bool(u["is_admin"])


# ---------------------------------------------------------------- Änderungen in Worten
_FEHLT = object()


def _lab(k):
    return LABELS.get(str(k), str(k).replace("_", " "))


def _kurz(v):
    if v is None or v == "":
        return "leer"
    if isinstance(v, bool):
        return "ja" if v else "nein"
    if isinstance(v, (int, float)):
        return f"{v:g}".replace(".", ",")
    if isinstance(v, list):
        return f"{len(v)} Einträge"
    if isinstance(v, dict):
        return "…"
    s = " ".join(str(v).split())
    return "„" + (s if len(s) <= 40 else s[:38] + "…") + "“"


def _ident(x):
    if isinstance(x, dict):
        for k in ("key", "id", "uid", "name", "label", "titel"):
            if isinstance(x.get(k), (str, int)) and x.get(k) != "":
                return str(x[k])
    return None


def _nm(x):
    if isinstance(x, dict):
        if isinstance(x.get("kurz"), str) and ("oz" in x or "typ" in x):   # Position/Titel eines LV: „01.0010 Außenwand“
            k = " ".join(x["kurz"].split())
            return (f"{x.get('oz') or ''} " + (k if len(k) <= 40 else k[:38] + "…")).strip() or "Position"
        for k in ("label", "name", "titel", "title"):
            if isinstance(x.get(k), str) and x[k].strip():
                return x[k].strip()
    return _ident(x) or "Eintrag"


def _diff(a, b, pfad, out):
    if a == b:
        return
    p = " › ".join(pfad)
    if isinstance(a, dict) and isinstance(b, dict):
        for k in list(a) + [k for k in b if k not in a]:
            _diff(a.get(k, _FEHLT), b.get(k, _FEHLT), pfad + [_lab(k)], out)
        return
    if isinstance(a, list) and isinstance(b, list) and a and b and all(_ident(x) for x in a + b):
        ma, mb = {_ident(x): x for x in a}, {_ident(x): x for x in b}
        for k, x in mb.items():
            if k not in ma:
                out.append(f"{p + ': ' if p else ''}„{_nm(x)}“ hinzugefügt")
        for k, x in ma.items():
            if k not in mb:
                out.append(f"{p + ': ' if p else ''}„{_nm(x)}“ entfernt")
        for k in ma:
            if k in mb:
                _diff(ma[k], mb[k], pfad + [_nm(mb[k])], out)
        if [k for k in ma if k in mb] != [k for k in mb if k in ma]:
            out.append(f"{p + ': ' if p else ''}Reihenfolge geändert")
        return
    geheim = any(isinstance(x, str) and x.startswith("\u2022") for x in (a, b))
    lang = any(isinstance(x, str) and len(x) > 300 for x in (a, b))
    if a is _FEHLT or a in (None, ""):
        out.append(f"{p} eingetragen" if geheim or lang or b in (None, "") else f"{p}: {_kurz(b)}")
    elif b is _FEHLT or b in (None, ""):
        out.append(f"{p} entfernt")
    elif geheim or lang or isinstance(a, (dict, list)) or isinstance(b, (dict, list)):
        out.append(f"{p} geändert")
    else:
        out.append(f"{p}: {_kurz(a)} → {_kurz(b)}")


def aenderungen(alt, neu, n=14):
    if alt is None and neu is not None:
        return ["angelegt"]
    if neu is None and alt is not None:
        return ["gelöscht"]
    out = []
    _diff(alt, neu, [], out)
    out = [x.strip() or "geändert" for x in out]
    return out[:n] + ([f"… und {len(out) - n} weitere Änderungen"] if len(out) > n else [])


# ---------------------------------------------------------------- Stände anlegen
def _snap(c, q):
    v = q.load(c)
    return None if v is None else _mask(v)


def _last(c, bereich, n=1):
    return c.execute("SELECT * FROM versionen WHERE bereich=? ORDER BY id DESC LIMIT ?", (bereich, n)).fetchall()


def _ins(c, bereich, daten, aend, wer, art, name=""):
    s = json.dumps(daten, ensure_ascii=False, sort_keys=True)
    r = c.execute("INSERT INTO versionen(bereich, daten, aenderungen, wer, wann, art, name, groesse) VALUES(?,?,?,?,?,?,?,?) RETURNING id",
                  (bereich, s, json.dumps(aend, ensure_ascii=False), wer or "", _now(), art, name or "", len(s.encode())))
    return r.fetchone()["id"]


def vorher(c, bereich):
    """Vor dem Speichern: gibt es noch keinen Stand, den jetzigen als Ausgangsstand festhalten."""
    q = quelle(c, bereich)
    if q and not _last(c, bereich):
        v = _snap(c, q)
        if v is not None:
            _ins(c, bereich, v, ["Ausgangsstand"], "", "ausgang", "Ausgangsstand")


def merken(c, bereich, wer, art="auto", name=""):
    """Nach dem Speichern: neuen Stand anlegen (oder mit dem letzten eigenen der letzten 10 Minuten zusammenfassen)."""
    q = quelle(c, bereich)
    if not q:
        return None
    neu = _snap(c, q)
    s = json.dumps(neu, ensure_ascii=False, sort_keys=True)
    rows = _last(c, bereich, 2)
    last = rows[0] if rows else None
    if last and last["daten"] == s and art == "auto":
        return last["id"]
    alt = _j(last["daten"]) if last else None
    if (last and art == "auto" and last["art"] == "auto" and last["wer"] == (wer or "") and len(rows) > 1
            and datetime.fromisoformat(last["wann"]) > datetime.now() - timedelta(minutes=ZUSAMMEN_MIN)):
        prev = rows[1]
        if prev["daten"] == s:   # zurückgeändert → Zwischenstand verwerfen
            c.execute("DELETE FROM versionen WHERE id=?", (last["id"],))
            return prev["id"]
        c.execute("UPDATE versionen SET daten=?, aenderungen=?, wann=?, groesse=? WHERE id=?",
                  (s, json.dumps(aenderungen(_j(prev["daten"]), neu), ensure_ascii=False), _now(), len(s.encode()), last["id"]))
        return last["id"]
    return _ins(c, bereich, neu, aenderungen(alt, neu), wer, art, name)


@contextmanager
def aenderung(c, bereich, wer):
    """with aenderung(c, bereich, name): … – Ausgangsstand sichern, speichern, neuen Stand anlegen. Fehler der Versionierung brechen nie das Speichern ab."""
    _sicher(c, vorher, c, bereich)
    yield
    _sicher(c, merken, c, bereich, wer)


def _sicher(c, fn, *a):
    try:
        with c.savepoint():
            return fn(*a)
    except Exception:
        import logging
        logging.getLogger("bpcore.versionen").exception("Versionierung fehlgeschlagen")
        return None


# ---------------------------------------------------------------- Abfragen, Wiederherstellen, Benennen
def _meta(r):
    return {"id": r["id"], "bereich": r["bereich"], "wer": r["wer"], "wann": r["wann"], "art": r["art"], "name": r["name"],
            "groesse": r["groesse"], "aenderungen": _j(r["aenderungen"], []) or []}


def liste(c, bereich, n=200):
    return [_meta(r) for r in c.execute("SELECT id, bereich, wer, wann, art, name, groesse, aenderungen FROM versionen WHERE bereich=? "
                                        "ORDER BY id DESC LIMIT ?", (bereich, n))]


def vergleich(c, vid):
    """Was sich gegenüber dem jetzigen Stand ändern würde, wenn man diesen Stand wiederherstellt."""
    r = c.execute("SELECT * FROM versionen WHERE id=?", (vid,)).fetchone()
    q = quelle(c, r["bereich"]) if r else None
    if not q:
        return None
    return aenderungen(_snap(c, q), _j(r["daten"]), 40) or ["entspricht dem jetzigen Stand"]


def wiederherstellen(c, vid, wer):
    r = c.execute("SELECT * FROM versionen WHERE id=?", (vid,)).fetchone()
    q = quelle(c, r["bereich"]) if r else None
    if not q:
        return None
    vorher(c, r["bereich"])
    v = _j(r["daten"])
    q.save(c, None if v is None else _unmask(v, q.load(c)), wer)
    when = datetime.fromisoformat(r["wann"]).strftime("%d.%m.%Y %H:%M")
    return merken(c, r["bereich"], wer, "wiederhergestellt", f"Stand vom {when}" + (f" („{r['name']}“)" if r["name"] and r["art"] != "ausgang" else ""))


def benennen(c, bereich, name, wer):
    """Jetzigen Stand mit Namen festhalten (z. B. „vor Umstellung auf Holzbau“). Benannte Stände werden nie aufgeräumt."""
    q = quelle(c, bereich)
    if not q:
        return None
    vorher(c, bereich)
    s = json.dumps(_snap(c, q), ensure_ascii=False, sort_keys=True)
    last = _last(c, bereich)
    if last and last[0]["daten"] == s and last[0]["art"] in ("auto", "benannt", "wiederhergestellt"):
        c.execute("UPDATE versionen SET name=?, art='benannt' WHERE id=?", (name, last[0]["id"]))
        return last[0]["id"]
    return merken(c, bereich, wer, "benannt", name)


def umbenennen(c, vid, name):
    c.execute("UPDATE versionen SET name=?, art=CASE WHEN art='auto' AND ?<>'' THEN 'benannt' WHEN art='benannt' AND ?='' THEN 'auto' ELSE art END WHERE id=?",
              (name, name, name, vid))


# ---------------------------------------------------------------- Aufbewahrung
def conf(c):
    r = c.execute("SELECT data FROM bp_store WHERE key='versionen_conf'").fetchone()
    d = _j(r["data"], {}) if r else {}
    out = dict(STANDARD_CONF)
    for k in out:
        try:
            out[k] = max(0, min(3650, int((d or {}).get(k, out[k]))))
        except (TypeError, ValueError):
            pass
    if out["taeglich_tage"] and out["taeglich_tage"] < out["alle_tage"]:
        out["taeglich_tage"] = out["alle_tage"]
    return out


def aufraeumen(c, cf=None):
    """Ältere Stände ausdünnen: bis `alle_tage` alle, danach einer je Tag und Bereich, nach `taeglich_tage` löschen.
    Erhalten bleiben immer: der jüngste Stand je Bereich, benannte Stände und der Ausgangsstand."""
    cf = cf or conf(c)
    now = datetime.now()
    g1 = (now - timedelta(days=cf["alle_tage"])).isoformat(timespec="seconds") if cf["alle_tage"] else None
    g2 = (now - timedelta(days=cf["taeglich_tage"])).isoformat(timespec="seconds") if cf["taeglich_tage"] else None
    if not g1:
        return 0
    weg, seen = [], set()
    jung = {r["m"] for r in c.execute("SELECT max(id) AS m FROM versionen GROUP BY bereich")}
    for r in c.execute("SELECT id, bereich, wann, art FROM versionen WHERE wann < ? ORDER BY id DESC", (g1,)):
        if r["id"] in jung or r["art"] in ("benannt", "ausgang"):
            continue
        if g2 and r["wann"] < g2:
            weg.append(r["id"]); continue
        k = (r["bereich"], r["wann"][:10])
        if k in seen:
            weg.append(r["id"])
        seen.add(k)
    for i in range(0, len(weg), 500):
        part = weg[i:i + 500]
        c.execute(f"DELETE FROM versionen WHERE id IN ({','.join('?' * len(part))})", tuple(part))
    return len(weg)


def statistik(c):
    t = c.execute("SELECT count(*) AS n, coalesce(sum(groesse),0) AS b, min(wann) AS ab FROM versionen").fetchone()
    seit = (datetime.now() - timedelta(days=30)).isoformat(timespec="seconds")
    m = c.execute("SELECT count(*) AS n, coalesce(sum(groesse),0) AS b FROM versionen WHERE wann>=?", (seit,)).fetchone()
    tage = c.execute("SELECT count(DISTINCT bereich || substr(wann,1,10)) AS n FROM versionen WHERE wann>=?", (seit,)).fetchone()["n"]
    nb = c.execute("SELECT count(DISTINCT bereich) AS n FROM versionen").fetchone()["n"]
    teile = {}
    for r in c.execute("SELECT bereich, count(*) AS n, sum(groesse) AS b FROM versionen GROUP BY bereich"):
        a = r["bereich"].split(":")[0]
        x = teile.setdefault(a, {"n": 0, "b": 0}); x["n"] += r["n"]; x["b"] += r["b"] or 0
    groesse = (m["b"] / m["n"]) if m["n"] else ((t["b"] / t["n"]) if t["n"] else 2000)
    je_tag, tage_je_tag = m["n"] / 30, tage / 30
    vorschlaege = []
    for nm, a, d in VORSCHLAEGE:
        jahre = 5 if d == 0 else 0
        n = je_tag * a + tage_je_tag * ((d or (365 * jahre)) - a if (d or 365 * jahre) > a else 0)
        vorschlaege.append({"name": nm, "alle_tage": a, "taeglich_tage": d, "bytes": int(n * groesse + nb * groesse),
                            "hinweis": "nach 5 Jahren" if d == 0 else ""})
    return {"anzahl": t["n"], "bytes": t["b"], "seit": t["ab"], "monat_anzahl": m["n"], "monat_bytes": m["b"], "bereiche": nb,
            "teile": teile, "vorschlaege": vorschlaege}


TEILE = {"einst": "Allgemeine Einstellungen und Vorlagen", "gs": "Bauzeitenplan und KI", "bp": "Mängel & Erinnerungen, Planstand & Versand", "bk": "Raumtypen",
         "bkp": "Kostenermittlungen", "avalv": "Leistungsverzeichnisse", "kontakt": "Adressen", "konto": "Persönliche Einstellungen"}


def uebersicht(c, u, teil="", wer="", q="", n=300):
    """Alle Stände, die der Benutzer sehen darf (für die Seite „Änderungsverlauf“ der Verwaltung)."""
    sql, args = "SELECT id, bereich, wer, wann, art, name, groesse, aenderungen FROM versionen WHERE 1=1", []
    if teil:
        sql += " AND bereich LIKE ?"; args.append(teil + ":%")
    if wer:
        sql += " AND wer=?"; args.append(wer)
    if q:
        sql += " AND (lower(aenderungen) LIKE ? OR lower(name) LIKE ?)"; args += [f"%{q.lower()}%"] * 2
    sql += " ORDER BY id DESC LIMIT ?"; args.append(n * 3)
    out, titel = [], {}
    for r in c.execute(sql, tuple(args)).fetchall():
        b = r["bereich"]
        if b not in titel:
            qq = quelle(c, b)
            titel[b] = (qq.titel if qq else b, darf(u, qq))
        if not titel[b][1]:
            continue
        out.append({**_meta(r), "titel": titel[b][0]})
        if len(out) >= n:
            break
    return out


def vor(c, bereich):
    """Kurzform für Stellen, an denen kein with-Block passt: vor(c, b) … speichern … nach(c, b, wer)."""
    _sicher(c, vorher, c, bereich)


def nach(c, bereich, wer):
    _sicher(c, merken, c, bereich, wer)
