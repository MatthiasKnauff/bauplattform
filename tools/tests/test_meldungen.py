"""Ablauftests Benachrichtigungen verwalten (17.11.2026, bpcore/meldungen.py, Verwaltung → Benachrichtigungen):
Erinnerung aus/an, löschen über den Papierkorb mit Rückgängig, „für alle“ nur mit Recht, eigene Hinweise und Mail-Erinnerungen
mit ↺ zurück auf die Vorgabe, Vorgabe je Rolle."""
from datetime import date, timedelta

from lib import gleich, pruefe

M = "/verwaltung/api/bp/meldungen"


def _finde(L, art, id_):
    return next((x for x in L["listen"][art] if x["id"] == id_), None)


def test_meldungen(ctx):
    a = ctx.admin
    ich = a.gj("/api/me")["id"]
    titel = ctx.name("Benachrichtigung")
    rid = a.pj("/maengel/api/erinnerungen", {"titel": titel, "termin": (date.today() + timedelta(days=40)).isoformat(), "uhrzeit": "09:00", "an": [ich]})["id"]
    anna = ctx.anmelden("Anna Bauer")
    try:
        L = a.gj(M)
        x = _finde(L, "erinnerung", f"r{rid}")
        pruefe(x and x["aktiv"] and x["loeschbar"], "eigene Erinnerung steht in „Für mich“, aktiv")
        z = a.pj(M, {"ids": [f"r{rid}"], "was": "aus"})["zurueck"][0]
        gleich(_finde(a.gj(M), "erinnerung", f"r{rid}")["aktiv"], False, "ausgeschaltet")
        a.pj(M, {"zurueck": z})
        gleich(_finde(a.gj(M), "erinnerung", f"r{rid}")["aktiv"], True, "Rückgängig: wieder an")
        anna.get(M + "?alle=1", expect=403)   # für alle nur mit Recht
        anna.post(M, {"ids": [f"r{rid}"], "was": "aus"}, expect=403)   # fremde Erinnerung
        pruefe(_finde(a.gj(M + "?alle=1"), "erinnerung", f"r{rid}"), "Verwaltung sieht sie unter „Für alle“")
        z = a.pj(M, {"ids": [f"r{rid}"], "was": "loeschen"})["zurueck"][0]
        pruefe(not _finde(a.gj(M), "erinnerung", f"r{rid}"), "gelöscht")
        a.pj(M, {"zurueck": z})
        pruefe(_finde(a.gj(M), "erinnerung", f"r{rid}"), "aus dem Papierkorb zurück")

        h = anna.gj(M)
        x = _finde(h, "hinweis", "hrechnungen")
        pruefe(x and x["aktiv"], "Hinweis Rechnungsprüfung für Anna an")
        anna.pj(M, {"ids": ["hrechnungen"], "was": "aus"})
        x = _finde(anna.gj(M), "hinweis", "hrechnungen")
        gleich((x["aktiv"], x["woher"]), (False, "eigene Wahl"), "bei sich ausgeschaltet")
        anna.pj(M, {"ids": ["hrechnungen"], "was": "standard"})
        gleich(_finde(anna.gj(M), "hinweis", "hrechnungen")["aktiv"], True, "↺ wieder wie das Büro")

        mid = next(x["id"] for x in anna.gj(M)["listen"]["mail"])
        anna.pj(M, {"ids": [mid], "was": "aus"})
        gleich(_finde(anna.gj(M), "mail", mid)["aktiv"], False, "Erinnerungen per Mail aus")
        anna.pj(M, {"ids": [mid], "was": "standard"})
        anna.post(M, {"rollen_fuer": "mail_erinnerung", "rollen": []}, expect=403)   # Vorgabe je Rolle nur mit Recht
        r = a.pj(M, {"rollen_fuer": "mail_erinnerung", "rollen": []})
        try:
            x = _finde(anna.gj(M), "mail", mid)
            gleich((x["aktiv"], x["woher"]), (False, "Rolle"), "Rolle ohne Mail: aus")
            anna.pj(M, {"ids": [mid], "was": "an"})
            gleich(_finde(anna.gj(M), "mail", mid)["aktiv"], True, "die Person darf bei sich wieder anschalten (B1)")
            anna.pj(M, {"ids": [mid], "was": "standard"})
        finally:
            a.pj(M, {"rollen_fuer": "mail_erinnerung", "rollen": r["zurueck"]["rollen"]})
        gleich(_finde(anna.gj(M), "mail", mid)["aktiv"], True, "Vorgabe zurück: Mail wieder an")
    finally:
        a.delete(f"/maengel/api/erinnerungen/{rid}")
