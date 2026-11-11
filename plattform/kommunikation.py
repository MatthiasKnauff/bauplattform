"""Kommunikation: Was wurde mit wem verschickt – je Projekt und je Kontakt.

Quelle ist der Benachrichtigungsverlauf (Tabelle benachrichtigungen, bpcore/benachrichtigung.py), in den alle Apps jede
Sendung eintragen: Planversand, Mängelrügen, Terminrügen – per E-Mail, an mich zum Weiterleiten oder als PDF.
Diese App liest nur; neue Arten (z. B. LV-Versand) erscheinen hier, sobald eine App sie protokolliert.
"""
import csv, io, json, re, urllib.parse
from datetime import datetime

from flask import Response, g, jsonify, redirect, request

from bpcore import benachrichtigung, db, konto, mail, platform, sso, vorgang
import common as C

app = C.make_app(__name__)
KEY = "kommunikation"
ARTEN = {**benachrichtigung.ARTEN, "lvversand": "LV-Versand", "brief": "Brief"}


@app.before_request
def guard():
    p = request.path
    if p.startswith(("/static/", "/bp/")) or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base(KEY) + "/")), 401
        return redirect(C.login_url(request.url))
    if not sso.has_app(u, KEY):
        msg = "Für „Kommunikation“ ist dein Konto nicht freigeschaltet."
        return C.gesperrt(KEY, msg)   # im Büro abgeschaltet oder für das Konto nicht freigeschaltet
    g.user = u


