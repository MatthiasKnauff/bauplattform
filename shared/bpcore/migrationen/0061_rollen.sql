-- Rollen & Rechte: jede Person hat eine Rolle (Liste von Rechten) und Ausnahmen (zusätzlich / entzogen) sowie einen Vorgesetzten.
-- users.rechte = die gültigen Rechte, users.is_admin = Recht „verwaltung“ – beides schreibt nur bpcore.rechte.abgleichen().
-- Start: wer Administrator ist, bekommt die Rolle Geschäftsführung, alle anderen Mitarbeiter – für niemanden ändert sich etwas.
CREATE TABLE IF NOT EXISTS rollen (
    key     TEXT PRIMARY KEY,
    name    TEXT NOT NULL,
    rechte  TEXT NOT NULL DEFAULT '[]',
    sort    INTEGER NOT NULL DEFAULT 0
);
INSERT INTO rollen(key, name, rechte, sort) VALUES
    ('gf', 'Geschäftsführung', '["projekte.alle", "urlaub.freigeben", "verwaltung"]', 1),
    ('mitarbeiter', 'Mitarbeiter', '[]', 2),
    ('assistenz', 'Assistenz', '["projekte.alle"]', 3),
    ('it', 'IT / Admin', '["verwaltung"]', 4),
    ('extern', 'Extern', '[]', 5)
ON CONFLICT (key) DO NOTHING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rolle TEXT NOT NULL DEFAULT 'mitarbeiter';
ALTER TABLE users ADD COLUMN IF NOT EXISTS rechte_plus TEXT NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS rechte_minus TEXT NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS vorgesetzter INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rechte TEXT;
UPDATE users SET rolle = 'gf' WHERE is_admin = 1;
UPDATE users SET rechte = CASE WHEN is_admin = 1 THEN '["projekte.alle", "urlaub.freigeben", "verwaltung"]' ELSE '[]' END WHERE rechte IS NULL;
