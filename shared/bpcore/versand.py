"""Versand – Unterlagen per E-Mail verschicken, für alle Apps gleich (Baustein head/versand.js, BPHead.versand / BPHead.unterlagenSenden).

Eine Stelle für: Empfänger prüfen, Absender und Signatur des Benutzers, Kopie an mich, Anhänge, Eintrag im Verlauf der
Kommunikation („Verschickt“) samt abgelegten Anhängen. Eine App liefert nur: welche Unterlagen, an wen, welcher Text.

empfaenger()   Liste aus dem Browser prüfen
schicken()     eine Mail mit Signatur und Anhängen senden → (weg, fehler)
beteiligte()   wer im Projekt vorkommt – Vorschlag für „An wen“
routen()       /api/bp/versand (senden), /api/bp/versand/beteiligte, /api/bp/textvorlagen
"""
import json, re
from datetime import datetime

from flask import jsonify, request

from . import benachrichtigung, contacts, dateien, db, konto, mail, skizze, vorgang

# Arten, die über /api/bp/versand gehen (Name im Verlauf der Kommunikation) – weitere stehen in benachrichtigung.ARTEN
ARTEN = {"auftrag": "Auftrag", "vergabe": "Vergabe (Zuschlag, Absage)", "rechnungspruefung": "Rechnungsprüfung", "bauantrag": "Bauantrag",
         "honorarangebot": "Honorarangebot", "honorarrechnung": "Honorarrechnung", "honorarvertrag": "Architektenvertrag",
         "tagesbericht": "Bautagebuch-Bericht", "terminplan": "Bauzeitenplan", "baukosten": "Baukosten", "bauherrenportal": "Einladung Bauherrenportal",
         "unterlagen": "Unterlagen"}
VORLAGEN_KEY = "kom:vorlagen"   # Textvorlagen fürs ganze Büro (früher nur in der Kommunikation)


def empfaenger(raw, hoechstens=20):
    """JSON-Liste [{email, name, contact_id}] → (Liste, None) oder (None, Fehlertext). Einzeln gesendet (je Empfänger:in eine Mail) bis 200."""
    try:
        L = json.loads(raw or "[]") if isinstance(raw, str) else (raw or [])
    except ValueError:
        return None, "Empfänger:in nicht lesbar."
    out = []
    for e in L if isinstance(L, list) else []:
        if not isinstance(e, dict):
            continue
        a = str(e.get("email") or "").strip()[:200]
        if not mail.ADRESSE.match(a):
            return None, f"Ungültige E-Mail-Adresse: {a or '(leer)'}"
        if a.lower() not in [x["email"].lower() for x in out]:
            out.append({"email": a, "name": str(e.get("name") or "")[:200], "contact_id": e.get("contact_id") if isinstance(e.get("contact_id"), int) else None,
                        "cc": bool(e.get("cc"))})   # in Kopie (Cc)
    if len(out) > hoechstens:
        return None, f"Höchstens {hoechstens} Empfänger:innen{'' if hoechstens > 20 else ' – mehr nur mit „einzeln senden“'}."
    return out, None


def ablage_dazu(u, raw, anh):
    """Anhänge aus der Ablage [{pid, pfad, name}] lesen und an anh hängen (Grenzen wie beim Hochladen). Fehlertext oder None."""
    import mimetypes, urllib.parse
    from . import rechte
    from .ablage import bt_json
    try:
        L = json.loads(raw or "[]")
    except ValueError:
        return "Anhänge aus der Ablage nicht lesbar."
    L = [x for x in L if isinstance(x, dict) and isinstance(x.get("pid"), int) and str(x.get("pfad") or "").strip()] if isinstance(L, list) else []
    if len(anh) + len(L) > vorgang.MAX_ANZAHL:
        return f"Höchstens {vorgang.MAX_ANZAHL} Dateien auf einmal."
    summe = sum(len(d) for _, _, d in anh)
    for x in L:
        with db.tx() as c:
            if not rechte.can_see(c, u, x["pid"]):
                return "Projekt nicht gefunden."
        try:
            roh = bt_json("GET", "/api/plaene/datei?" + urllib.parse.urlencode({"project_id": x["pid"], "pfad": x["pfad"]}), roh=True)
        except RuntimeError as e:
            return f"„{x.get('name') or x['pfad']}“: {e}"
        name = re.sub(r"[\\/:*?\"<>|\r\n]+", "_", str(x.get("name") or x["pfad"].rsplit("/", 1)[-1]))[:120]
        if len(roh) > vorgang.MAX_DATEI:
            return f"„{name}“ ist größer als 15 MB."
        summe += len(roh)
        if summe > vorgang.MAX_SUMME:
            return "Zusammen mehr als 25 MB – bitte weniger oder kleinere Dateien."
        anh.append((name, mimetypes.guess_type(name)[0] or "application/octet-stream", roh))
    return None


