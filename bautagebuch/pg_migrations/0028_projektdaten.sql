-- To-do: Erinnerung zur Fälligkeit ('' | tag | 1t | 2t | 1w); Angebote: weitere Angaben (Nummer, Datum, Bindefrist …) als JSON
ALTER TABLE todo ADD COLUMN IF NOT EXISTS erinnerung TEXT NOT NULL DEFAULT '';
ALTER TABLE ava_angebot ADD COLUMN IF NOT EXISTS daten TEXT NOT NULL DEFAULT '{}';
