"""Ablauftests Bautagebuch: Projekte, Tagesberichte, Einträge, Fotos, PDF, Versionen, Suche, Kontakte, Rechte, Datenbankversionen.

Alle Anfragen laufen über den Verteiler unter /bautagebuch/… . Jeder Test legt sein eigenes Projekt an (Name „RT-BT-…“)
und legt es am Ende wieder in den Papierkorb. Die gemeinsamen Testdaten (T101–T103, die zwölf Firmen) werden nur gelesen
bzw. höchstens in eigenen Testberichten verwendet – nie geändert oder gelöscht.
"""
import re
import struct
import zlib
from urllib.parse import urlencode

from lib import Client, PW, finde, gleich, pruefe

BT = "/bautagebuch"


def _a(pfad):
    return BT + "/api" + pfad


def _png(breite=16, hoehe=12, farbe=(200, 120, 40)):
    """Kleines, gültiges PNG-Bild (nur Standardbibliothek) – wird vom Bautagebuch als JPG gespeichert."""
    roh = b"".join(b"\x00" + bytes(farbe) * breite for _ in range(hoehe))

    def stueck(art, daten):
        return struct.pack(">I", len(daten)) + art + daten + struct.pack(">I", zlib.crc32(art + daten) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + stueck(b"IHDR", struct.pack(">IIBBBBB", breite, hoehe, 8, 2, 0, 0, 0))
            + stueck(b"IDAT", zlib.compress(roh)) + stueck(b"IEND", b""))


def _projekt(ctx, leaders=None, c=None):
    """Eigenes Testprojekt anlegen (ohne Koordinaten → keine Adress- oder Kartensuche im Internet). → (id, Name)"""
    c = c or ctx.admin
    name = f"{ctx.name('BT')} Testbaustelle"
    d = {"name": name, "client": "Bauherr Testfall", "street": "Teststraße 1", "zip": "45127", "city": "Essen", "lat": None, "lon": None}
    if leaders is not None:
        d["leaders"] = leaders
    a = c.pj(_a("/projects"), d)
    pruefe(isinstance(a.get("id"), int), f"Projekt ohne id angelegt: {a}")
    return a["id"], name


def _weg(ctx, pid):
    """Testprojekt in den Papierkorb (mit allen Berichten, Einträgen, Fotos)."""
    ctx.admin.delete(_a(f"/projects/{pid}"), expect=None)


def _bericht_neu(c, pid, **felder):
    return c.pj(_a(f"/projects/{pid}/reports"), felder)["id"]


def _berichte(c, pid):
    return c.gj(_a(f"/projects/{pid}/reports"))


def _bericht(c, pid, rid):
    r = finde(_berichte(c, pid), id=rid)
    pruefe(r, f"Bericht {rid} nicht in der Liste des Projekts {pid}")
    return r


def _eintrag(c, rid, kind, text, **mehr):
    return c.pj(_a(f"/reports/{rid}/items"), {"kind": kind, "text": text, **mehr})


def _ich(c):
    return c.gj(_a("/me"))


def _leader_id(ctx, name):
    x = finde(ctx.admin.gj(_a("/leaders")), name=name)
    pruefe(x, f"Benutzer „{name}“ fehlt in der Bauleiter-Auswahl")
    return x["id"]


def _suche(c, q, project_id=None):
    """Stichwortsuche (Umlaute und ß werden für die Adresse richtig kodiert)."""
    par = {"q": q, **({"project_id": project_id} if project_id is not None else {})}
    return c.gj(_a("/search?" + urlencode(par)))


def _foto(c, rid, dateiname="foto.png", daten=None, ctype="image/png", item_id=None):
    felder = {"item_id": item_id} if item_id is not None else None
    return c.pj(_a(f"/reports/{rid}/images"), dateien={"files": (dateiname, daten if daten is not None else _png(), ctype)}, felder=felder)


# ------------------------------------------------------------------------------------------------ Grundlagen
def test_bt_abschnitte(ctx):
    """Bautagebuch kennt alle Abschnitte des Tagesberichts in der richtigen Reihenfolge."""
    m = ctx.admin.gj(_a("/meta"))
    pruefe(int(m.get("schema_version") or 0) >= 27, f"Schema-Version zu alt: {m.get('schema_version')}")
    secs = {s["key"]: s for s in m["sections"]}
    for k, typ in (("tagesbericht", "header"), ("wetter", "weather"), ("anwesende", "list"), ("notizen", "list"), ("bilder", "images"),
                   ("maengel", "list"), ("zu_erledigen", "list"), ("weisungen", "list")):
        pruefe(k in secs, f"Abschnitt „{k}“ fehlt")
        gleich(secs[k]["type"], typ, f"Art des Abschnitts {k}")
    gleich(secs["maengel"]["title"], "Mängel", "Titel Mängel")
    gleich(bool(secs["anwesende"]["extra"].get("link_contacts")), True, "Anwesende sind mit den Kontakten verknüpft")
    reihe = [s["key"] for s in m["sections"] if s["key"] in ("anwesende", "notizen", "bilder", "maengel", "zu_erledigen", "weisungen")]
    gleich(reihe, ["anwesende", "notizen", "bilder", "maengel", "zu_erledigen", "weisungen"], "Reihenfolge der Abschnitte")


def test_bt_projekt_anlegen_aendern(ctx):
    """Projekt anlegen, in der Liste finden, Bauherr/Adresse ändern; leerer Name wird abgelehnt."""
    pid, name = _projekt(ctx)
    try:
        p = finde(ctx.admin.gj(_a("/projects")), id=pid)
        pruefe(p, "neues Projekt fehlt in der Liste")
        gleich(p["name"], name, "Name")
        gleich(p["client"], "Bauherr Testfall", "Bauherr")
        gleich(p["leaders"], [], "ohne Bauleiter: leere Liste (alle dürfen es sehen)")
        gleich(p["archived"], 0, "nicht archiviert")
        ctx.admin.put(_a(f"/projects/{pid}"), {"name": "   "}, expect=400)
        ctx.admin.uj(_a(f"/projects/{pid}"), {"client": "Neuer Bauherr GmbH"})
        ctx.admin.uj(_a(f"/projects/{pid}"), {"street": "Lindenallee 9", "zip": "45128", "city": "Essen", "lat": None, "lon": None})
        p = finde(ctx.admin.gj(_a("/projects")), id=pid)
        gleich(p["client"], "Neuer Bauherr GmbH", "Bauherr geändert")
        gleich((p["street"], p["zip"]), ("Lindenallee 9", "45128"), "Adresse geändert")
        gleich(p["name"], name, "Name bleibt nach abgelehntem leerem Namen")
    finally:
        _weg(ctx, pid)
    pruefe(not finde(ctx.admin.gj(_a("/projects")), id=pid), "gelöschtes Projekt steht noch in der Liste")


