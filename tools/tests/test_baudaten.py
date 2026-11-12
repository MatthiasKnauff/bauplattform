"""Ablauftests Baudaten (Positionsdatenbank): Kataloge, Leistungsbereiche und Gruppen, Suche, Preisbildung,
eigene Positionen und eigene Preise, Firmen, Import eines Katalogs (GAEB), Export als CSV, Korb, Rechte.

Geprüft wird nur Kataloginhalt, der bei jeder Neuinstallation sicher da ist: Migration 0025_positionsdb_daten.sql
(Katalog „gk3“, Preisstand 11/2026, Indexbasis 141,7), z. B. Position 012.01.001.01001 „Kimmschicht aus Mauermörtel,
Wanddicke 11,5 cm“ (Zeitansatz 0,12 h/m, Stoff 1,80 €/m, Gewerk Rohbau 68 €/h, Genauigkeit A).
Eigene Positionen, Preise und Kataloge legen die Tests selbst an und löschen sie wieder.
"""
import csv
import io
import re

from lib import finde, gleich, pruefe

BD = "/baudaten/api"
KIMM = "012.01.001.01001"


def _umrechnung(E):
    """Faktor heute: Index aktuell ÷ Indexbasis × Regionalfaktor (für den Katalog gk3)."""
    return E["index_aktuell"] / E["index_basis"] * (E["faktor"] or 1.0)


def _kimm(c):
    r = c.gj(f"{BD}/suche?katalog=gk3&q={KIMM}")
    gleich(r["gesamt"], 1, f"Position {KIMM} genau einmal")
    return r["positionen"][0]


def _eigene(c, **felder):
    b = {"kurz": "RT-Position"}
    b.update(felder)
    return c.pj(f"{BD}/position", b)


def _weg(c, pid):
    c.delete(f"{BD}/position/{pid}", expect=None)


def _gaeb(name, positionen):
    """Kleine GAEB-DA-XML-Datei (X83) mit einem Titel „01 Mauerarbeiten“ und Positionen (oz, kurz, einheit, ep)."""
    its = []
    for oz, kurz, eh, ep in positionen:
        up = f"<UP>{ep}</UP>" if ep is not None else ""
        its.append(f'<Item RNoPart="{oz}"><Qty>10</Qty><QU>{eh}</QU>{up}<Description><CompleteText>'
                   f"<DetailTxt><Text><p><span>{kurz} – Langtext</span></p></Text></DetailTxt>"
                   f"<OutlineText><OutlTxt><TextOutlTxt><p><span>{kurz}</span></p></TextOutlTxt></OutlTxt></OutlineText>"
                   f"</CompleteText></Description></Item>")
    return ('<?xml version="1.0" encoding="UTF-8"?><GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.2"><Award><DP>83</DP><BoQ>'
            f"<BoQInfo><LblBoQ>{name}</LblBoQ></BoQInfo><BoQBody>"
            '<BoQCtgy RNoPart="01"><LblTx><p><span>Mauerarbeiten</span></p></LblTx><BoQBody><Itemlist>'
            + "".join(its) + "</Itemlist></BoQBody></BoQCtgy></BoQBody></BoQ></Award></GAEB>").encode("utf-8")


