"""Adressen der Bauplattform (eigener Container, eigener Port – läuft auch ohne Nginx).

Dieselben Daten wie die Kontakte im Bautagebuch und das Firmen-Adressbuch im Bauzeitenplan (Tabelle contacts).
Änderungen hier sind sofort in beiden Apps sichtbar und umgekehrt.

/                 Liste mit Suche und Filter (Firmen, Bauherren, Baustellen), Bearbeiten, Anrufen/E-Mail
/api/contacts     Liste (GET), neu (POST)
/api/contacts/<id>  ändern (PUT), löschen (DELETE – nur wenn im Bautagebuch nicht verwendet)
/api/contacts/export.pdf  Drucken (Adressverzeichnis, wie im Bautagebuch)
/api/contacts/export.xlsx Export für Excel
/api/contacts/<id>.vcf  Visitenkarte (ins Handy übernehmen)
/api/contacts/einlesen…  Excel/CSV einlesen (adressen_einlesen.py)
/api/ansicht/start PUT {ohne_projekt, gefragt} – je Person: Adressen ohne Projektbezug beginnen (users.extra["adressen"]); gelesen über /api/me
"""
import json, re
from datetime import datetime

from flask import Response, g, jsonify, redirect, request

from bpcore import benachrichtigung, db, papierkorb, platform, sso, versionen
from bpcore import contacts as shared_contacts
import common as C

app = C.make_app(__name__)

