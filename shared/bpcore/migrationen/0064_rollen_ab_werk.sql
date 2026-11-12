-- Rollen ab Werk (besprochen am 13.11.2026): Administrator, Büroleitung, Bauleitung, Mitarbeiter:in, Gast (Extern).
-- Vorhandene Rollen bleiben (Geschäftsführung, Assistenz …); umbenannt wird nur, was noch den Startnamen trägt.
INSERT INTO rollen(key, name, rechte, sort) VALUES
    ('bueroleitung', 'Büroleitung', '["projekte.alle", "urlaub.freigeben"]', 2),
    ('bauleitung', 'Bauleitung', '[]', 3)
ON CONFLICT (key) DO NOTHING;
UPDATE rollen SET name = 'Administrator' WHERE key = 'it' AND name = 'IT / Admin';
UPDATE rollen SET name = 'Gast (Extern)' WHERE key = 'extern' AND name = 'Extern';