# ---------------------------------------------------------------- Tests
def test_kataloge_leistungsbereiche_gruppen(ctx):
    """Positionsdatenbank ist nach der Neuinstallation gefüllt: Kataloge, Einstellungen, Leistungsbereich 012 mit Gruppen."""
    c = ctx.admin
    s = c.gj(f"{BD}/start?katalog=gk3")
    gk3 = finde(s["kataloge"], key="gk3")
    pruefe(gk3 and gk3["n"] > 10000, f"Katalog gk3 leer oder fehlt: {gk3}")
    gleich(gk3["preisstand"], "2026-11", "Preisstand gk3")
    gleich(gk3["index_basis"], 141.7, "Indexbasis gk3")
    pruefe(finde(s["kataloge"], key="eigen"), "Katalog „Eigene Positionen“ fehlt")
    E = s["einstellungen"]
    gleich(E["index_basis"], 141.7, "Indexbasis der Einstellungen")
    pruefe(E["faktor_id"] is not None and E["faktor"] > 0, f"Regionalfaktor fehlt: {E}")
    pruefe(finde(E["faktoren"], name="Bundesdurchschnitt"), "Faktor „Bundesdurchschnitt“ fehlt")
    gleich(E["genauigkeit"]["A"][:2], [0.85, 1.2], "Spanne Genauigkeit A")
    gleich(E["genauigkeit"]["C"][:2], [0.68, 1.5], "Spanne Genauigkeit C")
    lb = finde(s["lbs"], nr="012")
    pruefe(lb and lb["name"] == "Mauerarbeiten" and lb["atv"] == "DIN 18330" and lb["n"] > 0, f"Leistungsbereich 012: {lb}")
    pruefe(finde(s["loehne"], gewerk="rohbau"), "Verrechnungslohn Rohbau fehlt")
    pruefe("m²" in s["einheiten"] and "psch" in s["einheiten"], "Einheiten")
    pruefe(s["admin"] is True, "Administrator erkannt")
    g = c.gj(f"{BD}/gruppen?katalog=gk3&lb=012")
    gleich([x["nr"] for x in g], ["012.01", "012.02", "012.03", "012.04", "012.05", "012.06"], "Gruppen in LB 012")
    gleich(finde(g, nr="012.02")["name"], "Außenwände", "Gruppe 012.02")
    pruefe(all(x["n"] > 0 for x in g), "jede Gruppe hat Positionen")
    gleich(c.gj(f"{BD}/gruppen?katalog=gk3&lb=999"), [], "unbekannter Leistungsbereich")


def test_suche_und_preisbildung_katalog(ctx):
    """Katalogposition suchen (Code, Text, Filter, Blättern) und Preis von Hand nachrechnen: Zeit × Lohn + Stoff × 1,12."""
    c = ctx.admin
    E = c.gj(f"{BD}/start")["einstellungen"]
    p = _kimm(c)
    gleich(p["code"], KIMM, "Code")
    gleich(p["kurz"], "Kimmschicht aus Mauermörtel, Wanddicke 11,5 cm", "Kurztext")
    gleich((p["einheit"], p["kg"], p["lb_nr"], p["gruppe"], p["genauigkeit"]), ("m", "331", "012", "012.01", "A"), "Merkmale")
    # EP mittel = 0,12 h × 68 €/h + 1,80 € × 1,12 = 8,16 + 2,016 = 10,176 → auf 0,10 € gerundet 10,20 €
    # EP von = 10,176 × 0,85 = 8,6496 → auf 0,05 € 8,65 €;  EP bis = 10,176 × 1,20 = 12,2112 → 12,20 €
    gleich(p["ep_mittel"], 10.2, "EP mittel"); gleich(p["ep_von"], 8.65, "EP von"); gleich(p["ep_bis"], 12.2, "EP bis")
    f = _umrechnung(E)
    gleich(p["ep_mittel_akt"], round(10.2 * f, 2), "EP mittel heute (Index und Regionalfaktor)")
    d = c.gj(f"{BD}/position/{p['id']}")
    gleich(d["h"], 0.12, "Zeitansatz h/m"); gleich(d["stoff"], 1.8, "Stoff €/m"); gleich(d["verrechnungslohn"], 68, "Verrechnungslohn Rohbau")
    gleich(d["umrechnung"], round(f, 4), "Umrechnungsfaktor")
    pruefe("Kimmschicht" in d["lang_voll"] and "Normalmauermörtel" in d["lang_voll"], "Langtext = Grundtext + Folgetext")
    gleich(d["lb_name"], "Mauerarbeiten", "Leistungsbereich")
    gleich(d["katalog_name"], "Positionsdatenbank Bauplattform", "Katalogname")
    c.get(f"{BD}/position/999999999", expect=404)

    t = c.gj(f"{BD}/suche?katalog=gk3&lb=012&q=kimmschicht&n=200")
    pruefe(t["gesamt"] >= 6 and finde(t["positionen"], code=KIMM), f"Textsuche findet die Kimmschicht nicht ({t['gesamt']})")
    k = c.gj(f"{BD}/suche?katalog=gk3&lb=012&kg=33&einheit=m&n=50")
    pruefe(k["positionen"] and all(x["kg"].startswith("33") and x["einheit"] == "m" for x in k["positionen"]), "Filter KG 33x und Einheit m")
    a = c.gj(f"{BD}/suche?katalog=gk3&lb=012&n=5&offset=0")["positionen"]
    b = c.gj(f"{BD}/suche?katalog=gk3&lb=012&n=5&offset=5")["positionen"]
    gleich((len(a), len(b)), (5, 5), "Seitengröße")
    pruefe(not {x["id"] for x in a} & {x["id"] for x in b}, "Seiten überschneiden sich")
    pruefe([x["code"] for x in a + b] == sorted(x["code"] for x in a + b), "nach Code sortiert")
    gleich(c.gj(f"{BD}/suche?katalog=gk3&q=xyzkeinwortxyz")["gesamt"], 0, "nichts gefunden")


