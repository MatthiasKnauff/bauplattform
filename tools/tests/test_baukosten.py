"""Ablauftests Kosten (Entwurf „Kosten aus Bauteilen“, 16.11.2026): Kosten = Bauteile × Preis.
Bauteile kommen aus der Checkliste im Projektmodell (hier: Zeile von Hand mit Aufbau aus dem Baukasten), die Kostenermittlung übernimmt
sie, Preise lassen sich überschreiben, Zuschläge, Genauigkeit, Versionen, Verlauf, Mittelabfluss, Rechte.
Jeder Test räumt seine Zeilen und Kostenermittlungen wieder ab."""
import urllib.parse
from lib import finde, gleich, pruefe

BK = "/baukosten/api"


def _neu(ctx, client=None, **felder):
    c = client or ctx.admin
    b = {"name": ctx.name("BK"), "project_id": ctx.pid}
    b.update(felder)
    return c.pj(f"{BK}/bk", b)


def _weg(ctx, bid):
    r = ctx.admin.delete(f"{BK}/bk/{bid}", expect=None)
    if r.status == 200 and isinstance(r.json.get("papierkorb"), int):
        ctx.admin.post(f"{BK}/bp/papierkorb/loeschen", {"ids": [r.json["papierkorb"]]}, expect=None)


def _zeile(ctx, menge=100, vorlage="345.09"):
    """Zeile von Hand in der Checkliste des Testprojekts mit Aufbau aus dem Baukasten → id."""
    c, m = ctx.admin, f"{BK}/bp/modell/{ctx.pid}/bauteile"
    name = ctx.name("Wand streichen")
    d = c.pj(f"{m}/hand", {"name": name})
    z = finde(d["modell"]["bauteilliste"]["zeilen"], name=name)
    pruefe(z and z["bereich"] == "hand" and z["status"] == "neu" and z["berechnen"], f"Zeile von Hand: {z}")
    d = c.pj(f"{m}/zeile", {"id": z["id"], "vorlage": vorlage, "menge": menge})
    z = finde(d["modell"]["bauteilliste"]["zeilen"], id=z["id"])
    gleich((z["vorlage"], z["menge"], z["kg"]), (vorlage, menge, vorlage[:3]), "Aufbau und Menge")
    return z["id"]


def _zeile_weg(ctx, zid):
    ctx.admin.post(f"{BK}/bp/modell/{ctx.pid}/bauteile/zeile", {"id": zid, "loeschen": True}, expect=None)