def anrede(c, x):
    """Persönliche Anrede für eine:n Empfänger:in: aus dem Kontakt (Ansprechperson mit dieser Adresse), sonst allgemein."""
    k = c.execute("SELECT * FROM contacts WHERE id=?", (x["contact_id"],)).fetchone() if x.get("contact_id") else None
    for m in contacts.mail_adressen(k) if k else []:
        if m["email"].lower() == x["email"].lower():
            return contacts.anrede_von(m)
    return "Sehr geehrte Damen und Herren,"


def schicken(c, u, projektname, an, betreff, text, anh, kopie):
    """Mail mit Signatur (Rich-Signatur als HTML) vom Absender des Benutzers; anh = [(name, mime, bytes)]. Gibt (weg, fehler) zurück."""
    cf = mail.conf(c)
    if not mail.configured(cf):
        return None, "Der E-Mail-Versand ist nicht eingerichtet (Verwaltung → Einstellungen → Mailserver)."
    W = {"projekt": projektname or "", "absender": skizze.name_von(u), "buero": cf.get("office_name") or "", "datum": datetime.now().strftime("%d.%m.%Y")}
    tx, html = konto.mail_teile(c, u, text + "\n\n{signatur}", W)
    von, vname = konto.absender(c, u, cf)
    ich = (u["email"] or "").strip()
    to = [x["email"] for x in an if not x.get("cc")] or [x["email"] for x in an[:1]]   # An – die übrigen in Kopie (Cc)
    cc = [x["email"] for x in an if x["email"] not in to]
    cc += [ich] if kopie and ich and ich.lower() not in [x["email"].lower() for x in an] else []
    try:
        weg = mail.direkt(cf, to, betreff, tx, sender=vname, from_addr=von, attachments=[(n, d, m) for n, m, d in anh],
                        cc=cc, reply_to=ich or None, html=html)
    except mail.MailError as e:
        return None, str(e)
    return weg or "test", None


def plotdienste(c):
    """Kontakte mit der Art „Plotdienst“ (Adressen → Art, auch „Plotservice“, „Plotdienste“) – im Versand immer zur Auswahl,
    für jedes Projekt, ohne Suchen. Nicht vorausgewählt."""
    return [{"id": r["id"], "name": r["name"], "email": (r["email"] or "").strip(), "person": r["contact_person"] or "", "gewerke": ["Plotdienst"], "plot": True}
            for r in c.execute("SELECT id, name, email, contact_person FROM contacts WHERE lower(trim(art)) LIKE 'plot%' ORDER BY lower(name)")]