def test_bt_berichtsnummern_fortlaufend(ctx):
    """Berichte werden je Projekt fortlaufend nummeriert (1, 2, 3 …), unabhängig vom Datum und von anderen Projekten."""
    pid, _ = _projekt(ctx)
    pid2, _ = _projekt(ctx)
    try:
        r1 = _bericht_neu(ctx.admin, pid, date="2026-03-03", time="07:30", plz="45127")
        r2 = _bericht_neu(ctx.admin, pid, date="2026-03-04")
        r3 = _bericht_neu(ctx.admin, pid, date="2026-03-02")   # nachgetragen: früheres Datum, trotzdem Nr. 3
        L = _berichte(ctx.admin, pid)
        gleich(len(L), 3, "Anzahl Berichte")
        nr = {r["id"]: r["number"] for r in L}
        gleich((nr[r1], nr[r2], nr[r3]), (1, 2, 3), "Berichtsnummern")
        gleich([r["id"] for r in L], [r2, r1, r3], "Liste neueste Berichte (nach Datum) zuerst")
        b1, b2 = finde(L, id=r1), finde(L, id=r2)
        gleich(b1["site_manager"], "Test-Admin", "Bauleitung = angemeldeter Benutzer")
        gleich(b1["time"], "07:30", "Uhrzeit")
        gleich(b2["plz"], "45127", "PLZ vom letzten Bericht übernommen")
        gleich(b2["site_manager"], "Test-Admin", "Bauleitung auch im zweiten Bericht")
        gleich((b1["items"], b1["images"]), ([], []), "neuer Bericht ohne Einträge und Fotos")
        q = _bericht_neu(ctx.admin, pid2, date="2026-03-05")
        gleich(_bericht(ctx.admin, pid2, q)["number"], 1, "anderes Projekt beginnt wieder bei Nr. 1")
        r4 = _bericht_neu(ctx.admin, pid)
        b4 = _bericht(ctx.admin, pid, r4)
        gleich(b4["number"], 4, "nächster Bericht im ersten Projekt")
        pruefe(re.fullmatch(r"\d{4}-\d{2}-\d{2}", b4["date"] or ""), f"ohne Datum: heutiges Datum erwartet, erhalten {b4['date']!r}")
    finally:
        _weg(ctx, pid)
        _weg(ctx, pid2)


def test_bt_bericht_felder_aendern(ctx):
    """Kopfdaten und Wetter eines Berichts ändern; der Bericht lässt sich nicht in ein anderes Projekt verschieben."""
    pid, _ = _projekt(ctx)
    pid2, _ = _projekt(ctx)
    try:
        rid = _bericht_neu(ctx.admin, pid, date="2026-04-14")
        ctx.admin.uj(_a(f"/reports/{rid}"), {"weather": "Bedeckt", "precip": "leichter Regen", "temp": "8", "humidity": "85", "wind": "22",
                                             "chk_tidy": 1, "chk_photos": 1, "site_manager": "Anna Bauer, Bernd Krämer", "date": "2026-04-15"})
        ctx.admin.uj(_a(f"/reports/{rid}"), {"project_id": pid2, "id": 999999})
        r = _bericht(ctx.admin, pid, rid)
        gleich((r["weather"], r["precip"], r["temp"], r["humidity"], r["wind"]), ("Bedeckt", "leichter Regen", "8", "85", "22"), "Wetter")
        gleich((r["chk_tidy"], r["chk_photos"], r["chk_measure"]), (1, 1, 0), "Kontrollkästchen")
        gleich(r["site_manager"], "Anna Bauer, Bernd Krämer", "Bauleitung vor Ort")
        gleich(r["date"], "2026-04-15", "Datum geändert")
        gleich(r["project_id"], pid, "Projekt bleibt unverändert")
        gleich(_berichte(ctx.admin, pid2), [], "im anderen Projekt ist nichts angekommen")
    finally:
        _weg(ctx, pid)
        _weg(ctx, pid2)


# ------------------------------------------------------------------------------------------------ Einträge
def test_bt_eintraege_aller_art(ctx):
    """Anwesende, Notizen, Mängel, Aufgaben und Weisungen eintragen – mit Termin, Firma und Personenzahl; Fehleingaben abgelehnt."""
    pid, _ = _projekt(ctx)
    try:
        rid = _bericht_neu(ctx.admin, pid, date="2026-05-06")
        me = _ich(ctx.admin)
        firma = ctx.name("Firma") + " Bau"
        a = _eintrag(ctx.admin, rid, "anwesende", firma, activity="Schalung Decke", headcount=4)
        n = _eintrag(ctx.admin, rid, "notizen", "Abstimmung mit dem Statiker vor Ort.")
        m = _eintrag(ctx.admin, rid, "maengel", "Abplatzung Betonkante Treppenpodest", due="2026-05-20")
        z = _eintrag(ctx.admin, rid, "zu_erledigen", "Bemusterung Fliesen vereinbaren", due="2026-05-13", due_time="14:30")
        w = _eintrag(ctx.admin, rid, "weisungen", "Gerüstlage 3 sofort sichern", company="Gerüstbau Ruhr")
        items = {i["id"]: i for i in _bericht(ctx.admin, pid, rid)["items"]}
        gleich(len(items), 5, "Anzahl Einträge")
        ia = items[a["id"]]
        gleich((ia["kind"], ia["text"], ia["activity"], ia["headcount"]), ("anwesende", firma, "Schalung Decke", 4), "Anwesende")
        gleich(ia["contact_id"], a["contact_id"], "Anwesende mit Kontakt verknüpft")
        gleich((items[n["id"]]["kind"], items[n["id"]]["text"], items[n["id"]]["done"]), ("notizen", "Abstimmung mit dem Statiker vor Ort.", 0), "Notiz")
        im = items[m["id"]]
        gleich((im["kind"], im["due"], im["due_time"], im["done"]), ("maengel", "2026-05-20", "09:00", 0), "Mangel mit Termin (Standard 9 Uhr)")
        gleich(im["remind_user"], me["id"], "wer den Termin setzt, wird erinnert")
        iz = items[z["id"]]
        gleich((iz["kind"], iz["due"], iz["due_time"]), ("zu_erledigen", "2026-05-13", "14:30"), "Aufgabe mit Termin und Uhrzeit")
        iw = items[w["id"]]
        gleich((iw["kind"], iw["text"], iw["company"]), ("weisungen", "Gerüstlage 3 sofort sichern", "Gerüstbau Ruhr"), "Weisung an Firma")
        # Fehleingaben
        ctx.admin.post(_a(f"/reports/{rid}/items"), {"kind": "notizen", "text": "   "}, expect=400)
        ctx.admin.post(_a(f"/reports/{rid}/items"), {"kind": "gibt_es_nicht", "text": "x"}, expect=400)
        ctx.admin.post(_a(f"/reports/{rid}/items"), {"kind": "bilder", "text": "x"}, expect=400)   # kein Listen-Abschnitt
        e = ctx.admin.post(_a(f"/reports/{rid}/items"), {"kind": "maengel", "text": "x", "due": "20.05.2026"}, expect=400).json
        gleich(e.get("error"), "Das Datum ist ungültig.", "Meldung bei falschem Datum")
        e = ctx.admin.post(_a(f"/reports/{rid}/items"), {"kind": "maengel", "text": "x", "due": "2026-05-20", "due_time": "25:00"}, expect=400).json
        gleich(e.get("error"), "Die Uhrzeit ist ungültig.", "Meldung bei falscher Uhrzeit")
        gleich(len(_bericht(ctx.admin, pid, rid)["items"]), 5, "abgelehnte Eingaben haben nichts angelegt")
    finally:
        _weg(ctx, pid)
        if "a" in locals():   # mit den Anwesenden angelegter Kontakt
            ctx.admin.delete(_a(f"/contacts/{a['contact_id']}"), expect=None)


