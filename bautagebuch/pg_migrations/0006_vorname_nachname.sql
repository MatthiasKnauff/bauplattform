-- Bauplattform: Vor- und Nachname je Benutzer (für Anzeige in Verwaltung, Startseite, Kopfleiste).
-- Der Anmeldename (name) bleibt unverändert und wird weiter z. B. im Bautagebuch-PDF verwendet.
ALTER TABLE users ADD COLUMN vorname TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN nachname TEXT NOT NULL DEFAULT '';
