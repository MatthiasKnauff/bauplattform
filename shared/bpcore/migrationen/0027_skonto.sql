-- Abrechnung: Nachlass auch als fester Betrag, Skonto mit Frist (Tage ab Rechnungseingang) – schon im Angebot.
ALTER TABLE ava_angebot ADD COLUMN IF NOT EXISTS nachlass_eur REAL NOT NULL DEFAULT 0;
ALTER TABLE ava_angebot ADD COLUMN IF NOT EXISTS skonto_tage INTEGER NOT NULL DEFAULT 0;
