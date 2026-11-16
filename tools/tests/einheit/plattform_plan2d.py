"""Pläne ohne 3D-Modell (bpcore/plan2d.py, GO 16.11.2026): DXF – Räume aus geschlossenen Umrissen mit Raumstempel, Wände aus Linien je Ebene,
Fenster und Türen aus Blöcken, Zuordnung der Ebenen/Blöcke; PDF – nur Raumstempel. Testpläne erfunden."""
from bpcore import plan2d as P, planstand
from lib import gleich, pruefe


def _dxf():
    def ent(*paare):
        return "".join(f"{c}\n{v}\n" for c, v in paare)
    raum = lambda ebene, pts: ent((0, "LWPOLYLINE"), (8, ebene), (90, len(pts)), (70, 1), *[x for p in pts for x in ((10, p[0]), (20, p[1]))])   # noqa: E731
    text = lambda t, x, y: ent((0, "TEXT"), (8, "A_Text"), (10, x), (20, y), (1, t))   # noqa: E731
    E = (raum("A_Raum", [(0, 0), (5000, 0), (5000, 4000), (0, 4000)]) + text("0.01", 1000, 2000) + text("Wohnen", 1000, 1500) + text("20,00 m²", 1000, 1000)
         + raum("A_Raum", [(5000, 0), (8000, 0), (8000, 2000), (5000, 2000)]) + text("Bad", 6000, 1000)
         + ent((0, "LINE"), (8, "AW_Mauerwerk"), (10, 0), (20, 0), (11, 8000), (21, 0)) + ent((0, "LINE"), (8, "AW_Mauerwerk"), (10, 0), (20, -365), (11, 8000), (21, -365))
         + ent((0, "INSERT"), (8, "A_Fenster"), (2, "FE_100x120"), (10, 1000), (20, 0)) + ent((0, "INSERT"), (8, "A_Fenster"), (2, "FE_100x120"), (10, 3000), (20, 0))
         + ent((0, "INSERT"), (8, "A_Tuer"), (2, "Tuer_88"), (10, 5000), (20, 1000)) + ent((0, "INSERT"), (8, "Moebel"), (2, "Sofa"), (10, 500), (20, 500)))
    return ("0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n9\n$ACADVER\n1\nAC1018\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n" + E + "0\nENDSEC\n0\nEOF\n").encode("cp1252")


def test_dxf_ebenen_und_vorschlag():
    E = P.dxf_ebenen(_dxf())
    gleich({e["name"]: (e["flaechen"], e["linien"]) for e in E["ebenen"]}, {"A_Raum": (2, 0), "AW_Mauerwerk": (0, 2)}, "Ebenen mit Umrissen und Linien")
    gleich({b["name"]: b["n"] for b in E["bloecke"]}, {"FE_100x120": 2, "Tuer_88": 1, "Sofa": 1}, "Blöcke gezählt")
    gleich([P.vorschlag(n, "ebene") for n in ("A_Raum", "AW_Mauerwerk", "IW_Trockenbau", "Bemaßung")], ["raum", "wand_aussen", "wand_innen", "ignorieren"], "Ebenen raten")
    gleich([P.vorschlag(n, "block") for n in ("FE_100x120", "Tuer_88", "Sofa")], ["fenster", "tuer", "ignorieren"], "Blöcke raten")


def test_dxf_lesen():
    R = P.dxf_lesen(_dxf(), {"ebenen": {}, "bloecke": {}})
    gleich([(r["nr"], r["name"], r["flaeche"]) for r in R["raeume"]], [("0.01", "Wohnen", 20.0), ("", "Bad", 6.0)], "Räume in Metern (mm-Einheit), Stempel im Umriss")
    w = next(b for b in R["bauteile"] if b["kg"] == "331")
    gleich(w["menge"], round(8.0 * P.WANDHOEHE, 2), "Außenwand: zwei Linien à 8 m ÷ 2 × Höhe")
    gleich(sorted((b["kg"], b["menge"]) for b in R["bauteile"] if b["einheit"] == "St"), [("334", 2), ("344", 1)], "Fenster und Türen aus Blöcken, Sofa nicht")
    R2 = P.dxf_lesen(_dxf(), {"ebenen": {"AW_Mauerwerk": "ignorieren"}, "bloecke": {"FE_100x120": "ignorieren"}})
    pruefe(not any(b["kg"] in ("331", "334") for b in R2["bauteile"]), f"Zuordnung „nicht verwenden“ gilt: {R2['bauteile']}")


def test_dwg_und_binaer():
    for raw in (b"AC1032\x00\x00", b"AutoCAD Binary DXF\r\n\x1a\x00"):
        try:
            P.dxf_lesen(raw, {})
            pruefe(False, "DWG/binäres DXF müsste abgelehnt werden")
        except ValueError as e:
            pruefe("DXF" in str(e), str(e))
    try:
        planstand.dateiart("plan.dwg", b"AC1032")
        pruefe(False, "DWG")
    except ValueError as e:
        pruefe("geschlossenes Format" in str(e), str(e))


def test_pdf_raumstempel():
    import io
    from reportlab.pdfgen import canvas
    b = io.BytesIO()
    c = canvas.Canvas(b)
    for x, y, nr, nm, fl in ((100, 700, "1.01", "Eltern", "20,09"), (300, 700, "1.02", "Kind 1", "19,04")):
        c.drawString(x, y, nr); c.drawString(x, y - 14, nm); c.drawString(x, y - 28, f"{fl} m²")
    c.drawString(100, 400, "Maßstab 1:100")
    c.save()
    R = P.pdf_lesen(b.getvalue())
    gleich([(r["nr"], r["name"], r["flaeche"]) for r in R["raeume"]], [("1.01", "Eltern", 20.09), ("1.02", "Kind 1", 19.04)], "Raumstempel aus dem PDF")
    gleich(R["bauteile"], [], "PDF: keine Bauteile")
    gleich(planstand.dateiart("plan.pdf", b"%PDF-1.4"), "pdf", "Dateiart PDF")