def test_kosten_aus_bauteilen(ctx):
    """Bauteil aus dem Projektmodell übernehmen, Betrag = Menge × Preis aus dem Baukasten, Preis überschreiben, Zuschläge, Genauigkeit."""
    c = ctx.admin
    c.post(f"{BK}/bk", {}, expect=400)
    c.get(f"{BK}/bk/999999999", expect=404)
    bk = _neu(ctx)
    zid = None
    try:
        zid = _zeile(ctx)
        bk = c.gj(f"{BK}/bk/{bk['id']}")
        pruefe(bk["modell"]["neu"], "Projektmodell geändert – muss die Kostenermittlung anzeigen")
        bk = c.pj(f"{BK}/bk/{bk['id']}/uebernehmen", {})
        pruefe(not bk["modell"]["neu"], "nach dem Übernehmen kein Hinweis mehr")
        z = finde(bk["calc"]["zeilen"], id=zid)
        pruefe(z and z["ep"] > 0 and z["ep_von"] <= z["ep"] <= z["ep_bis"], f"Preis aus dem Baukasten mit Spanne: {z}")
        gleich(z["betrag"], round(100 * z["ep"], 2), "Betrag = Menge × Preis")
        k = bk["calc"]
        gleich(round(k["kg300"] + k["kg400"], 2), k["bauwerk"], "Bauwerk = KG 300 + 400")
        pruefe(k["kg2"].get("340", {}).get("wert", 0) >= z["betrag"], f"KG 345 zählt unter 340: {k['kg2']}")
        gleich(k["risiko"], round((k["bauwerk"] + k["extra"]) * 0.10, 2), "Unvorhergesehenes 10 %")
        gleich(k["nk"], round((k["bauwerk"] + k["extra"] + k["risiko"]) * 0.20, 2), "Baunebenkosten 20 %")
        gleich(k["total"], round(k["bauwerk"] + k["extra"] + k["risiko"] + k["nk"], 2), "Summe netto")
        G = k["genau"]
        pruefe(G and G["unten"] < k["bauwerk"] + k["extra"] < G["oben"] and G["ampel"] in ("gruen", "gelb", "rot") and G["ziel"] == [20, 25], f"Genauigkeit: {G}")

        # Preis von Hand, Zuschläge ändern; Bauteile selbst lassen sich hier nicht ändern
        d = dict(bk["data"], preise={zid: 10}, risiko=0, nk_fest=5000, bauteile=[])
        bk2 = c.uj(f"{BK}/bk/{bk['id']}", {"rev": bk["rev"], "data": d})
        z2 = finde(bk2["calc"]["zeilen"], id=zid)
        gleich((z2["ep"], z2["betrag"], z2["hand"]), (10, 1000, True), "Preis von Hand")
        gleich((bk2["calc"]["risiko"], bk2["calc"]["nk"]), (0, 5000), "Zuschläge")
        gleich(len(bk2["data"]["bauteile"]), len(bk["data"]["bauteile"]), "Bauteile bleiben (kommen nur aus dem Projektmodell)")
        r = c.put(f"{BK}/bk/{bk['id']}", {"rev": bk["rev"], "data": d}, expect=409)
        pruefe(r.json.get("conflict"), "alter Änderungszähler → Konflikt")
        # Druck (16.11.2026): Bericht als PDF, alle Teile, 3. Ebene brutto gerundet
        import json as _json
        pdf = c.get(f"{BK}/bk/{bk['id']}/bericht.pdf?teile=deckblatt,zusammenfassung,din,bauteile,genauigkeit,mittelabfluss,grundlagen"
                    f"&opt.kosten={urllib.parse.quote(_json.dumps({'tiefe': '3', 'betrag': 'brutto', 'runden': '100', 'vorlaeufig': True}))}")
        pruefe(pdf.body[:5] == b"%PDF-" and len(pdf.body) > 3000, f"Bericht als PDF: {pdf.status} {pdf.body[:80]}")
        c.get(f"{BK}/bk/999999999/bericht.pdf", expect=404)
    finally:
        if zid:
            _zeile_weg(ctx, zid)
        _weg(ctx, bk["id"])


def test_version_kopie_und_verlauf(ctx):
    """Neue Version ist unabhängig; benannter Stand lässt sich wiederherstellen."""
    c = ctx.admin
    bk = _neu(ctx, stufe="schaetzung")
    ids, zid = [bk["id"]], None
    try:
        zid = _zeile(ctx, menge=50)
        bk = c.pj(f"{BK}/bk/{bk['id']}/uebernehmen", {})
        gleich(bk["calc"]["genau"]["ziel"], [30, 40], "Ziel der Kostenschätzung")
        kop = c.pj(f"{BK}/bk/{bk['id']}/kopie", {"name": ctx.name("Version")})
        ids.append(kop["id"])
        kop2 = c.uj(f"{BK}/bk/{kop['id']}", {"rev": kop["rev"], "data": dict(kop["data"], preise={zid: 1})})
        gleich(finde(kop2["calc"]["zeilen"], id=zid)["betrag"], 50, "Kopie geändert")
        orig = c.gj(f"{BK}/bk/{bk['id']}")
        gleich(finde(orig["calc"]["zeilen"], id=zid)["betrag"], finde(bk["calc"]["zeilen"], id=zid)["betrag"], "Original bleibt")

        bereich = f"bkp:{bk['id']}"
        name = ctx.name("Stand")
        v = c.pj(f"{BK}/bp/versionen", {"bereich": bereich, "name": name})
        stand = finde(v["versionen"], name=name)
        bk3 = c.uj(f"{BK}/bk/{bk['id']}", {"rev": orig["rev"], "data": dict(orig["data"], risiko=33)})
        gleich(bk3["data"]["risiko"], 33, "geändert")
        pruefe(c.pj(f"{BK}/bp/versionen/{stand['id']}/wiederherstellen", {}).get("ok"), "Wiederherstellen")
        gleich(c.gj(f"{BK}/bk/{bk['id']}")["data"]["risiko"], 10, "Stand wiederhergestellt")
    finally:
        if zid:
            _zeile_weg(ctx, zid)
        for i in ids:
            _weg(ctx, i)