def test_bt_anwesende_als_kontakt(ctx):
    """Anwesende Firma wird als Kontakt übernommen – vorhandene Firma ohne Rücksicht auf Groß-/Kleinschreibung wiedererkannt."""
    pid, _ = _projekt(ctx)
    neu = ctx.name("Neufirma")
    try:
        kontakte = ctx.admin.gj(_a("/contacts"))
        erdbau = finde(kontakte, name="Erdbau Hoffmann GmbH")
        pruefe(erdbau, "Testfirma „Erdbau Hoffmann GmbH“ fehlt in den Kontakten")
        rid = _bericht_neu(ctx.admin, pid, date="2026-05-07")
        a = _eintrag(ctx.admin, rid, "anwesende", "  erdbau   HOFFMANN gmbh ")
        gleich((a["contact_id"], a["contact_created"], a["name"]), (erdbau["id"], False, "Erdbau Hoffmann GmbH"), "vorhandene Firma erkannt")
        b = _eintrag(ctx.admin, rid, "anwesende", f"  {neu}   Tiefbau ", activity="Leitungsgraben")
        gleich((b["contact_created"], b["name"]), (True, f"{neu} Tiefbau"), "neue Firma als Kontakt angelegt")
        items = {i["id"]: i for i in _bericht(ctx.admin, pid, rid)["items"]}
        gleich(items[a["id"]]["text"], "Erdbau Hoffmann GmbH", "Eintrag trägt den Namen aus den Kontakten")
        gleich(items[b["id"]]["headcount"], 1, "ohne Angabe: 1 Anwesender")
        k = finde(ctx.admin.gj(_a("/contacts")), id=b["contact_id"])
        pruefe(k, "neuer Kontakt fehlt in der Kontaktliste")
        gleich((k["name"], k["used"], k["projects"]), (f"{neu} Tiefbau", 1, [pid]), "Kontakt: Name, Verwendung, Projekte")
    finally:
        _weg(ctx, pid)
        if "b" in locals():
            ctx.admin.delete(_a(f"/contacts/{b['contact_id']}"), expect=None)


def test_bt_eintrag_aendern_loeschen(ctx):
    """Eintrag abhaken, Text und Termin ändern, löschen und mit „Rückgängig“ unverändert wiederherstellen."""
    pid, _ = _projekt(ctx)
    pid2, _ = _projekt(ctx)
    try:
        rid = _bericht_neu(ctx.admin, pid, date="2026-05-08")
        anderer = _bericht_neu(ctx.admin, pid2, date="2026-05-08")
        m = _eintrag(ctx.admin, rid, "maengel", "Fuge Mauerwerk nicht vollfugig", due="2026-05-15")["id"]
        ctx.admin.uj(_a(f"/items/{m}"), {"done": 1, "text": "Fuge Mauerwerk Achse B nicht vollfugig", "report_id": anderer})
        i = finde(_bericht(ctx.admin, pid, rid)["items"], id=m)
        gleich((i["done"], i["text"], i["report_id"]), (1, "Fuge Mauerwerk Achse B nicht vollfugig", rid), "abgehakt, Text geändert, Bericht unverändert")
        ctx.admin.uj(_a(f"/items/{m}"), {"due": ""})
        i = finde(_bericht(ctx.admin, pid, rid)["items"], id=m)
        gleich((i["due"], i["remind_user"]), ("", None), "Termin entfernt → keine Erinnerung")
        ctx.admin.put(_a(f"/items/{m}"), {"due": "morgen"}, expect=400)
        geloescht = ctx.admin.delete(_a(f"/items/{m}"), expect=200).json
        pruefe(geloescht.get("item") and geloescht["item"]["id"] == m, f"gelöschter Eintrag nicht zurückgegeben: {geloescht}")
        gleich(geloescht["item"]["image_ids"], [], "keine Fotos am Eintrag")
        gleich(_bericht(ctx.admin, pid, rid)["items"], [], "Eintrag gelöscht")
        ctx.admin.pj(_a("/items/restore"), geloescht["item"])
        i = finde(_bericht(ctx.admin, pid, rid)["items"], id=m)
        pruefe(i, "Eintrag nach „Rückgängig“ nicht wieder da (gleiche ID erwartet)")
        gleich((i["text"], i["done"], i["kind"]), ("Fuge Mauerwerk Achse B nicht vollfugig", 1, "maengel"), "wiederhergestellter Eintrag")
        ctx.admin.post(_a("/items/restore"), geloescht["item"], expect=409)
    finally:
        _weg(ctx, pid)
        _weg(ctx, pid2)


