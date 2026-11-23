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
    ("urlaub.aendern", "Personal", "Abwesenheiten anderer ändern", "Urlaub, Krank usw. anderer zurücknehmen oder löschen, auch vergangene Tage – ab Werk Geschäftsführung, Büroleitung, Assistenz"),
    ("personal", "Personal", "Personal: alle Personen und Personalakte", "Daten aller Mitarbeiter:innen und ihre Personalakte (Verträge, Schriftverkehr) – jedes Öffnen der Akte wird protokolliert; ab Werk Geschäftsführung"),
    ("akquise", "Akquise", "Akquise sehen und bearbeiten", "Anfragen ohne Projekt (Ordner „Akquise“), in ein Projekt umwandeln – ab Werk Geschäftsführung"),
    ("gantt.soll", "Projekte", "Bauzeitenplan: Soll festhalten", "den laufenden Bauzeitenplan als Soll festhalten bzw. neu festhalten (mit Begründung) – ab Werk alle Planer:innen (Geschäftsführung, Büroleitung, Bauleitung, Mitarbeiter:innen)"),
    ("bauherren", "Projekte", "Bauherrenportal", "Inhalte für Bauherr:innen freigeben, Bauherr:innen einladen und sperren, Nachrichten aus dem Portal sehen"),
    ("wiki.pruefen", "Wiki", "Wiki fachlich prüfen", "Einträge als „geprüft“ freigeben – erst dann erscheinen sie als Hinweis in den Apps"),
    ("datenschutz", "System", "Datenschutz: KI-Protokoll", "Protokoll der KI-Anfragen ansehen und exportieren (enthält Klartext) – ab Werk Geschäftsführung"),
    ("meldungen.alle", "System", "Benachrichtigungen aller", "Verwaltung → Benachrichtigungen: Erinnerungen, Hinweise, Kalendereinladungen und Mails aller Personen sehen, aus- und abschalten, je Rolle festlegen – ab Werk Geschäftsführung, Büroleitung"),
    ("verwaltung", "System", "Verwaltung", "Benutzer:in, Rollen, Einstellungen und Server – dazu alle Apps (bisher „Administrator“)"),
]
# Blöcke der Verwaltung (besprochen am 13.11.2026): je Rolle – / sehen / ändern, als Rechte „b.<block>.sehen“ und „b.<block>.aendern“.
# Geheimnisse (Kennwörter, Schlüssel) sind der Block „zugaenge“ (besprochen am 13.11.2026): je Rolle – / neu setzen; den Wert sieht niemand,
# an den Browser geht nur „hinterlegt“. stufen=2: nur – / sehen freigebbar (ändern bleibt beim Administrator, z. B. Rollen – sonst könnte man
# sich selbst Rechte geben). stufen=1: nur – / ändern (neu setzen).
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
    ("zugaenge", "System", "Zugänge: Schlüssel & Kennwörter", "KI-Schlüssel, Mailserver, Microsoft 365, Ablage-Server – neu setzen; den Wert sieht niemand", 1),
    ("system", "System", "System", "Server-Status, Protokoll, Meldungen, Verlauf, Apps im Büro – ändern nur Administrator", 2),
    # Einstellungen der Apps, die fürs ganze Büro gelten (– = die Seite der App in der Verwaltung fehlt; ändern prüft die App selbst)
    ("baukosten", "Apps", "Kosten: Preise & Zuschläge", "Preise und Zuschläge der Kostenermittlungen (Kosten = Bauteile × Preis)", 3),
    ("baudaten", "Apps", "Baudaten: Preise, Index & Löhne", "Regionalfaktor, Baupreisindex, Verrechnungslöhne – sirAdos-Kataloge einlesen nur Administrator", 3),
    ("ava", "Apps", "Ausschreibung: Abrechnung", "Nachträge, Mengenüberschreitung, Bedarfspositionen", 3),
    ("plaene", "Apps", "Pläne: Plannummerierung & Gewerke", "Aufbau der Plannamen, Planarten, Kennungen, Plotauftrag", 3),
    ("gantt", "Apps", "Bauzeitenplan: Leistungskatalog, Phasen, Firmen", "Leistungskatalog für alle Pläne – Dauern, Abhängigkeiten, Lern-Vorschläge –, Phasen, Firmen- und Bezugsvorgaben", 3),
    ("aufgaben", "Apps", "Aufgaben: Erinnerungen & To-do-Regeln", "Erinnerungsmails (Vorlauf, Uhrzeit) und die Regeln der automatischen To-dos fürs Büro", 3),
]
# Apps je Rolle (beschlossen am 17.11.2026): an (nichts eingetragen) · nur lesen („app.<key>.lesen“) · aus („app.<key>.aus“) –
# in der Rolle und als Ausnahme je Person (rechte_plus/minus) wie jedes Recht. „Verwaltung“ hat immer die App Verwaltung ganz.
from .sso import APPS as _APPS   # noqa: E402 – sso importiert rechte nicht
APP_STUFEN = ("lesen", "aus")
APP_BLOCK = {"baukosten": "baukosten", "baudaten": "baudaten", "ava": "ava", "plaene": "plaene", "gantt": "gantt", "aufgaben": "aufgaben"}
BLOCK = {b[0]: b for b in BLOECKE}
# Seiten als Rechte (18.11.2026, Mock „Seiten als Rechte“: NS-A1 B1 C1): einzelne Seiten einer App lassen sich zuschalten, auch wenn die App
# „aus“ oder „nur lesen“ ist – Rechte „seite.<key>“ (an) und „seite.<key>.lesen“. Ist die App „an“, gilt die Seite mit.
# Je Seite: App, Name, Erklärung und die Adressen, die sie braucht (Methode, Muster) – nur diese erreicht, wer nur die Seite hat.
SEITEN = {
    "ava.nachverfolgen": ("ava", "Nachverfolgen", "LV-Versand über alle LVs: Rückmeldungen, Notizen, nachfassen (Erinnerungs-Mail) – keine Preise, Aufträge, Rechnungen",
                          (("GET", r"/api/nachverfolgen"), ("GET|PUT", r"/api/lv/\d+/versand"), ("POST", r"/api/lv/\d+/versand/(?:vorschau|senden)"))),
}
SEITE_GRUND = (("GET", r"/"), ("GET", r"/api/(?:me|platform)"), ("GET|POST|PUT|DELETE", r"/api/bp/.*"))   # Gerüst der Seite und der Kern (prüft selbst)
KEYS = ([r[0] for r in RECHTE] + [f"b.{b[0]}.{s}" for b in BLOECKE for s in ("sehen", "aendern")] + [f"app.{a}.{s}" for a, _ in _APPS for s in APP_STUFEN]
        + [f"seite.{k}{s}" for k in SEITEN for s in ("", ".lesen")] + ["app.admin.aus"])   # Verwaltung: nur die Kachel aus (kachel_aus)


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
    if BLOCK[block][4] in (1, 3) and hat(user, f"b.{block}.aendern"):
        return "aendern"
    if BLOCK[block][4] == 1:
        return ""
    return "sehen" if hat(user, f"b.{block}.sehen") or hat(user, f"b.{block}.aendern") else ""


