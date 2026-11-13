"""Baudaten: alle Positions- und Preisdaten der Bauplattform an einer Stelle.

- Positionsdatenbank der Bauplattform (Katalog 'gk3', Migration 0024: eigene Texte, eigene Kalkulation, Preisstand 11/2026)
- importierte Kataloge, z. B. Sirados-Daten als GAEB-Datei (X81–X86) oder aus einem LV der Ausschreibung (Katalog je Import)
- eigene Positionen des Büros (Katalog 'eigen') und eigene Vergabepreise je Position (pdb_preis)

Suchen, blättern nach Leistungsbereich/Gruppe, Preise auf den aktuellen Baupreisindex und einen Regionalfaktor umrechnen,
Positionen in eigene übernehmen und bearbeiten, Export als CSV. Ausschreibung/Vergabe und Baukosten fügen Positionen
über bpcore/baudaten.py direkt aus derselben Datenbank ein.
Importierte Daten kommerzieller Anbieter bleiben im Büro: Sie liegen nur in der Datenbank, nicht im Programmcode.
"""
import csv, io, json, os, re
from datetime import date

from flask import Response, g, jsonify, redirect, request

from bpcore import baudaten as B, db, gaeb, platform, sso
import common as C

app = C.make_app(__name__)
KEY = "baudaten"
EINHEIT_GAEB = {"m2": "m²", "qm": "m²", "m3": "m³", "cbm": "m³", "lfm": "m", "lfdm": "m", "lm": "m", "stk": "St", "st.": "St", "stck": "St", "stück": "St",
                "pausch": "psch", "psch.": "psch", "pauschal": "psch", "pa": "psch", "std": "h", "std.": "h", "wo": "Wo", "to": "t"}
EINHEITEN = ("m²", "m³", "m", "St", "kg", "t", "psch", "h", "Wo", "StWo", "mWo", "m²Wo", "m³Wo", "Tag", "Mon", "l", "kW", "kWp")


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
        msg = "Für „Baudaten“ ist dein Konto nicht freigeschaltet."
        return C.gesperrt(KEY, msg)   # im Büro abgeschaltet oder für das Konto nicht freigeschaltet
    g.user = u


B.register_korb(app)   # Korb: Positionen sammeln, in Ausschreibung / Baukosten übernehmen


def _admin():
    return bool(g.user["is_admin"])


def _s(x, n=500):
    return " ".join(str(x or "").split())[:n] if n < 2000 else str(x or "").strip()[:n]


def _fn(x):
    try:
        v = float(str(x).replace(",", "."))
        return v if v == v else None
    except (TypeError, ValueError):
        return None


@app.get("/")
def index():
    return C.page("baudaten.html")


@app.get("/api/me")
def me():
    return jsonify(ok=True, **C.public(g.user))


@app.get("/api/platform")
def platform_conf():
    return jsonify(platform.config(g.user))


