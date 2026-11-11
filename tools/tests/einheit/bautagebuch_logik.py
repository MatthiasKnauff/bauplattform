"""Rechentests Bautagebuch – reine Logik ohne Datenbank: Suche (Umlaute, ß), Bauleiter-Rechte, Namensschema der PDFs,
Kontakt-Dubletten, Kennwortregeln, Datum/Uhrzeit von Terminen, Versionsverlauf, PDF-Datum."""
from lib import gleich, pruefe

from core import access, auth, bt_pdf, scheme, search, versions
from bpcore import contacts as kontakte
from modules import items


# ------------------------------------------------------------------------------------------------ Suche
def test_suche_falten():
    """Suche: Groß-/Kleinschreibung und Akzente werden entfernt, ae/oe/ue/ss gelten wie ä/ö/ü/ß."""
    gleich(search.fold("Mängel ÜBER Größe"), "mangel uber große", "fold")
    gleich(len(search.fold("Außenwand Süd")), len("Außenwand Süd"), "Länge bleibt gleich (für die Markierung)")
    gleich(search.loose("aussenwand haeser"), "ausenwand haser", "loose")
    gleich(search.loose("außenwand"), "ausenwand", "loose ß")
    gleich(search.tokens("  Riss   AUSSENWAND "), ["riss", "aussenwand"], "Suchwörter")
    gleich(search.tokens("   "), [], "leere Suche")


def test_suche_treffer():
    """Suche: alle Wörter müssen vorkommen (UND); Häser findet Haeser, Außenwand findet Aussenwand."""
    felder = ["Riss in der Außenwand", "Firma Häser"]
    gleich(search.hit(felder, search.tokens("aussenwand")), "Riss in der Außenwand", "ss findet ß")
    gleich(search.hit(felder, search.tokens("haeser")), "Firma Häser", "ae findet ä")
    gleich(search.hit(felder, search.tokens("riss haser")), "Riss in der Außenwand", "zwei Wörter in verschiedenen Feldern")
    gleich(search.hit(felder, search.tokens("riss dach")), None, "ein Wort fehlt → kein Treffer")
    gleich(search.hit(["Haeser"], search.tokens("Häser")), "Haeser", "ä findet ae")
    gleich(search.hit([""], search.tokens("x")), None, "leeres Feld")


def test_suche_ausschnitt():
    """Suche: Textausschnitt markiert die Fundstelle."""
    gleich(search.snippet("Riss im Putz", ["putz"]), [["Riss im ", 0], ["Putz", 1]], "Fundstelle am Ende")
    gleich(search.snippet("Kein Treffer hier", ["dach"]), [["Kein Treffer hier", 0]], "ohne Fundstelle: Anfang des Texts")
    lang = "a " * 100 + "Bewehrung" + " b" * 100
    s = search.snippet(lang, ["bewehrung"])
    gleich(s[0], ["…", 0], "langer Text beginnt mit Auslassung")
    gleich(s[-1], ["…", 0], "langer Text endet mit Auslassung")
    pruefe(["Bewehrung", 1] in s, f"Fundstelle nicht markiert: {s}")
    gleich(search.de("2026-10-28"), "28.10.2026", "Datum deutsch")
    gleich(search.de(""), "", "leeres Datum")


# ------------------------------------------------------------------------------------------------ Rechte
def test_bauleiter_liste():
    """Bauleiter-Liste aus der Datenbank lesen: nur Zahlen, kaputte Einträge ergeben eine leere Liste."""
    gleich(access.ids_of('[3, "7", "x", 2.5]'), [3, 7], "nur ganze Zahlen")
    gleich(access.ids_of(""), [], "leer")
    gleich(access.ids_of(None), [], "nichts")
    gleich(access.ids_of("kaputt"), [], "kein JSON")
    gleich(access.ids_of('{"a": 1}'), [], "kein Liste")


def test_bauleiter_rechte():
    """Projekt sehen: Administrator immer, ohne Bauleiter alle, sonst nur eingetragene Bauleiter."""
    admin, anna, bernd = {"id": 1, "is_admin": 1}, {"id": 2, "is_admin": 0}, {"id": 3, "is_admin": 0}
    gleich(access.allowed([], bernd), True, "ohne Bauleiter: alle")
    gleich(access.allowed([2], anna), True, "eingetragene Bauleiterin")
    gleich(access.allowed([2], bernd), False, "nicht eingetragen")
    gleich(access.allowed([2, 3], bernd), True, "zweiter Bauleiter")
    gleich(access.allowed([2], admin), True, "Administrator sieht alles")


