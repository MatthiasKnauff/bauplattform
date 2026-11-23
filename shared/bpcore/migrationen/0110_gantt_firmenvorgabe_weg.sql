-- Bauzeitenplan (23.11.2026, Entscheidung GF-5 A): keine Firma je Gewerk für alle Projekte mehr – Firmen gehören nur zum Projekt.
-- Spalte „Vorgabe (alle Projekte)“, „Vorgaben übernehmen“, „Zurücksetzen …“ und die Route /api/catfirms sind entfernt; die gespeicherten Vorgaben und ihr Verlauf gehen mit.
DELETE FROM gantt_store WHERE key = 'catfirms';
DELETE FROM versionen WHERE bereich = 'gs:catfirms';