def test_mittelabfluss_aus_bauzeitenplan(ctx):
    """Mittelabfluss: Kosten (Bauteile + Unvorhergesehenes) über die Termine verteilt, je Monat nach Kalendertagen."""
    c = ctx.admin
    plan = c.pj("/bauzeitenplan/api/projects", {
        "name": ctx.name("BK-Plan"),
        "tasks": [{"uid": 1, "name": "Rohbau", "dur": 20, "lvl": 1}, {"uid": 2, "name": "Ausbau", "dur": 10, "lvl": 1},
                  {"uid": 3, "name": "Abnahme", "dur": 0, "lvl": 0}],
        "sched": [{"uid": 1, "s": "2020-01-20", "f": "2020-02-08"}, {"uid": 2, "s": "2020-02-09", "f": "2020-03-09"},
                  {"uid": 3, "s": "2020-03-09", "f": "2020-03-09"}]})
    gid = plan["id"]
    bk, zid = _neu(ctx), None
    try:
        zid = _zeile(ctx)
        bk = c.pj(f"{BK}/bk/{bk['id']}/uebernehmen", {})
        bk = c.uj(f"{BK}/bk/{bk['id']}", {"rev": bk["rev"], "gantt_id": gid})
        f = c.gj(f"{BK}/bk/{bk['id']}/flow")
        pruefe(f["ok"], f"Mittelabfluss: {f}")
        k = bk["calc"]
        gleich(f["base"], round(k["bauwerk"] + k["extra"] + k["risiko"], 2), "Basis")
        gleich([t["uid"] for t in f["tasks"]], [1, 2], "ohne Meilenstein")
        gleich(finde(f["tasks"], uid=1)["pct"], 40, "Gewicht nach Kalendertagen 20 : 30")
        gleich(round(sum(m["amount"] for m in f["months"]), 2), f["base"], "Summe der Monate")
    finally:
        if zid:
            _zeile_weg(ctx, zid)
        _weg(ctx, bk["id"])
        r = c.delete(f"/bauzeitenplan/api/projects/{gid}", expect=None)
        if r.status == 200 and isinstance(r.json.get("papierkorb"), int):
            c.post(f"{BK}/bp/papierkorb/loeschen", {"ids": [r.json["papierkorb"]]}, expect=None)


def test_rechte_baukosten(ctx):
    """Kosten nur für freigeschaltete Konten: Gast 401, Bernd Krämer und Clara Wolf 403, Anna Bauer darf."""
    g = ctx.gast()
    pruefe(g.get(f"{BK}/bk", expect=401).json.get("login"), "Gast bekommt die Anmeldeadresse")
    g.post(f"{BK}/bk", {"name": "x"}, expect=401)
    for n in ("Bernd Krämer", "Clara Wolf"):
        u = ctx.anmelden(n)
        u.get(f"{BK}/bk", expect=403)
        u.post(f"{BK}/bk", {"name": ctx.name("BK")}, expect=403)
    anna = ctx.anmelden("Anna Bauer")
    anna.get(f"{BK}/bk", expect=200)
    _weg(ctx, _neu(ctx, client=anna)["id"])


