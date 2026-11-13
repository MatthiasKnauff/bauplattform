"""Baudaten – Kataloge mit KI ergänzen (Verwaltung → Kataloge erzeugen). Block „Kataloge erzeugen“ (Verwaltung je Rolle); den eigenen Schlüssel setzt nur der Administrator.

Claude schlägt vor, übernommen wird nur, was die Verwaltung in der Prüfliste anhakt:
  Vorbemerkungen je Leistungsbereich (neu oder überarbeitet) und fehlende Positionen eines Leistungsbereichs (als eigene Positionen).
Eigene Formulierungen – keine Sätze aus lizenzierten Katalogen (sirAdos, STLB-Bau u. a.); als Anhalt gehen nur Titel und Kurztexte
des eigenen Katalogs „Bauplattform“ (gk3) mit. Ist unter KI kein Claude eingerichtet, gilt ein Schlüssel nur für diesen Zweck
(gantt_store „plattform“ → ki_kataloge); er wird nie an den Browser zurückgegeben.

GET  /api/kataloge/stand              Umfang der Kataloge, Leistungsbereiche (mit/ohne Vorbemerkung), Claude-Zugang
PUT  /api/kataloge/schluessel         {key, model?} – testen und speichern; {key: ""} entfernt
POST /api/kataloge/vorschlag          {art: "vorbem"|"positionen", lb, stichwort?} → Vorschläge
POST /api/kataloge/vorlage-vorschlag  {kg, stichwort} → Bauteil-Vorlage mit Schichten (nur vorhandene Positionen) und Vorschau der Elemente
PUT  /api/kataloge/vorlage            Vorlage übernehmen → Baukasten + Standardelemente; DELETE /api/kataloge/vorlage/<id> nimmt sie zurück
PUT  /api/kataloge/vorbemerkung/<lb>  {titel, text} – übernehmen; Antwort mit „vorher“ (Rückgängig: dasselbe mit vorher)
Positionen übernimmt der Browser über POST /api/position (eigene Positionen, wie „Neue Position“).
"""
import json
from datetime import datetime

from flask import g, jsonify, request

from bpcore import ai, db
from baudaten import _admin, _kat, _s, app

MODELLE = {"claude-sonnet-5-5": "Claude Sonnet 5.5", "claude-opus-5-5": "Claude Opus 5.5 – am gründlichsten", "claude-haiku-5-5": "Claude Haiku 5.5 – günstig"}
REGEL = ("Du arbeitest für ein Architekturbüro in Deutschland an seinem eigenen Baudatenkatalog. Schreibe eigene, knappe, fachlich korrekte Texte "
         "nach VOB/C und den anerkannten Regeln der Technik. Übernimm keine Formulierungen aus lizenzierten Katalogen (sirAdos, STLB-Bau, heinze o. Ä.) "
         "und keine Normtexte wörtlich. Keine Produkt- oder Herstellernamen. Antworte nur mit JSON.")


def _zugang(c):
    k = ai.claude_conf(c, "kataloge")
    return {"da": bool(k["key"]), "quelle": ("kataloge" if k.get("nur_kataloge") else "buero") if k["key"] else "", "modell": k["model"],
            "modelle": MODELLE, "abgeschaltet": "claude" in ai.abgeschaltet(c)}