# ------------------------------------------------------------------------------------------------ Namensschema der PDFs
def test_namensschema_datum():
    """Namensschema: Datumsformate füllen und erkennen, unmögliche Daten verwerfen."""
    gleich(scheme.fmt_date("2026-11-02", "TT.MM.JJJJ"), "02.11.2026", "TT.MM.JJJJ")
    gleich(scheme.fmt_date("2026-11-02", "JJJJ.MM.TT"), "2026.11.02", "JJJJ.MM.TT")
    gleich(scheme.fmt_date("2026-11-02", "TT.MM.JJ"), "02.11.26", "TT.MM.JJ")
    gleich(scheme.fmt_date("2026-11-02", "JJJJMMTT"), "20261102", "JJJJMMTT")
    rx = dict(scheme.DATES)
    gleich(scheme._parse("A489 02.11.2026 Bautagebuch", "TT.MM.JJJJ", rx["TT.MM.JJJJ"]), "2026-11-02", "erkannt")
    gleich(scheme._parse("Bericht 20261102", "JJJJMMTT", rx["JJJJMMTT"]), "2026-11-02", "ohne Trennzeichen")
    gleich(scheme._parse("Bericht 02.13.2026", "TT.MM.JJJJ", rx["TT.MM.JJJJ"]), None, "Monat 13")
    gleich(scheme._parse("Bericht 32.11.2026", "TT.MM.JJJJ", rx["TT.MM.JJJJ"]), None, "Tag 32")
    gleich(scheme._parse("ohne Datum", "TT.MM.JJJJ", rx["TT.MM.JJJJ"]), None, "kein Datum")


def test_namensschema_lernen():
    """Namensschema: aus zwei von Hand umbenannten PDFs wird die Vorlage gelernt und richtig gefüllt."""
    namen = ["A489 12_02.11.2026 Bautagebuch.pdf", "A489 13_03.11.2026 Bautagebuch.pdf", "A489_BT_2026-11-04.pdf"]
    gleich(scheme.is_default("A489_BT_2026-11-04.pdf", "A489", "pdf"), True, "Standardname der App")
    gleich(scheme.is_default("A489 12_02.11.2026 Bautagebuch.pdf", "A489", "pdf"), False, "umbenannt")
    t = scheme.learn(namen, "A489", "pdf")
    gleich(t, "{kuerzel} {nr}_{datum:TT.MM.JJJJ} Bautagebuch", "gelernte PDF-Vorlage")
    gleich(scheme.fill(t, "A489", "2026-11-05", 14), "A489 14_05.11.2026 Bautagebuch", "Vorlage gefüllt")
    gleich(scheme.learn(namen[:1], "A489", "pdf"), None, "ein einzelner Name reicht nicht")
    gleich(scheme._tpl("A489 12_02.11.2026 Bautagebuch_old2.pdf", "A489", "pdf"), None, "_old-Kopien zählen nicht")
    d = scheme.learn(["A489 2026.11.02 Grundierung", "A489 2026.11.03 Estrich"], "A489", "dir")
    gleich(d, "{kuerzel} {datum:JJJJ.MM.TT}{rest}", "gelernte Ordner-Vorlage")
    gleich(scheme.fill(d, "A489", "2026-11-05", rest=" Dach"), "A489 2026.11.05 Dach", "Ordnername")
    gleich(scheme.fill("{kuerzel}: {nr}/{datum:TT.MM.JJJJ}", "A489", "2026-11-05", 3), "A489 3 05.11.2026", "unerlaubte Zeichen im Dateinamen ersetzt")
    gleich(scheme.code_of({"name": "A541 Neubau Kita"}), "A541", "Projektkürzel")
    gleich(scheme.code_of({"name": "  "}), "Projekt", "ohne Namen")


