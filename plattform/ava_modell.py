"""Ausschreibung ← Gebäudemodell: LV-Entwurf aus den Aufbauten der Bauteil-Checkliste (GO 16.11.2026, „Gebäudemodell als Mitte“, Punkt 4/5).

Legt jemand das erste LV eines Projekts an und übernimmt die Startdaten aus dem Gebäudemodell, kommen die berechneten Bauteile
(Kern: bauteilliste.berechnete – dieselbe Grundlage wie die Kosten) als Positionen ins LV: je Aufbau seine Leistungen mit Kurztext aus
dem eigenen Baukasten (nie aus lizenzierten Katalogen), Menge aus dem Modell, gegliedert nach Leistungsbereichen (ava_aus_kosten.gliedern).

POST /api/lv/<i>/aus-modell   → LV wie GET /api/lv/<i>
"""
import json

from flask import g, jsonify

from bpcore import bauteilliste, db, modell, versionen
from ava import _antwort, _lv, _now, app, clean_items, nummerieren
from bpcore.jsonwert import lies as _j


@app.post("/api/lv/<int:i>/aus-modell")
def lv_aus_modell(i):
    with db.tx() as c:
        if not _lv(c, i):
            return jsonify(error="Nicht gefunden"), 404
        fehler = fuellen(c, i)
        return (jsonify(error=fehler), 400) if fehler else _antwort(c, i)


def fuellen(c, i):
    """Berechnete Bauteile des Gebäudemodells als Positionen anhängen. Fehlertext oder None (dann ist nichts geändert) – auch beim
    Anlegen in einem Zug (POST /api/lv mit aus: "modell"): scheitert es, entsteht kein LV und die Nummer bleibt frei."""
    r = _lv(c, i)
    if not r["project_id"]:
        return "Das LV gehört zu keinem Projekt."
    L = modell.lesen(c, r["project_id"])["modell"].get("bauteilliste") or bauteilliste.leer()
    bts, _ = bauteilliste.berechnete(c, L)
    if not bts:
        return "Im Gebäudemodell sind noch keine Bauteile zum Berechnen beantwortet (Gebäudemodell → Bauteile)."
    import ava_aus_kosten
    d = _j(r["data"], {}) or {}
    d["items"] = nummerieren(clean_items((d.get("items") or []) + ava_aus_kosten.gliedern(c, bts, "leistung", "gliederung", "lb", True)))
    versionen.vor(c, f"avalv:{i}")
    c.execute("UPDATE ava_lv SET data=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(d, ensure_ascii=False), _now(), g.user["name"], i))
    versionen.nach(c, f"avalv:{i}", g.user["name"])
    return None
