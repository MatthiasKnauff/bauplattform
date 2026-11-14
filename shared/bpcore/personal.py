"""Personal – Mitarbeiter:innen und Personalakte in einer App (besprochen am 14.11.2026, Mocks „App Personal“ und „Personalakte“).

Wer sieht wen: sich selbst immer; Vorgesetzte ihre Leute (users.vorgesetzter); mit dem Recht „personal“ (ab Werk GF) oder „verwaltung“ alle.
Die Akte (Dokumente auf dem Dateiserver unter „Büro/Personal/<Name>“, Ordner 01–07) und die Vergütung (Gehalt, Steuer-ID, SV-Nummer,
Bankverbindung) nur mit „personal“ – Steuer-ID, SV-Nummer und IBAN erscheinen verdeckt, Aufdecken und jedes Öffnen der Akte steht im Protokoll.
Arbeitszeit und Urlaub sind dieselben Felder wie in „Zeiten“ (bpcore/zeiten.py: zeit_person) – nichts doppelt.
Personalstatus: Konten ohne Personalstatus (z. B. „admin“, Externe) erscheinen nicht in Liste, Kalender und Urlaub.
Fristen (Ersthelfer:in, Unterweisung …) mit Erinnerung vorab – als To-do für das Recht „personal“.
"""
import json
from datetime import date, datetime, timedelta

from . import rechte

SPALTEN = ("eintritt", "austritt", "telefon", "notfall", "gehalt", "notiz")   # eigene Spalten in personal_person
FELDER = SPALTEN   # (älterer Name)
# weitere Angaben (personal_person.daten): Schlüssel → (Bereich, Beschriftung, Typ)
DATEN = {
    "geburt": ("person", "Geburtsdatum", "date"), "anschrift": ("person", "Anschrift", "text"), "tel_privat": ("person", "Telefon privat", "text"),
    "mail_privat": ("person", "E-Mail privat", "text"), "personalnr": ("person", "Personalnummer (Lohn)", "text"),
    "taetigkeit": ("vertrag", "Tätigkeit / Position", "text"), "vertragsart": ("vertrag", "Vertragsart", "select"), "befristet_bis": ("vertrag", "befristet bis", "date"),
    "probezeit_bis": ("vertrag", "Probezeit bis", "date"), "kuendigungsfrist": ("vertrag", "Kündigungsfrist", "text"), "austritt_grund": ("vertrag", "Austrittsgrund", "text"),
    "urlaub_uebertrag": ("arbeitszeit", "Resturlaub Vorjahr (Tage)", "zahl"), "uebertrag_bis": ("arbeitszeit", "Resturlaub verfällt am", "date"),
    "gehalt_ab": ("verguetung", "Gehalt gültig ab", "date"), "steuerklasse": ("verguetung", "Steuerklasse", "text"), "krankenkasse": ("verguetung", "Krankenkasse", "text"),
    "steuer_id": ("verguetung", "Steuer-ID", "geheim"), "sv_nr": ("verguetung", "Sozialversicherungsnummer", "geheim"),
    "kontoinhaber": ("verguetung", "Kontoinhaber:in", "text"), "iban": ("verguetung", "IBAN", "geheim"), "bic": ("verguetung", "BIC", "text"),
}
VERTRAGSARTEN = ["unbefristet", "befristet", "Minijob", "Werkstudent:in", "Ausbildung", "Praktikum", "freie Mitarbeit"]
GEHEIM = tuple(k for k, x in DATEN.items() if x[2] == "geheim")
AKTE_ORDNER = ["01 Vertrag & Nachträge", "02 Bewerbung, Zeugnisse, Nachweise", "03 Lohn & Gehalt", "04 Arbeitsschutz & Unterweisungen",
               "05 Datenschutz & Einwilligungen", "06 Schriftverkehr", "07 Austritt"]
EINST = {"personal_gehalt_feld": "0", "personal_frist_jahre": "3", "personal_ag_pct": "21", "personal_ausfall_pct": "5", "personal_feiertage": "10"}
AKTE = ("Büro", "Personal")


