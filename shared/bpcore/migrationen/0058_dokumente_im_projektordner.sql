-- Dokumente liegen im Projektordner auf dem Dateiserver, nicht in der Datenbank: hier steht nur noch der Verweis (Pfad relativ zum Projektordner).
-- Ältere Einträge mit Datei in der Datenbank bleiben lesbar.
ALTER TABLE honorar_fremd_re ADD COLUMN IF NOT EXISTS ablage TEXT NOT NULL DEFAULT '';
ALTER TABLE bauantrag_unterlage ADD COLUMN IF NOT EXISTS pfad TEXT NOT NULL DEFAULT '';
