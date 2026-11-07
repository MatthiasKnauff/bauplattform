"""Persönliche Einstellungen je Benutzer (alle Apps): Unterschrift, Versand von Rügen, Kalendertermine.

Gespeichert in bp_store: „konto:<id>“ (JSON) und „signatur:<id>“ (PNG, base64).
"""
import base64, io, json

STANDARD = {"versand": "pdf",        # Mängel-/Terminrüge: pdf | mich (an mich zum Weiterleiten) | firma (direkt an die Firma)
            "kopie": True,           # bei „direkt an die Firma“: Kopie an mich
            "kalender": False,       # alt: eigene Erinnerungen als Kalendertermin (ersetzt durch erinnerung_art)
            "erinnerung_art": "",    # Erinnerungen aller Apps: mail (einfache Mail am Tag) | termin (sofort als Termin zum Annehmen); leer = nach „kalender“
            "erinnerung_an": "ich",  # ich | bauleiter (alle Bauleiter des Projekts)
            "mailsignatur": "",      # eigene E-Mail-Signatur mit Platzhaltern; leer = Standard
            "mailsignatur_html": "", # dieselbe als HTML (eingefügt aus Outlook/Word); hat Vorrang
            "telefon": "", "funktion": "",   # für die Signatur
            "pdb_preis": "",         # Preis beim Übernehmen aus den Baudaten: leer = fragen | mittel | von | bis | eigen_median | eigen_neu
            "absender": "buero",     # Absender meiner Mails: buero (Absenderadresse des Büros) | eigen (meine E-Mail-Adresse)
            "hinweise_aus": []}      # Hinweisfenster, die nicht mehr erscheinen sollen (z. B. „baukosten“)
SIG_STANDARD = "{name}\n{funktion}\n{buero}\n{buero_strasse}, {buero_ort}\nTel. {telefon} · {email}\n{buero_web}"
SIG_PLATZ = {"name": "Vor- und Nachname", "vorname": "Vorname", "nachname": "Nachname", "funktion": "Funktion (z. B. Bauleitung)",
             "telefon": "Telefon (eigenes, sonst Büro)", "email": "E-Mail-Adresse", "buero": "Büroname", "buero_strasse": "Straße des Büros",
             "buero_ort": "PLZ und Ort des Büros", "buero_telefon": "Telefon des Büros", "buero_email": "E-Mail des Büros", "buero_web": "Internetseite des Büros"}


def _get(c, key):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (key,)).fetchone()
    return r["data"] if r else None


def _put(c, key, data, by=""):
    from datetime import datetime
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (key, data, datetime.now().isoformat(timespec="seconds"), by))


def prefs(c, uid):
    try:
        v = json.loads(_get(c, f"konto:{uid}") or "{}")
    except ValueError:
        v = {}
    return {**STANDARD, **{k: v[k] for k in STANDARD if k in v}}


def set_prefs(c, uid, d, by=""):
    p = prefs(c, uid)
    if d.get("versand") in ("pdf", "mich", "firma"):
        p["versand"] = d["versand"]
    if d.get("absender") in ("buero", "eigen"):
        p["absender"] = d["absender"]
    for k in ("kopie", "kalender"):
        if k in d:
            p[k] = bool(d[k])
    if d.get("erinnerung_art") in ("mail", "termin"):
        p["erinnerung_art"] = d["erinnerung_art"]
    if d.get("pdb_preis") in ("", "mittel", "von", "bis", "eigen_median", "eigen_neu"):
        p["pdb_preis"] = d["pdb_preis"]
    if d.get("erinnerung_an") in ("ich", "bauleiter"):
        p["erinnerung_an"] = d["erinnerung_an"]
    if isinstance(d.get("hinweise_aus"), list):
        p["hinweise_aus"] = sorted({str(x)[:40] for x in d["hinweise_aus"] if str(x).strip()})[:30]
    if "mailsignatur_html" in d:
        from . import htmlsig
        h = htmlsig.bereinigen(str(d["mailsignatur_html"] or ""))
        p["mailsignatur_html"] = h if htmlsig.html_zu_text(h).strip() or "<img" in h else ""
    for k, n in (("mailsignatur", 2000), ("telefon", 60), ("funktion", 80)):
        if k in d:
            p[k] = str(d[k] or "").replace("\r", "").strip()[:n]
    _put(c, f"konto:{uid}", json.dumps(p), by)
    return p