def test_eigene_position_anlegen_bearbeiten_loeschen(ctx):
    """Eigene Position anlegen, bearbeiten, ausblenden, löschen; Katalogpositionen bleiben schreibgeschützt; Übernahme als eigene."""
    c = ctx.admin
    kat = _kimm(c)
    c.put(f"{BD}/position/{kat['id']}", {"kurz": "geändert"}, expect=403)
    c.put(f"{BD}/position/{kat['id']}", {"ep_mittel": 1}, expect=403)
    c.delete(f"{BD}/position/{kat['id']}", expect=403)
    gleich(_kimm(c)["kurz"], kat["kurz"], "Katalogposition unverändert")
    kurz = ctx.name("Pos")
    p = _eigene(c, kurz=kurz, einheit="m²", kg="352", lb_nr="025")
    ids = [p["id"]]
    try:
        gleich(p["katalog"], "eigen", "Katalog")
        pruefe(re.fullmatch(r"E\.\d{5}", p["code"]), f"Code {p['code']!r}")
        gleich((p["kurz"], p["einheit"], p["kg"], p["quelle"]), (kurz, "m²", "352", "eigen"), "angelegt")
        p = c.uj(f"{BD}/position/{p['id']}", {"lang": "Bodenbelag Linoleum 2,5 mm, verklebt.", "ep_von": 40, "ep_mittel": 50,
                                                "ep_bis": 65, "genauigkeit": "A", "kg": "KG 352a", "einheit": "Unsinn"})
        gleich((p["ep_von_akt"], p["ep_mittel_akt"], p["ep_bis_akt"]), (40, 50, 65), "eingegebene Preise gelten als heutige Preise")
        gleich(p["kg"], "352", "nur Ziffern der Kostengruppe")
        gleich(p["einheit"], "m²", "unbekannte Einheit wird nicht übernommen")
        gleich(p["genauigkeit"], "A", "Genauigkeit")
        gleich(p["lang_voll"], "Bodenbelag Linoleum 2,5 mm, verklebt.", "Langtext")
        pruefe(finde(c.gj(f"{BD}/suche?katalog=eigen&n=500")["positionen"], id=p["id"]), "eigene Position in der Suche")

        p = c.uj(f"{BD}/position/{p['id']}", {"aktiv": False})
        pruefe(not finde(c.gj(f"{BD}/suche?katalog=eigen&n=500")["positionen"], id=p["id"]), "ausgeblendete Position ist nicht in der Suche")
        pruefe(finde(c.gj(f"{BD}/suche?katalog=eigen&alle=1&n=500")["positionen"], id=p["id"]), "mit „alle“ wieder sichtbar")
        p = c.uj(f"{BD}/position/{p['id']}", {"aktiv": True, "favorit": True})
        gleich((p["aktiv"], p["favorit"]), (1, 1), "eingeblendet und Favorit")
        pruefe(finde(c.gj(f"{BD}/suche?katalog=eigen&fav=1&n=500")["positionen"], id=p["id"]), "Filter Favoriten")

        k = c.pj(f"{BD}/position", {"von": kat["id"]})   # „Als eigene Position übernehmen“
        ids.append(k["id"])
        gleich((k["katalog"], k["kurz"], k["einheit"], k["kg"], k["lb_nr"]), ("eigen", kat["kurz"], "m", "331", "012"), "Kopie der Katalogposition")
        gleich(k["ep_mittel_akt"], kat["ep_mittel_akt"], "Preis heute übernommen", toleranz=0.011)
        pruefe("Kimmschicht" in k["lang_voll"], "Langtext übernommen")
        k2 = c.uj(f"{BD}/position/{k['id']}", {"kurz": "Kimmschicht, eigene Fassung"})
        gleich(k2["kurz"], "Kimmschicht, eigene Fassung", "Kopie ist änderbar")
        gleich(_kimm(c)["kurz"], kat["kurz"], "Original bleibt")
    finally:
        for i in ids:
            _weg(c, i)
    c.get(f"{BD}/position/{ids[0]}", expect=404)
    c.put(f"{BD}/position/{ids[0]}", {"kurz": "x"}, expect=404)


