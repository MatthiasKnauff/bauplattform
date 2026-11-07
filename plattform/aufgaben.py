"""Aufgaben & Mängel – Mängelverfolgung aus den Bautagesberichten und zentrale Erinnerungen.

Mängel (und „Zu erledigen“, Weisungen) kommen aus den Einträgen des Bautagebuchs (Tabelle items). Erledigt-Haken, Frist und
Firma werden über das Bautagebuch gespeichert (gleiche Rechte, gleiche Erinnerungs-Mail des Bautagebuchs am Fälligkeitstag).

Erinnerungen:
  - aus dem Bautagebuch: Einträge mit Erledigungsdatum (verschickt das Bautagebuch selbst)
  - aus den Bauzeitenplänen: „Firma X kommt (wieder) zur Baustelle“ – Vorlauf einstellbar, Standard 7 Tage (Tabelle erinnerungen)
  - eigene: von Hand angelegt (Tabelle erinnerungen)
Diese App gleicht die Pläne regelmäßig ab und verschickt die Erinnerungen per E-Mail.

/api/maengel                 Liste (scope=mine|all), PUT /api/maengel/<id> {done, due, due_time, company}
/api/maengel.pdf             Mängelliste zum Weitergeben (gefiltert)
/api/erinnerungen            alle Erinnerungen (scope), POST eigene; PUT /api/erinnerungen/<id> {termin, uhrzeit, status}
/api/einstellungen           Vorlauf, Lücke, E-Mail an/aus
/api/bild/<size>/<file>      Foto-Vorschau aus dem Bautagebuch
"""
import io, json, re, threading, time, uuid, urllib.error, urllib.parse, urllib.request
from datetime import date, datetime, timedelta

from flask import Response, g, jsonify, redirect, request

from bpcore import layout, benachrichtigung, briefbogen, db, erinnern, fehler as bpfehler, ical, konto, mail, plan, platform, posteingang, schrift, sso, todo, versionen, vorlagen
import common as C

app = C.make_app(__name__)
KINDS = {"maengel": "Mangel", "zu_erledigen": "Zu erledigen", "weisungen": "Weisung"}
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
DEF = {"vorlauf": 7, "luecke": 10, "mail_plan": True, "uhrzeit": "08:00"}


@app.before_request
def guard():
    p = request.path
    if p.startswith(("/static/", "/bp/")) or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base("aufgaben") + "/")), 401
        return redirect(C.login_url(request.url))
    if not sso.has_app(u, "aufgaben"):
        msg = "Für „Aufgaben & Mängel“ ist dein Konto nicht freigeschaltet."
        if p.startswith("/api/"):
            return jsonify(error=msg), 403
        return (f'{msg} <a href="{C.app_base("portal")}/">Zur Startseite</a>', 403, {"Content-Type": "text/html; charset=utf-8"})
    g.user = u


