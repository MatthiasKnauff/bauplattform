"""Datenschutz (14.11.2026): Anfragen an externe KI anonymisieren – Art#Nummer hin, Klartext zurück (bpcore/anonym.py)."""
import re

from lib import gleich, pruefe

from bpcore import anonym as A


class _C:   # Datenbank ohne Datenbank: nur die drei Abfragen der Begriffsliste
    def execute(self, sql, *a):
        R = {"projects": [{"name": "A481 Tierheim Grillostr. 24, Essen", "client": "Tierschutzverein Groß-Essen e.V.", "street": "Grillostr. 24", "zip": "45141", "city": "Essen"}],
             "contacts": [{"name": "Maler Müller GmbH", "trade": "Maler", "art": "", "contact_person": "Karl Schmitz", "phone": "0201 555 12", "mobile": "",
                           "email": "info@maler-mueller.de", "street": "", "extra": '{"weitere": [{"typ": "person", "wert": "Petra Lang", "tel": "0172 1234567"}]}'}],
             "users": [{"name": "Anna Bauer", "vorname": "Anna", "nachname": "Bauer", "email": "anna@gk3.de"}]}
        t = next(k for k in R if f"FROM {k}" in sql)
        return type("R", (), {"fetchall": lambda s: R[t]})()


def test_hin_und_zurueck():
    A._CACHE["stand"] = None
    T = A.Tausch(_C())
    klar = ("Baustelle A481 Tierheim Grillostr. 24, Essen: Herr Schmitz von Maler Müller GmbH hat die Decke gespachtelt, max. 5 mm. "
            "Anna Bauer ruft Frau Peters an (0201 123456, info@maler-mueller.de). Müller kommt morgen. LV 01.02.0030, 12,5 m2.")
    h = T.hin(klar)
    for wort in ("Tierheim", "Schmitz", "Müller", "Anna Bauer", "Peters", "0201 123456", "info@maler-mueller.de"):
        pruefe(wort not in h, f"„{wort}“ ersetzt: {h}")
    for wort in ("Decke gespachtelt", "max. 5 mm", "01.02.0030", "12,5 m2", "kommt morgen"):
        pruefe(wort in h, f"„{wort}“ bleibt stehen: {h}")
    pruefe(re.search(r"\bfirma#\d{12}\b", h) and re.search(r"\bmitarbeiter#\d{12}\b", h) and re.search(r"\bprojekt#\d{12}\b", h), f"Art#Nummer: {h}")
    gleich(T.zurueck(h), klar, "Antwort zurück in Klartext")
    k = next(k for k, t, _ in T.ersetzt if t == "Maler Müller GmbH")
    gleich(T.zurueck(k.replace("firma#", "firm#")), "Maler Müller GmbH", "auch wenn die KI die Art verändert – die Nummer zählt")
    gleich(len({k for k, _, _ in T.ersetzt}), len(T.ersetzt), "jede Kennung einmal")
    pruefe(T.hin("Maler Müller GmbH").startswith(k), "derselbe Begriff → dieselbe Kennung in einer Anfrage")
    pruefe(A.Tausch(_C()).hin("Maler Müller GmbH") != k, "nächste Anfrage → neue Nummer")