FIELDS = {   # Feld → (höchste Länge, Bezeichnung für das Protokoll)
    "name": (200, "Name"), "trade": (300, "Gewerk"), "contact_person": (200, "Ansprechpartner:in"), "role": (200, "Funktion"),
    "phone": (100, "Telefon"), "mobile": (100, "Mobil"), "email": (200, "E-Mail"), "website": (300, "Internet"),
    "street": (200, "Straße"), "zip": (20, "PLZ"), "city": (200, "Ort"), "notes": (5000, "Notizen"), "art": (60, "Art"),
    "stichworte": (600, "Stichwörter"), "tags": (300, "Tags"),   # in der Tabelle änderbar (Spalte „Stichwörter“)
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
        return C.gesperrt("adressen", msg)   # im Büro abgeschaltet oder für das Konto nicht freigeschaltet
    g.user = u


@app.get("/")
def index():
    return C.page("adressen.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user), start=start_lesen(g.user["id"]))


def _user_extra(c, uid):
    r = c.execute("SELECT extra FROM users WHERE id=?", (uid,)).fetchone()
    try:
        return json.loads((r and r["extra"]) or "{}") or {}
    except ValueError:
        return {}


def start_lesen(uid):
    """Wie die Adressen für diese Person beginnen: mit Projektbezug (Standard) oder ohne; ob schon einmal gefragt wurde."""
    with db.tx() as c:
        a = _user_extra(c, uid).get("adressen") or {}
    return {"ohne_projekt": bool(a.get("ohne_projekt")), "gefragt": bool(a.get("gefragt"))}


@app.put("/api/ansicht/start")
def start_merken():
    d = request.get_json(silent=True) or {}
    with db.tx() as c:
        ex = _user_extra(c, g.user["id"])
        a = dict(ex.get("adressen") or {})
        for k in ("ohne_projekt", "gefragt"):
            if k in d:
                a[k] = bool(d[k])
        ex["adressen"] = a
        c.execute("UPDATE users SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), g.user["id"]))
    return jsonify(start_lesen(g.user["id"]))


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


STANDARD_ART = {"firma": "firma", "firmen": "firma", "bauherr": "bauherr", "bauherr:in": "bauherr", "bauherr:innen": "bauherr", "bauherrin": "bauherr", "bauherren": "bauherr", "baustelle": "baustelle", "baustellen": "baustelle",
                "plotdienst": "Plotdienst", "plotdienste": "Plotdienst", "plotservice": "Plotdienst",
                "behoerde": "behoerde", "behörde": "behoerde", "behörden": "behoerde", "amt": "behoerde"}   # Behörde als feste Art (BH-1, 22.11.2026)


def _kind(r, site):
    a = " ".join(str((r["art"] if "art" in r.keys() else "") or "").split())
    if a:   # selbst gewählte Art geht vor; eigene Arten (z. B. „Behörde“) erscheinen in Adressen als eigener Filter
        return STANDARD_ART.get(a.lower(), a)
    t = [x.strip().lower() for x in re.split(r"[,;]", r["trade"] or "") if x.strip()]
    if r["id"] in site or "baustelle" in t or "bauvorhaben" in t:
        return "baustelle"
    if any(x.startswith("bauherr") for x in t):
        return "bauherr"
    return "firma"


_weitere = shared_contacts.weitere_bereinigen   # eine Prüfung für alle Apps (bpcore/contacts.py)


def _out(r, used, site, pnamen=None):
    d = {k: (r[k] if k in r.keys() else "") or "" for k in shared_contacts.FELDER}   # auch Stichwörter und Tags (fehlten in der Liste)
    d["weitere"] = _extra(r["extra"] if "extra" in r.keys() else "{}").get("weitere") or []
    d["firma"] = shared_contacts.firma(r)
    n, names = used.get(r["id"], (0, []))
    ex, pn = _extra(r["extra"] if "extra" in r.keys() else "{}"), pnamen or {}
    nr = ex.get("projektnr") or []   # Projektnummern am Kontakt (PZ-1): Projekt im Bauportal mit diesem Kürzel → beteiligt, sonst bleibt die Nummer offen
    names = names + [pn[p] for p in (ex.get("projekte") or []) if p in pn] + [pn[k] for k in nr if k in pn]
    d["projektnr"], d["projektnr_offen"] = nr, [k for k in nr if k not in pn]
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
        pn = {}
        for r in c.execute("SELECT id, name FROM projects"):
            pn[r["id"]] = r["name"]
            k = shared_contacts.projekt_kuerzel(r["name"])
            if k:
                pn.setdefault(k, r["name"])
        rows = [_out(r, used, site, pn) for r in c.execute("SELECT * FROM contacts ORDER BY name")]
    return jsonify(rows)


@app.get("/api/contacts/suggest")
def suggest():
    """Firmenvorschläge aus dem Netz (OpenStreetMap) – wie beim Anlegen im Bautagebuch (dort abgefragt)."""
    from urllib.parse import urlencode
    q = {k: request.args.get(k, "") for k in ("q", "lat", "lon", "pid", "ort") if request.args.get(k)}
    try:
        return jsonify(C.bt_api("GET", "/api/contacts/suggest?" + urlencode(q)) or {"items": []})
    except RuntimeError as e:
        return jsonify(items=[], error=str(e))


@app.get("/api/contacts/suggest/detail")
def suggest_detail():
    from urllib.parse import urlencode
    try:
        return jsonify(C.bt_api("GET", "/api/contacts/suggest/detail?" + urlencode({"type": request.args.get("type", ""), "id": request.args.get("id", "")})) or {})
    except RuntimeError as e:
        return jsonify(error=str(e))


@app.post("/api/contacts")
def create_contact():
    b = request.get_json(silent=True) or {}
    try:
        d = _clean(b)
        W = _weitere(b.get("weitere"))
        FI = shared_contacts.firma_bereinigen(b["firma"]) if isinstance(b.get("firma"), dict) else None
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
                                (*d.values(), json.dumps({**({"weitere": W} if W else {}), **({"firma": FI} if FI and any(FI.values()) else {})}, ensure_ascii=False), ts, ts)).fetchone()[0]
            versionen.nach(c, f"kontakt:{cid}", g.user["name"])
            benachrichtigung.zuordnen(c, cid, d.get("email"))
    except db.IntegrityError:
        return jsonify(error=DUP), 409
    C.audit(g.user["name"], "kontakte", "Kontakt angelegt", f"{d['name']} · Adressen")
    return jsonify(ok=True, id=cid)


@app.put("/api/contacts/<int:i>")
def update_contact(i):
    b = request.get_json(silent=True) or {}
    try:
        d = _clean(b, partial=True)
        W = _weitere(b.get("weitere")) if "weitere" in b else None
        FI = shared_contacts.firma_bereinigen(b["firma"]) if isinstance(b.get("firma"), dict) else None
    except ValueError as e:
        return jsonify(error=str(e)), 400
    if "name" in d and not d["name"]:
        return jsonify(error="Der Name darf nicht leer sein."), 400
    with db.tx() as c:
        old = c.execute("SELECT * FROM contacts WHERE id=?", (i,)).fetchone()
    if not old:
        return jsonify(error="Diesen Kontakt gibt es nicht mehr."), 404
    ch = {k: v for k, v in d.items() if (old[k] or "") != v}
    ex = _extra(old["extra"])
    if W is not None and (ex.get("weitere") or []) != W:
        ex["weitere"] = W
        ch["extra"] = json.dumps(ex, ensure_ascii=False)
    if FI is not None and shared_contacts.firma(old) != FI:   # Rechtsform, Sitz, HRB, Mitarbeiter:innen (AB-C1)
        ex["firma"] = FI
        ch["extra"] = json.dumps(ex, ensure_ascii=False)
    if not ch:
        return jsonify(ok=True)
    try:
        with db.tx() as c:
            versionen.vor(c, f"kontakt:{i}")
            with c.savepoint():
                c.execute(f"UPDATE contacts SET {', '.join(k + '=?' for k in ch)}, updated=? WHERE id=?", (*ch.values(), _now(), i))
            versionen.nach(c, f"kontakt:{i}", g.user["name"])
            if ch.get("email"):
                benachrichtigung.zuordnen(c, i, ch["email"])
    except db.IntegrityError:
        return jsonify(error=DUP), 409
    C.audit(g.user["name"], "kontakte", "Kontakt geändert", f"{ch.get('name') or old['name']} · " + ", ".join(FIELDS[k][1] if k in FIELDS else "Weitere Angaben" for k in ch))
    return jsonify(ok=True)


# ---------------------------------------------------------------- Einlesen (Mock „Adressen einlesen“ AE-1 … AE-7, plattform/adressen_einlesen.py)
import adressen_einlesen as EIN


@app.post("/api/contacts/einlesen/datei")
def einlesen_datei():
    f = request.files.get("datei")
    if not f:
        return jsonify(error="Keine Datei."), 400
    try:
        Z = EIN.lesen(f.filename, f.read(EIN.MAX_BYTES + 1))   # nur gelesen, nicht gespeichert
    except ValueError as e:
        return jsonify(error=str(e)), 400
    if len(Z) < 2:
        return jsonify(error="In der Datei stehen keine Adressen."), 400
    S = EIN.spalten(Z[0], Z[1:])
    with db.tx() as c:
        K, n = EIN.ordnen(c, Z[1:], S)
    return jsonify(kopf=Z[0], zeilen=Z[1:], spalten=S, felder=EIN.FELDER, kontakte=K, summe=n)


@app.post("/api/contacts/einlesen/ordnen")
def einlesen_ordnen():
    b = request.get_json(silent=True) or {}
    Z, S = b.get("zeilen"), b.get("spalten")
    if not isinstance(Z, list) or not isinstance(S, list) or len(Z) > EIN.MAX_ZEILEN:
        return jsonify(error="Ungültige Angaben."), 400
    Z = [[str(x)[:2000] for x in r] for r in Z if isinstance(r, list)]
    S = [x if x in EIN.FELDER else "" for x in S]
    with db.tx() as c:
        K, n = EIN.ordnen(c, Z, S)
    return jsonify(kontakte=K, summe=n)


@app.get("/api/contacts/projektordner")
def projektordner():
    """Projektordner des Dateiservers (nur gelesen – es wird kein Projekt angelegt, PZ-1): Namen zu Projektnummern und Auswahl „＋ Projekt“."""
    try:
        L = C.bt_api("GET", "/api/store/folders?alle=1") or []
    except RuntimeError:
        L = []
    return jsonify([n for n in L if isinstance(n, str)])


def _einlesen_key():
    return f"kontakte:einlesen:{g.user['id']}"


@app.post("/api/contacts/einlesen")
def einlesen():
    b = request.get_json(silent=True) or {}
    L = b.get("kontakte")
    if not isinstance(L, list) or len(L) > EIN.MAX_ZEILEN:
        return jsonify(error="Ungültige Angaben."), 400
    L = [k for k in L if isinstance(k, dict)]
    try:
        with db.tx() as c:
            r = EIN.einlesen(c, L, g.user["name"])
            c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated",
                      (_einlesen_key(), json.dumps(r["stand"]), _now(), g.user["name"]))   # Rückgängig nur für die eigene letzte Einlesung – die Kennungen bleiben auf dem Server
    except ValueError as e:
        return jsonify(error=str(e)), 400
    C.audit(g.user["name"], "kontakte", "Adressen eingelesen", f"{r['neu']} neu · {r['ergaenzt']} ergänzt")
    return jsonify(ok=True, neu=r["neu"], ergaenzt=r["ergaenzt"])


@app.post("/api/contacts/einlesen/zurueck")
def einlesen_zurueck():
    with db.tx() as c:
        x = c.execute("SELECT data FROM bp_store WHERE key=?", (_einlesen_key(),)).fetchone()
        if not x:
            return jsonify(error="Es gibt nichts zurückzunehmen."), 409
        r = EIN.zurueck(c, json.loads(x["data"]))
        c.execute("DELETE FROM bp_store WHERE key=?", (_einlesen_key(),))
    C.audit(g.user["name"], "kontakte", "Einlesen zurückgenommen", f"{r['weg']} entfernt" + (f", {r['blieb']} schon benutzt" if r["blieb"] else ""))
    return jsonify(ok=True, **r)


_KEINDUP = "kontakte:keine_duplikate"


def _keindup(c):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (_KEINDUP,)).fetchone()
    try:
        return set(json.loads(r["data"]) if r else [])
    except (TypeError, ValueError):
        return set()


