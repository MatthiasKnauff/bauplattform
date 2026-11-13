"""Die App-Liste der Bauplattform – die eine Stelle, an der steht, welche Apps es gibt und wie sie starten.

Alle Apps laufen aus EINEM Image (Dockerfile im Hauptordner), jede in ihrem eigenen Container. Welche App ein Container ist,
sagt die Umgebungsvariable APP (bei den Plattform-Apps wie bisher auch APP_MODULE); das Startprogramm start.py liest hier nach.

  ordner   Ordner der App im Image (/app/<ordner>) – dort liegen Seite und Server-Teil
  modul    Python-Modul mit der Flask-App „app“
  port     Port im Container (Plattform-Apps: APP_PORT hat Vorrang)
  worker   Arbeitsprozesse (Standard 2; APP_WORKERS hat Vorrang)
  threads  Threads je Arbeitsprozess (0 = ohne; APP_THREADS hat Vorrang)
  timeout  Sekunden, bis eine Anfrage abgebrochen wird (APP_TIMEOUT hat Vorrang)
  gesund   Adresse für die Gesundheitsprüfung des Containers

Neue App: Ordner anlegen, hier eine Zeile eintragen, in den Stack-Dateien (docker-compose.yml, server/*.yml) einen Dienst mit APP=<name>.
"""
P = dict(ordner="plattform", threads=4, timeout=300, gesund="/api/health")

APPS = {
    "bautagebuch":   dict(ordner="bautagebuch", modul="app", port=8000, threads=0, timeout=60, gesund="/api/platform"),
    "dienste":       dict(ordner="bautagebuch", modul="dienste", port=8102, worker=1, threads=2, timeout=120, gesund="/api/health"),   # Hintergrundaufgaben: Datenbank einrichten, sichern, erinnern (ein Prozess!)
    "gantt":         dict(ordner="gantt", modul="app", port=8082, threads=4, timeout=300, gesund="/api/health"),
    "router":        dict(P, modul="router", port=8090, threads=32, timeout=320),   # Verteiler: eine Adresse für alle Apps
    "portal":        dict(P, modul="portal", port=8090),
    "admin":         dict(P, modul="admin", port=8091),
    "adressen":      dict(P, modul="adressen", port=8093),
    "baukosten":     dict(P, modul="baukosten", port=8094),
    "aufgaben":      dict(P, modul="aufgaben", port=8095),
    "plaene":        dict(P, modul="plaene", port=8096),
    "ava":           dict(P, modul="ava", port=8097),
    "kommunikation": dict(P, modul="kommunikation", port=8098, timeout=120),
    "baudaten":      dict(P, modul="baudaten", port=8099, timeout=600),
    "orca_import":   dict(P, modul="orca_import", port=8100, timeout=900, worker=1, threads=8),   # ein Prozess: die Aufträge liegen im Speicher
    "zeiten":        dict(P, modul="zeiten", port=8101, timeout=120),
    "honorar":       dict(P, modul="honorar", port=8103),   # nur Verwaltung: Honoraraufträge (HOAI), Abgleich mit den Zeiten
    "bauantrag":     dict(P, modul="bauantrag", port=8104, timeout=120),   # Bauantrag: Formular aus Projektdaten, Bauvorlagen, PDF
    "waermeschutz":  dict(P, modul="waermeschutz", port=8105),   # Wärmeschutz: Bauteilnachweis (U-Wert, Tauwasser, GModG Anlage 7)
    "wiki":          dict(P, modul="wiki", port=8106, timeout=240),   # Wiki des Büros: Erkenntnisse sammeln, zusammenfassen (KI), prüfen
}
