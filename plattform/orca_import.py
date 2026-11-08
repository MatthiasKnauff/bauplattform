"""ORCA-Import (eigener Container, eigener Port, bleibt dauerhaft): ORCA-AVA-Projekte in die Ausschreibung & Abrechnung übernehmen.

Ablauf: Projektsicherung (*.zip) oder Projektdatei (*.ava) hochladen → lesen und umsetzen (orca_lesen.py) → Vorschau mit
Abgleich gegen die Summen von ORCA (Rechenfunktionen der AVA) und Zuordnung der Firmen zu den Adressen → „Eintragen“ legt im
gewählten Projekt eine eigene AVA-Version an (vorhandene LVs bleiben unberührt). Nur für Administratoren.

Läuft mit EINEM Arbeitsprozess (siehe docker-compose: gunicorn -w 1), weil die Lese-Aufträge im Speicher gehalten werden.
"""
import json, os, re, shutil, tempfile, threading, time, traceback, uuid
from datetime import datetime

from flask import g, jsonify, redirect, request, send_from_directory

from bpcore import db, fehler
import common as C
import orca_lesen

app = C.make_app(__name__)
app.config["MAX_CONTENT_LENGTH"] = int(os.environ.get("ORCA_MAX_MB", "1500")) * 1024 * 1024
TMP = os.environ.get("ORCA_TMP") or os.path.join(tempfile.gettempdir(), "orca")
os.makedirs(TMP, exist_ok=True)
os.environ["ORCA_TMP"] = TMP
JOBS, LOCK = {}, threading.Lock()
HALTEN = 6 * 3600   # Vorschau 6 Stunden aufheben


@app.before_request
def guard():
    p = request.path
    if p.startswith(("/static/", "/bp/")) or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(request.url_root)), 401
        return redirect(C.login_url(request.url))
    if not u["is_admin"]:
        msg = "Der ORCA-Import ist nur für Administratoren."
        return (jsonify(error=msg), 403) if p.startswith("/api/") else (msg, 403)
    g.user = u


@app.get("/")
def index():
    return send_from_directory(C.STATIC, "orca.html")


# ---------------------------------------------------------------- Hilfen
def _norm(name):
    """Firmenname zum Abgleich: ohne Rechtsform, „neu“, Anführungszeichen-Zusätze, Satzzeichen."""
    n = re.sub(r"[\"„“].*?[\"“”]", " ", (name or "").casefold())
    n = re.sub(r"[^\w&]+", " ", n)
    weg = {"neu", "fa", "firma", "gmbh", "mbh", "co", "kg", "ek", "e", "k", "ag", "ohg", "gbr", "und", "&", "inh", "inhaber"}
    return " ".join(w for w in n.split() if w not in weg)


def _aufraeumen():
    jetzt = time.time()
    with LOCK:
        for k in [k for k, j in JOBS.items() if jetzt - j["t"] > HALTEN]:
            JOBS.pop(k, None)


def _eu(v):
    return f"{v:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")


