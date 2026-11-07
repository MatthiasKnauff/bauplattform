"""Ablauftests: Planstand & Versand (ohne Ablage) und Kommunikation.

Pläne: Projekte und Rechte, Adressen mit E-Mail, Einstellungen, Planordner je Projekt, Planversandliste (Liste und PDF),
Mail-Vorlage. Alles, was die Ablage auf dem Dateiserver braucht (Planliste, Dateien, echter Versand), gibt es im Test
nicht – diese Schnittstellen antworten dort absichtlich mit einem Fehler und werden hier nicht aufgerufen.
Kommunikation: eine Mängelrüge „als PDF“ (ohne Mail) wird protokolliert und erscheint mit Filtern und im CSV-Export.
"""
import csv, io, re, uuid
from datetime import date, timedelta

from lib import finde, gleich, pruefe

HEUTE = date.today()
CSV_KOPF = ["Datum", "Uhrzeit", "Art", "Weg", "Projekt", "Empfänger", "Ansprechpartner", "E-Mail", "Betreff", "Inhalt", "Von", "Status"]


# ---------------------------------------------------------------- Hilfen
def _iso(tage):
    return (HEUTE + timedelta(days=tage)).isoformat()


def _de(iso):
    return f"{iso[8:10]}.{iso[5:7]}.{iso[:4]}"


def _uid(ctx, name):
    u = finde(ctx.admin.gj("/verwaltung/api/users")["users"], name=name)
    pruefe(u, f"Benutzer „{name}“ fehlt")
    return u["id"]


def _baustelle(ctx, leaders=()):
    """Eigenes Bautagebuch-Projekt (mit Koordinaten – ohne Adresssuche im Internet) mit einem Bericht vor 7 Tagen."""
    name = ctx.name("Baustelle")
    pid = ctx.admin.pj("/bautagebuch/api/projects", {"name": name, "street": "Musterweg 1", "zip": "45127", "city": "Essen",
                                                     "lat": 51.45, "lon": 7.01, "leaders": list(leaders)})["id"]
    tag = _iso(-7)
    rid = ctx.admin.pj(f"/bautagebuch/api/projects/{pid}/reports", {"date": tag})["id"]
    return {"pid": pid, "rid": rid, "name": name, "tag": tag}


def _baustelle_weg(ctx, b):
    ctx.admin.delete(f"/bautagebuch/api/projects/{b['pid']}", expect=200)


def _vorbereiten(ctx, leaders=()):
    """Firma (eigene E-Mail-Adresse), Projekt und ein offener Mangel dieser Firma."""
    firma = ctx.name("Fliesenleger")
    mail = f"buero@rt-{uuid.uuid4().hex[:8]}.test"
    kid = ctx.admin.pj("/adressen/api/contacts", {"name": firma, "contact_person": "Petra Test", "email": mail})["id"]
    b = _baustelle(ctx, leaders)
    m = ctx.admin.pj(f"/bautagebuch/api/reports/{b['rid']}/items", {"kind": "maengel", "text": "RT Fliese gesprungen", "due": _iso(5), "company": firma})["id"]
    return {**b, "kid": kid, "firma": firma, "mail": mail, "mangel": m, "frist": _iso(14),
            "inhalt": f"1. RT Fliese gesprungen  (festgestellt am {_de(b['tag'])})"}


def _ruege_als_pdf(ctx, x):
    """Mängelrüge „nur PDF“ – keine Mail, aber ein Eintrag im Benachrichtigungsverlauf."""
    r = ctx.admin.post("/maengel/api/maengelruege", {"ids": [x["mangel"]], "empfaenger": {"id": x["kid"], "name": x["firma"], "person": "Petra Test"},
                                                    "frist": x["frist"], "schritt": "senden"}).ist_pdf()
    pruefe(not r.headers.get("X-Mail") and not r.headers.get("X-Mail-Fehler"), "„nur PDF“ hat eine Mail ausgelöst")