@app.get("/")
def index():
    return C.page("aufgaben.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


# ---------------------------------------------------------------- Hilfen
def _now():
    return datetime.now().isoformat(timespec="seconds")

def _latin(t):
    """Formularfelder (Entwurf) können nur Latin-1 – der Editor arbeitet ohnehin mit den Originaltexten."""
    t = str(t or "").translate({0x2013: "-", 0x2014: "-", 0x201E: '"', 0x201C: '"', 0x201D: '"', 0x2018: "'", 0x2019: "'", 0x2026: "...", 0x20AC: "EUR"})
    return t.encode("latin-1", "replace").decode("latin-1")



def _j(v, d):
    try:
        x = json.loads(v) if isinstance(v, str) else v
        return x if x is not None else d
    except (TypeError, ValueError):
        return d


def _ids(v):
    try:
        return [int(x) for x in _j(v, [])]
    except (TypeError, ValueError):
        return []


def conf(c):
    r = c.execute("SELECT data FROM bp_store WHERE key='aufgaben'").fetchone()
    d = _j(r["data"], {}) if r else {}
    out = dict(DEF)
    if isinstance(d, dict):
        out["vorlauf"] = int(min(60, max(0, d.get("vorlauf", 7) or 0)))
        out["luecke"] = int(min(90, max(1, d.get("luecke", 10) or 10)))
        out["mail_plan"] = bool(d.get("mail_plan", True))
        out["uhrzeit"] = d.get("uhrzeit") if TIME.match(str(d.get("uhrzeit") or "")) else "08:00"
    return out


def _projects(c):
    """Bautagebuch-Projekte: id → {name, leaders, archived}."""
    return {r["id"]: {"name": r["name"], "leaders": _ids(r["leaders"]), "archived": bool(r["archived"])}
            for r in c.execute("SELECT id, name, leaders, archived FROM projects")}


def _sees(u, p):
    """Darf der Benutzer das Projekt sehen? (wie im Bautagebuch: Administrator, keine Zuständigen eingetragen oder selbst zuständig)"""
    return bool(u["is_admin"]) or not p["leaders"] or u["id"] in p["leaders"]


def _mine(u, p):
    return u["id"] in p["leaders"]


def _scope():
    return "all" if request.args.get("scope") == "all" else "mine"


# ---------------------------------------------------------------- Mängel
@app.get("/api/maengel")
def maengel(scope=None):
    scope = scope or _scope()
    with db.tx() as c:
        P = _projects(c)
        rows = c.execute(f"""SELECT i.id, i.kind, i.text, i.done, i.due, i.due_time, i.company, i.created, i.updated, i.contact_id,
                   r.id AS rid, r.date AS rdate, r.project_id AS pid, ct.name AS contact,
                   (SELECT COUNT(*) FROM images m WHERE m.item_id=i.id) AS nimg,
                   (SELECT m.file FROM images m WHERE m.item_id=i.id ORDER BY m.id LIMIT 1) AS img
            FROM items i JOIN reports r ON r.id=i.report_id LEFT JOIN contacts ct ON ct.id=i.contact_id
            WHERE i.kind IN ({','.join('?' * len(KINDS))}) ORDER BY r.date DESC, i.id""", tuple(KINDS)).fetchall()
    today = date.today().isoformat()
    out = []
    for x in rows:
        p = P.get(x["pid"])
        if not p or not _sees(g.user, p) or (scope == "mine" and not _mine(g.user, p)):
            continue
        st = "erledigt" if x["done"] else "ueberfaellig" if x["due"] and x["due"] < today else "offen"
        out.append({"id": x["id"], "art": x["kind"], "art_n": KINDS[x["kind"]], "text": x["text"] or "", "done": bool(x["done"]), "status": st,
                    "frist": x["due"] or "", "uhrzeit": x["due_time"] or "09:00", "firma": x["company"] or x["contact"] or "",
                    "datum": x["rdate"] or "", "rid": x["rid"], "pid": x["pid"], "projekt": p["name"], "archiviert": p["archived"],
                    "fotos": x["nimg"], "bild": x["img"] or "", "geaendert": x["updated"] or x["created"] or ""})
    return jsonify(out)


@app.put("/api/maengel/<int:i>")
def mangel_edit(i):
    b = request.get_json(silent=True) or {}
    body = {}
    if "done" in b:
        body["done"] = 1 if b["done"] else 0
    if "frist" in b:
        f = str(b["frist"] or "").strip()
        if f and not DATE.match(f):
            return jsonify(error="Das Datum ist ungültig."), 400
        body["due"] = f
    if "uhrzeit" in b and TIME.match(str(b["uhrzeit"] or "")):
        body["due_time"] = b["uhrzeit"]
    if "firma" in b:
        body["company"] = str(b["firma"] or "").strip()[:200]
    if not body:
        return jsonify(ok=True)
    with db.tx() as c:   # Zugriff prüfen wie im Bautagebuch
        r = c.execute("SELECT p.leaders, p.name FROM items i JOIN reports r ON r.id=i.report_id JOIN projects p ON p.id=r.project_id WHERE i.id=?", (i,)).fetchone()
    if not r or not _sees(g.user, {"leaders": _ids(r["leaders"])}):
        return jsonify(error="Nicht gefunden"), 404
    try:
        C.bt_api("PUT", f"/api/items/{i}", body)   # das Bautagebuch speichert (Erinnerung, Protokoll, Rechte)
    except RuntimeError as e:
        return jsonify(error=str(e)), 502
    C.audit(g.user["name"], "inhalt", "Mangel bearbeitet (Mängelliste)", f"{r['name']}: " + ", ".join(f"{k}={v}" for k, v in body.items()))
    return jsonify(ok=True)


@app.get("/api/bild/<int:size>/<path:f>")
def bild(size, f):
    """Foto-Vorschau aus dem Bautagebuch (mit der Anmeldung des Benutzers)."""
    with db.tx() as c:
        tok = sso.current_token(request, c)
    path = f"/api/thumb/{240 if size not in (96, 240) else size}/{urllib.parse.quote(f)}" if size else "/uploads/" + urllib.parse.quote(f)
    req = urllib.request.Request(C.BT_INTERNAL + path, headers={"Cookie": f"{sso.COOKIE}={tok}"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return Response(r.read(), mimetype=r.headers.get("Content-Type", "image/jpeg"), headers={"Cache-Control": "private, max-age=3600"})
    except Exception:   # Foto fehlt oder Bautagebuch kurz weg: Vorschau bleibt leer (wie ein fehlendes Bild)
        return "", 404


@app.get("/api/maengel.pdf")
def maengel_pdf():
    """Mängelliste als PDF – z. B. je Firma zum Weitergeben. Gleiche Filter wie in der App (ids=…)."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Spacer, TableStyle
    from xml.sax.saxutils import escape as X
    want = {int(x) for x in (request.args.get("ids") or "").split(",") if x.isdigit()}
    data = [m for m in maengel_all() if not want or m["id"] in want]
    title = (request.args.get("titel") or "Mängelliste").strip()[:120]
    buf = io.BytesIO()
    with db.tx() as c:
        office = C.kurzname(c)
    st = ParagraphStyle("c", fontName="Helvetica", fontSize=8.5, leading=11)
    sb = ParagraphStyle("b", parent=st, fontName="Helvetica-Bold")
    sh = ParagraphStyle("h", parent=st, fontName="Helvetica-Bold", textColor=colors.white)
    de = lambda d: f"{d[8:10]}.{d[5:7]}.{d[:4]}" if d and len(d) >= 10 else ""
    story = [Paragraph(X(title), ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=15, leading=19)),
             Paragraph(f"{X(office) + ' · ' if office else ''}Stand {datetime.now():%d.%m.%Y} · {len(data)} Einträge · {sum(1 for m in data if not m['done'])} offen",
                       ParagraphStyle("s", parent=st, textColor=colors.HexColor("#6b6f76"))), Spacer(1, 5 * mm)]
    by = {}
    for m in data:
        by.setdefault(m["projekt"], []).append(m)
    W = A4[0] - 30 * mm
    for proj, ms in by.items():
        rows = [[Paragraph(h, sh) for h in ("Nr.", "Mangel / Aufgabe", "Firma", "festgestellt", "Frist", "Status")]]
        for n, m in enumerate(ms, 1):
            stt = {"erledigt": "erledigt", "ueberfaellig": "überfällig", "offen": "offen"}[m["status"]]
            rows.append([Paragraph(str(n), st), Paragraph(X(m["text"]).replace("\n", "<br/>") + (f"<br/><font color='#6b6f76' size='7'>{X(m['art_n'])}{' · ' + str(m['fotos']) + ' Foto(s)' if m['fotos'] else ''}</font>"), st),
                         Paragraph(X(m["firma"]), st), Paragraph(de(m["datum"]), st), Paragraph(de(m["frist"]), sb if m["status"] == "ueberfaellig" else st), Paragraph(stt, st)])
        t = LongTable(rows, colWidths=[W * .06, W * .44, W * .18, W * .11, W * .11, W * .10], repeatRows=1)
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3a3a38")), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
                               ("LINEBELOW", (0, 0), (-1, -1), .25, colors.HexColor("#d9dbe0")), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
        story += [Paragraph(X(proj), ParagraphStyle("p", fontName="Helvetica-Bold", fontSize=11, leading=14, spaceBefore=4, spaceAfter=3)), t, Spacer(1, 6 * mm)]

    def frame(cv, d):
        cv.saveState()
        C.draw_logo(cv, A4[0] - 15 * mm, A4[1] - 6 * mm, 11 * mm, 45 * mm)
        cv.setFont("Helvetica", 7.5); cv.setFillColor(colors.HexColor("#6b6f76"))
        cv.drawString(15 * mm, 9 * mm, title); cv.drawRightString(A4[0] - 15 * mm, 9 * mm, f"Seite {d.page}")
        cv.restoreState()
    SimpleDocTemplate(buf, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=22 * mm, bottomMargin=16 * mm, title=title, author=office or "Bauplattform").build(story, onFirstPage=frame, onLaterPages=frame)
    C.audit(g.user["name"], "export", "Mängelliste als PDF", f"{len(data)} Einträge")
    fn = urllib.parse.quote(re.sub(r"[\\/:*?\"<>|]+", "_", title) + f" {date.today():%Y-%m-%d}.pdf")
    return Response(buf.getvalue(), mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{fn}"})


def maengel_all():
    return maengel("all").get_json()   # Auswahl kommt als ids; sichtbar ist trotzdem nur, was der Benutzer sehen darf


# ---------------------------------------------------------------- Mängelrüge (am Bildschirm ausfüllbares PDF)
GRUND = {   # Mängelrüge immer nach VOB/B – vor oder nach der Abnahme
    "vob4": ("§ 4 Abs. 7 VOB/B", "vor der Abnahme"),
    "vob13": ("§ 13 Abs. 5 VOB/B", "nach der Abnahme (Mängelansprüche)"),
}


def ruege_text(grund, frist, kuendigung=True, auftrag=""):
    """Mustertext nach VOB/B; frist als TT.MM.JJJJ."""
    f = frist or "[Datum]"
    bez = f" (Auftrag {auftrag})" if auftrag else ""
    if grund == "vob13":
        return ("Sehr geehrte Damen und Herren,\n\nan den von Ihnen ausgeführten und abgenommenen Leistungen" + bez + " sind die nachfolgend aufgeführten Mängel aufgetreten. "
                "Gemäß § 13 Abs. 5 Nr. 1 VOB/B verlangen wir hiermit schriftlich die Beseitigung dieser Mängel auf Ihre Kosten. "
                f"Wir setzen Ihnen hierzu eine Frist bis zum {f}. Bitte teilen Sie uns umgehend mit, wann Sie mit den Arbeiten beginnen, und zeigen Sie uns die Beseitigung schriftlich an, damit wir sie gemeinsam abnehmen können.\n\n"
                "Kommen Sie dieser Aufforderung nicht innerhalb der Frist nach, werden wir die Mängel gemäß § 13 Abs. 5 Nr. 2 VOB/B auf Ihre Kosten durch ein anderes Unternehmen beseitigen lassen. "
                "Wir weisen darauf hin, dass der Anspruch auf Beseitigung der gerügten Mängel mit Zugang dieses Schreibens neu zu verjähren beginnt (§ 13 Abs. 5 Nr. 1 Satz 2 VOB/B). "
                "Weitere Ansprüche, insbesondere nach § 13 Abs. 6 und 7 VOB/B, bleiben vorbehalten.")
    t = ("Sehr geehrte Damen und Herren,\n\nbei der Ausführung Ihrer Leistungen" + bez + " wurden die nachfolgend aufgeführten Mängel festgestellt. "
         "Gemäß § 4 Abs. 7 Satz 1 VOB/B sind Sie verpflichtet, mangelhafte Leistungen auf eigene Kosten durch mangelfreie zu ersetzen. "
         f"Wir fordern Sie auf, die Mängel bis zum {f} vollständig zu beseitigen und uns die Beseitigung schriftlich anzuzeigen.\n\n")
    if kuendigung:
        t += ("Wir erklären bereits jetzt, dass wir Ihnen nach fruchtlosem Ablauf dieser Frist den Auftrag für die betroffenen Leistungen gemäß § 4 Abs. 7 Satz 3 "
              "i. V. m. § 8 Abs. 3 VOB/B entziehen und die Mängel auf Ihre Kosten durch ein anderes Unternehmen beseitigen lassen werden. ")
    else:
        t += "Nach fruchtlosem Ablauf der Frist behalten wir uns die Rechte aus § 4 Abs. 7 VOB/B vor. "
    return t + "Ansprüche auf Ersatz eines entstehenden Schadens (§ 4 Abs. 7 Satz 2 VOB/B) und weitere Rechte bleiben vorbehalten."


@app.get("/api/maengelruege/vorlage")
def ruege_vorlage():
    """Daten für den Dialog: Empfänger (aus den Kontakten), Projekt, offene Mängel derselben Firma im Projekt."""
    i = request.args.get("id", type=int)
    with db.tx() as c:
        x = c.execute("""SELECT i.id, i.company, r.project_id AS pid, ct.name AS contact FROM items i JOIN reports r ON r.id=i.report_id
                         LEFT JOIN contacts ct ON ct.id=i.contact_id WHERE i.id=?""", (i,)).fetchone()
        if not x:
            return jsonify(error="Nicht gefunden"), 404
        P = _projects(c)
        if not _sees(g.user, P.get(x["pid"], {"leaders": []})):
            return jsonify(error="Nicht gefunden"), 404
        firma = x["company"] or x["contact"] or ""
        k = c.execute("SELECT * FROM contacts WHERE lower(name)=lower(?) ORDER BY id LIMIT 1", (firma,)).fetchone() if firma else None
    alle = [m for m in maengel("all").get_json() if m["pid"] == x["pid"] and not m["done"] and m["art"] == "maengel"]
    return jsonify(firma=firma, empfaenger={"id": k["id"], "name": k["name"], "person": k["contact_person"] or "", "strasse": k["street"] or "", "ort": " ".join(v for v in (k["zip"], k["city"]) if v),
                                           "email": k["email"] or ""} if k else {"name": firma, "person": "", "strasse": "", "ort": "", "email": ""},
                   maengel=alle, gewaehlt=[m["id"] for m in alle if m["id"] == i or (firma and m["firma"] == firma)], signme=_signme())


def _de(d):
    return f"{d[8:10]}.{d[5:7]}.{d[:4]}" if d and len(d) >= 10 else ""


BRIEF_FELDER = ("Empfaenger", "Datum", "Bearbeiter", "Betreff", "Text", "Maengel", "Tage", "Frist", "Gruss")


def _werte(b):
    """Am Bildschirm geänderte Feldinhalte aus dem Brief-Editor (nur bekannte Felder, Länge begrenzt)."""
    w = b.get("werte") if isinstance(b.get("werte"), dict) else {}
    return {k: str(w[k])[:20000].replace("\r\n", "\n") for k in BRIEF_FELDER if isinstance(w.get(k), str)}


def _brief(pid, projekt, E, auftrag, doc, kopf, grundzeile, text, liste_titel, liste_feld, liste_tip, liste, frist_label, frist, sig=None,
           werte=None, fest=False):
    """Brief an eine Firma als PDF (Mängelrüge, Terminrüge).
    fest=False: Entwurf mit Formularfeldern – Grundlage für den Brief-Editor (Felder werden dort bearbeitet).
    fest=True:  endgültige Fassung ohne Formularfelder – nicht mehr änderbar, Text fließt (bei Bedarf auf eine Folgeseite).
    werte: Feldinhalte aus dem Editor; fehlende Felder bekommen den Mustertext.
    Gibt Puffer, Zeichenfläche u. a. und die Feldinhalte zurück – Anlagen kann der Aufrufer anhängen, dann cv.save()."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas
    from reportlab.pdfbase.pdfmetrics import stringWidth
    with db.tx() as c:
        S = {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings WHERE key='office_name' OR key LIKE 'co\\_%'")}
        p = c.execute("SELECT name, client, street, zip, city FROM projects WHERE id=?", (pid,)).fetchone()
        bogen = briefbogen.holen(c)   # Briefbogen des Büros: Logo und Fußzeile kommen von dort
        FN = schrift.fuer(c)          # Schrift der Briefe (Einstellung des Büros)
    bb = bogen is not None
    RD = briefbogen.raender(bogen) if bb else None   # Satzspiegel passend zum Briefbogen
    de = _de
    office = S.get("office_name") or ""
    kurz = S.get("co_short") or office   # Kurzname, wo der lange Firmenname nicht passt
    absender = ", ".join(v for v in (kurz, S.get("co_street"), " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x)) if v)
    bv = p["name"] + (", " + ", ".join(v for v in (p["street"], " ".join(x for x in (p["zip"], p["city"]) if x)) if v) if p and (p["street"] or p["city"]) else "") if p else projekt
    adr = "\n".join(v for v in (E.get("name"), ("z. Hd. " + E["person"]) if E.get("person") else "", E.get("strasse"), E.get("ort")) if v)
    name = C.full_name(g.user)
    V = {"Empfaenger": adr, "Datum": datetime.now().strftime("%d.%m.%Y"), "Bearbeiter": name,
         "Betreff": f"Bauvorhaben: {bv}" + (f", Auftrag {auftrag}" if auftrag else ""), "Text": text, liste_feld: liste, "Frist": de(frist),
         # Leerzeilen zwischen Gruß und Namen: Platz für die Unterschrift
         "Gruss": "Mit freundlichen Grüßen\n\n\n\n\n\n\n\n\n" + name + (f"\n{kurz}" if kurz else "")}
    for k, v in (werte or {}).items():
        if k in V:
            V[k] = v
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    cv.setTitle(f"{doc} – {projekt}"); cv.setAuthor(office or name)
    W, H = A4
    # DIN 5008 (Form B): 25 mm Heftrand links – auch wenn die Fußzeile des Briefbogens weiter außen beginnt.
    # Rechts so weit wie der Briefbogen (mindestens 10 mm).
    L = max(RD["links"], 25 * mm) if RD else 25 * mm
    R = W - (max(RD["rechts"], 10 * mm) if RD else 20 * mm)
    AL = 25 * mm   # Anschrift im Fenster: Feld ab 20 mm, Schrift 5 mm eingerückt
    form = cv.acroForm
    ink, mute = colors.HexColor("#1e1e1e"), colors.HexColor("#6b6f76")
    unten = (RD["fuss"] + 8 * mm) if RD else (47 if bb else 20) * mm   # tiefste Schreibzeile (Fußzeile des Briefbogens bleibt frei)

    def umbruch(t, w, size):   # Zeilen vorab umbrechen
        out = []
        for para in t.split("\n"):
            cur = ""
            for word in para.split(" "):
                tryl = (cur + " " + word).strip()
                if stringWidth(tryl, FN["n"] if fest else "Helvetica", size) <= w - 6 or not cur:
                    cur = tryl
                else:
                    out.append(cur); cur = word
            out.append(cur)
        return out

    def feld(nm, x, y, w, h, size=10, multi=False, tip=""):
        """Entwurf: Formularfeld. Endgültig: fester Text an derselben Stelle (Kopfbereich)."""
        if fest:
            cv.setFont(FN["n"], size); cv.setFillColor(ink)
            zs = umbruch(V[nm], w, size) if multi else [V[nm].replace("\n", " ")]
            yy = y + h - size * 1.05 - 1 if multi else y + (h - size) / 2 + 1.5
            for z in zs:
                cv.drawString(x, yy, z); yy -= size * 1.2   # bündig mit dem Satzspiegel des Briefbogens
            return
        val = "\n".join(umbruch(V[nm], w, size)) if multi else V[nm]
        form.textfield(name=nm, tooltip=tip or nm, x=x, y=y, width=w, height=h, value=_latin(val), fontName="Helvetica", fontSize=size, borderWidth=0,
                       borderColor=None, fillColor=None, textColor=ink, fieldFlags="multiline" if multi else "", maxlen=100000)

    def unterschrift(y_oben):   # Unterschrift (aus „Mein Konto“) unter der Grußzeile
        if not sig:
            return
        try:
            ir = ImageReader(io.BytesIO(sig)); iw, ih = ir.getSize()
            hh = 30 * mm; ww = min(110 * mm, iw * hh / ih); hh = ww * ih / iw
            cv.drawImage(ir, L + 2 * mm, y_oben - 5 * mm - hh, ww, hh, mask="auto")
        except Exception:   # ohne Unterschriftsbild drucken – unterschreiben geht auch von Hand
            pass

    def fuss():
        if not bb:
            cv.setFont(FN["n"], 7); cv.setFillColor(mute)
            foot = " · ".join(v for v in (kurz, S.get("co_street"), " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x), S.get("co_phone"), S.get("co_email"), S.get("co_web")) if v)
            cv.drawCentredString(W / 2, 10 * mm, foot[:180])

    # Lage der Felder aus dem Druck-Layout (Verwaltung → Büro → Druck-Layouts); Vorgabe wie bisher (DIN 5008 Form B)
    with db.tx() as c:
        LAY = layout.aktiv(c, "maengelruege" if doc == "Mängelrüge" else "terminruege")
        EIG = layout.eigene_werte(c, pid)   # eigene Felder (je Projekt eingetragen)
    foot = " · ".join(v for v in (kurz, S.get("co_street"), " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x), S.get("co_phone"), S.get("co_email"), S.get("co_web")) if v)
    LW = {"buero": office, "absender": absender, "fusszeile": foot, "datum": V["Datum"], "bearbeiter": name, "projekt": projekt, "bauvorhaben": bv,
          "dokument": kopf, "grundlage": grundzeile, "firma": E.get("name") or "", "frist": de(frist), "auftrag": auftrag or "",
          "anzahl": str(len([z for z in str(liste or "").split("\n") if z.strip()])), **{k: v for k, v in EIG.items() if v}}
    seite = [1]

    def kopf_zeichnen():
        layout.zeichnen(cv, LAY, LW, seite[0], H, FN, bb, feld_fn=feld if seite[0] == 1 else None,
                        logo_fn=lambda cv_, r_, t_, h_, w_: C.draw_logo(cv_, r_, t_, h_, w_), umbruch=lambda t, w, sz, fn: umbruch(t, w, sz))
    kopf_zeichnen()
    IB = layout.inhalt(LAY)
    L, R = IB["x"] * mm, (IB["x"] + IB["w"]) * mm
    oben_in = H - IB["y"] * mm
    unten = max(unten, H - (IB["y"] + IB["h"]) * mm)

    def fuss():   # Fußzeile u. a. kommen aus dem Layout (Elemente „auf allen Seiten“)
        pass

    if fest:   # Text fließt: Anschreiben, Liste, Frist, Gruß – bei langen Texten weiter auf der nächsten Seite
        y = [oben_in]

        def platz(h):
            if y[0] - h < unten:
                cv.showPage(); seite[0] += 1; kopf_zeichnen(); y[0] = H - 25 * mm

        def absatz(t, size=9.5, font=None):
            for z in umbruch(t, R - L, size):
                platz(size * 1.25)
                cv.setFont(font or FN["n"], size); cv.setFillColor(ink); cv.drawString(L, y[0] - size, z); y[0] -= size * 1.25

        absatz(V["Text"])
        y[0] -= 4 * mm; platz(12 * mm)
        cv.setFont(FN["b"], 10); cv.setFillColor(ink); cv.drawString(L, y[0] - 10, liste_titel); y[0] -= 6 * mm
        absatz(V[liste_feld])
        y[0] -= 4 * mm; platz(8 * mm)
        cv.setFont(FN["b"], 10); cv.drawString(L, y[0] - 10, frist_label)
        cv.setFont(FN["n"], 10); cv.drawString(L + 44 * mm, y[0] - 10, V["Frist"]); y[0] -= 10 * mm
        gz = V["Gruss"].split("\n")
        platz(len(gz) * 9.5 * 1.25 + 2 * mm)
        unterschrift(y[0])
        absatz(V["Gruss"])
        fuss()
    else:
        k = 0.83 if bb else 1.0
        yt = oben_in + 2 * mm - 58 * mm * k
        feld("Text", L, yt, R - L, 58 * mm * k, 9.5, True, "Anschreiben")
        cv.setFont(FN["b"], 10); cv.setFillColor(ink); cv.drawString(L, yt - 6 * mm, liste_titel)
        yl = yt - 8 * mm - 34 * mm * k
        feld(liste_feld, L, yl, R - L, 34 * mm * k, 9.5, True, liste_tip)
        cv.setFont(FN["b"], 10); cv.drawString(L, yl - 8 * mm, frist_label)
        feld("Frist", L + 42 * mm, yl - 10 * mm, 40 * mm, 7 * mm, 10, tip="Frist")
        yg = yl - 14 * mm
        unterschrift(yg)
        feld("Gruss", L, max(yg - 50 * mm, unten - 2 * mm), 120 * mm, min(50 * mm, yg - unten + 2 * mm), 9.5, True, "Gruß und Unterschrift")
        fuss()
    return buf, cv, W, H, L, R, ink, mm, ImageReader, V


def _bogen(pdf):
    """Briefbogen des Büros unter die erste Seite legen (Anlagen bleiben ohne)."""
    with db.tx() as c:
        bb = briefbogen.holen(c)
    return briefbogen.unterlegen(pdf, bb, 1)


def _sig():
    with db.tx() as c:
        return konto.signatur(c, g.user["id"])


def _versenden(b, art, E, projekt, pid, frist, anzahl, pdf, dateiname, inhalt=""):
    """Rüge per Mail: versand = mich (an mich zum Weiterleiten) | firma (direkt an die Firma, auf Wunsch Kopie an mich).
    Gibt (Hinweis, Fehler, neue Adresse) zurück – das PDF wird in jedem Fall geliefert. Jede Rüge kommt in den
    Benachrichtigungsverlauf des Kontakts (auch „nur PDF“ – dann stellt man sie selbst zu)."""
    v = b.get("versand")
    v = v if v in ("mich", "firma") else "pdf"
    key = "maengelruege" if art == "Mängelrüge" else "terminruege"
    ich = (g.user["email"] or "").strip()
    an = ich if v == "mich" else str(b.get("email") or "").strip()

    def log(status="gesendet", fehler=""):
        with db.tx() as c:
            cid = E.get("id") if isinstance(E.get("id"), int) else None
            if not cid and E.get("name"):
                r = c.execute("SELECT id FROM contacts WHERE lower(name)=lower(?) ORDER BY id LIMIT 1", (E["name"],)).fetchone()
                cid = r["id"] if r else None
            mail_firma = an if v == "firma" else ""
            if not mail_firma and cid:
                r = c.execute("SELECT email FROM contacts WHERE id=?", (cid,)).fetchone()
                mail_firma = (r["email"] or "") if r else ""
            benachrichtigung.protokoll(c, key, [{"contact_id": cid, "email": mail_firma, "name": E.get("name") or ""}], project_id=pid, projekt=projekt,
                                       betreff=f"{art}" + (f" – Frist bis {_de(frist)}" if frist else ""), inhalt=inhalt, von=C.full_name(g.user),
                                       weg={"mich": "weiterleiten", "firma": "mail"}[v] if v != "pdf" else "pdf", status=status, fehler=fehler,
                                       link="aufgaben:#" + ("maengel" if key == "maengelruege" else "termine"))
            return benachrichtigung.unbekannt(c, [an]) if v == "firma" and status == "gesendet" else []

    if v == "pdf":
        log()
        return "", "", ""
    with db.tx() as c:
        cf = mail.conf(c)
        T = vorlagen.alle(c)[key]
        p = c.execute("SELECT name, street, zip, city FROM projects WHERE id=?", (pid,)).fetchone()
    if not an or "@" not in an:
        return "", "Keine E-Mail-Adresse " + ("in deinem Konto." if v == "mich" else "für die Firma angegeben."), ""
    bv = (p["name"] + (", " + ", ".join(x for x in (p["street"], " ".join(y for y in (p["zip"], p["city"]) if y)) if x) if p and (p["street"] or p["city"]) else "")) if p else projekt
    W = {"firma": E.get("name") or "", "bauvorhaben": bv, "projekt": p["name"] if p else projekt, "frist": _de(frist), "anzahl": anzahl,
         "absender": C.full_name(g.user), "buero": cf.get("office_name") or "", "datum": datetime.now().strftime("%d.%m.%Y")}
    cc = [ich] if v == "firma" and b.get("kopie") and ich and ich.lower() != an.lower() else []
    with db.tx() as c:
        text, html = konto.mail_teile(c, g.user, T["text"], W)   # Text und HTML (mit Rich-Signatur)
        von, vname = konto.absender(c, g.user, cf)                # Büro-Absender oder (je Benutzer) die eigene Adresse
    try:
        mail.send(cf, an, vorlagen.fuellen(T["betreff"], W), text, sender=vname, from_addr=von,
                  attachments=[(dateiname, pdf, "application/pdf")], cc=cc, reply_to=ich or None, html=html)
    except mail.MailError as e:
        log("fehler", str(e))
        return "", str(e), ""
    neu = log()
    C.audit(g.user["name"], "mail", f"{art} per E-Mail", f"{projekt} · an {an}" + (f" · Kopie {cc[0]}" if cc else ""))
    return f"per E-Mail an {an}" + (" (Kopie an dich)" if cc else ""), "", (neu[0] if neu else "")


def _pdf_antwort(buf, fn, hinweis, fehler, neu=""):
    h = {"Content-Disposition": f"inline; filename*=UTF-8''{urllib.parse.quote(fn)}"}
    if neu:
        h["X-Neue-Adresse"] = urllib.parse.quote(neu)
    if hinweis:
        h["X-Mail"] = urllib.parse.quote(hinweis)
    if fehler:
        h["X-Mail-Fehler"] = urllib.parse.quote(fehler)
    return Response(buf, mimetype="application/pdf", headers=h)


def _signme(c=None):
    """Unterschreiben mit sign-me (D-Trust) in den Büro-Einstellungen eingeschaltet?"""
    def lesen(c):
        r = c.execute("SELECT value FROM settings WHERE key='signme'").fetchone()
        return bool(r and r["value"] == "1")
    if c is not None:
        return lesen(c)
    with db.tx() as c:
        return lesen(c)


def _rueckgabe():
    """Anfrage als JSON oder (beim Zurückgeben des signierten PDFs) als Formular mit „body“ und „signiert“."""
    if request.files.get("signiert"):
        try:
            b = json.loads(request.form.get("body") or "{}")
        except ValueError:
            b = {}
        return (b if isinstance(b, dict) else {}), request.files["signiert"].read()[:30 * 1024 * 1024]
    return (request.get_json(silent=True) or {}), None


def _signatur_pruefen(signiert, original):
    if not signiert:
        return {"ok": False, "fehler": "Bitte das unterschriebene PDF wählen.", "signaturen": []}
    if not _signme():
        return {"ok": False, "fehler": "Das Unterschreiben mit sign-me ist in den Büro-Einstellungen ausgeschaltet.", "signaturen": []}
    from bpcore import pdfsignatur
    try:
        return pdfsignatur.pruefen(signiert, original)
    except Exception as e:   # z. B. fehlende Bibliothek
        return {"ok": False, "fehler": f"Die Signatur ließ sich nicht prüfen ({e}).", "signaturen": []}


def _entwurf_oder_druck(schritt, pdf, felder, fn):
    """entwurf: JSON mit dem PDF (Formularfelder) und den Feldinhalten für den Brief-Editor; drucken: endgültiges PDF ohne Versand."""
    if schritt == "entwurf":
        import base64
        return jsonify(pdf=base64.b64encode(pdf).decode(), felder=felder, datei=fn)
    return _pdf_antwort(pdf, fn, "", "")


@app.post("/api/maengelruege")
def ruege_pdf():
    """Mängelrüge: Entwurf für den Brief-Editor, Ausdruck oder Versand (auch des mit sign-me unterschriebenen PDFs)."""
    b, signiert = _rueckgabe()
    ids = [int(x) for x in b.get("ids") or [] if str(x).isdigit()]
    ms = [m for m in maengel("all").get_json() if m["id"] in ids and m["art"] == "maengel"]
    if not ms:
        return jsonify(error="Bitte mindestens einen Mangel wählen."), 400
    E = b.get("empfaenger") if isinstance(b.get("empfaenger"), dict) else {}
    frist = str(b.get("frist") or "").strip()
    grund, grund_n = GRUND.get(b.get("grund"), GRUND["vob4"])
    liste = "\n".join(f"{n}. {m['text'].strip()}" + (f"  (festgestellt am {_de(m['datum'])})" if m["datum"] else "") for n, m in enumerate(ms, 1))
    auftrag = str(b.get("auftrag") or "").strip()[:80]
    text = (b.get("text") or "").strip() or ruege_text(b.get("grund") if b.get("grund") in GRUND else "vob4", _de(frist), b.get("kuendigung", True) is not False, auftrag)
    schritt = b.get("schritt") if b.get("schritt") in ("entwurf", "drucken", "pruefen", "senden") else "senden"
    buf, cv, W, H, L, R, ink, mm, ImageReader, felder = _brief(ms[0]["pid"], ms[0]["projekt"], E, auftrag, "Mängelrüge", "Mängelrüge nach VOB/B",
                                                      f"Grundlage: {grund} – {grund_n}.",
                                                      text, "Festgestellte Mängel", "Maengel", "Mängel (Liste ergänzbar)", liste, "Frist zur Beseitigung:", frist, sig=_sig(),
                                                      werte=_werte(b), fest=schritt != "entwurf")
    if b.get("fotos"):   # Anlage: Fotos zu den Mängeln
        with db.tx() as c:
            tok = sso.current_token(request, c)
            imgs = c.execute(f"SELECT item_id, file FROM images WHERE item_id IN ({','.join('?' * len(ms))}) ORDER BY item_id, id", tuple(m["id"] for m in ms)).fetchall()
        pos, nr = 0, {m["id"]: n for n, m in enumerate(ms, 1)}
        for im in imgs:
            try:
                req = urllib.request.Request(C.BT_INTERNAL + "/uploads/" + urllib.parse.quote(im["file"]), headers={"Cookie": f"{sso.COOKIE}={tok}"})
                with urllib.request.urlopen(req, timeout=20) as r:
                    ir = ImageReader(io.BytesIO(r.read()))
            except Exception as e:
                bpfehler.still("aufgaben", "Mängelrüge: Foto für die Anlage nicht geladen", e)
                continue
            if pos % 2 == 0:
                cv.showPage(); cv.setFont("Helvetica-Bold", 11); cv.setFillColor(ink); cv.drawString(L, H - 18 * mm, "Anlage – Fotos zu den Mängeln")
            iw, ih = ir.getSize(); bw, bh = R - L, (H - 50 * mm) / 2 - 12 * mm
            sc = min(bw / iw, bh / ih); y0 = H - 28 * mm - (pos % 2) * (bh + 14 * mm)
            cv.drawImage(ir, L, y0 - ih * sc, iw * sc, ih * sc)
            cv.setFont("Helvetica", 8.5); cv.drawString(L, y0 - ih * sc - 5 * mm, f"Mangel {nr[im['item_id']]}")
            pos += 1
    cv.save()
    buf = io.BytesIO(_bogen(buf.getvalue()))
    fn = re.sub(r"[\\/:*?\"<>|]+", "_", f"Mängelrüge {E.get('name') or ''} {date.today():%Y-%m-%d}") + ".pdf"
    if schritt == "pruefen" or signiert:   # mit sign-me unterschrieben: Signatur und Inhalt prüfen
        P = _signatur_pruefen(signiert, buf.getvalue())
        if schritt == "pruefen" or not P["ok"]:
            return jsonify(P), (200 if schritt == "pruefen" else 400)
        buf = io.BytesIO(signiert); fn = fn[:-4] + " (signiert).pdf"
    if schritt != "senden":
        return _entwurf_oder_druck(schritt, buf.getvalue(), felder, fn)
    if b.get("frist_eintragen") and frist:
        for m in ms:
            if m["frist"] != frist:
                try:
                    C.bt_api("PUT", f"/api/items/{m['id']}", {"due": frist})
                except RuntimeError:
                    pass
    C.audit(g.user["name"], "export", "Mängelrüge erstellt", f"{ms[0]['projekt']} · {E.get('name') or ''} · {len(ms)} Mängel")
    hinweis, fehler, neu = _versenden(b, "Mängelrüge", E, ms[0]["projekt"], ms[0]["pid"], frist, len(ms), buf.getvalue(), fn, inhalt=("Mit sign-me qualifiziert signiert.\n" if signiert else "") + (felder.get("Maengel") or liste))
    return _pdf_antwort(buf.getvalue(), fn, hinweis, fehler, neu)


# ---------------------------------------------------------------- Gespeicherte Schreiben (Rügen, die noch nicht versendet sind)
def _bkey(i=""):
    return f"brief:{g.user['id']}:{i}"


@app.route("/api/briefe", methods=["GET", "POST"])
def briefe():
    """GET: meine gespeicherten, noch nicht versendeten Schreiben · POST {id?, art, titel, url, body}: speichern."""
    with db.tx() as c:
        if request.method == "GET":
            rows = c.execute("SELECT key, data, updated FROM bp_store WHERE key LIKE ? ORDER BY updated DESC", (_bkey() + "%",)).fetchall()
            out, sm = [], _signme(c)
            for r in rows:
                try:
                    d = json.loads(r["data"])
                except ValueError:
                    continue
                out.append({"id": r["key"].rsplit(":", 1)[1], "titel": d.get("titel"), "url": d.get("url"), "body": d.get("body") or {},
                            "firma": ((d.get("body") or {}).get("empfaenger") or {}).get("name") or "", "projekt": d.get("projekt") or "", "stand": r["updated"], "signme": sm})
            return jsonify(out)
        b = request.get_json(silent=True) or {}
        if b.get("url") not in ("api/maengelruege", "api/terminruege") or not isinstance(b.get("body"), dict):
            return jsonify(error="Unbekanntes Schreiben"), 400
        i = re.sub(r"[^a-z0-9]", "", str(b.get("id") or ""))[:16] or uuid.uuid4().hex[:12]
        data = json.dumps({"titel": str(b.get("titel") or "Schreiben")[:60], "url": b["url"], "body": b["body"], "projekt": str(b.get("projekt") or "")[:200]}, ensure_ascii=False)
        if len(data) > 400000:
            return jsonify(error="Das Schreiben ist zu lang."), 400
        konto._put(c, _bkey(i), data, g.user["name"])
    return jsonify(ok=True, id=i)


@app.delete("/api/briefe/<i>")
def brief_weg(i):
    with db.tx() as c:
        c.execute("DELETE FROM bp_store WHERE key=?", (_bkey(re.sub(r"[^a-z0-9]", "", i)[:16]),))
    return jsonify(ok=True)


# ---------------------------------------------------------------- Termine: Firmen laut Bauzeitenplan nicht anwesend
TAGE_ZURUECK = 120


@app.get("/api/termine")
def termine(scope=None):
    """Berichtstage, an denen eine Firma laut Bauzeitenplan hätte da sein sollen, aber nicht als anwesend eingetragen ist.
    status offen = vom Bauleiter nicht bestätigt, fehlt = als „nicht da“ bestätigt. „nicht nötig“ und nachgetragene Anwesenheit fallen heraus."""
    scope = scope or _scope()
    ab = (date.today() - timedelta(days=TAGE_ZURUECK)).isoformat()
    heute = date.today().isoformat()
    out = []
    with db.tx() as c:
        P = _projects(c)
        firms = plan.firm_map(c)
        pids = [r["project_id"] for r in c.execute("SELECT DISTINCT project_id FROM gantt_projects WHERE project_id IS NOT NULL")]
        for pid in pids:
            p = P.get(pid)
            if not p or p["archived"] or not _sees(g.user, p) or (scope == "mine" and not _mine(g.user, p)):
                continue
            pl = plan.plans(c, pid)
            for r in c.execute("SELECT id, date FROM reports WHERE project_id=? AND date>=? AND date<=? ORDER BY date", (pid, ab, heute)).fetchall():
                for e in plan.soll_ist(c, r["id"], pid, r["date"], firms=firms, plan_list=pl):
                    if e["status"] == "fehlt" or (e["status"] == "offen" and r["date"] < heute):   # heutiger Bericht ist evtl. noch in Arbeit
                        out.append({"id": f"{r['id']}:{e['key']}", "rid": r["id"], "datum": r["date"], "pid": pid, "projekt": p["name"], "firma": e["firma"], "key": e["key"],
                                    "contact_id": e["contact_id"], "gw": e["gw"], "leistungen": e["leistungen"], "plan": e["plan"], "status": e["status"],
                                    "von": e.get("von", ""), "am": e.get("am", "")})
    out.sort(key=lambda x: (x["projekt"].lower(), x["firma"].lower(), x["datum"]))
    return jsonify(out)


@app.put("/api/termine/<int:rid>")
def termin_set(rid):
    b = request.get_json(silent=True) or {}
    firma, st = str(b.get("firma") or "").strip().lower()[:200], b.get("status")
    if not firma or st not in ("fehlt", "nein", "da", "offen"):
        return jsonify(error="Ungültige Angabe"), 400
    with db.tx() as c:
        r = c.execute("SELECT project_id FROM reports WHERE id=?", (rid,)).fetchone()
        p = _projects(c).get(r["project_id"]) if r else None
        if not p or not _sees(g.user, p):
            return jsonify(error="Nicht gefunden"), 404
        old = c.execute("SELECT status FROM soll_anwesend WHERE report_id=? AND firma=?", (rid, firma)).fetchone()
        c.execute("DELETE FROM soll_anwesend WHERE report_id=? AND firma=?", (rid, firma))
        if st != "offen":
            c.execute("INSERT INTO soll_anwesend(report_id, firma, status, notiz, geaendert, geaendert_von) VALUES(?,?,?,?,?,?)",
                      (rid, firma, st, str(b.get("notiz") or "")[:500], datetime.now().isoformat(timespec="seconds"), g.user["name"]))
    return jsonify(ok=True, vorher=old["status"] if old else "offen")


def terminruege_text(frist, kuendigung=True, auftrag="", tage=True, verzug=False):
    """Mustertext der Terminrüge – Grund: fehlende Besetzung an Tagen (tage) und/oder Rückstand laut Arbeitsfortschritt (verzug)."""
    f = frist or "[Datum]"
    bez = f" (Auftrag {auftrag})" if auftrag else ""
    t = "Sehr geehrte Damen und Herren,\n\n"
    if tage:
        t += ("nach dem vereinbarten Bauzeitenplan hätten Sie Ihre Leistungen" + bez + " an den unten genannten Tagen auf der Baustelle "
              "ausführen müssen. An diesen Tagen waren Sie nicht bzw. nicht ausreichend auf der Baustelle vertreten. ")
    if verzug:
        t += (("Außerdem liegen" if tage else "Nach dem vereinbarten Bauzeitenplan und dem tatsächlichen Arbeitsfortschritt liegen") + " Sie mit den unten genannten Leistungen"
              + ("" if tage else bez) + " erheblich hinter dem Plan zurück. ")
    t += ("Die Arbeitskräfte und Geräte sind damit so unzureichend, dass die Ausführungsfristen offenbar nicht eingehalten werden können.\n\n"
          f"Wir fordern Sie gemäß § 5 Abs. 3 VOB/B auf, unverzüglich Abhilfe zu schaffen und die Arbeiten spätestens bis zum {f} mit ausreichender Besetzung "
          + ("wieder aufzunehmen bzw. fortzuführen" if tage and not verzug else "fortzuführen, sodass der Rückstand aufgeholt wird und die vereinbarten Fristen eingehalten werden")
          + ". Bitte bestätigen Sie uns kurzfristig schriftlich, wann und mit wie vielen Arbeitskräften Sie die Arbeiten fortsetzen.\n\n")
    if kuendigung:
        t += ("Wir erklären bereits jetzt, dass wir Ihnen nach fruchtlosem Ablauf dieser Frist den Auftrag für die betroffenen Leistungen gemäß § 5 Abs. 4 "
              "i. V. m. § 8 Abs. 3 VOB/B entziehen werden. ")
    return t + "Ansprüche auf Ersatz des entstehenden Schadens (§ 6 Abs. 6 VOB/B) und weitere Rechte bleiben vorbehalten."


@app.get("/api/verzug")
def verzug_api():
    """Vorgänge im Verzug laut gemeldetem Arbeitsfortschritt (je Projekt ab dessen Schwelle; ?alle=1 jeder Rückstand)."""
    scope = _scope()
    alle = request.args.get("alle") == "1"
    gid, uid = request.args.get("gid"), request.args.get("uid", type=int)
    with db.tx() as c:
        P = _projects(c)
        pids = [r["project_id"] for r in c.execute("SELECT DISTINCT project_id FROM gantt_projects WHERE project_id IS NOT NULL")
                if (p := P.get(r["project_id"])) and not p["archived"] and _sees(g.user, p) and (scope != "mine" or gid or _mine(g.user, p))]
        L = todo.verzug(c, pids, alle=alle or bool(gid))
        sw = {pid: todo.schwelle(c, pid) for pid in pids}
        R = todo.regeln(c)["terminruege"]["wert"] or 5
        eig = todo.schwellen(c)
    if gid:
        L = [x for x in L if x["gantt_id"] == gid and (uid is None or x["uid"] == uid)]
    for x in L:
        x["projekt"] = P[x["pid"]]["name"]
        x["id"] = f"{x['gantt_id']}:{x['uid']}"
    return jsonify(vorgaenge=L, schwellen=sw, standard=R, eigene=eig)


@app.put("/api/verzug/schwelle")
def verzug_schwelle():
    """Ab wie vielen Arbeitstagen Verzug eine Terminrüge vorgeschlagen wird – für ein Projekt (tage leer = Standard) oder als Standard (pid leer)."""
    b = request.get_json(silent=True) or {}
    pid, tage = b.get("pid"), b.get("tage")
    if tage not in (None, "") and not (isinstance(tage, int) and 1 <= tage <= 120):
        return jsonify(error="Bitte 1 bis 120 Arbeitstage."), 400
    with db.tx() as c:
        if isinstance(pid, int):
            p = _projects(c).get(pid)
            if not p or not _sees(g.user, p):
                return jsonify(error="Nicht gefunden"), 404
            todo.schwelle_setzen(c, pid, tage or None, g.user["name"])
        else:
            todo.regeln_setzen(c, {"terminruege": {"wert": tage or 5}}, g.user["name"])
    return jsonify(ok=True)


@app.get("/api/terminruege/vorlage")
def terminruege_vorlage():
    pid, firma = request.args.get("pid", type=int), (request.args.get("firma") or "").strip().lower()
    rows = [t for t in termine("all").get_json() if t["pid"] == pid and t["key"] == firma]
    vz = _verzug_rows(pid, firma)
    if not rows and not vz:   # frei (über „Neu“): Rückstand selbst beschreiben
        with db.tx() as c:
            p = _projects(c).get(pid)
        if not p or not _sees(g.user, p) or not firma:
            return jsonify(error="Projekt oder Firma fehlt."), 404
        r0 = {"projekt": p["name"], "firma": request.args.get("firma", "").strip()}
    else:
        r0 = rows[0] if rows else vz[0]
    with db.tx() as c:
        k = c.execute("SELECT * FROM contacts WHERE id=?", (r0["contact_id"],)).fetchone() if r0.get("contact_id") else None
        k = k or c.execute("SELECT * FROM contacts WHERE lower(name)=? ORDER BY id LIMIT 1", (firma,)).fetchone()
    E = {"id": k["id"], "name": k["name"], "person": k["contact_person"] or "", "strasse": k["street"] or "", "ort": " ".join(v for v in (k["zip"], k["city"]) if v), "email": k["email"] or ""} if k else {"name": r0["firma"], "person": "", "strasse": "", "ort": "", "email": ""}
    return jsonify(empfaenger=E, tage=rows, verzug=vz, projekt=r0["projekt"], signme=_signme())


def _verzug_rows(pid, firma):
    """Rückstand einer Firma im Projekt laut Arbeitsfortschritt (jeder Vorgang mit Verzug > 0, „ab_schwelle“ markiert)."""
    with db.tx() as c:
        p = _projects(c).get(pid)
        if not p or not _sees(g.user, p):
            return []
        L = [x for x in todo.verzug(c, [pid], alle=True) if x["key"] == firma]
    for x in L:
        x["projekt"], x["id"], x["ab_schwelle"] = p["name"], f"{x['gantt_id']}:{x['uid']}", x["verzug"] >= x["schwelle"]
    return L


@app.post("/api/terminruege")
def terminruege_pdf():
    """Terminrüge (Behinderung durch fehlende Besetzung, VOB/B § 5 Abs. 3 und 4): Entwurf, Ausdruck oder Versand."""
    b, signiert = _rueckgabe()
    pid, firma = b.get("pid"), str(b.get("firma") or "").strip().lower()
    want, vwant = set(b.get("ids") or []), set(b.get("vids") or [])
    rows = [t for t in termine("all").get_json() if t["pid"] == pid and t["key"] == firma and t["id"] in want] if want else []
    vz = [x for x in _verzug_rows(pid, firma) if x["id"] in vwant] if vwant else []
    frei = [z.strip()[:300] for z in str(b.get("frei") or "").splitlines() if z.strip()][:30]   # selbst beschriebener Rückstand
    if not rows and not vz and not frei:
        return jsonify(error="Bitte mindestens einen Tag, einen Vorgang im Verzug oder den Rückstand in eigenen Worten angeben."), 400
    if rows or vz:
        r0 = rows[0] if rows else vz[0]
    else:
        with db.tx() as c:
            p = _projects(c).get(pid)
        if not p or not _sees(g.user, p):
            return jsonify(error="Projekt nicht gefunden"), 404
        r0 = {"projekt": p["name"]}
    E = b.get("empfaenger") if isinstance(b.get("empfaenger"), dict) else {}
    frist = str(b.get("frist") or "").strip()
    auftrag = str(b.get("auftrag") or "").strip()[:80]
    text = (b.get("text") or "").strip() or terminruege_text(_de(frist), b.get("kuendigung", True) is not False, auftrag, tage=bool(rows), verzug=bool(vz) or bool(frei))
    liste = "\n".join([f"{_wd(t['datum'])}: laut Bauzeitenplan {', '.join(t['leistungen'])[:160]}" for t in rows]
                      + [f"{x['vorgang'][:90]}: geplant {_de(x['s'])}–{_de(x['f'])}, Stand {_de(date.today().isoformat())} {x['ist']} % statt {x['soll']} % "
                         f"(Rückstand ca. {x['verzug']:g} Arbeitstage)" for x in vz] + frei)
    schritt = b.get("schritt") if b.get("schritt") in ("entwurf", "drucken", "pruefen", "senden") else "senden"
    buf, cv, *_, felder = _brief(pid, r0["projekt"], E, auftrag, "Terminrüge", "Aufforderung zur Abhilfe nach § 5 Abs. 3 VOB/B",
                         "Grundlage: § 5 Abs. 3 und 4 VOB/B (setzt vereinbarte Vertragsfristen voraus).",
                         text, ("Rückstand" if not rows else "Tage ohne Besetzung") if not vz else "Rückstand laut Bauzeitenplan" if not rows else "Tage ohne Besetzung und Rückstand",
                         "Tage", "Tage (Liste ergänzbar)", liste, "Frist zur Abhilfe:", frist, sig=_sig(),
                         werte=_werte(b), fest=schritt != "entwurf")
    cv.save()
    buf = io.BytesIO(_bogen(buf.getvalue()))
    fn = re.sub(r"[\\/:*?\"<>|]+", "_", f"Terminrüge {E.get('name') or ''} {date.today():%Y-%m-%d}") + ".pdf"
    if schritt == "pruefen" or signiert:   # mit sign-me unterschrieben: Signatur und Inhalt prüfen
        P = _signatur_pruefen(signiert, buf.getvalue())
        if schritt == "pruefen" or not P["ok"]:
            return jsonify(P), (200 if schritt == "pruefen" else 400)
        buf = io.BytesIO(signiert); fn = fn[:-4] + " (signiert).pdf"
    if schritt != "senden":
        return _entwurf_oder_druck(schritt, buf.getvalue(), felder, fn)
    if b.get("fehlt_bestaetigen"):
        with db.tx() as c:
            for t in rows:
                if t["status"] == "offen":
                    c.execute("INSERT INTO soll_anwesend(report_id, firma, status, notiz, geaendert, geaendert_von) VALUES(?,?,?,?,?,?) ON CONFLICT (report_id, firma) DO NOTHING",
                              (t["rid"], t["key"], "fehlt", "Terminrüge", datetime.now().isoformat(timespec="seconds"), g.user["name"]))
    C.audit(g.user["name"], "export", "Terminrüge erstellt", f"{r0['projekt']} · {E.get('name') or ''} · {len(rows)} Tage · {len(vz)} Vorgänge im Verzug")
    hinweis, fehler, neu = _versenden(b, "Terminrüge", E, r0["projekt"], pid, frist, len(rows) or len(vz), buf.getvalue(), fn, inhalt=("Mit sign-me qualifiziert signiert.\n" if signiert else "") + (felder.get("Tage") or liste))
    return _pdf_antwort(buf.getvalue(), fn, hinweis, fehler, neu)


# ---------------------------------------------------------------- Bauzeitenpläne → „Firma kommt zur Baustelle“
def _firm_names(c):
    out = {}
    for r in c.execute("SELECT id, name, extra FROM contacts"):
        gid = (_j(r["extra"], {}) or {}).get("gid")
        out[gid or f"c{r['id']}"] = r["name"]
    return out


def einsaetze(data, firms, luecke):
    """Einsätze je Firma aus einem Plan: zusammenhängende Arbeiten (Lücke ≤ luecke Tage) → [{firma, start, ende, leistungen}]."""
    tasks = {t.get("uid"): t for t in (data.get("tasks") or []) if isinstance(t, dict)}
    trades = data.get("trades") or {}
    by = {}
    for s in data.get("sched") or []:
        t = tasks.get(s.get("uid"))
        if not t or s.get("g") or not t.get("dur") or not s.get("s"):
            continue
        gw = (t.get("gw") or "").strip()
        tr = trades.get(gw) or {}
        firm = firms.get(tr.get("firm") or "") or ""
        res = (t.get("res") or "").strip()
        if not firm and res and res != (tr.get("craft") or "").strip():
            firm = res
        if not firm and not gw:
            continue
        key = firm or "gw:" + gw
        by.setdefault(key, {"firma": firm, "gw": gw, "list": []})["list"].append((s["s"], s["f"], t.get("name") or ""))
    out = []
    for key, v in by.items():
        cur = None
        for s, f, n in sorted(v["list"]):
            if cur and s <= (date.fromisoformat(cur["ende"]) + timedelta(days=luecke)).isoformat():
                cur["ende"] = max(cur["ende"], f); cur["leistungen"].append(n)
            else:
                cur = {"key": key, "firma": v["firma"], "gw": v["gw"], "start": s, "ende": f, "leistungen": [n]}
                out.append(cur)
    for e in out:
        e["nr"] = sum(1 for x in out if x["key"] == e["key"] and x["start"] < e["start"]) + 1
    return out


def _wd(d):
    return ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][date.fromisoformat(d).weekday()] + " " + f"{d[8:10]}.{d[5:7]}.{d[:4]}"


def sync_plans(c):
    """Erinnerungen aus allen Bauzeitenplänen anlegen/nachführen. Vergangene Einsätze werden nicht angelegt; entfallene markiert."""
    cf = conf(c)
    firms = _firm_names(c)
    users = {r["name"].lower(): r["id"] for r in c.execute("SELECT id, name FROM users WHERE active=1")}
    admins = [r["id"] for r in c.execute("SELECT id FROM users WHERE is_admin=1 AND active=1")]
    P = _projects(c)
    today = date.today().isoformat()
    seen = set()
    gueltige = {}   # je Projekt zählt nur die gültige Version des Bauzeitenplans – die Erinnerungen der anderen entfallen
    for g_ in c.execute("SELECT id, name, project_id, data, updated_by FROM gantt_projects").fetchall():
        data = _j(g_["data"], {})
        if not isinstance(data, dict) or not data.get("sched") or data.get("archived"):
            continue
        if g_["project_id"]:
            if g_["project_id"] not in gueltige:
                gueltige[g_["project_id"]] = plan.gueltiger_plan(c, g_["project_id"])
            if gueltige[g_["project_id"]] != g_["id"]:
                continue
        p = P.get(g_["project_id"]) if g_["project_id"] else None
        if p and p["archived"]:
            continue
        rec = (p["leaders"] if p and p["leaders"] else []) or ([users[g_["updated_by"].lower()]] if (g_["updated_by"] or "").lower() in users else []) or admins
        for e in einsaetze(data, firms, cf["luecke"]):
            if e["start"] < today:
                continue
            key = f"plan:{g_['id']}:{e['key']}:{e['nr']}"
            seen.add(key)
            wer = e["firma"] or f"Gewerk {e['gw']} (Firma noch offen)"
            titel = f"{wer} kommt {'zum ersten Mal' if e['nr'] == 1 else 'wieder'} auf die Baustelle – {_wd(e['start'])}"
            text = (f"{g_['name']}: {', '.join(dict.fromkeys(e['leistungen']))[:600]}\nZeitraum {_wd(e['start'])} bis {_wd(e['ende'])}."
                    + ("" if e["firma"] else "\nFür dieses Gewerk ist im Bauzeitenplan noch keine Firma eingetragen."))
            termin = (date.fromisoformat(e["start"]) - timedelta(days=cf["vorlauf"])).isoformat()
            old = c.execute("SELECT * FROM erinnerungen WHERE schluessel=?", (key,)).fetchone()
            daten = json.dumps({"firma": e["firma"], "gw": e["gw"], "start": e["start"], "ende": e["ende"], "nr": e["nr"], "plan": g_["name"]}, ensure_ascii=False)
            if not old:
                c.execute("""INSERT INTO erinnerungen(quelle, schluessel, project_id, gantt_id, titel, text, termin, uhrzeit, ereignis, empfaenger, daten, erstellt, erstellt_von)
                             VALUES('plan',?,?,?,?,?,?,?,?,?,?,?,?)""",
                          (key, g_["project_id"], g_["id"], titel, text, max(termin, today), cf["uhrzeit"], e["start"], json.dumps(rec), daten, _now(), "Bauzeitenplan"))
            else:
                upd = {"titel": titel, "text": text, "ereignis": e["start"], "daten": daten, "empfaenger": json.dumps(rec)}
                if old["status"] == "entfallen":
                    upd["status"] = "offen"
                if not old["manuell"] and old["status"] != "erledigt" and old["termin"] != termin and old["ereignis"] != e["start"]:
                    upd["termin"] = max(termin, today); upd["gesendet"] = ""   # Termin im Plan verschoben → neu erinnern
                if any(str(old[k]) != str(v) for k, v in upd.items()):
                    c.execute(f"UPDATE erinnerungen SET {', '.join(k + '=?' for k in upd)}, geaendert=? WHERE id=?", (*upd.values(), _now(), old["id"]))
    for r in c.execute("SELECT id, schluessel, ereignis FROM erinnerungen WHERE quelle='plan' AND status='offen'").fetchall():
        if r["schluessel"] not in seen and (r["ereignis"] or "") >= today:
            c.execute("UPDATE erinnerungen SET status='entfallen', geaendert=? WHERE id=?", (_now(), r["id"]))   # im Plan nicht mehr vorhanden


def send_due(now=None):
    """Fällige Erinnerungen (Plan und eigene) per E-Mail verschicken. Gibt die Zahl der Mails zurück."""
    now = now or datetime.now()
    today, hhmm = now.date().isoformat(), now.strftime("%H:%M")
    with db.tx() as c:
        cf, mc = conf(c), mail.conf(c)
        if not mail.configured(mc):
            return 0
        rows = [r for r in c.execute("SELECT * FROM erinnerungen WHERE status='offen' AND gesendet='' AND termin!='' AND termin<=?", (today,)).fetchall()
                if (r["termin"] < today or (r["uhrzeit"] or "08:00") <= hhmm) and (r["quelle"] != "plan" or cf["mail_plan"])]
        users = {r["id"]: r for r in c.execute("SELECT id, name, vorname, email FROM users WHERE active=1")}
    link = platform.link("aufgaben", "#erinnerungen", mc)
    by = {}
    for r in rows:
        for uid in _ids(r["empfaenger"]):
            by.setdefault(uid, []).append(r)
    sent = 0
    for uid, rs in by.items():
        u = users.get(uid)
        if not u or not u["email"]:
            continue
        with db.tx() as c:   # „reservieren“, damit zwei Prozesse nicht doppelt senden
            mine = [r for r in rs if c.execute("UPDATE erinnerungen SET gesendet=? WHERE id=? AND (gesendet='' OR gesendet=?)", (today, r["id"], today)).rowcount == 1]
        if not mine:
            continue
        lines = [f"• {r['titel']}\n  {r['text'].replace(chr(10), chr(10) + '  ')}"
                 + (f"\n  {platform.link('aufgaben', '#erinnerung-' + str(r['id']), mc)}" if link else "") for r in mine]
        body = (f"Hallo {u['vorname'] or u['name']},\n\nErinnerung aus der Bauplattform:\n\n" + "\n\n".join(lines)
                + ("\n\nAlle Erinnerungen und zum Neu-Terminieren: " + link if link else "") + "\n")
        try:
            mail.send(mc, u["email"], f"Erinnerung: {mine[0]['titel']}" if len(mine) == 1 else f"Bauplattform – {len(mine)} Erinnerungen", body)
            sent += 1
        except mail.MailError as e:
            # ungültige Adresse: nicht alle 5 Minuten erneut versuchen – das führt bei Microsoft 365 zur Sperre des Postfachs
            with db.tx() as c:
                c.executemany("UPDATE erinnerungen SET gesendet=? WHERE id=?", [("fehler" if e.dauerhaft else "", r["id"]) for r in mine])
            if e.dauerhaft:
                C.audit("System", "mail", "Erinnerung nicht zustellbar", f"{u['name']} <{u['email']}>: {e}"[:300])
            if e.gesperrt:
                break   # Postfach gesperrt: in diesem Durchlauf nichts mehr versuchen
    return sent


_loop = {"started": False, "last": "", "error": ""}


def start_loop():
    if _loop["started"]:
        return
    _loop["started"] = True

    def run():
        time.sleep(20)
        while True:
            try:
                with db.tx() as c:
                    c.execute("SELECT pg_advisory_xact_lock(hashtext('aufgaben:sync'))")
                    sync_plans(c)
                send_due()
                try:   # Vor Ort erkennen: am Ende der Arbeitszeit an fehlende Tagesberichte erinnern
                    from bpcore import vorort
                    with db.tx() as c:
                        c.execute("SELECT pg_advisory_xact_lock(hashtext('vorort:abend'))")
                        vorort.abend_mails(c)
                except Exception as e:
                    _loop["vorort_fehler"] = str(e)[:200]
                try:   # To-dos: Erinnerung zur Fälligkeit per Mail
                    from bpcore import todo as TODO
                    with db.tx() as c:
                        c.execute("SELECT pg_advisory_xact_lock(hashtext('todo:erinnerung'))")
                        TODO.erinnerungen_senden(c)
                except Exception as e:
                    _loop["todo_fehler"] = str(e)[:200]
                try:   # Posteingang der Startseite zu den eingestellten Zeiten lesen (Standard: täglich 8:00)
                    _loop["post"] = posteingang.alle_faelligen(db.tx)
                except Exception as e:
                    _loop["post_fehler"] = str(e)[:200]
                if _loop.get("aufgeraeumt") != date.today().isoformat():   # einmal am Tag: alte Versionen ausdünnen
                    with db.tx() as c:
                        c.execute("SELECT pg_advisory_xact_lock(hashtext('versionen:aufraeumen'))")
                        versionen.aufraeumen(c)
                    _loop["aufgeraeumt"] = date.today().isoformat()
                _loop["last"], _loop["error"] = _now(), ""
            except Exception as e:   # nie den Prozess beenden – beim nächsten Durchlauf erneut
                bpfehler.still("aufgaben", "Hintergrund: Erinnerungen/Abgleich", e)
                _loop["error"] = str(e)[:300]
            time.sleep(300)
    threading.Thread(target=run, daemon=True, name="aufgaben-erinnerungen").start()


# ---------------------------------------------------------------- Erinnerungen (alle Quellen)
def erinnerungen_liste(scope):
    return erinnerungen(scope).get_json()["items"]


@app.get("/api/erinnerungen")
def erinnerungen(scope_arg=None):
    scope = scope_arg or _scope()
    with db.tx() as c:
        if request.args.get("abgleich") == "1":   # Seite geöffnet: Pläne sofort abgleichen
            c.execute("SELECT pg_advisory_xact_lock(hashtext('aufgaben:sync'))")
            sync_plans(c)
        P = _projects(c)
        names = {r["id"]: C.full_name(r) for r in c.execute("SELECT * FROM users")}
        plans = {r["id"]: r for r in c.execute("SELECT id, name, project_id, updated_by FROM gantt_projects")}
        own = c.execute("SELECT * FROM erinnerungen WHERE status IN ('offen','erledigt') ORDER BY termin, id").fetchall()
        bt = c.execute("""SELECT i.id, i.kind, i.text, i.company, i.due, i.due_time, i.reminded, i.remind_user, r.id AS rid, r.project_id AS pid, r.site_manager AS bl
            FROM items i JOIN reports r ON r.id=i.report_id WHERE i.due!='' AND i.done=0 ORDER BY i.due""").fetchall()
        secs = {r["key"]: r["title"] for r in c.execute("SELECT key, title FROM sections")}
    today = date.today().isoformat()
    me = g.user["id"]
    out = []
    for r in own:
        rec = _ids(r["empfaenger"])
        p = P.get(r["project_id"]) if r["project_id"] else None
        if p and not _sees(g.user, p):
            continue
        if not p and r["quelle"] == "plan":
            pl = plans.get(r["gantt_id"])
            if not pl:
                continue
        if scope == "mine" and me not in rec and r["erstellt_von"] != g.user["name"] and not (p and _mine(g.user, p)):
            continue
        d = _j(r["daten"], {})
        out.append({"id": f"r{r['id']}", "quelle": r["quelle"], "titel": r["titel"], "text": r["text"], "termin": r["termin"], "uhrzeit": r["uhrzeit"],
                    "ereignis": r["ereignis"], "status": r["status"], "gesendet": r["gesendet"], "manuell": bool(r["manuell"]),
                    "projekt": p["name"] if p else (d.get("plan") or ""), "pid": r["project_id"], "gantt_id": r["gantt_id"],
                    "an": [names.get(x, "?") for x in rec], "an_ids": rec, "von": r["erstellt_von"],
                    "firma": d.get("firma") or (f"Gewerk {d['gw']}" if d.get("gw") else ""), "gw": d.get("gw") or "",
                    "mail": d.get("link") or ""})
    for x in bt:
        p = P.get(x["pid"])
        if not p or not _sees(g.user, p) or (scope == "mine" and x["remind_user"] != me and not _mine(g.user, p)):
            continue
        out.append({"id": f"b{x['id']}", "quelle": "bautagebuch", "titel": f"{secs.get(x['kind'], 'Eintrag')}: {(x['text'] or '').strip().splitlines()[0][:140] if (x['text'] or '').strip() else ''}",
                    "text": x["text"] or "", "termin": x["due"], "uhrzeit": x["due_time"] or "09:00", "ereignis": "", "status": "offen",
                    "gesendet": x["reminded"] or "", "manuell": False, "projekt": p["name"], "pid": x["pid"], "rid": x["rid"],
                    "an": [names.get(x["remind_user"], "?")] if x["remind_user"] else [], "an_ids": [x["remind_user"]] if x["remind_user"] else [], "von": x["bl"] or "",
                    "firma": x["company"] or "", "gw": ""})
    for o in out:
        o["lage"] = ("erledigt" if o["status"] == "erledigt" else "ueberfaellig" if o["termin"] < today and not o["gesendet"] and o["quelle"] != "bautagebuch"
                     else "abgelaufen" if o["termin"] < today else "heute" if o["termin"] == today else "bald" if o["termin"] <= (date.today() + timedelta(days=7)).isoformat() else "spaeter")
    out.sort(key=lambda o: (o["status"] == "erledigt", o["termin"], o["titel"]))
    return jsonify(items=out, mail=_mail_ok(), loop=_loop)


def _mail_ok():
    with db.tx() as c:
        return mail.configured(mail.conf(c))


@app.get("/api/erinnerungen/<rid>")
def erinnerung_eine(rid):
    """Eine Erinnerung (für den Editor in den To-dos auf der Startseite)."""
    x = next((y for y in erinnerungen_liste("all") if y["id"] == rid), None)
    return jsonify(x) if x else (jsonify(error="Die Erinnerung gibt es nicht mehr."), 404)


@app.post("/api/erinnerungen")
def erinnerung_neu():
    b = request.get_json(silent=True) or {}
    titel = str(b.get("titel") or "").strip()[:200]
    termin = str(b.get("termin") or "").strip()
    if not titel or not DATE.match(termin):
        return jsonify(error="Bitte Text und Datum angeben."), 400
    uz = b.get("uhrzeit") if TIME.match(str(b.get("uhrzeit") or "")) else "08:00"
    pid = b.get("pid") if isinstance(b.get("pid"), int) else None
    with db.tx() as c:
        if pid and not c.execute("SELECT 1 FROM projects WHERE id=?", (pid,)).fetchone():
            pid = None
        rec = [int(x) for x in (b.get("an") or []) if str(x).isdigit()] or erinnern.empfaenger(c, g.user["id"], pid)   # ohne Auswahl: nach Einstellung (ich / alle Bauleiter)
        i = c.execute("""INSERT INTO erinnerungen(quelle, project_id, titel, text, termin, uhrzeit, empfaenger, erstellt, erstellt_von, geaendert, geaendert_von)
                         VALUES('eigen',?,?,?,?,?,?,?,?,?,?) RETURNING id""",
                      (pid, titel, str(b.get("text") or "")[:2000], termin, uz, json.dumps(rec), _now(), g.user["name"], _now(), g.user["name"])).fetchone()[0]
    C.audit(g.user["name"], "inhalt", "Erinnerung angelegt", titel)
    return jsonify(ok=True, id=f"r{i}", hinweis=_kal_auto(f"r{i}"))


@app.put("/api/erinnerungen/<rid>")
def erinnerung_edit(rid):
    b = request.get_json(silent=True) or {}
    termin = str(b.get("termin") or "").strip() if "termin" in b else None
    if termin is not None and not DATE.match(termin):
        return jsonify(error="Das Datum ist ungültig."), 400
    uz = b.get("uhrzeit") if TIME.match(str(b.get("uhrzeit") or "")) else None
    if rid.startswith("b") and rid[1:].isdigit():   # Bautagebuch-Eintrag: dort neu terminieren / erledigen
        body = {}
        if termin is not None:
            body["due"] = termin
        if uz:
            body["due_time"] = uz
        if b.get("status") in ("erledigt", "offen"):
            body["done"] = 1 if b["status"] == "erledigt" else 0
        try:
            C.bt_api("PUT", f"/api/items/{int(rid[1:])}", body)
        except RuntimeError as e:
            return jsonify(error=str(e)), 502
        return jsonify(ok=True, hinweis=_kal_auto(rid) if termin else "")
    if not (rid.startswith("r") and rid[1:].isdigit()):
        return jsonify(error="Nicht gefunden"), 404
    with db.tx() as c:
        r = c.execute("SELECT * FROM erinnerungen WHERE id=?", (int(rid[1:]),)).fetchone()
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        sets = {}
        if termin is not None:
            sets.update(termin=termin, gesendet="", manuell=1 if r["quelle"] == "plan" else r["manuell"])
        if uz:
            sets.update(uhrzeit=uz, gesendet="")
        if b.get("status") in ("offen", "erledigt"):
            sets["status"] = b["status"]
        if "titel" in b and r["quelle"] == "eigen":
            sets["titel"] = str(b["titel"] or "").strip()[:200] or r["titel"]
        if "text" in b and r["quelle"] == "eigen":
            sets["text"] = str(b["text"] or "")[:2000]
        if isinstance(b.get("an"), list):
            sets["empfaenger"] = json.dumps([int(x) for x in b["an"] if str(x).isdigit()] or [g.user["id"]])
        if sets:
            c.execute(f"UPDATE erinnerungen SET {', '.join(k + '=?' for k in sets)}, geaendert=?, geaendert_von=? WHERE id=?", (*sets.values(), _now(), g.user["name"], r["id"]))
    C.audit(g.user["name"], "inhalt", "Erinnerung geändert", f"{r['titel']}: " + ", ".join(f"{k}={v}" for k, v in sets.items() if k != "gesendet"))
    return jsonify(ok=True, hinweis=_kal_auto(rid) if (termin is not None or uz) and b.get("status") != "erledigt" else "")


# ---------------------------------------------------------------- Kalendertermine (Einladung zum Annehmen, z. B. Outlook)
def _kal_eintrag(eid):
    """Eintrag für den Kalender: Erinnerung (r…, b…) oder Frist eines Mangels/einer Aufgabe (m…)."""
    if eid.startswith("m") and eid[1:].isdigit():
        m = next((x for x in maengel("all").get_json() if x["id"] == int(eid[1:])), None)
        if not m or not m["frist"]:
            return None
        return {"titel": f"Frist {m['art_n']}: {m['text'].strip().splitlines()[0][:120] if m['text'].strip() else ''}" + (f" ({m['firma']})" if m["firma"] else ""),
                "text": m["text"], "termin": m["frist"], "uhrzeit": m.get("uhrzeit") or "09:00", "pid": m["pid"], "projekt": m["projekt"]}
    x = next((y for y in erinnerungen_liste("all") if y["id"] == eid), None)
    return x and {"titel": x["titel"], "text": x["text"], "termin": x["termin"], "uhrzeit": x["uhrzeit"] or "08:00", "pid": x.get("pid"), "projekt": x["projekt"]}


def kalender_senden(eid):
    """Schickt dem angemeldeten Benutzer eine Einladung; derselbe Eintrag behält seine UID (verschoben = aktualisiert)."""
    ich = (g.user["email"] or "").strip()
    if not ich:
        return "Für dein Konto ist keine E-Mail-Adresse hinterlegt."
    e = _kal_eintrag(eid)
    if not e or not DATE.match(e["termin"] or ""):
        return "Kein Termin für diesen Eintrag."
    with db.tx() as c:
        cf = mail.conf(c)
        T = vorlagen.alle(c)["termin"]
        p = c.execute("SELECT name, street, zip, city FROM projects WHERE id=?", (e["pid"],)).fetchone() if e.get("pid") else None
        key = f"ical:{g.user['id']}:{eid}"
        old = c.execute("SELECT data FROM bp_store WHERE key=?", (key,)).fetchone()
        seq = (json.loads(old["data"]).get("seq", 0) + 1) if old else 0
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated",
                  (key, json.dumps({"seq": seq, "termin": e["termin"]}), _now(), g.user["name"]))
    ort = ", ".join(x for x in (p["street"], " ".join(y for y in (p["zip"], p["city"]) if y)) if x) if p else ""
    W = {"titel": e["titel"], "text": e["text"] or "", "projekt": e["projekt"] or "", "datum": _de(e["termin"]), "uhrzeit": e["uhrzeit"],
         "absender": C.full_name(g.user), "buero": cf.get("office_name") or "Bauplattform"}
    titel, text = vorlagen.fuellen(T["betreff"], W).strip(), re.sub(r"\n{3,}", "\n\n", vorlagen.fuellen(T["text"], W)).strip()
    host = (cf.get("app_url") or "bauplattform").split("//")[-1].split("/")[0] or "bauplattform"
    inv = ical.einladung(f"{eid}-{g.user['id']}@{host}", e["termin"], e["uhrzeit"], 30, titel, text, ort, cf.get("mail_user") or ich,
                         cf.get("office_name") or "Bauplattform", ich, C.full_name(g.user), seq=seq)
    try:
        mail.send(cf, ich, titel, text + "\n\nIm Anhang als Kalendertermin – „Annehmen“ trägt ihn in deinen Kalender ein.",
                  sender=cf.get("office_name") or "Bauplattform", ical=inv)
    except mail.MailError as er:
        return str(er)
    return ""


@app.post("/api/kalender")
def kalender_api():
    eid = str((request.get_json(silent=True) or {}).get("id") or "")
    err = kalender_senden(eid)
    return (jsonify(error=err), 400) if err else jsonify(ok=True, an=g.user["email"])


def _kal_auto(eid):
    """Nach Anlegen/Verschieben einer eigenen Erinnerung: je nach Einstellung (⚙ → Für mich → Erinnerungen) sofort als Termin
    an die Empfänger – die Mail am Tag entfällt dann (gesendet = „termin“)."""
    if not (eid.startswith("r") and eid[1:].isdigit()):
        return ""
    try:
        with db.tx() as c:
            if erinnern.einstellung(c, g.user["id"])["art"] != "termin":
                return ""
            r = c.execute("SELECT * FROM erinnerungen WHERE id=?", (int(eid[1:]),)).fetchone()
            if not r or r["status"] == "erledigt":
                return ""
            n, f = erinnern.termine_senden(c, f"r{r['id']}", r["termin"], r["uhrzeit"], r["titel"], r["text"], r["project_id"], _ids(r["empfaenger"]),
                                           C.full_name(g.user))
            if n:
                c.execute("UPDATE erinnerungen SET gesendet='termin' WHERE id=?", (r["id"],))
        return (f"Als Termin verschickt ({n} Empfänger)." if n else "") + (f" {f}" if f else "")
    except Exception as e:
        bpfehler.still("aufgaben", "Erinnerung als Termin verschicken", e)
        return ""


@app.delete("/api/erinnerungen/<rid>")
def erinnerung_del(rid):
    if not (rid.startswith("r") and rid[1:].isdigit()):
        return jsonify(error="Nur eigene Erinnerungen lassen sich löschen."), 400
    with db.tx() as c:
        r = c.execute("SELECT * FROM erinnerungen WHERE id=?", (int(rid[1:]),)).fetchone()
        if not r or r["quelle"] != "eigen":
            return jsonify(error="Erinnerungen aus Bauzeitenplänen werden mit „Erledigt“ abgehakt."), 400
        c.execute("DELETE FROM erinnerungen WHERE id=?", (r["id"],))
    return jsonify(ok=True, item={k: r[k] for k in r.keys()})


@app.post("/api/erinnerungen/wiederherstellen")
def erinnerung_restore():
    """Gelöschte eigene Erinnerung zurückholen (Rückgängig)."""
    d = request.get_json(silent=True) or {}
    cols = ("id", "quelle", "project_id", "titel", "text", "termin", "uhrzeit", "empfaenger", "status", "gesendet", "erstellt", "erstellt_von")
    if d.get("quelle") != "eigen" or not isinstance(d.get("id"), int):
        return jsonify(error="Nicht möglich"), 400
    with db.tx() as c:
        if c.execute("SELECT 1 FROM erinnerungen WHERE id=?", (d["id"],)).fetchone():
            return jsonify(ok=True)
        c.execute(f"INSERT INTO erinnerungen({','.join(cols)}) VALUES({','.join('?' * len(cols))})", tuple(d.get(k) for k in cols))
    return jsonify(ok=True)


@app.post("/api/erinnerungen/test")
def erinnerung_test():
    """Testmail an den angemeldeten Benutzer."""
    with db.tx() as c:
        mc = mail.conf(c)
    if not g.user["email"]:
        return jsonify(error="Unter Benutzer ist für dich keine E-Mail-Adresse eingetragen."), 400
    try:
        mail.send(mc, g.user["email"], "Bauplattform – Test der Erinnerungen", f"Hallo {C.public(g.user)['vorname'] or g.user['name']},\n\nso kommen Erinnerungen aus „Aufgaben & Mängel“ an.\n")
    except mail.MailError as e:
        return jsonify(error=str(e)), 502
    return jsonify(ok=True, to=g.user["email"])


@app.get("/api/projekte")
def projekte():
    with db.tx() as c:
        P = _projects(c)
    return jsonify([{"id": k, "name": v["name"], "mine": _mine(g.user, v)} for k, v in sorted(P.items(), key=lambda x: x[1]["name"]) if not v["archived"] and _sees(g.user, v)])


@app.get("/api/benutzer")
def benutzer():
    with db.tx() as c:
        return jsonify([{"id": r["id"], "name": C.full_name(r)} for r in c.execute("SELECT * FROM users WHERE active=1 AND lower(name)!='admin' ORDER BY name")])


@app.route("/api/einstellungen", methods=["GET", "PUT"])
def einstellungen():
    with db.tx() as c:
        if request.method == "PUT":
            b = request.get_json(silent=True) or {}
            cur = conf(c)
            for k in ("vorlauf", "luecke"):
                if k in b:
                    try:
                        cur[k] = int(b[k])
                    except (TypeError, ValueError):
                        pass
            if "mail_plan" in b:
                cur["mail_plan"] = bool(b["mail_plan"])
            if TIME.match(str(b.get("uhrzeit") or "")):
                cur["uhrzeit"] = b["uhrzeit"]
            versionen.vor(c, "bp:aufgaben")
            c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES('aufgaben',?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated=excluded.updated, updated_by=excluded.updated_by",
                      (json.dumps(cur), _now(), g.user["name"]))
            versionen.nach(c, "bp:aufgaben", g.user["name"])
            # neuer Vorlauf: noch nicht verschickte, nicht von Hand verschobene Plan-Erinnerungen neu berechnen
            for r in c.execute("SELECT id, ereignis FROM erinnerungen WHERE quelle='plan' AND status='offen' AND gesendet='' AND manuell=0").fetchall():
                if r["ereignis"]:
                    t = max((date.fromisoformat(r["ereignis"]) - timedelta(days=conf(c)["vorlauf"])).isoformat(), date.today().isoformat())
                    c.execute("UPDATE erinnerungen SET termin=?, uhrzeit=? WHERE id=?", (t, conf(c)["uhrzeit"], r["id"]))
            C.audit(g.user["name"], "verwaltung", "Erinnerungen eingestellt", f"Vorlauf {cur['vorlauf']} Tage, Lücke {cur['luecke']} Tage, Mail {'an' if cur['mail_plan'] else 'aus'}")
        return jsonify(conf(c))


C.wait_schema()
start_loop()
