"""Einträge aus Vorschlagslisten löschen mit Ersatz (bpcore/begriffe.py, GO 17.11.2026): ähnliche Schreibweise, Ersetzen in Listenfeldern,
Ersatz je Adresse, Rückgängig – mit nachgebildeter Datenbank."""
from bpcore import begriffe
from lib import gleich, pruefe


class _Db:
    def __init__(self, rows):
        self.rows = {r["id"]: dict(r) for r in rows}

    def execute(self, sql, p=()):
        class Q(list):
            def fetchall(s): return list(s)
            def fetchone(s): return s[0] if s else None
        if sql.startswith("UPDATE contacts SET"):
            feld = sql.split("SET ")[1].split("=")[0]
            self.rows[p[-1]][feld] = p[0]
            return Q()
        if "versionen" in sql or sql.startswith(("INSERT", "SELECT data", "DELETE")):
            return Q()
        feld = "trade"
        if "SELECT trade AS v" in sql or "trade AS v" in sql:
            feld = "trade"
        return Q([{**r, "v": r[feld]} for r in self.rows.values() if (r[feld] or "")])


def test_aehnlich_und_ersetzen():
    gleich(begriffe._norm("Bauherr*in"), begriffe._norm("Bauherr"), "Bauherr*in ist ähnlich wie Bauherr")
    gleich(begriffe._norm("Bauherr:innen"), begriffe._norm("Bauherr"), "Bauherr:innen ebenso")
    q = begriffe.QUELLEN["kontakt.trade"]
    gleich(q.neu("Bauherr*in, Maler", "bauherr*in", "Bauherr"), "Bauherr, Maler", "im Listenfeld ersetzt, Rest bleibt")
    gleich(q.neu("Bauherr, Bauherr*in", "Bauherr*in", "Bauherr"), "Bauherr", "doppelt fällt weg")
    gleich(q.neu("Bauherr*in, Maler", "Bauherr*in", ""), "Maler", "ohne Ersatz: nur entfernt")
    gleich(begriffe.QUELLEN["kontakt.art"].neu("Firma", "Firma", "Planer:in"), "Planer:in", "Einzelwert (Art)")


def test_ansehen_ersetzen_zurueck():
    import bpcore.versionen as V
    V_vor, V_nach = V.vor, V.nach
    V.vor = V.nach = lambda *a, **k: None   # Verlauf hier nicht nachbilden
    try:
        c = _Db([{"id": 1, "name": "Knauff", "street": "", "zip": "", "city": "Essen", "trade": "Bauherr*in"},
                 {"id": 2, "name": "Muster", "street": "", "zip": "", "city": "", "trade": "Bauherr*in, Maler"},
                 {"id": 3, "name": "Schmidt", "street": "", "zip": "", "city": "", "trade": "Bauherr"},
                 {"id": 4, "name": "Bauherr*innen GmbH", "street": "", "zip": "", "city": "", "trade": "Bauherr*innen"}])
        a = begriffe.ansehen(c, "kontakt.trade", "Bauherr*in")
        gleich(sorted(t["id"] for t in a["treffer"]), [1, 2], "nur Adressen mit genau diesem Eintrag (nicht „Bauherr*innen“)")
        gleich(a["vorschlag"], "Bauherr", "ähnliche Schreibweise vorgeschlagen")
        r = begriffe.ersetzen(c, "kontakt.trade", "Bauherr*in", "Bauherr", {"2": ""}, "test")
        gleich((c.rows[1]["trade"], c.rows[2]["trade"], len(r)), ("Bauherr", "Maler", 2), "Ersatz für alle, je Adresse „ohne Ersatz“")
        begriffe.zurueck(c, "kontakt.trade", r, "test")
        gleich((c.rows[1]["trade"], c.rows[2]["trade"]), ("Bauherr*in", "Bauherr*in, Maler"), "Rückgängig: alte Werte zurück")
        pruefe("unbekannt" not in begriffe.QUELLEN, "nur bekannte Quellen")
    finally:
        V.vor, V.nach = V_vor, V_nach
