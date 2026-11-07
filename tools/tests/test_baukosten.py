"""Ablauftests Baukosten: Kostenermittlung nach DIN 276 anlegen, rechnen, Versionen, Kennwerte, Vergleich,
Mittelabfluss aus dem Bauzeitenplan, PDF-Paket in verschiedenen Gliederungstiefen, Datenlage je Stufe, Rechte.

Alle Beträge netto. Erwartete Zahlen sind von Hand aus der Rechenregel ermittelt (siehe Kommentare).
Jeder Test legt eigene Kostenermittlungen an (Name über ctx.name) und räumt sie wieder ab (Papierkorb, dann endgültig).
"""
import copy
import re

from lib import finde, gleich, pruefe

BK = "/baukosten/api"
TYP = "rt_test"   # eigener Raumtyp nur dieser Kostenermittlung – unabhängig von den Kennwerten des Büros


# ---------------------------------------------------------------- Hilfen
def _neu(ctx, client=None, **felder):
    c = client or ctx.admin
    b = {"name": ctx.name("BK"), "project_id": ctx.pid}
    b.update(felder)
    return c.pj(f"{BK}/bk", b)


def _weg(ctx, bid):
    """Kostenermittlung in den Papierkorb legen und dort endgültig löschen (Testdaten nicht liegen lassen)."""
    r = ctx.admin.delete(f"{BK}/bk/{bid}", expect=None)
    if r.status == 200 and isinstance(r.json.get("papierkorb"), int):
        ctx.admin.post(f"{BK}/bp/papierkorb/loeschen", {"ids": [r.json["papierkorb"]]}, expect=None)


def _daten(bk, label="RT-Typ", kw=2000.0, raeume=None, **aend):
    """Daten der Kostenermittlung mit eigenem Raumtyp und Raumbuch (alle Räume bestätigt, zwei Geschosse)."""
    d = copy.deepcopy(bk["data"])
    d["types"][TYP] = {"label": label, "kw": kw}
    d["rooms"] = raeume if raeume is not None else [
        {"id": "r1", "nr": "0.01", "name": "Büro 1", "area": 60, "typ": TYP, "ok": True, "floor": "Erdgeschoss"},
        {"id": "r2", "nr": "1.01", "name": "Büro 2", "area": 40, "typ": TYP, "ok": True, "floor": "Obergeschoss"}]
    d.update(aend)
    return d


def _speichern(c, bk, data=None, **extra):
    b = {"rev": bk["rev"], **extra}
    if data is not None:
        b["data"] = data
    return c.uj(f"{BK}/bk/{bk['id']}", b)


def _norm(s):   # wie die App: Bezeichnung → Schlüssel der Auswertung
    return re.sub(r"[^a-z0-9äöüß]+", " ", (s or "").lower()).strip()


