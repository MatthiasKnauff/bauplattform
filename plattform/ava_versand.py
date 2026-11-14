"""Ausschreibung – LV an Bieter:innen versenden (Schritt „Versand“ zwischen LV und Angeboten).

Je Bieter:in eine eigene Mail mit persönlicher Anrede (niemand sieht die anderen), Ansprechpartner:in aus den Adressen gewählt
(Firma, weitere Ansprechpartner:innen und E-Mail-Adressen), Anhänge: LV als PDF ohne Preise und als GAEB X83 – immer aus dem
aktuellen Stand. Versendet wird erst auf „Senden“ (nie automatisch). Danach im Projektordner unter Leistungsverzeichnis/Gewerk:
LV-PDF, X83 und die Empfängerliste mit Datum. Rückmeldungen (Zusage, Absage) trägt man von Hand ein; ein eingegangenes Angebot
setzt „Angebot da“ von selbst. In „Kommunikation“ steht jede Mail (Art „LV-Versand“).

Eigene Seite „Versand an Bieter:innen“ unter Vergabe (besprochen am 13.11.2026). Unterlagen: Verweise auf Dateien im Projektordner
(Pläne & Dateien, Fileserver) – gelesen werden sie erst beim Senden; Dateien vom Rechner kommen nur mit dem Senden. Danach liegt alles in
einem eigenen Ordner „Versand|Erinnerung|Nachversand <Datum>“ unter dem LV-Ordner: LV (PDF, X83), Anschreiben, „Angefragte Firmen“ (PDF, Excel),
die Unterlagen in „Anlagen“. In der Datenbank stehen nur die Verweise.

Gespeichert in bp_store „ava:versand:<lv>“: {abgabe, rueckmeldung, bieter: {cid: {email, name, anrede, rueck, notiz}}, unterlagen: [{quelle, pfad, name, groesse, sub, verschickt}], texte: {art: {betreff, text}}, lv_verschickt, lv_rev,
                                          laeufe: [{datum, art, wer, an, betreff, ablage}]}
GET  /api/lv/<i>/versand                Bieter:innen (Angebote + gewählte), Vorschläge aus den Adressen, Unterlagen, Läufe, Vorlage
PUT  /api/lv/<i>/versand                {abgabe?, rueckmeldung?, unterlagen?, ohne_x83?, bieter: {cid: {email?, anrede?, rueck?, notiz?, weg?, grund?, bis?, naechst?, todo_id?, anruf? (Telefonnotiz dazu, ≤ 10), anruf_weg?}}}
POST /api/lv/<i>/versand/vorschau        {art, contact_id, betreff, text} → die Mail an diese Firma (An, Betreff, Text, HTML)
GET  /api/lv/<i>/versand/ansehen?was=lv|x83 bzw. ?pfad=…  Anhang ansehen
POST /api/lv/<i>/versand/senden         {an: [{contact_id, email, name, anrede}], art, betreff, text, pdf, x83, unterlagen, kopie, anhaenge}
"""
import base64
import io
import json
import re
import urllib.parse
from datetime import datetime

from flask import g, jsonify, request

from bpcore import benachrichtigung, db, gaeb, konto, mail, vorlagen
import common as C
from ava import _druck_layout, _j, _lv, _lv_druck, _payload, _pdf_name, _sees, app

VORLAGE = vorlagen.DEF["angebotsanfrage"]   # anpassbar in Kommunikation → Vorlagen
ARTEN = {"versand": "Versand", "erinnerung": "Erinnerung", "nachversand": "Nachversand"}   # Name des Ordners je Lauf
MAX_ANHANG = 25 * 1048576   # je Mail zusammen (viele Postfächer nehmen höchstens 20–25 MB an)


TEXTE = {   # Erinnern und Nachversand (die Angebotsanfrage steht in Kommunikation → Vorlagen)
    "erinnerung": {"betreff": "Erinnerung: Angebotsanfrage {lv} – {projekt}",
                   "text": "{anrede}\n\nwir möchten an unsere Anfrage zu {lv} für das Bauvorhaben {bauvorhaben} erinnern.\n\nBitte teilen Sie uns bis {rueckmeldung} kurz mit, ob Sie ein Angebot abgeben.\nAbgabe des Angebots bis {abgabe}.\n\nMit freundlichen Grüßen\n\n{signatur}"},
    "nachversand": {"betreff": "Geänderte Unterlagen: {lv} – {projekt}",
                    "text": "{anrede}\n\nzu unserer Anfrage {lv} für das Bauvorhaben {bauvorhaben} haben sich die Unterlagen geändert. Anbei der aktuelle Stand – bitte legen Sie ihn Ihrem Angebot zugrunde.\n\nAbgabe des Angebots bis {abgabe}.\n\nMit freundlichen Grüßen\n\n{signatur}"}}