# ------------------------------------------------------------------------------------------------ Kontakte
def test_kontakte_vergleichsname():
    """Dubletten-Suche: Rechtsformen (GmbH, Fa., & Co. KG) und Umlaute zählen beim Namensvergleich nicht."""
    gleich(kontakte.name_norm("Fa. Müller GmbH & Co. KG"), "muller", "Rechtsform entfernt")
    gleich(kontakte.name_norm("Rohbau Schulte & Söhne"), "rohbau schulte sohne", "& und Umlaut")
    gleich(kontakte.name_norm("Straßenbau Groß"), "strassenbau gross", "ß → ss")
    gleich(kontakte.name_norm("Elektro Wilhelmi"), kontakte.name_norm("ELEKTRO  wilhelmi GmbH"), "gleiche Firma")


def test_kontakte_telefon_domain():
    """Dubletten-Suche: Telefonnummern mit Ländervorwahl und Internetseiten werden vereinheitlicht."""
    gleich(kontakte._ziffern("+49 201 4711-10"), "0201471110", "+49")
    gleich(kontakte._ziffern("0049 (201) 4711-10"), "0201471110", "0049")
    gleich(kontakte._ziffern("0201 4711-10"), "0201471110", "national")
    gleich(kontakte._ziffern("123"), "", "zu kurz")
    gleich(kontakte._domain("https://www.erdbau-hoffmann.test/kontakt"), "erdbau-hoffmann.test", "Domain")
    gleich(kontakte._domain("keine Seite"), "", "keine Domain")
    gleich(kontakte.gantt_id({"id": 12, "extra": "{}"}), "c12", "ID im Bauzeitenplan")
    gleich(kontakte.gantt_id({"id": 12, "extra": '{"gid": "f7"}'}), "f7", "eigene ID im Bauzeitenplan")
    gleich(kontakte.blocked_message("Gerüstbau Ruhr", ["in 2 Einträgen des Bautagebuchs", "im Bauzeitenplan „T101“"]),
           "„Gerüstbau Ruhr“ wird noch verwendet (in 2 Einträgen des Bautagebuchs; im Bauzeitenplan „T101“) und kann deshalb nicht gelöscht werden.",
           "Meldung beim Löschen")


# ------------------------------------------------------------------------------------------------ Konto, Termine
def test_kennwort_regeln():
    """Kennwort: mindestens 8 Zeichen, anders als das alte, nicht der eigene Name oder „passwort“."""
    u = {"name": "Anna Bauer"}
    pruefe("mindestens 8" in (auth.check_new("kurz", u) or ""), "zu kurzes Kennwort nicht abgelehnt")
    pruefe("unterscheiden" in (auth.check_new("Testdaten1", u, "Testdaten1") or ""), "altes Kennwort nicht abgelehnt")
    pruefe("zu einfach" in (auth.check_new("anna bauer", u) or ""), "eigener Name nicht abgelehnt")
    pruefe("zu einfach" in (auth.check_new("Passwort", u) or ""), "„Passwort“ nicht abgelehnt")
    gleich(auth.check_new("Bauleitung2026!", u, "Testdaten1"), None, "gutes Kennwort")
    gleich(auth.valid_email("anna@beispiel.test"), True, "gültige E-Mail")
    for e in ("anna@", "anna beispiel.test", "anna@beispiel", ""):
        gleich(auth.valid_email(e), False, f"ungültige E-Mail {e!r}")


def test_termin_datum_uhrzeit():
    """Erledigungstermin: Datum nur als JJJJ-MM-TT, Uhrzeit nur 00:00–23:59."""
    for d in ("2026-05-20", "2026-12-31"):
        pruefe(items.DATE.match(d), f"Datum {d} abgelehnt")
    for d in ("20.05.2026", "2026-5-20", "morgen", "2026-05-20x"):
        pruefe(not items.DATE.match(d), f"Datum {d} angenommen")
    for t in ("00:00", "09:00", "23:59"):
        pruefe(items.TIME.match(t), f"Uhrzeit {t} abgelehnt")
    for t in ("24:00", "9:00", "12:60", "12.30"):
        pruefe(not items.TIME.match(t), f"Uhrzeit {t} angenommen")