def _abgleich(E):
    """Je LV mit den Rechenfunktionen der AVA nachrechnen und mit ORCA vergleichen (Auftragssumme, Rechnungen)."""
    import ava
    out = []
    for L in E["lvs"]:
        ang = [{"id": k + 1, "preise": json.dumps(a["preise"]), "nachlass": a["nachlass"], "nachlass_eur": 0} for k, a in enumerate(L["angebote"])]
        lv = {"data": json.dumps({"items": L["items"]}), "vergabe": json.dumps(L["vergabe"])}
        re_ = [{"id": 1000 + x["nr"], "nr": x["nr"], "art": x["art"], "status": x["status"], "data": json.dumps(x["data"]),
                "gefordert": x["gefordert"], "eingang": x["eingang"]} for x in L["rechnungen"]]
        k = ava.rechne(lv, ang, [], re_)
        hinweise = []
        o = L["orca"]
        auftrag = round(k["auftrag"] + k["nachtraege"]["beauftragt"], 2)
        if "auftrag" in o and not L["vergabe"].get("frei"):
            nl = (L["vergabe"].get("nachlass") or 0) / 100
            soll = round(o["auftrag"] * (1 - nl), 2)
            if abs(auftrag - soll) > 1:
                hinweise.append(f"Auftragssumme {_eu(auftrag)} statt {_eu(soll)} (ORCA, nach Nachlass)")
        kum = 0.0
        for x, rc in zip(L["rechnungen"], k["rechnungen"]):
            od = x["data"].get("orca") or {}
            if x["art"] == "sicherheit":
                continue
            mein = round(rc["leistung"] - rc["nachlass"], 2)
            if x["art"] in ("abschlag", "schluss") and "stand" in x["data"]:
                kum += od.get("netto1", 0)
            if "frei" in x["data"] or x["art"] == "regie":
                continue
            if abs(mein - od.get("netto1", 0)) > 1 and abs(mein - kum) > 1:
                titel = od.get("bez") or f"{x['nr']}. Rechnung"
                if od.get("stand_uebernommen"):
                    hinweise.append(f"{titel}: in ORCA ohne Prüfstand je Position ({_eu(od.get('netto1', 0))} netto) – Zahlbetrag hier 0, die Leistung zählt in der nächsten Rechnung")
                else:
                    hinweise.append(f"{titel}: Leistung {_eu(mein)} laut Prüfstand je Position – in ORCA {_eu(od.get('netto1', 0))}")
        out.append({"key": L["key"], "nr": L["nr"], "name": L["name"], "status": L["status"], "bieter": L["vergabe"].get("bieter") or "",
                    "ohne_lv": bool(L["vergabe"].get("frei")), "n_pos": sum(1 for x in L["items"] if x["typ"] == "pos" and x.get("art") != "T"),
                    "n_nt": sum(1 for x in L["items"] if x.get("nt")), "n_angebote": len(L["angebote"]), "n_rechnungen": len(L["rechnungen"]),
                    "auftrag": auftrag if L["vergabe"].get("bieter") else 0, "auftrag_orca": o.get("auftrag", 0) + 0,
                    "abgerechnet": k["abgerechnet"], "sicherheit_offen": k["sicherheit"]["offen"], "hinweise": hinweise})
    return out


def _vorschlaege(E):
    """Zielprojekt und Firmen-Zuordnung vorschlagen."""
    with db.tx() as c:
        projekte = [dict(id=r["id"], name=r["name"], archived=bool(r["archived"])) for r in c.execute("SELECT id, name, archived FROM projects ORDER BY archived, name").fetchall()]
        kontakte = [dict(id=r["id"], name=r["name"]) for r in c.execute("SELECT id, name FROM contacts ORDER BY name").fetchall()]
    P = E["projekt"]
    worte = [w for w in re.findall(r"\w{4,}", (P["name"] + " " + P["bauvorhaben"]).casefold()) if w not in ("essen", "straße", "strasse")]
    best, punkte = None, 0
    for p in projekte:
        n = p["name"].casefold()
        s = (5 if P["nr"] and P["nr"].casefold() in n else 0) + sum(1 for w in worte if w in n) - (2 if p["archived"] else 0)
        if s > punkte:
            best, punkte = p["id"], s
    kn = {}
    for k in kontakte:
        kn.setdefault(_norm(k["name"]), k["id"])
    gruppen = {}
    for f in E["firmen"]:
        gruppen.setdefault(_norm(f) or f.casefold(), []).append(f)
    firmen = []
    for key, namen in sorted(gruppen.items()):
        exakt = next((k["id"] for k in kontakte if k["name"].casefold() in {n.casefold() for n in namen}), None)
        aehnlich = kn.get(key) if not exakt else None
        if not exakt and not aehnlich and key:   # erstes Wort gleich (z. B. „Assenmacher“ ↔ „Assenmacher Haustechnik“)
            w0 = key.split()[0]
            kand = [k for k in kontakte if _norm(k["name"]).split()[:1] == [w0]]
            aehnlich = kand[0]["id"] if len(kand) == 1 else None
        neu_name = min(namen, key=lambda n: (len(_norm(n)) == 0, "neu" in n.casefold(), len(n)))
        firmen.append({"key": key, "namen": namen, "kontakt": exakt or aehnlich, "sicher": bool(exakt), "neu_name": re.sub(r"\s+NEU\b.*$", "", neu_name, flags=re.I).strip() or neu_name})
    return {"projekte": projekte, "projekt_vorschlag": best, "kontakte": kontakte, "firmen": firmen}


def _lesen_job(jid, pfad, name):
    def fs(t, a):
        with LOCK:
            JOBS[jid].update(schritt=t, anteil=round(a, 2))
    try:
        E = orca_lesen.lesen(pfad, name, fs)
        fs("Rechne nach …", 0.97)
        A = _abgleich(E)
        V = _vorschlaege(E)
        with LOCK:
            JOBS[jid].update(status="fertig", E=E, abgleich=A, vorschlag=V, schritt="fertig", anteil=1.0)
    except ValueError as e:
        with LOCK:
            JOBS[jid].update(status="fehler", fehler=str(e))
    except Exception as e:
        fehler.still("orca", "ORCA-Datei lesen", e)
        with LOCK:
            JOBS[jid].update(status="fehler", fehler=f"Die Datei ließ sich nicht lesen ({type(e).__name__}: {e}).", trace=traceback.format_exc(limit=5))
    finally:
        try:
            os.unlink(pfad)
        except OSError:
            pass