def test_eigene_preise_median_und_firmen(ctx):
    """Eigene Vergabepreise je Position: Median der letzten fünf Jahre, alte Preise zählen nicht, Firmenvorschläge nach Gewerk."""
    c = ctx.admin
    p = _eigene(c, kurz=ctx.name("Preis"), lb_nr="012", gewerk="rohbau", einheit="m²", kg="331")
    try:
        c.post(f"{BD}/position/{p['id']}/preis", {"ep": "abc"}, expect=400)
        c.post(f"{BD}/position/{p['id']}/preis", {"ep": -5}, expect=400)
        c.post(f"{BD}/position/999999999/preis", {"ep": 5}, expect=404)
        c.pj(f"{BD}/position/{p['id']}/preis", {"ep": 48, "firma": "Fliesen Rossi", "project_id": ctx.pid, "menge": 120, "notiz": "Test"})
        c.pj(f"{BD}/position/{p['id']}/preis", {"ep": "60,00"})
        c.pj(f"{BD}/position/{p['id']}/preis", {"ep": 52})
        d = c.pj(f"{BD}/position/{p['id']}/preis", {"ep": 500, "datum": "2015-03-01"})   # älter als fünf Jahre
        gleich(len(d["preise"]), 4, "alle Preise gespeichert")
        alt = finde(d["preise"], ep=500)
        pruefe(alt and alt["alt"] is True, "Preis von 2015 ist als alt markiert")
        gleich(finde(d["preise"], ep=48)["firma"], "Fliesen Rossi", "Firma gespeichert")
        gleich(finde(d["preise"], ep=48)["project_id"], ctx.pid, "Projekt gespeichert")
        # Median aus 48, 52, 60 (ohne den alten Preis) = 52
        gleich(d["n_preise"], 3, "Anzahl zählender Preise"); gleich(d["ep_eigen_median"], 52, "Median ungerade Anzahl")
        d = c.pj(f"{BD}/position/{p['id']}/preis", {"ep": 44})
        gleich(d["ep_eigen_median"], 50, "Median gerade Anzahl: (48 + 52) ÷ 2")

        anna = ctx.anmelden("Anna Bauer")
        anna_name = anna.gj(f"{BD}/me")["full"]
        anna.delete(f"{BD}/preis/{finde(d['preise'], ep=44)['id']}", expect=403)   # fremder Eintrag
        e = anna.pj(f"{BD}/position/{p['id']}/preis", {"ep": 1000})
        mein = finde(e["preise"], ep=1000)
        gleich(mein["user_name"], anna_name, "Eintrag von Anna")
        gleich(e["ep_eigen_median"], 52, "Median aus 44, 48, 52, 60, 1.000")
        anna.delete(f"{BD}/preis/{mein['id']}", expect=200)
        d = c.delete(f"{BD}/preis/{finde(d['preise'], ep=60)['id']}").json   # Administrator darf alles löschen
        gleich(d["ep_eigen_median"], 48, "Median aus 44, 48, 52")
        c.delete(f"{BD}/preis/999999999", expect=404)

        F = c.gj(f"{BD}/firmen?position={p['id']}")
        gleich([x["rang"] for x in F], sorted(x["rang"] for x in F), "Firmen nach Rang sortiert")
        gleich(finde(F, name="Fliesen Rossi")["rang"], 0, "Firma mit eigenem Preis in diesem Leistungsbereich zuerst")
        gleich(finde(F, name="Rohbau Schulte & Söhne")["rang"], 1, "Firma mit passendem Gewerk (Rohbau)")
        gleich(finde(F, name="Malerbetrieb Kunz")["rang"], 2, "übrige Firmen")
        gleich(len(c.gj(f"{BD}/firmen")), len(F), "ohne Position alle Firmen")
    finally:
        _weg(c, p["id"])