# ---------------------------------------------------------------- Tests
def test_kostenermittlung_anlegen_rechnen_bearbeiten(ctx):
    """Kostenermittlung zum Testprojekt anlegen, Positionen in DIN-276-Gruppen eintragen, ändern, löschen, Konflikt erkennen."""
    c = ctx.admin
    pruefe(c.post(f"{BK}/bk", {}, expect=400).json.get("error"), "ohne Namen und Projekt muss es eine Fehlermeldung geben")
    c.get(f"{BK}/bk/999999999", expect=404)
    bk = _neu(ctx)
    try:
        gleich(bk["project_id"], ctx.pid, "Projekt verknüpft")
        gleich((bk.get("project") or {}).get("name"), ctx.projekte[0]["name"], "Projektname")
        gleich(bk["stufe"], "schaetzung", "Standardstufe")
        gleich([i["kg"] for i in bk["data"]["items"]], ["200", "394", "500"], "Vorgabe-Positionen")
        pruefe(all(i["amount"] is None for i in bk["data"]["items"]), "Vorgabe-Positionen sind noch offen")
        gleich(bk["calc"]["total"], 0, "ohne Räume keine Kosten")
        pruefe(finde(c.gj(f"{BK}/bk"), id=bk["id"]), "neue Kostenermittlung fehlt in der Liste")

        # 100 m² × 2.000 €/m² = 200.000 € Bauwerk; KG 300/400 = 65/35 %
        items = [{"kg": "210", "name": "Herrichten", "amount": 6000},
                 {"kg": "394", "name": "Rückbau", "amount": 1234.567},
                 {"kg": "500", "name": "Außenanlagen", "amount": 20000}]
        neu = _speichern(c, bk, _daten(bk, items=items, nk=20, kg={"300": 65}))
        gleich(neu["rev"], bk["rev"] + 1, "Änderungszähler")
        k = neu["calc"]
        gleich(neu["data"]["items"][1]["amount"], 1234.57, "Betrag auf Cent gerundet")
        gleich(neu["data"]["kg"]["400"], 35, "KG 400 = 100 − KG 300")
        gleich(k["area"], 100, "Fläche")
        gleich(k["bauwerk"], 200000, "Bauwerk")
        gleich(k["kg300"], 130000, "KG 300")
        gleich(k["kg400"], 70000, "KG 400")
        gleich(k["extra"], 27234.57, "weitere Kostengruppen 6.000 + 1.234,57 + 20.000")
        gleich(k["nk"], 45446.91, "KG 700 = 20 % von 227.234,57")
        gleich(k["total"], 272681.48, "Gesamt = 200.000 + 27.234,57 + 45.446,914")
        gleich(k["kw"], 2000, "Kennwert je m²")

        # bearbeiten: Außenanlagen 25.000 €, Rückbau gelöscht → 6.000 + 25.000 = 31.000; KG 700 = 20 % von 231.000 = 46.200
        items2 = [{"kg": "210", "name": "Herrichten", "amount": 6000}, {"kg": "500", "name": "Außenanlagen", "amount": 25000}]
        neu2 = _speichern(c, neu, _daten(neu, items=items2))
        gleich(len(neu2["data"]["items"]), 2, "Position gelöscht")
        gleich(neu2["calc"]["extra"], 31000, "weitere Kostengruppen nach Änderung")
        gleich(neu2["calc"]["nk"], 46200, "KG 700 nach Änderung")
        gleich(neu2["calc"]["total"], 277200, "Gesamt nach Änderung")
        gleich(c.gj(f"{BK}/bk/{bk['id']}")["calc"]["total"], 277200, "gespeichert und neu gelesen")

        # veralteter Änderungszähler → Konflikt statt Überschreiben
        a = c.put(f"{BK}/bk/{bk['id']}", {"rev": neu["rev"], "data": _daten(neu, items=[])}, expect=409)
        pruefe(a.json.get("conflict") is True, "Konflikt muss gemeldet werden")
        gleich(c.gj(f"{BK}/bk/{bk['id']}")["calc"]["total"], 277200, "Konflikt darf nichts ändern")
    finally:
        _weg(ctx, bk["id"])
    ctx.admin.get(f"{BK}/bk/{bk['id']}", expect=404)


def test_version_als_kopie_unabhaengig(ctx):
    """Neue Version (Kopie unter eigenem Namen) ist unabhängig: Änderungen an der Kopie lassen das Original unverändert."""
    c = ctx.admin
    bk = _neu(ctx, stufe="berechnung")
    ids = [bk["id"]]
    try:
        bk = _speichern(c, bk, _daten(bk))
        gleich(bk["calc"]["bauwerk"], 200000, "Original vorher")
        c.post(f"{BK}/bk/{bk['id']}/kopie", {}, expect=400)
        name = ctx.name("Version")
        kop = c.pj(f"{BK}/bk/{bk['id']}/kopie", {"name": name})
        ids.append(kop["id"])
        pruefe(kop["id"] != bk["id"], "Kopie braucht eine eigene id")
        gleich(kop["name"], name, "Name der Version")
        gleich(kop["project_id"], bk["project_id"], "gleiches Projekt")
        gleich(kop["stufe"], "berechnung", "gleiche Stufe")
        gleich(kop["data"]["rooms"], bk["data"]["rooms"], "gleiches Raumbuch")
        gleich(kop["calc"]["total"], bk["calc"]["total"], "gleiche Summe")

        # Kopie ändern: Büro 1 nur noch 10 m² → 50 m² × 2.000 = 100.000 € Bauwerk
        rooms = copy.deepcopy(kop["data"]["rooms"])
        rooms[0]["area"] = 10
        kop2 = _speichern(c, kop, _daten(kop, raeume=rooms))
        gleich(kop2["calc"]["bauwerk"], 100000, "Kopie geändert")
        orig = c.gj(f"{BK}/bk/{bk['id']}")
        gleich(orig["calc"]["bauwerk"], 200000, "Original bleibt unverändert")
        gleich(orig["data"]["rooms"][0]["area"], 60, "Raumfläche im Original")
        liste = c.gj(f"{BK}/bk")
        gleich((finde(liste, id=kop["id"]) or {}).get("total"), kop2["calc"]["total"], "Summe der Kopie in der Liste")
        gleich((finde(liste, id=bk["id"]) or {}).get("total"), orig["calc"]["total"], "Summe des Originals in der Liste")
    finally:
        for i in ids:
            _weg(ctx, i)