def beteiligte(c, pid):
    """Wer im Projekt vorkommt (Bautagebuch, Aufträge der AVA, frühere Sendungen) – mit E-Mail, für „An wen“."""
    rolle = {}
    for r in c.execute("SELECT DISTINCT i.contact_id FROM items i JOIN reports r ON r.id=i.report_id WHERE r.project_id=? AND i.contact_id IS NOT NULL", (pid,)):
        rolle.setdefault(r["contact_id"], "Bautagebuch")
    for r in c.execute("SELECT name, vergabe FROM ava_lv WHERE project_id=? AND archived=0", (pid,)):
        try:
            v = json.loads(r["vergabe"] or "{}")
        except ValueError:
            v = {}
        if isinstance(v, dict) and isinstance(v.get("contact_id"), int):
            rolle[v["contact_id"]] = "Auftrag " + (r["name"] or "")
    for r in c.execute("SELECT DISTINCT contact_id FROM benachrichtigungen WHERE project_id=? AND contact_id IS NOT NULL", (pid,)):
        rolle.setdefault(r["contact_id"], "schon angeschrieben")
    ids = list(rolle)[:300]
    rows = c.execute("SELECT id, name, contact_person, email, trade FROM contacts WHERE id IN (" + ",".join("?" * len(ids)) + ")", ids).fetchall() if ids else []
    out = [{"id": x["id"], "name": x["name"], "ansprech": x["contact_person"] or "", "email": x["email"] or "", "gewerk": x["trade"] or "", "rolle": rolle.get(x["id"], "")}
           for x in rows]
    return sorted(out, key=lambda x: (not x["email"], x["rolle"].startswith("schon"), x["name"].lower()))


def textvorlagen(c, standard=()):
    v = konto._get(c, VORLAGEN_KEY)
    try:
        L = json.loads(v) if v else None
    except ValueError:
        L = None
    return L if isinstance(L, list) else [dict(x) for x in standard]


def textvorlagen_setzen(c, liste, wer):
    s = lambda v, n: re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", str(v or "")).strip()[:n]   # noqa: E731
    L = [{"id": s(x.get("id"), 40) or re.sub(r"\W+", "", str(x.get("name") or ""))[:30] or "v", "name": s(x.get("name"), 80),
          "betreff": s(x.get("betreff"), 200), "text": s(x.get("text"), 5000)}
         for x in (liste or [])[:60] if isinstance(x, dict) and s(x.get("name"), 80)]
    konto._put(c, VORLAGEN_KEY, json.dumps(L, ensure_ascii=False), wer)
    return L


