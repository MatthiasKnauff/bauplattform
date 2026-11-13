"""Baudaten – Kataloge mit KI ergänzen (Verwaltung → Kataloge erzeugen). Nur Verwaltung.

Claude schlägt vor, übernommen wird nur, was die Verwaltung in der Prüfliste anhakt:
  Vorbemerkungen je Leistungsbereich (neu oder überarbeitet) und fehlende Positionen eines Leistungsbereichs (als eigene Positionen).
Eigene Formulierungen – keine Sätze aus lizenzierten Katalogen (sirAdos, STLB-Bau u. a.); als Anhalt gehen nur Titel und Kurztexte
des eigenen Katalogs „Bauplattform“ (gk3) mit. Ist unter KI kein Claude eingerichtet, gilt ein Schlüssel nur für diesen Zweck
(gantt_store „plattform“ → ki_kataloge); er wird nie an den Browser zurückgegeben.

GET  /api/kataloge/stand              Umfang der Kataloge, Leistungsbereiche (mit/ohne Vorbemerkung), Claude-Zugang
PUT  /api/kataloge/schluessel         {key, model?} – testen und speichern; {key: ""} entfernt
POST /api/kataloge/vorschlag          {art: "vorbem"|"positionen", lb, stichwort?} → Vorschläge
PUT  /api/kataloge/vorbemerkung/<lb>  {titel, text} – übernehmen; Antwort mit „vorher“ (Rückgängig: dasselbe mit vorher)
Positionen übernimmt der Browser über POST /api/position (eigene Positionen, wie „Neue Position“).
"""
import json
from datetime import datetime

from flask import g, jsonify, request

from bpcore import ai, db
from baudaten import _admin, _s, app

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
    if not _admin():
        return jsonify(error="Nur für die Verwaltung."), 403
    with db.tx() as c:
        n = {r["katalog"]: r["n"] for r in c.execute("SELECT katalog, count(*) AS n FROM pdb_position GROUP BY katalog").fetchall()}
        try:
            nv = c.execute("SELECT count(*) AS n FROM pdb_vorlage").fetchone()["n"]
        except Exception:   # noqa: BLE001 – Baukasten noch nicht eingespielt
            nv = 0
        vb = {r["key"]: r["titel"] for r in c.execute("SELECT key, titel FROM pdb_vorbemerkung").fetchall()}
        lbs = [{"nr": r["nr"], "name": r["name"], "vorbem": r["nr"] in vb} for r in c.execute("SELECT nr, name FROM pdb_leistungsbereich ORDER BY nr").fetchall()]
        return jsonify(positionen=n.get("gk3", 0), eigene=n.get("eigen", 0), elemente=n.get("gk3e", 0), vorlagen=nv, vorbemerkungen=len(vb),
                       lbs=lbs, claude=_zugang(c))


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
    if not _admin():
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
    if not _admin():
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
