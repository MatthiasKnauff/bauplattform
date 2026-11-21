-- Drei Tabellen, die kein Code mehr liest oder schreibt, fallen weg (entschieden am 21.11.2026 – die eine bewusste Ausnahme von „nur additiv“;
-- vor jeder Migration sichert bpcore.schema die Datenbank, die Sicherung „…-vor-v103.dump“ enthält sie noch):
--   pm_aenderung  Änderungen je Bauteil für den Reiter „Änderungen“ im Gebäudemodell – der Reiter ist seit 21.11.2026 gestrichen
--   pm_stand      nummerierte Stände des Projektmodells – seit 17.11.2026 sind die Versionen des Modells die Planstände (pm_planstand)
--   gantt_links   Links zum Ansehen des Bauzeitenplans – mit der Migration 0082 in die gemeinsame Tabelle bp_teilen umgezogen.
--                 Sie fällt nur weg, wenn dort wirklich jeder Link angekommen ist; sonst bleibt sie stehen (Meldung im Protokoll der Dienste).
DROP TABLE IF EXISTS pm_aenderung;
DROP TABLE IF EXISTS pm_stand;
DO $$
DECLARE fehlen INTEGER;
BEGIN
    IF to_regclass('gantt_links') IS NULL THEN
        RETURN;
    END IF;
    SELECT COUNT(*) INTO fehlen FROM gantt_links l WHERE NOT EXISTS (SELECT 1 FROM bp_teilen t WHERE t.token = l.token);
    IF fehlen = 0 THEN
        DROP TABLE gantt_links;
    ELSE
        RAISE NOTICE 'gantt_links bleibt stehen: % Links fehlen in bp_teilen', fehlen;
    END IF;
END $$;
