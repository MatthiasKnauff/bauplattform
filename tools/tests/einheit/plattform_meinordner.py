"""Mein Ordner (GO 19.11.2026, Mock „Mein Ordner“: A1 B1 C1) – bpcore/meinordner.py: nur ein Ordnername (kein Pfad), Wurzel der Verwaltung,
nur die Person selbst, Vorschlag aus den vorhandenen Ordnern."""
import json

from bpcore import meinordner as MO
from lib import gleich, pruefe


class _C:   # settings + users.extra
    def __init__(self, wurzel=None, extra=None):
        self.w, self.extra = wurzel, extra or {}

    def execute(self, sql, a=()):
        me = self

        class R:
            def fetchone(self_):
                if "settings" in sql:
                    return {"value": me.w} if me.w is not None else None
                return {"extra": json.dumps(me.extra)}
        if sql.startswith("UPDATE users"):
            me.extra = json.loads(a[0])
        return R()


def test_name_und_pfad():
    gleich(MO.name_ok("../Personal"), "Personal", "kein Pfad, kein „..“ (A1)")
    gleich(MO.name_ok("a/b\\c"), "a b c", "Schrägstriche werden Leerzeichen")
    gleich(MO.name_ok(".."), "", "nur Punkte: leer")
    gleich(MO.teile_von("Büro/Mitarbeiter/"), ["Büro", "Mitarbeiter"], "Wurzel mit Unterordnern")


def test_wurzel_ordner_teile():
    c = _C()
    gleich(MO.ort(c), {"server": "", "freigabe": "Benutzer", "teile": []}, "Vorgabe: Freigabe „Benutzer“ auf dem Server der Ablage")
    gleich(MO.teile(c, 5), None, "ohne Eintrag kein Ordner (C1)")
    gleich(MO.setzen(c, 5, " Matthias "), "Matthias", "gespeichert")
    gleich(MO.teile(c, 5), ["Matthias"], "Unterordner direkt in der Freigabe")
    c.w = "Büro/Team"
    gleich(MO.ort(c), {"server": "", "freigabe": "", "teile": ["Büro", "Team"]}, "Pfad in der Ablage")
    gleich(MO.teile(c, 5), ["Büro", "Team", "Matthias"], "Wurzel + Unterordner")
    c.w = "\\\\192.168.233.88\\Benutzer\\Team"
    gleich(MO.ort(c), {"server": "192.168.233.88", "freigabe": "Benutzer", "teile": ["Team"]}, "UNC: eigene Freigabe")
    gleich(MO.anzeige(MO.ort(c)), "\\\\192.168.233.88\\Benutzer\\Team", "Anzeige als UNC")
    MO.setzen(c, 5, "")
    pruefe(MO.FELD not in c.extra, "Entfernen löscht den Eintrag")


def test_nur_die_person():
    gleich(MO.pid(7), -7, "Nummer −Benutzer-ID")
    pruefe(MO.darf({"id": 7}, -7), "die Person selbst")
    pruefe(not MO.darf({"id": 1, "is_admin": True}, -7), "auch Administrator:innen nicht (B1)")
    pruefe(not MO.darf({"id": 7}, 7) and not MO.ist(True), "Projekte und Unsinn: nein")


def test_vorschlag():
    L = ["Anna", "matthias", "Team"]
    gleich(MO.vorschlag(L, ["Matthias Knauff", "Matthias", "mk"]), "matthias", "Vorname, ohne Groß/Klein (C1)")
    gleich(MO.vorschlag(L, ["Kurt"]), "", "nichts Passendes")