# ------------------------------------------------------------------------------------------------ Fotos
def test_bt_fotos(ctx):
    """Fotos hochladen (auch am Mangel), automatische Beschriftung, Vorschaubild, Beschriftung ändern, falsche Dateien abgelehnt, löschen."""
    pid, _ = _projekt(ctx)
    pid2, _ = _projekt(ctx)
    try:
        rid = _bericht_neu(ctx.admin, pid, date="2026-06-01")
        fremd = _bericht_neu(ctx.admin, pid2, date="2026-06-01")
        fremd_eintrag = _eintrag(ctx.admin, fremd, "maengel", "anderer Bericht")["id"]
        m1 = _eintrag(ctx.admin, rid, "maengel", "Riss im Innenputz")["id"]
        m2 = _eintrag(ctx.admin, rid, "maengel", "Gefälle Dusche zu gering")["id"]
        anw = _eintrag(ctx.admin, rid, "anwesende", "Erdbau Hoffmann GmbH")["id"]
        gleich(_foto(ctx.admin, rid, "IMG_0001.png"), {"ok": True, "rejected": []}, "Foto ohne Eintrag")
        _foto(ctx.admin, rid, "m1.png", item_id=m1)
        _foto(ctx.admin, rid, "m1b.png", item_id=m1)
        _foto(ctx.admin, rid, "m2.png", item_id=m2)
        _foto(ctx.admin, rid, "anw.png", item_id=anw)
        _foto(ctx.admin, rid, "fremd.png", item_id=fremd_eintrag)   # Eintrag eines anderen Berichts: Foto kommt ohne Zuordnung in den Bericht
        a = _foto(ctx.admin, rid, "notiz.txt", b"kein Bild", "text/plain")
        gleich(a["rejected"], ["notiz.txt"], "Textdatei abgelehnt")
        a = _foto(ctx.admin, rid, "kaputt.jpg", b"\xff\xd8 das ist kein Bild", "image/jpeg")
        gleich(a["rejected"], ["kaputt.jpg"], "unlesbares Bild abgelehnt")
        bilder = _bericht(ctx.admin, pid, rid)["images"]
        gleich(len(bilder), 6, "Anzahl Fotos im Bericht")
        gleich([(b["item_id"], b["caption"]) for b in bilder],
               [(None, ""), (m1, "Mangel 1"), (m1, "Mangel 1 (2)"), (m2, "Mangel 2"), (anw, "Erdbau Hoffmann GmbH"), (None, "")],
               "Zuordnung und automatische Beschriftung der Fotos")
        for b in bilder:
            pruefe(b["file"].endswith(".jpg"), f"Foto nicht als JPG gespeichert: {b['file']}")
        gleich(len(_bericht(ctx.admin, pid2, fremd)["images"]), 0, "im fremden Bericht ist kein Foto angekommen")
        f = bilder[0]["file"]
        gleich(ctx.admin.get(f"{BT}/uploads/{f}").body[:2], b"\xff\xd8", "Originalfoto ist ein JPG")
        gleich(ctx.admin.get(_a(f"/thumb/240/{f}")).body[:2], b"\xff\xd8", "Vorschaubild ist ein JPG")
        ctx.gast().get(f"{BT}/uploads/{f}", expect=401)
        ctx.admin.uj(_a(f"/images/{bilder[0]['id']}"), {"caption": "  Ansicht   Nord  ", "report_id": fremd, "file": "x.jpg"})
        b0 = finde(_bericht(ctx.admin, pid, rid)["images"], id=bilder[0]["id"])
        gleich((b0["caption"], b0["file"], b0["report_id"]), ("Ansicht Nord", f, rid), "Beschriftung geändert, Datei und Bericht geschützt")
        weg = ctx.admin.delete(_a(f"/images/{bilder[1]['id']}"), expect=200).json
        pruefe(weg.get("papierkorb"), f"Foto nicht in den Papierkorb gelegt: {weg}")
        gleich(len(_bericht(ctx.admin, pid, rid)["images"]), 5, "Foto gelöscht")
    finally:
        _weg(ctx, pid)
        _weg(ctx, pid2)


# ------------------------------------------------------------------------------------------------ PDF und Versionen
def test_bt_pdf_und_versionen(ctx):
    """Bericht als PDF (Dateiname Kürzel_BT_Datum), Exportstatus, Änderung erkannt, auf exportierte Version zurücksetzen."""
    pid, name = _projekt(ctx)
    try:
        rid = _bericht_neu(ctx.admin, pid, date="2026-10-28")
        ctx.admin.uj(_a(f"/reports/{rid}"), {"weather": "Sonnig", "temp": "14"})
        _eintrag(ctx.admin, rid, "anwesende", "Rohbau Schulte & Söhne", activity="Mauerwerk EG", headcount=5)
        notiz = _eintrag(ctx.admin, rid, "notizen", "Prüfstatiker hat die Bewehrung freigegeben.")["id"]
        _foto(ctx.admin, rid, "baugrube.png")
        v = ctx.admin.gj(_a(f"/reports/{rid}/versions"))
        gleich((v["status"], v["last_export"]), ("never", None), "vor dem ersten Export")
        kuerzel = name.split()[0]
        soll = f"{kuerzel}_BT_2026-10-28.pdf"
        a = ctx.admin.get(_a(f"/reports/{rid}/pdf?save=0")).ist_pdf()
        pruefe(f'filename="{soll}"' in (a.headers.get("Content-Disposition") or ""), f"PDF-Name: erwartet {soll}, erhalten {a.headers.get('Content-Disposition')}")
        v = ctx.admin.gj(_a(f"/reports/{rid}/versions"))
        gleich(v["status"], "exported", "Status nach dem Export")
        gleich(v["last_export"]["pdf_name"], soll, "Name der Export-Version")
        gleich((v["versions"][0]["reason"], v["versions"][0]["pdf_name"]), ("export", soll), "neueste Version = Export")
        export_id = v["last_export"]["id"]
        a = ctx.admin.get(_a(f"/reports/{rid}/pdf?save=0")).ist_pdf()
        gleich(a.headers.get("X-Bt-Unveraendert"), "1", "unveränderter Bericht: nur ansehen, keine neue Version")
        ctx.admin.uj(_a(f"/reports/{rid}"), {"weather": "Starkregen"})
        ctx.admin.delete(_a(f"/items/{notiz}"))
        gleich(ctx.admin.gj(_a(f"/reports/{rid}/versions"))["status"], "changed", "Status nach Änderung")
        gleich(ctx.admin.pj(_a(f"/versions/{export_id}/restore")), {"ok": True, "report_id": rid}, "Version wiederherstellen")
        r = _bericht(ctx.admin, pid, rid)
        gleich(r["weather"], "Sonnig", "Wetter auf exportierten Stand zurückgesetzt")
        n = finde(r["items"], id=notiz)
        pruefe(n and n["text"] == "Prüfstatiker hat die Bewehrung freigegeben.", "gelöschte Notiz mit gleicher ID zurück")
        gleich(len(r["items"]), 2, "Anzahl Einträge nach dem Zurücksetzen")
        gleich(len(r["images"]), 1, "Fotos bleiben, wie sie sind")
        v = ctx.admin.gj(_a(f"/reports/{rid}/versions"))
        gleich(v["status"], "exported", "nach dem Zurücksetzen wieder = exportierter Stand")
        pruefe(finde(v["versions"], reason="before_restore"), "vor dem Zurücksetzen wurde kein Sicherheitsstand angelegt")
        d = ctx.admin.gj(_a(f"/versions/{export_id}"))
        gleich((d["report_id"], d["reason"], d["data"]["report"]["weather"]), (rid, "export", "Sonnig"), "Inhalt der Export-Version")
        gleich(len(d["data"]["items"]), 2, "Einträge in der Export-Version")
        ctx.admin.get(_a("/versions/999999999"), expect=404)
        ctx.admin.get(_a("/reports/999999999/pdf"), expect=404)
    finally:
        _weg(ctx, pid)