def _aufraeumen(ctx, x):
    _baustelle_weg(ctx, x)
    ctx.admin.delete(f"/adressen/api/contacts/{x['kid']}", expect=200)


# ---------------------------------------------------------------- Pläne
def test_plaene_projekte_und_rechte(ctx):
    """Pläne zeigen nur Projekte, die man sehen darf; „mine“ = eigene Bauleitung (T101 nur Anna, T102 Anna und Bernd)."""
    t101, t102, t103 = (ctx.projekt(k)["id"] for k in ("T101", "T102", "T103"))
    admin = {p["id"] for p in ctx.admin.gj("/plaene/api/projekte")}
    pruefe({t101, t102, t103} <= admin, "Administrator sieht nicht alle Testprojekte")
    bernd = ctx.anmelden("Bernd Krämer")   # nur Bautagebuch – „Planstand & Versand“ kommt automatisch dazu
    L = bernd.gj("/plaene/api/projekte")
    pruefe(not finde(L, id=t101), "Bernd sieht T101")
    gleich((finde(L, id=t102)["mine"], finde(L, id=t103)["mine"]), (True, False), "Bernd: T102 eigene Bauleitung, T103 frei")
    gleich(finde(ctx.anmelden("Anna Bauer").gj("/plaene/api/projekte"), id=t101)["mine"], True, "Anna: T101")
    for pfad in (f"/plaene/api/versandliste?project_id={t101}", f"/plaene/api/versandliste.pdf?project_id={t101}",
                 f"/plaene/api/vorlage?project_id={t101}"):
        bernd.get(pfad, expect=404)
    bernd.put(f"/plaene/api/projekt/{t101}", {"ordner": "x"}, expect=404)
    ctx.gast().get("/plaene/api/projekte", expect=401)


def test_plaene_adressen_mit_email(ctx):
    """Vorschläge für weitere Empfänger: nur Adressen mit E-Mail (z. B. die Firmen der Testdaten)."""
    ohne_name, mit_name = ctx.name("OhneMail"), ctx.name("MitMail")
    ohne = ctx.admin.pj("/adressen/api/contacts", {"name": ohne_name})["id"]
    mit = ctx.admin.pj("/adressen/api/contacts", {"name": mit_name, "email": "plan@rt-mitmail.test"})["id"]
    try:
        L = ctx.admin.gj("/plaene/api/kontakte")
        pruefe(L and all(x["email"] for x in L), "Adresse ohne E-Mail in den Vorschlägen")
        pruefe(finde(L, name="Erdbau Hoffmann GmbH", email="info@erdbau-hoffmann.test"), "Firma der Testdaten fehlt")
        pruefe(not finde(L, name=ohne_name), "Kontakt ohne E-Mail vorgeschlagen")
        pruefe(finde(L, name=mit_name, email="plan@rt-mitmail.test"), "neuer Kontakt mit E-Mail fehlt")
    finally:
        ctx.admin.delete(f"/adressen/api/contacts/{ohne}", expect=200)
        ctx.admin.delete(f"/adressen/api/contacts/{mit}", expect=200)


