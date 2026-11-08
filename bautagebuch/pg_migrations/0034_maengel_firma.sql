-- Mängel wieder mit Firma (wie Weisungen): Feld „Firma“ beim Eintragen und in der Liste, auch in der einfachen Ansicht und am Handy.
-- Die Mängelrüge wählt damit die Mängel derselben Firma vor.
UPDATE sections SET extra = (COALESCE(NULLIF(extra, ''), '{}')::jsonb || '{"company":true}'::jsonb)::text WHERE key = 'maengel';