# ---------------------------------------------------------------- Schnittstellen
@app.post("/api/datei")
def datei():
    _aufraeumen()
    f = request.files.get("datei")
    if not f or not f.filename:
        return jsonify(error="Bitte eine ORCA-Projektsicherung (*.zip) oder Projektdatei (*.ava) wählen."), 400
    if not re.search(r"\.(zip|ava)$", f.filename, re.I):
        return jsonify(error="Erwartet wird eine ORCA-Projektsicherung (*.zip) oder eine Projektdatei (*.ava)."), 400
    if shutil.disk_usage(TMP).free < 3 * 1024 ** 3:
        return jsonify(error="Zu wenig freier Speicher auf dem Server (unter 3 GB) für das Entpacken."), 507
    jid = uuid.uuid4().hex[:12]
    pfad = os.path.join(TMP, jid + os.path.splitext(f.filename)[1].lower())
    f.save(pfad)
    with LOCK:
        JOBS[jid] = {"t": time.time(), "status": "läuft", "schritt": "Datei gespeichert", "anteil": 0.0, "datei": f.filename, "von": g.user["name"]}
    threading.Thread(target=_lesen_job, args=(jid, pfad, f.filename), daemon=True).start()
    return jsonify(job=jid)


@app.get("/api/job/<jid>")
def job(jid):
    with LOCK:
        j = JOBS.get(jid)
        if not j:
            return jsonify(error="Unbekannter oder abgelaufener Vorgang – bitte die Datei neu hochladen."), 404
        out = {k: j[k] for k in ("status", "schritt", "anteil", "datei", "fehler", "ergebnis") if k in j}
        if j["status"] in ("fertig", "eingetragen"):
            E = j["E"]
            out.update(projekt=E["projekt"], warnungen=E["warnungen"], lvs=j["abgleich"], **j["vorschlag"])
    return jsonify(out)


