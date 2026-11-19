"""Datenschutzhinweise und Einwilligung (Mock „DSGVO: KI anonymisieren“, entschieden am 14.11.2026, Punkte 4–6).

Beim Anlegen einer Person entsteht ein Blatt zum Ausdrucken; die Person unterschreibt, das Blatt kommt in die Personalakte
(Ordner „05 Datenschutz & Einwilligungen“). Bis dahin steht bei der Person „Einwilligung offen“ – grau, nach 14 Tagen rot.
Stand in users.extra["einwilligung"] = {gedruckt, zurueck} (Datum). Der Text ist eine Vorlage des Büros (Personal → Einstellungen,
settings „personal_einw_text“, Abschnitte mit „## Überschrift“); ab Werk ein Entwurf, der vor Gebrauch geprüft werden muss.
Dieselbe PDF-Hilfe (blatt) schreibt die Verfahrensbeschreibung der Anonymisierung (ki_verfahren.py).
"""
import io
import json
from datetime import date

ROT_NACH = 14   # Tage bis „Einwilligung offen“ rot wird
SCHLUESSEL = "personal_einw_text"
HINWEIS_ENTWURF = "Entwurf ab Werk – vor Gebrauch von der bzw. dem Datenschutzbeauftragten oder einer Anwältin bzw. einem Anwalt prüfen lassen."

STANDARD = """## Wer verantwortlich ist
{buero}, {adresse}. Fragen zum Datenschutz richten Sie an die Geschäftsführung{dsb}.

## Welche Daten die Plattform über Sie speichert
Ihr Konto (Name, E-Mail, Rolle, Anmeldungen), Arbeitszeiten und Abwesenheiten, was Sie in der Plattform anlegen oder ändern (Berichte, Fotos, Diktate, Mails, Notizen, Pläne) und wer wann was geändert hat (Verlauf). In der Personalakte liegen Vertrag, Nachweise und Schriftverkehr.

## Wozu
Für das Arbeitsverhältnis und die Arbeit in den Projekten: Planung, Bauleitung, Abrechnung, Nachweise gegenüber Bauherrschaft und Behörden, Sicherheit der Plattform.

## Rechtsgrundlage
Art. 6 Abs. 1 Buchst. b DSGVO (Arbeitsvertrag), Buchst. c (gesetzliche Pflichten, z. B. Aufbewahrung), Buchst. f (berechtigtes Interesse: Sicherheit, Nachweis). Wo Sie freiwillig einwilligen: Art. 6 Abs. 1 Buchst. a und Art. 7 DSGVO.

## Wie lange
Solange es für den Zweck nötig ist und gesetzliche Fristen es verlangen. Die Personalakte wird {frist} Jahre nach dem Austritt gelöscht, das Protokoll der KI-Anfragen nach {ki_tage} Tagen.

## Wer die Daten sieht
Kolleg:innen nur nach ihren Rollen und Rechten; die Personalakte nur, wer das Recht „Personal“ hat. Dienstleister für Server und Mail arbeiten in unserem Auftrag (Art. 28 DSGVO).

## Künstliche Intelligenz
Die KI im Büro läuft auf eigenen Servern. Externe KI-Dienste nutzt die Plattform nur, wenn die Verwaltung sie freigibt, und nur anonymisiert: Namen, Adressen, E-Mail-Adressen und Telefonnummern werden vorher durch Kennungen ersetzt. Bilder gehen nur nach Rückfrage hinaus.

## Ihre Rechte
Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20), Widerspruch (Art. 21) und Beschwerde bei einer Aufsichtsbehörde (Art. 77).

## Freiwillige Einwilligung
☐ Mein Foto darf im Profil der Plattform erscheinen.
☐ Mein Name darf in Unterlagen stehen, die die Bauherrschaft im Bauherrenportal sieht.
Die Einwilligung ist freiwillig und jederzeit für die Zukunft widerruflich; ohne sie entstehen Ihnen keine Nachteile."""


def text(c):
    """Vorlage des Büros (oder Standard) → (Text, ist_standard)."""
    r = c.execute("SELECT value FROM settings WHERE key=?", (SCHLUESSEL,)).fetchone()
    t = ((r and r["value"]) or "").strip()
    return (t, False) if t else (STANDARD, True)