def test_benannter_stand_wiederherstellen(ctx):
    """Benannten Stand einer Kostenermittlung festhalten, weiter ändern und den Stand wiederherstellen."""
    c = ctx.admin
    bk = _neu(ctx)
    bereich = f"bkp:{bk['id']}"
    try:
        bk = _speichern(c, bk, _daten(bk))
        gleich(bk["calc"]["bauwerk"], 200000, "Stand A")
        c.post(f"{BK}/bp/versionen", {"bereich": bereich, "name": ""}, expect=400)
        name = ctx.name("Stand")
        v = c.pj(f"{BK}/bp/versionen", {"bereich": bereich, "name": name})
        gleich(v["bereich"], bereich, "Bereich")
        stand = finde(v["versionen"], name=name)
        pruefe(stand and stand["art"] == "benannt", f"benannter Stand fehlt: {v['versionen']}")

        rooms = copy.deepcopy(bk["data"]["rooms"])
        rooms[1]["area"] = 140   # 200 m² × 2.000 = 400.000 €
        bk2 = _speichern(c, bk, _daten(bk, raeume=rooms))
        gleich(bk2["calc"]["bauwerk"], 400000, "Stand B")
        vgl = c.gj(f"{BK}/bp/versionen/{stand['id']}/vergleich")
        pruefe(vgl.get("aenderungen") and vgl["aenderungen"] != ["entspricht dem jetzigen Stand"], "Vergleich muss Unterschiede zeigen")

        w = c.pj(f"{BK}/bp/versionen/{stand['id']}/wiederherstellen", {})
        pruefe(w.get("ok"), "Wiederherstellen fehlgeschlagen")
        zur = c.gj(f"{BK}/bk/{bk['id']}")
        gleich(zur["calc"]["bauwerk"], 200000, "Stand A wiederhergestellt")
        gleich(zur["data"]["rooms"][1]["area"], 40, "Raumfläche wiederhergestellt")
        pruefe(zur["rev"] > bk2["rev"], "Wiederherstellen zählt als Änderung")
        pruefe(finde(c.gj(f"{BK}/bp/versionen?bereich={bereich}")["versionen"], name=name), "benannter Stand bleibt erhalten")
    finally:
        _weg(ctx, bk["id"])