@app.route("/ava/api/<path:p>", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
def ava_proxy(p):
    """AVA-API durchreichen (Kataloge in den Einstellungen), wenn die Baudaten direkt über ihren Port laufen."""
    return C.weiterleiten(os.environ.get("AVA_INTERNAL", "http://ava:8097"), "api/" + p)


@app.get("/api/start")
def start():
    """Kataloge mit Anzahl, Einstellungen (Index, Faktor) und Leistungsbereiche des gewählten Katalogs."""
    kat = request.args.get("katalog") or "gk3"
    with db.tx() as c:
        kats = [x.dict() for x in c.execute("""SELECT k.key, k.name, k.art, k.lizenz, k.preisstand,
                   COALESCE((SELECT m.value::real FROM pdb_meta m WHERE m.key = 'index:' || k.key), k.index_basis) AS index_basis,
                   (SELECT COUNT(*) FROM pdb_alle p WHERE p.katalog=k.key AND p.aktiv=1) AS n FROM pdb_kataloge k ORDER BY k.sort, k.name""").fetchall()]
        for k in kats:   # Indexbasis, die tatsächlich verwendet wird (eigene Angabe oder aus dem Preisstand)
            k["index_auto"] = k["index_basis"] is None and k["key"] != "gk3" and B.index_fuer(k["preisstand"]) is not None
            if k["index_basis"] is None and k["key"] != "gk3":
                k["index_basis"] = B.index_fuer(k["preisstand"])
        return jsonify(kataloge=kats, einstellungen=B.einstellungen(c), lbs=B.leistungsbereiche(c, kat), admin=_admin(),
                       einheiten=EINHEITEN, loehne=[x.dict() for x in c.execute("SELECT gewerk, name, verrechnungslohn, stand FROM pdb_lohn ORDER BY name").fetchall()])


@app.get("/api/allplan-katalog.zip")
def allplan_katalog():
    """Bauteil-Elemente als Allplan-Katalog (Textformat wie der Elementkatalog NEM_ELE), optional ?kg=330."""
    with db.tx() as c:
        z, n = B.allplan_katalog(c, (request.args.get("kg") or "").strip()[:3])
    return Response(z, mimetype="application/zip", headers={"Content-Disposition": 'attachment; filename="allplan-bauteilkatalog.zip"'})


@app.get("/api/allplan/ziel")
def allplan_ziel():
    """Wo liegt der Allplan-Bürostandard? (über das Bautagebuch, das die Freigabe kennt)"""
    if not _admin():
        return jsonify(error="Nur für die Verwaltung."), 403
    try:
        return jsonify(C.bt_api("GET", "/api/allplan/ziel"))
    except RuntimeError as e:
        return jsonify(ok=False, error=str(e))


@app.post("/api/allplan/uebertragen")
def allplan_uebertragen():
    """Kundenkataloge kukat1–5 neu erzeugen und in den Allplan-Bürostandard schreiben (vorher .bak/.bak2 sichern)."""
    import base64
    import zipfile
    if not _admin():
        return jsonify(error="Nur für die Verwaltung."), 403
    with db.tx() as c:
        z, n = B.allplan_katalog(c)
    with zipfile.ZipFile(io.BytesIO(z)) as zf:
        dateien = {x: base64.b64encode(zf.read(x)).decode() for x in zf.namelist() if x.startswith("kukat")}
    try:
        r = C.bt_api("POST", "/api/allplan/uebertragen", {"dateien": dateien})
    except RuntimeError as e:
        return jsonify(error=str(e)), 502
    C.audit(C.full_name(g.user), "baudaten", "Allplan-Kataloge übertragen", f"{n} Einträge")
    return jsonify({**(r or {}), "eintraege": n})


@app.get("/api/vorbemerkungen")
def vorbemerkungen():
    """Kompakte Vorbemerkungen: ohne key die Liste, mit key (LB-Nummer, 'bb', 'bvb', 'zvb') der Text."""
    k = request.args.get("key")
    with db.tx() as c:
        d = B.vorbemerkungen(c, k) if k else B.vorbemerkungen(c)
    return jsonify(d) if d is not None else (jsonify(error="Zu diesem Leistungsbereich gibt es noch keine Vorbemerkungen."), 404)


@app.get("/api/gruppen")
def gruppen():
    with db.tx() as c:
        return jsonify(B.gruppen(c, request.args.get("lb") or "", request.args.get("katalog") or "gk3"))


@app.get("/api/suche")
def suche():
    a = request.args.to_dict()
    n = min(500, int(_fn(a.get("n")) or 100))
    off = max(0, int(_fn(a.get("offset")) or 0))
    with db.tx() as c:
        rows, gesamt = B.suche(c, a, n, off)
    return jsonify(positionen=rows, gesamt=gesamt)


@app.get("/api/position/<int(signed=True):i>")
def position(i):
    with db.tx() as c:
        d = B.position(c, i)
    return jsonify(d) if d else (jsonify(error="Position nicht gefunden"), 404)


def _darf(r):
    """Nur eigene Positionen lassen sich ändern oder löschen. Katalog- und Importpositionen sind schreibgeschützt –
    auch für den Administrator; für Änderungen „Als eigene Position“ übernehmen. Ausblenden und Favorit gehen überall."""
    return r["katalog"] == "eigen"


@app.route("/api/position/<int(signed=True):i>", methods=["PUT", "DELETE"])
def position_aendern(i):
    if i < 0:
        return jsonify(error="Kataloge der Ausschreibung (z. B. sirAdos) werden dort gepflegt – für Änderungen als eigene Position übernehmen."), 400
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = c.execute("SELECT * FROM pdb_position WHERE id=?", (i,)).fetchone()
        if not r:
            return jsonify(error="Position nicht gefunden"), 404
        if request.method == "DELETE":
            if not _darf(r):
                return jsonify(error="Katalogpositionen sind schreibgeschützt – sie lassen sich nur ausblenden."), 403
            c.execute("DELETE FROM pdb_position WHERE id=?", (i,))
            if r["katalog"] == "eigen":   # Bestandteile einer eigenen Element-Kopie
                c.execute("DELETE FROM pdb_element_teil WHERE element_code=?", (r["code"],))
            C.audit(C.full_name(g.user), "baudaten", "Position gelöscht", f"{r['katalog']} {r['code']} {r['kurz']}")
            return jsonify(ok=True)
        sets, args = [], []
        for k in ("aktiv", "favorit"):
            if k in b:
                sets.append(f"{k}=?"); args.append(1 if b[k] else 0)
        if not _darf(r) and any(k in b for k in ("kurz", "lang", "hinweis", "tags", "titel", "einheit", "kg", "ep_von", "ep_mittel", "ep_bis", "genauigkeit")):
            return jsonify(error="Katalogpositionen sind schreibgeschützt – für Änderungen „Als eigene Position“ übernehmen."), 403
        if _darf(r):
            for k, n in (("kurz", 300), ("bez", 300), ("lang", 20000), ("hinweis", 4000), ("tags", 300), ("titel", 300)):
                if k in b:
                    sets.append(f"{k}=?"); args.append(_s(b[k], n))
            if b.get("einheit") in EINHEITEN:
                sets.append("einheit=?"); args.append(b["einheit"])
            if "kg" in b:
                sets.append("kg=?"); args.append(re.sub(r"\D", "", str(b["kg"]))[:3])
            f = B.umrechnung(c, r["katalog"]) or 1.0   # eingegeben wird der heutige Preis (wie angezeigt)
            for k in ("ep_von", "ep_mittel", "ep_bis"):
                if k in b:
                    v = _fn(b[k])
                    sets.append(f"{k}=?"); args.append(round(v / f, 4) if v is not None else None)
            if b.get("genauigkeit") in ("A", "B", "C"):
                sets.append("genauigkeit=?"); args.append(b["genauigkeit"])
        if sets:
            c.execute(f"UPDATE pdb_position SET {', '.join(sets)}, updated=?, updated_by=? WHERE id=?", (*args, db.now_iso(), C.full_name(g.user), i))
        return jsonify(B.position(c, i))


def _neuer_code(c):
    n = c.execute("SELECT COUNT(*) AS n FROM pdb_position WHERE katalog='eigen'").fetchone()["n"]
    while True:
        n += 1
        code = f"E.{n:05d}"
        if not c.execute("SELECT 1 FROM pdb_position WHERE katalog='eigen' AND code=?", (code,)).fetchone():
            return code


@app.post("/api/position")
def position_neu():
    """Neue eigene Position – leer oder als Kopie einer Katalogposition (von=<id>), Preise dann umgerechnet auf heute."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        src = B.position(c, int(b["von"])) if isinstance(b.get("von"), int) else None
        now = db.now_iso()
        E = B.einstellungen(c)
        c.execute("UPDATE pdb_katalog SET index_basis=COALESCE(index_basis, ?), preisstand=COALESCE(NULLIF(preisstand, ''), ?) WHERE key='eigen'",
                  (E["index_aktuell"], date.today().strftime("%Y-%m")))
        f_e = B.umrechnung(c, "eigen", E) or 1.0   # gespeichert wird zum Preisstand des Katalogs „eigen“
        d = {"lb_nr": "", "gruppe": "", "titel": "", "kurz": "Neue Position", "bez": "", "lang": "", "einheit": "St", "kg": "", "gewerk": "",
             "ep_von": None, "ep_mittel": None, "ep_bis": None, "genauigkeit": "B", "tags": "", "hinweis": ""}
        if src:
            d.update({k: src.get(k) or "" for k in ("lb_nr", "gruppe", "kurz", "bez", "einheit", "kg", "gewerk", "genauigkeit", "tags", "hinweis")})
            d["titel"] = src.get("titel") or " › ".join(x for x in (src.get("lb_name") or "", src.get("gruppe_name") or "") if x)
            d["lang"] = src["lang_voll"]
            for k in ("ep_von", "ep_mittel", "ep_bis"):
                d[k] = round(src[k + "_akt"] / f_e, 2) if src.get(k + "_akt") is not None else None
        for k in d:
            if k in b and k != "von":
                d[k] = b[k]
        for k in ("ep_von", "ep_mittel", "ep_bis"):   # mitgeschickte Preise sind heutige Preise (wie beim Ändern) → auf den Preisstand umrechnen
            if k in b:
                v = _fn(b[k])
                d[k] = round(v / f_e, 4) if v is not None else None
        code = _neuer_code(c)
        i = c.execute("""INSERT INTO pdb_position(katalog, code, lb_nr, gruppe, titel, kurz, bez, lang, einheit, kg, gewerk, ep_von, ep_mittel, ep_bis,
                         genauigkeit, tags, hinweis, quelle, preisstand, created, updated, updated_by)
                         VALUES('eigen',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'eigen',?,?,?,?) RETURNING id""",
                      (code, d["lb_nr"], d["gruppe"], _s(d["titel"], 300), _s(d["kurz"], 300), _s(d["bez"], 300), _s(d["lang"], 20000), d["einheit"], d["kg"], d["gewerk"],
                       _fn(d["ep_von"]), _fn(d["ep_mittel"]), _fn(d["ep_bis"]), d["genauigkeit"], d["tags"], _s(d["hinweis"], 4000),
                       date.today().strftime("%Y-%m"), now, now, C.full_name(g.user))).fetchone()["id"]
        if src and src.get("teile"):   # Kopie eines Standardelements: die Bestandteile gehören dazu
            for n, t in enumerate(src["teile"]):
                c.execute("INSERT INTO pdb_element_teil(element_code, nr, position_code, faktor) VALUES(?,?,?,?)", (code, n, t["code"], t["faktor"]))
        return jsonify(B.position(c, i))


# Eigene Preise je Position (Erfahrungspreise aus Vergaben) – Endpunkte in bpcore.baudaten.register_preise (auch Ausschreibung, Baukosten)
B.register_preise(app)


# ---------------------------------------------------------------- Einstellungen (Index, Faktoren, Löhne)
@app.put("/api/einstellungen")
def einstellungen():
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        if "faktor_id" in b and isinstance(b["faktor_id"], int):   # Auswahl gilt für alle (Büro-Einstellung)
            c.execute("INSERT INTO pdb_meta(key, value) VALUES('faktor_id', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (str(b["faktor_id"]),))
        if not _admin() and any(k in b for k in ("index_aktuell", "faktoren", "loehne")):
            return jsonify(error="Index, Faktoren und Löhne stellt der Administrator ein."), 403
        if "index_aktuell" in b:
            v = _fn(b["index_aktuell"])
            if not v or v < 50 or v > 500:
                return jsonify(error="Index unplausibel (2021 = 100)."), 400
            c.execute("INSERT INTO pdb_meta(key, value) VALUES('index_aktuell', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (str(v),))
        if isinstance(b.get("faktoren"), list):
            keep = []
            for x in b["faktoren"][:100]:
                f, name = _fn(x.get("faktor")), _s(x.get("name"), 80)
                if not name or not f or f <= 0.3 or f > 3:
                    continue
                if isinstance(x.get("id"), int):
                    c.execute("UPDATE pdb_faktor SET name=?, faktor=?, notiz=? WHERE id=?", (name, f, _s(x.get("notiz"), 200), x["id"]))
                    keep.append(x["id"])
                else:
                    keep.append(c.execute("INSERT INTO pdb_faktor(name, faktor, notiz) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET faktor=excluded.faktor RETURNING id",
                                          (name, f, _s(x.get("notiz"), 200))).fetchone()["id"])
            if keep:
                c.execute("DELETE FROM pdb_faktor WHERE id <> ALL(?)", (keep,))
        if isinstance(b.get("loehne"), dict):
            for k, v in b["loehne"].items():
                f = _fn(v)
                if f and 15 <= f <= 250:
                    c.execute("UPDATE pdb_lohn SET verrechnungslohn=?, stand=? WHERE gewerk=?", (f, date.today().strftime("%Y-%m"), k))
            # Katalogpreise der gk3-Datenbank mit den neuen Löhnen neu rechnen (Zeitansatz bleibt, Stoff/Gerät bleiben)
            m = B.meta(c)
            z = _fn(m.get("stoffzuschlag")) or 0.12
            gen = json.loads(m.get("genauigkeit") or "{}")
            for kl, (fv, fb, _) in gen.items():
                c.execute("""UPDATE pdb_position p SET ep_mittel = round((p.h * l.verrechnungslohn + (p.stoff + p.geraet) * (1 + ?))::numeric, 2),
                               ep_von = round(((p.h * l.verrechnungslohn + (p.stoff + p.geraet) * (1 + ?)) * ?)::numeric, 2),
                               ep_bis = round(((p.h * l.verrechnungslohn + (p.stoff + p.geraet) * (1 + ?)) * ?)::numeric, 2)
                             FROM pdb_lohn l WHERE l.gewerk = p.gewerk AND p.quelle = 'katalog' AND p.genauigkeit = ?""", (z, z, fv, z, fb, kl))
        C.audit(C.full_name(g.user), "baudaten", "Einstellungen geändert", ", ".join(k for k in b))
        return jsonify(B.einstellungen(c))


# ---------------------------------------------------------------- Import (z. B. Sirados als GAEB) und Export
def _katalog_key(name):
    k = re.sub(r"[^a-z0-9]+", "-", name.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")).strip("-")[:30]
    return k or "import"


def _importieren(c, key, name, items, lizenz="", preisstand="", index_basis=None, ersetzen=True):
    """Items im LV-Format (Titel und Positionen, wie bpcore/gaeb.lesen) als Katalog speichern."""
    now = db.now_iso()
    c.execute("""INSERT INTO pdb_katalog(key, name, art, lizenz, preisstand, index_basis, sort, created, updated, updated_by)
                 VALUES(?,?,'import',?,?,?,10,?,?,?) ON CONFLICT(key) DO UPDATE SET name=excluded.name, lizenz=excluded.lizenz,
                 preisstand=excluded.preisstand, index_basis=excluded.index_basis, updated=excluded.updated, updated_by=excluded.updated_by""",
              (key, name, lizenz, preisstand, index_basis, now, now, C.full_name(g.user)))
    if ersetzen:
        c.execute("DELETE FROM pdb_position WHERE katalog=?", (key,))
    titel, n, codes = {}, 0, set()
    rows = []
    for x in items:
        if x.get("typ") == "titel":
            lvl = int(x.get("lvl") or 1)
            titel = {k: v for k, v in titel.items() if k < lvl}
            titel[lvl] = (x.get("oz") or "", x.get("kurz") or "")
            continue
        if x.get("typ") != "pos" or x.get("art") == "T":
            continue
        oz = (x.get("oz") or "").strip()
        lb = titel.get(1, ("", ""))[0]
        gr = " ".join(titel[k][0] for k in sorted(titel) if k >= 1)[:60]
        code = oz or f"{len(rows) + 1:06d}"
        while code in codes:
            code += "'"
        codes.add(code)
        pfad = " › ".join(f"{titel[k][0]} {titel[k][1]}".strip() for k in sorted(titel))
        ep = _fn(x.get("ep"))
        rows.append((key, code, lb, gr, pfad[:300], _s(x.get("kurz"), 300), str(x.get("lang") or "")[:20000], EINHEIT_GAEB.get(_s(x.get("einheit"), 20).lower(), _s(x.get("einheit"), 20)),
                     re.sub(r"\D", "", str(x.get("kg") or ""))[:3], ep, "C" if ep else "B", "import", preisstand, now, now, C.full_name(g.user)))
    for k in range(0, len(rows), 500):
        part = rows[k:k + 500]
        c.execute("INSERT INTO pdb_position(katalog, code, lb_nr, gruppe, titel, kurz, lang, einheit, kg, ep_mittel, genauigkeit, quelle, preisstand, created, updated, updated_by) VALUES "
                  + ",".join(["(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"] * len(part)) + " ON CONFLICT(katalog, code) DO NOTHING", [v for r in part for v in r])
        n += len(part)
    return n


@app.post("/api/import")
def importieren():
    """GAEB-Datei (X81–X86, z. B. Sirados-Export) oder ein vorhandenes LV der Ausschreibung (lv_id) als Katalog einlesen. Nur Administrator."""
    if not _admin():
        return jsonify(error="Kataloge importiert der Administrator."), 403
    f = request.files.get("datei")
    b = request.form if f else (request.get_json(silent=True) or {})
    name = _s(b.get("name"), 80) or (f.filename.rsplit(".", 1)[0] if f else "") or "Import"
    key = _katalog_key(_s(b.get("key"), 30) or name)
    if key in ("gk3", "eigen") or re.fullmatch(r"ava\d+", key):
        return jsonify(error="Dieser Name ist reserviert."), 400
    idx = _fn(b.get("index_basis"))
    with db.tx() as c:
        if f:
            data = f.read()
            if len(data) > 200 * 1024 * 1024:
                return jsonify(error="Datei zu groß (über 200 MB)."), 400
            try:
                g_ = gaeb.lesen(data)
            except Exception as e:
                return jsonify(error=f"GAEB-Datei nicht lesbar: {e}"), 400
            items = g_.get("items") or []
        else:
            lv = int(_fn(b.get("lv_id")) or 0)
            r = c.execute("SELECT data FROM ava_lv WHERE id=?", (lv,)).fetchone()
            if not r:
                return jsonify(error="LV nicht gefunden"), 404
            items = (json.loads(r["data"] or "{}") or {}).get("items") or []
            items = [{**x, "ep": x.get("ep_s")} for x in items]
        n = _importieren(c, key, name, items, _s(b.get("lizenz"), 300), _s(b.get("preisstand"), 7), idx, ersetzen=str(b.get("ersetzen", "1")) not in ("0", "false"))
        C.audit(C.full_name(g.user), "baudaten", "Katalog importiert", f"{name}: {n} Positionen")
        return jsonify(ok=True, key=key, n=n, hinweis=f"{n} Positionen in „{name}“ eingelesen.")


@app.get("/api/lvs")
def lvs():
    """LVs der Ausschreibung zur Übernahme als Katalog (Administrator)."""
    if not _admin():
        return jsonify([])
    with db.tx() as c:
        rows = c.execute("""SELECT l.id, l.nr, l.name, l.gewerk, p.name AS projekt FROM ava_lv l LEFT JOIN projects p ON p.id = l.project_id
                            WHERE l.archived = 0 ORDER BY l.updated DESC LIMIT 500""").fetchall()
    return jsonify([x.dict() for x in rows])


@app.route("/api/katalog/<key>", methods=["PUT", "DELETE"])
def katalog(key):
    if not _admin():
        return jsonify(error="Nur Administrator"), 403
    with db.tx() as c:
        b = request.get_json(silent=True) or {}
        if re.fullmatch(r"ava\d+", key) and request.method == "PUT":   # Kataloge der Ausschreibung: nur die Indexbasis (Fortschreibung)
            v = _fn(b.get("index_basis"))
            if v is None:
                c.execute("DELETE FROM pdb_meta WHERE key=?", ("index:" + key,))
            elif 50 <= v <= 500:
                c.execute("INSERT INTO pdb_meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", ("index:" + key, str(v)))
            else:
                return jsonify(error="Index unplausibel (2021 = 100)."), 400
            return jsonify(ok=True)
        r = c.execute("SELECT * FROM pdb_katalog WHERE key=?", (key,)).fetchone()
        if not r:
            return jsonify(error="Katalog nicht gefunden"), 404
        if request.method == "DELETE":
            if r["art"] != "import":
                return jsonify(error="Nur importierte Kataloge können gelöscht werden."), 400
            c.execute("DELETE FROM pdb_katalog WHERE key=?", (key,))
            C.audit(C.full_name(g.user), "baudaten", "Katalog gelöscht", r["name"])
            return jsonify(ok=True)
        c.execute("UPDATE pdb_katalog SET name=?, lizenz=?, preisstand=?, index_basis=?, updated=?, updated_by=? WHERE key=?",
                  (_s(b.get("name"), 80) or r["name"], _s(b.get("lizenz", r["lizenz"]), 300), _s(b.get("preisstand", r["preisstand"]), 7),
                   _fn(b.get("index_basis")) if "index_basis" in b else r["index_basis"], db.now_iso(), C.full_name(g.user), key))
        return jsonify(ok=True)


@app.get("/api/export.csv")
def export():
    """Gefilterte Positionen für Excel (Semikolon, UTF-8 mit BOM), Preise auf heute umgerechnet."""
    a = request.args.to_dict()
    with db.tx() as c:
        rows, _ = B.suche(c, a, 60000, 0)
        lang = {r["id"]: r["lang_voll"] for r in c.execute("SELECT id, lang_voll FROM pdb_position_ansicht WHERE id = ANY(?)", ([x["id"] for x in rows],)).fetchall()} if rows else {}
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["Katalog", "Code", "LB", "Gruppe", "Kurztext", "Bezeichnung", "Langtext", "Einheit", "KG DIN 276", "EP von", "EP mittel", "EP bis", "Genauigkeit", "Preisstand"])
    de = lambda v: "" if v is None else str(v).replace(".", ",")
    for x in rows:
        w.writerow([x["katalog"], x["code"], x["lb_nr"], x["gruppe_name"] or x["titel"], x["kurz"], x["bez"] or x["kurz"], (lang.get(x["id"]) or "").replace("\r", ""), x["einheit"], x["kg"],
                    de(x["ep_von_akt"]), de(x["ep_mittel_akt"]), de(x["ep_bis_akt"]), x["genauigkeit"], x["preisstand"]])
    return Response("﻿" + buf.getvalue(), mimetype="text/csv; charset=utf-8", headers={"Content-Disposition": "attachment; filename=Baudaten.csv"})


import baudaten_ki   # noqa: E402,F401 – Verwaltung → Kataloge erzeugen (mit KI ergänzen)