def test_plaene_einstellungen_hin_und_zurueck(ctx):
    """Einstellungen der Pläne speichern (nur Administrator): Anhang-Größe 1–100 MB, Stichwörter, Stellen; danach Ursprung."""
    a = ctx.admin
    alt = a.gj("/plaene/api/einstellungen")
    for k in ("phasen", "planarten", "kennungen", "stichworte", "max_mb", "stellen", "standard"):
        pruefe(k in alt, f"Einstellung „{k}“ fehlt")
    gleich((alt["admin"], alt["standard"]["max_mb"]), (True, 20), "Administrator, Vorgabe 20 MB")
    ctx.anmelden("Anna Bauer").put("/plaene/api/einstellungen", {"max_mb": 5}, expect=403)
    wort = "rt" + uuid.uuid4().hex[:6]
    try:
        n = a.uj("/plaene/api/einstellungen", {"max_mb": 7, "stichworte": {**alt["stichworte"], wort: "RT-Gewerk", "leer": "  "},
                                               "stellen": ["phase", "unsinn"]})
        gleich((n["max_mb"], n["stichworte"].get(wort), "leer" in n["stichworte"], n["stellen"]), (7, "RT-Gewerk", False, ["phase", "egal"]), "gespeichert")
        gleich(a.gj("/plaene/api/einstellungen")["stichworte"].get(wort), "RT-Gewerk", "nach erneutem Laden")
        gleich(a.uj("/plaene/api/einstellungen", {"max_mb": 500})["max_mb"], 100, "höchstens 100 MB")
        gleich(a.uj("/plaene/api/einstellungen", {"max_mb": 0})["max_mb"], 1, "mindestens 1 MB")
        a.put("/plaene/api/einstellungen", {"max_mb": "viel"}, expect=400)
    finally:
        r = a.uj("/plaene/api/einstellungen", {k: alt[k] for k in ("phasen", "planarten", "kennungen", "stichworte", "stellen", "max_mb")})
    for k in ("phasen", "planarten", "kennungen", "stichworte", "stellen", "max_mb"):
        gleich(r[k], alt[k], f"„{k}“ wiederhergestellt")


def test_versandliste_vorlage_und_pruefungen(ctx):
    """Neues Projekt: leere Planversandliste (auch als PDF), Mail-Vorlage mit Bauvorhaben; Versand ohne Auswahl abgelehnt."""
    a = ctx.admin
    b = _baustelle(ctx, leaders=[_uid(ctx, "Anna Bauer")])
    try:
        gleich(a.gj(f"/plaene/api/versandliste?project_id={b['pid']}"), [], "noch nichts versendet")
        a.get(f"/plaene/api/versandliste.pdf?project_id={b['pid']}").ist_pdf()
        a.get("/plaene/api/versandliste?project_id=999999999", expect=404)
        a.get("/plaene/api/versandliste.pdf?project_id=999999999", expect=404)
        ctx.anmelden("Bernd Krämer").get(f"/plaene/api/versandliste?project_id={b['pid']}", expect=404)
        v = a.gj(f"/plaene/api/vorlage?project_id={b['pid']}")
        bauvorhaben = f"{b['name']}, Musterweg 1, 45127 Essen"
        if a.gj("/plaene/api/bp/mailvorlagen")["vorlagen"]["planversand"]["standard"]:
            gleich(v["betreff"], f"Pläne {bauvorhaben}", "Betreff der Vorlage")
            pruefe(f"zum Bauvorhaben {bauvorhaben}:" in v["text"], f"Bauvorhaben fehlt im Text: {v['text'][:200]}")
            pruefe("{planliste}" in v["text"], "Platzhalter {planliste} muss für den Versand stehen bleiben")
        pruefe(v["versand"] in ("mich", "direkt") and isinstance(v["mail"], bool), f"Angaben zum Versand: {v}")
        # Prüfungen vor jedem Versand (lösen keine Mail aus)
        r = a.post("/plaene/api/versand", {"project_id": b["pid"], "plaene": [], "empfaenger": [{"email": "a@b.de"}]}, expect=400)
        pruefe("mindestens einen Plan" in r.json.get("error", ""), r.text[:200])
        plan = [{"pfad": "Pläne/A-101.pdf", "nr": "101"}]
        r = a.post("/plaene/api/versand", {"project_id": b["pid"], "plaene": plan, "empfaenger": [{"email": "keine-adresse"}]}, expect=400)
        pruefe("gültiger E-Mail" in r.json.get("error", ""), r.text[:200])
        a.post("/plaene/api/versand", {"project_id": 999999999, "plaene": plan, "empfaenger": [{"email": "a@b.de"}]}, expect=404)
    finally:
        _baustelle_weg(ctx, b)