def test_kennwerte_speichern_und_zuruecksetzen(ctx):
    """Kennwerte je Raumtyp lesen und speichern (Roundtrip), neue Kostenermittlungen übernehmen sie, alte behalten ihre Werte."""
    c = ctx.admin
    alt = c.gj(f"{BK}/kennwerte")
    pruefe(alt["raumtypen"] and finde(alt["raumtypen"], key="sonst"), "Raumtyp „Sonstige Räume“ muss es immer geben")
    gleich(finde(alt["standard"], key="sanitaer")["kw"], 2600, "Beispielwert Bad / WC / Umkleiden")
    gleich(len(alt["standard"]), 9, "neun vorgegebene Raumtypen")
    vorher = _neu(ctx)
    ids = [vorher["id"]]
    erster = alt["raumtypen"][0]
    lab = ctx.name("Labor")
    try:
        liste = [{k: t[k] for k in ("key", "label", "kw", "worte")} for t in alt["raumtypen"]]
        liste[0]["kw"] = 1777
        liste.append({"key": "", "label": lab, "kw": "3.100", "worte": "Labor, Prüfraum"})
        r = c.uj(f"{BK}/kennwerte", {"raumtypen": liste})
        mein = finde(r["raumtypen"], label=lab)
        pruefe(mein, "neuer Raumtyp fehlt")
        gleich(mein["kw"], 3100, "„3.100“ wird als 3.100 €/m² gelesen")
        gleich(mein["worte"], "labor, prüfraum", "Suchwörter klein geschrieben")
        gleich(mein["beispiel"], None, "eigener Raumtyp hat keinen Beispielwert")
        pruefe(re.fullmatch(r"[a-z0-9_]{1,40}", mein["key"]), f"Schlüssel ungültig: {mein['key']!r}")
        gleich(finde(r["raumtypen"], key=erster["key"])["kw"], 1777, "geänderter Kennwert")
        wieder = c.gj(f"{BK}/kennwerte")   # Roundtrip
        gleich(finde(wieder["raumtypen"], label=lab)["kw"], 3100, "nach erneutem Lesen")
        gleich(finde(wieder["raumtypen"], key=erster["key"])["kw"], 1777, "nach erneutem Lesen")

        # nur Kennwerte („als eigene Kennwerte speichern“): übrige Raumtypen bleiben
        r2 = c.uj(f"{BK}/kennwerte", {erster["key"]: 1888})
        gleich(finde(r2["raumtypen"], key=erster["key"])["kw"], 1888, "Kennwert allein gespeichert")
        gleich(finde(r2["raumtypen"], label=lab)["kw"], 3100, "eigener Raumtyp bleibt")

        neu = _neu(ctx)
        ids.append(neu["id"])
        gleich(neu["data"]["types"][erster["key"]]["kw"], 1888, "neue Kostenermittlung nimmt den Bürokennwert")
        gleich(neu["data"]["types"][mein["key"]]["kw"], 3100, "neue Kostenermittlung kennt den neuen Raumtyp")
        gleich(c.gj(f"{BK}/bk/{vorher['id']}")["data"]["types"][erster["key"]]["kw"], erster["kw"], "bestehende Kostenermittlung behält ihren Kennwert")
    finally:
        c.put(f"{BK}/kennwerte", {"raumtypen": [{k: t[k] for k in ("key", "label", "kw", "worte")} for t in alt["raumtypen"]]}, expect=None)
        for i in ids:
            _weg(ctx, i)
    zurueck = c.gj(f"{BK}/kennwerte")["raumtypen"]
    gleich([(t["key"], t["kw"]) for t in zurueck], [(t["key"], t["kw"]) for t in alt["raumtypen"]], "Kennwerte des Büros zurückgesetzt")


def test_vergleichsobjekt_speichern_und_auswerten(ctx):
    """Kostenermittlung als Vergleichsobjekt speichern (Kennwert nach Justage), Auswertung je Raumtyp, ersetzen, entfernen."""
    c = ctx.admin
    bk = _neu(ctx)
    oid = f"bk{bk['id']}"
    try:
        c.post(f"{BK}/bk/{bk['id']}/vergleich", {}, expect=400)   # ohne Flächen und Kosten
        lab = ctx.name("Vgl")
        # 100 m² × 1.800 €/m² × Regionalfaktor 110 % = 198.000 €; Kennwert nach Justage 1.980 €/m²
        bk = _speichern(c, bk, _daten(bk, label=lab, kw=1800, justage={"region": 110, "preis": 100}))
        gleich(bk["calc"]["justage"]["faktor"], 1.1, "Justage-Faktor")
        gleich(bk["calc"]["bauwerk"], 198000, "Bauwerk mit Regionalfaktor")
        r = c.pj(f"{BK}/bk/{bk['id']}/vergleich", {})
        o = finde(r["objekte"], id=oid)
        pruefe(o, "Vergleichsobjekt fehlt")
        gleich(o["art"], "eigen", "Art")
        gleich(o["flaeche"], 100, "Fläche")
        gleich(o["bauwerk"], 198000, "Bauwerk")
        gleich(o["kw"], 1980, "Kennwert Bauwerk")
        gleich(o["types"].get(lab), 1980, "Kennwert des Raumtyps nach Justage")
        gleich(o["region"], 110, "Regionalfaktor")
        gleich(o["stufe"], "Kostenschätzung", "Stufe in Worten")
        pruefe(r.get("hinweis"), "Hinweis auf die Kostenfeststellung erwartet")
        a = r["auswertung"].get(_norm(lab))
        pruefe(a, "Auswertung je Raumtyp fehlt")
        gleich(a["n"], 1, "Anzahl"); gleich(a["mittel"], 1980, "Mittelwert"); gleich(a["min"], 1980, "kleinster Wert"); gleich(a["max"], 1980, "größter Wert")

        r2 = c.pj(f"{BK}/bk/{bk['id']}/vergleich", {})   # erneut speichern ersetzt den Eintrag
        gleich(sum(1 for x in r2["objekte"] if x.get("id") == oid), 1, "Eintrag ersetzt statt doppelt")
        pruefe(finde(c.gj(f"{BK}/vergleich")["objekte"], id=oid), "Vergleichsobjekt in der Liste")
    finally:
        r3 = c.delete(f"{BK}/vergleich/{oid}", expect=None)
        _weg(ctx, bk["id"])
    pruefe(r3.status == 200 and not finde(r3.json["objekte"], id=oid), "Vergleichsobjekt nicht entfernt")


