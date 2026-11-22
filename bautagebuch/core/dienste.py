"""Die Hintergrundaufgaben der Bauplattform als zwei Aufrufe: einrichten() einmal beim Start, starten() für die laufenden Aufgaben.
Aufgerufen vom Container „dienste“ (bautagebuch/dienste.py) – und vom Bautagebuch selbst, solange es keinen Dienste-Container gibt."""
import threading

from . import aufraeumen, auth, backups, db, extern, reminders, storage, sync
from bpcore import dateien, fehler

AUFGABEN = ("einrichten", "sichern", "erinnern", "zurückholen", "pläne", "aufräumen", "wiki", "dateien")


def einrichten():
    """Einmal beim Start: Schema (mit Sicherung davor), alte Fotoformate, erster Administrator."""
    db.migrate()
    with db.tx() as c:
        converted = storage.convert_legacy(c)   # alte Nicht-JPG-Fotos (HEIC, PNG, WEBP, GIF) -> JPG
        if converted:   # schon auf dem Server abgelegte Dateien dort ebenfalls umbenennen (neue Endung .jpg)
            from . import settings
            conf = settings.all(c)
            for i in converted:
                sync.rename_image(c, conf, i)
    try:
        with db.tx() as c:
            storage.logo_in_die_datenbank(c)   # Büro-Logo für alle Apps bereitstellen (bpcore.logo)
    except Exception as e:   # noqa: BLE001 – ohne Logo läuft alles weiter
        fehler.still("dienste", "Logo in die Datenbank übernehmen", e)
    try:
        with db.tx() as c:
            dateien.einrichten(c)   # gemeinsamer Dateispeicher: Ordner und Kennung (bpcore/dateien.py)
    except Exception as e:   # noqa: BLE001 – ohne Dateispeicher schreiben die Apps wie früher in die Datenbank
        fehler.still("dienste", "Dateispeicher einrichten", e)
    auth.ensure_admin()   # erster Start: Benutzer admin / Kennwort admin (muss sofort geändert werden)
    try:
        from bpcore import rechte
        with db.tx() as c:
            rechte.abgleichen(c)   # Apps je Rolle (17.11.2026): frühere Häkchen je Person einmal als Ausnahmen übernehmen
    except Exception as e:   # noqa: BLE001
        fehler.still("dienste", "Apps je Person in Ausnahmen übernehmen", e)
    try:
        from bpcore import huelle
        with db.tx() as c:
            n = huelle.refs_ergaenzen(c)   # gekürzte Verweise des Wärmeschutzes (bis 20.11.2026) einmal auf die ganze Kennung
        if n:
            print(f"Dienste: {n} Verweise im Wärmeschutz ergänzt", flush=True)
    except Exception as e:   # noqa: BLE001
        fehler.still("dienste", "Verweise im Wärmeschutz ergänzen", e)
    try:
        from . import buero_doku
        print("Dienste:", buero_doku.ablegen(), flush=True)   # ToDo-Liste der Bauplattform → Pläne & Dateien, Projekt „Büro“
    except Exception as e:   # noqa: BLE001 – ohne ToDo-Liste läuft alles weiter
        fehler.still("dienste", "ToDo-Liste ablegen", e)


def _elemente_nachholen():
    """Einmal nach dem Start (22.11.2026, „Art ändern dauert sehr lange“): IFC-Planstände von vorher lesen ihre Datei hier im Hintergrund,
    nicht beim ersten Klick – je Planstand eine eigene Transaktion, die neuesten zuerst."""
    from bpcore import planstand
    with db.tx() as c:
        offen = planstand.elemente_offen(c)
    for sid, pid in offen:
        try:
            with db.tx() as c:
                planstand.elemente(c, pid, sid)
        except Exception as e:   # noqa: BLE001 – eine kaputte Datei hält die übrigen nicht auf; der Klick liest sie dann selbst
            fehler.still("dienste", f"Bauteile des Planstands {sid} speichern", e)
    if offen:
        print(f"Dienste: Bauteile von {len(offen)} IFC-Planständen gespeichert", flush=True)


def starten():
    """Die laufenden Aufgaben – jede in ihrem eigenen Hintergrund-Thread."""
    reminders.start()   # E-Mail-Erinnerungen für Erledigungsdaten
    backups.start()     # tägliche Datenbankversionen
    extern.start()      # nach einem Ausfall: Fotos und Logo vom Dateiserver zurückholen
    dateien.start(db.tx)  # Dateispeicher: Schalter prüfen, vorhandene Dateien aus der Datenbank umziehen, nachts aufräumen
    threading.Thread(target=_elemente_nachholen, daemon=True).start()   # ältere IFC-Planstände: Bauteile einmal speichern (Art ändern ohne Datei lesen)
    aufraeumen.start()  # nachts alte Stände („…_old1“) auf dem Dateiserver aufräumen
    from . import wiki_dienst
    wiki_dienst.start()  # Wiki: PDF in „Pläne & Dateien“ → „Büro“, montags Zusammenfassung vorbereiten
    from . import ablage_umbenennen
    ablage_umbenennen.start()  # Ordner umbenennen, wenn eine App ihren Ordnernamen ändert (Einstellungen je App)
    from . import bauherren_dienst
    bauherren_dienst.start()  # Bauherrenportal: Freigaben hinaus, Eingangskorb abholen (nur wenn in der Verwaltung eingeschaltet)
    try:
        from bpcore import bauantrag_formulare
        bauantrag_formulare.start(db.tx)   # täglich: amtliche Bauantragsformulare NRW auf neue Fassungen prüfen
    except Exception as e:   # noqa: BLE001 – ohne Formularprüfung laufen die übrigen Dienste weiter
        fehler.still("dienste", "Formularprüfung starten", e)
    try:
        from modules import plaene
        plaene.start()  # Planordner der laufenden Projekte nachts vorab einlesen (Pläne & Dateien)
        from modules import alle_dateien
        alle_dateien.start()
        from modules import eingang
        eingang.start()   # Eingangsordner (Scans vom Kopierer) zählen – für das Fenster „Eingang“ in allen Apps  # „Alle Dateien“: Projektordner nachts einlesen, Vorschaubilder erzeugen, wenn wenig los ist
    except Exception as e:   # noqa: BLE001 – ohne Planordner laufen die übrigen Dienste weiter
        fehler.still("dienste", "Pläne vorab einlesen starten", e)