def text_setzen(c, t):
    t = (t or "").strip()[:20000]
    if t == STANDARD.strip():
        t = ""   # Standard wieder: nichts Eigenes speichern
    c.execute("INSERT INTO settings(key, value) VALUES(?,?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (SCHLUESSEL, t))


def abschnitte(t):
    """„## Titel\\nText …“ → [(Titel, Text)]"""
    out, titel, zeilen = [], "", []
    for z in (t or "").split("\n"):
        if z.startswith("## "):
            if titel or any(x.strip() for x in zeilen):
                out.append((titel, "\n".join(zeilen).strip()))
            titel, zeilen = z[3:].strip(), []
        else:
            zeilen.append(z)
    if titel or any(x.strip() for x in zeilen):
        out.append((titel, "\n".join(zeilen).strip()))
    return out


def _settings(c, *keys):
    return {r["key"]: r["value"] or "" for r in c.execute(f"SELECT key, value FROM settings WHERE key IN ({','.join('?' * len(keys))})", keys)}


def platzhalter(c):
    from . import anonym, personal
    S = _settings(c, "office_name", "co_short", "co_street", "co_zip", "co_city", "co_dsb")
    buero = S.get("office_name") or S.get("co_short") or "das Büro"
    adresse = ", ".join(x for x in (S.get("co_street", ""), " ".join(y for y in (S.get("co_zip", ""), S.get("co_city", "")) if y)) if x) or "Anschrift des Büros"
    try:
        ki_tage = anonym._einst(c)[1]
    except Exception:   # noqa: BLE001 – ohne Einstellung die Vorgabe
        ki_tage = 90
    return {"buero": buero, "adresse": adresse, "dsb": f" oder an {S['co_dsb']}" if S.get("co_dsb") else "",
            "frist": personal.einst(c)["frist_jahre"], "ki_tage": ki_tage}


def fuellen(t, P):
    for k, v in P.items():
        t = t.replace("{" + k + "}", str(v))
    return t


def blatt(c, titel, unterzeile, teile, unterschrift=None, fuss=""):
    """Schlichtes A4-Blatt auf dem Briefbogen: Titel, Unterzeile, Abschnitte [(Überschrift, Text)], unten optional Unterschriftzeilen."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.utils import simpleSplit
    from reportlab.pdfgen import canvas
    from . import briefbogen
    bogen = briefbogen.holen(c)
    RD = briefbogen.raender(bogen) if bogen else None
    W, H = A4
    L = max(RD["links"], 25 * mm) if RD else 25 * mm
    R = W - (max(RD["rechts"], 10 * mm) if RD else 20 * mm)
    oben = H - ((RD["kopf"] + 10 * mm) if RD and RD.get("kopf") else 28 * mm)
    unten = (RD["fuss"] + 8 * mm) if RD else 20 * mm
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    cv.setTitle(titel)
    y = [oben]

    def platz(h):
        if y[0] - h < unten:
            cv.showPage(); y[0] = oben

    def schreib(t, font="Helvetica", size=9.5, abstand=1.35, nach=0):
        for para in (t or "").split("\n"):
            kasten = para.startswith("☐")   # Ankreuzfeld: Kästchen zeichnen (die Schrift hat das Zeichen nicht)
            x0 = L + (12 if kasten else 0)
            for i, z in enumerate(simpleSplit(para[1:].strip() if kasten else para, font, size, R - x0) or [""]):
                platz(size * abstand); cv.setFont(font, size); cv.setFillColorRGB(0.1, 0.1, 0.1)
                if kasten and not i:
                    cv.setLineWidth(0.7); cv.rect(L, y[0] - 1, 8, 8)
                cv.drawString(x0, y[0], z); y[0] -= size * abstand
        y[0] -= nach

    schreib(titel, "Helvetica-Bold", 14, nach=2)
    if unterzeile:
        schreib(unterzeile, size=9, nach=8)
    for t, inhalt in teile:
        platz(40)
        if t:
            schreib(t.upper(), "Helvetica-Bold", 8.5, nach=1)
        schreib(inhalt, nach=7)
    if unterschrift:
        platz(70); y[0] -= 34
        breite = (R - L - 20 * mm) / 2
        for i, t in enumerate(unterschrift[:2]):
            x = L + i * (breite + 20 * mm)
            cv.setLineWidth(0.6); cv.line(x, y[0], x + breite, y[0])
            cv.setFont("Helvetica", 7.5); cv.setFillColorRGB(0.4, 0.4, 0.4); cv.drawString(x, y[0] - 10, t)
        y[0] -= 24
    if fuss:
        cv.setFont("Helvetica-Oblique", 7); cv.setFillColorRGB(0.55, 0.3, 0.1); cv.drawString(L, unten - 10, fuss[:150])
    cv.showPage(); cv.save()
    out = buf.getvalue()
    return briefbogen.unterlegen(out, bogen, 0) if bogen else out


def pdf(c, uid):
    r = c.execute("SELECT u.name, u.vorname, u.nachname, COALESCE(ro.name, '') AS rolle FROM users u LEFT JOIN rollen ro ON ro.key=u.rolle WHERE u.id=?", (uid,)).fetchone()
    if not r:
        raise LookupError("Person nicht gefunden.")
    name = " ".join(x for x in ((r["vorname"] or ""), (r["nachname"] or "")) if x) or r["name"]
    t, std = text(c)
    P = platzhalter(c)
    teile = [(a, fuellen(b, P)) for a, b in abschnitte(t)]
    teile.append(("", "Ich habe diese Hinweise erhalten und zur Kenntnis genommen. Die angekreuzten Einwilligungen erteile ich freiwillig."))
    unter = f"{P['buero']} · für: {name}" + (f" · Rolle: {r['rolle']}" if r["rolle"] else "")
    return blatt(c, "Datenschutzhinweise und Einwilligung", unter, teile, ["Ort, Datum", f"Unterschrift {name}"], HINWEIS_ENTWURF if std else "")


# ---------- Stand je Person (users.extra) ----------
def _extra(c, uid):
    r = c.execute("SELECT extra FROM users WHERE id=?", (uid,)).fetchone()
    try:
        return json.loads((r and r["extra"]) or "{}") or {}
    except ValueError:
        return {}


def _merken(c, uid, **kw):
    ex = _extra(c, uid)
    e = {**(ex.get("einwilligung") or {}), **kw}
    ex["einwilligung"] = {k: v for k, v in e.items() if v}
    c.execute("UPDATE users SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), uid))
    return ex["einwilligung"]


def gedruckt(c, uid):
    e = (_extra(c, uid).get("einwilligung") or {})
    return e if e.get("gedruckt") else _merken(c, uid, gedruckt=date.today().isoformat())


def zurueck(c, uid, datei=""):
    return _merken(c, uid, zurueck=date.today().isoformat(), datei=str(datei or "")[:300])


def stand(extra, heute=None):
    """{offen, rot, gedruckt, zurueck, tage} aus users.extra – rot erst 14 Tage nach dem Druck (sonst wären alle älteren Konten auf einmal rot)."""
    e = ((extra or {}).get("einwilligung") or {})
    if e.get("zurueck"):
        return {"offen": False, "rot": False, "zurueck": e["zurueck"], "gedruckt": e.get("gedruckt", ""), "datei": e.get("datei", "")}
    ab = (e.get("gedruckt") or "")[:10]
    try:
        tage = ((heute or date.today()) - date.fromisoformat(ab)).days if ab else 0
    except ValueError:
        tage = 0
    return {"offen": True, "rot": tage >= ROT_NACH, "gedruckt": e.get("gedruckt", ""), "zurueck": "", "tage": tage}


def offen(c):
    """Gedruckte Blätter, die noch nicht unterschrieben in der Akte liegen – To-do für das Recht „Personal“ (fällig 14 Tage nach dem Druck)."""
    from datetime import timedelta
    out = []
    for r in c.execute("SELECT u.id, u.name, u.vorname, u.nachname, u.extra FROM users u LEFT JOIN personal_person p ON p.user_id=u.id "
                       "WHERE u.active=1 AND COALESCE(p.personal, 1)=1 AND u.extra LIKE '%einwilligung%'").fetchall():
        try:
            e = (json.loads(r["extra"] or "{}") or {}).get("einwilligung") or {}
        except ValueError:
            continue
        if e.get("gedruckt") and not e.get("zurueck"):
            name = " ".join(x for x in ((r["vorname"] or ""), (r["nachname"] or "")) if x) or r["name"]
            bis = (date.fromisoformat(e["gedruckt"][:10]) + timedelta(days=ROT_NACH)).isoformat()
            out.append({"id": r["id"], "name": name, "gedruckt": e["gedruckt"], "bis": bis})
    return out