def test_mittelabfluss_aus_bauzeitenplan(ctx):
    """Mittelabfluss: Kosten über die Termine eines Bauzeitenplans verteilt, je Monat nach Kalendertagen, mit eigenen Anteilen."""
    c = ctx.admin
    plan = c.pj("/bauzeitenplan/api/projects", {
        "name": ctx.name("BK-Plan"),
        "tasks": [{"uid": 1, "name": "Rohbau", "dur": 20, "lvl": 1}, {"uid": 2, "name": "Ausbau", "dur": 10, "lvl": 1},
                  {"uid": 3, "name": "Abnahme", "dur": 0, "lvl": 0}, {"uid": 4, "name": "Gruppe", "dur": 5, "lvl": 0}],
        "sched": [{"uid": 1, "s": "2020-01-20", "f": "2020-02-08"},    # 20 Kalendertage: 12 im Januar, 8 im Februar
                  {"uid": 2, "s": "2020-02-09", "f": "2020-03-09"},    # 30 Kalendertage: 21 im Februar (Schaltjahr), 9 im März
                  {"uid": 3, "s": "2020-03-09", "f": "2020-03-09"},    # Meilenstein: keine Kosten
                  {"uid": 4, "s": "2020-01-20", "f": "2020-03-09", "g": 1}]})   # Gruppe: keine Kosten
    gid = plan["id"]
    bk = _neu(ctx)
    try:
        f0 = c.gj(f"{BK}/bk/{bk['id']}/flow")
        pruefe(f0["ok"] is False and "Kein Bauzeitenplan" in f0["why"], f"ohne Plan: {f0}")
        # Basis = Bauwerk 100 m² × 1.000 €/m² + Außenanlagen 20.000 € = 120.000 € (ohne Baunebenkosten)
        d = _daten(bk, kw=1000, items=[{"kg": "500", "name": "Außenanlagen", "amount": 20000}])
        bk = _speichern(c, bk, d, gantt_id=gid)
        gleich(bk["gantt_id"], gid, "Plan verknüpft")
        f = c.gj(f"{BK}/bk/{bk['id']}/flow")
        pruefe(f["ok"], f"Mittelabfluss nicht berechnet: {f}")
        gleich(f["base"], 120000, "Basis")
        gleich(f["start"], "2020-01-20", "Beginn"); gleich(f["end"], "2020-03-09", "Ende")
        gleich([t["uid"] for t in f["tasks"]], [1, 2], "nur Leistungen mit Dauer, ohne Gruppe und Meilenstein")
        # Gewicht = Kalendertage 20 : 30 → 48.000 / 72.000 €, je 2.400 € pro Tag
        gleich(finde(f["tasks"], uid=1)["amount"], 48000, "Rohbau"); gleich(finde(f["tasks"], uid=1)["pct"], 40, "Anteil Rohbau")
        gleich(finde(f["tasks"], uid=2)["amount"], 72000, "Ausbau")
        gleich([m["ym"] for m in f["months"]], ["2020-01", "2020-02", "2020-03"], "Monate")
        gleich([m["amount"] for m in f["months"]], [28800, 69600, 21600], "Januar 12 × 2.400, Februar 8 × 2.400 + 21 × 2.400, März 9 × 2.400")
        gleich([m["idx"] for m in f["months"]], [28800, 69600, 21600], "vergangene Monate ohne Preissteigerung")
        gleich([m["cum"] for m in f["months"]], [28800, 98400, 120000], "kumuliert")
        gleich(f["total_idx"], 120000, "Summe")

        # eigene Anteile 1 : 3 → 30.000 € (1.500 €/Tag) und 90.000 € (3.000 €/Tag)
        bk = _speichern(c, bk, dict(bk["data"], shares={"1": 1, "2": 3}))
        f2 = c.gj(f"{BK}/bk/{bk['id']}/flow")
        gleich(finde(f2["tasks"], uid=1)["amount"], 30000, "Rohbau mit eigenem Anteil")
        pruefe(finde(f2["tasks"], uid=1)["own"], "eigener Anteil markiert")
        gleich([m["amount"] for m in f2["months"]], [18000, 75000, 27000], "Januar 12 × 1.500, Februar 8 × 1.500 + 21 × 3.000, März 9 × 3.000")
        c.get(f"{BK}/bk/{bk['id']}/bericht.pdf?teile=mittelabfluss", expect=200).ist_pdf()
    finally:
        _weg(ctx, bk["id"])
        r = c.delete(f"/bauzeitenplan/api/projects/{gid}", expect=None)
        if r.status == 200 and isinstance(r.json.get("papierkorb"), int):
            c.post(f"{BK}/bp/papierkorb/loeschen", {"ids": [r.json["papierkorb"]]}, expect=None)


