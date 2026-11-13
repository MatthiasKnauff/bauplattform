-- Verwaltung je Rolle (besprochen am 13.11.2026): Blöcke mit – / sehen / ändern als Rechte b.<block>.sehen | b.<block>.aendern.
-- Vorschlag ab Werk; Administrator und Geschäftsführung haben „verwaltung“ und damit alles. Danach gleicht rechte.abgleichen() beim Ändern ab.
UPDATE rollen SET rechte = (COALESCE(NULLIF(rechte, ''), '[]')::jsonb || '["b.projekte.aendern", "b.mitarbeiter.sehen", "b.buero.aendern", "b.ablage.aendern", "b.sicherung.sehen", "b.postfaecher.aendern", "b.druck.aendern", "b.ki.aendern", "b.kataloge.sehen"]'::jsonb)::text
    WHERE key = 'bueroleitung' AND rechte NOT LIKE '%"b.%';
UPDATE rollen SET rechte = (COALESCE(NULLIF(rechte, ''), '[]')::jsonb || '["b.projekte.sehen", "b.buero.sehen", "b.ablage.sehen", "b.druck.sehen", "b.ki.sehen"]'::jsonb)::text
    WHERE key = 'bauleitung' AND rechte NOT LIKE '%"b.%';
UPDATE rollen SET rechte = (COALESCE(NULLIF(rechte, ''), '[]')::jsonb || '["b.projekte.sehen", "b.buero.sehen", "b.druck.sehen", "b.ki.sehen"]'::jsonb)::text
    WHERE key IN ('mitarbeiter', 'assistenz') AND rechte NOT LIKE '%"b.%';
-- gültige Rechte der Personen nachziehen (Ausnahmen für Blöcke gibt es noch keine)
UPDATE users u SET rechte = (COALESCE(NULLIF(u.rechte, ''), '[]')::jsonb || (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM rollen r, jsonb_array_elements_text(r.rechte::jsonb) x WHERE r.key = u.rolle AND x LIKE 'b.%'))::text
    WHERE COALESCE(u.rechte, '') NOT LIKE '%"b.%';
