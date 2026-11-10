"""Kommunikation von der Baustelle: Nachrichten an Beteiligte und Vorgänge (Telefon-, Gesprächs-, Aktennotiz, Anordnung …).

Vorgänge stehen in kom_vorgang, Fotos und Dateien in kom_datei (bpcore/migrationen/0036_vorgang.sql). Was verschickt wird, kommt wie alle
Sendungen in den Benachrichtigungsverlauf (benachrichtigung.protokoll, art „nachricht“ bzw. „vorgang“).
"""
import io, json, re
from datetime import date, datetime

ARTEN = {   # Schlüssel: (Name, Symbol, Mustertext für die Mail/das PDF – {firma} {projekt} {frist} werden eingesetzt)
    "telefon": ("Telefonnotiz", "📞", ""),
    "gespraech": ("Gesprächsnotiz", "🗣", ""),
    "akten": ("Aktennotiz", "📄", ""),
    "anordnung": ("Anordnung", "☝", "zum Bauvorhaben {projekt} ordnen wir Folgendes an (§ 4 Abs. 1 Nr. 3 VOB/B):"),
    "behinderung": ("Behinderung (§ 6 VOB/B)", "⚠", "zum Bauvorhaben {projekt} halten wir folgende Behinderung des Bauablaufs fest:"),
    "bedenken": ("Bedenken (§ 4 Abs. 3 VOB/B)", "❗", "zum Bauvorhaben {projekt} halten wir folgende Bedenken gegen die vorgesehene Art der Ausführung fest:"),
    "begehung": ("Begehung / Abnahme", "🔍", "anbei das Protokoll der Begehung zum Bauvorhaben {projekt}:"),
    "sonst": ("Sonstiges", "✓", ""),
}
ERLAUBT = re.compile(r"^(image/(jpeg|png|gif|webp|heic|heif)|application/pdf|application/(msword|vnd\.openxmlformats-officedocument\.[\w.]+|vnd\.ms-excel)|text/plain)$")
MAX_DATEI, MAX_SUMME, MAX_ANZAHL = 15 * 1024 * 1024, 25 * 1024 * 1024, 12


def kuerzel(name):
    """Projektkürzel aus dem Namen („A541 Schürmannstr. 4“ → „A541“), sonst leer."""
    k = ((name or "").split() or [""])[0].rstrip(".,:")
    return k if re.match(r"^[A-Za-z]{1,4}\d{2,6}$", k) else ""


def betreff_mit_kuerzel(betreff, projektname):
    """[A541] vor den Betreff – so ordnet der Posteingang die Antwort demselben Projekt zu."""
    k = kuerzel(projektname)
    b = re.sub(r"\s+", " ", betreff or "").strip()[:200]
    if k and not re.search(r"\b" + re.escape(k) + r"\b", b, re.I):
        b = f"[{k}] {b}"
    return b


def sieht(c, u, pid):
    """Darf der Benutzer das Projekt sehen? (wie überall: eingetragene Bauleiter, sonst alle; Admin immer)"""
    if not pid:
        return True
    p = c.execute("SELECT leaders FROM projects WHERE id=?", (pid,)).fetchone()
    if not p:
        return False
    try:
        lead = [int(x) for x in json.loads(p["leaders"] or "[]") if str(x).isdigit()]
    except (ValueError, TypeError):
        lead = []
    return not lead or bool(u["is_admin"]) or u["id"] in lead


def dateien_pruefen(files):
    """[(name, mime, bytes)] aus hochgeladenen Dateien – Größe, Anzahl und Art geprüft. Fehlertext oder None."""
    out, summe = [], 0
    for f in files[:MAX_ANZAHL + 1]:
        if len(out) >= MAX_ANZAHL:
            return None, f"Höchstens {MAX_ANZAHL} Dateien auf einmal."
        data = f.read(MAX_DATEI + 1)
        name = re.sub(r"[\\/:*?\"<>|\r\n]+", "_", f.filename or "datei")[:120]
        mime = (f.mimetype or "application/octet-stream").lower()
        if mime == "application/octet-stream" and name.lower().endswith((".jpg", ".jpeg")):
            mime = "image/jpeg"
        if not data:
            continue
        if len(data) > MAX_DATEI:
            return None, f"„{name}“ ist größer als 15 MB."
        if not ERLAUBT.match(mime):
            return None, f"„{name}“: diese Dateiart geht hier nicht (Fotos, PDF, Word, Excel, Text)."
        summe += len(data)
        if summe > MAX_SUMME:
            return None, "Zusammen mehr als 25 MB – bitte weniger oder kleinere Dateien."
        out.append((name, mime, data))
    return out, None


def frist_todo(c, u, pid, titel, frist, notiz=""):
    """Frist eines Vorgangs als To-do (wichtig, mit Erinnerung am Fristtag) – für den Benutzer und, je nach Einstellung, die Bauleitung."""
    from . import erinnern, skizze
    jetzt = datetime.now().isoformat(timespec="seconds")
    leute = [x for x in erinnern.empfaenger(c, u["id"], pid) if x != u["id"]] if pid else []
    r = c.execute("""INSERT INTO todo(titel, notiz, project_id, faellig, prio, personen, mail, erinnerung, status, erstellt, erstellt_von, erstellt_name, geaendert)
                     VALUES(?,?,?,?,1,?,0,?,'offen',?,?,?,?) RETURNING id""",
                  (titel[:200], notiz[:2000], pid, frist, json.dumps(leute), frist, jetzt, u["id"], skizze.name_von(u), jetzt)).fetchone()
    return r["id"]