def test_planordner_je_projekt_merken(ctx):
    """Planordner, ausgeschlossene Ordner und eigene Gewerk-Zuordnungen je Projekt speichern und wieder entfernen."""
    a = ctx.admin
    b = _baustelle(ctx, leaders=[_uid(ctx, "Anna Bauer")])
    try:
        r = a.uj(f"/plaene/api/projekt/{b['pid']}", {"ordner": " Projekte/RT/Pläne ", "aus": ["Fotos"], "zuordnung": {"A-101.pdf": "Rohbau", "A-102.pdf": "Elektro"}})
        gleich((r["ordner"], r["aus"], r["zuordnung"]), ("Projekte/RT/Pläne", ["Fotos"], {"A-101.pdf": "Rohbau", "A-102.pdf": "Elektro"}), "gemerkt")
        r = a.uj(f"/plaene/api/projekt/{b['pid']}", {"aus": None, "zuordnung": {"A-101.pdf": ""}})
        gleich((r["ordner"], r["aus"], r["zuordnung"]), ("Projekte/RT/Pläne", None, {"A-102.pdf": "Elektro"}), "Zuordnung entfernt, Vorgabe für Ausschlüsse")
        ctx.anmelden("Bernd Krämer").put(f"/plaene/api/projekt/{b['pid']}", {"ordner": "x"}, expect=404)
        a.put("/plaene/api/projekt/999999999", {"ordner": "x"}, expect=404)
    finally:
        _baustelle_weg(ctx, b)


# ---------------------------------------------------------------- Kommunikation
def test_kommunikation_ruege_protokolliert_und_gefiltert(ctx):
    """Mängelrüge „als PDF“ steht in der Kommunikation – je Kontakt, je Projekt, mit Art-, Absender- und Textfilter."""
    a = ctx.admin
    x = _vorbereiten(ctx)
    try:
        _ruege_als_pdf(ctx, x)
        r = a.gj(f"/kommunikation/api/kom?cid={x['kid']}")
        gleich(r["gesamt"], 1, "Sendungen an den Kontakt")
        e = r["eintraege"][0]
        gleich((e["art"], e["art_name"], e["weg"], e["weg_name"], e["status"]), ("maengelruege", "Mängelrüge", "pdf", "als PDF (selbst zugestellt)", "gesendet"), "Art und Weg")
        gleich((e["contact_id"], e["kontakt"], e["ansprech"], e["email"], e["name"]), (x["kid"], x["firma"], "Petra Test", x["mail"], x["firma"]), "Empfänger")
        gleich((e["project_id"], e["projekt"], e["von"], e["link"]), (x["pid"], x["name"], "Test-Admin", "aufgaben:#maengel"), "Projekt und Absender")
        gleich((e["betreff"], e["inhalt"]), (f"Mängelrüge – Frist bis {_de(x['frist'])}", x["inhalt"]), "Betreff und Inhalt")
        gleich([(p["project_id"], p["name"], p["n"]) for p in r["projekte"]], [(x["pid"], x["name"], 1)], "Übersicht je Projekt")
        k = finde(r["kontakte"], contact_id=x["kid"])
        gleich((k and k["n"], k and k["name"]), (1, x["firma"]), "Übersicht je Kontakt")
        pruefe(finde(r["arten"], key="maengelruege"), "Art „Mängelrüge“ fehlt in der Übersicht")
        for q, n in ((f"cid={x['kid']}&art=planversand", 0), (f"cid={x['kid']}&art=maengelruege,terminruege", 1),
                     (f"cid={x['kid']}&pid={x['pid']}", 1), (f"cid={x['kid']}&pid={ctx.projekt('T101')['id']}", 0),
                     (f"cid={x['kid']}&ich=1", 1), (f"q={x['firma'].lower()}", 1), (f"email={x['mail'].upper()}", 0),
                     (f"q=rt-gibt-es-nicht-{uuid.uuid4().hex[:6]}", 0)):
            gleich(a.gj(f"/kommunikation/api/kom?{q}")["gesamt"], n, f"Filter {q}")
        gleich(ctx.anmelden("Anna Bauer").gj(f"/kommunikation/api/kom?cid={x['kid']}&ich=1")["gesamt"], 0, "„nur meine“ bei Anna")
        s = a.gj(f"/kommunikation/api/kontakte?q={x['firma'].lower()}")
        gleich([(y["id"], y["n"], y["ansprech"], y["email"]) for y in s], [(x["kid"], 1, "Petra Test", x["mail"])], "Kontaktsuche")
        v = a.gj(f"/adressen/api/bp/kontakt/{x['kid']}/verlauf")
        gleich([(y["art"], y["weg"], y["projekt"]) for y in v], [("maengelruege", "pdf", x["name"])], "Verlauf am Kontakt")
        ctx.gast().get("/kommunikation/api/kom", expect=401)
    finally:
        _aufraeumen(ctx, x)


