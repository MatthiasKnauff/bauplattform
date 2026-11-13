-- Wiki (besprochen am 13.11.2026): fachlich prüfen darf, wer das Recht „wiki.pruefen“ hat – ab Werk Büroleitung und Geschäftsführung
-- (dazu immer, wer „verwaltung“ hat). Dateien eines Eintrags lassen sich entfernen und wiederholen (Rückgängig) – die Datei bleibt auf
-- der Freigabe „Bauportal“, nur der Verweis wird markiert.
UPDATE rollen SET rechte = (rechte::jsonb || '["wiki.pruefen"]'::jsonb)::text
 WHERE key IN ('bueroleitung', 'gf') AND rechte IS NOT NULL AND rechte <> '' AND NOT (rechte::jsonb ? 'wiki.pruefen');
UPDATE users SET rechte = (rechte::jsonb || '["wiki.pruefen"]'::jsonb)::text
 WHERE rolle IN ('bueroleitung', 'gf') AND rechte IS NOT NULL AND rechte <> '' AND NOT (rechte::jsonb ? 'wiki.pruefen')
   AND NOT (COALESCE(NULLIF(rechte_minus, ''), '[]')::jsonb ? 'wiki.pruefen');
ALTER TABLE wiki_datei ADD COLUMN IF NOT EXISTS deleted TEXT NOT NULL DEFAULT '';
-- Live-Aktualisierung (wie 0046): Änderungen anderer erscheinen in der App „Wiki“ ohne Neuladen.
DO $$
BEGIN
    IF to_regprocedure('bp_aenderung_merken()') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS bp_live ON wiki_eintrag;
        CREATE TRIGGER bp_live AFTER INSERT OR UPDATE OR DELETE ON wiki_eintrag FOR EACH ROW EXECUTE FUNCTION bp_aenderung_merken();
        DROP TRIGGER IF EXISTS bp_live ON wiki_datei;
        CREATE TRIGGER bp_live AFTER INSERT OR UPDATE OR DELETE ON wiki_datei FOR EACH ROW EXECUTE FUNCTION bp_aenderung_merken();
    END IF;
END $$;