def test_katalog_import_gaeb_fortschreibung_loeschen(ctx):
    """Katalog aus einer GAEB-Datei einlesen, Preise mit dem Baupreisindex fortschreiben, schreibgeschützt, wieder löschen."""
    c = ctx.admin
    name = ctx.name("Import")
    xml = _gaeb(name, [("0010", "Mauerwerk Testposition A", "m2", "90.20"), ("0020", "Mauerwerk Testposition B", "Stk", None)])
    ctx.anmelden("Anna Bauer").post(f"{BD}/import", dateien={"datei": ("rt.x83", xml, "application/xml")}, felder={"name": name}, expect=403)
    c.post(f"{BD}/import", {"name": "eigen"}, expect=400)   # reservierter Name
    c.post(f"{BD}/import", dateien={"datei": ("kaputt.x83", b"<kein-gaeb/>", "application/xml")}, felder={"name": name}, expect=400)
    r = c.pj(f"{BD}/import", dateien={"datei": ("rt.x83", xml, "application/xml")}, felder={"name": name, "preisstand": "2019-07", "lizenz": "Test"})
    key = r["key"]
    try:
        gleich(r["n"], 2, "zwei Positionen eingelesen")
        gleich(key, name.lower(), "Schlüssel aus dem Namen")
        s = c.gj(f"{BD}/start?katalog={key}")
        k = finde(s["kataloge"], key=key)
        pruefe(k, "importierter Katalog fehlt")
        gleich((k["art"], k["n"], k["preisstand"], k["lizenz"]), ("import", 2, "2019-07", "Test"), "Katalogangaben")
        # Preisstand 07/2019 → Jahresmittel 2019 des Baupreisindex = 90,2 (2021 = 100)
        gleich(k["index_basis"], 90.2, "Indexbasis aus dem Preisstand"); pruefe(k["index_auto"] is True, "Indexbasis automatisch")
        gleich(s["lbs"], [{"nr": "01", "name": "01 Mauerarbeiten", "atv": "", "n": 2}], "Gliederung aus den Titeln")
        gleich([x["nr"] for x in c.gj(f"{BD}/gruppen?katalog={key}&lb=01")], ["01"], "Gruppe")
        P = c.gj(f"{BD}/suche?katalog={key}")["positionen"]
        a, b = finde(P, code="01.0010"), finde(P, code="01.0020")
        pruefe(a and b, f"Positionen fehlen: {P}")
        gleich((a["kurz"], a["einheit"], a["genauigkeit"], a["quelle"]), ("Mauerwerk Testposition A", "m²", "C", "import"), "Position A")
        gleich(a["ep_mittel"], 90.2, "Einheitspreis aus der GAEB-Datei")
        gleich((b["einheit"], b["ep_mittel"], b["genauigkeit"]), ("St", None, "B"), "Position B ohne Preis")
        E = s["einstellungen"]
        # 90,20 € × Index heute ÷ 90,2 × Regionalfaktor; bei Index 141,7 und Faktor 1,00 also 141,70 €
        gleich(a["ep_mittel_akt"], round(90.2 * E["index_aktuell"] / 90.2 * E["faktor"], 1), "fortgeschrieben auf heute", toleranz=0.051)
        c.put(f"{BD}/position/{a['id']}", {"kurz": "x"}, expect=403)

        c.put(f"{BD}/katalog/{key}", {"index_basis": 100})   # eigene Indexbasis: 90,20 € × 141,7 ÷ 100 = 127,81 €
        a2 = finde(c.gj(f"{BD}/suche?katalog={key}")["positionen"], code="01.0010")
        gleich(a2["ep_mittel_akt"], round(90.2 * E["index_aktuell"] / 100 * E["faktor"], 1), "mit eigener Indexbasis", toleranz=0.051)
        e = c.pj(f"{BD}/position", {"von": a["id"]})
        try:
            gleich((e["katalog"], e["kurz"]), ("eigen", "Mauerwerk Testposition A"), "als eigene Position übernommen")
            pruefe("01 Mauerarbeiten" in e["titel"], f"Titel {e['titel']!r}")
        finally:
            _weg(c, e["id"])
    finally:
        c.delete(f"{BD}/katalog/{key}", expect=None)
    pruefe(not finde(c.gj(f"{BD}/start")["kataloge"], key=key), "Katalog nicht gelöscht")
    gleich(c.gj(f"{BD}/suche?katalog={key}")["gesamt"], 0, "Positionen mit dem Katalog gelöscht")
    c.delete(f"{BD}/katalog/gk3", expect=400)   # Katalog der Bauplattform lässt sich nicht löschen
    c.put(f"{BD}/katalog/gibtsnicht-{ctx.name('x').lower()}", {"name": "x"}, expect=404)


