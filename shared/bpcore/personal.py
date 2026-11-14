"""Personal – Mitarbeiter:innen und Personalakte in einer App (besprochen am 14.11.2026, Mock „App Personal“).

Wer sieht wen: sich selbst immer; Vorgesetzte ihre Leute (users.vorgesetzter); mit dem Recht „personal“ (ab Werk GF) oder „verwaltung“ alle.
Die Akte (Dokumente auf dem Dateiserver unter „Büro/Personal/<Name>“) nur mit „personal“ – jedes Öffnen steht im Protokoll.
Urlaub und Abwesenheit kommen aus dem Kern der Zeiten (bpcore/zeiten.py: Anträge mit Genehmigung, Konto) – nichts doppelt.
Gehalt nur als Feld, wenn in den Einstellungen gewählt; sonst als Dokument in der Akte. Ausgeschiedene: nach der Aufbewahrungsfrist
(Vorgabe 3 Jahre nach Austritt; Lohnunterlagen behält das Steuerbüro 6/10 Jahre) schlägt ein To-do vor, die Akte zu löschen.
"""
from datetime import date, datetime

from . import rechte

FELDER = ("eintritt", "austritt", "telefon", "notfall", "gehalt", "notiz")
EINST = {"personal_gehalt_feld": "0", "personal_frist_jahre": "3"}
AKTE = ("Büro", "Personal")


def _jetzt():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def einst(c):
    S = {r["key"]: r["value"] or "" for r in c.execute("SELECT key, value FROM settings WHERE key LIKE 'personal\\_%'")}
    try:
        frist = max(1, min(30, int(S.get("personal_frist_jahre") or 3)))
    except ValueError:
        frist = 3
    return {"gehalt_feld": (S.get("personal_gehalt_feld") or "0") == "1", "frist_jahre": frist}


def einst_setzen(c, b):
    if "gehalt_feld" in b:
        c.execute("INSERT INTO settings(key, value) VALUES('personal_gehalt_feld', ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ("1" if b["gehalt_feld"] else "0",))
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


def liste(c, u, aus=False):
    """Sichtbare Personen: aktiv (oder ausgeschieden), mit Rolle und Vorgesetzte:r."""
    R = {r["key"]: r["name"] for r in c.execute("SELECT key, name FROM rollen")}
    P = {r["user_id"]: r for r in c.execute("SELECT user_id, eintritt, austritt FROM personal_person")}
    out = []
    for r in c.execute("SELECT id, name, vorname, nachname, rolle, vorgesetzter, active FROM users ORDER BY nachname, vorname, name").fetchall():
        if r["name"] in ("gast",) or not sieht(c, u, r["id"]):
            continue
        p = P.get(r["id"])
        weg = bool(p and p["austritt"] and p["austritt"] <= date.today().isoformat()) or not r["active"]
        if weg != aus:
            continue
        out.append({"id": r["id"], "name": _name(r), "rolle": R.get(r["rolle"], r["rolle"] or ""), "vorgesetzter": r["vorgesetzter"],
                    "eintritt": p["eintritt"] if p else "", "austritt": p["austritt"] if p else ""})
    return out


def detail(c, u, uid):
    from . import zeiten as Z
    if not sieht(c, u, uid):
        raise PermissionError("Diese Person siehst du nicht.")
    r = c.execute("SELECT id, name, vorname, nachname, email, rolle, vorgesetzter, active FROM users WHERE id=?", (uid,)).fetchone()
    if not r:
        raise LookupError("Person nicht gefunden.")
    p = c.execute("SELECT * FROM personal_person WHERE user_id=?", (uid,)).fetchone()
    E = einst(c)
    d = {k: (p[k] if p else "") for k in FELDER}
    if not (E["gehalt_feld"] and alle(u)):
        d.pop("gehalt", None)
    v = c.execute("SELECT vorname, nachname, name FROM users WHERE id=?", (r["vorgesetzter"],)).fetchone() if r["vorgesetzter"] else None
    rolle = c.execute("SELECT name FROM rollen WHERE key=?", (r["rolle"],)).fetchone()
    P = Z.person(c, uid)
    return {"id": uid, "name": _name(r), "email": r["email"] or "", "rolle": rolle["name"] if rolle else (r["rolle"] or ""), "vorgesetzter": _name(v) if v else "",
            "aktiv": bool(r["active"]), **d, "soll_woche": P["soll_woche"], "urlaub": P["urlaub"], "konto": Z.konto(c, uid, P=P),
            "antraege": Z.antraege(c, uid=uid, jahr=date.today().isoformat()[:4]), "akte": akte_darf(u), "gehalt_feld": E["gehalt_feld"] and alle(u),
            "darf_aendern": alle(u), "akte_geloescht": p["akte_geloescht"] if p else ""}


def setzen(c, u, uid, b):
    if not alle(u):
        raise PermissionError("Ändern darf, wer das Recht „Personal“ hat.")
    E = einst(c)
    w = {k: str(b[k] or "").strip()[:300] for k in FELDER if k in b and (k != "gehalt" or E["gehalt_feld"])}
    if not w:
        return
    alt = c.execute("SELECT * FROM personal_person WHERE user_id=?", (uid,)).fetchone()
    if not alt:
        c.execute("INSERT INTO personal_person(user_id) VALUES(?)", (uid,))
    c.execute("UPDATE personal_person SET " + ", ".join(f"{k}=?" for k in w) + ", geaendert=? WHERE user_id=?", (*w.values(), _jetzt(), uid))


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
                       "WHERE p.austritt<>'' AND p.akte_geloescht=''").fetchall():
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
