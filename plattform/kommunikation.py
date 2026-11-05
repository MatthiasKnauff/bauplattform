"""Kommunikation: Was wurde mit wem verschickt – je Projekt und je Kontakt.

Quelle ist der Benachrichtigungsverlauf (Tabelle benachrichtigungen, bpcore/benachrichtigung.py), in den alle Apps jede
Sendung eintragen: Planversand, Mängelrügen, Terminrügen – per E-Mail, an mich zum Weiterleiten oder als PDF.
Diese App liest nur; neue Arten (z. B. LV-Versand) erscheinen hier, sobald eine App sie protokolliert.
"""
import csv, io
from datetime import datetime

from flask import Response, g, jsonify, redirect, request

from bpcore import benachrichtigung, db, platform, sso
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
        if p.startswith("/api/"):
            return jsonify(error=msg), 403
        return (f'{msg} <a href="{C.app_base("portal")}/">Zur Startseite</a>', 403, {"Content-Type": "text/html; charset=utf-8"})
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


def _filter(a):
    """WHERE-Teil aus den Abfrageparametern: pid (Projekt), cid (Kontakt), email, art, q (Suche)."""
    w, p = ["1=1"], []
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
