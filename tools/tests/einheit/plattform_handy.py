"""Handyansicht (GO 22.11.2026, Mock „Handyansicht je App“ HG-4): die untere Leiste je Person in den persönlichen Einstellungen –
nur Schlüssel aus Kleinbuchstaben, ohne Doppelte, höchstens fünf Plätze; leer = Vorgabe. Testdaten erfunden."""
from bpcore import konto as K
from lib import gleich


class _C:   # bp_store im Speicher
    def __init__(self):
        self.d = {}

    def execute(self, sql, args=()):
        if sql.startswith("SELECT"):
            v = self.d.get(args[0])
            return type("R", (), {"fetchone": lambda s: {"data": v} if v is not None else None})()
        self.d[args[0]] = args[1]
        return None


def test_untere_leiste():
    c = _C()
    gleich(K.prefs(c, 7)["handy"], [], "ohne Wahl: Vorgabe (leer)")
    K.set_prefs(c, 7, {"handy": ["portal", "wiki", "wiki", "Suche!", "suche", "ava", "plaene", "adressen"]})
    gleich(K.prefs(c, 7)["handy"], ["portal", "wiki", "suche", "ava", "plaene"], "Doppelte und Fremdes raus, höchstens fünf")
    K.set_prefs(c, 7, {"farbschema": "sand"})
    gleich(K.prefs(c, 7)["handy"], ["portal", "wiki", "suche", "ava", "plaene"], "andere Einstellung lässt die Leiste stehen")
    K.set_prefs(c, 7, {"handy": []})
    gleich(K.prefs(c, 7)["handy"], [], "↺ zurück zur Vorgabe")
