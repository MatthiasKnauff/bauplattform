"""Ablauftests: Adressen (gemeinsame Kontakte von Bautagebuch, Bauzeitenplan und Adressen-App).

Anlegen und Ändern, doppelte Namen, Duplikatsuche und Zusammenführen, Export (Excel, PDF, Visitenkarte),
Löschen nur, wenn der Kontakt nirgends verwendet wird, Änderungsverlauf mit Wiederherstellen, Rechte.
Alle Kontakte (und das Bautagebuch-Projekt für die Verwendung) legt der Test selbst an und entfernt sie wieder.
"""
import io, uuid, zipfile
from datetime import date, timedelta

from lib import finde, gleich, pruefe


# ---------------------------------------------------------------- Hilfen
def _neu(ctx, **felder):
    """Kontakt anlegen → id."""
    return ctx.admin.pj("/adressen/api/contacts", felder)["id"]


def _kontakt(ctx, cid):
    return finde(ctx.admin.gj("/adressen/api/contacts"), id=cid)


def _weg(ctx, *ids):
    for i in ids:
        ctx.admin.delete(f"/adressen/api/contacts/{i}", expect=None)


def _baustelle(ctx):
    """Eigenes Bautagebuch-Projekt (mit Koordinaten, also ohne Adresssuche im Internet) mit einem Bericht vor 7 Tagen."""
    name = ctx.name("Baustelle")
    pid = ctx.admin.pj("/bautagebuch/api/projects", {"name": name, "street": "Musterweg 1", "zip": "45127", "city": "Essen",
                                                     "lat": 51.45, "lon": 7.01, "leaders": []})["id"]
    tag = date.today() - timedelta(days=7)
    rid = ctx.admin.pj(f"/bautagebuch/api/projects/{pid}/reports", {"date": tag.isoformat()})["id"]
    return {"pid": pid, "rid": rid, "name": name, "tag": tag}


def _baustelle_weg(ctx, b):
    ctx.admin.delete(f"/bautagebuch/api/projects/{b['pid']}", expect=200)


def _domain():
    return f"rt-{uuid.uuid4().hex[:8]}.test"


# ---------------------------------------------------------------- Tests
def test_kontakt_anlegen_und_aendern(ctx):
    """Kontakt anlegen und ändern: Internetadresse mit https://, Leerzeichen bereinigt, Art (Firma/Bauherr), Prüfungen."""
    a = ctx.admin
    name = ctx.name("Trockenbau")
    cid = _neu(ctx, name=name, trade="Trockenbau", contact_person="  Max   Mustermann ", role="Bauleiter", phone="0341 123456",
               mobile="0170 1234567", email="max@rt-trockenbau.test", website="www.rt-trockenbau.test", street="Musterstraße 5",
               zip="04109", city="Leipzig", notes="Zeile 1\nZeile 2")
    try:
        k = _kontakt(ctx, cid)
        pruefe(k, "neuer Kontakt fehlt in der Liste")
        gleich(k["website"], "https://www.rt-trockenbau.test", "Internetadresse mit https://")
        gleich(k["contact_person"], "Max Mustermann", "Leerzeichen bereinigt")
        gleich((k["zip"], k["notes"]), ("04109", "Zeile 1\nZeile 2"), "PLZ mit führender Null, Notizen mit Zeilen")
        gleich((k["kind"], k["used"], k["projects"], k["site_of"]), ("firma", 0, [], ""), "Art und Verwendung")
        a.uj(f"/adressen/api/contacts/{cid}", {"city": "Dresden", "trade": "Bauherr, privat"})
        k = _kontakt(ctx, cid)
        gleich((k["city"], k["kind"], k["phone"]), ("Dresden", "bauherr", "0341 123456"), "nach dem Ändern (übrige Felder bleiben)")
        pruefe(finde(a.gj("/verwaltung/api/audit"), action="Kontakt geändert", detail=f"{name} · Gewerk, Ort"), "Änderung fehlt im Protokoll")
        a.put(f"/adressen/api/contacts/{cid}", {"email": "kaputt"}, expect=400)
        a.put(f"/adressen/api/contacts/{cid}", {"name": "   "}, expect=400)
        a.put("/adressen/api/contacts/999999999", {"city": "X"}, expect=404)
        a.post("/adressen/api/contacts", {"name": ""}, expect=400)
        a.post("/adressen/api/contacts", {"name": ctx.name("X"), "email": "a@b"}, expect=400)
        gleich(_kontakt(ctx, cid)["email"], "max@rt-trockenbau.test", "ungültige E-Mail nicht gespeichert")
    finally:
        _weg(ctx, cid)
    pruefe(_kontakt(ctx, cid) is None, "gelöschter Kontakt steht noch in der Liste")
    gleich(a.delete(f"/adressen/api/contacts/{cid}").json.get("ok"), True, "zweites Löschen ist harmlos")