def test_pdf_paket_gliederungstiefen(ctx):
    """PDF für den Bauherrn in DIN-276-Tiefe 1, 2 und 3, brutto/netto, gerundet, Auswahl der Teile, vorläufig."""
    c = ctx.admin
    bk = _neu(ctx, stufe="berechnung")
    try:
        bt = [{"id": "b1", "kg": "331", "name": "Tragende Außenwände", "mat": "Kalksandstein 17,5 cm", "menge": 100, "einheit": "m²", "ep": 115}]
        items = [{"kg": "210", "name": "Herrichten", "amount": 6000}, {"kg": "500", "name": "Außenanlagen", "amount": 20000}]
        bk = _speichern(c, bk, _daten(bk, kg2={"330": 40, "340": 30, "440": 50}, bauteile=bt, items=items,
                                      risiko=5, risiko_text="Bestand", notes="Erläuterung für den Bauherrn."))
        for tiefe in (1, 2, 3):
            a = c.get(f"{BK}/bk/{bk['id']}/bericht.pdf?tiefe={tiefe}", expect=200).ist_pdf()
            pruefe("application/pdf" in a.ctype, f"Inhaltstyp {a.ctype}")
        c.get(f"{BK}/bk/{bk['id']}/bericht.pdf?tiefe=3&brutto=1&mwst=19&runden=100&teile=deckblatt,zusammenfassung,kosten", expect=200).ist_pdf()
        c.get(f"{BK}/bk/{bk['id']}/bericht.pdf?tiefe=2&brutto=0&runden=1000&vorl=1&teile=kosten,raumtypen,raumbuch,quellen", expect=200).ist_pdf()
        c.get(f"{BK}/bk/{bk['id']}/bericht.pdf?tiefe=9&teile=unbekannt", expect=200).ist_pdf()   # Tiefe begrenzt, keine Teile: leeres Blatt
        leer = _neu(ctx)   # ganz ohne Daten darf das PDF nicht scheitern
        try:
            c.get(f"{BK}/bk/{leer['id']}/bericht.pdf", expect=200).ist_pdf()
        finally:
            _weg(ctx, leer["id"])
        c.get(f"{BK}/bk/999999999/bericht.pdf", expect=404)
    finally:
        _weg(ctx, bk["id"])


