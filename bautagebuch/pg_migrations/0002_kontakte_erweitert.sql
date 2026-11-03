-- Adressdatenbank: Internetadresse und Funktion des Ansprechpartners
ALTER TABLE contacts ADD COLUMN website TEXT NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN role TEXT NOT NULL DEFAULT '';
