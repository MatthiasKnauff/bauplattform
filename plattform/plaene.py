"""Planstand & Versand: Pläne im Projektordner finden, den neuesten Index zeigen, an die Firmen schicken, Planversandliste führen.

Die Dateien liegen auf dem Server des Büros; nur das Bautagebuch hat Zugang zur Ablage. Diese App fragt es mit der
Anmeldung des Benutzers (/api/plaene/dateien, /api/plaene/datei) und liest die Plannamen nach der Plannummerierung
(bpcore/planname.py). Einstellungen (Phasen, Planarten, Kennungen, Stichwörter → Gewerk) in bp_store „plaene“,
je Projekt (Planordner, eigene Gewerk-Zuordnungen) in „plaene:<Projekt-ID>“. Versand → Tabelle planversand.
"""
import io, json, re, urllib.error, urllib.parse, urllib.request
from datetime import datetime

from flask import Response, g, jsonify, redirect, request

from bpcore import benachrichtigung, db, fehler, konto, mail, plan, planname, platform, sso, versionen, vorlagen
import common as C

app = C.make_app(__name__)


@app.before_request
def guard():
    p = request.path
    if p.startswith(("/static/", "/bp/")) or p in ("/api/health", "/logo.png", "/api/brand"):
        return
    u = C.current_user()
    if not u or u["must_change"]:
        if p.startswith("/api/"):
            return jsonify(error="Nicht angemeldet", login=C.login_url(C.app_base("plaene") + "/")), 401
        return redirect(C.login_url(request.url))
    if not sso.has_app(u, "plaene"):
        msg = "Für „Planstand & Versand“ ist dein Konto nicht freigeschaltet."
        if p.startswith("/api/"):
            return jsonify(error=msg), 403
        return (f'{msg} <a href="{C.app_base("portal")}/">Zur Startseite</a>', 403, {"Content-Type": "text/html; charset=utf-8"})
    g.user = u


@app.get("/")
def index():
    return C.page("plaene.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


# ---------------------------------------------------------------- Hilfen
def _j(v, d):
    try:
        x = json.loads(v) if isinstance(v, str) else v
        return x if x is not None else d
    except (TypeError, ValueError):
        return d


def _now():
    return datetime.now().isoformat(timespec="seconds")


def _de(iso):
    try:
        return datetime.fromisoformat(iso).strftime("%d.%m.%Y")
    except (TypeError, ValueError):
        return iso or ""


def _store(c, key, default):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (key,)).fetchone()
    return _j(r["data"], default) if r else default


def _put(c, key, val):
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data, "
              "updated=excluded.updated, updated_by=excluded.updated_by", (key, json.dumps(val, ensure_ascii=False), _now(), g.user["name"]))


def conf(c):
    d = _store(c, "plaene", {})
    out = json.loads(json.dumps(planname.STANDARD))
    if isinstance(d, dict):
        for k in ("phasen", "planarten", "kennungen", "stichworte"):
            if isinstance(d.get(k), dict):
                out[k] = {str(a).strip()[:40]: str(b).strip()[:400] for a, b in d[k].items() if str(a).strip()}
        # frühere, falsche Vorgaben (Phasen verschoben, Planart an zweiter Stelle) durch die richtigen ersetzen
        if out["phasen"] == planname.ALT_PHASEN:
            out["phasen"] = dict(planname.STANDARD["phasen"])
        if out["planarten"] == planname.ALT_PLANARTEN:
            out["planarten"] = dict(planname.STANDARD["planarten"])
        if out["kennungen"] == {"ELT": "Elektro"}:
            out["kennungen"] = dict(planname.STANDARD["kennungen"])
        try:
            out["max_mb"] = max(1, min(100, int(d.get("max_mb", out["max_mb"]))))
        except (TypeError, ValueError):
            pass
        if isinstance(d.get("stellen"), list) and d["stellen"]:
            out["stellen"] = [str(x) if str(x) in planname.ROLLEN else "egal" for x in d["stellen"][:6]]
    out["plot"] = _plot(d.get("plot") if isinstance(d, dict) else None)
    return out