# ------------------------------------------------------------------------------------------------ Versionen, PDF
def test_versionen_pruefsumme():
    """Versionsverlauf: gleicher Inhalt = gleiche Prüfsumme (Reihenfolge der Felder egal), Änderung = neue Prüfsumme."""
    a = {"report": {"weather": "Sonnig", "temp": "14"}, "items": [{"id": 1, "text": "Riss"}]}
    b = {"items": [{"text": "Riss", "id": 1}], "report": {"temp": "14", "weather": "Sonnig"}}
    gleich(versions.digest(a), versions.digest(b), "Reihenfolge egal")
    c = {"report": {"weather": "Regen", "temp": "14"}, "items": [{"id": 1, "text": "Riss"}]}
    pruefe(versions.digest(a) != versions.digest(c), "Änderung nicht erkannt")
    gleich(versions._clean({"id": 1, "created": "x", "updated": "y", "text": "t"}), {"id": 1, "text": "t"}, "Zeitstempel zählen nicht")


def test_versionen_welcher_bericht():
    """Versionsverlauf: Welcher Bericht wird durch eine Anfrage verändert?"""
    gleich(versions.report_of(None, "GET", "/api/reports/5", None), None, "Lesen ändert nichts")
    gleich(versions.report_of(None, "PUT", "/api/reports/5", {}), 5, "Bericht ändern")
    gleich(versions.report_of(None, "POST", "/api/reports/5/items", {}), 5, "Eintrag hinzufügen")
    gleich(versions.report_of(None, "DELETE", "/api/reports/5", None), None, "Bericht löschen (keine Version mehr)")
    gleich(versions.report_of(None, "POST", "/api/reports/5/versions", {}), None, "Versionsverwaltung selbst")
    gleich(versions.report_of(None, "POST", "/api/items/restore", {"report_id": "7"}), 7, "Eintrag wiederherstellen")
    gleich(versions.report_of(None, "POST", "/api/items/restore", {"report_id": "x"}), None, "kaputte Angabe")
    gleich(versions.report_of(None, "PUT", "/api/projects/3", {}), None, "Projekt ist kein Bericht")


def test_pdf_datum_zeichen():
    """PDF: Datum deutsch mit führenden Nullen, nicht darstellbare Zeichen werden ersetzt."""
    gleich(bt_pdf.de_date("2026-3-5"), "05.03.2026", "führende Nullen")
    gleich(bt_pdf.de_date("2026-10-28"), "28.10.2026", "Datum")
    gleich(bt_pdf.de_date("gestern"), "gestern", "kein Datum")
    gleich(bt_pdf.plain("Größe 5 € – ok ✓"), "Größe 5 € – ok ?", "Zeichen außerhalb der PDF-Schrift")
    gleich(bt_pdf.safe("a<b\nc"), "a&lt;b<br/>c", "HTML-Zeichen und Zeilenumbruch")


# ------------------------------------------------------------------------------------------------ Nachts aufräumen
def test_aufraeumen_nachts_behalten():
    """Nachts aufräumen: eingetragene Zahl gilt, 0 (= alle behalten) wird durch store_auto_keep ersetzt (Vorgabe 2); aus mit 0."""
    from core import aufraeumen
    c = aufraeumen.nachts_conf({"store_keep_old_pdf": "3", "store_keep_old_photos": "0"})
    gleich((c["store_keep_old_pdf"], c["store_keep_old_photos"]), ("3", "2"), "Vorgabe 2 statt 0")
    c = aufraeumen.nachts_conf({"store_keep_old_pdf": "", "store_auto_keep": "5"})
    gleich((c["store_keep_old_pdf"], c["store_keep_old_photos"]), ("5", "5"), "eigene Zahl für die Nacht")
    pruefe(aufraeumen.an({}) and not aufraeumen.an({"store_auto_cleanup": "0"}), "an/aus")


