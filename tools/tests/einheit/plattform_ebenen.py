"""Ausschreibungsdaten in drei Ebenen (GO 18.11.2026, AD-A1 B1 C1 E1 – plattform/ava_ebenen.py, bpcore/ausschreibung.py): ein LV erbt vom
Projekt, sonst vom Büro; Abgabe nur vom Projekt (Vorschlag), Bindefrist als Regel gerechnet; was dem geerbten Wert gleicht, ist kein eigener
Wert; nach der Vergabe hält der Auftrag die Werte fest. Datenbank nachgebildet (läuft im Container der AVA)."""
import json

import ava_ebenen as E
from bpcore import ausschreibung as AS
from lib import gleich, pruefe


class Zeile(dict):
    def keys(self):
        return super().keys()


class Ergebnis:
    def __init__(self, z):
        self.z = z

    def fetchone(self):
        return self.z[0] if self.z else None

    def fetchall(self):
        return self.z


class Db:
    """Nur was das Erben fragt: Einstellungen des Büros, Projektdaten (bp_store), Schreiben ins LV."""
    def __init__(self, einst=None, projekt=None):
        self.einst, self.projekt, self.geschrieben = einst or {}, projekt or {}, []

    def execute(self, sql, a=()):
        if "FROM settings" in sql:
            return Ergebnis([Zeile(value=json.dumps(self.einst[a[0]]))] if a[0] in self.einst else [])
        if "FROM bp_store" in sql:
            return Ergebnis([Zeile(data=json.dumps(self.projekt))])
        if sql.startswith("UPDATE ava_lv"):
            self.geschrieben.append(a)
        return Ergebnis([])


def _lv(meta=None, vergabe=None):
    return Zeile(id=7, project_id=3, gewerk="Rohbau", data=json.dumps({"meta": meta or {}}), vergabe=json.dumps(vergabe or {}))


def test_projekt_vor_buero():
    c = Db({AS.VB_KEY: {"vertragsstrafe": "keine"}, AS.BUERO_KEY: {"bindefrist_wochen": "4 Wochen nach Abgabe", "abgabe": "2026-01-01"}},
           {"lv_vb_vertragsstrafe": "0,2 % je Werktag", "lv_abgabe": "2026-12-11"})
    W, Q, G = E.aufloesen(c, _lv())
    gleich((W["vb_vertragsstrafe"], Q["vb_vertragsstrafe"]), ("0,2 % je Werktag", "projekt"), "Projekt vor Büro")
    gleich((W["vb_gewaehrleistung"], Q["vb_gewaehrleistung"]), ("5 Jahre", "buero"), "ohne Projektangabe: Büro (ab Werk)")
    gleich((W["abgabe"], Q["abgabe"]), ("2026-12-11", "projekt"), "Abgabe als Vorschlag vom Projekt")
    gleich((W["bindefrist"], Q["bindefrist"]), ("2027-01-08", "gerechnet"), "Bindefrist: 4 Wochen nach Abgabe")
    c = Db({AS.BUERO_KEY: {"abgabe": "2026-01-01"}})
    pruefe("abgabe" not in E.aufloesen(c, _lv())[0], "Abgabe kommt nie vom Büro")


def test_eigener_wert_und_gleich():
    c = Db({}, {"lv_vb_vertragsstrafe": "keine"})
    W, Q, _ = E.aufloesen(c, _lv({"vb_vertragsstrafe": "0,3 %", "vb_einbehalt_abl": False}))
    gleich((W["vb_vertragsstrafe"], Q["vb_vertragsstrafe"], W["vb_einbehalt_abl"], Q["vb_einbehalt_abl"]), ("0,3 %", "lv", False, "lv"), "eigene Werte, auch Häkchen aus")
    weg = E.wie_geerbt(c, _lv(), {"vb_vertragsstrafe": "keine", "vb_gewaehrleistung": "5 Jahre", "gewerk": "Rohbau", "vb_erfuellung": "10 %"})
    gleich(sorted(weg), ["vb_gewaehrleistung", "vb_vertragsstrafe"], "was dem geerbten Wert gleicht, wird nicht gespeichert")
    W, Q, _ = E.aufloesen(c, _lv({"vb_vertragsstrafe": ""}))
    gleich(Q["vb_vertragsstrafe"], "projekt", "leeres Feld erbt")


def test_auftrag_haelt_fest():
    c = Db({}, {"lv_vb_vertragsstrafe": "keine"})
    V = {"bieter": "Bau GmbH", "angebot_id": 5}
    W, Q, _ = E.aufloesen(c, _lv(vergabe=V))
    gleich((W["vb_vertragsstrafe"], Q["vb_vertragsstrafe"], len(c.geschrieben)), ("keine", "auftrag", 1), "bei der Vergabe festgehalten")
    V2 = json.loads(c.geschrieben[0][0])
    c2 = Db({}, {"lv_vb_vertragsstrafe": "0,5 %"})
    W, Q, _ = E.aufloesen(c2, _lv(vergabe=V2))
    gleich((W["vb_vertragsstrafe"], c2.geschrieben), ("keine", []), "spätere Änderung am Projekt ändert den Auftrag nicht")
    W, _, _ = E.aufloesen(c2, _lv(vergabe={**V2, "bieter": "Andere GmbH"}))
    gleich(W["vb_vertragsstrafe"], "0,5 %", "neu vergeben: neu festgehalten")


def test_felder_der_ebenen():
    P = [k for _, F in AS.defs("projekt") for k, *_ in F]
    B = [k for _, F in AS.defs("buero") for k, *_ in F]
    pruefe(AS.REGEL in P and AS.REGEL in B and "abgabe" in P and "abgabe" not in B, "Bindefrist-Regel überall, Abgabe nur am Projekt")
    pruefe(not set(P) & set(AS.NUR_LV), "Gewerk, KG, Kostenansatz, Vergabenummer nur im LV")
    from bpcore import stammdaten
    gleich(stammdaten.PROJEKT[-1][0], "Ausschreibung (alle LVs)", "Gruppe in den Projektdaten (F1)")