@app.get("/api/contacts/duplikate")
def duplikate():
    """Mögliche Duplikate (gleiche E-Mail, Telefon, Internetseite, gleicher/ähnlicher Name) – Gruppen mit den Kontakten."""
    with db.tx() as c:
        used, site = _usage(c)
        alle = {r["id"]: _out(r, used, site) for r in c.execute("SELECT * FROM contacts")}
        G = shared_contacts.duplikate(c, _keindup(c))
    return jsonify([{**g, "kontakte": [alle[i] for i in g["ids"] if i in alle]} for g in G])


@app.post("/api/contacts/zusammenfuehren")
def zusammenfuehren():
    """{ziel, quellen: [...], felder: {feld: wert}} – ziel bekommt die gewählten Werte, alle Verweise der quellen werden umgehängt, quellen gelöscht."""
    b = request.get_json(silent=True) or {}
    ziel, quellen = b.get("ziel"), [q for q in (b.get("quellen") or []) if isinstance(q, int) and q != b.get("ziel")]
    if not isinstance(ziel, int) or not quellen:
        return jsonify(error="Bitte den Kontakt wählen, der bleibt, und mindestens einen weiteren."), 400
    try:
        felder = _clean(b.get("felder") or {}, partial=True)
    except ValueError as e:
        return jsonify(error=str(e)), 400
    with db.tx() as c:
        z = c.execute("SELECT * FROM contacts WHERE id=?", (ziel,)).fetchone()
        if not z:
            return jsonify(error="Kontakt nicht gefunden"), 404
        namen = []
        for q in quellen:
            r = c.execute("SELECT name FROM contacts WHERE id=?", (q,)).fetchone()
            if not r:
                continue
            versionen.vor(c, f"kontakt:{q}")
            shared_contacts.zusammenfuehren(c, ziel, q)
            versionen.nach(c, f"kontakt:{q}", g.user["name"])
            namen.append(r["name"])
        if felder:
            if "name" in felder and felder["name"].lower() != (z["name"] or "").lower() and c.execute("SELECT 1 FROM contacts WHERE name=? AND id<>?", (felder["name"], ziel)).fetchone():
                return jsonify(error=DUP), 409
            versionen.vor(c, f"kontakt:{ziel}")
            sets = ", ".join(f"{k}=?" for k in felder)
            c.execute(f"UPDATE contacts SET {sets}, updated=? WHERE id=?", (*felder.values(), _now(), ziel))
            versionen.nach(c, f"kontakt:{ziel}", g.user["name"])
    C.audit(g.user["name"], "kontakte", "Kontakte zusammengeführt", f"{', '.join(namen)} → {felder.get('name') or z['name']}")
    return jsonify(ok=True, n=len(namen))


