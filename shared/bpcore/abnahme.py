"""Abnahme einer Bauleistung (Kommunikation → ＋ → Abnahme): Niederschrift, Mängelblatt, Fotos und Unterschriften vor Ort.

Gespeichert als Vorgang der Art „abnahme“ in kom_vorgang (Spalten daten, status, bezug – bpcore/migrationen/0042_abnahme.sql),
Fotos der Mängel und das fertige PDF in kom_datei. Nach dem Unterschreiben ist die Abnahme gesperrt; was danach dazukommt,
wird ein Nachtrag (eigener Vorgang mit bezug = Abnahme, eigene Unterschriften).

Vorlage: Abnahmeniederschrift des Büros (Text der Erklärungen wörtlich, nicht Zutreffendes erscheint nicht).
"""
import base64, copy, hashlib, io, json, re
from datetime import date, datetime, timedelta

ROLLEN = (("ag", "Auftraggeber"), ("an", "Auftragnehmer"), ("arch", "Architekt/Ingenieur"))
# Erklärungen „für den Architekten/Ingenieur“ – Reihenfolge wie in der Niederschrift
ERKL = (("keine", "Nach Besichtigung wurden keine Mängel festgestellt."),
        ("liste", "Die festgestellten Mängel sind in der anliegenden Mängelliste enthalten."),
        ("abgenommen", "Die Leistungen werden abgenommen."),
        ("verweigert", "Die Abnahme wird wegen wesentlicher Mängel verweigert."),
        ("vorbehalt", "Der Auftraggeber behält sich seine Rechte wegen der festgestellten Mängel vor."))
FRIST_SATZ = ("Der Auftraggeber verlangt die Beseitigung der festgestellten Mängel laut Mängelliste bis zum {frist}. "
              "Falls die aufgeführten Mängel nicht bis zum angegebenen Termin beseitigt sein werden, wird der Auftraggeber "
              "die Mängelbeseitigung auf Kosten des Auftragnehmers durch einen Dritten veranlassen.")
PNG_MAX = 400 * 1024
MAX_MAENGEL = 200


def leer(heute=None):
    """Neue Abnahme: Datum heute, Gewährleistung 4 Jahre (VOB/B § 13 Abs. 4)."""
    h = (heute or date.today()).isoformat()
    return {"firma": "", "contact_id": None, "firma_adresse": "", "lv_id": None, "arbeiten": "", "auftrag_vom": "", "abnahme_am": h,
            "teilnehmer": {"ag": "", "arch": "", "an": ""}, "maengel": [],
            "erkl": {"keine": False, "liste": False, "abgenommen": True, "verweigert": False, "vorbehalt": False},
            "frist": "", "gw_jahre": 4, "an_erklaerung": "", "unterschriften": {}, "ort": ""}


def _s(v, n):
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", str(v if v is not None else ""))[:n].strip()


def _datum(v):
    v = _s(v, 10)
    try:
        return date.fromisoformat(v).isoformat() if v else ""
    except ValueError:
        return ""


def _png(v):
    """Unterschrift als PNG (data:-URL) – nur echte, nicht zu große PNG-Bilder."""
    m = re.match(r"^data:image/png;base64,([A-Za-z0-9+/=]+)$", v or "")
    if not m or len(m.group(1)) > PNG_MAX * 4 // 3 + 8:
        return ""
    try:
        roh = base64.b64decode(m.group(1), validate=True)
    except ValueError:
        return ""
    return v if roh[:8] == b"\x89PNG\r\n\x1a\n" else ""


