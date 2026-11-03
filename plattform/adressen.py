"""Adressen der Bauplattform (eigener Container, eigener Port – läuft auch ohne Nginx).

Dieselben Daten wie die Kontakte im Bautagebuch und das Firmen-Adressbuch im Bauzeitenplan (Tabelle contacts).
Änderungen hier sind sofort in beiden Apps sichtbar und umgekehrt.

/                 Liste mit Suche und Filter (Firmen, Bauherren, Baustellen), Bearbeiten, Anrufen/E-Mail
/api/contacts     Liste (GET), neu (POST)
/api/contacts/<id>  ändern (PUT), löschen (DELETE – nur wenn im Bautagebuch nicht verwendet)
/api/contacts.csv  Export für Excel
/api/contacts/<id>.vcf  Visitenkarte (ins Handy übernehmen)
"""
import csv, io, json, re
from datetime import datetime

from flask import Response, g, jsonify, redirect, request

from bpcore import db, platform, sso
import common as C

app = C.make_app(__name__)

FIELDS = {   # Feld → (höchste Länge, Bezeichnung für das Protokoll)
    "name": (200, "Name"), "trade": (300, "Gewerk"), "contact_person": (200, "Ansprechpartner"), "role": (200, "Funktion"),
    "phone": (100, "Telefon"), "mobile": (100, "Mobil"), "email": (200, "E-Mail"), "website": (300, "Internet"),
    "street": (200, "Straße"), "zip": (20, "PLZ"), "city": (200, "Ort"), "notes": (5000, "Notizen"),
}
DUP = "Einen Kontakt mit diesem Namen gibt es schon."


@app.before_request
def guard():
    p = request.path
    if p.startswith("/static/") or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base("adressen") + "/")), 401
        return redirect(C.login_url(request.url))
    if not sso.has_app(u, "adressen"):
        msg = "Für die Adressen ist dein Konto nicht freigeschaltet."
        if p.startswith("/api/"):
            return jsonify(error=msg), 403
        return (f'{msg} <a href="{C.app_base("portal")}/">Zur Startseite</a>', 403, {"Content-Type": "text/html; charset=utf-8"})
    g.user = u


