-- Block „Zugänge“ (besprochen am 13.11.2026): Schlüssel und Kennwörter je Rolle neu setzen (– / neu setzen), sehen kann sie niemand.
-- Ab Werk: Büroleitung.
UPDATE rollen SET rechte = (COALESCE(NULLIF(rechte, ''), '[]')::jsonb || '["b.zugaenge.aendern"]'::jsonb)::text
    WHERE key = 'bueroleitung' AND rechte NOT LIKE '%"b.zugaenge.%';
UPDATE users u SET rechte = (COALESCE(NULLIF(u.rechte, ''), '[]')::jsonb || '["b.zugaenge.aendern"]'::jsonb)::text
    WHERE u.rolle = 'bueroleitung' AND COALESCE(u.rechte, '') NOT LIKE '%"b.zugaenge.%';
