"""Firma eines Kontakts (GO 18.11.2026, Angebotsbesprechung AB-C1): Rechtsform, Sitz / Registergericht, Handelsregister, Mitarbeiter:innen
in contacts.extra.firma – Text fürs Protokoll und zurück (bpcore/contacts.py)."""
import json

from bpcore import contacts as K
from lib import gleich


class Zeile(dict):
    def keys(self):
        return super().keys()


def test_firma_text_und_zurueck():
    r = Zeile(extra=json.dumps({"firma": {"rechtsform": "GmbH", "sitz": "Essen (AG Essen)", "hrb": "HRB 4711", "mitarbeiter": "12"}}))
    F = K.firma(r)
    gleich(K.firma_text(F), "GmbH, Sitz Essen (AG Essen), HRB 4711", "Text fürs Protokoll")
    gleich(K.firma_lesen(K.firma_text(F)), {"rechtsform": "GmbH", "sitz": "Essen (AG Essen)", "hrb": "HRB 4711"}, "zurück gelesen")
    gleich(K.firma_lesen("GmbH & Co. KG; HRA 12 AG Bochum; Bochum"), {"rechtsform": "GmbH & Co. KG", "sitz": "Bochum", "hrb": "HRA 12 AG Bochum"}, "Reihenfolge egal")
    gleich(K.firma(Zeile(extra="{}")), {"rechtsform": "", "sitz": "", "hrb": "", "mitarbeiter": "", "rechnung": "", "ustid": "", "oeffentlich": "", "ap_anrede": "", "ap_titel": ""}, "ohne Angaben leer")
    gleich(K.firma_bereinigen({"rechtsform": "  GmbH  ", "x": "weg"}), {"rechtsform": "GmbH", "sitz": "", "hrb": "", "mitarbeiter": "", "rechnung": "", "ustid": "", "oeffentlich": "", "ap_anrede": "", "ap_titel": ""}, "nur bekannte Felder")