def test_export_csv(ctx):
    """Export als CSV für Excel: Semikolon, UTF-8 mit BOM, deutsche Dezimalkommas, Filter wie in der Suche."""
    c = ctx.admin
    kurz = ctx.name("CSV")
    p = _eigene(c, kurz=kurz, einheit="m²", kg="352")
    try:
        p = c.uj(f"{BD}/position/{p['id']}", {"ep_von": 40.5, "ep_mittel": 50, "ep_bis": 65.25, "lang": "Langtext; mit Semikolon"})
        a = c.get(f"{BD}/export.csv?katalog=eigen")
        pruefe("text/csv" in a.ctype, f"Inhaltstyp {a.ctype}")
        pruefe("Baudaten.csv" in (a.headers.get("Content-Disposition") or ""), "Dateiname")
        pruefe(a.body.startswith("﻿".encode("utf-8")), "UTF-8 mit BOM für Excel")
        zeilen = list(csv.reader(io.StringIO(a.text.lstrip("﻿")), delimiter=";"))
        gleich(zeilen[0], ["Katalog", "Code", "LB", "Gruppe", "Kurztext", "Bezeichnung", "Langtext", "Einheit", "KG DIN 276",
                           "EP von", "EP mittel", "EP bis", "Genauigkeit", "Preisstand"], "Kopfzeile")
        z = next((x for x in zeilen[1:] if x[1] == p["code"]), None)
        pruefe(z, "eigene Position fehlt im Export")
        de = lambda v: str(v).replace(".", ",")
        gleich(z[0], "eigen", "Katalog"); gleich(z[4], kurz, "Kurztext"); gleich(z[5], kurz, "Bezeichnung = Kurztext, wenn leer")
        gleich(z[6], "Langtext; mit Semikolon", "Langtext mit Semikolon sauber eingefasst")
        gleich((z[7], z[8]), ("m²", "352"), "Einheit und KG")
        gleich((z[9], z[10], z[11]), (de(p["ep_von_akt"]), de(p["ep_mittel_akt"]), de(p["ep_bis_akt"])), "Preise mit Dezimalkomma")
        pruefe("," in z[9], f"Dezimalkomma erwartet: {z[9]!r}")
        leer = list(csv.reader(io.StringIO(c.get(f"{BD}/export.csv?katalog=eigen&kg=999").text.lstrip("﻿")), delimiter=";"))
        gleich(len(leer), 1, "Filter ohne Treffer: nur die Kopfzeile")
        eins = list(csv.reader(io.StringIO(c.get(f"{BD}/export.csv?katalog=gk3&q={KIMM}").text.lstrip("﻿")), delimiter=";"))
        gleich(len(eins), 2, "gk3 nach Code gefiltert")
        gleich((eins[1][1], eins[1][2], eins[1][3], eins[1][7], eins[1][8], eins[1][12]), (KIMM, "012", "Vorarbeiten, Sperrschichten", "m", "331", "A"), "Katalogzeile")
        gleich(eins[1][10], de(_kimm(c)["ep_mittel_akt"]), "EP mittel heute")
    finally:
        _weg(c, p["id"])