def app_stufe(user, app):
    """„an“, „lesen“ oder „aus“ für eine App – aus Rolle und Ausnahmen (users.rechte). Wer „verwaltung“ hat, hat die Verwaltung
    immer ganz (sonst sperrt man sich aus); die übrigen Apps lassen sich auch für sie wählen (23.11.2026)."""
    if not user or _feld(user, "rechte") is None or (app == "admin" and hat(user, "verwaltung")):
        return "an"   # ohne gespeicherte Rechte (Gäste, Tests) gibt es keine Stufen – „hat“ ersetzt dort jedes Recht durch „Administrator“
    return "aus" if hat(user, f"app.{app}.aus") else "lesen" if hat(user, f"app.{app}.lesen") else "an"


def kachel_aus(user, app):
    """Kachel einer App weg, die App bleibt erreichbar – bisher nur die Verwaltung („app.admin.aus“ je Rolle/Person, 23.11.2026):
    sie fehlt auf der Startseite und im Apps-Menü, ⚙ Einstellungen führt weiter hinein."""
    return app == "admin" and bool(user) and _feld(user, "rechte") is not None and hat(user, "app.admin.aus")


def seite_stufe(user, key):
    """„an“, „lesen“ oder „aus“ für eine Seite: die höhere Stufe aus App und Seitenrecht."""
    a = app_stufe(user, SEITEN[key][0])
    s = "an" if hat(user, f"seite.{key}") else "lesen" if hat(user, f"seite.{key}.lesen") else "aus"
    return max(a, s, key=("aus", "lesen", "an").index)