def test_datenlage_je_stufe(ctx):
    """„Wofür reichen die Daten?“: zu wenig Gliederung für Kostenschätzung bzw. -berechnung wird als fehlend gemeldet."""
    c = ctx.admin
    bk = _neu(ctx, stufe="berechnung")
    try:
        bk = _speichern(c, bk, _daten(bk))   # Raumbuch ok, aber keine 2. Ebene, keine Bauteile, offene Kostengruppen
        R = bk["reife"]
        gleich([s["key"] for s in R["stufen"]], ["rahmen", "schaetzung", "berechnung", "voranschlag", "anschlag", "feststellung"], "Stufen")
        gleich(R["reicht"], "rahmen", "reicht nur für den Kostenrahmen")
        st = {s["key"]: s for s in R["stufen"]}
        pruefe(st["rahmen"]["ok"], f"Kostenrahmen müsste reichen: {st['rahmen']['fehlt']}")
        pruefe(any(f["text"] == "DIN 276: Kostenschätzung mindestens bis zur 2. Ebene" for f in st["schaetzung"]["fehlt"]),
               f"Hinweis zur 2. Ebene fehlt: {st['schaetzung']['fehlt']}")
        H = c.pj(f"{BK}/bk/{bk['id']}/check", {})["hinweise"]
        pruefe(finde(H, title="DIN 276: Kostenberechnung mindestens bis zur 2. Ebene"), "Prüfung: Hinweis zur 2. Ebene fehlt")
        pruefe(finde(H, title="DIN 276: Kostenberechnung bis zur 3. Ebene"), "Prüfung: Hinweis zur 3. Ebene fehlt")

        bk = _speichern(c, bk, dict(bk["data"], kg2={"330": 40, "340": 30, "440": 50}))
        st = {s["key"]: s for s in bk["reife"]["stufen"]}
        gleich(bk["reife"]["reicht"], "schaetzung", "mit 2. Ebene reicht es für die Kostenschätzung")
        texte = [f["text"] for f in st["berechnung"]["fehlt"]]
        pruefe("DIN 276: Kostenberechnung bis zur 3. Ebene" in texte, f"Hinweis zur 3. Ebene fehlt: {texte}")
        pruefe("KG 200 Vorbereitende Maßnahmen offen" in texte, f"offene Kostengruppe fehlt: {texte}")

        bt = [{"id": "b1", "kg": "331", "name": "Tragende Außenwände", "menge": 100, "einheit": "m²", "ep": 300}]
        items = [dict(i, amount=1000) for i in bk["data"]["items"]]
        bk = _speichern(c, bk, dict(bk["data"], bauteile=bt, items=items))
        st = {s["key"]: s for s in bk["reife"]["stufen"]}
        pruefe(st["berechnung"]["ok"], f"Kostenberechnung müsste jetzt reichen: {st['berechnung']['fehlt']}")
        pruefe(bk["reife"]["reicht"] not in ("rahmen", "schaetzung"), f"reicht: {bk['reife']['reicht']}")
        c.get(f"{BK}/bk/{bk['id']}/bericht.pdf?tiefe=3", expect=200).ist_pdf()
    finally:
        _weg(ctx, bk["id"])


