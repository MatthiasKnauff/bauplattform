"""Rechentests des ORCA-Imports: kleines ORCA-Projekt aus Tabellenzeilen (wie sie orca_jet3 aus der *.ava liest) → orca_lesen.umsetzen
→ mit ava.rechne nachgerechnet. Sollwerte von Hand gerechnet. Läuft im Container der AVA/ORCA-Import (braucht keine Datenbank).
"""
import json, os, struct, tempfile
from datetime import datetime

import ava
import orca_jet3
import orca_lesen
from lib import gleich, pruefe


def _r(**kw):
    base = {"Nr": 1, "Level": 1, "OZ": "", "Art": "P", "Bez": "", "PosAktiv": True, "PosArt1": 0, "PosArt2": 0, "Flags": 0, "LTextID": 0, "KG": ""}
    return {**base, **kw}


def _projekt():
    """LV 01 Rohbau (Titel 01, Pos 1 Mauerwerk 100 m², Pos 2 Putz 200 m², Hinweis), zwei Bieter; Auftrag an Bieter 2 mit Nachlass 2 %,
    Nachtragsposition; Teilrechnung, Schlussrechnung, Freigabe der Sicherheit; Auftrag ohne Positionen (Gerüst); LV 02 ohne Auftrag."""
    LV = [_r(id=1, idParent=-1, Level=0, Art="0"),
          _r(id=10, idParent=1, Level=1, OZ="01", Art="1", Bez="Rohbau", LVKenn="LV"),
          _r(id=11, idParent=10, Level=2, OZ="01", Art="2", Bez="Mauerarbeiten"),
          _r(id=12, idParent=11, Level=3, OZ="1 ", Bez="Mauerwerk", Menge=100.0, Eh="m²", EP=40.0, LTextID=7),
          _r(id=13, idParent=11, Level=3, OZ="2 ", Bez="Putz", Menge=200.0, Eh="m²"),
          _r(id=14, idParent=11, Level=3, OZ="", Art="T", Bez="Hinweis zur Ausführung"),
          _r(id=20, idParent=1, Nr=2, Level=1, OZ="02", Art="1", Bez="Metallbau", LVKenn="LV"),
          _r(id=21, idParent=20, Level=2, OZ="1 ", Bez="Geländer", Menge=10.0, Eh="m")]
    Auf = [_r(id=1, idParent=-1, Level=0, Art="0"),
           _r(id=100, idParent=1, Level=1, OZ="01", Art="1", Bez="Rohbau", idLV=10, Bieter="Bau Müller GmbH", AbZuP=-2.0, VP=10700.0, NP=500.0),
           _r(id=101, idParent=100, Level=2, OZ="01", Art="2", Bez="Mauerarbeiten"),
           _r(id=102, idParent=101, Level=3, OZ="1 ", Bez="Mauerwerk", VMenge=100.0, Eh="m²", VEP=45.0, LTextID=7),
           _r(id=103, idParent=101, Level=3, OZ="2 ", Bez="Putz", VMenge=200.0, Eh="m²", VEP=25.0),
           _r(id=104, idParent=100, Nr=2, Level=2, OZ="09", Art="2", Bez="Nachtrag 1"),
           _r(id=105, idParent=104, Level=3, OZ="1 ", Bez="Zusätzliche Öffnung", VMenge=1.0, Eh="psch", VEP=500.0, Flags=4),
           _r(id=200, idParent=1, Nr=2, Level=1, OZ="07", Art="1", Bez="Gerüst", idLV=0, Bieter="Gerüstbau Ruhr", VP=3000.0)]
    E = [{"id": 1, "Art": "LV", "IDParent": 10, "Nr": 1, "Bem": "Bau Schulte", "Datum": datetime(2025, 3, 1), "Flags": 0, "GP": 12000.0, "EP": 12000.0},
         {"id": 2, "Art": "LV", "IDParent": 10, "Nr": 2, "Bem": "Müller", "Datum": datetime(2025, 3, 2), "Flags": 8, "GP": 9500.0, "EP": 9500.0},
         {"id": 3, "Art": "LV", "IDParent": 10, "Nr": -1, "EP": 1.0},   # Auswertung (Mittelwert) – wird übergangen
         {"id": 4, "Art": "LV", "IDParent": 12, "Nr": 1, "EP": 50.0}, {"id": 5, "Art": "LV", "IDParent": 13, "Nr": 1, "EP": 35.0},
         {"id": 6, "Art": "LV", "IDParent": 12, "Nr": 2, "EP": 45.0}, {"id": 7, "Art": "LV", "IDParent": 13, "Nr": 2, "EP": 25.0},
         {"id": 8, "Art": "LV", "IDParent": 20, "Nr": 1, "Bem": "Metallbau Nowak", "GP": 1500.0, "EP": 1500.0},
         {"id": 9, "Art": "LV", "IDParent": 21, "Nr": 1, "EP": 150.0}]
    Abr = [{"id": 1, "idParent": -1, "Level": 0, "idAuf": 0},
           {"id": 5, "Level": 2, "Nr": 1, "idAuf": 100, "RArt": "T", "Bez": "1. Teilrechnung", "RNr": "R-1", "RDatum": datetime(2025, 5, 2), "EDatum": datetime(2025, 5, 5),
            "Netto": 4410.0, "Netto1": 4410.0, "SEBPrz": 5.0, "Skonto": 2.0, "RBetrag": 4500.0},
           {"id": 6, "Level": 2, "Nr": 2, "idAuf": 100, "RArt": "S", "Bez": "Schlussrechnung", "RNr": "R-2", "RDatum": datetime(2025, 7, 1),
            "Netto": 9800.0, "Netto1": 9800.0, "SEBPrz": 5.0},
           {"id": 7, "Level": 2, "Nr": 3, "idAuf": 100, "RArt": "F", "Bez": "Freigabe der Sicherheit", "SEB": -583.1},
           {"id": 8, "Level": 2, "Nr": 1, "idAuf": 200, "RArt": "T", "Bez": "1. Teilrechnung", "Netto": 1000.0, "Netto1": 1000.0},
           {"id": 9, "Level": 2, "Nr": 2, "idAuf": 200, "RArt": "S", "Bez": "Schlussrechnung", "Netto": 3000.0, "Netto1": 3000.0}]
    Prf = [{"Art": "Auf", "Nr": 5, "idParent": 102, "Menge": 60.0}, {"Art": "Auf", "Nr": 5, "idParent": 103, "Menge": 72.0},
           {"Art": "Auf", "Nr": 6, "idParent": 102, "Menge": 100.0}, {"Art": "Auf", "Nr": 6, "idParent": 103, "Menge": 200.0},
           {"Art": "Auf", "Nr": 6, "idParent": 105, "Menge": 1.0}]
    lt = "Kalksandstein 17,5 cm,\tKS 12-1,8".encode("utf-16le")
    Texte = [{"ID": 7, "LT": b"\xb1\x04\x01\x00\x0e" + b"\x00" * 9 + struct.pack("<H", len(lt) // 2) + b"\x02\x00" + lt + b"\x00\x00rest", "txt4TT": "Kalksand…"}]
    Opt = [{"Key": 3, "Value": "Testprojekt"}, {"Key": 4, "Value": "T999"}, {"Key": 1021, "Value": "Bauherr e.V.,"}, {"Key": 1122, "Value": "19"}]
    return {"LV": LV, "Auf": Auf, "EPreise": E, "Abr": Abr, "AbrPrf": Prf, "Texte": Texte, "DB_Options": Opt}


def _rechne(L):
    ang = [{"id": k + 1, "preise": json.dumps(a["preise"]), "nachlass": a["nachlass"], "nachlass_eur": 0} for k, a in enumerate(L["angebote"])]
    lv = {"data": json.dumps({"items": ava.clean_items(L["items"])}), "vergabe": json.dumps(L["vergabe"])}
    re_ = [{"id": 100 + x["nr"], "nr": x["nr"], "art": x["art"], "status": x["status"], "data": json.dumps(x["data"]), "gefordert": x["gefordert"], "eingang": x["eingang"]}
           for x in L["rechnungen"]]
    return ava.rechne(lv, ang, [], re_)


def test_orca_projekt_und_lvs():
    """Projektdaten, je Auftrag ein LV, LV ohne Auftrag „nicht vergeben“, Langtext aus dem Binärformat."""
    E = orca_lesen.umsetzen(_projekt(), "T999.zip")
    gleich((E["projekt"]["nr"], E["projekt"]["name"], E["projekt"]["bauherr"]), ("T999", "Testprojekt", "Bauherr e.V."), "Projektdaten")
    L = {x["nr"]: x for x in E["lvs"]}
    gleich(sorted(L), ["01", "02", "07"], "LVs: Auftrag Rohbau, LV Metallbau ohne Auftrag, Auftrag Gerüst")
    gleich((L["01"]["status"], L["07"]["status"], L["02"]["status"]), ("abgerechnet", "abgerechnet", "nicht_vergeben"), "Stand der LVs")
    pos = [x for x in L["01"]["items"] if x["typ"] == "pos"]
    gleich([(x["oz"], x["kurz"], x["menge"]) for x in pos], [("01.1", "Mauerwerk", 100.0), ("01.2", "Putz", 200.0), ("09.1", "Zusätzliche Öffnung", 1.0)], "Positionen des Auftrags")
    gleich(pos[0]["lang"], "Kalksandstein 17,5 cm, KS 12-1,8", "Langtext aus dem formatierten ORCA-Text (Tabulator → Leerzeichen)")
    gleich((pos[2].get("nt"), pos[2].get("nt_status"), pos[2]["art"]), ("1", "beauftragt", "P"), "Nachtragsposition (Flags 4) unter „Nachtrag 1“, Einheit psch → Pauschal")
    gleich(sorted(E["firmen"]), ["Bau Müller GmbH", "Bau Schulte", "Gerüstbau Ruhr", "Metallbau Nowak", "Müller"], "Firmen aus Aufträgen und Preisspiegel")


def test_orca_angebote_vergabe():
    """Preisspiegel auf die Auftragspositionen, Vergabe mit Auftragspreisen und Nachlass, zugeschlagenes Angebot erkannt."""
    E = orca_lesen.umsetzen(_projekt())
    L = next(x for x in E["lvs"] if x["nr"] == "01")
    A = {a["bieter"]: a for a in L["angebote"]}
    gleich(sorted(A), ["Bau Schulte", "Müller"], "Bieter (Auswertungszeilen Nr < 0 übergangen)")
    gleich(A["Bau Schulte"]["preise"], {"a102": 50.0, "a103": 35.0}, "Preise Bau Schulte auf Auftragspositionen")
    V = L["vergabe"]
    gleich((V["bieter"], V["nachlass"], V["einbehalt"], V["skonto"], V["preise"]), ("Bau Müller GmbH", 2.0, 5.0, 2.0, {"a102": 45.0, "a103": 25.0, "a105": 500.0}), "Vergabe")
    gleich(L["angebote"][V["angebot_idx"]]["bieter"], "Müller", "zugeschlagenes Angebot über den Firmennamen")
    K = _rechne(L)
    # Bau Schulte 100 × 50 + 200 × 35 = 12.000; Müller 100 × 45 + 200 × 25 = 9.500
    gleich([x["summe"] for x in K["angebote"]], [12000.00, 9500.00], "Angebotssummen")
    # Auftrag 9.500 − 2 % = 9.310; Nachtrag 500 − 2 % = 490
    gleich((K["auftrag"], K["nachtraege"]["beauftragt"]), (9310.00, 490.00), "Auftrag und beauftragter Nachtrag")


def test_orca_rechnungen():
    """Teilrechnung mit Prüfstand je Position, Schlussrechnung, Freigabe der Sicherheit; Auftrag ohne Positionen mit Beträgen je Rechnung."""
    E = orca_lesen.umsetzen(_projekt())
    L = {x["nr"]: x for x in E["lvs"]}
    R = L["01"]["rechnungen"]
    gleich([(x["nr"], x["art"], x["re_nr"], x["status"]) for x in R], [(1, "abschlag", "R-1", "geprueft"), (2, "schluss", "R-2", "geprueft"), (3, "sicherheit", "", "geprueft")], "Rechnungen")
    gleich(R[0]["data"]["stand"], {"a102": 60.0, "a103": 72.0}, "Prüfstand 1. Teilrechnung")
    gleich((R[0]["datum"], R[0]["eingang"], R[0]["gefordert"], R[0]["data"]["skonto"]), ("2025-05-02", "2025-05-05", 4500.0, 2.0), "Kopf der Teilrechnung")
    gleich(R[2]["data"]["betrag"], 490.0, "Freigabe der Sicherheit: 583,10 brutto / 1,19 = 490,00 netto")
    K = _rechne(L["01"])
    x1, x2, x3 = K["rechnungen"]
    # 1. TR: 60 × 45 + 72 × 25 = 2.700 + 1.800 = 4.500 − 2 % = 4.410; 5 % Einbehalt 220,50 → 4.189,50
    gleich((x1["leistung"] - x1["nachlass"], x1["zahlung"]), (4410.00, 4189.50), "1. Teilrechnung wie in ORCA (4.410 netto)")
    # SR: 100 × 45 + 200 × 25 = 9.500 − 2 % = 9.310 (Nachtrag zählt in der Rechnung erst, wenn beauftragt – hier beauftragt: + 490) = 9.800
    gleich(round(x2["leistung"] - x2["nachlass"], 2), 9800.00, "Schlussrechnung wie in ORCA (9.800 netto)")
    gleich(x3["zahlung"], 490.00, "Freigabe der Sicherheit")
    G = _rechne(L["07"])
    gleich((L["07"]["vergabe"].get("frei"), L["07"]["vergabe"].get("ohne_lv"), G["auftrag"]), (True, True, 3000.00), "Gerüst: Auftrag ohne Angebot und LV")
    # ORCA kumuliert 1.000 / 3.000 → je Rechnung 1.000 und 2.000
    gleich([x["data"]["frei"] for x in L["07"]["rechnungen"]], [1000.0, 2000.0], "Beträge je Rechnung")
    gleich(G["abgerechnet"], 3000.00, "abgerechnet Gerüst")


def test_orca_datei_pruefung():
    """Keine Access-Datei → verständliche Meldung statt Absturz."""
    with tempfile.NamedTemporaryFile(suffix=".ava", delete=False) as f:
        f.write(b"kein ORCA" * 300)
    try:
        orca_jet3.DB(f.name)
        pruefe(False, "eine falsche Datei muss abgelehnt werden")
    except ValueError as e:
        pruefe("Standard Jet DB" in str(e), f"Meldung nennt die fehlende Kennung: {e}")
    finally:
        os.unlink(f.name)