@app.post("/api/contacts/keine-duplikate")
def keine_duplikate():
    """{ids} – diese Kontakte sind verschieden; bei der Duplikatsuche nicht mehr vorschlagen."""
    ids = sorted({i for i in (request.get_json(silent=True) or {}).get("ids") or [] if isinstance(i, int)})
    with db.tx() as c:
        s_ = _keindup(c)
        s_ |= {f"{a}-{b}" for k, a in enumerate(ids) for b in ids[k + 1:]}
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated",
                  (_KEINDUP, json.dumps(sorted(s_)), _now(), g.user["name"]))
    return jsonify(ok=True)


@app.delete("/api/contacts/<int:i>")
def delete_contact(i):
    with db.tx() as c:
        r = c.execute("SELECT * FROM contacts WHERE id=?", (i,)).fetchone()
        if not r:
            return jsonify(ok=True)
        why = shared_contacts.usage(c, i)   # gleiche Regel wie im Bautagebuch und im Bauzeitenplan
        if why:
            return jsonify(error=shared_contacts.blocked_message(r["name"], why), orte=shared_contacts.orte(c, i)), 409
        versionen.vor(c, f"kontakt:{i}")   # im Verlauf als „gelöscht“
        pk = papierkorb.ablegen(c, "contacts", i, "Kontakt", r["name"], g.user["name"], "", "adressen")   # wiederherstellbar (Papierkorb)
        versionen.nach(c, f"kontakt:{i}", g.user["name"])
    C.audit(g.user["name"], "kontakte", "Kontakt in den Papierkorb gelegt", f"{r['name']} · Adressen")
    return jsonify(ok=True, papierkorb=pk)