def test_aus_excel(ctx):
    """Excel-Kostenberechnung (Mock XL-0 … XL-8 A, 23.11.2026): Vorschau liest nur, Übernehmen legt einen eigenen Kostenstand an –
    Summe wie die Liste, KG 700 fest, kein Unvorhergesehenes, keine Bauteile des Modells; Vorschlag 441 → 444 und „gelesen“ bleiben."""
    from einheit.xls_fiktiv import kosten
    roh = kosten()
    c = ctx.admin
    x = c.req("POST", f"{BK}/bk/excel/vorschau", dateien={"datei": ("kosten_fiktiv.xls", roh, "application/vnd.ms-excel")}).json
    gleich(x["summe"], 34000.5, "Vorschau: Summe")
    pruefe(any(b["art"] == "pruefen" and b.get("nach") == "444" for b in x["befunde"]), "Vorschau: 441 → 444")
    r = c.req("POST", f"{BK}/bk/excel/vorschau", dateien={"datei": ("x.pdf", b"%PDF-1.4", "application/pdf")}, expect=400).json
    pruefe("Excel" in r["error"], f"falsche Datei: {r}")
    s = c.pj(f"{BK}/bk/excel", {"project_id": ctx.pid, "name": ctx.name("Aus Excel"), "excel": x})
    try:
        gleich(s["calc"]["total"], 34000.5, "Stand: Summe wie die Liste")
        gleich(s["calc"]["nk"], 4000.0, "Stand: KG 700 fest")
        gleich(s["data"]["risiko"], 0, "Stand: ohne Unvorhergesehenes")
        pruefe(not s["data"]["bauteile"] and not s["modell"]["neu"], "Stand: keine Bauteile des Modells")
        pruefe(s["din"].get("741") == "Tragwerksplanung", "Namen der DIN 276 auch für 700")
        X = dict(s["data"]["excel"], gelesen=True, zeilen=[dict(z, kg="444") if z["kg"] == "441" else z for z in s["data"]["excel"]["zeilen"]])
        s2 = c.req("PUT", f"{BK}/bk/{s['id']}", {"rev": s["rev"], "data": {**s["data"], "excel": X}}).json
        pruefe(s2["data"]["excel"]["gelesen"] and any(z["kg"] == "444" for z in s2["data"]["excel"]["zeilen"]), "Vorschlag übernommen, gelesen")
        gleich(s2["calc"]["total"], 34000.5, "Summe bleibt")
        # Stufe 2: Ausgabe im gewohnten Aufbau – PDF mit Zusammenstellung und Anhang, beide Fassungen; Excel mit Formeln
        import io
        import json as _json
        import urllib.parse
        for fas in ("2018", "2008"):
            pdf = c.get(f"{BK}/bk/{s['id']}/bericht.pdf?teile=din,zusammenstellung,aenderungen"
                        f"&opt.kosten={urllib.parse.quote(_json.dumps({'tiefe': '3', 'betrag': 'beide', 'fassung': fas, 'leer': 'null'}))}")
            pruefe(pdf.body[:5] == b"%PDF-" and len(pdf.body) > 2000, f"PDF {fas}: {pdf.status} {pdf.body[:80]}")
            x = c.get(f"{BK}/bk/{s['id']}/kosten.xlsx?fassung={fas}")
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(x.body))
            ws = wb["Kosten"]
            pruefe(fas in str(ws["A1"].value), f"Excel {fas}: Titel {ws['A1'].value}")
            werte = [ws.cell(r, 4).value for r in range(1, ws.max_row + 1)]
            pruefe(any(isinstance(v, str) and v.startswith("=SUM(") for v in werte), f"Excel {fas}: Summen als Formeln")
            pruefe("Änderungen" in wb.sheetnames, f"Excel {fas}: Blatt Änderungen")
        c.get(f"{BK}/bk/999999999/kosten.xlsx", expect=404)
    finally:
        _weg(ctx, s["id"])