def _texte_setzen(ziel, neu):
    """{art: {betreff, text} | None} übernehmen – None oder leer entfernt den eigenen Text (dann gilt wieder der allgemeine)."""
    for art, t in neu.items():
        if art not in ARTEN:
            continue
        if not isinstance(t, dict) or not (str(t.get("text") or "").strip() or str(t.get("betreff") or "").strip()):
            ziel.pop(art, None)
        else:
            ziel[art] = {"betreff": str(t.get("betreff") or "")[:300], "text": str(t.get("text") or "")[:8000]}


def _key(i):
    return f"ava:versand:{i}"


def _lesen(c, i):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (_key(i),)).fetchone()
    try:
        d = json.loads(r["data"]) if r and r["data"] else {}
    except (TypeError, ValueError):
        d = {}
    d.setdefault("bieter", {}); d.setdefault("laeufe", []); d.setdefault("unterlagen", [])
    return d


def _unterlagen(liste):
    """Verweise prüfen: nur Dateien im Projektordner (Pfad relativ, ohne ..), höchstens 30."""
    out, seen = [], set()
    for x in liste if isinstance(liste, list) else []:
        if not isinstance(x, dict):
            continue
        pfad = "/".join(t for t in str(x.get("pfad") or "").replace("\\", "/").split("/") if t and t not in (".", ".."))[:400]
        if not pfad or pfad in seen:
            continue
        seen.add(pfad)
        out.append({"quelle": x.get("quelle") if x.get("quelle") in ("plan", "datei") else "server", "pfad": pfad, "name": str(x.get("name") or pfad.rsplit("/", 1)[-1])[:160],
                    "groesse": int(x.get("groesse") or 0) if str(x.get("groesse") or "0").isdigit() else 0, "sub": str(x.get("sub") or "")[:160], "verschickt": str(x.get("verschickt") or "")[:16]})
    return out[:30]


def _schreiben(c, i, d):
    c.execute("INSERT INTO bp_store(key, data) VALUES(?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data", (_key(i), json.dumps(d, ensure_ascii=False)))


def anrede(name):
    """Persönliche Anrede aus dem Namen der Ansprechperson: „Herr Kemper“ → „Sehr geehrter Herr Kemper,“; sonst allgemein."""
    n = " ".join(str(name or "").split())
    m = re.match(r"^(Herrn?|Frau)\s+((?:Dr\.|Prof\.|Dipl\.-Ing\.)\s+)*(.+)$", n)
    if m:
        nach = m.group(3).split()[-1]
        titel = "".join(x for x in re.findall(r"(Dr\.|Prof\.)\s+", n)[:1])
        return f"Sehr geehrte{'r' if m.group(1).startswith('Herr') else ''} {'Herr' if m.group(1).startswith('Herr') else 'Frau'} {titel + ' ' if titel else ''}{nach},"
    return "Sehr geehrte Damen und Herren,"


def _adressen(k):
    """E-Mail-Adressen einer Firma mit Ansprechperson: Firma (Ansprechpartner:in), weitere Ansprechpartner:innen, weitere Adressen."""
    out = []
    ex = _j(k["extra"], {}) if "extra" in k.keys() else {}
    if k["email"]:
        out.append({"email": k["email"], "name": k["contact_person"] or "", "funktion": "Firma"})
    for w in ex.get("weitere") or []:
        if not isinstance(w, dict):
            continue
        if w.get("typ") == "person" and w.get("mail"):
            out.append({"email": w["mail"], "name": w.get("wert") or "", "funktion": w.get("bez") or "Ansprechpartner:in"})
        elif w.get("typ") == "mail" and w.get("wert"):
            out.append({"email": w["wert"], "name": "", "funktion": w.get("bez") or "weitere Adresse"})
    seen, uniq = set(), []
    for x in out:
        if x["email"].lower() not in seen:
            seen.add(x["email"].lower()); uniq.append(x)
    return uniq


