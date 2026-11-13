-- Verwaltung je Rolle, Teil 2 (besprochen am 13.11.2026): Einstellungen der Apps fürs ganze Büro als Blöcke (b.<app>.sehen | b.<app>.aendern).
UPDATE rollen SET rechte = (COALESCE(NULLIF(rechte, ''), '[]')::jsonb || '["b.baukosten.aendern", "b.baudaten.aendern", "b.ava.aendern", "b.plaene.aendern", "b.gantt.aendern", "b.aufgaben.aendern"]'::jsonb)::text
    WHERE key = 'bueroleitung' AND rechte NOT LIKE '%"b.baukosten.%';
UPDATE rollen SET rechte = (COALESCE(NULLIF(rechte, ''), '[]')::jsonb || '["b.baukosten.aendern", "b.baudaten.sehen", "b.ava.sehen", "b.plaene.aendern", "b.gantt.aendern", "b.aufgaben.sehen"]'::jsonb)::text
    WHERE key = 'bauleitung' AND rechte NOT LIKE '%"b.baukosten.%';
UPDATE rollen SET rechte = (COALESCE(NULLIF(rechte, ''), '[]')::jsonb || '["b.baukosten.sehen", "b.baudaten.sehen", "b.ava.sehen", "b.plaene.sehen", "b.gantt.sehen", "b.aufgaben.sehen"]'::jsonb)::text
    WHERE key IN ('mitarbeiter', 'assistenz') AND rechte NOT LIKE '%"b.baukosten.%';
UPDATE users u SET rechte = (COALESCE(NULLIF(u.rechte, ''), '[]')::jsonb || (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM rollen r, jsonb_array_elements_text(r.rechte::jsonb) x
        WHERE r.key = u.rolle AND x ~ '^b\.(baukosten|baudaten|ava|plaene|gantt|aufgaben)\.'))::text
    WHERE COALESCE(u.rechte, '') NOT LIKE '%"b.baukosten.%';
