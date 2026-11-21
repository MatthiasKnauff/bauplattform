"""Einstellungen des Gebäudemodells fürs ganze Büro (bp_store „gm:einst“, Verwaltung → Einstellungen → Gebäudemodell).

E  Liste rechts: e1 gegliedert wie die gewählte Färbung · e2 immer Gebäudeteil › Geschoss › Bauteilart
F  Wände spreizen: f1 alle, mit Umschalter „nur außen“ · f2 nur Außenwände, ohne Umschalter
A–C gehörten zum Reiter „Änderungen“ mit Zeitschieber; der entfiel am 21.11.2026 samt dem Merken je Bauteil (bpcore/modell_aenderung.py,
Tabelle pm_aenderung bleibt nur, weil Migrationen nicht zurückgenommen werden) – zurück und wieder geht über Rückgängig.
"""
import json
from datetime import datetime

from .jsonwert import lies as _j

EINST = {"e": "e1", "f": "f1"}
ERLAUBT = {"e": ("e1", "e2"), "f": ("f1", "f2")}


def einst(c):
    r = c.execute("SELECT data FROM bp_store WHERE key='gm:einst'").fetchone()
    d = _j(r["data"], {}) if r else {}
    return {k: d.get(k) if d.get(k) in ERLAUBT[k] else v for k, v in EINST.items()}


def einst_setzen(c, werte, wer):
    E = einst(c)
    E.update({k: v for k, v in (werte or {}).items() if k in ERLAUBT and v in ERLAUBT[k]})
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES('gm:einst',?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by",
              (json.dumps(E), datetime.now().isoformat(timespec="seconds"), (wer or "")[:80]))
    return E


def routen(bp, _uid):
    from flask import jsonify, request

    from . import db, rechte

    @bp.route("/api/bp/modell/einst", methods=["GET", "PUT"])
    def modell_einst():
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":
                if rechte.stufe(u, "buero") != "aendern":
                    return jsonify(error="Ändern darf nur, wer in der Verwaltung „Büro & Standort“ ändern darf."), 403
                return jsonify(einst_setzen(c, (request.get_json(silent=True) or {}).get("werte"), u.get("username") or ""))
            return jsonify(einst(c))