def routen(bp, _uid):
    @bp.post("/api/bp/versand")
    def versand_senden():
        """Unterlagen einer App verschicken: Formular mit art, pid, an (JSON), betreff, text, kopie, einzeln, link und den Dateien („dateien“)."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        f = request.form
        art = f.get("art") if f.get("art") in ARTEN or f.get("art") in benachrichtigung.ARTEN else "unterlagen"
        pid = f.get("pid", type=int)
        an, err = empfaenger(f.get("an"), 200 if f.get("einzeln") == "1" else 20)
        if err or not an:
            return jsonify(error=err or "Bitte mindestens eine:n Empfänger:in wählen."), 400
        text = (f.get("text") or "").strip()[:20000]
        if not text:
            return jsonify(error="Bitte einen Text schreiben."), 400
        anh, err = vorgang.dateien_pruefen(request.files.getlist("dateien"))
        if not err:
            err = ablage_dazu(u, f.get("ablage"), anh)   # Pläne und Dateien aus der Ablage – erst jetzt gelesen, mit den Rechten der Person
        if err:
            return jsonify(error=err), 400
        wer = skizze.name_von(u)
        with db.tx() as c:
            p = c.execute("SELECT id, name FROM projects WHERE id=?", (pid,)).fetchone() if pid else None
            if pid and not (p and vorgang.sieht(c, u, pid)):
                return jsonify(error="Projekt nicht gefunden"), 404
            pname = p["name"] if p else ""
            betreff = vorgang.betreff_mit_kuerzel(f.get("betreff") or "", pname) or ARTEN.get(art, "Unterlagen")
            if f.get("einzeln") == "1" and len(an) > 1:   # je Empfänger:in eine eigene Mail – niemand sieht die anderen (z. B. Terminplan an alle Firmen)
                weg, fehler = None, []
                for k, x in enumerate(an):   # {anrede} = persönliche Anrede je Empfänger:in (Adressen: Mail an die Auswahl, AW-3)
                    w1, e1 = schicken(c, u, pname, [x], betreff, text.replace("{anrede}", anrede(c, x)), anh, f.get("kopie") == "1" and k == 0)
                    weg = weg or w1
                    if e1:
                        fehler.append(f"{x['name'] or x['email']}: {e1}")
                err = "; ".join(fehler)[:500] if fehler else None
            else:
                weg, err = schicken(c, u, pname, an, betreff, text.replace("{anrede}", anrede(c, an[0]) if len(an) == 1 else "Sehr geehrte Damen und Herren,"), anh, f.get("kopie") == "1")
        with db.tx() as c:
            ids = benachrichtigung.protokoll(c, art, an, project_id=pid, projekt=pname, betreff=betreff,
                                             inhalt=text + (f"\n\nAnhänge: {', '.join(n for n, _, _ in anh)}" if anh else ""), von=wer,
                                             weg="mail", status="fehler" if err else "gesendet", fehler=err or "", link=(f.get("link") or "")[:300])
            if ids and not err:
                jetzt = datetime.now().isoformat(timespec="seconds")
                for n, m, d in anh:
                    c.execute("INSERT INTO kom_datei(benachrichtigung_id, name, mime, groesse, data, datei_ref, erstellt, erstellt_name) VALUES(?,?,?,?,?,?,?,?)",
                              (ids[0], n, m, len(d), *dateien.werte(c, d), jetzt, wer))
            neu = benachrichtigung.unbekannt(c, [x["email"] for x in an]) if not err else []
        if err:
            return jsonify(error=err), 502
        return jsonify(ok=True, weg=weg, betreff=betreff, neue_adressen=neu)

    @bp.get("/api/bp/versand/beteiligte")
    def versand_beteiligte():
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        pid = request.args.get("pid", type=int)
        with db.tx() as c:
            if not pid or not c.execute("SELECT 1 FROM projects WHERE id=?", (pid,)).fetchone() or not vorgang.sieht(c, u, pid):
                return jsonify([])
            return jsonify(beteiligte(c, pid))

    @bp.route("/api/bp/textvorlagen", methods=["GET", "PUT"])
    def versand_textvorlagen():
        """Textvorlagen fürs ganze Büro: {firma} {projekt} {frist} {ich} werden beim Einsetzen ersetzt."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":
                textvorlagen_setzen(c, (request.get_json(silent=True) or {}).get("vorlagen"), skizze.name_von(u))
            return jsonify(vorlagen=textvorlagen(c, VORLAGEN_STANDARD))


# Start-Vorlagen, solange das Büro keine eigenen gespeichert hat
VORLAGEN_STANDARD = [
    {"id": "termin", "name": "Bitte um Terminbestätigung", "betreff": "Terminbestätigung {projekt}",
     "text": "Guten Tag,\n\nbitte bestätigen Sie uns den Ausführungstermin für Ihre Leistungen im Bauvorhaben {projekt} bis zum {frist}.\n\nMit freundlichen Grüßen\n{ich}"},
    {"id": "nachtrag", "name": "Aufforderung Nachtragsangebot", "betreff": "Nachtragsangebot {projekt}",
     "text": "Guten Tag,\n\nzu der angekündigten Mehrleistung bitten wir um ein prüffähiges Nachtragsangebot auf Grundlage Ihrer Urkalkulation (§ 2 Abs. 5/6 VOB/B) bis zum {frist}.\n\nMit freundlichen Grüßen\n{ich}"},
    {"id": "unterlagen", "name": "Unterlagen anfordern", "betreff": "Fehlende Unterlagen {projekt}",
     "text": "Guten Tag,\n\nfür das Bauvorhaben {projekt} fehlen uns noch folgende Unterlagen:\n\n- \n\nBitte senden Sie diese bis zum {frist}.\n\nMit freundlichen Grüßen\n{ich}"},
    {"id": "anbei", "name": "Unterlagen anbei", "betreff": "Unterlagen – {projekt}",
     "text": "Guten Tag,\n\nanbei erhalten Sie die Unterlagen zum Bauvorhaben {projekt}.\n\nMit freundlichen Grüßen\n{ich}"},
]
