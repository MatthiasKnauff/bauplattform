"""E-Mail-Vorlagen der Bauplattform (vom Administrator anpassbar, mit Platzhaltern in geschweiften Klammern)."""
import re

DEF = {
    "maengelruege": {"name": "Mängelrüge", "betreff": "Mängelrüge – {bauvorhaben}",
                     "text": "Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie unsere Mängelrüge zum Bauvorhaben {bauvorhaben}. "
                             "Bitte beseitigen Sie die aufgeführten Mängel bis zum {frist} und zeigen Sie uns die Beseitigung schriftlich an.\n\n"
                             "Mit freundlichen Grüßen\n\n{signatur}"},
    "terminruege": {"name": "Terminrüge", "betreff": "Aufforderung zur Abhilfe – {bauvorhaben}",
                    "text": "Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie unsere Aufforderung zur Abhilfe nach § 5 Abs. 3 VOB/B zum Bauvorhaben {bauvorhaben}. "
                            "Bitte nehmen Sie die Arbeiten bis zum {frist} mit ausreichender Besetzung wieder auf und bestätigen Sie uns dies kurzfristig.\n\n"
                            "Mit freundlichen Grüßen\n\n{signatur}"},
    "planversand": {"name": "Planversand", "betreff": "Pläne {bauvorhaben}",
                    "text": "Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie folgende Pläne zum Bauvorhaben {bauvorhaben}:\n\n{planliste}\n\n"
                            "Bitte prüfen Sie die Unterlagen und arbeiten Sie ab sofort nur noch nach diesen Planständen. "
                            "Bei Unklarheiten melden Sie sich bitte rechtzeitig vor Ausführung.\n\nMit freundlichen Grüßen\n\n{signatur}"},
    "angebotsanfrage": {"name": "Angebotsanfrage (LV-Versand)", "betreff": "Angebotsanfrage {lv} – {projekt}",
                        "text": "{anrede}\n\nfür das Bauvorhaben {bauvorhaben} bitten wir um Ihr Angebot für {lv}. Das Leistungsverzeichnis liegt als PDF "
                                "und als GAEB-Datei (X83) bei.\n\nBitte teilen Sie uns bis {rueckmeldung} kurz mit, ob Sie ein Angebot abgeben.\n"
                                "Abgabe des Angebots bis {abgabe}.\n\nMit freundlichen Grüßen\n\n{signatur}"},
    "termin": {"name": "Kalendertermin", "betreff": "{titel}",
               "text": "{text}\n\nProjekt: {projekt}\nAus der Bauplattform ({buero})."},
}
PLATZHALTER = {
    "maengelruege": ["firma", "bauvorhaben", "projekt", "frist", "anzahl", "absender", "buero", "datum", "signatur"],
    "terminruege": ["firma", "bauvorhaben", "projekt", "frist", "anzahl", "absender", "buero", "datum", "signatur"],
    "planversand": ["firma", "bauvorhaben", "projekt", "planliste", "anzahl", "absender", "buero", "datum", "signatur"],
    "angebotsanfrage": ["anrede", "firma", "lv", "gewerk", "bauvorhaben", "projekt", "abgabe", "rueckmeldung", "absender", "buero", "datum", "signatur"],
    "termin": ["titel", "text", "projekt", "datum", "uhrzeit", "absender", "buero"],
}
ERKL = {"anrede": "persönliche Anrede je Firma („Sehr geehrter Herr …,“ – sonst „Sehr geehrte Damen und Herren,“)", "lv": "LV-Nummer und Bezeichnung",
        "gewerk": "Gewerk des LV", "abgabe": "Abgabe des Angebots bis", "rueckmeldung": "Rückmeldung bis (nehmen Sie teil?)", "firma": "Name der Firma", "bauvorhaben": "Projekt mit Adresse", "projekt": "Projektname", "frist": "Frist (TT.MM.JJJJ)",
        "anzahl": "Anzahl (Mängel, Tage bzw. Pläne)", "absender": "Name der Absender:in", "buero": "Büroname", "datum": "heutiges Datum bzw. Termin",
        "titel": "Titel der Erinnerung", "signatur": "E-Mail-Signatur der Absender:in (Mein Konto)", "planliste": "Liste der Pläne (Nummer, Index, Titel, Datei)", "text": "Text der Erinnerung", "uhrzeit": "Uhrzeit"}


def alle(c):
    S = {r["key"]: r["value"] for r in c.execute("SELECT key, value FROM settings WHERE key LIKE 'tpl\\_%'")}
    out = {}
    for k, d in DEF.items():
        out[k] = {"name": d["name"], "betreff": S.get(f"tpl_{k}_betreff") or d["betreff"], "text": S.get(f"tpl_{k}_text") or d["text"],
                  "standard": not (S.get(f"tpl_{k}_betreff") or S.get(f"tpl_{k}_text")), "platzhalter": PLATZHALTER[k]}
    return out


def setzen(c, k, betreff, text):
    for f, v in (("betreff", betreff), ("text", text)):
        key = f"tpl_{k}_{f}"
        v = (v or "").strip()
        if not v or v == DEF[k][f]:
            c.execute("DELETE FROM settings WHERE key=?", (key,))
        else:
            c.execute("INSERT INTO settings(key, value) VALUES(?,?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (key, v[:8000]))


def fuellen(t, werte):
    return re.sub(r"\{(\w+)\}", lambda m: str(werte.get(m.group(1), m.group(0))), t or "")
