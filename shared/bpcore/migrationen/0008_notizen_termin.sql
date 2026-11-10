-- Notizen bekommen wie Mängel, Aufgaben und Weisungen ein Erinnerungsdatum (erscheint auch in „Mängel & Erinnerungen“).
UPDATE sections SET extra = (COALESCE(NULLIF(extra, ''), '{}')::jsonb || '{"due":true}'::jsonb)::text WHERE key = 'notizen';
