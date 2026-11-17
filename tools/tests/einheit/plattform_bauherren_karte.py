"""Bauherrenportal – Karte und Vorschaubilder je Freigabe (bpcore/bauherren_karte.py, 17.11.2026): Fotos (alle mit Vorschau), Plan (erste Seite),
Tagesbericht (bis 3 Fotos, nicht das PDF), Status für Rechnungen/Mängel, Text für Informationen; große Fotos verkleinert, HEIC & Co. → JPEG."""
import base64, io

from lib import gleich, pruefe

from bpcore import bauherren_karte as BK


def _jpg(b=800, h=600):
    from PIL import Image
    o = io.BytesIO()
    Image.new("RGB", (b, h), (120, 140, 160)).save(o, "JPEG")
    return o.getvalue()


def _pdf():
    import pypdfium2 as pdfium
    d = pdfium.PdfDocument.new()
    d.new_page(595, 842)
    o = io.BytesIO()
    d.save(o)
    return o.getvalue()


def _png_gross():
    from PIL import Image
    import os
    o = io.BytesIO()
    Image.frombytes("RGB", (1500, 1500), os.urandom(1500 * 1500 * 3)).save(o, "PNG")   # Rauschen → groß
    return o.getvalue()


def test_fotos_alle_mit_vorschau():
    d, neu = BK.karte("foto", {}, [("Decke.jpg", "image/jpeg", _jpg()), ("Bodenplatte.jpg", "image/jpeg", _jpg())])
    B = d["karte"]["bilder"]
    gleich([(b["g"], b["t"]) for b in B], [(0, "Decke"), (1, "Bodenplatte")], "je Foto eine Vorschau mit Titel")
    pruefe(all(neu[b["v"]][0].startswith("vorschau-") and neu[b["v"]][1] == "image/jpeg" for b in B), "Vorschaubilder als eigene Dateien")
    from PIL import Image
    pruefe(Image.open(io.BytesIO(neu[B[0]["v"]][2])).width <= BK.BREITE, "Vorschau klein")


def test_plan_erste_seite_und_index():
    d, neu = BK.karte("plan", {"index": "C"}, [("Grundriss EG.pdf", "application/pdf", _pdf())])
    gleich((d["karte"]["index"], len(d["karte"]["bilder"]), neu[d["karte"]["bilder"][0]["v"]][1]), ("C", 1, "image/jpeg"), "Plan: Index und Vorschau der ersten Seite")


def test_tagesbericht_fotos_nicht_pdf():
    d, neu = BK.karte("tagesbericht", {"wetter": "☁ 8 °C", "text": "Decke betoniert."}, [("Bericht.pdf", "application/pdf", _pdf())])
    gleich((d["karte"]["wetter"], d["karte"]["text"], d["karte"].get("bilder")), ("☁ 8 °C", "Decke betoniert.", None), "ohne Fotos kein Vorschaubild vom PDF")
    d, neu = BK.karte("tagesbericht", {}, [("Bericht.pdf", "application/pdf", _pdf())] + [(f"Foto {i}.jpg", "image/jpeg", _jpg()) for i in range(5)])
    gleich([b["g"] for b in d["karte"]["bilder"]], [1, 2, 3], "bis zu 3 Fotos")


def test_status_und_info():
    d, _ = BK.karte("maengel", {"status": {"text": "offen mit Frist", "ton": "offen", "frist": "2026-11-30"}}, None)
    gleich(d["karte"]["status"], {"text": "offen mit Frist", "ton": "offen", "frist": "2026-11-30"}, "Mangel mit Frist")
    d, _ = BK.karte("rechnung", {"status": {"text": "bezahlt", "ton": "quatsch"}}, None)
    gleich(d["karte"]["status"]["ton"], "offen", "unbekannter Ton → offen")
    lang = "Satz. " * 300
    gleich(len(BK.karte("info", {"text": lang}, None)[0]["karte"]["text"]), len(lang.strip()), "Information: ganzer Text")
    gleich(len(BK.karte("plan", {"text": lang}, None)[0]["karte"]["text"]), 400, "sonst gekürzt")


def test_data_bilder_und_grosse_fotos():
    src = "data:image/jpeg;base64," + base64.b64encode(_jpg()).decode()
    d, neu = BK.karte("foto", {"bilder": [{"src": src, "titel": "Ansicht"}]}, None)
    pruefe("bilder" not in d and neu[0][1] == "image/jpeg" and d["karte"]["bilder"][0]["g"] == 0, "data:-Fotos werden Dateien")
    g = _png_gross()
    pruefe(len(g) > 1_500_000, "Testbild groß genug")
    d, neu = BK.karte("foto", {}, [("Riss.png", "image/png", g)])
    gleich((neu[0][0], neu[0][1]), ("Riss.jpg", "image/jpeg"), "großes Foto → JPEG")
    d, neu = BK.karte("foto", {}, [("vorschau-0.jpg", "image/jpeg", _jpg()), ("A.jpg", "image/jpeg", _jpg())])
    gleich([n for n, _, _ in neu if not n.startswith("vorschau-")], ["A.jpg"], "alte Vorschaubilder fallen weg")
