"""LV- & Auftragsdaten (Maske „LV- & Auftragsdaten“ der Ausschreibung) – aus ava.py ausgelagert am 17.11.2026.

Auswahl statt freier Felder (GO 17.11.2026, Entwurf „LV-Daten mit Auswahlfeldern“):
  A1  Listen = feste übliche Werte (stammdaten.LV/AUFTRAG, Typ „auswahl“) + was das Büro schon einmal eingetragen hat (listen())
  B1  „eigener Wert …“ immer als letzte Zeile (BPHead.datenMaske)
  C2  Schema für Vergabe- und Auftragsnummer in den Einstellungen der Ausschreibung (Nummern), Vorgabe C1 „{projekt}-{lv}-{jahr}“
  D   je Vertragsbedingung ohne eigenen Wert die Vorgabe des Büros (ava_vergabe.vorgaben) – mit OK gespeichert
  E1  Umlagen (Bauwasser, Baustrom …) stehen nach der Vergabe als Zeilen der Abzüge (ava-abzuege.js) – keine zweite Eingabe hier

GET/PUT /api/lv/<i>/daten                  Angaben zur Ausschreibung (data.meta) und zum Auftrag (vergabe.auftrag)
GET/PUT /api/einstellungen/ava-nummern     {schema} – Platzhalter {projekt} {lv} {jahr} {gewerk}
"""
import json
import re
from datetime import date

from flask import g, jsonify, request

from bpcore import db, rechte, stammdaten, versionen
from bpcore.jsonwert import lies as _j
from ava import KG_NAMEN, _lv, _now, _s, app
import ava_vergabe

NUMMERN_KEY = "ava_nummern"
SCHEMA = "{projekt}-{lv}-{jahr}"   # Vorgabe (C1)
LISTE_MAX = 40   # so viele eigene Werte des Büros je Liste


def schema(c):
    r = c.execute("SELECT value FROM settings WHERE key=?", (NUMMERN_KEY,)).fetchone()
    return ((_j(r["value"] if r else "", {}) or {}).get("schema") or SCHEMA)[:80]


def nummer(sch, projekt, lv_nr, gewerk="", jahr=None):
    """Nummer nach Schema: {projekt} = Projektnummer (Anfang des Projektnamens, z. B. „A534“), {lv} = LV-Nummer, {jahr}, {gewerk}."""
    m = re.match(r"\s*([A-Za-z]{0,3}\d[\w.]*)", projekt or "")
    w = {"projekt": m.group(1) if m else "", "lv": str(lv_nr or "").strip(), "jahr": str(jahr or date.today().year), "gewerk": (gewerk or "").strip()}
    t = re.sub(r"\{(\w+)\}", lambda x: w.get(x.group(1), ""), sch)
    return re.sub(r"(^[-_/ .]+|[-_/ .]+$)", "", re.sub(r"([-_/ .])[-_/ .]+", r"\1", t))


def listen(c, felder_alle):
    """Je Auswahlfeld: feste Werte + Werte, die im Büro schon eingetragen sind (A1). Gewerk: Leistungsbereiche und Gewerke der LVs;
    Kostengruppe: DIN 276 bis zur 3. Ebene als [Wert, „331 Tragende Außenwände“]."""
    keys = [f["k"] for F in felder_alle for gr in F for f in gr["felder"] if f["typ"] == "auswahl"]
    eigen = {k: {} for k in keys}
    for r in c.execute("SELECT data, vergabe, gewerk FROM ava_lv ORDER BY updated DESC NULLS LAST LIMIT 1500").fetchall():
        M = {**((_j(r["data"], {}) or {}).get("meta") or {}), **{"a_" + k: v for k, v in ((_j(r["vergabe"], {}) or {}).get("auftrag") or {}).items()}}
        M["gewerk"] = r["gewerk"] or ""
        for k in keys:
            for kk in (k, "a_" + k):
                v = str(M.get(kk) if M.get(kk) is not None else "").strip()
                v = v[:-2] if v.endswith(".0") else v   # Zahlungsfrist war früher eine Zahl (21.0)
                if v:
                    eigen[k][v] = eigen[k].get(v, 0) + 1
    out = {}
    lb = [r["name"] for r in c.execute("SELECT name FROM pdb_leistungsbereich ORDER BY sort").fetchall()] if keys else []
    for k in keys:
        if k == "kg":
            out[k] = [[n, f"{n} {t}"] for n, t in sorted(KG_NAMEN.items()) if len(n) == 3]
            continue
        fest = next((f.get("opt") or [] for F in felder_alle for gr in F for f in gr["felder"] if f["k"] == k), [])
        dazu = [v for v, _ in sorted(eigen[k].items(), key=lambda x: -x[1]) if v not in fest][:LISTE_MAX]
        out[k] = sorted(set(fest) | set(dazu) | set(lb), key=str.lower) if k == "gewerk" else fest + dazu
    return out


