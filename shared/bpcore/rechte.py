"""Rollen & Rechte und wer ein Projekt sehen darf – eine Regel für alle Apps, geprüft auf dem Server.

Jeder Benutzer hat eine Rolle (Tabelle rollen: Liste von Rechten) und Ausnahmen (users.rechte_plus / rechte_minus). Daraus folgt
users.rechte (die gültigen Rechte) und users.is_admin (= Recht „verwaltung“); beides schreibt nur abgleichen() – so prüft jede App
ohne zusätzliche Abfrage: hat(user, "projekte.alle").

Projekte: Ist eine Liste zuständiger Bauleiter eingetragen, sehen nur diese (und wer „projekte.alle“ hat) das Projekt.
Leere Liste = alle Benutzer."""
import json

# Recht, Gruppe, Bezeichnung, Erklärung – nur Rechte, die wirklich geprüft werden
RECHTE = [
    ("projekte.alle", "Projekte", "Alle Projekte sehen", "auch Projekte, bei denen andere als Bauleitung eingetragen sind"),
    ("urlaub.freigeben", "Personal", "Urlaubsanträge entscheiden", "genehmigen und ablehnen – den eigenen Antrag entscheidet jemand anderes"),
    ("verwaltung", "System", "Verwaltung", "Benutzer:in, Rollen, Einstellungen und Server – dazu alle Apps (bisher „Administrator“)"),
]
# Blöcke der Verwaltung (besprochen am 13.11.2026): je Rolle – / sehen / ändern, als Rechte „b.<block>.sehen“ und „b.<block>.aendern“.
# Geheimnisse (Kennwörter, Schlüssel, Zugänge) sind kein Block: die ändert nur, wer „verwaltung“ hat, und niemand sonst sieht sie.
# stufen=2: nur – / sehen freigebbar (ändern bleibt beim Administrator, z. B. Rollen – sonst könnte man sich selbst Rechte geben).
BLOECKE = [   # key, Bereich, Titel, enthält, stufen
    ("projekte", "Büro", "Projekte", "Projekte anlegen und bearbeiten, Projektordner", 3),
    ("mitarbeiter", "Büro", "Mitarbeiter & Rechte", "Benutzer:innen, Rollen, Angemeldet – ändern nur Administrator", 2),
    ("buero", "Einstellungen", "Büro & Standort", "Firma, Logo, Briefbogen, Stempel, Bundesland, Darstellung fürs Büro", 3),
    ("ablage", "Einstellungen", "Ablage: Ordner & Namen", "Ordner für Fotos und PDFs, Namen der PDFs, alte Stände, Eingangs- und Allplan-Ordner", 3),
    ("sicherung", "Einstellungen", "Datensicherung", "Sicherungen ansehen – sichern und wiederherstellen nur Administrator", 2),
    ("postfaecher", "Einstellungen", "Postfächer zuweisen", "wer welches gemeinsame Postfach sieht", 3),
    ("druck", "Einstellungen", "Druck & Vorlagen", "Druck-Layouts, E-Mail-Vorlagen", 3),
    ("ki", "Einstellungen", "KI im Büro", "KI an/aus je Anbieter, Modell, Positionsvorschlag – die Schlüssel nur Administrator", 3),
    ("kataloge", "Einstellungen", "Kataloge erzeugen", "Kataloge mit KI ergänzen, nach Allplan übertragen", 3),
    ("system", "System", "System", "Server-Status, Protokoll, Meldungen, Verlauf, Apps im Büro – ändern nur Administrator", 2),
]
BLOCK = {b[0]: b for b in BLOECKE}
KEYS = [r[0] for r in RECHTE] + [f"b.{b[0]}.{s}" for b in BLOECKE for s in ("sehen", "aendern")]


def _feld(u, k, d=None):
    try:
        v = u[k]
    except (KeyError, IndexError):
        return d
    return d if v is None else v


def liste(raw):
    try:
        v = json.loads(raw or "[]")
    except (ValueError, TypeError):
        return []
    return [x for x in v if x in KEYS] if isinstance(v, list) else []


def hat(user, recht):
    """Hat der Benutzer das Recht? Benutzer aus der Datenbank tragen ihre gültigen Rechte mit (users.rechte)."""
    if not user:
        return False
    r = _feld(user, "rechte")
    if r is None:   # Benutzer ohne Spalte (Tests, Gäste): wie bisher am Administrator
        return bool(_feld(user, "is_admin", 0))
    return recht in liste(r)