def test_doppelter_name_abgelehnt(ctx):
    """Ein Name darf nur einmal vorkommen – auch in anderer Groß-/Kleinschreibung, beim Anlegen wie beim Umbenennen."""
    name = ctx.name("Doppelt")
    a_id = _neu(ctx, name=name)
    b_id = _neu(ctx, name=ctx.name("Doppelt"))
    try:
        r = ctx.admin.post("/adressen/api/contacts", {"name": name.upper()}, expect=409)
        gleich(r.json.get("error"), "Einen Kontakt mit diesem Namen gibt es schon.", "Meldung beim Anlegen")
        ctx.admin.put(f"/adressen/api/contacts/{b_id}", {"name": name.lower()}, expect=409)
        pruefe(_kontakt(ctx, b_id)["name"] != name.lower(), "Umbenennen trotz doppeltem Namen")
    finally:
        _weg(ctx, a_id, b_id)


def test_duplikate_finden_und_ausschliessen(ctx):
    """Duplikatsuche: gleiche E-Mail bzw. Telefonnummer wird erkannt; „keine Duplikate“ nimmt das Paar aus der Liste."""
    dom = _domain()
    a_id = _neu(ctx, name=ctx.name("Dachbau"), email=f"info@{dom}")
    b_id = _neu(ctx, name=ctx.name("Gartenbau"), email=f"INFO@{dom}")
    c_id = _neu(ctx, name=ctx.name("Fliesen"), phone="+49 341 9876543")
    d_id = _neu(ctx, name=ctx.name("Estrich"), phone="0341 98765-43")
    try:
        gruppen = ctx.admin.gj("/adressen/api/contacts/duplikate")
        g1 = next((g for g in gruppen if {a_id, b_id} <= set(g["ids"])), None)
        pruefe(g1, "gleiche E-Mail nicht als Duplikat erkannt")
        pruefe("gleiche E-Mail" in g1["grund"], f"Grund: {g1['grund']}")
        gleich({k["id"] for k in g1["kontakte"]} >= {a_id, b_id}, True, "Kontakte der Gruppe mitgeliefert")
        g2 = next((g for g in gruppen if {c_id, d_id} <= set(g["ids"])), None)
        pruefe(g2 and "gleiche Telefonnummer" in g2["grund"], f"+49 341 … und 0341 … nicht als gleiche Nummer erkannt: {g2}")
        ctx.admin.pj("/adressen/api/contacts/keine-duplikate", {"ids": [a_id, b_id]})
        gruppen = ctx.admin.gj("/adressen/api/contacts/duplikate")
        pruefe(not any({a_id, b_id} <= set(g["ids"]) for g in gruppen), "als verschieden markiertes Paar wird weiter vorgeschlagen")
        pruefe(any({c_id, d_id} <= set(g["ids"]) for g in gruppen), "anderes Paar ist mit verschwunden")
    finally:
        _weg(ctx, a_id, b_id, c_id, d_id)