def test_bt_bericht_loeschen_rueckgaengig(ctx):
    """Gelöschter Bericht kommt mit „Rückgängig“ samt Nummer, Einträgen und Fotos zurück – aber nur einmal."""
    pid, _ = _projekt(ctx)
    try:
        r1 = _bericht_neu(ctx.admin, pid, date="2026-07-01")
        r2 = _bericht_neu(ctx.admin, pid, date="2026-07-02")
        _eintrag(ctx.admin, r2, "notizen", "Baustrom-Zähler abgelesen: 1.248 kWh.")
        _eintrag(ctx.admin, r2, "maengel", "Leerrohr verschoben", due="2026-07-09")
        _foto(ctx.admin, r2, "x.png")
        a = ctx.admin.delete(_a(f"/reports/{r2}"), expect=200).json
        gleich((a.get("ok"), a.get("undo"), a.get("minuten")), (True, r2, 15), "Antwort beim Löschen")
        gleich([r["id"] for r in _berichte(ctx.admin, pid)], [r1], "nur noch Bericht 1")
        gleich(ctx.admin.pj(_a(f"/reports/{r2}/restore"), {}), {"ok": True, "id": r2, "project_id": pid}, "Wiederherstellen")
        b = _bericht(ctx.admin, pid, r2)
        gleich(b["number"], 2, "Nummer bleibt")
        gleich(sorted(i["kind"] for i in b["items"]), ["maengel", "notizen"], "Einträge wieder da")
        gleich(len(b["images"]), 1, "Foto wieder da")
        ctx.admin.post(_a(f"/reports/{r2}/restore"), {}, expect=404)
    finally:
        _weg(ctx, pid)


# ------------------------------------------------------------------------------------------------ Suche
def test_bt_suche(ctx):
    """Stichwortsuche findet Einträge – Groß-/Kleinschreibung, ß/ss und Umlaute egal, alle Wörter müssen vorkommen."""
    pid, _ = _projekt(ctx)
    pid2, _ = _projekt(ctx)
    marke = ctx.name("Suche").lower()
    try:
        rid = _bericht_neu(ctx.admin, pid, date="2026-10-28")
        iid = _eintrag(ctx.admin, rid, "maengel", f"Riss in der Außenwand Süd {marke}")["id"]
        pruefe(iid, "Mangel nicht angelegt")
        for q in (f"aussenwand {marke}", f"AUSSENWAND {marke.upper()}", f"außenwand sud {marke}", f"Sued {marke}"):
            a = _suche(ctx.admin, q)
            treffer = [r for r in a["results"] if r.get("report_id") == rid]
            gleich(len(treffer), 1, f"Treffer für „{q}“")
            t = treffer[0]
            gleich((t["type"], t["project_id"], t["report"], t["date"]), ("Mängel", pid, "Nr. 1 · 28.10.2026", "2026-10-28"), f"Treffer für „{q}“")
        a = _suche(ctx.admin, f"aussenwand {marke}")
        gleich(a["tokens"], ["aussenwand", marke], "Suchwörter")
        gleich(_suche(ctx.admin, f"{marke} dachrinne")["results"], [], "nicht alle Wörter vorhanden → kein Treffer")
        gleich(_suche(ctx.admin, marke, pid2)["results"], [], "Suche in anderem Projekt")
        gleich(len(_suche(ctx.admin, marke, pid)["results"]), 1, "Suche im eigenen Projekt")
        gleich(_suche(ctx.admin, "   ")["results"], [], "leere Suche")
    finally:
        _weg(ctx, pid)
        _weg(ctx, pid2)


# ------------------------------------------------------------------------------------------------ Kontakte
def test_bt_kontakte_anlegen_doppelt(ctx):
    """Kontakt anlegen, doppelten Namen (auch in anderer Schreibweise) erkennen, unbenutzten Kontakt löschen."""
    n = ctx.name("Kontakt")
    ids = []
    try:
        k = ctx.admin.pj(_a("/contacts"), {"name": f"  {n}   Elektro ", "trade": "Elektro", "phone": "0201 1234-5", "city": "Essen"})
        ids.append(k["id"])
        x = finde(ctx.admin.gj(_a("/contacts")), id=k["id"])
        gleich((x["name"], x["trade"], x["phone"], x["used"], x["projects"]), (f"{n} Elektro", "Elektro", "0201 1234-5", 0, []), "neuer Kontakt")
        d = ctx.admin.post(_a("/contacts"), {"name": f"{n} ELEKTRO".upper()}, expect=409).json
        gleich((d.get("error"), d.get("id")), ("Ein Kontakt mit diesem Namen existiert bereits.", k["id"]), "Doppelter Name (Großschreibung)")
        ctx.admin.post(_a("/contacts"), {"name": "   "}, expect=400)
        k2 = ctx.admin.pj(_a("/contacts"), {"name": f"{n} Sanitär"})
        ids.append(k2["id"])
        ctx.admin.put(_a(f"/contacts/{k2['id']}"), {"name": f"{n} elektro"}, expect=409)
        ctx.admin.put(_a(f"/contacts/{k2['id']}"), {"name": "  "}, expect=400)
        ctx.admin.uj(_a(f"/contacts/{k2['id']}"), {"name": f"{n} Heizung", "email": "heizung@beispiel.test"})
        x = finde(ctx.admin.gj(_a("/contacts")), id=k2["id"])
        gleich((x["name"], x["email"]), (f"{n} Heizung", "heizung@beispiel.test"), "Kontakt geändert")
        s = _suche(ctx.admin, n.lower())["results"]
        gleich(sorted(r.get("contact_id") for r in s if r["type"] == "Kontakt"), sorted(ids), "Suche findet die Kontakte")
        for i in list(ids):
            weg = ctx.admin.delete(_a(f"/contacts/{i}"), expect=200).json
            gleich(weg.get("ok"), True, "unbenutzten Kontakt löschen")
            pruefe(isinstance(weg.get("papierkorb"), int), f"Kontakt nicht in den Papierkorb gelegt: {weg}")
            ctx.admin.post(_a("/bp/papierkorb/loeschen"), {"ids": [weg["papierkorb"]]}, expect=None)
            ids.remove(i)
        rest = [c for c in ctx.admin.gj(_a("/contacts")) if (c["name"] or "").startswith(n)]
        gleich(rest, [], "Kontakte gelöscht")
    finally:
        for i in ids:
            ctx.admin.delete(_a(f"/contacts/{i}"), expect=None)