def test_korb_sammeln(ctx):
    """Korb: Positionen sammeln, Reihenfolge behalten, doppelte ignorieren, entfernen (vorheriger Inhalt wird wiederhergestellt)."""
    c = ctx.admin
    vorher = [x["id"] for x in c.gj(f"{BD}/baudaten/korb")]
    a = _kimm(c)
    b = c.gj(f"{BD}/suche?katalog=gk3&lb=012&n=2&offset=10")["positionen"][0]
    try:
        r = c.pj(f"{BD}/baudaten/korb", {"leeren": True, "dazu": [b["id"], a["id"], b["id"], "x"]})
        gleich(r["ids"], [b["id"], a["id"]], "Reihenfolge wie hinzugefügt, ohne Doppelte")
        K = c.gj(f"{BD}/baudaten/korb")
        gleich([x["id"] for x in K], [b["id"], a["id"]], "Korb lesen")
        gleich(K[1]["ep_mittel_akt"], a["ep_mittel_akt"], "Preis heute wie in der Suche")
        gleich(c.pj(f"{BD}/baudaten/korb", {"weg": [b["id"]]})["ids"], [a["id"]], "entfernt")
        pruefe(a["id"] not in [x["id"] for x in ctx.anmelden("Anna Bauer").gj(f"{BD}/baudaten/korb")], "Korb gehört je einem Benutzer")
    finally:
        c.post(f"{BD}/baudaten/korb", {"leeren": True, "dazu": vorher}, expect=None)


def test_vorbemerkung_allgemein(ctx):
    """Migration 0054: „Allgemeine Vorbemerkungen“ steht als erster Baustein in der Liste und ist vollständig abrufbar."""
    c = ctx.admin
    L = c.gj("/ava/api/baudaten/vorbemerkungen")   # Endpunkt der Ausschreibung (bpcore.baudaten.register)
    gleich(L[0]["key"], "avb", "ganz oben")
    v = c.gj("/ava/api/baudaten/vorbemerkungen?key=avb")
    gleich(v["titel"], "Allgemeine Vorbemerkungen", "Titel")
    for t in ("1 Vertragsgrundlagen", "8 Unterlagen und Abnahme", "Projektbezogene Angaben", "§ 4 Abs. 3 VOB/B"):
        pruefe(t in v["text"], f"Text enthält „{t}“")
    # dieselben Texte als Katalog in der Kopierquelle der Ausschreibung (ziehen ins LV als Vorbemerkung, Art „V“)
    k = finde(c.gj("/ava/api/katalog")["kataloge"], name="Bauplattform Vorbemerkungen")
    pruefe(k, "Katalog „Bauplattform Vorbemerkungen“ in der Kopierquelle")
    gleich([g["nr"] for g in c.gj(f"/ava/api/katalog/{k['id']}")["gewerke"]], ["VB1", "VB2"], "Allgemein und je Leistungsbereich")
    I = [x for x in c.gj(f"/ava/api/katalog/{k['id']}/gewerk/VB1")["data"]["items"] if x["typ"] == "pos"]
    gleich((I[0]["kurz"], I[0]["art"], I[0].get("vb")), ("1 Vertragsgrundlagen", "T", True), "je Abschnitt einzeln, als Vorbemerkung")
    gleich(len(c.gj("/ava/api/katalog")["kataloge"]), len(c.gj("/ava/api/katalog")["kataloge"]), "nicht doppelt angelegt")