@app.get("/")
def index():
    return C.page("adressen.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


# ---------------------------------------------------------------- Daten
def _extra(v):
    if isinstance(v, dict):
        return v
    try:
        return json.loads(v or "{}")
    except ValueError:
        return {}


def _usage(c):
    """Kontakt-ID → (Anzahl Einträge im Bautagebuch, Projektnamen); Kontakt-ID → Projekt, dessen Baustellenadresse er ist."""
    used = {}
    for r in c.execute("""SELECT i.contact_id AS cid, p.name AS pname, COUNT(*) AS n FROM items i
                          JOIN reports r ON r.id=i.report_id JOIN projects p ON p.id=r.project_id
                          WHERE i.contact_id IS NOT NULL GROUP BY i.contact_id, p.name"""):
        n, names = used.get(r["cid"], (0, []))
        used[r["cid"]] = (n + r["n"], names + [r["pname"]])
    site = {}
    for r in c.execute("SELECT name, extra FROM projects"):
        cid = _extra(r["extra"]).get("contact_id")
        if cid:
            try:
                site[int(cid)] = r["name"]
            except (TypeError, ValueError):
                pass
    return used, site


def _kind(r, site):
    t = [x.strip().lower() for x in re.split(r"[,;]", r["trade"] or "") if x.strip()]
    if r["id"] in site or "baustelle" in t or "bauvorhaben" in t:
        return "baustelle"
    if any(x.startswith("bauherr") for x in t):
        return "bauherr"
    return "firma"


def _out(r, used, site):
    d = {k: (r[k] if k in r.keys() else "") or "" for k in FIELDS}
    n, names = used.get(r["id"], (0, []))
    d.update(id=r["id"], kind=_kind(r, site), used=n, projects=sorted(set(names)), site_of=site.get(r["id"], ""),
             updated=r["updated"] or "")
    return d


def _clean(d, partial=False):
    out = {}
    for k, (mx, _) in FIELDS.items():
        if k in d or not partial:
            v = str(d.get(k) or "").strip()
            out[k] = " ".join(v.split())[:mx] if k != "notes" else v[:mx]
    if "email" in out and out["email"] and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", out["email"]):
        raise ValueError("Die E-Mail-Adresse ist ungültig.")
    if "website" in out and out["website"] and not re.match(r"https?://", out["website"], re.I):
        out["website"] = "https://" + out["website"]
    return out


def _now():
    return datetime.now().isoformat(timespec="seconds")


@app.get("/api/contacts")
def list_contacts():
    with db.tx() as c:
        used, site = _usage(c)
        rows = [_out(r, used, site) for r in c.execute("SELECT * FROM contacts ORDER BY name")]
    return jsonify(rows)


@app.post("/api/contacts")
def create_contact():
    try:
        d = _clean(request.get_json(silent=True) or {})
    except ValueError as e:
        return jsonify(error=str(e)), 400
    if not d["name"]:
        return jsonify(error="Bitte einen Namen eingeben."), 400
    ts = _now()
    try:
        with db.tx() as c:
            with c.savepoint():
                cols = list(d) + ["extra", "created", "updated"]
                cid = c.execute(f"INSERT INTO contacts({', '.join(cols)}) VALUES({', '.join('?' * len(cols))}) RETURNING id",
                                (*d.values(), "{}", ts, ts)).fetchone()[0]
    except db.IntegrityError:
        return jsonify(error=DUP), 409
    C.audit(g.user["name"], "kontakte", "Kontakt angelegt", f"{d['name']} · Adressen")
    return jsonify(ok=True, id=cid)


@app.put("/api/contacts/<int:i>")
def update_contact(i):
    try:
        d = _clean(request.get_json(silent=True) or {}, partial=True)
    except ValueError as e:
        return jsonify(error=str(e)), 400
    if "name" in d and not d["name"]:
        return jsonify(error="Der Name darf nicht leer sein."), 400
    with db.tx() as c:
        old = c.execute("SELECT * FROM contacts WHERE id=?", (i,)).fetchone()
    if not old:
        return jsonify(error="Diesen Kontakt gibt es nicht mehr."), 404
    ch = {k: v for k, v in d.items() if (old[k] or "") != v}
    if not ch:
        return jsonify(ok=True)
    try:
        with db.tx() as c:
            with c.savepoint():
                c.execute(f"UPDATE contacts SET {', '.join(k + '=?' for k in ch)}, updated=? WHERE id=?", (*ch.values(), _now(), i))
    except db.IntegrityError:
        return jsonify(error=DUP), 409
    C.audit(g.user["name"], "kontakte", "Kontakt geändert", f"{ch.get('name') or old['name']} · " + ", ".join(FIELDS[k][1] for k in ch))
    return jsonify(ok=True)


@app.delete("/api/contacts/<int:i>")
def delete_contact(i):
    with db.tx() as c:
        r = c.execute("SELECT * FROM contacts WHERE id=?", (i,)).fetchone()
        if not r:
            return jsonify(ok=True)
        used, site = _usage(c)
        if used.get(i):
            return jsonify(error=f"„{r['name']}“ kommt in Berichten des Bautagebuchs vor und bleibt deshalb erhalten."), 409
        if i in site:
            return jsonify(error=f"„{r['name']}“ ist die Baustellenadresse des Projekts „{site[i]}“ und bleibt deshalb erhalten."), 409
        c.execute("DELETE FROM contacts WHERE id=?", (i,))
    C.audit(g.user["name"], "kontakte", "Kontakt gelöscht", f"{r['name']} · Adressen")
    return jsonify(ok=True)


# ---------------------------------------------------------------- Export
@app.get("/api/contacts.csv")
def export_csv():
    ids = {int(x) for x in request.args.get("ids", "").split(",") if x.isdigit()}
    with db.tx() as c:
        rows = [r for r in c.execute("SELECT * FROM contacts ORDER BY name") if not ids or r["id"] in ids]
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow([lbl for _, (_, lbl) in FIELDS.items()])
    for r in rows:
        w.writerow([(r[k] if k in r.keys() else "") or "" for k in FIELDS])
    C.audit(g.user["name"], "export", "Adressen als CSV exportiert", f"{len(rows)} Kontakte")
    return Response("﻿" + buf.getvalue(), mimetype="text/csv; charset=utf-8",
                    headers={"Content-Disposition": "attachment; filename=Adressen.csv"})


def _vc(s):
    return str(s or "").replace("\\", "\\\\").replace("\n", "\\n").replace(",", "\\,").replace(";", "\\;")


@app.get("/api/contacts/<int:i>.vcf")
def vcard(i):
    with db.tx() as c:
        r = c.execute("SELECT * FROM contacts WHERE id=?", (i,)).fetchone()
    if not r:
        return jsonify(error="Diesen Kontakt gibt es nicht."), 404
    person = r["contact_person"] or ""
    lines = ["BEGIN:VCARD", "VERSION:3.0", f"FN:{_vc(person or r['name'])}", f"ORG:{_vc(r['name'])}"]
    if person:
        parts = person.split()
        lines.append(f"N:{_vc(parts[-1])};{_vc(' '.join(parts[:-1]))};;;")
    else:
        lines.append(f"N:;;;;")
    if r["role"]:
        lines.append(f"TITLE:{_vc(r['role'])}")
    if r["phone"]:
        lines.append(f"TEL;TYPE=WORK,VOICE:{_vc(r['phone'])}")
    if r["mobile"]:
        lines.append(f"TEL;TYPE=CELL:{_vc(r['mobile'])}")
    if r["email"]:
        lines.append(f"EMAIL;TYPE=WORK:{_vc(r['email'])}")
    if r["website"]:
        lines.append(f"URL:{_vc(r['website'])}")
    if r["street"] or r["city"]:
        lines.append(f"ADR;TYPE=WORK:;;{_vc(r['street'])};{_vc(r['city'])};;{_vc(r['zip'])};")
    if r["notes"] or r["trade"]:
        lines.append(f"NOTE:{_vc(' · '.join(x for x in (r['trade'], r['notes']) if x))}")
    lines.append("END:VCARD")
    fn = re.sub(r"[^\w\- ]+", "", r["name"]).strip() or "Kontakt"
    return Response("\r\n".join(lines) + "\r\n", mimetype="text/vcard; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{fn}.vcf"'})


C.wait_schema()
