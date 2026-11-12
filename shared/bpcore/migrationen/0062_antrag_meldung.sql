-- Urlaubsanträge: Rückmeldung an die Person (gesehen = 0, bis sie die Entscheidung bestätigt hat), Zurückziehen eines schon
-- genehmigten Antrags nur mit Zustimmung (rueckzug = 'beantragt') und Erinnerung, wenn niemand antwortet (erinnert = Tag des Hinweises).
ALTER TABLE zeit_antrag ADD COLUMN IF NOT EXISTS gesehen INTEGER NOT NULL DEFAULT 1;
ALTER TABLE zeit_antrag ADD COLUMN IF NOT EXISTS rueckzug TEXT NOT NULL DEFAULT '';
ALTER TABLE zeit_antrag ADD COLUMN IF NOT EXISTS erinnert TEXT NOT NULL DEFAULT '';