@app.get("/api/kataloge/stand")
def kat_stand():
    if not _kat("sehen"):
        return jsonify(error="Nur für die Verwaltung."), 403
    with db.tx() as c:
        n = {r["katalog"]: r["n"] for r in c.execute("SELECT katalog, count(*) AS n FROM pdb_position GROUP BY katalog").fetchall()}
        try:
            nv = c.execute("SELECT count(*) AS n FROM pdb_vorlage").fetchone()["n"]
        except Exception:   # noqa: BLE001 – Baukasten noch nicht eingespielt
            nv = 0
        vb = {r["key"]: r["titel"] for r in c.execute("SELECT key, titel FROM pdb_vorbemerkung").fetchall()}
        lbs = [{"nr": r["nr"], "name": r["name"], "vorbem": r["nr"] in vb} for r in c.execute("SELECT nr, name FROM pdb_leistungsbereich ORDER BY nr").fetchall()]
        from bpcore import din276
        try:
            kgv = {r["kg"]: r["n"] for r in c.execute("SELECT kg, count(*) AS n FROM pdb_vorlage GROUP BY kg").fetchall()}
        except Exception:   # noqa: BLE001
            kgv = {}
        kgs = [{"kg": k, "name": din276.NAMEN[k], "n": kgv.get(k, 0)} for k in sorted(din276.NAMEN) if len(k) == 3 and k[2] != "0" and k[:1] in "345" and (kgv.get(k) or k[:2] in {x[:2] for x in kgv})]
        return jsonify(positionen=n.get("gk3", 0), eigene=n.get("eigen", 0), elemente=n.get("gk3e", 0), vorlagen=nv, vorbemerkungen=len(vb),
                       lbs=lbs, kgs=kgs, claude=_zugang(c))


@app.put("/api/kataloge/schluessel")
def kat_schluessel():
    if not _admin():
        return jsonify(error="Nur für die Verwaltung."), 403
    b = request.get_json(silent=True) or {}
    key, model = str(b.get("key") or "").strip(), b.get("model") if b.get("model") in MODELLE else "claude-sonnet-5-5"
    with db.tx() as c:
        st = ai.store(c, "plattform")
        alt = st.get("ki_kataloge")
        if key:
            st["ki_kataloge"] = {"key": key, "model": model}
            _speichern(c, st)
            try:   # gleich ausprobieren – ein falscher Schlüssel bleibt nicht stehen
                ai.ask("claude", "Antworte mit OK.", "Test", max_tokens=5, c=c, zweck="kataloge")
            except ai.AIError as e:
                if alt:
                    st["ki_kataloge"] = alt
                else:
                    st.pop("ki_kataloge", None)
                _speichern(c, st)
                return jsonify(error=f"Der Schlüssel funktioniert nicht: {e}"), 400
        else:
            st.pop("ki_kataloge", None)
            _speichern(c, st)
        return jsonify(claude=_zugang(c))