def test_bt_kontakt_loeschen_gesperrt(ctx):
    """Kontakt, der in einem Bericht oder als Baustellenadresse verwendet wird, lässt sich nicht löschen – unbenutzt schon."""
    pid, _ = _projekt(ctx)
    firma, baustelle = ctx.name("Firma") + " Gerüstbau", ctx.name("Baustelle")
    cid = bid = None
    try:
        rid = _bericht_neu(ctx.admin, pid, date="2026-08-03")
        a = _eintrag(ctx.admin, rid, "anwesende", firma, activity="Gerüst stellen", headcount=2)
        cid = a["contact_id"]
        e = ctx.admin.delete(_a(f"/contacts/{cid}"), expect=409).json
        pruefe("wird noch verwendet" in e.get("error", "") and "1 Eintrag des Bautagebuchs" in e["error"], f"Meldung: {e.get('error')}")
        gleich([o["frag"] for o in e.get("orte") or []], [f"#projekt={pid}&bericht={rid}"], "Fundstelle zum Öffnen")
        # Baustellenadresse als Kontakt
        bid = ctx.admin.pj(_a(f"/projects/{pid}/contact"), {"accept": True, "name": baustelle})["id"]
        ctx.admin.post(_a(f"/projects/{pid}/contact"), {"accept": True, "name": baustelle}, expect=409)
        ctx.admin.post(_a(f"/projects/{pid}/contact"), {"accept": True, "name": "  "}, expect=400)
        k = finde(ctx.admin.gj(_a("/contacts")), id=bid)
        gleich((k["trade"], k["street"], k["zip"], k["projects"]), ("Baustelle", "Teststraße 1", "45127", [pid]), "Baustellenkontakt")
        ctx.admin.uj(_a(f"/projects/{pid}"), {"street": "Neue Straße 5", "zip": "45128", "city": "Essen", "lat": None, "lon": None})
        k = finde(ctx.admin.gj(_a("/contacts")), id=bid)
        gleich((k["street"], k["zip"]), ("Neue Straße 5", "45128"), "Adressänderung im Projekt wird im Kontakt mitgeführt")
        e = ctx.admin.delete(_a(f"/contacts/{bid}"), expect=409).json
        pruefe("Baustellenadresse" in e.get("error", ""), f"Meldung: {e.get('error')}")
        # nach dem Löschen des Eintrags ist die Firma frei
        ctx.admin.delete(_a(f"/items/{a['id']}"))
        ctx.admin.delete(_a(f"/contacts/{cid}"), expect=200)
        pruefe(not finde(ctx.admin.gj(_a("/contacts")), id=cid), "Kontakt nicht gelöscht")
        cid = None
    finally:
        _weg(ctx, pid)
        for i in (cid, bid):
            if i:   # Projekt weg → Kontakt unbenutzt → muss sich jetzt löschen lassen
                ctx.admin.delete(_a(f"/contacts/{i}"), expect=200)
                pruefe(not finde(ctx.admin.gj(_a("/contacts")), id=i), f"Kontakt {i} nach dem Löschen des Projekts nicht löschbar")


def test_bt_kontakte_export(ctx):
    """Adressverzeichnis als Excel und als PDF ausgeben (gefiltert)."""
    ctx.admin.get(_a("/contacts/export.xlsx?q=Essen")).ist_xlsx()
    ctx.admin.get(_a("/contacts/export.pdf?trade=Elektro")).ist_pdf()


def test_bt_mehrere_berichte_drucken(ctx):
    """Drucken mehrerer Berichte: Zeitraum oder Auswahl in einem PDF (Name mit „bis“), ohne Version und Ablage; fremde Projekte gesperrt."""
    anna = _leader_id(ctx, "Anna Bauer")
    pid, name = _projekt(ctx, leaders=[anna])
    try:
        r1 = _bericht_neu(ctx.admin, pid, date="2026-09-01")
        r2 = _bericht_neu(ctx.admin, pid, date="2026-09-03")
        _bericht_neu(ctx.admin, pid, date="2026-09-20")
        k = name.split()[0]
        a = ctx.admin.get(_a(f"/projects/{pid}/berichte.pdf?von=2026-09-01&bis=2026-09-10&fotos=0")).ist_pdf()
        pruefe(f'filename="{k}_BT_2026-09-01_bis_2026-09-03.pdf"' in (a.headers.get("Content-Disposition") or ""), f"Name: {a.headers.get('Content-Disposition')}")
        a = ctx.admin.get(_a(f"/projects/{pid}/berichte.pdf?ids={r2}")).ist_pdf()
        pruefe(f'filename="{k}_BT_2026-09-03.pdf"' in (a.headers.get("Content-Disposition") or ""), "ein Bericht über ids: Name ohne „bis“")
        gleich(ctx.admin.gj(_a(f"/reports/{r1}/versions"))["status"], "never", "Sammel-PDF legt keine Version an")
        ctx.admin.get(_a(f"/projects/{pid}/berichte.pdf?von=2027-01-01&bis=2027-12-31"), expect=404)
        ctx.anmelden("Bernd Krämer").get(_a(f"/projects/{pid}/berichte.pdf"), expect=403)
    finally:
        _weg(ctx, pid)


# ------------------------------------------------------------------------------------------------ Rechte
def test_bt_rechte_bauleiter(ctx):
    """Projekt mit eingetragenen Bauleitern sehen nur diese (und Administratoren) – auch nicht über Bericht, PDF, Suche."""
    anna, bernd = _leader_id(ctx, "Anna Bauer"), _leader_id(ctx, "Bernd Krämer")
    pid, name = _projekt(ctx, leaders=[anna])
    marke = ctx.name("Geheim").lower()
    try:
        rid = _bericht_neu(ctx.admin, pid, date="2026-09-01")
        iid = _eintrag(ctx.admin, rid, "notizen", f"Vertraulich {marke}")["id"]
        b = ctx.anmelden("Bernd Krämer")
        a = ctx.anmelden("Anna Bauer")
        # Testdaten: T101 nur Anna, T102 Anna + Bernd, T103 ohne Bauleiter (alle)
        sichtbar = [p["name"] for p in b.gj(_a("/projects"))]
        pruefe(not any("T101" in n for n in sichtbar), "Bernd sieht T101 (nur Anna ist Bauleiterin)")
        pruefe(any("T102" in n for n in sichtbar), "Bernd sieht T102 nicht (er ist Bauleiter)")
        pruefe(any("T103" in n for n in sichtbar), "Bernd sieht T103 nicht (ohne Bauleiter: alle)")
        pruefe(name not in sichtbar, "Bernd sieht das Projekt von Anna")
        t101 = ctx.projekt("T101")
        b.get(_a(f"/projects/{t101['id']}/reports"), expect=403)
        b.get(_a(f"/projects/{pid}/reports"), expect=403)
        b.get(_a(f"/reports/{rid}/pdf?save=0"), expect=403)
        b.get(_a(f"/reports/{rid}/versions"), expect=403)
        b.post(_a(f"/reports/{rid}/items"), {"kind": "notizen", "text": "darf nicht"}, expect=403)
        b.put(_a(f"/items/{iid}"), {"text": "geändert"}, expect=403)
        b.put(_a(f"/reports/{rid}"), {"weather": "geändert"}, expect=403)
        b.delete(_a(f"/reports/{rid}"), expect=403)
        b.put(_a(f"/projects/{pid}"), {"leaders": [bernd]}, expect=403)
        gleich(_suche(b, marke)["results"], [], "Suche zeigt Bernd nichts aus Annas Projekt")
        gleich(_bericht(ctx.admin, pid, rid)["items"][0]["text"], f"Vertraulich {marke}", "Eintrag unverändert")
        # Anna ist Bauleiterin
        pruefe(name in [p["name"] for p in a.gj(_a("/projects"))], "Anna sieht ihr Projekt nicht")
        gleich(len(_suche(a, marke)["results"]), 1, "Anna findet ihren Eintrag")
        a.uj(_a(f"/projects/{pid}"), {"leaders": [anna, bernd, 999999]})   # Bauleiter dürfen Bauleiter ergänzen (unbekannte IDs fallen weg)
        gleich(finde(ctx.admin.gj(_a("/projects")), id=pid)["leaders"], [anna, bernd], "Bauleiter-Liste")
        pruefe(name in [p["name"] for p in b.gj(_a("/projects"))], "Bernd sieht das Projekt nach dem Eintragen nicht")
        r2 = _bericht_neu(b, pid, date="2026-09-02")
        x = _bericht(b, pid, r2)
        gleich((x["number"], x["site_manager"]), (2, "Bernd Krämer"), "Bericht von Bernd: Nr. 2, Bauleitung Bernd")
    finally:
        _weg(ctx, pid)