# ------------------------------------------------------------------------------------------------ Projektordner angleichen
def test_ordnerschema_vergleich():
    """Projektordner gegen die Vorlage: Kürzel/Schreibweise umbenennen, fehlende anlegen, Vorlagedateien kopieren (nicht vorgewählt),
    frei benannte Gewerke-Ordner nur mit Kürzel, Ordner an falscher Stelle verschieben, Fotos-Tagesordner bleiben frei, Reihenfolge."""
    from core import ordnerschema as o
    D = lambda **k: {"dir": True, "kinder": k}   # noqa: E731
    F = {"dir": False, "kinder": {}, "quelle": ["x"]}
    muster = {"A000 2. Ausschreibung": D(**{"A000 Angebote": D(), "Thumbs.db": F}),
              "A000 4. Durchführung": D(**{"A000 Rechnungsprüfung": D(**{"A000 Gewerk 1": D(), "A000 Gewerk 2": D()})}),
              "A000 6. interne Orga": D(**{"A000 Adressdatei.xlsx": F}),
              "A000 8. Fotos + Bautagebuch": D(**{"A000 Fotos": D()})}
    ist = {"A483 2 Ausschreibung": D(**{"A000 Angebote": D(), "alt": D(a=F)}),
           "A483 Rechnungspruefung": D(**{"Maler": D()}),
           "A483 4. Durchführung": D(),
           "A483 8. Fotos + Bautagebuch": D(**{"A483 Fotos": D(**{"2026-10-01 Rohbau": D()})})}
    gleich(o.muster_kuerzel(muster), "A000", "Kürzel der Vorlage")
    S = {(s["art"], "/".join(s["pfad"])): s for s in o.vergleichen(muster, ist, "A483")}
    gleich(S[("umbenennen", "A483 2 Ausschreibung")]["neu"], "A483 2. Ausschreibung", "Nummer und Schreibweise")
    gleich(S[("umbenennen", "A483 2 Ausschreibung/A000 Angebote")]["neu"], "A483 Angebote", "Kürzel der Vorlage ersetzt")
    pruefe(("aufloesen", "A483 2 Ausschreibung/alt") in S and not S[("aufloesen", "A483 2 Ausschreibung/alt")]["vor"], "zusätzlicher Unterordner: auflösen, nicht vorgewählt")
    gleich(S[("verschieben", "A483 Rechnungspruefung")]["ziel"], ["A483 4. Durchführung", "A483 Rechnungsprüfung"], "an die Stelle des Musters")
    pruefe(("anlegen", "A483 4. Durchführung/A483 Rechnungsprüfung") in S, "fehlender Ordner wird angelegt")
    pruefe(not any("Gewerk" in k[1] for k in S), "Platzhalter „Gewerk 1“ wird nicht angelegt")
    pruefe(not S[("kopieren", "A483 6. interne Orga/A483 Adressdatei.xlsx")]["vor"], "Vorlagedatei kopieren: nicht vorgewählt")
    pruefe(not any("Rohbau" in k[1] or "Thumbs" in k[1] for k in S), "Fotos-Tagesordner und Thumbs.db bleiben unberührt")
    R = [s["art"] for s in o.reihenfolge(list(S.values()))]
    gleich(R, sorted(R, key=["umbenennen", "aufloesen", "verschieben", "anlegen", "kopieren"].index), "Reihenfolge der Schritte")
    gleich(o.umgerechnet(["A483 2 Ausschreibung", "alt"], {("A483 2 Ausschreibung",): "A483 2. Ausschreibung"}), ["A483 2. Ausschreibung", "alt"], "Pfad nach Umbenennen")
    gleich(o.frei("LV.pdf", {"LV.pdf", "LV (2).pdf"}), "LV (3).pdf", "freier Name")
    S2 = {"/".join(x["pfad"]): x for x in o.vergleichen(muster, {"A483 2. Ausschreibung": D(**{"A483 Angebote": D(**{"A480 Angebot Maler.pdf": F, "Angebot Elektro.pdf": F, "IMG_0001.jpg": F})})}, "A483")}
    x = S2.get("A483 2. Ausschreibung/A483 Angebote/A480 Angebot Maler.pdf")
    pruefe(x and x["neu"] == "A483 Angebot Maler.pdf" and not x["vor"], f"Datei mit fremdem Kürzel: umbenennen vorschlagen, nicht vorgewählt ({x})")
    gleich(S2["A483 2. Ausschreibung/A483 Angebote/Angebot Elektro.pdf"]["neu"], "A483 Angebot Elektro.pdf", "Datei ohne Kürzel: Kürzel davor")
    pruefe("A483 2. Ausschreibung/A483 Angebote/IMG_0001.jpg" not in S2, "Fotos behalten ihren Namen")
    gleich(o.vergleichen(muster, {"A483 2. Ausschreibung": D(**{"A483 Angebote": D()}), "A483 4. Durchführung": D(**{"A483 Rechnungsprüfung": D(**{"A483 Maler": D()})}),
                                  "A483 6. interne Orga": D(**{"A483 Adressdatei.xlsx": F}), "A483 8. Fotos + Bautagebuch": D(**{"A483 Fotos": D()})}, "A483"), [], "passt: nichts zu tun")
