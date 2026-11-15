"""Gemeinsamer Kern der Bauplattform (Datenbank, Anmeldung, App-Adressen)."""
import mimetypes

mimetypes.add_type("text/javascript", ".mjs")   # pdf.js als Modul (vendor/pdfjs/pdf.mjs) – ältere Python kennen .mjs nicht
SCHEMA = 42   # mindestens benötigte Schemaversion (bpcore/migrationen/0042_abnahme.sql)
