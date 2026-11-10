"""Dienste der Bauplattform – die Hintergrundaufgaben in einem eigenen Container (APP=dienste, siehe apps.py).

Bisher erledigte das Bautagebuch diese Aufgaben beim Start nebenher; alle anderen Apps mussten deshalb auf das Bautagebuch
warten. Jetzt gibt es dafür diesen Container, und das Bautagebuch ist eine normale App (Umgebungsvariable DIENSTE=extern):

  einrichten   Datenbank auf den neuesten Stand bringen (mit Sicherung davor), alte Fotos umwandeln, ersten Administrator anlegen
  sichern      tägliche Datensicherung (mit Kopie auf den Dateiserver, falls eingerichtet)
  erinnern     E-Mail-Erinnerungen für Erledigungsdaten
  zurückholen  nach einem neuen Server: Fotos und Logo vom Dateiserver holen
  pläne        nachts die Planordner der laufenden Projekte vorab einlesen

Im Bautagebuch bleiben nur die Aufgaben, die an seinen laufenden Betrieb gebunden sind: die Übertragung frisch hochgeladener
Fotos in die Ablage und die Momentaufnahmen der Berichte (Versionsverlauf).

Der Container braucht dieselben Datenträger wie das Bautagebuch (Fotos, Sicherungen). Er antwortet auf /api/health erst, wenn
die Datenbank eingerichtet ist – darauf warten die Apps (depends_on … service_healthy).

Noch liegt der Code dieser Aufgaben im Ordner des Bautagebuchs (core/); Schritt 5 des Umbaus löst ihn nach und nach in den Kern.
"""
import time

from flask import Flask, jsonify

from core import dienste

STAND = {"gestartet": "", "eingerichtet": False}


def create_app():
    dienste.einrichten()
    STAND["eingerichtet"] = True
    dienste.starten()
    STAND["gestartet"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    app = Flask(__name__, static_folder=None)

    @app.get("/api/health")
    def health():
        return jsonify(ok=True, app="dienste", aufgaben=list(dienste.AUFGABEN), **STAND)

    return app


app = create_app()
