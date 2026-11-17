"""Pläne & Dateien: Ordnervorschlag für hereingezogene Dateien (Plannummer, Kennung/Phase, Ordnername und Gewerk im Plankopf)."""
import plaene
from bpcore import planname
from lib import gleich, pruefe

CF = {**planname.STANDARD}
DATEIEN = [
    {"name": "A481 2.5.1.10 INDEX A Grundriss EG.pdf", "ordner": "A481 9. Pläne/Ausführung/Architektur"},
    {"name": "A481 2.5.1.11 Grundriss OG.pdf", "ordner": "A481 9. Pläne/Ausführung/Architektur"},
    {"name": "A481 ELT 2.5.1.10 Elektro EG.pdf", "ordner": "A481 9. Pläne/Fachplaner/Elektro"},
]
ORDNER = ["A481 9. Pläne", "A481 9. Pläne/Ausführung", "A481 9. Pläne/Ausführung/Architektur", "A481 9. Pläne/Fachplaner", "A481 9. Pläne/Fachplaner/Elektro",
          "A481 9. Pläne/Fachplaner/Statik"]


def test_gleicher_plan_zuerst():
    v, nr = plaene.ablage_vorschlaege("A481 2.5.1.10 INDEX B Grundriss EG.pdf", "", DATEIEN, ORDNER, CF)
    gleich(nr, "2.5.1.10", "Plannummer erkannt")
    gleich(v[0]["pfad"], "A481 9. Pläne/Ausführung/Architektur", "neuer Index dorthin, wo die alten liegen")
    pruefe("Plan" in v[0]["grund"], "Grund wird genannt")


def test_ordnername_im_plankopf():
    v, _ = plaene.ablage_vorschlaege("Scan 0457.pdf", "Tragwerksplanung\nStatik Positionsplan Decke über EG", DATEIEN, ORDNER, CF)
    pruefe(v and v[0]["pfad"].endswith("Statik"), f"Ordner „Statik“ aus dem Plankopf: {v}")


def test_ohne_treffer_leer():
    v, nr = plaene.ablage_vorschlaege("foto.jpg", "", DATEIEN, ORDNER, CF)
    gleich((v, nr), ([], ""), "nichts erkannt")


def test_namen_vorschlag():
    from datetime import date
    from bpcore import ablage
    n = ablage.namen("Scan_20261111_0932.pdf", "Nachforderung Bauantrag Brandschutz\nEssen, 10.03.2026", "A481", date(2026, 11, 11))
    gleich(n[0], "A481 Nachforderung Bauantrag Brandschutz 10.03.2026.pdf", "Scannername → Titel aus dem PDF mit Datum")
    gleich(n[-1], "Scan_20261111_0932.pdf", "ursprünglicher Name bleibt wählbar")
    gleich(ablage.namen("Grundriss EG_Index B.pdf", "", "A481")[0], "A481 Grundriss EG Index B.pdf", "Kürzel vorne, Unterstriche raus")
    gleich(ablage.namen("A481 Statik.pdf", "", "A481"), ["A481 Statik.pdf"], "schon richtig benannt")


def test_art_des_dokuments_vor_einzelnen_worten():
    """Ein Tagesbericht gehört zum Bautagebuch – auch wenn im Text „Außenanlagen“ steht und es einen Ordner „Angebote Außenanlagen“ gibt (17.11.2026)."""
    from bpcore import ablage
    O = ["A481 2. Ausschreibung/A481 Angebote/A481 Angebote Außenanlagen", "A481 6. Bautagebuch", "A481 6. Bautagebuch/Fotos", "A481 4. Protokolle"]
    v, _ = ablage.vorschlaege("Tagesbericht Nr. 4.pdf", "BAUTAGEBUCH\nBauvorhaben A481 Tierheim\nAußenanlagen: Zaun gesetzt", [], O, CF)
    gleich(v[0]["pfad"], "A481 6. Bautagebuch", f"Bautagebuch zuerst: {v}")
    gleich(v[0]["grund"], "Dokument: Bautagebuch", "Grund")
    v, _ = ablage.vorschlaege("A481_BT_2026-11-16.pdf", "BAUTAGEBUCH\nBAUVORHABEN A481", [], O, CF)
    gleich(v[0]["pfad"], "A481 6. Bautagebuch", "auch am Text erkannt")
    gleich(ablage.art("Scan 0457.pdf", "Protokoll der Baubesprechung Nr. 3")[0], "Protokoll", "Überschrift im Text")
