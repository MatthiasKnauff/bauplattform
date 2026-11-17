-- Benachrichtigungen verwalten (17.11.2026): Recht „meldungen.alle“ – Benachrichtigungen aller Personen sehen und ändern, je Rolle festlegen.
-- Ab Werk Geschäftsführung und Büroleitung. Erinnerungen bekommen den Status 'aus' (keine Mail, nicht in „Zu tun“) – erinnerungen.status ist TEXT.
UPDATE rollen SET rechte = (COALESCE(NULLIF(rechte, ''), '[]')::jsonb || '["meldungen.alle"]'::jsonb)::text
    WHERE key IN ('gf', 'bueroleitung') AND rechte NOT LIKE '%"meldungen.alle"%';
UPDATE users u SET rechte = (COALESCE(NULLIF(u.rechte, ''), '[]')::jsonb || '["meldungen.alle"]'::jsonb)::text
    WHERE u.rolle IN ('gf', 'bueroleitung') AND COALESCE(u.rechte, '') NOT LIKE '%"meldungen.alle"%'
      AND COALESCE(u.rechte_minus, '') NOT LIKE '%"meldungen.alle"%';
