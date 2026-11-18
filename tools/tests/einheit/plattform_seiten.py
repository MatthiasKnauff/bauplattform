"""Seiten als Rechte (bpcore/rechte.py, 18.11.2026, Mock „Seiten als Rechte“: NS-A1 B1 C1)."""
import json

from bpcore import rechte as R
from lib import gleich, pruefe


def _u(*k):
    return {"rechte": json.dumps(list(k)), "is_admin": 0}


def test_stufe_der_seite():
    gleich(R.seite_stufe(_u(), "ava.nachverfolgen"), "an", "App an → Seite an")
    gleich(R.seite_stufe(_u("app.ava.aus"), "ava.nachverfolgen"), "aus", "App aus, kein Seitenrecht")
    gleich(R.seite_stufe(_u("app.ava.aus", "seite.ava.nachverfolgen"), "ava.nachverfolgen"), "an", "Seite zugeschaltet")
    gleich(R.seite_stufe(_u("app.ava.aus", "seite.ava.nachverfolgen.lesen"), "ava.nachverfolgen"), "lesen", "Seite nur lesen")
    gleich(R.seite_stufe(_u("app.ava.lesen"), "ava.nachverfolgen"), "lesen", "App nur lesen gilt für die Seite")
    gleich(R.seiten(_u(), "ava"), {}, "App an: keine Seitenliste")
    gleich(R.seiten(_u("app.ava.aus", "seite.ava.nachverfolgen"), "ava"), {"nachverfolgen": "an"}, "nur die Seite")


def test_adressen_der_seite():
    u = _u("app.ava.aus", "seite.ava.nachverfolgen")
    gleich(R.seite_fuer("ava", "PUT", "/api/lv/12/versand"), "ava.nachverfolgen", "Versand gehört zur Seite")
    gleich(R.seite_fuer("ava", "DELETE", "/api/lv/12/versand"), None, "Löschen nicht")
    gleich(R.seite_zugang(u, "ava", "GET", "/api/nachverfolgen"), "an", "Liste")
    gleich(R.seite_zugang(u, "ava", "GET", "/api/me"), "an", "Gerüst")
    gleich(R.seite_zugang(u, "ava", "GET", "/api/lv"), None, "LV-Liste gesperrt")
    gleich(R.seite_zugang(u, "ava", "POST", "/api/lv/3/versand/senden"), "an", "Erinnerung senden")
    pruefe(all(k in R.KEYS for k in ("seite.ava.nachverfolgen", "seite.ava.nachverfolgen.lesen")), "Rechte bekannt")