def test_rechte_baudaten(ctx):
    """Baudaten: Gast 401, Bernd Krämer 403; Index, Löhne und Import nur Administrator; Clara Wolf über die Ausschreibung freigeschaltet."""
    g = ctx.gast()
    pruefe(g.get(f"{BD}/start", expect=401).json.get("login"), "Gast bekommt die Anmeldeadresse")
    g.get(f"{BD}/export.csv", expect=401)
    bernd = ctx.anmelden("Bernd Krämer")
    bernd.get(f"{BD}/suche?q=mauer", expect=403)
    bernd.post(f"{BD}/position", {"kurz": "x"}, expect=403)
    # Clara Wolf hat nur den Bauzeitenplan – dazu gehört automatisch die Ausschreibung und damit die Baudaten (sso.apps_of)
    ctx.anmelden("Clara Wolf").get(f"{BD}/start", expect=200)
    anna = ctx.anmelden("Anna Bauer")
    E = anna.gj(f"{BD}/start")["einstellungen"]
    anna.put(f"{BD}/einstellungen", {"index_aktuell": 150}, expect=403)
    anna.put(f"{BD}/einstellungen", {"loehne": {"rohbau": 99}}, expect=403)
    anna.put(f"{BD}/katalog/gk3", {"name": "x"}, expect=403)
    gleich(anna.gj(f"{BD}/lvs"), [], "LV-Liste nur für den Administrator")
    ctx.admin.put(f"{BD}/einstellungen", {"index_aktuell": 20}, expect=400)   # unplausibler Index
    E2 = ctx.admin.gj(f"{BD}/start")["einstellungen"]
    gleich((E2["index_aktuell"], E2["faktor_id"]), (E["index_aktuell"], E["faktor_id"]), "Einstellungen unverändert")


def test_element_als_eigene_position_behaelt_bestandteile(ctx):
    """Standardelement (Katalog „Bauteile & Elemente“) als eigene Position übernehmen: die Bestandteile kommen mit,
    der Preis bleibt der eigene; Löschen räumt die Bestandteile mit ab."""
    c = ctx.admin
    L = c.gj(f"{BD}/suche?katalog=gk3e&n=50")["positionen"]
    el = next((x for x in L if (c.gj(f"{BD}/position/{x['id']}").get("teile") or [])), None)
    if not el:
        return   # ohne Elementkatalog (sollte es nach den Migrationen immer geben)
    src = c.gj(f"{BD}/position/{el['id']}")
    p = c.pj(f"{BD}/position", {"von": src["id"]})
    try:
        gleich((p["katalog"], len(p.get("teile") or [])), ("eigen", len(src["teile"])), "Bestandteile in der eigenen Kopie")
        p = c.gj(f"{BD}/position/{p['id']}")
        gleich(len(p.get("teile") or []), len(src["teile"]), "auch nach erneutem Öffnen")
        gleich(len(c.gj(f"{BD}/position/{src['id']}")["teile"]), len(src["teile"]), "Original unverändert")
    finally:
        c.delete(f"{BD}/position/{p['id']}", expect=None)
