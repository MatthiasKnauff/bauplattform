-- Akquise: Bauherr:in / Anfrage von als Kontakt (Adressen) – Text bleibt für Anfragen ohne Kontakt.
ALTER TABLE akquise ADD COLUMN IF NOT EXISTS kontakt_id INTEGER;
