"""Ausschreibung ← Gebäudemodell: LVs aus den Aufbauten der Bauteil-Checkliste (GO 16.11.2026, „Gebäudemodell als Mitte“, Punkt 4/5;
je Gewerk ein LV: GO 17.11.2026, Entwurf „LVs aus dem Gebäudemodell“ – A2, B1, C2 mit Hinweis, D).

Die berechneten Bauteile (Kern: bauteilliste.berechnete – dieselbe Grundlage wie die Kosten) werden in ihre Leistungen aufgelöst
(Kurztext aus dem eigenen Baukasten, nie aus lizenzierten Katalogen; Menge aus dem Modell) und nach dem Gewerk ihres Leistungsbereichs
(pdb_leistungsbereich.gewerk) aufgeteilt: je Gewerk ein LV auf der obersten Ebene, darin die Leistungsbereiche als Gliederungspunkte.
Name und Gewerk des LV = Name des Gewerks, Nummer = die nächste freie des Projekts (ava_lvnr). Gibt es für ein Gewerk schon ein LV,
wird trotzdem eines angelegt – die Vorschau sagt es („schon da: 02 …“). Alles in einem Zug: scheitert etwas, entsteht kein LV.

GET  /api/lv/modell-vorschau?project_id=   → {gewerke: [{key, name, lbs: [Namen], n, summe, schon: [{nr, name}]}]} | {error}
POST /api/lv/aus-modell {project_id, gewerke: [key], version_id?}   → {lvs: [{id, nr, name}]}
"""
import json
import re

from flask import g, jsonify, request

from bpcore import bauteilliste, db, modell, versionen
from ava import C, _now, _sees, app, clean_items, nummerieren
import ava_aus_kosten, ava_lvnr

SONST = "sonst"   # Leistungen ohne Leistungsbereich (Bauteil ohne Aufbau)


def _nach_gewerk(c, pid):
    """Einträge des Modells je Gewerk → [(key, name, [Leistungsbereiche], [Einträge])] in der Reihenfolge der Leistungsbereiche, oder Fehlertext."""
    L = modell.lesen(c, pid)["modell"].get("bauteilliste") or bauteilliste.leer()
    bts, _ = bauteilliste.berechnete(c, L)
    if not bts:
        return "Im Gebäudemodell sind noch keine Bauteile zum Berechnen beantwortet (Gebäudemodell → Bauteile)."
    E = ava_aus_kosten._eintraege(c, bts, True)
    lbs = sorted({e["lb"] for e in E if e.get("lb")})
    ph = ",".join("?" * len(lbs)) or "''"
    LB = {r["nr"]: r for r in c.execute("SELECT l.nr, l.gewerk, l.sort, lo.name AS gname FROM pdb_leistungsbereich l "
                                        f"LEFT JOIN pdb_lohn lo ON lo.gewerk = l.gewerk WHERE l.nr IN ({ph})", lbs).fetchall()}
    G = {}
    for e in E:
        r = LB.get(e.get("lb") or "")
        key = (r["gewerk"] if r else "") or SONST
        name = re.sub(r"\s*\(.*\)$", "", (r["gname"] if r else "") or "") or (key.capitalize() if key != SONST else "Weitere Leistungen")
        z = G.setdefault(key, {"name": name, "sort": r["sort"] if r else 999, "lbs": [], "E": []})
        z["sort"] = min(z["sort"], r["sort"] if r else 999)
        if e["_lb"] not in z["lbs"]:
            z["lbs"].append(e["_lb"])
        z["E"].append(e)
    return [(k, z["name"], z["lbs"], z["E"]) for k, z in sorted(G.items(), key=lambda kv: kv[1]["sort"])]


def _items(E):
    return nummerieren(clean_items(ava_aus_kosten.gliedern_eintraege(E, "leistung", "gliederung", "lb")))


def vorschau(c, pid):
    T = _nach_gewerk(c, pid)
    if isinstance(T, str):
        return {"error": T}
    da = c.execute(f"SELECT nr, name, gewerk FROM ava_lv WHERE project_id=? AND {ava_lvnr.AKTIV} ORDER BY nr", (pid,)).fetchall()
    out = []
    for key, name, lbs, E in T:
        I = _items(E)
        out.append({"key": key, "name": name, "lbs": lbs, "n": sum(1 for x in I if x.get("typ") == "pos" and x.get("art") != "T"),
                    "summe": round(sum((x.get("menge") or 0) * (x.get("ep_s") or 0) for x in I if x.get("typ") == "pos"), 2),
                    "schon": [{"nr": r["nr"], "name": r["name"]} for r in da if (r["gewerk"] or "").strip().lower() == name.lower()]})
    return {"gewerke": out}


def anlegen(c, pid, keys, vid=None):
    """Je gewähltem Gewerk ein LV (nächste freie Nummer). Gibt [{id, nr, name}] oder einen Fehlertext zurück."""
    T = _nach_gewerk(c, pid)
    if isinstance(T, str):
        return T
    T = [t for t in T if t[0] in set(keys)]
    if not T:
        return "Bitte mindestens ein Gewerk wählen."
    if not vid:
        av = c.execute("SELECT id FROM ava_version WHERE project_id=? AND aktiv=1 ORDER BY id DESC LIMIT 1", (pid,)).fetchone()
        vid = av["id"] if av else None
    out, now = [], _now()
    for key, name, lbs, E in T:
        nr = ava_lvnr.naechste(c, pid, vid)
        i = c.execute("INSERT INTO ava_lv(project_id, nr, name, gewerk, data, version_id, created, updated, updated_by) VALUES(?,?,?,?,?,?,?,?,?) RETURNING id",
                      (pid, nr, name, name, json.dumps({"items": _items(E)}, ensure_ascii=False), vid, now, now, g.user["name"])).fetchone()["id"]
        versionen.nach(c, f"avalv:{i}", g.user["name"])
        C.audit(g.user["name"], "ava", "LV angelegt (aus dem Gebäudemodell)", f"{nr} {name}")
        out.append({"id": i, "nr": nr, "name": name})
    return out


@app.get("/api/lv/modell-vorschau")
def lv_modell_vorschau():
    pid = request.args.get("project_id", type=int)
    with db.tx() as c:
        if not pid or not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        return jsonify(vorschau(c, pid))


@app.post("/api/lv/aus-modell")
def lv_aus_modell():
    b = request.get_json(silent=True) or {}
    pid = b.get("project_id") if isinstance(b.get("project_id"), int) else None
    vid = b.get("version_id") if isinstance(b.get("version_id"), int) else None
    with db.tx() as c:
        if not pid or not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        if vid and not c.execute("SELECT 1 FROM ava_version WHERE id=? AND project_id=?", (vid, pid)).fetchone():
            vid = None
        r = anlegen(c, pid, [str(k) for k in b.get("gewerke") or []], vid)
        return (jsonify(error=r), 400) if isinstance(r, str) else jsonify(lvs=r)