def sauber(d, alt=None):
    """Eingaben des Browsers prüfen und auf bekannte Felder begrenzen (Unbekanntes fällt weg)."""
    d = d if isinstance(d, dict) else {}
    a = alt or leer()
    o = copy.deepcopy(a)
    for k, n in (("firma", 200), ("firma_adresse", 300), ("arbeiten", 200), ("an_erklaerung", 3000), ("ort", 200)):
        if k in d:
            o[k] = _s(d[k], n)
    for k in ("auftrag_vom", "abnahme_am", "frist"):
        if k in d:
            o[k] = _datum(d[k])
    for k in ("contact_id", "lv_id"):
        if k in d:
            o[k] = d[k] if isinstance(d[k], int) and not isinstance(d[k], bool) else None
    if "gw_jahre" in d:
        try:
            o["gw_jahre"] = max(0, min(30, int(d["gw_jahre"])))
        except (TypeError, ValueError):
            pass
    if isinstance(d.get("teilnehmer"), dict):
        o["teilnehmer"] = {r: _s(d["teilnehmer"].get(r), 120) for r, _ in ROLLEN}
    if isinstance(d.get("erkl"), dict):
        o["erkl"] = {k: bool(d["erkl"].get(k)) for k, _ in ERKL}
    if isinstance(d.get("maengel"), list):
        L = []
        for m in d["maengel"][:MAX_MAENGEL]:
            if not isinstance(m, dict):
                continue
            t = _s(m.get("text"), 1000)
            if not t:
                continue
            L.append({"id": _s(m.get("id"), 20) or hashlib.sha1(t.encode()).hexdigest()[:8], "text": t, "ort": _s(m.get("ort"), 200),
                      "fotos": [int(x) for x in (m.get("fotos") or []) if isinstance(x, int) and not isinstance(x, bool)][:6],
                      "item_id": m.get("item_id") if isinstance(m.get("item_id"), int) else None})
        o["maengel"] = L
    if isinstance(d.get("unterschriften"), dict):
        U = {}
        for r, _ in ROLLEN:
            u = d["unterschriften"].get(r)
            if not isinstance(u, dict):
                continue
            if u.get("fehlt"):
                U[r] = {"fehlt": True, "name": _s(u.get("name"), 120), "zeit": _s(u.get("zeit"), 25)}
            elif _png(u.get("png")):
                U[r] = {"png": u["png"], "name": _s(u.get("name"), 120), "zeit": _s(u.get("zeit"), 25)}
        o["unterschriften"] = U
    e = o["erkl"]   # was sich ausschließt: keine Mängel ↔ Mängelliste, abgenommen ↔ verweigert
    if e.get("keine") and e.get("liste"):
        e["keine"] = False
    if e.get("abgenommen") and e.get("verweigert"):
        e["verweigert"] = False
    return o


def gewaehrleistung(d):
    """(Beginn, Ende) als ISO-Datum – Beginn am Tag nach der Abnahme, Ende nach gw_jahre (wie in der Niederschrift: 13.07.2026 → 14.07.2026 bis 13.07.2030)."""
    try:
        a = date.fromisoformat(d.get("abnahme_am") or "")
    except ValueError:
        return "", ""
    if not d.get("erkl", {}).get("abgenommen") or not d.get("gw_jahre"):
        return "", ""
    j = int(d["gw_jahre"])
    try:
        ende = a.replace(year=a.year + j)
    except ValueError:   # 29. Februar
        ende = a.replace(year=a.year + j, day=28)
    return (a + timedelta(days=1)).isoformat(), ende.isoformat()


def fehlt_noch(d):
    """Was vor dem Unterschreiben noch fehlt – Liste von Texten (leer = bereit)."""
    f = []
    if not d.get("firma"):
        f.append("Auftragnehmer (Firma)")
    if not d.get("abnahme_am"):
        f.append("Datum der Abnahme")
    e = d.get("erkl") or {}
    if not (e.get("abgenommen") or e.get("verweigert")):
        f.append("Erklärung: abgenommen oder verweigert")
    if d.get("maengel") and e.get("keine"):
        f.append("„keine Mängel“ passt nicht zu den eingetragenen Mängeln")
    if not d.get("maengel") and e.get("liste"):
        f.append("Mängelliste ist leer")
    return f


def unterschrieben_alle(d):
    U = d.get("unterschriften") or {}
    return all(r in U for r, _ in ROLLEN) and any(not U[r].get("fehlt") for r, _ in ROLLEN)