def test_kommunikation_csv_export(ctx):
    """CSV-Export für Excel: UTF-8 mit BOM, Semikolon, Kopfzeile und eine Zeile je Sendung (gleiche Filter wie die Ansicht)."""
    x = _vorbereiten(ctx)
    try:
        _ruege_als_pdf(ctx, x)
        a = ctx.admin.get(f"/kommunikation/api/kom.csv?cid={x['kid']}")
        pruefe(a.ctype.startswith("text/csv"), f"Inhaltstyp {a.ctype}")
        pruefe("Kommunikation.csv" in (a.headers.get("Content-Disposition") or ""), "Dateiname fehlt")
        pruefe(a.text.startswith("\ufeff"), "ohne BOM öffnet Excel die Umlaute falsch")
        zeilen = list(csv.reader(io.StringIO(a.text[1:]), delimiter=";"))
        gleich(zeilen[0], CSV_KOPF, "Kopfzeile")
        gleich(len(zeilen), 2, "eine Sendung")
        z = zeilen[1]
        pruefe(re.fullmatch(r"\d\d\.\d\d\.\d{4}", z[0]) and re.fullmatch(r"\d\d:\d\d", z[1]), f"Datum/Uhrzeit {z[:2]}")
        gleich(z[2:], ["Mängelrüge", "als PDF (selbst zugestellt)", x["name"], x["firma"], "Petra Test", x["mail"],
                       f"Mängelrüge – Frist bis {_de(x['frist'])}", x["inhalt"], "Test-Admin", "gesendet"], "Inhalt der Zeile")
        leer = list(csv.reader(io.StringIO(ctx.admin.get(f"/kommunikation/api/kom.csv?cid={x['kid']}&art=planversand").text[1:]), delimiter=";"))
        gleich(leer, [CSV_KOPF], "Filter gilt auch im Export")
    finally:
        _aufraeumen(ctx, x)


def test_kommunikation_nur_sichtbare_projekte(ctx):
    """Sendungen zu einem Projekt sieht nur, wer das Projekt sehen darf (wie in allen anderen Apps)."""
    x = _vorbereiten(ctx, leaders=[_uid(ctx, "Anna Bauer")])
    try:
        _ruege_als_pdf(ctx, x)
        gleich(ctx.anmelden("Anna Bauer").gj(f"/kommunikation/api/kom?cid={x['kid']}")["gesamt"], 1, "Anna (Bauleitung) sieht die Rüge")
        bernd = ctx.anmelden("Bernd Krämer")   # darf das Projekt nicht sehen
        gleich(bernd.gj(f"/kommunikation/api/kom?cid={x['kid']}")["gesamt"], 0, "Bernd sieht die Rüge eines fremden Projekts")
        zeilen = list(csv.reader(io.StringIO(bernd.get(f"/kommunikation/api/kom.csv?cid={x['kid']}").text[1:]), delimiter=";"))
        gleich(len(zeilen), 1, "Bernd bekommt die Rüge eines fremden Projekts im CSV-Export")
    finally:
        _aufraeumen(ctx, x)