def _jetzt():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def _j(v):
    try:
        x = json.loads(v or "{}")
        return x if isinstance(x, dict) else {}
    except (TypeError, ValueError):
        return {}


def einst(c):
    S = {r["key"]: r["value"] or "" for r in c.execute("SELECT key, value FROM settings WHERE key LIKE 'personal\\_%'")}
    try:
        frist = max(1, min(30, int(S.get("personal_frist_jahre") or 3)))
    except ValueError:
        frist = 3
    zahl = lambda k: _zahl(S.get(k), float(EINST[k]))   # noqa: E731
    return {"gehalt_feld": (S.get("personal_gehalt_feld") or "0") == "1", "frist_jahre": frist,
            "ag_pct": zahl("personal_ag_pct"), "ausfall_pct": zahl("personal_ausfall_pct"), "feiertage": zahl("personal_feiertage")}


def _zahl(v, d=0.0):
    try:
        return float(str(v).replace(".", "").replace(",", ".") if isinstance(v, str) and "," in v else v) if v not in (None, "") else d
    except (TypeError, ValueError):
        return d


def einst_setzen(c, b):
    if "gehalt_feld" in b:
        c.execute("INSERT INTO settings(key, value) VALUES('personal_gehalt_feld', ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ("1" if b["gehalt_feld"] else "0",))
    for k in ("ag_pct", "ausfall_pct", "feiertage"):
        if k in b:
            c.execute("INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
                      ("personal_" + k, str(max(0.0, min(100.0 if k != "feiertage" else 30.0, _zahl(b[k]))))))
    if "frist_jahre" in b:
        c.execute("INSERT INTO settings(key, value) VALUES('personal_frist_jahre', ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
                  (str(max(1, min(30, int(b["frist_jahre"] or 3)))),))
    return einst(c)


def alle(u):
    return rechte.hat(u, "personal") or rechte.hat(u, "verwaltung")


def akte_darf(u):
    return rechte.hat(u, "personal")


def sieht(c, u, uid):
    if not u:
        return False
    if u["id"] == uid or alle(u):
        return True
    r = c.execute("SELECT vorgesetzter FROM users WHERE id=?", (uid,)).fetchone()
    return bool(r and r["vorgesetzter"] == u["id"])


def _name(r):
    return " ".join(x for x in (r["vorname"], r["nachname"]) if x) or r["name"]


def ist_personal(c, uid):
    r = c.execute("SELECT personal FROM personal_person WHERE user_id=?", (uid,)).fetchone()
    return not r or bool(r["personal"])


def ohne_status(c):
    """IDs der Konten ohne Personalstatus (z. B. „admin“, Externe)."""
    return {r["user_id"] for r in c.execute("SELECT user_id FROM personal_person WHERE personal=0").fetchall()}


def status_setzen(c, uid, an):
    c.execute("INSERT INTO personal_person(user_id) VALUES(?) ON CONFLICT (user_id) DO NOTHING", (uid,))
    c.execute("UPDATE personal_person SET personal=?, geaendert=? WHERE user_id=?", (1 if an else 0, _jetzt(), uid))


def liste(c, u, aus=False, ohne=False):
    """Sichtbare Personen: aktiv (oder ausgeschieden bzw. ohne Personalstatus), mit Rolle und Vorgesetzte:r."""
    R = {r["key"]: r["name"] for r in c.execute("SELECT key, name FROM rollen")}
    P = {r["user_id"]: r for r in c.execute("SELECT user_id, eintritt, austritt, personal FROM personal_person")}
    out = []
    for r in c.execute("SELECT id, name, vorname, nachname, rolle, vorgesetzter, active FROM users ORDER BY nachname, vorname, name").fetchall():
        if r["name"] in ("gast",) or not sieht(c, u, r["id"]):
            continue
        p = P.get(r["id"])
        kein = bool(p and not p["personal"])
        if kein != ohne:
            continue
        weg = bool(p and p["austritt"] and p["austritt"] <= date.today().isoformat()) or not r["active"]
        if not ohne and weg != aus:
            continue
        out.append({"id": r["id"], "name": _name(r), "rolle": R.get(r["rolle"], r["rolle"] or ""), "vorgesetzter": r["vorgesetzter"],
                    "eintritt": p["eintritt"] if p else "", "austritt": p["austritt"] if p else ""})
    return out


def _verdeckt(v):
    v = str(v or "")
    return ("•••• " + v[-4:]) if len(v) > 4 else ("••••" if v else "")


def detail(c, u, uid, zeigen=False):
    from . import zeiten as Z
    if not sieht(c, u, uid):
        raise PermissionError("Diese Person siehst du nicht.")
    r = c.execute("SELECT id, name, vorname, nachname, email, rolle, vorgesetzter, active FROM users WHERE id=?", (uid,)).fetchone()
    if not r:
        raise LookupError("Person nicht gefunden.")
    p = c.execute("SELECT * FROM personal_person WHERE user_id=?", (uid,)).fetchone()
    E = einst(c)
    d = {k: (p[k] if p else "") for k in SPALTEN}
    D = _j(p["daten"]) if p else {}
    akte = akte_darf(u)
    for k, (bereich, _l, typ) in DATEN.items():
        if bereich == "verguetung" and not akte:
            continue
        v = D.get(k, "")
        d[k] = v if (typ != "geheim" or zeigen) else _verdeckt(v)
    if not (E["gehalt_feld"] and akte):
        d.pop("gehalt", None)
    v = c.execute("SELECT vorname, nachname, name FROM users WHERE id=?", (r["vorgesetzter"],)).fetchone() if r["vorgesetzter"] else None
    rolle = c.execute("SELECT name FROM rollen WHERE key=?", (r["rolle"],)).fetchone()
    P = Z.person(c, uid)
    fristen = [dict(x) for x in c.execute("SELECT id, titel, bis, intervall, vorab, notiz FROM personal_frist WHERE user_id=? ORDER BY bis, id", (uid,)).fetchall()]
    return {"id": uid, "name": _name(r), "email": r["email"] or "", "rolle": rolle["name"] if rolle else (r["rolle"] or ""), "vorgesetzter": _name(v) if v else "",
            "aktiv": bool(r["active"]), **d, "personal": not p or bool(p["personal"]),
            "zeit": {k: P[k] for k in ("soll_woche", "tage", "urlaub", "saldo_start", "ab", "aus", "pause")},
            "soll_woche": P["soll_woche"], "urlaub": P["urlaub"], "konto": Z.konto(c, uid, P=P),
            "antraege": Z.antraege(c, uid=uid, jahr=date.today().isoformat()[:4]), "akte": akte, "gehalt_feld": E["gehalt_feld"] and akte,
            "darf_aendern": alle(u), "akte_geloescht": p["akte_geloescht"] if p else "", "fristen": fristen,
            "felder": {k: {"bereich": x[0], "l": x[1], "typ": x[2]} for k, x in DATEN.items() if x[0] != "verguetung" or akte},
            "vertragsarten": VERTRAGSARTEN, "geheim_gezeigt": bool(zeigen and akte),
            **({"kostensatz": kostensatz(c, uid, P, E), "satz": P.get("satz")} if akte else {})}


def setzen(c, u, uid, b):
    """Daten ändern (nur „personal“/Verwaltung): eigene Spalten, weitere Angaben (daten), Arbeitszeit/Urlaub (zeit → zeit_person)."""
    from . import zeiten as Z
    if not alle(u):
        raise PermissionError("Ändern darf, wer das Recht „Personal“ hat.")
    E = einst(c)
    w = {k: str(b[k] or "").strip()[:300] for k in SPALTEN if k in b and (k != "gehalt" or (E["gehalt_feld"] and akte_darf(u)))}
    alt = c.execute("SELECT * FROM personal_person WHERE user_id=?", (uid,)).fetchone()
    if not alt:
        c.execute("INSERT INTO personal_person(user_id) VALUES(?)", (uid,))
        alt = c.execute("SELECT * FROM personal_person WHERE user_id=?", (uid,)).fetchone()
    D = _j(alt["daten"])
    neu = False
    for k, (bereich, _l, typ) in DATEN.items():
        if k not in b or (bereich == "verguetung" and not akte_darf(u)):
            continue
        v = str(b[k] or "").strip()[:300]
        if typ == "geheim" and v.startswith("••••"):
            continue   # verdeckter Wert kam unverändert zurück
        if typ == "zahl":
            try:
                v = round(float(v.replace(",", ".")), 1) if v else ""
            except ValueError:
                raise ValueError("Bitte eine Zahl eingeben.")
        if typ == "geheim" and k == "iban":
            v = v.replace(" ", "").upper()
        if typ == "select" and v and v not in VERTRAGSARTEN:
            continue
        D[k] = v
        neu = True
    if w or neu:
        sets = {**w, "daten": json.dumps(D, ensure_ascii=False), "geaendert": _jetzt()}
        c.execute("UPDATE personal_person SET " + ", ".join(f"{k}=?" for k in sets) + " WHERE user_id=?", (*sets.values(), uid))
    if isinstance(b.get("zeit"), dict):
        Z.person_setzen(c, uid, {k: v for k, v in b["zeit"].items() if k in ("soll_woche", "tage", "urlaub", "saldo_start", "ab", "aus", "pause")})
    if "gehalt" in w or isinstance(b.get("zeit"), dict):
        kostensatz_setzen(c, uid)
    if "personal" in b:
        status_setzen(c, uid, bool(b["personal"]))


def kostensatz(c, uid, P=None, E=None):
    """Kostensatz je Stunde aus dem Gehalt (für den Abgleich Honorar ↔ Zeiten, zeit_person.satz):
    Monatsbrutto × 12 × (1 + Arbeitgeberanteil) ÷ produktive Stunden (Soll je Woche × 52 − Urlaub und Feiertage, abzüglich Ausfall %)."""
    from . import zeiten as Z
    r = c.execute("SELECT gehalt FROM personal_person WHERE user_id=?", (uid,)).fetchone()
    g = _zahl(r["gehalt"] if r else None, 0.0)
    if g <= 0:
        return None
    P, E = P or Z.person(c, uid), E or einst(c)
    tage = max(1, len(P["tage"] or "01234"))
    h = (P["soll_woche"] or 0) * 52 - ((P["urlaub"] or 0) + E["feiertage"]) * (P["soll_woche"] or 0) / tage
    h *= 1 - E["ausfall_pct"] / 100
    if h <= 0:
        return None
    return round(g * 12 * (1 + E["ag_pct"] / 100) / h, 2)


def kostensatz_setzen(c, uid):
    """Gehalt (oder Arbeitszeit) geändert: den Satz in „Zeiten“ nachführen – damit rechnet die Kostenauswertung im Honorar."""
    from . import zeiten as Z
    k = kostensatz(c, uid)
    if k is not None:
        Z.person_setzen(c, uid, {"satz": k})
    return k


def uebertrag(c, uid, jahr):
    """Resturlaub aus dem Vorjahr (Tage) – zählt im Urlaubskonto des laufenden Jahres, solange er nicht verfallen ist."""
    r = c.execute("SELECT daten FROM personal_person WHERE user_id=?", (uid,)).fetchone()
    D = _j(r["daten"]) if r else {}
    try:
        n = float(D.get("urlaub_uebertrag") or 0)
    except (TypeError, ValueError):
        n = 0.0
    bis = str(D.get("uebertrag_bis") or "")
    if not n or (bis and bis[:4] != str(jahr)):   # Übertrag gehört zum Jahr, in dem er verfällt (ohne Datum: zum laufenden Jahr)
        return 0.0
    if not bis and str(jahr) != date.today().isoformat()[:4]:
        return 0.0
    return n


# ---------- Fristen (Ersthelfer:in, Unterweisung …)
def frist_setzen(c, u, uid, b, fid=None):
    if not alle(u):
        raise PermissionError("Fristen pflegt, wer das Recht „Personal“ hat.")
    t, bis = str(b.get("titel") or "").strip()[:120], str(b.get("bis") or "")[:10]
    if not t:
        raise ValueError("Bitte angeben, worum es geht (z. B. Ersthelfer:in).")
    try:
        if bis:
            date.fromisoformat(bis)
    except ValueError:
        raise ValueError("Datum prüfen.")
    iv, vor = int(max(0, min(120, float(b.get("intervall") or 0)))), int(max(0, min(365, float(b.get("vorab") if b.get("vorab") not in (None, "") else 30))))
    if fid:
        c.execute("UPDATE personal_frist SET titel=?, bis=?, intervall=?, vorab=?, notiz=?, geaendert=? WHERE id=? AND user_id=?",
                  (t, bis, iv, vor, str(b.get("notiz") or "")[:300], _jetzt(), fid, uid))
        return fid
    return c.execute("INSERT INTO personal_frist(user_id, titel, bis, intervall, vorab, notiz, geaendert) VALUES(?,?,?,?,?,?,?) RETURNING id",
                     (uid, t, bis, iv, vor, str(b.get("notiz") or "")[:300], _jetzt())).fetchone()["id"]


def frist_erledigt(c, u, fid):
    """Erledigt: wiederkehrende Frist rückt um das Intervall weiter, einmalige wird gelöscht."""
    if not alle(u):
        raise PermissionError("Fristen pflegt, wer das Recht „Personal“ hat.")
    f = c.execute("SELECT * FROM personal_frist WHERE id=?", (fid,)).fetchone()
    if not f:
        raise LookupError("Frist nicht gefunden.")
    if f["intervall"] and f["bis"]:
        d = date.fromisoformat(f["bis"])
        m = d.month - 1 + f["intervall"]
        y, m = d.year + m // 12, m % 12 + 1
        try:
            n = d.replace(year=y, month=m)
        except ValueError:
            n = date(y, m, 28)
        c.execute("UPDATE personal_frist SET bis=?, geaendert=? WHERE id=?", (n.isoformat(), _jetzt(), fid))
        return {"bis": n.isoformat(), "alt": f["bis"]}
    c.execute("DELETE FROM personal_frist WHERE id=?", (fid,))
    return {"geloescht": dict(f)}


def fristen_faellig(c):
    """Fristen, an die jetzt erinnert wird (bis − vorab ≤ heute) – nur Personen mit Personalstatus."""
    heute, kein = date.today(), ohne_status(c)
    out = []
    for f in c.execute("SELECT f.*, u.name, u.vorname, u.nachname FROM personal_frist f JOIN users u ON u.id=f.user_id WHERE f.bis<>''").fetchall():
        if f["user_id"] in kein:
            continue
        try:
            bis = date.fromisoformat(f["bis"])
        except ValueError:
            continue
        if bis - timedelta(days=f["vorab"] or 0) <= heute:
            out.append({"id": f["id"], "uid": f["user_id"], "name": _name(f), "titel": f["titel"], "bis": f["bis"], "abgelaufen": bis < heute})
    return out


def akte_pfad(c, uid):
    r = c.execute("SELECT name, vorname, nachname FROM users WHERE id=?", (uid,)).fetchone()
    if not r:
        raise LookupError("Person nicht gefunden.")
    from .akquise import ordner_name
    return list(AKTE) + [ordner_name(_name(r))]


def frist_faellig(c):
    """Ausgeschiedene, deren Akte nach der Frist gelöscht werden sollte (noch nicht gelöscht)."""
    E = einst(c)
    heute = date.today()
    out = []
    for r in c.execute("SELECT p.user_id, p.austritt, u.name, u.vorname, u.nachname FROM personal_person p JOIN users u ON u.id=p.user_id "
                       "WHERE p.austritt<>'' AND p.akte_geloescht='' AND p.personal=1").fetchall():
        try:
            a = date.fromisoformat(r["austritt"][:10])
        except ValueError:
            continue
        try:
            bis = a.replace(year=a.year + E["frist_jahre"])
        except ValueError:
            bis = a.replace(year=a.year + E["frist_jahre"], day=28)
        if bis <= heute:
            out.append({"id": r["user_id"], "name": _name(r), "austritt": r["austritt"], "bis": bis.isoformat()})
    return out