def pruefsumme(d):
    """SHA-256 über den Inhalt samt Unterschriften – steht klein im PDF, damit Änderungen danach auffallen."""
    return hashlib.sha256(json.dumps(d, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def datum_de(iso):
    try:
        return date.fromisoformat((iso or "")[:10]).strftime("%d.%m.%Y")
    except ValueError:
        return iso or ""


def _monat_de(iso):
    M = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
    try:
        d = date.fromisoformat(iso[:10])
        return f"{d.day}. {M[d.month - 1]} {d.year}"
    except (TypeError, ValueError):
        return iso or ""


def vorlage(c, pid, user_name, buero_kurz):
    """Vorschläge für eine neue Abnahme: Aufträge der AVA (Firma, Arbeiten, Auftragsdatum), Auftraggeber, Architekt, offene Mängel je Firma."""
    from . import stammdaten
    P = stammdaten.projekt_lesen(c, pid) if pid else {}
    auftraege = []
    for r in c.execute("""SELECT id, nr, name, gewerk, vergabe FROM ava_lv WHERE project_id=? AND archived=0
                          AND (version_id IS NULL OR version_id IN (SELECT id FROM ava_version WHERE aktiv=1)) ORDER BY nr, id""", (pid,)).fetchall():
        try:
            v = json.loads(r["vergabe"] or "{}")
        except ValueError:
            v = {}
        firma = (v.get("bieter") or v.get("auftragnehmer") or "").strip()
        if not firma:
            continue
        k = None
        if isinstance(v.get("contact_id"), int):
            k = c.execute("SELECT * FROM contacts WHERE id=?", (v["contact_id"],)).fetchone()
        if k is None:
            k = c.execute("SELECT * FROM contacts WHERE lower(name)=?", (firma.lower(),)).fetchone()
        adr = ", ".join(x for x in ((k["street"] or "").strip(), " ".join(y for y in ((k["zip"] or "").strip(), (k["city"] or "").strip()) if y)) if x) if k else ""
        auftraege.append({"lv_id": r["id"], "firma": firma, "contact_id": k["id"] if k else None, "firma_adresse": adr,
                          "arbeiten": (r["gewerk"] or r["name"] or "").strip(), "lv": " ".join(x for x in (r["nr"], r["name"]) if x),
                          "auftrag_vom": ((v.get("auftrag") or {}).get("auftragsdatum") or v.get("datum") or "")[:10],
                          "abnahme": ((v.get("sicherheit") or {}).get("abnahme") or "")[:10], "ansprech": (k["contact_person"] or "") if k else ""})
    maengel = [{"item_id": x["id"], "text": x["text"] or "", "firma": x["company"] or x["cname"] or "", "frist": x["due"] or ""}
               for x in c.execute("""SELECT i.id, i.text, i.company, i.due, ct.name AS cname FROM items i JOIN reports r ON r.id=i.report_id
                                     LEFT JOIN contacts ct ON ct.id=i.contact_id WHERE r.project_id=? AND i.kind='maengel' AND i.done=0 ORDER BY i.id""", (pid,)).fetchall()]
    ag = P.get("bh_ansprech") or P.get("bh_vertreter") or ""
    return {"auftraege": auftraege, "maengel": maengel, "auftraggeber": P.get("bauherr") or "", "ag_person": ag,
            "architekt": f"{user_name} ({buero_kurz})" if buero_kurz else user_name, "personen": personen(c, pid, user_name, P)}


def personen(c, pid, user_name="", P=None):
    """Vorschläge für Teilnehmer und Unterschriften je Rolle: [{name, sub}] – Bauherr: Ansprechpartner, Vertreter (und deren Ansprechpartner
    aus den Adressen); Architekt: ich und die Bauleitung des Projekts; Auftragnehmer: Ansprechpartner der beauftragten Firmen."""
    from . import stammdaten
    P = P if P is not None else (stammdaten.projekt_lesen(c, pid) if pid else {})
    out = {"ag": [], "arch": [], "an": []}

    def dazu(r, name, sub=""):
        name = (name or "").strip()
        if name and not any(x["name"].lower() == name.lower() for x in out[r]):
            out[r].append({"name": name[:120], "sub": (sub or "")[:80]})

    def kontakt(kid):
        return c.execute("SELECT name, contact_person FROM contacts WHERE id=?", (kid,)).fetchone() if isinstance(kid, int) else None
    for key, sub in (("bh_ansprech", "Ansprechpartner Bauherr"), ("bh_vertreter", "Bauherrenvertreter"), ("bauherr", "Bauherr")):
        k = kontakt(P.get(key + "_kid"))
        if k is not None and (k["contact_person"] or "").strip():
            dazu("ag", k["contact_person"], f"{sub} · {k['name']}")
        if key != "bauherr":
            dazu("ag", P.get(key), sub)
    dazu("arch", user_name, "ich")
    try:
        r = c.execute("SELECT leaders FROM projects WHERE id=?", (pid,)).fetchone()
        ids = [i for i in json.loads((r["leaders"] if r else "") or "[]") if isinstance(i, int)]
        for u in c.execute("SELECT name, vorname, nachname FROM users WHERE id IN (" + ",".join("?" * len(ids)) + ")", ids).fetchall() if ids else []:
            dazu("arch", " ".join(x for x in ((u["vorname"] if "vorname" in u.keys() else ""), (u["nachname"] if "nachname" in u.keys() else "")) if x) or u["name"], "Bauleitung")
    except Exception:   # Bauleitung ist nur ein Vorschlag
        pass
    for r in c.execute("SELECT vergabe FROM ava_lv WHERE project_id=? AND archived=0", (pid,)).fetchall():
        try:
            v = json.loads(r["vergabe"] or "{}")
        except ValueError:
            continue
        k = kontakt(v.get("contact_id")) if isinstance(v, dict) else None
        if k is not None:
            dazu("an", k["contact_person"], k["name"])
    return out


def _bild(png_url):
    from reportlab.lib.utils import ImageReader
    try:
        return ImageReader(io.BytesIO(base64.b64decode(png_url.split(",", 1)[1])))
    except Exception:   # noqa: BLE001 – kaputte Unterschrift: Feld bleibt leer
        return None


def pdf(c, v, d, projekt, fotos, entwurf=False):
    """Niederschrift (Seite 1), Mängelblatt (Seite 2, wenn Mängel) und Fotos (ab Seite 3) – auf dem Briefbogen des Büros.
    v: Vorgang (Zeile), d: Daten der Abnahme, fotos: {datei_id: (name, mime, bytes)}."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader, simpleSplit
    from reportlab.pdfgen import canvas
    from . import briefbogen, stammdaten, vorgang
    S = {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings WHERE key='office_name' OR key LIKE 'co\\_%'")}
    P = stammdaten.projekt_lesen(c, v["project_id"]) if v.get("project_id") else {}
    bogen = briefbogen.holen(c)
    RD = briefbogen.raender(bogen) if bogen else None
    W, H = A4
    L = max(RD["links"], 25 * mm) if RD else 25 * mm
    R = W - (max(RD["rechts"], 10 * mm) if RD else 20 * mm)
    oben = H - ((RD["kopf"] + 10 * mm) if RD and RD.get("kopf") else 28 * mm)
    unten = (RD["fuss"] + 8 * mm) if RD else 20 * mm
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    nachtrag = bool(v.get("bezug"))
    titel = "Nachtrag zur Abnahmeniederschrift" if nachtrag else "Abnahmeniederschrift zur technischen Abnahme einer Bauleistung"
    cv.setTitle(f"{titel} – {d.get('firma') or ''}")
    cv.setAuthor(S.get("office_name") or "")
    y = [oben]
    seiten = [1]
    ink = (0.1, 0.1, 0.1)

    def neue_seite():
        if entwurf:
            _entwurf()
        cv.showPage(); seiten[0] += 1; y[0] = oben

    def _entwurf():
        cv.saveState(); cv.setFont("Helvetica-Bold", 60); cv.setFillColorRGB(0.85, 0.85, 0.85)
        cv.translate(W / 2, H / 2); cv.rotate(35); cv.drawCentredString(0, 0, "ENTWURF"); cv.restoreState()

    def text(t, font="Helvetica", size=10, abstand=1.35, x=None, breite=None, farbe=ink):
        x = L if x is None else x
        cv.setFont(font, size); cv.setFillColorRGB(*farbe)
        for para in (t or "").split("\n"):
            for z in simpleSplit(para, font, size, breite or (R - x)) or [""]:
                if y[0] < unten + size:
                    neue_seite(); cv.setFont(font, size); cv.setFillColorRGB(*farbe)
                cv.drawString(x, y[0], z); y[0] -= size * abstand

    def kopf():
        """Anschrift der Firma, Datum, Projekt – auf Niederschrift und Mängelblatt gleich."""
        y0 = y[0]
        text("Fa.\n" + (d.get("firma") or "") + ("\n" + d["firma_adresse"].replace(", ", "\n") if d.get("firma_adresse") else ""), size=10.5)
        cv.setFont("Helvetica", 10.5); cv.drawRightString(R, y0 - 70, datum_de(d.get("abnahme_am")))
        y[0] = min(y[0], y0 - 80) - 6
        k = vorgang.kuerzel(projekt)
        bv = projekt[len(k):].strip(" ,") if k else projekt
        for a, b in (("Projekt-Nr.:", k), ("Bauvorhaben:", bv + (f" – {P.get('beschreibung')}" if P.get("beschreibung") else "")), ("Auftraggeber:", P.get("bauherr") or "")):
            if b:
                cv.setFont("Helvetica-Bold", 9.5); cv.drawString(L, y[0], a)
                yy = y[0]
                text(b, "Helvetica-Bold", 9.5, x=L + 25 * mm)
                y[0] = min(y[0], yy - 12)
        y[0] -= 8
        cv.setFont("Helvetica-Bold", 11.5); cv.drawString(L, y[0], titel)
        cv.setLineWidth(0.7); cv.line(L, y[0] - 2, L + cv.stringWidth(titel, "Helvetica-Bold", 11.5), y[0] - 2)
        y[0] -= 16
        if nachtrag:
            text(f"zur Abnahme vom {datum_de(d.get('bezug_datum') or '')}", size=10.5)
        if d.get("auftrag_vom"):
            text(f"Auftrag vom: {_monat_de(d['auftrag_vom'])}", size=10.5)
        if d.get("arbeiten"):
            text(f"Arbeiten: {d['arbeiten']}", size=10.5)
        text("Auftragnehmer: " + ", ".join(x for x in (d.get("firma"), d.get("firma_adresse")) if x), size=10.5)

    def unterschriften(fuss_text=True):
        U = d.get("unterschriften") or {}
        hoehe = 30 * mm
        if y[0] - hoehe < unten:
            neue_seite()
        y[0] -= 6
        text("Unterschriften:", size=10.5)
        bw = (R - L - 10 * mm) / 3
        for i, (r, name) in enumerate(ROLLEN):
            x = L + i * (bw + 5 * mm)
            u = U.get(r) or {}
            base = y[0] - 18 * mm
            if u.get("png"):
                ir = _bild(u["png"])
                if ir:
                    iw, ih = ir.getSize()
                    hh = min(16 * mm, bw * ih / max(1, iw)); ww = hh * iw / max(1, ih)
                    cv.drawImage(ir, x, base + 1, ww, hh, mask="auto")
            elif u.get("fehlt"):
                cv.setFont("Helvetica-Oblique", 9); cv.setFillColorRGB(0.4, 0.4, 0.4); cv.drawString(x + 2, base + 5, "nicht anwesend")
            cv.setStrokeColorRGB(0.3, 0.3, 0.3); cv.setDash(1, 2); cv.line(x, base, x + bw, base); cv.setDash()
            cv.setFont("Helvetica", 8.5); cv.setFillColorRGB(*ink)
            cv.drawString(x, base - 10, name)
            wer = (u.get("name") or (d.get("teilnehmer") or {}).get(r) or "").strip()   # Name klein darunter
            if wer:
                cv.setFont("Helvetica", 7.5); cv.setFillColorRGB(0.4, 0.4, 0.4)
                while wer and cv.stringWidth(wer, "Helvetica", 7.5) > bw:
                    wer = wer[:-2] + "…" if len(wer) > 2 else ""
                cv.drawString(x, base - 20, wer); cv.setFillColorRGB(*ink)
        y[0] -= 18 * mm + 34
        if fuss_text and v.get("unterschrieben"):
            zeiten = sorted(u.get("zeit") or "" for u in U.values() if u.get("zeit"))
            t = f"Elektronisch unterschrieben am {datum_de(zeiten[0][:10]) if zeiten else ''}"
            if zeiten:
                t += f", {zeiten[0][11:16]}–{zeiten[-1][11:16]} Uhr"
            if d.get("ort"):
                t += f", {d['ort']}"
            t += f" · Prüfsumme {v.get('pruefsumme', '')[:16]}…"
            text(t, size=7, farbe=(0.45, 0.45, 0.45))

    # ---- Seite 1: Niederschrift
    kopf()
    y[0] -= 4
    text("Teilnehmer", "Helvetica-Bold", 10.5)
    T = d.get("teilnehmer") or {}
    for r, lab in (("ag", "für den Auftraggeber"), ("arch", "für den Architekten"), ("an", "für den Auftragnehmer")):
        text(f"{lab}: {T.get(r) or '—'}", size=10.5)
    y[0] -= 8
    text("für den Architekten/Ingenieur:", size=10.5)
    y[0] -= 2
    e = d.get("erkl") or {}
    satz = [t for k, t in ERKL if e.get(k)]
    if d.get("frist") and d.get("maengel") and not e.get("keine"):
        satz.append(FRIST_SATZ.format(frist=datum_de(d["frist"])))
    text("\n".join(satz), size=9.5)
    if d.get("maengel"):
        y[0] -= 3
        text(f"Mängel, Art und Ortsbezeichnung: siehe Mängelblatt ({len(d['maengel'])} Mängel).", size=9.5)
    y[0] -= 8
    text("Erklärungen des Auftragnehmers zur Nachbesserung:", size=10.5)
    text(d.get("an_erklaerung") or "—", size=9.5)
    b, en = gewaehrleistung(d)
    if b:
        y[0] -= 8
        text(f"Gewährleistungsfrist – Beginn: {datum_de(b)}  Ende: {datum_de(en)}", size=10.5)
    unterschriften()
    # ---- Seite 2: Mängelblatt
    M = d.get("maengel") or []
    if M:
        neue_seite()
        kopf()
        y[0] -= 6
        sp = (L, L + 9 * mm, R - 38 * mm, R - 20 * mm, R)   # Nr | Mangel | Foto | Frist
        def kopfzeile():
            cv.setFillColorRGB(0.94, 0.94, 0.94); cv.rect(L, y[0] - 4, R - L, 14, stroke=0, fill=1)
            cv.setFillColorRGB(*ink); cv.setFont("Helvetica-Bold", 8.5)
            for x, t in zip(sp, ("Nr.", "Mängel, Art und Ortsbezeichnung", "Foto", "Frist")):
                cv.drawString(x + 3, y[0], t)
            y[0] -= 15
        kopfzeile()
        fnr = 0
        for i, m in enumerate(M, 1):
            zeilen = simpleSplit(m["text"] + (f" – {m['ort']}" if m.get("ort") else ""), "Helvetica", 9, sp[2] - sp[1] - 6) or [""]
            hh = max(14, len(zeilen) * 11 + 4)
            if y[0] - hh < unten + 40 * mm and i < len(M):
                neue_seite(); kopfzeile()
            cv.setStrokeColorRGB(0.3, 0.3, 0.3); cv.setLineWidth(0.5)
            cv.rect(L, y[0] - hh + 9, R - L, hh, stroke=1, fill=0)
            for x in sp[1:-1]:
                cv.line(x, y[0] + 9, x, y[0] - hh + 9)
            cv.setFont("Helvetica", 9); cv.setFillColorRGB(*ink)
            cv.drawString(sp[0] + 3, y[0] - 1, str(i))
            for k, z in enumerate(zeilen):
                cv.drawString(sp[1] + 3, y[0] - 1 - k * 11, z)
            nf = [f for f in m.get("fotos") or [] if f in fotos]
            if nf:
                cv.drawString(sp[2] + 3, y[0] - 1, ", ".join(f"F{fnr + j + 1}" for j in range(len(nf)))[:12])
                fnr += len(nf)
            cv.drawString(sp[3] + 3, y[0] - 1, datum_de(d.get("frist"))[:6] if d.get("frist") else "")
            y[0] -= hh
        y[0] -= 4
        if fnr:
            text(f"{len(M)} Mängel · {fnr} Fotos in der Anlage", size=8.5, farbe=(0.4, 0.4, 0.4))
        unterschriften()
    # ---- Fotos
    bilder = []
    for i, m in enumerate(M, 1):
        for f in m.get("fotos") or []:
            if f in fotos and fotos[f][1].startswith("image/"):
                bilder.append((i, m, fotos[f][2]))
    if bilder:
        neue_seite()
        text("Fotos zum Mängelblatt", "Helvetica-Bold", 12)
        y[0] -= 4
        bw = (R - L - 6 * mm) / 2
        x, zh = L, 0
        for n, (i, m, data) in enumerate(bilder, 1):
            try:
                ir = ImageReader(io.BytesIO(data)); iw, ih = ir.getSize()
            except Exception:   # noqa: BLE001 – Bild nicht lesbar: weglassen
                continue
            hh = min(bw * ih / iw, 80 * mm); ww = hh * iw / ih
            if y[0] - hh - 12 < unten:
                neue_seite(); x = L
            cv.drawImage(ir, x, y[0] - hh, ww, hh, mask="auto")
            cv.setFont("Helvetica", 8); cv.setFillColorRGB(*ink)
            cv.drawString(x, y[0] - hh - 10, f"F{n} – Mangel {i}: {m['text'][:60]}")
            if x == L:
                x, zh = L + bw + 6 * mm, hh
            else:
                x = L; y[0] -= max(hh, zh) + 18
    if entwurf:
        _entwurf()
    if not bogen:
        cv.setFont("Helvetica", 7); cv.setFillColorRGB(0.42, 0.42, 0.42)
        fuss = " · ".join(t for t in (S.get("co_short") or S.get("office_name"), S.get("co_street"), " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x)) if t)
        cv.drawCentredString(W / 2, 10 * mm, fuss[:180])
    cv.save()
    out = buf.getvalue()
    return briefbogen.unterlegen(out, bogen, 0) if bogen else out


def dateiname(d, projekt):
    """„A481 Abnahme Tischlerei Muster 2026-07-13.pdf“"""
    from . import vorgang
    k = vorgang.kuerzel(projekt)
    n = " ".join(x for x in (k, "Abnahme", d.get("firma") or "", d.get("abnahme_am") or "") if x)
    return re.sub(r'[\\/:*?"<>|]+', "-", re.sub(r"\s+", " ", n)).strip()[:140] + ".pdf"


def folgen(c, u, v, d):
    """Was nach dem Unterschreiben automatisch passiert: Abnahmedatum in die AVA (Sicherheiten/Schlussrechnung), Mängel als
    Aufgabe mit Frist, Gewährleistungsende als Erinnerung. Gibt eine Liste kurzer Texte zurück (für die Meldung)."""
    from . import vorgang
    out = []
    pid = v["project_id"]
    e = d.get("erkl") or {}
    if d.get("lv_id") and e.get("abgenommen") and d.get("abnahme_am"):
        r = c.execute("SELECT vergabe FROM ava_lv WHERE id=? AND project_id=?", (d["lv_id"], pid)).fetchone()
        if r:
            try:
                vg = json.loads(r["vergabe"] or "{}")
            except ValueError:
                vg = {}
            si = vg.setdefault("sicherheit", {})
            if si.get("abnahme") != d["abnahme_am"]:
                si["abnahme"] = d["abnahme_am"]
                if d.get("gw_jahre"):
                    si["gw_jahre"] = d["gw_jahre"]
                c.execute("UPDATE ava_lv SET vergabe=?, updated=?, updated_by=? WHERE id=?",
                          (json.dumps(vg, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), u["name"], d["lv_id"]))
                out.append(f"Abnahme am {datum_de(d['abnahme_am'])} in der Ausschreibung eingetragen")
    M = d.get("maengel") or []
    if M and d.get("frist"):
        titel = f"Mängel aus der Abnahme beseitigen: {d.get('firma') or ''} ({len(M)})"
        notiz = "\n".join(f"{i}. {m['text']}" + (f" – {m['ort']}" if m.get("ort") else "") for i, m in enumerate(M, 1))
        vorgang.frist_todo(c, u, pid, titel, d["frist"], notiz + f"\n\nAus der Abnahme vom {datum_de(d.get('abnahme_am'))} (Kommunikation)")
        out.append(f"{len(M)} Mängel als Aufgabe mit Frist {datum_de(d['frist'])}")
    b, en = gewaehrleistung(d)
    if en:
        vor = (date.fromisoformat(en) - timedelta(days=90)).isoformat()
        if vor > date.today().isoformat():
            vorgang.frist_todo(c, u, pid, f"Gewährleistung {d.get('firma') or ''} endet am {datum_de(en)} – Mängel vorher rügen", vor,
                               f"Abnahme vom {datum_de(d.get('abnahme_am'))}, Gewährleistung {d.get('gw_jahre')} Jahre (Kommunikation)")
            out.append(f"Erinnerung drei Monate vor Ende der Gewährleistung ({datum_de(en)})")
    return out
