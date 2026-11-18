-- Benachrichtigungen zurücksetzen (18.11.2026, Wunsch: „lösche alle Benachrichtigungseinstellungen – an das Konzept müssen wir noch dran“):
-- gespeicherte Einstellungen auf die Vorgaben zurück – Vorgaben je Rolle, persönliche Wahl „Erinnerungen per Mail“, Büro-Regeln und persönliche
-- Abweichungen der automatischen To-dos. Einzelne Erinnerungen, die jemand ausgeschaltet hat, bleiben aus; gesendete Kalendereinladungen bleiben.
DELETE FROM bp_store WHERE key IN ('meldungen:rollen', 'todo:regeln') OR key LIKE 'meldungen:aus:%' OR key LIKE 'todo:regeln:ich:%';
