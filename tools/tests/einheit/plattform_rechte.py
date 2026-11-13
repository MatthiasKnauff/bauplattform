"""Projekte sehen (13.11.2026): Administrator (Recht „verwaltung“, Rolle ab Werk ohne „projekte.alle“) sieht alle Projekte –
sonst fehlte z. B. in den Projektdaten der Abschnitt „Bauvorhaben“ mit dem Projektordner bei Projekten anderer Bauleiter."""
from lib import gleich

from bpcore import rechte


def test_verwaltung_sieht_alle_projekte():
    admin, ma, alle = {"id": 1, "rechte": '["verwaltung"]'}, {"id": 2, "rechte": "[]"}, {"id": 3, "rechte": '["projekte.alle"]'}
    gleich([rechte.allowed([9], u) for u in (admin, ma, alle)], [True, False, True], "fremdes Projekt")
    gleich([rechte.allowed([], u) for u in (admin, ma, alle)], [True, True, True], "Projekt ohne Bauleitung")
    gleich(rechte.allowed([2], ma), True, "eigenes Projekt")