@app.get("/")
def index():
    return C.page("kommunikation.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


def _leiter(raw):
    try:
        v = json.loads(raw or "[]")
    except ValueError:
        return []
    return [int(x) for x in v if str(x).isdigit()] if isinstance(v, list) else []


def _filter(a):
    """WHERE-Teil aus den Abfrageparametern: pid (Projekt), cid (Kontakt), email, art, q (Suche)."""
    w, p = ["1=1"], []
    if not g.user["is_admin"]:   # nur Sendungen aus Projekten, die der Benutzer sehen darf (wie im Bautagebuch)
        with db.tx() as c:
            fremd = [r["id"] for r in c.execute("SELECT id, leaders FROM projects")
                     if (lambda L: L and g.user["id"] not in L)(_leiter(r["leaders"]))]
        if fremd:
            w.append("(b.project_id IS NULL OR b.project_id NOT IN (" + ",".join("?" * len(fremd)) + "))")
            p += fremd
    if a.get("cid", type=int):
        cid = a.get("cid", type=int)
        with db.tx() as c:
            r = c.execute("SELECT email FROM contacts WHERE id=?", (cid,)).fetchone()
        e = ((r["email"] if r else "") or "").strip().lower()
        w.append("(b.contact_id=? OR (b.contact_id IS NULL AND ?<>'' AND lower(b.email)=?))")
        p += [cid, e, e]
    elif a.get("email"):
        w.append("b.contact_id IS NULL AND lower(b.email)=?")
        p.append(a.get("email").strip().lower())
    if a.get("pid", type=int):
        w.append("b.project_id=?")
        p.append(a.get("pid", type=int))
    if a.get("art"):
        arten = [x for x in a.get("art").split(",") if x]
        if arten:
            w.append("b.art IN (" + ",".join("?" * len(arten)) + ")")
            p += arten
    if a.get("ich"):   # nur, was ich selbst verschickt habe
        w.append("b.von=?")
        p.append(C.full_name(g.user))
    q = (a.get("q") or "").strip().lower()
    if q:
        w.append("(lower(b.betreff) LIKE ? OR lower(b.inhalt) LIKE ? OR lower(b.name) LIKE ? OR lower(b.email) LIKE ? OR lower(b.projekt) LIKE ? "
                 "OR lower(COALESCE(k.name, '')) LIKE ? OR lower(COALESCE(k.contact_person, '')) LIKE ? OR lower(b.von) LIKE ?)")
        p += ["%" + q + "%"] * 8
    return " AND ".join(w), p


def _eintrag(x):
    return {"id": x["id"], "ts": x["ts"], "art": x["art"], "art_name": ARTEN.get(x["art"], x["art"] or "Sendung"),
            "weg": x["weg"], "weg_name": benachrichtigung.WEGE.get(x["weg"], x["weg"]),
            "contact_id": x["contact_id"], "kontakt": x["k_name"] or "", "ansprech": x["k_person"] or "", "gewerk": x["k_trade"] or "",
            "email": x["email"], "name": x["name"], "project_id": x["project_id"], "projekt": x["p_name"] or x["projekt"] or "",
            "betreff": x["betreff"], "inhalt": x["inhalt"], "von": x["von"], "status": x["status"], "fehler": x["fehler"], "link": x["link"]}


SQL = """SELECT b.*, k.name AS k_name, k.contact_person AS k_person, k.trade AS k_trade, pr.name AS p_name
         FROM benachrichtigungen b LEFT JOIN contacts k ON k.id=b.contact_id LEFT JOIN projects pr ON pr.id=b.project_id"""


@app.get("/api/kom")
def liste():
    """Sendungen (neueste zuerst) + Übersicht: mit wem (Kontakte) und in welchen Projekten – jeweils mit Anzahl und letzter Sendung."""
    w, p = _filter(request.args)
    n = min(2000, request.args.get("n", type=int) or 500)
    with db.tx() as c:
        rows = [_eintrag(x) for x in c.execute(f"{SQL} WHERE {w} ORDER BY b.ts DESC, b.id DESC LIMIT ?", (*p, n)).fetchall()]
        gesamt = c.execute(f"SELECT COUNT(*) AS n FROM benachrichtigungen b LEFT JOIN contacts k ON k.id=b.contact_id WHERE {w}", p).fetchone()["n"]
        # Übersichten ohne den Kontakt- bzw. Projektfilter selbst (damit man wechseln kann)
        a2 = request.args.to_dict()
        for k in ("cid", "email"):
            a2.pop(k, None)
        w2, p2 = _filter(_Args(a2))
        kontakte = c.execute(f"""SELECT b.contact_id, CASE WHEN b.contact_id IS NULL THEN lower(b.email) ELSE '' END AS mail,
                MAX(COALESCE(k.name, b.name, b.email)) AS name, MAX(COALESCE(k.contact_person, '')) AS ansprech, MAX(COALESCE(k.trade, '')) AS gewerk,
                COUNT(*) AS n, MAX(b.ts) AS letzte FROM benachrichtigungen b LEFT JOIN contacts k ON k.id=b.contact_id WHERE {w2}
                GROUP BY b.contact_id, CASE WHEN b.contact_id IS NULL THEN lower(b.email) ELSE '' END ORDER BY MAX(b.ts) DESC LIMIT 300""", p2).fetchall()
        a3 = request.args.to_dict()
        a3.pop("pid", None)
        w3, p3 = _filter(_Args(a3))
        projekte = c.execute(f"""SELECT b.project_id, MAX(COALESCE(pr.name, b.projekt)) AS name, COUNT(*) AS n, MAX(b.ts) AS letzte
                FROM benachrichtigungen b LEFT JOIN contacts k ON k.id=b.contact_id LEFT JOIN projects pr ON pr.id=b.project_id WHERE {w3}
                GROUP BY b.project_id ORDER BY MAX(b.ts) DESC LIMIT 300""", p3).fetchall()
        arten = {x["art"]: x["n"] for x in c.execute("SELECT art, COUNT(*) AS n FROM benachrichtigungen GROUP BY art").fetchall()}
    return jsonify(eintraege=rows, gesamt=gesamt,
                   kontakte=[{"contact_id": x["contact_id"], "email": x["mail"], "name": x["name"] or x["mail"], "ansprech": x["ansprech"],
                              "gewerk": x["gewerk"], "n": x["n"], "letzte": x["letzte"]} for x in kontakte],
                   projekte=[{"project_id": x["project_id"], "name": x["name"] or "ohne Projekt", "n": x["n"], "letzte": x["letzte"]} for x in projekte],
                   arten=[{"key": k, "name": ARTEN.get(k, k), "n": arten.get(k, 0)} for k in dict.fromkeys(list(ARTEN) + list(arten)) if arten.get(k)])


class _Args(dict):
    """request.args-Ersatz für _filter() (get mit type=)."""
    def get(self, k, default=None, type=None):
        v = dict.get(self, k, default)
        if type is not None and v is not None:
            try:
                return type(v)
            except (TypeError, ValueError):
                return default
        return v


@app.get("/api/kontakte")
def kontakte():
    q = "%" + (request.args.get("q") or "").strip().lower() + "%"
    with db.tx() as c:
        rows = c.execute("""SELECT k.id, k.name, k.contact_person, k.email, k.trade, (SELECT COUNT(*) FROM benachrichtigungen b WHERE b.contact_id=k.id) AS n
                            FROM contacts k WHERE lower(k.name) LIKE ? OR lower(k.contact_person) LIKE ? OR lower(k.email) LIKE ? OR lower(k.trade) LIKE ?
                            ORDER BY n DESC, k.name LIMIT 1000""", (q, q, q, q)).fetchall()
    return jsonify([{"id": x["id"], "name": x["name"], "ansprech": x["contact_person"], "email": x["email"], "gewerk": x["trade"], "n": x["n"]} for x in rows])


@app.get("/api/kom.csv")
def csv_export():
    """Für Excel (Semikolon, UTF-8 mit BOM) – mit denselben Filtern wie die Ansicht."""
    w, p = _filter(request.args)
    with db.tx() as c:
        rows = [_eintrag(x) for x in c.execute(f"{SQL} WHERE {w} ORDER BY b.ts DESC, b.id DESC LIMIT 20000", p).fetchall()]
    buf = io.StringIO()
    wr = csv.writer(buf, delimiter=";")
    wr.writerow(["Datum", "Uhrzeit", "Art", "Weg", "Projekt", "Empfänger", "Ansprechpartner", "E-Mail", "Betreff", "Inhalt", "Von", "Status"])
    for x in rows:
        try:
            d = datetime.fromisoformat(x["ts"])
            dat, zeit = d.strftime("%d.%m.%Y"), d.strftime("%H:%M")
        except ValueError:
            dat, zeit = x["ts"], ""
        wr.writerow([dat, zeit, x["art_name"], x["weg_name"], x["projekt"], x["kontakt"] or x["name"], x["ansprech"], x["email"], x["betreff"],
                     (x["inhalt"] or "").replace("\r", ""), x["von"], "nicht zugestellt: " + x["fehler"] if x["status"] == "fehler" else x["status"]])
    return Response("﻿" + buf.getvalue(), mimetype="text/csv; charset=utf-8",
                    headers={"Content-Disposition": "attachment; filename=Kommunikation.csv"})


# ---------------------------------------------------------------- Neue Nachricht / Vorgang dokumentieren (auch vom Handy)
def _projekt(c, pid):
    if not pid:
        return None
    p = c.execute("SELECT id, name, street, zip, city FROM projects WHERE id=?", (pid,)).fetchone()
    return p if p and vorgang.sieht(c, g.user, pid) else None


# ---------------------------------------------------------------- Antworten aus dem Posteingang im Verlauf
def _s(v, n):
    return str(v or "").strip()[:n]


_RE = re.compile(r"^\s*((re|aw|wg|fw|fwd|antw|antwort)\s*:\s*)+", re.I)


def _betreff_norm(b):
    b = _RE.sub("", b or "")
    b = re.sub(r"\[[^\]]{1,20}\]\s*", "", b)   # [A541] vorn
    return re.sub(r"\s+", " ", b).strip().lower()


@app.get("/api/antworten")
def antworten():
    """Mails im eigenen Posteingang, die auf eine von hier verschickte Nachricht antworten (gleicher Absender wie Empfänger,
    gleicher Betreff ohne Re:/AW:, nach dem Versand). Nur das eigene Postfach – nichts wird neu abgerufen."""
    from bpcore import posteingang
    w, p = _filter(request.args)
    with db.tx() as c:
        mails = posteingang.lesen(c, g.user["id"]).get("mails") or []
        if not mails:
            return jsonify(antworten=[])
        gesendet = c.execute(f"SELECT b.id, b.ts, b.email, b.betreff FROM benachrichtigungen b LEFT JOIN contacts k ON k.id=b.contact_id "
                             f"WHERE {w} AND b.betreff<>'' AND b.email<>'' ORDER BY b.ts DESC LIMIT 1500", p).fetchall()
    S = {}
    for x in gesendet:
        S.setdefault(((x["email"] or "").strip().lower(), _betreff_norm(x["betreff"])), []).append(x)
    out = []
    for m in mails:
        cand = S.get(((m.get("von") or "").strip().lower(), _betreff_norm(m.get("betreff"))))
        if not cand:
            continue
        z = (m.get("zeit") or "")[:10]
        x = next((y for y in cand if str(y["ts"])[:10] <= z), None)   # die letzte Sendung vor der Antwort
        if not x:
            continue
        out.append({"bid": x["id"], "id": m.get("id"), "von": m.get("von"), "von_name": m.get("von_name") or "", "zeit": m.get("zeit") or "",
                    "betreff": m.get("betreff") or "", "vorschau": (m.get("vorschau") or "")[:400], "anhaenge": (m.get("anhaenge") or [])[:12],
                    "link": m.get("link") or ""})
    return jsonify(antworten=out)


# ---------------------------------------------------------------- Vorlagen für Nachrichten (fürs ganze Büro)
VORLAGEN_STANDARD = [
    {"id": "termin", "name": "Bitte um Terminbestätigung", "betreff": "Terminbestätigung {projekt}",
     "text": "Guten Tag,\n\nbitte bestätigen Sie uns den Ausführungstermin für Ihre Leistungen im Bauvorhaben {projekt} bis zum {frist}.\n\nMit freundlichen Grüßen\n{ich}"},
    {"id": "nachtrag", "name": "Aufforderung Nachtragsangebot", "betreff": "Nachtragsangebot {projekt}",
     "text": "Guten Tag,\n\nzu der angekündigten Mehrleistung bitten wir um ein prüffähiges Nachtragsangebot auf Grundlage Ihrer Urkalkulation (§ 2 Abs. 5/6 VOB/B) bis zum {frist}.\n\nMit freundlichen Grüßen\n{ich}"},
    {"id": "unterlagen", "name": "Unterlagen anfordern", "betreff": "Fehlende Unterlagen {projekt}",
     "text": "Guten Tag,\n\nfür das Bauvorhaben {projekt} fehlen uns noch folgende Unterlagen:\n\n- \n\nBitte senden Sie diese bis zum {frist}.\n\nMit freundlichen Grüßen\n{ich}"},
]


def _vorlagen(c):
    v = konto._get(c, "kom:vorlagen")
    try:
        L = json.loads(v) if v else None
    except ValueError:
        L = None
    return L if isinstance(L, list) else [dict(x) for x in VORLAGEN_STANDARD]


@app.route("/api/vorlagen", methods=["GET", "PUT"])
def vorlagen():
    """Textvorlagen: {firma} {projekt} {frist} {ich} werden beim Einsetzen ersetzt."""
    with db.tx() as c:
        if request.method == "PUT":
            b = request.get_json(silent=True) or {}
            L = [{"id": _s(x.get("id"), 40) or re.sub(r"\W+", "", str(x.get("name") or ""))[:30] or "v", "name": _s(x.get("name"), 80),
                  "betreff": _s(x.get("betreff"), 200), "text": _s(x.get("text"), 5000)}
                 for x in (b.get("vorlagen") or [])[:60] if isinstance(x, dict) and _s(x.get("name"), 80)]
            konto._put(c, "kom:vorlagen", json.dumps(L, ensure_ascii=False), C.full_name(g.user))
        return jsonify(vorlagen=_vorlagen(c))


@app.get("/api/beteiligte")
def beteiligte():
    """Wer im Projekt vorkommt (Bautagebuch, Aufträge der AVA, frühere Sendungen) – mit E-Mail, für „An“."""
    pid = request.args.get("pid", type=int)
    with db.tx() as c:
        if not _projekt(c, pid):
            return jsonify([])
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
    return jsonify(sorted(out, key=lambda x: (not x["email"], x["rolle"].startswith("schon"), x["name"].lower())))


def _empfaenger(raw):
    try:
        L = json.loads(raw or "[]")
    except ValueError:
        return None, "Empfänger nicht lesbar."
    out = []
    for e in L if isinstance(L, list) else []:
        if not isinstance(e, dict):
            continue
        a = str(e.get("email") or "").strip()[:200]
        if not mail.ADRESSE.match(a):
            return None, f"Ungültige E-Mail-Adresse: {a or '(leer)'}"
        if a.lower() not in [x["email"].lower() for x in out]:
            out.append({"email": a, "name": str(e.get("name") or "")[:200], "contact_id": e.get("contact_id") if isinstance(e.get("contact_id"), int) else None})
    if len(out) > 20:
        return None, "Höchstens 20 Empfänger."
    return out, None


def _schicken(c, p, an, betreff, text, anh, kopie):
    """Mail mit Signatur (Rich-Signatur als HTML) vom Absender des Benutzers; gibt (weg, fehler) zurück."""
    cf = mail.conf(c)
    if not mail.configured(cf):
        return None, "Der E-Mail-Versand ist nicht eingerichtet (Verwaltung → Einstellungen → Mailserver)."
    W = {"projekt": p["name"] if p else "", "absender": C.full_name(g.user), "buero": cf.get("office_name") or "", "datum": datetime.now().strftime("%d.%m.%Y")}
    tx, html = konto.mail_teile(c, g.user, text + "\n\n{signatur}", W)
    von, vname = konto.absender(c, g.user, cf)
    ich = (g.user["email"] or "").strip()
    cc = [ich] if kopie and ich and ich.lower() not in [x["email"].lower() for x in an] else []
    try:
        weg = mail.send(cf, [x["email"] for x in an], betreff, tx, sender=vname, from_addr=von, attachments=[(n, d, m) for n, m, d in anh],
                        cc=cc, reply_to=ich or None, html=html)
    except mail.MailError as e:
        return None, str(e)
    return weg or "test", None


@app.post("/api/nachricht")
def nachricht():
    f = request.form
    pid = f.get("pid", type=int)
    an, err = _empfaenger(f.get("an"))
    if err or not an:
        return jsonify(error=err or "Bitte mindestens einen Empfänger wählen."), 400
    text = (f.get("text") or "").strip()[:20000]
    if not text:
        return jsonify(error="Bitte einen Text schreiben."), 400
    anh, err = vorgang.dateien_pruefen(request.files.getlist("dateien"))
    if err:
        return jsonify(error=err), 400
    with db.tx() as c:
        p = _projekt(c, pid)
        if pid and not p:
            return jsonify(error="Projekt nicht gefunden"), 404
        betreff = vorgang.betreff_mit_kuerzel(f.get("betreff") or "", p["name"] if p else "") or "Nachricht"
        weg, err = _schicken(c, p, an, betreff, text, anh, f.get("kopie") == "1")
    with db.tx() as c:
        ids = benachrichtigung.protokoll(c, "nachricht", an, project_id=pid, projekt=p["name"] if p else "", betreff=betreff,
                                         inhalt=text + (f"\n\nAnhänge: {', '.join(n for n, _, _ in anh)}" if anh else ""), von=C.full_name(g.user),
                                         weg="mail", status="fehler" if err else "gesendet", fehler=err or "", link="kommunikation:")
        if ids and not err:
            jetzt = datetime.now().isoformat(timespec="seconds")
            for n, m, d in anh:
                c.execute("INSERT INTO kom_datei(benachrichtigung_id, name, mime, groesse, data, erstellt, erstellt_name) VALUES(?,?,?,?,?,?,?)",
                          (ids[0], n, m, len(d), d, jetzt, C.full_name(g.user)))
        neu = benachrichtigung.unbekannt(c, [x["email"] for x in an]) if not err else []
    if err:
        return jsonify(error=err), 502
    C.audit(g.user["name"], "mail", "Nachricht", f"{betreff} · an {', '.join(x['email'] for x in an)[:200]}")
    return jsonify(ok=True, weg=weg, betreff=betreff, neue_adressen=neu)


@app.get("/api/vorgang/arten")
def vorgang_arten():
    return jsonify([{"key": k, "name": n, "ic": i, "muster": m} for k, (n, i, m) in vorgang.ARTEN.items()])


@app.post("/api/vorgang")
def vorgang_neu():
    f = request.form
    pid = f.get("pid", type=int)
    art = f.get("art") if f.get("art") in vorgang.ARTEN else "sonst"
    text = (f.get("text") or "").strip()[:20000]
    titel = (f.get("titel") or "").strip()[:200]
    if not (text or titel):
        return jsonify(error="Bitte festhalten, was passiert ist."), 400
    zeit = (f.get("zeit") or datetime.now().isoformat(timespec="minutes"))[:16]
    frist = (f.get("frist") or "")[:10]
    try:
        if frist:
            datetime.fromisoformat(frist)
        datetime.fromisoformat(zeit)
    except ValueError:
        return jsonify(error="Datum nicht lesbar."), 400
    senden = f.get("senden") == "1"
    an, err = _empfaenger(f.get("an")) if senden else ([], None)
    if err or (senden and not an):
        return jsonify(error=err or "Bitte mindestens einen Empfänger wählen – oder „nur festhalten“."), 400
    anh, err = vorgang.dateien_pruefen(request.files.getlist("dateien"))
    if err:
        return jsonify(error=err), 400
    name = C.full_name(g.user)
    jetzt = datetime.now().isoformat(timespec="seconds")
    with db.tx() as c:
        p = _projekt(c, pid)
        if pid and not p:
            return jsonify(error="Projekt nicht gefunden"), 404
        v = {"art": art, "titel": titel, "text": text, "beteiligte": (f.get("beteiligte") or "").strip()[:500], "zeit": zeit,
             "ort": (f.get("ort") or "").strip()[:200], "frist": frist}
        vid = c.execute("""INSERT INTO kom_vorgang(project_id, art, titel, text, beteiligte, zeit, ort, frist, an, erstellt, erstellt_von, erstellt_name)
                           VALUES(?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id""",
                        (pid, art, titel, text, v["beteiligte"], zeit, v["ort"], frist, json.dumps(an), jetzt, g.user["id"], name)).fetchone()["id"]
        for n, m, d in anh:
            c.execute("INSERT INTO kom_datei(vorgang_id, name, mime, groesse, data, erstellt, erstellt_name) VALUES(?,?,?,?,?,?,?)", (vid, n, m, len(d), d, jetzt, name))
        tid = None
        if frist:
            an_name = ", ".join(x["name"] or x["email"] for x in an) if an else v["beteiligte"]
            tid = vorgang.frist_todo(c, g.user, pid, f"{vorgang.ARTEN[art][0]}: {titel or text[:60]}" + (f" – {an_name}" if an_name else ""), frist,
                                     f"Frist aus dem Vorgang vom {vorgang.datum_de(zeit)} (Kommunikation)")
            c.execute("UPDATE kom_vorgang SET todo_id=? WHERE id=?", (tid, vid))
    hinweis, err = "", None
    if senden:
        aname = vorgang.ARTEN[art][0]
        with db.tx() as c:
            p = _projekt(c, pid)
            pdfb = vorgang.pdf(c, v, p["name"] if p else "", anh, name)
            muster = vorgang.ARTEN[art][2].format(projekt=p["name"] if p else "", firma="", frist="")
            anrede = "Sehr geehrte Damen und Herren,"
            mt = "\n\n".join(x for x in (anrede, muster, titel, text, f"Bitte bis zum {vorgang.datum_de(frist)}." if frist else "", "Mit freundlichen Grüßen") if x)
            betreff = vorgang.betreff_mit_kuerzel(f"{aname}: {titel or text[:60]}", p["name"] if p else "")
            fn = re.sub(r"[^\w.-]+", "_", f"{aname}_{vorgang.datum_de(zeit)}")[:80] + ".pdf"
            weg, err = _schicken(c, p, an, betreff, mt, [(fn, "application/pdf", pdfb)] + [x for x in anh if not x[1].startswith("image/")], f.get("kopie") == "1")
        with db.tx() as c:
            benachrichtigung.protokoll(c, "vorgang", an, project_id=pid, projekt=p["name"] if p else "", betreff=betreff, inhalt=mt, von=name, weg="mail",
                                       status="fehler" if err else "gesendet", fehler=err or "", link=f"kommunikation:#v={vid}")
            if not err:
                c.execute("UPDATE kom_vorgang SET gesendet=? WHERE id=?", (datetime.now().isoformat(timespec="seconds"), vid))
        hinweis = "" if err else f"als PDF an {', '.join(x['email'] for x in an)}"
    C.audit(g.user["name"], "kommunikation", "Vorgang", f"{vorgang.ARTEN[art][0]} · {titel or text[:60]}")
    return jsonify(ok=not err, id=vid, todo=tid, hinweis=hinweis, error=err or None), (502 if err else 200)


def _vorgang_zeile(c, x):
    D = c.execute("SELECT id, name, mime, groesse FROM kom_datei WHERE vorgang_id=? ORDER BY id", (x["id"],)).fetchall()
    try:
        an = json.loads(x["an"] or "[]")
    except ValueError:
        an = []
    n, ic, _ = ("Nachtrag zur Abnahme" if x["bezug"] else "Abnahme", "🏁", "") if x["art"] == "abnahme" else vorgang.ARTEN.get(x["art"], vorgang.ARTEN["sonst"])
    return {"status": x["status"], "id": x["id"], "project_id": x["project_id"], "art": x["art"], "art_name": n, "ic": ic, "titel": x["titel"], "text": x["text"],
            "beteiligte": x["beteiligte"], "zeit": x["zeit"], "ort": x["ort"], "frist": x["frist"], "todo_id": x["todo_id"], "an": an,
            "gesendet": x["gesendet"], "von": x["erstellt_name"], "dateien": [{"id": d["id"], "name": d["name"], "mime": d["mime"], "groesse": d["groesse"]} for d in D]}


@app.get("/api/vorgaenge")
def vorgaenge():
    pid = request.args.get("pid", type=int)
    with db.tx() as c:
        if pid and not _projekt(c, pid):
            return jsonify([])
        rows = c.execute("SELECT * FROM kom_vorgang WHERE " + ("project_id=?" if pid else "1=1") + " ORDER BY zeit DESC, id DESC LIMIT 500", (pid,) if pid else ()).fetchall()
        return jsonify([_vorgang_zeile(c, x) for x in rows if vorgang.sieht(c, g.user, x["project_id"])])


@app.get("/api/datei/<int:did>")
def datei(did):
    with db.tx() as c:
        d = c.execute("""SELECT d.*, COALESCE(v.project_id, b.project_id) AS pid FROM kom_datei d LEFT JOIN kom_vorgang v ON v.id=d.vorgang_id
                         LEFT JOIN benachrichtigungen b ON b.id=d.benachrichtigung_id WHERE d.id=?""", (did,)).fetchone()
        if not d or not vorgang.sieht(c, g.user, d["pid"]):
            return jsonify(error="Nicht gefunden"), 404
    data = bytes(d["data"] or b"")
    return Response(data, mimetype=d["mime"] if d["mime"].startswith("image/") or d["mime"] == "application/pdf" else "application/octet-stream",
                    headers={"Content-Disposition": f"inline; filename*=UTF-8''{urllib.parse.quote(d['name'])}", "X-Content-Type-Options": "nosniff",
                             "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"})


@app.get("/api/vorgang/<int:vid>.pdf")
def vorgang_pdf(vid):
    with db.tx() as c:
        x = c.execute("SELECT * FROM kom_vorgang WHERE id=?", (vid,)).fetchone()
        if not x or not vorgang.sieht(c, g.user, x["project_id"]):
            return jsonify(error="Nicht gefunden"), 404
        p = c.execute("SELECT name FROM projects WHERE id=?", (x["project_id"],)).fetchone() if x["project_id"] else None
        if x["art"] == "abnahme":
            return Response(kom_abnahme.abnahme_pdf(c, x), mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename=Abnahme_{vid}.pdf", "Cache-Control": "no-store"})
        anh = [(d["name"], d["mime"], bytes(d["data"] or b"")) for d in c.execute("SELECT name, mime, data FROM kom_datei WHERE vorgang_id=? ORDER BY id", (vid,))]
        out = vorgang.pdf(c, dict(x), p["name"] if p else "", anh, x["erstellt_name"])
    return Response(out, mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename=Vorgang_{vid}.pdf"})


import kom_abnahme   # noqa: E402 – Abnahme mit Niederschrift, Mängelblatt und Unterschriften (eigenes Modul, Routen /api/abnahme…)