def _speichern(c, st):
    c.execute("INSERT INTO gantt_store(key, data, updated, updated_by) VALUES('plattform',?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (json.dumps(st, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), g.user["name"]))


def _lb(c, nr):
    r = c.execute("SELECT nr, name FROM pdb_leistungsbereich WHERE nr=?", (nr,)).fetchone()
    if not r:
        raise ValueError("Leistungsbereich nicht gefunden.")
    titel = [x["kurz"] for x in c.execute("SELECT kurz FROM pdb_position WHERE katalog IN ('gk3', 'eigen') AND lb_nr=? ORDER BY code LIMIT 400", (nr,)).fetchall()]
    return r["name"], titel


@app.post("/api/kataloge/vorschlag")
def kat_vorschlag():
    if not _kat():
        return jsonify(error="Nur für die Verwaltung."), 403
    b = request.get_json(silent=True) or {}
    art, nr, wort = b.get("art"), _s(b.get("lb"), 6), _s(b.get("stichwort"), 200)
    with db.tx() as c:
        try:
            name, kurz = _lb(c, nr)
        except ValueError as e:
            return jsonify(error=str(e)), 404
        alt = c.execute("SELECT titel, text FROM pdb_vorbemerkung WHERE key=?", (nr,)).fetchone()
        try:
            if art == "vorbem":
                u = (f"Leistungsbereich {nr} {name}.\nPositionen im Katalog (Auszug): {'; '.join(kurz[:120])}\n"
                     + (f"Bisherige Vorbemerkung zum Überarbeiten:\n{alt['text'][:6000]}\n" if alt and alt["text"] else "")
                     + (f"Schwerpunkt: {wort}\n" if wort else "")
                     + "Schreibe die Vorbemerkung für diesen Leistungsbereich: Geltungsbereich, Baustoffe und Ausführung, Nebenleistungen/Besondere Leistungen "
                       "nach VOB/C (nur benennen, nicht zitieren), Abrechnung, Hinweise zur Ausführung. Gegliedert mit kurzen Absätzen, höchstens 3.500 Zeichen. "
                       'JSON: {"titel": "…", "text": "…"}')
                d = ai.ask_json("claude", REGEL, u, max_tokens=3000, c=c, zweck="kataloge")
                v = {"titel": _s(d.get("titel"), 200) or f"{nr} {name}", "text": str(d.get("text") or "").strip()[:12000]}
                if not v["text"]:
                    return jsonify(error="Die KI hat keinen Text geliefert – bitte noch einmal."), 502
                return jsonify(art=art, lb=nr, name=name, vorschlag=v, bisher=dict(alt) if alt else None)
            if art == "positionen":
                u = (f"Leistungsbereich {nr} {name}.\nVorhandene Positionen (Kurztexte, nicht wiederholen): {'; '.join(kurz[:250])}\n"
                     + (f"Gesucht: {wort}\n" if wort else "Gesucht: wichtige Positionen, die im Katalog fehlen.\n")
                     + "Schlage bis zu 12 fehlende Positionen vor. Je Position Kurztext (höchstens 70 Zeichen), Langtext (2–5 Sätze), Einheit (GAEB: m, m2, m3, St, psch, kg, t, h), "
                       "Kostengruppe DIN 276 (3 Stellen) und Einheitspreise netto für den heutigen Stand in Deutschland als Spanne. "
                       'JSON: {"positionen": [{"kurz": "…", "lang": "…", "einheit": "m2", "kg": "330", "ep_von": 0, "ep_mittel": 0, "ep_bis": 0}]}')
                d = ai.ask_json("claude", REGEL, u, max_tokens=4000, c=c, zweck="kataloge")
                P = []
                for x in (d.get("positionen") or d.get("_objekte") or [])[:20]:
                    if not isinstance(x, dict) or not x.get("kurz"):
                        continue
                    z = lambda k: round(float(str(x.get(k) or 0).replace(",", ".")), 2) if str(x.get(k) or "").replace(",", ".").replace(".", "", 1).isdigit() else None  # noqa: E731
                    P.append({"kurz": _s(x["kurz"], 120), "lang": str(x.get("lang") or "").strip()[:4000], "einheit": _s(x.get("einheit"), 10) or "St",
                              "kg": "".join(ch for ch in str(x.get("kg") or "") if ch.isdigit())[:3], "ep_von": z("ep_von"), "ep_mittel": z("ep_mittel"), "ep_bis": z("ep_bis")})
                return jsonify(art=art, lb=nr, name=name, positionen=P)
        except ai.AIError as e:
            return jsonify(error=str(e)), 502
    return jsonify(error="Unbekannte Art."), 400


@app.put("/api/kataloge/vorbemerkung/<nr>")
def kat_vorbem(nr):
    if not _kat():
        return jsonify(error="Nur für die Verwaltung."), 403
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        if not c.execute("SELECT 1 FROM pdb_leistungsbereich WHERE nr=?", (nr,)).fetchone():
            return jsonify(error="Leistungsbereich nicht gefunden."), 404
        alt = c.execute("SELECT titel, text FROM pdb_vorbemerkung WHERE key=?", (nr,)).fetchone()
        if b.get("text"):
            c.execute("INSERT INTO pdb_vorbemerkung(key, titel, text, sort) VALUES(?,?,?,(SELECT COALESCE(max(sort), 0) + 1 FROM pdb_vorbemerkung)) "
                      "ON CONFLICT (key) DO UPDATE SET titel=EXCLUDED.titel, text=EXCLUDED.text", (nr, _s(b.get("titel"), 200) or nr, str(b["text"])[:12000]))
        else:   # Rückgängig auf „gab es nicht“
            c.execute("DELETE FROM pdb_vorbemerkung WHERE key=?", (nr,))
    return jsonify(ok=True, vorher=dict(alt) if alt else {"titel": "", "text": ""})


# ---------------------------------------------------------------- Bauteil-Vorlagen (Baukasten) mit Schichten
# Claude stellt aus vorhandenen Positionen (Katalog gk3) eine Vorlage zusammen: Schichten mit Optionen, je Option Positionen mit
# Mengenfaktor je Einheit des Bauteils. Übernehmen legt die Vorlage an und daraus die Standardelemente (Katalog gk3e) –
# wie positionsdb/bauteile_gen.py, nur für diese eine Vorlage. Sie erscheinen dann in Baukosten, Baudaten, AVA und in den
# Allplan-Katalogen. Markiert mit tags „ki“; zurücknehmen löscht Vorlage und Elemente wieder.
MAX_EL = 24


def _kandidaten(c, kg, wort):
    """Positionen, aus denen Claude wählen darf: was die Vorlagen derselben Kostengruppe (2. Ebene) schon benutzen, dazu Suchtreffer."""
    codes = []
    for r in c.execute("SELECT daten FROM pdb_vorlage WHERE kg LIKE ?", (kg[:2] + "%",)).fetchall():
        d = json.loads(r["daten"] or "{}")
        codes += [t[0] for t in d.get("fest") or []] + [t[0] for s in d.get("schichten") or [] for o in s.get("optionen") or [] for t in o.get("teile") or []]
    codes = list(dict.fromkeys(codes))[:260]
    P = {x["code"]: x for x in [r.dict() for r in c.execute(f"SELECT code, kurz, einheit FROM pdb_position WHERE katalog='gk3' AND code IN ({','.join('?' * len(codes)) or 'NULL'})", codes).fetchall()]} if codes else {}
    for w in [x for x in str(wort or "").replace(",", " ").split() if len(x) > 3][:5]:
        for r in c.execute("SELECT code, kurz, einheit FROM pdb_position WHERE katalog='gk3' AND kurz ILIKE ? LIMIT 25", (f"%{w}%",)).fetchall():
            P.setdefault(r["code"], r.dict())
    return P


def _kombis(v):
    import itertools
    L = [[i for i, o in enumerate(s["optionen"]) if o.get("std")] or list(range(len(s["optionen"]))) for s in v["schichten"]]
    out = list(itertools.product(*L)) if L else [()]
    return [out[int(i * len(out) / MAX_EL)] for i in range(MAX_EL)] if len(out) > MAX_EL else out


def _elemente(c, v):
    from bpcore import baudaten as B
    P = B._pos_preise(c, [t[0] for t in v.get("fest") or []] + [t[0] for s in v["schichten"] for o in s["optionen"] for t in o["teile"]])
    E = []
    for wahl in _kombis(v):
        teile, ks, ts = [tuple(t) for t in v.get("fest") or []], [], []
        for s, i in zip(v["schichten"], wahl):
            o = s["optionen"][i]
            teile += [tuple(t) for t in o["teile"]]
            if o.get("k"):
                ks.append(o["k"])
            if o.get("t"):
                ts.append(f"{s['name']}: {o['t']}")
        sm = B._summe(teile, P)
        if sm["ep_mittel"] <= 0:
            continue
        E.append({"wahl": list(wahl), "teile": teile, "kurz": ", ".join([v["name"]] + ks)[:70], "bez": ", ".join([v["name"]] + ks)[:300],
                  "lang": (v.get("lang") or "").strip() + ("\n" + "\n".join(ts) if ts else "") + (f"\nMenge: {v['bezug']}" if v.get("bezug") else ""), **sm})
    return E


def _vorlage_pruefen(d, P):
    """Antwort der KI säubern: nur Positionen aus der Auswahl, Faktoren > 0."""
    def teile(T):
        out = []
        for t in T or []:
            try:
                code, f = str(t[0]), float(str(t[1]).replace(",", "."))
            except (TypeError, ValueError, IndexError):
                continue
            if code in P and 0 < f < 1000:
                out.append([code, round(f, 4)])
        return out
    S = []
    for s in (d.get("schichten") or [])[:8]:
        O = [{"k": _s(o.get("k"), 40), "t": _s(o.get("t"), 200), "teile": teile(o.get("teile")), **({"std": True} if o.get("std") else {})}
             for o in (s.get("optionen") or [])[:8] if isinstance(o, dict)]
        O = [o for o in O if o["teile"] or not o["k"]]
        if O:
            S.append({"name": _s(s.get("name"), 60) or "Schicht", "optionen": O})
    return {"name": _s(d.get("name"), 80), "einheit": _s(d.get("einheit"), 10) or "m²", "lang": str(d.get("lang") or "").strip()[:2000],
            "bezug": _s(d.get("bezug"), 300), "fest": teile(d.get("fest")), "schichten": S}


@app.post("/api/kataloge/vorlage-vorschlag")
def kat_vorlage_vorschlag():
    if not _kat():
        return jsonify(error="Nur für die Verwaltung."), 403
    b = request.get_json(silent=True) or {}
    from bpcore import din276
    kg, wort = "".join(ch for ch in str(b.get("kg") or "") if ch.isdigit())[:3], _s(b.get("stichwort"), 200)
    if len(kg) != 3 or kg not in din276.NAMEN or not wort:
        return jsonify(error="Bitte Kostengruppe (3. Ebene) und ein Stichwort angeben."), 400
    with db.tx() as c:
        P = _kandidaten(c, kg, wort)
        if len(P) < 3:
            return jsonify(error="Zu dieser Kostengruppe gibt es zu wenige Positionen im Katalog."), 400
        vorh = [r["name"] for r in c.execute("SELECT name FROM pdb_vorlage WHERE kg=? ORDER BY id", (kg,)).fetchall()]
        u = (f"Kostengruppe {kg} {din276.NAMEN[kg]}. Gesucht: Bauteil-Vorlage „{wort}“.\nVorhandene Vorlagen dieser Kostengruppe (nicht doppeln): {'; '.join(vorh[:60])}\n"
             "Erlaubte Positionen (Code | Kurztext | Einheit) – NUR diese Codes verwenden:\n" + "\n".join(f"{x['code']} | {x['kurz']} | {x['einheit']}" for x in P.values())
             + "\nStelle eine Vorlage mit 2–5 Schichten zusammen (z. B. Tragschicht, Dämmung, Bekleidung innen/außen), je Schicht 1–5 Optionen. "
               "Je Option die Positionen mit Mengenfaktor je Einheit des Bauteils (z. B. 1 m² Wand braucht 1 m² Mauerwerk und 0,36 m Ringbalken → 0.36). "
               "Kennzeichne die gängigsten Optionen mit std=true. k = kurzes Kennwort der Option (≤ 20 Zeichen), t = Beschreibung. "
               'JSON: {"name": "…", "einheit": "m²", "lang": "Beschreibung (eigener Text)", "bezug": "wie die Menge ermittelt wird", "fest": [["code", 1.0]], '
               '"schichten": [{"name": "…", "optionen": [{"k": "…", "t": "…", "teile": [["code", 1.0]], "std": true}]}]}')
        try:
            d = ai.ask_json("claude", REGEL, u, max_tokens=6000, c=c, zweck="kataloge")
        except ai.AIError as e:
            return jsonify(error=str(e)), 502
        v = _vorlage_pruefen(d, P)
        if not v["name"] or not v["schichten"]:
            return jsonify(error="Die KI hat keine brauchbare Vorlage geliefert – bitte noch einmal oder mit anderem Stichwort."), 502
        v["kg"] = kg
        E = _elemente(c, v)
        kurz = {x["code"]: x["kurz"] for x in P.values()}
        for s in v["schichten"]:
            for o in s["optionen"]:
                o["teile_txt"] = [f"{str(f).replace('.', ',')} × {kurz.get(cd, cd)}" for cd, f in o["teile"]]
        return jsonify(vorlage=v, elemente=[{k: e[k] for k in ("kurz", "ep_von", "ep_mittel", "ep_bis")} for e in E], kg_name=din276.NAMEN[kg])


@app.put("/api/kataloge/vorlage")
def kat_vorlage_neu():
    if not _kat():
        return jsonify(error="Nur für die Verwaltung."), 403
    b = request.get_json(silent=True) or {}
    from bpcore import din276
    kg = "".join(ch for ch in str(b.get("kg") or "") if ch.isdigit())[:3]
    if kg not in din276.NAMEN:
        return jsonify(error="Kostengruppe fehlt."), 400
    with db.tx() as c:
        codes = [t[0] for t in b.get("fest") or []] + [t[0] for s in b.get("schichten") or [] for o in s.get("optionen") or [] for t in o.get("teile") or []]
        P = {r["code"]: r.dict() for r in c.execute(f"SELECT code FROM pdb_position WHERE katalog='gk3' AND code IN ({','.join('?' * len(codes)) or 'NULL'})", codes).fetchall()} if codes else {}
        v = _vorlage_pruefen(b, P)
        if not v["name"] or not v["schichten"]:
            return jsonify(error="Vorlage ohne Namen oder Schichten."), 400
        v["kg"] = kg
        n = max([int(r["id"].rsplit(".", 1)[1]) for r in c.execute("SELECT id FROM pdb_vorlage WHERE kg=?", (kg,)).fetchall() if r["id"].rsplit(".", 1)[-1].isdigit()] or [0]) + 1
        vid = f"{kg}.{n:02d}"
        c.execute("INSERT INTO pdb_vorlage(id, kg, name, einheit, lang, bezug, daten, tags, sort) VALUES(?,?,?,?,?,?,?,?,(SELECT COALESCE(max(sort), 0) + 1 FROM pdb_vorlage))",
                  (vid, kg, v["name"], v["einheit"], v["lang"], v["bezug"], json.dumps({"fest": v["fest"], "schichten": v["schichten"]}, ensure_ascii=False), "ki"))
        E = _elemente(c, v)
        kg2 = kg[:2] + "0"
        titel = f"{kg2} {din276.NAMEN.get(kg2, '')} › {kg} {din276.NAMEN.get(kg, '')}"
        stand = datetime.now().strftime("%Y-%m")
        for i, e in enumerate(E, 1):
            code = f"{vid}.{i:03d}"
            c.execute("INSERT INTO pdb_position(katalog, code, lb_nr, gruppe, titel, kurz, bez, lang, einheit, kg, gewerk, ep_von, ep_mittel, ep_bis, genauigkeit, tags, hinweis, quelle, preisstand) "
                      "VALUES('gk3e',?,?,?,?,?,?,?,?,?,'',?,?,?,'B','ki',?,'katalog',?) ON CONFLICT(katalog, code) DO NOTHING",
                      (code, kg2, kg, titel, e["kurz"], e["bez"] if e["bez"] != e["kurz"] else "", e["lang"], v["einheit"], kg, e["ep_von"], e["ep_mittel"], e["ep_bis"],
                       f"Aufbau {vid}:{'.'.join(map(str, e['wahl']))}", stand))
            for k, (cd, f) in enumerate(e["teile"]):
                c.execute("INSERT INTO pdb_element_teil(element_code, nr, position_code, faktor) VALUES(?,?,?,?) ON CONFLICT DO NOTHING", (code, k, cd, f))
    return jsonify(id=vid, elemente=len(E))


@app.delete("/api/kataloge/vorlage/<vid>")
def kat_vorlage_weg(vid):
    """Nur von der KI angelegte Vorlagen (tags „ki“) – samt ihren Standardelementen."""
    if not _kat():
        return jsonify(error="Nur für die Verwaltung."), 403
    with db.tx() as c:
        if not c.execute("SELECT 1 FROM pdb_vorlage WHERE id=? AND tags='ki'", (vid,)).fetchone():
            return jsonify(error="Nur von der KI angelegte Vorlagen lassen sich hier zurücknehmen."), 404
        c.execute("DELETE FROM pdb_element_teil WHERE element_code LIKE ?", (vid + ".%",))
        c.execute("DELETE FROM pdb_position WHERE katalog='gk3e' AND code LIKE ?", (vid + ".%",))
        c.execute("DELETE FROM pdb_vorlage WHERE id=?", (vid,))
    return jsonify(ok=True)