@app.post("/api/job/<jid>/eintragen")
def eintragen(jid):
    import ava
    b = request.get_json(silent=True) or {}
    with LOCK:
        j = JOBS.get(jid)
    if not j or j["status"] not in ("fertig",):
        return jsonify(error="Nichts einzutragen (Vorgang unbekannt, abgelaufen oder schon eingetragen)."), 400
    E = j["E"]
    pid = b.get("project_id")
    if not isinstance(pid, int):
        return jsonify(error="Bitte das Projekt wählen, in das importiert wird."), 400
    vname = (b.get("version") or "").strip()[:200] or f"ORCA-Import {E['projekt']['nr']} {datetime.now().strftime('%d.%m.%Y')}".strip()
    aktiv = bool(b.get("aktiv"))
    wahl = b.get("firmen") if isinstance(b.get("firmen"), dict) else {}
    nur = set(b.get("lvs")) if isinstance(b.get("lvs"), list) else None
    now, wer = ava._now(), g.user["name"]
    with db.tx() as c:
        if not c.execute("SELECT 1 FROM projects WHERE id=?", (pid,)).fetchone():
            return jsonify(error="Projekt nicht gefunden."), 404
        c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", (f"avaver:{pid}",))
        # Firmen: vorhandener Kontakt, neu anlegen (nur Name) oder ohne Kontakt
        cid_von = {}
        neu_n = 0
        for grp in j["vorschlag"]["firmen"]:
            w = wahl.get(grp["key"], grp["kontakt"] or "neu")
            cid = None
            if isinstance(w, int) and c.execute("SELECT 1 FROM contacts WHERE id=?", (w,)).fetchone():
                cid = w
            elif w == "neu":
                r = c.execute("SELECT id FROM contacts WHERE name=?", (grp["neu_name"],)).fetchone()
                if r:
                    cid = r["id"]
                else:
                    cid = c.execute("INSERT INTO contacts(name, art, extra, notes, created, updated) VALUES(?,?,?,?,?,?) RETURNING id",
                                    (grp["neu_name"], "Firma", json.dumps({"quelle": "ORCA-Import"}), f"aus ORCA ({E['projekt']['nr']}) – Adresse fehlt noch", now, now)).fetchone()["id"]
                    neu_n += 1
            for n in grp["namen"]:
                cid_von[n.casefold()] = cid
        # Version: vorhandene LVs ohne Version werden zur „Startversion“, der Import bekommt eine eigene
        alt = c.execute("SELECT id FROM ava_version WHERE project_id=? AND aktiv=1 ORDER BY id DESC LIMIT 1", (pid,)).fetchone()
        if not alt and c.execute("SELECT 1 FROM ava_lv WHERE project_id=? AND version_id IS NULL", (pid,)).fetchone():
            alt = c.execute("INSERT INTO ava_version(project_id, name, aktiv, created, updated, updated_by) VALUES(?,?,1,?,?,?) RETURNING id",
                            (pid, "Startversion", now, now, wer)).fetchone()
            c.execute("UPDATE ava_lv SET version_id=? WHERE project_id=? AND version_id IS NULL", (alt["id"], pid))
        vid = c.execute("INSERT INTO ava_version(project_id, name, aktiv, created, updated, updated_by) VALUES(?,?,0,?,?,?) RETURNING id",
                        (pid, vname, now, now, wer)).fetchone()["id"]
        if aktiv or not alt:
            c.execute("UPDATE ava_version SET aktiv=CASE WHEN id=? THEN 1 ELSE 0 END WHERE project_id=?", (vid, pid))
        n_lv = n_ang = n_re = 0
        for L in E["lvs"]:
            if nur is not None and L["key"] not in nur:
                continue
            items = ava.clean_items(L["items"])
            V = dict(L["vergabe"])
            ai = V.pop("angebot_idx", None)
            if V.get("bieter"):
                V["contact_id"] = cid_von.get(V["bieter"].casefold())
            lid = c.execute("""INSERT INTO ava_lv(project_id, nr, name, gewerk, status, data, vergabe, created, updated, updated_by, version_id)
                               VALUES(?,?,?,?,?,?,?,?,?,?,?) RETURNING id""",
                            (pid, L["nr"][:20], L["name"][:200], L["gewerk"][:120], L["status"], json.dumps({"items": items, "vorbem": ""}, ensure_ascii=False),
                             json.dumps(V, ensure_ascii=False), now, now, wer, vid)).fetchone()["id"]
            amap = {}
            for k, a in enumerate(L["angebote"]):
                amap[k] = c.execute("""INSERT INTO ava_angebot(lv_id, contact_id, bieter, eingang, preise, nachlass, skonto, notiz, quelle, created, updated)
                                       VALUES(?,?,?,?,?,?,?,?,?,?,?) RETURNING id""",
                                    (lid, cid_von.get(a["bieter"].casefold()), a["bieter"][:200], a["eingang"], json.dumps(a["preise"]), a["nachlass"], 0,
                                     a["notiz"], "orca", now, now)).fetchone()["id"]
                n_ang += 1
            if ai is not None and ai in amap:
                V["angebot_id"] = amap[ai]
                c.execute("UPDATE ava_lv SET vergabe=? WHERE id=?", (json.dumps(V, ensure_ascii=False), lid))
            for x in L["rechnungen"]:
                c.execute("""INSERT INTO ava_rechnung(lv_id, nr, art, datum, eingang, re_nr, gefordert, data, status, notiz, created, updated, updated_by)
                             VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                          (lid, x["nr"], x["art"], x["datum"], x["eingang"], x["re_nr"], x["gefordert"], json.dumps(x["data"], ensure_ascii=False),
                           x["status"], x["notiz"][:500], now, now, wer))
                n_re += 1
            n_lv += 1
        pname = c.execute("SELECT name FROM projects WHERE id=?", (pid,)).fetchone()["name"]
    C.audit(wer, "ava", "ORCA-Import", f"{E['projekt']['nr']} {E['projekt']['name']} → {pname}, Version „{vname}“: {n_lv} LVs, {n_ang} Angebote, {n_re} Rechnungen, {neu_n} neue Firmen")
    erg = {"project_id": pid, "projekt": pname, "version_id": vid, "version": vname, "aktiv": bool(aktiv or not alt), "lvs": n_lv, "angebote": n_ang,
           "rechnungen": n_re, "neue_firmen": neu_n, "ava": C.app_base("ava") + "/"}
    with LOCK:
        if jid in JOBS:
            JOBS[jid].update(status="eingetragen", ergebnis=erg)
    return jsonify(erg)


if os.environ.get("APP_MODULE") == "orca_import":   # im Container: warten, bis das Bautagebuch das Schema angelegt hat
    C.wait_schema()