def _namen(c, r):
    """Dateinamen der Anhänge, wie sie beim Senden entstehen (Schema aus den Büro-Einstellungen)."""
    p = c.execute("SELECT name FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
    pdf = _pdf_name(p["name"] if p else "", "LV", "", r)
    return {"pdf": pdf, "x83": pdf.rsplit(".", 1)[0] + ".x83"}


def _antwort(c, r):
    d = _lesen(c, r["id"])
    ang = {a["contact_id"]: a for a in c.execute("SELECT id, contact_id, bieter FROM ava_angebot WHERE lv_id=?", (r["id"],)).fetchall() if a["contact_id"]}
    ids = [int(x) for x in d["bieter"] if str(x).isdigit()] + list(ang)
    K = {k["id"]: k for k in c.execute(f"SELECT * FROM contacts WHERE id IN ({','.join('?' * len(ids)) or 'NULL'})", ids).fetchall()} if ids else {}
    bieter = []
    for cid in dict.fromkeys(ids):
        k, b = K.get(cid), d["bieter"].get(str(cid)) or {}
        if not k or b.get("weg"):
            continue
        A = _adressen(k)
        email = b.get("email") if any(x["email"] == b.get("email") for x in A) else (A[0]["email"] if A else "")   # ohne Wahl: die Adresse der Firma
        wer = next((x for x in A if x["email"] == email), {})
        bieter.append({"contact_id": cid, "name": k["name"], "trade": k["trade"] or "", "city": k["city"] or "", "adressen": A, "email": email,
                       "anrede": b.get("anrede") or anrede(wer.get("name") or ""), "anrede_hand": bool(b.get("anrede")),
                       "versendet": b.get("versendet") or "", "rueck": "angebot" if cid in ang else b.get("rueck") or "", "notiz": b.get("notiz") or "",
                       "grund": b.get("grund") or "", "bis": b.get("bis") or "", "naechst": b.get("naechst") or "", "todo_id": b.get("todo_id"),
                       "anrufe": b.get("anrufe") or [], "telefon": (k["phone"] if "phone" in k.keys() else "") or (k["mobile"] if "mobile" in k.keys() else "") or ""})
    lvw = _stamm(f"{r['gewerk'] or ''} {r['name'] or ''}")   # Gewerk des LV, sonst sein Name (z. B. „Fensterarbeiten“)
    vor = [{"contact_id": k["id"], "name": k["name"], "trade": k["trade"] or "", "city": k["city"] or ""}
           for k in c.execute("SELECT id, name, trade, city FROM contacts WHERE trade<>'' ORDER BY name").fetchall()
           if lvw and k["id"] not in ids and lvw & _stamm(k["trade"])][:40]
    for x in bieter:
        x["texte"] = (d["bieter"].get(str(x["contact_id"])) or {}).get("texte") or {}
    T = vorlagen.alle(c)["angebotsanfrage"]
    return {"abgabe": d.get("abgabe") or "", "rueckmeldung": d.get("rueckmeldung") or "", "bieter": bieter, "vorschlaege": vor, "laeufe": d["laeufe"][-20:],
            "unterlagen": d["unterlagen"], "project_id": r["project_id"], "ohne_x83": bool(d.get("ohne_x83")), "namen": _namen(c, r),
            "vorlage": {"betreff": T["betreff"], "text": T["text"]}, "standard": {**TEXTE, "versand": {"betreff": T["betreff"], "text": T["text"]}},
            "texte": d.get("texte") or {}, "lv_verschickt": d.get("lv_verschickt") or "",
            "lv_geaendert": bool(d.get("lv_verschickt")) and d.get("lv_rev") != r["rev"]}


# Gewerke grob gleichsetzen: Wortstämme (ohne „-arbeiten“, „-bau“ …) und die üblichen Gleichnamen – passende Firmen stehen oben,
# alle anderen darunter (irgendwer kann immer eingeladen werden)
_GLEICH = [{"rohbau", "maurer", "mauer", "beton", "stahlbeton", "bauunternehmen", "hochbau"}, {"erdbau", "erdar", "tiefbau", "galab", "garte", "lands"}, {"elekt"},
           {"sanit", "heizu", "lüftu", "hlsk", "insta", "gas", "wasser"}, {"dach", "dachd", "klemp", "spengl"}, {"maler", "anstr", "lacki", "tapez"},
           {"trock", "akust"}, {"flies", "plattenl", "naturs"}, {"estri"}, {"fenst", "verglas", "glase"}, {"tisch", "schre", "innent", "türen"},
           {"gerüs"}, {"zimme", "holzb"}, {"metal", "schlo", "stahl"}, {"bodenb", "parke", "belag"}, {"putz", "stuck", "wdvs"}, {"abbru", "rückb", "schad"}]


def _stamm(t):
    ws = {w[:5] for w in re.findall(r"[a-zäöüß]{3,}", (t or "").lower().replace("arbeiten", " ").replace("bauarbeiten", "bau ").replace("-", " "))
          if w not in ("und", "der", "die", "das", "für", "gmbh", "bau", "fa", "los", "lv")}
    for g in _GLEICH:
        if ws & {x[:5] for x in g} or any(w.startswith(x) for w in ws for x in g):
            ws |= {x[:5] for x in g}
    return ws


def _de(t):
    try:
        return datetime.fromisoformat(t).strftime("%d.%m.%Y" + (", %H:%M Uhr" if "T" in t else ""))
    except (TypeError, ValueError):
        return t or "…"


def _frist_falsch(d):
    """Rückmeldung (Zusage/Absage) nach dem Abgabetag ergibt keinen Sinn."""
    return bool(d.get("abgabe") and d.get("rueckmeldung") and d["rueckmeldung"][:10] > d["abgabe"][:10])


@app.route("/api/lv/<int:i>/versand", methods=["GET", "PUT"])
def lv_versand(i):
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        if request.method == "PUT":
            b = request.get_json(silent=True) or {}
            d = _lesen(c, i)
            for k in ("abgabe", "rueckmeldung"):
                if k in b:
                    d[k] = str(b[k] or "")[:16]
            if _frist_falsch(d):
                return jsonify(error="Die Rückmeldung muss spätestens am Tag der Abgabe liegen."), 400
            if "unterlagen" in b:
                d["unterlagen"] = _unterlagen(b["unterlagen"])
            if "ohne_x83" in b:   # GAEB-Datei weglassen (z. B. kleine Firmen ohne AVA-Programm)
                d["ohne_x83"] = bool(b["ohne_x83"])
            if isinstance(b.get("texte"), dict):   # eigener Betreff/Text je Art für dieses LV (None = wieder die Vorlage)
                _texte_setzen(d.setdefault("texte", {}), b["texte"])
            for cid, x in (b.get("bieter") or {}).items() if isinstance(b.get("bieter"), dict) else ():
                if not str(cid).isdigit() or not isinstance(x, dict):
                    continue
                y = d["bieter"].setdefault(str(cid), {})
                for f, n in (("email", 200), ("anrede", 200), ("notiz", 500)):
                    if f in x:
                        y[f] = str(x[f] or "").strip()[:n]
                if "rueck" in x:   # Stand von Hand: abgegeben · will abgeben (zusage) · gibt nicht ab (absage) · offen
                    y["rueck"] = x["rueck"] if x["rueck"] in ("abgegeben", "zusage", "absage", "") else y.get("rueck", "")
                if "grund" in x:   # warum keine Abgabe
                    y["grund"] = str(x["grund"] or "").strip()[:300]
                for f in ("bis", "naechst"):   # will abgeben bis … · nächster Anruf am …
                    if f in x:
                        v = str(x[f] or "")[:10]
                        y[f] = v if re.fullmatch(r"\d{4}-\d{2}-\d{2}", v) else ""
                if "todo_id" in x:   # To-do „… anrufen“ zum nächsten Anruf (legt die Seite über /api/bp/todo an)
                    y["todo_id"] = int(x["todo_id"]) if str(x["todo_id"] or "").isdigit() else None
                A_ = y.setdefault("anrufe", [])
                if str(x.get("anruf") or "").strip():   # Telefonnotiz: höchstens 10 je Firma
                    if len(A_) >= 10:
                        return jsonify(error="Schon 10 Telefonnotizen bei dieser Firma – bitte eine alte löschen."), 400
                    A_.append({"t": datetime.now().strftime("%Y-%m-%dT%H:%M"), "text": str(x["anruf"]).strip()[:500], "wer": C.full_name(g.user)})
                if isinstance(x.get("anruf_weg"), int) and 0 <= x["anruf_weg"] < len(A_):
                    A_.pop(x["anruf_weg"])
                if isinstance(x.get("anrufe"), list):   # Rückgängig: Liste wie vorher
                    y["anrufe"] = [{"t": str(a.get("t") or "")[:16], "text": str(a.get("text") or "")[:500], "wer": str(a.get("wer") or "")[:100]} for a in x["anrufe"][:10] if isinstance(a, dict)]
                if "weg" in x:
                    y["weg"] = bool(x["weg"])
                if isinstance(x.get("texte"), dict):   # eigener Text nur für diese Firma
                    _texte_setzen(y.setdefault("texte", {}), x["texte"])
            _schreiben(c, i, d)
        return jsonify(_antwort(c, r))


def _firmenliste(K, an, art, wann):
    """„Angefragte Firmen“: Firma, Ansprechperson, Anschrift, Telefon, E-Mail, Stand – Zeilen für PDF und Excel."""
    out = []
    for x in an:
        k = K.get(x.get("contact_id")) or {}
        g_ = (lambda f: (k[f] or "") if k and f in k.keys() else "")
        out.append({"firma": x.get("name") or g_("name"), "person": g_("contact_person"),
                    "anschrift": ", ".join(v for v in (g_("street"), " ".join(v for v in (g_("zip"), g_("city")) if v)) if v),
                    "telefon": g_("phone") or g_("mobile"), "email": x.get("email") or "", "stand": f"{ARTEN.get(art, 'Versand')} {wann}" if x.get("ok") else "Fehler: " + (x.get("fehler") or "")[:60]})
    return out


def _firmen_pdf(r, projekt, zeilen, betreff, wann, wer, FN):
    """Adressliste der angefragten Firmen als PDF (Querformat, für den Projektordner)."""
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    buf = io.BytesIO(); S = landscape(A4); cv = canvas.Canvas(buf, pagesize=S)
    sp = [(12, "Firma", 40), (70, "Ansprechperson", 26), (112, "Anschrift", 40), (172, "Telefon", 18), (200, "E-Mail", 34), (250, "Stand", 28)]
    def kopf(y):
        cv.setFont(FN["b"], 8.5)
        for x, t, _n in sp:
            cv.drawString(x * mm, y, t)
        return y - 5 * mm
    y = S[1] - 18 * mm
    cv.setFont(FN["b"], 13); cv.drawString(12 * mm, y, f"Angefragte Firmen – LV {r['nr']} {r['name']}"[:110]); y -= 6 * mm
    cv.setFont(FN["n"], 9); cv.drawString(12 * mm, y, f"{projekt} · {wann} · {wer} · Betreff: {betreff}"[:170]); y -= 9 * mm
    y = kopf(y); cv.setFont(FN["n"], 8.5)
    for z in zeilen:
        if y < 15 * mm:
            cv.showPage(); y = kopf(S[1] - 18 * mm); cv.setFont(FN["n"], 8.5)
        for (x, _t, n), v in zip(sp, (z["firma"], z["person"], z["anschrift"], z["telefon"], z["email"], z["stand"])):
            cv.drawString(x * mm, y, str(v)[:n or 30])
        y -= 5 * mm
    cv.save()
    return buf.getvalue()


def _firmen_xlsx(zeilen):
    from openpyxl import Workbook
    from openpyxl.styles import Font
    wb = Workbook(); ws = wb.active; ws.title = "Angefragte Firmen"
    ws.append(["Firma", "Ansprechperson", "Anschrift", "Telefon", "E-Mail", "Stand"])
    for c_ in ws[1]:
        c_.font = Font(bold=True)
    for z in zeilen:
        ws.append([z["firma"], z["person"], z["anschrift"], z["telefon"], z["email"], z["stand"]])
    for col, w in zip("ABCDEF", (34, 24, 38, 18, 32, 24)):
        ws.column_dimensions[col].width = w
    buf = io.BytesIO(); wb.save(buf)
    return buf.getvalue()


def _anschreiben_pdf(betreff, text, wann, FN):
    """Der Mailtext, wie er rausging (Beispiel der ersten Empfänger:in)."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    buf = io.BytesIO(); cv = canvas.Canvas(buf, pagesize=A4)
    y = A4[1] - 25 * mm
    cv.setFont(FN["b"], 11); cv.drawString(25 * mm, y, betreff[:95]); y -= 6 * mm
    cv.setFont(FN["n"], 8.5); cv.drawString(25 * mm, y, f"versendet {wann} – je Firma mit eigener Anrede"); y -= 9 * mm
    from reportlab.lib.utils import simpleSplit
    cv.setFont(FN["n"], 10)
    for zeile in (text or "").splitlines() or [""]:
        for t in simpleSplit(zeile, FN["n"], 10, A4[0] - 50 * mm) or [""]:   # an Wortgrenzen umbrechen
            if y < 20 * mm:
                cv.showPage(); y = A4[1] - 25 * mm; cv.setFont(FN["n"], 10)
            cv.drawString(25 * mm, y, t); y -= 5 * mm
    cv.save()
    return buf.getvalue()


def _w0(r, p, d, b, cf):
    """Platzhalter, die für alle Firmen gleich sind."""
    return {"lv": f"LV {r['nr']} {r['name']}".strip(), "projekt": p["name"] if p else "", "bauvorhaben": vorlagen.bauvorhaben(p), "gewerk": r["gewerk"] or "",
            "abgabe": _de(b.get("abgabe") or d.get("abgabe")), "rueckmeldung": _de(b.get("rueckmeldung") or d.get("rueckmeldung")),
            "absender": C.full_name(g.user), "buero": cf.get("office_name") or "", "datum": datetime.now().strftime("%d.%m.%Y")}


def _fuellen(c, W0, b, x, d, art):
    """Betreff, Text und HTML der Mail an eine Firma: eigener Text der Firma vor dem Text des Versands, dann die Vorlage."""
    eigen = ((d["bieter"].get(str(x.get("contact_id") or "")) or {}).get("texte") or {}).get(art) or {}
    std = TEXTE.get(art) or VORLAGE
    W = {**W0, "firma": str(x.get("name") or ""), "anrede": str(x.get("anrede") or "") or "Sehr geehrte Damen und Herren,"}
    roh_t = str(eigen.get("text") or b.get("text") or std["text"])
    for k_ in ("abgabe", "rueckmeldung"):   # ohne Datum: den Satz dazu weglassen statt „bis …“
        if W[k_] == "…":
            roh_t = re.sub(r"(?m)^[^\n]*\{" + k_ + r"\}[^\n]*\n?", "", roh_t)
    text, html = konto.mail_teile(c, g.user, roh_t, W)
    return vorlagen.fuellen(str(eigen.get("betreff") or b.get("betreff") or std["betreff"]), W), text, html


@app.post("/api/lv/<int:i>/versand/vorschau")
def lv_versand_vorschau(i):
    """Die Mail an eine Firma, wie sie hinausginge: {art, contact_id, betreff, text} → {an, betreff, text, html}."""
    b = request.get_json(silent=True) or {}
    art = b.get("art") if b.get("art") in ARTEN else "versand"
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        p = _sees(c, r["project_id"]) if r["project_id"] else None
        d, A = _lesen(c, i), _antwort(c, r)
        x = next((y for y in A["bieter"] if str(y["contact_id"]) == str(b.get("contact_id"))), None) or (A["bieter"][0] if A["bieter"] else {"name": "Musterfirma", "anrede": ""})
        betreff, text, html = _fuellen(c, _w0(r, p, d, b, mail.conf(c)), b, x, d, art)
    return jsonify(an=x.get("email") or "", firma=x.get("name") or "", betreff=betreff, text=text, html=html)


@app.get("/api/lv/<int:i>/versand/ansehen")
def lv_versand_ansehen(i):
    """Anhang ansehen: ?was=lv (LV-PDF ohne Preise) | x83 (GAEB als Text) | pfad=<Unterlage im Projektordner>."""
    from flask import Response
    was = request.args.get("was") or ""
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        p = _sees(c, r["project_id"]) if r["project_id"] else None
        d0 = _j(r["data"], {}) or {}
        if was == "lv":
            pdf, _F = _lv_druck(c, r, _payload(c, r), {**_druck_layout(d0, {}, c), "preise": "leer"})
            return Response(pdf, mimetype="application/pdf")
        if was == "x83":
            items = [x for x in d0.get("items") or [] if not x.get("nt")]
            x83 = gaeb.schreiben({"nr": r["nr"], "name": r["name"], "items": items}, "83", None, p["name"] if p else "", "", 0)
            return Response(x83 if isinstance(x83, bytes) else str(x83).encode("utf-8"), mimetype="text/plain; charset=utf-8")
        d = _lesen(c, i)
    pfad = request.args.get("pfad") or ""
    if not any(u["pfad"] == pfad for u in d["unterlagen"]):   # nur, was bei diesem Versand dabei ist
        return jsonify(error="Diese Unterlage gehört nicht zum Versand."), 404
    try:
        roh = _datei_lesen(r["project_id"], pfad)
    except RuntimeError as e:
        return jsonify(error=f"Unterlage ließ sich nicht lesen: {e}"), 400
    return Response(roh, mimetype="application/pdf" if pfad.lower().endswith(".pdf") else "application/octet-stream")


def _datei_lesen(pid, pfad):
    """Unterlage aus dem Projektordner lesen (über das Bautagebuch, mit den Rechten der Person)."""
    return C.bt_api("GET", "/api/plaene/datei?" + urllib.parse.urlencode({"project_id": pid, "pfad": pfad}), roh=True)


def _sauber(n):
    return re.sub(r'[\\/:*?"<>|]+', "_", str(n or "Anhang"))[:150]


@app.post("/api/lv/<int:i>/versand/senden")
def lv_versand_senden(i):
    """Je Bieter:in eine eigene Mail. art: versand (Vorgabe) | erinnerung (ohne Anhänge, wenn nicht gewünscht) | nachversand (geändertes LV).
    Anhänge: LV-PDF ohne Preise, X83, die Unterlagen der Seite (unterlagen=true) und Dateien vom Rechner – zusammen höchstens etwa 25 MB."""
    b = request.get_json(silent=True) or {}
    art = b.get("art") if b.get("art") in ARTEN else "versand"
    an = [x for x in (b.get("an") or []) if isinstance(x, dict) and "@" in str(x.get("email") or "")][:60]
    if not an:
        return jsonify(error="Keine Empfänger:in mit E-Mail-Adresse gewählt."), 400
    from bpcore import schrift
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        p = _sees(c, r["project_id"]) if r["project_id"] else None
        P = _payload(c, r)
        d0 = _j(r["data"], {}) or {}
        anh, anl = [], []   # anl: Unterlagen – im Ordner unter „Anlagen“
        if b.get("pdf", True):   # LV ohne Preise – derselbe Druck wie „Drucken“
            pdf, _F = _lv_druck(c, r, P, {**_druck_layout(d0, {}, c), "preise": "leer"})
            anh.append((_pdf_name(P["projekt"], "LV", "", r), pdf, "application/pdf"))
        if b.get("x83", True):
            items = [x for x in d0.get("items") or [] if not x.get("nt")]
            x83 = gaeb.schreiben({"nr": r["nr"], "name": r["name"], "items": items}, "83", None, p["name"] if p else "", "", 0)
            anh.append((_pdf_name(P["projekt"], "LV", "", r).rsplit(".", 1)[0] + ".x83", x83 if isinstance(x83, bytes) else str(x83).encode("utf-8"), "application/xml"))
        d = _lesen(c, i)
    gross = sum(len(x[1]) for x in anh)
    if b.get("unterlagen", True):
        for u in d["unterlagen"]:   # aus dem Projektordner – erst jetzt gelesen
            try:
                roh = _datei_lesen(r["project_id"], u["pfad"])
            except RuntimeError as e:
                return jsonify(error=f"Unterlage „{u['name'][:60]}“ ließ sich nicht lesen: {e}"), 400
            gross += len(roh)
            if gross > MAX_ANHANG:
                return jsonify(error="Die Anhänge sind zusammen zu groß (höchstens etwa 25 MB je Mail) – bitte Unterlagen herausnehmen.", zu_gross=True), 400
            anl.append((_sauber(u["pfad"].rsplit("/", 1)[-1]), roh, "application/pdf" if u["pfad"].lower().endswith(".pdf") else "application/octet-stream"))
    for z in (b.get("anhaenge") or [])[:20]:   # Dateien vom Rechner
        try:
            roh = base64.b64decode(str(z.get("daten") or ""), validate=True)
        except Exception:   # noqa: BLE001 – kaputter Anhang
            return jsonify(error=f"Anhang „{str(z.get('name'))[:60]}“ ist beschädigt."), 400
        gross += len(roh)
        if gross > MAX_ANHANG:
            return jsonify(error="Die Anhänge sind zusammen zu groß (höchstens etwa 25 MB je Mail) – bitte Unterlagen herausnehmen.", zu_gross=True), 400
        anl.append((_sauber(z.get("name")), roh, str(z.get("mime") or "application/octet-stream")[:80]))
    with db.tx() as c:
        cf = mail.conf(c)
        von, vname = konto.absender(c, g.user, cf)
        W0 = _w0(r, p, d, b, cf)
        teile = [(x, *_fuellen(c, W0, b, x, d, art)) for x in an]
        FN = schrift.fuer(c)
        ids = [int(x["contact_id"]) for x in an if str(x.get("contact_id") or "").isdigit()]
        K = {k["id"]: k for k in c.execute(f"SELECT * FROM contacts WHERE id IN ({','.join('?' * len(ids))})", ids).fetchall()} if ids else {}
    ich = (g.user["email"] or "").strip()
    erg = []
    for x, betreff, text, html in teile:   # je Bieter:in eine eigene Mail – niemand sieht die anderen
        try:
            mail.send(cf, x["email"], betreff, text, sender=vname, from_addr=von, attachments=anh + anl, cc=[ich] if b.get("kopie") and ich else None,
                      reply_to=ich or None, html=html)
            erg.append({**x, "ok": True})
        except mail.MailError as e:
            erg.append({**x, "ok": False, "fehler": str(e)})
    jetzt = datetime.now()
    wann = jetzt.strftime("%d.%m.%Y %H:%M")
    ok = [x for x in erg if x["ok"]]
    ablage, ablage_fehler, ordner = [], "", ""
    if ok:   # eigener Ordner je Lauf unter dem LV-Ordner (Leistungsverzeichnis/Gewerk): alles, was rausging, und wer es bekommen hat
        ordner = f"{ARTEN[art]} {jetzt.strftime('%Y-%m-%d')}"
        zeilen = _firmenliste(K, erg, art, wann)
        dateien = [(n, dat, [ordner]) for n, dat, _m in anh] + [
            ("Anschreiben.pdf", _anschreiben_pdf(teile[0][1], teile[0][2], wann, FN), [ordner]),
            ("Angefragte Firmen.pdf", _firmen_pdf(r, W0["projekt"], zeilen, teile[0][1], wann, C.full_name(g.user), FN), [ordner]),
            ("Angefragte Firmen.xlsx", _firmen_xlsx(zeilen), [ordner])] + [(n, dat, [ordner, "Anlagen"]) for n, dat, _m in anl]
        for n, dat, unter in dateien:
            try:   # die Mails sind schon raus – die Ablage darf den Versand nie scheitern lassen
                pfad, fehl = C.projektordner_ablegen({"project_id": r["project_id"], "art": "lv", "gewerk": r["gewerk"] or "", "name": _sauber(n), "unter": unter,
                                                      "datei": base64.b64encode(dat).decode()})
            except Exception as e:   # noqa: BLE001
                pfad, fehl = None, f"Projektordner nicht erreichbar ({type(e).__name__})"
            if pfad:
                ablage.append(pfad)
            elif fehl == "testserver":
                ablage_fehler = "Testserver – nicht im Projektordner abgelegt"
            elif fehl:
                ablage_fehler = fehl
    with db.tx() as c:
        d = _lesen(c, i)
        if ok and art != "erinnerung":   # Stand der Unterlagen: wann zuletzt verschickt (Nachversand zeigt, was sich seitdem geändert hat)
            if b.get("pdf", True):
                d["lv_verschickt"], d["lv_rev"] = wann, r["rev"]
            if b.get("unterlagen", True):
                for u in d["unterlagen"]:
                    u["verschickt"] = wann
        for x in ok:
            y = d["bieter"].setdefault(str(x.get("contact_id") or ""), {}) if x.get("contact_id") else {}
            y.update({"versendet" if art != "erinnerung" else "erinnert": wann, "email": x["email"]})
        if b.get("abgabe"):
            d["abgabe"] = str(b["abgabe"])[:16]
        if b.get("rueckmeldung"):
            d["rueckmeldung"] = str(b["rueckmeldung"])[:16]
        if _frist_falsch(d):
            d["rueckmeldung"] = ""   # schon versendet: eine falsche Frist nicht speichern
        d["laeufe"].append({"datum": wann, "art": art, "wer": C.full_name(g.user), "betreff": teile[0][1], "an": [{"name": x["name"], "email": x["email"], "ok": x["ok"]} for x in erg],
                            "ablage": ablage[:1] and [ablage[0].rsplit("/", 1)[0]], "anlagen": [n for n, _d, _m in anl]})
        _schreiben(c, i, d)
        for x, betreff, text, _h in teile:
            e = next(y for y in erg if y is x or (y["email"] == x["email"]))
            benachrichtigung.protokoll(c, "lvversand", [{"email": x["email"], "name": x.get("name") or "", "contact_id": x.get("contact_id")}], project_id=r["project_id"],
                                       projekt=W0["projekt"], betreff=betreff, inhalt=text, von=C.full_name(g.user), weg="mail",
                                       status="gesendet" if e["ok"] else "fehler", fehler=e.get("fehler") or "", link="ava:")
        if r["status"] in ("", "entwurf", None) and ok:
            c.execute("UPDATE ava_lv SET status='versendet', rev=rev+1 WHERE id=? AND COALESCE(status,'') IN ('', 'entwurf')", (i,))
        C.audit(g.user["name"], "ava", {"versand": "LV an Bieter:innen versendet", "erinnerung": "Bieter:innen erinnert", "nachversand": "Geändertes LV an Bieter:innen"}[art],
                f"LV {r['nr']} {r['name']} · {len(ok)} von {len(erg)}")
        out = _antwort(c, _lv(c, i))
    return jsonify({**out, "ergebnis": [{"name": x["name"], "email": x["email"], "ok": x["ok"], "fehler": x.get("fehler", "")} for x in erg],
                    "ablage": ablage, "ablage_fehler": ablage_fehler, "ordner": ordner})