def seiten(user, app):
    """{Seite: Stufe} der Seiten dieser App, die jemand über das Seitenrecht hat (nur wenn die App selbst nicht „an“ ist)."""
    if not user or app_stufe(user, app) == "an":
        return {}
    return {k.split(".", 1)[1]: st for k, v in SEITEN.items() if v[0] == app and (st := seite_stufe(user, k)) != "aus"}


def seite_fuer(app, methode, pfad):
    """Welche Seite deckt diese Anfrage? → Schlüssel oder None."""
    import re
    for k, (a, _, _, P) in SEITEN.items():
        if a == app and any(methode in m.split("|") and re.fullmatch(x, pfad) for m, x in P):
            return k
    return None


def seite_zugang(user, app, methode, pfad):
    """Wer die App nicht hat, aber eine ihrer Seiten: darf diese Anfrage? → Stufe der Seite („an“/„lesen“) oder None."""
    import re
    S = seiten(user, app)
    if not S:
        return None
    if any(methode in m.split("|") and re.fullmatch(x, pfad) for m, x in SEITE_GRUND):
        return max(S.values(), key=("lesen", "an").index)
    k = seite_fuer(app, methode, pfad)
    return S.get(k.split(".", 1)[1]) if k else None


def apps_uebernehmen(c):
    """Häkchen je Person (users.apps – frühere Maske, ältere Aufrufe) werden Ausnahmen zur Rolle: angehakt = an, sonst „aus“ (17.11.2026).
    Danach ist users.apps leer; niemand verliert oder bekommt dabei eine App."""
    from . import sso
    R = {r["key"]: liste(r["rechte"]) for r in c.execute("SELECT key, rechte FROM rollen")}
    for u in c.execute("SELECT * FROM users WHERE apps IS NOT NULL AND apps <> ''").fetchall():
        hatte, rr = set(sso._apps_of(u)), R.get(u["rolle"], [])
        plus = [k for k in liste(u["rechte_plus"]) if not k.startswith("app.")]
        minus = [k for k in liste(u["rechte_minus"]) if not k.startswith("app.")]
        for a, _ in _APPS:
            for s in APP_STUFEN:
                k, will = f"app.{a}.{s}", (s == "aus" and a not in hatte)
                if will and k not in rr:
                    plus.append(k)
                elif not will and k in rr and s == "aus":   # Rolle sagt „aus“, Häkchen gesetzt → Ausnahme „an“ („nur lesen“ der Rolle bleibt)
                    minus.append(k)
        c.execute("UPDATE users SET rechte_plus=?, rechte_minus=?, apps='' WHERE id=?", (json.dumps(plus), json.dumps(minus), u["id"]))


def stufen(user):
    return {b[0]: stufe(user, b[0]) for b in BLOECKE}


def gueltig(rolle_rechte, plus, minus):
    return [k for k in KEYS if (k in rolle_rechte or k in plus) and k not in minus]


def abgleichen(c):
    """users.rechte und users.is_admin aus Rolle und Ausnahmen neu setzen (danach pruefen() – Fehler lassen die Transaktion zurückrollen)."""
    apps_uebernehmen(c)
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


def alle_projekte(user):
    """Alle Projekte sehen: Recht „projekte.alle“ – oder „verwaltung“ (Administrator; die Rolle ab Werk trägt nur „verwaltung“,
    die Projektmaske sagt „nur die Ausgewählten und die Administratoren“)."""
    return hat(user, "projekte.alle") or hat(user, "verwaltung")


def allowed(leaders, user):
    return alle_projekte(user) or not leaders or user["id"] in leaders


def visible_ids(c, user):
    """None = alle Projekte sichtbar, sonst die Menge der sichtbaren Projekt-IDs."""
    if alle_projekte(user):
        return None
    return {r["id"] for r in c.execute("SELECT id, leaders FROM projects") if allowed(ids_of(r["leaders"]), user)}


def can_see(c, user, pid):
    if pid is None or alle_projekte(user):
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