def test_zusammenfuehren(ctx):
    """Zusammenführen: Verweise im Bautagebuch wandern zum bleibenden Kontakt, gewählte Werte werden übernommen."""
    b = _baustelle(ctx)
    ziel = _neu(ctx, name=ctx.name("Maler"), phone="0341 111")
    quelle_name = ctx.name("Malerbetrieb")
    quelle = _neu(ctx, name=quelle_name, email="kontakt@" + _domain())
    try:
        e = ctx.admin.pj(f"/bautagebuch/api/reports/{b['rid']}/items", {"kind": "anwesende", "text": quelle_name, "activity": "Streichen", "headcount": 2})
        gleich(e.get("contact_id"), quelle, "Anwesende Firma mit dem Kontakt verknüpft")
        gleich(_kontakt(ctx, quelle)["used"], 1, "Verwendung vor dem Zusammenführen")
        ctx.admin.post("/adressen/api/contacts/zusammenfuehren", {"ziel": ziel, "quellen": []}, expect=400)
        neue_mail = _kontakt(ctx, quelle)["email"]
        r = ctx.admin.pj("/adressen/api/contacts/zusammenfuehren", {"ziel": ziel, "quellen": [quelle], "felder": {"email": neue_mail}})
        gleich(r.get("n"), 1, "ein Kontakt zusammengeführt")
        pruefe(_kontakt(ctx, quelle) is None, "zusammengeführter Kontakt besteht noch")
        k = _kontakt(ctx, ziel)
        gleich((k["email"], k["phone"], k["used"], k["projects"]), (neue_mail, "0341 111", 1, [b["name"]]), "bleibender Kontakt")
    finally:
        _baustelle_weg(ctx, b)
        _weg(ctx, ziel, quelle)


def test_export_excel_und_pdf(ctx):
    """Export der gefilterten Auswahl als Excel (nur die gewählten Zeilen) und als PDF-Adressverzeichnis."""
    n1, n2 = ctx.name("Export"), ctx.name("Export")
    a_id, b_id = _neu(ctx, name=n1, zip="01067", city="Dresden"), _neu(ctx, name=n2)
    try:
        x = ctx.admin.get(f"/adressen/api/contacts/export.xlsx?ids={a_id},{b_id}&filter=Test").ist_xlsx()
        z = zipfile.ZipFile(io.BytesIO(x.body))
        blatt = z.read("xl/worksheets/sheet1.xml").decode()
        texte = blatt + (z.read("xl/sharedStrings.xml").decode() if "xl/sharedStrings.xml" in z.namelist() else "")
        gleich(blatt.count("<row "), 3, "Kopfzeile + 2 gewählte Kontakte")
        for t in (n1, n2, "Firma / Name", "In Berichten verwendet", "01067"):
            pruefe(t in texte, f"„{t}“ fehlt in der Excel-Datei")
        alle = zipfile.ZipFile(io.BytesIO(ctx.admin.get("/adressen/api/contacts/export.xlsx").ist_xlsx().body))
        pruefe(alle.read("xl/worksheets/sheet1.xml").decode().count("<row ") >= 13, "ohne Auswahl fehlen Kontakte (12 Firmen der Testdaten)")
        ctx.admin.get(f"/adressen/api/contacts/export.pdf?ids={a_id},{b_id}&filter=Test").ist_pdf()
        ctx.admin.get("/adressen/api/contacts/export.pdf").ist_pdf()
    finally:
        _weg(ctx, a_id, b_id)