def test_schaetzen_und_vorschlaege_ohne_ki(ctx):
    """Fehlende Kostengruppen mit Faustwerten schätzen und Positionen vorschlagen – ohne KI (Intern)."""
    c = ctx.admin
    bk = _neu(ctx)
    try:
        c.post(f"{BK}/bk/{bk['id']}/bauteile/vorschlag", {}, expect=400)   # ohne Räume keine Mengen
        bk = _speichern(c, bk, _daten(bk))   # Bauwerk 200.000 €, KG 200/394/500 offen
        s = c.pj(f"{BK}/bk/{bk['id']}/schaetzen", {})
        v = {x["kg"]: x for x in s["vorschlaege"] if x["src"] == "Intern"}
        gleich(sorted(v), ["200", "394", "500"], "Faustwerte für die offenen Kostengruppen (ohne KG 600)")
        # KG 200: 1 % (0,5–2,5 %), KG 394: 5 % (3–9 %), KG 500: 4 % (2–8 %) von 200.000 €
        gleich((v["200"]["value"], v["200"]["low"], v["200"]["high"]), (2000, 1000, 5000), "KG 200")
        gleich((v["394"]["value"], v["394"]["low"], v["394"]["high"]), (10000, 6000, 18000), "KG 394")
        gleich((v["500"]["value"], v["500"]["low"], v["500"]["high"]), (8000, 4000, 16000), "KG 500")
        pruefe(any(x["src"] == "Intern" for x in s["kg2"]), "Faustanteile der 2. Ebene fehlen")
        pruefe(s["acc"]["low"] <= bk["calc"]["total"] <= s["acc"]["high"], f"Spanne passt nicht zur Summe: {s['acc']}")

        p = c.pj(f"{BK}/bk/{bk['id']}/vorschlag", {"thema": "kg", "kg": "394"})
        # 5 % von 200.000 € = 10.000 €, aufgeteilt 30/30/20/20 %
        gleich([x["betrag"] for x in p["rows"]], [3000, 3000, 2000, 2000], "Unterpositionen Rückbau")
        pruefe(all(x["kg"] == "394" for x in p["rows"]), "alle Unterpositionen in KG 394")
        c.post(f"{BK}/bk/{bk['id']}/vorschlag", {"thema": "quatsch"}, expect=400)
        h = c.pj(f"{BK}/bk/{bk['id']}/vorschlag", {"thema": "huelle"})
        gleich(sorted(x["kg"] for x in h["rows"]), ["334", "335", "363"], "Gebäudehülle")
        b = c.pj(f"{BK}/bk/{bk['id']}/bauteile/vorschlag", {})
        pruefe(b["rows"] and all(len(x["kg"]) == 3 and x["kg"][0] in "34" for x in b["rows"]), "Bauteilvorschlag in KG 3xx/4xx")
    finally:
        _weg(ctx, bk["id"])


def test_baudaten_in_baukosten(ctx):
    """Position aus den Baudaten in den Baukosten suchen und als Bauteil übernehmen (Text, KG, Einheit, Preis)."""
    c = ctx.admin
    r = c.gj(f"{BK}/baudaten/suche?q=012.01.001.01001&kataloge=1")
    gleich(r["gesamt"], 1, "genau eine Position mit diesem Code")
    p = r["positionen"][0]
    pruefe(finde(r["kataloge"], key="gk3"), "Katalog der Bauplattform fehlt")
    x = c.pj(f"{BK}/baudaten/positionen", {"ids": [p["id"], "kein-int"]})
    gleich(len(x), 1, "nur gültige ids")
    x = x[0]
    gleich(x["kg"], "331", "Kostengruppe")
    gleich(x["einheit"], "m", "Einheit")
    gleich(x["ep_s"], p["ep_mittel_akt"], "Schätzpreis = mittlerer Preis heute")
    pruefe(x["kurz"].startswith("Kimmschicht aus Mauermörtel"), f"Kurztext {x['kurz']!r}")
    pruefe("012.01.001.01001" in x["quelle"], f"Quelle {x['quelle']!r}")
    c.get(f"{BK}/baudaten/position/999999999", expect=404)


def test_rechte_baukosten(ctx):
    """Baukosten nur für freigeschaltete Konten: Gast 401, Bernd Krämer und Clara Wolf 403, Anna Bauer darf."""
    g = ctx.gast()
    a = g.get(f"{BK}/bk", expect=401)
    pruefe(a.json.get("login"), "Gast bekommt die Anmeldeadresse")
    g.get(f"{BK}/bk/1/bericht.pdf", expect=401)
    g.post(f"{BK}/bk", {"name": "x"}, expect=401)
    for n in ("Bernd Krämer", "Clara Wolf"):
        u = ctx.anmelden(n)
        u.get(f"{BK}/bk", expect=403)
        u.get(f"{BK}/kennwerte", expect=403)
        u.post(f"{BK}/bk", {"name": ctx.name("BK")}, expect=403)
    anna = ctx.anmelden("Anna Bauer")
    anna.get(f"{BK}/bk", expect=200)
    anna.put(f"{BK}/dienste", {"bki": {"user": "x"}}, expect=403)   # Zugänge nur Administrator
    bk = _neu(ctx, client=anna)
    _weg(ctx, bk["id"])
