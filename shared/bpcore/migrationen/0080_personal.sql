-- App „Personal“ (besprochen am 14.11.2026, Mock „App Personal“): Daten je Person, die nicht schon in users / zeit_person stehen.
-- Die Personalakte (Dokumente) liegt auf dem Dateiserver unter „Büro/Personal/<Name>“ – hier nur Daten, nie Dokumente.
-- gehalt nur, wenn in den Einstellungen als Feld gewählt (sonst bleibt es ein Dokument in der Akte). akte_geloescht: wann die Akte nach
-- Ablauf der Aufbewahrungsfrist gelöscht wurde. Recht „personal“ (alle Personen und die Akte) ab Werk für die Geschäftsführung.
CREATE TABLE IF NOT EXISTS personal_person (
    user_id        INTEGER PRIMARY KEY,
    eintritt       TEXT NOT NULL DEFAULT '',
    austritt       TEXT NOT NULL DEFAULT '',
    telefon        TEXT NOT NULL DEFAULT '',
    notfall        TEXT NOT NULL DEFAULT '',
    gehalt         TEXT NOT NULL DEFAULT '',
    notiz          TEXT NOT NULL DEFAULT '',
    akte_geloescht TEXT NOT NULL DEFAULT '',
    geaendert      TEXT NOT NULL DEFAULT ''
);
UPDATE rollen SET rechte = (rechte::jsonb || '["personal"]'::jsonb)::text
 WHERE key = 'gf' AND rechte IS NOT NULL AND rechte <> '' AND NOT (rechte::jsonb ? 'personal');
UPDATE users SET rechte = (rechte::jsonb || '["personal"]'::jsonb)::text
 WHERE rolle = 'gf' AND rechte IS NOT NULL AND rechte <> '' AND NOT (rechte::jsonb ? 'personal')
   AND NOT (COALESCE(NULLIF(rechte_minus, ''), '[]')::jsonb ? 'personal');
DO $$
BEGIN
    IF to_regprocedure('bp_aenderung_merken()') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS bp_live ON personal_person;
        CREATE TRIGGER bp_live AFTER INSERT OR UPDATE OR DELETE ON personal_person FOR EACH ROW EXECUTE FUNCTION bp_aenderung_merken();
    END IF;
END $$;
