"""Die Hintergrundaufgaben der Bauplattform als zwei Aufrufe: einrichten() einmal beim Start, starten() für die laufenden Aufgaben.
Aufgerufen vom Container „dienste“ (bautagebuch/dienste.py) – und vom Bautagebuch selbst, solange es keinen Dienste-Container gibt."""
from . import aufraeumen, auth, backups, db, extern, reminders, storage, sync
from bpcore import fehler

AUFGABEN = ("einrichten", "sichern", "erinnern", "zurückholen", "pläne", "aufräumen")


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
    auth.ensure_admin()   # erster Start: Benutzer admin / Kennwort admin (muss sofort geändert werden)
    try:
        from . import buero_doku
        print("Dienste:", buero_doku.ablegen(), flush=True)   # ToDo-Liste der Bauplattform → Pläne & Dateien, Projekt „Büro“
    except Exception as e:   # noqa: BLE001 – ohne ToDo-Liste läuft alles weiter
        fehler.still("dienste", "ToDo-Liste ablegen", e)


def starten():
    """Die laufenden Aufgaben – jede in ihrem eigenen Hintergrund-Thread."""
    reminders.start()   # E-Mail-Erinnerungen für Erledigungsdaten
    backups.start()     # tägliche Datenbankversionen
    extern.start()      # nach einem Ausfall: Fotos und Logo vom Dateiserver zurückholen
    aufraeumen.start()  # nachts alte Stände („…_old1“) auf dem Dateiserver aufräumen
    try:
        from bpcore import bauantrag_formulare
        bauantrag_formulare.start(db.tx)   # täglich: amtliche Bauantragsformulare NRW auf neue Fassungen prüfen
    except Exception as e:   # noqa: BLE001 – ohne Formularprüfung laufen die übrigen Dienste weiter
        fehler.still("dienste", "Formularprüfung starten", e)
    try:
        from modules import plaene
        plaene.start()  # Planordner der laufenden Projekte nachts vorab einlesen (Pläne & Dateien)
    except Exception as e:   # noqa: BLE001 – ohne Planordner laufen die übrigen Dienste weiter
        fehler.still("dienste", "Pläne vorab einlesen starten", e)