def test_bt_rechte_eintrag_wiederherstellen(ctx):
    """„Rückgängig“ für Einträge darf nicht in Projekte schreiben, die der Benutzer nicht sehen darf."""
    anna = _leader_id(ctx, "Anna Bauer")
    pid, _ = _projekt(ctx, leaders=[anna])
    try:
        rid = _bericht_neu(ctx.admin, pid, date="2026-09-03")
        iid = _eintrag(ctx.admin, rid, "notizen", "nur für Anna")["id"]
        item = ctx.admin.delete(_a(f"/items/{iid}")).json["item"]
        b = ctx.anmelden("Bernd Krämer")
        b.post(_a("/items/restore"), {**item, "text": "von Bernd eingeschleust"}, expect=(403, 404))   # 404: fremdes Projekt wie nicht vorhanden
        gleich(_bericht(ctx.admin, pid, rid)["items"], [], "kein Eintrag in Annas Projekt angekommen")
    finally:
        _weg(ctx, pid)


def test_bt_ohne_freischaltung(ctx):
    """Ohne Anmeldung oder ohne Freischaltung für das Bautagebuch (Clara Wolf) gibt es keinen Zugriff."""
    g = ctx.gast()
    for p in ("/projects", "/contacts", "/search?q=Test", f"/projects/{ctx.pid}/reports", "/users"):
        g.get(_a(p), expect=401)
    g.post(_a("/projects"), {"name": "Gast darf nicht"}, expect=401)
    gleich(g.gj(_a("/me")).get("ok"), False, "Gast ist nicht angemeldet")
    g.post(_a("/login"), {"name": ctx.name("Niemand"), "password": PW}, expect=401)
    clara = ctx.anmelden("Clara Wolf")   # auf der Startseite angemeldet – Bautagebuch ist nicht freigeschaltet
    clara.get(_a("/projects"), expect=(401, 403))
    clara.get(_a(f"/projects/{ctx.pid}/reports"), expect=(401, 403))
    clara.post(_a("/contacts"), {"name": ctx.name("Clara")}, expect=(401, 403))
    gleich(clara.gj(_a("/me")).get("ok"), False, "Clara gilt im Bautagebuch als nicht angemeldet")
    e = Client(ctx.base).post(_a("/login"), {"name": "Clara Wolf", "password": PW}, expect=403).json
    pruefe("nicht freigeschaltet" in (e.get("error") or ""), f"Meldung: {e}")
    b = Client(ctx.base)   # direkt über die Anmeldung des Bautagebuchs (nicht die Startseite)
    gleich(b.pj(_a("/login"), {"name": "Bernd Krämer", "password": PW}).get("ok"), True, "Anmeldung über das Bautagebuch")
    gleich(b.gj(_a("/me"))["name"], "Bernd Krämer", "angemeldet als Bernd")
    gleich(len(b.gj(_a("/projects"))) > 0, True, "Bernd sieht Projekte")


def test_bt_nur_administrator(ctx):
    """Benutzer, Datenbankversionen, Export, Protokoll und Einstellungen ändern darf nur der Administrator."""
    a = ctx.anmelden("Anna Bauer")
    for p in ("/users", "/backups", "/export", "/audit", "/backups/extern"):
        a.get(_a(p), expect=403)
    a.put(_a("/settings"), {"office_name": "Gehackt"}, expect=403)
    a.post(_a("/backups"), {}, expect=403)
    a.post(_a("/users"), {"name": "Neu", "email": "neu@beispiel.test"}, expect=403)
    s = a.gj(_a("/settings"))
    fremd = [k for k in s if not (k == "office_name" or k.startswith("co_") or k == "has_logo")]
    gleich(fremd, [], "normale Benutzer sehen nur die Firmendaten der Einstellungen")
    # Administrator
    u = ctx.admin.gj(_a("/users"))
    for n in ("Test-Admin", "Anna Bauer", "Bernd Krämer"):
        pruefe(finde(u, name=n), f"Benutzer {n} fehlt in der Benutzerverwaltung")
    pruefe(all("pass_hash" not in x for x in u), "Benutzerliste enthält Kennwort-Hashes")
    gleich(finde(u, name="Test-Admin")["is_admin"], True, "Test-Admin ist Administrator")
    gleich(finde(u, name="Anna Bauer")["is_admin"], False, "Anna ist keine Administratorin")
    s = ctx.admin.gj(_a("/settings"))
    for k in ("store_pass", "mail_pass", "m365_secret"):
        pruefe(k not in s and (k + "_set") in s, f"Kennwort {k} verlässt den Server")
    me = _ich(ctx.admin)
    ctx.admin.put(_a(f"/users/{me['id']}"), {"is_admin": False}, expect=400)   # sich selbst nicht entziehen
    ctx.admin.delete(_a(f"/users/{me['id']}"), expect=400)                     # sich selbst nicht löschen
    ex = ctx.admin.gj(_a("/export"))
    gleich(ex.get("format"), 1, "Exportformat")
    for t in ("projects", "reports", "items", "images", "contacts", "sections", "settings"):
        pruefe(t in ex["tables"], f"Tabelle {t} fehlt im Export")


def test_bt_konto_farbe(ctx):
    """Eigene Oberflächenfarbe: nur gültige Farbwerte, wird klein geschrieben gespeichert."""
    b = ctx.anmelden("Bernd Krämer")
    alt = _ich(b).get("accent") or ""
    try:
        b.put(_a("/account"), {"accent": "rot"}, expect=400)
        b.uj(_a("/account"), {"accent": "#AABBCC"})
        gleich(_ich(b)["accent"], "#aabbcc", "Farbe gespeichert")
    finally:
        b.put(_a("/account"), {"accent": alt}, expect=None)