def stufe(user, block):
    """„aendern“, „sehen“ oder „“ für einen Block der Verwaltung. Wer „verwaltung“ hat, darf alles."""
    if not user or block not in BLOCK:
        return ""
    if hat(user, "verwaltung"):
        return "aendern"
    if BLOCK[block][4] == 3 and hat(user, f"b.{block}.aendern"):
        return "aendern"
    return "sehen" if hat(user, f"b.{block}.sehen") or hat(user, f"b.{block}.aendern") else ""


def stufen(user):
    return {b[0]: stufe(user, b[0]) for b in BLOECKE}


def gueltig(rolle_rechte, plus, minus):
    return [k for k in KEYS if (k in rolle_rechte or k in plus) and k not in minus]


def abgleichen(c):
    """users.rechte und users.is_admin aus Rolle und Ausnahmen neu setzen (danach pruefen() – Fehler lassen die Transaktion zurückrollen)."""
    R = {r["key"]: liste(r["rechte"]) for r in c.execute("SELECT key, rechte FROM rollen")}
    for u in c.execute("SELECT id, rolle, rechte_plus, rechte_minus, rechte, is_admin FROM users").fetchall():
        g = gueltig(R.get(u["rolle"], []), liste(u["rechte_plus"]), liste(u["rechte_minus"]))
        a = 1 if "verwaltung" in g else 0
        if json.dumps(g) != (u["rechte"] or "") or a != u["is_admin"]:
            c.execute("UPDATE users SET rechte=?, is_admin=? WHERE id=?", (json.dumps(g), a, u["id"]))


def pruefen(c, selbst):
    """Nach abgleichen(): wer gerade ändert, behält „verwaltung“, und es bleibt mindestens ein aktives Konto damit."""
    r = c.execute("SELECT is_admin FROM users WHERE id=?", (selbst,)).fetchone()
    if r is not None and not r["is_admin"]:
        raise ValueError("Das Recht „Verwaltung“ kannst du dir nicht selbst entziehen.")
    if not c.execute("SELECT 1 FROM users WHERE is_admin=1 AND active=1").fetchone():
        raise ValueError("Mindestens ein aktives Konto muss das Recht „Verwaltung“ behalten.")


def ids_of(raw):
    try:
        v = json.loads(raw or "[]")
    except ValueError:
        return []
    return [int(x) for x in v if str(x).isdigit()] if isinstance(v, list) else []


def clean(value, c):
    """Vom Browser gesendete Liste prüfen: nur vorhandene Benutzer, ohne Doppelte."""
    if not isinstance(value, list):
        return []
    known = {r["id"] for r in c.execute("SELECT id FROM users")}
    out = []
    for x in value:
        if str(x).isdigit() and int(x) in known and int(x) not in out:
            out.append(int(x))
    return out


def allowed(leaders, user):
    return hat(user, "projekte.alle") or not leaders or user["id"] in leaders


def visible_ids(c, user):
    """None = alle Projekte sichtbar, sonst die Menge der sichtbaren Projekt-IDs."""
    if hat(user, "projekte.alle"):
        return None
    return {r["id"] for r in c.execute("SELECT id, leaders FROM projects") if allowed(ids_of(r["leaders"]), user)}


def can_see(c, user, pid):
    if pid is None or hat(user, "projekte.alle"):
        return True
    r = c.execute("SELECT leaders FROM projects WHERE id=?", (pid,)).fetchone()
    return True if not r else allowed(ids_of(r["leaders"]), user)


def admin_setzen(c, uid, ja):
    """Kurzform „Administrator ja/nein“ (alte Masken, Tests): ja = Rolle mit „verwaltung“ (Geschäftsführung), nein = Mitarbeiter."""
    u = c.execute("SELECT rolle, rechte_plus, rechte_minus FROM users WHERE id=?", (uid,)).fetchone()
    if not u or ("verwaltung" in gueltig(liste((c.execute("SELECT rechte FROM rollen WHERE key=?", (u["rolle"],)).fetchone() or {"rechte": "[]"})["rechte"]),
                                         liste(u["rechte_plus"]), liste(u["rechte_minus"]))) == bool(ja):
        return
    c.execute("UPDATE users SET rolle=?, rechte_plus='[]', rechte_minus='[]' WHERE id=?", ("gf" if ja else "mitarbeiter", uid))
    abgleichen(c)