def _mit_listen(F, L):
    for gr in F:
        for f in gr["felder"]:
            if f["typ"] == "auswahl" and f["k"] in L:
                f["opt"] = L[f["k"]]
    return F


@app.route("/api/lv/<int:i>/daten", methods=["GET", "PUT"])
def lv_daten(i):
    """Angaben zur Ausschreibung (data.meta) und zum Auftrag (vergabe.auftrag) – Maske wie die Projektdaten."""
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        D, V = _j(r["data"], {}) or {}, _j(r["vergabe"], {}) or {}
        if request.method == "PUT":
            b = request.get_json(silent=True) or {}
            c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", (f"avalv:{i}",))
            r = _lv(c, i); D, V = _j(r["data"], {}) or {}, _j(r["vergabe"], {}) or {}
            versionen.vor(c, f"avalv:{i}")
            if isinstance(b.get("lv"), dict):
                D["meta"] = stammdaten.bereinigen(stammdaten.LV, b["lv"], D.get("meta"))
                if "gewerk" in b["lv"]:   # Gewerk gehört zum LV selbst (Liste, Bauzeitenplan, Ablage)
                    c.execute("UPDATE ava_lv SET gewerk=? WHERE id=?", (_s(b["lv"].get("gewerk"), 120), i))
                    r = _lv(c, i)
            if isinstance(b.get("auftrag"), dict) and V.get("bieter"):
                V["auftrag"] = stammdaten.bereinigen(stammdaten.AUFTRAG, b["auftrag"], V.get("auftrag"))
            c.execute("UPDATE ava_lv SET data=?, vergabe=?, updated=?, updated_by=? WHERE id=?",   # rev bleibt: offene LV-Bearbeitung nicht stören
                      (json.dumps(D, ensure_ascii=False), json.dumps(V, ensure_ascii=False), _now(), g.user["name"], i))
            versionen.nach(c, f"avalv:{i}", g.user["name"])
        A = V.get("auftrag") or {}
        if V.get("bieter") and not A.get("auftragsdatum") and V.get("datum"):
            A = {**A, "auftragsdatum": V["datum"]}
        meta = dict(D.get("meta") or {})
        G = ava_vergabe.vorgaben(c)   # D: je Bedingung ohne eigenen Wert die Vorgabe des Büros – wie im Druck (ava_lvdruck.daten) und im Protokoll
        vorgabe = {"vb_" + k: G[k] for k in ava_vergabe.VB if k != "einbehalt_abl" and G.get(k) and not str(meta.get("vb_" + k) or "").strip()}
        if "vb_einbehalt_abl" not in meta:
            vorgabe["vb_einbehalt_abl"] = G.get("einbehalt_abl", "ja") == "ja"
        pr = c.execute("SELECT name FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
        sch = schema(c)
        FL, FA = stammdaten.felder(stammdaten.LV), stammdaten.felder(stammdaten.AUFTRAG)
        L = listen(c, [FL, FA])
        items = [x for x in D.get("items") or [] if x.get("typ") == "pos" and x.get("art") not in ("T", "A", "E", "V")]
        return jsonify(lv={**vorgabe, **meta, "gewerk": r["gewerk"] or ""}, vorgabe=sorted(vorgabe), auftrag=A, kg_namen=KG_NAMEN,
                       vergeben=bool(V.get("bieter")) and not V.get("aufgehoben"), bieter=V.get("bieter") or "",
                       felder_lv=_mit_listen(FL, L), felder_auftrag=_mit_listen(FA, L),
                       vorschlag=nummer(sch, pr["name"] if pr else "", r["nr"], r["gewerk"]),   # für Vergabe- und Auftragsnummer
                       schaetzung=round(sum((x.get("menge") or 0) * (x.get("ep_s") or 0) for x in items), 2),
                       plan=stammdaten.plan_termine(c, r["project_id"], r["gewerk"] or None, r["name"] or None) if r["project_id"] else {"start": "", "ende": "", "plaene": []},
                       titel=f"LV {r['nr']} {r['name']}".strip())


@app.route("/api/einstellungen/ava-nummern", methods=["GET", "PUT"])
def ava_nummern():
    with db.tx() as c:
        if request.method == "PUT":
            if rechte.stufe(g.user, "ava") != "aendern":
                return jsonify(error="Das darfst du nicht ändern."), 403
            sch = _s((request.get_json(silent=True) or {}).get("schema"), 80) or SCHEMA
            c.execute("INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (NUMMERN_KEY, json.dumps({"schema": sch})))
        sch = schema(c)
        return jsonify(schema=sch, beispiel=nummer(sch, "A534 Erweiterung Tierheim", "01", "Rohbau"), vorgabe=SCHEMA, darf=rechte.stufe(g.user, "ava") == "aendern")