PLOT_STANDARD = {"farbe": "farbe", "foto": False, "gefaltet": True, "gelocht": False, "saetze": 1, "lieferung": "abholen"}


def _plot(x):
    """Vorgaben für den Plotauftrag (Farbe/SW, Fotodruck, gefaltet, gelocht, Sätze)."""
    o = dict(PLOT_STANDARD)
    if isinstance(x, dict):
        o["farbe"] = "sw" if x.get("farbe") == "sw" else "farbe"
        o["lieferung"] = x.get("lieferung") if x.get("lieferung") in ("abholen", "baustelle", "buero") else "abholen"
        for k in ("foto", "gefaltet", "gelocht"):
            if k in x:
                o[k] = bool(x[k])
        try:
            o["saetze"] = max(1, min(50, int(x.get("saetze", 1))))
        except (TypeError, ValueError):
            pass
    return o


def _sees(c, pid):
    r = c.execute("SELECT id, name, street, zip, city, leaders, archived FROM projects WHERE id=?", (pid,)).fetchone()
    if not r:
        return None
    lead = _j(r["leaders"], []) or []
    return r if g.user["is_admin"] or not lead or g.user["id"] in lead else None


def _bt(path, raw=False):
    """Aufruf beim Bautagebuch mit der Anmeldung des Benutzers."""
    with db.tx() as c:
        tok = sso.current_token(request, c)
    req = urllib.request.Request(C.BT_INTERNAL + path, headers={"Cookie": f"{sso.COOKIE}={tok}"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = r.read()
            return data if raw else json.loads(data.decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read().decode()).get("error")
        except Exception:   # Fehlertext nicht lesbar: allgemeine Meldung mit Statuscode
            msg = None
        raise ValueError(msg or f"Bautagebuch antwortet mit Fehler {e.code}.")
    except (urllib.error.URLError, OSError) as e:
        raise ValueError(f"Bautagebuch nicht erreichbar ({e}).")


def firmen(c, pid):
    """Firmen des Projekts mit E-Mail: aus den Bauzeitenplänen (Gewerke & Firmen) und den Anwesenden der Bautagesberichte."""
    out = {}

    def add(cid, gw=""):
        if not cid:
            return
        e = out.get(cid)
        if not e:
            r = c.execute("SELECT id, name, email, trade, contact_person FROM contacts WHERE id=?", (cid,)).fetchone()
            if not r:
                return
            e = out[cid] = {"id": r["id"], "name": r["name"], "email": (r["email"] or "").strip(), "person": r["contact_person"] or "",
                            "gewerke": [r["trade"]] if r["trade"] else []}
        if gw and gw not in e["gewerke"]:
            e["gewerke"].append(gw)
    try:
        with c.savepoint():   # scheitert das Auslesen der Pläne, bleibt die Transaktion für die Abfrage unten nutzbar
            fm = plan.firm_map(c)
            for _, data in plan.plans(c, pid):
                for gw, tr in ((data or {}).get("trades") or {}).items():
                    if isinstance(tr, dict) and tr.get("firm"):
                        add(fm.get(tr["firm"], ("", None))[1], gw)
    except Exception as e:
        fehler.still("plaene", "Empfänger: Firmen aus den Plänen ermitteln", e)
        pass
    for r in c.execute("SELECT DISTINCT i.contact_id FROM items i JOIN reports r ON r.id=i.report_id WHERE r.project_id=? AND i.contact_id IS NOT NULL", (pid,)):
        add(r["contact_id"])
    return sorted(out.values(), key=lambda e: e["name"].lower())


def plotdienste(c):
    """Kontakte mit der Art „Plotdienst“ (Adressen → Art, auch „Plotservice“, „Plotdienste“) – im Versand immer zur Auswahl,
    für jedes Projekt, ohne Suchen. Nicht vorausgewählt."""
    return [{"id": r["id"], "name": r["name"], "email": (r["email"] or "").strip(), "person": r["contact_person"] or "", "gewerke": ["Plotdienst"], "plot": True}
            for r in c.execute("SELECT id, name, email, contact_person FROM contacts WHERE lower(trim(art)) LIKE 'plot%' ORDER BY lower(name)")]


def passt(gewerk, f):
    """Gehört die Firma zum Gewerk? „alle Firmen“ passt immer; sonst Teilwort in beide Richtungen („HLS“ ↔ „HLS-Installation“)."""
    g_ = (gewerk or "").strip().lower()
    if not g_:
        return False
    if g_ in ("alle", "alle firmen"):
        return True
    return any(g_ in x.lower() or (len(x) > 2 and x.lower() in g_) for x in f["gewerke"] if x)


# ---------------------------------------------------------------- Projekte, Einstellungen
@app.get("/api/projekte")
def projekte():
    with db.tx() as c:
        out = []
        for r in c.execute("SELECT id, name, leaders, archived FROM projects ORDER BY archived, name"):
            lead = _j(r["leaders"], []) or []
            if g.user["is_admin"] or not lead or g.user["id"] in lead:
                out.append({"id": r["id"], "name": r["name"], "archived": bool(r["archived"]), "mine": g.user["id"] in lead})
    return jsonify(out)


@app.get("/api/kontakte")
def kontakte():
    """Alle Adressen mit E-Mail (Vorschläge für „weitere E-Mail-Adresse“ im Versand)."""
    with db.tx() as c:
        out = []
        for r in c.execute("SELECT name, email, extra FROM contacts ORDER BY name"):
            if r["email"]:
                out.append({"name": r["name"], "email": r["email"]})
            try:   # weitere E-Mail-Adressen und Ansprechpartner (Adressen → „weitere E-Mail“)
                W = (json.loads(r["extra"] or "{}") or {}).get("weitere") or []
            except (ValueError, TypeError):
                W = []
            for x in W:
                m = x.get("wert") if x.get("typ") == "mail" else x.get("mail") if x.get("typ") == "person" else ""
                if m:
                    out.append({"name": f"{r['name']} – {x.get('bez') or x.get('wert') or ''}".strip(" –"), "email": m})
        return jsonify(out)


@app.route("/api/einstellungen", methods=["GET", "PUT"])
def einstellungen():
    with db.tx() as c:
        if request.method == "PUT":
            if not g.user["is_admin"]:
                return jsonify(error="Die Einstellungen ändert der Administrator."), 403
            b = request.get_json(silent=True) or {}
            cur = conf(c)
            for k in ("phasen", "planarten", "kennungen", "stichworte"):
                if isinstance(b.get(k), dict):
                    cur[k] = {str(a).strip()[:40]: str(v).strip()[:400] for a, v in b[k].items() if str(a).strip() and str(v).strip()}
            if isinstance(b.get("stellen"), list) and b["stellen"]:
                cur["stellen"] = [str(x) if str(x) in planname.ROLLEN else "egal" for x in b["stellen"][:6]]
            if isinstance(b.get("plot"), dict):
                cur["plot"] = _plot(b["plot"])
            if "max_mb" in b:
                try:
                    cur["max_mb"] = max(1, min(100, int(b["max_mb"])))
                except (TypeError, ValueError):
                    return jsonify(error="Bitte eine Zahl für die Größe der Anhänge eingeben."), 400
            with versionen.aenderung(c, "bp:plaene", g.user["name"]):
                _put(c, "plaene", cur)
            C.audit(g.user["name"], "plaene", "Einstellungen gespeichert")
        return jsonify(**conf(c), standard=planname.STANDARD, admin=bool(g.user["is_admin"]), mail=mail.configured(mail.conf(c)))


@app.put("/api/projekt/<int:pid>")
def projekt_merken(pid):
    """Planordner und eigene Gewerk-Zuordnungen des Projekts merken (gelten für alle Benutzer)."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        m = _store(c, f"plaene:{pid}", {})
        if "ordner" in b:
            m["ordner"] = str(b["ordner"] or "").strip()[:400]
        if "aus" in b:   # ausgeschlossene Ordner (Verzeichnisbaum); None = Vorgabe (Foto-/Bautagebuch-Ordner)
            m["aus"] = None if b["aus"] is None else [str(x)[:400] for x in (b["aus"] or [])][:500]
        if isinstance(b.get("zuordnung"), dict):
            z = m.setdefault("zuordnung", {})
            for k, v in b["zuordnung"].items():
                k, v = str(k)[:200], str(v or "").strip()[:80]
                if v:
                    z[k] = v
                else:
                    z.pop(k, None)
        _put(c, f"plaene:{pid}", m)
    return jsonify(ok=True, **m)


# ---------------------------------------------------------------- Pläne
@app.get("/api/plaene")
def plaene():
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        p = _sees(c, pid) if pid else None
        if not p:
            return jsonify(error="Projekt nicht gefunden"), 404
        cf, m = conf(c), _store(c, f"plaene:{pid}", {})
        fl = firmen(c, pid)
        pd = plotdienste(c)
        gesendet = {}
        for r in c.execute("SELECT datum, art, empfaenger, plaene FROM planversand WHERE project_id=? ORDER BY id", (pid,)):
            an = ", ".join(e.get("name") or e.get("email") or "" for e in _j(r["empfaenger"], []))
            for x in _j(r["plaene"], []):
                gesendet.setdefault(x.get("pfad"), []).append({"datum": r["datum"], "an": an, "art": r["art"]})
        gw_plan = sorted({gw for _, d in plan.plans(c, pid) for gw in ((d or {}).get("trades") or {})})
    q = {"project_id": pid}
    if m.get("aus") is not None:
        q["aus"] = json.dumps(m["aus"])
    if request.args.get("neu") == "1":   # „Neu einlesen“: Zwischenspeicher übergehen
        q["neu"] = "1"
    try:
        d = _bt("/api/plaene/dateien?" + urllib.parse.urlencode(q))
    except ValueError as e:
        return jsonify(error=str(e), firmen=fl, plotdienste=pd), 502
    pl, sonst = planname.ordnen(d.get("dateien") or [], cf, m.get("zuordnung") or {})
    for x in pl:
        for st in x["staende"]:
            if st["pdf"]:
                st["pdf"]["versendet"] = gesendet.get(st["pdf"]["pfad"], [])
    for f in sonst:
        f["versendet"] = gesendet.get(f["pfad"], [])
    try:   # dauerhafte Markierungen (gemeinsam markieren) am Plan: wann zuletzt und von wem
        with db.tx() as c:
            # je Plan zählt – wie in der Ansicht – nur die zuletzt benutzte dauerhafte Skizze; ältere zum selben Plan bleiben unberücksichtigt
            mk, zuletzt = {}, {}
            for r in c.execute("""SELECT s.name, s.groesse, s.updated, max(x.created) AS wann, string_agg(DISTINCT x.name, ', ') AS wer, count(x.id) AS n
                                  FROM skizze s LEFT JOIN skizze_strich x ON x.skizze_id = s.id AND x.geloescht = 0
                                  WHERE s.dauerhaft = 1 GROUP BY s.id, s.name, s.groesse, s.updated""").fetchall():
                k = (r["name"], int(r["groesse"] or 0))
                if k in zuletzt and (r["updated"] or "") <= zuletzt[k]:
                    continue
                zuletzt[k] = r["updated"] or ""
                if r["n"]:
                    mk[k] = {"wann": r["wann"] or "", "wer": r["wer"] or "", "n": r["n"]}
                else:
                    mk.pop(k, None)
        if mk:
            for x in pl:
                for st in x["staende"]:
                    if st.get("pdf"):
                        m_ = mk.get((st["pdf"].get("name"), int(st["pdf"].get("groesse") or 0)))
                        if m_:
                            st["pdf"]["markiert"] = m_
            for f in sonst:
                m_ = mk.get((f.get("name"), int(f.get("groesse") or 0)))
                if m_:
                    f["markiert"] = m_
    except Exception:   # Markierungen sind nur eine Anzeige – Planliste auch ohne
        pass
    try:   # für die To-do-Liste der Startseite („Pläne nicht versendet“): neuester PDF-Stand je Plan
        neu = []
        for x in pl:
            st = next((y for y in x["staende"] if y.get("pdf")), None)
            if st:
                mt = st["pdf"].get("mtime")
                dt = datetime.fromtimestamp(mt).isoformat(timespec="seconds") if isinstance(mt, (int, float)) else str(mt or "")
                neu.append({"pfad": st["pdf"]["pfad"], "name": " ".join(v for v in (x.get("nr") or x.get("key") or "", x.get("titel") or "") if v).strip() or st["pdf"]["name"],
                            "index": st.get("index") or "", "datum": dt, "gewerk": x.get("gewerk") or ""})
        with db.tx() as c:
            konto._put(c, f"plaene:stand:{pid}", json.dumps({"plaene": neu, "stand": d.get("stand") or ""}), g.user["name"])
    except Exception as e:
        fehler.still("plaene", "Stand der Pläne für die Startseite speichern", e)
        pass
    gewerke = sorted({*gw_plan, *cf["stichworte"].keys(), *cf["kennungen"].values(), *(x["gewerk"] for x in pl if x["gewerk"])} - {""},
                     key=lambda s: (s == "alle Firmen", s.lower()))
    # dazu die Gewerke der Baubeteiligten (Firmen des Projekts, Adressen) und eigene Zuordnungen
    with db.tx() as c:
        adr = {t.strip() for r in c.execute("SELECT trade FROM contacts WHERE trade<>''") for t in re.split(r"[,;/]", r["trade"] or "")}
    eig = {*(m.get("zuordnung") or {}).values()}
    bet = {g_ for f in fl for g_ in f.get("gewerke") or []}
    gewerke = sorted({g_ for g_ in set(gewerke) | {f["gewerk"] for f in sonst if f["gewerk"]} | bet | adr | eig if g_ and len(g_) <= 60},
                     key=lambda s_: (s_ == "alle Firmen", s_.lower()))
    return jsonify(plaene=pl, sonstige=sonst, basis=d.get("basis"), stand=d.get("stand") or "", zwischengespeichert=bool(d.get("zwischengespeichert")), baum=d.get("ordner") or [], aus=d.get("aus") or [], standard=d.get("standard"),
                   abgebrochen=d.get("abgebrochen"), gewerke=gewerke, firmen=fl, plotdienste=pd)


@app.get("/api/datei")
def datei():
    """Datei aus dem Projektordner ansehen (PDF im Browser) oder herunterladen."""
    pid = request.args.get("project_id", type=int)
    pfad = request.args.get("pfad") or ""
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
    try:
        data = _bt("/api/plaene/datei?" + urllib.parse.urlencode({"project_id": pid, "pfad": pfad}), raw=True)
    except ValueError as e:
        return jsonify(error=str(e)), 404
    name = pfad.rsplit("/", 1)[-1]
    mt = "application/pdf" if name.lower().endswith(".pdf") else "application/octet-stream"
    disp = "attachment" if request.args.get("dl") == "1" or mt != "application/pdf" else "inline"
    return Response(data, mimetype=mt, headers={"Content-Disposition": f"{disp}; filename*=UTF-8''{urllib.parse.quote(name)}"})


@app.get("/api/vorlage")
def vorlage():
    """Betreff und Text der Mail „Planversand“ – Platzhalter des Projekts schon ersetzt; {planliste}, {anzahl}, {firma} füllt der Versand."""
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        p = _sees(c, pid)
        if not p:
            return jsonify(error="Projekt nicht gefunden"), 404
        T = vorlagen.alle(c)["planversand"]
        cf = mail.conf(c)
        k = konto.prefs(c, g.user["id"])
    W = _werte(p, cf)
    keep = {"planliste": "{planliste}", "anzahl": "{anzahl}", "firma": "{firma}", "signatur": "{signatur}"}
    return jsonify(betreff=vorlagen.fuellen(T["betreff"], {**W, **keep}), text=vorlagen.fuellen(T["text"], {**W, **keep}), bauvorhaben=W["bauvorhaben"], projekt=W["projekt"],
                   versand=k.get("versand_plaene") or ("mich" if k.get("versand") == "mich" else "direkt"), kopie=k.get("kopie_plaene", True), email=g.user["email"] or "",
                   mail=mail.configured(cf))


def _werte(p, cf):
    adr = ", ".join(x for x in (p["street"], " ".join(y for y in (p["zip"], p["city"]) if y)) if x)
    return {"bauvorhaben": p["name"] + (", " + adr if adr else ""), "projekt": p["name"], "absender": C.full_name(g.user),
            "buero": cf.get("office_name") or "", "datum": datetime.now().strftime("%d.%m.%Y")}


def _planzeile(x):
    idx = f" Index {x['index']}" if x.get("index") else ""
    cad = f" (+ CAD: {', '.join(x['cad'])})" if x.get("cad") else ""
    return f"– {x.get('nr') or ''}{idx}  {x.get('titel') or ''}  [{x['name']}]{cad}".replace("  [", " – [").strip()


@app.post("/api/versand")
def versand():
    b = request.get_json(silent=True) or {}
    pid = b.get("project_id") if isinstance(b.get("project_id"), int) else None
    sel = [x for x in (b.get("plaene") or []) if isinstance(x, dict) and x.get("pfad")][:80]
    emp = [{"name": str(e.get("name") or "").strip()[:200], "email": str(e.get("email") or "").strip()[:200],
            **({"contact_id": e["contact_id"]} if isinstance(e.get("contact_id"), int) else {})}
           for e in (b.get("empfaenger") or []) if isinstance(e, dict)]
    emp = [e for e in emp if re.fullmatch(r"[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+", e["email"])]
    art = "mich" if b.get("versand") == "mich" else "direkt"
    if not sel:
        return jsonify(error="Bitte mindestens einen Plan wählen."), 400
    ich = (g.user["email"] or "").strip()
    if art == "direkt" and not emp:
        return jsonify(error="Bitte mindestens einen Empfänger mit gültiger E-Mail-Adresse wählen."), 400
    if art == "mich" and not ich:
        return jsonify(error="In deinem Konto ist keine E-Mail-Adresse eingetragen."), 400
    with db.tx() as c:
        p = _sees(c, pid) if pid else None
        if not p:
            return jsonify(error="Projekt nicht gefunden"), 404
        cf, mc = conf(c), mail.conf(c)
    if not mail.configured(mc):
        return jsonify(error="Der E-Mail-Versand ist nicht eingerichtet (Verwaltung → Einstellungen → Mailserver)."), 400
    # Dateien beim Bautagebuch holen
    anh, liste, total = [], [], 0
    try:
        for x in sel:
            pfade = [x["pfad"]] + ([str(y) for y in x.get("cad") or []] if b.get("cad") else [])
            for q in pfade:
                data = _bt("/api/plaene/datei?" + urllib.parse.urlencode({"project_id": pid, "pfad": q}), raw=True)
                total += len(data)
                if total > cf["max_mb"] * 1024 * 1024:
                    return jsonify(error=f"Die Anhänge sind größer als {cf['max_mb']} MB – bitte weniger Pläne auf einmal oder ohne CAD-Dateien senden. "
                                         "Der Versand als Download-Link folgt mit der eigenen Nextcloud."), 400
                n = q.rsplit("/", 1)[-1]
                anh.append((n, data, "application/pdf" if n.lower().endswith(".pdf") else "application/octet-stream"))
            liste.append({"name": x["pfad"].rsplit("/", 1)[-1], "pfad": x["pfad"], "nr": str(x.get("nr") or "")[:40], "index": str(x.get("index") or "")[:2],
                          "titel": str(x.get("titel") or "")[:200], "kennung": str(x.get("kennung") or "")[:30],
                          "cad": [y.rsplit("/", 1)[-1] for y in (x.get("cad") or [])] if b.get("cad") else []})
    except ValueError as e:
        return jsonify(error=str(e)), 502
    W = {"planliste": "\n".join(_planzeile(x) for x in liste), "anzahl": len(liste)}
    betreff = str(b.get("betreff") or "").strip()[:300] or "Pläne"
    text = str(b.get("text") or "").strip()[:20000] or "{planliste}"
    with db.tx() as c:
        von, absname = konto.absender(c, g.user, mc)   # Büro-Absender oder (je Benutzer) die eigene Adresse
    gesendet, fehler, nicht = [], [], []
    if art == "mich":
        an_namen = ", ".join(e["name"] or e["email"] for e in emp)
        try:
            with db.tx() as c:
                t_, h_ = konto.mail_teile(c, g.user, text, {**W, "firma": an_namen or "…"})
            mail.send(mc, ich, vorlagen.fuellen(betreff, {**W, "firma": an_namen}), t_, html=h_,
                      sender=absname, from_addr=von, attachments=anh)
            gesendet.append({"name": C.full_name(g.user), "email": ich})
        except mail.MailError as e:
            fehler.append(str(e))
    else:
        cc = [ich] if b.get("kopie") and ich else []
        for e in emp:
            try:
                with db.tx() as c:
                    t_, h_ = konto.mail_teile(c, g.user, text, {**W, "firma": e["name"]})
                mail.send(mc, e["email"], vorlagen.fuellen(betreff, {**W, "firma": e["name"]}), t_, html=h_,
                          sender=absname, from_addr=von, attachments=anh, cc=[x for x in cc if x.lower() != e["email"].lower()], reply_to=ich or None)
                gesendet.append(e)
            except mail.MailError as er:
                fehler.append(f"{e['name'] or e['email']}: {er}")
                nicht.append((e, er))
    # Benachrichtigungsverlauf der Kontakte – auch für Adressen ohne Kontakt (erscheinen, sobald der Kontakt angelegt ist)
    inhalt = "\n".join(_planzeile(x) for x in liste)
    bt = vorlagen.fuellen(betreff, {**W, "firma": ""})[:300]
    with db.tx() as c:
        if art == "mich":
            if gesendet:
                benachrichtigung.protokoll(c, "planversand", emp, project_id=pid, projekt=p["name"], betreff=bt, inhalt=inhalt,
                                           von=C.full_name(g.user), weg="weiterleiten", link="plaene:#liste")
        else:
            benachrichtigung.protokoll(c, "planversand", gesendet, project_id=pid, projekt=p["name"], betreff=bt, inhalt=inhalt,
                                       von=C.full_name(g.user), link="plaene:#liste")
            for e, er in nicht:
                benachrichtigung.protokoll(c, "planversand", [e], project_id=pid, projekt=p["name"], betreff=bt, inhalt=inhalt,
                                           von=C.full_name(g.user), status="fehler", fehler=str(er), link="plaene:#liste")
        neu = benachrichtigung.unbekannt(c, [e["email"] for e in emp])
    if gesendet:
        with db.tx() as c:
            c.execute("INSERT INTO planversand(project_id, datum, absender, art, empfaenger, plaene, betreff) VALUES(?,?,?,?,?,?,?)",
                      (pid, _now(), C.full_name(g.user), art, json.dumps(emp if art == "mich" else gesendet, ensure_ascii=False),
                       json.dumps(liste, ensure_ascii=False), vorlagen.fuellen(betreff, {**W, "firma": ""})[:300]))
        C.audit(g.user["name"], "mail", "Planversand", f"{p['name']} · {len(liste)} Pläne · " + ", ".join(e["email"] for e in gesendet))
    if fehler and not gesendet:
        return jsonify(error="; ".join(fehler), neu=neu), 502
    return jsonify(ok=True, an=gesendet, fehler=fehler, mb=round(total / 1048576, 1), neu=neu)


# ---------------------------------------------------------------- Planversandliste
def _liste(c, pid):
    out = []
    for r in c.execute("SELECT * FROM planversand WHERE project_id=? ORDER BY id DESC", (pid,)):
        out.append({"id": r["id"], "datum": r["datum"], "absender": r["absender"], "art": r["art"], "betreff": r["betreff"],
                    "empfaenger": _j(r["empfaenger"], []), "plaene": _j(r["plaene"], [])})
    return out


@app.get("/api/versandliste")
def versandliste():
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        return jsonify(_liste(c, pid))


@app.get("/api/versandliste.pdf")
def versandliste_pdf():
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    from xml.sax.saxutils import escape as X
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        p = _sees(c, pid)
        if not p:
            return jsonify(error="Projekt nicht gefunden"), 404
        rows = _liste(c, pid)
        office = mail.conf(c).get("office_name") or ""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=15 * mm, rightMargin=15 * mm, topMargin=15 * mm, bottomMargin=15 * mm,
                            title=f"Planversandliste {p['name']}")
    st = ParagraphStyle("t", fontName="Helvetica", fontSize=8.5, leading=10.5)
    h1 = ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=15, leading=19)
    sub = ParagraphStyle("s", fontName="Helvetica", fontSize=9, leading=12, textColor=colors.HexColor("#555555"))
    el = [Paragraph("Planversandliste", h1), Paragraph(X(f"{p['name']} · Stand {datetime.now().strftime('%d.%m.%Y')}" + (f" · {office}" if office else "")), sub), Spacer(1, 6 * mm)]
    data = [[Paragraph(f"<b>{t}</b>", st) for t in ("Datum", "Empfänger", "Plan-Nr.", "Index", "Titel", "Datei", "CAD", "Versand")]]
    for r in rows:
        an = "<br/>".join(X(e.get("name") or e.get("email") or "") + (f" <font color='#777777'>({X(e['email'])})</font>" if e.get("name") and e.get("email") else "") for e in r["empfaenger"])
        how = ("an " + X(r["absender"]) + " zum Weiterleiten") if r["art"] == "mich" else ("E-Mail von " + X(r["absender"]))
        for n, x in enumerate(r["plaene"]):
            data.append([Paragraph(_de(r["datum"]) if n == 0 else "", st), Paragraph(an if n == 0 else "", st),
                         Paragraph(X(((x.get("kennung") or "") + " " + (x.get("nr") or "")).strip()), st), Paragraph(X(x.get("index") or "–"), st),
                         Paragraph(X(x.get("titel") or ""), st), Paragraph(X(x.get("name") or ""), st), Paragraph(X(", ".join(x.get("cad") or [])), st),
                         Paragraph(how if n == 0 else "", st)])
    if len(data) == 1:
        data.append([Paragraph("Noch keine Pläne versendet.", st)] + [""] * 7)
    t = Table(data, colWidths=[20 * mm, 46 * mm, 24 * mm, 14 * mm, 53 * mm, 60 * mm, 30 * mm, 20 * mm], repeatRows=1)
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, 0), 0.8, colors.black),
                           ("LINEBELOW", (0, 1), (-1, -1), 0.25, colors.HexColor("#cccccc")), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eeeeee"))]))
    el.append(t)

    def fuss(cv, d):
        cv.setFont("Helvetica", 7.5); cv.setFillColor(colors.HexColor("#777777"))
        cv.drawRightString(d.pagesize[0] - 15 * mm, 8 * mm, f"Seite {d.page}")
        cv.drawString(15 * mm, 8 * mm, f"Planversandliste {p['name']}")
    doc.build(el, onFirstPage=fuss, onLaterPages=fuss)
    fn = f"Planversandliste {p['name']}.pdf"
    return Response(buf.getvalue(), mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{urllib.parse.quote(fn)}"})


C.wait_schema()
