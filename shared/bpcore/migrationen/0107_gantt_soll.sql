-- Soll und Ist im Bauzeitenplan (Mock „Soll und Ist“ SI-5, 22.11.2026): Recht „gantt.soll“ (Soll festhalten), ab Werk alle Planer:innen –
-- Geschäftsführung, Büroleitung, Bauleitung, Mitarbeiter:innen (nicht Assistenz, Gast). Das Soll selbst ist eine Version (gantt_versions.meta.soll).
UPDATE rollen SET rechte = (COALESCE(NULLIF(rechte, ''), '[]')::jsonb || '["gantt.soll"]'::jsonb)::text
    WHERE key IN ('gf', 'bueroleitung', 'bauleitung', 'mitarbeiter') AND rechte NOT LIKE '%"gantt.soll"%';
UPDATE users u SET rechte = (COALESCE(NULLIF(u.rechte, ''), '[]')::jsonb || '["gantt.soll"]'::jsonb)::text
    WHERE u.rolle IN ('gf', 'bueroleitung', 'bauleitung', 'mitarbeiter') AND COALESCE(u.rechte, '') NOT LIKE '%"gantt.soll"%'
      AND COALESCE(u.rechte_minus, '') NOT LIKE '%"gantt.soll"%';