def datum_de(iso):
    try:
        return date.fromisoformat(iso[:10]).strftime("%d.%m.%Y")
    except (TypeError, ValueError):
        return iso or ""


def pdf(c, v, projekt, fotos, absender_name):
    """Vorgang als PDF (A4, auf dem Briefbogen des Büros, falls hinterlegt): Kopf, Text, Frist, Fotos."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader, simpleSplit
    from reportlab.pdfgen import canvas
    from . import briefbogen
    S = {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings WHERE key='office_name' OR key LIKE 'co\\_%'")}
    bogen = briefbogen.holen(c)
    RD = briefbogen.raender(bogen) if bogen else None
    W, H = A4
    L = max(RD["links"], 25 * mm) if RD else 25 * mm
    R = W - (max(RD["rechts"], 10 * mm) if RD else 20 * mm)
    oben = H - ((RD["kopf"] + 12 * mm) if RD and RD.get("kopf") else 30 * mm)
    unten = (RD["fuss"] + 8 * mm) if RD else 20 * mm
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    name, sym, _ = ARTEN.get(v["art"], ARTEN["sonst"])
    cv.setTitle(f"{name} – {projekt}")
    cv.setAuthor(S.get("office_name") or absender_name)
    y = [oben]
    seite = [1]

    def neue_seite():
        cv.showPage(); seite[0] += 1; y[0] = oben

    def zeilen(text, font="Helvetica", size=10, abstand=1.35, farbe=(0.12, 0.12, 0.12)):
        cv.setFont(font, size); cv.setFillColorRGB(*farbe)
        for para in (text or "").split("\n"):
            for z in simpleSplit(para, font, size, R - L) or [""]:
                if y[0] < unten + size:
                    neue_seite(); cv.setFont(font, size); cv.setFillColorRGB(*farbe)
                cv.drawString(L, y[0], z); y[0] -= size * abstand
    zeilen(name, "Helvetica-Bold", 15)
    y[0] -= 2
    zeilen(f"Bauvorhaben: {projekt}", size=10, farbe=(0.35, 0.35, 0.35))
    zeit = (v.get("zeit") or "")[:16].replace("T", " ")
    zeit_de = f"{datum_de(zeit)} {zeit[11:16]} Uhr".strip() if zeit else ""
    kopf = [("Datum", zeit_de), ("Beteiligte", v.get("beteiligte") or ""), ("Ort", v.get("ort") or ""), ("Aufgenommen von", absender_name)]
    y[0] -= 4
    for k, t in kopf:
        if t:
            cv.setFont("Helvetica-Bold", 9.5); cv.setFillColorRGB(0.35, 0.35, 0.35); cv.drawString(L, y[0], k)
            cv.setFont("Helvetica", 9.5); cv.setFillColorRGB(0.12, 0.12, 0.12)
            for i, z in enumerate(simpleSplit(t, "Helvetica", 9.5, R - L - 35 * mm)):
                cv.drawString(L + 35 * mm, y[0], z); y[0] -= 13
    y[0] -= 8
    if v.get("titel"):
        zeilen(v["titel"], "Helvetica-Bold", 11.5)
        y[0] -= 2
    zeilen(v.get("text") or "", size=10.5)
    if v.get("frist"):
        y[0] -= 6
        zeilen(f"Frist: {datum_de(v['frist'])}", "Helvetica-Bold", 10.5)
    bilder = [(n, d) for n, m, d in fotos if m in ("image/jpeg", "image/png", "image/gif", "image/webp")]
    if bilder:
        y[0] -= 10
        zeilen(f"Fotos ({len(bilder)})", "Helvetica-Bold", 10.5)
        bw = (R - L - 6 * mm) / 2
        x = L
        for i, (n, d) in enumerate(bilder):
            try:
                ir = ImageReader(io.BytesIO(d)); iw, ih = ir.getSize()
            except Exception:   # noqa: BLE001 – Bild nicht lesbar: weglassen
                continue
            hh = min(bw * ih / iw, 95 * mm); ww = hh * iw / ih
            if y[0] - hh < unten:
                neue_seite(); x = L
            cv.drawImage(ir, x, y[0] - hh, ww, hh, mask="auto")
            if x == L:
                x = L + bw + 6 * mm; zeile_h = hh
            else:
                x = L; y[0] -= max(hh, zeile_h) + 6 * mm
        if x != L:
            y[0] -= zeile_h + 6 * mm
    if not bogen:
        cv.setFont("Helvetica", 7); cv.setFillColorRGB(0.42, 0.42, 0.42)
        fuss = " · ".join(t for t in (S.get("co_short") or S.get("office_name"), S.get("co_street"), " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x),
                                      S.get("co_phone"), S.get("co_email")) if t)
        cv.drawCentredString(W / 2, 10 * mm, fuss[:180])
    cv.save()
    out = buf.getvalue()
    return briefbogen.unterlegen(out, bogen, seite[0]) if bogen else out