def test_bt_datenbankversionen(ctx):
    """Administrator legt eine Datenbankversion an, findet sie in der Liste, lädt sie herunter und löscht sie wieder."""
    vorher = ctx.admin.gj(_a("/backups"))
    pruefe(isinstance(vorher.get("items"), list), f"Liste der Datenbankversionen: {vorher}")
    name = ctx.admin.pj(_a("/backups"), {}, timeout=300)["name"]
    try:
        pruefe(re.fullmatch(r"bau-\d{8}-\d{6}-manuell\.dump", name or ""), f"Name der Version: {name!r}")
        x = finde(ctx.admin.gj(_a("/backups"))["items"], name=name)
        pruefe(x, "neue Version fehlt in der Liste")
        gleich(x["kind"], "manuell", "Art")
        pruefe(x["size"] > 0, "Version ist leer")
        gleich(ctx.admin.get(_a(f"/backups/{name}/download")).body[:5], b"PGDMP", "Download ist eine pg_dump-Datei")
        ctx.admin.get(_a("/backups/bau-00000000-000000-gibtsnicht.dump/download"), expect=404)
    finally:
        ctx.admin.delete(_a(f"/backups/{name}"), expect=(200, 404))
    pruefe(not finde(ctx.admin.gj(_a("/backups"))["items"], name=name), "gelöschte Version steht noch in der Liste")


# ------------------------------------------------------------------------------------------------ Bauzeitenplan-Abgleich, Protokoll
def test_bt_soll_ohne_bauzeitenplan(ctx):
    """Ohne verknüpften Bauzeitenplan: keine Soll-Anwesenden, kein Arbeitsfortschritt; ungültige Angaben abgelehnt."""
    pid, _ = _projekt(ctx)
    try:
        rid = _bericht_neu(ctx.admin, pid, date="2026-10-01")
        gleich(ctx.admin.gj(_a(f"/reports/{rid}/soll")), {"firmen": [], "plaene": [], "nachreichen": []}, "Soll-Anwesende")
        gleich(ctx.admin.gj(_a(f"/reports/{rid}/fortschritt")), {"vorgaenge": [], "schwelle": 5}, "Arbeitsfortschritt")
        ctx.admin.post(_a(f"/reports/{rid}/soll"), {"firma": "Elektro Wilhelmi", "status": "vielleicht"}, expect=400)
        ctx.admin.post(_a(f"/reports/{rid}/soll"), {"firma": "  ", "status": "fehlt"}, expect=400)
        ctx.admin.post(_a(f"/reports/{rid}/soll"), {"firma": "Elektro Wilhelmi", "status": "fehlt"}, expect=200)
        ctx.admin.post(_a(f"/reports/{rid}/soll"), {"firma": "Elektro Wilhelmi", "status": "offen"}, expect=200)
        ctx.admin.post(_a("/reports/999999999/soll"), {"firma": "x", "status": "fehlt"}, expect=404)
        ctx.admin.post(_a(f"/reports/{rid}/fortschritt"), {"gantt_id": "1", "uid": 1, "pct": 150}, expect=400)
        ctx.admin.post(_a(f"/reports/{rid}/fortschritt"), {"gantt_id": "1", "uid": 1, "pct": 50}, expect=404)
    finally:
        _weg(ctx, pid)


def test_bt_protokoll(ctx):
    """Änderungen und PDF-Exporte stehen im Protokoll des Administrators beim richtigen Projekt."""
    pid, name = _projekt(ctx)
    try:
        rid = _bericht_neu(ctx.admin, pid, date="2026-10-02")
        _eintrag(ctx.admin, rid, "maengel", "Fensteranschluss links nicht abgedichtet")
        ctx.admin.get(_a(f"/reports/{rid}/pdf?save=0")).ist_pdf()
        rows = ctx.admin.gj(_a(f"/audit?project_id={pid}"))["rows"]
        akt = {r["action"]: r for r in rows}
        for x in ("Bericht angelegt", "Eintrag hinzugefügt", "PDF exportiert"):
            pruefe(x in akt, f"Protokoll ohne „{x}“: {sorted(akt)}")
        gleich(akt["Eintrag hinzugefügt"]["detail"], "Mängel: Fensteranschluss links nicht abgedichtet", "Protokolltext Eintrag")
        gleich(akt["PDF exportiert"]["detail"], f"{name.split()[0]}_BT_2026-10-02.pdf", "Protokolltext PDF")
        gleich((akt["PDF exportiert"]["project"], akt["PDF exportiert"]["user_name"]), (name, "Test-Admin"), "Projekt und Benutzer im Protokoll")
        gleich(akt["PDF exportiert"]["report"], "Nr. 1 · 02.10.2026", "Bericht im Protokoll")
    finally:
        _weg(ctx, pid)


def test_bt_logo_fuer_alle_apps(ctx):
    """Das Büro-Logo wird einmal hochgeladen (Einstellungen) und steht dann jeder App direkt zur Verfügung – aus dem Kern
    (bpcore.logo), ohne dass eine App das Bautagebuch danach fragt: Symbol der Startseite, Logo im Bauzeitenplan."""
    import base64
    png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAECAIAAAA8r+mnAAAAFklEQVR4XmM8ISfHgA0wYRVlYCBDAgBmJgEMaF/H9wAAAABJRU5ErkJggg==")
    vorher = ctx.admin.get(_a("/logo"), expect=None)
    alt = (vorher.body, vorher.headers.get("Content-Type", "")) if vorher.status == 200 else None
    try:
        ctx.admin.post(_a("/logo"), dateien={"file": ("logo.png", png, "image/png")})
        pruefe(ctx.admin.gj(_a("/settings"))["has_logo"], "Einstellungen melden das Logo nicht")
        gleich(ctx.admin.get(_a("/logo")).body, png, "Bautagebuch liefert das hochgeladene Logo")
        gleich(ctx.admin.get("/bauzeitenplan/api/logo").body, png, "Bauzeitenplan liefert dasselbe Logo aus dem Kern")
        sym = ctx.admin.get("/logo.png")
        gleich(sym.body[:8], b"\x89PNG\r\n\x1a\n", "Startseite liefert das Logo als PNG-Symbol")
        ctx.admin.delete(_a("/logo"))
        ctx.admin.get("/bauzeitenplan/api/logo", expect=404)
        ctx.admin.get("/logo.png", expect=404)
    finally:
        if alt:   # ein vorher vorhandenes Logo wiederherstellen
            ext = {"image/jpeg": "jpg", "image/webp": "webp"}.get(alt[1].split(";")[0], "png")
            ctx.admin.post(_a("/logo"), dateien={"file": ("logo." + ext, alt[0], alt[1])})
        else:
            ctx.admin.delete(_a("/logo"))