def signatur(c, uid):
    v = _get(c, f"signatur:{uid}")
    return base64.b64decode(v) if v else None


def set_signatur(c, uid, png, by=""):
    if png is None:
        c.execute("DELETE FROM bp_store WHERE key=?", (f"signatur:{uid}",))
    else:
        _put(c, f"signatur:{uid}", base64.b64encode(png).decode(), by)


def aufbereiten(raw):
    """Handyfoto einer Unterschrift → freigestellte PNG (transparenter Hintergrund, dunkelblaue Tinte, zugeschnitten).
    Gleicht ungleichmäßiges Licht aus (Hintergrund wird geschätzt und abgezogen) und dreht nach EXIF."""
    from PIL import Image, ImageChops, ImageFilter, ImageOps
    try:
        import pillow_heif   # iPhone-Fotos (HEIC), wenn vorhanden
        pillow_heif.register_heif_opener()
    except Exception:   # HEIC-Unterstützung nur, wenn installiert
        pass
    try:
        im = Image.open(io.BytesIO(raw))
        im = ImageOps.exif_transpose(im)
    except Exception:
        raise ValueError("Das Bild konnte nicht gelesen werden (JPG, PNG oder HEIC).")
    im.thumbnail((1800, 1800))
    g = ImageOps.grayscale(im.convert("RGB"))
    bg = g.filter(ImageFilter.GaussianBlur(max(8, min(g.size) // 25)))   # Papier/Licht
    diff = ImageChops.subtract(bg, g)                                      # Tinte = dunkler als die Umgebung
    hist = diff.histogram()
    total = sum(hist)
    # Schwelle nach Otsu, mindestens etwas über dem Rauschen
    sumall = sum(i * h for i, h in enumerate(hist)); sb = wb = 0; best = (0, 20)
    for t in range(256):
        wb += hist[t]
        if not wb or wb == total:
            continue
        sb += t * hist[t]
        mb, mf = sb / wb, (sumall - sb) / (total - wb)
        var = wb * (total - wb) * (mb - mf) ** 2
        if var > best[0]:
            best = (var, t)
    t = max(18, best[1])
    mask = diff.point(lambda v: 255 if v > t else 0).filter(ImageFilter.MedianFilter(3))
    box = mask.getbbox()
    if not box:
        raise ValueError("Auf dem Foto wurde keine Unterschrift erkannt – bitte mit dunklem Stift auf weißem Papier und gut ausgeleuchtet fotografieren.")
    m = max(6, (box[3] - box[1]) // 12)
    box = (max(0, box[0] - m), max(0, box[1] - m), min(diff.width, box[2] + m), min(diff.height, box[3] + m))
    lo = t * 0.6
    alpha = diff.crop(box).point(lambda v: 0 if v < lo else min(255, int((v - lo) * 255 / max(1, (t * 1.6 - lo)))))
    out = Image.new("RGBA", alpha.size, (20, 34, 90, 0))
    out.putalpha(alpha)
    h = 200
    if out.height > h:
        out = out.resize((max(1, round(out.width * h / out.height)), h), Image.LANCZOS)
    if out.width > 900:
        out = out.resize((900, max(1, round(out.height * 900 / out.width))), Image.LANCZOS)
    buf = io.BytesIO(); out.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def _werte(c, user, p):
    S = {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings WHERE key='office_name' OR key LIKE 'co\\_%'")}
    vn = (user["vorname"] if "vorname" in user.keys() else "") or ""
    nn = (user["nachname"] if "nachname" in user.keys() else "") or ""
    return {"name": " ".join(x for x in (vn, nn) if x) or user["name"], "vorname": vn, "nachname": nn, "funktion": p.get("funktion", ""),
            "telefon": p.get("telefon") or S.get("co_phone", ""), "email": user["email"] or "", "buero": S.get("office_name", ""),
            "buero_strasse": S.get("co_street", ""), "buero_ort": " ".join(x for x in (S.get("co_zip", ""), S.get("co_city", "")) if x),
            "buero_telefon": S.get("co_phone", ""), "buero_email": S.get("co_email", ""), "buero_web": S.get("co_web", "")}


def signatur_html(c, user):
    """Signatur als HTML (eigene Rich-Signatur mit eingesetzten Platzhaltern, sonst die Text-Signatur mit Zeilenumbrüchen)."""
    import html as H, re
    from . import htmlsig
    p = prefs(c, user["id"])
    if p.get("mailsignatur_html"):
        W = _werte(c, user, p)
        return re.sub(r"\{(\w+)\}", lambda m: H.escape(str(W[m.group(1)])) if m.group(1) in W else m.group(0), p["mailsignatur_html"])
    return htmlsig.text_zu_html(signatur_text(c, user))


def mail_teile(c, user, text, W):
    """Mailtext aus einer Vorlage (Platzhalter in W schon ohne {signatur}) → (Text, HTML). Die HTML-Fassung trägt die Rich-Signatur."""
    from . import htmlsig, vorlagen
    marke = "\u2063SIGNATUR\u2063"
    t = vorlagen.fuellen(text, {**W, "signatur": marke})
    if "{signatur}" not in text and p_html(c, user):   # Vorlage ohne {signatur}: Signatur ans Ende
        t = t.rstrip() + "\n\n" + marke
    plain = t.replace(marke, signatur_text(c, user))
    return plain, (htmlsig.mail_html(t, marke, signatur_html(c, user)) if marke in t else None)


def p_html(c, user):
    return bool(prefs(c, user["id"]).get("mailsignatur_html"))


def signatur_text(c, user):
    """E-Mail-Signatur des Benutzers mit eingesetzten Werten. Leere Zeilen (z. B. ohne Funktion) und leere Trennzeichen fallen weg."""
    import re
    p = prefs(c, user["id"])
    if p.get("mailsignatur_html"):
        from . import htmlsig
        return htmlsig.html_zu_text(signatur_html(c, user))
    S = {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings WHERE key='office_name' OR key LIKE 'co\\_%'")}
    vn = (user["vorname"] if "vorname" in user.keys() else "") or ""
    nn = (user["nachname"] if "nachname" in user.keys() else "") or ""
    W = {"name": " ".join(x for x in (vn, nn) if x) or user["name"], "vorname": vn, "nachname": nn, "funktion": p.get("funktion", ""),
         "telefon": p.get("telefon") or S.get("co_phone", ""), "email": user["email"] or "", "buero": S.get("office_name", ""),
         "buero_strasse": S.get("co_street", ""), "buero_ort": " ".join(x for x in (S.get("co_zip", ""), S.get("co_city", "")) if x),
         "buero_telefon": S.get("co_phone", ""), "buero_email": S.get("co_email", ""), "buero_web": S.get("co_web", "")}
    t = p.get("mailsignatur") or SIG_STANDARD
    out = []
    for line in t.split("\n"):
        if re.search(r"\{\w+\}", line) and not any(W.get(k) for k in re.findall(r"\{(\w+)\}", line)):
            continue   # Zeile nur aus leeren Platzhaltern
        v = re.sub(r"\{(\w+)\}", lambda m: str(W.get(m.group(1), m.group(0))), line)
        v = re.sub(r"^(\s*(Tel\.|Fax|Mobil|E-Mail)\s*)?[·,|-]\s*", "", v)                    # führende Trennzeichen
        v = re.sub(r"\s*[·,|]\s*$", "", v)                                                   # Trennzeichen am Ende
        v = re.sub(r"(Tel\.|Mobil)\s*(?=·|$)", "", v).strip(" ·,|")
        if v.strip() or not line.strip():
            out.append(v)
    return "\n".join(out).strip()


def absender(c, user, cf):
    """(Adresse, Name) für Mails, die der Benutzer verschickt. Standard: Absenderadresse des Büros (Mailserver → Absender),
    auf Wunsch je Benutzer die eigene E-Mail-Adresse (der Mailserver muss das Senden in deren Namen erlauben)."""
    p = prefs(c, user["id"])
    mail = (user["email"] or "").strip() if "email" in user.keys() else ""
    vn = (user["vorname"] if "vorname" in user.keys() else "") or ""
    nn = (user["nachname"] if "nachname" in user.keys() else "") or ""
    name = " ".join(x for x in (vn, nn) if x) or user["name"]
    if p.get("absender") == "eigen" and mail:
        return mail, name
    return None, cf.get("office_name") or name