def test_visitenkarte(ctx):
    """Visitenkarte (vCard 3.0): alle Felder, Sonderzeichen maskiert; ohne Ansprechpartner trägt sie den Firmennamen."""
    name = ctx.name("Karte") + ", Söhne & Co"
    mail = "max@" + _domain()
    cid = _neu(ctx, name=name, trade="Maler", contact_person="Max Mustermann", role="Polier", phone="0341 1", mobile="0170 2",
               email=mail, website="rt.test", street="Musterstraße 5", zip="04109", city="Leipzig", notes="Termin; Montag")
    try:
        a = ctx.admin.get(f"/adressen/api/contacts/{cid}.vcf")
        pruefe(a.ctype.startswith("text/vcard"), f"Inhaltstyp {a.ctype}")
        soll = ["BEGIN:VCARD", "VERSION:3.0", "FN:Max Mustermann", "ORG:" + name.replace(",", "\\,"), "N:Mustermann;Max;;;", "TITLE:Polier",
                "TEL;TYPE=WORK,VOICE:0341 1", "TEL;TYPE=CELL:0170 2", f"EMAIL;TYPE=WORK:{mail}", "URL:https://rt.test",
                "ADR;TYPE=WORK:;;Musterstraße 5;Leipzig;;04109;", "NOTE:Maler · Termin\\; Montag", "END:VCARD"]
        gleich(a.text, "\r\n".join(soll) + "\r\n", "Inhalt der Visitenkarte")
        ctx.admin.uj(f"/adressen/api/contacts/{cid}", {"contact_person": ""})
        z = ctx.admin.get(f"/adressen/api/contacts/{cid}.vcf").text.split("\r\n")
        pruefe("FN:" + name.replace(",", "\\,") in z and "N:;;;;" in z, f"ohne Ansprechpartner: {z[:5]}")
        ctx.admin.get("/adressen/api/contacts/999999999.vcf", expect=404)
    finally:
        _weg(ctx, cid)


def test_loeschen_nur_wenn_unbenutzt(ctx):
    """Löschen wird abgelehnt, solange der Kontakt in einem Bericht steht oder Baustellenadresse ist – danach geht es."""
    a = ctx.admin
    b = _baustelle(ctx)
    k_name = ctx.name("Gerüstbau")
    k = _neu(ctx, name=k_name, trade="Gerüst")
    s_name = ctx.name("Baustellenadresse")
    s = None
    try:
        item = a.pj(f"/bautagebuch/api/reports/{b['rid']}/items", {"kind": "anwesende", "text": k_name, "activity": "Gerüst stellen", "headcount": 2})
        gleich(item.get("contact_id"), k, "Kontakt mit dem Bericht verknüpft")
        x = _kontakt(ctx, k)
        gleich((x["used"], x["projects"]), (1, [b["name"]]), "Verwendung im Bautagebuch")
        r = a.delete(f"/adressen/api/contacts/{k}", expect=409).json
        gleich(r.get("error"), f"„{k_name}“ wird noch verwendet (in 1 Eintrag des Bautagebuchs) und kann deshalb nicht gelöscht werden.", "Meldung")
        gleich(r.get("orte"), [{"app": "bautagebuch", "frag": f"#projekt={b['pid']}&bericht={b['rid']}",
                                "label": f"Bericht Nr. 1 vom {b['tag']:%d.%m.%Y} · {b['name']}"}], "wo der Kontakt verwendet wird")
        pruefe(_kontakt(ctx, k), "Kontakt trotz Verwendung gelöscht")
        # Baustellenadresse des Projekts als Kontakt übernehmen
        s = a.pj(f"/bautagebuch/api/projects/{b['pid']}/contact", {"accept": True, "name": s_name})["id"]
        x = _kontakt(ctx, s)
        gleich((x["kind"], x["site_of"], x["street"], x["zip"], x["city"]), ("baustelle", b["name"], "Musterweg 1", "45127", "Essen"), "Baustellenadresse")
        r = a.delete(f"/adressen/api/contacts/{s}", expect=409).json
        pruefe(f"als Baustellenadresse des Projekts „{b['name']}“" in r.get("error", ""), f"Meldung: {r}")
        # Eintrag im Bericht entfernen → jetzt darf der Kontakt weg
        a.delete(f"/bautagebuch/api/items/{item['id']}", expect=200)
        a.delete(f"/adressen/api/contacts/{k}", expect=200)
        pruefe(_kontakt(ctx, k) is None, "Kontakt nach dem Löschen noch da")
    finally:
        _baustelle_weg(ctx, b)
        _weg(ctx, k)
        if s:   # Projekt gelöscht → die Baustellenadresse ist frei und darf weg
            a.delete(f"/adressen/api/contacts/{s}", expect=200)
    pruefe(s is None or _kontakt(ctx, s) is None, "Baustellenadresse nach dem Löschen noch da")