# ---------------------------------------------------------------- Export und Druck (wie im Bautagebuch)
# Spalten wie im Bautagebuch (modules/contacts.py): Bezeichnung, Feld, Breite in Excel
COLS = shared_contacts.EXPORT_COLS   # Excel- und PDF-Export: ein Baustein in bpcore/contacts.py (auch im Bautagebuch)


def _sel():
    """Kontakte wie in der Liste gefiltert: ?ids=1,2,3 (leer = alle); ?filter= Beschreibung des Filters für die Kopfzeile."""
    ids = {int(x) for x in request.args.get("ids", "").split(",") if x.isdigit()}
    with db.tx() as c:
        used, _ = _usage(c)
        rows = [dict(r, used=used.get(r["id"], (0, []))[0]) for r in c.execute("SELECT * FROM contacts ORDER BY name")
                if not ids or r["id"] in ids]
    return [{k: (v if v is not None else "") for k, v in r.items()} for r in rows], (request.args.get("filter") or "").strip()[:200] or "alle Kontakte"


def _office():
    try:
        with db.tx() as c:
            r = c.execute("SELECT value FROM settings WHERE key='office_name'").fetchone()
        return (r["value"] if r else "") or ""
    except Exception:   # ohne Büronamen drucken – kein Grund abzubrechen
        return ""


@app.get("/api/contacts/export.xlsx")
def export_xlsx():
    rows, label = _sel()
    C.audit(g.user["name"], "export", "Adressverzeichnis als Excel exportiert", f"{len(rows)} Kontakte · {label} · Adressen")
    name = f"Adressen_{datetime.now():%Y-%m-%d}.xlsx"
    return Response(shared_contacts.export_xlsx(rows), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


@app.get("/api/contacts/export.pdf")
def export_pdf():
    """Adressverzeichnis zum Drucken – gleiches Layout wie im Bautagebuch (ein Baustein in bpcore/contacts.py), hier mit Logo und Kurzname."""
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm
    rows, label = _sel()
    office = _office()
    try:
        with db.tx() as c:
            kurz = C.kurzname(c) or office
    except Exception:   # ohne Kurznamen: Büroname reicht für die Kopfzeile
        kurz = office
    logo = lambda cv: C.draw_logo(cv, landscape(A4)[0] - 12 * mm, landscape(A4)[1] - 6 * mm, 12 * mm, 50 * mm)
    pdf = shared_contacts.export_pdf(rows, label, kopf=kurz, fuss="Adressen – Adressverzeichnis", logo=logo, top_mm=22)
    C.audit(g.user["name"], "export", "Adressverzeichnis als PDF exportiert", f"{len(rows)} Kontakte · {label} · Adressen")
    return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="Adressen_{datetime.now():%Y-%m-%d}.pdf"'})


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
        lines.append("N:;;;;")
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
    for x in _extra(r["extra"]).get("weitere") or []:
        bz = _vc(x.get("bez") or "")
        if x["typ"] == "tel" and x.get("wert"):
            lines.append(f"TEL;TYPE=VOICE:{_vc(x['wert'])}")
        elif x["typ"] == "mail" and x.get("wert"):
            lines.append(f"EMAIL;TYPE=INTERNET:{_vc(x['wert'])}")
        elif x["typ"] == "adr" and (x.get("street") or x.get("city")):
            lines.append(f"ADR:;{bz};{_vc(x.get('street', ''))};{_vc(x.get('city', ''))};;{_vc(x.get('zip', ''))};")
    if r["notes"] or r["trade"]:
        lines.append(f"NOTE:{_vc(' · '.join(x for x in (r['trade'], r['notes']) if x))}")
    lines.append("END:VCARD")
    fn = re.sub(r"[^\w\- ]+", "", r["name"]).strip() or "Kontakt"
    return Response("\r\n".join(lines) + "\r\n", mimetype="text/vcard; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{fn}.vcf"'})


C.wait_schema()
