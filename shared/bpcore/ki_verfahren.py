"""Verfahrensbeschreibung der Anonymisierung (Mock „DSGVO: KI anonymisieren“, entschieden am 14.11.2026, Punkt 3) – zum Vorzeigen
gegenüber Kund:innen, Datenschutzbeauftragten oder bei einer Prüfung. Die Angaben kommen aus dem, was die Plattform wirklich tut
(anonym.ARTEN, Einstellungen des Protokolls, Freigabe externer KI), damit das Blatt nicht veraltet. PDF über einwilligung.blatt.
Route: GET /api/ki/datenschutz/verfahren.pdf (plattform/admin.py) (Verwaltung → KI → Datenschutz, nur mit Recht „Datenschutz“ bzw. Verwaltung)."""
from datetime import date

ART_TEXT = {"projekt": "Projektnamen und -nummern", "adresse": "Adressen (Straße, Hausnummer, Ort)", "bauherr": "Bauherr:innen",
            "firma": "Firmen", "person": "Personen aus den Adressen und nach „Herr/Frau/Firma …“", "mitarbeiter": "Mitarbeiter:innen",
            "email": "E-Mail-Adressen", "telefon": "Telefonnummern", "iban": "Bankverbindungen (IBAN)"}


def teile(c):
    from . import anonym, ki_fragen
    an, tage = anonym._einst(c)
    extern = ki_fragen.zusatz_an(c)
    arten = ", ".join(ART_TEXT.get(a, a) for a in anonym.ARTEN)
    return [
        ("Zweck", "Die Plattform kann Texte mit künstlicher Intelligenz (KI) bearbeiten lassen, z. B. Berichte formulieren oder Fragen zum "
                  "Projekt beantworten. Dieses Blatt beschreibt, wie dabei personenbezogene Daten geschützt werden."),
        ("KI im Büro", "Die KI im Büro (Ollama) läuft auf eigenen Servern. Anfragen dorthin verlassen das Büro nicht und werden nicht "
                       "anonymisiert, aber ebenso protokolliert."),
        ("Externe KI", ("Externe Dienste (z. B. Claude, Gemini, ChatGPT): der Schalter „Externe KI erlauben“ der Verwaltung ist derzeit " + ("an. " if extern else "aus. ")
                        + "Jede Anfrage an einen externen Dienst läuft im Kern der Plattform durch dieselbe Stelle – keine App kann daran vorbei. "
                        "Je Projekt lässt sich externe KI zusätzlich abschalten.")),
        ("Anonymisierung", f"Vor dem Senden werden ersetzt: {arten}. Grundlage sind die Einträge der Datenbank (Projekte, Adressen, "
                           "Mitarbeiter:innen) und Muster (E-Mail, Telefon, „Herr/Frau/Firma …“). Jeder Begriff bekommt eine Kennung aus Art "
                           "und zufälliger 12-stelliger Nummer, z. B. firma#302918475610 – je Anfrage neu ausgewürfelt. Fachbegriffe und Rollen "
                           "(Maler, Erdgeschoss, Abnahme) bleiben stehen, damit die Antwort brauchbar ist. Die Antwort der KI wird im Büro "
                           "zurückübersetzt; die Zuordnung Kennung ↔ Klartext verlässt das Büro nie."),
        ("Grenzen", "Was in keiner Liste steht und keinem Muster folgt (z. B. ein Spitzname im Diktat), kann durchrutschen. Bilder (Pläne, "
                    "Fotos) lassen sich nicht sicher anonymisieren: vor dem Senden an externe KI fragt die Plattform nach "
                    "(„enthält ggf. Namen – trotzdem senden?“)."),
        ("Protokoll", (f"Das Protokoll ist eingeschaltet. Es hält je Anfrage fest: Zeit, wer, App und Zweck, Dienst, was hinausging "
                       f"(anonymisiert) und welche Begriffe ersetzt wurden. Einsehen nur mit dem Recht „Datenschutz“; Export als Text oder XML; "
                       f"automatisch gelöscht nach {tage} Tagen.") if an else
                      "Das Protokoll der KI-Anfragen ist derzeit ausgeschaltet (Verwaltung → KI → Datenschutz)."),
        ("Stand", f"Erstellt am {date.today().strftime('%d.%m.%Y')} aus den aktuellen Einstellungen der Plattform."),
    ]


def pdf(c):
    from . import einwilligung
    P = einwilligung.platzhalter(c)
    return einwilligung.blatt(c, "Verfahrensbeschreibung: Anonymisierung bei KI-Anfragen", P["buero"], teile(c))