def test_aenderungsverlauf_und_wiederherstellen(ctx):
    """Jede Änderung legt einen Stand an; ein alter Stand lässt sich wiederherstellen – auch nach dem Löschen."""
    a = ctx.admin
    name = ctx.name("Verlauf")
    cid = _neu(ctx, name=name, phone="0201 111")
    bereich = f"kontakt:{cid}"
    try:
        a.uj(f"/adressen/api/contacts/{cid}", {"phone": "0201 222"})
        v = a.gj(f"/adressen/api/bp/versionen?bereich={bereich}")["versionen"]
        gleich(len(v), 2, "Stände nach Anlegen und einer Änderung")
        gleich(v[0]["aenderungen"], ["Telefon: „0201 111“ → „0201 222“"], "Änderung in Worten")
        gleich((v[1]["aenderungen"], v[0]["wer"]), (["angelegt"], "Test-Admin"), "erster Stand")
        gleich(a.gj(f"/adressen/api/bp/versionen/{v[1]['id']}/vergleich")["aenderungen"], ["Telefon: „0201 222“ → „0201 111“"], "Vergleich")
        r = a.pj(f"/adressen/api/bp/versionen/{v[1]['id']}/wiederherstellen")
        gleich(r["versionen"][0]["art"], "wiederhergestellt", "neuer Stand beim Wiederherstellen")
        gleich(_kontakt(ctx, cid)["phone"], "0201 111", "Telefon wiederhergestellt")
        r = a.pj("/adressen/api/bp/versionen", {"bereich": bereich, "name": "RT vor dem Löschen"})
        gleich((r["versionen"][0]["name"], r["versionen"][0]["art"]), ("RT vor dem Löschen", "benannt"), "Stand benannt")
        a.post("/adressen/api/bp/versionen", {"bereich": bereich, "name": "  "}, expect=400)
        a.get("/adressen/api/bp/versionen?bereich=gibtsnicht:1", expect=404)
        # gelöschten Kontakt aus dem Verlauf zurückholen (gleiche Nummer)
        a.delete(f"/adressen/api/contacts/{cid}", expect=200)
        v = a.gj(f"/adressen/api/bp/versionen?bereich={bereich}")["versionen"]
        gleich(v[0]["aenderungen"], ["gelöscht"], "Löschen im Verlauf")
        benannt = finde(v, name="RT vor dem Löschen")
        a.pj(f"/adressen/api/bp/versionen/{benannt['id']}/wiederherstellen")
        k = _kontakt(ctx, cid)
        pruefe(k, "gelöschter Kontakt nicht wiederhergestellt")
        gleich((k["name"], k["phone"]), (name, "0201 111"), "wiederhergestellter Kontakt")
    finally:
        _weg(ctx, cid)


def test_rechte_adressen(ctx):
    """Nur Benutzer mit der App „Adressen“ sehen die Kontakte (Bernd: nur Bautagebuch, Clara: nur Bauzeitenplan)."""
    ctx.gast().get("/adressen/api/contacts", expect=401)
    for wer in ("Bernd Krämer", "Clara Wolf"):
        c = ctx.anmelden(wer)
        c.get("/adressen/api/contacts", expect=403)
        c.get("/adressen/api/contacts/export.xlsx", expect=403)
    ctx.anmelden("Anna Bauer").get("/adressen/api/contacts", expect=200)


def test_kontaktmaske_ein_baustein(ctx):
    """Kontaktmaske gibt es genau einmal (bp/kontakt.js) – Adressen und jede andere App laden denselben Baustein."""
    for app in ("adressen", "ava"):
        t = ctx.admin.get(f"/{app}/bp/kontakt.js").text
        pruefe("window.bpKontakt" in t and "data-mailwahl" in t, f"{app}: Baustein kontakt.js fehlt")
    s = ctx.admin.get("/adressen/").text
    pruefe("bp/kontakt.js" in s and "function wtZeile" not in s, "Adressen benutzt noch eine eigene Maske")
